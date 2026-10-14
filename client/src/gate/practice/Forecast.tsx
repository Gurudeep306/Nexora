import { cn } from '@/lib/utils'
import { todayISO } from '../progress'

/** Upcoming reviews: a 14-day bar strip (today first). */
export function Forecast({ upcoming, className }: { upcoming: Record<string, number>; className?: string }) {
  const days = Object.keys(upcoming).sort().slice(0, 14)
  const max = Math.max(1, ...days.map((d) => upcoming[d] ?? 0))
  const today = todayISO()
  const total = days.reduce((a, d) => a + (upcoming[d] ?? 0), 0)
  return (
    <figure className={cn('space-y-2', className)}>
      <figcaption className="flex items-baseline justify-between text-[12px] text-text-muted">
        <span className="font-semibold tracking-wide uppercase">Next 14 days</span>
        <span className="font-mono tabular-nums">{total} due</span>
      </figcaption>
      <div className="flex h-20 items-end gap-1" role="img" aria-label={days.map((d) => `${d}: ${upcoming[d] ?? 0}`).join(', ')}>
        {days.map((d) => {
          const n = upcoming[d] ?? 0
          const date = new Date(`${d}T00:00:00`)
          return (
            <div key={d} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}: ${n}`}>
              <span className="font-mono text-[9.5px] text-text-muted tabular-nums">{n || ''}</span>
              <span
                className={cn('w-full rounded-t-[3px]', d === today ? 'bg-accent-brand' : n ? 'bg-accent-brand/45' : 'bg-bg-surface-3')}
                style={{ height: `${n ? Math.max(6, (n / max) * 64) : 3}%` }}
              />
              <span className={cn('text-[9.5px]', d === today ? 'font-semibold text-accent-brand' : 'text-text-muted')}>{d === today ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
            </div>
          )
        })}
      </div>
    </figure>
  )
}
