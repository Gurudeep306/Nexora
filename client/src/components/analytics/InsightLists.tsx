import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Crosshair, Flame, History, Skull, Sparkles, Table2 } from 'lucide-react'
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Table, TBody, TD, TH, THead, TR } from '@/components/ui'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import { ratingTextClass } from '@/components/nexus/icons'
import type { FirstSolve, InsightProblem, Recommendation, SolveSpeedRow } from './types'

export function SolveSpeedTable({ data }: { data: SolveSpeedRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Table2 className="size-4 text-primary-bright" aria-hidden="true" /> Solve efficiency
        </CardTitle>
        <p className="text-[11px] text-foreground-faint">Average attempts and time-to-solve per rating bracket</p>
      </CardHeader>
      <CardContent>
        {data.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Bracket</TH>
                <TH className="text-right">Solves</TH>
                <TH className="text-right">Avg tries</TH>
                <TH className="text-right">Avg time</TH>
              </TR>
            </THead>
            <TBody>
              {data.map((r) => (
                <TR key={r.bracket}>
                  <TD className="font-mono text-xs font-semibold text-foreground">{r.bracket}</TD>
                  <TD className="text-right font-mono text-xs tabular-nums">{formatNumber(r.count)}</TD>
                  <TD className="text-right font-mono text-xs tabular-nums">
                    <span className={cn(r.avgAttempts <= 1.5 ? 'text-success' : r.avgAttempts >= 3 ? 'text-warning' : 'text-foreground-dim')}>
                      {r.avgAttempts.toFixed(1)}
                    </span>
                  </TD>
                  <TD className="text-right font-mono text-xs tabular-nums">
                    {r.avgMinutes >= 60 ? `${Math.floor(r.avgMinutes / 60)}h ${r.avgMinutes % 60}m` : `${r.avgMinutes}m`}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={<Table2 />} title="No efficiency data" description="Solve a few problems to benchmark your pace." className="py-6" />
        )}
      </CardContent>
    </Card>
  )
}

function ProblemMiniList({ title, icon, problems, showAttempts }: { title: string; icon: ReactNode; problems: InsightProblem[]; showAttempts?: boolean }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {problems.length ? (
          <ul className="space-y-0.5">
            {problems.map((p) => (
              <li key={`${p.id}-${p.problem_id}`}>
                <Link
                  to={`/solve/${p.id}`}
                  className="flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 transition-all duration-200 hover:border-border-glow hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">{p.title}</span>
                    <span className="block font-mono text-[10px] text-foreground-faint">
                      {p.platform}
                      {showAttempts && p.attempts != null && ` · ${p.attempts} attempts`}
                    </span>
                  </span>
                  <span className={cn('shrink-0 font-mono text-xs font-bold tabular-nums', ratingTextClass(p.rating))}>
                    {p.rating || '?'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing here yet" description="This list fills as you fight harder problems." className="py-6" />
        )}
      </CardContent>
    </Card>
  )
}

export function HardestSolved({ problems }: { problems: InsightProblem[] }) {
  return <ProblemMiniList title="Hardest kills" icon={<Skull className="size-4 text-accent" aria-hidden="true" />} problems={problems} showAttempts />
}

export function MostAttempted({ problems }: { problems: InsightProblem[] }) {
  return <ProblemMiniList title="Most attempted" icon={<Flame className="size-4 text-warning" aria-hidden="true" />} problems={problems} showAttempts />
}

export function RecommendationsPanel({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-cyan" aria-hidden="true" /> Training recommendations
        </CardTitle>
        <p className="text-[11px] text-foreground-faint">Weak tags first — the rift suggests these drills</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.length ? (
          recommendations.map((rec) => (
            <div key={rec.tag} className="rounded-lg border border-border bg-surface/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="primary">{rec.tag}</Badge>
                <span className="font-mono text-[11px] text-foreground-dim tabular-nums">{rec.solveRate}% solve rate</span>
              </div>
              <ul className="mt-2 space-y-0.5">
                {rec.problems.slice(0, 3).map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/solve/${p.id}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{p.title}</span>
                      <span className={cn('shrink-0 font-mono text-[11px] font-bold tabular-nums', ratingTextClass(p.rating))}>
                        {p.rating || '?'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <EmptyState icon={<Sparkles />} title="No recommendations" description="Solve across a few tags and the coach kicks in." className="py-6" />
        )}
      </CardContent>
    </Card>
  )
}

export function FirstSolvesTimeline({ firstSolves }: { firstSolves: FirstSolve[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4 text-success" aria-hidden="true" /> First blood per bracket
        </CardTitle>
      </CardHeader>
      <CardContent>
        {firstSolves.length ? (
          <ol className="relative ml-2 space-y-3 border-l border-border pl-4" aria-label="First solve per rating bracket">
            {firstSolves.map((f) => (
              <li key={f.bracket} className="relative">
                <span
                  className="absolute -left-[21.5px] top-1 flex size-3 items-center justify-center rounded-full border border-primary-bright bg-background"
                  aria-hidden="true"
                >
                  <Crosshair className="size-2 text-primary-bright" />
                </span>
                <p className="font-mono text-[11px] font-bold text-foreground">
                  {f.bracket}
                  <span className="ml-2 font-normal text-foreground-faint">{formatDate(f.firstDate)}</span>
                </p>
                <p className="truncate text-xs text-foreground-dim">{f.firstTitle}</p>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState icon={<History />} title="No first solves logged" description="Each new rating bracket you crack gets memorialized here." className="py-6" />
        )}
      </CardContent>
    </Card>
  )
}
