import { computeLayout, OVERVIEW_LAYOUT, overviewData, TREE_LAYOUT, treeInput, type LayoutData, type LayoutInput, type LayoutOptions } from './lattice'
import type { NexusWebStructure, WebCluster } from './types'

/*
 * Layouts depend only on the structure, so each is computed once per
 * structure version and kept, keyed "<version>:web" (the main web of
 * subjects) or "<version>:<subject>" (that subject's own tree):
 *   memory    instant for in-app navigation,
 *   IndexedDB instant for a cold reload (typed arrays store natively),
 *   worker    otherwise, off the main thread (never blocks the page).
 */
const memory = new Map<string, LayoutData>()
const pending = new Map<string, Promise<LayoutData>>()
const DB = 'nexora-nexus'
const STORE = 'layouts'

function idb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}
async function idbGet(version: string): Promise<LayoutData | null> {
  const db = await idb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(version)
      req.onsuccess = () => resolve((req.result as LayoutData) ?? null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}
async function idbPut(layout: LayoutData) {
  const db = await idb()
  if (!db) return
  try {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    // One structure version at a time: drop layouts of older versions.
    const prefix = `${layout.version.split(':')[0]}:`
    const keys = store.getAllKeys()
    keys.onsuccess = () => {
      for (const k of keys.result) if (typeof k !== 'string' || !k.startsWith(prefix)) store.delete(k)
    }
    store.put(layout, layout.version)
  } catch {
    /* storage blocked: memory still works */
  }
}

let worker: Worker | null = null
let seq = 0
const waiting = new Map<number, (l: LayoutData) => void>()
function compute(version: string, clusters: LayoutInput[], opts: LayoutOptions): Promise<LayoutData> {
  try {
    worker ??= new Worker(new URL('./lattice.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<{ id: number; layout: LayoutData }>) => {
      waiting.get(e.data.id)?.(e.data.layout)
      waiting.delete(e.data.id)
    }
    const id = ++seq
    return new Promise((resolve) => {
      waiting.set(id, resolve)
      worker!.postMessage({ id, version, clusters, opts })
    })
  } catch {
    // No workers (very old browsers): compute here, after this frame.
    return new Promise((resolve) => setTimeout(() => resolve(computeLayout(clusters, version, opts)), 0))
  }
}

/** Cache keys: the main web and each subject's tree, per structure version. */
export const webKey = (version: string) => `${version}:web`
export const treeKey = (version: string, subject: string) => `${version}:${subject}`

/** A layout if it is already in memory (synchronous: first-frame paint). */
export function layoutNow(key: string): LayoutData | null {
  return memory.get(key) ?? null
}

function getOrCompute(key: string, inputs: () => LayoutInput[], opts: LayoutOptions): Promise<LayoutData> {
  const hit = memory.get(key)
  if (hit) return Promise.resolve(hit)
  let p = pending.get(key)
  if (!p) {
    p = (async () => {
      const stored = await idbGet(key)
      if (stored && stored.xy && stored.keys?.length) {
        memory.set(key, stored)
        return stored
      }
      const layout = await compute(key, inputs(), opts)
      memory.set(key, layout)
      void idbPut(layout)
      return layout
    })().finally(() => pending.delete(key))
    pending.set(key, p)
  }
  return p
}

/** The main web's layout: one node per subject. */
export function getWebLayout(structure: NexusWebStructure): Promise<LayoutData> {
  return getOrCompute(webKey(structure.version), () => overviewData(structure.clusters as unknown as WebCluster[]).inputs, OVERVIEW_LAYOUT)
}

/** One subject's own tree. */
export function getTreeLayout(structure: NexusWebStructure, subject: string): Promise<LayoutData> | null {
  const c = structure.clusters.find((x) => x.id === subject)
  if (!c) return null
  return getOrCompute(treeKey(structure.version, subject), () => treeInput(c as unknown as WebCluster), TREE_LAYOUT)
}

/** Prefetch: have the main web ready before the Nexus opens. */
export function warmLayout(structure: NexusWebStructure) {
  void getWebLayout(structure)
}
