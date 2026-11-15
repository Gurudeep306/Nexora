import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, EmptyState } from '@/components/ui'
import { api } from '@/lib/api'
import { PostCard } from '@/components/social/feed/PostCard'
import { PostSkeleton } from '@/components/social/feed/PostList'
import { TrendingTags, WhoToFollow } from '@/components/social/feed/People'
import { errorText } from '@/components/social/feed/lib'
import type { Post } from '@/components/social/feed/types'

/** A single post with its full comment thread: /social/post/:id */
export default function PostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setPost(null)
    setError(null)
    api
      .get<{ post: Post }>(`/api/social/posts/${encodeURIComponent(id ?? '')}`)
      .then((r) => setPost(r.post))
      .catch((e) => setError(errorText(e, 'Post not found')))
  }, [id])
  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-3">
        {error ? (
          <Card>
            <EmptyState icon="social" title="This post isn't available" description="It may have been deleted or removed, or its author's posts are private." />
          </Card>
        ) : !post ? (
          <PostSkeleton />
        ) : (
          <PostCard post={post} expanded onChange={setPost} onRemove={() => navigate('/social')} />
        )}
      </div>
      <aside className="hidden space-y-4 lg:block">
        <TrendingTags />
        <WhoToFollow />
      </aside>
    </div>
  )
}
