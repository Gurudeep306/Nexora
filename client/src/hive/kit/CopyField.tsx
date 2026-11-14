import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Middle-truncate long values so both ends stay readable: "prj_33c4…a771b". */
export function middle(s: string, max = 28): string {
  if (s.length <= max) return s
  const keep = Math.floor((max - 1) / 2)
  return `${s.slice(0, keep)}…${s.slice(-keep)}`
}

/** IDs, paths and masked tokens: mono, truncated in the middle, one-click copy. */
export function CopyField({ value, display, max = 28, className, label = 'Copy' }: { value: string; display?: string; max?: number; className?: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1 rounded-[var(--hv-r-chip)] bg-[var(--hv-surface-1)] py-0.5 pl-2 pr-0.5 ring-1 ring-[var(--hv-border-subtle)]', className)}>
      <span className="truncate font-mono text-[12px] text-[var(--hv-text-2)]" title={value}>
        {display ?? middle(value, max)}
      </span>
      <button
        type="button"
        onClick={() =>
          navigator.clipboard?.writeText(value).then(() => {
            setDone(true)
            setTimeout(() => setDone(false), 1200)
          })
        }
        className="grid size-6 shrink-0 place-items-center rounded-[6px] text-[var(--hv-text-3)] hover:bg-[var(--hv-surface-2)] hover:text-[var(--hv-text-1)]"
        aria-label={done ? 'Copied' : label}
        title={done ? 'Copied' : label}
      >
        {done ? <Check className="size-3.5 text-[var(--hv-success)]" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  )
}
