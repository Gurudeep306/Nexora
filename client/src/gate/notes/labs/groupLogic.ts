/*
  Group Lab logic (Discrete Mathematics, Chapter 5). A TypeScript twin of
  content/gate-notes/_checks/dm/grouplib.py, tested against lab_vectors_ch5.json.
  A finite structure is a list of labels and an operation table of indices
  (−1 marks a product outside the set, i.e. closure fails).
*/

export type Struct = { labels: string[]; t: number[][] }

const I = (S: Struct) => [...S.labels.keys()]

export function make(labels: string[], op: (a: number, b: number) => number): Struct {
  return { labels, t: labels.map((_, a) => labels.map((_, b) => op(a, b))) }
}

export const closureFailure = (S: Struct): [number, number] | null => {
  for (const a of I(S)) for (const b of I(S)) if (S.t[a]![b]! < 0) return [a, b]
  return null
}

export function associativeFailure(S: Struct): [number, number, number] | null {
  if (closureFailure(S)) return null
  for (const a of I(S)) for (const b of I(S)) for (const c of I(S)) if (S.t[S.t[a]![b]!]![c] !== S.t[a]![S.t[b]![c]!]) return [a, b, c]
  return null
}

export function commutativeFailure(S: Struct): [number, number] | null {
  for (const a of I(S)) for (const b of I(S)) if (a < b && S.t[a]![b] !== S.t[b]![a]) return [a, b]
  return null
}

export const identity = (S: Struct): number | null => I(S).find((e) => I(S).every((a) => S.t[e]![a] === a && S.t[a]![e] === a)) ?? null

export function inverse(S: Struct, a: number): number | null {
  const e = identity(S)
  if (e === null) return null
  return I(S).find((b) => S.t[a]![b] === e && S.t[b]![a] === e) ?? null
}

export const idempotents = (S: Struct) => I(S).filter((a) => S.t[a]![a] === a)

export type Kind = 'not closed' | 'magma' | 'semigroup' | 'monoid' | 'group' | 'abelian group'

export function kind(S: Struct): Kind {
  if (closureFailure(S)) return 'not closed'
  if (associativeFailure(S)) return 'magma'
  if (identity(S) === null) return 'semigroup'
  if (I(S).some((a) => inverse(S, a) === null)) return 'monoid'
  return commutativeFailure(S) ? 'group' : 'abelian group'
}

export const isGroup = (S: Struct) => kind(S) === 'group' || kind(S) === 'abelian group'

export function order(S: Struct, a: number): number {
  const e = identity(S)!
  let x = a
  let k = 1
  while (x !== e) {
    x = S.t[x]![a]!
    k++
    if (k > S.labels.length + 1) throw new Error('not a group')
  }
  return k
}

export function generated(S: Struct, gens: number[]): number[] {
  const e = identity(S)!
  const H = new Set([e])
  const todo = [e]
  while (todo.length) {
    const x = todo.pop()!
    for (const g of gens) {
      const y = S.t[x]![g]!
      if (!H.has(y)) {
        H.add(y)
        todo.push(y)
      }
    }
  }
  return [...H].sort((a, b) => a - b)
}

export const generators = (S: Struct) => I(S).filter((a) => generated(S, [a]).length === S.labels.length)

/** All subgroups, sorted by size then by their sorted labels (as grouplib.subgroups). */
export function subgroups(S: Struct): number[][] {
  const key = (h: number[]) => h.join(',')
  const subs = new Map<string, number[]>()
  for (const a of I(S)) {
    const h = generated(S, [a])
    subs.set(key(h), h)
  }
  let changed = true
  while (changed) {
    changed = false
    const list = [...subs.values()]
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const J = generated(S, [...new Set([...list[i]!, ...list[j]!])])
        if (!subs.has(key(J))) {
          subs.set(key(J), J)
          changed = true
        }
      }
  }
  const lab = (h: number[]) => h.map((x) => S.labels[x]!).sort()
  return [...subs.values()].sort((a, b) => a.length - b.length || (lab(a).join('\u0000') < lab(b).join('\u0000') ? -1 : lab(a).join('\u0000') > lab(b).join('\u0000') ? 1 : 0))
}

export function leftCosets(S: Struct, H: number[]): number[][] {
  const out: number[][] = []
  const seen = new Set<string>()
  for (const a of I(S)) {
    const c = [...new Set(H.map((h) => S.t[a]![h]!))].sort((x, y) => x - y)
    if (!seen.has(c.join())) {
      seen.add(c.join())
      out.push(c)
    }
  }
  return out
}

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))

export function zn(n: number): Struct {
  return make(
    [...Array(n).keys()].map(String),
    (a, b) => (a + b) % n,
  )
}

export function znStar(n: number): Struct {
  const U = [...Array(n).keys()].filter((a) => a > 0 && gcd(a, n) === 1)
  return make(
    U.map(String),
    (a, b) => U.indexOf((U[a]! * U[b]!) % n),
  )
}

export function multMod(elems: number[], n: number): Struct {
  return make(
    elems.map(String),
    (a, b) => elems.indexOf((elems[a]! * elems[b]!) % n),
  )
}

function permutations(n: number): number[][] {
  if (n === 0) return [[]]
  const out: number[][] = []
  // lexicographic order, as itertools.permutations(range(n))
  const rec = (pre: number[], rest: number[]) => {
    if (!rest.length) out.push(pre)
    rest.forEach((x, i) => rec([...pre, x], [...rest.slice(0, i), ...rest.slice(i + 1)]))
  }
  rec([], [...Array(n).keys()])
  return out
}

export function sn(n: number): Struct {
  const P = permutations(n)
  const key = (p: number[]) => p.join('')
  const idx = new Map(P.map((p, i) => [key(p), i]))
  return make(
    P.map((p) => `[${p.map((x) => x + 1).join('')}]`),
    (a, b) => idx.get(key([...Array(n).keys()].map((x) => P[a]![P[b]![x]!]!)))!,
  )
}

export function product(G: Struct, H: Struct): Struct {
  const pairs = G.labels.flatMap((_, a) => H.labels.map((_, b) => [a, b] as const))
  return make(
    pairs.map(([a, b]) => `(${G.labels[a]},${H.labels[b]})`),
    (x, y) => {
      const [a1, b1] = pairs[x]!
      const [a2, b2] = pairs[y]!
      return pairs.findIndex(([a, b]) => a === G.t[a1]![a2] && b === H.t[b1]![b2])
    },
  )
}

/** Parse a Cayley table: first row = element names, then one row per element (whitespace separated). */
export function parseTable(src: string): Struct {
  const rows = src
    .trim()
    .split(/\n+/)
    .map((r) => r.trim().split(/[\s,|]+/).filter(Boolean))
  const labels = rows[0] ?? []
  if (labels.length < 1 || labels.length > 12) throw new Error('Give 1 to 12 element names on the first line')
  const body = rows.slice(1)
  if (body.length !== labels.length || body.some((r) => r.length !== labels.length)) throw new Error(`Give ${labels.length} rows of ${labels.length} entries after the names`)
  return { labels, t: body.map((r) => r.map((x) => labels.indexOf(x))) }
}

/** a^k mod n by square-and-multiply: [bit, value after this bit] for each bit of k. */
export function powMod(a: number, k: number, n: number): { value: number; steps: [string, number][] } {
  let r = 1
  const steps: [string, number][] = []
  for (const bit of k.toString(2)) {
    r = (r * r) % n
    if (bit === '1') r = (r * a) % n
    steps.push([bit, r])
  }
  return { value: r, steps }
}

export function orderMod(a: number, n: number): number | null {
  if (gcd(a, n) !== 1) return null
  let k = 1
  let x = a % n
  while (x !== 1 % n) {
    x = (x * a) % n
    k++
  }
  return k
}

export const PRESETS: { id: string; label: string; make: () => Struct }[] = [
  { id: 'z12', label: '(ℤ₁₂, + mod 12)', make: () => zn(12) },
  { id: 'z6', label: '(ℤ₆, + mod 6)', make: () => zn(6) },
  { id: 'u15', label: '(ℤ₁₅*, × mod 15) (GATE 2005)', make: () => znStar(15) },
  { id: 'u17', label: '(ℤ₁₇*, × mod 17)', make: () => znStar(17) },
  { id: 'm10', label: '{1,2,3,5,7,8,9} under × mod 10 (GATE 2006)', make: () => multMod([1, 2, 3, 5, 7, 8, 9], 10) },
  { id: 'm8', label: '{0,…,7} under × mod 8 (GATE 2000)', make: () => multMod([0, 1, 2, 3, 4, 5, 6, 7], 8) },
  { id: 's3', label: 'S₃ (permutations of 1 2 3)', make: () => sn(3) },
  { id: 'klein', label: 'Klein group ℤ₂ × ℤ₂', make: () => product(zn(2), zn(2)) },
]
