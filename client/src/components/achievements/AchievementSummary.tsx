import { motion } from 'motion/react'
import { Award, Lock, TrendingUp, Zap } from 'lucide-react'
import { Card, CardContent, Progress, StatCard } from '@/components/ui'
import { formatNumber } from '@/lib/utils'
import { AchievementIcon } from './AchievementIcon'
import type { Achievement } from './types'

export function AchievementSummary({ achievements }: { achievements: Achievement[] }) {
  const unlocked = achievements.filter((a) => a.unlocked_at)
  const locked = achievements.filter((a) => !a.unlocked_at)
  const earnedXp = unlocked.reduce((s, a) => s + (a.xp_reward || 0), 0)
  const remainingXp = locked.reduce((s, a) => s + (a.xp_reward || 0), 0)
  const pct = achievements.length ? Math.round((unlocked.length / achievements.length) * 100) : 0

  const nextUp = [...locked]
    .map((a) => ({ a, pct: a.target > 0 ? Math.min(100, Math.round((a.progress / a.target) * 100)) : 0 }))
    .sort((x, y) => y.pct - x.pct || y.a.progress - x.a.progress)
    .slice(0, 3)

  return (
    <div className="space-y-4">
      <motion.div
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <StatCard
          icon={<Award />}
          label="Unlocked"
          value={`${unlocked.length}/${achievements.length}`}
          sub={<>{pct}% of the vault</>}
          accent="gold"
        />
        <StatCard icon={<Zap />} label="XP earned" value={formatNumber(earnedXp)} sub="from achievements" accent="primary" />
        <StatCard icon={<Lock />} label="XP remaining" value={formatNumber(remainingXp)} sub={`${locked.length} locked`} accent="accent" />
        <StatCard
          icon={<TrendingUp />}
          label="Collection"
          value={
            <>
              <span className="inline-flex items-center">
                <Progress value={pct} className="mr-2 h-2 w-16 self-center" />
                {pct}%
              </span>
            </>
          }
          sub="keep hunting"
          accent="success"
        />
      </motion.div>

      {nextUp.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.06 }}>
          <Card>
            <CardContent className="py-4">
              <p className="mb-3 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
                Closest to unlock
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {nextUp.map(({ a, pct: p }) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/60 p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
                      <AchievementIcon icon={a.icon} locked className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-foreground">{a.title}</span>
                        <span className="shrink-0 font-mono text-[10px] text-foreground-faint tabular-nums">
                          {formatNumber(a.progress)}/{formatNumber(a.target)}
                        </span>
                      </span>
                      <span className="mt-1.5 block">
                        <Progress value={p} className="h-1.5" barClassName={p > 0 ? 'bg-gradient-to-r from-cyan to-info' : undefined} />
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
