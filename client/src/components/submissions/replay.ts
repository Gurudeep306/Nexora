import { api } from '@/lib/api'

interface ReplayChange {
  range: {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  }
  text: string
}

export interface ReplayEvent {
  t: number
  changes: ReplayChange[]
}

interface ReplayResponse {
  ok: boolean
  error?: string
  replay?: {
    id?: number
    submission_id?: number
    language?: string
    duration_ms?: number
    events?: ReplayEvent[] | string
  }
}

/** Rebuild source code by replaying Monaco change deltas in order. */
export function replayToCode(events: ReplayEvent[]): string {
  let lines: string[] = ['']
  for (const ev of events) {
    for (const ch of ev.changes ?? []) {
      const sl = Math.max(1, ch.range.startLineNumber)
      const el = Math.max(sl, ch.range.endLineNumber)
      const before = (lines[sl - 1] ?? '').slice(0, Math.max(0, ch.range.startColumn - 1))
      const after = (lines[el - 1] ?? '').slice(Math.max(0, ch.range.endColumn - 1))
      const parts = (ch.text ?? '').split('\n')
      const replacement =
        parts.length === 1
          ? [before + parts[0]! + after]
          : [before + parts[0]!, ...parts.slice(1, -1), parts[parts.length - 1]! + after]
      lines.splice(sl - 1, el - sl + 1, ...replacement)
    }
  }
  return lines.join('\n')
}

export interface SubmissionCode {
  code: string
  language?: string
  durationMs?: number
}

/** Returns reconstructed code for a submission, or null when no replay exists. */
export async function fetchSubmissionCode(submissionId: number): Promise<SubmissionCode | null> {
  const res = await api.get<ReplayResponse>(`/api/code-replay/${submissionId}`)
  if (!res.ok || !res.replay) return null
  const raw = res.replay.events
  const events: ReplayEvent[] = typeof raw === 'string' ? (JSON.parse(raw) as ReplayEvent[]) : (raw ?? [])
  if (events.length === 0) return null
  return {
    code: replayToCode(events),
    language: res.replay.language,
    durationMs: res.replay.duration_ms,
  }
}
