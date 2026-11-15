/**
 * Favicon + tab-title engine.
 *
 * The tab shows the static mark (public/brand/ngmark-flat.svg) and costs
 * nothing at rest — no timers, no canvas. Only while code is being judged does
 * a short bright segment travel the mark's graph, and an Accepted verdict
 * tints the tile green for a moment. Then the static icon comes back.
 *
 * Browsers forbid touching the real tab chrome, so the favicon + document.title
 * are the only surfaces we own; this makes the most of them, cheaply.
 */
import { GLYPH_D, MARK_SCALE, TILE_R, markStroke } from '@/components/brand/traversal'

type Mode = 'idle' | 'busy'

const GRID = 32
const PX = 64 // canvas size — 2× the favicon's largest common render
const FRAME_MS = 66 // ~15fps is plenty for a 16px icon
const BASE_TITLE = 'NexoraGuru — Learn computer science, step by step'
const BURST_MS = 1100
const TILE = '#16171a'
const INK = '#f4f4f5'
const OK = '#2f9e62'
const GLYPH_LEN = 18 + 20.12 + 18 + 10 + 10 + 8 + 5 // the NG path's length in glyph units

let glyph: Path2D | null = null

/**
 * Paint one frame: the tile, the graph drawn faintly, and a bright segment
 * travelling along it at fraction `t` (the traversal). `ok` 0..1 tints the
 * tile green for an Accepted verdict, then fades back.
 */
function draw(ctx: CanvasRenderingContext2D, t: number, ok: number) {
  glyph ??= new Path2D(GLYPH_D)
  ctx.clearRect(0, 0, GRID, GRID)
  ctx.fillStyle = ok > 0 ? mix(TILE, OK, ok) : TILE
  ctx.beginPath()
  ctx.roundRect(0, 0, GRID, GRID, TILE_R)
  ctx.fill()
  ctx.save()
  ctx.translate(16, 16)
  ctx.scale(MARK_SCALE, MARK_SCALE)
  ctx.translate(-16, -16)
  ctx.lineWidth = markStroke(true)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = ok > 0 ? INK : 'rgba(244,244,245,0.38)'
  ctx.stroke(glyph)
  if (ok <= 0) {
    // the signal: a third of the path, moving from the N's foot to the G's spur
    const seg = GLYPH_LEN / 3
    ctx.setLineDash([seg, GLYPH_LEN])
    ctx.lineDashOffset = -t * (GLYPH_LEN + seg) + seg
    ctx.strokeStyle = INK
    ctx.stroke(glyph)
  }
  ctx.restore()
}

function mix(a: string, b: string, f: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * f)).join(',')})`
}

let mode: Mode = 'idle'
let burstUntil = 0
let raf = 0
let last = 0
let t0 = 0
let link: HTMLLinkElement | null = null
let staticHref = ''
let staticType = ''
let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let enabled = false
// Other icon links (favicon.ico) are set aside while animating so the browser shows the live one.
let parked: { el: HTMLLinkElement; next: Node | null }[] = []

function stop() {
  cancelAnimationFrame(raf)
  raf = 0
  if (link && staticHref) {
    link.href = staticHref
    link.type = staticType
  }
  for (const { el, next } of parked) link?.parentNode?.insertBefore(el, next)
  parked = []
}

function frame(now: number) {
  const bursting = now < burstUntil
  if (mode !== 'busy' && !bursting) return stop()
  raf = requestAnimationFrame(frame)
  if (document.hidden || now - last < FRAME_MS || !ctx || !link) return
  last = now
  const period = bursting ? 700 : 1100
  const t = ((now - t0) % period) / period
  draw(ctx, t, bursting ? (burstUntil - now) / BURST_MS : 0)
  link.type = 'image/png'
  link.href = canvas!.toDataURL('image/png')
}

function start() {
  if (!enabled || raf) return
  t0 = last = performance.now()
  parked = [...document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')]
    .filter((l) => l !== link)
    .map((el) => ({ el, next: el.nextSibling }))
  for (const { el } of parked) el.remove()
  raf = requestAnimationFrame(frame)
}

/** Prepare the engine. Safe to call once at boot; a no-op under reduced motion. */
export function initFaviconFx() {
  if (enabled || typeof window === 'undefined' || typeof document === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return // keep the static icon
  link = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]') ?? document.querySelector('link[rel="icon"]')
  if (!link) return
  staticHref = link.href
  staticType = link.type
  canvas = document.createElement('canvas')
  canvas.width = canvas.height = PX
  ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(PX / GRID, PX / GRID)
  enabled = true
}

/** 'busy' while judging (a signal runs the graph), 'idle' otherwise (static icon). */
export function setFaviconMode(next: Mode) {
  mode = next
  if (next === 'busy') start()
}

/** One bright pass over the graph — call on an Accepted verdict. */
export function celebrateFavicon() {
  burstUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + BURST_MS
  start()
}

/** Prefix the tab title with an unread badge, e.g. "(3) NexoraGuru — …". */
export function setFaviconBadge(count: number) {
  if (typeof document === 'undefined') return
  const n = Math.max(0, Math.floor(count))
  document.title = n > 0 ? `(${n > 99 ? '99+' : n}) ${BASE_TITLE}` : BASE_TITLE
}
