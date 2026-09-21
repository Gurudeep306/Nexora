import { motion } from 'motion/react'
import { Flame, Sparkles, Target, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, Badge, Card, RankGlyph, XpBar } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { StatsResponse } from './types'

/** Circular progress toward today's solve goal. */
function GoalRing({ done, goal }: { done: number; goal: number }) {
  const pct = Math.min(done / Math.max(goal, 1), 1)
  const r = 26
  const c = 2 * Math.PI * r
  const hit = done >= goal
  return (
    <div className="relative size-20 shrink-0" role="img" aria-label={`Daily goal: ${done} of ${goal} solved`}>
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="6" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={hit ? 'var(--color-success)' : 'var(--color-primary-bright)'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn('font-display text-lg tabular-nums', hit ? 'text-success' : 'text-foreground')}>
          {done}/{goal}
        </span>
        <span className="mt-0.5 text-[9px] tracking-wider text-foreground-faint uppercase">today</span>
      </div>
    </div>
  )
}

export function GreetingHero({
  displayName,
  username,
  avatar,
  avatarUrl,
  stats,
  dailyGoal = 3,
}: {
  displayName: string
  username: string
  avatar?: string | null
  avatarUrl?: string | null
  stats: StatsResponse
  dailyGoal?: number
}) {
  const { level, title, todayStats, streak } = stats
  const hour = new Date().getHours()
  const greeting =
    hour < 5 ? 'Still grinding' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const current = streak?.current ?? 0

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
      <Card glow className="relative overflow-hidden p-5 md:p-6">
        {/* ambient sweep */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Link to="/profile" className="group relative shrink-0" aria-label="Open your profile">
              <span
                className="absolute -inset-1 rounded-full bg-[conic-gradient(var(--color-primary),var(--color-accent),var(--color-cyan),var(--color-primary))] opacity-70 blur-[2px] transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              />
              <Avatar seed={username} avatar={avatar} src={avatarUrl} name={displayName} size="xl" className="relative" />
            </Link>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">{greeting}, commander</p>
              <h2 className="mt-0.5 truncate font-display text-xl tracking-wide text-foreground md:text-2xl">{displayName}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
            </div>
          </div>

          <div className="flex items-center gap-5">
            <motion.div
              initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              className="hidden sm:block"
            >
              <RankGlyph level={level.level} size={76} />
            </motion.div>
            <div className="w-full min-w-0 space-y-2.5 lg:w-72">
              <XpBar xp={level.xpInLevel} nextLevelXp={level.xpForNext} level={level.level} levelName={level.name} />
              <p className="text-xs text-foreground-dim">
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
              <p className="flex items-center gap-1.5 text-xs text-foreground-faint">
                <Target className="size-3.5 text-primary-bright" aria-hidden="true" />
                <span className="font-mono text-primary-bright tabular-nums">{todayStats.xp}</span> XP ·{' '}
                <span className="font-mono text-foreground-dim tabular-nums">{todayStats.attempted}</span> attempts today
              </p>
            </div>
            <GoalRing done={todayStats.solved} goal={dailyGoal} />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
