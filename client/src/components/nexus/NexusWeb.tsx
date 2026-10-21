import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { BRAND, BUCKETS, buildWeb, mix3, pathFromOrigin, SP, treePath, type RGB, type Web } from './lattice'
import type { WebCluster } from './types'

/*
 * The Nexus web: the teaser's lattice web, with every subject living inside
 * it (see ./lattice.ts for how it is built), floating in space.
 *
 * Depth, in three layers:
 *   far   a softer, dimmer lattice drifting slower than the web,
 *   mid   the web itself (lattice + spanning tree), drawn flat into a canvas
 *         that lies on a tilted plane in true CSS perspective; the far edge
 *         recedes into fog,
 *   near  everything you touch, projected from the plane with the same
 *         maths and drawn crisp on top: concepts floating above the plane
 *         with soft contact shadows, lit paths arcing off it, YOU, and all
 *         the type.
 * The plane bobs slowly and leans toward the pointer; panning glides to a
 * stop. Reduced motion keeps the tilt and drops bob, lean and glide.
 *
 *  • On load the web draws itself outward from YOU, depth by depth (0.11 s
 *    per depth, 0.22 s per edge), like the teaser.
 *  • Hover a concept: the path from YOU lights teal with a light travelling
 *    along it; what it unlocks lights violet; the rest dims.
 *  • Click a concept: its name, place and numbers appear as type beside it,
 *    with "Open details". Click a subject name to dive into its path.
 *  • The only glow is the soft violet halo around YOU.
 */

export interface Camera {
  x: number
  y: number
  k: number
}
export interface NexusWebHandle {
  flyToNode: (key: string, instant?: boolean) => void
  camera: () => Camera
}
/** Tier shown under a subject's name (from the server). */
export interface RegionRank {
  tier: string
  title: string
}

const DT = 0.11
const EDGE = 0.22
const T0 = 0.35
const MAX_K = 3
const LABEL_K = 1.15 // concept names from this zoom (collision-culled)
const HOME_K = 0.62 // the teaser's density
const HOME_K_PHONE = 0.5
const TILT = 26 // degrees: the web plane leans back
const PERSPECTIVE = 1000
const PLANE_W = 1.42 // the plane is larger than the window so the tilt never shows an edge
const PLANE_H = 1.62
const { C1, C2, C3 } = BRAND

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`
const WHITE: RGB = [255, 255, 255]
const DIM: RGB = [150, 160, 255]
const BG: RGB = [9, 11, 24]
const RAD = Math.PI / 180

export const NexusWeb = forwardRef<
  NexusWebHandle,
  {
    clusters: WebCluster[]
    selected: string | null
    onSelect: (key: string | null) => void
    onOpenSubject: (id: string, cam: Camera) => void
    /** "Open details" on the selected concept's floating text. */
    onOpenDetails?: (key: string) => void
    /** First pointer / wheel / key interaction (the hint fades out). */
    onInteract?: () => void
    initialCamera?: Camera | null
    /** The details sheet is open: the selection's floating text steps aside. */
    quiet?: boolean
    ranks?: Record<string, RegionRank>
  }
>(function NexusWeb({ clusters, selected, onSelect, onOpenSubject, onOpenDetails, onInteract, initialCamera, ranks, quiet = false }, ref) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const midRef = useRef<HTMLCanvasElement>(null)
  const farRef = useRef<HTMLCanvasElement>(null)
  const nearRef = useRef<HTMLCanvasElement>(null)
  const reduce = !!useReducedMotion()
  const web = useMemo<Web>(() => buildWeb(clusters), [clusters])

  // Static paths, built once per web: the tree by colour bucket, and the
  // branches that lead to mastered concepts.
  const paths = useMemo(() => {
    const { xy, parent, bucket } = web
    const tree: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D())
    for (let i = 0; i < parent.length; i++) {
      const p = parent[i]
      if (p < 0) continue
      tree[bucket[i]].moveTo(xy[2 * p], xy[2 * p + 1])
      tree[bucket[i]].lineTo(xy[2 * i], xy[2 * i + 1])
    }
    const lit = new Uint8Array(parent.length)
    for (const c of web.concepts.values()) {
      if (c.node.s !== 2) continue
      for (let x = c.pt; x >= 0 && !lit[x]; x = parent[x]) lit[x] = 1
    }
    const bright: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D())
    for (let i = 0; i < parent.length; i++) {
      const p = parent[i]
      if (!lit[i] || p < 0) continue
      bright[bucket[i]].moveTo(xy[2 * p], xy[2 * p + 1])
      bright[bucket[i]].lineTo(xy[2 * i], xy[2 * i + 1])
    }
    const colors = Array.from({ length: BUCKETS }, (_, b) => mix3((b + 0.5) / BUCKETS))
    return { tree, bright, colors, lit }
  }, [web])

  const ox = web.xy[2 * web.origin]
  const oy = web.xy[2 * web.origin + 1]
  const cam = useRef<Camera>(initialCamera ?? { x: ox, y: oy, k: HOME_K })
  const view = useRef({ w: 1, h: 1, dpr: 1, pw: 1, ph: 1, pdpr: 1 })
  /** Current plane rotation (degrees), shared by CSS and the projection. */
  const pose = useRef({ tx: TILT, ty: 0 })
  const hovered = useRef<string | null>(null)
  const hoverEase = useRef(0)
  const lean = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const inertia = useRef<{ vx: number; vy: number } | null>(null)
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const fly = useRef<{ from: Camera; to: Camera; t0: number; dur: number; done?: () => void } | null>(null)
  const rise = useRef<number | null>(null)
  const born = useRef<number | null>(null)
  const settled = useRef(0)
  const dirtyStatic = useRef(true)
  const labelHits = useRef<{ x: number; y: number; w: number; h: number; id: string }[]>([])
  const projected = useRef<{ key: string; x: number; y: number }[]>([])
  const openHit = useRef<{ x: number; y: number; w: number; h: number; key: string } | null>(null)
  const interacted = useRef(false)
  const cbs = useRef({ onSelect, onOpenSubject, onOpenDetails, onInteract })
  cbs.current = { onSelect, onOpenSubject, onOpenDetails, onInteract }
  const ranksRef = useRef(ranks)
  const quietRef = useRef(quiet)
  quietRef.current = quiet
  ranksRef.current = ranks
  useEffect(() => {
    dirtyStatic.current = true
  }, [paths])

  /* ── projection: plane point (world x, y, height above the plane) → screen ── */
  const project = (x: number, y: number, hgt = 0, c: Camera = cam.current) => {
    const { w, h } = view.current
    const u = (x - c.x) * c.k
    const v = (y - c.y) * c.k
    const ty = pose.current.ty * RAD
    const tx = pose.current.tx * RAD
    // rotateY, then rotateX (CSS applies the right-most first); z toward you.
    const x1 = u * Math.cos(ty) + hgt * Math.sin(ty)
    const z1 = -u * Math.sin(ty) + hgt * Math.cos(ty)
    const y2 = v * Math.cos(tx) - z1 * Math.sin(tx)
    const z2 = v * Math.sin(tx) + z1 * Math.cos(tx)
    const q = PERSPECTIVE / (PERSPECTIVE - z2)
    return { x: w / 2 + x1 * q, y: h / 2 + y2 * q, s: q }
  }
  /** Screen → world on the plane (a few fixed-point steps; exact enough). */
  const unproject = (sxp: number, syp: number, c: Camera = cam.current) => {
    const { w, h } = view.current
    const dx = sxp - w / 2
    const dy = syp - h / 2
    const ty = pose.current.ty * RAD
    const tx = pose.current.tx * RAD
    let u = dx
    let v = dy
    for (let i = 0; i < 6; i++) {
      const z1 = -u * Math.sin(ty)
      const z2 = v * Math.sin(tx) + z1 * Math.cos(tx)
      const q = PERSPECTIVE / (PERSPECTIVE - z2)
      const x1 = dx / q
      const y2 = dy / q
      u = x1 / Math.cos(ty)
      v = (y2 + -u * Math.sin(ty) * Math.sin(tx)) / Math.cos(tx)
    }
    return { x: c.x + u / c.k, y: c.y + v / c.k }
  }

  const minK = () => {
    const { w, h } = view.current
    return (Math.min(w, h) / (web.extent * 2)) * 1.1
  }
  const startFly = (to: Camera, done?: () => void, dur = 900) => {
    const target = { ...to, k: clamp(to.k, minK(), MAX_K) }
    if (reduce) {
      cam.current = target
      fly.current = null
      dirtyStatic.current = true
      done?.()
    } else fly.current = { from: { ...cam.current }, to: target, t0: performance.now(), dur, done }
  }
  const handle = useRef<NexusWebHandle>({ flyToNode: () => {}, camera: () => cam.current })
  handle.current = {
    flyToNode: (key, instant) => {
      const c = web.concepts.get(key)
      if (!c) return
      const to = { x: web.xy[2 * c.pt], y: web.xy[2 * c.pt + 1] + 60, k: Math.max(cam.current.k, 1.1) }
      if (instant) {
        cam.current = to
        dirtyStatic.current = true
      } else startFly(to)
    },
    camera: () => ({ ...cam.current }),
  }
  useImperativeHandle(ref, () => ({ flyToNode: (k, i) => handle.current.flyToNode(k, i), camera: () => handle.current.camera() }))

  /* ── rendering ── */
  useEffect(() => {
    const wrap = wrapRef.current!
    const plane = planeRef.current!
    const mid = midRef.current!
    const far = farRef.current!
    const near = nearRef.current!
    const mctx = mid.getContext('2d')!
    const fctx = far.getContext('2d')!
    const ctx = near.getContext('2d')!
    const off = document.createElement('canvas')
    const octx = off.getContext('2d')!
    let offCam: Camera | null = null
    let labelsFrom = 0
    let raf = 0
    const font = getComputedStyle(wrap).fontFamily || 'system-ui, sans-serif'
    if (born.current === null) born.current = reduce || initialCamera ? -1 : performance.now()
    const lowPower = (navigator.hardwareConcurrency || 8) <= 4

    const resize = () => {
      const r = wrap.getBoundingClientRect()
      const w = Math.max(1, r.width)
      const h = Math.max(1, r.height)
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      // The plane canvases are resampled by the 3D transform anyway: 1.5x is
      // plenty and keeps phones light.
      const pdpr = Math.min(1.5, dpr)
      const pw = Math.round(w * PLANE_W)
      const ph = Math.round(h * PLANE_H)
      view.current = { w, h, dpr, pw, ph, pdpr }
      plane.style.width = `${pw}px`
      plane.style.height = `${ph}px`
      plane.style.left = `${(w - pw) / 2}px`
      plane.style.top = `${(h - ph) / 2}px`
      for (const cv of [mid, far, off]) {
        cv.width = Math.round(pw * pdpr)
        cv.height = Math.round(ph * pdpr)
      }
      near.width = Math.round(w * dpr)
      near.height = Math.round(h * dpr)
      if (!initialCamera && cam.current.k === HOME_K && w < 640) cam.current = { ...cam.current, k: HOME_K_PHONE }
      offCam = null
      dirtyStatic.current = true
    }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    // Flat plane coordinates (the mid layer is drawn flat; CSS tilts it).
    const fx = (c: Camera, x: number) => (x - c.x) * c.k + view.current.pw / 2
    const fy = (c: Camera, y: number) => (y - c.y) * c.k + view.current.ph / 2

    /** The web (lattice + tree) for camera c into g; growT while drawing in. */
    const drawStatic = (g: CanvasRenderingContext2D, c: Camera, growT: number | null) => {
      const { pw, ph, pdpr } = view.current
      g.setTransform(pdpr, 0, 0, pdpr, 0, 0)
      g.clearRect(0, 0, pw, ph)
      const { xy, parent, depth, bucket } = web
      const x0 = c.x - pw / 2 / c.k - SP
      const x1 = c.x + pw / 2 / c.k + SP
      const y0 = c.y - ph / 2 / c.k - SP
      const y1 = c.y + ph / 2 / c.k + SP
      const inView = (i: number) => xy[2 * i] > x0 && xy[2 * i] < x1 && xy[2 * i + 1] > y0 && xy[2 * i + 1] < y1
      const step = lowPower && view.current.w < 640 ? 2 : 1
      g.fillStyle = rgba(DIM, c.k < 0.3 ? 0.08 : 0.12)
      const ds = clamp(1.7 * Math.sqrt(c.k), 0.8, 2.2)
      for (let i = 0; i < parent.length; i += step) {
        if (!inView(i)) continue
        g.fillRect(fx(c, xy[2 * i]) - ds / 2, fy(c, xy[2 * i + 1]) - ds / 2, ds, ds)
      }
      g.lineCap = 'round'
      if (growT === null) {
        g.setTransform(pdpr * c.k, 0, 0, pdpr * c.k, pdpr * (pw / 2 - c.x * c.k), pdpr * (ph / 2 - c.y * c.k))
        g.lineWidth = 1.3 / c.k
        for (let b = 0; b < BUCKETS; b++) {
          g.strokeStyle = rgba(paths.colors[b], c.k < 0.3 ? 0.32 : 0.46)
          g.stroke(paths.tree[b])
        }
        g.lineWidth = 1.8 / c.k
        for (let b = 0; b < BUCKETS; b++) {
          g.strokeStyle = rgba(paths.colors[b], 0.92)
          g.stroke(paths.bright[b])
        }
        g.setTransform(pdpr, 0, 0, pdpr, 0, 0)
        g.fillStyle = rgba(DIM, 0.24)
        for (let i = 0; i < parent.length; i++) {
          if (parent[i] < 0 || !inView(i)) continue
          g.fillRect(fx(c, xy[2 * i]) - 1, fy(c, xy[2 * i + 1]) - 1, 2, 2)
        }
      } else {
        for (let i = 0; i < parent.length; i++) {
          const p = parent[i]
          if (p < 0 || (!inView(i) && !inView(p))) continue
          const start = T0 + depth[p] * DT
          const grow = clamp((growT - start) / EDGE)
          if (grow <= 0) continue
          const fresh = Math.exp(-Math.max(0, growT - start) * 1.8)
          const col = paths.colors[bucket[i]]
          const lit = paths.lit[i]
          g.strokeStyle = rgba(col, lit ? 0.92 : 0.3 + 0.55 * fresh)
          g.lineWidth = (lit ? 1.8 : 1.2) + 0.9 * fresh
          const ax = fx(c, xy[2 * p])
          const ay = fy(c, xy[2 * p + 1])
          g.beginPath()
          g.moveTo(ax, ay)
          g.lineTo(ax + (fx(c, xy[2 * i]) - ax) * grow, ay + (fy(c, xy[2 * i + 1]) - ay) * grow)
          g.stroke()
          if (grow >= 1) {
            g.fillStyle = rgba(col, 0.25 + 0.6 * fresh)
            g.beginPath()
            g.arc(fx(c, xy[2 * i]), fy(c, xy[2 * i + 1]), 1.1 + 2.4 * fresh, 0, Math.PI * 2)
            g.fill()
          }
        }
      }
    }

    /** The far layer: a dimmer, softer lattice drifting slower than the web. */
    const drawFar = (c: Camera) => {
      const { pw, ph, pdpr } = view.current
      fctx.setTransform(pdpr, 0, 0, pdpr, 0, 0)
      fctx.clearRect(0, 0, pw, ph)
      const S = 40
      const ox2 = -c.x * c.k * 0.45 - lean.current.x * 14
      const oy2 = -c.y * c.k * 0.45 - lean.current.y * 10
      const gx0 = Math.floor(-ox2 / S) - 1
      const gy0 = Math.floor(-oy2 / S) - 1
      fctx.fillStyle = rgba(DIM, 0.18)
      for (let gy = gy0; gy < gy0 + ph / S + 3; gy++) {
        for (let gx = gx0; gx < gx0 + pw / S + 3; gx++) {
          const id = Math.imul(gx, 73856093) ^ Math.imul(gy, 19349663)
          const jx = ((id >>> 0) % 1000) / 1000 - 0.5
          const jy = ((Math.imul(id, 31) >>> 0) % 1000) / 1000 - 0.5
          fctx.fillRect(gx * S + (gy % 2 ? S / 2 : 0) + jx * S * 0.5 + ox2, gy * S + jy * S * 0.5 + oy2, 1.1, 1.1)
        }
      }
    }

    /** Spaced capitals, letter by letter, with a soft dark halo. */
    const spaced = (text: string, x: number, y: number, size: number, spacing: number, fill: string, align: 'center' | 'left' = 'center') => {
      ctx.font = `600 ${size}px ${font}`
      const chars = [...text]
      const widths = chars.map((ch) => ctx.measureText(ch).width)
      const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)
      let cx = align === 'center' ? x - total / 2 : x
      ctx.fillStyle = fill
      ctx.textAlign = 'left'
      ctx.lineWidth = 3
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(9,11,24,0.7)'
      chars.forEach((ch, i) => {
        ctx.strokeText(ch, cx, y)
        ctx.fillText(ch, cx, y)
        cx += widths[i] + spacing
      })
      return total
    }
    const overlaps = (list: number[][], b: number[]) => list.some((o) => o[0] < b[2] && o[2] > b[0] && o[1] < b[3] && o[3] > b[1])
    const style = (s: 0 | 1 | 2, col: RGB) =>
      s === 2 ? { dot: col, a: 1, ring: 0.95 } : s === 1 ? { dot: col, a: 0.88, ring: 0.6 } : { dot: DIM, a: 0.4, ring: 0.24 }

    let last = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const { w, h, dpr } = view.current
      const dtMs = Math.min(64, now - last)
      last = now

      // Camera: flights ease in and out; swipes glide to a stop.
      if (fly.current) {
        const f = fly.current
        const t = clamp((now - f.t0) / f.dur)
        const e = easeInOut(t)
        const k = Math.exp(Math.log(f.from.k) + (Math.log(f.to.k) - Math.log(f.from.k)) * e)
        cam.current = { x: f.from.x + (f.to.x - f.from.x) * e, y: f.from.y + (f.to.y - f.from.y) * e, k }
        settled.current = now
        if (t >= 1) {
          fly.current = null
          f.done?.()
        }
      }
      const iv = inertia.current
      if (iv) {
        cam.current = { ...cam.current, x: cam.current.x - iv.vx * dtMs, y: cam.current.y - iv.vy * dtMs }
        const decay = Math.pow(0.9, dtMs / 16)
        iv.vx *= decay
        iv.vy *= decay
        settled.current = now
        if (Math.hypot(iv.vx, iv.vy) * cam.current.k < 0.01) inertia.current = null
      }
      // The plane: tilted back, bobbing slowly, leaning toward the pointer;
      // diving into a subject tilts it further down into the region.
      const L = lean.current
      L.x += (L.tx - L.x) * 0.06
      L.y += (L.ty - L.y) * 0.06
      hoverEase.current += ((hovered.current ? 1 : 0) - hoverEase.current) * 0.18
      const bob = reduce ? 0 : Math.sin((now / 10000) * Math.PI * 2) * 0.4
      const sway = reduce ? 0 : Math.cos((now / 12500) * Math.PI * 2) * 0.35
      const r = rise.current !== null ? easeInOut(clamp((now - rise.current) / 520)) : 0
      pose.current = { tx: TILT + bob - (reduce ? 0 : L.y * 3) + r * 14, ty: sway + (reduce ? 0 : L.x * 4) }
      plane.style.transform = `rotateX(${pose.current.tx.toFixed(3)}deg) rotateY(${pose.current.ty.toFixed(3)}deg)`

      const c = cam.current
      const growing = born.current !== null && born.current > 0
      const elapsed = growing ? (now - born.current!) / 1000 : 0
      if (growing) {
        const reach = Math.hypot(view.current.pw, view.current.ph) / 2 / c.k / (SP * 0.7)
        if (elapsed > T0 + reach * DT + EDGE + 0.5) {
          born.current = -1
          dirtyStatic.current = true
        }
      }
      if (!growing && labelsFrom === 0) labelsFrom = now
      const moving = !!fly.current || now - settled.current < 110

      // Far and mid layers (on the tilted plane).
      if (!(lowPower && w < 640)) drawFar(c)
      if (growing) drawStatic(mctx, c, elapsed)
      else {
        if ((dirtyStatic.current || !offCam) && !moving) {
          drawStatic(octx, c, null)
          offCam = { ...c }
          dirtyStatic.current = false
        } else if (!offCam) {
          drawStatic(octx, c, null)
          offCam = { ...c }
        }
        const o = offCam
        const s = c.k / o.k
        const { pw, ph, pdpr } = view.current
        mctx.setTransform(1, 0, 0, 1, 0, 0)
        mctx.clearRect(0, 0, mid.width, mid.height)
        mctx.setTransform(s, 0, 0, s, pdpr * (pw / 2 - (pw / 2) * s + (o.x - c.x) * c.k), pdpr * (ph / 2 - (ph / 2) * s + (o.y - c.y) * c.k))
        mctx.drawImage(off, 0, 0)
        if (moving) dirtyStatic.current = true
      }

      // Near layer: crisp, projected from the plane.
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, near.width, near.height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const P = (i: number, hgt = 0) => project(web.xy[2 * i], web.xy[2 * i + 1], hgt, c)

      // YOU: a white point in a soft violet halo (the only glow).
      const you = P(web.origin, 0)
      const halo = ctx.createRadialGradient(you.x, you.y, 0, you.x, you.y, 110 * you.s)
      halo.addColorStop(0, 'rgba(255,255,255,0.5)')
      halo.addColorStop(0.12, rgba(C2, 0.36))
      halo.addColorStop(1, rgba(C1, 0))
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(you.x, you.y, 110 * you.s, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(you.x, you.y, 3.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.textBaseline = 'top'
      spaced('YOU', you.x, you.y + 14, 9.5, 3.5, 'rgba(232,235,255,0.75)')

      const focusKey = hovered.current ?? selectedRef.current
      const focus = focusKey ? web.concepts.get(focusKey) : null
      const lineage = focus ? new Set([focus.key, ...focus.prereqs, ...focus.unlocks]) : null

      // Concepts float above the plane with soft contact shadows; mastered
      // ones a little higher; the hovered one lifts further.
      const list: { key: string; x: number; y: number }[] = []
      if (!growing || elapsed > 0) {
        const farZ = c.k < 0.32
        for (const cn of web.concepts.values()) {
          const i = cn.pt
          if (growing && elapsed < T0 + web.depth[i] * DT + EDGE) continue
          const base = P(i, 0)
          if (base.x < -30 || base.x > w + 30 || base.y < -30 || base.y > h + 30) continue
          const hov = cn.key === hovered.current ? hoverEase.current : 0
          const lift = farZ ? 0 : (cn.node.s === 2 ? 16 : 10) + 12 * hov
          const top = lift ? P(i, lift * (reduce ? 0.6 : 1)) : base
          list.push({ key: cn.key, x: top.x, y: top.y })
          const st = style(cn.node.s, paths.colors[web.bucket[i]])
          const dim = lineage && !lineage.has(cn.key) ? 0.3 : 1
          if (farZ) {
            ctx.fillStyle = rgba(cn.node.s === 2 ? WHITE : st.dot, st.a * dim)
            ctx.fillRect(base.x - 1.3, base.y - 1.3, 2.6, 2.6)
            continue
          }
          const rr = clamp(5.2 * Math.sqrt(c.k) * top.s, 3.2, 8) * (1 + 0.08 * hov)
          // Contact shadow on the plane: wider and softer as the node lifts.
          const sw = rr * (1.5 + 0.5 * hov) * base.s
          const sh = ctx.createRadialGradient(base.x, base.y, 0, base.x, base.y, sw)
          sh.addColorStop(0, `rgba(0,0,0,${((0.5 - 0.15 * hov) * dim).toFixed(3)})`)
          sh.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = sh
          ctx.beginPath()
          ctx.ellipse(base.x, base.y, sw, sw * Math.cos(pose.current.tx * RAD) * 0.5, 0, 0, Math.PI * 2)
          ctx.fill()
          // A hairline tether from the plane to the node.
          ctx.strokeStyle = rgba(st.dot, 0.18 * dim)
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(base.x, base.y)
          ctx.lineTo(top.x, top.y + rr)
          ctx.stroke()
          ctx.fillStyle = rgba(BG, 0.94)
          ctx.beginPath()
          ctx.arc(top.x, top.y, rr + 1, 0, Math.PI * 2)
          ctx.fill()
          ctx.lineWidth = 1
          ctx.strokeStyle = rgba(st.dot, st.ring * 0.55 * dim)
          ctx.beginPath()
          ctx.arc(top.x, top.y, rr, 0, Math.PI * 2)
          ctx.stroke()
          const pct = cn.node.s === 2 ? 100 : cn.node.p
          if (pct > 0) {
            ctx.lineWidth = 1.5
            ctx.strokeStyle = rgba(st.dot, dim)
            ctx.beginPath()
            ctx.arc(top.x, top.y, rr, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100)
            ctx.stroke()
          }
          ctx.fillStyle = rgba(cn.node.s === 2 ? WHITE : st.dot, st.a * dim)
          ctx.beginPath()
          ctx.arc(top.x, top.y, cn.node.s === 2 ? rr * 0.45 : rr * 0.32, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      projected.current = list

      // Focus: the path from YOU (teal) and what it unlocks (violet), arcing
      // softly off the plane.
      if (focus && !growing) {
        const arc = (pts: number[], col: RGB, a: number, width: number, rise2 = 22) => {
          ctx.strokeStyle = rgba(col, a)
          ctx.lineWidth = width
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          pts.forEach((p, i) => {
            const t = pts.length > 1 ? i / (pts.length - 1) : 0
            const q = P(p, Math.sin(t * Math.PI) * rise2)
            if (i) ctx.lineTo(q.x, q.y)
            else ctx.moveTo(q.x, q.y)
          })
          ctx.stroke()
        }
        for (const r2 of focus.prereqs) {
          const pc = web.concepts.get(r2)
          if (pc) arc(treePath(web, pc.pt, focus.pt), C3, 0.55, 1.2, 14)
        }
        for (const u of focus.unlocks) {
          const uc = web.concepts.get(u)
          if (uc) arc(treePath(web, focus.pt, uc.pt), C2, 0.95, 1.5, 16)
        }
        const home = pathFromOrigin(web, focus.pt)
        arc(home, C3, 1, 1.9, 26)
        if (!reduce && home.length > 1) {
          // A small light travelling out from YOU along the path.
          const period = 900 + home.length * 90
          const f = ((now % period) / period) * (home.length - 1)
          const i = Math.floor(f)
          const t0 = i / (home.length - 1)
          const t1 = Math.min(1, (i + 1) / (home.length - 1))
          const a = P(home[i], Math.sin(t0 * Math.PI) * 26)
          const b = P(home[Math.min(home.length - 1, i + 1)], Math.sin(t1 * Math.PI) * 26)
          ctx.fillStyle = 'rgba(255,255,255,0.95)'
          ctx.beginPath()
          ctx.arc(a.x + (b.x - a.x) * (f - i), a.y + (b.y - a.y) * (f - i), 2.3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (selectedRef.current) {
        const sp = list.find((x) => x.key === selectedRef.current)
        if (sp) {
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, 11.5, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Type: subject names (spaced capitals), the selected concept's details,
      // and concept names when they fit.
      labelHits.current = []
      const phone = w < 640
      const taken: number[][] = [
        [0, 0, phone ? w : Math.min(w, 430), phone ? 96 : 92],
        [w - 240, 0, w, 64],
        [w - 110, h - 190, w, h],
        [0, h - 128, Math.min(w, 620), h - 84],
      ]
      const fc = focus?.cluster.id
      const sel = selectedRef.current ? web.concepts.get(selectedRef.current) : null
      const selP = sel ? list.find((x) => x.key === sel.key) : null
      let selBox: { bx: number; by: number; blockW: number } | null = null
      if (sel && selP && !growing && !quietRef.current) {
        ctx.font = `600 17px ${font}`
        const blockW = Math.max(ctx.measureText(sel.node.n).width, 220)
        const right = selP.x + 24 + blockW < w - 16
        const bx = right ? selP.x + 24 : selP.x - 24 - blockW
        const by = clamp(selP.y - 32, 100, h - 200)
        selBox = { bx, by, blockW }
        taken.push([bx - 12, by - 10, bx + blockW + 12, by + 104])
      }
      const fade = growing ? 0 : clamp((now - labelsFrom) / 900)
      if (fade > 0) {
        const regions = [...web.regions].sort((a, b) => b.cluster.nodes.length - a.cluster.nodes.length)
        for (const rg of regions) {
          const small = c.k < 0.22
          const full = rg.cluster.name.toUpperCase()
          const name = small || (phone && full.length > 22) ? rg.cluster.short.toUpperCase() : full
          const pr = project(rg.x, rg.y, 0, c)
          // Names recede with the plane: smaller and fainter in the distance.
          const size = clamp((small ? 9 : 10.5) * Math.sqrt(pr.s), 8, 11.5)
          const spacing = (small ? 2 : 3.2) * pr.s
          ctx.font = `600 ${size}px ${font}`
          const tw = ctx.measureText(name).width + spacing * (name.length - 1)
          if (pr.x < -tw / 3 || pr.x > w + tw / 3 || pr.y < -20 || pr.y > h + 20) continue
          const X = clamp(pr.x, tw / 2 + 12, w - tw / 2 - 12)
          const Y = clamp(pr.y, 12, h - size - 112)
          const box = [X - tw / 2 - 6, Y - 4, X + tw / 2 + 6, Y + size + 17]
          if (overlaps(taken, box)) continue
          taken.push(box)
          const depthFade = clamp(0.35 + (pr.s - 0.7) * 1.6, 0.35, 1)
          const a = (fc ? (fc === rg.cluster.id ? 0.95 : 0.3) : 0.82) * fade * depthFade
          ctx.textBaseline = 'top'
          spaced(name, X, Y, size, spacing, `rgba(232,235,255,${a.toFixed(3)})`)
          const rank = ranksRef.current?.[rg.cluster.id]
          if (rg.progress > 0) spaced(`${rank ? `${rank.tier} · ` : ''}${rg.progress}%`.toUpperCase(), X, Y + size + 6, size - 1.5, 2.2, rgba(C3, a * 0.9))
          labelHits.current.push({ x: box[0], y: box[1], w: box[2] - box[0], h: box[3] - box[1], id: rg.cluster.id })
        }
      }

      openHit.current = null
      if (sel && selBox) {
        const { bx, by } = selBox
        ctx.font = `600 17px ${font}`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.lineWidth = 4
        ctx.lineJoin = 'round'
        ctx.strokeStyle = 'rgba(9,11,24,0.85)'
        ctx.fillStyle = 'rgba(255,255,255,0.98)'
        ctx.strokeText(sel.node.n, bx, by)
        ctx.fillText(sel.node.n, bx, by)
        const status = sel.node.s === 2 ? 'mastered' : sel.node.s === 1 ? 'open' : 'locked'
        const meta = `${sel.cluster.short} · ${sel.node.k ?? 'concept'} · ${status}`.toUpperCase()
        spaced(meta, bx, by + 26, 9.5, 2.4, sel.node.s === 2 ? rgba(C3, 0.95) : sel.node.s === 1 ? rgba(C2, 0.95) : 'rgba(200,206,240,0.7)', 'left')
        ctx.font = `500 11.5px ui-monospace, SFMono-Regular, Menlo, monospace`
        ctx.textAlign = 'left'
        const stats = `${sel.node.p}% mastery   ${sel.node.c}   ${sel.node.xp} XP`
        ctx.fillStyle = 'rgba(220,224,250,0.85)'
        ctx.lineWidth = 3
        ctx.strokeText(stats, bx, by + 44)
        ctx.fillText(stats, bx, by + 44)
        ctx.fillStyle = 'rgba(150,160,255,0.18)'
        ctx.fillRect(bx, by + 64, 160, 1)
        const pg = ctx.createLinearGradient(bx, 0, bx + 160, 0)
        pg.addColorStop(0, rgba(C1, 1))
        pg.addColorStop(0.55, rgba(C2, 1))
        pg.addColorStop(1, rgba(C3, 1))
        ctx.fillStyle = pg
        ctx.fillRect(bx, by + 64, (160 * sel.node.p) / 100, 1)
        ctx.font = `600 12px ${font}`
        const open = 'Open details  →'
        const ow = ctx.measureText(open).width
        ctx.fillStyle = rgba(C3, 1)
        ctx.strokeText(open, bx, by + 76)
        ctx.fillText(open, bx, by + 76)
        ctx.fillRect(bx, by + 92, ow, 1)
        openHit.current = { x: bx - 4, y: by + 70, w: ow + 8, h: 28, key: sel.key }
      }

      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(9,11,24,0.9)'
      const nameAt = (key: string, strong: boolean) => {
        const sp = list.find((x) => x.key === key)
        const cn = web.concepts.get(key)
        if (!sp || !cn) return
        const X = sp.x
        const Y = sp.y + 13
        ctx.font = `${strong ? 600 : 500} ${strong ? 12 : 11}px ${font}`
        const tw = ctx.measureText(cn.node.n).width
        const box = [X - tw / 2 - 4, Y - 2, X + tw / 2 + 4, Y + (strong ? 30 : 14)]
        if (!strong && (box[0] < 6 || box[2] > w - 6 || box[3] > h - 96 || overlaps(taken, box))) return
        taken.push(box)
        ctx.textAlign = 'center'
        ctx.lineWidth = 3
        ctx.strokeStyle = 'rgba(9,11,24,0.9)'
        ctx.fillStyle = strong ? 'rgba(255,255,255,0.98)' : `rgba(220,224,250,${cn.node.s === 0 ? 0.55 : 0.85})`
        ctx.strokeText(cn.node.n, X, Y)
        ctx.fillText(cn.node.n, X, Y)
        if (strong) {
          ctx.font = `500 10px ${font}`
          const sub = `${cn.cluster.short} · ${cn.node.s === 2 ? 'mastered' : cn.node.s === 0 ? 'locked' : cn.node.c}`
          ctx.fillStyle = rgba(C3, 0.95)
          ctx.strokeText(sub, X, Y + 15)
          ctx.fillText(sub, X, Y + 15)
        }
      }
      if (focus && focus.key !== sel?.key) nameAt(focus.key, true)
      if (c.k >= LABEL_K && !growing) for (const sp of list) if (sp.key !== focus?.key && sp.key !== sel?.key) nameAt(sp.key, false)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web, paths, reduce])

  // Dev builds only: where concepts and subject names are on screen, so the
  // browser checks can hover and click real targets.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__nexusWeb = {
      concept: (key: string) => {
        const sp = projected.current.find((x) => x.key === key)
        const r = nearRef.current?.getBoundingClientRect()
        return sp && r ? { x: r.left + sp.x, y: r.top + sp.y } : null
      },
      label: (id: string) => {
        const l = labelHits.current.find((x) => x.id === id)
        const r = nearRef.current?.getBoundingClientRect()
        return l && r ? { x: r.left + l.x + l.w / 2, y: r.top + l.y + 6 } : null
      },
      open: () => {
        const o = openHit.current
        const r = nearRef.current?.getBoundingClientRect()
        return o && r ? { x: r.left + o.x + o.w / 2, y: r.top + o.y + o.h / 2 } : null
      },
    }
    return () => {
      delete w.__nexusWeb
    }
  }, [web])

  /* ── pointer, wheel and keyboard ── */
  useEffect(() => {
    const canvas = nearRef.current!
    const pts = new Map<number, { x: number; y: number }>()
    let drag: { x: number; y: number; moved: boolean; anchor: { x: number; y: number }; vx: number; vy: number; lt: number } | null = null
    let pinch: { d: number; k: number; anchor: { x: number; y: number } } | null = null
    const local = (e: { clientX: number; clientY: number }) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const first = () => {
      if (interacted.current) return
      interacted.current = true
      cbs.current.onInteract?.()
    }
    const moved = () => {
      settled.current = performance.now()
      fly.current = null
      if (born.current && born.current > 0) {
        born.current = -1
        dirtyStatic.current = true
      }
    }
    /** Move the camera so the world point `anchor` sits under screen point p. */
    const pin = (anchor: { x: number; y: number }, p: { x: number; y: number }) => {
      for (let i = 0; i < 2; i++) {
        const now = unproject(p.x, p.y)
        cam.current = { ...cam.current, x: cam.current.x + anchor.x - now.x, y: cam.current.y + anchor.y - now.y }
      }
    }
    const zoomAt = (p: { x: number; y: number }, k2: number) => {
      const anchor = unproject(p.x, p.y)
      cam.current = { ...cam.current, k: clamp(k2, minK(), MAX_K) }
      pin(anchor, p)
      moved()
    }
    const hitConcept = (x: number, y: number) => {
      let best: string | null = null
      let bd = Math.max(12, 8 * Math.sqrt(cam.current.k))
      for (const sp of projected.current) {
        const d = Math.hypot(sp.x - x, sp.y - y)
        if (d < bd) {
          bd = d
          best = sp.key
        }
      }
      return best
    }
    const onLabel = (x: number, y: number) => labelHits.current.find((l) => x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h)?.id ?? null
    const hitRegion = (x: number, y: number) => {
      const lab = onLabel(x, y)
      if (lab) return lab
      const p = unproject(x, y)
      const dx = p.x - web.xy[2 * web.origin]
      const dy = p.y - web.xy[2 * web.origin + 1]
      const r = Math.hypot(dx, dy)
      const a = Math.atan2(dy, dx)
      for (const rg of web.regions) {
        let aa = a
        while (aa < rg.a0) aa += Math.PI * 2
        while (aa > rg.a0 + Math.PI * 2) aa -= Math.PI * 2
        if (aa <= rg.a1 && r >= rg.rMin - SP && r <= rg.rMax + SP) return rg.cluster.id
      }
      return null
    }
    const openSubject = (id: string) => {
      const rg = web.regions.find((r) => r.cluster.id === id)
      if (!rg) return
      const back = { ...cam.current }
      startFly({ x: rg.x, y: rg.y, k: Math.min(MAX_K, Math.max(cam.current.k * 2.2, 1.6)) }, () => {
        // The camera tilts down into the region as the path emerges.
        if (reduce) return cbs.current.onOpenSubject(id, back)
        rise.current = performance.now()
        wrapRef.current?.classList.add('nx-rise')
        window.setTimeout(() => cbs.current.onOpenSubject(id, back), 420)
      })
    }
    const down = (e: PointerEvent) => {
      first()
      canvas.setPointerCapture(e.pointerId)
      inertia.current = null
      const p = local(e)
      pts.set(e.pointerId, p)
      if (pts.size === 1) drag = { ...p, moved: false, anchor: unproject(p.x, p.y), vx: 0, vy: 0, lt: performance.now() }
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]
        const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: cam.current.k, anchor: unproject(m.x, m.y) }
        if (drag) drag.moved = true
      }
    }
    const move = (e: PointerEvent) => {
      const p = local(e)
      const { w, h } = view.current
      if (e.pointerType === 'mouse') lean.current = { ...lean.current, tx: p.x / w - 0.5, ty: p.y / h - 0.5 }
      if (pts.has(e.pointerId)) pts.set(e.pointerId, p)
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1
        cam.current = { ...cam.current, k: clamp((pinch.k * d) / pinch.d, minK(), MAX_K) }
        pin(pinch.anchor, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
        moved()
        return
      }
      if (drag && pts.size === 1) {
        if (!drag.moved && Math.hypot(p.x - drag.x, p.y - drag.y) > 5) drag.moved = true
        if (drag.moved) {
          const before = { ...cam.current }
          pin(drag.anchor, p)
          const t = performance.now()
          const dt = Math.max(1, t - drag.lt)
          // Velocity in world units / ms, for the glide on release.
          drag.vx = drag.vx * 0.6 + ((before.x - cam.current.x) / dt) * 0.4
          drag.vy = drag.vy * 0.6 + ((before.y - cam.current.y) / dt) * 0.4
          drag.lt = t
          moved()
        }
        return
      }
      if (e.pointerType === 'mouse') {
        const key = onLabel(p.x, p.y) ? null : hitConcept(p.x, p.y)
        if (key !== hovered.current) hovered.current = key
        const oh = openHit.current
        const onOpen = oh && p.x >= oh.x && p.x <= oh.x + oh.w && p.y >= oh.y && p.y <= oh.y + oh.h
        if (key || onOpen || hitRegion(p.x, p.y)) canvas.dataset.hover = ''
        else delete canvas.dataset.hover
      }
    }
    const up = (e: PointerEvent) => {
      const tap = drag && !drag.moved && pts.size === 1
      if (drag && drag.moved && pts.size === 1 && !reduce && performance.now() - drag.lt < 80 && Math.hypot(drag.vx, drag.vy) * cam.current.k > 0.08) {
        inertia.current = { vx: drag.vx, vy: drag.vy }
      }
      pts.delete(e.pointerId)
      if (pts.size < 2) pinch = null
      if (pts.size === 0) {
        if (tap) {
          const p = local(e)
          const oh = openHit.current
          if (oh && p.x >= oh.x && p.x <= oh.x + oh.w && p.y >= oh.y && p.y <= oh.y + oh.h) cbs.current.onOpenDetails?.(oh.key)
          else {
            const label = onLabel(p.x, p.y)
            const key = label ? null : hitConcept(p.x, p.y)
            if (label) openSubject(label)
            else if (key) cbs.current.onSelect(selectedRef.current === key ? null : key)
            else {
              const id = hitRegion(p.x, p.y)
              if (id && cam.current.k < 0.9) openSubject(id)
              else cbs.current.onSelect(null)
            }
          }
        }
        drag = null
        settled.current = performance.now()
      } else if (pts.size === 1) {
        const [only] = [...pts.values()]
        drag = { ...only, moved: true, anchor: unproject(only.x, only.y), vx: 0, vy: 0, lt: performance.now() }
      }
    }
    const leave = () => {
      lean.current = { ...lean.current, tx: 0, ty: 0 }
      hovered.current = null
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      first()
      inertia.current = null
      zoomAt(local(e), cam.current.k * Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0016)))
    }
    const key = (e: KeyboardEvent) => {
      const c = cam.current
      const step = 120 / c.k
      const { w, h } = view.current
      first()
      if (e.key === 'ArrowLeft') startFly({ ...c, x: c.x - step }, undefined, 260)
      else if (e.key === 'ArrowRight') startFly({ ...c, x: c.x + step }, undefined, 260)
      else if (e.key === 'ArrowUp') startFly({ ...c, y: c.y - step }, undefined, 260)
      else if (e.key === 'ArrowDown') startFly({ ...c, y: c.y + step }, undefined, 260)
      else if (e.key === '+' || e.key === '=') zoomAt({ x: w / 2, y: h / 2 }, c.k * 1.25)
      else if (e.key === '-') zoomAt({ x: w / 2, y: h / 2 }, c.k / 1.25)
      else if (e.key === 'Escape' || e.key === '0') {
        cbs.current.onSelect(null)
        startFly({ x: web.xy[2 * web.origin], y: web.xy[2 * web.origin + 1], k: w < 640 ? HOME_K_PHONE : HOME_K })
      } else return
      e.preventDefault()
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('wheel', wheel, { passive: false })
    canvas.addEventListener('keydown', key)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('wheel', wheel)
      canvas.removeEventListener('keydown', key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web])

  return (
    <div ref={wrapRef} className="nx-lat">
      <div ref={planeRef} className="nx-plane" aria-hidden="true">
        <canvas ref={farRef} className="nx-far" />
        <canvas ref={midRef} className="nx-mid" />
      </div>
      <canvas
        ref={nearRef}
        className="nx-near"
        tabIndex={0}
        role="application"
        aria-label={`The Nexus web: ${clusters.length} subjects, ${web.concepts.size} concepts around you. Drag to pan, scroll or pinch to zoom, click a concept to see it or a subject to open its path. Arrow keys pan, plus and minus zoom, Escape returns to you.`}
      />
    </div>
  )
})
