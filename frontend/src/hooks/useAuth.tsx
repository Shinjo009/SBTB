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
import { clearTokens, getAccessToken, getErrorMessage } from '@/services/api/client'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAdmin: boolean
  isStaff: boolean
  signup: (data: {
    full_name: string
    email: string
    password: string
    confirm_password: string
    phone?: string
  }) => Promise<User>
  login: (data: { email: string; password: string }) => Promise<User>
  logout: () => Promise<void>
  refreshMe: () => Promise<User | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null)
      return null
    }
    try {
      const data = await authApi.me()
      setUser(data.user)
      return data.user
    } catch {
      clearTokens()
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    refreshMe().finally(() => setIsLoading(false))
  }, [refreshMe])

  const signup = useCallback(async (data: {
    full_name: string
    email: string
    password: string
    confirm_password: string
    phone?: string
  }) => {
    const res = await authApi.signup(data)
    setUser(res.user)
    return res.user
  }, [])

  const login = useCallback(async (data: { email: string; password: string }) => {
    const res = await authApi.login(data)
    setUser(res.user)
    return res.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      clearTokens()
    }
    setUser(null)
  }, [])

  const isAdmin = Boolean(user?.roles.includes('ADMIN'))
  const isStaff = Boolean(user?.roles.some((r) => r === 'ADMIN' || r === 'MANAGER'))

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAdmin,
      isStaff,
      signup,
      login,
      logout,
      refreshMe,
    }),
    [user, isLoading, isAdmin, isStaff, signup, login, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { getErrorMessage }
