/*
  K-map Solver (Digital Logic, Chapter 3 Live Lab). Two tabs:

    map  2–5 variables; click a cell to cycle 0 → 1 → X. Every prime
         implicant is listed (essential, selective, redundant), the loops of
         a minimal SOP or POS are drawn (wrap-around groups as edge pieces),
         and when several minimal covers exist you can step through them
    qm   the same function tabulated by Quine–McCluskey, one round per step,
         then the prime-implicant chart with the essential columns marked

  All logic is in ./kmapLogic.ts (tested against the Python checks in
  content/gate-notes/_checks/dl/minlib.py). Cells are real buttons, so the map
  works with a keyboard and a screen reader; the loops are an SVG overlay.
*/
import { useId, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  NEXT,
  PRESETS,
  VARS,
  axisLabels,
  chart,
  classify,
  coverLiterals,
  cubeCells,
  loopRects,
  minCovers,
  minPosCovers,
  posText,
  qmRounds,
  rcMinterm,
  resize,
  sigmaText,
  sopText,
  specOf,
  termText,
  valuesOf,
  zerosOf,
  type CellValue,
} from './kmapLogic'

export type KmapTab = 'map' | 'qm'

const TABS: { id: KmapTab; label: string }[] = [
  { id: 'map', label: 'K-map' },
  { id: 'qm', label: 'Quine–McCluskey' },
]
const TONES = ['accent', 'success', 'info', 'warning', 'danger', 'subject'] as const

export default function KmapSolver({ tab: initial = 'map', title }: { tab?: string; title?: string }) {
  const [tab, setTab] = useState<KmapTab>(initial === 'qm' ? 'qm' : 'map')
  const [values, setValues] = useState<CellValue[]>(() => valuesOf(PRESETS[0]!.spec))
  const uid = useId()
  return (
    <div className="lab">
      <div className="lab-head">
        <span className="lab-kicker">Live Lab</span>
        <span className="lab-title">{title || 'K-map Solver'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="K-map Solver tools">
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
      <FunctionBar values={values} setValues={setValues} />
      <div className="lab-panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
        {tab === 'map' ? <MapTool values={values} setValues={setValues} /> : <QmTool values={values} />}
      </div>
    </div>
  )
}

/* ── Shared: variable count, presets, clear ─────────────────────────── */

function FunctionBar({ values, setValues }: { values: CellValue[]; setValues: (v: CellValue[]) => void }) {
  const u = useId()
  const spec = specOf(values)
  return (
    <div className="lab-row">
      <label htmlFor={`${u}-n`}>Variables</label>
      <select id={`${u}-n`} className="lab-select" value={spec.n} onChange={(e) => setValues(resize(values, Number(e.target.value)))}>
        {[2, 3, 4, 5].map((k) => (
          <option key={k} value={k}>
            {k} ({VARS[k]!.join(', ')})
          </option>
        ))}
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
          if (p) setValues(valuesOf(p.spec))
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
  )
}

/* ── Map tab ─────────────────────────────────────────────────────────── */

function MapTool({ values, setValues }: { values: CellValue[]; setValues: (v: CellValue[]) => void }) {
  const spec = useMemo(() => specOf(values), [values])
  const { n, ones, dcs } = spec
  const vars = VARS[n]!
  const [form, setForm] = useState<'sop' | 'pos'>('sop')
  const [pick, setPick] = useState(0)
  const [focusPi, setFocusPi] = useState<string | null>(null)
  const cls = useMemo(() => (spec.ones.length ? classify(spec.ones, spec.dcs, spec.n) : null), [spec])
  const sop = useMemo(() => minCovers(spec.ones, spec.dcs, spec.n, 32), [spec])
  const zeros = zerosOf(ones, dcs, n)
  const pos = useMemo(() => minPosCovers(spec.ones, spec.dcs, spec.n, 32), [spec])
  const res = form === 'sop' ? sop : pos
  const idx = Math.min(pick, res.covers.length - 1)
  const cover = res.covers[idx] ?? []
  const loops = focusPi ? [focusPi] : cover
  const text = form === 'sop' ? sopText(cover, vars) : posText(cover, vars)
  const toggle = (m: number) => {
    const next = values.slice()
    next[m] = NEXT[values[m]!]
    setValues(next)
    setPick(0)
    setFocusPi(null)
  }
  const kind = (p: string) => (cls?.essential.includes(p) ? 'essential' : cls?.redundant.includes(p) ? 'redundant' : 'selective')
  return (
    <div className="lab-grid km-grid">
      <div className="lab-col">
        <p className="lab-hint">Click a cell to cycle 0 → 1 → X (don’t-care). Rows and columns are in Gray order, so neighbours differ in one bit; the outer edges wrap around.</p>
        <KMap n={n} values={values} loops={loops} toggle={toggle} pos={form === 'pos' && !focusPi} />
        <p className="lab-lists">
          f = {sigmaText(spec)}
          {zeros.length > 0 && ` = ΠM(${zeros.join(', ')})${dcs.length ? ' with the same don’t-cares' : ''}`}
        </p>
      </div>
      <div className="lab-col">
        <div className="lab-row" role="group" aria-label="Form">
          {(['sop', 'pos'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={cn('lab-toggle', form === f && 'is-on')}
              aria-pressed={form === f}
              onClick={() => {
                setForm(f)
                setPick(0)
                setFocusPi(null)
              }}
            >
              {f === 'sop' ? 'Minimal SOP (loop the 1s)' : 'Minimal POS (loop the 0s)'}
            </button>
          ))}
        </div>
        <p className="km-result" aria-live="polite">
          <span className="km-f">f =</span> <span className="km-expr">{text}</span>
          <span className="km-cost">
            {coverLiterals(cover)} literal{coverLiterals(cover) === 1 ? '' : 's'}, {cover.length} term{cover.length === 1 ? '' : 's'}
          </span>
        </p>
        {res.covers.length > 1 && (
          <div className="lab-row">
            <span>
              {res.more ? `More than ${res.covers.length}` : res.covers.length} minimal {form === 'sop' ? 'SOPs' : 'POSs'} of equal cost; showing {idx + 1}.
            </span>
            <button type="button" className="lab-btn" onClick={() => setPick((idx + res.covers.length - 1) % res.covers.length)} aria-label="Previous minimal cover">
              ‹
            </button>
            <button type="button" className="lab-btn" onClick={() => setPick((idx + 1) % res.covers.length)} aria-label="Next minimal cover">
              ›
            </button>
          </div>
        )}
        {form === 'sop' && cls && (
          <>
            <h4 className="km-h">
              Prime implicants ({cls.primes.length}); essential: {cls.essential.length}
            </h4>
            <ul className="km-pis">
              {cls.primes.map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    className={cn('km-pi', `is-${kind(p)}`, focusPi === p && 'is-on')}
                    aria-pressed={focusPi === p}
                    onClick={() => setFocusPi(focusPi === p ? null : p)}
                  >
                    <span className="km-pi-term">{termText(p, vars)}</span>
                    <span className="km-pi-cells">m({cubeCells(p).join(', ')})</span>
                    <span className="km-pi-kind">{kind(p)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="lab-hint">Click a prime implicant to draw only its loop. Essential: the only PI covering some 1. Redundant: every 1 it covers is already covered by essential PIs.</p>
          </>
        )}
        {!ones.length && <p className="lab-hint">No 1s yet: f = 0. Click cells to add minterms.</p>}
      </div>
    </div>
  )
}

/** One map (n ≤ 4) or two side-by-side maps (n = 5, split on the first variable). */
function KMap({ n, values, loops, toggle, pos }: { n: number; values: CellValue[]; loops: string[]; toggle: (m: number) => void; pos: boolean }) {
  if (n === 5) {
    return (
      <div className="km-five">
        {[0, 1].map((a) => (
          <div key={a}>
            <p className="km-sub">A = {a}</p>
            <SubMap n={4} vars={VARS[5]!.slice(1)} offset={a * 16} values={values} loops={loops.filter((c) => c[0] === '-' || c[0] === String(a)).map((c) => c.slice(1))} toggle={toggle} pos={pos} allVars={VARS[5]!} />
          </div>
        ))}
      </div>
    )
  }
  return <SubMap n={n} vars={VARS[n]!} offset={0} values={values} loops={loops} toggle={toggle} pos={pos} allVars={VARS[n]!} />
}

function SubMap({ n, vars, offset, values, loops, toggle, pos, allVars }: {
  n: number
  vars: string[]
  offset: number
  values: CellValue[]
  loops: string[]
  toggle: (m: number) => void
  pos: boolean
  allVars: string[]
}) {
  const [rowLab, colLab] = axisLabels(n)
  const rb = rowLab[0]!.length
  const rowVars = vars.slice(0, rb).join('')
  const colVars = vars.slice(rb).join('')
  const R = rowLab.length
  const C = colLab.length
  const literalsOf = (m: number) => termText(m.toString(2).padStart(allVars.length, '0'), allVars)
  return (
    <div className="km-wrap">
      <div className="km-table" style={{ gridTemplateColumns: `auto repeat(${C}, minmax(0, 1fr))` }}>
        <div className="km-corner" aria-hidden="true" style={{ gridRow: 1, gridColumn: 1 }}>
          <span>{rowVars || '·'}</span>╲<span>{colVars}</span>
        </div>
        {colLab.map((l, c) => (
          <div key={`c${l}`} className="km-axis" aria-hidden="true" style={{ gridRow: 1, gridColumn: c + 2 }}>
            {l}
          </div>
        ))}
        {rowLab.map((rl, r) => (
          <div key={`r${rl}`} className="km-rowwrap" style={{ display: 'contents' }}>
            <div className="km-axis" aria-hidden="true" style={{ gridRow: r + 2, gridColumn: 1 }}>
              {rl || '·'}
            </div>
            {colLab.map((_, c) => {
              const m = offset + rcMinterm(r, c, n)
              const v = values[m]!
              return (
                <button
                  key={m}
                  type="button"
                  className={cn('km-cell', `is-${v === 'X' ? 'x' : v}`)}
                  style={{ gridRow: r + 2, gridColumn: c + 2 }}
                  onClick={() => toggle(m)}
                  aria-label={`m${m}, ${literalsOf(m)}: ${v === 'X' ? "don't-care" : v}. Click to change.`}
                >
                  <span className="km-val">{v === '0' ? '' : v}</span>
                  <span className="km-idx">{m}</span>
                </button>
              )
            })}
          </div>
        ))}
        <svg className="km-loops" viewBox={`0 0 ${C * 100} ${R * 100}`} preserveAspectRatio="none" aria-hidden="true" style={{ gridColumn: `2 / span ${C}`, gridRow: `2 / span ${R}` }}>
          {loops.map((cube, k) => {
            const rects = loopRects(cube, n)
            // A wrap-around group is drawn as pieces that run out through the border they wrap across.
            const wrapC = new Set(rects.map((x) => x[1])).size > 1
            const wrapR = new Set(rects.map((x) => x[0])).size > 1
            return rects.map(([r0, c0, rl, cl], j) => {
              const inset = 7 + (k % 3) * 5
              const ext = 34
              let x = c0 * 100 + inset
              let w = cl * 100 - 2 * inset
              let y = r0 * 100 + inset
              let h = rl * 100 - 2 * inset
              if (wrapC && c0 === 0) [x, w] = [x - ext - inset, w + ext + inset]
              if (wrapC && c0 + cl === C) w += ext + inset
              if (wrapR && r0 === 0) [y, h] = [y - ext - inset, h + ext + inset]
              if (wrapR && r0 + rl === R) h += ext + inset
              return (
                <rect
                  key={`${cube}-${j}`}
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={28}
                  className={cn('km-loop', `tone-${TONES[k % TONES.length]}`, pos && 'is-pos')}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })
          })}
        </svg>
      </div>
    </div>
  )
}

/* ── Quine–McCluskey tab ─────────────────────────────────────────────── */

function QmTool({ values }: { values: CellValue[] }) {
  const spec = useMemo(() => specOf(values), [values])
  const { n, ones } = spec
  const vars = VARS[n]!
  const qm = useMemo(() => qmRounds(spec.ones, spec.dcs, spec.n), [spec])
  const cls = useMemo(() => (spec.ones.length ? classify(spec.ones, spec.dcs, spec.n) : null), [spec])
  const last = qm.rounds.length // the step after the last round shows the PI chart
  const [step, setStep] = useState(0)
  const s = Math.min(step, last)
  if (!ones.length) return <p className="lab-hint">Mark some 1s on the K-map tab (or load a preset) to tabulate.</p>
  const round = qm.rounds[s]
  return (
    <div>
      <p className="lab-hint">
        {sigmaText(spec)}. Round k lists the cubes of 2ᵏ cells, grouped by their number of 1s; two cubes in neighbouring groups combine when they differ in exactly one position (and have their dashes in the same places). A ✓ means the cube was combined; unticked cubes are prime implicants.
      </p>
      <div className="lab-row">
        <button type="button" className="lab-btn" onClick={() => setStep(Math.max(0, s - 1))} disabled={s === 0}>
          ‹ Back
        </button>
        <span aria-live="polite">{s < last ? `Round ${s}: cubes of ${2 ** s} cell${s ? 's' : ''}` : 'Prime-implicant chart'}</span>
        <button type="button" className="lab-btn lab-btn--main" onClick={() => setStep(Math.min(last, s + 1))} disabled={s === last}>
          Next ›
        </button>
      </div>
      {round ? (
        <div className="lab-tt-wrap">
          <table className="lab-tt km-qm">
            <thead>
              <tr>
                <th scope="col">1s</th>
                <th scope="col">Minterms</th>
                <th scope="col">Cube</th>
                <th scope="col">Combined?</th>
              </tr>
            </thead>
            <tbody>
              {round.map((row, i) => {
                const w = [...row.cube].filter((c) => c === '1').length
                const first = i === 0 || [...round[i - 1]!.cube].filter((c) => c === '1').length !== w
                return (
                  <tr key={row.cube} className={cn(first && 'km-group-start', !row.checked && 'is-prime')}>
                    <td>{first ? w : ''}</td>
                    <td>{cubeCells(row.cube).join(', ')}</td>
                    <td className="km-cube">{row.cube}</td>
                    <td>{row.checked ? '✓' : `PI: ${termText(row.cube, vars)}`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        cls && <PiChart ones={ones} primes={cls.primes} essential={cls.essential} vars={vars} />
      )}
    </div>
  )
}

function PiChart({ ones, primes, essential, vars }: { ones: number[]; primes: string[]; essential: string[]; vars: string[] }) {
  const ch = chart(ones, primes)
  const single = new Set([...ch.entries()].filter(([, ps]) => ps.length === 1).map(([m]) => m))
  return (
    <>
      <div className="lab-tt-wrap">
        <table className="lab-tt km-chart">
          <caption className="sr-only">Prime-implicant chart: rows are prime implicants, columns are the 1-cells; × marks a cell the implicant covers.</caption>
          <thead>
            <tr>
              <th scope="col">PI</th>
              {[...ch.keys()].map((m) => (
                <th key={m} scope="col" className={cn(single.has(m) && 'is-single')}>
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {primes.map((p) => (
              <tr key={p} className={cn(essential.includes(p) && 'is-essential')}>
                <th scope="row">
                  {termText(p, vars)}
                  {essential.includes(p) ? ' *' : ''}
                </th>
                {[...ch.keys()].map((m) => (
                  <td key={m} className={cn(single.has(m) && 'is-single')}>
                    {ch.get(m)!.includes(p) ? '×' : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lab-hint">
        A column with a single × is a 1 that only one PI covers, so that PI (starred) is essential. Essential: {essential.length ? essential.map((p) => termText(p, vars)).join(', ') : 'none (a cyclic chart)'}.
      </p>
    </>
  )
}
