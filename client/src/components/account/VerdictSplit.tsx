import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, EmptyState, Progress } from '@/components/ui'
import { VerdictBadge } from '@/components/shared/PlatformBadge'

const BAR_CLASS: Record<string, string> = {
  AC: 'bg-gradient-to-r from-success/70 to-success',
  WA: 'bg-gradient-to-r from-destructive/70 to-destructive',
  TLE: 'bg-gradient-to-r from-warning/70 to-warning',
  RE: 'bg-gradient-to-r from-accent/70 to-accent',
  CE: 'bg-gradient-to-r from-info/70 to-info',
}

export function VerdictSplit({ verdicts }: { verdicts: { verdict: string; count: number }[] }) {
  const rows = [...verdicts].sort((a, b) => b.count - a.count)
  const max = rows[0]?.count ?? 0

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-4 text-primary-bright" aria-hidden="true" /> Verdict split
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState className="py-6" icon={<BarChart3 />} title="No judged runs yet" />
        ) : (
          <ul className="space-y-3">
            {rows.map((v) => (
              <li key={v.verdict} className="flex items-center gap-3">
                <VerdictBadge verdict={v.verdict} className="w-28 shrink-0 justify-center" />
                <Progress
                  value={v.count}
                  max={max}
                  className="h-1.5 flex-1"
                  barClassName={BAR_CLASS[v.verdict?.toUpperCase()] ?? undefined}
                />
                <span className="w-10 shrink-0 text-right font-mono text-xs text-foreground-dim tabular-nums">
                  {v.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
