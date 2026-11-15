import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { AlertTriangle, Check, Eye, EyeOff, Loader2, ShieldCheck, X } from 'lucide-react'
import { useToast } from '@/components/ui'
import { GraphField } from '@/components/auth/GraphField'
import '@/components/auth/auth.css'
import { LogoMark, Wordmark } from '@/components/brand/Logo'
import { takeOAuthResult, useAuth } from '@/context/AuthContext'
import { api, apiUrl, ApiError } from '@/lib/api'
import { useSite } from '@/context/SiteContext'
import { avatarName, resolveAvatarId } from '@/lib/avatar'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'
type Provider = 'github' | 'google'

const EASE = [0.16, 1, 0.3, 1] as const
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

/* ── password strength: four thin segments ─────────────────────────── */
const RULES = [
  { hint: 'use 8+ characters', test: (p: string) => p.length >= 8 },
  { hint: 'mix upper and lower case', test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { hint: 'add a number', test: (p: string) => /\d/.test(p) },
  { hint: 'add a symbol', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]
const STRENGTH = ['Too short', 'Weak', 'Fair', 'Strong', 'Very strong']

function Strength({ password }: { password: string }) {
  const passed = RULES.filter((r) => r.test(password)).length
  const score = password.length < 6 ? 0 : passed
  const next = password.length < 6 ? { hint: 'at least 6 characters' } : RULES.find((r) => !r.test(password))
  const tone = score <= 1 ? 'var(--color-state-error)' : score === 2 ? 'var(--color-state-warning)' : 'var(--color-state-success)'
  return (
    <div className="pt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="h-[3px] flex-1 rounded-full bg-border transition-colors duration-300" style={password && i <= Math.max(score, 1) ? { background: tone } : undefined} />
        ))}
      </div>
      <p className="m-0 mt-1.5 flex justify-between text-[12px] text-text-muted">
        <span>{password ? STRENGTH[score] : 'At least 6 characters'}</span>
        {password && next && score < 4 && <span>{next.hint}</span>}
      </p>
    </div>
  )
}

function Field({
  id,
  label,
  aside,
  trailing,
  hint,
  children,
}: {
  id: string
  label: string
  aside?: React.ReactNode
  trailing?: React.ReactNode
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-text-secondary">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        {children}
        {trailing && <div className="absolute top-1/2 right-1.5 -translate-y-1/2">{trailing}</div>}
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
          transition={{ duration: 0.28, ease: EASE }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
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
  const [lastUsed] = useState(readLast)
  const { login, register, user, oauthPending } = useAuth()
  const navigate = useNavigate()
  const site = useSite()
  const location = useLocation()
  const toast = useToast()
  const reduce = useReducedMotion()
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


  const title = oauthPending ? 'Choose a username' : mode === 'login' ? 'Sign in' : 'Create your account'
  const subtitle = oauthPending
    ? `Connected with ${oauthPending.provider === 'google' ? 'Google' : 'GitHub'}. Pick a username to finish.`
    : mode === 'login'
      ? site.status?.private
        ? 'Invited members only for now.'
        : null
      : site.status && !site.status.registrationsOpen
        ? 'Sign-ups are by invitation. Use the name or email you were invited with.'
        : null
  const pwTooShort = mode === 'register' && needsPassword && pwTouched && password.length > 0 && password.length < 6
  const hasOAuth = !oauthPending && providers && (providers.github || providers.google)

  return (
    <MotionConfig reducedMotion="user">
      <div className="auth-root relative flex min-h-dvh flex-col">
        <GraphField className="auth-field" />

        <header className="relative z-10 flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
          <Link to="/" className="flex items-center gap-2.5 !no-underline" aria-label="NexoraGuru home">
            <LogoMark size={26} />
            <Wordmark className="text-[15px]" />
          </Link>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="auth-panel relative w-full max-w-[25rem]"
          >
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="auth-success absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 rounded-[inherit]"
                  role="status"
                >
                  <LogoMark size={56} interactive intro />
                  <span className="text-sm text-text-secondary">{mode === 'login' ? 'Signed in' : 'Account ready'}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: EASE }}
                >
                  <h1 className="m-0 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-text-primary">{title}</h1>
                  {subtitle && <p className="mt-2 mb-0 text-[14px] text-text-secondary">{subtitle}</p>}
                </motion.div>
              </AnimatePresence>
            </div>

            {hasOAuth && (
              <>
                <div className="mt-8 grid gap-2.5">
                  {(['github', 'google'] as const)
                    .filter((p) => providers?.[p])
                    .map((p) => (
                      <button key={p} type="button" onClick={() => oauth(p)} className="auth-oauth">
                        {p === 'github' ? <GitHubIcon /> : <GoogleIcon />}
                        Continue with {p === 'github' ? 'GitHub' : 'Google'}
                        {lastUsed === p && <span className="auth-last">Last used</span>}
                      </button>
                    ))}
                </div>
                <div className="my-6 flex items-center gap-3" aria-hidden="true">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[12px] text-text-muted">or</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

            <motion.form
              key={shake}
              onSubmit={handleSubmit}
              noValidate
              className={cn('space-y-4', !hasOAuth && 'mt-8')}
              animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
              transition={{ duration: 0.36, ease: EASE }}
            >
              <Field
                id="auth-username"
                label="Username"
                trailing={
                  mode === 'register' && availability !== 'idle' ? (
                    <span className="flex size-8 items-center justify-center" aria-hidden="true">
                      {availability === 'checking' && <Loader2 className="size-4 animate-spin text-text-muted" />}
                      {availability === 'available' && <Check className="size-4 text-state-success" />}
                      {(availability === 'taken' || availability === 'invalid') && <X className="size-4 text-state-error" />}
                    </span>
                  ) : undefined
                }
                hint={
                  <Reveal show={mode === 'register' && availability !== 'idle' && availability !== 'checking'}>
                    <p className={cn('m-0 pt-1.5 text-xs', availability === 'available' ? 'text-state-success' : 'text-state-error')} aria-live="polite">
                      {availability === 'available' && `@${username.trim()} is available`}
                      {availability === 'taken' && 'That username is taken'}
                      {availability === 'invalid' && '2–20 letters, numbers or underscores'}
                    </p>
                  </Reveal>
                }
              >
                <input
                  ref={userRef}
                  id="auth-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={20}
                  aria-invalid={mode === 'register' && (availability === 'taken' || availability === 'invalid')}
                  className="auth-input"
                  required
                />
              </Field>

              <Reveal show={mode === 'register'}>
                <Field id="auth-email" label="Email" aside={<span className="text-[12px] text-text-muted">Optional</span>}>
                  <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="auth-input" />
                </Field>
              </Reveal>

              {needsPassword && (
                <Field
                  id="auth-password"
                  label="Password"
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      aria-pressed={showPw}
                      className="flex size-8 cursor-pointer items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
                    >
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                  hint={
                    <>
                      <Reveal show={capsOn}>
                        <p className="m-0 flex items-center gap-1.5 pt-1.5 text-xs text-state-warning" role="status">
                          <AlertTriangle className="size-3.5" aria-hidden="true" /> Caps Lock is on
                        </p>
                      </Reveal>
                      <Reveal show={mode === 'register'}>
                        <Strength password={password} />
                      </Reveal>
                    </>
                  }
                >
                  <input
                    id="auth-password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPwTouched(true)}
                    onKeyDown={(e) => setCapsOn(e.getModifierState?.('CapsLock') ?? false)}
                    onKeyUp={(e) => setCapsOn(e.getModifierState?.('CapsLock') ?? false)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    aria-invalid={pwTooShort || undefined}
                    className="auth-input"
                    required
                  />
                </Field>
              )}

              <AnimatePresence>
                {error && (
                  <motion.p
                    role="alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24, ease: EASE }}
                    className="m-0 overflow-hidden"
                  >
                    <span className="flex items-start gap-2 pt-1 text-[13px] text-state-error">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {error}
                    </span>
                  </motion.p>
                )}
              </AnimatePresence>

              <button type="submit" className="auth-submit" disabled={submitting || success} aria-busy={submitting || undefined}>
                {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {oauthPending ? 'Finish' : mode === 'login' ? 'Continue' : 'Create account'}
              </button>
            </motion.form>

            <p className="mt-7 mb-0 text-center text-[13.5px] text-text-muted">
              {oauthPending ? (
                <button
                  onClick={() => void api.post('/api/auth/logout').then(() => window.location.reload())}
                  className="auth-link"
                >
                  Use a different account
                </button>
              ) : mode === 'login' ? (
                <>
                  No account?{' '}
                  <button onClick={() => switchMode('register')} className="auth-link">
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Have an account?{' '}
                  <button onClick={() => switchMode('login')} className="auth-link">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </motion.div>
        </main>

        <footer className="relative z-10 px-5 pb-5 text-center text-[12px] text-text-muted sm:pb-7">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> Passwords are salted and hashed. We never see them.
          </span>
        </footer>
      </div>
    </MotionConfig>
  )
}
