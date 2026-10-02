import { AnimatePresence, motion } from 'motion/react'
import type { GraphState, HashState, ListState, Role, TreeState } from '../types'
import { cn } from '@/lib/utils'
import { fmt, roleClass } from './format'
import { ptrHue, useStage } from './stage'

/*
 * Views for linked structures: lists, trees, graphs and chained hash tables.
 * Every node keeps its id between frames, so when the algorithm rewires a
 * pointer or rotates a subtree the boxes glide to their new places and the
 * arrows bend to follow — the change is seen, not inferred.
 */

const spring = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 } as const
const fade = { duration: 0.35, ease: 'easeOut' } as const

/** Group pointer names by target so several names on one node stack up. */
function lanes(pointers: Record<string, string | null> | undefined) {
  const by = new Map<string, string[]>()
  for (const [name, target] of Object.entries(pointers ?? {})) {
    const k = target ?? '∅'
    by.set(k, [...(by.get(k) ?? []), name])
  }
  return by
}

function PointerTag({ name, x, y, up = false }: { name: string; x: number; y: number; up?: boolean }) {
  return (
    <motion.g initial={false} animate={{ x, y }} transition={spring} style={{ ['--ph' as string]: ptrHue(name) }} className="viz-ptr-svg">
      <path d={up ? 'M -5 8 L 5 8 L 0 14 z' : 'M -5 -6 L 5 -6 L 0 -12 z'} className="viz-ptr-svg-arrow" />
      <text y={up ? 2 : 6} textAnchor="middle" className="viz-ptr-svg-name">
        {name}
      </text>
    </motion.g>
  )
}

/* ═════════════════════════════ Linked list ═════════════════════════════ */

const LW = 74 // node width
const LV = 48 // value part
const LH = 40
const LGAP = 38
const LPITCH = LW + LGAP

export function ListView({ s }: { s: ListState }) {
  const { width: stageW } = useStage()
  const nodes = s.nodes
  const index = new Map(nodes.map((n, i) => [n.id, i]))
  const ptrs = lanes(s.pointers)
  const hasNullPtr = ptrs.has('∅')
  const left = hasNullPtr ? 64 : 8
  const maxLane = Math.max(0, ...[...ptrs.values()].map((v) => v.length))
  const anyBack = nodes.some((n) => n.next && (index.get(n.next) ?? 0) < (index.get(n.id) ?? 0)) || s.doubly
  const anyJump = nodes.some((n) => n.next && (index.get(n.next) ?? 0) > (index.get(n.id) ?? 0) + 1)
  const top = anyJump ? 44 : 14
  const below = anyBack ? 46 : 10
  const W = left + Math.max(1, nodes.length) * LPITCH - LGAP + 16
  const H = top + LH + below + (maxLane ? 18 + maxLane * 16 : 6)
  const scale = Math.min(1, (stageW - 8) / W)
  const xOf = (id: string) => left + (index.get(id) ?? 0) * LPITCH
  const midY = top + LH / 2

  const link = (fromId: string, toId: string, kind: 'next' | 'prev') => {
    const fi = index.get(fromId) ?? 0
    const ti = index.get(toId) ?? 0
    if (kind === 'prev') {
      // from the node's left edge, curving under, into the target's right edge
      const x1 = xOf(fromId) + 6
      const x2 = xOf(toId) + LW - 6
      const y = top + LH
      const h = 18 + Math.abs(fi - ti) * 6
      return `M ${x1} ${y} C ${x1} ${y + h}, ${x2} ${y + h}, ${x2} ${y + 2}`
    }
    const x1 = xOf(fromId) + LV + (LW - LV) / 2
    if (ti === fi + 1) {
      const x2 = xOf(toId) - 2
      return `M ${x1} ${midY} C ${x1 + 14} ${midY}, ${x2 - 14} ${midY}, ${x2} ${midY}`
    }
    if (ti > fi) {
      const x2 = xOf(toId) + 14
      const h = Math.min(top - 6, 18 + (ti - fi) * 6)
      return `M ${x1} ${top} C ${x1} ${top - h}, ${x2} ${top - h}, ${x2} ${top - 2}`
    }
    // backward (or self) — under the row
    const x2 = xOf(toId) + LW - 14
    const y = top + LH
    const h = Math.min(below - 6, 18 + Math.abs(fi - ti) * 6)
    return `M ${x1} ${y} C ${x1} ${y + h}, ${x2} ${y + h}, ${x2} ${y + 2}`
  }

  return (
    <div className="viz-list">
      {s.label && <p className="viz-label">{s.label}</p>}
      <div className="mx-auto" style={{ width: W * scale, height: H * scale }}>
        <div className="relative origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}>
          <svg className="pointer-events-none absolute inset-0 overflow-visible" width={W} height={H} aria-hidden="true">
            <defs>
              <marker id={`lh-${s.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className="viz-link-head" />
              </marker>
            </defs>
            {nodes.map((n) => {
              const out = []
              if (n.next && index.has(n.next))
                out.push(
                  <motion.path
                    key={`n-${n.id}`}
                    initial={false}
                    animate={{ d: link(n.id, n.next, 'next') }}
                    transition={spring}
                    className={cn('viz-link', roleClass(s.linkRoles?.[n.id]))}
                    markerEnd={`url(#lh-${s.id})`}
                  />,
                )
              if (s.doubly && n.prev && index.has(n.prev))
                out.push(
                  <motion.path
                    key={`p-${n.id}`}
                    initial={false}
                    animate={{ d: link(n.id, n.prev, 'prev') }}
                    transition={spring}
                    className="viz-link viz-link-prev"
                    markerEnd={`url(#lh-${s.id})`}
                  />,
                )
              return out
            })}
            {hasNullPtr && (
              <text x={left - 34} y={midY + 5} textAnchor="middle" className="viz-null-mark">
                null
              </text>
            )}
            {[...ptrs.entries()].map(([target, names]) =>
              names.map((name, k) => (
                <PointerTag
                  key={name}
                  name={name}
                  x={target === '∅' ? left - 34 : xOf(target) + LV / 2}
                  y={top + LH + below + 16 + k * 16}
                />
              )),
            )}
          </svg>
          <AnimatePresence initial={false}>
            {nodes.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: -20, left: left + i * LPITCH }}
                animate={{ opacity: 1, y: 0, left: left + i * LPITCH }}
                exit={{ opacity: 0, y: 24, scale: 0.8, transition: { duration: 0.25 } }}
                transition={spring}
                className={cn('viz-cell viz-lnode absolute flex overflow-hidden rounded-[10px]', roleClass(s.roles?.[n.id]))}
                style={{ top, width: LW, height: LH }}
              >
                <span className="flex flex-1 items-center justify-center">
                  <motion.span key={String(n.v)} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="viz-value">
                    {fmt(n.v)}
                  </motion.span>
                </span>
                <span className={cn('viz-lnode-next relative flex items-center justify-center', !n.next && 'viz-lnode-null')} style={{ width: LW - LV }}>
                  {n.next ? <span className="viz-lnode-dot" /> : null}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/* ═════════════════════════════════ Tree ═════════════════════════════════ */

interface Placed {
  x: number // in slots
  depth: number
}

function layoutForest(s: TreeState) {
  const byId = new Map(s.nodes.map((n) => [n.id, n]))
  const hasParent = new Set<string>()
  for (const n of s.nodes) for (const c of n.children) if (c && byId.has(c)) hasParent.add(c)
  const roots = [...s.roots.filter((r) => byId.has(r))]
  for (const n of s.nodes) if (!hasParent.has(n.id) && !roots.includes(n.id)) roots.push(n.id)

  const pos = new Map<string, Placed>()
  let cursor = 0
  let maxDepth = 0
  const place = (id: string, depth: number): number => {
    const n = byId.get(id)!
    pos.set(id, { x: 0, depth })
    maxDepth = Math.max(maxDepth, depth)
    const slots = s.binary ? [n.children[0] ?? null, n.children[1] ?? null] : n.children
    const real = slots.filter((c): c is string => !!c && byId.has(c) && !pos.has(c))
    if (!real.length) {
      const x = cursor
      cursor += 1
      pos.set(id, { x, depth })
      return x
    }
    const xs: number[] = []
    for (const c of slots) {
      if (c && byId.has(c) && !pos.has(c)) xs.push(place(c, depth + 1))
      else if (s.binary) {
        // keep the empty side visibly empty: half a slot of air
        xs.push(cursor + 0.0)
        cursor += 0.5
      }
    }
    const x = (Math.min(...xs) + Math.max(...xs)) / 2
    pos.set(id, { x, depth })
    return x
  }
  roots.forEach((r, i) => {
    if (i > 0) cursor += 0.6
    if (!pos.has(r)) place(r, 0)
  })
  return { pos, slots: Math.max(1, cursor), maxDepth, roots }
}

export function TreeView({ s }: { s: TreeState }) {
  const { width: stageW } = useStage()
  const { pos, slots, maxDepth } = layoutForest(s)
  const longest = Math.max(1, ...s.nodes.map((n) => fmt(n.v).length))
  const R = 17
  const nodeW = (v: string) => Math.max(2 * R, v.length * 7.6 + 16)
  const SW = Math.max(longest > 3 ? longest * 7.6 + 24 : 40, Math.min(64, (stageW - 24) / slots))
  const ptrs = lanes(s.pointers)
  const maxLane = Math.max(0, ...[...ptrs.entries()].filter(([k]) => k !== '∅').map(([, v]) => v.length))
  const hasNotes = s.nodes.some((n) => n.note)
  const LH = hasNotes ? 74 : 64
  const padTop = 16 + maxLane * 15
  const W = slots * SW + 12
  const H = padTop + maxDepth * LH + 2 * R + (hasNotes ? 22 : 8)
  const scale = Math.min(1, (stageW - 8) / W)
  const P = (id: string) => {
    const p = pos.get(id)
    return p ? { x: 6 + p.x * SW + SW / 2, y: padTop + R + p.depth * LH } : { x: 0, y: 0 }
  }

  const edges: { p: string; c: string; label?: string | null }[] = []
  for (const n of s.nodes)
    n.children.forEach((c, i) => {
      if (c && pos.has(c)) edges.push({ p: n.id, c, label: n.edgeLabels?.[i] })
    })

  return (
    <div className="viz-tree">
      {s.label && <p className="viz-label">{s.label}</p>}
      <svg className="mx-auto block overflow-visible" width={W * scale} height={H * scale} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <AnimatePresence initial={false}>
          {edges.map(({ p, c, label }) => {
            const a = P(p)
            const b = P(c)
            const role = s.edgeRoles?.[`${p}>${c}`]
            return (
              <motion.g key={`${p}>${c}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
                <motion.line initial={false} animate={{ x1: a.x, y1: a.y, x2: b.x, y2: b.y }} transition={spring} className={cn('viz-tedge', roleClass(role))} />
                {label && (
                  <motion.text initial={false} animate={{ x: (a.x + b.x) / 2 + (b.x < a.x ? -8 : 8), y: (a.y + b.y) / 2 }} transition={spring} textAnchor="middle" className="viz-tedge-label">
                    {label}
                  </motion.text>
                )}
              </motion.g>
            )
          })}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {s.nodes.map((n) => {
            if (!pos.has(n.id)) return null
            const { x, y } = P(n.id)
            const text = fmt(n.v)
            const w = nodeW(text)
            const round = w <= 2 * R + 0.5
            return (
              <motion.g
                key={n.id}
                initial={{ opacity: 0, scale: 0.4, x, y: y - 24 }}
                animate={{ opacity: 1, scale: 1, x, y }}
                exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.25 } }}
                transition={spring}
                className={cn('viz-tnode', roleClass(s.roles?.[n.id]))}
              >
                {round ? (
                  <>
                    <circle r={R} className="viz-under" />
                    <circle r={R} />
                  </>
                ) : (
                  <>
                    <rect x={-w / 2} y={-R} width={w} height={2 * R} rx={R * 0.7} className="viz-under" />
                    <rect x={-w / 2} y={-R} width={w} height={2 * R} rx={R * 0.7} />
                  </>
                )}
                <motion.text key={text} initial={{ opacity: 0, scale: 1.4 }} animate={{ opacity: 1, scale: 1 }} textAnchor="middle" dy="0.35em" className="viz-tnode-text">
                  {text}
                </motion.text>
                {n.note && (
                  <text y={R + 14} textAnchor="middle" className="viz-tnode-note">
                    {n.note}
                  </text>
                )}
              </motion.g>
            )
          })}
        </AnimatePresence>
        {[...ptrs.entries()].map(([target, names]) =>
          target === '∅' || !pos.has(target)
            ? null
            : names.map((name, k) => {
                const { x, y } = P(target)
                return <PointerTag key={name} name={name} x={x} y={y - R - 12 - k * 15} up />
              }),
        )}
      </svg>
      {ptrs.has('∅') && (
        <p className="viz-null-ptrs">
          {ptrs.get('∅')!.join(', ')} = null
        </p>
      )}
    </div>
  )
}

/* ═════════════════════════════════ Graph ════════════════════════════════ */

export function GraphView({ s }: { s: GraphState }) {
  const { width: stageW } = useStage()
  const W = Math.max(280, Math.min(stageW - 8, 680))
  const H = Math.round(Math.min(360, Math.max(220, W * 0.52)))
  const pad = 30
  const R = s.nodes.length > 14 ? 14 : 18
  const auto = s.nodes.some((n) => n.x == null || n.y == null)
  const pos = new Map<string, { x: number; y: number }>()
  s.nodes.forEach((n, i) => {
    if (auto) {
      const ang = (2 * Math.PI * i) / Math.max(1, s.nodes.length) - Math.PI / 2
      pos.set(n.id, { x: W / 2 + (W / 2 - pad - 10) * Math.cos(ang), y: H / 2 + (H / 2 - pad) * Math.sin(ang) })
    } else pos.set(n.id, { x: pad + ((n.x ?? 0) / 100) * (W - 2 * pad), y: pad + ((n.y ?? 0) / 100) * (H - 2 * pad) })
  })
  const has = (a: string, b: string) => s.edges.some((e) => e.from === a && e.to === b)
  const ptrs = lanes(s.pointers)

  const geom = (from: string, to: string) => {
    const a = pos.get(from)!
    const b = pos.get(to)!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    // curve opposite directed edges apart so both stay visible
    const bend = s.directed && has(to, from) ? 16 : 0
    const nx = -uy * bend
    const ny = ux * bend
    const x1 = a.x + ux * R
    const y1 = a.y + uy * R
    const x2 = b.x - ux * (R + (s.directed ? 3 : 0))
    const y2 = b.y - uy * (R + (s.directed ? 3 : 0))
    const cx = (x1 + x2) / 2 + nx
    const cy = (y1 + y2) / 2 + ny
    return { d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`, mx: (x1 + 2 * cx + x2) / 4, my: (y1 + 2 * cy + y2) / 4, x1, y1, x2, y2, cx, cy }
  }
  const roleOf = (e: { from: string; to: string }): Role | undefined =>
    s.edgeRoles?.[`${e.from}-${e.to}`] ?? (s.directed ? undefined : s.edgeRoles?.[`${e.to}-${e.from}`])

  return (
    <div className="viz-graph">
      {s.label && <p className="viz-label">{s.label}</p>}
      <svg className="mx-auto block overflow-visible" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <marker id={`gh-${s.id}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="viz-gedge-head" />
          </marker>
        </defs>
        <AnimatePresence initial={false}>
          {s.edges.map((e) => {
            if (!pos.has(e.from) || !pos.has(e.to)) return null
            const g = geom(e.from, e.to)
            const role = roleOf(e)
            return (
              <motion.g key={`${e.from}-${e.to}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} className={cn('viz-gedge', roleClass(role))}>
                <path d={g.d} className="viz-gedge-line" markerEnd={s.directed ? `url(#gh-${s.id})` : undefined} />
                {role === 'active' && (
                  <motion.circle
                    r={4}
                    className="viz-gedge-pulse"
                    initial={{ cx: g.x1, cy: g.y1 }}
                    animate={{ cx: [g.x1, g.cx, g.x2], cy: [g.y1, g.cy, g.y2] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.25 }}
                  />
                )}
                {e.w !== undefined && e.w !== null && (
                  <text x={g.mx} y={g.my} dy="0.35em" textAnchor="middle" className="viz-gedge-w">
                    {fmt(e.w)}
                  </text>
                )}
              </motion.g>
            )
          })}
        </AnimatePresence>
        {s.nodes.map((n) => {
          const p = pos.get(n.id)!
          return (
            <motion.g key={n.id} initial={false} animate={{ x: p.x, y: p.y }} transition={spring} className={cn('viz-gnode', roleClass(s.roles?.[n.id]))}>
              <circle r={R} className="viz-under" />
              <circle r={R} />
              <text textAnchor="middle" dy="0.35em" className="viz-gnode-text">
                {n.label ?? n.id}
              </text>
              <AnimatePresence>
                {n.note && (
                  <motion.g key={n.note} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <rect x={-Math.max(14, n.note.length * 3.6 + 7)} y={-R - 22} width={Math.max(28, n.note.length * 7.2 + 14)} height={17} rx={8.5} className="viz-gnote-bg" />
                    <text y={-R - 13.5} dy="0.35em" textAnchor="middle" className="viz-gnote">
                      {n.note}
                    </text>
                  </motion.g>
                )}
              </AnimatePresence>
            </motion.g>
          )
        })}
        {[...ptrs.entries()].map(([target, names]) =>
          target === '∅' || !pos.has(target)
            ? null
            : names.map((name, k) => {
                const p = pos.get(target)!
                return <PointerTag key={name} name={name} x={p.x} y={p.y + R + 18 + k * 15} />
              }),
        )}
      </svg>
    </div>
  )
}

/* ═══════════════════════════════ Hash table ═══════════════════════════════ */

export function HashView({ s }: { s: HashState }) {
  return (
    <div className="viz-hash">
      {s.label && <p className="viz-label">{s.label}</p>}
      <div className="mx-auto flex w-fit flex-col gap-1.5">
        {s.buckets.map((chain, b) => (
          <div key={b} className="flex items-center gap-0">
            <div className={cn('viz-cell viz-hash-bucket flex h-9 w-12 shrink-0 items-center justify-center rounded-lg', roleClass(s.roles?.[`${b}`]))}>
              <span className="viz-hash-idx">{b}</span>
            </div>
            <span className={cn('viz-hash-stem', chain.length === 0 && 'viz-hash-stem-empty')} />
            <div className="flex items-center">
              <AnimatePresence initial={false} mode="popLayout">
                {chain.map((c, i) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, x: 24, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.8 }}
                    transition={spring}
                    className="flex items-center"
                  >
                    {i > 0 && <span className="viz-hash-link" />}
                    <span className={cn('viz-cell flex h-9 min-w-11 items-center justify-center rounded-lg px-2', roleClass(s.roles?.[`${b},${i}`]))}>
                      <motion.span key={String(c.v)} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="viz-value whitespace-nowrap">
                        {fmt(c.v)}
                      </motion.span>
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {chain.length === 0 && <span className="viz-hash-empty">empty</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
