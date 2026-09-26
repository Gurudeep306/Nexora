import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  "relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 select-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          'bg-accent-brand text-on-accent-brand shadow-[inset_0_1px_0_oklch(98%_0%_0%/0.2),0_0_0_1px_oklch(var(--oklch-accent-0)/0.6),0_6px_20px_-6px_oklch(var(--oklch-accent-0)/0.7)] hover:bg-accent-brand/90',
        secondary:
          'border border-border bg-bg-surface-2 text-text-primary shadow-[inset_0_1px_0_oklch(98%_0%_0%/0.04)] hover:border-border-strong hover:bg-bg-surface-3',
        outline:
          'border border-accent-brand/20 bg-transparent text-accent-brand hover:bg-accent-brand/10 hover:border-accent-brand/30',
        ghost: 'text-text-primary/70 hover:bg-accent-brand/5 hover:text-accent-brand',
        subtle:
          'border border-border bg-bg-surface-2 text-text-primary shadow-[inset_0_1px_0_oklch(98%_0%_0%/0.04)] hover:border-border-strong hover:bg-bg-surface-3',
        destructive: 'bg-state-error text-white shadow-[inset_0_1px_0_oklch(98%_0%_0%/0.2)] hover:bg-state-error/90',
        danger: 'bg-state-error text-white shadow-[inset_0_1px_0_oklch(98%_0%_0%/0.2)] hover:bg-state-error/90',
        success: 'bg-state-success text-white shadow-[inset_0_1px_0_oklch(98%_0%_0%/0.2)] hover:bg-state-success/90',
        accent:
          'bg-gradient-to-b from-accent-brand to-accent-brand-hover text-on-accent-brand shadow-[inset_0_1px_0_oklch(98%_0%_0%/0.25),0_0_0_1px_oklch(var(--oklch-accent-0)/0.6),0_6px_20px_-6px_oklch(var(--oklch-accent-0)/0.7)] hover:brightness-110',
        link: 'text-accent-brand underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm [&_svg]:size-3.5',
        md: 'h-9 px-4 text-sm [&_svg]:size-4',
        lg: 'h-11 px-6 text-base [&_svg]:size-4.5',
        icon: 'size-9 [&_svg]:size-4',
        'icon-sm': 'size-8 [&_svg]:size-3.5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin mx-2 h-4 w-4" aria-hidden="true" />}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'

export { buttonVariants }