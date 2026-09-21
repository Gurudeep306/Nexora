/** Shared API shapes for the social domain (bound to /api/friends, /api/messages, /api/rooms, /api/leaderboard). */

export interface Friend {
  username: string
  display_name?: string | null
  avatar?: string | null
  status?: 'online' | 'offline' | string
  last_seen?: string | null
  friends_since?: string | null
}

export interface FriendRequest {
  id: number
  username: string
  display_name?: string | null
  avatar?: string | null
  created_at?: string
}

export interface SearchResultUser {
  username: string
  display_name?: string | null
  avatar?: string | null
  avatar_url?: string | null
  status?: string
  last_seen?: string | null
  role?: string
}

export interface Message {
  id: number
  from_user: string
  to_user: string
  content: string
  read: 0 | 1 | number
  created_at: string
}

/** Reactions are in-memory only on the server: { emoji: [usernames] } */
export type Reactions = Record<string, string[]>

export interface UnreadCount {
  from_user: string
  count: number
}

export interface Room {
  id: string
  name: string
  creator: string
  creator_name?: string | null
  creator_avatar?: string | null
  problem_id?: number | null
  problem_title?: string | null
  problem_rating?: number | null
  problem_platform?: string | null
  max_members?: number
  is_voice?: 0 | 1 | number
  status?: string
  created_at?: string
  member_count?: number
  /** present on GET /api/rooms/:id */
  members?: string[]
}

export interface RoomMessage {
  id: number
  room_id: string
  username: string
  content: string
  created_at: string
  display_name?: string | null
  avatar?: string | null
}

export interface LeaderboardRow {
  username: string
  display_name?: string | null
  avatar?: string | null
  avatar_url?: string | null
  role?: string
  created_at?: string
  total_xp: number
  total_solved: number
  best_streak?: number
}

export type LeaderboardType = 'xp' | 'solved' | 'streak'

/** Avatar helper: legacy `avatar` column is an icon key, `avatar_url` is an uploaded image path. */
export function avatarSrc(
  u: { avatar_url?: string | null; avatar?: string | null } | null | undefined,
): string | undefined {
  return u?.avatar_url ?? undefined
}

/** GET /api/feed/:username — own + accepted friends' activity, newest first (max 50) */
export interface FeedRow {
  id: number
  username: string
  type: string
  content: string
  problem_id: number | null
  created_at: string
  display_name?: string | null
  avatar?: string | null
  problem_title?: string | null
  problem_rating?: number | null
  problem_platform?: string | null
}
