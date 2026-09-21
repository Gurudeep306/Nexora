import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, MessageSquare, UserPlus } from 'lucide-react'
import { EmptyState, ErrorState, LoadingBlock, Modal, Tooltip } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import type { FriendRequest, UnreadCount } from '@/components/social/types'

export function Notifications() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const socket = useSocket()
  const location = useLocation()
  const username = user?.username ?? ''
  const { data, loading, error, refetch } = useApi(async () => {
    const [requests, messages] = await Promise.all([
      api.get<{ incoming: FriendRequest[] }>(`/api/friends/${encodeURIComponent(username)}/requests`),
      api.get<{ counts: UnreadCount[]; total: number }>(`/api/messages/unread/${encodeURIComponent(username)}`),
    ])
    return { requests: requests.incoming, messages: messages.counts, total: requests.incoming.length + messages.total }
  }, [username, open, location.key], { skip: !username })

  useEffect(() => {
    if (!socket) return
    socket.on('friend-request-received', refetch)
    socket.on('new-message', refetch)
    return () => {
      socket.off('friend-request-received', refetch)
      socket.off('new-message', refetch)
    }
  }, [socket, refetch])

  return (
    <>
      <Tooltip label="Notifications">
        <button onClick={() => setOpen(true)} aria-label="Notifications" className="relative cursor-pointer rounded-lg p-2 text-foreground-dim transition-colors hover:bg-surface-2 hover:text-foreground">
          <Bell className="size-[18px]" />
          {!!data?.total && <span className="absolute right-0 top-0 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-white">{data.total > 99 ? '99+' : data.total}</span>}
        </button>
      </Tooltip>
      <Modal open={open} onClose={() => setOpen(false)} title="Notifications">
        {loading ? <LoadingBlock rows={3} /> : error ? <ErrorState message={error} onRetry={refetch} /> : !data?.total ? (
          <EmptyState icon={<Bell />} title="You're all caught up" description="No unread messages or pending friend requests." />
        ) : (
          <div className="divide-y divide-border">
            {data.requests.map((request) => (
              <Link key={request.id} to="/social?tab=friends" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md py-3 text-sm hover:bg-surface-2">
                <UserPlus className="size-5 shrink-0 text-cyan" />
                <span className="min-w-0 break-words"><strong>{request.display_name || request.username}</strong> sent you a friend request.</span>
              </Link>
            ))}
            {data.messages.map((message) => (
              <Link key={message.from_user} to={`/social?tab=messages&peer=${encodeURIComponent(message.from_user)}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md py-3 text-sm hover:bg-surface-2">
                <MessageSquare className="size-5 shrink-0 text-primary-bright" />
                <span className="min-w-0 break-words"><strong>{message.from_user}</strong>: {message.count} unread {message.count === 1 ? 'message' : 'messages'}</span>
              </Link>
            ))}
          </div>
        )}
      </Modal>
    </>
  )
}
