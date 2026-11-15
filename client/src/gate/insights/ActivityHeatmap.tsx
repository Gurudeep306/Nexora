/*
  365-day activity heatmap (GitHub/LeetCode style): one cell per day, weeks as
  columns, a single-hue sequential scale. Scrolls sideways on phones with the
  latest week in view; hovering or focusing a cell shows the exact count.
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { addDays, dayKey } from './format'

const LEVEL = ['bg-bg-surface-3', 'bg-accent-brand/30', 'bg-accent-brand/55', 'bg-accent-brand/80', 'bg-accent-brand']
const CELL = 11
const GAP = 3

export function ActivityHeatmap({ activity, days = 365 }: { activity: Record<string, number>; days?: number }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ day: string; n: number } | null>(null)

  const { weeks, months, max, total, activeDays } = useMemo(() => {
    const today = new Date()
    const start = addDays(today, -(days - 1))
    start.setDate(start.getDate() - start.getDay()) // back to Sunday
    const weeks: { key: string; n: number; future: boolean }[][] = []
    const months: { col: number; label: string }[] = []
    let max = 0
    let total = 0
    let activeDays = 0
    const todayKey = dayKey(today)
    for (let d = new Date(start), col = 0; d <= today || d.getDay() !== 0; col++) {
      const week: { key: string; n: number; future: boolean }[] = []
      for (let i = 0; i < 7; i++, d = addDays(d, 1)) {
        const key = dayKey(d)
        const n = activity[key] ?? 0
        const future = key > todayKey
        if (!future) {
          max = Math.max(max, n)
          total += n
          if (n > 0) activeDays++
        }
        if (d.getDate() === 1 || (col === 0 && i === 0)) {
          if (!months.length || col - months[months.length - 1]!.col >= 3)
            months.push({ col, label: d.toLocaleDateString(undefined, { month: 'short' }) })
        }
        week.push({ key, n, future })
      }
      weeks.push(week)
      if (col > 60) break
    }
    return { weeks, months, max, total, activeDays }
  }, [activity, days])

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [weeks.length])

  const level = (n: number) => (n <= 0 || max === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)))
  const width = weeks.length * (CELL + GAP)

  return (
    <div>
      <div ref={scroller} tabIndex={0} aria-label="Activity, scroll sideways for earlier weeks" className="overflow-x-auto rounded-sm pb-1 outline-none [scrollbar-width:thin] focus-visible:ring-2 focus-visible:ring-accent-brand">
        <div style={{ width: width + 24 }} className="relative">
          <div className="relative ml-6 h-4 text-[10.5px] text-text-muted" aria-hidden="true">
            {months.map((m) => (
              <span key={`${m.col}-${m.label}`} className="absolute" style={{ left: m.col * (CELL + GAP) }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex">
            <div className="flex w-6 flex-col text-[10px] text-text-muted" style={{ gap: GAP }} aria-hidden="true">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((l, i) => (
                <span key={i} style={{ height: CELL, lineHeight: `${CELL}px` }}>
                  {l}
                </span>
              ))}
            </div>
            <div
              className="flex"
              style={{ gap: GAP }}
              role="img"
              aria-label={`${total} questions attempted on ${activeDays} days in the last year`}
              onMouseLeave={() => setHover(null)}
            >
              {weeks.map((w, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                  {w.map((c) => (
                    <span
                      key={c.key}
                      onMouseEnter={() => !c.future && setHover({ day: c.key, n: c.n })}
                      title={c.future ? undefined : `${c.n} attempt${c.n === 1 ? '' : 's'} · ${c.key}`}
                      className={cn('rounded-[3px] transition-transform hover:scale-125', c.future ? 'opacity-0' : LEVEL[level(c.n)])}
                      style={{ width: CELL, height: CELL }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-text-muted">
        <span aria-live="polite" className="min-h-4 tabular-nums">
          {hover ? (
            <>
              <span className="font-semibold text-text-primary">{hover.n}</span> attempt{hover.n === 1 ? '' : 's'} on{' '}
              {new Date(`${hover.day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </>
          ) : (
            <>
              <span className="font-semibold text-text-primary">{total.toLocaleString()}</span> attempts ·{' '}
              <span className="font-semibold text-text-primary">{activeDays}</span> active days
            </>
          )}
        </span>
        <span className="flex items-center gap-1" aria-hidden="true">
          Less
          {LEVEL.map((c, i) => (
            <span key={i} className={cn('rounded-[3px]', c)} style={{ width: CELL, height: CELL }} />
          ))}
          More
        </span>
      </div>
    </div>
  )
}
