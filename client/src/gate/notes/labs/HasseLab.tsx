/*
  Hasse Lab (Discrete Mathematics, Chapter 4 Live Lab). Two tabs:

    diagram  pick a poset (divisors of n, subsets of a small set, or pairs such
             as "a<b, b<c"); the Hasse diagram is drawn by levels; minimal,
             maximal, least and greatest elements are marked; click two
             elements to see their upper and lower bounds, lub and glb; the
             height, width and number of linear extensions are shown
    lattice  is it a lattice (or which pair has no lub/glb)? distributive (or
             the triple that breaks the law)? the complements of every element,
             and the verdict complemented / Boolean

  All logic is in ./orderLogic.ts (tested against the Python checks in
  content/gate-notes/_checks/dm/orderlib.py).
*/
import { useId, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  PRESETS,
  analyse,
  complements,
  covers,
  distributiveFailure,
  fromPreset,
  glb,
  greatest,
  heightWidth,
  latticeFailure,
  least,
  levels,
  linearExtensions,
  lowerBounds,
  lub,
  maximal,
  minimal,
  upperBounds,
  type Poset,
} from './orderLogic'

export type HasseTab = 'diagram' | 'lattice'
const TABS: { id: HasseTab; label: string }[] = [
  { id: 'diagram', label: 'Hasse diagram' },
  { id: 'lattice', label: 'Lattice tests' },
]

function load(src: string): { P: Poset | null; err: string | null } {
  try {
    if (/^div:\d+$/.test(src) && Number(src.slice(4)) > 360) return { P: null, err: 'Use n ≤ 360' }
    if (/^sub:\d+$/.test(src) && Number(src.slice(4)) > 4) return { P: null, err: 'Use at most 4 elements' }
    return { P: fromPreset(src), err: null }
  } catch (e) {
    return { P: null, err: (e as Error).message }
  }
}

export default function HasseLab({ tab: initial = 'diagram', title }: { tab?: string; title?: string }) {
  const [tab, setTab] = useState<HasseTab>(initial === 'lattice' ? 'lattice' : 'diagram')
  const [src, setSrc] = useState(PRESETS[0]!.src)
  const [pick, setPick] = useState<number[]>([])
  const uid = useId()
  const pid = useId()
  const fid = useId()
  const { P, err } = useMemo(() => load(src), [src])
  return (
    <div className="lab">
      <div className="lab-head">
        <span className="lab-kicker">Live Lab</span>
        <span className="lab-title">{title || 'Hasse Lab'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Hasse Lab tools">
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
            if (p) {
              setSrc(p.src)
              setPick([])
            }
          }}
        >
          <option value="">Load a preset…</option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <label htmlFor={fid}>Poset</label>
        <input
          id={fid}
          className="lab-input tt-input"
          value={src}
          spellCheck={false}
          onChange={(e) => {
            setSrc(e.target.value)
            setPick([])
          }}
        />
      </div>
      <p className="lab-hint">Write div:36 for the divisors of 36, sub:3 for the subsets of {'{1, 2, 3}'}, or pairs such as a&lt;b, b&lt;c, a&lt;d (the order is their transitive closure).</p>
      {err && <p className="lab-warn">{err}</p>}
      {P && (
        <div className="lab-panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
          {tab === 'diagram' ? <DiagramTool P={P} pick={pick} setPick={setPick} /> : <LatticeTool P={P} />}
        </div>
      )}
    </div>
  )
}

function Hasse({ P, marks, onPick }: { P: Poset; marks: (i: number) => string | undefined; onPick?: (i: number) => void }) {
  const lv = levels(P)
  const top = Math.max(...lv)
  const rows = [...Array(top + 1).keys()].map((r) => P.labels.map((_, i) => i).filter((i) => lv[i] === r))
  const W = 360
  const H = 70 + top * 70
  const pos: [number, number][] = []
  rows.forEach((row, r) => row.forEach((i, k) => (pos[i] = [((k + 1) * W) / (row.length + 1), H - 30 - r * 70])))
  return (
    <svg className="lab-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Hasse diagram with ${P.labels.length} elements`}>
      {covers(P).map(([a, b]) => (
        <line key={`${a}-${b}`} x1={pos[a]![0]} y1={pos[a]![1]} x2={pos[b]![0]} y2={pos[b]![1]} className="rel-edge" />
      ))}
      {P.labels.map((l, i) => (
        <g key={i} className={cn('hasse-node', marks(i))} onClick={() => onPick?.(i)} role={onPick ? 'button' : undefined} aria-label={onPick ? `Select ${l}` : undefined}>
          <circle cx={pos[i]![0]} cy={pos[i]![1]} r={Math.max(14, 4 + 4 * l.length)} className="rel-node" />
          <text x={pos[i]![0]} y={pos[i]![1] + 4.5} textAnchor="middle" className="lab-svg-label">
            {l}
          </text>
        </g>
      ))}
    </svg>
  )
}

function DiagramTool({ P, pick, setPick }: { P: Poset; pick: number[]; setPick: (p: number[]) => void }) {
  const L = (xs: number[]) => (xs.length ? xs.map((i) => P.labels[i]).join(', ') : 'none')
  const one = (x: number | null) => (x === null ? 'none' : P.labels[x])
  const hw = useMemo(() => heightWidth(P), [P])
  const ext = useMemo(() => linearExtensions(P), [P])
  const [a, b] = pick
  const ub = a !== undefined && b !== undefined ? upperBounds(P, [a, b]) : []
  const lb = a !== undefined && b !== undefined ? lowerBounds(P, [a, b]) : []
  return (
    <div className="lab-grid">
      <div className="lab-col">
        <Hasse
          P={P}
          marks={(i) => (pick.includes(i) ? 'is-picked' : ub.includes(i) ? 'is-upper' : lb.includes(i) ? 'is-lower' : undefined)}
          onPick={(i) => setPick(pick.length >= 2 ? [i] : pick.includes(i) ? pick.filter((x) => x !== i) : [...pick, i])}
        />
        <div className="lab-row" role="group" aria-label="Select two elements">
          {P.labels.map((l, i) => (
            <button key={i} type="button" className={cn('lab-toggle', pick.includes(i) && 'is-on')} aria-pressed={pick.includes(i)} onClick={() => setPick(pick.length >= 2 ? [i] : pick.includes(i) ? pick.filter((x) => x !== i) : [...pick, i])}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="lab-col lab-lists">
        <div>Minimal: {L(minimal(P))} · Maximal: {L(maximal(P))}</div>
        <div>
          Least: {one(least(P))} · Greatest: {one(greatest(P))}
        </div>
        <div>
          Longest chain: {hw.height} elements · Largest antichain: {hw.width} elements
        </div>
        <div>Linear extensions (topological orders): {ext.toLocaleString('en-IN')}</div>
        <div aria-live="polite">
          {a !== undefined && b !== undefined ? (
            <>
              <div>
                Upper bounds of {P.labels[a]}, {P.labels[b]}: {L(ub)} → lub = {one(lub(P, a, b))}
              </div>
              <div>
                Lower bounds: {L(lb)} → glb = {one(glb(P, a, b))}
              </div>
            </>
          ) : (
            'Select two elements to see their bounds.'
          )}
        </div>
      </div>
    </div>
  )
}

function LatticeTool({ P }: { P: Poset }) {
  const an = useMemo(() => analyse(P), [P])
  const lf = latticeFailure(P)
  const df = an.lattice ? distributiveFailure(P) : null
  const N = (i: number) => P.labels[i]
  return (
    <div className="lab-grid">
      <div className="lab-col">
        <Hasse P={P} marks={(i) => (lf && (lf[1] === i || lf[2] === i) ? 'is-picked' : df && df.includes(i) ? 'is-upper' : undefined)} />
      </div>
      <div className="lab-col">
        <ul className="rel-props" aria-live="polite">
          <li className={an.lattice ? 'is-good' : 'is-bad'}>
            <strong>lattice</strong>: {an.lattice ? 'yes' : `no — ${N(lf![1])} and ${N(lf![2])} have no ${lf![0] === 'join' ? 'least upper bound' : 'greatest lower bound'}`}
          </li>
          {an.lattice && (
            <li className={an.distributive ? 'is-good' : 'is-bad'}>
              <strong>distributive</strong>: {an.distributive ? 'yes' : `no — a = ${N(df![0])}, b = ${N(df![1])}, c = ${N(df![2])}: a ∧ (b ∨ c) ≠ (a ∧ b) ∨ (a ∧ c)`}
            </li>
          )}
          {an.lattice && (
            <li className={an.complemented ? 'is-good' : 'is-bad'}>
              <strong>complemented</strong>: {an.complemented ? 'yes' : 'no'}
            </li>
          )}
          {an.lattice && (
            <li className={an.boolean ? 'is-good' : 'is-bad'}>
              <strong>Boolean</strong>: {an.boolean ? 'yes (distributive and complemented)' : 'no'}
            </li>
          )}
        </ul>
        {an.lattice && least(P) !== null && greatest(P) !== null && (
          <div className="lab-tt-wrap">
            <table className="lab-tt">
              <caption className="sr-only">Complements of each element</caption>
              <thead>
                <tr>
                  <th scope="col">element</th>
                  <th scope="col">complements</th>
                </tr>
              </thead>
              <tbody>
                {P.labels.map((l, i) => (
                  <tr key={i}>
                    <th scope="row">{l}</th>
                    <td>{complements(P, i).map(N).join(', ') || 'none'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
