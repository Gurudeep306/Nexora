import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bot, Eraser, FileText, Send, Sparkles, TriangleAlert, User } from 'lucide-react'
import { Button, Textarea, Tooltip, useToast } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { MarkdownLite } from './MarkdownLite'
import { aiErrorMessage, type ChatMessage } from './types'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'How do I recognize a binary search problem?',
  'Explain the Master Theorem simply',
  'When should I use a segment tree?',
  'Help me understand two pointers',
]

let nextId = Date.now()

export function AiChatPanel() {
  const { user } = useAuth()
  const toast = useToast()
  const storageKey = `nexora:ailab:chat:${user?.username ?? 'guest'}`

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? (JSON.parse(raw) as ChatMessage[]) : []
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [statement, setStatement] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Persist locally (no server-side chat history endpoint exists).
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-100)))
    } catch {
      /* storage full — non-fatal */
    }
  }, [messages, storageKey])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const send = useCallback(
    async (text: string) => {
      const question = text.trim()
      if (!question || sending) return
      const userMsg: ChatMessage = { id: nextId++, role: 'user', content: question, ts: Date.now() }
      setMessages((m) => [...m, userMsg])
      setInput('')
      setSending(true)
      try {
        const res = await api.post<{ ok: boolean; reply?: string; error?: string }>('/api/ai-chat', {
          statement: statement.trim() || undefined,
          question,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        })
        if (!res.ok || !res.reply) {
          throw new ApiError(200, res.error ?? 'No response generated')
        }
        setMessages((m) => [...m, { id: nextId++, role: 'assistant', content: res.reply!, ts: Date.now() }])
      } catch (err) {
        const { title, hint } = aiErrorMessage(err)
        toast.error(title, hint)
        // put the question back so the user can retry without retyping
        setMessages((m) => m.filter((x) => x.id !== userMsg.id))
        setInput(question)
      } finally {
        setSending(false)
        inputRef.current?.focus()
      }
    },
    [sending, statement, messages, toast],
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Context bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showContext ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setShowContext((s) => !s)}
          aria-expanded={showContext}
        >
          <FileText /> Problem context
        </Button>
        {statement.trim() && (
          <span className="text-[11px] tracking-wider text-foreground-faint uppercase">
            Tutor sees your statement
          </span>
        )}
        <div className="ml-auto">
          <Tooltip label="Clear conversation">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([])}
              disabled={!messages.length}
              aria-label="Clear conversation"
            >
              <Eraser /> Clear
            </Button>
          </Tooltip>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {showContext && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Paste a problem statement (optional) — the tutor will use it as context. It never reveals full solutions."
              aria-label="Problem statement context"
              className="min-h-20 font-mono text-xs"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="h-[52vh] min-h-72 overflow-y-auto rounded-xl border border-border bg-surface p-4"
        role="log"
        aria-label="AI tutor conversation"
        aria-live="polite"
      >
        {messages.length === 0 && !sending && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-cyan/40 bg-surface-2 text-cyan glow-box">
              <Sparkles className="size-6" />
            </div>
            <div>
              <p className="font-display text-sm tracking-wider text-foreground">NEXORA AI TUTOR</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-foreground-dim">
                Conceptual coaching for competitive programming. Hints and intuition — never full
                solutions.
              </p>
            </div>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="cursor-pointer rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-foreground-dim transition-all duration-200 hover:border-primary hover:text-primary-bright"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.22, delay: Math.min(i, 5) * 0.03, ease: [0.34, 1.56, 0.64, 1] }}
                className={cn('flex items-end gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {m.role === 'assistant' && (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-cyan/40 bg-surface-2 text-cyan shadow-[0_0_10px_rgba(34,211,238,0.25)]">
                    <Bot className="size-4" />
                  </span>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed md:max-w-[75%]',
                    m.role === 'user'
                      ? 'rounded-br-sm bg-gradient-to-br from-primary to-primary/70 text-on-primary'
                      : 'rounded-bl-sm border border-cyan/30 bg-surface-2 text-foreground-dim shadow-[0_0_14px_rgba(34,211,238,0.12)]',
                  )}
                >
                  {m.role === 'assistant' ? <MarkdownLite text={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
                </div>
                {m.role === 'user' && (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-on-primary">
                    <User className="size-4" />
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {sending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-end gap-2"
              aria-label="Tutor is typing"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-cyan/40 bg-surface-2 text-cyan">
                <Bot className="size-4" />
              </span>
              <div className="flex items-center gap-1.5 rounded-xl rounded-bl-sm border border-cyan/30 bg-surface-2 px-4 py-3.5">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="size-1.5 rounded-full bg-cyan"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask the tutor… (Enter to send, Shift+Enter for newline)"
          aria-label="Message the AI tutor"
          rows={2}
          className="min-h-11 flex-1 resize-none"
          disabled={sending}
        />
        <Button onClick={() => void send(input)} loading={sending} disabled={!input.trim()} aria-label="Send message" className="h-11">
          <Send /> <span className="hidden sm:inline">Send</span>
        </Button>
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-foreground-faint">
        <TriangleAlert className="size-3" /> 20 requests/min · replies are conceptual — the tutor will
        not hand you code.
      </p>
    </div>
  )
}
