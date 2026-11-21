import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Check, CheckCircle2, ChevronDown, Clock, Copy, Terminal, XCircle } from 'lucide-react'
import { VerdictBadge } from '@/components/shared/PlatformBadge'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { judgeOf, sourceLabel } from '@/lib/sources'
import './results.css'
import { engineLabel, type JudgeResponse, type RunResult, type XpReport } from './types'

const norm = (s: string) => s.replace(/\r/g, '').split('\n').map((l) => l.trimEnd())
const trimLines = (a: string[]) => {
  const out = [...a]
  while (out.length && out[out.length - 1] === '') out.pop()
  return out
}

/** First line where expected and actual differ (judge-style: trailing spaces ignored). */
function firstMismatch(expected: string, actual: string) {
  const e = trimLines(norm(expected))
  const a = trimLines(norm(actual))
  const n = Math.max(e.length, a.length)
  for (let i = 0; i < n; i++) {
    if ((e[i] ?? '') !== (a[i] ?? '')) return { line: i + 1, expected: e[i] ?? '∅ (no line)', actual: a[i] ?? '∅ (no line)' }
  }
  return null
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1200)
        })
      }}
      aria-label="Copy"
      className="rounded p-0.5 text-foreground-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
    >
      {done ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
    </button>
  )
}

function OutputBlock({
  label,
  text,
  tone,
  highlightLine,
}: {
  label: string
  text: string
  tone?: 'error' | 'ok'
  highlightLine?: number
}) {
  if (!text) return null
  const lines = text.replace(/\r/g, '').split('\n')
  return (
    <div className="group min-w-0">
      <div className="flex items-center gap-1.5">
        <p className="text-[12px] font-semibold text-foreground-faint">{label}</p>
        <CopyBtn text={text} />
      </div>
      <pre
        className={cn(
          'mt-1 max-h-52 overflow-auto rounded-md border border-hairline/[0.05] bg-bg-field py-1.5 font-mono text-xs',
          tone === 'error' ? 'text-state-error' : tone === 'ok' ? 'text-state-success' : 'text-foreground',
        )}
      >
        {lines.map((l, i) => (
          <div
            key={i}
            className={cn('flex px-2', highlightLine === i + 1 && 'bg-destructive/15 shadow-[inset_2px_0_0_var(--color-destructive)]')}
          >
            <span className="mr-3 w-6 shrink-0 text-right text-foreground-faint/50 select-none">{i + 1}</span>
            <span className="whitespace-pre-wrap break-all">{l || ' '}</span>
          </div>
        ))}
      </pre>
    </div>
  )
}

function Mismatch({ expected, actual }: { expected: string; actual: string }) {
  const m = firstMismatch(expected, actual)
  if (!m) return null
  return (
    <p className="rounded-md border border-destructive/25 bg-destructive/[0.07] px-2.5 py-1.5 font-mono text-[11px] text-foreground-dim">
      <span className="text-state-error">Line {m.line}</span> · expected <span className="text-state-success">{m.expected.slice(0, 80)}</span> but got{' '}
      <span className="text-state-error">{m.actual.slice(0, 80)}</span>
    </p>
  )
}

function EngineChip({ engine, cached }: { engine?: string; cached?: boolean }) {
  if (!engine) return null
  return (
    <span
      className="rounded border border-border px-1.5 py-px font-mono text-[10px] text-foreground-faint"
      title={cached ? 'Served from the judge cache — this exact code and input ran moments ago' : `Executed on ${engineLabel(engine)}`}
    >
      {engineLabel(engine)}
      {cached ? ' · cached' : ''}
    </span>
  )
}

export function RunOutput({ result, expected, caseLabel }: { result: RunResult; expected?: string; caseLabel?: string }) {
  const compared = expected != null && expected.trim() !== '' && !result.error && result.verdict === 'OK'
  const match = compared && !firstMismatch(expected, result.output ?? '')
  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <VerdictBadge verdict={result.verdict} />
        {compared && (
          <span
            className={cn(
              'rounded-md border px-1.5 py-px text-[12px] font-semibold',
              // No tinted fill: small coloured text on a tint falls under 4.5:1.
              match ? 'border-success/40 text-state-success' : 'border-destructive/40 text-state-error',
            )}
          >
            {match ? `matches ${caseLabel ?? 'expected'}` : `differs from ${caseLabel ?? 'expected'}`}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2 font-mono text-xs text-foreground-dim tabular-nums">
          <EngineChip engine={result.engine} cached={result.cached} />
          <span className="flex items-center gap-1">
            <Clock className="size-3" /> {result.timeMs} ms
          </span>
        </span>
      </div>
      {result.error && (
        <pre className="max-h-48 overflow-auto rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-xs whitespace-pre-wrap text-foreground">
          {result.error}
        </pre>
      )}
      {compared && !match && <Mismatch expected={expected} actual={result.output ?? ''} />}
      <div className={cn('grid gap-3', compared && !match ? 'md:grid-cols-2' : 'md:grid-cols-2')}>
        <OutputBlock
          label="stdout"
          text={result.output}
          tone={compared ? (match ? 'ok' : 'error') : undefined}
          highlightLine={compared && !match ? firstMismatch(expected, result.output ?? '')?.line : undefined}
        />
        {compared && !match ? <OutputBlock label="expected" text={expected} tone="ok" /> : <OutputBlock label="stderr" text={result.stderr} tone="error" />}
      </div>
      {compared && !match && result.stderr && <OutputBlock label="stderr" text={result.stderr} tone="error" />}
      {!result.output && !result.stderr && !result.error && (
        <p className="text-xs text-foreground-faint">Program produced no output.</p>
      )}
    </div>
  )
}

/** What an Accepted earned: "+25 XP" and how far the next level is. */
export function XpGain({ x }: { x: XpReport }) {
  if (!x.gainedXp) {
    return (
      <p className="m-0 rounded-lg border border-border px-3 py-2 text-xs text-foreground-dim" role="status">
        {x.firstSolve
          ? 'Solved: a full check passed. Its XP was already counted when it passed the examples.'
          : x.examplesOnly
            ? 'Passed the examples again. XP counts once per problem, so this one adds none.'
            : 'Accepted again. XP counts once per problem, so this one adds none.'}
      </p>
    )
  }
  const a = x.after
  const leveled = a.level > x.before.level
  const pct = (n: number, d: number) => (d > 0 ? Math.max(0, Math.min(100, Math.round((n / d) * 100))) : 100)
  const bars: [string, number, number, string][] = [
    ['XP', a.xpInLevel, a.xpForNext, `${a.xpInLevel} / ${a.xpForNext} XP`],
    ['Problems', a.probsInLevel, a.probsForNext, `${a.probsInLevel} / ${a.probsForNext} solved`],
  ]
  const xpLeft = Math.max(0, a.xpForNext - a.xpInLevel)
  const probLeft = Math.max(0, a.probsForNext - a.probsInLevel)
  const needs = [a.xpGated && `${xpLeft} XP`, a.probGated && `${probLeft} more ${probLeft === 1 ? 'problem' : 'problems'}`].filter(Boolean).join(' and ')
  return (
    <section className="rounded-lg border border-border px-3 py-2.5" role="status" aria-label="XP earned">
      <p className="m-0 flex flex-wrap items-baseline gap-x-2 text-sm text-foreground">
        <span className="font-mono font-semibold tabular-nums">+{x.gainedXp} XP</span>
        <span className="text-xs text-foreground-dim">
          {leveled
            ? `Level up: you are now level ${a.level}, ${a.badge} ${a.name}.`
            : `Level ${a.level} ${a.name}${needs ? ` · ${needs} to level ${a.level + 1}` : ''}`}
        </span>
      </p>
      {x.examplesOnly && (
        <p className="m-0 mt-1 text-xs text-foreground-dim">The XP counts now. The problem counts as solved once a full check passes.</p>
      )}
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {bars.map(([label, n, d, text]) => (
          <div key={label}>
            <div className="mb-0.5 flex justify-between text-[11px] text-foreground-faint">
              <span>{label}</span>
              <span className="font-mono tabular-nums">{text}</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-label={`${label} toward the next level`}
              aria-valuemin={0}
              aria-valuemax={d}
              aria-valuenow={Math.min(n, d)}
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct(n, d)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <a href="/profile#levels" className="mt-1.5 inline-block text-[11px] text-foreground-dim underline underline-offset-2 hover:text-foreground">
        How levels are earned
      </a>
    </section>
  )
}

export function JudgeResults({ result, onExplain }: { result: JudgeResponse; /** After Accepted: open Explain-back. */ onExplain?: () => void }) {
  const passedCount = result.results.filter((r) => r.passed).length
  const total = result.results.length
  const maxMs = Math.max(0, ...result.results.map((r) => r.timeMs ?? 0))
  const [open, setOpen] = useState<number | null>(() => {
    const i = result.results.findIndex((r) => !r.passed)
    return i >= 0 ? i : null
  })
  const cov = result.coverage
  const examplesOnly = result.verdict === 'AC' && !!cov && !cov.full
  return (
    <div className="space-y-3 p-3">
      {cov?.benchmark && (
        <p className="m-0 rounded-lg border border-border px-3 py-2 text-[12.5px] text-foreground-dim" role="note">
          <span className="font-medium text-foreground">Checked on the NexoraGuru benchmark:</span> {cov.benchmark} tests — the examples, corner cases and AI tests that two separate solutions agreed on.{' '}
          {result.verdict === 'AC' ? 'All passed: solved.' : 'Pass them all to count it as solved; until then you earn the share you pass.'}
        </p>
      )}
      {examplesOnly && cov && (
        <div className="rounded-lg border border-border bg-surface-2 p-3 text-[12.5px] text-foreground-dim" role="note">
          <p className="m-0 font-semibold text-foreground">Passed the examples, not {judgeOf(cov.judge)} full tests</p>
          <p className="m-0 mt-1">
            {cov.pending
              ? `${judgeOf(cov.judge)} full tests are being fetched now. Submit again in a minute to be checked on all of them.`
              : cov.failed
                ? `${judgeOf(cov.judge)} full tests could not be fetched just now, so only the examples and your own tests ran. A wrong idea can still pass them.`
                : `${judgeOf(cov.judge)} full tests are not available here for this problem, so only the examples and your own tests ran. A wrong idea can still pass them.`}{' '}
            {cov.url && !cov.pending && (
              <a href={cov.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-2">
                Submit on {sourceLabel(cov.judge)} for the real verdict
              </a>
            )}
          </p>
        </div>
      )}
      {result.xp && <XpGain x={result.xp} />}
      {result.verdict === 'AC' && onExplain && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5">
          <p className="m-0 text-[12.5px] text-foreground-dim">
            <span className="font-medium text-foreground">Can you explain it?</span> Explain it back in your own words — a pass counts towards your Nexus mastery.
          </p>
          <Button size="sm" variant="secondary" onClick={onExplain}>
            Explain it back
          </Button>
        </div>
      )}
      {result.compileError && (
        <div>
          <p className="mb-1 text-[12px] font-semibold text-info">Compilation error</p>
          <pre className="max-h-60 overflow-auto rounded-md border border-info/40 bg-info/5 p-2 font-mono text-xs whitespace-pre-wrap text-info">
            {result.compileError}
          </pre>
        </div>
      )}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 text-xs text-foreground-dim">
            <span>
              <span className={cn('font-mono tabular-nums', passedCount === total ? 'text-success' : 'text-warning')}>{passedCount}</span> /{' '}
              <span className="font-mono tabular-nums">{total}</span> testcases passed
            </span>
            <span className="ml-auto flex items-center gap-2 font-mono text-foreground-faint tabular-nums">
              <EngineChip engine={result.engine ?? result.results[0]?.engine} />
              <span className="flex items-center gap-1">
                <Clock className="size-3" /> max {maxMs} ms
              </span>
            </span>
          </div>
          <TestReel results={result.results} open={open} onPick={(i) => setOpen(open === i ? null : i)} />
        </div>
      )}
      <ul className="rp-cases space-y-1.5" aria-label="Testcase results">
        {result.results.map((r, i) => {
          const expanded = open === i
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: Math.min(i, 12) * 0.025 }}
              data-passed={r.passed || undefined}
              className={cn('rp-case overflow-hidden rounded-lg border bg-surface', r.passed ? 'border-success/20' : 'border-destructive/35')}
            >
              <button
                onClick={() => setOpen(expanded ? null : i)}
                aria-expanded={expanded}
                className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-white/[0.02]"
              >
                {r.passed ? (
                  <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Passed" />
                ) : (
                  <XCircle className="size-4 shrink-0 text-destructive" aria-label="Failed" />
                )}
                <span className="font-mono text-xs font-semibold text-foreground">{r.label || `Case ${i + 1}`}</span>
                <VerdictBadge verdict={r.verdict} />
                <span className="ml-auto font-mono text-[11px] text-foreground-faint tabular-nums">{r.timeMs} ms</span>
                <ChevronDown className={cn('size-3.5 text-foreground-faint transition-transform', expanded && 'rotate-180')} />
              </button>
              {expanded && (
                <div className="space-y-2 border-t border-hairline/[0.05] px-2.5 pt-2 pb-2.5">
                  {!r.passed && r.verdict === 'WA' && <Mismatch expected={r.expected} actual={r.actual} />}
                  <div className="grid gap-2 md:grid-cols-3">
                    <OutputBlock label="Input" text={r.input} />
                    <OutputBlock label="Expected" text={r.expected} tone="ok" />
                    <OutputBlock
                      label="Your output"
                      text={r.actual}
                      tone={r.passed ? 'ok' : 'error'}
                      highlightLine={r.passed ? undefined : firstMismatch(r.expected, r.actual)?.line}
                    />
                  </div>
                  {r.stderr && <OutputBlock label="stderr" text={r.stderr} tone="error" />}
                </div>
              )}
            </motion.li>
          )
        })}
      </ul>
      {result.results.length === 0 && !result.compileError && (
        <p className="flex items-center gap-2 text-xs text-foreground-faint">
          <Terminal className="size-3.5" aria-hidden="true" /> No testcases were judged — add tests first.
        </p>
      )}
    </div>
  )
}

/**
 * The tests as a row of cells that fill in one after another when a verdict
 * arrives: green with a tick, red with a cross, with a count that climbs
 * along. The judge runs every test before it answers, so this is the
 * result shown in order (not a live feed); still motion is skipped.
 */
export function TestReel({ results, open, onPick }: { results: JudgeResponse['results']; open: number | null; onPick: (i: number) => void }) {
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  // The whole reel takes at most about 1.2 s, however many tests there are.
  const step = results.length ? Math.min(0.09, 1.2 / results.length) : 0
  const [shown, setShown] = useState(still ? results.length : 0)
  useEffect(() => {
    if (still) return
    let n = 0
    const t = window.setInterval(() => {
      n++
      setShown(n)
      if (n >= results.length) window.clearInterval(t)
    }, step * 1000)
    return () => window.clearInterval(t)
  }, [results, still, step])
  const passed = results.slice(0, shown).filter((r) => r.passed).length
  const done = shown >= results.length
  const all = done && results.every((r) => r.passed)
  return (
    <div className="rp-reel" data-all={all || undefined}>
      <div className="rp-reel-cells" role="list" aria-label="Tests, in order">
        {results.map((r, i) => (
          <button
            key={i}
            type="button"
            role="listitem"
            onClick={() => onPick(i)}
            aria-label={`${r.label || `Test ${i + 1}`}: ${r.passed ? 'passed' : r.verdict}`}
            aria-pressed={open === i}
            className={cn('rp-cell', i < shown && (r.passed ? 'is-pass' : 'is-fail'), open === i && 'is-open')}
          >
            {i < shown && (r.passed ? <Check className="size-3" aria-hidden="true" /> : <XCircle className="size-3" aria-hidden="true" />)}
          </button>
        ))}
      </div>
      <p className="rp-reel-count" aria-live="polite">
        <span className="font-mono tabular-nums">{passed}</span>
        <span className="text-foreground-faint"> / {results.length} passed</span>
        {all && <span className="rp-reel-all"> · all clear</span>}
      </p>
    </div>
  )
}

/** While the judge works: the tests waiting in a row, a calm scan across them, and the time so far. */
export function JudgingCard({ count, label }: { count: number; label: string }) {
  const [t0] = useState(() => Date.now())
  const [now, setNow] = useState(t0)
  useEffect(() => {
    const i = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(i)
  }, [])
  const n = Math.max(3, Math.min(count || 10, 40))
  return (
    <div className="rp-judging" role="status" aria-live="polite">
      <div className="rp-reel-cells is-waiting" aria-hidden="true">
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className="rp-cell" style={{ animationDelay: `${(i % 20) * 70}ms` }} />
        ))}
      </div>
      <p className="m-0 text-[12.5px] text-foreground-dim">
        {label} <span className="font-mono text-foreground-faint tabular-nums">{((now - t0) / 1000).toFixed(1)} s</span>
      </p>
    </div>
  )
}
