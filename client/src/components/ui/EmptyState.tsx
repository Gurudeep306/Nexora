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
        <div className="flex size-14 items-center justify-center rounded-2xl border border-border-glow bg-surface text-primary-bright [&_svg]:size-6">
          {icon}
        </div>
      )}
      <div>
        <p className="font-display text-sm tracking-wider text-foreground">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-xs text-foreground-dim">{description}</p>}
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
