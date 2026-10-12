import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  icon?: ReactNode
  /** Small trailing text (counts, "Latest"). */
  badge?: string
  /** Options sharing a group are listed under its heading. */
  group?: string
}

/**
 * A compact single-select popover: optional search box, grouped options,
 * arrow-key navigation, Esc / outside click to close. Theme tokens only.
 */
export function GateCustomSelect({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select',
  icon,
  className,
  align = 'left',
  searchable,
  buttonClassName,
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  label?: string
  placeholder?: string
  icon?: ReactNode
  className?: string
  align?: 'left' | 'right'
  searchable?: boolean
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const selected = options.find((o) => o.value === value)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => `${o.label} ${o.group ?? ''}`.toLowerCase().includes(q)) : options
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive(Math.max(0, options.findIndex((o) => o.value === value)))
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(shown.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (shown[active]) choose(shown[active].value)
    }
  }

  return (
    <div ref={ref} className={cn('relative', className)} onKeyDown={onKey}>
      <button
        type="button"
        onClick={() => {
          if (!open) setActive(Math.max(0, options.findIndex((o) => o.value === value)))
          setOpen(!open)
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        className={cn(
          'flex h-9 w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-bg-surface px-3 text-[13px] text-text-primary transition-colors hover:border-border-hover focus-visible:border-accent-brand focus-visible:outline-none',
          open && 'border-accent-brand',
          buttonClassName,
        )}
      >
        {icon && <span className="shrink-0 text-text-muted">{icon}</span>}
        {label && <span className="shrink-0 text-text-muted">{label}</span>}
        <span className={cn('min-w-0 flex-1 truncate text-left font-medium', !selected && 'text-text-muted')}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={cn('size-3.5 shrink-0 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className={cn(
            'pop-surface absolute z-50 mt-1.5 flex max-h-80 w-max max-w-[min(92vw,340px)] min-w-full flex-col overflow-hidden rounded-xl border border-border shadow-xl',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {searchable && (
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="size-3.5 text-text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                placeholder="Filter…"
                aria-label="Filter options"
                className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted"
              />
            </div>
          )}
          <div ref={listRef} id={id} role="listbox" className="overflow-y-auto p-1">
            {shown.length === 0 && <div className="px-3 py-4 text-center text-[12.5px] text-text-muted">No matches</div>}
            {shown.map((o, i) => {
              const head = o.group && o.group !== shown[i - 1]?.group ? o.group : null
              const isSel = o.value === value
              return (
                <div key={o.value}>
                  {head && <div className="px-2.5 pt-2 pb-1 text-[10.5px] font-semibold tracking-wider text-text-muted uppercase">{head}</div>}
                  <button
                    type="button"
                    role="option"
                    data-idx={i}
                    aria-selected={isSel}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o.value)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px]',
                      i === active ? 'bg-bg-surface-3 text-text-primary' : 'text-text-secondary',
                      isSel && 'font-semibold text-accent-brand',
                    )}
                  >
                    {o.icon && <span className="shrink-0">{o.icon}</span>}
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {o.badge && <span className="shrink-0 font-mono text-[11px] text-text-muted">{o.badge}</span>}
                    <Check className={cn('size-3.5 shrink-0', isSel ? 'opacity-100' : 'opacity-0')} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
