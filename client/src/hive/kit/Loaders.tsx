import { useEffect, useState, type CSSProperties } from 'react'
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

/**
 * A small honest "working" line for agent streams: a spinner, one word for
 * what is really happening (the caller knows: "Writing code", "Typing"…)
 * and the seconds so far. It never cycles through invented phases.
 */
export function ThinkingIndicator({ words = ['Working'], className }: { words?: string[]; className?: string }) {
  const [t0] = useState(() => Date.now())
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const secs = Math.floor((Date.now() - t0) / 1000)
  const word = words[0] ?? 'Working'
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-[13px] text-[var(--hv-text-2)]', className)}>
      <Spinner size={13} label={word} />
      <span className="font-medium">{word}</span>
      {secs >= 3 && <span className="tabular-nums text-[var(--hv-text-3)]">{secs}s</span>}
    </span>
  )
}
