import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, Moon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import type { StreakInfo, WeeklyProgressPoint } from './types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface ChartTooltipProps {
  active?: boolean
  payload?: { value?: number | string; payload?: Record<string, unknown> }[]
  label?: string | number
}

function WeekTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload ?? {}
  return (
    <div className="rounded-lg border border-border-glow bg-surface px-3 py-2 text-xs glow-box">
      <p className="font-display tracking-wider text-foreground">{String(label)}</p>
      <p className="mt-1 font-mono text-success tabular-nums">{String(payload[0]?.value ?? 0)} solved</p>
      {p.xp != null && <p className="font-mono text-primary-bright tabular-nums">{String(p.xp)} XP</p>}
    </div>
  )
}

export function ActivityChart({
  streak,
  weeklyProgress,
}: {
  streak: StreakInfo
  weeklyProgress: WeeklyProgressPoint[]
}) {
  const weekData = streak.lastWeek.map((d) => ({
    day: DAY_LABELS[new Date(`${d.date}T00:00:00`).getDay()] ?? d.date.slice(5),
    solved: d.solved,
  }))
  const weeks = weeklyProgress.slice(-8).map((w) => ({ week: w.week, solved: w.solved, xp: w.xp }))
  const showWeekly = weeks.some((w) => w.solved > 0)
  const quietWeek = weekData.every((d) => d.solved === 0)
  const weekTotal = weekData.reduce((s, d) => s + d.solved, 0)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-cyan" aria-hidden="true" /> Recent activity
          {!quietWeek && (
            <span className="ml-auto font-mono text-[11px] font-normal text-foreground-faint tabular-nums">
              {weekTotal} solved this week
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative h-40" role="img" aria-label="Problems solved in the last 7 days">
          {quietWeek && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-surface/70 text-center backdrop-blur-[2px]">
              <Moon className="size-5 text-foreground-faint" aria-hidden="true" />
              <p className="text-xs text-foreground-dim">Quiet week so far — the rift is waiting.</p>
              <Link
                to="/problems"
                className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary-bright transition-colors hover:bg-primary/20"
              >
                Solve one now <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: 'var(--color-foreground-faint)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: 'var(--color-foreground-faint)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: 'var(--color-primary)', opacity: 0.08 }} content={<WeekTooltip />} />
              <Bar dataKey="solved" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {weekData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.solved > 0 ? 'var(--color-primary)' : 'var(--color-muted)'}
                    stroke={d.solved > 0 ? 'var(--color-primary-bright)' : 'var(--color-border)'}
                    strokeWidth={1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {showWeekly && (
          <>
            <p className="text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
              Weekly XP · last {weeks.length} weeks
            </p>
            <div className="h-28" role="img" aria-label="XP earned per week">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeks} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis
                    dataKey="week"
                    tick={{ fill: 'var(--color-foreground-faint)', fontSize: 10 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--color-foreground-faint)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={{ fill: 'var(--color-cyan)', opacity: 0.06 }} content={<WeekTooltip />} />
                  <Bar dataKey="xp" fill="var(--color-cyan)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
