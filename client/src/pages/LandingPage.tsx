import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { LogoMark, Wordmark } from '@/components/brand/Logo'
import { Icon } from '@/components/icon/Icon'
import type { IconName } from '@/components/icon/names'
import { LessonPreview } from '@/components/landing/LessonPreview'
import { TaglineReveal } from '@/components/landing/TaglineReveal'
import { OAUTH_KEY, useAuth } from '@/context/AuthContext'
import '@fontsource-variable/geist-mono'
import '@/components/landing/landing.css'

/*
 * The landing page (layout A: classic hero + sections), built with the
 * landing-page-design skill. One offer, one audience, one action:
 *   computer science students in India → learn CS by watching it run → Start learning free.
 * Every number on this page is real (from the site's own content); there are
 * no testimonials until real ones exist.
 */

const EASE = [0.22, 1, 0.36, 1] as const
const CTA = 'Start learning free'
const SIGNUP = '/auth?mode=register'

const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'What you get' },
  { href: '#gate', label: 'GATE CSE' },
  { href: '#faq', label: 'FAQ' },
]

const BENEFITS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'play', title: 'Lessons you can watch', text: 'Every algorithm plays step by step, with the line of code that is running and a sentence that says why. Proofs and derivations included.' },
  { icon: 'code', title: 'Practice that is judged for real', text: 'Problems from Codeforces, AtCoder, LeetCode and more, run against real tests in over 30 languages, right in the browser.' },
  { icon: 'gate', title: 'GATE CSE, end to end', text: '3,987 past questions from 54 papers with checked solutions, notes, timed tests in an exam console and a review queue that brings back your mistakes.' },
  { icon: 'map', title: 'See where you stand', text: 'A map of 60+ subjects shows your mastery. Link your Codeforces, AtCoder or LeetCode account to bring your solves and earn badges.' },
]

const STEPS: { title: string; text: string }[] = [
  { title: 'Pick a subject', text: 'Data structures, operating systems, networks or a GATE paper. Start wherever you are.' },
  { title: 'Watch it, then solve it', text: 'Each lesson animates the idea, then hands you problems on exactly that idea.' },
  { title: 'Track your progress', text: 'Mastery, streaks and GATE readiness in one place, so you always know what to do next.' },
]

const FACTS: { value: string; label: string }[] = [
  { value: '60+', label: 'computer science subjects' },
  { value: '3,987', label: 'GATE questions from 54 papers' },
  { value: '30+', label: 'languages in the judge' },
  { value: '5', label: 'languages for every DSA solution' },
]

const FAQ: { q: string; a: string }[] = [
  { q: 'Is NexoraGuru free?', a: 'Yes. Lessons, practice problems, the code judge and the GATE papers are free, and you do not need a card to sign up.' },
  { q: 'Who is it for?', a: 'Computer science students in India: engineering students learning the core subjects, GATE CSE aspirants, and anyone preparing for coding interviews or contests.' },
  { q: 'Which programming languages can I use?', a: 'The judge runs your code in over 30 languages. Solutions in the DSA course are written in C++, Java, Python, JavaScript and C.' },
  { q: 'How much of GATE CSE is covered?', a: 'Past papers from 1991 to 2026 (3,987 questions from 54 papers) with checked solutions and figures, plus notes, practice, timed tests in an exam console and spaced repetition review.' },
  { q: 'Can I bring my Codeforces or LeetCode progress?', a: 'Yes. Link your Codeforces, AtCoder or LeetCode account and prove it is yours once. Your solved problems, counts and rating come across; your code stays on the judge.' },
  { q: 'Do I need to install anything?', a: 'No. Lessons, practice and the judge all run in your browser.' },
  { q: 'Does it work on my phone?', a: 'Yes. Lessons, practice and GATE work on a phone. Writing code is easiest on a laptop.' },
]

/** Sections rise into place once (B7), on the base curve. */
function Reveal({ children, className, as = 'section', id }: { children: ReactNode; className?: string; as?: 'section' | 'div'; id?: string }) {
  const still = useReducedMotion()
  const M = as === 'div' ? motion.div : motion.section
  return (
    <M
      id={id}
      className={className}
      initial={still ? { opacity: 0 } : { opacity: 0, y: 32 }}
      whileInView={still ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      {children}
    </M>
  )
}

function Nav() {
  const [open, setOpen] = useState(false)
  const still = useReducedMotion()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <>
      <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <nav aria-label="Main" className="lp-nav flex w-full max-w-3xl items-center gap-2 rounded-2xl py-2 pr-2 pl-3">
          <Link to="/" className="flex items-center gap-2 !no-underline" aria-label="NexoraGuru home">
            <LogoMark size={24} />
            <Wordmark className="text-base" />
          </Link>
          <div className="ml-6 hidden items-center gap-6 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="lp-nav-link title-4">
                {n.label}
              </a>
            ))}
          </div>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <Link to="/auth" className="lp-btn lp-btn-ghost button-sm !border-transparent">
              Sign in
            </Link>
            <Link to={SIGNUP} className="lp-btn lp-btn-primary button-sm">
              {CTA}
            </Link>
          </div>
          <button type="button" className="lp-burger relative ml-auto size-10 rounded-lg md:hidden" aria-expanded={open} aria-controls="lp-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            <span />
            <span />
          </button>
        </nav>
      </header>
      <AnimatePresence>
        {open && (
          <motion.div
            id="lp-menu"
            className="lp-menu-panel fixed inset-0 z-40 flex flex-col px-6 pt-24 pb-10 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <nav aria-label="Menu" className="flex flex-col gap-2">
              {[...NAV, { href: '/auth', label: 'Sign in' }].map((n, i) => (
                <motion.a
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="heading-5 border-b border-[var(--lp-line)] py-4 text-[var(--lp-text)] !no-underline"
                  initial={still ? { opacity: 0 } : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: Math.min(i * 0.06, 0.4) }}
                >
                  {n.label}
                </motion.a>
              ))}
            </nav>
            <Link to={SIGNUP} className="lp-btn lp-btn-primary button-md mt-auto w-full" onClick={() => setOpen(false)}>
              {CTA}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function LandingPage() {
  const { user, loading, oauthPending } = useAuth()
  const still = useReducedMotion()

  if (!loading && user) return <Navigate to="/hub" replace />
  // GitHub/Google callbacks land on "/": send them on to finish sign-in.
  let oauthReturn = false
  try {
    oauthReturn = !!sessionStorage.getItem(OAUTH_KEY)
  } catch {
    /* storage blocked */
  }
  if (oauthPending || oauthReturn) return <Navigate to="/auth" replace />

  const rise = (delay: number) => (still ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: EASE } })

  return (
    <div className="lp min-h-dvh">
      <a href="#main" className="lp-btn lp-btn-primary button-sm sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60]">
        Skip to content
      </a>
      <Nav />

      <main id="main">
        {/* ── Hero ── */}
        <section className="px-6 pt-40 pb-24 md:pt-48">
          <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
            <motion.p {...rise(0)} className="caption-4 lp-dim mb-6 rounded-full border border-[var(--lp-line)] px-3 py-1">
              For computer science students in India
            </motion.p>
            <motion.h1 {...rise(0.06)} className="lp-hero-heading heading-3 md:heading-1 max-w-[680px]">
              Learn computer science
              <br />
              by watching it run
            </motion.h1>
            <motion.p {...rise(0.12)} className="body-3 lp-dim mt-6 max-w-[680px]">
              Animated lessons, a real code judge and complete GATE CSE practice in one place. Every idea plays step by step until it clicks.
            </motion.p>
            <motion.div {...rise(0.18)} className="mt-8 flex flex-col items-center gap-3">
              <Link to={SIGNUP} className="lp-btn lp-btn-primary button-md">
                {CTA}
                <Icon name="play" className="size-4" aria-hidden />
              </Link>
              <p className="caption-5 lp-muted">Free, no card needed · 3,987 GATE questions · judged in 30+ languages</p>
            </motion.div>
            <motion.div {...rise(0.3)} className="mt-16 w-full max-w-3xl">
              <LessonPreview />
            </motion.div>
          </div>
        </section>

        {/* ── Tagline reveal ── */}
        <section className="px-6 py-24" aria-label="Why NexoraGuru">
          <TaglineReveal lines={['If you can watch an idea run,', 'you can understand it.', 'If you understand it,', 'you can build it.']} />
        </section>

        {/* ── Benefits ── */}
        <Reveal id="features" className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <h2 className="heading-4 md:heading-3 max-w-[680px]">Everything you need to learn computer science properly</h2>
            <p className="body-3 lp-dim mt-4 max-w-[680px]">Learn the idea, practise it on real problems, and prove it in your exam.</p>
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {BENEFITS.map((b) => (
                <article key={b.title} id={b.icon === 'gate' ? 'gate' : undefined} className="lp-card scroll-mt-32 rounded-2xl p-6">
                  <span className="flex size-10 items-center justify-center rounded-lg border border-[var(--lp-line)] bg-[var(--lp-s2)]">
                    <Icon name={b.icon} className="size-5" aria-hidden />
                  </span>
                  <h3 className="title-2 mt-6">{b.title}</h3>
                  <p className="body-6 lp-dim mt-2">{b.text}</p>
                </article>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ── How it works ── */}
        <Reveal id="how" className="scroll-mt-24 px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <h2 className="heading-4 md:heading-3 max-w-[680px]">How it works</h2>
            <ol className="mt-12 grid list-none gap-4 p-0 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="lp-card rounded-2xl p-6">
                  <span className="lp-mono caption-3 lp-muted">0{i + 1}</span>
                  <h3 className="title-2 mt-4">{s.title}</h3>
                  <p className="body-6 lp-dim mt-2">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>

        {/* ── Proof: real numbers ── */}
        <Reveal className="px-6 py-24">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
            {FACTS.map((f) => (
              <div key={f.label} className="lp-card rounded-2xl p-6">
                <p className="heading-4 tabular-nums">{f.value}</p>
                <p className="caption-2 lp-dim mt-2">{f.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ── FAQ ── */}
        <Reveal id="faq" className="scroll-mt-24 px-6 py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="heading-4 md:heading-3">Questions, answered</h2>
            <div className="mt-12 flex flex-col gap-2">
              {FAQ.map((f) => (
                <details key={f.q} className="lp-card rounded-xl">
                  <summary className="flex items-center gap-4 rounded-xl px-6 py-4">
                    <span className="title-3 flex-1">{f.q}</span>
                    <span className="lp-faq-mark lp-muted" aria-hidden="true">
                      <Icon name="add" className="size-4" />
                    </span>
                  </summary>
                  <p className="body-6 lp-dim px-6 pb-6">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ── Final CTA ── */}
        <Reveal className="px-6 pt-24 pb-32">
          <div className="lp-card mx-auto flex max-w-3xl flex-col items-center rounded-2xl px-6 py-16 text-center">
            <LogoMark size={40} />
            <h2 className="heading-4 md:heading-3 mt-8 max-w-[680px]">Start with one lesson today</h2>
            <p className="body-3 lp-dim mt-4 max-w-[680px]">Pick a subject, watch the first idea run, and solve your first problem in under ten minutes.</p>
            <Link to={SIGNUP} className="lp-btn lp-btn-primary button-md mt-8">
              {CTA}
              <Icon name="play" className="size-4" aria-hidden />
            </Link>
            <p className="caption-5 lp-muted mt-3">Free, no card needed</p>
          </div>
        </Reveal>
      </main>

      <footer className="border-t border-[var(--lp-line)] px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3">
          <span className="flex items-center gap-2">
            <LogoMark size={20} />
            <span className="caption-4 lp-dim">© {new Date().getFullYear()} NexoraGuru</span>
          </span>
          <nav aria-label="Footer" className="ml-auto flex flex-wrap gap-6">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="caption-4 lp-dim !no-underline hover:text-[var(--lp-text)]">
                {n.label}
              </a>
            ))}
            <Link to="/auth" className="caption-4 lp-dim !no-underline hover:text-[var(--lp-text)]">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
