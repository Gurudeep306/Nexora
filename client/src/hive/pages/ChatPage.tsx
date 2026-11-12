import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUp,
  BookText,
  Brain,
  Check,
  ChevronDown,
  Columns3,
  Copy,
  Download,
  FileCode2,
  FileText,
  FolderGit2,
  ImageIcon,
  Paperclip,
  Plus,
  RotateCcw,
  Share2,
  Sparkles,
  Square,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'
import { AiMarkdown } from '@/components/ai/AiMarkdown'
import { ConfirmDialog, Modal, Popover, PopoverContent, PopoverTrigger, Tooltip, useToast } from '@/components/ui'
import { apiUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { AgentChip, defaultSpec, noteRecentModel, shortModel, vendorInfo } from '../AgentPicker'
import { FileChips, useUploads } from '../uploads'
import { HiveLogo } from '../HiveLogo'
import { projectColor } from '../projectColor'
import { useHive } from '../store'
import type { AgentSpec, Bootstrap, Convo, ConvoMsg } from '../types'
import { ProviderGlyph, fmtTokens, timeAgo, vendorName } from '../ui'

const fileUrl = (id: string) => apiUrl(`/api/hive/files/${id}`)
const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

type Pending = { id: string; provider?: string; model?: string | null; group?: string | null; text: string; think: string; note?: string; started: number; mine?: boolean }

export default function ChatPage() {
  const { convoId } = useParams()
  const navigate = useNavigate()
  const { boot, on, emit, touchConvos } = useHive()
  const toast = useToast()
  const [messages, setMessages] = useState<ConvoMsg[]>([])
  const [convo, setConvo] = useState<Convo | null>(null)
  const [pending, setPending] = useState<Record<string, Pending>>({})
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [instructions, setInstructions] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(true)
  // A chat we just created ourselves: keep its streaming state across the URL change.
  const ownNew = useRef<string | null>(null)
  // While this tab streams a reply itself, the socket copy of it is ignored.
  const localStream = useRef(false)

  useEffect(() => {
    if (convoId && ownNew.current === convoId) return
    setMessages([])
    setConvo(null)
    setPending({})
    if (!convoId) return
    setLoading(true)
    hiveApi
      .convo(convoId)
      .then((r) => {
        setConvo(r.convo)
        setMessages(r.messages)
      })
      .catch(() => navigate('/hive/chat'))
      .finally(() => setLoading(false))
  }, [convoId, navigate])

  // Other viewers of a shared chat (and other tabs) follow along over the socket.
  useEffect(() => {
    if (!convoId) return
    emit('convo', { id: convoId })
    const offs = [
      on('convo:msg', (m: ConvoMsg) => setMessages((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]))),
      on('convo:start', (d: { id: string; provider?: string; model?: string; group?: string }) => {
        if (localStream.current) return
        setPending((p) => (p[d.id] ? p : { ...p, [d.id]: { id: d.id, provider: d.provider, model: d.model, group: d.group, text: '', think: '', started: Date.now() } }))
      }),
      on('convo:delta', ({ id, text }: { id: string; text: string }) => {
        if (localStream.current) return
        setPending((p) => (p[id] ? { ...p, [id]: { ...p[id], text: p[id].text + text } } : p))
      }),
      on('convo:done', (m: ConvoMsg) => {
        if (localStream.current) return
        setPending((p) => {
          const n = { ...p }
          delete n[m.id]
          return n
        })
        setMessages((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]))
      }),
      on('convo:meta', (m: Partial<Convo> & { id: string }) => setConvo((c) => (c && c.id === m.id ? { ...c, ...m } : c))),
    ]
    return () => {
      offs.forEach((f) => f())
      emit('convo', { id: null })
    }
  }, [convoId, on, emit])

  // Follow the stream unless the reader scrolled up.
  const anyPending = Object.values(pending)
  const streamLen = anyPending.reduce((s, p) => s + p.text.length, 0)
  useEffect(() => {
    if (pinned) end.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, streamLen, pinned])

  const send = useCallback(
    async (body: { text: string; refs: ({ fileId: string } | { projectId: string; path: string })[]; specs: AgentSpec[]; mode: 'text' | 'image' }) => {
      let id = convoId
      if (!id) {
        const r = await hiveApi.createConvo({})
        id = r.convo.id
        ownNew.current = id
        setConvo(r.convo)
        navigate(`/hive/chat/${id}`, { replace: true })
      }
      setPinned(true)
      for (const s of body.specs) noteRecentModel(s.provider, s.model)
      const ctl = new AbortController()
      localStream.current = true
      try {
        await hiveApi.streamMessage(
          id,
          { text: body.text, refs: body.refs, agent: body.specs[0], agents: body.specs.length > 1 ? body.specs : undefined, mode: body.mode },
          (type, data) => {
            const d = data as Record<string, unknown>
            if (type === 'msg') setMessages((l) => (l.some((x) => x.id === (d as unknown as ConvoMsg).id) ? l : [...l, d as unknown as ConvoMsg]))
            else if (type === 'start') setPending((p) => ({ ...p, [d.id as string]: { id: d.id as string, provider: d.provider as string, model: d.model as string, group: d.group as string, text: '', think: '', started: Date.now(), mine: true } as Pending }))
            else if (type === 'delta') setPending((p) => (p[d.id as string] ? { ...p, [d.id as string]: { ...p[d.id as string], text: p[d.id as string].text + (d.text as string) } } : p))
            else if (type === 'thinking') setPending((p) => (p[d.id as string] ? { ...p, [d.id as string]: { ...p[d.id as string], think: (p[d.id as string].think + (d.text as string)).slice(-4000) } } : p))
            else if (type === 'note') setPending((p) => (p[d.id as string] ? { ...p, [d.id as string]: { ...p[d.id as string], note: d.text as string } } : p))
            else if (type === 'done') {
              const m = d as unknown as ConvoMsg
              setPending((p) => {
                const n = { ...p }
                delete n[m.id]
                return n
              })
              setMessages((l) => (l.some((x) => x.id === m.id) ? l.map((x) => (x.id === m.id ? m : x)) : [...l, m]))
            } else if (type === 'error') toast.error((d.error as string) || 'Something went wrong')
          },
          ctl.signal,
        )
      } catch (e) {
        toast.error(errMsg(e))
      } finally {
        localStream.current = false
        setPending({})
        touchConvos()
        if (ownNew.current === id) ownNew.current = null
        hiveApi
          .convo(id)
          .then((r) => {
            setConvo(r.convo)
            setMessages(r.messages)
          })
          .catch(() => {})
      }
    },
    [convoId, navigate, toast, touchConvos],
  )

  // A message handed over from Mission Control: send it once.
  const location = useLocation()
  const handed = useRef(false)
  useEffect(() => {
    const st = location.state as { send?: string; spec?: AgentSpec } | null
    if (!st?.send || handed.current || !boot) return
    handed.current = true
    const spec = st.spec ?? defaultSpec(boot, undefined, undefined)
    navigate(location.pathname, { replace: true, state: null })
    if (spec) send({ text: st.send, refs: [], specs: [spec], mode: 'text' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boot])

  if (!boot) return null
  const mine = !convo || convo.owner === boot.me.username
  const busy = anyPending.length > 0
  const groups = groupMessages(messages)
  const lastUser = [...messages].reverse().find((m) => m.role === 'user') ?? null
  const totalTokens = messages.reduce((s, m) => s + (m.input_tokens ?? 0) + (m.output_tokens ?? 0), 0)

  const exportMd = () => {
    const md = [`# ${convo?.title ?? 'Chat'}`, '', ...messages.map((m) => `## ${m.role === 'user' ? `@${m.author ?? 'you'}` : `${vendorName(m.provider ?? '')} · ${m.model ?? ''}`}\n\n${m.content}${m.error ? `\n\n> Error: ${m.error}` : ''}`)].join('\n\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }))
    a.download = `${(convo?.title ?? 'chat').replace(/[^\w-]+/g, '-').slice(0, 60)}.md`
    a.click()
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {convo && (
        <div className="flex items-center gap-2 border-b hive-line px-4 py-2 sm:px-6">
          <input
            defaultValue={convo.title}
            key={convo.title}
            disabled={!mine}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== convo.title) hiveApi.updateConvo(convo.id, { title: v }).then(touchConvos).catch(() => {})
            }}
            className="min-w-0 flex-1 truncate bg-transparent text-[14px] font-medium outline-none"
          />
          <span className="hidden text-[11.5px] tabular-nums text-text-muted sm:inline">{fmtTokens(totalTokens)} tokens</span>
          <HeaderBtn label="Instructions for this chat" onClick={() => setInstructions(true)} active={!!convo.system}>
            <BookText className="size-4" />
          </HeaderBtn>
          {mine && (
            <HeaderBtn
              label={convo.shared ? 'Shared with staff — click to make private' : 'Private — click to share with staff'}
              active={!!convo.shared}
              onClick={() =>
                hiveApi
                  .updateConvo(convo.id, { shared: !convo.shared })
                  .then(() => {
                    setConvo({ ...convo, shared: convo.shared ? 0 : 1 })
                    touchConvos()
                    toast.success(convo.shared ? 'Chat is private' : 'Shared with all staff')
                  })
                  .catch((e) => toast.error(errMsg(e)))
              }
            >
              <Share2 className="size-4" />
            </HeaderBtn>
          )}
          <HeaderBtn label="Export as Markdown" onClick={exportMd}>
            <Download className="size-4" />
          </HeaderBtn>
          {mine && (
            <HeaderBtn label="Delete chat" onClick={() => setConfirm(true)} danger>
              <Trash2 className="size-4" />
            </HeaderBtn>
          )}
        </div>
      )}

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 120)
        }}
        className="hive-scroll min-h-0 flex-1 overflow-y-auto"
      >
        {!messages.length && !busy && !loading ? (
          <EmptyChat boot={boot} onPick={(t) => document.dispatchEvent(new CustomEvent('hive:compose', { detail: t }))} />
        ) : (
          <div className="mx-auto w-full max-w-[860px] px-4 pb-10 pt-6 sm:px-6">
            {loading && <div className="hive-shimmer h-24 rounded-2xl" />}
            {groups.map((g) =>
              g.kind === 'user' ? (
                <UserBubble key={g.msg.id} m={g.msg} />
              ) : (
                <AnswerGroup key={g.msgs[0].id} msgs={g.msgs} convoId={convo?.id ?? ''} onRetry={(spec) => lastUser && send({ text: lastUser.content, refs: lastUser.attachments.map((a) => ({ fileId: a.id })), specs: [spec], mode: 'text' })} />
              ),
            )}
            {busy && <PendingGroup items={anyPending} />}
            <div ref={end} className="h-1" />
          </div>
        )}
      </div>

      {!pinned && busy && (
        <button type="button" onClick={() => setPinned(true)} className="absolute bottom-36 left-1/2 z-10 -translate-x-1/2 rounded-full bg-bg-surface px-3 py-1.5 text-[12px] shadow-lg ring-1 ring-[var(--hive-line)]">
          ↓ Follow the reply
        </button>
      )}

      <ChatComposer boot={boot} busy={busy} convo={convo} onSend={send} onStop={() => convo && hiveApi.stopConvo(convo.id)} />

      <InstructionsDialog open={instructions} convo={convo} onClose={() => setInstructions(false)} onSaved={(system) => convo && setConvo({ ...convo, system })} />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          if (!convo) return
          await hiveApi.deleteConvo(convo.id).catch(() => {})
          setConfirm(false)
          touchConvos()
          navigate('/hive/chat')
        }}
        title="Delete this chat?"
        message="Its messages and files are removed for everyone."
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}

/* ── grouping: side-by-side answers share a group id ───────────────────── */
type Group = { kind: 'user'; msg: ConvoMsg } | { kind: 'answers'; msgs: ConvoMsg[] }
function groupMessages(list: ConvoMsg[]): Group[] {
  const out: Group[] = []
  for (const m of list) {
    if (m.role === 'user') out.push({ kind: 'user', msg: m })
    else {
      const last = out[out.length - 1]
      if (last?.kind === 'answers' && m.group_id && last.msgs[0].group_id === m.group_id) last.msgs.push(m)
      else out.push({ kind: 'answers', msgs: [m] })
    }
  }
  return out
}

function HeaderBtn({ label, onClick, children, active, danger }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean; danger?: boolean }) {
  return (
    <Tooltip label={label}>
      <button type="button" onClick={onClick} aria-label={label} className={cn('grid size-8 place-items-center rounded-lg transition-colors', active ? 'bg-accent-brand/12 text-accent-brand' : 'text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary', danger && 'hover:bg-state-error/10 hover:text-state-error')}>
        {children}
      </button>
    </Tooltip>
  )
}

/* ── empty state ───────────────────────────────────────────────────────── */
const STARTERS = [
  { icon: FileText, tone: 'var(--color-state-info)', title: 'Read a PDF', text: 'Summarise the attached PDF: key points, numbers and anything I should act on.' },
  { icon: FileCode2, tone: 'var(--color-accent-brand)', title: 'Review code', text: 'Review this code for bugs, edge cases and security issues. Be specific, with line references.' },
  { icon: Columns3, tone: 'var(--color-state-success)', title: 'Compare models', text: 'Explain the trade-offs of SQLite vs Postgres for a small SaaS. Keep it practical.' },
  { icon: Wand2, tone: 'var(--color-state-warning)', title: 'Design an API', text: 'Design a REST API for a contest platform: resources, endpoints, auth and errors.' },
]

function EmptyChat({ boot, onPick }: { boot: Bootstrap; onPick: (t: string) => void }) {
  const hour = new Date().getHours()
  const hello = hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return (
    <div className="relative mx-auto flex h-full max-w-[860px] flex-col items-center justify-center px-6 pb-8 text-center">
      <div className="hive-comb pointer-events-none absolute inset-x-0 top-0 h-80" />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
        <HiveLogo size={58} />
      </motion.div>
      <h1 className="mt-5 text-[30px] font-semibold tracking-[-0.03em]">
        {hello}, <span className="hive-gradient-text">{boot.me.username}</span>
      </h1>
      <p className="mt-2 max-w-lg text-[14px] text-text-muted">Chat with any model you’ve connected. Drop in PDFs, images or code, pull files from a repo, make images — or ask several models at once and compare.</p>
      <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-2">
        {STARTERS.map((s, i) => (
          <motion.button key={s.title} type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} onClick={() => onPick(s.text)} className="hive-card hive-card-hover hive-lift flex items-start gap-3 p-4 text-left">
            <span className="hive-tile size-9 shrink-0" style={{ ['--tile' as string]: s.tone }}>
              <s.icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-medium">{s.title}</span>
              <span className="line-clamp-2 text-[12.5px] text-text-muted">{s.text}</span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

/* ── messages ──────────────────────────────────────────────────────────── */
function UserBubble({ m }: { m: ConvoMsg }) {
  return (
    <div className="hive-in mb-6 flex justify-end">
      <div className="max-w-[85%]">
        {m.attachments.length > 0 && <Attachments files={m.attachments} align="end" />}
        {m.content && <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent-brand/[0.12] px-4 py-2.5 text-[14.5px] leading-relaxed text-text-primary ring-1 ring-accent-brand/20">{m.content}</div>}
        <div className="mt-1 text-right text-[11px] text-text-muted">
          {m.author ? `@${m.author} · ` : ''}
          {timeAgo(m.created_at)}
        </div>
      </div>
    </div>
  )
}

function Attachments({ files, align = 'start' }: { files: ConvoMsg['attachments']; align?: 'start' | 'end' }) {
  return (
    <div className={cn('mb-2 flex flex-wrap gap-2', align === 'end' && 'justify-end')}>
      {files.map((f) =>
        f.mime.startsWith('image/') ? (
          <a key={f.id} href={fileUrl(f.id)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl ring-1 ring-[var(--hive-line)] transition-transform hover:scale-[1.01]">
            <img src={fileUrl(f.id)} alt={f.name} className="max-h-72 max-w-full object-contain" />
          </a>
        ) : (
          <a key={f.id} href={fileUrl(f.id)} className="inline-flex items-center gap-2 rounded-xl bg-text-primary/[0.05] px-3 py-2 text-[12.5px] ring-1 ring-[var(--hive-line)] hover:bg-text-primary/[0.08]">
            {f.mime === 'application/pdf' ? <FileText className="size-4 text-state-error" /> : f.origin === 'repo' ? <FolderGit2 className="size-4 text-text-muted" /> : <FileCode2 className="size-4 text-text-muted" />}
            <span className="max-w-56 truncate">{f.name}</span>
          </a>
        ),
      )}
    </div>
  )
}

function AnswerGroup({ msgs, convoId, onRetry }: { msgs: ConvoMsg[]; convoId: string; onRetry: (spec: AgentSpec) => void }) {
  const [preferred, setPreferred] = useState(() => msgs.find((m) => m.preferred)?.id ?? msgs[0].id)
  if (msgs.length === 1) return <Answer m={msgs[0]} onRetry={onRetry} />
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center gap-2 text-[11.5px] font-medium text-text-muted">
        <Columns3 className="size-3.5" /> {msgs.length} models answered · pick the one the chat continues from
      </div>
      <div className={cn('grid gap-3', msgs.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3')}>
        {msgs.map((m) => (
          <div key={m.id} className={cn('hive-card flex min-w-0 flex-col p-4 transition-shadow', preferred === m.id && 'ring-2 ring-accent-brand/50')}>
            <Answer m={m} compact onRetry={onRetry} />
            <button
              type="button"
              onClick={() => {
                setPreferred(m.id)
                hiveApi.prefer(convoId, m.id).catch(() => {})
              }}
              className={cn('mt-auto inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium', preferred === m.id ? 'bg-accent-brand/15 text-accent-brand' : 'bg-text-primary/[0.05] text-text-secondary hover:bg-text-primary/[0.08]')}
            >
              {preferred === m.id ? <Check className="size-3.5" /> : null} {preferred === m.id ? 'Continuing from this' : 'Continue from this'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Answer({ m, compact, onRetry }: { m: ConvoMsg; compact?: boolean; onRetry: (spec: AgentSpec) => void }) {
  const { boot } = useHive()
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [retryOpen, setRetryOpen] = useState(false)
  const [retrySpec, setRetrySpec] = useState<AgentSpec | null>(null)
  const provider = m.provider ?? 'custom'
  return (
    <div className={cn('hive-in group', !compact && 'mb-8')}>
      <div className="mb-2 flex items-center gap-2">
        <ProviderGlyph provider={provider} size="sm" />
        <span className="text-[13px] font-medium">{vendorName(provider)}</span>
        {m.model && <span className="truncate font-mono text-[11px] text-text-muted">{shortModel(m.model)}</span>}
        <span className="ml-auto shrink-0 text-[11px] tabular-nums text-text-muted">{m.output_tokens ? `${fmtTokens(m.output_tokens)} out · ` : ''}{timeAgo(m.created_at)}</span>
      </div>
      {m.attachments.length > 0 && <Attachments files={m.attachments} />}
      {m.content && <AiMarkdown text={m.content} />}
      {m.error && (
        <div className="mt-2 rounded-xl border border-state-error/30 bg-state-error/[0.07] px-3.5 py-2.5 text-[13px]">
          {m.error.split('\n').map((l, i) => (
            <p key={i} className={i ? 'mt-1 text-text-secondary' : 'font-medium text-state-error'}>
              {l}
            </p>
          ))}
        </div>
      )}
      <div className={cn('mt-2 flex items-center gap-0.5 transition-opacity', compact ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100')}>
        <ActBtn
          label={copied ? 'Copied' : 'Copy'}
          onClick={() => {
            navigator.clipboard?.writeText(m.content)
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </ActBtn>
        <ActBtn label="Ask again" onClick={() => boot && onRetry({ ...(defaultSpec(boot, provider as string, undefined) ?? { provider, keyId: 'auto', model: m.model ?? '' }), model: m.model ?? '' })}>
          <RotateCcw className="size-3.5" />
        </ActBtn>
        {boot && (
          <Popover open={retryOpen} onOpenChange={setRetryOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary">
                <Sparkles className="size-3.5" /> Ask another model <ChevronDown className="size-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3">
              <p className="mb-2 text-[12px] text-text-muted">Re-ask the last question with:</p>
              <AgentChip boot={boot} need="chat" spec={retrySpec ?? defaultSpec(boot, undefined, undefined) ?? { provider, keyId: 'auto', model: '' }} onChange={setRetrySpec} />
              <button
                type="button"
                onClick={() => {
                  const s = retrySpec ?? defaultSpec(boot, undefined, undefined)
                  if (!s) return toast.error('Add a key first')
                  setRetryOpen(false)
                  onRetry(s)
                }}
                className="mt-3 h-8 w-full rounded-lg bg-accent-brand text-[12.5px] font-medium text-on-accent-brand"
              >
                Ask
              </button>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  )
}

function ActBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip label={label}>
      <button type="button" onClick={onClick} aria-label={label} className="grid size-7 place-items-center rounded-md text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary">
        {children}
      </button>
    </Tooltip>
  )
}

function PendingGroup({ items }: { items: Pending[] }) {
  return (
    <div className={cn('mb-8 grid gap-3', items.length > 1 && 'md:grid-cols-2', items.length > 2 && 'xl:grid-cols-3')}>
      {items.map((p) => (
        <PendingAnswer key={p.id} p={p} boxed={items.length > 1} />
      ))}
    </div>
  )
}

function PendingAnswer({ p, boxed }: { p: Pending; boxed: boolean }) {
  const [showThink, setShowThink] = useState(false)
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const secs = Math.round((Date.now() - p.started) / 1000)
  return (
    <div className={cn('min-w-0', boxed && 'hive-card hive-working p-4')}>
      <div className="mb-2 flex items-center gap-2">
        <ProviderGlyph provider={p.provider ?? 'custom'} size="sm" pulse />
        <span className="text-[13px] font-medium">{vendorName(p.provider ?? 'custom')}</span>
        {p.model && <span className="truncate font-mono text-[11px] text-text-muted">{shortModel(p.model)}</span>}
        <span className="ml-auto text-[11px] tabular-nums text-text-muted">{secs}s</span>
      </div>
      {p.note && <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-state-warning/12 px-2.5 py-0.5 text-[11.5px] text-state-warning">{p.note}</div>}
      {p.think && (
        <button type="button" onClick={() => setShowThink((s) => !s)} className="mb-2 flex w-full items-start gap-2 rounded-xl bg-text-primary/[0.04] px-3 py-2 text-left">
          <Brain className="mt-0.5 size-3.5 shrink-0 text-accent-brand" />
          <span className={cn('min-w-0 flex-1 text-[12.5px] italic text-text-muted', !showThink && 'line-clamp-2')}>{p.think}</span>
        </button>
      )}
      {p.text ? <AiMarkdown text={p.text} streaming /> : !p.think && <span className="hive-shine text-[13.5px] font-medium">Thinking…</span>}
    </div>
  )
}

/* ── composer ──────────────────────────────────────────────────────────── */
function ChatComposer({
  boot,
  busy,
  convo,
  onSend,
  onStop,
}: {
  boot: Bootstrap
  busy: boolean
  convo: Convo | null
  onSend: (b: { text: string; refs: ({ fileId: string } | { projectId: string; path: string })[]; specs: AgentSpec[]; mode: 'text' | 'image' }) => Promise<void>
  onStop: () => void
}) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [specs, setSpecs] = useState<AgentSpec[]>(() => {
    const d = defaultSpec(boot, convo?.provider ?? undefined, undefined)
    return d ? [convo?.model ? { ...d, model: convo.model } : d] : []
  })
  const [image, setImage] = useState(false)
  const [repoRefs, setRepoRefs] = useState<{ projectId: string; path: string }[]>([])
  const [drag, setDrag] = useState(false)
  const up = useUploads()
  const ta = useRef<HTMLTextAreaElement>(null)
  const imageCapable = specs.length === 1 && !!vendorInfo(boot, specs[0]?.provider)?.caps.images

  useEffect(() => {
    const onCompose = (e: Event) => {
      setText((e as CustomEvent<string>).detail)
      ta.current?.focus()
    }
    document.addEventListener('hive:compose', onCompose)
    return () => document.removeEventListener('hive:compose', onCompose)
  }, [])
  useEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(280, el.scrollHeight)}px`
  }, [text])

  const submit = async () => {
    const body = text.trim()
    if ((!body && !up.files.length && !repoRefs.length) || busy || up.busy) return
    if (!specs.length) return toast.error('Add an AI key first (Keys)')
    setText('')
    const refs = [...up.files.map((f) => ({ fileId: f.id })), ...repoRefs]
    up.setFiles([])
    setRepoRefs([])
    await onSend({ text: body, refs, specs, mode: image && imageCapable ? 'image' : 'text' })
  }

  return (
    <div className="shrink-0 px-3 pb-3 pt-1 sm:px-6 sm:pb-5">
      <div
        onDragOver={(e) => (e.preventDefault(), setDrag(true))}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          if (e.dataTransfer.files.length) up.add(e.dataTransfer.files)
        }}
        className={cn('hive-composer relative mx-auto w-full max-w-[860px] rounded-[22px] p-2.5', drag && 'ring-2 ring-accent-brand/60')}
      >
        <AnimatePresence>{drag && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 grid place-items-center rounded-[22px] bg-accent-brand/10 text-[13px] font-medium text-accent-brand">Drop files to attach</motion.div>}</AnimatePresence>
        {(up.files.length > 0 || repoRefs.length > 0) && (
          <div className="mb-2 flex flex-wrap gap-1.5 px-1.5 pt-1">
            <FileChips files={up.files} onRemove={up.remove} />
            {repoRefs.map((r) => (
              <span key={`${r.projectId}:${r.path}`} className="inline-flex max-w-64 items-center gap-1.5 rounded-lg bg-text-primary/[0.06] py-1 pl-2 pr-1 text-[12px] text-text-secondary">
                <FolderGit2 className="size-3.5 text-text-muted" />
                <span className="truncate font-mono">{r.path}</span>
                <button type="button" onClick={() => setRepoRefs((x) => x.filter((y) => y !== r))} className="grid size-4 place-items-center rounded text-text-muted hover:text-text-primary" aria-label="Remove">
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={ta}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files)
            if (files.length) {
              e.preventDefault()
              up.add(files)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          rows={1}
          autoFocus
          placeholder={image && imageCapable ? 'Describe the image to create…' : specs.length > 1 ? `Ask ${specs.length} models at once…` : `Message ${specs[0] ? shortModel(specs[0].model) : 'a model'}…  (⇧↵ for a new line)`}
          className="hive-scroll block max-h-[280px] min-h-[44px] w-full resize-none bg-transparent px-2.5 py-2 text-[15px] leading-relaxed outline-none placeholder:text-text-muted"
        />
        <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1">
          <label className="grid size-8 cursor-pointer place-items-center rounded-full text-text-muted hover:bg-text-primary/[0.07] hover:text-text-primary" title="Attach files, images, PDFs">
            <Paperclip className="size-4" />
            <input type="file" multiple className="hidden" onChange={(e) => e.target.files && up.add(e.target.files)} />
          </label>
          <RepoFilePicker onPick={(r) => setRepoRefs((x) => (x.some((y) => y.path === r.path && y.projectId === r.projectId) ? x : [...x, r]))} />
          <span className="mx-1 h-5 w-px bg-[var(--hive-line)]" />
          {specs.map((s, i) => (
            <AgentChip key={i} boot={boot} spec={s} need="chat" side="top" compact={specs.length > 1} onChange={(n) => setSpecs((l) => l.map((x, j) => (j === i ? n : x)))} onRemove={specs.length > 1 ? () => setSpecs((l) => l.filter((_, j) => j !== i)) : undefined} />
          ))}
          {specs.length < 4 && specs.length > 0 && (
            <Tooltip label="Ask another model at the same time (side by side)">
              <button
                type="button"
                onClick={() => {
                  const used = new Set(specs.map((s) => s.provider))
                  const next = boot.catalogue.providers.map((p) => p.id).find((p) => !used.has(p) && boot.keys.some((k) => k.provider === p && !k.disabled))
                  const d = defaultSpec(boot, next ?? specs[0].provider, undefined)
                  if (d) setSpecs((l) => [...l, d])
                }}
                className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] text-text-muted ring-1 ring-dashed ring-[var(--hive-line-strong)] hover:text-text-primary"
              >
                <Plus className="size-3.5" /> Compare
              </button>
            </Tooltip>
          )}
          {imageCapable && (
            <button type="button" onClick={() => setImage((v) => !v)} className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition-colors', image ? 'bg-accent-brand/15 text-accent-brand' : 'text-text-muted hover:bg-text-primary/[0.06]')}>
              <ImageIcon className="size-3.5" /> Image
            </button>
          )}
          <span className="ml-auto" />
          {busy ? (
            <button type="button" onClick={onStop} className="grid size-9 place-items-center rounded-full bg-text-primary text-bg-app transition-transform hover:scale-105" aria-label="Stop">
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={(!text.trim() && !up.files.length && !repoRefs.length) || up.busy} className="grid size-9 place-items-center rounded-full bg-accent-brand text-on-accent-brand shadow-sm transition-all enabled:hover:scale-105 disabled:opacity-35" aria-label="Send">
              <ArrowUp className="size-4" strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>
      <p className="mx-auto mt-1.5 max-w-[860px] text-center text-[11px] text-text-muted">Models can be wrong. Chats are private unless you share them.</p>
    </div>
  )
}

function RepoFilePicker({ onPick }: { onPick: (r: { projectId: string; path: string }) => void }) {
  const { boot } = useHive()
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [paths, setPaths] = useState<string[] | null>(null)
  const [q, setQ] = useState('')
  const projects = (boot?.projects ?? []).filter((p) => p.repo_owner)
  const pid = projectId ?? projects[0]?.id ?? null
  useEffect(() => {
    if (!open || !pid) return
    setPaths(null)
    hiveApi
      .projectTree(pid)
      .then((r) => setPaths(r.paths))
      .catch(() => setPaths([]))
  }, [open, pid])
  const shown = useMemo(() => (paths ?? []).filter((p) => p.toLowerCase().includes(q.toLowerCase())).slice(0, 200), [paths, q])
  if (!projects.length) return null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip label="Attach a file from a repository">
        <PopoverTrigger asChild>
          <button type="button" className="grid size-8 place-items-center rounded-full text-text-muted hover:bg-text-primary/[0.07] hover:text-text-primary" aria-label="Attach from repo">
            <FolderGit2 className="size-4" />
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent side="top" align="start" className="w-[380px] p-0">
        <div className="flex gap-1 overflow-x-auto border-b hive-line p-2">
          {projects.map((p) => (
            <button key={p.id} type="button" onClick={() => setProjectId(p.id)} className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[12px]', p.id === pid ? 'bg-text-primary/[0.08] text-text-primary' : 'text-text-muted')}>
              <span className="hive-hex size-2.5" style={{ background: projectColor(p.color) }} />
              {p.name}
            </button>
          ))}
        </div>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a file…" className="h-10 w-full border-b hive-line bg-transparent px-3 text-[13px] outline-none" />
        <div className="hive-scroll max-h-72 overflow-y-auto p-1">
          {paths === null && <div className="hive-shimmer m-2 h-20 rounded-lg" />}
          {shown.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                if (pid) onPick({ projectId: pid, path: p })
                setOpen(false)
              }}
              className="block w-full truncate rounded-md px-2 py-1.5 text-left font-mono text-[12px] text-text-secondary hover:bg-text-primary/[0.06] hover:text-text-primary"
            >
              {p}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function InstructionsDialog({ open, convo, onClose, onSaved }: { open: boolean; convo: Convo | null; onClose: () => void; onSaved: (s: string) => void }) {
  const [v, setV] = useState('')
  const toast = useToast()
  useEffect(() => {
    if (open) setV(convo?.system ?? '')
  }, [open, convo])
  return (
    <Modal open={open} onClose={onClose} title="Instructions for this chat" description="A system prompt every reply in this chat follows — a persona, a format, a codebase’s conventions." size="lg">
      <textarea value={v} onChange={(e) => setV(e.target.value)} rows={10} className="w-full rounded-xl border hive-line bg-text-primary/[0.03] p-3 text-[13.5px] outline-none focus:border-accent-brand/50" placeholder="e.g. You are a senior React + Node reviewer for the NexoraGuru codebase. Answer with code first." />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-[13px] text-text-secondary hover:bg-text-primary/[0.06]">
          Cancel
        </button>
        <button
          type="button"
          disabled={!convo}
          onClick={async () => {
            if (!convo) return
            try {
              await hiveApi.updateConvo(convo.id, { system: v })
              onSaved(v)
              toast.success('Instructions saved')
              onClose()
            } catch (e) {
              toast.error(errMsg(e))
            }
          }}
          className="h-9 rounded-lg bg-accent-brand px-4 text-[13px] font-medium text-on-accent-brand disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </Modal>
  )
}
