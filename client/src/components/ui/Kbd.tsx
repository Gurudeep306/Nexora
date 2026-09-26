import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/20 bg-foreground/5 px-1 font-mono text-[10px] font-medium text-foreground-dim shadow-[inset_0_-1px_0_foreground/10]',
        className,
      )}
      {...props}
    />
  )
}
