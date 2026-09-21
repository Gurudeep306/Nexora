import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/components/ui'
import type { ChartColors } from './chartTheme'
import { seriesPalette } from './chartTheme'

/* ── shared tooltip ── */

interface TipEntry {
  name?: string
  value?: number | string
  color?: string
  payload?: Record<string, unknown>
}
interface TipProps {
  active?: boolean
  payload?: TipEntry[]
  label?: string | number
  formatterLabel?: (label: string | number) => string
}

function NeonTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border-glow bg-surface px-3 py-2 text-xs shadow-lg glow-box">
      {label != null && <p className="mb-1 font-display tracking-wider text-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-foreground-dim">
          <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
          <span className="capitalize">{p.name}</span>
          <span className="ml-auto font-mono font-semibold text-foreground tabular-nums">
            {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

const tooltipStyle = { content: <NeonTooltip /> } as const

/* ── frame ── */

export function ChartFrame({
  title,
  sub,
  empty,
  children,
  height = 260,
}: {
  title: string
  sub?: string
  empty?: boolean
  emptyText?: string
  children: ReactNode
  height?: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {sub && <p className="text-xs text-foreground-faint">{sub}</p>}
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyState title="No data yet" description="Solve problems to light up this chart." className="py-6" />
        ) : (
          <div style={{ height }} className="w-full">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function axisProps(c: ChartColors) {
  return {
    stroke: c.border,
    tick: { fill: c.faint, fontSize: 11, fontFamily: 'var(--font-mono)' },
    tickLine: false as const,
    axisLine: false as const,
  }
}

/* ── rating climb ── */

export function RatingClimbChart({ data, c }: { data: { rating: number; date: string }[]; c: ChartColors }) {
  const pts = data.map((d) => ({ ...d, day: d.date.slice(5, 10) }))
  return (
    <ChartFrame title="Rating Climb" sub="Highest solved rating over time" empty={pts.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pts} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
          <defs>
            <linearGradient id="climbFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.cyan} stopOpacity={0.45} />
              <stop offset="100%" stopColor={c.cyan} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" {...axisProps(c)} minTickGap={40} />
          <YAxis {...axisProps(c)} domain={['dataMin - 100', 'dataMax + 100']} width={54} />
          <Tooltip {...tooltipStyle} />
          <Area
            type="monotone"
            dataKey="rating"
            name="rating"
            stroke={c.cyan}
            strokeWidth={2}
            fill="url(#climbFill)"
            dot={false}
            activeDot={{ r: 4, fill: c.cyan, stroke: c.background }}
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ── weekly progress ── */

export function WeeklyProgressChart({
  data,
  c,
}: {
  data: { week: string; solved: number; xp: number; activeDays: number }[]
  c: ChartColors
}) {
  return (
    <ChartFrame title="Weekly Momentum" sub="Solves & XP per week (last 12 weeks)" empty={data.length === 0} height={230}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(-12)} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" {...axisProps(c)} minTickGap={20} />
          <YAxis {...axisProps(c)} width={50} />
          <Tooltip {...tooltipStyle} cursor={{ fill: `${c.primary}18` }} />
          <Bar dataKey="solved" name="solved" fill={c.bright} radius={[4, 4, 0, 0]} animationDuration={500} />
          <Bar dataKey="xp" name="xp" fill={c.primary} radius={[4, 4, 0, 0]} animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ── difficulty distribution ── */

const TIER_COLORS = (c: ChartColors): Record<string, string> => ({
  Newbie: c.dim,
  Pupil: c.success,
  Specialist: c.cyan,
  Expert: c.info,
  'Candidate Master': c.bright,
  Master: c.warning,
  Grandmaster: c.accent,
})

export function DifficultyDistChart({ data, c }: { data: { tier: string; count: number }[]; c: ChartColors }) {
  const tierColors = TIER_COLORS(c)
  return (
    <ChartFrame title="Difficulty Distribution" sub="Solved problems by rating tier" empty={data.length === 0} height={230}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="tier" {...axisProps(c)} interval={0} angle={-18} textAnchor="end" height={46} />
          <YAxis {...axisProps(c)} allowDecimals={false} width={44} />
          <Tooltip {...tooltipStyle} cursor={{ fill: `${c.primary}18` }} />
          <Bar dataKey="count" name="solved" radius={[4, 4, 0, 0]} animationDuration={500}>
            {data.map((d) => (
              <Cell key={d.tier} fill={tierColors[d.tier] ?? c.bright} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ── platform donut ── */

export function PlatformDonut({ data, c }: { data: { platform: string; count: number }[]; c: ChartColors }) {
  const palette = seriesPalette(c)
  return (
    <ChartFrame title="Platform Breakdown" sub="Solves per judge platform" empty={data.length === 0} height={230}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="platform"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={3}
            stroke={c.background}
            animationDuration={500}
          >
            {data.map((d, i) => (
              <Cell key={d.platform} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: c.dim, fontFamily: 'var(--font-body)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ── verdict donut ── */

export function VerdictDonut({ data, c }: { data: { verdict: string; count: number }[]; c: ChartColors }) {
  const vc: Record<string, string> = {
    AC: c.success,
    WA: c.accent,
    TLE: c.warning,
    RE: c.info,
    CE: c.dim,
    OK: c.success,
  }
  return (
    <ChartFrame title="Verdict Spread" sub="Every submission ever judged" empty={data.length === 0} height={230}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="verdict"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={3}
            stroke={c.background}
            animationDuration={500}
          >
            {data.map((d) => (
              <Cell key={d.verdict} fill={vc[d.verdict] ?? c.bright} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: c.dim, fontFamily: 'var(--font-body)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ── language usage ── */

export function LangUsageChart({
  data,
  c,
}: {
  data: { language: string; count: number; acCount: number }[]
  c: ChartColors
}) {
  return (
    <ChartFrame title="Language Arsenal" sub="Submissions vs accepted per language" empty={data.length === 0} height={230}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
          <CartesianGrid stroke={c.border} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" {...axisProps(c)} allowDecimals={false} />
          <YAxis type="category" dataKey="language" {...axisProps(c)} width={80} />
          <Tooltip {...tooltipStyle} cursor={{ fill: `${c.primary}14` }} />
          <Bar dataKey="count" name="submissions" fill={c.primary} radius={[0, 4, 4, 0]} animationDuration={500} />
          <Bar dataKey="acCount" name="accepted" fill={c.cyan} radius={[0, 4, 4, 0]} animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ── hour distribution ── */

export function HourDistChart({ data, c }: { data: { hour: number; total: number; ac: number }[]; c: ChartColors }) {
  const pts = data.map((d) => ({ ...d, label: `${String(d.hour).padStart(2, '0')}:00` }))
  return (
    <ChartFrame title="Grind Hours" sub="When you submit (server local time)" empty={data.length === 0} height={230}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pts} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="hourFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.bright} stopOpacity={0.4} />
              <stop offset="100%" stopColor={c.bright} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" {...axisProps(c)} minTickGap={28} />
          <YAxis {...axisProps(c)} allowDecimals={false} width={40} />
          <Tooltip {...tooltipStyle} />
          <Area type="monotone" dataKey="total" name="submissions" stroke={c.bright} strokeWidth={2} fill="url(#hourFill)" animationDuration={500} />
          <Area type="monotone" dataKey="ac" name="accepted" stroke={c.success} strokeWidth={1.5} fill="transparent" animationDuration={500} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* ── solve speed ── */

export function SolveSpeedChart({
  data,
  c,
}: {
  data: { bracket: string; avgAttempts: number; count: number; avgMinutes: number }[]
  c: ChartColors
}) {
  return (
    <ChartFrame
      title="Solve Speed"
      sub="Average attempts & time per rating bracket"
      empty={data.length === 0}
      height={230}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="bracket" {...axisProps(c)} interval={0} angle={-24} textAnchor="end" height={52} fontSize={10} />
          <YAxis {...axisProps(c)} width={40} />
          <Tooltip {...tooltipStyle} cursor={{ fill: `${c.primary}18` }} />
          <Bar dataKey="avgAttempts" name="avg attempts" fill={c.accent} radius={[4, 4, 0, 0]} animationDuration={500} />
          <Bar dataKey="avgMinutes" name="avg minutes" fill={c.info} radius={[4, 4, 0, 0]} animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
