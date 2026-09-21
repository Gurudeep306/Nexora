import { motion } from 'motion/react'
import { Check, Crown, Lock } from 'lucide-react'
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Progress } from '@/components/ui'
import { cn, formatNumber } from '@/lib/utils'
import type { NexusStatsResponse } from './types'

/**
 * Rank progression track over the player-title ladder.
 * Consumes the snake_case `allTitles` from GET /api/stats (NOT the camelCase one from /api/performance).
 */
export function TitleTrack({ stats }: { stats: NexusStatsResponse | null }) {
  if (!stats) {
    return (
      <Card>
        <CardContent className="py-10">
          <EmptyState icon={<Crown />} title="No rank data" description="Sign in to see your rank progression." />
        </CardContent>
      </Card>
    )
  }

  const currentTitle = stats.title.current.title
  const reachedIdx = stats.allTitles.findIndex((t) => t.title === currentTitle)

  return (
    <div className="space-y-4">
      {/* Current rank + next gate */}
      <Card glow>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="size-4 text-gold" aria-hidden="true" /> Current rank
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-2xl tracking-wide text-gradient">{stats.title.current.title}</p>
            {stats.title.next ? (
              <Badge variant="gold">
                next: {stats.title.next.title} · {formatNumber(stats.title.next.min_xp)} XP
                {stats.title.next.min_problems != null && ` · ${formatNumber(stats.title.next.min_problems)} solves`}
              </Badge>
            ) : (
              <Badge variant="gold">max rank</Badge>
            )}
          </div>
          {stats.title.next && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">
                  XP to next rank
                </p>
                <Progress
                  value={Math.max(0, stats.title.next.min_xp - stats.title.xpToNext)}
                  max={stats.title.next.min_xp}
                />
                <p className="mt-1 font-mono text-[11px] text-foreground-dim tabular-nums">
                  {formatNumber(stats.title.xpToNext)} XP remaining
                </p>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">
                  Solves to next rank
                </p>
                <Progress
                  value={Math.max(0, (stats.title.next.min_problems ?? 0) - stats.title.probsToNext)}
                  max={stats.title.next.min_problems ?? 1}
                  barClassName="bg-gradient-to-r from-cyan to-info"
                />
                <p className="mt-1 font-mono text-[11px] text-foreground-dim tabular-nums">
                  {formatNumber(stats.title.probsToNext)} solves remaining
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ladder */}
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Rank ladder">
        {stats.allTitles.map((t, i) => {
          const reached = i <= reachedIdx
          const isCurrent = t.title === currentTitle
          return (
            <motion.li
              key={t.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.4), ease: [0.34, 1.56, 0.64, 1] }}
            >
              <Card
                className={cn(
                  'flex items-center gap-3 p-3',
                  isCurrent && 'border-gold/50 glow-box',
                  !reached && 'opacity-55',
                )}
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl border bg-surface-2',
                    isCurrent ? 'border-gold/50 text-gold' : reached ? 'border-success/40 text-success' : 'border-border text-foreground-faint',
                  )}
                  style={!isCurrent && reached ? { borderColor: t.color, color: t.color } : undefined}
                  aria-hidden="true"
                >
                  {isCurrent ? <Crown className="size-5" /> : reached ? <Check className="size-4" /> : <Lock className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className="truncate font-display text-xs tracking-wider"
                      style={{ color: reached ? t.color : undefined }}
                    >
                      {t.title}
                    </span>
                    {isCurrent && <Badge variant="gold">you</Badge>}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] text-foreground-faint tabular-nums">
                    {formatNumber(t.min_xp)} XP
                    {t.min_problems != null && ` · ${formatNumber(t.min_problems)} solves`}
                  </span>
                </span>
              </Card>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
