export interface NexusResource {
  title: string
  url: string
}

/** A prerequisite / unlock in another subject, shown as a chip. */
export interface CrossLink {
  subject: string
  subjectShort: string
  subjectName: string
  id: string
  name: string
  completed: boolean
  progress: number
}

/** How a subject node's mastery is measured (absent on DSA nodes). */
export interface NodeMetric {
  pyq: { pool: number; target: number; correct: number; attempted: number; accuracy: number | null } | null
  lessons: { done: number; total: number; subject: string; ids: string[] } | null
}

export interface NexusNode {
  id: string
  /** Subject id ("dsa" for the competitive-programming tree). */
  subject?: string
  /** concept | lesson | project (subjects only). */
  kind?: string
  /** Row inside the zone tier (subjects lay out in several rows). */
  row?: number
  metric?: NodeMetric
  crossRequires?: CrossLink[]
  crossUnlocks?: CrossLink[]
  /** All cross-subject prerequisites mastered. */
  crossReady?: boolean
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
  /** Rows of nodes in this zone tier. */
  rows?: number
}

export interface NexusSubjectMeta {
  id: string
  name: string
  short: string
  group: string
  order: number
  icon: string
  color: string
  description: string
  pyqSubject?: string | null
  notesSubject?: string | null
}

export interface NexusSubjectSummary extends NexusSubjectMeta {
  nodeCount: number
  zoneCount: number
  completed: number
  unlocked: number
  progress: number
  xpEarned: number
  xpTotal: number
  crossLinks: number
  /** subject id → number of skills here that need a skill there. */
  needs: Record<string, number>
}

export interface NexusPyq {
  id: string
  paper: string
  year: number | null
  marks: number | null
  type: string
  topic: string
  status: 'new' | 'attempted' | 'solved'
}

export interface NexusPyqsResponse {
  ok: boolean
  total: number
  questions: NexusPyq[]
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
  subject?: NexusSubjectMeta
  subjects?: NexusSubjectSummary[]
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
