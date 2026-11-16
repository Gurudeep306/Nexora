import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import { LogoMark } from '@/components/brand/Logo'
import { useAuth } from '@/context/AuthContext'
import './brand.css'
import './coming-soon.css'
import '@fontsource-variable/newsreader/opsz.css'

const EASE = [0.16, 1, 0.3, 1] as const

function Stage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  return (
    <main
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current
        if (!el || e.pointerType !== 'mouse') return
        const r = el.getBoundingClientRect()
        el.style.setProperty('--px', `${e.clientX - r.left}px`)
        el.style.setProperty('--py', `${e.clientY - r.top}px`)
      }}
      className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-bg-app px-4 py-16"
    >
      <div className="nx-atmos" aria-hidden="true">
        <div className="nx-dots" />
        <div className="nx-pointer" />
      </div>
      {children}
    </main>
  )
}

/**
 * What everyone but the owner, admins and early-access users sees while the
 * site is private: nothing but the NG mark writing itself, in the chosen
 * theme. The mark is also the way in: it opens the owner sign-in (or signs a
 * signed-in visitor out). No visible words. (The server draws the same screen
 * for direct page loads: src/authz/coming-soon.js.)
 */
export function ComingSoon({ message }: { message?: string }) {
  const { user, logout } = useAuth()
  const mark = <LogoMark size={128} loop />
  return (
    <main className="cs cs-only-mark" aria-label={message ? `NexoraGuru is coming soon. ${message}` : 'NexoraGuru is coming soon'}>
      <h1 className="sr-only">NexoraGuru · Coming soon</h1>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: EASE }}>
        {user ? (
          <button type="button" onClick={() => void logout()} className="cs-mark-link" aria-label={`Signed in as @${user.username}. Sign out`}>
            {mark}
          </button>
        ) : (
          <Link to="/auth?owner=1" className="cs-mark-link" aria-label="Owner sign in">
            {mark}
          </Link>
        )}
      </motion.div>
    </main>
  )
}

/** Shown when the signed-in session belonged to a banned / suspended account. */
export function BannedScreen({ ban, onDismiss }: { ban: { kind: string; reason: string; until: string | null }; onDismiss: () => void }) {
  const until = ban.until ? new Date(ban.until) : null
  return (
    <Stage>
      <div className="nx-panel relative z-10 flex w-full max-w-md flex-col items-center !rounded-3xl px-8 py-10 text-center">
        <LogoMark size={52} />
        <h1 className="nx-display mt-6 text-[28px] leading-tight font-semibold text-text-primary">
          {until ? 'Your account is suspended' : 'Your account has been banned'}
        </h1>
        {until && (
          <p className="mt-2 text-sm text-text-secondary">
            Until {until.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
        {ban.reason && (
          <p className="mt-5 w-full rounded-xl bg-bg-surface-2 px-4 py-3 text-left text-sm text-text-secondary shadow-[inset_0_0_0_1px_var(--nx-hair)]">
            <span className="mb-0.5 block text-[11px] font-semibold tracking-wider text-text-muted uppercase">Reason</span>
            {ban.reason}
          </p>
        )}
        <button type="button" onClick={onDismiss} className="nx-btn mt-8">
          Back to sign in
        </button>
      </div>
    </Stage>
  )
}

export default ComingSoon
