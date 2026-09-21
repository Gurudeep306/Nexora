import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-border bg-surface-2 text-foreground-dim',
        primary: 'border-primary/50 bg-primary/15 text-primary-bright',
        accent: 'border-accent/50 bg-accent/15 text-accent',
        success: 'border-success/40 bg-success/10 text-success',
        warning: 'border-warning/40 bg-warning/10 text-warning',
        danger: 'border-destructive/40 bg-destructive/10 text-destructive',
        info: 'border-info/40 bg-info/10 text-info',
        cyan: 'border-cyan/40 bg-cyan/10 text-cyan',
        gold: 'border-gold/40 bg-gold/10 text-gold',
        outline: 'border-border-glow bg-transparent text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
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
  hard: 'danger',
  beginner: 'cyan',
  advanced: 'accent',
}

export function DifficultyBadge({ difficulty, rating }: { difficulty?: string; rating?: number }) {
  const label = difficulty ?? (rating ? (rating < 1200 ? 'easy' : rating < 1600 ? 'medium' : 'hard') : 'unknown')
  return <Badge variant={DIFFICULTY_VARIANT[label.toLowerCase()] ?? 'default'}>{label}</Badge>
}
