/* GET /api/stats → achievements[] (verified against the running server). */

export type AchievementCategory = 'milestone' | 'solve' | 'rating' | 'streak' | 'daily' | 'special' | string

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: AchievementCategory
  target: number
  progress: number
  xp_reward: number
  unlocked_at: string | null
}

export interface AchievementsStatsResponse {
  ok: boolean
  solved: number
  totalXp: number
  streak: { current: number; best: number }
  achievements: Achievement[]
}
