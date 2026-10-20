import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Card, CardContent } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
import { nodeIcon } from './icons'
import { LatticePattern } from './SkillGraph'
import { rampColor } from './format'
import type { NexusSubjectSummary } from './types'

/*
 * "All subjects": how the whole syllabus fits together, then one card per
 * subject.
 *
 * The map lays subjects out left → right by what they build on (a subject
 * sits one column right of the deepest subject it needs). Each strand is a
 * real cross-subject prerequisite; thicker strands carry more skill links.
 * Hover a subject: what it builds on lights teal, what builds on it violet.
 */

const PILL_W = 132
const PILL_H = 34
const ROW = 46
const COL_MIN = 168

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

function SubjectMap({ subjects, onOpen }: { subjects: NexusSubjectSummary[]; onOpen: (id: string) => void }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<string | null>(null)
  const reduce = useReducedMotion()

  const layout = useMemo(() => {
    const byId = new Map(subjects.map((s) => [s.id, s]))
    const depth = new Map<string, number>()
    const visit = (id: string, guard: number): number => {
      if (depth.has(id)) return depth.get(id)!
      if (guard > 30) return 0
      const needs = Object.keys(byId.get(id)?.needs ?? {}).filter((n) => byId.has(n) && n !== id)
      const d = needs.length ? 1 + Math.max(...needs.map((n) => visit(n, guard + 1))) : 0
      depth.set(id, d)
      return d
    }
    subjects.forEach((s) => visit(s.id, 0))
    const cols: NexusSubjectSummary[][] = []
    for (const s of subjects) (cols[depth.get(s.id)!] ??= []).push(s)
    cols.forEach((c) => c.sort((a, b) => a.order - b.order))
    const edges: { from: string; to: string; count: number }[] = []
    for (const s of subjects) for (const [n, count] of Object.entries(s.needs ?? {})) if (byId.has(n)) edges.push({ from: n, to: s.id, count })
    return { cols, depth, edges }
  }, [subjects])

  const W = Math.max(width, layout.cols.length * COL_MIN)
  const rows = Math.max(...layout.cols.map((c) => c.length))
  const H = rows * ROW + 40
  const colX = (i: number) => 24 + PILL_W / 2 + (i * (W - 48 - PILL_W)) / Math.max(1, layout.cols.length - 1)
  const pos = new Map<string, { x: number; y: number; col: number }>()
  layout.cols.forEach((c, i) =>
    c.forEach((s, j) => pos.set(s.id, { x: colX(i), y: 20 + (rows - c.length) * (ROW / 2) + j * ROW + ROW / 2, col: i })),
  )

  // Focus: upstream / downstream of the hovered subject.
  const lineage = useMemo(() => {
    if (!hover) return null
    const up = new Set<string>()
    const down = new Set<string>()
    const walk = (start: string, set: Set<string>, next: (id: string) => string[]) => {
      const stack = [start]
      while (stack.length) {
        for (const n of next(stack.pop()!)) {
          if (set.has(n)) continue
          set.add(n)
          stack.push(n)
        }
      }
    }
    walk(hover, up, (id) => layout.edges.filter((e) => e.to === id).map((e) => e.from))
    walk(hover, down, (id) => layout.edges.filter((e) => e.from === id).map((e) => e.to))
    return { up, down }
  }, [hover, layout.edges])

  return (
    <div className="card nx-web-card overflow-x-auto p-0">
      <div ref={ref} className="relative min-w-[640px]" style={{ height: H }}>
        {width > 0 && (
          <>
            <svg className="pointer-events-none absolute inset-0 overflow-visible" width={W} height={H} aria-hidden="true">
              <defs>
                <LatticePattern id="nx-lattice-map" />
              </defs>
              <rect width={W} height={H} fill="url(#nx-lattice-map)" className="nx-lattice" style={{ color: 'var(--color-text-primary)' }} />
              {layout.edges.map((e, i) => {
                const a = pos.get(e.from)!
                const b = pos.get(e.to)!
                const x1 = a.x + PILL_W / 2
                const x2 = b.x - PILL_W / 2
                const mx = (x1 + x2) / 2
                const d = `M${x1},${a.y} C${mx},${a.y} ${mx},${b.y} ${x2},${b.y}`
                const tone = !lineage
                  ? null
                  : (e.to === hover || lineage.up.has(e.to)) && (e.from === hover || lineage.up.has(e.from))
                    ? 'up'
                    : (e.from === hover || lineage.down.has(e.from)) && (e.to === hover || lineage.down.has(e.to))
                      ? 'down'
                      : 'dim'
                const color = tone === 'up' ? 'var(--nx-b3)' : tone === 'down' ? 'var(--nx-b2)' : rampColor(b.col / Math.max(1, layout.cols.length - 1))
                return (
                  <path
                    key={`${e.from}>${e.to}`}
                    d={d}
                    pathLength={1}
                    fill="none"
                    stroke={color}
                    strokeWidth={Math.min(3, 0.8 + e.count * 0.35)}
                    strokeLinecap="round"
                    className={cn('nx-map-strand', !reduce && 'nx-map-draw')}
                    style={{ opacity: tone === 'dim' ? 0.08 : tone ? 1 : 0.55, ['--delay' as string]: `${(a.col * 0.12 + i * 0.008).toFixed(3)}s` }}
                  />
                )
              })}
            </svg>
            {[...pos.entries()].map(([id, p]) => {
              const s = subjects.find((x) => x.id === id)!
              const tone = !lineage ? null : id === hover ? 'self' : lineage.up.has(id) ? 'up' : lineage.down.has(id) ? 'down' : 'dim'
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onOpen(id)}
                  onMouseEnter={() => setHover(id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(id)}
                  onBlur={() => setHover(null)}
                  className="nx-map-pill absolute flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-semibold"
                  data-tone={tone ?? undefined}
                  style={{ left: p.x - PILL_W / 2, top: p.y - PILL_H / 2, width: PILL_W, height: PILL_H, ['--zc' as string]: rampColor(p.col / Math.max(1, layout.cols.length - 1)) }}
                  title={`${s.name}: ${s.completed}/${s.nodeCount} mastered`}
                >
                  <Icon name={nodeIcon(s.icon)} className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-left">{s.short}</span>
                  <span className="font-mono text-[10px] font-medium text-text-muted tabular-nums">{s.progress}%</span>
                </button>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

export function SubjectsOverview({ subjects, onOpen }: { subjects: NexusSubjectSummary[]; onOpen: (id: string) => void }) {
  const totals = subjects.reduce(
    (a, s) => ({ nodes: a.nodes + s.nodeCount, done: a.done + s.completed, links: a.links + s.crossLinks }),
    { nodes: 0, done: 0, links: 0 },
  )
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="mb-0 text-sm text-foreground-dim">
          {subjects.length} subjects · {totals.nodes} skills · {totals.links} cross-subject prerequisites. Each strand below is a real prerequisite between syllabi; hover a
          subject to trace what it builds on and what builds on it.
        </p>
        <p className="mb-0 font-mono text-xs text-text-muted tabular-nums">
          {totals.done}/{totals.nodes} mastered
        </p>
      </div>
      <SubjectMap subjects={subjects} onOpen={onOpen} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {subjects.map((s, i) => {
          const needs = Object.keys(s.needs ?? {})
            .map((id) => subjects.find((x) => x.id === id)?.short)
            .filter(Boolean)
          const color = rampColor(i / Math.max(1, subjects.length - 1))
          return (
            <Card key={s.id} className="card-interactive nx-subjects cursor-pointer" onClick={() => onOpen(s.id)}>
              <CardContent className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border"
                    style={{ borderColor: color, color }}
                    aria-hidden="true"
                  >
                    <Icon name={nodeIcon(s.icon)} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => onOpen(s.id)} className="cursor-pointer text-left font-display text-[15px] font-semibold text-text-primary hover:underline">
                      {s.name}
                    </button>
                    <p className="mb-0 text-[10.5px] font-semibold tracking-[0.12em] text-text-muted uppercase">
                      {s.group === 'core' ? 'Competitive programming' : s.group === 'gate' ? 'GATE CSE' : 'Beyond GATE'} · {s.zoneCount} {s.group === 'core' ? 'zones' : 'chapters'}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-text-primary tabular-nums">{s.progress}%</span>
                </div>
                <p className="mb-0 line-clamp-2 text-xs text-foreground-dim">{s.description}</p>
                <div className="h-1 overflow-hidden rounded-full bg-bg-surface-3">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(s.progress, 0)}%`, backgroundColor: color }} />
                </div>
                <p className="mb-0 flex flex-wrap justify-between gap-x-3 font-mono text-[10.5px] text-text-muted tabular-nums">
                  <span>
                    {s.completed}/{s.nodeCount} mastered · {s.unlocked} open
                  </span>
                  <span>{needs.length ? `builds on ${needs.join(', ')}` : 'foundation'}</span>
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
