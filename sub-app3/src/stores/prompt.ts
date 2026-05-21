import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { promptService, type Prompt } from '../services/prompt.service'

export const usePromptStore = defineStore('prompt', () => {
  const prompts = ref<Prompt[]>([])
  const loading = ref(false)

  const getById = computed(() => (id: number) => prompts.value.find(p => p.id === id))

  async function fetchPrompts() {
    loading.value = true
    try {
      const data = await promptService.list()
      prompts.value = data.prompts
    } finally {
      loading.value = false
    }
  }

  async function createPrompt(data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) {
    const res = await promptService.create(data)
    prompts.value.push(res.prompt)
    return res.prompt
  }

  async function updatePrompt(id: number, data: Partial<Omit<Prompt, 'id' | 'createdAt'>>) {
    const res = await promptService.update(id, data)
    const idx = prompts.value.findIndex(p => p.id === id)
    if (idx >= 0) prompts.value[idx] = res.prompt
    return res.prompt
  }

  async function removePrompt(id: number) {
    await promptService.remove(id)
    prompts.value = prompts.value.filter(p => p.id !== id)
  }

  return { prompts, loading, getById, fetchPrompts, createPrompt, updatePrompt, removePrompt }
})
