export interface NexusResource {
  title: string
  url: string
}

export interface NexusNode {
  id: string
  zone: number
  name: string
  icon: string
  desc: string
  tags: string[]
  requires: string[]
  target: number
  x: number
  y: number
  difficulty: [number, number]
  xpReward: number
  resources: NexusResource[]
  solved: number
  progress: number
  unlocked: boolean
  completed: boolean
}

export interface NexusZone {
  level: number
  name: string
  color: string
  glow: string
  xpRequired: number
  probsRequired: number
  minR: number
  maxR: number
  unlocked: boolean
  locked: boolean
  completed: boolean
  current: boolean
  nodeCount: number
  nodesCompleted: number
  zoneProgress: number
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

export interface RiftLevel {
  level: number
  name: string
  badge: string
  xp: number
  minProblems: number
  minR: number
  maxR: number
  color: string
  glow: string
}

export interface NexusResponse {
  ok: boolean
  nodes: NexusNode[]
  zones: NexusZone[]
  player: RiftPlayer
  riftLevels: RiftLevel[]
}

export interface RoadmapProblem {
  id: number
  problem_id: string
  title: string
  rating: number
  platform: string
  tags: string
  url: string
  solve_status: string
  attempts: number
}

export interface RoadmapTopic {
  name: string
  desc: string
  tags: string[]
  problems: RoadmapProblem[]
  totalPool: number
  solvedInPool: number
}

export interface RoadmapLevel {
  level: number
  name: string
  color: string
  glow: string
  minR: number
  maxR: number
  xpRequired: number
  probsRequired: number
  unlocked: boolean
  current: boolean
  topics: RoadmapTopic[]
  totalProblems: number
  solvedCount: number
  progress: number
}

export interface RoadmapResponse {
  ok: boolean
  levels: RoadmapLevel[]
  player: RiftPlayer
  weekSeed: number
}

export interface SkillProblem {
  id: number
  problem_id: string
  title: string
  rating: number
  platform: string
  tags: string
  solve_status: string
  solved_at: string | null
}

export interface SkillProblemsResponse {
  ok: boolean
  problems: SkillProblem[]
  skill: NexusNode & { solvedCount?: number; totalAvailable?: number }
}

/* ── Progression-hub additions: GET /api/stats subset for streak + rank ladder ──
   NOTE: /api/stats returns allTitles in snake_case (min_xp/min_problems) —
   different from /api/performance's camelCase version. */

export interface StatsTitleTier {
  title: string
  badge: string
  min_xp: number
  min_problems?: number
  color: string
  glow: string
}

export interface NexusStatsResponse {
  ok: boolean
  solved: number
  totalXp: number
  streak: { current: number; best: number; lastWeek: { date: string; solved: number }[] }
  title: {
    current: StatsTitleTier
    next: (StatsTitleTier & { min_problems?: number }) | null
    xpToNext: number
    probsToNext: number
  }
  allTitles: StatsTitleTier[]
}

/** Alias kept for components written against the earlier local naming. */
export type LevelRoadmapResponse = RoadmapResponse
export type SkillNodeProblemsResponse = SkillProblemsResponse
