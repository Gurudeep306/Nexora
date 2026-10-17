/*
  K-map Solver — the pure logic behind the Chapter 3 Live Lab (Digital Logic).

  A function is a list of cell values ('0' | '1' | 'X') indexed by minterm
  number (first variable = most significant bit). A cube is a string over
  0, 1 and '-' (one character per variable), so '1-0' over (A, B, C) is AC'.

  Everything here mirrors content/gate-notes/_checks/dl/minlib.py:
    - qmRounds: the Quine–McCluskey tabulation (same ordering as minlib.qm);
    - primes / essential / classify: prime implicants that cover at least one
      1, the essential ones, redundant and selective ones;
    - minCovers: every minimal cover (fewest literals, then fewest terms),
      found by branch and bound over the prime implicants (minlib finds them
      with Petrick's method; the test compares the two);
    - loopRects: the rectangles that draw a cube on the map, with wrap-around
      groups split into the 2 or 4 pieces that touch the edges.

  Dependency-free and erasable-syntax only: tests/gate-notes.test.js imports
  it in Node and checks it against vectors that
  content/gate-notes/_checks/dl/l3_lab_vectors.py computes with minlib.
*/

export type CellValue = '0' | '1' | 'X'

export interface Spec {
  n: number
  ones: number[]
  dcs: number[]
}

export const VARS: Record<number, string[]> = {
  2: ['A', 'B'],
  3: ['A', 'B', 'C'],
  4: ['A', 'B', 'C', 'D'],
  5: ['A', 'B', 'C', 'D', 'E'],
}

/* ── Cubes ─────────────────────────────────────────────────────────────── */

export const cubeOf = (m: number, n: number) => m.toString(2).padStart(n, '0')

/** Minterms covered by a cube, ascending. */
export function cubeCells(cube: string): number[] {
  const free: number[] = []
  for (let i = 0; i < cube.length; i++) if (cube[i] === '-') free.push(i)
  const out: number[] = []
  for (let k = 0; k < 1 << free.length; k++) {
    const s = cube.split('')
    free.forEach((pos, j) => {
      s[pos] = (k >> (free.length - 1 - j)) & 1 ? '1' : '0'
    })
    out.push(parseInt(s.join(''), 2))
  }
  return out.sort((a, b) => a - b)
}

export const literals = (cube: string) => [...cube].filter((c) => c !== '-').length
const ones1 = (cube: string) => [...cube].filter((c) => c === '1').length

/** minlib.cube_key: fewer literals first, then by the covered cells. */
export function cubeCompare(a: string, b: string): number {
  const d = literals(a) - literals(b)
  if (d) return d
  const ca = cubeCells(a)
  const cb = cubeCells(b)
  for (let i = 0; i < Math.min(ca.length, cb.length); i++) if (ca[i] !== cb[i]) return ca[i]! - cb[i]!
  return ca.length - cb.length
}

const strCompare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** A product term in the lessons' prime notation: A′B, or 1 for the empty cube. */
export function termText(cube: string, vars: string[]): string {
  let s = ''
  for (let i = 0; i < cube.length; i++) {
    if (cube[i] === '1') s += vars[i]
    else if (cube[i] === '0') s += `${vars[i]}′`
  }
  return s || '1'
}

/** The sum term of a cube of 0-cells: a 0 bit gives the plain variable, a 1 the complement. */
export function sumText(cube: string, vars: string[]): string {
  const parts: string[] = []
  for (let i = 0; i < cube.length; i++) {
    if (cube[i] === '0') parts.push(vars[i]!)
    else if (cube[i] === '1') parts.push(`${vars[i]}′`)
  }
  return parts.length ? `(${parts.join(' + ')})` : '0'
}

export const sopText = (cover: string[], vars: string[]) => (cover.length ? cover.map((c) => termText(c, vars)).join(' + ') : '0')
export const posText = (cover: string[], vars: string[]) => (cover.length ? cover.map((c) => sumText(c, vars)).join('') : '1')

/* ── Quine–McCluskey ───────────────────────────────────────────────────── */

function combine(a: string, b: string): string | null {
  let diff = -1
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      if (diff >= 0) return null
      diff = i
    }
  }
  if (diff < 0 || a[diff] === '-' || b[diff] === '-') return null
  return a.slice(0, diff) + '-' + a.slice(diff + 1)
}

export interface QmRow {
  cube: string
  checked: boolean
}

/** The tabulation: rounds[k] lists the cubes of size 2ᵏ (sorted by weight) with their ticks. */
export function qmRounds(ones: number[], dcs: number[], n: number): { rounds: QmRow[][]; primes: string[] } {
  const start = [...new Set([...ones, ...dcs].map((m) => cubeOf(m, n)))]
  let current = start.sort((a, b) => ones1(a) - ones1(b) || strCompare(a, b))
  const rounds: QmRow[][] = []
  const primeSet = new Set<string>()
  while (current.length) {
    const used = new Set<string>()
    const next = new Set<string>()
    const byW = new Map<number, string[]>()
    for (const c of current) {
      const w = ones1(c)
      if (!byW.has(w)) byW.set(w, [])
      byW.get(w)!.push(c)
    }
    for (const w of [...byW.keys()].sort((a, b) => a - b)) {
      for (const a of byW.get(w)!) {
        for (const b of byW.get(w + 1) ?? []) {
          const c = combine(a, b)
          if (c) {
            used.add(a)
            used.add(b)
            next.add(c)
          }
        }
      }
    }
    rounds.push(current.map((c) => ({ cube: c, checked: used.has(c) })))
    for (const c of current) if (!used.has(c)) primeSet.add(c)
    const key = (c: string) => c.replace(/-/g, '2')
    current = [...next].sort((a, b) => ones1(a) - ones1(b) || strCompare(key(a), key(b)))
  }
  return { rounds, primes: [...primeSet].sort(cubeCompare) }
}

/** Prime implicants that cover at least one 1 (the only ones a cover can use). */
export function primes(ones: number[], dcs: number[], n: number): string[] {
  const one = new Set(ones)
  return qmRounds(ones, dcs, n).primes.filter((p) => cubeCells(p).some((m) => one.has(m)))
}

/** For each 1-cell (ascending), the prime implicants that cover it. */
export function chart(ones: number[], ps: string[]): Map<number, string[]> {
  const out = new Map<number, string[]>()
  for (const m of [...ones].sort((a, b) => a - b)) out.set(m, ps.filter((p) => cubeCells(p).includes(m)))
  return out
}

export interface Classified {
  primes: string[]
  essential: string[]
  redundant: string[]
  selective: string[]
}

export function classify(ones: number[], dcs: number[], n: number): Classified {
  const ps = primes(ones, dcs, n)
  const ch = chart(ones, ps)
  const ess = new Set<string>()
  for (const cov of ch.values()) if (cov.length === 1) ess.add(cov[0]!)
  const essential = ps.filter((p) => ess.has(p))
  const byE = new Set(essential.flatMap(cubeCells))
  const one = new Set(ones)
  const redundant = ps.filter((p) => !ess.has(p) && cubeCells(p).filter((m) => one.has(m)).every((m) => byE.has(m)))
  const selective = ps.filter((p) => !ess.has(p) && !redundant.includes(p))
  return { primes: ps, essential, redundant, selective }
}

/* ── Minimal covers ────────────────────────────────────────────────────── */

type Cost = [number, number]
const costOf = (cover: string[]): Cost => [cover.reduce((s, c) => s + literals(c), 0), cover.length]
const lessCost = (a: Cost, b: Cost) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])
const sameCost = (a: Cost, b: Cost) => a[0] === b[0] && a[1] === b[1]

/**
 * Every minimal SOP cover of the 1s (fewest literals, then fewest terms), each
 * sorted by cubeCompare, the list sorted by cost then term by term. At most
 * `limit` covers are returned (`more` says whether any were left out).
 */
export function minCovers(ones: number[], dcs: number[], n: number, limit = 64): { covers: string[][]; more: boolean } {
  if (!ones.length) return { covers: [[]], more: false }
  const ps = primes(ones, dcs, n)
  const cov = ps.map((p) => new Set(cubeCells(p)))
  const target = [...new Set(ones)].sort((a, b) => a - b)
  let best: Cost | null = null
  const found = new Map<string, string[]>()
  const pick = (chosen: number[], covered: Set<number>) => {
    const cost = costOf(chosen.map((i) => ps[i]!))
    if (best && lessCost(best, cost)) return
    const left = target.filter((m) => !covered.has(m))
    if (!left.length) {
      const cover = chosen.map((i) => ps[i]!).sort(cubeCompare)
      if (!best || lessCost(cost, best)) {
        best = cost
        found.clear()
      }
      found.set(cover.join(','), cover)
      return
    }
    // Branch on the uncovered 1 with the fewest covering PIs.
    let m = left[0]!
    let opts = ps.length + 1
    for (const x of left) {
      const k = cov.filter((s) => s.has(x)).length
      if (k < opts) {
        opts = k
        m = x
      }
    }
    for (let i = 0; i < ps.length; i++) {
      if (!cov[i]!.has(m) || chosen.includes(i)) continue
      const nextCovered = new Set(covered)
      for (const c of cov[i]!) nextCovered.add(c)
      pick([...chosen, i], nextCovered)
    }
  }
  pick([], new Set())
  // Same order as minlib: by cost, then term by term as strings.
  const covers = [...found.values()].sort((a, b) => {
    const ca = costOf(a)
    const cb = costOf(b)
    if (ca[0] !== cb[0] || ca[1] !== cb[1]) return lessCost(ca, cb) ? -1 : 1
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const d = strCompare(a[i]!, b[i]!)
      if (d) return d
    }
    return a.length - b.length
  })
  // All found covers share the minimal cost.
  if (best) for (const c of covers) if (!sameCost(costOf(c), best)) throw new Error('cover cost mismatch')
  return { covers: covers.slice(0, limit), more: covers.length > limit }
}

export const zerosOf = (ones: number[], dcs: number[], n: number) => {
  const skip = new Set([...ones, ...dcs])
  const out: number[] = []
  for (let m = 0; m < 1 << n; m++) if (!skip.has(m)) out.push(m)
  return out
}

/** Minimal POS: minimal covers of the 0-cells, each cube read as a sum term. */
export const minPosCovers = (ones: number[], dcs: number[], n: number, limit = 64) => minCovers(zerosOf(ones, dcs, n), dcs, n, limit)

export const coverLiterals = (cover: string[]) => costOf(cover)[0]

/* ── Map geometry ──────────────────────────────────────────────────────── */

export const gray = (k: number) => Array.from({ length: 1 << k }, (_, i) => i ^ (i >> 1))

/** Row and column bits of a 1–4 variable map (rows take the first variables). */
export function layout(n: number): [number, number] {
  return ({ 1: [0, 1], 2: [1, 1], 3: [1, 2], 4: [2, 2] } as Record<number, [number, number]>)[n]!
}

/** Row and column of minterm m on an n ≤ 4 variable map. */
export function cellRC(m: number, n: number): [number, number] {
  const [rb, cb] = layout(n)
  const r = m >> cb
  const c = m & ((1 << cb) - 1)
  return [gray(rb).indexOf(r), gray(cb).indexOf(c)]
}

export function rcMinterm(r: number, c: number, n: number): number {
  const [rb, cb] = layout(n)
  return (gray(rb)[r]! << cb) | gray(cb)[c]!
}

function runs(idx: number[], size: number): [number, number][] {
  const s = [...new Set(idx)].sort((a, b) => a - b)
  if (s.length === size) return [[0, size]]
  const out: [number, number][] = []
  let start = s[0]!
  let prev = s[0]!
  for (const i of s.slice(1)) {
    if (i === prev + 1) prev = i
    else {
      out.push([start, prev - start + 1])
      start = prev = i
    }
  }
  out.push([start, prev - start + 1])
  return out
}

/** Rectangles [row, col, rows, cols] that draw a cube on an n ≤ 4 variable map. */
export function loopRects(cube: string, n: number): [number, number, number, number][] {
  const pos = cubeCells(cube).map((m) => cellRC(m, n))
  const [rb, cb] = layout(n)
  const rr = runs(pos.map((p) => p[0]), 1 << rb)
  const cc = runs(pos.map((p) => p[1]), 1 << cb)
  const out: [number, number, number, number][] = []
  for (const [r0, rl] of rr) for (const [c0, cl] of cc) out.push([r0, c0, rl, cl])
  return out
}

/** Gray-order axis labels of an n ≤ 4 variable map: [row labels, column labels]. */
export function axisLabels(n: number): [string[], string[]] {
  const [rb, cb] = layout(n)
  const lab = (k: number) => (k ? gray(k).map((g) => g.toString(2).padStart(k, '0')) : [''])
  return [lab(rb), lab(cb)]
}

/* ── Editing helpers ───────────────────────────────────────────────────── */

export const NEXT: Record<CellValue, CellValue> = { '0': '1', '1': 'X', X: '0' }

export function specOf(values: CellValue[]): Spec {
  const n = Math.round(Math.log2(values.length))
  const ones: number[] = []
  const dcs: number[] = []
  values.forEach((v, m) => {
    if (v === '1') ones.push(m)
    else if (v === 'X') dcs.push(m)
  })
  return { n, ones, dcs }
}

export function valuesOf(spec: Spec): CellValue[] {
  const one = new Set(spec.ones)
  const dc = new Set(spec.dcs)
  return Array.from({ length: 1 << spec.n }, (_, m) => (one.has(m) ? '1' : dc.has(m) ? 'X' : '0'))
}

/** Keep the same minterm numbers when the variable count changes (dropping any that no longer exist). */
export function resize(values: CellValue[], n: number): CellValue[] {
  return Array.from({ length: 1 << n }, (_, m) => values[m] ?? '0')
}

/** "Σm(…) + d(…)" for display. */
export function sigmaText(spec: Spec): string {
  const s = `Σm(${spec.ones.join(', ')})`
  return spec.dcs.length ? `${s} + d(${spec.dcs.join(', ')})` : s
}

export interface Preset {
  id: string
  label: string
  spec: Spec
}

/** Maps from the lessons and from GATE papers (each solved in the lessons). */
export const PRESETS: Preset[] = [
  { id: 'octet', label: 'Octet and wrap-around quads', spec: { n: 4, ones: [0, 1, 2, 4, 5, 6, 8, 9, 12, 13, 14], dcs: [] } },
  { id: 'centre', label: 'Redundant centre quad', spec: { n: 4, ones: [1, 5, 6, 7, 11, 12, 13, 15], dcs: [] } },
  { id: 'cyclic', label: 'Cyclic Σ(1, 2, 3, 4, 5, 6)', spec: { n: 3, ones: [1, 2, 3, 4, 5, 6], dcs: [] } },
  { id: 'gate2018', label: 'GATE 2018 (don’t-cares)', spec: { n: 4, ones: [0, 2, 5, 7, 9, 11], dcs: [3, 8, 10, 12, 14] } },
  { id: 'gate2026', label: 'GATE 2026 (two minimal SOPs)', spec: { n: 4, ones: [1, 2, 3, 4, 5, 7, 10, 12, 13, 14], dcs: [] } },
  { id: 'five', label: '5 variables', spec: { n: 5, ones: [0, 2, 5, 7, 8, 10, 13, 15, 16, 18, 21, 23, 24, 26, 29, 31], dcs: [] } },
]
