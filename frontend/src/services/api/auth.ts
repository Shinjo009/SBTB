import { apiClient, clearTokens, setTokens } from './client'
import type { AuthResponse, MessageResponse, TokenPairResponse, User } from '@/types'

export const authApi = {
  signup: async (data: {
    full_name: string
    email: string
    password: string
    confirm_password: string
    phone?: string
  }) => {
    const res = await apiClient.post<TokenPairResponse>('/auth/signup', data).then((r) => r.data)
    setTokens(res.access_token, res.refresh_token)
    return res
  },

  login: async (data: { email: string; password: string }) => {
    const res = await apiClient.post<TokenPairResponse>('/auth/login', data).then((r) => r.data)
    setTokens(res.access_token, res.refresh_token)
    return res
  },

  logout: async () => {
    const refresh = localStorage.getItem('sbtb_refresh_token')
    try {
      if (refresh) {
        await apiClient.post<MessageResponse>('/auth/logout', { refresh_token: refresh })
      }
    } finally {
      clearTokens()
    }
  },

  me: () => apiClient.get<AuthResponse>('/auth/me').then((r) => r.data),
}

export type { User }
