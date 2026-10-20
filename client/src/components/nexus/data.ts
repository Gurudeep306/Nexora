import { api } from '@/lib/api'
import { prefetchApi } from '@/hooks/useApi'
import type { NexusResponse, RoadmapResponse } from './types'

/*
 * The Nexus page's requests, shared with the nav-link prefetcher so hovering
 * "Nexus" warms exactly the cache entries the page reads on mount.
 */
export const NEXUS_KEY = 'nexus:tree'
export const ROADMAP_KEY = 'nexus:roadmap'

/** Pseudo-subject for the "All subjects" overview. */
export const ALL_SUBJECTS = 'all'
export const DEFAULT_SUBJECT = 'dsa'
const STORE_KEY = 'nexus:subject'

/** Cache key per subject (DSA keeps the original key, so the prefetch still lands). */
export const nexusKey = (subject: string) => (subject === DEFAULT_SUBJECT ? NEXUS_KEY : `nexus:tree:${subject}`)

export const fetchNexus = (subject: string = DEFAULT_SUBJECT, fresh = false) =>
  api.get<NexusResponse>('/api/nexus', {
    query: { subject: subject === DEFAULT_SUBJECT ? undefined : subject, fresh: fresh ? '1' : undefined },
  })
export const fetchRoadmap = () => api.get<RoadmapResponse>('/api/level-roadmap')

export function rememberedSubject(): string | null {
  try {
    return localStorage.getItem(STORE_KEY)
  } catch {
    return null
  }
}

export function rememberSubject(subject: string) {
  try {
    localStorage.setItem(STORE_KEY, subject)
  } catch {
    /* private mode: the URL still carries it */
  }
}

export function prefetchNexusData() {
  const remembered = rememberedSubject()
  const subject = remembered && remembered !== ALL_SUBJECTS ? remembered : DEFAULT_SUBJECT
  prefetchApi(nexusKey(subject), () => fetchNexus(subject))
  prefetchApi(ROADMAP_KEY, fetchRoadmap)
}
