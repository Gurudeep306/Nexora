import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BellOff, Bookmark, Loader2, PenSquare, Settings2 } from 'lucide-react'
import type { Socket } from 'socket.io-client'
import { Avatar, SearchInput, useToast } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Thread } from './chat/Thread'
import { JoinDialog, NewChatDialog, SavedDialog, SettingsDialog } from './chat/dialogs'
import { listTime, nameOf, otherOf, previewText, titleOf, type Conversation, type Message, type People, type Preview } from './chat/types'
import './chat/chat.css'

/*
  Messages: direct conversations and groups (src/chat.js). A list on the
  left, the open conversation on the right (one at a time on a phone).
  The URL holds the open conversation (?c=), a person to message (?peer=)
  and an invite link to join (?join=).
*/

interface Props {
  me: string
  socket: Socket | null
}

type Filter = 'all' | 'unread' | 'groups' | 'requests'
type Hit = Preview & { conversationId: number }

export function MessagesTab({ me, socket }: Props) {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [people, setPeople] = useState<People>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [found, setHits] = useState<Hit[] | null>(null)
  const [typing, setTyping] = useState<Record<number, string[]>>({})
  const [focus, setFocus] = useState<{ id: number; n: number } | null>(null)
  const [dialog, setDialog] = useState<null | 'new' | 'settings' | 'saved'>(null)
  const openId = Number(params.get('c')) || null
  const joinToken = params.get('join')
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const appRef = useRef<HTMLDivElement>(null)

  // Opening a conversation brings the whole messages box into view, so the
  // box to type in is on screen without scrolling the page. On a phone the
  // floating assistant button would sit on Send, so it steps aside.
  useEffect(() => {
    if (!openId) return
    document.documentElement.dataset.chatOpen = ''
    // After the page above has laid out (its header loads with the list).
    const t = window.setTimeout(() => {
      const el = appRef.current
      if (el && el.getBoundingClientRect().top > 80) {
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        el.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' })
      }
    }, 120)
    return () => {
      window.clearTimeout(t)
      delete document.documentElement.dataset.chatOpen
    }
  }, [openId, loading])

  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params)
      next.set('tab', 'messages')
      for (const [k, v] of Object.entries(patch)) {
        if (v == null) next.delete(k)
        else next.set(k, v)
      }
      setParams(next, { replace: false })
    },
    [params, setParams],
  )
  const open = useCallback((id: number | null, at?: number) => {
    setFocus(at ? { id: at, n: Date.now() } : null)
    setParam({ c: id ? String(id) : null, peer: null })
  }, [setParam])

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ conversations: Conversation[]; people: People }>('/api/chat/conversations')
      setConversations(r.conversations)
      setPeople((p) => ({ ...p, ...r.people }))
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your messages')
    } finally {
      setLoading(false)
    }
  }, [])
  // Several events in a row cause one reload.
  const refresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => void load(), 250)
  }, [load])
  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load])

  // ?peer=name (from a profile's "Message" button): open or start that conversation.
  const peer = params.get('peer')
  useEffect(() => {
    if (!peer || peer === me) return
    let live = true
    api
      .post<{ id: number }>('/api/chat/dm', { username: peer })
      .then((r) => {
        if (!live) return
        void load()
        open(r.id)
      })
      .catch((e) => {
        if (!live) return
        toast.error(e instanceof ApiError ? e.message : 'Could not open the conversation')
        setParam({ peer: null })
      })
    return () => {
      live = false
    }
  }, [peer, me, load, open, setParam, toast])

  /* ── live list ── */
  useEffect(() => {
    if (!socket) return
    const onMessage = ({ message }: { message: Message }) => {
      setTyping((t) => ({ ...t, [message.conversationId]: (t[message.conversationId] ?? []).filter((u) => u !== message.username) }))
      setConversations((cs) => {
        const c = cs.find((x) => x.id === message.conversationId)
        if (!c) {
          refresh()
          return cs
        }
        const viewing = message.conversationId === openId && document.visibilityState === 'visible'
        const updated: Conversation = {
          ...c,
          last: { id: message.id, username: message.username, kind: message.kind, body: message.poll ? '' : message.body, deleted: false, attachment: message.attachment?.kind ?? null, share: message.share?.type ?? null, poll: message.poll?.question ?? null, createdAt: message.createdAt },
          lastMessageAt: message.createdAt,
          unread: message.username !== me && !viewing && message.kind !== 'system' ? (c.unread ?? 0) + 1 : c.unread,
        }
        return [updated, ...cs.filter((x) => x.id !== c.id)]
      })
    }
    const onTyping = (p: { conversationId: number; username: string; typing: boolean }) => {
      setTyping((t) => {
        const cur = (t[p.conversationId] ?? []).filter((u) => u !== p.username)
        return { ...t, [p.conversationId]: p.typing ? [...cur, p.username] : cur }
      })
    }
    const onMention = (p: { conversationId: number; from: string }) => {
      if (p.conversationId !== openId) toast.success(`${p.from} mentioned you`)
    }
    socket.on('chat:message', onMessage)
    socket.on('chat:typing', onTyping)
    socket.on('chat:conversation', refresh)
    socket.on('chat:mention', onMention)
    socket.on('connect', refresh)
    return () => {
      socket.off('chat:message', onMessage)
      socket.off('chat:typing', onTyping)
      socket.off('chat:conversation', refresh)
      socket.off('chat:mention', onMention)
      socket.off('connect', refresh)
    }
  }, [socket, me, openId, refresh, toast])

  // Search messages (server) as you type.
  useEffect(() => {
    const text = q.trim()
    if (text.length < 2) return
    let live = true
    const t = setTimeout(() => {
      api
        .get<{ results: Hit[] }>(`/api/chat/search?q=${encodeURIComponent(text)}`)
        .then((r) => live && setHits(r.results))
        .catch(() => live && setHits([]))
    }, 250)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [q])

  const hits = q.trim().length >= 2 ? found : null
  const requests = conversations.filter((c) => c.request)
  const shown = useMemo(() => {
    const text = q.trim().toLowerCase()
    return conversations.filter((c) => {
      if (filter === 'requests' ? !c.request : c.request) return false
      if (filter === 'unread' && !c.unread) return false
      if (filter === 'groups' && c.kind !== 'group') return false
      if (text && !titleOf(c, me, people).toLowerCase().includes(text) && !c.members.some((m) => m.username.toLowerCase().includes(text))) return false
      return true
    })
  }, [conversations, filter, q, me, people])

  const FILTERS: { id: Filter; label: string; n?: number }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread', n: conversations.filter((c) => !c.request && c.unread).length },
    { id: 'groups', label: 'Groups' },
    { id: 'requests', label: 'Requests', n: requests.length },
  ]

  return (
    <div ref={appRef} className={cn('chat-app', openId && 'has-open')}>
      <aside className="chat-side" aria-label="Conversations">
        <div className="chat-side-head">
          <h2 className="m-0 text-[17px] font-semibold text-text-primary">Messages</h2>
          <span className="ml-auto flex items-center gap-0.5">
            <button type="button" className="chat-act" aria-label="Saved messages" onClick={() => setDialog('saved')}>
              <Bookmark className="size-4" aria-hidden="true" />
            </button>
            <button type="button" className="chat-act" aria-label="Who can message you" onClick={() => setDialog('settings')}>
              <Settings2 className="size-4" aria-hidden="true" />
            </button>
            <button type="button" className="chat-new" onClick={() => setDialog('new')}>
              <PenSquare className="size-4" aria-hidden="true" /> New
            </button>
          </span>
        </div>
        <div className="px-3 pb-2">
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search people and messages" aria-label="Search people and messages" />
        </div>
        <div className="chat-filters" role="tablist" aria-label="Show">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={cn('chat-filter', filter === f.id && 'is-on')} onClick={() => setFilter(f.id)}>
              {f.label}
              {!!f.n && <span className="chat-count">{f.n}</span>}
            </button>
          ))}
        </div>
        <div className="chat-side-list">
          {loading ? (
            <div className="chat-center py-8">
              <Loader2 className="size-5 animate-spin text-text-muted" aria-label="Loading" />
            </div>
          ) : error ? (
            <p className="px-4 py-6 text-[13px] text-text-secondary">
              {error}{' '}
              <button type="button" className="chat-link-btn" onClick={() => void load()}>
                Try again
              </button>
            </p>
          ) : (
            <>
              {shown.length === 0 && !hits?.length && (
                <p className="px-4 py-6 text-[13px] text-text-secondary">
                  {filter === 'requests' ? 'No message requests.' : q ? 'No conversations match.' : 'No conversations yet. Start one with New.'}
                </p>
              )}
              <ul className="chat-convs">
                {shown.map((c) => {
                  const other = otherOf(c, me)
                  const tp = (typing[c.id] ?? []).filter((u) => u !== me)
                  const p = other ? people[other] : null
                  return (
                    <li key={c.id}>
                      <button type="button" className={cn('chat-conv', c.id === openId && 'is-open', !!c.unread && 'is-unread')} aria-current={c.id === openId ? 'true' : undefined} onClick={() => open(c.id)}>
                        {other ? (
                          <Avatar size="md" seed={other} avatar={p?.avatar} src={p?.avatar_url} name={nameOf(people, other)} online={p?.status === 'online'} />
                        ) : (
                          <span className="chat-group-badge is-lg" aria-hidden="true">{(c.title || 'G').slice(0, 1).toUpperCase()}</span>
                        )}
                        <span className="min-w-0 flex-1 text-left">
                          <span className="flex items-baseline gap-2">
                            <span className="truncate font-medium text-text-primary">{titleOf(c, me, people)}</span>
                            <span className="ml-auto shrink-0 text-[11.5px] text-text-muted">{listTime(c.last?.createdAt ?? c.lastMessageAt)}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className={cn('truncate text-[12.5px]', c.unread ? 'text-text-primary' : 'text-text-muted')}>
                              {tp.length ? `${nameOf(people, tp[0])} is typing…` : c.request ? (c.kind === 'group' ? 'Invited you to the group' : 'Wants to message you') : previewText(c.last, me, people, c.kind === 'group')}
                            </span>
                            {c.muted && <BellOff className="ml-auto size-3.5 shrink-0 text-text-muted" aria-label="Muted" />}
                            {!!c.unread && (
                              <span className={cn('chat-count', !c.muted && 'ml-auto', c.muted && 'is-muted')} aria-label={`${c.unread} unread`}>
                                {c.unread > 99 ? '99+' : c.unread}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {hits && hits.length > 0 && (
                <section aria-label="Messages found" className="pb-3">
                  <h3 className="chat-side-sub">Messages</h3>
                  <ul className="chat-convs">
                    {hits.map((h) => {
                      const c = conversations.find((x) => x.id === h.conversationId)
                      return (
                        <li key={h.id}>
                          <button type="button" className="chat-conv" onClick={() => open(h.conversationId, h.id)}>
                            <span className="min-w-0 flex-1 text-left">
                              <span className="flex items-baseline gap-2">
                                <span className="truncate text-[12.5px] font-medium text-text-primary">{c ? titleOf(c, me, people) : 'Conversation'}</span>
                                <span className="ml-auto shrink-0 text-[11.5px] text-text-muted">{listTime(h.createdAt)}</span>
                              </span>
                              <span className="block truncate text-[12.5px] text-text-secondary">
                                {h.username === me ? 'You' : nameOf(people, h.username)}: <Mark text={h.body} q={q.trim()} />
                              </span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </aside>

      <div className="chat-main">
        {openId ? (
          <Thread
            key={openId}
            convId={openId}
            me={me}
            people={people}
            socket={socket}
            focus={focus}
            conversations={conversations}
            onBack={() => open(null)}
            onChanged={refresh}
            onLeft={() => {
              open(null)
              void load()
            }}
          />
        ) : (
          <div className="chat-empty">
            <p className="ed-h3 m-0">Your messages</p>
            <p className="m-0 max-w-sm text-[13.5px] text-text-secondary">Talk one to one or in study groups. Share problems, solutions, contests and GATE questions, and run code right in the chat.</p>
            <button type="button" className="chat-new mt-2" onClick={() => setDialog('new')}>
              <PenSquare className="size-4" aria-hidden="true" /> New message
            </button>
          </div>
        )}
      </div>

      <NewChatDialog
        open={dialog === 'new'}
        onClose={() => setDialog(null)}
        me={me}
        onOpened={(id) => {
          void load()
          open(id)
        }}
      />
      <SettingsDialog open={dialog === 'settings'} onClose={() => setDialog(null)} />
      <SavedDialog open={dialog === 'saved'} onClose={() => setDialog(null)} me={me} people={people} conversations={conversations} onJump={(c, id) => open(c, id)} />
      <JoinDialog
        token={joinToken}
        onClose={() => setParam({ join: null })}
        onJoined={(id) => {
          void load()
          setParam({ join: null, c: String(id) })
        }}
      />
    </div>
  )
}

function Mark({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0 || !q) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="chat-hit">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}
