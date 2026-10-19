/*
  Adder Race (Digital Logic, Chapter 4 Live Lab). Two tabs:

    race     a ripple-carry and a carry look-ahead adder (both behind the
             adder–subtractor XOR row) get the same input change and run side
             by side on one gate-delay clock: play, step or jump to the end;
             each carry and sum cell shows its value at time t and is marked
             while it is still going to change; each adder shows when it
             settled; the flag panel shows C, V (overflow), N and Z
    scaling  worst-case delay against the width n (4 … 64) for ripple,
             carry look-ahead (fan-in 4, multi-level) and carry-select, from
             the same netlists, as a table with bars

  All logic is in ./adderLogic.ts (tested against the Python checks in
  content/gate-notes/_checks/dl/arithlib.py). Every control is a real button,
  select or input; results are announced with aria-live. Colours come from the
  theme tokens only, so dark mode works.
*/
import { useEffect, useId, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { bitsText, pattern, race, scaling, signed, type Kind, type RaceResult } from './adderLogic'

export type RaceTab = 'race' | 'scaling'

const TABS: { id: RaceTab; label: string }[] = [
  { id: 'race', label: 'Race' },
  { id: 'scaling', label: 'Delay vs width' },
]

const NAMES: Record<Kind, string> = { rca: 'Ripple-carry', cla: 'Carry look-ahead' }

export default function AdderRace({ tab: initial = 'race', title }: { tab?: string; title?: string }) {
  const [tab, setTab] = useState<RaceTab>(initial === 'scaling' ? 'scaling' : 'race')
  const uid = useId()
  return (
    <div className="lab">
      <div className="lab-head">
        <span className="lab-kicker">Live Lab</span>
        <span className="lab-title">{title || 'Adder Race'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Adder Race tools">
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
        {tab === 'race' ? <RaceTool /> : <ScalingTool />}
      </div>
    </div>
  )
}

/* ── Race ─────────────────────────────────────────────────────────────── */

interface Ops {
  a: number
  b: number
  K: number
}

/** Parse a decimal (signed or unsigned) or 0b… / 0x… operand into an n-bit pattern; null if invalid. */
function parseOperand(text: string, n: number): number | null {
  const s = text.trim().toLowerCase()
  let v: number
  if (/^[+-]?\d+$/.test(s)) v = Number(s)
  else if (/^0b[01]+$/.test(s)) v = parseInt(s.slice(2), 2)
  else if (/^0x[0-9a-f]+$/.test(s)) v = parseInt(s.slice(2), 16)
  else return null
  if (v < -(2 ** (n - 1)) || v >= 2 ** n) return null
  return pattern(v, n)
}

function RaceTool() {
  const u = useId()
  const [n, setN] = useState(8)
  const [aText, setAText] = useState('1')
  const [bText, setBText] = useState('-1')
  const [sub, setSub] = useState(false)
  const [xorDelay, setXorDelay] = useState(1)
  const [prev, setPrev] = useState<Ops>({ a: 0, b: 0, K: 0 })
  const [run, setRun] = useState<{ res: RaceResult; ops: Ops; from: Ops } | null>(null)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)

  const a = parseOperand(aText, n)
  const b = parseOperand(bText, n)
  const ok = a !== null && b !== null
  const end = run ? Math.max(run.res.sides.rca.settled, run.res.sides.cla.settled) : 0

  useEffect(() => {
    if (!playing || !run || t >= end) return
    const id = window.setTimeout(() => {
      setT(t + 1)
      if (t + 1 >= end) setPlaying(false)
    }, 420)
    return () => window.clearTimeout(id)
  }, [playing, t, end, run])

  const start = () => {
    if (!ok) return
    const ops = { a: a!, b: b!, K: sub ? 1 : 0 }
    const res = race(n, prev, ops, xorDelay)
    setRun({ res, ops, from: prev })
    setPrev(ops)
    setT(0)
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setPlaying(!reduce)
    if (reduce) setT(Math.max(res.sides.rca.settled, res.sides.cla.settled))
  }

  const resize = (k: number) => {
    setN(k)
    setPrev({ a: 0, b: 0, K: 0 })
    setRun(null)
    setT(0)
    setPlaying(false)
  }

  const presets: { label: string; a: string; b: string; sub: boolean }[] = [
    { label: '1 + (−1): longest ripple', a: '1', b: '-1', sub: false },
    { label: 'max + 1: overflow', a: String(2 ** (n - 1) - 1), b: '1', sub: false },
    { label: '5 − 6', a: '5', b: '6', sub: true },
    { label: 'min − 1: overflow', a: String(-(2 ** (n - 1))), b: '1', sub: true },
  ]

  return (
    <div>
      <div className="lab-row">
        <label htmlFor={`${u}-n`}>Width</label>
        <select id={`${u}-n`} className="lab-select" value={n} onChange={(e) => resize(Number(e.target.value))}>
          {[4, 8, 16].map((k) => (
            <option key={k} value={k}>
              {k} bits
            </option>
          ))}
        </select>
        <label htmlFor={`${u}-x`}>XOR delay</label>
        <select id={`${u}-x`} className="lab-select" value={xorDelay} onChange={(e) => setXorDelay(Number(e.target.value))}>
          <option value={1}>1 gate delay</option>
          <option value={2}>2 gate delays</option>
        </select>
      </div>
      <div className="lab-row">
        <label htmlFor={`${u}-a`}>A</label>
        <input id={`${u}-a`} className="lab-input ar-num" value={aText} onChange={(e) => setAText(e.target.value)} inputMode="numeric" aria-invalid={a === null} />
        <div className="lab-inputs" role="group" aria-label="Operation">
          <button type="button" className={cn('lab-toggle', !sub && 'is-on')} aria-pressed={!sub} onClick={() => setSub(false)}>
            A + B
          </button>
          <button type="button" className={cn('lab-toggle', sub && 'is-on')} aria-pressed={sub} onClick={() => setSub(true)}>
            A − B
          </button>
        </div>
        <label htmlFor={`${u}-b`}>B</label>
        <input id={`${u}-b`} className="lab-input ar-num" value={bText} onChange={(e) => setBText(e.target.value)} inputMode="numeric" aria-invalid={b === null} />
      </div>
      <p className="lab-hint">
        Decimal (signed −{2 ** (n - 1)} … {2 ** (n - 1) - 1} or unsigned 0 … {2 ** n - 1}), or 0b… / 0x…. Every gate costs 1 delay
        {xorDelay === 2 ? ' (XOR 2)' : ''}. The adders start settled on the previous operands
        {run || prev.a || prev.b ? ` (${bitsText(prev.a, n)} ${prev.K ? '−' : '+'} ${bitsText(prev.b, n)})` : ' (all 0)'}, as real hardware does.
      </p>
      {!ok && <p className="lab-warn">Enter A and B that fit in {n} bits.</p>}
      <div className="lab-inputs" role="group" aria-label="Examples">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            className="lab-btn"
            onClick={() => {
              setAText(p.a)
              setBText(p.b)
              setSub(p.sub)
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="lab-row">
        <button type="button" className="lab-btn lab-btn--main" onClick={start} disabled={!ok}>
          Race
        </button>
        <button type="button" className="lab-btn" disabled={!run} onClick={() => setPlaying((p) => !p && t < end)}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="lab-btn" disabled={!run || t >= end} onClick={() => (setPlaying(false), setT((x) => Math.min(end, x + 1)))}>
          Step +1
        </button>
        <button type="button" className="lab-btn" disabled={!run} onClick={() => (setPlaying(false), setT(0))}>
          t = 0
        </button>
        <button type="button" className="lab-btn" disabled={!run} onClick={() => (setPlaying(false), setT(end))}>
          End
        </button>
      </div>
      {run ? (
        <RaceView run={run} t={t} />
      ) : (
        <p className="lab-hint">Press Race: both adders receive the new inputs at t = 0 and the gate-delay clock starts.</p>
      )}
    </div>
  )
}

function RaceView({ run, t }: { run: { res: RaceResult; ops: Ops; from: Ops }; t: number }) {
  const { res, ops } = run
  const n = res.n
  const end = Math.max(res.sides.rca.settled, res.sides.cla.settled)
  const sa = signed(ops.a, n)
  const sb = signed(ops.b, n)
  const op = ops.K ? '−' : '+'
  const trueSigned = ops.K ? sa - sb : sa + sb
  const announce =
    t >= end
      ? `${NAMES.rca} settled after ${res.sides.rca.settled} gate delays, ${NAMES.cla} after ${res.sides.cla.settled}. ` +
        `Result ${bitsText(res.sum, n)}: unsigned ${res.sum}, signed ${signed(res.sum, n)}. Flags C ${res.C}, V ${res.V}, N ${res.N}, Z ${res.Z}.`
      : ''
  return (
    <div>
      <p className="ar-clock" aria-label={`Gate-delay clock: t = ${t}`}>
        <span className="ar-clock-label">gate-delay clock</span>
        <span className="ar-clock-t">t = {t}</span>
        <span className="ar-clock-bar" aria-hidden="true">
          <span style={{ width: `${end ? (100 * t) / end : 100}%` }} />
        </span>
      </p>
      <div className="lab-grid ar-sides">
        {(['rca', 'cla'] as const).map((kind) => {
          const side = res.sides[kind]
          const w = side.sim.wave
          const val = (x: string) => w[x][Math.min(t, side.sim.horizon)]
          const fin = (x: string) => w[x][side.sim.horizon]
          const pending = (x: string) => side.sim.settle[x] > t
          const done = t >= side.settled
          const carries = Array.from({ length: n + 1 }, (_, k) => n - k)
          const sums = Array.from({ length: n }, (_, k) => n - 1 - k)
          return (
            <section key={kind} className={cn('ar-side', done && 'is-done')} aria-label={NAMES[kind]}>
              <h4 className="ar-name">
                {NAMES[kind]} <span className="lab-of">({side.gates} gates, worst case {side.worst})</span>
              </h4>
              <div className="lab-strips">
                <div className="lab-strip" aria-hidden="true">
                  <span className="lab-strip-label">bit</span>
                  {carries.map((i) => (
                    <span key={i} className="lab-cell lab-cell--head">
                      {i}
                    </span>
                  ))}
                </div>
                <div className="lab-strip">
                  <span className="lab-strip-label">carry c</span>
                  {carries.map((i) => {
                    const x = `c${i}`
                    const v = i === 0 ? ops.K : val(x)
                    const p = i > 0 && pending(x)
                    return (
                      <span key={i} className={cn('lab-cell', v === 1 && 'is-one', p && 'is-pending')} title={`c${i} = ${v}${p ? `, settles at t = ${side.sim.settle[x]}` : ''}`}>
                        {v}
                      </span>
                    )
                  })}
                </div>
                <div className="lab-strip">
                  <span className="lab-strip-label">sum s</span>
                  <span className="lab-cell lab-cell--head" />
                  {sums.map((i) => {
                    const x = `s${i}`
                    const v = val(x)
                    const p = pending(x)
                    return (
                      <span key={i} className={cn('lab-cell', v === 1 && 'is-one', p && 'is-pending')} title={`s${i} = ${v}${p ? `, settles at t = ${side.sim.settle[x]}` : ''}`}>
                        {v}
                      </span>
                    )
                  })}
                </div>
              </div>
              <p className={cn('ar-status', done ? 'is-good' : 'is-wait')}>
                {done ? `Settled at t = ${side.settled}` : `Still changing… (settles at t = ${side.settled})`}
                <span className="lab-of"> · sum {bitsText([...Array(n)].reduce((s, _, i) => s + fin(`s${i}`) * 2 ** i, 0), n)}</span>
              </p>
            </section>
          )
        })}
      </div>
      <div className="ar-flags" role="group" aria-label="Flags">
        {(
          [
            ['C', res.C, ops.K ? 'carry out = no borrow (A ≥ B unsigned)' : 'carry out (unsigned overflow)'],
            ['V', res.V, 'signed overflow: c_n ⊕ c_(n−1)'],
            ['N', res.N, 'sign bit of the result'],
            ['Z', res.Z, 'result is zero'],
          ] as const
        ).map(([f, v, why]) => (
          <span key={f} className={cn('ar-flag', t >= end && v === 1 && (f === 'V' ? 'is-alarm' : 'is-one'))} title={why}>
            <b>{f}</b> = {t >= end ? v : '?'}
            <small>{why}</small>
          </span>
        ))}
      </div>
      <p className={cn('lab-result', t >= end && (res.V ? 'is-bad' : 'is-good'))}>
        {t >= end
          ? `${bitsText(ops.a, n)} ${op} ${bitsText(ops.b, n)} = ${bitsText(res.sum, n)}: unsigned ${ops.a} ${op} ${ops.b} → ${res.sum}; signed ${sa} ${op} ${sb} = ${trueSigned}${
              res.V ? `, which does not fit in ${n} bits: overflow (the pattern reads ${signed(res.sum, n)})` : ''
            }.`
          : `Racing… ripple settles at t = ${res.sides.rca.settled}, look-ahead at t = ${res.sides.cla.settled}.`}
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  )
}

/* ── Scaling ──────────────────────────────────────────────────────────── */

function ScalingTool() {
  const rows = useMemo(() => scaling(), [])
  const max = Math.max(...rows.map((r) => r.rca))
  const series = [
    ['rca', 'Ripple-carry'],
    ['cla', 'Carry look-ahead (fan-in 4)'],
    ['csel', 'Carry-select (4-bit blocks)'],
  ] as const
  return (
    <div>
      <p className="lab-hint">
        Worst-case delay in gate delays (every gate 1, a 2:1 MUX 2), measured on the same netlists the race tab simulates. Ripple grows
        like 2n + 1; carry look-ahead with fan-in 4 grows like log n (one more lookahead level each time n is multiplied by 4);
        carry-select with fixed 4-bit blocks still grows linearly, but with a smaller slope.
      </p>
      <div className="lab-tt-wrap">
        <table className="lab-tt ar-scale">
          <caption className="sr-only">Worst-case adder delay against width</caption>
          <thead>
            <tr>
              <th scope="col">n</th>
              {series.map(([k, l]) => (
                <th key={k} scope="col">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.n}>
                <th scope="row">{r.n}</th>
                {series.map(([k]) => (
                  <td key={k} className="ar-bar-cell">
                    <span className={cn('ar-bar', `ar-bar--${k}`)} style={{ width: `${(100 * r[k]) / max}%` }} aria-hidden="true" />
                    <span className="ar-bar-num">{r[k]}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lab-result">
        At 64 bits: ripple {rows[rows.length - 1].rca}, carry-select {rows[rows.length - 1].csel}, look-ahead {rows[rows.length - 1].cla} gate delays.
      </p>
    </div>
  )
}
