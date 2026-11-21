/*
  New messages on any page, like a phone's chat app: a card with the
  person's picture, name and message, a quick reply, and a soft sound. When
  the tab is in the background the browser's own notification shows instead
  (and with alerts on, a push reaches the device even when the site is closed,
  public/sw.js). Muted conversations and the one on screen stay quiet.
*/
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Send, X } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { refreshPush } from '@/lib/push'
import { openConversation } from './chat/focus'
import { alertSoundOn } from './chat/sound'
import type { Conversation, Message, People } from './chat/types'
import './chat/alerts.css'

interface Alert {
  key: number
  convId: number
  title: string
  group: string | null
  username: string
  person: People[string] | undefined
  text: string
  at: number
}

const MAX = 3
/** A short, soft two-note chime (no file to download). */
function chime() {
  try {
    const ac = new AudioContext()
    const t = ac.currentTime
    for (const [f, d] of [[880, 0], [1320, 0.11]] as const) {
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t + d)
      g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.22)
      o.connect(g).connect(ac.destination)
      o.start(t + d)
      o.stop(t + d + 0.25)
    }
    window.setTimeout(() => void ac.close(), 600)
  } catch {
    /* no audio */
  }
}

function previewOf(m: Message): string {
  if (m.deleted) return 'Message deleted'
  if (m.attachment) return m.attachment.kind === 'image' ? 'Photo' : m.attachment.kind === 'audio' ? 'Voice note' : `File: ${m.attachment.name}`
  if (m.share) return `Shared: ${m.share.title || m.share.type}`
  if (m.poll) return `Poll: ${m.poll.question ?? ''}`.trim()
  return m.body.replace(/```[\s\S]*?```/g, '[code]').replace(/\s+/g, ' ').trim()
}

export function MessageAlerts() {
  const { user } = useAuth()
  const me = user?.username ?? ''
  const socket = useSocket()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const convs = useRef(new Map<number, { conv: Conversation; people: People; at: number }>())
  const key = useRef(0)
  // Cards someone is replying to stay until they send or close them.
  const held = useRef(new Set<number>())

  // Alerts already on for this device: keep the server's copy fresh.
  useEffect(() => {
    if (me) void refreshPush()
  }, [me])

  const info = useCallback(async (id: number) => {
    const hit = convs.current.get(id)
    if (hit && Date.now() - hit.at < 60_000) return hit
    const r = await api.get<{ conversation: Conversation; people: People }>(`/api/chat/conversations/${id}`)
    const v = { conv: r.conversation, people: r.people, at: Date.now() }
    convs.current.set(id, v)
    return v
  }, [])

  const dismiss = (k: number) => setAlerts((a) => a.filter((x) => x.key !== k))

  useEffect(() => {
    if (!socket || !me) return
    const on = async ({ message }: { message: Message }) => {
      if (!message || message.username === me || message.kind === 'system') return
      const onScreen = openConversation() === message.conversationId && document.visibilityState === 'visible'
      if (onScreen) return
      let v
      try {
        v = await info(message.conversationId)
      } catch {
        return
      }
      const mentioned = message.mentions?.includes(me)
      if ((v.conv.muted && !mentioned) || v.conv.request) return
      const person = v.people[message.username]
      const name = person?.display_name || message.username
      const group = v.conv.kind === 'group' ? v.conv.title || 'Group' : null
      const text = previewOf(message)
      if (document.visibilityState !== 'visible') {
        // In the background: the browser's notification (the service worker's
        // push covers a closed site; this covers an open but hidden tab).
        if ('Notification' in window && Notification.permission === 'granted') {
          const reg = await navigator.serviceWorker?.getRegistration('/').catch(() => undefined)
          const title = group ? `${name} · ${group}` : name
          const opts = { body: text, icon: '/apple-touch-icon.png', tag: `chat-${message.conversationId}`, data: { url: `/messages?c=${message.conversationId}` } }
          if (reg) void reg.showNotification(title, opts)
          else new Notification(title, opts)
        }
        return
      }
      if (alertSoundOn()) chime()
      const a: Alert = { key: ++key.current, convId: message.conversationId, title: name, group, username: message.username, person, text, at: Date.now() }
      setAlerts((cur) => [a, ...cur.filter((x) => x.convId !== a.convId)].slice(0, MAX))
      window.setTimeout(() => {
        if (!held.current.has(a.key)) dismiss(a.key)
      }, 7000)
    }
    socket.on('chat:message', on)
    return () => {
      socket.off('chat:message', on)
    }
  }, [socket, me, info])

  // On the Messages page the list itself shows what is new.
  if (!me || pathname.startsWith('/messages')) return null
  return (
    <div className="ma" aria-live="polite" aria-label="New messages">
      <AnimatePresence initial={false}>
        {alerts.map((a) => (
          <motion.div key={a.key} layout initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.18 }}>
            <AlertCard
              a={a}
              onOpen={() => {
                dismiss(a.key)
                navigate(`/messages?c=${a.convId}`)
              }}
              onClose={() => dismiss(a.key)}
              onSent={() => dismiss(a.key)}
              onHold={() => held.current.add(a.key)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function AlertCard({ a, onOpen, onClose, onSent, onHold }: { a: Alert; onOpen: () => void; onClose: () => void; onSent: () => void; onHold: () => void }) {
  const [reply, setReply] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const send = async () => {
    const body = (reply ?? '').trim()
    if (!body) return
    setBusy(true)
    try {
      await api.post(`/api/chat/conversations/${a.convId}/messages`, { body })
      onSent()
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="ma-card">
      <button type="button" className="ma-open" onClick={onOpen} aria-label={`Open the chat with ${a.title}`}>
        <Avatar src={a.person?.avatar_url ?? undefined} avatar={a.person?.avatar ?? undefined} name={a.title} seed={a.username} size="md" />
        <span className="ma-text">
          <span className="ma-name">
            {a.title}
            {a.group && <span className="ma-group"> · {a.group}</span>}
          </span>
          <span className="ma-body">{a.text}</span>
        </span>
      </button>
      <button type="button" className="ma-x" onClick={onClose} aria-label="Dismiss">
        <X className="size-3.5" aria-hidden="true" />
      </button>
      {reply === null ? (
        <div className="ma-acts">
          <button
            type="button"
            className="ma-act"
            onClick={() => {
              onHold()
              setReply('')
            }}
          >
            Reply
          </button>
          <button type="button" className="ma-act" onClick={onOpen}>
            Open chat
          </button>
        </div>
      ) : (
        <form
          className="ma-reply"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <input autoFocus value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${a.title}`} aria-label={`Reply to ${a.title}`} maxLength={2000} />
          <button type="submit" className="ma-send" disabled={busy || !reply.trim()} aria-label="Send">
            <Send className="size-4" aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  )
}
