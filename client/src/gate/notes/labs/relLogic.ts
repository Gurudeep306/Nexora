/*
  Relation Lab logic (Discrete Mathematics, Chapter 3). A TypeScript twin of
  content/gate-notes/_checks/dm/rellib.py, tested against lab_vectors_ch3.json.
  A relation on {0, …, n−1} is an n × n boolean matrix M (M[i][j] ⇔ i R j).
*/

export type Matrix = boolean[][]
export type Prop = 'reflexive' | 'irreflexive' | 'symmetric' | 'antisymmetric' | 'asymmetric' | 'transitive'
export const PROPS: Prop[] = ['reflexive', 'irreflexive', 'symmetric', 'antisymmetric', 'asymmetric', 'transitive']

export const empty = (n: number): Matrix => Array.from({ length: n }, () => Array.from({ length: n }, () => false))
export const copy = (m: Matrix): Matrix => m.map((r) => [...r])

export function fromPairs(n: number, pairs: [number, number][]): Matrix {
  const m = empty(n)
  for (const [a, b] of pairs) m[a]![b] = true
  return m
}

export function toPairs(m: Matrix): [number, number][] {
  const out: [number, number][] = []
  m.forEach((r, i) => r.forEach((v, j) => v && out.push([i, j])))
  return out
}

/** For each property: null when it holds, else a witness ([a, a], [a, b] or [a, b, c]). */
export function violations(m: Matrix): Record<Prop, number[] | null> {
  const n = m.length
  const P = toPairs(m)
  const find = <T,>(xs: T[], f: (x: T) => boolean) => xs.find(f) ?? null
  const range = [...Array(n).keys()]
  const r = find(range, (a) => !m[a]![a])
  const ir = find(range, (a) => m[a]![a]!)
  const sym = find(P, ([a, b]) => !m[b]![a])
  const anti = find(P, ([a, b]) => a !== b && m[b]![a]!)
  const asym = find(P, ([a, b]) => m[b]![a]!)
  let trans: number[] | null = null
  outer: for (const [a, b] of P)
    for (const [c, d] of P)
      if (b === c && !m[a]![d]) {
        trans = [a, b, d]
        break outer
      }
  return {
    reflexive: r === null ? null : [r, r],
    irreflexive: ir === null ? null : [ir, ir],
    symmetric: sym,
    antisymmetric: anti,
    asymmetric: asym,
    transitive: trans,
  }
}

export function props(m: Matrix): Record<Prop, boolean> {
  const v = violations(m)
  return Object.fromEntries(PROPS.map((p) => [p, v[p] === null])) as Record<Prop, boolean>
}

export const isEquivalence = (m: Matrix) => {
  const p = props(m)
  return p.reflexive && p.symmetric && p.transitive
}
export const isPartialOrder = (m: Matrix) => {
  const p = props(m)
  return p.reflexive && p.antisymmetric && p.transitive
}

/** R ∘ S = {(a, c) : a R b and b S c} (first R, then S). */
export function compose(r: Matrix, s: Matrix): Matrix {
  const n = r.length
  return r.map((row) => Array.from({ length: n }, (_, j) => row.some((v, k) => v && s[k]![j]!)))
}

export const inverse = (m: Matrix): Matrix => m.map((r, i) => r.map((_, j) => m[j]![i]!))
export const reflexiveClosure = (m: Matrix): Matrix => m.map((r, i) => r.map((v, j) => v || i === j))
export const symmetricClosure = (m: Matrix): Matrix => m.map((r, i) => r.map((v, j) => v || m[j]![i]!))

/** Warshall: the matrix after k = 0 (input), 1, …, n intermediate vertices allowed. */
export function warshall(m: Matrix): Matrix[] {
  const n = m.length
  const M = copy(m)
  const stages = [copy(M)]
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) if (M[i]![k]) for (let j = 0; j < n; j++) if (M[k]![j]) M[i]![j] = true
    stages.push(copy(M))
  }
  return stages
}

export const transitiveClosure = (m: Matrix): Matrix => warshall(m).at(-1)!
export const equivalenceClosure = (m: Matrix): Matrix => transitiveClosure(symmetricClosure(reflexiveClosure(m)))

/** Classes [a]: elements related to the first unseen element (meaningful for an equivalence). */
export function classes(m: Matrix): number[][] {
  const n = m.length
  const seen = new Set<number>()
  const out: number[][] = []
  for (let a = 0; a < n; a++) {
    if (seen.has(a)) continue
    const c = [...Array(n).keys()].filter((b) => m[a]![b])
    c.forEach((b) => seen.add(b))
    out.push(c)
  }
  return out
}

export function stirling2(n: number, k: number): number {
  if (n === k) return 1
  if (k === 0 || k > n) return 0
  return k * stirling2(n - 1, k) + stirling2(n - 1, k - 1)
}
export const bell = (n: number) => Array.from({ length: n + 1 }, (_, k) => stirling2(n, k)).reduce((a, b) => a + b, 0)

/** Closed-form counts of relation families on an n-set (proved in the relations lesson). */
export function counts(n: number): Record<string, number> {
  const m = (n * (n - 1)) / 2
  return {
    all: 2 ** (n * n),
    reflexive: 2 ** (n * n - n),
    irreflexive: 2 ** (n * n - n),
    symmetric: 2 ** ((n * (n + 1)) / 2),
    antisymmetric: 2 ** n * 3 ** m,
    asymmetric: 3 ** m,
    'reflexive+symmetric': 2 ** m,
    'reflexive+antisymmetric': 3 ** m,
    'symmetric+antisymmetric': 2 ** n,
    'neither reflexive nor irreflexive': 2 ** (n * n) - 2 * 2 ** (n * n - n),
    equivalence: bell(n),
  }
}

export const PRESETS: { id: string; label: string; n: number; pairs: [number, number][] }[] = [
  { id: 'chain', label: 'Chain 0→1→2→3 (transitive closure)', n: 4, pairs: [[0, 1], [1, 2], [2, 3]] },
  { id: 'gate1998', label: 'GATE 1998 relation on {1,2,3,4}', n: 4, pairs: [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 0], [2, 1], [2, 2], [2, 3]] },
  { id: 'gate2009', label: 'GATE 2009: {(x,y),(x,z),(z,x),(z,y)}', n: 3, pairs: [[0, 1], [0, 2], [2, 0], [2, 1]] },
  { id: 'mod3', label: 'Congruence mod 3 on {0,…,5}', n: 6, pairs: [...Array(6).keys()].flatMap((a) => [...Array(6).keys()].filter((b) => (a - b) % 3 === 0).map((b) => [a, b] as [number, number])) },
  { id: 'divides', label: 'Divides on {1,…,6}', n: 6, pairs: [...Array(6).keys()].flatMap((a) => [...Array(6).keys()].filter((b) => (b + 1) % (a + 1) === 0).map((b) => [a, b] as [number, number])) },
  { id: 'empty', label: 'The empty relation', n: 3, pairs: [] },
]
