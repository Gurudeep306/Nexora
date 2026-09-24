import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Dices, SearchX } from 'lucide-react'
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  useToast,
} from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/context/AuthContext'
import {
  DIFFICULTY_BANDS,
  type BookmarksResponse,
  type ProblemsResponse,
  type Problem,
  type TagsResponse,
} from '@/components/problems/types'
import {
  ProblemFilters,
  type ProblemFilterState,
} from '@/components/problems/ProblemFilters'
import { AiProblemFinder, type AiProblemFilters } from '@/components/problems/AiProblemFinder'
import { ProblemTable } from '@/components/problems/ProblemTable'
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
  const [status, setStatus] = useState<ProblemFilterState['status']>('all')
  const [tag, setTag] = useState('')
  const [sort, setSort] = useState<ProblemFilterState['sort']>('rating')
  const [order, setOrder] = useState<ProblemFilterState['order']>('asc')
  const [offset, setOffset] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
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

  const filterQuery = {
    platform: platform === 'all' ? undefined : platform,
    minRating: band.min,
    maxRating: band.max,
    tag: tag || undefined,
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
    [platform, band.min, band.max, tag, status, qParam, sort, order, offset],
  )

  const bookmarksApi = useApi<BookmarksResponse>(
    () => api.get<BookmarksResponse>('/api/bookmarks', { query: { username } }),
    [username],
    { skip: !username },
  )

  const tagsApi = useApi<TagsResponse>(() => api.get<TagsResponse>('/api/tags'), [])

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
    if (patch.sort !== undefined) setSort(patch.sort)
    if (patch.order !== undefined) setOrder(patch.order)
    setOffset(0)
  }, [])

  /* AI finder results become ordinary filter state, so everything stays composable */
  const applyAiFilters = useCallback((f: AiProblemFilters) => {
    setPlatform(f.platform || 'all')
    setDifficulty((f.difficulty || 'all') as ProblemFilterState['difficulty'])
    setStatus(f.status || 'all')
    setTag(f.tags?.[0] ?? '')
    setSort(f.sort || 'rating')
    setSearchInput(f.search || '')
    setAiSummary(f.summary || null)
    setOffset(0)
  }, [])

  const clearAiFilters = useCallback(() => {
    setAiSummary(null)
    setPlatform('all')
    setDifficulty('all')
    setStatus('all')
    setTag('')
    setSearchInput('')
    setOffset(0)
  }, [])

  const filters: ProblemFilterState = {
    search: searchInput,
    platform,
    difficulty,
    status,
    tag,
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
        title="Problem Arena"
        subtitle="Filter, bookmark and dive into problems across six competitive platforms."
        actions={
          <Button variant="accent" size="sm" loading={rolling} onClick={() => void surpriseMe()}>
            {!rolling && <Dices aria-hidden="true" />} Surprise me
          </Button>
        }
      />

      <div className="space-y-4">
        <AiProblemFinder
          tags={tagsApi.data?.tags ?? []}
          onApply={applyAiFilters}
          summary={aiSummary}
          onClearSummary={clearAiFilters}
        />

        <ProblemFilters
          filters={filters}
          tags={tagsApi.data?.tags ?? []}
          resultCount={problemsApi.data ? total : undefined}
          onSearchInput={setSearchInput}
          onChange={handleFilterChange}
        />

        {problemsApi.loading ? (
          <LoadingBlock rows={8} />
        ) : problemsApi.error ? (
          <ErrorState message={problemsApi.error} onRetry={problemsApi.refetch} />
        ) : problems.length === 0 ? (
          <div className="card-neon">
            <EmptyState
              icon={<SearchX />}
              title="No problems match"
              description={
                aiSummary
                  ? `The AI narrowed things too far — "${aiSummary}" returned nothing. Clear its filters to browse everything.`
                  : qParam
                    ? `Nothing found for "${qParam}". Try different keywords or clear the filters.`
                    : 'Try widening your filters.'
              }
              action={
                aiSummary ? (
                  <Button variant="subtle" size="sm" onClick={clearAiFilters}>
                    Clear AI filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <ProblemTable
              problems={problems}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={toggleBookmark}
              busyBookmarkId={busyBookmarkId}
            />
            <Pagination total={total} limit={PAGE_SIZE} offset={offset} onPageChange={setOffset} />
          </>
        )}
      </div>
    </div>
  )
}
