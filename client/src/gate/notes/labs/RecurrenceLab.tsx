/*
  Recurrence Lab (Discrete Mathematics, Chapter 7 Live Lab). Two tabs:

    iterate  a linear recurrence of order ≤ 3 with constant coefficients and an
             optional forcing term p0 + p1 n + p2 n² + q·sⁿ; the lab lists the
             terms, finds the characteristic roots (with multiplicity) and, for
             homogeneous recurrences, the closed form fitted to the initial
             values, checked against the iterated terms
    series   the power series of a rational generating function num(x)/den(x),
             with (1 ± x)^k available as a denominator, to read coefficients

  All logic is in ./recLogic.ts (tested against the exact Python checks in
  content/gate-notes/_checks/dm/reclib.py).
*/
import { useId, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { PRESETS, binomPower, charRoots, evalTerms, homogeneousSolution, iterate, parseList, series, showRoot, type Rec } from './recLogic'

export type RecTab = 'iterate' | 'series'
const TABS: { id: RecTab; label: string }[] = [
  { id: 'iterate', label: 'Iterate & solve' },
  { id: 'series', label: 'Generating functions' },
]

export default function RecurrenceLab({ tab: initial = 'iterate', title }: { tab?: string; title?: string }) {
  const [tab, setTab] = useState<RecTab>(initial === 'series' ? 'series' : 'iterate')
  const uid = useId()
  return (
    <div className="lab">
      <div className="lab-head">
        <span className="lab-kicker">Live Lab</span>
        <span className="lab-title">{title || 'Recurrence Lab'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Recurrence Lab tools">
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
        {tab === 'iterate' ? <IterateTool /> : <SeriesTool />}
      </div>
    </div>
  )
}

function Field({ label, value, set }: { label: string; value: string; set: (v: string) => void }) {
  const id = useId()
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} className="lab-input rec-in" value={value} spellCheck={false} onChange={(e) => set(e.target.value)} />
    </>
  )
}

const fmt = (x: number) => (Math.abs(x) < 1e15 && Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x).toLocaleString('en-IN') : x.toPrecision(8))

function IterateTool() {
  const [c, setC] = useState('1, 1')
  const [a0, setA0] = useState('0, 1')
  const [poly, setPoly] = useState('')
  const [q, setQ] = useState('')
  const [s, setS] = useState('')
  const pid = useId()
  const res = useMemo(() => {
    try {
      const coeffs = parseList(c)
      const init = parseList(a0)
      if (coeffs.length < 1 || coeffs.length > 3) throw new Error('Use 1 to 3 coefficients')
      if (init.length !== coeffs.length) throw new Error(`Give ${coeffs.length} initial value${coeffs.length > 1 ? 's' : ''}`)
      const rec: Rec = { coeffs, init, poly: poly.trim() ? parseList(poly) : undefined, q: q.trim() ? Number(q) : undefined, s: s.trim() ? Number(s) : undefined }
      const terms = iterate(rec, 16)
      const roots = charRoots(coeffs)
      const homog = !rec.poly?.some((x) => x !== 0) && !rec.q
      const sol = homog ? homogeneousSolution(coeffs, init) : null
      const err = sol ? Math.max(...terms.map((t, n) => Math.abs(evalTerms(sol, n) - t) / Math.max(1, Math.abs(t)))) : null
      return { terms, roots, sol, err, e: null }
    } catch (e) {
      return { e: (e as Error).message }
    }
  }, [c, a0, poly, q, s])
  return (
    <>
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
              setC(p.rec.coeffs.join(', '))
              setA0(p.rec.init.join(', '))
              setPoly(p.rec.poly?.join(', ') ?? '')
              setQ(p.rec.q !== undefined ? String(p.rec.q) : '')
              setS(p.rec.s !== undefined ? String(p.rec.s) : '')
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
      </div>
      <div className="lab-row">
        <Field label="c₁, c₂, c₃" value={c} set={setC} />
        <Field label="a₀, a₁, a₂" value={a0} set={setA0} />
      </div>
      <div className="lab-row">
        <Field label="+ p₀, p₁, p₂ (polynomial in n)" value={poly} set={setPoly} />
        <Field label="+ q" value={q} set={setQ} />
        <Field label="· sⁿ, s =" value={s} set={setS} />
      </div>
      {'e' in res && res.e && <p className="lab-warn">{res.e}</p>}
      {'terms' in res && res.terms && (
        <>
          <p className="lab-lists">
            a₀ … a₁₅: {res.terms.map(fmt).join(', ')}
          </p>
          <p className="lab-lists">
            Characteristic roots: {res.roots!.map((r) => `${showRoot(r.root)}${r.mult > 1 ? ` (×${r.mult})` : ''}`).join(', ')}
          </p>
          {res.sol ? (
            <p className={cn('lab-result', res.err! < 1e-6 ? 'is-good' : 'is-bad')} aria-live="polite">
              aₙ = {res.sol.map((t) => `(${showRoot(t.c)})${t.power ? `·n${t.power > 1 ? `^${t.power}` : ''}` : ''}·(${showRoot(t.root)})ⁿ`).join(' + ')}
              {res.err! < 1e-6 ? ' — matches all 16 iterated terms' : ' — numerical error, check the values'}
            </p>
          ) : (
            <p className="lab-hint">With a forcing term, the general solution is the homogeneous part above plus a particular solution (see the lesson); the terms listed are exact iterations.</p>
          )}
        </>
      )}
    </>
  )
}

function SeriesTool() {
  const [num, setNum] = useState('1, 1')
  const [den, setDen] = useState('')
  const [k, setK] = useState(3)
  const [sign, setSign] = useState(-1)
  const kid = useId()
  const res = useMemo(() => {
    try {
      const d = den.trim() ? parseList(den) : binomPower(sign, k)
      return { d, coeffs: series(parseList(num), d, 16), e: null }
    } catch (e) {
      return { e: (e as Error).message }
    }
  }, [num, den, k, sign])
  return (
    <>
      <div className="lab-row">
        <Field label="Numerator coefficients (1, x, x², …)" value={num} set={setNum} />
      </div>
      <div className="lab-row">
        <span>Denominator:</span>
        <button type="button" className={cn('lab-toggle', !den.trim() && sign === -1 && 'is-on')} onClick={() => (setDen(''), setSign(-1))}>
          (1 − x)^k
        </button>
        <button type="button" className={cn('lab-toggle', !den.trim() && sign === 1 && 'is-on')} onClick={() => (setDen(''), setSign(1))}>
          (1 + x)^k
        </button>
        <label htmlFor={kid}>k</label>
        <input id={kid} className="lab-input grp-num" type="number" min={1} max={8} value={k} onChange={(e) => setK(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} />
        <Field label="or coefficients" value={den} set={setDen} />
      </div>
      {res.e && <p className="lab-warn">{res.e}</p>}
      {'coeffs' in res && res.coeffs && (
        <>
          <p className="lab-lists">Denominator coefficients: {res.d!.join(', ')}</p>
          <div className="lab-tt-wrap">
            <table className="lab-tt">
              <caption className="sr-only">Coefficients of the series</caption>
              <thead>
                <tr>
                  <th scope="col">n</th>
                  {res.coeffs.map((_, i) => (
                    <th key={i} scope="col">
                      {i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">aₙ</th>
                  {res.coeffs.map((v, i) => (
                    <td key={i}>{fmt(v)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
