/*
  Counter & FSM Simulator (Digital Logic, Chapter 6 Live Lab). Two tabs:

    counter  a ring, Johnson or LFSR register, a ripple up / down counter
             (with t_pd: the transient states between clocks, and an
             optional asynchronous clear) or a synchronous counter designed
             from a sequence with D, T or JK flip-flops (the minimal
             equations of every input, unused states as don't-cares or forced
             to 0). Step, run and reset; the state readout, the Q waveforms
             over the clocks so far, the full graph of all 2ⁿ states with the
             main cycle highlighted, and the self-start checker naming every
             lock-out cycle. For ring and Johnson counters the main cycle is
             the one through the standard start (a single 1 at the left, all
             0s) whatever the initial state, and the checker says which cycle
             the initial state is on. An LFSR's serial input is a bit string
             fed one bit per clock, then 0s.
    fsm      an editable Mealy or Moore state table (or a preset: the
             overlapping 101 detector, the serial 2's complementer, the GATE
             1996 and 2025 tables, or any sequence detector); feed an input
             string bit by bit and watch the state graph and the output
             string; Minimise shows the partition-refinement rounds and the
             merged table.

  All logic is in ./seqLogic.ts (the twin of
  content/gate-notes/_checks/dl/seqlib.py, checked by l6_lab_vectors.py and
  tests/gate-notes.test.js). Every control is a real button, select or input
  with a label; tabs follow the WAI-ARIA pattern; the graphs have text
  alternatives; changes are announced through a polite live region. Colours
  come from the theme tokens only, so dark mode works.
*/
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import {
  FSM_PRESETS,
  MAX_TAPS,
  autonomousCycles,
  binText,
  bits,
  cycleFrom,
  designCounter,
  designedStep,
  detector,
  fromTable,
  intStep,
  johnsonStep,
  lfsrStep,
  merged,
  next,
  partitions,
  reachableMachine,
  renamed,
  rippleEvents,
  ringStep,
  run,
  selfStarting,
  standardStart,
  sx,
  tableOf,
  val,
  type CounterDesign,
  type Fsm,
  type FsmRow,
} from './seqLogic'

export type CounterTab = 'counter' | 'fsm'

const TABS: { id: CounterTab; label: string }[] = [
  { id: 'counter', label: 'Counters and registers' },
  { id: 'fsm', label: 'State machine' },
]

export default function CounterFsm({ tab: initial = 'counter', title }: { tab?: string; title?: string }) {
  const [tab, setTab] = useState<CounterTab>(initial === 'fsm' ? 'fsm' : 'counter')
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
        <span className="lab-title">{title || 'Counter & FSM Simulator'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Counter and FSM Simulator tools">
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
        {tab === 'counter' ? <CounterTool /> : <FsmTool />}
      </div>
    </div>
  )
}

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* ── Counters and registers ───────────────────────────────────────────── */

type CKind = 'ring' | 'johnson' | 'lfsr' | 'up' | 'down' | 'design'
type FfKind = 'D' | 'T' | 'JK'

const CKINDS: [CKind, string][] = [
  ['ring', 'Ring counter'],
  ['johnson', 'Johnson (twisted ring)'],
  ['lfsr', 'LFSR'],
  ['up', 'Ripple up counter'],
  ['down', 'Ripple down counter'],
  ['design', 'Synchronous, designed from a sequence'],
]

interface Machine {
  n: number
  step: (s: number) => number
  main: number[]
  design?: CounterDesign
  ripple?: { tpd: number; down: boolean; clear: number | null }
  error?: string
}

function parseSeq(text: string): { seq: number[] | null; error: string } {
  const parts = text.split(/[\s,;→>-]+/).filter(Boolean)
  if (parts.length < 2) return { seq: null, error: 'Enter at least two values, separated by commas.' }
  const seq = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : NaN))
  if (seq.some((v) => Number.isNaN(v))) return { seq: null, error: 'Use whole numbers only (e.g. 0, 3, 5, 6).' }
  if (seq.some((v) => v > 31)) return { seq: null, error: 'Values must be at most 31 (five flip-flops).' }
  if (new Set(seq).size !== seq.length) return { seq: null, error: 'Values must be distinct (a repeated value needs an extra state bit).' }
  return { seq, error: '' }
}

const rippleOf = (n: number, tpd: number, down: boolean, clear: number | null, s: number) =>
  rippleEvents(n, tpd, [0], { start: s, down, clear: clear === null ? null : (q) => q === clear })

/** The machine's own next-state map; for an LFSR this is the map with serial input 0 (the input after the entered bits). */
function buildMachine(kind: CKind, width: number, tapsKey: string, tpd: number, clear: number | null, seqKey: string, ff: FfKind, unused: 'dc' | '0'): Machine {
  const n = width
  // Ring and Johnson: the main cycle is the cycle of the standard start, whatever the initial state.
  if (kind === 'ring' || kind === 'johnson') {
    const step = intStep(n, kind === 'ring' ? ringStep : johnsonStep)
    return { n, step, main: cycleFrom(step, val(standardStart(kind, n))).cycle }
  }
  if (kind === 'lfsr') {
    const t = tapsKey ? tapsKey.split(',').map(Number) : []
    return { n, step: intStep(n, (r) => lfsrStep(r, t, 0)), main: [] }
  }
  if (kind === 'up' || kind === 'down') {
    const down = kind === 'down'
    const c = down ? null : clear
    return { n, step: (s) => rippleOf(n, tpd, down, c, s).at(-1)![1], main: [], ripple: { tpd, down, clear: c } }
  }
  if (!seqKey) return { n: 2, step: (s) => s, main: [], error: 'no sequence' }
  const seq = seqKey.split(',').map(Number)
  const design = designCounter(seq, ff, null, unused === 'dc' ? 'dc' : 0)
  return { n: design.n, step: designedStep(design, ff), main: seq, design }
}

function CounterTool() {
  const u = useId()
  const [kind, setKind] = useState<CKind>('ring')
  const [width, setWidth] = useState(4)
  const [initRaw, setInit] = useState<number | null>(null)
  const [taps, setTaps] = useState<number[]>(MAX_TAPS[4]!)
  const [serialText, setSerial] = useState('')
  const [tpd, setTpd] = useState(1)
  const [clear, setClear] = useState<number | null>(null)
  const [seqText, setSeqText] = useState('0, 3, 5, 6')
  const [ff, setFf] = useState<FfKind>('JK')
  const [unused, setUnused] = useState<'dc' | '0'>('dc')
  const [runKey, setRunKey] = useState<string | null>(null)

  const parsed = useMemo(() => parseSeq(seqText), [seqText])
  const seqKey = parsed.seq ? parsed.seq.join(',') : ''
  const tapsKey = taps.join(',')
  const machine = useMemo(() => buildMachine(kind, width, tapsKey, tpd, clear, seqKey, ff, unused), [kind, width, tapsKey, tpd, clear, seqKey, ff, unused])
  const serial = kind === 'lfsr' ? serialText : ''

  const n = machine.n
  const size = 1 << n
  const defaultInit = kind === 'ring' ? 1 << (n - 1) : kind === 'lfsr' ? 1 << (n - 1) : kind === 'design' && parsed.seq ? parsed.seq[0]! : 0
  const init = initRaw !== null && initRaw < size ? initRaw : defaultInit
  const fixedMain = machine.design || kind === 'ring' || kind === 'johnson'
  const main = fixedMain ? machine.main : cycleFrom(machine.step, init).cycle
  const all = useMemo(() => Array.from({ length: size }, (_, s) => s), [size])
  const cycles = useMemo(() => autonomousCycles(machine.step, all), [machine, all])
  const selfStart = selfStarting(machine.step, all, main)
  const mainSet = new Set(main)
  const lockouts = cycles.filter((c) => !c.every((s) => mainSet.has(s)))
  // Where the chosen initial state ends up (ring and Johnson: its cycle need not be the main one).
  const initRun = cycleFrom(machine.step, init)
  const initLock = lockouts.findIndex((c) => c.includes(initRun.cycle[0]!))

  // History of states, reset whenever the circuit or the initial state changes.
  const key = `${kind}|${n}|${tapsKey}|${serial}|${tpd}|${clear}|${seqKey}|${ff}|${unused}|${init}`
  const [hist, setHist] = useState<{ key: string; states: number[]; clocks: number }>({ key, states: [init], clocks: 0 })
  const states = hist.key === key ? hist.states : [init]
  const clocks = hist.key === key ? hist.clocks : 0
  const cur = states[states.length - 1]!
  const running = runKey === key
  // The serial input of clock k (0-based): the k-th entered bit, then 0s.
  const serialBit = (k: number) => (k < serial.length ? Number(serial[k]) : 0)
  const stepAt = (s: number, k: number) => (kind === 'lfsr' && k < serial.length ? val(lfsrStep(bits(s, n), taps, serialBit(k))) : machine.step(s))
  const advance = () =>
    setHist((h) => {
      const st = h.key === key ? h.states : [init]
      const k = h.key === key ? h.clocks : 0
      return { key, states: [...st, stepAt(st[st.length - 1]!, k)].slice(-200), clocks: k + 1 }
    })
  const advanceRef = useRef(advance)
  useEffect(() => {
    advanceRef.current = advance
  })
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => advanceRef.current(), reduceMotion() ? 1200 : 650)
    return () => window.clearInterval(id)
  }, [running])

  const fmt = (s: number) => binText(s, n)
  const lastTrans = machine.ripple && states.length > 1 ? rippleOf(n, machine.ripple.tpd, machine.ripple.down, machine.ripple.clear, states[states.length - 2]!) : null
  const cycleText = (c: number[]) => [...c, c[0]!].map(fmt).join(' → ')

  const resetAll = (fn: () => void) => {
    fn()
    setInit(null)
  }

  return (
    <div>
      <div className="lab-row">
        <label htmlFor={`${u}-kind`}>Circuit</label>
        <select id={`${u}-kind`} className="lab-select" value={kind} onChange={(e) => resetAll(() => setKind(e.target.value as CKind))}>
          {CKINDS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        {kind !== 'design' && (
          <>
            <label htmlFor={`${u}-n`}>Width</label>
            <select
              id={`${u}-n`}
              className="lab-select"
              value={width}
              onChange={(e) =>
                resetAll(() => {
                  const k = Number(e.target.value)
                  setWidth(k)
                  setTaps(MAX_TAPS[k]!)
                  setClear(null)
                })
              }
            >
              {[2, 3, 4, 5].map((k) => (
                <option key={k} value={k}>
                  {k} flip-flops
                </option>
              ))}
            </select>
          </>
        )}
        <label htmlFor={`${u}-init`}>Initial state</label>
        <select id={`${u}-init`} className="lab-select" value={init} onChange={(e) => setInit(Number(e.target.value))}>
          {all.map((s) => (
            <option key={s} value={s}>
              {fmt(s)} ({s})
            </option>
          ))}
        </select>
      </div>

      {kind === 'lfsr' && (
        <div className="lab-row">
          <fieldset className="cf-fieldset">
            <legend>Taps (cells XORed into the new leftmost bit)</legend>
            {Array.from({ length: n }, (_, i) => (
              <label key={i} className="cf-check">
                <input
                  type="checkbox"
                  checked={taps.includes(i)}
                  onChange={(e) => setTaps((t) => (e.target.checked ? [...t, i].sort((a, b) => a - b) : t.filter((x) => x !== i)))}
                />
                Q{n - 1 - i}
              </label>
            ))}
          </fieldset>
          <label htmlFor={`${u}-din`}>Serial input</label>
          <input
            id={`${u}-din`}
            className="lab-input cf-serial"
            value={serialText}
            onChange={(e) => setSerial(e.target.value.replace(/[^01]/g, '').slice(0, 32))}
            aria-describedby={`${u}-dinhint`}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="0"
          />
          <span id={`${u}-dinhint`} className="lab-hint">
            bits fed one per clock, first bit first, then 0s
          </span>
          <button type="button" className="lab-btn" onClick={() => setTaps(MAX_TAPS[n]!)}>
            Maximal-length taps
          </button>
        </div>
      )}

      {(kind === 'up' || kind === 'down') && (
        <div className="lab-row">
          <label htmlFor={`${u}-tpd`}>t_pd per stage</label>
          <select id={`${u}-tpd`} className="lab-select" value={tpd} onChange={(e) => setTpd(Number(e.target.value))}>
            {[1, 2, 3].map((k) => (
              <option key={k} value={k}>
                {k} ns
              </option>
            ))}
          </select>
          {kind === 'up' && (
            <>
              <label htmlFor={`${u}-clr`}>Asynchronous clear at</label>
              <select id={`${u}-clr`} className="lab-select" value={clear ?? ''} onChange={(e) => setClear(e.target.value === '' ? null : Number(e.target.value))}>
                <option value="">none</option>
                {all.slice(2).map((s) => (
                  <option key={s} value={s}>
                    {fmt(s)} (mod {s})
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {kind === 'design' && (
        <>
          <div className="lab-row">
            <label htmlFor={`${u}-seq`}>Sequence</label>
            <input
              id={`${u}-seq`}
              className="lab-input"
              value={seqText}
              onChange={(e) => resetAll(() => setSeqText(e.target.value))}
              aria-invalid={!parsed.seq}
              aria-describedby={`${u}-seqwarn`}
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
            />
            <label htmlFor={`${u}-ff`}>Flip-flops</label>
            <select id={`${u}-ff`} className="lab-select" value={ff} onChange={(e) => setFf(e.target.value as FfKind)}>
              <option value="D">D</option>
              <option value="T">T</option>
              <option value="JK">JK</option>
            </select>
            <label htmlFor={`${u}-un`}>Unused states</label>
            <select id={`${u}-un`} className="lab-select" value={unused} onChange={(e) => setUnused(e.target.value as 'dc' | '0')}>
              <option value="dc">don’t-cares</option>
              <option value="0">forced to 0</option>
            </select>
          </div>
          <p className="lab-warn" id={`${u}-seqwarn`} role="alert">
            {parsed.error}
          </p>
        </>
      )}

      <div className="lab-row">
        <button type="button" className="lab-btn lab-btn--main" disabled={!!machine.error} onClick={advance}>
          Clock ↑ (step)
        </button>
        <button type="button" className="lab-btn" disabled={!!machine.error} onClick={() => setRunKey(running ? null : key)} aria-pressed={running}>
          {running ? 'Stop' : 'Run'}
        </button>
        <button type="button" className="lab-btn" onClick={() => {
            setRunKey(null)
            setHist({ key, states: [init], clocks: 0 })
          }}>
          Reset
        </button>
      </div>

      {!machine.error && (
        <>
          <p className="cf-readout" aria-live="polite">
            After {clocks} clock{clocks === 1 ? '' : 's'}: <b>{fmt(cur)}</b> ({cur})
            {kind === 'lfsr' && clocks > 0 && <span className="cf-trans"> — serial input at that clock: {serialBit(clocks - 1)}</span>}
            {lastTrans && lastTrans.length > 2 && (
              <span className="cf-trans">
                {' '}
                — rippled through {lastTrans.map(([, q]) => fmt(q)).join(' → ')}, settled {lastTrans.at(-1)![0]} ns after the clock
              </span>
            )}
          </p>
          {machine.design && <DesignView design={machine.design} ff={ff} step={machine.step} fmt={fmt} />}
          <Waves n={n} states={states} />
          <div className="lab-grid cf-grid">
            <StateGraph n={n} step={machine.step} main={main} lockouts={lockouts} current={cur} fmt={fmt} />
            <div className="lab-col">
              <h3 className="cf-h">Self-start check</h3>
              <p className={cn('lab-result', selfStart ? 'is-good' : 'is-bad')}>
                {selfStart ? 'Self-starting: every state reaches the main cycle.' : `Not self-starting: ${lockouts.length} lock-out cycle${lockouts.length === 1 ? '' : 's'}.`}
              </p>
              {(kind === 'ring' || kind === 'johnson') && (
                <p className="lab-hint">
                  The main cycle is the one through the standard start, {fmt(machine.main[0]!)} ({kind === 'ring' ? 'a single 1 at the left' : 'all 0s'}). Your
                  initial state {fmt(init)}{' '}
                  {initRun.prefix.length > 0 ? `leads in ${initRun.prefix.length} clock${initRun.prefix.length === 1 ? '' : 's'} into ` : 'is on '}
                  {initLock < 0 ? 'the main cycle.' : `${lockouts.length > 1 ? `lock-out cycle ${initLock + 1}` : 'the lock-out cycle'}, so it never reaches the main cycle.`}
                </p>
              )}
              <ul className="cf-cycles">
                <li>
                  <b>Main cycle</b> ({main.length} state{main.length === 1 ? '' : 's'}): {cycleText(main)}
                </li>
                {lockouts.map((c, i) => (
                  <li key={c[0]} className="is-lock">
                    <b>Lock-out cycle{lockouts.length > 1 ? ` ${i + 1}` : ''}</b> ({c.length}): {cycleText(c)}
                  </li>
                ))}
              </ul>
              {kind === 'lfsr' && serial && (
                <p className="lab-hint">The graph and the cycles are those of the register with serial input 0, the input after your {serial.length} bit{serial.length === 1 ? '' : 's'}.</p>
              )}
              <p className="lab-hint">
                {size - main.length - lockouts.reduce((s, c) => s + c.length, 0)} of the {size} states lie on no cycle and lead into one. Every state’s
                next state: {all.map((s) => `${fmt(s)}→${fmt(machine.step(s))}`).join(', ')}.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DesignView({ design, ff, step, fmt }: { design: CounterDesign; ff: FfKind; step: (s: number) => number; fmt: (s: number) => string }) {
  return (
    <div className="lab-grid">
      <div className="lab-col">
        <h3 className="cf-h">Minimal input equations ({ff} flip-flops)</h3>
        <ul className="cf-eqs">
          {design.names.map((k) => (
            <li key={k}>
              <span className="km-f">{k} =</span> <span className="km-expr">{design.sop[k]![0]}</span>
              {design.sop[k]!.length > 1 && <span className="km-cost"> (also minimal: {design.sop[k]!.slice(1).join('; ')})</span>}
            </li>
          ))}
        </ul>
        <p className="lab-hint">Built from the first minimal cover of each input; the unused states then go wherever the chosen don’t-care values send them.</p>
      </div>
      <div className="lab-col lab-tt-wrap" tabIndex={0} role="group" aria-label="Table, scrolls sideways">
        <table className="lab-tt">
          <caption className="sr-only">Next states: wanted and built</caption>
          <thead>
            <tr>
              <th scope="col">present</th>
              <th scope="col">wanted next</th>
              <th scope="col">built next</th>
            </tr>
          </thead>
          <tbody>
            {design.next.map((w, s) => (
              <tr key={s}>
                <th scope="row">{fmt(s)}</th>
                <td>{w === null ? 'x' : fmt(w)}</td>
                <td className={cn(w === null && 'cf-dc')}>{fmt(step(s))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Waves({ n, states }: { n: number; states: number[] }) {
  const CW = 26
  const RH = 26
  const LW = 34
  const shown = states.slice(-40)
  const off = states.length - shown.length
  const W = LW + Math.max(shown.length, 8) * CW + 4
  const H = 16 + n * RH
  const x = (k: number) => LW + k * CW
  return (
    <div className="ffs-scroll cf-waves">
      <svg
        className="ffs-svg"
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Waveforms of Q${n - 1} to Q0 over ${states.length - 1} clocks: ${shown.map((s) => binText(s, n)).join(', ')}`}
      >
        {shown.map((_, k) => (
          <g key={k}>
            <line className="ffs-grid" x1={x(k)} x2={x(k)} y1={14} y2={H} />
            {(k + off) % 2 === 0 && (
              <text className="lab-svg-small" x={x(k) + CW / 2} y={11} textAnchor="middle">
                {k + off}
              </text>
            )}
          </g>
        ))}
        {Array.from({ length: n }, (_, i) => {
          const bit = n - 1 - i
          const y = 16 + i * RH
          let d = ''
          shown.forEach((s, k) => {
            const yy = (s >> bit) & 1 ? y + 4 : y + RH - 6
            d += `${k ? 'L' : 'M'}${x(k)},${yy}L${x(k + 1)},${yy}`
          })
          return (
            <g key={bit}>
              <text className="lab-svg-label ffs-label" x={4} y={y + RH / 2 + 4}>
                Q{bit}
              </text>
              <path className="ffs-wave is-out" d={d} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ── State graph of an autonomous counter ─────────────────────────────── */

function StateGraph({
  n,
  step,
  main,
  lockouts,
  current,
  fmt,
}: {
  n: number
  step: (s: number) => number
  main: number[]
  lockouts: number[][]
  current: number
  fmt: (s: number) => string
}) {
  const size = 1 << n
  const order: number[] = []
  const seen = new Set<number>()
  for (const c of [main, ...lockouts])
    for (const s of c)
      if (!seen.has(s)) {
        seen.add(s)
        order.push(s)
      }
  for (let s = 0; s < size; s++) if (!seen.has(s)) order.push(s)
  const V = 360
  const R = size <= 4 ? 100 : size <= 8 ? 125 : 145
  const r = size <= 8 ? 19 : size <= 16 ? 15 : 11.5
  const pos = new Map<number, [number, number]>()
  order.forEach((s, i) => {
    const a = (2 * Math.PI * i) / size - Math.PI / 2
    pos.set(s, [V / 2 + R * Math.cos(a), V / 2 + R * Math.sin(a)])
  })
  const mainSet = new Set(main)
  const lockSet = new Set(lockouts.flat())
  const tone = (s: number) => (mainSet.has(s) ? 'is-main' : lockSet.has(s) ? 'is-lock' : 'is-trans')
  const label = (s: number) => (n <= 4 ? fmt(s) : String(s))
  const mk = useId().replace(/:/g, '')
  return (
    <figure className="cf-graph">
      <svg viewBox={`0 0 ${V} ${V}`} className="cf-graph-svg" role="img" aria-label={`State graph of all ${size} states; the main cycle is ${main.map(fmt).join(' → ')}; current state ${fmt(current)}.`}>
        <defs>
          {['main', 'lock', 'trans'].map((t) => (
            <marker key={t} id={`${mk}-${t}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className={`cf-head is-${t}`} />
            </marker>
          ))}
        </defs>
        {order.map((s) => {
          const t = step(s)
          const [x1, y1] = pos.get(s)!
          const [x2, y2] = pos.get(t)!
          const tn = tone(s).slice(3)
          if (s === t) {
            const dx = x1 - V / 2
            const dy = y1 - V / 2
            const l = Math.hypot(dx, dy) || 1
            const cx = x1 + (dx / l) * (r + 8)
            const cy = y1 + (dy / l) * (r + 8)
            return <circle key={`e${s}`} className={cn('cf-edge', `is-${tn}`)} cx={cx} cy={cy} r={9} />
          }
          const dx = x2 - x1
          const dy = y2 - y1
          const l = Math.hypot(dx, dy)
          return (
            <line
              key={`e${s}`}
              className={cn('cf-edge', `is-${tn}`)}
              x1={x1 + (dx / l) * r}
              y1={y1 + (dy / l) * r}
              x2={x2 - (dx / l) * (r + 2)}
              y2={y2 - (dy / l) * (r + 2)}
              markerEnd={`url(#${mk}-${tn})`}
            />
          )
        })}
        {order.map((s) => {
          const [x, y] = pos.get(s)!
          return (
            <g key={`n${s}`} className={cn('cf-node', tone(s), s === current && 'is-cur')}>
              <circle cx={x} cy={y} r={r} />
              <text x={x} y={y + 4} textAnchor="middle" style={{ fontSize: n <= 3 ? 12 : n === 4 ? 10 : 11 }}>
                {label(s)}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="lab-hint">
        <span className="cf-key is-main">main cycle</span> <span className="cf-key is-lock">lock-out</span> <span className="cf-key is-trans">leads into a cycle</span>
        {n > 4 ? ' · states shown in decimal' : ''} · ringed: current state
      </figcaption>
    </figure>
  )
}

/* ── State machine ────────────────────────────────────────────────────── */

/** One row of the editable table. Next states refer to rows by their stable id, so renaming a state (keystroke by keystroke,
    even through another state's name) never rewires an arc; names are used only for display and for fromTable. */
interface Row {
  id: number
  name: string
  n0: number
  n1: number
  o0: number
  o1: number
}

let rowIds = 0

function rowsOf(rows: [string, FsmRow][], moore: boolean): Row[] {
  const ids = rows.map(() => rowIds++)
  const idOf = (name: string | number) => ids[rows.findIndex(([nm]) => nm === String(name))] ?? ids[0]!
  return rows.map(([name, r], i) => ({ id: ids[i]!, name, n0: idOf(r[0]!), n1: idOf(r[1]!), o0: Number(r[2]), o1: moore ? 0 : Number(r[3]) }))
}

function tableRows(rows: Row[], moore: boolean): [string, FsmRow][] {
  const nameOf = (id: number) => rows.find((r) => r.id === id)!.name
  return rows.map((r) => [r.name, moore ? [nameOf(r.n0), nameOf(r.n1), r.o0] : [nameOf(r.n0), nameOf(r.n1), r.o0, r.o1]])
}

function FsmTool() {
  const u = useId()
  const first = FSM_PRESETS[0]!
  const [moore, setMoore] = useState(first.moore)
  const [rows, setRows] = useState<Row[]>(() => rowsOf(first.rows, first.moore))
  const [startId, setStartId] = useState<number | null>(null)
  const [removed, setRemoved] = useState('')
  const [text, setText] = useState('0110101101')
  const [pos, setPos] = useState(0)
  const [showMin, setShowMin] = useState(false)
  const [pat, setPat] = useState('1011')
  const [overlap, setOverlap] = useState(true)
  const [detMoore, setDetMoore] = useState(false)

  const names = rows.map((r) => r.name)
  const startRow = rows.find((r) => r.id === startId) ?? rows[0]!
  const nameError = names.some((s) => !s.trim()) ? 'Every state needs a name.' : new Set(names).size !== names.length ? 'State names must be distinct.' : ''
  let f: Fsm | null = null
  if (!nameError) {
    try {
      f = fromTable(tableRows(rows, moore), [0, 1], moore, startRow.name)
    } catch {
      f = null
    }
  }

  const xs = [...text].filter((c) => c === '0' || c === '1').map(Number)
  const p = Math.min(pos, xs.length)
  const r = f ? run(f, xs.slice(0, p)) : null
  const cur = r ? r.states[p]! : ''
  const lastEdge = r && p > 0 ? { from: r.states[p - 1]!, x: xs[p - 1]! } : null
  const outText = r ? (moore ? `${r.first}${r.outs.join('')}` : r.outs.join('')) : ''

  const load = (rs: [string, FsmRow][], mo: boolean, st: string) => {
    const nr = rowsOf(rs, mo)
    setMoore(mo)
    setRows(nr)
    setStartId(nr.find((r) => r.name === st)?.id ?? nr[0]!.id)
    setPos(0)
    setShowMin(false)
    setRemoved('')
  }
  const edit = (id: number, patch: Partial<Row>) => {
    setPos(0)
    setRows((rs) => rs.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }
  const remove = (id: number) => {
    if (rows.length <= 1) return
    const gone = rows.find((r) => r.id === id)!
    const rest = rows.filter((r) => r.id !== id)
    const to = rest[0]!
    const redirected = rest.some((r) => r.n0 === id || r.n1 === id)
    setPos(0)
    setRows(rest.map((row) => ({ ...row, n0: row.n0 === id ? to.id : row.n0, n1: row.n1 === id ? to.id : row.n1 })))
    if (startRow.id === id) setStartId(to.id)
    setRemoved(
      `Removed ${gone.name || 'the unnamed state'}.` +
        (redirected ? ` Arcs into ${gone.name || 'it'} now go to ${to.name}.` : '') +
        (startRow.id === id ? ` ${to.name} is the new start state.` : ''),
    )
  }
  const add = () => {
    if (rows.length >= 10) return
    let k = rows.length
    let name = String.fromCharCode(65 + (k % 26))
    while (names.includes(name)) name = `S${k++}`
    const id = rowIds++
    setPos(0)
    setRows((rs) => [...rs, { id, name, n0: id, n1: id, o0: 0, o1: 0 }])
  }
  const patOk = /^[01]{1,6}$/.test(pat)

  return (
    <div>
      <div className="lab-inputs" role="group" aria-label="Presets">
        {FSM_PRESETS.map((pr) => (
          <button key={pr.id} type="button" className="lab-btn" onClick={() => load(pr.rows, pr.moore, pr.start)}>
            {pr.label}
          </button>
        ))}
      </div>
      <div className="lab-row">
        <label htmlFor={`${u}-pat`}>Detector for</label>
        <input
          id={`${u}-pat`}
          className="lab-input cf-pat"
          value={pat}
          onChange={(e) => setPat(e.target.value.trim())}
          aria-invalid={!patOk}
          aria-describedby={`${u}-pathint`}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
        />
        <span id={`${u}-pathint`} className={cn('lab-hint', !patOk && 'cf-bad')}>
          1 to 6 bits, 0s and 1s only
        </span>
        <label className="cf-check">
          <input type="checkbox" checked={overlap} onChange={(e) => setOverlap(e.target.checked)} /> overlapping
        </label>
        <label className="cf-check">
          <input type="checkbox" checked={detMoore} onChange={(e) => setDetMoore(e.target.checked)} /> Moore
        </label>
        <button type="button" className="lab-btn" disabled={!patOk} onClick={() => load(tableOf(renamed(detector(pat, overlap, detMoore), (s) => `S${s}`)), detMoore, 'S0')}>
          Build detector
        </button>
      </div>

      <div className="lab-row">
        <span id={`${u}-type`}>Machine</span>
        <div className="lab-inputs cf-inline" role="group" aria-labelledby={`${u}-type`}>
          <button type="button" className={cn('lab-toggle', !moore && 'is-on')} aria-pressed={!moore} onClick={() => (setMoore(false), setPos(0), setShowMin(false))}>
            Mealy
          </button>
          <button type="button" className={cn('lab-toggle', moore && 'is-on')} aria-pressed={moore} onClick={() => (setMoore(true), setPos(0), setShowMin(false))}>
            Moore
          </button>
        </div>
        <label htmlFor={`${u}-start`}>Start state</label>
        <select id={`${u}-start`} className="lab-select" value={startRow.id} onChange={(e) => (setStartId(Number(e.target.value)), setPos(0))}>
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name || '(unnamed)'}
            </option>
          ))}
        </select>
      </div>

      <div className="lab-tt-wrap" tabIndex={0} role="group" aria-label="Table, scrolls sideways">
        <table className="lab-tt cf-table">
          <caption className="sr-only">State table ({moore ? 'Moore: one output per state' : 'Mealy: an output per input'})</caption>
          <thead>
            <tr>
              <th scope="col">State</th>
              <th scope="col">Next, X = 0</th>
              <th scope="col">Next, X = 1</th>
              {moore ? (
                <th scope="col">Output</th>
              ) : (
                <>
                  <th scope="col">Out, X = 0</th>
                  <th scope="col">Out, X = 1</th>
                </>
              )}
              <th scope="col">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className={cn(f && row.name === cur && 'is-current')}>
                <td>
                  <input className="lab-input cf-name" value={row.name} maxLength={6} aria-label={`Name of state ${i + 1}`} onChange={(e) => edit(row.id, { name: e.target.value.trim() })} />
                </td>
                {(['n0', 'n1'] as const).map((k, x) => (
                  <td key={k}>
                    <select className="lab-select" value={row[k]} aria-label={`Next state of ${row.name} for X = ${x}`} onChange={(e) => edit(row.id, { [k]: Number(e.target.value) })}>
                      {rows.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name || '(unnamed)'}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
                {(moore ? (['o0'] as const) : (['o0', 'o1'] as const)).map((k, x) => (
                  <td key={k}>
                    <select
                      className="lab-select"
                      value={row[k]}
                      aria-label={moore ? `Output of ${row.name}` : `Output of ${row.name} for X = ${x}`}
                      onChange={(e) => edit(row.id, { [k]: Number(e.target.value) })}
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                    </select>
                  </td>
                ))}
                <td>
                  <button type="button" className="lab-x" aria-label={`Remove state ${row.name}`} disabled={rows.length <= 1} onClick={() => remove(row.id)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lab-row">
        <button type="button" className="lab-btn" onClick={add} disabled={rows.length >= 10}>
          Add state
        </button>
      </div>
      <p className="lab-hint" role="status">
        {removed}
      </p>
      <p className="lab-warn" role="alert">
        {nameError}
      </p>

      {f && r && (
        <>
          <div className="lab-row">
            <label htmlFor={`${u}-in`}>Input string</label>
            <input
              id={`${u}-in`}
              className="lab-input cf-in"
              value={text}
              onChange={(e) => (setText(e.target.value.replace(/[^01]/g, '')), setPos(0))}
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="lab-row">
            <button type="button" className="lab-btn lab-btn--main" disabled={p >= xs.length} onClick={() => setPos(p + 1)}>
              Step
            </button>
            <button type="button" className="lab-btn" disabled={p >= xs.length} onClick={() => setPos(xs.length)}>
              Run the rest
            </button>
            <button type="button" className="lab-btn" disabled={p === 0} onClick={() => setPos(0)}>
              Reset
            </button>
          </div>
          <div className="cf-io">
            <p>
              <span className="cf-io-label">Input fed</span>
              <span className="cf-bits">
                {xs.map((b, k) => (
                  <span key={k} className={cn(k < p ? 'is-fed' : 'is-left', k === p - 1 && 'is-last')}>
                    {b}
                  </span>
                ))}
              </span>
            </p>
            <p>
              <span className="cf-io-label">{moore ? 'Output (start, then each state entered)' : 'Output'}</span>
              <span className="cf-bits">{outText || '—'}</span>
            </p>
            <p>
              <span className="cf-io-label">States</span>
              <span className="cf-bits">{r.states.join(' → ')}</span>
            </p>
            <p className="sr-only" role="status" aria-live="polite">
              {lastEdge
                ? `Input ${lastEdge.x}: ${lastEdge.from} to ${cur}, output ${moore ? f.out[cur] : r.outs[p - 1]}.`
                : `At the start state ${cur}.`}
            </p>
          </div>
          <FsmGraph f={f} current={cur} last={lastEdge} />
          <div className="lab-row">
            <button type="button" className="lab-btn" onClick={() => setShowMin((s) => !s)} aria-expanded={showMin}>
              {showMin ? 'Hide minimisation' : 'Minimise'}
            </button>
          </div>
          {showMin && <Minimise f={f} onLoad={(rs, st) => load(rs, moore, st)} />}
        </>
      )}
    </div>
  )
}

function Minimise({ f, onLoad }: { f: Fsm; onLoad: (rows: [string, FsmRow][], start: string) => void }) {
  const sub = useMemo(() => reachableMachine(f), [f])
  const rounds = useMemo(() => partitions(sub), [sub])
  const table = useMemo(() => merged(sub), [sub])
  const last = rounds[rounds.length - 1]!
  const dropped = f.states.filter((s) => !sub.states.includes(s))
  const blockOf = (s: string) => last.find((b) => b.includes(s))!
  const startRep = blockOf(sub.start)[0]!
  return (
    <section className="cf-min" aria-label="Minimisation">
      {dropped.length > 0 && <p className="lab-hint">Unreachable from {f.start}, so dropped first: {dropped.join(', ')}.</p>}
      <ol className="cf-rounds" start={0}>
        {rounds.map((P, k) => (
          <li key={k}>
            <b>P{k}</b> = {P.map((b) => `{${b.join(', ')}}`).join(' ')}
            <span className="km-cost">
              {' '}
              {k === 0 ? (f.moore ? '(grouped by the state’s output)' : '(grouped by the output row)') : '(split by the blocks the next states fall in)'}
            </span>
          </li>
        ))}
      </ol>
      <p className="lab-result is-good">
        P{rounds.length - 1} does not split further: {last.length} state{last.length === 1 ? '' : 's'} (from {f.states.length}).
      </p>
      <div className="lab-tt-wrap" tabIndex={0} role="group" aria-label="Table, scrolls sideways">
        <table className="lab-tt">
          <caption className="sr-only">Merged state table</caption>
          <thead>
            <tr>
              <th scope="col">State</th>
              <th scope="col">merges</th>
              <th scope="col">X = 0</th>
              <th scope="col">X = 1</th>
              {f.moore ? (
                <th scope="col">out</th>
              ) : (
                <>
                  <th scope="col">out 0</th>
                  <th scope="col">out 1</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {table.map(([s, row]) => (
              <tr key={s}>
                <th scope="row">{s}</th>
                <td>{blockOf(s).join(', ')}</td>
                {row.map((v, i) => (
                  <td key={i}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lab-row">
        <button type="button" className="lab-btn" onClick={() => onLoad(table, startRep)}>
          Use the merged table
        </button>
      </div>
    </section>
  )
}

function FsmGraph({ f, current, last }: { f: Fsm; current: string; last: { from: string; x: number } | null }) {
  const k = f.states.length
  const R = k <= 2 ? 90 : k <= 4 ? 110 : 125
  const r = 20
  // The canvas is sized from the ring radius: a self-loop label sits r + 38 beyond its node (baseline + 4, about 9 above
  // and 3 below it), and a side label like "0/1, 1/0" is about 53 wide, so pad = r + 54 vertically and 20 more on each side.
  const pad = r + 54
  const W = 2 * (R + pad) + 40
  const H = 2 * (R + pad)
  const cx = W / 2
  const cy = H / 2
  const pos = new Map<string, [number, number]>()
  f.states.forEach((s, i) => {
    const a = (2 * Math.PI * i) / k - Math.PI / 2
    pos.set(s, [cx + R * Math.cos(a), cy + R * Math.sin(a)])
  })
  // Group the arcs by (from, to) so both inputs to the same state share one arrow.
  const arcs = new Map<string, { from: string; to: string; labels: string[]; xs: number[] }>()
  for (const s of f.states)
    for (const x of f.alphabet) {
      const t = next(f, s, x)
      const key = `${s}\u0000${t}`
      if (!arcs.has(key)) arcs.set(key, { from: s, to: t, labels: [], xs: [] })
      arcs.get(key)!.labels.push(f.moore ? String(x) : `${x}/${f.out[sx(s, x)]}`)
      arcs.get(key)!.xs.push(x)
    }
  const mk = useId().replace(/:/g, '')
  const desc = f.states
    .map((s) => `${s}${f.moore ? ` (output ${f.out[s]})` : ''}: ${f.alphabet.map((x) => `on ${x} to ${next(f, s, x)}${f.moore ? '' : ` output ${f.out[sx(s, x)]}`}`).join(', ')}`)
    .join('; ')
  return (
    <figure className="cf-graph cf-fsm">
      <svg viewBox={`0 0 ${W} ${H}`} className="cf-graph-svg" role="img" aria-label={`State graph. Current state ${current}. ${desc}.`}>
        <defs>
          {['n', 'on'].map((t) => (
            <marker key={t} id={`${mk}-${t}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className={cn('cf-head', t === 'on' ? 'is-main' : 'is-trans')} />
            </marker>
          ))}
        </defs>
        {[...arcs.values()].map((a) => {
          const [x1, y1] = pos.get(a.from)!
          const [x2, y2] = pos.get(a.to)!
          const on = !!last && last.from === a.from && a.to === current && a.xs.includes(last.x)
          const cls = cn('cf-edge', on ? 'is-main is-on' : 'is-trans')
          const label = a.labels.join(', ')
          if (a.from === a.to) {
            const dx = x1 - cx
            const dy = y1 - cy
            const l = Math.hypot(dx, dy) || 1
            const ux = dx / l
            const uy = dy / l
            const lx = x1 + ux * (r + 14)
            const ly = y1 + uy * (r + 14)
            return (
              <g key={`${a.from}>${a.to}`}>
                <circle className={cls} cx={lx} cy={ly} r={13} />
                <text className="cf-arc-label" x={x1 + ux * (r + 38)} y={y1 + uy * (r + 38) + 4} textAnchor="middle">
                  {label}
                </text>
              </g>
            )
          }
          const back = arcs.has(`${a.to}\u0000${a.from}`)
          const dx = x2 - x1
          const dy = y2 - y1
          const l = Math.hypot(dx, dy)
          const nx = -dy / l
          const ny = dx / l
          const bend = back ? 22 : 0
          const mx = (x1 + x2) / 2 + nx * bend
          const my = (y1 + y2) / 2 + ny * bend
          // Start and end points pulled back to the node rims, towards the control point.
          const sx = x1 + ((mx - x1) / Math.hypot(mx - x1, my - y1)) * r
          const sy = y1 + ((my - y1) / Math.hypot(mx - x1, my - y1)) * r
          const ex = x2 + ((mx - x2) / Math.hypot(mx - x2, my - y2)) * (r + 2)
          const ey = y2 + ((my - y2) / Math.hypot(mx - x2, my - y2)) * (r + 2)
          return (
            <g key={`${a.from}>${a.to}`}>
              <path className={cls} d={`M${sx},${sy} Q${mx},${my} ${ex},${ey}`} markerEnd={`url(#${mk}-${on ? 'on' : 'n'})`} />
              <text className="cf-arc-label" x={mx + nx * 10} y={my + ny * 10 + 4} textAnchor="middle">
                {label}
              </text>
            </g>
          )
        })}
        {(() => {
          const [x, y] = pos.get(f.start)!
          return <line className="cf-edge is-trans" x1={x - r - 22} y1={y - 16} x2={x - r - 2} y2={y - 4} markerEnd={`url(#${mk}-n)`} />
        })()}
        {f.states.map((s) => {
          const [x, y] = pos.get(s)!
          return (
            <g key={s} className={cn('cf-node', 'is-trans', s === current && 'is-cur')}>
              <circle cx={x} cy={y} r={r} />
              <text x={x} y={y + (f.moore ? 0 : 4)} textAnchor="middle" style={{ fontSize: s.length > 3 ? 10 : 12 }}>
                {s}
              </text>
              {f.moore && (
                <text x={x} y={y + 12} textAnchor="middle" style={{ fontSize: 10 }}>
                  /{f.out[s]}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <figcaption className="lab-hint">
        {f.moore ? 'Moore: arcs carry the input, each state shows its output.' : 'Mealy: arcs carry input/output.'} Ringed: current state; the arc just taken is
        highlighted; the short arrow marks the start state.
      </figcaption>
    </figure>
  )
}
