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
  /** Not needed for a subject's Master rank (projects by default). */
  optional?: boolean
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
  /** "dsa" for the solve-count engine, null for outline subjects. */
  engine?: string | null
  rankTitle?: string | null
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

/* ── The single web (GET /api/nexus/web) ── */

/** One node as the canvas draws it. s: 0 locked, 1 open, 2 mastered. */
export interface WebNode {
  id: string
  /** name */
  n: string
  /** zone level */
  z: number
  /** progress 0–100 */
  p: number
  s: 0 | 1 | 2
  /** same-subject prerequisites */
  req: string[]
  /** cross-subject prerequisites, "subject:id" */
  cx?: string[]
  /** kind when not a concept (lesson / project) */
  k?: string
  /** icon (semantic name or legacy DSA string) */
  i?: string
  /** GATE notes lessons it teaches (its course) */
  ls?: string[]
  /** 1: optional (projects by default) — not needed for Master */
  o?: number
  xp: number
  /** count label ("3/10 PYQs", "4/8") */
  c: string
  /** days since its PYQs were last answered right (-1: never) */
  ag?: number
  /** spaced-repetition interval reached, days */
  iv?: number
  /** studied in the last 24 h */
  rc?: number
  /** days since it was last studied (-1: never) */
  td?: number
}

export interface WebZone {
  level: number
  name: string
  color: string
  locked: boolean
  current: boolean
  completed: boolean
  nodeCount: number
  nodesCompleted: number
  zoneProgress: number
}

/** A subject's rank: a tier from its mastery and its own title. */
export interface SubjectRank {
  tier: string
  tierIndex: number
  title: string
  progress: number
  next: string | null
  /** the next tier, its threshold and about how many concepts away */
  toNext?: { tier: string; at: number; concepts: number | null } | null
  /** every core node mastered (Master, optional nodes skipped) */
  coreDone?: boolean
  coreLeft?: number | null
}

export interface WebStream {
  id: string
  name: string
  hue: string
  order: number
}

export interface WebCluster {
  id: string
  name: string
  short: string
  domain: string
  /** the stream it belongs to on the radial overview */
  stream: string
  gate?: { pyq: string | null; notes: string | null }
  description?: string
  order: number
  engine: string | null
  zones: WebZone[]
  nodes: WebNode[]
  rank?: SubjectRank
}

export interface WebBoardRow {
  rank: number
  username: string
  displayName: string
  avatar: string | null
  level: number
  score: number
}

export interface WebBoardResponse {
  ok: boolean
  scope: 'all' | 'week' | 'friends' | 'subject'
  rows: WebBoardRow[]
  me?: WebBoardRow
  subject?: NexusSubjectMeta
}

/** A goal route: a named set of subjects (content/nexus/_routes.json). */
export interface WebRoute {
  id: string
  name: string
  description: string
  subjects: string[]
}

/** GET /api/nexus/structure — static, versioned, cached on the device. */
export interface NexusWebStructure {
  ok: boolean
  version: string
  routes: WebRoute[]
  /** streams in their order around the radial overview */
  streams?: WebStream[]
  clusters: {
    id: string
    name: string
    short: string
    domain: string
    stream?: string
    order: number
    engine: string | null
    /** the GATE subject behind it (PYQ bank id, notes id) */
    gate?: { pyq: string | null; notes: string | null }
    description?: string
    zones: { level: number; name: string; color: string }[]
    nodes: { id: string; n: string; z: number; req: string[]; cx?: string[]; k?: string; i?: string; ls?: string[]; o?: number; xp: number }[]
  }[]
}

/** GET /api/nexus/web — the reader's numbers, in structure order. */
export interface NexusWebState {
  ok: boolean
  user?: string
  /** The unified web rank. */
  player: RiftPlayer
  /** The DSA-only Rift level (the DSA path's zone unlocks). */
  dsaPlayer?: RiftPlayer
  riftLevels: RiftLevel[]
  ranks: Record<string, SubjectRank>
  /** this week so far */
  week?: { xp: number; concepts: number; since: number }
  state: {
    version: string
    subjects: Record<
      string,
      {
        /** [done, count, progress %, flags: 1 locked | 2 current | 4 completed] */
        zones: [number, number, number, number][]
        /** [progress %, state, count label, days since review, interval, recent] */
        nodes: [number, 0 | 1 | 2, string, number, number, number, number?][]
      }
    >
  }
}

export interface NexusNodeResponse {
  ok: boolean
  node: NexusNode
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
  /** web rank only: XP and about how many concepts to the next level */
  xpToNext?: number
  conceptsToNext?: number
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
  subjectRank?: SubjectRank
  /** The unified web rank (the DSA path keeps `player` for its zone unlocks). */
  webPlayer?: RiftPlayer
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
