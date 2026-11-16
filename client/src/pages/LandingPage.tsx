import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { LogoMark } from '@/components/brand/Logo'
import { Icon } from '@/components/icon/Icon'
import { LessonPreview } from '@/components/landing/LessonPreview'
import { TaglineReveal } from '@/components/landing/TaglineReveal'
import { SchedulerPreview } from '@/components/landing/SchedulerPreview'
import { GraphPreview } from '@/components/landing/GraphPreview'
import { CountUp, CyclingPhrase, LevelLadder, Marquee } from '@/components/landing/motifs'
import { OAUTH_KEY, useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import '@/components/landing/landing.css'

/*
 * The landing page: a field journal on warm paper. Parchment and ivory
 * surfaces, an editorial serif for every paragraph, Geist for the interface,
 * hairlines instead of shadows, and one clay button for the one action.
 * One offer, one audience, one action:
 *   CS students in India → every idea in computer science, set in motion → Start learning free.
 * Every number here comes from the site's own content. No testimonials until real ones exist.
 */

const EASE = [0.22, 1, 0.36, 1] as const
const YEAR = new Date().getFullYear()
const CTA = 'Start learning free'
const SIGNUP = '/auth?mode=register'

const NAV = [
  { href: '#specimens', label: 'See it move' },
  { href: '#inside', label: 'Inside' },
  { href: '#gate', label: 'GATE CSE' },
  { href: '#faq', label: 'FAQ' },
]

const GLIMPSES = [
  'a heap settle into order',
  'a packet find its way home',
  'one CPU shared three ways',
  'a B-tree split in two',
  'a deadlock form, then break',
  'a regex become a machine',
  'a graph explored ring by ring',
]

const SPECIMENS = [
  { id: 'search', title: 'Binary search', subject: 'Algorithms', Comp: LessonPreview },
  { id: 'sched', title: 'Round-robin', subject: 'Operating systems', Comp: SchedulerPreview },
  { id: 'bfs', title: 'Breadth-first search', subject: 'Graph theory', Comp: GraphPreview },
]

const SUBJECTS: string[][] = [
  ['Data Structures & Algorithms', 'Operating Systems', 'Computer Networks', 'Theory of Computation', 'Compiler Design', 'Databases', 'Digital Logic', 'Computer Organisation', 'Discrete Mathematics', 'Graph Theory', 'Number Theory', 'Competitive Programming', 'System Design', 'Distributed Systems', 'Parallel & Concurrent Programming', 'Complexity Theory'],
  ['Machine Learning', 'Deep Learning', 'Generative AI & LLMs', 'Computer Vision', 'Natural Language Processing', 'Reinforcement Learning', 'Cryptography', 'Cybersecurity', 'Quantum Computing', 'Computer Graphics', 'Robotics', 'Cloud Computing', 'Docker & Kubernetes', 'Rust', 'Go', 'TypeScript', 'Linear Algebra', 'Probability & Statistics'],
]

const ROOMS: { n: string; name: string; title: string; text: string }[] = [
  { n: 'I', name: 'The Library', title: 'Courses that move', text: 'Deep courses where every algorithm plays out frame by frame, with the derivations and proofs left in. Each problem carries a full editorial and solutions in C++, Java, Python, JavaScript and C.' },
  { n: 'II', name: 'The Workshop', title: 'A judge that tells the truth', text: 'Problems from Codeforces, CodeChef, AtCoder, LeetCode, SPOJ and Project Euler, run against real tests in more than 30 languages, without leaving the page.' },
  { n: 'III', name: 'The Exam Hall', title: 'GATE, rehearsed properly', text: 'Every paper since 1991 with checked solutions, timed mocks in a console that feels like the real one, daily questions, and a review queue that brings back what slipped.' },
  { n: 'IV', name: 'The Atlas', title: 'A map that fills in as you go', text: 'Sixty-odd subjects drawn as trees of ideas. Mastery is earned, not ticked: it grows from the lessons you finish and the problems you solve.' },
  { n: 'V', name: 'The Ledger', title: 'Progress you can feel', text: 'XP for every solve, streaks for every day, and eleven levels to climb, from a single Bit to ∞ Overflow.' },
  { n: 'VI', name: 'The Bridge', title: 'Your history comes with you', text: 'Link Codeforces, AtCoder or LeetCode and prove the account is yours once. Your solves and rating cross over, and the badges follow.' },
]

const MOVEMENTS: { n: string; title: string; text: string }[] = [
  { n: 'I', title: 'Watch', text: 'An idea plays out in front of you, one frame at a time, with the code beside it and a sentence that says why.' },
  { n: 'II', title: 'Build', text: 'Write it yourself, in the language you think in, and let the judge be honest with you.' },
  { n: 'III', title: 'Prove', text: 'Carry it into GATE, an interview or a contest, and see on the map how far you have travelled.' },
]

const FAQ: { q: string; a: string }[] = [
  { q: 'Is NexoraGuru free?', a: 'Yes. The lessons, the problems, the judge and the GATE papers cost nothing, and signing up needs no card.' },
  { q: 'Who is it for?', a: 'Anyone learning computer science in India: first-years meeting pointers for the first time, final-years facing placements, GATE aspirants, and contest regulars who want to understand what they already use.' },
  { q: 'How much does it cover?', a: 'Sixty-odd subjects, from data structures, operating systems and networks to compilers, machine learning, cryptography and quantum computing. The DSA course is the deepest so far, and more chapters are written to the same depth all the time.' },
  { q: 'Which languages can I write in?', a: 'The judge runs more than 30. Course solutions come in C++, Java, Python, JavaScript and C.' },
  { q: 'How much of GATE CSE is here?', a: '3,987 questions from 54 papers, 1991 to 2026, each with a checked solution and its figures, plus notes, practice, timed tests and spaced-repetition review.' },
  { q: 'Can I bring my Codeforces or LeetCode progress?', a: 'Yes. Link the account, prove it is yours once, and your solved problems, counts and rating come across. Your code stays on the judge.' },
  { q: 'Do I need to install anything? Does it work on a phone?', a: 'Nothing to install; everything runs in the browser. Lessons, practice and GATE work on a phone. Writing longer code is kinder on a laptop.' },
]

function Specimens() {
  const [tab, setTab] = useState(0)
  const { Comp } = SPECIMENS[tab]
  return (
    <div>
      <div className="lp-tabs" role="tablist" aria-label="Choose a lesson">
        {SPECIMENS.map((sp, k) => (
          <button
            key={sp.id}
            type="button"
            role="tab"
            id={`spec-tab-${sp.id}`}
            aria-selected={tab === k}
            aria-controls="spec-panel"
            className="lp-tab"
            onClick={() => setTab(k)}
          >
            <span className="ed-ui">{sp.title}</span>
            <span className="ed-caption ed-muted">{sp.subject}</span>
          </button>
        ))}
      </div>
      <div id="spec-panel" role="tabpanel" aria-labelledby={`spec-tab-${SPECIMENS[tab].id}`} className="mt-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
            <Comp />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Sections settle into place once, on the shared curve. */
function Reveal({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  const still = useReducedMotion()
  return (
    <motion.section
      id={id}
      className={className}
      initial={still ? { opacity: 0 } : { opacity: 0, y: 32 }}
      whileInView={still ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      {children}
    </motion.section>
  )
}

function ModeToggle() {
  const { mode, setAppearance } = useTheme()
  const next = mode === 'dark' ? 'light' : 'dark'
  return (
    <button type="button" className="ed-icon-btn" onClick={() => setAppearance(next)} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      <Icon name={mode === 'dark' ? 'sun' : 'moon'} className="size-4" aria-hidden />
    </button>
  )
}

function Nav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const still = useReducedMotion()
  useEffect(() => {
    // A hairline appears under the bar once the page has moved (one passive, rAF-throttled listener).
    let raf = 0
    const on = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        setScrolled(window.scrollY > 8)
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => {
      window.removeEventListener('scroll', on)
      cancelAnimationFrame(raf)
    }
  }, [])
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
      <header className={`ed-nav sticky top-0 z-50 ${scrolled || open ? 'is-scrolled' : ''}`}>
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-6 md:px-10">
          <Link to="/" className="flex items-center gap-2.5 !no-underline" aria-label="NexoraGuru home">
            <LogoMark size={22} interactive />
            <span className="ed-wordmark">NexoraGuru</span>
          </Link>
          <div className="ml-6 hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="ed-nav-link">
                {n.label}
              </a>
            ))}
          </div>
          <div className="ml-auto hidden items-center gap-4 md:flex">
            <ModeToggle />
            <Link to="/auth" className="ed-nav-link">
              Sign in
            </Link>
            <Link to={SIGNUP} className="ed-btn ed-btn-ivory">
              Start learning
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-1 md:hidden">
            <ModeToggle />
            <button type="button" className="ed-burger relative size-10" aria-expanded={open} aria-controls="lp-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
              <span />
              <span />
            </button>
          </div>
        </nav>
      </header>
      <AnimatePresence>
        {open && (
          <motion.div
            id="lp-menu"
            className="ed-menu-panel fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col px-6 pt-4 pb-10 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <nav aria-label="Menu" className="flex flex-col">
              {[...NAV, { href: '/auth', label: 'Sign in' }].map((n, i) => (
                <motion.a
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="ed-menu-link"
                  initial={still ? { opacity: 0 } : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: Math.min(i * 0.06, 0.4) }}
                >
                  {n.label}
                </motion.a>
              ))}
            </nav>
            <Link to={SIGNUP} className="ed-btn ed-btn-clay mt-auto w-full" onClick={() => setOpen(false)}>
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
  // Signed-in people normally go straight to the app; "/?preview" shows them the public page.
  const [params] = useSearchParams()
  const preview = params.has('preview')

  if (!loading && user && !preview) return <Navigate to="/hub" replace />
  // GitHub/Google callbacks land on "/": send them on to finish sign-in.
  let oauthReturn = false
  try {
    oauthReturn = !!sessionStorage.getItem(OAUTH_KEY)
  } catch {
    /* storage blocked */
  }
  if (!preview && (oauthPending || oauthReturn)) return <Navigate to="/auth" replace />

  const rise = (delay: number) => (still ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay, ease: EASE } })

  return (
    <div className="lp min-h-dvh">
      <a href="#main" className="ed-btn ed-btn-ivory sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]">
        Skip to content
      </a>
      <Nav />

      <main id="main">
        {/* Hero: a declarative sans headline, an editorial serif reply */}
        <section className="mx-auto max-w-[1280px] px-6 pt-14 pb-16 md:px-10 md:pt-24 md:pb-24">
          <motion.p {...rise(0)} className="ed-label ed-muted">
            A field journal for computer science
          </motion.p>
          <div className="mt-8 grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:gap-20">
            <motion.h1 {...rise(0.06)} className="ed-display-sans">
              Every idea in{' '}
              <a href="#atlas" className="ed-link">
                computer science
              </a>
              ,{' '}
              <a href="#specimens" className="ed-link">
                set in motion
              </a>
              .
            </motion.h1>
            <motion.div {...rise(0.14)} className="lg:pb-2">
              <p className="ed-body ed-ink-2">
                From the first pointer to the last proof, each idea unfolds frame by frame until it clicks. Then you build it, test it against a real judge, and carry it into GATE, interviews and contests.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link to={SIGNUP} className="ed-btn ed-btn-clay">
                  {CTA}
                </Link>
                <span className="ed-caption ed-muted">Free. No card needed.</span>
              </div>
            </motion.div>
          </div>
          <motion.p {...rise(0.22)} className="ed-body ed-muted mt-14 md:mt-20">
            Today, watch <CyclingPhrase phrases={GLIMPSES} />
          </motion.p>
        </section>

        {/* The featured spread: three lessons, playing */}
        <section id="specimens" className="mx-auto max-w-[1280px] scroll-mt-20 px-4 md:px-10" aria-labelledby="spec-title">
          <motion.div {...rise(0.28)} className="ed-feature p-6 md:p-12">
            <div className="mb-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h2 id="spec-title" className="ed-label">
                Specimens, playing live
              </h2>
              <p className="ed-caption ed-muted">Three ideas from three subjects. Hover to pause, or step through.</p>
            </div>
            <Specimens />
          </motion.div>
        </section>

        {/* Tagline, word by word */}
        <section className="mx-auto max-w-[1280px] px-6 py-24 md:px-10 md:py-36" aria-label="Why NexoraGuru">
          <TaglineReveal lines={['An algorithm is a story.', 'Watch it unfold, frame by frame,', 'until you could tell it', 'yourself.']} />
        </section>

        {/* The atlas */}
        <Reveal id="atlas" className="scroll-mt-20 pb-24 md:pb-32">
          <div className="mx-auto grid max-w-[1280px] gap-6 px-6 md:px-10 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="ed-label ed-muted">The atlas</p>
              <h2 className="ed-heading mt-4 max-w-[16ch]">
                <CountUp to={60} suffix="+" /> subjects, one map
              </h2>
            </div>
            <p className="ed-body ed-ink-2 lg:max-w-[46ch]">
              Algorithms to quantum computing, compilers to cryptography. Every subject is a tree of ideas, and each lesson you finish lights another branch.
            </p>
          </div>
          <div className="mt-12">
            <Marquee rows={SUBJECTS} />
          </div>
        </Reveal>

        {/* Inside: six rooms */}
        <Reveal id="inside" className="mx-auto max-w-[1280px] scroll-mt-20 px-6 pb-24 md:px-10 md:pb-32">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="ed-label ed-muted">Inside</p>
              <h2 className="ed-heading mt-4 max-w-[18ch]">One house, six rooms</h2>
            </div>
            <p className="ed-body ed-ink-2 lg:max-w-[46ch]">Wander in through any door. They all connect, and everything you do in one shows up in the others.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ROOMS.map((r) => (
              <article key={r.name} className="ed-card lp-room p-8">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="ed-label ed-muted">{r.name}</p>
                  <span className="ed-serif-numeral ed-muted">{r.n}</span>
                </div>
                <h3 className="ed-subheading mt-8">{r.title}</h3>
                <p className="ed-body-sm ed-ink-2 mt-3">{r.text}</p>
              </article>
            ))}
          </div>
        </Reveal>

        {/* GATE CSE */}
        <Reveal id="gate" className="mx-auto max-w-[1280px] scroll-mt-20 px-4 pb-24 md:px-10 md:pb-32">
          <div className="ed-oat p-6 md:p-12">
            <p className="ed-label ed-muted">The exam hall · GATE CSE</p>
            <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-20">
              <div>
                <h2 className="ed-heading max-w-[20ch]">Thirty-five years of papers, every answer checked</h2>
                <p className="ed-body ed-ink-2 mt-4">
                  Solve the real questions with worked solutions and figures, sit timed mocks in a console that behaves like exam day, and let spaced repetition quietly return the ones you got wrong until they stop being wrong.
                </p>
              </div>
              <dl className="m-0 grid grid-cols-2 gap-x-8 gap-y-8 self-end">
                <div className="ed-rule border-t pt-4">
                  <dt className="ed-caption ed-muted">past questions</dt>
                  <dd className="ed-figure m-0 mt-2">
                    <CountUp to={3987} />
                  </dd>
                </div>
                <div className="ed-rule border-t pt-4">
                  <dt className="ed-caption ed-muted">papers</dt>
                  <dd className="ed-figure m-0 mt-2">
                    <CountUp to={54} />
                  </dd>
                </div>
                <div className="ed-rule border-t pt-4">
                  <dt className="ed-caption ed-muted">years covered</dt>
                  <dd className="ed-figure m-0 mt-2">1991–2026</dd>
                </div>
                <div className="ed-rule border-t pt-4">
                  <dt className="ed-caption ed-muted">judge languages</dt>
                  <dd className="ed-figure m-0 mt-2">
                    <CountUp to={30} suffix="+" />
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </Reveal>

        {/* The ledger: levels */}
        <Reveal className="mx-auto max-w-[1280px] px-6 pb-24 md:px-10 md:pb-32">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="ed-label ed-muted">The ledger</p>
              <h2 className="ed-heading mt-4 max-w-[16ch]">From a single Bit to ∞ Overflow</h2>
              <p className="ed-body ed-ink-2 mt-4 max-w-[44ch]">Every solve earns XP. Keep a streak alive, climb eleven levels, and watch your bar fill one byte at a time.</p>
            </div>
            <LevelLadder />
          </div>
        </Reveal>

        {/* Three movements */}
        <Reveal id="how" className="mx-auto max-w-[1280px] scroll-mt-20 px-6 pb-24 md:px-10 md:pb-32">
          <p className="ed-label ed-muted">How it works</p>
          <h2 className="ed-heading mt-4">In three movements</h2>
          <ol className="mt-12 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-8">
            {MOVEMENTS.map((m) => (
              <li key={m.title} className="ed-rule border-t pt-6">
                <span className="ed-serif-numeral ed-muted">{m.n}</span>
                <h3 className="ed-subheading mt-4">{m.title}</h3>
                <p className="ed-body-sm ed-ink-2 mt-3">{m.text}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        {/* FAQ */}
        <Reveal id="faq" className="mx-auto max-w-[1280px] scroll-mt-20 px-6 pb-24 md:px-10 md:pb-32">
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-20">
            <div>
              <h2 className="ed-heading lg:sticky lg:top-24">Questions, answered plainly</h2>
            </div>
            <div className="ed-rule border-t">
              {FAQ.map((f) => (
                <details key={f.q} className="ed-rule border-b">
                  <summary className="flex cursor-pointer items-center gap-6 py-6">
                    <span className="ed-subheading flex-1 !text-lg">{f.q}</span>
                    <span className="ed-faq-mark ed-muted" aria-hidden="true">
                      <Icon name="add" className="size-4" />
                    </span>
                  </summary>
                  <p className="ed-body-sm ed-ink-2 max-w-[62ch] pb-6">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Closing call */}
        <Reveal className="mx-auto max-w-[1280px] px-4 pb-24 md:px-10 md:pb-32">
          <div className="ed-card flex flex-col items-start gap-8 p-8 md:flex-row md:items-end md:justify-between md:p-12">
            <div>
              <h2 className="ed-display-serif max-w-[16ch]">The first idea takes ten minutes</h2>
              <p className="ed-body ed-ink-2 mt-4 max-w-[46ch]">Pick any subject. Watch one thing move. Solve one problem. By then you will know whether this is for you.</p>
            </div>
            <div className="flex flex-col items-start gap-3">
              <Link to={SIGNUP} className="ed-btn ed-btn-clay">
                {CTA}
              </Link>
              <span className="ed-caption ed-muted">Free. No card needed.</span>
            </div>
          </div>
        </Reveal>
      </main>

      <footer className="ed-footer">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-6 py-16 md:grid-cols-[2fr_1fr_1fr] md:px-10">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark size={22} className="!text-[var(--ed-on-inverse)]" />
              <span className="ed-wordmark">NexoraGuru</span>
            </div>
            <p className="ed-body-sm mt-4 max-w-[36ch] text-[var(--ed-on-inverse-muted)]">A field journal for computer science, written in motion. Made in India, for students everywhere.</p>
          </div>
          <nav aria-label="Explore" className="flex flex-col items-start gap-2">
            <p className="ed-label mb-2 text-[var(--ed-on-inverse-muted)]">Explore</p>
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="ed-ui-sm">
                {n.label}
              </a>
            ))}
          </nav>
          <nav aria-label="Account" className="flex flex-col items-start gap-2">
            <p className="ed-label mb-2 text-[var(--ed-on-inverse-muted)]">Account</p>
            <Link to="/auth" className="ed-ui-sm">
              Sign in
            </Link>
            <Link to={SIGNUP} className="ed-ui-sm">
              Create an account
            </Link>
          </nav>
        </div>
        <div className="ed-footer-rule mx-auto max-w-[1280px] px-6 py-6 md:px-10">
          <p className="ed-caption text-[var(--ed-on-inverse-muted)]">© {YEAR} NexoraGuru</p>
        </div>
      </footer>
    </div>
  )
}
