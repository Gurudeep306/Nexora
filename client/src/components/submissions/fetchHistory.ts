import { api } from '@/lib/api'

export interface SubmissionRow {
  id: number
  verdict: string
  exec_time_ms: number
  memory_kb?: number
  language?: string
  submitted_at: string
  title: string
  rating: number
  platform: string
  problem_id: string
}

interface PerfSlice {
  heatmap?: { date: string }[]
  recent?: SubmissionRow[]
}

interface ActivitySlice {
  ok: boolean
  submissions?: SubmissionRow[]
}

/** Normalize SQLite `YYYY-MM-DD HH:MM:SS` (UTC) and ISO strings to a Date. */
export function parseSubmittedAt(s: string): Date {
  if (s.includes(' ')) return new Date(s.replace(' ', 'T') + 'Z')
  return new Date(s)
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx]!)
    }
  })
  await Promise.all(workers)
  return out
}

/**
 * The server has no paginated submissions endpoint, so the full history is
 * assembled from /api/performance (latest 20) plus /api/activity/:date for
 * every day that has recorded activity (heatmap, capped at 120 days).
 */
export async function fetchSubmissionHistory(): Promise<SubmissionRow[]> {
  const perf = await api.get<PerfSlice>('/api/performance')
  const byId = new Map<number, SubmissionRow>()

  for (const r of perf.recent ?? []) {
    if (typeof r.id === 'number') byId.set(r.id, { ...r })
  }

  const today = new Date().toISOString().slice(0, 10)
  const dates = Array.from(new Set([...(perf.heatmap ?? []).map((h) => h.date), today]))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 120)

  const days = await mapLimit(dates, 6, (date) =>
    api.get<ActivitySlice>(`/api/activity/${date}`).catch((): ActivitySlice => ({ ok: false })),
  )

  for (const day of days) {
    for (const s of day.submissions ?? []) {
      if (typeof s.id !== 'number') continue
      const prev = byId.get(s.id)
      byId.set(s.id, {
        ...s,
        memory_kb: s.memory_kb ?? prev?.memory_kb,
        language: s.language ?? prev?.language,
      })
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => parseSubmittedAt(b.submitted_at).getTime() - parseSubmittedAt(a.submitted_at).getTime(),
  )
}
