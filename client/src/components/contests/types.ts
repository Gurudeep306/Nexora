/** Shapes bound to GET /api/contests (live scrape) and the custom-contest endpoints. */

export type ContestPhase = 'RUNNING' | 'CODING' | 'BEFORE' | 'PENDING' | 'FINISHED' | string

/** Platform contest row from GET /api/contests — startTime is epoch MILLISECONDS. */
export interface PlatformContest {
  platform: string
  name: string
  url?: string
  startTime?: number | null
  durationSeconds?: number | null
  phase: ContestPhase
}

/** Custom (user-hosted) contest row from /api/contests/* — note snake_case + start_time ISO string. */
export interface CustomContest {
  id: number
  creator: string
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

export interface ContestParticipant {
  username: string
  score: number
  joined_at?: string
}

export interface CustomContestDetail {
  contest: CustomContest
  participants: ContestParticipant[]
  isOwner: boolean
}

export function contestEndMs(c: CustomContest): number {
  const start = new Date(c.start_time).getTime()
  return start + (c.duration_mins ?? 60) * 60_000
}

export function contestPhase(c: CustomContest, now: number): 'upcoming' | 'live' | 'ended' {
  const start = new Date(c.start_time).getTime()
  const end = contestEndMs(c)
  if (now < start) return 'upcoming'
  if (now <= end) return 'live'
  return 'ended'
}
