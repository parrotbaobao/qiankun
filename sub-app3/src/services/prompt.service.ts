const BASE = 'http://localhost:3100'

export interface Prompt {
  id: number
  title: string
  description: string
  content: string
  category: string
  icon: string
  createdAt: string
  updatedAt?: string
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token')
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  const json = await res.json()
  if (!res.ok || json.code !== 0) throw new Error(json.message || '请求失败')
  return json.data as T
}

export const promptService = {
  list() {
    return request<{ prompts: Prompt[] }>('/api/prompts')
  },
  create(data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) {
    return request<{ prompt: Prompt }>('/api/prompts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  update(id: number, data: Partial<Omit<Prompt, 'id' | 'createdAt'>>) {
    return request<{ prompt: Prompt }>(`/api/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
  remove(id: number) {
    return request<void>(`/api/prompts/${id}`, { method: 'DELETE' })
  },
}
