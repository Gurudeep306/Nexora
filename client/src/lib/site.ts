/** Types and helpers for the owner / admin system's site status (see context/SiteContext.tsx). */

export type FeatureFlag = 'gate' | 'contests' | 'social' | 'ai_tutor' | 'practice'
export type SiteRole = 'owner' | 'admin' | 'moderator' | 'member' | 'teacher'

export interface Announcement {
  id: number
  kind: 'banner' | 'broadcast'
  title: string
  body: string
  link: string | null
  color: 'brand' | 'info' | 'success' | 'warning' | 'danger'
  pinned: number
  expires_at: number | null
  created_at: number
}

export interface SiteStatus {
  private: boolean
  privateMessage: string
  allowed: boolean
  registrationsOpen: boolean
  flags: Record<FeatureFlag, boolean>
  maintenance: { message: string } | null
  banners: Announcement[]
  broadcasts: Announcement[]
  notices: { id: number; reason: string; created_at: number }[]
  banned: { kind: string; reason: string; until: string | null } | null
  me: {
    username: string
    role: SiteRole
    permissions: string[]
    isOwner: boolean
    isStaff: boolean
    verified: boolean
  } | null
}

export const ALL_ON: Record<FeatureFlag, boolean> = { gate: true, contests: true, social: true, ai_tutor: true, practice: true }

/** Client routes switched off with each feature flag. */
const FEATURE_PATHS: [FeatureFlag, RegExp][] = [
  ['gate', /^\/gate(\/|$)/],
  ['contests', /^\/contests(\/|$)/],
  ['social', /^\/social(\/|$)/],
  ['practice', /^\/(problems(\/|$)|solve\/(?!learn\/))/],
]
export function featureForPath(path: string): FeatureFlag | null {
  for (const [flag, re] of FEATURE_PATHS) if (re.test(path)) return flag
  return null
}

export const FEATURE_LABELS: Record<FeatureFlag, string> = {
  gate: 'GATE',
  contests: 'Contests',
  social: 'Social',
  ai_tutor: 'AI tutor',
  practice: 'Practice',
}
