import { trace } from '../../../engine/tracer'
import type { Algorithm, Scalar } from '../../../engine/types'
import { rint } from '../../../algorithms/util'

/* Math topic — animations, part 4: inclusion–exclusion, probability, number patterns. */

const gcd = (a: number, b: number): number => {
  while (b) [a, b] = [b, a % b]
  return a
}
/** A small seeded generator so a shuffle / sample replays identically for the same seed. */
const rng = (seed: number) => {
  let s = (Math.floor(seed) >>> 0) || 1
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let z = s
    z = Math.imul(z ^ (z >>> 15), z | 1)
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296
  }
}
const r4 = (x: number) => Math.round(x * 10000) / 10000

/* ───────────────────────── 1. PIE on the number line: every element counted once ───────────────────────── */

export const mathPieCountOnce: Algorithm = {
  id: 'math-pie-count-once',
  title: 'Inclusion–exclusion counts every element exactly once',
  blurb: 'Add the singles, subtract the pairs, add the triples… and watch each number’s net count settle at 1.',
  legend: { active: 'multiple of this term’s lcm', write: 'net count changed', found: 'counted once', dim: 'in no set' },
  inputs: [
    { name: 'n', label: 'n (1 … 40)', type: 'number', default: '30', min: 1, max: 40 },
    { name: 'divs', label: 'Divisors (up to 4)', type: 'array', default: '2 3 5', maxLen: 4 },
  ],
  random: () => {
    const pool = [2, 3, 4, 5, 6, 7]
    const k = rint(2, 3)
    const pick = pool.sort(() => Math.random() - 0.5).slice(0, k).sort((a, b) => a - b)
    return { n: String(rint(20, 40)), divs: pick.join(' ') }
  },
  code: {
    pseudo: `
answer ← 0
for each non-empty subset S of the divisors     // @init
  L ← lcm(S); sign ← +1 if |S| odd else −1       // @term
  answer ← answer + sign · ⌊n / L⌋              // @term
return answer                                   // @layer,done`,
    cpp: `
long long countAny(long long n, const vector<long long>& d) {
    long long ans = 0; int k = d.size();             // @init
    for (int mask = 1; mask < (1 << k); mask++) {
        long long L = 1;
        for (int i = 0; i < k; i++) if (mask >> i & 1) L = lcm(L, d[i]);
        int sign = __builtin_popcount(mask) % 2 ? 1 : -1;   // @term
        ans += sign * (n / L);                       // @term
    }
    return ans;                                      // @layer,done
}`,
    java: `
static long countAny(long n, long[] d) {
    long ans = 0; int k = d.length;                  // @init
    for (int mask = 1; mask < (1 << k); mask++) {
        long L = 1;
        for (int i = 0; i < k; i++) if ((mask >> i & 1) == 1) L = L / gcd(L, d[i]) * d[i];
        int sign = Integer.bitCount(mask) % 2 == 1 ? 1 : -1;   // @term
        ans += sign * (n / L);                       // @term
    }
    return ans;                                      // @layer,done
}`,
    python: `
def count_any(n, d):
    ans, k = 0, len(d)                               # @init
    for mask in range(1, 1 << k):
        L = 1
        for i in range(k):
            if mask >> i & 1: L = math.lcm(L, d[i])
        sign = 1 if bin(mask).count('1') % 2 else -1   # @term
        ans += sign * (n // L)                       # @term
    return ans                                       # @layer,done`,
    js: `
function countAny(n, d) {
  let ans = 0; const k = d.length;                   // @init
  for (let mask = 1; mask < (1 << k); mask++) {
    let L = 1, bits = 0;
    for (let i = 0; i < k; i++) if (mask >> i & 1) { L = L / gcd(L, d[i]) * d[i]; bits++; }
    const sign = bits % 2 ? 1 : -1;                  // @term
    ans += sign * Math.floor(n / L);                 // @term
  }
  return ans;                                        // @layer,done
}`,
    c: `
long long countAny(long long n, const long long *d, int k) {
    long long ans = 0;                               // @init
    for (int mask = 1; mask < (1 << k); mask++) {
        long long L = 1; int bits = 0;
        for (int i = 0; i < k; i++) if (mask >> i & 1) { L = L / gcd(L, d[i]) * d[i]; bits++; }
        int sign = bits % 2 ? 1 : -1;                // @term
        ans += sign * (n / L);                       // @term
    }
    return ans;                                      // @layer,done
}`,
  },
  run: ({ n, divs }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      const D = [...new Set((divs as number[]).map((x) => Math.floor(x)))]
      if (N < 1 || N > 40) throw new Error('Choose n between 1 and 40.')
      if (!D.length || D.length > 4 || D.some((x) => x < 2 || x > 40)) throw new Error('Give 1 to 4 distinct divisors between 2 and 40.')
      const X = t.array('x', Array.from({ length: N }, (_, i) => i + 1), { label: 'numbers 1 … n' })
      const C = t.array('net', Array(N).fill(0), { label: 'net count (how many times the formula has counted it)' })
      const k = D.length
      const masks = Array.from({ length: (1 << k) - 1 }, (_, i) => i + 1).sort((a, b) => {
        const pa = a.toString(2).replace(/0/g, '').length
        const pb = b.toString(2).replace(/0/g, '').length
        return pa - pb || a - b
      })
      const inUnion = (x: number) => D.some((d) => x % d === 0)
      const truth = Array.from({ length: N }, (_, i) => i + 1).filter(inUnion).length
      let total = 0
      t.step('init', `Count the numbers in 1…${N} divisible by at least one of ${D.join(', ')}. Every net count starts at 0; the target is 1 for numbers in the union and 0 for the rest.`, { total })
      let layer = 1
      const pc = (m: number) => m.toString(2).replace(/0/g, '').length
      for (const m of masks) {
        const S = D.filter((_, i) => (m >> i) & 1)
        const size = S.length
        if (size !== layer) {
          const over = C.values().filter((v) => (v as number) > 1).length
          const under = C.values().filter((v, i) => (v as number) === 0 && inUnion(i + 1)).length
          X.clear()
          C.clear()
          t.step('layer', `All terms of size ${layer} done. ${over ? `${over} numbers are counted more than once` : 'No number is over-counted'}${under ? ` and ${under} are temporarily at 0` : ''} — the size-${size} terms correct that.`, { total })
          layer = size
        }
        let L = 1
        for (const d of S) L = (L / gcd(L, d)) * d
        const sign = pc(m) % 2 ? 1 : -1
        const term = Math.floor(N / L)
        X.clear()
        C.clear()
        for (let x = L; x <= N; x += L) {
          X.role(x - 1, 'active')
          C.set(x - 1, (C.get(x - 1) as number) + sign)
          C.role(x - 1, 'write')
        }
        total += sign * term
        t.step(
          'term',
          term === 0
            ? `Subset {${S.join(', ')}}: lcm = ${L} > ${N}, so no multiples — the term is 0.`
            : `Subset {${S.join(', ')}}: lcm = ${L}, ${sign > 0 ? 'add' : 'subtract'} ⌊${N}/${L}⌋ = ${term}. Every multiple of ${L} gets ${sign > 0 ? '+1' : '−1'}.`,
          { subset: `{${S.join(',')}}`, lcm: L, sign: sign > 0 ? '+' : '−', term, total },
        )
      }
      X.clear()
      C.clear()
      for (let i = 0; i < N; i++) {
        if (C.get(i) === 1) {
          C.role(i, 'found')
          X.role(i, 'found')
        } else {
          C.role(i, 'dim')
          X.role(i, 'dim')
        }
      }
      t.step('done', `Every number in the union ends at net count exactly 1 and every other at 0, so the signed sum ${total} is the size of the union (direct count: ${truth}). A number lying in j of the sets is counted C(j,1) − C(j,2) + … = 1 − (1 − 1)ʲ = 1 times.`, { total, check: truth })
    }),
}

/* ───────────────────────── 2. Subset enumeration by bitmask, with the lcm cut-off ───────────────────────── */

export const mathPieBitmask: Algorithm = {
  id: 'math-pie-bitmask',
  title: 'Inclusion–exclusion by bitmask: one row per subset',
  blurb: 'Each mask from 1 to 2ᵏ − 1 is one subset. Its lcm decides the term; an lcm above n contributes 0 and must not overflow.',
  legend: { active: 'in this subset', write: 'term just added', removed: 'lcm > n: term is 0' },
  inputs: [
    { name: 'n', label: 'n', type: 'number', default: '1000', min: 1, max: 1e12 },
    { name: 'divs', label: 'Divisors (up to 5)', type: 'array', default: '4 6 10 15', maxLen: 5 },
  ],
  random: () => {
    const pool = [2, 3, 4, 5, 6, 7, 9, 10, 12, 14, 15]
    const pick = pool.sort(() => Math.random() - 0.5).slice(0, rint(3, 4)).sort((a, b) => a - b)
    return { n: String(rint(100, 5000)), divs: pick.join(' ') }
  },
  code: {
    pseudo: `
for mask ← 1 to 2^k − 1                          // @init
  L ← 1
  for each bit i set in mask
    if L / gcd(L, d[i]) > n / d[i]: L ← ∞; break  // @cap
    L ← lcm(L, d[i])
  ans ← ans + (−1)^(popcount(mask)+1) · ⌊n / L⌋   // @term
return ans                                       // @done`,
    cpp: `
long long countAny(long long n, const vector<long long>& d) {
    int k = d.size(); long long ans = 0;                       // @init
    for (int mask = 1; mask < (1 << k); mask++) {
        long long L = 1;
        for (int i = 0; i < k && L <= n; i++) if (mask >> i & 1) {
            long long g = L / __gcd(L, d[i]);
            L = (g > n / d[i]) ? n + 1 : g * d[i];             // @cap
        }
        long long term = n / L;                                // 0 when L > n
        ans += (__builtin_popcount(mask) & 1) ? term : -term;  // @term
    }
    return ans;                                                // @done
}`,
    java: `
static long countAny(long n, long[] d) {
    int k = d.length; long ans = 0;                            // @init
    for (int mask = 1; mask < (1 << k); mask++) {
        long L = 1;
        for (int i = 0; i < k && L <= n; i++) if ((mask >> i & 1) == 1) {
            long g = L / gcd(L, d[i]);
            L = (g > n / d[i]) ? n + 1 : g * d[i];             // @cap
        }
        long term = n / L;
        ans += (Integer.bitCount(mask) & 1) == 1 ? term : -term;   // @term
    }
    return ans;                                                // @done
}`,
    python: `
def count_any(n, d):
    k, ans = len(d), 0                                         # @init
    for mask in range(1, 1 << k):
        L = 1
        for i in range(k):
            if mask >> i & 1:
                L = math.lcm(L, d[i])                          # @cap
                if L > n: break      # Python ints never overflow, but stop early anyway
        term = n // L
        ans += term if bin(mask).count('1') % 2 else -term     # @term
    return ans                                                 # @done`,
    js: `
function countAny(n, d) {          // n up to 2^53: plain numbers are exact
  const k = d.length; let ans = 0;                             // @init
  for (let mask = 1; mask < (1 << k); mask++) {
    let L = 1, bits = 0;
    for (let i = 0; i < k; i++) if (mask >> i & 1) {
      bits++;
      const g = L / gcd(L, d[i]);
      L = g > Math.floor(n / d[i]) ? n + 1 : g * d[i];         // @cap
    }
    const term = Math.floor(n / L);
    ans += bits % 2 ? term : -term;                            // @term
  }
  return ans;                                                  // @done
}`,
    c: `
long long countAny(long long n, const long long *d, int k) {
    long long ans = 0;                                         // @init
    for (int mask = 1; mask < (1 << k); mask++) {
        long long L = 1; int bits = 0;
        for (int i = 0; i < k; i++) if (mask >> i & 1) {
            bits++;
            long long g = L / gcd(L, d[i]);
            L = (g > n / d[i]) ? n + 1 : g * d[i];             // @cap
        }
        long long term = n / L;
        ans += (bits & 1) ? term : -term;                      // @term
    }
    return ans;                                                // @done
}`,
  },
  run: ({ n, divs }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      const D = [...new Set((divs as number[]).map((x) => Math.floor(x)))]
      if (N < 1 || N > 1e12) throw new Error('Choose 1 ≤ n ≤ 10¹².')
      if (!D.length || D.length > 5 || D.some((x) => x < 1 || x > 1e9)) throw new Error('Give 1 to 5 distinct divisors between 1 and 10⁹.')
      const k = D.length
      const A = t.array('d', D, { label: 'divisors d[0…k−1]' })
      const G = t.grid('tab', [], { label: 'one row per subset', colLabels: ['mask', 'subset', 'lcm', 'sign', '⌊n/lcm⌋'] })
      let ans = 0
      t.step('init', `k = ${k} divisors give 2^${k} − 1 = ${(1 << k) - 1} non-empty subsets. Mask bit i set ⇔ d[i] is in the subset.`, { n: N, ans })
      for (let mask = 1; mask < 1 << k; mask++) {
        A.clear()
        const S: number[] = []
        let L = 1
        let capped = false
        for (let i = 0; i < k; i++)
          if ((mask >> i) & 1) {
            A.role(i, 'active')
            S.push(D[i])
            if (capped) continue
            const g = L / gcd(L, D[i])
            if (g > Math.floor(N / D[i])) {
              capped = true
              L = N + 1
            } else L = g * D[i]
          }
        const bits = S.length
        const term = Math.floor(N / L)
        const sign = bits % 2 ? 1 : -1
        ans += sign * term
        G.rows.push([mask.toString(2).padStart(k, '0'), S.join(','), capped ? '> n' : L, sign > 0 ? '+' : '−', capped ? 0 : term])
        const r = G.rows.length - 1
        G.clear()
        for (let c = 0; c < 5; c++) G.role(r, c, capped ? 'removed' : 'write')
        if (capped) {
          t.step('cap', `Mask ${mask.toString(2).padStart(k, '0')} = {${S.join(', ')}}: the lcm would exceed n = ${N}. Check L/gcd > n/d before multiplying — with 64-bit numbers the product could overflow. Term 0.`, { mask, ans })
        } else {
          t.step('term', `Mask ${mask.toString(2).padStart(k, '0')} = {${S.join(', ')}}: lcm = ${L}, ${bits} element${bits > 1 ? 's' : ''} so sign ${sign > 0 ? '+' : '−'}; ${sign > 0 ? 'add' : 'subtract'} ⌊${N}/${L}⌋ = ${term}.`, { mask, lcm: L, ans })
        }
      }
      A.clear()
      G.clear()
      t.step('done', `${(1 << k) - 1} subsets, each costing O(k log) for the lcm: O(2ᵏ·k) in total — independent of n. Numbers ≤ ${N} divisible by at least one divisor: ${ans}.`, { ans })
    }),
}

/* ───────────────────────── 3. Derangements: the recurrence, n! and the 1/e limit ───────────────────────── */

export const mathPieDerange: Algorithm = {
  id: 'math-pie-derange',
  title: 'Derangements: D(n) = (n − 1)(D(n − 1) + D(n − 2))',
  blurb: 'Each D(n) comes from the two rows above it. Next to it, D(n)/n! races to 1/e ≈ 0.3679.',
  legend: { active: 'being computed', compare: 'used by the recurrence', found: 'ratio near 1/e' },
  inputs: [{ name: 'n', label: 'Up to n (2 … 14)', type: 'number', default: '8', min: 2, max: 14 }],
  code: {
    pseudo: `
D[0] ← 1; D[1] ← 0                                   // @base
for n ← 2 to N
  D[n] ← (n − 1) · (D[n − 1] + D[n − 2])  mod p      // @rec
return D[N]                                          // @done`,
    cpp: `
vector<long long> derangements(int N, long long p) {
    vector<long long> D(max(N + 1, 2));
    D[0] = 1 % p; D[1] = 0;                                    // @base
    for (int n = 2; n <= N; n++)
        D[n] = (n - 1) % p * ((D[n - 1] + D[n - 2]) % p) % p;  // @rec
    return D;                                                  // @done
}`,
    java: `
static long[] derangements(int N, long p) {
    long[] D = new long[Math.max(N + 1, 2)];
    D[0] = 1 % p; D[1] = 0;                                    // @base
    for (int n = 2; n <= N; n++)
        D[n] = (n - 1) % p * ((D[n - 1] + D[n - 2]) % p) % p;  // @rec
    return D;                                                  // @done
}`,
    python: `
def derangements(N, p):
    D = [1 % p, 0] + [0] * max(0, N - 1)                       # @base
    for n in range(2, N + 1):
        D[n] = (n - 1) * (D[n - 1] + D[n - 2]) % p             # @rec
    return D                                                   # @done`,
    js: `
function derangements(N, p) {       // BigInt: products exceed 2^53
  const P = BigInt(p), D = [1n % P, 0n];                       // @base
  for (let n = 2; n <= N; n++)
    D[n] = BigInt(n - 1) * (D[n - 1] + D[n - 2]) % P;          // @rec
  return D;                                                    // @done
}`,
    c: `
void derangements(int N, long long p, long long *D) {   /* D has N + 2 slots */
    D[0] = 1 % p; D[1] = 0;                                    // @base
    for (int n = 2; n <= N; n++)
        D[n] = (n - 1) % p * ((D[n - 1] + D[n - 2]) % p) % p;  // @rec
}                                                              // @done`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      if (N < 2 || N > 14) throw new Error('Choose n between 2 and 14.')
      const rows: Scalar[][] = Array.from({ length: N + 1 }, () => [null, null, null])
      const G = t.grid('D', rows, { label: 'derangements', rowLabels: Array.from({ length: N + 1 }, (_, i) => `n=${i}`), colLabels: ['D(n)', 'n!', 'D(n)/n!'] })
      const D = [1, 0]
      const F = [1, 1]
      G.set(0, 0, 1)
      G.set(0, 1, 1)
      G.set(0, 2, 1)
      G.set(1, 0, 0)
      G.set(1, 1, 1)
      G.set(1, 2, 0)
      G.role(0, 0, 'active').role(1, 0, 'active')
      t.step('base', 'D(0) = 1 (the empty arrangement has no fixed point) and D(1) = 0 (one item can only stay in place).')
      for (let k = 2; k <= N; k++) {
        D[k] = (k - 1) * (D[k - 1] + D[k - 2])
        F[k] = F[k - 1] * k
        G.clear().role(k, 0, 'active').role(k - 1, 0, 'compare').role(k - 2, 0, 'compare')
        G.arrow([k - 1, 0], [k, 0], `×${k - 1}`, 'compare').arrow([k - 2, 0], [k, 0], `×${k - 1}`, 'compare')
        G.set(k, 0, D[k])
        G.set(k, 1, F[k])
        const ratio = r4(D[k] / F[k])
        G.set(k, 2, ratio)
        if (Math.abs(D[k] / F[k] - 1 / Math.E) < 0.001) G.role(k, 2, 'found')
        t.step('rec', `Item 1 goes to one of ${k - 1} places j. If j goes back to 1, the other ${k - 2} form a derangement: D(${k - 2}) = ${D[k - 2]}. If not, forbid j from place 1 — that is a derangement of ${k - 1}: D(${k - 1}) = ${D[k - 1]}. So D(${k}) = ${k - 1}·(${D[k - 1]} + ${D[k - 2]}) = ${D[k]}.`, { n: k, 'D(n)': D[k], 'D(n)/n!': ratio })
      }
      G.clear()
      for (let k = 2; k <= N; k++) if (Math.abs(D[k] / F[k] - 1 / Math.E) < 0.001) G.role(k, 2, 'found')
      t.step('done', `D(${N}) = ${D[N]}. The ratio D(n)/n! = Σ (−1)ᵏ/k! converges to 1/e ≈ 0.3679 so fast that D(n) is n!/e rounded to the nearest integer for n ≥ 1. A random permutation is a derangement about 36.8% of the time.`, { 'D(N)': D[N] })
    }),
}

/* ───────────────────────── 4. Linearity of expectation: fixed points of all permutations ───────────────────────── */

export const mathProbFixedPoints: Algorithm = {
  id: 'math-prob-fixed-points',
  title: 'Expected fixed points = 1, read off the columns',
  blurb: 'List every permutation; count fixed points by row (hard) and by column (easy). Each column holds (n − 1)! hits.',
  legend: { found: 'fixed point: p[i] = i', active: 'this permutation', write: 'column total' },
  inputs: [{ name: 'n', label: 'n (2 … 4)', type: 'number', default: '4', min: 2, max: 4 }],
  code: {
    pseudo: `
// X = number of fixed points = I₁ + I₂ + … + Iₙ, where Iᵢ = [p(i) = i]
for each permutation p of 1..n                  // @init
  row ← number of i with p(i) = i                // @perm
  colSum[i] += [p(i) = i] for each i
E[X] ← (Σ rows) / n!  =  Σᵢ colSum[i] / n!  =  n · (n−1)!/n!  =  1   // @done`,
    cpp: `
double expectedFixedPoints(int n) {
    vector<int> p(n); iota(p.begin(), p.end(), 1);
    long long total = 0, perms = 0;                     // @init
    do {
        for (int i = 0; i < n; i++) total += (p[i] == i + 1);   // @perm
        perms++;
    } while (next_permutation(p.begin(), p.end()));
    return (double) total / perms;                      // always 1   @done
}`,
    java: `
static long total = 0, perms = 0;
static void go(int[] p, int k) {                        // all permutations by swapping
    int n = p.length;
    if (k == n) {
        for (int i = 0; i < n; i++) if (p[i] == i + 1) total++;   // @perm
        perms++; return;
    }
    for (int i = k; i < n; i++) {
        int t = p[k]; p[k] = p[i]; p[i] = t;
        go(p, k + 1);
        t = p[k]; p[k] = p[i]; p[i] = t;
    }
}
static double expectedFixedPoints(int n) {
    int[] p = new int[n]; for (int i = 0; i < n; i++) p[i] = i + 1;
    total = 0; perms = 0;                               // @init
    go(p, 0);
    return (double) total / perms;                      // @done
}`,
    python: `
from itertools import permutations
def expected_fixed_points(n):
    total = perms = 0                                   # @init
    for p in permutations(range(1, n + 1)):
        total += sum(p[i] == i + 1 for i in range(n))   # @perm
        perms += 1
    return total / perms                                # @done`,
    js: `
function expectedFixedPoints(n) {
  let total = 0, perms = 0;                             // @init
  const go = (p, used) => {
    if (p.length === n) {
      p.forEach((v, i) => { if (v === i + 1) total++; });   // @perm
      perms++; return;
    }
    for (let v = 1; v <= n; v++) if (!used[v]) { used[v] = true; go([...p, v], used); used[v] = false; }
  };
  go([], []);
  return total / perms;                                 // @done
}`,
    c: `
static long long total, perms;
static void go(int *p, int k, int n) {
    if (k == n) {
        for (int i = 0; i < n; i++) if (p[i] == i + 1) total++;   // @perm
        perms++; return;
    }
    for (int i = k; i < n; i++) {
        int t = p[k]; p[k] = p[i]; p[i] = t;
        go(p, k + 1, n);
        t = p[k]; p[k] = p[i]; p[i] = t;
    }
}
double expectedFixedPoints(int n) {
    int p[12]; for (int i = 0; i < n; i++) p[i] = i + 1;
    total = perms = 0;                                  // @init
    go(p, 0, n);
    return (double) total / perms;                      // @done
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      if (N < 2 || N > 4) throw new Error('Choose n between 2 and 4 (n! rows).')
      const perms: number[][] = []
      const gen = (p: number[]) => {
        if (p.length === N) return void perms.push(p)
        for (let v = 1; v <= N; v++) if (!p.includes(v)) gen([...p, v])
      }
      gen([])
      const colLabels = [...Array.from({ length: N }, (_, i) => `p(${i + 1})`), 'fixed']
      const G = t.grid('perms', [], { label: `all ${perms.length} permutations of 1…${N}`, colLabels })
      const S = t.array('col', Array(N + 1).fill(0), { label: 'column totals: hits at position 1…n, then all fixed points' })
      let total = 0
      t.step('init', `X = the number of fixed points of a random permutation of ${N}. Write X = I₁ + … + I${'ₙ'}, where Iᵢ = 1 when p(i) = i. Fill the table row by row.`, { total })
      for (const p of perms) {
        const fx = p.filter((v, i) => v === i + 1).length
        G.rows.push([...p, fx])
        const r = G.rows.length - 1
        G.clear()
        S.clear()
        for (let c = 0; c <= N; c++) G.role(r, c, 'active')
        p.forEach((v, i) => {
          if (v === i + 1) {
            G.role(r, i, 'found')
            S.set(i, (S.get(i) as number) + 1)
            S.role(i, 'write')
          }
        })
        total += fx
        S.set(N, total)
        if (fx) S.role(N, 'write')
        t.step('perm', `(${p.join(' ')}) has ${fx} fixed point${fx === 1 ? '' : 's'}${fx ? `: position${fx > 1 ? 's' : ''} ${p.map((v, i) => (v === i + 1 ? i + 1 : 0)).filter(Boolean).join(', ')}` : ''}. Rows vary wildly (0 up to ${N}).`, { total, rows: r + 1 })
      }
      G.clear()
      S.clear()
      for (let i = 0; i < N; i++) S.role(i, 'found')
      S.role(N, 'done')
      const f1 = perms.length / N
      t.step('done', `Every column total is ${f1} = (n−1)!: fixing p(i) = i leaves (n−1)! ways for the rest, so P(Iᵢ = 1) = 1/n. Sum of the columns = n·(n−1)! = ${total} = n!, so E[X] = ${total}/${perms.length} = 1 — for every n, with no independence needed (the Iᵢ are dependent!).`, { total, 'E[X]': total / perms.length })
    }),
}

/* ───────────────────────── 5. Reservoir sampling ───────────────────────── */

export const mathProbReservoir: Algorithm = {
  id: 'math-prob-reservoir',
  title: 'Reservoir sampling: k uniform picks from a stream of unknown length',
  blurb: 'Item i (1-based) enters with probability k/i and evicts a uniformly chosen resident.',
  legend: { active: 'arriving item', new: 'entered the reservoir', removed: 'evicted', dim: 'rejected' },
  inputs: [
    { name: 'arr', label: 'Stream', type: 'array', default: '7 3 9 1 5 8 2 6 4', maxLen: 14 },
    { name: 'k', label: 'k (reservoir size)', type: 'number', default: '3', min: 1, max: 6 },
    { name: 'seed', label: 'Random seed', type: 'number', default: '7', min: 1, max: 1e9 },
  ],
  random: () => ({ arr: Array.from({ length: rint(8, 12) }, () => rint(1, 99)).join(' '), k: String(rint(1, 4)), seed: String(rint(1, 100000)) }),
  code: {
    pseudo: `
for i ← 1 to k: R[i] ← x_i                       // @fill
for i ← k + 1, k + 2, …   (each new item x_i)
  j ← uniform random integer in [1, i]          // @draw
  if j ≤ k: R[j] ← x_i     (prob. k/i)           // @replace
  else: discard x_i                              // @skip
return R                                         // @done`,
    cpp: `
vector<int> reservoir(const vector<int>& stream, int k, mt19937& rng) {
    vector<int> R;
    for (int i = 0; i < (int) stream.size(); i++) {
        if (i < k) { R.push_back(stream[i]); continue; }           // @fill
        int j = uniform_int_distribution<int>(0, i)(rng);         // @draw
        if (j < k) R[j] = stream[i];                               // @replace
    }                                                              // @skip
    return R;                                                      // @done
}`,
    java: `
static int[] reservoir(int[] stream, int k, java.util.Random rng) {
    int[] R = new int[k];
    for (int i = 0; i < stream.length; i++) {
        if (i < k) { R[i] = stream[i]; continue; }                // @fill
        int j = rng.nextInt(i + 1);                                // @draw
        if (j < k) R[j] = stream[i];                               // @replace
    }                                                              // @skip
    return R;                                                      // @done
}`,
    python: `
import random
def reservoir(stream, k):
    R = []
    for i, x in enumerate(stream):
        if i < k:
            R.append(x); continue                                  # @fill
        j = random.randint(0, i)                                   # @draw
        if j < k:
            R[j] = x                                               # @replace
        # else: x is skipped                                         @skip
    return R                                                       # @done`,
    js: `
function reservoir(stream, k) {
  const R = [];
  stream.forEach((x, i) => {
    if (i < k) { R.push(x); return; }                              // @fill
    const j = Math.floor(Math.random() * (i + 1));                 // @draw
    if (j < k) R[j] = x;                                           // @replace
  });                                                              // @skip
  return R;                                                        // @done
}`,
    c: `
/* rand() % (i + 1) has a tiny bias; fine for teaching, use a better RNG in production */
void reservoir(const int *stream, int n, int k, int *R) {
    for (int i = 0; i < n; i++) {
        if (i < k) { R[i] = stream[i]; continue; }                // @fill
        int j = rand() % (i + 1);                                  // @draw
        if (j < k) R[j] = stream[i];                               // @replace
    }                                                              // @skip
}                                                                  // @done`,
  },
  run: ({ arr, k, seed }) =>
    trace((t) => {
      const xs = arr as number[]
      const K = Math.floor(k as number)
      if (!xs.length) throw new Error('Give a stream of at least one number.')
      if (K < 1 || K > 6) throw new Error('k must be between 1 and 6.')
      const rand = rng(seed as number)
      const S = t.array('s', xs, { label: 'stream (arrives left to right; we never know how long it is)' })
      const R = t.array('r', [], { label: `reservoir (k = ${K})`, capacity: K })
      for (let i = 0; i < xs.length; i++) {
        S.clear().ptr('i', i).role(i, 'active')
        for (let q = 0; q < i; q++) S.role(q, 'dim')
        R.clear()
        const pos = i + 1
        if (i < K) {
          R.push(xs[i])
          R.role(i, 'new')
          t.step('fill', `Item ${pos} (${xs[i]}): the reservoir is not full yet, keep it. With ${pos} items seen, everything is kept — probability ${Math.min(K, pos)}/${pos} = 1 each.`, { i: pos, 'P(keep)': 1 })
          continue
        }
        const j = Math.floor(rand() * pos)
        t.step('draw', `Item ${pos} (${xs[i]}): draw j uniformly from 0…${i}. It enters iff j < ${K}, i.e. with probability ${K}/${pos} = ${r4(K / pos)}. Drew j = ${j}.`, { i: pos, j, 'P(keep)': r4(K / pos) })
        if (j < K) {
          const old = R.get(j)
          R.set(j, xs[i])
          R.role(j, 'new')
          t.step('replace', `j = ${j} < ${K}: ${xs[i]} replaces slot ${j} (${old}). Each resident was evicted with probability (k/i)·(1/k) = 1/${pos}, so it survives with (${pos - 1})/${pos}.`, { i: pos, j })
        } else {
          S.role(i, 'dim')
          t.step('skip', `j = ${j} ≥ ${K}: ${xs[i]} is discarded; the reservoir is unchanged.`, { i: pos, j })
        }
      }
      S.clear().ptr('i', null)
      R.clear()
      for (let q = 0; q < R.length; q++) R.role(q, 'found')
      t.step('done', `Stream over after n = ${xs.length} items. By induction every item is in the reservoir with probability k/n = ${K}/${xs.length} = ${r4(K / Math.max(K, xs.length))}, using O(k) memory and one pass. Change the seed to see a different (equally likely) sample.`, { n: xs.length })
    }),
}

/* ───────────────────────── 6. Fisher–Yates shuffle ───────────────────────── */

export const mathProbFisherYates: Algorithm = {
  id: 'math-prob-fisher-yates',
  title: 'Fisher–Yates shuffle: every one of n! orders equally likely',
  blurb: 'Fill positions from the back: slot i gets a uniformly random element of the not-yet-placed prefix 0…i.',
  legend: { active: 'slot i being filled', compare: 'random pick j', done: 'final (placed)', window: 'still unplaced' },
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '1 2 3 4 5 6 7', maxLen: 12 },
    { name: 'seed', label: 'Random seed', type: 'number', default: '42', min: 1, max: 1e9 },
  ],
  random: () => ({ arr: Array.from({ length: rint(5, 9) }, (_, i) => i + 1).join(' '), seed: String(rint(1, 100000)) }),
  code: {
    pseudo: `
for i ← n − 1 downto 1                          // @init
  j ← uniform random integer in [0, i]          // @pick
  swap a[i], a[j]                               // @swap
// a[i..n−1] is final after each step             @done`,
    cpp: `
void shuffle(vector<int>& a, mt19937& rng) {
    for (int i = (int) a.size() - 1; i > 0; i--) {             // @init
        int j = uniform_int_distribution<int>(0, i)(rng);      // @pick
        swap(a[i], a[j]);                                      // @swap
    }
}                                                              // @done`,
    java: `
static void shuffle(int[] a, java.util.Random rng) {
    for (int i = a.length - 1; i > 0; i--) {                   // @init
        int j = rng.nextInt(i + 1);                            // @pick
        int t = a[i]; a[i] = a[j]; a[j] = t;                   // @swap
    }
}                                                              // @done`,
    python: `
import random
def shuffle(a):
    for i in range(len(a) - 1, 0, -1):                         # @init
        j = random.randint(0, i)                               # @pick
        a[i], a[j] = a[j], a[i]                                # @swap
                                                               # @done`,
    js: `
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {                     // @init
    const j = Math.floor(Math.random() * (i + 1));             // @pick
    [a[i], a[j]] = [a[j], a[i]];                               // @swap
  }
}                                                              // @done`,
    c: `
void shuffle(int *a, int n) {
    for (int i = n - 1; i > 0; i--) {                          // @init
        int j = rand() % (i + 1);   /* slightly biased: see the pitfall */   // @pick
        int t = a[i]; a[i] = a[j]; a[j] = t;                   // @swap
    }
}                                                              // @done`,
  },
  run: ({ arr, seed }) =>
    trace((t) => {
      const xs = arr as number[]
      if (xs.length < 2) throw new Error('Give at least two numbers.')
      const rand = rng(seed as number)
      const A = t.array('a', xs, { label: 'a' })
      const n = xs.length
      let ways = 1
      A.range([{ from: 0, to: n - 1, role: 'window', label: 'unplaced' }])
      t.step('init', `n = ${n}. Work from the back: position i will receive a uniformly random element among the i + 1 still unplaced.`, { ways })
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        A.clear()
        for (let q = i + 1; q < n; q++) A.role(q, 'done')
        A.role(i, 'active').role(j, 'compare').ptr('i', i).ptr('j', j)
        A.range([{ from: 0, to: i, role: 'window', label: `${i + 1} choices` }])
        ways *= i + 1
        t.step('pick', `i = ${i}: draw j uniformly from 0…${i} (${i + 1} equally likely choices). Drew j = ${j}${j === i ? ' — the element stays where it is, which must be allowed' : ''}.`, { i, j, ways })
        A.swap(i, j)
        A.clear()
        for (let q = i; q < n; q++) A.role(q, 'done')
        if (j !== i) A.role(j, 'swap')
        if (j !== i) A.arrow(j, i, 'swap', 'swap')
        A.range(i - 1 >= 0 ? [{ from: 0, to: i - 1, role: 'window', label: 'unplaced' }] : [])
        t.step('swap', `Swap a[${i}] and a[${j}]: a[${i}] = ${A.get(i)} is now final.`, { i, j, ways })
      }
      A.clear().ptr('i', null).ptr('j', null).range([])
      for (let q = 0; q < n; q++) A.role(q, 'done')
      t.step('done', `The choices multiply: ${Array.from({ length: n - 1 }, (_, q) => n - q).join('·')} = ${ways} = ${n}! equally likely runs, and each run gives a different permutation — so every permutation has probability exactly 1/${n}!.`, { ways })
    }),
}

/* ───────────────────────── 7. ⌊n/i⌋ in O(√n) blocks ───────────────────────── */

export const mathPatFloorBlocks: Algorithm = {
  id: 'math-pat-floor-blocks',
  title: 'Σ ⌊n/i⌋ in O(√n): jump over blocks of equal quotients',
  blurb: 'For a block starting at l with quotient q = ⌊n/l⌋, the last index with the same quotient is r = ⌊n/q⌋.',
  legend: { window: 'current block', active: 'block start l', done: 'summed' },
  inputs: [{ name: 'n', label: 'n (1 … 60)', type: 'number', default: '30', min: 1, max: 60 }],
  random: () => ({ n: String(rint(12, 60)) }),
  code: {
    pseudo: `
sum ← 0; l ← 1                                     // @init
while l ≤ n
  q ← ⌊n / l⌋; r ← ⌊n / q⌋                         // @block
  sum ← sum + q · (r − l + 1); l ← r + 1           // @add
return sum                                         // @done`,
    cpp: `
long long floorSum(long long n) {
    long long sum = 0;                                         // @init
    for (long long l = 1, r; l <= n; l = r + 1) {
        long long q = n / l; r = n / q;                        // @block
        sum += q * (r - l + 1);                                // @add
    }
    return sum;                                                // @done
}`,
    java: `
static long floorSum(long n) {
    long sum = 0;                                              // @init
    for (long l = 1, r; l <= n; l = r + 1) {
        long q = n / l; r = n / q;                             // @block
        sum += q * (r - l + 1);                                // @add
    }
    return sum;                                                // @done
}`,
    python: `
def floor_sum(n):
    s, l = 0, 1                                                # @init
    while l <= n:
        q = n // l; r = n // q                                 # @block
        s += q * (r - l + 1); l = r + 1                        # @add
    return s                                                   # @done`,
    js: `
function floorSum(n) {            // exact while the sum stays below 2^53
  let sum = 0;                                                 // @init
  for (let l = 1, r; l <= n; l = r + 1) {
    const q = Math.floor(n / l); r = Math.floor(n / q);        // @block
    sum += q * (r - l + 1);                                    // @add
  }
  return sum;                                                  // @done
}`,
    c: `
long long floorSum(long long n) {
    long long sum = 0;                                         // @init
    for (long long l = 1, r; l <= n; l = r + 1) {
        long long q = n / l; r = n / q;                        // @block
        sum += q * (r - l + 1);                                // @add
    }
    return sum;                                                // @done
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      if (N < 1 || N > 60) throw new Error('Choose n between 1 and 60.')
      const A = t.array('q', Array.from({ length: N }, (_, i) => Math.floor(N / (i + 1))), { label: `⌊${N}/i⌋ for i = 1 … ${N}` })
      const m = t.meter('blocks', 'Loop iterations', [
        { label: '2√n', value: Math.round(2 * Math.sqrt(N) * 100) / 100 },
        { label: 'n (naive loop)', value: N },
      ])
      let sum = 0
      t.step('init', `The naive loop does ${N} divisions. But the quotients repeat in long runs — only a few distinct values exist.`, { sum })
      for (let l = 1, r = 0; l <= N; l = r + 1) {
        const q = Math.floor(N / l)
        r = Math.floor(N / q)
        A.clear().ptr('l', l - 1).ptr('r', r - 1).role(l - 1, 'active')
        A.range([{ from: l - 1, to: r - 1, role: 'window', label: `q = ${q}` }])
        m.add(1)
        t.step('block', `l = ${l}: q = ⌊${N}/${l}⌋ = ${q}. The largest i with ⌊${N}/i⌋ = ${q} is r = ⌊${N}/${q}⌋ = ${r}, since i·${q} ≤ ${N} ⇔ i ≤ ${N}/${q}.`, { l, q, r, sum })
        sum += q * (r - l + 1)
        for (let i = l - 1; i < r; i++) A.role(i, 'done')
        t.step('add', `Add ${q} × (${r} − ${l} + 1) = ${q * (r - l + 1)} in one step. Jump to l = ${r + 1}.`, { l, q, r, sum })
      }
      A.clear().ptr('l', null).ptr('r', null).range([])
      m.role = 'done'
      t.step('done', `Σ ⌊${N}/i⌋ = ${sum} with ${m.value} iterations instead of ${N}. For i ≤ √n there are ≤ √n quotients; for i > √n the quotient is < √n, so ≤ √n more values: at most 2√n ≈ ${Math.round(2 * Math.sqrt(N) * 10) / 10} blocks.`, { sum, blocks: m.value })
    }),
}

/* ───────────────────────── 8. Integer square root by Newton's method ───────────────────────── */

export const mathPatIsqrt: Algorithm = {
  id: 'math-pat-isqrt',
  title: 'Exact integer square root by Newton’s method',
  blurb: 'x ← ⌊(x + ⌊n/x⌋)/2⌋ decreases strictly while x > ⌊√n⌋, then stops — all in integers, no floating point.',
  legend: { active: 'current x', found: '⌊√n⌋' },
  inputs: [{ name: 'n', label: 'n (0 … 10¹⁵)', type: 'number', default: '1000', min: 0, max: 1e15 }],
  random: () => ({ n: String(rint(2, 10 ** rint(2, 9))) }),
  code: {
    pseudo: `
function isqrt(n)
  if n < 2: return n
  x ← n                                          // @init
  loop
    y ← ⌊(x + ⌊n / x⌋) / 2⌋                       // @iter
    if y ≥ x: return x                           // @done
    x ← y                                        // @iter`,
    cpp: `
unsigned long long isqrt(unsigned long long n) {
    if (n < 2) return n;
    unsigned long long x = n;                                  // @init
    for (;;) {
        unsigned long long y = x / 2 + (n / x) / 2 + (x % 2 + (n / x) % 2) / 2;   // (x + n/x)/2 without overflow   @iter
        if (y >= x) return x;                                  // @done
        x = y;                                                 // @iter
    }
}`,
    java: `
static long isqrt(long n) {          // n ≥ 0
    if (n < 2) return n;
    long x = n;                                                // @init
    for (;;) {
        long y = (x + n / x) >>> 1;  // unsigned shift: x + n/x ≤ 2^64 − 1 cannot lose the top bit   @iter
        if (y >= x) return x;                                  // @done
        x = y;                                                 // @iter
    }
}`,
    python: `
def isqrt(n):                  # math.isqrt(n) does exactly this, built in
    if n < 2:
        return n
    x = n                                                      # @init
    while True:
        y = (x + n // x) // 2                                  # @iter
        if y >= x:
            return x                                           # @done
        x = y                                                  # @iter`,
    js: `
function isqrt(n) {                 // BigInt in, BigInt out — exact for any size
  if (n < 2n) return n;
  let x = n;                                                   // @init
  for (;;) {
    const y = (x + n / x) / 2n;                                // @iter
    if (y >= x) return x;                                      // @done
    x = y;                                                     // @iter
  }
}`,
    c: `
unsigned long long isqrt(unsigned long long n) {
    if (n < 2) return n;
    unsigned long long x = n;                                  // @init
    for (;;) {
        unsigned long long y = x / 2 + (n / x) / 2 + (x % 2 + (n / x) % 2) / 2;   // @iter
        if (y >= x) return x;                                  // @done
        x = y;                                                 // @iter
    }
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      if (!(N >= 0 && N <= 1e15)) throw new Error('Choose 0 ≤ n ≤ 10¹⁵.')
      const A = t.array('xs', [], { label: 'successive x' })
      if (N < 2) {
        A.push(N)
        A.role(0, 'found')
        t.step('init', `n = ${N} < 2 is its own square root.`, { n: N })
        t.step('done', `⌊√${N}⌋ = ${N}.`, { n: N, root: N })
        return
      }
      let x = N
      A.push(x)
      A.role(0, 'active')
      t.step('init', `Start at x = n = ${N}, which is ≥ √n. Newton’s step for f(x) = x² − n is x ← (x + n/x)/2; we take floors at every step.`, { n: N, x })
      for (;;) {
        const y = Math.floor((x + Math.floor(N / x)) / 2)
        if (y >= x) {
          A.clear().role(A.length - 1, 'found')
          t.step('done', `y = ${y} ≥ x = ${x}: stop. ⌊√${N}⌋ = ${x} (check: ${x}² = ${x * x} ≤ ${N} < ${(x + 1) * (x + 1)} = ${x + 1}²). ${x * x === N ? `${N} is a perfect square.` : `${N} is not a perfect square.`}`, { n: N, x, y, root: x })
          return
        }
        x = y
        A.clear()
        A.push(x)
        A.role(A.length - 1, 'active')
        t.step('iter', `y = ⌊(x + ⌊n/x⌋)/2⌋ = ${y} < previous x, so continue with x = ${y}. ${A.length > 3 && y < 2 * Math.sqrt(N) ? 'Close to the root, the number of correct digits roughly doubles each step.' : 'Far from the root each step about halves x.'}`, { n: N, x, y })
      }
    }),
}

/* ───────────────────────── 9. Base conversion (including negative bases) ───────────────────────── */

export const mathPatBase: Algorithm = {
  id: 'math-pat-base',
  title: 'Base conversion by repeated division (also base −2)',
  blurb: 'Each division peels off the lowest digit. Digits come out least significant first — read the stack top-down.',
  legend: { new: 'digit just produced', active: 'current n' },
  inputs: [
    { name: 'n', label: 'n', type: 'number', default: '2026', min: -1e9, max: 1e9 },
    { name: 'b', label: 'Base (2…16 or −2…−16)', type: 'number', default: '3', min: -16, max: 16 },
  ],
  random: () => ({ n: String(rint(1, 5000)), b: String([2, 3, 5, 8, 16, -2, -3][rint(0, 6)]) }),
  code: {
    pseudo: `
function toBase(n, b)                  // |b| ≥ 2
  if n = 0: return "0"
  digits ← []                                     // @init
  while n ≠ 0
    r ← n mod b; n ← n div b   (truncating)       // @div
    if r < 0: r ← r + |b|; n ← n + 1              // @fix
    digits.push(r)                                // @push
  return digits reversed                          // @done`,
    cpp: `
string toBase(long long n, int b) {                     // 2 ≤ |b| ≤ 16
    const char* D = "0123456789ABCDEF";
    if (n == 0) return "0";
    string s; bool neg = (b > 0 && n < 0);                     // @init
    if (neg) n = -n;
    while (n != 0) {
        long long r = n % b; n /= b;                           // @div
        if (r < 0) { r += (b < 0 ? -b : b); n += 1; }          // only for b < 0   @fix
        s.push_back(D[r]);                                     // @push
    }
    if (neg) s.push_back('-');
    return string(s.rbegin(), s.rend());                       // @done
}`,
    java: `
static String toBase(long n, int b) {
    String D = "0123456789ABCDEF";
    if (n == 0) return "0";
    StringBuilder s = new StringBuilder(); boolean neg = (b > 0 && n < 0);   // @init
    if (neg) n = -n;
    while (n != 0) {
        long r = n % b; n /= b;                                // @div
        if (r < 0) { r += Math.abs(b); n += 1; }               // @fix
        s.append(D.charAt((int) r));                           // @push
    }
    if (neg) s.append('-');
    return s.reverse().toString();                             // @done
}`,
    python: `
def to_base(n, b):
    D = "0123456789ABCDEF"
    if n == 0:
        return "0"
    s, neg = [], (b > 0 and n < 0)                             # @init
    if neg: n = -n
    while n != 0:
        n, r = divmod(n, b)        # Python: r has the sign of b   @div
        if r < 0:
            r -= b; n += 1         # b < 0 here, so r - b = r + |b|  @fix
        s.append(D[r])                                         # @push
    return ('-' if neg else '') + ''.join(reversed(s))         # @done`,
    js: `
function toBase(n, b) {
  const D = '0123456789ABCDEF';
  if (n === 0) return '0';
  const s = []; const neg = b > 0 && n < 0;                    // @init
  if (neg) n = -n;
  while (n !== 0) {
    let r = n % b; n = Math.trunc(n / b);                      // @div
    if (r < 0) { r += Math.abs(b); n += 1; }                   // @fix
    s.push(D[r]);                                              // @push
  }
  return (neg ? '-' : '') + s.reverse().join('');              // @done
}`,
    c: `
/* writes n in base b (2 ≤ |b| ≤ 16) into out; returns out */
char *toBase(long long n, int b, char *out) {
    const char *D = "0123456789ABCDEF"; char tmp[80]; int k = 0;
    if (n == 0) { strcpy(out, "0"); return out; }
    int neg = (b > 0 && n < 0);                                // @init
    if (neg) n = -n;
    while (n != 0) {
        long long r = n % b; n /= b;                           // @div
        if (r < 0) { r += (b < 0 ? -b : b); n += 1; }          // @fix
        tmp[k++] = D[r];                                       // @push
    }
    int p = 0; if (neg) out[p++] = '-';
    while (k) out[p++] = tmp[--k];
    out[p] = '\\0'; return out;                                // @done
}`,
  },
  run: ({ n, b }) =>
    trace((t) => {
      let N = Math.trunc(n as number)
      const B = Math.trunc(b as number)
      if (Math.abs(B) < 2 || Math.abs(B) > 16) throw new Error('The base must be 2…16 or −2…−16.')
      if (Math.abs(N) > 1e9) throw new Error('Keep |n| ≤ 10⁹.')
      const Dg = '0123456789ABCDEF'
      const S = t.stack('digits', 'digits (top = most significant)')
      const orig = N
      if (N === 0) {
        S.push('0')
        t.step('init', 'n = 0 is written "0" in every base.', { n: 0 })
        t.step('done', 'Result: 0.', { result: '0' })
        return
      }
      const neg = B > 0 && N < 0
      if (neg) N = -N
      t.step('init', `Write ${orig} in base ${B}. ${neg ? 'For a positive base, convert |n| and put a minus sign in front. ' : ''}Each step: digit = n mod ${B}, then n ← n div ${B}.${B < 0 ? ' A negative base needs no sign at all: every integer has a unique base-' + B + ' representation with digits 0…' + (-B - 1) + '.' : ''}`, { n: N })
      let step = 0
      while (N !== 0) {
        let r = N % B
        let q = Math.trunc(N / B)
        S.clear()
        t.step('div', `${N} = ${B}·(${q}) + (${r}).`, { n: N, q, r })
        if (r < 0) {
          r += Math.abs(B)
          q += 1
          t.step('fix', `The remainder is negative, which is not a digit. Add |b| = ${Math.abs(B)} to it and 1 to the quotient: ${N} = ${B}·(${q}) + ${r} still holds, since ${B}·1 + ${Math.abs(B)} = 0.`, { n: N, q, r })
        }
        S.push(Dg[r])
        S.role(S.length - 1, 'new')
        N = q
        step++
        t.step('push', `Digit ${Dg[r]} is digit ${step - 1} (weight ${B}^${step - 1}). Continue with n = ${N}.`, { n: N, digit: Dg[r] })
      }
      const res = (neg ? '-' : '') + S.items.map((c) => c.v).reverse().join('')
      S.clear()
      t.step('done', `n reached 0 after ${step} divisions (about log_|b| |n|). Reading the stack from the top: ${orig} = ${res} in base ${B}.`, { result: res })
    }),
}

/* ───────────────────────── 10. Big-number multiplication on digit strings ───────────────────────── */

export const mathPatBigMul: Algorithm = {
  id: 'math-pat-bigmul',
  title: 'Multiplying digit strings: school method, carries last',
  blurb: 'Digit a[i]·b[j] lands in res[i + j + 1]. Accumulate all products, then sweep the carries right to left.',
  legend: { active: 'digits multiplied', write: 'cell receiving the product', compare: 'carry target' },
  inputs: [
    { name: 'a', label: 'a (digits)', type: 'string', default: '1234' },
    { name: 'b', label: 'b (digits)', type: 'string', default: '567' },
  ],
  random: () => {
    const d = (k: number) => String(rint(1, 9)) + Array.from({ length: k - 1 }, () => rint(0, 9)).join('')
    return { a: d(rint(2, 5)), b: d(rint(2, 4)) }
  },
  code: {
    pseudo: `
res ← array of |a| + |b| zeros                     // @init
for i ← |a|−1 downto 0, j ← |b|−1 downto 0
  res[i + j + 1] += a[i] · b[j]                    // @mul
for k ← |res|−1 downto 1
  res[k−1] += ⌊res[k] / 10⌋; res[k] ← res[k] mod 10   // @carry
strip leading zeros                                // @done`,
    cpp: `
string multiply(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<long long> res(n + m, 0);                           // @init
    for (int i = n - 1; i >= 0; i--)
        for (int j = m - 1; j >= 0; j--)
            res[i + j + 1] += (a[i] - '0') * (b[j] - '0');     // @mul
    for (int k = n + m - 1; k > 0; k--) {
        res[k - 1] += res[k] / 10; res[k] %= 10;               // @carry
    }
    string s; for (long long d : res) if (!(s.empty() && d == 0)) s += char('0' + d);
    return s.empty() ? "0" : s;                                // @done
}`,
    java: `
static String multiply(String a, String b) {
    int n = a.length(), m = b.length();
    long[] res = new long[n + m];                              // @init
    for (int i = n - 1; i >= 0; i--)
        for (int j = m - 1; j >= 0; j--)
            res[i + j + 1] += (a.charAt(i) - '0') * (b.charAt(j) - '0');   // @mul
    for (int k = n + m - 1; k > 0; k--) {
        res[k - 1] += res[k] / 10; res[k] %= 10;               // @carry
    }
    StringBuilder s = new StringBuilder();
    for (long d : res) if (!(s.length() == 0 && d == 0)) s.append(d);
    return s.length() == 0 ? "0" : s.toString();               // @done
}`,
    python: `
def multiply(a, b):
    n, m = len(a), len(b)
    res = [0] * (n + m)                                        # @init
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            res[i + j + 1] += int(a[i]) * int(b[j])            # @mul
    for k in range(n + m - 1, 0, -1):
        res[k - 1] += res[k] // 10; res[k] %= 10               # @carry
    s = ''.join(map(str, res)).lstrip('0')
    return s or '0'                                            # @done`,
    js: `
function multiply(a, b) {
  const n = a.length, m = b.length;
  const res = new Array(n + m).fill(0);                        // @init
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      res[i + j + 1] += (+a[i]) * (+b[j]);                     // @mul
  for (let k = n + m - 1; k > 0; k--) {
    res[k - 1] += Math.floor(res[k] / 10); res[k] %= 10;       // @carry
  }
  const s = res.join('').replace(/^0+/, '');
  return s || '0';                                             // @done
}`,
    c: `
/* out must hold strlen(a) + strlen(b) + 1 chars */
void multiply(const char *a, const char *b, char *out) {
    int n = strlen(a), m = strlen(b);
    long long *res = calloc(n + m, sizeof *res);               // @init
    for (int i = n - 1; i >= 0; i--)
        for (int j = m - 1; j >= 0; j--)
            res[i + j + 1] += (a[i] - '0') * (b[j] - '0');     // @mul
    for (int k = n + m - 1; k > 0; k--) {
        res[k - 1] += res[k] / 10; res[k] %= 10;               // @carry
    }
    int p = 0, k = 0;
    while (k < n + m - 1 && res[k] == 0) k++;
    for (; k < n + m; k++) out[p++] = '0' + res[k];
    out[p] = '\\0'; free(res);                                  // @done
}`,
  },
  run: ({ a, b }) =>
    trace((t) => {
      const X = String(a).trim()
      const Y = String(b).trim()
      if (!/^\d{1,6}$/.test(X) || !/^\d{1,5}$/.test(Y)) throw new Error('Type a with up to 6 digits and b with up to 5 digits.')
      const n = X.length
      const m = Y.length
      const A = t.array('a', [...X].map(Number), { label: 'a' })
      const B = t.array('b', [...Y].map(Number), { label: 'b' })
      const R = t.array('res', Array(n + m).fill(0), { label: 'res (index i + j + 1 receives a[i]·b[j])' })
      t.step('init', `A ${n}-digit times ${m}-digit product has at most ${n + m} digits, so res has ${n + m} cells, all 0.`)
      for (let i = n - 1; i >= 0; i--)
        for (let j = m - 1; j >= 0; j--) {
          const p = Number(X[i]) * Number(Y[j])
          R.set(i + j + 1, (R.get(i + j + 1) as number) + p)
          A.clear().role(i, 'active')
          B.clear().role(j, 'active')
          R.clear().role(i + j + 1, 'write')
          t.step('mul', `a[${i}]·b[${j}] = ${X[i]}·${Y[j]} = ${p} goes to res[${i + j + 1}] (place value 10^${n - 1 - i + (m - 1 - j)}). Cells may exceed 9 for now.`, { i, j })
        }
      A.clear()
      B.clear()
      for (let k = n + m - 1; k > 0; k--) {
        const v = R.get(k) as number
        const c = Math.floor(v / 10)
        R.set(k - 1, (R.get(k - 1) as number) + c)
        R.set(k, v % 10)
        R.clear().role(k, 'done').role(k - 1, 'compare')
        if (c) R.arrow(k, k - 1, `+${c}`, 'compare')
        t.step('carry', `res[${k}] = ${v}: keep ${v % 10}, carry ${c} into res[${k - 1}].`, { k, carry: c })
      }
      const s = R.values().join('').replace(/^0+/, '') || '0'
      R.clear()
      t.step('done', `Strip leading zeros: ${X} × ${Y} = ${s}. Cost: ${n}·${m} = ${n * m} digit products — Θ(n·m).`, { result: s })
    }),
}

export const algorithms4: Algorithm[] = [
  mathPieCountOnce,
  mathPieBitmask,
  mathPieDerange,
  mathProbFixedPoints,
  mathProbReservoir,
  mathProbFisherYates,
  mathPatFloorBlocks,
  mathPatIsqrt,
  mathPatBase,
  mathPatBigMul,
]
