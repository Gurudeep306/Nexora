/*
  Recharts-based GATE charts. Loaded lazily through ./LazyCharts so the chart
  library never blocks first paint. One y-axis per chart, thin marks, token
  colours, recessive grid, a tooltip on every chart.
*/
import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { useGateChartColors } from './chartColors'

const AXIS = { fontSize: 11, tickLine: false, axisLine: false } as const

interface TipRow {
  label: string
  value: ReactNode
  color?: string
}

function Tip({ title, rows }: { title?: ReactNode; rows: TipRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface-1 px-3 py-2 text-[12px] shadow-lg">
      {title != null && <p className="mb-1 font-semibold text-text-primary">{title}</p>}
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-1.5 tabular-nums">
          {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
          <span className="text-text-muted">{r.label}</span>
          <span className="ml-auto pl-3 font-medium text-text-primary">{r.value}</span>
        </p>
      ))}
    </div>
  )
}

/* ── Activity trend: attempts (bars) above accuracy (line), shared x ──── */

export interface TrendPoint {
  label: string
  attempts: number
  /** 0..100 or null when no graded attempts in the bucket. */
  accuracy: number | null
}

export function TrendCharts({ data }: { data: TrendPoint[] }) {
  const c = useGateChartColors()
  const tip = ({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) => {
    const p = payload?.[0]?.payload as TrendPoint | undefined
    return active && p ? (
      <Tip
        title={p.label}
        rows={[
          { label: 'Attempts', value: p.attempts, color: c.accent },
          { label: 'Accuracy', value: p.accuracy == null ? '—' : `${p.accuracy}%`, color: c.good },
        ]}
      />
    ) : null
  }
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-text-muted">Attempts</p>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke={c.grid} strokeOpacity={0.5} />
            <XAxis dataKey="label" hide />
            <YAxis {...AXIS} tick={{ fill: c.axis }} allowDecimals={false} width={44} />
            <Tooltip content={tip} cursor={{ fill: c.grid, fillOpacity: 0.35 }} />
            <Bar dataKey="attempts" fill={c.accent} radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="pt-2 text-[11px] font-medium text-text-muted">Accuracy</p>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke={c.grid} strokeOpacity={0.5} />
            <XAxis dataKey="label" {...AXIS} tick={{ fill: c.axis }} minTickGap={24} />
            <YAxis {...AXIS} tick={{ fill: c.axis }} domain={[0, 100]} ticks={[0, 50, 100]} unit="%" width={44} />
            <Tooltip content={tip} cursor={{ stroke: c.axis, strokeDasharray: '3 3' }} />
            <Line type="monotone" dataKey="accuracy" stroke={c.good} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: c.surface, strokeWidth: 2 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ── Accuracy by year (columns) ─────────────────────────────────────── */

export function YearBars({ data }: { data: { year: number; attempted: number; accuracy: number }[] }) {
  const c = useGateChartColors()
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke={c.grid} strokeOpacity={0.5} />
          <XAxis dataKey="year" {...AXIS} tick={{ fill: c.axis }} minTickGap={8} />
          <YAxis {...AXIS} tick={{ fill: c.axis }} domain={[0, 100]} unit="%" width={44} />
          <Tooltip
            cursor={{ fill: c.grid, fillOpacity: 0.35 }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as { year: number; attempted: number; accuracy: number } | undefined
              return active && p ? (
                <Tip title={`GATE ${p.year}`} rows={[{ label: 'Accuracy', value: `${p.accuracy}%` }, { label: 'Attempted', value: p.attempted }]} />
              ) : null
            }}
          />
          <Bar dataKey="accuracy" fill={c.accent} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Time per question vs accuracy (topic scatter) ──────────────────── */

export interface ScatterPoint {
  name: string
  subject: string
  time: number
  accuracy: number
  attempted: number
}

export function TimeAccuracyScatter({ data, avgTime }: { data: ScatterPoint[]; avgTime: number }) {
  const c = useGateChartColors()
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 16, left: -12 }}>
          <CartesianGrid stroke={c.grid} strokeOpacity={0.5} />
          <XAxis
            type="number"
            dataKey="time"
            name="Avg time"
            unit="s"
            {...AXIS}
            tick={{ fill: c.axis }}
            label={{ value: 'Avg time per question (s)', position: 'insideBottom', offset: -10, fill: c.axis, fontSize: 11 }}
          />
          <YAxis type="number" dataKey="accuracy" name="Accuracy" unit="%" domain={[0, 100]} {...AXIS} tick={{ fill: c.axis }} width={48} />
          <ZAxis type="number" dataKey="attempted" range={[40, 360]} />
          <ReferenceLine y={50} stroke={c.axis} strokeDasharray="3 3" strokeOpacity={0.6} />
          {avgTime > 0 && <ReferenceLine x={avgTime} stroke={c.axis} strokeDasharray="3 3" strokeOpacity={0.6} />}
          <Tooltip
            cursor={{ strokeDasharray: '3 3', stroke: c.axis }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as ScatterPoint | undefined
              return active && p ? (
                <Tip
                  title={p.name}
                  rows={[
                    { label: 'Subject', value: p.subject },
                    { label: 'Accuracy', value: `${p.accuracy}%` },
                    { label: 'Avg time', value: `${p.time}s` },
                    { label: 'Attempted', value: p.attempted },
                  ]}
                />
              ) : null
            }}
          />
          <Scatter data={data} fill={c.accent} fillOpacity={0.7} stroke={c.surface} strokeWidth={1.5} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Marks gained vs lost (diverging bars per subject) ───────────────── */

export function MarksDiverging({ data }: { data: { name: string; gained: number; lost: number }[] }) {
  const c = useGateChartColors()
  const rows = data.map((d) => ({ ...d, lostNeg: -Math.abs(d.lost) }))
  return (
    <div style={{ height: Math.max(160, rows.length * 30 + 30) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" stackOffset="sign" margin={{ top: 4, right: 12, bottom: 0, left: 0 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke={c.grid} strokeOpacity={0.5} />
          <XAxis type="number" {...AXIS} tick={{ fill: c.axis }} />
          <YAxis type="category" dataKey="name" {...AXIS} tick={{ fill: c.axis }} width={104} />
          <ReferenceLine x={0} stroke={c.axis} />
          <Tooltip
            cursor={{ fill: c.grid, fillOpacity: 0.35 }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as { name: string; gained: number; lost: number } | undefined
              return active && p ? (
                <Tip
                  title={p.name}
                  rows={[
                    { label: 'Gained', value: `+${p.gained.toFixed(2)}`, color: c.good },
                    { label: 'Lost to negatives', value: `−${Math.abs(p.lost).toFixed(2)}`, color: c.bad },
                    { label: 'Net', value: (p.gained - Math.abs(p.lost)).toFixed(2) },
                  ]}
                />
              ) : null
            }}
          />
          <Bar dataKey="gained" stackId="m" fill={c.good} radius={[0, 4, 4, 0]} maxBarSize={14} />
          <Bar dataKey="lostNeg" stackId="m" fill={c.bad} radius={[4, 0, 0, 4]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Test score history ─────────────────────────────────────────────── */

export function ScoreHistory({ data }: { data: { label: string; title: string; pct: number; score: number; max: number }[] }) {
  const c = useGateChartColors()
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke={c.grid} strokeOpacity={0.5} />
          <XAxis dataKey="label" {...AXIS} tick={{ fill: c.axis }} minTickGap={16} />
          <YAxis {...AXIS} tick={{ fill: c.axis }} domain={[0, 100]} unit="%" width={44} />
          <Tooltip
            cursor={{ stroke: c.axis, strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as { title: string; pct: number; score: number; max: number; label: string } | undefined
              return active && p ? (
                <Tip title={p.title} rows={[{ label: 'Score', value: `${p.score.toFixed(2)} / ${p.max}` }, { label: 'Percent', value: `${p.pct}%` }, { label: 'Date', value: p.label }]} />
              ) : null
            }}
          />
          <Line type="monotone" dataKey="pct" stroke={c.accent} strokeWidth={2} dot={{ r: 3.5, fill: c.accent, stroke: c.surface, strokeWidth: 2 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── One subject's marks across the years ───────────────────────────── */

export function WeightLine({ data, name }: { data: { year: number; marks: number }[]; name: string }) {
  const c = useGateChartColors()
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke={c.grid} strokeOpacity={0.5} />
          <XAxis dataKey="year" {...AXIS} tick={{ fill: c.axis }} minTickGap={8} />
          <YAxis {...AXIS} tick={{ fill: c.axis }} width={44} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: c.grid, fillOpacity: 0.35 }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as { year: number; marks: number } | undefined
              return active && p ? <Tip title={`${name} · ${p.year}`} rows={[{ label: 'Marks', value: p.marks.toFixed(1) }]} /> : null
            }}
          />
          <Bar dataKey="marks" radius={[4, 4, 0, 0]} maxBarSize={20}>
            {data.map((d, i) => (
              <Cell key={d.year} fill={c.accent} fillOpacity={i === data.length - 1 ? 1 : 0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
