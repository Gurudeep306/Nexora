/*
 * The radial Nexus: every subject's Rift Tree bent into one sector of a
 * single tree that grows outward from YOU at the centre.
 *
 *  • Zones are concentric rings, in the same order as the original bands:
 *    zone 1 nearest the centre, then outward. A ring is as deep as the
 *    deepest subject needs it (a zone with many skills holds several rows).
 *  • Each subject owns a sector (subjects of a stream sit together); its
 *    zones are the successive rings inside that sector.
 *  • Inside a zone, skills sit in rows of a few columns, ordered by where
 *    their prerequisites are, so links stay short and untangled.
 *
 * Pure and deterministic: computed off the main thread (radial.worker.ts)
 * and cached per structure version (layoutCache.ts).
 */

export const NODE = 56 // orb diameter incl. progress ring (as in SkillGraph)
export const R = NODE / 2
export const SLOT = 136 // one column: an orb and its two-line name
export const ROW = 128 // one row of skills inside a ring
const RING_PAD = 40
const SUBJECT_GAP = 40
const STREAM_GAP = 150
const INNER_MIN = 900

/** What the layout needs from the structure (no per-user data). */
export interface RadialInput {
  id: string
  /** its stream, and the stream's place around the circle */
  stream: string
  streamOrder: number
  order: number
  nodes: { id: string; z: number; req: string[]; cx?: string[] }[]
}

export interface RadialStream {
  id: string
  a0: number
  a1: number
}

export interface RadialSector {
  id: string
  /** angles (radians, clockwise from +x), the sector's own span */
  a0: number
  a1: number
  cols: number
  /** outermost radius any of its skills reach */
  rMax: number
}

export interface RadialRing {
  level: number
  r0: number
  r1: number
}

export interface RadialLayout {
  version: string
  /** "subject:id" in structure order, and each one's centre */
  keys: string[]
  xy: Float32Array
  sectors: RadialSector[]
  streams: RadialStream[]
  rings: RadialRing[]
  /** radius where the first ring starts (subject names live inside it) */
  inner: number
  extent: number
}

export function computeRadial(subjects: RadialInput[], version = ''): RadialLayout {
  // Streams together, in their order around the circle (related streams
  // adjacent); inside a stream, subjects that feed each other sit together.
  const streamOrder = [...new Set(subjects.map((s) => s.stream))].sort((a, b) => {
    const oa = Math.min(...subjects.filter((s) => s.stream === a).map((s) => s.streamOrder))
    const ob = Math.min(...subjects.filter((s) => s.stream === b).map((s) => s.streamOrder))
    return oa - ob || a.localeCompare(b)
  })
  const ordered = [...subjects].sort(
    (a, b) => streamOrder.indexOf(a.stream) - streamOrder.indexOf(b.stream) || a.order - b.order || a.id.localeCompare(b.id),
  )

  // Columns per subject and rows per zone.
  const info = ordered.map((s) => {
    const byZone = new Map<number, number[]>()
    s.nodes.forEach((n, i) => byZone.set(n.z, [...(byZone.get(n.z) ?? []), i]))
    const most = Math.max(1, ...[...byZone.values()].map((l) => l.length))
    const cols = Math.max(2, Math.min(4, Math.ceil(most / 2)))
    return { s, byZone, cols }
  })
  const levels = [...new Set(subjects.flatMap((s) => s.nodes.map((n) => n.z)))].sort((a, b) => a - b)
  const rowsAt = (level: number) => Math.max(1, ...info.map((x) => Math.ceil((x.byZone.get(level)?.length ?? 0) / x.cols)))

  // Angular spans: proportional to each subject's width, gaps between streams.
  let total = 0
  let prev: string | null = null
  const demand = info.map((x) => {
    const gap = prev !== null && x.s.stream !== prev ? STREAM_GAP : 0
    prev = x.s.stream
    const d = x.cols * SLOT + SUBJECT_GAP
    total += d + gap
    return { d, gap }
  })
  total += STREAM_GAP // between the last stream and the first
  const inner = Math.max(INNER_MIN, total / (Math.PI * 2))
  const scale = (Math.PI * 2) / Math.max(1, total)

  // Rings, outward.
  const rings: RadialRing[] = []
  let r = inner
  for (const level of levels) {
    const thick = rowsAt(level) * ROW + RING_PAD
    rings.push({ level, r0: r, r1: r + thick })
    r += thick
  }
  const ringOf = new Map(rings.map((g) => [g.level, g]))

  // Place.
  const pos = new Map<string, [number, number]>()
  const angleOf = new Map<string, number>()
  const sectors: RadialSector[] = []
  const streams: RadialStream[] = []
  let a = -Math.PI / 2 + (STREAM_GAP / 2) * scale
  info.forEach((x, si) => {
    a += demand[si].gap * scale
    const span = demand[si].d * scale
    const a0 = a
    const a1 = a + span
    a = a1
    const pad = (SUBJECT_GAP / 2) * scale
    const lo = a0 + pad
    const hi = a1 - pad
    let rMax = 0
    for (const level of [...x.byZone.keys()].sort((p, q) => p - q)) {
      const g = ringOf.get(level)!
      const idx = x.byZone.get(level)!
      // Order by where the prerequisites are (barycentre), else file order.
      const key = (i: number) => {
        const n = x.s.nodes[i]
        const at = n.req.map((q) => angleOf.get(`${x.s.id}:${q}`)).filter((v): v is number => v !== undefined)
        return at.length ? at.reduce((p, q) => p + q, 0) / at.length : lo + ((hi - lo) * (idx.indexOf(i) + 0.5)) / idx.length
      }
      const sorted = [...idx].sort((p, q) => key(p) - key(q) || p - q)
      for (let row = 0; row * x.cols < sorted.length; row++) {
        const inRow = sorted.slice(row * x.cols, row * x.cols + x.cols).sort((p, q) => key(p) - key(q) || p - q)
        const rr = g.r0 + RING_PAD / 2 + ROW * row + R + 6
        const offset = (x.cols - inRow.length) / 2
        inRow.forEach((i, c) => {
          const ang = lo + ((hi - lo) * (c + offset + 0.5)) / x.cols
          const k = `${x.s.id}:${x.s.nodes[i].id}`
          pos.set(k, [Math.cos(ang) * rr, Math.sin(ang) * rr])
          angleOf.set(k, ang)
          rMax = Math.max(rMax, rr)
        })
      }
    }
    sectors.push({ id: x.s.id, a0, a1, cols: x.cols, rMax })
    const last = streams.at(-1)
    if (last && last.id === x.s.stream) last.a1 = a1
    else streams.push({ id: x.s.stream, a0, a1 })
  })

  const keys: string[] = []
  for (const s of subjects) for (const n of s.nodes) keys.push(`${s.id}:${n.id}`)
  const xy = new Float32Array(keys.length * 2)
  keys.forEach((k, i) => {
    const p = pos.get(k) ?? [0, 0]
    xy[2 * i] = p[0]
    xy[2 * i + 1] = p[1]
  })
  return { version, keys, xy, sectors, streams, rings, inner, extent: r }
}

/** Polar position of a point: angle in [a0, a0 + 2π) for sector tests. */
export function sectorAt(layout: Pick<RadialLayout, 'sectors'>, x: number, y: number): RadialSector | null {
  const ang = Math.atan2(y, x)
  for (const s of layout.sectors) {
    let t = ang
    while (t < s.a0) t += Math.PI * 2
    while (t >= s.a0 + Math.PI * 2) t -= Math.PI * 2
    if (t <= s.a1) return s
  }
  return null
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

/**
 * The focus chain, as in SkillGraph: the whole lineage of a skill — every
 * prerequisite and everything it leads to (same subject and across).
 */
export function lineage(prereqs: Map<string, string[]>, key: string): Set<string> {
  const children = new Map<string, string[]>()
  for (const [k, rs] of prereqs) for (const r of rs) children.set(r, [...(children.get(r) ?? []), k])
  const set = new Set<string>([key])
  const walk = (next: (id: string) => string[]) => {
    const stack = [key]
    while (stack.length) {
      for (const id of next(stack.pop()!)) {
        if (set.has(id)) continue
        set.add(id)
        stack.push(id)
      }
    }
  }
  walk((id) => prereqs.get(id) ?? [])
  walk((id) => children.get(id) ?? [])
  return set
}
