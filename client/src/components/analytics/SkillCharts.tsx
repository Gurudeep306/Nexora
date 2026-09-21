import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Code2, Radar as RadarIcon } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { ChartCard, ChartTooltip } from './ChartCard'
import { AXIS_TICK } from './types'
import type { LangUsageRow, TagAnalysisRow } from './types'

export function LanguageChart({ data }: { data: LangUsageRow[] }) {
  const rows = data.filter((d) => d.count > 0)
  return (
    <ChartCard
      icon={<Code2 className="size-4 text-cyan" aria-hidden="true" />}
      title="Language arsenal"
      subtitle="Submissions vs accepted per language"
      label="Bar chart of submissions and accepted counts per language"
    >
      {rows.length ? (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: -22 }} barGap={2}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="language" tick={AXIS_TICK} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
              <Tooltip cursor={{ fill: 'var(--color-primary)', opacity: 0.08 }} content={<ChartTooltip />} />
              <Bar dataKey="count" name="submissions" fill="var(--color-primary)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="acCount" name="accepted" fill="var(--color-success)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState icon={<Code2 />} title="No language data" description="Run or submit code to log your first language." className="py-8" />
      )}
    </ChartCard>
  )
}

export function TagRadar({ data }: { data: TagAnalysisRow[] }) {
  const rows = useMemo(
    () =>
      [...data]
        .filter((d) => d.attempted > 0 || d.solved > 0)
        .sort((a, b) => b.solved - a.solved || b.attempted - a.attempted)
        .slice(0, 8)
        .map((d) => ({ tag: d.tag, solveRate: d.solveRate, solved: d.solved })),
    [data],
  )

  return (
    <ChartCard
      icon={<RadarIcon className="size-4 text-accent" aria-hidden="true" />}
      title="Skill radar"
      subtitle="Solve rate across your most-tackled tags"
      label="Radar chart of solve rate per topic tag"
    >
      {rows.length >= 3 ? (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={rows} outerRadius="72%">
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis dataKey="tag" tick={{ fill: 'var(--color-foreground-dim)', fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              <Radar
                name="solve rate %"
                dataKey="solveRate"
                stroke="var(--color-accent)"
                fill="var(--color-accent)"
                fillOpacity={0.22}
                isAnimationActive={false}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState
          icon={<RadarIcon />}
          title="Radar needs more signal"
          description="Attempt problems across at least three tags to plot the radar."
          className="py-8"
        />
      )}
    </ChartCard>
  )
}
