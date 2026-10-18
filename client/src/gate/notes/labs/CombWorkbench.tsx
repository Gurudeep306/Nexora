/*
  Combinational Workbench (Digital Logic, Chapter 4 Live Lab). Three tabs:

    mux        a 2:1, 4:1 or 8:1 MUX: toggle the data inputs and the select
               lines (or step them), switch the enable and its polarity, and
               watch the selected path light up; the MUX equation marks the
               live minterm
    implement  a 3- or 4-variable function (truth-table cells cycle
               0 → 1 → X, or a preset) realised on a 4:1 or 8:1 MUX with the
               chosen select variables (implementation table, residues on
               the data lines) or on a decoder + OR / NOR; a verification
               line rebuilds the realised truth table and compares it with f
    decoder    decoder (enable, active-low outputs), DEMUX, binary and
               priority encoders, with the outputs drawn as lamps

  All logic is in ./combLogic.ts (tested against the Python checks in
  content/gate-notes/_checks/dl/comblib.py). Every control is a real button
  or select; results are announced with aria-live. Colours come from the
  theme tokens only, so dark mode works.
*/
import { useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { gateShape } from '@/viz/geometry'
import {
  NEXT,
  PRESETS,
  VARS,
  bitsOf,
  decoder,
  decoderGate,
  demux,
  enabled,
  encoder,
  fnOf,
  implTable,
  muxEquation,
  muxOut,
  num,
  priorityEncoder,
  realiseDecoder,
  realiseMux,
  selNames,
  sigmaText,
  termText,
  valuesOf,
  verify,
  type CellValue,
  type Target,
} from './combLogic'

export type CombTab = 'mux' | 'implement' | 'decoder'

const TABS: { id: CombTab; label: string }[] = [
  { id: 'mux', label: 'Multiplexer' },
  { id: 'implement', label: 'Implement f' },
  { id: 'decoder', label: 'Decoders and encoders' },
]

const ACCENT = 'var(--color-accent-brand)'
const HL: CSSProperties = { stroke: ACCENT, strokeWidth: 3.4 }
const MARK: CSSProperties = { background: `color-mix(in oklab, ${ACCENT} 18%, transparent)`, borderRadius: 4, padding: '0 3px', fontWeight: 700 }
const MONO: CSSProperties = { fontFamily: 'var(--font-mono)' }

export default function CombWorkbench({ tab: initial = 'mux', title }: { tab?: string; title?: string }) {
  const [tab, setTab] = useState<CombTab>(initial === 'implement' || initial === 'decoder' ? initial : 'mux')
  const uid = useId()
  return (
    <div className="lab">
      <div className="lab-head">
        <span className="lab-kicker">Live Lab</span>
        <span className="lab-title">{title || 'Combinational Workbench'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Combinational Workbench tools">
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
        {tab === 'mux' && <MuxTool />}
        {tab === 'implement' && <ImplementTool />}
        {tab === 'decoder' && <DecoderTool />}
      </div>
    </div>
  )
}

/* ── Shared: a MUX block drawn as SVG ───────────────────────────────── */

interface MuxSvgProps {
  /** One label per data input (I0 first) and, optionally, its current value. */
  inputs: { label: string; value?: number }[]
  /** Select line labels, MSB first, with optional values. */
  sels: { label: string; value?: number }[]
  /** The data input the select lines pick (null: nothing highlighted). */
  selected: number | null
  enable?: { label: string; value: number; on: boolean }
  out: string
  outValue?: number
  ariaLabel: string
}

function MuxSvg({ inputs, sels, selected, enable, out, outValue, ariaLabel }: MuxSvgProps) {
  const N = inputs.length
  const pitch = N > 4 ? 26 : 34
  const bx = 190
  const bw = 90
  const by = enable ? 46 : 22
  const bh = N * pitch + 18
  const inset = 16
  const H = by + bh + 54 + 12 * Math.max(0, sels.length - 1)
  const W = 440
  const yIn = (i: number) => by + 9 + pitch / 2 + i * pitch
  const yMid = by + bh / 2
  const yBottom = (x: number) => by + bh - (inset * (x - bx)) / bw
  const yTop = (x: number) => by + (inset * (x - bx)) / bw
  const tone = (v?: number) => (v === undefined ? 'is-zero' : v ? 'is-one' : 'is-zero')
  const live = selected !== null && (!enable || enable.on)
  return (
    <svg className="lab-svg" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel}>
      {inputs.map((d, i) => {
        const hl = selected === i
        return (
          <g key={i}>
            <text x={bx - 64} y={yIn(i) + 5} textAnchor="end" className="lab-svg-label">
              {d.label}
            </text>
            <path d={`M${bx - 58} ${yIn(i)} H${bx}`} className={cn('lab-wire', tone(d.value))} style={hl ? HL : undefined} />
            {d.value !== undefined && (
              <text x={bx - 30} y={yIn(i) - 5} textAnchor="middle" className="lab-svg-val">
                {d.value}
              </text>
            )}
          </g>
        )
      })}
      <g className="lab-gate">
        <path d={`M${bx} ${by} L${bx + bw} ${by + inset} L${bx + bw} ${by + bh - inset} L${bx} ${by + bh} Z`} />
      </g>
      {inputs.map((_, i) => (
        <text key={i} x={bx + 6} y={yIn(i) + 4} className="lab-svg-small" style={selected === i ? { fill: ACCENT } : undefined}>
          I{i}
        </text>
      ))}
      <text x={bx + bw / 2 + 8} y={yMid + 4} textAnchor="middle" className="lab-svg-small">
        {N}:1 MUX
      </text>
      {live && <path d={`M${bx + 24} ${yIn(selected!)} L${bx + bw} ${yMid}`} className="lab-wire" style={{ ...HL, strokeDasharray: '5 4' }} />}
      <path d={`M${bx + bw} ${yMid} H${bx + bw + 56}`} className={cn('lab-wire', tone(outValue))} style={live ? HL : undefined} />
      <text x={bx + bw + 62} y={yMid + 5} className="lab-svg-label">
        {out}
        {outValue !== undefined ? ` = ${outValue}` : ''}
      </text>
      {sels.map((s, j) => {
        // Labels are staggered (MSB highest) so neighbouring select lines never overprint.
        const x = bx + 14 + ((bw - 28) * (j + 0.5)) / sels.length
        const ly = H - 8 - 12 * (sels.length - 1 - j)
        return (
          <g key={j}>
            <path d={`M${x} ${yBottom(x)} V${ly - 12}`} className={cn('lab-wire', tone(s.value))} />
            <text x={x} y={ly} textAnchor="middle" className="lab-svg-small">
              {s.label}
              {s.value !== undefined ? `=${s.value}` : ''}
            </text>
          </g>
        )
      })}
      {enable && (
        <g>
          <path d={`M${bx + bw / 2} ${yTop(bx + bw / 2)} V14`} className={cn('lab-wire', tone(enable.value))} />
          <text x={bx + bw / 2 + 8} y={18} className="lab-svg-small">
            {enable.label} = {enable.value} ({enable.on ? 'enabled' : 'disabled'})
          </text>
        </g>
      )}
    </svg>
  )
}

function Toggle({ label, on, onClick, aria }: { label: string; on: boolean; onClick: () => void; aria?: string }) {
  return (
    <button type="button" className={cn('lab-toggle', on && 'is-on')} aria-pressed={on} aria-label={aria} onClick={onClick}>
      {label}
    </button>
  )
}

/* ── Tab 1: multiplexer ─────────────────────────────────────────────── */

function MuxTool() {
  const u = useId()
  const [k, setK] = useState(2)
  const [data, setData] = useState<number[]>([0, 1, 1, 0])
  const [sel, setSel] = useState<number[]>([0, 1])
  const [useEn, setUseEn] = useState(false)
  const [en, setEn] = useState(1)
  const [enLow, setEnLow] = useState(false)
  const N = 1 << k
  const names = selNames(k)
  const resize = (nk: number) => {
    setK(nk)
    setData(Array.from({ length: 1 << nk }, (_, i) => data[i] ?? 0))
    setSel(new Array<number>(nk).fill(0))
  }
  const on = !useEn || enabled(en, enLow)
  const y = muxOut(data, sel, useEn ? en : 1, useEn && enLow)
  const s = num(sel)
  const eq = muxEquation(k, sel)
  return (
    <div className="lab-grid">
      <div className="lab-col">
        <div className="lab-row">
          <label htmlFor={`${u}-size`}>MUX</label>
          <select id={`${u}-size`} className="lab-select" value={k} onChange={(e) => resize(Number(e.target.value))}>
            <option value={1}>2:1 (one select line)</option>
            <option value={2}>4:1 (two select lines)</option>
            <option value={3}>8:1 (three select lines)</option>
          </select>
        </div>
        <p className="lab-hint">Data inputs (click to set 0 or 1):</p>
        <div className="lab-inputs" role="group" aria-label="Data inputs">
          {data.map((v, i) => (
            <Toggle key={i} label={`I${i} = ${v}`} on={!!v} onClick={() => setData(data.map((x, j) => (j === i ? 1 - x : x)))} />
          ))}
        </div>
        <p className="lab-hint">Select lines (MSB first): the select bits read as a binary number pick the data input.</p>
        <div className="lab-inputs" role="group" aria-label="Select lines">
          {sel.map((v, j) => (
            <Toggle key={j} label={`${names[j]} = ${v}`} on={!!v} onClick={() => setSel(sel.map((x, i) => (i === j ? 1 - x : x)))} />
          ))}
          <button type="button" className="lab-btn lab-btn--main" onClick={() => setSel(bitsOf((s + 1) % N, k))}>
            Step select
          </button>
        </div>
        <div className="lab-row" role="group" aria-label="Enable">
          <Toggle label={useEn ? 'Enable input: on' : 'Enable input: off'} on={useEn} onClick={() => setUseEn(!useEn)} />
          {useEn && (
            <>
              <Toggle label={`E = ${en}`} on={!!en} onClick={() => setEn(1 - en)} />
              <Toggle label={enLow ? 'active low (Ē)' : 'active high'} on={enLow} onClick={() => setEnLow(!enLow)} aria={`Enable polarity: ${enLow ? 'active low' : 'active high'}. Click to switch.`} />
            </>
          )}
        </div>
      </div>
      <div className="lab-col">
        <MuxSvg
          inputs={data.map((v, i) => ({ label: `I${i}`, value: v }))}
          sels={sel.map((v, j) => ({ label: names[j]!, value: v }))}
          selected={s}
          enable={useEn ? { label: enLow ? 'Ē' : 'E', value: en, on } : undefined}
          out="Y"
          outValue={y}
          ariaLabel={`${N}:1 MUX, select = ${s}, ${on ? `input I${s} passes` : 'disabled'}; Y = ${y}`}
        />
        <p className="lab-lists" aria-label="MUX equation">
          Y = {useEn ? (enLow ? 'Ē·(' : 'E·(') : ''}
          {eq.terms.map((t, i) => (
            <span key={t.i}>
              {i > 0 && ' + '}
              <span style={t.i === eq.active ? MARK : undefined} aria-current={t.i === eq.active ? 'true' : undefined}>
                {t.text}
              </span>
            </span>
          ))}
          {useEn ? ')' : ''}
        </p>
        <p className={cn('lab-result')} role="status" aria-live="polite">
          {on
            ? `${names.join('')} = ${sel.join('')} = ${s}, so only m${s}(S) = ${eq.terms[s]!.minterm} is 1: Y = I${s} = ${y}.`
            : `The enable is inactive (${enLow ? 'Ē' : 'E'} = ${en}), so Y = 0 whatever the data and select lines say.`}
        </p>
      </div>
    </div>
  )
}

/* ── Tab 2: implement a function ────────────────────────────────────── */

const TARGETS: { id: Target; label: string }[] = [
  { id: 'mux4', label: '4:1 MUX' },
  { id: 'mux8', label: '8:1 MUX' },
  { id: 'dec', label: 'Decoder + OR' },
]
const selCount = (t: Target) => (t === 'mux4' ? 2 : t === 'mux8' ? 3 : 0)

function ImplementTool() {
  const u = useId()
  const first = PRESETS[0]!
  const [vars, setVars] = useState<string[]>(first.vars)
  const [values, setValues] = useState<CellValue[]>(() => valuesOf(first.fn))
  const [target, setTarget] = useState<Target>(first.target)
  const [sel, setSel] = useState<number[]>(first.sel)
  const fn = useMemo(() => fnOf(values), [values])
  const n = fn.n
  const k = selCount(target)
  const raw = sel.slice(0, k)
  const okSel = raw.length === k && raw.every((i) => i < n) && new Set(raw).size === k
  const selIdx = k ? (okSel ? raw : [0, 1, 2].slice(0, k)) : []
  const table = k ? implTable(fn, selIdx, vars) : null
  const gate = useMemo(() => decoderGate(fn), [fn])
  const realised = table ? realiseMux(fn, selIdx, table) : realiseDecoder(fn, gate)
  const check = verify(fn, realised)
  const setN = (nn: number) => {
    setVars(VARS[nn]!)
    setValues(Array.from({ length: 1 << nn }, (_, m) => values[m] ?? '0'))
    setSel([0, 1, 2])
  }
  const pickSel = (j: number, v: number) => {
    const next = selIdx.slice()
    const p = next.indexOf(v)
    if (p >= 0) next[p] = next[j]!
    next[j] = v
    setSel(next)
  }
  const rowText = (m: number) => termText(m.toString(2).padStart(n, '0'), vars)
  return (
    <div>
      <div className="lab-row">
        <label htmlFor={`${u}-n`}>Variables</label>
        <select id={`${u}-n`} className="lab-select" value={n} onChange={(e) => setN(Number(e.target.value))}>
          <option value={3}>3 (A, B, C)</option>
          <option value={4}>4 (A, B, C, D)</option>
        </select>
        <label className="sr-only" htmlFor={`${u}-preset`}>
          Load a preset
        </label>
        <select
          id={`${u}-preset`}
          className="lab-select"
          value=""
          onChange={(e) => {
            const p = PRESETS.find((x) => x.id === e.target.value)
            if (!p) return
            setVars(p.vars)
            setValues(valuesOf(p.fn))
            setTarget(p.target)
            setSel(p.sel)
          }}
        >
          <option value="">Load a preset…</option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button type="button" className="lab-btn" onClick={() => setValues(values.map(() => '0'))}>
          Clear
        </button>
      </div>
      <p className="lab-hint">
        Truth table of f({vars.join(', ')}), first variable = MSB. Click a cell to cycle 0 → 1 → X (don’t-care).
      </p>
      <div className="lab-inputs" role="group" aria-label="Truth table of f">
        {values.map((v, m) => (
          <button
            key={m}
            type="button"
            className={cn('lab-toggle', v === '1' && 'is-on')}
            style={{ minWidth: '3.4em', padding: '0 6px', borderStyle: v === 'X' ? 'dashed' : undefined }}
            aria-label={`Row ${m}, ${rowText(m)}: f = ${v === 'X' ? "don't-care" : v}. Click to change.`}
            onClick={() => setValues(values.map((x, j) => (j === m ? NEXT[x] : x)))}
          >
            <span className="lab-svg-small" style={{ fontSize: 10, marginRight: 4 }}>
              {m}
            </span>
            {v}
          </button>
        ))}
      </div>
      <p className="lab-lists">f = {sigmaText(fn)}</p>
      <div className="lab-row" style={{ marginTop: 10 }}>
        <span>Realise on</span>
        <div className="lab-row" role="group" aria-label="Target" style={{ margin: 0 }}>
          {TARGETS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={cn('lab-toggle', target === t.id && 'is-on')}
              aria-pressed={target === t.id}
              onClick={() => {
                setTarget(t.id)
                setSel([0, 1, 2])
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {k > 0 && (
        <div className="lab-row" role="group" aria-label="Select variables">
          {selIdx.map((v, j) => (
            <span key={j} className="lab-row" style={{ margin: 0, gap: 4 }}>
              <label htmlFor={`${u}-s${j}`} style={MONO}>
                S{k - 1 - j} =
              </label>
              <select id={`${u}-s${j}`} className="lab-select" value={v} onChange={(e) => pickSel(j, Number(e.target.value))}>
                {vars.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </span>
          ))}
          <span className="lab-hint" style={{ margin: 0 }}>
            {table!.rvars.length ? `Residue variable${table!.rvars.length > 1 ? 's' : ''}: ${table!.rvars.join(', ')}` : 'Every variable is on a select line: the data lines are constants.'}
          </span>
        </div>
      )}
      <div className="lab-grid">
        <div className="lab-col">{table ? <ImplTableView fn={fn} selIdx={selIdx} table={table} /> : <DecoderList gate={gate} n={n} />}</div>
        <div className="lab-col">
          {table ? (
            <MuxSvg
              inputs={table.res.map((r) => ({ label: r.name }))}
              sels={table.selVars.map((s) => ({ label: s }))}
              selected={null}
              out="f"
              ariaLabel={`${1 << k}:1 MUX with selects ${table.selVars.join(', ')}; data lines ${table.res.map((r, i) => `I${i} = ${r.name}`).join(', ')}`}
            />
          ) : (
            <DecoderOrSvg n={n} vars={vars} gate={gate} />
          )}
        </div>
      </div>
      <p className={cn('lab-result', check.ok ? 'is-good' : 'is-bad')} role="status" aria-live="polite">
        {check.ok
          ? `✓ realises f: the wired ${target === 'dec' ? 'decoder' : 'MUX'} agrees with f on all ${(1 << n) - fn.dcs.length} care rows${fn.dcs.length ? ' (don’t-care rows may come out either way)' : ''}.`
          : `✗ mismatch on row${check.wrong.length > 1 ? 's' : ''} ${check.wrong.join(', ')}.`}
      </p>
      <p className="lab-lists" aria-label="Realised truth table">
        realised: {realised.join('')}
      </p>
    </div>
  )
}

function ImplTableView({ fn, selIdx, table }: { fn: { n: number; ones: number[]; dcs: number[] }; selIdx: number[]; table: NonNullable<ReturnType<typeof implTable>> }) {
  const { n } = fn
  const rest = Array.from({ length: n }, (_, i) => i).filter((i) => !selIdx.includes(i))
  const r = rest.length
  const one = new Set(fn.ones)
  const dc = new Set(fn.dcs)
  const minterm = (s: number, row: number) => {
    const bits = new Array<number>(n).fill(0)
    bitsOf(s, selIdx.length).forEach((b, j) => (bits[selIdx[j]!] = b))
    bitsOf(row, r).forEach((b, j) => (bits[rest[j]!] = b))
    return num(bits)
  }
  const cols = table.res.length
  return (
    <div className="lab-tt-wrap">
      <table className="lab-tt">
        <caption className="sr-only">Implementation table: columns are the data inputs, rows the residue-variable values; a circled minterm is a 1 of f, a dashed one a don’t-care.</caption>
        <thead>
          <tr>
            <th scope="col">{table.rvars.join('') || '·'}</th>
            {table.res.map((_, i) => (
              <th key={i} scope="col">
                I{i}
                <br />
                <span className="lab-svg-small" style={{ fontWeight: 400 }}>
                  {table.selVars.join('')}={bitsOf(i, selIdx.length).join('')}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 1 << r }, (_, row) => (
            <tr key={row}>
              <th scope="row">{r ? termText(row.toString(2).padStart(r, '0'), table.rvars) : '—'}</th>
              {Array.from({ length: cols }, (_, s) => {
                const m = minterm(s, row)
                const v = dc.has(m) ? 'X' : one.has(m) ? 1 : 0
                return (
                  <td key={s} aria-label={`m${m}: ${v === 'X' ? "don't-care" : v}`}>
                    <span
                      style={{
                        display: 'inline-block',
                        minWidth: '1.7em',
                        borderRadius: 999,
                        border: v === 1 ? `2px solid ${ACCENT}` : v === 'X' ? '1px dashed var(--color-text-muted)' : '2px solid transparent',
                        color: v === 0 ? 'var(--color-text-muted)' : undefined,
                        fontWeight: v === 1 ? 700 : 400,
                      }}
                    >
                      {m}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
          <tr>
            <th scope="row">residue</th>
            {table.res.map((x, i) => (
              <td key={i} style={{ fontWeight: 700, color: ACCENT, whiteSpace: 'nowrap' }}>
                {x.name}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="lab-hint" style={{ marginTop: 8 }}>
        Read each column: no circled minterm → 0, all circled → 1, otherwise the residue is the function of {table.rvars.join(', ') || 'nothing'} that the circles spell (don’t-cares help).
      </p>
    </div>
  )
}

function DecoderList({ gate, n }: { gate: ReturnType<typeof decoderGate>; n: number }) {
  return (
    <div>
      <p className="lab-hint">
        A {n}:{1 << n} decoder makes every minterm: output Dᵢ is 1 exactly on row i. OR the outputs of the 1-rows, or NOR the outputs of the 0-rows, whichever list is shorter (a tie goes to OR).
      </p>
      <p className="lab-lists">
        f = {gate.gate === 'OR' ? 'OR' : 'NOR'}({gate.outputs.length ? gate.outputs.map((i) => `D${i}`).join(', ') : gate.gate === 'OR' ? 'nothing: f = 0' : 'nothing: f = 1'})
      </p>
    </div>
  )
}

function DecoderOrSvg({ n, vars, gate }: { n: number; vars: string[]; gate: ReturnType<typeof decoderGate> }) {
  const N = 1 << n
  const pitch = 20
  const bx = 110
  const bw = 80
  const by = 16
  const bh = N * pitch + 16
  const H = by + bh + 20
  const W = 440
  const yOut = (i: number) => by + 8 + pitch / 2 + i * pitch
  const wired = new Set(gate.outputs)
  const gh = Math.max(44, gate.outputs.length * 13)
  const gx = 300
  const gy = Math.max(6, by + bh / 2 - gh / 2)
  const sh = gateShape(gate.gate === 'OR' ? 'or' : 'nor', gx, gy, 54, gh, Math.max(2, gate.outputs.length))
  return (
    <svg className="lab-svg" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${n}:${N} decoder with inputs ${vars.join(', ')} (first = MSB); ${gate.gate} of outputs ${gate.outputs.join(', ') || 'none'} gives f`}>
      {vars.map((v, j) => {
        const y = by + ((j + 1) * bh) / (n + 1)
        return (
          <g key={j}>
            <text x={bx - 40} y={y + 5} textAnchor="end" className="lab-svg-label">
              {v}
            </text>
            <path d={`M${bx - 34} ${y} H${bx}`} className="lab-wire is-zero" />
            <text x={bx + 4} y={y + 4} className="lab-svg-small">
              {j === 0 ? 'MSB' : j === n - 1 ? 'LSB' : ''}
            </text>
          </g>
        )
      })}
      <g className="lab-gate">
        <path d={`M${bx} ${by} H${bx + bw} V${by + bh} H${bx} Z`} />
      </g>
      <text x={bx + bw / 2 + 6} y={by + bh / 2 + 4} textAnchor="middle" className="lab-svg-small">
        {n}:{N}
      </text>
      {Array.from({ length: N }, (_, i) => {
        const y = yOut(i)
        const k = gate.outputs.indexOf(i)
        return (
          <g key={i}>
            <text x={bx + bw - 4} y={y + 4} textAnchor="end" className="lab-svg-small" style={wired.has(i) ? { fill: ACCENT } : undefined}>
              D{i}
            </text>
            {k >= 0 ? (
              <path d={`M${bx + bw} ${y} H${214 + k * 5} V${sh.pins[k]![1]} H${sh.pins[k]![0]}`} className="lab-wire" style={HL} />
            ) : (
              <path d={`M${bx + bw} ${y} h10`} className="lab-wire is-zero" />
            )}
          </g>
        )
      })}
      {gate.outputs.length > 0 && (
        <g className="lab-gate">
          <path d={sh.body} />
          {sh.outBubble && <circle cx={sh.outBubble.cx} cy={sh.outBubble.cy} r={sh.outBubble.r} />}
        </g>
      )}
      <path d={`M${sh.out[0]} ${sh.out[1]} H${sh.out[0] + 30}`} className="lab-wire is-zero" />
      <text x={sh.out[0] + 34} y={sh.out[1] + 5} className="lab-svg-label">
        f{gate.outputs.length ? '' : ` = ${gate.gate === 'OR' ? 0 : 1}`}
      </text>
    </svg>
  )
}

/* ── Tab 3: decoders, DEMUX, encoders ───────────────────────────────── */

type DecMode = 'decoder' | 'demux' | 'encoder' | 'priority'
const MODES: { id: DecMode; label: string }[] = [
  { id: 'decoder', label: 'Decoder' },
  { id: 'demux', label: 'DEMUX' },
  { id: 'encoder', label: 'Encoder' },
  { id: 'priority', label: 'Priority encoder' },
]

function Lamps({ name, values, lit, labels }: { name: string; values: number[]; lit: (v: number, i: number) => boolean; labels?: string[] }) {
  return (
    <div className="lab-inputs" role="list" aria-label={`${name} outputs`}>
      {values.map((v, i) => {
        const on = lit(v, i)
        return (
          <span
            key={i}
            role="listitem"
            aria-label={`${labels?.[i] ?? `${name}${i}`} = ${v}${on ? ', lit' : ''}`}
            style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 40, ...MONO, fontSize: 12.5 }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                border: `2px solid ${on ? 'var(--color-state-success)' : 'var(--color-border-strong)'}`,
                background: on ? 'color-mix(in oklab, var(--color-state-success) 70%, var(--color-bg-surface))' : 'var(--color-bg-surface-2)',
                boxShadow: on ? '0 0 10px color-mix(in oklab, var(--color-state-success) 60%, transparent)' : undefined,
              }}
            />
            <span>
              {labels?.[i] ?? `${name}${i}`}={v}
            </span>
          </span>
        )
      })}
    </div>
  )
}

function DecoderTool() {
  const u = useId()
  const [mode, setMode] = useState<DecMode>('decoder')
  const [n, setN] = useState(2)
  const [addr, setAddr] = useState<number[]>([0, 0, 0])
  const [en, setEn] = useState(1)
  const [enLow, setEnLow] = useState(false)
  const [low, setLow] = useState(false)
  const [d, setD] = useState(1)
  const [ins, setIns] = useState<number[]>(new Array<number>(8).fill(0))
  const a = addr.slice(0, n)
  const flip = (xs: number[], i: number) => xs.map((x, j) => (j === i ? 1 - x : x))
  const sizes = mode === 'decoder' ? [2, 3] : mode === 'demux' ? [1, 2, 3] : [2, 3]
  const sizeLabel = (k: number) => (mode === 'decoder' ? `${k}:${1 << k}` : mode === 'demux' ? `1:${1 << k}` : `${1 << k}:${k}`)
  let body: ReactNode
  let result = ''
  if (mode === 'decoder') {
    const out = decoder(a, en, low, enLow)
    const on = enabled(en, enLow)
    result = on ? `Address ${a.join('')} = ${num(a)}: output D${num(a)} is asserted (${low ? '0, active low' : '1'}); the others are ${low ? '1' : '0'}.` : `Disabled: every output is inactive (${low ? 'all 1' : 'all 0'}).`
    body = (
      <>
        <div className="lab-inputs" role="group" aria-label="Address inputs">
          {a.map((v, j) => (
            <Toggle key={j} label={`A${n - 1 - j} = ${v}`} on={!!v} onClick={() => setAddr(flip(addr, j))} />
          ))}
        </div>
        <div className="lab-inputs" role="group" aria-label="Enable and output polarity">
          <Toggle label={`${enLow ? 'Ē' : 'E'} = ${en}`} on={!!en} onClick={() => setEn(1 - en)} />
          <Toggle label={enLow ? 'enable active low' : 'enable active high'} on={enLow} onClick={() => setEnLow(!enLow)} />
          <Toggle label={low ? 'outputs active low' : 'outputs active high'} on={low} onClick={() => setLow(!low)} />
        </div>
        <Lamps name="D" values={out} lit={(v) => (low ? v === 0 : v === 1)} />
      </>
    )
  } else if (mode === 'demux') {
    const out = demux(d, a)
    result = `Select ${a.join('')} = ${num(a)}: the data bit D = ${d} appears on Y${num(a)}; every other output is 0. (A decoder whose enable carries the data is this DEMUX.)`
    body = (
      <>
        <div className="lab-inputs" role="group" aria-label="Data and select inputs">
          <Toggle label={`D = ${d}`} on={!!d} onClick={() => setD(1 - d)} />
          {a.map((v, j) => (
            <Toggle key={j} label={`S${n - 1 - j} = ${v}`} on={!!v} onClick={() => setAddr(flip(addr, j))} />
          ))}
        </div>
        <Lamps name="Y" values={out} lit={(v) => v === 1} />
      </>
    )
  } else {
    const N = 1 << n
    const xs = ins.slice(0, N)
    const active = xs.filter(Boolean).length
    const code = mode === 'encoder' ? encoder(xs) : priorityEncoder(xs).code
    const p = priorityEncoder(xs)
    if (mode === 'encoder') {
      result =
        active === 1
          ? `Exactly one input is active (D${xs.indexOf(1)}), so the code ${code.join('')} is its index.`
          : active === 0
            ? `No input active: the code reads ${code.join('')}, the same as D0 alone. A plain encoder cannot tell the two apart.`
            : `${active} inputs active: a plain encoder ORs their codes, giving ${code.join('')}. That is why priority encoders exist.`
    } else {
      result = p.valid ? `D${p.winner} wins (the highest active input): code ${code.join('')}, V = 1.` : 'No input active: V = 0 and the code is meaningless (shown as 0…0).'
    }
    body = (
      <>
        <div className="lab-inputs" role="group" aria-label="Encoder inputs">
          {xs.map((v, i) => (
            <span key={i} style={p.winner === i && mode === 'priority' ? { ...MARK, padding: 2 } : undefined}>
              <Toggle label={`D${i} = ${v}`} on={!!v} onClick={() => setIns(flip(ins, i))} />
            </span>
          ))}
        </div>
        <Lamps name="Y" values={code} lit={(v) => v === 1} labels={code.map((_, j) => `Y${n - 1 - j}`)} />
        {mode === 'priority' && <Lamps name="V" values={[p.valid]} lit={(v) => v === 1} labels={['V']} />}
        <p className="lab-hint">Output Y{n - 1} is the MSB of the code; the lamps read left to right as Y{n - 1} … Y0.</p>
      </>
    )
  }
  return (
    <div>
      <div className="lab-row">
        <div className="lab-row" role="group" aria-label="Circuit" style={{ margin: 0 }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={cn('lab-toggle', mode === m.id && 'is-on')}
              aria-pressed={mode === m.id}
              onClick={() => {
                setMode(m.id)
                if (m.id !== 'demux' && n === 1) setN(2)
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <label htmlFor={`${u}-size`}>Size</label>
        <select id={`${u}-size`} className="lab-select" value={n} onChange={(e) => setN(Number(e.target.value))}>
          {sizes.map((k) => (
            <option key={k} value={k}>
              {sizeLabel(k)}
            </option>
          ))}
        </select>
      </div>
      {body}
      <p className="lab-result" role="status" aria-live="polite">
        {result}
      </p>
    </div>
  )
}
