import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useSmartBack } from '@/lib/backNav'
import { Tooltip } from './Tooltip'

/**
 * Back. A quiet square icon button: hairline edge, the ← glyph, a surface
 * tint on hover. With no `to`/`onClick` it goes where useSmartBack says (the
 * page you came from, else one level up) and its label names that place.
 */
export function BackButton({
  to,
  onClick,
  label,
  size = 'md',
  className,
}: {
  /** A fixed destination (renders a link). */
  to?: string
  /** A custom action. */
  onClick?: () => void
  /** Tooltip + accessible name. Defaults to "Back to <place>". */
  label?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const smart = useSmartBack()
  const name = label ?? (to || onClick ? 'Back' : smart.label)
  const cls = cn(
    'group/back inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border/70 text-text-secondary select-none',
    'transition-[background-color,border-color,color] duration-150 ease-out outline-none motion-reduce:transition-none',
    'hover:border-border hover:bg-bg-surface-2 hover:text-text-primary active:bg-bg-surface-3',
    'focus-visible:ring-2 focus-visible:ring-accent-brand focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-app)]',
    size === 'sm' ? 'size-8' : 'size-9',
    className,
  )
  const glyph = (
    <ArrowLeft
      aria-hidden="true"
      strokeWidth={2}
      className={cn('transition-transform duration-150 ease-out group-hover/back:-translate-x-px motion-reduce:transition-none', size === 'sm' ? 'size-4' : 'size-[17px]')}
    />
  )
  const node = to ? (
    <Link to={to} aria-label={name} className={cls}>
      {glyph}
    </Link>
  ) : (
    <button type="button" onClick={onClick ?? smart.go} aria-label={name} className={cls}>
      {glyph}
    </button>
  )
  return (
    <Tooltip label={name} side="bottom">
      {node}
    </Tooltip>
  )
}
