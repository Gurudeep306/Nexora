/* Shared problem-domain types (verified against src/server.js handlers) */

export interface Problem {
  id: number
  platform: string
  problem_id: string
  title: string
  url: string
  rating: number
  tags: string // JSON string, e.g. '["dp","math"]'
  category: string
  solve_status: 'solved' | 'attempted' | 'unsolved' | string
  attempts: number | null
  xp_earned: number | null
  solved_at: string | null
  notes?: string
}

export interface ProblemsResponse {
  ok: boolean
  total: number
  problems: Problem[]
  limit: number
  offset: number
}

export interface BookmarksResponse {
  ok: boolean
  problems: Problem[]
  problemIds: number[]
}

export interface TagsResponse {
  ok: boolean
  tags: string[]
}

export interface AiFoundProblem {
  problem: Problem
  reason: string
}

export interface AiFindResponse {
  ok: boolean
  understanding: string
  matchedTags: string[]
  platform: string
  status: string
  minRating: number | null
  maxRating: number | null
  count: number
  results: AiFoundProblem[]
  cached?: boolean
  error?: string
}

export const PLATFORM_OPTIONS = [
  'codeforces',
  'codechef',
  'atcoder',
  'leetcode',
  'spoj',
  'euler',
] as const

export const DIFFICULTY_BANDS = [
  { id: 'all', label: 'All difficulties', min: undefined, max: undefined },
  { id: 'easy', label: 'Easy (< 1200)', min: undefined, max: 1199 },
  { id: 'medium', label: 'Medium (1200–1599)', min: 1200, max: 1599 },
  { id: 'hard', label: 'Hard (1600–1899)', min: 1600, max: 1899 },
  { id: 'elite', label: 'Elite (1900+)', min: 1900, max: undefined },
] as const

export type DifficultyBandId = (typeof DIFFICULTY_BANDS)[number]['id']

export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  }
}
