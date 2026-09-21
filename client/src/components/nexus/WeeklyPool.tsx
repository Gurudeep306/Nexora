import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, ChevronDown, Play } from 'lucide-react'
import { Badge, Card, CardContent, EmptyState } from '@/components/ui'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { cn } from '@/lib/utils'
import type { RoadmapLevel } from './types'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function weekRefreshLabel(weekSeed: number): string {
  const next = (weekSeed + 1) * WEEK_MS
  const days = Math.max(0, Math.ceil((next - Date.now()) / (24 * 60 * 60 * 1000)))
  return days <= 0 ? 'refreshes today' : `refreshes in ${days} day${days === 1 ? '' : 's'}`
}

export function WeeklyPool({
  level,
  weekSeed,
  accentColor,
}: {
  level: RoadmapLevel | undefined
  weekSeed: number
  accentColor: string
}) {
  const [openTopic, setOpenTopic] = useState<string | null>(level?.topics[0]?.name ?? null)

  if (!level || level.topics.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarClock />}
          title="No weekly pool for this zone"
          description="Practice pools appear for zones with curated topics."
        />
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm tracking-wider text-foreground uppercase">
              Weekly Practice Pool — Zone {level.level}
            </h3>
            <p className="mt-0.5 text-xs text-foreground-dim">
              {level.solvedCount}/{level.totalProblems} solved from this week&apos;s curated pool
            </p>
          </div>
          <Badge variant="cyan">
            <CalendarClock className="size-3" aria-hidden="true" />
            {weekRefreshLabel(weekSeed)}
          </Badge>
        </div>

        {level.topics.map((topic) => {
          const open = openTopic === topic.name
          return (
            <div key={topic.name} className="overflow-hidden rounded-lg border border-border bg-surface">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenTopic(open ? null : topic.name)}
                className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors duration-200 hover:bg-surface-2"
              >
                <ChevronDown
                  className={cn('size-4 shrink-0 text-foreground-faint transition-transform duration-200', open && 'rotate-180')}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{topic.name}</span>
                  <span className="block truncate text-[11px] text-foreground-faint">{topic.desc}</span>
                </span>
                <span className="font-mono text-[11px] text-foreground-dim tabular-nums">
                  {topic.problems.filter((p) => p.solve_status === 'solved').length}/{topic.problems.length}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="border-t border-border"
                  >
                    {topic.problems.map((p) => (
                      <li key={p.id} className="border-b border-border/50 last:border-0">
                        <Link
                          to={`/solve/${p.id}`}
                          className="group flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors duration-150 hover:bg-surface-2"
                        >
                          <Play
                            className="size-3 shrink-0 text-primary-bright opacity-0 transition-opacity group-hover:opacity-100"
                            aria-hidden="true"
                          />
                          <span
                            className={cn(
                              'min-w-0 flex-1 truncate text-xs',
                              p.solve_status === 'solved' ? 'text-foreground-faint line-through' : 'text-foreground',
                            )}
                          >
                            {p.title}
                          </span>
                          <PlatformBadge platform={p.platform} />
                          <span
                            className="w-10 text-right font-mono text-[11px] tabular-nums"
                            style={{ color: p.rating > 0 ? accentColor : undefined }}
                          >
                            {p.rating > 0 ? p.rating : '—'}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
