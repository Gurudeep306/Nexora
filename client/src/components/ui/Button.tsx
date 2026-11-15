import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  "relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] font-medium transition-[background-color,border-color,color,box-shadow,transform,filter] duration-[var(--dur-fast)] ease-[var(--ease-standard)] select-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:scale-[0.98]",
  {
    variants: {
      variant: {
        // Solid accent with a 1px top light and a neutral contact shadow — no
        // coloured glow under the button.
        primary:
          'bg-accent-brand text-on-accent-brand shadow-[inset_0_1px_0_oklch(100%_0_0/0.16),0_0_0_1px_color-mix(in_oklab,var(--color-accent-brand)_80%,var(--shadow-ink)),var(--elev-1)] hover:bg-accent-brand-hover',
        secondary:
          'border border-border bg-bg-surface-2 text-text-primary shadow-[inset_0_1px_0_var(--specular)] hover:border-border-strong hover:bg-bg-surface-3',
        outline:
          'border border-border-strong bg-transparent text-text-primary hover:bg-text-primary/5',
        ghost: 'text-text-secondary hover:bg-text-primary/6 hover:text-text-primary',
        subtle:
          'border border-border bg-bg-surface-2 text-text-primary shadow-[inset_0_1px_0_var(--specular)] hover:border-border-strong hover:bg-bg-surface-3',
        destructive: 'bg-state-error text-on-accent-brand shadow-[inset_0_1px_0_oklch(100%_0_0/0.14),var(--elev-1)] hover:bg-state-error/90',
        danger: 'bg-state-error text-on-accent-brand shadow-[inset_0_1px_0_oklch(100%_0_0/0.14),var(--elev-1)] hover:bg-state-error/90',
        success: 'bg-state-success text-on-accent-brand shadow-[inset_0_1px_0_oklch(100%_0_0/0.14),var(--elev-1)] hover:bg-state-success/90',
        // The brand CTA: the one place a (quiet, same-hue) gradient earns its keep.
        accent:
          'bg-gradient-to-b from-[color-mix(in_oklab,var(--color-accent-brand)_86%,white)] to-accent-brand text-on-accent-brand shadow-[inset_0_1px_0_oklch(100%_0_0/0.18),0_0_0_1px_color-mix(in_oklab,var(--color-accent-brand)_80%,var(--shadow-ink)),var(--elev-1)] hover:brightness-[1.06]',
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
      data-ui="button"
      data-variant={variant ?? 'primary'}
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