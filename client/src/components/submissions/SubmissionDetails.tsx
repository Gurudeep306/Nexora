import { ExternalLink, FileCode2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, LoadingBlock } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { PlatformBadge, VerdictBadge } from '@/components/shared/PlatformBadge'
import { formatDate } from '@/lib/utils'
import { fetchSubmissionCode } from './replay'
import type { SubmissionRow } from './fetchHistory'

export function SubmissionDetails({ row }: { row: SubmissionRow }) {
  const { data, loading } = useApi(() => fetchSubmissionCode(row.id).catch(() => null), [row.id])

  return (
    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
      <dl className="space-y-2 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-foreground-faint">Verdict</dt>
          <dd>
            <VerdictBadge verdict={row.verdict} />
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-foreground-faint">Runtime</dt>
          <dd className="font-mono text-foreground tabular-nums">{row.exec_time_ms} ms</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-foreground-faint">Memory</dt>
          <dd className="font-mono text-foreground tabular-nums">
            {row.memory_kb ? `${(row.memory_kb / 1024).toFixed(1)} MB` : 'n/a'}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-foreground-faint">Language</dt>
          <dd className="font-mono text-foreground">{row.language ?? 'unknown'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-foreground-faint">Submitted</dt>
          <dd className="text-foreground">{formatDate(row.submitted_at)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-foreground-faint">Problem</dt>
          <dd className="flex items-center gap-1.5">
            <PlatformBadge platform={row.platform} />
            <span className="font-mono text-foreground-faint">{row.problem_id}</span>
          </dd>
        </div>
        <div className="pt-1">
          <Link
            to={`/problems?q=${encodeURIComponent(row.title)}`}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-info transition-colors hover:text-cyan hover:underline"
          >
            <ExternalLink className="size-3" aria-hidden="true" />
            Open in problem library
          </Link>
        </div>
      </dl>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
          <FileCode2 className="size-3" aria-hidden="true" />
          Source (read-only replay)
        </p>
        {loading ? (
          <LoadingBlock rows={3} />
        ) : data?.code ? (
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
              <Badge variant="primary">{data.language ?? row.language ?? 'code'}</Badge>
              {data.durationMs != null && (
                <span className="font-mono text-[10px] text-foreground-faint tabular-nums">
                  typed in {Math.round(data.durationMs / 1000)}s
                </span>
              )}
            </div>
            <pre className="max-h-72 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-foreground-dim">
              <code>{data.code}</code>
            </pre>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-foreground-faint">
            Code was not archived for this submission.
            <br />
            Replays are captured only when the solve IDE records your keystrokes.
          </div>
        )}
      </div>
    </div>
  )
}
