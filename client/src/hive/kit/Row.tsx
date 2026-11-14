import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A 40px row: leading icon, title, muted metadata, status on the right and
 * actions that appear on hover/focus. The whole row is the "open" target.
 */
export function Row({ leading, title, meta, trailing, actions, onOpen, href, active, className }: { leading?: ReactNode; title: ReactNode; meta?: ReactNode; trailing?: ReactNode; actions?: ReactNode; onOpen?: () => void; href?: string; active?: boolean; className?: string }) {
  const body = (
    <>
      {leading && <span className="grid shrink-0 place-items-center text-[var(--hv-text-2)] [&_svg]:size-4">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] text-[var(--hv-text-1)]">{title}</span>
        {meta && <span className="block truncate text-[12px] text-[var(--hv-text-3)]">{meta}</span>}
      </span>
      {trailing && <span className="hv-num flex shrink-0 items-center gap-2 text-[12px] text-[var(--hv-text-2)]">{trailing}</span>}
    </>
  )
  const target = 'flex min-w-0 flex-1 items-center gap-3 rounded-[var(--hv-r-btn)] px-2.5 py-1.5 text-left outline-none'
  return (
    <div className={cn('hv-row hv-cv group flex items-center gap-1 pr-1.5', className)} data-active={active ? 'true' : undefined} data-row>
      {href ? (
        <a href={href} className={target}>
          {body}
        </a>
      ) : (
        <button type="button" onClick={onOpen} className={target}>
          {body}
        </button>
      )}
      {actions && <span className="hv-row-actions flex shrink-0 items-center gap-0.5">{actions}</span>}
    </div>
  )
}

/** A list of rows with J/K (and ↑/↓) to move between them. */
export function RowList({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement
    if (t.closest('input, textarea, [contenteditable="true"]')) return
    const down = e.key === 'j' || e.key === 'ArrowDown'
    const up = e.key === 'k' || e.key === 'ArrowUp'
    if (!down && !up) return
    const targets = [...(ref.current?.querySelectorAll<HTMLElement>('[data-row] > a, [data-row] > button') ?? [])]
    if (!targets.length) return
    const i = targets.findIndex((el) => el === document.activeElement || el.contains(document.activeElement))
    const next = targets[Math.min(targets.length - 1, Math.max(0, i + (down ? 1 : -1)))] ?? targets[0]
    e.preventDefault()
    next.focus()
  }
  return (
    <div ref={ref} role="list" aria-label={label} onKeyDown={onKey} className={cn('flex flex-col gap-0.5', className)}>
      {children}
    </div>
  )
}
