import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { BRAND, BUCKETS, HitGrid, mix3, pathFromOrigin, retention, SP, treePath, type RGB, type Web } from './lattice'

/*
 * The Nexus web: the teaser's lattice web, floating in space (see
 * ./lattice.ts for how it is built). Two modes, one renderer:
 *   overview  the main web — one node per subject, streams as regions,
 *             names always shown; a click dives into the subject;
 *   tree      a subject's own tree — its concepts, zones as regions, and
 *             every tool (lineage, beacon, routes, memory, keystones).
 *
 * Depth, in three layers:
 *   far   a softer, dimmer lattice drifting slower than the web,
 *   mid   the web itself (lattice + spanning tree), drawn flat into a canvas
 *         on a tilted plane in true CSS perspective; the far edge fades,
 *   near  everything you touch, projected from the plane with the same
 *         maths and drawn crisp on top: concepts floating above the plane
 *         with contact shadows, lit paths arcing off it, YOU and all type.
 *
 * One requestAnimationFrame loop, everything in refs — React never renders
 * per frame. Hit-testing uses a grid of the positions drawn this frame, so
 * hover and click answer the same frame; while the pointer rests on a
 * concept the plane stops leaning and bobbing, so the target never moves.
 *
 * Concept states differ by shape as well as colour:
 *   mastered  solid disc, white core, full ring
 *   open      hollow ring with a dot (you can learn it now)
 *   locked    dashed ring, no core, dim
 *   fading    an amber dashed halo (memory), keystone a small diamond,
 *   recent    a soft teal pulse, next best step a breathing beacon.
 */

export interface Camera {
  x: number
  y: number
  k: number
}
export interface NexusWebHandle {
  flyToNode: (key: string, instant?: boolean) => void
  flyToSubject: (id: string) => void
  /** Fly along a chain of concepts, one after another. */
  trace: (keys: string[]) => void
  camera: () => Camera
}
/** Tier shown under a subject's name (from the server). */
export interface RegionRank {
  tier: string
  title: string
}
export type WebAction = 'open' | 'trace' | 'copy' | 'revise'
export interface WebFilter {
  mode: 'all' | 'reachable' | 'fading' | 'mastered'
  domain: string | null
}

const DT = 0.075
const EDGE = 0.22
const T0 = 0.05
const MAX_K = 3
const LABEL_K = 0.2
const TILT = 26
const PERSPECTIVE = 1000
const PLANE_W = 1.42
const PLANE_H = 1.62
const { C1, C2, C3 } = BRAND
const AMBER: RGB = [245, 196, 81]

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`
const WHITE: RGB = [255, 255, 255]
const DIM: RGB = [168, 176, 255]
const BG: RGB = [9, 11, 24]
const RAD = Math.PI / 180

export const NexusWeb = forwardRef<
  NexusWebHandle,
  {
    web: Web
    selected: string | null
    onSelect: (key: string | null) => void
    onOpenSubject: (id: string, cam: Camera) => void
    onAction?: (action: WebAction, key: string) => void
    onInteract?: () => void
    initialCamera?: Camera | null
    ranks?: Record<string, RegionRank>
    /** The details sheet is open: the selection's floating text steps aside. */
    quiet?: boolean
    filter?: WebFilter
    /** Memory preview: days ahead (0 = now). */
    ahead?: number
    route?: { next: string[]; order: string[] } | null
    beacon?: string | null
    keystones?: Set<string>
    /** A tiny web while loading: no interaction. */
    loading?: boolean
    mode?: 'overview' | 'tree'
  }
>(function NexusWeb(props, ref) {
  const { web, initialCamera, loading = false } = props
  const overview = props.mode === 'overview'
  const wrapRef = useRef<HTMLDivElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const midRef = useRef<HTMLCanvasElement>(null)
  const farRef = useRef<HTMLCanvasElement>(null)
  const nearRef = useRef<HTMLCanvasElement>(null)
  const reduce = !!useReducedMotion()

  // The tree by colour bucket: depends on the layout only.
  const tree = useMemo(() => {
    const { xy, parent, bucket } = web
    const paths: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D())
    for (let i = 0; i < parent.length; i++) {
      const p = parent[i]
      if (p < 0) continue
      paths[bucket[i]].moveTo(xy[2 * p], xy[2 * p + 1])
      paths[bucket[i]].lineTo(xy[2 * i], xy[2 * i + 1])
    }
    return { paths, colors: Array.from({ length: BUCKETS }, (_, b) => mix3((b + 0.5) / BUCKETS)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web.xy])
  // Branches that lead to mastered concepts: depends on the reader's state.
  const bright = useMemo(() => {
    const { xy, parent, bucket } = web
    const lit = new Uint8Array(parent.length)
    for (const c of web.concepts.values()) {
      if (c.node.s !== 2) continue
      for (let x = c.pt; x >= 0 && !lit[x]; x = parent[x]) lit[x] = 1
    }
    const paths: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D())
    for (let i = 0; i < parent.length; i++) {
      const p = parent[i]
      if (!lit[i] || p < 0) continue
      paths[bucket[i]].moveTo(xy[2 * p], xy[2 * p + 1])
      paths[bucket[i]].lineTo(xy[2 * i], xy[2 * i + 1])
    }
    return { paths, lit }
  }, [web])

  const ox = web.xy[2 * web.origin]
  const oy = web.xy[2 * web.origin + 1]
  const cam = useRef<Camera>(initialCamera ?? { x: ox, y: oy, k: 0.5 })
  const view = useRef({ w: 1, h: 1, dpr: 1, pw: 1, ph: 1, pdpr: 1 })
  const pose = useRef({ tx: TILT, ty: 0 })
  const hovered = useRef<string | null>(null)
  const hoverEase = useRef(0)
  const lean = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const bobClock = useRef(0)
  const inertia = useRef<{ vx: number; vy: number } | null>(null)
  const fly = useRef<{ from: Camera; to: Camera; t0: number; dur: number; done?: () => void } | null>(null)
  const tour = useRef<string[]>([])
  const rise = useRef<number | null>(null)
  const born = useRef<number | null>(null)
  const settled = useRef(0)
  const dirtyStatic = useRef(true)
  const grid = useRef(new HitGrid(28))
  const labelHits = useRef<{ x: number; y: number; w: number; h: number; id: string }[]>([])
  const actionHits = useRef<{ x: number; y: number; w: number; h: number; action: WebAction; key: string }[]>([])
  const interacted = useRef(false)
  // Latest props for the loop (no re-render per frame).
  const P = useRef(props)
  P.current = props
  useEffect(() => {
    dirtyStatic.current = true
  }, [tree, bright])

  /* ── projection: plane point (world x, y, height above the plane) → screen ── */
  const project = (x: number, y: number, hgt = 0, c: Camera = cam.current) => {
    const { w, h, dpr } = view.current
    const u = (x - c.x) * c.k
    const v = (y - c.y) * c.k
    const ty = pose.current.ty * RAD
    const tx = pose.current.tx * RAD
    const x1 = u * Math.cos(ty) + hgt * Math.sin(ty)
    const z1 = -u * Math.sin(ty) + hgt * Math.cos(ty)
    const y2 = v * Math.cos(tx) - z1 * Math.sin(tx)
    const z2 = v * Math.sin(tx) + z1 * Math.cos(tx)
    const q = PERSPECTIVE / (PERSPECTIVE - z2)
    // Snapped to device pixels after the transform: no shimmer.
    return { x: Math.round((w / 2 + x1 * q) * dpr) / dpr, y: Math.round((h / 2 + y2 * q) * dpr) / dpr, s: q }
  }
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
      u = dx / q / Math.cos(ty)
      v = (dy / q + -u * Math.sin(ty) * Math.sin(tx)) / Math.cos(tx)
    }
    return { x: c.x + u / c.k, y: c.y + v / c.k }
  }

  /** The camera that frames every node, clear of the type around the edges. */
  const fitCam = (): Camera => {
    const { w, h } = view.current
    const phone = w < 640
    let x0 = ox
    let x1 = ox
    let y0 = oy
    let y1 = oy
    for (const cn of web.concepts.values()) {
      const x = web.xy[2 * cn.pt]
      const y = web.xy[2 * cn.pt + 1]
      x0 = Math.min(x0, x)
      x1 = Math.max(x1, x)
      y0 = Math.min(y0, y)
      y1 = Math.max(y1, y)
    }
    const pad = phone ? 40 : 120
    const top = overview ? (phone ? 120 : 110) : phone ? 190 : 150
    const bottom = overview ? (phone ? 120 : 130) : phone ? 210 : 170
    const k = clamp(Math.min((w - 2 * pad) / Math.max(1, x1 - x0 + 120), (h - top - bottom) / Math.max(1, (y1 - y0 + 120) * 0.92)), 0.12, overview ? 1.1 : 1.35)
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 - (top - bottom) / 2 / k, k }
  }
  const minK = () => Math.min(fitCam().k * 0.6, (Math.min(view.current.w, view.current.h) / (web.extent * 2)) * 1.1)
  const startFly = (to: Camera, done?: () => void, dur = 900) => {
    const target = { ...to, k: clamp(to.k, minK(), MAX_K) }
    if (reduce) {
      cam.current = target
      fly.current = null
      dirtyStatic.current = true
      done?.()
    } else fly.current = { from: { ...cam.current }, to: target, t0: performance.now(), dur, done }
  }
  const nodeCam = (key: string, k?: number) => {
    const c = web.concepts.get(key)
    return c ? { x: web.xy[2 * c.pt], y: web.xy[2 * c.pt + 1] + 60, k: k ?? Math.max(cam.current.k, 1.1) } : null
  }
  const handle = useRef<NexusWebHandle>(null as unknown as NexusWebHandle)
  handle.current = {
    flyToNode: (key, instant) => {
      const to = nodeCam(key)
      if (!to) return
      if (instant) {
        cam.current = to
        dirtyStatic.current = true
      } else startFly(to)
    },
    flyToSubject: (id) => {
      const rg = web.regions.find((r) => r.cluster.id === id)
      if (rg) startFly({ x: rg.x, y: rg.y, k: Math.max(cam.current.k, 0.9) })
    },
    trace: (keys) => {
      // A slow, cinematic flight from YOU along the chain.
      tour.current = [...keys]
      const step = () => {
        const k = tour.current.shift()
        if (!k) return
        const to = nodeCam(k, 1.15)
        if (to) startFly(to, () => window.setTimeout(step, reduce ? 0 : 260), 820)
        else step()
      }
      startFly({ x: ox, y: oy, k: 1 }, step, 700)
    },
    camera: () => ({ ...cam.current }),
  }
  useImperativeHandle(ref, () => ({
    flyToNode: (k, i) => handle.current.flyToNode(k, i),
    flyToSubject: (id) => handle.current.flyToSubject(id),
    trace: (keys) => handle.current.trace(keys),
    camera: () => handle.current.camera(),
  }))

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
    let markedWeb = false
    let markedConcepts = false
    let framed = false
    const font = getComputedStyle(wrap).fontFamily || 'system-ui, sans-serif'
    if (born.current === null) born.current = reduce || initialCamera ? -1 : performance.now()
    const lowPower = (navigator.hardwareConcurrency || 8) <= 4

    const resize = () => {
      const r = wrap.getBoundingClientRect()
      const w = Math.max(1, r.width)
      const h = Math.max(1, r.height)
      const dpr = Math.min(2, window.devicePixelRatio || 1)
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
      if (!initialCamera && !framed) {
        framed = true
        cam.current = fitCam()
      }
      offCam = null
      dirtyStatic.current = true
    }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    const fx = (c: Camera, x: number) => (x - c.x) * c.k + view.current.pw / 2
    const fy = (c: Camera, y: number) => (y - c.y) * c.k + view.current.ph / 2

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
          g.strokeStyle = rgba(tree.colors[b], overview ? 0.2 : c.k < 0.3 ? 0.32 : 0.46)
          g.stroke(tree.paths[b])
        }
        g.lineWidth = 1.8 / c.k
        for (let b = 0; b < BUCKETS; b++) {
          g.strokeStyle = rgba(tree.colors[b], 0.92)
          g.stroke(bright.paths[b])
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
          const col = tree.colors[bucket[i]]
          const lit = bright.lit[i]
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
      ctx.strokeStyle = 'rgba(9,11,24,0.72)'
      chars.forEach((ch, i) => {
        ctx.strokeText(ch, cx, y)
        ctx.fillText(ch, cx, y)
        cx += widths[i] + spacing
      })
      return total
    }
    const overlaps = (list: number[][], b: number[]) => list.some((o) => o[0] < b[2] && o[2] > b[0] && o[1] < b[3] && o[3] > b[1])

    let last = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const props2 = P.current
      const { w, h, dpr } = view.current
      const dtMs = Math.min(64, now - last)
      last = now
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
      // The plane: tilted back, bobbing slowly, leaning toward the pointer —
      // and holding perfectly still while the pointer rests on a concept.
      const still = !!hovered.current || reduce
      const L = lean.current
      if (!still) {
        L.x += (L.tx - L.x) * 0.05
        L.y += (L.ty - L.y) * 0.05
        bobClock.current += dtMs
      }
      hoverEase.current += ((hovered.current ? 1 : 0) - hoverEase.current) * 0.35
      const bt = bobClock.current
      const bob = reduce ? 0 : Math.sin((bt / 10000) * Math.PI * 2) * 0.3
      const sway = reduce ? 0 : Math.cos((bt / 12500) * Math.PI * 2) * 0.3
      const r = rise.current !== null ? easeInOut(clamp((now - rise.current) / 520)) : 0
      pose.current = { tx: TILT + bob - (reduce ? 0 : L.y * 2) + r * 14, ty: sway + (reduce ? 0 : L.x * 2.5) }
      plane.style.transform = `rotateX(${pose.current.tx.toFixed(3)}deg) rotateY(${pose.current.ty.toFixed(3)}deg)`

      const c = cam.current
      const growing = born.current !== null && born.current > 0
      const elapsed = growing ? (now - born.current!) / 1000 : 0
      if (growing) {
        const reach = Math.hypot(view.current.pw, view.current.ph) / 2 / c.k / (SP * 0.7)
        if (elapsed > T0 + reach * DT + EDGE + 0.4) {
          born.current = -1
          dirtyStatic.current = true
        }
      }
      // Subject names fade in shortly after the web starts drawing.
      if (labelsFrom === 0) labelsFrom = growing ? born.current! + 450 : now
      const moving = !!fly.current || now - settled.current < 110

      if (!(lowPower && w < 640)) drawFar(c)
      if (growing) drawStatic(mctx, c, elapsed)
      else {
        if (((dirtyStatic.current || !offCam) && !moving) || !offCam) {
          drawStatic(octx, c, null)
          offCam = { ...c }
          dirtyStatic.current = false
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

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, near.width, near.height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const PP = (i: number, hgt = 0) => project(web.xy[2 * i], web.xy[2 * i + 1], hgt, c)

      // YOU: a white point in a soft violet halo (the only glow).
      const you = PP(web.origin, 0)
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
      spaced('YOU', you.x, you.y + 14, 10, 3.5, 'rgba(232,235,255,0.85)')

      if (loading) {
        if (!markedWeb) {
          markedWeb = true
          performance.mark('nexus:first-web-paint')
        }
        return
      }
      const sel = props2.selected ? web.concepts.get(props2.selected) : null
      const focusKey = hovered.current ?? props2.selected
      const focus = focusKey ? web.concepts.get(focusKey) : null
      const lineage = focus ? new Set([focus.key, ...focus.prereqs, ...focus.unlocks]) : null
      const filter = props2.filter ?? { mode: 'all', domain: null }
      const ahead = props2.ahead ?? 0
      const route = props2.route
      const routeSet = route ? new Set(route.order) : null
      const matches = (k: string) => {
        const cn = web.concepts.get(k)!
        if (filter.domain && cn.cluster.domain !== filter.domain) return false
        if (filter.mode === 'reachable') return cn.node.s === 1
        if (filter.mode === 'mastered') return cn.node.s === 2
        if (filter.mode === 'fading') return cn.node.s === 2 && retention(cn.node, ahead) < 0.5
        return true
      }
      const pulse = reduce ? 0.5 : (Math.sin(now / 420) + 1) / 2

      // Route: through the web from YOU via the next waypoints.
      const arc = (pts: number[], col: RGB, a: number, width: number, rise2 = 22) => {
        ctx.strokeStyle = rgba(col, a)
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        pts.forEach((p, i) => {
          const t = pts.length > 1 ? i / (pts.length - 1) : 0
          const q = PP(p, Math.sin(t * Math.PI) * rise2)
          if (i) ctx.lineTo(q.x, q.y)
          else ctx.moveTo(q.x, q.y)
        })
        ctx.stroke()
      }
      if (route && route.next.length) {
        let from = web.origin
        route.next.forEach((k) => {
          const cn = web.concepts.get(k)
          if (!cn) return
          arc(treePath(web, from, cn.pt), [255, 214, 120], 0.85, 1.6, 10)
          from = cn.pt
        })
      }

      // Concepts float above the plane, with contact shadows.
      const g2 = grid.current
      g2.clear()
      const farZ = !overview && c.k < 0.12
      // Nodes are big enough to see and tap at every zoom: subjects on the
      // main web larger still.
      const nodeR = (sc: number, hov: number) =>
        (overview ? clamp(13 * sc * (0.8 + 0.5 * Math.min(1, c.k / 0.4)), 11, 19) : clamp(10 * Math.sqrt(c.k / 0.3) * sc, 9, 14)) * (1 + 0.08 * hov)
      const drawn: { key: string; x: number; y: number; r: number }[] = []
      let hovEntry: (() => void) | null = null
      for (const cn of web.concepts.values()) {
        const i = cn.pt
        // Concepts appear almost at once (a slight stagger outward); the
        // lattice keeps drawing itself in underneath.
        const appear = growing ? clamp((elapsed - 0.06 - cn.level * 0.012) / 0.22) : 1
        if (appear <= 0) continue
        const base = PP(i, 0)
        if (base.x < -30 || base.x > w + 30 || base.y < -30 || base.y > h + 30) continue
        const isHov = cn.key === hovered.current
        const hov = isHov ? hoverEase.current : 0
        const lift = farZ ? 0 : (cn.node.s === 2 ? 16 : 10) + 12 * hov
        const top = lift ? PP(i, lift * (reduce ? 0.6 : 1)) : base
        g2.add(cn.key, top.x, top.y)
        const col = tree.colors[web.bucket[i]]
        const ret = retention(cn.node, ahead)
        const fadingNow = cn.node.s === 2 && ret < 0.5
        let a = appear
        if (lineage && !lineage.has(cn.key)) a *= 0.3
        if (!matches(cn.key)) a *= 0.14
        if (routeSet && !routeSet.has(cn.key)) a *= 0.45
        const paint = () => {
          if (farZ) {
            // Distinct by shape even when tiny: square / ring / dot.
            if (cn.node.s === 2) {
              ctx.fillStyle = rgba(WHITE, (0.55 + 0.45 * ret) * a)
              ctx.fillRect(top.x - 1.9, top.y - 1.9, 3.8, 3.8)
            } else if (cn.node.s === 1) {
              ctx.strokeStyle = rgba(col, 0.95 * a)
              ctx.lineWidth = 1.2
              ctx.beginPath()
              ctx.arc(top.x, top.y, 2.4, 0, Math.PI * 2)
              ctx.stroke()
            } else {
              ctx.fillStyle = rgba(DIM, 0.5 * a)
              ctx.fillRect(top.x - 0.9, top.y - 0.9, 1.8, 1.8)
            }
            return
          }
          const rr = nodeR(top.s, hov)
          if (lift > 0) {
            const sw = rr * (1.5 + 0.5 * hov) * base.s
            const sh = ctx.createRadialGradient(base.x, base.y, 0, base.x, base.y, sw)
            sh.addColorStop(0, `rgba(0,0,0,${((0.5 - 0.15 * hov) * a).toFixed(3)})`)
            sh.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.fillStyle = sh
            ctx.beginPath()
            ctx.ellipse(base.x, base.y, sw, sw * Math.cos(pose.current.tx * RAD) * 0.5, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = rgba(col, 0.18 * a)
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(base.x, base.y)
            ctx.lineTo(top.x, top.y + rr)
            ctx.stroke()
          }
          ctx.fillStyle = rgba(BG, 0.95 * Math.max(a, 0.5))
          ctx.beginPath()
          ctx.arc(top.x, top.y, rr + 1, 0, Math.PI * 2)
          ctx.fill()
          if (overview) {
            // A subject: a crisp ring, its progress as a thin arc, a core.
            ctx.strokeStyle = rgba(col, (cn.node.p > 0 ? 0.75 : 0.5) * a)
            ctx.lineWidth = 1.4
            ctx.beginPath()
            ctx.arc(top.x, top.y, rr, 0, Math.PI * 2)
            ctx.stroke()
            if (cn.node.p > 0) {
              ctx.strokeStyle = rgba(C3, a)
              ctx.lineWidth = 2.4
              ctx.beginPath()
              ctx.arc(top.x, top.y, rr, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * cn.node.p) / 100)
              ctx.stroke()
            }
            if (cn.node.s === 2) {
              ctx.fillStyle = rgba(col, 0.9 * a)
              ctx.beginPath()
              ctx.arc(top.x, top.y, rr - 3, 0, Math.PI * 2)
              ctx.fill()
            }
            ctx.fillStyle = cn.node.p > 0 ? rgba(WHITE, a) : rgba(col, 0.85 * a)
            ctx.beginPath()
            ctx.arc(top.x, top.y, rr * (cn.node.p > 0 ? 0.3 : 0.24), 0, Math.PI * 2)
            ctx.fill()
            return
          }
          if (cn.node.s === 2) {
            const m = 0.45 + 0.55 * ret
            ctx.fillStyle = rgba(col, 0.9 * a * m)
            ctx.beginPath()
            ctx.arc(top.x, top.y, rr, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = rgba(WHITE, a * m)
            ctx.beginPath()
            ctx.arc(top.x, top.y, rr * 0.38, 0, Math.PI * 2)
            ctx.fill()
          } else if (cn.node.s === 1) {
            ctx.strokeStyle = rgba(col, 0.55 * a)
            ctx.lineWidth = 1.2
            ctx.beginPath()
            ctx.arc(top.x, top.y, rr, 0, Math.PI * 2)
            ctx.stroke()
            if (cn.node.p > 0) {
              ctx.strokeStyle = rgba(col, a)
              ctx.lineWidth = 1.8
              ctx.beginPath()
              ctx.arc(top.x, top.y, rr, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * cn.node.p) / 100)
              ctx.stroke()
            }
            ctx.fillStyle = rgba(col, a)
            ctx.beginPath()
            ctx.arc(top.x, top.y, rr * 0.3, 0, Math.PI * 2)
            ctx.fill()
          } else {
            ctx.setLineDash([2, 2.5])
            ctx.strokeStyle = rgba(DIM, 0.55 * a)
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.arc(top.x, top.y, rr * 0.8, 0, Math.PI * 2)
            ctx.stroke()
            ctx.setLineDash([])
          }
          if (fadingNow) {
            ctx.setLineDash([3, 3])
            ctx.strokeStyle = rgba(AMBER, 0.9 * a)
            ctx.lineWidth = 1.2
            ctx.beginPath()
            ctx.arc(top.x, top.y, rr + 4, 0, Math.PI * 2)
            ctx.stroke()
            ctx.setLineDash([])
          }
          if (props2.keystones?.has(cn.key)) {
            const d = 3.2
            const ky = top.y - rr - 7
            ctx.fillStyle = rgba(WHITE, 0.95 * a)
            ctx.beginPath()
            ctx.moveTo(top.x, ky - d)
            ctx.lineTo(top.x + d, ky)
            ctx.lineTo(top.x, ky + d)
            ctx.lineTo(top.x - d, ky)
            ctx.closePath()
            ctx.fill()
          }
          if (cn.node.rc) {
            ctx.strokeStyle = rgba(C3, (0.25 + 0.5 * pulse) * a)
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.arc(top.x, top.y, rr + 2 + 4 * pulse, 0, Math.PI * 2)
            ctx.stroke()
          }
          if (props2.beacon === cn.key) {
            for (const ph2 of [0, 0.5]) {
              const t = reduce ? 0.4 : ((now / 1600 + ph2) % 1)
              ctx.strokeStyle = rgba(WHITE, (1 - t) * 0.9)
              ctx.lineWidth = 1.3
              ctx.beginPath()
              ctx.arc(top.x, top.y, rr + 3 + 16 * t, 0, Math.PI * 2)
              ctx.stroke()
            }
          }
        }
        if (isHov) hovEntry = paint
        else paint()
        drawn.push({ key: cn.key, x: top.x, y: top.y, r: farZ ? 3 : nodeR(top.s, 0) })
      }
      // The hovered concept is drawn last: always on top, never flickering.
      ;(hovEntry as (() => void) | null)?.()

      if (!markedWeb) {
        markedWeb = true
        performance.mark('nexus:first-web-paint')
      }
      if (!markedConcepts && drawn.length) {
        markedConcepts = true
        performance.mark('nexus:first-concepts-paint')
      }

      // Focus: the path from YOU (teal) and what it unlocks (violet).
      if (focus) {
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
          const period = 900 + home.length * 90
          const f = ((now % period) / period) * (home.length - 1)
          const i = Math.floor(f)
          const t0 = i / (home.length - 1)
          const t1 = Math.min(1, (i + 1) / (home.length - 1))
          const a = PP(home[i], Math.sin(t0 * Math.PI) * 26)
          const b = PP(home[Math.min(home.length - 1, i + 1)], Math.sin(t1 * Math.PI) * 26)
          ctx.fillStyle = 'rgba(255,255,255,0.95)'
          ctx.beginPath()
          ctx.arc(a.x + (b.x - a.x) * (f - i), a.y + (b.y - a.y) * (f - i), 2.3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      const selDrawn = sel ? drawn.find((d) => d.key === sel.key) : null
      if (selDrawn) {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'
        ctx.lineWidth = 1.3
        ctx.beginPath()
        ctx.arc(selDrawn.x, selDrawn.y, selDrawn.r + 6, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Type.
      labelHits.current = []
      actionHits.current = []
      const phone = w < 640
      const taken: number[][] = [
        [0, 0, phone ? w : Math.min(w, 460), overview ? (phone ? 100 : 96) : phone ? 150 : 128],
        [w - (phone ? 200 : 300), 0, w, phone ? 100 : 70],
        [w - 110, h - 190, w, h],
      ]
      if (!overview) taken.push([0, h - (phone ? 170 : 200), Math.min(w, 660), h])
      // Numbered route waypoints.
      if (route) {
        route.next.forEach((k, idx) => {
          const d = drawn.find((x) => x.key === k)
          if (!d) return
          const t = String(idx + 1)
          ctx.font = `700 11px ${font}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = 'rgba(255,214,120,0.95)'
          ctx.strokeStyle = 'rgba(9,11,24,0.9)'
          ctx.lineWidth = 3
          ctx.strokeText(t, d.x - d.r - 9, d.y - d.r - 6)
          ctx.fillText(t, d.x - d.r - 9, d.y - d.r - 6)
          taken.push([d.x - d.r - 16, d.y - d.r - 13, d.x - d.r - 2, d.y - d.r + 1])
        })
      }
      // The selected concept's own type: reserved before subject names.
      let selBox: { bx: number; by: number } | null = null
      if (sel && selDrawn && !props2.quiet) {
        ctx.font = `600 17px ${font}`
        const blockW = Math.max(ctx.measureText(sel.node.n).width, 240)
        const right = selDrawn.x + 26 + blockW < w - 16
        const bx = right ? selDrawn.x + 26 : selDrawn.x - 26 - blockW
        const by = clamp(selDrawn.y - 32, 104, h - 230)
        selBox = { bx, by }
        taken.push([bx - 12, by - 10, bx + blockW + 12, by + 112])
      }
      // Names never sit on a node.
      for (const d of drawn) taken.push([d.x - d.r - 2, d.y - d.r - 2, d.x + d.r + 2, d.y + d.r + 2])
      const fc = focus?.cluster.id
      const fade = clamp((now - labelsFrom) / 700)
      if (fade > 0) {
        const regions = [...web.regions].sort((a, b) => b.cluster.nodes.length - a.cluster.nodes.length)
        for (const rg of regions) {
          if (filter.domain && rg.cluster.domain !== filter.domain) continue
          const small = !overview && !rg.label && c.k < 0.22
          const full = (rg.label ?? rg.cluster.name).toUpperCase()
          const cut = phone ? 22 : 34
          const name = rg.label ? (full.length > cut ? `${full.slice(0, cut - 1).trimEnd()}…` : full) : small || (phone && full.length > 22) ? rg.cluster.short.toUpperCase() : full
          // Region names sit just outside their nodes, like a star chart;
          // when that spot is taken, further out, then inside.
          const mid = (rg.a0 + rg.a1) / 2
          const radii = overview ? [rg.rMax + 150, rg.rMax + 280, (rg.rMin + rg.rMax) / 2, rg.rMin - 90] : [rg.rMax + 110, rg.rMax + 200, (rg.rMin + rg.rMax) / 2]
          let pr = project(ox + Math.cos(mid) * radii[0], oy + Math.sin(mid) * radii[0], 0, c)
          const size = clamp((small ? 9.5 : 10.5) * Math.sqrt(pr.s), 10, 12)
          const spacing = (small ? 2 : 3.2) * Math.min(1, pr.s)
          ctx.font = `600 ${size}px ${font}`
          const tw = ctx.measureText(name).width + spacing * (name.length - 1)
          let X = 0
          let Y = 0
          let box: number[] | null = null
          for (const rad of radii) {
            const q = project(ox + Math.cos(mid) * rad, oy + Math.sin(mid) * rad, 0, c)
            if (q.x < -tw / 3 || q.x > w + tw / 3 || q.y < -20 || q.y > h + 20) continue
            const qx = clamp(q.x, tw / 2 + 24, w - tw / 2 - 12)
            const qy = clamp(q.y, 14, h - size - 112)
            const b = [qx - tw / 2 - (overview ? 6 : 20), qy - 5, qx + tw / 2 + 6, qy + size + (overview ? 5 : 18)]
            if (overlaps(taken, b)) continue
            pr = q
            X = qx
            Y = qy
            box = b
            break
          }
          if (!box) continue
          taken.push(box)
          const depthFade = clamp(0.62 + (pr.s - 0.75) * 1.4, 0.62, 1)
          const mine = focus && (rg.zone === undefined ? fc === rg.cluster.id : focus.node.z === rg.zone)
          const a = (focus ? (mine ? 1 : 0.4) : overview ? 0.7 : 0.92) * fade * depthFade
          ctx.textBaseline = 'top'
          spaced(name, X, Y, size, spacing, `rgba(236,239,255,${a.toFixed(3)})`)
          // Streams on the main web are quiet type, nothing more.
          if (overview) continue
          // Subject progress: a thin arc before the name.
          const cx0 = X - tw / 2 - 11
          const cy0 = Y + size / 2
          ctx.lineWidth = 1
          ctx.strokeStyle = `rgba(168,176,255,${(0.35 * a).toFixed(3)})`
          ctx.beginPath()
          ctx.arc(cx0, cy0, 5, 0, Math.PI * 2)
          ctx.stroke()
          if (rg.progress > 0) {
            ctx.strokeStyle = rgba(C3, a)
            ctx.lineWidth = 1.6
            ctx.beginPath()
            ctx.arc(cx0, cy0, 5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * rg.progress) / 100)
            ctx.stroke()
          }
          const rank = rg.label ? undefined : props2.ranks?.[rg.cluster.id]
          if (rg.progress > 0) spaced(`${rank ? `${rank.tier} · ` : ''}${rg.progress}%`.toUpperCase(), X, Y + size + 6, 9.5, 2.2, rgba(C3, a * 0.95))
          labelHits.current.push({ x: box[0], y: box[1], w: box[2] - box[0], h: box[3] - box[1], id: rg.cluster.id })
        }
      }

      if (sel && selBox) {
        const { bx, by } = selBox
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.lineWidth = 4
        ctx.lineJoin = 'round'
        ctx.strokeStyle = 'rgba(9,11,24,0.85)'
        ctx.fillStyle = 'rgba(255,255,255,0.98)'
        ctx.font = `600 17px ${font}`
        ctx.strokeText(sel.node.n, bx, by)
        ctx.fillText(sel.node.n, bx, by)
        const ret = retention(sel.node, ahead)
        const fading = sel.node.s === 2 && ret < 0.5
        const status = fading ? 'fading' : sel.node.s === 2 ? 'mastered' : sel.node.s === 1 ? 'open' : 'locked'
        const extra = props2.keystones?.has(sel.key) ? ' · keystone' : ''
        spaced(`${sel.cluster.short} · ${sel.node.k ?? 'concept'} · ${status}${extra}`.toUpperCase(), bx, by + 26, 10, 2.4, fading ? rgba(AMBER, 1) : sel.node.s === 2 ? rgba(C3, 1) : sel.node.s === 1 ? rgba([190, 160, 255], 1) : 'rgba(210,214,245,0.85)', 'left')
        ctx.font = `500 11.5px ui-monospace, SFMono-Regular, Menlo, monospace`
        ctx.textAlign = 'left'
        const mem = sel.node.s === 2 && (sel.node.ag ?? -1) >= 0 ? `   ${Math.round(ret * 100)}% fresh` : ''
        const stats = `${sel.node.p}% mastery   ${sel.node.c}   ${sel.node.xp} XP${mem}`
        ctx.fillStyle = 'rgba(226,230,255,0.92)'
        ctx.lineWidth = 3
        ctx.strokeText(stats, bx, by + 44)
        ctx.fillText(stats, bx, by + 44)
        ctx.fillStyle = 'rgba(168,176,255,0.22)'
        ctx.fillRect(bx, by + 64, 160, 1)
        const pg = ctx.createLinearGradient(bx, 0, bx + 160, 0)
        pg.addColorStop(0, rgba(C1, 1))
        pg.addColorStop(0.55, rgba(C2, 1))
        pg.addColorStop(1, rgba(C3, 1))
        ctx.fillStyle = pg
        ctx.fillRect(bx, by + 64, (160 * sel.node.p) / 100, 1)
        // Actions, as underlined words.
        const acts: [WebAction, string][] = [['open', 'Open details →'], ['trace', 'Trace lineage'], ['copy', 'Copy link']]
        if (fading) acts.splice(1, 0, ['revise', 'Revise'])
        let ax = bx
        ctx.font = `600 12px ${font}`
        for (const [act, text] of acts) {
          const tw = ctx.measureText(text).width
          const col: RGB = act === 'revise' ? AMBER : act === 'open' ? C3 : [214, 220, 255]
          ctx.fillStyle = rgba(col, 1)
          ctx.strokeStyle = 'rgba(9,11,24,0.85)'
          ctx.lineWidth = 3
          ctx.strokeText(text, ax, by + 78)
          ctx.fillText(text, ax, by + 78)
          ctx.fillRect(ax, by + 94, tw, 1)
          actionHits.current.push({ x: ax - 4, y: by + 72, w: tw + 8, h: 28, action: act, key: sel.key })
          ax += tw + 18
        }
      }

      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const nameAt = (key: string, strong: boolean) => {
        const d = drawn.find((x) => x.key === key)
        const cn = web.concepts.get(key)
        if (!d || !cn) return
        if (!strong && !matches(key)) return
        ctx.font = `${strong ? 600 : overview ? 600 : 500} ${strong ? 13 : overview ? 11.5 : 11.5}px ${font}`
        const tw = ctx.measureText(cn.node.n).width
        const H = strong ? 32 : 15
        // Below first; when that is taken, above, right, then left.
        const spots: [number, number, CanvasTextAlign][] = [[d.x, d.y + d.r + 5, 'center']]
        if (!strong) spots.push([d.x, d.y - d.r - 19, 'center'], [d.x + d.r + 6, d.y - 7, 'left'], [d.x - d.r - 6, d.y - 7, 'right'])
        const boxOf = ([x, y, al]: [number, number, CanvasTextAlign]) => {
          const x0 = al === 'center' ? x - tw / 2 : al === 'left' ? x : x - tw
          return [x0 - 4, y - 2, x0 + tw + 4, y + H]
        }
        const spot = strong ? spots[0] : spots.find((sp) => {
          const b = boxOf(sp)
          return b[0] >= 6 && b[2] <= w - 6 && b[1] >= 4 && b[3] <= h - 96 && !overlaps(taken, b)
        })
        if (!spot) return
        taken.push(boxOf(spot))
        const [X0, Y, align] = spot
        const tx2 = align === 'center' ? clamp(X0, tw / 2 + 8, w - tw / 2 - 8) : X0
        ctx.textAlign = align
        ctx.lineWidth = 3
        ctx.strokeStyle = 'rgba(9,11,24,0.9)'
        const dimmed = !strong && lineage && !lineage.has(key) ? 0.4 : 1
        ctx.fillStyle = strong ? 'rgba(255,255,255,1)' : `rgba(226,230,255,${((cn.node.s === 0 && !overview ? 0.7 : 0.92) * dimmed).toFixed(3)})`
        ctx.strokeText(cn.node.n, tx2, Y)
        ctx.fillText(cn.node.n, tx2, Y)
        if (strong) {
          ctx.font = `500 10.5px ${font}`
          const keystone = props2.keystones?.has(key) ? ' · keystone' : ''
          const rk = props2.ranks?.[cn.node.id]
          const sub = overview
            ? `${cn.node.p}% · ${cn.node.c} concepts${rk ? ` · ${rk.tier}` : ''}`
            : `${cn.cluster.short} · ${cn.node.s === 2 ? 'mastered' : cn.node.s === 0 ? 'locked' : cn.node.c}${keystone}`
          ctx.fillStyle = rgba(C3, 1)
          ctx.textAlign = 'center'
          ctx.strokeText(sub, tx2, Y + 16)
          ctx.fillText(sub, tx2, Y + 16)
        }
      }
      const named = new Set<string>()
      const nameOnce = (k: string, strong: boolean) => {
        if (named.has(k)) return
        named.add(k)
        nameAt(k, strong)
      }
      if (focus && focus.key !== sel?.key) nameOnce(focus.key, true)
      if (props2.beacon && props2.beacon !== focus?.key && props2.beacon !== sel?.key) {
        const d = drawn.find((x) => x.key === props2.beacon)
        if (d) {
          ctx.textBaseline = 'bottom'
          spaced('NEXT', d.x, d.y - d.r - 22, 9.5, 2.6, 'rgba(255,255,255,0.95)')
          ctx.textBaseline = 'top'
          nameOnce(props2.beacon, false)
        }
      }
      if (overview || c.k >= LABEL_K) {
        // Inner names first (they matter most when space runs out).
        const order = overview ? [...drawn].sort((p, q) => (web.concepts.get(p.key)?.level ?? 0) - (web.concepts.get(q.key)?.level ?? 0)) : drawn
        for (const d of order) if (d.key !== focus?.key && d.key !== sel?.key) nameOnce(d.key, false)
      }

    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web, tree, bright, reduce, loading])

  // Dev builds only: where concepts, names and actions are on screen.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    const rect = () => nearRef.current?.getBoundingClientRect()
    w.__nexusWeb = {
      concept: (key: string) => {
        const p = grid.current.position(key)
        const r = rect()
        return p && r ? { x: r.left + p.x, y: r.top + p.y } : null
      },
      label: (id: string) => {
        const l = labelHits.current.find((x) => x.id === id)
        const r = rect()
        return l && r ? { x: r.left + l.x + l.w / 2, y: r.top + l.y + 8 } : null
      },
      action: (a: WebAction) => {
        const o = actionHits.current.find((x) => x.action === a)
        const r = rect()
        return o && r ? { x: r.left + o.x + o.w / 2, y: r.top + o.y + o.h / 2 } : null
      },
      open: () => {
        const o = actionHits.current.find((x) => x.action === 'open')
        const r = rect()
        return o && r ? { x: r.left + o.x + o.w / 2, y: r.top + o.y + o.h / 2 } : null
      },
      hovered: () => hovered.current,
    }
    return () => {
      delete w.__nexusWeb
    }
  }, [web])

  /* ── pointer, wheel and keyboard ── */
  useEffect(() => {
    if (loading) return
    const canvas = nearRef.current!
    const pts = new Map<number, { x: number; y: number }>()
    let drag: { x: number; y: number; moved: boolean; anchor: { x: number; y: number }; vx: number; vy: number; lt: number } | null = null
    let pinch: { d: number; k: number; anchor: { x: number; y: number } } | null = null
    const cb = () => P.current
    const local = (e: { clientX: number; clientY: number }) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const first = () => {
      if (interacted.current) return
      interacted.current = true
      cb().onInteract?.()
    }
    const moved = () => {
      settled.current = performance.now()
      fly.current = null
      tour.current = []
      if (born.current && born.current > 0) {
        born.current = -1
        dirtyStatic.current = true
      }
    }
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
    const radius = () => (overview ? 26 : 18)
    const hitConcept = (x: number, y: number) => {
      // Hysteresis: the hovered concept keeps the pointer a little longer.
      const cur = hovered.current ? grid.current.position(hovered.current) : null
      if (cur && Math.hypot(cur.x - x, cur.y - y) < radius() + 8) return hovered.current
      return grid.current.nearest(x, y, radius())
    }
    const inBox = (b: { x: number; y: number; w: number; h: number }, p: { x: number; y: number }) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h
    const onLabel = (x: number, y: number) => labelHits.current.find((l) => inBox(l, { x, y }))?.id ?? null
    const onAction = (x: number, y: number) => actionHits.current.find((a) => inBox(a, { x, y })) ?? null
    // The main web: a subject dives into its own tree (camera flies in,
    // the plane rises, then the tree takes over).
    const dive = (key: string) => {
      const cn = web.concepts.get(key)
      if (!cn) return
      const back = { ...cam.current }
      const id = cn.node.id
      startFly({ x: web.xy[2 * cn.pt], y: web.xy[2 * cn.pt + 1], k: Math.min(MAX_K, Math.max(cam.current.k * 2.4, 0.9)) }, () => {
        if (reduce) return cb().onOpenSubject(id, back)
        rise.current = performance.now()
        wrapRef.current?.classList.add('nx-rise')
        window.setTimeout(() => cb().onOpenSubject(id, back), 380)
      }, 620)
    }
    // A zone name in a tree: fly to that zone.
    const toRegion = (id: string) => {
      const rg = web.regions.find((r) => r.id === id)
      if (rg) startFly({ x: rg.x, y: rg.y, k: Math.max(cam.current.k, 0.55) })
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
          drag.vx = drag.vx * 0.6 + ((before.x - cam.current.x) / dt) * 0.4
          drag.vy = drag.vy * 0.6 + ((before.y - cam.current.y) / dt) * 0.4
          drag.lt = t
          moved()
        }
        return
      }
      if (e.pointerType === 'mouse') {
        const act = onAction(p.x, p.y)
        const key = act || onLabel(p.x, p.y) ? null : hitConcept(p.x, p.y)
        hovered.current = key
        // The plane leans toward the pointer only while it is not on a concept.
        if (!key) lean.current = { ...lean.current, tx: p.x / w - 0.5, ty: p.y / h - 0.5 }
        if (key || act || onLabel(p.x, p.y)) canvas.dataset.hover = ''
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
          const act = onAction(p.x, p.y)
          if (act) cb().onAction?.(act.action, act.key)
          else {
            const label = onLabel(p.x, p.y)
            const key = label ? null : grid.current.nearest(p.x, p.y, radius())
            if (label) toRegion(label)
            else if (key && overview) dive(key)
            else if (key) cb().onSelect(cb().selected === key ? null : key)
            else cb().onSelect(null)
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
    // Keyboard: with a concept selected, arrows move along its links
    // (up: a prerequisite, down: what it unlocks, left/right: siblings);
    // Enter opens it, Esc steps back. Otherwise arrows pan.
    const siblings = (key: string) => {
      const cn = web.concepts.get(key)
      if (!cn) return []
      const parentKey = cn.prereqs[0]
      const pool = parentKey ? web.concepts.get(parentKey)?.unlocks ?? [] : [...web.concepts.values()].filter((x) => x.cluster.id === cn.cluster.id && x.level === cn.level).map((x) => x.key)
      const ang = (k: string) => {
        const c2 = web.concepts.get(k)!
        return Math.atan2(web.xy[2 * c2.pt + 1] - oy, web.xy[2 * c2.pt] - ox)
      }
      return [...new Set(pool)].sort((a, b) => ang(a) - ang(b))
    }
    const key = (e: KeyboardEvent) => {
      const c = cam.current
      const { w, h } = view.current
      const sel = cb().selected
      first()
      const go = (k: string | undefined) => {
        if (!k) return
        cb().onSelect(k)
        handle.current.flyToNode(k)
      }
      if (sel && web.concepts.has(sel)) {
        const cn = web.concepts.get(sel)!
        if (e.key === 'ArrowUp') go([...cn.prereqs].sort((a, b) => (web.concepts.get(b)?.level ?? 0) - (web.concepts.get(a)?.level ?? 0))[0])
        else if (e.key === 'ArrowDown') go(cn.unlocks[0])
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const list = siblings(sel)
          const i = list.indexOf(sel)
          if (list.length > 1) go(list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length])
        } else if (e.key === 'Enter') {
          if (overview) dive(sel)
          else cb().onAction?.('open', sel)
        }
        else if (e.key === 'Escape') cb().onSelect(null)
        else if (e.key === '+' || e.key === '=') zoomAt({ x: w / 2, y: h / 2 }, c.k * 1.25)
        else if (e.key === '-') zoomAt({ x: w / 2, y: h / 2 }, c.k / 1.25)
        else return
        e.preventDefault()
        return
      }
      const step = 120 / c.k
      if (e.key === 'ArrowLeft') startFly({ ...c, x: c.x - step }, undefined, 260)
      else if (e.key === 'ArrowRight') startFly({ ...c, x: c.x + step }, undefined, 260)
      else if (e.key === 'ArrowUp') startFly({ ...c, y: c.y - step }, undefined, 260)
      else if (e.key === 'ArrowDown') startFly({ ...c, y: c.y + step }, undefined, 260)
      else if (e.key === '+' || e.key === '=') zoomAt({ x: w / 2, y: h / 2 }, c.k * 1.25)
      else if (e.key === '-') zoomAt({ x: w / 2, y: h / 2 }, c.k / 1.25)
      else if (e.key === 'Enter' && cb().beacon) go(cb().beacon!)
      else if (e.key === 'Escape' || e.key === '0') startFly(fitCam())
      else return
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
  }, [web, loading])

  return (
    <div ref={wrapRef} className="nx-lat">
      <div ref={planeRef} className="nx-plane" aria-hidden="true">
        <canvas ref={farRef} className="nx-far" />
        <canvas ref={midRef} className="nx-mid" />
      </div>
      <canvas
        ref={nearRef}
        className="nx-near"
        tabIndex={loading ? -1 : 0}
        role="application"
        aria-busy={loading || undefined}
        aria-label={
          loading
            ? 'The Nexus web is loading'
            : overview
              ? `The Nexus web: ${web.concepts.size} subjects around you, grouped in ${web.regions.length} streams. Drag to pan, scroll or pinch to zoom, click a subject to open its own tree. Arrow keys pan; with a subject focused, Enter opens it.`
              : `This subject's tree: ${web.concepts.size} concepts in ${web.regions.length} zones around you. Drag to pan, scroll or pinch to zoom, click a concept to see it. Arrow keys pan, or move along links when a concept is selected; Enter opens its details, Escape steps back.`
        }
      />
    </div>
  )
})
