import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, CheckCheck, MessageSquare, UserPlus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { ErrorState, Popover, PopoverContent, PopoverTrigger, Skeleton } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import type { FriendRequest, UnreadCount } from '@/components/social/types'

/** Bell + inbox popover: friend requests and unread DMs, live over the socket. */
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

  const total = data?.total ?? 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={total ? `Notifications (${total} unread)` : 'Notifications'}
          className="relative flex size-9 cursor-pointer items-center justify-center rounded-lg text-text-primary/60 transition-colors hover:bg-bg-app/5 hover:text-text-primary data-[state=open]:bg-bg-app/8 data-[state=open]:text-text-primary"
        >
          <Bell className="size-[17px]" />
          <AnimatePresence>
            {total > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-accent-brand px-1 text-[10px] leading-4 font-semibold text-white ring-2 ring-border"
              >
                {total > 99 ? '99+' : total}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(360px,calc(100vw-16px))] p-0">
        <div className="flex items-center justify-between border-b border-border/10 px-4 py-3">
          <p className="text-sm font-semibold text-text-primary">Inbox</p>
          {total > 0 && <span className="rounded-full bg-accent-brand/15 px-2 py-0.5 text-[11px] font-medium text-state-error">{total} new</span>}
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1.5">
          {loading && !data ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : !total ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-state-success/10 text-state-success">
                <CheckCheck className="size-5" />
              </span>
              <p className="text-sm font-medium text-text-primary">You're all caught up</p>
              <p className="text-xs text-text-primary/60">No unread messages or friend requests.</p>
            </div>
          ) : (
            <>
              {data!.requests.map((r) => (
                <Link
                  key={r.id}
                  to="/social?tab=friends"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 rounded-lg px-2.5 py-2.5 text-[13px] transition-colors hover:bg-bg-app/5"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-cyan">
                    <UserPlus className="size-4" />
                  </span>
                  <span className="min-w-0 text-text-primary/60">
                    <strong className="font-semibold text-text-primary">{r.display_name || r.username}</strong> wants to join your squad.
                  </span>
                </Link>
              ))}
              {data!.messages.map((m) => (
                <Link
                  key={m.from_user}
                  to={`/social?tab=messages&peer=${encodeURIComponent(m.from_user)}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 rounded-lg px-2.5 py-2.5 text-[13px] transition-colors hover:bg-bg-app/5"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-brand/15 text-accent-brand">
                    <MessageSquare className="size-4" />
                  </span>
                  <span className="min-w-0 text-text-primary/60">
                    <strong className="font-semibold text-text-primary">{m.from_user}</strong> sent {m.count} {m.count === 1 ? 'message' : 'messages'}
                  </span>
                </Link>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
