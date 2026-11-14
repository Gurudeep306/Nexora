/* ────────────────────────────────────────────────────────────────────────
   Team chat — one room for every staff member: #general plus a channel per
   project. Share a session, chat, file or pipeline as a link card. Live over
   the Hive socket. Also: the alerts bell (budgets, limits, overnight runs).
   ──────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Bell, CheckCheck, FileText, FolderGit2, Hash, Info, MessageSquare, Send, Workflow, XCircle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { errMsg } from './Improve'
import { projectColor } from './projectColor'
import { useHive } from './store'
import type { ChatMessage, HiveAlert } from './types'
import { UserDot, timeAgo } from './ui'

const LINK_RE = /\[\[(task|convo|drive|pipeline|project):([^|\]]*)\|([^\]]*)\]\]/g
const LINK_ICON = { task: Workflow, convo: MessageSquare, drive: FileText, pipeline: Workflow, project: FolderGit2 } as const

function hrefOf(type: string, id: string, projects: { id: string }[]): string {
  if (type === 'convo') return `/hive/chat/${id}`
  if (type === 'drive') return `/hive/drive?file=${encodeURIComponent(id)}`
  if (type === 'pipeline') return '/hive/pipelines'
  if (type === 'project') return `/hive/p/${id}`
  if (type === 'task') {
    const [pid, tid] = id.includes('/') ? id.split('/') : [projects[0]?.id ?? '', id]
    return `/hive/p/${pid}/t/${tid}`
  }
  return '/hive'
}

function Body({ text }: { text: string }) {
  const { boot } = useHive()
  const navigate = useNavigate()
  const parts: (string | { type: keyof typeof LINK_ICON; id: string; title: string })[] = []
  let last = 0
  for (const m of text.matchAll(LINK_RE)) {
    if (m.index! > last) parts.push(text.slice(last, m.index))
    parts.push({ type: m[1] as keyof typeof LINK_ICON, id: m[2], title: m[3] })
    last = m.index! + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return (
    <>
      {parts.map((p, i) => {
        if (typeof p === 'string') return <span key={i} className="whitespace-pre-wrap break-words">{p.trim() ? p : p.replace(/\n+$/, '')}</span>
        const Icon = LINK_ICON[p.type]
        return (
          <button key={i} type="button" onClick={() => navigate(hrefOf(p.type, p.id, boot?.projects ?? []))} className="mt-1 flex w-full items-center gap-2 rounded-xl bg-bg-surface/70 px-2.5 py-1.5 text-left text-[12px] ring-1 ring-[var(--hive-line)] hover:ring-accent-brand/40">
            <Icon className="size-3.5 shrink-0 text-accent-brand" />
            <span className="truncate font-medium">{p.title || p.type}</span>
            <span className="ml-auto text-[10.5px] capitalize text-text-muted">{p.type}</span>
          </button>
        )
      })}
    </>
  )
}

export function TeamChat({ className }: { className?: string }) {
  const { boot, on, projectId } = useHive()
  const toast = useToast()
  const [channel, setChannel] = useState<string>(projectId ?? 'general')
  const [msgs, setMsgs] = useState<ChatMessage[]>([])
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const chRef = useRef(channel)
  chRef.current = channel
  const channels = useMemo(() => [{ id: 'general', name: 'general', color: null as string | null }, ...(boot?.projects ?? []).map((p) => ({ id: p.id, name: p.name, color: p.color }))], [boot])

  const load = useCallback(async (ch: string) => {
    try {
      setMsgs((await hiveApi.teamChat(ch)).messages)
    } catch {
      setMsgs([])
    }
  }, [])
  useEffect(() => {
    load(channel)
    setUnread((u) => ({ ...u, [channel]: 0 }))
  }, [channel, load])
  useEffect(
    () =>
      on('chat', ((m: ChatMessage) => {
        const ch = m.project_id || 'general'
        if (ch === chRef.current) setMsgs((c) => (c.some((x) => x.id === m.id) ? c : [...c, m]))
        else if (m.username !== boot?.me.username) setUnread((u) => ({ ...u, [ch]: (u[ch] ?? 0) + 1 }))
      }) as never),
    [on, boot],
  )
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [msgs.length, channel])

  const send = async () => {
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      const r = await hiveApi.sendTeamChat({ channel, body })
      setMsgs((c) => (c.some((x) => x.id === r.message.id) ? c : [...c, r.message]))
      setText('')
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  const me = boot?.me.username
  const current = channels.find((c) => c.id === channel)
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="hive-scroll flex shrink-0 gap-1 overflow-x-auto border-b hive-line px-3 py-2">
        {channels.map((c) => (
          <button key={c.id} type="button" onClick={() => setChannel(c.id)} className={cn('relative flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] transition-colors', channel === c.id ? 'bg-accent-brand/12 font-medium text-text-primary' : 'text-text-muted hover:bg-text-primary/[0.05] hover:text-text-primary')}>
            {c.color ? <span className="hive-hex size-2" style={{ background: projectColor(c.color) }} /> : <Hash className="size-3" />}
            <span className="max-w-[110px] truncate">{c.name}</span>
            {(unread[c.id] ?? 0) > 0 && <span className="grid min-w-4 place-items-center rounded-full bg-accent-brand px-1 text-[9px] font-bold text-white">{unread[c.id]}</span>}
          </button>
        ))}
      </div>
      <div className="hive-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        {!msgs.length && (
          <div className="grid place-items-center gap-1.5 py-10 text-center">
            <MessageSquare className="size-5 text-text-muted" />
            <p className="max-w-[240px] text-[12.5px] text-text-muted">{channel === 'general' ? 'Talk with every staff member here — share sessions, chats and files.' : `Coordinate on ${current?.name}: who takes what, reviews, merges.`}</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => {
            const mine = m.username === me
            const grouped = i > 0 && msgs[i - 1].username === m.username && m.created_at - msgs[i - 1].created_at < 5 * 60_000
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className={cn('flex gap-2', mine && 'flex-row-reverse', grouped && '-mt-1.5')}>
                <span className={cn(grouped && 'invisible')}>
                  <UserDot username={m.username} size={7} />
                </span>
                <div className={cn('max-w-[82%] rounded-2xl px-3 py-1.5 text-[13px]', mine ? 'rounded-tr-sm bg-accent-brand/14' : 'rounded-tl-sm bg-text-primary/[0.06]')}>
                  {!mine && !grouped && <div className="text-[10.5px] font-medium text-text-muted">@{m.username}</div>}
                  <Body text={m.body} />
                  <div className="mt-0.5 text-right text-[9.5px] text-text-muted">{timeAgo(m.created_at)}</div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={end} />
      </div>
      <form
        className="hive-composer m-3 flex items-end gap-2 rounded-2xl p-1.5 pl-3"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          placeholder={`Message #${current?.name ?? 'general'}`}
          className="hive-scroll max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-[13px] outline-none placeholder:text-text-muted"
          aria-label="Message"
        />
        <button type="submit" disabled={!text.trim() || busy} className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent-brand text-white transition-opacity disabled:opacity-40" aria-label="Send">
          <Send className="size-3.5" />
        </button>
      </form>
    </div>
  )
}

/** Share something to team chat (used by sessions, chats, Drive, pipelines). */
export async function shareToTeam(attach: { type: 'task' | 'convo' | 'drive' | 'pipeline' | 'project'; id: string; title: string }, channel = 'general', note = 'Shared') {
  return hiveApi.sendTeamChat({ channel, body: note, attach })
}

/* ── Alerts bell ─────────────────────────────────────────────────────── */
const LEVEL = { info: { icon: Info, tone: 'var(--color-state-info)' }, warn: { icon: AlertTriangle, tone: 'var(--color-state-warning)' }, error: { icon: XCircle, tone: 'var(--color-state-error)' } }

export function AlertsBell() {
  const { on } = useHive()
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<HiveAlert[]>([])
  const [unread, setUnread] = useState(0)
  const load = useCallback(async () => {
    try {
      const r = await hiveApi.alerts()
      setAlerts(r.alerts)
      setUnread(r.unread)
    } catch {
      /* quiet */
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => on('alert', load), [on, load])
  const markRead = async () => {
    setUnread(0)
    await hiveApi.readAlerts().catch(() => {})
  }
  return (
    <Popover onOpenChange={(o) => o && unread > 0 && markRead()}>
      <Tooltip label={unread ? `${unread} new alert${unread === 1 ? '' : 's'}` : 'Alerts'}>
        <PopoverTrigger asChild>
          <button type="button" className="relative grid size-8 place-items-center rounded-lg text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary" aria-label="Alerts">
            <Bell className={cn('size-4', unread > 0 && 'origin-top animate-[hive-ring_1.2s_ease-in-out_2]')} />
            {unread > 0 && <span className="absolute right-0.5 top-0.5 grid min-w-3.5 place-items-center rounded-full bg-state-error px-1 text-[9px] font-bold leading-[14px] text-white">{unread}</span>}
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b hive-line px-3.5 py-2.5">
          <span className="text-[13px] font-semibold">Alerts</span>
          <button type="button" onClick={markRead} className="inline-flex items-center gap-1 text-[11.5px] text-text-muted hover:text-text-primary">
            <CheckCheck className="size-3.5" /> Mark read
          </button>
        </div>
        <div className="hive-scroll max-h-[380px] overflow-y-auto p-1.5">
          {!alerts.length && <p className="p-6 text-center text-[12.5px] text-text-muted">All quiet. Budget warnings, plan limits and overnight results land here.</p>}
          {alerts.map((a) => {
            const L = LEVEL[a.level] ?? LEVEL.info
            return (
              <button key={a.id} type="button" onClick={() => a.ref && navigate(a.ref.startsWith('/') ? a.ref : '/hive/spend/budgets')} className={cn('flex w-full gap-2.5 rounded-xl p-2.5 text-left hover:bg-text-primary/[0.04]', !a.read && 'bg-accent-brand/[0.04]')}>
                <L.icon className="mt-0.5 size-4 shrink-0" style={{ color: L.tone }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-medium text-text-primary">{a.title}</span>
                  {a.body && <span className="mt-0.5 block text-[12px] text-text-muted">{a.body}</span>}
                  <span className="mt-0.5 block text-[10.5px] text-text-muted">{timeAgo(a.created_at)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
