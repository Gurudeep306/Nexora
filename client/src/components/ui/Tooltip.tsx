import type { ReactNode } from 'react'
import { Tooltip as T } from 'radix-ui'
import { cn } from '@/lib/utils'

/** Accessible tooltip (Radix) — collision-aware, keyboard focusable, portalled. */
export function Tooltip({
  label,
  children,
  side = 'top',
  className,
  delay = 250,
}: {
  label: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  delay?: number
}) {
  return (
    <T.Provider delayDuration={delay} skipDelayDuration={200}>
      <T.Root>
        <T.Trigger asChild>
          <span className="inline-flex">{children}</span>
        </T.Trigger>
        <T.Portal>
          <T.Content
            side={side}
            sideOffset={4}
            collisionPadding={6}
            className={cn(
              'popover popover-foreground z-[1200] max-w-xs rounded-md px-3 py-2 text-sm text-popover-foreground data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=delayed-open]:duration-200 data-[state=delayed-open]:ease-out',
              className,
            )}
          >
            {label}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  )
}
