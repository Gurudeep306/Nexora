import { Link } from 'react-router-dom'
import { ArrowUpRight, Crown, Flame, Medal, Rocket } from 'lucide-react'
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/components/ui'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { formatDate, formatNumber } from '@/lib/utils'
import type { PerformanceResponse } from './types'

export function NextLevelCard({ perf }: { perf: PerformanceResponse }) {
  const nl = perf.nextLevel
  return (
    <Card glow>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="size-4 text-cyan" aria-hidden="true" />
          Next Rift
        </CardTitle>
      </CardHeader>
      <CardContent>
        {nl ? (
          <div className="space-y-2">
            <p className="font-display text-lg tracking-wide" style={{ color: nl.color }}>
              LVL {nl.level} · {nl.name}
            </p>
            <ul className="space-y-1 text-xs text-foreground-dim">
              <li className="flex justify-between gap-2">
                <span>XP needed</span>
                <span className="font-mono text-primary-bright tabular-nums">{formatNumber(nl.xpNeeded)}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Solves needed</span>
                <span className="font-mono text-cyan tabular-nums">{formatNumber(nl.probsNeeded)}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Estimated time</span>
                <span className="font-mono text-foreground tabular-nums">
                  {nl.daysEstimate > 0 ? `~${nl.daysEstimate} days` : 'ready now'}
                </span>
              </li>
            </ul>
          </div>
        ) : (
          <p className="text-sm text-foreground-dim">
            Maximum rift reached — you are the <span className="text-gradient font-display">∞ Overflow</span>.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ProblemList({
  items,
}: {
  items: { id: number; title: string; platform: string; rating: number; meta: string }[]
}) {
  if (items.length === 0) {
    return <EmptyState title="Nothing yet" description="Keep solving to fill this hall of fame." className="py-4" />
  }
  return (
    <ul className="space-y-1.5">
      {items.map((p) => (
        <li key={p.id}>
          <Link
            to={`/solve/${p.id}`}
            className="group flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 transition-all duration-200 hover:border-primary hover:glow-box"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-foreground" title={p.title}>
                {p.title}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-foreground-faint tabular-nums">
                <PlatformBadge platform={p.platform} />
                {p.rating > 0 && <span className="text-foreground-dim">{p.rating}</span>}
                <span className="truncate">· {p.meta}</span>
              </span>
            </span>
            <ArrowUpRight
              className="size-3 shrink-0 text-foreground-faint transition-colors group-hover:text-primary-bright"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function BestsPanel({ perf }: { perf: PerformanceResponse }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="size-4 text-gold" aria-hidden="true" />
            Hardest Kills
          </CardTitle>
          <p className="text-xs text-foreground-faint">Highest-rated problems you have solved</p>
        </CardHeader>
        <CardContent>
          <ProblemList
            items={perf.hardestSolved.map((p) => ({
              id: p.id,
              title: p.title,
              platform: p.platform,
              rating: p.rating,
              meta: `${p.attempts} attempt${p.attempts === 1 ? '' : 's'}`,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="size-4 text-streak" aria-hidden="true" />
            Longest Sieges
          </CardTitle>
          <p className="text-xs text-foreground-faint">Problems that took the most attempts</p>
        </CardHeader>
        <CardContent>
          <ProblemList
            items={perf.mostAttempted.map((p) => ({
              id: p.id,
              title: p.title,
              platform: p.platform,
              rating: p.rating,
              meta: `${p.attempts} tries · ${p.solve_status}`,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="size-4 text-cyan" aria-hidden="true" />
            First Conquests
          </CardTitle>
          <p className="text-xs text-foreground-faint">Your first solve in each rating bracket</p>
        </CardHeader>
        <CardContent>
          {perf.firstSolves.length === 0 ? (
            <EmptyState title="No conquests yet" description="Solve a rated problem to plant your flag." className="py-4" />
          ) : (
            <ul className="space-y-2">
              {perf.firstSolves.map((f) => (
                <li key={f.bracket} className="flex items-center gap-2 text-xs">
                  <Badge variant="cyan" className="w-20 justify-center font-mono normal-case">
                    {f.bracket}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-foreground-dim" title={f.firstTitle}>{f.firstTitle}</span>
                  <span className="font-mono text-[10px] text-foreground-faint tabular-nums">
                    {f.firstDate ? formatDate(f.firstDate) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
