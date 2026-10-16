import { lazy, Suspense, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSite } from '@/context/SiteContext'
import { useAuth } from '@/context/AuthContext'

// Only visitors who are kept out ever download these screens.
const ComingSoon = lazy(() => import('./ComingSoon').then((m) => ({ default: m.ComingSoon })))
const BannedScreen = lazy(() => import('./ComingSoon').then((m) => ({ default: m.BannedScreen })))

const Blank = () => <div className="min-h-dvh bg-bg-app" aria-busy="true" />

/**
 * Wraps every route. While the site is private, visitors who aren't let in
 * see the coming-soon screen everywhere except the sign-in page; a banned
 * account sees why it was signed out. The server enforces both — this only
 * decides what to draw.
 */
export function SiteGate({ children }: { children: ReactNode }) {
  const { status, loading, blocked, ban, clearBan } = useSite()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  // Status from before a sign-in / sign-out is about to be replaced.
  const stale = !!status && (status.me?.username ?? null) !== (user?.username ?? null)

  if (ban) {
    return (
      <Suspense fallback={<Blank />}>
        <BannedScreen
          ban={ban}
          onDismiss={() => {
            clearBan()
            navigate('/auth', { replace: true })
          }}
        />
      </Suspense>
    )
  }
  // First load: don't flash the app before we know whether it's private.
  if ((loading && !status) || (blocked && stale)) return <Blank />
  if (blocked && pathname !== '/auth') {
    return (
      <Suspense fallback={<Blank />}>
        <ComingSoon message={status?.privateMessage} />
      </Suspense>
    )
  }
  return <>{children}</>
}
