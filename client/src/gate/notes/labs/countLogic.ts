/*
  Counting Lab logic (Discrete Mathematics, Chapter 6). A TypeScript twin of
  content/gate-notes/_checks/dm/countlib.py, tested against lab_vectors_ch6.json.
  Numbers stay below 2^53 for the input ranges the lab allows (n ≤ 12, k ≤ 8).
*/

export type Rule = 'any' | '≤1' | '≥1'
export const RULES: Rule[] = ['any', '≤1', '≥1']

export const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1))
export function C(n: number, k: number): number {
  if (k < 0 || n < 0 || k > n) return 0
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return Math.round(r)
}
export const Pk = (n: number, k: number) => (k > n ? 0 : fact(n) / fact(n - k))

const memoS = new Map<string, number>()
export function stirling2(n: number, k: number): number {
  if (n === k) return 1
  if (k === 0 || k > n) return 0
  const key = `${n},${k}`
  const hit = memoS.get(key)
  if (hit !== undefined) return hit
  const v = k * stirling2(n - 1, k) + stirling2(n - 1, k - 1)
  memoS.set(key, v)
  return v
}

export function partitionsAtMost(n: number, k: number): number {
  if (n === 0) return 1
  if (k === 0) return 0
  if (k > n) return partitionsAtMost(n, n)
  return partitionsAtMost(n, k - 1) + partitionsAtMost(n - k, k)
}
export const partitionsExactly = (n: number, k: number) => (k === 0 ? (n === 0 ? 1 : 0) : n >= k ? partitionsAtMost(n - k, k) : 0)

export function twelvefold(n: number, k: number, ballsDistinct: boolean, boxesDistinct: boolean, rule: Rule): number {
  if (ballsDistinct && boxesDistinct) return rule === 'any' ? k ** n : rule === '≤1' ? Pk(k, n) : fact(k) * stirling2(n, k)
  if (!ballsDistinct && boxesDistinct) {
    if (rule === 'any') return k ? C(n + k - 1, k - 1) : n === 0 ? 1 : 0
    if (rule === '≤1') return C(k, n)
    return n >= k && k ? C(n - 1, k - 1) : n === 0 && k === 0 ? 1 : 0
  }
  if (ballsDistinct && !boxesDistinct) {
    if (rule === 'any') return Array.from({ length: k + 1 }, (_, j) => stirling2(n, j)).reduce((a, b) => a + b, 0)
    return rule === '≤1' ? (n <= k ? 1 : 0) : stirling2(n, k)
  }
  if (rule === 'any') return partitionsAtMost(n, k)
  return rule === '≤1' ? (n <= k ? 1 : 0) : partitionsExactly(n, k)
}

/** The formula shown in each cell of the table. */
export function formula(ballsDistinct: boolean, boxesDistinct: boolean, rule: Rule): string {
  const t: Record<string, string> = {
    'tt-any': 'kⁿ',
    'tt-≤1': 'k!/(k−n)!',
    'tt-≥1': 'k! · S(n, k)',
    'ft-any': 'C(n+k−1, k−1)',
    'ft-≤1': 'C(k, n)',
    'ft-≥1': 'C(n−1, k−1)',
    'tf-any': 'S(n,1)+…+S(n,k)',
    'tf-≤1': '1 if n ≤ k',
    'tf-≥1': 'S(n, k)',
    'ff-any': 'p(n, ≤ k parts)',
    'ff-≤1': '1 if n ≤ k',
    'ff-≥1': 'p(n, exactly k parts)',
  }
  return t[`${ballsDistinct ? 't' : 'f'}${boxesDistinct ? 't' : 'f'}-${rule}`]!
}

/** Brute force: enumerate the kⁿ maps balls → boxes and count the classes (only when kⁿ ≤ limit). */
export function twelvefoldBrute(n: number, k: number, ballsDistinct: boolean, boxesDistinct: boolean, rule: Rule, limit = 300000): number | null {
  if (k ** n > limit) return null
  const seen = new Set<string>()
  const f = Array.from({ length: n }, () => 0)
  const total = k ** n
  for (let code = 0; code < total || (n === 0 && code === 0); code++) {
    let c = code
    for (let i = n - 1; i >= 0; i--) {
      f[i] = c % k
      c = Math.floor(c / k)
    }
    const counts = Array.from({ length: k }, (_, b) => f.filter((x) => x === b).length)
    if (rule === '≤1' && counts.some((x) => x > 1)) continue
    if (rule === '≥1' && counts.some((x) => x < 1)) continue
    let key: string
    if (ballsDistinct && boxesDistinct) key = f.join(',')
    else if (!ballsDistinct && boxesDistinct) key = counts.join(',')
    else if (ballsDistinct) {
      key = Array.from({ length: k }, (_, b) => f.flatMap((x, i) => (x === b ? [i] : [])).join('.'))
        .filter(Boolean)
        .sort()
        .join('|')
    } else key = [...counts].sort((a, b) => a - b).join(',')
    seen.add(key)
    if (n === 0) break
  }
  return seen.size
}

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
export const lcm = (a: number, b: number) => (a / gcd(a, b)) * b

export type Term = { set: number[]; sign: 1 | -1; lcm: number; count: number }

/** Integers in 1..N divisible by at least one d: the inclusion–exclusion terms and the total. */
export function divisibilityPie(N: number, ds: number[]): { terms: Term[]; total: number; none: number } {
  const terms: Term[] = []
  const k = ds.length
  for (let r = 1; r <= k; r++) {
    const rec = (start: number, pick: number[]) => {
      if (pick.length === r) {
        const l = pick.reduce((a, i) => lcm(a, ds[i]!), 1)
        terms.push({ set: [...pick], sign: r % 2 ? 1 : -1, lcm: l, count: Math.floor(N / l) })
        return
      }
      for (let i = start; i < k; i++) rec(i + 1, [...pick, i])
    }
    rec(0, [])
  }
  const total = terms.reduce((s, t) => s + t.sign * t.count, 0)
  return { terms, total, none: N - total }
}

export const derangements = (n: number) => Array.from({ length: n + 1 }, (_, i) => (i % 2 ? -1 : 1) * C(n, i) * fact(n - i)).reduce((a, b) => a + b, 0)
export const catalan = (n: number) => C(2 * n, n) / (n + 1)
export const onto = (m: number, n: number) => Array.from({ length: n + 1 }, (_, i) => (i % 2 ? -1 : 1) * C(n, i) * (n - i) ** m).reduce((a, b) => a + b, 0)
