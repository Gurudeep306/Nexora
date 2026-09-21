import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  FlaskConical,
  Lightbulb,
  ListChecks,
  Play,
  RotateCcw,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, Field, Textarea, useToast } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { CodeEditor } from './CodeEditor'
import { parseJsonList, unescapeCode, type AiProblem, type AiSample, type RunResult } from './types'
import { cn } from '@/lib/utils'

interface SampleResult {
  index: number
  passed: boolean
  verdict: string
  output: string
  stderr: string
  timeMs: number
}

export function AiProblemSolver({
  problem,
  onBack,
  onProgressSaved,
}: {
  problem: AiProblem
  onBack: () => void
  onProgressSaved: () => void
}) {
  const toast = useToast()
  const starterCode = useMemo(() => unescapeCode(problem.starter_code), [problem])
  const samples = useMemo(() => parseJsonList<AiSample>(problem.samples), [problem])
  const hints = useMemo(() => parseJsonList<string>(problem.hints), [problem])
  const resources = useMemo(
    () => parseJsonList<{ title: string; url: string }>(problem.resources),
    [problem],
  )
  const tags = useMemo(() => parseJsonList<string>(problem.tags), [problem])

  const [code, setCode] = useState(starterCode)
  const [stdin, setStdin] = useState(samples[0]?.input ?? '')
  const [running, setRunning] = useState(false)
  const [checkingSamples, setCheckingSamples] = useState(false)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [sampleResults, setSampleResults] = useState<SampleResult[]>([])
  const [notes, setNotes] = useState(problem.progress?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const [showApproach, setShowApproach] = useState(false)

  const status = problem.progress?.status ?? problem.status ?? 'unsolved'
  const allSamplesPassed = samples.length > 0 && sampleResults.length === samples.length && sampleResults.every((r) => r.passed)

  async function runCode(input: string): Promise<RunResult> {
    return api.post<RunResult>('/api/run', { code, input, language: 'python' })
  }

  async function handleRun() {
    setRunning(true)
    setSampleResults([])
    try {
      setRunResult(await runCode(stdin))
    } catch (err) {
      const e = err as ApiError
      if (e.status === 429) toast.error('Run rate limit reached', 'Judge allows 30 runs/min — wait a few seconds and retry.')
      else toast.error('Run failed', e.message)
    } finally {
      setRunning(false)
    }
  }

  async function handleCheckSamples() {
    if (!samples.length) return
    setCheckingSamples(true)
    setRunResult(null)
    const results: SampleResult[] = []
    try {
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i]
        const r = await runCode(s.input)
        const passed = r.verdict === 'OK' && r.output.trim() === s.output.trim()
        results.push({ index: i, passed, verdict: r.verdict, output: r.output, stderr: r.stderr, timeMs: r.timeMs })
        setSampleResults([...results])
      }
      const okCount = results.filter((r) => r.passed).length
      if (okCount === samples.length) {
        toast.success('All samples passed', 'Mark the problem as solved to bank your progress.')
      } else {
        toast.warning(`${okCount}/${samples.length} samples passed`, 'Check the failing output below and iterate.')
      }
    } catch (err) {
      const e = err as ApiError
      if (e.status === 429) toast.error('Run rate limit reached', 'Judge allows 30 runs/min — wait a few seconds and retry.')
      else toast.error('Sample check failed', e.message)
    } finally {
      setCheckingSamples(false)
    }
  }

  async function saveProgress(next: 'solved' | 'in-progress' | 'unsolved') {
    setSaving(true)
    try {
      await api.post(`/api/ai-problems/${problem.id}/progress`, { status: next, notes })
      toast.success(next === 'solved' ? 'Marked as solved' : 'Progress saved')
      onProgressSaved()
    } catch (err) {
      toast.error('Failed to save progress', (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back to problem list">
          <ArrowLeft /> Back
        </Button>
        <h2 className="font-display text-lg tracking-wide text-foreground glow-text">{problem.title}</h2>
        <Badge variant="primary">{problem.category.toUpperCase()}</Badge>
        <Badge variant={problem.difficulty === 'beginner' ? 'cyan' : problem.difficulty === 'advanced' ? 'accent' : 'warning'}>
          {problem.difficulty}
        </Badge>
        {status === 'solved' && <Badge variant="success"><CheckCircle2 /> Solved</Badge>}
        {status === 'in-progress' && <Badge variant="warning">In progress</Badge>}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Statement */}
        <Card className="min-w-0">
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-foreground-dim">{problem.description}</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Badge key={t} variant="outline" className="normal-case">{t}</Badge>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">Input format</p>
                <p className="mt-1 text-xs text-foreground-dim">{unescapeCode(problem.input_format)}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">Output format</p>
                <p className="mt-1 text-xs text-foreground-dim">{unescapeCode(problem.output_format)}</p>
              </div>
            </div>
            {problem.constraints && (
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">Constraints</p>
                <p className="mt-1 font-mono text-xs text-foreground-dim">{unescapeCode(problem.constraints)}</p>
              </div>
            )}

            {samples.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">Samples</p>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {samples.map((s, i) => (
                    <div key={i} className="space-y-1.5">
                      <button
                        onClick={() => setStdin(s.input)}
                        className="w-full cursor-pointer rounded-lg border border-border bg-background p-2.5 text-left transition-colors duration-200 hover:border-primary"
                        aria-label={`Use sample ${i + 1} input as stdin`}
                      >
                        <p className="text-[10px] tracking-wider text-primary-bright uppercase">Sample {i + 1} input</p>
                        <pre className="mt-1 overflow-x-auto font-mono text-[11px] whitespace-pre-wrap text-foreground-dim">{s.input}</pre>
                      </button>
                      <div className="rounded-lg border border-border bg-background p-2.5">
                        <p className="text-[10px] tracking-wider text-foreground-faint uppercase">Expected output</p>
                        <pre className="mt-1 overflow-x-auto font-mono text-[11px] whitespace-pre-wrap text-foreground-dim">{s.output}</pre>
                      </div>
                      {sampleResults[i] && (
                        <p className={cn('flex items-center gap-1 text-[11px]', sampleResults[i].passed ? 'text-success' : 'text-destructive')}>
                          {sampleResults[i].passed ? <CheckCircle2 className="size-3" /> : <CircleDashed className="size-3" />}
                          {sampleResults[i].passed ? 'Passed' : `Failed (${sampleResults[i].verdict})`} · {sampleResults[i].timeMs}ms
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hints.length > 0 && (
              <div>
                <Button variant="ghost" size="sm" onClick={() => setShowHints((s) => !s)} aria-expanded={showHints}>
                  <Lightbulb /> {showHints ? 'Hide hints' : `Show hints (${hints.length})`}
                </Button>
                {showHints && (
                  <ul className="mt-2 list-disc space-y-1 pl-6 text-xs text-foreground-dim marker:text-warning">
                    {hints.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                )}
              </div>
            )}
            {resources.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {resources.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-cyan transition-colors duration-200 hover:border-cyan"
                  >
                    {r.title}
                  </a>
                ))}
              </div>
            )}
            {problem.solution_approach && (
              <div>
                <Button variant="ghost" size="sm" onClick={() => setShowApproach((s) => !s)} aria-expanded={showApproach}>
                  <FlaskConical /> {showApproach ? 'Hide solution approach' : 'Reveal solution approach'}
                </Button>
                {showApproach && (
                  <p className="mt-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed text-foreground-dim">
                    {problem.solution_approach}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editor + results */}
        <div className="min-w-0 space-y-3">
          <Card>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="cyan">Python</Badge>
                <span className="text-[11px] tracking-wider text-foreground-faint uppercase">Runs on the Nexora judge</span>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Button variant="subtle" size="sm" onClick={() => { setCode(starterCode); toast.info('Code reset to starter template') }} aria-label="Reset code to starter template">
                    <RotateCcw /> Reset
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRun} loading={running} disabled={checkingSamples}>
                    <Play /> Run
                  </Button>
                  <Button size="sm" onClick={handleCheckSamples} loading={checkingSamples} disabled={running || !samples.length} className={cn(allSamplesPassed && 'glow-box')}>
                    <ListChecks /> Check samples
                  </Button>
                </div>
              </div>
              <CodeEditor value={code} onChange={setCode} language="python" height="300px" ariaLabel={`Python editor for ${problem.title}`} />
              <Field label="Custom stdin" hint="Used by Run — click a sample above to load its input.">
                <Textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="stdin for a custom run…"
                  aria-label="Custom standard input"
                  className="min-h-16 font-mono text-xs"
                />
              </Field>
            </CardContent>
          </Card>

          {(runResult || sampleResults.some((r) => !r.passed)) && (
            <Card>
              <CardContent className="space-y-2">
                <p className="text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">Output</p>
                {runResult && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={runResult.verdict === 'OK' ? 'success' : 'danger'}>{runResult.verdict}</Badge>
                      <span className="font-mono text-[11px] text-foreground-faint tabular-nums">{runResult.timeMs}ms</span>
                    </div>
                    <pre className="max-h-40 overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-xs whitespace-pre-wrap text-foreground">{runResult.output || '(empty)'}</pre>
                    {(runResult.stderr || runResult.error) && (
                      <pre className="max-h-32 overflow-auto rounded-lg border border-destructive/30 bg-destructive/5 p-3 font-mono text-xs whitespace-pre-wrap text-destructive">{runResult.stderr || runResult.error}</pre>
                    )}
                  </div>
                )}
                {sampleResults.filter((r) => !r.passed).map((r) => (
                  <div key={r.index} className="space-y-1">
                    <p className="text-[11px] text-destructive">
                      Sample {r.index + 1} failed ({r.verdict}) — expected:
                    </p>
                    <pre className="max-h-24 overflow-auto rounded-lg border border-border bg-background p-2 font-mono text-[11px] whitespace-pre-wrap text-foreground-dim">{samples[r.index]?.output}</pre>
                    <p className="text-[11px] text-foreground-faint">got:</p>
                    <pre className="max-h-24 overflow-auto rounded-lg border border-border bg-background p-2 font-mono text-[11px] whitespace-pre-wrap text-foreground-dim">{r.output || r.stderr || '(empty)'}</pre>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          <Card>
            <CardContent className="space-y-3">
              <Field label="Notes">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Approach notes, what tripped you up…"
                  aria-label="Progress notes"
                  className="min-h-16 text-xs"
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button variant="subtle" size="sm" loading={saving} onClick={() => void saveProgress('in-progress')}>
                  Mark in progress
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  loading={saving}
                  onClick={() => void saveProgress('solved')}
                  className={cn(allSamplesPassed && 'glow-box-accent')}
                >
                  <CheckCircle2 /> Mark solved
                </Button>
                {status !== 'unsolved' && (
                  <Button variant="ghost" size="sm" loading={saving} onClick={() => void saveProgress('unsolved')}>
                    Reset status
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
