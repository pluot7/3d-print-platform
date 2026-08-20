import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import * as authApi from '../api/auth'

export type UserRole = 'guest' | 'user' | 'admin' | 'super_admin'

export interface User {
  id: number
  username: string
  email?: string
  phone?: string
  role: UserRole
  avatar?: string
  fullName?: string
  balance: number
  nova_coins: number
  created_at: string
  is_active?: boolean
  is_verified?: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  login: (phone: string, password: string) => Promise<boolean>
  register: (phone: string, password: string, code: string) => Promise<boolean>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = '3dprint_token'
const USER_KEY = '3dprint_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 初始化：从 localStorage 恢复
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const savedUser = localStorage.getItem(USER_KEY)
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
    }
    setLoading(false)
  }, [])

  // 通用保存
  const saveAuth = (token: string, userData: any) => {
    localStorage.setItem(TOKEN_KEY, token)

    const info: User = {
      id: userData.id,
      username: userData.username,
      email: userData.email || undefined,
      phone: userData.phone || undefined,
      role: (userData.role || 'user').toLowerCase() as UserRole,
      fullName: userData.full_name || undefined,
      avatar: userData.avatar_url ? `/${userData.avatar_url}` : undefined,
      balance: userData.balance || 0,
      nova_coins: userData.nova_coins || 0,
      created_at: userData.created_at || '',
      is_active: userData.is_active,
      is_verified: userData.is_verified,
    }
    setUser(info)
    localStorage.setItem(USER_KEY, JSON.stringify(info))
    return info
  }

  const login = async (phone: string, password: string): Promise<boolean> => {
    try {
      const response = await authApi.login({ phone, password })
      saveAuth(response.access_token, response.user)
      return true
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  const register = async (phone: string, password: string, code: string): Promise<boolean> => {
    try {
      const response = await authApi.register({ phone, password, code })
      saveAuth(response.access_token, response.user)
      return true
    } catch (error) {
      console.error('Register failed:', error)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isSuperAdmin = user?.role === 'super_admin'

  // 从后端刷新当前用户
  const refreshUser = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) return
      const userData = await authApi.getCurrentUser()
      saveAuth(token, userData)
    } catch (err) {
      console.error('refreshUser failed:', err)
    }
  }

  if (loading) return null

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isAdmin, isSuperAdmin, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
