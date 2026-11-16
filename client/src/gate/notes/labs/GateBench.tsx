/*
  Gate Bench (Digital Logic, Chapter 2 Live Lab). Three tabs:

    bench      add gates, wire each input from a menu of earlier signals,
               toggle the inputs; the circuit, the live wire values and the
               truth table (with Σ / Π lists) update together
    challenge  build a target function from NAND only or NOR only; Check
               compares truth tables and the gate count with the proven minimum
    sets       minterm-set calculator: f·g = ∩, f + g = ∪, f ⊕ g = Δ, f′

  All logic is in ./benchLogic.ts (tested against the Python checks). The
  circuit is drawn with the Viz engine's gate geometry, so symbols match the
  lesson figures.
*/
import { useId, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { gateShape, type GateKind } from '@/viz/geometry'
import {
  CHALLENGES,
  GATE_TYPES,
  PRESETS,
  arity,
  benchErrors,
  checkChallenge,
  evaluate,
  formatPi,
  formatSigma,
  levels,
  maxterms,
  minterms,
  nextGateId,
  parseIndexList,
  removeGate,
  rowValues,
  setOps,
  truthTable,
  type Bench,
  type ChallengeResult,
  type GateType,
} from './benchLogic'
import { Select } from '@/components/ui'

export type GateBenchTab = 'bench' | 'challenge' | 'sets'

const TABS: { id: GateBenchTab; label: string }[] = [
  { id: 'bench', label: 'Bench' },
  { id: 'challenge', label: 'NAND / NOR challenge' },
  { id: 'sets', label: 'Minterm sets' },
]

export default function GateBench({ tab: initial = 'bench', title }: { tab?: GateBenchTab; title?: string }) {
  const [tab, setTab] = useState<GateBenchTab>(initial)
  const uid = useId()
  return (
    <div className="lab">
      <div className="lab-head">
        <span className="lab-kicker">Live Lab</span>
        <span className="lab-title">{title || 'Gate Bench'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Gate Bench tools">
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
      <div className="lab-panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
        {tab === 'bench' && <BenchTool />}
        {tab === 'challenge' && <ChallengeTool />}
        {tab === 'sets' && <SetsTool />}
      </div>
    </div>
  )
}

/* ── Shared: the editable bench ─────────────────────────────────────── */

function useBench(initial: Bench) {
  const [bench, setBench] = useState<Bench>(initial)
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(initial.inputs.map((i) => [i, 0])))
  const load = (b: Bench) => {
    setBench(b)
    setValues(Object.fromEntries(b.inputs.map((i) => [i, 0])))
  }
  return { bench, setBench, values, setValues, load }
}

function GateEditor({ bench, setBench, palette }: { bench: Bench; setBench: (b: Bench) => void; palette: GateType[] }) {
  const u = useId()
  const add = (type: GateType) => {
    const id = nextGateId(bench)
    const signals = [...bench.inputs, ...bench.gates.map((g) => g.id)]
    const last = signals[signals.length - 1]!
    const ins = arity(type) === 1 ? [last] : [signals[Math.max(0, signals.length - 2)]!, last]
    setBench({ ...bench, gates: [...bench.gates, { id, type, in: ins }], output: id })
  }
  const update = (i: number, patch: Partial<{ type: GateType; in: string[] }>) => {
    const gates = bench.gates.map((g, k) => {
      if (k !== i) return g
      const type = patch.type ?? g.type
      let ins = patch.in ?? g.in
      if (arity(type) !== ins.length) ins = arity(type) === 1 ? [ins[0]!] : [ins[0]!, ins[1] ?? ins[0]!]
      return { ...g, type, in: ins }
    })
    setBench({ ...bench, gates })
  }
  return (
    <div className="lab-editor">
      <div className="lab-palette" aria-label="Add a gate">
        {palette.map((t) => (
          <button key={t} type="button" className="lab-btn" onClick={() => add(t)} disabled={bench.gates.length >= 12}>
            + {t}
          </button>
        ))}
      </div>
      {bench.gates.length === 0 && <p className="lab-hint">Add a gate, then choose what feeds each of its inputs.</p>}
      <ol className="lab-gates">
        {bench.gates.map((g, i) => {
          const earlier = [...bench.inputs, ...bench.gates.slice(0, i).map((x) => x.id)]
          return (
            <li key={g.id} className="lab-gate-row">
              <span className="lab-gate-id">{g.id}</span>
              <label className="sr-only" htmlFor={`${u}-${g.id}-type`}>
                Type of {g.id}
              </label>
              <Select id={`${u}-${g.id}-type`} className="lab-select" value={g.type} onChange={(e) => update(i, { type: e.target.value as GateType })}>
                {palette.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
              <span className="lab-of">of</span>
              {g.in.map((s, k) => (
                <span key={k}>
                  <label className="sr-only" htmlFor={`${u}-${g.id}-in${k}`}>
                    Input {k + 1} of {g.id}
                  </label>
                  <Select
                    id={`${u}-${g.id}-in${k}`}
                    className="lab-select"
                    value={s}
                    onChange={(e) => update(i, { in: g.in.map((x, j) => (j === k ? e.target.value : x)) })}
                  >
                    {earlier.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </Select>
                </span>
              ))}
              <button type="button" className="lab-x" aria-label={`Remove ${g.id}`} onClick={() => setBench(removeGate(bench, g.id))}>
                ×
              </button>
            </li>
          )
        })}
      </ol>
      {bench.gates.length > 0 && (
        <div className="lab-out">
          <label htmlFor={`${u}-out`}>Output F =</label>
          <Select id={`${u}-out`} className="lab-select" value={bench.output} onChange={(e) => setBench({ ...bench, output: e.target.value })}>
            {[...bench.inputs, ...bench.gates.map((g) => g.id)].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  )
}

function InputToggles({ inputs, values, setValues }: { inputs: string[]; values: Record<string, number>; setValues: (v: Record<string, number>) => void }) {
  return (
    <div className="lab-inputs" aria-label="Input values">
      {inputs.map((i) => (
        <button
          key={i}
          type="button"
          className={cn('lab-toggle', values[i] && 'is-on')}
          aria-pressed={!!values[i]}
          onClick={() => setValues({ ...values, [i]: values[i] ? 0 : 1 })}
        >
          {i} = {values[i] ? 1 : 0}
        </button>
      ))}
    </div>
  )
}

const KIND: Record<GateType, GateKind> = { AND: 'and', OR: 'or', NOT: 'not', BUF: 'buf', NAND: 'nand', NOR: 'nor', XOR: 'xor', XNOR: 'xnor' }

/** The circuit drawn by levels, with every wire coloured by its current value. */
function CircuitView({ bench, values }: { bench: Bench; values: Record<string, number> }) {
  const lv = levels(bench)
  const v = evaluate(bench, values)
  const maxL = Math.max(1, ...bench.gates.map((g) => lv.get(g.id)!))
  const GW = 54
  const GH = 38
  const colX = (l: number) => 34 + l * 108
  const rowsPer = new Map<number, number>()
  const pos = new Map<string, { x: number; y: number }>()
  bench.inputs.forEach((name, k) => pos.set(name, { x: colX(0), y: 30 + k * 56 }))
  for (const g of bench.gates) {
    const l = lv.get(g.id)!
    const k = rowsPer.get(l) ?? 0
    rowsPer.set(l, k + 1)
    pos.set(g.id, { x: colX(l) - 30, y: 30 + k * 62 })
  }
  // A floor on the canvas keeps an empty or tiny bench from being scaled up to giant symbols.
  const height = Math.max(170, Math.max(...[...pos.values()].map((p) => p.y)) + 50)
  const width = Math.max(460, colX(maxL) + 120)
  const outPoint = (s: string): [number, number] => {
    const p = pos.get(s)!
    const g = bench.gates.find((x) => x.id === s)
    if (!g) return [p.x + 10, p.y]
    return gateShape(KIND[g.type], p.x, p.y - GH / 2, GW, GH, arity(g.type)).out
  }
  const tone = (s: string) => (v.get(s) ? 'is-one' : 'is-zero')
  const outSig = bench.output
  const [ox, oy] = pos.has(outSig) ? outPoint(outSig) : [0, 0]
  return (
    <svg className="lab-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Circuit with ${bench.gates.length} gates; output F = ${v.get(outSig) ?? 0}`}>
      {bench.gates.map((g) => {
        const p = pos.get(g.id)!
        const sh = gateShape(KIND[g.type], p.x, p.y - GH / 2, GW, GH, arity(g.type))
        return g.in.map((s, k) => {
          const [ax, ay] = outPoint(s)
          const [bx, by] = sh.pins[k]!
          const mx = Math.max(ax + 8, bx - 14 - k * 5)
          return <path key={`${g.id}-${k}`} d={`M${ax} ${ay} H${mx} V${by} H${bx}`} className={cn('lab-wire', tone(s))} />
        })
      })}
      {pos.has(outSig) && (
        <g>
          <path d={`M${ox} ${oy} H${width - 46}`} className={cn('lab-wire', tone(outSig))} />
          <text x={width - 40} y={oy + 5} className="lab-svg-label">
            F = {v.get(outSig) ?? 0}
          </text>
        </g>
      )}
      {bench.inputs.map((name) => {
        const p = pos.get(name)!
        return (
          <g key={name}>
            <text x={p.x - 12} y={p.y + 5} textAnchor="end" className="lab-svg-label">
              {name}
            </text>
            <circle cx={p.x + 4} cy={p.y} r={5} className={cn('lab-dot', tone(name))} />
            <text x={p.x + 4} y={p.y - 10} textAnchor="middle" className="lab-svg-val">
              {v.get(name)}
            </text>
          </g>
        )
      })}
      {bench.gates.map((g) => {
        const p = pos.get(g.id)!
        const sh = gateShape(KIND[g.type], p.x, p.y - GH / 2, GW, GH, arity(g.type))
        return (
          <g key={g.id} className={cn('lab-gate', tone(g.id))}>
            <path d={sh.body} />
            {sh.extra && <path d={sh.extra} fill="none" />}
            {sh.outBubble && <circle cx={sh.outBubble.cx} cy={sh.outBubble.cy} r={sh.outBubble.r} />}
            <text x={p.x + (arity(g.type) === 1 ? 14 : 20)} y={p.y + 4} textAnchor="middle" className="lab-svg-small">
              {g.id}
            </text>
            <text x={sh.out[0] + 4} y={p.y - 9} className="lab-svg-val">
              {v.get(g.id)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function TruthTable({ bench, values, onPick }: { bench: Bench; values: Record<string, number>; onPick: (r: number) => void }) {
  const col = truthTable(bench)
  const n = bench.inputs.length
  const current = bench.inputs.reduce((acc, i) => acc * 2 + (values[i] ? 1 : 0), 0)
  return (
    <div className="lab-tt-wrap" tabIndex={0} role="group" aria-label="Table, scrolls sideways">
      <table className="lab-tt">
        <caption className="sr-only">Truth table of F; select a row to set the inputs</caption>
        <thead>
          <tr>
            <th scope="col">row</th>
            {bench.inputs.map((i) => (
              <th key={i} scope="col">
                {i}
              </th>
            ))}
            <th scope="col">F</th>
          </tr>
        </thead>
        <tbody>
          {col.map((f, r) => (
            <tr key={r} className={cn(r === current && 'is-current')}>
              <td>
                <button type="button" className="lab-row-btn" onClick={() => onPick(r)} aria-label={`Set inputs to row ${r}`}>
                  {r}
                </button>
              </td>
              {bench.inputs.map((_, k) => (
                <td key={k}>{(r >> (n - 1 - k)) & 1}</td>
              ))}
              <td className={cn('lab-f', f && 'is-one')}>{f}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="lab-lists">
        F = {formatSigma(minterms(col))} = {formatPi(maxterms(col))}
      </p>
    </div>
  )
}

/* ── Tab 1: bench ───────────────────────────────────────────────────── */

function BenchTool() {
  const empty = (inputs: string[]): Bench => ({ inputs, gates: [], output: inputs[0]! })
  const { bench, setBench, values, setValues, load } = useBench(PRESETS[0]!.bench)
  const u = useId()
  const errs = benchErrors(bench)
  return (
    <div className="lab-grid">
      <div className="lab-col">
        <div className="lab-row">
          <label htmlFor={`${u}-preset`}>Start from</label>
          <Select
            id={`${u}-preset`}
            className="lab-select"
            defaultValue={PRESETS[0]!.id}
            onChange={(e) => {
              const p = PRESETS.find((x) => x.id === e.target.value)
              load(p ? p.bench : empty(e.target.value === 'empty3' ? ['A', 'B', 'C'] : ['A', 'B']))
            }}
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="empty2">Empty bench, inputs A, B</option>
            <option value="empty3">Empty bench, inputs A, B, C</option>
          </Select>
        </div>
        <InputToggles inputs={bench.inputs} values={values} setValues={setValues} />
        <GateEditor bench={bench} setBench={setBench} palette={GATE_TYPES} />
        {errs.length > 0 && (
          <p className="lab-warn" role="status">
            {errs[0]}
          </p>
        )}
      </div>
      <div className="lab-col">
        <CircuitView bench={bench} values={values} />
        <TruthTable bench={bench} values={values} onPick={(r) => setValues(rowValues(bench.inputs, r))} />
      </div>
    </div>
  )
}

/* ── Tab 2: NAND-only / NOR-only challenge ──────────────────────────── */

function ChallengeTool() {
  const [cid, setCid] = useState(CHALLENGES[5]!.id)
  const [family, setFamily] = useState<'NAND' | 'NOR'>('NAND')
  const c = CHALLENGES.find((x) => x.id === cid)!
  const fresh = (inputs: string[]): Bench => ({ inputs, gates: [], output: inputs[0]! })
  const { bench, setBench, values, setValues, load } = useBench(fresh(c.inputs))
  const [result, setResult] = useState<ChallengeResult | null>(null)
  const u = useId()
  const restart = (id: string, fam: 'NAND' | 'NOR') => {
    const next = CHALLENGES.find((x) => x.id === id)!
    setCid(id)
    setFamily(fam)
    load(fresh(next.inputs))
    setResult(null)
  }
  const target = useMemo(() => formatSigma(minterms(c.table)), [c])
  return (
    <div className="lab-grid">
      <div className="lab-col">
        <div className="lab-row">
          <label htmlFor={`${u}-target`}>Build</label>
          <Select id={`${u}-target`} className="lab-select" value={cid} onChange={(e) => restart(e.target.value, family)}>
            {CHALLENGES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </Select>
          <label htmlFor={`${u}-family`}>using only</label>
          <Select id={`${u}-family`} className="lab-select" value={family} onChange={(e) => restart(cid, e.target.value as 'NAND' | 'NOR')}>
            <option value="NAND">2-input NAND</option>
            <option value="NOR">2-input NOR</option>
          </Select>
        </div>
        <p className="lab-hint">
          Target: {c.label} = {target}. Tie both inputs of a gate to one signal to make an inverter.
        </p>
        <InputToggles inputs={bench.inputs} values={values} setValues={setValues} />
        <GateEditor
          bench={bench}
          setBench={(b) => {
            setBench(b)
            setResult(null)
          }}
          palette={[family]}
        />
        <div className="lab-row">
          <button type="button" className="lab-btn lab-btn--main" onClick={() => setResult(checkChallenge(bench, c, family))} disabled={!bench.gates.length}>
            Check
          </button>
        </div>
        <p className={cn('lab-result', result && (result.match ? 'is-good' : 'is-bad'))} role="status" aria-live="polite">
          {result &&
            (!result.match
              ? `Not yet: F differs from ${c.label} on input row${result.wrongRows.length === 1 ? '' : 's'} ${result.wrongRows.join(', ')}.`
              : result.count === result.min
                ? `It works with ${result.count} ${family} gate${result.count === 1 ? '' : 's'}, which is the minimum.`
                : `It works with ${result.count} gates. The proven minimum is ${result.min}: can you save ${result.count - result.min}?`)}
        </p>
      </div>
      <div className="lab-col">
        <CircuitView bench={bench} values={values} />
        <TruthTable bench={bench} values={values} onPick={(r) => setValues(rowValues(bench.inputs, r))} />
      </div>
    </div>
  )
}

/* ── Tab 3: minterm sets ────────────────────────────────────────────── */

function SetsTool() {
  const [n, setN] = useState(3)
  const u = useId()
  const [fText, setF] = useState('1, 3, 5, 7')
  const [gText, setG] = useState('3, 6, 7')
  const f = parseIndexList(fText, n)
  const g = parseIndexList(gText, n)
  const ops = setOps(f.list, g.list, n)
  const rows: { label: string; list: number[] }[] = [
    { label: 'f', list: f.list },
    { label: 'g', list: g.list },
    { label: 'f · g  (∩)', list: ops.and },
    { label: 'f + g  (∪)', list: ops.or },
    { label: 'f ⊕ g  (Δ)', list: ops.xor },
    { label: 'f′', list: ops.notF },
  ]
  const cells = Array.from({ length: 2 ** n }, (_, i) => i)
  return (
    <div className="lab-sets">
      <div className="lab-row">
        <label htmlFor={`${u}-n`}>Variables</label>
        <Select id={`${u}-n`} className="lab-select" value={n} onChange={(e) => setN(Number(e.target.value))}>
          <option value={3}>3 (rows 0–7)</option>
          <option value={4}>4 (rows 0–15)</option>
        </Select>
      </div>
      <div className="lab-row">
        <label htmlFor={`${u}-f`}>f = Σm(</label>
        <input id={`${u}-f`} className="lab-input" value={fText} onChange={(e) => setF(e.target.value)} />
        <span>)</span>
      </div>
      <div className="lab-row">
        <label htmlFor={`${u}-g`}>g = Σm(</label>
        <input id={`${u}-g`} className="lab-input" value={gText} onChange={(e) => setG(e.target.value)} />
        <span>)</span>
      </div>
      {(f.error || g.error) && (
        <p className="lab-warn" role="status">
          {f.error ?? g.error}
        </p>
      )}
      <div className="lab-strips" tabIndex={0} role="table" aria-label="Minterm sets, one row per expression">
        <div className="lab-strip lab-strip--head" role="row">
          <span className="lab-strip-label" role="columnheader">
            row
          </span>
          {cells.map((i) => (
            <span key={i} className="lab-cell lab-cell--head" role="columnheader">
              {i}
            </span>
          ))}
        </div>
        {rows.map((r) => {
          const on = new Set(r.list)
          return (
            <div key={r.label} className="lab-strip" role="row">
              <span className="lab-strip-label" role="rowheader">
                {r.label}
              </span>
              {cells.map((i) => (
                <span key={i} role="cell" className={cn('lab-cell', on.has(i) && 'is-one')} aria-label={`${r.label}, row ${i}: ${on.has(i) ? 1 : 0}`}>
                  {on.has(i) ? 1 : 0}
                </span>
              ))}
              <span className="lab-strip-list">{formatSigma(r.list)}</span>
            </div>
          )
        })}
      </div>
      <p className="lab-hint">Each row of the table is one cell. AND keeps the cells in both, OR the cells in either, XOR the cells in exactly one, NOT the cells not in f.</p>
    </div>
  )
}
