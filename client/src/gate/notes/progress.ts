/*
  Study state per lesson: completed, reading position and bookmark.

  Signed in: the server (gate_notes_progress) is the source of truth; every
  change is also mirrored to localStorage so the page stays instant. Signed
  out, or while the server can't be reached: localStorage only. Keys are
  "subject/lesson". Reading position is chatty, so it is written to the
  server at most every 20 s, only when it moved by 5 points or more, and
  once more when the page is hidden.

  Later steps (highlights, margin notes, revision cards) keep their own
  stores; this one stays the small "where am I" record.
*/
import { useEffect, useSyncExternalStore } from 'react'
import { useAuth } from '@/context/AuthContext'
import { notesApi } from './api'
import type { LessonProgress } from './types'

type Map = Record<string, LessonProgress>

const EMPTY: LessonProgress = { completed: false, scrollPct: 0, bookmarked: false, updatedAt: 0 }
const SCROLL_EVERY_MS = 20_000

let user: string | null = null
let state: Map = {}
let started = false
const loadedSubjects = new Set<string>()
const listeners = new Set<() => void>()
const sentScroll = new globalThis.Map<string, { pct: number; at: number }>()
const pendingScroll = new globalThis.Map<string, number>()

const storageKey = () => `nexora:notes:progress:${user ?? 'guest'}`

function readLocal(): Map {
  try {
    const v = JSON.parse(localStorage.getItem(storageKey()) || '{}')
    return v && typeof v === 'object' ? (v as Map) : {}
  } catch {
    return {}
  }
}
function writeLocal() {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(state))
  } catch {
    /* storage full or blocked */
  }
}
const emit = () => listeners.forEach((l) => l())

/** Switch stores when the signed-in user changes (null = signed out). */
export function setNotesUser(next: string | null) {
  if (started && next === user) return
  started = true
  flushScroll()
  user = next
  state = readLocal()
  loadedSubjects.clear()
  sentScroll.clear()
  emit()
}

async function loadSubject(subject: string) {
  if (!user || loadedSubjects.has(subject)) return
  loadedSubjects.add(subject)
  try {
    const server = await notesApi.progress(subject === '*' ? undefined : subject)
    // Server wins, except for anything changed here more recently.
    const merged: Map = { ...state }
    for (const [k, v] of Object.entries(server)) if (!merged[k] || merged[k]!.updatedAt <= v.updatedAt) merged[k] = v
    state = merged
    for (const [k, v] of Object.entries(server)) sentScroll.set(k, { pct: v.scrollPct, at: 0 })
    writeLocal()
    emit()
  } catch {
    loadedSubjects.delete(subject) // offline: try again next mount
  }
}

function patch(subject: string, lesson: string, p: Partial<LessonProgress>) {
  const key = `${subject}/${lesson}`
  state = { ...state, [key]: { ...EMPTY, ...state[key], ...p, updatedAt: Date.now() } }
  writeLocal()
  emit()
}

function send(subject: string, lesson: string, body: Partial<LessonProgress>, keepalive = false) {
  if (!user) return
  notesApi.saveProgress(subject, lesson, body, keepalive).catch(() => {
    /* kept locally; the next change or visit retries */
  })
}

export function setCompleted(subject: string, lesson: string, completed: boolean) {
  patch(subject, lesson, { completed })
  send(subject, lesson, { completed })
}

export function setBookmarked(subject: string, lesson: string, bookmarked: boolean) {
  patch(subject, lesson, { bookmarked })
  send(subject, lesson, { bookmarked })
}

/** Record the reading position (0–100). Cheap to call on every scroll frame. */
export function reportScroll(subject: string, lesson: string, pct: number) {
  const key = `${subject}/${lesson}`
  const v = Math.max(0, Math.min(100, Math.round(pct)))
  if (state[key]?.scrollPct === v) return
  patch(subject, lesson, { scrollPct: v })
  pendingScroll.set(key, v)
  const last = sentScroll.get(key)
  if (!last || (Math.abs(last.pct - v) >= 5 && Date.now() - last.at >= SCROLL_EVERY_MS)) flushScroll(key)
}

/** Send any reading positions that moved since the last write. */
export function flushScroll(only?: string, keepalive = false) {
  for (const [key, pct] of pendingScroll) {
    if (only && key !== only) continue
    pendingScroll.delete(key)
    const last = sentScroll.get(key)
    if (last && Math.abs(last.pct - pct) < 5 && pct !== 100) continue
    sentScroll.set(key, { pct, at: Date.now() })
    const [subject, lesson] = key.split('/') as [string, string]
    send(subject, lesson, { scrollPct: pct }, keepalive)
  }
}

if (typeof window !== 'undefined') {
  const flushAll = () => flushScroll(undefined, true)
  window.addEventListener('pagehide', flushAll)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushAll())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}
const snapshot = () => state

/** Progress of every lesson (keys "subject/lesson"), loading `subject` from the server once. */
export function useNotesProgress(subject?: string): Map {
  const username = useAuth().user?.username ?? null
  const map = useSyncExternalStore(subscribe, snapshot, snapshot)
  useEffect(() => {
    setNotesUser(username)
    if (subject) void loadSubject(subject)
  }, [username, subject])
  return map
}

export const progressOf = (map: Map, subject: string, lesson: string): LessonProgress => map[`${subject}/${lesson}`] ?? EMPTY
