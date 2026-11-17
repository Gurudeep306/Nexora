import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, CheckCircle2, ChevronDown, Clock, Copy, Terminal, XCircle } from 'lucide-react'
import { VerdictBadge } from '@/components/shared/PlatformBadge'
import { cn } from '@/lib/utils'
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
  if (!x.firstSolve) {
    return (
      <p className="m-0 rounded-lg border border-border px-3 py-2 text-xs text-foreground-dim" role="status">
        Accepted again. XP counts once per problem, so this one adds none.
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

export function JudgeResults({ result }: { result: JudgeResponse }) {
  const passedCount = result.results.filter((r) => r.passed).length
  const total = result.results.length
  const maxMs = Math.max(0, ...result.results.map((r) => r.timeMs ?? 0))
  const [open, setOpen] = useState<number | null>(() => {
    const i = result.results.findIndex((r) => !r.passed)
    return i >= 0 ? i : null
  })
  return (
    <div className="space-y-3 p-3">
      {result.xp && <XpGain x={result.xp} />}
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
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
            {result.results.map((r, i) => (
              <button
                key={i}
                onClick={() => setOpen(open === i ? null : i)}
                title={`${r.label || `Case ${i + 1}`}: ${r.verdict}`}
                className={cn('flex-1 cursor-pointer transition-opacity hover:opacity-80', r.passed ? 'bg-success' : 'bg-destructive')}
              />
            ))}
          </div>
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
