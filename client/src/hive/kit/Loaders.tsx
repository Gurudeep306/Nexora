import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * Loading primitives for Hive. The spinner is a crisp 2.5px arc ring (16–24px)
 * for contained waits; the skeleton is a block that breathes on the surface it
 * will fill. Both announce via role="status" / aria-hidden, and both go
 * static under prefers-reduced-motion (kit.css).
 */
export function Spinner({ size = 16, label = 'Loading', className }: { size?: number; label?: string; className?: string }) {
  return (
    <span role="status" aria-label={label} className={cn('hv-spinner inline-block shrink-0 text-[var(--hv-text-2)]', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="hv-spinner-svg block size-full">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={cn('hv-skeleton', className)} style={style} />
}
