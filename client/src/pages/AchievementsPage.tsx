import { useMemo, useState } from 'react'
import { Award, Lock, Medal, RefreshCw } from 'lucide-react'
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  StatCard,
  Tabs,
} from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useSessionUser } from '@/components/profile/useSessionUser'
import { AchievementCard } from '@/components/achievements/AchievementCard'
import { CATEGORY_LABELS, type AchievementRow } from '@/components/achievements/achievementMeta'

interface StatsResponse {
  ok: boolean
  achievements: AchievementRow[]
}

type StatusFilter = 'all' | 'earned' | 'locked'

export default function AchievementsPage() {
  const { username } = useSessionUser()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState('all')

  const { data, loading, error, refetch } = useApi(
    () => api.get<StatsResponse>('/api/stats', { query: username ? { username } : undefined }),
    [username],
  )

  const achievements = data?.achievements ?? []
  const earned = useMemo(() => achievements.filter((a) => a.unlocked_at), [achievements])

  const categories = useMemo(() => {
    const set = new Set(achievements.map((a) => a.category))
    return ['all', ...Array.from(set)]
  }, [achievements])

  const filtered = useMemo(
    () =>
      achievements.filter((a) => {
        if (status === 'earned' && !a.unlocked_at) return false
        if (status === 'locked' && a.unlocked_at) return false
        if (category !== 'all' && a.category !== category) return false
        return true
      }),
    [achievements, status, category],
  )

  const earnedXp = earned.reduce((s, a) => s + a.xp_reward, 0)
  const inProgress = achievements.filter((a) => !a.unlocked_at && a.progress > 0).length
  const completion = achievements.length ? Math.round((earned.length / achievements.length) * 100) : 0

  return (
    <div>
      <PageHeader
        title="Achievements"
        subtitle="Trophies from the rift — earned glow, locked stay in the shadows until you unlock them."
        actions={
          <Button variant="outline" size="sm" onClick={refetch} aria-label="Refresh achievements">
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Unlocked" value={earned.length} icon={<Medal />} accent="gold" sub={`of ${achievements.length} · ${completion}%`} />
        <StatCard label="Trophy XP" value={earnedXp.toLocaleString()} icon={<Award />} sub="earned from achievements" />
        <StatCard label="In Progress" value={inProgress} icon={<Lock />} accent="cyan" sub="partially complete" />
        <StatCard
          label="Categories"
          value={categories.length - 1}
          icon={<Award />}
          accent="accent"
          sub="milestones, streaks, rating…"
        />
      </div>

      {loading ? (
        <LoadingBlock rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Tabs
              variant="pills"
              items={[
                { id: 'all', label: 'All', badge: achievements.length },
                { id: 'earned', label: 'Earned', badge: earned.length },
                { id: 'locked', label: 'Locked', badge: achievements.length - earned.length },
              ]}
              active={status}
              onChange={(id) => setStatus(id as StatusFilter)}
            />
            <Tabs
              variant="pills"
              items={categories.map((c) => ({
                id: c,
                label: c === 'all' ? 'Every tree' : (CATEGORY_LABELS[c] ?? c),
              }))}
              active={category}
              onChange={setCategory}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Award />}
              title="No achievements here"
              description="Try a different filter — or go solve something to forge new trophies."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((a, i) => (
                <AchievementCard key={a.id} achievement={a} index={i} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
