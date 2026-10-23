/*
  Recurrence Lab logic (Discrete Mathematics, Chapter 7). A numeric TypeScript
  twin of content/gate-notes/_checks/dm/reclib.py (which is exact), tested
  against lab_vectors_ch7.json with a tolerance where floating point enters.

  Recurrence: a_n = c1·a_{n−1} + … + ck·a_{n−k} + f(n), k ≤ 3,
  f(n) = p0 + p1·n + p2·n² + q·s^n (all optional), a_0 … a_{k−1} given.
*/

export type Rec = { coeffs: number[]; init: number[]; poly?: number[]; q?: number; s?: number }

export function forcing(r: Rec, n: number): number {
  const p = r.poly ?? []
  return p.reduce((acc, c, i) => acc + c * n ** i, 0) + (r.q ? r.q * (r.s ?? 1) ** n : 0)
}

export function iterate(r: Rec, count: number): number[] {
  const a = [...r.init]
  const k = r.coeffs.length
  for (let n = k; n < count; n++) a.push(r.coeffs.reduce((s, c, i) => s + c * a[n - 1 - i]!, 0) + forcing(r, n))
  return a.slice(0, count)
}

export type Cx = { re: number; im: number }
const cx = (re: number, im = 0): Cx => ({ re, im })
const add = (a: Cx, b: Cx) => cx(a.re + b.re, a.im + b.im)
const sub = (a: Cx, b: Cx) => cx(a.re - b.re, a.im - b.im)
const mul = (a: Cx, b: Cx) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re)
const div = (a: Cx, b: Cx) => {
  const d = b.re * b.re + b.im * b.im
  return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d)
}
const pw = (a: Cx, k: number) => {
  let r = cx(1)
  for (let i = 0; i < k; i++) r = mul(r, a)
  return r
}

/** Roots of r^k − c1 r^{k−1} − … − ck (Durand–Kerner), clustered into {root, multiplicity}. */
export function charRoots(coeffs: number[]): { root: Cx; mult: number }[] {
  const k = coeffs.length
  const P = (z: Cx) => coeffs.reduce((s, c, i) => sub(s, mul(cx(c), pw(z, k - 1 - i))), pw(z, k))
  let z = Array.from({ length: k }, (_, i) => pw(cx(0.4, 0.9), i))
  for (let it = 0; it < 2000; it++) {
    z = z.map((zi, i) => {
      let d = cx(1)
      z.forEach((zj, j) => {
        if (j !== i) d = mul(d, sub(zi, zj))
      })
      return sub(zi, div(P(zi), d))
    })
  }
  const out: { root: Cx; mult: number }[] = []
  for (const r of z) {
    const near = out.find((o) => Math.hypot(o.root.re - r.re, o.root.im - r.im) < 1e-4)
    if (near) {
      near.mult++
      near.root = cx((near.root.re * (near.mult - 1) + r.re) / near.mult, (near.root.im * (near.mult - 1) + r.im) / near.mult)
    } else out.push({ root: r, mult: 1 })
  }
  for (const o of out) if (Math.abs(o.root.im) < 1e-9) o.root = cx(o.root.re, 0)
  return out.sort((a, b) => a.root.re - b.root.re || a.root.im - b.root.im)
}

/** Solve a small complex linear system by Gaussian elimination with partial pivoting. */
function solve(A: Cx[][], b: Cx[]): Cx[] {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]!])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.hypot(M[r]![c]!.re, M[r]![c]!.im) > Math.hypot(M[p]![c]!.re, M[p]![c]!.im)) p = r
    ;[M[c], M[p]] = [M[p]!, M[c]!]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = div(M[r]![c]!, M[c]![c]!)
      for (let j = c; j <= n; j++) M[r]![j] = sub(M[r]![j]!, mul(f, M[c]![j]!))
    }
  }
  return M.map((row, i) => div(row[n]!, row[i]!))
}

export type Term = { root: Cx; power: number; c: Cx }

/** Homogeneous closed form a_n = Σ c · n^t · r^n fitted to the initial values. */
export function homogeneousSolution(coeffs: number[], init: number[]): Term[] {
  const basis = charRoots(coeffs).flatMap(({ root, mult }) => Array.from({ length: mult }, (_, t) => ({ root, power: t })))
  const A = init.map((_, j) => basis.map(({ root, power }) => mul(cx(j ** power), pw(root, j))))
  const c = solve(A, init.map((v) => cx(v)))
  return basis.map((b, i) => ({ ...b, c: { re: Math.round(c[i]!.re * 1e9) / 1e9, im: Math.round(c[i]!.im * 1e9) / 1e9 } }))
}

export function evalTerms(terms: Term[], n: number): number {
  return terms.reduce((s, t) => add(s, mul(t.c, mul(cx(n ** t.power), pw(t.root, n)))), cx(0)).re
}

/** Coefficients of num(x)/den(x) by long division (den[0] ≠ 0). */
export function series(num: number[], den: number[], count: number): number[] {
  if (!den.length || den[0] === 0) throw new Error('The denominator must have a non-zero constant term')
  const out: number[] = []
  for (let k = 0; k < count; k++) {
    let c = num[k] ?? 0
    for (let i = 1; i < den.length && i <= k; i++) c -= den[i]! * out[k - i]!
    out.push(c / den[0]!)
  }
  return out
}

export function binomPower(sign: number, k: number): number[] {
  const out = [1]
  for (let i = 1; i <= k; i++) out.push((out[i - 1]! * (k - i + 1) * sign) / i)
  return out
}

export function parseList(src: string): number[] {
  const xs = src
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
  if (xs.some((x) => !Number.isFinite(x))) throw new Error('Use numbers separated by commas')
  return xs
}

export function showRoot(r: Cx): string {
  const f = (x: number) => String(Math.round(x * 1e4) / 1e4)
  if (Math.abs(r.im) < 1e-9) return f(r.re)
  return `${f(r.re)} ${r.im < 0 ? '−' : '+'} ${f(Math.abs(r.im))}i`
}

export const PRESETS: { id: string; label: string; rec: Rec }[] = [
  { id: 'fib', label: 'Fibonacci: aₙ = aₙ₋₁ + aₙ₋₂, 0, 1', rec: { coeffs: [1, 1], init: [0, 1] } },
  { id: 'lucas', label: 'Lucas: aₙ = aₙ₋₁ + aₙ₋₂, 2, 1 (GATE 2023)', rec: { coeffs: [1, 1], init: [2, 1] } },
  { id: 'g2024', label: 'T(n) = 5T(n−1) − 6T(n−2), 1, 2 (GATE 2024)', rec: { coeffs: [5, -6], init: [1, 2] } },
  { id: 'rep', label: 'Repeated root: aₙ = 4aₙ₋₁ − 4aₙ₋₂, 0, 1', rec: { coeffs: [4, -4], init: [0, 1] } },
  { id: 'g1998', label: 'xₙ = 2xₙ₋₁ − 1 from x₀ = 2 (GATE 1998, shifted)', rec: { coeffs: [2], init: [2], poly: [-1] } },
  { id: 'hanoi', label: 'Hanoi: Hₙ = 2Hₙ₋₁ + 1, H₀ = 0', rec: { coeffs: [2], init: [0], poly: [1] } },
  { id: 'cplx', label: 'Complex roots: aₙ = 2aₙ₋₁ − 2aₙ₋₂, 1, 1', rec: { coeffs: [2, -2], init: [1, 1] } },
  { id: 'tri', label: 'Tribonacci: 0, 0, 1', rec: { coeffs: [1, 1, 1], init: [0, 0, 1] } },
]
