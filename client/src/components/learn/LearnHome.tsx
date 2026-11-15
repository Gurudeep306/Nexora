import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Network, PenLine, Search } from 'lucide-react'
import { LoadingBlock } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useNexusWeb, progressOf } from '@/components/nexus/SubjectsHub'
import { subjectHref } from '@/components/nexus/course'
import { prefetchHandlers } from '@/routes'
import { DSA_TOPICS } from '@/learn/content/dsa/syllabus'
import { isDone, useProgress } from '@/learn/progress'
import type { WebCluster, WebNode } from '@/components/nexus/types'

/*
 * /learn — one clear way in.
 *
 *   Continue            the subjects you've started, each with its next skill
 *   Ready to study      subjects with written lessons: three doors each —
 *                       Lessons · Skill tree · Practice
 *   All subjects        every Nexus subject, filterable, with badges for what
 *                       it holds (lessons, past questions)
 *   More ways to learn  System Design Studio, tutorials, paths
 *
 * Research notes: Brilliant and roadmap.sh both lead with "where you are and
 * what's next"; the map, the lesson and the practice are one object, not
 * three products.
 */

type Filter = 'all' | 'lessons' | 'gate' | 'started'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'lessons', label: 'With lessons' },
  { id: 'gate', label: 'GATE' },
  { id: 'started', label: 'Started' },
]

/** The next skill to study: open (unlocked, not mastered), earliest zone first. */
function nextNode(c: WebCluster): WebNode | null {
  const open = c.nodes.filter((n) => n.s === 1).sort((a, b) => a.z - b.z || b.p - a.p)
  return open[0] ?? null
}

/** Days since anything in the subject was studied (Infinity: never). */
function lastStudied(c: WebCluster): number {
  let best = Infinity
  for (const n of c.nodes) if (typeof n.td === 'number' && n.td >= 0) best = Math.min(best, n.td)
  return best
}

function Ring({ value, size = 40 }: { value: number; size?: number }) {
  const r = size / 2 - 3
  const C = 2 * Math.PI * r
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden="true">
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth="2.5" />
        {value > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-accent-brand)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${(C * value) / 100} ${C}`} />
        )}
      </svg>
      <span className="font-mono text-[10.5px] text-text-secondary tabular-nums">{value}</span>
    </span>
  )
}

export function LearnHome() {
  const { structure, clusters, error, notes } = useNexusWeb()
  const { items } = useProgress()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const dsaReady = DSA_TOPICS.filter((t) => t.load)
  const dsaRead = useMemo(() => Object.keys(items).filter((k) => k.startsWith('page:') && isDone(items[k])).length, [items])

  if (!clusters || !structure) return error ? <p className="text-sm text-text-secondary">{error}</p> : <LoadingBlock rows={8} />

  const hasLessons = (c: WebCluster) => c.engine === 'dsa' || c.id === 'sysd' || (!!c.gate?.notes && notes.has(c.gate.notes))
  const lessonsHref = (c: WebCluster) =>
    c.engine === 'dsa' ? '/learn?tab=dsa' : c.id === 'sysd' ? '/learn?tab=sysdesign' : `/gate/notes/${c.gate?.notes}`
  const practiceHref = (c: WebCluster) => (c.engine === 'dsa' ? '/problems' : c.gate?.pyq ? `/gate/practice?subject=${encodeURIComponent(c.gate.pyq)}` : null)

  const started = clusters
    .filter((c) => progressOf(c) > 0 || lastStudied(c) < Infinity)
    .sort((a, b) => lastStudied(a) - lastStudied(b) || progressOf(b) - progressOf(a))
    .slice(0, 4)
  const ready = clusters.filter(hasLessons).sort((a, b) => (a.engine === 'dsa' ? -1 : b.engine === 'dsa' ? 1 : a.order - b.order))

  const needle = q.trim().toLowerCase()
  const visible = clusters.filter((c) => {
    if (needle && !`${c.name} ${c.short} ${c.description ?? ''}`.toLowerCase().includes(needle)) return false
    if (filter === 'lessons') return hasLessons(c)
    if (filter === 'gate') return !!c.gate?.pyq
    if (filter === 'started') return progressOf(c) > 0
    return true
  })
  const streams = (structure.streams ?? [])
    .map((st) => ({ st, list: visible.filter((c) => c.stream === st.id).sort((a, b) => a.order - b.order) }))
    .filter((x) => x.list.length)

  return (
    <div className="learn-home space-y-12">
      {/* Continue */}
      {started.length > 0 && (
        <section aria-labelledby="lh-continue">
          <h2 id="lh-continue" className="lh-h">
            Continue
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {started.map((c) => {
              const nx = nextNode(c)
              const href = subjectHref(c, nx?.id)
              return (
                <li key={c.id}>
                  <Link to={href} {...prefetchHandlers(href)} className="lh-continue card card-interactive">
                    <span className="flex items-center gap-3">
                      <Ring value={progressOf(c)} />
                      <span className="min-w-0">
                        <span className="block truncate text-[14.5px] font-semibold text-text-primary">{c.name}</span>
                        <span className="block truncate text-[12.5px] text-text-muted">{nx ? `Next: ${nx.n}` : 'Review what you know'}</span>
                      </span>
                    </span>
                    <span className="lh-go">
                      Resume <ArrowRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Ready to study: lessons, tree and practice together */}
      <section aria-labelledby="lh-ready">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="lh-ready" className="lh-h mb-0">
            Ready to study
          </h2>
          <p className="m-0 text-[13px] text-text-muted">Written lessons, a skill tree and practice — in one place.</p>
        </div>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ready.map((c) => {
            const p = progressOf(c)
            const nx = nextNode(c)
            const practice = practiceHref(c)
            const lessons = c.nodes.reduce((n, x) => n + (x.ls?.length ?? 0), 0)
            const meta =
              c.engine === 'dsa'
                ? `${dsaReady.length} chapters ready · ${dsaRead} pages read`
                : `${lessons || c.nodes.length} ${lessons ? 'lessons' : 'skills'}${c.gate?.pyq ? ' · GATE past questions' : ''}`
            return (
              <li key={c.id} className="lh-ready card">
                <Link to={subjectHref(c, nx?.id)} {...prefetchHandlers(subjectHref(c))} className="lh-ready-head">
                  <Ring value={p} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold tracking-[-0.01em] text-text-primary">{c.engine === 'dsa' ? 'Data Structures & Algorithms' : c.name}</span>
                    <span className="block text-[12.5px] text-text-muted">{meta}</span>
                  </span>
                </Link>
                {c.description && <p className="lh-ready-desc">{c.description}</p>}
                <div className="lh-doors">
                  <Link to={lessonsHref(c)} className="lh-door">
                    <BookOpen className="size-4" aria-hidden="true" />
                    <span>Lessons</span>
                  </Link>
                  <Link to={subjectHref(c)} {...prefetchHandlers(subjectHref(c))} className="lh-door">
                    <Network className="size-4" aria-hidden="true" />
                    <span>Skill tree</span>
                  </Link>
                  {practice ? (
                    <Link to={practice} className="lh-door">
                      <PenLine className="size-4" aria-hidden="true" />
                      <span>Practice</span>
                    </Link>
                  ) : (
                    <span className="lh-door is-off" aria-disabled="true" title="No practice set for this subject yet">
                      <PenLine className="size-4" aria-hidden="true" />
                      <span>Practice</span>
                    </span>
                  )}
                </div>
                {nx && (
                  <Link to={subjectHref(c, nx.id)} className="lh-next">
                    <span className="text-text-muted">Next</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{nx.n}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {/* Every subject */}
      <section aria-labelledby="lh-all">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="lh-all" className="lh-h mb-0">
            All subjects <span className="font-mono text-[12px] font-normal text-text-muted">{clusters.length}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="lh-seg" role="radiogroup" aria-label="Filter subjects">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" role="radio" aria-checked={filter === f.id} onClick={() => setFilter(f.id)} className={cn('lh-seg-btn', filter === f.id && 'is-on')}>
                  {f.label}
                </button>
              ))}
            </div>
            <label className="search-field w-full sm:w-60">
              <Search className="search-field-icon" aria-hidden="true" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a subject" aria-label="Find a subject" />
            </label>
          </div>
        </div>
        {streams.length === 0 && <p className="text-[14px] text-text-muted">No subject matches that.</p>}
        <div className="space-y-8">
          {streams.map(({ st, list }) => (
            <div key={st.id}>
              <h3 className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-text-secondary">
                {st.name}
                <span className="font-mono text-[11px] font-normal text-text-muted">{list.length}</span>
              </h3>
              <ul className="lh-list">
                {list.map((c) => {
                  const p = progressOf(c)
                  return (
                    <li key={c.id}>
                      <Link to={subjectHref(c)} {...prefetchHandlers(subjectHref(c))} className="lh-row">
                        <Ring value={p} size={34} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-text-primary">{c.name}</span>
                          <span className="block truncate text-[12px] text-text-muted">{c.nodes.length} skills</span>
                        </span>
                        <span className="flex shrink-0 gap-1">
                          {hasLessons(c) && <span className="lh-badge">Lessons</span>}
                          {c.gate?.pyq && <span className="lh-badge">PYQs</span>}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Other ways to learn */}
      <section aria-labelledby="lh-more">
        <h2 id="lh-more" className="lh-h">
          More ways to learn
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/learn?tab=dsa', title: 'DSA course map', text: 'All 30 chapters, unit by unit.' },
            { to: '/learn?tab=sysdesign', title: 'System Design Studio', text: 'Build and stress real architectures.' },
            { to: '/learn?tab=tutorials', title: 'Tutorials', text: 'Deep dives on single topics.' },
            { to: '/learn?tab=paths', title: 'Paths', text: 'Guided journeys across subjects.' },
            { to: '/nexus', title: 'Nexus', text: 'Every subject as one web of skills.' },
          ].map((x) => (
            <li key={x.to}>
              <Link to={x.to} className="lh-more card card-interactive">
                <span className="block text-[14px] font-semibold text-text-primary">{x.title}</span>
                <span className="block text-[12.5px] text-text-muted">{x.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
