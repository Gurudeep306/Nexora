/*
  Layouts and counts for Stage kits, without React (shared with Node tests).
*/
import type { StageElement } from './spec.ts'

type G = Extract<StageElement, { type: 'graph' }>

/** Node positions [x, y] for the graph's layout. Exported for tests. */
export function layoutGraph(el: Pick<G, 'nodes' | 'edges' | 'layout' | 'spread'>): Map<string, [number, number, number]> {
  const s = el.spread ?? 1.2
  const out = new Map<string, [number, number, number]>()
  const ids = el.nodes.map((n) => n.id)
  const kids = new Map<string, string[]>(ids.map((i) => [i, []]))
  const indeg = new Map<string, number>(ids.map((i) => [i, 0]))
  for (const e of el.edges) {
    kids.get(e.from)?.push(e.to)
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1)
  }
  const layout = el.layout ?? 'given'
  if (layout === 'given') {
    for (const n of el.nodes) out.set(n.id, [n.at?.[0] ?? 0, n.at?.[1] ?? 0, n.at?.[2] ?? 0])
    return out
  }
  if (layout === 'ring') {
    const R = Math.max(1.2, (s * ids.length) / (2 * Math.PI))
    ids.forEach((id, i) => out.set(id, [R * Math.sin((2 * Math.PI * i) / ids.length), R * Math.cos((2 * Math.PI * i) / ids.length), 0]))
    return out
  }
  if (layout === 'tree') {
    const roots = ids.filter((i) => !indeg.get(i))
    let leaf = 0
    const seen = new Set<string>()
    const place = (id: string, depth: number): number => {
      seen.add(id)
      const ch = (kids.get(id) ?? []).filter((k) => !seen.has(k))
      const x = ch.length ? ch.map((k) => place(k, depth + 1)).reduce((a, b) => a + b, 0) / ch.length : leaf++ * s
      out.set(id, [x, -depth * s, 0])
      return x
    }
    for (const r of roots.length ? roots : [ids[0]]) place(r, 0)
    for (const id of ids) if (!out.has(id)) out.set(id, [leaf++ * s, 0, 0])
    const xs = [...out.values()].map((p) => p[0])
    const mid = (Math.min(...xs) + Math.max(...xs)) / 2
    const depth = Math.min(...[...out.values()].map((p) => p[1]))
    for (const [k, p] of out) out.set(k, [p[0] - mid, p[1] - depth / 2, 0])
    return out
  }
  // layered: each node one layer after its furthest parent.
  const layer = new Map<string, number>()
  const order = [...ids]
  for (let pass = 0; pass < ids.length; pass++) {
    let moved = false
    for (const e of el.edges) {
      const l = (layer.get(e.from) ?? 0) + 1
      if (l > (layer.get(e.to) ?? 0) && l < ids.length) {
        layer.set(e.to, l)
        moved = true
      }
    }
    if (!moved) break
  }
  const L = Math.max(0, ...ids.map((i) => layer.get(i) ?? 0))
  for (let l = 0; l <= L; l++) {
    const here = order.filter((i) => (layer.get(i) ?? 0) === l)
    here.forEach((id, k) => out.set(id, [(l - L / 2) * s * 1.4, ((here.length - 1) / 2 - k) * s, 0]))
  }
  return out
}


/** Counts of samples in equal bins over [lo, hi]. */
export function histogram(samples: number[], bins: number, lo: number, hi: number): number[] {
  const out = new Array(bins).fill(0)
  for (const v of samples) {
    if (v < lo || v > hi) continue
    out[Math.min(bins - 1, Math.floor(((v - lo) / (hi - lo)) * bins))]++
  }
  return out
}

