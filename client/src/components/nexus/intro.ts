/*
 * The Nexus opening: one timeline the canvas and the HUD both read.
 *
 * The choreography is written against a 2,000 ms "full" clock; the short
 * repeat (later in the same session, or coming back) plays the same beats
 * compressed to 800 ms, and reduced motion is a quick fade. Any click,
 * scroll or key skips straight to the end.
 */

export type IntroMode = 'full' | 'short' | 'fade'

export const INTRO_CLOCK = 2000
const DURATION: Record<IntroMode, number> = { full: 2000, short: 800, fade: 220 }
const SEEN = 'nexus:intro:v1'
export const INTRO_SKIP = 'nexus:intro-skip'

/** The intro for this open (marks the session as having seen the full one). */
let last: { at: number; pick: { mode: IntroMode; dur: number } } | null = null
export function pickIntro(reduce: boolean, seen: () => boolean = readSeen, now = Date.now()): { mode: IntroMode; dur: number } {
  // The same answer for a moment (React may build the page twice on mount).
  if (last && now - last.at < 1500 && seen === readSeen) return last.pick
  const mode: IntroMode = reduce ? 'fade' : seen() ? 'short' : 'full'
  if (mode === 'full' && seen === readSeen) markSeen()
  const pick = { mode, dur: DURATION[mode] }
  if (seen === readSeen) last = { at: now, pick }
  return pick
}

function readSeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN) === '1'
  } catch {
    return false
  }
}
function markSeen() {
  try {
    sessionStorage.setItem(SEEN, '1')
  } catch {
    /* storage blocked: every open plays the full intro */
  }
}

/** Where the intro is, on the full clock (0 … INTRO_CLOCK). */
export function introClock(now: number, t0: number, dur: number): number {
  if (dur <= 0) return INTRO_CLOCK
  return Math.max(0, Math.min(INTRO_CLOCK, ((now - t0) / dur) * INTRO_CLOCK))
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
/** 0 → 1 between two moments of the full clock, eased out (cubic). */
export function seg(T: number, a: number, b: number): number {
  const t = clamp01((T - a) / Math.max(1, b - a))
  return 1 - Math.pow(1 - t, 3)
}
/** A small overshoot ("pop") for dots appearing. */
export function pop(T: number, a: number, b: number): number {
  const t = clamp01((T - a) / Math.max(1, b - a))
  const c1 = 1.70158
  const c3 = c1 + 1
  return t === 0 ? 0 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
/** The moment (full clock) one of `n` staggered items starts within [a, b). */
export function stagger(i: number, n: number, a: number, b: number): number {
  return n <= 1 ? a : a + ((b - a) * i) / (n - 1)
}
