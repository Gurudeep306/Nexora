import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  "relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 select-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: 'btn-base bg-primary text-on-primary hover:bg-primary-light',
        secondary: 'btn-base bg-surface-2 text-foreground border border-border-hover hover:bg-surface-3 hover:border-primary/20',
        outline: 'btn-base border border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/30',
        ghost: 'btn-base text-foreground/70 hover:text-primary hover:bg-primary/5',
        destructive: 'btn-base bg-error text-white hover:bg-error-dark',
        success: 'btn-base bg-success text-white hover:bg-success-dark',
        link: 'text-primary-bright underline-offset-4 hover:underline',
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