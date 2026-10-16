/*
  GATE platform API — the shared contract between the server (src/routes/gate-me.js)
  and the GATE pages. Every endpoint requires a signed-in user unless marked public;
  all per-user data is scoped to the session user on the server (never a client id).

  Error shape: non-2xx → { ok: false, error: string }.
*/
import { api } from '@/lib/api'

/* ── Shared types ────────────────────────────────────────────────────────── */

export type AttemptMode = 'practice' | 'test' | 'review' | 'daily' | 'cbt'
export type Outcome = 'correct' | 'wrong' | 'partial' | 'revealed' | 'skipped'

/** One answer submission. `response` is the option letter(s), a number, or text. */
export interface AttemptInput {
  questionId: string
  response: string | string[] | number | null
  /** Milliseconds spent on the question before submitting. */
  timeMs: number
  mode: AttemptMode
  /** When the student revealed the solution without answering. */
  revealed?: boolean
  /** Self-rated confidence 1–3 (used by spaced repetition). */
  confidence?: 1 | 2 | 3
  /** Test id when mode = 'test'. */
  testId?: string
}

export interface AttemptResult {
  outcome: Outcome
  /** Marks under GATE rules for this question (negative for wrong MCQ). */
  marks: number
  /** Spaced-repetition schedule after this attempt. */
  review: ReviewState
}

export interface ReviewState {
  /** ISO date (YYYY-MM-DD) the question is next due; null = not in the queue. */
  due: string | null
  intervalDays: number
  ease: number
  streak: number
}

export interface QuestionProgress {
  outcome?: Outcome
  attempts: number
  correct: number
  lastAt?: number
  bookmarked?: boolean
  collections?: string[]
  hasNote?: boolean
  review?: ReviewState
}

export interface SubjectStat {
  subject: string
  attempted: number
  correct: number
  accuracy: number
  avgTimeMs: number
  marksGained: number
  marksLost: number
}

export interface TopicStat extends SubjectStat {
  topic: string
}

export interface GateSummary {
  totals: {
    attempted: number
    correct: number
    accuracy: number
    avgTimeMs: number
    questionsInBank: number
    papersCompleted: number
    reviewDue: number
    bookmarks: number
    notes: number
  }
  streak: { current: number; best: number; todayDone: boolean }
  /** Last 365 days: YYYY-MM-DD → attempts that day. */
  activity: Record<string, number>
  bySubject: SubjectStat[]
  byTopic: TopicStat[]
  /** Accuracy per GATE year the student has practised. */
  byYear: { year: number; attempted: number; accuracy: number }[]
  /** Types: MCQ/MSQ/NAT/… */
  byType: { type: string; attempted: number; accuracy: number; avgTimeMs: number }[]
  /** Topics with ≥ 3 attempts, lowest accuracy first. */
  weakTopics: TopicStat[]
  /** Recent attempts, newest first (max 50). */
  recent: { questionId: string; outcome: Outcome; timeMs: number; at: number; mode: AttemptMode }[]
}

export interface QuestionStats {
  attempts: number
  /** Distinct users who attempted. */
  users: number
  accuracy: number | null
  avgTimeMs: number | null
  /** Option letter → share of responses (MCQ/MSQ). */
  optionShare: Record<string, number>
  /** 1 (easy) – 5 (hard), from global accuracy and time; null when < 5 attempts. */
  difficulty: number | null
}

export interface TestConfig {
  title?: string
  exam?: 'CSE' | 'DA'
  subjects?: string[]
  topics?: string[]
  years?: number[]
  papers?: string[]
  types?: string[]
  /** 1..5, from QuestionStats.difficulty (questions without stats count as 3). */
  difficulty?: [number, number]
  /** Prefer questions the user hasn't attempted / got wrong. */
  focus?: 'any' | 'unseen' | 'mistakes' | 'weak'
  count: number
  durationMin: number
  negativeMarking?: boolean
}

export interface GateTest {
  id: string
  title: string
  config: TestConfig
  questionIds: string[]
  createdAt: number
  submittedAt?: number
  result?: TestResult
}

export interface TestResult {
  score: number
  maxScore: number
  correct: number
  wrong: number
  skipped: number
  timeMs: number
  /** Per question: outcome, marks, time. */
  items: { questionId: string; outcome: Outcome; marks: number; timeMs: number }[]
  bySubject: SubjectStat[]
  /** Share of other submissions of a test with the same question set that this score beats (null if none). */
  percentile: number | null
}

export interface NoteEntry {
  questionId: string
  text: string
  updatedAt: number
}

export interface Collection {
  id: string
  name: string
  color?: string
  count: number
}

export interface StudyPlan {
  examDate: string | null
  hoursPerDay: number
  /** Subject id → priority 0 (skip) .. 3 (high). */
  priorities: Record<string, number>
  /** Days of the week available (0 = Sunday). */
  days: number[]
}

export interface LeaderboardRow {
  username: string
  displayName?: string
  avatar?: string
  attempted: number
  correct: number
  accuracy: number
  score: number
  rank: number
}

export interface TrendsData {
  /** subject → year → total marks of that subject in that year's papers (all sets averaged). */
  marksBySubjectYear: Record<string, Record<number, number>>
  /** subject → topic → question count across all years. */
  topicCounts: Record<string, Record<string, number>>
  years: number[]
}

/* ── Endpoints ───────────────────────────────────────────────────────────── */

export const gateApi = {
  /** POST /api/gate/attempts — record an answer; returns outcome, marks and new review state. */
  attempt: (a: AttemptInput) => api.post<{ ok: true } & AttemptResult>('/api/gate/attempts', a),

  /** GET /api/gate/me/summary — dashboard and analytics data. */
  summary: () => api.get<{ ok: true; summary: GateSummary }>('/api/gate/me/summary'),

  /** GET /api/gate/me/progress?ids=a,b — per-question progress (omit ids for all). */
  progress: (ids?: string[]) =>
    api.get<{ ok: true; progress: Record<string, QuestionProgress> }>(
      `/api/gate/me/progress${ids?.length ? `?ids=${encodeURIComponent(ids.join(','))}` : ''}`,
    ),

  /** POST /api/gate/me/import — one-time import of the old localStorage progress. */
  importLocal: (progress: Record<string, { outcome?: string; bookmarked?: boolean; at?: number }>) =>
    api.post<{ ok: true; imported: number }>('/api/gate/me/import', { progress }),

  /** Bookmarks + collections. */
  setBookmark: (questionId: string, on: boolean, collections?: string[]) =>
    api.put<{ ok: true }>(`/api/gate/me/bookmarks/${encodeURIComponent(questionId)}`, { on, collections }),
  collections: () => api.get<{ ok: true; collections: Collection[] }>('/api/gate/me/collections'),
  createCollection: (name: string, color?: string) =>
    api.post<{ ok: true; collection: Collection }>('/api/gate/me/collections', { name, color }),
  deleteCollection: (id: string) => api.delete<{ ok: true }>(`/api/gate/me/collections/${encodeURIComponent(id)}`),

  /** Notes (markdown, ≤ 10 000 chars). */
  note: (questionId: string) =>
    api.get<{ ok: true; note: NoteEntry | null }>(`/api/gate/me/notes/${encodeURIComponent(questionId)}`),
  saveNote: (questionId: string, text: string) =>
    api.put<{ ok: true; note: NoteEntry }>(`/api/gate/me/notes/${encodeURIComponent(questionId)}`, { text }),
  notes: () => api.get<{ ok: true; notes: NoteEntry[] }>('/api/gate/me/notes'),

  /** Spaced repetition: due question ids (oldest due first). */
  reviewQueue: (limit = 20) =>
    api.get<{ ok: true; due: string[]; dueCount: number; upcoming: Record<string, number> }>(
      `/api/gate/me/review?limit=${limit}`,
    ),

  /** Question-level community stats (public). */
  questionStats: (questionId: string) =>
    api.get<{ ok: true; stats: QuestionStats }>(`/api/gate/questions/${encodeURIComponent(questionId)}/stats`),

  /** Up to 6 questions on the same topic/tags (public). */
  similar: (questionId: string) =>
    api.get<{ ok: true; ids: string[] }>(`/api/gate/questions/${encodeURIComponent(questionId)}/similar`),

  /** Daily challenge: one question per day, the same for everyone (public). */
  daily: () => api.get<{ ok: true; date: string; questionId: string; solvedToday?: boolean }>('/api/gate/daily'),

  /** Custom / sectional tests. */
  createTest: (config: TestConfig) => api.post<{ ok: true; test: GateTest }>('/api/gate/tests', config),
  test: (id: string) => api.get<{ ok: true; test: GateTest }>(`/api/gate/tests/${encodeURIComponent(id)}`),
  submitTest: (
    id: string,
    responses: Record<string, string | string[] | number | null>,
    timeMs: Record<string, number>,
  ) => api.post<{ ok: true; result: TestResult }>(`/api/gate/tests/${encodeURIComponent(id)}/submit`, { responses, timeMs }),
  tests: () => api.get<{ ok: true; tests: GateTest[] }>('/api/gate/me/tests'),

  /** Study plan. */
  plan: () => api.get<{ ok: true; plan: StudyPlan | null }>('/api/gate/me/plan'),
  savePlan: (plan: StudyPlan) => api.put<{ ok: true; plan: StudyPlan }>('/api/gate/me/plan', plan),

  /** Leaderboard (public): period = week | month | all. */
  leaderboard: (period: 'week' | 'month' | 'all' = 'week') =>
    api.get<{ ok: true; rows: LeaderboardRow[]; me?: LeaderboardRow }>(`/api/gate/leaderboard?period=${period}`),

  /** Subject weightage trends over the years (public, computed from the bank). */
  trends: (exam: 'CSE' | 'DA' = 'CSE') => api.get<{ ok: true; trends: TrendsData }>(`/api/gate/trends?exam=${exam}`),
}

/* ── Routes (client) ─────────────────────────────────────────────────────── */

export const GATE_ROUTES = {
  home: '/gate',
  practice: '/gate/practice',
  notes: '/gate/notes',
  review: '/gate/review',
  daily: '/gate/daily',
  tests: '/gate/tests',
  test: (id: string) => `/gate/tests/${id}`,
  cbt: '/gate/cbt',
  analytics: '/gate/analytics',
  syllabus: '/gate/syllabus',
  planner: '/gate/planner',
  notebook: '/gate/notebook',
  leaderboard: '/gate/leaderboard',
} as const
