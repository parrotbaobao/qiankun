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
                            <mdText :content="m.text" :streaming="streaming"></mdText>
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
import mdText from './mdText.vue'

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
:host {
    display: block;
}

.ai-chat {
    max-width: 960px;
    height: calc(100vh - 40px);
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;

    .ai-header {
        padding: 20px;
        box-sizing: border-box;
    }

    .ai-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        box-sizing: border-box;

        .typing {
            display: inline-flex;
            gap: 6px;
            align-items: center;
            height: 16px;
        }

        .typing i {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
            opacity: 0.3;
            animation: dotPulse 1.2s infinite ease-in-out;
        }

        .typing i:nth-child(2) {
            animation-delay: 0.15s;
        }

        .typing i:nth-child(3) {
            animation-delay: 0.3s;
        }

        @keyframes dotPulse {

            0%,
            80%,
            100% {
                transform: translateY(0);
                opacity: 0.25;
            }

            40% {
                transform: translateY(-3px);
                opacity: 1;
            }
        }
    }

    .ai-footer {
        display: flex;
        gap: 8px;
        padding: 10px 12px;
        border-top: 1px solid #eee;
        box-sizing: border-box;

        input {
            flex: 1;
            padding: 8px 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        button {
            padding: 8px 12px;
        }
    }
}

.open-btn {
    padding: 8px 12px;
    border: 1px solid #1976d2;
    background: #1976d2;
    color: white;
    border-radius: 4px;
    cursor: pointer;
}

.messages {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.msg {
    padding: 8px 10px;
    border-radius: 6px;
    max-width: 80%;
}

.msg.user {
    background: #e6f7ff;
    align-self: flex-end;
}

.msg.ai {
    background: #f6f6f6;
    align-self: flex-start;
}

.close {
    background: transparent;
    border: 0;
    font-size: 18px;
    cursor: pointer;
}
</style>