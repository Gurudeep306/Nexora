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
            sideOffset={6}
            collisionPadding={8}
            className={cn(
              'pop-surface z-[1200] max-w-xs rounded-md px-2.5 py-1.5 text-xs text-foreground data-[state=delayed-open]:animate-[tip-in_140ms_ease-out]',
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
