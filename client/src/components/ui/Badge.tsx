import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'border border-border/20 bg-surface-2 text-foreground/60',
        primary: 'border border-primary/20 bg-primary/10 text-primary',
        secondary: 'border border-border/20 bg-surface-3 text-foreground',
        success: 'border border-success/20 bg-success/10 text-success',
        warning: 'border border-warning/20 bg-warning/10 text-warning',
        destructive: 'border border-error/20 bg-error/10 text-error',
        info: 'border border-info/20 bg-info/10 text-info',
        outline: 'border border-border/20 bg-transparent text-foreground',
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