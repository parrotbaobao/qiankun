<template>
    <div class="chat">

        <header v-if="!hideHeader" class="chat-header">
            <div class="chat-header-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
            </div>
            <span>{{ title || 'AI 助手' }}</span>
        </header>
        <!-- 空态 -->
        <div v-if="!displayMessages.length" class="chat-empty">
            <div class="chat-empty-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            </div>
            <p>有什么我可以帮你？</p>
        </div>
        <!-- 消息列表 -->
        <DynamicScroller v-else ref="scrollerRef" class="chat-body" :items="displayMessages" :min-item-size="60"
            key-field="id" @scroll.passive="onScroll">
            <template #default="{ item, active }">
                <DynamicScrollerItem :item="item" :active="active"
                    :size-dependencies="[item.content, item.loading, dislikePopup.messageId === item.id]">
                    <ChatMessageItem :item="item" :feedback-type="feedbackMap[item.id]"
                        :is-copied="copiedId === item.id" :dislike-open="dislikePopup.messageId === item.id"
                        :dislike-selected-tags="dislikePopup.selectedTags" :dislike-comment="dislikePopup.comment"
                        @copy="copyMessage(item)" @like="toggleLike(item)" @dislike-open="openDislike(item)"
                        @toggle-tag="toggleTag" @update:dislike-comment="v => dislikePopup.comment = v"
                        @submit-dislike="submitDislike(item)" @cancel-dislike="closeDislike"
                        @regenerate="regenerate(item)" />
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
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
                            <rect width="11" height="11" rx="2" />
                        </svg>
                    </button>
                    <button class="btn-send" :disabled="!inputText.trim() || streaming" @click="send()">
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <path d="M1.5 7.5h12M8 2l5.5 5.5L8 13" stroke="currentColor" stroke-width="1.8"
                                stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>
            <p class="input-hint">Enter 发送 · Shift+Enter 换行</p>
        </div>

    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import { createChatStream } from '@/services/chat.service'
import type { Subscription } from 'rxjs'
import { useAuthStore } from '../../stores/auth'
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
let sub: Subscription
let abortFn: () => void

function send() {
    const text = inputText.value.trim()
    if (!text) return

    sub?.unsubscribe()
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
    sub?.unsubscribe()
    abortFn?.()
    streaming.value = false
    if (streamingMessage.value) {
        streamingMessage.value.status = 'STOPPED'
        messages.push(streamingMessage.value)
        streamingMessage.value = null
    }
}

const auth = useAuthStore()
const reconnectAttempt = ref(0)

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
        }))
        nextTick(() => scrollerRef.value?.scrollToBottom?.())
    } catch { /* 新对话，忽略 */ }
})

const CHAT_STREAM_URL = 'http://localhost:3100/api/chat/stream'

function sendToAI(text: string) {
    streaming.value = true

    // 从本地 messages 构建 OpenAI 格式的消息列表（包含刚推入的用户消息）
    const llmMessages = [
        ...(props.systemPrompt ? [{ role: 'system', content: props.systemPrompt }] : []),
        ...messages
            .filter(m => !m.loading && m.status !== 'ERROR' && m.content)
            .map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.content })),
    ]

    const token = localStorage.getItem('auth_token') ?? ''
    const { text$, abort } = createChatStream({
        retry: false,
        url: props.url ?? CHAT_STREAM_URL,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        maxRetries: 3,
        onReconnecting(attempt) {
            reconnectAttempt.value = attempt
            if (!streamingMessage.value) return
            streamingMessage.value.loading = true
            streamingMessage.value.content = ''
            streamingMessage.value.status = 'RECONNECTING'
        },
        body: {
            model: props.model || 'google/gemma-3-4b',
            messages: llmMessages,
            temperature: props.temperature ?? 0.7,
            max_tokens: props.maxTokens ?? 1024,
        },
        pickText: (data: string) => {
            if (data === '[DONE]') return ''
            try {
                const obj = JSON.parse(data)
                return obj.choices?.[0]?.delta?.content ?? ''
            } catch { return '' }
        },
    })

    abortFn = abort

    sub = text$.subscribe({
        next(value) {
            if (!streamingMessage.value) return
            streamingMessage.value.loading = false
            streamingMessage.value.status = undefined
            streamingMessage.value.content = value
            reconnectAttempt.value = 0
            if (!document.hidden) scrollToBottom()
        },
        error(err) {
            streaming.value = false
            if (streamingMessage.value) {
                streamingMessage.value.loading = false
                streamingMessage.value.content = `⚠️ ${err?.message ?? '请求失败'}`
                streamingMessage.value.status = 'ERROR'
                messages.push(streamingMessage.value)
                streamingMessage.value = null
            }
            emit('conversation-updated')
        },
        complete() {
            streaming.value = false
            if (streamingMessage.value) {
                const aiContent = streamingMessage.value.content
                streamingMessage.value.status = 'DONE'
                messages.push(streamingMessage.value)
                streamingMessage.value = null
                // 流结束后将本轮对话存到后端（仅在有对话 ID 时）
                if (props.conversationId && aiContent) {
                    ConversationService.appendMessages(props.conversationId, text, aiContent)
                        .catch(err => console.warn('[appendMessages]', err))
                }
            }
            if (!document.hidden) scrollToBottom()
            emit('conversation-updated')
        },
    })
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

onBeforeUnmount(() => { sub?.unsubscribe(); abortFn?.() })
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
</style>
