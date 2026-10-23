import { api } from '@/lib/api'
import { cachedState, cachedStructure } from './data'
import type { NexusWebState } from './types'
import { treeFromStructure, type SubjectProgress, type SubjectTree } from './subjectModel'

export { quickNexus, treeFromStructure, type SubjectProgress, type SubjectTree } from './subjectModel'

/*
 * A subject's tree, with no wait.
 *
 * The tree itself is static (names, icons, links, layout) and versioned with
 * the structure, so it paints on the first frame from whatever the device
 * already has, in this order:
 *   memory       the tree from an earlier visit this session,
 *   structure    the cached Nexus structure (it carries every subject's
 *                layout), read synchronously from the device,
 *   IndexedDB    a tree saved on an earlier visit (async, a few ms),
 *   network      /api/nexus/tree/<id>?v=<version> — small, immutable.
 * The reader's numbers come separately and tiny (/api/nexus/progress/<id>),
 * seeded from the device's last web state, so the rings show at once and
 * settle when the fresh numbers land. The full subject response (lesson
 * metrics, review memory, cross links) still loads behind, never blocking.
 */

const trees = new Map<string, SubjectTree>()
const progress = new Map<string, SubjectProgress>()
const pending = new Map<string, Promise<SubjectTree | null>>()

/** Whatever tree the device has right now (memory, then the cached structure). */
export function treeNow(subject: string): SubjectTree | null {
  const hit = trees.get(subject)
  const st = cachedStructure()
  if (hit && (!st || hit.version === st.version)) return hit
  const t = treeFromStructure(st, subject)
  if (t) trees.set(subject, t)
  return t ?? hit ?? null
}

/* ── IndexedDB (its own small database; never throws) ── */
const DB = 'nexora-trees'
const STORE = 'trees'
let dbp: Promise<IDBDatabase | null> | null = null
function idb(): Promise<IDBDatabase | null> {
  dbp ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbp
}
async function idbGet(subject: string): Promise<SubjectTree | null> {
  const db = await idb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(subject)
      req.onsuccess = () => resolve((req.result as SubjectTree) ?? null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}
async function idbPut(t: SubjectTree) {
  const db = await idb()
  if (!db) return
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(t, t.subject.id)
  } catch {
    /* storage blocked: memory still works */
  }
}

/** The subject's tree at the current version: memory, IndexedDB, then the network. */
export function loadTree(subject: string): Promise<SubjectTree | null> {
  const version = cachedStructure()?.version
  const hit = trees.get(subject)
  if (hit && (!version || hit.version === version)) return Promise.resolve(hit)
  const key = `${subject}@${version ?? ''}`
  const inflight = pending.get(key)
  if (inflight) return inflight
  const p = (async () => {
    const saved = await idbGet(subject)
    if (saved && (!version || saved.version === version)) {
      trees.set(subject, saved)
      return saved
    }
    const r = await api.get<{ ok: boolean } & SubjectTree>(`/api/nexus/tree/${encodeURIComponent(subject)}`, { query: { v: version } })
    const t: SubjectTree = { version: r.version, subject: r.subject, zones: r.zones, nodes: r.nodes }
    trees.set(subject, t)
    void idbPut(t)
    return t
  })()
    .catch(() => trees.get(subject) ?? null)
    .finally(() => pending.delete(key))
  pending.set(key, p)
  return p
}

/* ── the reader's numbers ── */

/** The last numbers this device saw for the subject (this session, else the cached web state). */
export function progressNow(subject: string, username: string): SubjectProgress | null {
  const hit = progress.get(subject)
  if (hit) return hit
  const s: NexusWebState | null = cachedState(username)
  const sub = s?.state.subjects[subject]
  if (!s || !sub) return null
  return {
    version: s.state.version,
    zones: sub.zones as SubjectProgress['zones'],
    nodes: sub.nodes as unknown as SubjectProgress['nodes'],
    rank: s.ranks?.[subject] ?? null,
    player: subject === 'dsa' ? (s.dsaPlayer ?? null) : null,
  }
}

/** Fresh numbers for one subject (a few hundred bytes). */
export async function loadProgress(subject: string): Promise<SubjectProgress> {
  const r = await api.get<{ ok: boolean } & SubjectProgress>(`/api/nexus/progress/${encodeURIComponent(subject)}`)
  const out: SubjectProgress = { version: r.version, zones: r.zones, nodes: r.nodes, rank: r.rank, player: r.player }
  progress.set(subject, out)
  return out
}

/** Warm a subject before it is opened (hover, focus, idle): the tree only. */
export function prefetchSubject(subject: string) {
  if (!subject || trees.has(subject)) return
  void loadTree(subject)
}
