import type { WeeklyProgressRow } from './types'

/** SQLite's strftime('%Y-W%W') for a date: the year and the Monday-based week number (00–53). */
export function weekKey(d: Date): string {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1)
  const yday = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 86400000)
  const mondayBased = (d.getUTCDay() + 6) % 7
  const w = Math.floor((yday + 7 - mondayBased) / 7)
  return `${d.getUTCFullYear()}-W${String(w).padStart(2, '0')}`
}

/**
 * One plain sentence about this week from real data, e.g. "You solved 14
 * problems this week, 4 more than last week." Null when there is nothing
 * to say yet. `today` is passed in so the caller decides when "now" is.
 */
export function weekSentence(weeks: WeeklyProgressRow[] | undefined, today: Date): string | null {
  if (!weeks?.length) return null
  const thisKey = weekKey(today)
  const lastWeek = new Date(today)
  lastWeek.setUTCDate(lastWeek.getUTCDate() - 7)
  const lastKey = weekKey(lastWeek)
  const n = weeks.find((w) => w.week === thisKey)?.solved ?? 0
  const p = weeks.find((w) => w.week === lastKey)?.solved ?? 0
  if (!n && !p) return null
  if (!n) return `No solves yet this week. Last week you solved ${p}.`
  const head = `You solved ${n} ${n === 1 ? 'problem' : 'problems'} this week`
  const d = n - p
  if (d === 0) return `${head}, the same as last week.`
  return `${head}, ${Math.abs(d)} ${d > 0 ? 'more' : 'fewer'} than last week.`
}
