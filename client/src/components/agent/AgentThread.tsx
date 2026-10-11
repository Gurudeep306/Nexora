import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Bot, Check, Loader2, TriangleAlert, User, Wrench } from 'lucide-react'
import { MarkdownLite } from '@/components/ailab/MarkdownLite'
import { CyberMatrixPlayer, type VisualizationSpec } from '@/components/ailab/CyberMatrixPlayer'
import type { AgentMessage } from '@/hooks/useAgent'
import { cn } from '@/lib/utils'

const TOOL_LABELS: Record<string, string> = {
  search_problems: 'Searching problems',
  get_problem: 'Reading the problem',
  get_user_stats: 'Checking your stats',
  get_weak_tags: 'Finding weak topics',
  recommend_problems: 'Picking practice problems',
  get_submissions: 'Reading your submissions',
  get_gate_question: 'Opening a GATE question',
  search_gate: 'Searching GATE questions',
  get_learn_content: 'Reading course content',
  suggest_navigation: 'Suggesting a page',
}

function isSpec(v: unknown): v is VisualizationSpec {
  return !!v && typeof v === 'object' && Array.isArray((v as { frames?: unknown }).frames) && (v as { frames: unknown[] }).frames.length > 0
}

/**
 * Renders an agent conversation. Model text goes through MarkdownLite, which
 * builds React text nodes only — no HTML from the model ever reaches the DOM.
 */
export function AgentThread({ messages, compact = false, onNavigate }: { messages: AgentMessage[]; compact?: boolean; onNavigate?: () => void }) {
  const navigate = useNavigate()
  const endRef = useRef<HTMLDivElement>(null)
  const last = messages.at(-1)
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages.length, last?.content, last?.tools?.length])

  return (
    <div className="space-y-4">
      {messages.map((m) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn('flex items-start gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}
        >
          {m.role === 'assistant' && (
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-cyan/40 bg-surface-2 text-cyan">
              <Bot className="size-3.5" aria-hidden="true" />
            </span>
          )}
          <div
            className={cn(
              'min-w-0 rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
              compact ? 'max-w-[88%]' : 'max-w-[94%] md:max-w-[85%]',
              m.role === 'user'
                ? 'rounded-br-sm bg-gradient-to-br from-primary to-primary/70 text-on-primary'
                : cn('rounded-bl-sm border bg-surface-2 text-foreground-dim', m.error ? 'border-red-500/40' : 'border-cyan/25'),
            )}
          >
            {m.role === 'assistant' && !!m.tools?.length && (
              <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Tools used">
                {m.tools.map((t, i) => (
                  <span
                    key={`${t.name}-${i}`}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]',
                      t.status === 'running'
                        ? 'border-cyan/40 text-cyan'
                        : t.ok === false
                          ? 'border-amber-500/40 text-amber-300'
                          : 'border-emerald-500/40 text-emerald-300',
                    )}
                  >
                    {t.status === 'running' ? <Loader2 className="size-3 animate-spin" /> : t.ok === false ? <Wrench className="size-3" /> : <Check className="size-3" />}
                    {TOOL_LABELS[t.name] ?? t.name}
                  </span>
                ))}
              </div>
            )}
            {isSpec(m.visualization) && (
              <div className="mb-3">
                <CyberMatrixPlayer visualization={m.visualization} />
              </div>
            )}
            {m.role === 'assistant' ? (
              m.content ? (
                <div className={cn(m.error && 'flex items-start gap-1.5 text-red-300')}>
                  {m.error && <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />}
                  <div className="min-w-0">
                    <MarkdownLite text={m.content} />
                  </div>
                </div>
              ) : m.streaming ? (
                <span className="flex items-center gap-1.5 py-1" aria-label="Thinking">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="size-1.5 rounded-full bg-cyan"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
                    />
                  ))}
                </span>
              ) : null
            ) : (
              <p className="whitespace-pre-wrap">{m.content}</p>
            )}
            {m.streaming && m.content && <span className="ml-0.5 inline-block size-1.5 animate-pulse rounded-full bg-cyan align-middle" />}
            {m.role === 'assistant' && !!m.actions?.length && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.actions.map((a) => (
                  <button
                    key={a.path}
                    onClick={() => {
                      navigate(a.path)
                      onNavigate?.()
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-xs text-cyan transition-colors hover:bg-cyan/20"
                  >
                    {a.label} <ArrowRight className="size-3" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
          {m.role === 'user' && (
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-on-primary">
              <User className="size-3.5" aria-hidden="true" />
            </span>
          )}
        </motion.div>
      ))}
      <div ref={endRef} />
    </div>
  )
}

/** Shown when the server has no GROQ_API_KEY. */
export function AiUnavailableNotice({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200', className)} role="status">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>AI features aren't set up on this server yet. Everything else on Nexora works as usual.</span>
    </div>
  )
}
