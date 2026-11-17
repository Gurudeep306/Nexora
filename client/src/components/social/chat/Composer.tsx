import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { BarChart3, Code2, DoorOpen, Loader2, Mic, Paperclip, Plus, Send, Share2, Square, Trash2, X } from 'lucide-react'
import type { Socket } from 'socket.io-client'
import { useToast } from '@/components/ui'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/Menu'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { fileSize, nameOf, type Attachment, type Conversation, type Message, type People } from './types'

const MAX_BYTES = 5 * 1024 * 1024
const draftKey = (id: number) => `nexora:chat-draft:${id}`
const readDraft = (id: number) => {
  try {
    return localStorage.getItem(draftKey(id)) ?? ''
  } catch {
    return ''
  }
}
const writeDraft = (id: number, v: string) => {
  try {
    if (v.trim()) localStorage.setItem(draftKey(id), v)
    else localStorage.removeItem(draftKey(id))
  } catch {
    /* private window */
  }
}

/** Upload one file for a message (pictures, PDFs, voice notes, text and code). */
async function uploadFile(file: Blob, name: string): Promise<Attachment> {
  if (file.size > MAX_BYTES) throw new ApiError(413, 'Files can be up to 5 MB')
  const fd = new FormData()
  fd.append('file', file, name)
  const r = await api.post<{ attachment: Attachment }>('/api/chat/upload', fd, { timeoutMs: 120000 })
  return r.attachment
}

async function imageSize(file: File): Promise<{ width?: number; height?: number }> {
  try {
    const bmp = await createImageBitmap(file)
    const out = { width: bmp.width, height: bmp.height }
    bmp.close()
    return out
  } catch {
    return {}
  }
}

export interface ComposerHandle {
  focus: () => void
  addFiles: (files: File[]) => void
}

type Pending = { file?: File; attachment?: Attachment; uploading: boolean; error?: string; preview?: string }

export const Composer = forwardRef<
  ComposerHandle,
  {
    conv: Conversation
    me: string
    people: People
    socket: Socket | null
    replyTo: Message | null
    editing: Message | null
    onCancel: () => void
    onSend: (p: { body: string; attachment: Attachment | null }) => void
    onEditSave: (m: Message, body: string) => void
    onShare: () => void
    onPoll: () => void
    onSolveTogether: () => void
    disabled?: string | null
  }
>(function Composer({ conv, me, people, socket, replyTo, editing, onCancel, onSend, onEditSave, onShare, onPoll, onSolveTogether, disabled }, ref) {
  const toast = useToast()
  const [text, setText] = useState(() => readDraft(conv.id))
  const [pending, setPending] = useState<Pending | null>(null)
  const [rec, setRec] = useState<{ started: number; seconds: number } | null>(null)
  const [mention, setMention] = useState<{ q: string; at: number; index: number } | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const typingSent = useRef(0)
  const typingStop = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Editing puts the message in the box; finishing restores the draft.
  const [editingId, setEditingId] = useState<number | null>(null)
  if ((editing?.id ?? null) !== editingId) {
    setEditingId(editing?.id ?? null)
    setText(editing ? editing.body : readDraft(conv.id))
  }

  useEffect(() => {
    if (!editing) writeDraft(conv.id, text)
  }, [text, conv.id, editing])

  const stopTyping = useCallback(() => {
    if (typingStop.current) clearTimeout(typingStop.current)
    if (typingSent.current) socket?.emit('chat:typing', { conversationId: conv.id, typing: false })
    typingSent.current = 0
  }, [socket, conv.id])
  useEffect(() => stopTyping, [stopTyping])

  const typing = () => {
    const now = Date.now()
    if (now - typingSent.current > 3000) {
      socket?.emit('chat:typing', { conversationId: conv.id, typing: true })
      typingSent.current = now
    }
    if (typingStop.current) clearTimeout(typingStop.current)
    typingStop.current = setTimeout(stopTyping, 4000)
  }

  const addFiles = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return
      if (files.length > 1) toast.error('One file at a time', 'The first one is added.')
      if (file.size > MAX_BYTES) return toast.error('That file is too big', 'Files can be up to 5 MB.')
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      setPending({ file, uploading: true, preview })
      try {
        const [attachment, size] = await Promise.all([uploadFile(file, file.name), file.type.startsWith('image/') ? imageSize(file) : Promise.resolve({})])
        setPending({ file, attachment: { ...attachment, ...size }, uploading: false, preview })
      } catch (e) {
        setPending({ file, uploading: false, preview, error: e instanceof ApiError ? e.message : 'Could not upload it' })
      }
      area.current?.focus()
    },
    [toast],
  )
  useImperativeHandle(ref, () => ({ focus: () => area.current?.focus(), addFiles: (f) => void addFiles(f) }), [addFiles])

  const clearPending = () => {
    if (pending?.preview) URL.revokeObjectURL(pending.preview)
    setPending(null)
  }

  const send = () => {
    if (disabled) return
    const body = text.trim() ? text.replace(/\s+$/, '') : ''
    if (editing) {
      if (body !== editing.body) onEditSave(editing, body)
      else onCancel()
      setText(readDraft(conv.id))
      return
    }
    if (pending?.uploading) return toast.error('Wait for the file to finish uploading')
    if (!body && !pending?.attachment) return
    onSend({ body, attachment: pending?.attachment ?? null })
    setText('')
    writeDraft(conv.id, '')
    clearPending()
    stopTyping()
    setMention(null)
  }

  /* ── voice notes ── */
  const startRec = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return toast.error("This browser can't record voice notes")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t))
      const r = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined)
      chunks.current = []
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      recorder.current = r
      r.start(250)
      setRec({ started: Date.now(), seconds: 0 })
    } catch {
      toast.error('No microphone', 'Allow the microphone for this site to record a voice note.')
    }
  }
  useEffect(() => {
    if (!rec) return
    const t = setInterval(() => {
      const s = Math.round((Date.now() - rec.started) / 1000)
      setRec((r) => (r ? { ...r, seconds: s } : r))
      if (s >= 300) void finishRec(true)
    }, 500)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec?.started])
  const finishRec = async (keep: boolean) => {
    const r = recorder.current
    if (!r) return
    const seconds = rec?.seconds ?? 0
    await new Promise<void>((done) => {
      r.onstop = () => done()
      r.stop()
    })
    r.stream.getTracks().forEach((t) => t.stop())
    recorder.current = null
    setRec(null)
    if (!keep || !chunks.current.length) return
    const type = r.mimeType || 'audio/webm'
    const blob = new Blob(chunks.current, { type })
    const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm'
    setPending({ uploading: true })
    try {
      const a = await uploadFile(blob, `voice-note.${ext}`)
      onSend({ body: '', attachment: { ...a, durationSec: Math.max(1, seconds) } })
      setPending(null)
    } catch (e) {
      setPending({ uploading: false, error: e instanceof ApiError ? e.message : 'Could not send the voice note' })
    }
  }

  /* ── @mentions (groups) ── */
  const candidates = mention
    ? conv.members
        .map((m) => m.username)
        .filter((u) => u !== me && (u.toLowerCase().startsWith(mention.q.toLowerCase()) || nameOf(people, u).toLowerCase().startsWith(mention.q.toLowerCase())))
        .slice(0, 6)
    : []
  const pickMention = (u: string) => {
    if (!mention) return
    const before = text.slice(0, mention.at)
    const after = text.slice(mention.at + 1 + mention.q.length)
    const next = `${before}@${u} ${after}`
    setText(next)
    setMention(null)
    requestAnimationFrame(() => {
      const pos = before.length + u.length + 2
      area.current?.setSelectionRange(pos, pos)
      area.current?.focus()
    })
  }
  const onChange = (v: string, caret: number) => {
    setText(v)
    if (!editing) typing()
    if (conv.kind === 'group') {
      const m = /(^|\s)@([A-Za-z0-9_.-]{0,40})$/.exec(v.slice(0, caret))
      setMention(m ? { q: m[2], at: caret - m[2].length - 1, index: 0 } : null)
    }
  }

  // Grow with the text, up to a limit.
  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [text])

  if (disabled) return <p className="chat-composer-off">{disabled}</p>

  return (
    <div className="chat-composer">
      {(replyTo || editing) && (
        <div className="chat-composer-ctx">
          <span className="min-w-0">
            <span className="block text-[12px] font-medium text-text-primary">{editing ? 'Editing your message' : `Replying to ${replyTo!.username === me ? 'yourself' : nameOf(people, replyTo!.username)}`}</span>
            <span className="block truncate text-[12px] text-text-muted">{(editing ?? replyTo)!.body || 'Attachment'}</span>
          </span>
          <button type="button" className="chat-act ml-auto" aria-label={editing ? 'Stop editing' : 'Stop replying'} onClick={onCancel}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {pending && (
        <div className="chat-composer-ctx">
          {pending.preview ? <img src={pending.preview} alt="" className="size-12 rounded object-cover" /> : null}
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-medium text-text-primary">{pending.file?.name ?? 'Voice note'}</span>
            <span className={cn('block text-[12px]', pending.error ? 'text-state-error' : 'text-text-muted')}>
              {pending.error ?? (pending.uploading ? 'Uploading…' : pending.file ? fileSize(pending.file.size) : '')}
            </span>
          </span>
          {pending.uploading ? <Loader2 className="ml-auto size-4 animate-spin text-text-muted" aria-hidden="true" /> : (
            <button type="button" className="chat-act ml-auto" aria-label="Remove the file" onClick={clearPending}>
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      {mention && candidates.length > 0 && (
        <ul className="chat-mentions" role="listbox" aria-label="Mention someone">
          {candidates.map((u, i) => (
            <li key={u} role="option" aria-selected={i === mention.index}>
              <button type="button" className={cn('chat-mention-opt', i === mention.index && 'is-on')} onMouseDown={(e) => e.preventDefault()} onClick={() => pickMention(u)}>
                <span className="font-medium">{nameOf(people, u)}</span> <span className="text-text-muted">@{u}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {rec ? (
        <div className="chat-rec" role="status">
          <span className="chat-rec-dot" aria-hidden="true" />
          Recording {Math.floor(rec.seconds / 60)}:{String(rec.seconds % 60).padStart(2, '0')}
          <span className="ml-auto flex gap-1">
            <button type="button" className="chat-act" aria-label="Throw away the recording" onClick={() => void finishRec(false)}>
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
            <button type="button" className="chat-send" aria-label="Send the voice note" onClick={() => void finishRec(true)}>
              <Square className="size-3.5" aria-hidden="true" /> Send
            </button>
          </span>
        </div>
      ) : (
        <div className="chat-composer-row">
          {!editing && (
            <Menu>
              <MenuTrigger asChild>
                <button type="button" className="chat-act" aria-label="Add">
                  <Plus className="size-5" aria-hidden="true" />
                </button>
              </MenuTrigger>
              <MenuContent align="start" side="top">
                <MenuItem onSelect={() => fileInput.current?.click()}>
                  <Paperclip className="size-4" /> A file or picture
                </MenuItem>
                <MenuItem onSelect={onShare}>
                  <Share2 className="size-4" /> A problem, solution, contest or GATE question
                </MenuItem>
                {conv.kind === 'group' && (
                  <MenuItem onSelect={onPoll}>
                    <BarChart3 className="size-4" /> A poll
                  </MenuItem>
                )}
                <MenuItem onSelect={onSolveTogether}>
                  <DoorOpen className="size-4" /> Solve together (a solve room)
                </MenuItem>
                <MenuItem
                  onSelect={() => {
                    setText((t) => `${t}${t && !t.endsWith('\n') ? '\n' : ''}\`\`\`cpp\n\n\`\`\``)
                    requestAnimationFrame(() => area.current?.focus())
                  }}
                >
                  <Code2 className="size-4" /> A code block
                </MenuItem>
              </MenuContent>
            </Menu>
          )}
          <input ref={fileInput} type="file" className="sr-only" tabIndex={-1} aria-hidden="true" accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,.txt,.md,.c,.h,.cpp,.hpp,.cc,.py,.java,.js,.ts,.go,.rs,.kt,.cs,.rb,.php,.swift,.json,.csv,.sql,.sh,.in,.out,.log" onChange={(e) => e.target.files && void addFiles([...e.target.files]).finally(() => { if (fileInput.current) fileInput.current.value = '' })} />
          <label className="sr-only" htmlFor={`chat-box-${conv.id}`}>
            Message
          </label>
          <textarea
            id={`chat-box-${conv.id}`}
            ref={area}
            className="chat-box"
            rows={1}
            maxLength={4000}
            placeholder={editing ? 'Edit your message' : 'Write a message'}
            value={text}
            onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
            onPaste={(e) => {
              const files = [...e.clipboardData.files]
              if (files.length && !editing) {
                e.preventDefault()
                void addFiles(files)
              }
            }}
            onKeyDown={(e) => {
              if (mention && candidates.length) {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  setMention({ ...mention, index: (mention.index + (e.key === 'ArrowDown' ? 1 : candidates.length - 1)) % candidates.length })
                  return
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault()
                  pickMention(candidates[mention.index])
                  return
                }
                if (e.key === 'Escape') {
                  setMention(null)
                  return
                }
              }
              if (e.key === 'Escape' && (replyTo || editing)) onCancel()
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                send()
              }
            }}
          />
          {!editing && !text.trim() && !pending ? (
            <button type="button" className="chat-act" aria-label="Record a voice note" onClick={() => void startRec()}>
              <Mic className="size-5" aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="chat-send" onClick={send} aria-label={editing ? 'Save the edit' : 'Send'} disabled={!!pending?.uploading}>
              <Send className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      <p className="chat-hint">
        Enter sends, Shift+Enter makes a new line. {'**bold**, *italic*, `code`, and ```cpp for a code block you can run.'}
      </p>
    </div>
  )
})
