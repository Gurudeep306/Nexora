import { cn } from '@/lib/utils'
import './boot.css'

/**
 * The Hive mark: an H written in three strokes of the same ink as the
 * NexoraGuru mark. The crossbar runs on through the second stem and the pen
 * stops in the clay full stop — work passes through the team and lands as a
 * result. Same 32-unit grid, stroke weights and clay as the NG mark
 * (components/brand/traversal.ts), so the two sit together as one family.
 *
 *   draw   write it once (pages that open on it)
 *   loop   keep writing, lifting and rewriting it (the boot screen)
 *   live   agents are working: the full stop breathes slowly
 *
 * All motion is CSS and stops under prefers-reduced-motion (the finished
 * mark shows).
 */
export const HIVE_STROKES = ['M6.4 6.9V25.4', 'M16.8 6.9V25.4', 'M6.4 16.15H21.6'] as const
export const HIVE_STOP = [25.6, 16.15] as const
const CLAY = 'var(--ed-clay, #D97757)'

const weight = (px: number) => (px <= 20 ? 3.8 : px <= 24 ? 3.5 : 3.2)

export function HiveLogo({
  size = 28,
  live = false,
  draw = false,
  loop = false,
  className,
}: {
  size?: number
  live?: boolean
  draw?: boolean
  loop?: boolean
  className?: string
}) {
  const sw = weight(size)
  const r = +(sw * 0.66).toFixed(2)
  const writing = draw || loop
  return (
    <span aria-hidden="true" className={cn('hive-mark', live && 'hive-mark-live', writing && 'hive-mark-write', loop && 'hive-mark-loop', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" width={size} height={size} focusable="false" style={{ overflow: 'visible' }}>
        {writing && (
          // A faint copy stays underneath while it writes, so the mark never disappears.
          <g fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" opacity={0.14}>
            {HIVE_STROKES.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        )}
        <g fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round">
          {HIVE_STROKES.map((d, i) => (
            <path key={d} d={d} pathLength={1} className={`hive-mark-s hive-mark-s${i + 1}`} />
          ))}
        </g>
        <circle className="hive-mark-stop" cx={HIVE_STOP[0]} cy={HIVE_STOP[1]} r={r} fill={CLAY} />
      </svg>
    </span>
  )
}

/** Mark + name: "Hive" in the display face, with the site's name above it in small capitals. */
export function HiveLockup({ size = 26, live, className }: { size?: number; live?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <HiveLogo size={size} live={live} />
      <span className="grid leading-none">
        <span className="hv-eyebrow text-[9.5px] tracking-[0.14em]">NexoraGuru</span>
        <span className="hv-serif text-[19px] leading-[1.05] text-[var(--hv-text-1)]">Hive</span>
      </span>
    </span>
  )
}
