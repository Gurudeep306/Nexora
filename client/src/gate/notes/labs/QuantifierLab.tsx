/*
  Quantifier Lab (Discrete Mathematics, Chapter 2 Live Lab). Two tabs:

    evaluate  a domain of 2–5 elements (a, b, c, …); set the unary predicates
              P and Q by clicking chips and the binary predicate R on a grid;
              type a formula and see its value, with the witnesses or the
              counterexamples of an outer quantifier marked
    models    search every interpretation on domains of size 1–3 for one that
              makes a formula false (so it is not valid) or true (so it is
              satisfiable), and show what was found

  All logic is in ./predLogic.ts (tested against the Python checks in
  content/gate-notes/_checks/dm/predlib.py).
*/
import { useId, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { ELEMENTS, PRESETS, counterModel, evaluate, freeVars, model, parse, perElement, predicates, show, tuples, type Interp, type PForm } from './predLogic'

export type QuantTab = 'evaluate' | 'models'

const TABS: { id: QuantTab; label: string }[] = [
  { id: 'evaluate', label: 'Evaluate on a domain' },
  { id: 'models', label: 'Search for models' },
]

function tryParse(src: string): { f: PForm | null; err: string | null } {
  try {
    return { f: parse(src), err: null }
  } catch (e) {
    return { f: null, err: (e as Error).message }
  }
}

export default function QuantifierLab({ tab: initial = 'evaluate', title }: { tab?: string; title?: string }) {
  const [tab, setTab] = useState<QuantTab>(initial === 'models' ? 'models' : 'evaluate')
  const [src, setSrc] = useState(PRESETS[0]!.formula)
  const uid = useId()
  const pid = useId()
  const fid = useId()
  return (
    <div className="lab">
      <div className="lab-head">
        <span className="lab-kicker">Live Lab</span>
        <span className="lab-title">{title || 'Quantifier Lab'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Quantifier Lab tools">
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
            if (p) setSrc(p.formula)
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
        <label htmlFor={fid}>Formula</label>
        <input id={fid} className="lab-input tt-input" value={src} spellCheck={false} autoComplete="off" onChange={(e) => setSrc(e.target.value)} />
        <span className="lab-palette" aria-label="Insert a symbol">
          {['∀', '∃', '¬', '∧', '∨', '→', '↔', '=', '(', ')'].map((s) => (
            <button key={s} type="button" className="lab-row-btn" onClick={() => setSrc(src + (s === '(' || s === ')' ? s : ` ${s}`))}>
              {s}
            </button>
          ))}
        </span>
      </div>
      <p className="lab-hint">Predicates: P(x), Q(x) and R(x, y). A quantifier covers only what follows it directly, so write ∀x (P(x) → Q(x)) with brackets.</p>
      <div className="lab-panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
        {tab === 'evaluate' ? <EvaluateTool src={src} /> : <ModelsTool src={src} />}
      </div>
    </div>
  )
}

/* ── Evaluate tab ────────────────────────────────────────────────────── */

function EvaluateTool({ src }: { src: string }) {
  const [n, setN] = useState(3)
  const [P, setP] = useState<Set<string>>(new Set(['0', '1']))
  const [Qs, setQ] = useState<Set<string>>(new Set(['1']))
  const [R, setR] = useState<Set<string>>(new Set(['0,1', '1,2', '2,0']))
  const nid = useId()
  const { f, err } = useMemo(() => tryParse(src), [src])
  const els = ELEMENTS.slice(0, n)
  const I: Interp = useMemo(() => {
    const keep = (s: Set<string>) => new Set([...s].filter((k) => k.split(',').every((v) => Number(v) < n)))
    return { P: keep(P), Q: keep(Qs), R: keep(R) }
  }, [P, Qs, R, n])
  const flip = (s: Set<string>, set: (s: Set<string>) => void, k: string) => {
    const c = new Set(s)
    if (c.has(k)) c.delete(k)
    else c.add(k)
    set(c)
  }
  const extra = f ? Object.keys(predicates(f)).filter((p) => !['P', 'Q', 'R'].includes(p)) : []
  const fv = f ? freeVars(f) : []
  const value = f && !extra.length && !fv.length ? evaluate(f, n, I) : null
  const per = f && value !== null ? perElement(f, n, I) : null
  return (
    <>
      <div className="lab-row">
        <label htmlFor={nid}>Domain size</label>
        <select id={nid} className="lab-select" value={n} onChange={(e) => setN(Number(e.target.value))}>
          {[2, 3, 4, 5].map((k) => (
            <option key={k} value={k}>
              {k}: {'{'}
              {ELEMENTS.slice(0, k).join(', ')}
              {'}'}
            </option>
          ))}
        </select>
      </div>
      <div className="lab-grid">
        <div className="lab-col">
          {(
            [
              ['P', P, setP],
              ['Q', Qs, setQ],
            ] as const
          ).map(([name, s, set]) => (
            <div key={name} className="lab-row" role="group" aria-label={`Predicate ${name}`}>
              <span>{name}(x) true for:</span>
              {els.map((e, d) => (
                <button key={e} type="button" className={cn('lab-toggle', s.has(String(d)) && 'is-on')} aria-pressed={s.has(String(d))} onClick={() => flip(s, set, String(d))}>
                  {e}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="lab-col">
          <div className="lab-tt-wrap" tabIndex={0} role="group" aria-label="Table, scrolls sideways">
            <table className="lab-tt" aria-label="R(x, y): rows x, columns y">
              <thead>
                <tr>
                  <th scope="col">R(x, y)</th>
                  {els.map((e) => (
                    <th key={e} scope="col">
                      y = {e}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {els.map((ex, i) => (
                  <tr key={ex}>
                    <th scope="row">x = {ex}</th>
                    {els.map((ey, j) => {
                      const k = `${i},${j}`
                      return (
                        <td key={ey}>
                          <button type="button" className={cn('lab-row-btn', R.has(k) && 'is-on')} aria-pressed={R.has(k)} aria-label={`R(${ex}, ${ey})`} onClick={() => flip(R, setR, k)}>
                            {R.has(k) ? 'T' : 'F'}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {err && <p className="lab-warn">{err}</p>}
      {extra.length > 0 && <p className="lab-warn">Only P, Q and R can be set here (found {extra.join(', ')}).</p>}
      {fv.length > 0 && <p className="lab-warn">Free variable{fv.length > 1 ? 's' : ''} {fv.join(', ')}: quantify {fv.length > 1 ? 'them' : 'it'} to get a truth value.</p>}
      {value !== null && (
        <p className={cn('lab-result', value ? 'is-good' : 'is-bad')} aria-live="polite">
          {show(f!)} is <strong>{value ? 'true' : 'false'}</strong> on this domain
        </p>
      )}
      {per && f && (f.k === 'forall' || f.k === 'exists' || f.k === 'exists1') && (
        <p className="lab-lists">
          {f.k === 'forall' ? 'Counterexamples' : 'Witnesses'} for {f.x}:{' '}
          {els.filter((_, d) => (f.k === 'forall' ? !per[d] : per[d])).join(', ') || 'none'}
        </p>
      )}
    </>
  )
}

/* ── Models tab ──────────────────────────────────────────────────────── */

function describe(found: { n: number; interp: Interp; env: Record<string, number> }, preds: Record<string, number>) {
  const els = ELEMENTS.slice(0, found.n)
  return Object.keys(preds).map((p) => {
    const all = tuples(found.n, preds[p]!)
    const yes = all.filter((t) => found.interp[p]!.has(t)).map((t) => (preds[p]! ? `(${t.split(',').map((v) => els[Number(v)]).join(', ')})` : 'true'))
    return `${p} = {${yes.join(', ')}}`
  })
}

function ModelsTool({ src }: { src: string }) {
  const { f, err } = useMemo(() => tryParse(src), [src])
  const res = useMemo(() => {
    if (!f) return null
    const preds = predicates(f)
    const arity = Object.values(preds).reduce((s, a) => s + 3 ** a, 0)
    if (arity > 20) return { preds, tooBig: true as const }
    return { preds, tooBig: false as const, counter: counterModel(f), witness: model(f) }
  }, [f])
  return (
    <>
      {err && <p className="lab-warn">{err}</p>}
      {res?.tooBig && <p className="lab-warn">Too many predicates to search every interpretation here.</p>}
      {res && !res.tooBig && (
        <>
          <p className={cn('lab-result', !res.counter ? 'is-good' : 'is-bad')} aria-live="polite">
            {res.counter ? 'Not valid: a counter-model exists.' : 'No counter-model on domains of size 1–3 (consistent with validity; a proof is still needed).'}
          </p>
          {res.counter && (
            <div className="lab-lists">
              <div>
                Counter-model: domain {'{'}
                {ELEMENTS.slice(0, res.counter.n).join(', ')}
                {'}'}
              </div>
              {describe(res.counter, res.preds).map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
          )}
          <p className="lab-result">{res.witness ? 'Satisfiable: a model exists.' : 'No model on domains of size 1–3.'}</p>
          {res.witness && (
            <div className="lab-lists">
              <div>
                Model: domain {'{'}
                {ELEMENTS.slice(0, res.witness.n).join(', ')}
                {'}'}
              </div>
              {describe(res.witness, res.preds).map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
          )}
          <p className="lab-hint">The search tries every interpretation of the formula's predicates on domains of 1, 2 and 3 elements, smallest first.</p>
        </>
      )}
    </>
  )
}
