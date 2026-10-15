/* Time formatting for the admin panel. */

export function when(ts: number | string | null | undefined): string {
  if (ts == null || ts === '') return '—'
  const d = new Date(typeof ts === 'number' ? ts : ts)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function ago(ts: number | string | null | undefined): string {
  if (ts == null || ts === '') return '—'
  const t = typeof ts === 'number' ? ts : Date.parse(ts)
  if (!Number.isFinite(t)) return '—'
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 0) {
    const f = -s
    if (f < 3600) return `in ${Math.max(1, Math.round(f / 60))}m`
    if (f < 86400) return `in ${Math.round(f / 3600)}h`
    return `in ${Math.round(f / 86400)}d`
  }
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d ago`
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
