/*
  Python for the lessons: one Pyodide worker for the whole site, started the
  first time someone presses Run. Pyodide is the official CPython build for
  WebAssembly; the version is pinned here (and allowed in the server's CSP).
*/

/** Pyodide release (its Python and package versions are listed in docs/ai-courses/PYTHON.md). */
export const PYODIDE_VERSION = '314.0.8'
// The full distribution (core and every package wheel) as published by the Pyodide project.
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`
/** How long one run may take before it is stopped (an endless loop, usually). */
const LIMIT_MS = 10000

export interface PyStep {
  line: number
  event: 'line' | 'return' | 'exception'
  stack: string[]
  /** name → [type, repr] */
  vars: Record<string, [string, string]>
  /** How much of the output had been printed by this step. */
  out: number
}
export interface PyResult {
  ok: boolean
  out: string
  error: { type: string; message: string; line: number | null; text: string } | null
  steps: PyStep[]
  truncated?: boolean
  /** PNG images (base64) of any Matplotlib figures the code drew. */
  figures: string[]
}
export type PyStatus = { state: 'idle' | 'loading' | 'ready' | 'failed'; python?: string; message?: string }

let worker: Worker | null = null
let status: PyStatus = { state: 'idle' }
const listeners = new Set<(s: PyStatus) => void>()
const pending = new Map<number, (r: PyResult) => void>()
let nextId = 1

function setStatus(s: PyStatus) {
  status = s
  for (const l of listeners) l(s)
}
export const pyStatus = () => status
export function onPyStatus(fn: (s: PyStatus) => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function start(): Worker {
  if (worker) return worker
  const w = new Worker(new URL('./worker.js', import.meta.url))
  w.onmessage = (e: MessageEvent) => {
    const m = e.data
    if (m.type === 'ready') setStatus({ state: 'ready', python: m.python })
    else if (m.type === 'failed') setStatus({ state: 'failed', message: m.message })
    else if (m.type === 'done') {
      pending.get(m.id)?.(m as PyResult)
      pending.delete(m.id)
    }
  }
  w.onerror = () => setStatus({ state: 'failed', message: 'Python could not start in this browser.' })
  setStatus({ state: 'loading' })
  w.postMessage({ type: 'boot', indexURL: INDEX_URL })
  worker = w
  return w
}

/** Runs a lesson's code. With `trace`, every line it runs is recorded with the variables at that moment. */
export function runPython(code: string, { trace = false, stdin = '' }: { trace?: boolean; stdin?: string } = {}): Promise<PyResult> {
  const w = start()
  const id = nextId++
  return new Promise((resolve) => {
    // The clock starts once Python has loaded: downloading it is not the code's fault.
    let timer = 0
    const arm = () => {
      timer = window.setTimeout(() => {
        if (!pending.has(id)) return
        pending.delete(id)
        // End the stuck worker; the next run starts a fresh one.
        w.terminate()
        worker = null
        setStatus({ state: 'idle' })
        resolve({ ok: false, out: '', error: { type: 'TimeoutError', message: `Stopped after ${LIMIT_MS / 1000} seconds. Is there a loop that never ends?`, line: null, text: '' }, steps: [], figures: [] })
      }, LIMIT_MS)
    }
    pending.set(id, (r) => {
      window.clearTimeout(timer)
      resolve(r)
    })
    if (status.state === 'ready') arm()
    else {
      const off = onPyStatus((s) => {
        if (s.state === 'ready') {
          off()
          arm()
        } else if (s.state === 'failed') {
          off()
          pending.delete(id)
          resolve({ ok: false, out: '', error: { type: 'LoadError', message: s.message ?? 'Python could not load.', line: null, text: '' }, steps: [], figures: [] })
        }
      })
    }
    w.postMessage({ type: 'run', id, code, stdin, trace })
  })
}
