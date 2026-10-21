import type { WebCluster, WebNode } from './types'

/*
 * The Nexus web, built the way the NexoraGuru teaser builds its background:
 *
 *  1. A jittered offset-hex lattice of points (spacing 76, jitter ±15).
 *     Neighbours are points closer than 1.25 × spacing.
 *  2. A breadth-first spanning tree grows from ONE origin at the centre (the
 *     learner): every visited point takes 1–3 random unvisited neighbours as
 *     children. Its edges are the web you see.
 *  3. Every concept of every subject is pinned to a lattice point. Subjects
 *     own contiguous wedges, grouped by domain; a concept's distance from
 *     the origin grows with its prerequisite depth across the whole web, so
 *     prerequisites always sit nearer YOU than what they unlock.
 *  4. Links between concepts are routes along the tree: up from one to their
 *     common branch point and down to the other.
 *
 * Everything is deterministic (seeded), so the web is the same on every
 * visit and every device. Nothing knows a subject by name.
 */

export const SP = 76 // lattice spacing
const JITTER = 30 // ±15
const STEP = 118 // radial distance per prerequisite level
const R0 = 300 // radius of the first concept level
const MARGIN = 1500 // lattice beyond the outermost concepts

export function rng(seed: number) {
  let s = seed >>> 0
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
}

const C1: RGB = [91, 140, 255]
const C2: RGB = [155, 107, 255]
const C3: RGB = [45, 212, 191]
export type RGB = [number, number, number]
/** The teaser's ramp: blue → violet → teal. */
export function mix3(u: number): RGB {
  const t = Math.max(0, Math.min(1, u))
  const [a, b, k] = t < 0.55 ? [C1, C2, t / 0.55] : [C2, C3, (t - 0.55) / 0.45]
  return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)]
}
export const BRAND = { C1, C2, C3 }

export interface Concept {
  key: string
  cluster: WebCluster
  node: WebNode
  /** lattice point it is pinned to */
  pt: number
  /** prerequisite depth across the web */
  level: number
  prereqs: string[]
  unlocks: string[]
}

export interface Region {
  cluster: WebCluster
  /** label position */
  x: number
  y: number
  a0: number
  a1: number
  rMin: number
  rMax: number
  progress: number
}

export interface Web {
  /** lattice point coordinates (x0, y0, x1, y1, …) */
  xy: Float32Array
  /** BFS parent of each point (-1 for the origin and unreached points) */
  parent: Int32Array
  /** BFS depth (-1 when unreached) */
  depth: Int32Array
  maxDepth: number
  origin: number
  /** colour bucket (0…BUCKETS-1) of the edge into each point */
  bucket: Uint8Array
  concepts: Map<string, Concept>
  conceptAt: Map<number, string>
  regions: Region[]
  extent: number
}

export const BUCKETS = 48

export function buildWeb(clusters: WebCluster[]): Web {
  // ── concepts and their depth across the web ──
  const keyOf = (c: WebCluster, id: string) => `${c.id}:${id}`
  const all = new Map<string, { c: WebCluster; n: WebNode; reqs: string[]; index: number }>()
  for (const c of clusters) c.nodes.forEach((n, index) => all.set(keyOf(c, n.id), { c, n, index, reqs: [] }))
  for (const v of all.values()) {
    v.reqs = [...v.n.req.map((r) => keyOf(v.c, r)), ...(v.n.cx ?? [])].filter((k) => all.has(k))
  }
  const level = new Map<string, number>()
  const lv = (k: string, guard = 0): number => {
    if (level.has(k)) return level.get(k)!
    if (guard > 200) return 0
    const reqs = all.get(k)!.reqs
    const v = reqs.length ? 1 + Math.max(...reqs.map((r) => lv(r, guard + 1))) : 0
    level.set(k, v)
    return v
  }
  for (const k of all.keys()) lv(k)
  const maxLevel = Math.max(0, ...level.values())
  const radiusOf = (l: number) => R0 + l * STEP
  const extent = radiusOf(maxLevel) + MARGIN

  // ── the lattice (the teaser's exact construction) ──
  const R = rng(7)
  const n = Math.ceil(extent / SP) + 1
  const pts: number[] = []
  for (let gy = -n; gy <= n; gy++) {
    for (let gx = -n; gx <= n; gx++) {
      const x = gx * SP + (gy % 2 ? SP / 2 : 0) + (R() - 0.5) * JITTER
      const y = gy * SP + (R() - 0.5) * JITTER
      if (x * x + y * y > extent * extent) continue
      pts.push(x, y)
    }
  }
  const xy = new Float32Array(pts)
  const count = xy.length / 2
  // Spatial hash for neighbours.
  const cell = (v: number) => Math.floor(v / SP)
  const grid = new Map<string, number[]>()
  for (let i = 0; i < count; i++) {
    const k = `${cell(xy[2 * i])},${cell(xy[2 * i + 1])}`
    const list = grid.get(k)
    if (list) list.push(i)
    else grid.set(k, [i])
  }
  const near = (x: number, y: number, rad: number, fn: (i: number) => void) => {
    const r = Math.ceil(rad / SP)
    const cx = cell(x)
    const cy = cell(y)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) for (const i of grid.get(`${cx + dx},${cy + dy}`) ?? []) fn(i)
  }
  const nb: number[][] = new Array(count)
  const lim = SP * 1.25
  for (let i = 0; i < count; i++) {
    const out: number[] = []
    const x = xy[2 * i]
    const y = xy[2 * i + 1]
    near(x, y, lim, (j) => {
      if (j !== i && Math.hypot(xy[2 * j] - x, xy[2 * j + 1] - y) < lim) out.push(j)
    })
    out.sort((a, b) => a - b)
    nb[i] = out
  }
  let origin = 0
  let best = Infinity
  for (let i = 0; i < count; i++) {
    const d = Math.hypot(xy[2 * i], xy[2 * i + 1])
    if (d < best) {
      best = d
      origin = i
    }
  }
  // BFS spanning tree: each point takes 1–3 random unvisited neighbours.
  const parent = new Int32Array(count).fill(-1)
  const depth = new Int32Array(count).fill(-1)
  depth[origin] = 0
  let q = [origin]
  while (q.length) {
    const nq: number[] = []
    for (const i of q) {
      const opts = nb[i].filter((j) => depth[j] < 0)
      for (let a = opts.length - 1; a > 0; a--) {
        const b = Math.floor(R() * (a + 1))
        ;[opts[a], opts[b]] = [opts[b], opts[a]]
      }
      for (const j of opts.slice(0, 1 + Math.floor(R() * 3))) {
        depth[j] = depth[i] + 1
        parent[j] = i
        nq.push(j)
      }
    }
    q = nq
  }
  // Points the tree never reached join it through any reached neighbour,
  // so the web covers everything.
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < count; i++) {
      if (depth[i] >= 0) continue
      let pick = -1
      for (const j of nb[i]) if (depth[j] >= 0 && (pick < 0 || depth[j] < depth[pick])) pick = j
      if (pick >= 0) {
        depth[i] = depth[pick] + 1
        parent[i] = pick
      }
    }
  }
  let maxDepth = 0
  for (let i = 0; i < count; i++) maxDepth = Math.max(maxDepth, depth[i])
  // Colour by angle and depth, as the teaser does.
  const bucket = new Uint8Array(count)
  const ox = xy[2 * origin]
  const oy = xy[2 * origin + 1]
  for (let i = 0; i < count; i++) {
    const ang = (Math.atan2(xy[2 * i + 1] - oy, xy[2 * i] - ox) / (2 * Math.PI) + 0.5 + (Math.max(0, depth[i]) / Math.max(1, maxDepth)) * 0.3) % 1
    bucket[i] = Math.min(BUCKETS - 1, Math.floor(ang * BUCKETS))
  }

  // ── subject wedges, grouped by domain ──
  const domainOrder = [...new Set(clusters.map((c) => c.domain))].sort((a, b) => {
    const oa = Math.min(...clusters.filter((c) => c.domain === a).map((c) => c.order))
    const ob = Math.min(...clusters.filter((c) => c.domain === b).map((c) => c.order))
    return oa - ob || a.localeCompare(b)
  })
  const ordered = [...clusters].sort(
    (a, b) => domainOrder.indexOf(a.domain) - domainOrder.indexOf(b.domain) || a.order - b.order || a.id.localeCompare(b.id),
  )
  const total = ordered.reduce((s, c) => s + c.nodes.length, 0) || 1
  const GAP = 0.035 // between domains
  const usable = Math.PI * 2 - GAP * domainOrder.length
  let a = -Math.PI / 2
  let prevDomain: string | null = null
  const wedge = new Map<string, [number, number]>()
  for (const c of ordered) {
    if (prevDomain !== null && c.domain !== prevDomain) a += GAP
    prevDomain = c.domain
    const span = (usable * c.nodes.length) / total
    wedge.set(c.id, [a, a + span])
    a += span
  }

  // ── pin concepts to lattice points ──
  const taken = new Set<number>([origin])
  const conceptAt = new Map<number, string>()
  const concepts = new Map<string, Concept>()
  const pin = (tx: number, ty: number) => {
    let pick = -1
    let bd = Infinity
    for (let rad = SP; rad <= SP * 6 && pick < 0; rad += SP) {
      near(tx, ty, rad, (i) => {
        if (taken.has(i) || depth[i] < 0) return
        const d = Math.hypot(xy[2 * i] - tx, xy[2 * i + 1] - ty)
        if (d < bd) {
          bd = d
          pick = i
        }
      })
    }
    return pick
  }
  const regions: Region[] = []
  for (const c of ordered) {
    const [a0, a1] = wedge.get(c.id)!
    const byLevel = new Map<number, { k: string; index: number }[]>()
    for (const n2 of c.nodes) {
      const k = keyOf(c, n2.id)
      const l = level.get(k)!
      const list = byLevel.get(l) ?? []
      list.push({ k, index: all.get(k)!.index })
      byLevel.set(l, list)
    }
    let rMin = Infinity
    let rMax = 0
    for (const [l, list] of [...byLevel].sort((x, y) => x[0] - y[0])) {
      list.sort((x, y) => x.index - y.index)
      const r = radiusOf(l)
      list.forEach((item, j) => {
        const t = (j + 0.5) / list.length
        const ang = a0 + (a1 - a0) * (0.08 + 0.84 * t)
        const rr = r + (list.length > 1 && j % 2 ? STEP * 0.32 : 0)
        const pt = pin(Math.cos(ang) * rr + ox, Math.sin(ang) * rr + oy)
        if (pt < 0) return
        taken.add(pt)
        conceptAt.set(pt, item.k)
        const v = all.get(item.k)!
        concepts.set(item.k, { key: item.k, cluster: c, node: v.n, pt, level: l, prereqs: v.reqs, unlocks: [] })
        rMin = Math.min(rMin, rr)
        rMax = Math.max(rMax, rr)
      })
    }
    const mid = (a0 + a1) / 2
    const rl = rMin === Infinity ? R0 : rMin + (rMax - rMin) * 0.35
    const progress = c.nodes.length ? Math.round(c.nodes.reduce((s, x) => s + x.p, 0) / c.nodes.length) : 0
    regions.push({ cluster: c, x: Math.cos(mid) * rl + ox, y: Math.sin(mid) * rl + oy, a0, a1, rMin: rMin === Infinity ? R0 : rMin, rMax, progress })
  }
  for (const v of concepts.values()) for (const r of v.prereqs) concepts.get(r)?.unlocks.push(v.key)
  return { xy, parent, depth, maxDepth, origin, bucket, concepts, conceptAt, regions, extent }
}

/** Points on the tree path from a to b (a … branch point … b). */
export function treePath(web: Web, a: number, b: number): number[] {
  const up: number[] = []
  const down: number[] = []
  let x = a
  let y = b
  while (web.depth[x] > web.depth[y] && x >= 0) {
    up.push(x)
    x = web.parent[x]
  }
  while (web.depth[y] > web.depth[x] && y >= 0) {
    down.push(y)
    y = web.parent[y]
  }
  while (x !== y && x >= 0 && y >= 0) {
    up.push(x)
    down.push(y)
    x = web.parent[x]
    y = web.parent[y]
  }
  if (x >= 0) up.push(x)
  return [...up, ...down.reverse()]
}

/** Points from the origin out to p. */
export function pathFromOrigin(web: Web, p: number): number[] {
  const out: number[] = []
  for (let x = p; x >= 0; x = web.parent[x]) out.push(x)
  return out.reverse()
}
