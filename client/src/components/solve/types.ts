/* Types for the solve view (verified against src/server.js handlers) */

export interface SolveProblem {
  id: number
  platform: string
  problem_id: string
  title: string
  url: string
  rating: number
  tags: string // JSON string
  category: string
  solve_status: string
  attempts: number | null
  xp_earned: number | null
  notes: string | null
}

export interface Testcase {
  id?: number
  label: string
  input: string
  expected_output: string
}

export interface SubmissionRow {
  id: number
  verdict: string
  exec_time_ms: number
  submitted_at: string
}

export interface ProblemDetailResponse {
  ok: boolean
  problem: SolveProblem
  testcases: Testcase[]
  submissions: SubmissionRow[]
}

export interface StatementSample {
  input: string
  output: string
}

export interface StatementResponse {
  ok: boolean
  statement: string
  inputSpec: string
  outputSpec: string
  note: string
  timeLimit: string
  memLimit: string
  samples: StatementSample[]
  platform: string
  source: 'local' | 'cache' | 'http' | 'live' | 'fallback' | string
}

/* GET /api/languages — bare array (envelope exception) */
export interface Language {
  id: string
  ext: string
  compiled: boolean
  label: string
  /** false when the hosted judge has no sandbox for it */
  available?: boolean
}

/* POST /api/run — quickRun object directly (envelope exception) */
export interface RunResult {
  ok: boolean
  verdict: 'OK' | 'CE' | 'RE' | 'TLE' | string
  output: string
  stderr: string
  timeMs: number
  error?: string
  /** Which sandbox ran this: 'wandbox' | 'godbolt' | 'kotlin' | 'local'. */
  engine?: string
  /** True when the result came back from the judge's cache instead of a fresh run. */
  cached?: boolean
}

export interface JudgeCaseResult {
  id?: number
  label: string
  input: string
  expected: string
  actual: string
  stderr: string
  timeMs: number
  verdict: string
  passed: boolean
  engine?: string
  cached?: boolean
}

/* POST /api/judge */
export interface JudgeResponse {
  ok: boolean
  verdict: 'AC' | 'WA' | 'TLE' | 'RE' | 'CE' | string
  compileError: string | null
  results: JudgeCaseResult[]
  engine?: string
}

/* POST /api/ai-fix */
export interface AiFixResponse {
  ok: boolean
  code?: string
  error?: string
}

/* POST /api/ai-chat */
export interface AiChatResponse {
  ok: boolean
  reply?: string
  error?: string
}

export const XP_BY_RATING = (rating: number): number => {
  if (rating >= 2200) return 150
  if (rating >= 2000) return 100
  if (rating >= 1800) return 80
  if (rating >= 1600) return 60
  if (rating >= 1400) return 40
  if (rating >= 1200) return 25
  if (rating >= 1000) return 15
  return 10
}

export function codeStorageKey(problemId: string | number, language: string): string {
  return `nexora:code:${problemId}:${language}`
}

export function loadStoredCode(problemId: string | number, language: string): string | null {
  try {
    return localStorage.getItem(codeStorageKey(problemId, language))
  } catch {
    return null
  }
}

export function storeCode(problemId: string | number, language: string, code: string): void {
  try {
    localStorage.setItem(codeStorageKey(problemId, language), code)
  } catch {
    /* storage full/unavailable — non-fatal */
  }
}

/* GET /api/custom-problems/:id — Workshop problem; samples/testcases/tags are JSON strings */
export interface CustomProblemDetail {
  /** Workshop problems have numeric ids; Learn problems use their slug. */
  id: number | string
  title: string
  statement?: string
  input_spec?: string
  output_spec?: string
  difficulty?: number
  tags?: string
  samples?: string
  testcases?: string
  time_limit?: string
  memory_limit?: string
  creator?: string | null
  /** Set on Nexora Learn problems: the lesson this problem belongs to. */
  learn?: {
    topic: string
    page: string
    /** Markdown write-up: intuition, approach, proof, complexity, pitfalls. */
    editorial?: string | null
    /** Verified solutions keyed by language (cpp, java, python, js, c). */
    solutions?: Partial<Record<'cpp' | 'java' | 'python' | 'js' | 'c', string>>
  }
}

export interface CustomProblemResponse {
  ok: boolean
  problem: CustomProblemDetail
}
