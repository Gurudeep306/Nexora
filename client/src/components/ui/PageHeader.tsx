import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * Page title block. An optional `eyebrow` sits above the title (section name),
 * `icon` renders in a tinted tile, and `actions` align right.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  icon,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
  icon?: ReactNode
  className?: string
  /** @deprecated kept for compatibility — headings no longer glow. */
  glow?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn('mb-7 flex flex-wrap items-end justify-between gap-4', className)}
    >
      <div className="flex min-w-0 items-start gap-4">
        {icon && (
          <div className="mt-1 hidden size-11 shrink-0 items-center justify-center rounded-xl border border-accent-brand/20 bg-gradient-to-b from-accent-brand/20 to-accent-brand/5 text-accent-brand/80 shadow-[inset_0_1px_0_text-text-primary/10] sm:flex [&_svg]:size-5">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-accent-brand/80 uppercase">{eyebrow}</p>
          )}
          <h1 className="font-display text-[26px] leading-tight font-semibold tracking-tight md:text-[32px] text-text-primary/90">
            {title}
          </h1>
          {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-text-primary/60">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  )
}
