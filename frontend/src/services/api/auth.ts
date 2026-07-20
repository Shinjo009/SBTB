import { apiClient, clearTokens, setTokens } from './client'
import type { AuthResponse, MessageResponse, TokenPairResponse, User } from '@/types'

export const authApi = {
  signup: (data: { full_name: string; email: string; phone?: string }) =>
    apiClient.post<MessageResponse>('/auth/signup', data).then((r) => r.data),

  requestOtp: (email: string) =>
    apiClient.post<MessageResponse>('/auth/request-otp', { email }).then((r) => r.data),

  verifyOtp: async (email: string, otp: string) => {
    const data = await apiClient
      .post<TokenPairResponse>('/auth/verify-otp', { email, otp })
      .then((r) => r.data)
    setTokens(data.access_token, data.refresh_token)
    return data
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
