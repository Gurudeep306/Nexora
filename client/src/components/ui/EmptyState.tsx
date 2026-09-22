import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from './Progress'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      {icon && (
        <div className="relative flex size-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-b from-surface-3 to-surface text-primary-bright shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_10px_30px_-12px_rgb(139_92_246/0.5)] [&_svg]:size-6">
          <span aria-hidden="true" className="absolute -inset-4 -z-10 rounded-full bg-primary/10 blur-2xl" />
          {icon}
        </div>
      )}
      <div>
        <p className="font-display text-[15px] font-semibold text-foreground">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-[13px] text-foreground-dim">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function LoadingBlock({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="cursor-pointer rounded-lg border border-border-glow px-4 py-2 text-xs font-semibold text-primary-bright transition-colors hover:border-primary hover:glow-box"
        >
          Retry
        </button>
      )}
    </div>
  )
}
