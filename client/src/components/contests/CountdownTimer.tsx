import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  /** Target epoch milliseconds. Counts down to it; when passed, counts up from it if `countUpAfter`. */
  target: number
  countUpAfter?: boolean
  className?: string
  compact?: boolean
}

function fmt(ms: number): { d: string; h: string; m: string; s: string; negative: boolean } {
  const negative = ms < 0
  const t = Math.abs(Math.floor(ms / 1000))
  const d = Math.floor(t / 86400)
  const h = Math.floor((t % 86400) / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return { d: String(d), h: pad(h), m: pad(m), s: pad(s), negative }
}

/** Live-updating countdown — font-mono + tabular-nums per conventions. */
export function CountdownTimer({ target, countUpAfter, className, compact }: Props) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = target - now
  const done = diff <= 0 && !countUpAfter
  const { d, h, m, s, negative } = fmt(countUpAfter && diff < 0 ? diff : diff)
  const parts = Number(d) > 0
    ? [`${d}d`, `${h}h`, `${m}m`]
    : compact
      ? [`${negative ? '-' : ''}${h}:${m}:${s}`]
      : [`${h}h`, `${m}m`, `${s}s`]

  if (done) {
    return (
      <span className={cn('font-mono text-xs text-foreground-faint tabular-nums', className)}>
        —
      </span>
    )
  }

  return (
    <span
      className={cn('font-mono text-sm font-semibold text-cyan tabular-nums', className)}
      role="timer"
      aria-live="off"
    >
      {negative && countUpAfter && <span className="text-foreground-faint">+</span>}
      {parts.join(compact ? '' : ' ')}
    </span>
  )
}
