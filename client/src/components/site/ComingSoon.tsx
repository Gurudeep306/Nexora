import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { LogoMark } from '@/components/brand/Logo'
import { useAuth } from '@/context/AuthContext'

/**
 * What everyone but the owner, admins and early-access users sees while the
 * site is private. Deliberately quiet: the mark, one line, a way in for the
 * owner. (The server renders the same screen for direct page loads.)
 */
export function ComingSoon({ message }: { message?: string }) {
  const { user, logout } = useAuth()
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg-app px-4 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-accent-brand)_55%,transparent),transparent_65%)] opacity-20 blur-[100px]"
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex max-w-md flex-col items-center text-center"
      >
        <LogoMark size={76} interactive />
        <h1 className="mt-8 font-display text-[28px] leading-tight font-semibold tracking-tight text-text-primary md:text-[34px]">
          NexoraGuru is coming soon
        </h1>
        {message && <p className="mt-3 text-[15px] text-text-secondary">{message}</p>}
        <div className="mt-10 flex items-center gap-4 text-[13px] text-text-muted">
          {user ? (
            <>
              <span>
                Signed in as <span className="text-text-secondary">@{user.username}</span>
              </span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => void logout()}
                className="cursor-pointer border-b border-border pb-0.5 transition-colors hover:text-text-primary"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth?owner=1"
              className="border-b border-border pb-0.5 transition-colors hover:text-text-primary"
            >
              Owner sign in
            </Link>
          )}
        </div>
      </motion.div>
    </main>
  )
}

/** Shown when the signed-in session belonged to a banned / suspended account. */
export function BannedScreen({ ban, onDismiss }: { ban: { kind: string; reason: string; until: string | null }; onDismiss: () => void }) {
  const until = ban.until ? new Date(ban.until) : null
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-app px-4 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <LogoMark size={56} />
        <h1 className="mt-7 font-display text-2xl font-semibold tracking-tight text-text-primary">
          {until ? 'Your account is suspended' : 'Your account has been banned'}
        </h1>
        {until && (
          <p className="mt-2 text-sm text-text-secondary">
            Until {until.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
        {ban.reason && <p className="mt-4 rounded-xl border border-border bg-bg-surface-2 px-4 py-3 text-sm text-text-secondary">{ban.reason}</p>}
        <button
          type="button"
          onClick={onDismiss}
          className="mt-8 cursor-pointer border-b border-border pb-0.5 text-[13px] text-text-muted transition-colors hover:text-text-primary"
        >
          Back to sign in
        </button>
      </div>
    </main>
  )
}
