import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Eraser, FileText, Film, MessageSquareText, PlayCircle, Send, Sparkles, Square, TriangleAlert } from 'lucide-react'
import { Button, Textarea, Tooltip, useToast } from '@/components/ui'
import { useAgentContext } from '@/context/AgentContext'
import { AgentThread, AiUnavailableNotice } from '@/components/agent/AgentThread'
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

/**
 * AI Lab chat. It is the same conversation as the global assistant (⌘J) — one
 * server-side agent — shown full-size, with the 3D algorithm animator.
 */
export function AiChatPanel() {
  const toast = useToast()
  const { agent, ask } = useAgentContext()
  const [input, setInput] = useState('')
  const [showContext, setShowContext] = useState(false)
  const [animateMode, setAnimateMode] = useState(false)
  const [statement, setStatement] = useState('')
  const sending = agent.status === 'streaming'
  const scrollRef = useRef<HTMLDivElement>(null)

  const send = (text: string, forceAnimate = false) => {
    const q = text.trim()
    if (!q || sending) return
    setInput('')
    const page = statement.trim() ? { visibleText: statement.trim().slice(0, 6000), title: 'Problem pasted in the AI Lab' } : {}
    void ask(forceAnimate || animateMode ? `Animate this algorithm:\n${q}` : q, { animate: forceAnimate || animateMode, page })
  }

  const clearHistory = async () => {
    await agent.clear()
    toast.success('Chat cleared', 'This conversation was deleted.')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={showContext ? 'primary' : 'outline'} size="sm" onClick={() => setShowContext((s) => !s)} aria-expanded={showContext}>
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
              : 'hover:border-cyan/50 hover:text-cyan',
          )}
          title="Toggle 3D Kinetic Algorithm Animator"
        >
          <Film className="size-3.5 text-pink-400" />
          <span>✨ 3D Animator</span>
          {animateMode && <span className="ml-1 size-1.5 animate-pulse rounded-full bg-cyan" />}
        </Button>
        {statement.trim() && <span className="text-[11px] tracking-wider text-foreground-faint uppercase">Tutor sees your statement</span>}
        <div className="ml-auto">
          <Tooltip label="Delete this conversation">
            <Button variant="ghost" size="sm" onClick={() => void clearHistory()} disabled={!agent.messages.length} aria-label="Clear conversation">
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
              placeholder="Paste a problem statement (optional) — the tutor will use it as context. It gives hints, not full solutions."
              aria-label="Problem statement context"
              className="min-h-20 font-mono text-xs"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {agent.status === 'unavailable' && !agent.messages.length && <AiUnavailableNotice />}

      <div ref={scrollRef} className="h-[60vh] min-h-80 overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface px-4 py-5 sm:px-6" role="log" aria-label="AI tutor conversation" aria-live="polite">
        {agent.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-cyan/40 bg-surface-2 text-cyan glow-box">
              <Sparkles className="size-6" />
            </div>
            <div>
              <p className="font-display text-base font-bold tracking-wider text-foreground">NEXORA AI TUTOR</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-foreground-dim">
                Socratic coaching for problems and concepts, plus a 3D kinetic algorithm visualizer. The same assistant is one keystroke away on every page (⌘J).
              </p>
            </div>
            <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
              {(animateMode ? ANIMATION_PRESETS : SUGGESTIONS.map((s) => ({ label: s, code: '' }))).map((s) => (
                <button key={s.label} type="button" onClick={() => (s.code ? send(s.code, true) : send(s.label))} className="ai-prompt-card">
                  {s.code ? <Film aria-hidden="true" /> : <MessageSquareText aria-hidden="true" />}
                  <span className="flex-1">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            <AgentThread messages={agent.messages} onRetry={agent.retry} scrollRef={scrollRef} />
          </div>
        )}
      </div>

      {animateMode && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="flex items-center gap-1 text-[11px] font-medium text-pink-400">
            <PlayCircle className="size-3" /> Quick Presets:
          </span>
          {ANIMATION_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => send(p.code, true)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-foreground-dim transition-all hover:border-pink-500/50 hover:text-white"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder={
            animateMode
              ? 'Paste code or pseudo-code to animate... (e.g. while (left < right) swap(arr[left++], arr[right--]))'
              : 'Ask the tutor... (Enter to send, Shift+Enter for newline)'
          }
          aria-label="Message the AI tutor"
          rows={2}
          className="min-h-11 flex-1 resize-none"
        />
        {sending ? (
          <Button variant="secondary" onClick={agent.stop} aria-label="Stop generating" className="h-11">
            <Square className="size-4" />
            <span className="hidden sm:inline">Stop</span>
          </Button>
        ) : (
          <Button
            onClick={() => send(input)}
            disabled={!input.trim()}
            aria-label="Send message"
            className={cn('h-11', animateMode && 'bg-gradient-to-r from-cyan to-pink-500 font-semibold text-black hover:from-cyan-bright hover:to-pink-400')}
          >
            {animateMode ? <Sparkles className="size-4" /> : <Send className="size-4" />}
            <span className="hidden sm:inline">{animateMode ? 'Animate' : 'Send'}</span>
          </Button>
        )}
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-foreground-faint">
        <TriangleAlert className="size-3 text-pink-400" />
        Powered by Nexora's AI agent (Groq). Conversations are saved to your account; on unsolved problems the tutor gives hints, not full solutions.
      </p>
    </div>
  )
}
