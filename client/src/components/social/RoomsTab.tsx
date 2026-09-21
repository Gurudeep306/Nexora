import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Plus, DoorOpen, Users, Code2, ArrowLeft, Trash2, Radio } from 'lucide-react'
import type { Socket } from 'socket.io-client'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { api, ApiError } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { cn, timeAgo } from '@/lib/utils'
import type { Room, RoomMessage } from './types'

interface Props {
  me: string
  socket: Socket | null
}

export function RoomsTab({ me, socket }: Props) {
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)

  const roomsApi = useApi<{ rooms: Room[] }>(() => api.get('/api/rooms'), [])

  return (
    <div>
      {!activeRoomId ? (
        <RoomList
          me={me}
          rooms={roomsApi.data?.rooms ?? []}
          loading={roomsApi.loading}
          error={roomsApi.error}
          onRetry={roomsApi.refetch}
          onCreated={() => roomsApi.refetch()}
          onEnter={(id) => setActiveRoomId(id)}
        />
      ) : (
        <RoomView
          key={activeRoomId}
          me={me}
          socket={socket}
          roomId={activeRoomId}
          onExit={() => {
            setActiveRoomId(null)
            roomsApi.refetch()
          }}
        />
      )}
    </div>
  )
}

/* ════════════════ Room list + create ════════════════ */

function RoomList({
  me,
  rooms,
  loading,
  error,
  onRetry,
  onCreated,
  onEnter,
}: {
  me: string
  rooms: Room[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onCreated: () => void
  onEnter: (id: string) => void
}) {
  const toast = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [problemId, setProblemId] = useState('')
  const [maxMembers, setMaxMembers] = useState('5')
  const [creating, setCreating] = useState(false)
  const [closingRoom, setClosingRoom] = useState<Room | null>(null)
  const [closing, setClosing] = useState(false)

  async function create() {
    if (!name.trim()) return
    setCreating(true)
    try {
      const d = await api.post<{ room: Room }>('/api/rooms', {
        name: name.trim().slice(0, 50),
        creator: me,
        problem_id: problemId.trim() ? Number(problemId) : null,
        is_voice: false,
        max_members: Math.max(2, Math.min(10, Number(maxMembers) || 5)),
      })
      toast.success('Room created', `Room code ${d.room.id} — squad, assemble.`)
      setCreateOpen(false)
      setName('')
      setProblemId('')
      onCreated()
      onEnter(d.room.id)
    } catch (err) {
      toast.error('Create failed', err instanceof ApiError ? err.message : 'Unknown error')
    } finally {
      setCreating(false)
    }
  }

  async function closeRoom() {
    if (!closingRoom) return
    setClosing(true)
    try {
      await api.delete(`/api/rooms/${closingRoom.id}`)
      toast.success('Room closed')
      setClosingRoom(null)
      onCreated()
    } catch (err) {
      toast.error('Close failed', err instanceof ApiError ? err.message : 'Unknown error')
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs tracking-wider text-foreground-faint uppercase">
          Open solve rooms · member counts are live (in-memory)
        </p>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus /> New Room
        </Button>
      </div>

      {loading ? (
        <LoadingBlock rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : rooms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<DoorOpen />}
            title="No open rooms"
            description="Spin up a co-op solve room and invite your squad."
            action={
              <Button variant="accent" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus /> Create the first room
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.3) }}
            >
              <Card interactive glow={(r.member_count ?? 0) > 0} className="flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm tracking-wide text-foreground">
                      {r.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-foreground-faint tabular-nums">
                      #{r.id} · by @{r.creator}
                    </p>
                  </div>
                  <Badge variant={(r.member_count ?? 0) > 0 ? 'success' : 'default'} className="tabular-nums">
                    <Users /> {r.member_count ?? 0}/{r.max_members ?? 5}
                  </Badge>
                </div>
                {r.problem_title && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface-2/50 px-2.5 py-1.5">
                    {r.problem_platform && <PlatformBadge platform={r.problem_platform} />}
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground-dim">
                      {r.problem_title}
                    </span>
                    {r.problem_rating != null && (
                      <span className="font-mono text-xs text-primary-bright tabular-nums">
                        {r.problem_rating}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-auto flex items-center gap-2 pt-4">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => onEnter(r.id)}>
                    <DoorOpen /> Enter
                  </Button>
                  {r.creator === me && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Close room ${r.name}`}
                      onClick={() => setClosingRoom(r)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Solve Room">
        <div className="space-y-4">
          <Field label="Room name" hint="Max 50 characters">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              placeholder="e.g. Rift Raid — Graphs"
              maxLength={50}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Problem ID" hint="Optional (platform problem rowid)">
              <Input
                value={problemId}
                onChange={(e) => setProblemId(e.target.value.replace(/\D/g, ''))}
                placeholder="42"
                inputMode="numeric"
              />
            </Field>
            <Field label="Max members">
              <Select value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)}>
                {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="accent" onClick={() => void create()} loading={creating} disabled={!name.trim()}>
              <Plus /> Create Room
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={closingRoom != null}
        onClose={() => setClosingRoom(null)}
        onConfirm={() => void closeRoom()}
        title="Close room?"
        message={<>Room <span className="font-mono text-foreground">#{closingRoom?.id}</span> will be closed for everyone.</>}
        confirmLabel="Close room"
        danger
        loading={closing}
      />
    </div>
  )
}

/* ════════════════ Inside a room: chat + synced code ════════════════ */

function RoomView({
  me,
  socket,
  roomId,
  onExit,
}: {
  me: string
  socket: Socket | null
  roomId: string
  onExit: () => void
}) {
  const toast = useToast()
  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<string[]>([])
  const [chat, setChat] = useState<RoomMessage[]>([])
  const [chatDraft, setChatDraft] = useState('')
  const [code, setCode] = useState('')
  const [lastCoder, setLastCoder] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const codeRef = useRef('')
  const emitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatScroll = useRef<HTMLDivElement | null>(null)
  const meRef = useRef(me)
  meRef.current = me

  // Load room + history
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      api.get<{ room: Room }>(`/api/rooms/${roomId}`),
      api.get<{ messages: RoomMessage[] }>(`/api/rooms/${roomId}/messages`),
    ])
      .then(([rd, md]) => {
        if (cancelled) return
        setRoom(rd.room)
        setMembers(rd.room.members ?? [])
        setChat(md.messages ?? [])
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load room')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [roomId])

  // Join socket room, wire listeners, leave on unmount
  useEffect(() => {
    if (!socket) return
    socket.emit('join-solve-room', { roomId, username: meRef.current })
    const onMembers = ({ roomId: rid, members: m }: { roomId: string; members: string[] }) => {
      if (rid === roomId) setMembers(m)
    }
    const onChat = (msg: {
      roomId: string
      username: string
      content: string
      display_name?: string
      avatar?: string
      created_at: string
    }) => {
      if (msg.roomId !== roomId) return
      setChat((prev) => [
        ...prev,
        {
          id: Date.now(),
          room_id: msg.roomId,
          username: msg.username,
          content: msg.content,
          created_at: msg.created_at,
          display_name: msg.display_name,
          avatar: msg.avatar,
        },
      ])
    }
    const onCode = ({ code: c, username }: { code: string; username: string }) => {
      codeRef.current = c
      setCode(c)
      setLastCoder(username)
    }
    socket.on('room-members-updated', onMembers)
    socket.on('room-chat-message', onChat)
    socket.on('room-code-update', onCode)
    return () => {
      socket.off('room-members-updated', onMembers)
      socket.off('room-chat-message', onChat)
      socket.off('room-code-update', onCode)
      socket.emit('leave-solve-room', { roomId, username: meRef.current })
    }
  }, [socket, roomId])

  useEffect(() => {
    chatScroll.current?.scrollTo({ top: chatScroll.current.scrollHeight })
  }, [chat])

  const sendChat = useCallback(() => {
    const content = chatDraft.trim()
    if (!content) return
    if (!socket?.connected) {
      toast.warning('Offline', 'Room chat needs the realtime socket.')
      return
    }
    socket.emit('room-chat', { roomId, username: meRef.current, content: content.slice(0, 2000) })
    setChatDraft('')
    // Optimistic echo is unnecessary — server broadcasts back to sender too (io.to room).
  }, [chatDraft, socket, roomId, toast])

  function onCodeChange(value: string) {
    codeRef.current = value
    setCode(value)
    setLastCoder(meRef.current)
    // Throttle code-sync emits to ~4/sec
    if (emitTimer.current) clearTimeout(emitTimer.current)
    emitTimer.current = setTimeout(() => {
      socket?.emit('room-code-change', { roomId, code: codeRef.current, username: meRef.current })
    }, 250)
  }

  if (loading) return <LoadingBlock rows={6} />
  if (error)
    return (
      <Card>
        <ErrorState message={error} onRetry={onExit} />
      </Card>
    )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onExit} aria-label="Leave room">
          <ArrowLeft /> Leave
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-base tracking-wide text-foreground">
            {room?.name}
            <span className="ml-2 font-mono text-xs text-foreground-faint">#{room?.id}</span>
          </h2>
          {room?.problem_title && (
            <p className="truncate text-xs text-foreground-dim">
              {room.problem_title}
              {room.problem_rating != null && (
                <span className="ml-1.5 font-mono text-primary-bright tabular-nums">
                  ({room.problem_rating})
                </span>
              )}
            </p>
          )}
        </div>
        {lastCoder && lastCoder !== me && (
          <Badge variant="cyan">
            <Code2 /> {lastCoder} editing
          </Badge>
        )}
        <Badge variant={socket?.connected ? 'success' : 'warning'}>
          <Radio /> {socket?.connected ? 'synced' : 'socket offline'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        {/* Code panel */}
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
              <Code2 className="size-3.5" /> Synced Code
            </span>
            {room?.problem_platform && <PlatformBadge platform={room.problem_platform} />}
          </div>
          <Textarea
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            spellCheck={false}
            aria-label="Shared code editor"
            placeholder="// Code here syncs to every room member in realtime…"
            className="min-h-[380px] flex-1 resize-none rounded-none border-0 bg-background font-mono text-[13px] leading-relaxed focus:ring-0 xl:min-h-[440px]"
          />
        </Card>

        {/* Side: members + chat */}
        <div className="flex min-h-0 flex-col gap-4">
          <Card>
            <div className="border-b border-border px-4 py-2.5">
              <span className="text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
                Members · {members.length}/{room?.max_members ?? 5}
              </span>
            </div>
            <ul className="space-y-1.5 p-3">
              {members.length === 0 && (
                <li className="px-1 text-xs text-foreground-faint">No one here yet…</li>
              )}
              {members.map((u) => (
                <li key={u} className="flex items-center gap-2 text-sm">
                  <Avatar seed={u} name={u} size="xs" online />
                  <span className={cn('truncate', u === me ? 'font-semibold text-primary-bright' : 'text-foreground-dim')}>
                    {u === me ? `${u} (you)` : u}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex min-h-[300px] flex-1 flex-col overflow-hidden">
            <div className="border-b border-border px-4 py-2.5">
              <span className="text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
                Room Chat
              </span>
            </div>
            <div ref={chatScroll} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {chat.length === 0 && (
                <p className="px-1 text-xs text-foreground-faint">
                  Chat is quiet. Break the silence.
                </p>
              )}
              {chat.map((m, idx) => (
                <div key={`${m.created_at}-${idx}`} className="text-sm">
                  <span className={cn('font-semibold', m.username === me ? 'text-primary-bright' : 'text-cyan')}>
                    {m.display_name || m.username}
                  </span>
                  <span className="ml-1.5 text-[10px] text-foreground-faint tabular-nums">
                    {timeAgo(m.created_at)}
                  </span>
                  <p className="break-words text-foreground-dim">{m.content}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-2.5">
              <div className="flex items-center gap-2">
                <Input
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value.slice(0, 2000))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      sendChat()
                    }
                  }}
                  placeholder="Message the room…"
                  aria-label="Room chat message"
                  className="h-9 flex-1"
                />
                <Button size="icon-sm" variant="accent" onClick={sendChat} disabled={!chatDraft.trim()} aria-label="Send room chat message">
                  <Plus className="rotate-45" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
