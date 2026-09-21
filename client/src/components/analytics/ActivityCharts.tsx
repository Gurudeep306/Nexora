import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CalendarRange, Clock } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { ChartCard, ChartTooltip } from './ChartCard'
import { AXIS_TICK } from './types'
import type { HourDistRow, WeeklyProgressRow } from './types'

export function WeeklyChart({ data }: { data: WeeklyProgressRow[] }) {
  const weeks = data.slice(-10)
  const hasData = weeks.some((w) => w.solved > 0 || w.xp > 0)
  return (
    <ChartCard
      icon={<CalendarRange className="size-4 text-cyan" aria-hidden="true" />}
      title="Weekly output"
      subtitle="Solves (bars) and XP (line) per ISO week"
      label="Bar and line chart of solves and XP per week"
    >
      {hasData ? (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={weeks} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={AXIS_TICK} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
              <YAxis yAxisId="s" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
              <YAxis yAxisId="xp" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
              <Tooltip cursor={{ fill: 'var(--color-primary)', opacity: 0.08 }} content={<ChartTooltip />} />
              <Bar
                yAxisId="s"
                dataKey="solved"
                name="solved"
                fill="var(--color-primary)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Line
                yAxisId="xp"
                type="monotone"
                dataKey="xp"
                name="xp"
                stroke="var(--color-cyan)"
                strokeWidth={2}
                dot={{ r: 2.5, fill: 'var(--color-cyan)' }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState icon={<CalendarRange />} title="No weekly data yet" description="Your first solve starts the log." className="py-8" />
      )}
    </ChartCard>
  )
}

export function HourDistChart({ data }: { data: HourDistRow[] }) {
  const hasData = data.some((d) => d.total > 0)
  const rows = data.map((d) => ({ ...d, label: `${String(d.hour).padStart(2, '0')}:00` }))
  return (
    <ChartCard
      icon={<Clock className="size-4 text-warning" aria-hidden="true" />}
      title="Grind hours"
      subtitle="Submissions by hour of day — when the rift sees you most"
      label="Area chart of submissions and accepted solutions per hour of day"
    >
      {hasData ? (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
              <defs>
                <linearGradient id="hourFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} minTickGap={28} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
              <Tooltip cursor={{ stroke: 'var(--color-border-glow)' }} content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                name="submissions"
                stroke="var(--color-warning)"
                strokeWidth={2}
                fill="url(#hourFill)"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="ac"
                name="accepted"
                stroke="var(--color-success)"
                strokeWidth={1.5}
                fill="transparent"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState icon={<Clock />} title="No submissions yet" description="Hours light up after your first judged run." className="py-8" />
      )}
    </ChartCard>
  )
}
