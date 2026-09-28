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
  variant = 'underline',
}: {
  items: TabItem[]
  active?: string
  onChange?: (id: string) => void
  className?: string
  variant?: 'underline' | 'pill' | (string & {})
}) {
  const pill = variant === 'pill'
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
        pill
          ? 'flex flex-wrap items-center gap-1'
          : // Scroll sideways on narrow screens instead of pushing the page wider.
            'flex items-center gap-1 overflow-x-auto overscroll-x-contain border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
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
              pill
                ? cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
                    on ? 'bg-accent-brand/15 text-accent-brand' : 'text-text-primary/60 hover:bg-white/[0.04] hover:text-text-primary',
                  )
                : cn(
                    'flex shrink-0 cursor-pointer items-center gap-2 border-b-2 border-transparent px-4 py-2 text-sm font-medium whitespace-nowrap text-text-primary/60',
                    on ? 'border-accent-brand text-text-primary' : 'hover:border-accent-brand/20 hover:text-text-primary',
                  ),
            )}
          >
            <span className="flex items-center gap-2">
              {item.icon}
              {item.label}
              {item.badge != null && (
                <span className="ml-2 flex items-center gap-1 rounded-full bg-accent-brand/10 text-accent-brand px-2 py-0.5 text-xs">
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