/*
  Where the virtual teacher is and what it is doing, shared by the voice
  commands (TeacherHost, always mounted) and the 3D layer (TeacherLayer,
  loaded only when a teacher is on). Its place and "hidden" are remembered in
  this browser.
*/
import { useSyncExternalStore } from 'react'

export type Side = 'left' | 'right' | 'centre'
export type Status = 'off' | 'loading' | 'ready' | 'failed'
/** A one-off move the 3D layer plays (only when it is loaded). */
export type Move = 'wave' | 'namaste' | 'thumbs' | 'point' | 'turn'

export interface TeacherState {
  side: Side
  /** Standing at this x (px, page centre of the teacher) to point at something; null = at `side`. */
  atX: number | null
  sitting: boolean
  hidden: boolean
  status: Status
  /** 0–1 while the model downloads. */
  progress: number
  /** Why it failed, in plain words. */
  why: string
}

const LOCAL = 'nexora:teacher'
function saved(): Pick<TeacherState, 'side' | 'hidden'> {
  try {
    const r = JSON.parse(localStorage.getItem(LOCAL) ?? 'null') as Record<string, unknown> | null
    return { side: r?.side === 'left' || r?.side === 'centre' ? r.side : 'right', hidden: r?.hidden === true }
  } catch {
    return { side: 'right', hidden: false }
  }
}

let state: TeacherState = { ...saved(), atX: null, sitting: false, status: 'off', progress: 0, why: '' }
const listeners = new Set<() => void>()
const moveListeners = new Set<(m: Move) => void>()

export function getTeacher(): TeacherState {
  return state
}

export function setTeacher(patch: Partial<TeacherState>) {
  // Choosing a side ends standing beside something.
  state = { ...state, ...(patch.side ? { atX: null } : {}), ...patch }
  if ('side' in patch || 'hidden' in patch) {
    try {
      localStorage.setItem(LOCAL, JSON.stringify({ side: state.side, hidden: state.hidden }))
    } catch {
      /* private mode: kept for this visit */
    }
  }
  for (const l of listeners) l()
}

export function useTeacher(): TeacherState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => state,
    () => state,
  )
}

/** Point at a place on screen (viewport px), looking at it. */
export interface PointAt {
  x: number
  y: number
}
const pointListeners = new Set<(p: PointAt) => void>()
export function teacherPoint(p: PointAt) {
  for (const l of pointListeners) l(p)
}
export function onTeacherPoint(fn: (p: PointAt) => void): () => void {
  pointListeners.add(fn)
  return () => pointListeners.delete(fn)
}

/** Play a move (wave, namaste…). Ignored while no teacher is drawn. */
export function teacherMove(m: Move) {
  for (const l of moveListeners) l(m)
}
export function onTeacherMove(fn: (m: Move) => void): () => void {
  moveListeners.add(fn)
  return () => moveListeners.delete(fn)
}

/** Is the teacher on screen now (it then shows the "AI voice" label itself)? */
export function teacherShowing(): boolean {
  return state.status === 'ready' && !state.hidden
}
