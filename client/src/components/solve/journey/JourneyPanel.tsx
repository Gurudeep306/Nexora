import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2, Pause, Play, RotateCcw, Cpu } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { MONACO_LANG } from '@/lib/monacoLang'
import { parseDiagnostics } from '@/lib/diagnostics'
import { engineLabel, type RunResult } from '../types'
import { noteFor, parseInstr, REGISTERS, REGISTER_NOTE, STACK_NOTE } from './instructions'
import './journey.css'

/*
 * How your code runs — five stops, all real:
 *   1 Write      the student's own code
 *   2 Read       Monaco's tokenizer splits a line into tokens
 *   3 Check      the real compiler's verdict (Compiler Explorer)
 *   4 Translate  the real assembly / bytecode, line by line
 *   5 Run        their input in, the real output out (the judge)
 */

type Plan = { kind: 'machine' | 'jit' | 'bytecode' | 'interpreted'; target: string | null; runner: string; listing: boolean; canToggleOpt: boolean }
type Listing = { text: string; line: number | null; label?: boolean }
type Translation = {
  ok: boolean
  plan: Plan
  compiler?: string
  args?: string
  lines: Listing[]
  mapped?: boolean
  truncated?: boolean
  error?: string | null
  compileError?: string
}

interface Props {
  code: string
  language: string
  /** The input the Run stop uses (the selected test, or the custom input). */
  input: string
  inputLabel: string
  onJumpToLine?: (line: number) => void
}

const STOPS = [
  { id: 'write', name: 'Write', sub: 'your code' },
  { id: 'read', name: 'Read', sub: 'into tokens' },
  { id: 'check', name: 'Check', sub: 'by the compiler' },
  { id: 'translate', name: 'Translate', sub: 'to instructions' },
  { id: 'run', name: 'Run', sub: 'with your input' },
] as const

const LANG_NAME: Record<string, string> = {
  cpp: 'C++', c: 'C', python: 'Python', java: 'Java', javascript: 'JavaScript', typescript: 'TypeScript', csharp: 'C#', go: 'Go', rust: 'Rust',
  kotlin: 'Kotlin', ruby: 'Ruby', php: 'PHP', perl: 'Perl', lua: 'Lua', shell: 'Bash', r: 'R', scala: 'Scala', swift: 'Swift', dart: 'Dart',
  powershell: 'PowerShell', julia: 'Julia', fsharp: 'F#', clojure: 'Clojure', scheme: 'Scheme', objectivec: 'Objective-C', pascal: 'Pascal',
  elixir: 'Elixir', tcl: 'Tcl', haskell: 'Haskell', ocaml: 'OCaml', d: 'D', nim: 'Nim', zig: 'Zig', crystal: 'Crystal', groovy: 'Groovy', commonlisp: 'Common Lisp',
}

/* ── tokens (stop 2) ── */
type Tok = { text: string; kind: string }
const TOKEN_KIND: [RegExp, string][] = [
  [/comment/, 'comment'],
  [/string|char/, 'text'],
  [/number/, 'number'],
  [/keyword|predefined/, 'keyword'],
  [/type/, 'type'],
  [/identifier|variable|function|attribute|tag/, 'name'],
  [/delimiter|operator|bracket|punctuation/, 'symbol'],
]
const kindOf = (type: string) => TOKEN_KIND.find(([re]) => re.test(type))?.[1] ?? 'symbol'

function useTokens(code: string, language: string) {
  const [lines, setLines] = useState<Tok[][] | null>(null)
  useEffect(() => {
    let live = true
    void import('@/lib/monaco').then(({ monaco }) => {
      if (!live) return
      const src = code.split('\n')
      try {
        const all = monaco.editor.tokenize(code, MONACO_LANG[language] ?? language)
        setLines(
          all.map((toks, i) => {
            const text = src[i] ?? ''
            return toks
              .map((t, j) => ({ text: text.slice(t.offset, j + 1 < toks.length ? toks[j + 1].offset : text.length), kind: kindOf(t.type) }))
              .filter((t) => t.text.trim())
              .flatMap((t) => (t.kind === 'symbol' && t.text.trim().length > 1 && !/^(::|->|<=|>=|==|!=|&&|\|\||<<|>>|\+\+|--|\+=|-=|\*=|\/=|=>|\*\*|\/\/)$/.test(t.text.trim()) ? [...t.text.trim()].map((c) => ({ text: c, kind: 'symbol' })) : [{ text: t.text.trim(), kind: t.kind }]))
          }),
        )
      } catch {
        setLines(src.map((l) => l.split(/(\s+|[()[\]{};,.])/).filter((x) => x && x.trim()).map((x) => ({ text: x, kind: /^\w+$/.test(x) ? 'name' : 'symbol' }))))
      }
    })
    return () => {
      live = false
    }
  }, [code, language])
  return lines
}

/* ── steps through the listing (stop 4) ── */
type Step = { line: number; idx: number[] }
function buildSteps(lines: Listing[]): Step[] {
  const steps: Step[] = []
  lines.forEach((l, i) => {
    if (l.label || l.line == null) return
    const last = steps[steps.length - 1]
    if (last && last.line === l.line && last.idx[last.idx.length - 1] === i - 1) last.idx.push(i)
    else steps.push({ line: l.line, idx: [i] })
  })
  return steps
}

const SPEEDS = { slow: 2600, normal: 1500, fast: 700 } as const

export function JourneyPanel(props: Props) {
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])
  const body = <Journey {...props} expanded={expanded} onToggleExpand={() => setExpanded((v) => !v)} />
  return expanded ? createPortal(<div className="jr-overlay" role="dialog" aria-modal="true" aria-label="How your code runs">{body}</div>, document.body) : body
}

function Journey({ code, language, input, inputLabel, onJumpToLine, expanded, onToggleExpand }: Props & { expanded: boolean; onToggleExpand: () => void }) {
  const reduce = useReducedMotion()
  const [stop, setStop] = useState(0)
  const [snapshot, setSnapshot] = useState(code)
  const [optimise, setOptimise] = useState(true)
  const [nonce, setNonce] = useState(0)
  // One answer per (code, optimisation, retry): "loading" is simply "no answer
  // for the current request yet", so nothing is set synchronously in an effect.
  const reqKey = `${nonce}\u0000${optimise}\u0000${snapshot}`
  const [answer, setAnswer] = useState<{ key: string; tr: Translation | null; error: string | null } | null>(null)
  useEffect(() => {
    if (!snapshot.trim()) return
    let live = true
    api
      .post<Translation>('/api/explain-run', { code: snapshot, language, optimise }, { timeoutMs: 60000 })
      .then((tr) => live && setAnswer({ key: reqKey, tr, error: null }))
      .catch((e) => live && setAnswer({ key: reqKey, tr: null, error: e instanceof ApiError ? e.message : 'Could not reach the compiler. Try again.' }))
    return () => {
      live = false
    }
  }, [reqKey, snapshot, language, optimise])
  const current = answer?.key === reqKey ? answer : null
  const loading = !current
  const tr = current?.tr ?? (answer?.tr && answer.tr.plan ? answer.tr : null)
  const loadError = current?.error ?? null
  const retry = () => setNonce((n) => n + 1)
  const name = LANG_NAME[language] ?? language
  const srcLines = useMemo(() => snapshot.split('\n'), [snapshot])
  const stale = code !== snapshot

  const refresh = () => {
    setSnapshot(code)
    setStop((s) => Math.min(s, 1))
  }

  const plan = tr?.plan
  const failed = !!tr?.compileError
  const kindWord = plan?.kind === 'bytecode' ? 'bytecode' : plan?.kind === 'jit' ? 'bytecode, then CPU instructions' : plan?.kind === 'interpreted' ? 'steps its interpreter follows' : 'CPU instructions'

  if (!snapshot.trim()) {
    return (
      <div className="jr p-4">
        <p className="jr-lede">Write some code, then come back here to watch how {name} turns it into something the computer can run.</p>
      </div>
    )
  }

  return (
    <div className={expanded ? 'jr mx-auto max-w-6xl space-y-5 p-4 sm:p-6' : 'jr space-y-4 p-3'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="m-0 text-[15px] font-semibold">How your {name} code runs</h2>
          <p className="m-0 text-[12.5px] text-text-muted">
            {plan ? `${name} → ${plan.target ?? kindWord} → ${plan.runner}` : 'Asking the compiler…'}
            {tr?.compiler && ` · real output from Compiler Explorer (${tr.compiler}${tr.args ? ` ${tr.args}` : ''})`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stale && (
            <button type="button" className="jr-btn" onClick={refresh}>
              <RotateCcw className="size-3.5" aria-hidden="true" /> Use my latest code
            </button>
          )}
          <button type="button" className="jr-btn" onClick={onToggleExpand} title={expanded ? 'Close (Esc)' : 'Open in full screen'}>
            {expanded ? <Minimize2 className="size-3.5" aria-hidden="true" /> : <Maximize2 className="size-3.5" aria-hidden="true" />}
            {expanded ? 'Close' : 'Full screen'}
          </button>
        </div>
      </div>

      <Route stop={stop} onStop={setStop} blockedAfter={failed ? 2 : null} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stop}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
          className="space-y-3"
        >
          {stop === 0 && <WriteStop lines={srcLines} name={name} plan={plan} />}
          {stop === 1 && <ReadStop code={snapshot} language={language} lines={srcLines} name={name} />}
          {stop === 2 && <CheckStop tr={tr} loading={loading} error={loadError} name={name} onRetry={retry} onJumpToLine={onJumpToLine} />}
          {stop === 3 && (
            <TranslateStop
              key={`${optimise}\u0000${snapshot}`}
              tr={tr}
              loading={loading}
              error={loadError}
              lines={srcLines}
              language={language}
              name={name}
              optimise={optimise}
              onOptimise={setOptimise}
              onRetry={retry}
              onJumpToLine={onJumpToLine}
              expanded={expanded}
            />
          )}
          {stop === 4 && <RunStop code={snapshot} language={language} input={input} inputLabel={inputLabel} plan={plan} name={name} />}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2">
        <button type="button" className="jr-btn" disabled={stop === 0} onClick={() => setStop((s) => s - 1)}>
          <ChevronLeft className="size-3.5" aria-hidden="true" /> {stop > 0 ? STOPS[stop - 1].name : 'Back'}
        </button>
        {stop < STOPS.length - 1 && !(failed && stop >= 2) && (
          <button type="button" className="jr-btn jr-btn--main" onClick={() => setStop((s) => s + 1)}>
            Next: {STOPS[stop + 1].name} <ChevronRight className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

function Route({ stop, onStop, blockedAfter }: { stop: number; onStop: (i: number) => void; blockedAfter: number | null }) {
  const ink = `${(stop / (STOPS.length - 1)) * 80}%`
  return (
    <nav aria-label="Stages">
      <ol className="jr-route">
        <span className="jr-route-ink" style={{ width: ink }} aria-hidden="true" />
        {STOPS.map((s, i) => {
          const blocked = blockedAfter != null && i > blockedAfter
          return (
            <li key={s.id} className="min-w-0">
              <button
                type="button"
                className="jr-stop w-full"
                aria-current={i === stop ? 'step' : undefined}
                data-done={i < stop || undefined}
                disabled={blocked}
                onClick={() => onStop(i)}
                style={blocked ? { opacity: 0.4, cursor: 'default' } : undefined}
              >
                <span className="jr-stop-mark" aria-hidden="true">
                  {i === stop ? <motion.span layoutId="jr-here" className="jr-here" /> : i + 1}
                </span>
                <span className="jr-stop-name">{s.name}</span>
                <span className="jr-stop-sub">{s.sub}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function CodeView({ lines, on, dimOthers, onClick, scrollTo, label = 'Your code' }: { lines: string[]; on?: number | null; dimOthers?: boolean; onClick?: (line: number) => void; scrollTo?: boolean; label?: string }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!scrollTo || on == null || !box.current) return
    const row = box.current.querySelector<HTMLElement>(`[data-line="${on}"]`)
    if (row) box.current.scrollTop = Math.max(0, row.offsetTop - box.current.clientHeight / 2 + row.clientHeight)
  }, [on, scrollTo])
  return (
    <div ref={box} className="jr-scroll" tabIndex={0} role="region" aria-label={label}>
      <pre className="jr-code">
        {lines.map((l, i) => (
          <div
            key={i}
            data-line={i + 1}
            className="jr-row"
            data-on={on === i + 1 || undefined}
            data-dim={(dimOthers && on != null && on !== i + 1) || undefined}
            data-click={onClick ? true : undefined}
            onClick={onClick ? () => onClick(i + 1) : undefined}
          >
            <span className="jr-num">{i + 1}</span>
            <span className="jr-txt">{l || ' '}</span>
          </div>
        ))}
      </pre>
    </div>
  )
}

/* ── 1 Write ── */
function WriteStop({ lines, name, plan }: { lines: string[]; name: string; plan?: Plan }) {
  return (
    <>
      <p className="jr-lede">
        This is your program — <strong>plain text</strong>, {lines.length} line{lines.length === 1 ? '' : 's'} of {name}. A computer cannot run text. First it has to be{' '}
        <strong>read</strong>, then <strong>checked</strong>, then <strong>translated</strong> into {plan?.kind === 'bytecode' ? 'bytecode, a simple language for a virtual machine' : plan?.kind === 'interpreted' ? 'steps an interpreter can follow' : 'instructions the processor (CPU) understands'}. Then it can <strong>run</strong>.
      </p>
      <div className="jr-card">
        <div className="jr-card-head">Your code</div>
        <CodeView lines={lines} />
      </div>
    </>
  )
}

/* ── 2 Read ── */
function ReadStop({ code, language, lines, name }: { code: string; language: string; lines: string[]; name: string }) {
  const toks = useTokens(code, language)
  const reduce = useReducedMotion()
  const first = useMemo(() => Math.max(0, lines.findIndex((l) => l.trim() && !/^\s*(#include|import|using|package|\/\/|#!)/.test(l))), [lines])
  const [line, setLine] = useState(first + 1)
  const mine = toks?.[line - 1] ?? []
  const counts = mine.reduce<Record<string, number>>((m, t) => ((m[t.kind] = (m[t.kind] ?? 0) + 1), m), {})
  const say = (k: string, n: number) => `${n} ${k === 'symbol' ? (n === 1 ? 'symbol' : 'symbols') : k === 'text' ? (n === 1 ? 'piece of text' : 'pieces of text') : n === 1 ? k : `${k}s`}`
  return (
    <>
      <p className="jr-lede">
        The {name} {language === 'python' || language === 'ruby' ? 'interpreter' : 'compiler'} reads your code the way you read a sentence: it groups letters into <strong>tokens</strong> —
        keywords, names, numbers and symbols — and drops the spaces and comments. Pick a line to see its tokens.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="jr-card">
          <div className="jr-card-head">Your code · click a line</div>
          <CodeView lines={lines} on={line} onClick={setLine} scrollTo />
        </div>
        <div className="jr-card">
          <div className="jr-card-head">
            Line {line} → {mine.length} token{mine.length === 1 ? '' : 's'}
          </div>
          <div className="space-y-3 p-3">
            {toks == null ? (
              <p className="m-0 text-[13px] text-text-muted">Reading…</p>
            ) : mine.length === 0 ? (
              <p className="m-0 text-[13px] text-text-muted">This line is empty or only a comment — nothing to read.</p>
            ) : (
              <div className="jr-tokens" key={line}>
                {mine.map((t, i) => (
                  <motion.span
                    key={i}
                    className="jr-token"
                    data-kind={t.kind}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reduce ? 0 : Math.min(i, 24) * 0.06, duration: 0.2 }}
                  >
                    <code>{t.text}</code>
                    <span>{t.kind}</span>
                  </motion.span>
                ))}
              </div>
            )}
            {mine.length > 0 && <p className="jr-stat m-0">{Object.entries(counts).map(([k, n]) => say(k, n)).join(' · ')}</p>}
            <div className="flex gap-2">
              <button type="button" className="jr-btn" disabled={line <= 1} onClick={() => setLine((l) => l - 1)}>
                <ChevronLeft className="size-3.5" aria-hidden="true" /> Line {Math.max(1, line - 1)}
              </button>
              <button type="button" className="jr-btn" disabled={line >= lines.length} onClick={() => setLine((l) => l + 1)}>
                Line {Math.min(lines.length, line + 1)} <ChevronRight className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Waiting({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  if (loading)
    return (
      <p className="flex items-center gap-2 text-[13px] text-text-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Asking the real compiler…
      </p>
    )
  if (error)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="m-0 text-[13px] text-state-error">{error}</p>
        <button type="button" className="jr-btn" onClick={onRetry}>
          Try again
        </button>
      </div>
    )
  return null
}

/* ── 3 Check ── */
function CheckStop({ tr, loading, error, name, onRetry, onJumpToLine }: { tr: Translation | null; loading: boolean; error: string | null; name: string; onRetry: () => void; onJumpToLine?: (l: number) => void }) {
  if (!tr || loading || error) return <Waiting loading={loading || !tr} error={error} onRetry={onRetry} />
  const diags = tr.compileError ? parseDiagnostics(tr.compileError) : []
  if (tr.compileError) {
    return (
      <>
        <p className="jr-lede">
          The compiler found a problem, so the journey <strong>stops here</strong>: nothing is translated or run until it is fixed. This is the compiler’s own message.
        </p>
        {diags.length > 0 && (
          <ul className="m-0 list-none space-y-1.5 p-0">
            {diags.slice(0, 6).map((d, i) => (
              <li key={i}>
                <button type="button" className="jr-btn h-auto w-full justify-start py-1.5 text-left" onClick={() => onJumpToLine?.(d.line)}>
                  <span className="jr-stat shrink-0">Line {d.line}</span>
                  <span className="min-w-0">{d.message}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="jr-card">
          <div className="jr-card-head">Compiler output</div>
          <pre className="jr-pre text-state-error">{tr.compileError}</pre>
        </div>
      </>
    )
  }
  const p = tr.plan
  return (
    <>
      <p className="jr-lede">
        {p.listing ? (
          <>
            <strong>No errors.</strong> Before translating, the compiler builds a tree of your program’s structure and checks it:{' '}
            {p.kind === 'bytecode' && (name === 'Python' || name === 'Ruby' || name === 'Lua' || name === 'Perl')
              ? `the grammar is right. ${name} checks names and types only when each line runs, so some mistakes only show up then.`
              : 'every name is declared, every type fits, every function gets the right arguments.'}
          </>
        ) : (
          <>
            {name} code is checked by {p.runner}. Compiler Explorer cannot show {name}’s inner steps, so this view explains them instead of showing a listing.
          </>
        )}
      </p>
      <div className="jr-note">
        Next, the {p.kind === 'bytecode' ? 'compiler writes bytecode' : p.kind === 'jit' ? 'code becomes bytecode and then CPU instructions' : p.kind === 'interpreted' ? 'interpreter follows the code step by step' : 'compiler writes CPU instructions'} — the next stop shows them for your own code.
      </div>
    </>
  )
}

/* ── 4 Translate ── */
function TranslateStop({
  tr,
  loading,
  error,
  lines,
  language,
  name,
  optimise,
  onOptimise,
  onRetry,
  onJumpToLine,
  expanded,
}: {
  tr: Translation | null
  loading: boolean
  error: string | null
  lines: string[]
  language: string
  name: string
  optimise: boolean
  onOptimise: (v: boolean) => void
  onRetry: () => void
  onJumpToLine?: (l: number) => void
  expanded: boolean
}) {
  const reduce = useReducedMotion()
  const listing = useMemo(() => tr?.lines ?? [], [tr])
  const steps = useMemo(() => buildSteps(listing), [listing])
  const [at, setAt] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<keyof typeof SPEEDS>('normal')
  const listBox = useRef<HTMLDivElement>(null)
  // Playing stops by itself at the last step.
  const live = playing && at < steps.length - 1
  useEffect(() => {
    if (!live) return
    const t = setTimeout(() => setAt((a) => a + 1), SPEEDS[speed])
    return () => clearTimeout(t)
  }, [live, at, speed])

  const step = steps[at]
  const onIdx = useMemo(() => new Set(step?.idx ?? []), [step])
  // Keep the current instructions in view.
  useEffect(() => {
    if (!step || !listBox.current) return
    const row = listBox.current.querySelector<HTMLElement>(`[data-i="${step.idx[0]}"]`)
    if (row) listBox.current.scrollTo({ top: Math.max(0, row.offsetTop - 40), behavior: reduce ? 'auto' : 'smooth' })
  }, [step, reduce])

  const stats = useMemo(() => {
    const per = new Map<number, number>()
    const places = new Map<number, number>()
    for (const s of steps) {
      per.set(s.line, (per.get(s.line) ?? 0) + s.idx.length)
      places.set(s.line, (places.get(s.line) ?? 0) + 1)
    }
    const total = [...per.values()].reduce((a, b) => a + b, 0)
    const busiest = [...per.entries()].sort((a, b) => b[1] - a[1])[0]
    const scattered = [...places.entries()].filter(([, n]) => n > 1).map(([l]) => l)
    return { total, lines: per.size, busiest, scattered, per }
  }, [steps])

  if (!tr || loading || error) return <Waiting loading={loading || !tr} error={error} onRetry={onRetry} />
  const p = tr.plan
  if (!p.listing) {
    return (
      <>
        <p className="jr-lede">
          {name}: <strong>{p.runner}</strong>.
        </p>
        <div className="jr-note">
          There is no free, reliable service that shows {name}’s internal instructions, so none are shown here rather than made up. The languages with a real listing include C, C++,
          Rust, Go, Java, Kotlin, Python, C#, Swift, Ruby and Lua.
        </div>
      </>
    )
  }
  if (!tr.ok || !listing.length) return <p className="text-[13px] text-text-muted">{tr.error ?? 'The compiler made no listing for this code.'}</p>

  const machine = p.kind === 'machine' || p.kind === 'jit'
  const current = step ? listing.filter((_, i) => onIdx.has(i)) : []
  const notes = current
    .map((l) => parseInstr(l.text, language))
    .filter((x): x is NonNullable<typeof x> => !!x)
    .filter((x, i, a) => a.findIndex((y) => y.op === x.op) === i)
    .map((x) => ({ op: x.op, note: noteFor(x.op, language) }))
    .filter((x) => x.note)
  const usesRegisters = machine && current.some((l) => REGISTERS.test(l.text))
  const allOfLine = step ? stats.per.get(step.line) ?? 0 : 0

  return (
    <>
      <p className="jr-lede">
        Here is what the compiler really made: <strong>{p.target}</strong>, {stats.total} instruction{stats.total === 1 ? '' : 's'} for {stats.lines} line{stats.lines === 1 ? '' : 's'} of your code.{' '}
        {machine ? 'Each one is a tiny job for the CPU.' : `${p.runner} carries them out one by one.`} Press play to walk through them in the order the compiler laid them out.
      </p>

      <div className="jr-controls">
        <button type="button" className="jr-btn jr-icon" aria-label="Previous step" disabled={at === 0} onClick={() => { setPlaying(false); setAt((a) => Math.max(0, a - 1)) }}>
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" className="jr-btn jr-btn--main" onClick={() => (at >= steps.length - 1 ? (setAt(0), setPlaying(true)) : setPlaying(!live))}>
          {live ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
          {live ? 'Pause' : at >= steps.length - 1 && steps.length > 1 ? 'Play again' : 'Play'}
        </button>
        <button type="button" className="jr-btn jr-icon" aria-label="Next step" disabled={at >= steps.length - 1} onClick={() => { setPlaying(false); setAt((a) => Math.min(steps.length - 1, a + 1)) }}>
          <ChevronRight className="size-4" />
        </button>
        <span className="jr-stat" aria-live="polite">
          Step {Math.min(at + 1, steps.length)} of {steps.length}
        </span>
        <span className="jr-seg ml-auto" role="group" aria-label="Speed">
          {(Object.keys(SPEEDS) as (keyof typeof SPEEDS)[]).map((s) => (
            <button key={s} type="button" aria-pressed={speed === s} onClick={() => setSpeed(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </span>
        {p.canToggleOpt && (
          <span className="jr-seg" role="group" aria-label="Optimisation">
            <button type="button" aria-pressed={!optimise} onClick={() => onOptimise(false)}>
              As written
            </button>
            <button type="button" aria-pressed={optimise} onClick={() => onOptimise(true)}>
              Optimised
            </button>
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="jr-card">
          <div className="jr-card-head">Your {name}</div>
          <CodeView lines={lines} on={step?.line ?? null} dimOthers scrollTo onClick={(l) => {
            const i = steps.findIndex((s) => s.line === l)
            if (i >= 0) { setPlaying(false); setAt(i) }
          }} />
        </div>
        <div className="jr-card">
          <div className="jr-card-head">
            <Cpu className="size-3.5" aria-hidden="true" /> {p.target}
            {tr.truncated && <span className="jr-stat">· first {listing.length} lines</span>}
          </div>
          <div ref={listBox} className="jr-scroll" tabIndex={0} role="region" aria-label={p.target ?? 'Instructions'} style={expanded ? undefined : { maxHeight: 340 }}>
            <pre className="jr-code">
              {listing.map((l, i) => {
                if (l.label) return <div key={i} className="jr-label">{l.text}</div>
                const ins = parseInstr(l.text, language)
                const on = onIdx.has(i)
                const sameLine = step && l.line === step.line
                const row = (
                  <div
                    key={i}
                    data-i={i}
                    className="jr-row"
                    data-on={on || undefined}
                    data-dim={(step && !sameLine) || undefined}
                    data-click={l.line ? true : undefined}
                    onClick={l.line ? () => { const s = steps.findIndex((st) => st.idx.includes(i)); if (s >= 0) { setPlaying(false); setAt(s) } } : undefined}
                    title={ins ? noteFor(ins.op, language) ?? undefined : undefined}
                  >
                    <span className="jr-tag">{l.line ? `L${l.line}` : ''}</span>
                    <span className="jr-txt">
                      {ins ? (
                        <>
                          <span className="jr-op">{ins.op}</span>
                          {ins.operands ? ` ${ins.operands}` : ''}
                          {ins.comment ? <span className="jr-cmt">{`  ${ins.comment}`}</span> : null}
                        </>
                      ) : (
                        l.text.trim()
                      )}
                    </span>
                  </div>
                )
                if (!on || reduce) return row
                return (
                  <motion.div
                    key={`${i}-${at}`}
                    initial={{ clipPath: 'inset(0 100% 0 0)' }}
                    animate={{ clipPath: 'inset(0 0% 0 0)' }}
                    transition={{ duration: 0.35, delay: step.idx.indexOf(i) * 0.12, ease: 'easeOut' }}
                  >
                    {row}
                  </motion.div>
                )
              })}
            </pre>
          </div>
        </div>
      </div>

      {step && (
        <div className="jr-card space-y-3 p-3">
          <p className="m-0 text-[13.5px]">
            <button type="button" className="jr-stat mr-1 underline-offset-2 hover:underline" onClick={() => onJumpToLine?.(step.line)}>
              Line {step.line}
            </button>
            <code className="font-mono text-[12.5px]">{(lines[step.line - 1] ?? '').trim() || ' '}</code> →{' '}
            {step.idx.length} instruction{step.idx.length === 1 ? '' : 's'} here
            {allOfLine > step.idx.length ? ` (${allOfLine} in all, in ${stats.scattered.includes(step.line) ? 'more than one place' : 'one place'})` : ''}.
          </p>
          {notes.length > 0 && (
            <dl className="jr-defs">
              {notes.map((n) => (
                <div key={n.op} className="contents">
                  <dt>{n.op}</dt>
                  <dd>{n.note}</dd>
                </div>
              ))}
            </dl>
          )}
          {usesRegisters && <p className="jr-note m-0">{REGISTER_NOTE}</p>}
          {!machine && at === 0 && (language === 'java' || language === 'kotlin' || language === 'python' || language === 'ruby') && <p className="jr-note m-0">{STACK_NOTE}</p>}
        </div>
      )}

      {(stats.scattered.length > 0 || stats.busiest) && (
        <ul className="m-0 list-none space-y-1 p-0 text-[13px] text-text-secondary">
          {stats.busiest && (
            <li>
              Busiest line: <b className="text-text-primary">line {stats.busiest[0]}</b> made {stats.busiest[1]} instruction{stats.busiest[1] === 1 ? '' : 's'}.
            </li>
          )}
          {stats.scattered.length > 0 && (
            <li>
              The work of line{stats.scattered.length === 1 ? '' : 's'} {stats.scattered.slice(0, 5).join(', ')} shows up in more than one place:{' '}
              {optimise && p.canToggleOpt ? 'the optimiser moved or copied it (for example, putting a small function straight into its caller). Switch to “As written” to compare.' : 'the compiler split it up (for example, a loop’s check and its jump back).'}
            </li>
          )}
          {!tr.mapped && <li>This compiler does not say which line made each instruction, so the listing is shown whole.</li>}
        </ul>
      )}
    </>
  )
}

/* ── 5 Run ── */
function RunStop({ code, language, input, inputLabel, plan, name }: { code: string; language: string; input: string; inputLabel: string; plan?: Plan; name: string }) {
  const [res, setRes] = useState<RunResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const reduce = useReducedMotion()
  const run = async () => {
    setBusy(true)
    setErr(null)
    try {
      setRes(await api.post<RunResult>('/api/run', { code, input, language }, { timeoutMs: 90000 }))
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'The run failed. Try again.')
    } finally {
      setBusy(false)
    }
  }
  const out = res ? (res.verdict === 'OK' ? res.output : [res.error, res.stderr].filter(Boolean).join('\n') || res.output) : ''
  const who = plan?.kind === 'bytecode' ? plan.runner : plan?.kind === 'jit' ? plan.runner : 'the CPU'
  return (
    <>
      <p className="jr-lede">
        Now it runs. Your input goes in, <strong>{who}</strong> carries out the instructions one after another — billions every second — and the output comes back. This runs your real {name} code on the judge.
      </p>
      <div className="jr-flow">
        <div className="jr-card">
          <div className="jr-card-head">Input · {inputLabel}</div>
          <pre className="jr-pre">{input || '(no input)'}</pre>
        </div>
        <ArrowRight className="jr-arrow size-4" aria-hidden="true" />
        <div className="jr-card jr-machine">
          {busy ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              <span>Running…</span>
            </>
          ) : res ? (
            <>
              <span className="text-[13px] font-semibold text-text-primary">{res.verdict === 'OK' ? 'Finished' : res.verdict === 'TLE' ? 'Too slow (time limit)' : res.verdict === 'CE' ? 'Did not compile' : 'Stopped with an error'}</span>
              <span className="jr-stat">{res.timeMs} ms{res.engine ? ` · ${engineLabel(res.engine)}` : ''}</span>
            </>
          ) : (
            <button type="button" className="jr-btn jr-btn--main" onClick={() => void run()}>
              <Play className="size-3.5" aria-hidden="true" /> Run it
            </button>
          )}
        </div>
        <ArrowRight className="jr-arrow size-4" aria-hidden="true" />
        <div className="jr-card">
          <div className="jr-card-head">Output</div>
          <AnimatePresence initial={false}>
            {res && (
              <motion.pre key={res.timeMs} className={res.verdict === 'OK' ? 'jr-pre' : 'jr-pre text-state-error'} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
                {out || '(no output)'}
              </motion.pre>
            )}
          </AnimatePresence>
          {!res && <pre className="jr-pre text-text-muted">…</pre>}
        </div>
      </div>
      {err && <p className="m-0 text-[13px] text-state-error">{err}</p>}
      {res && (
        <button type="button" className="jr-btn" onClick={() => void run()} disabled={busy}>
          <RotateCcw className="size-3.5" aria-hidden="true" /> Run again
        </button>
      )}
    </>
  )
}
