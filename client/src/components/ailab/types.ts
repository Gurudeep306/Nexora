/* Shared types + parsing helpers for the AI Lab (bound to src/routes/learning.js). */

export type AiProblemStatus = 'unsolved' | 'in-progress' | 'solved'

export interface AiProblem {
  id: number
  category: string
  title: string
  description: string
  difficulty: string
  tags: string // JSON string: string[]
  starter_code: string // contains literal "\n" sequences — unescape before use
  solution_approach: string
  hints: string // JSON string: string[]
  resources: string // JSON string: {title,url}[]
  input_format: string
  output_format: string
  constraints: string
  samples: string // JSON string: {input,output}[]
  created_at?: string
  status?: AiProblemStatus
  progress?: { status: AiProblemStatus; notes: string | null } | null
}

export interface AiStats {
  total: number
  solved: number
  inProgress: number
  byCategory: { category: string; total: number; solved: number }[]
}

export interface AiSample {
  input: string
  output: string
}

/** POST /api/run — envelope exception: quickRun result returned directly. */
export interface RunResult {
  ok: boolean
  verdict: 'OK' | 'CE' | 'RE' | 'TLE'
  output: string
  stderr: string
  timeMs: number
  error?: string
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  ts: number
  visualization?: any
}

export interface BattleStart {
  battleId: number
  aiTimeMs: number
  rating: number
}

export interface BattleRow {
  id: number
  problem_rowid: number
  ai_time_ms: number
  player_time_ms: number | null
  player_won: 0 | 1 | null
  played_at: string
}

export const AI_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'ml', label: 'ML' },
  { id: 'dl', label: 'Deep Learning' },
  { id: 'nlp', label: 'NLP' },
  { id: 'cv', label: 'Vision' },
  { id: 'genai', label: 'GenAI' },
  { id: 'rl', label: 'RL' },
] as const

export function parseJsonList<T>(raw: string | null | undefined, fallback: T[] = []): T[] {
  if (!raw) return fallback
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? (v as T[]) : fallback
  } catch {
    return fallback
  }
}

/** starter_code / format fields are stored with literal backslash-n sequences. */
export function unescapeCode(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\\n/g, '\n')
}

/** Friendly message for AI endpoints; 429 = aiLimiter (20 req/min). */
export function aiErrorMessage(err: unknown): { title: string; hint?: string } {
  const status = (err as { status?: number })?.status
  const msg = (err as Error)?.message ?? 'AI request failed'
  if (status === 429) return { title: 'AI rate limit reached', hint: 'The tutor allows 20 requests/min — wait a few seconds and retry.' }
  if (status === 500 && /GROQ|GEMINI/i.test(msg)) return { title: 'AI provider not configured', hint: msg }
  return { title: 'AI request failed', hint: msg }
}
