import './landing.css'
import { cn } from '@/lib/utils'
import { Narration, Player } from './player'
import { useStepper } from './useStepper'

/**
 * Breadth-first search from A: the graph is explored ring by ring, each
 * node stamped with its distance the moment it is first reached.
 */
const NODES: Record<string, [number, number]> = {
  A: [40, 110],
  B: [140, 50],
  C: [140, 170],
  D: [250, 20],
  E: [250, 100],
  F: [250, 190],
  G: [360, 145],
}
const EDGES: [string, string][] = [
  ['A', 'B'],
  ['A', 'C'],
  ['B', 'D'],
  ['B', 'E'],
  ['C', 'F'],
  ['E', 'G'],
  ['F', 'G'],
]
type Step = { seen: Record<string, number>; from?: string; reach: string[]; queue: string[]; text: string; done?: boolean }
const STEPS: Step[] = [
  { seen: { A: 0 }, reach: ['A'], queue: ['A'], text: 'Drop a stone at A. Distance zero. Everything else is still unknown.' },
  { seen: { A: 0, B: 1, C: 1 }, from: 'A', reach: ['B', 'C'], queue: ['B', 'C'], text: 'The first ripple: A’s neighbours, B and C, are one step away.' },
  { seen: { A: 0, B: 1, C: 1, D: 2, E: 2 }, from: 'B', reach: ['D', 'E'], queue: ['C', 'D', 'E'], text: 'From B the ripple reaches D and E. Two steps.' },
  { seen: { A: 0, B: 1, C: 1, D: 2, E: 2, F: 2 }, from: 'C', reach: ['F'], queue: ['D', 'E', 'F'], text: 'From C, only F is new. A is already known, so it is never visited twice.' },
  { seen: { A: 0, B: 1, C: 1, D: 2, E: 2, F: 2, G: 3 }, from: 'E', reach: ['G'], queue: ['F', 'G'], text: 'E reaches G at three steps. When F gets there later, G is already taken.' },
  { seen: { A: 0, B: 1, C: 1, D: 2, E: 2, F: 2, G: 3 }, reach: [], queue: [], text: 'Every node now knows its shortest distance from A. That is breadth-first search: the world, ring by ring.', done: true },
]

export function GraphPreview() {
  const stepper = useStepper(STEPS.length, { hold: 2200 })
  const s = STEPS[stepper.i]
  const hot = (a: string, b: string) => !!s.from && ((a === s.from && s.reach.includes(b)) || (b === s.from && s.reach.includes(a)))
  return (
    <Player label="A lesson playing: breadth-first search explores a graph ring by ring" stepper={stepper}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-start">
        <div className="min-w-0">
          <svg viewBox="0 0 400 220" className="lp-graph block h-auto w-full max-w-[34rem]" role="img" aria-label={`Visited so far: ${Object.keys(s.seen).join(', ')}`}>
            {EDGES.map(([a, b]) => {
              const [x1, y1] = NODES[a]
              const [x2, y2] = NODES[b]
              return <line key={a + b} x1={x1} y1={y1} x2={x2} y2={y2} className={cn('lp-edge', a in s.seen && b in s.seen && 'is-seen', hot(a, b) && 'is-hot')} />
            })}
            {Object.entries(NODES).map(([id, [x, y]]) => {
              const d = s.seen[id]
              return (
                <g key={id} className={cn('lp-node', d != null && 'is-seen', s.reach.includes(id) && 'is-new')} transform={`translate(${x} ${y})`}>
                  <circle r="18" />
                  <text dy="5" textAnchor="middle">
                    {id}
                  </text>
                  {d != null && (
                    <text className="lp-dist" y="-26" textAnchor="middle">
                      {d}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
          <Narration>{s.text}</Narration>
        </div>
        <div>
          <p className="ed-label ed-muted">Queue</p>
          <p className="ed-mono mt-3 min-h-6 text-[13px]">{s.queue.length ? s.queue.join('  ·  ') : 'empty'}</p>
          <p className="ed-label ed-muted mt-6">Distance from A</p>
          <ul className="mt-3 grid list-none grid-cols-4 gap-2 p-0">
            {Object.keys(NODES).map((id) => (
              <li key={id} className="ed-mono text-[13px]">
                <span className="ed-muted">{id}</span> {s.seen[id] ?? '–'}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Player>
  )
}
