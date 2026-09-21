/** Shapes bound to /api/custom-problems and /api/contests/* (Workshop side). */

export interface Sample {
  input: string
  output: string
}

export interface Testcase {
  input: string
  expected_output: string
}

/** Row from GET /api/custom-problems — tags/samples/testcases are JSON STRINGS. */
export interface CustomProblem {
  id: number
  creator?: string | null
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
  created_at?: string
  updated_at?: string
}

export interface CustomProblemForm {
  title: string
  statement: string
  input_spec: string
  output_spec: string
  difficulty: number
  tags: string[]
  samples: Sample[]
  testcases: Testcase[]
  time_limit: string
  memory_limit: string
}

export interface CustomContestRow {
  id: number
  title: string
  description?: string
  type?: 'speed' | 'accuracy' | 'quiz' | string
  contest_code: string
  org_tag?: string
  start_time: string
  duration_mins?: number
  /** JSON string of custom problem ids */
  problems?: string
  max_participants?: number
  created_at?: string
  participant_count?: number
}

export function parseJson<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    return (parsed ?? fallback) as T
  } catch {
    return fallback
  }
}

export function emptyProblemForm(): CustomProblemForm {
  return {
    title: '',
    statement: '',
    input_spec: '',
    output_spec: '',
    difficulty: 1000,
    tags: [],
    samples: [{ input: '', output: '' }],
    testcases: [{ input: '', expected_output: '' }],
    time_limit: '2 seconds',
    memory_limit: '256 MB',
  }
}

export function problemToForm(p: CustomProblem): CustomProblemForm {
  return {
    title: p.title ?? '',
    statement: p.statement ?? '',
    input_spec: p.input_spec ?? '',
    output_spec: p.output_spec ?? '',
    difficulty: p.difficulty ?? 1000,
    tags: parseJson<string[]>(p.tags, []),
    samples: parseJson<Sample[]>(p.samples, []).length
      ? parseJson<Sample[]>(p.samples, [])
      : [{ input: '', output: '' }],
    testcases: parseJson<Testcase[]>(p.testcases, []).length
      ? parseJson<Testcase[]>(p.testcases, [])
      : [{ input: '', expected_output: '' }],
    time_limit: p.time_limit ?? '2 seconds',
    memory_limit: p.memory_limit ?? '256 MB',
  }
}

export function difficultyLabel(rating: number): string {
  if (rating < 1000) return 'Rookie'
  if (rating < 1200) return 'Easy'
  if (rating < 1500) return 'Medium'
  if (rating < 1800) return 'Hard'
  if (rating < 2100) return 'Expert'
  return 'Extreme'
}
