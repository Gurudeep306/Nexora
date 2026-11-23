/* Types for the solve view (verified against src/server.js handlers) */

export interface SolveProblem {
  /** Topic ids (src/topics.js), or their JSON text for a Workshop problem. */
  topics?: string[] | string
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
  language?: string
  /** Tests passed out of tests run (null for old rows). */
  passed?: number | null
  total?: number | null
}

/** Your record on one problem (all your submissions, not only the last 20). */
export interface ProblemAnalysis {
  attempts: number
  accepted: number
  languages: number
  firstAt: string
  firstAcAt: string | null
  triesToAccept: number | null
  minutesToAccept: number | null
  bestMs: number | null
}

export interface ProblemDetailResponse {
  ok: boolean
  problem: SolveProblem
  testcases: Testcase[]
  submissions: SubmissionRow[]
  analysis?: ProblemAnalysis | null
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
  source: 'local' | 'cache' | 'http' | 'live' | 'fallback' | 'unavailable' | string
  /** The judge wouldn't give its statement to other sites: read it there. */
  unavailable?: boolean
  /** The judge is slow: the server is still fetching it and will keep it for next time. */
  pending?: boolean
  url?: string
  /** Details beyond the HTML, when the source provides them. */
  extra?: StatementExtra
}

export interface StatementExtra {
  /** NexoraGuru's own problems: the written solution (shown after "give it a real try"). */
  solution?: { editorial: string | null; solutions: Partial<Record<'cpp' | 'java' | 'python' | 'javascript' | 'c', string>> } | null
  /** 'function' (LeetCode: write a method), 'answer' (Project Euler: one number) — default stdin. */
  kind?: 'stdin' | 'function' | 'answer'
  interactive?: boolean
  /** Where the text came from when it isn't the judge's own page (with its licence). */
  source?: { name: string; url: string; license: string; note?: string }
  /** The statement mentions a picture the copy we have doesn't include. */
  figures?: boolean
  /** The text was read out of the judge's PDF (the PDF is still shown, folded). */
  fromPdf?: boolean
  /** Non-standard input/output files (old Codeforces rounds). */
  files?: { input?: string; output?: string }
  examples?: { input: string; output: string; explanation?: string }[]
  /** Starter code by language slug (LeetCode: cpp, java, python3, javascript …). */
  snippets?: Record<string, string>
  tags?: string[]
  difficulty?: string
  pdf?: string
  points?: number
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
  /** Which runner answered: 'piston' (or 'piston2', … for our backup servers) | 'wandbox' | 'godbolt' | 'kotlin' | 'paiza' | 'local'. */
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
  /** false when the verdict did not count toward progress (e.g. no stored tests) */
  recorded?: boolean
  /** Explanation when nothing could be judged */
  message?: string
  /** On Accepted: the XP this solve earned and the level before and after. */
  xp?: XpReport
  /**
   * Platform problems: what the verdict rests on. `full` = the judge's own
   * tests ran (only Codeforces publishes them, via an open dataset); otherwise
   * only the examples and your own tests did. `pending` = those tests are
   * being fetched now (submit again shortly).
   */
  coverage?: { full: boolean; official: number; judge: string; url: string | null; pending?: boolean; failed?: boolean; /** Checked on the NexoraGuru benchmark (examples, corner cases, verified AI tests): its size. */ benchmark?: number }
  /** Sent with contest_id: whether this run counted in that hosted contest. */
  contest?: { counted: boolean; reason?: string; contestId?: number; item?: number }
}

export interface LevelState {
  level: number
  xp: number
  name: string
  badge: string
  xpInLevel: number
  xpForNext: number
  probsInLevel: number
  probsForNext: number
  xpGated: boolean
  probGated: boolean
}

export interface XpReport {
  gainedXp: number
  /** A full check passed for the first time: the problem is now solved. */
  firstSolve: boolean
  /** Only the examples ran: XP counts, but the problem shows "Passed the examples", not solved. */
  examplesOnly?: boolean
  /** Points follow the tests passed: of the problem's samples and official tests (never your own), how many passed. */
  partial?: { passed: number; total: number; share: number; ofXp: number } | null
  before: LevelState
  after: LevelState
  solved: number
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
  /** Set on NexoraGuru Learn problems: the lesson this problem belongs to. */
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

/** A runner's name for people (the judge reports an engine id). */
const ENGINE_NAMES: Record<string, string> = {
  wandbox: 'Wandbox',
  godbolt: 'Compiler Explorer',
  kotlin: 'Kotlin Playground',
  paiza: 'Paiza.io',
  piston: 'Nexora runner',
  local: 'local judge',
}
export function engineLabel(engine: string): string {
  const own = /^piston(\d+)$/.exec(engine)
  return ENGINE_NAMES[engine] ?? (own ? `Nexora runner ${own[1]}` : engine)
}
