import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { sanitizeDock, setDock, useDock } from './dockStore'

const KEY = 'ui_dock'

/** Keeps the Dock arrangement on the account (per user), like LookSync does
 *  for the look: load on sign-in, then save changes, debounced. */
export function DockSync() {
  const { user } = useAuth()
  const dock = useDock()
  const username = user?.username ?? null
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
            const next = sanitizeDock(JSON.parse(raw))
            setDock(next)
            setServer({ user: username, value: JSON.stringify(next) })
            return
          } catch {
            /* unreadable — overwrite below */
          }
        }
        setServer({ user: username, value: '' })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [username])

  useEffect(() => {
    if (!username || server?.user !== username) return
    const value = JSON.stringify(dock)
    if (value === server.value) return
    const t = window.setTimeout(() => {
      api
        .post('/api/settings', { [KEY]: value })
        .then(() => setServer({ user: username, value }))
        .catch(() => {})
    }, 700)
    return () => window.clearTimeout(t)
  }, [dock, username, server])

  return null
}
