import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService, type User } from '../services/auth.service'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => !!token.value)

  async function login(username: string, password: string) {
    const data = await authService.login(username, password)
    token.value = data.token
    user.value = data.user
    localStorage.setItem('auth_token', data.token)
  }

  async function logout() {
    try {
      await authService.logout()
    } finally {
      token.value = null
      user.value = null
      localStorage.removeItem('auth_token')
    }
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const data = await authService.me()
      user.value = data.user
    } catch {
      token.value = null
      user.value = null
      localStorage.removeItem('auth_token')
    }
  }

  return { token, user, isLoggedIn, login, logout, fetchMe }
})
