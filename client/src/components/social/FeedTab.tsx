import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Rss, RefreshCw, Swords, DoorOpen, UserPlus, Trophy, Zap, Activity } from 'lucide-react'
import { Avatar, Button, Card, EmptyState, ErrorState, LoadingBlock } from '@/components/ui'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { timeAgo } from '@/lib/utils'
import type { FeedRow } from './types'

const TYPE_META: Record<string, { verb: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  solve: { verb: 'solved', icon: Swords, className: 'text-success' },
  solved: { verb: 'solved', icon: Swords, className: 'text-success' },
  room_created: { verb: 'opened a solve room', icon: DoorOpen, className: 'text-cyan' },
  room: { verb: 'opened a solve room', icon: DoorOpen, className: 'text-cyan' },
  friend: { verb: 'made a new ally', icon: UserPlus, className: 'text-accent' },
  achievement: { verb: 'unlocked', icon: Trophy, className: 'text-gold' },
  level_up: { verb: 'ranked up', icon: Zap, className: 'text-primary-bright' },
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(Date.now() - 864e5)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function FeedTab({ me }: { me: string }) {
  const feedApi = useApi<{ feed: FeedRow[] }>(
    () => api.get<{ feed: FeedRow[] }>(`/api/feed/${encodeURIComponent(me)}`),
    [me],
  )

  const groups = useMemo(() => {
    const out: { day: string; rows: FeedRow[] }[] = []
    for (const row of feedApi.data?.feed ?? []) {
      const day = dayLabel(row.created_at)
      const last = out[out.length - 1]
      if (last?.day === day) last.rows.push(row)
      else out.push({ day, rows: [row] })
    }
    return out
  }, [feedApi.data])

  if (feedApi.loading && !feedApi.data) return <LoadingBlock rows={6} />
  if (feedApi.error) return <ErrorState message={feedApi.error} onRetry={feedApi.refetch} />

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground-faint">You and your allies — solves, rooms and milestones.</p>
        <Button variant="ghost" size="sm" onClick={feedApi.refetch} aria-label="Refresh feed">
          <RefreshCw aria-hidden="true" /> Refresh
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Rss />}
            title="The rift is quiet"
            description="Add friends and start solving — their activity and yours streams here."
          />
        </Card>
      ) : (
        groups.map((g) => (
          <section key={g.day}>
            <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">{g.day}</h3>
            <ol className="relative space-y-2 border-l border-border pl-5">
              {g.rows.map((row, i) => {
                const meta = TYPE_META[row.type?.toLowerCase()] ?? { verb: row.type.replace(/_/g, ' '), icon: Activity, className: 'text-foreground-dim' }
                const Icon = meta.icon
                return (
                  <motion.li
                    key={row.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.4) }}
                    className="relative"
                  >
                    <span className="absolute top-3 -left-[27px] grid size-3.5 place-items-center rounded-full border border-border bg-background">
                      <span className="size-1.5 rounded-full bg-primary" />
                    </span>
                    <div className="card-neon flex items-start gap-3 px-3.5 py-3">
                      <Link to={`/profile/${encodeURIComponent(row.username)}`} aria-label={`Open ${row.username}'s profile`}>
                        <Avatar seed={row.username} name={row.display_name || row.username} size="sm" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground-dim">
                          <Link
                            to={`/profile/${encodeURIComponent(row.username)}`}
                            className="cursor-pointer font-semibold text-foreground transition-colors hover:text-primary-bright"
                          >
                            {row.username === me ? 'You' : row.display_name || row.username}
                          </Link>{' '}
                          <Icon className={`mx-0.5 inline size-3.5 align-[-2px] ${meta.className}`} aria-hidden="true" /> {meta.verb}{' '}
                          {row.problem_title ? (
                            <Link to={`/solve/${row.problem_id}`} className="cursor-pointer text-foreground underline-offset-2 hover:text-primary-bright hover:underline">
                              {row.problem_title}
                            </Link>
                          ) : (
                            row.content && <span className="text-foreground">{row.content}</span>
                          )}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-foreground-faint">
                          {row.problem_platform && <PlatformBadge platform={row.problem_platform} />}
                          {row.problem_rating ? <span className="font-mono tabular-nums">{row.problem_rating}</span> : null}
                          <span className="font-mono tabular-nums">{timeAgo(row.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                )
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  )
}
