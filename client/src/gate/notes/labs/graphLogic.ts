/*
  Graph Playground logic (Discrete Mathematics, Chapter 8). A TypeScript twin
  of content/gate-notes/_checks/dm/graphlib.py, tested against
  lab_vectors_ch8.json. Vertices 0..n−1, simple undirected edges [u, v], u < v.
*/

export type Graph = { n: number; edges: [number, number][]; pos?: [number, number][]; labels?: string[] }

const key = (u: number, v: number) => (u < v ? `${u}-${v}` : `${v}-${u}`)
export const norm = (G: Graph): Graph => {
  const seen = new Set<string>()
  const edges: [number, number][] = []
  for (const [a, b] of G.edges) {
    if (a === b || a >= G.n || b >= G.n) continue
    const k = key(a, b)
    if (!seen.has(k)) {
      seen.add(k)
      edges.push(a < b ? [a, b] : [b, a])
    }
  }
  edges.sort((x, y) => x[0] - y[0] || x[1] - y[1])
  return { ...G, edges }
}

export function adjacency(G: Graph): number[][] {
  const A = Array.from({ length: G.n }, () => [] as number[])
  for (const [a, b] of G.edges) {
    A[a]!.push(b)
    A[b]!.push(a)
  }
  A.forEach((l) => l.sort((x, y) => x - y))
  return A
}

export const degrees = (G: Graph) => adjacency(G).map((l) => l.length)
export const degreeSequence = (G: Graph) => [...degrees(G)].sort((a, b) => b - a)

export function components(G: Graph): number[][] {
  const A = adjacency(G)
  const seen = new Set<number>()
  const out: number[][] = []
  for (let s = 0; s < G.n; s++) {
    if (seen.has(s)) continue
    const comp: number[] = []
    const q = [s]
    seen.add(s)
    while (q.length) {
      const v = q.shift()!
      comp.push(v)
      for (const u of A[v]!)
        if (!seen.has(u)) {
          seen.add(u)
          q.push(u)
        }
    }
    out.push(comp.sort((a, b) => a - b))
  }
  return out
}

export const connected = (G: Graph) => G.n <= 1 || components(G).length === 1

function without(G: Graph, v: number): Graph {
  const keep = [...Array(G.n).keys()].filter((u) => u !== v)
  const idx = new Map(keep.map((u, i) => [u, i]))
  return { n: G.n - 1, edges: G.edges.filter(([a, b]) => a !== v && b !== v).map(([a, b]) => [idx.get(a)!, idx.get(b)!]) }
}

export function cutVertices(G: Graph): number[] {
  const k = components(G).length
  const d = degrees(G)
  return [...Array(G.n).keys()].filter((v) => components(without(G, v)).length > k - (d[v] === 0 ? 1 : 0))
}

export function bridges(G: Graph): [number, number][] {
  const k = components(G).length
  return G.edges.filter(([a, b]) => components({ n: G.n, edges: G.edges.filter(([x, y]) => !(x === a && y === b)) }).length > k)
}

/** [true, 2-colouring] or [false, an odd cycle]. */
export function bipartition(G: Graph): [true, number[]] | [false, number[]] {
  const A = adjacency(G)
  const col = new Map<number, number>()
  const parent = new Map<number, number | null>()
  for (let s = 0; s < G.n; s++) {
    if (col.has(s)) continue
    col.set(s, 0)
    parent.set(s, null)
    const q = [s]
    while (q.length) {
      const v = q.shift()!
      for (const u of A[v]!) {
        if (!col.has(u)) {
          col.set(u, 1 - col.get(v)!)
          parent.set(u, v)
          q.push(u)
        } else if (col.get(u) === col.get(v)) {
          const path = (x: number) => {
            const p = [x]
            while (parent.get(p.at(-1)!) !== null) p.push(parent.get(p.at(-1)!)!)
            return p
          }
          const a = path(v)
          const b = path(u)
          const common = a.find((x) => b.includes(x))!
          return [false, [...a.slice(0, a.indexOf(common) + 1), ...b.slice(0, b.indexOf(common)).reverse()]]
        }
      }
    }
  }
  return [true, [...Array(G.n).keys()].map((v) => col.get(v)!)]
}

export function greedyColouring(G: Graph, order?: number[]): number[] {
  const A = adjacency(G)
  const col = new Map<number, number>()
  for (const v of order ?? [...Array(G.n).keys()]) {
    const used = new Set(A[v]!.filter((u) => col.has(u)).map((u) => col.get(u)!))
    let c = 0
    while (used.has(c)) c++
    col.set(v, c)
  }
  return [...Array(G.n).keys()].map((v) => col.get(v)!)
}

export function colouring(G: Graph, k: number): number[] | null {
  const A = adjacency(G)
  const order = [...Array(G.n).keys()].sort((a, b) => A[b]!.length - A[a]!.length || a - b)
  const col = new Map<number, number>()
  const bt = (i: number): boolean => {
    if (i === order.length) return true
    const v = order[i]!
    for (let c = 0; c < k; c++) {
      if (A[v]!.every((u) => col.get(u) !== c)) {
        col.set(v, c)
        if (bt(i + 1)) return true
        col.delete(v)
      }
    }
    return false
  }
  return bt(0) ? [...Array(G.n).keys()].map((v) => col.get(v)!) : null
}

export function chromaticNumber(G: Graph): number {
  if (G.n === 0) return 0
  for (let k = 1; k <= G.n; k++) if (colouring(G, k)) return k
  return G.n
}

export type EulerKind = 'circuit' | 'trail' | null

export function eulerKind(G: Graph): EulerKind {
  const d = degrees(G)
  if (!G.edges.length) return 'circuit'
  const comps = components(G).filter((c) => c.some((v) => d[v]! > 0))
  if (comps.length > 1) return null
  const odd = d.filter((x) => x % 2).length
  return odd === 0 ? 'circuit' : odd === 2 ? 'trail' : null
}

/** Hierholzer's algorithm, same choices as graphlib.euler_tour (smallest neighbour first). */
export function eulerTour(G: Graph): number[] | null {
  if (eulerKind(G) === null || !G.edges.length) return null
  const A = adjacency(G)
  const d = degrees(G)
  const odd = [...Array(G.n).keys()].filter((v) => d[v]! % 2)
  const start = odd.length ? odd[0]! : [...Array(G.n).keys()].find((v) => d[v]! > 0)!
  const left = A.map((l) => [...l])
  const stack = [start]
  const tour: number[] = []
  while (stack.length) {
    const v = stack.at(-1)!
    if (left[v]!.length) {
      const u = left[v]!.shift()!
      left[u]!.splice(left[u]!.indexOf(v), 1)
      stack.push(u)
    } else tour.push(stack.pop()!)
  }
  return tour.reverse()
}

export function hamiltonianCycle(G: Graph, budget = 2_000_000): number[] | null {
  if (G.n < 3) return null
  const A = adjacency(G)
  const path = [0]
  const used = new Set([0])
  let steps = 0
  const bt = (): boolean => {
    if (++steps > budget) return false
    if (path.length === G.n) return A[path.at(-1)!]!.includes(0)
    for (const u of A[path.at(-1)!]!) {
      if (!used.has(u)) {
        path.push(u)
        used.add(u)
        if (bt()) return true
        path.pop()
        used.delete(u)
      }
    }
    return false
  }
  return bt() ? [...path] : null
}

/** Number of spanning trees: Bareiss fraction-free determinant of a Laplacian cofactor (exact, BigInt). */
export function spanningTrees(G: Graph): number {
  if (G.n <= 1) return 1
  const d = degrees(G)
  const L: bigint[][] = [...Array(G.n - 1).keys()].map((i) => [...Array(G.n - 1).keys()].map((j) => BigInt(i === j ? d[i + 1]! : 0)))
  for (const [a, b] of G.edges) if (a > 0 && b > 0) {
    L[a - 1]![b - 1] = -1n
    L[b - 1]![a - 1] = -1n
  }
  const n = G.n - 1
  let sign = 1n
  let prev = 1n
  for (let k = 0; k < n - 1; k++) {
    if (L[k]![k] === 0n) {
      const p = L.findIndex((row, r) => r > k && row[k] !== 0n)
      if (p < 0) return 0
      ;[L[k], L[p]] = [L[p]!, L[k]!]
      sign = -sign
    }
    for (let i = k + 1; i < n; i++) for (let j = k + 1; j < n; j++) L[i]![j] = (L[i]![j]! * L[k]![k]! - L[i]![k]! * L[k]![j]!) / prev
    prev = L[k]![k]!
  }
  return Number(sign * L[n - 1]![n - 1]!)
}

export function matchingNumber(G: Graph): number {
  let best = 0
  const rec = (i: number, used: Set<number>, size: number) => {
    if (size + (G.edges.length - i) <= best) return
    if (i === G.edges.length) {
      best = Math.max(best, size)
      return
    }
    const [a, b] = G.edges[i]!
    if (!used.has(a) && !used.has(b)) rec(i + 1, new Set([...used, a, b]), size + 1)
    rec(i + 1, used, size)
  }
  rec(0, new Set(), 0)
  return best
}

export function independenceNumber(G: Graph): number {
  const A = adjacency(G)
  let best = 0
  const rec = (v: number, chosen: number[]) => {
    if (chosen.length + (G.n - v) <= best) return
    if (v === G.n) {
      best = Math.max(best, chosen.length)
      return
    }
    if (chosen.every((u) => !A[v]!.includes(u))) rec(v + 1, [...chosen, v])
    rec(v + 1, chosen)
  }
  rec(0, [])
  return best
}

/* ── Standard graphs (same numbering as graphlib) ─────────────────────── */

const ring = (n: number, r = 0.4, cx = 0.5, cy = 0.5, rot = -Math.PI / 2): [number, number][] =>
  [...Array(n).keys()].map((i) => [cx + r * Math.cos(rot + (2 * Math.PI * i) / n), cy + r * Math.sin(rot + (2 * Math.PI * i) / n)])

export const K = (n: number): Graph => ({ n, edges: [...Array(n).keys()].flatMap((i) => [...Array(n).keys()].filter((j) => j > i).map((j) => [i, j] as [number, number])), pos: ring(n) })
export const Cn = (n: number): Graph => norm({ n, edges: [...Array(n).keys()].map((i) => [i, (i + 1) % n] as [number, number]), pos: ring(n) })
export const Pn = (n: number): Graph => ({ n, edges: [...Array(n - 1).keys()].map((i) => [i, i + 1] as [number, number]), pos: [...Array(n).keys()].map((i) => [0.08 + (0.84 * i) / Math.max(1, n - 1), 0.5]) })
export const W = (n: number): Graph => norm({ n: n + 1, edges: [...[...Array(n).keys()].map((i) => [i, (i + 1) % n] as [number, number]), ...[...Array(n).keys()].map((i) => [i, n] as [number, number])], pos: [...ring(n), [0.5, 0.5]] })
export const Kmn = (m: number, n: number): Graph => ({
  n: m + n,
  edges: [...Array(m).keys()].flatMap((i) => [...Array(n).keys()].map((j) => [i, m + j] as [number, number])),
  pos: [...[...Array(m).keys()].map((i) => [0.1 + (0.8 * (i + 0.5)) / m, 0.2] as [number, number]), ...[...Array(n).keys()].map((j) => [0.1 + (0.8 * (j + 0.5)) / n, 0.8] as [number, number])],
})
export function Q(d: number): Graph {
  const n = 2 ** d
  const edges: [number, number][] = []
  for (let u = 0; u < n; u++) for (let b = 0; b < d; b++) if (u < (u ^ (1 << b))) edges.push([u, u ^ (1 << b)])
  return norm({ n, edges, pos: ring(n), labels: [...Array(n).keys()].map((u) => u.toString(2).padStart(d, '0')) })
}
export function petersen(): Graph {
  const e: [number, number][] = [...[...Array(5).keys()].map((i) => [i, (i + 1) % 5] as [number, number]), ...[...Array(5).keys()].map((i) => [i, i + 5] as [number, number]), ...[...Array(5).keys()].map((i) => [5 + i, 5 + ((i + 2) % 5)] as [number, number])]
  return norm({ n: 10, edges: e, pos: [...ring(5, 0.42), ...ring(5, 0.2)] })
}
export function grid(r: number, c: number): Graph {
  const id = (i: number, j: number) => i * c + j
  const edges: [number, number][] = []
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
    if (j + 1 < c) edges.push([id(i, j), id(i, j + 1)])
    if (i + 1 < r) edges.push([id(i, j), id(i + 1, j)])
  }
  return norm({ n: r * c, edges, pos: [...Array(r * c).keys()].map((v) => [0.15 + (0.7 * (v % c)) / Math.max(1, c - 1), 0.15 + (0.7 * Math.floor(v / c)) / Math.max(1, r - 1)]) })
}

export const PRESETS: { id: string; label: string; make: () => Graph }[] = [
  { id: 'petersen', label: 'Petersen graph', make: petersen },
  { id: 'k4', label: 'K₄', make: () => K(4) },
  { id: 'k5', label: 'K₅', make: () => K(5) },
  { id: 'k33', label: 'K₃,₃', make: () => Kmn(3, 3) },
  { id: 'k34', label: 'K₃,₄', make: () => Kmn(3, 4) },
  { id: 'c5', label: 'C₅', make: () => Cn(5) },
  { id: 'c6', label: 'C₆', make: () => Cn(6) },
  { id: 'w5', label: 'Wheel W₅ (5 rim + hub)', make: () => W(5) },
  { id: 'q3', label: 'Cube Q₃', make: () => Q(3) },
  { id: 'grid', label: '3 × 3 grid', make: () => grid(3, 3) },
  { id: 'p8', label: 'Path P₈', make: () => Pn(8) },
  { id: 'bridge', label: 'Two triangles joined by a bridge', make: () => norm({ n: 6, edges: [[0, 1], [1, 2], [0, 2], [2, 3], [3, 4], [4, 5], [3, 5]], pos: [[0.1, 0.25], [0.1, 0.75], [0.35, 0.5], [0.65, 0.5], [0.9, 0.25], [0.9, 0.75]] }) },
]
