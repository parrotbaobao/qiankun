import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ConversationService, type ConvSummary, type Conversation } from '../services/conversation.service'

export const useConversationStore = defineStore('conversation', () => {
  const list    = ref<ConvSummary[]>([])
  const current = ref<Conversation | null>(null)
  const loading = ref(false)

  async function fetchList() {
    loading.value = true
    try { list.value = await ConversationService.list() }
    finally { loading.value = false }
  }

  async function create() {
    const conv = await ConversationService.create()
    list.value.unshift({ ...conv, messageCount: 0 })
    current.value = conv
    return conv
  }

  async function select(id: string) {
    const conv = await ConversationService.get(id)
    current.value = conv
    return conv
  }

  async function remove(id: string) {
    await ConversationService.remove(id)
    list.value = list.value.filter(c => c.id !== id)
    if (current.value?.id === id) current.value = null
  }

  async function rename(id: string, title: string) {
    await ConversationService.rename(id, title)
    const item = list.value.find(c => c.id === id)
    if (item) item.title = title
    if (current.value?.id === id) current.value.title = title
  }

  // 聊完一轮后刷新列表（标题/messageCount 更新）
  async function refreshItem(id: string) {
    const conv = await ConversationService.get(id)
    const idx  = list.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      list.value[idx] = { ...conv, messageCount: conv.messages.length }
    } else {
      list.value.unshift({ ...conv, messageCount: conv.messages.length })
    }
    // 排序（最近更新在前）
    list.value.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  return { list, current, loading, fetchList, create, select, remove, rename, refreshItem }
})
