import { useMemo, useRef, useState } from 'react'
import { Check, CircleAlert, Loader2, Play, Plus, ShieldCheck, Sparkles, X } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { JudgeResponse } from './types'

import { autoTestsOn, setAutoTests, streamAiTests, testLabel, type AiTest, type AiTestsResult as Result } from './aiTests'
export type { AiTest } from './aiTests'

interface Props {
  problemId?: number
  customProblemId?: number
  title: string
  statement: string
  samples: { input: string; output: string }[]
  code: string
  language: string
  onAddTests: (tests: { label: string; input: string; expected_output: string }[]) => Promise<number>
}

const STEPS = ['Reading the problem and writing a generator', 'Generating inputs', 'Checking both reference solutions on the official samples', 'A reference got a sample wrong: asking the AI to fix it', 'Computing expected outputs', 'Making more tests']
const COUNTS = [12, 24, 40, 60]

const preview = (s: string, n = 90) => {
  const one = s.replace(/\s+/g, ' ').trim()
  return one.length > n ? `${one.slice(0, n)}…` : one
}

export function AiTestsPanel({ problemId, customProblemId, title, statement, samples, code, language, onAddTests }: Props) {
  const toast = useToast()
  const [count, setCount] = useState(24)
  const [auto, setAuto] = useState(autoTestsOn)
  const [step, setStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [open, setOpen] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [checking, setChecking] = useState(false)
  const [check, setCheck] = useState<JudgeResponse | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const generate = async (fresh = false) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStep(STEPS[0])
    setError(null)
    setResult(null)
    setCheck(null)
    try {
      const r = await streamAiTests(
        { problem_id: problemId || undefined, custom_problem_id: customProblemId || undefined, title, statement, samples, count, fresh },
        { signal: ctrl.signal, onStep: (x) => setStep(/^Only \d+ tests/.test(x) ? STEPS[5] : x) },
      )
      setResult(r)
      setPicked(new Set(r.tests.map((_, k) => k)))
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message || 'Test generation failed')
    } finally {
      setStep(null)
    }
  }

  const chosen = useMemo(() => (result ? result.tests.filter((_, i) => picked.has(i)) : []), [result, picked])

  const add = async () => {
    if (!chosen.length) return
    setAdding(true)
    try {
      const n = await onAddTests(chosen.map((t) => ({ label: testLabel(t), input: t.input, expected_output: t.expected })))
      toast.success(`Added ${n} test${n === 1 ? '' : 's'}`, n < chosen.length ? `${chosen.length - n} were already there.` : 'They run with every submit.')
    } finally {
      setAdding(false)
    }
  }

  const runCheck = async () => {
    if (!chosen.length || !code.trim()) return
    setChecking(true)
    setCheck(null)
    try {
      // No problem id: a practice run, never recorded as a submission.
      const r = await api.post<JudgeResponse>('/api/judge', { code, language, testcases: chosen.slice(0, 100).map((t) => ({ label: t.label, input: t.input, expected_output: t.expected })) }, { timeoutMs: 240000 })
      setCheck(r)
    } catch (e) {
      toast.error('Could not run your code', e instanceof ApiError ? e.message : undefined)
    } finally {
      setChecking(false)
    }
  }

  const resultFor = (t: AiTest) => check?.results.find((r) => r.label === t.label)
  const s = result?.stats

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2">
        <span className="text-[12.5px] text-foreground-dim">How many</span>
        <div className="flex rounded-md bg-surface-2 p-0.5" role="radiogroup" aria-label="Number of tests">
          {COUNTS.map((n) => (
            <button key={n} type="button" role="radio" aria-checked={count === n} onClick={() => setCount(n)} className={cn('h-6 cursor-pointer rounded px-2 text-[12px] tabular-nums', count === n ? 'bg-background font-medium text-foreground shadow-sm' : 'text-foreground-dim hover:text-foreground')}>
              {n}
            </button>
          ))}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] text-foreground-dim">
          <input
            type="checkbox"
            className="size-3.5 cursor-pointer accent-[var(--color-primary)]"
            checked={auto}
            onChange={(e) => {
              setAuto(e.target.checked)
              setAutoTests(e.target.checked)
            }}
          />
          Make tests by themselves
        </label>
        <div className="ml-auto flex items-center gap-2">
          {step ? (
            <Button size="sm" variant="ghost" onClick={() => abortRef.current?.abort()}>
              Cancel
            </Button>
          ) : (
            <Button size="sm" variant="primary" onClick={() => void generate(!!result)}>
              <Sparkles aria-hidden="true" /> {result ? 'Make a new set' : 'Generate tests'}
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {step && (
          <ol className="space-y-2 px-4 py-4" aria-live="polite">
            {STEPS.filter((_, k) => (k !== 3 && k !== 5) || STEPS.indexOf(step) >= k).map((label, i, shown) => {
              const at = shown.indexOf(step)
              const state = i < at ? 'done' : i === at ? 'now' : 'todo'
              return (
                <li key={label} className={cn('flex items-center gap-2.5 text-[13px]', state === 'todo' ? 'text-foreground-faint' : 'text-foreground')}>
                  {state === 'done' ? <Check className="size-4 text-state-success" /> : state === 'now' ? <Loader2 className="size-4 animate-spin text-primary-bright" /> : <span className="size-4 rounded-full border border-border" />}
                  {label}
                </li>
              )
            })}
            <li className="pt-1 text-[12px] text-foreground-faint">This takes a minute or two: the AI writes a generator and two solutions, and every answer is checked by running them.</li>
          </ol>
        )}

        {!step && error && (
          <div className="m-3 flex gap-2 rounded-lg bg-[color-mix(in_oklab,var(--color-state-error)_9%,transparent)] px-3 py-2.5 text-[13px] text-foreground">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-state-error" />
            <p>{error}</p>
          </div>
        )}

        {!step && !error && !result && (
          <div className="px-4 py-5 text-[13px] leading-relaxed text-foreground-dim">
            <p className="font-medium text-foreground">Tests you can trust</p>
            <p className="mt-1">
              The AI writes an input generator and two independent solutions, a brute force and an efficient one. Each must reproduce the official examples (one that misses gets a single chance to be fixed). An expected output is kept when the two agree, or when only one could run that input and it passed every example; those are labelled. Tests made for a problem are kept, so the next person gets them at once.
            </p>
          </div>
        )}

        {!step && result && s && (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-3 pb-2 text-[12px] text-foreground-dim">
              {s.cached && <span className="text-foreground">Made earlier for this problem, ready at once.</span>}
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-state-success" /> {s.verified} verified by two solutions
              </span>
              <span>{s.kept - s.verified} by one solution that passed every example</span>
              {!!s.examples && <span>{s.examples} official example{s.examples === 1 ? '' : 's'} included</span>}
              {!!s.disagreements && <span className="text-state-warning">{s.disagreements} dropped: the solutions disagreed</span>}
              {!!s.rejectedByValidator && <span>{s.rejectedByValidator} invalid inputs thrown out</span>}
              {s.references && (
                <span className="text-foreground-faint">
                  Brute force {s.references.brute.ok ? `passed ${s.references.brute.passed}/${s.references.brute.total} examples` : 'not used'} · Efficient {s.references.solution.ok ? `passed ${s.references.solution.passed}/${s.references.solution.total}` : 'not used'}
                </span>
              )}
            </div>
            {result.multipleAnswers && <p className="px-4 pb-2 text-[12px] text-state-warning">This problem accepts several correct answers, so an exact comparison may mark a correct answer wrong.</p>}

            <div className="flex items-center gap-2 border-y border-border/70 px-4 py-1.5 text-[12px]">
              <button type="button" className="cursor-pointer text-foreground-dim hover:text-foreground" onClick={() => setPicked(picked.size === result.tests.length ? new Set() : new Set(result.tests.map((_, i) => i)))}>
                {picked.size === result.tests.length ? 'Select none' : 'Select all'}
              </button>
              <span className="text-foreground-faint">{picked.size} selected</span>
              <div className="ml-auto flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => void runCheck()} loading={checking} disabled={!chosen.length || !code.trim()}>
                  {!checking && <Play aria-hidden="true" />} Check my code
                </Button>
                <Button size="sm" variant="subtle" onClick={() => void add()} loading={adding} disabled={!chosen.length}>
                  {!adding && <Plus aria-hidden="true" />} Add to my tests
                </Button>
              </div>
            </div>
            {check && (
              <p className={cn('px-4 py-2 text-[12.5px]', check.verdict === 'AC' ? 'text-state-success' : 'text-state-error')}>
                {check.compileError ? 'Compile error — see the Result tab after Run.' : `${check.results.filter((r) => r.passed).length} of ${check.results.length} passed`}
              </p>
            )}

            <ul className="divide-y divide-border/50">
              {result.tests.map((t, i) => {
                const r = resultFor(t)
                return (
                  <li key={i} className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <input type="checkbox" className="size-3.5 cursor-pointer accent-[var(--color-primary)]" checked={picked.has(i)} onChange={() => setPicked((p) => (p.has(i) ? new Set([...p].filter((x) => x !== i)) : new Set([...p, i])))} aria-label={`Select ${t.label}`} />
                      <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left">
                        <span className="w-24 shrink-0 text-[12.5px] text-foreground">{t.label.replace(/^AI · /, '')}</span>
                        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground-faint">{preview(t.input)}</span>
                        <span className={cn('shrink-0 text-[11.5px]', t.confidence === 'reference' ? 'text-foreground-faint' : 'text-state-success')} title={t.confidence === 'official' ? "The problem's own example and answer" : t.confidence === 'verified' ? 'Both solutions gave this answer' : "One solution's answer (it passed every example; the other couldn't run this input)"}>
                          {t.confidence === 'official' ? 'Official' : t.confidence === 'verified' ? 'Verified' : 'Reference'}
                        </span>
                        {r && (r.passed ? <Check className="size-4 shrink-0 text-state-success" aria-label="Passed" /> : <X className="size-4 shrink-0 text-state-error" aria-label={r.verdict} />)}
                      </button>
                    </div>
                    {open === i && (
                      <div className="mt-2 grid gap-2 pl-6 md:grid-cols-2">
                        {(
                          [
                            ['Input', t.input],
                            ['Expected', t.expected],
                            ...(r && !r.passed ? ([['Your output', r.actual || r.stderr || r.verdict]] as const) : []),
                          ] as const
                        ).map(([k, v]) => (
                          <div key={k} className="min-w-0">
                            <p className="mb-1 text-[11.5px] text-foreground-faint">{k}</p>
                            <pre tabIndex={0} className="max-h-48 overflow-auto rounded-md bg-[color-mix(in_oklab,var(--color-foreground)_4.5%,transparent)] px-2.5 py-1.5 font-mono text-[12px] leading-[1.5]">{v.length > 20000 ? `${v.slice(0, 20000)}\n… (${v.length.toLocaleString()} characters)` : v}</pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
