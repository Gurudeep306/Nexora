import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: ReactNode
  icon?: ReactNode
  badge?: number | string
}

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
  variant?: 'underline' | 'pills'
}) {
  const [internal, setInternal] = useState(items[0]?.id ?? '')
  const current = active ?? internal
  const select = (id: string) => {
    setInternal(id)
    onChange?.(id)
  }

  if (variant === 'pills') {
    return (
      <div className={cn('flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface p-1.5', className)} role="tablist">
        {items.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={current === item.id}
            onClick={() => select(item.id)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200',
              current === item.id
                ? 'bg-primary text-on-primary glow-box'
                : 'text-foreground-dim hover:bg-surface-2 hover:text-foreground',
            )}
          >
            {item.icon}
            {item.label}
            {item.badge != null && (
              <span className="rounded-full bg-black/25 px-1.5 text-[10px] tabular-nums">{item.badge}</span>
            )}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto border-b border-border', className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          role="tab"
          aria-selected={current === item.id}
          onClick={() => select(item.id)}
          className={cn(
            'relative flex cursor-pointer items-center gap-1.5 px-4 py-2.5 text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-colors duration-200',
            current === item.id ? 'text-primary-bright' : 'text-foreground-dim hover:text-foreground',
          )}
        >
          {item.icon}
          {item.label}
          {item.badge != null && (
            <span className="rounded-full bg-surface-2 px-1.5 text-[10px] tabular-nums">{item.badge}</span>
          )}
          {current === item.id && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary glow-box" />
          )}
        </button>
      ))}
    </div>
  )
}
