import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CircleCheck, Gauge, Layers } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { ChartCard, ChartTooltip } from './ChartCard'
import { AXIS_TICK, PLATFORM_COLORS, TIER_COLORS, VERDICT_COLORS, CHART_PALETTE } from './types'

function DonutCenter({ value, label }: { value: string; label: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="font-display text-2xl text-foreground tabular-nums">{value}</span>
      <span className="text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">{label}</span>
    </div>
  )
}

export function VerdictDonut({
  verdicts,
  accuracy,
}: {
  verdicts: { verdict: string; count: number }[]
  accuracy: number
}) {
  const data = verdicts.filter((v) => v.count > 0)
  return (
    <ChartCard
      icon={<CircleCheck className="size-4 text-success" aria-hidden="true" />}
      title="Verdict breakdown"
      label="Donut chart of submission verdicts"
    >
      {data.length ? (
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="relative h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ChartTooltip />} />
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="verdict"
                  innerRadius="72%"
                  outerRadius="100%"
                  paddingAngle={2}
                  stroke="var(--color-background)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {data.map((v, i) => (
                    <Cell key={v.verdict} fill={VERDICT_COLORS[v.verdict] ?? CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <DonutCenter value={`${accuracy}%`} label="accuracy" />
          </div>
          <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-1">
            {data.map((v, i) => (
              <li key={v.verdict} className="flex items-center gap-2 text-xs">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ background: VERDICT_COLORS[v.verdict] ?? CHART_PALETTE[i % CHART_PALETTE.length] }}
                  aria-hidden="true"
                />
                <span className="flex-1 font-mono font-semibold text-foreground">{v.verdict}</span>
                <span className="font-mono text-foreground-dim tabular-nums">{v.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState icon={<CircleCheck />} title="No verdicts yet" description="Submit code to populate this ring." className="py-8" />
      )}
    </ChartCard>
  )
}

export function RatingDistChart({ data }: { data: { tier: string; count: number }[] }) {
  const rows = data.filter((d) => d.count > 0)
  return (
    <ChartCard
      icon={<Gauge className="size-4 text-info" aria-hidden="true" />}
      title="Difficulty distribution"
      subtitle="Solved problems per rating tier"
      label="Horizontal bar chart of solved problems per rating tier"
    >
      {rows.length ? (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
              <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="tier"
                tick={{ fill: 'var(--color-foreground-dim)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={104}
              />
              <Tooltip cursor={{ fill: 'var(--color-primary)', opacity: 0.06 }} content={<ChartTooltip />} />
              <Bar dataKey="count" name="solved" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {rows.map((r, i) => (
                  <Cell key={r.tier} fill={TIER_COLORS[r.tier] ?? CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState icon={<Gauge />} title="No rated solves yet" description="Tiers appear once you solve rated problems." className="py-8" />
      )}
    </ChartCard>
  )
}

export function PlatformDonut({ data }: { data: { platform: string; count: number }[] }) {
  const rows = data.filter((d) => d.count > 0)
  const total = rows.reduce((s, d) => s + d.count, 0)
  return (
    <ChartCard
      icon={<Layers className="size-4 text-primary-bright" aria-hidden="true" />}
      title="Platform breakdown"
      label="Donut chart of solved problems per platform"
    >
      {rows.length ? (
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="relative h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ChartTooltip />} />
                <Pie
                  data={rows}
                  dataKey="count"
                  nameKey="platform"
                  innerRadius="72%"
                  outerRadius="100%"
                  paddingAngle={2}
                  stroke="var(--color-background)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {rows.map((d, i) => (
                    <Cell key={d.platform} fill={PLATFORM_COLORS[d.platform] ?? CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <DonutCenter value={String(total)} label="solves" />
          </div>
          <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-1">
            {rows.map((d, i) => (
              <li key={d.platform} className="flex items-center gap-2 text-xs">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ background: PLATFORM_COLORS[d.platform] ?? CHART_PALETTE[i % CHART_PALETTE.length] }}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate font-semibold text-foreground capitalize">{d.platform}</span>
                <span className="font-mono text-foreground-dim tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState icon={<Layers />} title="No platform data" description="Solves get attributed here per source platform." className="py-8" />
      )}
    </ChartCard>
  )
}
