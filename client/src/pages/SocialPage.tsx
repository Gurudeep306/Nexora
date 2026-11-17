import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DoorOpen, PlugZap, Rss } from 'lucide-react'
import { Card, EmptyState, PageHeader, Tabs } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from '@/lib/socket'
import { api } from '@/lib/api'
import { FriendsTab } from '@/components/social/FriendsTab'
import { MessagesTab } from '@/components/social/MessagesTab'
import { RoomsTab } from '@/components/social/RoomsTab'
import { LeaderboardTab } from '@/components/social/LeaderboardTab'
import { FeedTab } from '@/components/social/FeedTab'
import { NotificationsTab, useSocialUnread } from '@/components/social/feed/notifications'
import { FeedEmpty, PostList, usePostList } from '@/components/social/feed/PostList'
import { FollowButton, SocialSearch, UserRow } from '@/components/social/feed/People'
import type { FeedPage, SocialUser } from '@/components/social/feed/types'
import { Icon } from '@/components/icon/Icon'

const TAB_IDS = new Set(['feed', 'notifications', 'friends', 'messages', 'rooms', 'leaderboard', 'search'])

/** Unread messages and requests, for the Messages tab's badge. */
function useChatUnread(me: string, socket: ReturnType<typeof useSocket>) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!me) return
    let live = true
    const load = () =>
      api
        .get<{ total: number; requests: number }>('/api/chat/unread')
        .then((r) => live && setN(r.total + r.requests))
        .catch(() => {})
    const t = setTimeout(load, 0)
    socket?.on('chat:message', load)
    socket?.on('chat:read', load)
    socket?.on('chat:conversation', load)
    return () => {
      live = false
      clearTimeout(t)
      socket?.off('chat:message', load)
      socket?.off('chat:read', load)
      socket?.off('chat:conversation', load)
    }
  }, [me, socket])
  return n
}

export default function SocialPage() {
  const { user } = useAuth()
  const socket = useSocket()
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') ?? 'feed'
  const tab = TAB_IDS.has(requested) ? requested : 'feed'
  const me = user?.username ?? ''
  const { unread, clear } = useSocialUnread(!!me)
  const chatUnread = useChatUnread(me, socket)

  const TABS = [
    { id: 'feed', label: 'Feed', icon: <Rss className="size-3.5" /> },
    { id: 'notifications', label: 'Notifications', icon: <Icon name="bell" className="size-3.5" />, badge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined },
    { id: 'friends', label: 'Friends', icon: <Icon name="users" className="size-3.5" /> },
    { id: 'messages', label: 'Messages', icon: <Icon name="messages" className="size-3.5" />, badge: chatUnread > 0 ? (chatUnread > 99 ? '99+' : chatUnread) : undefined },
    { id: 'rooms', label: 'Solve Rooms', icon: <DoorOpen className="size-3.5" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Icon name="trophy" className="size-3.5" /> },
  ]

  function selectTab(id: string) {
    const next = new URLSearchParams(params)
    next.set('tab', id)
    next.delete('q')
    setParams(next, { replace: true })
  }

  if (!me) {
    return (
      <div>
        <PageHeader icon="social" title="Community" subtitle="Posts, friends, messages, solve rooms & rankings" />
        <Card>
          <EmptyState icon="users" title="Sign in to join the community" description="Share wins, follow learners and solve together — it's all tied to your account." />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        icon="social"
        title="Community"
        subtitle="Share what you learned, follow other learners and solve problems together."
        actions={
          <span
            className={
              socket?.connected
                ? 'so-live inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-text-secondary [&_svg]:text-state-success'
                : 'so-live inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-text-secondary [&_svg]:text-state-warning'
            }
            role="status"
          >
            <PlugZap className="size-3.5" />
            {socket?.connected ? 'Live' : 'Offline'}
          </span>
        }
      />

      <Tabs items={TABS} active={tab === 'search' ? 'feed' : tab} onChange={selectTab} className="mb-5" />

      {tab === 'feed' && <FeedTab me={me} />}
      {tab === 'search' && <SearchResults q={params.get('q') ?? ''} />}
      {tab === 'notifications' && <NotificationsTab onSeen={clear} />}
      {tab === 'friends' && <FriendsTab me={me} socket={socket} />}
      {tab === 'messages' && <MessagesTab me={me} socket={socket} />}
      {tab === 'rooms' && <RoomsTab me={me} socket={socket} />}
      {tab === 'leaderboard' && <LeaderboardTab me={me} />}
    </div>
  )
}

function SearchResults({ q }: { q: string }) {
  const [users, setUsers] = useState<(SocialUser & { followers?: number })[]>([])
  const fetchPage = useCallback(async (): Promise<FeedPage> => {
    const r = await api.get<{ users: SocialUser[]; items: FeedPage['items'] }>('/api/social/search', { query: { q } })
    setUsers(r.users)
    return { items: r.items, next: null }
  }, [q])
  const list = usePostList(fetchPage, [q])
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SocialSearch key={q} initial={q} />
      {users.length > 0 && (
        <section className="card p-2" aria-label="People">
          <h2 className="px-2 pt-1 pb-1 text-xs font-semibold tracking-wider text-text-muted uppercase">People</h2>
          {users.map((u) => (
            <UserRow key={u.username} u={u} right={<FollowButton username={u.username} state={null} />} />
          ))}
        </section>
      )}
      <PostList list={list} empty={<FeedEmpty title={`No posts match “${q}”`} description="Try another word, a #hashtag or someone's @handle." />} />
    </div>
  )
}
