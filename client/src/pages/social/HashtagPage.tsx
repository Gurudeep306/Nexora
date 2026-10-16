import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Hash } from 'lucide-react'
import { BackButton } from '@/components/ui'
import { api } from '@/lib/api'
import { FeedEmpty, PostList, usePostList } from '@/components/social/feed/PostList'
import { TrendingTags, WhoToFollow } from '@/components/social/feed/People'
import type { FeedPage } from '@/components/social/feed/types'
import '@/components/social/feed/social.css'

/** Posts with a hashtag: /social/tag/:tag */
export default function HashtagPage() {
  const tag = (useParams().tag ?? '').toLowerCase()
  const [stats, setStats] = useState<{ posts: number; people: number } | null>(null)
  const list = usePostList(async (cursor) => {
    const r = await api.get<FeedPage & { stats: { posts: number; people: number } }>(`/api/social/tags/${encodeURIComponent(tag)}`, { query: { cursor } })
    setStats(r.stats)
    return r
  }, [tag])
  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <BackButton />
        <header
          className="ng-cover card overflow-hidden px-5 py-6"
          style={
            {
              '--ng-cover-a': 'radial-gradient(40% 60% at 20% 30%, var(--color-state-info), transparent)',
              '--ng-cover-b': 'radial-gradient(40% 60% at 80% 70%, var(--color-accent-brand), transparent)',
            } as React.CSSProperties
          }
        >
          <div className="ng-cover-grid" />
          <div className="relative flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-2xl border border-border bg-bg-surface/70 text-state-info backdrop-blur">
              <Hash className="size-7" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-semibold text-text-primary">#{tag}</h1>
              <p className="text-sm text-text-secondary">
                {stats ? `${stats.posts} ${stats.posts === 1 ? 'post' : 'posts'} · ${stats.people} ${stats.people === 1 ? 'person' : 'people'}` : ' '}
              </p>
            </div>
          </div>
        </header>
        <PostList list={list} empty={<FeedEmpty title={`No posts tagged #${tag} yet`} description={`Start the conversation — add #${tag} to your next post.`} />} />
      </div>
      <aside className="hidden space-y-4 lg:block">
        <TrendingTags />
        <WhoToFollow />
      </aside>
    </div>
  )
}
