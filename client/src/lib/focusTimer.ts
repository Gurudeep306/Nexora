/*
  Focus timer: study in blocks (25 minutes on, 5 off by default). The clock is
  an end time, not a counter, so it keeps true time across reloads, sleeping
  tabs and other tabs (they share it through localStorage). Today's finished
  blocks are counted on this device only; nothing is sent anywhere.
*/
import { useSyncExternalStore } from 'react'

export type Phase = 'idle' | 'focus' | 'break'
export type Plan = { id: string; focus: number; rest: number; label: string }

export const PLANS: Plan[] = [
  { id: 'short', focus: 15, rest: 3, label: '15 / 3' },
  { id: 'classic', focus: 25, rest: 5, label: '25 / 5' },
  { id: 'long', focus: 50, rest: 10, label: '50 / 10' },
]

export type FocusState = {
  phase: Phase
  /** Epoch ms when the running block ends; null while idle or paused. */
  endsAt: number | null
  /** Ms left when paused; null while running or idle. */
  pausedLeft: number | null
  plan: string
  day: string
  blocks: number
  minutes: number
}

const KEY = 'nexora:focus'
const today = () => new Date().toLocaleDateString('en-CA')
const planOf = (id: string) => PLANS.find((p) => p.id === id) ?? PLANS[1]

function fresh(): FocusState {
  return { phase: 'idle', endsAt: null, pausedLeft: null, plan: 'classic', day: today(), blocks: 0, minutes: 0 }
}

function read(): FocusState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = { ...fresh(), ...(JSON.parse(raw) as Partial<FocusState>) }
      // A new day starts a new count; a running block carries on.
      if (s.day !== today()) Object.assign(s, { day: today(), blocks: 0, minutes: 0 })
      return s
    }
  } catch {
    /* blocked storage: the timer still works for this visit */
  }
  return fresh()
}

let state = read()
const subs = new Set<() => void>()

function set(next: FocusState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  subs.forEach((f) => f())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = read()
      subs.forEach((f) => f())
    }
  })
}

export function useFocus(): FocusState {
  return useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => state,
  )
}

export function timeLeft(s: FocusState, now = Date.now()): number {
  if (s.pausedLeft != null) return s.pausedLeft
  if (s.endsAt != null) return Math.max(0, s.endsAt - now)
  return planOf(s.plan).focus * 60_000
}

export function blockLength(s: FocusState): number {
  const p = planOf(s.plan)
  return (s.phase === 'break' ? p.rest : p.focus) * 60_000
}

export const focus = {
  start() {
    set({ ...state, phase: 'focus', endsAt: Date.now() + planOf(state.plan).focus * 60_000, pausedLeft: null })
  },
  pause() {
    if (state.endsAt == null) return
    set({ ...state, pausedLeft: Math.max(0, state.endsAt - Date.now()), endsAt: null })
  },
  resume() {
    if (state.pausedLeft == null) return
    set({ ...state, endsAt: Date.now() + state.pausedLeft, pausedLeft: null })
  },
  reset() {
    set({ ...state, phase: 'idle', endsAt: null, pausedLeft: null })
  },
  setPlan(id: string) {
    if (state.phase !== 'idle') return
    set({ ...state, plan: planOf(id).id })
  },
  /**
   * The running block is over (or skipped). A finished focus block counts
   * toward today and starts the break; a finished break returns to idle.
   * `counted` is false for a skip, so skipped focus never counts.
   */
  finish(counted: boolean) {
    const p = planOf(state.plan)
    const base = state.day === today() ? state : { ...state, day: today(), blocks: 0, minutes: 0 }
    if (state.phase === 'focus') {
      set({
        ...base,
        phase: 'break',
        endsAt: Date.now() + p.rest * 60_000,
        pausedLeft: null,
        blocks: base.blocks + (counted ? 1 : 0),
        minutes: base.minutes + (counted ? p.focus : 0),
      })
    } else {
      set({ ...base, phase: 'idle', endsAt: null, pausedLeft: null })
    }
  },
}

/**
 * Called by the ticker in every open tab. Only the first tab to see the block
 * end acts: it re-reads the shared state first, so a block is counted once.
 * Returns the phase that just ended, or null.
 */
export function finishIfDue(now = Date.now()): Phase | null {
  state = read()
  if (state.endsAt == null || state.endsAt > now) return null
  const ended = state.phase
  focus.finish(true)
  return ended
}

export function fmtClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
