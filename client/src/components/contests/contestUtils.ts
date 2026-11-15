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
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`
}

/** iCalendar text for one contest: the student's own calendar app reminds them. */
export function contestIcs(c: PlatformContest): string | null {
  if (c.startTime == null) return null
  const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const end = c.startTime + (c.durationSeconds ?? 7200) * 1000
  const esc = (t: string) => t.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NexoraGuru//Contests//EN',
    'BEGIN:VEVENT',
    `UID:${c.platform}-${c.startTime}@nexoraguru.in`,
    `DTSTAMP:${stamp(c.startTime)}`,
    `DTSTART:${stamp(c.startTime)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(c.name)}`,
    ...(c.url ? [`URL:${c.url}`, `DESCRIPTION:${esc(c.url)}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(c.name)} starts in 30 minutes`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
