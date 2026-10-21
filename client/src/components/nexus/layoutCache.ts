import { computeLayout, type LayoutData, type LayoutInput } from './lattice'
import type { NexusWebStructure } from './types'

/*
 * The web's layout depends only on the structure, so it is computed once
 * per structure version and kept:
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
    store.clear() // one version at a time
    store.put(layout, layout.version)
  } catch {
    /* storage blocked: memory still works */
  }
}

let worker: Worker | null = null
let seq = 0
const waiting = new Map<number, (l: LayoutData) => void>()
function compute(version: string, clusters: LayoutInput[]): Promise<LayoutData> {
  try {
    worker ??= new Worker(new URL('./lattice.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<{ id: number; layout: LayoutData }>) => {
      waiting.get(e.data.id)?.(e.data.layout)
      waiting.delete(e.data.id)
    }
    const id = ++seq
    return new Promise((resolve) => {
      waiting.set(id, resolve)
      worker!.postMessage({ id, version, clusters })
    })
  } catch {
    // No workers (very old browsers): compute here, after this frame.
    return new Promise((resolve) => setTimeout(() => resolve(computeLayout(clusters, version)), 0))
  }
}

const inputOf = (s: NexusWebStructure): LayoutInput[] =>
  s.clusters.map((c) => ({ id: c.id, domain: c.domain, order: c.order, nodes: c.nodes.map((n) => ({ id: n.id, req: n.req, cx: n.cx })) }))

/** The layout if it is already in memory (synchronous: first-frame paint). */
export function layoutNow(version: string): LayoutData | null {
  return memory.get(version) ?? null
}

/** The layout for a structure: memory → IndexedDB → worker. */
export function getLayout(structure: NexusWebStructure): Promise<LayoutData> {
  const v = structure.version
  const hit = memory.get(v)
  if (hit) return Promise.resolve(hit)
  let p = pending.get(v)
  if (!p) {
    p = (async () => {
      const stored = await idbGet(v)
      if (stored && stored.xy && stored.keys?.length) {
        memory.set(v, stored)
        return stored
      }
      const layout = await compute(v, inputOf(structure))
      memory.set(v, layout)
      void idbPut(layout)
      return layout
    })().finally(() => pending.delete(v))
    pending.set(v, p)
  }
  return p
}

/** Prefetch: have the layout ready before the Nexus opens. */
export function warmLayout(structure: NexusWebStructure) {
  void getLayout(structure)
}
