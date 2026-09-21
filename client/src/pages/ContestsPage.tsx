import { useMemo, useState } from 'react'
import { Radio, CalendarClock, History, LayoutGrid, RefreshCw, Trophy } from 'lucide-react'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Tabs,
} from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/context/AuthContext'
import { PlatformContestCard, contestBucket } from '@/components/contests/PlatformContestCard'
import { CustomContestsSection } from '@/components/contests/CustomContestsSection'
import type { PlatformContest } from '@/components/contests/types'

type Bucket = 'all' | 'live' | 'upcoming' | 'past'

export default function ContestsPage() {
  const { user } = useAuth()
  const [bucket, setBucket] = useState<Bucket>('all')

  // Live scrape of Codeforces + CodeChef — can be slow; generous timeout.
  const contestsApi = useApi<{ contests: PlatformContest[] }>(
    () => api.get('/api/contests', { timeoutMs: 60000 }),
    [],
  )

  const contests = contestsApi.data?.contests ?? []
  const counts = useMemo(() => {
    const c = { all: contests.length, live: 0, upcoming: 0, past: 0 }
    for (const x of contests) c[contestBucket(x)]++
    return c
  }, [contests])

  const visible = useMemo(
    () => (bucket === 'all' ? contests : contests.filter((c) => contestBucket(c) === bucket)),
    [contests, bucket],
  )

  return (
    <div>
      <PageHeader
        title="Contest Arena"
        subtitle="Live Codeforces & CodeChef feeds plus password-gated Nexora custom contests."
        actions={
          <Button variant="outline" size="sm" onClick={contestsApi.refetch} aria-label="Refresh contests">
            <RefreshCw /> Refresh
          </Button>
        }
      />

      <Tabs
        variant="pills"
        className="mb-5"
        items={[
          { id: 'all', label: 'All', icon: <LayoutGrid className="size-3.5" />, badge: counts.all },
          { id: 'live', label: 'Live', icon: <Radio className="size-3.5" />, badge: counts.live },
          { id: 'upcoming', label: 'Upcoming', icon: <CalendarClock className="size-3.5" />, badge: counts.upcoming },
          { id: 'past', label: 'Past', icon: <History className="size-3.5" />, badge: counts.past },
        ]}
        active={bucket}
        onChange={(id) => setBucket(id as Bucket)}
      />

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
            icon={<Trophy />}
            title={bucket === 'all' ? 'No contests found' : `No ${bucket} contests`}
            description="Check back soon — or host your own contest below."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((c, i) => (
            <PlatformContestCard key={`${c.platform}-${c.name}-${c.startTime ?? i}`} contest={c} index={i} />
          ))}
        </div>
      )}

      {user?.username ? (
        <CustomContestsSection me={user.username} />
      ) : (
        <section className="mt-8">
          <Card>
            <EmptyState
              icon={<Trophy />}
              title="Custom contests need an identity"
              description="Sign in to join Nexora-hosted contests with a code and password."
            />
          </Card>
        </section>
      )}
    </div>
  )
}
