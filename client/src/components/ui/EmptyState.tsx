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
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center animate-fade-in', className)}>
      {/* A quiet, neutral well around the glyph: no blurred colour blob. */}
      {typeof icon === 'string' ? (
        <IconBadge name={icon} box="lg" tone="neutral" />
      ) : icon && (
        <div className="flex size-12 items-center justify-center rounded-[var(--radius-control)] border border-border bg-bg-surface-2 text-text-secondary shadow-[inset_0_1px_0_var(--specular)] [&_svg]:size-5">
          {icon}
        </div>
      )}
      <p className="mt-4 mb-0 font-display text-[15px] font-semibold tracking-[-0.01em] text-text-primary">{title}</p>
      {description && <p className="mx-auto mt-1.5 mb-0 max-w-sm text-[13px] leading-relaxed text-text-secondary text-pretty">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
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
      <p className="mb-0 text-sm text-error">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="cursor-pointer rounded-[var(--radius-control)] border border-border-strong px-4 py-2 text-xs font-semibold text-text-primary transition-colors hover:bg-text-primary/5"
        >
          Retry
        </button>
      )}
    </div>
  )
}
