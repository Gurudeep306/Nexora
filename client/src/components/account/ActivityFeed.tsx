import { Activity, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/components/ui'
import { timeAgo } from '@/lib/utils'
import type { ActivityFeedRow } from './types'

const TYPE_ICON_CLASS: Record<string, string> = {
  solve: 'text-success',
  solved: 'text-success',
  achievement: 'text-gold',
  level_up: 'text-primary-bright',
  submission: 'text-cyan',
  friend: 'text-accent',
}

export function ActivityFeed({ activity }: { activity: ActivityFeedRow[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-cyan" aria-hidden="true" /> Recent activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <EmptyState
            className="py-6"
            icon={<Trophy />}
            title="No activity yet"
            description="Solve problems and unlock achievements to fill your feed."
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {activity.map((row) => (
              <li key={row.id} className="flex items-start gap-3 py-2.5">
                <span
                  className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 ${
                    TYPE_ICON_CLASS[row.type?.toLowerCase()] ?? 'text-foreground-dim'
                  }`}
                  aria-hidden="true"
                >
                  <Activity className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground-dim">
                    <span className="font-semibold text-foreground capitalize">
                      {(row.type ?? 'event').replace(/_/g, ' ')}
                    </span>
                    {row.content ? ` — ${row.content}` : ''}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-foreground-faint tabular-nums">
                    {timeAgo(row.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
