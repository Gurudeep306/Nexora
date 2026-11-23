/*
  Converter Bench (Digital Logic, Chapter 7 Live Lab). Two tabs:

    sar   a successive-approximation ADC: choose n (3–8 bits), V_ref and an
          input voltage (and optionally the ½-LSB offset); step or run the
          search one clock at a time: the trial bit, the DAC voltage, the
          comparator's verdict and whether the bit is kept or cleared, drawn
          as a chart of trial levels against V_in with the shrinking interval
          of possible codes; the final code, its voltage and the error
    dac   a current-switched R-2R ladder of n bits (1–8) into an inverting
          summing amplifier: toggle the bits (or slide the code) and read every
          node voltage and leg current, the reference current, I_out and V_o;
          the full staircase of all 2^n codes is drawn as an SVG

  All logic is in ./convLogic.ts (tested against the Python checks in
  content/gate-notes/_checks/dl/convlib.py), in exact fractions. Every control
  is a real button, select or input; tabs follow the WAI-ARIA pattern (arrow
  keys, roving tabindex); every drawing has a text alternative (a table or a
  label) and results are announced through an always-mounted live region.
  Colours come from the theme tokens only, so dark mode works.
*/
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'
import {
  DAC_PRESETS,
  SAR_PRESETS,
  bits as bitsOf,
  bstr,
  cmp,
  dec,
  div,
  fullScale,
  idealCode,
  ladder,
  lsb,
  mul,
  overRange,
  parseQ,
  q,
  qNum,
  sar,
  staircase,
  type Q,
} from './convLogic'
import { Select } from '@/components/ui'

export type BenchTab = 'sar' | 'dac'

const TABS: { id: BenchTab; label: string }[] = [
  { id: 'sar', label: 'SAR ADC' },
  { id: 'dac', label: 'R-2R DAC' },
]

/** A value for reading: up to 4 decimals, a true minus sign. */
const fmt = (x: Q, places = 4) => dec(x, places).replace('-', '−')

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function ConverterBench({ tab: initial = 'sar', title }: { tab?: string; title?: string }) {
  const [tab, setTab] = useState<BenchTab>(initial === 'dac' ? 'dac' : 'sar')
  const uid = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, k: number) => {
    const last = TABS.length - 1
    const to = e.key === 'ArrowRight' ? (k === last ? 0 : k + 1) : e.key === 'ArrowLeft' ? (k === 0 ? last : k - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1
    if (to < 0) return
    e.preventDefault()
    setTab(TABS[to].id)
    refs.current[to]?.focus()
  }
  return (
    <div className="lab">
      <div className="lab-head">
        <span className="lab-kicker">Live Lab</span>
        <span className="lab-title">{title || 'Converter Bench'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Converter Bench tools">
        {TABS.map((t, k) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[k] = el
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${uid}-panel`}
            tabIndex={tab === t.id ? 0 : -1}
            className={cn('lab-tab', tab === t.id && 'is-on')}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onKey(e, k)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="lab-panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
        {tab === 'sar' ? <SarTool /> : <DacTool />}
      </div>
    </div>
  )
}

/* ── SAR ADC ──────────────────────────────────────────────────────────── */

const BIT_CHOICES = [3, 4, 5, 6, 7, 8]

function SarTool() {
  const u = useId()
  const [n, setN] = useState(4)
  const [vrefText, setVrefText] = useState('10')
  const [vinText, setVinText] = useState('6.4')
  const [offset, setOffset] = useState(false)
  const [k, setK] = useState(0)
  const [playing, setPlaying] = useState(false)

  const { vref, vin, vrefOk, vinOk, res } = useMemo(() => {
    const vr = parseQ(vrefText)
    const vi = parseQ(vinText)
    const rOk = vr !== null && cmp(vr, q(0)) > 0 && cmp(vr, q(1000)) <= 0
    const iOk = vi !== null && cmp(vi, q(0)) >= 0 && cmp(vi, q(1000)) <= 0
    return { vref: vr, vin: vi, vrefOk: rOk, vinOk: iOk, res: rOk && iOk ? sar(n, vr!, vi!, offset) : null }
  }, [vrefText, vinText, n, offset])
  const ok = vrefOk && vinOk

  useEffect(() => {
    if (!playing || !res || k >= n) return
    const id = window.setTimeout(() => {
      setK(k + 1)
      if (k + 1 >= n) setPlaying(false)
    }, 750)
    return () => window.clearTimeout(id)
  }, [playing, k, n, res])

  const restart = () => {
    setK(0)
    setPlaying(false)
  }
  const run = () => {
    if (!res) return
    if (reduceMotion()) {
      setK(n)
      return
    }
    if (k >= n) setK(0)
    setPlaying(true)
  }

  const last = res && k > 0 ? res.steps[k - 1] : null
  const code = last ? last.code : 0
  const sentence = (i: number) => {
    const st = res!.steps[i]
    return (
      `Clock ${i + 1}: set bit ${st.bit}, trial ${bstr(st.trial, n)} = ${st.trial}, DAC ${fmt(st.v)} V. ` +
      `V_in ${fmt(vin!)} V ${st.keep ? '≥' : '<'} ${fmt(st.v)} V, so bit ${st.bit} is ${st.keep ? 'kept' : 'cleared'}; register ${bstr(st.code, n)}.`
    )
  }
  const over = res && vin && vref ? overRange(n, vref, vin, offset) : false
  const done = !!res && k >= n

  return (
    <div>
      <div className="lab-row">
        <label htmlFor={`${u}-n`}>Bits</label>
        <Select
          id={`${u}-n`}
          className="lab-select"
          value={n}
          onChange={(e) => {
            setN(Number(e.target.value))
            restart()
          }}
        >
          {BIT_CHOICES.map((b) => (
            <option key={b} value={b}>
              {b} bits
            </option>
          ))}
        </Select>
        <label htmlFor={`${u}-vref`}>V_ref (V)</label>
        <input
          id={`${u}-vref`}
          className="lab-input cb-num"
          inputMode="decimal"
          value={vrefText}
          aria-invalid={!vrefOk}
          aria-describedby={`${u}-hint ${u}-warn`}
          onChange={(e) => {
            setVrefText(e.target.value)
            restart()
          }}
        />
        <label htmlFor={`${u}-vin`}>V_in (V)</label>
        <input
          id={`${u}-vin`}
          className="lab-input cb-num"
          inputMode="decimal"
          value={vinText}
          aria-invalid={!vinOk}
          aria-describedby={`${u}-hint ${u}-warn`}
          onChange={(e) => {
            setVinText(e.target.value)
            restart()
          }}
        />
        <button
          type="button"
          className={cn('lab-toggle cb-offset', offset && 'is-on')}
          aria-pressed={offset}
          onClick={() => {
            setOffset(!offset)
            restart()
          }}
        >
          ½-LSB offset
        </button>
      </div>
      <p className="lab-hint" id={`${u}-hint`}>
        Decimal volts (V_ref above 0, V_in 0 or more). One LSB is V_ref / 2^n
        {res ? ` = ${fmt(res.lsb, 6)} V` : ''}. The comparator keeps a trial bit when V_in ≥ V_DAC (a tie keeps it)
        {offset ? '; with the ½-LSB offset the DAC sits half a step low, so the result rounds to the nearest code' : ''}.
      </p>
      <p className="lab-warn" id={`${u}-warn`} role="alert">
        {ok ? '' : !vrefOk ? 'Enter V_ref as a decimal number above 0 (at most 1000).' : 'Enter V_in as a decimal number from 0 to 1000.'}
      </p>
      <div className="lab-inputs" role="group" aria-label="Examples">
        {SAR_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="lab-btn"
            onClick={() => {
              setN(p.n)
              setVrefText(p.vref)
              setVinText(p.vin)
              setOffset(p.offset)
              restart()
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="lab-row">
        <button type="button" className="lab-btn lab-btn--main" disabled={!res || k >= n} onClick={() => (setPlaying(false), setK((x) => Math.min(n, x + 1)))}>
          Step (one clock)
        </button>
        <button type="button" className="lab-btn" disabled={!res} onClick={() => (playing ? setPlaying(false) : run())}>
          {playing ? 'Pause' : done ? 'Run again' : 'Run'}
        </button>
        <button type="button" className="lab-btn" disabled={!res || k === 0} onClick={restart}>
          Clear register
        </button>
        <button type="button" className="lab-btn" disabled={!res || k >= n} onClick={() => (setPlaying(false), setK(n))}>
          End
        </button>
      </div>
      {res && (
        <>
          <div className="lab-strips" tabIndex={0} role="img" aria-label={`Successive-approximation register after ${k} of ${n} clocks: ${bstr(code, n)}`}>
            <div className="lab-strip" aria-hidden="true">
              <span className="lab-strip-label">bit</span>
              {Array.from({ length: n }, (_, i) => (
                <span key={i} className="lab-cell lab-cell--head">
                  {n - 1 - i}
                </span>
              ))}
            </div>
            <div className="lab-strip" aria-hidden="true">
              <span className="lab-strip-label">register</span>
              {bitsOf(code, n).map((b, i) => {
                const bit = n - 1 - i
                const next = k < n && bit === n - 1 - k
                const decided = bit > n - 1 - k
                return (
                  <span key={i} className={cn('lab-cell', b === 1 && 'is-one', next && 'is-pending', !decided && !next && 'cb-undecided')}>
                    {next ? '?' : decided ? b : '·'}
                  </span>
                )
              })}
              <span className="lab-strip-list">
                {k < n ? `next: try bit ${n - 1 - k}` : 'done'} · clock {k} of {n}
              </span>
            </div>
          </div>
          <p className="cb-now">{last ? sentence(k - 1) : `Register cleared. Step 1 will set the MSB, bit ${n - 1}: the DAC then gives half of V_ref${offset ? ' minus half an LSB' : ''}.`}</p>
          <SarChart res={res} k={k} vin={vin!} vref={vref!} />
          <div className="lab-tt-wrap" tabIndex={0} role="group" aria-label="Table, scrolls sideways">
            <table className="lab-tt cb-table">
              <caption className="sr-only">Successive-approximation steps so far</caption>
              <thead>
                <tr>
                  <th scope="col">clock</th>
                  <th scope="col">bit</th>
                  <th scope="col">trial</th>
                  <th scope="col">V_DAC (V)</th>
                  <th scope="col">V_in ≥ V_DAC?</th>
                  <th scope="col">bit is</th>
                  <th scope="col">register</th>
                </tr>
              </thead>
              <tbody>
                {res.steps.slice(0, k).map((st, i) => (
                  <tr key={i} className={cn(i === k - 1 && 'is-current')}>
                    <td>{i + 1}</td>
                    <td>{st.bit}</td>
                    <td>{bstr(st.trial, n)}</td>
                    <td>{fmt(st.v)}</td>
                    <td className={st.keep ? 'cb-yes' : 'cb-no'}>{st.keep ? 'yes' : 'no'}</td>
                    <td>{st.keep ? 'kept' : 'cleared'}</td>
                    <td>{bstr(st.code, n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={cn('lab-result', done && (over ? 'is-bad' : 'is-good'))}>
            {done
              ? `Code ${bstr(res.code, n)} = ${res.code} after ${n} clocks: ${res.code} × ${fmt(res.lsb, 6)} = ${fmt(res.vq)} V. Error V_in − V_q = ${fmt(res.err)} V = ${fmt(
                  res.errLsb,
                  3,
                )} LSB${over ? ` (over range: V_in ≥ ${offset ? 'V_ref − ½ LSB' : 'V_ref'}, so the code saturates at ${2 ** n - 1} and the error exceeds the usual bound)` : offset ? ' (rounded: within ±½ LSB)' : ' (truncated: 0 ≤ error < 1 LSB)'}. Ideal ${offset ? 'rounded' : 'floor'} code: ${idealCode(n, vref!, vin!, offset)}.`
              : `${n - k} clock${n - k === 1 ? '' : 's'} to go. A SAR always needs exactly n = ${n} clocks, whatever V_in is.`}
          </p>
        </>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {res && k > 0 ? sentence(k - 1) + (done ? ` Done: code ${bstr(res.code, n)} = ${res.code}, ${fmt(res.vq)} volts, error ${fmt(res.err)} volts.` : '') : ''}
      </p>
    </div>
  )
}

function SarChart({ res, k, vin, vref }: { res: NonNullable<ReturnType<typeof sar>>; k: number; vin: Q; vref: Q }) {
  const n = res.n
  const W = 360
  const H = 210
  const L = 44
  const R = 10
  const T = 12
  const B = 30
  const top = cmp(vin, vref) > 0 ? vin : vref
  const cw = (W - L - R) / n
  const y = (v: Q) => T + (H - T - B) * (1 - qNum(div(v, top)))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => mul(vref, q(Math.round(f * 4), 4)))
  return (
    <svg
      className="lab-svg cb-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Chart: V_in ${fmt(vin)} V as a dashed line; trial DAC levels for clocks 1 to ${k}: ${res.steps
        .slice(0, k)
        .map((s) => `${fmt(s.v)} V ${s.keep ? 'kept' : 'cleared'}`)
        .join(', ') || 'none yet'}.`}
    >
      {ticks.map((t, i) => (
        <g key={i}>
          <line className="cb-grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
          <text className="lab-svg-small" x={L - 4} y={y(t) + 3} textAnchor="end">
            {fmt(t, 2)}
          </text>
        </g>
      ))}
      {res.steps.map((st, i) => {
        const x0 = L + i * cw + 3
        const x1 = L + (i + 1) * cw - 3
        const [lo, hi] = st.range
        const ylo = y(mul(q(lo), res.lsb))
        const yhi = y(mul(q(hi), res.lsb))
        const shown = i < k
        const next = i === k
        return (
          <g key={i}>
            {(shown || next) && <rect className={cn('cb-band', next && 'is-next')} x={x0} y={yhi} width={x1 - x0} height={Math.max(1, ylo - yhi)} rx={3} />}
            {shown && <line className={cn('cb-level', st.keep ? 'is-keep' : 'is-clear')} x1={x0} x2={x1} y1={y(st.v)} y2={y(st.v)} />}
            <text className="lab-svg-small" x={(x0 + x1) / 2} y={H - B + 14} textAnchor="middle">
              {i + 1}
            </text>
          </g>
        )
      })}
      <line className="cb-vin" x1={L} x2={W - R} y1={y(vin)} y2={y(vin)} />
      <text className="lab-svg-small cb-vin-label" x={L + 2} y={y(vin) - 4}>
        V_in
      </text>
      <text className="lab-svg-small" x={(L + W - R) / 2} y={H - 4} textAnchor="middle">
        clock (shaded: codes still possible)
      </text>
    </svg>
  )
}

/* ── R-2R DAC ─────────────────────────────────────────────────────────── */

/** A value above 0 and at most max. */
const pos = (x: Q | null, max: number) => x !== null && cmp(x, q(0)) > 0 && cmp(x, q(max)) <= 0

function DacTool() {
  const u = useId()
  const [n, setN] = useState(3)
  const [vrefText, setVrefText] = useState('5')
  const [rText, setRText] = useState('2')
  const [rfText, setRfText] = useState('2')
  const [code, setCode] = useState(1)

  const { vref, r, rf, ok, stairs } = useMemo(() => {
    const [a, b, c] = [parseQ(vrefText), parseQ(rText), parseQ(rfText)]
    const good = pos(a, 1000) && pos(b, 10000) && pos(c, 10000)
    return { vref: a, r: b, rf: c, ok: good, stairs: good ? staircase(n, a!, b!, c!) : null }
  }, [n, vrefText, rText, rfText])
  const L = ok ? ladder(n, code, vref!, r!, rf!) : null

  const resize = (k: number) => {
    setN(k)
    setCode((c) => c % 2 ** k)
  }
  const flip = (bit: number) => setCode((c) => c ^ (1 << bit))
  const describe = () => (L ? `Code ${bstr(code, n)} = ${code}: I_out ${fmt(L.iout)} mA, V_o ${fmt(L.vo)} V.` : '')

  return (
    <div>
      <div className="lab-row">
        <label htmlFor={`${u}-n`}>Bits</label>
        <Select id={`${u}-n`} className="lab-select" value={n} onChange={(e) => resize(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((b) => (
            <option key={b} value={b}>
              {b} bit{b > 1 ? 's' : ''}
            </option>
          ))}
        </Select>
        <label htmlFor={`${u}-vref`}>V_ref (V)</label>
        <input id={`${u}-vref`} className="lab-input cb-num" inputMode="decimal" value={vrefText} aria-invalid={!pos(vref, 1000)} aria-describedby={`${u}-warn`} onChange={(e) => setVrefText(e.target.value)} />
        <label htmlFor={`${u}-r`}>R (kΩ)</label>
        <input id={`${u}-r`} className="lab-input cb-num" inputMode="decimal" value={rText} aria-invalid={!pos(r, 10000)} aria-describedby={`${u}-warn`} onChange={(e) => setRText(e.target.value)} />
        <label htmlFor={`${u}-rf`}>R_f (kΩ)</label>
        <input id={`${u}-rf`} className="lab-input cb-num" inputMode="decimal" value={rfText} aria-invalid={!pos(rf, 10000)} aria-describedby={`${u}-warn`} onChange={(e) => setRfText(e.target.value)} />
      </div>
      <p className="lab-warn" id={`${u}-warn`} role="alert">
        {ok ? '' : 'Enter V_ref, R and R_f as decimal numbers above 0.'}
      </p>
      <div className="lab-inputs" role="group" aria-label="Examples">
        {DAC_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="lab-btn"
            onClick={() => {
              setN(p.n)
              setVrefText(p.vref)
              setRText(p.r)
              setRfText(p.rf)
              setCode(p.code)
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="lab-row">
        <div className="lab-inputs cb-bits" role="group" aria-label="Input bits, most significant first">
          {Array.from({ length: n }, (_, i) => {
            const bit = n - 1 - i
            const on = (code >> bit) & 1
            return (
              <button key={bit} type="button" className={cn('lab-toggle', on && 'is-on')} aria-pressed={!!on} onClick={() => flip(bit)}>
                b{bit}={on}
              </button>
            )
          })}
        </div>
        <label htmlFor={`${u}-code`}>Code</label>
        <input
          id={`${u}-code`}
          type="range"
          className="cb-range"
          min={0}
          max={2 ** n - 1}
          value={code}
          aria-valuetext={describe()}
          onChange={(e) => setCode(Number(e.target.value))}
        />
        <span className="cb-code">
          {bstr(code, n)} = {code}
        </span>
      </div>
      {L && stairs && (
        <>
          <Ladder L={L} />
          <div className="lab-tt-wrap" tabIndex={0} role="group" aria-label="Table, scrolls sideways">
            <table className="lab-tt cb-table">
              <caption className="sr-only">Node voltages and leg currents of the ladder</caption>
              <thead>
                <tr>
                  <th scope="col">node</th>
                  <th scope="col">voltage (V)</th>
                  <th scope="col">2R leg current (mA)</th>
                  <th scope="col">bit</th>
                  <th scope="col">leg goes to</th>
                </tr>
              </thead>
              <tbody>
                {L.volts.map((v, i) => (
                  <tr key={i} className={cn(L.bits[i] === 1 && 'is-current')}>
                    <th scope="row">A{n - 1 - i}</th>
                    <td>{fmt(v, 6)}</td>
                    <td>{fmt(L.legs[i], 6)}</td>
                    <td>{L.bits[i]}</td>
                    <td>{L.bits[i] ? 'OUT (virtual ground)' : 'ground'}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">terminator</th>
                  <td>{fmt(L.volts[n - 1], 6)}</td>
                  <td>{fmt(L.term, 6)}</td>
                  <td>–</td>
                  <td>ground</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="lab-result is-good">
            I_ref = V_ref / R = {fmt(L.iref, 6)} mA (the same for every code). I_out = {fmt(L.iout, 6)} mA, I_gnd = {fmt(L.ignd, 6)} mA. V_o = −R_f · I_out ={' '}
            {fmt(L.vo, 6)} V = −V_ref · (R_f / R) · {code}/{2 ** n}.
          </p>
          <Staircase stairs={stairs} code={code} n={n} onPick={setCode} vref={vref!} r={r!} rf={rf!} />
        </>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {describe()}
      </p>
    </div>
  )
}

function Ladder({ L }: { L: ReturnType<typeof ladder> }) {
  const n = L.n
  const DX = 92
  const X0 = 70
  const W = Math.max(360, X0 + n * DX + 50)
  const H = 196
  const yr = 40
  const x = (i: number) => X0 + i * DX
  const xt = x(n - 1) + DX * 0.62
  return (
    <div className="cb-scroll" tabIndex={0} role="group" aria-label="Table, scrolls sideways">
      <svg
        className="cb-ladder"
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`R-2R ladder with ${n} nodes; the legs of bits ${L.bits
          .map((b, i) => (b ? n - 1 - i : null))
          .filter((b) => b !== null)
          .join(', ') || 'none'} go to OUT, the others to ground. The table below lists every voltage and current.`}
      >
        <text className="lab-svg-small" x={6} y={yr - 8}>
          V_ref
        </text>
        <line className="cb-wire" x1={6} x2={x(0)} y1={yr} y2={yr} />
        <text className="lab-svg-small cb-accent" x={6} y={yr + 16}>
          {fmt(L.iref, 4)} mA
        </text>
        {L.volts.map((v, i) => {
          const xi = x(i)
          const on = L.bits[i] === 1
          return (
            <g key={i}>
              {i < n - 1 && (
                <>
                  <line className="cb-wire" x1={xi} x2={xi + DX} y1={yr} y2={yr} />
                  <rect className="cb-res" x={xi + DX / 2 - 16} y={yr - 8} width={32} height={16} rx={3} />
                  <text className="lab-svg-small" x={xi + DX / 2} y={yr + 4} textAnchor="middle">
                    R
                  </text>
                </>
              )}
              <circle className="cb-node" cx={xi} cy={yr} r={3.5} />
              <text className="lab-svg-small" x={xi} y={yr - 12} textAnchor="middle">
                A{n - 1 - i} {fmt(v, 4)} V
              </text>
              <line className="cb-wire" x1={xi} x2={xi} y1={yr} y2={yr + 70} />
              <rect className="cb-res" x={xi - 9} y={yr + 18} width={18} height={34} rx={3} />
              <text className="lab-svg-small" x={xi} y={yr + 39} textAnchor="middle">
                2R
              </text>
              <text className="lab-svg-small cb-accent" x={xi + 12} y={yr + 38}>
                {fmt(L.legs[i], 4)}
              </text>
              <line className={cn('cb-wire', on ? 'is-on' : 'is-off')} x1={xi} x2={xi} y1={yr + 70} y2={yr + 118} />
              <line className={cn('cb-wire', on ? 'is-off' : 'is-gnd')} x1={xi} x2={xi + 22} y1={yr + 70} y2={yr + 70} />
              <text className="lab-svg-small" x={xi + 25} y={yr + 74}>
                gnd
              </text>
              <text className={cn('lab-svg-small', on && 'cb-accent')} x={xi - 4} y={yr + 96} textAnchor="end">
                b{n - 1 - i}={L.bits[i]}
              </text>
            </g>
          )
        })}
        <line className="cb-wire" x1={x(n - 1)} x2={xt} y1={yr} y2={yr} />
        <line className="cb-wire" x1={xt} x2={xt} y1={yr} y2={yr + 70} />
        <rect className="cb-res" x={xt - 9} y={yr + 18} width={18} height={34} rx={3} />
        <text className="lab-svg-small" x={xt} y={yr + 39} textAnchor="middle">
          2R
        </text>
        <text className="lab-svg-small" x={xt} y={yr + 84} textAnchor="middle">
          gnd
        </text>
        <line className="cb-wire is-out" x1={6} x2={x(n - 1)} y1={yr + 118} y2={yr + 118} />
        <text className="lab-svg-small" x={6} y={yr + 134}>
          OUT (0 V) → amplifier: I_out {fmt(L.iout, 4)} mA, V_o {fmt(L.vo, 4)} V
        </text>
        <text className="lab-svg-small" x={6} y={H - 6}>
          currents in mA
        </text>
      </svg>
    </div>
  )
}

function Staircase({ stairs, code, n, onPick, vref, r, rf }: { stairs: Q[]; code: number; n: number; onPick: (c: number) => void; vref: Q; r: Q; rf: Q }) {
  const W = 360
  const H = 200
  const L = 46
  const R = 10
  const T = 12
  const B = 30
  const N = 2 ** n
  const top = mul(vref, div(rf, r))
  const cw = (W - L - R) / N
  const y = (v: Q) => T + (H - T - B) * (1 - qNum(div(v, top)))
  const mag = (v: Q) => mul(v, q(-1))
  let d = ''
  stairs.forEach((v, c) => {
    const yy = y(mag(v))
    d += `${c ? 'L' : 'M'}${L + c * cw},${yy}L${L + (c + 1) * cw},${yy}`
  })
  const fs = fullScale(n, vref)
  const ticks = [q(0), div(top, q(2)), top]
  const pick = (e: MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    const c = Math.floor((px - L) / cw)
    if (c >= 0 && c < N) onPick(c)
  }
  const step = lsb(n, top)
  return (
    <figure className="cb-figure">
      <svg
        className="lab-svg cb-stairs"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Staircase of |V_o| for all ${N} codes: from 0 up to ${fmt(mag(stairs[N - 1]))} V in steps of ${fmt(step)} V; code ${code} gives ${fmt(mag(stairs[code]))} V.`}
        onClick={pick}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line className="cb-grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
            <text className="lab-svg-small" x={L - 4} y={y(t) + 3} textAnchor="end">
              {fmt(t, 2)}
            </text>
          </g>
        ))}
        <path className="cb-step" d={d} />
        <line className="cb-guide" x1={L + (code + 0.5) * cw} x2={L + (code + 0.5) * cw} y1={y(mag(stairs[code]))} y2={H - B} />
        <circle className="cb-marker" cx={L + (code + 0.5) * cw} cy={y(mag(stairs[code]))} r={4} />
        <text className="lab-svg-small" x={L} y={H - B + 14}>
          0
        </text>
        <text className="lab-svg-small" x={W - R} y={H - B + 14} textAnchor="end">
          {N - 1}
        </text>
        <text className="lab-svg-small" x={(L + W - R) / 2} y={H - 4} textAnchor="middle">
          code → |V_o| (V)
        </text>
      </svg>
      <figcaption className="lab-hint">
        {N} codes, one step = V_ref · (R_f / R) / 2^n = {fmt(step, 6)} V. The top step is {fmt(mag(stairs[N - 1]), 6)} V, one step short of V_ref · R_f / R ={' '}
        {fmt(top, 6)} V{cmp(r, rf) === 0 ? ` (with R_f = R that is the full scale V_ref (1 − 2^−n) = ${fmt(fs, 6)} V)` : ''}. Click a step or use the slider.
      </figcaption>
    </figure>
  )
}
