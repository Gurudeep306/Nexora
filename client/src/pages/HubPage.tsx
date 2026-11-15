import { useMemo, useState } from 'react'
import { ErrorState, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/context/AuthContext'
import type { StatsResponse } from '@/components/hub/types'
import type { PlatformContest } from '@/components/contests/types'
import { useNexusWeb, progressOf } from '@/components/nexus/SubjectsHub'
import { useProgress } from '@/learn/progress'
import { DSA_TOPICS } from '@/learn/content/dsa/syllabus'
import { FieldNotes, Ledger, Masthead, ResetsIn, Rooms, Spread, Week, type Room, type TodayRow } from '@/components/today/Today'
import { findContinue, nextSteps, until } from '@/components/today/today-data'

/*
 * Home — "Today". The front page of a field journal on the day you open it:
 * what to do next, and how you are doing, in five seconds.
 *
 *   1. Masthead      date and streak, a greeting, the best next step (clay)
 *   2. The spread    Continue (with a live figure) · Today's three
 *   3. Your ledger   four figures with 30-day sparklines, the level ladder
 *   4. This week     seven small day columns, one sentence
 *   5. The rooms     six cards that reach every page
 *   6. Field notes   recent solves and pages read
 *
 * Every sentence comes from real data (components/today/today-data.ts).
 */

function HomeSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading your home page">
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-14 w-full max-w-xl" />
      <Skeleton className="h-80 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function HubPage() {
  const { user, refresh } = useAuth()
  const username = user?.username ?? ''
  const fullName = (typeof user?.display_name === 'string' && user.display_name) || username || 'there'
  const name = fullName.split(/\s+/)[0]

  // Stamped with the time it arrived, so the masthead can say how fresh it is.
  const statsApi = useApi<StatsResponse & { fetchedAt?: number }>(() => api.get<StatsResponse>('/api/stats', { query: { username: username || undefined } }).then((r) => ({ ...r, fetchedAt: Date.now() })), [username], {
    cacheKey: `stats:${username}`,
  })
  const reviewApi = useApi<{ dueCount: number }>(() => api.get('/api/gate/me/review', { query: { limit: 1 } }), [], { cacheKey: 'gate:me:review:count' })
  const dailyApi = useApi<{ questionId: string; solvedToday?: boolean }>(() => api.get('/api/gate/daily'), [], { cacheKey: 'gate:daily' })
  const planApi = useApi<{ plan: { examDate?: string | null } | null }>(() => api.get('/api/gate/me/plan'), [], { cacheKey: 'gate:me:plan' })
  const accountsApi = useApi<{ accounts: { platform: string; verified: boolean }[]; judges: { id: string }[] }>(() => api.get('/api/accounts'), [], {
    cacheKey: 'accounts',
  })
  const settingsApi = useApi<{ settings: Record<string, string> }>(() => api.get('/api/settings'), [], { cacheKey: 'settings' })
  const dailyGoal = Math.min(Math.max(Number(settingsApi.data?.settings?.daily_goal) || 3, 1), 50)
  const contestsApi = useApi<{ contests: PlatformContest[] }>(() => api.get('/api/contests', { timeoutMs: 60000 }), [], { cacheKey: 'contests' })
  const { clusters } = useNexusWeb()
  const { items } = useProgress()

  // When the numbers on the page were last fetched.
  const stats = statsApi.data
  const [now] = useState(() => Date.now())
  const updatedAt = stats?.fetchedAt ?? null

  const cont = useMemo(() => findContinue(items, clusters), [items, clusters])
  const reviewDue = reviewApi.data?.dueCount ?? 0
  const steps = useMemo(() => nextSteps({ cont, stats: stats ?? null, reviewDue, gateDaily: dailyApi.data ?? null }), [cont, stats, reviewDue, dailyApi.data])

  if (statsApi.loading && !stats) return <HomeSkeleton />
  if (statsApi.error && !stats) {
    return (
      <div>
        <h1 className="ed-title m-0">Today</h1>
        <ErrorState message={statsApi.error} onRetry={statsApi.refetch} />
      </div>
    )
  }
  if (!stats) return <HomeSkeleton />

  // Today's three.
  const challenge = stats.dailyChallenges?.find((c) => !c.completed) ?? stats.dailyChallenges?.[0]
  const rows: TodayRow[] = [
    challenge
      ? {
          key: 'challenge',
          line: challenge.completed ? `Today’s challenge, ${challenge.title}, is done.` : `Solve today’s challenge, ${challenge.title}.`,
          meta: challenge.completed ? `+${challenge.bonus_xp} XP` : <><ResetsIn /> · +{challenge.bonus_xp} XP</>,
          to: `/solve/${challenge.problem_rowid}`,
          done: !!challenge.completed,
        }
      : { key: 'challenge', line: 'Pick any problem and let the judge check it.', to: '/problems' },
    {
      key: 'gate',
      line: dailyApi.data?.solvedToday ? 'You answered the GATE question of the day.' : 'Answer the GATE question of the day.',
      meta: dailyApi.data?.solvedToday ? undefined : <ResetsIn />,
      to: '/gate/daily',
      done: !!dailyApi.data?.solvedToday,
    },
    {
      key: 'review',
      line: reviewDue > 0 ? `${reviewDue} ${reviewDue === 1 ? 'card is' : 'cards are'} due in your review queue.` : 'Your review queue is clear.',
      meta: reviewDue > 0 ? 'spaced repetition · GATE' : undefined,
      to: '/gate/review',
      done: reviewDue === 0,
    },
  ]

  // The rooms, each with one live line.
  const nextContest = (contestsApi.data?.contests ?? [])
    .filter((c) => c.startTime && c.startTime > now && c.phase !== 'FINISHED')
    .sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0))[0]
  const examDate = planApi.data?.plan?.examDate ? Date.parse(planApi.data.plan.examDate) : NaN
  const daysToExam = Number.isFinite(examDate) ? Math.ceil((examDate - now) / 86_400_000) : null
  const mastery = clusters?.length ? Math.round(clusters.reduce((a, c) => a + progressOf(c), 0) / clusters.length) : null
  const linked = accountsApi.data ? accountsApi.data.accounts.filter((a) => a.verified).length : null
  const judges = accountsApi.data?.judges.length ?? 0
  const readyChapters = DSA_TOPICS.filter((t) => t.load).length

  const rooms: Room[] = [
    {
      kicker: 'The Library',
      name: 'Learn',
      to: '/learn',
      live: cont?.page
        ? `${cont.page.of - cont.page.read} ${cont.page.of - cont.page.read === 1 ? 'page' : 'pages'} left in ${cont.title}.`
        : cont
          ? `Next in ${cont.subject}: ${cont.title}.`
          : `${readyChapters} DSA chapters ready to read.`,
      links: [
        { label: 'DSA course', to: '/learn?tab=dsa' },
        { label: 'GATE notes', to: '/gate/notes' },
        { label: 'Paths', to: '/learn?tab=paths' },
      ],
    },
    {
      kicker: 'The Workshop',
      name: 'Problems',
      to: '/problems',
      live: nextContest?.startTime
        ? `Next contest in ${until(nextContest.startTime - now)}: ${nextContest.name}.`
        : `${stats.solved.toLocaleString('en-IN')} solved of ${stats.attempted.toLocaleString('en-IN')} tried.`,
      links: [
        { label: 'Contests', to: '/contests' },
        { label: 'Workshop', to: '/workshop' },
        { label: 'Bookmarks', to: '/bookmarks' },
      ],
    },
    {
      kicker: 'The Exam Hall',
      name: 'GATE',
      to: '/gate',
      live:
        daysToExam != null && daysToExam >= 0
          ? `GATE in ${daysToExam} ${daysToExam === 1 ? 'day' : 'days'}${reviewDue ? `, ${reviewDue} cards due today` : ''}.`
          : reviewDue
            ? `${reviewDue} review ${reviewDue === 1 ? 'card' : 'cards'} due today.`
            : 'Past papers with verified solutions, notes and timed tests.',
      links: [
        { label: 'Practice', to: '/gate/practice' },
        { label: 'Tests', to: '/gate/tests' },
        { label: 'Review', to: '/gate/review' },
      ],
    },
    {
      kicker: 'The Atlas',
      name: 'Nexus',
      to: '/nexus',
      live: mastery != null && clusters ? `Mastery ${mastery}% across ${clusters.length} subjects.` : 'Every subject as one web of skills.',
      links: [{ label: 'Every subject', to: '/learn' }],
    },
    {
      kicker: 'The Ledger',
      name: 'Analytics',
      to: '/analytics',
      live: `${Math.round(stats.accuracy)}% accuracy over ${stats.submissions.toLocaleString('en-IN')} submissions.`,
      links: [
        { label: 'Achievements', to: '/achievements' },
        { label: 'Submissions', to: '/submissions' },
        { label: 'Profile', to: '/profile' },
      ],
    },
    {
      kicker: 'The Bridge',
      name: 'Linked accounts',
      to: '/settings?tab=platform',
      live: linked != null && judges ? `${linked} of ${judges} judge accounts linked.` : 'Link your judge accounts to bring your solves in.',
      links: [
        { label: 'Social', to: '/social' },
        { label: 'Appearance', to: '/theme' },
        { label: 'Settings', to: '/settings' },
      ],
    },
  ]

  return (
    <div className="today">
      <Masthead
        name={name}
        streak={stats.streak.current}
        goal={{ done: stats.todayStats.solved, of: dailyGoal }}
        steps={steps}
        syncing={statsApi.loading}
        updatedAt={updatedAt}
        onSync={() => {
          statsApi.refetch()
          reviewApi.refetch()
          dailyApi.refetch()
          void refresh()
        }}
      />
      <Spread cont={cont} rows={rows} />
      <Ledger stats={stats} items={items} />
      <Week stats={stats} items={items} />
      <Rooms rooms={rooms} />
      <FieldNotes stats={stats} items={items} />
    </div>
  )
}
