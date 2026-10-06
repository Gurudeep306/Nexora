import { trace } from '../../../engine/tracer'
import type { Algorithm, Scalar } from '../../../engine/types'
import { list, rarr, rint } from '../../../algorithms/util'

/* Math topic — animations, quarter 1: divisibility, gcd/lcm, extended Euclid, primes. */

const int = (x: unknown, name: string, lo: number, hi: number) => {
  const v = Number(x)
  if (!Number.isFinite(v) || !Number.isInteger(v)) throw new Error(`${name} must be a whole number.`)
  if (v < lo || v > hi) throw new Error(`${name} must be between ${lo} and ${hi}.`)
  return v
}
const floorDiv = (a: number, b: number) => Math.floor(a / b)
const gcdN = (a: number, b: number): number => {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a
}

/* ───────────────────────── 1. Truncating vs flooring division ───────────────────────── */

export const mathDivFloor: Algorithm = {
  id: 'math-div-floor',
  title: 'Quotient and remainder on the number line — truncate vs floor',
  blurb: 'The multiples of b cut the integers into blocks of length b. The true (floor) quotient picks the block that contains a; C, C++, Java and JavaScript truncate toward zero instead, which is the wrong block when a < 0.',
  legend: { compare: 'multiple of b', active: 'a', swap: 'truncated q·b', found: 'floor q·b', window: 'the block [q·b, q·b + b) holding a' },
  inputs: [
    { name: 'arr', label: 'Values of a', type: 'array', default: '7 -7 -9', maxLen: 4 },
    { name: 'b', label: 'b (> 0)', type: 'number', default: '3', min: 1, max: 5 },
  ],
  random: () => ({ arr: list(rarr(3, -12, 12)), b: String(rint(2, 5)) }),
  code: {
    pseudo: `
function divmodFloor(a, b)               // b > 0
  q ← trunc(a / b); r ← a − q·b          // @trunc
  if r < 0                               // @check
    q ← q − 1; r ← r + b                 // @fix
  return (q, r)                          // @done`,
    cpp: `
// floor quotient and the remainder in [0, b), for b > 0
pair<long long, long long> divmodFloor(long long a, long long b) {
    long long q = a / b, r = a % b;      // @trunc
    if (r < 0) {                         // @check
        q -= 1; r += b;                  // @fix
    }
    return {q, r};                       // @done
}`,
    java: `
// floor quotient and the remainder in [0, b), for b > 0
static long[] divmodFloor(long a, long b) {
    long q = a / b, r = a % b;           // @trunc
    if (r < 0) {                         // @check
        q -= 1; r += b;                  // @fix
    }
    return new long[] {q, r};            // @done
}`,
    python: `
# Python's a // b and a % b already floor; this spells out what C does and how to fix it
def divmod_floor(a, b):                  # b > 0
    q = abs(a) // b * (1 if a >= 0 else -1); r = a - q * b   # @trunc
    if r < 0:                            # @check
        q -= 1; r += b                   # @fix
    return q, r                          # @done`,
    js: `
// floor quotient and the remainder in [0, b), for b > 0
function divmodFloor(a, b) {
  let q = Math.trunc(a / b), r = a % b;  // @trunc
  if (r < 0) {                           // @check
    q -= 1; r += b;                      // @fix
  }
  return [q, r];                         // @done
}`,
    c: `
/* floor quotient and the remainder in [0, b), for b > 0 */
void divmod_floor(long long a, long long b, long long *q, long long *r) {
    *q = a / b; *r = a % b;              // @trunc
    if (*r < 0) {                        // @check
        *q -= 1; *r += b;                // @fix
    }
}                                        // @done`,
  },
  run: ({ arr, b }) =>
    trace((t) => {
      const B = int(b, 'b', 1, 5)
      const as = (arr as number[]).map((x) => int(x, 'Each a', -12, 12))
      if (!as.length) throw new Error('Give at least one value of a.')
      const lo = Math.min(0, ...as.map((a) => floorDiv(a, B) * B))
      const hi = Math.max(0, ...as) + 1
      const vals: Scalar[] = []
      for (let v = lo; v <= hi; v++) vals.push(v)
      const L = t.array('line', vals, { label: `the integers ${lo} … ${hi}; multiples of ${B} highlighted` })
      const ix = (v: number) => v - lo
      const marks = () => {
        L.clear()
        for (let v = lo; v <= hi; v++) if (((v % B) + B) % B === 0) L.role(ix(v), 'compare')
      }
      for (const a of as) {
        marks()
        L.range([]).ptr('a', ix(a)).ptr('q·b', null)
        const qt = Math.trunc(a / B)
        const rt = a - qt * B
        L.role(ix(a), 'active').role(ix(qt * B), 'swap').ptr('q·b', ix(qt * B))
        if (qt * B !== a) L.arrow(ix(qt * B), ix(a), `r = ${rt}`, 'swap')
        t.step('trunc', `a = ${a}: truncation rounds ${a}/${B} = ${(a / B).toFixed(2)} toward zero, giving q = ${qt}. So r = ${a} − ${qt}·${B} = ${rt}. This is what a / b and a % b give in C, C++, Java and JS.`, { a, b: B, q: qt, r: rt })
        if (rt < 0) {
          t.step('check', `r = ${rt} is negative: q·b = ${qt * B} sits to the RIGHT of a, because rounding toward zero rounded a negative quotient up. The remainder must be in [0, ${B}).`, { a, b: B, q: qt, r: rt })
          const q = qt - 1
          const r = rt + B
          marks()
          L.role(ix(a), 'active').role(ix(q * B), 'found').ptr('q·b', ix(q * B))
          L.arrow(ix(q * B), ix(a), `r = ${r}`, 'found')
          t.step('fix', `Step one block left: q = ${qt} − 1 = ${q}, r = ${rt} + ${B} = ${r}. Now q·b = ${q * B} ≤ ${a}. This equals Python's ${a} // ${B} = ${q} and ${a} % ${B} = ${r}.`, { a, b: B, q, r })
          L.range([{ from: ix(q * B), to: ix(q * B + B - 1), role: 'window', label: `[${q * B}, ${q * B + B})` }])
          t.step('done', `${a} = ${B}·(${q}) + ${r} with 0 ≤ ${r} < ${B}: a lies in the block starting at the largest multiple of ${B} that is ≤ ${a}. That is the division algorithm's unique (q, r).`, { a, b: B, q, r })
        } else {
          t.step('check', `r = ${rt} ≥ 0, so truncation and floor agree (they only differ when a/b is negative and not exact).`, { a, b: B, q: qt, r: rt })
          marks()
          L.role(ix(a), 'active').role(ix(qt * B), 'found')
          L.range([{ from: ix(qt * B), to: ix(qt * B + B - 1), role: 'window', label: `[${qt * B}, ${qt * B + B})` }])
          t.step('done', `${a} = ${B}·${qt} + ${rt} with 0 ≤ ${rt} < ${B}: no fix needed.`, { a, b: B, q: qt, r: rt })
        }
      }
    }),
}

/* ───────────────────────── 2. Counting multiples in [L, R] ───────────────────────── */

export const mathDivCount: Algorithm = {
  id: 'math-div-count',
  title: 'How many multiples of k lie in [L, R]?',
  blurb: 'Count the multiples up to R, subtract the multiples up to L − 1. Two divisions, no loop.',
  legend: { found: 'multiple of k in [L, R]', dim: 'multiple below L (subtracted)', window: '[L, R]' },
  inputs: [
    { name: 'L', label: 'L', type: 'number', default: '7', min: 1, max: 30 },
    { name: 'R', label: 'R', type: 'number', default: '23', min: 1, max: 30 },
    { name: 'k', label: 'k', type: 'number', default: '4', min: 1, max: 10 },
  ],
  random: () => {
    const L = rint(1, 15)
    return { L: String(L), R: String(rint(L, 30)), k: String(rint(2, 7)) }
  },
  code: {
    pseudo: `
function countMultiples(L, R, k)         // k > 0
  upToR ← ⌊R / k⌋                        // @all
  belowL ← ⌊(L − 1) / k⌋                 // @below
  return upToR − belowL                  // @ans`,
    cpp: `
long long floorDiv(long long a, long long b) { return a / b - ((a % b != 0) && ((a < 0) != (b < 0))); }
long long countMultiples(long long L, long long R, long long k) {
    long long upToR = floorDiv(R, k);        // @all
    long long belowL = floorDiv(L - 1, k);   // @below
    return upToR - belowL;                   // @ans
}`,
    java: `
static long countMultiples(long L, long R, long k) {
    long upToR = Math.floorDiv(R, k);        // @all
    long belowL = Math.floorDiv(L - 1, k);   // @below
    return upToR - belowL;                   // @ans
}`,
    python: `
def count_multiples(L, R, k):
    up_to_r = R // k                         # @all
    below_l = (L - 1) // k                   # @below
    return up_to_r - below_l                 # @ans`,
    js: `
function countMultiples(L, R, k) {
  const upToR = Math.floor(R / k);          // @all
  const belowL = Math.floor((L - 1) / k);   // @below
  return upToR - belowL;                    // @ans
}`,
    c: `
long long floor_div(long long a, long long b) { return a / b - ((a % b != 0) && ((a < 0) != (b < 0))); }
long long count_multiples(long long L, long long R, long long k) {
    long long up_to_r = floor_div(R, k);      // @all
    long long below_l = floor_div(L - 1, k);  // @below
    return up_to_r - below_l;                 // @ans
}`,
  },
  run: ({ L, R, k }) =>
    trace((t) => {
      const l = int(L, 'L', 1, 30)
      const r = int(R, 'R', 1, 30)
      const K = int(k, 'k', 1, 10)
      if (l > r) throw new Error('Need L ≤ R.')
      const A = t.array('n', Array.from({ length: r }, (_, i) => i + 1), { label: `1 … ${r}` })
      A.range([{ from: l - 1, to: r - 1, role: 'window', label: `[${l}, ${r}]` }])
      t.step('all', `Count multiples of ${K} in [${l}, ${r}]. Trick: every multiple of ${K} in 1…R is ${K}·1, ${K}·2, …, ${K}·⌊R/${K}⌋, so there are exactly ⌊R/k⌋ of them.`, { L: l, R: r, k: K })
      let c = 0
      for (let m = K; m <= r; m += K) {
        c++
        A.role(m - 1, 'found')
        t.step('all', `${m} = ${K}·${c} is multiple #${c} up to R.`, { L: l, R: r, k: K, upToR: c })
      }
      t.step('all', `⌊${r}/${K}⌋ = ${floorDiv(r, K)} multiples up to ${r} — the formula agrees with the count.`, { L: l, R: r, k: K, upToR: floorDiv(r, K) })
      const below = floorDiv(l - 1, K)
      for (let m = K; m <= l - 1; m += K) A.role(m - 1, 'dim')
      t.step('below', `The ones below L are the multiples in 1…${l - 1}: ⌊${l - 1}/${K}⌋ = ${below} of them (greyed). They must be subtracted.`, { L: l, R: r, k: K, upToR: floorDiv(r, K), belowL: below })
      const ans = floorDiv(r, K) - below
      t.step('ans', `${floorDiv(r, K)} − ${below} = ${ans} multiples of ${K} in [${l}, ${r}]. Note L − 1, not L: subtracting ⌊L/k⌋ would wrongly remove L itself when k divides L.`, { L: l, R: r, k: K, answer: ans })
    }),
}

/* ───────────────────────── 3. Digit divisibility rules ───────────────────────── */

export const mathDivDigits: Algorithm = {
  id: 'math-div-digits',
  title: 'Why digit rules work: replace each power of 10 by its remainder',
  blurb: 'n = Σ dᵢ·10ⁱ ≡ Σ dᵢ·wᵢ (mod m) where wᵢ = 10ⁱ mod m. For m = 3, 9 every wᵢ is 1 (digit sum); for 11 they alternate +1, −1.',
  legend: { active: 'digit being added', write: 'weight 10ⁱ mod m', found: 'divisible', removed: 'not divisible' },
  inputs: [
    { name: 'n', label: 'Number (digits)', type: 'string', default: '918082' },
    { name: 'm', label: 'Divisor m', type: 'number', default: '11', min: 2, max: 13 },
  ],
  random: () => ({
    n: String(rint(1, 9)) + Array.from({ length: rint(4, 8) }, () => rint(0, 9)).join(''),
    m: String([3, 9, 11, 7, 13][rint(0, 4)]),
  }),
  code: {
    pseudo: `
function divisible(digits, m)
  s ← 0; w ← 1                            // @init
  for each digit d, from the right
    s ← (s + d·w) mod m                   // @add
    w ← (w · 10) mod m                    // @weight
  return s = 0                            // @done`,
    cpp: `
bool divisible(const string& n, int m) {
    int s = 0, w = 1;                                   // @init
    for (int i = (int)n.size() - 1; i >= 0; i--) {
        s = (s + (n[i] - '0') * w) % m;                 // @add
        w = w * 10 % m;                                 // @weight
    }
    return s == 0;                                      // @done
}`,
    java: `
static boolean divisible(String n, int m) {
    int s = 0, w = 1;                                   // @init
    for (int i = n.length() - 1; i >= 0; i--) {
        s = (s + (n.charAt(i) - '0') * w) % m;          // @add
        w = w * 10 % m;                                 // @weight
    }
    return s == 0;                                      // @done
}`,
    python: `
def divisible(n: str, m: int) -> bool:
    s, w = 0, 1                                         # @init
    for ch in reversed(n):
        s = (s + int(ch) * w) % m                       # @add
        w = w * 10 % m                                  # @weight
    return s == 0                                       # @done`,
    js: `
function divisible(n, m) {
  let s = 0, w = 1;                                     // @init
  for (let i = n.length - 1; i >= 0; i--) {
    s = (s + Number(n[i]) * w) % m;                     // @add
    w = w * 10 % m;                                     // @weight
  }
  return s === 0;                                       // @done
}`,
    c: `
int divisible(const char *n, int m) {
    int s = 0, w = 1;                                   // @init
    for (int i = (int)strlen(n) - 1; i >= 0; i--) {
        s = (s + (n[i] - '0') * w) % m;                 // @add
        w = w * 10 % m;                                 // @weight
    }
    return s == 0;                                      // @done
}`,
  },
  run: ({ n, m }) =>
    trace((t) => {
      const N = String(n).trim()
      if (!/^\d{1,12}$/.test(N)) throw new Error('Type a whole number of up to 12 digits.')
      const M = int(m, 'm', 2, 13)
      const len = N.length
      const D = t.array('d', [...N].map(Number), { label: 'digits of n' })
      const W = t.array('w', Array(len).fill(null), { label: `weight 10ⁱ mod ${M} (shown as the nearest residue, e.g. 10 ≡ −1 mod 11)` })
      const sgn = (w: number) => (w > M / 2 ? w - M : w)
      let s = 0
      let w = 1
      t.step('init', `Write n = ${N} as Σ dᵢ·10ⁱ. Mod ${M}, each 10ⁱ can be swapped for its remainder wᵢ — congruences survive sums and products — so n ≡ Σ dᵢ·wᵢ.`, { m: M, s, w })
      for (let i = len - 1; i >= 0; i--) {
        const d = N.charCodeAt(i) - 48
        const p = len - 1 - i
        D.clear().role(i, 'active')
        W.clear().set(i, sgn(w))
        W.role(i, 'write')
        s = (s + d * w) % M
        t.step('add', `Digit ${d} at 10^${p}: 10^${p} ≡ ${sgn(w)} (mod ${M}), so add ${d}·${sgn(w)}. Running sum mod ${M} = ${s}.`, { m: M, s, w })
        const nw = (w * 10) % M
        t.step('weight', `Next weight: 10^${p + 1} ≡ ${w}·10 = ${w * 10} ≡ ${sgn(nw)} (mod ${M}).${M === 3 || M === 9 ? ' For 3 and 9, 10 ≡ 1, so every weight is 1 — the digit-sum rule.' : M === 11 ? ' For 11, 10 ≡ −1: weights alternate +1, −1 — the alternating-sum rule.' : ''}`, { m: M, s, w: nw })
        w = nw
      }
      D.clear()
      W.clear()
      const exact = Number(BigInt(N) % BigInt(M))
      for (let i = 0; i < len; i++) D.role(i, s === 0 ? 'found' : 'removed')
      t.step('done', `Σ dᵢ·wᵢ ≡ ${s} (mod ${M}), and indeed ${N} mod ${M} = ${exact}. ${s === 0 ? `So ${M} divides ${N}.` : `So ${M} does not divide ${N}.`} Same remainder, computed from the digits alone.`, { m: M, s, 'n mod m': exact })
    }),
}

/* ───────────────────────── 4. Euclid's algorithm ───────────────────────── */

export const mathGcdEuclid: Algorithm = {
  id: 'math-gcd-euclid',
  title: 'Euclid’s algorithm — (a, b) → (b, a mod b) until b = 0',
  blurb: 'Every common divisor of a and b also divides a mod b = a − qb, and vice versa, so the gcd never changes while the numbers shrink fast.',
  legend: { active: 'current pair', write: 'q and r computed', found: 'gcd', compare: 'moves down a row' },
  inputs: [
    { name: 'a', label: 'a', type: 'number', default: '1071', min: 0, max: 1e15 },
    { name: 'b', label: 'b', type: 'number', default: '462', min: 0, max: 1e15 },
  ],
  random: () => {
    const fib = [1, 1]
    while (fib.length < 25) fib.push(fib[fib.length - 1] + fib[fib.length - 2])
    const k = rint(8, 16)
    if (Math.random() < 0.4) return { a: String(fib[k + 1]), b: String(fib[k]) }
    const g = rint(1, 30)
    return { a: String(g * rint(5, 200)), b: String(g * rint(5, 200)) }
  },
  code: {
    pseudo: `
function gcd(a, b)
  while b ≠ 0                     // @loop
    q ← ⌊a / b⌋; r ← a − q·b      // @mod
    (a, b) ← (b, r)               // @shift
  return a                        // @done`,
    cpp: `
long long gcd(long long a, long long b) {
    while (b != 0) {              // @loop
        long long r = a % b;      // @mod
        a = b; b = r;             // @shift
    }
    return a;                     // @done
}`,
    java: `
static long gcd(long a, long b) {
    while (b != 0) {              // @loop
        long r = a % b;           // @mod
        a = b; b = r;             // @shift
    }
    return a;                     // @done
}`,
    python: `
def gcd(a, b):
    while b:                      # @loop
        r = a % b                 # @mod
        a, b = b, r               # @shift
    return a                      # @done`,
    js: `
function gcd(a, b) {
  while (b !== 0) {               // @loop
    const r = a % b;              // @mod
    a = b; b = r;                 // @shift
  }
  return a;                       // @done
}`,
    c: `
long long gcd(long long a, long long b) {
    while (b != 0) {              // @loop
        long long r = a % b;      // @mod
        a = b; b = r;             // @shift
    }
    return a;                     // @done
}`,
  },
  run: ({ a, b }) =>
    trace((t) => {
      let A = int(a, 'a', 0, 1e15)
      let B = int(b, 'b', 0, 1e15)
      if (A === 0 && B === 0) throw new Error('gcd(0, 0) is undefined by convention 0 — pick at least one non-zero number.')
      const G = t.grid('rows', [], { label: 'one row per division: a = q·b + r', colLabels: ['a', 'b', 'q', 'r'] })
      const small = Math.min(A, B) || Math.max(A, B)
      const fib = [0, 1, 1]
      while (fib[fib.length - 1] <= small) fib.push(fib[fib.length - 1] + fib[fib.length - 2])
      // Lamé: k divisions with a > b ≥ 1 forces b ≥ F(k+1); so k ≤ (largest j with F(j) ≤ b) − 1
      let j = 1
      while (fib[j + 1] <= small) j++
      const lame = Math.max(1, j - 1) + (A < B ? 1 : 0)
      const M = t.meter('it', 'Divisions performed', [{ label: `Lamé bound for min = ${small}`, value: lame }])
      t.step('loop', `gcd(${A}, ${B}). Invariant: gcd(a, b) never changes, because any d dividing a and b divides r = a − q·b, and any d dividing b and r divides a = q·b + r.`, { a: A, b: B })
      while (B !== 0) {
        G.rows.push([A, B, null, null])
        const k = G.rows.length - 1
        G.clear().role(k, 0, 'active').role(k, 1, 'active')
        t.step('loop', `b = ${B} ≠ 0, so divide.`, { a: A, b: B })
        const q = Math.floor(A / B)
        const r = A - q * B
        G.set(k, 2, q)
        G.set(k, 3, r)
        G.role(k, 2, 'write').role(k, 3, 'write')
        M.add(1)
        t.step('mod', `${A} = ${q}·${B} + ${r}.${A < B ? ' (a < b: the first step just swaps them.)' : r < A / 2 ? ` r = ${r} < a/2 — remainders at least halve every two steps.` : ''}`, { a: A, b: B, q, r })
        if (r !== 0) {
          G.clear().arrow([k, 1], [k, 0], '', 'compare').arrow([k, 3], [k, 1], '', 'compare')
          G.role(k, 1, 'compare').role(k, 3, 'compare')
          t.step('shift', `The pair becomes (${B}, ${r}): b moves into a's place, r into b's. gcd(${A}, ${B}) = gcd(${B}, ${r}).`, { a: B, b: r })
        } else {
          t.step('shift', `r = 0: the pair becomes (${B}, 0), and gcd(${B}, 0) = ${B} because every number divides 0.`, { a: B, b: 0 })
        }
        A = B
        B = r
      }
      G.clear()
      if (G.rows.length) G.role(G.rows.length - 1, 1, 'found')
      M.role = 'done'
      t.step('done', `gcd = ${A}, the last non-zero remainder, after ${M.value} division${M.value === 1 ? '' : 's'}. Lamé: k divisions need b ≥ F(k+1), so at most ${lame} for these inputs — consecutive Fibonacci numbers hit that bound exactly.`, { gcd: A })
    }),
}

/* ───────────────────────── 5. Binary GCD (Stein) ───────────────────────── */

const bin = (x: number) => x.toString(2)
const ctz = (x: number) => {
  let c = 0
  while (x > 0 && x % 2 === 0) {
    x /= 2
    c++
  }
  return c
}

export const mathGcdBinary: Algorithm = {
  id: 'math-gcd-binary',
  title: 'Binary GCD (Stein) — shifts and subtractions only',
  blurb: 'Pull out the common power of two, then repeatedly strip trailing zeros and subtract the smaller odd number from the larger.',
  legend: { active: 'changed this step', found: 'answer' },
  inputs: [
    { name: 'a', label: 'a', type: 'number', default: '48', min: 0, max: 1000000 },
    { name: 'b', label: 'b', type: 'number', default: '180', min: 0, max: 1000000 },
  ],
  random: () => {
    const g = 2 ** rint(0, 4) * rint(1, 9)
    return { a: String(g * rint(1, 40)), b: String(g * rint(1, 40)) }
  },
  code: {
    pseudo: `
function binaryGcd(a, b)
  if a = 0 or b = 0: return a + b          // @zero
  k ← ctz(a | b)        // common factor 2^k  // @shift
  a ← a >> ctz(a)                           // @stripA
  repeat
    b ← b >> ctz(b)                         // @stripB
    if a > b: swap(a, b)                    // @swap
    b ← b − a                               // @sub
  until b = 0
  return a << k                             // @done`,
    cpp: `
unsigned long long binaryGcd(unsigned long long a, unsigned long long b) {
    if (a == 0 || b == 0) return a + b;                 // @zero
    int k = __builtin_ctzll(a | b);                     // @shift
    a >>= __builtin_ctzll(a);                           // @stripA
    do {
        b >>= __builtin_ctzll(b);                       // @stripB
        if (a > b) swap(a, b);                          // @swap
        b -= a;                                         // @sub
    } while (b != 0);
    return a << k;                                      // @done
}`,
    java: `
static long binaryGcd(long a, long b) {                 // a, b >= 0
    if (a == 0 || b == 0) return a + b;                 // @zero
    int k = Long.numberOfTrailingZeros(a | b);          // @shift
    a >>= Long.numberOfTrailingZeros(a);                // @stripA
    do {
        b >>= Long.numberOfTrailingZeros(b);            // @stripB
        if (a > b) { long t = a; a = b; b = t; }        // @swap
        b -= a;                                         // @sub
    } while (b != 0);
    return a << k;                                      // @done
}`,
    python: `
def binary_gcd(a, b):
    if a == 0 or b == 0: return a + b                   # @zero
    ctz = lambda x: (x & -x).bit_length() - 1
    k = ctz(a | b)                                      # @shift
    a >>= ctz(a)                                        # @stripA
    while True:
        b >>= ctz(b)                                    # @stripB
        if a > b: a, b = b, a                           # @swap
        b -= a                                          # @sub
        if b == 0: break
    return a << k                                       # @done`,
    js: `
// numbers up to 2^31 (bitwise ops are 32-bit); use BigInt beyond
function binaryGcd(a, b) {
  if (a === 0 || b === 0) return a + b;                 // @zero
  const ctz = (x) => 31 - Math.clz32(x & -x);
  const k = ctz(a | b);                                 // @shift
  a >>>= ctz(a);                                        // @stripA
  do {
    b >>>= ctz(b);                                      // @stripB
    if (a > b) [a, b] = [b, a];                         // @swap
    b -= a;                                             // @sub
  } while (b !== 0);
  return a * 2 ** k;                                    // @done
}`,
    c: `
unsigned long long binary_gcd(unsigned long long a, unsigned long long b) {
    if (a == 0 || b == 0) return a + b;                 // @zero
    int k = __builtin_ctzll(a | b);                     // @shift
    a >>= __builtin_ctzll(a);                           // @stripA
    do {
        b >>= __builtin_ctzll(b);                       // @stripB
        if (a > b) { unsigned long long t = a; a = b; b = t; }   // @swap
        b -= a;                                         // @sub
    } while (b != 0);
    return a << k;                                      // @done
}`,
  },
  run: ({ a, b }) =>
    trace((t) => {
      let A = int(a, 'a', 0, 1000000)
      let B = int(b, 'b', 0, 1000000)
      const G = t.grid('rows', [], { label: 'state after each step', colLabels: ['step', 'a', 'b', 'a in binary', 'b in binary'] })
      const row = (what: string) => {
        G.rows.push([what, A, B, bin(A), bin(B)])
        G.clear()
        const k = G.rows.length - 1
        for (let c = 0; c < 5; c++) G.role(k, c, 'active')
      }
      if (A === 0 || B === 0) {
        row('zero')
        t.step('zero', `One argument is 0, and gcd(x, 0) = x: the answer is ${A + B}.`, { gcd: A + B })
        return
      }
      const k = ctz(A | B)
      row('start')
      t.step('shift', `a | b = ${bin(A | B)} ends in ${k} zero${k === 1 ? '' : 's'}: 2^${k} divides both, and that power of two is part of the gcd. Set it aside as k = ${k}.`, { k })
      const s = ctz(A)
      A = A / 2 ** s
      row(`a >> ${s}`)
      t.step('stripA', `Remove a's ${s} trailing zero${s === 1 ? '' : 's'}: a = ${A} is now odd. Dropping a factor 2 from one number keeps the gcd, because the other number will be odd, so 2 is not a common factor any more.`, { k, a: A, b: B })
      for (;;) {
        const sb = ctz(B)
        if (sb) {
          B = B / 2 ** sb
          row(`b >> ${sb}`)
          t.step('stripB', `b has ${sb} trailing zero${sb === 1 ? '' : 's'}; a is odd, so gcd(a, b) = gcd(a, b/2^${sb}). b = ${B}.`, { k, a: A, b: B })
        } else {
          t.step('stripB', `b = ${B} is already odd.`, { k, a: A, b: B })
        }
        if (A > B) {
          ;[A, B] = [B, A]
          row('swap')
          t.step('swap', `Keep a ≤ b: swap, so a = ${A}, b = ${B}.`, { k, a: A, b: B })
        } else {
          t.step('swap', `a = ${A} ≤ b = ${B}: no swap.`, { k, a: A, b: B })
        }
        B -= A
        row('b − a')
        t.step('sub', `gcd(a, b) = gcd(a, b − a). Both were odd, so b − a = ${B} is even${B ? ' — the next strip removes at least one bit' : ''}.`, { k, a: A, b: B })
        if (B === 0) break
      }
      const g = A * 2 ** k
      G.clear()
      G.role(G.rows.length - 1, 1, 'found')
      t.step('done', `b = 0, so the odd part of the gcd is a = ${A}. Put the 2^${k} back: gcd = ${A}·${2 ** k} = ${g}. Each round removes at least one bit from b, so the loop runs O(log a + log b) times.`, { gcd: g })
    }),
}

/* ───────────────────────── 6. GCD of an array ───────────────────────── */

export const mathGcdArray: Algorithm = {
  id: 'math-gcd-array',
  title: 'GCD of an array — fold left, stop at 1',
  blurb: 'gcd(a₁, …, aₙ) = gcd(gcd(a₁, …, aₙ₋₁), aₙ). Start from 0, the identity: gcd(0, x) = x.',
  legend: { active: 'element being folded in', done: 'already folded', dim: 'never needed' },
  inputs: [{ name: 'arr', label: 'Values', type: 'array', default: '84 126 210 35 99 60', maxLen: 10 }],
  random: () => {
    const g = rint(1, 12)
    return { arr: list(Array.from({ length: rint(4, 8) }, () => g * rint(1, 30))) }
  },
  code: {
    pseudo: `
function gcdAll(a)
  g ← 0                          // @init
  for x in a
    g ← gcd(g, x)                // @fold
    if g = 1: break              // @stop
  return g                       // @done`,
    cpp: `
long long gcdAll(const vector<long long>& a) {
    long long g = 0;                         // @init
    for (long long x : a) {
        g = std::gcd(g, x);                  // @fold
        if (g == 1) break;                   // @stop
    }
    return g;                                // @done
}`,
    java: `
static long gcdAll(long[] a) {
    long g = 0;                              // @init
    for (long x : a) {
        g = gcd(g, x);                       // @fold
        if (g == 1) break;                   // @stop
    }
    return g;                                // @done
}`,
    python: `
from math import gcd
def gcd_all(a):
    g = 0                                    # @init
    for x in a:
        g = gcd(g, x)                        # @fold
        if g == 1: break                     # @stop
    return g                                 # @done`,
    js: `
function gcdAll(a) {
  let g = 0;                                 // @init
  for (const x of a) {
    g = gcd(g, x);                           // @fold
    if (g === 1) break;                      // @stop
  }
  return g;                                  // @done
}`,
    c: `
long long gcd_all(const long long *a, int n) {
    long long g = 0;                         // @init
    for (int i = 0; i < n; i++) {
        g = gcd(g, a[i]);                    // @fold
        if (g == 1) break;                   // @stop
    }
    return g;                                // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const a = (arr as number[]).map((x) => int(x, 'Each value', 0, 1e9))
      if (!a.length) throw new Error('Give at least one value.')
      const A = t.array('a', a, { label: 'a' })
      let g = 0
      t.step('init', 'Start with g = 0: gcd(0, x) = x, so 0 is the neutral element and the first fold just copies a[0].', { g })
      let i = 0
      for (; i < a.length; i++) {
        A.clear()
        for (let j = 0; j < i; j++) A.role(j, 'done')
        A.role(i, 'active').ptr('i', i)
        const ng = gcdN(g, a[i])
        t.step('fold', `g = gcd(${g}, ${a[i]}) = ${ng}.${ng < g ? ` It dropped: ${a[i]} is not a multiple of ${g}.` : g ? ` ${a[i]} is a multiple of ${g}, so g stays.` : ''}`, { g: ng, i })
        g = ng
        if (g === 1) {
          A.role(i, 'done')
          for (let j = i + 1; j < a.length; j++) A.role(j, 'dim')
          t.step('stop', 'g = 1 and gcd(1, x) = 1 for every x — nothing later can change it, so stop early.', { g, i })
          break
        }
      }
      A.clear().ptr('i', null)
      for (let j = 0; j < Math.min(i + 1, a.length); j++) A.role(j, 'done')
      for (let j = i + 1; j < a.length; j++) A.role(j, 'dim')
      t.step('done', `gcd of the array = ${g}. The value only ever decreases (it divides the previous one), so it changes at most log₂(a[0]) times; total cost O(n + log max).`, { g })
    }),
}

/* ───────────────────────── 7. Extended Euclid — the table ───────────────────────── */

export const mathExtTable: Algorithm = {
  id: 'math-ext-table',
  title: 'Extended Euclid as a table — every row keeps r = s·a + t·b',
  blurb: 'Run Euclid on the remainders and apply the same update to the coefficients s and t. The row with the last non-zero r holds the Bézout pair.',
  legend: { active: 'row being built', compare: 'the two rows it comes from', write: 'quotient q', found: 'gcd and Bézout coefficients' },
  inputs: [
    { name: 'a', label: 'a', type: 'number', default: '240', min: 1, max: 1000000 },
    { name: 'b', label: 'b', type: 'number', default: '46', min: 1, max: 1000000 },
  ],
  random: () => ({ a: String(rint(30, 500)), b: String(rint(10, 300)) }),
  code: {
    pseudo: `
function extGcd(a, b)
  (r0, s0, t0) ← (a, 1, 0); (r1, s1, t1) ← (b, 0, 1)   // @init
  while r1 ≠ 0
    q ← ⌊r0 / r1⌋                                     // @quot
    (r0, r1) ← (r1, r0 − q·r1)                         // @row
    (s0, s1) ← (s1, s0 − q·s1); (t0, t1) ← (t1, t0 − q·t1)
  return (r0, s0, t0)        // r0 = gcd = s0·a + t0·b  // @done`,
    cpp: `
// returns g = gcd(a, b) and sets x, y with a*x + b*y = g
long long extGcd(long long a, long long b, long long& x, long long& y) {
    long long r0 = a, r1 = b, s0 = 1, s1 = 0, t0 = 0, t1 = 1;   // @init
    while (r1 != 0) {
        long long q = r0 / r1;                                 // @quot
        long long r2 = r0 - q * r1; r0 = r1; r1 = r2;          // @row
        long long s2 = s0 - q * s1; s0 = s1; s1 = s2;
        long long t2 = t0 - q * t1; t0 = t1; t1 = t2;
    }
    x = s0; y = t0;
    return r0;                                                 // @done
}`,
    java: `
// returns {g, x, y} with a*x + b*y = g
static long[] extGcd(long a, long b) {
    long r0 = a, r1 = b, s0 = 1, s1 = 0, t0 = 0, t1 = 1;       // @init
    while (r1 != 0) {
        long q = r0 / r1;                                      // @quot
        long r2 = r0 - q * r1; r0 = r1; r1 = r2;               // @row
        long s2 = s0 - q * s1; s0 = s1; s1 = s2;
        long t2 = t0 - q * t1; t0 = t1; t1 = t2;
    }
    return new long[] {r0, s0, t0};                            // @done
}`,
    python: `
def ext_gcd(a, b):
    r0, s0, t0, r1, s1, t1 = a, 1, 0, b, 0, 1                  # @init
    while r1:
        q = r0 // r1                                           # @quot
        r0, r1 = r1, r0 - q * r1                               # @row
        s0, s1 = s1, s0 - q * s1
        t0, t1 = t1, t0 - q * t1
    return r0, s0, t0          # gcd, x, y                     # @done`,
    js: `
function extGcd(a, b) {
  let r0 = a, r1 = b, s0 = 1, s1 = 0, t0 = 0, t1 = 1;          // @init
  while (r1 !== 0) {
    const q = Math.floor(r0 / r1);                             // @quot
    [r0, r1] = [r1, r0 - q * r1];                              // @row
    [s0, s1] = [s1, s0 - q * s1];
    [t0, t1] = [t1, t0 - q * t1];
  }
  return [r0, s0, t0];                                         // @done
}`,
    c: `
long long ext_gcd(long long a, long long b, long long *x, long long *y) {
    long long r0 = a, r1 = b, s0 = 1, s1 = 0, t0 = 0, t1 = 1;   // @init
    while (r1 != 0) {
        long long q = r0 / r1;                                 // @quot
        long long r2 = r0 - q * r1; r0 = r1; r1 = r2;          // @row
        long long s2 = s0 - q * s1; s0 = s1; s1 = s2;
        long long t2 = t0 - q * t1; t0 = t1; t1 = t2;
    }
    *x = s0; *y = t0;
    return r0;                                                 // @done
}`,
  },
  run: ({ a, b }) =>
    trace((t) => {
      const A = int(a, 'a', 1, 1000000)
      const B = int(b, 'b', 1, 1000000)
      const G = t.grid('tab', [], { label: `rows i: r = s·${A} + t·${B}`, colLabels: ['i', 'q', 'r', 's', 't', `s·${A} + t·${B}`] })
      G.rows.push([0, null, A, 1, 0, A])
      G.rows.push([1, null, B, 0, 1, B])
      for (let c = 2; c <= 4; c++) G.role(0, c, 'active').role(1, c, 'active')
      t.step('init', `Row 0: ${A} = 1·${A} + 0·${B}. Row 1: ${B} = 0·${A} + 1·${B}. Both satisfy r = s·a + t·b — the invariant every new row will keep.`, { a: A, b: B })
      let i = 1
      for (;;) {
        const r0 = G.rows[i - 1][2] as number
        const r1 = G.rows[i][2] as number
        if (r1 === 0) break
        const q = Math.floor(r0 / r1)
        G.clear().set(i, 1, q)
        G.role(i, 1, 'write').role(i - 1, 2, 'compare').role(i, 2, 'compare')
        t.step('quot', `q${i} = ⌊${r0} / ${r1}⌋ = ${q}.`, { q })
        const [s0, t0] = [G.rows[i - 1][3] as number, G.rows[i - 1][4] as number]
        const [s1, t1] = [G.rows[i][3] as number, G.rows[i][4] as number]
        const nr = r0 - q * r1
        const ns = s0 - q * s1
        const nt = t0 - q * t1
        G.rows.push([i + 1, null, nr, ns, nt, ns * A + nt * B])
        G.clear()
        for (let c = 2; c <= 5; c++) G.role(i + 1, c, 'active')
        G.role(i - 1, 3, 'compare').role(i, 3, 'compare').role(i, 1, 'write')
        G.arrow([i - 1, 2], [i + 1, 2], '', 'compare').arrow([i, 2], [i + 1, 2], `−${q}×`, 'compare')
        G.arrow([i, 3], [i + 1, 3], `−${q}×`, 'compare')
        t.step('row', `Row ${i + 1} = row ${i - 1} − ${q}·row ${i}: r = ${r0} − ${q}·${r1} = ${nr}, s = ${s0} − ${q}·(${s1}) = ${ns}, t = ${t0} − ${q}·(${t1}) = ${nt}. Subtracting two rows that satisfy r = s·a + t·b gives another one: ${ns}·${A} + ${nt}·${B} = ${ns * A + nt * B}.`, { q, r: nr, s: ns, t: nt })
        i++
      }
      G.clear()
      for (let c = 2; c <= 5; c++) G.role(i - 1, c, 'found')
      const g = G.rows[i - 1][2] as number
      const x = G.rows[i - 1][3] as number
      const y = G.rows[i - 1][4] as number
      t.step('done', `r hit 0, so gcd = ${g} (row ${i - 1}, the last non-zero r) and ${A}·(${x}) + ${B}·(${y}) = ${g}. Bézout's coefficients come for free.`, { gcd: g, x, y })
    }),
}

/* ───────────────────────── 8. Extended Euclid — recursion and back-substitution ───────────────────────── */

export const mathExtRecursive: Algorithm = {
  id: 'math-ext-recursive',
  title: 'Recursive extended Euclid — coefficients built on the way back up',
  blurb: 'If b·x₁ + (a mod b)·y₁ = g, then a·y₁ + b·(x₁ − ⌊a/b⌋·y₁) = g. The base case gcd(g, 0) = g·1 + 0·0 starts it.',
  legend: { active: 'call in progress', done: 'returned (x, y) shown below', found: 'base case' },
  inputs: [
    { name: 'a', label: 'a', type: 'number', default: '99', min: 0, max: 1000000 },
    { name: 'b', label: 'b', type: 'number', default: '78', min: 0, max: 1000000 },
  ],
  random: () => ({ a: String(rint(20, 300)), b: String(rint(5, 200)) }),
  code: {
    pseudo: `
function extGcd(a, b)                       // returns (g, x, y), a·x + b·y = g
  if b = 0: return (a, 1, 0)                // @base
  (g, x1, y1) ← extGcd(b, a mod b)          // @call
  return (g, y1, x1 − ⌊a/b⌋·y1)             // @back`,
    cpp: `
long long extGcd(long long a, long long b, long long& x, long long& y) {
    if (b == 0) { x = 1; y = 0; return a; }          // @base
    long long x1, y1;
    long long g = extGcd(b, a % b, x1, y1);          // @call
    x = y1; y = x1 - (a / b) * y1;                   // @back
    return g;
}`,
    java: `
// returns {g, x, y}
static long[] extGcd(long a, long b) {
    if (b == 0) return new long[] {a, 1, 0};         // @base
    long[] r = extGcd(b, a % b);                     // @call
    return new long[] {r[0], r[2], r[1] - (a / b) * r[2]};   // @back
}`,
    python: `
def ext_gcd(a, b):
    if b == 0: return a, 1, 0                        # @base
    g, x1, y1 = ext_gcd(b, a % b)                    # @call
    return g, y1, x1 - (a // b) * y1                 # @back`,
    js: `
function extGcd(a, b) {
  if (b === 0) return [a, 1, 0];                     // @base
  const [g, x1, y1] = extGcd(b, a % b);              // @call
  return [g, y1, x1 - Math.floor(a / b) * y1];       // @back
}`,
    c: `
long long ext_gcd(long long a, long long b, long long *x, long long *y) {
    if (b == 0) { *x = 1; *y = 0; return a; }        // @base
    long long x1, y1;
    long long g = ext_gcd(b, a % b, &x1, &y1);       // @call
    *x = y1; *y = x1 - (a / b) * y1;                 // @back
    return g;
}`,
  },
  run: ({ a, b }) =>
    trace((t) => {
      const A0 = int(a, 'a', 0, 1000000)
      const B0 = int(b, 'b', 0, 1000000)
      if (A0 === 0 && B0 === 0) throw new Error('Pick at least one non-zero number.')
      const T = t.tree('calls', { label: 'calls (each child is the recursive call)' })
      const S = t.stack('cs', 'call stack')
      const go = (A: number, B: number, parent: string | null): [number, number, number] => {
        const id = T.node(`(${A}, ${B})`)
        if (parent) T.addChild(parent, id)
        else T.setRoot(id)
        S.push(`extGcd(${A}, ${B})`)
        T.role(id, 'active')
        if (B === 0) {
          T.role(id, 'found').note(id, 'x=1, y=0')
          t.step('base', `b = 0: gcd(${A}, 0) = ${A} = ${A}·1 + 0·0. Return (g, x, y) = (${A}, 1, 0).`, { a: A, b: B, g: A, x: 1, y: 0 })
          S.pop()
          return [A, 1, 0]
        }
        t.step('call', `extGcd(${A}, ${B}): ${A} = ${Math.floor(A / B)}·${B} + ${A % B}. First solve the smaller pair (${B}, ${A % B}).`, { a: A, b: B })
        const [g, x1, y1] = go(B, A % B, id)
        const q = Math.floor(A / B)
        const x = y1
        const y = x1 - q * y1
        S.pop()
        T.role(id, 'done').note(id, `x=${x}, y=${y}`)
        t.step('back', `Child gave ${B}·(${x1}) + ${A % B}·(${y1}) = ${g}. Substitute ${A % B} = ${A} − ${q}·${B}: ${A}·(${y1}) + ${B}·(${x1} − ${q}·${y1}) = ${A}·(${x}) + ${B}·(${y}) = ${A * x + B * y}.`, { a: A, b: B, g, x, y })
        return [g, x, y]
      }
      const [g, x, y] = go(A0, B0, null)
      t.step('back', `Done: gcd(${A0}, ${B0}) = ${g} = ${A0}·(${x}) + ${B0}·(${y}). Depth equals the number of Euclid steps, O(log min(a, b)).`, { g, x, y })
    }),
}

/* ───────────────────────── 9. Linear Diophantine equations ───────────────────────── */

export const mathExtDioph: Algorithm = {
  id: 'math-ext-dioph',
  title: 'ax + by = c — one solution, then the whole family',
  blurb: 'Solvable iff gcd(a, b) | c. Scale the Bézout pair by c/g, then walk x by b/g and y by −a/g. Here we count the solutions with x, y ≥ 0.',
  legend: { found: 'x ≥ 0 and y ≥ 0', dim: 'one of them negative', active: 'particular solution' },
  inputs: [
    { name: 'a', label: 'a', type: 'number', default: '4', min: 1, max: 100 },
    { name: 'b', label: 'b', type: 'number', default: '6', min: 1, max: 100 },
    { name: 'c', label: 'c', type: 'number', default: '50', min: 0, max: 500 },
  ],
  random: () => ({ a: String(rint(2, 12)), b: String(rint(2, 12)), c: String(rint(10, 120)) }),
  code: {
    pseudo: `
function countNonNeg(a, b, c)                 // a, b > 0, c ≥ 0
  (g, x', y') ← extGcd(a, b)                  // @ext
  if c mod g ≠ 0: return 0                    // @check
  x0 ← x'·(c/g); y0 ← y'·(c/g)                // @scale
  // all solutions: x = x0 + k·(b/g), y = y0 − k·(a/g)
  kLo ← ⌈−x0 / (b/g)⌉; kHi ← ⌊y0 / (a/g)⌋     // @range
  return max(0, kHi − kLo + 1)                // @done`,
    cpp: `
long long floorDiv(long long a, long long b) { return a / b - ((a % b != 0) && ((a < 0) != (b < 0))); }
long long ceilDiv(long long a, long long b) { return -floorDiv(-a, b); }
long long countNonNeg(long long a, long long b, long long c) {
    long long x, y, g = extGcd(a, b, x, y);              // @ext
    if (c % g != 0) return 0;                            // @check
    long long x0 = x * (c / g), y0 = y * (c / g);        // @scale
    long long kLo = ceilDiv(-x0, b / g), kHi = floorDiv(y0, a / g);   // @range
    return max(0LL, kHi - kLo + 1);                      // @done
}`,
    java: `
static long countNonNeg(long a, long b, long c) {
    long[] e = extGcd(a, b); long g = e[0];              // @ext
    if (c % g != 0) return 0;                            // @check
    long x0 = e[1] * (c / g), y0 = e[2] * (c / g);       // @scale
    long kLo = -Math.floorDiv(x0, b / g), kHi = Math.floorDiv(y0, a / g);   // @range
    return Math.max(0, kHi - kLo + 1);                   // @done
}`,
    python: `
def count_non_neg(a, b, c):
    g, x, y = ext_gcd(a, b)                              # @ext
    if c % g: return 0                                   # @check
    x0, y0 = x * (c // g), y * (c // g)                  # @scale
    k_lo, k_hi = -(x0 // (b // g)), y0 // (a // g)       # @range
    return max(0, k_hi - k_lo + 1)                       # @done`,
    js: `
function countNonNeg(a, b, c) {
  const [g, x, y] = extGcd(a, b);                        // @ext
  if (c % g !== 0) return 0;                             // @check
  const x0 = x * (c / g), y0 = y * (c / g);              // @scale
  const kLo = -Math.floor(x0 / (b / g)), kHi = Math.floor(y0 / (a / g));   // @range
  return Math.max(0, kHi - kLo + 1);                     // @done
}`,
    c: `
long long floor_div(long long a, long long b) { return a / b - ((a % b != 0) && ((a < 0) != (b < 0))); }
long long count_non_neg(long long a, long long b, long long c) {
    long long x, y, g = ext_gcd(a, b, &x, &y);           // @ext
    if (c % g != 0) return 0;                            // @check
    long long x0 = x * (c / g), y0 = y * (c / g);        // @scale
    long long k_lo = -floor_div(x0, b / g), k_hi = floor_div(y0, a / g);   // @range
    long long n = k_hi - k_lo + 1;
    return n > 0 ? n : 0;                                // @done
}`,
  },
  run: ({ a, b, c }) =>
    trace((t) => {
      const A = int(a, 'a', 1, 100)
      const B = int(b, 'b', 1, 100)
      const C = int(c, 'c', 0, 500)
      let [r0, r1, s0, s1, t0, t1] = [A, B, 1, 0, 0, 1]
      while (r1) {
        const q = Math.floor(r0 / r1)
        ;[r0, r1] = [r1, r0 - q * r1]
        ;[s0, s1] = [s1, s0 - q * s1]
        ;[t0, t1] = [t1, t0 - q * t1]
      }
      const g = r0
      const G = t.grid('sol', [], { label: `solutions of ${A}x + ${B}y = ${C}`, colLabels: ['k', 'x', 'y', `${A}x + ${B}y`] })
      t.step('ext', `Extended Euclid: gcd(${A}, ${B}) = ${g} = ${A}·(${s0}) + ${B}·(${t0}).`, { g, "x'": s0, "y'": t0 })
      if (C % g) {
        t.step('check', `${g} does not divide ${C}. Every ${A}x + ${B}y is a multiple of ${g}, so no integer solution exists.`, { g, c: C })
        return
      }
      t.step('check', `${g} divides ${C}, so solutions exist.`, { g, c: C })
      const x0 = s0 * (C / g)
      const y0 = t0 * (C / g)
      const dx = B / g
      const dy = A / g
      t.step('scale', `Multiply the Bézout identity by ${C}/${g} = ${C / g}: x₀ = ${x0}, y₀ = ${y0}, and ${A}·(${x0}) + ${B}·(${y0}) = ${A * x0 + B * y0}.`, { x0, y0 })
      const kLo = Math.ceil(-x0 / dx)
      const kHi = Math.floor(y0 / dy)
      t.step('range', `All solutions: x = ${x0} + ${dx}k, y = ${y0} − ${dy}k (the steps ${dx} = b/g and ${dy} = a/g keep ${A}·${dx} − ${B}·${dy} = 0). x ≥ 0 ⇔ k ≥ ⌈${-x0}/${dx}⌉ = ${kLo}; y ≥ 0 ⇔ k ≤ ⌊${y0}/${dy}⌋ = ${kHi}.`, { kLo, kHi })
      let from = kLo - 1
      let to = kHi + 1
      if (to - from > 9) {
        from = kLo - 1
        to = from + 9
      }
      if (from > to) [from, to] = [kHi - 1, kLo + 1]
      for (let k = from; k <= to; k++) {
        const x = x0 + dx * k
        const y = y0 - dy * k
        G.rows.push([k, x, y, A * x + B * y])
        const i = G.rows.length - 1
        G.clear()
        const ok = x >= 0 && y >= 0
        for (let col = 0; col < 4; col++) G.role(i, col, ok ? 'found' : 'dim')
        t.step('range', `k = ${k}: (x, y) = (${x}, ${y}) — ${ok ? 'both non-negative, counts.' : x < 0 ? 'x < 0, outside.' : 'y < 0, outside.'}`, { k, x, y })
      }
      const n = Math.max(0, kHi - kLo + 1)
      G.clear()
      G.rows.forEach((r, i) => {
        if ((r[1] as number) >= 0 && (r[2] as number) >= 0) for (let col = 0; col < 4; col++) G.role(i, col, 'found')
      })
      t.step('done', `${n} solution${n === 1 ? '' : 's'} with x, y ≥ 0 (k from ${kLo} to ${kHi}). The smallest non-negative x is ((x₀ mod ${dx}) + ${dx}) mod ${dx} = ${(((x0 % dx) + dx) % dx)}.`, { count: n })
    }),
}

/* ───────────────────────── 10. Trial division primality ───────────────────────── */

export const mathPrimeTrial: Algorithm = {
  id: 'math-prime-trial',
  title: 'Is n prime? Trial division up to √n',
  blurb: 'If n = d·e with d ≤ e then d ≤ √n. So if no d in 2…⌊√n⌋ divides n, n is prime.',
  legend: { active: 'divisor being tried', removed: 'does not divide', found: 'divides n', dim: 'never tried' },
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '221', min: 2, max: 1000 }],
  random: () => ({ n: String([97, 221, 323, 391, 437, 541, 667, 899, 961, 997][rint(0, 9)]) }),
  code: {
    pseudo: `
function isPrime(n)
  if n < 2: return false
  for d ← 2 while d·d ≤ n            // @test
    if n mod d = 0: return false     // @found
  return true                        // @prime`,
    cpp: `
bool isPrime(long long n) {
    if (n < 2) return false;
    for (long long d = 2; d * d <= n; d++)     // @test
        if (n % d == 0) return false;          // @found
    return true;                               // @prime
}`,
    java: `
static boolean isPrime(long n) {
    if (n < 2) return false;
    for (long d = 2; d * d <= n; d++)          // @test
        if (n % d == 0) return false;          // @found
    return true;                               // @prime
}`,
    python: `
def is_prime(n):
    if n < 2: return False
    d = 2
    while d * d <= n:                          # @test
        if n % d == 0: return False            # @found
        d += 1
    return True                                # @prime`,
    js: `
function isPrime(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++)             // @test
    if (n % d === 0) return false;             // @found
  return true;                                 // @prime
}`,
    c: `
int is_prime(long long n) {
    if (n < 2) return 0;
    for (long long d = 2; d * d <= n; d++)     // @test
        if (n % d == 0) return 0;              // @found
    return 1;                                  // @prime
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = int(n, 'n', 2, 1000)
      const lim = Math.floor(Math.sqrt(N))
      const ds = Array.from({ length: Math.max(0, lim - 1) }, (_, i) => i + 2)
      const D = t.array('d', ds.length ? ds : ['—'], { label: `candidate divisors 2 … ⌊√${N}⌋ = ${lim}` })
      const M = t.meter('ops', 'Divisions tried', [{ label: `√n ≈ ${Math.sqrt(N).toFixed(1)}`, value: Math.sqrt(N) }, { label: 'n − 2 (naive loop)', value: N - 2 }])
      if (!ds.length) {
        t.step('prime', `⌊√${N}⌋ = ${lim} < 2: there is nothing to try, so ${N} is prime.`, { n: N })
        return
      }
      t.step('test', `Test d = 2, 3, … while d·d ≤ ${N}. Why stop at √n: if ${N} = d·e with 2 ≤ d ≤ e, then d·d ≤ d·e = ${N}, so the smaller factor is at most ${lim}.`, { n: N })
      for (let i = 0; i < ds.length; i++) {
        const d = ds[i]
        D.role(i, 'active').ptr('d', i)
        M.add(1)
        if (N % d === 0) {
          D.role(i, 'found')
          for (let j = i + 1; j < ds.length; j++) D.role(j, 'dim')
          M.role = 'done'
          t.step('found', `${N} mod ${d} = 0: ${N} = ${d}·${N / d}. Composite, found after ${M.value} division${M.value === 1 ? '' : 's'}.`, { n: N, d, 'n mod d': 0 })
          return
        }
        t.step('test', `${N} mod ${d} = ${N % d} ≠ 0, so ${d} is not a divisor.`, { n: N, d, 'n mod d': N % d })
        D.role(i, 'removed')
      }
      D.ptr('d', null)
      M.role = 'done'
      t.step('prime', `Next d = ${lim + 1} has d·d = ${(lim + 1) ** 2} > ${N}: stop. No divisor ≤ √${N}, so no divisor at all — ${N} is prime. ${M.value} divisions instead of ${N - 2}.`, { n: N })
    }),
}

/* ───────────────────────── 11. Factorisation by trial division ───────────────────────── */

export const mathPrimeFactor: Algorithm = {
  id: 'math-prime-factor',
  title: 'Prime factorisation by trial division',
  blurb: 'Divide out each d completely before moving on — then every d that divides is automatically prime. Whatever is left above 1 at the end is one last prime.',
  legend: { new: 'factor just found', active: 'n shrinking' },
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '360', min: 2, max: 1000000000 }],
  random: () => ({ n: String([360, 1001, 9240, 97 * 89, 2 ** 6 * 3 * 101, 600851, 999983, 65536][rint(0, 7)]) }),
  code: {
    pseudo: `
function factorize(n)
  for d ← 2 while d·d ≤ n                 // @test
    while n mod d = 0
      record d; n ← n / d                 // @divide
  if n > 1: record n                      // @left
  // the recorded list is the factorisation   @done`,
    cpp: `
vector<long long> factorize(long long n) {
    vector<long long> f;
    for (long long d = 2; d * d <= n; d++)         // @test
        while (n % d == 0) {
            f.push_back(d); n /= d;                // @divide
        }
    if (n > 1) f.push_back(n);                     // @left
    return f;                                      // @done
}`,
    java: `
static List<Long> factorize(long n) {
    List<Long> f = new ArrayList<>();
    for (long d = 2; d * d <= n; d++)              // @test
        while (n % d == 0) {
            f.add(d); n /= d;                      // @divide
        }
    if (n > 1) f.add(n);                           // @left
    return f;                                      // @done
}`,
    python: `
def factorize(n):
    f, d = [], 2
    while d * d <= n:                              # @test
        while n % d == 0:
            f.append(d); n //= d                   # @divide
        d += 1
    if n > 1: f.append(n)                          # @left
    return f                                       # @done`,
    js: `
function factorize(n) {
  const f = [];
  for (let d = 2; d * d <= n; d++)                 // @test
    while (n % d === 0) {
      f.push(d); n /= d;                           // @divide
    }
  if (n > 1) f.push(n);                            // @left
  return f;                                        // @done
}`,
    c: `
/* writes the prime factors of n into f (at most 64 of them); returns how many */
int factorize(long long n, long long *f) {
    int k = 0;
    for (long long d = 2; d * d <= n; d++)         // @test
        while (n % d == 0) {
            f[k++] = d; n /= d;                    // @divide
        }
    if (n > 1) f[k++] = n;                         // @left
    return k;                                      // @done
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N0 = int(n, 'n', 2, 1000000000)
      let N = N0
      const F = t.array('f', [], { label: 'prime factors found' })
      const M = t.meter('ops', 'Divisions tried', [{ label: `√n₀ ≈ ${Math.floor(Math.sqrt(N0))}`, value: Math.floor(Math.sqrt(N0)) }])
      let shown = 0
      t.step('test', `Factor ${N0}. Try d = 2, 3, 4, … while d·d ≤ n — and n shrinks as factors come out, so the bound shrinks too.`, { n: N })
      let d = 2
      for (; d * d <= N; d++) {
        M.add(1)
        F.clear()
        if (N % d !== 0) {
          if (shown < 25) t.step('test', `${d}·${d} = ${d * d} ≤ ${N}; ${N} mod ${d} = ${N % d}, not a factor.${d === 4 || d === 6 || d === 9 ? ` (${d} cannot divide: its prime factors were already removed.)` : ''}`, { n: N, d })
          shown++
          continue
        }
        while (N % d === 0) {
          N /= d
          F.push(d)
          F.clear().role(F.length - 1, 'new')
          t.step('divide', `${d} divides: record ${d}, n = ${N}.`, { n: N, d })
        }
      }
      F.clear()
      if (N > 1) {
        F.push(N)
        F.role(F.length - 1, 'new')
        t.step('left', `Next d = ${d} has d·d = ${d * d} > n = ${N}. n has no divisor ≤ √n, so the leftover ${N} is prime: record it.`, { n: N, d })
      } else {
        t.step('left', `n = 1: everything has been divided out.`, { n: N, d })
      }
      F.clear()
      M.role = 'done'
      const vals = F.values() as number[]
      const parts: string[] = []
      for (let i = 0; i < vals.length; ) {
        let j = i
        while (j < vals.length && vals[j] === vals[i]) j++
        parts.push(j - i > 1 ? `${vals[i]}^${j - i}` : String(vals[i]))
        i = j
      }
      t.step('done', `${N0} = ${parts.join(' · ')}. ${M.value} trial divisions — at most √n of them, O(√n) time.`, { n: N0 })
    }),
}

/* ───────────────────────── 12. Miller–Rabin ───────────────────────── */

const powmod = (a: bigint, e: bigint, m: bigint) => {
  let r = 1n
  a %= m
  while (e > 0n) {
    if (e & 1n) r = (r * a) % m
    a = (a * a) % m
    e >>= 1n
  }
  return r
}

export const mathPrimeMr: Algorithm = {
  id: 'math-prime-mr',
  title: 'Miller–Rabin — the squaring chain a^d, a^2d, …, a^(n−1)',
  blurb: 'Write n − 1 = d·2^s with d odd. For a prime n the chain must start at 1 or pass through n − 1. A base whose chain does neither is a witness: n is composite.',
  legend: { active: 'current value', found: 'hit 1 or n − 1: base passes', removed: 'witness: composite' },
  inputs: [{ name: 'n', label: 'n (odd, ≤ 10¹²)', type: 'number', default: '1373653', min: 2, max: 1e12 }],
  random: () => ({ n: String([561, 1105, 1729, 2047, 1000003, 999999937, 3215031751, 104729, 7919 * 7907][rint(0, 8)]) }),
  code: {
    pseudo: `
function isPrime(n)                        // deterministic for n < 2^64
  write n − 1 = d·2^s with d odd           // @split
  for a in {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37}
    if a mod n = 0: continue
    x ← a^d mod n                          // @base
    if x = 1 or x = n − 1: next a          // @pass
    repeat s − 1 times
      x ← x² mod n                         // @square
      if x = n − 1: next a
    return false       // a is a witness   // @witness
  return true                              // @prime`,
    cpp: `
using u64 = unsigned long long; using u128 = unsigned __int128;
u64 mulmod(u64 a, u64 b, u64 m) { return (u128)a * b % m; }
u64 powmod(u64 a, u64 e, u64 m) { u64 r = 1; a %= m; for (; e; e >>= 1, a = mulmod(a, a, m)) if (e & 1) r = mulmod(r, a, m); return r; }
bool isPrime(u64 n) {
    if (n < 2) return false;
    for (u64 p : {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37}) if (n % p == 0) return n == p;
    u64 d = n - 1; int s = 0;
    while (d % 2 == 0) { d /= 2; s++; }                         // @split
    for (u64 a : {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37}) {
        u64 x = powmod(a, d, n);                                 // @base
        if (x == 1 || x == n - 1) continue;                      // @pass
        bool ok = false;
        for (int i = 1; i < s && !ok; i++) {
            x = mulmod(x, x, n);                                 // @square
            ok = (x == n - 1);
        }
        if (!ok) return false;                                   // @witness
    }
    return true;                                                 // @prime
}`,
    java: `
// overflow-free a*b mod m for 0 <= a, b < m < 2^63 (double-and-add)
static long mulmod(long a, long b, long m) {
    long r = 0;
    while (b > 0) {
        if ((b & 1) == 1) r = r >= m - a ? r - (m - a) : r + a;
        a = a >= m - a ? a - (m - a) : a + a;
        b >>= 1;
    }
    return r;
}
static long powmod(long a, long e, long m) { long r = 1; a %= m; for (; e > 0; e >>= 1, a = mulmod(a, a, m)) if ((e & 1) == 1) r = mulmod(r, a, m); return r; }
static boolean isPrime(long n) {
    long[] bases = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37};
    if (n < 2) return false;
    for (long p : bases) if (n % p == 0) return n == p;
    long d = n - 1; int s = 0;
    while (d % 2 == 0) { d /= 2; s++; }                          // @split
    for (long a : bases) {
        long x = powmod(a, d, n);                                // @base
        if (x == 1 || x == n - 1) continue;                      // @pass
        boolean ok = false;
        for (int i = 1; i < s && !ok; i++) {
            x = mulmod(x, x, n);                                 // @square
            ok = (x == n - 1);
        }
        if (!ok) return false;                                   // @witness
    }
    return true;                                                 // @prime
}`,
    python: `
def is_prime(n):
    if n < 2: return False
    bases = (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37)
    for p in bases:
        if n % p == 0: return n == p
    d, s = n - 1, 0
    while d % 2 == 0: d //= 2; s += 1                            # @split
    for a in bases:
        x = pow(a, d, n)                                         # @base
        if x == 1 or x == n - 1: continue                        # @pass
        for _ in range(s - 1):
            x = x * x % n                                        # @square
            if x == n - 1: break
        else:
            return False                                         # @witness
    return True                                                  # @prime`,
    js: `
// BigInt keeps x*x exact for n up to 2^64
function isPrime(n) {
  n = BigInt(n);
  if (n < 2n) return false;
  const bases = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  for (const p of bases) if (n % p === 0n) return n === p;
  const powmod = (a, e, m) => { let r = 1n; a %= m; for (; e > 0n; e >>= 1n, a = a * a % m) if (e & 1n) r = r * a % m; return r; };
  let d = n - 1n, s = 0;
  while (d % 2n === 0n) { d /= 2n; s++; }                        // @split
  outer: for (const a of bases) {
    let x = powmod(a, d, n);                                     // @base
    if (x === 1n || x === n - 1n) continue;                      // @pass
    for (let i = 1; i < s; i++) {
      x = x * x % n;                                             // @square
      if (x === n - 1n) continue outer;
    }
    return false;                                                // @witness
  }
  return true;                                                   // @prime
}`,
    c: `
typedef unsigned long long u64;
typedef unsigned __int128 u128;     /* GCC / Clang extension */
static u64 mulmod(u64 a, u64 b, u64 m) { return (u128)a * b % m; }
static u64 powmod(u64 a, u64 e, u64 m) { u64 r = 1; a %= m; for (; e; e >>= 1, a = mulmod(a, a, m)) if (e & 1) r = mulmod(r, a, m); return r; }
int is_prime(u64 n) {
    static const u64 bases[12] = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37};
    if (n < 2) return 0;
    for (int i = 0; i < 12; i++) if (n % bases[i] == 0) return n == bases[i];
    u64 d = n - 1; int s = 0;
    while (d % 2 == 0) { d /= 2; s++; }                          // @split
    for (int i = 0; i < 12; i++) {
        u64 x = powmod(bases[i], d, n);                          // @base
        if (x == 1 || x == n - 1) continue;                      // @pass
        int ok = 0;
        for (int r = 1; r < s && !ok; r++) {
            x = mulmod(x, x, n);                                 // @square
            ok = (x == n - 1);
        }
        if (!ok) return 0;                                       // @witness
    }
    return 1;                                                    // @prime
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N0 = int(n, 'n', 2, 1e12)
      const N = BigInt(N0)
      const bases = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]
      for (const p of bases)
        if (N0 % p === 0) {
          t.step('split', `${N0} is divisible by the small prime ${p}. Small-prime screening settles it: ${N0 === p ? `${N0} is prime.` : `${N0} is composite.`}`, { n: N0 })
          t.step(N0 === p ? 'prime' : 'witness', N0 === p ? `${N0} is one of the bases itself, so it is prime.` : `${N0} = ${p}·${N0 / p}: composite, no Miller–Rabin rounds needed.`, { n: N0 })
          return
        }
      let d = N - 1n
      let s = 0
      while (d % 2n === 0n) {
        d /= 2n
        s++
      }
      const cols = Math.min(s, 8)
      const colLabels = ['a', 'a^d']
      for (let i = 1; i < cols; i++) colLabels.push(`a^(2^${i}·d)`)
      const G = t.grid('mr', [], { label: `chains mod n = ${N0} (n − 1 = ${N0 - 1})`, colLabels })
      t.step('split', `n − 1 = ${N0 - 1} = ${d}·2^${s}, d odd. By Fermat, a prime n has a^(n−1) ≡ 1. The chain a^d, a^(2d), …, a^(2^s·d) = a^(n−1) squares its way there, and modulo a prime the only square roots of 1 are ±1 — so the chain is all 1s or reaches n − 1 just before the first 1.`, { n: N0, d: Number(d), s })
      for (const a of bases) {
        const row: Scalar[] = Array(cols + 1).fill(null)
        row[0] = a
        G.rows.push(row)
        const k = G.rows.length - 1
        let x = powmod(BigInt(a), d, N)
        G.clear().set(k, 1, Number(x))
        G.role(k, 1, 'active')
        t.step('base', `Base ${a}: x = ${a}^${d} mod ${N0} = ${x}.`, { a, x: Number(x) })
        if (x === 1n || x === N - 1n) {
          G.role(k, 1, 'found')
          t.step('pass', `x = ${x === 1n ? '1' : 'n − 1'}: the chain is consistent with n prime. Base ${a} passes.`, { a, x: Number(x) })
          continue
        }
        let ok = false
        for (let i = 1; i < s; i++) {
          x = (x * x) % N
          const col = i + 1
          if (col <= cols) {
            G.clear().set(k, col, Number(x))
            G.role(k, col, 'active')
          }
          if (x === N - 1n) {
            ok = true
            if (col <= cols) G.role(k, col, 'found')
            t.step('square', `Square: x = ${x} = n − 1. The next square is 1, reached through −1 as a prime demands. Base ${a} passes.`, { a, x: Number(x) })
            break
          }
          t.step('square', `Square: x = ${x}.${x === 1n ? ' It became 1 without passing through n − 1: a non-trivial square root of 1 — impossible mod a prime.' : ''}`, { a, x: Number(x) })
          if (x === 1n) break
        }
        if (!ok) {
          G.clear()
          for (let c = 0; c <= cols; c++) G.role(k, c, 'removed')
          t.step('witness', `Base ${a} is a witness: its chain never reached n − 1. So ${N0} is composite — certainly, not just probably.${N0 === 561 || N0 === 1105 || N0 === 1729 ? ` (${N0} is a Carmichael number: it fools the plain Fermat test a^(n−1) ≡ 1 for every base coprime to it, but not Miller–Rabin.)` : ''}`, { a })
          return
        }
      }
      t.step('prime', `All 12 bases passed. These bases are proven to have no common liar below 3.3·10²⁴, so for every 64-bit n this answer is exact: ${N0} is prime.`, { n: N0 })
    }),
}

export const algorithms1: Algorithm[] = [
  mathDivFloor,
  mathDivCount,
  mathDivDigits,
  mathGcdEuclid,
  mathGcdBinary,
  mathGcdArray,
  mathExtTable,
  mathExtRecursive,
  mathExtDioph,
  mathPrimeTrial,
  mathPrimeFactor,
  mathPrimeMr,
]
