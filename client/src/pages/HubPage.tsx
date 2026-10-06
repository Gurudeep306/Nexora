import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Medal,
  RefreshCw,
  Trophy,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Skeleton,
} from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/context/AuthContext'
import { formatNumber } from '@/lib/utils'
import { HomeHero } from '@/components/hub/HomeHero'
import { LaunchGrid } from '@/components/hub/LaunchGrid'
import { ActivityChart } from '@/components/hub/ActivityChart'
import { DailyChallenges } from '@/components/hub/DailyChallenges'
import { RecentSubmissions } from '@/components/hub/RecentSubmissions'
import type { PerformanceResponse, StatsResponse } from '@/components/hub/types'

function HubSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading hub">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <LoadingBlock rows={6} />
    </div>
  )
}

export default function HubPage() {
  const { user, refresh } = useAuth()
  const username = user?.username ?? ''
  const displayName =
    (typeof user?.display_name === 'string' && user.display_name) || username || 'Commander'
  const avatarUrl =
    (typeof user?.avatar_url === 'string' && user.avatar_url) || null

  const statsApi = useApi<StatsResponse>(
    () => api.get<StatsResponse>('/api/stats', { query: { username: username || undefined } }),
    [username],
  )
  const perfApi = useApi<PerformanceResponse>(
    () => api.get<PerformanceResponse>('/api/performance'),
    [],
  )

  const settingsApi = useApi<{ settings: Record<string, string> }>(
    () => api.get<{ settings: Record<string, string> }>('/api/settings'),
    [],
  )
  const dailyGoal = Math.min(Math.max(Number(settingsApi.data?.settings?.daily_goal) || 3, 1), 50)

  const stats = statsApi.data
  const perf = perfApi.data

  const recentSubmissions = useMemo(
    () => (stats?.recent.length ? stats.recent : (perf?.recent ?? [])),
    [stats, perf],
  )

  if (statsApi.loading && !stats) return <HubSkeleton />

  if (statsApi.error && !stats) {
    return (
      <div>
        <PageHeader title="Home" subtitle="Your mission control" />
        <ErrorState message={statsApi.error} onRetry={statsApi.refetch} />
      </div>
    )
  }

  if (!stats) return <HubSkeleton />

  return (
    <div className="space-y-7">
      {/* Who you are, today's goal, and the two main doors */}
      <HomeHero
        displayName={displayName}
        username={username}
        avatar={typeof user?.avatar === 'string' ? user.avatar : null}
        avatarUrl={avatarUrl}
        stats={stats}
        dailyGoal={dailyGoal}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              statsApi.refetch()
              perfApi.refetch()
              void refresh()
            }}
            aria-label="Refresh dashboard"
            className="text-xs"
          >
            <RefreshCw
              className={statsApi.loading || perfApi.loading ? 'animate-spin' : undefined}
              aria-hidden="true"
            />
            Sync
          </Button>
        }
      />

      {/* Every destination, filterable by area */}
      <LaunchGrid />

      {/* Bento dashboard grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {perf ? (
            <ActivityChart streak={stats.streak} weeklyProgress={perf.weeklyProgress ?? []} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="size-4 text-cyan" aria-hidden="true" /> Recent activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          )}
        </div>

        <DailyChallenges challenges={stats.dailyChallenges ?? []} />

        <div className="lg:col-span-2">
          <RecentSubmissions submissions={recentSubmissions} />
        </div>

        <div className="space-y-3">
          <Card>
            <CardContent className="space-y-3 py-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-text-muted">Solves this level</span>
                <span className="font-semibold text-text-primary tabular-nums">
                  {stats.level.probsInLevel} / {stats.level.probsForNext}
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-text-muted">Consistency</span>
                <span className="font-semibold text-text-primary tabular-nums">
                  {perf ? `${perf.consistencyScore}%` : '—'}
                </span>
              </div>
              {perf?.nextLevel && (
                <p className="mb-0 border-t border-border pt-3 text-[13px] text-text-muted">
                  <Trophy className="mr-1.5 inline size-3.5 text-gold" aria-hidden="true" />
                  Next level <span className="font-semibold text-text-primary">{perf.nextLevel.name}</span>:{' '}
                  {formatNumber(perf.nextLevel.xpNeeded)} XP and {perf.nextLevel.probsNeeded} solves
                  {perf.nextLevel.daysEstimate != null && perf.avgDailyXp > 0 && (
                    <> · about {perf.nextLevel.daysEstimate} days at your pace</>
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="mb-0 text-[15px] font-semibold text-text-primary">Ready for today?</p>
                <p className="mt-1 mb-0 text-[13px] text-text-muted">
                  <Medal className="mr-1 inline size-3.5 text-gold" aria-hidden="true" />
                  {stats.todayStats.solved > 0
                    ? `${stats.todayStats.solved} solved today. Keep the streak going.`
                    : 'Nothing solved yet today.'}
                </p>
              </div>
              <Link to="/problems" className="btn-primary shrink-0 !px-3.5 !py-2 !text-[13px] !no-underline">
                Solve one
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
