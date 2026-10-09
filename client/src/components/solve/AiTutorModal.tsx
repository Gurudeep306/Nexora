import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Bot, Send, Sparkles, User, Download } from 'lucide-react'
import { Button, Modal, Textarea, useToast } from '@/components/ui'
import { MarkdownLite } from '@/components/ailab/MarkdownLite'
import { cn } from '@/lib/utils'
import {
  llmEngine,
  ENGINE_MODELS,
  savedModelId,
  webgpuSupported,
  type ChatTurn,
} from '@/lib/llm-engine'
import { tutorSystemPrompt } from '@/lib/llm-prompts'

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
  const [streamText, setStreamText] = useState('')
  const toast = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  const engine = useSyncExternalStore(llmEngine.subscribe, llmEngine.getSnapshot, llmEngine.getSnapshot)

  const ask = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setStreamText('')
    const history: ChatTurn[] = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))
    setMessages((m) => [...m, { role: 'user', content: trimmed }])
    setQuestion('')
    try {
      await llmEngine.load(savedModelId())
      const turns: ChatTurn[] = [
        { role: 'system', content: tutorSystemPrompt(statementText.slice(0, 6000)) },
        ...history,
        { role: 'user', content: trimmed },
      ]
      const full = await llmEngine.generate(turns, {
        temperature: 0.6,
        maxTokens: 1024,
        onChunk: (soFar) => setStreamText(soFar),
      })
      setMessages((m) => [...m, { role: 'assistant', content: full }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : undefined
      if (msg && /WebGPU/i.test(msg)) {
        toast.error('WebGPU unavailable', 'The on-device tutor needs a WebGPU browser (Chrome/Edge/Safari 18+).')
      } else {
        toast.error('AI tutor failed', msg)
      }
      setMessages((m) => m.slice(0, -1))
      setQuestion(trimmed)
    } finally {
      setStreamText('')
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

  const gpuOk = webgpuSupported()

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
          {messages.length === 0 && !busy && (
            <div className="py-6 text-center">
              <Sparkles className="mx-auto size-6 text-primary-bright" aria-hidden="true" />
              <p className="mt-2 text-sm text-foreground-dim">
                Ask about the problem — the tutor guides you without handing over code.
              </p>
              {engine.state !== 'ready' && (
                <p className="mt-2 text-xs text-foreground-faint">
                  {gpuOk
                    ? 'The first question downloads the on-device model once (~2–5 GB, cached afterwards).'
                    : 'WebGPU not detected — use a recent Chrome, Edge or Safari 18+ for the on-device tutor.'}
                </p>
              )}
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
              {m.role === 'user' ? (
                <p className="max-w-[80%] rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-sm whitespace-pre-wrap text-foreground">
                  {m.content}
                </p>
              ) : (
                <div className="max-w-[85%] rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-foreground-dim">
                  <MarkdownLite text={m.content} />
                </div>
              )}
            </div>
          ))}
          {busy && (
            streamText ? (
              <div className="flex flex-row gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary-bright">
                  <Bot className="size-3.5" />
                </span>
                <div className="max-w-[85%] rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-foreground-dim">
                  <MarkdownLite text={streamText} />
                  <span className="ml-0.5 inline-block size-1.5 animate-pulse rounded-full bg-primary-bright align-middle" />
                </div>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-xs text-foreground-faint">
                <span className="skeleton inline-block h-3 w-24" />
                {engine.state === 'loading'
                  ? `downloading on-device model… ${Math.round(engine.progress * 100)}%`
                  : 'tutor is thinking...'}
              </p>
            )
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
            placeholder="Ask a question about this problem..."
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
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-foreground-faint">
          <Download className="size-3" />
          Runs on your device (WebGPU) — no servers, no API keys. Model: {ENGINE_MODELS.find((m) => m.id === savedModelId())?.label ?? 'local'}
        </p>
      </div>
    </Modal>
  )
}
