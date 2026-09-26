import type { PlatformContest } from "./types"

const LIVE_PHASES = new Set(['RUNNING', 'CODING'])
const UPCOMING_PHASES = new Set(['BEFORE', 'PENDING'])

export function contestBucket(c: PlatformContest): 'live' | 'upcoming' | 'past' {
  if (LIVE_PHASES.has(String(c.phase).toUpperCase())) return 'live'
  if (UPCOMING_PHASES.has(String(c.phase).toUpperCase())) return 'upcoming'
  return 'past'
}

export function fmtDuration(secs?: number | null): string {
  if (!secs || secs <= 0) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.round((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m > 0 ? '${m}m' : ''}`.trim() : '${m}m'
}