import { useState } from 'react'
import { AlertTriangle, Bot, Brain, CheckCircle2, Eye, FlaskConical, Info, Lightbulb, Loader2, MessageCircleQuestion, Plus, Radio, RefreshCw, Send, ShieldAlert, Sparkles } from 'lucide-react'
import { Button, Tooltip } from '@/components/ui'
import { MarkdownLite } from '@/components/ailab/MarkdownLite'
import { cn } from '@/lib/utils'
import type { CoachApi, CoachTest } from './coach'
import type { JudgeResponse } from './types'

function ago(t: number | null) {
  if (!t) return ''
  const s = Math.round((Date.now() - t) / 1000)
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`
}

/**
 * Nexora Coach — watches the code (live or on demand) and explains what you're
 * doing, the complexity, risky lines and edge cases; generates tricky tests;
 * explains failing verdicts; answers questions. Hints only, never solutions.
 */
export function CoachPanel({
  coach,
  judgeResult,
  onAddTest,
}: {
  coach: CoachApi
  judgeResult: JudgeResponse | null
  onAddTest: (tc: { label: string; input: string; expected_output: string }) => Promise<boolean>
}) {
  const { insight, loading, error, analyse, live, setLive, analysedAt } = coach
  const [hint, setHint] = useState(false)
  const [tests, setTests] = useState<CoachTest[] | null>(null)
  const [testsBusy, setTestsBusy] = useState(false)
  const [added, setAdded] = useState<Set<number>>(new Set())
  const [explanation, setExplanation] = useState<string | null>(null)
  const [explaining, setExplaining] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const failed = judgeResult && judgeResult.verdict !== 'AC' ? judgeResult : null
  const firstFail = failed?.results.find((r) => !r.passed)

  const wrap = async (fn: () => Promise<void>) => {
    setErr(null)
    try {
      await fn()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'AI request failed')
    }
  }

  return (
    <div className="space-y-3 p-3 text-[13px]">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <Bot className="size-4 text-primary-bright" /> Nexora Coach
        </span>
        <Tooltip label={live ? 'Live: re-checks your code when you pause typing' : 'Live analysis is off'}>
          <button
            onClick={() => setLive(!live)}
            aria-pressed={live}
            className={cn(
              'flex h-6 cursor-pointer items-center gap-1 rounded-full border px-2 text-[11px]',
              live ? 'border-success/30 bg-success/10 text-success' : 'border-white/10 text-foreground-faint',
            )}
          >
            <Radio className={cn('size-3', live && 'animate-pulse')} /> {live ? 'Live' : 'Paused'}
          </button>
        </Tooltip>
        <span className="text-[11px] text-foreground-faint">{analysedAt ? `updated ${ago(analysedAt)}` : ''}</span>
        <Button size="sm" variant="subtle" className="ml-auto h-7" onClick={() => void analyse(true)} loading={loading}>
          {!loading && <RefreshCw className="size-3.5" />} Analyse now
        </Button>
      </div>

      {error && !insight && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-state-error">{error}</p>}
      {!insight && !loading && !error && (
        <div className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-xs text-foreground-faint">
          <Brain className="mx-auto mb-2 size-5 text-primary-bright" />
          Start writing your solution — the coach will read it and tell you what it sees: the approach, complexity, risky lines and missed
          edge cases. Or press <b className="text-foreground-dim">Analyse now</b>.
        </div>
      )}
      {loading && !insight && (
        <div className="flex items-center gap-2 text-xs text-foreground-faint">
          <Loader2 className="size-3.5 animate-spin text-primary-bright" /> Reading your code…
        </div>
      )}

      {insight && (
        <div className={cn('space-y-3 transition-opacity', loading && 'opacity-60')}>
          <p className="text-foreground">{insight.summary}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Approach" value={insight.approach || '—'} />
            <Stat label="Time" value={insight.time || '—'} mono />
            <Stat label="Memory" value={insight.space || '—'} mono />
            <Stat
              label="Fits limits?"
              value={insight.fits == null ? 'unsure' : insight.fits ? 'likely yes' : 'likely no'}
              tone={insight.fits == null ? undefined : insight.fits ? 'ok' : 'bad'}
            />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-foreground-faint">
              <span>Solution progress</span>
              <span className="font-mono tabular-nums">{Math.max(0, Math.min(100, Math.round(insight.progress || 0)))}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan transition-[width] duration-700" style={{ width: `${Math.max(3, Math.min(100, insight.progress || 0))}%` }} />
            </div>
          </div>

          {insight.issues.length > 0 && (
            <Section icon={<ShieldAlert className="size-3.5 text-warning" />} title={`Things to check · ${insight.issues.length}`}>
              <ul className="space-y-1">
                {insight.issues.map((i, k) => (
                  <li key={k} className="flex gap-2 rounded-md bg-bg-field px-2 py-1.5 text-xs">
                    {i.severity === 'error' ? (
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                    ) : i.severity === 'warning' ? (
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    ) : (
                      <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
                    )}
                    <span className="text-foreground-dim">
                      {i.line ? <span className="mr-1 font-mono text-foreground-faint">L{i.line}</span> : null}
                      {i.message}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[10px] text-foreground-faint">These are also marked in the editor gutter.</p>
            </Section>
          )}

          {insight.edgeCases.length > 0 && (
            <Section icon={<FlaskConical className="size-3.5 text-cyan" />} title="Edge cases to think about">
              <ul className="list-disc space-y-0.5 pl-5 text-xs text-foreground-dim">
                {insight.edgeCases.map((e, k) => (
                  <li key={k}>{e}</li>
                ))}
              </ul>
            </Section>
          )}

          {insight.nextStep && (
            <Section icon={<Lightbulb className="size-3.5 text-gold" />} title="Next step">
              {hint ? (
                <p className="text-xs text-foreground-dim">{insight.nextStep}</p>
              ) : (
                <button onClick={() => setHint(true)} className="flex cursor-pointer items-center gap-1.5 text-xs text-primary-bright hover:underline">
                  <Eye className="size-3.5" /> Reveal a hint (try yourself first!)
                </button>
              )}
            </Section>
          )}
        </div>
      )}

      {/* Failing verdict */}
      {failed && (
        <Section icon={<Sparkles className="size-3.5 text-accent" />} title={`Why ${failed.verdict}?`}>
          {explanation ? (
            <div className="text-xs text-foreground-dim">
              <MarkdownLite text={explanation} />
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              loading={explaining}
              onClick={() =>
                void wrap(async () => {
                  setExplaining(true)
                  try {
                    setExplanation(
                      await coach.explain(failed.verdict, firstFail ? { input: firstFail.input, expected: firstFail.expected, actual: firstFail.actual, stderr: firstFail.stderr } : { actual: failed.compileError ?? '' }),
                    )
                  } finally {
                    setExplaining(false)
                  }
                })
              }
            >
              {!explaining && <Sparkles className="size-3.5" />} Explain my {failed.verdict}
            </Button>
          )}
        </Section>
      )}

      {/* Tricky tests */}
      <Section icon={<FlaskConical className="size-3.5 text-primary-bright" />} title="Tricky tests">
        {!tests ? (
          <Button
            size="sm"
            variant="subtle"
            loading={testsBusy}
            onClick={() =>
              void wrap(async () => {
                setTestsBusy(true)
                try {
                  setTests(await coach.tests())
                  setAdded(new Set())
                } finally {
                  setTestsBusy(false)
                }
              })
            }
          >
            {!testsBusy && <FlaskConical className="size-3.5" />} Generate edge-case tests
          </Button>
        ) : tests.length === 0 ? (
          <p className="text-xs text-foreground-faint">The AI couldn't propose valid tests for this format.</p>
        ) : (
          <ul className="space-y-1.5">
            {tests.map((t, k) => (
              <li key={k} className="rounded-md border border-hairline/[0.06] bg-bg-field p-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{t.label}</span>
                  {!t.expected && <span className="text-[10px] text-warning">no expected output — run it to inspect</span>}
                  <button
                    disabled={added.has(k)}
                    onClick={async () => {
                      const ok = await onAddTest({ label: `AI · ${t.label}`.slice(0, 40), input: t.input, expected_output: t.expected })
                      if (ok) setAdded((s) => new Set(s).add(k))
                    }}
                    className="ml-auto flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-primary-bright hover:bg-primary/10 disabled:cursor-default disabled:text-success"
                  >
                    {added.has(k) ? <CheckCircle2 className="size-3" /> : <Plus className="size-3" />} {added.has(k) ? 'Added' : 'Add'}
                  </button>
                </div>
                <p className="mt-0.5 text-[11px] text-foreground-faint">{t.why}</p>
                <pre className="mt-1 max-h-24 overflow-auto rounded bg-bg-field px-2 py-1 font-mono text-[11px] text-foreground-dim">{t.input}</pre>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Ask */}
      <Section icon={<MessageCircleQuestion className="size-3.5 text-cyan" />} title="Ask about your code">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!question.trim()) return
            void wrap(async () => {
              setAsking(true)
              try {
                setAnswer(await coach.ask(question))
              } finally {
                setAsking(false)
              }
            })
          }}
          className="flex gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Why is my loop O(n²)? What does line 12 do?"
            className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-bg-field px-2.5 text-xs text-foreground placeholder:text-foreground-faint focus:border-primary/60 focus:outline-none"
          />
          <Button size="sm" className="h-8" type="submit" loading={asking} aria-label="Ask the coach">
            {!asking && <Send className="size-3.5" />}
          </Button>
        </form>
        {answer && (
          <div className="mt-2 rounded-md border border-hairline/[0.06] bg-bg-field p-2 text-xs text-foreground-dim">
            <MarkdownLite text={answer} />
          </div>
        )}
      </Section>

      {err && <p className="text-xs text-state-error">{err}</p>}
      <p className="text-[10px] text-foreground-faint">AI can be wrong — treat it as a second opinion. It never writes the solution for you.</p>
    </div>
  )
}

function Stat({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: 'ok' | 'bad' }) {
  return (
    <div className="rounded-lg border border-hairline/[0.06] bg-bg-field px-2.5 py-2">
      <p className="text-[10px] tracking-wider text-foreground-faint uppercase">{label}</p>
      <p className={cn('mt-0.5 truncate text-xs text-foreground', mono && 'font-mono', tone === 'ok' && 'text-success', tone === 'bad' && 'text-state-error')} title={value}>
        {value}
      </p>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-hairline/[0.05] bg-white/[0.015] p-2.5">
      <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-foreground-dim uppercase">
        {icon} {title}
      </h4>
      {children}
    </section>
  )
}
