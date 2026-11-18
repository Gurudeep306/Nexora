import { useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * View toggles and options: a radio group, arrow keys to move. Drawn like the
 * site's tabs: words in a row, the chosen one in full ink with an accent rule
 * under it (no filled pills).
 */
export function SegmentedControl<T extends string>({ value, onChange, options, label, size = 'md', className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; hint?: string }[]; label: string; size?: 'sm' | 'md'; className?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  const move = (to: number) => {
    const n = (to + options.length) % options.length
    onChange(options[n].value)
    refs.current[n]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} className={cn('hive-scroll inline-flex max-w-full gap-1 overflow-x-auto', className)}>
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
              'relative shrink-0 whitespace-nowrap rounded-[var(--hv-r-chip)] transition-colors duration-[var(--hv-d-fast)]',
              "after:absolute after:inset-x-1.5 after:bottom-0 after:h-[2px] after:rounded-full after:content-['']",
              size === 'sm' ? 'h-7 px-1.5 text-[12.5px]' : 'h-8 px-2 text-[13.5px]',
              on ? 'font-semibold text-[var(--hv-text-1)] after:bg-[var(--hv-accent)]' : 'text-[var(--hv-text-2)] after:bg-transparent hover:text-[var(--hv-text-1)] hover:after:bg-[var(--hv-border-strong)]',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
