import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, Send, Sparkles, Square, X } from 'lucide-react'
import { Button, Kbd, Textarea, Tooltip } from '@/components/ui'
import { useAgentContext } from '@/context/AgentContext'
import { AgentThread, AiUnavailableNotice } from '@/components/agent/AgentThread'

const SUGGESTIONS: Record<string, string[]> = {
  solve: ['Give me a hint without spoiling it', "What's wrong with my code?", 'What approach fits these constraints?'],
  gate: ['Explain this question step by step', 'Which GATE subjects am I weakest in?', 'Find PYQs on paging'],
  learn: ['Summarise this topic', 'Quiz me on this', 'Animate this algorithm'],
  default: ['What should I practise next?', 'How am I doing this week?', 'Find me an easy DP problem'],
}

function suggestionsFor(path: string) {
  if (path.startsWith('/solve')) return SUGGESTIONS.solve
  if (path.startsWith('/gate')) return SUGGESTIONS.gate
  if (path.startsWith('/learn')) return SUGGESTIONS.learn
  return SUGGESTIONS.default
}

/** The site-wide assistant: a slide-over on every page, toggled with ⌘J / Ctrl+J. */
export function AgentPanel() {
  const { agent, open, closeAssistant, toggleAssistant, ask, pageContext } = useAgentContext()
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const busy = agent.status === 'streaming'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        toggleAssistant()
      } else if (e.key === 'Escape' && open) {
        closeAssistant()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, toggleAssistant, closeAssistant])

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const submit = (text = input) => {
    if (!text.trim() || busy) return
    setInput('')
    void ask(text)
  }

  const path = pageContext().path ?? ''

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.aside
          key="agent-panel"
          initial={{ x: '100%', opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.6 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-y-0 right-0 z-[1300] flex w-full max-w-md flex-col border-l border-border bg-surface/95 shadow-2xl backdrop-blur-xl"
          role="dialog"
          aria-label="Nexora AI assistant"
        >
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="flex size-8 items-center justify-center rounded-lg border border-cyan/40 bg-surface-2 text-cyan">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Nexora AI</p>
              <p className="truncate text-[11px] text-foreground-faint">Hints, explanations and help with this page</p>
            </div>
            <Tooltip label="New conversation">
              <Button variant="ghost" size="icon-sm" onClick={agent.reset} aria-label="New conversation" disabled={!agent.messages.length}>
                <Plus aria-hidden="true" />
              </Button>
            </Tooltip>
            <Tooltip label="Close (Esc)">
              <Button variant="ghost" size="icon-sm" onClick={closeAssistant} aria-label="Close assistant">
                <X aria-hidden="true" />
              </Button>
            </Tooltip>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
            {agent.status === 'unavailable' && <AiUnavailableNotice className="mb-3" />}
            {agent.messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Sparkles className="size-6 text-cyan" aria-hidden="true" />
                <p className="max-w-xs text-sm text-foreground-dim">
                  Ask about the problem, your code, a GATE question or what to practise next. On unsolved problems you get hints, not answers.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestionsFor(path).map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="cursor-pointer rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-foreground-dim transition-colors hover:border-cyan hover:text-cyan"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <AgentThread messages={agent.messages} compact onNavigate={closeAssistant} />
            )}
          </div>

          <form
            className="border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submit()
                  }
                }}
                placeholder="Ask Nexora AI…"
                aria-label="Message the AI assistant"
                rows={2}
                className="min-h-11 flex-1 resize-none text-sm"
              />
              {busy ? (
                <Button type="button" variant="secondary" size="icon" onClick={agent.stop} aria-label="Stop generating">
                  <Square aria-hidden="true" />
                </Button>
              ) : (
                <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
                  <Send aria-hidden="true" />
                </Button>
              )}
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-foreground-faint">
              <Kbd>⌘</Kbd>
              <Kbd>J</Kbd> toggles · the assistant sees the page you're on · powered by Groq
            </p>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>,
    document.body,
  )
}
