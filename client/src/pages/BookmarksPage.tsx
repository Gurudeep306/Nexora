import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { BookmarkX, Star } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  SearchInput,
  Select,
  useToast,
} from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/context/AuthContext'
import { PLATFORM_OPTIONS } from '@/components/problems/types'
import { BookmarkCard } from '@/components/library/BookmarkCard'
import type { BookmarkedProblem, BookmarksResponse } from '@/components/library/types'

type SortKey = 'recent' | 'rating_desc' | 'rating_asc' | 'title'

export default function BookmarksPage() {
  const { user } = useAuth()
  const username = user?.username ?? ''
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [pendingRemove, setPendingRemove] = useState<BookmarkedProblem | null>(null)
  const [removing, setRemoving] = useState(false)

  const bookmarksApi = useApi<BookmarksResponse>(
    () => api.get<BookmarksResponse>('/api/bookmarks', { query: { username } }),
    [username],
    { skip: !username },
  )

  const problems = bookmarksApi.data?.problems ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = problems.filter((p) => {
      if (platform !== 'all' && p.platform?.toLowerCase() !== platform) return false
      if (status !== 'all' && (p.solve_status ?? 'unsolved') !== status) return false
      if (q && !p.title.toLowerCase().includes(q) && !p.problem_id?.toLowerCase().includes(q))
        return false
      return true
    })
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'rating_desc':
          return (b.rating ?? 0) - (a.rating ?? 0)
        case 'rating_asc':
          return (a.rating ?? 0) - (b.rating ?? 0)
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return (
            new Date(b.bookmarked_at ?? 0).getTime() - new Date(a.bookmarked_at ?? 0).getTime()
          )
      }
    })
  }, [problems, search, platform, status, sort])

  const counts = useMemo(() => {
    const byStatus = { solved: 0, attempted: 0, unsolved: 0 }
    for (const p of problems) {
      const s = p.solve_status ?? 'unsolved'
      if (s in byStatus) byStatus[s as keyof typeof byStatus] += 1
    }
    return byStatus
  }, [problems])

  const confirmRemove = useCallback(async () => {
    if (!pendingRemove) return
    setRemoving(true)
    try {
      await api.delete(`/api/bookmarks/${pendingRemove.id}`, { query: { username } })
      toast.success('Bookmark removed', pendingRemove.title)
      setPendingRemove(null)
      bookmarksApi.refetch()
    } catch (err) {
      toast.error('Could not remove bookmark', err instanceof Error ? err.message : undefined)
    } finally {
      setRemoving(false)
    }
  }, [pendingRemove, username, toast, bookmarksApi])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bookmark Vault"
        subtitle="Problems you saved for later — filter, jump back in, or clear the clutter."
        actions={
          problems.length > 0 ? (
            <span className="text-xs text-foreground-faint">
              <Star className="mr-1 inline size-3.5 text-gold" aria-hidden="true" />
              <span className="font-mono text-foreground tabular-nums">{problems.length}</span> saved ·{' '}
              <span className="font-mono text-success tabular-nums">{counts.solved}</span> solved
            </span>
          ) : undefined
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <Card>
          <CardContent className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Search bookmarks…"
              aria-label="Search bookmarks"
            />
            <Select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              aria-label="Filter by platform"
            >
              <option value="all">All platforms</option>
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter by solve status"
            >
              <option value="all">Any status</option>
              <option value="unsolved">Unsolved</option>
              <option value="attempted">Attempted</option>
              <option value="solved">Solved</option>
            </Select>
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort bookmarks"
            >
              <option value="recent">Recently saved</option>
              <option value="rating_desc">Rating: high → low</option>
              <option value="rating_asc">Rating: low → high</option>
              <option value="title">Title A–Z</option>
            </Select>
          </CardContent>
        </Card>
      </motion.div>

      {bookmarksApi.loading ? (
        <LoadingBlock rows={6} />
      ) : bookmarksApi.error ? (
        <div className="card-neon">
          <ErrorState message={bookmarksApi.error} onRetry={bookmarksApi.refetch} />
        </div>
      ) : problems.length === 0 ? (
        <div className="card-neon">
          <EmptyState
            icon={<Star />}
            title="Your vault is empty"
            description="Star problems in the arena to stash them here for your next session."
            action={
              <Link to="/problems">
                <Button variant="primary" size="sm">
                  Browse problems
                </Button>
              </Link>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-neon">
          <EmptyState
            icon={<BookmarkX />}
            title="No bookmarks match"
            description="Try clearing the search or widening your filters."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p, i) => (
            <BookmarkCard
              key={p.id}
              problem={p}
              index={i}
              busy={removing && pendingRemove?.id === p.id}
              onRemove={setPendingRemove}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingRemove}
        onClose={() => !removing && setPendingRemove(null)}
        onConfirm={() => void confirmRemove()}
        title="Remove bookmark?"
        danger
        loading={removing}
        confirmLabel="Remove"
        message={
          <>
            <span className="font-semibold text-foreground">{pendingRemove?.title}</span> will be
            removed from your vault. Your solve progress is untouched.
          </>
        }
      />
    </div>
  )
}
