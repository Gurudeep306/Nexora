/* Types for profile + settings pages, verified against src/routes/auth.js and src/server.js */

import type { PlayerTitle, RiftLevel, StreakInfo } from '@/components/hub/types'

export interface ProfileUser {
  username: string
  display_name: string | null
  avatar: string | null
  avatar_url: string | null
  bio: string | null
  status: 'online' | 'offline' | string
  role: 'member' | 'admin' | 'teacher' | string
  auth_provider: string | null
  email?: string | null
  last_seen: string | null
  created_at: string
}

export interface ActivityFeedRow {
  id: number
  username: string
  type: string
  content: string
  problem_id: number | null
  created_at: string
}

/* GET /api/user/profile/:username?viewer=… */
export interface ProfileResponse {
  ok: boolean
  user: ProfileUser
  stats: { solved: number; totalXp: number }
  level: RiftLevel
  streak: number
  friendStatus: 'none' | 'friends' | 'pending_sent' | 'pending_received'
  friendCount: number
  activity: ActivityFeedRow[]
  memberSince: string
}

/* GET /api/settings — flat string map, global table */
export interface SettingsResponse {
  ok: boolean
  settings: Record<string, string>
}

/* GET /api/languages — envelope exception: bare array */
export interface LanguageOption {
  id: string
  ext: string
  compiled: boolean
  label: string
}

/* PUT /api/user/profile response */
export interface UpdateProfileResponse {
  ok: boolean
  user: ProfileUser
  usernameChanged: boolean
}

/* POST /api/user/avatar response */
export interface AvatarUploadResponse {
  ok: boolean
  avatar_url: string
}

export interface StatsForProfile {
  ok: boolean
  total: number
  solved: number
  attempted: number
  totalXp: number
  submissions: number
  accuracy: number
  streak: StreakInfo
  title: PlayerTitle
  verdicts: { verdict: string; count: number }[]
  platformDist: { platform: string; count: number }[]
}

export const PLATFORM_HANDLE_KEYS = [
  { key: 'cf_handle', label: 'Codeforces', url: (h: string) => `https://codeforces.com/profile/${h}` },
  { key: 'cc_handle', label: 'CodeChef', url: (h: string) => `https://www.codechef.com/users/${h}` },
  { key: 'ac_handle', label: 'AtCoder', url: (h: string) => `https://atcoder.jp/users/${h}` },
] as const
