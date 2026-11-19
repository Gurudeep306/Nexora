import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Pencil, Play, RotateCcw, Footprints } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useReducedMotion } from 'motion/react'
import { tokenize } from '../engine/code'
import { codeHash } from '../python/hash'
import { onPyStatus, pyStatus, runPython, type PyResult, type PyStatus } from '../python/runtime'
import { PY_RECORDINGS, RECORDED_WITH } from '../content/ai/python.gen'

// The full editor (Python completion and hover docs) loads only when someone edits.
const CodeEditor = lazy(() => import('@/components/solve/CodeEditor').then((m) => ({ default: m.CodeEditor })))

function Highlighted({ code, active, done, errorLine }: { code: string; active?: number; done?: number; errorLine?: number | null }) {
  const lines = code.split('\n')
  return (
    <pre className="py-code" tabIndex={0} aria-label="Code">
      {lines.map((l, i) => (
        <div key={i} className={cn('py-line', done === i + 1 && active !== i + 1 && 'is-done', active === i + 1 && 'is-active', errorLine === i + 1 && 'is-error')} aria-current={active === i + 1 ? 'step' : undefined}>
          <span className="py-ln" aria-hidden="true">
            {i + 1}
          </span>
          <span>
            {tokenize(l, 'python').map((t, k) => (
              <span key={k} className={t.k ? `tok-${t.k}` : undefined}>
                {t.t}
              </span>
            ))}
            {l.includes('#') && <span className="tok-com">{l.slice(l.indexOf('#'))}</span>}
            {!l && ' '}
          </span>
        </div>
      ))}
    </pre>
  )
}

function usePyStatus() {
  const [s, setS] = useState<PyStatus>(pyStatus)
  useEffect(() => onPyStatus(setS), [])
  return s
}

/**
 * A Python example: read it, run it, step through it line by line (the
 * running line and every variable, animated), or edit it and run your own
 * version. Before the reader runs anything, the output shown is the one
 * recorded from a real run of exactly this code.
 */
export function PythonBlock({ code: original, title, note, stdin = '', browser = true, step = true }: { code: string; title?: string; note?: string; stdin?: string; browser?: boolean; step?: boolean }) {
  const rec = PY_RECORDINGS[codeHash(original, stdin)]
  const [code, setCode] = useState(original)
  const [editing, setEditing] = useState(false)
  const [result, setResult] = useState<PyResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [stepping, setStepping] = useState(false)
  const [k, setK] = useState(0)
  const [playing, setPlaying] = useState(false)
  const reduced = useReducedMotion()
  const status = usePyStatus()
  const edited = code !== original
  const hash = codeHash(original, stdin)

  const run = async (trace: boolean) => {
    setBusy(true)
    const r = await runPython(code, { trace, stdin })
    setBusy(false)
    setResult(r)
    if (trace) {
      setStepping(true)
      setEditing(false)
      setK(0)
      setPlaying(!reduced && r.steps.length > 1)
    } else setStepping(false)
  }

  // Step-through playback.
  const steps = useMemo(() => (stepping ? (result?.steps ?? []) : []), [stepping, result])
  const timer = useRef(0)
  useEffect(() => {
    if (!playing) return
    timer.current = window.setTimeout(() => {
      setK((x) => {
        if (x + 1 >= steps.length) {
          setPlaying(false)
          return x
        }
        return x + 1
      })
    }, 650)
    return () => window.clearTimeout(timer.current)
  }, [playing, k, steps.length])

  const cur = steps[k]
  const prev = steps[k - 1]
  const out = stepping && cur ? (result?.out ?? '').slice(0, cur.out) : result ? result.out : (rec?.out ?? '')
  const showRecorded = !result && !!rec
  const loading = busy && status.state === 'loading'

  return (
    <div className="py-block" role="group" aria-label={`Python example: ${title ?? 'code'}`}>
      <div className="py-head">
        <span className="py-title">{title ?? 'Python'}</span>
        {!browser && <span className="py-tag">recorded run only</span>}
        <span className="ml-auto flex flex-wrap items-center gap-1">
          {browser && (
            <>
              <Button size="sm" variant="secondary" onClick={() => void run(false)} disabled={busy}>
                <Play aria-hidden="true" /> Run
              </Button>
              {step && (
                <Button size="sm" variant="ghost" onClick={() => void run(true)} disabled={busy}>
                  <Footprints aria-hidden="true" /> Step through
                </Button>
              )}
              <Button size="sm" variant="ghost" aria-pressed={editing} onClick={() => { setEditing((e) => !e); setStepping(false) }}>
                <Pencil aria-hidden="true" /> Edit
              </Button>
              {edited && (
                <Button size="sm" variant="ghost" onClick={() => { setCode(original); setResult(null); setStepping(false) }}>
                  <RotateCcw aria-hidden="true" /> Reset
                </Button>
              )}
            </>
          )}
        </span>
      </div>

      {editing ? (
        <div className="py-editor" style={{ height: `${Math.min(440, Math.max(140, code.split('\n').length * 20 + 48))}px` }}>
          <Suspense fallback={<Highlighted code={code} />}>
            <CodeEditor value={code} language="python" onChange={setCode} onRunShortcut={() => void run(false)} onSubmitShortcut={() => void run(false)} minimal savedLabel="Not saved: Reset brings back the lesson's code" />
          </Suspense>
        </div>
      ) : (
        <Highlighted code={code} active={cur?.event === 'line' ? cur.line : undefined} done={cur?.event === 'line' ? prev?.line : cur?.line} errorLine={!stepping ? result?.error?.line : cur?.event === 'exception' ? cur.line : null} />
      )}

      {stepping && steps.length > 0 && (
        <div className="py-step">
          <div className="py-step-bar">
            <Button size="icon-sm" variant="ghost" aria-label="Previous step" onClick={() => { setPlaying(false); setK((x) => Math.max(0, x - 1)) }} disabled={k === 0}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label={playing ? 'Pause' : 'Play'} onClick={() => (k >= steps.length - 1 ? (setK(0), setPlaying(true)) : setPlaying((p) => !p))}>
              {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Next step" onClick={() => { setPlaying(false); setK((x) => Math.min(steps.length - 1, x + 1)) }} disabled={k >= steps.length - 1}>
              <ChevronRight aria-hidden="true" />
            </Button>
            <input className="py-scrub" type="range" min={0} max={steps.length - 1} value={k} aria-label="Step" onChange={(e) => { setPlaying(false); setK(Number(e.target.value)) }} />
            <span className="py-step-n" aria-live="polite">
              Step {k + 1} of {steps.length}
              {cur ? (cur.event === 'line' ? ` · next to run: line ${cur.line}` : cur.event === 'return' ? ` · finished line ${cur.line}` : ` · error on line ${cur.line}`) : ''}
            </span>
          </div>
          {cur && (
            <div className="py-vars-wrap">
              {cur.stack.length > 1 && (
                <p className="py-stack">
                  Inside: {cur.stack.join(' → ')}
                </p>
              )}
              <table className="py-vars">
                <caption className="sr-only">Variables at this step</caption>
                <thead>
                  <tr>
                    <th scope="col">Variable</th>
                    <th scope="col">Type</th>
                    <th scope="col">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(cur.vars).map(([name, [type, value]]) => {
                    const changed = !prev || !prev.vars[name] || prev.vars[name][1] !== value
                    return (
                      <tr key={name} className={cn(changed && 'is-changed', reduced && 'no-motion')}>
                        <td className="font-mono">{name}</td>
                        <td className="text-text-muted">{type}</td>
                        <td className="font-mono">{value}</td>
                      </tr>
                    )
                  })}
                  {Object.keys(cur.vars).length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-text-muted">
                        No variables yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <p className="py-legend">
            <span className="py-key is-done" aria-hidden="true" /> just ran <span className="py-key is-active" aria-hidden="true" /> runs next. The table shows every variable after the line that just ran.
          </p>
          {result?.truncated && <p className="py-note">Only the first {steps.length} steps are shown.</p>}
        </div>
      )}

      <div className="py-out" aria-live="polite">
        <p className="py-out-label">
          {loading
            ? 'Starting Python in your browser (the first run downloads it, about 10 MB)…'
            : busy
              ? 'Running…'
              : result
                ? `Your run · Python ${status.python ?? ''} in your browser${edited ? ' · your edited code' : ''}`
                : showRecorded
                  ? `Output · recorded with Python ${RECORDED_WITH.python}`
                  : 'Output'}
        </p>
        <pre className={cn('py-out-text', result && !result.ok && 'is-error')} tabIndex={0}>
          {out || (result || showRecorded ? '(nothing printed)' : 'Press Run to see the output.')}
          {result?.error && !stepping && `${out ? '\n' : ''}${result.error.text || `${result.error.type}: ${result.error.message}`}`}
        </pre>
        {(result ? result.figures.map((f) => `data:image/png;base64,${f}`) : Array.from({ length: rec?.figures ?? 0 }, (_, i) => `/ai-py/${hash}-${i}.png`)).map((src, i) => (
          <img key={i} src={src} alt={`Figure ${i + 1} drawn by this code`} className="py-fig" loading="lazy" />
        ))}
      </div>
      {note && <p className="py-note">{note}</p>}
    </div>
  )
}
