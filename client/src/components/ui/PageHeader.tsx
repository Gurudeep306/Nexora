import type { ReactElement, ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { IconBadge, type IconName } from '@/components/icon/Icon'
import { tEnter } from '@/lib/motion'

/**
 * Page title block. An optional `eyebrow` sits above the title (section name),
 * `icon` (a semantic icon name) renders in the themed icon badge, and
 * `actions` align right.
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
  icon?: IconName | ReactElement
  className?: string
  /** @deprecated kept for compatibility — headings no longer glow. */
  glow?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={tEnter}
      className={cn('mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}
    >
      <div className="flex min-w-0 items-start gap-4">
        {typeof icon === 'string' ? (
          <IconBadge name={icon} box="lg" boxClassName="mt-1 hidden sm:inline-flex" />
        ) : icon && (
          <div className="mt-1 hidden size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-border bg-bg-surface-2 text-accent-brand shadow-[inset_0_1px_0_var(--specular)] sm:flex [&_svg]:size-5">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-[11px] font-semibold tracking-[0.12em] text-accent-brand uppercase">{eyebrow}</p>
          )}
          {/* Solid ink: gradient-clipped titles read as decoration. */}
          <h1 className="font-display text-[26px] leading-[1.15] font-semibold tracking-[-0.022em] text-text-primary md:text-[30px]">
            {title}
          </h1>
          {subtitle && <p className="mt-2 mb-0 max-w-2xl text-[14px] leading-relaxed text-text-secondary text-pretty">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  )
}
