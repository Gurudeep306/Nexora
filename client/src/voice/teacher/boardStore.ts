/*
  The teacher's whiteboard: which lesson is on it and where it is. Shared by
  the voice command, the teacher's Board button and the board itself
  (Board.tsx, loaded only when it opens).
*/
import { useSyncExternalStore } from 'react'
import { api } from '@/lib/api'
import { getVoicePrefs } from '../prefs'

export type Shape =
  | { t: 'text'; id?: string; x: number; y: number; text: string; size: number; color: Ink }
  | { t: 'box'; id?: string; x: number; y: number; w: number; h: number; label: string; color: Ink }
  | { t: 'circle'; id?: string; x: number; y: number; r: number; label: string; color: Ink }
  | { t: 'arrow' | 'line'; id?: string; from: [number, number]; to: [number, number]; label: string; color: Ink }
  | { t: 'array'; id?: string; x: number; y: number; cell: number; values: string[]; highlight: number[]; pointers: { i: number; label: string }[]; label: string }
  | { t: 'clear' }
export type Ink = 'ink' | 'accent' | 'muted' | 'good' | 'bad'
export interface Lesson {
  title: string
  steps: { say: string; draw: Shape[] }[]
}

export interface BoardState {
  open: boolean
  topic: string
  loading: boolean
  error: string
  lesson: Lesson | null
}

let state: BoardState = { open: false, topic: '', loading: false, error: '', lesson: null }
const listeners = new Set<() => void>()
function set(patch: Partial<BoardState>) {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}
export function useBoard(): BoardState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => state,
    () => state,
  )
}

/** What "this" is when the student says "explain this on the board": the page's main heading. */
export function pageTopic(): string {
  const h1 = document.querySelector('main h1, h1')?.textContent?.trim()
  return (h1 || document.title || 'this page').slice(0, 120)
}

let ask = 0
/** Open the board and ask for a lesson on `topic` (with the page attached for context). */
export async function openBoard(topic: string, page: Record<string, unknown> = {}) {
  const my = ++ask
  const t = topic.trim().slice(0, 200)
  set({ open: true, topic: t, loading: true, error: '', lesson: null })
  try {
    const p = getVoicePrefs()
    const r = await api.post<{ ok: boolean; title: string; steps: Lesson['steps'] }>('/api/voice/board', { topic: t, page, lang: p.lang, teacher: p.teacher, teacherName: p.teacher ? (p.teacherNames[p.teacher] ?? '') : '' })
    if (my !== ask) return
    set({ loading: false, lesson: { title: r.title, steps: r.steps } })
  } catch (e) {
    if (my !== ask) return
    set({ loading: false, error: e instanceof Error && e.message ? e.message : 'The whiteboard couldn’t be drawn. Try again.' })
  }
}

export function closeBoard() {
  ask++
  set({ open: false, loading: false, error: '', lesson: null })
}

/** The shapes on the board after `upto` steps: "clear" wipes it; a shape with an id replaces the earlier one. */
export function shapesUpTo(lesson: Lesson, upto: number): { shape: Exclude<Shape, { t: 'clear' }>; step: number; key: string }[] {
  let out: { shape: Exclude<Shape, { t: 'clear' }>; step: number; key: string }[] = []
  lesson.steps.slice(0, upto + 1).forEach((s, step) => {
    s.draw.forEach((shape, i) => {
      if (shape.t === 'clear') {
        out = []
        return
      }
      const key = shape.id ? `id:${shape.id}` : `${step}:${i}`
      const at = shape.id ? out.findIndex((o) => o.key === key) : -1
      if (at >= 0) out[at] = { shape, step, key }
      else out.push({ shape, step, key })
    })
  })
  return out
}
