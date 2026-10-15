/**
 * Favicon + tab-title engine.
 *
 * The tab shows the static Traversal mark (public/brand/ngmark-flat.svg) and
 * costs nothing at rest — no timers, no canvas. Only while code is being
 * judged does a small signal run the mark's graph (the same BFS routes as the
 * logo), and an Accepted verdict gets one bright pass where the whole graph
 * lights up. Then the static icon comes back.
 *
 * Browsers forbid touching the real tab chrome, so the favicon + document.title
 * are the only surfaces we own; this makes the most of them, cheaply.
 */
import { BEADS, DIST, GLYPH_D, NODES, RAMP, ROUTES, weights, type NodeId } from '@/components/brand/traversal'

type Mode = 'idle' | 'busy'

const GRID = 32
const PX = 64 // canvas size — 2× the favicon's largest common render
const FRAME_MS = 66 // ~15fps is plenty for a 16px icon
const BASE_TITLE = 'NexoraGuru — Learn computer science, step by step'
const BURST_MS = 1100

let glyph: Path2D | null = null

/** Point at distance `d` along route `rt` (clamped to its end). */
function along(rt: readonly NodeId[], d: number): [number, number] {
  const end = DIST[rt[rt.length - 1]]
  const dd = Math.min(Math.max(d, 0), end)
  let k = 1
  while (k < rt.length - 1 && DIST[rt[k]] < dd) k++
  const p = NODES[rt[k - 1]], q = NODES[rt[k]]
  const f = (dd - DIST[rt[k - 1]]) / (DIST[rt[k]] - DIST[rt[k - 1]] || 1)
  return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]
}

/**
 * Paint one frame: the tile, the graph, and a signal at fraction `t` of the
 * longest route (both routes advance together, splitting at the junction).
 * `glow` 0..1 brightens the whole mark (the Accepted burst).
 */
function draw(ctx: CanvasRenderingContext2D, t: number, glow: number) {
  glyph ??= new Path2D(GLYPH_D)
  const w = weights(true)
  ctx.clearRect(0, 0, GRID, GRID)

  const bg = ctx.createLinearGradient(0, 0, 26, 32)
  bg.addColorStop(0, '#171b36')
  bg.addColorStop(0.6, '#0d0f1f')
  bg.addColorStop(1, '#08090f')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(0, 0, GRID, GRID, 7.2)
  ctx.fill()

  const ramp = ctx.createLinearGradient(5, 27, 27, 5)
  ramp.addColorStop(0, RAMP.dark[0])
  ramp.addColorStop(0.55, RAMP.dark[1])
  ramp.addColorStop(1, RAMP.dark[2])
  ctx.save()
  ctx.shadowColor = RAMP.dark[2]
  ctx.shadowBlur = glow * 6
  ctx.strokeStyle = ramp
  ctx.lineWidth = w.stroke
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(glyph)
  ctx.fillStyle = ramp
  for (const n of BEADS) {
    ctx.beginPath()
    ctx.arc(NODES[n][0], NODES[n][1], w.bead, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  const longest = Math.max(...ROUTES.map((r) => DIST[r[r.length - 1]]))
  for (const rt of ROUTES) {
    const [x, y] = along(rt, t * longest)
    ctx.save()
    ctx.shadowColor = RAMP.dark[2]
    ctx.shadowBlur = 8
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y, 2.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
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
