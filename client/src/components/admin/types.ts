import type { Announcement, FeatureFlag, SiteRole } from '@/lib/site'

export interface PermissionDef {
  key: string
  label: string
  group: string
  description: string
}

export interface AdminMe {
  counts: { openReports: number | null }
  username: string
  role: SiteRole
  isOwner: boolean
  permissions: string[]
  /** What this person gets in each Admin section (Admin → Staff access). */
  sections: Record<string, 'none' | 'view' | 'edit'>
  /** May open Admin → Staff access (the owner, or a top admin). */
  canStaff: boolean
  catalog: PermissionDef[]
  roles: SiteRole[]
  roleDefaults: Record<string, string[]>
  ownerGrantOnly: string[]
  contentTypes: { key: string; label: string; stored: boolean }[]
  flags: FeatureFlag[]
}

export interface Overview {
  totals: {
    users: number
    signups7: number
    dau: number
    wau: number
    submissions: number
    gate_attempts: number
    ai_tokens: number
    ai_users7: number
    banned: number
    open_reports: number
    online: number | null
    errors24h: number
  }
  days: string[]
  series: Record<'signups' | 'dau' | 'submissions' | 'gate' | 'aiTokens' | 'aiUsers', number[]>
  recentSignups: AdminUserRow[]
  online: string[] | null
}

export interface BanInfo {
  kind: string
  reason: string
  until: string | null
}

export interface AdminUserRow {
  username: string
  display_name?: string
  avatar?: string | null
  avatar_url?: string | null
  bio?: string
  role: SiteRole
  verified: boolean | number
  status?: string
  last_seen?: string | null
  created_at: string
  email?: string | null
  auth_provider?: string
  ban?: BanInfo | null
  earlyAccess?: boolean
}

export interface AuditEntry {
  id: number
  actor: string
  actor_role: string | null
  action: string
  target_type: string | null
  target: string | null
  before: unknown
  after: unknown
  ip: string | null
  created_at: number
}

export interface UserDetail {
  user: AdminUserRow & { email?: string }
  stats: {
    solved: number
    xp: number
    submissions: number
    gate_attempts: number
    ai_tokens: number
    friends: number
    reports_against: number
  }
  overrides: Record<string, boolean>
  permissions: string[]
  submissions: { id: number; verdict: string; language: string; submitted_at: string; title: string | null }[]
  sessions: { id: string; expires: number }[]
  bans: { id: number; kind: string; reason: string; expires_at: number | null; created_by: string; created_at: number; lifted_at: number | null; lifted_by: string | null; active: boolean }[]
  warnings: { id: number; reason: string; created_by: string; created_at: number; acknowledged_at: number | null }[]
  history: AuditEntry[]
  activeDays: string[]
  online: boolean | null
  canAct: boolean
}

export interface SiteAdmin {
  settings: {
    owner_username: string | null
    private_mode: { enabled: boolean; message: string }
    registrations: { open: boolean }
    feature_flags: Record<FeatureFlag, boolean>
    maintenance: { enabled: boolean; message: string }
  }
  privateActive: boolean
  ownerSource: 'env' | 'cli' | 'config' | null
  allowlist: { entry: string; note: string; created_by: string; created_at: number }[]
  earlyAccess: (AdminUserRow & { granted_by: string; created_at: number })[]
}

export interface Report {
  id: number
  reporter: string
  content_type: string
  content_id: string
  target_user: string | null
  reason: string
  details: string
  snapshot: string | null
  status: 'open' | 'resolved' | 'dismissed'
  resolution: string | null
  resolved_by: string | null
  resolved_at: number | null
  created_at: number
  report_count: number
  removed: boolean
}

export type AdminAnnouncement = Announcement & { active: number; created_by: string }

/** GET /api/admin/db-stats — database rows read/written since boot (Turso quota). */
export interface DbStatement {
  sql: string
  calls: number
  returned: number
  reads: number
  written: number
  scans: string[]
}
export interface DbStats {
  detailed: boolean
  since: string
  uptimeSec: number
  totals: { statements: number; returned: number; written: number; reads: number; scans: number }
  projection: {
    monthlyReads: number
    monthlyWrites: number
    quota: { reads: number; writes: number }
    share: { reads: number; writes: number }
    warnAt: number
    warning: boolean
  }
  topReads: DbStatement[]
  topWrites: DbStatement[]
  endpoints?: { route: string; requests: number; statements: number; reads: number; written: number }[]
}
