import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { LoadingBlock } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useNexusWeb, progressOf } from '@/components/nexus/SubjectsHub'
import { subjectHref } from '@/components/nexus/course'
import { prefetchHandlers } from '@/routes'
import { DSA_TOPICS } from '@/learn/content/dsa/syllabus'
import { isDone, useProgress } from '@/learn/progress'
import { LessonPreview } from '@/components/landing/LessonPreview'
import { SchedulerPreview } from '@/components/landing/SchedulerPreview'
import { GraphPreview } from '@/components/landing/GraphPreview'
import { figureFor, findContinue, lastStudied, nextNode } from '@/components/today/today-data'
import type { WebCluster } from '@/components/nexus/types'

/*
 * /learn — "The Library".
 *
 *   Ready to study      one spread for the subject in progress (a live figure,
 *                       the next lesson, the one clay button), then ivory
 *                       cards for the other subjects with written lessons,
 *                       each with three text links: Lessons · Skill tree · Practice
 *   All subjects        every Nexus subject by stream, as hairline rows,
 *                       filtered live
 *   More ways to learn  a hairline list
 *
 * Research notes: Brilliant and roadmap.sh both lead with "where you are and
 * what's next"; the map, the lesson and the practice are one object.
 */

type Filter = 'all' | 'lessons' | 'gate' | 'started'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'lessons', label: 'With lessons' },
  { id: 'gate', label: 'GATE' },
  { id: 'started', label: 'Started' },
]

function Figure({ kind }: { kind: ReturnType<typeof figureFor> }) {
  return <div className="ed-specimen lh-figure">{kind === 'schedule' ? <SchedulerPreview /> : kind === 'graph' ? <GraphPreview /> : <LessonPreview />}</div>
}

export function LearnHome() {
  const { structure, clusters, error, notes } = useNexusWeb()
  const { items } = useProgress()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const dsaReady = DSA_TOPICS.filter((t) => t.load)
  const dsaRead = useMemo(() => Object.keys(items).filter((k) => k.startsWith('page:') && isDone(items[k])).length, [items])
  const cont = useMemo(() => findContinue(items, clusters), [items, clusters])

  if (!clusters || !structure) return error ? <p className="ed-body-sm ed-ink-2">{error}</p> : <LoadingBlock rows={8} />

  const hasLessons = (c: WebCluster) => c.engine === 'dsa' || (!!c.gate?.notes && notes.has(c.gate.notes))
  const lessonsHref = (c: WebCluster) => (c.engine === 'dsa' ? '/learn?tab=dsa' : `/gate/notes/${c.gate?.notes}`)
  const practiceHref = (c: WebCluster) => (c.engine === 'dsa' ? '/problems' : c.gate?.pyq ? `/gate/practice?subject=${encodeURIComponent(c.gate.pyq)}` : null)
  const nameOf = (c: WebCluster) => (c.engine === 'dsa' ? 'Data Structures & Algorithms' : c.name)

  const ready = clusters.filter(hasLessons).sort((a, b) => (a.engine === 'dsa' ? -1 : b.engine === 'dsa' ? 1 : a.order - b.order))
  // The spread's subject: the one in progress, else DSA (the flagship course).
  const dsa = clusters.find((c) => c.engine === 'dsa') ?? null
  const spreadCluster = cont ? (clusters.find((c) => nameOf(c) === cont.subject) ?? null) : dsa
  const first = dsaReady[0]
  const spread = cont
    ? { subject: cont.subject, title: cont.title, to: cont.to, figure: cont.figure, cta: cont.page?.read === 0 ? `Start ${cont.title}` : 'Continue', line: cont.page ? `page ${Math.min(cont.page.read + 1, cont.page.of)} of ${cont.page.of}` : `${cont.pct ?? 0}% mastered` }
    : first
      ? { subject: 'Data Structures & Algorithms', title: first.title, to: `/learn/dsa/${first.id}`, figure: 'search' as const, cta: `Start ${first.title}`, line: `${first.pages ?? 0} pages · the first chapter` }
      : null
  const others = ready.filter((c) => c !== spreadCluster)
  const started = clusters
    .filter((c) => c !== spreadCluster && (progressOf(c) > 0 || lastStudied(c) < Infinity))
    .sort((a, b) => lastStudied(a) - lastStudied(b))
    .slice(0, 3)

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
    <div className="learn-home lh">
      {/* Ready to study */}
      <section aria-labelledby="lh-ready">
        <h2 id="lh-ready" className="ed-label ed-muted m-0">
          Ready to study
        </h2>

        {spread && (
          <div className="ed-feature lh-spread mt-6">
            <div className="min-w-0">
              <p className="ed-label m-0">{cont ? 'In progress' : 'Start here'}</p>
              <p className="ed-ui-sm ed-muted mt-4 mb-0">{spread.subject}</p>
              <h3 className="ed-h2 mt-1 mb-0">{spread.title}</h3>
              <p className="ed-mono ed-muted mt-3 mb-0 text-[12px]">{spread.line}</p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link to={spread.to} {...prefetchHandlers(spread.to)} className="ed-btn ed-btn-clay">
                  {spread.cta}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                {spreadCluster && (
                  <Link to={subjectHref(spreadCluster)} {...prefetchHandlers(subjectHref(spreadCluster))} className="ed-link ed-ui">
                    Table of contents
                  </Link>
                )}
              </div>
              {started.length > 0 && (
                <div className="mt-10">
                  <p className="ed-label m-0">Also in progress</p>
                  <ul className="ed-rows lh-spread-rows mt-3 mb-0 list-none p-0">
                    {started.map((c) => {
                      const nx = nextNode(c)
                      const href = subjectHref(c, nx?.id)
                      return (
                        <li key={c.id}>
                          <Link to={href} {...prefetchHandlers(href)} className="lh-row">
                            <span className="min-w-0 flex-1">
                              <span className="ed-ui block truncate font-medium">{nameOf(c)}</span>
                              <span className="ed-caption ed-muted block truncate">{nx ? `Next: ${nx.n}` : 'Review what you know'}</span>
                            </span>
                            <span className="ed-mono ed-muted text-[12px]">{progressOf(c)}%</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
            <Figure kind={spread.figure} />
          </div>
        )}

        <ul className="lh-cards mt-6 mb-0 list-none p-0">
          {others.map((c) => {
            const p = progressOf(c)
            const nx = nextNode(c)
            const practice = practiceHref(c)
            const lessons = c.nodes.reduce((n, x) => n + (x.ls?.length ?? 0), 0)
            const meta =
              c.engine === 'dsa'
                ? `${dsaReady.length} chapters ready · ${dsaRead} pages read`
                : `${lessons || c.nodes.length} ${lessons ? 'lessons' : 'skills'}${c.gate?.pyq ? ' · GATE past questions' : ''}`
            return (
              <li key={c.id} className="ed-card lh-card">
                <p className="ed-label ed-muted m-0">{p > 0 ? `${p}% mastered` : 'Not started'}</p>
                <h3 className="ed-serif lh-card-title mt-3 mb-0">
                  <Link to={subjectHref(c, nx?.id)} {...prefetchHandlers(subjectHref(c))} className="lh-card-link">
                    {nameOf(c)}
                  </Link>
                </h3>
                <p className="ed-caption ed-muted mt-1 mb-0">{meta}</p>
                {c.description && <p className="ed-body-sm ed-ink-2 lh-card-desc mt-3 mb-0">{c.description}</p>}
                {nx && (
                  <p className="ed-ui-sm ed-ink-2 mt-4 mb-0">
                    <span className="ed-muted">Next · </span>
                    {nx.n}
                  </p>
                )}
                <p className="ed-ui-sm mt-auto mb-0 flex flex-wrap gap-x-4 gap-y-1 pt-5">
                  <Link to={lessonsHref(c)} className="ed-link">
                    Lessons
                  </Link>
                  <Link to={`${subjectHref(c)}?view=tree`} {...prefetchHandlers(subjectHref(c))} className="ed-link">
                    Skill tree
                  </Link>
                  {practice ? (
                    <Link to={practice} className="ed-link">
                      Practice
                    </Link>
                  ) : (
                    <span className="ed-muted" title="No practice set for this subject yet">
                      Practice soon
                    </span>
                  )}
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Every subject */}
      <section aria-labelledby="lh-all">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <p className="ed-label ed-muted m-0">The catalogue</p>
            <h2 id="lh-all" className="ed-h2 mt-3 mb-0">
              All subjects <span className="ed-mono ed-muted align-middle text-[14px]">{clusters.length}</span>
            </h2>
          </div>
          <label className="search-field w-full sm:w-64">
            <Search className="search-field-icon" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a subject" aria-label="Find a subject" />
          </label>
        </div>
        <div className="ed-tabs mt-6" role="radiogroup" aria-label="Filter subjects">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={filter === f.id} onClick={() => setFilter(f.id)} className={cn('ed-tab', filter === f.id && 'is-on')}>
              {f.label}
            </button>
          ))}
        </div>
        {streams.length === 0 && <p className="ed-body-sm ed-ink-2 mt-8">No subject matches that.</p>}
        <div className="mt-10 space-y-12">
          {streams.map(({ st, list }) => (
            <div key={st.id}>
              <h3 className="ed-serif lh-group mt-0 mb-2">
                {st.name} <span className="ed-mono ed-muted text-[12px]">{list.length}</span>
              </h3>
              <ul className="lh-list m-0 list-none p-0">
                {list.map((c) => {
                  const p = progressOf(c)
                  const lessons = hasLessons(c)
                  return (
                    <li key={c.id}>
                      <Link to={subjectHref(c)} {...prefetchHandlers(subjectHref(c))} className="lh-row">
                        <span className="min-w-0 flex-1">
                          <span className="ed-ui block truncate font-medium">{c.name}</span>
                          <span className="ed-caption ed-muted block truncate">
                            {c.nodes.length} skills{c.gate?.pyq ? ' · GATE past questions' : ''}
                            {p > 0 ? ` · ${p}% mastered` : ''}
                          </span>
                        </span>
                        <span className={cn('ed-ui-sm shrink-0', lessons ? 'ed-ink' : 'lh-soon')}>{lessons ? 'Ready' : 'Being written'}</span>
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
        <p className="ed-label ed-muted m-0">Elsewhere in the library</p>
        <h2 id="lh-more" className="ed-h2 mt-3 mb-0">
          More ways to learn
        </h2>
        <ul className="ed-rows lh-more mt-6 mb-0 list-none p-0">
          {[
            { to: '/learn?tab=dsa', title: 'DSA course map', text: `All ${DSA_TOPICS.length} chapters, unit by unit.` },
            { to: '/learn?tab=tutorials', title: 'Tutorials', text: 'Deep dives on single topics.' },
            { to: '/learn?tab=paths', title: 'Paths', text: 'Guided journeys across subjects.' },
            { to: '/nexus', title: 'Nexus', text: 'Every subject as one web of skills.' },
          ].map((x) => (
            <li key={x.to}>
              <Link to={x.to} {...prefetchHandlers(x.to)} className="lh-row">
                <span className="ed-ui w-48 shrink-0 font-medium">{x.title}</span>
                <span className="ed-body-sm ed-ink-2 min-w-0 flex-1">{x.text}</span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
