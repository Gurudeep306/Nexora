import { forwardRef, useCallback, type HTMLAttributes, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  glow?: boolean
  /** Lifts on hover with a cursor-following light (Linear-style). */
  interactive?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, glow, interactive, onMouseMove, children, ...props }, ref) => {
    const track = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        const el = e.currentTarget
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - r.left}px`)
        el.style.setProperty('--my', `${e.clientY - r.top}px`)
        onMouseMove?.(e)
      },
      [onMouseMove],
    )
    return (
      <div
        ref={ref}
        onMouseMove={interactive ? track : onMouseMove}
        className={cn(
          'card-neon',
          glow && 'border-primary/35 shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_0_0_1px_rgb(139_92_246/0.12),0_18px_50px_-20px_rgb(139_92_246/0.45)]',
          interactive &&
            'group/card cursor-pointer overflow-hidden hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-pop)]',
          className,
        )}
        {...props}
      >
        {interactive && (
          <span
            aria-hidden="true"
            className="spotlight pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
          />
        )}
        {children}
      </div>
    )
  },
)
Card.displayName = 'Card'

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 border-b border-white/[0.05] px-5 py-3.5', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'font-display text-[13px] font-semibold tracking-[0.06em] text-foreground uppercase [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-foreground-dim', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-3 border-t border-white/[0.05] px-5 py-3', className)} {...props} />
}
