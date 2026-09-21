import { useState } from 'react'
import { motion } from 'motion/react'
import { Compass, Flag, Map, Play } from 'lucide-react'
import { Card, CardContent, EmptyState, ErrorState, LoadingBlock, Progress, StatCard } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { PathJourney, PATH_ICONS } from './PathJourney'
import type { ForgePath, ForgeStats } from './types'

export function PathsPanel() {
  const [openPathId, setOpenPathId] = useState<string | null>(null)

  const paths = useApi<ForgePath[]>(
    () => api.get<{ ok: boolean; paths: ForgePath[] }>('/api/forge/paths').then((r) => r.paths ?? []),
    [],
  )
  const stats = useApi<ForgeStats>(() => api.get<ForgeStats>('/api/forge/stats'), [])

  const openPath = paths.data?.find((p) => p.id === openPathId) ?? null

  if (openPath) {
    return (
      <PathJourney
        path={openPath}
        onBack={() => setOpenPathId(null)}
        onChanged={() => {
          paths.refetch()
          stats.refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={<Compass />} label="Roadmap topics" value={stats.data?.total ?? '—'} accent="primary" />
        <StatCard icon={<Flag />} label="Completed" value={stats.data?.completed ?? '—'} accent="success" />
        <StatCard icon={<Play />} label="In progress" value={stats.data?.inProgress ?? '—'} accent="cyan" />
      </div>

      {paths.loading ? (
        <LoadingBlock rows={4} />
      ) : paths.error ? (
        <ErrorState message={paths.error} onRetry={paths.refetch} />
      ) : !paths.data?.length ? (
        <EmptyState icon={<Map />} title="No forge paths" description="Roadmap paths are seeded server-side." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {paths.data.map((p, i) => {
            const Icon = PATH_ICONS[p.icon] ?? Map
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(i, 8) * 0.04 }}
              >
                <Card
                  interactive
                  glow={p.progress === 100}
                  className="h-full"
                  role="button"
                  tabIndex={0}
                  aria-label={`Open path ${p.title}`}
                  onClick={() => setOpenPathId(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setOpenPathId(p.id)
                    }
                  }}
                >
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-start gap-3">
                      <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2"
                        style={{ color: p.color, boxShadow: `0 0 14px ${p.color}26` }}
                        aria-hidden="true"
                      >
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-display text-sm tracking-wide text-foreground">{p.title}</h3>
                        <p className="mt-0.5 text-[11px] text-foreground-faint tabular-nums">
                          {p.milestones.length} stages · {p.totalTopics} topics
                        </p>
                      </div>
                      <span className="ml-auto font-display text-lg tabular-nums" style={{ color: p.color }}>
                        {p.progress}%
                      </span>
                    </div>
                    <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-foreground-dim">{p.description}</p>
                    <Progress
                      value={p.progress}
                      max={100}
                      barClassName="from-primary to-cyan"
                    />
                    <p className="text-[11px] text-foreground-faint tabular-nums">
                      {p.completedTopics} done · {p.inProgressTopics} in progress
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
