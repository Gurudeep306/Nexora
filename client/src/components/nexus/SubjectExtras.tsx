import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtMinutes, studyPlan, type PlanNode } from './insights'
import { subjectHref } from './course'
import { prefetchSubjectRoute } from '@/routes'
import type { NexusWebStructure } from './types'
import { Select } from '@/components/ui'

/*
 * The subject page's advanced parts: where the subject sits in the whole
 * web (a radial mini-map with what it needs and unlocks), the progress
 * history sparkline, and the study plan to the exam date.
 */

type Cluster = NexusWebStructure['clusters'][number]

/** A compact radial of every subject: this one, what it needs (in) and unlocks (out). */
export function SubjectMiniMap({ structure, subject }: { structure: NexusWebStructure; subject: string }) {
  const navigate = useNavigate()
  const { ring, needs, unlocks, hue } = useMemo(() => {
    const order = new Map((structure.streams ?? []).map((s) => [s.id, s.order]))
    const ring = [...structure.clusters].sort(
      (a, b) => (order.get(a.stream ?? a.domain) ?? 99) - (order.get(b.stream ?? b.domain) ?? 99) || a.order - b.order || a.id.localeCompare(b.id),
    )
    const me = structure.clusters.find((c) => c.id === subject)
    const needs = new Map<string, number>()
    for (const n of me?.nodes ?? []) for (const x of n.cx ?? []) needs.set(x.split(':')[0], (needs.get(x.split(':')[0]) ?? 0) + 1)
    const unlocks = new Map<string, number>()
    for (const c of structure.clusters) {
      if (c.id === subject) continue
      for (const n of c.nodes) for (const x of n.cx ?? []) if (x.startsWith(`${subject}:`)) unlocks.set(c.id, (unlocks.get(c.id) ?? 0) + 1)
    }
    const hue = new Map((structure.streams ?? []).map((s) => [s.id, s.hue]))
    return { ring, needs, unlocks, hue }
  }, [structure, subject])
  const S = 200
  const cx = S / 2
  const R = 78
  const at = (i: number) => {
    const a = -Math.PI / 2 + (i / ring.length) * Math.PI * 2
    return { x: cx + Math.cos(a) * R, y: cx + Math.sin(a) * R }
  }
  const idx = new Map(ring.map((c, i) => [c.id, i]))
  const me = at(idx.get(subject) ?? 0)
  const curve = (from: { x: number; y: number }, to: { x: number; y: number }) => `M${from.x},${from.y} Q${cx},${cx} ${to.x},${to.y}`
  const colorOf = (c: Cluster) => hue.get(c.stream ?? c.domain) ?? 'var(--color-primary)'
  const top = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 6)
  return (
    <section aria-label="Where this subject sits in the Nexus">
      <h2 className="mb-2.5 text-[11px] font-semibold tracking-wider text-text-muted uppercase">In the Nexus</h2>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ maxWidth: 220 }} className="mx-auto block" role="img" aria-label="Mini-map of every subject">
        <defs>
          <marker id="nx-mm-in" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 z" fill="var(--nx-b3, #0d9488)" />
          </marker>
          <marker id="nx-mm-out" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 z" fill="var(--nx-b2, #7c3aed)" />
          </marker>
        </defs>
        <circle cx={cx} cy={cx} r={R} fill="none" stroke="var(--color-border)" strokeDasharray="2 3" />
        {top(needs).map(([id]) => {
          const i = idx.get(id)
          return i === undefined ? null : <path key={`n-${id}`} d={curve(at(i), me)} fill="none" stroke="var(--nx-b3, #0d9488)" strokeWidth={1.4} opacity={0.85} markerEnd="url(#nx-mm-in)" />
        })}
        {top(unlocks).map(([id]) => {
          const i = idx.get(id)
          return i === undefined ? null : <path key={`u-${id}`} d={curve(me, at(i))} fill="none" stroke="var(--nx-b2, #7c3aed)" strokeWidth={1.4} opacity={0.85} markerEnd="url(#nx-mm-out)" />
        })}
        {ring.map((c, i) => {
          const p = at(i)
          const isMe = c.id === subject
          const linked = needs.has(c.id) || unlocks.has(c.id)
          return (
            <g key={c.id} className={cn(!isMe && 'cursor-pointer')} onClick={() => !isMe && navigate(subjectHref(c))} onMouseEnter={() => !isMe && prefetchSubjectRoute(subjectHref(c))}>
              <title>{c.name}</title>
              <circle cx={p.x} cy={p.y} r={isMe ? 6.5 : linked ? 4 : 2.4} fill={colorOf(c)} opacity={isMe || linked ? 1 : 0.45} stroke={isMe ? 'var(--color-bg-app)' : 'none'} strokeWidth={2} />
              {isMe && <circle cx={p.x} cy={p.y} r={10} fill="none" stroke={colorOf(c)} strokeWidth={1.2} />}
            </g>
          )
        })}
      </svg>
      <div className="mt-2 space-y-1.5 text-[12px]">
        {needs.size > 0 && (
          <p className="mb-0 leading-relaxed text-text-secondary">
            <span className="font-semibold" style={{ color: 'var(--nx-b3, #0d9488)' }}>
              Needs
            </span>{' '}
            {top(needs).map(([id], i) => {
              const c = structure.clusters.find((x) => x.id === id)
              return c ? (
                <span key={id}>
                  {i ? ' · ' : ''}
                  <Link to={subjectHref(c)} className="text-text-primary underline decoration-text-muted/50 underline-offset-[3px] hover:decoration-current">
                    {c.name}
                  </Link>
                </span>
              ) : null
            })}
          </p>
        )}
        {unlocks.size > 0 && (
          <p className="mb-0 leading-relaxed text-text-secondary">
            <span className="font-semibold" style={{ color: 'var(--nx-b2, #7c3aed)' }}>
              Unlocks
            </span>{' '}
            {top(unlocks).map(([id], i) => {
              const c = structure.clusters.find((x) => x.id === id)
              return c ? (
                <span key={id}>
                  {i ? ' · ' : ''}
                  <Link to={subjectHref(c)} className="text-text-primary underline decoration-text-muted/50 underline-offset-[3px] hover:decoration-current">
                    {c.name}
                  </Link>
                </span>
              ) : null
            })}
          </p>
        )}
        <Link to={`/nexus?focus=${encodeURIComponent(subject)}`} className="inline-block text-[12px] text-accent-brand hover:underline">
          View in Nexus →
        </Link>
      </div>
    </section>
  )
}

/** Mastery over time (one point a day), as a small line. */
export function HistorySpark({ points }: { points: { day: string; p: number }[] }) {
  if (points.length < 2) return null
  const W = 120
  const H = 28
  const max = Math.max(100, ...points.map((x) => x.p))
  const step = W / (points.length - 1)
  const d = points.map((x, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(H - (x.p / max) * H).toFixed(1)}`).join(' ')
  return (
    <svg width={W} height={H} role="img" aria-label={`Mastery from ${points[0].p}% (${points[0].day}) to ${points[points.length - 1].p}% (${points[points.length - 1].day})`}>
      <path d={d} fill="none" stroke="var(--color-accent-brand)" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={W} cy={H - (points[points.length - 1].p / max) * H} r={2.4} fill="var(--color-accent-brand)" />
    </svg>
  )
}

/** The study plan: to the exam date, prerequisites first, heavier weight earlier. */
export function StudyPlanView({
  subject,
  nodes,
  names,
  minutes,
  weight,
  examDate,
  onPick,
}: {
  subject: string
  nodes: PlanNode[]
  names: Record<string, string>
  minutes: Record<string, number>
  weight: Record<string, number>
  examDate: string | null
  onPick: (id: string) => void
}) {
  const key = `nexus:plan:${subject}`
  const [perDay, setPerDay] = useState<number>(() => {
    try {
      return Number(JSON.parse(localStorage.getItem(key) || '{}').perDay) || 60
    } catch {
      return 60
    }
  })
  const [target, setTarget] = useState<string>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || '{}').target || ''
    } catch {
      return ''
    }
  })
  const end = examDate || target || null
  const save = (next: { perDay: number; target: string }) => {
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* storage blocked */
    }
  }
  const plan = useMemo(() => studyPlan(nodes, minutes, weight, new Date(), perDay, end ? new Date(`${end}T23:59:59Z`) : null), [nodes, minutes, weight, perDay, end])
  const today = plan.days[0]
  if (!plan.days.length) return <p className="mb-0 text-[13px] text-text-secondary">Everything here is mastered — nothing left to plan.</p>
  return (
    <section aria-label="Study plan" className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-[12px] text-text-secondary">
          <span className="mb-1 block text-[11px] font-semibold tracking-wider text-text-muted uppercase">Time a day</span>
          <Select
            value={perDay}
            onChange={(e) => {
              setPerDay(Number(e.target.value))
              save({ perDay: Number(e.target.value), target })
            }}
            className="rounded-lg border border-border bg-transparent px-2 py-1.5 text-[13px] text-text-primary"
          >
            {[30, 45, 60, 90, 120, 180].map((m) => (
              <option key={m} value={m}>
                {fmtMinutes(m)}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-[12px] text-text-secondary">
          <span className="mb-1 block text-[11px] font-semibold tracking-wider text-text-muted uppercase">{examDate ? 'GATE exam date' : 'Target date'}</span>
          {examDate ? (
            <span className="inline-flex items-center gap-1.5 py-1.5 text-[13px] text-text-primary">
              <CalendarDays className="size-3.5" aria-hidden="true" /> {examDate}{' '}
              <Link to="/gate/planner" className="text-[11.5px] text-accent-brand hover:underline">
                change
              </Link>
            </span>
          ) : (
            <input
              type="date"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value)
                save({ perDay, target: e.target.value })
              }}
              className="rounded-lg border border-border bg-transparent px-2 py-1 text-[13px] text-text-primary"
            />
          )}
        </label>
        <p className="mb-0 pb-1.5 text-[13px] text-text-secondary">
          Done by <span className="font-semibold text-text-primary">{plan.finish}</span>
          {plan.onTime === null ? null : plan.onTime ? <span className="ml-1.5 text-success">· on time</span> : <span className="ml-1.5 text-warning">· after {end} — add time a day</span>}
        </p>
      </div>

      {today && (
        <div className="rounded-xl border border-accent-brand/40 px-4 py-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-accent-brand uppercase">
            <Target className="size-3.5" aria-hidden="true" /> Today · {fmtMinutes(today.minutes)}
          </p>
          <ul className="mb-0 space-y-1">
            {today.items.map((it) => (
              <li key={it.id} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                <button type="button" className="cursor-pointer text-left text-text-primary underline decoration-text-muted/50 underline-offset-[3px] hover:decoration-current" onClick={() => onPick(it.id)}>
                  {names[it.id] ?? it.id}
                </button>
                <span className="font-mono text-[11.5px] text-text-muted tabular-nums">{fmtMinutes(it.minutes)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="mb-0 space-y-3">
        {plan.weeks.map((w, i) => {
          const ids = [...new Set(w.days.flatMap((d) => d.items.map((x) => x.id)))]
          return (
            <li key={w.start} className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 text-[13px]">
              <div>
                <p className="mb-0 font-semibold text-text-primary">Week {i + 1}</p>
                <p className="mb-0 font-mono text-[11px] text-text-muted tabular-nums">
                  {w.start.slice(5)} · {fmtMinutes(w.minutes)}
                </p>
              </div>
              <p className="mb-0 leading-relaxed text-text-secondary">
                {ids.map((id, k) => (
                  <span key={id}>
                    {k ? ' · ' : ''}
                    <button type="button" className="cursor-pointer text-text-primary underline decoration-text-muted/50 underline-offset-[3px] hover:decoration-current" onClick={() => onPick(id)}>
                      {names[id] ?? id}
                    </button>
                    {(weight[id] ?? 0) > 0 && <span className="ml-0.5 text-[10.5px] text-warning">★</span>}
                  </span>
                ))}
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
