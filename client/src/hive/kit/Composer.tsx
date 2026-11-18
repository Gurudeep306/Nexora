import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ArrowUp, ChevronDown, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SegmentedControl } from './SegmentedControl'

/**
 * One composer for Hive, three intents:
 * - Ask: a quick answer from a model (Chat)
 * - Do it: the Copilot plans, delegates and reports back
 * - Plan a team: split into parts, cheapest capable model per part, review first
 * A one-line helper says what the chosen intent does; advanced choices sit in
 * an Options row that is folded by default and remembered.
 */
export type Intent = 'ask' | 'do' | 'team'

export const INTENT_HELP: Record<Intent, string> = {
  ask: 'A quick answer from a model — nothing runs.',
  do: 'The Copilot plans it, puts agents on it and reports back.',
  team: 'Splits the work, picks a model per part, you approve the plan.',
}
const INTENT_LABEL: Record<Intent, string> = { ask: 'Ask', do: 'Do it', team: 'Plan a team' }

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy = false,
  intent,
  onIntent,
  intents = ['ask', 'do', 'team'],
  placeholder,
  chips,
  options,
  autoFocus,
  size = 'lg',
  className,
  label = 'Message',
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onStop?: () => void
  busy?: boolean
  intent?: Intent
  onIntent?: (i: Intent) => void
  intents?: Intent[]
  placeholder?: string
  /** Small chips in the footer (project, model, quick…). */
  chips?: ReactNode
  /** Advanced choices, folded behind "Options". */
  options?: ReactNode
  autoFocus?: boolean
  size?: 'md' | 'lg'
  className?: string
  label?: string
}) {
  const ta = useRef<HTMLTextAreaElement>(null)
  const helpId = useId()
  const [showOpts, setShowOpts] = useState(() => {
    try {
      return localStorage.getItem('hive:composerOptions') === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(size === 'lg' ? 260 : 200, el.scrollHeight)}px`
  }, [value, size])
  const toggleOpts = () => {
    const v = !showOpts
    setShowOpts(v)
    try {
      localStorage.setItem('hive:composerOptions', v ? '1' : '0')
    } catch {
      /* private mode */
    }
  }
  const canSend = !!value.trim() && !busy
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canSend) onSubmit()
      }}
      className={cn('hv-composer rounded-[var(--hv-r-card)] border border-[var(--hv-border-strong)] bg-[var(--hv-surface-1)] px-3 pb-2.5 pt-2 transition-colors duration-[var(--hv-d-fast)]', className)}
    >
      {intent && onIntent && intents.length > 1 && (
        <div className="mb-1 flex flex-wrap items-center gap-2 border-b border-[var(--hv-border-subtle)] pb-1">
          <SegmentedControl size="sm" label="What should happen?" value={intent} onChange={onIntent} options={intents.map((i) => ({ value: i, label: INTENT_LABEL[i], hint: INTENT_HELP[i] }))} />
        </div>
      )}
      <textarea
        ref={ta}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            if (canSend) onSubmit()
          }
        }}
        rows={size === 'lg' ? 2 : 1}
        autoFocus={autoFocus}
        aria-label={label}
        aria-describedby={intent ? helpId : undefined}
        placeholder={placeholder}
        className={cn('hive-scroll block w-full resize-none bg-transparent px-1 py-2 leading-relaxed text-[var(--hv-text-1)] outline-none placeholder:text-[var(--hv-text-3)]', size === 'lg' ? 'min-h-16 text-[15.5px]' : 'min-h-9 text-[14px]')}
      />
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {chips}
        {options && (
          <button type="button" onClick={toggleOpts} aria-expanded={showOpts} className="inline-flex h-7 items-center gap-1 rounded-[var(--hv-r-btn)] px-2 text-[12px] text-[var(--hv-text-2)] hover:bg-[var(--hv-surface-2)] hover:text-[var(--hv-text-1)]">
            Options <ChevronDown className={cn('size-3 transition-transform', showOpts && 'rotate-180')} />
          </button>
        )}
        <span className="ml-auto" />
        {busy && onStop ? (
          <button type="button" onClick={onStop} className="grid size-9 shrink-0 place-items-center rounded-[var(--hv-r-btn)] bg-[var(--hv-text-1)] text-[var(--hv-bg-app)]" aria-label="Stop" title="Stop after the current step. Nothing is merged.">
            <Square className="size-3.5 fill-current" />
          </button>
        ) : (
          <button type="submit" disabled={!canSend} className="grid size-9 shrink-0 place-items-center rounded-[var(--hv-r-btn)] bg-[var(--hv-accent)] text-[var(--hv-accent-fg)] transition-colors duration-[var(--hv-d-fast)] enabled:hover:bg-[var(--hv-accent-hover)] disabled:bg-transparent disabled:text-[var(--hv-text-3)] disabled:ring-1 disabled:ring-inset disabled:ring-[var(--hv-border-strong)]" aria-label={intent ? INTENT_LABEL[intent] : 'Send'}>
            <ArrowUp className="size-4" strokeWidth={2.4} />
          </button>
        )}
      </div>
      {options && showOpts && <div className="mt-1.5 flex flex-wrap items-center gap-2 border-t border-[var(--hv-border-subtle)] pt-2">{options}</div>}
      {intent && (
        <p id={helpId} className="m-0 pt-1.5 text-[11.5px] text-[var(--hv-text-3)]">
          {INTENT_HELP[intent]}
        </p>
      )}
    </form>
  )
}
