import { motion } from 'motion/react'
import { CheckCircle2, Terminal, XCircle } from 'lucide-react'
import { VerdictBadge } from '@/components/shared/PlatformBadge'
import { cn } from '@/lib/utils'
import type { JudgeResponse, RunResult } from './types'

function OutputBlock({ label, text, tone }: { label: string; text: string; tone?: 'error' }) {
  if (!text) return null
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">{label}</p>
      <pre
        className={cn(
          'mt-1 max-h-44 overflow-auto rounded-md bg-background p-2 font-mono text-xs whitespace-pre-wrap',
          tone === 'error' ? 'text-destructive' : 'text-foreground',
        )}
      >
        {text}
      </pre>
    </div>
  )
}

export function RunOutput({ result }: { result: RunResult }) {
  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <VerdictBadge verdict={result.verdict} />
        <span className="font-mono text-xs text-foreground-dim tabular-nums">{result.timeMs} ms</span>
      </div>
      {result.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {result.error}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <OutputBlock label="stdout" text={result.output} />
        <OutputBlock label="stderr" text={result.stderr} tone="error" />
      </div>
      {!result.output && !result.stderr && !result.error && (
        <p className="text-xs text-foreground-faint">Program produced no output.</p>
      )}
    </div>
  )
}

export function JudgeResults({ result }: { result: JudgeResponse }) {
  const passedCount = result.results.filter((r) => r.passed).length
  return (
    <div className="space-y-3 p-3">
      {result.compileError && (
        <pre className="max-h-40 overflow-auto rounded-md border border-info/40 bg-info/5 p-2 font-mono text-xs whitespace-pre-wrap text-info">
          {result.compileError}
        </pre>
      )}
      {result.results.length > 0 && (
        <p className="text-xs text-foreground-dim">
          <span className="font-mono text-success tabular-nums">{passedCount}</span> /{' '}
          <span className="font-mono tabular-nums">{result.results.length}</span> testcases passed
        </p>
      )}
      <ul className="space-y-2" aria-label="Testcase results">
        {result.results.map((r, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: i * 0.03 }}
            className={cn(
              'rounded-lg border bg-surface p-2.5',
              r.passed ? 'border-success/30' : 'border-destructive/40',
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              {r.passed ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Passed" />
              ) : (
                <XCircle className="size-4 shrink-0 text-destructive" aria-label="Failed" />
              )}
              <span className="font-mono text-xs font-semibold text-foreground">{r.label || `Case ${i + 1}`}</span>
              <VerdictBadge verdict={r.verdict} />
              <span className="ml-auto font-mono text-[11px] text-foreground-faint tabular-nums">
                {r.timeMs} ms
              </span>
            </div>
            {!r.passed && (
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <OutputBlock label="Input" text={r.input} />
                <OutputBlock label="Expected" text={r.expected} />
                <OutputBlock label="Actual" text={r.actual} tone="error" />
              </div>
            )}
            {r.stderr && <div className="mt-2"><OutputBlock label="stderr" text={r.stderr} tone="error" /></div>}
          </motion.li>
        ))}
      </ul>
      {result.results.length === 0 && !result.compileError && (
        <p className="flex items-center gap-2 text-xs text-foreground-faint">
          <Terminal className="size-3.5" aria-hidden="true" /> No testcases were judged — add tests first.
        </p>
      )}
    </div>
  )
}
