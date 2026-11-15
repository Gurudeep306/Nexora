import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      data-ui="kbd"
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-border bg-bg-surface px-1 font-sans text-[10.5px] leading-none font-medium text-text-secondary shadow-[inset_0_-1px_0_var(--color-border)]',
        className,
      )}
      {...props}
    />
  )
}
