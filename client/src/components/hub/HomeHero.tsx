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
import { AnimatedNumber, Avatar, Badge, XpBar } from '@/components/ui'
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
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-border)" strokeWidth="6" />
        <motion.circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={hit ? 'var(--color-state-success)' : 'var(--color-accent-brand)'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn('text-xl font-bold tabular-nums', hit ? 'text-state-success' : 'text-text-primary')}>
          {done}/{goal}
        </span>
        <span className="mt-1 text-[10px] font-medium text-text-muted">today</span>
      </div>
    </div>
  )
}

/** One stat, styled like the feature tiles on the Learn page. */
function StatTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  sub?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-bg-surface-2 p-3.5 ring-1 ring-border">
      <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-accent-brand/12 text-accent-brand sm:flex">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-0 text-[12px] font-medium text-text-muted">{label}</p>
        <p className="mb-0 truncate text-[20px] leading-tight font-bold text-text-primary tabular-nums">{value}</p>
        {sub && <p className="mb-0 truncate text-[11.5px] text-text-muted">{sub}</p>}
      </div>
    </div>
  )
}

/**
 * The home hero: who you are, where you stand, and the two doors into the
 * product — in the same card language as the rest of the app.
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
    hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const current = streak?.current ?? 0

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="card relative overflow-hidden p-0"
      aria-label="Welcome"
    >
      <div className="p-6 md:p-8">
        {actions && <div className="absolute top-4 right-4 z-10">{actions}</div>}
        <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          {/* identity */}
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-accent-brand uppercase">{greeting}</p>
            <div className="flex items-center gap-4">
              <Link to="/profile" className="shrink-0 rounded-full ring-2 ring-accent-brand/25 transition hover:ring-accent-brand/60" aria-label="Open your profile">
                <Avatar seed={username} avatar={avatar} src={avatarUrl} name={displayName} size="xl" />
              </Link>
              <h1 className="mb-0 min-w-0 truncate !text-[28px] font-bold tracking-tight text-text-primary sm:!text-[32px]">
                {displayName}
              </h1>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="primary">
                <Zap aria-hidden="true" /> Level {level.level} · {level.name}
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
              <p className="mt-2 mb-0 text-[13px] text-text-muted">
                {title.next ? (
                  <>
                    Next rank <span className="font-semibold text-text-primary">{title.next.title}</span>:{' '}
                    {title.xpToNext.toLocaleString()} XP and {title.probsToNext} more solves
                  </>
                ) : (
                  'You have reached the highest rank.'
                )}
              </p>
            </div>
          </div>

          {/* progress + doors */}
          <div className="flex shrink-0 flex-col items-start gap-5 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            <GoalRing done={todayStats.solved} goal={dailyGoal} />
            <div className="flex flex-wrap items-center gap-2.5">
              <Link to="/problems" className="btn-primary group inline-flex items-center gap-2 !no-underline">
                <Swords className="size-4" aria-hidden="true" />
                Solve problems
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link to="/learn" className="btn-secondary inline-flex items-center gap-2 !no-underline">
                <GraduationCap className="size-4" aria-hidden="true" />
                Continue learning
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            icon={Zap}
            label="Total XP"
            value={<AnimatedNumber value={stats.totalXp} />}
            sub={`${formatNumber(level.xpInLevel)} / ${formatNumber(level.xpForNext)} this level`}
          />
          <StatTile
            icon={Flame}
            label="Streak"
            value={<><AnimatedNumber value={current} /> {current === 1 ? 'day' : 'days'}</>}
            sub={`Best: ${stats.streak.best} ${stats.streak.best === 1 ? 'day' : 'days'}`}
          />
          <StatTile
            icon={Target}
            label="Solved"
            value={<AnimatedNumber value={stats.solved} />}
            sub={`${stats.accuracy}% accuracy`}
          />
          <StatTile
            icon={Crown}
            label="Rank"
            value={title.current.title}
            sub={title.next ? `${formatNumber(title.xpToNext)} XP to ${title.next.title}` : 'Highest rank'}
          />
        </div>
      </div>
    </motion.section>
  )
}
