import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getCookie } from '@/lib/utils'

const MUTATING = new Set(['post', 'put', 'patch', 'delete'])

let csrfToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

export function setCsrfToken(token: string | null) {
  csrfToken = token
}

export function getCsrfToken() {
  return csrfToken ?? getCookie('csrf_token')
}

async function refreshSession(): Promise<string | null> {
  try {
    const { data } = await axios.post<{ user: unknown; csrf_token: string }>(
      '/api/v1/auth/refresh',
      {},
      { withCredentials: true },
    )
    setCsrfToken(data.csrf_token)
    return data.csrf_token
  } catch {
    setCsrfToken(null)
    return null
  }
}

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = config.method?.toLowerCase()
  if (method && MUTATING.has(method)) {
    const token = getCsrfToken()
    if (token) config.headers['X-CSRF-Token'] = token
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (
      error.response?.status === 401 &&
      config &&
      !config._retry &&
      !config.url?.includes('/auth/login') &&
      !config.url?.includes('/auth/refresh')
    ) {
      config._retry = true
      if (!refreshPromise) refreshPromise = refreshSession().finally(() => { refreshPromise = null })
      const token = await refreshPromise
      if (token) {
        config.headers['X-CSRF-Token'] = token
        return apiClient(config)
      }
    }
    return Promise.reject(error)
  },
)

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong'
}
