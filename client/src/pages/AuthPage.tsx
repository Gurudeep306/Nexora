import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import { AlertTriangle, ArrowRight, AtSign, Check, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck, X } from 'lucide-react'
import { Avatar, useToast } from '@/components/ui'
import { AuthShowcase, Decrypt } from '@/components/auth/AuthShowcase'
import '@/components/auth/auth.css'
import { AlgoTheater } from '@/components/showcase/AlgoTheater'
import { LogoMark, Wordmark } from '@/components/brand/Logo'
import { takeOAuthResult, useAuth } from '@/context/AuthContext'
import { api, apiUrl, ApiError } from '@/lib/api'
import { avatarName, defaultAvatarId, resolveAvatarId } from '@/lib/avatar'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'
type Provider = 'github' | 'google'

const EASE = [0.16, 1, 0.3, 1] as const
const SPRING = { type: 'spring', stiffness: 520, damping: 40, mass: 0.9 } as const
const LAST_KEY = 'nexora:last-auth'

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.12 7.12 0 0 1 0-4.58V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  )
}

const readLast = (): string | null => {
  try {
    return localStorage.getItem(LAST_KEY)
  } catch {
    return null
  }
}
const writeLast = (v: string) => {
  try {
    localStorage.setItem(LAST_KEY, v)
  } catch {
    /* private mode: nothing to remember */
  }
}

/* ── password strength, drawn as an array filling up ─────────────── */
const RULES = [
  { hint: 'use 8+ characters', test: (p: string) => p.length >= 8 },
  { hint: 'mix upper & lower case', test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { hint: 'add a number', test: (p: string) => /\d/.test(p) },
  { hint: 'add a symbol', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]
const STRENGTH = [
  { label: 'Too short', tone: 'var(--color-destructive)' },
  { label: 'Weak', tone: 'var(--color-destructive)' },
  { label: 'Okay', tone: 'var(--color-warning)' },
  { label: 'Strong', tone: 'var(--color-success)' },
  { label: 'Excellent', tone: 'var(--brand-3)' },
]
const CELLS = 12

function PasswordArray({ password }: { password: string }) {
  const passed = RULES.filter((r) => r.test(password)).length
  const score = password.length < 6 ? 0 : passed
  const s = STRENGTH[score]
  const next = password.length < 6 ? { hint: '6+ characters' } : RULES.find((r) => !r.test(password))
  const filled = Math.min(CELLS, password.length)
  return (
    <div className="mt-2.5" aria-live="polite">
      <div className="flex items-end gap-[3px]" aria-hidden="true">
        {Array.from({ length: CELLS }, (_, i) => (
          <span key={i} className="relative h-2 flex-1 overflow-hidden rounded-[3px] bg-hairline/[0.08]">
            <motion.span
              className="absolute inset-0 rounded-[3px]"
              style={{ background: s.tone }}
              initial={false}
              animate={{ opacity: i < filled ? 1 : 0, scaleY: i < filled ? 1 : 0.3 }}
              transition={{ duration: 0.28, ease: EASE, delay: i < filled ? 0 : 0.02 * (CELLS - i) }}
            />
          </span>
        ))}
      </div>
      <p className="mt-1.5 flex justify-between text-[11.5px]">
        <span className="font-semibold" style={{ color: password ? s.tone : undefined }}>
          {password ? s.label : <span className="text-foreground-faint">At least 6 characters</span>}
        </span>
        {password && next && score < 4 && <span className="text-foreground-faint">{next.hint}</span>}
      </p>
    </div>
  )
}

/* ── field shell with leading icon ─────────────────────────────── */
function FieldShell({
  id,
  label,
  aside,
  icon: Icon,
  trailing,
  hint,
  children,
}: {
  id: string
  label: string
  aside?: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  trailing?: React.ReactNode
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-foreground-dim">
          {label}
        </label>
        {aside}
      </div>
      <div className="group relative">
        <Icon className="auth-field-icon pointer-events-none absolute top-1/2 left-4 size-[17px] -translate-y-1/2 text-foreground-faint" />
        {children}
        {trailing && <div className="absolute top-1/2 right-2 -translate-y-1/2">{trailing}</div>}
      </div>
      {hint}
    </div>
  )
}

function Reveal({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.32, ease: EASE }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SecurityTip() {
  return (
    <span className="group/tip relative flex">
      <button
        type="button"
        aria-label="Passwords are salted and hashed with scrypt. We never see them."
        className="flex size-6 cursor-help items-center justify-center rounded-md text-foreground-faint transition-colors hover:text-success focus-visible:text-success focus-visible:outline-none"
      >
        <ShieldCheck className="size-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 bottom-full z-20 mb-1.5 w-max max-w-[15rem] translate-y-1 rounded-lg border border-border bg-surface-3 px-2.5 py-1.5 text-[11.5px] text-foreground-dim opacity-0 shadow-lg transition-all duration-200 group-hover/tip:translate-y-0 group-hover/tip:opacity-100 group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100"
      >
        Salted & hashed with scrypt. We never see it.
      </span>
    </span>
  )
}

/** The primary action: brand gradient, sheen, and a gentle pull towards the pointer. */
function MagneticCta({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 300, damping: 22 })
  const sy = useSpring(y, { stiffness: 300, damping: 22 })
  return (
    <motion.div
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== 'mouse') return
        const r = e.currentTarget.getBoundingClientRect()
        x.set(((e.clientX - r.left) / r.width - 0.5) * 6)
        y.set(((e.clientY - r.top) / r.height - 0.5) * 4)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      <button {...props} className="auth-cta group inline-flex items-center justify-center gap-2">
        {children}
      </button>
    </motion.div>
  )
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login',
  )
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pwTouched, setPwTouched] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  // While the success moment plays, the signed-in user must not bounce us away early.
  const [holding, setHolding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [providers, setProviders] = useState<{ github?: boolean; google?: boolean } | null>(null)
  const [checked, setChecked] = useState<{ name: string; available: boolean } | null>(null)
  const [focused, setFocused] = useState(false)
  const [nudge, setNudge] = useState(0)
  const [lastUsed] = useState(readLast)
  const { login, register, user, oauthPending } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const reduce = useReducedMotion()
  const userRef = useRef<HTMLInputElement>(null)
  const stageRef = useRef<HTMLElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Returning from GitHub/Google (see AuthContext): show the error, or finish sign-up.
  useEffect(() => {
    const result = takeOAuthResult()
    if (result?.error) setError(`Sign-in failed: ${result.error.replace(/_/g, ' ')}`)
  }, [])

  useEffect(() => {
    if (oauthPending) {
      setMode('register')
      setUsername((u) => u || oauthPending.suggestedUsername)
      setEmail((e) => e || oauthPending.email)
    }
  }, [oauthPending])

  useEffect(() => {
    api
      .get<{ github?: boolean; google?: boolean }>('/api/auth/providers')
      .then(setProviders)
      .catch(() => setProviders({}))
  }, [])

  useEffect(() => {
    userRef.current?.focus()
  }, [mode])

  // Live username availability while creating an account.
  const trimmed = username.trim()
  const validName = /^[a-zA-Z0-9_]{2,20}$/.test(trimmed)
  const availability: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' =
    mode !== 'register' || !trimmed
      ? 'idle'
      : !validName
        ? 'invalid'
        : checked?.name === trimmed
          ? checked.available
            ? 'available'
            : 'taken'
          : 'checking'
  useEffect(() => {
    if (mode !== 'register' || !validName) return
    let live = true
    const t = setTimeout(() => {
      api
        .get<{ available: boolean }>('/api/user/check-username', { query: { username: trimmed } })
        .then((r) => live && setChecked({ name: trimmed, available: r.available }))
        .catch(() => live && setChecked({ name: trimmed, available: true }))
    }, 350)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [trimmed, validName, mode])

  const destination = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from
  const from =
    destination?.pathname && destination.pathname !== '/auth' ? destination.pathname + (destination.search ?? '') : '/hub'

  const needsPassword = !(mode === 'register' && oauthPending)
  const canSubmit = useMemo(() => {
    if (!username.trim()) return false
    if (mode === 'register' && (availability === 'taken' || availability === 'invalid')) return false
    if (needsPassword && password.length < (mode === 'register' ? 6 : 1)) return false
    return true
  }, [username, password, mode, availability, needsPassword])

  if (user && !holding && !success) return <Navigate to={from} replace />

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setPwTouched(false)
  }

  const fail = (msg: string) => {
    setError(msg)
    setShake((n) => n + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || success) return
    // The button is never greyed out; an incomplete form shakes and says what's missing.
    if (!canSubmit) {
      if (!username.trim()) fail('Enter your username.')
      else if (mode === 'register' && availability === 'taken') fail('That username is taken. Try another.')
      else if (mode === 'register' && availability === 'invalid') fail('Usernames are 2–20 letters, numbers or underscores.')
      else fail(mode === 'register' ? 'Use a password of at least 6 characters.' : 'Enter your password.')
      return
    }
    setError(null)
    setSubmitting(true)
    setHolding(true)
    try {
      if (mode === 'login') {
        await login(username.trim(), password)
        toast.success('Welcome back', 'Picking up right where you left off.')
      } else {
        const u = await register(username.trim(), email.trim(), password)
        const you = avatarName(resolveAvatarId(u?.avatar, u?.username ?? username.trim()))
        toast.success('Welcome to NexoraGuru', `Your account is ready and ${you} is your avatar. Pick another any time in Settings.`)
      }
      if (!oauthPending) writeLast('password')
      setSuccess(true)
      window.setTimeout(() => navigate(from, { replace: true }), reduce ? 0 : 1100)
    } catch (err) {
      setHolding(false)
      fail(err instanceof ApiError ? err.message : 'Something went wrong — try again')
    } finally {
      setSubmitting(false)
    }
  }

  const oauth = (p: Provider) => {
    writeLast(p)
    window.location.assign(apiUrl(`/auth/${p}`))
  }

  // Pointer light on the stage and spotlight on the card border (CSS vars, no re-render).
  const onStagePointer = (e: React.PointerEvent<HTMLElement>) => {
    const stage = stageRef.current
    const card = cardRef.current
    if (!stage || e.pointerType !== 'mouse') return
    const s = stage.getBoundingClientRect()
    stage.style.setProperty('--px', `${e.clientX - s.left}px`)
    stage.style.setProperty('--py', `${e.clientY - s.top}px`)
    if (card) {
      const c = card.getBoundingClientRect()
      card.style.setProperty('--cx', `${e.clientX - c.left}px`)
      card.style.setProperty('--cy', `${e.clientY - c.top}px`)
    }
  }

  const typed = () => setNudge((n) => n + 1)

  const title = oauthPending ? 'Claim your handle' : mode === 'login' ? 'Welcome back' : 'Create your account'
  const subtitle = oauthPending
    ? `Connected with ${oauthPending.provider === 'google' ? 'Google' : 'GitHub'} — pick a username to finish.`
    : mode === 'login'
      ? 'Pick up right where you left off.'
      : 'Free forever. Takes ten seconds.'
  const previewName = username.trim() || 'nexora'
  const pwTooShort = mode === 'register' && needsPassword && pwTouched && password.length > 0 && password.length < 6
  const hasOAuth = !oauthPending && providers && (providers.github || providers.google)

  return (
    <MotionConfig reducedMotion="user">
      <div className="auth-root relative grid min-h-dvh lg:grid-cols-[1.08fr_1fr]">
        {/* Showcase (desktop) */}
        <aside
          className="relative z-10 hidden min-w-0 border-r border-hairline/[0.06] bg-hairline/[0.012] lg:block"
          aria-label="About NexoraGuru"
        >
          <div className="sticky top-0 h-dvh">
            <AuthShowcase driven={focused} nudge={nudge} />
          </div>
        </aside>

        {/* Form */}
        <main
          ref={stageRef}
          onPointerMove={onStagePointer}
          className="auth-stage relative z-10 flex min-w-0 flex-col items-center justify-center gap-8 overflow-hidden px-4 py-8 sm:px-10 sm:py-12"
        >
          <div aria-hidden="true" className="auth-ambient">
            <span className="dots" />
            <span className="pointer" />
            <span className="auth-grain" />
          </div>

          {/* Phones and tablets: compact brand + headline above the card */}
          <motion.header
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="w-full max-w-[27rem] lg:hidden"
          >
            <div className="flex items-center gap-2.5">
              <LogoMark size={32} />
              <Wordmark className="text-[17px]" />
            </div>
            <h1 className="auth-headline mt-6 text-[2.1rem] font-semibold text-foreground sm:text-[2.6rem]">
              Computer science, <Decrypt text="watched step by step." delay={250} className="auth-brand-text pb-0.5" />
            </h1>
          </motion.header>

          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 22, scale: 0.98, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
            className="auth-card w-full max-w-[27rem] p-6 sm:p-9"
          >
            {/* Success: the logo runs its traversal, then we go. */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="auth-success absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 rounded-[inherit]"
                  role="status"
                >
                  <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.6, ease: EASE }}>
                    <LogoMark size={72} interactive intro />
                  </motion.span>
                  <span className="text-sm font-medium text-foreground-dim">
                    {mode === 'login' ? 'Signed in' : 'Account ready'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex min-h-[64px] items-start justify-between gap-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: EASE }}
                >
                  <h2 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.03em] text-foreground">
                    {title}
                  </h2>
                  <p className="mt-1.5 text-[14px] text-foreground-dim">{subtitle}</p>
                </motion.div>
              </AnimatePresence>
              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6, rotate: -15 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    className="shrink-0"
                    title={`Your avatar: ${avatarName(defaultAvatarId(previewName))}`}
                  >
                    <Avatar seed={previewName} name={previewName} size="lg" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!oauthPending && (
              <div
                role="tablist"
                aria-label="Sign in or create account"
                className="auth-seg relative mt-7 grid grid-cols-2 rounded-[14px] p-1"
              >
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    type="button"
                    aria-selected={mode === m}
                    onClick={() => switchMode(m)}
                    className={cn(
                      'relative z-10 h-10 cursor-pointer rounded-[10px] text-[14px] font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--brand-1)] focus-visible:outline-none',
                      mode === m ? 'text-foreground' : 'text-foreground-faint hover:text-foreground-dim',
                    )}
                  >
                    {mode === m && (
                      <motion.span layoutId="auth-tab" className="auth-seg-pill absolute inset-0 -z-10 rounded-[10px]" transition={SPRING} />
                    )}
                    {m === 'login' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>
            )}

            {hasOAuth && (
              <>
                <div className={cn('mt-6 grid gap-3', providers?.github && providers?.google ? 'grid-cols-2' : 'grid-cols-1')}>
                  {(['github', 'google'] as const)
                    .filter((p) => providers?.[p])
                    .map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => oauth(p)}
                        className="relative flex h-12 cursor-pointer items-center justify-center gap-2.5 rounded-[14px] border border-hairline/[0.1] bg-hairline/[0.03] text-[14px] font-medium text-foreground transition-[background-color,border-color,transform] duration-200 hover:border-hairline/[0.18] hover:bg-hairline/[0.06] active:scale-[0.98]"
                      >
                        {p === 'github' ? <GitHubIcon /> : <GoogleIcon />}
                        {p === 'github' ? 'GitHub' : 'Google'}
                        {lastUsed === p && (
                          <span className="absolute -top-2 right-2.5 rounded-full border border-hairline/[0.1] bg-surface-3 px-1.5 py-px text-[9.5px] font-semibold text-foreground-dim">
                            Last used
                          </span>
                        )}
                      </button>
                    ))}
                </div>
                <div className="my-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent to-hairline/[0.12]" />
                  <span className="text-[11px] text-foreground-faint">or</span>
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent to-hairline/[0.12]" />
                </div>
              </>
            )}

            <motion.form
              key={shake}
              onSubmit={handleSubmit}
              noValidate
              onFocus={() => setFocused(true)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
              }}
              className={cn('space-y-5', !hasOAuth && 'mt-7')}
              animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : undefined}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <FieldShell
                id="auth-username"
                label="Username"
                icon={AtSign}
                trailing={
                  mode === 'register' && availability !== 'idle' ? (
                    <span className="flex size-8 items-center justify-center" aria-hidden="true">
                      {availability === 'checking' && <Loader2 className="size-4 animate-spin text-foreground-faint" />}
                      {availability === 'available' && <Check className="size-4 text-success" />}
                      {(availability === 'taken' || availability === 'invalid') && <X className="size-4 text-destructive" />}
                    </span>
                  ) : undefined
                }
                hint={
                  <Reveal show={mode === 'register' && availability !== 'idle' && availability !== 'checking'}>
                    <p
                      className={cn('pt-1.5 text-xs', availability === 'available' ? 'text-success' : 'text-destructive')}
                      aria-live="polite"
                    >
                      {availability === 'available' && `@${username.trim()} is yours`}
                      {availability === 'taken' && 'That username is already taken'}
                      {availability === 'invalid' && '2–20 letters, numbers or underscores'}
                    </p>
                  </Reveal>
                }
              >
                <input
                  ref={userRef}
                  id="auth-username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.replace(/\s/g, ''))
                    typed()
                  }}
                  placeholder="your_handle"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={20}
                  aria-invalid={mode === 'register' && (availability === 'taken' || availability === 'invalid')}
                  className="auth-input"
                  required
                />
              </FieldShell>

              <Reveal show={mode === 'register'}>
                <FieldShell id="auth-email" label="Email" aside={<span className="text-[11.5px] text-foreground-faint">Optional</span>} icon={Mail}>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      typed()
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="auth-input"
                  />
                </FieldShell>
              </Reveal>

              {needsPassword && (
                <FieldShell
                  id="auth-password"
                  label="Password"
                  aside={<SecurityTip />}
                  icon={KeyRound}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      aria-pressed={showPw}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-[10px] text-foreground-faint transition-colors hover:bg-hairline/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--brand-1)] focus-visible:outline-none"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={String(showPw)}
                          initial={{ opacity: 0, scale: 0.7, rotate: -20 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.7, rotate: 20 }}
                          transition={{ duration: 0.16, ease: EASE }}
                        >
                          {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </motion.span>
                      </AnimatePresence>
                    </button>
                  }
                  hint={
                    <>
                      <Reveal show={capsOn}>
                        <p className="flex items-center gap-1.5 pt-1.5 text-xs text-warning" role="status">
                          <AlertTriangle className="size-3.5" aria-hidden="true" /> Caps Lock is on
                        </p>
                      </Reveal>
                      <Reveal show={mode === 'register'}>
                        <PasswordArray password={password} />
                      </Reveal>
                    </>
                  }
                >
                  <input
                    id="auth-password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      typed()
                    }}
                    onBlur={() => setPwTouched(true)}
                    onKeyDown={(e) => setCapsOn(e.getModifierState?.('CapsLock') ?? false)}
                    onKeyUp={(e) => setCapsOn(e.getModifierState?.('CapsLock') ?? false)}
                    placeholder={mode === 'login' ? 'Your password' : 'At least 6 characters'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    aria-invalid={pwTooShort || undefined}
                    className="auth-input"
                    required
                  />
                </FieldShell>
              )}

              <AnimatePresence>
                {error && (
                  <motion.p
                    role="alert"
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <span className="flex items-start gap-2 rounded-[14px] border border-destructive/35 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {error}
                    </span>
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="pt-1">
                <MagneticCta type="submit" disabled={submitting || success} aria-busy={submitting || undefined}>
                  {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {oauthPending ? 'Finish sign-up' : mode === 'login' ? 'Continue learning' : 'Start learning'}
                  {!submitting && (
                    <ArrowRight
                      className="size-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  )}
                </MagneticCta>
              </div>
            </motion.form>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={oauthPending ? 'oauth' : mode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="mt-6 text-center text-[13.5px] text-foreground-faint"
              >
                {oauthPending ? (
                  <button
                    onClick={() => void api.post('/api/auth/logout').then(() => window.location.reload())}
                    className="cursor-pointer font-medium text-foreground-dim underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Cancel and use a different account
                  </button>
                ) : mode === 'login' ? (
                  <>
                    New to NexoraGuru?{' '}
                    <button
                      onClick={() => switchMode('register')}
                      className="cursor-pointer font-semibold text-foreground underline-offset-4 hover:underline"
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      onClick={() => switchMode('login')}
                      className="cursor-pointer font-semibold text-foreground underline-offset-4 hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* Tablets get the live lesson under the form; phones keep it short. */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
            className="auth-theater hidden w-full max-w-[27rem] md:block lg:hidden"
            data-driven={focused}
          >
            <AlgoTheater compact driven={focused} nudge={nudge} />
          </motion.div>
        </main>
      </div>
    </MotionConfig>
  )
}
