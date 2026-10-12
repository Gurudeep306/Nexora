import type { ReactElement, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from './Progress'
import { IconBadge, type IconName } from '@/components/icon/Icon'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  /** A semantic icon name (preferred) or an element. */
  icon?: IconName | ReactElement
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      {typeof icon === 'string' ? (
        <span className="relative inline-flex">
          <span aria-hidden="true" className="absolute -inset-4 -z-10 rounded-full bg-accent-brand/10 blur-2xl" />
          <IconBadge name={icon} box="xl" />
        </span>
      ) : icon && (
        <div className="relative flex size-14 items-center justify-center rounded-2xl border border-border/20 bg-gradient-to-b from-surface-3 to-surface text-primary [&_svg]:size-6">
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
      <p className="text-sm text-error">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="cursor-pointer rounded-lg border border-primary/20 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary/30 hover:bg-primary/5"
        >
          Retry
        </button>
      )}
    </div>
  )
}
