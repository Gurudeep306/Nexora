import { useEffect, useMemo, useState } from 'react'
import { Loader2, Play, RotateCcw } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { CodeLines, FramePlayer, type TimelineMark } from '@/learn/engine/FramePlayer'
import type { Lang } from '@/learn/engine/types'
import { engineLabel } from '../types'
import { replay, setLanguage, type TraceEvent } from './replay'
import { toFrames, type DryFrame } from './toFrames'

/*
 * Dry run: the student's own program, run once on a sample, drawn step by
 * step by the same player as the DSA chapters. Every failure says what
 * happened and what to do next — nothing fails silently.
 */

interface DryRunResponse {
  ok: boolean
  supported: boolean
  events: TraceEvent[]
  stdout: string
  stderr: string
  verdict: string
  timeMs: number | null
  engine: string | null
  capped: boolean
  error: string | null
}

export interface DryRunCase {
  label: string
  input: string
}

interface Props {
  code: string
  language: string
  cases: DryRunCase[]
  /** Which case to start on (the one selected in Tests). */
  initialCase?: number
  onJumpToLine?: (line: number) => void
}

/** Languages the dry run traces today (src/dryrun/index.js TRACERS). */
export const DRY_RUN_LANGS = new Set(['python', 'cpp', 'c', 'java', 'javascript', 'typescript', 'go', 'rust', 'csharp', 'kotlin', 'swift'])

const CODE_LANG: Record<string, Lang> = { python: 'python', cpp: 'cpp', c: 'c', java: 'java', javascript: 'js', typescript: 'js' }
const LANG_NAME: Record<string, string> = { python: 'Python', cpp: 'C++', c: 'C', java: 'Java', javascript: 'JavaScript', typescript: 'TypeScript', go: 'Go', rust: 'Rust', csharp: 'C#', kotlin: 'Kotlin', swift: 'Swift' }

type Status = { state: 'idle' } | { state: 'running' } | { state: 'done'; res: DryRunResponse; code: string; input: string } | { state: 'failed'; message: string }

export function DryRunPanel({ code, language, cases, initialCase = 0, onJumpToLine }: Props) {
  const [pick, setPick] = useState(Math.min(Math.max(0, initialCase), Math.max(0, cases.length - 1)))
  const [status, setStatus] = useState<Status>({ state: 'idle' })
  const [nonce, setNonce] = useState(0)
  const supported = DRY_RUN_LANGS.has(language)
  const current = cases[pick] ?? { label: 'No input', input: '' }

  // Run when the panel opens, and again when the student asks (sample change,
  // "Run again"). Nothing is set synchronously inside the effect.
  const request = useMemo(() => ({ code, language, input: current.input, nonce }), [nonce, pick, language]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!supported || !request.code.trim()) return
    let live = true
    const started = window.setTimeout(() => live && setStatus({ state: 'running' }), 0)
    api
      .post<DryRunResponse>('/api/dryrun', { code: request.code, input: request.input, language: request.language }, { timeoutMs: 120000 })
      .then((res) => live && setStatus({ state: 'done', res, code: request.code, input: request.input }))
      .catch((e) => live && setStatus({ state: 'failed', message: e instanceof ApiError ? e.message : 'Could not reach the code runner. Check your connection and try again.' }))
    return () => {
      live = false
      window.clearTimeout(started)
    }
  }, [request, supported])

  const done = status.state === 'done' ? status : null
  const frames = useMemo<DryFrame[]>(() => {
    if (!done?.res.ok) return []
    try {
      setLanguage(language)
      return toFrames(replay(done.res.events), done.code, done.res.stdout)
    } catch {
      return []
    }
  }, [done, language])
  const marks = useMemo<TimelineMark[]>(() => {
    const out: TimelineMark[] = []
    frames.forEach((f, i) => {
      if (f.kind === 'call') out.push({ at: i, kind: 'call', label: f.note })
      else if (f.kind === 'exc') out.push({ at: i, kind: 'error', label: f.note })
      else if (i > 0 && f.out > frames[i - 1].out) out.push({ at: i, kind: 'output', label: `Prints on line ${f.line}` })
    })
    return out
  }, [frames])

  const stale = !!done && done.code !== code
  const runAgain = () => setNonce((n) => n + 1)

  const picker = (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <div className="viz-tabs flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg p-0.5 [scrollbar-width:none]" role="group" aria-label="Input to run on">
        {cases.map((c, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={pick === i}
            onClick={() => {
              setPick(i)
              runAgain()
            }}
            className={cn('shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-[11.5px] font-medium hover:!scale-100', pick === i ? 'viz-tab-on text-text-primary' : 'text-text-muted hover:text-text-primary')}
          >
            {c.label}
          </button>
        ))}
      </div>
      <button type="button" onClick={runAgain} disabled={status.state === 'running'} className="btn-primary inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12.5px]">
        {status.state === 'running' ? <Loader2 className="size-3.5 animate-spin" /> : stale ? <RotateCcw className="size-3.5" /> : <Play className="size-3.5" />}
        {status.state === 'running' ? 'Running…' : stale ? 'Run my latest code' : 'Run again'}
      </button>
      {stale && <span className="text-[12px] text-text-muted">Your code changed since this run.</span>}
    </div>
  )

  if (!supported) {
    return (
      <Notice title={`Dry run for ${LANG_NAME[language] ?? language} is coming`}>
        The dry run draws your own program running, step by step. It works today for {new Intl.ListFormat('en', { type: 'conjunction' }).format([...DRY_RUN_LANGS].map((l) => LANG_NAME[l] ?? l))}; more languages
        are on the way. Switch the language to one of these to try it now.
      </Notice>
    )
  }
  if (!code.trim()) return <Notice title="Nothing to run yet">Write your solution, then come back to watch it run on the samples.</Notice>
  if (!cases.length) return <Notice title="No input to run on">Add a test (or a custom input) in Tests, then come back here.</Notice>

  const res = done?.res
  const blurb =
    status.state === 'running' ? (
      'Running your code on the judge…'
    ) : res ? (
      <>
        {res.verdict === 'OK' ? 'Finished' : res.verdict === 'TLE' ? 'Stopped: too slow' : 'Stopped with an error'}
        {res.timeMs != null ? ` in ${res.timeMs} ms` : ''}
        {res.engine ? ` on ${engineLabel(res.engine)}` : ''} · {frames.length} steps
      </>
    ) : null

  const failure =
    status.state === 'failed'
      ? status.message
      : res && !res.ok
        ? `${res.error ?? 'The program could not run.'}${res.stderr && res.stderr !== res.error ? `\n${res.stderr}` : ''}`
        : res && frames.length === 0
          ? 'The run finished, but there were no steps to draw.'
          : null

  const footnote = res ? (
    <>
      {res.capped && <p className="m-0">Showing the first {frames.length} steps — the program kept running to the end, so the output is complete.</p>}
      {res.ok && res.stderr && <pre className="m-0 mt-1 font-mono text-[11.5px] whitespace-pre-wrap text-state-error">{res.stderr.slice(0, 600)}</pre>}
    </>
  ) : null

  const lines = (done?.code ?? code).split('\n')

  return (
    <div className="p-3">
      <FramePlayer
        id="dryrun"
        kicker="Dry run"
        title={`Your code on ${current.label}`}
        blurb={blurb}
        frames={frames}
        error={status.state === 'running' && !frames.length ? null : failure}
        header={picker}
        code={(frame) => {
          const f = frame as DryFrame | undefined
          return <CodeLines lines={lines} hot={new Set(f ? [f.line - 1] : [])} lang={CODE_LANG[language] ?? 'pseudo'} layoutKey="dryrun" label="Your code" />
        }}
        codeTabs={
          <button type="button" className="text-[11.5px] text-text-muted underline-offset-2 hover:text-text-primary hover:underline" onClick={() => onJumpToLine?.(1)}>
            Your code
          </button>
        }
        resetKey={done}
        autoplay={false}
        marks={marks}
        footnote={res?.capped || (res?.ok && res.stderr) ? footnote : undefined}
      />
      {status.state === 'running' && !frames.length && (
        <p className="mt-3 flex items-center justify-center gap-2 text-[13px] text-text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Running your code on {current.label} and recording every step…
        </p>
      )}
      {(status.state === 'failed' || (res && !res.ok)) && (
        <div className="mt-3 flex justify-center">
          <button type="button" onClick={runAgain} className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12.5px]">
            <RotateCcw className="size-3.5" /> Try again
          </button>
        </div>
      )}
    </div>
  )
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl p-6 text-center">
      <p className="m-0 font-display text-[16px] font-semibold text-text-primary">{title}</p>
      <p className="m-0 mt-1.5 text-[13.5px] leading-relaxed text-text-secondary">{children}</p>
    </div>
  )
}
