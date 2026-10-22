import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useState } from 'react'
import { ArrowUpRight, BookOpen, Check, ExternalLink, GitBranch, Link2, Lock, Play, RotateCcw, Swords, X, Zap } from 'lucide-react'
import { Badge, Button, Card, CardContent, LoadingBlock, Progress } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/icon/Icon'
import { nodeIcon } from './icons'
import type React from 'react'
import type { CrossLink, NexusNode, NexusPyqsResponse, SkillProblemsResponse } from './types'

function statusBadge(status: string) {
  if (status === 'solved') return <Badge variant="success">solved</Badge>
  if (status === 'attempted') return <Badge variant="warning">attempted</Badge>
  return <Badge variant="default">unsolved</Badge>
}

const label = 'mb-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase'

/** "Needs · Trees (DSA)" / "Unlocks · B+ trees (DBMS)" chips; click jumps there. */
function CrossChips({ title, links, kind, onJump, hueOf }: { title: string; links: CrossLink[]; kind: 'needs' | 'unlocks'; onJump?: (l: CrossLink) => void; hueOf?: (subject: string) => string | undefined }) {
  if (!links.length) return null
  return (
    <div>
      <p className={label}>{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {links.map((c) => (
          <button
            key={`${c.subject}:${c.id}`}
            type="button"
            onClick={() => onJump?.(c)}
            className={cn('nx-need inline-flex cursor-pointer items-center gap-1 px-2 py-0.5 text-[11px]', kind === 'unlocks' && 'nx-unlock')}
            data-done={c.completed || undefined}
            style={hueOf?.(c.subject) ? ({ '--nx-chip': hueOf(c.subject) } as React.CSSProperties) : undefined}
            data-hue={hueOf?.(c.subject) ? '' : undefined}
            title={`${c.name} in ${c.subjectName}${c.completed ? ' (mastered)' : ` (${c.progress}%)`}`}
          >
            {c.completed ? <Icon name="check" className="size-3" aria-hidden="true" /> : kind === 'needs' ? <Lock className="size-3" aria-hidden="true" /> : null}
            {kind === 'needs' ? 'Needs' : 'Unlocks'} · {c.name} ({c.subjectShort})
            <ArrowUpRight className="size-3 opacity-70" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}

function DsaProblems({ node }: { node: NexusNode }) {
  const { data, loading } = useApi(
    () => api.get<SkillProblemsResponse>(`/api/skill-tree/${node.id}/problems`),
    [node.id],
    { skip: !node.unlocked },
  )
  const problems = (data?.problems ?? []).slice(0, 12)
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
        Recommended Problems
        {data?.skill?.totalAvailable != null && <span className="ml-1 normal-case"> ({data.skill.totalAvailable} in pool)</span>}
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
                <Play className="size-3 shrink-0 text-primary-bright opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{p.title}</span>
                <PlatformBadge platform={p.platform} />
                {p.rating > 0 && <span className="font-mono text-[11px] text-foreground-dim tabular-nums">{p.rating}</span>}
                {statusBadge(p.solve_status)}
                <ArrowUpRight className="size-3 shrink-0 text-foreground-faint" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SubjectPyqs({ node }: { node: NexusNode }) {
  const pool = node.metric?.pyq
  const { data, loading } = useApi(
    () => api.get<NexusPyqsResponse>(`/api/nexus/pyqs/${node.subject}/${node.id}`),
    [node.subject, node.id],
    { skip: !pool },
  )
  if (!pool) return null
  const qs = data?.questions ?? []
  const ids = qs.map((q) => q.id).slice(0, 500).join(',')
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="mb-0 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
          GATE PYQs <span className="normal-case">({pool.pool} in pool)</span>
        </p>
        {qs.length > 0 && (
          <Link to={`/gate/practice?ids=${ids}`} className="text-[11.5px] font-medium text-accent-brand hover:underline">
            Practise all →
          </Link>
        )}
      </div>
      {loading && !data ? (
        <LoadingBlock rows={3} />
      ) : (
        <ul className="space-y-1.5">
          {qs.slice(0, 10).map((q, i) => (
            <li key={q.id}>
              <Link
                to={`/gate/practice?ids=${ids}&i=${i}`}
                className="group flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 transition-colors duration-200 hover:border-primary"
              >
                <Play className="size-3 shrink-0 text-primary-bright opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-foreground">{q.id}</span>
                {q.marks != null && <span className="font-mono text-[10.5px] text-foreground-dim">{q.marks}m</span>}
                {statusBadge(q.status === 'new' ? 'unsolved' : q.status)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function NodePanel({
  node,
  nodes,
  zoneColor,
  zoneName,
  onClose,
  onJump,
  onSelect,
  detailLoading = false,
  engine = null,
  onOpenPath,
  bare = false,
  studyHref,
  due = false,
  onReview,
  shareHref,
  hueOf,
}: {
  node: NexusNode
  nodes: NexusNode[]
  zoneColor: string
  zoneName: string
  onClose: () => void
  /** Jump to a skill in another subject. */
  onJump?: (link: CrossLink) => void
  /** Select another skill in this tree. */
  onSelect?: (id: string) => void
  /** The node's details (description, resources, PYQs) are still loading. */
  detailLoading?: boolean
  /** The subject's progress engine ("dsa" counts solved problems), or null. */
  engine?: string | null
  /** Open this subject's path (from the web view). */
  onOpenPath?: () => void
  /** No card chrome (inside the details sheet). */
  bare?: boolean
  /** Where its course is (the primary action). */
  studyHref?: string
  /** Due for spaced review (amber), and the action that starts one. */
  due?: boolean
  onReview?: () => void
  /** A link to this concept (copied by "Copy link"). */
  shareHref?: string
  /** A subject's stream colour (for the chips). */
  hueOf?: (subject: string) => string | undefined
}) {
  const [copied, setCopied] = useState(false)
  // The solve-count engine (the competitive-programming tree) shows rated problems.
  const isDsa = engine === 'dsa'
  const prereqs = node.requires.map((id) => nodes.find((n) => n.id === id)).filter((n): n is NexusNode => Boolean(n))
  const unlocks = nodes.filter((n) => n.requires.includes(node.id))
  const m = node.metric
  const kind = isDsa ? 'Skill Node' : node.kind === 'project' ? 'Project' : node.kind === 'lesson' ? 'Lesson' : 'Concept'

  const body = (
    <>
          <div className="flex items-start gap-3">
            <MasteryRing value={node.completed ? 100 : node.progress} color={zoneColor} state={node.completed ? 'done' : node.unlocked ? 'open' : 'locked'} icon={node.icon} due={due} />
            <div className="min-w-0 flex-1">
              <p className="mb-0 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
                {zoneName} · {kind}
              </p>
              <h2 className="mt-1 mb-0 font-display text-lg leading-snug tracking-wide text-foreground">{node.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close node details"
              className="-mt-1 -mr-1 cursor-pointer rounded-md p-1.5 text-foreground-dim transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent-brand focus-visible:outline-none"
            >
              <X className="size-4" />
            </button>
          </div>

          {detailLoading ? (
            <div className="space-y-2" aria-hidden="true">
              <div className="nx-skel h-3.5 w-full rounded" />
              <div className="nx-skel h-3.5 w-4/5 rounded" />
            </div>
          ) : (
            <p className="mb-0 text-sm leading-relaxed text-foreground-dim">{node.desc}</p>
          )}
          {due && (
            <div className="nx-due-note flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
              <RotateCcw className="size-3.5 shrink-0" aria-hidden="true" />
              Due for review — a quick round keeps it fresh.
            </div>
          )}
          <div className="space-y-2">
            {studyHref && (
              <Link to={studyHref} className="block rounded-lg focus-visible:ring-2 focus-visible:ring-accent-brand focus-visible:outline-none" tabIndex={-1}>
                <Button variant="primary" size="sm" className="nx-press w-full justify-center">
                  <BookOpen className="size-3.5" aria-hidden="true" /> Study this
                </Button>
              </Link>
            )}
            {(onOpenPath || onReview || shareHref) && (
              <div className="flex flex-wrap gap-1.5">
                {onReview && (
                  <Button variant="outline" size="sm" className="nx-press" onClick={onReview}>
                    <RotateCcw className="size-3.5" aria-hidden="true" /> Review
                  </Button>
                )}
                {onOpenPath && (
                  <Button variant="outline" size="sm" className="nx-press" onClick={onOpenPath}>
                    <GitBranch className="size-3.5" aria-hidden="true" /> Open its tree
                  </Button>
                )}
                {shareHref && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="nx-press"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(new URL(shareHref, window.location.origin).toString())
                        setCopied(true)
                        window.setTimeout(() => setCopied(false), 1600)
                      } catch {
                        /* clipboard blocked */
                      }
                    }}
                    aria-label="Copy a link to this concept"
                  >
                    {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Link2 className="size-3.5" aria-hidden="true" />}
                    {copied ? 'Copied' : 'Copy link'}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {node.tags.map((t) => (
              <Badge key={t} variant="primary">
                {t}
              </Badge>
            ))}
            {isDsa && (
              <Badge variant="cyan">
                {node.difficulty[0]}–{node.difficulty[1]} rating
              </Badge>
            )}
            {node.optional && <Badge variant="default">optional</Badge>}
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
                {isDsa ? `${node.solved} / ${node.target} solved` : `${node.progress}%`}
              </span>
            </div>
            <Progress value={node.progress} />
            {!isDsa && (
              <ul className="mt-2 space-y-1 text-xs text-foreground-dim">
                {m?.lessons && (
                  <li className="flex justify-between">
                    <span>GATE notes lessons done</span>
                    <span className="font-mono tabular-nums">
                      {m.lessons.done}/{m.lessons.total}
                    </span>
                  </li>
                )}
                {m?.pyq && (
                  <li className="flex justify-between">
                    <span>PYQs answered correctly</span>
                    <span className="font-mono tabular-nums">
                      {Math.min(m.pyq.correct, m.pyq.target)}/{m.pyq.target}
                    </span>
                  </li>
                )}
                {m?.pyq && m.pyq.accuracy != null && (
                  <li className="flex justify-between">
                    <span>Accuracy on attempted PYQs</span>
                    <span className="font-mono tabular-nums">{m.pyq.accuracy}%</span>
                  </li>
                )}
                {!m?.lessons && !m?.pyq && <li>No tracked practice yet for this {kind.toLowerCase()}; it unlocks through its prerequisites.</li>}
              </ul>
            )}
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
              {isDsa ? 'Node mastered. Keep grinding for rating glory.' : 'Mastered. Everything it unlocks is open to you.'}
            </div>
          ) : null}

          {/* prereqs, in this tree and across subjects */}
          {prereqs.length > 0 && (
            <div>
              <p className={label}>Prerequisites</p>
              <div className="flex flex-wrap gap-1.5">
                {prereqs.map((p) => (
                  <button key={p.id} type="button" className="cursor-pointer" onClick={() => onSelect?.(p.id)} title={`Show ${p.name}`}>
                    <Badge variant={p.completed ? 'success' : 'default'}>
                      {p.completed ? null : <Lock className="size-3" aria-hidden="true" />}
                      {p.name}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
          <CrossChips title="Needs from other subjects" links={node.crossRequires ?? []} kind="needs" onJump={onJump} hueOf={hueOf} />
          {unlocks.length > 0 && (
            <div>
              <p className={label}>Unlocks</p>
              <div className="flex flex-wrap gap-1.5">
                {unlocks.map((u) => (
                  <button key={u.id} type="button" className="cursor-pointer" onClick={() => onSelect?.(u.id)} title={`Show ${u.name}`}>
                    <Badge variant={u.completed ? 'success' : u.unlocked ? 'primary' : 'default'}>{u.name}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
          <CrossChips title="Unlocks in other subjects" links={node.crossUnlocks ?? []} kind="unlocks" onJump={onJump} hueOf={hueOf} />

          {/* GATE notes lessons */}
          {m?.lessons && (
            <div>
              <p className={label}>Study</p>
              <ul className="space-y-1">
                {m.lessons.ids.map((l) => (
                  <li key={l}>
                    <Link
                      to={`/gate/notes/${m.lessons!.subject}/${l}`}
                      className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-info transition-colors hover:text-cyan hover:underline"
                    >
                      <BookOpen className="size-3" aria-hidden="true" />
                      Read the lesson{m.lessons!.ids.length > 1 ? ` (${l})` : ''}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* resources */}
          {node.resources.length > 0 && (
            <div>
              <p className={label}>Resources</p>
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

          {isDsa ? <DsaProblems node={node} /> : <SubjectPyqs node={node} />}
    </>
  )
  if (bare) {
    // No card chrome: the content alone, for the bottom sheet.
    return <div className="nx-panel space-y-4">{body}</div>
  }
  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
      <Card glow className="nx-panel sticky top-4">
        <CardContent className="space-y-4">{body}</CardContent>
      </Card>
    </motion.div>
  )
}

/** The skill's mastery as a ring in its zone colour, its icon inside, % beneath. */
function MasteryRing({ value, color, state, icon, due }: { value: number; color: string; state: 'done' | 'open' | 'locked'; icon?: string; due?: boolean }) {
  const S = 56
  const r = S / 2 - 3
  const c = 2 * Math.PI * r
  return (
    <div className="flex shrink-0 flex-col items-center gap-1" aria-label={`${Math.round(value)}% mastered`} role="img">
      <div className="nx-orb relative flex items-center justify-center rounded-full" data-state={state} style={{ width: S, height: S, ['--zc' as string]: color }}>
        <svg className="absolute inset-0 -rotate-90" width={S} height={S} aria-hidden="true">
          <circle cx={S / 2} cy={S / 2} r={r} fill="none" className="nx-orb-track" strokeWidth="3" />
          <circle cx={S / 2} cy={S / 2} r={r} fill="none" stroke="var(--zc)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(c * value) / 100} ${c}`} className="nx-ring-in" />
          {due && <circle cx={S / 2} cy={S / 2} r={r + 2.5} fill="none" stroke="var(--color-warning, #f59e0b)" strokeWidth="1.5" strokeDasharray="3 3" />}
        </svg>
        <span className="nx-orb-core relative flex size-[42px] items-center justify-center rounded-full">
          <Icon name={nodeIcon(icon)} className="size-[19px]" />
        </span>
      </div>
      <span className="font-mono text-[10.5px] text-foreground-dim tabular-nums">{Math.round(value)}%</span>
    </div>
  )
}
