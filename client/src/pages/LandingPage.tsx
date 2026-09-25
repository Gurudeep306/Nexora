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
  BrainCircuit,
  Code2,
  Flame,
  Globe2,
  Network,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { RiftBackground } from '@/components/fx/RiftBackground'
import { LogoMark, Wordmark } from '@/components/brand/Logo'
import { TypingEditor } from '@/components/auth/AuthShowcase'
import { AnimatedNumber, Avatar, RankGlyph, RIFT_TIERS } from '@/components/ui'
import { OAUTH_KEY, useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const JUDGES = ['Codeforces', 'CodeChef', 'AtCoder', 'LeetCode', 'SPOJ', 'Project Euler']
const LANGS = ['C++20', 'Python 3', 'Java', 'Rust', 'Go', 'Kotlin', 'TypeScript', 'C#', 'Swift', 'Haskell', 'Scala', 'Ruby']

interface LeaderRow {
  username: string
  display_name?: string
  avatar?: string | null
  avatar_url?: string | null
  total_xp: number
  solved?: number
}

export default function LandingPage() {
  const { user, loading, oauthPending } = useAuth()
  const root = useRef<HTMLDivElement>(null)
  const [problemCount, setProblemCount] = useState(0)
  const [leaders, setLeaders] = useState<LeaderRow[]>([])

  useEffect(() => {
    api.get<{ total: number }>('/api/problems', { query: { limit: 1 } }).then((r) => setProblemCount(r.total)).catch(() => {})
    api
      .get<{ leaderboard: LeaderRow[] }>('/api/leaderboard', { query: { limit: 5 } })
      .then((r) => setLeaders((r.leaderboard ?? []).filter((l) => l.total_xp > 0).slice(0, 5)))
      .catch(() => {})
  }, [])

  // Buttery scrolling (Lenis) wired into GSAP's ticker so ScrollTrigger stays in sync.
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
        // Hero product shot tilts flat as you scroll (Linear-style).
        gsap.fromTo(
          '[data-hero-shot]',
          { rotateX: 22, y: 40, scale: 0.94 },
          {
            rotateX: 0,
            y: 0,
            scale: 1,
            ease: 'none',
            scrollTrigger: { trigger: '[data-hero-shot]', start: 'top 95%', end: 'top 35%', scrub: true },
          },
        )
        // Section reveals
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.from(el, {
            y: 36,
            opacity: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%' },
          })
        })
        // Staggered bento cards
        gsap.from('[data-bento] > *', {
          y: 40,
          opacity: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: '[data-bento]', start: 'top 80%' },
        })
        // Rank ladder climbs in
        gsap.from('[data-rank]', {
          y: 60,
          opacity: 0,
          scale: 0.6,
          duration: 0.7,
          stagger: 0.06,
          ease: 'back.out(1.8)',
          scrollTrigger: { trigger: '[data-ranks]', start: 'top 80%' },
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

  return (
    <div ref={root} className="relative min-h-dvh overflow-x-clip bg-background text-foreground">
      {/* ── Nav ── */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto mt-3 flex h-14 max-w-6xl items-center gap-6 rounded-2xl px-4 sm:px-5 glass mx-3 sm:mx-auto">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Nexora home">
            <LogoMark size={28} />
            <Wordmark className="text-[15px]" />
          </Link>
          <nav className="hidden items-center gap-6 text-[13px] text-foreground-dim md:flex" aria-label="Sections">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#ranks" className="transition-colors hover:text-foreground">Ranks</a>
            <a href="#leaderboard" className="transition-colors hover:text-foreground">Leaderboard</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/auth" className="hidden h-9 items-center rounded-lg px-3 text-[13px] font-medium text-foreground-dim transition-colors hover:text-foreground sm:flex">
              Sign in
            </Link>
            <Link
              to="/auth?mode=register"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-[13px] font-semibold text-black transition-transform hover:scale-[1.03]"
            >
              Start free <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative isolate overflow-hidden pt-36 pb-24 sm:pt-44">
        <RiftBackground className="-z-10" />
        <div className="aurora -z-10 opacity-45" aria-hidden="true">
          <span className="a1" />
          <span className="a2" />
          <span className="a3" />
        </div>
        <div className="absolute inset-x-0 bottom-0 -z-10 h-64 bg-gradient-to-b from-transparent to-background" aria-hidden="true" />
        <div className="mx-auto max-w-6xl px-5 text-center">
          <motion.a
            href="#features"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass mx-auto inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs text-foreground-dim hover:text-foreground"
          >
            <span className="rounded-full bg-gradient-to-r from-primary to-accent px-2 py-0.5 text-[10.5px] font-semibold text-white">NEW</span>
            AI tutor, battles & live solve rooms
            <ArrowRight className="size-3" />
          </motion.a>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-heading-fade mx-auto mt-7 max-w-5xl font-display text-[42px] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-7xl lg:text-[84px]"
          >
            Competitive programming, <span className="text-gradient">levelled up.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 max-w-2xl text-base text-foreground-dim sm:text-lg"
          >
            One arena for every judge. Solve {problemCount ? problemCount.toLocaleString() : '27,000+'} problems in 30+ languages,
            climb 11 rift ranks, train with an AI tutor and race your friends in real time.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to="/auth?mode=register"
              className="sheen group flex h-12 items-center gap-2 rounded-xl bg-gradient-to-b from-[#9d74ff] to-primary px-6 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_0_0_1px_rgb(139_92_246/0.6),0_14px_40px_-10px_rgb(139_92_246/0.9)] transition-transform hover:scale-[1.03]"
            >
              Enter the rift <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link to="/auth" className="glass flex h-12 items-center gap-2 rounded-xl px-6 text-[15px] font-medium text-foreground hover:bg-white/[0.06]">
              <GithubMark /> Sign in with GitHub
            </Link>
          </motion.div>
          <p className="mt-4 text-xs text-foreground-faint">Free forever · no card · your progress stays yours</p>
        </div>

        {/* Product shot */}
        <div className="mx-auto mt-20 max-w-5xl px-5 [perspective:1400px]">
          <div data-hero-shot className="origin-top [transform-style:preserve-3d]">
            <HeroShot />
          </div>
        </div>
      </section>

      {/* ── Judges marquee ── */}
      <section className="border-y border-white/[0.05] bg-white/[0.01] py-8" aria-label="Supported judges">
        <p className="mb-5 text-center text-[11px] font-semibold tracking-[0.18em] text-foreground-faint uppercase">
          Problems synced from the judges you already use
        </p>
        <Marquee items={JUDGES} />
      </section>

      {/* ── Stats ── */}
      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-5 py-20 md:grid-cols-4" data-reveal>
        {[
          { v: problemCount || 27718, s: '', l: 'problems in the library', i: Swords },
          { v: 30, s: '+', l: 'languages on the judge', i: Code2 },
          { v: 6, s: '', l: 'platforms, one profile', i: Globe2 },
          { v: 11, s: '', l: 'rift ranks to climb', i: Trophy },
        ].map(({ v, s, l, i: Icon }) => (
          <div key={l} className="px-4 py-6 text-center">
            <Icon className="mx-auto mb-3 size-5 text-primary-bright" />
            <p className="text-heading-fade font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              <AnimatedNumber value={v} />
              {s}
            </p>
            <p className="mt-2 text-sm text-foreground-faint">{l}</p>
          </div>
        ))}
      </section>

      {/* ── Features bento ── */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-28">
        <SectionHead eyebrow="Everything in one arena" title="Built for people who grind." sub="Every tool a competitive programmer needs, wired together so your progress compounds." />
        <div data-bento className="grid gap-4 md:grid-cols-6">
          <Bento className="md:col-span-4" icon={<Code2 />} title="A real judge, in your browser" text="Monaco editor with Vim mode, error lens and templates. Run against samples, submit in 30+ languages, get the verdict in seconds.">
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {LANGS.map((l) => (
                <span key={l} className="rounded-md border border-white/[0.06] bg-black/30 px-2 py-1.5 text-center font-mono text-[11px] text-foreground-dim">{l}</span>
              ))}
            </div>
          </Bento>
          <Bento className="md:col-span-2" icon={<BrainCircuit />} title="AI tutor" text="Stuck? Get hints that teach the idea instead of dumping the answer.">
            <div className="mt-5 space-y-2 text-xs">
              <div className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-primary/20 px-3 py-2 text-foreground">Why is my DP TLE?</div>
              <div className="w-fit max-w-[90%] rounded-xl rounded-bl-sm border border-white/[0.06] bg-black/30 px-3 py-2 text-foreground-dim">
                Your inner loop recomputes prefix sums — cache them and it drops to O(n).
              </div>
            </div>
          </Bento>
          <Bento className="md:col-span-2" icon={<Network />} title="The Nexus skill map" text="30 skill nodes across 11 zones. Master one to unlock the next.">
            <MiniGraph />
          </Bento>
          <Bento className="md:col-span-2" icon={<BarChart3 />} title="Deep analytics" text="Rating climb, weakness radar, grind hours and personal bests.">
            <MiniBars />
          </Bento>
          <Bento className="md:col-span-2" icon={<Users />} title="Squads & solve rooms" text="Friends, DMs and co-op rooms over realtime sockets.">
            <div className="mt-5 flex -space-x-2">
              {['nova', 'byte', 'rift', 'kai', 'zen'].map((n) => (
                <Avatar key={n} seed={n} name={n} size="sm" className="rounded-full ring-2 ring-surface" ring={false} />
              ))}
              <span className="ml-3 self-center text-xs text-success">● 5 online</span>
            </div>
          </Bento>
          <Bento className="md:col-span-3" icon={<Swords />} title="AI battles" text="Race a machine opponent tuned to your level. Beat its time, take the XP." />
          <Bento className="md:col-span-3" icon={<Flame />} title="Streaks, goals & daily challenges" text="Three fresh problems every day, a daily goal ring and streaks that keep you coming back." />
        </div>
      </section>

      {/* ── Ranks ── */}
      <section id="ranks" className="relative scroll-mt-24 overflow-hidden border-y border-white/[0.05] py-28">
        <div className="dot-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="11 rift ranks" title="From Bit to ∞ Overflow." sub="Every solve earns XP scaled to difficulty. Each rank has its own sigil — wear it on your profile, the leaderboard and in every room you join." />
          <div data-ranks className="mt-4 grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-11">
            {RIFT_TIERS.map((t) => (
              <div key={t.level} data-rank className="flex flex-col items-center gap-2 text-center">
                <RankGlyph level={t.level} size={56} animated={t.level === 11} title={t.name} />
                <span className="text-[11px] font-medium" style={{ color: t.color }}>{t.name}</span>
                <span className="font-mono text-[10px] text-foreground-faint">LVL {t.level}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Leaderboard teaser ── */}
      <section id="leaderboard" className="mx-auto grid max-w-6xl scroll-mt-24 items-center gap-12 px-5 py-28 lg:grid-cols-2">
        <div data-reveal>
          <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-primary-bright uppercase">Live leaderboard</p>
          <h2 className="text-heading-fade font-display text-4xl font-semibold tracking-tight sm:text-5xl">Your name belongs up here.</h2>
          <p className="mt-4 max-w-md text-foreground-dim">Ranked by each player's own XP. Every rating bracket you conquer, every streak day, every AC counts.</p>
          <Link to="/auth?mode=register" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary-bright hover:text-white">
            Claim your spot <ArrowRight className="size-4" />
          </Link>
        </div>
        <div data-reveal className="glass overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5 text-sm font-semibold">
            <Trophy className="size-4 text-gold" /> Top of the rift
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {(leaders.length ? leaders : PLACEHOLDER_LEADERS).map((l, i) => (
              <li key={l.username} className="flex items-center gap-3 px-5 py-3">
                <span className={cn('w-5 font-mono text-sm', i === 0 ? 'text-gold' : i === 1 ? 'text-foreground' : i === 2 ? 'text-streak' : 'text-foreground-faint')}>
                  {i + 1}
                </span>
                <Avatar seed={l.username} avatar={l.avatar} src={l.avatar_url} name={l.display_name || l.username} size="sm" ring={false} />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{l.display_name || l.username}</span>
                <span className="flex items-center gap-1 font-mono text-xs text-primary-bright tabular-nums">
                  <Zap className="size-3" />
                  {Math.round(l.total_xp).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="beam-border relative isolate mx-5 mb-16 overflow-hidden rounded-3xl border border-white/[0.06] px-6 py-24 text-center sm:mx-auto sm:max-w-6xl" data-reveal>
        <RiftBackground className="-z-10" grid={false} intensity={0.9} />
        <Sparkles className="mx-auto mb-5 size-7 text-primary-bright" />
        <h2 className="text-heading-fade mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-6xl">The rift is open.</h2>
        <p className="mx-auto mt-4 max-w-md text-foreground-dim">Create an account in ten seconds. Your first AC is waiting.</p>
        <Link
          to="/auth?mode=register"
          className="mt-9 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-[15px] font-semibold text-black transition-transform hover:scale-[1.03]"
        >
          Get started — it's free <ArrowRight className="size-4" />
        </Link>
      </section>

      <footer className="border-t border-white/[0.05]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-8 text-xs text-foreground-faint">
          <LogoMark size={20} />
          <span>© {new Date().getFullYear()} Nexora · built for competitive programmers</span>
          <nav className="ml-auto flex gap-5" aria-label="Footer">
            <a href="#features" className="hover:text-foreground">Features</a>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <a href="https://github.com/Gurudeep306/Nexora" target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

const PLACEHOLDER_LEADERS: LeaderRow[] = [
  { username: 'nova', total_xp: 48210 },
  { username: 'bytewolf', total_xp: 41200 },
  { username: 'riftrunner', total_xp: 36540 },
  { username: 'kai', total_xp: 30120 },
  { username: 'zenith', total_xp: 25880 },
]

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div data-reveal className="mx-auto mb-12 max-w-2xl text-center">
      <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-primary-bright uppercase">{eyebrow}</p>
      <h2 className="text-heading-fade font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
      <p className="mt-4 text-foreground-dim">{sub}</p>
    </div>
  )
}

function Bento({
  className,
  icon,
  title,
  text,
  children,
}: {
  className?: string
  icon: React.ReactNode
  title: string
  text: string
  children?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
      }}
      className={cn('card-neon group relative overflow-hidden p-6', className)}
    >
      <span aria-hidden="true" className="spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-b from-primary/20 to-primary/5 text-primary-bright [&_svg]:size-5">
          {icon}
        </div>
        <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 text-sm text-foreground-dim">{text}</p>
        {children}
      </div>
    </div>
  )
}

function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items, ...items]
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
      <div className="flex w-max animate-[marquee_28s_linear_infinite] gap-14 pr-14 hover:[animation-play-state:paused]">
        {[...row, ...row].map((j, i) => (
          <span key={i} className="font-display text-xl font-semibold whitespace-nowrap text-foreground-faint/70 transition-colors hover:text-foreground">
            {j}
          </span>
        ))}
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
    <svg viewBox="0 0 100 108" className="mt-4 h-32 w-full" aria-hidden="true">
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke={i < 4 ? '#8b5cf6' : '#353542'} strokeWidth="0.8" strokeDasharray={i < 4 ? undefined : '2 2'} />
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill={i < 3 ? '#8b5cf6' : '#18181f'} stroke={i < 3 ? '#c4b5fd' : '#353542'} strokeWidth="1" />
      ))}
    </svg>
  )
}

function MiniBars() {
  const bars = [30, 45, 38, 60, 52, 75, 68, 90]
  return (
    <div className="mt-5 flex h-24 items-end gap-1.5">
      {bars.map((h, i) => (
        <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/40 to-cyan/80" style={{ height: `${h}%` }} />
      ))}
    </div>
  )
}

function HeroShot() {
  return (
    <div className="glass overflow-hidden rounded-2xl p-1.5 shadow-[0_40px_120px_-30px_rgb(139_92_246/0.6)]">
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0c0c11]">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="mx-auto rounded-md bg-white/[0.04] px-3 py-0.5 font-mono text-[11px] text-foreground-faint">nexora.app/solve</span>
        </div>
        <div className="grid text-left md:grid-cols-[1fr_1.15fr]">
          <div className="hidden border-r border-white/[0.06] p-5 md:block">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-cyan/25 bg-cyan/[0.08] px-1.5 text-[10px] font-semibold text-cyan">CODEFORCES</span>
              <span className="font-mono text-[11px] text-foreground-faint">1400</span>
            </div>
            <h3 className="mt-3 font-display text-xl font-semibold">Frog Jump</h3>
            <p className="mt-3 text-[13px] leading-relaxed text-foreground-dim">
              There are <span className="font-mono text-foreground">n</span> stones. A frog on stone <span className="font-mono text-foreground">i</span> can jump to <span className="font-mono text-foreground">i+1</span> or <span className="font-mono text-foreground">i+2</span>, paying the height difference. Find the minimum total cost to reach the last stone.
            </p>
            <div className="mt-4 rounded-lg border border-white/[0.06] bg-black/30 p-3 font-mono text-[12px] text-foreground-dim">
              <p className="mb-1 text-[10px] tracking-wider text-foreground-faint uppercase">Sample</p>
              4<br />10 30 40 20
            </div>
            <div className="mt-4 flex gap-2">
              {['dp', 'greedy'].map((t) => (
                <span key={t} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] text-foreground-faint">{t}</span>
              ))}
            </div>
          </div>
          <div className="p-3">
            <TypingEditor />
          </div>
        </div>
      </div>
    </div>
  )
}

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}
