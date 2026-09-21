import { useParams } from 'react-router-dom'
import { Crown, Flame, Target, Zap } from 'lucide-react'
import { motion } from 'motion/react'
import {
  ErrorState,
  LoadingBlock,
  PageHeader,
  StatCard,
  Skeleton,
  XpBar,
  Card,
  CardContent,
} from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/context/AuthContext'
import { formatNumber } from '@/lib/utils'
import { ProfileHero } from '@/components/account/ProfileHero'
import { ActivityFeed } from '@/components/account/ActivityFeed'
import { PlatformHandles } from '@/components/account/PlatformHandles'
import { VerdictSplit } from '@/components/account/VerdictSplit'
import type { ProfileResponse, SettingsResponse, StatsForProfile } from '@/components/account/types'

function ProfileSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading profile">
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <LoadingBlock rows={5} />
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const me = user?.username ?? ''
  const { username: param } = useParams()
  const username = param ?? me
  /* /api/stats and /api/settings are global to this install, so they only describe "me" */
  const isSelf = username === me

  const profileApi = useApi<ProfileResponse>(
    () =>
      api.get<ProfileResponse>(`/api/user/profile/${encodeURIComponent(username)}`, {
        query: { viewer: me },
      }),
    [username, me],
    { skip: !username },
  )
  const statsApi = useApi<StatsForProfile>(
    () => api.get<StatsForProfile>('/api/stats', { query: { username } }),
    [username],
    { skip: !username || !isSelf },
  )
  const settingsApi = useApi<SettingsResponse>(() => api.get<SettingsResponse>('/api/settings'), [], { skip: !isSelf })

  if (profileApi.loading && !profileApi.data) {
    return (
      <div>
        <PageHeader title="Player Profile" subtitle={isSelf ? 'Your rank, records and recent conquests' : `@${username}'s rank and records`} />
        <ProfileSkeleton />
      </div>
    )
  }

  if (profileApi.error && !profileApi.data) {
    return (
      <div>
        <PageHeader title="Player Profile" subtitle={isSelf ? 'Your rank, records and recent conquests' : `@${username}'s rank and records`} />
        <ErrorState message={profileApi.error} onRetry={profileApi.refetch} />
      </div>
    )
  }

  const profile = profileApi.data
  if (!profile) return <ProfileSkeleton />

  const stats = statsApi.data
  const level = profile.level
  const streak = stats?.streak ?? { current: profile.streak, best: profile.streak, lastWeek: [] }
  const solved = stats?.solved ?? profile.stats.solved
  const totalXp = stats?.totalXp ?? profile.stats.totalXp

  return (
    <div className="space-y-6">
      <PageHeader
        title="Player Profile"
        subtitle={isSelf ? 'Your rank, records and recent conquests across the rift.' : `@${username} — rank, records and recent conquests.`}
        actions={
          <span className="text-xs text-foreground-faint">
            {stats ? (
              <>
                <span className="font-mono text-foreground tabular-nums">{stats.accuracy}%</span>{' '}
                accuracy ·{' '}
                <span className="font-mono text-foreground tabular-nums">
                  {formatNumber(stats.submissions)}
                </span>{' '}
                runs
              </>
            ) : isSelf ? (
              'Loading records…'
            ) : null}
          </span>
        }
      />

      <ProfileHero profile={profile} viewer={me} onChanged={profileApi.refetch} />

      <motion.div
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <StatCard
          icon={<Zap />}
          label="Total XP"
          value={formatNumber(totalXp)}
          sub={
            <>
              LVL <span className="font-mono tabular-nums">{level.level}</span> · {level.name}
            </>
          }
          accent="primary"
        />
        <StatCard
          icon={<Target />}
          label="Solved"
          value={formatNumber(solved)}
          sub={
            stats ? (
              <>
                of <span className="font-mono tabular-nums">{formatNumber(stats.total)}</span> tracked
              </>
            ) : (
              'Problems conquered'
            )
          }
          accent="success"
        />
        <StatCard
          icon={<Flame />}
          label="Streak"
          value={`${streak.current}d`}
          sub={
            <>
              Best: <span className="font-mono tabular-nums">{streak.best}d</span>
            </>
          }
          accent="warning"
        />
        <StatCard
          icon={<Crown />}
          label="Rank"
          value={
            <span className="text-base leading-8">{stats?.title?.current?.title ?? level.name ?? 'Rift Walker'}</span>
          }
          sub={
            stats?.title?.next ? (
              <>
                Next in <span className="font-mono tabular-nums">{formatNumber(stats.title.xpToNext)}</span> XP
              </>
            ) : (
              'Climb the ladder'
            )
          }
          accent="gold"
        />
      </motion.div>

      <Card>
        <CardContent className="py-4">
          <XpBar
            xp={level.xpInLevel}
            nextLevelXp={level.xpForNext}
            level={level.level}
            levelName={level.name}
          />
          <p className="mt-3 text-xs text-foreground-dim">
            Solves this level:{' '}
            <span className="font-mono text-foreground tabular-nums">
              {level.probsInLevel} / {level.probsForNext}
            </span>
            {level.probGated && (
              <span className="ml-2 text-warning">— solve more problems to rank up</span>
            )}
            {level.xpGated && <span className="ml-2 text-warning">— XP gated</span>}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityFeed activity={profile.activity ?? []} />
        {isSelf && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <PlatformHandles settings={settingsApi.data?.settings ?? {}} />
            <VerdictSplit verdicts={stats?.verdicts ?? []} />
          </div>
        )}
      </div>
    </div>
  )
}
