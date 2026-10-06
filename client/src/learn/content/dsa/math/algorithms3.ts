import { trace } from '../../../engine/tracer'
import type { Algorithm, Scalar } from '../../../engine/types'
import { rint } from '../../../algorithms/util'

/* Math topic — animations, part 3: modular inverse, CRT, counting, Pascal and Catalan. */

const isPrime = (n: number) => {
  if (n < 2 || !Number.isInteger(n)) return false
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false
  return true
}
const SMALL_PRIMES = [5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
const pick = <T,>(a: T[]) => a[rint(0, a.length - 1)]
const gcdN = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcdN(b, a % b))
const mod = (a: number, m: number) => ((a % m) + m) % m
const powMod = (a: number, e: number, m: number) => {
  let r = 1 % m
  a = mod(a, m)
  while (e > 0) {
    if (e & 1) r = (r * a) % m
    a = (a * a) % m
    e = Math.floor(e / 2)
  }
  return r
}

/* ───────────────────────── 1. Inverse by the extended Euclidean algorithm ───────────────────────── */

export const mathInvExtEuclid: Algorithm = {
  id: 'math-inv-ext-euclid',
  title: 'Modular inverse with the extended Euclidean algorithm',
  blurb: 'Run Euclid on (m, a) and carry one extra column t with the invariant r ≡ t·a (mod m). When r reaches 1, t is the inverse.',
  legend: { active: 'new row', compare: 'rows it comes from', found: 'r = 1: t is the inverse', removed: 'gcd > 1: no inverse' },
  inputs: [
    { name: 'a', label: 'a', type: 'number', default: '17', min: 1, max: 1000000 },
    { name: 'm', label: 'modulus m', type: 'number', default: '60', min: 2, max: 1000000 },
  ],
  random: () => {
    const m = rint(20, 400)
    let a = rint(2, m - 1)
    while (Math.random() < 0.8 && gcdN(a, m) !== 1) a = rint(2, m - 1)
    return { a: String(a), m: String(m) }
  },
  code: {
    pseudo: `
function inverse(a, m)
  (r0, r1) ← (m, a mod m); (t0, t1) ← (0, 1)       // @init
  while r1 ≠ 0                                     // @quot
    q ← ⌊r0 / r1⌋                                  // @quot
    (r0, r1) ← (r1, r0 − q·r1)                     // @update
    (t0, t1) ← (t1, t0 − q·t1)                     // @update
  if r0 ≠ 1: return "no inverse"                   // @none
  return t0 mod m                                  // @done`,
    cpp: `
// returns a^{-1} mod m, or -1 if gcd(a, m) != 1
long long inverse(long long a, long long m) {
    long long r0 = m, r1 = a % m, t0 = 0, t1 = 1;          // @init
    while (r1 != 0) {
        long long q = r0 / r1;                             // @quot
        long long r2 = r0 - q * r1; r0 = r1; r1 = r2;      // @update
        long long t2 = t0 - q * t1; t0 = t1; t1 = t2;      // @update
    }
    if (r0 != 1) return -1;                                // @none
    return ((t0 % m) + m) % m;                             // @done
}`,
    java: `
static long inverse(long a, long m) {
    long r0 = m, r1 = a % m, t0 = 0, t1 = 1;               // @init
    while (r1 != 0) {
        long q = r0 / r1;                                  // @quot
        long r2 = r0 - q * r1; r0 = r1; r1 = r2;           // @update
        long t2 = t0 - q * t1; t0 = t1; t1 = t2;           // @update
    }
    if (r0 != 1) return -1;                                // @none
    return ((t0 % m) + m) % m;                             // @done
}`,
    python: `
def inverse(a, m):
    r0, r1, t0, t1 = m, a % m, 0, 1          # @init
    while r1:
        q = r0 // r1                         # @quot
        r0, r1 = r1, r0 - q * r1             # @update
        t0, t1 = t1, t0 - q * t1             # @update
    if r0 != 1:
        return None                          # @none
    return t0 % m                            # @done`,
    js: `
function inverse(a, m) {
  let r0 = m, r1 = a % m, t0 = 0, t1 = 1;                  // @init
  while (r1 !== 0) {
    const q = Math.floor(r0 / r1);                         // @quot
    [r0, r1] = [r1, r0 - q * r1];                          // @update
    [t0, t1] = [t1, t0 - q * t1];                          // @update
  }
  if (r0 !== 1) return -1;                                 // @none
  return ((t0 % m) + m) % m;                               // @done
}`,
    c: `
long long inverse(long long a, long long m) {
    long long r0 = m, r1 = a % m, t0 = 0, t1 = 1;          // @init
    while (r1 != 0) {
        long long q = r0 / r1;                             // @quot
        long long r2 = r0 - q * r1; r0 = r1; r1 = r2;      // @update
        long long t2 = t0 - q * t1; t0 = t1; t1 = t2;      // @update
    }
    if (r0 != 1) return -1;                                // @none
    return ((t0 % m) + m) % m;                             // @done
}`,
  },
  run: ({ a, m }) =>
    trace((t) => {
      const A = Math.floor(a as number)
      const M = Math.floor(m as number)
      if (!(M >= 2) || !(A >= 1)) throw new Error('Use a ≥ 1 and m ≥ 2.')
      const G = t.grid('tab', [], { label: `invariant: r ≡ t · ${A} (mod ${M})`, colLabels: ['q', 'r', 't', `t·${A} mod ${M}`] })
      const row = (q: Scalar, r: number, tt: number) => G.rows.push([q, r, tt, mod(tt * A, M)])
      row('—', M, 0)
      row('—', A % M, 1)
      G.role(0, 1, 'active').role(0, 2, 'active').role(1, 1, 'active').role(1, 2, 'active')
      t.step('init', `Start with two rows that satisfy r ≡ t·a: ${M} ≡ 0·${A} and ${A % M} ≡ 1·${A} (mod ${M}). Every new row is "older row − q × newer row", and a difference of two true congruences is true.`, { r0: M, r1: A % M, t0: 0, t1: 1 })
      let r0 = M, r1 = A % M, t0 = 0, t1 = 1
      while (r1 !== 0) {
        const q = Math.floor(r0 / r1)
        const k = G.rows.length
        G.clear().role(k - 2, 1, 'compare').role(k - 1, 1, 'compare')
        t.step('quot', `q = ⌊${r0} / ${r1}⌋ = ${q}, the quotient Euclid would use.`, { r0, r1, t0, t1, q })
        const r2 = r0 - q * r1
        const t2 = t0 - q * t1
        r0 = r1; r1 = r2; t0 = t1; t1 = t2
        row(q, r2, t2)
        G.clear().role(k, 1, 'active').role(k, 2, 'active').role(k, 3, 'active')
        G.arrow([k - 2, 2], [k, 2], undefined, 'compare').arrow([k - 1, 2], [k, 2], `−${q}×`, 'compare')
        t.step('update', `New row = row ${k - 2} − ${q}·row ${k - 1}: r = ${r2}, t = ${t2}. Check: ${t2}·${A} mod ${M} = ${mod(t2 * A, M)} = r, as the invariant promises.`, { r0, r1, t0, t1, q })
      }
      const last = G.rows.length - 2
      G.clear()
      if (r0 !== 1) {
        G.role(last, 1, 'removed')
        t.step('none', `The last nonzero remainder is gcd(${A}, ${M}) = ${r0} ≠ 1. Every a·x mod ${M} is a multiple of ${r0}, so it can never be 1 — no inverse exists.`, { gcd: r0 })
        return
      }
      const inv = mod(t0, M)
      G.role(last, 1, 'found').role(last, 2, 'found')
      t.step('done', `r reached 1 with t = ${t0}, so ${t0}·${A} ≡ 1 (mod ${M}). Normalise into [0, ${M}): ${A}⁻¹ ≡ ${inv}. Check: ${A}·${inv} = ${A * inv} = ${Math.floor((A * inv) / M)}·${M} + 1.`, { inverse: inv })
    }),
}

/* ───────────────────────── 2. Inverse by Fermat: a^(p−2) ───────────────────────── */

export const mathInvFermat: Algorithm = {
  id: 'math-inv-fermat',
  title: 'Modular inverse by Fermat: a^(p−2) mod p',
  blurb: 'For a prime p, a^(p−1) ≡ 1, so a · a^(p−2) ≡ 1. Fast exponentiation computes it in O(log p) multiplications.',
  legend: { active: 'current bit of the exponent', write: 'bit is 1: multiply in', done: 'bit consumed' },
  inputs: [
    { name: 'a', label: 'a', type: 'number', default: '3', min: 1, max: 100000 },
    { name: 'p', label: 'prime p', type: 'number', default: '11', min: 2, max: 30011 },
  ],
  random: () => {
    const p = pick([...SMALL_PRIMES, 101, 997, 1009, 10007])
    return { a: String(rint(2, p - 1)), p: String(p) }
  },
  code: {
    pseudo: `
function inverse(a, p)        // p prime, p ∤ a
  e ← p − 2; base ← a mod p; res ← 1        // @init
  while e > 0
    if e is odd: res ← res·base mod p      // @mul
    base ← base² mod p; e ← ⌊e/2⌋         // @square
  return res                               // @done`,
    cpp: `
long long inverse(long long a, long long p) {   // p prime, a % p != 0
    long long e = p - 2, base = a % p, res = 1;              // @init
    while (e > 0) {
        if (e & 1) res = res * base % p;                     // @mul
        base = base * base % p; e >>= 1;                     // @square
    }
    return res;                                              // @done
}`,
    java: `
static long inverse(long a, long p) {
    long e = p - 2, base = a % p, res = 1;                   // @init
    while (e > 0) {
        if ((e & 1) == 1) res = res * base % p;              // @mul
        base = base * base % p; e >>= 1;                     // @square
    }
    return res;                                              // @done
}`,
    python: `
def inverse(a, p):            # or simply pow(a, p - 2, p)
    e, base, res = p - 2, a % p, 1           # @init
    while e > 0:
        if e & 1:
            res = res * base % p             # @mul
        base = base * base % p; e >>= 1      # @square
    return res                               # @done`,
    js: `
function inverse(a, p) {   // BigInt: products near 1e18 exceed 2^53
  p = BigInt(p);
  let e = p - 2n, base = BigInt(a) % p, res = 1n;            // @init
  while (e > 0n) {
    if (e & 1n) res = res * base % p;                        // @mul
    base = base * base % p; e >>= 1n;                        // @square
  }
  return res;                                                // @done
}`,
    c: `
long long inverse(long long a, long long p) {
    long long e = p - 2, base = a % p, res = 1;              // @init
    while (e > 0) {
        if (e & 1) res = res * base % p;                     // @mul
        base = base * base % p; e >>= 1;                     // @square
    }
    return res;                                              // @done
}`,
  },
  run: ({ a, p }) =>
    trace((t) => {
      const P = Math.floor(p as number)
      const A0 = Math.floor(a as number)
      if (!isPrime(P)) throw new Error(`${P} is not prime — Fermat's trick needs a prime modulus (use extended Euclid otherwise).`)
      if (A0 % P === 0) throw new Error(`${A0} is a multiple of ${P}, so it has no inverse.`)
      const E = P - 2
      const bits = E.toString(2).split('').reverse().map(Number)
      const B = t.array('bits', bits, { label: `bits of e = p − 2 = ${E}, least significant first` })
      let base = A0 % P
      let res = 1
      let pw = 1
      t.step('init', `p = ${P} is prime, so ${A0}^(${P}−1) ≡ 1 (Fermat) and ${A0}·${A0}^(${P}−2) ≡ 1: the inverse is ${A0}^${E} mod ${P}. Write ${E} in binary and walk its bits.`, { res, base, 'base is a^': pw })
      for (let i = 0; i < bits.length; i++) {
        B.clear().ptr('bit', i)
        for (let j = 0; j < i; j++) B.role(j, 'done')
        if (bits[i]) {
          B.role(i, 'write')
          const before = res
          res = (res * base) % P
          t.step('mul', `Bit ${i} is 1, so ${A0}^${pw} is part of ${A0}^${E}: res = ${before}·${base} mod ${P} = ${res}.`, { res, base, 'base is a^': pw })
        } else {
          B.role(i, 'active')
        }
        if (i < bits.length - 1) {
          const before = base
          base = (base * base) % P
          pw *= 2
          t.step('square', `${bits[i] ? '' : `Bit ${i} is 0 — skip the multiply. `}Square the base: ${before}² mod ${P} = ${base}, which is ${A0}^${pw}.`, { res, base, 'base is a^': pw })
        }
      }
      B.clear().ptr('bit', null)
      for (let j = 0; j < bits.length; j++) B.role(j, 'done')
      t.step('done', `${A0}⁻¹ ≡ ${res} (mod ${P}). Check: ${A0}·${res} = ${A0 * res} ≡ ${(A0 * res) % P}. Cost: ${bits.length - 1} squarings and ${bits.filter((b) => b).length} multiplications — O(log p).`, { inverse: res })
    }),
}

/* ───────────────────────── 3. Linear-time inverse table ───────────────────────── */

export const mathInvTable: Algorithm = {
  id: 'math-inv-table',
  title: 'All inverses 1..n in O(n): inv[i] = −⌊p/i⌋ · inv[p mod i]',
  blurb: 'Write p = q·i + r. Then q·i + r ≡ 0, so i ≡ −r/q and i⁻¹ ≡ −q·r⁻¹. Since r < i, inv[r] is already known.',
  legend: { active: 'computing inv[i]', compare: 'inv[p mod i], already known', write: 'just filled' },
  inputs: [
    { name: 'p', label: 'prime p', type: 'number', default: '13', min: 3, max: 997 },
    { name: 'n', label: 'up to n', type: 'number', default: '12', min: 2, max: 16 },
  ],
  random: () => {
    const p = pick([7, 11, 13, 17, 19, 23, 29, 31, 101])
    return { p: String(p), n: String(Math.min(p - 1, rint(6, 16))) }
  },
  code: {
    pseudo: `
inv[1] ← 1                                          // @init
for i ← 2 to n                                      // @pick
  inv[i] ← (p − ⌊p/i⌋ · inv[p mod i] mod p) mod p   // @fill`,
    cpp: `
vector<long long> inverses(int n, long long p) {   // n < p, p prime
    vector<long long> inv(n + 1);
    inv[1] = 1;                                                // @init
    for (int i = 2; i <= n; i++)                               // @pick
        inv[i] = (p - (p / i) * inv[p % i] % p) % p;           // @fill
    return inv;
}`,
    java: `
static long[] inverses(int n, long p) {
    long[] inv = new long[n + 1];
    inv[1] = 1;                                                // @init
    for (int i = 2; i <= n; i++)                               // @pick
        inv[i] = (p - (p / i) * inv[(int) (p % i)] % p) % p;   // @fill
    return inv;
}`,
    python: `
def inverses(n, p):
    inv = [0] * (n + 1)
    inv[1] = 1                                     # @init
    for i in range(2, n + 1):                      # @pick
        inv[i] = (p - (p // i) * inv[p % i] % p) % p   # @fill
    return inv`,
    js: `
function inverses(n, p) {   // p < 2^26 keeps (p / i) * inv exact in doubles
  const inv = new Array(n + 1).fill(0);
  inv[1] = 1;                                                  // @init
  for (let i = 2; i <= n; i++)                                 // @pick
    inv[i] = (p - Math.floor(p / i) * inv[p % i] % p) % p;     // @fill
  return inv;
}`,
    c: `
void inverses(int n, long long p, long long *inv) {   /* inv has n + 1 slots */
    inv[1] = 1;                                                // @init
    for (int i = 2; i <= n; i++)                               // @pick
        inv[i] = (p - (p / i) * inv[p % i] % p) % p;           // @fill
}`,
  },
  run: ({ p, n }) =>
    trace((t) => {
      const P = Math.floor(p as number)
      if (!isPrime(P)) throw new Error(`${P} is not prime.`)
      const N = Math.min(Math.floor(n as number), P - 1, 16)
      if (N < 2) throw new Error('Use n ≥ 2.')
      const inv: Scalar[] = Array(N + 1).fill(null)
      const A = t.array('inv', inv, { label: `inv[i] mod ${P}` })
      A.ptr('unused', 0)
      A.set(1, 1)
      A.role(1, 'write')
      t.step('init', `1 is its own inverse. Index 0 has no inverse and is never read: p mod i is never 0 because p is prime and i < p.`)
      const vals = [0, 1]
      for (let i = 2; i <= N; i++) {
        const q = Math.floor(P / i)
        const r = P % i
        A.clear().ptr('unused', null).role(i, 'active').role(r, 'compare')
        t.step('pick', `i = ${i}: ${P} = ${q}·${i} + ${r}, so ${q}·${i} ≡ −${r} (mod ${P}). Multiply both sides by inv[${i}]·inv[${r}]: inv[${i}] ≡ −${q}·inv[${r}].`, { i, q, r, 'inv[r]': vals[r] })
        const v = (P - ((q * vals[r]) % P)) % P
        vals[i] = v
        A.set(i, v)
        A.clear().role(i, 'write').arrow(r, i, `×(−${q})`, 'compare')
        t.step('fill', `inv[${i}] = −${q}·${vals[r]} mod ${P} = ${v}. Check: ${i}·${v} = ${i * v} ≡ ${(i * v) % P}.`, { i, q, r, 'inv[i]': v })
      }
      A.clear()
      for (let i = 1; i <= N; i++) A.role(i, 'done')
      t.step('fill', `All ${N} inverses with one multiplication and one division each — O(n) total, versus O(n log p) for n separate fast powers.`)
    }),
}

/* ───────────────────────── 4. Factorials and inverse factorials ───────────────────────── */

export const mathInvFact: Algorithm = {
  id: 'math-inv-fact',
  title: 'Factorials and inverse factorials, then C(n, k) in O(1)',
  blurb: 'One forward pass for fact[], ONE modular inverse for ifact[N], and a backward pass ifact[i−1] = ifact[i]·i.',
  legend: { write: 'just computed', compare: 'used for this value', found: 'answer' },
  inputs: [
    { name: 'N', label: 'table size N', type: 'number', default: '8', min: 2, max: 12 },
    { name: 'p', label: 'prime p > N', type: 'number', default: '17', min: 3, max: 1009 },
    { name: 'k', label: 'query C(N, k), k =', type: 'number', default: '3', min: 0, max: 12 },
  ],
  random: () => {
    const N = rint(5, 12)
    const p = pick([13, 17, 19, 23, 29, 31, 101])
    return { N: String(N), p: String(Math.max(p, 13)), k: String(rint(0, N)) }
  },
  code: {
    pseudo: `
fact[0] ← 1
for i ← 1 to N: fact[i] ← fact[i−1]·i mod p          // @fact
ifact[N] ← fact[N]^(p−2) mod p                        // @inv
for i ← N downto 1: ifact[i−1] ← ifact[i]·i mod p     // @ifact
C(n, k) = fact[n]·ifact[k]·ifact[n−k] mod p           // @query`,
    cpp: `
const long long P = 1000000007;
vector<long long> fact, ifact;
long long power(long long b, long long e) {
    long long r = 1; b %= P;
    for (; e > 0; e >>= 1, b = b * b % P) if (e & 1) r = r * b % P;
    return r;
}
void build(int N) {
    fact.assign(N + 1, 1); ifact.assign(N + 1, 1);
    for (int i = 1; i <= N; i++) fact[i] = fact[i - 1] * i % P;        // @fact
    ifact[N] = power(fact[N], P - 2);                                  // @inv
    for (int i = N; i >= 1; i--) ifact[i - 1] = ifact[i] * i % P;      // @ifact
}
long long C(int n, int k) {
    if (k < 0 || k > n) return 0;
    return fact[n] * ifact[k] % P * ifact[n - k] % P;                  // @query
}`,
    java: `
static final long P = 1_000_000_007L;
static long[] fact, ifact;
static long power(long b, long e) {
    long r = 1; b %= P;
    for (; e > 0; e >>= 1, b = b * b % P) if ((e & 1) == 1) r = r * b % P;
    return r;
}
static void build(int N) {
    fact = new long[N + 1]; ifact = new long[N + 1]; fact[0] = 1;
    for (int i = 1; i <= N; i++) fact[i] = fact[i - 1] * i % P;        // @fact
    ifact[N] = power(fact[N], P - 2);                                  // @inv
    for (int i = N; i >= 1; i--) ifact[i - 1] = ifact[i] * i % P;      // @ifact
}
static long C(int n, int k) {
    if (k < 0 || k > n) return 0;
    return fact[n] * ifact[k] % P * ifact[n - k] % P;                  // @query
}`,
    python: `
P = 10**9 + 7
def build(N):
    fact = [1] * (N + 1)
    for i in range(1, N + 1):
        fact[i] = fact[i - 1] * i % P                  # @fact
    ifact = [1] * (N + 1)
    ifact[N] = pow(fact[N], P - 2, P)                  # @inv
    for i in range(N, 0, -1):
        ifact[i - 1] = ifact[i] * i % P                # @ifact
    return fact, ifact

def C(n, k, fact, ifact):
    if k < 0 or k > n:
        return 0
    return fact[n] * ifact[k] % P * ifact[n - k] % P   # @query`,
    js: `
const P = 1000000007n;
function power(b, e) {
  let r = 1n; b %= P;
  for (; e > 0n; e >>= 1n, b = b * b % P) if (e & 1n) r = r * b % P;
  return r;
}
function build(N) {   // BigInt: products of two values < P exceed 2^53
  const fact = [1n], ifact = new Array(N + 1);
  for (let i = 1; i <= N; i++) fact[i] = fact[i - 1] * BigInt(i) % P;    // @fact
  ifact[N] = power(fact[N], P - 2n);                                     // @inv
  for (let i = N; i >= 1; i--) ifact[i - 1] = ifact[i] * BigInt(i) % P;  // @ifact
  return [fact, ifact];
}
function C(n, k, fact, ifact) {
  if (k < 0 || k > n) return 0n;
  return fact[n] * ifact[k] % P * ifact[n - k] % P;                      // @query
}`,
    c: `
#define P 1000000007LL
#define MAXN 1000001
long long fact[MAXN], ifact[MAXN];
long long power(long long b, long long e) {
    long long r = 1; b %= P;
    for (; e > 0; e >>= 1, b = b * b % P) if (e & 1) r = r * b % P;
    return r;
}
void build(int N) {
    fact[0] = 1;
    for (int i = 1; i <= N; i++) fact[i] = fact[i - 1] * i % P;        // @fact
    ifact[N] = power(fact[N], P - 2);                                  // @inv
    for (int i = N; i >= 1; i--) ifact[i - 1] = ifact[i] * i % P;      // @ifact
}
long long C(int n, int k) {
    if (k < 0 || k > n) return 0;
    return fact[n] * ifact[k] % P * ifact[n - k] % P;                  // @query
}`,
  },
  run: ({ N, p, k }) =>
    trace((t) => {
      const n = Math.floor(N as number)
      const P = Math.floor(p as number)
      const K = Math.floor(k as number)
      if (!isPrime(P)) throw new Error(`${P} is not prime.`)
      if (n < 1 || n > 12) throw new Error('Use 1 ≤ N ≤ 12.')
      if (n >= P) throw new Error(`Need N < p: ${n}! is divisible by ${P}, so it would have no inverse.`)
      if (K < 0 || K > n) throw new Error(`Use 0 ≤ k ≤ N (= ${n}).`)
      const F = t.array('fact', [1, ...Array(n).fill(null)], { label: `fact[i] = i! mod ${P}` })
      const I = t.array('ifact', Array(n + 1).fill(null), { label: `ifact[i] = (i!)⁻¹ mod ${P}` })
      const f = [1]
      F.role(0, 'write')
      t.step('fact', `fact[0] = 0! = 1. Each next factorial is the previous one times i, reduced mod ${P}.`)
      for (let i = 1; i <= n; i++) {
        f[i] = (f[i - 1] * i) % P
        F.set(i, f[i])
        F.clear().role(i - 1, 'compare').role(i, 'write').arrow(i - 1, i, `×${i}`, 'compare')
        t.step('fact', `fact[${i}] = fact[${i - 1}]·${i} = ${f[i - 1]}·${i} mod ${P} = ${f[i]}.`)
      }
      const inv: number[] = []
      inv[n] = powMod(f[n], P - 2, P)
      I.set(n, inv[n])
      F.clear().role(n, 'compare')
      I.clear().role(n, 'write')
      t.step('inv', `The only expensive step: ifact[${n}] = fact[${n}]^(${P}−2) = ${f[n]}^${P - 2} mod ${P} = ${inv[n]} (check: ${f[n]}·${inv[n]} ≡ ${(f[n] * inv[n]) % P}).`)
      F.clear()
      for (let i = n; i >= 1; i--) {
        inv[i - 1] = (inv[i] * i) % P
        I.set(i - 1, inv[i - 1])
        I.clear().role(i, 'compare').role(i - 1, 'write').arrow(i, i - 1, `×${i}`, 'compare')
        t.step('ifact', `1/(${i - 1})! = ${i}/${i}! , so ifact[${i - 1}] = ifact[${i}]·${i} = ${inv[i]}·${i} mod ${P} = ${inv[i - 1]}.`)
      }
      const ans = (((f[n] * inv[K]) % P) * inv[n - K]) % P
      F.clear().role(n, 'found')
      I.clear().role(K, 'compare').role(n - K, 'compare')
      t.step('query', `C(${n}, ${K}) = ${n}!/(${K}!·${n - K}!) = fact[${n}]·ifact[${K}]·ifact[${n - K}] = ${f[n]}·${inv[K]}·${inv[n - K]} mod ${P} = ${ans}. Three lookups and two multiplications per query, forever.`, { answer: ans })
    }),
}

/* ───────────────────────── 5. Why CRT works: stepping through one residue class ───────────────────────── */

export const mathCrtStep: Algorithm = {
  id: 'math-crt-step',
  title: 'CRT by stepping: a, a + m, a + 2m, … modulo n',
  blurb: 'All solutions of x ≡ a (mod m) are a + k·m. When gcd(m, n) = 1, the n values k = 0..n−1 hit every residue mod n exactly once.',
  legend: { active: 'candidate', found: 'also ≡ b (mod n)', removed: 'residue repeated (gcd > 1)' },
  inputs: [
    { name: 'a', label: 'x ≡ a', type: 'number', default: '2', min: 0, max: 100 },
    { name: 'm', label: '(mod m)', type: 'number', default: '5', min: 1, max: 15 },
    { name: 'b', label: 'x ≡ b', type: 'number', default: '3', min: 0, max: 100 },
    { name: 'n', label: '(mod n)', type: 'number', default: '7', min: 1, max: 15 },
  ],
  random: () => {
    const m = rint(2, 12)
    const n = rint(2, 12)
    return { a: String(rint(0, m - 1)), m: String(m), b: String(rint(0, n - 1)), n: String(n) }
  },
  code: {
    pseudo: `
function crt2(a, m, b, n)      // brute force: O(n) steps
  x ← a mod m                                  // @init
  for k ← 0 to n − 1
    if x mod n = b mod n: return x (mod m·n)   // @try
    x ← x + m                                  // @try
  return "no solution"                         // @done`,
    cpp: `
// smallest x >= 0 with x ≡ a (mod m), x ≡ b (mod n), or -1
long long crt2(long long a, long long m, long long b, long long n) {
    long long x = a % m;                                     // @init
    for (long long k = 0; k < n; k++, x += m)
        if (x % n == b % n) return x;                        // @try
    return -1;                                               // @done
}`,
    java: `
static long crt2(long a, long m, long b, long n) {
    long x = a % m;                                          // @init
    for (long k = 0; k < n; k++, x += m)
        if (x % n == b % n) return x;                        // @try
    return -1;                                               // @done
}`,
    python: `
def crt2(a, m, b, n):
    x = a % m                          # @init
    for _ in range(n):
        if x % n == b % n:             # @try
            return x
        x += m                         # @try
    return None                        # @done`,
    js: `
function crt2(a, m, b, n) {
  let x = a % m;                                             // @init
  for (let k = 0; k < n; k++, x += m)
    if (x % n === b % n) return x;                           // @try
  return -1;                                                 // @done
}`,
    c: `
long long crt2(long long a, long long m, long long b, long long n) {
    long long x = a % m;                                     // @init
    for (long long k = 0; k < n; k++, x += m)
        if (x % n == b % n) return x;                        // @try
    return -1;                                               // @done
}`,
  },
  run: ({ a, m, b, n }) =>
    trace((t) => {
      const M = Math.floor(m as number)
      const N = Math.floor(n as number)
      if (M < 1 || N < 1 || M > 15 || N > 15) throw new Error('Keep m and n between 1 and 15.')
      const A = mod(Math.floor(a as number), M)
      const B = mod(Math.floor(b as number), N)
      const g = gcdN(M, N)
      const X = t.array('x', Array(N).fill(null), { label: `candidates x = ${A} + k·${M}` })
      const R = t.array('r', Array(N).fill(null), { label: `x mod ${N}` })
      const seen = new Map<number, number>()
      t.step('init', `x ≡ ${A} (mod ${M}) means x ∈ {${A}, ${A + M}, ${A + 2 * M}, …}. Try the first ${N} of them against mod ${N}. gcd(${M}, ${N}) = ${g}${g === 1 ? ' — coprime, so exactly one of them will work.' : ' > 1, so residues will repeat.'}`, { k: null, x: A })
      let found = -1
      for (let k = 0; k < N; k++) {
        const x = A + k * M
        X.set(k, x)
        R.set(k, x % N)
        X.clear().role(k, 'active')
        R.clear()
        for (let j = 0; j < k; j++) R.role(j, j === found ? 'found' : 'dim')
        if (found >= 0) X.role(found, 'found')
        if (seen.has(x % N)) {
          R.role(k, 'removed').role(seen.get(x % N)!, 'removed')
          t.step('try', `${x} mod ${N} = ${x % N} — the same residue as k = ${seen.get(x % N)}. Two candidates differ by a multiple of ${M}, and ${N} divides it only when it divides (k − k')·${M}; with gcd ${g} > 1 that happens after ${N / g} steps, so only ${N / g} residues are ever reached.`, { k, x, 'x mod n': x % N })
        } else if (x % N === B && found < 0) {
          found = k
          X.role(k, 'found')
          R.role(k, 'found')
          t.step('try', `${x} mod ${N} = ${B}. Found it: x = ${x} satisfies both congruences.`, { k, x, 'x mod n': x % N })
        } else {
          R.role(k, 'active')
          t.step('try', `${x} mod ${N} = ${x % N}${x % N === B ? ' (matches again — only possible because the residues repeat)' : ` ≠ ${B}`}. Step by ${M}.`, { k, x, 'x mod n': x % N })
        }
        if (!seen.has(x % N)) seen.set(x % N, k)
      }
      X.clear()
      R.clear()
      if (found >= 0) {
        X.role(found, 'found')
        R.role(found, 'found')
        const L = (M * N) / g
        t.step('done', g === 1
          ? `The ${N} residues are all different — a permutation of 0..${N - 1} — so exactly one candidate works. The solution is x ≡ ${A + found * M} (mod ${M * N}). This O(n) walk is the pigeonhole proof of CRT; the fast version replaces the walk with one modular inverse.`
          : `A solution exists because ${g} divides ${B} − ${A}: x ≡ ${A + found * M} (mod lcm = ${L}).`, { x: A + found * M, period: L })
      } else {
        t.step('done', `No candidate works: only residues ≡ ${A} (mod ${g}) are reachable, and ${B} ≢ ${A} (mod ${g}). The system is inconsistent — the check is "does gcd(m, n) divide b − a?"`, { solution: 'none' })
      }
    }),
}

/* ───────────────────────── 6. Merging congruences (general moduli) ───────────────────────── */

const bgcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : bgcd(b, a % b))
const bmod = (a: bigint, m: bigint) => ((a % m) + m) % m
const binv = (a: bigint, m: bigint): bigint => {
  let r0 = m, r1 = bmod(a, m), t0 = 0n, t1 = 1n
  while (r1 !== 0n) {
    const q = r0 / r1
    ;[r0, r1] = [r1, r0 - q * r1]
    ;[t0, t1] = [t1, t0 - q * t1]
  }
  return bmod(t0, m)
}

export const mathCrtMerge: Algorithm = {
  id: 'math-crt-merge',
  title: 'Merging congruences one at a time (any moduli)',
  blurb: 'Keep one combined congruence x ≡ r (mod M). Fold in x ≡ a (mod m): check g = gcd(M, m) divides a − r, solve for the step k, then M becomes lcm(M, m).',
  legend: { active: 'congruence being merged', compare: 'gcd check', found: 'combined result', removed: 'inconsistent' },
  inputs: [
    { name: 'rems', label: 'remainders aᵢ', type: 'array', default: '1 3 3 2', maxLen: 6 },
    { name: 'mods', label: 'moduli mᵢ', type: 'array', default: '4 6 9 5', maxLen: 6 },
  ],
  random: () => {
    const k = rint(2, 4)
    const mods = Array.from({ length: k }, () => rint(2, 15))
    const x = rint(0, 500)
    const rems = mods.map((m) => (Math.random() < 0.85 ? x % m : rint(0, m - 1)))
    return { rems: rems.join(' '), mods: mods.join(' ') }
  },
  code: {
    pseudo: `
r ← a₀ mod m₀; M ← m₀                                  // @init
for each (a, m) after the first                        // @take
  g ← gcd(M, m)                                        // @gcd
  if (a − r) mod g ≠ 0: return "no solution"           // @fail
  k ← ((a − r)/g) · inverse(M/g, m/g) mod (m/g)        // @solve
  r ← r + k·M; M ← M·(m/g); r ← r mod M                // @merge
return (r, M)                                          // @done`,
    cpp: `
// merges x ≡ a[i] (mod m[i]); returns {r, M} or {-1, -1}. Needs lcm < 2^63.
pair<long long, long long> crt(const vector<long long>& a, const vector<long long>& m) {
    long long r = ((a[0] % m[0]) + m[0]) % m[0], M = m[0];          // @init
    for (size_t i = 1; i < a.size(); i++) {                          // @take
        long long g = gcd(M, m[i]);                                  // @gcd
        long long d = a[i] - r;
        if (((d % g) + g) % g != 0) return {-1, -1};                 // @fail
        long long mg = m[i] / g;
        // inverse() from the extended-Euclid code above; __int128 avoids overflow
        long long k = (long long)((__int128)(((d / g) % mg + mg) % mg) * inverse((M / g) % mg, mg) % mg);   // @solve
        r = (long long)((r + (__int128)k * M) % (M * mg)); M *= mg;  // @merge
    }
    return {r, M};                                                   // @done
}`,
    java: `
// uses BigInteger for the product so large moduli cannot overflow
static long[] crt(long[] a, long[] m) {
    long r = Math.floorMod(a[0], m[0]), M = m[0];                    // @init
    for (int i = 1; i < a.length; i++) {                             // @take
        long g = gcd(M, m[i]);                                       // @gcd
        long d = a[i] - r;
        if (Math.floorMod(d, g) != 0) return null;                   // @fail
        long mg = m[i] / g;
        long k = Math.floorMod(d / g, mg);
        k = BigInteger.valueOf(k).multiply(BigInteger.valueOf(inverse(Math.floorMod(M / g, mg), mg))).mod(BigInteger.valueOf(mg)).longValue();   // @solve
        long newM = M * mg;
        r = BigInteger.valueOf(k).multiply(BigInteger.valueOf(M)).add(BigInteger.valueOf(r)).mod(BigInteger.valueOf(newM)).longValue(); M = newM;   // @merge
    }
    return new long[]{r, M};                                         // @done
}`,
    python: `
from math import gcd

def crt(a, m):
    r, M = a[0] % m[0], m[0]                           # @init
    for ai, mi in zip(a[1:], m[1:]):                   # @take
        g = gcd(M, mi)                                 # @gcd
        if (ai - r) % g:
            return None                                # @fail
        mg = mi // g
        k = (ai - r) // g * pow(M // g, -1, mg) % mg   # @solve
        r, M = r + k * M, M * mg                       # @merge
        r %= M                                         # @merge
    return r, M                                        # @done`,
    js: `
// BigInt throughout: lcm of several moduli quickly passes 2^53
function crt(a, m) {
  const mod = (x, n) => ((x % n) + n) % n;
  const gcd = (x, y) => (y === 0n ? x : gcd(y, x % y));
  let r = mod(a[0], m[0]), M = m[0];                         // @init
  for (let i = 1; i < a.length; i++) {                       // @take
    const g = gcd(M, m[i]);                                  // @gcd
    if (mod(a[i] - r, g) !== 0n) return null;                // @fail
    const mg = m[i] / g;
    const k = mod((a[i] - r) / g, mg) * inverse(mod(M / g, mg), mg) % mg;   // @solve
    r = mod(r + k * M, M * mg); M *= mg;                     // @merge
  }
  return [r, M];                                             // @done
}`,
    c: `
typedef __int128 i128;   /* GCC/Clang extension; keeps k*M exact */
long long gcdll(long long a, long long b) { return b ? gcdll(b, a % b) : a; }
/* returns 1 and writes (r, M) on success, 0 if inconsistent */
int crt(const long long *a, const long long *m, int n, long long *r_out, long long *M_out) {
    long long r = ((a[0] % m[0]) + m[0]) % m[0], M = m[0];           // @init
    for (int i = 1; i < n; i++) {                                    // @take
        long long g = gcdll(M, m[i]);                                // @gcd
        long long d = a[i] - r;
        if (((d % g) + g) % g != 0) return 0;                        // @fail
        long long mg = m[i] / g;
        long long k = (long long)((i128)(((d / g) % mg + mg) % mg) * inverse((M / g) % mg, mg) % mg);   // @solve
        r = (long long)((r + (i128)k * M) % ((i128)M * mg)); M *= mg;    // @merge
    }
    *r_out = r; *M_out = M; return 1;                                // @done
}`,
  },
  run: ({ rems, mods }) =>
    trace((t) => {
      const as = (rems as number[]).map((x) => Math.floor(x))
      const ms = (mods as number[]).map((x) => Math.floor(x))
      if (!as.length || as.length !== ms.length) throw new Error('Give the same number of remainders and moduli.')
      if (ms.some((x) => !(x >= 1 && x <= 1000000))) throw new Error('Moduli must be between 1 and 10⁶.')
      const G = t.grid('sys', as.map((a, i) => [a, ms[i], null, null, null]), {
        label: 'system and running merge',
        colLabels: ['aᵢ', 'mᵢ', 'g = gcd(M, mᵢ)', 'r after', 'M after'],
        rowLabels: as.map((_, i) => `#${i}`),
      })
      let r = bmod(BigInt(as[0]), BigInt(ms[0]))
      let M = BigInt(ms[0])
      G.set(0, 3, String(r))
      G.set(0, 4, String(M))
      G.role(0, 3, 'found').role(0, 4, 'found')
      t.step('init', `Start from the first congruence alone: x ≡ ${r} (mod ${M}). Every solution of the whole system must be in this class.`, { r: String(r), M: String(M) })
      for (let i = 1; i < as.length; i++) {
        const a = BigInt(as[i])
        const m = BigInt(ms[i])
        G.clear().role(i, 0, 'active').role(i, 1, 'active').role(i - 1, 3, 'compare').role(i - 1, 4, 'compare')
        t.step('take', `Fold in x ≡ ${a} (mod ${m}). Write x = ${r} + k·${M} and ask which k makes ${r} + k·${M} ≡ ${a} (mod ${m}), i.e. k·${M} ≡ ${a - r} (mod ${m}).`, { r: String(r), M: String(M) })
        const g = bgcd(M, m)
        G.set(i, 2, String(g))
        G.clear().role(i, 2, 'compare')
        const d = a - r
        if (bmod(d, g) !== 0n) {
          G.role(i, 0, 'removed').role(i, 1, 'removed')
          t.step('fail', `g = gcd(${M}, ${m}) = ${g}, and ${g} does not divide ${d}. The left side k·${M} is always a multiple of ${g} mod ${m}, the right side is not — no x satisfies both.`, { g: String(g), 'a − r': String(d) })
          return
        }
        t.step('gcd', `g = gcd(${M}, ${m}) = ${g}, and ${g} divides a − r = ${d}${g === 1n ? ' (always true for g = 1)' : ''}: a solution exists. Divide the congruence by g: k·${M / g} ≡ ${d / g} (mod ${m / g}).`, { g: String(g), 'a − r': String(d) })
        const mg = m / g
        const iv = mg === 1n ? 0n : binv(bmod(M / g, mg), mg)
        const k = mg === 1n ? 0n : bmod((d / g) * iv, mg)
        t.step('solve', mg === 1n
          ? `m/g = 1: the new congruence is already implied by the old one (k = 0).`
          : `${M / g} and ${mg} are coprime, so invert: (${M / g})⁻¹ ≡ ${iv} (mod ${mg}). k = ${d / g}·${iv} mod ${mg} = ${k}.`, { g: String(g), k: String(k) })
        const newM = M * mg
        const oldR = r
        const oldM = M
        r = bmod(r + k * M, newM)
        M = newM
        G.set(i, 3, String(r))
        G.set(i, 4, String(M))
        G.clear().role(i, 3, 'found').role(i, 4, 'found').arrow([i - 1, 3], [i, 3], `+${k}·M`, 'compare')
        t.step('merge', `x = ${oldR} + ${k}·${oldM} = ${oldR + k * oldM}, so x ≡ ${r} (mod ${M}). The new modulus is lcm(${oldM}, ${m}) = ${oldM}·(${m}/${g}) = ${M}: one congruence now encodes the first ${i + 1}.`, { r: String(r), M: String(M) })
      }
      G.clear()
      for (let i = 0; i < as.length; i++) G.role(i, 0, 'done').role(i, 1, 'done')
      G.role(as.length - 1, 3, 'found').role(as.length - 1, 4, 'found')
      const check = as.map((_, i) => `${r} mod ${ms[i]} = ${bmod(r, BigInt(ms[i]))}`).join(', ')
      t.step('done', `x ≡ ${r} (mod ${M}). Check: ${check}.`, { r: String(r), M: String(M) })
    }),
}

/* ───────────────────────── 7. The product rule as a decision tree ───────────────────────── */

export const mathCountTree: Algorithm = {
  id: 'math-count-tree',
  title: 'k-permutations as a decision tree — the product rule you can see',
  blurb: 'Level 1 has n choices, level 2 has n − 1 (one item is used up), … The leaves are the arrangements: n·(n−1)·…·(n−k+1).',
  legend: { active: 'choosing', new: 'just chosen', found: 'a complete arrangement', dim: 'already used on this path' },
  inputs: [
    { name: 'items', label: 'items', type: 'string', default: 'ABCD' },
    { name: 'k', label: 'positions k', type: 'number', default: '2', min: 1, max: 4 },
  ],
  random: () => {
    const n = rint(2, 4)
    const k = rint(1, Math.min(3, n))
    return { items: 'ABCD'.slice(0, n), k: String(k) }
  },
  code: {
    pseudo: `
function arrange(prefix, used)
  if |prefix| = k: output prefix; return      // @leaf
  for each item x not in used                 // @pick
    arrange(prefix + x, used ∪ {x})           // @pick`,
    cpp: `
void arrange(const string& items, int k, string& prefix, vector<bool>& used, vector<string>& out) {
    if ((int)prefix.size() == k) { out.push_back(prefix); return; }       // @leaf
    for (size_t i = 0; i < items.size(); i++) if (!used[i]) {            // @pick
        used[i] = true; prefix.push_back(items[i]);
        arrange(items, k, prefix, used, out);                             // @pick
        prefix.pop_back(); used[i] = false;
    }
}`,
    java: `
static void arrange(String items, int k, StringBuilder prefix, boolean[] used, List<String> out) {
    if (prefix.length() == k) { out.add(prefix.toString()); return; }   // @leaf
    for (int i = 0; i < items.length(); i++) if (!used[i]) {            // @pick
        used[i] = true; prefix.append(items.charAt(i));
        arrange(items, k, prefix, used, out);                            // @pick
        prefix.deleteCharAt(prefix.length() - 1); used[i] = false;
    }
}`,
    python: `
def arrange(items, k, prefix="", used=frozenset(), out=None):
    out = [] if out is None else out
    if len(prefix) == k:
        out.append(prefix); return out                # @leaf
    for i, x in enumerate(items):
        if i not in used:                             # @pick
            arrange(items, k, prefix + x, used | {i}, out)   # @pick
    return out`,
    js: `
function arrange(items, k, prefix = '', used = new Set(), out = []) {
  if (prefix.length === k) { out.push(prefix); return out; }       // @leaf
  for (let i = 0; i < items.length; i++) if (!used.has(i)) {       // @pick
    used.add(i); arrange(items, k, prefix + items[i], used, out);  // @pick
    used.delete(i);
  }
  return out;
}`,
    c: `
void arrange(const char *items, int n, int k, char *prefix, int len, int *used, int *count) {
    if (len == k) { prefix[len] = 0; puts(prefix); (*count)++; return; }   // @leaf
    for (int i = 0; i < n; i++) if (!used[i]) {                              // @pick
        used[i] = 1; prefix[len] = items[i];
        arrange(items, n, k, prefix, len + 1, used, count);                  // @pick
        used[i] = 0;
    }
}`,
  },
  run: ({ items, k }) =>
    trace((t) => {
      const S = [...new Set(String(items).replace(/\s+/g, '').split(''))].slice(0, 5)
      const n = S.length
      const K = Math.floor(k as number)
      if (n < 1) throw new Error('Type a few distinct letters, e.g. ABCD.')
      if (K < 1 || K > n) throw new Error(`k must be between 1 and the number of items (${n}).`)
      let leaves = 1
      for (let i = 0; i < K; i++) leaves *= n - i
      if (leaves > 24) throw new Error(`That is ${leaves} arrangements — too many to draw. Keep n·(n−1)·…·(n−k+1) ≤ 24.`)
      const T = t.tree('tr', { label: `choices for ${K} position${K > 1 ? 's' : ''} from {${S.join(', ')}}` })
      const root = T.node('·', `${n} choices`)
      T.setRoot(root)
      let count = 0
      T.role(root, 'active')
      t.step('pick', `Position 1 can be any of ${n} items. Whatever we pick, position 2 has ${n - 1} left — the count of options never depends on WHICH item was picked, only on how many are used. That is exactly when the product rule applies.`, { count })
      const go = (id: string, prefix: string, used: Set<string>) => {
        if (prefix.length === K) {
          count++
          T.role(id, 'found')
          t.print(prefix)
          t.step('leaf', `"${prefix}" is complete — arrangement #${count}.`, { count })
          return
        }
        for (const x of S) {
          if (used.has(x)) continue
          const c = T.node(x, prefix.length + 1 < K ? `${n - prefix.length - 1} left` : undefined)
          T.addChild(id, c)
          T.keep('found').role(c, 'new').edgeRole(id, c, 'active')
          t.step('pick', `After "${prefix}", choose ${x} for position ${prefix.length + 1} (${n - prefix.length} options at this level).`, { count })
          T.edgeRole(id, c, null)
          go(c, prefix + x, new Set([...used, x]))
        }
      }
      go(root, '', new Set())
      T.keep('found')
      let formula = ''
      for (let i = 0; i < K; i++) formula += (i ? '·' : '') + (n - i)
      t.step('leaf', `${count} leaves = ${formula} = P(${n}, ${K}) = ${n}!/(${n} − ${K})!. Each leaf is one arrangement and each arrangement is one leaf — a bijection, so counting leaves counts arrangements.`, { count })
    }),
}

/* ───────────────────────── 8. Stars and bars ───────────────────────── */

export const mathCountStars: Algorithm = {
  id: 'math-count-stars',
  title: 'Stars and bars: every solution of x₁ + … + x_k = n is a row of stars and bars',
  blurb: 'n identical stars and k − 1 bars in n + k − 1 slots. Choosing which slots hold bars is choosing a solution, so there are C(n + k − 1, k − 1).',
  legend: { pivot: 'bar', active: 'star' },
  inputs: [
    { name: 'n', label: 'total n', type: 'number', default: '4', min: 0, max: 8 },
    { name: 'k', label: 'variables k', type: 'number', default: '3', min: 1, max: 5 },
  ],
  random: () => ({ n: String(rint(2, 5)), k: String(rint(2, 3)) }),
  code: {
    pseudo: `
for each set B of k − 1 slots among n + k − 1       // @place
  xᵢ ← number of stars between bar i−1 and bar i   // @place
  count ← count + 1                                // @place
count = C(n + k − 1, k − 1)                        // @done`,
    cpp: `
// enumerate the bar positions recursively; count = C(n + k - 1, k - 1)
void bars(int slots, int need, int from, vector<int>& pos, long long& count) {
    if (need == 0) { count++; return; }                        // @place
    for (int s = from; s <= slots - need; s++) {
        pos.push_back(s); bars(slots, need - 1, s + 1, pos, count); pos.pop_back();
    }
}
long long starsAndBars(int n, int k) {
    long long count = 0; vector<int> pos;
    bars(n + k - 1, k - 1, 0, pos, count);
    return count;                                              // @done
}`,
    java: `
static long bars(int slots, int need, int from) {
    if (need == 0) return 1;                                   // @place
    long c = 0;
    for (int s = from; s <= slots - need; s++) c += bars(slots, need - 1, s + 1);
    return c;
}
static long starsAndBars(int n, int k) {
    return bars(n + k - 1, k - 1, 0);                          // @done
}`,
    python: `
from itertools import combinations
def solutions(n, k):
    slots = n + k - 1
    for bars in combinations(range(slots), k - 1):           # @place
        cuts = (-1,) + bars + (slots,)
        yield [cuts[i + 1] - cuts[i] - 1 for i in range(k)]  # @place
# len(list(solutions(n, k))) == comb(n + k - 1, k - 1)       # @done`,
    js: `
function* solutions(n, k, from = 0, need = k - 1, bars = []) {
  const slots = n + k - 1;
  if (need === 0) {                                          // @place
    const cuts = [-1, ...bars, slots];
    yield cuts.slice(1).map((c, i) => c - cuts[i] - 1);      // @place
    return;
  }
  for (let s = from; s <= slots - need; s++) yield* solutions(n, k, s + 1, need - 1, [...bars, s]);
}
// [...solutions(n, k)].length === C(n + k - 1, k - 1)       // @done`,
    c: `
long long bars(int slots, int need, int from) {
    if (need == 0) return 1;                                   // @place
    long long c = 0;
    for (int s = from; s <= slots - need; s++) c += bars(slots, need - 1, s + 1);
    return c;
}
long long starsAndBars(int n, int k) { return bars(n + k - 1, k - 1, 0); }   // @done`,
  },
  run: ({ n, k }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      const K = Math.floor(k as number)
      if (N < 0 || K < 1) throw new Error('Use n ≥ 0 and k ≥ 1.')
      const slots = N + K - 1
      let total = 1
      for (let i = 1; i <= K - 1; i++) total = (total * (slots - K + 1 + i)) / i
      if (total > 40) throw new Error(`C(${slots}, ${K - 1}) = ${total} arrangements — too many to watch. Try smaller n or k.`)
      const A = t.array('row', Array(slots).fill(null), { label: `${N} stars and ${K - 1} bar${K === 2 ? '' : 's'} in ${slots} slots` })
      let count = 0
      const vars = (xs: number[] | null) => {
        const v: Record<string, Scalar> = { count }
        for (let i = 0; i < K; i++) v[`x${i + 1}`] = xs ? xs[i] : null
        return v
      }
      t.step('place', `We want non-negative x₁ + … + x_${K} = ${N}. Draw the ${N} units as identical stars and separate the ${K} variables with ${K - 1} bars. Slots: ${slots}.`, vars(null))
      const rec = (from: number, need: number, bars: number[]) => {
        if (need === 0) {
          const cuts = [-1, ...bars, slots]
          const xs = cuts.slice(1).map((c, i) => c - cuts[i] - 1)
          count++
          A.clear()
          for (let s = 0; s < slots; s++) {
            const isBar = bars.includes(s)
            A.set(s, isBar ? '|' : '★')
            A.role(s, isBar ? 'pivot' : 'active')
          }
          t.step('place', `Bars in slots {${bars.join(', ') || '—'}} → (${xs.join(', ')}). Stars before the first bar are x₁, between bars i−1 and i are xᵢ. Different bar sets give different tuples, and every tuple is drawn this way: a bijection.`, vars(xs))
          return
        }
        for (let s = from; s <= slots - need; s++) rec(s + 1, need - 1, [...bars, s])
      }
      rec(0, K - 1, [])
      A.clear()
      t.step('done', `${count} solutions = C(${slots}, ${K - 1}) — choose which ${K - 1} of the ${slots} slots are bars. For positive xᵢ, give each variable one star first: C(n − 1, k − 1).`, { count })
    }),
}

/* ───────────────────────── 9. Lucas' theorem ───────────────────────── */

export const mathCountLucas: Algorithm = {
  id: 'math-count-lucas',
  title: "Lucas' theorem: C(n, k) mod p digit by digit in base p",
  blurb: 'Write n and k in base p. C(n, k) ≡ ∏ C(nᵢ, kᵢ) (mod p), and any kᵢ > nᵢ makes the whole thing 0.',
  legend: { active: 'current digit pair', write: 'C(nᵢ, kᵢ) mod p', removed: 'kᵢ > nᵢ → 0', found: 'answer' },
  inputs: [
    { name: 'n', label: 'n', type: 'number', default: '1000', min: 0, max: 1000000000 },
    { name: 'k', label: 'k', type: 'number', default: '502', min: 0, max: 1000000000 },
    { name: 'p', label: 'small prime p', type: 'number', default: '7', min: 2, max: 97 },
  ],
  random: () => {
    const n = rint(50, 100000)
    return { n: String(n), k: String(rint(0, n)), p: String(pick([2, 3, 5, 7, 11, 13])) }
  },
  code: {
    pseudo: `
function lucas(n, k, p)
  res ← 1                                      // @init
  while n > 0 or k > 0
    nᵢ ← n mod p; kᵢ ← k mod p                 // @digit
    if kᵢ > nᵢ: return 0                       // @zero
    res ← res · C(nᵢ, kᵢ) mod p                // @term
    n ← ⌊n/p⌋; k ← ⌊k/p⌋
  return res                                   // @done`,
    cpp: `
// small[i][j] = C(i, j) mod p for i, j < p (a Pascal table)
long long lucas(long long n, long long k, int p, const vector<vector<int>>& small) {
    long long res = 1;                                          // @init
    while (n > 0 || k > 0) {
        int ni = n % p, ki = k % p;                             // @digit
        if (ki > ni) return 0;                                  // @zero
        res = res * small[ni][ki] % p;                          // @term
        n /= p; k /= p;
    }
    return res;                                                 // @done
}`,
    java: `
static long lucas(long n, long k, int p, int[][] small) {
    long res = 1;                                               // @init
    while (n > 0 || k > 0) {
        int ni = (int) (n % p), ki = (int) (k % p);             // @digit
        if (ki > ni) return 0;                                  // @zero
        res = res * small[ni][ki] % p;                          // @term
        n /= p; k /= p;
    }
    return res;                                                 // @done
}`,
    python: `
def lucas(n, k, p, small):     # small[i][j] = C(i, j) % p
    res = 1                                    # @init
    while n or k:
        ni, ki = n % p, k % p                  # @digit
        if ki > ni:
            return 0                           # @zero
        res = res * small[ni][ki] % p          # @term
        n //= p; k //= p
    return res                                 # @done`,
    js: `
function lucas(n, k, p, small) {
  let res = 1;                                                  // @init
  while (n > 0 || k > 0) {
    const ni = n % p, ki = k % p;                               // @digit
    if (ki > ni) return 0;                                      // @zero
    res = res * small[ni][ki] % p;                              // @term
    n = Math.floor(n / p); k = Math.floor(k / p);
  }
  return res;                                                   // @done
}`,
    c: `
long long lucas(long long n, long long k, int p, int small[][100]) {
    long long res = 1;                                          // @init
    while (n > 0 || k > 0) {
        int ni = n % p, ki = k % p;                             // @digit
        if (ki > ni) return 0;                                  // @zero
        res = res * small[ni][ki] % p;                          // @term
        n /= p; k /= p;
    }
    return res;                                                 // @done
}`,
  },
  run: ({ n, k, p }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      const K = Math.floor(k as number)
      const P = Math.floor(p as number)
      if (!isPrime(P)) throw new Error(`${P} is not prime — Lucas needs a prime.`)
      if (N < 0 || K < 0 || N > 1e9 || K > 1e9) throw new Error('Use 0 ≤ n, k ≤ 10⁹.')
      const small: number[][] = Array.from({ length: P }, () => Array(P).fill(0))
      for (let i = 0; i < P; i++) {
        small[i][0] = 1
        for (let j = 1; j <= i; j++) small[i][j] = (small[i - 1][j - 1] + (j <= i - 1 ? small[i - 1][j] : 0)) % P
      }
      const nd: number[] = []
      const kd: number[] = []
      for (let x = N; x > 0; x = Math.floor(x / P)) nd.push(x % P)
      for (let x = K; x > 0; x = Math.floor(x / P)) kd.push(x % P)
      const L = Math.max(nd.length, kd.length, 1)
      while (nd.length < L) nd.push(0)
      while (kd.length < L) kd.push(0)
      const cols = Array.from({ length: L }, (_, j) => `${P}^${L - 1 - j}`)
      const G = t.grid('dig', [nd.slice().reverse(), kd.slice().reverse(), Array(L).fill(null)], {
        label: `base-${P} digits (most significant on the left)`,
        rowLabels: ['n', 'k', `C(nᵢ,kᵢ) mod ${P}`],
        colLabels: cols,
      })
      let res = 1
      t.step('init', `${N} = (${nd.slice().reverse().join(' ')})₍${P}₎ and ${K} = (${kd.slice().reverse().join(' ')})₍${P}₎. Lucas: C(${N}, ${K}) ≡ product of C(nᵢ, kᵢ) over the digit pairs, mod ${P}.`, { res })
      for (let i = 0; i < L; i++) {
        const c = L - 1 - i
        G.clear().role(0, c, 'active').role(1, c, 'active')
        t.step('digit', `Digit ${i} (weight ${P}^${i}): nᵢ = ${nd[i]}, kᵢ = ${kd[i]}.`, { res, ni: nd[i], ki: kd[i] })
        if (kd[i] > nd[i]) {
          G.set(2, c, 0)
          G.role(2, c, 'removed')
          t.step('zero', `kᵢ = ${kd[i]} > nᵢ = ${nd[i]}, so C(${nd[i]}, ${kd[i]}) = 0 and the whole product is 0: ${P} divides C(${N}, ${K}). (Kummer: a borrow happens when subtracting k from n in base ${P}.)`, { res: 0 })
          return
        }
        const term = small[nd[i]][kd[i]]
        res = (res * term) % P
        G.set(2, c, term)
        G.role(2, c, 'write')
        t.step('term', `C(${nd[i]}, ${kd[i]}) mod ${P} = ${term} (from a ${P}×${P} Pascal table). Running product: ${res}.`, { res, ni: nd[i], ki: kd[i] })
      }
      G.clear()
      for (let c = 0; c < L; c++) G.role(2, c, 'found')
      t.step('done', `C(${N}, ${K}) ≡ ${res} (mod ${P}) after ${L} digit${L > 1 ? 's' : ''} — O(log_p n) lookups instead of a factorial table of size ${N}.`, { answer: res })
    }),
}

/* ───────────────────────── 10. Pascal's triangle ───────────────────────── */

export const mathPascalTable: Algorithm = {
  id: 'math-pascal-table',
  title: "Pascal's triangle: C(i, j) = C(i−1, j−1) + C(i−1, j)",
  blurb: 'Only additions — so it works modulo ANY m, prime or not, and never needs an inverse. O(n²) time for the whole table.',
  legend: { active: 'cell being filled', compare: 'the two cells above it', done: 'edge: C(i, 0) = C(i, i) = 1' },
  inputs: [
    { name: 'n', label: 'rows 0..n', type: 'number', default: '6', min: 1, max: 10 },
    { name: 'm', label: 'modulus m (0 = none)', type: 'number', default: '0', min: 0, max: 1000 },
  ],
  random: () => ({ n: String(rint(4, 8)), m: String(pick([0, 0, 2, 3, 6, 10])) }),
  code: {
    pseudo: `
for i ← 0 to n
  C[i][0] ← C[i][i] ← 1                              // @edge
  for j ← 1 to i − 1
    C[i][j] ← (C[i−1][j−1] + C[i−1][j]) mod m        // @add`,
    cpp: `
vector<vector<long long>> pascal(int n, long long m) {
    vector<vector<long long>> C(n + 1, vector<long long>(n + 1, 0));
    for (int i = 0; i <= n; i++) {
        C[i][0] = C[i][i] = 1 % m;                                  // @edge
        for (int j = 1; j < i; j++)
            C[i][j] = (C[i - 1][j - 1] + C[i - 1][j]) % m;          // @add
    }
    return C;
}`,
    java: `
static long[][] pascal(int n, long m) {
    long[][] C = new long[n + 1][n + 1];
    for (int i = 0; i <= n; i++) {
        C[i][0] = C[i][i] = 1 % m;                                  // @edge
        for (int j = 1; j < i; j++)
            C[i][j] = (C[i - 1][j - 1] + C[i - 1][j]) % m;          // @add
    }
    return C;
}`,
    python: `
def pascal(n, m):
    C = [[0] * (n + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        C[i][0] = C[i][i] = 1 % m                          # @edge
        for j in range(1, i):
            C[i][j] = (C[i - 1][j - 1] + C[i - 1][j]) % m  # @add
    return C`,
    js: `
function pascal(n, m) {
  const C = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= n; i++) {
    C[i][0] = C[i][i] = 1 % m;                                      // @edge
    for (let j = 1; j < i; j++)
      C[i][j] = (C[i - 1][j - 1] + C[i - 1][j]) % m;                // @add
  }
  return C;
}`,
    c: `
#define MAXN 1001
long long C[MAXN][MAXN];
void pascal(int n, long long m) {
    for (int i = 0; i <= n; i++) {
        C[i][0] = C[i][i] = 1 % m;                                  // @edge
        for (int j = 1; j < i; j++)
            C[i][j] = (C[i - 1][j - 1] + C[i - 1][j]) % m;          // @add
    }
}`,
  },
  run: ({ n, m }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      const Mo = Math.floor(m as number)
      if (N < 1 || N > 10) throw new Error('Use 1 ≤ n ≤ 10.')
      if (Mo < 0) throw new Error('Use m ≥ 0 (0 means no modulus).')
      const red = (x: number) => (Mo > 0 ? x % Mo : x)
      const rows: Scalar[][] = Array.from({ length: N + 1 }, () => Array(N + 1).fill(null))
      const G = t.grid('C', rows, {
        label: Mo > 0 ? `C(i, j) mod ${Mo}` : 'C(i, j)',
        rowLabels: Array.from({ length: N + 1 }, (_, i) => `i=${i}`),
        colLabels: Array.from({ length: N + 1 }, (_, j) => `j=${j}`),
      })
      for (let i = 0; i <= N; i++) {
        G.keep('done')
        G.set(i, 0, red(1))
        G.set(i, i, red(1))
        G.role(i, 0, 'done').role(i, i, 'done')
        t.step('edge', i === 0 ? 'Row 0: C(0, 0) = 1 — one way to choose nothing from nothing.' : `Row ${i}: the edges are 1 — one way to take none, one way to take all ${i}.`, { i })
        for (let j = 1; j < i; j++) {
          const a = G.rows[i - 1][j - 1] as number
          const b = G.rows[i - 1][j] as number
          G.set(i, j, red(a + b))
          G.keep('done').role(i, j, 'active').role(i - 1, j - 1, 'compare').role(i - 1, j, 'compare')
          G.arrow([i - 1, j - 1], [i, j], 'take', 'compare').arrow([i - 1, j], [i, j], 'skip', 'compare')
          t.step('add', `C(${i}, ${j}) = C(${i - 1}, ${j - 1}) + C(${i - 1}, ${j}) = ${a} + ${b}${Mo > 0 ? ` ≡ ${red(a + b)} (mod ${Mo})` : ` = ${a + b}`}. Either item ${i} is chosen (pick ${j - 1} more from ${i - 1}) or it is not (pick all ${j} from ${i - 1}).`, { i, j })
        }
      }
      G.keep('done')
      let rowSum = 0
      for (let j = 0; j <= N; j++) rowSum += G.rows[N][j] as number
      t.step('add', Mo > 0
        ? `Done: ${((N + 1) * (N + 2)) / 2} cells, each one addition mod ${Mo}. No division anywhere, so m need not be prime.${Mo === 2 ? ' Mod 2 the triangle draws the Sierpiński pattern.' : ''}`
        : `Done. Row ${N} sums to ${rowSum} = 2^${N}: every subset of ${N} items, grouped by size. ${((N + 1) * (N + 2)) / 2} cells, O(n²) time.`, { 'row sum': rowSum })
    }),
}

/* ───────────────────────── 11. Grid paths and the Catalan restriction ───────────────────────── */

export const mathPascalPaths: Algorithm = {
  id: 'math-pascal-paths',
  title: 'Counting monotone grid paths — free, and never crossing the diagonal',
  blurb: 'paths(r, c) = paths(r−1, c) + paths(r, c−1). Free: C(2n, n). Forbid cells below the diagonal and the corner becomes the Catalan number.',
  legend: { active: 'cell being filled', compare: 'from above / from the left', removed: 'forbidden (below the diagonal)', found: 'answer' },
  inputs: [
    { name: 'n', label: 'grid n × n', type: 'number', default: '4', min: 1, max: 7 },
    { name: 'mode', label: 'mode', type: 'string', default: 'dyck', hint: 'free | dyck' },
  ],
  random: () => ({ n: String(rint(2, 6)), mode: Math.random() < 0.5 ? 'free' : 'dyck' }),
  code: {
    pseudo: `
paths[0][0] ← 1                                         // @start
for r ← 0 to n, c ← 0 to n (row by row)
  if dyck and r > c: paths[r][c] ← 0                    // @block
  else paths[r][c] ← paths[r−1][c] + paths[r][c−1]      // @fill
answer ← paths[n][n]                                    // @done`,
    cpp: `
long long countPaths(int n, bool dyck) {
    vector<vector<long long>> P(n + 1, vector<long long>(n + 1, 0));
    P[0][0] = 1;                                                     // @start
    for (int r = 0; r <= n; r++)
        for (int c = 0; c <= n; c++) {
            if (r == 0 && c == 0) continue;
            if (dyck && r > c) { P[r][c] = 0; continue; }            // @block
            P[r][c] = (r ? P[r - 1][c] : 0) + (c ? P[r][c - 1] : 0); // @fill
        }
    return P[n][n];                                                  // @done
}`,
    java: `
static long countPaths(int n, boolean dyck) {
    long[][] P = new long[n + 1][n + 1];
    P[0][0] = 1;                                                     // @start
    for (int r = 0; r <= n; r++)
        for (int c = 0; c <= n; c++) {
            if (r == 0 && c == 0) continue;
            if (dyck && r > c) { P[r][c] = 0; continue; }            // @block
            P[r][c] = (r > 0 ? P[r - 1][c] : 0) + (c > 0 ? P[r][c - 1] : 0);   // @fill
        }
    return P[n][n];                                                  // @done
}`,
    python: `
def count_paths(n, dyck):
    P = [[0] * (n + 1) for _ in range(n + 1)]
    P[0][0] = 1                                                   # @start
    for r in range(n + 1):
        for c in range(n + 1):
            if r == 0 and c == 0:
                continue
            if dyck and r > c:
                P[r][c] = 0; continue                             # @block
            P[r][c] = (P[r - 1][c] if r else 0) + (P[r][c - 1] if c else 0)   # @fill
    return P[n][n]                                                # @done`,
    js: `
function countPaths(n, dyck) {
  const P = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
  P[0][0] = 1;                                                       // @start
  for (let r = 0; r <= n; r++)
    for (let c = 0; c <= n; c++) {
      if (r === 0 && c === 0) continue;
      if (dyck && r > c) { P[r][c] = 0; continue; }                  // @block
      P[r][c] = (r ? P[r - 1][c] : 0) + (c ? P[r][c - 1] : 0);       // @fill
    }
  return P[n][n];                                                    // @done
}`,
    c: `
long long countPaths(int n, int dyck) {
    long long P[32][32] = {{0}};                                     /* n <= 31 */
    P[0][0] = 1;                                                     // @start
    for (int r = 0; r <= n; r++)
        for (int c = 0; c <= n; c++) {
            if (r == 0 && c == 0) continue;
            if (dyck && r > c) { P[r][c] = 0; continue; }            // @block
            P[r][c] = (r ? P[r - 1][c] : 0) + (c ? P[r][c - 1] : 0); // @fill
        }
    return P[n][n];                                                  // @done
}`,
  },
  run: ({ n, mode }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      const md = String(mode).trim().toLowerCase()
      if (md !== 'free' && md !== 'dyck') throw new Error('Mode must be "free" or "dyck".')
      if (N < 1 || N > 7) throw new Error('Use 1 ≤ n ≤ 7.')
      const dyck = md === 'dyck'
      const rows: Scalar[][] = Array.from({ length: N + 1 }, () => Array(N + 1).fill(null))
      const G = t.grid('P', rows, {
        label: dyck ? 'paths that never go below the diagonal (rows ≤ columns)' : 'paths using right and down steps',
        rowLabels: Array.from({ length: N + 1 }, (_, i) => `r${i}`),
        colLabels: Array.from({ length: N + 1 }, (_, j) => `c${j}`),
      })
      const paint = () => {
        G.clear().role(0, 0, 'done')
        if (dyck) for (let r = 1; r <= N; r++) for (let c = 0; c < r; c++) if (G.rows[r][c] !== null) G.role(r, c, 'removed')
      }
      G.set(0, 0, 1)
      paint()
      t.step('start', `One way to stand at the start. A path takes ${N} right steps and ${N} down steps; each cell is reached from above or from the left.${dyck ? ' In Dyck mode a path may never have taken more downs than rights, so cells with r > c are forbidden.' : ''}`)
      for (let r = 0; r <= N; r++)
        for (let c = 0; c <= N; c++) {
          if (r === 0 && c === 0) continue
          if (dyck && r > c) {
            G.set(r, c, 0)
            paint()
            if (r === c + 1) t.step('block', `(${r}, ${c}) is below the diagonal: 0 paths may pass here.`)
            continue
          }
          const up = r > 0 ? (G.rows[r - 1][c] as number) : 0
          const left = c > 0 ? (G.rows[r][c - 1] as number) : 0
          G.set(r, c, up + left)
          paint()
          G.role(r, c, 'active')
          if (r > 0) G.role(r - 1, c, 'compare').arrow([r - 1, c], [r, c], undefined, 'compare')
          if (c > 0) G.role(r, c - 1, 'compare').arrow([r, c - 1], [r, c], undefined, 'compare')
          t.step('fill', `(${r}, ${c}) = from above ${up} + from the left ${left} = ${up + left}.`, { r, c })
        }
      G.clear().role(N, N, 'found')
      let binom = 1
      for (let i = 1; i <= N; i++) binom = (binom * (N + i)) / i
      t.step('done', dyck
        ? `${G.rows[N][N]} paths = Catalan(${N}) = C(${2 * N}, ${N})/(${N} + 1) = ${binom}/${N + 1}. The reflection argument says the bad paths number C(${2 * N}, ${N + 1}) = ${binom - (G.rows[N][N] as number)}.`
        : `${G.rows[N][N]} paths = C(${2 * N}, ${N}): a path is a word of ${N} R's and ${N} D's, and choosing where the R's go fixes it. The table is Pascal's triangle turned 45°.`, { answer: G.rows[N][N] })
    }),
}

/* ───────────────────────── 12. Catalan numbers by convolution ───────────────────────── */

export const mathPascalCatalan: Algorithm = {
  id: 'math-pascal-catalan',
  title: 'Catalan numbers: Cat(m) = Σ Cat(i)·Cat(m−1−i)',
  blurb: 'Split a structure at its first "return": i pairs inside, m−1−i after. Every Catalan family obeys this convolution.',
  legend: { active: 'Cat(m) being built', compare: 'the two factors of this term', done: 'known' },
  inputs: [{ name: 'n', label: 'up to n', type: 'number', default: '6', min: 1, max: 12 }],
  random: () => ({ n: String(rint(4, 8)) }),
  code: {
    pseudo: `
cat[0] ← 1                                            // @init
for m ← 1 to n
  cat[m] ← 0
  for i ← 0 to m − 1
    cat[m] ← cat[m] + cat[i]·cat[m−1−i]               // @term
// cat[m] = C(2m, m)/(m + 1)                           @done`,
    cpp: `
vector<long long> catalan(int n) {        // exact up to n = 35 in 64 bits
    vector<long long> cat(n + 1, 0);
    cat[0] = 1;                                                   // @init
    for (int m = 1; m <= n; m++)
        for (int i = 0; i < m; i++)
            cat[m] += cat[i] * cat[m - 1 - i];                    // @term
    return cat;                                                   // @done
}`,
    java: `
static long[] catalan(int n) {
    long[] cat = new long[n + 1];
    cat[0] = 1;                                                   // @init
    for (int m = 1; m <= n; m++)
        for (int i = 0; i < m; i++)
            cat[m] += cat[i] * cat[m - 1 - i];                    // @term
    return cat;                                                   // @done
}`,
    python: `
def catalan(n):
    cat = [0] * (n + 1)
    cat[0] = 1                                          # @init
    for m in range(1, n + 1):
        for i in range(m):
            cat[m] += cat[i] * cat[m - 1 - i]           # @term
    return cat                                          # @done`,
    js: `
function catalan(n) {
  const cat = new Array(n + 1).fill(0);
  cat[0] = 1;                                                     // @init
  for (let m = 1; m <= n; m++)
    for (let i = 0; i < m; i++)
      cat[m] += cat[i] * cat[m - 1 - i];                          // @term
  return cat;                                                     // @done
}`,
    c: `
void catalan(int n, long long *cat) {     /* cat has n + 1 slots */
    cat[0] = 1;                                                   // @init
    for (int m = 1; m <= n; m++) {
        cat[m] = 0;
        for (int i = 0; i < m; i++) cat[m] += cat[i] * cat[m - 1 - i];   // @term
    }
}                                                                 // @done`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      if (N < 1 || N > 12) throw new Error('Use 1 ≤ n ≤ 12.')
      const A = t.array('cat', [1, ...Array(N).fill(null)], { label: 'cat[m]' })
      const cat = [1]
      A.role(0, 'done')
      t.step('init', 'cat[0] = 1: exactly one empty structure (the empty string of brackets, the empty tree).', { m: 0 })
      for (let m = 1; m <= N; m++) {
        cat[m] = 0
        A.set(m, 0)
        for (let i = 0; i < m; i++) {
          const j = m - 1 - i
          cat[m] += cat[i] * cat[j]
          A.set(m, cat[m])
          A.clear()
          for (let q = 0; q < m; q++) A.role(q, 'done')
          A.role(i, 'compare').role(j, 'compare').role(m, 'active')
          if (i === j) A.arrow(i, m, `²`, 'compare')
          else A.arrow(i, m, 'inside', 'compare').arrow(j, m, 'after', 'compare')
          t.step('term', `"( A ) B" with ${i} pair${i === 1 ? '' : 's'} inside A and ${j} after in B: cat[${i}]·cat[${j}] = ${cat[i]}·${cat[j]} = ${cat[i] * cat[j]}. Running total cat[${m}] = ${cat[m]}.`, { m, i, term: cat[i] * cat[j] })
        }
      }
      A.clear()
      for (let q = 0; q <= N; q++) A.role(q, 'done')
      t.step('done', `cat = ${cat.join(', ')}. The convolution costs O(n²); the closed form C(2n, n)/(n + 1) gives one value in O(n) — or O(1) with factorial tables.`, { [`cat[${N}]`]: cat[N] })
    }),
}

export const algorithms3: Algorithm[] = [
  mathInvExtEuclid,
  mathInvFermat,
  mathInvTable,
  mathInvFact,
  mathCrtStep,
  mathCrtMerge,
  mathCountTree,
  mathCountStars,
  mathCountLucas,
  mathPascalTable,
  mathPascalPaths,
  mathPascalCatalan,
]
