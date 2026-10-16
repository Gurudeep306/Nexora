import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import { LogoMark } from '@/components/brand/Logo'
import { useAuth } from '@/context/AuthContext'
import './brand.css'

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
 * site is private. Quiet on purpose: the mark playing, one line, a way in
 * for the owner. (The server renders the same screen for direct page loads.)
 */
export function ComingSoon({ message }: { message?: string }) {
  const { user, logout } = useAuth()
  return (
    <Stage>
      <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: EASE }} className="relative">
          <span aria-hidden="true" className="absolute inset-[-28px] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--nx-b2)_28%,transparent),transparent_70%)] blur-xl" />
          <LogoMark size={88} interactive className="relative" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
          className="nx-display mt-10 text-[40px] leading-[1.02] font-semibold text-text-primary sm:text-[56px]"
        >
          <span className="nx-grad-text">NexoraGuru</span>
          <br />
          is coming soon
        </motion.h1>
        {message && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease: EASE }}
            className="mt-5 max-w-sm text-[15px] leading-relaxed text-text-secondary"
          >
            {message}
          </motion.p>
        )}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.7 }} className="mt-12 flex items-center gap-3 text-[13px] text-text-muted">
          {user ? (
            <>
              <span>
                Signed in as <span className="font-medium text-text-secondary">@{user.username}</span>
              </span>
              <span aria-hidden="true" className="size-1 rounded-full bg-[color:var(--nx-hair-strong)]" />
              <button type="button" onClick={() => void logout()} className="cursor-pointer font-medium text-text-secondary transition-colors hover:text-text-primary">
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth?owner=1"
              className="group inline-flex h-9 items-center gap-2 rounded-full px-4 font-medium text-text-secondary shadow-[inset_0_0_0_1px_var(--nx-hair-strong)] backdrop-blur-md transition-[color,box-shadow] hover:text-text-primary hover:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--nx-b1)_45%,transparent)]"
            >
              Owner sign in
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          )}
        </motion.div>
      </div>
    </Stage>
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
