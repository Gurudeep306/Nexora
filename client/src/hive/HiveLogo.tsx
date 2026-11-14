import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * The Hive mark: a rounded cell (the workspace) holding three connected
 * nodes (agents) around a core (you). Drawn in the NexoraGuru logo ramp
 * (--ng-c1..3), so it follows every palette and light/dark mode.
 * `live` animates the nodes while agents are working.
 */
export function HiveLogo({ size = 28, live = false, className }: { size?: number; live?: boolean; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const g = `hv${id}`
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={cn('ng-mark shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={`${g}a`} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--ng-c1, var(--color-accent-brand))" />
          <stop offset="0.55" stopColor="var(--ng-c2, var(--color-accent-brand))" />
          <stop offset="1" stopColor="var(--ng-c3, var(--color-accent-brand))" />
        </linearGradient>
        <radialGradient id={`${g}b`} cx="24" cy="24" r="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--ng-c2, var(--color-accent-brand))" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--ng-c1, var(--color-accent-brand))" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="4.5" y="4.5" width="39" height="39" rx="12" fill={`url(#${g}b)`} />
      <rect x="4.5" y="4.5" width="39" height="39" rx="12" fill="none" stroke={`url(#${g}a)`} strokeWidth="2.6" />
      {/* links: each agent to the core and to its neighbours */}
      <g stroke={`url(#${g}a)`} strokeWidth="1.6" strokeLinecap="round" opacity="0.75">
        <path d="M24 24 24 13.2M24 24 33.4 29.4M24 24 14.6 29.4" />
        <path d="M24 13.2 33.4 29.4 14.6 29.4z" fill="none" opacity="0.45" />
      </g>
      <g fill={`url(#${g}a)`}>
        <circle cx="24" cy="13.2" r="3.4">{live && <animate attributeName="r" values="3.4;4.3;3.4" dur="1.6s" repeatCount="indefinite" />}</circle>
        <circle cx="33.4" cy="29.4" r="3.4">{live && <animate attributeName="r" values="3.4;4.3;3.4" dur="1.6s" begin="0.53s" repeatCount="indefinite" />}</circle>
        <circle cx="14.6" cy="29.4" r="3.4">{live && <animate attributeName="r" values="3.4;4.3;3.4" dur="1.6s" begin="1.06s" repeatCount="indefinite" />}</circle>
      </g>
      <circle cx="24" cy="24" r="4.6" fill="var(--color-bg-app)" stroke={`url(#${g}a)`} strokeWidth="2.2" />
    </svg>
  )
}

/** Mark + wordmark. */
export function HiveLockup({ size = 26, live, className }: { size?: number; live?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <HiveLogo size={size} live={live} />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-text-primary">
        Hive
      </span>
    </span>
  )
}
