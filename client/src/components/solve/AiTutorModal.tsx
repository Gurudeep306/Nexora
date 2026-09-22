import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Sparkles, User } from 'lucide-react'
import { Button, Modal, Textarea, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { AiChatResponse } from './types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Give me a hint without spoiling the solution',
  'What approach should I consider first?',
  'Explain the key observation of this problem',
]

export function AiTutorModal({
  open,
  onClose,
  statementText,
  problemTitle,
  seed,
}: {
  open: boolean
  onClose: () => void
  statementText: string
  problemTitle: string
  /** Pre-filled question asked automatically when the modal opens (e.g. "explain selection") */
  seed?: string | null
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)

  const ask = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || busy) return
    setBusy(true)
    const history = messages.slice(-10)
    setMessages((m) => [...m, { role: 'user', content: trimmed }])
    setQuestion('')
    try {
      const res = await api.post<AiChatResponse>(
        '/api/ai-chat',
        { statement: statementText.slice(0, 6000), question: trimmed, history },
        { timeoutMs: 60000 },
      )
      if (res.ok && res.reply) {
        setMessages((m) => [...m, { role: 'assistant', content: res.reply as string }])
      } else {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: res.error ?? 'The AI tutor is unavailable right now.' },
        ])
      }
    } catch (err) {
      toast.error('AI tutor failed', err instanceof Error ? err.message : undefined)
      setMessages((m) => m.slice(0, -1))
      setQuestion(trimmed)
    } finally {
      setBusy(false)
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      })
    }
  }

  const seededRef = useRef<string | null>(null)
  useEffect(() => {
    if (open && seed && seededRef.current !== seed) {
      seededRef.current = seed
      void ask(seed)
    }
    if (!open) seededRef.current = null
  }, [open, seed])

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Bot className="size-4 text-primary-bright" aria-hidden="true" /> AI Tutor · {problemTitle}
        </span>
      }
    >
      <div className="flex max-h-[60vh] flex-col">
        <div ref={scrollRef} className="min-h-40 flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div className="py-6 text-center">
              <Sparkles className="mx-auto size-6 text-primary-bright" aria-hidden="true" />
              <p className="mt-2 text-sm text-foreground-dim">
                Ask about the problem — the tutor guides you without handing over code.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void ask(s)}
                    className="cursor-pointer rounded-lg border border-border-glow px-3 py-1.5 text-xs text-primary-bright transition-all duration-200 hover:border-primary hover:glow-box"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-2.5',
                m.role === 'user' ? 'flex-row-reverse' : 'flex-row',
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border',
                  m.role === 'user'
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-primary/40 bg-primary/10 text-primary-bright',
                )}
              >
                {m.role === 'user' ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
              </span>
              <p
                className={cn(
                  'max-w-[80%] rounded-xl border px-3 py-2 text-sm whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'border-accent/30 bg-accent/5 text-foreground'
                    : 'border-border bg-surface text-foreground-dim',
                )}
              >
                {m.content}
              </p>
            </div>
          ))}
          {busy && (
            <p className="flex items-center gap-2 text-xs text-foreground-faint">
              <span className="skeleton inline-block h-3 w-24" /> tutor is thinking…
            </p>
          )}
        </div>

        <form
          className="mt-3 flex items-end gap-2 border-t border-border pt-3"
          onSubmit={(e) => {
            e.preventDefault()
            void ask(question)
          }}
        >
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this problem…"
            aria-label="Question for the AI tutor"
            className="min-h-10 flex-1 resize-none text-sm"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void ask(question)
              }
            }}
          />
          <Button type="submit" variant="primary" size="icon" loading={busy} aria-label="Send question">
            {!busy && <Send aria-hidden="true" />}
          </Button>
        </form>
      </div>
    </Modal>
  )
}
