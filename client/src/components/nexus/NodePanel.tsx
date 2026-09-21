import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowUpRight, ExternalLink, Lock, Play, Swords, X, Zap } from 'lucide-react'
import { Badge, Card, CardContent, LoadingBlock, Progress } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { cn } from '@/lib/utils'
import type { NexusNode, SkillProblemsResponse } from './types'

function statusBadge(status: string) {
  if (status === 'solved') return <Badge variant="success">solved</Badge>
  if (status === 'attempted') return <Badge variant="warning">attempted</Badge>
  return <Badge variant="default">unsolved</Badge>
}

export function NodePanel({
  node,
  nodes,
  zoneColor,
  zoneName,
  onClose,
}: {
  node: NexusNode
  nodes: NexusNode[]
  zoneColor: string
  zoneName: string
  onClose: () => void
}) {
  const { data, loading } = useApi(
    () => api.get<SkillProblemsResponse>(`/api/skill-tree/${node.id}/problems`),
    [node.id],
    { skip: !node.unlocked },
  )

  const prereqs = node.requires
    .map((id) => nodes.find((n) => n.id === id))
    .filter((n): n is NexusNode => Boolean(n))

  const problems = (data?.problems ?? []).slice(0, 12)

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Card glow className="sticky top-4">
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
                {zoneName} · Skill Node
              </p>
              <h2 className="mt-1 font-display text-lg tracking-wide text-foreground">{node.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close node details"
              className="cursor-pointer rounded-md p-1.5 text-foreground-dim transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="text-sm text-foreground-dim">{node.desc}</p>

          <div className="flex flex-wrap gap-1.5">
            {node.tags.map((t) => (
              <Badge key={t} variant="primary">
                {t}
              </Badge>
            ))}
            <Badge variant="cyan">
              {node.difficulty[0]}–{node.difficulty[1]} rating
            </Badge>
            <Badge variant="gold">
              <Zap className="size-3" aria-hidden="true" />
              {node.xpReward} XP
            </Badge>
          </div>

          {/* progress */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold tracking-wider text-foreground-faint uppercase">Mastery</span>
              <span className="font-mono text-foreground-dim tabular-nums">
                {node.solved} / {node.target} solved
              </span>
            </div>
            <Progress value={node.progress} />
          </div>

          {/* state */}
          {!node.unlocked ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-foreground-dim">
              <Lock className="size-3.5 shrink-0 text-warning" aria-hidden="true" />
              Locked — complete the prerequisite skills below first.
            </div>
          ) : node.completed ? (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: zoneColor, color: zoneColor }}>
              <Swords className="size-3.5 shrink-0" aria-hidden="true" />
              Node mastered. Keep grinding for rating glory.
            </div>
          ) : null}

          {/* prereqs */}
          {prereqs.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
                Prerequisites
              </p>
              <div className="flex flex-wrap gap-1.5">
                {prereqs.map((p) => (
                  <Badge key={p.id} variant={p.completed ? 'success' : 'default'}>
                    {p.completed ? null : <Lock className="size-3" aria-hidden="true" />}
                    {p.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* resources */}
          {node.resources.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
                Resources
              </p>
              <ul className="space-y-1">
                {node.resources.map((r) => (
                  <li key={r.url}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-info transition-colors hover:text-cyan hover:underline"
                    >
                      <ExternalLink className="size-3" aria-hidden="true" />
                      {r.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* recommended problems */}
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
              Recommended Problems
              {data?.skill?.totalAvailable != null && (
                <span className="ml-1 normal-case"> ({data.skill.totalAvailable} in pool)</span>
              )}
            </p>
            {!node.unlocked ? (
              <p className="text-xs text-foreground-faint">Unlock this node to see practice problems.</p>
            ) : loading ? (
              <LoadingBlock rows={3} />
            ) : problems.length === 0 ? (
              <p className="text-xs text-foreground-faint">No problems in this band yet — sync more problems.</p>
            ) : (
              <ul className="space-y-1.5">
                {problems.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/solve/${p.id}`}
                      className={cn(
                        'group flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 transition-all duration-200',
                        'cursor-pointer hover:border-primary hover:glow-box',
                      )}
                    >
                      <Play
                        className="size-3 shrink-0 text-primary-bright opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{p.title}</span>
                      <PlatformBadge platform={p.platform} />
                      {p.rating > 0 && (
                        <span className="font-mono text-[11px] text-foreground-dim tabular-nums">{p.rating}</span>
                      )}
                      {statusBadge(p.solve_status)}
                      <ArrowUpRight className="size-3 shrink-0 text-foreground-faint" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
