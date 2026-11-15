import { useState } from 'react'
import { CircleAlert, Gauge, Loader2, ScanSearch } from 'lucide-react'
import { Button } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

type Verdict = 'fits' | 'tight' | 'too_slow' | 'too_much' | 'unknown'
export type Analysis = {
  language: string
  limits: string | null
  metrics: {
    lines: number
    codeLines: number
    commentLines: number
    functions: number
    functionNames: string[]
    recursive: string[]
    loops: number
    loopDepth: number
    deepestLoopLine: number | null
    cyclomatic: number
    structures: string[]
    io: string[]
    risks: string[]
  }
  ai:
    | {
        summary: string
        approach: string
        time: { worst: string; average: string; best: string; derivation: string[] }
        space: { auxiliary: string; total: string; derivation: string[] }
        parts: { name: string; lines: string; time: string; note: string }[]
        hotspot: { lines: string; why: string } | null
        fits: { verdict: Verdict; operations: string; why: string }
        memoryFit: { verdict: Verdict; estimate: string; why: string }
        correctness: { line: number; severity: 'error' | 'warning' | 'info'; issue: string }[]
        edgeCases: { input: string; risk: string }[]
        quality: { score: number; readability: string; notes: string[] }
        optimizations: { idea: string; gain: string }[]
        dataStructures: string[]
        language: string[]
        error?: undefined
      }
    | { error: string }
  runs: { label: string; bytes: number; verdict: string; timeMs: number | null; engine?: string; outputPreview: string; stderr: string }[]
}

interface Props {
  problemId?: number
  customProblemId?: number
  title: string
  statement: string
  code: string
  language: string
  timeLimit?: string
  /** The biggest inputs available (tests / AI tests) to time the code on. */
  inputs: { label: string; input: string }[]
  onJumpToLine?: (line: number) => void
}

const VERDICT: Record<Verdict, { label: string; tone: string }> = {
  fits: { label: 'Fits the limit', tone: 'text-state-success' },
  tight: { label: 'Tight', tone: 'text-state-warning' },
  too_slow: { label: 'Likely too slow', tone: 'text-state-error' },
  too_much: { label: 'Likely too much memory', tone: 'text-state-error' },
  unknown: { label: 'Limits unknown', tone: 'text-foreground-faint' },
}

const limitMs = (t?: string) => {
  const m = String(t || '').match(/([\d.]+)\s*s/)
  return m ? Number(m[1]) * 1000 : null
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('px-4 py-4', className)}>
      <h3 className="mb-2.5 text-[12.5px] font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function Line({ n, onJump }: { n: number; onJump?: (n: number) => void }) {
  if (!n) return null
  return onJump ? (
    <button type="button" onClick={() => onJump(n)} className="cursor-pointer font-mono text-[11.5px] text-primary-bright hover:underline">
      L{n}
    </button>
  ) : (
    <span className="font-mono text-[11.5px] text-foreground-faint">L{n}</span>
  )
}

export function AnalysisPanel({ problemId, customProblemId, title, statement, code, language, timeLimit, inputs, onJumpToLine }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Analysis | null>(null)
  const [analysedCode, setAnalysedCode] = useState('')

  const run = async () => {
    if (!code.trim()) return
    setBusy(true)
    setError(null)
    try {
      const r = await api.post<Analysis>(
        '/api/ai/analyze',
        { problem_id: problemId || undefined, custom_problem_id: customProblemId || undefined, title, statement: statement.slice(0, 12000), code, language, inputs: inputs.slice(0, 3) },
        { timeoutMs: 200000 },
      )
      setData(r)
      setAnalysedCode(code)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The analysis failed — try again')
    } finally {
      setBusy(false)
    }
  }

  const ai = data && !('error' in data.ai && data.ai.error) ? (data.ai as Exclude<Analysis['ai'], { error: string }>) : null
  const aiError = data && 'error' in data.ai ? data.ai.error : null
  const m = data?.metrics
  const tl = limitMs(timeLimit || data?.limits || undefined)
  const stale = !!data && analysedCode !== code

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
        <p className="min-w-0 truncate text-[12.5px] text-foreground-dim">
          {stale ? 'Your code changed since this analysis.' : data ? `Analysed ${language} code` : 'Complexity, limits, bugs and quality of your code'}
        </p>
        <Button size="sm" variant={data && !stale ? 'ghost' : 'primary'} className="ml-auto" onClick={() => void run()} loading={busy} disabled={!code.trim()}>
          {!busy && <ScanSearch aria-hidden="true" />} {data ? 'Analyse again' : 'Analyse my code'}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {busy && !data && (
          <div className="flex items-center gap-2.5 px-4 py-6 text-[13px] text-foreground-dim">
            <Loader2 className="size-4 animate-spin text-primary-bright" /> Measuring the code, timing it on your largest tests and asking the AI for a full breakdown…
          </div>
        )}
        {error && (
          <div className="m-3 flex gap-2 rounded-lg bg-[color-mix(in_oklab,var(--color-state-error)_9%,transparent)] px-3 py-2.5 text-[13px]">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-state-error" /> {error}
          </div>
        )}
        {!busy && !data && !error && (
          <div className="px-4 py-5 text-[13px] leading-relaxed text-foreground-dim">
            <p className="font-medium text-foreground">Everything about your code</p>
            <p className="mt-1">Time and space complexity with how they're derived, whether it fits the limits, a per-function breakdown, likely bugs by line, edge cases, quality and concrete optimisations. Exact counts come from the code itself, and your largest tests are run to time it.</p>
          </div>
        )}

        {data && m && (
          <div className={cn('divide-y divide-border/50', stale && 'opacity-70')}>
            {ai && (
              <div className="grid grid-cols-2 gap-px bg-border/50 sm:grid-cols-4">
                {[
                  ['Time', ai.time.worst || '—', ai.time.average && ai.time.average !== ai.time.worst ? `average ${ai.time.average}` : 'worst case'],
                  ['Extra space', ai.space.auxiliary || '—', ai.space.total ? `total ${ai.space.total}` : ''],
                  ['Time limit', VERDICT[ai.fits.verdict].label, ai.fits.operations ? `≈ ${ai.fits.operations} operations` : ''],
                  ['Quality', ai.quality.score ? `${ai.quality.score}/100` : '—', ai.approach],
                ].map(([k, v, sub], i) => (
                  <div key={k} className="bg-background px-4 py-3">
                    <p className="text-[11.5px] text-foreground-faint">{k}</p>
                    <p className={cn('mt-0.5 truncate text-[16px] font-semibold', i < 2 ? 'font-mono' : '', i === 2 ? VERDICT[ai.fits.verdict].tone : 'text-foreground')}>{v}</p>
                    {sub && <p className="truncate text-[11.5px] text-foreground-faint">{sub}</p>}
                  </div>
                ))}
              </div>
            )}

            {ai && (
              <Section title="What it does">
                <p className="text-[13px] leading-relaxed text-foreground-dim">{ai.summary}</p>
              </Section>
            )}

            {ai && (ai.time.derivation.length > 0 || ai.space.derivation.length > 0) && (
              <Section title="How the complexity is derived">
                <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-foreground-dim marker:text-foreground-faint">
                  {ai.time.derivation.map((d, i) => (
                    <li key={`t${i}`}>{d}</li>
                  ))}
                  {ai.space.derivation.map((d, i) => (
                    <li key={`s${i}`}>{d}</li>
                  ))}
                </ol>
                {ai.fits.why && <p className={cn('mt-2.5 text-[13px]', VERDICT[ai.fits.verdict].tone)}>{ai.fits.why}</p>}
                {ai.memoryFit.why && (
                  <p className={cn('mt-1 text-[13px]', VERDICT[ai.memoryFit.verdict].tone)}>
                    Memory{ai.memoryFit.estimate ? ` ≈ ${ai.memoryFit.estimate}` : ''}: {ai.memoryFit.why}
                  </p>
                )}
              </Section>
            )}

            {data.runs.length > 0 && (
              <Section title="Timed on your largest tests">
                <ul className="space-y-2">
                  {data.runs.map((r, i) => {
                    const pct = tl && r.timeMs != null ? Math.min(100, (r.timeMs / tl) * 100) : null
                    return (
                      <li key={i} className="text-[12.5px]">
                        <div className="flex items-center gap-2">
                          <span className="w-28 shrink-0 truncate text-foreground">{r.label}</span>
                          <span className="text-foreground-faint">{(r.bytes / 1024).toFixed(r.bytes > 10240 ? 0 : 1)} KB</span>
                          <span className={cn('ml-auto font-mono tabular-nums', r.verdict === 'OK' ? 'text-foreground' : 'text-state-error')}>{r.verdict === 'OK' ? `${r.timeMs ?? '—'} ms` : r.verdict}</span>
                        </div>
                        {pct != null && (
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${Math.round(pct)}% of the time limit`}>
                            <div className={cn('h-full rounded-full', pct > 80 ? 'bg-state-error' : pct > 50 ? 'bg-state-warning' : 'bg-state-success')} style={{ width: `${Math.max(2, pct)}%` }} />
                          </div>
                        )}
                        {r.verdict !== 'OK' && r.stderr && <p className="mt-1 truncate font-mono text-[11.5px] text-foreground-faint">{r.stderr}</p>}
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-2 text-[11.5px] text-foreground-faint">Measured on the shared sandbox; the time includes starting the program{data.runs[0]?.engine && data.runs[0].engine !== 'local' ? ' and compiling it' : ''}, so treat it as an upper bound.</p>
              </Section>
            )}

            {ai && (ai.parts.length > 0 || ai.hotspot) && (
              <Section title="Where the time goes">
                {ai.hotspot && (
                  <p className="mb-2 flex items-start gap-2 text-[13px] text-foreground-dim">
                    <Gauge className="mt-0.5 size-4 shrink-0 text-state-warning" />
                    <span>
                      <span className="font-mono text-foreground">{ai.hotspot.lines}</span> — {ai.hotspot.why}
                    </span>
                  </p>
                )}
                {ai.parts.length > 0 && (
                  <table className="w-full text-left text-[12.5px]">
                    <tbody className="divide-y divide-border/50">
                      {ai.parts.map((p, i) => (
                        <tr key={i}>
                          <td className="py-1.5 pr-3 text-foreground">{p.name}</td>
                          <td className="py-1.5 pr-3 font-mono text-[11.5px] text-foreground-faint">{p.lines}</td>
                          <td className="py-1.5 pr-3 font-mono text-foreground">{p.time}</td>
                          <td className="py-1.5 text-foreground-dim">{p.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Section>
            )}

            {ai && ai.correctness.length > 0 && (
              <Section title="Possible bugs">
                <ul className="space-y-1.5">
                  {ai.correctness.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px]">
                      <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', c.severity === 'error' ? 'bg-state-error' : c.severity === 'warning' ? 'bg-state-warning' : 'bg-foreground-faint')} />
                      <Line n={c.line} onJump={onJumpToLine} />
                      <span className="text-foreground-dim">{c.issue}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {ai && ai.edgeCases.length > 0 && (
              <Section title="Edge cases to try">
                <ul className="space-y-1.5 text-[13px]">
                  {ai.edgeCases.map((e, i) => (
                    <li key={i}>
                      <span className="font-mono text-[12px] text-foreground">{e.input}</span>
                      <span className="text-foreground-dim"> — {e.risk}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {ai && ai.optimizations.length > 0 && (
              <Section title="How to make it better">
                <ul className="space-y-1.5 text-[13px]">
                  {ai.optimizations.map((o, i) => (
                    <li key={i} className="text-foreground-dim">
                      {o.idea}
                      {o.gain && <span className="ml-1.5 font-mono text-[12px] text-state-success">{o.gain}</span>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Measured from the code">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-3">
                {(
                  [
                    ['Lines of code', `${m.codeLines}`, `${m.lines} total, ${m.commentLines} comments`],
                    ['Functions', `${m.functions}`, m.functionNames.slice(0, 4).join(', ')],
                    ['Loops', `${m.loops}`, `deepest nesting ${m.loopDepth}${m.deepestLoopLine ? ` at L${m.deepestLoopLine}` : ''}`],
                    ['Branching', `${m.cyclomatic}`, 'cyclomatic complexity'],
                    ['Recursion', m.recursive.length ? 'Yes' : 'No', m.recursive.join(', ')],
                  ] as const
                ).map(([k, v, sub]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-foreground-faint">{k}</dt>
                    <dd className="font-mono text-[14px] text-foreground">{v}</dd>
                    {sub && <dd className="truncate text-[11.5px] text-foreground-faint">{sub}</dd>}
                  </div>
                ))}
              </dl>
              {m.structures.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.structures.map((x) => (
                    <span key={x} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11.5px] text-foreground-dim">
                      {x}
                    </span>
                  ))}
                </div>
              )}
              {[...m.risks, ...m.io].length > 0 && (
                <ul className="mt-3 space-y-1 text-[12.5px] text-foreground-dim">
                  {[...m.risks, ...m.io].map((x) => (
                    <li key={x} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-state-warning" />
                      {x}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {ai && (ai.quality.readability || ai.quality.notes.length > 0 || ai.language.length > 0 || ai.dataStructures.length > 0) && (
              <Section title="Readability and language notes">
                {ai.quality.readability && <p className="mb-1.5 text-[13px] text-foreground-dim">{ai.quality.readability}</p>}
                <ul className="list-disc space-y-1 pl-5 text-[13px] text-foreground-dim marker:text-foreground-faint">
                  {[...ai.quality.notes, ...ai.dataStructures, ...ai.language].map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </Section>
            )}

            {aiError && (
              <p className="px-4 py-3 text-[12.5px] text-foreground-faint">
                AI analysis unavailable: {aiError}. The measurements above are still exact.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
