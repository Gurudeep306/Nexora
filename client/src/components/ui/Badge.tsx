import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'border border-border/20 bg-bg-surface-2 text-text-primary/60',
        primary: 'border border-accent-brand/20 bg-accent-brand/10 text-accent-brand',
        secondary: 'border border-border/20 bg-bg-surface-3 text-text-primary',
        success: 'border border-state-success/20 bg-state-success/10 text-state-success',
        warning: 'border border-state-warning/20 bg-state-warning/10 text-state-warning',
        destructive: 'border border-state-error/20 bg-state-error/10 text-state-error',
        danger: 'border border-state-error/20 bg-state-error/10 text-state-error',
        info: 'border border-state-info/20 bg-state-info/10 text-state-info',
        cyan: 'border border-state-info/20 bg-state-info/10 text-state-info',
        gold: 'border border-state-gold/20 bg-state-gold/10 text-state-gold',
        accent: 'border border-accent-brand/20 bg-accent-brand/10 text-accent-brand',
        outline: 'border border-border/20 bg-transparent text-text-primary',
      },
    },
    defaultVariants: { variant: 'secondary' },
  },
)

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }

export const DIFFICULTY_VARIANT: Record<string, BadgeProps['variant']> = {
  easy: 'success',
  medium: 'warning',
  hard: 'destructive',
  beginner: 'secondary',
  advanced: 'primary',
}

export function DifficultyBadge({ difficulty, rating }: { difficulty?: string; rating?: number }) {
  const label = difficulty ?? (rating ? (rating < 1200 ? 'easy' : rating < 1600 ? 'medium' : 'destructive') : 'unknown')
  return <Badge variant={DIFFICULTY_VARIANT[label.toLowerCase()] ?? 'secondary'}>{label}</Badge>
}