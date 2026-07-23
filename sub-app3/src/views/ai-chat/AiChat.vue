<template>
    <div class="chat">

        <header v-if="!hideHeader" class="chat-header">
            <div class="chat-header-icon">
                <IconBolt :size="15" />
            </div>
            <span>{{ title || 'AI 助手' }}</span>
            <span v-if="phaseLabel" class="chat-phase-pill" :data-phase="phase">{{ phaseLabel }}</span>
        </header>
        <!-- 空态 -->
        <div v-if="!displayMessages.length" class="chat-empty">
            <div class="chat-empty-icon">
                <IconChat :size="36" stroke-width="1.2" />
            </div>
            <p>有什么我可以帮你？</p>
        </div>
        <!-- 消息列表 -->
        <DynamicScroller v-else ref="scrollerRef" class="chat-body" :items="displayMessages" :min-item-size="60"
            key-field="id" @scroll.passive="onScroll">
            <template #default="{ item, active }">
                <DynamicScrollerItem :item="item" :active="active"
                    :size-dependencies="[item.content, item.loading, !!item.metrics, dislikePopup.messageId === item.id]">
                    <ChatMessageItem :item="item" :feedback-type="feedbackMap[item.id]"
                        :is-copied="copiedId === item.id" :dislike-open="dislikePopup.messageId === item.id"
                        :dislike-selected-tags="dislikePopup.selectedTags" :dislike-comment="dislikePopup.comment"
                        @copy="copyMessage(item)" @like="toggleLike(item)" @dislike-open="openDislike(item)"
                        @toggle-tag="toggleTag" @update:dislike-comment="v => dislikePopup.comment = v"
                        @submit-dislike="submitDislike(item)" @cancel-dislike="closeDislike"
                        @regenerate="regenerate(item)" @view-raw="openRawViewer(item)" />
                </DynamicScrollerItem>
            </template>
        </DynamicScroller>

        <!-- 输入区 -->
        <div class="chat-footer">
            <div class="input-shell" :class="{ 'input-shell--focus': isFocused }">
                <textarea ref="chatInputRef" v-model="inputText" class="chat-textarea" placeholder="发送消息…" rows="1"
                    @focus="isFocused = true" @blur="isFocused = false" @keydown.enter.exact.prevent="send()"
                    @input="autoResize" />
                <div class="input-btns">
                    <button v-if="streaming" class="btn-stop" @click="stop()">
                        <IconStopSquare :size="11" />
                    </button>
                    <button class="btn-send" :disabled="!inputText.trim() || streaming" @click="send()">
                        <IconSend :size="15" />
                    </button>
                </div>
            </div>
            <p class="input-hint">Enter 发送 · Shift+Enter 换行</p>
        </div>

        <!-- ── 原始请求/响应查看器 ── -->
        <div v-if="rawViewer" class="raw-overlay" @click.self="closeRawViewer">
            <div class="raw-modal">
                <div class="raw-header">
                    <span class="raw-title">原始请求 / 响应</span>
                    <div class="raw-summary">
                        <span v-if="rawViewer.usage?.total_tokens != null">合计 {{ rawViewer.usage.total_tokens }} tok</span>
                        <span v-if="rawViewer.finishReason">finish: {{ rawViewer.finishReason }}</span>
                    </div>
                    <button class="raw-close" @click="closeRawViewer">✕</button>
                </div>
                <div class="raw-body">
                    <section class="raw-section">
                        <div class="raw-section-head">
                            <span>REQUEST</span>
                            <button class="raw-copy" @click="copyRaw(rawViewer.rawRequest)">复制</button>
                        </div>
                        <pre class="raw-pre">{{ rawViewer.rawRequest }}</pre>
                    </section>
                    <section class="raw-section">
                        <div class="raw-section-head">
                            <span>RESPONSE（SSE 帧）</span>
                            <button class="raw-copy" @click="copyRaw(rawViewer.rawResponse)">复制</button>
                        </div>
                        <pre class="raw-pre">{{ rawViewer.rawResponse }}</pre>
                    </section>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import IconBolt from '@/components/icons/IconBolt.vue'
import IconChat from '@/components/icons/IconChat.vue'
import IconStopSquare from '@/components/icons/IconStopSquare.vue'
import IconSend from '@/components/icons/IconSend.vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import { createChatStream, type ChatState, type ChatMetrics, type ChatUsage } from '@/services/chat.service'
import ChatMessageItem from './ChatMessageItem.vue'
import type { ChatMessage as Message } from './ChatMessageItem.vue'
import { ConversationService } from '../../services/conversation.service'
import { FeedbackService } from '../../services/feedback.service'

const props = defineProps<{
    systemPrompt?: string
    title?: string
    temperature?: number
    model?: string
    maxTokens?: number
    topP?: number
    topK?: number
    frequencyPenalty?: number
    presencePenalty?: number
    stop?: string[]
    seed?: number
    hideHeader?: boolean
    url?: string
    conversationId?: string   // ← 关联后端对话
}>()

const emit = defineEmits<{ (e: 'conversation-updated'): void }>()

// ── refs ──────────────────────────────────────────────────────────────────────
const chatInputRef = ref<HTMLTextAreaElement | null>(null)
const scrollerRef = ref<any>(null)
const isFocused = ref(false)
const inputText = ref('')
const streaming = ref(false)
const isAtBottom = ref(true)

// ── feedback state ────────────────────────────────────────────────────────────
const feedbackMap = reactive<Record<string, 1 | -1>>({})
const copiedId = ref<string | null>(null)
const dislikePopup = reactive<{ messageId: string | null; selectedTags: string[]; comment: string }>({
    messageId: null, selectedTags: [], comment: '',
})

// ── data ──────────────────────────────────────────────────────────────────────
const messages = reactive<Message[]>([])
const streamingMessage = ref<Message | null>(null)

// ── 可观测性：本次生成的指标累加器 ────────────────────────────────────────────
interface MetricsAcc {
    perfStart: number
    ttftMs?: number
    finishReason?: string
    usage?: ChatUsage
    frames: string[]
    rawRequest: string
    /** 上游在流内返回的错误（如 {"error":"Request timed out."}） */
    errorMsg?: string
}
let metricsAcc: MetricsAcc | null = null

// 原始请求/响应查看器
const rawViewer = ref<ChatMetrics | null>(null)
function openRawViewer(item: Message) {
    if (item.metrics) rawViewer.value = item.metrics
}
function closeRawViewer() { rawViewer.value = null }
function copyRaw(text?: string) { if (text) navigator.clipboard.writeText(text).catch(() => {}) }

// 上游未回传 usage 时，按字符粗略估算输出 token（CJK≈1，其余≈1/4）
function estimateTokens(text: string): number {
    let cjk = 0, other = 0
    for (const ch of text) {
        if (/[一-鿿぀-ヿ가-힯]/.test(ch)) cjk++
        else other++
    }
    return Math.max(1, Math.round(cjk + other / 4))
}

// 收尾：把累加器折算成挂到消息上的 ChatMetrics
function buildMetrics(content: string): ChatMetrics {
    const acc = metricsAcc!
    const totalMs = performance.now() - acc.perfStart
    const genMs = acc.ttftMs != null ? Math.max(1, totalMs - acc.ttftMs) : Math.max(1, totalMs)

    let usage = acc.usage
    let estimated = false
    if (usage?.completion_tokens == null && content) {
        usage = { completion_tokens: estimateTokens(content) }
        estimated = true
    }
    const completion = usage?.completion_tokens
    const tokensPerSec = completion != null ? completion / (genMs / 1000) : undefined

    return {
        ttftMs: acc.ttftMs,
        totalMs,
        tokensPerSec,
        estimated,
        usage,
        finishReason: acc.finishReason,
        rawRequest: acc.rawRequest,
        rawResponse: acc.frames.join('\n\n') || '（无响应帧）',
    }
}

const displayMessages = computed<Message[]>(() =>
    streamingMessage.value ? [...messages, streamingMessage.value] : [...messages]
)

// ── exposed API ───────────────────────────────────────────────────────────────
defineExpose({
    clearMessages: () => { messages.splice(0); stop() },
    setInput: (text: string) => {
        inputText.value = text
        nextTick(() => { chatInputRef.value?.focus(); autoResize() })
    },
    sendMessage: (text: string) => {
        if (!text.trim()) return
        inputText.value = text
        nextTick(() => send())
    },
})

// ── textarea auto-grow ────────────────────────────────────────────────────────
function autoResize() {
    const el = chatInputRef.value
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 180) + 'px'
}

// ── send & stream ─────────────────────────────────────────────────────────────
let abortFn: (() => void) | null = null
const phase = ref<ChatState['kind']>('idle')
const reconnectAttempt = ref(0)
const phaseLabel = computed(() => {
    switch (phase.value) {
        case 'connecting': return '连接中…'
        case 'reconnecting': return `重连中 (${reconnectAttempt.value})`
        case 'streaming': return '生成中'
        case 'error': return '出错'
        case 'aborted': return '已停止'
        default: return ''
    }
})

function send() {
    const text = inputText.value.trim()
    if (!text) return

    abortFn?.()

    messages.push({ id: crypto.randomUUID(), from: 'user', content: text, createdAt: Date.now() })
    streamingMessage.value = { id: crypto.randomUUID(), from: 'ai', content: '', createdAt: Date.now(), loading: true }

    inputText.value = ''
    nextTick(() => { if (chatInputRef.value) chatInputRef.value.style.height = 'auto' })
    scrollToBottom()
    sendToAI(text)
}

// ── scroll ────────────────────────────────────────────────────────────────────
let rafId = 0
function onScroll(e: Event) {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
        rafId = 0
        const el = e.target as HTMLElement
        if (!el) return
        isAtBottom.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 60
    })
}

function scrollToBottom() {
    if (!isAtBottom.value) return
    nextTick(() => scrollerRef.value?.scrollToBottom?.())
}

function stop() {
    abortFn?.()
    abortFn = null
    streaming.value = false
    if (streamingMessage.value) {
        streamingMessage.value.status = 'STOPPED'
        if (metricsAcc) {
            if (!metricsAcc.finishReason) metricsAcc.finishReason = 'aborted'
            streamingMessage.value.metrics = buildMetrics(streamingMessage.value.content)
        }
        messages.push(streamingMessage.value)
        streamingMessage.value = null
    }
    metricsAcc = null
}

// ── 加载历史对话 ──────────────────────────────────────────────────────────────
onMounted(async () => {
    if (!props.conversationId) return
    try {
        const conv = await ConversationService.get(props.conversationId)
        messages.splice(0)
        conv.messages.forEach(m => messages.push({
            id: m.id,
            from: m.role === 'user' ? 'user' : 'ai',
            content: m.content,
            createdAt: m.createdAt,
            // 历史 AI 消息同样标记为已完成，否则复制/点赞/重新生成按钮不会出现
            status: m.role === 'user' ? undefined : 'DONE',
        }))
        nextTick(() => scrollerRef.value?.scrollToBottom?.())
        await restoreFeedback()
    } catch { /* 新对话，忽略 */ }
})

// 回填历史消息的点赞/点踩状态
async function restoreFeedback() {
    const ids = messages.filter(m => m.from === 'ai').map(m => m.id)
    if (!ids.length) return
    try {
        const map = await FeedbackService.getForMessages(ids)
        for (const [id, info] of Object.entries(map)) {
            if (info?.feedbackType) feedbackMap[id] = info.feedbackType
        }
    } catch (err) { console.warn('[restoreFeedback]', err) }
}

const CHAT_STREAM_URL = 'http://localhost:3200/v1/chat/completions'

function sendToAI(text: string) {
    streaming.value = true

    // 从本地 messages 构建 OpenAI 格式的消息列表（包含刚推入的用户消息）
    const llmMessages = [
        ...(props.systemPrompt ? [{ role: 'system', content: props.systemPrompt }] : []),
        ...messages
            .filter(m => !m.loading && m.status !== 'ERROR' && m.content)
            .map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.content })),
    ]

    // 基础采样参数，附加参数仅在显式设置时才带上（避免给后端塞默认值）
    const body: Record<string, unknown> = {
        model: props.model || 'deepseek/deepseek-r1-0528-qwen3-8b',
        messages: llmMessages,
        temperature: props.temperature ?? 0.7,
        max_tokens: props.maxTokens ?? 1024,
        top_p: props.topP ?? 1,
    }
    if (props.topK != null && props.topK > 0) body.top_k = props.topK
    if (props.frequencyPenalty) body.frequency_penalty = props.frequencyPenalty
    if (props.presencePenalty) body.presence_penalty = props.presencePenalty
    if (props.stop?.length) body.stop = props.stop
    if (props.seed != null) body.seed = props.seed

    // 初始化本次生成的指标累加器
    metricsAcc = {
        perfStart: performance.now(),
        frames: [],
        rawRequest: JSON.stringify(body, null, 2),
    }

    const token = localStorage.getItem('auth_token') ?? ''
    const { abort } = createChatStream({
        url: props.url ?? CHAT_STREAM_URL,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        maxRetries: 3,
        onFrame(data, elapsedMs) {
            if (!metricsAcc) return
            metricsAcc.frames.push(data)
            try {
                const obj = JSON.parse(data)
                // 上游在 200 流里塞的错误帧（超时/上游不可达等），单独记下以便呈现为错误
                if (obj?.error != null) {
                    metricsAcc.errorMsg = typeof obj.error === 'string' ? obj.error : (obj.error.message ?? '上游返回错误')
                }
                const choice = obj?.choices?.[0]
                if (choice?.finish_reason != null) metricsAcc.finishReason = choice.finish_reason
                if (obj?.usage) {
                    metricsAcc.usage = {
                        prompt_tokens: obj.usage.prompt_tokens,
                        completion_tokens: obj.usage.completion_tokens,
                        total_tokens: obj.usage.total_tokens,
                    }
                }
                // TTFT：首个带内容（正文或推理）的增量帧到达时刻
                if (metricsAcc.ttftMs == null) {
                    const d = choice?.delta ?? {}
                    if (d.content || d.reasoning_content) metricsAcc.ttftMs = elapsedMs
                }
            } catch { /* 非 JSON 帧（如 error），仅保留在 frames 中 */ }
        },
        onReconnecting(attempt) {
            reconnectAttempt.value = attempt
            if (!streamingMessage.value) return
            streamingMessage.value.loading = true
            streamingMessage.value.content = ''
            streamingMessage.value.status = 'RECONNECTING'
        },
        onStateChange(s) {
            phase.value = s.kind
        },
        body,
        pickText: (data: string) => {
            if (data === '[DONE]') return ''
            try {
                const obj = JSON.parse(data)
                return obj.choices?.[0]?.delta?.content ?? ''
            } catch { return '' }
        },
        onText(value) {
            if (!streamingMessage.value) return
            streamingMessage.value.loading = false
            streamingMessage.value.status = undefined
            streamingMessage.value.content = value
            reconnectAttempt.value = 0
            if (!document.hidden) scrollToBottom()
        },
        onError(err: any) {
            streaming.value = false
            if (streamingMessage.value) {
                streamingMessage.value.loading = false
                streamingMessage.value.content = `⚠️ ${err?.message ?? '请求失败'}`
                streamingMessage.value.status = 'ERROR'
                if (metricsAcc) streamingMessage.value.metrics = buildMetrics('')
                messages.push(streamingMessage.value)
                streamingMessage.value = null
            }
            metricsAcc = null
            emit('conversation-updated')
        },
        onDone() {
            streaming.value = false
            if (streamingMessage.value) {
                let aiContent = streamingMessage.value.content
                streamingMessage.value.loading = false
                // 流正常关闭，但上游其实塞了错误帧且没有正文 → 呈现为错误而非空白“已完成”
                const errMsg = metricsAcc?.errorMsg
                if (errMsg && !aiContent) {
                    streamingMessage.value.content = `⚠️ ${errMsg}`
                    streamingMessage.value.status = 'ERROR'
                    aiContent = ''
                } else {
                    streamingMessage.value.status = 'DONE'
                }
                if (metricsAcc) streamingMessage.value.metrics = buildMetrics(aiContent)
                messages.push(streamingMessage.value)
                streamingMessage.value = null
                if (props.conversationId && aiContent) {
                    ConversationService.appendMessages(props.conversationId, text, aiContent)
                        .catch(err => console.warn('[appendMessages]', err))
                }
            }
            metricsAcc = null
            if (!document.hidden) scrollToBottom()
            emit('conversation-updated')
        },
    })

    abortFn = abort
}

// ── feedback actions ──────────────────────────────────────────────────────────
function copyMessage(item: Message) {
    navigator.clipboard.writeText(item.content).then(() => {
        copiedId.value = item.id
        setTimeout(() => { if (copiedId.value === item.id) copiedId.value = null }, 1500)
    })
}

async function toggleLike(item: Message) {
    const prev = feedbackMap[item.id]
    if (prev === 1) {
        delete feedbackMap[item.id]
        await FeedbackService.cancel(item.id).catch(console.warn)
    } else {
        feedbackMap[item.id] = 1
        const userMsg = getPrevUserMessage(item)
        await FeedbackService.submit({
            messageId: item.id,
            feedbackType: 1,
            userQuery: userMsg,
            aiResponse: item.content,
            conversationId: props.conversationId,
        }).catch(() => { delete feedbackMap[item.id] })
    }
    closeDislike()
}

function openDislike(item: Message) {
    if (dislikePopup.messageId === item.id) { closeDislike(); return }
    dislikePopup.messageId = item.id
    dislikePopup.selectedTags = []
    dislikePopup.comment = ''
}

function closeDislike() {
    dislikePopup.messageId = null
    dislikePopup.selectedTags = []
    dislikePopup.comment = ''
}

function toggleTag(tag: string) {
    const idx = dislikePopup.selectedTags.indexOf(tag)
    if (idx >= 0) dislikePopup.selectedTags.splice(idx, 1)
    else dislikePopup.selectedTags.push(tag)
}

async function submitDislike(item: Message) {
    const prev = feedbackMap[item.id]
    feedbackMap[item.id] = -1
    const userMsg = getPrevUserMessage(item)
    await FeedbackService.submit({
        messageId: item.id,
        feedbackType: -1,
        reasonTags: dislikePopup.selectedTags,
        comment: dislikePopup.comment || undefined,
        userQuery: userMsg,
        aiResponse: item.content,
        conversationId: props.conversationId,
    }).catch(() => {
        if (prev !== undefined) feedbackMap[item.id] = prev
        else delete feedbackMap[item.id]
    })
    closeDislike()
}

function regenerate(item: Message) {
    const userMsg = getPrevUserMessage(item)
    if (!userMsg || streaming.value) return
    // remove the AI message and any following messages from this point
    const idx = messages.indexOf(item)
    if (idx >= 0) messages.splice(idx)
    delete feedbackMap[item.id]
    streamingMessage.value = { id: crypto.randomUUID(), from: 'ai', content: '', createdAt: Date.now(), loading: true }
    scrollToBottom()
    sendToAI(userMsg)
}

function getPrevUserMessage(item: Message): string {
    const idx = messages.indexOf(item)
    for (let i = (idx >= 0 ? idx : messages.length) - 1; i >= 0; i--) {
        if (messages[i].from === 'user') return messages[i].content
    }
    return ''
}

onBeforeUnmount(() => { abortFn?.() })
</script>

<style scoped lang="scss">
/* ── 根容器 ── */
.chat {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
}

/* ── 头部 ── */
.chat-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 20px;
    height: 50px;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 600;
    color: #0a0a0a;

    .chat-header-icon {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: linear-gradient(135deg, #7c3aed, #4f46e5);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
}

/* ── 消息列表（DynamicScroller 容器）── */
.chat-body {
    flex: 1;
    min-height: 0;
}

/* ── 空态 ── */
.chat-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 60px 0;
    color: #b0b0b0;

    .chat-empty-icon {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: #f5f5f5;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #c0c0c0;
    }

    p {
        margin: 0;
        font-size: 14px;
        color: #aaa;
    }
}

/* ── 输入区 ── */
.chat-footer {
    padding: 10px 20px 14px;
    border-top: 1px solid #f0f0f0;
    flex-shrink: 0;
}

.input-shell {
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    align-items: flex-end;
    gap: 8px;
    background: #f7f7f8;
    border: 1.5px solid #e8e8e8;
    border-radius: 14px;
    padding: 8px 8px 8px 14px;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;

    &--focus {
        background: #fff;
        border-color: #7c3aed;
        box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.08);
    }
}

.chat-textarea {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 14px;
    color: #0a0a0a;
    line-height: 1.6;
    resize: none;
    min-height: 24px;
    max-height: 180px;
    font-family: inherit;
    overflow-y: auto;

    &::placeholder {
        color: #b0b0b0;
    }
}

.input-btns {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
}

.btn-send {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    border: none;
    background: #e8e8e8;
    color: #a0a0a0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: not-allowed;
    transition: background 0.15s, color 0.15s;

    &:not(:disabled) {
        background: #18181b;
        color: #fff;
        cursor: pointer;

        &:hover {
            background: #3f3f46;
        }
    }

    &:disabled {
        opacity: 1;
    }
}

.btn-stop {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    border: 1.5px solid #e8e8e8;
    background: #fff;
    color: #71717a;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
        border-color: #ef4444;
        color: #ef4444;
    }
}

.input-hint {
    max-width: 720px;
    margin: 6px auto 0;
    font-size: 11px;
    color: #c0c0c0;
    text-align: center;
}
.chat-phase-pill {
    margin-left: 8px;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    line-height: 1.4;
    background: #eef2ff;
    color: #4f46e5;
    border: 1px solid #e0e7ff;
}
.chat-phase-pill[data-phase="reconnecting"] { background:#fff7ed; color:#c2410c; border-color:#fed7aa; }
.chat-phase-pill[data-phase="streaming"]    { background:#ecfdf5; color:#047857; border-color:#a7f3d0; }
.chat-phase-pill[data-phase="error"]        { background:#fef2f2; color:#b91c1c; border-color:#fecaca; }
.chat-phase-pill[data-phase="aborted"]      { background:#f3f4f6; color:#4b5563; border-color:#e5e7eb; }

/* ── 原始请求/响应查看器 ── */
.raw-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 300;
    padding: 24px;
}

.raw-modal {
    background: #fff;
    border-radius: 14px;
    width: 760px;
    max-width: 100%;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 16px 56px rgba(0, 0, 0, 0.25);
}

.raw-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-bottom: 1px solid #eef0f2;
    flex-shrink: 0;
}

.raw-title {
    font-size: 14px;
    font-weight: 700;
    color: #18181b;
}

.raw-summary {
    display: flex;
    gap: 10px;
    margin-left: auto;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: #64748b;
}

.raw-summary span {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 2px 8px;
}

.raw-close {
    border: none;
    background: transparent;
    font-size: 16px;
    color: #9ca3af;
    cursor: pointer;
    border-radius: 6px;
    padding: 2px 8px;
    line-height: 1;
}

.raw-close:hover { background: #f3f4f6; color: #374151; }

.raw-body {
    overflow-y: auto;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.raw-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #9ca3af;
}

.raw-copy {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0;
    color: #7c3aed;
    background: transparent;
    border: 1px solid #ddd6fe;
    border-radius: 6px;
    padding: 2px 8px;
    cursor: pointer;
    transition: all 0.12s;
}

.raw-copy:hover { background: #f3f0ff; border-color: #a78bfa; }

.raw-pre {
    margin: 0;
    padding: 12px 14px;
    background: #0f172a;
    color: #e2e8f0;
    border-radius: 10px;
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 320px;
    overflow-y: auto;
}
</style>
