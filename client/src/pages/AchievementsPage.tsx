import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
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
import { SealCard } from '@/components/achievements/SealCard'
import { useTheme } from '@/context/ThemeContext'
import { isJournalKit } from '@/theme/styles'

interface StatsResponse {
  ok: boolean
  achievements: AchievementRow[]
}

type StatusFilter = 'all' | 'earned' | 'locked'

export default function AchievementsPage() {
  const { username } = useSessionUser()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState('all')
  const journal = isJournalKit(useTheme().shown.style)

  const { data, loading, error, refetch } = useApi(
    () => api.get<StatsResponse>('/api/stats', { query: username ? { username } : undefined }),
    [username],
    { cacheKey: `stats:${username}` },
  )

  const achievements = data?.achievements ?? []
  const earned = achievements.filter((a) => a.unlocked_at)
  const categories = useMemo(() => {
    const set = new Set(achievements.map((a) => a.category))
    return ['all', ...Array.from(set)]
  }, [achievements])
  const filtered = useMemo(() => {
    return achievements.filter((a) => {
      if (status === 'earned' && !a.unlocked_at) return false
      if (status === 'locked' && a.unlocked_at) return false
      if (category !== 'all' && a.category !== category) return false
      return true
    })
  }, [achievements, status, category])

  const earnedXp = useMemo(() => earned.reduce((s, a) => s + a.xp_reward, 0), [earned])
  const inProgress = useMemo(() => achievements.filter((a) => !a.unlocked_at && a.progress > 0).length, [achievements])
  const completion = useMemo(() => achievements.length ? Math.round((earned.length / achievements.length) * 100) : 0, [earned, achievements.length])

  return (
    <div>
      <PageHeader
        icon="achievements"
        eyebrow="The Ledger"
        title="Achievements"
        subtitle={earned.length ? `${earned.length} of ${achievements.length} seals earned. Each one says what it takes.` : 'Seals you earn by solving, keeping streaks and climbing ratings. Each one says what it takes.'}
        actions={
          <Button variant="outline" size="sm" onClick={refetch} aria-label="Refresh achievements">
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        }
      />

      <h2 className="sr-only">Summary</h2>
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Unlocked" value={earned.length} icon="medal" accent="success" sub={`of ${achievements.length} · ${completion}%`} />
        <StatCard label="Trophy XP" value={earnedXp.toLocaleString()} icon="award" accent="accent" sub="earned from achievements" />
        <StatCard label="In Progress" value={inProgress} icon="lock" accent="warning" sub="partially complete" />
        <StatCard
          label="Categories"
          value={categories.length - 1}
          icon="award"
          accent="secondary"
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
              icon="award"
              title="No achievements here"
              description="Try a different filter, or solve something to earn a new one."
            />
          ) : journal ? (
            <div className="ac-groups">
              {groups(filtered).map(([cat, list]) => (
                <section key={cat} aria-labelledby={`ac-${cat}`}>
                  <header className="ac-group-head">
                    <h2 id={`ac-${cat}`} className="ac-group-title">
                      {CATEGORY_LABELS[cat] ?? cat}
                    </h2>
                    <span className="ac-group-count">
                      {list.filter((a) => a.unlocked_at).length} of {list.length} earned
                    </span>
                  </header>
                  <div className="ac-seals">
                    {list.map((a) => (
                      <SealCard key={a.id} a={a} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <>
              <h2 className="sr-only">Achievements</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filtered.map((a, i) => (
                  <AchievementCard key={a.id} achievement={a} index={i} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

/** Achievements grouped by category, earned first inside each group. */
function groups(list: AchievementRow[]): [string, AchievementRow[]][] {
  const by = new Map<string, AchievementRow[]>()
  for (const a of list) by.set(a.category, [...(by.get(a.category) ?? []), a])
  return [...by.entries()].map(([k, v]) => [k, v.slice().sort((x, y) => Number(!!y.unlocked_at) - Number(!!x.unlocked_at))])
}
