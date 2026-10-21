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
 * Split in two so the heavy part never blocks the page:
 *   computeLayout(structure) → LayoutData   pure data (typed arrays), runs in
 *                                            a Web Worker, cached by version
 *   assemble(layout, clusters) → Web        cheap, on the main thread, binds
 *                                            the reader's live node data
 * Everything is deterministic (seeded), so the web is the same on every
 * visit and every device. Nothing knows a subject by name.
 */

export const SP = 76 // lattice spacing
const JITTER = 30 // ±15
const STEP = 118 // radial distance per prerequisite level
const R0 = 300 // radius of the first concept level
const MARGIN = 1500 // lattice beyond the outermost concepts
export const BUCKETS = 48

export function rng(seed: number) {
  let s = seed >>> 0
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
}

export type RGB = [number, number, number]
const C1: RGB = [91, 140, 255]
const C2: RGB = [155, 107, 255]
const C3: RGB = [45, 212, 191]
export const BRAND = { C1, C2, C3 }
/** The teaser's ramp: blue → violet → teal. */
export function mix3(u: number): RGB {
  const t = Math.max(0, Math.min(1, u))
  const [a, b, k] = t < 0.55 ? [C1, C2, t / 0.55] : [C2, C3, (t - 0.55) / 0.45]
  return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)]
}

/** What the layout needs from the structure (no per-user data). */
export interface LayoutInput {
  id: string
  domain: string
  order: number
  nodes: { id: string; req: string[]; cx?: string[] }[]
}

/** The computed layout: transferable, cacheable, version-keyed. */
export interface LayoutData {
  version: string
  xy: Float32Array
  parent: Int32Array
  depth: Int32Array
  bucket: Uint8Array
  origin: number
  maxDepth: number
  extent: number
  /** concept keys in structure order, and the lattice point / level of each */
  keys: string[]
  pins: Int32Array
  levels: Int32Array
  regions: { id: string; x: number; y: number; a0: number; a1: number; rMin: number; rMax: number }[]
}

export interface Concept {
  key: string
  cluster: WebCluster
  node: WebNode
  pt: number
  level: number
  prereqs: string[]
  unlocks: string[]
}

export interface Region {
  cluster: WebCluster
  x: number
  y: number
  a0: number
  a1: number
  rMin: number
  rMax: number
  progress: number
}

export interface Web extends Omit<LayoutData, 'regions' | 'keys' | 'pins' | 'levels'> {
  concepts: Map<string, Concept>
  conceptAt: Map<number, string>
  regions: Region[]
}

export function computeLayout(clusters: LayoutInput[], version = ''): LayoutData {
  // ── concepts and their depth across the web ──
  const keyOf = (c: LayoutInput, id: string) => `${c.id}:${id}`
  const reqs = new Map<string, string[]>()
  const index = new Map<string, number>()
  for (const c of clusters) c.nodes.forEach((n, i) => index.set(keyOf(c, n.id), i))
  for (const c of clusters) {
    for (const n of c.nodes) reqs.set(keyOf(c, n.id), [...n.req.map((r) => keyOf(c, r)), ...(n.cx ?? [])].filter((k) => index.has(k)))
  }
  const level = new Map<string, number>()
  const lv = (k: string, guard = 0): number => {
    const known = level.get(k)
    if (known !== undefined) return known
    if (guard > 200) return 0
    const rs = reqs.get(k)!
    const v = rs.length ? 1 + Math.max(...rs.map((r) => lv(r, guard + 1))) : 0
    level.set(k, v)
    return v
  }
  for (const k of reqs.keys()) lv(k)
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
  const cell = (v: number) => Math.floor(v / SP)
  const grid = new Map<number, number[]>()
  const gkey = (cx: number, cy: number) => cx * 100003 + cy
  for (let i = 0; i < count; i++) {
    const k = gkey(cell(xy[2 * i]), cell(xy[2 * i + 1]))
    const list = grid.get(k)
    if (list) list.push(i)
    else grid.set(k, [i])
  }
  const near = (x: number, y: number, rad: number, fn: (i: number) => void) => {
    const r = Math.ceil(rad / SP)
    const cx = cell(x)
    const cy = cell(y)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) for (const i of grid.get(gkey(cx + dx, cy + dy)) ?? []) fn(i)
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
  // Points the tree never reached join it through a reached neighbour.
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
  const GAP = 0.035
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
  const pinOf = new Map<string, number>()
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
  const regions: LayoutData['regions'] = []
  for (const c of ordered) {
    const [a0, a1] = wedge.get(c.id)!
    const byLevel = new Map<number, { k: string; index: number }[]>()
    for (const n2 of c.nodes) {
      const k = keyOf(c, n2.id)
      const l = level.get(k)!
      const list = byLevel.get(l) ?? []
      list.push({ k, index: index.get(k)! })
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
        pinOf.set(item.k, pt)
        rMin = Math.min(rMin, rr)
        rMax = Math.max(rMax, rr)
      })
    }
    const mid = (a0 + a1) / 2
    const rl = rMin === Infinity ? R0 : rMin + (rMax - rMin) * 0.35
    regions.push({ id: c.id, x: Math.cos(mid) * rl + ox, y: Math.sin(mid) * rl + oy, a0, a1, rMin: rMin === Infinity ? R0 : rMin, rMax })
  }
  const keys: string[] = []
  for (const c of clusters) for (const n2 of c.nodes) keys.push(keyOf(c, n2.id))
  const pins = Int32Array.from(keys.map((k) => pinOf.get(k) ?? -1))
  const levels = Int32Array.from(keys.map((k) => level.get(k) ?? 0))
  return { version, xy, parent, depth, bucket, origin, maxDepth, extent, keys, pins, levels, regions }
}

/** Bind a layout to the clusters with the reader's live data (cheap). */
export function assemble(layout: LayoutData, clusters: WebCluster[]): Web {
  const byKey = new Map<string, { c: WebCluster; n: WebNode }>()
  for (const c of clusters) for (const n of c.nodes) byKey.set(`${c.id}:${n.id}`, { c, n })
  const concepts = new Map<string, Concept>()
  const conceptAt = new Map<number, string>()
  layout.keys.forEach((key, i) => {
    const hit = byKey.get(key)
    const pt = layout.pins[i]
    if (!hit || pt < 0) return
    const prereqs = [...hit.n.req.map((r) => `${hit.c.id}:${r}`), ...(hit.n.cx ?? [])].filter((k) => byKey.has(k))
    concepts.set(key, { key, cluster: hit.c, node: hit.n, pt, level: layout.levels[i], prereqs, unlocks: [] })
    conceptAt.set(pt, key)
  })
  for (const v of concepts.values()) for (const r of v.prereqs) concepts.get(r)?.unlocks.push(v.key)
  const byId = new Map(clusters.map((c) => [c.id, c]))
  const regions: Region[] = []
  for (const r of layout.regions) {
    const c = byId.get(r.id)
    if (!c) continue
    const progress = c.nodes.length ? Math.round(c.nodes.reduce((s, x) => s + x.p, 0) / c.nodes.length) : 0
    regions.push({ cluster: c, x: r.x, y: r.y, a0: r.a0, a1: r.a1, rMin: r.rMin, rMax: r.rMax, progress })
  }
  const { xy, parent, depth, bucket, origin, maxDepth, extent, version } = layout
  return { version, xy, parent, depth, bucket, origin, maxDepth, extent, concepts, conceptAt, regions }
}

/** The whole pipeline in one call (tests, and the tiny loading web). */
export function buildWeb(clusters: WebCluster[], version = ''): Web {
  return assemble(computeLayout(clusters, version), clusters)
}

/** Points on the tree path from a to b (a … branch point … b). */
export function treePath(web: Pick<Web, 'parent' | 'depth'>, a: number, b: number): number[] {
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
export function pathFromOrigin(web: Pick<Web, 'parent'>, p: number): number[] {
  const out: number[] = []
  for (let x = p; x >= 0; x = web.parent[x]) out.push(x)
  return out.reverse()
}

/* ── analysis on the web (pure; unit-tested) ── */

/** How many concepts each concept eventually unlocks (transitively). */
export function unlockCounts(web: Pick<Web, 'concepts'>): Map<string, number> {
  const memo = new Map<string, Set<string>>()
  const below = (k: string, guard = 0): Set<string> => {
    const hit = memo.get(k)
    if (hit) return hit
    const set = new Set<string>()
    memo.set(k, set)
    if (guard > 300) return set
    for (const u of web.concepts.get(k)?.unlocks ?? []) {
      set.add(u)
      for (const x of below(u, guard + 1)) set.add(x)
    }
    return set
  }
  const out = new Map<string, number>()
  for (const k of web.concepts.keys()) out.set(k, below(k).size)
  return out
}

/** Keystones: the concepts that unlock the most (top share, at least `min`). */
export function keystones(web: Pick<Web, 'concepts'>, share = 0.012, min = 10): Set<string> {
  const counts = [...unlockCounts(web)].filter(([, n]) => n >= min).sort((a, b) => b[1] - a[1])
  return new Set(counts.slice(0, Math.max(1, Math.round(web.concepts.size * share))).map(([k]) => k))
}

/** The longest chain of prerequisites that ends at `key` (roots first). */
export function longestChain(web: Pick<Web, 'concepts'>, key: string): string[] {
  const memo = new Map<string, string[]>()
  const chain = (k: string, guard = 0): string[] => {
    const hit = memo.get(k)
    if (hit) return hit
    let bestChain: string[] = []
    if (guard < 300) {
      for (const r of web.concepts.get(k)?.prereqs ?? []) {
        const c = chain(r, guard + 1)
        if (c.length > bestChain.length) bestChain = c
      }
    }
    const out = [...bestChain, k]
    memo.set(k, out)
    return out
  }
  return web.concepts.has(key) ? chain(key) : []
}

/**
 * A goal route through the web: every concept of the route's subjects plus
 * the prerequisites they need, in learning order (prerequisites first,
 * nearer YOU first). `next` are the first steps not yet mastered.
 */
export function routePlan(web: Pick<Web, 'concepts'>, subjects: string[], nextCount = 5): { order: string[]; next: string[] } {
  const want = new Set<string>()
  const add = (k: string, guard = 0) => {
    if (want.has(k) || guard > 300) return
    want.add(k)
    for (const r of web.concepts.get(k)?.prereqs ?? []) add(r, guard + 1)
  }
  const subj = new Set(subjects)
  for (const [k, c] of web.concepts) if (subj.has(c.cluster.id)) add(k)
  // Topological order (Kahn), ties by level then key, so it is stable.
  const indeg = new Map<string, number>()
  for (const k of want) indeg.set(k, (web.concepts.get(k)?.prereqs ?? []).filter((r) => want.has(r)).length)
  const ready = [...want].filter((k) => indeg.get(k) === 0)
  const lvl = (k: string) => web.concepts.get(k)?.level ?? 0
  const order: string[] = []
  while (ready.length) {
    ready.sort((a, b) => lvl(a) - lvl(b) || a.localeCompare(b))
    const k = ready.shift()!
    order.push(k)
    for (const u of web.concepts.get(k)?.unlocks ?? []) {
      if (!want.has(u)) continue
      const d = (indeg.get(u) ?? 1) - 1
      indeg.set(u, d)
      if (d === 0) ready.push(u)
    }
  }
  const next = order.filter((k) => web.concepts.get(k)?.node.s !== 2).slice(0, nextCount)
  return { order, next }
}

/**
 * The next best step: an open concept you have started (most progress),
 * else the open concept nearest YOU that unlocks the most — preferring the
 * active route's next waypoint.
 */
export function nextBestStep(web: Pick<Web, 'concepts'>, route?: { next: string[] } | null): string | null {
  if (route?.next.length) {
    const first = route.next.find((k) => web.concepts.get(k)?.node.s === 1)
    if (first) return first
  }
  const counts = unlockCounts(web)
  let best: string | null = null
  let score = -Infinity
  for (const [k, c] of web.concepts) {
    if (c.node.s !== 1) continue
    const s = (c.node.p > 0 ? 1000 + c.node.p : 0) - c.level * 10 + Math.min(50, counts.get(k) ?? 0)
    if (s > score) {
      score = s
      best = k
    }
  }
  return best
}

/**
 * Memory: how much of a mastered concept is still fresh after `aheadDays`
 * more days, from the last time its PYQs were answered right and the
 * spaced-repetition interval reached (forgetting curve, half-life ≈ 2 × the
 * interval, at least 3 days). 1 when there is no review data.
 */
export function retention(node: Pick<WebNode, 's' | 'ag' | 'iv'>, aheadDays = 0): number {
  if (node.s !== 2 || node.ag === undefined || node.ag < 0) return 1
  const half = Math.max(3, (node.iv ?? 0) * 2)
  return Math.pow(0.5, (node.ag + aheadDays) / half)
}

/* ── hit-testing: a uniform grid over screen points (same-frame, O(1)) ── */
export class HitGrid {
  private cells = new Map<number, number[]>()
  private xs: number[] = []
  private ys: number[] = []
  private ids: string[] = []
  private size: number
  constructor(size = 32) {
    this.size = size
  }
  clear() {
    this.cells.clear()
    this.xs.length = 0
    this.ys.length = 0
    this.ids.length = 0
  }
  add(id: string, x: number, y: number) {
    const i = this.ids.length
    this.ids.push(id)
    this.xs.push(x)
    this.ys.push(y)
    const k = Math.floor(x / this.size) * 65536 + Math.floor(y / this.size)
    const list = this.cells.get(k)
    if (list) list.push(i)
    else this.cells.set(k, [i])
  }
  /** Nearest id within `radius` of (x, y), or null. */
  nearest(x: number, y: number, radius: number): string | null {
    const r = Math.ceil(radius / this.size)
    const cx = Math.floor(x / this.size)
    const cy = Math.floor(y / this.size)
    let best: string | null = null
    let bd = radius
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        for (const i of this.cells.get((cx + dx) * 65536 + (cy + dy)) ?? []) {
          const d = Math.hypot(this.xs[i] - x, this.ys[i] - y)
          if (d <= bd) {
            bd = d
            best = this.ids[i]
          }
        }
      }
    }
    return best
  }
  position(id: string): { x: number; y: number } | null {
    const i = this.ids.indexOf(id)
    return i < 0 ? null : { x: this.xs[i], y: this.ys[i] }
  }
  get count(): number {
    return this.ids.length
  }
}
