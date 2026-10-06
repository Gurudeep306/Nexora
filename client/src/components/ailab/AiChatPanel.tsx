import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bot, Eraser, FileText, Send, Sparkles, TriangleAlert, User, Film, PlayCircle } from 'lucide-react'
import { Button, Textarea, Tooltip, useToast } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { MarkdownLite } from './MarkdownLite'
import { CyberMatrixPlayer } from './CyberMatrixPlayer'
import { aiErrorMessage, type ChatMessage } from './types'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'How do I recognize a binary search problem?',
  'Explain the Master Theorem simply',
  'When should I use a segment tree?',
  'Help me understand two pointers',
]

const ANIMATION_PRESETS = [
  { label: '✨ Two-Pointer Reversal', code: 'while (left < right) { swap(arr[left++], arr[right--]); }' },
  { label: '✨ Binary Search Hopping', code: 'binary_search(arr = [12, 23, 34, 45, 67, 89, 90], target = 67)' },
  { label: '✨ QuickSort Partition', code: 'pivot = arr[high]; for (j = low; j < high; j++) if (arr[j] < pivot) swap(arr[++i], arr[j]);' },
  { label: '✨ Dutch National Flag', code: 'while (mid <= high) { if(a[mid]==0) swap(low++, mid++); else if(a[mid]==1) mid++; else swap(mid, high--); }' },
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
  const [animateMode, setAnimateMode] = useState(false)
  const [statement, setStatement] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch isolated user chat history from Kronos database
  useEffect(() => {
    let active = true
    async function loadUserHistory() {
      try {
        const res = await api.get<{ ok: boolean; username?: string; history?: any[] }>('/api/ai-chat/history', {
          query: { username: user?.username || 'guest' }
        })
        if (active && res.ok && Array.isArray(res.history) && res.history.length > 0) {
          const loaded: ChatMessage[] = res.history.map((h, i) => ({
            id: h.id || (Date.now() + i),
            role: h.role,
            content: h.content,
            visualization: h.visualization,
            ts: h.createdAt ? new Date(h.createdAt).getTime() : Date.now(),
          }))
          setMessages(loaded)
        }
      } catch {
        // Fall back gracefully to localStorage
      }
    }
    void loadUserHistory()
    return () => { active = false }
  }, [user?.username])

  // Persist locally for immediate offline cache
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
    async (text: string, forceAnimate = false) => {
      const question = text.trim()
      if (!question || sending) return
      const isAnimate = forceAnimate || animateMode || /animate|visualiz|simulation|pseudo-code|code/i.test(question)
      const userMsg: ChatMessage = { id: nextId++, role: 'user', content: question, ts: Date.now() }
      setMessages((m) => [...m, userMsg])
      setInput('')
      setSending(true)
      try {
        const res = await api.post<{ ok: boolean; reply?: string; visualization?: any; error?: string }>('/api/ai-chat', {
          statement: statement.trim() || undefined,
          question,
          animate: isAnimate,
          username: user?.username || 'guest',
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        })
        if (!res.ok || !res.reply) {
          throw new ApiError(200, res.error ?? 'No response generated')
        }
        setMessages((m) => [
          ...m,
          {
            id: nextId++,
            role: 'assistant',
            content: res.reply!,
            visualization: res.visualization,
            ts: Date.now(),
          },
        ])
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
    [sending, statement, messages, animateMode, toast, user?.username],
  )

  const clearHistory = useCallback(async () => {
    setMessages([])
    try {
      localStorage.removeItem(storageKey)
      await api.delete('/api/ai-chat/history', {
        query: { username: user?.username || 'guest' }
      })
      toast.success('Chat Cleared', 'Your history has been erased.')
    } catch {
      // ignore
    }
  }, [storageKey, user?.username, toast])

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
          <FileText className="size-3.5" /> Problem context
        </Button>

        <Button
          variant={animateMode ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setAnimateMode((m) => !m)}
          className={cn(
            'transition-all duration-300',
            animateMode
              ? 'border-pink-500/80 bg-gradient-to-r from-cyan/20 via-pink-500/20 to-purple-500/20 text-white shadow-[0_0_16px_rgba(236,72,153,0.4)]'
              : 'hover:border-cyan/50 hover:text-cyan'
          )}
          title="Toggle Kronos Code & Pseudo-Code Kinetic 3D Animator"
        >
          <Film className="size-3.5 text-pink-400" />
          <span>✨ Kronos 3D Animator</span>
          {animateMode && <span className="ml-1 size-1.5 rounded-full bg-cyan animate-pulse" />}
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
              onClick={() => void clearHistory()}
              disabled={!messages.length}
              aria-label="Clear conversation"
            >
              <Eraser className="size-3.5" /> Clear
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
        className="h-[56vh] min-h-80 overflow-y-auto rounded-xl border border-border bg-surface p-4"
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
              <div className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-2.5 py-0.5 text-[10px] font-bold tracking-widest text-pink-300 uppercase">
                Sovereign Neural Core · No External APIs
              </div>
              <p className="mt-2 font-display text-base font-bold tracking-wider text-foreground">
                KRONOS-1 AI INTELLIGENCE
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-foreground-dim">
                100% In-house private neural brain. Socratic conceptual coaching + 3D kinetic
                algorithm visualizer generated from scratch for any code or pseudo-code.
              </p>
            </div>
            <div className="flex max-w-xl flex-wrap justify-center gap-2">
              {(animateMode ? ANIMATION_PRESETS.map((p) => p.label) : SUGGESTIONS).map((s) => {
                const preset = ANIMATION_PRESETS.find((p) => p.label === s)
                return (
                  <button
                    key={s}
                    onClick={() => {
                      if (preset) {
                        void send(preset.code, true)
                      } else {
                        void send(s)
                      }
                    }}
                    className="cursor-pointer rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-foreground-dim transition-all duration-200 hover:border-cyan hover:text-cyan-bright"
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="space-y-4">
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
                    'max-w-[94%] rounded-xl px-4 py-3 text-sm leading-relaxed md:max-w-[85%]',
                    m.role === 'user'
                      ? 'rounded-br-sm bg-gradient-to-br from-primary to-primary/70 text-on-primary'
                      : 'rounded-bl-sm border border-cyan/30 bg-surface-2 text-foreground-dim shadow-[0_0_14px_rgba(34,211,238,0.12)]',
                  )}
                >
                  {/* Inline 3D Cyber-Matrix Kinetic Visualizer */}
                  {m.visualization && (
                    <div className="mb-3">
                      <CyberMatrixPlayer visualization={m.visualization} />
                    </div>
                  )}
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
              aria-label="Tutor is synthesizing response"
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
                {animateMode && (
                  <span className="ml-2 font-mono text-[10px] text-pink-400">Synthesizing 3D kinetic frames…</span>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Quick Animation Preset Chips */}
      {animateMode && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-[11px] font-medium text-pink-400 flex items-center gap-1">
            <PlayCircle className="size-3" /> Quick Presets:
          </span>
          {ANIMATION_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => void send(p.code, true)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-foreground-dim hover:border-pink-500/50 hover:text-white transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="flex items-end gap-2">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            animateMode
              ? 'Paste code or pseudo-code to animate… (e.g. while (left < right) swap(arr[left++], arr[right--]))'
              : 'Ask the tutor… (Enter to send, Shift+Enter for newline)'
          }
          aria-label="Message the AI tutor"
          rows={2}
          className="min-h-11 flex-1 resize-none"
          disabled={sending}
        />
        <Button
          onClick={() => void send(input)}
          loading={sending}
          disabled={!input.trim()}
          aria-label="Send message"
          className={cn(
            'h-11',
            animateMode && 'bg-gradient-to-r from-cyan to-pink-500 hover:from-cyan-bright hover:to-pink-400 text-black font-semibold'
          )}
        >
          {animateMode ? <Sparkles className="size-4" /> : <Send className="size-4" />}
          <span className="hidden sm:inline">{animateMode ? 'Animate' : 'Send'}</span>
        </Button>
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-foreground-faint">
        <TriangleAlert className="size-3 text-pink-400" /> Powered by Kronos-1 Sovereign Intelligence · 100% in-house private neural engine · No external APIs.
      </p>
    </div>
  )
}
