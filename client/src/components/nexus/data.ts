import { api } from '@/lib/api'
import { prefetchApi } from '@/hooks/useApi'
import type { NexusResponse, NexusWebResponse, RoadmapResponse } from './types'

/*
 * The Nexus page's requests, shared with the nav-link prefetcher so hovering
 * "Nexus" warms exactly the cache entries the page reads on mount.
 */
export const NEXUS_WEB_KEY = 'nexus:web'
export const ROADMAP_KEY = 'nexus:roadmap'

export const fetchNexusWeb = (fresh = false) =>
  api.get<NexusWebResponse>('/api/nexus/web', { query: { fresh: fresh ? '1' : undefined } })
/** One subject's path (the Rift-tree view); DSA is the default subject. */
export const nexusPathKey = (subject: string) => `nexus:path:${subject}`
export const fetchNexusPath = (subject: string, fresh = false) =>
  api.get<NexusResponse>('/api/nexus', { query: { subject, fresh: fresh ? '1' : undefined } })
export const fetchRoadmap =() => api.get<RoadmapResponse>('/api/level-roadmap')

export function prefetchNexusData() {
  prefetchApi(NEXUS_WEB_KEY, () => fetchNexusWeb())
  prefetchApi(ROADMAP_KEY, fetchRoadmap)
}
