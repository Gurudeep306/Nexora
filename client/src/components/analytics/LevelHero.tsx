import { motion } from 'motion/react'
import { CheckCircle2, Clock, Flame, Zap } from 'lucide-react'
import { Card, CardContent, Progress } from '@/components/ui'
import { cn, formatNumber } from '@/lib/utils'
import type { FullPerformanceResponse } from './types'

/** Hero panel: current rift level, dual gates (XP + solves) toward the next level, pace metrics. */
export function LevelHero({ perf }: { perf: FullPerformanceResponse }) {
  const lvl = perf.level
  const next = perf.nextLevel
  const xpPct = lvl.xpForNext > 0 ? Math.min(100, Math.round((lvl.xpInLevel / lvl.xpForNext) * 100)) : 100
  const probPct = lvl.probsForNext > 0 ? Math.min(100, Math.round((lvl.probsInLevel / lvl.probsForNext) * 100)) : 100

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card glow>
        <CardContent className="grid gap-6 py-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          {/* Level medallion */}
          <div className="flex items-center gap-4">
            <div
              className="flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-primary bg-surface-2 glow-box"
              aria-hidden="true"
            >
              <span className="font-display text-2xl text-gradient tabular-nums">{lvl.level}</span>
              <span className="text-[9px] font-semibold tracking-wider text-foreground-faint uppercase">level</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">Current rift</p>
              <p className="font-display text-xl tracking-wide text-foreground">{lvl.name}</p>
              <p className="mt-0.5 font-mono text-xs text-foreground-dim tabular-nums">
                <Zap className="mr-1 inline size-3 text-primary-bright" aria-hidden="true" />
                {formatNumber(perf.totalXp)} XP total
              </p>
            </div>
          </div>

          {/* Gates */}
          <div className="space-y-3">
            {next ? (
              <>
                <p className="text-xs text-foreground-dim">
                  Next rift: <span className="font-display tracking-wider text-primary-bright">{next.name}</span>
                  {next.daysEstimate != null && (
                    <span className="ml-2 inline-flex items-center gap-1 font-mono text-[11px] text-foreground-faint">
                      <Clock className="size-3" aria-hidden="true" /> ~{next.daysEstimate}d at current pace
                    </span>
                  )}
                </p>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className={cn('font-semibold tracking-wider uppercase', lvl.xpGated ? 'text-foreground-faint' : 'text-success')}>
                      {lvl.xpGated ? 'XP gate' : 'XP gate cleared'}
                    </span>
                    <span className="font-mono text-foreground-dim tabular-nums">
                      {formatNumber(lvl.xpInLevel)} / {formatNumber(next.xpNeeded)}
                    </span>
                  </div>
                  <Progress value={xpPct} barClassName={lvl.xpGated ? undefined : 'bg-success'} />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className={cn('font-semibold tracking-wider uppercase', lvl.probGated ? 'text-foreground-faint' : 'text-success')}>
                      {lvl.probGated ? 'Solve gate' : 'Solve gate cleared'}
                    </span>
                    <span className="font-mono text-foreground-dim tabular-nums">
                      {formatNumber(lvl.probsInLevel)} / {formatNumber(next.probsNeeded)}
                    </span>
                  </div>
                  <Progress
                    value={probPct}
                    barClassName={lvl.probGated ? 'bg-gradient-to-r from-cyan to-info' : 'bg-success'}
                  />
                </div>
              </>
            ) : (
              <p className="flex items-center gap-2 font-display text-sm tracking-wider text-gold">
                <CheckCircle2 className="size-4" aria-hidden="true" /> MAX LEVEL REACHED — the rift bows to you
              </p>
            )}
          </div>

          {/* Pace metrics */}
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-2">
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-center lg:text-right">
              <p className="text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">Consistency</p>
              <p className="font-display text-lg text-cyan tabular-nums">{perf.consistencyScore}%</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-center lg:text-right">
              <p className="text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">Avg XP/day</p>
              <p className="font-display text-lg text-primary-bright tabular-nums">{formatNumber(perf.avgDailyXp)}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-center lg:text-right">
              <p className="flex items-center justify-center gap-1 text-[10px] font-semibold tracking-wider text-foreground-faint uppercase lg:justify-end">
                <Flame className="size-3 text-streak" aria-hidden="true" /> Streak
              </p>
              <p className="font-display text-lg text-warning tabular-nums">
                {perf.streak.current}
                <span className="text-xs text-foreground-faint">/{perf.streak.best}d</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
