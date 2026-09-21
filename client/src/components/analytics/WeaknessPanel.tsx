import { Link } from 'react-router-dom'
import { ArrowUpRight, Crosshair, Lightbulb } from 'lucide-react'
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Progress } from '@/components/ui'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { cn } from '@/lib/utils'
import type { WeaknessResponse } from './types'

const STRENGTH_META: Record<string, { variant: 'success' | 'warning' | 'danger'; bar: string; label: string }> = {
  strong: { variant: 'success', bar: 'bg-success', label: 'strong' },
  moderate: { variant: 'warning', bar: 'bg-warning', label: 'moderate' },
  weak: { variant: 'danger', bar: 'bg-destructive', label: 'weak' },
}

export function WeaknessPanel({ data }: { data: WeaknessResponse }) {
  const rows = data.analysis.slice(0, 12)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crosshair className="size-4 text-accent" aria-hidden="true" />
            Tag Strength Matrix
          </CardTitle>
          <p className="text-xs text-foreground-faint">Solve rate per tag — weakest first</p>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState title="No tag data" description="Attempt problems with tags to build your matrix." className="py-6" />
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => {
                const meta = STRENGTH_META[r.strength] ?? STRENGTH_META.weak!
                return (
                  <li key={r.tag}>
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{r.tag}</span>
                      <span className="font-mono text-foreground-faint tabular-nums">
                        {r.solved}/{r.total} · {r.solveRate}%
                      </span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                    <Progress
                      value={r.solveRate}
                      className="h-1.5"
                      barClassName={cn('bg-none', meta.bar)}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="size-4 text-gold" aria-hidden="true" />
            Training Recommendations
          </CardTitle>
          <p className="text-xs text-foreground-faint">Curated problems targeting your weakest tags</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.recommendations.length === 0 ? (
            <EmptyState
              title="Nothing to fix"
              description="No weak tags detected — you are well rounded. Push into higher ratings."
              className="py-6"
            />
          ) : (
            data.recommendations.map((rec) => (
              <div key={rec.tag}>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="accent">{rec.tag}</Badge>
                  <span className="text-[11px] text-foreground-faint">
                    {rec.solveRate}% solve rate — drill these:
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {rec.problems.map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/solve/${p.id}`}
                        className="group flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 transition-all duration-200 hover:border-primary hover:glow-box"
                      >
                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">{p.title}</span>
                        <PlatformBadge platform={p.platform} />
                        {p.rating > 0 && (
                          <span className="font-mono text-[11px] text-foreground-dim tabular-nums">{p.rating}</span>
                        )}
                        <ArrowUpRight
                          className="size-3 shrink-0 text-foreground-faint transition-colors group-hover:text-primary-bright"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
