/*
  The teacher speaks in a voice the student gives (docs/voice/VIRTUAL_TEACHER.md
  §3.2.7). Free: it runs on the student's own device (worker.ts). Private: the
  voice sample is kept only in this browser (IndexedDB) and never sent anywhere.

  - Once per voice: the sample (up to 15 seconds is used) becomes a voice
    print, which takes a few seconds.
  - Every sentence she says is made in that voice as she says it. That is the
    heavy part: it needs a GPU (WebGPU), and the first sentence is timed: if
    the device is too slow for a conversation, the voice is turned off for
    now and she uses her normal voice.
  - English only: the in-browser model doesn't speak Hindi yet; Hindi
    sentences use her normal Hindi voice.
*/
import { useSyncExternalStore } from 'react'
import { trimSilence } from './sample'

export { usableSeconds } from './sample'

export type CloneStatus = 'off' | 'loading' | 'ready' | 'failed' | 'unsupported'
export interface CloneState {
  status: CloneStatus
  /** 0–1 while downloading. */
  progress: number
  /** A voice sample is saved on this device. */
  hasVoice: boolean
  /** How fast it speaks here: seconds of speech per second of work (≥ 1 keeps up with talking). */
  speed: number
  why: string
}

/** The one-time download, in MB (language model 305–354, speech decoder 540, voice encoder 592, text embeddings 62). */
export const CLONE_MB = 1500
/** Below this, a conversation would stall: seconds of speech made per second. */
const MIN_SPEED = 0.8
/** The part of the sample the voice print is made from. */
export const SAMPLE_SECONDS = { min: 8, max: 15 }

let state: CloneState = { status: 'off', progress: 0, hasVoice: false, speed: 0, why: '' }
const listeners = new Set<() => void>()
function set(patch: Partial<CloneState>) {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}
export const getClone = () => state
export function useClone(): CloneState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => state,
    () => state,
  )
}

/* ── the sample, kept only in this browser ── */

const DB = 'nexora-voice'
const STORE = 'clone'
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}
async function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db()
  return new Promise<T>((resolve, reject) => {
    const req = run(d.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}
async function savedSample(): Promise<Float32Array | null> {
  try {
    const v = await idb<{ audio?: Float32Array } | undefined>('readonly', (s) => s.get('sample'))
    return v?.audio instanceof Float32Array ? v.audio : null
  } catch {
    return null
  }
}

/** Is a voice saved on this device? (Checked once at start.) */
export async function checkSaved() {
  set({ hasVoice: !!(await savedSample()) })
}

/** Erase the voice from this device. */
export async function forgetVoice() {
  try {
    await idb('readwrite', (s) => s.delete('sample'))
  } catch {
    /* nothing saved */
  }
  worker?.terminate()
  worker = null
  loaded = null
  set({ hasVoice: false, status: 'off', speed: 0 })
}

/* ── the model ── */

let worker: Worker | null = null
let loaded: Promise<void> | null = null
let nextId = 1
const waiting = new Map<number, { resolve: (a: Float32Array) => void; reject: (e: Error) => void; t0: number }>()
let onVoiced: (() => void) | null = null
let onReady: ((err?: Error) => void) | null = null

async function gpu(): Promise<'half' | 'full' | null> {
  try {
    const g = (navigator as unknown as { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu
    const a = g ? await g.requestAdapter() : null
    if (!a) return null
    return a.features.has('shader-f16') ? 'half' : 'full'
  } catch {
    return null
  }
}

function start(): Worker {
  const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  w.onmessage = (e: MessageEvent) => {
    const m = e.data as { type: string; id?: number; audio?: Float32Array; loaded?: number; total?: number; error?: string }
    if (m.type === 'progress' && m.total) set({ progress: Math.min(1, (m.loaded ?? 0) / m.total) })
    else if (m.type === 'ready') onReady?.()
    else if (m.type === 'voiced') onVoiced?.()
    else if (m.type === 'audio' && m.id) {
      waiting.get(m.id)?.resolve(m.audio as Float32Array)
      waiting.delete(m.id)
    } else if (m.type === 'error') {
      const err = new Error(m.error || 'The voice model stopped.')
      if (m.id && waiting.has(m.id)) {
        waiting.get(m.id)!.reject(err)
        waiting.delete(m.id)
      } else onReady?.(err)
    }
  }
  return w
}

/** Download (once) and start the model, then make the voice print from the saved sample. */
export function loadClone(): Promise<void> {
  if (loaded) return loaded
  loaded = (async () => {
    const kind = await gpu()
    if (!kind) {
      set({ status: 'unsupported', why: 'This browser or device has no WebGPU, which your own voice needs. Chrome or Edge on a recent computer has it.' })
      throw new Error('no webgpu')
    }
    const sample = await savedSample()
    if (!sample) throw new Error('no voice saved')
    set({ status: 'loading', progress: 0, why: '' })
    worker = start()
    await new Promise<void>((resolve, reject) => {
      onReady = (err) => (err ? reject(err) : resolve())
      worker!.postMessage({ type: 'load', device: 'webgpu', lm: kind === 'half' ? 'q4f16' : 'q4' })
    })
    await new Promise<void>((resolve) => {
      onVoiced = resolve
      worker!.postMessage({ type: 'voice', audio: sample })
    })
    // Timed on a short sentence: too slow for a conversation, and the voice waits for a faster device.
    const t0 = performance.now()
    const test = await say('Okay. Let us start with the idea first.')
    const speed = test.length / 24000 / ((performance.now() - t0) / 1000)
    if (speed < MIN_SPEED) {
      set({ status: 'failed', speed, why: `This device makes your voice ${speed.toFixed(1)}× as fast as it is spoken, too slow for a conversation, so she uses her normal voice. It works on devices with a stronger graphics chip.` })
      throw new Error('too slow')
    }
    set({ status: 'ready', speed, progress: 1 })
  })().catch((e) => {
    loaded = null
    worker?.terminate()
    worker = null
    if (state.status === 'loading') set({ status: 'failed', why: 'Your voice couldn’t start on this device. Try again on Wi-Fi, in Chrome or Edge.' })
    throw e
  })
  return loaded
}

function say(text: string): Promise<Float32Array> {
  if (!worker) return Promise.reject(new Error('not loaded'))
  const id = nextId++
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject, t0: performance.now() })
    worker!.postMessage({ type: 'say', id, text })
  })
}

/** A sentence in the student's voice (24 kHz), or null when it can't be said that way (not ready, Hindi). */
export async function cloneSay(text: string): Promise<Float32Array | null> {
  if (state.status !== 'ready' || /[ऀ-ॿ]/.test(text)) return null
  try {
    return await say(text)
  } catch {
    return null
  }
}

/**
 * Keep a new voice sample (24 kHz mono) on this device and make it the
 * teacher's voice. The best part is kept: trimmed of silence at both ends,
 * at most SAMPLE_SECONDS.max.
 */
export async function saveVoice(audio: Float32Array) {
  const clip = trimSilence(audio, 24000).slice(0, 24000 * SAMPLE_SECONDS.max)
  await idb('readwrite', (s) => s.put({ audio: clip, at: Date.now() }, 'sample'))
  worker?.terminate()
  worker = null
  loaded = null
  set({ hasVoice: true, status: 'off', speed: 0 })
}
