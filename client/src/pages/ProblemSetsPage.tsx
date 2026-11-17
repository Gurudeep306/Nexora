import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Building2, Heart, Lock, Plus } from 'lucide-react'
import { BackButton, Button, Card, CardContent, EmptyState, ErrorState, LoadingBlock, PageHeader, Progress, SearchInput, Tabs } from '@/components/ui'
import { NewSetDialog, StaffSetDialog } from '@/components/problems/sets/SetDialogs'
import { useSite } from '@/context/SiteContext'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { setPath, type SetCard, type SetList, type SetTab } from '@/lib/problemSets'
import { cn } from '@/lib/utils'

const TABS: { id: SetTab; label: string; hint: string }[] = [
  { id: 'public', label: 'Shared', hint: 'Sets people made public, most liked first.' },
  { id: 'series', label: 'Famous series', hint: 'Well-known lists. Problems we have open here; the rest link to the original.' },
  { id: 'company', label: 'Companies', hint: 'Problems from contests each company ran, plus what people here report being asked.' },
  { id: 'mine', label: 'Yours', hint: 'Your own sets. Private until you share them.' },
]

/**
 * Problems → Sets: lists of problems to work through. Shared sets by likes,
 * famous series, company lists (sourced, or reported by people here), and
 * your own. Every number on a card is real: problems in it, how many you solved.
 */
export default function ProblemSetsPage() {
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const DEFAULT_TAB: SetTab = 'series'
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? DEFAULT_TAB) as SetTab
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [staffAdding, setStaffAdding] = useState(false)
  const { can } = useSite()
  const staff = !!user && can('problems.manage')
  const staffTab = tab === 'series' || tab === 'company'
  const query = q.trim()
  const list = useApi(
    () => api.get<SetList>('/api/problem-sets', { query: { tab, q: query || undefined } }),
    [tab, query],
    { skip: tab === 'mine' && !user, cacheKey: `sets:${tab}:${query}` },
  )
  const setTab = (id: string) =>
    setParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        if (id === DEFAULT_TAB) n.delete('tab')
        else n.set('tab', id)
        return n
      },
      { replace: true },
    )
  const hint = TABS.find((t) => t.id === tab)?.hint

  return (
    <div className="space-y-4">
      <BackButton />
      <PageHeader
        icon="problems"
        eyebrow="Problems"
        title="Problem sets"
        subtitle="Lists of problems to work through, one at a time. Make your own, or follow one."
        actions={
          user ? (
            staff && staffTab ? (
              <Button size="sm" onClick={() => setStaffAdding(true)}>
                <Plus aria-hidden="true" /> {tab === 'series' ? 'Add a series' : 'Add a company list'}
              </Button>
            ) : (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus aria-hidden="true" /> New set
              </Button>
            )
          ) : undefined
        }
      />
      <Tabs items={TABS.map((t) => ({ id: t.id, label: t.label }))} active={tab} onChange={setTab} />
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a set" aria-label="Find a set" className="max-w-sm" />
        {hint && <p className="m-0 text-[13px] text-text-secondary">{hint}</p>}
      </div>

      {tab === 'mine' && !user ? (
        <EmptyState title="Sign in to keep sets" description="Your sets are saved to your account." action={<Link to="/auth" className="text-sm font-medium text-text-primary underline underline-offset-[3px]">Sign in</Link>} />
      ) : list.error && !list.data ? (
        <ErrorState message={`Couldn't load the sets: ${list.error}`} onRetry={list.refetch} />
      ) : !list.data ? (
        <LoadingBlock rows={4} />
      ) : (
        <>
          {list.data.sets.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.data.sets.map((s) => (
                <li key={s.id}>
                  <SetCardView s={s} />
                </li>
              ))}
            </ul>
          ) : (
            !list.data.reported?.length && (
              <EmptyState
                title={query ? `No set matches “${query}”` : tab === 'mine' ? 'You have no sets yet' : tab === 'company' ? 'No company lists yet' : 'Nothing here yet'}
                description={
                  tab === 'mine'
                    ? 'Make one, then add problems from Problems or the Solve page.'
                    : tab === 'company'
                      ? 'Company lists appear when staff add one with its public source, or when people report a problem they were asked.'
                      : 'Share one of your sets and it shows here.'
                }
              />
            )
          )}
          {tab === 'public' && !query && list.data.sets.length === 0 && (
            <p className="m-0 text-center text-[13px] text-text-secondary">
              Nothing shared yet —{' '}
              <Link to="/problems/sets?tab=series" className="font-medium text-text-primary underline underline-offset-[3px]">
                browse the famous series
              </Link>{' '}
              or make your own set.
            </p>
          )}
          {tab === 'company' && (list.data.reported?.length ?? 0) > 0 && (
            <section aria-labelledby="reported-h" className="space-y-2 pt-2">
              <h2 id="reported-h" className="m-0 text-[15px] font-semibold text-text-primary">
                {list.data.sets.length ? 'More companies people reported' : 'Reported by people here'}
              </h2>
              <p className="m-0 text-[13px] text-text-secondary">A problem shows once at least two people say they were asked it. These are their reports, not the companies’ own lists.</p>
              <ul className="flex flex-wrap gap-2">
                {list.data.reported!.map((c) => (
                  <li key={c.company}>
                    <Link to={setPath(`company:${c.company}`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-text-primary transition-colors hover:border-border-strong">
                      <Building2 className="size-4 text-text-muted" aria-hidden="true" />
                      {c.company}
                      <span className="text-xs text-text-muted tabular-nums">
                        {c.count} {c.count === 1 ? 'problem' : 'problems'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {creating && <NewSetDialog onClose={() => setCreating(false)} />}
      {staffAdding && <StaffSetDialog kind={tab === 'company' ? 'company' : 'series'} onClose={() => setStaffAdding(false)} />}
    </div>
  )
}

function SetCardView({ s }: { s: SetCard }) {
  return (
    <Link to={setPath(s.id)} className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2">
      <Card className="h-full transition-colors hover:border-border-strong">
        <CardContent className="flex h-full flex-col gap-2 py-4">
          <p className="m-0 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-text-muted uppercase">
            {s.kind === 'series' ? 'Series' : s.kind === 'company' ? 'Company' : s.visibility === 'private' ? 'Private' : `By @${s.owner}`}
            {s.visibility === 'private' && <Lock className="size-3" aria-hidden="true" />}
          </p>
          <p className="m-0 text-[15px] leading-snug font-semibold text-text-primary">{s.title}</p>
          {s.description && <p className="m-0 line-clamp-2 text-[13px] text-text-secondary">{s.description}</p>}
          <div className="mt-auto space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs text-text-muted tabular-nums">
              <span>
                {s.solved} of {s.count} solved
              </span>
              {s.likes != null && (
                <span className="inline-flex items-center gap-1">
                  <Heart className={cn('size-3.5', s.liked && 'fill-current')} aria-hidden="true" />
                  <span className="sr-only">Likes:</span> {s.likes}
                </span>
              )}
            </div>
            <Progress value={s.solved} max={Math.max(1, s.count)} label={`${s.solved} of ${s.count} solved`} />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
