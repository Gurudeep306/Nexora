import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Tooltip } from './Tooltip'

/**
 * The back affordance, styled as a physical keycap: a keyboard key you press to
 * go back. No words — the ← glyph on a 3D-edged cap reads as "back" to anyone
 * who has used a keyboard. It depresses on click like a real key.
 */
export function BackButton({
  to,
  onClick,
  label = 'Back',
  size = 'md',
  className,
}: {
  /** Render as a router Link when a destination is given. */
  to?: string
  /** Otherwise render as a button and call this. */
  onClick?: () => void
  /** Tooltip + aria label (never shown as visible text on the cap). */
  label?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const cap = cn(
    'group/back relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl border select-none',
    'border-border bg-gradient-to-b from-bg-surface-3 to-bg-surface-2 text-text-primary',
    // the keycap's 3D bottom edge + a soft pool of shadow beneath it
    'shadow-[inset_0_1px_0_oklch(100%_0_0/0.07),0_2px_0_0_var(--color-border-strong),0_5px_12px_-5px_rgb(0_0_0/0.7)]',
    'transition-[transform,box-shadow,border-color,color] duration-150 ease-out outline-none motion-reduce:transition-none',
    'hover:border-accent-brand/50 hover:text-accent-brand',
    // press the key down: drop the transform and flatten the edge shadow
    'active:translate-y-[2px] active:shadow-[inset_0_1px_2px_rgb(0_0_0/0.4),0_0_0_0_var(--color-border-strong),0_1px_2px_-1px_rgb(0_0_0/0.6)]',
    'focus-visible:ring-2 focus-visible:ring-accent-brand focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-app)]',
    size === 'sm' ? 'size-8' : 'size-10',
    className,
  )

  const glyph = (
    <ArrowLeft
      aria-hidden="true"
      strokeWidth={2.4}
      className={cn(
        'transition-transform duration-150 ease-out group-hover/back:-translate-x-[2px] motion-reduce:transition-none',
        size === 'sm' ? 'size-4' : 'size-[18px]',
      )}
    />
  )

  const node = to ? (
    <Link to={to} aria-label={label} className={cap}>
      {glyph}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} className={cap}>
      {glyph}
    </button>
  )

  return (
    <Tooltip label={label} side="bottom">
      {node}
    </Tooltip>
  )
}
