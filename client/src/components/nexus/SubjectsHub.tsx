import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, BookOpen, PenLine, Telescope } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { LoadingBlock } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useNotesSubjects } from '@/gate/notes/api'
import { cachedState, cachedStructure, loadWeb, mergeWeb } from './data'
import { subjectHref } from './course'
import { prefetchHandlers } from '@/routes'
import type { NexusWebState, NexusWebStructure, WebCluster } from './types'

/*
 * The hubs' view of the Nexus. /learn lists every subject, grouped by its
 * stream, with your progress and rank, each linking to its one page (and to
 * the existing course where there is one). The GATE home lists the paper's
 * subjects, each mapped to its Nexus subject: tree, notes (or "coming
 * soon") and PYQs. The mapping is content/nexus/_hubs.json.
 */

function useNexusWeb() {
  const { user } = useAuth()
  const username = user?.username ?? ''
  const [structure, setStructure] = useState<NexusWebStructure | null>(() => cachedStructure())
  const [state, setState] = useState<NexusWebState | null>(() => cachedState(username))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    loadWeb(false)
      .then((r) => {
        if (!live) return
        setStructure(r.structure)
        setState(r.state)
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : 'Could not load the subjects'))
    return () => {
      live = false
    }
  }, [])
  const clusters = useMemo(() => (structure ? mergeWeb(structure, state) : null), [structure, state])
  // GATE notes this reader may open (draft subjects are staff-only).
  const notesApi = useNotesSubjects()
  const notes = useMemo(() => new Set((notesApi.data ?? []).map((x) => x.id)), [notesApi.data])
  return { structure, state, clusters, error, notes }
}

const progressOf = (c: WebCluster) => (c.nodes.length ? Math.round(c.nodes.reduce((a, n) => a + n.p, 0) / c.nodes.length) : 0)

function Ring({ value, color }: { value: number; color: string }) {
  const r = 15
  const C = 2 * Math.PI * r
  return (
    <span className="relative inline-flex size-[38px] shrink-0 items-center justify-center" aria-hidden="true">
      <svg className="absolute inset-0 -rotate-90" width="38" height="38">
        <circle cx="19" cy="19" r={r} fill="none" stroke="var(--color-border)" strokeWidth="3" />
        {value > 0 && <circle cx="19" cy="19" r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(C * value) / 100} ${C}`} />}
      </svg>
      <span className="font-mono text-[10px] text-text-secondary tabular-nums">{value}</span>
    </span>
  )
}

/** /learn: every subject by stream. */
export function LearnSubjectsHub() {
  const { structure, state, clusters, error, notes } = useNexusWeb()
  const reduce = useReducedMotion()
  const [q, setQ] = useState('')
  if (!clusters || !structure) return error ? <p className="text-sm text-text-secondary">{error}</p> : <LoadingBlock rows={8} />
  const courses = new Map((structure.hubs?.learn ?? []).map((c) => [c.nexus, c]))
  const needle = q.trim().toLowerCase()
  const streams = (structure.streams ?? []).map((st) => ({
    st,
    list: clusters
      .filter((c) => c.stream === st.id && (!needle || c.name.toLowerCase().includes(needle) || c.short.toLowerCase().includes(needle)))
      .sort((a, b) => a.order - b.order),
  }))
  const total = clusters.length
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="mb-0 max-w-[70ch] text-[14px] text-text-secondary">
          {total} subjects, each a course tree you climb lesson by lesson — all of them one web in the{' '}
          <Link to="/nexus" className="text-accent-brand underline decoration-accent-brand/40 underline-offset-2 hover:decoration-accent-brand">
            Nexus
          </Link>
          .
        </p>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a subject"
          aria-label="Find a subject"
          className="h-9 w-56 rounded-lg border border-border bg-bg-surface px-3 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent-brand"
        />
      </div>
      {streams
        .filter((x) => x.list.length)
        .map(({ st, list }, si) => (
          <section key={st.id} aria-labelledby={`stream-${st.id}`}>
            <h2 id={`stream-${st.id}`} className="mb-3 flex items-center gap-2 text-[12px] font-semibold tracking-[0.14em] text-text-secondary uppercase">
              <span className="size-2 rounded-full" style={{ background: st.hue }} aria-hidden="true" />
              {st.name}
              <span className="font-mono text-[11px] font-normal tracking-normal text-text-muted">{list.length}</span>
            </h2>
            <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((c, i) => {
                const p = progressOf(c)
                const rank = state?.ranks?.[c.id]
                const course = courses.get(c.id)
                const done = c.nodes.filter((n) => n.s === 2).length
                return (
                  <motion.li
                    key={c.id}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(0.4, si * 0.03 + i * 0.015) }}
                    className="nx-hub-card"
                  >
                    <Link to={subjectHref(c)} {...prefetchHandlers(subjectHref(c))} className="flex items-center gap-3 p-3.5" aria-label={`${c.name}: ${p}% · ${done} of ${c.nodes.length} skills`}>
                      <Ring value={p} color={st.hue} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold text-text-primary">{c.name}</span>
                        <span className="block truncate text-[12px] text-text-muted">
                          {rank ? `${rank.tier} · ` : ''}
                          {done}/{c.nodes.length} skills
                          {c.gate ? ' · GATE' : ''}
                        </span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
                    </Link>
                    {(course || (c.gate?.notes && notes.has(c.gate.notes))) && (
                      <div className="flex flex-wrap gap-1.5 border-t border-border px-3.5 py-2">
                        {course && (
                          <Link to={course.href} className="nx-hub-chip">
                            <BookOpen className="size-3" aria-hidden="true" /> {course.name}
                          </Link>
                        )}
                        {c.gate?.notes && notes.has(c.gate.notes) && (
                          <Link to={`/gate/notes/${c.gate.notes}`} className="nx-hub-chip">
                            <BookOpen className="size-3" aria-hidden="true" /> GATE notes
                          </Link>
                        )}
                      </div>
                    )}
                  </motion.li>
                )
              })}
            </ul>
          </section>
        ))}
    </div>
  )
}

/** The GATE home: the paper's subjects, each on its Nexus subject page. */
export function GateSubjectsPanel({ exam }: { exam: 'CSE' | 'DA' | string }) {
  const { structure, clusters, error, notes: notesOpen } = useNexusWeb()
  if (!clusters || !structure) return error ? <p className="text-sm text-text-secondary">{error}</p> : <LoadingBlock rows={5} />
  const list = structure.hubs?.gate?.[exam === 'DA' ? 'DA' : 'CSE'] ?? []
  const byId = new Map(clusters.map((c) => [c.id, c]))
  const hue = new Map((structure.streams ?? []).map((s) => [s.id, s.hue]))
  return (
    <ul className="divide-y divide-border" aria-label={`GATE ${exam} subjects`}>
      {list.map((e) => {
        const c = byId.get(e.nexus)
        if (!c) return null
        const p = progressOf(c)
        const notes = c.gate?.notes && c.gate.pyq === e.bank && notesOpen.has(c.gate.notes) ? c.gate.notes : null
        return (
          <li key={e.bank} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
            <Ring value={p} color={hue.get(c.stream) ?? 'var(--color-accent-brand)'} />
            <span className="min-w-0 flex-1">
              <Link to={subjectHref(c)} {...prefetchHandlers(subjectHref(c))} className="block truncate text-[14px] font-semibold text-text-primary hover:underline">
                {e.name}
              </Link>
              <span className="block truncate text-[11.5px] text-text-muted">
                Skill tree: {c.name} · {c.nodes.length} skills
              </span>
            </span>
            <span className="flex flex-wrap gap-1.5">
              <Link to={subjectHref(c)} {...prefetchHandlers(subjectHref(c))} className="nx-hub-chip">
                <Telescope className="size-3" aria-hidden="true" /> Tree
              </Link>
              {notes ? (
                <Link to={`/gate/notes/${notes}`} className="nx-hub-chip">
                  <BookOpen className="size-3" aria-hidden="true" /> Notes
                </Link>
              ) : (
                <span className={cn('nx-hub-chip is-muted')} title="Notes are being written; the tree, its lessons and PYQs are ready">
                  <BookOpen className="size-3" aria-hidden="true" /> Notes soon
                </span>
              )}
              <Link to={`/gate/practice?subject=${encodeURIComponent(e.bank)}`} className="nx-hub-chip">
                <PenLine className="size-3" aria-hidden="true" /> PYQs
              </Link>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
