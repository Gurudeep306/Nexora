import { Link, Navigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { LogoMark, Wordmark } from '@/components/brand/Logo'
import { OAUTH_KEY, useAuth } from '@/context/AuthContext'

/**
 * The front door: the mark, the name, one line worth reading — and a quiet way in.
 */
export default function LandingPage() {
  const { user, loading, oauthPending } = useAuth()
  const still = useReducedMotion()

  if (!loading && user) return <Navigate to="/hub" replace />
  // GitHub/Google callbacks land on "/" — send them on to finish sign-in.
  let oauthReturn = false
  try {
    oauthReturn = !!sessionStorage.getItem(OAUTH_KEY)
  } catch {
    /* storage blocked */
  }
  if (oauthPending || oauthReturn) return <Navigate to="/auth" replace />

  const rise = (delay: number) =>
    still ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const } }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <motion.div {...rise(0)} className="flex flex-col items-center gap-4">
        <LogoMark size={64} interactive intro />
        <h1 className="m-0">
          <Wordmark className="text-[26px]" />
        </h1>
      </motion.div>

      <motion.figure {...rise(0.25)} className="mt-14 max-w-xl">
        <blockquote className="m-0 text-[22px] leading-snug font-light tracking-[-0.01em] text-text-primary sm:text-[28px]">
          “What I cannot create, I do not understand.”
        </blockquote>
        <figcaption className="mt-4 text-[13.5px] text-text-muted">Richard Feynman</figcaption>
      </motion.figure>

      <motion.div {...rise(0.5)} className="mt-14">
        <Link to="/auth" className="group inline-flex items-center gap-1.5 text-[14px] text-text-secondary !no-underline transition-colors hover:text-text-primary">
          Enter <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </motion.div>
    </main>
  )
}
