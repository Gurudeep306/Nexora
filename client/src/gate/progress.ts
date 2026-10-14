import { useEffect, useSyncExternalStore } from 'react'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { gateApi, type AttemptInput, type Outcome as ApiOutcome, type QuestionProgress, type ReviewState } from './api'

/*
 * Per-question progress for the GATE platform.
 *
 * The server (gateApi) is the source of truth. This module keeps an in-memory
 * copy so the UI updates optimistically, and degrades to this browser when the
 * server is unreachable or doesn't have the endpoints yet:
 *
 *  - backend 'up'   → reads come from /api/gate/me/progress, writes go to the
 *                     API; network failures are queued and retried.
 *  - backend 'down' → everything lives in the legacy localStorage store
 *                     (nexora:gate-progress:v1). The next time the server is
 *                     reachable that store is imported once (gateApi.importLocal)
 *                     and cleared, so nothing practised offline is lost.
 *
 * Attempts from Check are held briefly so a confidence rating given right
 * after (feeds spaced repetition) travels with the same attempt.
 */

export type Outcome = ApiOutcome
export type QProgress = QuestionProgress
type Store = Record<string, QuestionProgress>
export type Backend = 'unknown' | 'up' | 'down'

const LEGACY_KEY = 'nexora:gate-progress:v1'
const NOTES_KEY = 'nexora:gate-notes:v1'
const COLL_KEY = 'nexora:gate-collections:v1'
const cacheKey = (u: string) => `nexora:gate-progress:cache:${u}`
const queueKey = (u: string) => `nexora:gate-queue:${u}`

/* ── tiny storage helpers (every access guarded) ── */
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? (v as T) : fallback
  } catch {
    return fallback
  }
}
function writeJson(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* storage full or blocked */
  }
}
function removeKey(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/* ── dates ── */
export function todayISO(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number)
  return todayISO(new Date(y, m - 1, d + n))
}

/* ── Local spaced-repetition schedule (SM-2 flavoured; the server's wins) ── */
export function scheduleLocal(prev: ReviewState | undefined, outcome: Outcome, confidence?: 1 | 2 | 3): ReviewState {
  const today = todayISO()
  const ease0 = prev?.ease ?? 2.5
  const int0 = prev?.intervalDays ?? 0
  if (outcome === 'skipped') return prev ?? { due: null, intervalDays: 0, ease: ease0, streak: 0 }
  if (outcome !== 'correct') {
    return { due: addDays(today, 1), intervalDays: 1, ease: Math.max(1.3, ease0 - 0.2), streak: 0 }
  }
  const c = confidence ?? 2
  const ease = Math.min(3.2, Math.max(1.3, ease0 + (c === 1 ? -0.15 : c === 3 ? 0.15 : 0)))
  let interval: number
  if (int0 <= 0) interval = c === 1 ? 1 : c === 2 ? 3 : 6
  else interval = Math.max(1, Math.round(int0 * (c === 1 ? 1.2 : c === 2 ? ease : ease * 1.3)))
  return { due: addDays(today, interval), intervalDays: interval, ease, streak: (prev?.streak ?? 0) + 1 }
}

/** Human interval for buttons: "1d", "3d", "2w", "4mo". */
export function fmtInterval(days: number) {
  if (days < 14) return `${days}d`
  if (days < 60) return `${Math.round(days / 7)}w`
  return `${Math.round(days / 30)}mo`
}

/* ── State ── */
let user: string | null = null
let state: Store = {}
let backend: Backend = 'unknown'
let syncPromise: Promise<void> | null = null
let version = 0
const listeners = new Set<() => void>()
const emit = () => {
  version++
  listeners.forEach((l) => l())
}

type QueueItem =
  | { kind: 'attempt'; key: string; input: AttemptInput; holdUntil: number }
  | { kind: 'bookmark'; key: string; questionId: string; on: boolean; collections?: string[]; holdUntil: number }
const queue: QueueItem[] = []

function persist() {
  if (!user) return
  if (backend === 'down') writeJson(LEGACY_KEY, state)
  else writeJson(cacheKey(user), state)
  writeJson(queueKey(user), queue)
}

const isMissing = (e: unknown) => e instanceof ApiError && (e.status === 404 || e.status === 405 || e.status === 501)
const isOffline = (e: unknown) => e instanceof ApiError && (e.status === 0 || e.status >= 500)

function setBackend(b: Backend) {
  if (backend === b) return
  backend = b
  emit()
}

/** Old local entries → API shape (they only had outcome/bookmark/time). */
function fromLegacy(raw: Record<string, Partial<QuestionProgress> & { at?: number }>): Store {
  const out: Store = {}
  for (const [id, p] of Object.entries(raw)) {
    if (!p || typeof p !== 'object') continue
    const o = p.outcome
    out[id] = {
      ...p,
      attempts: p.attempts ?? (o === 'correct' || o === 'wrong' ? 1 : 0),
      correct: p.correct ?? (o === 'correct' ? 1 : 0),
      lastAt: p.lastAt ?? p.at,
    }
  }
  return out
}

async function sync(u: string) {
  // First paint from the last copy we had.
  const cached = readJson<Store>(cacheKey(u), {})
  const legacy = fromLegacy(readJson(LEGACY_KEY, {}))
  state = { ...cached, ...legacy }
  queue.splice(0, queue.length, ...readJson<QueueItem[]>(queueKey(u), []).map((q) => ({ ...q, holdUntil: 0 })))
  emit()
  try {
    const res = await gateApi.progress()
    setBackend('up')
    // Import whatever was practised on this device (once; then cleared).
    const rawLegacy = readJson<Record<string, { outcome?: string; bookmarked?: boolean; at?: number }>>(LEGACY_KEY, {})
    if (Object.keys(rawLegacy).length) {
      try {
        const slim: Record<string, { outcome?: string; bookmarked?: boolean; at?: number }> = {}
        for (const [id, p] of Object.entries(rawLegacy)) slim[id] = { outcome: p.outcome, bookmarked: p.bookmarked, at: p.at ?? (p as { lastAt?: number }).lastAt }
        await gateApi.importLocal(slim)
        removeKey(LEGACY_KEY)
        const again = await gateApi.progress()
        state = again.progress ?? {}
      } catch {
        state = { ...legacy, ...(res.progress ?? {}) }
      }
    } else {
      state = res.progress ?? {}
    }
    await pushLocalNotes()
    // Re-apply anything still waiting to be sent.
    for (const q of queue) applyQueued(q)
    persist()
    emit()
    void flush()
  } catch (e) {
    if (isMissing(e) || isOffline(e)) {
      setBackend(isMissing(e) ? 'down' : 'unknown')
      if (isMissing(e)) {
        // Keep the queued items locally — they're already in the local copy.
        state = { ...cached, ...legacy }
        queue.length = 0
        persist()
      }
      emit()
    }
  }
}

function applyQueued(q: QueueItem) {
  if (q.kind === 'bookmark') {
    state = { ...state, [q.questionId]: { ...(state[q.questionId] ?? { attempts: 0, correct: 0 }), bookmarked: q.on, collections: q.collections } }
  }
}

/** Make sure the store belongs to `username` and has synced once. */
export function ensureGateSync(username: string | null | undefined) {
  if (!username) return
  if (user === username && syncPromise) return
  user = username
  state = {}
  backend = 'unknown'
  syncPromise = sync(username).catch(() => undefined)
}

/** Resolves when the first sync has finished (for pages that need server data). */
export function gateReady() {
  return syncPromise ?? Promise.resolve()
}

/* ── Queue ── */
let flushing = false
let flushTimer: ReturnType<typeof setTimeout> | null = null
async function flush() {
  if (flushing || backend !== 'up' || !user) return
  flushing = true
  try {
    const now = Date.now()
    for (const item of [...queue]) {
      if (item.holdUntil > now) continue
      try {
        if (item.kind === 'attempt') {
          const r = await gateApi.attempt(item.input)
          const id = item.input.questionId
          if (r?.review) state = { ...state, [id]: { ...(state[id] ?? { attempts: 0, correct: 0 }), review: r.review } }
        } else {
          await gateApi.setBookmark(item.questionId, item.on, item.collections)
        }
        const i = queue.indexOf(item)
        if (i >= 0) queue.splice(i, 1)
      } catch (e) {
        if (isMissing(e)) {
          // The endpoint isn't there: fall back to device storage from now on.
          setBackend('down')
          queue.length = 0
          break
        }
        if (isOffline(e)) break
        // A 4xx for this item (bad id …): drop it.
        const i = queue.indexOf(item)
        if (i >= 0) queue.splice(i, 1)
      }
    }
    persist()
    emit()
  } finally {
    flushing = false
  }
  const nextHold = queue.filter((q) => q.holdUntil > Date.now()).map((q) => q.holdUntil)
  if (nextHold.length) scheduleFlush(Math.min(...nextHold) - Date.now() + 50)
}
function scheduleFlush(ms = 0) {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flush()
  }, Math.max(0, ms))
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (backend === 'unknown' && user) {
      syncPromise = sync(user).catch(() => undefined)
    } else scheduleFlush()
  })
  window.addEventListener('pagehide', () => {
    for (const q of queue) q.holdUntil = 0
    persist()
  })
}

/* ── Writes ── */

const HOLD_MS = 20_000
/** The schedule before the latest attempt, so a later confidence rating can redo it. */
const reviewBefore = new Map<string, ReviewState | undefined>()

/**
 * Record one answer. `hold` keeps it briefly so a confidence rating can join
 * it (see setConfidence / releaseAttempt). Returns the optimistic state.
 */
export function recordAttempt(input: AttemptInput & { outcome: Outcome }, opts: { hold?: boolean } = {}) {
  const { outcome, ...body } = input
  const id = body.questionId
  const prev = state[id] ?? { attempts: 0, correct: 0 }
  reviewBefore.set(id, prev.review)
  const counted = outcome !== 'revealed' && outcome !== 'skipped'
  const next: QuestionProgress = {
    ...prev,
    // A revealed answer never hides an earlier real result.
    outcome: outcome === 'revealed' && prev.outcome && prev.outcome !== 'revealed' ? prev.outcome : outcome,
    attempts: prev.attempts + (counted ? 1 : 0),
    correct: prev.correct + (outcome === 'correct' ? 1 : 0),
    lastAt: Date.now(),
    review: scheduleLocal(prev.review, outcome, body.confidence),
  }
  state = { ...state, [id]: next }
  if (backend !== 'down') {
    queue.push({ kind: 'attempt', key: `${id}:${Date.now()}`, input: body, holdUntil: opts.hold ? Date.now() + HOLD_MS : 0 })
    scheduleFlush(opts.hold ? HOLD_MS + 50 : 0)
  }
  persist()
  emit()
  return next
}

/** Attach a confidence rating to the latest held attempt (or reschedule locally). */
export function setConfidence(id: string, confidence: 1 | 2 | 3) {
  const p = state[id]
  if (!p || !p.outcome) return
  const before = reviewBefore.has(id) ? reviewBefore.get(id) : p.review
  state = { ...state, [id]: { ...p, review: scheduleLocal(before, p.outcome, confidence) } }
  for (let i = queue.length - 1; i >= 0; i--) {
    const q = queue[i]
    if (q.kind === 'attempt' && q.input.questionId === id) {
      q.input = { ...q.input, confidence }
      q.holdUntil = 0
      break
    }
  }
  persist()
  emit()
  scheduleFlush()
}

/** Send a held attempt now (the question was left). */
export function releaseAttempt(id: string) {
  let any = false
  for (const q of queue) {
    if (q.kind === 'attempt' && q.input.questionId === id && q.holdUntil > 0) {
      q.holdUntil = 0
      any = true
    }
  }
  if (any) scheduleFlush()
}

export function setBookmark(id: string, on: boolean, collections?: string[]) {
  const prev = state[id] ?? { attempts: 0, correct: 0 }
  state = { ...state, [id]: { ...prev, bookmarked: on, collections: on ? (collections ?? prev.collections) : [] } }
  if (backend !== 'down') {
    for (let i = queue.length - 1; i >= 0; i--) {
      const q = queue[i]
      if (q.kind === 'bookmark' && q.questionId === id) queue.splice(i, 1)
    }
    queue.push({ kind: 'bookmark', key: `${id}:b`, questionId: id, on, collections: on ? (collections ?? prev.collections) : [], holdUntil: 0 })
    scheduleFlush()
  }
  persist()
  emit()
}

export function toggleBookmark(id: string) {
  setBookmark(id, !state[id]?.bookmarked)
}

/** Kept for older call sites: patch a question's local state. */
export function updateProgress(id: string, patch: Partial<QuestionProgress>) {
  state = { ...state, [id]: { ...(state[id] ?? { attempts: 0, correct: 0 }), ...patch } }
  persist()
  emit()
}

/* ── Notes ── */

const noteCache = new Map<string, string>()

async function pushLocalNotes() {
  const local = readJson<Record<string, { text: string; updatedAt: number }>>(NOTES_KEY, {})
  const ids = Object.keys(local)
  if (!ids.length) return
  try {
    for (const id of ids) await gateApi.saveNote(id, local[id].text)
    removeKey(NOTES_KEY)
  } catch {
    /* try again next time */
  }
}

export async function loadNote(id: string): Promise<string> {
  if (noteCache.has(id)) return noteCache.get(id)!
  const local = readJson<Record<string, { text: string }>>(NOTES_KEY, {})
  if (backend !== 'down') {
    try {
      await gateReady()
      const r = await gateApi.note(id)
      const text = r.note?.text ?? local[id]?.text ?? ''
      noteCache.set(id, text)
      return text
    } catch (e) {
      if (isMissing(e)) setBackend('down')
    }
  }
  const text = local[id]?.text ?? ''
  noteCache.set(id, text)
  return text
}

/** Save a note (empty text deletes). Resolves to where it was saved. */
export async function saveNote(id: string, text: string): Promise<'server' | 'device'> {
  noteCache.set(id, text)
  const has = text.trim().length > 0
  if (!!state[id]?.hasNote !== has) {
    state = { ...state, [id]: { ...(state[id] ?? { attempts: 0, correct: 0 }), hasNote: has } }
    emit()
  }
  const saveLocal = () => {
    const local = readJson<Record<string, { text: string; updatedAt: number }>>(NOTES_KEY, {})
    if (has) local[id] = { text, updatedAt: Date.now() }
    else delete local[id]
    writeJson(NOTES_KEY, local)
    persist()
    return 'device' as const
  }
  if (backend === 'down') return saveLocal()
  try {
    await gateApi.saveNote(id, text)
    persist()
    return 'server'
  } catch (e) {
    if (isMissing(e)) setBackend('down')
    return saveLocal()
  }
}

/* ── Collections ── */

export interface LocalCollection {
  id: string
  name: string
  color?: string
  count: number
}

export async function loadCollections(): Promise<LocalCollection[]> {
  if (backend !== 'down') {
    try {
      await gateReady()
      const r = await gateApi.collections()
      return r.collections ?? []
    } catch (e) {
      if (isMissing(e)) setBackend('down')
    }
  }
  const names = readJson<LocalCollection[]>(COLL_KEY, [])
  return names.map((c) => ({ ...c, count: Object.values(state).filter((p) => p.collections?.includes(c.id)).length }))
}

export async function createCollection(name: string): Promise<LocalCollection> {
  if (backend !== 'down') {
    try {
      const r = await gateApi.createCollection(name)
      return r.collection
    } catch (e) {
      if (!isMissing(e)) throw e
      setBackend('down')
    }
  }
  const list = readJson<LocalCollection[]>(COLL_KEY, [])
  const c = { id: `local-${Date.now().toString(36)}`, name, count: 0 }
  writeJson(COLL_KEY, [...list, c])
  return c
}

/* ── Reads ── */

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** The whole map (re-renders on any change) and syncs with the server once. */
export function useGateProgress(): Store {
  const { user: u } = useAuth()
  useEffect(() => ensureGateSync(u?.username), [u?.username])
  return useSyncExternalStore(subscribe, () => state, () => state)
}

const EMPTY: QuestionProgress = { attempts: 0, correct: 0 }

/** One question's state. */
export function useQuestionProgress(id: string): QuestionProgress {
  const { user: u } = useAuth()
  useEffect(() => ensureGateSync(u?.username), [u?.username])
  return useSyncExternalStore(subscribe, () => state[id] ?? EMPTY, () => EMPTY)
}

/** Where progress is being saved right now. */
export function useGateBackend(): Backend {
  return useSyncExternalStore(subscribe, () => backend, () => backend)
}

/** Snapshot (non-reactive). */
export function getProgress(): Store {
  return state
}

export function useGateVersion() {
  return useSyncExternalStore(subscribe, () => version, () => version)
}

/** Question ids due for review today (local view of the schedule). */
export function localDueIds(store: Store = state, on = todayISO()) {
  return Object.entries(store)
    .filter(([, p]) => p.review?.due && p.review.due <= on)
    .sort((a, b) => (a[1].review!.due! < b[1].review!.due! ? -1 : 1))
    .map(([id]) => id)
}

/** Next 14 days: date → count due (local). */
export function localForecast(store: Store = state, days = 14) {
  const today = todayISO()
  const out: Record<string, number> = {}
  for (let i = 0; i < days; i++) out[addDays(today, i)] = 0
  for (const p of Object.values(store)) {
    const d = p.review?.due
    if (!d) continue
    const key = d < today ? today : d
    if (key in out) out[key]++
  }
  return out
}
