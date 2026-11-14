import { useState, type ReactNode } from 'react'
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
  // At most ~8 x labels so they never collide.
  const every = Math.max(1, Math.ceil(rows.length / 8))
  return (
    <div className={cn('relative', className)}>
      <div className="flex gap-2" style={{ height }} role="img" aria-label={ariaLabel}>
        {/* y axis */}
        <div className="hv-num flex w-11 shrink-0 flex-col justify-between pb-5 text-right text-[11px] text-[var(--hv-text-3)]" aria-hidden>
          <span>{yFormat(max)}</span>
          <span>{yFormat(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          {/* grid lines */}
          <div className="pointer-events-none absolute inset-x-0 bottom-5 top-0 flex flex-col justify-between" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="border-t border-[var(--hv-border-subtle)]" />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-5 top-0 flex items-end gap-[3px]" onMouseLeave={() => setHover(null)}>
            {rows.map((r, i) => (
              <div key={i} className="relative flex h-full min-w-0 flex-1 items-end justify-center" onMouseEnter={() => setHover(i)}>
                <div className={cn('flex w-full max-w-7 flex-col-reverse overflow-hidden rounded-t-[4px] transition-opacity duration-[var(--hv-d-fast)]', hover != null && hover !== i && 'opacity-60')} style={{ height: `${(totals[i] / max) * 100}%` }}>
                  {series.map((s) => {
                    const v = Math.max(0, value(r, s.key))
                    return v > 0 ? <div key={s.key} style={{ height: `${(v / (totals[i] || 1)) * 100}%`, background: s.color }} /> : null
                  })}
                </div>
              </div>
            ))}
          </div>
          {/* x labels */}
          <div className="absolute inset-x-0 bottom-0 h-5" aria-hidden>
            {rows.map((r, i) =>
              i % every === 0 ? (
                <span key={i} className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap text-[11px] text-[var(--hv-text-3)]" style={{ left: `${((i + 0.5) / rows.length) * 100}%` }}>
                  {label(r)}
                </span>
              ) : null,
            )}
          </div>
          {hover != null && tip && rows[hover] && (
            <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2" style={{ left: `${((hover + 0.5) / rows.length) * 100}%` }}>
              <div className="pop-surface min-w-[160px] px-3 py-2 text-[12px]">{tip(rows[hover])}</div>
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
  const n = Math.max(points.length, second?.length ?? 0)
  if (n < 2) return null
  const max = Math.max(1, ...points, ...(second ?? []))
  const path = (vals: number[]) => {
    const pts = vals.map((v, i) => [(i / (n - 1)) * 100, 100 - (v / max) * 92] as const)
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
    return { line, area: `${line} L100,100 L0,100 Z` }
  }
  const a = path(points)
  const b = second ? path(second) : null
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label={label}>
      {b && (
        <>
          <path d={b.area} fill={secondColor} fillOpacity={0.08} />
          <path d={b.line} fill="none" stroke={secondColor} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </>
      )}
      <path d={a.area} fill={color} fillOpacity={0.14} />
      <path d={a.line} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
