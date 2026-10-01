import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Link } from 'react-router-dom'
import { UserPlus, UserCheck, UserX, Users, Mail, Clock } from 'lucide-react'
import type { Socket } from 'socket.io-client'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  SearchInput,
  useToast,
} from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { timeAgo } from '@/lib/utils'
import type { Friend, FriendRequest, SearchResultUser } from './types'
import { avatarSrc } from './types'

interface Props {
  me: string
  socket: Socket | null
}

export function FriendsTab({ me, socket }: Props) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState<SearchResultUser[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [presence, setPresence] = useState<Record<string, boolean>>({})
  const [busyId, setBusyId] = useState<number | string | null>(null)

  const friendsApi = useApi<{ friends: Friend[] }>(
    () => api.get('/api/friends/' + encodeURIComponent(me)),
    [me],
  )
  const requestsApi = useApi<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>(
    () => api.get(`/api/friends/${encodeURIComponent(me)}/requests`),
    [me],
  )

  // Search debounce (300ms per legacy behaviour, ≥2 chars)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (debounced.length < 2) {
      setResults(null)
      return
    }
    let cancelled = false
    setSearching(true)
    api
      .get<{ users: SearchResultUser[] }>('/api/user/search', { query: { q: debounced } })
      .then((d) => !cancelled && setResults(d.users ?? []))
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setSearching(false))
    return () => {
      cancelled = true
    }
  }, [debounced])

  // Live presence + incoming request pings
  const friendsRef = useRef(friendsApi.data?.friends ?? [])
  friendsRef.current = friendsApi.data?.friends ?? []

  const reload = useCallback(() => {
    friendsApi.refetch()
    requestsApi.refetch()
  }, [friendsApi, requestsApi])

  useEffect(() => {
    if (!socket) return
    const onOnline = ({ username }: { username: string }) =>
      setPresence((p) => ({ ...p, [username]: true }))
    const onOffline = ({ username }: { username: string }) =>
      setPresence((p) => ({ ...p, [username]: false }))
    const onFriendRequest = ({ from }: { from: string }) => {
      toast.info('Friend request', `${from} sent you a friend request`)
      requestsApi.refetch()
    }
    socket.on('user-online', onOnline)
    socket.on('user-offline', onOffline)
    socket.on('friend-request-received', onFriendRequest)
    return () => {
      socket.off('user-online', onOnline)
      socket.off('user-offline', onOffline)
      socket.off('friend-request-received', onFriendRequest)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, me])

  const friendNames = useMemo(
    () => new Set(friendsRef.current.map((f) => f.username)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [friendsApi.data],
  )
  const pendingNames = useMemo(
    () => new Set((requestsApi.data?.outgoing ?? []).map((r) => r.username)),
    [requestsApi.data],
  )

  const isOnline = useCallback(
    (username: string, dbStatus?: string) =>
      presence[username] ?? dbStatus === 'online',
    [presence],
  )

  async function sendRequest(to: string) {
    setBusyId(to)
    try {
      const res = await api.post<{ ok: boolean; error?: string }>('/api/friends/request', {
        from: me,
        to,
      })
      // Gotcha: HTTP 200 with ok:false for "Already friends" / "Request already pending"
      if (res.ok === false) {
        toast.warning('Request not sent', res.error)
      } else {
        toast.success('Request sent', `Friend request sent to ${to}`)
        socket?.emit('notify-friend-request', { to, from: me })
        requestsApi.refetch()
      }
    } catch (err) {
      toast.error('Request failed', err instanceof ApiError ? err.message : 'Unknown error')
    } finally {
      setBusyId(null)
    }
  }

  async function respond(id: number, action: 'accept' | 'reject') {
    setBusyId(id)
    try {
      await api.post(`/api/friends/${action}`, { id })
      toast.success(action === 'accept' ? 'Friend added' : 'Request declined')
      reload()
    } catch (err) {
      toast.error('Action failed', err instanceof ApiError ? err.message : 'Unknown error')
    } finally {
      setBusyId(null)
    }
  }

  const friends = friendsApi.data?.friends ?? []
  const incoming = requestsApi.data?.incoming ?? []
  const outgoing = requestsApi.data?.outgoing ?? []

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
      {/* ── Friends list ── */}
      <div className="min-w-0 space-y-5">
        <Card>
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-sm tracking-wider text-foreground uppercase">
              Your Squad
            </h2>
            <p className="mt-0.5 text-xs text-foreground-dim">
              {friends.length} friend{friends.length === 1 ? '' : 's'} · live presence via socket
            </p>
          </div>
          <div className="p-4">
            {friendsApi.loading ? (
              <LoadingBlock rows={3} />
            ) : friendsApi.error ? (
              <ErrorState message={friendsApi.error} onRetry={friendsApi.refetch} />
            ) : friends.length === 0 ? (
              <EmptyState
                icon={<Users />}
                title="No allies yet"
                description="Search for a coder on the right and send a friend request."
              />
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <AnimatePresence initial={false}>
                  {friends.map((f, i) => (
                    <motion.li
                      key={f.username}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/50 px-3 py-2.5 transition-colors duration-200 hover:border-primary/60">
                        <Avatar
                          seed={f.username}
                          avatar={f.avatar}
                          src={avatarSrc(f)}
                          name={f.display_name || f.username}
                          size="sm"
                          online={isOnline(f.username, f.status)}
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/profile/${encodeURIComponent(f.username)}`}
                            className="block cursor-pointer truncate text-sm font-semibold text-foreground transition-colors hover:text-primary-bright"
                          >
                            {f.display_name || f.username}
                          </Link>
                          <p className="truncate text-xs text-foreground-faint">
                            @{f.username}
                            {isOnline(f.username, f.status) ? (
                              <span className="ml-1.5 text-success">· online</span>
                            ) : f.last_seen ? (
                              <span className="ml-1.5">· seen {timeAgo(f.last_seen)}</span>
                            ) : null}
                          </p>
                        </div>
                        {isOnline(f.username, f.status) ? (
                          <Badge variant="success">Live</Badge>
                        ) : (
                          <Badge variant="default">Offline</Badge>
                        )}
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </Card>

        {/* ── Search ── */}
        <Card>
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-sm tracking-wider text-foreground uppercase">
              Find Coders
            </h2>
          </div>
          <div className="space-y-3 p-4">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery('')}
              placeholder="Search by username (min 2 chars)…"
              aria-label="Search users"
            />
            {searching && <LoadingBlock rows={2} />}
            {!searching && results && results.length === 0 && (
              <p className="px-1 text-xs text-foreground-faint">No coders match “{debounced}”.</p>
            )}
            {!searching && results && results.length > 0 && (
              <ul className="space-y-2">
                {results.map((u) => (
                  <li
                    key={u.username}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                  >
                    <Avatar
                      seed={u.username}
                      avatar={u.avatar}
                      src={avatarSrc(u)}
                      name={u.display_name || u.username}
                      size="sm"
                      online={isOnline(u.username, u.status)}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/profile/${encodeURIComponent(u.username)}`}
                        className="block cursor-pointer truncate text-sm font-semibold text-foreground transition-colors hover:text-primary-bright"
                      >
                        {u.display_name || u.username}
                      </Link>
                      <p className="truncate text-xs text-foreground-faint">@{u.username}</p>
                    </div>
                    {u.username === me ? (
                      <Badge variant="primary">You</Badge>
                    ) : friendNames.has(u.username) ? (
                      <Badge variant="success">
                        <UserCheck /> Friends
                      </Badge>
                    ) : pendingNames.has(u.username) ? (
                      <Badge variant="warning">
                        <Clock /> Pending
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busyId === u.username}
                        onClick={() => void sendRequest(u.username)}
                      >
                        <UserPlus /> Add
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* ── Requests ── */}
      <div className="space-y-5">
        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-sm tracking-wider text-foreground uppercase">
              Incoming
            </h2>
            {incoming.length > 0 && <Badge variant="accent">{incoming.length}</Badge>}
          </div>
          <div className="p-4">
            {requestsApi.loading ? (
              <LoadingBlock rows={2} />
            ) : incoming.length === 0 ? (
              <EmptyState
                className="py-8"
                icon={<Mail />}
                title="No pending requests"
                description="Incoming friend requests will appear here."
              />
            ) : (
              <ul className="space-y-2">
                {incoming.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg border border-accent/30 bg-surface-2/60 px-3 py-2.5"
                  >
                    <Avatar seed={r.username} avatar={r.avatar} src={avatarSrc(r)} name={r.display_name || r.username} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {r.display_name || r.username}
                      </p>
                      <p className="truncate text-xs text-foreground-faint">@{r.username}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="icon-sm"
                        variant="primary"
                        aria-label={`Accept request from ${r.username}`}
                        loading={busyId === r.id}
                        onClick={() => void respond(r.id, 'accept')}
                      >
                        <UserCheck />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Reject request from ${r.username}`}
                        disabled={busyId === r.id}
                        onClick={() => void respond(r.id, 'reject')}
                      >
                        <UserX />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-sm tracking-wider text-foreground uppercase">
              Sent Requests
            </h2>
          </div>
          <div className="p-4">
            {outgoing.length === 0 ? (
              <p className="px-1 text-xs text-foreground-faint">
                Outgoing requests appear here until they are accepted.
              </p>
            ) : (
              <ul className="space-y-2">
                {outgoing.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                  >
                    <Avatar seed={r.username} avatar={r.avatar} src={avatarSrc(r)} name={r.display_name || r.username} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">@{r.username}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busyId === r.id}
                      onClick={() => void respond(r.id, 'reject')}
                      aria-label={`Cancel request to ${r.username}`}
                    >
                      Cancel
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
