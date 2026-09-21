export interface StreakInfo {
  current: number
  best: number
  lastWeek: { date: string; solved: number }[]
}

export interface RiftPlayer {
  level: number
  xp: number
  name: string
  badge: string
  color: string
  glow: string
  xpInLevel: number
  xpForNext: number
  probsInLevel: number
  probsForNext: number
  xpGated: boolean
  probGated: boolean
}

export interface PerformanceResponse {
  ok: boolean
  total: number
  solved: number
  attempted: number
  totalXp: number
  submissions: number
  accuracy: number
  streak: StreakInfo
  level: RiftPlayer
  allTitles: { title: string; badge: string; minXp: number; minProblems: number; color: string; glow: string; level: number }[]
  ratingDist: { tier: string; count: number }[]
  platformDist: { platform: string; count: number }[]
  verdicts: { verdict: string; count: number }[]
  heatmap: { date: string; problems_solved: number; xp_earned: number }[]
  recent: {
    id: number
    verdict: string
    exec_time_ms: number
    memory_kb: number
    submitted_at: string
    language: string
    title: string
    problem_id: string
    platform: string
    rating: number
    tags: string
  }[]
  todayStats: { solved: number; attempted: number; xp: number }
  ratingClimb: { rating: number; date: string }[]
  solveSpeed: { bracket: string; avgAttempts: number; count: number; avgMinutes: number }[]
  langUsage: { language: string; count: number; acCount: number }[]
  weeklyProgress: { week: string; solved: number; xp: number; activeDays: number }[]
  tagAnalysis: { tag: string; solved: number; attempted: number; total: number; solveRate: number; maxRating: number; avgRating: number }[]
  recommendations: { tag: string; solveRate: number; problems: { id: number; title: string; problem_id: string; platform: string; rating: number; solve_status: string }[] }[]
  nextLevel: { level: number; name: string; color: string; xpNeeded: number; probsNeeded: number; daysEstimate: number } | null
  avgDailyXp: number
  avgDailySolves: number
  consistencyScore: number
  hourDist: { hour: number; total: number; ac: number }[]
  hardestSolved: { id: number; title: string; problem_id: string; platform: string; rating: number; attempts: number; solved_at: string }[]
  mostAttempted: { id: number; title: string; problem_id: string; platform: string; rating: number; attempts: number; solve_status: string }[]
  firstSolves: { bracket: string; firstDate: string; firstTitle: string }[]
}

export interface WeaknessResponse {
  ok: boolean
  analysis: { tag: string; solved: number; attempted: number; total: number; solveRate: number; strength: 'strong' | 'moderate' | 'weak' }[]
  recommendations: { tag: string; solveRate: number; problems: { id: number; title: string; problem_id: string; platform: string; rating: number; solve_status: string }[] }[]
}

/* ── Row-type aliases used by the analytics chart components ── */
export type FullPerformanceResponse = PerformanceResponse
export type RatingClimbPoint = PerformanceResponse['ratingClimb'][number]
export type SolveSpeedRow = PerformanceResponse['solveSpeed'][number]
export type LangUsageRow = PerformanceResponse['langUsage'][number]
export type WeeklyProgressRow = PerformanceResponse['weeklyProgress'][number]
export type TagAnalysisRow = PerformanceResponse['tagAnalysis'][number]
export type Recommendation = PerformanceResponse['recommendations'][number]
export type RecommendationProblem = Recommendation['problems'][number]
export type InsightProblem = PerformanceResponse['hardestSolved'][number] &
  Partial<PerformanceResponse['mostAttempted'][number]>
export type FirstSolve = PerformanceResponse['firstSolves'][number]
export type HourDistRow = PerformanceResponse['hourDist'][number]

/* Chart color constants — CSS variables from the Tailwind theme (never raw hex). */
export const VERDICT_COLORS: Record<string, string> = {
  AC: 'var(--color-success)',
  OK: 'var(--color-success)',
  WA: 'var(--color-destructive)',
  TLE: 'var(--color-warning)',
  RE: 'var(--color-accent)',
  CE: 'var(--color-info)',
  MLE: 'var(--color-cyan)',
}

export const TIER_COLORS: Record<string, string> = {
  Newbie: 'var(--color-foreground-faint)',
  Pupil: 'var(--color-success)',
  Specialist: 'var(--color-cyan)',
  Expert: 'var(--color-info)',
  'Candidate Master': 'var(--color-primary-bright)',
  Master: 'var(--color-warning)',
  Grandmaster: 'var(--color-accent)',
}

export const PLATFORM_COLORS: Record<string, string> = {
  codeforces: 'var(--color-info)',
  codechef: 'var(--color-warning)',
  atcoder: 'var(--color-success)',
  leetcode: 'var(--color-gold)',
  spoj: 'var(--color-cyan)',
  euler: 'var(--color-accent)',
}

export const CHART_PALETTE = [
  'var(--color-primary-bright)',
  'var(--color-cyan)',
  'var(--color-accent)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-info)',
  'var(--color-gold)',
]

export const AXIS_TICK = { fill: 'var(--color-foreground-faint)', fontSize: 11 }
