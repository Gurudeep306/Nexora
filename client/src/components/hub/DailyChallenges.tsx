import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CheckCircle2, Crosshair, ExternalLink, Swords } from 'lucide-react'
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/components/ui'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { cn } from '@/lib/utils'
import type { DailyChallenge } from './types'

const DIFF_META: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  easy: { variant: 'success', label: 'Easy' },
  medium: { variant: 'warning', label: 'Medium' },
  hard: { variant: 'danger', label: 'Hard' },
}

export function DailyChallenges({ challenges }: { challenges: DailyChallenge[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crosshair className="size-4 text-accent" aria-hidden="true" /> Daily challenges
          <span className="ml-auto text-[10px] font-normal tracking-normal text-foreground-faint normal-case">
            resets daily · bonus XP
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {challenges.length === 0 ? (
          <EmptyState
            className="py-6"
            icon={<Swords />}
            title="No challenges today"
            description="Sync more problems to generate daily challenges."
          />
        ) : (
          <ul className="space-y-2.5">
            {challenges.map((c, i) => {
              const meta = DIFF_META[c.difficulty] ?? DIFF_META.medium
              const done = c.completed === 1
              return (
                <motion.li
                  key={c.id ?? c.problem_rowid}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                >
                  <Link
                    to={`/solve/${c.problem_rowid}`}
                    aria-label={`Solve daily challenge: ${c.title}`}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition-all duration-200 hover:border-primary hover:bg-surface-2 hover:glow-box',
                      done && 'border-success/40 bg-success/5',
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Completed" />
                    ) : (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border-glow text-[10px] font-bold text-primary-bright">
                        {c.difficulty[0]?.toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm text-foreground', done && 'text-foreground-dim line-through')}>
                        {c.title}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <PlatformBadge platform={c.platform} />
                        {c.rating > 0 && (
                          <span className="font-mono text-[11px] text-foreground-faint tabular-nums">{c.rating}</span>
                        )}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="gold">+{c.bonus_xp} XP</Badge>
                      <ExternalLink className="size-3.5 text-foreground-faint" aria-hidden="true" />
                    </span>
                  </Link>
                </motion.li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
