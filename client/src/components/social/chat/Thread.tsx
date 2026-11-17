import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, Info, Loader2, Pin } from 'lucide-react'
import type { Socket } from 'socket.io-client'
import { Avatar, Button, useToast } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Composer, type ComposerHandle } from './Composer'
import { MessageItem, type MessageActions } from './MessageItem'
import { ForwardDialog, ImageViewer, InfoDialog, PinsDialog, PollDialog, ReportDialog, ShareDialog } from './dialogs'
import { dayLabel, nameOf, otherOf, titleOf, type Attachment, type Conversation, type Member, type Message, type People, type ShareType } from './types'

type Page = { messages: Message[]; more: { older: boolean; newer: boolean }; saved: number[] }

const err = (e: unknown, f: string) => (e instanceof ApiError ? e.message : f)
const GROUP_MS = 5 * 60 * 1000

export function Thread({
  convId,
  me,
  people: listPeople,
  socket,
  focus,
  conversations,
  onBack,
  onChanged,
  onLeft,
}: {
  convId: number
  me: string
  people: People
  socket: Socket | null
  focus: { id: number; n: number } | null
  conversations: Conversation[]
  onBack: () => void
  onChanged: () => void
  onLeft: () => void
}) {
  const toast = useToast()
  const [conv, setConv] = useState<Conversation | null>(null)
  const [people, setPeople] = useState<People>(listPeople)
  const [messages, setMessages] = useState<Message[]>([])
  const [more, setMore] = useState({ older: false, newer: false })
  const [saved, setSaved] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [olderBusy, setOlderBusy] = useState(false)
  const [typing, setTyping] = useState<Record<string, number>>({})
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editing, setEditing] = useState<Message | null>(null)
  const [highlight, setHighlight] = useState<number | null>(null)
  const [unreadFrom, setUnreadFrom] = useState<number | null>(null)
  const [atBottom, setAtBottom] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [dialog, setDialog] = useState<null | 'info' | 'pins' | 'share' | 'poll'>(null)
  const [forwarding, setForwarding] = useState<Message | null>(null)
  const [reporting, setReporting] = useState<Message | null>(null)
  const [image, setImage] = useState<{ url: string; alt: string } | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const composer = useRef<ComposerHandle>(null)
  const keepFromBottom = useRef<number | null>(null)
  const stickToBottom = useRef(true)
  const readSent = useRef(0)

  const allPeople = useMemo(() => ({ ...listPeople, ...people }), [listPeople, people])

  const loadConv = useCallback(async () => {
    const r = await api.get<{ conversation: Conversation; people: People }>(`/api/chat/conversations/${convId}`)
    setConv(r.conversation)
    setPeople((p) => ({ ...p, ...r.people }))
    return r.conversation
  }, [convId])

  const scrollToBottom = (smooth = false) => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }

  // Open: the conversation, then the newest messages (or the ones around a message to jump to).
  useEffect(() => {
    let live = true
    setLoading(true)
    setLoadError(null)
    setMessages([])
    setReplyTo(null)
    setEditing(null)
    setTyping({})
    ;(async () => {
      try {
        const c = await loadConv()
        const page = await api.get<Page>(`/api/chat/conversations/${convId}/messages${focus ? `?around=${focus.id}` : ''}`)
        if (!live) return
        setMessages(page.messages)
        setMore(page.more)
        setSaved(new Set(page.saved))
        const firstUnread = page.messages.find((m) => m.id > c.lastReadId && m.username !== me && m.kind !== 'system')
        setUnreadFrom(firstUnread?.id ?? null)
        stickToBottom.current = !focus && !firstUnread
        setLoading(false)
        requestAnimationFrame(() => {
          const target = focus ? document.getElementById(`msg-${focus.id}`) : firstUnread ? document.getElementById('chat-unread-line') : null
          if (target) {
            target.scrollIntoView({ block: 'center' })
            if (focus) {
              setHighlight(focus.id)
              setTimeout(() => setHighlight(null), 2500)
            }
          } else scrollToBottom()
        })
      } catch (e) {
        if (live) {
          setLoadError(err(e, 'Could not open the conversation'))
          setLoading(false)
        }
      }
    })()
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId, focus?.n])

  // Keep the view where it was when older messages are added above.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    if (keepFromBottom.current != null) {
      el.scrollTop = el.scrollHeight - keepFromBottom.current
      keepFromBottom.current = null
    } else if (stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages, typing])

  const loadOlder = useCallback(async () => {
    if (olderBusy || !more.older || !messages.length) return
    setOlderBusy(true)
    try {
      const page = await api.get<Page>(`/api/chat/conversations/${convId}/messages?before=${messages.find((m) => !m.tempId)?.id ?? 0}`)
      const el = scroller.current
      keepFromBottom.current = el ? el.scrollHeight - el.scrollTop : null
      setMessages((ms) => [...page.messages.filter((m) => !ms.some((x) => x.id === m.id)), ...ms])
      setMore((m) => ({ ...m, older: page.more.older }))
      setSaved((s) => new Set([...s, ...page.saved]))
    } catch {
      /* try again on the next scroll */
    } finally {
      setOlderBusy(false)
    }
  }, [olderBusy, more.older, messages, convId])

  const loadNewer = useCallback(async () => {
    const last = [...messages].reverse().find((m) => !m.tempId)
    if (!last) return
    const page = await api.get<Page>(`/api/chat/conversations/${convId}/messages?after=${last.id}&limit=100`)
    setMessages((ms) => [...ms, ...page.messages.filter((m) => !ms.some((x) => x.id === m.id))])
    setMore((m) => ({ ...m, newer: page.more.newer }))
  }, [messages, convId])

  // Tell the others what I've read, when I can see the end of the conversation.
  const markRead = useCallback(() => {
    if (!conv || document.visibilityState !== 'visible') return
    const last = [...messages].reverse().find((m) => !m.tempId)
    if (!last || last.id <= Math.max(readSent.current, conv.lastReadId)) return
    readSent.current = last.id
    void api.put(`/api/chat/conversations/${convId}/read`, { upTo: last.id }).then(() => onChanged()).catch(() => {})
  }, [conv, messages, convId, onChanged])
  useEffect(() => {
    if (atBottom && !more.newer) markRead()
  }, [atBottom, more.newer, markRead])
  useEffect(() => {
    const on = () => atBottom && markRead()
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [atBottom, markRead])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setAtBottom(bottom)
    stickToBottom.current = bottom && !more.newer
    if (el.scrollTop < 120) void loadOlder()
    if (bottom && more.newer) void loadNewer()
  }

  /* ── live updates ── */
  useEffect(() => {
    if (!socket) return
    const onMessage = ({ message }: { message: Message }) => {
      if (message.conversationId !== convId) return
      setMessages((ms) => (ms.some((m) => m.id === message.id) ? ms : [...ms, message]))
      setTyping((t) => {
        const n = { ...t }
        delete n[message.username]
        return n
      })
    }
    const onUpdate = ({ message }: { message: Message }) => {
      if (message.conversationId !== convId) return
      setMessages((ms) => ms.map((m) => (m.id === message.id ? message : m)))
    }
    const onReaction = (p: { conversationId: number; messageId: number; reactions: Record<string, string[]> }) => {
      if (p.conversationId !== convId) return
      setMessages((ms) => ms.map((m) => (m.id === p.messageId ? { ...m, reactions: p.reactions } : m)))
    }
    const onRead = (p: { conversationId: number; username: string; lastReadId: number }) => {
      if (p.conversationId !== convId) return
      setConv((c) => (c ? { ...c, members: c.members.map((m) => (m.username === p.username ? { ...m, lastReadId: p.lastReadId } : m)), lastReadId: p.username === me ? p.lastReadId : c.lastReadId } : c))
    }
    const onTyping = (p: { conversationId: number; username: string; typing: boolean }) => {
      if (p.conversationId !== convId) return
      setTyping((t) => {
        const n = { ...t }
        if (p.typing) n[p.username] = Date.now()
        else delete n[p.username]
        return n
      })
    }
    const onConversation = (p: { conversationId: number }) => {
      if (p.conversationId !== convId) return
      loadConv().catch(() => onLeft())
    }
    // After a reconnect, fetch what was missed.
    const onConnect = () => void loadNewer().catch(() => {})
    socket.on('chat:message', onMessage)
    socket.on('chat:update', onUpdate)
    socket.on('chat:reaction', onReaction)
    socket.on('chat:read', onRead)
    socket.on('chat:typing', onTyping)
    socket.on('chat:conversation', onConversation)
    socket.on('connect', onConnect)
    return () => {
      socket.off('chat:message', onMessage)
      socket.off('chat:update', onUpdate)
      socket.off('chat:reaction', onReaction)
      socket.off('chat:read', onRead)
      socket.off('chat:typing', onTyping)
      socket.off('chat:conversation', onConversation)
      socket.off('connect', onConnect)
    }
  }, [socket, convId, me, loadConv, loadNewer, onLeft])

  // "Typing…" fades if the stop never arrives.
  useEffect(() => {
    if (!Object.keys(typing).length) return
    const t = setInterval(() => setTyping((ty) => Object.fromEntries(Object.entries(ty).filter(([, at]) => Date.now() - at < 6000))), 2000)
    return () => clearInterval(t)
  }, [typing])

  /* ── sending (shown at once, confirmed by the server) ── */
  const post = useCallback(
    async (temp: Message) => {
      try {
        const d = temp.draft!
        const r = await api.post<{ message: Message }>(`/api/chat/conversations/${convId}/messages`, { body: d.body, attachment: d.attachment, share: d.share, replyTo: d.replyTo })
        setMessages((ms) => {
          const without = ms.filter((m) => m.tempId !== temp.tempId)
          return without.some((m) => m.id === r.message.id) ? without : [...without, r.message].sort((a, b) => (a.tempId ? 1 : b.tempId ? -1 : a.id - b.id))
        })
        onChanged()
      } catch (e) {
        setMessages((ms) => ms.map((m) => (m.tempId === temp.tempId ? { ...m, pending: false, failed: err(e, 'no connection') } : m)))
      }
    },
    [convId, onChanged],
  )
  const send = (p: { body: string; attachment: Attachment | null; share?: { type: ShareType; id: number | string } | null }) => {
    const tempId = `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`
    const temp: Message = {
      id: Number.MAX_SAFE_INTEGER - Date.now(),
      tempId,
      pending: true,
      conversationId: convId,
      username: me,
      kind: 'text',
      body: p.body,
      attachment: p.attachment,
      share: null,
      replyTo: replyTo ? { id: replyTo.id, username: replyTo.username, kind: replyTo.kind, body: replyTo.body.slice(0, 140), deleted: false, attachment: replyTo.attachment?.kind ?? null, share: replyTo.share?.type ?? null, createdAt: replyTo.createdAt } : null,
      reactions: {},
      editedAt: null,
      deleted: false,
      forwarded: false,
      poll: null,
      pinnedAt: null,
      pinnedBy: null,
      mentions: [],
      createdAt: new Date().toISOString(),
      draft: { body: p.body, attachment: p.attachment, share: p.share ?? null, replyTo: replyTo?.id ?? null },
    }
    stickToBottom.current = true
    setMessages((ms) => [...ms, temp])
    setReplyTo(null)
    setUnreadFrom(null)
    void post(temp)
  }

  const call = async (fn: () => Promise<unknown>, fail: string) => {
    try {
      await fn()
    } catch (e) {
      toast.error(err(e, fail))
    }
  }
  const replace = (m: Message) => setMessages((ms) => ms.map((x) => (x.id === m.id ? m : x)))

  const actions: MessageActions = {
    reply: (m) => {
      setEditing(null)
      setReplyTo(m)
      composer.current?.focus()
    },
    edit: (m) => {
      setReplyTo(null)
      setEditing(m)
      composer.current?.focus()
    },
    react: (m, emoji) =>
      void call(async () => {
        const r = await api.post<{ reactions: Record<string, string[]> }>(`/api/chat/messages/${m.id}/react`, { emoji })
        setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, reactions: r.reactions } : x)))
      }, 'Could not react'),
    remove: (m) => {
      if (!window.confirm('Delete this message for everyone?')) return
      void call(async () => replace((await api.delete<{ message: Message }>(`/api/chat/messages/${m.id}`)).message), 'Could not delete it')
    },
    pin: (m) => void call(async () => replace((await api.post<{ message: Message }>(`/api/chat/messages/${m.id}/pin`)).message), 'Could not pin it'),
    save: (m) =>
      void call(async () => {
        const r = await api.post<{ saved: boolean }>(`/api/chat/messages/${m.id}/save`)
        setSaved((s) => {
          const n = new Set(s)
          if (r.saved) n.add(m.id)
          else n.delete(m.id)
          return n
        })
        toast.success(r.saved ? 'Saved' : 'Removed from saved')
      }, 'Could not save it'),
    forward: (m) => setForwarding(m),
    report: (m) => setReporting(m),
    retry: (m) => {
      setMessages((ms) => ms.map((x) => (x.tempId === m.tempId ? { ...x, pending: true, failed: undefined } : x)))
      void post(m)
    },
    vote: (m, options) => void call(async () => replace((await api.post<{ message: Message }>(`/api/chat/messages/${m.id}/vote`, { options })).message), 'Could not vote'),
    closePoll: (m) => void call(async () => replace((await api.post<{ message: Message }>(`/api/chat/messages/${m.id}/close`)).message), 'Could not close it'),
    jump: (id) => {
      const el = document.getElementById(`msg-${id}`)
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        setHighlight(id)
        setTimeout(() => setHighlight(null), 2500)
        return
      }
      void (async () => {
        const page = await api.get<Page>(`/api/chat/conversations/${convId}/messages?around=${id}`)
        stickToBottom.current = false
        setMessages(page.messages)
        setMore(page.more)
        requestAnimationFrame(() => {
          document.getElementById(`msg-${id}`)?.scrollIntoView({ block: 'center' })
          setHighlight(id)
          setTimeout(() => setHighlight(null), 2500)
        })
      })()
    },
    image: (url, alt) => setImage({ url, alt }),
  }

  if (loading && !conv) return <div className="chat-thread chat-center"><Loader2 className="size-5 animate-spin text-text-muted" aria-label="Loading" /></div>
  if (loadError || !conv) return <div className="chat-thread chat-center"><p className="text-[13px] text-text-secondary">{loadError ?? 'Not found'}</p></div>

  const other = otherOf(conv, me)
  const otherPerson = other ? allPeople[other] : null
  const online = otherPerson?.status === 'online'
  const typingNames = Object.keys(typing).filter((u) => u !== me)
  const lastMine = [...messages].reverse().find((m) => m.username === me && !m.tempId && m.kind !== 'system')
  const readers = (id: number): Member[] => conv.members.filter((m) => m.username !== me && m.lastReadId >= id)
  const statusFor = (m: Message) => {
    if (m.id !== lastMine?.id) return null
    const r = readers(m.id)
    if (conv.kind === 'dm') return r.length ? 'Seen' : 'Sent'
    const others = conv.members.filter((x) => x.username !== me && !x.invited).length
    if (!r.length) return 'Sent'
    return r.length >= others ? 'Seen by everyone' : `Seen by ${r.slice(0, 3).map((x) => nameOf(allPeople, x.username)).join(', ')}${r.length > 3 ? ` and ${r.length - 3} more` : ''}`
  }
  const subtitle = typingNames.length
    ? `${typingNames.map((u) => nameOf(allPeople, u)).slice(0, 2).join(' and ')} ${typingNames.length > 1 ? 'are' : 'is'} typing…`
    : conv.kind === 'group'
      ? `${conv.members.filter((m) => !m.invited).length} people`
      : online
        ? 'Online'
        : otherPerson?.last_seen
          ? `Last seen ${new Date(otherPerson.last_seen).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`
          : ''
  const inviter = conv.request ? (messages.find((m) => m.username !== me)?.username ?? null) : null

  return (
    <section
      className={cn('chat-thread', dragging && 'is-dragging')}
      aria-label={`Conversation with ${titleOf(conv, me, allPeople)}`}
      onDragOver={(e) => {
        if ([...e.dataTransfer.types].includes('Files')) {
          e.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (e.dataTransfer.files.length) composer.current?.addFiles([...e.dataTransfer.files])
      }}
    >
      <header className="chat-head">
        <button type="button" className="chat-act chat-back" aria-label="Back to conversations" onClick={onBack}>
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        {conv.kind === 'dm' && other ? (
          <Avatar size="sm" seed={other} avatar={otherPerson?.avatar} src={otherPerson?.avatar_url} name={nameOf(allPeople, other)} online={online} />
        ) : (
          <span className="chat-group-badge" aria-hidden="true">{(conv.title || 'G').slice(0, 1).toUpperCase()}</span>
        )}
        <button type="button" className="chat-head-title" onClick={() => setDialog('info')}>
          <span className="block truncate text-[15px] font-semibold text-text-primary">{titleOf(conv, me, allPeople)}</span>
          <span className="block truncate text-[12px] text-text-muted" aria-live="polite">{subtitle}</span>
        </button>
        <span className="ml-auto flex items-center gap-0.5">
          <button type="button" className="chat-act" aria-label="Pinned messages" onClick={() => setDialog('pins')}>
            <Pin className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className="chat-act" aria-label="Details" onClick={() => setDialog('info')}>
            <Info className="size-4" aria-hidden="true" />
          </button>
        </span>
      </header>

      <div ref={scroller} className="chat-scroll" onScroll={onScroll} role="log" aria-label="Messages" aria-live="polite" aria-relevant="additions" tabIndex={0}>
        {more.older && (
          <div className="chat-center py-2">
            <Button variant="ghost" size="sm" onClick={() => void loadOlder()} disabled={olderBusy}>
              {olderBusy ? <Loader2 className="animate-spin" /> : null} Earlier messages
            </Button>
          </div>
        )}
        {!more.older && !loading && (
          <p className="chat-start">
            {conv.kind === 'group' ? `The start of ${conv.title}.` : `The start of your conversation with ${titleOf(conv, me, allPeople)}.`}
            {conv.description && <span className="block">{conv.description}</span>}
          </p>
        )}
        <ol className="chat-list">
          {messages.map((m, i) => {
            const prev = messages[i - 1]
            const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
            const grouped = !newDay && !!prev && prev.kind !== 'system' && m.kind !== 'system' && prev.username === m.username && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_MS && m.id !== unreadFrom
            return (
              <FragmentRow key={m.tempId ?? m.id} day={newDay ? dayLabel(m.createdAt) : null} unread={m.id === unreadFrom}>
                <MessageItem m={m} me={me} people={allPeople} conv={conv} grouped={grouped} status={statusFor(m)} saved={saved.has(m.id)} highlight={highlight === m.id} actions={actions} />
              </FragmentRow>
            )
          })}
        </ol>
        {typingNames.length > 0 && (
          <p className="chat-typing" aria-hidden="true">
            <span className="chat-dots"><span /><span /><span /></span>
          </p>
        )}
      </div>

      {!atBottom && (
        <button
          type="button"
          className="chat-to-bottom"
          onClick={() => {
            if (more.newer) void loadNewer()
            stickToBottom.current = true
            scrollToBottom(true)
          }}
        >
          <ArrowDown className="size-4" aria-hidden="true" /> Latest
        </button>
      )}

      {conv.request ? (
        <div className="chat-request">
          <p className="m-0 text-[13.5px] text-text-primary">
            {conv.kind === 'group' ? `${inviter ? nameOf(allPeople, inviter) : 'Someone'} added you to this group.` : `${titleOf(conv, me, allPeople)} wants to message you.`} They won&rsquo;t know you&rsquo;ve seen it until you accept.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void call(async () => (await api.post(`/api/chat/conversations/${convId}/accept`), await loadConv(), onChanged()), 'Could not accept')}>
              {conv.kind === 'group' ? 'Join' : 'Accept'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void call(async () => (await api.post(`/api/chat/conversations/${convId}/decline`), onLeft()), 'Could not do that')}>
              {conv.kind === 'group' ? 'Decline' : 'Delete'}
            </Button>
            {other && (
              <Button size="sm" variant="ghost" className="text-state-error" onClick={() => void call(async () => (await api.put(`/api/social/block/${encodeURIComponent(other)}`), await api.post(`/api/chat/conversations/${convId}/decline`), onLeft()), 'Could not block')}>
                Block
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Composer
          key={conv.id}
          ref={composer}
          conv={conv}
          me={me}
          people={allPeople}
          socket={socket}
          replyTo={replyTo}
          editing={editing}
          onCancel={() => {
            setReplyTo(null)
            setEditing(null)
          }}
          onSend={send}
          onEditSave={(m, body) =>
            void call(async () => {
              replace((await api.patch<{ message: Message }>(`/api/chat/messages/${m.id}`, { body })).message)
              setEditing(null)
            }, 'Could not edit it')
          }
          onShare={() => setDialog('share')}
          onPoll={() => setDialog('poll')}
          onSolveTogether={() =>
            void call(async () => {
              const r = await api.post<{ room: { id: string } }>('/api/rooms', { name: `${titleOf(conv, me, allPeople)}: solving together`.slice(0, 50), creator: me })
              send({ body: '', attachment: null, share: { type: 'room', id: r.room.id } })
            }, 'Could not open a room')
          }
        />
      )}

      <InfoDialog key={`${dialog === 'info'}-${conv.title}-${conv.description}`} conv={conv} open={dialog === 'info'} onClose={() => setDialog(null)} me={me} people={allPeople} onChanged={() => void loadConv().then(onChanged).catch(() => onLeft())} onLeft={onLeft} />
      <PinsDialog conv={conv} open={dialog === 'pins'} onClose={() => setDialog(null)} me={me} people={allPeople} actions={actions} />
      <ShareDialog open={dialog === 'share'} onClose={() => setDialog(null)} onPick={(share) => send({ body: '', attachment: null, share })} />
      <PollDialog
        open={dialog === 'poll'}
        onClose={() => setDialog(null)}
        onCreate={async (p) => {
          try {
            const r = await api.post<{ message: Message }>(`/api/chat/conversations/${convId}/polls`, p)
            stickToBottom.current = true
            setMessages((ms) => (ms.some((m) => m.id === r.message.id) ? ms : [...ms, r.message]))
          } catch (e) {
            toast.error(err(e, 'Could not send the poll'))
            throw e
          }
        }}
      />
      <ForwardDialog message={forwarding} onClose={() => setForwarding(null)} conversations={conversations} me={me} people={allPeople} />
      <ReportDialog message={reporting} onClose={() => setReporting(null)} />
      <ImageViewer image={image} onClose={() => setImage(null)} />
    </section>
  )
}

function FragmentRow({ day, unread, children }: { day: string | null; unread: boolean; children: React.ReactNode }) {
  return (
    <>
      {day && (
        <li className="chat-day">
          <span>{day}</span>
        </li>
      )}
      {unread && (
        <li className="chat-unread" id="chat-unread-line">
          <span>New messages</span>
        </li>
      )}
      {children}
    </>
  )
}
