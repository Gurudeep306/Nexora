import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Icon, type IconName } from '@/components/icon/Icon'
import { cn, timeAgo } from '@/lib/utils'
import type { Achievement, Showcase } from '@/components/social/feed/types'

export function Section({ title, icon, action, children, className }: { title: string; icon?: IconName; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('card p-4 sm:p-5', className)} aria-label={title}>
      <header className="mb-3.5 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-text-primary">
          {icon && <Icon name={icon} className="size-4 text-accent-brand" />}
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  )
}

function Stat({ icon, label, value, sub, tone }: { icon: IconName; label: string; value: ReactNode; sub?: ReactNode; tone: string }) {
  return (
    <div className="pf-fact relative overflow-hidden rounded-xl border border-border bg-bg-surface-2/50 p-3.5">
      <div className="pf-fact-label flex items-center gap-2 text-xs font-medium text-text-secondary">
        <span style={{ color: tone }} className="pf-fact-icon inline-flex">
          <Icon name={icon} className="size-3.5" />
        </span>
        {label}
      </div>
      <div className="pf-fact-value mt-1.5 font-display text-2xl font-semibold text-text-primary tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-text-muted">{sub}</div>}
    </div>
  )
}

export function StatsGrid({ s }: { s: NonNullable<Showcase['stats']> }) {
  return (
    <div className="pf-colophon grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Stat icon="bolt" label="XP" value={s.xp.toLocaleString()} sub={`Level ${s.level.level} · ${s.level.name}`} tone="var(--color-accent-brand)" />
      <Stat icon="target" label="Solved" value={s.solved.toLocaleString()} sub={`${s.attempted} attempted`} tone="var(--color-state-success)" />
      <Stat icon="flame" label="Streak" value={`${s.streak.current}d`} sub={`Best ${s.streak.best} days`} tone="var(--color-state-warning)" />
      <Stat icon="gate" label="GATE accuracy" value={s.gate.accuracy != null ? `${s.gate.accuracy}%` : '—'} sub={s.gate.attempted ? `${s.gate.correct}/${s.gate.attempted} correct` : 'No attempts yet'} tone="var(--color-state-info)" />
      <Stat icon="trophy" label="Contest rating" value={s.contests.rating ?? '—'} sub={s.contests.joined ? `${s.contests.joined} contests` : 'Unrated'} tone="var(--color-state-gold)" />
      <Stat icon="award" label="GATE tests" value={s.gate.tests} sub={s.gate.best_percentile != null ? `Best pct ${Math.round(s.gate.best_percentile)}` : s.gate.best_score != null ? `Best ${s.gate.best_score}` : 'Take a mock'} tone="var(--color-state-error)" />
    </div>
  )
}

export function LevelBar({ s }: { s: NonNullable<Showcase['stats']> }) {
  const pct = s.level.xpForNext ? Math.min(100, Math.round((s.level.xpInLevel / s.level.xpForNext) * 100)) : 100
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs text-text-secondary">
        <span>
          Level <strong className="text-text-primary">{s.level.level}</strong> · {s.level.name}
        </span>
        <span className="tabular-nums">
          {s.level.probGated && s.level.xpInLevel >= s.level.xpForNext
            ? `XP ready · solve ${Math.max(0, (s.level.probsForNext ?? 0) - (s.level.probsInLevel ?? 0))} more to rank up`
            : `${s.level.xpInLevel} / ${s.level.xpForNext} XP`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg-surface-3">
        <motion.div className="h-full rounded-full bg-accent-brand" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.2, 0.7, 0.3, 1] }} />
      </div>
    </div>
  )
}

export function DifficultyBreakdown({ d }: { d: NonNullable<Showcase['stats']>['difficulty'] }) {
  const rows = [
    { k: 'Easy', v: d.easy, c: 'var(--color-state-success)' },
    { k: 'Medium', v: d.medium, c: 'var(--color-state-warning)' },
    { k: 'Hard', v: d.hard, c: 'var(--color-state-error)' },
    { k: 'Unrated', v: d.unrated, c: 'var(--color-text-muted)' },
  ]
  const total = rows.reduce((s, r) => s + r.v, 0) || 1
  // Donut
  let acc = 0
  const R = 42
  const C = 2 * Math.PI * R
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="size-28 shrink-0 -rotate-90" role="img" aria-label={rows.map((r) => `${r.k} ${r.v}`).join(', ')}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-bg-surface-3)" strokeWidth="10" />
        {rows.map((r) => {
          const len = (r.v / total) * C
          const el = r.v ? <circle key={r.k} cx="50" cy="50" r={R} fill="none" stroke={r.c} strokeWidth="10" strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-acc} strokeLinecap="round" /> : null
          acc += len
          return el
        })}
      </svg>
      <ul className="flex-1 space-y-1.5 text-sm">
        {rows.map((r) => (
          <li key={r.k} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: r.c }} />
            <span className="flex-1 text-text-secondary">{r.k}</span>
            <span className="font-mono font-semibold text-text-primary tabular-nums">{r.v}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Radar of the top topics (falls back to bars when there are fewer than 3). */
export function TopicRadar({ topics }: { topics: { topic: string; solved: number }[] }) {
  if (topics.length < 3) {
    return topics.length ? (
      <ul className="space-y-2">
        {topics.map((t) => (
          <li key={t.topic} className="text-sm">
            <div className="flex justify-between capitalize">
              <span className="text-text-secondary">{t.topic}</span>
              <span className="font-mono text-text-primary">{t.solved}</span>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-text-muted">Solve problems to map topic mastery.</p>
    )
  }
  const n = topics.length
  const max = Math.max(...topics.map((t) => t.solved))
  const cx = 120
  const cy = 110
  const r = 78
  const pt = (i: number, f: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + Math.cos(a) * r * f, cy + Math.sin(a) * r * f] as const
  }
  const poly = topics.map((t, i) => pt(i, Math.max(0.08, t.solved / max)).join(',')).join(' ')
  return (
    <svg viewBox="-50 -5 340 230" className="mx-auto w-full max-w-md" role="img" aria-label={`Topic mastery: ${topics.map((t) => `${t.topic} ${t.solved}`).join(', ')}`}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={topics.map((_, i) => pt(i, f).join(',')).join(' ')} fill="none" stroke="var(--color-border)" strokeWidth="1" />
      ))}
      {topics.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-border)" strokeWidth="1" />
      })}
      <motion.polygon
        points={poly}
        fill="color-mix(in oklab, var(--color-accent-brand) 28%, transparent)"
        stroke="var(--color-accent-brand)"
        strokeWidth="2"
        strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
        transition={{ duration: 0.6, ease: [0.2, 0.7, 0.3, 1] }}
      />
      {topics.map((t, i) => {
        const [x, y] = pt(i, Math.max(0.08, t.solved / max))
        const [lx, ly] = pt(i, 1.2)
        return (
          <g key={t.topic}>
            <circle cx={x} cy={y} r="3" fill="var(--color-accent-brand)" />
            <text x={lx} y={ly} textAnchor={lx < cx - 5 ? 'end' : lx > cx + 5 ? 'start' : 'middle'} dominantBaseline="middle" className="fill-[var(--color-text-secondary)] text-[9.5px] capitalize">
              {t.topic.length > 14 ? `${t.topic.slice(0, 13)}…` : t.topic}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function Languages({ langs }: { langs: NonNullable<Showcase['languages']> }) {
  if (!langs.length) return <p className="text-sm text-text-muted">No submissions yet.</p>
  const total = langs.reduce((s, l) => s + l.submissions, 0)
  const tones = ['var(--color-accent-brand)', 'var(--color-state-info)', 'var(--color-state-success)', 'var(--color-state-warning)', 'var(--color-state-error)', 'var(--color-text-muted)']
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-bg-surface-3">
        {langs.map((l, i) => (
          <motion.span key={l.language} style={{ background: tones[i] }} initial={{ width: 0 }} animate={{ width: `${(l.submissions / total) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.05 }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {langs.map((l, i) => (
          <li key={l.language} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: tones[i] }} />
            <span className="flex-1 truncate text-text-secondary capitalize">{l.language}</span>
            <span className="font-mono text-xs text-text-primary tabular-nums">{Math.round((l.submissions / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const BY_ICON: Record<string, IconName> = {
  sword: 'target', fire: 'flame', shield: 'shield', dragon: 'crown', muscle: 'bolt', moon: 'moon', sunrise: 'sunrise',
  calendar: 'calendar', diamond: 'gem', flag: 'flag', globe: 'globe', lightning: 'bolt', marathon: 'route', target: 'crosshair',
  trophy: 'trophy', tags: 'tag', star: 'star', rocket: 'rocket', brain: 'brain', crown: 'crown', medal: 'medal',
}
const BY_CATEGORY: Record<string, IconName> = { streak: 'flame', solve: 'target', rating: 'trending-up', daily: 'calendar', special: 'sparkles', milestone: 'medal' }
export function achievementIcon(a: Pick<Achievement, 'icon' | 'category'>): IconName {
  return BY_ICON[a.icon] ?? BY_CATEGORY[a.category] ?? 'trophy'
}

/** A badge card that tilts toward the pointer. */
export function BadgeCard({ a, compact }: { a: Achievement; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const unlocked = !!a.unlocked_at
  const move = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--ry', `${(x - 0.5) * 14}deg`)
    el.style.setProperty('--rx', `${(0.5 - y) * 14}deg`)
    el.style.setProperty('--mx', `${x * 100}%`)
    el.style.setProperty('--my', `${y * 100}%`)
    el.style.setProperty('--glare', '1')
  }
  const leave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--glare', '0')
  }
  const pct = Math.min(100, Math.round((a.progress / Math.max(1, a.target)) * 100))
  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      title={`${a.title} — ${a.description}`}
      className={cn(
        'ng-tilt relative flex flex-col items-center rounded-xl border p-3 text-center',
        unlocked ? 'border-state-gold/30 bg-state-gold/[0.05]' : 'border-border bg-bg-surface-2/40',
      )}
    >
      <span
        className={cn('grid size-11 place-items-center rounded-full text-xl', unlocked ? 'bg-state-gold/15 text-state-gold shadow-[0_6px_20px_-8px_var(--color-state-gold)]' : 'bg-bg-surface-3 text-text-muted grayscale')}
        aria-hidden="true"
      >
        <Icon name={achievementIcon(a)} className="size-5" />
      </span>
      <p className={cn('mt-2 line-clamp-1 text-xs font-semibold', unlocked ? 'text-text-primary' : 'text-text-secondary')}>{a.title}</p>
      {!compact && (unlocked ? <p className="text-[10.5px] text-text-muted">{timeAgo(a.unlocked_at!)}</p> : <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-bg-surface-3"><div className="h-full bg-text-muted/50" style={{ width: `${pct}%` }} /></div>)}
      <span className="sr-only">{unlocked ? 'Unlocked' : `Locked, ${pct}% progress`}</span>
    </div>
  )
}

const TL_ICON: Record<string, IconName> = { solved: 'check-circle', post: 'chat', achievement: 'trophy' }
export function Timeline({ items }: { items: NonNullable<Showcase['timeline']> }) {
  if (!items.length) return <p className="text-sm text-text-muted">Nothing yet.</p>
  return (
    <ol className="relative space-y-3 border-l border-border pl-5">
      {items.map((t, i) => (
        <li key={i} className="relative">
          <span className="absolute top-0.5 -left-[29px] grid size-[18px] place-items-center rounded-full border border-border bg-bg-surface text-accent-brand">
            <Icon name={TL_ICON[t.kind] ?? 'activity'} className="size-2.5" />
          </span>
          <div className="text-sm">
            {t.link ? (
              <Link to={t.link} className="line-clamp-1 font-medium text-text-primary hover:underline">
                {t.title}
              </Link>
            ) : (
              <span className="line-clamp-1 font-medium text-text-primary">{t.title}</span>
            )}
            <span className="text-xs text-text-muted">
              {t.kind === 'solved' ? 'Solved' : t.kind === 'post' ? 'Posted' : t.kind === 'achievement' ? 'Unlocked' : t.kind.replace(/_/g, ' ')}
              {t.meta ? ` · ${t.meta}` : ''} · {timeAgo(t.at)}
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}
