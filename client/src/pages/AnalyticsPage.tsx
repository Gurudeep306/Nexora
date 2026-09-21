import { Activity, BarChart3, Flame, Percent, RefreshCw, Sparkles, Target, Zap } from 'lucide-react'
import {
  Button,
  ErrorState,
  LoadingBlock,
  PageHeader,
  StatCard,
} from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { useChartColors } from '@/components/analytics/chartTheme'
import {
  DifficultyDistChart,
  HourDistChart,
  LangUsageChart,
  PlatformDonut,
  RatingClimbChart,
  SolveSpeedChart,
  VerdictDonut,
  WeeklyProgressChart,
} from '@/components/analytics/Charts'
import { WeaknessPanel } from '@/components/analytics/WeaknessPanel'
import { BestsPanel, NextLevelCard } from '@/components/analytics/BestsPanel'
import { TagRadar } from '@/components/analytics/SkillCharts'
import { FirstSolvesTimeline } from '@/components/analytics/InsightLists'
import type { PerformanceResponse, WeaknessResponse } from '@/components/analytics/types'

export default function AnalyticsPage() {
  const c = useChartColors()
  const { data, loading, error, refetch } = useApi(
    () =>
      Promise.all([
        api.get<PerformanceResponse>('/api/performance'),
        api.get<WeaknessResponse>('/api/weakness-analysis').catch(() => null),
      ]).then(([perf, weakness]) => ({ perf, weakness })),
    [],
  )

  if (loading) {
    return (
      <div>
        <PageHeader title="Analytics" subtitle="Performance telemetry from the rift" />
        <LoadingBlock rows={8} />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div>
        <PageHeader title="Analytics" subtitle="Performance telemetry from the rift" />
        <ErrorState message={error ?? 'Failed to load analytics'} onRetry={refetch} />
      </div>
    )
  }

  const { perf, weakness } = data
  const hasAnyData = perf.submissions > 0 || perf.solved > 0

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Solve telemetry, weakness intel, and personal records — the observatory has full sight on your grind."
        actions={
          <Button variant="outline" size="sm" onClick={refetch} aria-label="Refresh analytics">
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        }
      />

      {!hasAnyData && (
        <div className="mb-4 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-foreground-dim">
          No judged activity yet — head to the problems list and solve something to power these charts.
        </div>
      )}

      {/* headline stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Solved" value={formatNumber(perf.solved)} icon={<Target />} sub={`${formatNumber(perf.total)} in library`} />
        <StatCard label="Total XP" value={formatNumber(perf.totalXp)} icon={<Zap />} accent="gold" sub={`LVL ${perf.level.level} ${perf.level.name}`} />
        <StatCard label="Accuracy" value={`${perf.accuracy}%`} icon={<Percent />} accent="success" sub={`${formatNumber(perf.submissions)} submissions`} />
        <StatCard
          label="Streak"
          value={`${perf.streak.current}d`}
          icon={<Flame />}
          accent="warning"
          sub={`best ${perf.streak.best}d`}
        />
        <StatCard
          label="Consistency"
          value={`${Math.min(100, Math.round(perf.consistencyScore))}%`}
          icon={<Activity />}
          accent="cyan"
          sub="last 30 days"
        />
        <StatCard
          label="Daily Pace"
          value={formatNumber(Math.round(perf.avgDailyXp))}
          icon={<BarChart3 />}
          accent="accent"
          sub={`XP/day · ${perf.avgDailySolves.toFixed(1)} solves/day`}
        />
      </div>

      {/* main charts */}
      <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <RatingClimbChart data={perf.ratingClimb} c={c} />
        <NextLevelCard perf={perf} />
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <WeeklyProgressChart data={perf.weeklyProgress} c={c} />
        <DifficultyDistChart data={perf.ratingDist} c={c} />
        <SolveSpeedChart data={perf.solveSpeed} c={c} />
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PlatformDonut data={perf.platformDist} c={c} />
        <VerdictDonut data={perf.verdicts} c={c} />
        <LangUsageChart data={perf.langUsage} c={c} />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <HourDistChart data={perf.hourDist} c={c} />
        <div className="flex flex-col">
          <div className="card-neon flex h-full flex-col">
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-display text-sm tracking-wider text-foreground uppercase">
                Today&apos;s Session
              </h3>
            </div>
            <div className="grid flex-1 grid-cols-3 gap-3 px-5 py-5 text-center">
              <div>
                <p className="font-display text-3xl text-success tabular-nums">{perf.todayStats.solved}</p>
                <p className="mt-1 text-[10px] tracking-wider text-foreground-faint uppercase">Solved</p>
              </div>
              <div>
                <p className="font-display text-3xl text-warning tabular-nums">{perf.todayStats.attempted}</p>
                <p className="mt-1 text-[10px] tracking-wider text-foreground-faint uppercase">Attempted</p>
              </div>
              <div>
                <p className="font-display text-3xl text-primary-bright tabular-nums">{formatNumber(perf.todayStats.xp)}</p>
                <p className="mt-1 text-[10px] tracking-wider text-foreground-faint uppercase">XP Earned</p>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-foreground-dim">
              <Sparkles className="size-3.5 text-gold" aria-hidden="true" />
              {perf.streak.lastWeek.reduce((s, d) => s + d.solved, 0)} solves in the last 7 days
            </div>
          </div>
        </div>
      </div>

      {/* tag mastery + first-blood timeline */}
      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <TagRadar data={perf.tagAnalysis} />
        <FirstSolvesTimeline firstSolves={perf.firstSolves} />
      </div>

      {/* weakness intel */}
      <h2 className="mb-3 font-display text-lg tracking-wide text-foreground glow-text">Weakness Analysis</h2>
      <div className="mb-4">
        {weakness ? (
          <WeaknessPanel data={weakness} />
        ) : (
          <div className="card-neon px-5 py-4 text-xs text-foreground-dim">
            Weakness intel unavailable right now.
          </div>
        )}
      </div>

      {/* personal bests */}
      <h2 className="mb-3 font-display text-lg tracking-wide text-foreground glow-text">Personal Bests</h2>
      <BestsPanel perf={perf} />
    </div>
  )
}
