import { defineStore } from "pinia";
import { computed, ref } from "vue";

export type Message = {
    id: string;
    text: string;
    from: 'user' | 'ai';
    createdAt: number;
    loading?: boolean;
    status?: string;
}

export const useChatStore = defineStore("chat", () => {
    const messages = ref<Message[]>([])
    const streaming = ref(false)

    const isGenerating = computed(() =>
        streaming.value || messages.value.some(m => m.loading)
    )

    function addUserMessage(text: string): Message {
        const msg: Message = {
            id: crypto.randomUUID(),
            from: 'user',
            text,
            createdAt: Date.now(),
        }
        messages.value.push(msg)
        return msg
    }

    function startAssistantMessage(): Message {
        const msg: Message = {
            id: crypto.randomUUID(),
            from: 'ai',
            text: '',
            createdAt: Date.now(),
            loading: true,
        }
        messages.value.push(msg)
        streaming.value = true
        return msg
    }

    function updateAssistantContent(id: string, text: string) {
        const msg = messages.value.find(m => m.id === id)
        if (!msg) return
        msg.loading = false
        msg.text = text
    }

    function finishAssistantMessage(id: string) {
        const msg = messages.value.find(m => m.id === id)
        if (!msg) return
        msg.loading = false
        msg.status = 'DONE'
        streaming.value = false
    }

    function clearMessages() {
        messages.value = []
        streaming.value = false
    }

    return {
        messages,
        streaming,
        isGenerating,
        addUserMessage,
        startAssistantMessage,
        updateAssistantContent,
        finishAssistantMessage,
        clearMessages,
    }
})
