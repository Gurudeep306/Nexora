import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { useSocket } from '@/lib/socket'

/** Unread messages and requests, for the Messages tab's badge. */
export function useChatUnread(me: string, socket: ReturnType<typeof useSocket>) {
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

