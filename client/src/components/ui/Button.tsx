import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold tracking-wide transition-all duration-200 select-none disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-primary-bright [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-on-primary glow-box hover:bg-primary-bright hover:text-background',
        accent:
          'bg-accent text-white glow-box-accent hover:brightness-110',
        outline:
          'border border-border-glow bg-transparent text-foreground hover:border-primary hover:text-primary-bright hover:glow-box',
        ghost:
          'text-foreground-dim hover:bg-surface-2 hover:text-foreground',
        subtle:
          'bg-surface-2 text-foreground hover:bg-muted border border-border',
        danger:
          'bg-destructive text-white hover:brightness-110',
        link:
          'text-primary-bright underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs [&_svg]:size-3.5',
        md: 'h-10 px-4 text-sm [&_svg]:size-4',
        lg: 'h-12 px-6 text-base [&_svg]:size-5',
        icon: 'size-10 [&_svg]:size-4',
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
      {...props}
    >
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'

export { buttonVariants }
