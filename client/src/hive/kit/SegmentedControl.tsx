import { useRef } from 'react'
import { cn } from '@/lib/utils'

/** View toggles and options: a radio group, arrow keys to move. */
export function SegmentedControl<T extends string>({ value, onChange, options, label, size = 'md', className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; hint?: string }[]; label: string; size?: 'sm' | 'md'; className?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  const move = (to: number) => {
    const n = (to + options.length) % options.length
    onChange(options[n].value)
    refs.current[n]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-[var(--hv-r-btn)] bg-[var(--hv-surface-1)] p-0.5 ring-1 ring-[var(--hv-border)]', className)}>
      {options.map((o, i) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            title={o.hint}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault()
                move(idx + 1)
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault()
                move(idx - 1)
              }
            }}
            className={cn(
              'rounded-[6px] font-medium transition-colors duration-[var(--hv-d-fast)]',
              size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7 px-3 text-[13px]',
              on ? 'bg-[var(--hv-surface-3)] text-[var(--hv-text-1)] shadow-sm' : 'text-[var(--hv-text-2)] hover:text-[var(--hv-text-1)]',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
