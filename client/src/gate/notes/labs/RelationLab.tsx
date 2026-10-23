/*
  Relation Lab (Discrete Mathematics, Chapter 3 Live Lab). Two tabs:

    matrix   click cells of the 0/1 matrix of a relation on up to 6 elements
             (the digraph is drawn beside it); badges show each property with
             the pair that breaks it; equivalence classes are listed when the
             relation is an equivalence; the counts of relation families on n
             elements are shown for reference
    closure  reflexive, symmetric and transitive closures; Warshall's
             algorithm one stage at a time (new pairs highlighted); R ∘ R

  All logic is in ./relLogic.ts (tested against the Python checks in
  content/gate-notes/_checks/dm/rellib.py).
*/
import { useId, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  PRESETS,
  PROPS,
  classes,
  compose,
  copy,
  counts,
  empty,
  equivalenceClosure,
  fromPairs,
  isEquivalence,
  isPartialOrder,
  reflexiveClosure,
  symmetricClosure,
  violations,
  warshall,
  type Matrix,
} from './relLogic'

export type RelTab = 'matrix' | 'closure'
const TABS: { id: RelTab; label: string }[] = [
  { id: 'matrix', label: 'Matrix & properties' },
  { id: 'closure', label: 'Closures & Warshall' },
]
const NAME = (i: number) => String(i + 1)

export default function RelationLab({ tab: initial = 'matrix', title }: { tab?: string; title?: string }) {
  const [tab, setTab] = useState<RelTab>(initial === 'closure' ? 'closure' : 'matrix')
  const [m, setM] = useState<Matrix>(() => fromPairs(PRESETS[0]!.n, PRESETS[0]!.pairs))
  const uid = useId()
  const sid = useId()
  const pid = useId()
  const n = m.length
  return (
    <div className="lab">
      <div className="lab-head">
        <span className="lab-kicker">Live Lab</span>
        <span className="lab-title">{title || 'Relation Lab'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Relation Lab tools">
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
        <label htmlFor={sid}>Elements</label>
        <select
          id={sid}
          className="lab-select"
          value={n}
          onChange={(e) => {
            const k = Number(e.target.value)
            setM(Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => m[i]?.[j] ?? false)))
          }}
        >
          {[2, 3, 4, 5, 6].map((k) => (
            <option key={k} value={k}>
              {k}: {'{'}1, …, {k}
              {'}'}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={pid}>
          Load a preset
        </label>
        <select
          id={pid}
          className="lab-select"
          value=""
          onChange={(e) => {
            const p = PRESETS.find((x) => x.id === e.target.value)
            if (p) setM(fromPairs(p.n, p.pairs))
          }}
        >
          <option value="">Load a preset…</option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button type="button" className="lab-btn" onClick={() => setM(empty(n))}>
          Clear
        </button>
      </div>
      <div className="lab-panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
        {tab === 'matrix' ? <MatrixTool m={m} setM={setM} /> : <ClosureTool m={m} />}
      </div>
    </div>
  )
}

function MatrixGrid({ m, onToggle, mark, caption }: { m: Matrix; onToggle?: (i: number, j: number) => void; mark?: (i: number, j: number) => boolean; caption: string }) {
  return (
    <div className="lab-tt-wrap">
      <table className="lab-tt">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">R</th>
            {m.map((_, j) => (
              <th key={j} scope="col">
                {NAME(j)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.map((row, i) => (
            <tr key={i}>
              <th scope="row">{NAME(i)}</th>
              {row.map((v, j) => (
                <td key={j} className={cn(mark?.(i, j) && 'rel-new')}>
                  {onToggle ? (
                    <button type="button" className={cn('lab-row-btn', v && 'is-on')} aria-pressed={v} aria-label={`${NAME(i)} R ${NAME(j)}`} onClick={() => onToggle(i, j)}>
                      {v ? 1 : 0}
                    </button>
                  ) : (
                    <span className={cn('lab-f', v && 'is-one')}>{v ? 1 : 0}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Digraph({ m }: { m: Matrix }) {
  const n = m.length
  const R = 92
  const C = 120
  const pos = (i: number) => [C + R * Math.cos((2 * Math.PI * i) / n - Math.PI / 2), C + R * Math.sin((2 * Math.PI * i) / n - Math.PI / 2)] as const
  return (
    <svg className="lab-svg" viewBox="0 0 240 240" role="img" aria-label={`Digraph of the relation on ${n} elements`}>
      <defs>
        <marker id="rel-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="rel-head" />
        </marker>
      </defs>
      {m.flatMap((row, i) =>
        row.map((v, j) => {
          if (!v) return null
          const [x1, y1] = pos(i)
          const [x2, y2] = pos(j)
          if (i === j) return <circle key={`${i}-${j}`} cx={x1 + (x1 - C) * 0.18} cy={y1 + (y1 - C) * 0.18} r={10} className="rel-loop" />
          const dx = x2 - x1
          const dy = y2 - y1
          const L = Math.hypot(dx, dy)
          const bend = m[j]![i] ? 10 : 0
          const mx = (x1 + x2) / 2 - (dy / L) * bend
          const my = (y1 + y2) / 2 + (dx / L) * bend
          const ex = x2 - (dx / L) * 14
          const ey = y2 - (dy / L) * 14
          return <path key={`${i}-${j}`} d={`M${x1 + (dx / L) * 14},${y1 + (dy / L) * 14} Q${mx},${my} ${ex},${ey}`} className="rel-edge" markerEnd="url(#rel-arrow)" />
        }),
      )}
      {m.map((_, i) => {
        const [x, y] = pos(i)
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={13} className="rel-node" />
            <text x={x} y={y + 4.5} textAnchor="middle" className="lab-svg-label">
              {NAME(i)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function MatrixTool({ m, setM }: { m: Matrix; setM: (m: Matrix) => void }) {
  const v = useMemo(() => violations(m), [m])
  const eq = isEquivalence(m)
  const po = isPartialOrder(m)
  const c = counts(m.length)
  const show = (w: number[]) => (w.length === 3 ? `(${NAME(w[0]!)}, ${NAME(w[1]!)}) and (${NAME(w[1]!)}, ${NAME(w[2]!)}) but not (${NAME(w[0]!)}, ${NAME(w[2]!)})` : `(${NAME(w[0]!)}, ${NAME(w[1]!)})`)
  return (
    <div className="lab-grid">
      <div className="lab-col">
        <MatrixGrid
          m={m}
          caption="Relation matrix: row a, column b is 1 when a R b"
          onToggle={(i, j) => {
            const x = copy(m)
            x[i]![j] = !x[i]![j]
            setM(x)
          }}
        />
        <Digraph m={m} />
      </div>
      <div className="lab-col">
        <ul className="rel-props" aria-live="polite">
          {PROPS.map((p) => (
            <li key={p} className={cn(v[p] === null ? 'is-good' : 'is-bad')}>
              <strong>{p}</strong>: {v[p] === null ? 'yes' : `no — ${p === 'reflexive' ? `${NAME(v[p]![0]!)} is not related to itself` : p === 'irreflexive' ? `${NAME(v[p]![0]!)} is related to itself` : p === 'transitive' ? show(v[p]!) : p === 'symmetric' ? `${show(v[p]!)} but not its reverse` : `${show(v[p]!)} and its reverse`}`}
            </li>
          ))}
        </ul>
        <p className="lab-result">
          {eq ? 'An equivalence relation.' : po ? 'A partial order.' : 'Neither an equivalence relation nor a partial order.'}
        </p>
        {eq && <p className="lab-lists">Classes: {classes(m).map((k) => `{${k.map(NAME).join(', ')}}`).join('  ')}</p>}
        <details className="rel-counts">
          <summary>How many relations on {m.length} elements have each property?</summary>
          <ul>
            {Object.entries(c).map(([k, x]) => (
              <li key={k}>
                {k}: {x.toLocaleString('en-IN')}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  )
}

function ClosureTool({ m }: { m: Matrix }) {
  const [kind, setKind] = useState<'reflexive' | 'symmetric' | 'transitive' | 'equivalence' | 'square'>('transitive')
  const stages = useMemo(() => warshall(m), [m])
  const [k, setK] = useState(0)
  const kk = Math.min(k, stages.length - 1)
  const result = kind === 'reflexive' ? reflexiveClosure(m) : kind === 'symmetric' ? symmetricClosure(m) : kind === 'equivalence' ? equivalenceClosure(m) : kind === 'square' ? compose(m, m) : stages[kk]!
  const before = kind === 'transitive' ? stages[Math.max(0, kk - 1)]! : m
  const added = result.flatMap((r, i) => r.flatMap((x, j) => (x && !before[i]![j] ? [`(${NAME(i)}, ${NAME(j)})`] : [])))
  return (
    <>
      <div className="lab-row" role="group" aria-label="Which closure">
        {(['reflexive', 'symmetric', 'transitive', 'equivalence', 'square'] as const).map((x) => (
          <button key={x} type="button" className={cn('lab-toggle', kind === x && 'is-on')} aria-pressed={kind === x} onClick={() => setKind(x)}>
            {x === 'square' ? 'R ∘ R' : `${x} closure`}
          </button>
        ))}
      </div>
      {kind === 'transitive' && (
        <div className="lab-row">
          <button type="button" className="lab-btn" disabled={kk === 0} onClick={() => setK(kk - 1)}>
            ◀ Back
          </button>
          <button type="button" className="lab-btn lab-btn--main" disabled={kk === stages.length - 1} onClick={() => setK(kk + 1)}>
            Next stage ▶
          </button>
          <span aria-live="polite">{kk === 0 ? 'Stage 0: the relation itself' : `Stage ${kk}: paths may pass through ${NAME(kk - 1)}`}</span>
        </div>
      )}
      <div className="lab-grid">
        <div className="lab-col">
          <MatrixGrid m={result} caption={`${kind} result`} mark={(i, j) => result[i]![j]! && !before[i]![j]} />
        </div>
        <div className="lab-col">
          <Digraph m={result} />
          <p className="lab-lists">{added.length ? `New pairs: ${added.join(', ')}` : 'No new pairs at this step.'}</p>
        </div>
      </div>
    </>
  )
}
