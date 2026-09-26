import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  "relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 select-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-b from-primary-light to-primary text-on-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_0_0_1px_rgb(99_102_241/0.6),0_6px_20px_-6px_rgb(99_102_241/0.7)] hover:brightness-110',
        secondary:
          'border border-border bg-surface-2 text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] hover:border-border-strong hover:bg-surface-3',
        outline:
          'border border-border-strong bg-surface/40 text-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-white',
        ghost: 'text-foreground-dim hover:bg-white/[0.05] hover:text-foreground',
        subtle:
          'border border-border bg-surface-2 text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] hover:border-border-strong hover:bg-surface-3',
        destructive: 'bg-gradient-to-b from-[#f87171] to-destructive text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)] hover:brightness-110',
        danger: 'bg-gradient-to-b from-[#f87171] to-destructive text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)] hover:brightness-110',
        success: 'bg-success text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)] hover:brightness-110',
        accent:
          'bg-gradient-to-b from-accent-light to-accent text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_0_0_1px_rgb(16_185_129/0.6),0_6px_20px_-6px_rgb(16_185_129/0.7)] hover:brightness-110',
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