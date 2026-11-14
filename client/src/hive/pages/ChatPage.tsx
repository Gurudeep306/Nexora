import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
  Gavel,
  Globe,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  Wrench,
  XCircle,
  Sparkles,
  Square,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'
import { AiMarkdown } from '@/components/ai/AiMarkdown'
import { ConfirmDialog, Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger, Modal, Popover, PopoverContent, PopoverTrigger, Tooltip, useToast } from '@/components/ui'
import { apiUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { AgentChip, defaultSpec, noteRecentModel, shortModel, vendorInfo } from '../AgentPicker'
import { FileChips, useUploads } from '../uploads'
import { AgentAvatar, AgentMark, describeTool } from '../agents'
import { HiveLogo } from '../HiveLogo'
import { ImproveButton } from '../Improve'
import { projectColor } from '../projectColor'
import { setFocusProject } from '../Showcase'
import { useHive } from '../store'
import type { AgentSpec, Bootstrap, ChatToolStep, Convo, ConvoMsg, HiveFile, Project } from '../types'
import { fmtTokens, timeAgo, vendorName } from '../ui'

const fileUrl = (id: string) => apiUrl(`/api/hive/files/${id}`)
const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

type Pending = { id: string; provider?: string; model?: string | null; group?: string | null; text: string; think: string; note?: string; started: number; mine?: boolean; tools?: ChatToolStep[]; files?: HiveFile[] }

export default function ChatPage() {
  const { convoId } = useParams()
  const navigate = useNavigate()
  const { boot, on, emit, touchConvos } = useHive()
  const toast = useToast()
  const [messages, setMessages] = useState<ConvoMsg[]>([])
  const [convo, setConvo] = useState<Convo | null>(null)
  const chatProject = useMemo(() => (convo?.project_id ? (boot?.projects.find((p) => p.id === convo.project_id) ?? null) : null), [boot, convo?.project_id])
  // A project chat puts its project in focus (top bar, Copilot).
  useEffect(() => {
    if (chatProject) setFocusProject(chatProject.id)
  }, [chatProject])
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
      on('convo:thinking', ({ id, text }: { id: string; text: string }) => {
        if (localStream.current) return
        setPending((p) => (p[id] ? { ...p, [id]: { ...p[id], think: (p[id].think + text).slice(-4000) } } : p))
      }),
      on('convo:note', ({ id, text }: { id: string; text: string }) => {
        if (localStream.current) return
        setPending((p) => (p[id] ? { ...p, [id]: { ...p[id], note: text } } : p))
      }),
      on('convo:tool', ({ id, tool }: { id: string; tool: ChatToolStep }) => !localStream.current && setPending((p) => withTool(p, id, tool))),
      on('convo:tool_done', ({ id, tool }: { id: string; tool: ChatToolStep }) => !localStream.current && setPending((p) => withTool(p, id, tool))),
      on('convo:verdict', (v: { groupId: string; winner: string }) => setMessages((l) => l.map((m) => (m.group_id === v.groupId ? { ...m, preferred: m.id === v.winner ? 1 : 0 } : m)))),
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
            else if (type === 'tool' || type === 'tool_done') setPending((p) => withTool(p, d.id as string, d.tool as ChatToolStep))
            else if (type === 'attachment') setPending((p) => (p[d.id as string] ? { ...p, [d.id as string]: { ...p[d.id as string], files: [...(p[d.id as string].files ?? []), d.file as HiveFile] } } : p))
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
  const canEditTitle = mine || boot.me.admin
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
            disabled={!canEditTitle}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== convo.title) hiveApi.updateConvo(convo.id, { title: v }).then(touchConvos).catch(() => {})
            }}
            className="min-w-0 flex-1 truncate bg-transparent text-[14px] font-medium outline-none"
          />
          {chatProject && (
            <button type="button" onClick={() => navigate(`/hive/p/${chatProject.id}`)} className="hidden shrink-0 items-center gap-1.5 rounded-full bg-accent-brand/10 px-2.5 py-0.5 text-[11.5px] font-medium text-accent-brand hover:bg-accent-brand/15 sm:inline-flex" title="This chat is about this project: it reads its code and brief">
              <FolderGit2 className="size-3.5" /> {chatProject.repo_owner ? `${chatProject.repo_owner}/${chatProject.repo_name}` : chatProject.name}
            </button>
          )}
          {!mine && convo.owner && <span className="hidden items-center gap-1 rounded-full bg-text-primary/[0.05] px-2 py-0.5 text-[11px] text-text-muted sm:inline-flex">started by @{convo.owner}</span>}
          <span className="hidden text-[11.5px] tabular-nums text-text-muted sm:inline">{fmtTokens(totalTokens)} tokens</span>
          <HeaderBtn label="Instructions for this chat" onClick={() => setInstructions(true)} active={!!convo.system}>
            <BookText className="size-4" />
          </HeaderBtn>
          <HeaderBtn
            label={convo.tools === 0 ? 'Web search, documents & tools are off — click to turn on' : 'Web search, documents & tools are on — click to turn off'}
            active={convo.tools !== 0}
            onClick={() => {
              const next = convo.tools === 0
              hiveApi
                .setConvoTools(convo.id, next)
                .then(() => {
                  setConvo({ ...convo, tools: next ? 1 : 0 })
                  toast.success(next ? 'Tools on: web search, reading pages, documents, Drive and connected MCP tools' : 'Tools off: plain answers only')
                })
                .catch((e) => toast.error(errMsg(e)))
            }}
          >
            <Globe className="size-4" />
          </HeaderBtn>
          <ExportMenu convoId={convo.id} onMarkdown={exportMd} />
          {(mine || boot.me.admin) && (
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
          <EmptyChat boot={boot} project={chatProject} onPick={(t) => document.dispatchEvent(new CustomEvent('hive:compose', { detail: t }))} />
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
        message="Its messages and files are removed for the whole team."
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}

/** Add or update a tool step on a streaming reply. */
function withTool(p: Record<string, Pending>, id: string, tool: ChatToolStep): Record<string, Pending> {
  const cur = p[id]
  if (!cur || !tool) return p
  const list = cur.tools ?? []
  const i = list.findIndex((t) => t.id === tool.id)
  return { ...p, [id]: { ...cur, tools: i >= 0 ? list.map((t, j) => (j === i ? { ...t, ...tool } : t)) : [...list, tool] } }
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

const PROJECT_STARTERS = [
  { icon: FolderGit2, tone: 'var(--color-accent-brand)', title: 'Explain this codebase', text: 'Explain this project: what it does, the stack, how the code is laid out and the main flows. Read the code first.' },
  { icon: Wrench, tone: 'var(--color-state-info)', title: 'How do I run it?', text: 'How do I install, run and test this project locally? Give the exact commands from its files.' },
  { icon: Gavel, tone: 'var(--color-state-warning)', title: 'What is unfinished?', text: 'What looks unfinished, broken or risky in this repo? List concrete files and what to do about each.' },
  { icon: Sparkles, tone: 'var(--color-state-success)', title: 'What should I build next?', text: 'Suggest the 3 most valuable next features or fixes for this project, with where in the code each would go.' },
]

function EmptyChat({ boot, project, onPick }: { boot: Bootstrap; project?: Project | null; onPick: (t: string) => void }) {
  if (project) {
    return (
      <div className="mx-auto flex h-full max-w-[860px] flex-col items-center justify-center px-6 pb-8 text-center">
        <span className="hive-tile size-14" style={{ ['--tile' as string]: 'var(--color-accent-brand)' }}>
          <FolderGit2 className="size-6" />
        </span>
        <h1 className="mt-4 text-[26px] font-semibold tracking-[-0.02em]">{project.name}</h1>
        <p className="mt-1 text-[13px] text-text-muted">{project.repo_owner ? `${project.repo_owner}/${project.repo_name}` : 'Local folder'}</p>
        <p className="mt-3 max-w-lg text-[14px] text-text-secondary">Ask anything about this project. The chat reads its code and the brief Hive wrote, so answers are about this repo — not in general.</p>
        <div className="mt-7 grid w-full gap-2.5 sm:grid-cols-2">
          {PROJECT_STARTERS.map((s) => (
            <button key={s.title} type="button" onClick={() => onPick(s.text)} className="hive-card hive-card-hover hive-lift flex items-start gap-3 p-4 text-left">
              <span className="hive-tile size-9 shrink-0" style={{ ['--tile' as string]: s.tone }}>
                <s.icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium">{s.title}</span>
                <span className="line-clamp-2 text-[12.5px] text-text-muted">{s.text}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }
  const hour = new Date().getHours()
  const hello = hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return (
    <div className="relative mx-auto flex h-full max-w-[860px] flex-col items-center justify-center px-6 pb-8 text-center">
      <HiveLogo size={44} />
      <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.02em] text-[var(--hv-text-1)]">
        {hello}, {boot.me.username}
      </h1>
      <p className="mt-2 max-w-lg text-[13.5px] text-[var(--hv-text-3)]">Chat with any model you’ve connected. Drop in PDFs, images or code, pull files from a repo, make images — or ask several models at once and compare.</p>
      <div className="mt-8 grid w-full gap-2 text-left sm:grid-cols-2">
        {STARTERS.map((s) => (
          <button key={s.title} type="button" onClick={() => onPick(s.text)} className="flex items-start gap-3 rounded-[var(--hv-r-card)] border border-[var(--hv-border)] bg-[var(--hv-surface-1)] p-3.5 text-left transition-colors duration-[var(--hv-d-fast)] hover:border-[var(--hv-border-strong)] hover:bg-[var(--hv-surface-2)]">
            <s.icon className="mt-0.5 size-4 shrink-0 text-[var(--hv-text-2)]" />
            <span className="min-w-0">
              <span className="block text-[13.5px] font-medium text-[var(--hv-text-1)]">{s.title}</span>
              <span className="line-clamp-2 text-[12.5px] text-[var(--hv-text-3)]">{s.text}</span>
            </span>
          </button>
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
  const toast = useToast()
  const [preferred, setPreferred] = useState(() => msgs.find((m) => m.preferred)?.id ?? msgs[0].id)
  const [judging, setJudging] = useState(false)
  const [verdict, setVerdict] = useState<{ winner: string; reason?: string; judge?: string } | null>(null)
  if (msgs.length === 1) return <Answer m={msgs[0]} convoId={convoId} onRetry={onRetry} />
  const groupId = msgs[0].group_id
  const judgeNow = async () => {
    if (!groupId) return
    setJudging(true)
    try {
      const r = await hiveApi.judgeChat(convoId, groupId)
      setPreferred(r.verdict.winner)
      const j = r.verdict.judge
      setVerdict({ winner: r.verdict.winner, reason: r.verdict.reason, judge: typeof j === 'string' ? j : j?.model })
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setJudging(false)
    }
  }
  return (
    <div className="mb-8">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11.5px] font-medium text-text-muted">
        <Columns3 className="size-3.5" /> {msgs.length} models answered · pick the one the chat continues from
        {groupId && (
          <button type="button" onClick={judgeNow} disabled={judging} className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-full bg-[linear-gradient(120deg,color-mix(in_oklab,var(--color-accent-brand)_16%,transparent),color-mix(in_oklab,oklch(70%_0.14_60)_14%,transparent))] px-3 text-[12px] font-medium text-text-primary transition-opacity disabled:opacity-60">
            {judging ? <Loader2 className="size-3.5 animate-spin" /> : <Gavel className="size-3.5" />} {judging ? 'The Judge is reading…' : 'Let the Judge pick'}
          </button>
        )}
      </div>
      <AnimatePresence>
        {verdict && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mb-3 flex items-start gap-2.5 rounded-2xl bg-state-success/[0.07] px-3.5 py-2.5 text-[12.5px]">
            <Gavel className="mt-0.5 size-4 shrink-0 text-state-success" />
            <span className="text-text-secondary">
              <b className="text-text-primary">Winner: {(() => { const w = msgs.find((m) => m.id === verdict.winner); return w ? `${vendorName(w.provider ?? '')} · ${shortModel(w.model ?? '')}` : 'picked' })()}</b>
              {verdict.reason ? ` — ${verdict.reason}` : ''}
              {verdict.judge ? <span className="text-text-muted"> (judged by {verdict.judge})</span> : null}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={cn('grid gap-3', msgs.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3')}>
        {msgs.map((m) => (
          <div key={m.id} className={cn('hive-card flex min-w-0 flex-col p-4 transition-shadow', preferred === m.id && 'ring-2 ring-accent-brand/50')}>
            <Answer m={m} compact convoId={convoId} onRetry={onRetry} />
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

function Answer({ m, compact, convoId, onRetry }: { m: ConvoMsg; compact?: boolean; convoId: string; onRetry: (spec: AgentSpec) => void }) {
  const { boot } = useHive()
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [rating, setRating] = useState<number | null>(m.rating ?? null)
  const rate = (good: boolean) => {
    setRating(good ? 1 : -1)
    hiveApi.rateMessage(convoId, m.id, good).then(() => toast.success(good ? 'Thanks — Hive will favour this model for work like this' : 'Noted — Hive will route this kind of work elsewhere more often')).catch(() => {})
  }
  const [retryOpen, setRetryOpen] = useState(false)
  const [retrySpec, setRetrySpec] = useState<AgentSpec | null>(null)
  const provider = m.provider ?? 'custom'
  return (
    <div className={cn('hive-in group', !compact && 'mb-8')}>
      <div className="mb-2 flex items-center gap-2">
        <AgentMark provider={provider} model={m.model} size={22} />
        <span className="text-[13px] font-medium">{vendorName(provider)}</span>
        {m.model && <span className="truncate font-mono text-[11px] text-text-muted">{shortModel(m.model)}</span>}
        <span className="ml-auto shrink-0 text-[11px] tabular-nums text-text-muted">{m.output_tokens ? `${fmtTokens(m.output_tokens)} out · ` : ''}{timeAgo(m.created_at)}</span>
      </div>
      {m.tools && m.tools.length > 0 && <ToolSteps tools={m.tools} />}
      {m.content && <AiMarkdown text={m.content} />}
      {m.attachments.length > 0 && <Attachments files={m.attachments} />}
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
        {m.content && !m.error && (
          <>
            <ActBtn label="Good answer" onClick={() => rate(true)}>
              <ThumbsUp className={cn('size-3.5', rating === 1 && 'fill-current text-state-success')} />
            </ActBtn>
            <ActBtn label="Bad answer" onClick={() => rate(false)}>
              <ThumbsDown className={cn('size-3.5', rating === -1 && 'fill-current text-state-error')} />
            </ActBtn>
            <ExportMenu convoId={convoId} messageId={m.id} small />
          </>
        )}
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
        <AgentAvatar provider={p.provider ?? 'custom'} model={p.model} state={p.tools?.some((t) => t.status === 'running') ? (p.tools.at(-1)?.name.includes('search') || p.tools.at(-1)?.name.includes('read') ? 'reading' : 'running') : p.text ? 'writing' : 'thinking'} size={26} />
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
      {p.tools && p.tools.length > 0 && <ToolSteps tools={p.tools} live />}
      {p.text ? <AiMarkdown text={p.text} streaming /> : !p.think && !p.tools?.length && <span className="hive-shine text-[13.5px] font-medium">Thinking…</span>}
      {p.files && p.files.length > 0 && <Attachments files={p.files} />}
    </div>
  )
}

/* ── tool steps: what the model did (search, read, documents, MCP) ─────── */
function ToolSteps({ tools, live }: { tools: ChatToolStep[]; live?: boolean }) {
  const [open, setOpen] = useState(!!live)
  const running = tools.filter((t) => t.status === 'running').length
  const shown = open ? tools : tools.slice(-1)
  return (
    <div className="mb-2.5 rounded-2xl bg-text-primary/[0.035] px-3 py-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left text-[12px] text-text-muted">
        <Wrench className="size-3.5" />
        <span className="font-medium text-text-secondary">{running ? `Working · ${tools.length} step${tools.length === 1 ? '' : 's'}` : `Used ${tools.length} tool${tools.length === 1 ? '' : 's'}`}</span>
        <ChevronDown className={cn('ml-auto size-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      <ul className="mt-1.5 space-y-1">
        <AnimatePresence initial={false}>
          {shown.map((t) => {
            const results = (t.meta?.results as { title: string; url: string }[] | undefined) ?? []
            return (
              <motion.li key={t.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="text-[12.5px]">
                <div className="flex items-center gap-2">
                  {t.status === 'running' ? <Loader2 className="size-3.5 shrink-0 animate-spin text-accent-brand" /> : t.status === 'error' ? <XCircle className="size-3.5 shrink-0 text-state-error" /> : <Check className="size-3.5 shrink-0 text-state-success" />}
                  <span className={cn('min-w-0 truncate', t.status === 'running' ? 'hive-thinking-text text-text-primary' : 'text-text-secondary')}>{describeTool(t.name, t.input)}</span>
                </div>
                {open && results.length > 0 && (
                  <div className="ml-5.5 mt-1 flex flex-wrap gap-1">
                    {results.slice(0, 5).map((r) => (
                      <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="inline-flex max-w-[220px] items-center gap-1 rounded-md bg-bg-surface px-1.5 py-0.5 text-[11px] text-text-muted ring-1 ring-[var(--hive-line)] hover:text-text-primary">
                        <img src={`https://www.google.com/s2/favicons?domain=${(() => { try { return new URL(r.url).hostname } catch { return '' } })()}&sz=32`} alt="" className="size-3 rounded-sm" />
                        <span className="truncate">{r.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </div>
  )
}

/* ── export: the whole chat, or one answer, as PDF / Word / slides / web page ── */
function ExportMenu({ convoId, messageId, small, onMarkdown }: { convoId: string; messageId?: string; small?: boolean; onMarkdown?: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const run = async (format: 'pdf' | 'docx' | 'html' | 'md' | 'slides') => {
    setBusy(true)
    try {
      const r = await hiveApi.exportConvo(convoId, { format, messageId })
      const a = document.createElement('a')
      a.href = `${fileUrl(r.file.id)}?download=1`
      a.download = r.file.name
      a.click()
      toast.success(`${r.file.name} is ready${r.drive ? ' — also saved to Drive' : ''}${r.note ? ` (${r.note})` : ''}`)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Menu>
      <Tooltip label={messageId ? 'Save this answer as a document' : 'Export the chat'}>
        <MenuTrigger asChild>
          <button type="button" aria-label="Export" className={cn('grid place-items-center text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary', small ? 'size-7 rounded-md' : 'size-8 rounded-lg')}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : messageId ? <FileText className="size-3.5" /> : <Download className="size-4" />}
          </button>
        </MenuTrigger>
      </Tooltip>
      <MenuContent align="end">
        <MenuLabel>{messageId ? 'Save answer as' : 'Export chat as'}</MenuLabel>
        <MenuItem onSelect={() => run('pdf')}>PDF</MenuItem>
        <MenuItem onSelect={() => run('docx')}>Word (.docx)</MenuItem>
        <MenuItem onSelect={() => run('slides')}>Slides (HTML deck)</MenuItem>
        <MenuItem onSelect={() => run('html')}>Web page</MenuItem>
        <MenuItem onSelect={() => (onMarkdown ? onMarkdown() : run('md'))}>Markdown</MenuItem>
      </MenuContent>
    </Menu>
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
  const [params, setParams] = useSearchParams()
  const [specs, setSpecs] = useState<AgentSpec[]>(() => {
    // ?model=vendor|model (from Models → "Chat with it") picks that model.
    const want = params.get('model')
    if (want) {
      const [vendor, model] = want.split('|')
      const d = defaultSpec(boot, vendor, undefined)
      if (d) return [{ ...d, model: model || d.model }]
    }
    const d = defaultSpec(boot, convo?.provider ?? undefined, undefined)
    return d ? [convo?.model ? { ...d, model: convo.model } : d] : []
  })
  const [image, setImage] = useState(false)
  const [repoRefs, setRepoRefs] = useState<{ projectId: string; path: string }[]>([])
  const [drag, setDrag] = useState(false)
  const up = useUploads()
  const ta = useRef<HTMLTextAreaElement>(null)
  // ?drive=<fileId> (from Drive → "Ask in chat") attaches that file.
  const driveRef = params.get('drive')
  const setFiles = up.setFiles
  useEffect(() => {
    if (!driveRef) return
    setFiles((x) => (x.some((f) => f.id === driveRef) ? x : [...x, { id: driveRef, name: params.get('name') || 'File from Drive', mime: '', size: 0 }]))
    setParams(
      (p) => {
        p.delete('drive')
        p.delete('name')
        p.delete('model')
        return p
      },
      { replace: true },
    )
  }, [driveRef, params, setFiles, setParams])
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
        className={cn('hv-composer relative mx-auto w-full max-w-[860px] rounded-[16px] border border-[var(--hv-border)] bg-[var(--hv-surface-1)] p-2.5 transition-shadow duration-[var(--hv-d-fast)]', drag && 'ring-2 ring-accent-brand/60')}
      >
        <AnimatePresence>{drag && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 grid place-items-center rounded-[16px] bg-accent-brand/10 text-[13px] font-medium text-accent-brand">Drop files to attach</motion.div>}</AnimatePresence>
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
          placeholder={image && imageCapable ? 'Describe the image to create…' : specs.length > 1 ? `Ask ${specs.length} models at once…` : `${specs[0]?.provider === 'auto' || !specs[0]?.model ? 'Ask anything — Auto picks the right model' : `Message ${shortModel(specs[0].model)}`}…  (⇧↵ for a new line)`}
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
          {!busy && <ImproveButton value={text} onApply={(t) => setText(t)} mode="chat" projectId={convo?.project_id ?? null} />}
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
      <p className="mx-auto mt-1.5 max-w-[860px] text-center text-[11px] text-text-muted">Models can be wrong. Every chat is visible to the whole staff team.</p>
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
