const BASE = 'http://localhost:3100/api/feedback'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export type FeedbackType = 1 | -1

export interface FeedbackPayload {
  messageId: string
  feedbackType: FeedbackType
  reasonTags?: string[]
  comment?: string
  userQuery?: string
  aiResponse?: string
  conversationId?: string
}

export interface MessageFeedbackInfo {
  feedbackType: FeedbackType
  reasonTags: string[]
  comment: string | null
}

export interface FeedbackStats {
  likes: number
  dislikes: number
  total: number
}

export const FeedbackService = {
  async submit(payload: FeedbackPayload): Promise<void> {
    const r = await fetch(BASE, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error(`feedback submit failed: ${r.status}`)
  },

  async cancel(messageId: string): Promise<void> {
    const r = await fetch(`${BASE}/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!r.ok && r.status !== 404) throw new Error(`feedback cancel failed: ${r.status}`)
  },

  async getStats(conversationId?: string): Promise<FeedbackStats> {
    const qs = conversationId ? `?conversationId=${conversationId}` : ''
    const r = await fetch(`${BASE}/stats${qs}`, { headers: authHeaders() })
    const d = await r.json()
    return d.data
  },

  async getForMessages(messageIds: string[]): Promise<Record<string, MessageFeedbackInfo>> {
    if (!messageIds.length) return {}
    const qs = `?ids=${messageIds.join(',')}`
    const r = await fetch(`${BASE}/messages${qs}`, { headers: authHeaders() })
    const d = await r.json()
    return d.data ?? {}
  },
}
