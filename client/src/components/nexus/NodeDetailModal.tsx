import { useNavigate } from 'react-router-dom'
import { Check, ExternalLink, Lock } from 'lucide-react'
import { Badge, EmptyState, ErrorState, Modal, Progress, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import { ratingTextClass } from './icons'
import { NodeIcon } from './NodeIcon'
import type { NexusNode, SkillNodeProblemsResponse } from './types'

export function NodeDetailModal({
  node,
  allNodes,
  onClose,
}: {
  node: NexusNode | null
  allNodes: NexusNode[]
  onClose: () => void
}) {
  const navigate = useNavigate()
  const nodeId = node?.id ?? ''
  const problemsApi = useApi<SkillNodeProblemsResponse>(
    () => api.get<SkillNodeProblemsResponse>(`/api/skill-tree/${nodeId}/problems`),
    [nodeId],
    { skip: !node },
  )

  if (!node) return null
  const problems = problemsApi.data?.problems ?? []
  const shown = problems.slice(0, 12)

  const openProblem = (id: number) => {
    onClose()
    navigate(`/solve/${id}`)
  }

  return (
    <Modal open={!!node} onClose={onClose} title={node.name} size="lg">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border-glow bg-surface-2 text-primary-bright"
            aria-hidden="true"
          >
            <NodeIcon icon={node.icon} className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-foreground-dim">{node.desc}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="cyan">
                {node.difficulty[0]}–{node.difficulty[1]}
              </Badge>
              <Badge variant="primary">+{node.xpReward} XP</Badge>
              {node.completed ? <Badge variant="success">completed</Badge> : node.unlocked ? <Badge variant="outline">unlocked</Badge> : <Badge variant="default">locked</Badge>}
              {node.tags.map((t) => (
                <Badge key={t} variant="default">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="font-semibold tracking-wider text-foreground-faint uppercase">Mastery</span>
            <span className="font-mono text-foreground-dim tabular-nums">
              {node.solved} / {node.target} · {node.progress}%
            </span>
          </div>
          <Progress value={node.progress} barClassName={node.completed ? 'bg-success' : undefined} />
        </div>

        {/* Prerequisites */}
        {node.requires.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">Prerequisites</p>
            <div className="flex flex-wrap gap-1.5">
              {node.requires.map((req) => {
                const reqNode = allNodes.find((n) => n.id === req)
                const done = reqNode?.completed ?? false
                return (
                  <span
                    key={req}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                      done ? 'border-success/40 bg-success/10 text-success' : 'border-warning/40 bg-warning/10 text-warning',
                    )}
                  >
                    {done ? <Check className="size-3" aria-hidden="true" /> : <Lock className="size-3" aria-hidden="true" />}
                    {reqNode?.name ?? req}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Resources */}
        {node.resources.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">Resources</p>
            <div className="flex flex-wrap gap-1.5">
              {node.resources.map((r) => (
                <a
                  key={r.url}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] font-semibold text-info transition-colors hover:border-info/50 hover:bg-info/10"
                >
                  <ExternalLink className="size-3" aria-hidden="true" />
                  {r.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Practice problems */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
            Practice problems
            {problemsApi.data && (
              <span className="ml-1 normal-case"> · {problemsApi.data.skill.totalAvailable} in pool</span>
            )}
          </p>
          {problemsApi.loading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading problems">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : problemsApi.error ? (
            <ErrorState message={problemsApi.error} onRetry={problemsApi.refetch} />
          ) : shown.length === 0 ? (
            <EmptyState title="No problems yet" description="Nothing matched this skill — sync more problems first." />
          ) : (
            <ul className="space-y-1">
              {shown.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => openProblem(p.id)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition-all duration-200 hover:border-border-glow hover:bg-surface-2"
                  >
                    <span
                      className={cn('size-2 shrink-0 rounded-full', p.solve_status === 'solved' ? 'bg-success' : p.solve_status === 'attempted' ? 'bg-warning' : 'bg-muted')}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{p.title}</span>
                    <span className={cn('shrink-0 font-mono text-xs font-bold tabular-nums', ratingTextClass(p.rating))}>
                      {p.rating || '?'}
                    </span>
                    <span className="w-8 shrink-0 text-right font-mono text-[10px] text-foreground-faint uppercase">
                      {p.platform.slice(0, 2)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {problems.length > shown.length && (
            <p className="mt-2 text-center font-mono text-[11px] text-foreground-faint">
              +{problems.length - shown.length} more problems in this topic
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
