import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: ReactNode
  icon?: ReactNode
  badge?: number | string
}

/** Tabs with a clean, modern design. */
export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[]
  active?: string
  onChange?: (id: string) => void
  className?: string
}) {
  const [internal, setInternal] = useState(items[0]?.id ?? '')
  const current = active ?? internal
  const uid = useId()
  const select = (id: string) => {
    setInternal(id)
    onChange?.(id)
  }
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = items[(i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length]
    if (next) {
      select(next.id)
      document.getElementById(`${uid}-${next.id}`)?.focus()
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 border-b border-border',
        className,
      )}
      role="tablist"
    >
      {items.map((item, i) => {
        const on = current === item.id
        return (
          <button
            key={item.id}
            id={`${uid}-${item.id}`}
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => select(item.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground/60 border-b-2 border-transparent',
              on ? 'text-foreground border-b-2 border-primary' : 'hover:text-foreground hover:border-primary/20',
            )}
          >
            <span className="flex items-center gap-2">
              {item.icon}
              {item.label}
              {item.badge != null && (
                <span className="ml-2 flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                  {item.badge}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}