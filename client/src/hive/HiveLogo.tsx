import { cn } from '@/lib/utils'

/**
 * The Hive mark: a solid accent tile holding three agent nodes wired to a
 * core (you). Flat, single colour, legible at 16px — like an app icon.
 * `live` pulses the nodes while agents work; `draw` plays a one-shot
 * draw-in for the boot screen. Both are pure SVG + CSS, off under
 * prefers-reduced-motion.
 */
export function HiveLogo({ size = 28, live = false, draw = false, className }: { size?: number; live?: boolean; draw?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={cn('hive-mark shrink-0', live && 'hive-mark-live', draw && 'hive-mark-draw', className)}
      aria-hidden
    >
      <rect x="3" y="3" width="42" height="42" rx="10" fill="var(--color-accent-brand)" />
      <g className="hive-mark-links" stroke="var(--color-on-accent-brand)" strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path pathLength={1} d="M24 24V13.5" />
        <path pathLength={1} d="M24 24l9.2 5.4" />
        <path pathLength={1} d="M24 24l-9.2 5.4" />
        <path pathLength={1} d="M24 13.5l9.2 15.9H14.8Z" opacity="0.45" strokeWidth="1.6" />
      </g>
      <g className="hive-mark-nodes" fill="var(--color-on-accent-brand)">
        <circle className="node" cx="24" cy="13.5" r="3.1" />
        <circle className="node" cx="33.2" cy="29.4" r="3.1" />
        <circle className="node" cx="14.8" cy="29.4" r="3.1" />
        <circle className="node node-core" cx="24" cy="24" r="4.1" />
      </g>
    </svg>
  )
}

/** Mark + wordmark. */
export function HiveLockup({ size = 26, live, draw, className }: { size?: number; live?: boolean; draw?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <HiveLogo size={size} live={live} draw={draw} />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-text-primary">Hive</span>
    </span>
  )
}
