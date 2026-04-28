<template>
    <div class="ai-chat">
        <header class="ai-header">
            <h3>AI 聊天</h3>
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
            <input v-model="inputText" placeholder="输入消息..." @keydown.enter="send()" />
            <button @click="send()">发送</button>
            <button @click="stop()">停止</button>
        </footer>
    </div>

</template>
<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { createChatStream } from '@/services/chat.service';
import type { Subscription } from 'rxjs';
import MdText from './MdText.vue'

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

let abortFn: () => void;

function send() {
    const text = (inputText.value || '').trim();
    messages.push({
        id: crypto.randomUUID(),
        from: 'user', text, createdAt: Date.now(),
    })
    // 插入一条“正在流式”的 AI 消息（后续不断覆盖 text）
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
    const options = {
        body: {
            model: 'google/gemma-3-4b',
            stream: true,
            temperature: 0.2,
            messages: [{ role: 'user', content: text }],
        },
        pickText: (data: string) => {
            try {
                const obj = JSON.parse(data);
                return obj?.choices?.[0]?.delta?.content ?? '';
            } catch {
                return ''
            }
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
        error() {
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
  height: calc(100vh - 49px);
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