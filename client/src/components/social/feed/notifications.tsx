import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { AtSign, Check, Heart, MessageCircle, Quote, Repeat2, Reply, UserCheck, UserPlus } from 'lucide-react'
import { Avatar, Button, Card, EmptyState, ErrorState, Skeleton, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { cn, timeAgo } from '@/lib/utils'
import { errorText } from './lib'
import type { NotificationGroup, NotificationType, SocialUser } from './types'
import { displayName, postPath, profilePath } from './types'

export const NOTIF_META: Record<NotificationType, { icon: typeof Heart; cls: string; verb: (many: boolean) => string }> = {
  like: { icon: Heart, cls: 'bg-state-error/12 text-state-error', verb: () => 'liked your post' },
  comment_like: { icon: Heart, cls: 'bg-state-error/12 text-state-error', verb: () => 'liked your comment' },
  comment: { icon: MessageCircle, cls: 'bg-state-info/12 text-state-info', verb: () => 'commented on your post' },
  reply: { icon: Reply, cls: 'bg-state-info/12 text-state-info', verb: () => 'replied to your comment' },
  mention: { icon: AtSign, cls: 'bg-accent-brand/12 text-accent-brand', verb: () => 'mentioned you' },
  follow: { icon: UserPlus, cls: 'bg-state-success/12 text-state-success', verb: () => 'followed you' },
  follow_request: { icon: UserPlus, cls: 'bg-state-warning/12 text-state-warning', verb: (m) => (m ? 'asked to follow you' : 'asked to follow you') },
  follow_accepted: { icon: UserCheck, cls: 'bg-state-success/12 text-state-success', verb: () => 'accepted your follow request' },
  repost: { icon: Repeat2, cls: 'bg-state-success/12 text-state-success', verb: () => 'reposted your post' },
  quote: { icon: Quote, cls: 'bg-state-success/12 text-state-success', verb: () => 'quoted your post' },
}

/** "Ana", "Ana and Ben", "Ana and 3 others" */
export function actorsText(actors: SocialUser[], count: number) {
  const first = displayName(actors[0])
  if (count <= 1) return first
  if (count === 2 && actors[1]) return `${first} and ${displayName(actors[1])}`
  return `${first} and ${count - 1} others`
}

/** Notification snippets are plain text: drop markdown markers and code fences. */
export const plainSnippet = (s: string) =>
  s.replace(/```[\s\S]*?(```|$)/g, ' ').replace(/(\*\*|__|\*|`)/g, '').replace(/\s+/g, ' ').trim()

export function notifLink(g: NotificationGroup) {
  if (g.type === 'follow' || g.type === 'follow_request' || g.type === 'follow_accepted') return profilePath(g.actors[0]?.username ?? '')
  return g.post_id ? postPath(g.post_id) : '/social?tab=notifications'
}

/** Unread social notifications, live over the socket. */
export function useSocialUnread(enabled = true) {
  const socket = useSocket()
  const [unread, setUnread] = useState(0)
  const load = useCallback(() => {
    if (!enabled) return
    api
      .get<{ unread: number }>('/api/social/notifications/unread')
      .then((r) => setUnread(r.unread))
      .catch(() => {})
  }, [enabled])
  useEffect(load, [load])
  useEffect(() => {
    if (!socket || !enabled) return
    socket.on('social:notification', load)
    return () => {
      socket.off('social:notification', load)
    }
  }, [socket, enabled, load])
  return { unread, reload: load, clear: () => setUnread(0) }
}

export function NotificationsTab({ onSeen }: { onSeen?: () => void }) {
  const toast = useToast()
  const socket = useSocket()
  const [groups, setGroups] = useState<NotificationGroup[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'mentions'>('all')

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ groups: NotificationGroup[] }>('/api/social/notifications')
      setGroups(r.groups)
      setError(null)
      if (r.groups.some((g) => !g.read)) {
        await api.post('/api/social/notifications/read')
        onSeen?.()
      }
    } catch (e) {
      setError(errorText(e))
    }
  }, [onSeen])
  useEffect(() => void load(), [load])
  useEffect(() => {
    if (!socket) return
    const on = () => void load()
    socket.on('social:notification', on)
    return () => {
      socket.off('social:notification', on)
    }
  }, [socket, load])

  const answer = async (username: string, action: 'accept' | 'decline') => {
    try {
      await api.post(`/api/social/followers/${encodeURIComponent(username)}/${action}`)
      setGroups((cur) => cur?.filter((g) => !(g.type === 'follow_request' && g.actors[0]?.username === username)) ?? cur)
      toast.success(action === 'accept' ? `@${username} can now see your posts` : 'Request declined')
    } catch (e) {
      toast.error('Could not update', errorText(e))
    }
  }

  const shown = (groups ?? []).filter((g) => filter === 'all' || g.type === 'mention' || g.type === 'reply')

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center gap-1 rounded-xl border border-border bg-bg-surface-2/70 p-1" role="tablist" aria-label="Notification filter">
        {(['all', 'mentions'] as const).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn('flex-1 cursor-pointer rounded-lg py-1.5 text-sm font-medium capitalize transition-colors', filter === f ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary')}
          >
            {f === 'all' ? 'All' : 'Mentions & replies'}
          </button>
        ))}
      </div>
      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !groups ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !shown.length ? (
        <Card>
          <EmptyState icon="bell" title="Nothing here yet" description="Likes, comments, mentions, follows and reposts land here — live." />
        </Card>
      ) : (
        <ul className="card divide-y divide-border overflow-hidden">
          {shown.map((g, i) => {
            const m = NOTIF_META[g.type] ?? NOTIF_META.like
            const Icon = m.icon
            return (
              <motion.li key={`${g.type}-${g.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
                <div className={cn('relative flex gap-3 px-4 py-3.5 transition-colors hover:bg-bg-surface-2/50', !g.read && 'bg-accent-brand/[0.04]')}>
                  {!g.read && <span className="absolute top-1/2 left-1.5 size-1.5 -translate-y-1/2 rounded-full bg-accent-brand" aria-label="unread" />}
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', m.cls)}>
                    <Icon className={cn('size-[18px]', g.type === 'like' && 'fill-current')} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex -space-x-2">
                      {g.actors.map((a) => (
                        <Link key={a.username} to={profilePath(a.username)}>
                          <Avatar seed={a.username} avatar={a.avatar} src={a.avatar_url} name={displayName(a)} size="sm" ring={false} className="rounded-full ring-2 ring-bg-surface" />
                        </Link>
                      ))}
                    </div>
                    <Link to={notifLink(g)} className="mt-1.5 block text-sm text-text-secondary">
                      <strong className="font-semibold text-text-primary">{actorsText(g.actors, g.actor_count)}</strong> {m.verb(g.actor_count > 1)}
                      <span className="ml-1.5 text-xs text-text-muted">· {timeAgo(g.created_at)}</span>
                      {g.snippet && <span className="mt-1 line-clamp-2 block text-[13px] text-text-muted">{plainSnippet(g.snippet)}</span>}
                    </Link>
                    {g.type === 'follow_request' && g.actors[0] && (
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" onClick={() => void answer(g.actors[0].username, 'accept')}>
                          <Check /> Accept
                        </Button>
                        <Button size="sm" variant="subtle" onClick={() => void answer(g.actors[0].username, 'decline')}>
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
