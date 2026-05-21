<template>
    <div class="ai-chat">
        <header v-if="!hideHeader" class="ai-header">
            <h3>{{ title || 'AI 聊天' }}</h3>
        </header>
        <section class="ai-body" ref="scrollEl">
            <div class="messages">
                <div v-for="m in messages" :key="m.id" class="msg" :class="m?.from">
                    <template v-if="m.from === 'ai'">
                        <template v-if="m?.loading">
                            <span class="typing"> <i></i><i></i><i></i> </span>
                        </template>
                        <ng-template v-if="!m?.loading">
                            <MdText :content="m.text" :streaming="streaming"></MdText>
                        </ng-template>
                    </template>
                    <template v-if="m.from === 'user'">
                        <span class="text">{{ m.text }}</span>
                    </template>
                </div>
            </div>
        </section>

        <footer class="ai-footer">
            <input ref="chatInputRef" v-model="inputText" placeholder="输入消息..." @keydown.enter="send()" />
            <button @click="send()">发送</button>
            <button @click="stop()">停止</button>
        </footer>
    </div>

</template>
<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, type Ref } from 'vue';
import { createChatStream } from '@/services/chat.service';
import type { Subscription } from 'rxjs';
import MdText from './MdText.vue'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{
    systemPrompt?: string
    title?: string
    temperature?: number
    model?: string
    maxTokens?: number
    topP?: number
    hideHeader?: boolean
    url?: string
}>()

const chatInputRef = ref<HTMLInputElement | null>(null)

defineExpose({
    clearMessages: () => { messages.splice(0); stop() },
    setInput: (text: string) => {
        inputText.value = text
        nextTick(() => chatInputRef.value?.focus())
    },
    sendMessage: (text: string) => {
        if (!text.trim()) return
        inputText.value = text
        nextTick(() => send())
    },
})

type Message = {
    id: string;
    text: string;
    from: 'user' | 'ai';
    createdAt: number;
    loading?: boolean;
    status?: string;

}

const inputText = ref("");
const messages = reactive<Message[]>([])
const currentAssistantMsg = ref<Message | null>(null);
const scrollEl = ref<HTMLElement | null>(null)
const streaming = ref(true)
let sub: Subscription;
const THRESHOLD = 40 // px：离底部 <= 40px 认为在底部（避免小抖动）
const isAtBottom = ref(true)
const autoScrollEnabled = ref(true)
const auth = useAuthStore();

let abortFn: () => void;

const user = auth.user;

function send() {
    const text = (inputText.value || '').trim();
    messages.push({
        id: crypto.randomUUID(),
        from: 'user', text, createdAt: Date.now(),
    })
    // 插入一条"正在流式"的 AI 消息（后续不断覆盖 text）
    currentAssistantMsg.value = {
        id: crypto.randomUUID(),
        from: 'ai',
        text: '',
        createdAt: Date.now(),
        loading: true,
    };
    messages.push(currentAssistantMsg.value);
    inputText.value = "";
    scrollToBottom()
    sendToAI(text);

}

function stop() {
    sub?.unsubscribe();
    abortFn?.();
}

function sendToAI(text: string) {
    const history = messages
        .filter(m => !m.loading && m.status !== 'ERROR' && m.text)
        .slice(0, -1)
        .map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }))

    const options = {
        retry: false,
        url: props.url,
        body: {
            message: text,
            history,
            ...(props.systemPrompt ? { systemPrompt: props.systemPrompt } : {}),
        },
        pickText: (data: string) => {
            const obj = JSON.parse(data)
            if (obj.type === 'error') throw new Error(obj.message)
            if (obj.type === 'done') return ''
            return obj.content ?? ''
        }
    }
    streaming.value = true;
    const { text$, abort } = createChatStream(options)
    abortFn = abort;
    sub = text$.subscribe({
        next(value) {
            if (!currentAssistantMsg.value) return;
            currentAssistantMsg.value.loading = false;
            currentAssistantMsg.value.text = value;
            if (!document.hidden) {
                scrollToBottom()
            }
        },
        error(err) {
            if (currentAssistantMsg.value) {
                streaming.value = false;
                currentAssistantMsg.value.loading = false;
                currentAssistantMsg.value.text = `⚠️ ${err?.message ?? '请求失败，请检查 LM Studio 是否正常运行'}`;
                currentAssistantMsg.value.status = 'ERROR';
            }
        },
        complete() {
            if (currentAssistantMsg.value) {
                streaming.value = false;
                currentAssistantMsg.value.status = 'DONE';
            }
            if (!document.hidden) {
                scrollToBottom()
            }
        },
    })

}

function scrollToBottom() {
    if (!scrollEl.value) {
        return;
    }
    console.log(autoScrollEnabled.value, isAtBottom.value)
    if (!autoScrollEnabled.value || !isAtBottom.value) return

    nextTick(() => {
        scrollEl.value?.scrollTo({
            top: scrollEl.value.scrollHeight,
            behavior: 'auto'
        })
    })
}

function computeAtBottom(el: HTMLElement) {
    const { scrollTop, clientHeight, scrollHeight } = el;
    return scrollTop + clientHeight >= scrollHeight - THRESHOLD

}

function onScroll() {
    const el = scrollEl.value
    if (!el) return

    const atBottom = computeAtBottom(el)
    isAtBottom.value = atBottom
    console.log(atBottom)
    // 只要用户离开底部，就暂停自动滚动
    if (!atBottom) autoScrollEnabled.value = false
    // 用户滚回底部，就恢复
    else autoScrollEnabled.value = true
}

onMounted(() => {
    const el = scrollEl.value
    if (!el) return
    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

}),

    onBeforeUnmount(() => {
        stop();
    })

</script>
<style scoped lang="scss">
.ai-chat {
  max-width: 860px;
  height: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-left: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
}

.ai-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
  }
}

.ai-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  scroll-behavior: smooth;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 14px;
  line-height: 1.6;
  font-size: 14px;
  word-break: break-word;

  &.user {
    align-self: flex-end;
    background: #4f46e5;
    color: #fff;
    border-bottom-right-radius: 4px;
  }

  &.ai {
    align-self: flex-start;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #0f172a;
    border-bottom-left-radius: 4px;
  }
}

.typing {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  height: 18px;

  i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #94a3b8;
    animation: dot-pulse 1.2s infinite ease-in-out;

    &:nth-child(2) { animation-delay: 0.15s; }
    &:nth-child(3) { animation-delay: 0.3s; }
  }
}

@keyframes dot-pulse {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
  40% { transform: translateY(-4px); opacity: 1; }
}

.ai-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;

  input {
    flex: 1;
    padding: 9px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    outline: none;
    font-size: 14px;
    color: #0f172a;
    background: #f8fafc;
    transition: border-color 0.15s;

    &:focus {
      border-color: #4f46e5;
      background: #ffffff;
    }
  }

  button {
    padding: 9px 16px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;

    &:first-of-type {
      background: #4f46e5;
      border-color: #4f46e5;
      color: #fff;

      &:hover { background: #4338ca; }
    }

    &:last-of-type {
      background: transparent;
      color: #64748b;

      &:hover {
        border-color: #ef4444;
        color: #ef4444;
      }
    }
  }
}
</style>
