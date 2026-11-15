import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui'

const fmt = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

/**
 * Context/usage gauge: a small SVG donut in a 28px hit area. With `max` it
 * fills to used/max and shifts tone at 65% (warning) and 85% (danger); without
 * a known window it stays a quiet ring and just reports the count. Never
 * shifts layout — the slot is always the same size.
 */
export function ContextRing({ used, max, label = 'Context used', className }: { used: number; max?: number | null; label?: string; className?: string }) {
  const pct = max && max > 0 ? Math.min(1, used / max) : null
  const tone = pct == null ? 'var(--hv-text-3)' : pct >= 0.85 ? 'var(--hv-danger)' : pct >= 0.65 ? 'var(--hv-warning)' : 'var(--hv-accent)'
  const r = 9
  const c = 2 * Math.PI * r
  const text = pct == null ? `${fmt(used)} tok` : `${new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 }).format(pct)}`
  const tip = pct == null ? `${label}: ${fmt(used)} tokens` : `${label}: ${fmt(used)} / ${fmt(max!)} tokens (${text})`
  return (
    <Tooltip label={tip}>
      <span
        role="img"
        aria-label={tip}
        className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[var(--hv-text-2)] transition-colors hover:bg-[var(--hv-surface-2)]', className)}
        style={{ color: tone }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
          <circle
            cx="12"
            cy="12"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={pct == null ? c * 0.85 : c * (1 - pct)}
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 300ms var(--hv-ease, ease)' }}
          />
        </svg>
      </span>
    </Tooltip>
  )
}
