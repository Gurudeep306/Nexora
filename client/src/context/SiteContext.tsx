import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, SITE_ACCESS_EVENT } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from '@/lib/socket'
import { useToast } from '@/components/ui'
import { ALL_ON, featureForPath, type Announcement, type BlockedPart, type FeatureFlag, type SiteStatus } from '@/lib/site'

/**
 * Site-wide state from the owner / admin system (GET /api/site/status):
 * private mode, feature flags, banners, broadcasts, moderator notices, and the
 * signed-in user's role + permissions.
 *
 * The server enforces all of it; this only decides what to render. The owner
 * can "view as member" — the UI then hides staff tools and honours feature
 * flags as a member would see them, without changing who they are.
 */

interface SiteValue {
  status: SiteStatus | null
  loading: boolean
  refresh: () => Promise<void>
  /** The site is private and this visitor isn't let in. */
  blocked: boolean
  isOwner: boolean
  /** Holds any admin-panel permission (false while previewing as a member). */
  isStaff: boolean
  /** Admins and the owner (not previewing): may see and open Hive. Nobody else ever sees it. */
  mayHive: boolean
  can: (perm: string) => boolean
  featureOn: (flag: FeatureFlag | null) => boolean
  /** The Site map part this page belongs to, when this viewer can't use it. */
  blockedPart: (path: string) => BlockedPart | null
  /** May this viewer open this page? (feature flags and the Site map) */
  pathOn: (path: string) => boolean
  previewAsMember: boolean
  setPreviewAsMember: (on: boolean) => void
  dismissed: Set<string>
  dismiss: (key: string) => void
  /** Set when this browser's account turned out to be banned / suspended. */
  ban: SiteStatus['banned']
  clearBan: () => void
}

const SiteContext = createContext<SiteValue | null>(null)

const PREVIEW_KEY = 'nexora:view-as-member'
const DISMISS_KEY = 'nexora:dismissed-announcements'

function readSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]') as string[])
  } catch {
    return new Set()
  }
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const { user, refresh: refreshAuth } = useAuth()
  const socket = useSocket()
  const toast = useToast()
  const [status, setStatus] = useState<SiteStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewAsMember, setPreview] = useState(() => {
    try {
      return sessionStorage.getItem(PREVIEW_KEY) === '1'
    } catch {
      return false
    }
  })
  const [dismissed, setDismissed] = useState<Set<string>>(() => readSet(DISMISS_KEY))
  const [ban, setBan] = useState<SiteStatus['banned']>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await api.get<SiteStatus>('/api/site/status')
      setStatus(next)
      if (next.banned) setBan(next.banned)
    } catch {
      /* offline / server down — keep what we have */
    } finally {
      setLoading(false)
    }
  }, [])

  const username = user?.username ?? null
  useEffect(() => {
    void refresh()
  }, [refresh, username])

  // Any API call answered with site_private / account_banned / feature_disabled.
  const pending = useRef(false)
  useEffect(() => {
    const onAccess = (e: Event) => {
      const detail = (e as CustomEvent<{ code?: string; ban?: SiteStatus['banned'] }>).detail
      if (detail?.code === 'account_banned') {
        if (detail.ban) setBan(detail.ban)
        void refreshAuth()
      }
      if (pending.current) return
      pending.current = true
      setTimeout(() => {
        pending.current = false
        void refresh()
      }, 150)
    }
    window.addEventListener(SITE_ACCESS_EVENT, onAccess)
    return () => window.removeEventListener(SITE_ACCESS_EVENT, onAccess)
  }, [refresh, refreshAuth])

  // Live: settings changed, a broadcast went out, a moderator warned you.
  useEffect(() => {
    if (!socket) return
    const onUpdate = () => void refresh()
    const onBroadcast = (a: Announcement) => {
      toast.info(a.title || 'Announcement', a.body)
      void refresh()
    }
    socket.on('site:update', onUpdate)
    socket.on('site:broadcast', onBroadcast)
    socket.on('site:warning', onUpdate)
    return () => {
      socket.off('site:update', onUpdate)
      socket.off('site:broadcast', onBroadcast)
      socket.off('site:warning', onUpdate)
    }
  }, [socket, refresh, toast])

  const setPreviewAsMember = useCallback((on: boolean) => {
    setPreview(on)
    try {
      if (on) sessionStorage.setItem(PREVIEW_KEY, '1')
      else sessionStorage.removeItem(PREVIEW_KEY)
    } catch {
      /* storage unavailable */
    }
  }, [])

  const dismiss = useCallback((key: string) => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(key)
      try {
        localStorage.setItem(DISMISS_KEY, JSON.stringify([...next].slice(-100)))
      } catch {
        /* storage unavailable */
      }
      return next
    })
  }, [])

  const value = useMemo<SiteValue>(() => {
    const me = status?.me ?? null
    const isOwner = !!me?.isOwner
    const preview = previewAsMember && isOwner
    const perms = new Set(preview ? [] : (me?.permissions ?? []))
    const flags = status?.flags ?? ALL_ON
    // Most specific first: a part inside another (GATE notes in GATE) wins.
    const blocked = (status?.parts ?? [])
      .filter((p) => p.pages)
      .map((p) => ({ part: p, re: new RegExp(p.pages as string, 'i') }))
      .sort((a, b) => b.part.id.split('.').length - a.part.id.split('.').length)
    const blockedFor = (path: string) => blocked.find((b) => b.re.test(path))?.part ?? null
    return {
      status,
      loading,
      refresh,
      blocked: !!status && status.private && !status.allowed,
      isOwner,
      isStaff: !preview && !!me?.isStaff,
      mayHive: !preview && !!me?.mayHive,
      can: (perm) => isOwner && !preview ? true : perms.has(perm),
      // The owner sees every section regardless of flags (unless previewing).
      featureOn: (flag) => !flag || flags[flag] !== false || (isOwner && !preview),
      blockedPart: (path) => blockedFor(path),
      pathOn: (path) => {
        const flag = featureForPath(path)
        return (!flag || flags[flag] !== false || (isOwner && !preview)) && !blockedFor(path)
      },
      previewAsMember: preview,
      setPreviewAsMember,
      dismissed,
      dismiss,
      ban,
      clearBan: () => setBan(null),
    }
  }, [status, loading, refresh, previewAsMember, setPreviewAsMember, dismissed, dismiss, ban])

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite(): SiteValue {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite must be used within SiteProvider')
  return ctx
}
