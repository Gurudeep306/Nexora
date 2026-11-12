import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowUp, Copy, FileText, FolderGit2, ImageIcon, Loader2, MessageCirclePlus, Paperclip, RotateCcw, Search, Share2, Square, Trash2, X } from 'lucide-react'
import { AiMarkdown } from '@/components/ai/AiMarkdown'
import { Button, ConfirmDialog, Popover, PopoverContent, PopoverTrigger, useToast } from '@/components/ui'
import { apiUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { AgentChip, defaultSpec, vendorInfo } from '../AgentPicker'
import { FileChips, useUploads } from '../Composer'
import { projectColor } from '../projectColor'
import { useHive } from '../store'
import type { AgentSpec, Convo, ConvoMsg, HiveFile } from '../types'
import { ProviderGlyph, UserDot, timeAgo, vendorName } from '../ui'

const fileUrl = (id: string) => apiUrl(`/api/hive/files/${id}`)

export default function ChatPage() {
  const { convoId } = useParams()
  const navigate = useNavigate()
  const { boot, on, emit, convosVersion } = useHive()
  const toast = useToast()
  const [convos, setConvos] = useState<Convo[]>([])
  const [q, setQ] = useState('')
  const [messages, setMessages] = useState<ConvoMsg[]>([])
  const [convo, setConvo] = useState<Convo | null>(null)
  const [pending, setPending] = useState<{ id: string; text: string; think: string; note?: string } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  const loadList = useCallback(() => hiveApi.convos().then((r) => setConvos(r.convos)).catch(() => {}), [])
  useEffect(() => {
    loadList()
  }, [loadList, convosVersion])

  useEffect(() => {
    setMessages([])
    setConvo(null)
    setPending(null)
    if (!convoId) return
    emit('convo', { id: convoId })
    hiveApi
      .convo(convoId)
      .then((r) => {
        setConvo(r.convo)
        setMessages(r.messages)
      })
      .catch(() => navigate('/hive/chat'))
    return () => emit('convo', { id: null })
  }, [convoId, emit, navigate])

  useEffect(() => {
    const offs = [
      on('convo:msg', (m: ConvoMsg) => setMessages((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]))),
      on('convo:start', ({ id }: { id: string }) => setPending({ id, text: '', think: '' })),
      on('convo:delta', ({ id, text }: { id: string; text: string }) => setPending((p) => (p && p.id === id ? { ...p, text: p.text + text } : p))),
      on('convo:thinking', ({ id, text }: { id: string; text: string }) => setPending((p) => (p && p.id === id ? { ...p, think: (p.think + text).slice(-800) } : p))),
      on('convo:note', ({ id, text }: { id: string; text: string }) => setPending((p) => (p && p.id === id ? { ...p, note: text } : p))),
      on('convo:done', (m: ConvoMsg) => {
        setPending(null)
        setMessages((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]))
        loadList()
      }),
      on('convo:meta', (m: Partial<Convo> & { id: string }) => setConvo((c) => (c && c.id === m.id ? { ...c, ...m } : c))),
    ]
    return () => offs.forEach((f) => f())
  }, [on, loadList])

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, pending?.text])

  const filtered = useMemo(() => (q ? convos.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())) : convos), [convos, q])
  if (!boot) return null
  const mine = convo?.owner === boot.me.username

  const newChat = async () => {
    const r = await hiveApi.createConvo({})
    navigate(`/hive/chat/${r.convo.id}`)
  }

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-[272px] shrink-0 flex-col border-r hive-line md:flex">
        <div className="space-y-2 p-3">
          <button type="button" onClick={newChat} className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-[13px] font-medium text-text-secondary hover:bg-text-primary/[0.05]">
            <MessageCirclePlus className="size-4" /> New chat
          </button>
          <label className="flex h-9 items-center gap-2 rounded-lg px-3 text-text-muted focus-within:bg-text-primary/[0.04]">
            <Search className="size-4" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-muted" />
          </label>
        </div>
        <nav className="hive-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {filtered.map((c) => (
            <button key={c.id} type="button" onClick={() => navigate(`/hive/chat/${c.id}`)} className={cn('mb-px flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left', c.id === convoId ? 'bg-text-primary/[0.07]' : 'hover:bg-text-primary/[0.04]')}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-text-primary">{c.title}</span>
                <span className="block truncate text-[11.5px] text-text-muted">
                  {c.owner !== boot.me.username ? `@${c.owner} · ` : ''}
                  {c.model ?? 'no model yet'} · {timeAgo(c.updated_at)}
                </span>
              </span>
              {!!c.shared && <Share2 className="size-3 shrink-0 text-text-muted" />}
            </button>
          ))}
          {!convos.length && <p className="px-3 py-6 text-[13px] text-text-muted">Your chats appear here. Share one to make it visible to all staff.</p>}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {convoId && convo && (
          <div className="flex items-center gap-2 border-b hive-line px-6 py-2.5">
            <input
              defaultValue={convo.title}
              key={convo.title}
              disabled={!mine}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v && v !== convo.title) hiveApi.updateConvo(convo.id, { title: v }).then(loadList).catch(() => {})
              }}
              className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-text-primary outline-none"
              aria-label="Chat title"
            />
            {mine && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    hiveApi
                      .updateConvo(convo.id, { shared: !convo.shared })
                      .then(() => {
                        setConvo({ ...convo, shared: convo.shared ? 0 : 1 })
                        toast.success(convo.shared ? 'Only you can see this chat now' : 'Shared with all staff')
                        loadList()
                      })
                      .catch(() => {})
                  }
                >
                  <Share2 /> {convo.shared ? 'Shared' : 'Share'}
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => setConfirm(true)} aria-label="Delete chat">
                  <Trash2 />
                </Button>
              </>
            )}
          </div>
        )}
        <div className="hive-scroll min-h-0 flex-1 overflow-y-auto">
          {!convoId || (!messages.length && !pending) ? (
            <div className="mx-auto max-w-[680px] px-6 pt-[16vh] text-center">
              <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Chat with any model</h1>
              <p className="mt-2 text-[14px] text-text-muted">Claude, GPT, Gemini, DeepSeek, Grok and more — attach images, PDFs, code or files from a repo, or create images.</p>
            </div>
          ) : (
            <div className="mx-auto max-w-[760px] space-y-8 px-6 py-8">
              {messages.map((m) => (
                <Message key={m.id} m={m} me={boot.me.username} />
              ))}
              {pending && (
                <div className="space-y-2">
                  {pending.note && <p className="text-[12px] text-state-info">{pending.note}</p>}
                  {pending.think && !pending.text && <p className="line-clamp-3 text-[13px] italic text-text-muted">{pending.think}</p>}
                  {pending.text ? (
                    <div className="hive-caret">
                      <AiMarkdown text={pending.text} streaming className="text-[15px] leading-relaxed" />
                    </div>
                  ) : (
                    !pending.think && (
                      <span className="flex items-center gap-2 text-[13px] text-text-muted">
                        <Loader2 className="size-4 animate-spin" /> Thinking…
                      </span>
                    )
                  )}
                </div>
              )}
              <div ref={end} />
            </div>
          )}
        </div>
        <ChatComposer
          convoId={convoId ?? null}
          busy={!!pending}
          onNeedConvo={async () => {
            const r = await hiveApi.createConvo({})
            navigate(`/hive/chat/${r.convo.id}`)
            emit('convo', { id: r.convo.id })
            return r.convo.id
          }}
          lastUser={[...messages].reverse().find((m) => m.role === 'user') ?? null}
          convo={convo}
        />
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this chat?"
        message="It's removed for everyone it was shared with."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (convo) await hiveApi.deleteConvo(convo.id).catch(() => {})
          setConfirm(false)
          loadList()
          navigate('/hive/chat')
        }}
      />
    </div>
  )
}

function Message({ m, me }: { m: ConvoMsg; me: string }) {
  const toast = useToast()
  if (m.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-2">
        {m.attachments.length > 0 && <Attachments files={m.attachments} />}
        {m.content && <div className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-text-primary/[0.07] px-4 py-2.5 text-[15px] leading-relaxed text-text-primary">{m.content}</div>}
        {m.author && m.author !== me && (
          <span className="flex items-center gap-1.5 text-[11.5px] text-text-muted">
            <UserDot username={m.author} size={4} /> @{m.author}
          </span>
        )}
      </div>
    )
  }
  return (
    <div className="group space-y-3">
      {m.attachments.length > 0 && <Attachments files={m.attachments} large />}
      {m.content && <AiMarkdown text={m.content} className="text-[15px] leading-relaxed" />}
      {m.error && <p className="rounded-xl bg-state-error/8 px-3 py-2 text-[13px] text-state-error">{m.error}</p>}
      <div className="flex items-center gap-2 text-[12px] text-text-muted">
        {m.provider && <ProviderGlyph provider={m.provider} size="xs" />}
        <span>{m.model ?? ''}</span>
        {!!(m.input_tokens || m.output_tokens) && <span>· {((m.input_tokens ?? 0) + (m.output_tokens ?? 0)).toLocaleString()} tokens</span>}
        {m.content && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(m.content).then(() => toast.success('Copied'))
            }}
            className="ml-1 opacity-0 transition-opacity hover:text-text-primary group-hover:opacity-100"
            aria-label="Copy"
          >
            <Copy className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function Attachments({ files, large }: { files: HiveFile[]; large?: boolean }) {
  return (
    <div className={cn('flex flex-wrap gap-2', !large && 'justify-end')}>
      {files.map((f) =>
        f.mime.startsWith('image/') ? (
          <a key={f.id} href={fileUrl(f.id)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border hive-line">
            <img src={fileUrl(f.id)} alt={f.name} className={cn('object-cover', large ? 'max-h-[420px] max-w-full' : 'size-28')} loading="lazy" />
          </a>
        ) : (
          <a key={f.id} href={fileUrl(f.id)} className="inline-flex max-w-60 items-center gap-2 rounded-xl bg-text-primary/[0.05] px-3 py-2 text-[12.5px] text-text-secondary hover:text-text-primary">
            <FileText className="size-4 shrink-0" />
            <span className="truncate">{f.name}</span>
          </a>
        ),
      )}
    </div>
  )
}

function ChatComposer({ convoId, busy, onNeedConvo, lastUser, convo }: { convoId: string | null; busy: boolean; onNeedConvo: () => Promise<string>; lastUser: ConvoMsg | null; convo: Convo | null }) {
  const { boot } = useHive()
  const toast = useToast()
  const [text, setText] = useState('')
  const [spec, setSpec] = useState<AgentSpec | null>(() => (boot ? defaultSpec(boot, undefined, undefined) : null))
  const [image, setImage] = useState(false)
  const [repoRefs, setRepoRefs] = useState<{ projectId: string; path: string }[]>([])
  const up = useUploads()
  const fileInput = useRef<HTMLInputElement>(null)
  const ta = useRef<HTMLTextAreaElement>(null)
  // Pick up where the conversation left off: same provider and model.
  useEffect(() => {
    if (!boot || !convo?.provider || !boot.keys.some((k) => k.provider === convo.provider && !k.disabled)) return
    setSpec((s) => (s && s.provider === convo.provider && s.model === convo.model ? s : { provider: convo.provider!, keyId: 'auto', model: convo.model || defaultSpec(boot, convo.provider!, undefined)?.model || '' }))
  }, [boot, convo?.id, convo?.provider, convo?.model])
  useEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 56), 260)}px`
  }, [text])
  if (!boot) return null
  if (!spec) return <p className="p-6 text-center text-[13px] text-text-muted">Add an AI key to start chatting.</p>
  const caps = vendorInfo(boot, spec.provider)?.caps
  const canImage = !!caps?.images

  const send = async (override?: string) => {
    const body = (override ?? text).trim()
    if ((!body && !up.files.length && !repoRefs.length) || busy || up.busy) return
    try {
      const id = convoId ?? (await onNeedConvo())
      await hiveApi.sendMessage(id, {
        text: body,
        refs: [...up.files.map((f) => ({ fileId: f.id })), ...repoRefs],
        agent: spec,
        mode: image && canImage ? 'image' : 'text',
      })
      if (!override) {
        setText('')
        up.setFiles([])
        setRepoRefs([])
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send')
    }
  }

  return (
    <div className="mx-auto w-full max-w-[800px] px-6 pb-6">
      <div
        className="hive-composer rounded-[22px]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          if (e.dataTransfer.files.length) up.add(e.dataTransfer.files)
        }}
      >
        {(up.files.length > 0 || repoRefs.length > 0) && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            <FileChips files={up.files} onRemove={up.remove} />
            {repoRefs.map((r) => (
              <span key={`${r.projectId}:${r.path}`} className="inline-flex max-w-60 items-center gap-1.5 rounded-lg bg-text-primary/[0.06] py-1 pl-2 pr-1 text-[12px] text-text-secondary">
                <FolderGit2 className="size-3.5 text-text-muted" />
                <span className="truncate">{r.path}</span>
                <button type="button" onClick={() => setRepoRefs((l) => l.filter((x) => x !== r))} className="grid size-4 place-items-center text-text-muted hover:text-text-primary" aria-label="Remove">
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
            if (e.clipboardData.files.length) up.add(e.clipboardData.files)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={image && canImage ? 'Describe the image to create…' : `Message ${vendorName(spec.provider)}…`}
          className="block w-full resize-none bg-transparent px-5 pt-4 text-[15.5px] leading-relaxed text-text-primary outline-none placeholder:text-text-muted/70"
        />
        <div className="flex flex-wrap items-center gap-1 px-3 pb-3">
          <input ref={fileInput} type="file" multiple hidden onChange={(e) => e.target.files && up.add(e.target.files)} />
          <button type="button" onClick={() => fileInput.current?.click()} className="grid size-8 place-items-center rounded-full text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary" aria-label="Attach files" title={`Attach files${caps?.vision ? ' — images supported' : ''}${caps?.pdf ? ', PDFs supported' : ''}`}>
            <Paperclip className="size-4" />
          </button>
          <RepoFilePicker onPick={(r) => setRepoRefs((l) => (l.some((x) => x.path === r.path && x.projectId === r.projectId) ? l : [...l, r]))} />
          <button
            type="button"
            disabled={!canImage}
            onClick={() => setImage((v) => !v)}
            className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] transition-colors disabled:opacity-35', image && canImage ? 'bg-accent-brand/12 text-accent-brand' : 'text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary')}
            title={canImage ? 'Create an image' : `${vendorName(spec.provider)} can't create images — try GPT, Gemini, Grok or Together`}
          >
            <ImageIcon className="size-4" /> Image
          </button>
          <span className="mx-1 h-4 w-px bg-text-primary/10" />
          <AgentChip boot={boot} spec={spec} onChange={setSpec} need={image ? 'images' : 'chat'} compact />
          <div className="ml-auto flex items-center gap-1">
            {lastUser && !busy && (
              <button type="button" onClick={() => send(lastUser.content)} className="grid size-8 place-items-center rounded-full text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary" title="Ask again (this model)" aria-label="Ask again">
                <RotateCcw className="size-4" />
              </button>
            )}
            {busy ? (
              <Button size="icon" variant="secondary" className="size-9 rounded-full" onClick={() => convoId && hiveApi.stopConvo(convoId)} aria-label="Stop">
                <Square className="size-3.5 fill-current" />
              </Button>
            ) : (
              <Button size="icon" variant="accent" className="size-9 rounded-full" onClick={() => send()} disabled={(!text.trim() && !up.files.length && !repoRefs.length) || up.busy} aria-label="Send">
                <ArrowUp className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RepoFilePicker({ onPick }: { onPick: (r: { projectId: string; path: string }) => void }) {
  const { boot, project } = useHive()
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(project?.id ?? boot?.projects[0]?.id ?? null)
  const [paths, setPaths] = useState<string[] | null>(null)
  const [q, setQ] = useState('')
  useEffect(() => {
    if (!open || !projectId) return
    setPaths(null)
    hiveApi
      .projectTree(projectId)
      .then((r) => setPaths(r.paths))
      .catch(() => setPaths([]))
  }, [open, projectId])
  const list = useMemo(() => (paths ?? []).filter((p) => p.toLowerCase().includes(q.toLowerCase())).slice(0, 80), [paths, q])
  if (!boot?.projects.length) return null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="grid size-8 place-items-center rounded-full text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary" aria-label="Add a file from a project" title="Add a file from a project">
          <FolderGit2 className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-2">
        <div className="mb-2 flex flex-wrap gap-1">
          {boot.projects.map((p) => (
            <button key={p.id} type="button" onClick={() => setProjectId(p.id)} className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px]', projectId === p.id ? 'bg-text-primary/[0.09] text-text-primary' : 'text-text-muted hover:text-text-secondary')}>
              <span className="hive-hex size-2.5" style={{ background: projectColor(p.color) }} />
              {p.name}
            </button>
          ))}
        </div>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a file" className="mb-1 h-8 w-full rounded-md bg-text-primary/5 px-2.5 text-[12.5px] outline-none" />
        <div className="hive-scroll max-h-72 overflow-y-auto">
          {paths === null ? (
            <div className="hive-shimmer m-1 h-20 rounded-lg" />
          ) : (
            list.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  if (projectId) onPick({ projectId, path: p })
                  setOpen(false)
                }}
                className="block w-full truncate rounded-md px-2 py-1.5 text-left font-mono text-[11.5px] text-text-secondary hover:bg-text-primary/5 hover:text-text-primary"
              >
                {p}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
