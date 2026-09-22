import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle,
  ArrowRight,
  AtSign,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { Avatar, Button, useToast } from '@/components/ui'
import { AuthShowcase } from '@/components/auth/AuthShowcase'
import { LogoMark, Wordmark } from '@/components/brand/Logo'
import { takeOAuthResult, useAuth } from '@/context/AuthContext'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'

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

/* ── password strength ─────────────────────────────────────────── */
const RULES = [
  { id: 'len', label: '8+ characters', test: (p: string) => p.length >= 8 },
  { id: 'case', label: 'Upper & lower case', test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: 'num', label: 'A number', test: (p: string) => /\d/.test(p) },
  { id: 'sym', label: 'A symbol', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]
const STRENGTH = [
  { label: 'Too weak', color: 'bg-destructive', text: 'text-destructive' },
  { label: 'Weak', color: 'bg-accent', text: 'text-accent' },
  { label: 'Okay', color: 'bg-warning', text: 'text-warning' },
  { label: 'Strong', color: 'bg-success', text: 'text-success' },
  { label: 'Rift-proof', color: 'bg-cyan', text: 'text-cyan' },
]

function PasswordMeter({ password }: { password: string }) {
  const passed = RULES.filter((r) => r.test(password)).length
  const score = password.length < 6 ? 0 : passed
  const s = STRENGTH[score]
  return (
    <div className="mt-2 space-y-2" aria-live="polite">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <motion.span
              className={cn('block h-full rounded-full', s.color)}
              initial={false}
              animate={{ width: score >= i ? '100%' : '0%' }}
              transition={{ duration: 0.25 }}
            />
          </span>
        ))}
        <span className={cn('ml-1 w-20 text-right text-[11px] font-semibold', s.text)}>{password ? s.label : ''}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {RULES.map((r) => {
          const ok = r.test(password)
          return (
            <li key={r.id} className={cn('flex items-center gap-1.5 text-[11px]', ok ? 'text-success' : 'text-foreground-faint')}>
              {ok ? <Check className="size-3" aria-hidden="true" /> : <span className="size-1 rounded-full bg-foreground-faint" />}
              {r.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ── field shell with leading icon ─────────────────────────────── */
function FieldShell({
  id,
  label,
  icon: Icon,
  trailing,
  hint,
  children,
}: {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  trailing?: React.ReactNode
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
        {label}
      </label>
      <div className="group relative">
        <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground-faint transition-colors group-focus-within:text-primary-bright" />
        {children}
        {trailing && <div className="absolute top-1/2 right-2 -translate-y-1/2">{trailing}</div>}
      </div>
      {hint}
    </div>
  )
}

const inputClass =
  'h-12 w-full rounded-xl border border-border bg-surface-2/60 pr-11 pl-10 text-[15px] text-foreground placeholder:text-foreground-faint transition-[border-color,box-shadow] focus:border-primary focus:ring-4 focus:ring-primary/20 focus:outline-none aria-[invalid=true]:border-destructive'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login',
  )
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [providers, setProviders] = useState<{ github?: boolean; google?: boolean } | null>(null)
  const [checked, setChecked] = useState<{ name: string; available: boolean } | null>(null)
  const { login, register, user, oauthPending } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const userRef = useRef<HTMLInputElement>(null)

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

  if (user) return <Navigate to={from} replace />

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
  }

  const fail = (msg: string) => {
    setError(msg)
    setShake((n) => n + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(username.trim(), password)
        toast.success('Welcome back, challenger')
      } else {
        await register(username.trim(), email.trim(), password)
        toast.success('Account forged — enter the Rift', 'Your unique avatar is ready. Change it any time in Settings.')
      }
      navigate(from, { replace: true })
    } catch (err) {
      fail(err instanceof ApiError ? err.message : 'Something went wrong — try again')
    } finally {
      setSubmitting(false)
    }
  }

  const title = oauthPending ? 'Claim your handle' : mode === 'login' ? 'Welcome back' : 'Create your account'
  const subtitle = oauthPending
    ? `Connected with ${oauthPending.provider === 'google' ? 'Google' : 'GitHub'}${oauthPending.displayName ? ` as ${oauthPending.displayName}` : ''} — pick your Nexora username to finish.`
    : mode === 'login'
      ? 'Sign in to pick up your streak where you left it.'
      : 'Free forever. Your progress, XP and rank are yours alone.'
  const previewName = username.trim() || 'nexora'

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.1fr_1fr]">
      {/* Showcase (desktop) */}
      <aside className="relative hidden border-r border-white/[0.06] lg:block" aria-label="About Nexora">
        <div className="sticky top-0 h-dvh">
          <AuthShowcase />
        </div>
      </aside>

      {/* Form */}
      <main className="relative flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="pointer-events-none absolute inset-0 lg:hidden" aria-hidden="true">
          <div className="grid-bg absolute inset-0 opacity-50" />
          <div className="absolute -top-24 left-1/2 size-80 -translate-x-1/2 rounded-full bg-primary/25 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative w-full max-w-[26rem]"
        >
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <LogoMark size={36} />
            <Wordmark className="text-lg" />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-heading-fade font-display text-[30px] font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm text-foreground-dim">{subtitle}</p>
            </div>
            <AnimatePresence>
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6, rotate: -15 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                  className="flex shrink-0 flex-col items-center gap-1"
                >
                  <Avatar seed={previewName} name={previewName} size="lg" />
                  <span className="text-[9px] tracking-wider text-foreground-faint uppercase">your avatar</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!oauthPending && (
            <div role="tablist" aria-label="Sign in or create account" className="relative mt-7 grid grid-cols-2 rounded-xl border border-border bg-surface p-1">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchMode(m)}
                  className={cn(
                    'relative z-10 cursor-pointer rounded-lg py-2 text-sm font-semibold transition-colors',
                    mode === m ? 'text-on-primary' : 'text-foreground-dim hover:text-foreground',
                  )}
                >
                  {mode === m && (
                    <motion.span
                      layoutId="auth-tab"
                      className="absolute inset-0 -z-10 rounded-lg bg-primary glow-box"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  {m === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          {!oauthPending && providers && (providers.github || providers.google) && (
            <>
              <div className={cn('mt-6 grid gap-3', providers.github && providers.google ? 'grid-cols-2' : 'grid-cols-1')}>
                {providers.github && (
                  <Button variant="subtle" size="lg" className="h-11" onClick={() => (window.location.href = '/auth/github')}>
                    <GitHubIcon /> GitHub
                  </Button>
                )}
                {providers.google && (
                  <Button variant="subtle" size="lg" className="h-11" onClick={() => (window.location.href = '/auth/google')}>
                    <GoogleIcon /> Google
                  </Button>
                )}
              </div>
              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-bold tracking-[0.2em] text-foreground-faint uppercase">or with a username</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <motion.form
            key={shake}
            onSubmit={handleSubmit}
            noValidate
            className={cn('space-y-4', (!providers || (!providers.github && !providers.google) || oauthPending) && 'mt-6')}
            animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : undefined}
            transition={{ duration: 0.35 }}
          >
            <FieldShell
              id="auth-username"
              label="Username"
              icon={AtSign}
              trailing={
                mode === 'register' && availability !== 'idle' ? (
                  <span className="flex size-7 items-center justify-center" aria-hidden="true">
                    {availability === 'checking' && <Loader2 className="size-4 animate-spin text-foreground-faint" />}
                    {availability === 'available' && <Check className="size-4 text-success" />}
                    {(availability === 'taken' || availability === 'invalid') && <X className="size-4 text-destructive" />}
                  </span>
                ) : undefined
              }
              hint={
                mode === 'register' && availability !== 'idle' && availability !== 'checking' ? (
                  <p
                    className={cn('mt-1.5 text-xs', availability === 'available' ? 'text-success' : 'text-destructive')}
                    aria-live="polite"
                  >
                    {availability === 'available' && `@${username.trim()} is yours to take`}
                    {availability === 'taken' && 'That username is already taken'}
                    {availability === 'invalid' && '2–20 letters, numbers or underscores'}
                  </p>
                ) : null
              }
            >
              <input
                ref={userRef}
                id="auth-username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                placeholder="your_handle"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={20}
                aria-invalid={mode === 'register' && (availability === 'taken' || availability === 'invalid')}
                className={inputClass}
                required
              />
            </FieldShell>

            <AnimatePresence initial={false}>
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <FieldShell id="auth-email" label="Email (optional)" icon={Mail}>
                    <input
                      id="auth-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className={inputClass}
                    />
                  </FieldShell>
                </motion.div>
              )}
            </AnimatePresence>

            {needsPassword && (
              <FieldShell
                id="auth-password"
                label="Password"
                icon={KeyRound}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-foreground-faint transition-colors hover:bg-surface hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
                hint={
                  <>
                    {capsOn && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-warning" role="status">
                        <AlertTriangle className="size-3.5" aria-hidden="true" /> Caps Lock is on
                      </p>
                    )}
                    {mode === 'register' && <PasswordMeter password={password} />}
                  </>
                }
              >
                <input
                  id="auth-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsOn(e.getModifierState?.('CapsLock') ?? false)}
                  placeholder={mode === 'login' ? 'Your password' : 'At least 6 characters'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={inputClass}
                  required
                />
              </FieldShell>
            )}

            <AnimatePresence>
              {error && (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              size="lg"
              loading={submitting}
              disabled={!canSubmit}
              className="group h-12 w-full font-display text-base tracking-widest"
            >
              {oauthPending ? 'FINISH SIGN-UP' : mode === 'login' ? 'ENTER THE RIFT' : 'FORGE ACCOUNT'}
              {!submitting && <ArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden="true" />}
            </Button>
          </motion.form>

          <p className="mt-6 text-center text-sm text-foreground-dim">
            {oauthPending ? (
              <button
                onClick={() => void api.post('/api/auth/logout').then(() => window.location.reload())}
                className="cursor-pointer text-primary-bright hover:underline"
              >
                Cancel and use a different account
              </button>
            ) : mode === 'login' ? (
              <>
                New to the rift?{' '}
                <button onClick={() => switchMode('register')} className="cursor-pointer font-semibold text-primary-bright hover:underline">
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already a challenger?{' '}
                <button onClick={() => switchMode('login')} className="cursor-pointer font-semibold text-primary-bright hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-foreground-faint">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> Passwords are salted & hashed (scrypt). We never see them.
          </p>
          <p className="sr-only">
            <UserRound /> Nexora sign in
          </p>
        </motion.div>
      </main>
    </div>
  )
}
