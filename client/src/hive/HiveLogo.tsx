import { cn } from '@/lib/utils'

/**
 * The Hive mark: three agent nodes wired to a core (you), drawn in a single
 * line weight in the text colour, with only the core in the accent. No tile,
 * no fill: it reads like a typeset logo, not an app-store icon. `live`
 * breathes the nodes while agents work; `draw` traces the lines once for the
 * boot screen. Both are CSS only and off under prefers-reduced-motion.
 */
export function HiveLogo({ size = 28, live = false, draw = false, className }: { size?: number; live?: boolean; draw?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={cn('hive-mark shrink-0 text-text-primary', live && 'hive-mark-live', draw && 'hive-mark-draw', className)} aria-hidden>
      <g className="hive-mark-links" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path pathLength={1} d="M24 24V9" />
        <path pathLength={1} d="M24 24l13 7.5" />
        <path pathLength={1} d="M24 24l-13 7.5" />
        <path pathLength={1} d="M24 9l13 22.5H11Z" opacity="0.35" strokeWidth="2" />
      </g>
      <g className="hive-mark-nodes">
        <circle className="node" cx="24" cy="9" r="4" fill="var(--hv-bg-app, var(--color-bg-app))" stroke="currentColor" strokeWidth="2.6" />
        <circle className="node" cx="37" cy="31.5" r="4" fill="var(--hv-bg-app, var(--color-bg-app))" stroke="currentColor" strokeWidth="2.6" />
        <circle className="node" cx="11" cy="31.5" r="4" fill="var(--hv-bg-app, var(--color-bg-app))" stroke="currentColor" strokeWidth="2.6" />
        <circle className="node node-core" cx="24" cy="24" r="4.6" fill="var(--color-accent-brand)" />
      </g>
    </svg>
  )
}

/** Mark + wordmark. */
export function HiveLockup({ size = 26, live, draw, className }: { size?: number; live?: boolean; draw?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <HiveLogo size={size} live={live} draw={draw} />
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-text-primary">Hive</span>
    </span>
  )
}
