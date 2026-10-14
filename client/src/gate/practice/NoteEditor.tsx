import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Check, CloudOff, Loader2, NotebookPen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Markdown } from '@/learn/md'
import { loadNote, saveNote } from '../progress'

export interface NoteEditorHandle {
  focus: () => void
}

/**
 * A personal Markdown note on a question (KaTeX works: $x^2$). Saves itself
 * 800 ms after typing stops; shows where it went (account or this device).
 */
export const NoteEditor = forwardRef<NoteEditorHandle, { questionId: string; className?: string; defaultOpen?: boolean }>(function NoteEditor(
  { questionId, className, defaultOpen },
  ref,
) {
  const [open, setOpen] = useState(!!defaultOpen)
  const [text, setText] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [status, setStatus] = useState<'idle' | 'saving' | 'server' | 'device'>('idle')
  const area = useRef<HTMLTextAreaElement>(null)
  const saved = useRef('')

  useImperativeHandle(ref, () => ({
    focus: () => {
      setOpen(true)
      setTab('write')
      requestAnimationFrame(() => area.current?.focus())
    },
  }))

  useEffect(() => {
    let live = true
    void loadNote(questionId).then((t) => {
      if (!live) return
      setText(t)
      saved.current = t
      setLoaded(true)
      if (t) setOpen(true)
    })
    return () => {
      live = false
    }
  }, [questionId])

  useEffect(() => {
    if (!loaded || text === saved.current) return
    setStatus('saving')
    const t = setTimeout(() => {
      saved.current = text
      void saveNote(questionId, text).then((where) => setStatus(where))
    }, 800)
    return () => clearTimeout(t)
  }, [text, loaded, questionId])

  // Flush an unsaved note when leaving the question.
  const latest = useRef({ text, questionId })
  useEffect(() => {
    latest.current = { text, questionId }
  })
  useEffect(
    () => () => {
      const { text: t, questionId: id } = latest.current
      if (t !== saved.current) void saveNote(id, t)
    },
    [],
  )

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          requestAnimationFrame(() => area.current?.focus())
        }}
        className={cn('inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] text-text-muted hover:bg-bg-surface-2 hover:text-text-primary', className)}
        title="Add a note (N)"
      >
        <NotebookPen className="size-3.5" /> Add a note
      </button>
    )
  }

  return (
    <section className={cn('rounded-xl border border-border bg-bg-surface', className)} aria-label="Your note">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <NotebookPen className="ml-1 size-3.5 text-text-muted" />
        <span className="mr-2 text-[12px] font-semibold text-text-secondary">My note</span>
        {(['write', 'preview'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cn('rounded-md px-2 py-0.5 text-[12px] capitalize', tab === t ? 'bg-bg-surface-3 font-semibold text-text-primary' : 'text-text-muted hover:text-text-primary')}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto inline-flex items-center gap-1 pr-1 text-[11px] text-text-muted" aria-live="polite">
          {status === 'saving' && (
            <>
              <Loader2 className="size-3 animate-spin" /> Saving
            </>
          )}
          {status === 'server' && (
            <>
              <Check className="size-3 text-state-success" /> Saved
            </>
          )}
          {status === 'device' && (
            <>
              <CloudOff className="size-3" /> Saved on this device
            </>
          )}
        </span>
      </div>
      {tab === 'write' ? (
        <textarea
          ref={area}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 10000))}
          onKeyDown={(e) => {
            if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur()
          }}
          rows={Math.min(10, Math.max(3, text.split('\n').length + 1))}
          placeholder={loaded ? 'Key idea, trap, formula… Markdown and $math$ work. Esc to leave.' : 'Loading…'}
          disabled={!loaded}
          aria-label="Note text"
          className="block w-full resize-y bg-transparent px-3 py-2 font-mono text-[13px] leading-relaxed text-text-primary outline-none placeholder:text-text-muted"
        />
      ) : (
        <div className="min-h-[76px] px-3 py-2 text-[13.5px] text-text-primary">{text.trim() ? <Markdown md={text} /> : <span className="text-text-muted">Nothing to preview.</span>}</div>
      )}
    </section>
  )
})
