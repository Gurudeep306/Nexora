/*
  The quick chat: Messages in a small panel at the bottom right, opened from
  the top bar or a message alert. It stays open as you move around the site,
  so you can reply without leaving the problem or lesson you're on. Not
  modal: the page stays usable. Esc or × closes it; "Open in Community"
  gives the chat the whole window.
*/
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Link2, Maximize2, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from '@/lib/socket'
import { Tooltip, useToast } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { MessagesTab, type ChatNav } from '../MessagesTab'
import { MessageTools } from './MessageTools'
import { messagesHref, onMessagesScreen, quickChat, quickChatFits, useQuickChat } from './quick'
import './quick.css'

export function QuickChat() {
  const { user } = useAuth()
  const socket = useSocket()
  const navigate = useNavigate()
  const location = useLocation()
  const q = useQuickChat()
  const [fits, setFits] = useState(quickChatFits)
  const toast = useToast()
  const [sending, setSending] = useState(false)
  // The page under the panel, to send into the open chat in one tap.
  const [pageTitle, setPageTitle] = useState('')
  useEffect(() => {
    // The page's own title, or its main heading when it has none. Pages set
    // these after they render, so follow the <title> and look again shortly.
    const read = () => {
      const t = document.title.replace(/\s*[·|–-]\s*NexoraGuru\s*$/, '').trim()
      const h = document.querySelector('#main-content h1')?.textContent?.trim() ?? ''
      setPageTitle((t && t !== 'NexoraGuru' ? t : h).slice(0, 120))
    }
    read()
    const t = window.setTimeout(read, 900)
    const el = document.querySelector('title')
    const mo = el ? new MutationObserver(read) : null
    if (el) mo?.observe(el, { childList: true, characterData: true, subtree: true })
    return () => {
      window.clearTimeout(t)
      mo?.disconnect()
    }
  }, [location.pathname, location.search])
  const sharable = location.pathname !== '/' && !!pageTitle
  const sendPage = async () => {
    if (!q.c || sending) return
    setSending(true)
    try {
      await api.post(`/api/chat/conversations/${q.c}/messages`, { body: `${pageTitle}\n${window.location.origin}${location.pathname}${location.search}` })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Couldn’t send the link')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const on = () => setFits(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Not beside the full Messages screen, a call or a sign-in page.
  const away = onMessagesScreen(location) || location.pathname.startsWith('/live') || location.pathname.startsWith('/pad') || location.pathname.startsWith('/snap')
  const shown = !!user && q.open && fits && !away

  useEffect(() => {
    if (!shown) return
    const root = document.documentElement
    root.dataset.quickChat = ''
    const onKey = (e: KeyboardEvent) => {
      // Esc inside a dialog belongs to the dialog.
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) quickChat.close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      delete root.dataset.quickChat
      window.removeEventListener('keydown', onKey)
    }
  }, [shown])

  const nav = useMemo<ChatNav>(
    () => ({
      get: (k) => (k === 'c' ? (q.c ? String(q.c) : null) : k === 'peer' ? q.peer : k === 'join' ? q.join : null),
      set: (patch) => {
        const next: Partial<typeof q> = {}
        if ('c' in patch) next.c = Number(patch.c) || null
        if ('peer' in patch) next.peer = patch.peer ?? null
        if ('join' in patch) next.join = patch.join ?? null
        quickChat.set(next)
      },
    }),
    [q],
  )

  return (
    <AnimatePresence>
      {shown && user && (
        <motion.section
          key="qc"
          className="qchat pop-surface"
          role="region"
          aria-label="Quick chat"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, transition: { duration: 0.14 } }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        >
          <header className="qchat-head">
            <span className="qchat-title">Messages</span>
            <MessageTools compact />
            <Tooltip label="Open in Community" side="bottom">
              <button
                type="button"
                className="msg-tool"
                aria-label="Open in Community"
                onClick={() => {
                  const c = q.c
                  quickChat.close()
                  navigate(messagesHref(c))
                }}
              >
                <Maximize2 className="size-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Close (Esc)" side="bottom">
              <button type="button" className="msg-tool" aria-label="Close quick chat" onClick={() => quickChat.close()}>
                <X className="size-4" aria-hidden="true" />
              </button>
            </Tooltip>
          </header>
          {q.c && sharable && (
            <button type="button" className="qchat-page" onClick={() => void sendPage()} disabled={sending}>
              <Link2 className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="qchat-page-text">
                Send this page: <strong>{pageTitle}</strong>
              </span>
            </button>
          )}
          <div className="qchat-body">
            <MessagesTab me={user.username} socket={socket} compact nav={nav} />
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
