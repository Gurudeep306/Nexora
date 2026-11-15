import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight, BookOpen, Bookmark, BookmarkCheck, Check, Clock, ExternalLink, Film, GraduationCap, Link2, ListChecks, Lock, MessageSquareText, PenLine, Sparkles, Swords, Target, X, Zap } from 'lucide-react'
import { Badge, Button, LoadingBlock } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { CrossChips, DsaProblems, MasteryRing } from './NodePanel'
import { ExamInsight, Flashcards, MasteryMeter, NodeNotes, TestOut, TimeChip, UnlockPath, type NodeInsight } from './NodeExtras'
import { confidence, unlockPath } from './insights'
import { useAgentContext } from '@/context/AgentContext'
import { useToast } from '@/components/ui'
import { usePhone } from './extras'
import type { CrossLink, NexusNode } from './types'

/*
 * A node's contents, opened from its subject page: a slide-over on
 * desktop, a full sheet on phones. What it is (summary, the checklist of
 * what you'll learn), where to learn it (the GATE notes lesson with its
 * sections, or the course), how to practise it (PYQs, practice questions,
 * rated problems for DSA), what it needs and unlocks, and the actions.
 * The content is fetched when the node opens and cached.
 */

export interface NodeContentData {
  ok: boolean
  subject: string
  node: string
  summary: string
  topics: string[]
  desc: string
  kind: string
  optional: boolean
  resources: { title: string; url: string }[]
  lessons: {
    id: string
    title: string
    chapter: string
    minutes: number | null
    status: string
    href: string
    readable: boolean
    sections: { id: string; title: string; href: string }[]
    examples: number
    animations: number
    practice: number
    pyqs: number
  }[]
  course: { outline: string[] } | null
  cards?: { front: string; back: string; kind?: string }[]
}

const H = 'mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase'

/** "Mark for review": a list kept on this device (shown as amber rings). */
const REVIEW_KEY = 'nexus:review:v1'
export function readReviewList(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(REVIEW_KEY) || '[]') as string[])
  } catch {
    return new Set()
  }
}
export function toggleReview(key: string): Set<string> {
  const s = readReviewList()
  if (s.has(key)) s.delete(key)
  else s.add(key)
  try {
    localStorage.setItem(REVIEW_KEY, JSON.stringify([...s]))
    window.dispatchEvent(new CustomEvent('nexus:review'))
  } catch {
    /* storage blocked */
  }
  return s
}
/** The review list, live (updates when marked from anywhere). */
export function useReviewList() {
  const [list, setList] = useState(readReviewList)
  useEffect(() => {
    const on = () => setList(readReviewList())
    window.addEventListener('nexus:review', on)
    window.addEventListener('storage', on)
    return () => {
      window.removeEventListener('nexus:review', on)
      window.removeEventListener('storage', on)
    }
  }, [])
  return list
}

/** Topics you have ticked off (this device). */
function useTicks(key: string) {
  const k = `nexus:ticks:${key}`
  const [ticks, setTicks] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(k) || '[]') as number[]
    } catch {
      return []
    }
  })
  const toggle = (i: number) => {
    const next = ticks.includes(i) ? ticks.filter((x) => x !== i) : [...ticks, i]
    setTicks(next)
    try {
      localStorage.setItem(k, JSON.stringify(next))
    } catch {
      /* storage blocked */
    }
  }
  return { ticks, toggle }
}

export function NodeContent({
  subject,
  node,
  nodes,
  zoneName,
  zoneLevel,
  zoneColor,
  isDsa,
  due,
  studyHref,
  onPractise,
  shareHref,
  onClose,
  onSelect,
  onJump,
  hueOf,
  insight = null,
  minutes = {},
  note = null,
  onNoteSaved,
  onMastered,
  subjectName = '',
}: {
  subject: string
  node: NexusNode
  nodes: NexusNode[]
  zoneName: string
  zoneLevel: number
  zoneColor: string
  isDsa: boolean
  due: boolean
  studyHref: string
  onPractise?: () => void
  shareHref: string
  onClose: () => void
  onSelect: (id: string) => void
  onJump: (l: CrossLink) => void
  hueOf?: (subject: string) => string | undefined
  /** this node's insight (time, weightage, peers), from /api/nexus/insights */
  insight?: NodeInsight | null
  /** minutes per node of this subject (unlock path time) */
  minutes?: Record<string, number>
  /** your note and bookmark */
  note?: { note: string; bookmarked: boolean } | null
  onNoteSaved?: (v: { note: string; bookmarked: boolean }) => void
  /** after a passed quick check: refresh everything */
  onMastered?: () => void
  subjectName?: string
}) {
  const key = `${subject}:${node.id}`
  const agent = useAgentContext()
  const toast = useToast()
  const [testing, setTesting] = useState(false)
  const { data, loading, error } = useApi<NodeContentData>(() => api.get<NodeContentData>(`/api/nexus/content/${subject}/${node.id}`), [subject, node.id], {
    cacheKey: `nexus:content:${key}`,
  })
  const review = useReviewList()
  const marked = review.has(key)
  const { ticks, toggle } = useTicks(key)
  const [copied, setCopied] = useState(false)
  const prereqs = node.requires.map((id) => nodes.find((n) => n.id === id)).filter((n): n is NexusNode => !!n)
  const unlocks = nodes.filter((n) => n.requires.includes(node.id))
  const state = node.completed ? 'done' : node.unlocked ? 'open' : 'locked'
  const m = node.metric
  const pyq = m?.pyq
  const practiceQs = (data?.lessons ?? []).reduce((a, l) => a + l.practice, 0)
  const topics = data?.topics ?? []
  const done = node.completed ? topics.map((_, i) => i) : ticks
  const kind = isDsa ? 'Skill' : node.kind === 'project' ? 'Project' : node.kind === 'lesson' ? 'Lesson' : 'Concept'

  return (
    <article className="nx-panel space-y-6" style={{ boxShadow: "none", border: 0, background: "transparent", padding: 0, borderRadius: 0 }} aria-label={`${node.name}: contents`}>
      {/* Header */}
      <header className="flex items-start gap-3">
        <MasteryRing value={node.completed ? 100 : node.progress} color={zoneColor} state={state} icon={node.icon} due={due || marked} />
        <div className="min-w-0 flex-1">
          <p className="mb-0 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
            Zone {zoneLevel} · {zoneName} · {kind}
          </p>
          <h2 className="mt-1 mb-0 font-display text-xl leading-snug tracking-wide text-foreground">{node.name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant={state === 'done' ? 'success' : state === 'open' ? 'primary' : 'default'}>
              {state === 'locked' && <Lock className="size-3" aria-hidden="true" />}
              {state === 'done' ? 'mastered' : state === 'open' ? 'open to you' : 'locked'}
            </Badge>
            <Badge variant="gold">
              <Zap className="size-3" aria-hidden="true" />
              {node.xpReward} XP
            </Badge>
            {(data?.optional || node.optional) && <Badge variant="default">optional</Badge>}
            {insight && <TimeChip minutes={insight.min} />}
            {insight?.hy && <Badge variant="warning">high-yield</Badge>}
            {(due || marked) && <Badge variant="warning">{due ? 'due for review' : 'marked for review'}</Badge>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mt-1 -mr-1 cursor-pointer rounded-md p-1.5 text-foreground-dim transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent-brand focus-visible:outline-none"
        >
          <X className="size-4" />
        </button>
      </header>

      {loading && !data ? (
        <div className="space-y-2" aria-hidden="true">
          <div className="nx-skel h-3.5 w-full rounded" />
          <div className="nx-skel h-3.5 w-4/5 rounded" />
        </div>
      ) : (
        <p className="mb-0 text-[15px] leading-relaxed text-foreground-dim">{data?.summary || node.desc}</p>
      )}

      {(() => {
        const c = confidence(node)
        return <MasteryMeter score={c.score} breakdown={c.breakdown} color={zoneColor} />
      })()}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Link to={studyHref} className="min-w-[9rem] flex-1" tabIndex={-1}>
          <Button variant="primary" size="sm" className="nx-press w-full justify-center">
            <BookOpen className="size-3.5" aria-hidden="true" /> Study this
          </Button>
        </Link>
        {onPractise && (
          <Button variant="outline" size="sm" className="nx-press" onClick={onPractise}>
            <PenLine className="size-3.5" aria-hidden="true" /> Practise
          </Button>
        )}
        {!isDsa && !node.completed && (node.metric?.pyq?.pool ?? 0) >= 3 && (
          <Button variant="outline" size="sm" className="nx-press" onClick={() => setTesting((v) => !v)} aria-expanded={testing}>
            <GraduationCap className="size-3.5" aria-hidden="true" /> Test out
          </Button>
        )}
        <Button variant="outline" size="sm" className="nx-press" onClick={() => toggleReview(key)} aria-pressed={marked}>
          {marked ? <BookmarkCheck className="size-3.5 text-warning" aria-hidden="true" /> : <Bookmark className="size-3.5" aria-hidden="true" />}
          {marked ? 'Marked' : 'Mark for review'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="nx-press"
          aria-label="Copy a link to this node"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(new URL(shareHref, window.location.origin).toString())
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1600)
            } catch {
              /* clipboard blocked */
            }
          }}
        >
          {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Link2 className="size-3.5" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="nx-press"
          onClick={() =>
            agent.openAssistant(
              `Explain "${node.name}" (${subjectName || subject}) to me step by step. It covers: ${(data?.topics ?? []).join('; ')}. My progress on it is ${node.progress}%${node.metric?.pyq ? `, ${Math.min(node.metric.pyq.correct, node.metric.pyq.target)}/${node.metric.pyq.target} PYQs right${node.metric.pyq.accuracy != null ? ` at ${node.metric.pyq.accuracy}% accuracy` : ''}` : ''}. Start with the idea, then a worked example, then the usual exam traps.`,
            )
          }
        >
          <MessageSquareText className="size-3.5" aria-hidden="true" /> Explain this
        </Button>
      </div>

      {testing && (
        <TestOut
          subject={subject}
          node={node.id}
          onClose={() => setTesting(false)}
          onPassed={() => {
            onMastered?.()
          }}
        />
      )}

      {!node.unlocked && (() => {
        const path = unlockPath(nodes.map((n) => ({ id: n.id, requires: n.requires, completed: n.completed })), node.id, minutes)
        return (
          <UnlockPath
            steps={path.steps}
            names={Object.fromEntries(nodes.map((n) => [n.id, n.name]))}
            minutes={minutes}
            onStart={() => path.steps[0] && onSelect(path.steps[0])}
            onPick={onSelect}
          />
        )
      })()}

      {/* What you'll learn */}
      <section aria-labelledby={`wyl-${node.id}`}>
        <h3 id={`wyl-${node.id}`} className={H}>
          <ListChecks className="size-3.5" aria-hidden="true" /> What you'll learn
          {topics.length > 0 && (
            <span className="ml-auto font-mono font-normal tracking-normal normal-case tabular-nums">
              {done.length}/{topics.length}
            </span>
          )}
        </h3>
        {loading && !data ? (
          <LoadingBlock rows={3} />
        ) : error && !data ? (
          <p className="mb-0 text-xs text-foreground-dim">Could not load the contents — try again in a moment.</p>
        ) : (
          <ul className="space-y-1">
            {topics.map((t, i) => {
              const on = done.includes(i)
              return (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => !node.completed && toggle(i)}
                    className={cn('group flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13.5px] transition-colors hover:bg-text-primary/4', node.completed && 'cursor-default')}
                    aria-pressed={on}
                  >
                    <span
                      className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors', on ? 'border-transparent text-white' : 'border-border-strong')}
                      style={on ? { background: zoneColor } : undefined}
                      aria-hidden="true"
                    >
                      {on && <Check className="size-2.5" strokeWidth={4} />}
                    </span>
                    <span className={cn(on ? 'text-foreground-dim' : 'text-foreground')}>{t}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Lessons, or the course */}
      {data && data.lessons.length > 0 ? (
        <section aria-label="Lessons">
          <h3 className={H}>
            <BookOpen className="size-3.5" aria-hidden="true" /> {data.lessons.length > 1 ? 'Lessons' : 'Lesson'}
          </h3>
          <div className="space-y-4">
            {data.lessons.map((l) => (
              <div key={l.id} className="rounded-xl border border-border bg-surface/60 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="mb-0 text-[11px] text-foreground-faint">{l.chapter}</p>
                    <p className="mb-0 font-display text-[15px] font-semibold text-foreground">{l.title}</p>
                  </div>
                  {l.readable ? (
                    <Link to={l.href} className="shrink-0">
                      <Button variant="outline" size="sm" className="nx-press">
                        Read lesson <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </Button>
                    </Link>
                  ) : (
                    <Badge variant="default">in preparation</Badge>
                  )}
                </div>
                <p className="mt-2 mb-0 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-foreground-dim tabular-nums">
                  {l.minutes ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" aria-hidden="true" /> {l.minutes} min
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="size-3" aria-hidden="true" /> {l.examples} worked example{l.examples === 1 ? '' : 's'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Film className="size-3" aria-hidden="true" /> {l.animations} animation{l.animations === 1 ? '' : 's'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <PenLine className="size-3" aria-hidden="true" /> {l.practice} practice
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Target className="size-3" aria-hidden="true" /> {l.pyqs} PYQs
                  </span>
                </p>
                {l.sections.length > 0 && (
                  <ol className="mt-3 mb-0 space-y-0.5 border-t border-border pt-2.5">
                    {l.sections.map((sec, i) => (
                      <li key={sec.id} className="flex items-baseline gap-2 text-[13px]">
                        <span className="w-5 shrink-0 text-right font-mono text-[10.5px] text-foreground-faint tabular-nums">{i + 1}</span>
                        {l.readable ? (
                          <Link to={sec.href} className="text-foreground-dim transition-colors hover:text-accent-brand hover:underline">
                            {sec.title}
                          </Link>
                        ) : (
                          <span className="text-foreground-dim">{sec.title}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : data ? (
        <section aria-label="Course">
          <h3 className={H}>
            <BookOpen className="size-3.5" aria-hidden="true" /> Course
          </h3>
          {data.course?.outline.length ? (
            <ol className="mb-0 ml-5 list-decimal space-y-1 text-[13.5px] text-foreground-dim">
              {data.course.outline.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ol>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-3.5 text-[13px] text-foreground-dim">
              <p className="mb-0 font-semibold text-foreground">Course coming soon</p>
              <p className="mt-0.5 mb-0">The full course is being written; the checklist above is what it will cover.</p>
            </div>
          )}
        </section>
      ) : null}

      {/* Practice */}
      {(pyq || practiceQs > 0 || isDsa) && (
        <section aria-label="Practice">
          <h3 className={H}>
            <PenLine className="size-3.5" aria-hidden="true" /> Practice
          </h3>
          {pyq && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3">
              <div>
                <p className="mb-0 text-[13.5px] text-foreground">GATE PYQs</p>
                <p className="mb-0 font-mono text-[11.5px] text-foreground-dim tabular-nums">
                  {Math.min(pyq.correct, pyq.target)}/{pyq.target} solved · {pyq.pool} in the pool{pyq.accuracy != null ? ` · ${pyq.accuracy}% accuracy` : ''}
                </p>
              </div>
              {onPractise && (
                <Button variant="outline" size="sm" className="nx-press" onClick={onPractise}>
                  Practise <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Button>
              )}
            </div>
          )}
          {practiceQs > 0 && (
            <p className="mt-2 mb-0 text-[12.5px] text-foreground-dim">
              Plus <span className="font-mono text-foreground tabular-nums">{practiceQs}</span> practice questions inside the lesson
              {data && data.lessons.length === 1 && data.lessons[0].readable ? (
                <>
                  {' '}
                  —{' '}
                  <Link to={data.lessons[0].href} className="text-accent-brand underline decoration-accent-brand/40 underline-offset-2 hover:decoration-accent-brand">
                    open it
                  </Link>
                </>
              ) : null}
              .
            </p>
          )}
          {isDsa && <DsaProblems node={node} />}
        </section>
      )}

      <ExamInsight subject={subject} node={node.id} insight={insight} color={zoneColor} />

      <Flashcards
        cards={
          data?.cards?.length
            ? data.cards
            : data
              ? [
                  { front: `What does **${node.name}** cover?`, back: data.summary },
                  ...data.topics.map((t) => ({ front: `${t} — explain it in a sentence.`, back: `Part of ${node.name}${subjectName ? ` (${subjectName})` : ''}: ${data.summary}` })),
                ]
              : []
        }
        canReview={!!node.metric?.pyq}
        onAddToReview={async () => {
          try {
            const r = await api.post<{ ok: boolean; added: number }>(`/api/nexus/review/${subject}/${node.id}`)
            toast.success('Added to your Review deck', `${r.added} question${r.added === 1 ? '' : 's'} due today`)
          } catch {
            toast.error('Could not add to the Review deck')
          }
        }}
      />

      <NodeNotes subject={subject} node={node.id} initial={note} onSaved={(v) => onNoteSaved?.(v)} />

      {/* Needs and unlocks */}
      {(prereqs.length > 0 || unlocks.length > 0 || (node.crossRequires ?? []).length > 0 || (node.crossUnlocks ?? []).length > 0) && (
        <section aria-label="Prerequisites and unlocks" className="space-y-3">
          {prereqs.length > 0 && (
            <div>
              <h3 className={H}>Prerequisites</h3>
              <div className="flex flex-wrap gap-1.5">
                {prereqs.map((p) => (
                  <button key={p.id} type="button" className="cursor-pointer" onClick={() => onSelect(p.id)}>
                    <Badge variant={p.completed ? 'success' : 'default'}>
                      {!p.completed && <Lock className="size-3" aria-hidden="true" />}
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
              <h3 className={H}>Unlocks</h3>
              <div className="flex flex-wrap gap-1.5">
                {unlocks.map((u) => (
                  <button key={u.id} type="button" className="cursor-pointer" onClick={() => onSelect(u.id)}>
                    <Badge variant={u.completed ? 'success' : u.unlocked ? 'primary' : 'default'}>{u.name}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
          <CrossChips title="Unlocks in other subjects" links={node.crossUnlocks ?? []} kind="unlocks" onJump={onJump} hueOf={hueOf} />
        </section>
      )}

      {/* Resources */}
      {(data?.resources?.length ?? 0) > 0 && (
        <section aria-label="Resources">
          <h3 className={H}>Resources</h3>
          <ul className="mb-0 space-y-1">
            {data!.resources.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px] text-info hover:text-cyan hover:underline">
                  <ExternalLink className="size-3" aria-hidden="true" /> {r.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {node.completed && (
        <p className="mb-0 flex items-center gap-2 text-[12.5px]" style={{ color: zoneColor }}>
          <Swords className="size-3.5" aria-hidden="true" /> Mastered — everything it unlocks is open to you.
        </p>
      )}
    </article>
  )
}

/** The slide-over (desktop) or full sheet (phone) the contents open in. */
export function NodeSheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: React.ReactNode }) {
  const phone = usePhone()
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[2190] bg-bg-app/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={cn(
              'fixed z-[2200] overflow-y-auto border-border shadow-2xl',
              phone ? 'inset-0 px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]' : 'top-0 right-0 bottom-0 w-[min(540px,100vw)] border-l px-6 py-6',
            )}
            style={{ background: 'var(--color-bg-surface)' }}
            initial={reduce ? { opacity: 0 } : phone ? { y: '100%' } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : phone ? { y: 0 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : phone ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
          >
            {phone && <div className="nx-sheet-handle" aria-hidden="true" />}
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
