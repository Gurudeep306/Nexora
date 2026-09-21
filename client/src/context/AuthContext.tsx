import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'

export interface User {
  id?: number
  username: string
  email?: string
  avatar?: string | null
  role?: string
  xp?: number
  level?: number
  nextLevelXp?: number
  title?: string
  streak?: number
  xpInLevel?: number
  [key: string]: unknown
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
  login: (username: string, password: string) => Promise<User>
  register: (username: string, email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/* OAuth callbacks land on "/?auth=github" or "/?auth_error=reason". Capture them
   before the router redirects "/" → "/hub" (which drops the query string). */
export const OAUTH_KEY = 'nexora:oauth'
;(() => {
  try {
    const params = new URLSearchParams(window.location.search)
    const provider = params.get('auth')
    const error = params.get('auth_error')
    if (!provider && !error) return
    sessionStorage.setItem(OAUTH_KEY, JSON.stringify({ provider, error }))
    params.delete('auth')
    params.delete('auth_error')
    const qs = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash)
  } catch {
    /* storage unavailable — non-fatal */
  }
})()

export function takeOAuthResult(): { provider: string | null; error: string | null } | null {
  try {
    const raw = sessionStorage.getItem(OAUTH_KEY)
    if (!raw) return null
    sessionStorage.removeItem(OAUTH_KEY)
    return JSON.parse(raw) as { provider: string | null; error: string | null }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ authenticated?: boolean; user?: User }>('/api/auth/status')
      setUser(res.authenticated && res.user ? res.user : null)
      setRevision((value) => value + 1)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ user?: User } & User>('/api/user/login', { username, password })
    const u = (res as { user?: User }).user ?? (res as User)
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await api.post<{ user?: User } & User>('/api/user/register', { username, email, password })
    const u = (res as { user?: User }).user ?? (res as User)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } finally {
      setUser(null)
    }
  }, [])

  const username = user?.username
  useEffect(() => {
    if (!username) return
    let active = true
    api.get<{
      totalXp: number
      level: { level: number; xpInLevel: number; xpForNext: number }
      streak: { current: number }
      title: { current: { title: string } }
    }>('/api/stats', { query: { username } }).then((stats) => {
      if (active) setUser((current) => current?.username === username ? {
        ...current,
        xp: stats.totalXp,
        level: stats.level.level,
        xpInLevel: stats.level.xpInLevel,
        nextLevelXp: stats.level.xpForNext,
        title: stats.title.current.title,
        streak: stats.streak.current,
      } : current)
    }).catch(() => {})
    return () => { active = false }
  }, [username, revision])

  return (
    <AuthContext.Provider value={{ user, loading, refresh, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
