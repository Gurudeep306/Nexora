import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { RankGlyph } from '@/components/ui'
import { cn } from '@/lib/utils'
import { nodeCountLabel, rampColor } from './format'
import type { CrossLink, NexusNode, NexusZone } from './types'

/*
 * The Rift Web.
 *
 * The skill tree drawn as the NexoraGuru web: a faint jittered dot lattice,
 * crisp thin branch lines in the brand ramp (blue → violet → teal by depth),
 * and small dots / stars for the skills. Zones are tiers of the web, with
 * their emblem, progress and unlock state in the rail on the left.
 *
 *  • Links: mastered strands are bright, open strands carry a small dot
 *    flowing toward the skill you can take next, locked ones are hairlines.
 *  • On load (and on every subject switch) the web draws itself outward from
 *    its roots, breadth-first, strand by strand.
 *  • Hover or select a skill and its whole chain lights: prerequisites in
 *    teal, what it unlocks in violet; everything else dims. Prerequisites in
 *    other subjects are "Needs" chips under the skill; clicking one jumps.
 *  • The plane sits in gentle perspective and leans a little toward the
 *    pointer. No blur, no heavy glow; reduced motion turns all of it off.
 */

const ROW_H = 108 // one row of skills
const TIER_PAD = 22 // space above / below the rows in a zone tier
const R = 13 // progress ring radius
const HIT = 40 // clickable orb size
const NODE_TOP = 30 // first row's dot centre below the tier top
/** Distance from a dot's centre to the bottom of its label block. */
const LABEL_BOTTOM = R + 38
const DT_MAX = 0.085 // seconds per BFS level while drawing in

interface Placed {
  node: NexusNode
  x: number
  y: number
  /** 0..1 depth through the web, for the colour ramp. */
  u: number
  depth: number
}

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

/** Small deterministic hash → [-0.5, 0.5), so the web looks organic but never moves. */
function jitter(id: string, salt = 0): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return ((h >>> 0) % 1000) / 1000 - 0.5
}

function linkPath(a: Placed, b: Placed, key: string): string {
  // Same row: a low roof between the dots' sides.
  if (Math.abs(a.y - b.y) < 24) {
    const dir = b.x > a.x ? 1 : -1
    const x1 = a.x + dir * (R + 3)
    const x2 = b.x - dir * (R + 3)
    const mx = (x1 + x2) / 2 + jitter(key, 3) * 18
    return `M${x1},${a.y} L${mx},${Math.min(a.y, b.y) - 20} L${x2},${b.y}`
  }
  // Downward: leave from under the label (a node reads as one block: dot,
  // name, count), bend once like a branch, land on the top of the ring.
  const down = b.y > a.y
  // A "Needs" chip sits under the label; strands leave from below it.
  const y1 = down ? a.y + LABEL_BOTTOM + (a.node.crossRequires?.length ? 20 : 0) : a.y - R - 3
  const y2 = down ? b.y - R - 4 : b.y + LABEL_BOTTOM
  const kx = a.x + (b.x - a.x) * (0.45 + jitter(key, 1) * 0.2)
  const ky = y1 + (y2 - y1) * (0.5 + jitter(key, 2) * 0.25)
  return `M${a.x},${y1} L${kx},${ky} L${b.x},${y2}`
}

/* A four-point star for mastered skills. */
const STAR = 'M0,-7.5 L1.9,-1.9 L7.5,0 L1.9,1.9 L0,7.5 L-1.9,1.9 L-7.5,0 L-1.9,-1.9 Z'

function NodeDot({
  p,
  selected,
  focus,
  available,
  delay,
  onSelect,
  onHover,
  onJump,
}: {
  p: Placed
  selected: boolean
  focus: 'self' | 'up' | 'down' | 'dim' | null
  available: boolean
  delay: number
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  onJump?: (link: CrossLink) => void
}) {
  const { node } = p
  const color = rampColor(p.u)
  const circ = 2 * Math.PI * R
  const pct = node.completed ? 100 : node.progress
  const state = node.completed ? 'done' : node.unlocked ? 'open' : 'locked'
  const needs = node.crossRequires ?? []
  const firstNeed = needs[0]

  return (
    <div
      id={`nx-node-${node.id}`}
      className={cn('nx-node absolute flex w-[132px] -translate-x-1/2 flex-col items-center', focus === 'dim' && 'nx-node-dim')}
      style={{ left: p.x, top: p.y - HIT / 2, ['--zc' as string]: color, ['--delay' as string]: `${delay}s` }}
      data-focus={focus ?? undefined}
    >
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(node.id)}
        onBlur={() => onHover(null)}
        aria-pressed={selected}
        aria-label={`${node.name}: ${node.completed ? 'mastered' : node.unlocked ? nodeCountLabel(node) : 'locked'}`}
        className="nx-dot relative flex cursor-pointer items-center justify-center rounded-full"
        style={{ width: HIT, height: HIT }}
        data-state={state}
        data-selected={selected || undefined}
      >
        <svg width={HIT} height={HIT} viewBox={`${-HIT / 2} ${-HIT / 2} ${HIT} ${HIT}`} aria-hidden="true" className="overflow-visible">
          {available && <circle r={R + 3} className="nx-dot-pulse" fill="none" strokeWidth="1" />}
          {selected && <circle r={R + 5.5} className="nx-dot-select" fill="none" strokeWidth="1.5" />}
          <circle r={R} className="nx-dot-disc" />
          <circle r={R} fill="none" className="nx-dot-track" strokeWidth="1.5" />
          {pct > 0 && (
            <circle
              r={R}
              fill="none"
              stroke="var(--zc)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${(circ * pct) / 100} ${circ}`}
              transform="rotate(-90)"
              className="transition-[stroke-dasharray] duration-700"
            />
          )}
          {state === 'done' ? (
            <path d={STAR} className="nx-dot-star" />
          ) : state === 'open' ? (
            <circle r={4} className="nx-dot-core" />
          ) : (
            <circle r={2.6} className="nx-dot-core" />
          )}
        </svg>
        {state === 'locked' && (
          <span className="absolute -right-0.5 -bottom-0.5 flex size-[15px] items-center justify-center rounded-full bg-bg-surface-2 text-text-muted ring-1 ring-border">
            <Lock className="size-2" aria-hidden="true" />
          </span>
        )}
      </button>

      <p
        className={cn(
          'nx-label mt-0.5 mb-0 line-clamp-2 px-1 text-center text-[11.5px] leading-tight font-semibold',
          state === 'locked' ? 'text-text-muted' : 'text-text-primary',
        )}
        title={node.name}
      >
        {node.name}
      </p>
      <p className="nx-label mt-0.5 mb-0 font-mono text-[10px] text-text-muted tabular-nums">
        {node.completed ? 'mastered' : nodeCountLabel(node)}
      </p>
      {firstNeed && onJump && (
        <button
          type="button"
          onClick={() => onJump(firstNeed)}
          className="nx-need mt-1 max-w-full cursor-pointer truncate rounded-full border px-1.5 py-px text-[9.5px] font-medium"
          data-done={firstNeed.completed || undefined}
          title={needs.map((c) => `Needs ${c.name} (${c.subjectShort})`).join('\n')}
          aria-label={`Needs ${firstNeed.name} in ${firstNeed.subjectName}: open it`}
        >
          Needs · {firstNeed.name} ({firstNeed.subjectShort}){needs.length > 1 ? ` +${needs.length - 1}` : ''}
        </button>
      )}
    </div>
  )
}

/* The faint jittered lattice behind the web (one SVG pattern tile). */
function latticeTile(size: number, step: number) {
  const dots: { x: number; y: number; o: number }[] = []
  const n = Math.round(size / step)
  for (let gy = 0; gy < n; gy++) {
    for (let gx = 0; gx < n; gx++) {
      const id = `${gx}:${gy}`
      dots.push({
        x: (gx * step + (gy % 2 ? step / 2 : 0) + jitter(id, 11) * step * 0.4 + size) % size,
        y: (gy * step + jitter(id, 12) * step * 0.4 + size) % size,
        o: 0.5 + jitter(id, 13),
      })
    }
  }
  return dots
}
const TILE = 240
const TILE_DOTS = latticeTile(TILE, 30)

/** The lattice as an SVG <pattern>; fill a rect with url(#id). */
export function LatticePattern({ id }: { id: string }) {
  return (
    <pattern id={id} width={TILE} height={TILE} patternUnits="userSpaceOnUse">
      {TILE_DOTS.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={1.05} fill="currentColor" opacity={d.o} />
      ))}
    </pattern>
  )
}

export function SkillGraph({
  nodes,
  zones,
  selectedId,
  onSelect,
  onJump,
  rankEmblems = true,
}: {
  nodes: NexusNode[]
  zones: NexusZone[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Jump to a node in another subject (cross-subject chips). */
  onJump?: (link: CrossLink) => void
  /** DSA zones are Rift levels with rank emblems; subject chapters are numbered. */
  rankEmblems?: boolean
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hovered, setHovered] = useState<string | null>(null)
  const reduce = useReducedMotion()
  const planeRef = useRef<HTMLDivElement>(null)
  const compact = width > 0 && width < 640
  const rail = compact ? 58 : 184
  // Wide enough that the labels of a five-skill row never touch; narrower
  // screens scroll the web sideways.
  const W = Math.max(width, compact ? 620 : 700)
  // Phones scroll the web sideways: start centred on it, not on the rail.
  const centred = useRef(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || centred.current || width === 0) return
    centred.current = true
    if (W > width) el.scrollLeft = (W - width + rail) / 2
  }, [W, width, rail, ref])

  // Tier geometry: each zone is as tall as its rows.
  const tiers = useMemo(() => {
    const heights = zones.map((z) => Math.max(1, z.rows ?? 1) * ROW_H + TIER_PAD * 2 - 8)
    return zones.map((z, i) => ({
      level: z.level,
      top: heights.slice(0, i).reduce((a, h) => a + h, 0),
      height: heights[i],
    }))
  }, [zones])
  const height = tiers.length ? tiers[tiers.length - 1].top + tiers[tiers.length - 1].height : 0
  const tierOf = useMemo(() => new Map(tiers.map((t) => [t.level, t])), [tiers])

  // BFS depth from the roots (skills with no prerequisite in this tree).
  const depthOf = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.id))
    const children = new Map<string, string[]>()
    for (const n of nodes) for (const r of n.requires) if (ids.has(r)) children.set(r, [...(children.get(r) ?? []), n.id])
    const depth = new Map<string, number>()
    let frontier = nodes.filter((n) => !n.requires.some((r) => ids.has(r))).map((n) => n.id)
    frontier.forEach((id) => depth.set(id, 0))
    while (frontier.length) {
      const next: string[] = []
      for (const id of frontier) {
        for (const c of children.get(id) ?? []) {
          if (depth.has(c)) continue
          depth.set(c, depth.get(id)! + 1)
          next.push(c)
        }
      }
      frontier = next
    }
    for (const n of nodes) if (!depth.has(n.id)) depth.set(n.id, 0)
    return depth
  }, [nodes])
  const maxDepth = Math.max(1, ...depthOf.values())
  const dt = Math.min(DT_MAX, 1.8 / maxDepth)

  const placed = useMemo(() => {
    const left = rail + 60
    const right = W - 60
    const span = Math.max(1, right - left)
    const zoneIndex = new Map(zones.map((z, i) => [z.level, i]))
    const m = new Map<string, Placed>()
    for (const n of nodes) {
      const tier = tierOf.get(n.zone)
      const row = n.row ?? 0
      const zi = zoneIndex.get(n.zone) ?? 0
      const rows = Math.max(1, zones[zi]?.rows ?? 1)
      m.set(n.id, {
        node: n,
        x: Math.round(left + (n.x / 100) * span + jitter(n.id, 5) * 18),
        y: Math.round((tier?.top ?? 0) + TIER_PAD + NODE_TOP + row * ROW_H + jitter(n.id, 6) * 12),
        u: zones.length > 1 ? (zi + row / rows) / zones.length : 0,
        depth: depthOf.get(n.id) ?? 0,
      })
    }
    return m
  }, [nodes, zones, rail, W, tierOf, depthOf])

  const edges = useMemo(() => {
    const out: { key: string; a: Placed; b: Placed; state: 'done' | 'open' | 'locked'; d: string; sx: number; sy: number }[] = []
    for (const n of nodes) {
      const b = placed.get(n.id)
      if (!b) continue
      for (const rid of n.requires) {
        const a = placed.get(rid)
        if (!a) continue
        const state = n.completed && a.node.completed ? 'done' : n.unlocked ? 'open' : 'locked'
        const key = `${rid}>${n.id}`
        const d = linkPath(a, b, key)
        // The strand's start gets a small knot, like the lattice's nodes.
        const [sx, sy] = d.slice(1, d.indexOf(' ')).split(',').map(Number)
        out.push({ key, a, b, state, d, sx, sy })
      }
    }
    // Locked first, then open, then mastered, so the lit strands sit on top.
    const rank = { locked: 0, open: 1, done: 2 }
    return out.sort((x, y) => rank[x.state] - rank[y.state])
  }, [nodes, placed])

  // Focus: the hovered (or selected) skill's prerequisites (up) and what it unlocks (down).
  const focus = (hovered && placed.has(hovered) ? hovered : null) ?? (selectedId && placed.has(selectedId) ? selectedId : null)
  const lineage = useMemo(() => {
    if (!focus) return null
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const children = new Map<string, string[]>()
    for (const n of nodes) for (const r of n.requires) children.set(r, [...(children.get(r) ?? []), n.id])
    const walk = (start: string, next: (id: string) => string[]) => {
      const set = new Set<string>()
      const stack = [start]
      while (stack.length) {
        for (const id of next(stack.pop()!)) {
          if (set.has(id)) continue
          set.add(id)
          stack.push(id)
        }
      }
      return set
    }
    return {
      up: walk(focus, (id) => byId.get(id)?.requires ?? []),
      down: walk(focus, (id) => children.get(id) ?? []),
    }
  }, [focus, nodes])

  const focusOf = (id: string): 'self' | 'up' | 'down' | 'dim' | null => {
    if (!lineage) return null
    if (id === focus) return 'self'
    if (lineage.up.has(id)) return 'up'
    if (lineage.down.has(id)) return 'down'
    return 'dim'
  }

  // Gentle parallax: the plane leans a degree or so toward the pointer.
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse' || !planeRef.current) return
    const box = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - box.left) / box.width - 0.5
    const py = Math.max(-0.5, Math.min(0.5, (e.clientY - Math.max(box.top, 0)) / Math.min(box.height, window.innerHeight) - 0.5))
    planeRef.current.style.setProperty('--ry', `${(px * 2.2).toFixed(2)}deg`)
    planeRef.current.style.setProperty('--rx-lean', `${(-py * 1.4).toFixed(2)}deg`)
  }
  const onPointerLeave = () => {
    planeRef.current?.style.setProperty('--ry', '0deg')
    planeRef.current?.style.setProperty('--rx-lean', '0deg')
  }

  return (
    <div ref={ref} className="card nx-web-card overflow-x-auto p-0">
      <div className="nx-web-stage relative" style={{ width: W }} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
        {width > 0 && (
          <div ref={planeRef} className="nx-web-plane relative" style={{ height }} data-animate={reduce ? undefined : ''}>
            {/* lattice + tiers */}
            <svg className="nx-web-floor pointer-events-none absolute inset-0" width={W} height={height} aria-hidden="true">
              <defs>
                <LatticePattern id="nx-lattice" />
              </defs>
              <rect x={rail} y={0} width={W - rail} height={height} fill="url(#nx-lattice)" className="nx-lattice" />
              {zones.map((z) => {
                const t = tierOf.get(z.level)!
                return (
                  <g key={z.level}>
                    {z.current && <rect x={0} y={t.top} width={W} height={t.height} className="nx-tier-current" />}
                    {t.top > 0 && <line x1={0} x2={W} y1={t.top} y2={t.top} className="nx-tier-line" strokeWidth="1" strokeDasharray="2 5" />}
                  </g>
                )
              })}
              <line x1={rail} x2={rail} y1={0} y2={height} className="nx-tier-line" strokeWidth="1" />
            </svg>

            {/* strands */}
            <svg className="pointer-events-none absolute inset-0 overflow-visible" width={W} height={height} aria-hidden="true">
              {edges.map((e, i) => {
                const ends = lineage ? [focusOf(e.a.node.id), focusOf(e.b.node.id)] : null
                const lit = !ends || (ends[0] !== 'dim' && ends[1] !== 'dim' && !(ends[0] === 'up' && ends[1] === 'down'))
                const toward = ends && lit ? (ends[1] === 'self' || ends[1] === 'up' ? 'up' : 'down') : null
                const color = toward === 'up' ? 'var(--nx-b3)' : toward === 'down' ? 'var(--nx-b2)' : rampColor((e.a.u + e.b.u) / 2)
                const w = e.state === 'done' ? 1.6 : e.state === 'open' ? 1.25 : 0.8
                return (
                  <g key={e.key} className="nx-strand" data-state={e.state} data-lit={toward ? '' : undefined} data-dim={!lit || undefined}>
                    <path
                      d={e.d}
                      pathLength={1}
                      fill="none"
                      stroke={color}
                      strokeWidth={toward ? w + 0.6 : w}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="nx-strand-line"
                      style={{ ['--delay' as string]: `${(e.a.depth * dt).toFixed(3)}s` }}
                    />
                    <circle cx={e.sx} cy={e.sy} r={1.6} fill={color} className="nx-strand-knot" />
                    {e.state === 'open' && !reduce && lit && (
                      <circle r={1.9} fill={color} className="nx-strand-flow">
                        <animateMotion dur={`${2.6 + (i % 5) * 0.3}s`} repeatCount="indefinite" path={e.d} begin={`${(e.b.depth * dt + 0.4).toFixed(2)}s`} />
                      </circle>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* zone rail */}
            {zones.map((z) => {
              const t = tierOf.get(z.level)!
              return (
                <div
                  key={z.level}
                  id={`zone-${z.level}`}
                  className="absolute left-0 flex flex-col justify-center gap-1.5 px-3"
                  style={{ top: t.top, height: Math.min(t.height, 160), width: rail }}
                >
                  <div className="flex items-center gap-2.5">
                    {rankEmblems ? (
                      <RankGlyph level={z.level} size={compact ? 32 : 36} animated={z.current} />
                    ) : (
                      <span
                        className="nx-chapter flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold tabular-nums"
                        style={{ ['--zc' as string]: z.color }}
                        data-current={z.current || undefined}
                      >
                        {String(z.level).padStart(2, '0')}
                      </span>
                    )}
                    {!compact && (
                      <div className="min-w-0">
                        <p className="mb-0 text-[10px] font-semibold tracking-[0.12em] text-text-muted uppercase">
                          {rankEmblems ? 'Zone' : 'Chapter'} {z.level}
                        </p>
                        <p className="mb-0 line-clamp-2 font-display text-[13.5px] leading-tight font-semibold text-text-primary" title={z.name}>
                          {z.name}
                        </p>
                      </div>
                    )}
                  </div>
                  {!compact &&
                    (z.locked ? (
                      <p className="mb-0 flex items-center gap-1 text-[10.5px] leading-snug text-text-muted">
                        <Lock className="size-3 shrink-0" aria-hidden="true" />
                        {rankEmblems ? `${z.xpRequired.toLocaleString()} XP · ${z.probsRequired} solves` : 'Finish earlier chapters'}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        <div className="h-1 overflow-hidden rounded-full bg-bg-surface-3">
                          <div
                            className="h-full rounded-full transition-[width] duration-700"
                            style={{ width: `${z.zoneProgress}%`, backgroundColor: z.color }}
                          />
                        </div>
                        <p className="mb-0 flex items-center justify-between font-mono text-[10px] text-text-muted tabular-nums">
                          <span>
                            {z.nodesCompleted}/{z.nodeCount} nodes
                          </span>
                          {z.current ? (
                            <span className="rounded-full bg-accent-brand/15 px-1.5 font-sans text-[9px] font-bold tracking-wider text-accent-brand uppercase">
                              you are here
                            </span>
                          ) : (
                            <span>{z.zoneProgress}%</span>
                          )}
                        </p>
                      </div>
                    ))}
                </div>
              )
            })}

            {/* skills */}
            {[...placed.values()].map((p) => (
              <NodeDot
                key={p.node.id}
                p={p}
                selected={selectedId === p.node.id}
                focus={focusOf(p.node.id)}
                available={p.node.unlocked && !p.node.completed}
                delay={p.depth * dt + 0.12}
                onSelect={onSelect}
                onHover={setHovered}
                onJump={onJump}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
