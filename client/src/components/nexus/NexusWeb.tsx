import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { BRAND, BUCKETS, buildWeb, mix3, pathFromOrigin, SP, treePath, type RGB, type Web } from './lattice'
import type { WebCluster } from './types'

/*
 * The Nexus web: the teaser's lattice web, with every subject living inside
 * it (see ./lattice.ts for how it is built).
 *
 *  • The whole tree is thin, crisp hairlines in the teaser's ramp; the
 *    branches leading to what you have mastered are drawn bright.
 *  • Concepts are slightly larger dots with a crisp progress ring.
 *  • On load the web draws itself outward from YOU, depth by depth
 *    (0.11 s per depth, each edge growing over 0.22 s), like the video.
 *  • Hover a concept: the path from YOU to it lights teal with a small light
 *    travelling along it; what it unlocks lights violet; the rest dims.
 *  • Click a concept to open its panel; click a subject's region or name to
 *    dive into its path. Drag / wheel / pinch to move; Esc returns to YOU.
 *  • The only glow is the soft violet halo around YOU.
 *
 * The static layer (lattice + tree + concepts) is rendered into an
 * offscreen canvas whenever the camera comes to rest; while you pan or zoom
 * that bitmap is moved, and the live layer (focus, labels, YOU) is drawn on
 * top. Only what is on screen is drawn.
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
/** Tier shown on a region label (from the server). */
export interface RegionRank {
  tier: string
  title: string
}

const DT = 0.11
const EDGE = 0.22
const T0 = 0.35
const MAX_K = 3
const DPR_CAP = 2
const LABEL_K = 1.15 // concept names from this zoom (collision-culled)
const HOME_K = 0.62 // the teaser's density: ~47 px between lattice points
const HOME_K_PHONE = 0.5
const CONCEPT_K = 0.95 // concepts get their full ring from this zoom
const { C1, C2, C3 } = BRAND

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`
const WHITE: RGB = [255, 255, 255]
const DIM: RGB = [150, 160, 255]
const BG: RGB = [9, 11, 24]

export const NexusWeb = forwardRef<
  NexusWebHandle,
  {
    clusters: WebCluster[]
    selected: string | null
    onSelect: (key: string | null) => void
    onOpenSubject: (id: string, cam: Camera) => void
    initialCamera?: Camera | null
    ranks?: Record<string, RegionRank>
  }
>(function NexusWeb({ clusters, selected, onSelect, onOpenSubject, initialCamera, ranks }, ref) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduce = !!useReducedMotion()
  const web = useMemo<Web>(() => buildWeb(clusters), [clusters])

  // Static paths, built once per web: the tree by colour bucket, and the
  // bright branches that lead to mastered concepts.
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
  const view = useRef({ w: 1, h: 1, dpr: 1 })
  const hovered = useRef<string | null>(null)
  const hoverEase = useRef(0)
  const tilt = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const inertia = useRef<{ vx: number; vy: number } | null>(null)
  const nearRef = useRef({ x: 0, y: 0 })
  const farRef = useRef<HTMLCanvasElement>(null)
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const fly = useRef<{ from: Camera; to: Camera; t0: number; dur: number; done?: () => void } | null>(null)
  const born = useRef<number | null>(null)
  const settled = useRef(0)
  const dirtyStatic = useRef(true)
  const dirty = useRef(true)
  const labelHits = useRef<{ x: number; y: number; w: number; h: number; id: string }[]>([])
  const cbs = useRef({ onSelect, onOpenSubject })
  cbs.current = { onSelect, onOpenSubject }
  const ranksRef = useRef(ranks)
  ranksRef.current = ranks
  useEffect(() => {
    dirty.current = true
  }, [selected, ranks])
  useEffect(() => {
    dirtyStatic.current = true
  }, [paths])

  const minK = () => {
    const { w, h } = view.current
    return (Math.min(w, h) / (web.extent * 2)) * 1.1
  }
  const startFly = (to: Camera, done?: () => void, dur = 700) => {
    const target = { ...to, k: clamp(to.k, minK(), MAX_K) }
    if (reduce) {
      cam.current = target
      fly.current = null
      dirtyStatic.current = true
      done?.()
    } else fly.current = { from: { ...cam.current }, to: target, t0: performance.now(), dur, done }
    dirty.current = true
  }
  const handle = useRef<NexusWebHandle>({ flyToNode: () => {}, camera: () => cam.current })
  handle.current = {
    flyToNode: (key, instant) => {
      const c = web.concepts.get(key)
      if (!c) return
      const to = { x: web.xy[2 * c.pt], y: web.xy[2 * c.pt + 1], k: Math.max(cam.current.k, 1.2) }
      if (instant) {
        cam.current = to
        dirtyStatic.current = true
        dirty.current = true
      } else startFly(to)
    },
    camera: () => ({ ...cam.current }),
  }
  useImperativeHandle(ref, () => ({ flyToNode: (k, i) => handle.current.flyToNode(k, i), camera: () => handle.current.camera() }))

  /* ── rendering ── */
  useEffect(() => {
    const canvas = canvasRef.current!
    const wrap = wrapRef.current!
    const ctx = canvas.getContext('2d')!
    const farCanvas = farRef.current!
    const fctx = farCanvas.getContext('2d')!
    const off = document.createElement('canvas')
    const octx = off.getContext('2d')!
    let offCam: Camera | null = null
    let labelsFrom = 0 // subject names fade in once the web has drawn itself
    let raf = 0
    const font = getComputedStyle(wrap).fontFamily || 'system-ui, sans-serif'
    if (born.current === null) born.current = reduce || initialCamera ? -1 : performance.now()

    const resize = () => {
      const r = wrap.getBoundingClientRect()
      const dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1)
      view.current = { w: Math.max(1, r.width), h: Math.max(1, r.height), dpr }
      canvas.width = Math.round(r.width * dpr)
      canvas.height = Math.round(r.height * dpr)
      off.width = canvas.width
      off.height = canvas.height
      farCanvas.width = canvas.width
      farCanvas.height = canvas.height
      if (!initialCamera && cam.current.k === HOME_K && r.width < 640) cam.current = { ...cam.current, k: HOME_K_PHONE }
      offCam = null
      dirtyStatic.current = true
      dirty.current = true
    }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    const sx = (c: Camera, x: number) => (x - c.x) * c.k + view.current.w / 2
    const sy = (c: Camera, y: number) => (y - c.y) * c.k + view.current.h / 2
    const style = (s: 0 | 1 | 2, col: RGB) =>
      s === 2 ? { dot: col, a: 1, ring: 0.95 } : s === 1 ? { dot: col, a: 0.85, ring: 0.6 } : { dot: DIM, a: 0.35, ring: 0.22 }

    /** Lattice, tree and concepts for camera c into g (growT: drawing in). */
    const drawStatic = (g: CanvasRenderingContext2D, c: Camera, growT: number | null) => {
      const { w, h, dpr } = view.current
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)
      const { xy, parent, depth, bucket } = web
      const x0 = c.x - w / 2 / c.k - SP
      const x1 = c.x + w / 2 / c.k + SP
      const y0 = c.y - h / 2 / c.k - SP
      const y1 = c.y + h / 2 / c.k + SP
      const inView = (i: number) => xy[2 * i] > x0 && xy[2 * i] < x1 && xy[2 * i + 1] > y0 && xy[2 * i + 1] < y1
      // Faint lattice dots.
      g.fillStyle = rgba(DIM, c.k < 0.3 ? 0.07 : 0.1)
      const ds = clamp(1.7 * Math.sqrt(c.k), 0.8, 2.2)
      for (let i = 0; i < parent.length; i++) {
        if (!inView(i)) continue
        g.fillRect(sx(c, xy[2 * i]) - ds / 2, sy(c, xy[2 * i + 1]) - ds / 2, ds, ds)
      }
      g.lineCap = 'round'
      if (growT === null) {
        // The whole tree as crisp hairlines, then the bright mastered branches.
        g.setTransform(dpr * c.k, 0, 0, dpr * c.k, dpr * (w / 2 - c.x * c.k), dpr * (h / 2 - c.y * c.k))
        g.lineWidth = 1.25 / c.k
        for (let b = 0; b < BUCKETS; b++) {
          g.strokeStyle = rgba(paths.colors[b], c.k < 0.3 ? 0.3 : 0.44)
          g.stroke(paths.tree[b])
        }
        g.lineWidth = 1.6 / c.k
        for (let b = 0; b < BUCKETS; b++) {
          g.strokeStyle = rgba(paths.colors[b], 0.92)
          g.stroke(paths.bright[b])
        }
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        // A node at every branch end.
        g.fillStyle = rgba(DIM, 0.22)
        for (let i = 0; i < parent.length; i++) {
          if (parent[i] < 0 || !inView(i)) continue
          g.fillRect(sx(c, xy[2 * i]) - 1, sy(c, xy[2 * i + 1]) - 1, 2, 2)
        }
      } else {
        // Drawing in: edges grow outward depth by depth, fresh ones brighter.
        for (let i = 0; i < parent.length; i++) {
          const p = parent[i]
          if (p < 0 || (!inView(i) && !inView(p))) continue
          const start = T0 + depth[p] * DT
          const grow = clamp((growT - start) / EDGE)
          if (grow <= 0) continue
          const fresh = Math.exp(-Math.max(0, growT - start) * 1.8)
          const col = paths.colors[bucket[i]]
          const lit = paths.lit[i]
          g.strokeStyle = rgba(col, lit ? 0.92 : 0.26 + 0.55 * fresh)
          g.lineWidth = (lit ? 1.6 : 1) + 0.8 * fresh
          const ax = sx(c, xy[2 * p])
          const ay = sy(c, xy[2 * p + 1])
          g.beginPath()
          g.moveTo(ax, ay)
          g.lineTo(ax + (sx(c, xy[2 * i]) - ax) * grow, ay + (sy(c, xy[2 * i + 1]) - ay) * grow)
          g.stroke()
          if (grow >= 1) {
            g.fillStyle = rgba(col, 0.25 + 0.6 * fresh)
            g.beginPath()
            g.arc(sx(c, xy[2 * i]), sy(c, xy[2 * i + 1]), 1.1 + 2.4 * fresh, 0, Math.PI * 2)
            g.fill()
          }
        }
      }
      // While drawing in, concepts appear with their branch.
      if (growT !== null) drawConcepts(g, c, growT, { x: 0, y: 0 }, false)
    }

    /**
     * Concepts: the near layer. They float a little above the web with a soft
     * contact shadow; the hovered one lifts further and grows a touch.
     */
    const drawConcepts = (g: CanvasRenderingContext2D, c: Camera, growT: number | null, off: { x: number; y: number }, lifted: boolean) => {
      const { w, h } = view.current
      const { xy, depth, bucket } = web
      const inView = (i: number) => {
        const X = sx(c, xy[2 * i])
        const Y = sy(c, xy[2 * i + 1])
        return X > -20 && X < w + 20 && Y > -20 && Y < h + 20
      }
      const far = c.k < 0.32
      for (const cn of web.concepts.values()) {
        const i = cn.pt
        if (!inView(i)) continue
        if (growT !== null && growT < T0 + depth[i] * DT + EDGE) continue
        const hov = lifted && cn.key === hovered.current ? hoverEase.current : 0
        const lift = lifted && !far ? 1.8 + 3 * hov : 0
        const X = sx(c, xy[2 * i]) + off.x
        const Y = sy(c, xy[2 * i + 1]) + off.y - lift
        const st = style(cn.node.s, paths.colors[bucket[i]])
        if (lift > 0) {
          // Contact shadow on the plane: wider and softer as the node lifts.
          const sw = 5.5 + 3 * hov
          const sh = g.createRadialGradient(X, Y + lift + 3, 0, X, Y + lift + 3, sw)
          sh.addColorStop(0, `rgba(0,0,0,${(0.42 - 0.12 * hov).toFixed(3)})`)
          sh.addColorStop(1, 'rgba(0,0,0,0)')
          g.fillStyle = sh
          g.beginPath()
          g.ellipse(X, Y + lift + 3, sw, sw * 0.42, 0, 0, Math.PI * 2)
          g.fill()
        }
        if (hov > 0) {
          g.save()
          g.translate(X, Y)
          g.scale(1 + 0.08 * hov, 1 + 0.08 * hov)
          g.translate(-X, -Y)
        }
        if (far) {
          g.fillStyle = rgba(cn.node.s === 2 ? WHITE : st.dot, st.a)
          g.fillRect(X - 1.4, Y - 1.4, 2.8, 2.8)
          continue
        }
        const rr = clamp(5.5 * Math.sqrt(c.k), 3.2, 7.5)
        if (c.k < CONCEPT_K) {
          // At the web's density a concept is a slightly larger dot with a
          // crisp progress ring, no disc.
          g.fillStyle = rgba(cn.node.s === 2 ? WHITE : st.dot, st.a)
          g.beginPath()
          g.arc(X, Y, cn.node.s === 2 ? 2.3 : 1.9, 0, Math.PI * 2)
          g.fill()
          const pct = cn.node.s === 2 ? 100 : cn.node.p
          g.lineWidth = 1
          g.strokeStyle = rgba(st.dot, pct > 0 ? 0.95 : st.ring * 0.6)
          g.beginPath()
          if (pct > 0) g.arc(X, Y, 4.6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100)
          else g.arc(X, Y, 4.6, 0, Math.PI * 2)
          g.stroke()
          if (hov > 0) g.restore()
          continue
        }
        g.fillStyle = rgba(BG, 0.92)
        g.beginPath()
        g.arc(X, Y, rr + 1, 0, Math.PI * 2)
        g.fill()
        g.lineWidth = 1
        g.strokeStyle = rgba(st.dot, st.ring * 0.55)
        g.beginPath()
        g.arc(X, Y, rr, 0, Math.PI * 2)
        g.stroke()
        const pct = cn.node.s === 2 ? 100 : cn.node.p
        if (pct > 0) {
          g.lineWidth = 1.5
          g.strokeStyle = rgba(st.dot, 1)
          g.beginPath()
          g.arc(X, Y, rr, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100)
          g.stroke()
        }
        g.fillStyle = rgba(cn.node.s === 2 ? WHITE : st.dot, st.a)
        g.beginPath()
        g.arc(X, Y, cn.node.s === 2 ? rr * 0.45 : rr * 0.32, 0, Math.PI * 2)
        g.fill()
        if (hov > 0) g.restore()
      }
    }

    /** Spaced capitals, drawn letter by letter (works in every browser). */
    const spaced = (text: string, x: number, y: number, size: number, spacing: number, fill: string) => {
      ctx.font = `600 ${size}px ${font}`
      const chars = [...text]
      const widths = chars.map((ch) => ctx.measureText(ch).width)
      const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)
      let cx = x - total / 2
      ctx.fillStyle = fill
      ctx.textAlign = 'left'
      chars.forEach((ch, i) => {
        ctx.fillText(ch, cx, y)
        cx += widths[i] + spacing
      })
      return total
    }
    const overlaps = (list: number[][], b: number[]) => list.some((o) => o[0] < b[2] && o[2] > b[0] && o[1] < b[3] && o[3] > b[1])

    /** The far layer: a dimmer, smaller lattice drifting slower than the web. */
    const drawFar = (c: Camera, off: { x: number; y: number }) => {
      const { w, h, dpr } = view.current
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      fctx.clearRect(0, 0, w, h)
      const S = 38
      const ox2 = -c.x * c.k * 0.45 + off.x
      const oy2 = -c.y * c.k * 0.45 + off.y
      const gx0 = Math.floor(-ox2 / S) - 1
      const gy0 = Math.floor(-oy2 / S) - 1
      fctx.fillStyle = rgba(DIM, 0.16)
      for (let gy = gy0; gy < gy0 + h / S + 3; gy++) {
        for (let gx = gx0; gx < gx0 + w / S + 3; gx++) {
          const id = gx * 73856093 ^ gy * 19349663
          const jx = ((id >>> 0) % 1000) / 1000 - 0.5
          const jy = (((id * 31) >>> 0) % 1000) / 1000 - 0.5
          fctx.fillRect(gx * S + (gy % 2 ? S / 2 : 0) + jx * S * 0.5 + ox2, gy * S + jy * S * 0.5 + oy2, 1.1, 1.1)
        }
      }
    }

    let last = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const { w, h, dpr } = view.current
      const dtMs = Math.min(64, now - last)
      last = now
      // Inertial panning: the web glides to a stop.
      const iv = inertia.current
      if (iv) {
        cam.current = { ...cam.current, x: cam.current.x - (iv.vx * dtMs) / cam.current.k, y: cam.current.y - (iv.vy * dtMs) / cam.current.k }
        const decay = Math.pow(0.9, dtMs / 16)
        iv.vx *= decay
        iv.vy *= decay
        settled.current = now
        if (Math.hypot(iv.vx, iv.vy) < 0.01) inertia.current = null
      }
      // Float: a slow breath (a few px over ~10 s) and a lean toward the pointer.
      const t2 = tilt.current
      t2.x += (t2.tx - t2.x) * 0.06
      t2.y += (t2.ty - t2.y) * 0.06
      hoverEase.current += ((hovered.current ? 1 : 0) - hoverEase.current) * 0.18
      const breath = reduce ? { x: 0, y: 0 } : { x: Math.sin((now / 10000) * Math.PI * 2) * 4, y: Math.cos((now / 12500) * Math.PI * 2) * 3 }
      const lean = reduce ? { x: 0, y: 0 } : t2
      const farOff = { x: breath.x * 0.5 - lean.x * 12, y: breath.y * 0.5 - lean.y * 9 }
      const midOff = { x: breath.x, y: breath.y }
      const nearOff = { x: breath.x * 1.35 + lean.x * 7, y: breath.y * 1.35 + lean.y * 5 }
      nearRef.current = nearOff
      if (fly.current) {
        const f = fly.current
        const t = clamp((now - f.t0) / f.dur)
        const e = easeInOut(t)
        const k = Math.exp(Math.log(f.from.k) + (Math.log(f.to.k) - Math.log(f.from.k)) * e)
        cam.current = { x: f.from.x + (f.to.x - f.from.x) * e, y: f.from.y + (f.to.y - f.from.y) * e, k }
        settled.current = now
        dirty.current = true
        if (t >= 1) {
          fly.current = null
          f.done?.()
        }
      }
      const c = cam.current
      const growing = born.current !== null && born.current > 0
      const elapsed = growing ? (now - born.current!) / 1000 : 0
      if (growing) {
        const reach = Math.hypot(w, h) / 2 / c.k / (SP * 0.7)
        if (elapsed > T0 + reach * DT + EDGE + 0.5) {
          born.current = -1
          dirtyStatic.current = true
        }
      }
      if (!growing && labelsFrom === 0) labelsFrom = now
      const live = (!reduce && (hovered.current || selectedRef.current)) || (labelsFrom > 0 && now - labelsFrom < 950)
      const moving = !!fly.current || now - settled.current < 110
      const needStatic = !growing && (dirtyStatic.current || !offCam) && !moving
      if (reduce && !growing && !dirty.current && !needStatic && !live && !moving) return
      drawFar(cam.current, farOff)
      if (growing) {
        drawStatic(ctx, c, elapsed)
      } else {
        if (needStatic || !offCam) {
          drawStatic(octx, c, null)
          offCam = { ...c }
          dirtyStatic.current = false
        }
        // Move / scale the cached bitmap to the current camera.
        const o = offCam
        const s = c.k / o.k
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.setTransform(s, 0, 0, s, dpr * (w / 2 - (w / 2) * s + (o.x - c.x) * c.k + midOff.x), dpr * (h / 2 - (h / 2) * s + (o.y - c.y) * c.k + midOff.y))
        ctx.drawImage(off, 0, 0)
        if (moving) dirtyStatic.current = true
      }
      dirty.current = false
      ctx.setTransform(dpr, 0, 0, dpr, dpr * midOff.x, dpr * midOff.y)

      // YOU: a white point in a soft violet halo (the only glow).
      const OX = sx(c, ox)
      const OY = sy(c, oy)
      const halo = ctx.createRadialGradient(OX, OY, 0, OX, OY, 110)
      halo.addColorStop(0, 'rgba(255,255,255,0.5)')
      halo.addColorStop(0.12, rgba(C2, 0.36))
      halo.addColorStop(1, rgba(C1, 0))
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(OX, OY, 110, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(OX, OY, 3.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.textBaseline = 'top'
      spaced('YOU', OX, OY + 14, 9.5, 3.5, 'rgba(232,235,255,0.75)')
      if (!growing) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        drawConcepts(ctx, c, null, nearOff, !reduce)
        ctx.setTransform(dpr, 0, 0, dpr, dpr * midOff.x, dpr * midOff.y)
      }

      // Focus: the path from YOU (teal) and what it unlocks (violet).
      const focusKey = hovered.current ?? selectedRef.current
      const focus = focusKey ? web.concepts.get(focusKey) : null
      const px = (p: number) => sx(c, web.xy[2 * p])
      const py = (p: number) => sy(c, web.xy[2 * p + 1])
      if (focus && !growing) {
        ctx.fillStyle = 'rgba(6,7,13,0.58)'
        ctx.fillRect(-20, -20, w + 40, h + 40)
        const line = (pts: number[], col: RGB, a: number, width: number) => {
          ctx.strokeStyle = rgba(col, a)
          ctx.lineWidth = width
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          pts.forEach((p, i) => (i ? ctx.lineTo(px(p), py(p)) : ctx.moveTo(px(p), py(p))))
          ctx.stroke()
        }
        const spot = (key: string, col: RGB) => {
          const cn = web.concepts.get(key)
          if (!cn) return
          ctx.fillStyle = rgba(BG, 1)
          ctx.beginPath()
          ctx.arc(px(cn.pt), py(cn.pt), 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = rgba(col, 1)
          ctx.lineWidth = 1.5
          ctx.stroke()
          ctx.fillStyle = rgba(col, 1)
          ctx.beginPath()
          ctx.arc(px(cn.pt), py(cn.pt), 2.4, 0, Math.PI * 2)
          ctx.fill()
        }
        const home = pathFromOrigin(web, focus.pt)
        for (const r of focus.prereqs) {
          const pc = web.concepts.get(r)
          if (pc) line(treePath(web, pc.pt, focus.pt), C3, 0.5, 1.1)
        }
        for (const u of focus.unlocks) {
          const uc = web.concepts.get(u)
          if (uc) line(treePath(web, focus.pt, uc.pt), C2, 0.95, 1.4)
        }
        line(home, C3, 1, 1.8)
        for (const r of focus.prereqs) spot(r, C3)
        for (const u of focus.unlocks) spot(u, C2)
        spot(focus.key, WHITE)
        if (!reduce && home.length > 1) {
          // A small light travelling out from YOU along the path.
          const period = 900 + home.length * 90
          const f = ((now % period) / period) * (home.length - 1)
          const i = Math.floor(f)
          const a = home[i]
          const b = home[Math.min(home.length - 1, i + 1)]
          ctx.fillStyle = 'rgba(255,255,255,0.95)'
          ctx.beginPath()
          ctx.arc(px(a) + (px(b) - px(a)) * (f - i), py(a) + (py(b) - py(a)) * (f - i), 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (selectedRef.current) {
        const sc = web.concepts.get(selectedRef.current)
        if (sc) {
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.arc(px(sc.pt), py(sc.pt), 10.5, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Subject names: small, widely spaced capitals on their regions.
      labelHits.current = []
      // The hint overlay (bottom-left) is kept clear of names.
      // Names keep clear of the floating chrome: the tabs and web-rank card
      // (top-left), the hint (bottom-left) and the assistant button (bottom-right).
      const phone = w < 640
      const taken: number[][] = [
        [0, 0, phone ? w : Math.min(w, 400), phone ? 200 : 205],
        [w - 110, h - 190, w, h],
        ...(phone ? [] : [[0, h - 160, Math.min(470, w), h]]),
      ]
      const fc = focus?.cluster.id
      const regions = [...web.regions].sort((a, b) => b.cluster.nodes.length - a.cluster.nodes.length)
      for (const rg of regions) {
        const small = c.k < 0.22
        const full = rg.cluster.name.toUpperCase()
        // Short names when zoomed out, or when the full one would not fit a phone.
        const name = small || (phone && full.length > 22) ? rg.cluster.short.toUpperCase() : full
        const size = small ? 9 : 10
        const spacing = small ? 2 : 3.2
        ctx.font = `600 ${size}px ${font}`
        const tw = ctx.measureText(name).width + spacing * (name.length - 1)
        const X0 = sx(c, rg.x)
        const Y0 = sy(c, rg.y)
        // Only regions on screen get a name; it is nudged inside the frame
        // (never cut), at most a little way from its region.
        if (X0 < -tw / 3 || X0 > w + tw / 3 || Y0 < -20 || Y0 > h + 20) continue
        const X = clamp(X0, tw / 2 + 12, w - tw / 2 - 12)
        // Kept clear of the frame edges and the dock that floats over the bottom.
        const Y = clamp(Y0, 12, h - size - 112)
        const box = [X - tw / 2 - 6, Y - 4, X + tw / 2 + 6, Y + size + 17]
        if (overlaps(taken, box)) continue
        taken.push(box)
        const fade = growing ? 0 : clamp((now - labelsFrom) / 900)
        if (fade <= 0) continue
        const a = (fc ? (fc === rg.cluster.id ? 0.95 : 0.3) : 0.8) * fade
        ctx.textBaseline = 'top'
        ctx.fillStyle = 'rgba(9,11,24,0.55)'
        ctx.fillRect(X - tw / 2 - 4, Y - 3, tw + 8, size + 6)
        spaced(name, X, Y, size, spacing, `rgba(232,235,255,${a})`)
        const rank = ranksRef.current?.[rg.cluster.id]
        ctx.font = `500 ${size - 0.5}px ${font}`
        ctx.textAlign = 'center'
        ctx.fillStyle = rgba(C3, a * 0.9)
        // The subject rank, only once there is something to show.
        if (rg.progress > 0) ctx.fillText(rank ? `${rank.tier} · ${rg.progress}%` : `${rg.progress}%`, X, Y + size + 5)
        labelHits.current.push({ x: box[0], y: box[1], w: box[2] - box[0], h: box[3] - box[1], id: rg.cluster.id })
      }

      // Concept names: the one in focus, and all that fit when zoomed in.
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(9,11,24,0.9)'
      const nameAt = (key: string, strong: boolean) => {
        const cn = web.concepts.get(key)
        if (!cn) return
        const X = px(cn.pt)
        const Y = py(cn.pt) + 11
        ctx.font = `${strong ? 600 : 500} ${strong ? 12 : 11}px ${font}`
        const tw = ctx.measureText(cn.node.n).width
        const box = [X - tw / 2 - 4, Y - 2, X + tw / 2 + 4, Y + (strong ? 30 : 14)]
        if (!strong && (box[0] < 6 || box[2] > w - 6 || box[3] > h - 96 || overlaps(taken, box))) return
        taken.push(box)
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
      if (focus) nameAt(focus.key, true)
      if (c.k >= LABEL_K && !growing) {
        for (const cn of web.concepts.values()) {
          if (cn.key === focus?.key) continue
          const X = px(cn.pt)
          const Y = py(cn.pt)
          if (X < -60 || X > w + 60 || Y < -20 || Y > h + 20) continue
          nameAt(cn.key, false)
        }
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web, paths, reduce])

  // Dev builds only: where concepts and subject labels are on screen, so the
  // browser checks can hover and click real targets.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__nexusWeb = {
      concept: (key: string) => {
        const cn = web.concepts.get(key)
        const canvas = canvasRef.current
        if (!cn || !canvas) return null
        const r = canvas.getBoundingClientRect()
        const c = cam.current
        return { x: r.left + (web.xy[2 * cn.pt] - c.x) * c.k + view.current.w / 2, y: r.top + (web.xy[2 * cn.pt + 1] - c.y) * c.k + view.current.h / 2 }
      },
      label: (id: string) => {
        const l = labelHits.current.find((x) => x.id === id)
        const r = canvasRef.current?.getBoundingClientRect()
        return l && r ? { x: r.left + l.x + l.w / 2, y: r.top + l.y + 6 } : null
      },
    }
    return () => {
      delete w.__nexusWeb
    }
  }, [web])

  /* ── pointer, wheel and keyboard ── */
  useEffect(() => {
    const canvas = canvasRef.current!
    const pts = new Map<number, { x: number; y: number }>()
    let drag: { x: number; y: number; moved: boolean; cam: Camera; vx: number; vy: number; lx: number; ly: number; lt: number } | null = null
    let pinch: { d: number; k: number; wx: number; wy: number } | null = null
    const local = (e: { clientX: number; clientY: number }) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const toWorld = (x: number, y: number) => {
      const { w, h } = view.current
      const c = cam.current
      return { x: (x - w / 2) / c.k + c.x, y: (y - h / 2) / c.k + c.y }
    }
    const moved = () => {
      settled.current = performance.now()
      fly.current = null
      dirty.current = true
      if (born.current && born.current > 0) {
        born.current = -1
        dirtyStatic.current = true
      }
    }
    const zoomAt = (x: number, y: number, k2: number) => {
      const before = toWorld(x, y)
      const k = clamp(k2, minK(), MAX_K)
      const { w, h } = view.current
      cam.current = { k, x: before.x - (x - w / 2) / k, y: before.y - (y - h / 2) / k }
      moved()
    }
    const hitConcept = (x: number, y: number) => {
      const c = cam.current
      const { w, h } = view.current
      let best: string | null = null
      let bd = Math.max(11, 7 * Math.sqrt(c.k))
      for (const cn of web.concepts.values()) {
        const d = Math.hypot((web.xy[2 * cn.pt] - c.x) * c.k + w / 2 + nearRef.current.x - x, (web.xy[2 * cn.pt + 1] - c.y) * c.k + h / 2 + nearRef.current.y - y)
        if (d < bd) {
          bd = d
          best = cn.key
        }
      }
      return best
    }
    const hitRegion = (x: number, y: number) => {
      for (const l of labelHits.current) if (x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h) return l.id
      const p = toWorld(x, y)
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
        // The region rises toward you, then the path takes over.
        if (reduce) return cbs.current.onOpenSubject(id, back)
        wrapRef.current?.classList.add('nx-rise')
        window.setTimeout(() => cbs.current.onOpenSubject(id, back), 260)
      }, 650)
    }
    const down = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      pts.set(e.pointerId, local(e))
      inertia.current = null
      if (pts.size === 1) {
        const l = local(e)
        drag = { ...l, moved: false, cam: { ...cam.current }, vx: 0, vy: 0, lx: l.x, ly: l.y, lt: performance.now() }
      }
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]
        const mid = toWorld((a.x + b.x) / 2, (a.y + b.y) / 2)
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: cam.current.k, wx: mid.x, wy: mid.y }
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
        const k = clamp((pinch.k * d) / pinch.d, minK(), MAX_K)
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        cam.current = { k, x: pinch.wx - (mx - w / 2) / k, y: pinch.wy - (my - h / 2) / k }
        moved()
        return
      }
      if (drag && pts.size === 1) {
        const dx = p.x - drag.x
        const dy = p.y - drag.y
        if (!drag.moved && Math.hypot(dx, dy) > 5) drag.moved = true
        if (drag.moved) {
          cam.current = { ...drag.cam, x: drag.cam.x - dx / drag.cam.k, y: drag.cam.y - dy / drag.cam.k }
          const t = performance.now()
          const dt = Math.max(1, t - drag.lt)
          drag.vx = drag.vx * 0.6 + ((p.x - drag.lx) / dt) * 0.4
          drag.vy = drag.vy * 0.6 + ((p.y - drag.ly) / dt) * 0.4
          drag.lx = p.x
          drag.ly = p.y
          drag.lt = t
          moved()
        }
        return
      }
      if (e.pointerType === 'mouse') tilt.current = { ...tilt.current, tx: p.x / w - 0.5, ty: p.y / h - 0.5 }
      if (e.pointerType === 'mouse') {
        const onLabel = labelHits.current.some((l) => p.x >= l.x && p.x <= l.x + l.w && p.y >= l.y && p.y <= l.y + l.h)
        const key = onLabel ? null : hitConcept(p.x, p.y)
        if (key !== hovered.current) {
          hovered.current = key
          dirty.current = true
        }
        if (key || hitRegion(p.x, p.y)) canvas.dataset.hover = ''
        else delete canvas.dataset.hover
      }
    }
    const up = (e: PointerEvent) => {
      const tap = drag && !drag.moved && pts.size === 1
      // Let go mid-swipe: keep gliding (not when motion is reduced).
      if (drag && drag.moved && pts.size === 1 && !reduce && performance.now() - drag.lt < 80 && Math.hypot(drag.vx, drag.vy) > 0.08) {
        inertia.current = { vx: drag.vx, vy: drag.vy }
      }
      pts.delete(e.pointerId)
      if (pts.size < 2) pinch = null
      if (pts.size === 0) {
        if (tap) {
          const p = local(e)
          // Subject names sit on top of the web, so they win.
          const label = labelHits.current.find((l) => p.x >= l.x && p.x <= l.x + l.w && p.y >= l.y && p.y <= l.y + l.h)
          const key = label ? null : hitConcept(p.x, p.y)
          if (label) openSubject(label.id)
          else if (key) cbs.current.onSelect(selectedRef.current === key ? null : key)
          else {
            const id = hitRegion(p.x, p.y)
            if (id) openSubject(id)
            else cbs.current.onSelect(null)
          }
        }
        drag = null
        settled.current = performance.now()
      } else if (pts.size === 1) {
        const [only] = [...pts.values()]
        drag = { ...only, moved: true, cam: { ...cam.current }, vx: 0, vy: 0, lx: only.x, ly: only.y, lt: performance.now() }
      }
    }
    const leave = () => {
      tilt.current = { ...tilt.current, tx: 0, ty: 0 }
      if (hovered.current) {
        hovered.current = null
        dirty.current = true
      }
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const p = local(e)
      zoomAt(p.x, p.y, cam.current.k * Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0016)))
    }
    const key = (e: KeyboardEvent) => {
      const c = cam.current
      const step = 120 / c.k
      const { w, h } = view.current
      if (e.key === 'ArrowLeft') cam.current = { ...c, x: c.x - step }
      else if (e.key === 'ArrowRight') cam.current = { ...c, x: c.x + step }
      else if (e.key === 'ArrowUp') cam.current = { ...c, y: c.y - step }
      else if (e.key === 'ArrowDown') cam.current = { ...c, y: c.y + step }
      else if (e.key === '+' || e.key === '=') {
        zoomAt(w / 2, h / 2, c.k * 1.25)
        return
      } else if (e.key === '-') {
        zoomAt(w / 2, h / 2, c.k / 1.25)
        return
      } else if (e.key === 'Escape' || e.key === '0') {
        cbs.current.onSelect(null)
        startFly({ x: web.xy[2 * web.origin], y: web.xy[2 * web.origin + 1], k: view.current.w < 640 ? HOME_K_PHONE : HOME_K })
        e.preventDefault()
        return
      } else return
      e.preventDefault()
      moved()
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
      <canvas ref={farRef} className="nx-far" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="application"
        aria-label={`The Nexus web: ${clusters.length} subjects, ${web.concepts.size} concepts around you. Drag to pan, scroll or pinch to zoom, click a concept to open it or a subject to open its path. Arrow keys pan, plus and minus zoom, Escape returns to you.`}
      />
    </div>
  )
})
