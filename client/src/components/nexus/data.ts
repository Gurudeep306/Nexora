import { api } from '@/lib/api'
import { prefetchApi } from '@/hooks/useApi'
import type { NexusResponse, RoadmapResponse } from './types'

/*
 * The Nexus page's requests, shared with the nav-link prefetcher so hovering
 * "Nexus" warms exactly the cache entries the page reads on mount.
 */
export const NEXUS_KEY = 'nexus:tree'
export const ROADMAP_KEY = 'nexus:roadmap'

export const fetchNexus = () => api.get<NexusResponse>('/api/nexus')
export const fetchRoadmap = () => api.get<RoadmapResponse>('/api/level-roadmap')

export function prefetchNexusData() {
  prefetchApi(NEXUS_KEY, fetchNexus)
  prefetchApi(ROADMAP_KEY, fetchRoadmap)
}
