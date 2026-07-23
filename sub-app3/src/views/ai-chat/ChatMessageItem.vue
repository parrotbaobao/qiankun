<template>
    <div class="chat-inner">
        <!-- 用户消息 -->
        <div v-if="item.from === 'user'" class="row row-user">
            <div class="bubble-user">{{ item.content }}</div>
        </div>
        <!-- AI 消息 -->
        <div v-else class="row row-ai">
            <div class="ai-avatar">
                <IconBolt :size="13" />
            </div>
            <div class="ai-body-inner">
                <span v-if="item.loading && item.status === 'RECONNECTING'" class="reconnecting">
                    <IconRefresh class="reconnecting-icon" :size="13" stroke-width="2.2" />
                    重连中…
                </span>
                <span v-else-if="item.loading" class="typing"><i /><i /><i /></span>
                <div v-else class="ai-text">
                    <MessageBubble :message="item" />
                    <div class="msg-meta-row">
                        <div v-if="item.status === 'DONE'" class="msg-done">
                            <IconCheck :size="11" />
                            已完成
                        </div>
                        <div v-else-if="item.status === 'STOPPED'" class="msg-stopped">
                            <IconStopRect :size="10" />
                            已停止
                        </div>
                        <!-- 操作按钮 -->
                        <div v-if="item.status === 'DONE' || item.status === 'STOPPED'" class="msg-actions">
                            <!-- 复制 -->
                            <button class="act-btn" :class="{ 'act-btn--done': isCopied }"
                                :title="isCopied ? '已复制' : '复制'" @click="emit('copy')">
                                <IconCheck v-if="isCopied" :size="13" />
                                <IconCopy v-else :size="13" />
                            </button>
                            <!-- 点赞 -->
                            <button class="act-btn" :class="{ 'act-btn--like': feedbackType === 1 }" title="点赞"
                                @click="emit('like')">
                                <IconThumbUp :size="13" />
                            </button>
                            <!-- 点踩 -->
                            <button class="act-btn" :class="{ 'act-btn--dislike': feedbackType === -1 }" title="点踩"
                                @click="emit('dislike-open')">
                                <IconThumbDown :size="13" />
                            </button>
                            <!-- 重新生成 -->
                            <button v-if="item.status === 'DONE'" class="act-btn" title="重新生成"
                                @click="emit('regenerate')">
                                <IconRefresh :size="13" />
                            </button>
                        </div>
                    </div>

                    <!-- 可观测性指标条 -->
                    <div v-if="item.metrics" class="metrics-bar">
                        <span v-if="item.metrics.ttftMs != null" class="metric-chip" title="首字延迟 (Time To First Token)">
                            <span class="metric-ico">⚡</span>TTFT {{ fmtMs(item.metrics.ttftMs) }}
                        </span>
                        <span v-if="tokenLabel(item.metrics)" class="metric-chip"
                            :title="tokenTitle(item.metrics)">
                            <span class="metric-ico">🔢</span>{{ tokenLabel(item.metrics) }}
                        </span>
                        <span v-if="item.metrics.tokensPerSec != null" class="metric-chip" title="生成速度（生成阶段 tokens/秒）">
                            <span class="metric-ico">🚀</span>{{ item.metrics.tokensPerSec.toFixed(1) }} tok/s
                        </span>
                        <span v-if="item.metrics.totalMs != null" class="metric-chip" title="总耗时">
                            <span class="metric-ico">⏱</span>{{ fmtMs(item.metrics.totalMs) }}
                        </span>
                        <span v-if="item.metrics.finishReason" class="metric-chip metric-chip--finish"
                            :data-reason="item.metrics.finishReason" title="结束原因 (finish_reason)">
                            <span class="metric-ico">🏁</span>{{ item.metrics.finishReason }}
                        </span>
                        <button class="metric-raw" title="查看原始请求 / 响应" @click="emit('view-raw')">
                            &lt;/&gt; 原始
                        </button>
                    </div>
                    <!-- 点踩弹窗 -->
                    <div v-if="dislikeOpen" class="dislike-popup">
                        <p class="dislike-title">请告诉我们哪里不对</p>
                        <div class="dislike-tags">
                            <button v-for="tag in DISLIKE_TAGS" :key="tag" class="dislike-tag"
                                :class="{ 'dislike-tag--on': (dislikeSelectedTags ?? []).includes(tag) }"
                                @click="emit('toggle-tag', tag)">{{ tag }}</button>
                        </div>
                        <textarea class="dislike-comment" :value="dislikeComment" placeholder="补充说明（选填）" rows="2"
                            @input="emit('update:dislikeComment', ($event.target as HTMLTextAreaElement).value)" />
                        <div class="dislike-footer">
                            <button class="dislike-cancel" @click="emit('cancel-dislike')">取消</button>
                            <button class="dislike-submit" @click="emit('submit-dislike')">提交</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import MessageBubble from './MessageBubble.vue'
import IconBolt from '@/components/icons/IconBolt.vue'
import IconRefresh from '@/components/icons/IconRefresh.vue'
import IconCheck from '@/components/icons/IconCheck.vue'
import IconStopRect from '@/components/icons/IconStopRect.vue'
import IconCopy from '@/components/icons/IconCopy.vue'
import IconThumbUp from '@/components/icons/IconThumbUp.vue'
import IconThumbDown from '@/components/icons/IconThumbDown.vue'
import type { ChatMetrics } from '@/services/chat.service'

export interface ChatMessage {
    id: string
    content: string
    from: 'user' | 'ai'
    createdAt: number
    loading?: boolean
    status?: string
    metrics?: ChatMetrics
}

function fmtMs(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)} ms`
    return `${(ms / 1000).toFixed(2)} s`
}

function tokenLabel(m: ChatMetrics): string {
    const u = m.usage
    if (u?.completion_tokens == null) return ''
    const prefix = m.estimated ? '~' : ''
    const prompt = !m.estimated && u.prompt_tokens != null ? `${u.prompt_tokens}→` : ''
    return `${prefix}${prompt}${u.completion_tokens} tok`
}

function tokenTitle(m: ChatMetrics): string {
    const u = m.usage
    if (!u) return 'Token 用量'
    if (m.estimated) return `按字符估算的输出 token（上游未回传 usage）`
    return `输入 ${u.prompt_tokens ?? '—'} · 输出 ${u.completion_tokens ?? '—'} · 合计 ${u.total_tokens ?? '—'}`
}

const props = defineProps<{
    item: ChatMessage
    feedbackType?: 1 | -1
    isCopied?: boolean
    dislikeOpen?: boolean
    dislikeSelectedTags?: string[]
    dislikeComment?: string
}>()

const emit = defineEmits<{
    (e: 'copy'): void
    (e: 'like'): void
    (e: 'dislike-open'): void
    (e: 'toggle-tag', tag: string): void
    (e: 'update:dislikeComment', value: string): void
    (e: 'submit-dislike'): void
    (e: 'cancel-dislike'): void
    (e: 'regenerate'): void
    (e: 'view-raw'): void
}>()

const DISLIKE_TAGS = ['不准确', '答非所问', '内容有害', '回答太长', '回答太短', '其他']
</script>

<style scoped lang="scss">
.chat-inner {
    max-width: 720px;
    margin: 0 auto;
    padding: 4px 20px;
}

.row {
    display: flex;
    padding: 6px 0;
}

.row-user {
    justify-content: flex-end;
    padding: 4px 0;
}

.bubble-user {
    max-width: 70%;
    background: #18181b;
    color: #fafafa;
    border-radius: 18px 18px 4px 18px;
    padding: 10px 16px;
    font-size: 14px;
    line-height: 1.65;
    white-space: pre-wrap;
    word-break: break-word;
}

.row-ai {
    align-items: flex-start;
    gap: 10px;
    padding: 8px 0;
}

.ai-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
}

.ai-body-inner {
    flex: 1;
    min-width: 0;
    padding-top: 2px;
}

.ai-text {
    font-size: 14px;
    line-height: 1.75;
    color: #0a0a0a;
}

.msg-meta-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
    flex-wrap: wrap;
}

.msg-done {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #b8b8b8;
}

.msg-stopped {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #f59e0b;
}

.msg-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    transition: opacity 0.15s;
}

/* ── 可观测性指标条 ── */
.metrics-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
}

.metric-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: #64748b;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    cursor: default;
}

.metric-ico {
    font-size: 11px;
    line-height: 1;
}

.metric-chip--finish {
    color: #047857;
    background: #ecfdf5;
    border-color: #a7f3d0;
}

.metric-chip--finish[data-reason="length"] {
    color: #b45309;
    background: #fffbeb;
    border-color: #fde68a;
}

.metric-chip--finish[data-reason="content_filter"] {
    color: #b91c1c;
    background: #fef2f2;
    border-color: #fecaca;
}

.metric-raw {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    color: #7c3aed;
    background: transparent;
    border: 1px solid #ddd6fe;
    cursor: pointer;
    transition: all 0.12s;
}

.metric-raw:hover {
    background: #f3f0ff;
    border-color: #a78bfa;
}

.act-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: #b0b0b0;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;

    &:hover {
        background: #f0f0f0;
        color: #3f3f46;
    }

    &--done {
        color: #22c55e !important;
    }

    &--like {
        color: #7c3aed !important;
        background: #f3f0ff;
    }

    &--dislike {
        color: #ef4444 !important;
        background: #fff1f0;
    }
}

.dislike-popup {
    margin-top: 10px;
    padding: 14px;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    max-width: 360px;
}

.dislike-title {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 600;
    color: #18181b;
}

.dislike-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
}

.dislike-tag {
    padding: 4px 10px;
    border-radius: 20px;
    border: 1px solid #e4e4e7;
    background: #f4f4f5;
    color: #52525b;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.12s;

    &:hover {
        border-color: #a78bfa;
        color: #7c3aed;
    }

    &--on {
        border-color: #7c3aed;
        background: #f3f0ff;
        color: #7c3aed;
    }
}

.dislike-comment {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #e4e4e7;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 13px;
    font-family: inherit;
    resize: none;
    outline: none;
    color: #18181b;
    background: #fafafa;
    transition: border-color 0.15s;

    &:focus {
        border-color: #7c3aed;
        background: #fff;
    }
}

.dislike-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 10px;
}

.dislike-cancel {
    padding: 5px 14px;
    border-radius: 7px;
    border: 1px solid #e4e4e7;
    background: #fff;
    color: #71717a;
    font-size: 13px;
    cursor: pointer;

    &:hover {
        background: #f4f4f5;
    }
}

.dislike-submit {
    padding: 5px 14px;
    border-radius: 7px;
    border: none;
    background: #7c3aed;
    color: #fff;
    font-size: 13px;
    cursor: pointer;

    &:hover {
        background: #6d28d9;
    }
}

.typing {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    height: 24px;
    padding-top: 4px;

    i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #c0c0c0;
        animation: typingBounce 1.2s infinite ease-in-out;

        &:nth-child(1) {
            animation-delay: 0s;
        }

        &:nth-child(2) {
            animation-delay: 0.16s;
        }

        &:nth-child(3) {
            animation-delay: 0.32s;
        }
    }
}

@keyframes typingBounce {

    0%,
    60%,
    100% {
        transform: translateY(0);
        opacity: 0.35;
    }

    30% {
        transform: translateY(-5px);
        opacity: 1;
    }
}

.reconnecting {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 24px;
    padding-top: 4px;
    font-size: 12px;
    color: #f59e0b;
}

.reconnecting-icon {
    animation: spin 1.2s linear infinite;
    color: #f59e0b;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
</style>
