const BASE = 'http://localhost:3100'

export interface UserPreferences {
  theme: 'light' | 'dark'
  language: string
  notifications: boolean
  compactMode: boolean
}

export interface UserStats {
  loginCount: number
  promptCount: number
  chatCount: number
}

export interface User {
  id: number
  username: string
  name: string
  nickname: string
  avatar: string
  email: string
  phone: string
  gender: 'male' | 'female' | 'other'
  role: 'admin' | 'user'
  department: string
  position: string
  bio: string
  location: string
  website: string
  status: 'active' | 'inactive'
  permissions: string[]
  tags: string[]
  preferences: UserPreferences
  stats: UserStats
  createdAt: string
  lastLoginAt: string | null
  updatedAt: string
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
  if (!res.ok || json.code !== 0) {
    throw new Error(json.message || '请求失败')
  }
  return json.data as T
}

export const authService = {
  login(username: string, password: string) {
    return request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },
  logout() {
    return request<void>('/api/auth/logout', { method: 'POST' })
  },
  me() {
    return request<{ user: User }>('/api/auth/me')
  },
}
