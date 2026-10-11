/* Geometry and persistence for the floating assistant: the launcher bubble
 * and the chat window. Everything is clamped to the viewport, leaves room for
 * the top bar and the phone tab bar / safe area, and is remembered in
 * localStorage (when storage works). */
import { useEffect, useState } from 'react'

export const BUBBLE = 52
export const EDGE = 12
export const MIN_W = 320
export const MIN_H = 360
/** Below this width the chat opens as a bottom sheet. */
export const SHEET_BREAKPOINT = 640

export interface Viewport {
  w: number
  h: number
  /** Space to keep clear at the top (top bar). */
  top: number
  /** Space to keep clear at the bottom (mobile tab bar + safe area). */
  bottom: number
}

export interface BubblePos {
  side: 'left' | 'right'
  y: number
}

export interface WinRect {
  x: number
  y: number
  w: number
  h: number
}

export type Layout = 'float' | 'docked'

let safeBottomCache: number | null = null
function safeAreaBottom(): number {
  if (safeBottomCache != null) return safeBottomCache
  try {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom)'
    document.body.appendChild(probe)
    safeBottomCache = parseFloat(getComputedStyle(probe).paddingBottom) || 0
    probe.remove()
  } catch {
    safeBottomCache = 0
  }
  return safeBottomCache
}

export function readViewport(): Viewport {
  const w = window.innerWidth
  const h = window.innerHeight
  // Top bar is 56px; the phone tab bar (md:hidden) is 56px plus the safe area.
  const tabBar = w < 768 ? 56 + safeAreaBottom() : 0
  return { w, h, top: 64, bottom: tabBar + EDGE }
}

export function useViewport(): Viewport {
  const [vp, setVp] = useState(readViewport)
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setVp(readViewport()))
    }
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
    }
  }, [])
  return vp
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi))

export function clampBubbleY(y: number, vp: Viewport): number {
  return clamp(y, vp.top, vp.h - vp.bottom - BUBBLE)
}

/** Free position while dragging, kept fully on screen. */
export function clampBubbleXY(x: number, y: number, vp: Viewport) {
  return { x: clamp(x, EDGE, vp.w - BUBBLE - EDGE), y: clampBubbleY(y, vp) }
}

export function bubbleLeft(side: BubblePos['side'], vp: Viewport): number {
  return side === 'left' ? EDGE : vp.w - BUBBLE - EDGE
}

/** Snap a released bubble to the nearest side edge. */
export function snapBubble(x: number, y: number, vp: Viewport): BubblePos {
  return { side: x + BUBBLE / 2 < vp.w / 2 ? 'left' : 'right', y: clampBubbleY(y, vp) }
}

export function defaultBubble(vp: Viewport): BubblePos {
  return { side: 'right', y: clampBubbleY(vp.h - vp.bottom - BUBBLE - 16, vp) }
}

export function clampRect(r: WinRect, vp: Viewport): WinRect {
  const w = clamp(r.w, Math.min(MIN_W, vp.w - 16), vp.w - 16)
  const h = clamp(r.h, Math.min(MIN_H, vp.h - 16), vp.h - 16)
  return { w, h, x: clamp(r.x, 8, vp.w - w - 8), y: clamp(r.y, 8, vp.h - h - 8) }
}

export function defaultRect(vp: Viewport): WinRect {
  const w = Math.min(420, vp.w - 32)
  const h = Math.min(640, vp.h - vp.top - 24)
  return clampRect({ w, h, x: vp.w - w - 20, y: vp.h - h - Math.max(vp.bottom, 20) }, vp)
}

/* ── persistence ── */
const KEY = 'nexora:agent:float'

interface Saved {
  bubble?: BubblePos
  rect?: WinRect
  layout?: Layout
}

export function loadFloating(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as Saved
    const out: Saved = {}
    const b = raw.bubble
    if (b && (b.side === 'left' || b.side === 'right') && Number.isFinite(b.y)) out.bubble = { side: b.side, y: b.y }
    const r = raw.rect
    if (r && [r.x, r.y, r.w, r.h].every(Number.isFinite)) out.rect = { x: r.x, y: r.y, w: r.w, h: r.h }
    if (raw.layout === 'float' || raw.layout === 'docked') out.layout = raw.layout
    return out
  } catch {
    return {}
  }
}

export function saveFloating(patch: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadFloating(), ...patch }))
  } catch {
    /* storage unavailable: positions just aren't remembered */
  }
}

/** Pixels a pointer must travel before a press becomes a drag (so a tap still clicks). */
export const DRAG_THRESHOLD = 5
