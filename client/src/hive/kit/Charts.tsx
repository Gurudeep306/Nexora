import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/*
 * Two small charts for Hive, with no chart library: stacked bars (usage per
 * day) and a sparkline (a key's recent usage). Both are plain HTML/SVG,
 * follow the theme tokens, and carry a screen-reader table of the numbers.
 */

/** Round an axis maximum up to 1, 2, 2.5 or 5 × a power of ten. */
function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v))
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p
}

export interface Series {
  key: string
  label: string
  color: string
}

export function StackedBars<T>({
  rows,
  series,
  value,
  label,
  tip,
  yFormat = (n) => String(n),
  height = 224,
  ariaLabel,
  className,
}: {
  rows: T[]
  series: Series[]
  value: (row: T, key: string) => number
  label: (row: T) => string
  tip?: (row: T) => ReactNode
  yFormat?: (n: number) => string
  height?: number
  ariaLabel: string
  className?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const totals = rows.map((r) => series.reduce((s, x) => s + Math.max(0, value(r, x.key)), 0))
  const max = niceMax(Math.max(1, ...totals))
  // At most ~7 x labels so they never collide.
  const every = Math.max(1, Math.ceil(rows.length / 7))
  const ticks = [1, 0.75, 0.5, 0.25, 0]
  // Keep the tooltip inside the plot near either edge.
  const tipShift = (i: number) => (i < rows.length * 0.2 ? '0%' : i > rows.length * 0.8 ? '-100%' : '-50%')
  return (
    <div className={cn('relative', className)}>
      <div className="flex gap-3" style={{ height }} role="img" aria-label={ariaLabel}>
        {/* y axis: quiet, tabular, aligned to the grid */}
        <div className="hv-num relative w-10 shrink-0 text-right text-[11px] text-[var(--hv-text-3)]" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 leading-none" style={{ top: `calc(${(1 - t) * 100}% - ${(1 - t) * 20}px)` }}>
              {t === 0 ? '0' : yFormat(max * t)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          {/* grid: hairlines, the baseline a step stronger */}
          <div className="pointer-events-none absolute inset-x-0 bottom-5 top-0" aria-hidden>
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 border-t" style={{ top: `${(1 - t) * 100}%`, borderColor: t === 0 ? 'var(--hv-chart-axis)' : 'var(--hv-chart-grid)' }} />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-5 top-0 flex items-end" onMouseLeave={() => setHover(null)}>
            {rows.map((r, i) => (
              <div key={i} className={cn('relative flex h-full min-w-0 flex-1 items-end justify-center px-[1px]', hover === i && 'bg-[var(--hv-chart-grid)]')} onMouseEnter={() => setHover(i)}>
                {/* thin bar; segments stacked with a 2px surface gap; only the top end is rounded */}
                <div className="flex w-full max-w-[14px] flex-col-reverse gap-[2px]" style={{ height: `${(totals[i] / max) * 100}%` }}>
                  {series.map((s, si) => {
                    const v = Math.max(0, value(r, s.key))
                    if (v <= 0) return null
                    const top = series.slice(si + 1).every((x) => Math.max(0, value(r, x.key)) <= 0)
                    return <div key={s.key} className={cn('min-h-[2px]', top && 'rounded-t-[4px]')} style={{ flexGrow: v, flexBasis: 0, background: s.color }} />
                  })}
                </div>
              </div>
            ))}
          </div>
          {/* x labels */}
          <div className="absolute inset-x-0 bottom-0 h-5" aria-hidden>
            {rows.map((r, i) =>
              i % every === 0 ? (
                <span key={i} className="hv-num absolute bottom-0 -translate-x-1/2 whitespace-nowrap text-[11px] text-[var(--hv-text-3)]" style={{ left: `${((i + 0.5) / rows.length) * 100}%` }}>
                  {label(r)}
                </span>
              ) : null,
            )}
          </div>
          {hover != null && tip && rows[hover] && (
            <div className="pointer-events-none absolute top-1 z-10" style={{ left: `${((hover + 0.5) / rows.length) * 100}%`, transform: `translateX(${tipShift(hover)})` }}>
              <div className="pop-surface min-w-[168px] px-3 py-2 text-[12px] leading-relaxed">{tip(rows[hover])}</div>
            </div>
          )}
        </div>
      </div>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th scope="row">{label(r)}</th>
              {series.map((s) => (
                <td key={s.key}>{yFormat(value(r, s.key))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A tiny area chart of one or two series (e.g. charged vs cached tokens). */
export function Sparkline({ points, color, second, secondColor, height = 56, label }: { points: number[]; color: string; second?: number[]; secondColor?: string; height?: number; label: string }) {
  const gid = `sp${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const n = Math.max(points.length, second?.length ?? 0)
  if (n < 2) return null
  const max = Math.max(1, ...points, ...(second ?? []))
  const xy = (vals: number[]) => vals.map((v, i) => [(i / (n - 1)) * 100, 96 - (v / max) * 88] as const)
  const path = (vals: number[]) => {
    const pts = xy(vals)
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
    return { line, area: `${line} L100,100 L0,100 Z` }
  }
  const a = path(points)
  const b = second ? path(second) : null
  const last = xy(points).at(-1)
  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" role="img" aria-label={label}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.22} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {b && <path d={b.line} fill="none" stroke={secondColor} strokeWidth={1.25} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
        <path d={a.area} fill={`url(#${gid})`} />
        <path d={a.line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* end marker drawn in HTML so it stays round whatever the aspect ratio */}
      {last && <span className="absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${last[0]}%`, top: `${last[1]}%`, background: color, boxShadow: '0 0 0 2px var(--hv-surface-1)' }} aria-hidden="true" />}
    </div>
  )
}
