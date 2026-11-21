import { useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import type { WebCluster, WebStream } from './types'
import { ConstellationGlyph } from './AtlasIndex'
import { subjectLinks, tally, type StarKey } from './atlas-data'
import './atlas.css'

/*
 * The Atlas sky map (journal style): one plate of every subject. Streams
 * are regions with dashed boundaries, like constellation borders on an old
 * star atlas; each subject is its own small constellation (you at the
 * centre, a ring per zone, a star per skill, sized by how much builds on
 * it); fine curves join subjects that depend on each other. Hover or focus
 * a subject: what it needs and what it unlocks draw in clay, the rest
 * steps back, and a plate says where it stands. Click opens the subject.
 */

const W = 1200
const PAD = 8
const CELL_H = 158
const HEAD = 64
const GAP = 28
/** Subjects per row in a stream's band. */
const PER_ROW = 8
const CELL_W = (W - PAD * 2) / PER_ROW

interface Place {
  c: WebCluster
  x: number
  y: number
  r: number
}

function wrap(name: string, max = 15): string[] {
  if (name.length <= max) return [name]
  const cut = name.lastIndexOf(' ', max)
  if (cut < 6) return [`${name.slice(0, max - 1)}…`]
  const rest = name.slice(cut + 1)
  return [name.slice(0, cut), rest.length > max ? `${rest.slice(0, max - 1)}…` : rest]
}

export function SkyMap({
  clusters,
  streams,
  deps,
  nextKey,
  onOpen,
  ready,
}: {
  clusters: WebCluster[]
  streams: WebStream[]
  deps: Map<StarKey, number>
  nextKey: string | null
  onOpen: (id: string) => void
  /** Subjects with lessons written (marked with a small book). */
  ready?: Set<string>
}) {
  const still = useReducedMotion()
  const [hot, setHot] = useState<string | null>(null)

  // Each stream is a band across the whole plate: a ruled heading with its
  // progress, then its subjects in rows of eight.
  const { regions, places, H } = useMemo(() => {
    const maxStars = Math.max(1, ...clusters.map((c) => c.nodes.length))
    const regions: { st: WebStream; x: number; y: number; w: number; h: number; lit: number; all: number }[] = []
    const places = new Map<string, Place>()
    let y = PAD
    for (const st of [...streams].sort((a, b) => a.order - b.order)) {
      const list = clusters.filter((c) => c.stream === st.id).sort((a, b) => a.order - b.order)
      if (!list.length) continue
      const rows = Math.ceil(list.length / PER_ROW)
      const h = HEAD + rows * CELL_H
      const x = PAD
      const w = W - PAD * 2
      let lit = 0
      let all = 0
      list.forEach((c, i) => {
        const t = tally(c)
        lit += t.mastered
        all += t.total
        const row = Math.floor(i / PER_ROW)
        const colIn = i % PER_ROW
        places.set(c.id, { c, x: x + colIn * CELL_W + CELL_W / 2, y: y + HEAD + row * CELL_H + 46, r: 28 + 12 * Math.sqrt(c.nodes.length / maxStars) })
      })
      regions.push({ st, x, y, w, h, lit, all })
      y += h + GAP
    }
    return { regions, places, H: y - GAP + PAD }
  }, [clusters, streams])

  const links = useMemo(() => subjectLinks(clusters).filter((l) => places.has(l.from) && places.has(l.to)), [clusters, places])
  const maxN = Math.max(1, ...links.map((l) => l.n))
  const nextSubject = nextKey?.split(':')[0] ?? null
  const nextName = useMemo(() => {
    if (!nextKey) return null
    const [sid, ...rest] = nextKey.split(':')
    return clusters.find((c) => c.id === sid)?.nodes.find((n) => n.id === rest.join(':'))?.n ?? null
  }, [clusters, nextKey])

  const curve = (a: Place, b: Place) => {
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const dx = b.x - a.x
    const dy = b.y - a.y
    const bow = 0.18
    return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${(mx - dy * bow).toFixed(1)} ${(my + dx * bow).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
  }

  const hotPlace = hot ? places.get(hot) : null
  const needs = hot ? links.filter((l) => l.to === hot).sort((a, b) => b.n - a.n) : []
  const unlocks = hot ? links.filter((l) => l.from === hot).sort((a, b) => b.n - a.n) : []
  const nameOf = (id: string) => places.get(id)?.c.name ?? id
  const nextInHot = hotPlace ? hotPlace.c.nodes.filter((n) => n.s === 1).sort((a, b) => a.z - b.z || b.p - a.p)[0] : null

  return (
    <div className="ax-sky">
      <div className="ax-sky-scroll" tabIndex={0} role="group" aria-label="The sky map. Each subject is a constellation; tab through them, press Enter to open one.">
        <div className="ax-sky-plate">
          <svg viewBox={`0 0 ${W} ${H}`} className="ax-sky-svg">
            <defs>
              <marker id="ax-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0L8 4L0 8Z" className="ax-arrow" />
              </marker>
            </defs>
            {regions.map((r) => (
              <g key={r.st.id}>
                <line x1={r.x} x2={r.x + r.w} y1={r.y} y2={r.y} className="ax-band-rule" />
                <line x1={r.x} x2={r.x + (r.w * r.lit) / Math.max(1, r.all)} y1={r.y} y2={r.y} className="ax-band-lit" />
                <text x={r.x} y={r.y + 30} className="ax-region-name">
                  {r.st.name.toUpperCase()}
                </text>
                <text x={r.x + r.w} y={r.y + 30} textAnchor="end" className="ax-region-count">
                  {r.lit} of {r.all} lit · {Math.round((r.lit / Math.max(1, r.all)) * 100)}%
                </text>
              </g>
            ))}
            {hot && (
              <g key={hot} className={cn('ax-hot', !still && 'is-drawing')}>
                {[...needs, ...unlocks].map((l) => (
                  <path key={`${l.from}>${l.to}`} d={curve(places.get(l.from)!, places.get(l.to)!)} pathLength={1} className={cn('ax-link-hot', l.to === hot ? 'is-need' : 'is-unlock')} markerEnd="url(#ax-arrow)" style={{ strokeWidth: 1 + 1.6 * (l.n / maxN) }} />
                ))}
              </g>
            )}
            {[...places.values()].map((p) => {
              const t = tally(p.c)
              const lines = wrap(p.c.name)
              const on = hot === p.c.id
              const linked = hot && (needs.some((l) => l.from === p.c.id) || unlocks.some((l) => l.to === p.c.id))
              return (
                <a
                  key={p.c.id}
                  href={`/learn/${p.c.id}`}
                  className={cn('ax-sub', on && 'is-on', linked && 'is-linked')}
                  aria-label={`${lines.join(' ')} ${t.mastered}/${t.total}${ready?.has(p.c.id) ? ' · lessons' : ''} — stars lit${ready?.has(p.c.id) ? ', lessons ready' : ''}${lines.join(' ') !== p.c.name ? ` (${p.c.name})` : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    onOpen(p.c.id)
                  }}
                  onMouseEnter={() => setHot(p.c.id)}
                  onMouseLeave={() => setHot((h) => (h === p.c.id ? null : h))}
                  onFocus={() => setHot(p.c.id)}
                  onBlur={() => setHot((h) => (h === p.c.id ? null : h))}
                >
                  <circle cx={p.x} cy={p.y} r={p.r + 8} className="ax-sub-hit" />
                  {nextSubject === p.c.id && <circle cx={p.x} cy={p.y} r={p.r + 9} className="ax-you" />}
                  {/* How much of it is lit: an arc round the constellation. */}
                  <circle cx={p.x} cy={p.y} r={p.r + 4} className="ax-sub-track" />
                  {t.pct > 0 && (
                    <circle cx={p.x} cy={p.y} r={p.r + 4} className="ax-sub-arc" pathLength={100} strokeDasharray={`${t.pct} 100`} transform={`rotate(-90 ${p.x} ${p.y})`} />
                  )}
                  <ConstellationGlyph c={p.c} deps={deps} x={p.x - p.r} y={p.y - p.r} draw={p.r * 2} />
                  <text textAnchor="middle">
                    {lines.map((ln, i) => (
                      <tspan key={i} x={p.x} y={p.y + 50 + 9 + i * 15} className="ax-sub-name">
                        {`${ln} `}
                      </tspan>
                    ))}
                    <tspan x={p.x} y={p.y + 50 + 9 + lines.length * 15 + 1} className="ax-sub-meta">
                      {`${t.mastered}/${t.total}`}
                    </tspan>
                    {ready?.has(p.c.id) && (
                      <tspan className="ax-sub-ready" dx="6">
                        · lessons
                      </tspan>
                    )}
                  </text>
                </a>
              )
            })}
          </svg>
          {hotPlace && (
            <div className="nx-plate ax-sky-plate-card" style={{ left: `${((hotPlace.x + (hotPlace.x > W - 300 ? -hotPlace.r - 250 : hotPlace.r + 22)) / W) * 100}%`, top: `${(Math.max(0, hotPlace.y - 60) / H) * 100}%` }} aria-hidden="true">
              <p className="nx-plate-kicker">{streams.find((s) => s.id === hotPlace.c.stream)?.name ?? ''}</p>
              <p className="nx-plate-title">{hotPlace.c.name}</p>
              <p className="nx-plate-state">
                {tally(hotPlace.c).mastered} of {tally(hotPlace.c).total} stars lit · {tally(hotPlace.c).pct}%
              </p>
              {nextInHot && (
                <p className="nx-plate-figs">
                  <span>next: {nextInHot.n}</span>
                </p>
              )}
              {needs.length > 0 && <p className="nx-plate-figs">needs {needs.slice(0, 3).map((l) => nameOf(l.from)).join(', ')}{needs.length > 3 ? ` +${needs.length - 3}` : ''}</p>}
              {unlocks.length > 0 && <p className="nx-plate-figs">unlocks {unlocks.slice(0, 3).map((l) => nameOf(l.to)).join(', ')}{unlocks.length > 3 ? ` +${unlocks.length - 3}` : ''}</p>}
              <p className="nx-plate-hint">Click to open {hotPlace.c.short || hotPlace.c.name}</p>
            </div>
          )}
        </div>
      </div>
      {nextName && (
        <p className="ax-legend">
          <span>
            <span className="ax-you-key" aria-hidden="true" />
            you are here: your next star is <em className="font-serif not-italic">{nextName}</em>
          </span>
        </p>
      )}
    </div>
  )
}
