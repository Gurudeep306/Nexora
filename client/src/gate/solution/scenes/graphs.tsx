import { motion } from 'motion/react'
import type { AutomatonFrame, GraphFrame, Tone, TreeFrame, TreeNode } from '../types'
import { Scroll, Svg, SvgPop } from './common'
import { EASE, edgeGeometry, fitPoints, selfLoop, show, type Pt } from './geometry'

const R = 21

function edgeTone(map: Record<string, Tone> | undefined, e: { from: string; to: string; tone?: Tone }, undirected: boolean): Tone {
  return map?.[`${e.from}>${e.to}`] ?? (undirected ? map?.[`${e.to}>${e.from}`] : undefined) ?? e.tone ?? 'default'
}

/* ── Layouts ─────────────────────────────────────────────────────────────── */

function circleLayout<T extends { id: string }>(items: T[]): Map<string, Pt> {
  const n = items.length
  const rad = Math.max(95, n * 21)
  return new Map(
    items.map((it, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n
      return [it.id, { x: rad + rad * Math.cos(a), y: rad + rad * Math.sin(a) }]
    }),
  )
}

function layeredLayout(nodes: { id: string }[], edges: { from: string; to: string }[], directed: boolean): Map<string, Pt> {
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]))
  for (const e of edges) {
    adj.get(e.from)?.push(e.to)
    if (!directed) adj.get(e.to)?.push(e.from)
  }
  const level = new Map<string, number>()
  const order: string[] = []
  for (const start of nodes.map((n) => n.id)) {
    if (level.has(start)) continue
    level.set(start, level.size === 0 ? 0 : Math.max(...level.values()) + 1)
    const q = [start]
    while (q.length) {
      const u = q.shift()!
      order.push(u)
      for (const v of adj.get(u) ?? [])
        if (!level.has(v)) {
          level.set(v, level.get(u)! + 1)
          q.push(v)
        }
    }
  }
  const byLevel = new Map<number, string[]>()
  for (const id of order) byLevel.set(level.get(id)!, [...(byLevel.get(level.get(id)!) ?? []), id])
  const maxCount = Math.max(...[...byLevel.values()].map((l) => l.length))
  const pos = new Map<string, Pt>()
  for (const [lv, ids] of byLevel)
    ids.forEach((id, i) => pos.set(id, { x: lv * 130, y: (i - (ids.length - 1) / 2) * 78 + ((maxCount - 1) / 2) * 78 }))
  return pos
}

function manualLayout(items: { id: string; x?: number; y?: number }[], targetW: number) {
  const pts = items.map((n) => ({ id: n.id, x: n.x ?? 0, y: n.y ?? 0 }))
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const dx = Math.max(...xs) - Math.min(...xs) || 1
  const dy = Math.max(...ys) - Math.min(...ys) || 1
  // Keep the author's aspect ratio but give each node room.
  const minGap = Math.min(
    ...pts.flatMap((a, i) => pts.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y))).filter((d) => d > 0),
  )
  const scale = Math.max(Math.min(targetW / dx, 340 / dy), 78 / (Number.isFinite(minGap) ? minGap : 1))
  const w = dx * scale
  const h = dy * scale
  return new Map(fitPoints(pts, w, h).map((p) => [p.id, { x: p.x, y: p.y }]))
}

function bounds(pos: Map<string, Pt>, padX = 40, padY = 40) {
  const ps = [...pos.values()]
  const x0 = Math.min(...ps.map((p) => p.x)) - padX
  const y0 = Math.min(...ps.map((p) => p.y)) - padY
  const x1 = Math.max(...ps.map((p) => p.x)) + padX
  const y1 = Math.max(...ps.map((p) => p.y)) + padY
  return { x0, y0, w: x1 - x0, h: y1 - y0 }
}

function EdgeLabel({ at, text, tone }: { at: Pt; text: string; tone?: Tone }) {
  const w = Math.max(18, text.length * 7.4 + 10)
  return (
    <motion.g initial={false} animate={{ x: at.x, y: at.y }} transition={EASE} data-tone={tone ?? 'default'}>
      <rect x={-w / 2} y={-10} width={w} height={20} rx={6} className="sc-chip-bg" />
      <SvgPop value={text} textAnchor="middle" y={4} className="sc-svg-small sc-mono" style={tone && tone !== 'default' ? { fill: 'var(--t)', fontWeight: 700 } : undefined} />
    </motion.g>
  )
}

/* ── Graph ───────────────────────────────────────────────────────────────── */

export function GraphScene({ f }: { f: GraphFrame }) {
  const allXY = f.nodes.every((n) => typeof n.x === 'number' && typeof n.y === 'number')
  const layout = f.layout ?? (allXY ? 'manual' : 'circle')
  const raw =
    layout === 'manual' && allXY ? manualLayout(f.nodes, 480) : layout === 'layered' ? layeredLayout(f.nodes, f.edges, !!f.directed) : circleLayout(f.nodes)
  const b = bounds(raw, 44, 44)
  const pos = new Map([...raw].map(([k, p]) => [k, { x: p.x - b.x0, y: p.y - b.y0 }]))
  const pairs = new Set(f.edges.map((e) => `${e.from}→${e.to}`))
  return (
    <Svg width={b.w} height={b.h} label="graph">
      {f.edges.map((e, i) => {
        const a = pos.get(e.from)
        const c = pos.get(e.to)
        if (!a || !c) return null
        const anti = f.directed && pairs.has(`${e.to}→${e.from}`)
        const g = edgeGeometry(a, c, R, anti ? -16 : 0, R + (f.directed ? 1 : 0))
        const tone = edgeTone(f.edgeTones, e, !f.directed)
        return (
          <g key={`e${i}-${e.from}-${e.to}`} data-tone={tone}>
            <motion.path initial={false} animate={{ d: g.d }} transition={EASE} className="sc-edge" data-tone={tone} strokeDasharray={e.dashed ? '6 5' : undefined} />
            {f.directed && <motion.polygon initial={false} animate={{ points: g.head }} transition={EASE} className="sc-arrowhead" data-tone={tone} />}
          </g>
        )
      })}
      {f.edges.map((e, i) => {
        const a = pos.get(e.from)
        const c = pos.get(e.to)
        if (!a || !c || e.w === undefined) return null
        const anti = f.directed && pairs.has(`${e.to}→${e.from}`)
        const g = edgeGeometry(a, c, R, anti ? -16 : 0)
        return <EdgeLabel key={`w${i}`} at={g.label} text={show(e.w)} tone={edgeTone(f.edgeTones, e, !f.directed)} />
      })}
      {f.nodes.map((n) => {
        const p = pos.get(n.id)!
        const tone = f.tones?.[n.id] ?? n.tone ?? 'default'
        const sub = f.subs?.[n.id] ?? n.sub
        return (
          <motion.g key={n.id} initial={false} animate={{ x: p.x, y: p.y }} transition={EASE} data-tone={tone}>
            {tone === 'accent' && <circle r={R + 6} className="sc-pulse" style={{ fill: 'none', stroke: 'var(--t)', strokeWidth: 2 }} />}
            <circle r={R} className="sc-node" data-tone={tone} />
            <text textAnchor="middle" y={5} className="sc-svg-label">
              {n.label ?? n.id}
            </text>
            {sub !== undefined && (
              <g transform={`translate(0, ${R + 13})`}>
                <rect x={-Math.max(14, sub.length * 4 + 7)} y={-9} width={Math.max(28, sub.length * 8 + 14)} height={18} rx={9} className="sc-chip-bg" style={{ stroke: 'var(--t)' }} />
                <SvgPop value={sub} textAnchor="middle" y={4} className="sc-svg-small sc-mono" style={{ fill: 'var(--color-text-primary)', fontWeight: 700 }} />
              </g>
            )}
          </motion.g>
        )
      })}
    </Svg>
  )
}

/* ── Automaton ───────────────────────────────────────────────────────────── */

export function AutomatonScene({ f }: { f: AutomatonFrame }) {
  const allXY = f.states.every((s) => typeof s.x === 'number' && typeof s.y === 'number')
  const layout = f.layout ?? (allXY ? 'manual' : 'row')
  const order = new Map(f.states.map((s, i) => [s.id, i]))
  const raw =
    layout === 'manual' && allXY
      ? manualLayout(f.states, 480)
      : layout === 'circle'
        ? circleLayout(f.states)
        : new Map(f.states.map((s, i) => [s.id, { x: i * 120, y: 0 }]))
  const pairs = new Set(f.edges.map((e) => `${e.from}→${e.to}`))
  const bendOf = (e: { from: string; to: string }) => {
    const gap = Math.abs(order.get(e.from)! - order.get(e.to)!)
    const anti = pairs.has(`${e.to}→${e.from}`)
    return layout === 'row' ? (gap > 1 ? -(20 + 14 * (gap - 1)) : anti ? -18 : 0) : anti ? -18 : 0
  }
  // Room above / below the states for loops and arcs.
  let up = 0
  let down = 0
  for (const e of f.edges) {
    if (e.from === e.to) up = Math.max(up, R * 2.6 + 4)
    else if (layout === 'row') {
      const bnd = Math.abs(bendOf(e)) + 12
      if (order.get(e.from)! < order.get(e.to)!) up = Math.max(up, bnd)
      else down = Math.max(down, bnd)
    }
  }
  const ps = [...raw.values()]
  const bx0 = Math.min(...ps.map((p) => p.x)) - 64
  const by0 = Math.min(...ps.map((p) => p.y)) - Math.max(34, R + up + 8)
  const bw = Math.max(...ps.map((p) => p.x)) + 50 - bx0
  const bh = Math.max(...ps.map((p) => p.y)) + Math.max(34, R + down + 8) - by0
  const pos = new Map([...raw].map(([k, p]) => [k, { x: p.x - bx0, y: p.y - by0 }]))
  const current = new Set(f.current ?? [])
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-start justify-center gap-4">
        <div className="min-w-0 flex-1">
          <Svg width={bw} height={bh} label="automaton">
            {f.edges.map((e, i) => {
              const a = pos.get(e.from)
              const c = pos.get(e.to)
              if (!a || !c) return null
              const tone = edgeTone(f.edgeTones, e, false)
              let g: { d: string; label: Pt; head: string }
              if (e.from === e.to) g = selfLoop(a, R)
              else {
                g = edgeGeometry(a, c, R, bendOf(e), R + 1)
              }
              return (
                <g key={`e${i}`} data-tone={tone}>
                  <path d={g.d} className="sc-edge" data-tone={tone} />
                  <polygon points={g.head} className="sc-arrowhead" data-tone={tone} />
                </g>
              )
            })}
            {f.edges.map((e, i) => {
              const a = pos.get(e.from)
              const c = pos.get(e.to)
              if (!a || !c) return null
              let at: Pt
              if (e.from === e.to) at = selfLoop(a, R).label
              else {
                at = edgeGeometry(a, c, R, bendOf(e)).label
              }
              return <EdgeLabel key={`l${i}`} at={at} text={e.label} tone={edgeTone(f.edgeTones, e, false)} />
            })}
            {f.states.map((s) => {
              const p = pos.get(s.id)!
              const on = current.has(s.id)
              const tone = s.tone ?? (on ? 'accent' : 'default')
              return (
                <g key={s.id} transform={`translate(${p.x}, ${p.y})`} data-tone={tone}>
                  {s.start && (
                    <g data-tone="default">
                      <line x1={-R - 30} y1={0} x2={-R - 8} y2={0} className="sc-edge" data-tone="default" />
                      <polygon points={`${-R - 1},0 ${-R - 10},-4.5 ${-R - 10},4.5`} className="sc-arrowhead" data-tone="default" />
                    </g>
                  )}
                  {on && <circle r={R + 7} className="sc-pulse" style={{ fill: 'none', stroke: 'var(--t)', strokeWidth: 2.5 }} />}
                  <circle r={R} className="sc-node" data-tone={tone} />
                  {s.accept && <circle r={R - 4.5} className="sc-node" data-tone={tone} style={{ fill: 'none' }} />}
                  <text textAnchor="middle" y={5} className="sc-svg-label" style={{ fontSize: (s.label ?? s.id).length > 3 ? 11 : 13 }}>
                    {s.label ?? s.id}
                  </text>
                </g>
              )
            })}
          </Svg>
        </div>
        {f.stack && (
          <div className="flex flex-col items-center gap-1 pt-2">
            <div className="flex min-h-[3rem] min-w-[3rem] flex-col-reverse gap-1 rounded-b-lg border-x-2 border-b-2 border-[var(--color-border-strong)] p-1">
              {f.stack.map((s, i) => (
                <motion.div key={`${i}-${s}`} layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={EASE} className="sc-cell h-7 min-w-[2.2rem]" data-tone={i === f.stack!.length - 1 ? 'accent' : 'default'}>
                  {s}
                </motion.div>
              ))}
            </div>
            <span className="sc-label">stack</span>
          </div>
        )}
      </div>
      {f.tape && <Tape cells={f.tape.cells} head={f.tape.head ?? 0} />}
    </div>
  )
}

function Tape({ cells, head }: { cells: string[]; head: number }) {
  return (
    <Scroll>
      <div className="flex flex-col items-start gap-1">
        <div className="flex gap-1">
          {cells.map((c, i) => (
            <div key={i} className="sc-cell h-9 w-9 min-w-0 px-0" data-tone={i < head ? 'muted' : i === head ? 'accent' : 'default'}>
              {c}
            </div>
          ))}
          <div className="sc-cell h-9 w-9 min-w-0 px-0" data-empty="true" data-tone={head >= cells.length ? 'accent' : 'default'}>
            ⊣
          </div>
        </div>
        <div className="flex gap-1">
          {[...cells, ''].map((_, i) => (
            <div key={i} className="flex w-9 justify-center">
              {i === head && (
                <motion.span layoutId="tape-head" transition={EASE} className="sc-ptr" data-tone="accent">
                  head
                </motion.span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Scroll>
  )
}

/* ── Tree ────────────────────────────────────────────────────────────────── */

interface Placed {
  key: string
  node: TreeNode
  x: number
  y: number
  w: number
  parent: string | null
}

const nodeKey = (n: TreeNode) => n.id ?? (Array.isArray(n.label) ? n.label.join('|') : String(n.label))
const nodeWidth = (n: TreeNode) => (Array.isArray(n.label) ? n.label.length * 30 + 8 : Math.max(42, show(n.label).length * 9 + 20))

function layoutTree(root: TreeNode): Placed[] {
  const out: Placed[] = []
  const right = new Map<number, number>()
  const GAP_X = 14
  const LEVEL = 78
  let cursor = 0
  const shift = (from: number, dx: number) => {
    for (let i = from; i < out.length; i++) out[i].x += dx
  }
  function place(n: TreeNode, depth: number, parent: string | null): number {
    const w = nodeWidth(n)
    const kids = n.children ?? []
    const startIdx = out.length
    const self: Placed = { key: nodeKey(n), node: n, x: 0, y: depth * LEVEL, w, parent }
    out.push(self)
    if (!kids.some(Boolean)) {
      self.x = cursor + w / 2
      cursor += w + GAP_X
    } else {
      const xs = kids.map((k) => {
        if (k) return place(k, depth + 1, self.key)
        const x = cursor + 15
        cursor += 30 + GAP_X
        return x
      })
      self.x = (xs[0] + xs[xs.length - 1]) / 2
    }
    const minLeft = (right.get(depth) ?? -Infinity) + GAP_X
    if (self.x - w / 2 < minLeft) {
      const dx = minLeft - (self.x - w / 2)
      shift(startIdx, dx)
      cursor += dx
    }
    // record right edges of this subtree per depth
    for (let i = startIdx; i < out.length; i++) {
      const p = out[i]
      const d = p.y / LEVEL
      right.set(d, Math.max(right.get(d) ?? -Infinity, p.x + p.w / 2))
    }
    return self.x
  }
  place(root, 0, null)
  return out
}

export function TreeScene({ f }: { f: TreeFrame }) {
  if (!f.root) return <div className="py-6 text-center text-[13px] text-[var(--color-text-muted)]">(empty tree)</div>
  const placed = layoutTree(f.root)
  const x0 = Math.min(...placed.map((p) => p.x - p.w / 2)) - 16
  const x1 = Math.max(...placed.map((p) => p.x + p.w / 2)) + 16
  const y1 = Math.max(...placed.map((p) => p.y)) + 40
  const byKey = new Map(placed.map((p) => [p.key, p]))
  return (
    <Svg width={x1 - x0} height={y1 + 26} label="tree">
      <g transform={`translate(${-x0}, 24)`}>
        {placed
          .filter((p) => p.parent)
          .map((p) => {
            const q = byKey.get(p.parent!)!
            const tone = p.node.tone && p.node.tone !== 'default' ? p.node.tone : 'default'
            return (
              <g key={`e-${p.key}`} data-tone={tone}>
                <motion.line
                  initial={{ x1: q.x, y1: q.y + 17, x2: q.x, y2: q.y + 17, opacity: 0 }}
                  animate={{ x1: q.x, y1: q.y + 17, x2: p.x, y2: p.y - 17, opacity: 1 }}
                  transition={EASE}
                  className="sc-edge"
                  data-tone={tone === 'accent' || tone === 'success' ? tone : 'default'}
                />
                {p.node.edge && (
                  <motion.g initial={false} animate={{ x: (q.x + p.x) / 2 + (p.x < q.x ? -10 : 10), y: (q.y + p.y) / 2 }} transition={EASE}>
                    <text textAnchor={p.x < q.x ? 'end' : 'start'} y={4} className="sc-svg-small sc-mono" style={{ fontWeight: 700 }}>
                      {p.node.edge}
                    </text>
                  </motion.g>
                )}
              </g>
            )
          })}
        {placed.map((p) => {
          const tone = p.node.tone ?? 'default'
          const keys = Array.isArray(p.node.label) ? p.node.label : null
          return (
            <motion.g
              key={p.key}
              initial={{ x: p.x, y: p.y - 20, opacity: 0 }}
              animate={{ x: p.x, y: p.y, opacity: 1 }}
              transition={EASE}
              data-tone={tone}
            >
              {tone === 'accent' && <rect x={-p.w / 2 - 5} y={-22} width={p.w + 10} height={44} rx={22} className="sc-pulse" style={{ fill: 'none', stroke: 'var(--t)', strokeWidth: 2 }} />}
              <rect x={-p.w / 2} y={-17} width={p.w} height={34} rx={keys ? 8 : 17} className="sc-node" data-tone={tone} />
              {keys ? (
                keys.map((k, i) => (
                  <g key={i}>
                    {i > 0 && <line x1={-p.w / 2 + 4 + i * 30} y1={-17} x2={-p.w / 2 + 4 + i * 30} y2={17} className="sc-edge" data-tone="default" />}
                    <text x={-p.w / 2 + 4 + i * 30 + 15} y={5} textAnchor="middle" className="sc-svg-label sc-mono">
                      {show(k)}
                    </text>
                  </g>
                ))
              ) : (
                <text textAnchor="middle" y={5} className="sc-svg-label sc-mono">
                  {show(p.node.label)}
                </text>
              )}
              {p.node.sub && (
                <text textAnchor="middle" y={31} className="sc-svg-small sc-mono">
                  {p.node.sub}
                </text>
              )}
            </motion.g>
          )
        })}
      </g>
    </Svg>
  )
}
