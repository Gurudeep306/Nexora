import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { RankBadge, RankGlyph, Sparkline } from '@/components/ui'
import { CountUp, LEVELS } from '@/components/landing/motifs'
import { LessonPreview } from '@/components/landing/LessonPreview'
import { SchedulerPreview } from '@/components/landing/SchedulerPreview'
import { GraphPreview } from '@/components/landing/GraphPreview'
import type { StatsResponse } from '@/components/hub/types'
import { cn, timeAgo } from '@/lib/utils'
import { prefetchHandlers } from '@/routes'
import { DSA_TOPICS } from '@/learn/content/dsa/syllabus'
import { isDone, type ItemState } from '@/learn/progress'
import {
  greeting,
  humanize,
  lastDays,
  resetsIn,
  startHere,
  thisWeek,
  verdictWord,
  weekSentence,
  type Continue,
  type Figure,
  type Step,
} from './today-data'
import './today.css'
import { Discover } from './Discover'
import type { DiscoverPick } from '@/lib/discover'
import { LiveFigure } from './LiveFigure'

const EASE = [0.22, 1, 0.36, 1] as const

/* ── Section reveal: rises 24px and fades in once, the first time it is seen ── */
export function Reveal({ children, className, as = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div'; 'aria-labelledby'?: string }) {
  const ref = useRef<HTMLElement>(null)
  const seen = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })
  const still = useReducedMotion()
  const Tag = as === 'div' ? motion.div : motion.section
  return (
    <Tag
      ref={ref as never}
      className={className}
      initial={still ? false : { opacity: 0, y: 24 }}
      animate={seen || still ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.7, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/* ── 1. Masthead ── */
export function Masthead({ name, streak, goal, steps, onSync, syncing, updatedAt, level }: { name: string; streak: number; goal: { done: number; of: number }; steps: Step[]; onSync: () => void; syncing: boolean; updatedAt: number | null; level?: number }) {
  const [now] = useState(() => new Date())
  const date = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const [first, second] = steps
  return (
    <header className="today-masthead">
      <p className="ed-label ed-muted m-0">
        {date} · {streak > 0 ? `Day ${streak} of your streak` : 'Start a streak today'}
      </p>
      <p className="today-goal ed-ui-sm ed-muted mt-2 mb-0">
        <span className="ed-mono ed-ink">
          {Math.min(goal.done, goal.of)} of {goal.of}
        </span>{' '}
        {goal.done >= goal.of ? 'solved today. Daily goal met.' : 'problems solved toward today’s goal.'}{' '}
        <Link to="/settings?tab=prefs" className="ed-link">
          Change goal
        </Link>
      </p>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <h1 className="ed-display-sans today-greeting m-0">
          {greeting(now)}, {name}.
        </h1>
        {level != null && (
          <Link to="/nexus?tab=ranks" className="today-rank">
            <RankBadge level={level} size="lg" sub={`Level ${level} of 11 · see the ladder`} />
          </Link>
        )}
      </div>
      {first && <p className="ed-lead today-next mt-3 mb-0">{first.line}</p>}
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        {first && (
          <Link to={first.to} {...prefetchHandlers(first.to)} className="ed-btn ed-btn-clay">
            {first.cta}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
        {second && (
          <Link to={second.to} {...prefetchHandlers(second.to)} className="ed-link ed-ui">
            {second.cta}
          </Link>
        )}
        <span className="ed-ui-sm ed-muted flex items-center gap-2 sm:ml-auto">
          <button type="button" onClick={onSync} className="ed-link cursor-pointer" aria-label="Sync your stats">
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
          {updatedAt && <span className="ed-mono text-[12px]">updated {timeAgo(updatedAt)}</span>}
        </span>
      </div>
    </header>
  )
}

/* ── 2. The spread: Continue and Today's three ── */
export function FigureFor({ figure }: { figure: Figure }) {
  if (figure === 'none') return null
  return <div className="ed-specimen today-figure">{figure === 'schedule' ? <SchedulerPreview /> : figure === 'graph' ? <GraphPreview /> : <LessonPreview />}</div>
}

export interface TodayRow {
  key: string
  line: ReactNode
  meta?: ReactNode
  to: string
  done?: boolean
}

/**
 * Everything in progress, one at a time: the title, how far along, and a real
 * animation from that chapter or lesson. It moves on by itself every few
 * seconds (not under reduced motion), holds while hovered or focused, and has
 * buttons to step through by hand.
 */
function ContinueRotator({ items }: { items: Continue[] }) {
  const [at, setAt] = useState(0)
  const [hold, setHold] = useState(false)
  const still = useReducedMotion()
  const n = items.length
  const i = n ? at % n : 0
  useEffect(() => {
    if (n < 2 || hold || still) return
    const t = window.setTimeout(() => setAt((x) => x + 1), 9000)
    return () => window.clearTimeout(t)
  }, [n, hold, still, at])
  const cur = items[i]
  if (!cur) return null
  const pct = cur.page ? (cur.page.of ? (cur.page.read / cur.page.of) * 100 : 0) : (cur.pct ?? 0)
  return (
    <div
      className="today-rotator"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setHold(false)}
      aria-roledescription="carousel"
      aria-label="In progress"
    >
      <div key={cur.to} className="today-rotator-slide" aria-live={hold ? 'polite' : 'off'}>
        <p className="ed-ui-sm ed-muted mt-4 mb-0">{cur.subject}</p>
        <Link to={cur.to} {...prefetchHandlers(cur.to)} className="today-title-link">
          <span className="ed-h2">{cur.title}</span>
        </Link>
        <div className="mt-5">
          <span className="today-progress" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </span>
          <p className="ed-mono ed-muted mt-2 mb-0 text-[12px]">
            {cur.page ? `page ${Math.min(cur.page.read + 1, cur.page.of)} of ${cur.page.of}` : `${cur.pct ?? 0}% of the subject mastered`}
          </p>
        </div>
        <LiveFigure item={cur} />
      </div>
      {n > 1 && (
        <div className="today-rotator-nav">
          <button type="button" className="ed-icon-btn" aria-label="Previous in progress" onClick={() => setAt((x) => (x - 1 + n) % n)}>
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="today-rotator-dots" role="group" aria-label="Choose what to continue">
            {items.map((it, k) => (
              <button
                key={it.to}
                type="button"
                className={cn('today-rotator-dot', k === i && 'is-on')}
                aria-label={`${it.title}, ${it.subject}`}
                aria-current={k === i ? 'true' : undefined}
                onClick={() => setAt(k)}
              />
            ))}
          </span>
          <button type="button" className="ed-icon-btn" aria-label="Next in progress" onClick={() => setAt((x) => (x + 1) % n)}>
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          <span className="ed-mono ed-muted text-[12px]">
            {i + 1} of {n}
          </span>
        </div>
      )}
    </div>
  )
}

export function Spread({ cont, rows, also = [], pool = [] }: { cont: Continue | null; rows: TodayRow[]; also?: Continue[]; pool?: DiscoverPick[] }) {
  // A newcomer (nothing to continue) gets three picks from across the site
  // that change every few hours — never the same fixed chapters.
  const path = startHere()
  const fallback: DiscoverPick[] = path.map((p) => ({ key: `dsa:${p.to}`, kind: 'chapter', title: p.title, line: `${p.pages} pages, animated step by step.`, to: p.to, area: 'DSA course' }))
  return (
    <Reveal className="ed-feature today-spread" aria-labelledby="today-continue">
      <div className="min-w-0">
        {cont ? (
          <>
            <h2 id="today-continue" className="ed-label m-0">
              Continue
            </h2>
            <ContinueRotator items={[cont, ...also].slice(0, 6)} />
            {pool.length > 0 && <Discover pool={pool} n={1} scope="home-more" label="Or try something new" className="mt-8" />}
          </>
        ) : (
          <Discover pool={pool.length ? pool : fallback} scope="home" headingId="today-continue" />
        )}
      </div>

      <div className="min-w-0">
        <h2 className="ed-label m-0">Today’s three</h2>
        <ul className="ed-rows mt-4 mb-0 list-none p-0">
          {rows.map((r) => (
            <li key={r.key}>
              <Link to={r.to} {...prefetchHandlers(r.to)} className="today-row">
                <span className="min-w-0 flex-1">
                  <span className={cn('ed-body-sm block', r.done ? 'ed-muted' : 'ed-ink')}>{r.line}</span>
                  {r.meta && <span className="ed-mono ed-muted mt-1 block text-[12px]">{r.meta}</span>}
                </span>
                {r.done ? (
                  <span className="today-done">
                    <Check className="size-4" aria-hidden="true" />
                    <span className="sr-only">Done</span>
                  </span>
                ) : (
                  <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  )
}

/* ── 3. Your ledger ── */
function Ladder({ level }: { level: StatsResponse['level'] }) {
  const ref = useRef<HTMLOListElement>(null)
  const seen = useInView(ref, { once: true, margin: '0px 0px -15% 0px' })
  const still = useReducedMotion()
  const cur = Math.max(0, Math.min(LEVELS.length - 1, level.level - 1))
  const part = level.xpForNext > 0 ? Math.min(1, level.xpInLevel / level.xpForNext) : 1
  // The eleven badges in a row: yours lit and larger, the ones behind you in
  // colour, the ones ahead faint. A line under them fills to where you are.
  return (
    <div className="today-badges">
      <ol ref={ref} className="today-badge-row m-0 list-none p-0" aria-label={`Your level: ${level.name}, ${cur + 1} of ${LEVELS.length}`}>
        {LEVELS.map((name, k) => (
          <motion.li
            key={name}
            className={cn('today-badge', k === cur && 'is-here', k > cur && 'is-ahead')}
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={seen || still ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.5, ease: EASE, delay: still ? 0 : 0.05 + k * 0.05 }}
          >
            <RankGlyph level={k + 1} size={k === cur ? 64 : 40} animated={false} />
            <span className={cn('today-badge-name', k === cur ? 'ed-ink font-semibold' : 'ed-muted')}>
              {name}
              {k === cur && <span className="sr-only"> (you are here)</span>}
            </span>
          </motion.li>
        ))}
      </ol>
      <span className="today-badge-track" aria-hidden="true">
        <motion.span
          className="today-badge-fill"
          initial={{ scaleX: still ? (cur + part) / LEVELS.length : 0 }}
          animate={{ scaleX: seen || still ? (cur + Math.max(part, 0.02)) / LEVELS.length : 0 }}
          transition={{ duration: 1, ease: EASE, delay: still ? 0 : 0.4 }}
        />
      </span>
    </div>
  )
}

/** A running total from a starting value. */
function running(start: number, steps: number[]): number[] {
  const out: number[] = []
  steps.reduce((acc, x) => {
    const next = acc + x
    out.push(next)
    return next
  }, start)
  return out
}

export function Ledger({ stats, items }: { stats: StatsResponse; items: Record<string, ItemState> }) {
  const days = useMemo(() => lastDays(30, stats, items), [stats, items])
  const cumSolved = running(Math.max(0, stats.solved - days.reduce((a, d) => a + d.solved, 0)), days.map((d) => d.solved))
  const cumXp = running(Math.max(0, stats.totalXp - days.reduce((a, d) => a + d.xp, 0)), days.map((d) => d.xp))
  const lvl = stats.level
  const nextName = LEVELS[Math.min(LEVELS.length - 1, lvl.level)]
  const xpLeft = Math.max(0, lvl.xpForNext - lvl.xpInLevel)
  const solvesLeft = Math.max(0, lvl.probsForNext - lvl.probsInLevel)
  const figures: { label: string; value: ReactNode; sub: string; spark: number[] }[] = [
    { label: 'XP', value: <CountUp to={stats.totalXp} />, sub: 'XP a day, last 30 days', spark: days.map((d) => d.xp) },
    { label: 'Streak', value: <CountUp to={stats.streak.current} suffix={stats.streak.current === 1 ? ' day' : ' days'} />, sub: `best ${stats.streak.best} · solves a day, last 30 days`, spark: days.map((d) => d.solved) },
    { label: 'Solved', value: <CountUp to={stats.solved} />, sub: `${Math.round(stats.accuracy)}% accuracy · running total`, spark: cumSolved },
    { label: 'Rank', value: lvl.name, sub: 'total XP, last 30 days', spark: cumXp },
  ]
  return (
    <Reveal aria-labelledby="today-ledger">
      <p className="ed-label ed-muted m-0">Your ledger</p>
      <h2 id="today-ledger" className="ed-h2 mt-3 mb-0">
        How you’re doing
      </h2>
      <dl className="today-figures mt-10 mb-0">
        {figures.map((f) => (
          <div key={f.label} className="today-figure-col">
            <dt className="ed-label ed-muted">{f.label}</dt>
            <dd className="m-0">
              <span className="ed-figure mt-4 block">{f.value}</span>
              <Sparkline values={f.spark} className="mt-4" />
              <span className="ed-caption ed-muted mt-2 block">{f.sub}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="today-ladder mt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center">
        <div>
          <p className="ed-label ed-muted m-0">The level ladder</p>
          <p className="ed-body mt-3 mb-0">
            You are a <span className="ed-ink">{lvl.name}</span>, level {lvl.level} of {LEVELS.length}.
          </p>
          {lvl.level < LEVELS.length && (
            <p className="ed-mono ed-muted mt-3 mb-0 text-[13px]">
              {xpLeft.toLocaleString('en-IN')} XP{solvesLeft ? ` and ${solvesLeft} solves` : ''} to {nextName}
            </p>
          )}
        </div>
        <Ladder level={lvl} />
      </div>
    </Reveal>
  )
}

/* ── 4. This week, in small multiples ── */
export function Week({ stats, items }: { stats: StatsResponse; items: Record<string, ItemState> }) {
  const week = useMemo(() => thisWeek(stats, items), [stats, items])
  const ref = useRef<HTMLOListElement>(null)
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const still = useReducedMotion()
  const cap = 10
  return (
    <Reveal aria-labelledby="today-week">
      <p className="ed-label ed-muted m-0">This week</p>
      <h2 id="today-week" className="ed-h2 mt-3 mb-0">
        {weekSentence(week)}
      </h2>
      <ol ref={ref} className="today-week mt-8 mb-0 list-none p-0" aria-label="Problems solved and pages read, Monday to Sunday">
        {week.map((d, i) => {
          const marks = [...Array(Math.min(cap, d.solved)).fill('s'), ...Array(Math.min(cap - Math.min(cap, d.solved), d.lessons)).fill('l')]
          return (
            <li key={d.date} className={cn('today-day', d.today && 'is-today', d.future && 'is-future')}>
              <span className="sr-only">
                {d.label}: {d.future ? 'not yet' : `${d.solved} solved, ${d.lessons} pages read`}
              </span>
              <span className="today-stack" aria-hidden="true">
                {marks.map((m, k) => (
                  <motion.span
                    key={k}
                    className={m === 's' ? 'is-solved' : 'is-read'}
                    initial={{ opacity: still ? 1 : 0, scaleX: still ? 1 : 0.2 }}
                    animate={seen || still ? { opacity: 1, scaleX: 1 } : undefined}
                    transition={{ duration: 0.4, ease: EASE, delay: still ? 0 : i * 0.08 + k * 0.03 }}
                  />
                ))}
              </span>
              <span className="today-day-label ed-ui-sm" aria-hidden="true">
                {d.label}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="ed-caption ed-muted mt-4 mb-0 flex flex-wrap gap-x-5 gap-y-1">
        <span className="flex items-center gap-2">
          <span className="today-key is-solved" aria-hidden="true" /> a problem solved
        </span>
        <span className="flex items-center gap-2">
          <span className="today-key is-read" aria-hidden="true" /> a page read
        </span>
      </p>
    </Reveal>
  )
}

/* ── 5. The rooms ── */
export interface Room {
  kicker: string
  name: string
  to: string
  live: ReactNode
  links: { label: string; to: string }[]
}

export function Rooms({ rooms }: { rooms: Room[] }) {
  return (
    <Reveal aria-labelledby="today-rooms">
      <p className="ed-label ed-muted m-0">The rooms</p>
      <h2 id="today-rooms" className="ed-h2 mt-3 mb-0">
        Everywhere you can go
      </h2>
      <ul className="today-rooms mt-10 mb-0 list-none p-0">
        {rooms.map((r) => (
          <li key={r.kicker} className="ed-card today-room">
            <p className="ed-label ed-muted m-0">{r.kicker}</p>
            <h3 className="ed-serif today-room-name mt-3 mb-0">
              <Link to={r.to} {...prefetchHandlers(r.to)} className="today-room-link">
                {r.name}
              </Link>
            </h3>
            <p className="ed-body-sm ed-ink-2 mt-2 mb-0">{r.live}</p>
            {r.links.length > 0 && (
              <p className="ed-ui-sm mt-auto mb-0 flex flex-wrap gap-x-4 gap-y-1 pt-6">
                {r.links.map((l) => (
                  <Link key={l.to} to={l.to} {...prefetchHandlers(l.to)} className="ed-link">
                    {l.label}
                  </Link>
                ))}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Reveal>
  )
}

/* ── 6. Field notes ── */
interface Note {
  at: number
  text: ReactNode
  to?: string
  verdict?: ReturnType<typeof verdictWord>
}

export function FieldNotes({ stats, items }: { stats: StatsResponse; items: Record<string, ItemState> }) {
  const notes = useMemo<Note[]>(() => {
    const out: Note[] = []
    for (const s of stats.recent ?? []) {
      const at = Date.parse(s.submitted_at)
      if (!at) continue
      const v = verdictWord(s.verdict)
      out.push({
        at,
        to: '/submissions',
        verdict: v,
        text: (
          <>
            {v.tone === 'success' ? 'Solved' : 'Tried'} <em>{s.title}</em>
            {s.language ? ` in ${s.language}` : ''}
          </>
        ),
      })
    }
    for (const [k, v] of Object.entries(items)) {
      if (!k.startsWith('page:') || !isDone(v) || !v.doneAt) continue
      const [topic, page] = k.slice(5).split('/')
      const t = DSA_TOPICS.find((x) => x.id === topic)
      out.push({
        at: Date.parse(v.doneAt),
        to: `/learn/dsa/${topic}/${page}`,
        text: (
          <>
            Read <em>{humanize(page ?? '')}</em>
            {t ? ` in ${t.title}` : ''}
          </>
        ),
      })
    }
    return out.sort((a, b) => b.at - a.at).slice(0, 8)
  }, [stats, items])

  return (
    <Reveal aria-labelledby="today-notes">
      <p className="ed-label ed-muted m-0">Field notes</p>
      <h2 id="today-notes" className="ed-h2 mt-3 mb-0">
        What you did lately
      </h2>
      {notes.length === 0 ? (
        <p className="ed-body-sm ed-ink-2 mt-6 mb-0">
          Nothing here yet. Solve a problem or read a page and it is written down here.{' '}
          <Link to="/problems" className="ed-link">
            Find a problem
          </Link>
        </p>
      ) : (
        <ol className="today-notes ed-rows mt-8 mb-0 list-none p-0">
          {notes.map((n, i) => (
            <li key={i}>
              <Link to={n.to ?? '#'} className="today-note">
                <span className="ed-mono ed-muted today-note-time">{timeAgo(n.at)}</span>
                <span className="ed-body-sm min-w-0 flex-1">{n.text}</span>
                {n.verdict && <span className={cn('ed-ui-sm today-verdict', `is-${n.verdict.tone}`)}>{n.verdict.word}</span>}
              </Link>
            </li>
          ))}
        </ol>
      )}
      <p className="ed-ui-sm mt-6 mb-0">
        <Link to="/submissions" className="ed-link">
          Every submission
        </Link>
      </p>
    </Reveal>
  )
}

/* ── A ticking "resets in" for the daily challenge ── */
export function ResetsIn() {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 60_000)
    return () => clearInterval(t)
  }, [])
  return <>resets in {resetsIn()}</>
}
