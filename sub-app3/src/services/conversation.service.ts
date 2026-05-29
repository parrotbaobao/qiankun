const BASE = 'http://localhost:3100/api/conversations'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export interface ConvSummary {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

export interface ConvMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

export interface Conversation extends ConvSummary {
  messages: ConvMessage[]
}

export const ConversationService = {
  async list(): Promise<ConvSummary[]> {
    const r = await fetch(BASE, { headers: authHeaders() })
    const d = await r.json()
    return d.conversations
  },

  async create(title = '新对话'): Promise<Conversation> {
    const r = await fetch(BASE, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title }),
    })
    return (await r.json()).conversation
  },

  async get(id: string): Promise<Conversation> {
    const r = await fetch(`${BASE}/${id}`, { headers: authHeaders() })
    return (await r.json()).conversation
  },

  async rename(id: string, title: string): Promise<void> {
    await fetch(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ title }),
    })
  },

  async remove(id: string): Promise<void> {
    await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: authHeaders() })
  },

  async appendMessages(id: string, userMessage: string, assistantMessage: string): Promise<void> {
    await fetch(`${BASE}/${id}/messages`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ userMessage, assistantMessage }),
    })
  },
}
