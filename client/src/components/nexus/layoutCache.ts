import { computeRadial, type RadialInput, type RadialLayout } from './radial'
import type { NexusWebStructure } from './types'

/*
 * The radial layout depends only on the structure, so it is computed once
 * per structure version and kept:
 *   memory    instant for in-app navigation,
 *   IndexedDB instant for a cold reload (typed arrays store natively),
 *   worker    otherwise, off the main thread (never blocks the page).
 */
const memory = new Map<string, RadialLayout>()
const pending = new Map<string, Promise<RadialLayout>>()
const DB = 'nexora-nexus'
const STORE = 'layouts'
const KIND = 'radial2'

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
async function idbGet(key: string): Promise<RadialLayout | null> {
  const db = await idb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
      req.onsuccess = () => resolve((req.result as RadialLayout) ?? null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}
async function idbPut(layout: RadialLayout) {
  const db = await idb()
  if (!db) return
  try {
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE)
    store.clear() // one version at a time
    store.put(layout, layout.version)
  } catch {
    /* storage blocked: memory still works */
  }
}

let worker: Worker | null = null
let seq = 0
const waiting = new Map<number, (l: RadialLayout) => void>()
function compute(version: string, subjects: RadialInput[]): Promise<RadialLayout> {
  try {
    worker ??= new Worker(new URL('./radial.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<{ id: number; layout: RadialLayout }>) => {
      waiting.get(e.data.id)?.(e.data.layout)
      waiting.delete(e.data.id)
    }
    const id = ++seq
    return new Promise((resolve) => {
      waiting.set(id, resolve)
      worker!.postMessage({ id, version, subjects })
    })
  } catch {
    // No workers (very old browsers): compute here, after this frame.
    return new Promise((resolve) => setTimeout(() => resolve(computeRadial(subjects, version)), 0))
  }
}

const inputOf = (s: NexusWebStructure): RadialInput[] => {
  const rank = new Map((s.streams ?? []).map((x) => [x.id, x.order]))
  return s.clusters.map((c) => {
    const stream = c.stream ?? c.domain
    return { id: c.id, stream, streamOrder: rank.get(stream) ?? 99, order: c.order, nodes: c.nodes.map((n) => ({ id: n.id, z: n.z, req: n.req, cx: n.cx })) }
  })
}
/** Cache key: the layout kind and the structure version. */
export const layoutKey = (version: string) => `${KIND}:${version}`

/** The layout if it is already in memory (synchronous: first-frame paint). */
export function layoutNow(version: string): RadialLayout | null {
  return memory.get(layoutKey(version)) ?? null
}

/** The radial layout for a structure: memory → IndexedDB → worker. */
export function getLayout(structure: NexusWebStructure): Promise<RadialLayout> {
  const key = layoutKey(structure.version)
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
      const layout = await compute(key, inputOf(structure))
      memory.set(key, layout)
      void idbPut(layout)
      return layout
    })().finally(() => pending.delete(key))
    pending.set(key, p)
  }
  return p
}

/** Prefetch: have the layout ready before the Nexus opens. */
export function warmLayout(structure: NexusWebStructure) {
  void getLayout(structure)
}
