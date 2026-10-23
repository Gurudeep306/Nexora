/*
  Hasse Lab logic (Discrete Mathematics, Chapter 4). A TypeScript twin of
  content/gate-notes/_checks/dm/orderlib.py, tested against lab_vectors_ch4.json.
  A poset is a list of element labels plus a reflexive "≤" matrix.
*/

export type Poset = { labels: string[]; le: boolean[][] }

export function make(labels: string[], leq: (i: number, j: number) => boolean): Poset {
  return { labels, le: labels.map((_, i) => labels.map((_, j) => i === j || leq(i, j))) }
}

export const lt = (P: Poset, a: number, b: number) => a !== b && P.le[a]![b]!
const idx = (P: Poset) => [...P.labels.keys()]

export function isPartialOrder(P: Poset): boolean {
  const I = idx(P)
  return (
    I.every((a) => P.le[a]![a]) &&
    I.every((a) => I.every((b) => a === b || !(P.le[a]![b] && P.le[b]![a]))) &&
    I.every((a) => I.every((b) => I.every((c) => !(P.le[a]![b] && P.le[b]![c]) || P.le[a]![c])))
  )
}

export function covers(P: Poset): [number, number][] {
  const I = idx(P)
  const out: [number, number][] = []
  for (const a of I) for (const b of I) if (lt(P, a, b) && !I.some((c) => lt(P, a, c) && lt(P, c, b))) out.push([a, b])
  return out
}

/** Rank = length of the longest chain ending at the element (bottom row 0). */
export function levels(P: Poset): number[] {
  const I = idx(P)
  const rank: number[] = I.map(() => -1)
  const order = [...I].sort((x, y) => I.filter((z) => lt(P, z, x)).length - I.filter((z) => lt(P, z, y)).length)
  for (const e of order) rank[e] = Math.max(0, ...I.filter((d) => lt(P, d, e) && rank[d]! >= 0).map((d) => rank[d]! + 1))
  return rank
}

export const minimal = (P: Poset) => idx(P).filter((a) => !idx(P).some((b) => lt(P, b, a)))
export const maximal = (P: Poset) => idx(P).filter((a) => !idx(P).some((b) => lt(P, a, b)))
export const least = (P: Poset) => idx(P).find((a) => idx(P).every((b) => P.le[a]![b])) ?? null
export const greatest = (P: Poset) => idx(P).find((a) => idx(P).every((b) => P.le[b]![a])) ?? null
export const upperBounds = (P: Poset, S: number[]) => idx(P).filter((u) => S.every((s) => P.le[s]![u]))
export const lowerBounds = (P: Poset, S: number[]) => idx(P).filter((l) => S.every((s) => P.le[l]![s]))

export function lub(P: Poset, a: number, b: number): number | null {
  const ub = upperBounds(P, [a, b])
  return ub.find((u) => ub.every((v) => P.le[u]![v])) ?? null
}
export function glb(P: Poset, a: number, b: number): number | null {
  const lb = lowerBounds(P, [a, b])
  return lb.find((l) => lb.every((v) => P.le[v]![l])) ?? null
}

export function latticeFailure(P: Poset): ['join' | 'meet', number, number] | null {
  const n = P.labels.length
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      if (lub(P, a, b) === null) return ['join', a, b]
      if (glb(P, a, b) === null) return ['meet', a, b]
    }
  return null
}
export const isLattice = (P: Poset) => latticeFailure(P) === null

export function distributiveFailure(P: Poset): [number, number, number] | null {
  const I = idx(P)
  for (const a of I)
    for (const b of I)
      for (const c of I) {
        const left = glb(P, a, lub(P, b, c)!)
        const right = lub(P, glb(P, a, b)!, glb(P, a, c)!)
        if (left !== right) return [a, b, c]
      }
  return null
}

export function complements(P: Poset, a: number): number[] {
  const z = least(P)
  const o = greatest(P)
  if (z === null || o === null) return []
  return idx(P).filter((b) => lub(P, a, b) === o && glb(P, a, b) === z)
}

export function analyse(P: Poset) {
  const lat = isLattice(P)
  const dist = lat ? distributiveFailure(P) === null : false
  const comp = lat ? least(P) !== null && greatest(P) !== null && idx(P).every((a) => complements(P, a).length > 0) : false
  return { lattice: lat, distributive: dist, complemented: comp, boolean: lat && dist && comp }
}

export function linearExtensions(P: Poset): number {
  const n = P.labels.length
  const below = idx(P).map((e) => idx(P).reduce((m, d) => (lt(P, d, e) ? m | (1 << d) : m), 0))
  const memo = new Map<number, number>()
  const f = (mask: number): number => {
    if (mask === (1 << n) - 1) return 1
    const hit = memo.get(mask)
    if (hit !== undefined) return hit
    let s = 0
    for (let i = 0; i < n; i++) if (!((mask >> i) & 1) && (below[i]! & mask) === below[i]) s += f(mask | (1 << i))
    memo.set(mask, s)
    return s
  }
  return f(0)
}

/** Elements in a longest chain, and in a largest antichain (brute force; n ≤ 16). */
export function heightWidth(P: Poset): { height: number; width: number } {
  const n = P.labels.length
  let h = 0
  let w = 0
  for (let mask = 1; mask < 1 << n; mask++) {
    const S = idx(P).filter((i) => (mask >> i) & 1)
    let chain = true
    let anti = true
    for (let x = 0; x < S.length && (chain || anti); x++)
      for (let y = x + 1; y < S.length; y++) {
        const comp = P.le[S[x]!]![S[y]!] || P.le[S[y]!]![S[x]!]
        if (comp) anti = false
        else chain = false
      }
    if (chain) h = Math.max(h, S.length)
    if (anti) w = Math.max(w, S.length)
  }
  return { height: h, width: w }
}

export function divisorPoset(n: number): Poset {
  const d = [...Array(n).keys()].map((i) => i + 1).filter((k) => n % k === 0)
  return make(
    d.map(String),
    (i, j) => d[j]! % d[i]! === 0,
  )
}

export function subsetPoset(k: number): Poset {
  const sets: number[][] = []
  for (let m = 0; m < 1 << k; m++) sets.push([...Array(k).keys()].filter((i) => (m >> i) & 1).map((i) => i + 1))
  sets.sort((a, b) => a.length - b.length || a.join().localeCompare(b.join()))
  return make(
    sets.map((s) => (s.length ? `{${s.join(',')}}` : '∅')),
    (i, j) => sets[i]!.every((x) => sets[j]!.includes(x)),
  )
}

/** Parse "a<b, b<c, a<d" (strict covering or order pairs) into a poset closed under transitivity. */
export function parsePairs(src: string): Poset {
  const labels: string[] = []
  const id = (s: string) => {
    const t = s.trim()
    if (!t) throw new Error('Empty element name')
    let i = labels.indexOf(t)
    if (i < 0) {
      labels.push(t)
      i = labels.length - 1
    }
    return i
  }
  const pairs: [number, number][] = []
  for (const part of src.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)) {
    const m = /^(.+?)\s*(<=|≤|<)\s*(.+)$/.exec(part)
    if (m) pairs.push([id(m[1]!), id(m[3]!)])
    else id(part)
  }
  if (labels.length > 12) throw new Error('At most 12 elements')
  const n = labels.length
  const le = labels.map((_, i) => labels.map((_, j) => i === j))
  for (const [a, b] of pairs) le[a]![b] = true
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) if (le[i]![k]) for (let j = 0; j < n; j++) if (le[k]![j]) le[i]![j] = true
  const P = { labels, le }
  if (!isPartialOrder(P)) throw new Error('These pairs form a cycle, so they are not a partial order')
  return P
}

export const PRESETS: { id: string; label: string; src: string }[] = [
  { id: 'd30', label: 'Divisors of 30 (Boolean)', src: 'div:30' },
  { id: 'd12', label: 'Divisors of 12 (distributive, not complemented)', src: 'div:12' },
  { id: 'd24', label: 'Divisors of 24 (GATE 1992)', src: 'div:24' },
  { id: 'p3', label: 'Subsets of {1, 2, 3}', src: 'sub:3' },
  { id: 'n5', label: 'Pentagon N5 (not distributive)', src: '0<a, a<b, b<1, 0<c, c<1' },
  { id: 'm3', label: 'Diamond M3 (not distributive)', src: '0<a, 0<b, 0<c, a<1, b<1, c<1' },
  { id: 'notlat', label: 'Two maximal elements (not a lattice)', src: 'a<c, a<d, b<c, b<d' },
  { id: 'gate1996', label: 'GATE 1996: {2, 3, 6, 12, 24} under divides', src: '2<6, 3<6, 6<12, 12<24' },
]

export function fromPreset(src: string): Poset {
  if (src.startsWith('div:')) return divisorPoset(Number(src.slice(4)))
  if (src.startsWith('sub:')) return subsetPoset(Number(src.slice(4)))
  return parsePairs(src)
}
