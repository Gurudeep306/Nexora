import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowRight,
  Crown,
  Flame,
  GraduationCap,
  Sparkles,
  Swords,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { AnimatedNumber, Avatar, Badge, RankGlyph, XpBar } from '@/components/ui'
import { cn, formatNumber } from '@/lib/utils'
import type { StatsResponse } from './types'

/** Circular progress toward today's solve goal. */
function GoalRing({ done, goal }: { done: number; goal: number }) {
  const pct = Math.min(done / Math.max(goal, 1), 1)
  const r = 30
  const c = 2 * Math.PI * r
  const hit = done >= goal
  return (
    <div className="relative size-24 shrink-0" role="img" aria-label={`Daily goal: ${done} of ${goal} solved`}>
      <svg viewBox="0 0 72 72" className="size-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="5" opacity="0.35" />
        <motion.circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={hit ? 'var(--color-success)' : 'var(--color-primary-bright)'}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn('font-display text-xl tabular-nums', hit ? 'text-success' : 'text-foreground')}>
          {done}/{goal}
        </span>
        <span className="mt-0.5 text-[9px] tracking-widest text-foreground-faint uppercase">today</span>
      </div>
    </div>
  )
}

function StatPill({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  sub?: ReactNode
  tone: string
}) {
  return (
    <div className="glass-thin group flex items-center gap-3.5 rounded-2xl px-4 py-3.5 ring-1 ring-border-glass transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-surface-3 ring-1 ring-border transition-transform duration-200 group-hover:scale-110', tone)}>
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-0 text-[10px] font-semibold tracking-[0.14em] text-foreground-faint uppercase">{label}</p>
        <p className="mb-0 truncate font-display text-lg text-foreground tabular-nums">{value}</p>
        {sub && <p className="mb-0 mt-0.5 truncate text-[11px] text-foreground-dim">{sub}</p>}
      </div>
    </div>
  )
}

/**
 * The home hero: an immersive glass panel with an ambient aurora, the player's
 * identity in gradient display type, live progress, and the two doors into the
 * product. Everything above the fold feels like mission control.
 */
export function HomeHero({
  displayName,
  username,
  avatar,
  avatarUrl,
  stats,
  dailyGoal = 3,
  actions,
}: {
  displayName: string
  username: string
  avatar?: string | null
  avatarUrl?: string | null
  stats: StatsResponse
  dailyGoal?: number
  actions?: React.ReactNode
}) {
  const { level, title, todayStats, streak } = stats
  const hour = new Date().getHours()
  const greeting =
    hour < 5 ? 'Still grinding' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const current = streak?.current ?? 0

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl border border-border-glass bg-bg-surface"
      aria-label="Welcome"
    >
      {/* ambient aurora */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 -left-24 size-96 rounded-full bg-primary/20 blur-3xl animate-pulse-subtle" />
        <div className="absolute -right-24 -bottom-40 size-[26rem] rounded-full bg-accent/15 blur-3xl animate-pulse-subtle [animation-delay:1.2s]" />
        <div className="absolute top-1/3 left-1/2 size-72 -translate-x-1/2 rounded-full bg-cyan/10 blur-3xl animate-pulse-subtle [animation-delay:2.1s]" />
        <div className="absolute inset-0 texture-noise opacity-40" />
        {/* top hairline sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-primary-bright),var(--color-accent),transparent)] opacity-60" />
      </div>

      <div className="relative p-6 md:p-8 lg:p-9">
        {actions && <div className="absolute top-4 right-4 z-10">{actions}</div>}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          {/* identity */}
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-foreground-faint uppercase">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              {greeting}, commander
            </p>
            <div className="mt-2 flex items-center gap-4">
              <Link to="/profile" className="group relative shrink-0" aria-label="Open your profile">
                <span
                  className="absolute -inset-1 rounded-full bg-[conic-gradient(var(--color-primary),var(--color-accent),var(--color-cyan),var(--color-primary))] opacity-70 blur-[3px] transition-opacity group-hover:opacity-100"
                  aria-hidden="true"
                />
                <Avatar seed={username} avatar={avatar} src={avatarUrl} name={displayName} size="xl" className="relative" />
              </Link>
              <h1 className="text-gradient min-w-0 truncate font-display text-4xl tracking-tight md:text-5xl">
                {displayName}
              </h1>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="primary">
                <Zap aria-hidden="true" /> LVL {level.level} · {level.name}
              </Badge>
              <Badge variant="gold">
                <Sparkles aria-hidden="true" /> {title.current.title}
              </Badge>
              {current > 0 && (
                <Badge variant="warning">
                  <Flame aria-hidden="true" /> {current}-day streak
                </Badge>
              )}
            </div>
            <div className="mt-5 max-w-md">
              <XpBar xp={level.xpInLevel} nextLevelXp={level.xpForNext} level={level.level} levelName={level.name} />
              <p className="mt-2 text-xs text-foreground-dim">
                {title.next ? (
                  <>
                    Next rank <span className="text-foreground">{title.next.title}</span> —{' '}
                    <span className={cn('font-mono tabular-nums', title.xpToNext > 0 ? 'text-primary-bright' : 'text-warning')}>
                      {title.xpToNext.toLocaleString()} XP
                    </span>{' '}
                    + <span className="font-mono text-primary-bright tabular-nums">{title.probsToNext}</span> solves
                  </>
                ) : (
                  'Maximum rift level reached — you are the overflow.'
                )}
              </p>
            </div>
          </div>

          {/* progress + doors */}
          <div className="flex shrink-0 flex-col items-start gap-6 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            <div className="flex items-center gap-5">
              <motion.div
                initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <RankGlyph level={level.level} size={84} />
              </motion.div>
              <GoalRing done={todayStats.solved} goal={dailyGoal} />
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/problems"
                className="group flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent-brand glow-box-accent transition-all duration-200 hover:brightness-110"
              >
                <Swords className="size-4" aria-hidden="true" />
                Enter the Arena
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                to="/learn"
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-bg-surface-2 px-5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-border-strong hover:bg-bg-surface-3"
              >
                <GraduationCap className="size-4" aria-hidden="true" />
                Continue learning
              </Link>
            </div>
          </div>
        </div>

        {/* live stat pills with dynamic animated counters & deep progression stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatPill
            icon={Zap}
            label="Total XP"
            value={<AnimatedNumber value={stats.totalXp} />}
            sub={
              <>
                <span className="font-mono tabular-nums">{formatNumber(level.xpInLevel)}</span> /{' '}
                <span className="font-mono tabular-nums">{formatNumber(level.xpForNext)}</span> in LVL {level.level}
              </>
            }
            tone="text-primary-bright"
          />
          <StatPill
            icon={Flame}
            label="Streak"
            value={<><AnimatedNumber value={current} />d</>}
            sub={<>Best: <span className="font-mono tabular-nums">{stats.streak.best}d</span></>}
            tone="text-warning"
          />
          <StatPill
            icon={Target}
            label="Solved"
            value={<AnimatedNumber value={stats.solved} />}
            sub={
              <>
                of <span className="font-mono tabular-nums">{formatNumber(stats.total)}</span> ·{' '}
                <span className="font-mono tabular-nums">{stats.accuracy}%</span> acc
              </>
            }
            tone="text-success"
          />
          <StatPill
            icon={Crown}
            label="Rank"
            value={title.current.title}
            sub={
              title.next ? (
                <>Next in <span className="font-mono tabular-nums">{formatNumber(title.xpToNext)}</span> XP</>
              ) : (
                'Max rank reached'
              )
            }
            tone="text-gold"
          />
        </div>
      </div>
    </motion.section>
  )
}
