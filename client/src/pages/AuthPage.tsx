import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { AlertTriangle, ArrowRight, AtSign, Check, CornerDownLeft, Eye, EyeOff, KeyRound, Loader2, Mail, Moon, ShieldCheck, Sun, X } from 'lucide-react'
import { Avatar, useToast } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { STYLES } from '@/theme/styles'
import { PALETTE_BY_ID, resolveMode } from '@/theme/palettes'
import { styleLook } from '@/components/look/StylesSection'
import '@fontsource-variable/newsreader/opsz.css'
import '@/components/landing/landing.css'
import '@/components/auth/auth.css'
import { LogoMark } from '@/components/brand/Logo'
import { takeOAuthResult, useAuth } from '@/context/AuthContext'
import { api, apiUrl, ApiError } from '@/lib/api'
import { useSite } from '@/context/SiteContext'
import { cn } from '@/lib/utils'
import { loadUiFont } from '@/theme/fontLoaders'

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
  n,
  aside,
  trailing,
  hint,
  children,
}: {
  id: string
  label: string
  n?: string
  aside?: React.ReactNode
  trailing?: React.ReactNode
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="flex items-baseline gap-2.5 text-[13px] font-medium text-text-secondary">
          {n && <span className="font-mono text-[11px] text-text-muted">{n}</span>}
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

/* ── The last account used on this device (like an account chooser). ── */
type Remembered = { username: string; name: string | null; avatar: string | null; avatarUrl: string | null }
const ACCOUNT_KEY = 'nexora:last-account'
function readAccount(): Remembered | null {
  try {
    const v = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null')
    return v && typeof v.username === 'string' ? v : null
  } catch {
    return null
  }
}
function rememberAccount(a: Remembered) {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(a))
  } catch {
    /* private mode */
  }
}
function forgetAccount() {
  try {
    localStorage.removeItem(ACCOUNT_KEY)
  } catch {
    /* ignore */
  }
}

/** Light / dark and the design styles, before anyone signs in. */
function LookBar() {
  const { look, setLook, mode, setAppearance, preferredMode } = useTheme()
  const picks = STYLES.slice(0, 6)
  return (
    <div className="auth-look" role="group" aria-label="Appearance">
      <div className="auth-look-styles" role="radiogroup" aria-label="Design style">
        {picks.map((st) => {
          const l = styleLook(look, st)
          const p = PALETTE_BY_ID.get(l.theme)!
          const t = p[resolveMode(p, preferredMode)] ?? p.dark ?? p.light!
          return (
            <button
              key={st.id}
              type="button"
              role="radio"
              aria-checked={look.style === st.id}
              title={st.name}
              aria-label={st.name}
              onClick={() => setLook(l)}
              className={cn('auth-look-dot', look.style === st.id && 'is-on')}
              style={{ background: `linear-gradient(135deg, oklch(${t.bg[1]}) 0 50%, oklch(${t.accent}) 50% 100%)` }}
            />
          )
        })}
      </div>
      <button type="button" className="auth-look-mode" onClick={() => setAppearance(mode === 'dark' ? 'light' : 'dark')} aria-label={mode === 'dark' ? 'Switch to light' : 'Switch to dark'} title={mode === 'dark' ? 'Light' : 'Dark'}>
        {mode === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    </div>
  )
}

/** A live status dot: the API answered, and how fast. */
function Status() {
  const [ms, setMs] = useState<number | null>(null)
  const [down, setDown] = useState(false)
  useEffect(() => {
    let live = true
    const ping = () => {
      const t = performance.now()
      fetch(apiUrl('/api/health'), { cache: 'no-store' })
        .then((r) => {
          if (!live) return
          setDown(!r.ok)
          setMs(Math.round(performance.now() - t))
        })
        .catch(() => live && setDown(true))
    }
    ping()
    const id = window.setInterval(ping, 30000)
    return () => {
      live = false
      window.clearInterval(id)
    }
  }, [])
  return (
    <span className="auth-status" role="status">
      <span className={cn('auth-status-dot', down ? 'is-down' : ms == null ? 'is-wait' : 'is-up')} aria-hidden="true" />
      {down ? 'Service unreachable' : ms == null ? 'Checking service' : `All systems normal · ${ms} ms`}
    </span>
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
  const [account, setAccount] = useState<Remembered | null>(readAccount)
  const passRef = useRef<HTMLInputElement>(null)
  const { login, register, user, oauthPending } = useAuth()
  const navigate = useNavigate()
  const site = useSite()
  const location = useLocation()
  const toast = useToast()
  const reduce = useReducedMotion()
  const userRef = useRef<HTMLInputElement>(null)

  // The editorial headline face.
  useEffect(() => {
    void loadUiFont('newsreader')
  }, [])

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
        const u = await login(username.trim(), password)
        rememberAccount({ username: u?.username ?? username.trim(), name: typeof u?.display_name === "string" ? u.display_name : null, avatar: typeof u?.avatar === "string" ? u.avatar : null, avatarUrl: typeof u?.avatar_url === "string" ? u.avatar_url : null })
        toast.success('Welcome back', 'Picking up right where you left off.')
      } else {
        const u = await register(username.trim(), email.trim(), password)
        rememberAccount({ username: u?.username ?? username.trim(), name: typeof u?.display_name === "string" ? u.display_name : null, avatar: typeof u?.avatar === "string" ? u.avatar : null, avatarUrl: typeof u?.avatar_url === "string" ? u.avatar_url : null })
        toast.success('Welcome to NexoraGuru', 'Your account is ready, with an avatar picked for you. Choose another any time in Settings.')
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

  const lead =
    subtitle ??
    (mode === 'login' ? 'Sign in to pick up exactly where you stopped.' : 'One account for every lesson, problem and paper.')

  // The glass panel catches a soft highlight where the pointer is and leans
  // a degree or two towards it (CSS vars, no re-render; off for touch and
  // reduced motion).
  const onPointer = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse' || reduce) return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--gx', `${x * 100}%`)
    el.style.setProperty('--gy', `${y * 100}%`)
    el.style.setProperty('--rx', `${(0.5 - y) * 3}deg`)
    el.style.setProperty('--ry', `${(x - 0.5) * 4}deg`)
  }
  const onLeave = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty('--rx', '0deg')
    e.currentTarget.style.setProperty('--ry', '0deg')
  }
  const showAccount = mode === 'login' && !oauthPending && account && username.trim() !== account.username
  const stagger = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: 0.25 + i * 0.07, ease: EASE } })

  return (
    <MotionConfig reducedMotion="user">
      <div className="auth-root ed">
        {/* A living field of colour, nothing else: four soft lights drifting slowly. */}
        <div className="auth-field" aria-hidden="true">
          <span className="auth-light l1" />
          <span className="auth-light l2" />
          <span className="auth-light l3" />
          <span className="auth-light l4" />
          <span className="auth-grain" />
        </div>

        <header className="auth-top">
          <Link to="/" className="flex items-center gap-2.5 !no-underline" aria-label="NexoraGuru home">
            <LogoMark size={22} />
            <span className="ed-wordmark text-text-primary">NexoraGuru</span>
          </Link>
          <LookBar />
        </header>

        <main className="auth-main">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, ease: EASE }}
            className="auth-glass"
            onPointerMove={onPointer}
            onPointerLeave={onLeave}
          >
            <span className="auth-edge" aria-hidden="true" />
            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="auth-success" role="status">
                  <motion.span initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ duration: 0.6, ease: EASE }}>
                    <LogoMark size={56} />
                  </motion.span>
                  <span className="text-[15px] text-text-secondary">{mode === 'login' ? 'Signed in' : 'Account ready'}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.span {...stagger(0)} className="auth-glass-mark" aria-hidden="true">
              <LogoMark size={40} />
            </motion.span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: EASE }}>
                <h1 className="auth-title">{oauthPending ? 'Almost there' : mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
                <p className="auth-lead">{lead}</p>
              </motion.div>
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {showAccount && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                  <div className="auth-account">
                    <button
                      type="button"
                      className="auth-account-main"
                      onClick={() => {
                        setUsername(account.username)
                        window.setTimeout(() => passRef.current?.focus(), 30)
                      }}
                    >
                      <Avatar seed={account.username} name={account.name ?? account.username} avatar={account.avatar} src={account.avatarUrl} size="md" />
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-[14px] font-semibold text-text-primary">Continue as {account.name || account.username}</span>
                        <span className="block truncate text-[12.5px] text-text-muted">@{account.username} · last used on this device</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="auth-account-x"
                      aria-label="Forget this account on this device"
                      title="Forget"
                      onClick={() => {
                        forgetAccount()
                        setAccount(null)
                      }}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!oauthPending && (
              <motion.div {...stagger(1)} className="auth-seg" role="tablist" aria-label="Sign in or create an account">
                {(['login', 'register'] as const).map((m) => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)} className={cn('auth-seg-btn', mode === m && 'is-on')}>
                    {mode === m && <motion.span layoutId="auth-seg" className="auth-seg-pill" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                    <span className="relative">{m === 'login' ? 'Sign in' : 'Create account'}</span>
                  </button>
                ))}
              </motion.div>
            )}

            {hasOAuth && (
              <>
                <div className={cn('mt-6 grid gap-2.5', providers?.github && providers?.google && 'sm:grid-cols-2')}>
                  {(['github', 'google'] as const)
                    .filter((p) => providers?.[p])
                    .map((p) => (
                      <button key={p} type="button" onClick={() => oauth(p)} className="auth-oauth">
                        {p === 'github' ? <GitHubIcon /> : <GoogleIcon />}
                        {p === 'github' ? 'GitHub' : 'Google'}
                        {lastUsed === p && <span className="auth-last">Last used</span>}
                      </button>
                    ))}
                </div>
                <div className="my-5 flex items-center gap-3" aria-hidden="true">
                  <span className="h-px flex-1 bg-[var(--auth-hair)]" />
                  <span className="text-[12px] text-text-muted">or</span>
                  <span className="h-px flex-1 bg-[var(--auth-hair)]" />
                </div>
              </>
            )}

            <motion.form
              key={shake}
              onSubmit={handleSubmit}
              noValidate
              className={cn('space-y-4', !hasOAuth && 'mt-6')}
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
                <AtSign className="auth-field-icon" aria-hidden="true" />
                <input
                  ref={userRef}
                  id="auth-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={20}
                  placeholder="your_handle"
                  aria-invalid={mode === 'register' && (availability === 'taken' || availability === 'invalid')}
                  className="auth-input"
                  required
                />
              </Field>

              <Reveal show={mode === 'register'}>
                <Field id="auth-email" label="Email" aside={<span className="text-[12px] text-text-muted">Optional</span>}>
                  <Mail className="auth-field-icon" aria-hidden="true" />
                  <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" className="auth-input" />
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
                  <KeyRound className="auth-field-icon" aria-hidden="true" />
                  <input
                    ref={passRef}
                    id="auth-password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPwTouched(true)}
                    onKeyDown={(e) => setCapsOn(e.getModifierState?.('CapsLock') ?? false)}
                    onKeyUp={(e) => setCapsOn(e.getModifierState?.('CapsLock') ?? false)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={mode === 'login' ? '••••••••' : 'At least 6 characters'}
                    aria-invalid={pwTooShort || undefined}
                    className="auth-input"
                    required
                  />
                </Field>
              )}

              <AnimatePresence>
                {error && (
                  <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24, ease: EASE }} className="m-0 overflow-hidden">
                    <span className="flex items-start gap-2 text-[13px] text-state-error">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {error}
                    </span>
                  </motion.p>
                )}
              </AnimatePresence>

              <button type="submit" className={cn('auth-submit group', submitting && 'is-busy')} disabled={submitting || success} aria-busy={submitting || undefined}>
                <span className="auth-submit-label">{oauthPending ? 'Finish' : mode === 'login' ? 'Continue' : 'Create account'}</span>
                <ArrowRight className="auth-submit-arrow size-4" aria-hidden="true" />
                <span className="auth-submit-line" aria-hidden="true" />
              </button>
              <p className="auth-hint" aria-hidden="true">
                Press <kbd>
                  <CornerDownLeft className="size-3" />
                </kbd>{' '}
                to continue
              </p>
            </motion.form>

            {oauthPending && (
              <p className="mt-5 mb-0 text-center text-[13.5px]">
                <button onClick={() => void api.post('/api/auth/logout').then(() => window.location.reload())} className="auth-link">
                  Use a different account
                </button>
              </p>
            )}
            <h2 className="sr-only">{title}</h2>
          </motion.div>
        </main>

        <footer className="auth-foot">
          <span>© {new Date().getFullYear()} NexoraGuru</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> Passwords are salted and hashed
          </span>
          <Status />
          <Clock />
        </footer>
      </div>
    </MotionConfig>
  )
}

/** Local time, like the masthead of a printed page. */
function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <span className="auth-clock" aria-hidden="true">
      {now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
    </span>
  )
}
