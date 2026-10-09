import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bot,
  Eraser,
  FileText,
  Send,
  Sparkles,
  TriangleAlert,
  User,
  Film,
  PlayCircle,
  Cpu,
  Download,
} from 'lucide-react'
import { Button, Textarea, Tooltip, useToast } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { MarkdownLite } from './MarkdownLite'
import { CyberMatrixPlayer } from './CyberMatrixPlayer'
import type { ChatMessage } from './types'
import { cn } from '@/lib/utils'
import {
  llmEngine,
  ENGINE_MODELS,
  savedModelId,
  rememberModelId,
  webgpuSupported,
  extractAnimationSpec,
  stripAnimationBlock,
  type ChatTurn,
} from '@/lib/llm-engine'
import { tutorSystemPrompt, animateSystemPrompt, wantsAnimation } from '@/lib/llm-prompts'

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

  const engine = useSyncExternalStore(llmEngine.subscribe, llmEngine.getSnapshot, llmEngine.getSnapshot)
  const [modelId, setModelId] = useState<string>(savedModelId)
  const [showModelPicker, setShowModelPicker] = useState(false)

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
  /** Live-streamed text for the message currently being generated. */
  const [streamText, setStreamText] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Persist locally (conversation lives on-device now)
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-100)))
    } catch {
      /* storage full — non-fatal */
    }
  }, [messages, storageKey])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending, streamText])

  const ensureModel = useCallback(async (): Promise<boolean> => {
    if (engine.state === 'ready' && engine.modelId === modelId) return true
    try {
      rememberModelId(modelId)
      await llmEngine.load(modelId)
      return true
    } catch {
      return false
    }
  }, [engine.state, engine.modelId, modelId])

  const send = useCallback(
    async (text: string, forceAnimate = false) => {
      const question = text.trim()
      if (!question || sending) return
      const isAnimate = forceAnimate || animateMode || wantsAnimation(question)
      const userMsg: ChatMessage = { id: nextId++, role: 'user', content: question, ts: Date.now() }
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content })) as ChatTurn[]
      setMessages((m) => [...m, userMsg])
      setInput('')
      setSending(true)
      setStreamText('')

      if (!(await ensureModel())) {
        toast.error('Model unavailable', 'The on-device model could not start — check the model panel below.')
        setMessages((m) => m.filter((x) => x.id !== userMsg.id))
        setInput(question)
        setSending(false)
        return
      }

      const system = isAnimate ? animateSystemPrompt(question) : tutorSystemPrompt(statement.trim() || undefined)
      const turns: ChatTurn[] = [
        { role: 'system', content: system },
        ...history,
        { role: 'user', content: isAnimate ? question : question.slice(0, 4000) },
      ]
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const full = await llmEngine.generate(turns, {
          temperature: isAnimate ? 0.2 : 0.6,
          maxTokens: isAnimate ? 2048 : 1024,
          signal: ctrl.signal,
          onChunk: (soFar) => setStreamText(soFar),
        })
        const spec = isAnimate ? extractAnimationSpec(full) : null
        const prose = spec ? stripAnimationBlock(full) : full
        setMessages((m) => [
          ...m,
          { id: nextId++, role: 'assistant', content: prose, visualization: spec ?? undefined, ts: Date.now() },
        ])
      } catch (err) {
        toast.error('Generation failed', err instanceof Error ? err.message : undefined)
        setMessages((m) => m.filter((x) => x.id !== userMsg.id))
        setInput(question)
      } finally {
        abortRef.current = null
        setStreamText('')
        setSending(false)
        inputRef.current?.focus()
      }
    },
    [sending, statement, messages, animateMode, toast, ensureModel],
  )

  const clearHistory = useCallback(() => {
    setMessages([])
    try {
      localStorage.removeItem(storageKey)
    } catch {
      /* ignore */
    }
    toast.success('Chat Cleared', 'Your conversation has been erased from this device.')
  }, [storageKey, toast])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  const gpuOk = webgpuSupported()

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
          title="Toggle 3D Kinetic Algorithm Animator"
        >
          <Film className="size-3.5 text-pink-400" />
          <span>✨ 3D Animator</span>
          {animateMode && <span className="ml-1 size-1.5 rounded-full bg-cyan animate-pulse" />}
        </Button>

        <Button
          variant={showModelPicker ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setShowModelPicker((s) => !s)}
          aria-expanded={showModelPicker}
          className={cn(
            engine.state === 'ready' && 'border-emerald-500/50 text-emerald-300 hover:text-emerald-200',
            engine.state === 'error' && 'border-red-500/50 text-red-300',
          )}
          title="On-device model"
        >
          <Cpu className="size-3.5" />
          {engine.state === 'ready'
            ? ENGINE_MODELS.find((m) => m.id === engine.modelId)?.label ?? 'Model ready'
            : engine.state === 'loading'
              ? `Loading… ${Math.round(engine.progress * 100)}%`
              : engine.state === 'error'
                ? 'Model error'
                : 'Load model'}
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
              onClick={clearHistory}
              disabled={!messages.length}
              aria-label="Clear conversation"
            >
              <Eraser className="size-3.5" /> Clear
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Model picker / downloader */}
      <AnimatePresence initial={false}>
        {showModelPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-foreground uppercase">
                <Download className="size-3.5 text-cyan" /> On-device model — pick one
              </div>
              <p className="mt-1 text-xs text-foreground-dim">
                The model downloads once to your browser and then runs entirely on your GPU (WebGPU).
                No servers, no API keys, fully private. Bigger models answer better but need more VRAM
                and disk.
              </p>
              {!gpuOk && (
                <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  <TriangleAlert className="size-3.5 shrink-0" />
                  WebGPU not detected in this browser. Use a recent Chrome, Edge or Safari 18+.
                </p>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {ENGINE_MODELS.map((m) => {
                  const selected = modelId === m.id
                  const active = engine.modelId === m.id && engine.state === 'ready'
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setModelId(m.id)
                        rememberModelId(m.id)
                        void llmEngine.load(m.id).catch(() => undefined)
                      }}
                      disabled={engine.state === 'loading'}
                      className={cn(
                        'cursor-pointer rounded-lg border px-3 py-2 text-left transition-all',
                        selected ? 'border-cyan bg-cyan/10' : 'border-border bg-surface-2 hover:border-cyan/60',
                        engine.state === 'loading' && 'cursor-wait opacity-60',
                      )}
                    >
                      <span className="flex items-center justify-between text-xs font-semibold text-foreground">
                        {m.label}
                        {active && <span className="text-[10px] font-bold text-emerald-300">● ACTIVE</span>}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-foreground-dim">{m.hint}</span>
                    </button>
                  )
                })}
              </div>
              {engine.state === 'loading' && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan to-pink-500"
                      animate={{ width: `${Math.max(engine.progress * 100, 2)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] text-foreground-faint">{engine.progressText}</p>
                </div>
              )}
              {engine.state === 'error' && (
                <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {engine.error}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                On-Device Neural Engine · No Servers · No API Keys
              </div>
              <p className="mt-2 font-display text-base font-bold tracking-wider text-foreground">
                {engine.state === 'ready' ? 'MODEL READY — ASK ANYTHING' : 'PRIVATE IN-BROWSER AI TUTOR'}
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-foreground-dim">
                {engine.state === 'ready'
                  ? 'A real open-weight model is running on your GPU right now. Socratic coaching + 3D kinetic algorithm visualizer.'
                  : 'A real open-weight LLM runs entirely inside your browser via WebGPU — downloads once, then works offline. Load a model to begin.'}
              </p>
              {engine.state !== 'ready' && (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  disabled={engine.state === 'loading' || !gpuOk}
                  onClick={() => void llmEngine.load(modelId).catch(() => undefined)}
                >
                  <Download className="size-3.5" />
                  {engine.state === 'loading'
                    ? `Loading… ${Math.round(engine.progress * 100)}%`
                    : `Load ${ENGINE_MODELS.find((m) => m.id === modelId)?.label ?? 'model'}`}
                </Button>
              )}
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
              aria-label="Tutor is generating response"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-cyan/40 bg-surface-2 text-cyan">
                <Bot className="size-4" />
              </span>
              {streamText ? (
                <div className="max-w-[85%] rounded-xl rounded-bl-sm border border-cyan/30 bg-surface-2 px-4 py-3 text-sm leading-relaxed text-foreground-dim">
                  <MarkdownLite text={streamText} />
                  <span className="ml-0.5 inline-block size-1.5 animate-pulse rounded-full bg-cyan align-middle" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-xl rounded-bl-sm border border-cyan/30 bg-surface-2 px-4 py-3.5">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="size-1.5 rounded-full bg-cyan"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
                    />
                  ))}
                  {engine.state === 'loading' && (
                    <span className="ml-2 font-mono text-[10px] text-cyan">
                      Loading model… {Math.round(engine.progress * 100)}%
                    </span>
                  )}
                  {animateMode && engine.state !== 'loading' && (
                    <span className="ml-2 font-mono text-[10px] text-pink-400">Synthesizing 3D kinetic frames...</span>
                  )}
                </div>
              )}
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
            engine.state !== 'ready'
              ? 'Load the on-device model first (button above)…'
              : animateMode
                ? 'Paste code or pseudo-code to animate... (e.g. while (left < right) swap(arr[left++], arr[right--]))'
                : 'Ask the tutor... (Enter to send, Shift+Enter for newline)'
          }
          aria-label="Message the AI tutor"
          rows={2}
          className="min-h-11 flex-1 resize-none"
          disabled={sending}
        />
        <Button
          onClick={() => void send(input)}
          loading={sending}
          disabled={!input.trim() || (!gpuOk && engine.state !== 'ready')}
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
        <TriangleAlert className="size-3 text-pink-400" />
        {engine.state === 'ready'
          ? `Running ${ENGINE_MODELS.find((m) => m.id === engine.modelId)?.label ?? 'local model'} on your GPU · 100% on-device · no servers, no API keys.`
          : 'Powered by a real open-weight LLM running in your browser via WebGPU · downloads once, works offline · no servers, no API keys.'}
      </p>
    </div>
  )
}
