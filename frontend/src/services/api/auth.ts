import { apiClient } from './client'
import type { AuthResponse, MessageResponse, User } from '@/types'
import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  VerifyOtpInput,
} from '@/validation/auth'

export const authApi = {
  signup: (data: SignupInput) =>
    apiClient.post<MessageResponse>('/auth/signup', data).then((r) => r.data),

  verifyEmail: (data: VerifyOtpInput) =>
    apiClient.post<MessageResponse>('/auth/verify-email', data).then((r) => r.data),

  resendOtp: (email: string) =>
    apiClient.post<MessageResponse>('/auth/resend-otp', { email }).then((r) => r.data),

  login: (data: LoginInput) =>
    apiClient.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  logout: () => apiClient.post<MessageResponse>('/auth/logout').then((r) => r.data),

  refresh: () => apiClient.post<AuthResponse>('/auth/refresh').then((r) => r.data),

  me: () => apiClient.get<AuthResponse>('/auth/me').then((r) => r.data),

  forgotPassword: (data: ForgotPasswordInput) =>
    apiClient.post<MessageResponse>('/auth/forgot-password', data).then((r) => r.data),

  resetPassword: (data: ResetPasswordInput) =>
    apiClient.post<MessageResponse>('/auth/reset-password', data).then((r) => r.data),
}

export type { User }
