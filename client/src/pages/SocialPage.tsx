import { useSite } from '@/context/SiteContext'
import { useCallback, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { DoorOpen, PenSquare, Radio, Rss } from 'lucide-react'
import { Avatar, Button, Card, EmptyState, PageHeader } from '@/components/ui'
import { cn } from '@/lib/utils'
import './social-page.css'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from '@/lib/socket'
import { api } from '@/lib/api'
import { FriendsTab } from '@/components/social/FriendsTab'
import { RoomsTab } from '@/components/social/RoomsTab'
import { LeaderboardTab } from '@/components/social/LeaderboardTab'
import { FeedTab } from '@/components/social/FeedTab'
import { NotificationsTab, useSocialUnread } from '@/components/social/feed/notifications'
import { FeedEmpty, PostList, usePostList } from '@/components/social/feed/PostList'
import { FollowButton, SocialSearch, UserRow } from '@/components/social/feed/People'
import type { FeedPage, SocialUser } from '@/components/social/feed/types'
import { Icon } from '@/components/icon/Icon'
import { useChatUnread } from '@/components/social/useChatUnread'

const TAB_IDS = new Set(['feed', 'notifications', 'friends', 'messages', 'rooms', 'leaderboard', 'search'])

export default function SocialPage() {
  const { user } = useAuth()
  const socket = useSocket()
  const [params, setParams] = useSearchParams()
  // Tabs closed in Admin → Site map (social.messages…) leave the row.
  const { pathOn } = useSite()
  const tabOn = (id: string) => id === 'feed' || id === 'search' || pathOn(`/social?tab=${id}`)
  const requested = params.get('tab') ?? 'feed'
  const tab = TAB_IDS.has(requested) && tabOn(requested) ? requested : 'feed'
  const me = user?.username ?? ''
  const { unread, clear } = useSocialUnread(!!me)
  const chatUnread = useChatUnread(me, socket)

  const TABS = [
    { id: 'feed', label: 'Feed', icon: <Rss className="size-4" aria-hidden="true" /> },
    { id: 'notifications', label: 'Notifications', icon: <Icon name="bell" className="size-4" />, badge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined },
    { id: 'messages', label: 'Messages', icon: <Icon name="messages" className="size-4" />, badge: chatUnread > 0 ? (chatUnread > 99 ? '99+' : chatUnread) : undefined },
    { id: 'friends', label: 'Friends', icon: <Icon name="users" className="size-4" /> },
    { id: 'rooms', label: 'Solve rooms', icon: <DoorOpen className="size-4" aria-hidden="true" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Icon name="trophy" className="size-4" /> },
  ]

  const navigate = useNavigate()
  function selectTab(id: string) {
    // Messages have their own full-window page.
    if (id === 'messages') return navigate('/messages')
    const next = new URLSearchParams(params)
    next.set('tab', id)
    next.delete('q')
    setParams(next, { replace: true })
  }

  // Old links (?tab=messages&c=…) open the Messages page.
  if (requested === 'messages') {
    const rest = new URLSearchParams(params)
    rest.delete('tab')
    const q = rest.toString()
    return <Navigate to={`/messages${q ? `?${q}` : ''}`} replace />
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

  const displayName = typeof user?.display_name === 'string' && user.display_name ? user.display_name : me
  const current = TABS.find((t) => t.id === (tab === 'search' ? 'feed' : tab)) ?? TABS[0]
  const LINES: Record<string, string> = {
    feed: 'What people you follow are learning and sharing.',
    notifications: 'Likes, replies, follows and mentions.',
    friends: 'Your friends, who is online, and requests.',
    rooms: 'Solve a problem together, live.',
    leaderboard: 'This week’s most active learners.',
  }
  const newPost = () => {
    if (tab !== 'feed') selectTab('feed')
    // The composer opens from its box at the top of the feed.
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      document.getElementById('composer-text')?.focus()
    }, tab === 'feed' ? 0 : 250)
  }

  return (
    <div className="soc">
      <aside className="soc-rail" aria-label="Community sections">
        <Link to="/profile" className="soc-me">
          <Avatar src={typeof user?.avatar_url === 'string' ? user.avatar_url : undefined} avatar={user?.avatar} name={displayName} seed={me} size="lg" />
          <span className="soc-me-text">
            <span className="soc-me-name">{displayName}</span>
            <span className="soc-me-handle">@{me}</span>
          </span>
        </Link>
        <nav className="soc-nav">
          {TABS.filter((t) => tabOn(t.id)).map((t) => (
            <button key={t.id} type="button" className={cn('soc-nav-item', t.id === current.id && 'is-on')} aria-current={t.id === current.id ? 'page' : undefined} onClick={() => selectTab(t.id)}>
              {t.icon}
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="soc-badge">{t.badge}</span>}
            </button>
          ))}
          <Link to="/live" className="soc-nav-item">
            <Radio className="size-4" aria-hidden="true" />
            <span>Live rooms</span>
          </Link>
        </nav>
        <Button className="soc-post" onClick={newPost}>
          <PenSquare aria-hidden="true" /> New post
        </Button>
        <p className={cn('soc-conn', socket?.connected ? 'is-on' : 'is-off')} role="status">
          <span aria-hidden="true" /> {socket?.connected ? 'Connected — updates arrive live' : 'Reconnecting…'}
        </p>
      </aside>

      <div className="soc-main">
        <header className="soc-head">
          <p className="soc-eyebrow">Community</p>
          <h1 className="soc-title">{tab === 'search' ? 'Search' : current.label}</h1>
          <p className="soc-line">{tab === 'search' ? 'People and posts that match.' : LINES[current.id] ?? ''}</p>
        </header>
        {/* Phone: the sections as a row of chips under the title. */}
        <div className="soc-chips" role="tablist" aria-label="Community sections">
          {TABS.filter((t) => tabOn(t.id)).map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === current.id} className={cn('soc-chip', t.id === current.id && 'is-on')} onClick={() => selectTab(t.id)}>
              {t.icon}
              {t.label}
              {t.badge !== undefined && <span className="soc-badge">{t.badge}</span>}
            </button>
          ))}
          <Link to="/live" className="soc-chip">
            <Radio className="size-3.5" aria-hidden="true" /> Live
          </Link>
        </div>

        {tab === 'feed' && <FeedTab me={me} />}
        {tab === 'search' && <SearchResults q={params.get('q') ?? ''} />}
        {tab === 'notifications' && <NotificationsTab onSeen={clear} />}
        {tab === 'friends' && <FriendsTab me={me} socket={socket} />}
        {tab === 'rooms' && <RoomsTab me={me} socket={socket} />}
        {tab === 'leaderboard' && <LeaderboardTab me={me} />}
      </div>
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
