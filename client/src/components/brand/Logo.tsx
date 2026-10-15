import { useEffect, useId, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { traversalSvg } from './traversal'

/**
 * NexoraGuru brand components.
 *
 *   <Logo />                                   the mark, static
 *   <Logo interactive />                       + intro, hover signal, idle pulse
 *   <Logo variant="lockup" size={28} />        mark + "NexoraGuru" wordmark
 *
 * The mark is "Traversal" (see ./traversal.ts): N and G as one graph, drawn the
 * way a breadth-first search visits it. The static SVG is rendered inline, so it
 * paints with the page at a fixed size (no layout shift). With `interactive`,
 * the motion code (./traversalFx.ts, ~3 KB) is lazy-loaded and takes over the
 * same box. Reduced motion means static, always.
 *
 * Colours follow the theme mode: the ramp is set by `.ng-mark` in index.css
 * (deeper on light palettes, brighter on dark ones); the faint "unvisited"
 * graph uses the theme's text colour.
 */

let introPlayed = false // the intro plays once per page load, not on every remount

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function LogoMark({
  size = 32,
  interactive = false,
  intro = true,
  replayOnClick = false,
  className,
}: {
  size?: number
  /** Lazy-load the motion: intro, hover signal and a subtle idle pulse. */
  interactive?: boolean
  /** Play the intro (once per page load) when interactive. */
  intro?: boolean
  /** Replay the intro on click (leave off when the logo is a link). */
  replayOnClick?: boolean
  className?: string
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const small = size <= 24
  const html = useMemo(
    () => traversalSvg({ id: `ng${id}`, small, size, colors: ['var(--ng-c1)', 'var(--ng-c2)', 'var(--ng-c3)'] }),
    [id, small, size],
  )
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const host = ref.current
    if (!interactive || !host || prefersReducedMotion()) return
    let cleanup: (() => void) | undefined
    let cancelled = false
    void import('./traversalFx').then(({ mountTraversal }) => {
      if (cancelled) return
      const play = intro && !introPlayed
      if (play) introPlayed = true
      cleanup = mountTraversal(host, { size, intro: play, replayOnClick })
    })
    return () => {
      cancelled = true
      cleanup?.()
      // hand the box back to the static mark
      if (host.isConnected) host.innerHTML = html
    }
  }, [interactive, intro, replayOnClick, size, html])

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn('ng-mark inline-block shrink-0 align-middle leading-[0] [&_svg]:overflow-visible', className)}
      style={{ width: size, height: size }}
      // Static, trusted markup generated from constants in ./traversal.ts.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/** "NexoraGuru": "Nexora" regular in the theme's ink, "Guru" medium in the brand gradient (Geist). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-[family-name:var(--font-brand)] text-[16px] font-normal tracking-[-0.025em] whitespace-nowrap text-text-primary',
        className,
      )}
    >
      Nexora
      <span className="bg-gradient-to-r from-[#2f5bea] via-[#7c3aed] to-[#0d9488] bg-clip-text font-medium text-transparent dark:from-[#6f95ff] dark:via-[#a78bfa] dark:to-[#2dd4bf]">
        Guru
      </span>
    </span>
  )
}

/** The production logo. `variant="lockup"` adds the wordmark beside the mark. */
export function Logo({
  variant = 'mark',
  size = 28,
  interactive = false,
  intro = true,
  replayOnClick = false,
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
  const mark = <LogoMark size={size} interactive={interactive} intro={intro} replayOnClick={replayOnClick} />
  if (variant === 'mark') return <span className={cn('inline-flex', className)}>{mark}</span>
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {mark}
      <Wordmark className={wordmarkClassName} />
    </span>
  )
}
