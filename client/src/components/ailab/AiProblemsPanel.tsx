import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { BrainCircuit, CheckCircle2, Loader, Play } from 'lucide-react'
import { Badge, Card, EmptyState, ErrorState, LoadingBlock, StatCard, Tabs } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { AI_CATEGORIES, parseJsonList, type AiProblem, type AiStats } from './types'
import { AiProblemSolver } from './AiProblemSolver'
import { cn } from '@/lib/utils'

const STATUS_META: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  solved: { label: 'Solved', variant: 'success' },
  'in-progress': { label: 'In progress', variant: 'warning' },
  unsolved: { label: 'Unsolved', variant: 'default' },
}

export function AiProblemsPanel() {
  const [category, setCategory] = useState('all')
  const [openId, setOpenId] = useState<number | null>(null)

  const stats = useApi<AiStats>(() => api.get<AiStats>('/api/ai-stats'), [])
  const problems = useApi<AiProblem[]>(
    () =>
      api
        .get<{ ok: boolean; problems: AiProblem[] }>('/api/ai-problems', { query: { category } })
        .then((r) => r.problems ?? []),
    [category],
  )

  const openProblem = useMemo(
    () => problems.data?.find((p) => p.id === openId) ?? null,
    [problems.data, openId],
  )

  const onProgressSaved = () => {
    problems.refetch()
    stats.refetch()
  }

  if (openProblem) {
    return (
      <AiProblemSolver
        problem={openProblem}
        onBack={() => setOpenId(null)}
        onProgressSaved={onProgressSaved}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Stat strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={<BrainCircuit />} label="Training problems" value={stats.data?.total ?? '—'} accent="primary" />
        <StatCard icon={<CheckCircle2 />} label="Solved" value={stats.data?.solved ?? '—'} accent="success" />
        <StatCard icon={<Loader />} label="In progress" value={stats.data?.inProgress ?? '—'} accent="cyan" />
      </div>

      <Tabs
        variant="pills"
        items={AI_CATEGORIES.map((c) => ({
          id: c.id,
          label: c.label,
          badge:
            c.id === 'all'
              ? stats.data?.total
              : stats.data?.byCategory.find((b) => b.category === c.id)?.total,
        }))}
        active={category}
        onChange={setCategory}
      />

      {problems.loading ? (
        <LoadingBlock rows={5} />
      ) : problems.error ? (
        <ErrorState message={problems.error} onRetry={problems.refetch} />
      ) : !problems.data?.length ? (
        <EmptyState
          icon={<BrainCircuit />}
          title="No problems in this category"
          description="The AI problem bank is seeded server-side — try another category."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {problems.data.map((p, i) => {
            const st = STATUS_META[p.status ?? 'unsolved'] ?? STATUS_META.unsolved
            const tags = parseJsonList<string>(p.tags)
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(i, 8) * 0.04 }}
              >
                <Card
                  interactive
                  glow={p.status === 'solved'}
                  className="flex h-full flex-col p-4"
                  onClick={() => setOpenId(p.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${p.title}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setOpenId(p.id)
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="primary">{p.category.toUpperCase()}</Badge>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                  <h3 className="mt-2.5 font-display text-sm tracking-wide text-foreground">{p.title}</h3>
                  <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-relaxed text-foreground-dim">
                    {p.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant={difficultyVariant(p.difficulty)}>{p.difficulty}</Badge>
                    {tags.slice(0, 3).map((t) => (
                      <Badge key={t} variant="outline" className="normal-case">
                        {t}
                      </Badge>
                    ))}
                    <span className={cn('ml-auto flex items-center gap-1 text-[11px] text-primary-bright')}>
                      <Play className="size-3" /> Solve
                    </span>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function difficultyVariant(d: string): 'cyan' | 'warning' | 'accent' {
  if (d === 'beginner') return 'cyan'
  if (d === 'advanced') return 'accent'
  return 'warning'
}
