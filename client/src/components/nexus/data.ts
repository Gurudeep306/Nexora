import { api } from '@/lib/api'
import { prefetchApi } from '@/hooks/useApi'
import { warmLayout } from './layoutCache'
import type { NexusResponse, NexusWebState, NexusWebStructure, RoadmapResponse, WebCluster } from './types'

/*
 * The Nexus page's requests, shared with the prefetchers (nav-link intent and
 * app idle) so the web is ready before it is opened.
 *
 * The web comes in two parts (see src/nexus/subjects.js webStructure/state):
 * the structure, versioned and immutable, kept on the device; and the
 * reader's state, small, refreshed in the background. Both are remembered in
 * localStorage, so even a cold load paints the web from the first frame.
 */
export const ROADMAP_KEY = 'nexus:roadmap'
const LS_STRUCTURE = 'nexus:structure:v1'
const LS_STATE = 'nexus:state:v1'

export const fetchStructure = (version?: string) => api.get<NexusWebStructure>('/api/nexus/structure', { query: { v: version } })
export const fetchState = (fresh = false) => api.get<NexusWebState>('/api/nexus/web', { query: { fresh: fresh ? '1' : undefined } })
/** One subject's path (the Rift-tree view); DSA is the default subject. */
export const nexusPathKey = (subject: string) => `nexus:path:${subject}`
export const fetchNexusPath = (subject: string, fresh = false) =>
  api.get<NexusResponse>('/api/nexus', { query: { subject, fresh: fresh ? '1' : undefined } })
export const fetchRoadmap = () => api.get<RoadmapResponse>('/api/level-roadmap')

/* ── device memory (never throws: private mode, quota, old data) ── */
function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* full or blocked: the network copy still works */
  }
}
let memStructure: NexusWebStructure | null = null
const memState = new Map<string, NexusWebState>()

export function cachedStructure(): NexusWebStructure | null {
  return memStructure ?? (memStructure = readJson<NexusWebStructure>(LS_STRUCTURE))
}
/** The last state this browser saw — only if it was for this reader. */
export function cachedState(user: string): NexusWebState | null {
  const s = memState.get(user) ?? readJson<NexusWebState>(LS_STATE)
  return s && (s.user ?? '') === user ? s : null
}
export function rememberStructure(s: NexusWebStructure) {
  memStructure = s
  writeJson(LS_STRUCTURE, s)
}
export function rememberState(s: NexusWebState) {
  memState.set(s.user ?? '', s)
  writeJson(LS_STATE, s)
}

/**
 * Fresh state, and the structure it belongs to (fetched only when the
 * version moved on). Resolves to both, already remembered.
 */
export async function loadWeb(fresh = false): Promise<{ structure: NexusWebStructure; state: NexusWebState }> {
  const have = cachedStructure()
  const [state, maybe] = await Promise.all([fetchState(fresh), have ? Promise.resolve(null) : fetchStructure()])
  let structure = maybe ?? have!
  if (structure.version !== state.state.version) structure = await fetchStructure(state.state.version)
  rememberStructure(structure)
  rememberState(state)
  return { structure, state }
}

/** Structure + state → the clusters the web draws (same order on both sides). */
export function mergeWeb(structure: NexusWebStructure, state: NexusWebState | null): WebCluster[] {
  const ok = state && state.state.version === structure.version
  return structure.clusters.map((c) => {
    const st = ok ? state!.state.subjects[c.id] : undefined
    return {
      id: c.id,
      name: c.name,
      short: c.short,
      domain: c.domain,
      stream: c.stream ?? c.domain,
      gate: c.gate,
      description: c.description,
      order: c.order,
      engine: c.engine,
      rank: ok ? state!.ranks[c.id] : undefined,
      zones: c.zones.map((z, i) => {
        const t = st?.zones[i]
        return {
          level: z.level,
          name: z.name,
          color: z.color,
          nodesCompleted: t?.[0] ?? 0,
          nodeCount: t?.[1] ?? c.nodes.filter((n) => n.z === z.level).length,
          zoneProgress: t?.[2] ?? 0,
          locked: !!((t?.[3] ?? 0) & 1),
          current: !!((t?.[3] ?? 0) & 2),
          completed: !!((t?.[3] ?? 0) & 4),
        }
      }),
      nodes: c.nodes.map((n, i) => {
        const t = st?.nodes[i]
        return {
          id: n.id,
          n: n.n,
          z: n.z,
          req: n.req,
          cx: n.cx,
          k: n.k,
          i: n.i,
          ls: n.ls,
          o: n.o,
          xp: n.xp,
          p: t?.[0] ?? 0,
          s: (t?.[1] ?? (n.req.length ? 0 : 1)) as 0 | 1 | 2,
          c: t?.[2] ?? '',
          ag: t?.[3] ?? -1,
          iv: t?.[4] ?? 0,
          rc: t?.[5] ?? 0,
          td: t?.[6] ?? -1,
        }
      }),
    }
  })
}

/** Warm everything the web needs: data on the device and the layout computed off-thread. */
let warming = false
export function prefetchNexusData() {
  prefetchApi(ROADMAP_KEY, fetchRoadmap)
  if (warming) return
  warming = true
  loadWeb()
    .then(({ structure }) => warmLayout(structure))
    .catch(() => {})
    .finally(() => {
      warming = false
    })
}
