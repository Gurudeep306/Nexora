import { useEffect, useRef, useState, type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { MARK_DOT, MARK_G, MARK_N, markWeight } from './traversal'

/**
 * NexoraGuru brand components.
 *
 *   <Logo />                                   the mark
 *   <Logo variant="lockup" size={28} />        mark + "NexoraGuru" wordmark
 *
 * The mark is the NG written by hand in one line of ink, with a clay full
 * stop where the pen stops (geometry in ./traversal.ts). The ink follows the
 * text colour in every theme. `interactive` writes it once the first time the
 * page shows it; `loop` keeps writing it (MarkLoader, the page loader).
 */

let introPlayed = false // once per page load, not on every remount

const inout = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp = (t: number) => Math.max(0, Math.min(1, t))

/**
 * Write the mark: the pen (the clay nib) writes the N, lifts in a small hop,
 * writes the G in one sweep, and presses the full stop. `loop` lifts the ink
 * again and rewrites it (the loaders); otherwise it plays once. Driven by one
 * requestAnimationFrame loop on refs (React never re-renders per frame).
 */
function useWrite(
  refs: { n: RefObject<SVGPathElement | null>; g: RefObject<SVGPathElement | null>; dot: RefObject<SVGCircleElement | null> },
  opts: { play: boolean; loop: boolean; r: number },
) {
  useEffect(() => {
    const n = refs.n.current
    const g = refs.g.current
    const dot = refs.dot.current
    if (!opts.play || !n || !g || !dot) return
    const show = (el: SVGPathElement, on: boolean) => (el.style.opacity = on ? '1' : '0')
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      // Still: the finished mark, no writing.
      for (const el of [n, g]) {
        el.style.strokeDasharray = ''
        el.style.strokeDashoffset = ''
        show(el, true)
      }
      dot.style.opacity = '1'
      return
    }
    const ln = n.getTotalLength()
    const lg = g.getTotalLength()
    n.style.strokeDasharray = `${ln}`
    g.style.strokeDasharray = `${lg}`
    const WRITE = 1500
    const HOLD = 900
    const LIFT = 520
    const REST = 260
    const cycle = WRITE + HOLD + LIFT + REST
    const t0 = performance.now()
    let raf = 0
    const frame = (now: number) => {
      const el = now - t0
      if (!opts.loop && el >= WRITE) {
        n.style.strokeDashoffset = '0'
        g.style.strokeDashoffset = '0'
        show(n, true)
        show(g, true)
        dot.setAttribute('cx', String(MARK_DOT[0]))
        dot.setAttribute('cy', String(MARK_DOT[1]))
        dot.setAttribute('r', String(opts.r))
        dot.style.opacity = '1'
        return
      }
      raf = requestAnimationFrame(frame)
      const c = opts.loop ? el % cycle : el
      if (c < WRITE) {
        const t = c / WRITE
        const pa = inout(clamp(t / 0.36))
        const pb = inout(clamp((t - 0.44) / 0.46))
        n.style.strokeDashoffset = `${ln * (1 - pa)}`
        g.style.strokeDashoffset = `${lg * (1 - pb)}`
        show(n, pa > 0.002)
        show(g, pb > 0.002)
        let x: number = MARK_DOT[0]
        let y: number = MARK_DOT[1]
        if (t < 0.36) ({ x, y } = n.getPointAtLength(ln * pa))
        else if (t < 0.44) {
          const p0 = n.getPointAtLength(ln)
          const p1 = g.getPointAtLength(0)
          const u = inout((t - 0.36) / 0.08)
          x = p0.x + (p1.x - p0.x) * u
          y = p0.y + (p1.y - p0.y) * u - Math.sin(u * Math.PI) * 5
        } else if (t < 0.9) ({ x, y } = g.getPointAtLength(lg * pb))
        const press = t >= 0.9 ? Math.sin(clamp((t - 0.9) / 0.1) * Math.PI) : 0
        dot.setAttribute('cx', String(x))
        dot.setAttribute('cy', String(y))
        dot.setAttribute('r', String(opts.r * (1 + 0.35 * press)))
        dot.style.opacity = '1'
      } else if (c < WRITE + HOLD) {
        n.style.strokeDashoffset = '0'
        g.style.strokeDashoffset = '0'
        show(n, true)
        show(g, true)
        dot.setAttribute('cx', String(MARK_DOT[0]))
        dot.setAttribute('cy', String(MARK_DOT[1]))
        dot.setAttribute('r', String(opts.r))
      } else if (c < WRITE + HOLD + LIFT) {
        // The ink lifts from where the pen began, the full stop last.
        const u = inout((c - WRITE - HOLD) / LIFT)
        n.style.strokeDashoffset = `${-ln * u}`
        g.style.strokeDashoffset = `${-lg * clamp(u * 1.15 - 0.15)}`
        show(n, u < 0.998)
        show(g, u < 0.998)
        dot.style.opacity = String(1 - clamp(u * 1.4 - 0.4))
      } else {
        show(n, false)
        show(g, false)
        dot.style.opacity = '0'
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.play, opts.loop])
}

export function LogoMark({
  size = 32,
  interactive = false,
  intro = true,
  loop = false,
  write = false,
  className,
}: {
  size?: number
  /** Write itself once, the first time the page shows it (off under reduced motion). */
  interactive?: boolean
  intro?: boolean
  /** Keep writing, lifting and rewriting (the loaders). */
  loop?: boolean
  /** Write it once whenever it mounts (a moment, like a successful sign-in). */
  write?: boolean
  /** Kept for compatibility. */
  replayOnClick?: boolean
  className?: string
}) {
  const [play] = useState(() => loop || write || (interactive && intro && !introPlayed))
  if (play && interactive && !loop) introPlayed = true
  const nRef = useRef<SVGPathElement>(null)
  const gRef = useRef<SVGPathElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const sw = markWeight(size)
  const r = +(sw * 0.66).toFixed(2)
  useWrite({ n: nRef, g: gRef, dot: dotRef }, { play, loop, r })
  // Before the first frame of a write, the ink is hidden (no flash of the finished mark).
  const hidden = play ? { opacity: 0 } : undefined
  return (
    <span aria-hidden="true" className={cn('ng-mark inline-block shrink-0 align-middle leading-[0] text-text-primary', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" width={size} height={size} focusable="false" style={{ overflow: 'visible' }}>
        <path ref={nRef} d={MARK_N} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={hidden} />
        <path ref={gRef} d={MARK_G} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={hidden} />
        <circle ref={dotRef} cx={MARK_DOT[0]} cy={MARK_DOT[1]} r={r} fill="var(--ed-clay, #D97757)" style={play ? { opacity: 0 } : undefined} />
      </svg>
    </span>
  )
}

/** The mark writing itself on a loop, with one quiet line beneath: the page loader. */
export function MarkLoader({ size = 64, label = 'Loading' }: { size?: number; label?: string }) {
  return (
    <div className="grid justify-items-center gap-4" role="status">
      <LogoMark size={size} loop />
      <span className="font-serif text-[15px] text-text-muted italic">{label}…</span>
    </div>
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
