import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { Button, Card, EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { errorText } from './lib'
import { PostCard } from './PostCard'
import type { FeedItem, FeedPage, Post } from './types'

/** Paged list of feed items with optimistic updates (shared by every feed). */
export function usePostList(fetchPage: (cursor: string | null) => Promise<FeedPage>, deps: unknown[]) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const gen = useRef(0)
  const fetchRef = useRef(fetchPage)
  fetchRef.current = fetchPage

  const refresh = useCallback(async () => {
    const g = ++gen.current
    setLoading(true)
    setError(null)
    try {
      const page = await fetchRef.current(null)
      if (g !== gen.current) return
      setItems(page.items)
      setNext(page.next)
      setLocked(!!page.locked)
    } catch (e) {
      if (g === gen.current) setError(errorText(e))
    } finally {
      if (g === gen.current) setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void refresh(), deps)

  const loadMore = useCallback(async () => {
    if (!next || more) return
    const g = gen.current
    setMore(true)
    try {
      const page = await fetchRef.current(next)
      if (g !== gen.current) return
      setItems((cur) => {
        const seen = new Set(cur.map((i) => i.post.id))
        return [...cur, ...page.items.filter((i) => !seen.has(i.post.id))]
      })
      setNext(page.next)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setMore(false)
    }
  }, [next, more])

  const update = useCallback((post: Post) => setItems((cur) => cur.map((i) => (i.post.id === post.id ? { ...i, post } : i))), [])
  const remove = useCallback((id: number) => setItems((cur) => cur.filter((i) => i.post.id !== id)), [])
  const prepend = useCallback((post: Post) => setItems((cur) => [{ key: `p${post.id}`, cursor: post.id, post }, ...cur.filter((i) => i.key !== `p${post.id}`)]), [])
  const hideAuthor = useCallback((u: string) => setItems((cur) => cur.filter((i) => i.post.author.username !== u && i.reposted_by?.username !== u)), [])

  return { items, next, loading, more, error, locked, refresh, loadMore, update, remove, prepend, hideAuthor }
}

export type PostListState = ReturnType<typeof usePostList>

export function PostSkeleton() {
  return (
    <div className="card space-y-3 p-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-14 w-full" />
      <div className="flex gap-8">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  )
}

export function PostList({ list, empty, pinnedIds }: { list: PostListState; empty: ReactNode; pinnedIds?: Set<number> }) {
  const sentinel = useRef<HTMLDivElement>(null)
  const { loadMore, next } = list

  useEffect(() => {
    const el = sentinel.current
    if (!el || !next) return
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMore(), { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [loadMore, next])

  if (list.loading && !list.items.length) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading posts">
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    )
  }
  if (list.error && !list.items.length) return <ErrorState message={list.error} onRetry={() => void list.refresh()} />
  if (!list.items.length) return <Card>{empty}</Card>

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {list.items.map((item) => (
          <motion.div key={item.key} layout="position" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.22 }}>
            <PostCard
              post={item.post}
              repostedBy={item.reposted_by}
              pinned={pinnedIds?.has(item.post.id)}
              onChange={list.update}
              onRemove={list.remove}
              onCreated={list.prepend}
              onHideAuthor={list.hideAuthor}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={sentinel} />
      {list.more && (
        <div className="grid place-items-center py-4">
          <Loader2 className="size-5 animate-spin text-text-muted" aria-label="Loading more" />
        </div>
      )}
      {!list.next && list.items.length > 4 && <p className="py-4 text-center text-xs text-text-muted">You're all caught up ✦</p>}
      {list.next && !list.more && (
        <div className="grid place-items-center">
          <Button variant="ghost" size="sm" onClick={() => void list.loadMore()}>
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}

export function FeedEmpty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <EmptyState icon="social" title={title} description={description} action={action} />
}
