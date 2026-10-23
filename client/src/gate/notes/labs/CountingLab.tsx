/*
  Counting Lab (Discrete Mathematics, Chapter 6 Live Lab). Two tabs:

    twelvefold  n balls into k boxes: balls distinct or identical, boxes
                distinct or identical, any / at most one / at least one per
                box. Each of the twelve cells shows its formula and value, and
                (for small n, k) a brute-force count of the actual placements
    pie         inclusion–exclusion for "divisible by at least one of d₁ … d₄"
                up to N: every term added or subtracted, the total and the
                complement; plus derangements Dₙ, onto maps and Catalan numbers

  All logic is in ./countLogic.ts (tested against the Python checks in
  content/gate-notes/_checks/dm/countlib.py).
*/
import { useId, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { RULES, catalan, derangements, divisibilityPie, formula, onto, twelvefold, twelvefoldBrute } from './countLogic'

export type CountTab = 'twelvefold' | 'pie'
const TABS: { id: CountTab; label: string }[] = [
  { id: 'twelvefold', label: 'Balls into boxes' },
  { id: 'pie', label: 'Inclusion–exclusion' },
]
const RULE_LABEL = { any: 'any number', '≤1': 'at most one', '≥1': 'at least one' } as const
const fmt = (x: number) => x.toLocaleString('en-IN')

export default function CountingLab({ tab: initial = 'twelvefold', title }: { tab?: string; title?: string }) {
  const [tab, setTab] = useState<CountTab>(initial === 'pie' ? 'pie' : 'twelvefold')
  const uid = useId()
  return (
    <div className="lab">
      <div className="lab-head">
        <span className="lab-kicker">Live Lab</span>
        <span className="lab-title">{title || 'Counting Lab'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Counting Lab tools">
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
        {tab === 'twelvefold' ? <TwelveTool /> : <PieTool />}
      </div>
    </div>
  )
}

function Num({ label, value, set, min, max }: { label: string; value: number; set: (v: number) => void; min: number; max: number }) {
  const id = useId()
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} className="lab-input grp-num" type="number" min={min} max={max} value={value} onChange={(e) => set(Math.max(min, Math.min(max, Math.round(Number(e.target.value) || 0))))} />
    </>
  )
}

function TwelveTool() {
  const [n, setN] = useState(6)
  const [k, setK] = useState(3)
  const rows = useMemo(
    () =>
      [
        [true, true],
        [false, true],
        [true, false],
        [false, false],
      ].map(([bd, xd]) => ({
        bd: bd!,
        xd: xd!,
        cells: RULES.map((r) => ({ r, f: formula(bd!, xd!, r), v: twelvefold(n, k, bd!, xd!, r), b: twelvefoldBrute(n, k, bd!, xd!, r) })),
      })),
    [n, k],
  )
  return (
    <>
      <div className="lab-row">
        <Num label="Balls n" value={n} set={setN} min={0} max={12} />
        <Num label="Boxes k" value={k} set={setK} min={1} max={8} />
      </div>
      <div className="lab-tt-wrap">
        <table className="lab-tt cnt-table">
          <caption className="sr-only">The twelvefold way for {n} balls and {k} boxes</caption>
          <thead>
            <tr>
              <th scope="col">balls / boxes</th>
              {RULES.map((r) => (
                <th key={r} scope="col">
                  {RULE_LABEL[r]} per box
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.bd}${row.xd}`}>
                <th scope="row">
                  {row.bd ? 'distinct' : 'identical'} / {row.xd ? 'distinct' : 'identical'}
                </th>
                {row.cells.map((c) => (
                  <td key={c.r}>
                    <div className="cnt-val">{fmt(c.v)}</div>
                    <div className="cnt-f">{c.f}</div>
                    {c.b !== null && <div className={cn('cnt-check', c.b === c.v ? 'is-good' : 'is-bad')}>{c.b === c.v ? '✓ enumerated' : `enumeration gives ${c.b}`}</div>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lab-hint">S(n, k): Stirling numbers of the second kind; p(n, …): partitions of n. Cells marked ✓ were also counted by listing every placement.</p>
    </>
  )
}

function PieTool() {
  const [N, setN] = useState(500)
  const [ds, setDs] = useState([3, 5, 7, 0])
  const [m, setM] = useState(5)
  const used = useMemo(() => ds.filter((d) => d > 0), [ds])
  const res = useMemo(() => divisibilityPie(N, used), [N, used])
  return (
    <>
      <div className="lab-row">
        <Num label="N" value={N} set={setN} min={1} max={100000} />
        {ds.map((d, i) => (
          <Num key={i} label={`d${i + 1}`} value={d} set={(v) => setDs(ds.map((x, j) => (j === i ? v : x)))} min={0} max={1000} />
        ))}
      </div>
      <p className="lab-hint">Set a divisor to 0 to leave it out.</p>
      {used.length > 0 && (
        <>
          <div className="lab-tt-wrap">
            <table className="lab-tt">
              <caption className="sr-only">Inclusion–exclusion terms</caption>
              <thead>
                <tr>
                  <th scope="col">sets</th>
                  <th scope="col">lcm</th>
                  <th scope="col">⌊N / lcm⌋</th>
                  <th scope="col">sign</th>
                </tr>
              </thead>
              <tbody>
                {res.terms.map((t) => (
                  <tr key={t.set.join()}>
                    <td>{t.set.map((i) => used[i]).join(' ∧ ')}</td>
                    <td>{t.lcm}</td>
                    <td>{fmt(t.count)}</td>
                    <td className={cn('lab-f', t.sign > 0 && 'is-one')}>{t.sign > 0 ? '+' : '−'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="lab-result" aria-live="polite">
            Divisible by at least one: {fmt(res.total)} · by none: {fmt(res.none)}
          </p>
        </>
      )}
      <div className="lab-row">
        <Num label="n" value={m} set={setM} min={0} max={12} />
      </div>
      <p className="lab-lists">
        Derangements D{m} = {fmt(derangements(m))} · onto maps from an {m}-set to a 3-set = {fmt(onto(m, 3))} · Catalan C{m} = {fmt(catalan(m))}
      </p>
    </>
  )
}
