import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean
  interactive?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, glow, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'card',
        glow && 'glow-box-accent',
        interactive &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-accent-brand/40 hover:shadow-[inset_0_1px_0_color-mix(in_oklch,var(--oklch-fg-0)_8%,transparent),0_16px_40px_-16px_color-mix(in_oklch,var(--color-accent-brand)_40%,transparent)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
)
Card.displayName = 'Card'

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 py-3 border-b border-border', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-lg font-semibold text-text-primary mb-2',
        className,
      )}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-text-muted mb-2', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 py-3', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 py-3 border-t border-border', className)} {...props} />
}