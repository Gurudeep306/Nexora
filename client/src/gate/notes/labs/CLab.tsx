/*
  The C labs of Programming & Data Structures share this component; each lab
  registered in ./index.ts is a thin wrapper that picks the chapter (whose
  presets it offers) and the tabs:

    trace    run a C program statement by statement: the current line, every
             stack frame with its variables (changed values marked), the
             static/global area, the output so far and the interpreter's note
             (which branch was taken, what was returned); the compiler's real
             output is shown beside the trace for every preset
    expr     evaluate one C expression after some declarations, operator by
             operator: operands, conversions, results, and the operands that
             && || ?: did not evaluate
    memory   the same run as bytes: every variable of the current step with
             its address, size and value, pointers drawn as arrows to the
             variable they point at (Chapter 2)
    calls    the call tree of the run with arguments and return values, the
             output each call produced and the maximum stack depth (Chapter 3)

  All logic is in ./cLogic.ts (checked against the system C compiler by
  tests/gate-notes.test.js). Every control is a real button, select, input or
  textarea; tabs follow the WAI-ARIA pattern; results are announced through an
  always-mounted live region; colours come from theme tokens only.
*/
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { explainExpr, runC, type CallNode, type RunResult, type VarView } from './cLogic'
import { C_PRESETS } from './cPresets'

export type CLabTab = 'trace' | 'expr' | 'memory' | 'calls'

const TAB_LABEL: Record<CLabTab, string> = { trace: 'Step through', expr: 'Expression', memory: 'Memory', calls: 'Call tree' }

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function CLab({ chapter, tabs, initial, title, name }: { chapter: number; tabs: CLabTab[]; initial?: string; title?: string; name: string }) {
  const [tab, setTab] = useState<CLabTab>(tabs.includes(initial as CLabTab) ? (initial as CLabTab) : tabs[0])
  const uid = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, k: number) => {
    const last = tabs.length - 1
    const to = e.key === 'ArrowRight' ? (k === last ? 0 : k + 1) : e.key === 'ArrowLeft' ? (k === 0 ? last : k - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1
    if (to < 0) return
    e.preventDefault()
    setTab(tabs[to])
    refs.current[to]?.focus()
  }
  return (
    <div className="lab clab">
      <div className="lab-head">
        <span className="lab-kicker">Live Lab</span>
        <span className="lab-title">{title || name}</span>
      </div>
      {tabs.length > 1 && (
        <div className="lab-tabs" role="tablist" aria-label={`${name} tools`}>
          {tabs.map((t, k) => (
            <button
              key={t}
              ref={(el) => {
                refs.current[k] = el
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${t}`}
              aria-selected={tab === t}
              aria-controls={`${uid}-panel`}
              tabIndex={tab === t ? 0 : -1}
              className={cn('lab-tab', tab === t && 'is-on')}
              onClick={() => setTab(t)}
              onKeyDown={(e) => onKey(e, k)}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      )}
      <div className="lab-panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
        {tab === 'expr' ? <ExprTool /> : <RunTool chapter={chapter} view={tab} />}
      </div>
    </div>
  )
}

/* ── Running a program ─────────────────────────────────────────────── */

function RunTool({ chapter, view }: { chapter: number; view: Exclude<CLabTab, 'expr'> }) {
  const u = useId()
  const presets = useMemo(() => C_PRESETS.filter((p) => p.chapter === chapter), [chapter])
  const [pid, setPid] = useState(presets[0]?.id ?? '')
  const preset = presets.find((p) => p.id === pid)
  const [src, setSrc] = useState(preset?.src ?? 'int main(void) {\n  return 0;\n}\n')
  const [input, setInput] = useState(preset?.input ?? '')
  const [res, setRes] = useState<RunResult | null>(null)
  const [k, setK] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [live, setLive] = useState('')

  const run = (code = src, inp = input) => {
    const r = runC(code, { input: inp })
    setRes(r)
    setK(0)
    setPlaying(false)
    setLive(r.error ? `Stopped: ${r.error.message}` : `Ran ${r.steps.length} steps. Output: ${r.out.trim().slice(0, 120) || '(none)'}`)
  }
  const choose = (id: string) => {
    const p = presets.find((x) => x.id === id)
    if (!p) return
    setPid(id)
    setSrc(p.src)
    setInput(p.input)
    setRes(null)
  }
  const atEnd = !res || k >= res.steps.length - 1
  const isPlaying = playing && !atEnd
  useEffect(() => {
    if (!isPlaying) return
    const h = window.setTimeout(() => setK((x) => x + 1), reduceMotion() ? 0 : 450)
    return () => window.clearTimeout(h)
  }, [isPlaying, k])

  const step = res?.steps[k]
  const edited = !!preset && src !== preset.src
  const lines = src.replace(/\n$/, '').split('\n')
  return (
    <div>
      <div className="lab-row">
        <label htmlFor={`${u}-p`}>Program</label>
        <select id={`${u}-p`} className="lab-select" value={pid} onChange={(e) => choose(e.target.value)}>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <button type="button" className="lab-btn lab-btn--main" onClick={() => run()}>
          Run
        </button>
      </div>
      <details className="clab-edit" open={!res}>
        <summary>Edit the code{edited ? ' (edited)' : ''}</summary>
        <label className="sr-only" htmlFor={`${u}-src`}>
          C source
        </label>
        <textarea id={`${u}-src`} className="clab-src" spellCheck={false} value={src} rows={Math.min(18, lines.length + 1)} onChange={(e) => setSrc(e.target.value)} />
        <div className="lab-row">
          <label htmlFor={`${u}-in`}>Input (for getchar)</label>
          <input id={`${u}-in`} className="lab-input" value={input} onChange={(e) => setInput(e.target.value)} />
        </div>
      </details>
      {res && (
        <>
          <div className="lab-row" role="group" aria-label="Step controls">
            <button type="button" className="lab-btn" onClick={() => setK(0)} disabled={k === 0}>
              ⏮ Start
            </button>
            <button type="button" className="lab-btn" onClick={() => setK((x) => Math.max(0, x - 1))} disabled={k === 0}>
              ◀ Back
            </button>
            <button type="button" className="lab-btn" onClick={() => setPlaying(!isPlaying)} disabled={atEnd}>
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button type="button" className="lab-btn" onClick={() => setK((x) => Math.min(res.steps.length - 1, x + 1))} disabled={k >= res.steps.length - 1}>
              Step ▶
            </button>
            <button type="button" className="lab-btn" onClick={() => setK(res.steps.length - 1)} disabled={k >= res.steps.length - 1}>
              End ⏭
            </button>
            <label className="clab-slider">
              <span className="sr-only">Step</span>
              <input type="range" min={0} max={Math.max(0, res.steps.length - 1)} value={k} onChange={(e) => setK(Number(e.target.value))} aria-valuetext={`step ${k + 1} of ${res.steps.length}, line ${step?.line}`} />
            </label>
            <span className="lab-hint clab-count">
              step {k + 1} / {res.steps.length}
            </span>
          </div>
          {view === 'calls' ? (
            <CallTree res={res} />
          ) : (
            <div className="lab-grid">
              <div className="lab-col">
                <ol className="clab-code" aria-label="Program">
                  {lines.map((l, i) => (
                    <li key={i} className={cn(step?.line === i + 1 && 'is-cur')} aria-current={step?.line === i + 1 ? 'step' : undefined}>
                      <span className="clab-ln" aria-hidden="true">
                        {i + 1}
                      </span>
                      <code>{l || ' '}</code>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="lab-col">
                {step?.note && <p className="clab-note">{step.note}</p>}
                {view === 'memory' ? <MemoryView step={step} /> : <FramesView step={step} />}
                <h4 className="clab-h">Output so far</h4>
                <pre className="clab-out">{step?.out || ' '}</pre>
              </div>
            </div>
          )}
          {res.error && <p className="lab-warn">⚠ {res.error.kind === 'compile' ? 'Does not compile' : 'Stopped'} (line {res.error.line}): {res.error.message}</p>}
          {res.warnings.map((w) => (
            <p key={w} className="lab-hint">
              ⚠ {w}
            </p>
          ))}
          <div className="clab-compare">
            <div>
              <h4 className="clab-h">This lab printed</h4>
              <pre className="clab-out">{res.out || ' '}</pre>
            </div>
            {preset && !edited && (
              <div>
                <h4 className="clab-h">The real C compiler printed</h4>
                <pre className="clab-out">{preset.cc || ' '}</pre>
              </div>
            )}
          </div>
        </>
      )}
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </div>
  )
}

function VarRow({ v }: { v: VarView }) {
  return (
    <tr className={cn(v.changed && 'is-changed')}>
      <th scope="row">
        <code>{v.name}</code>
      </th>
      <td className="clab-type">{v.type}</td>
      <td>
        <code>{v.value}</code>
        {v.changed && <span className="sr-only"> (changed)</span>}
      </td>
    </tr>
  )
}

function FramesView({ step }: { step: RunResult['steps'][number] | undefined }) {
  if (!step) return null
  return (
    <div>
      <h4 className="clab-h">Call stack (top = running)</h4>
      {[...step.frames].reverse().map((f, i) => (
        <table key={`${f.fn}-${i}`} className={cn('clab-frame', i === 0 && 'is-top')}>
          <caption>
            <code>{f.fn}()</code> {i === 0 ? '— running' : '— waiting for its call to return'}
          </caption>
          <tbody>
            {f.vars.length ? f.vars.map((v) => <VarRow key={v.name + v.addr} v={v} />) : (
              <tr>
                <td colSpan={3} className="lab-hint">
                  no local variables yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      ))}
      {step.statics.length > 0 && (
        <table className="clab-frame clab-static">
          <caption>Globals and statics (data segment: one copy for the whole run)</caption>
          <tbody>
            {step.statics.map((v) => (
              <VarRow key={v.name} v={v} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function MemoryView({ step }: { step: RunResult['steps'][number] | undefined }) {
  if (!step) return null
  const all = [...step.statics.map((v) => ({ ...v, where: 'data' })), ...step.frames.flatMap((f) => f.vars.map((v) => ({ ...v, where: `${f.fn}()` })))]
  const byAddr = new Map(all.map((v) => [v.addr, v.name]))
  return (
    <div>
      <h4 className="clab-h">Memory (addresses in hex)</h4>
      <table className="clab-frame clab-mem">
        <thead>
          <tr>
            <th scope="col">address</th>
            <th scope="col">name</th>
            <th scope="col">type</th>
            <th scope="col">value</th>
          </tr>
        </thead>
        <tbody>
          {all
            .sort((a, b) => a.addr - b.addr)
            .map((v) => {
              const target = /^0x[0-9a-f]+$/.test(v.value) ? byAddr.get(parseInt(v.value, 16)) : undefined
              return (
                <tr key={v.where + v.name + v.addr} className={cn(v.changed && 'is-changed')}>
                  <td>
                    <code>0x{v.addr.toString(16)}</code>
                  </td>
                  <th scope="row">
                    <code>{v.name}</code> <span className="lab-hint">{v.where}</span>
                  </th>
                  <td className="clab-type">{v.type}</td>
                  <td>
                    <code>{v.value}</code>
                    {target && <span className="clab-arrow"> → {target}</span>}
                  </td>
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}

function CallTree({ res }: { res: RunResult }) {
  const roots = res.calls.filter((c) => c.parent === null)
  const render = (c: CallNode) => (
    <li key={c.id}>
      <code>
        {c.fn}({c.args})
      </code>
      {c.ret !== undefined && c.ret !== '' && <span className="clab-ret"> → {c.ret}</span>}
      {c.outAfter !== undefined && c.outAfter > c.outBefore && <span className="lab-hint"> printed “{res.out.slice(c.outBefore, c.outAfter).replace(/\n/g, '⏎')}”</span>}
      {c.children.length > 0 && <ul>{c.children.map((i) => render(res.calls[i]))}</ul>}
    </li>
  )
  return (
    <div>
      <p className="lab-hint">
        {res.calls.length} calls in all; the deepest point had {res.maxDepth} frames on the stack at once.
      </p>
      <ul className="clab-tree">{roots.map(render)}</ul>
      <h4 className="clab-h">Output</h4>
      <pre className="clab-out">{res.out || ' '}</pre>
    </div>
  )
}

/* ── One expression ───────────────────────────────────────────────── */

const EXPR_PRESETS = [
  { d: 'int a = 2, b = 3, c = 4;', x: 'a < b || ++a < c' },
  { d: 'unsigned int u = 1; int i = -1;', x: 'i < u' },
  { d: 'int x = 7, y = 2;', x: 'x / y * y + x % y' },
  { d: 'char p = 80, q = 120;', x: '(p & q) + 42' },
  { d: 'int i = 0, j = 5;', x: 'i++ && j++' },
  { d: 'int x = 3, y = 4, z = 2;', x: '(x > y) ? ((x > z) ? x : z) : ((y > z) ? y : z)' },
  { d: 'int a = 1;', x: 'a << 3 | 1' },
  { d: 'double d = 2.5; int n = 2;', x: 'n * d + 7 / 2' },
]

function ExprTool() {
  const u = useId()
  const [d, setD] = useState(EXPR_PRESETS[0].d)
  const [x, setX] = useState(EXPR_PRESETS[0].x)
  const [res, setRes] = useState<ReturnType<typeof explainExpr> | null>(null)
  const go = (dd = d, xx = x) => setRes(explainExpr(dd, xx))
  return (
    <div>
      <div className="lab-row">
        <label htmlFor={`${u}-pre`}>Example</label>
        <select
          id={`${u}-pre`}
          className="lab-select"
          onChange={(e) => {
            const p = EXPR_PRESETS[Number(e.target.value)]
            setD(p.d)
            setX(p.x)
            go(p.d, p.x)
          }}
        >
          {EXPR_PRESETS.map((p, i) => (
            <option key={i} value={i}>
              {p.x}
            </option>
          ))}
        </select>
      </div>
      <div className="lab-row">
        <label htmlFor={`${u}-d`}>Declarations</label>
        <input id={`${u}-d`} className="lab-input clab-wide" value={d} onChange={(e) => setD(e.target.value)} />
      </div>
      <div className="lab-row">
        <label htmlFor={`${u}-x`}>Expression</label>
        <input id={`${u}-x`} className="lab-input clab-wide" value={x} onChange={(e) => setX(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
        <button type="button" className="lab-btn lab-btn--main" onClick={() => go()}>
          Evaluate
        </button>
      </div>
      {res && (
        <div aria-live="polite">
          {res.error ? (
            <p className="lab-warn">⚠ {res.error}</p>
          ) : (
            <>
              <ol className="clab-steps">
                {res.steps.map((s, i) => (
                  <li key={i} className={cn(s.value === '—' && 'is-skip')}>
                    <code>{s.expr}</code> {s.value === '—' ? '' : <>= <code>{s.value}</code> <span className="clab-type">({s.type})</span></>}
                    {s.note && <span className="lab-hint"> — {s.note}</span>}
                  </li>
                ))}
              </ol>
              <p className="lab-result">
                Value: <code>{res.value}</code> of type <code>{res.type}</code>
              </p>
              {res.vars.length > 0 && (
                <p className="lab-hint">
                  Afterwards: {res.vars.map((v) => `${v.name} = ${v.value}`).join(', ')}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
