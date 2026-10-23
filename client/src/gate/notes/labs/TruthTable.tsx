/*
  Truth Table Lab (Discrete Mathematics, Chapter 1 Live Lab). Two tabs:

    table    type a formula (up to 5 variables); the table fills one column per
             sub-formula, a badge classifies it (tautology / contradiction /
             contingency), and the canonical DNF and CNF (minterm / maxterm
             numbers) are listed. The custom operator ⊙ is set by four toggles.
    compare  two formulas: equivalent? does one imply the other? (rows where
             they differ are marked); or an argument: premises ⊢ conclusion,
             with the critical rows and any counterexample row marked.

  All logic is in ./logicLogic.ts (tested against the Python checks in
  content/gate-notes/_checks/dm/logiclib.py).
*/
import { useId, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  DEFAULT_OP,
  MAX_VARS,
  PRESETS,
  argument,
  classify,
  cnfText,
  columns,
  compare,
  dnfText,
  evaluate,
  maxterms,
  minterms,
  parse,
  rows,
  show,
  variables,
  type Formula,
  type OpTable,
} from './logicLogic'

export type TruthTab = 'table' | 'compare'

const TABS: { id: TruthTab; label: string }[] = [
  { id: 'table', label: 'Truth table' },
  { id: 'compare', label: 'Compare / argument' },
]
const SYMBOLS = ['¬', '∧', '∨', '→', '↔', '⊕', '⊙', '(', ')']
const TF = (b: boolean) => (b ? 'T' : 'F')

function tryParse(src: string): { f: Formula | null; err: string | null } {
  try {
    const f = parse(src)
    if (variables(f).length > MAX_VARS) return { f: null, err: `At most ${MAX_VARS} variables` }
    return { f, err: null }
  } catch (e) {
    return { f: null, err: (e as Error).message }
  }
}

export default function TruthTable({ tab: initial = 'table', title }: { tab?: string; title?: string }) {
  const [tab, setTab] = useState<TruthTab>(initial === 'compare' ? 'compare' : 'table')
  const [op, setOp] = useState<OpTable>(DEFAULT_OP)
  const uid = useId()
  return (
    <div className="lab">
      <div className="lab-head">
        <span className="lab-kicker">Live Lab</span>
        <span className="lab-title">{title || 'Truth Table Lab'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Truth Table Lab tools">
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
        {tab === 'table' ? <TableTool op={op} setOp={setOp} /> : <CompareTool op={op} setOp={setOp} />}
      </div>
    </div>
  )
}

/* ── Shared pieces ───────────────────────────────────────────────────── */

function FormulaInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const id = useId()
  return (
    <div className="lab-row">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="lab-input tt-input" value={value} spellCheck={false} autoComplete="off" onChange={(e) => onChange(e.target.value)} />
      <span className="lab-palette" aria-label="Insert a symbol">
        {SYMBOLS.map((s) => (
          <button key={s} type="button" className="lab-row-btn" onClick={() => onChange(value + (s.length === 1 && '()'.includes(s) ? s : ` ${s} `))}>
            {s}
          </button>
        ))}
      </span>
    </div>
  )
}

function OpEditor({ op, setOp }: { op: OpTable; setOp: (o: OpTable) => void }) {
  const labels = ['T ⊙ T', 'T ⊙ F', 'F ⊙ T', 'F ⊙ F']
  return (
    <div className="lab-row" role="group" aria-label="Truth table of the custom operator ⊙">
      <span>Custom ⊙:</span>
      {labels.map((l, i) => (
        <button
          key={l}
          type="button"
          className={cn('lab-toggle', op[i] && 'is-on')}
          aria-pressed={op[i]}
          onClick={() => setOp(op.map((v, j) => (j === i ? !v : v)) as OpTable)}
        >
          {l} = {TF(op[i]!)}
        </button>
      ))}
    </div>
  )
}

/* ── Table tab ───────────────────────────────────────────────────────── */

function TableTool({ op, setOp }: { op: OpTable; setOp: (o: OpTable) => void }) {
  const [src, setSrc] = useState(PRESETS[0]!.formula)
  const [hover, setHover] = useState<number | null>(null)
  const pid = useId()
  const { f, err } = useMemo(() => tryParse(src), [src])
  const data = useMemo(() => {
    if (!f) return null
    const vars = variables(f)
    const cols = columns(f)
    const rs = rows(vars)
    const body = rs.map((r) => cols.map((c) => evaluate(c, r, op)))
    const result = rs.map((r) => evaluate(f, r, op))
    return { vars, cols, rs, body, result, kind: classify(result), mins: minterms(result, vars.length), maxs: maxterms(result, vars.length) }
  }, [f, op])
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
              setSrc(p.formula)
              if (p.op) setOp(p.op)
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
      <FormulaInput value={src} onChange={setSrc} label="Formula" />
      <OpEditor op={op} setOp={setOp} />
      {err && <p className="lab-warn">{err}</p>}
      {data && (
        <>
          <p className={cn('lab-result', data.kind === 'contradiction' ? 'is-bad' : 'is-good')} aria-live="polite">
            {show(f!)} is a <strong>{data.kind}</strong> ({data.result.filter(Boolean).length} of {data.rs.length} rows true)
          </p>
          <div className="lab-tt-wrap">
            <table className="lab-tt">
              <thead>
                <tr>
                  {data.vars.map((v) => (
                    <th key={v} scope="col">
                      {v}
                    </th>
                  ))}
                  {data.cols.map((c, j) => (
                    <th key={j} scope="col">
                      {show(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rs.map((r, i) => (
                  <tr key={i} className={cn(hover === i && 'is-current')} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                    {data.vars.map((v) => (
                      <td key={v}>{TF(r[v]!)}</td>
                    ))}
                    {data.body[i]!.map((x, j) => (
                      <td key={j} className={cn('lab-f', x && 'is-one', j === data.cols.length - 1 && 'tt-last')}>
                        {TF(x)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="lab-lists">
            <div>
              Minterms (true rows): Σm({data.mins.join(', ') || '–'}) · Maxterms (false rows): ΠM({data.maxs.join(', ') || '–'})
            </div>
            <div>Canonical DNF: {dnfText(data.mins, data.vars)}</div>
            <div>Canonical CNF: {cnfText(data.maxs, data.vars)}</div>
          </div>
          <p className="lab-hint">Numbering: T = 1 and the first variable is the most significant bit, so the first row (all T) is minterm {2 ** data.vars.length - 1}.</p>
        </>
      )}
    </>
  )
}

/* ── Compare tab ─────────────────────────────────────────────────────── */

function CompareTool({ op, setOp }: { op: OpTable; setOp: (o: OpTable) => void }) {
  const [mode, setMode] = useState<'equiv' | 'argument'>('equiv')
  const [a, setA] = useState('p -> q')
  const [b, setB] = useState('~q -> ~p')
  const [prem, setPrem] = useState('p -> q, ~q')
  const [concl, setConcl] = useState('~p')
  const fa = useMemo(() => tryParse(a), [a])
  const fb = useMemo(() => tryParse(b), [b])
  const ps = useMemo(() => prem.split(',').map((s) => s.trim()).filter(Boolean).map(tryParse), [prem])
  const fc = useMemo(() => tryParse(concl), [concl])
  return (
    <>
      <div className="lab-row" role="group" aria-label="Mode">
        <button type="button" className={cn('lab-toggle', mode === 'equiv' && 'is-on')} aria-pressed={mode === 'equiv'} onClick={() => setMode('equiv')}>
          Two formulas
        </button>
        <button type="button" className={cn('lab-toggle', mode === 'argument' && 'is-on')} aria-pressed={mode === 'argument'} onClick={() => setMode('argument')}>
          Argument
        </button>
      </div>
      <OpEditor op={op} setOp={setOp} />
      {mode === 'equiv' ? (
        <>
          <FormulaInput value={a} onChange={setA} label="A" />
          <FormulaInput value={b} onChange={setB} label="B" />
          {(fa.err || fb.err) && <p className="lab-warn">{fa.err || fb.err}</p>}
          {fa.f && fb.f && <EquivView a={fa.f} b={fb.f} op={op} />}
        </>
      ) : (
        <>
          <FormulaInput value={prem} onChange={setPrem} label="Premises (comma-separated)" />
          <FormulaInput value={concl} onChange={setConcl} label="Conclusion" />
          {(ps.find((p) => p.err)?.err || fc.err) && <p className="lab-warn">{ps.find((p) => p.err)?.err || fc.err}</p>}
          {fc.f && ps.length > 0 && ps.every((p) => p.f) && <ArgView premises={ps.map((p) => p.f!)} conclusion={fc.f} op={op} />}
        </>
      )}
    </>
  )
}

function EquivView({ a, b, op }: { a: Formula; b: Formula; op: OpTable }) {
  const c = compare(a, b, op)
  const rs = rows(c.vars)
  const verdict = c.equivalent ? 'A ≡ B: the columns agree on every row' : c.aImpliesB ? 'A implies B, but not conversely' : c.bImpliesA ? 'B implies A, but not conversely' : 'Neither implies the other'
  return (
    <>
      <p className={cn('lab-result', c.equivalent ? 'is-good' : 'is-bad')} aria-live="polite">
        {verdict}
        {!c.equivalent && ` (they differ on ${c.differ.length} row${c.differ.length > 1 ? 's' : ''})`}
      </p>
      <div className="lab-tt-wrap">
        <table className="lab-tt">
          <thead>
            <tr>
              {c.vars.map((v) => (
                <th key={v}>{v}</th>
              ))}
              <th>A</th>
              <th>B</th>
            </tr>
          </thead>
          <tbody>
            {rs.map((r, i) => (
              <tr key={i} className={cn(c.differ.includes(i) && 'is-current')}>
                {c.vars.map((v) => (
                  <td key={v}>{TF(r[v]!)}</td>
                ))}
                <td className={cn('lab-f', c.a[i] && 'is-one')}>{TF(c.a[i]!)}</td>
                <td className={cn('lab-f', c.b[i] && 'is-one')}>{TF(c.b[i]!)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lab-hint">Highlighted rows are where A and B differ.</p>
    </>
  )
}

function ArgView({ premises, conclusion, op }: { premises: Formula[]; conclusion: Formula; op: OpTable }) {
  const arg = argument(premises, conclusion, op)
  const rs = rows(arg.vars)
  return (
    <>
      <p className={cn('lab-result', arg.valid ? 'is-good' : 'is-bad')} aria-live="polite">
        {arg.valid
          ? `Valid: the conclusion is true on all ${arg.critical.length} critical row${arg.critical.length === 1 ? '' : 's'}`
          : `Invalid: ${arg.counter.length} counterexample row${arg.counter.length > 1 ? 's' : ''} (premises true, conclusion false)`}
      </p>
      <div className="lab-tt-wrap">
        <table className="lab-tt">
          <thead>
            <tr>
              {arg.vars.map((v) => (
                <th key={v}>{v}</th>
              ))}
              {premises.map((p, j) => (
                <th key={j}>{show(p)}</th>
              ))}
              <th>⊢ {show(conclusion)}</th>
            </tr>
          </thead>
          <tbody>
            {rs.map((r, i) => (
              <tr key={i} className={cn(arg.counter.includes(i) && 'is-current', arg.critical.includes(i) && 'tt-critical')}>
                {arg.vars.map((v) => (
                  <td key={v}>{TF(r[v]!)}</td>
                ))}
                {arg.premises.map((p, j) => (
                  <td key={j} className={cn('lab-f', p[i] && 'is-one')}>
                    {TF(p[i]!)}
                  </td>
                ))}
                <td className={cn('lab-f', arg.conclusion[i] && 'is-one')}>{TF(arg.conclusion[i]!)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lab-hint">Critical rows (all premises true) are outlined; a highlighted row is a counterexample.</p>
    </>
  )
}
