import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-1.5 py-px text-[10.5px] leading-[18px] font-semibold tracking-[0.04em] uppercase whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-white/[0.07] bg-white/[0.04] text-foreground-dim',
        primary: 'border-primary/30 bg-primary/12 text-primary-bright',
        accent: 'border-accent/30 bg-accent/10 text-[#fb7189]',
        success: 'border-success/25 bg-success/[0.08] text-success',
        warning: 'border-warning/25 bg-warning/[0.08] text-warning',
        danger: 'border-destructive/25 bg-destructive/[0.08] text-[#f87171]',
        info: 'border-info/25 bg-info/[0.08] text-info',
        cyan: 'border-cyan/25 bg-cyan/[0.08] text-cyan',
        gold: 'border-gold/25 bg-gold/[0.08] text-gold',
        outline: 'border-border-strong bg-transparent text-foreground',
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
