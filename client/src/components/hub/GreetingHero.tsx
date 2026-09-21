import { motion } from 'motion/react'
import { Sparkles, Zap } from 'lucide-react'
import { Avatar, Badge, Card, XpBar } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { StatsResponse } from './types'

export function GreetingHero({
  displayName,
  avatarUrl,
  stats,
}: {
  displayName: string
  avatarUrl?: string | null
  stats: StatsResponse
}) {
  const { level, title, todayStats } = stats
  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'Still grinding' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <Card glow className="overflow-hidden p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar src={avatarUrl} name={displayName} size="xl" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
                {greeting}, commander
              </p>
              <h2 className="mt-0.5 truncate font-display text-xl tracking-wide text-foreground md:text-2xl">
                {displayName}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="primary">
                  <Zap aria-hidden="true" /> LVL {level.level} · {level.name}
                </Badge>
                <Badge variant="gold">
                  <Sparkles aria-hidden="true" /> {title.current.title}
                </Badge>
              </div>
            </div>
          </div>

          <div className="w-full space-y-3 md:max-w-sm">
            <XpBar
              xp={level.xpInLevel}
              nextLevelXp={level.xpForNext}
              level={level.level}
              levelName={level.name}
            />
            <p className="text-xs text-foreground-dim">
              {title.next ? (
                <>
                  Next rank <span className="text-foreground">{title.next.title}</span> —{' '}
                  <span className={cn('font-mono tabular-nums', title.xpToNext > 0 ? 'text-primary-bright' : 'text-warning')}>
                    {title.xpToNext.toLocaleString()} XP
                  </span>{' '}
                  + <span className="font-mono text-primary-bright tabular-nums">{title.probsToNext}</span> solves away
                </>
              ) : (
                'Maximum rift level reached — you are the overflow.'
              )}
            </p>
            <p className="text-xs text-foreground-faint">
              Today:{' '}
              <span className="font-mono text-success tabular-nums">{todayStats.solved}</span> solved ·{' '}
              <span className="font-mono text-primary-bright tabular-nums">{todayStats.xp}</span> XP ·{' '}
              <span className="font-mono text-foreground-dim tabular-nums">{todayStats.attempted}</span> attempts
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
