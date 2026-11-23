/*
  Guru on the student's own device (docs/voice/BLUEPRINT.md §4.6): pick the
  tier this device can run (tiers.ts), download it only after the student
  agrees, run it in a Web Worker (worker.ts), check its speed, answer, and
  unload when idle. Anything that fails sends the turn back to the server.

  - Crash guard: a flag is set while a tier loads; if the page died during a
    load, that tier is marked failed and the next try steps down.
  - Speed test: a short answer right after loading, timed from the first word
    (the GPU's warm-up isn't counted); slower than the tier's floor, or no
    answer within 30 seconds, marks it failed (and steps down next time).
  - Idle: after 10 minutes unused, the worker is stopped (memory back to the
    page); the next question loads it again from the browser's cache.
*/
import { useSyncExternalStore } from 'react'
import { dtypeFor, pickTier, stepDown, tokensPerSec, TIERS, unsupportedWhy, type DeviceInfo, type Tier, type TierId } from './tiers'

export type BrainStatus = 'off' | 'loading' | 'testing' | 'ready' | 'failed' | 'unsupported'
export interface BrainState {
  status: BrainStatus
  tier: Tier | null
  /** The build in use: 'q4f16' (GPU with fp16) or 'q4'. */
  device: string
  /** 0–1 while downloading. */
  progress: number
  /** Tokens a second in the speed test. */
  speed: number
  why: string
}

const FAILED = 'nexora:brain:failed'
const LOADING = 'nexora:brain:loading'
const IDLE_MS = 10 * 60_000
const TEST_MS = 30_000

let state: BrainState = { status: 'off', tier: null, device: '', progress: 0, speed: 0, why: '' }
const listeners = new Set<() => void>()
function set(patch: Partial<BrainState>) {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}
export function getBrain(): BrainState {
  return state
}
export function useBrain(): BrainState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => state,
    () => state,
  )
}

function failedTiers(): TierId[] {
  try {
    const list = JSON.parse(localStorage.getItem(FAILED) ?? '[]') as unknown
    return Array.isArray(list) ? list.filter((t): t is TierId => t === 'S' || t === 'M' || t === 'L') : []
  } catch {
    return []
  }
}
function markFailed(t: TierId) {
  try {
    localStorage.setItem(FAILED, JSON.stringify([...new Set([...failedTiers(), t])]))
  } catch {
    /* private mode */
  }
}

/** A page that died while loading a tier: that tier failed. Checked once per page load. */
function checkCrash() {
  try {
    const t = localStorage.getItem(LOADING)
    if (t === 'S' || t === 'M' || t === 'L') markFailed(t)
    localStorage.removeItem(LOADING)
  } catch {
    /* private mode */
  }
}
let crashChecked = false

/** What this browser reports about the device. */
export async function deviceInfo(): Promise<DeviceInfo & { gpuName?: string }> {
  if (!crashChecked) {
    crashChecked = true
    checkCrash()
  }
  const nav = navigator as Navigator & { deviceMemory?: number; gpu?: { requestAdapter(): Promise<{ features: Set<string>; limits: { maxBufferSize: number } } | null> } }
  let webgpu = false
  let f16 = false
  let maxBufferBytes: number | undefined
  try {
    const a = nav.gpu ? await nav.gpu.requestAdapter() : null
    if (a) {
      webgpu = true
      f16 = a.features.has('shader-f16')
      maxBufferBytes = a.limits.maxBufferSize
    }
  } catch {
    /* no GPU for us */
  }
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return { webgpu, f16, memoryGB: nav.deviceMemory, maxBufferBytes, ios, failed: failedTiers() }
}

/* ── the worker ── */

let worker: Worker | null = null
let nextId = 1
let idleTimer = 0
const pending = new Map<number, { onText?: (t: string) => void; resolve: (r: { text: string; tokens: number; ms: number; firstMs: number }) => void; reject: (e: Error) => void }>()

function touch() {
  window.clearTimeout(idleTimer)
  idleTimer = window.setTimeout(unload, IDLE_MS)
}

/** Stop the worker and give its memory back (the download stays in the browser's cache). */
export function unload() {
  window.clearTimeout(idleTimer)
  worker?.terminate()
  worker = null
  for (const p of pending.values()) p.reject(new Error('unloaded'))
  pending.clear()
  if (state.status === 'ready') set({ status: 'off' })
}

function startWorker(): Worker {
  const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  w.onmessage = (e: MessageEvent) => {
    const m = e.data as { type: string; id?: number; text?: string; loaded?: number; total?: number; tokens?: number; ms?: number; firstMs?: number; error?: string; device?: string }
    if (m.type === 'progress' && m.total) set({ progress: Math.min(1, (m.loaded ?? 0) / m.total) })
    const p = m.id != null ? pending.get(m.id) : undefined
    if (m.type === 'token' && p) p.onText?.(m.text ?? '')
    if (m.type === 'done' && p && m.id != null) {
      pending.delete(m.id)
      p.resolve({ text: m.text ?? '', tokens: m.tokens ?? 0, ms: m.ms ?? 0, firstMs: m.firstMs ?? 0 })
    }
    if (m.type === 'error' && p && m.id != null) {
      pending.delete(m.id)
      p.reject(new Error(m.error ?? 'failed'))
    }
  }
  return w
}

function load(w: Worker, tier: Tier, dtype: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const prev = w.onmessage
    w.onmessage = (e: MessageEvent) => {
      prev?.call(w, e)
      const m = e.data as { type: string; id?: number; error?: string }
      if (m.type === 'ready') {
        w.onmessage = prev
        resolve()
      } else if (m.type === 'error' && m.id == null) {
        w.onmessage = prev
        reject(new Error(m.error ?? 'load failed'))
      }
    }
    w.postMessage({ type: 'load', model: tier.model, dtype, device: 'webgpu' })
  })
}

function generate(messages: unknown, maxTokens: number, onText?: (t: string) => void) {
  if (!worker) return Promise.reject(new Error('not loaded'))
  const id = nextId++
  touch()
  return new Promise<{ text: string; tokens: number; ms: number; firstMs: number }>((resolve, reject) => {
    pending.set(id, { onText, resolve, reject })
    worker!.postMessage({ type: 'generate', id, messages, maxTokens })
  })
}

/**
 * Download (first time) and start the best tier for this device, then test
 * its speed. Only call after the student agreed to the download.
 */
export async function startBrain(force?: TierId): Promise<BrainState> {
  if (state.status === 'loading' || state.status === 'testing') return state
  const info = await deviceInfo()
  const tier = force ? TIERS[force] : pickTier(info)
  if (!tier) {
    set({ status: 'unsupported', tier: null, why: unsupportedWhy(info) })
    return state
  }
  const device = dtypeFor(tier, info)
  set({ status: 'loading', tier, device, progress: 0, why: '' })
  unload()
  try {
    localStorage.setItem(LOADING, tier.id)
  } catch {
    /* private mode */
  }
  worker = startWorker()
  try {
    await load(worker, tier, device)
    try {
      localStorage.removeItem(LOADING)
    } catch {
      /* private mode */
    }
    set({ status: 'testing' })
    // Speed test: a short real answer, timed from its first word.
    let timer = 0
    const r = await Promise.race([
      generate([{ role: 'user', content: 'In one sentence: what does binary search do?' }], 32),
      new Promise<null>((ok) => (timer = window.setTimeout(() => ok(null), TEST_MS))),
    ])
    window.clearTimeout(timer)
    const speed = r ? tokensPerSec(r) : 0
    if (speed < tier.minTokensPerSec) {
      markFailed(tier.id)
      unload()
      const next = stepDown(tier.id)
      const words = Math.round(speed * 0.75)
      const how = !r ? 'no answer within 30 seconds' : words < 1 ? 'under one word a second' : `about ${words} word${words === 1 ? '' : 's'} a second`
      set({ status: 'failed', speed, why: `${tier.name} was too slow on this device (${how}).${next ? ` Next time ${TIERS[next].name} is tried.` : ''} Guru answers from the server.` })
      return state
    }
    set({ status: 'ready', speed, progress: 1 })
    touch()
    return state
  } catch (e) {
    try {
      localStorage.removeItem(LOADING)
    } catch {
      /* private mode */
    }
    markFailed(tier.id)
    unload()
    set({ status: 'failed', why: `${tier.name} couldn't start here (${e instanceof Error ? e.message : 'error'}). Guru answers from the server.` })
    return state
  }
}

/** Answer on the device (only when it is ready). Resolves with the text, or rejects so the server can answer. */
/** Longest wait for an answer on the device; past it the server answers instead, so she never just goes silent. */
export const ANSWER_LIMIT_MS = 25_000

export async function askOnDevice(messages: unknown, onText?: (t: string) => void): Promise<string> {
  if (state.status !== 'ready' || !worker) throw new Error('not ready')
  let timer = 0
  const late = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('too slow')), ANSWER_LIMIT_MS)
  })
  try {
    const r = await Promise.race([generate(messages, 220, onText), late])
    return r.text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  } catch (e) {
    // Stuck or too slow on this device: start the worker afresh next time, and tell the student once in Settings.
    if (e instanceof Error && e.message === 'too slow') {
      unload()
      set({ status: 'off', why: 'Guru took too long on this device, so the server answered. It will try again next time.' })
    }
    throw e
  } finally {
    window.clearTimeout(timer)
  }
}

/** Delete the download from this browser and forget past failures. */
export async function removeBrain() {
  unload()
  set({ status: 'off', tier: null, progress: 0, speed: 0, why: '' })
  try {
    localStorage.removeItem(FAILED)
    for (const k of await caches.keys()) if (/transformers/i.test(k)) await caches.delete(k)
  } catch {
    /* nothing to delete */
  }
}
