/**
 * Animated favicon + tab-title engine.
 *
 * The Nexora mark is a graph walk — an "N" drawn as a path through four nodes,
 * from the open teal start (bottom-left) to the lit pink mastery node
 * (top-right). We repaint that mark to a canvas and send a glowing pulse along
 * the walk: slow and ambient when idle, fast and bright while code is being
 * judged, with a celebratory burst on an Accepted verdict. The pulse is the
 * idea behind the whole product — a problem travelling from first attempt to
 * mastery — shrunk to 16px and stuck on the browser tab.
 *
 * Browsers forbid touching the real tab chrome, so the favicon + document.title
 * are the only surfaces we own; this makes the most of them.
 */

type Mode = 'idle' | 'busy'

const SIZE = 64 // logical viewBox, matches public/nexora.svg
const SCALE = 2 // render resolution for crispness
const FRAME_MS = 50 // ~20fps — plenty for a 16px icon, cheap on battery
const BASE_TITLE = 'Nexora — Learn computer science, step by step'

// The N walk, in viewBox coordinates.
const PATH: ReadonlyArray<readonly [number, number]> = [
  [20, 45],
  [20, 19],
  [44, 45],
  [44, 19],
]

const SEG = (() => {
  const segs: number[] = []
  let total = 0
  for (let i = 0; i < PATH.length - 1; i++) {
    const len = Math.hypot(PATH[i + 1][0] - PATH[i][0], PATH[i + 1][1] - PATH[i][1])
    segs.push(len)
    total += len
  }
  return { segs, total }
})()

/** Point at fraction t (0..1) along the whole walk. */
function pointAt(t: number): [number, number] {
  const d = Math.min(1, Math.max(0, t)) * SEG.total
  let acc = 0
  for (let i = 0; i < SEG.segs.length; i++) {
    const len = SEG.segs[i]
    if (d <= acc + len) {
      const f = len === 0 ? 0 : (d - acc) / len
      return [PATH[i][0] + (PATH[i + 1][0] - PATH[i][0]) * f, PATH[i][1] + (PATH[i + 1][1] - PATH[i][1]) * f]
    }
    acc += len
  }
  const last = PATH[PATH.length - 1]
  return [last[0], last[1]]
}

const hexRgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const TEAL = hexRgb('#5eead4')
const VIOLET = hexRgb('#a78bfa')
const PINK = hexRgb('#ff7ab6')

/** Colour of the travelling pulse — teal → violet → pink, same ramp as the N. */
function pulseColor(t: number): string {
  const a = t < 0.5 ? TEAL : VIOLET
  const b = t < 0.5 ? VIOLET : PINK
  const f = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * f))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function strokeWalk(ctx: CanvasRenderingContext2D) {
  ctx.beginPath()
  ctx.moveTo(PATH[0][0], PATH[0][1])
  for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i][0], PATH[i][1])
  ctx.stroke()
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}

/**
 * Paint one frame.
 * @param t          pulse position 0..1 along the walk
 * @param pulseAlpha 0..1 opacity of the travelling pulse
 * @param burst      0..1 celebratory glow intensity (spikes on an AC verdict)
 */
function drawMark(ctx: CanvasRenderingContext2D, t: number, pulseAlpha: number, burst: number) {
  ctx.clearRect(0, 0, SIZE, SIZE)

  // Squircle background + ambient glows (clipped).
  ctx.save()
  roundRect(ctx, 2, 2, 60, 60, 15)
  ctx.clip()
  const bg = ctx.createLinearGradient(9.6, 0, 54.4, 64)
  bg.addColorStop(0, '#2a1f7a')
  bg.addColorStop(0.55, '#130f3d')
  bg.addColorStop(1, '#0a0820')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 64, 64)
  const g1 = ctx.createRadialGradient(17.9, 11.5, 0, 17.9, 11.5, 48)
  g1.addColorStop(0, 'rgba(124,92,255,0.75)')
  g1.addColorStop(0.6, 'rgba(124,92,255,0)')
  ctx.fillStyle = g1
  ctx.fillRect(0, 0, 64, 64)
  const g2 = ctx.createRadialGradient(54.4, 60.8, 0, 54.4, 60.8, 38.4)
  g2.addColorStop(0, 'rgba(255,79,154,0.45)')
  g2.addColorStop(1, 'rgba(255,79,154,0)')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.beginPath()
  ctx.ellipse(26, 4, 34, 13, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Rim.
  roundRect(ctx, 2.6, 2.6, 58.8, 58.8, 14.4)
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 1.2
  ctx.stroke()

  // The N — soft glow pass then the crisp gradient stroke.
  const ng = ctx.createLinearGradient(6.4, 57.6, 57.6, 6.4)
  ng.addColorStop(0, '#5eead4')
  ng.addColorStop(0.5, '#a78bfa')
  ng.addColorStop(1, '#ff7ab6')
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.save()
  ctx.globalAlpha = 0.55
  ctx.strokeStyle = ng
  ctx.lineWidth = 7
  ctx.shadowColor = 'rgba(167,139,250,0.9)'
  ctx.shadowBlur = 5 + burst * 9
  strokeWalk(ctx)
  ctx.restore()
  ctx.strokeStyle = ng
  ctx.lineWidth = 4.6
  strokeWalk(ctx)

  // Nodes: teal start, two white waypoints, lit pink mastery node.
  dot(ctx, 20, 45, 4.4, '#0c0a24')
  ctx.beginPath()
  ctx.arc(20, 45, 4.4, 0, Math.PI * 2)
  ctx.strokeStyle = '#5eead4'
  ctx.lineWidth = 2.4
  ctx.stroke()
  dot(ctx, 20, 19, 3.2, '#ffffff')
  dot(ctx, 44, 45, 3.2, '#ffffff')
  ctx.save()
  ctx.shadowColor = '#ff7ab6'
  ctx.shadowBlur = 6 + burst * 12
  ctx.beginPath()
  ctx.arc(44, 19, 4.4, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = '#ff7ab6'
  ctx.lineWidth = 2.4
  ctx.stroke()
  ctx.restore()

  // The travelling pulse.
  if (pulseAlpha > 0.01) {
    const [px, py] = pointAt(t)
    const col = pulseColor(t)
    ctx.save()
    ctx.globalAlpha = pulseAlpha
    ctx.shadowColor = col
    ctx.shadowBlur = 10 + burst * 8
    dot(ctx, px, py, 2.7, '#ffffff')
    ctx.globalAlpha = pulseAlpha * 0.9
    dot(ctx, px, py, 1.5, col)
    ctx.restore()
  }
}

let started = false
let last = 0
let mode: Mode = 'idle'
let burstUntil = 0
let link: HTMLLinkElement | null = null
let canvas: HTMLCanvasElement
let ctx: CanvasRenderingContext2D

function render(now: number) {
  const bursting = now < burstUntil
  const burst = bursting ? Math.max(0, (burstUntil - now) / 1400) : 0

  let t: number
  let alpha: number
  if (bursting) {
    // Fast, bright pass for the celebration.
    t = (now % 520) / 520
    alpha = 1
  } else if (mode === 'busy') {
    t = (now % 850) / 850
    alpha = 1
  } else {
    // Ambient: one calm traversal every ~3.6s, fading in and out at the ends.
    const period = 3600
    t = (now % period) / period
    alpha = Math.min(1, t * 6, (1 - t) * 6)
  }

  drawMark(ctx, t, alpha, burst)
  if (link) link.href = canvas.toDataURL('image/png')
}

function frame(now: number) {
  requestAnimationFrame(frame)
  if (document.hidden) return // nothing to see — don't burn cycles
  // Busy/celebration needs to feel responsive; the slow ambient pulse does not.
  const interval = mode === 'busy' || now < burstUntil ? FRAME_MS : FRAME_MS * 2
  if (now - last < interval) return
  last = now
  render(now)
}

/** Start the animation. Safe to call once at boot; a no-op if reduced-motion. */
export function initFaviconFx() {
  if (started) return
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return // keep the static SVG
  started = true

  link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = 'image/png'

  canvas = document.createElement('canvas')
  canvas.width = SIZE * SCALE
  canvas.height = SIZE * SCALE
  ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  requestAnimationFrame(frame)
}

/** Set the animation intensity: 'busy' while judging, 'idle' otherwise. */
export function setFaviconMode(next: Mode) {
  mode = next
}

/** One-shot celebratory burst — call on an Accepted verdict. */
export function celebrateFavicon() {
  burstUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 1400
}

/** Prefix the tab title with an unread badge, e.g. "(3) Nexora — …". */
export function setFaviconBadge(count: number) {
  if (typeof document === 'undefined') return
  const n = Math.max(0, Math.floor(count))
  document.title = n > 0 ? `(${n > 99 ? '99+' : n}) ${BASE_TITLE}` : BASE_TITLE
}
