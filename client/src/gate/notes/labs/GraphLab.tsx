/*
  Graph Playground (Discrete Mathematics, Chapter 8 Live Lab). Three tabs:

    explore  presets (K_n, K_{m,n}, cycles, wheels, Q₃, Petersen, grids, paths)
             or build your own: click empty space to add a vertex, click two
             vertices to add or remove the edge between them. Degrees, the
             degree sequence, components, cut vertices and bridges, the
             bipartite test (with an odd cycle when it fails), spanning trees,
             matching and independence numbers
    colour   greedy colouring in a chosen vertex order next to an optimal
             colouring (the chromatic number by search)
    tours    Euler circuit / trail by Hierholzer's algorithm (step through
             it) and a Hamiltonian cycle search

  All logic is in ./graphLogic.ts (tested against the Python checks in
  content/gate-notes/_checks/dm/graphlib.py).
*/
import { useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  PRESETS,
  bipartition,
  bridges,
  chromaticNumber,
  colouring,
  components,
  cutVertices,
  degreeSequence,
  degrees,
  eulerKind,
  eulerTour,
  greedyColouring,
  hamiltonianCycle,
  independenceNumber,
  matchingNumber,
  norm,
  spanningTrees,
  type Graph,
} from './graphLogic'

export type GraphTab = 'explore' | 'colour' | 'tours'
const TABS: { id: GraphTab; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'colour', label: 'Colouring' },
  { id: 'tours', label: 'Euler & Hamilton' },
]
const W = 360
const H = 300
const MAX_N = 14

function ring(n: number): [number, number][] {
  return [...Array(n).keys()].map((i) => [0.5 + 0.4 * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / n), 0.5 + 0.4 * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / n)])
}

export default function GraphLab({ tab: initial = 'explore', title }: { tab?: string; title?: string }) {
  const [tab, setTab] = useState<GraphTab>(initial === 'colour' || initial === 'tours' ? initial : 'explore')
  const [G, setG] = useState<Graph>(() => PRESETS[0]!.make())
  const uid = useId()
  const pid = useId()
  return (
    <div className="lab">
      <div className="lab-head">
        <span className="lab-kicker">Live Lab</span>
        <span className="lab-title">{title || 'Graph Playground'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Graph Playground tools">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${uid}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${uid}-panel`}
            className={cn('lab-tab', tab === t.id && 'is-on')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="lab-row">
        <label className="sr-only" htmlFor={pid}>
          Load a preset
        </label>
        <select
          id={pid}
          className="lab-select"
          value=""
          onChange={(e) => {
            const p = PRESETS.find((x) => x.id === e.target.value)
            if (p) setG(p.make())
          }}
        >
          <option value="">Load a preset…</option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button type="button" className="lab-btn" onClick={() => setG({ n: 0, edges: [], pos: [] })}>
          Clear
        </button>
      </div>
      <div className="lab-panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
        {tab === 'explore' ? <ExploreTool G={G} setG={setG} /> : tab === 'colour' ? <ColourTool G={G} /> : <TourTool G={G} />}
      </div>
    </div>
  )
}

const PAL = 6

function Drawing({
  G,
  colour,
  hl,
  hlEdges,
  onCanvas,
  onVertex,
  picked,
}: {
  G: Graph
  colour?: number[]
  hl?: Set<number>
  hlEdges?: Set<string>
  onCanvas?: (x: number, y: number) => void
  onVertex?: (v: number) => void
  picked?: number | null
}) {
  const ref = useRef<SVGSVGElement>(null)
  const pos = G.pos && G.pos.length === G.n ? G.pos : ring(G.n)
  const P = (v: number) => [pos[v]![0] * W, pos[v]![1] * H] as const
  return (
    <svg
      ref={ref}
      className="lab-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Graph with ${G.n} vertices and ${G.edges.length} edges`}
      onClick={(e) => {
        if (!onCanvas || e.target !== ref.current) return
        const r = ref.current!.getBoundingClientRect()
        onCanvas((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
      }}
    >
      {G.edges.map(([a, b]) => {
        const [x1, y1] = P(a)
        const [x2, y2] = P(b)
        return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} className={cn('gl-edge', hlEdges?.has(`${a}-${b}`) && 'is-hl')} />
      })}
      {[...Array(G.n).keys()].map((v) => {
        const [x, y] = P(v)
        return (
          <g key={v} className={cn('gl-node', colour && `grp-c${colour[v]! % PAL}`, hl?.has(v) && 'is-hl', picked === v && 'is-picked')} onClick={() => onVertex?.(v)} role={onVertex ? 'button' : undefined} aria-label={onVertex ? `Vertex ${G.labels?.[v] ?? v}` : undefined}>
            <circle cx={x} cy={y} r={12} />
            <text x={x} y={y + 4.5} textAnchor="middle" className="lab-svg-label">
              {G.labels?.[v] ?? v}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function ExploreTool({ G, setG }: { G: Graph; setG: (g: Graph) => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  const info = useMemo(() => {
    const bp = bipartition(G)
    return {
      deg: degrees(G),
      seq: degreeSequence(G),
      comps: components(G),
      cuts: cutVertices(G),
      brs: bridges(G),
      bp,
      trees: G.n && components(G).length === 1 ? spanningTrees(G) : 0,
      nu: G.edges.length <= 40 ? matchingNumber(G) : null,
      alpha: G.n <= 16 ? independenceNumber(G) : null,
    }
  }, [G])
  const pos = G.pos && G.pos.length === G.n ? G.pos : ring(G.n)
  const L = (v: number) => G.labels?.[v] ?? String(v)
  return (
    <div className="lab-grid">
      <div className="lab-col">
        <Drawing
          G={G}
          picked={picked}
          hl={info.bp[0] ? undefined : new Set(info.bp[1])}
          hlEdges={new Set(info.brs.map(([a, b]) => `${a}-${b}`))}
          onCanvas={(x, y) => {
            if (G.n >= MAX_N) return
            setG({ ...G, n: G.n + 1, pos: [...pos, [x, y]], labels: G.labels ? [...G.labels, String(G.n)] : undefined })
          }}
          onVertex={(v) => {
            if (picked === null) setPicked(v)
            else if (picked === v) setPicked(null)
            else {
              const has = G.edges.some(([a, b]) => (a === picked && b === v) || (a === v && b === picked))
              setG(norm({ ...G, pos, edges: has ? G.edges.filter(([a, b]) => !((a === picked && b === v) || (a === v && b === picked))) : [...G.edges, [picked, v]] }))
              setPicked(null)
            }
          }}
        />
        <p className="lab-hint">Click empty space to add a vertex (up to {MAX_N}); click two vertices to add or remove an edge. Bridges are drawn thick; an odd cycle is highlighted when the graph is not bipartite.</p>
      </div>
      <div className="lab-col lab-lists" aria-live="polite">
        <div>
          n = {G.n}, m = {G.edges.length}, Σ deg = {info.deg.reduce((a, b) => a + b, 0)} = 2m
        </div>
        <div>Degree sequence: ({info.seq.join(', ')})</div>
        <div>
          Components: {info.comps.length} {info.comps.length > 1 && `— ${info.comps.map((c) => `{${c.map(L).join(', ')}}`).join(' ')}`}
        </div>
        <div>Cut vertices: {info.cuts.map(L).join(', ') || 'none'}</div>
        <div>Bridges: {info.brs.map(([a, b]) => `${L(a)}–${L(b)}`).join(', ') || 'none'}</div>
        <div>{info.bp[0] ? 'Bipartite (2-colourable)' : `Not bipartite: odd cycle ${info.bp[1].map(L).join('–')}`}</div>
        <div>Spanning trees: {info.comps.length === 1 && G.n ? info.trees.toLocaleString('en-IN') : '0 (not connected)'}</div>
        {info.nu !== null && <div>Matching number ν = {info.nu} · vertex cover τ ≥ ν{info.bp[0] ? ` (= ${info.nu} by König)` : ''}</div>}
        {info.alpha !== null && <div>Independence number α = {info.alpha} · minimum vertex cover = n − α = {G.n - info.alpha}</div>}
      </div>
    </div>
  )
}

function ColourTool({ G }: { G: Graph }) {
  const [orderText, setOrderText] = useState('')
  const oid = useId()
  const order = useMemo(() => {
    const xs = orderText.split(/[\s,]+/).filter(Boolean).map(Number)
    const ok = xs.length === G.n && new Set(xs).size === G.n && xs.every((x) => Number.isInteger(x) && x >= 0 && x < G.n)
    return ok ? xs : [...Array(G.n).keys()]
  }, [orderText, G.n])
  const greedy = useMemo(() => greedyColouring(G, order), [G, order])
  const chi = useMemo(() => (G.n <= MAX_N ? chromaticNumber(G) : null), [G])
  const best = useMemo(() => (chi !== null ? colouring(G, chi) : null), [G, chi])
  const used = new Set(greedy).size
  return (
    <>
      <div className="lab-row">
        <label htmlFor={oid}>Greedy order (vertex numbers)</label>
        <input id={oid} className="lab-input tt-input" placeholder={[...Array(G.n).keys()].join(', ')} value={orderText} onChange={(e) => setOrderText(e.target.value)} />
      </div>
      <div className="lab-grid">
        <div className="lab-col">
          <Drawing G={G} colour={greedy} />
          <p className="lab-result">Greedy in this order: {used} colours</p>
        </div>
        <div className="lab-col">
          {best && <Drawing G={G} colour={best} />}
          <p className={cn('lab-result', chi === used ? 'is-good' : 'is-bad')} aria-live="polite">
            Chromatic number χ = {chi ?? '?'}
            {chi !== null && chi < used && ` — this order wastes ${used - chi}`}
          </p>
        </div>
      </div>
    </>
  )
}

function TourTool({ G }: { G: Graph }) {
  const kind = eulerKind(G)
  const tour = useMemo(() => eulerTour(G), [G])
  const ham = useMemo(() => (G.n <= MAX_N ? hamiltonianCycle(G) : null), [G])
  const [step, setStep] = useState(0)
  const s = tour ? Math.min(step, tour.length - 1) : 0
  const walked = new Set<string>()
  if (tour) for (let i = 0; i < s; i++) walked.add(tour[i]! < tour[i + 1]! ? `${tour[i]}-${tour[i + 1]}` : `${tour[i + 1]}-${tour[i]}`)
  const odd = degrees(G).filter((d) => d % 2).length
  return (
    <div className="lab-grid">
      <div className="lab-col">
        <Drawing G={G} hlEdges={walked} hl={tour ? new Set([tour[s]!]) : undefined} />
        {tour && (
          <div className="lab-row">
            <button type="button" className="lab-btn" disabled={s === 0} onClick={() => setStep(s - 1)}>
              ◀ Back
            </button>
            <button type="button" className="lab-btn lab-btn--main" disabled={s === tour.length - 1} onClick={() => setStep(s + 1)}>
              Next edge ▶
            </button>
            <span aria-live="polite">
              {s} of {tour.length - 1} edges
            </span>
          </div>
        )}
      </div>
      <div className="lab-col lab-lists" aria-live="polite">
        <div>
          Odd-degree vertices: {odd}. {kind === 'circuit' ? 'Euler circuit exists (connected, all degrees even).' : kind === 'trail' ? 'Euler trail exists (exactly two odd vertices), but no circuit.' : 'No Euler trail: more than two odd vertices, or edges in two components.'}
        </div>
        {tour && <div>Tour: {tour.map((v) => G.labels?.[v] ?? v).join(' → ')}</div>}
        <div>{ham ? `Hamiltonian cycle: ${[...ham, ham[0]!].map((v) => G.labels?.[v] ?? v).join(' → ')}` : G.n < 3 ? 'Too few vertices for a Hamiltonian cycle.' : 'No Hamiltonian cycle (exhaustive search).'}</div>
      </div>
    </div>
  )
}
