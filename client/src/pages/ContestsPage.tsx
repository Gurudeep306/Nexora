import { useMemo, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { ContestRow } from '@/components/contests/ContestRow'
import { LayoutGrid, RefreshCw } from 'lucide-react'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  SearchInput,
  Tabs,
} from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/context/AuthContext'
import { PlatformContestCard } from '@/components/contests/PlatformContestCard'
import { contestBucket } from '@/components/contests/contestUtils'
import { CustomContestsSection } from '@/components/contests/CustomContestsSection'
import type { PlatformContest } from '@/components/contests/types'
import { Icon } from '@/components/icon/Icon'
import { isJournalKit } from '@/theme/styles'

type Bucket = 'all' | 'live' | 'upcoming' | 'past'

export default function ContestsPage() {
  // The Field Journal shows contests as a calendar list; other styles keep the cards.
  const journal = isJournalKit(useTheme().shown.style)
  const { user } = useAuth()
  const [bucket, setBucket] = useState<Bucket>('all')
  const [q, setQ] = useState('')

  // Live scrape of Codeforces + CodeChef — can be slow; generous timeout.
  const contestsApi = useApi<{ contests: PlatformContest[] }>(
    () => api.get('/api/contests', { timeoutMs: 60000 }),
    [],
  )

  const contests = useMemo(() => contestsApi.data?.contests ?? [], [contestsApi.data])
  const counts = useMemo(() => {
    const c = { all: contests.length, live: 0, upcoming: 0, past: 0 }
    for (const x of contests) c[contestBucket(x)]++
    return c
  }, [contests])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return contests.filter((c) => (bucket === 'all' || contestBucket(c) === bucket) && (!needle || `${c.name} ${c.platform}`.toLowerCase().includes(needle)))
  }, [contests, bucket, q])

  return (
    <div>
      <PageHeader
        icon="contests"
        eyebrow="The Workshop"
        title="Contests"
        subtitle="Upcoming rounds on Codeforces and CodeChef, and private contests made on NexoraGuru."
        actions={
          <Button variant="outline" size="sm" onClick={contestsApi.refetch} aria-label="Refresh contests">
            <RefreshCw /> Refresh
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <Tabs
          variant="pills"
          items={[
            { id: 'all', label: 'All', icon: <LayoutGrid className="size-3.5" />, badge: counts.all },
            { id: 'live', label: 'Live', icon: <Icon name="live" className="size-3.5" />, badge: counts.live },
            { id: 'upcoming', label: 'Upcoming', icon: <Icon name="calendar" className="size-3.5" />, badge: counts.upcoming },
            { id: 'past', label: 'Past', icon: <Icon name="submissions" className="size-3.5" />, badge: counts.past },
          ]}
          active={bucket}
          onChange={(id) => setBucket(id as Bucket)}
        />
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Find a contest" aria-label="Search contests" containerClassName="w-full sm:w-64" />
      </div>

      {contestsApi.loading ? (
        <LoadingBlock rows={5} />
      ) : contestsApi.error ? (
        <Card>
          <ErrorState
            message={`${contestsApi.error} — the platform feed is a live scrape and can time out.`}
            onRetry={contestsApi.refetch}
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon="trophy"
            title={q.trim() ? `No contests match “${q.trim()}”` : bucket === 'all' ? 'No contests found' : `No ${bucket} contests`}
            description={q.trim() ? 'Check the spelling, or clear the search.' : 'Check back soon — or host your own contest below.'}
          />
        </Card>
      ) : (
        journal ? (
          <ol className="cr-list" aria-label="Contests">
            {visible.map((c, i) => (
              <ContestRow key={`${c.platform}-${c.name}-${c.startTime ?? i}`} contest={c} />
            ))}
          </ol>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((c, i) => (
              <PlatformContestCard key={`${c.platform}-${c.name}-${c.startTime ?? i}`} contest={c} index={i} />
            ))}
          </div>
        )
      )}

      {user?.username ? (
        <CustomContestsSection me={user.username} />
      ) : (
        <section className="mt-8">
          <Card>
            <EmptyState
              icon="trophy"
              title="Custom contests need an identity"
              description="Sign in to join NexoraGuru-hosted contests with a code and password."
            />
          </Card>
        </section>
      )}
    </div>
  )
}
