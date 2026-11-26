/*
  The capture studio's viewfinder overlay, drawn from real measurements every frame:
  - the person's own face mesh (MediaPipe's 478 points and its feature outlines), so they see their
    features being read;
  - a scan ring around the face whose ticks light up for every head angle already captured, with the
    angle this shot wants marked;
  - a ring that fills while they hold still, then a sweep when the photo is taken.
*/
import { FaceLandmarker } from '@mediapipe/tasks-vision'
import type { Reading } from './coach'

export const TICKS = 48

type Edge = { start: number; end: number }
const FEATURES: Edge[][] = [
  FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
  FaceLandmarker.FACE_LANDMARKS_LIPS,
  FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
  FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
  FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
  FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
  FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
  FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
]
const MESH: Edge[] = FaceLandmarker.FACE_LANDMARKS_TESSELATION

export interface HudState {
  reading: Reading | null
  mirror: boolean
  green: boolean
  hold: number
  lit: Set<number>
  /** the tick the shot wants (null: straight on) */
  target: number | null
  /** 0..1 while the capture sweep runs, else -1 */
  sweep: number
  colors: { accent: string; success: string; warning: string }
  reduced: boolean
}

/** Screen position of a camera point, for a <video object-fit: cover>. */
export function mapper(cw: number, ch: number, vw: number, vh: number, mirror: boolean) {
  const s = Math.max(cw / vw, ch / vh)
  const ox = (cw - vw * s) / 2
  const oy = (ch - vh * s) / 2
  return (p: { x: number; y: number }) => {
    const x = ox + p.x * vw * s
    return { x: mirror ? cw - x : x, y: oy + p.y * vh * s }
  }
}

/** Which ring tick a head direction lights (null when the head faces the camera). */
export function tickFor(r: Reading, baseTilt: number, mirror: boolean): number | null {
  const dx = (mirror ? -1 : 1) * (r.yaw / 28)
  const dy = (r.tilt - baseTilt) / 0.07
  if (Math.hypot(dx, dy) < 0.65) return null
  const a = Math.atan2(dy, dx)
  return ((Math.round((a / (2 * Math.PI)) * TICKS) % TICKS) + TICKS) % TICKS
}

export function targetTick(arrow: 'left' | 'right' | 'up' | 'down' | undefined, mirror: boolean): number | null {
  if (!arrow) return null
  // The person's left is on the screen's left in a mirrored view.
  const ang = { left: mirror ? Math.PI : 0, right: mirror ? 0 : Math.PI, up: -Math.PI / 2, down: Math.PI / 2 }[arrow]
  return ((Math.round((ang / (2 * Math.PI)) * TICKS) % TICKS) + TICKS) % TICKS
}

export function drawHud(ctx: CanvasRenderingContext2D, cw: number, ch: number, vw: number, vh: number, st: HudState, t: number) {
  ctx.clearRect(0, 0, cw, ch)
  const r = st.reading
  if (!r || !vw || !vh) return
  const map = mapper(cw, ch, vw, vh, st.mirror)
  const P = r.points.map(map)
  // Face box on screen.
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of P) {
    x0 = Math.min(x0, p.x)
    y0 = Math.min(y0, p.y)
    x1 = Math.max(x1, p.x)
    y1 = Math.max(y1, p.y)
  }
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const R = Math.max(x1 - x0, y1 - y0) * 0.66
  const live = st.green ? st.colors.success : 'rgba(255,255,255,0.92)'

  // Mesh: faint triangles, then the features drawn clearly.
  ctx.lineWidth = 0.5
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.beginPath()
  for (const e of MESH) {
    const a = P[e.start]
    const b = P[e.end]
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
  }
  ctx.stroke()
  ctx.lineWidth = 1.4
  ctx.strokeStyle = live
  ctx.beginPath()
  for (const f of FEATURES)
    for (const e of f) {
      const a = P[e.start]
      const b = P[e.end]
      if (!a || !b) continue
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
    }
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let i = 0; i < P.length; i += 3) ctx.fillRect(P[i].x - 0.6, P[i].y - 0.6, 1.2, 1.2)

  // Scan ring.
  const pulse = st.reduced ? 1 : 0.55 + 0.45 * Math.sin(t / 260)
  for (let k = 0; k < TICKS; k++) {
    const a = (k / TICKS) * Math.PI * 2
    const lit = st.lit.has(k)
    const near = st.target !== null && Math.min(Math.abs(k - st.target), TICKS - Math.abs(k - st.target)) <= 3
    const len = lit ? 16 : near ? 14 : 9
    ctx.strokeStyle = lit ? st.colors.success : near ? st.colors.accent : 'rgba(255,255,255,0.35)'
    ctx.globalAlpha = near && !lit ? pulse : 1
    ctx.lineWidth = lit || near ? 3 : 2
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R)
    ctx.lineTo(cx + Math.cos(a) * (R + len), cy + Math.sin(a) * (R + len))
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // Hold ring: fills while every check stays green.
  if (st.hold > 0) {
    ctx.strokeStyle = st.colors.success
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(cx, cy, R - 8, -Math.PI / 2, -Math.PI / 2 + st.hold * Math.PI * 2)
    ctx.stroke()
    ctx.lineCap = 'butt'
  }

  // Capture sweep.
  if (st.sweep >= 0) {
    const y = y0 - 10 + (y1 - y0 + 20) * st.sweep
    ctx.fillStyle = st.colors.success
    ctx.globalAlpha = 0.9
    ctx.fillRect(x0 - 16, y - 1, x1 - x0 + 32, 2)
    ctx.globalAlpha = 0.14
    ctx.fillRect(x0 - 16, y0 - 10, x1 - x0 + 32, y - y0 + 10)
    ctx.globalAlpha = 1
  }
}

export function cssColors() {
  const cs = getComputedStyle(document.documentElement)
  const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d
  return { accent: v('--color-accent-brand', '#c2410c'), success: v('--color-state-success', '#16a34a'), warning: v('--color-state-warning', '#d97706') }
}
