import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export interface SessionUser {
  username: string
  display_name?: string | null
  avatar?: string | null
  avatar_url?: string | null
  email?: string | null
  role?: string
  auth_provider?: string
}

interface AuthStatusResponse {
  ok: boolean
  authenticated: boolean
  user?: SessionUser
}

/**
 * The server session is the source of truth for "who am I"
 * (`GET /api/auth/status`). Falls back to the AuthContext user when
 * the session probe is unavailable.
 */
export function useSessionUser(): {
  user: SessionUser | null
  username: string | null
  loading: boolean
} {
  const { user: authUser, loading: authLoading } = useAuth()
  const [session, setSession] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api
      .get<AuthStatusResponse>('/api/auth/status')
      .then((res) => {
        if (mounted && res.ok && res.authenticated && res.user) setSession(res.user)
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [authUser?.username])

  const user: SessionUser | null =
    session ?? (authUser?.username ? { username: authUser.username, role: authUser.role } : null)

  return { user, username: user?.username ?? null, loading: loading && authLoading }
}
