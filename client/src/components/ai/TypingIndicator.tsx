import { cn } from '@/lib/utils'

/** Three soft dots shown before the first token arrives. */
export function TypingIndicator({ label = 'Thinking', className }: { label?: string; className?: string }) {
  return (
    <span className={cn('ai-typing', className)} role="status" aria-label={label}>
      <span className="ai-typing-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="ai-typing-label">{label}…</span>
    </span>
  )
}
