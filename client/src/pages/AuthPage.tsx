import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { Zap, Swords, Trophy, Brain } from 'lucide-react'
import { Button, Field, Input, useToast } from '@/components/ui'
import { takeOAuthResult, useAuth } from '@/context/AuthContext'
import { api, ApiError } from '@/lib/api'

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

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [providers, setProviders] = useState<{ github?: boolean; google?: boolean } | null>(null)
  const [oauthProvider, setOauthProvider] = useState<string | null>(null)
  const { login, register, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  /* Returning from GitHub/Google: the session holds the OAuth identity but no
     Nexora handle yet — finish by claiming a username. */
  useEffect(() => {
    const result = takeOAuthResult()
    if (!result) return
    if (result.error) {
      setError(`Sign-in failed: ${result.error.replace(/_/g, ' ')}`)
    } else if (result.provider) {
      setOauthProvider(result.provider)
      setMode('register')
    }
  }, [])

  useEffect(() => {
    api
      .get<{ github?: boolean; google?: boolean }>('/api/auth/providers')
      .then(setProviders)
      .catch(() => setProviders({}))
  }, [])

  const destination = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from
  const from = destination?.pathname && destination.pathname !== '/auth'
    ? destination.pathname + (destination.search ?? '') : '/hub'
  if (user) return <Navigate to={from} replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(username, password)
        toast.success('Welcome back, challenger')
      } else {
        await register(username, email, password)
        toast.success('Account forged — enter the Rift')
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="grid-bg absolute inset-0 opacity-50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="card-neon relative z-10 w-full max-w-md border-border-glow p-8 glow-box"
      >
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent glow-box">
            <Zap className="size-7 text-white" />
          </div>
          <h1 className="font-display text-3xl tracking-widest text-foreground glow-text">NEXORA</h1>
          <p className="mt-2 text-sm text-foreground-dim">Master the Rift. Conquer the leaderboard.</p>
        </div>

        {oauthProvider && (
          <p role="status" className="mb-4 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
            Connected with {oauthProvider === 'github' ? 'GitHub' : 'Google'} — choose a username to finish setting up your account.
          </p>
        )}

        {/* Mode switch */}
        <div className="mb-6 grid grid-cols-2 rounded-lg border border-border bg-surface p-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null) }}
              className={`cursor-pointer rounded-md py-1.5 text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                mode === m ? 'bg-primary text-on-primary glow-box' : 'text-foreground-dim hover:text-foreground'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Username">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_handle"
              autoComplete="username"
              minLength={2}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              required
            />
          </Field>
          {mode === 'register' && (
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </Field>
          )}
          <Field label="Password" error={error ?? undefined}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'register' ? 6 : undefined}
            />
          </Field>
          <Button type="submit" size="lg" loading={submitting} className="w-full font-display tracking-widest">
            {mode === 'login' ? 'ENTER THE RIFT' : 'FORGE ACCOUNT'}
          </Button>
        </form>

        {providers && (providers.github || providers.google) && (
          <>
            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-bold tracking-widest text-foreground-faint uppercase">or continue with</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {providers.github && (
                <Button variant="subtle" onClick={() => { window.location.href = '/auth/github' }}>
                  <GitHubIcon /> GitHub
                </Button>
              )}
              {providers.google && (
                <Button variant="subtle" onClick={() => { window.location.href = '/auth/google' }}>
                  <GoogleIcon /> Google
                </Button>
              )}
            </div>
          </>
        )}

        {/* Feature strip */}
        <div className="mt-8 grid grid-cols-3 gap-2 border-t border-border pt-6 text-center">
          {[
            { icon: Swords, label: '80+ Problems' },
            { icon: Trophy, label: 'Contests' },
            { icon: Brain, label: 'AI Tutor' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <Icon className="size-4 text-primary-bright" />
              <span className="text-[10px] font-semibold tracking-wide text-foreground-faint uppercase">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
