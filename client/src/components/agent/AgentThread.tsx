import { Fragment, useRef, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowDown, ArrowRight, Check, CircleSlash, Loader2, RotateCcw, Sparkles, Wrench } from 'lucide-react'
import { CyberMatrixPlayer, type VisualizationSpec } from '@/components/ai/CyberMatrixPlayer'
import { AiMarkdown } from '@/components/ai/AiMarkdown'
import { AiNotice } from '@/components/ai/AiNotice'
import { CopyButton } from '@/components/ai/CopyButton'
import { TypingIndicator } from '@/components/ai/TypingIndicator'
import { useStickToBottom } from '@/components/ai/useStickToBottom'
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

function time(t?: number) {
  return t ? new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''
}

/**
 * Renders an agent conversation. Model text goes through <AiMarkdown>, which
 * never renders raw HTML. Pass the scroll container as `scrollRef` to keep the
 * view pinned to the newest token (until the reader scrolls up).
 */
export function AgentThread({
  messages,
  compact = false,
  onNavigate,
  onRetry,
  scrollRef,
  currentLabel,
}: {
  messages: AgentMessage[]
  compact?: boolean
  onNavigate?: () => void
  /** Ask the last question again; shown on the latest reply. */
  onRetry?: () => void
  scrollRef?: RefObject<HTMLElement | null>
  /** The page the student is on now; a divider marks moves between pages. */
  currentLabel?: string
}) {
  const navigate = useNavigate()
  const last = messages.at(-1)
  const streaming = !!last?.streaming
  const ownRef = useRef<HTMLElement | null>(null)
  const { atBottom, scrollToBottom } = useStickToBottom(scrollRef ?? ownRef, `${messages.length}:${last?.content.length}:${last?.tools?.length}:${last?.actions?.length}:${!!last?.error}`)

  // "Now on: …" dividers wherever the student asked from a different page.
  const dividerAt = new Map<string, string>()
  let prevLabel: string | undefined
  for (const m of messages) {
    if (m.role !== 'user' || !m.pageLabel) continue
    if (prevLabel && m.pageLabel !== prevLabel) dividerAt.set(m.id, m.pageLabel)
    prevLabel = m.pageLabel
  }
  const trailing = !streaming && currentLabel && prevLabel && currentLabel !== prevLabel ? currentLabel : null

  return (
    <div className={cn('flex flex-col', compact ? 'gap-5' : 'gap-6')}>
      {messages.map((m, idx) => {
        const isLast = idx === messages.length - 1
        if (m.role === 'user') {
          const divider = dividerAt.get(m.id)
          return (
            <Fragment key={m.id}>
            {divider && <PageDivider label={divider} />}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="ai-msg flex flex-col items-end"
            >
              <div className={cn('ai-msg-user min-w-0 rounded-2xl rounded-br-md px-3.5 py-2', compact ? 'max-w-[88%]' : 'max-w-[85%] md:max-w-[75%]')}>
                <AiMarkdown text={m.content} size={compact ? 'compact' : 'chat'} />
              </div>
              {m.createdAt && <span className="mt-1 mr-1 text-[10px] text-foreground-faint tabular-nums">{time(m.createdAt)}</span>}
            </motion.div>
            </Fragment>
          )
        }

        const hasBody = !!m.content
        const runningTool = m.tools?.find((t) => t.status === 'running')
        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className={cn('ai-msg flex min-w-0 items-start gap-2.5', isLast && 'ai-msg-last')}
          >
            <span
              className={cn(
                'mt-0.5 flex shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary-bright',
                compact ? 'size-6' : 'size-7',
              )}
              aria-hidden="true"
            >
              <Sparkles className={compact ? 'size-3' : 'size-3.5'} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 text-[11px]">
                <span className="font-semibold text-foreground">NexoraGuru AI</span>
                {m.createdAt && <span className="text-foreground-faint tabular-nums">{time(m.createdAt)}</span>}
              </div>

              {!!m.tools?.length && (
                <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Tools used">
                  {m.tools.map((t, i) => (
                    <span
                      key={`${t.name}-${i}`}
                      className={cn('ai-chip', t.status === 'running' ? 'ai-chip-running' : t.ok === false && 'ai-chip-failed')}
                    >
                      {t.status === 'running' ? <Loader2 className="animate-spin" /> : t.ok === false ? <Wrench /> : <Check />}
                      {TOOL_LABELS[t.name] ?? t.name.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}

              {isSpec(m.visualization) && (
                <div className="mb-3">
                  <CyberMatrixPlayer visualization={m.visualization} />
                </div>
              )}

              {hasBody && <AiMarkdown text={m.content} streaming={m.streaming} size={compact ? 'compact' : 'chat'} />}
              {!hasBody && m.streaming && <TypingIndicator label={runningTool ? 'Working' : 'Thinking'} />}
              {m.stopped && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-foreground-faint">
                  <CircleSlash className="size-3" aria-hidden="true" /> Stopped{hasBody ? ' — reply may be incomplete' : ''}
                </p>
              )}
              {m.error && (
                <AiNotice
                  kind={m.errorKind}
                  detail={m.errorText ?? (hasBody ? null : m.content)}
                  onRetry={isLast ? onRetry : undefined}
                  compact={compact}
                  className={hasBody ? 'mt-3' : undefined}
                />
              )}

              {!!m.actions?.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.actions.map((a) => (
                    <button
                      key={a.path}
                      type="button"
                      onClick={() => {
                        navigate(a.path)
                        onNavigate?.()
                      }}
                      className="ai-action"
                    >
                      {a.label} <ArrowRight aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}

              {!m.streaming && hasBody && (
                <div className="ai-msg-actions mt-1.5 -ml-1.5 flex items-center gap-0.5">
                  <CopyButton text={m.content} label="Copy reply" />
                  {isLast && onRetry && !m.error && (
                    <button type="button" onClick={onRetry} className="ai-copy" aria-label="Regenerate reply" title="Regenerate">
                      <RotateCcw aria-hidden="true" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
      {trailing && <PageDivider label={trailing} />}
      {!atBottom && streaming && (
        <button type="button" className="ai-jump" onClick={scrollToBottom}>
          <ArrowDown aria-hidden="true" /> Jump to latest
        </button>
      )}
    </div>
  )
}

function PageDivider({ label }: { label: string }) {
  return (
    <div className="ai-page-divider" role="separator" aria-label={`Now on: ${label}`}>
      <span>
        Now on: <strong>{label}</strong>
      </span>
    </div>
  )
}

/** Shown when the server has no GROQ_API_KEY. */
export function AiUnavailableNotice({ className }: { className?: string }) {
  return <AiNotice kind="unavailable" className={className} />
}
