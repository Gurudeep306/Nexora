import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUp, Bookmark, Compass, Home, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { cn } from '@/lib/utils'
import { Composer } from './feed/Composer'
import { FeedEmpty, PostList, usePostList } from './feed/PostList'
import { SocialSearch, TrendingTags, WhoToFollow } from './feed/People'
import type { FeedPage } from './feed/types'
import './feed/social.css'

type FeedKind = 'home' | 'explore' | 'saved'

const SEGMENTS: { id: FeedKind; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Following', icon: Home },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'saved', label: 'Saved', icon: Bookmark },
]

/** The social feed: Following (home), Explore (trending) and Saved, with a composer and live new-post pill. */
export function FeedTab({ me }: { me: string }) {
  const [kind, setKind] = useState<FeedKind>(() => {
    try {
      return (sessionStorage.getItem('nexora:feed-kind') as FeedKind) || 'home'
    } catch {
      return 'home'
    }
  })
  useEffect(() => {
    try {
      sessionStorage.setItem('nexora:feed-kind', kind)
    } catch {
      /* ignore */
    }
  }, [kind])

  const list = usePostList(
    (cursor) =>
      kind === 'saved'
        ? api.get<FeedPage>('/api/social/bookmarks')
        : api.get<FeedPage>('/api/social/feed', { query: { tab: kind, cursor } }),
    [kind, me],
  )

  // Live: followers' new posts raise a pill instead of shoving the feed around.
  const socket = useSocket()
  const [fresh, setFresh] = useState<string[]>([])
  useEffect(() => {
    if (!socket) return
    const onPost = (p: { author: string }) => {
      if (p.author === me) return
      setFresh((cur) => (cur.includes(p.author) ? cur : [...cur, p.author]))
    }
    socket.on('social:post', onPost)
    return () => {
      socket.off('social:post', onPost)
    }
  }, [socket, me])
  const { refresh } = list
  const showFresh = useCallback(() => {
    setFresh([])
    if (kind !== 'home') setKind('home')
    else void refresh()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [kind, refresh])

  // Pull to refresh (touch).
  const [pull, setPull] = useState(0)
  const startY = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return
    const d = e.touches[0].clientY - startY.current
    setPull(d > 0 ? Math.min(90, d * 0.5) : 0)
  }
  const onTouchEnd = () => {
    if (pull > 60) {
      setFresh([])
      void refresh()
    }
    setPull(0)
    startY.current = null
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <SocialSearch className="mb-3 lg:hidden" />

        <div className="sticky top-[var(--topbar-h,56px)] z-20 -mx-1 mb-3 bg-bg-app/80 px-1 py-1.5 backdrop-blur-md">
          <div role="tablist" aria-label="Feed" className="relative grid grid-cols-3 rounded-xl border border-border bg-bg-surface-2/70 p-1">
            {SEGMENTS.map((s) => {
              const on = kind === s.id
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => (on ? void refresh() : setKind(s.id))}
                  className={cn('relative z-10 flex cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors', on ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary')}
                >
                  {on && <motion.span layoutId="feed-seg" className="absolute inset-0 -z-10 rounded-lg border border-border bg-bg-surface shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  <Icon className="size-4" aria-hidden="true" />
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {pull > 0 && (
          <div className="grid place-items-center text-text-muted" style={{ height: pull }} aria-hidden="true">
            <RefreshCw className="size-5" style={{ transform: `rotate(${pull * 4}deg)`, opacity: pull / 60 }} />
          </div>
        )}

        {kind !== 'saved' && (
          <div className="mb-3">
            <Composer
              onPosted={(p) => {
                if (kind === 'home') list.prepend(p)
                else setKind('home')
              }}
            />
          </div>
        )}

        {fresh.length > 0 && (
          <div className="sticky top-[calc(var(--topbar-h,56px)+60px)] z-30 h-0">
            <button
              type="button"
              onClick={showFresh}
              className="ng-pill absolute left-1/2 inline-flex -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full bg-accent-brand px-4 py-2 text-sm font-semibold text-on-accent-brand shadow-lg"
            >
              <ArrowUp className="size-4" />
              New posts from {fresh.slice(0, 2).join(', ')}
              {fresh.length > 2 ? ` +${fresh.length - 2}` : ''}
            </button>
          </div>
        )}

        <PostList
          list={list}
          empty={
            kind === 'home' ? (
              <FeedEmpty title="Your feed is waiting" description="Follow people to fill it — or post your first win. Explore shows what's trending right now." />
            ) : kind === 'explore' ? (
              <FeedEmpty title="Nothing trending yet" description="Be the first: share a solve, a snippet or a question." />
            ) : (
              <FeedEmpty title="No saved posts" description="Tap the bookmark on any post to keep it here." />
            )
          }
        />
      </div>

      <aside className="hidden space-y-4 lg:block" aria-label="Discover">
        <div className="sticky top-[calc(var(--topbar-h,56px)+8px)] space-y-4">
          <SocialSearch />
          <TrendingTags />
          <WhoToFollow />
        </div>
      </aside>
    </div>
  )
}
