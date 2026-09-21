import type { Problem } from '@/components/problems/types'

/* GET /api/bookmarks rows: problem columns + bookmark join + progress join */
export interface BookmarkedProblem extends Problem {
  bookmarked_at?: string
}

export interface BookmarksResponse {
  ok: boolean
  problems: BookmarkedProblem[]
  problemIds: number[]
}

/* Types for the submissions archive, verified against src/server.js handlers.
 * There is no global /api/submissions endpoint — history is assembled by
 * fanning out GET /api/activity/:date over a day range and merging rows. */

export interface ActivitySubmission {
  id: number
  verdict: string
  exec_time_ms: number
  language: string | null
  submitted_at: string
  title: string
  rating: number
  platform: string
  problem_id: string
}

export interface ActivityDayResponse {
  ok: boolean
  date: string
  stats: { solved: number; attempted: number; xp: number }
  submissions: ActivitySubmission[]
}

export interface ReplayRange {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

export interface ReplayEvent {
  t: number
  changes: { range: ReplayRange; text: string }[]
}

/* GET /api/code-replay/:id returns HTTP 200 with ok:false when missing */
export interface CodeReplayResponse {
  ok: boolean
  error?: string
  replay?: {
    id: number
    submission_id: number
    duration_ms: number
    created_at: string
    events: ReplayEvent[]
  }
}

export const VERDICT_OPTIONS = ['AC', 'WA', 'TLE', 'RE', 'CE'] as const

export const DAY_RANGES = [
  { id: 7, label: 'Last 7 days' },
  { id: 30, label: 'Last 30 days' },
  { id: 90, label: 'Last 90 days' },
] as const

/** YYYY-MM-DD for the local calendar day `offset` days ago. */
export function dayKey(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Apply one Monaco delta change to a line buffer. */
function applyChange(lines: string[], range: ReplayRange, text: string): string[] {
  const startLine = Math.max(1, Math.min(range.startLineNumber, lines.length))
  const endLine = Math.max(startLine, Math.min(range.endLineNumber, lines.length))
  const startCol = Math.max(1, range.startColumn)
  const endCol = Math.max(1, range.endColumn)

  const before =
    lines.slice(0, startLine - 1).join('\n') +
    (startLine > 1 ? '\n' : '') +
    (lines[startLine - 1] ?? '').slice(0, startCol - 1)
  const after =
    (lines[endLine - 1] ?? '').slice(endCol - 1) +
    (endLine < lines.length ? '\n' + lines.slice(endLine).join('\n') : '')
  return (before + text + after).split('\n')
}

/**
 * Reconstruct the final source text from recorded Monaco
 * onDidChangeModelContent deltas (see POST /api/code-replay in the catalog).
 */
export function reconstructCode(events: ReplayEvent[]): string {
  let lines: string[] = ['']
  for (const ev of events) {
    if (!ev?.changes?.length) continue
    // Apply later positions first so earlier offsets stay valid.
    const changes = [...ev.changes].sort(
      (a, b) =>
        b.range.startLineNumber - a.range.startLineNumber ||
        b.range.startColumn - a.range.startColumn,
    )
    for (const ch of changes) {
      if (!ch?.range) continue
      lines = applyChange(lines, ch.range, ch.text ?? '')
    }
  }
  return lines.join('\n')
}

const MONACO_LANG: Record<string, string> = {
  cpp: 'cpp',
  c: 'c',
  csharp: 'csharp',
  java: 'java',
  kotlin: 'kotlin',
  python: 'python',
  python3: 'python',
  pypy: 'python',
  javascript: 'javascript',
  node: 'javascript',
  typescript: 'typescript',
  go: 'go',
  rust: 'rust',
  ruby: 'ruby',
  php: 'php',
  swift: 'swift',
  scala: 'scala',
  haskell: 'haskell',
  perl: 'perl',
  lua: 'lua',
  r: 'r',
  dart: 'dart',
  bash: 'shell',
  sh: 'shell',
  sql: 'sql',
  javascript_node: 'javascript',
}

export function monacoLanguage(language: string | null | undefined): string {
  if (!language) return 'plaintext'
  return MONACO_LANG[language.toLowerCase()] ?? 'plaintext'
}
