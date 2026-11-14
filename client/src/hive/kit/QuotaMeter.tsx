import { cn } from '@/lib/utils'

/**
 * A 4px bar plus the words, always: "5 of 33 today · resets in 15h".
 * Normal under 70%, warning 70–95%, danger above 95% or at the limit.
 */
export function QuotaMeter({ used, limit, text, foot, className }: { used: number; limit: number | null; text?: string; foot?: string; className?: string }) {
  const pct = limit && limit > 0 ? Math.min(100, (used / limit) * 100) : null
  const tone = pct == null ? 'var(--hv-text-3)' : pct > 95 ? 'var(--hv-danger)' : pct >= 70 ? 'var(--hv-warning)' : 'var(--hv-success)'
  const words = text ?? (limit ? `${fmt(used)} of ${fmt(limit)}` : `${fmt(used)} used`)
  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-[12px]">
        <span className="hv-num truncate text-[var(--hv-text-2)]">{words}</span>
        {foot && <span className="hv-num shrink-0 text-[var(--hv-text-3)]">{foot}</span>}
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-[var(--hv-border)]"
        role={pct == null ? undefined : 'meter'}
        aria-valuemin={pct == null ? undefined : 0}
        aria-valuemax={limit ?? undefined}
        aria-valuenow={pct == null ? undefined : used}
        aria-label={words}
      >
        {pct != null && <div className="h-full rounded-full" style={{ width: `${Math.max(pct, used > 0 ? 3 : 0)}%`, background: tone }} />}
      </div>
    </div>
  )
}

function fmt(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k`
  return String(n)
}
