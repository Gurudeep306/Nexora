import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { ChartCard, ChartTooltip } from './ChartCard'
import { AXIS_TICK } from './types'
import type { RatingClimbPoint } from './types'

export function RatingClimbChart({ data }: { data: RatingClimbPoint[] }) {
  const points = useMemo(() => {
    let peak = 0
    return data.map((d, i) => {
      peak = Math.max(peak, d.rating)
      return { i, rating: d.rating, peak, date: d.date.slice(0, 10) }
    })
  }, [data])

  const delta = points.length >= 2 ? points[points.length - 1].rating - points[0].rating : 0

  return (
    <ChartCard
      className="lg:col-span-2"
      icon={<TrendingUp className="size-4 text-accent" aria-hidden="true" />}
      title="Rating climb"
      subtitle={
        points.length >= 2
          ? `${points.length} solves plotted · ${delta >= 0 ? '+' : ''}${delta} from first to latest · dashed line = personal peak`
          : 'Difficulty of every solved problem over time'
      }
      label="Line chart of solved problem rating over time"
    >
      {points.length >= 2 ? (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="climbFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={AXIS_TICK}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={['dataMin - 100', 'dataMax + 100']}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                y={points[points.length - 1].peak}
                stroke="var(--color-gold)"
                strokeDasharray="5 3"
                label={{ value: 'peak', fill: 'var(--color-gold)', fontSize: 10, position: 'insideTopRight' }}
              />
              <Area
                type="stepAfter"
                dataKey="rating"
                name="rating"
                stroke="var(--color-accent)"
                strokeWidth={2}
                fill="url(#climbFill)"
                dot={false}
                activeDot={{ r: 4, fill: 'var(--color-accent)', stroke: 'var(--color-background)' }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState
          icon={<TrendingUp />}
          title="Not enough data"
          description="Solve at least two problems to see your rating climb."
          className="py-8"
        />
      )}
    </ChartCard>
  )
}
