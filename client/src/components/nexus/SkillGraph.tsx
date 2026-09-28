import { createElement, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, Lock } from 'lucide-react'
import { RankGlyph } from '@/components/ui'
import { cn } from '@/lib/utils'
import { nodeIcon } from './icons'
import type { NexusNode, NexusZone } from './types'

/*
 * The Rift Tree.
 *
 * Everything is laid out in one pixel coordinate system measured from the
 * container, so the links always meet the nodes exactly (the old version
 * mixed percentage x with pixel y and straight lines, which is why links
 * cut through nodes and crossed into a tangle).
 *
 *  • Each zone is a horizontal band with its rank emblem in a rail on the
 *    left; the current zone is lit, locked zones say what unlocks them.
 *  • Links are smooth S-curves from the bottom of a prerequisite to the top
 *    of the skill it unlocks. Mastered links glow in the zone colour, open
 *    links flow toward the skill you can take next, locked ones are hairlines.
 *  • Hover or select a node and the tree focuses on it: its full chain of
 *    prerequisites and everything it leads to stay lit, the rest dims.
 *  • Nodes are orbs with a progress ring; the ones you can work on right now
 *    pulse softly.
 */

const BAND_H = 150
const NODE = 56 // orb diameter incl. progress ring
const R = NODE / 2
const CENTER_Y = 60 // node centre inside its band
/** Distance from an orb's centre to the bottom of its two-line label. */
const LABEL_BOTTOM = R + 40

interface Placed {
  node: NexusNode
  x: number
  y: number
  color: string
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

function linkPath(a: Placed, b: Placed): string {
  // Same band: a shallow arc between the orbs' sides.
  if (Math.abs(a.y - b.y) < 1) {
    const dir = b.x > a.x ? 1 : -1
    const x1 = a.x + dir * R
    const x2 = b.x - dir * R
    const mx = (x1 + x2) / 2
    return `M${x1},${a.y} Q${mx},${a.y - 34} ${x2},${b.y}`
  }
  // Downward links leave from under the node's label (the node reads as one
  // block: orb, name, count), so they never cross its text.
  const down = b.y > a.y ? 1 : -1
  const y1 = down > 0 ? a.y + LABEL_BOTTOM : a.y - R
  const y2 = down > 0 ? b.y - (R + 3) : b.y + LABEL_BOTTOM
  const dy = (y2 - y1) * 0.5
  return `M${a.x},${y1} C${a.x},${y1 + dy} ${b.x},${y2 - dy} ${b.x},${y2}`
}

function NodeOrb({
  p,
  selected,
  dimmed,
  available,
  onSelect,
  onHover,
}: {
  p: Placed
  selected: boolean
  dimmed: boolean
  available: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}) {
  const { node, color } = p
  const ringR = R - 2
  const circ = 2 * Math.PI * ringR
  const pct = node.completed ? 100 : node.progress
  const state = node.completed ? 'done' : node.unlocked ? 'open' : 'locked'

  return (
    <div
      className={cn(
        'absolute flex w-[128px] -translate-x-1/2 flex-col items-center transition-opacity duration-300',
        dimmed && 'opacity-30',
      )}
      style={{ left: p.x, top: p.y - R, ['--zc' as string]: color }}
    >
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(node.id)}
        onBlur={() => onHover(null)}
        aria-pressed={selected}
        aria-label={`${node.name}: ${
          node.completed ? 'mastered' : node.unlocked ? `${node.solved} of ${node.target} solved` : 'locked'
        }`}
        className={cn(
          'nx-orb group relative flex cursor-pointer items-center justify-center rounded-full hover:!scale-100',
          'transition-transform duration-200 ease-[var(--ease-smooth)] hover:-translate-y-0.5',
        )}
        style={{ width: NODE, height: NODE }}
        data-state={state}
        data-selected={selected || undefined}
      >
        {available && <span className="nx-orb-pulse" aria-hidden="true" />}

        {/* progress ring */}
        <svg className="absolute inset-0 -rotate-90" width={NODE} height={NODE} aria-hidden="true">
          <circle cx={R} cy={R} r={ringR} fill="none" className="nx-orb-track" strokeWidth="3" />
          {pct > 0 && (
            <circle
              cx={R}
              cy={R}
              r={ringR}
              fill="none"
              stroke="var(--zc)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(circ * pct) / 100} ${circ}`}
              className="transition-[stroke-dasharray] duration-700"
            />
          )}
        </svg>

        <span className="nx-orb-core relative flex size-[42px] items-center justify-center rounded-full">
          {createElement(nodeIcon(node.icon), { className: 'size-[19px]', 'aria-hidden': true })}
        </span>

        {node.completed && (
          <span
            className="absolute -top-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full text-white shadow-md ring-2 ring-[var(--wall-color,var(--color-bg-app))]"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          >
            <Check className="size-2.5" strokeWidth={4} />
          </span>
        )}
        {state === 'locked' && (
          <span
            className="absolute -right-0.5 -bottom-0.5 flex size-[18px] items-center justify-center rounded-full bg-bg-surface-3 text-text-muted ring-1 ring-border"
            aria-hidden="true"
          >
            <Lock className="size-2.5" />
          </span>
        )}
      </button>

      <p
        className={cn(
          'mt-1.5 mb-0 line-clamp-2 text-center text-[11.5px] leading-tight font-semibold',
          state === 'locked' ? 'text-text-muted' : 'text-text-primary',
        )}
        title={node.name}
      >
        {node.name}
      </p>
      <p className="mt-0.5 mb-0 font-mono text-[10px] text-text-muted tabular-nums">
        {node.completed ? 'mastered' : `${node.solved}/${node.target}`}
      </p>
    </div>
  )
}

export function SkillGraph({
  nodes,
  zones,
  selectedId,
  onSelect,
}: {
  nodes: NexusNode[]
  zones: NexusZone[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hovered, setHovered] = useState<string | null>(null)
  const compact = width > 0 && width < 640
  const rail = compact ? 58 : 184
  // Wide enough that the labels of a four-skill row never touch; narrower
  // screens scroll the tree sideways.
  const W = Math.max(width, 700)
  const height = zones.length * BAND_H

  const zoneColor = useMemo(() => new Map(zones.map((z) => [z.level, z.color])), [zones])

  const placed = useMemo(() => {
    const left = rail + 56
    const right = W - 56
    const span = Math.max(1, right - left)
    const m = new Map<string, Placed>()
    for (const n of nodes) {
      m.set(n.id, {
        node: n,
        x: Math.round(left + (n.x / 100) * span),
        y: (n.zone - 1) * BAND_H + CENTER_Y,
        color: zoneColor.get(n.zone) ?? 'var(--color-primary)',
      })
    }
    return m
  }, [nodes, rail, W, zoneColor])

  const edges = useMemo(() => {
    const out: { key: string; a: Placed; b: Placed; state: 'done' | 'open' | 'locked'; long: boolean }[] = []
    for (const n of nodes) {
      const b = placed.get(n.id)
      if (!b) continue
      for (const rid of n.requires) {
        const a = placed.get(rid)
        if (!a) continue
        const state = n.completed && a.node.completed ? 'done' : n.unlocked ? 'open' : 'locked'
        out.push({ key: `${rid}>${n.id}`, a, b, state, long: Math.abs(n.zone - a.node.zone) > 1 })
      }
    }
    // Draw locked first, then open, then mastered, so the lit paths sit on top.
    const rank = { locked: 0, open: 1, done: 2 }
    return out.sort((x, y) => rank[x.state] - rank[y.state])
  }, [nodes, placed])

  // Focus: the hovered (or selected) node's whole lineage.
  // (A hovered id that vanished in a data reload is ignored.)
  const focus = (hovered && placed.has(hovered) ? hovered : null) ?? selectedId
  const related = useMemo(() => {
    if (!focus) return null
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const children = new Map<string, string[]>()
    for (const n of nodes) for (const r of n.requires) children.set(r, [...(children.get(r) ?? []), n.id])
    const set = new Set<string>([focus])
    const walk = (start: string, next: (id: string) => string[]) => {
      const stack = [start]
      while (stack.length) {
        for (const id of next(stack.pop()!)) {
          if (set.has(id)) continue
          set.add(id)
          stack.push(id)
        }
      }
    }
    walk(focus, (id) => byId.get(id)?.requires ?? [])
    walk(focus, (id) => children.get(id) ?? [])
    return set
  }, [focus, nodes])

  return (
    <div className="card overflow-x-auto p-0">
      <div ref={ref} className="relative min-w-[700px]" style={{ height }}>
        {width > 0 && (
          <>
            {/* bands */}
            <svg className="pointer-events-none absolute inset-0" width={W} height={height} aria-hidden="true">
              <defs>
                <filter id="nx-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
              </defs>
              {zones.map((z, i) => (
                <g key={z.level}>
                  <rect
                    x={0}
                    y={i * BAND_H}
                    width={W}
                    height={BAND_H}
                    fill={z.color}
                    opacity={z.current ? 0.1 : z.locked ? 0.015 : 0.045}
                  />
                  {i > 0 && (
                    <line x1={0} x2={W} y1={i * BAND_H} y2={i * BAND_H} className="nx-band-line" strokeWidth="1" />
                  )}
                </g>
              ))}
              <line x1={rail} x2={rail} y1={0} y2={height} className="nx-band-line" strokeWidth="1" />

              {/* links */}
              {edges.map((e) => {
                const d = linkPath(e.a, e.b)
                const lit = !related || (related.has(e.a.node.id) && related.has(e.b.node.id))
                const color = e.state === 'done' ? e.b.color : e.state === 'open' ? 'var(--color-primary)' : undefined
                return (
                  <g
                    key={e.key}
                    className="transition-opacity duration-300"
                    opacity={!lit ? 0.08 : e.state !== 'locked' ? 1 : related ? 0.95 : e.long ? 0.35 : 0.6}
                  >
                    {e.state === 'done' && (
                      <path d={d} fill="none" stroke={color} strokeWidth="6" opacity="0.45" filter="url(#nx-glow)" />
                    )}
                    <path
                      d={d}
                      fill="none"
                      stroke={color}
                      className={cn(e.state === 'locked' && 'nx-link-locked', e.state === 'open' && 'nx-link-open')}
                      strokeWidth={e.state === 'locked' ? (related && lit ? 1.75 : 1.25) : related && lit ? 2.75 : 2}
                      strokeLinecap="round"
                      strokeDasharray={e.state === 'open' ? '5 7' : undefined}
                    />
                  </g>
                )
              })}
            </svg>

            {/* zone rail */}
            {zones.map((z, i) => (
              <div
                key={z.level}
                id={`zone-${z.level}`}
                className="absolute left-0 flex flex-col justify-center gap-1.5 px-3"
                style={{ top: i * BAND_H, height: BAND_H, width: rail }}
              >
                <div className="flex items-center gap-2.5">
                  <RankGlyph level={z.level} size={compact ? 32 : 36} animated={z.current} />
                  {!compact && (
                    <div className="min-w-0">
                      <p className="mb-0 text-[10px] font-semibold tracking-[0.12em] text-text-muted uppercase">
                        Zone {z.level}
                      </p>
                      <p className="mb-0 truncate font-display text-[14px] font-semibold text-text-primary">{z.name}</p>
                    </div>
                  )}
                </div>
                {!compact &&
                  (z.locked ? (
                    <p className="mb-0 flex items-center gap-1 text-[10.5px] leading-snug text-text-muted">
                      <Lock className="size-3 shrink-0" aria-hidden="true" />
                      {z.xpRequired.toLocaleString()} XP · {z.probsRequired} solves
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
            ))}

            {/* nodes */}
            {[...placed.values()].map((p) => (
              <NodeOrb
                key={p.node.id}
                p={p}
                selected={selectedId === p.node.id}
                dimmed={!!related && !related.has(p.node.id)}
                available={p.node.unlocked && !p.node.completed}
                onSelect={onSelect}
                onHover={setHovered}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
