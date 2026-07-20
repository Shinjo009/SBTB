import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from '@/services/api/auth'
import { setCsrfToken } from '@/services/api/client'
import { getErrorMessage } from '@/services/api/client'
import type { User } from '@/types'
import type { LoginInput, SignupInput } from '@/validation/auth'

interface AuthContextValue {
  user: User | null
  csrf: string | null
  isLoading: boolean
  isAdmin: boolean
  login: (data: LoginInput) => Promise<void>
  signup: (data: SignupInput) => Promise<{ message: string; otp?: string | null }>
  logout: () => Promise<void>
  refreshMe: () => Promise<User | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [csrf, setCsrf] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const applyAuth = useCallback((u: User | null, token: string | null) => {
    setUser(u)
    setCsrf(token)
    setCsrfToken(token)
  }, [])

  const refreshMe = useCallback(async () => {
    try {
      const data = await authApi.me()
      applyAuth(data.user, data.csrf_token)
      return data.user
    } catch {
      applyAuth(null, null)
      return null
    }
  }, [applyAuth])

  useEffect(() => {
    refreshMe().finally(() => setIsLoading(false))
  }, [refreshMe])

  const login = useCallback(
    async (data: LoginInput) => {
      const res = await authApi.login(data)
      applyAuth(res.user, res.csrf_token)
    },
    [applyAuth],
  )

  const signup = useCallback(async (data: SignupInput) => {
    return authApi.signup(data)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // clear local state even if server fails
    }
    applyAuth(null, null)
  }, [applyAuth])

  const value = useMemo(
    () => ({
      user,
      csrf,
      isLoading,
      isAdmin: user?.roles.includes('ADMIN') ?? false,
      login,
      signup,
      logout,
      refreshMe,
    }),
    [user, csrf, isLoading, login, signup, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { getErrorMessage }
