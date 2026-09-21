import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, MessagesSquare, DoorOpen, Trophy, PlugZap, Rss } from 'lucide-react'
import { Card, EmptyState, PageHeader, Tabs } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from '@/lib/socket'
import { FriendsTab } from '@/components/social/FriendsTab'
import { MessagesTab } from '@/components/social/MessagesTab'
import { RoomsTab } from '@/components/social/RoomsTab'
import { LeaderboardTab } from '@/components/social/LeaderboardTab'
import { FeedTab } from '@/components/social/FeedTab'

const TABS = [
  { id: 'friends', label: 'Friends', icon: <Users className="size-3.5" /> },
  { id: 'messages', label: 'Messages', icon: <MessagesSquare className="size-3.5" /> },
  { id: 'rooms', label: 'Solve Rooms', icon: <DoorOpen className="size-3.5" /> },
  { id: 'feed', label: 'Feed', icon: <Rss className="size-3.5" /> },
  { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="size-3.5" /> },
]

const TAB_IDS = new Set(TABS.map((t) => t.id))

export default function SocialPage() {
  const { user } = useAuth()
  const socket = useSocket()
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') ?? 'friends'
  const tab = TAB_IDS.has(requested) ? requested : 'friends'
  const me = user?.username ?? ''

  // Register presence on every (re)connect — per API catalog socket contract.
  useEffect(() => {
    if (!socket || !me) return
    const register = () => socket.emit('register-user', { username: me })
    if (socket.connected) register()
    socket.on('connect', register)
    return () => {
      socket.off('connect', register)
    }
  }, [socket, me])

  function selectTab(id: string) {
    const next = new URLSearchParams(params)
    next.set('tab', id)
    setParams(next, { replace: true })
  }

  if (!me) {
    return (
      <div>
        <PageHeader title="The Nexus" subtitle="Friends, messages, solve rooms & rankings" />
        <Card>
          <EmptyState
            icon={<Users />}
            title="Identity required"
            description="Sign in to enter the social rift — friends, DMs and co-op rooms are keyed to your username."
          />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="The Nexus"
        subtitle="Your squad, your DMs, your co-op solve rooms — all wired to the realtime rift."
        actions={
          <span
            className={
              socket?.connected
                ? 'inline-flex items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-success uppercase'
                : 'inline-flex items-center gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-warning uppercase'
            }
            role="status"
          >
            <PlugZap className="size-3.5" />
            {socket?.connected ? 'Socket live' : 'Socket offline'}
          </span>
        }
      />

      <Tabs items={TABS} active={tab} onChange={selectTab} className="mb-5" />

      {tab === 'friends' && <FriendsTab me={me} socket={socket} />}
      {tab === 'messages' && <MessagesTab me={me} socket={socket} />}
      {tab === 'rooms' && <RoomsTab me={me} socket={socket} />}
      {tab === 'feed' && <FeedTab me={me} />}
      {tab === 'leaderboard' && <LeaderboardTab me={me} />}
    </div>
  )
}
