import { useId, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { markSvg } from './traversal'

/**
 * NexoraGuru brand components.
 *
 *   <Logo />                                   the mark
 *   <Logo variant="lockup" size={28} />        mark + "NexoraGuru" wordmark
 *
 * The mark is one solid tile in the text colour with the NG graph cut out of
 * it (see markSvg in ./traversal.ts): one colour, no gradient, so it follows
 * every theme and stays crisp from 16 px up. Under 19 px it cuts the N alone.
 * `interactive` adds a single quiet fade-in the first time the page shows it.
 */

let introPlayed = false // once per page load, not on every remount

export function LogoMark({
  size = 32,
  interactive = false,
  intro = true,
  className,
}: {
  size?: number
  /** A one-time fade-in on first show (off under reduced motion). */
  interactive?: boolean
  intro?: boolean
  /** Kept for compatibility; the mark no longer replays anything. */
  replayOnClick?: boolean
  className?: string
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const html = useMemo(() => markSvg({ id: `ng${id}`, size, tiny: size < 19, small: size <= 24 }), [id, size])
  const play = interactive && intro && !introPlayed
  if (play) introPlayed = true
  return (
    <span
      aria-hidden="true"
      className={cn('ng-mark inline-block shrink-0 align-middle leading-[0] text-text-primary', play && 'ng-mark-intro', className)}
      style={{ width: size, height: size }}
      // Static, trusted markup generated from constants in ./traversal.ts.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/** "NexoraGuru": one weight, two inks — "Nexora" in the text colour, "Guru" a step quieter. No gradient. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-[family-name:var(--font-brand)] text-[16px] font-semibold tracking-[-0.03em] whitespace-nowrap text-text-primary', className)}>
      Nexora<span className="text-text-secondary">Guru</span>
    </span>
  )
}

/** The production logo. `variant="lockup"` adds the wordmark beside the mark. */
export function Logo({
  variant = 'mark',
  size = 28,
  interactive = false,
  intro = true,
  className,
  wordmarkClassName,
}: {
  variant?: 'mark' | 'lockup'
  size?: number
  interactive?: boolean
  intro?: boolean
  replayOnClick?: boolean
  className?: string
  wordmarkClassName?: string
}) {
  const mark = <LogoMark size={size} interactive={interactive} intro={intro} />
  if (variant === 'mark') return <span className={cn('inline-flex', className)}>{mark}</span>
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {mark}
      <Wordmark className={wordmarkClassName} />
    </span>
  )
}
