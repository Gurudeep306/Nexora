/* Lazy wrappers: the chart library loads on first use, with a fixed-height placeholder (no layout shift). */
import { lazy, Suspense, type ComponentProps, type ReactNode } from 'react'
import { Skeleton } from '@/components/ui'

const load = () => import('./charts')
const TrendChartsImpl = lazy(() => load().then((m) => ({ default: m.TrendCharts })))
const YearBarsImpl = lazy(() => load().then((m) => ({ default: m.YearBars })))
const TimeAccuracyScatterImpl = lazy(() => load().then((m) => ({ default: m.TimeAccuracyScatter })))
const MarksDivergingImpl = lazy(() => load().then((m) => ({ default: m.MarksDiverging })))
const ScoreHistoryImpl = lazy(() => load().then((m) => ({ default: m.ScoreHistory })))
const WeightLineImpl = lazy(() => load().then((m) => ({ default: m.WeightLine })))

function Box({ height, children }: { height: string; children: ReactNode }) {
  return <Suspense fallback={<Skeleton className={`w-full rounded-lg ${height}`} />}>{children}</Suspense>
}

export function TrendCharts(p: ComponentProps<typeof TrendChartsImpl>) {
  return (
    <Box height="h-[300px]">
      <TrendChartsImpl {...p} />
    </Box>
  )
}
export function YearBars(p: ComponentProps<typeof YearBarsImpl>) {
  return (
    <Box height="h-56">
      <YearBarsImpl {...p} />
    </Box>
  )
}
export function TimeAccuracyScatter(p: ComponentProps<typeof TimeAccuracyScatterImpl>) {
  return (
    <Box height="h-72">
      <TimeAccuracyScatterImpl {...p} />
    </Box>
  )
}
export function MarksDiverging(p: ComponentProps<typeof MarksDivergingImpl>) {
  return (
    <Box height="h-64">
      <MarksDivergingImpl {...p} />
    </Box>
  )
}
export function ScoreHistory(p: ComponentProps<typeof ScoreHistoryImpl>) {
  return (
    <Box height="h-56">
      <ScoreHistoryImpl {...p} />
    </Box>
  )
}
export function WeightLine(p: ComponentProps<typeof WeightLineImpl>) {
  return (
    <Box height="h-48">
      <WeightLineImpl {...p} />
    </Box>
  )
}
export type { TrendPoint, ScatterPoint } from './charts'
