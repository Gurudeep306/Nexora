/**
 * Animated favicon + tab-title engine.
 *
 * The NexoraGuru mark is "Diya Shirorekha": N and G hanging from one headline
 * bar with a diya flame — the guru's light — burning on it. We repaint the flat
 * (≤32 px) variant to a canvas and let the flame live: a slow, calm flicker
 * when idle, a quicker, brighter one while code is being judged, and a warm
 * bloom on an Accepted verdict.
 *
 * Browsers forbid touching the real tab chrome, so the favicon + document.title
 * are the only surfaces we own; this makes the most of them.
 */

type Mode = 'idle' | 'busy'

const GRID = 32 // artwork grid, matches public/brand/ngmark-flat.svg
const PX = 64 // canvas size — 2× the favicon's largest common render
const FRAME_MS = 50 // ~20fps — plenty for a 16px icon, cheap on battery
const BASE_TITLE = 'NexoraGuru — Learn computer science, step by step'

// Same geometry as public/brand/ngmark-flat.svg (scripts/brand/build-brand.mjs).
const GLYPH = [
  'M4 10H28V12H4Z',
  'M6 10H8V26H6Z',
  'M12 10H14V26H12Z',
  'M6 11H8.6L14 23.4V26H11.4L6 13.6Z',
  'M18 10V22.6Q18 26 21.4 26H22.6Q26 26 26 22.6V17H22V19H24V22.6Q24 24 22.6 24H21.4Q20 24 20 22.6V10Z',
]

/** Diya flame teardrop with its point at (cx + lean, tip) and belly resting on `base`. */
function flame(cx: number, tip: number, base: number, lean: number): Path2D {
  const h = base - tip
  const hw = 0.3 * h
  const by = base - hw
  const tx = cx + lean
  const p = new Path2D()
  p.moveTo(tx, tip)
  p.bezierCurveTo(tx + 0.2 * hw, tip + 0.28 * h, cx + hw, tip + 0.42 * h, cx + hw, by)
  p.arc(cx, by, hw, 0, Math.PI)
  p.bezierCurveTo(cx - hw, tip + 0.44 * h, tx - 0.25 * hw, tip + 0.3 * h, tx, tip)
  p.closePath()
  return p
}

let glyphPaths: Path2D[] | null = null

/**
 * Paint one frame.
 * @param flicker -1..1 sway/height wobble of the flame
 * @param heat    0..1 how bright the flame burns (idle ≈ .3, busy ≈ .8)
 * @param burst   0..1 celebratory bloom (spikes on an AC verdict)
 */
function drawMark(ctx: CanvasRenderingContext2D, flicker: number, heat: number, burst: number) {
  glyphPaths ??= GLYPH.map((d) => new Path2D(d))
  ctx.clearRect(0, 0, GRID, GRID)

  // Tile.
  const bg = ctx.createLinearGradient(0, 0, 0, GRID)
  bg.addColorStop(0, '#211c5f')
  bg.addColorStop(1, '#0d0b2c')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(0, 0, GRID, GRID, 7)
  ctx.fill()

  // Warm light pooling around the flame.
  const glowR = 9 + heat * 3 + burst * 8
  const glow = ctx.createRadialGradient(16, 7, 0, 16, 7, glowR)
  glow.addColorStop(0, `rgba(255,159,67,${0.22 + heat * 0.25 + burst * 0.4})`)
  glow.addColorStop(1, 'rgba(255,159,67,0)')
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(0, 0, GRID, GRID, 7)
  ctx.clip()
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, GRID, GRID)
  ctx.restore()

  // NG on its shirorekha, gold.
  const au = ctx.createLinearGradient(0, 10, 0, 26)
  au.addColorStop(0, burst > 0.05 ? '#fff0b8' : '#ffdd85')
  au.addColorStop(1, '#eaa93a')
  ctx.fillStyle = au
  for (const p of glyphPaths) ctx.fill(p)

  // The diya flame — height and lean breathe with `flicker`.
  const tip = 3.6 - flicker * 0.5 - burst * 1.2
  const lean = 0.2 + flicker * 0.35
  ctx.save()
  ctx.shadowColor = '#ff8a1f'
  ctx.shadowBlur = 2 + heat * 3 + burst * 6
  ctx.fillStyle = '#ff9a2e'
  ctx.fill(flame(16, tip, 10, lean))
  ctx.restore()
  ctx.fillStyle = '#ffe7a3'
  ctx.fill(flame(16, tip + 2.6, 9.7, lean * 0.5))
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
  // Two incommensurate sines read as a living flame rather than a metronome.
  const speed = mode === 'busy' || bursting ? 2.6 : 1
  const t = (now / 1000) * speed
  const flicker = 0.65 * Math.sin(t * 2.1) + 0.35 * Math.sin(t * 5.3 + 1.7)
  const heat = mode === 'busy' ? 0.8 : 0.3

  drawMark(ctx, flicker, heat, burst)
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
  link.removeAttribute('sizes')
  // Drop the static fallbacks (favicon.ico) so the browser shows the live one.
  document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach((l) => {
    if (l !== link) l.remove()
  })

  canvas = document.createElement('canvas')
  canvas.width = PX
  canvas.height = PX
  ctx = canvas.getContext('2d')!
  ctx.scale(PX / GRID, PX / GRID)

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

/** Prefix the tab title with an unread badge, e.g. "(3) NexoraGuru — …". */
export function setFaviconBadge(count: number) {
  if (typeof document === 'undefined') return
  const n = Math.max(0, Math.floor(count))
  document.title = n > 0 ? `(${n > 99 ? '99+' : n}) ${BASE_TITLE}` : BASE_TITLE
}
