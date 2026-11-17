import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Dices, ListChecks } from 'lucide-react'
import {
  Button,
  buttonVariants,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  useToast,
} from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/context/AuthContext'
import { useAgentPageContext } from '@/context/AgentContext'
import {
  DIFFICULTY_BANDS,
  type AiFindResponse,
  type BookmarksResponse,
  type ProblemsResponse,
  type Problem,
  type TagsResponse,
} from '@/components/problems/types'
import {
  ProblemFilters,
  type ProblemFilterState,
} from '@/components/problems/ProblemFilters'
import { aiErrorText, isAiUnavailable } from '@/lib/agent'
import { AiProblemResults } from '@/components/problems/AiProblemResults'
import { ProblemTable } from '@/components/problems/ProblemTable'
import { parseTopicParam, topicLabel } from '@/lib/topics'
import { useSources } from '@/lib/sources'
import { Pagination } from '@/components/problems/Pagination'

const PAGE_SIZE = 50

export default function ProblemsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const username = user?.username ?? ''
  const toast = useToast()

  const qParam = searchParams.get('q') ?? ''
  const [searchInput, setSearchInput] = useState(qParam)
  const [platform, setPlatform] = useState('all')
  const [difficulty, setDifficulty] = useState<ProblemFilterState['difficulty']>('all')
  // ?status=examples (or solved, attempted, unsolved) opens the list filtered.
  const [status, setStatus] = useState<ProblemFilterState['status']>(() => {
    const s = searchParams.get('status')
    return s === 'solved' || s === 'examples' || s === 'attempted' || s === 'unsolved' ? s : 'all'
  })
  const [tag, setTag] = useState('')
  // The sources an admin has switched on (the AI finder searches only these).
  const sources = useSources()
  const [sort, setSort] = useState<ProblemFilterState['sort']>('rating')
  const [order, setOrder] = useState<ProblemFilterState['order']>('asc')
  const [offset, setOffset] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [aiResults, setAiResults] = useState<AiFindResponse | null>(null)
  const navigate = useNavigate()
  const [busyBookmarkId, setBusyBookmarkId] = useState<number | null>(null)

  // Keep the visible input in sync when ?q= changes externally (nav links, back button)
  useEffect(() => {
    setSearchInput((cur) => (cur === qParam ? cur : qParam))
  }, [qParam])

  // Debounce typed search into the URL (300 ms), resetting pagination
  useEffect(() => {
    if (searchInput === qParam) return
    const t = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (searchInput) next.set('q', searchInput)
          else next.delete('q')
          return next
        },
        { replace: true },
      )
      setOffset(0)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput, qParam, setSearchParams])

  const band = DIFFICULTY_BANDS.find((b) => b.id === difficulty) ?? DIFFICULTY_BANDS[0]
  // ?topic=dp,graphs: chosen topics live in the URL, so a filtered list can be shared.
  const topicKey = parseTopicParam(searchParams.get('topic')).join(',')
  const topics = topicKey ? topicKey.split(',') : []

  const filterQuery = {
    platform: platform === 'all' ? undefined : platform,
    minRating: band.min,
    maxRating: band.max,
    tag: tag || undefined,
    topic: topicKey || undefined,
    status: status === 'all' ? undefined : status,
    search: qParam || undefined,
  }
  const problemsApi = useApi<ProblemsResponse>(
    () =>
      api.get<ProblemsResponse>('/api/problems', {
        query: {
          ...filterQuery,
          sort,
          order,
          limit: PAGE_SIZE,
          offset,
        },
        timeoutMs: 15000,
      }),
    [platform, band.min, band.max, tag, topicKey, status, qParam, sort, order, offset],
    { cacheKey: `problems:${JSON.stringify([platform, band.min, band.max, tag, topicKey, status, qParam, sort, order, offset])}` },
  )

  /* Tell the floating assistant what's listed, so it can recommend from it. */
  const filtersText = [
    qParam && `search "${qParam}"`,
    platform !== 'all' && `platform ${platform}`,
    difficulty !== 'all' && band.label,
    status !== 'all' && `status ${status}`,
    tag && `tag ${tag}`,
    topics.length > 0 && `topics ${topics.map(topicLabel).join(', ')}`,
    `sorted by ${sort} ${order}`,
  ]
    .filter(Boolean)
    .join(', ')
  const listed = problemsApi.data?.problems ?? []
  useAgentPageContext({
    label: tag ? `Problems · ${tag}` : 'Problems',
    filters: filtersText,
    visibleText: listed.length
      ? `${problemsApi.data?.total ?? listed.length} problems match. Showing:\n${listed
          .slice(0, 40)
          .map((p) => `#${p.id} ${p.title} [${p.platform}] rating ${p.rating || '?'} — ${p.solve_status}`)
          .join('\n')}`
      : undefined,
  })

  const bookmarksApi = useApi<BookmarksResponse>(
    () => api.get<BookmarksResponse>('/api/bookmarks', { query: { username } }),
    [username],
    { skip: !username },
  )

  const tagsApi = useApi<TagsResponse>(() => api.get<TagsResponse>('/api/tags'), [], { cacheKey: 'tags' })

  const bookmarkedIds = useMemo(
    () => new Set(bookmarksApi.data?.problemIds ?? []),
    [bookmarksApi.data],
  )

  const toggleBookmark = useCallback(
    async (problem: Problem) => {
      if (!username) {
        toast.warning('Sign in required', 'Bookmarks are tied to your account.')
        return
      }
      const wasBookmarked = bookmarkedIds.has(problem.id)
      setBusyBookmarkId(problem.id)
      // Optimistic update
      const optimistic = new Set(bookmarkedIds)
      if (wasBookmarked) optimistic.delete(problem.id)
      else optimistic.add(problem.id)
      bookmarksApi.setData((prev) =>
        prev ? { ...prev, problemIds: [...optimistic] } : prev,
      )
      try {
        if (wasBookmarked) {
          await api.delete(`/api/bookmarks/${problem.id}`, { query: { username } })
        } else {
          await api.post('/api/bookmarks', { username, problemId: problem.id })
        }
      } catch (err) {
        bookmarksApi.setData((prev) =>
          prev ? { ...prev, problemIds: [...bookmarkedIds] } : prev,
        )
        toast.error('Bookmark failed', err instanceof Error ? err.message : undefined)
      } finally {
        setBusyBookmarkId(null)
      }
    },
    [username, bookmarkedIds, bookmarksApi, toast],
  )

  const handleFilterChange = useCallback((patch: Partial<ProblemFilterState>) => {
    if (patch.platform !== undefined) setPlatform(patch.platform)
    if (patch.difficulty !== undefined) setDifficulty(patch.difficulty)
    if (patch.status !== undefined) setStatus(patch.status)
    if (patch.tag !== undefined) setTag(patch.tag)
    const ids = patch.topics
    if (ids !== undefined)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (ids.length) next.set('topic', ids.join(','))
          else next.delete('topic')
          return next
        },
        { replace: true },
      )
    if (patch.sort !== undefined) setSort(patch.sort)
    if (patch.order !== undefined) setOrder(patch.order)
    setOffset(0)
  }, [setSearchParams])

  /* AI finder returns real, re-ranked problems — shown as their own result set */
  const handleAiResults = useCallback((res: AiFindResponse) => {
    setAiResults(res)
    setOffset(0)
  }, [])

  const clearAiResults = useCallback(() => setAiResults(null), [])

  /* Ask AI: the search bar's text, read as a description of what to practise. */
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const askAi = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || asking) return
      setAsking(true)
      setAskError(null)
      try {
        const res = await api.post<AiFindResponse>(
          '/api/ai/find-problems',
          { query: text, platforms: sources.map((s) => s.id), tags: tagsApi.data?.tags ?? [], limit: 12 },
          { timeoutMs: 90000 },
        )
        if (res.ok) handleAiResults(res)
        else throw new Error(res.error || 'AI search failed')
      } catch (err) {
        const msg = aiErrorText(err)
        setAskError(isAiUnavailable(err) ? `${msg} The filters still work.` : msg)
        if (!isAiUnavailable(err)) toast.error('AI search failed', msg)
      } finally {
        setAsking(false)
      }
    },
    [asking, handleAiResults, tagsApi.data, toast, sources],
  )

  const filters: ProblemFilterState = {
    search: searchInput,
    platform,
    difficulty,
    status,
    tag,
    topics,
    sort,
    order,
  }

  const problems = problemsApi.data?.problems ?? []
  const total = problemsApi.data?.total ?? 0

  // Jump to a random problem that matches the current filters.
  const surpriseMe = async () => {
    setRolling(true)
    try {
      const total = problemsApi.data?.total ?? 0
      if (!total) {
        toast.info('No problems match these filters')
        return
      }
      const pick = await api.get<ProblemsResponse>('/api/problems', {
        query: { ...filterQuery, limit: 1, offset: Math.floor(Math.random() * total) },
      })
      const p = pick.problems?.[0]
      if (p) navigate(`/solve/${p.id}`)
    } catch {
      toast.error('Could not pick a problem — try again')
    } finally {
      setRolling(false)
    }
  }

  return (
    <div>
      <PageHeader
        icon="problems"
        eyebrow="The Workshop"
        title="Problems"
        subtitle="Problems from Codeforces, CodeChef, AtCoder, LeetCode, CSES and more, in one place. Filter, bookmark and solve them here."
        actions={
          <span className="flex items-center gap-1">
            <Link to="/problems/sets" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              <ListChecks aria-hidden="true" /> Problem sets
            </Link>
            <Button variant="ghost" size="sm" loading={rolling} onClick={() => void surpriseMe()}>
              {!rolling && <Dices aria-hidden="true" />} Surprise me
            </Button>
          </span>
        }
      />

      <div className="space-y-4">
        {aiResults ? (
          <AiProblemResults
            data={aiResults}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={toggleBookmark}
            busyBookmarkId={busyBookmarkId}
            onClear={clearAiResults}
          />
        ) : (
          <>
            <ProblemFilters
              filters={filters}
              tags={tagsApi.data?.tags ?? []}
              resultCount={problemsApi.data ? total : undefined}
              onSearchInput={setSearchInput}
              onChange={handleFilterChange}
              onAsk={(t) => void askAi(t)}
              asking={asking}
              askError={askError}
            />

            {problemsApi.loading ? (
              <LoadingBlock rows={8} />
            ) : problemsApi.error ? (
              <ErrorState message={problemsApi.error} onRetry={problemsApi.refetch} />
            ) : problems.length === 0 ? (
              <div className="card-neon pt-empty">
                {/* With no filter set, an empty list means nothing has been imported yet. */}
                {!qParam && platform === 'all' && band === DIFFICULTY_BANDS[0] && !tag && !topics.length && status === 'all' ? (
                  <EmptyState icon="problems" title="No problems yet" description="Problems appear here once they are imported from the judges. Try again in a little while." />
                ) : (
                  <EmptyState
                    icon="search"
                    title="No problems match"
                    description={qParam ? `Nothing found for "${qParam}". Try different keywords or clear the filters.` : 'Try widening your filters.'}
                  />
                )}
              </div>
            ) : (
              <>
                <ProblemTable
                  problems={problems}
                  bookmarkedIds={bookmarkedIds}
                  onToggleBookmark={toggleBookmark}
                  busyBookmarkId={busyBookmarkId}
                  onPickTopic={(id) => {
                    if (!topics.includes(id)) handleFilterChange({ topics: [...topics, id] })
                  }}
                />
                <Pagination total={total} limit={PAGE_SIZE} offset={offset} onPageChange={setOffset} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
