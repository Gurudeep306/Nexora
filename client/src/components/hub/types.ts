/* Response types for GET /api/stats and GET /api/performance (verified against src/server.js) */

export interface RiftLevel {
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

export interface PlayerTitleTier {
  title: string
  badge: string
  min_xp: number
  min_problems?: number
  color: string
  glow: string
}

export interface PlayerTitle {
  current: PlayerTitleTier
  next: PlayerTitleTier | null
  xpToNext: number
  probsToNext: number
}

export interface StreakInfo {
  current: number
  best: number
  lastWeek: { date: string; solved: number }[]
}

export interface RecentSubmission {
  id: number
  verdict: string
  exec_time_ms: number
  submitted_at: string
  title: string
  problem_id: string
  platform: string
  rating: number
  language?: string
}

export interface DailyChallenge {
  id: number
  date: string
  problem_rowid: number
  difficulty: 'easy' | 'medium' | 'hard' | string
  bonus_xp: number
  completed: number
  completed_at: string | null
  title: string
  problem_id: string
  platform: string
  rating: number
  url: string
  tags: string
}

export interface StatsResponse {
  ok: boolean
  total: number
  solved: number
  attempted: number
  totalXp: number
  submissions: number
  accuracy: number
  ratingDist: { tier: string; count: number }[]
  platformDist: { platform: string; count: number }[]
  streak: StreakInfo
  level: RiftLevel
  title: PlayerTitle
  heatmap: { date: string; problems_solved: number; xp_earned: number }[]
  recent: RecentSubmission[]
  verdicts: { verdict: string; count: number }[]
  dailyChallenges: DailyChallenge[]
  todayStats: { solved: number; attempted: number; xp: number }
}

export interface WeeklyProgressPoint {
  week: string
  solved: number
  xp: number
  activeDays: number
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
  level: RiftLevel
  recent: RecentSubmission[]
  todayStats: { solved: number; attempted: number; xp: number }
  weeklyProgress: WeeklyProgressPoint[]
  nextLevel: {
    level: number
    name: string
    color: string
    xpNeeded: number
    probsNeeded: number
    daysEstimate: number | null
  } | null
  avgDailyXp: number
  avgDailySolves: number
  consistencyScore: number
}
