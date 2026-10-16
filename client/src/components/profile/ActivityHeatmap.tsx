import { useEffect, useMemo, useRef } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LEVEL_MIX = [0, 28, 50, 74, 100]

const iso = (d: Date) => d.toISOString().slice(0, 10)

/** 365-day activity grid (solves + GATE practice per day), GitHub-style. */
export function ActivityHeatmap({ days, accent = 'var(--color-accent-brand)' }: { days: { date: string; count: number; solved: number; gate: number }[]; accent?: string }) {
  const scroller = useRef<HTMLDivElement>(null)
  const { weeks, total, activeDays, max, months } = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]))
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setUTCDate(start.getUTCDate() - 364 - start.getUTCDay())
    const weeks: { date: string; count: number; solved: number; gate: number; future: boolean }[][] = []
    const months: { col: number; label: string }[] = []
    let total = 0
    let activeDays = 0
    let max = 0
    for (let w = 0, d = new Date(start); d <= today || d.getUTCDay() !== 0; w++) {
      const week = []
      for (let i = 0; i < 7; i++) {
        const key = iso(d)
        const hit = byDate.get(key)
        const count = hit?.count ?? 0
        total += count
        if (count) activeDays++
        max = Math.max(max, count)
        if (d.getUTCDate() === 1 && w > 0) months.push({ col: w, label: MONTHS[d.getUTCMonth()] })
        week.push({ date: key, count, solved: hit?.solved ?? 0, gate: hit?.gate ?? 0, future: d > today })
        d.setUTCDate(d.getUTCDate() + 1)
      }
      weeks.push(week)
      if (weeks.length > 54) break
    }
    return { weeks, total, activeDays, max, months }
  }, [days])

  // Start scrolled to today on narrow screens.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [weeks])

  const level = (c: number) => (c === 0 ? 0 : max <= 4 ? Math.min(4, c) : Math.min(4, Math.ceil((c / max) * 4)))
  const cell = 11
  const gap = 3
  const W = weeks.length * (cell + gap)
  const H = 7 * (cell + gap) + 16

  return (
    <div>
      <div ref={scroller} className="overflow-x-auto pb-1 [scrollbar-width:thin]">
        <svg width={W + 24} height={H} role="img" aria-label={`${total} contributions in the last year across ${activeDays} active days`} className="block">
          {months.map((m) => (
            <text key={`${m.col}${m.label}`} x={24 + m.col * (cell + gap)} y={9} className="fill-[var(--color-text-muted)] text-[9px]">
              {m.label}
            </text>
          ))}
          {['Mon', 'Wed', 'Fri'].map((d, i) => (
            <text key={d} x={0} y={16 + (1 + i * 2) * (cell + gap) + 9} className="fill-[var(--color-text-muted)] text-[9px]">
              {d}
            </text>
          ))}
          {weeks.map((week, w) =>
            week.map((day, i) =>
              day.future ? null : (
                <rect
                  key={day.date}
                  className="ng-heat-cell"
                  style={{ transformOrigin: `${24 + w * (cell + gap) + cell / 2}px ${16 + i * (cell + gap) + cell / 2}px` }}
                  x={24 + w * (cell + gap)}
                  y={16 + i * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={2.5}
                  fill={level(day.count) ? `color-mix(in oklab, ${accent} ${LEVEL_MIX[level(day.count)]}%, var(--color-bg-surface-3))` : 'var(--color-bg-surface-3)'}
                >
                  <title>
                    {day.count ? `${day.solved} solved${day.gate ? ` · ${day.gate} GATE` : ''} on ${day.date}` : `No activity on ${day.date}`}
                  </title>
                </rect>
              ),
            ),
          )}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
        <span>
          <strong className="font-semibold text-text-primary tabular-nums">{total}</strong> contributions · <strong className="font-semibold text-text-primary tabular-nums">{activeDays}</strong> active days
        </span>
        <span className="flex items-center gap-1" aria-hidden="true">
          Less
          {LEVEL_MIX.map((m, i) => (
            <span key={i} className="size-[11px] rounded-[3px]" style={{ background: i ? `color-mix(in oklab, ${accent} ${m}%, var(--color-bg-surface-3))` : 'var(--color-bg-surface-3)' }} />
          ))}
          More
        </span>
      </div>
    </div>
  )
}
