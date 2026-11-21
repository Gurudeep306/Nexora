/*
  Which animation is the student talking to? Every animation player on the
  page registers a handle; the one touched most recently wins, else the one
  most in view. The mic sends scene commands ("swap pe ruko") to it.
*/
import type { Frame } from '../../learn/engine/types'
import type { WhatIf } from './parse'

export interface SceneHandle {
  id: string
  title: string
  el: () => HTMLElement | null
  frames: () => Frame[]
  at: () => number
  go: (i: number) => void
  play: () => void
  pause: () => void
  replay: () => void
  speed: (to: 'slower' | 'faster' | 'normal') => void
  /** Re-run on new input; returns what was done, or an error to say. */
  whatIf?: (input: WhatIf) => { say: string } | { error: string }
  predict: (on: boolean) => void
  /** True while the player waits for the student's guess. */
  awaitingGuess: () => boolean
  /** The student's spoken guess for the next step; returns feedback. */
  guess: (text: string) => string
}

const handles = new Map<string, { h: SceneHandle; touched: number }>()

export function registerScene(h: SceneHandle): () => void {
  handles.set(h.id, { h, touched: 0 })
  return () => {
    if (handles.get(h.id)?.h === h) handles.delete(h.id)
  }
}

export function touchScene(id: string) {
  const e = handles.get(id)
  if (e) e.touched = Date.now()
}

function visibleShare(el: HTMLElement): number {
  const r = el.getBoundingClientRect()
  const h = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0))
  const w = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0))
  return r.height > 0 && r.width > 0 ? (h * w) / (r.height * r.width) : 0
}

/** The animation the student most likely means, if one is on screen. */
export function activeScene(): SceneHandle | null {
  let best: { h: SceneHandle; score: number } | null = null
  const now = Date.now()
  for (const { h, touched } of handles.values()) {
    const el = h.el()
    if (!el || !el.isConnected) continue
    const share = visibleShare(el)
    if (share <= 0.15) continue
    // Touched in the last 2 minutes beats merely visible.
    const score = share + (now - touched < 120_000 ? 2 : 0)
    if (!best || score > best.score) best = { h, score }
  }
  return best?.h ?? null
}
