/*
  Flip-flop Scope (Digital Logic, Chapter 6 Live Lab). Two tabs:

    scope   an SR, JK, D or T storage element with a chosen trigger (level
            latch, positive edge, negative edge, master–slave) driven on a
            32-tick timeline: the clock comes from a period setting, every
            input is a row of toggle cells; setup and hold windows, t_pd and
            the initial Q are adjustable. The timing diagram shows the clock,
            the inputs, the master (master–slave), Q and optionally Q of the
            same inputs under another trigger, with unknown ('X') spans and
            violations in the danger tone and every setup / hold window
            shaded. Presets: D latch vs edge, race-around, master–slave JK,
            setup and hold violations, SR forbidden then released.
    tables  characteristic table and equation and excitation table of the
            chosen type, and "build X from Y" with the minimal equations of
            every input of Y.

  All logic is in ./seqLogic.ts (the twin of
  content/gate-notes/_checks/dl/seqlib.py, checked by l6_lab_vectors.py and
  tests/gate-notes.test.js). Every control is a real button or select; tabs
  follow the WAI-ARIA pattern; the timeline scrolls inside the lab only;
  changes are announced through one polite live region. Colours come from
  the theme tokens only, so dark mode works.
*/
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import {
  INPUTS,
  KINDS,
  SCOPE_PRESETS,
  charEquation,
  charTable,
  clockWave,
  convert,
  excitationTable,
  scope,
  waveOf,
  type Kind,
  type Level,
  type Mode,
  type ScopeResult,
} from './seqLogic'
import { Select } from '@/components/ui'

export type ScopeTab = 'scope' | 'tables'

const TABS: { id: ScopeTab; label: string }[] = [
  { id: 'scope', label: 'Scope' },
  { id: 'tables', label: 'Tables and conversion' },
]

const N = 32
const CELL = 30
const LABEL = 92
const ROW = 34
const HEAD = 20

const MODE_NAMES: Record<Mode, string> = {
  latch: 'level latch (enable high)',
  pos: 'positive edge',
  neg: 'negative edge',
  ms: 'master–slave (pulse)',
}
const MODE_SHORT: Record<Mode, string> = { latch: 'latch', pos: '↑ edge', neg: '↓ edge', ms: 'M–S' }
const KIND_NAMES: Record<Kind, string> = { SR: 'SR', JK: 'JK', D: 'D', T: 'T' }

export default function FlipflopScope({ tab: initial = 'scope', title }: { tab?: string; title?: string }) {
  const [tab, setTab] = useState<ScopeTab>(initial === 'tables' ? 'tables' : 'scope')
  const [kind, setKind] = useState<Kind>('D')
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
        <span className="lab-title">{title || 'Flip-flop Scope'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Flip-flop Scope tools">
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
        {tab === 'scope' ? <ScopeTool kind={kind} setKind={setKind} /> : <TablesTool kind={kind} setKind={setKind} />}
      </div>
    </div>
  )
}

/* ── Scope ────────────────────────────────────────────────────────────── */

type Waves = Record<string, number[]>

const START: Waves = {
  ...Object.fromEntries(['S', 'R', 'J', 'K', 'T'].map((nm) => [nm, Array<number>(N).fill(0)])),
  D: waveOf(SCOPE_PRESETS[0].inputs.D),
}

const levelText = (v: Level) => String(v)

function describe(kind: Kind, mode: Mode, r: ScopeResult, tsu: number, th: number) {
  const edgeWord = mode === 'latch' ? '' : `${r.edges.length} active edge${r.edges.length === 1 ? '' : 's'}${r.edges.length ? ` at ticks ${r.edges.join(', ')}` : ''}. `
  const v = r.viol.length
    ? `${r.viol.length} violation${r.viol.length === 1 ? '' : 's'}: ${r.viol.map(([t, k, nm]) => (k === 'forbidden' ? `S = R = 1 at tick ${t}` : `${k} of ${nm} at the edge at tick ${t}`)).join('; ')}.`
    : 'No violations.'
  const x = r.Q.indexOf('X')
  return (
    `${KIND_NAMES[kind]} ${MODE_NAMES[mode]}${mode === 'pos' || mode === 'neg' ? `, setup ${tsu}, hold ${th}` : ''}. ${edgeWord}${v} ` +
    `Q ends at ${levelText(r.Q[N - 1]!)}${x >= 0 ? `; Q is unknown from tick ${x}` : ''}.`
  )
}

function ScopeTool({ kind, setKind }: { kind: Kind; setKind: (k: Kind) => void }) {
  const u = useId()
  const [mode, setMode] = useState<Mode>('latch')
  const [compare, setCompare] = useState<Mode | ''>('pos')
  const [period, setPeriod] = useState(8)
  const [tsu, setTsu] = useState(0)
  const [th, setTh] = useState(0)
  const [tpd, setTpd] = useState(1)
  const [q0, setQ0] = useState<Level>(0)
  const [waves, setWaves] = useState<Waves>(START)

  const clk = useMemo(() => clockWave(N, period), [period])
  const names = INPUTS[kind]
  const inp = useMemo(() => Object.fromEntries(names.map((nm) => [nm, waves[nm]!])), [names, waves])
  const res = useMemo(() => scope(kind, mode, clk, inp, { q0, tsu, th, tpd }), [kind, mode, clk, inp, q0, tsu, th, tpd])
  const cmpMode: Mode | '' = compare === mode ? '' : compare
  const cmp = useMemo(() => (cmpMode ? scope(kind, cmpMode, clk, inp, { q0, tsu, th, tpd }) : null), [cmpMode, kind, clk, inp, q0, tsu, th, tpd])
  const summary = describe(kind, mode, res, tsu, th)

  const load = (id: string) => {
    const p = SCOPE_PRESETS.find((x) => x.id === id)
    if (!p) return
    setKind(p.kind)
    setMode(p.mode)
    setCompare(p.compare)
    setPeriod(p.period)
    setTsu(p.tsu)
    setTh(p.th)
    setTpd(p.tpd)
    setQ0(p.q0)
    setWaves((w) => {
      const nw = { ...w }
      for (const nm of INPUTS[p.kind]) nw[nm] = waveOf(p.inputs[nm] ?? '0'.repeat(N))
      return nw
    })
  }

  const toggle = (nm: string, t: number) => setWaves((w) => ({ ...w, [nm]: w[nm]!.map((v, k) => (k === t ? 1 - v : v)) }))
  const fill = (nm: string, v: number) => setWaves((w) => ({ ...w, [nm]: Array<number>(N).fill(v) }))

  const edgeMode = mode === 'pos' || mode === 'neg'
  const sel = (id: string, label: string, value: string | number, opts: [string | number, string][], on: (v: string) => void, disabled = false) => (
    <span className="ffs-field">
      <label htmlFor={`${u}-${id}`}>{label}</label>
      <Select id={`${u}-${id}`} className="lab-select" value={value} disabled={disabled} onChange={(e) => on(e.target.value)}>
        {opts.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
    </span>
  )

  return (
    <div>
      <div className="lab-row">
        {sel('kind', 'Type', kind, KINDS.map((k) => [k, KIND_NAMES[k]]), (v) => setKind(v as Kind))}
        {sel('mode', 'Trigger', mode, (Object.keys(MODE_NAMES) as Mode[]).map((m) => [m, MODE_NAMES[m]]), (v) => setMode(v as Mode))}
        {sel('cmp', 'Compare with', cmpMode, [['', 'nothing'], ...(Object.keys(MODE_NAMES) as Mode[]).filter((m) => m !== mode).map((m) => [m, MODE_NAMES[m]] as [string, string])], (v) => setCompare(v as Mode | ''))}
      </div>
      <div className="lab-row">
        {sel('per', 'Clock period', period, [4, 6, 8].map((p) => [p, `${p} ticks`]), (v) => setPeriod(Number(v)))}
        {sel('tpd', 't_pd', tpd, [1, 2].map((p) => [p, `${p} tick${p > 1 ? 's' : ''}`]), (v) => setTpd(Number(v)))}
        {sel('tsu', 'Setup', tsu, [0, 1, 2, 3].map((p) => [p, `${p}`]), (v) => setTsu(Number(v)), !edgeMode)}
        {sel('th', 'Hold', th, [0, 1, 2, 3].map((p) => [p, `${p}`]), (v) => setTh(Number(v)), !edgeMode)}
        {sel('q0', 'Initial Q', String(q0), [['0', '0'], ['1', '1'], ['X', 'unknown']], (v) => setQ0(v === 'X' ? 'X' : (Number(v) as 0 | 1)))}
      </div>
      <div className="lab-inputs" role="group" aria-label="Presets">
        {SCOPE_PRESETS.map((p) => (
          <button key={p.id} type="button" className="lab-btn" onClick={() => load(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      <p className="lab-hint">
        Each cell is one tick; click a cell (or focus it and press Space) to flip that input for that tick, and use the arrow keys to move along a row.
        {edgeMode
          ? ` An edge-triggered flip-flop reads the inputs of the tick just before its edge; a change inside the shaded window (${tsu} tick${tsu === 1 ? '' : 's'} before, ${th} after) makes Q unknown.`
          : mode === 'latch'
            ? ' A latch is transparent while the clock (enable) is high: Q follows the inputs t_pd later, so a JK or T latch fed J = K = 1 or T = 1 races.'
            : kind === 'JK' || kind === 'T'
              ? ' The master listens while the clock is high (gated by Q: it can only move towards the complement of Q); the slave copies it at the falling edge, so any 1 caught during the pulse is kept.'
              : ` The master follows ${kind === 'D' ? 'D' : 'S and R'} while the clock is high (no gating by Q); the slave copies it at the falling edge, so Q takes the master's last value.`}
      </p>
      <div className="ffs-scroll">
        <div className="ffs-board" style={{ width: LABEL + N * CELL }}>
          {names.map((nm) => (
            <TickRow key={nm} name={nm} wave={waves[nm]!} onToggle={(t) => toggle(nm, t)} onFill={(v) => fill(nm, v)} />
          ))}
          <Diagram kind={kind} mode={mode} clk={clk} inp={inp} res={res} cmp={cmp ? { mode: cmpMode as Mode, res: cmp } : null} tsu={tsu} th={th} tpd={tpd} q0={q0} summary={summary} />
        </div>
      </div>
      <div className="lab-lists ffs-lists">
        <p>
          <b>{mode === 'latch' ? 'Transparent while' : 'Active edges'}:</b>{' '}
          {mode === 'latch' ? 'clock = 1' : res.edges.length ? res.edges.map((t) => `tick ${t}`).join(', ') : 'none'}
        </p>
        <p>
          <b>Q:</b> {res.Q.join('')}
        </p>
        {cmp && (
          <p>
            <b>Q ({MODE_NAMES[cmpMode as Mode]}):</b> {cmp.Q.join('')}
          </p>
        )}
        {res.viol.length ? (
          <ul className="ffs-viol-list">
            {res.viol.map(([t, k, nm], i) => (
              <li key={i}>
                {k === 'forbidden'
                  ? `tick ${t}: S = R = 1 (forbidden)${mode === 'latch' ? ' — Q = Q̄ = 0 while held; releasing it leaves Q unknown' : ' — Q unknown'}`
                  : `edge at tick ${t}: ${nm} changes inside the ${k} window — Q unknown`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="ffs-ok">No violations.</p>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {summary}
      </p>
    </div>
  )
}

function TickRow({ name, wave, onToggle, onFill }: { name: string; wave: number[]; onToggle: (t: number) => void; onFill: (v: number) => void }) {
  const [focus, setFocus] = useState(0)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const move = (e: KeyboardEvent<HTMLButtonElement>, t: number) => {
    const to = e.key === 'ArrowRight' ? Math.min(N - 1, t + 1) : e.key === 'ArrowLeft' ? Math.max(0, t - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? N - 1 : -1
    if (to < 0) return
    e.preventDefault()
    setFocus(to)
    refs.current[to]?.focus()
  }
  return (
    <div className="ffs-row" role="group" aria-label={`Input ${name}, ticks 0 to ${N - 1}`}>
      <span className="ffs-row-label">
        <span className="ffs-name">{name}</span>
        <button type="button" className="ffs-mini" onClick={() => onFill(0)} aria-label={`Set ${name} to 0 at every tick`}>
          0
        </button>
        <button type="button" className="ffs-mini" onClick={() => onFill(1)} aria-label={`Set ${name} to 1 at every tick`}>
          1
        </button>
      </span>
      {wave.map((v, t) => (
        <button
          key={t}
          ref={(el) => {
            refs.current[t] = el
          }}
          type="button"
          className={cn('ffs-tick', v === 1 && 'is-on')}
          aria-pressed={v === 1}
          aria-label={`${v}: ${name} at tick ${t}`}
          tabIndex={t === focus ? 0 : -1}
          onFocus={() => setFocus(t)}
          onClick={() => onToggle(t)}
          onKeyDown={(e) => move(e, t)}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

/* Q̄ of the SR latch, drawn from the same model: the complement of Q, except that while S = R = 1 is
   held with the enable high the NOR latch drives both outputs to 0 (the model's state is then 0 and
   Q̄ is 0 as well), shown t_pd later like Q. Display only; seqLogic.scope is unchanged. */
function qBar(clk: number[], inp: Record<string, number[]>, Q: Level[], tpd: number, q0: Level): Level[] {
  const held = clk.map((c, t) => c === 1 && inp.S![t] === 1 && inp.R![t] === 1)
  return Q.map((v, t) => {
    const k = t - tpd
    if (k >= 0 && held[k]) return 0
    if (v === 'X') return 'X'
    if (k < 0) return q0 === 'X' ? 'X' : ((1 - q0) as Level)
    return (1 - v) as Level
  })
}

interface Trace {
  label: string
  wave: Level[]
  tone?: 'out' | 'master' | 'cmp'
}

function Diagram({
  kind,
  mode,
  clk,
  inp,
  res,
  cmp,
  tsu,
  th,
  tpd,
  q0,
  summary,
}: {
  kind: Kind
  mode: Mode
  clk: number[]
  inp: Record<string, number[]>
  res: ScopeResult
  cmp: { mode: Mode; res: ScopeResult } | null
  tsu: number
  th: number
  tpd: number
  q0: Level
  summary: string
}) {
  const traces: Trace[] = [
    { label: mode === 'latch' ? 'C (enable)' : 'clock', wave: clk as Level[] },
    ...INPUTS[kind].map((nm) => ({ label: nm, wave: inp[nm]! as Level[] })),
    ...(mode === 'ms' ? [{ label: 'master', wave: res.M, tone: 'master' as const }] : []),
    { label: 'Q', wave: res.Q, tone: 'out' as const },
    ...(kind === 'SR' && mode === 'latch' ? [{ label: 'Q̄', wave: qBar(clk, inp, res.Q, tpd, q0), tone: 'out' as const }] : []),
    ...(cmp ? [{ label: `Q ${MODE_SHORT[cmp.mode]}`, wave: cmp.res.Q, tone: 'cmp' as const }] : []),
  ]
  const W = LABEL + N * CELL
  const band = HEAD + traces.length * ROW
  const H = band + (res.viol.length ? 20 : 6)
  const x = (t: number) => LABEL + t * CELL
  const edgeMode = mode === 'pos' || mode === 'neg'
  const highs: [number, number][] = []
  for (let t = 0; t < N; t++) if (clk[t] && (t === 0 || !clk[t - 1])) {
    let e = t
    while (e < N && clk[e]) e++
    highs.push([t, e])
  }
  const violAt = new Map<number, string[]>()
  for (const [t, k, nm] of res.viol) violAt.set(t, [...(violAt.get(t) ?? []), k === 'forbidden' ? 'S=R=1' : `${k} ${nm}`])
  return (
    <div className="ffs-diagram">
      <div className="ffs-trace-labels" style={{ width: LABEL, height: H }} aria-hidden="true">
        {traces.map((tr, i) => (
          <span key={tr.label} className="ffs-trace-label" style={{ top: HEAD + i * ROW, height: ROW }}>
            {tr.label}
          </span>
        ))}
      </div>
    <svg className="ffs-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Timing diagram over ${N} ticks. ${summary}`}>
      {/* transparent / listening phases */}
      {(mode === 'latch' || mode === 'ms') &&
        highs.map(([a, b]) => <rect key={`h${a}`} className="ffs-open" x={x(a)} y={HEAD} width={(b - a) * CELL} height={H - HEAD} />)}
      {/* setup and hold windows */}
      {edgeMode &&
        res.edges.map((e) => (
          <g key={`w${e}`}>
            {tsu > 0 && <rect className="ffs-setup" x={x(Math.max(0, e - tsu))} y={HEAD} width={(e - Math.max(0, e - tsu)) * CELL} height={H - HEAD} />}
            {th > 0 && <rect className="ffs-hold" x={x(e)} y={HEAD} width={(Math.min(N, e + th) - e) * CELL} height={H - HEAD} />}
          </g>
        ))}
      {/* tick grid and numbers */}
      {Array.from({ length: N + 1 }, (_, t) => (
        <line key={`g${t}`} className="ffs-grid" x1={x(t)} x2={x(t)} y1={HEAD} y2={H} />
      ))}
      {Array.from({ length: N }, (_, t) =>
        t % 2 === 0 ? (
          <text key={`n${t}`} className="lab-svg-small" x={x(t) + CELL / 2} y={13} textAnchor="middle">
            {t}
          </text>
        ) : null,
      )}
      {/* active edges */}
      {res.edges.map((e) => (
        <line key={`e${e}`} className={cn('ffs-edge', violAt.has(e) && 'is-bad')} x1={x(e)} x2={x(e)} y1={HEAD} y2={H} />
      ))}
      {traces.map((tr, i) => (
        <WaveRow key={tr.label} y={HEAD + i * ROW} trace={tr} x={x} />
      ))}
      {/* violations */}
      {[...violAt.entries()].map(([t, labels]) => (
        <g key={`v${t}`} className="ffs-viol">
          <circle cx={x(t)} cy={HEAD + 4} r={4} />
          <line x1={x(t)} x2={x(t)} y1={band} y2={band + 16} />
          <text x={x(t) + 4} y={band + 14} className="ffs-viol-text">
            {labels.join(', ')}
          </text>
        </g>
      ))}
    </svg>
    </div>
  )
}

function WaveRow({ y, trace, x }: { y: number; trace: Trace; x: (t: number) => number }) {
  const hi = y + 7
  const lo = y + ROW - 9
  const w = trace.wave
  let d = ''
  let prev: Level | null = null
  const xs: [number, number][] = []
  for (let t = 0; t < w.length; t++) {
    const v = w[t]!
    if (v === 'X') {
      if (prev !== 'X') xs.push([t, t + 1])
      else xs[xs.length - 1]![1] = t + 1
      prev = 'X'
      continue
    }
    const yy = v ? hi : lo
    if (prev === null || prev === 'X') d += `M${x(t)},${yy}`
    else if (prev !== v) d += `L${x(t)},${yy}`
    d += `L${x(t + 1)},${yy}`
    prev = v
  }
  return (
    <g>
      {xs.map(([a, b]) => (
        <g key={a} className="ffs-x">
          <rect x={x(a)} y={hi} width={x(b) - x(a)} height={lo - hi} />
          {b - a >= 1 && (
            <text x={(x(a) + x(b)) / 2} y={(hi + lo) / 2 + 4} textAnchor="middle">
              X
            </text>
          )}
        </g>
      ))}
      <path className={cn('ffs-wave', trace.tone && `is-${trace.tone}`)} d={d} />
    </g>
  )
}

/* ── Tables ───────────────────────────────────────────────────────────── */

const EQ_NOTE: Record<Kind, string> = {
  SR: ' (with SR = 0: S = R = 1 is forbidden, so it is a don’t-care)',
  JK: '',
  D: '',
  T: ' = T ⊕ Q',
}

function TablesTool({ kind, setKind }: { kind: Kind; setKind: (k: Kind) => void }) {
  const u = useId()
  const [target, setTarget] = useState<Kind>('JK')
  const [have, setHave] = useState<Kind>('D')
  const names = INPUTS[kind]
  const rows = useMemo(() => charTable(kind), [kind])
  const eq = useMemo(() => charEquation(kind), [kind])
  const exc = useMemo(() => excitationTable(kind), [kind])
  const conv = useMemo(() => (target === have ? null : convert(target, have)), [target, have])
  return (
    <div>
      <div className="lab-row">
        <label htmlFor={`${u}-k`}>Flip-flop</label>
        <Select id={`${u}-k`} className="lab-select" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
      </div>
      <div className="lab-grid">
        <div className="lab-col">
          <h3 className="ffs-h">Characteristic table</h3>
          <div className="lab-tt-wrap" tabIndex={0} role="group" aria-label="Table, scrolls sideways">
            <table className="lab-tt">
              <caption className="sr-only">Characteristic table of the {kind} flip-flop</caption>
              <thead>
                <tr>
                  {names.map((nm) => (
                    <th key={nm} scope="col">
                      {nm}
                    </th>
                  ))}
                  <th scope="col">Q</th>
                  <th scope="col">Q+</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    {r.slice(0, -1).map((v, j) => (
                      <td key={j}>{v}</td>
                    ))}
                    <td className={cn('lab-f', r[r.length - 1] === 1 && 'is-one', r[r.length - 1] === null && 'ffs-forbid')}>
                      {r[r.length - 1] === null ? 'forbidden' : r[r.length - 1]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ffs-eq">
            Q+ = {eq.join('  or  ')}
            <span className="ar-meta">{EQ_NOTE[kind]}</span>
          </p>
        </div>
        <div className="lab-col">
          <h3 className="ffs-h">Excitation table</h3>
          <div className="lab-tt-wrap" tabIndex={0} role="group" aria-label="Table, scrolls sideways">
            <table className="lab-tt">
              <caption className="sr-only">Excitation table of the {kind} flip-flop (x = don’t care)</caption>
              <thead>
                <tr>
                  <th scope="col">Q</th>
                  <th scope="col">Q+</th>
                  {names.map((nm) => (
                    <th key={nm} scope="col">
                      {nm}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exc.map(([q, qn, e]) => (
                  <tr key={`${q}${qn}`}>
                    <td>{q}</td>
                    <td>{qn}</td>
                    {names.map((nm) => (
                      <td key={nm} className={cn(e[nm] === 'x' && 'ffs-dc')}>
                        {e[nm]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="lab-hint">x = don’t care: either value of that input gives the transition.</p>
        </div>
      </div>
      <h3 className="ffs-h">Build one flip-flop from another</h3>
      <div className="lab-row">
        <label htmlFor={`${u}-t`}>Build</label>
        <Select id={`${u}-t`} className="lab-select" value={target} onChange={(e) => setTarget(e.target.value as Kind)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
        <label htmlFor={`${u}-h`}>from</label>
        <Select id={`${u}-h`} className="lab-select" value={have} onChange={(e) => setHave(e.target.value as Kind)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
      </div>
      {conv ? (
        <div className="km-result" aria-live="polite">
          {INPUTS[have].map((nm) => (
            <p key={nm} className="ffs-conv">
              <span className="km-f">{nm} =</span> <span className="km-expr">{conv[nm]!.join('   or   ')}</span>
            </p>
          ))}
          <p className="km-cost">
            For each row (inputs {INPUTS[target].join(', ')} and Q) the {target} flip-flop’s next state is read from its characteristic table, the {have}{' '}
            excitation table gives the {have} inputs that make that transition, and each input column is minimised over ({INPUTS[target].join(', ')}, Q)
            with the excitation don’t-cares{target === 'SR' ? ' and S = R = 1 as a don’t-care row' : ''}.
          </p>
        </div>
      ) : (
        <p className="lab-hint">Choose two different types.</p>
      )}
    </div>
  )
}
