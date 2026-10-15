import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, CheckCheck, MessageSquare, UserPlus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { ErrorState, Popover, PopoverContent, PopoverTrigger, Skeleton } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { setFaviconBadge } from '@/lib/faviconFx'
import { useSite } from '@/context/SiteContext'
import { Icon } from '@/components/icon/Icon'
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

  // Broadcasts from the admins: unread until the inbox is opened.
  const { status, dismissed, dismiss } = useSite()
  const broadcasts = status?.broadcasts ?? []
  const unseen = broadcasts.filter((b) => !dismissed.has(`b:${b.id}`))
  useEffect(() => {
    if (open) for (const b of unseen) dismiss(`b:${b.id}`)
  }, [open, unseen, dismiss])

  const total = (data?.total ?? 0) + unseen.length

  // Mirror the unread count onto the browser tab title, e.g. "(3) NexoraGuru — …".
  useEffect(() => setFaviconBadge(total), [total])
  useEffect(() => () => setFaviconBadge(0), [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={total ? `Notifications (${total} unread)` : 'Notifications'}
          className="relative flex size-9 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-app/5 hover:text-text-primary data-[state=open]:bg-bg-app/8 data-[state=open]:text-text-primary"
        >
          <Bell className="size-[17px]" />
          <AnimatePresence>
            {total > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-accent-brand px-1 text-[10px] leading-4 font-semibold text-on-accent-brand ring-2 ring-border"
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
          ) : !total && !broadcasts.length ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-state-success/10 text-state-success">
                <CheckCheck className="size-5" />
              </span>
              <p className="text-sm font-medium text-text-primary">You're all caught up</p>
              <p className="text-xs text-text-secondary">No unread messages or friend requests.</p>
            </div>
          ) : (
            <>
              {broadcasts.map((b) => (
                <Link
                  key={`b${b.id}`}
                  to={b.link && b.link.startsWith('/') ? b.link : location.pathname}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 rounded-lg px-2.5 py-2.5 text-[13px] transition-colors hover:bg-bg-app/5"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-state-gold/12 text-state-gold">
                    <Icon name="bell" className="size-4" />
                  </span>
                  <span className="min-w-0 text-text-secondary">
                    {b.title && <strong className="block font-semibold text-text-primary">{b.title}</strong>}
                    {b.body}
                  </span>
                </Link>
              ))}
              {(data?.requests ?? []).map((r) => (
                <Link
                  key={r.id}
                  to="/social?tab=friends"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 rounded-lg px-2.5 py-2.5 text-[13px] transition-colors hover:bg-bg-app/5"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-cyan">
                    <UserPlus className="size-4" />
                  </span>
                  <span className="min-w-0 text-text-secondary">
                    <strong className="font-semibold text-text-primary">{r.display_name || r.username}</strong> wants to join your squad.
                  </span>
                </Link>
              ))}
              {(data?.messages ?? []).map((m) => (
                <Link
                  key={m.from_user}
                  to={`/social?tab=messages&peer=${encodeURIComponent(m.from_user)}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 rounded-lg px-2.5 py-2.5 text-[13px] transition-colors hover:bg-bg-app/5"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-brand/15 text-accent-brand">
                    <MessageSquare className="size-4" />
                  </span>
                  <span className="min-w-0 text-text-secondary">
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
