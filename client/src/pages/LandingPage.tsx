import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Lenis from 'lenis'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  Code2,
  Compass,
  Eye,
  FlaskConical,
  GraduationCap,
  Network,
  PenTool,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react'
import { Wallpaper } from '@/components/fx/Wallpaper'
import { LogoMark, Wordmark } from '@/components/brand/Logo'
import { AlgoTheater } from '@/components/showcase/AlgoTheater'
import { SubjectTicker } from '@/components/auth/AuthShowcase'
import { CAREER_PATHS, FACTS, TRACKS } from '@/components/showcase/curriculum'
import { DSA_TOPICS, DSA_UNITS } from '@/learn/content/dsa/syllabus'
import { RankGlyph, RIFT_TIERS, RotatingText } from '@/components/ui'
import { OAUTH_KEY, useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const HERO_WORDS = ['algorithms', 'operating systems', 'networks', 'databases', 'machine learning', 'system design']

export default function LandingPage() {
  const { user, loading, oauthPending } = useAuth()
  const root = useRef<HTMLDivElement>(null)
  const [problemCount, setProblemCount] = useState(0)

  useEffect(() => {
    api.get<{ total: number }>('/api/problems', { query: { limit: 1 } }).then((r) => setProblemCount(r.total)).catch(() => {})
  }, [])

  // Smooth scrolling (Lenis) wired into GSAP's ticker so ScrollTrigger stays in sync.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // The live lesson tilts flat as it scrolls into view.
        gsap.fromTo(
          '[data-hero-shot]',
          { rotateX: 18, y: 40, scale: 0.95 },
          {
            rotateX: 0,
            y: 0,
            scale: 1,
            ease: 'none',
            scrollTrigger: { trigger: '[data-hero-shot]', start: 'top 95%', end: 'top 40%', scrub: true },
          },
        )
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.from(el, { y: 36, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 86%' } })
        })
        gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach((group) => {
          gsap.from(group.children, {
            y: 40,
            opacity: 0,
            duration: 0.8,
            stagger: 0.07,
            ease: 'power3.out',
            scrollTrigger: { trigger: group, start: 'top 82%' },
          })
        })
        // The learning loop's rail draws itself as you scroll past it.
        gsap.fromTo(
          '[data-loop-rail]',
          { scaleX: 0 },
          { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '[data-loop]', start: 'top 75%', end: 'bottom 60%', scrub: true } },
        )
        // Career-path milestones fill in.
        gsap.from('[data-milestone]', {
          scale: 0,
          duration: 0.4,
          stagger: 0.025,
          ease: 'back.out(2)',
          scrollTrigger: { trigger: '[data-paths]', start: 'top 78%' },
        })
        gsap.from('[data-rank]', {
          y: 50,
          opacity: 0,
          scale: 0.6,
          duration: 0.7,
          stagger: 0.05,
          ease: 'back.out(1.8)',
          scrollTrigger: { trigger: '[data-ranks]', start: 'top 82%' },
        })
      })
    },
    { scope: root },
  )

  if (!loading && user) return <Navigate to="/hub" replace />
  // GitHub/Google callbacks land on "/" — send them on to finish sign-in.
  let oauthReturn = false
  try {
    oauthReturn = !!sessionStorage.getItem(OAUTH_KEY)
  } catch {
    /* storage blocked */
  }
  if (oauthPending || oauthReturn) return <Navigate to="/auth" replace />

  const problems = problemCount || 27000

  return (
    <div ref={root} className="relative min-h-dvh overflow-x-clip text-foreground">
      <Wallpaper />

      {/* ── Nav ── */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="glass mx-3 mt-3 flex h-14 max-w-6xl items-center gap-6 rounded-2xl px-4 sm:mx-auto sm:px-5">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Nexora home">
            <LogoMark size={28} />
            <Wordmark className="text-[15px]" />
          </Link>
          <nav className="hidden items-center gap-6 text-[13px] text-foreground-dim md:flex" aria-label="Sections">
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#curriculum" className="transition-colors hover:text-foreground">Curriculum</a>
            <a href="#practice" className="transition-colors hover:text-foreground">Practice</a>
            <a href="#paths" className="transition-colors hover:text-foreground">Career paths</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/auth" className="hidden h-9 items-center rounded-lg px-3 text-[13px] font-medium text-foreground-dim transition-colors hover:text-foreground sm:flex">
              Sign in
            </Link>
            <Link
              to="/auth?mode=register"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-on-accent-brand transition-transform hover:scale-[1.03]"
            >
              Start learning <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative isolate overflow-hidden pt-36 pb-20 sm:pt-44">
        <div className="aurora -z-10 opacity-45" aria-hidden="true">
          <span className="a1" />
          <span className="a2" />
          <span className="a3" />
        </div>
        <div className="absolute inset-x-0 bottom-0 -z-10 h-64 bg-gradient-to-b from-transparent to-background" aria-hidden="true" />
        <div className="mx-auto max-w-6xl px-5 text-center">
          <motion.a
            href="#curriculum"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass mx-auto inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs text-foreground-dim hover:text-foreground"
          >
            <span className="rounded-full bg-gradient-to-r from-primary to-accent px-2 py-0.5 text-[10.5px] font-semibold text-on-accent-brand">
              END TO END
            </span>
            One platform for your whole computer science journey
            <ArrowRight className="size-3" />
          </motion.a>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-gradient mx-auto mt-7 max-w-5xl font-display text-[40px] leading-[1.04] font-semibold tracking-[-0.035em] sm:text-7xl lg:text-[80px]"
          >
            Learn computer science
            <br />
            <span className="bg-gradient-to-r from-primary-bright via-accent to-cyan bg-clip-text text-transparent">by watching it run.</span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 max-w-2xl text-base text-foreground-dim sm:text-lg"
          >
            <p>
              Animated courses, a real judge, an AI tutor and career roadmaps, all wired together so what you learn today
              is what you practise tonight.
            </p>
            <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 text-foreground">
              <span className="text-foreground-dim">Start with</span>
              <span className="inline-block w-[11.5rem] text-left font-semibold text-primary-bright sm:w-[13.5rem]">
                <RotatingText items={HERO_WORDS} interval={2200} />
              </span>
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to="/auth?mode=register"
              className="sheen group flex h-12 items-center gap-2 rounded-xl bg-gradient-to-b from-[#9d74ff] to-primary px-6 text-[15px] font-semibold text-on-accent-brand shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_0_0_1px_rgb(139_92_246/0.6),0_14px_40px_-10px_rgb(139_92_246/0.9)] transition-transform hover:scale-[1.03]"
            >
              Start learning free <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#theater" className="glass flex h-12 items-center gap-2 rounded-xl px-6 text-[15px] font-medium text-foreground hover:bg-hairline/[0.06]">
              <Eye className="size-4" /> See a lesson play
            </a>
          </motion.div>
          <p className="mt-4 text-xs text-foreground-faint">Free forever · no card · your progress stays yours</p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
          >
            {[
              { v: FACTS.subjects, l: 'subjects' },
              { v: FACTS.lessons, l: 'lessons' },
              { v: FACTS.animations, l: 'algorithm animations' },
              { v: `${Math.floor(problems / 1000)}K+`, l: 'practice problems' },
            ].map(({ v, l }) => (
              <div key={l} className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">{v}</span>
                <span className="text-xs text-foreground-faint">{l}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* The live lesson */}
        <div id="theater" className="mx-auto mt-20 max-w-5xl scroll-mt-28 px-5 [perspective:1400px]">
          <div data-hero-shot className="origin-top [transform-style:preserve-3d]">
            <AlgoTheater />
          </div>
          <p className="mt-4 text-center text-xs text-foreground-faint">
            This is the real lesson engine, not a video. Every frame comes from running the algorithm, and every step lights up
            its line of code.
          </p>
        </div>
      </section>

      {/* ── Subjects band ── */}
      <section className="border-y border-hairline/[0.05] bg-hairline/[0.01] py-8" aria-label="Subjects">
        <p className="mb-5 text-center text-[11px] font-semibold tracking-[0.18em] text-foreground-faint uppercase">
          From your first array to distributed systems
        </p>
        <SubjectTicker />
      </section>

      {/* ── The learning loop ── */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-28">
        <SectionHead
          eyebrow="How it works"
          title="Learn it. See it. Do it. Own it."
          sub="Most platforms give you either reading or problems. Nexora closes the loop, so every concept turns into a skill you can prove."
        />
        <div data-loop className="relative">
          <div className="absolute top-[30px] right-[12%] left-[12%] hidden h-px bg-hairline/[0.08] md:block" aria-hidden="true">
            <div data-loop-rail className="h-full origin-left bg-gradient-to-r from-primary via-accent to-cyan" />
          </div>
          <div data-stagger className="grid gap-5 md:grid-cols-4">
            <LoopStep n={1} icon={<BookOpen />} title="Learn" text="Short lessons written like a good textbook, with quick checks after every idea.">
              <MiniLesson />
            </LoopStep>
            <LoopStep n={2} icon={<Eye />} title="See" text="Step through animations forwards and backwards in pseudocode, Python, C++ or Java.">
              <MiniArray />
            </LoopStep>
            <LoopStep n={3} icon={<Code2 />} title="Practise" text="Solve problems on a real judge in 30+ languages, with an AI tutor beside you.">
              <MiniVerdict />
            </LoopStep>
            <LoopStep n={4} icon={<Trophy />} title="Master" text="A skill map, analytics and ranks show what you know and what to learn next.">
              <MiniGraph />
            </LoopStep>
          </div>
        </div>
      </section>

      {/* ── Curriculum ── */}
      <section id="curriculum" className="relative scroll-mt-24 overflow-hidden border-y border-hairline/[0.05] py-28">
        <div className="dot-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5">
          <SectionHead
            eyebrow="The curriculum"
            title="The whole degree, in one place."
            sub="Six tracks covering the subjects a computer science degree covers, plus the languages you'll use to practise them."
          />
          <div data-stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TRACKS.map((t) => (
              <Spotlight key={t.id} className="p-6">
                <div className="flex items-center gap-3">
                  <span className={cn('flex size-10 items-center justify-center rounded-xl border bg-gradient-to-b [&_svg]:size-5', t.hue)}>
                    <t.icon />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">{t.title}</h3>
                    <p className="text-xs text-foreground-faint">{t.blurb}</p>
                  </div>
                </div>
                <ul className="mt-5 flex flex-wrap gap-1.5">
                  {t.subjects.map((s) => (
                    <li key={s} className="rounded-md border border-hairline/[0.07] bg-bg-field px-2 py-1 text-[11.5px] text-foreground-dim">
                      {s}
                    </li>
                  ))}
                </ul>
              </Spotlight>
            ))}
          </div>
        </div>
      </section>

      {/* ── DSA course spotlight ── */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-28 lg:grid-cols-[1fr_1.1fr]">
        <div data-reveal>
          <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-primary-bright uppercase">Flagship course</p>
          <h2 className="text-heading-fade font-display text-4xl font-semibold tracking-tight sm:text-5xl">Data structures & algorithms, from zero.</h2>
          <p className="mt-4 max-w-md text-foreground-dim">
            {DSA_TOPICS.length} topics in {DSA_UNITS.length} units, built from the ground up. Every topic has illustrated pages,
            live animations, a question bank and judged coding problems.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-foreground-dim">
            {[
              'Multiple-choice, predict-the-output and trace-the-code questions',
              'Coding problems judged on hidden tests',
              'Progress saved per page, so you can stop anywhere',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-success" /> {t}
              </li>
            ))}
          </ul>
          <Link to="/auth?mode=register" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary-bright hover:text-foreground">
            Start the course <ArrowRight className="size-4" />
          </Link>
        </div>
        <div data-reveal className="glass overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-hairline/[0.06] px-5 py-3.5 text-sm font-semibold">
            <GraduationCap className="size-4 text-primary-bright" /> DSA syllabus
          </div>
          <ol className="divide-y divide-hairline/[0.04]">
            {DSA_UNITS.map((u, i) => {
              const topics = DSA_TOPICS.filter((t) => t.unit === u.id)
              const live = topics.filter((t) => t.load).length
              return (
                <li key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs text-primary-bright">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{u.title}</p>
                    <p className="truncate text-xs text-foreground-faint">{topics.map((t) => t.title).join(' · ')}</p>
                  </div>
                  {live > 0 ? (
                    <span className="shrink-0 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                      {live} live
                    </span>
                  ) : (
                    <span className="shrink-0 font-mono text-[10.5px] text-foreground-faint">{topics.length} topics</span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* ── Practice & tools ── */}
      <section id="practice" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-28">
        <SectionHead
          eyebrow="Practice & tools"
          title="Everything you need between lessons."
          sub="When you're ready to test yourself, the tools are already there, and they all feed the same progress."
        />
        <div data-stagger className="grid gap-4 md:grid-cols-6">
          <Spotlight className="p-6 md:col-span-4">
            <FeatureHead icon={<Swords />} title="A real judge, in your browser" text={`${problems.toLocaleString()}+ problems from Codeforces, CodeChef, AtCoder, LeetCode, SPOJ and Project Euler. Run on samples, submit in 30+ languages and get the verdict in seconds.`} />
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {['C++20', 'Python 3', 'Java', 'Rust', 'Go', 'Kotlin', 'TypeScript', 'C#', 'Swift', 'Haskell', 'Scala', 'Ruby'].map((l) => (
                <span key={l} className="rounded-md border border-hairline/[0.06] bg-bg-field px-2 py-1.5 text-center font-mono text-[11px] text-foreground-dim">
                  {l}
                </span>
              ))}
            </div>
          </Spotlight>
          <Spotlight className="p-6 md:col-span-2">
            <FeatureHead icon={<BrainCircuit />} title="AI tutor" text="Hints that teach the idea instead of handing over the answer." />
            <div className="mt-5 space-y-2 text-xs">
              <div className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-primary/20 px-3 py-2 text-foreground">Why is my solution O(n²)?</div>
              <div className="w-fit max-w-[92%] rounded-xl rounded-bl-sm border border-hairline/[0.06] bg-bg-field px-3 py-2 text-foreground-dim">
                Look at the inner loop: it re-sums the window each time. What if you kept a running sum?
              </div>
            </div>
          </Spotlight>
          <Spotlight className="p-6 md:col-span-2">
            <FeatureHead icon={<FlaskConical />} title="AI Lab" text={`${FACTS.aiProblems} hands-on problems across ML, deep learning, NLP, vision, generative AI and RL. Implement the maths yourself in Python.`} />
            <div className="mt-4 flex flex-wrap gap-1.5">
              {['ML', 'DL', 'NLP', 'CV', 'GenAI', 'RL'].map((d) => (
                <span key={d} className="rounded-md border border-accent/25 bg-accent/10 px-2 py-0.5 font-mono text-[11px] text-accent">{d}</span>
              ))}
            </div>
          </Spotlight>
          <Spotlight className="p-6 md:col-span-2">
            <FeatureHead icon={<PenTool />} title="ExplainLab" text="Recorded whiteboard explanations with synced code, notes and questions. Watch, pause, ask." />
            <Whiteboard />
          </Spotlight>
          <Spotlight className="p-6 md:col-span-2">
            <FeatureHead icon={<Network />} title="The Nexus skill map" text="Skill nodes across zones. Master one to unlock the next." />
            <MiniGraph />
          </Spotlight>
          <Spotlight className="p-6 md:col-span-3">
            <FeatureHead icon={<Users />} title="Study together" text="Friends, messages and co-op solve rooms with shared code and voice. Learning sticks better with company." />
          </Spotlight>
          <Spotlight className="p-6 md:col-span-3">
            <FeatureHead icon={<BarChart3 />} title="Know where you stand" text="Activity heatmaps, a weakness radar and a rating climb chart show exactly where to focus next." />
          </Spotlight>
        </div>
      </section>

      {/* ── Career paths ── */}
      <section id="paths" className="relative scroll-mt-24 overflow-hidden border-y border-hairline/[0.05] py-28">
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1fr_1.15fr]">
          <div data-reveal>
            <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-primary-bright uppercase">Career roadmaps</p>
            <h2 className="text-heading-fade font-display text-4xl font-semibold tracking-tight sm:text-5xl">From student to engineer.</h2>
            <p className="mt-4 max-w-md text-foreground-dim">
              {FACTS.paths} guided roadmaps turn what you've studied into a job-ready skill set. Each one is broken into stages
              and milestones, and you tick off topics as you go.
            </p>
            <Link to="/auth?mode=register" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary-bright hover:text-foreground">
              Pick a path <Compass className="size-4" />
            </Link>
          </div>
          <div data-paths className="grid gap-3 sm:grid-cols-2">
            {CAREER_PATHS.map((p, i) => {
              // Decorative: each path drawn part-way along its real stages.
              const filled = Math.max(1, Math.round(p.stages * [0.8, 0.5, 0.6, 0.5, 0.67, 0.5, 1, 0.67][i]))
              return (
                <div key={p.title} className="glass rounded-xl px-4 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{p.title}</span>
                    <span className="font-mono text-[10.5px] text-foreground-faint">{p.stages} stages</span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1" aria-hidden="true">
                    {Array.from({ length: p.stages }, (_, k) => (
                      <span key={k} className={cn('flex items-center gap-1', k < p.stages - 1 && 'flex-1')}>
                        <span
                          data-milestone
                          className={cn('size-2.5 shrink-0 rounded-full', k < filled ? 'bg-gradient-to-br from-primary-bright to-accent' : 'border border-hairline/[0.15]')}
                        />
                        {k < p.stages - 1 && <span className={cn('h-px flex-1', k < filled - 1 ? 'bg-primary/60' : 'bg-hairline/[0.1]')} />}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Progress ── */}
      <section className="mx-auto max-w-6xl px-5 py-28">
        <SectionHead
          eyebrow="Progress you can see"
          title="Every solve moves you up."
          sub="Earn XP scaled to difficulty and climb 11 ranks from Bit to ∞ Overflow. Streaks, daily goals and achievements keep you coming back."
        />
        <div data-ranks className="grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-11">
          {RIFT_TIERS.map((t) => (
            <div key={t.level} data-rank className="flex flex-col items-center gap-2 text-center">
              <RankGlyph level={t.level} size={52} animated={t.level === 11} title={t.name} />
              <span className="text-[11px] font-medium" style={{ color: t.color }}>{t.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="card beam-border relative isolate mx-5 mb-16 overflow-hidden !rounded-3xl px-6 py-24 text-center sm:mx-auto sm:max-w-6xl" data-reveal>
        <Sparkles className="mx-auto mb-5 size-7 text-primary-bright" />
        <h2 className="text-heading-fade mx-auto max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-6xl">Your CS degree, finally clicking.</h2>
        <p className="mx-auto mt-4 max-w-md text-foreground-dim">Create an account in ten seconds. Your first lesson is ready.</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth?mode=register"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-7 text-[15px] font-semibold text-on-accent-brand transition-transform hover:scale-[1.03]"
          >
            Start learning, it's free <ArrowRight className="size-4" />
          </Link>
          <Link to="/auth" className="glass inline-flex h-12 items-center rounded-xl px-6 text-[15px] font-medium text-foreground hover:bg-hairline/[0.06]">
            I have an account
          </Link>
        </div>
      </section>

      <footer className="border-t border-hairline/[0.05]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-8 text-xs text-foreground-faint">
          <LogoMark size={20} />
          <span>© {new Date().getFullYear()} Nexora · computer science, end to end</span>
          <nav className="ml-auto flex gap-5" aria-label="Footer">
            <a href="#curriculum" className="hover:text-foreground">Curriculum</a>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <a href="https://github.com/Gurudeep306/Nexora" target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div data-reveal className="mx-auto mb-14 max-w-2xl text-center">
      <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-primary-bright uppercase">{eyebrow}</p>
      <h2 className="text-heading-fade font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
      <p className="mt-4 text-foreground-dim">{sub}</p>
    </div>
  )
}

/** A glass card with a cursor-following spotlight. */
function Spotlight({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
      }}
      className={cn('card-neon group relative overflow-hidden', className)}
    >
      <span aria-hidden="true" className="spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">{children}</div>
    </div>
  )
}

function FeatureHead({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <>
      <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-b from-primary/20 to-primary/5 text-primary-bright [&_svg]:size-5">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-foreground-dim">{text}</p>
    </>
  )
}

function LoopStep({ n, icon, title, text, children }: { n: number; icon: React.ReactNode; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative z-10 flex size-[60px] items-center justify-center rounded-2xl border border-primary/30 bg-background/80 text-primary-bright shadow-[0_10px_30px_-10px_rgb(139_92_246/0.7)] backdrop-blur [&_svg]:size-6">
        {icon}
        <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-mono text-[10px] font-bold text-on-accent-brand">
          {n}
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-[17rem] text-sm text-foreground-dim">{text}</p>
      <div className="glass mt-5 flex h-[118px] w-full items-center justify-center overflow-hidden rounded-xl px-4">{children}</div>
    </div>
  )
}

/* ── small looping illustrations (CSS-only motion, paused for reduced motion) ── */

function MiniLesson() {
  return (
    <div className="w-full space-y-2 text-left" aria-hidden="true">
      <div className="h-2 w-2/3 rounded-full bg-foreground/25" />
      <div className="h-1.5 w-full rounded-full bg-foreground/10" />
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-1/4 rounded-full bg-foreground/10" />
        <div className="h-3.5 rounded bg-primary/25 px-1.5 font-mono text-[9px] leading-[14px] text-primary-bright">O(n log n)</div>
        <div className="h-1.5 flex-1 rounded-full bg-foreground/10" />
      </div>
      <div className="h-1.5 w-5/6 rounded-full bg-foreground/10" />
      <div className="mt-1 flex gap-1.5">
        {['A', 'B', 'C'].map((o, i) => (
          <span
            key={o}
            className={cn(
              'rounded-md border px-2 py-0.5 text-[9.5px]',
              i === 1 ? 'border-success/50 bg-success/15 text-success motion-safe:animate-pulse' : 'border-hairline/[0.1] text-foreground-faint',
            )}
          >
            {o}
          </span>
        ))}
      </div>
    </div>
  )
}

function MiniArray() {
  const v = [7, 2, 9, 4, 5, 1]
  return (
    <div className="relative" aria-hidden="true">
      <div className="flex gap-1">
        {v.map((n, i) => (
          <span key={i} className="flex size-8 items-center justify-center rounded-md border border-hairline/[0.14] bg-bg-field font-mono text-xs text-foreground">
            {n}
          </span>
        ))}
      </div>
      <span className="absolute -bottom-5 left-0 flex w-8 justify-center font-mono text-[10px] font-bold text-primary-bright motion-safe:animate-[ptr-walk_4.8s_steps(1)_infinite]">
        ▲i
      </span>
      <span className="pointer-events-none absolute top-0 left-0 size-8 rounded-md border-2 border-primary-bright shadow-[0_0_14px_rgb(139_92_246/0.7)] motion-safe:animate-[ptr-walk_4.8s_steps(1)_infinite]" />
      <style>{`@keyframes ptr-walk{0%{transform:translateX(0)}16.6%{transform:translateX(36px)}33.3%{transform:translateX(72px)}50%{transform:translateX(108px)}66.6%{transform:translateX(144px)}83.3%{transform:translateX(180px)}}`}</style>
    </div>
  )
}

function MiniVerdict() {
  return (
    <div className="w-full space-y-1.5 text-left font-mono text-[10.5px]" aria-hidden="true">
      {['Test 1', 'Test 2', 'Test 3'].map((t, i) => (
        <div
          key={t}
          className="flex items-center gap-2 text-foreground-dim motion-safe:animate-[fade-in_0.5s_ease-out_both]"
          style={{ animationDelay: `${0.3 + i * 0.35}s` }}
        >
          <CheckCircle2 className="size-3.5 text-success" /> {t}
          <span className="ml-auto text-foreground-faint">{[12, 18, 9][i]} ms</span>
        </div>
      ))}
      <div className="mt-2 flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-2 py-1 font-sans text-[11px] font-semibold text-success">
        Accepted <span className="ml-auto rounded border border-gold/40 bg-gold/10 px-1.5 font-mono text-[10px] text-gold">+120 XP</span>
      </div>
    </div>
  )
}

function MiniGraph() {
  const nodes = [
    [50, 12], [22, 40], [50, 40], [78, 40], [34, 70], [66, 70], [50, 96],
  ]
  const edges = [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [2, 5], [3, 5], [4, 6], [5, 6]]
  return (
    <svg viewBox="0 0 100 108" className="mt-2 h-24 w-full" aria-hidden="true">
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]}
          y1={nodes[a][1]}
          x2={nodes[b][0]}
          y2={nodes[b][1]}
          className={i < 4 ? 'stroke-primary' : 'stroke-foreground/20'}
          strokeWidth="0.8"
          strokeDasharray={i < 4 ? undefined : '2 2'}
        />
      ))}
      {nodes.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="5"
          className={i < 3 ? 'fill-primary stroke-primary-bright' : 'fill-background stroke-foreground/25'}
          strokeWidth="1"
        />
      ))}
    </svg>
  )
}

function Whiteboard() {
  return (
    <svg viewBox="0 0 200 70" className="mt-4 h-20 w-full" aria-hidden="true">
      <path
        d="M10 55 C 30 10, 50 10, 70 40 S 110 70, 130 30 S 170 5, 190 25"
        fill="none"
        className="wb-stroke stroke-cyan motion-safe:animate-[draw_4s_ease-in-out_infinite]"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="300"
        strokeDashoffset="300"
      />
      <circle cx="70" cy="40" r="4" className="fill-accent" />
      <circle cx="130" cy="30" r="4" className="fill-primary-bright" />
      <style>{`@keyframes draw{0%{stroke-dashoffset:300}55%,100%{stroke-dashoffset:0}}@media (prefers-reduced-motion: reduce){.wb-stroke{stroke-dashoffset:0}}`}</style>
    </svg>
  )
}
