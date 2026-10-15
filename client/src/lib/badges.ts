import { useSyncExternalStore } from 'react'
import { api } from '@/lib/api'

/**
 * Who wears a badge: the owner (crown), admins, moderators and verified users.
 * One small cached request (GET /api/site/badges) serves every name on every
 * page — chat, leaderboards, profiles — so badge-able UIs need only a username.
 */
export interface BadgeDirectory {
  owner: string | null
  staff: Record<string, 'admin' | 'moderator'>
  verified: string[]
}

export type UserBadgeKind = 'owner' | 'admin' | 'moderator' | 'verified'

const EMPTY: BadgeDirectory = { owner: null, staff: {}, verified: [] }
const TTL_MS = 60_000

let directory: BadgeDirectory = EMPTY
let verifiedSet = new Set<string>()
let fetchedAt = 0
let inflight: Promise<void> | null = null
const listeners = new Set<() => void>()

function load(force = false) {
  if (inflight || (!force && Date.now() - fetchedAt < TTL_MS)) return
  inflight = api
    .get<BadgeDirectory>('/api/site/badges')
    .then((d) => {
      directory = { owner: d.owner ?? null, staff: d.staff ?? {}, verified: d.verified ?? [] }
      verifiedSet = new Set(directory.verified.map((u) => u.toLowerCase()))
      fetchedAt = Date.now()
      listeners.forEach((l) => l())
    })
    .catch(() => {
      fetchedAt = Date.now() // don't hammer a failing endpoint
    })
    .finally(() => {
      inflight = null
    })
}

/** Re-fetch after an admin changes roles or verification. */
export function refreshBadges() {
  load(true)
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  load()
  return () => listeners.delete(cb)
}

export function useBadgeDirectory(): BadgeDirectory {
  return useSyncExternalStore(subscribe, () => directory, () => EMPTY)
}

/** Badges for a username, strongest first. `role` from an API row wins when given. */
export function badgesFor(dir: BadgeDirectory, username: string | null | undefined, role?: string | null, verified?: boolean | number | null): UserBadgeKind[] {
  if (!username) return []
  const out: UserBadgeKind[] = []
  const lower = username.toLowerCase()
  const r = role === 'owner' || role === 'admin' || role === 'moderator' ? role : dir.owner?.toLowerCase() === lower ? 'owner' : dir.staff[username]
  if (r) out.push(r)
  if (verified || verifiedSet.has(lower)) out.push('verified')
  return out
}
