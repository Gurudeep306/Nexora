/* Formatting and small derivations shared by the GATE insight pages. */

/** Local YYYY-MM-DD. */
export function dayKey(d: Date | number = new Date()): string {
  const x = typeof d === 'number' ? new Date(d) : d
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1)
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Whole days from today to an ISO date (null when unset/invalid). */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = parseDay(iso)
  if (Number.isNaN(t.getTime())) return null
  const today = parseDay(dayKey())
  return Math.round((t.getTime() - today.getTime()) / 86_400_000)
}

/** Accuracy may arrive as 0..1 or 0..100; always return 0..100. */
export function pct(v: number | null | undefined): number {
  if (v == null || Number.isNaN(v)) return 0
  return Math.round(v <= 1 ? v * 100 : v)
}

export function fmtPct(v: number | null | undefined, attempted = 1): string {
  return attempted > 0 ? `${pct(v)}%` : '—'
}

export function fmtTime(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export function fmtMarks(n: number): string {
  const r = Math.round(n * 100) / 100
  return `${r > 0 ? '+' : ''}${r}`
}

export function greeting(d = new Date()): string {
  const h = d.getHours()
  return h < 5 ? 'Burning the midnight oil' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/* ── Mastery (Khan Academy style) ───────────────────────────────────────── */

export type MasteryLevel = 0 | 1 | 2 | 3 | 4

export const MASTERY: { level: MasteryLevel; label: string; hint: string }[] = [
  { level: 0, label: 'Not started', hint: 'No attempts yet' },
  { level: 1, label: 'Attempted', hint: 'Started, below 50% or too few attempts' },
  { level: 2, label: 'Familiar', hint: '≥ 50% accuracy over 3+ attempts' },
  { level: 3, label: 'Proficient', hint: '≥ 70% accuracy over 5+ attempts' },
  { level: 4, label: 'Mastered', hint: '≥ 85% accuracy over 8+ attempts' },
]

export function masteryOf(attempted: number, accuracy: number | null | undefined): MasteryLevel {
  const a = pct(accuracy)
  if (!attempted) return 0
  if (attempted >= 8 && a >= 85) return 4
  if (attempted >= 5 && a >= 70) return 3
  if (attempted >= 3 && a >= 50) return 2
  return 1
}

/** 0..1 mastery score for rings: accuracy weighted by confidence in the sample size. */
export function masteryScore(attempted: number, accuracy: number | null | undefined): number {
  if (!attempted) return 0
  const conf = Math.min(1, attempted / 10)
  return (pct(accuracy) / 100) * (0.4 + 0.6 * conf)
}

export function titleCase(s: string): string {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Plain one-line preview of question text (markdown/LaTeX stripped). */
export function snippet(text: string | undefined, max = 140): string {
  if (!text) return ''
  const t = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\$\$?([^$]*)\$\$?/g, '$1')
    .replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[*_`#>{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

export function timeAgo(at: number | undefined): string {
  if (!at) return ''
  const s = Math.max(0, (Date.now() - at) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  const d = Math.floor(s / 86400)
  if (d < 30) return `${d}d ago`
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
