import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { sanitizeLook, useTheme, type Appearance } from '@/context/ThemeContext'

const KEY = 'ui_look'

/**
 * Keeps the look on the account, not just in this browser.
 *
 * On sign-in it loads the saved look (per user — /api/settings is scoped to
 * the session) and applies it; after that, any change is written back,
 * debounced so dragging through wallpapers does not spam the server. If the
 * account has no saved look yet, whatever this browser shows becomes it.
 * Renders nothing.
 */
export function LookSync() {
  const { user } = useAuth()
  const { look, appearance, applyLook, setAppearance } = useTheme()
  const username = user?.username ?? null
  // What the server holds for this user: undefined = not loaded yet.
  const [server, setServer] = useState<{ user: string; value: string } | undefined>()

  useEffect(() => {
    if (!username) return
    let cancelled = false
    api
      .get<{ settings?: Record<string, string> }>('/api/settings')
      .then((r) => {
        if (cancelled) return
        const raw = r.settings?.[KEY]
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Record<string, unknown>
            const next = sanitizeLook(parsed)
            const a = parsed.appearance
            const nextAppearance: Appearance = a === 'light' || a === 'dark' || a === 'system' ? a : 'system'
            applyLook(next)
            setAppearance(nextAppearance)
            setServer({ user: username, value: JSON.stringify({ ...next, appearance: nextAppearance }) })
            return
          } catch {
            /* unreadable — treat as absent and overwrite it below */
          }
        }
        setServer({ user: username, value: '' })
      })
      .catch(() => {
        /* offline or signed out mid-flight; the local look still applies */
      })
    return () => {
      cancelled = true
    }
    // applyLook/setAppearance are stable callbacks; load once per user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username])

  useEffect(() => {
    if (!username || server?.user !== username) return
    const value = JSON.stringify({ ...look, appearance })
    if (value === server.value) return
    const t = window.setTimeout(() => {
      api
        .post('/api/settings', { [KEY]: value })
        .then(() => setServer({ user: username, value }))
        .catch(() => {})
    }, 700)
    return () => window.clearTimeout(t)
  }, [look, appearance, username, server])

  return null
}
