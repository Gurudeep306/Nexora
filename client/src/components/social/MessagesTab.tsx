import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Send, SmilePlus, ArrowLeft, MessagesSquare } from 'lucide-react'
import type { Socket } from 'socket.io-client'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Textarea,
  useToast,
} from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { cn, timeAgo } from '@/lib/utils'
import type { Friend, Message, Reactions, UnreadCount } from './types'
import { avatarSrc } from './types'

interface Props {
  me: string
  socket: Socket | null
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥']
const TYPING_IDLE_MS = 1500

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-primary-bright"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  )
}

export function MessagesTab({ me, socket }: Props) {
  const toast = useToast()
  const [params] = useSearchParams()
  const [peer, setPeer] = useState<string | null>(params.get('peer'))
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [loadingThread, setLoadingThread] = useState(false)
  const [threadError, setThreadError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [peerTyping, setPeerTyping] = useState(false)
  const [reactions, setReactions] = useState<Record<number, Reactions>>({})
  const [reactingTo, setReactingTo] = useState<number | null>(null)
  const [busyReact, setBusyReact] = useState<number | null>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingActive = useRef(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const peerRef = useRef<string | null>(null)
  peerRef.current = peer

  const friendsApi = useApi<{ friends: Friend[] }>(
    () => api.get('/api/friends/' + encodeURIComponent(me)),
    [me],
  )
  const unreadApi = useApi<{ counts?: UnreadCount[]; total?: number }>(
    () => api.get('/api/messages/unread/' + encodeURIComponent(me)),
    [me],
  )

  const unreadMap = new Map<string, number>()
  for (const c of unreadApi.data?.counts ?? []) unreadMap.set(c.from_user, c.count)

  const loadThread = useCallback(
    async (other: string) => {
      setLoadingThread(true)
      setThreadError(null)
      setMessages(null)
      try {
        // Gotcha: this endpoint silently marks incoming messages as read.
        const d = await api.get<{ messages: Message[] }>(
          `/api/messages/${encodeURIComponent(me)}/${encodeURIComponent(other)}`,
        )
        setMessages(d.messages ?? [])
        unreadApi.refetch()
        // Push read receipts to the author in realtime (REST GET only updates the DB).
        socket?.emit('mark-messages-read', { from: other, to: me })
        // Reactions live in server memory — fetch for the most recent messages.
        const recent = (d.messages ?? []).slice(-30)
        const entries = await Promise.all(
          recent.map(async (m) => {
            try {
              const r = await api.get<{ reactions: Reactions }>(`/api/messages/${m.id}/reactions`)
              return [m.id, r.reactions ?? {}] as const
            } catch {
              return [m.id, {}] as const
            }
          }),
        )
        setReactions(Object.fromEntries(entries.filter(([, r]) => Object.keys(r).length > 0)))
      } catch (err) {
        setThreadError(err instanceof ApiError ? err.message : 'Failed to load conversation')
      } finally {
        setLoadingThread(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me, socket],
  )

  function openThread(other: string) {
    setPeer(other)
    setDraft('')
    setReactions({})
  }

  useEffect(() => {
    if (peer) void loadThread(peer)
  }, [peer, loadThread])

  // Scroll thread to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, peerTyping])

  const stopTyping = useCallback(() => {
    if (typingActive.current && peerRef.current) {
      socket?.emit('typing-stop', { from: me, to: peerRef.current })
    }
    typingActive.current = false
    if (typingTimer.current) clearTimeout(typingTimer.current)
  }, [socket, me])

  // Socket wiring: incoming DMs, typing indicators, read receipts
  useEffect(() => {
    if (!socket) return
    const onNewMessage = ({ message }: { message: Message }) => {
      if (message.to_user !== me) return
      const other = message.from_user
      if (other === peerRef.current) {
        setMessages((prev) =>
          prev && !prev.some((m) => m.id === message.id) ? [...prev, message] : prev,
        )
        // Reading the thread: mark read so the sender gets a receipt.
        // Server semantics: {from: author of messages being read, to: the reader}.
        socket.emit('mark-messages-read', { from: message.from_user, to: me })
      } else {
        unreadApi.refetch()
      }
    }
    const onMessageSent = ({ message }: { message: Message }) => {
      if (message.from_user === me && message.to_user === peerRef.current) {
        setMessages((prev) =>
          prev && !prev.some((m) => m.id === message.id) ? [...prev, message] : prev,
        )
      }
    }
    const onTyping = ({ from }: { from: string }) => {
      if (from === peerRef.current) setPeerTyping(true)
    }
    const onStoppedTyping = ({ from }: { from: string }) => {
      if (from === peerRef.current) setPeerTyping(false)
    }
    const onMessagesRead = ({ by }: { by: string }) => {
      if (by === peerRef.current) {
        setMessages((prev) =>
          prev
            ? prev.map((m) => (m.from_user === me && m.to_user === by ? { ...m, read: 1 } : m))
            : prev,
        )
      }
    }
    socket.on('new-message', onNewMessage)
    socket.on('message-sent', onMessageSent)
    socket.on('user-typing', onTyping)
    socket.on('user-stopped-typing', onStoppedTyping)
    socket.on('messages-read', onMessagesRead)
    return () => {
      socket.off('new-message', onNewMessage)
      socket.off('message-sent', onMessageSent)
      socket.off('user-typing', onTyping)
      socket.off('user-stopped-typing', onStoppedTyping)
      socket.off('messages-read', onMessagesRead)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, me])

  // Cleanup typing on unmount / peer switch
  useEffect(() => stopTyping, [stopTyping])
  useEffect(() => stopTyping, [peer, stopTyping])

  async function send() {
    const content = draft.trim()
    if (!content || !peer) return
    setSending(true)
    stopTyping()
    try {
      if (socket?.connected) {
        // Server persists + relays; confirmation arrives via `message-sent`.
        socket.emit('direct-message', { from: me, to: peer, content })
      } else {
        const d = await api.post<{ message: Message }>('/api/messages', {
          from: me,
          to: peer,
          content,
        })
        setMessages((prev) =>
          prev && !prev.some((m) => m.id === d.message.id) ? [...prev, d.message] : prev,
        )
      }
      setDraft('')
    } catch (err) {
      toast.error('Message failed', err instanceof ApiError ? err.message : 'Unknown error')
    } finally {
      setSending(false)
    }
  }

  function onDraftChange(value: string) {
    setDraft(value.slice(0, 2000))
    if (!peer) return
    if (!typingActive.current) {
      typingActive.current = true
      socket?.emit('typing-start', { from: me, to: peer })
    }
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS)
  }

  async function toggleReaction(msgId: number, emoji: string) {
    setBusyReact(msgId)
    try {
      const d = await api.post<{ reactions: Reactions }>(`/api/messages/${msgId}/react`, {
        username: me,
        emoji,
      })
      setReactions((prev) => ({ ...prev, [msgId]: d.reactions }))
    } catch (err) {
      toast.error('Reaction failed', err instanceof ApiError ? err.message : 'Unknown error')
    } finally {
      setBusyReact(null)
      setReactingTo(null)
    }
  }

  const friends = friendsApi.data?.friends ?? []
  const thread = messages ?? []

  return (
    <div className="grid h-[calc(100vh-15rem)] min-h-[420px] grid-cols-1 gap-5 md:grid-cols-[280px_1fr]">
      {/* ── Conversation list ── */}
      <Card className="flex min-h-0 flex-col overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-display text-xs tracking-wider text-foreground uppercase">
            Conversations
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {friendsApi.loading ? (
            <LoadingBlock rows={4} className="p-2" />
          ) : friends.length === 0 ? (
            <EmptyState
              className="py-10"
              icon={<MessagesSquare />}
              title="No friends yet"
              description="Add friends to start chatting."
            />
          ) : (
            <ul className="space-y-1">
              {friends.map((f) => (
                <li key={f.username}>
                  <button
                    onClick={() => openThread(f.username)}
                    aria-current={peer === f.username}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-200',
                      peer === f.username
                        ? 'border border-primary/50 bg-primary/10'
                        : 'border border-transparent hover:bg-surface-2',
                    )}
                  >
                    <Avatar
                      src={avatarSrc(f)}
                      name={f.display_name || f.username}
                      size="sm"
                      online={f.status === 'online'}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {f.display_name || f.username}
                      </span>
                      <span className="block truncate text-xs text-foreground-faint">
                        @{f.username}
                      </span>
                    </span>
                    {(unreadMap.get(f.username) ?? 0) > 0 && (
                      <Badge variant="accent" className="tabular-nums">
                        {unreadMap.get(f.username)}
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* ── Thread ── */}
      <Card className="flex min-h-0 flex-col overflow-hidden">
        {!peer ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={<MessagesSquare />}
              title="Select a conversation"
              description="Pick a friend on the left to open the encrypted-ish rift channel."
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Button
                size="icon-sm"
                variant="ghost"
                className="md:hidden"
                aria-label="Close conversation"
                onClick={() => setPeer(null)}
              >
                <ArrowLeft />
              </Button>
              <Avatar name={peer} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm tracking-wider text-foreground">
                  @{peer}
                </p>
                <p className="text-[11px] text-foreground-faint">
                  {peerTyping ? 'typing…' : socket?.connected ? 'realtime channel open' : 'offline mode — REST fallback'}
                </p>
              </div>
              {peerTyping && <TypingDots />}
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
              {loadingThread ? (
                <LoadingBlock rows={5} />
              ) : threadError ? (
                <ErrorState message={threadError} onRetry={() => peer && void loadThread(peer)} />
              ) : thread.length === 0 ? (
                <EmptyState
                  className="py-10"
                  title="No messages yet"
                  description={`Say hi to @${peer} — the rift is listening.`}
                />
              ) : (
                thread.map((m) => {
                  const mine = m.from_user === me
                  const msgReactions = reactions[m.id] ?? {}
                  return (
                    <div
                      key={m.id}
                      className={cn('group flex items-end gap-2', mine && 'flex-row-reverse')}
                    >
                      <div className={cn('max-w-[78%] sm:max-w-[65%]', mine && 'text-right')}>
                        <div
                          className={cn(
                            'rounded-xl px-3.5 py-2 text-sm break-words',
                            mine
                              ? 'rounded-br-sm bg-primary/25 text-foreground border border-primary/40'
                              : 'rounded-bl-sm bg-surface-2 text-foreground border border-border',
                          )}
                        >
                          <p className="whitespace-pre-wrap text-left">{m.content}</p>
                        </div>
                        <div
                          className={cn(
                            'mt-0.5 flex items-center gap-1.5 px-1 text-[10px] text-foreground-faint',
                            mine && 'justify-end',
                          )}
                        >
                          <span className="tabular-nums">{timeAgo(m.created_at)}</span>
                          {mine && (
                            <span aria-label={m.read ? 'read' : 'delivered'}>
                              {m.read ? (
                                <span className="text-cyan">✓✓</span>
                              ) : (
                                <span>✓</span>
                              )}
                            </span>
                          )}
                        </div>
                        {Object.keys(msgReactions).length > 0 && (
                          <div
                            className={cn('mt-1 flex flex-wrap gap-1', mine && 'justify-end')}
                          >
                            {Object.entries(msgReactions).map(([emoji, users]) => (
                              <span
                                key={emoji}
                                title={users.join(', ')}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] tabular-nums',
                                  users.includes(me)
                                    ? 'border-primary/60 bg-primary/15'
                                    : 'border-border bg-surface-2',
                                )}
                              >
                                {emoji} {users.length}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setReactingTo(reactingTo === m.id ? null : m.id)}
                          disabled={busyReact === m.id}
                          aria-label={`React to message`}
                          className="cursor-pointer rounded-md p-1 text-foreground-faint opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:text-primary-bright focus-visible:opacity-100"
                        >
                          <SmilePlus className="size-4" />
                        </button>
                        {reactingTo === m.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-6 left-0 z-10 flex gap-1 rounded-lg border border-border bg-surface p-1 shadow-lg"
                          >
                            {QUICK_EMOJIS.map((e) => (
                              <button
                                key={e}
                                onClick={() => void toggleReaction(m.id, e)}
                                aria-label={`React with ${e}`}
                                className="cursor-pointer rounded p-1 text-base transition-transform duration-150 hover:scale-125"
                              >
                                {e}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void send()
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder={`Message @${peer}… (Enter to send)`}
                  aria-label="Message text"
                  className="min-h-10 max-h-32 flex-1 resize-none"
                />
                <Button
                  variant="accent"
                  size="icon"
                  onClick={() => void send()}
                  disabled={!draft.trim() || sending}
                  aria-label="Send message"
                >
                  <Send />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
