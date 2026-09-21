import { Link } from 'react-router-dom'
import { History, Inbox } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/components/ui'
import { PlatformBadge, VerdictBadge } from '@/components/shared/PlatformBadge'
import { timeAgo } from '@/lib/utils'
import type { RecentSubmission } from './types'

export function RecentSubmissions({ submissions }: { submissions: RecentSubmission[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <History className="size-4 text-primary-bright" aria-hidden="true" /> Recent submissions
        </CardTitle>
        <Link
          to="/submissions"
          className="cursor-pointer text-xs font-semibold text-primary-bright transition-colors hover:text-cyan"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <EmptyState
            className="py-6"
            icon={<Inbox />}
            title="No submissions yet"
            description="Solve a problem and your runs will show up here."
            action={
              <Link
                to="/problems"
                className="cursor-pointer rounded-lg border border-border-glow px-4 py-2 text-xs font-semibold text-primary-bright transition-all hover:border-primary hover:glow-box"
              >
                Browse problems
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {submissions.slice(0, 8).map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 px-1 py-2.5 transition-colors duration-150 hover:bg-surface-2/60"
              >
                <VerdictBadge verdict={s.verdict} className="w-28 shrink-0 justify-center" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">{s.title}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11px] text-foreground-faint">
                    <PlatformBadge platform={s.platform} />
                    {s.rating > 0 && <span className="font-mono tabular-nums">· {s.rating}</span>}
                  </span>
                </span>
                <span className="shrink-0 text-right text-[11px] text-foreground-faint">
                  <span className="block font-mono tabular-nums">{timeAgo(s.submitted_at)}</span>
                  <span className="block font-mono tabular-nums">{s.exec_time_ms} ms</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
