import { useId, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: ReactNode
  icon?: ReactNode
  badge?: number | string
}

/** Tabs with a sliding indicator (shared-layout animation). */
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

  if (variant === 'pills') {
    return (
      <div
        className={cn(
          'inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-white/[0.06] bg-black/25 p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.3)]',
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
                'relative flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150 [&_svg]:size-3.5',
                on ? 'text-white' : 'text-foreground-dim hover:text-foreground',
              )}
            >
              {on && (
                <motion.span
                  layoutId={`${uid}-pill`}
                  className="absolute inset-0 rounded-lg border border-white/[0.08] bg-gradient-to-b from-surface-3 to-surface-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_2px_8px_-2px_rgb(0_0_0/0.6)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {item.icon}
                {item.label}
                {item.badge != null && (
                  <span className="rounded-full bg-primary/20 px-1.5 text-[10px] text-primary-bright tabular-nums">{item.badge}</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={cn('flex items-center gap-1 overflow-x-auto border-b border-white/[0.06] [scrollbar-width:none]', className)}
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
              'group relative flex cursor-pointer items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 [&_svg]:size-4',
              on ? 'text-foreground' : 'text-foreground-faint hover:text-foreground-dim',
            )}
          >
            <span className="absolute inset-x-1 inset-y-1.5 rounded-md transition-colors group-hover:bg-white/[0.03]" />
            <span className={cn('relative flex items-center gap-1.5', on && '[&_svg]:text-primary-bright')}>
              {item.icon}
              {item.label}
              {item.badge != null && (
                <span className="rounded-full bg-white/[0.06] px-1.5 text-[10px] tabular-nums">{item.badge}</span>
              )}
            </span>
            {on && (
              <motion.span
                layoutId={`${uid}-line`}
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-primary to-cyan shadow-[0_0_12px_rgb(139_92_246/0.8)]"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
