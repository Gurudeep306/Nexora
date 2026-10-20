import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import type { NexusWebResponse, WebCluster, WebNode } from './types'

/*
 * The Nexus web: every subject is a sub-web (a cluster of rings around its
 * roots), all on one canvas, with cross-subject prerequisites drawn as
 * branches between clusters. Drawn the way the NexoraGuru teaser draws its
 * web: a faint jittered lattice, thin crisp strands in the brand ramp, small
 * dots and stars. No blur, no glow.
 *
 * Level of detail keeps ~60 clusters / ~1,400 skills smooth on a phone:
 *   far   cluster shapes, their strands as hairlines, names, and one bundled
 *         branch per pair of linked subjects;
 *   mid   skills as dots with state, real node-to-node cross links;
 *   near  progress rings, stars, labels, counts, zone rings and the
 *         "Needs · X" chips (click one to fly to that skill).
 * Only what is on screen is drawn, and the canvas idles when nothing moves.
 *
 * Navigation lives in the web: drag to pan, wheel / pinch to zoom, click a
 * subject to zoom into it, click a skill to open its panel, click empty
 * space (or press Esc) to see the whole web again.
 *
 * Focus: hover or select a skill and its whole chain lights through the
 * web, across subjects: prerequisites teal, what it unlocks violet.
 * On load the web draws itself outward from its roots, breadth-first.
 * Depth: the lattice is a tilted floor that drifts slower than the web.
 */

export interface NexusWebHandle {
  flyToNode: (key: string, instant?: boolean) => void
  flyToCluster: (id: string) => void
  flyToZone: (clusterId: string, level: number) => void
  fitAll: () => void
}

interface SNode {
  key: string
  cluster: WebCluster
  node: WebNode
  depth: number
  /** 0 at the cluster centre → 1 at its rim, for the colour ramp. */
  u: number
}
interface SEdge {
  a: SNode
  b: SNode
  /** 0 locked, 1 open, 2 mastered */
  state: 0 | 1 | 2
  cross: boolean
  kx: number
  ky: number
}

const R = 13 // skill radius in world units
const FAR = 0.11
const NEAR = 0.42
const MAX_K = 2.4
const DPR_CAP = 2

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
function hash(s: string, salt = 0) {
  let h = 2166136261 ^ salt
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10000) / 10000 - 0.5
}

type RGB = [number, number, number]
interface Palette {
  b1: RGB
  b2: RGB
  b3: RGB
  text: RGB
  muted: RGB
  bg: RGB
  border: RGB
  accent: RGB
  font: string
  dark: boolean
}

/** Resolve any CSS colour expression (tokens, oklch, color-mix) to RGB through a 1px canvas. */
function resolveColors(el: HTMLElement): Palette {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  el.appendChild(probe)
  const c = document.createElement('canvas')
  c.width = c.height = 1
  const x = c.getContext('2d', { willReadFrequently: true })!
  const rgb = (expr: string, fallback: RGB): RGB => {
    probe.style.color = ''
    probe.style.color = expr
    const css = getComputedStyle(probe).color
    x.clearRect(0, 0, 1, 1)
    x.fillStyle = `rgb(${fallback.join(',')})`
    x.fillStyle = css
    x.fillRect(0, 0, 1, 1)
    const d = x.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2]]
  }
  const pal: Palette = {
    b1: rgb('var(--nx-b1)', [91, 140, 255]),
    b2: rgb('var(--nx-b2)', [155, 107, 255]),
    b3: rgb('var(--nx-b3)', [45, 212, 191]),
    text: rgb('var(--color-text-primary)', [230, 232, 240]),
    muted: rgb('var(--color-text-muted)', [140, 146, 160]),
    bg: rgb('var(--color-bg-surface)', [20, 22, 30]),
    border: rgb('var(--color-border-strong)', [70, 74, 90]),
    accent: rgb('var(--color-accent-brand)', [91, 140, 255]),
    font: getComputedStyle(el).fontFamily || 'system-ui, sans-serif',
    dark: false,
  }
  pal.dark = pal.bg[0] + pal.bg[1] + pal.bg[2] < 384
  probe.remove()
  return pal
}

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`
function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map(Math.round) as RGB
}
function ramp(p: Palette, u: number): RGB {
  const t = clamp(u)
  return t < 0.55 ? mix(p.b1, p.b2, t / 0.55) : mix(p.b2, p.b3, (t - 0.55) / 0.45)
}

/* A four-point star, unit size. */
function star(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const i = s * 0.26
  ctx.beginPath()
  ctx.moveTo(x, y - s)
  ctx.lineTo(x + i, y - i)
  ctx.lineTo(x + s, y)
  ctx.lineTo(x + i, y + i)
  ctx.lineTo(x, y + s)
  ctx.lineTo(x - i, y + i)
  ctx.lineTo(x - s, y)
  ctx.lineTo(x - i, y - i)
  ctx.closePath()
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

export const NexusWeb = forwardRef<
  NexusWebHandle,
  {
    data: NexusWebResponse
    selected: string | null
    onSelect: (key: string | null) => void
    /** The subject in view changed (zoomed into it or a skill of it selected). */
    onActiveCluster?: (id: string | null) => void
  }
>(function NexusWeb({ data, selected, onSelect, onActiveCluster }, ref) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const floorRef = useRef<HTMLCanvasElement>(null)
  const reduce = !!useReducedMotion()

  /* ── the scene: nodes, strands, bundles, BFS depth (static per response) ── */
  const scene = useMemo(() => {
    const nodes = new Map<string, SNode>()
    for (const c of data.clusters) {
      for (const n of c.nodes) {
        const u = clamp(Math.hypot(n.x - c.x, n.y - c.y) / Math.max(1, c.r - 60))
        nodes.set(`${c.id}:${n.id}`, { key: `${c.id}:${n.id}`, cluster: c, node: n, depth: 0, u })
      }
    }
    const reqs = new Map<string, string[]>() // key → prerequisite keys
    for (const s of nodes.values()) {
      const list = s.node.req.map((r) => `${s.cluster.id}:${r}`)
      for (const x of s.node.cx ?? []) list.push(x)
      reqs.set(s.key, list.filter((k) => nodes.has(k)))
    }
    const children = new Map<string, string[]>()
    for (const [k, list] of reqs) for (const r of list) children.set(r, [...(children.get(r) ?? []), k])
    // Breadth-first from every root of the web.
    let frontier = [...nodes.keys()].filter((k) => !(reqs.get(k) ?? []).length)
    const seen = new Set(frontier)
    let d = 0
    while (frontier.length) {
      const next: string[] = []
      for (const k of frontier) {
        nodes.get(k)!.depth = d
        for (const c of children.get(k) ?? []) {
          if (seen.has(c)) continue
          seen.add(c)
          next.push(c)
        }
      }
      frontier = next
      d++
    }
    const maxDepth = Math.max(1, d - 1)
    const edges: SEdge[] = []
    for (const [k, list] of reqs) {
      const b = nodes.get(k)!
      for (const r of list) {
        const a = nodes.get(r)!
        const state: 0 | 1 | 2 = a.node.s === 2 && b.node.s === 2 ? 2 : b.node.s >= 1 ? 1 : 0
        const cross = a.cluster.id !== b.cluster.id
        const mx = (a.node.x + b.node.x) / 2
        const my = (a.node.y + b.node.y) / 2
        const len = Math.hypot(b.node.x - a.node.x, b.node.y - a.node.y) || 1
        const nx = -(b.node.y - a.node.y) / len
        const ny = (b.node.x - a.node.x) / len
        const bow = cross ? 0.16 * len : hash(`${r}>${k}`, 1) * 0.16 * len
        edges.push({ a, b, state, cross, kx: mx + nx * bow, ky: my + ny * bow })
      }
    }
    // Locked first so the lit strands sit on top.
    edges.sort((x, y) => x.state - y.state)
    // One bundled branch per pair of linked subjects (zoomed out).
    const bundleMap = new Map<string, { a: WebCluster; b: WebCluster; count: number; state: number }>()
    for (const e of edges) {
      if (!e.cross) continue
      const [p, q] = [e.a.cluster, e.b.cluster].sort((x, y) => x.id.localeCompare(y.id))
      const key = `${p.id}|${q.id}`
      const cur = bundleMap.get(key) ?? { a: p, b: q, count: 0, state: 0 }
      cur.count++
      cur.state = Math.max(cur.state, e.state)
      bundleMap.set(key, cur)
    }
    return { nodes, reqs, children, edges, bundles: [...bundleMap.values()], maxDepth }
  }, [data])

  /* ── live state kept in refs: the loop reads them without re-rendering ── */
  const cam = useRef({ x: data.width / 2, y: data.height / 2, k: 0.05 })
  const view = useRef({ w: 1, h: 1, dpr: 1 })
  const hovered = useRef<string | null>(null)
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const pal = useRef<Palette | null>(null)
  const fly = useRef<{ from: { x: number; y: number; k: number }; to: { x: number; y: number; k: number }; t0: number; dur: number } | null>(null)
  const drawIn = useRef<number | null>(null)
  const chips = useRef<{ x: number; y: number; w: number; h: number; target: string }[]>([])
  const dirty = useRef(true)
  const pointer = useRef({ px: 0, py: 0 })
  const minK = useRef(0.02)
  const placed = useRef(false)
  const activeCluster = useRef<string | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onActiveRef = useRef(onActiveCluster)
  onActiveRef.current = onActiveCluster

  const invalidate = () => {
    dirty.current = true
  }
  useEffect(invalidate, [selected, scene])

  const fitAllCam = () => {
    const { w, h } = view.current
    const k = Math.min(w / data.width, h / data.height) * 0.96
    minK.current = k * 0.6
    return { x: data.width / 2, y: data.height / 2, k }
  }
  const startFly = (to: { x: number; y: number; k: number }, instant = false) => {
    const target = { ...to, k: clamp(to.k, minK.current, MAX_K) }
    if (instant || reduce) {
      cam.current = target
      fly.current = null
    } else {
      fly.current = { from: { ...cam.current }, to: target, t0: performance.now(), dur: 700 }
    }
    invalidate()
  }
  const setActive = (id: string | null) => {
    if (activeCluster.current === id) return
    activeCluster.current = id
    onActiveRef.current?.(id)
  }

  const api: NexusWebHandle = {
    flyToNode: (key, instant) => {
      const s = scene.nodes.get(key)
      if (!s) return
      setActive(s.cluster.id)
      startFly({ x: s.node.x, y: s.node.y + 40, k: Math.max(cam.current.k, 0.85) }, instant)
    },
    flyToCluster: (id) => {
      const c = data.clusters.find((x) => x.id === id)
      if (!c) return
      setActive(c.id)
      const { w, h } = view.current
      startFly({ x: c.x, y: c.y, k: (Math.min(w, h) / (2 * c.r)) * 0.98 })
    },
    flyToZone: (id, level) => {
      const c = data.clusters.find((x) => x.id === id)
      const z = c?.zones.find((x) => x.level === level)
      if (!c || !z) return
      setActive(c.id)
      const ring = Math.max(...z.rings, 60)
      const { w, h } = view.current
      startFly({ x: c.x, y: c.y - ring, k: clamp((Math.min(w, h) / (ring * 1.6 + 260)) * 0.9, NEAR, 1.2) })
    },
    fitAll: () => {
      setActive(null)
      startFly(fitAllCam())
    },
  }
  const apiRef = useRef(api)
  apiRef.current = api
  useImperativeHandle(ref, () => ({
    flyToNode: (k, i) => apiRef.current.flyToNode(k, i),
    flyToCluster: (id) => apiRef.current.flyToCluster(id),
    flyToZone: (id, l) => apiRef.current.flyToZone(id, l),
    fitAll: () => apiRef.current.fitAll(),
  }))

  /* ── focus lineage (prerequisites up, unlocks down) across the whole web ── */
  const lineageFor = (focus: string | null) => {
    if (!focus || !scene.nodes.has(focus)) return null
    const walk = (next: (k: string) => string[]) => {
      const set = new Set<string>()
      const stack = [focus]
      while (stack.length) {
        for (const k of next(stack.pop()!)) {
          if (set.has(k)) continue
          set.add(k)
          stack.push(k)
        }
      }
      return set
    }
    return { focus, up: walk((k) => scene.reqs.get(k) ?? []), down: walk((k) => scene.children.get(k) ?? []) }
  }

  /* ── the render loop ── */
  useEffect(() => {
    const canvas = canvasRef.current!
    const floor = floorRef.current!
    const wrap = wrapRef.current!
    const ctx = canvas.getContext('2d')!
    const fctx = floor.getContext('2d')!
    pal.current = resolveColors(wrap)
    let raf = 0
    let lastLineage: ReturnType<typeof lineageFor> = null
    let lastFocus: string | null | undefined

    const resize = () => {
      const r = wrap.getBoundingClientRect()
      const dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1)
      view.current = { w: Math.max(1, r.width), h: Math.max(1, r.height), dpr }
      for (const c of [canvas, floor]) {
        c.width = Math.round(r.width * dpr)
        c.height = Math.round(r.height * dpr)
      }
      if (!placed.current) {
        placed.current = true
        cam.current = fitAllCam()
        if (!reduce) drawIn.current = performance.now()
      } else {
        minK.current = fitAllCam().k * 0.6
      }
      invalidate()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    const mo = new MutationObserver(() => {
      pal.current = resolveColors(wrap)
      invalidate()
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'data-palette', 'data-accent', 'class', 'style'] })

    const drawFloor = (p: Palette) => {
      const { w, h, dpr } = view.current
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      fctx.clearRect(0, 0, w, h)
      // Screen-space lattice drifting at 35% of the web's pan (parallax).
      const S = 34
      const ox = -cam.current.x * cam.current.k * 0.35 + pointer.current.px * 6
      const oy = -cam.current.y * cam.current.k * 0.35 + pointer.current.py * 6
      const gx0 = Math.floor(-ox / S) - 1
      const gy0 = Math.floor(-oy / S) - 1
      fctx.fillStyle = rgba(p.text, p.dark ? 0.16 : 0.13)
      for (let gy = gy0; gy < gy0 + h / S + 3; gy++) {
        for (let gx = gx0; gx < gx0 + w / S + 3; gx++) {
          const id = `${gx},${gy}`
          const x = gx * S + (gy % 2 ? S / 2 : 0) + hash(id, 3) * S * 0.45 + ox
          const y = gy * S + hash(id, 4) * S * 0.45 + oy
          const a = 0.55 + hash(id, 5)
          fctx.globalAlpha = a
          fctx.fillRect(x, y, 1.3, 1.3)
        }
      }
      fctx.globalAlpha = 1
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const p = pal.current
      if (!p) return
      // Camera flight.
      if (fly.current) {
        const f = fly.current
        const t = clamp((now - f.t0) / f.dur)
        const e = easeInOut(t)
        // Zoom in log space so the flight feels even.
        const k = Math.exp(Math.log(f.from.k) + (Math.log(f.to.k) - Math.log(f.from.k)) * e)
        cam.current = { x: f.from.x + (f.to.x - f.from.x) * e, y: f.from.y + (f.to.y - f.from.y) * e, k }
        if (t >= 1) fly.current = null
        dirty.current = true
      }
      const k = cam.current.k
      const growing = drawIn.current !== null
      const dt = Math.min(0.05, 2.2 / scene.maxDepth)
      const elapsed = growing ? (now - drawIn.current!) / 1000 : Infinity
      if (growing && elapsed > scene.maxDepth * dt + 0.8) drawIn.current = null
      const animate = !reduce && k >= FAR
      if (!dirty.current && !growing && !animate) return
      dirty.current = false

      const { w, h, dpr } = view.current
      drawFloor(p)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const cx = cam.current.x
      const cy = cam.current.y
      const sx = (x: number) => (x - cx) * k + w / 2
      const sy = (y: number) => (y - cy) * k + h / 2
      const onScreen = (x: number, y: number, rad: number) => {
        const X = sx(x)
        const Y = sy(y)
        const rr = rad * k
        return X + rr > -40 && X - rr < w + 40 && Y + rr > -40 && Y - rr < h + 40
      }
      const visible = new Set(data.clusters.filter((c) => onScreen(c.x, c.y, c.r)).map((c) => c.id))
      const focus = hovered.current ?? selectedRef.current
      if (focus !== lastFocus) {
        lastLineage = lineageFor(focus)
        lastFocus = focus
      }
      const lin = lastLineage
      const tone = (key: string): 'self' | 'up' | 'down' | 'dim' | null =>
        !lin ? null : key === lin.focus ? 'self' : lin.up.has(key) ? 'up' : lin.down.has(key) ? 'down' : 'dim'
      const nodeAlpha = (s: SNode) => (growing ? clamp((elapsed - s.depth * dt) / 0.3) : 1)
      const edgeGrow = (e: SEdge) => (growing ? clamp((elapsed - e.a.depth * dt) / 0.35) : 1)
      const far = k < FAR
      const near = k >= NEAR
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Cluster outlines and zone rings.
      for (const c of data.clusters) {
        if (!visible.has(c.id)) continue
        const dimC = lin && !(scene.nodes.get(lin.focus)?.cluster.id === c.id) ? 0.5 : 1
        ctx.setLineDash([2, 6])
        ctx.lineWidth = 1
        if (far) {
          ctx.strokeStyle = rgba(p.text, 0.1 * dimC)
          ctx.beginPath()
          ctx.arc(sx(c.x), sy(c.y), (c.r - 40) * k, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          for (const z of c.zones) {
            const rr = z.rings[0]
            if (!rr) continue
            ctx.strokeStyle = z.current ? rgba(p.b2, 0.28 * dimC) : rgba(p.text, (z.locked ? 0.05 : 0.09) * dimC)
            ctx.beginPath()
            ctx.arc(sx(c.x), sy(c.y), rr * k, 0, Math.PI * 2)
            ctx.stroke()
          }
        }
        ctx.setLineDash([])
      }

      // Cross-subject branches: bundled when far, node to node otherwise.
      if (far) {
        for (const b of scene.bundles) {
          if (!visible.has(b.a.id) && !visible.has(b.b.id)) continue
          const dx = b.b.x - b.a.x
          const dy = b.b.y - b.a.y
          const len = Math.hypot(dx, dy) || 1
          const ax = b.a.x + (dx / len) * (b.a.r - 50)
          const ay = b.a.y + (dy / len) * (b.a.r - 50)
          const bx = b.b.x - (dx / len) * (b.b.r - 50)
          const by = b.b.y - (dy / len) * (b.b.r - 50)
          const mx = (ax + bx) / 2 - (dy / len) * len * 0.08
          const my = (ay + by) / 2 + (dx / len) * len * 0.08
          let a = 0.3 + 0.12 * Math.min(4, b.count)
          if (lin) {
            const fc = scene.nodes.get(lin.focus)!.cluster.id
            a = fc === b.a.id || fc === b.b.id ? 0.9 : 0.08
          }
          ctx.strokeStyle = rgba(mix(p.b1, p.b3, 0.5), a * (growing ? clamp(elapsed / 1.5) : 1))
          ctx.lineWidth = 0.7 + Math.log2(1 + b.count) * 0.7
          ctx.beginPath()
          ctx.moveTo(sx(ax), sy(ay))
          ctx.quadraticCurveTo(sx(mx), sy(my), sx(bx), sy(by))
          ctx.stroke()
        }
      }

      // Strands.
      const flows: { e: SEdge; col: RGB }[] = []
      for (const e of scene.edges) {
        if (far && e.cross) continue
        if (!visible.has(e.a.cluster.id) && !visible.has(e.b.cluster.id)) continue
        const g = edgeGrow(e)
        if (g <= 0) continue
        const ta = tone(e.a.key)
        const tb = tone(e.b.key)
        let col = ramp(p, (e.a.u + e.b.u) / 2)
        let alpha = e.state === 2 ? 0.95 : e.state === 1 ? 0.7 : 0.3
        let width = e.state === 2 ? 1.5 : e.state === 1 ? 1.15 : 0.75
        if (e.cross) {
          alpha *= 0.55
          col = mix(p.b1, p.b3, 0.5)
        }
        if (lin) {
          const lit = ta !== 'dim' && tb !== 'dim' && !(ta === 'up' && tb === 'down')
          if (lit) {
            col = tb === 'self' || tb === 'up' ? p.b3 : p.b2
            alpha = 1
            width += 0.6
          } else alpha = 0.06
        }
        if (far) {
          alpha *= 0.55
          width = Math.min(width, 0.8)
        }
        const ax = sx(e.a.node.x)
        const ay = sy(e.a.node.y)
        const bx = sx(e.b.node.x)
        const by = sy(e.b.node.y)
        const kx = sx(e.kx)
        const ky = sy(e.ky)
        ctx.strokeStyle = rgba(col, alpha)
        ctx.lineWidth = width
        ctx.beginPath()
        if (e.cross) {
          // A curve between subjects; grows from the prerequisite.
          ctx.moveTo(ax, ay)
          if (g >= 1) ctx.quadraticCurveTo(kx, ky, bx, by)
          else {
            const t = g
            const qx = (1 - t) * ax + t * kx
            const qy = (1 - t) * ay + t * ky
            const ex = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * kx + t * t * bx
            const ey = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * ky + t * t * by
            ctx.quadraticCurveTo(qx, qy, ex, ey)
          }
        } else {
          // A branch with one knee.
          const total = Math.hypot(kx - ax, ky - ay) + Math.hypot(bx - kx, by - ky)
          const first = Math.hypot(kx - ax, ky - ay)
          const len = total * g
          ctx.moveTo(ax, ay)
          if (len <= first) {
            const t = first ? len / first : 1
            ctx.lineTo(ax + (kx - ax) * t, ay + (ky - ay) * t)
          } else {
            ctx.lineTo(kx, ky)
            const t = (len - first) / Math.max(1e-6, total - first)
            ctx.lineTo(kx + (bx - kx) * t, ky + (by - ky) * t)
          }
          if (!far && g >= 1) {
            ctx.stroke()
            ctx.fillStyle = rgba(col, alpha * 0.8)
            ctx.beginPath()
            ctx.arc(kx, ky, 1.2, 0, Math.PI * 2)
            ctx.fill()
            ctx.beginPath()
          }
        }
        ctx.stroke()
        if (animate && e.state === 1 && g >= 1 && (!lin || alpha === 1) && !e.cross) flows.push({ e, col })
      }

      // A small dot travels along every open strand.
      if (animate && flows.length < 600) {
        for (const { e, col } of flows) {
          const period = 2600 + Math.abs(hash(e.a.key + e.b.key, 7)) * 1800
          const t = ((now + hash(e.b.key, 8) * 4000) % period) / period
          const ax = sx(e.a.node.x)
          const ay = sy(e.a.node.y)
          const kx = sx(e.kx)
          const ky = sy(e.ky)
          const bx = sx(e.b.node.x)
          const by = sy(e.b.node.y)
          const x = t < 0.5 ? ax + (kx - ax) * t * 2 : kx + (bx - kx) * (t - 0.5) * 2
          const y = t < 0.5 ? ay + (ky - ay) * t * 2 : ky + (by - ky) * (t - 0.5) * 2
          ctx.fillStyle = rgba(col, 0.95)
          ctx.beginPath()
          ctx.arc(x, y, Math.max(1.4, 1.9 * Math.min(1, k * 1.4)), 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Skills.
      const rr = Math.max(far ? 1.2 : 2.6, R * k)
      for (const s of scene.nodes.values()) {
        if (!visible.has(s.cluster.id)) continue
        const X = sx(s.node.x)
        const Y = sy(s.node.y)
        if (X < -30 || X > w + 30 || Y < -30 || Y > h + 30) continue
        const a0 = nodeAlpha(s)
        if (a0 <= 0) continue
        const t = tone(s.key)
        const dim = t === 'dim' ? 0.22 : 1
        const col = t === 'up' ? p.b3 : t === 'down' ? p.b2 : ramp(p, s.u)
        const st = s.node.s
        const a = a0 * dim
        if (far || k < 0.2) {
          ctx.fillStyle = st === 0 ? rgba(p.muted, 0.55 * a) : rgba(col, (st === 2 ? 1 : 0.85) * a)
          ctx.beginPath()
          ctx.arc(X, Y, st === 2 ? rr * 1.25 : rr, 0, Math.PI * 2)
          ctx.fill()
          continue
        }
        // Disc, track, progress ring, core.
        ctx.fillStyle = rgba(st === 2 ? mix(p.bg, col, 0.14) : p.bg, a)
        ctx.beginPath()
        ctx.arc(X, Y, rr, 0, Math.PI * 2)
        ctx.fill()
        ctx.lineWidth = Math.max(1, 1.5 * Math.min(1, k * 1.3))
        ctx.strokeStyle = st === 0 ? rgba(p.border, 0.9 * a) : rgba(mix(p.border, col, 0.45), a)
        if (st === 0) ctx.setLineDash([2, 3])
        ctx.stroke()
        ctx.setLineDash([])
        const pct = st === 2 ? 100 : s.node.p
        if (pct > 0) {
          ctx.strokeStyle = rgba(col, a)
          ctx.lineWidth = Math.max(1.2, 2 * Math.min(1, k * 1.3))
          ctx.beginPath()
          ctx.arc(X, Y, rr, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100)
          ctx.stroke()
        }
        ctx.fillStyle = st === 0 ? rgba(p.muted, a) : rgba(col, a)
        if (st === 2) {
          star(ctx, X, Y, rr * 0.6)
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.arc(X, Y, st === 1 ? rr * 0.32 : rr * 0.2, 0, Math.PI * 2)
          ctx.fill()
        }
        // Open skills breathe, softly.
        if (animate && st === 1 && near && !lin) {
          const ph = ((now / 2600 + hash(s.key, 9)) % 1 + 1) % 1
          ctx.strokeStyle = rgba(col, 0.55 * (1 - ph) * a)
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(X, Y, rr * (1.05 + ph * 0.5), 0, Math.PI * 2)
          ctx.stroke()
        }
        if (s.key === selectedRef.current) {
          ctx.strokeStyle = rgba(p.accent, 1)
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.arc(X, Y, rr + 5, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Labels, counts, chips and zone rings (near only).
      chips.current = []
      if (near) {
        const fs = clamp(11.5 * Math.sqrt(k), 9.5, 13)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.lineWidth = 3
        ctx.strokeStyle = rgba(p.bg, 0.9)
        for (const c of data.clusters) {
          if (!visible.has(c.id)) continue
          ctx.font = `600 ${(fs - 1.5).toFixed(1)}px ${p.font}`
          for (const z of c.zones) {
            const rr2 = z.rings[0]
            const Y = sy(c.y - (rr2 || 0)) - (rr2 ? fs + 6 : R * k + 30)
            const X = sx(c.x)
            const engine = c.engine === 'dsa'
            const label = `${engine ? `Zone ${z.level} · ${z.name}` : `${String(z.level).padStart(2, '0')} · ${z.name}`} · ${
              z.locked ? (engine ? `${z.xpRequired.toLocaleString()} XP` : 'locked') : `${z.nodesCompleted}/${z.nodeCount}`
            }${z.current ? ' · you are here' : ''}`
            ctx.fillStyle = z.current ? rgba(p.b2, 0.95) : rgba(p.muted, 0.9)
            ctx.strokeText(label, X, Y)
            ctx.fillText(label, X, Y)
          }
        }
        for (const s of scene.nodes.values()) {
          if (!visible.has(s.cluster.id)) continue
          const X = sx(s.node.x)
          const Y = sy(s.node.y)
          if (X < -80 || X > w + 80 || Y < -60 || Y > h + 60) continue
          const a = nodeAlpha(s) * (tone(s.key) === 'dim' ? 0.3 : 1)
          if (a <= 0) continue
          const top = Y + R * k + 4
          ctx.font = `600 ${fs.toFixed(1)}px ${p.font}`
          ctx.fillStyle = rgba(s.node.s === 0 ? p.muted : p.text, a)
          ctx.strokeText(s.node.n, X, top)
          ctx.fillText(s.node.n, X, top)
          ctx.font = `${(fs - 2).toFixed(1)}px ui-monospace, SFMono-Regular, Menlo, monospace`
          ctx.fillStyle = rgba(p.muted, a)
          const count = s.node.s === 2 ? 'mastered' : s.node.c
          ctx.strokeText(count, X, top + fs + 2)
          ctx.fillText(count, X, top + fs + 2)
          const need = s.node.cx?.[0]
          const target = need ? scene.nodes.get(need) : null
          if (target && k >= 0.55) {
            const text = `Needs · ${target.node.n} (${target.cluster.short})${(s.node.cx?.length ?? 0) > 1 ? ` +${s.node.cx!.length - 1}` : ''}`
            ctx.font = `500 ${(fs - 2).toFixed(1)}px ${p.font}`
            const tw = ctx.measureText(text).width
            const cw = tw + 12
            const ch = fs + 2
            const cxp = X - cw / 2
            const cyp = top + fs * 2 + 7
            roundRect(ctx, cxp, cyp, cw, ch, ch / 2)
            ctx.fillStyle = rgba(mix(p.bg, p.b3, 0.1), a)
            ctx.fill()
            ctx.strokeStyle = rgba(p.b3, (target.node.s === 2 ? 0.35 : 0.6) * a)
            ctx.lineWidth = 1
            ctx.stroke()
            ctx.fillStyle = rgba(mix(p.b3, p.text, p.dark ? 0.2 : 0.35), a)
            ctx.fillText(text, X, cyp + 1.5)
            ctx.lineWidth = 3
            ctx.strokeStyle = rgba(p.bg, 0.9)
            chips.current.push({ x: cxp, y: cyp, w: cw, h: ch, target: need! })
          }
        }
      }

      // Subject names: quiet, one per cluster.
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      for (const c of data.clusters) {
        if (!visible.has(c.id)) continue
        const screenR = (c.r - 40) * k
        const name = screenR < 70 ? c.short : c.name
        const fs = 12
        ctx.font = `600 ${fs}px ${p.font}`
        const fc = lin ? scene.nodes.get(lin.focus)?.cluster.id : null
        const a = fc && fc !== c.id ? 0.35 : 0.85
        const X = sx(c.x)
        const Y = sy(c.y) - screenR - 8
        ctx.lineWidth = 3
        ctx.strokeStyle = rgba(p.bg, 0.85)
        ctx.fillStyle = rgba(p.muted, a * (growing ? clamp(elapsed / 0.8) : 1))
        ctx.strokeText(name, X, Y)
        ctx.fillText(name, X, Y)
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mo.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, reduce])

  /* ── pointer, wheel and keyboard ── */
  useEffect(() => {
    const canvas = canvasRef.current!
    const pts = new Map<number, { x: number; y: number }>()
    let drag: { x: number; y: number; moved: boolean; cam: { x: number; y: number; k: number } } | null = null
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
    const zoomAt = (x: number, y: number, k2: number) => {
      const before = toWorld(x, y)
      const k = clamp(k2, minK.current, MAX_K)
      const { w, h } = view.current
      cam.current = { k, x: before.x - (x - w / 2) / k, y: before.y - (y - h / 2) / k }
      fly.current = null
      invalidate()
    }
    const hit = (x: number, y: number): { type: 'chip' | 'node' | 'cluster' | 'none'; key?: string } => {
      for (const c of chips.current) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return { type: 'chip', key: c.target }
      const k = cam.current.k
      const wpt = toWorld(x, y)
      if (k >= 0.2) {
        const rad = Math.max(R * k, 9) + 5
        let best: string | null = null
        let bd = Infinity
        for (const s of scene.nodes.values()) {
          const d = Math.hypot((s.node.x - wpt.x) * k, (s.node.y - wpt.y) * k)
          if (d < rad && d < bd) {
            bd = d
            best = s.key
          }
        }
        if (best) return { type: 'node', key: best }
      }
      for (const c of data.clusters) if (Math.hypot(c.x - wpt.x, c.y - wpt.y) <= c.r) return { type: 'cluster', key: c.id }
      return { type: 'none' }
    }
    const down = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      pts.set(e.pointerId, local(e))
      if (pts.size === 1) drag = { ...local(e), moved: false, cam: { ...cam.current } }
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
      pointer.current = { px: p.x / w - 0.5, py: p.y / h - 0.5 }
      if (pts.has(e.pointerId)) pts.set(e.pointerId, p)
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1
        const k = clamp((pinch.k * d) / pinch.d, minK.current, MAX_K)
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        cam.current = { k, x: pinch.wx - (mx - w / 2) / k, y: pinch.wy - (my - h / 2) / k }
        fly.current = null
        invalidate()
        return
      }
      if (drag && pts.size === 1) {
        const dx = p.x - drag.x
        const dy = p.y - drag.y
        if (!drag.moved && Math.hypot(dx, dy) > 5) drag.moved = true
        if (drag.moved) {
          cam.current = { ...drag.cam, x: drag.cam.x - dx / drag.cam.k, y: drag.cam.y - dy / drag.cam.k }
          fly.current = null
          invalidate()
        }
        return
      }
      if (e.pointerType === 'mouse') {
        const h2 = hit(p.x, p.y)
        const key = h2.type === 'node' ? h2.key! : null
        if (key !== hovered.current) {
          hovered.current = key
          invalidate()
        }
        if (h2.type === 'node' || h2.type === 'chip' || (h2.type === 'cluster' && cam.current.k < 0.3)) canvas.dataset.hover = ''
        else delete canvas.dataset.hover
      }
      invalidate()
    }
    const up = (e: PointerEvent) => {
      const wasTap = drag && !drag.moved && pts.size === 1
      pts.delete(e.pointerId)
      if (pts.size < 2) pinch = null
      if (pts.size === 0) {
        if (wasTap) {
          const p = local(e)
          const h2 = hit(p.x, p.y)
          if (h2.type === 'chip') {
            onSelectRef.current(h2.key!)
            apiRef.current.flyToNode(h2.key!)
          } else if (h2.type === 'node') {
            const next = selectedRef.current === h2.key ? null : h2.key!
            onSelectRef.current(next)
            if (next) setActive(scene.nodes.get(next)!.cluster.id)
          } else if (h2.type === 'cluster') {
            if (cam.current.k < NEAR * 0.9) apiRef.current.flyToCluster(h2.key!)
            else onSelectRef.current(null)
          } else {
            onSelectRef.current(null)
            apiRef.current.fitAll()
          }
        }
        drag = null
      } else if (pts.size === 1) {
        const [only] = [...pts.values()]
        drag = { ...only, moved: true, cam: { ...cam.current } }
      }
    }
    const leave = () => {
      if (hovered.current) {
        hovered.current = null
        invalidate()
      }
      pointer.current = { px: 0, py: 0 }
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const p = local(e)
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0016))
      zoomAt(p.x, p.y, cam.current.k * factor)
    }
    const key = (e: KeyboardEvent) => {
      const c = cam.current
      const step = 120 / c.k
      const { w, h } = view.current
      if (e.key === 'ArrowLeft') cam.current = { ...c, x: c.x - step }
      else if (e.key === 'ArrowRight') cam.current = { ...c, x: c.x + step }
      else if (e.key === 'ArrowUp') cam.current = { ...c, y: c.y - step }
      else if (e.key === 'ArrowDown') cam.current = { ...c, y: c.y + step }
      else if (e.key === '+' || e.key === '=') zoomAt(w / 2, h / 2, c.k * 1.25)
      else if (e.key === '-') zoomAt(w / 2, h / 2, c.k / 1.25)
      else if (e.key === 'Escape' || e.key === '0') {
        onSelectRef.current(null)
        apiRef.current.fitAll()
      } else return
      e.preventDefault()
      invalidate()
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
  }, [scene])

  const total = data.clusters.reduce((a, c) => a + c.nodes.length, 0)
  return (
    <div ref={wrapRef} className="card nx-web p-0">
      <canvas ref={floorRef} className="nx-web-floor" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="nx-web-main"
        tabIndex={0}
        role="application"
        aria-label={`The Nexus web: ${data.clusters.length} subjects, ${total} skills. Drag to pan, scroll or pinch to zoom, click a subject to zoom in and a skill to open it. Arrow keys pan, plus and minus zoom, Escape shows the whole web.`}
      />
    </div>
  )
})
