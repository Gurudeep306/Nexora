import { trace } from '../../../engine/tracer'
import type { Algorithm, Scalar } from '../../../engine/types'
import { rint } from '../../../algorithms/util'

/* Math topic — animations, part 2: sieves, divisor functions and φ, modular arithmetic, fast power. */

const COLS = 10
const at = (i: number): [number, number] => [Math.floor(i / COLS), i % COLS]
const r1 = (x: number) => Math.round(x * 10) / 10
/** Numbers 0..n laid out ten per row: cell (r, c) holds f(10r + c). */
function numberRows(n: number, f: (i: number) => Scalar): Scalar[][] {
  const rows: Scalar[][] = []
  for (let r = 0; r * COLS <= n; r++) rows.push(Array.from({ length: COLS }, (_, c) => (r * COLS + c <= n ? f(r * COLS + c) : null)))
  return rows
}
const rowLabels = (n: number) => Array.from({ length: Math.floor(n / COLS) + 1 }, (_, r) => String(r * COLS))
const colLabels = Array.from({ length: COLS }, (_, c) => `+${c}`)
const isPrimeSmall = (x: number) => {
  if (x < 2) return false
  for (let d = 2; d * d <= x; d++) if (x % d === 0) return false
  return true
}
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const big = (s: unknown, name: string, lo: bigint, hi: bigint) => {
  const txt = String(s).trim()
  if (!/^\d+$/.test(txt)) throw new Error(`${name} must be a whole number.`)
  const v = BigInt(txt)
  if (v < lo || v > hi) throw new Error(`${name} must be between ${lo} and ${hi}.`)
  return v
}
const bitsOf = (b: bigint) => (b === 0n ? [0] : b.toString(2).split('').map(Number))

/* ───────────────────────── 1. Sieve of Eratosthenes ───────────────────────── */

export const mathSieveEratosthenes: Algorithm = {
  id: 'math-sieve-eratosthenes',
  title: 'Sieve of Eratosthenes — cross out multiples from p²',
  blurb: 'Every number that survives all primes up to √n is prime. Each prime p starts crossing at p², because smaller multiples were already crossed by a smaller prime.',
  legend: { active: 'current prime p', write: 'crossed just now', dim: 'composite (crossed earlier)', found: 'known prime', compare: 'composite p — skipped' },
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '50', min: 10, max: 120 }],
  random: () => ({ n: String(rint(20, 100)) }),
  code: {
    pseudo: `
function sieve(n)
  isPrime[0..n] ← true; isPrime[0] ← isPrime[1] ← false   // @init
  for p ← 2 while p·p ≤ n
    if not isPrime[p]: continue                            // @skip
    for j ← p·p to n step p                                // @prime
      isPrime[j] ← false                                   // @cross
  return isPrime                                           // @done`,
    cpp: `
vector<bool> sieve(int n) {
    vector<bool> isPrime(n + 1, true);                       // @init
    isPrime[0] = false;
    if (n >= 1) isPrime[1] = false;
    for (long long p = 2; p * p <= n; p++) {
        if (!isPrime[p]) continue;                           // @skip
        for (long long j = p * p; j <= n; j += p)            // @prime
            isPrime[j] = false;                              // @cross
    }
    return isPrime;                                          // @done
}`,
    java: `
static boolean[] sieve(int n) {
    boolean[] isPrime = new boolean[n + 1];
    Arrays.fill(isPrime, true);                              // @init
    isPrime[0] = false;
    if (n >= 1) isPrime[1] = false;
    for (long p = 2; p * p <= n; p++) {
        if (!isPrime[(int) p]) continue;                     // @skip
        for (long j = p * p; j <= n; j += p)                 // @prime
            isPrime[(int) j] = false;                        // @cross
    }
    return isPrime;                                          // @done
}`,
    python: `
def sieve(n):
    is_prime = [True] * (n + 1)              # @init
    is_prime[0] = False
    if n >= 1:
        is_prime[1] = False
    p = 2
    while p * p <= n:
        if is_prime[p]:                      # @skip
            for j in range(p * p, n + 1, p): # @prime
                is_prime[j] = False          # @cross
        p += 1
    return is_prime                          # @done`,
    js: `
function sieve(n) {
  const isPrime = new Uint8Array(n + 1).fill(1);             // @init
  isPrime[0] = 0;
  if (n >= 1) isPrime[1] = 0;
  for (let p = 2; p * p <= n; p++) {
    if (!isPrime[p]) continue;                               // @skip
    for (let j = p * p; j <= n; j += p)                      // @prime
      isPrime[j] = 0;                                        // @cross
  }
  return isPrime;                                            // @done
}`,
    c: `
/* isPrime must have room for n + 1 chars */
void sieve(int n, char *isPrime) {
    memset(isPrime, 1, n + 1);                               // @init
    isPrime[0] = 0;
    if (n >= 1) isPrime[1] = 0;
    for (long long p = 2; p * p <= n; p++) {
        if (!isPrime[p]) continue;                           // @skip
        for (long long j = p * p; j <= n; j += p)            // @prime
            isPrime[j] = 0;                                  // @cross
    }
}                                                            // @done`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      if (!(N >= 10 && N <= 120)) throw new Error('Pick n between 10 and 120.')
      const G = t.grid('s', numberRows(N, (i) => (i === 0 ? null : i)), { label: `isPrime[0..${N}] — white cells are still "maybe prime"` })
      const m = t.meter('x', 'Cross-outs so far', [
        { label: 'n', value: N },
        { label: 'n·ln ln n', value: r1(N * Math.log(Math.log(N))) },
      ])
      const state: ('?' | 'P' | 'C')[] = Array(N + 1).fill('?')
      const by: number[] = Array(N + 1).fill(0)
      state[0] = 'C'
      state[1] = 'C'
      const paint = () => {
        G.clear()
        for (let i = 1; i <= N; i++) if (state[i] === 'C') G.role(...at(i), 'dim')
        else if (state[i] === 'P') G.role(...at(i), 'found')
      }
      paint()
      t.step('init', `Start by assuming every number from 2 to ${N} is prime; 1 is not prime by definition. Each prime will cross out its own multiples.`, { n: N })
      let p = 2
      for (; p * p <= N; p++) {
        if (state[p] === 'C') {
          paint()
          G.role(...at(p), 'compare')
          t.step('skip', `${p} is already crossed (by ${by[p]}), so it is composite. Its multiples are multiples of ${by[p]} too and are already handled — skip it.`, { p })
          continue
        }
        state[p] = 'P'
        paint()
        G.role(...at(p), 'active')
        t.step('prime', `${p} survived every smaller prime, so it is prime. Start at ${p}² = ${p * p}: any smaller multiple ${p}·k has k < ${p}, so a prime factor of k smaller than ${p} has already crossed it.`, { p, start: p * p })
        for (let j = p * p; j <= N; j += p) {
          m.add(1)
          const again = state[j] === 'C'
          if (!again) {
            state[j] = 'C'
            by[j] = p
          }
          paint()
          G.role(...at(p), 'active').role(...at(j), 'write')
          t.step(
            'cross',
            again
              ? `${j} = ${p}·${j / p} was already crossed by ${by[j]} (its smallest prime factor). Crossing it again is the wasted work that makes the sieve n·log log n instead of n.`
              : `Cross ${j} = ${p}·${j / p}. It is composite, and ${p} is its smallest prime factor.`,
            { p, j },
          )
        }
      }
      for (let i = 2; i <= N; i++) if (state[i] === '?') state[i] = 'P'
      paint()
      m.role = 'done'
      const cnt = state.filter((s) => s === 'P').length
      t.step('done', `${p}² = ${p * p} > ${N}: stop. A composite ≤ ${N} has a prime factor ≤ √${N} ≈ ${r1(Math.sqrt(N))}, so it has been crossed; everything left is prime — ${cnt} primes. Total cross-outs: ${m.value}, versus n·ln ln n ≈ ${r1(N * Math.log(Math.log(N)))}.`, { primes: cnt, crossOuts: m.value })
    }),
}

/* ───────────────────────── 2. Smallest-prime-factor sieve + factorisation ───────────────────────── */

export const mathSieveSpf: Algorithm = {
  id: 'math-sieve-spf',
  title: 'Smallest-prime-factor sieve, then factorise in O(log x)',
  blurb: 'Store, for every number, its smallest prime factor. Factorising is then a walk x → x / spf[x] that at least halves x each step.',
  legend: { active: 'current prime', write: 'spf written now', compare: 'already had a smaller spf', found: 'factor walk' },
  inputs: [
    { name: 'n', label: 'n (table size)', type: 'number', default: '60', min: 10, max: 120 },
    { name: 'x', label: 'x to factorise (≤ n)', type: 'number', default: '60', min: 2, max: 120 },
  ],
  random: () => {
    const n = rint(30, 100)
    return { n: String(n), x: String(rint(2, n)) }
  },
  code: {
    pseudo: `
spf[0..n] ← 0                                    // @init
for i ← 2 to n
  if spf[i] = 0:                                 // i is prime
    spf[i] ← i                                   // @prime
    for j ← i·i to n step i
      if spf[j] = 0: spf[j] ← i                  // @mark
function factor(x)
  while x > 1: output spf[x]; x ← x / spf[x]     // @div
                                                 // @done`,
    cpp: `
vector<int> buildSpf(int n) {
    vector<int> spf(n + 1, 0);                               // @init
    for (int i = 2; i <= n; i++) {
        if (spf[i] != 0) continue;
        spf[i] = i;                                          // @prime
        for (long long j = (long long) i * i; j <= n; j += i)
            if (spf[j] == 0) spf[j] = i;                     // @mark
    }
    return spf;
}
vector<int> factorize(int x, const vector<int>& spf) {
    vector<int> f;
    while (x > 1) { f.push_back(spf[x]); x /= spf[x]; }     // @div
    return f;                                                // @done
}`,
    java: `
static int[] buildSpf(int n) {
    int[] spf = new int[n + 1];                              // @init
    for (int i = 2; i <= n; i++) {
        if (spf[i] != 0) continue;
        spf[i] = i;                                          // @prime
        for (long j = (long) i * i; j <= n; j += i)
            if (spf[(int) j] == 0) spf[(int) j] = i;         // @mark
    }
    return spf;
}
static List<Integer> factorize(int x, int[] spf) {
    List<Integer> f = new ArrayList<>();
    while (x > 1) { f.add(spf[x]); x /= spf[x]; }            // @div
    return f;                                                // @done
}`,
    python: `
def build_spf(n):
    spf = [0] * (n + 1)                      # @init
    for i in range(2, n + 1):
        if spf[i] == 0:
            spf[i] = i                       # @prime
            for j in range(i * i, n + 1, i):
                if spf[j] == 0:
                    spf[j] = i               # @mark
    return spf

def factorize(x, spf):
    f = []
    while x > 1:
        f.append(spf[x]); x //= spf[x]       # @div
    return f                                 # @done`,
    js: `
function buildSpf(n) {
  const spf = new Int32Array(n + 1);                         // @init
  for (let i = 2; i <= n; i++) {
    if (spf[i] !== 0) continue;
    spf[i] = i;                                              // @prime
    for (let j = i * i; j <= n; j += i)
      if (spf[j] === 0) spf[j] = i;                          // @mark
  }
  return spf;
}
function factorize(x, spf) {
  const f = [];
  while (x > 1) { f.push(spf[x]); x /= spf[x]; }             // @div
  return f;                                                  // @done
}`,
    c: `
/* spf: n + 1 ints */
void buildSpf(int n, int *spf) {
    memset(spf, 0, (n + 1) * sizeof(int));                   // @init
    for (int i = 2; i <= n; i++) {
        if (spf[i] != 0) continue;
        spf[i] = i;                                          // @prime
        for (long long j = (long long) i * i; j <= n; j += i)
            if (spf[j] == 0) spf[j] = i;                     // @mark
    }
}
/* writes the prime factors of x into f; returns how many */
int factorize(int x, const int *spf, int *f) {
    int k = 0;
    while (x > 1) { f[k++] = spf[x]; x /= spf[x]; }          // @div
    return k;                                                // @done
}`,
  },
  run: ({ n, x }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      const X = Math.floor(x as number)
      if (!(N >= 10 && N <= 120)) throw new Error('Pick n between 10 and 120.')
      if (!(X >= 2 && X <= N)) throw new Error('x must be between 2 and n.')
      const spf: number[] = Array(N + 1).fill(0)
      const G = t.grid('spf', numberRows(N, (i) => (i < 2 ? null : 0)), { label: 'spf[i] — row label + column offset = i', rowLabels: rowLabels(N), colLabels })
      t.step('init', `spf[i] = 0 means "no prime factor found yet". Cell (row 20, column +4) is spf[24].`, { n: N })
      const show = () => {
        for (let i = 2; i <= N; i++) G.set(...at(i), spf[i])
      }
      let i = 2
      for (; i * i <= N; i++) {
        if (spf[i] !== 0) continue
        spf[i] = i
        show()
        G.clear().role(...at(i), 'active')
        t.step('prime', `spf[${i}] is still 0, so ${i} is prime: spf[${i}] = ${i}. Now visit ${i}², ${i}² + ${i}, … up to ${N}.`, { i })
        const fresh: number[] = []
        const old: number[] = []
        for (let j = i * i; j <= N; j += i) {
          if (spf[j] === 0) {
            spf[j] = i
            fresh.push(j)
            G.role(...at(j), 'write')
          } else {
            old.push(j)
            G.role(...at(j), 'compare')
          }
        }
        show()
        t.step('mark', `${i} writes itself into ${fresh.length} empty cells (${fresh.slice(0, 6).join(', ')}${fresh.length > 6 ? ', …' : ''}). ${old.length ? `${old.slice(0, 4).join(', ')}${old.length > 4 ? ', …' : ''} already hold a smaller prime, so they keep it — the FIRST prime to reach a number is its smallest factor.` : 'No cell was taken yet.'}`, { i, written: fresh.length })
      }
      const late: number[] = []
      for (let k = i; k <= N; k++) if (spf[k] === 0) {
        spf[k] = k
        late.push(k)
      }
      show()
      G.clear()
      for (const k of late) G.role(...at(k), 'write')
      t.step('prime', `Past √${N}: nothing new gets crossed, and every cell still 0 is a prime that is its own smallest factor (${late.slice(0, 6).join(', ')}${late.length > 6 ? ', …' : ''}).`, { i })
      let cur = X
      const fac: number[] = []
      G.clear().role(...at(cur), 'active')
      t.step('div', `Factorise ${X}: look up spf[${X}] = ${spf[X]}.`, { x: X })
      while (cur > 1) {
        const p = spf[cur]
        const nx = cur / p
        fac.push(p)
        G.clear()
        G.role(...at(cur), 'found')
        if (nx > 1) G.role(...at(nx), 'active').arrow(at(cur), at(nx), `÷${p}`, 'found')
        t.step('div', `${cur} = ${p} · ${nx}: output ${p}${nx > 1 ? `, jump to cell ${nx} (spf = ${spf[nx]})` : ', and 1 is reached'}. x at least halves every step, so there are at most log₂ x steps.`, { x: nx, factors: fac.join('·') })
        cur = nx
      }
      G.clear()
      t.step('done', `${X} = ${fac.join(' · ')} — ${fac.length} lookups (log₂ ${X} ≈ ${r1(Math.log2(X))}). The table costs O(n log log n) once; each factorisation afterwards is O(log x).`, { factors: fac.join('·') })
    }),
}

/* ───────────────────────── 3. Linear (Euler) sieve ───────────────────────── */

export const mathSieveLinear: Algorithm = {
  id: 'math-sieve-linear',
  title: 'Linear sieve — every composite is written exactly once',
  blurb: 'Composite m is produced only as i · p with p = lp(m), the smallest prime of m, and i = m / p. So each cell is written once: O(n).',
  legend: { active: 'current i', write: 'i · p written now (once!)', compare: 'next prime p > lp[i] — stop', found: 'prime' },
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '30', min: 10, max: 80 }],
  random: () => ({ n: String(rint(20, 60)) }),
  code: {
    pseudo: `
lp[0..n] ← 0; primes ← []                       // @init
for i ← 2 to n
  if lp[i] = 0: lp[i] ← i; primes.append(i)     // @prime
  for p in primes
    if p > lp[i] or i·p > n: break              // @stop
    lp[i·p] ← p                                 // @mark
return primes, lp                               // @done`,
    cpp: `
vector<int> linearSieve(int n, vector<int>& lp) {
    lp.assign(n + 1, 0);                                     // @init
    vector<int> primes;
    for (int i = 2; i <= n; i++) {
        if (lp[i] == 0) { lp[i] = i; primes.push_back(i); }  // @prime
        for (int p : primes) {
            if (p > lp[i] || (long long) i * p > n) break;   // @stop
            lp[i * p] = p;                                   // @mark
        }
    }
    return primes;                                           // @done
}`,
    java: `
// lp has length n + 1 and starts all zero
static List<Integer> linearSieve(int n, int[] lp) {
    List<Integer> primes = new ArrayList<>();                // @init
    for (int i = 2; i <= n; i++) {
        if (lp[i] == 0) { lp[i] = i; primes.add(i); }        // @prime
        for (int p : primes) {
            if (p > lp[i] || (long) i * p > n) break;        // @stop
            lp[i * p] = p;                                   // @mark
        }
    }
    return primes;                                           // @done
}`,
    python: `
def linear_sieve(n):
    lp = [0] * (n + 1)                       # @init
    primes = []
    for i in range(2, n + 1):
        if lp[i] == 0:
            lp[i] = i; primes.append(i)      # @prime
        for p in primes:
            if p > lp[i] or i * p > n:       # @stop
                break
            lp[i * p] = p                    # @mark
    return primes, lp                        # @done`,
    js: `
function linearSieve(n) {
  const lp = new Int32Array(n + 1), primes = [];             // @init
  for (let i = 2; i <= n; i++) {
    if (lp[i] === 0) { lp[i] = i; primes.push(i); }          // @prime
    for (const p of primes) {
      if (p > lp[i] || i * p > n) break;                     // @stop
      lp[i * p] = p;                                         // @mark
    }
  }
  return { primes, lp };                                     // @done
}`,
    c: `
/* lp: n + 1 ints, zeroed; primes: room for n ints. Returns the prime count. */
int linearSieve(int n, int *lp, int *primes) {
    int cnt = 0;                                             // @init
    for (int i = 2; i <= n; i++) {
        if (lp[i] == 0) { lp[i] = i; primes[cnt++] = i; }    // @prime
        for (int k = 0; k < cnt; k++) {
            int p = primes[k];
            if (p > lp[i] || (long long) i * p > n) break;   // @stop
            lp[i * p] = p;                                   // @mark
        }
    }
    return cnt;                                              // @done
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      if (!(N >= 10 && N <= 80)) throw new Error('Pick n between 10 and 80.')
      const lp: number[] = Array(N + 1).fill(0)
      const G = t.grid('lp', numberRows(N, (i) => (i < 2 ? null : 0)), { label: 'lp[i] (least prime factor) — row label + column offset = i', rowLabels: rowLabels(N), colLabels })
      const P = t.array('primes', [], { label: 'primes found so far' })
      const m = t.meter('w', 'Writes into lp[]', [{ label: 'n − 1 (one per number)', value: N - 1 }])
      const show = () => {
        for (let i = 2; i <= N; i++) G.set(...at(i), lp[i])
      }
      t.step('init', 'lp[i] = 0 means "not reached yet". Unlike Eratosthenes, we will never write a cell twice.', { n: N })
      const primes: number[] = []
      for (let i = 2; i <= N; i++) {
        if (lp[i] === 0) {
          lp[i] = i
          primes.push(i)
          P.push(i)
          m.add(1)
          show()
          G.clear().role(...at(i), 'found')
          P.clear().role(primes.length - 1, 'new')
          t.step('prime', `lp[${i}] is 0: nothing smaller produced ${i}, so it is prime. lp[${i}] = ${i}.`, { i, 'lp[i]': i })
        }
        for (let k = 0; k < primes.length; k++) {
          const p = primes[k]
          if (i * p > N) break
          if (p > lp[i]) {
            G.clear().role(...at(i), 'active').role(...at(i * p), 'compare')
            P.clear().role(k, 'compare')
            t.step('stop', `Next prime ${p} > lp[${i}] = ${lp[i]}: the smallest prime of ${i}·${p} = ${i * p} is ${lp[i]}, not ${p}. Leave it — it will be written from i = ${(i * p) / lp[i]} with p = ${lp[i]}.`, { i, p, 'lp[i]': lp[i] })
            break
          }
          lp[i * p] = p
          m.add(1)
          show()
          G.clear().role(...at(i), 'active').role(...at(i * p), 'write').arrow(at(i), at(i * p), `×${p}`, 'write')
          P.clear().role(k, 'active')
          t.step('mark', `${i}·${p} = ${i * p}: p = ${p} ≤ lp[${i}] = ${lp[i]}, so ${p} is the smallest prime of ${i * p}. Write lp[${i * p}] = ${p} — the only time this cell is ever written.`, { i, p, 'lp[i]': lp[i] })
        }
      }
      G.clear()
      P.clear()
      m.role = 'done'
      t.step('done', `Every number 2..${N} was written exactly once: ${m.value} writes = n − 1. Each composite m is produced only by the pair (i, p) = (m / lp(m), lp(m)), so the sieve is Θ(n).`, { writes: m.value, primes: primes.length })
    }),
}

/* ───────────────────────── 4. Segmented sieve ───────────────────────── */

export const mathSieveSegmented: Algorithm = {
  id: 'math-sieve-segmented',
  title: 'Segmented sieve on [L, R]',
  blurb: 'Sieve only the window [L, R] with the primes up to √R. Each base prime p starts at the first multiple of p that is ≥ max(p², L).',
  legend: { active: 'base prime at work', write: 'crossed now', dim: 'composite', found: 'prime in [L, R]' },
  inputs: [
    { name: 'L', label: 'L', type: 'number', default: '100', min: 1, max: 100000 },
    { name: 'R', label: 'R (R − L < 60)', type: 'number', default: '130', min: 2, max: 100000 },
  ],
  random: () => {
    const L = rint(1, 5000)
    return { L: String(L), R: String(L + rint(20, 45)) }
  },
  code: {
    pseudo: `
base ← primes ≤ √R (simple sieve); isPrime[0..R−L] ← true    // @base
for p in base
  start ← max(p·p, ⌈L / p⌉·p)                                 // @start
  for j ← start to R step p: isPrime[j − L] ← false           // @cross
report every x in [max(L, 2), R] with isPrime[x − L]          // @done`,
    cpp: `
// base = every prime ≤ sqrt(R), from a simple sieve
vector<long long> segmented(long long L, long long R, const vector<int>& base) {
    vector<char> isPrime(R - L + 1, 1);                      // @base
    for (long long p : base) {
        long long start = max(p * p, (L + p - 1) / p * p);   // @start
        for (long long j = start; j <= R; j += p)
            isPrime[j - L] = 0;                              // @cross
    }
    vector<long long> out;
    for (long long x = max(L, 2LL); x <= R; x++)
        if (isPrime[x - L]) out.push_back(x);                // @done
    return out;
}`,
    java: `
// base = every prime <= sqrt(R), from a simple sieve
static List<Long> segmented(long L, long R, int[] base) {
    boolean[] composite = new boolean[(int) (R - L + 1)];    // @base
    for (long p : base) {
        long start = Math.max(p * p, (L + p - 1) / p * p);   // @start
        for (long j = start; j <= R; j += p)
            composite[(int) (j - L)] = true;                 // @cross
    }
    List<Long> out = new ArrayList<>();
    for (long x = Math.max(L, 2); x <= R; x++)
        if (!composite[(int) (x - L)]) out.add(x);           // @done
    return out;
}`,
    python: `
def segmented(L, R, base):          # base = primes <= isqrt(R)
    is_prime = [True] * (R - L + 1)                 # @base
    for p in base:
        start = max(p * p, (L + p - 1) // p * p)    # @start
        for j in range(start, R + 1, p):
            is_prime[j - L] = False                 # @cross
    return [x for x in range(max(L, 2), R + 1) if is_prime[x - L]]   # @done`,
    js: `
// base = primes <= sqrt(R); exact while R < 2^53 (use BigInt beyond)
function segmented(L, R, base) {
  const isPrime = new Uint8Array(R - L + 1).fill(1);         // @base
  for (const p of base) {
    const start = Math.max(p * p, Math.ceil(L / p) * p);     // @start
    for (let j = start; j <= R; j += p) isPrime[j - L] = 0;  // @cross
  }
  const out = [];
  for (let x = Math.max(L, 2); x <= R; x++) if (isPrime[x - L]) out.push(x);   // @done
  return out;
}`,
    c: `
/* base: nb primes <= sqrt(R); isPrime: room for R - L + 1 chars. Returns the count, primes go to out. */
int segmented(long long L, long long R, const int *base, int nb, char *isPrime, long long *out) {
    memset(isPrime, 1, R - L + 1);                           // @base
    for (int k = 0; k < nb; k++) {
        long long p = base[k];
        long long start = (L + p - 1) / p * p;
        if (start < p * p) start = p * p;                    // @start
        for (long long j = start; j <= R; j += p)
            isPrime[j - L] = 0;                              // @cross
    }
    int cnt = 0;
    for (long long x = L < 2 ? 2 : L; x <= R; x++)
        if (isPrime[x - L]) out[cnt++] = x;                  // @done
    return cnt;
}`,
  },
  run: ({ L, R }) =>
    trace((t) => {
      const lo = Math.floor(L as number)
      const hi = Math.floor(R as number)
      if (!(lo >= 1 && hi >= lo && hi <= 100000)) throw new Error('Use 1 ≤ L ≤ R ≤ 100000.')
      if (hi - lo >= 60) throw new Error('Keep the window small enough to watch: R − L < 60.')
      const base: number[] = []
      for (let p = 2; p * p <= hi; p++) if (isPrimeSmall(p)) base.push(p)
      const len = hi - lo + 1
      const rows: Scalar[][] = []
      for (let r = 0; r * COLS < len; r++) rows.push(Array.from({ length: COLS }, (_, c) => (r * COLS + c < len ? lo + r * COLS + c : null)))
      const G = t.grid('seg', rows, { label: `the segment [${lo}, ${hi}] — isPrime[x − L]` })
      const B = t.array('base', base, { label: `base primes ≤ √${hi} ≈ ${r1(Math.sqrt(hi))}` })
      const pos = (x: number): [number, number] => at(x - lo)
      const comp: boolean[] = Array(len).fill(false)
      if (lo === 1) comp[0] = true
      const paint = () => {
        G.clear()
        for (let k = 0; k < len; k++) if (comp[k]) G.role(...at(k), 'dim')
      }
      paint()
      t.step('base', `A simple sieve up to √${hi} gives ${base.length} base prime${base.length === 1 ? '' : 's'}: ${base.join(', ')}. Any composite in [${lo}, ${hi}] has a prime factor ≤ √${hi}, so these are all we need.${lo === 1 ? ' 1 is not prime: mark it.' : ''}`, { L: lo, R: hi })
      for (let k = 0; k < base.length; k++) {
        const p = base[k]
        const ceil = Math.ceil(lo / p) * p
        const start = Math.max(p * p, ceil)
        paint()
        B.clear().role(k, 'active')
        if (start <= hi) G.role(...pos(start), 'active')
        t.step('start', `p = ${p}: the first multiple of ${p} that is ≥ ${lo} is ⌈${lo}/${p}⌉·${p} = ${ceil}${p * p > ceil ? `, but we start at ${p}² = ${p * p} so ${p} itself (if inside) is not crossed` : ''}. start = ${start}${start > hi ? ` > ${hi}: nothing to cross` : ''}.`, { p, start })
        for (let j = start; j <= hi; j += p) {
          comp[j - lo] = true
          paint()
          G.role(...pos(j), 'write')
          t.step('cross', `Cross ${j} = ${p}·${j / p} (index ${j} − ${lo} = ${j - lo} in the segment).`, { p, j })
        }
      }
      paint()
      B.clear()
      const out: number[] = []
      for (let k = 0; k < len; k++) if (!comp[k] && lo + k >= 2) {
        out.push(lo + k)
        G.role(...at(k), 'found')
      }
      t.step('done', `Survivors are prime: ${out.length ? out.join(', ') : 'none'}. Work ≈ (R − L)·log log R + √R — for R = 10¹², L = R − 10⁶ that is ~10⁶ cells and 78 498 base primes, instead of a 10¹² array.`, { found: out.length })
    }),
}

/* ───────────────────────── 5. Enumerating divisors in O(√n) ───────────────────────── */

export const mathPhiDivisors: Algorithm = {
  id: 'math-phi-divisors',
  title: 'All divisors in O(√n) — pair d with n / d',
  blurb: 'Divisors come in pairs (d, n/d) with d ≤ √n ≤ n/d. Try d = 1..⌊√n⌋ and collect both ends of each pair.',
  legend: { active: 'trying d', found: 'd divides n', compare: 'not a divisor', new: 'just added' },
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '36', min: 1, max: 1000000 }],
  random: () => ({ n: String([36, 60, 72, 100, 360, 97, 144][rint(0, 6)]) }),
  code: {
    pseudo: `
small ← []; large ← []
for d ← 1 while d·d ≤ n                      // @try
  if n mod d = 0
    small.append(d)                          // @pair
    if d ≠ n / d: large.append(n / d)
return small + reversed(large)               // @done`,
    cpp: `
vector<long long> divisors(long long n) {
    vector<long long> small, large;
    for (long long d = 1; d * d <= n; d++) {                 // @try
        if (n % d != 0) continue;
        small.push_back(d);                                  // @pair
        if (d != n / d) large.push_back(n / d);
    }
    small.insert(small.end(), large.rbegin(), large.rend()); // @done
    return small;
}`,
    java: `
static List<Long> divisors(long n) {
    List<Long> small = new ArrayList<>(), large = new ArrayList<>();
    for (long d = 1; d * d <= n; d++) {                      // @try
        if (n % d != 0) continue;
        small.add(d);                                        // @pair
        if (d != n / d) large.add(n / d);
    }
    Collections.reverse(large);
    small.addAll(large);                                     // @done
    return small;
}`,
    python: `
def divisors(n):
    small, large = [], []
    d = 1
    while d * d <= n:                        # @try
        if n % d == 0:
            small.append(d)                  # @pair
            if d != n // d:
                large.append(n // d)
        d += 1
    return small + large[::-1]               # @done`,
    js: `
function divisors(n) {
  const small = [], large = [];
  for (let d = 1; d * d <= n; d++) {                         // @try
    if (n % d !== 0) continue;
    small.push(d);                                           // @pair
    if (d !== n / d) large.push(n / d);
  }
  return small.concat(large.reverse());                      // @done
}`,
    c: `
/* writes the divisors of n in increasing order into out; returns how many */
int divisors(long long n, long long *out) {
    long long large[2000]; int s = 0, l = 0;   /* d(n) <= 1344 for n <= 1e9 */
    for (long long d = 1; d * d <= n; d++) {                 // @try
        if (n % d != 0) continue;
        out[s++] = d;                                        // @pair
        if (d != n / d) large[l++] = n / d;
    }
    while (l > 0) out[s++] = large[--l];                     // @done
    return s;
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      if (!(N >= 1 && N <= 1000000)) throw new Error('Pick n between 1 and 1 000 000.')
      const root = Math.floor(Math.sqrt(N))
      if (root > 30) throw new Error('Keep √n ≤ 30 (n ≤ 960) so every trial fits on screen.')
      const D = t.array('d', Array.from({ length: root }, (_, k) => k + 1), { label: `candidates d = 1 … ⌊√${N}⌋ = ${root}` })
      const S = t.array('small', [], { label: 'small divisors (≤ √n), ascending' })
      const Lg = t.array('large', [], { label: 'partners n / d (≥ √n), descending' })
      const m = t.meter('tests', 'Divisibility tests', [{ label: '√n', value: r1(Math.sqrt(N)) }, { label: 'n (naive loop)', value: N }])
      const small: number[] = []
      const large: number[] = []
      for (let d = 1; d <= root; d++) {
        m.add(1)
        D.clear().role(d - 1, 'active')
        S.clear()
        Lg.clear()
        if (N % d !== 0) {
          D.role(d - 1, 'compare')
          t.step('try', `${N} mod ${d} = ${N % d} ≠ 0: ${d} is not a divisor.`, { d, 'n mod d': N % d })
          continue
        }
        D.role(d - 1, 'found')
        small.push(d)
        S.push(d)
        S.role(small.length - 1, 'new')
        if (d !== N / d) {
          large.push(N / d)
          Lg.push(N / d)
          Lg.role(large.length - 1, 'new')
          t.step('pair', `${N} = ${d} · ${N / d}: both ${d} and its partner ${N / d} are divisors — one test, two divisors.`, { d, partner: N / d })
        } else {
          t.step('pair', `${N} = ${d} · ${d}: a perfect square. The partner is ${d} itself — add it only once, or ${d} would be counted twice.`, { d, partner: d })
        }
      }
      D.clear()
      S.clear()
      Lg.clear()
      m.role = 'done'
      const all = [...small, ...[...large].reverse()]
      t.step('done', `Divisors of ${N}: ${all.join(', ')} — ${all.length} of them, found with ${m.value} tests instead of ${N}. Why it is complete: if d·e = n with d ≤ e then d² ≤ n, so d ≤ √n and the pair was caught at d.`, { 'd(n)': all.length })
    }),
}

/* ───────────────────────── 6. Divisor-count sieve (harmonic sum) ───────────────────────── */

export const mathPhiDivCount: Algorithm = {
  id: 'math-phi-divcount',
  title: 'Divisor counts for 1..n in O(n log n)',
  blurb: 'Turn the question around: instead of asking which d divide m, let every d add 1 to each of its multiples. d touches ⌊n/d⌋ cells, and n/1 + n/2 + … + n/n ≈ n ln n.',
  legend: { active: 'current d', write: 'multiple of d: +1' },
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '30', min: 10, max: 100 }],
  random: () => ({ n: String(rint(20, 60)) }),
  code: {
    pseudo: `
cnt[1..n] ← 0                                // @init
for d ← 1 to n
  for m ← d to n step d: cnt[m] ← cnt[m] + 1 // @hit
return cnt                                   // @done`,
    cpp: `
vector<int> divisorCounts(int n) {
    vector<int> cnt(n + 1, 0);                               // @init
    for (int d = 1; d <= n; d++)
        for (int m = d; m <= n; m += d) cnt[m]++;            // @hit
    return cnt;                                              // @done
}`,
    java: `
static int[] divisorCounts(int n) {
    int[] cnt = new int[n + 1];                              // @init
    for (int d = 1; d <= n; d++)
        for (int m = d; m <= n; m += d) cnt[m]++;            // @hit
    return cnt;                                              // @done
}`,
    python: `
def divisor_counts(n):
    cnt = [0] * (n + 1)                      # @init
    for d in range(1, n + 1):
        for m in range(d, n + 1, d):
            cnt[m] += 1                      # @hit
    return cnt                               # @done`,
    js: `
function divisorCounts(n) {
  const cnt = new Int32Array(n + 1);                         // @init
  for (let d = 1; d <= n; d++)
    for (let m = d; m <= n; m += d) cnt[m]++;                // @hit
  return cnt;                                                // @done
}`,
    c: `
/* cnt: n + 1 ints */
void divisorCounts(int n, int *cnt) {
    memset(cnt, 0, (n + 1) * sizeof(int));                   // @init
    for (int d = 1; d <= n; d++)
        for (int m = d; m <= n; m += d) cnt[m]++;            // @hit
}                                                            // @done`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      if (!(N >= 10 && N <= 100)) throw new Error('Pick n between 10 and 100.')
      const cnt: number[] = Array(N + 1).fill(0)
      const G = t.grid('cnt', numberRows(N, (i) => (i === 0 ? null : 0)), { label: 'cnt[m] = number of divisors of m — row label + column offset = m', rowLabels: rowLabels(N), colLabels })
      const m = t.meter('ops', 'Increments', [{ label: 'n', value: N }, { label: 'n·ln n', value: r1(N * Math.log(N)) }, { label: 'n·√n (trial division each)', value: r1(N * Math.sqrt(N)) }])
      t.step('init', 'Every count starts at 0. Each d from 1 to n will visit its multiples d, 2d, 3d, … and add 1 — because d divides exactly those numbers.', { n: N })
      for (let d = 1; d <= N; d++) {
        G.clear().role(...at(d), 'active')
        let hits = 0
        for (let x = d; x <= N; x += d) {
          cnt[x]++
          hits++
          G.set(...at(x), cnt[x])
          if (x !== d) G.role(...at(x), 'write')
        }
        m.add(hits)
        if (d <= 12 || d === N || d === Math.floor(N / 2) + 1)
          t.step('hit', d === 1 ? `d = 1 divides everything: ${N} increments.` : `d = ${d} adds 1 to its ${hits} multiple${hits > 1 ? 's' : ''} (⌊${N}/${d}⌋ = ${hits}). Running total ${m.value}.${d > N / 2 ? ` Every d > n/2 touches only itself.` : ''}`, { d, 'n/d': hits, total: m.value })
        if (d === 12 && N > 13) {
          G.clear()
          t.step('hit', `The remaining d = 13 … ${N} each touch ⌊${N}/d⌋ cells — fewer and fewer. Skipping ahead.`, { d })
        }
      }
      G.clear()
      let best = 1
      for (let x = 1; x <= N; x++) if (cnt[x] > cnt[best]) best = x
      G.role(...at(best), 'found')
      m.role = 'done'
      let H = 0
      for (let d = 1; d <= N; d++) H += 1 / d
      t.step('done', `${m.value} increments in all = Σ ⌊n/d⌋ ≤ n·H(n) = ${r1(N * H)}, and H(n) = 1 + 1/2 + … + 1/n < ln n + 1, so the work is O(n log n). The most divisors up to ${N}: ${best} with ${cnt[best]}.`, { total: m.value, argmax: best, divisors: cnt[best] })
    }),
}

/* ───────────────────────── 7. φ sieve ───────────────────────── */

export const mathPhiSieve: Algorithm = {
  id: 'math-phi-sieve',
  title: 'Euler’s φ for 1..n with a sieve',
  blurb: 'Start with φ[i] = i. For each prime p, multiply every multiple by (1 − 1/p), written exactly as φ[j] −= φ[j] / p.',
  legend: { active: 'prime p', write: 'φ[j] updated now', found: 'final φ of a prime' },
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '20', min: 10, max: 60 }],
  random: () => ({ n: String(rint(12, 40)) }),
  code: {
    pseudo: `
for i ← 0 to n: phi[i] ← i                   // @init
for p ← 2 to n
  if phi[p] = p:                             // untouched ⇒ p is prime   @prime
    for j ← p to n step p
      phi[j] ← phi[j] − phi[j] / p           // @update
return phi                                   // @done`,
    cpp: `
vector<int> phiSieve(int n) {
    vector<int> phi(n + 1);
    for (int i = 0; i <= n; i++) phi[i] = i;                 // @init
    for (int p = 2; p <= n; p++) {
        if (phi[p] != p) continue;     // touched by a smaller prime: composite
        for (int j = p; j <= n; j += p)                      // @prime
            phi[j] -= phi[j] / p;                            // @update
    }
    return phi;                                              // @done
}`,
    java: `
static int[] phiSieve(int n) {
    int[] phi = new int[n + 1];
    for (int i = 0; i <= n; i++) phi[i] = i;                 // @init
    for (int p = 2; p <= n; p++) {
        if (phi[p] != p) continue;     // touched by a smaller prime: composite
        for (int j = p; j <= n; j += p)                      // @prime
            phi[j] -= phi[j] / p;                            // @update
    }
    return phi;                                              // @done
}`,
    python: `
def phi_sieve(n):
    phi = list(range(n + 1))                 # @init
    for p in range(2, n + 1):
        if phi[p] == p:                      # untouched: p is prime   @prime
            for j in range(p, n + 1, p):
                phi[j] -= phi[j] // p        # @update
    return phi                               # @done`,
    js: `
function phiSieve(n) {
  const phi = Int32Array.from({ length: n + 1 }, (_, i) => i);   // @init
  for (let p = 2; p <= n; p++) {
    if (phi[p] !== p) continue;      // touched by a smaller prime: composite
    for (let j = p; j <= n; j += p)                          // @prime
      phi[j] -= phi[j] / p;          // exact: p divides phi[j] here   @update
  }
  return phi;                                                // @done
}`,
    c: `
/* phi: n + 1 ints */
void phiSieve(int n, int *phi) {
    for (int i = 0; i <= n; i++) phi[i] = i;                 // @init
    for (int p = 2; p <= n; p++) {
        if (phi[p] != p) continue;     /* touched by a smaller prime: composite */
        for (int j = p; j <= n; j += p)                      // @prime
            phi[j] -= phi[j] / p;                            // @update
    }
}                                                            // @done`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      if (!(N >= 10 && N <= 60)) throw new Error('Pick n between 10 and 60.')
      const phi = Array.from({ length: N + 1 }, (_, i) => i)
      const G = t.grid('phi', numberRows(N, (i) => (i === 0 ? null : i)), { label: 'phi[i] — row label + column offset = i', rowLabels: rowLabels(N), colLabels })
      const fin: boolean[] = Array(N + 1).fill(false)
      fin[1] = true
      const paint = () => {
        G.clear()
        for (let i = 1; i <= N; i++) G.set(...at(i), phi[i])
      }
      paint()
      t.step('init', 'phi[i] = i: before looking at any prime, all i numbers in 1..i count as "coprime to i".', { n: N })
      for (let p = 2; p <= N; p++) {
        if (phi[p] !== p) continue
        paint()
        G.role(...at(p), 'active')
        const muls = Math.floor(N / p)
        t.step('prime', `phi[${p}] = ${p} is untouched, so no smaller prime divides ${p}: it is prime. Remove the fraction 1/${p} from each of its ${muls} multiple${muls > 1 ? 's' : ''}.`, { p })
        for (let j = p; j <= N; j += p) {
          const before = phi[j]
          phi[j] -= phi[j] / p
          paint()
          G.role(...at(p), 'active').role(...at(j), 'write')
          t.step('update', `phi[${j}] = ${before} − ${before}/${p} = ${phi[j]}: of the ${before} survivors, exactly 1/${p} are multiples of ${p}.${j === p ? ` For a prime, φ(${p}) = ${p} − 1.` : ''}`, { p, j, 'phi[j]': phi[j] })
        }
      }
      paint()
      t.step('done', `Done in O(n log log n) — the same loop shape as Eratosthenes. Check: φ(12) = 12·(1 − 1/2)(1 − 1/3) = 4 — the numbers 1, 5, 7, 11.`, { 'phi(n)': phi[N] })
    }),
}

/* ───────────────────────── 8. Fermat / Euler: multiplying by a permutes the units ───────────────────────── */

export const mathModFermat: Algorithm = {
  id: 'math-mod-fermat',
  title: 'Why a^φ(m) ≡ 1: multiplying by a shuffles the residues',
  blurb: 'If gcd(a, m) = 1, the map k → a·k mod m sends the residues coprime to m to themselves, in a new order. Multiply them all: a^φ(m) · P ≡ P, so a^φ(m) ≡ 1.',
  legend: { active: 'k', write: 'a·k mod m', found: 'permutation confirmed', removed: 'collision' },
  inputs: [
    { name: 'm', label: 'modulus m', type: 'number', default: '7', min: 2, max: 30 },
    { name: 'a', label: 'a', type: 'number', default: '3', min: 1, max: 1000 },
  ],
  random: () => {
    const m = [7, 11, 13, 9, 10, 12, 15][rint(0, 6)]
    return { m: String(m), a: String(rint(2, 3 * m)) }
  },
  code: {
    pseudo: `
units ← { k in 1..m−1 : gcd(k, m) = 1 }        // @init
for k in units: r[k] ← a·k mod m             // @mul
r is a permutation of units?                 // @perm
∏ r ≡ a^φ(m)·∏ units; cancel ∏ units         // @cancel`,
    cpp: `
// The fact behind Fermat/Euler: k -> a*k mod m permutes the units mod m.
bool permutesUnits(long long a, long long m) {
    vector<bool> seen(m, false);                             // @init
    for (long long k = 1; k < m; k++) {
        if (gcd(k, m) != 1) continue;
        long long r = a % m * k % m;                         // @mul
        if (seen[r] || gcd(r, m) != 1) return false;         // @perm
        seen[r] = true;
    }
    return true;   // hence a^phi(m) ≡ 1 (mod m)              @cancel
}`,
    java: `
static long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }
static boolean permutesUnits(long a, long m) {
    boolean[] seen = new boolean[(int) m];                   // @init
    for (long k = 1; k < m; k++) {
        if (gcd(k, m) != 1) continue;
        long r = a % m * k % m;                              // @mul
        if (seen[(int) r] || gcd(r, m) != 1) return false;   // @perm
        seen[(int) r] = true;
    }
    return true;   // hence a^phi(m) ≡ 1 (mod m)              @cancel
}`,
    python: `
from math import gcd
def permutes_units(a, m):
    units = [k for k in range(1, m) if gcd(k, m) == 1]   # @init
    images = [a * k % m for k in units]                 # @mul
    if sorted(images) != units:                         # @perm
        return False
    return True    # hence pow(a, len(units), m) == 1    @cancel`,
    js: `
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
function permutesUnits(a, m) {
  const seen = new Array(m).fill(false);                     // @init
  for (let k = 1; k < m; k++) {
    if (gcd(k, m) !== 1) continue;
    const r = (a % m) * k % m;                               // @mul
    if (seen[r] || gcd(r, m) !== 1) return false;            // @perm
    seen[r] = true;
  }
  return true;   // hence a^phi(m) ≡ 1 (mod m)                @cancel
}`,
    c: `
long long gcdll(long long a, long long b) { return b == 0 ? a : gcdll(b, a % b); }
/* seen: m chars */
int permutesUnits(long long a, long long m, char *seen) {
    memset(seen, 0, m);                                      // @init
    for (long long k = 1; k < m; k++) {
        if (gcdll(k, m) != 1) continue;
        long long r = a % m * k % m;                         // @mul
        if (seen[r] || gcdll(r, m) != 1) return 0;           // @perm
        seen[r] = 1;
    }
    return 1;   /* hence a^phi(m) ≡ 1 (mod m) */              // @cancel
}`,
  },
  run: ({ m, a }) =>
    trace((t) => {
      const M = Math.floor(m as number)
      const A = Math.floor(a as number)
      if (!(M >= 2 && M <= 30)) throw new Error('Pick m between 2 and 30.')
      if (!(A >= 1 && A <= 1000)) throw new Error('Pick a between 1 and 1000.')
      const units: number[] = []
      for (let k = 1; k < M; k++) if (gcd(k, M) === 1) units.push(k)
      const prime = isPrimeSmall(M)
      const K = t.array('k', units, { label: `residues k coprime to ${M} (${units.length} of them = φ(${M}))` })
      const Rr = t.array('r', units.map(() => null), { label: `a·k mod ${M}, with a = ${A}` })
      const g = gcd(A, M)
      t.step('init', `${prime ? `${M} is prime, so the units are 1..${M - 1}` : `The units mod ${M} are the ${units.length} residues coprime to ${M}`}. gcd(${A}, ${M}) = ${g}${g === 1 ? ' — the theorem applies.' : ' — not coprime: watch the argument break.'}`, { a: A, m: M, 'φ(m)': units.length })
      const seen = new Map<number, number>()
      let broken = false
      for (let i = 0; i < units.length; i++) {
        const k = units[i]
        const r = (A * k) % M
        Rr.set(i, r)
        K.clear().role(i, 'active')
        Rr.clear().role(i, 'write')
        const dup = seen.get(r)
        if (dup !== undefined) {
          Rr.role(dup, 'removed').role(i, 'removed')
          broken = true
          t.step('perm', `${A}·${k} mod ${M} = ${r} — the same value as for k = ${units[dup]}. Two inputs collide because ${M} divides ${A}·(${k} − ${units[dup]}) without dividing ${k} − ${units[dup]}; that needs gcd(a, m) > 1.`, { k, 'a·k mod m': r })
          break
        }
        seen.set(r, i)
        t.step('mul', `${A}·${k} = ${A * k} ≡ ${r} (mod ${M}).${gcd(r, M) !== 1 ? ` ${r} is not even a unit!` : ''}`, { k, 'a·k mod m': r })
      }
      K.clear()
      Rr.clear()
      if (broken || g !== 1) {
        let pw = 1
        for (let i = 0; i < units.length; i++) pw = (pw * A) % M
        t.step('cancel', `Since gcd(${A}, ${M}) = ${g} ≠ 1, a·k does not permute the units, and indeed ${A}^${units.length} mod ${M} = ${pw} ≠ 1. Fermat/Euler need gcd(a, m) = 1.`, { 'a^φ(m) mod m': pw })
        return
      }
      for (let i = 0; i < units.length; i++) Rr.role(i, 'found')
      const sorted = [...(Rr.values() as number[])].sort((x, y) => x - y)
      t.step('perm', `The bottom row is ${Rr.values().join(', ')} — sorted, that is ${sorted.join(', ')}: exactly the top row, reshuffled. Distinct because a·k ≡ a·k' forces m | a(k − k'), and gcd(a, m) = 1 gives m | k − k'.`, { a: A, m: M })
      let P = 1
      for (const k of units) P = (P * k) % M
      let pw = 1
      for (let i = 0; i < units.length; i++) pw = (pw * A) % M
      t.step('cancel', `Multiply each row: bottom = ∏(a·k) = a^${units.length}·∏k. Both rows hold the same numbers, so a^${units.length}·${P} ≡ ${P} (mod ${M}). ${P} is a unit, so cancel it: ${A}^${units.length} ≡ ${pw} (mod ${M}).`, { 'P = ∏k mod m': P, 'a^φ(m) mod m': pw })
    }),
}

/* ───────────────────────── 9. mulmod by doubling ───────────────────────── */

export const mathModMulmod: Algorithm = {
  id: 'math-mod-mulmod',
  title: 'a·b mod m without overflow — multiply by doubling',
  blurb: 'Write b in binary. a·b = Σ a·2^i over the set bits; keep a·2^i mod m by doubling. Every intermediate value stays below 2m.',
  legend: { active: 'current bit of b' },
  inputs: [
    { name: 'a', label: 'a', type: 'string', default: '7' },
    { name: 'b', label: 'b', type: 'string', default: '45' },
    { name: 'm', label: 'm', type: 'string', default: '11' },
  ],
  random: () => ({ a: String(rint(2, 99)), b: String(rint(10, 200)), m: String(rint(7, 97)) }),
  code: {
    pseudo: `
res ← 0; a ← a mod m                         // @init
while b > 0
  if b is odd: res ← (res + a) mod m         // @add
  a ← 2a mod m; b ← ⌊b / 2⌋                  // @double
return res                                   // @done`,
    cpp: `
// a*b mod m with only additions: safe for m < 2^62
long long mulmod(long long a, long long b, long long m) {
    long long res = 0; a %= m;                               // @init
    while (b > 0) {
        if (b & 1) res = (res + a) % m;                      // @add
        a = (a * 2) % m; b >>= 1;                            // @double
    }
    return res;                                              // @done
}`,
    java: `
// a*b mod m with only additions: safe for m < 2^62
static long mulmod(long a, long b, long m) {
    long res = 0; a %= m;                                    // @init
    while (b > 0) {
        if ((b & 1) == 1) res = (res + a) % m;               // @add
        a = (a * 2) % m; b >>= 1;                            // @double
    }
    return res;                                              // @done
}`,
    python: `
def mulmod(a, b, m):      # Python ints never overflow; this shows the idea
    res, a = 0, a % m                        # @init
    while b > 0:
        if b & 1:
            res = (res + a) % m              # @add
        a = a * 2 % m; b >>= 1               # @double
    return res                               # @done`,
    js: `
// Numbers are exact below 2^53, so this is safe for m < 2^52
function mulmod(a, b, m) {
  let res = 0; a %= m;                                       // @init
  while (b > 0) {
    if (b % 2 === 1) res = (res + a) % m;                    // @add
    a = (a * 2) % m; b = Math.floor(b / 2);                  // @double
  }
  return res;                                                // @done
}`,
    c: `
/* a*b mod m with only additions: safe for m < 2^62 */
long long mulmod(long long a, long long b, long long m) {
    long long res = 0; a %= m;                               // @init
    while (b > 0) {
        if (b & 1) res = (res + a) % m;                      // @add
        a = (a * 2) % m; b >>= 1;                            // @double
    }
    return res;                                              // @done
}`,
  },
  run: ({ a, b, m }) =>
    trace((t) => {
      const M = big(m, 'm', 2n, 10n ** 18n)
      let A = big(a, 'a', 0n, 10n ** 18n)
      let B = big(b, 'b', 0n, 10n ** 18n)
      if (B > 2n ** 24n) throw new Error('Keep b below 2^24 so every bit fits on screen.')
      const bits = bitsOf(B)
      const W = bits.length
      const Bits = t.array('bits', bits, { label: `b = ${B} in binary (we read it from the right)` })
      const want = (A * B) % M
      let res = 0n
      A %= M
      t.step('init', `res = 0, a = a mod m = ${A}. Invariant: res + a·b ≡ (original a·b) (mod m), and every number we store is < m.`, { res: String(res), a: String(A), b: String(B) })
      let k = W - 1
      while (B > 0n) {
        Bits.clear().role(k, 'active').ptr('bit', k)
        if (B & 1n) {
          const s = res + A
          res = s % M
          t.step('add', `Bit is 1: res = (res + a) mod m = ${s} mod ${M} = ${res}. The sum was < 2m, so it never overflows.`, { res: String(res), a: String(A), b: String(B) })
        }
        const d = A * 2n
        A = d % M
        B >>= 1n
        t.step('double', `${B === 0n && k === 0 ? 'Last bit read. ' : ''}a = 2a mod m = ${d} mod ${M} = ${A} (this is the original a times 2^${W - k}, mod m); b = ${B}.`, { res: String(res), a: String(A), b: String(B) })
        k--
      }
      Bits.clear().ptr('bit', null)
      t.step('done', `res = ${res} = a·b mod m (check: ${want}). ${W} iterations — one per bit of b — and no value ever exceeded 2m, so this works for any m < 2⁶² in 64-bit arithmetic.`, { res: String(res) })
    }),
}

/* ───────────────────────── 10. Binary exponentiation (iterative) ───────────────────────── */

export const mathPowBinary: Algorithm = {
  id: 'math-pow-binary',
  title: 'Binary exponentiation, iterative — one bit per round',
  blurb: 'a^b = ∏ a^(2^i) over the set bits of b. Keep base = a^(2^i) by squaring; multiply it into the result when bit i is 1.',
  legend: { active: 'current bit', found: 'bit used', dim: 'bit done' },
  inputs: [
    { name: 'a', label: 'a', type: 'string', default: '3' },
    { name: 'b', label: 'b', type: 'string', default: '13' },
    { name: 'm', label: 'm', type: 'string', default: '1000' },
  ],
  random: () => ({ a: String(rint(2, 20)), b: String(rint(5, 200)), m: String([1000, 1000000007, 97, 13][rint(0, 3)]) }),
  code: {
    pseudo: `
res ← 1; base ← a mod m                      // @init
while b > 0
  if b is odd: res ← res·base mod m          // @bit
  base ← base·base mod m                     // @square
  b ← ⌊b / 2⌋
return res                                   // @done`,
    cpp: `
// a^b mod m, for m < 2^31 so products fit in 64 bits (use __int128 above that)
long long power(long long a, long long b, long long m) {
    long long res = 1 % m; a %= m;                           // @init
    while (b > 0) {
        if (b & 1) res = res * a % m;                        // @bit
        a = a * a % m;                                       // @square
        b >>= 1;
    }
    return res;                                              // @done
}`,
    java: `
static long power(long a, long b, long m) {   // m < 2^31
    long res = 1 % m; a %= m;                                // @init
    while (b > 0) {
        if ((b & 1) == 1) res = res * a % m;                 // @bit
        a = a * a % m;                                       // @square
        b >>= 1;
    }
    return res;                                              // @done
}`,
    python: `
def power(a, b, m):          # the built-in pow(a, b, m) does exactly this
    res, a = 1 % m, a % m                    # @init
    while b > 0:
        if b & 1:
            res = res * a % m                # @bit
        a = a * a % m                        # @square
        b >>= 1
    return res                               # @done`,
    js: `
// BigInt: Number products above 2^53 would silently lose digits
function power(a, b, m) {
  let res = 1n % m; a %= m;                                  // @init
  while (b > 0n) {
    if (b & 1n) res = res * a % m;                           // @bit
    a = a * a % m;                                           // @square
    b >>= 1n;
  }
  return res;                                                // @done
}`,
    c: `
/* a^b mod m, for m < 2^31 */
long long power(long long a, long long b, long long m) {
    long long res = 1 % m; a %= m;                           // @init
    while (b > 0) {
        if (b & 1) res = res * a % m;                        // @bit
        a = a * a % m;                                       // @square
        b >>= 1;
    }
    return res;                                              // @done
}`,
  },
  run: ({ a, b, m }) =>
    trace((t) => {
      const M = big(m, 'm', 1n, 10n ** 18n)
      const A0 = big(a, 'a', 0n, 10n ** 18n)
      const B0 = big(b, 'b', 0n, 10n ** 18n)
      const bits = bitsOf(B0)
      const W = bits.length
      if (W > 40) throw new Error('Keep b below 2^40 so every round fits on screen.')
      const Bits = t.array('bits', bits, { label: `b = ${B0} in binary — read right to left` })
      const G = t.grid('rounds', [], { label: 'one row per round', colLabels: ['i', 'bit', 'base = a^(2^i)', 'res'] })
      let res = 1n % M
      let base = A0 % M
      let B = B0
      let used = 0n
      t.step('init', `res = 1, base = ${A0} mod ${M} = ${base}. Invariant: res · base^b ≡ a^${B0} (mod m) — now trivially, since res = 1 and b is the whole exponent.`, { res: String(res), base: String(base), b: String(B) })
      let i = 0
      while (B > 0n) {
        const k = W - 1 - i
        Bits.clear()
        for (let j = W - 1; j > k; j--) Bits.role(j, bits[j] ? 'found' : 'dim')
        Bits.role(k, 'active').ptr('i', k)
        const bit = Number(B & 1n)
        if (bit) {
          res = (res * base) % M
          used += 1n << BigInt(i)
        }
        G.rows.push([i, bit, String(base), String(res)])
        G.clear().role(G.rows.length - 1, 1, 'active').role(G.rows.length - 1, 3, bit ? 'write' : 'dim')
        t.step('bit', bit ? `Bit ${i} is 1: multiply base = a^${1n << BigInt(i)} into res. res = a^${used} mod m = ${res}.` : `Bit ${i} is 0: a^(2^${i}) is not part of a^b — res stays ${res}.`, { res: String(res), base: String(base), b: String(B) })
        const sq = base * base
        base = sq % M
        B >>= 1n
        G.clear().role(G.rows.length - 1, 2, 'compare')
        t.step('square', `Square the base: a^(2^${i}) → a^(2^${i + 1}) = ${String(sq).length > 15 ? 'a big number' : sq} mod ${M} = ${base}. Shift b right: b = ${B}. Invariant still holds: res·base^b ≡ a^${B0}.`, { res: String(res), base: String(base), b: String(B) })
        i++
      }
      Bits.clear().ptr('i', null)
      for (let j = 0; j < W; j++) Bits.role(j, bits[j] ? 'found' : 'dim')
      G.clear()
      t.step('done', `b = 0, so the invariant says res = a^${B0} mod ${M} = ${res}. ${W} rounds for a ${W}-bit exponent: ${bits.filter((x) => x).length} multiplications + ${W} squarings, O(log b) instead of b − 1.`, { res: String(res) })
    }),
}

/* ───────────────────────── 11. Binary exponentiation (recursive) ───────────────────────── */

export const mathPowRecursive: Algorithm = {
  id: 'math-pow-recursive',
  title: 'Recursive fast power: a^b = (a^⌊b/2⌋)² · a^(b mod 2)',
  blurb: 'Each call halves b and makes ONE recursive call, so the recursion is a single chain of length ⌊log₂ b⌋ + 1.',
  legend: { active: 'running call', compare: 'waiting for its child', done: 'returned' },
  inputs: [
    { name: 'a', label: 'a', type: 'number', default: '3', min: 0, max: 1000000 },
    { name: 'b', label: 'b', type: 'number', default: '13', min: 0, max: 100000 },
    { name: 'm', label: 'm', type: 'number', default: '1000', min: 1, max: 1000000007 },
  ],
  random: () => ({ a: String(rint(2, 9)), b: String(rint(5, 60)), m: '1000' }),
  code: {
    pseudo: `
function power(a, b, m)
  if b = 0: return 1                         // @base
  h ← power(a, ⌊b/2⌋, m)                     // @call
  r ← h·h mod m                              // @square
  if b is odd: r ← r·a mod m                 // @odd
  return r                                   // @ret`,
    cpp: `
long long power(long long a, long long b, long long m) {
    if (b == 0) return 1 % m;                                // @base
    long long h = power(a, b / 2, m);                        // @call
    long long r = h * h % m;                                 // @square
    if (b & 1) r = r * (a % m) % m;                          // @odd
    return r;                                                // @ret
}`,
    java: `
static long power(long a, long b, long m) {
    if (b == 0) return 1 % m;                                // @base
    long h = power(a, b / 2, m);                             // @call
    long r = h * h % m;                                      // @square
    if ((b & 1) == 1) r = r * (a % m) % m;                   // @odd
    return r;                                                // @ret
}`,
    python: `
def power(a, b, m):
    if b == 0:
        return 1 % m                         # @base
    h = power(a, b // 2, m)                  # @call
    r = h * h % m                            # @square
    if b & 1:
        r = r * (a % m) % m                  # @odd
    return r                                 # @ret`,
    js: `
function power(a, b, m) {       // BigInt arguments
  if (b === 0n) return 1n % m;                               // @base
  const h = power(a, b / 2n, m);                             // @call
  let r = h * h % m;                                         // @square
  if (b & 1n) r = r * (a % m) % m;                           // @odd
  return r;                                                  // @ret
}`,
    c: `
long long power(long long a, long long b, long long m) {
    if (b == 0) return 1 % m;                                // @base
    long long h = power(a, b / 2, m);                        // @call
    long long r = h * h % m;                                 // @square
    if (b & 1) r = r * (a % m) % m;                          // @odd
    return r;                                                // @ret
}`,
  },
  run: ({ a, b, m }) =>
    trace((t) => {
      const A = Math.floor(a as number)
      const B = Math.floor(b as number)
      const M = Math.floor(m as number)
      if (!(A >= 0 && B >= 0 && M >= 1)) throw new Error('Use a ≥ 0, b ≥ 0, m ≥ 1.')
      const T = t.tree('rt', { label: 'recursion (one child per call)' })
      const S = t.stack('cs', 'call stack')
      const mod = (x: bigint) => Number(x % BigInt(M))
      const go = (e: number, parent: string | null): number => {
        const id = T.node(`a^${e}`)
        if (parent) T.addChild(parent, id)
        else T.setRoot(id)
        S.push(`power(${A}, ${e})`)
        T.clear().role(id, 'active')
        if (e === 0) {
          const r = 1 % M
          T.role(id, 'done').note(id, `= ${r}`)
          t.step('base', `b = 0: a⁰ = 1. The chain bottoms out after ${Math.floor(Math.log2(Math.max(1, B))) + 1} halvings of ${B}.`, { b: e, r })
          S.pop()
          return r
        }
        t.step('call', `power(a, ${e}) needs a^${Math.floor(e / 2)} first — ONE recursive call, because a^${e} = (a^${Math.floor(e / 2)})²${e & 1 ? ' · a' : ''}.`, { b: e })
        T.role(id, 'compare')
        const h = go(Math.floor(e / 2), id)
        T.clear().role(id, 'active')
        let r = mod(BigInt(h) * BigInt(h))
        t.step('square', `Back in power(a, ${e}) with h = a^${Math.floor(e / 2)} ≡ ${h}. Square: h² ≡ ${r} (mod ${M}) — that is a^${2 * Math.floor(e / 2)}.`, { b: e, h, r })
        if (e & 1) {
          r = mod(BigInt(r) * BigInt(A % M))
          t.step('odd', `${e} is odd, so one more factor of a: r ≡ ${r}. Now r = a^${e}.`, { b: e, h, r })
        }
        T.role(id, 'done').note(id, `≡ ${r}`)
        S.pop()
        t.step('ret', `Return a^${e} ≡ ${r} (mod ${M}).`, { b: e, r })
        return r
      }
      const ans = go(B, null)
      T.clear()
      t.step('ret', `${A}^${B} mod ${M} = ${ans}. Depth ${Math.floor(Math.log2(Math.max(1, B))) + 2} calls, each doing ≤ 2 multiplications: O(log b) time and O(log b) stack.`, { result: ans })
    }),
}

/* ───────────────────────── 12. Matrix power for Fibonacci ───────────────────────── */

export const mathPowMatrix: Algorithm = {
  id: 'math-pow-matrix',
  title: 'Fibonacci by matrix power — [[1,1],[1,0]]ⁿ',
  blurb: 'Mⁿ = [[F(n+1), F(n)], [F(n), F(n−1)]]. Fast power works for matrices because the product is associative.',
  legend: { active: 'current bit', write: 'just multiplied', compare: 'just squared', found: 'F(n)' },
  inputs: [
    { name: 'n', label: 'n', type: 'string', default: '10' },
    { name: 'm', label: 'modulus', type: 'string', default: '1000000007' },
  ],
  random: () => ({ n: String(rint(5, 90)), m: ['1000000007', '1000', '10'][rint(0, 2)] }),
  code: {
    pseudo: `
R ← I (2×2 identity); B ← [[1,1],[1,0]]      // @init
while n > 0
  if n is odd: R ← R·B mod m                 // @mul
  B ← B·B mod m; n ← ⌊n/2⌋                   // @square
return R[0][1]           // R = Mⁿ           // @done`,
    cpp: `
typedef array<array<long long, 2>, 2> Mat;
Mat mul(const Mat& X, const Mat& Y, long long m) {   // m < 2^31
    Mat Z{};
    for (int i = 0; i < 2; i++)
        for (int j = 0; j < 2; j++)
            for (int k = 0; k < 2; k++) Z[i][j] = (Z[i][j] + X[i][k] * Y[k][j]) % m;
    return Z;
}
long long fib(long long n, long long m) {
    Mat R = {{{1, 0}, {0, 1}}}, B = {{{1, 1}, {1, 0}}};      // @init
    while (n > 0) {
        if (n & 1) R = mul(R, B, m);                         // @mul
        B = mul(B, B, m); n >>= 1;                           // @square
    }
    return R[0][1] % m;   // R = M^n = [[F(n+1), F(n)], [F(n), F(n-1)]]   @done
}`,
    java: `
static long[][] mul(long[][] X, long[][] Y, long m) {   // m < 2^31
    long[][] Z = new long[2][2];
    for (int i = 0; i < 2; i++)
        for (int j = 0; j < 2; j++)
            for (int k = 0; k < 2; k++) Z[i][j] = (Z[i][j] + X[i][k] * Y[k][j]) % m;
    return Z;
}
static long fib(long n, long m) {
    long[][] R = {{1, 0}, {0, 1}}, B = {{1, 1}, {1, 0}};     // @init
    while (n > 0) {
        if ((n & 1) == 1) R = mul(R, B, m);                  // @mul
        B = mul(B, B, m); n >>= 1;                           // @square
    }
    return R[0][1] % m;                                      // @done
}`,
    python: `
def mul(X, Y, m):
    return [[(X[i][0] * Y[0][j] + X[i][1] * Y[1][j]) % m for j in range(2)] for i in range(2)]

def fib(n, m):
    R, B = [[1, 0], [0, 1]], [[1, 1], [1, 0]]          # @init
    while n > 0:
        if n & 1:
            R = mul(R, B, m)                           # @mul
        B = mul(B, B, m); n >>= 1                      # @square
    return R[0][1] % m                                 # @done`,
    js: `
const mul = (X, Y, m) => [0, 1].map((i) => [0, 1].map((j) => (X[i][0] * Y[0][j] + X[i][1] * Y[1][j]) % m));
function fib(n, m) {            // BigInt n and m
  let R = [[1n, 0n], [0n, 1n]], B = [[1n, 1n], [1n, 0n]];    // @init
  while (n > 0n) {
    if (n & 1n) R = mul(R, B, m);                            // @mul
    B = mul(B, B, m); n >>= 1n;                              // @square
  }
  return R[0][1] % m;                                        // @done
}`,
    c: `
/* Z = X*Y mod m (Z may alias X or Y); m < 2^31 */
void mul(long long X[2][2], long long Y[2][2], long long Z[2][2], long long m) {
    long long T[2][2];
    for (int i = 0; i < 2; i++)
        for (int j = 0; j < 2; j++)
            T[i][j] = (X[i][0] * Y[0][j] + X[i][1] * Y[1][j]) % m;
    memcpy(Z, T, sizeof T);
}
long long fib(long long n, long long m) {
    long long R[2][2] = {{1, 0}, {0, 1}}, B[2][2] = {{1, 1}, {1, 0}};   // @init
    while (n > 0) {
        if (n & 1) mul(R, B, R, m);                          // @mul
        mul(B, B, B, m); n >>= 1;                            // @square
    }
    return R[0][1] % m;                                      // @done
}`,
  },
  run: ({ n, m }) =>
    trace((t) => {
      const N = big(n, 'n', 0n, 10n ** 18n)
      const M = big(m, 'modulus', 2n, 2n ** 62n)
      type Mat = [[bigint, bigint], [bigint, bigint]]
      const mul = (X: Mat, Y: Mat): Mat => [
        [(X[0][0] * Y[0][0] + X[0][1] * Y[1][0]) % M, (X[0][0] * Y[0][1] + X[0][1] * Y[1][1]) % M],
        [(X[1][0] * Y[0][0] + X[1][1] * Y[1][0]) % M, (X[1][0] * Y[0][1] + X[1][1] * Y[1][1]) % M],
      ]
      const bits = bitsOf(N)
      const W = bits.length
      const Bits = t.array('bits', bits, { label: `n = ${N} in binary` })
      let R: Mat = [[1n, 0n], [0n, 1n]]
      let B: Mat = [[1n % M, 1n % M], [1n % M, 0n]]
      const GR = t.grid('R', R.map((r) => r.map(String)), { label: 'R = M^(bits of n read so far)' })
      const GB = t.grid('B', B.map((r) => r.map(String)), { label: 'B = M^(2^i)' })
      const sync = () => {
        R.forEach((row, i) => row.forEach((v, j) => GR.set(i, j, String(v))))
        B.forEach((row, i) => row.forEach((v, j) => GB.set(i, j, String(v))))
      }
      let e = 0n
      let pw = 1n
      t.step('init', `R = I = M⁰, B = M = [[1,1],[1,0]]. Why M: [F(k+1), F(k)]ᵀ = M·[F(k), F(k−1)]ᵀ is just F(k+1) = F(k) + F(k−1), so Mⁿ = [[F(n+1), F(n)], [F(n), F(n−1)]].`, { 'R = M^': '0', 'B = M^': '1' })
      let x = N
      let i = 0
      while (x > 0n) {
        const k = W - 1 - i
        Bits.clear().role(k, 'active').ptr('i', k)
        const bitOne = (x & 1n) === 1n
        if (bitOne) {
          R = mul(R, B)
          e += pw
          sync()
          GR.clear().role(0, 0, 'write').role(0, 1, 'write').role(1, 0, 'write').role(1, 1, 'write')
          GB.clear()
          t.step('mul', `Bit ${i} of n is 1: R = R·B. Exponents add: R = M^${e}, so R[0][1] = F(${e}) ≡ ${R[0][1]}.`, { 'R = M^': String(e), 'B = M^': String(pw) })
        }
        B = mul(B, B)
        pw *= 2n
        x >>= 1n
        sync()
        GR.clear()
        GB.clear().role(0, 0, 'compare').role(0, 1, 'compare').role(1, 0, 'compare').role(1, 1, 'compare')
        t.step('square', `${bitOne ? '' : `Bit ${i} of n is 0: R is unchanged. `}Square B: M^${pw / 2n} → M^${pw} (8 multiplications for a 2×2 product). ${x > 0n ? `${W - 1 - i} bit${W - 1 - i === 1 ? '' : 's'} left.` : 'No bits left.'}`, { 'R = M^': String(e), 'B = M^': String(pw) })
        i++
      }
      Bits.clear().ptr('i', null)
      GB.clear()
      GR.clear().role(0, 1, 'found')
      t.step('done', `R = M^${N}, so F(${N}) mod ${M} = R[0][1] = ${R[0][1]}. ${W} squarings and ${bits.filter((b) => b).length} products of 2×2 matrices: O(8·log n) multiplications — F(10¹⁸) is about 60 rounds.`, { 'F(n) mod m': String(R[0][1]) })
    }),
}

/* ───────────────────────── 13. Fast doubling ───────────────────────── */

export const mathPowFastDoubling: Algorithm = {
  id: 'math-pow-fastdoubling',
  title: 'Fast doubling: (F(k), F(k+1)) → (F(2k), F(2k+1))',
  blurb: 'F(2k) = F(k)·(2F(k+1) − F(k)) and F(2k+1) = F(k)² + F(k+1)². Halve n, recurse once, combine — the matrix method with the redundant entries removed.',
  legend: { active: 'running call', compare: 'waiting', done: 'returned (F(n), F(n+1))' },
  inputs: [
    { name: 'n', label: 'n', type: 'string', default: '13' },
    { name: 'm', label: 'modulus', type: 'string', default: '1000000007' },
  ],
  random: () => ({ n: String(rint(5, 200)), m: '1000000007' }),
  code: {
    pseudo: `
function fib(n)          // returns (F(n), F(n+1))
  if n = 0: return (0, 1)                    // @base
  (a, b) ← fib(⌊n/2⌋)    // a = F(k), b = F(k+1)   @call
  c ← a·(2b − a); d ← a² + b²   // F(2k), F(2k+1)  @combine
  if n odd: return (d, c + d) else (c, d)    // @ret`,
    cpp: `
// returns {F(n), F(n+1)} mod m, m < 2^31
pair<long long, long long> fib(long long n, long long m) {
    if (n == 0) return {0, 1 % m};                           // @base
    auto [a, b] = fib(n / 2, m);       // a = F(k), b = F(k+1)   @call
    long long c = a * ((2 * b - a + m) % m) % m;   // F(2k)
    long long d = (a * a + b * b) % m;              // F(2k+1)   @combine
    if (n & 1) return {d, (c + d) % m};                      // @ret
    return {c, d};
}`,
    java: `
// returns {F(n), F(n+1)} mod m, m < 2^31
static long[] fib(long n, long m) {
    if (n == 0) return new long[]{0, 1 % m};                 // @base
    long[] h = fib(n / 2, m);          // F(k), F(k+1)   @call
    long a = h[0], b = h[1];
    long c = a * ((2 * b - a + m) % m) % m;         // F(2k)
    long d = (a * a + b * b) % m;                   // F(2k+1)   @combine
    if ((n & 1) == 1) return new long[]{d, (c + d) % m};     // @ret
    return new long[]{c, d};
}`,
    python: `
def fib(n, m):               # returns (F(n), F(n+1)) mod m
    if n == 0:
        return 0, 1 % m                      # @base
    a, b = fib(n // 2, m)                    # @call
    c = a * (2 * b - a) % m                  # F(2k)
    d = (a * a + b * b) % m                  # F(2k+1)   @combine
    return (d, (c + d) % m) if n & 1 else (c, d)   # @ret`,
    js: `
function fib(n, m) {         // BigInt n, m; returns [F(n), F(n+1)] mod m
  if (n === 0n) return [0n, 1n % m];                         // @base
  const [a, b] = fib(n / 2n, m);                             // @call
  const c = a * ((2n * b - a + m) % m) % m;   // F(2k)
  const d = (a * a + b * b) % m;              // F(2k+1)   @combine
  return n & 1n ? [d, (c + d) % m] : [c, d];                 // @ret
}`,
    c: `
/* *f = F(n) mod m, *g = F(n+1) mod m; m < 2^31 */
void fib(long long n, long long m, long long *f, long long *g) {
    if (n == 0) { *f = 0; *g = 1 % m; return; }              // @base
    long long a, b;
    fib(n / 2, m, &a, &b);             /* a = F(k), b = F(k+1) */   // @call
    long long c = a * ((2 * b - a + m) % m) % m;   /* F(2k) */
    long long d = (a * a + b * b) % m;             /* F(2k+1) */  // @combine
    if (n & 1) { *f = d; *g = (c + d) % m; } else { *f = c; *g = d; }   // @ret
}`,
  },
  run: ({ n, m }) =>
    trace((t) => {
      const N = big(n, 'n', 0n, 10n ** 18n)
      const M = big(m, 'modulus', 2n, 2n ** 62n)
      const T = t.tree('rt', { label: 'calls: fib(n) needs only fib(⌊n/2⌋)' })
      const S = t.stack('cs', 'call stack')
      const go = (k: bigint, parent: string | null): [bigint, bigint] => {
        const id = T.node(`fib(${k})`)
        if (parent) T.addChild(parent, id)
        else T.setRoot(id)
        S.push(`fib(${k})`)
        T.clear().role(id, 'active')
        if (k === 0n) {
          T.role(id, 'done').note(id, '(0, 1)')
          t.step('base', 'fib(0) returns (F(0), F(1)) = (0, 1).', { n: '0', 'F(n)': '0', 'F(n+1)': '1' })
          S.pop()
          return [0n, 1n % M]
        }
        const h = k / 2n
        t.step('call', `fib(${k}) halves: k = ⌊${k}/2⌋ = ${h}. It needs (F(${h}), F(${h + 1n})).`, { n: String(k), k: String(h) })
        T.role(id, 'compare')
        const [a, b] = go(h, id)
        T.clear().role(id, 'active')
        const c = (a * ((2n * b - a + M) % M)) % M
        const d = (a * a + b * b) % M
        t.step('combine', `With F(${h}) = ${a}, F(${h + 1n}) = ${b}: F(${2n * h}) = ${a}·(2·${b} − ${a}) ≡ ${c}, F(${2n * h + 1n}) = ${a}² + ${b}² ≡ ${d}.`, { n: String(k), 'F(2k)': String(c), 'F(2k+1)': String(d) })
        const out: [bigint, bigint] = k & 1n ? [d, (c + d) % M] : [c, d]
        T.role(id, 'done').note(id, `(${out[0]}, ${out[1]})`)
        S.pop()
        t.step('ret', k & 1n ? `${k} is odd = 2·${h} + 1: return (F(${k}), F(${k + 1n})) = (F(2k+1), F(2k) + F(2k+1)) = (${out[0]}, ${out[1]}).` : `${k} is even = 2·${h}: return (F(2k), F(2k+1)) = (${out[0]}, ${out[1]}).`, { n: String(k), 'F(n)': String(out[0]), 'F(n+1)': String(out[1]) })
        return out
      }
      const [f] = go(N, null)
      T.clear()
      t.step('ret', `F(${N}) mod ${M} = ${f}. One call per bit of n and about 3 multiplications each — roughly 3× fewer than 2×2 matrix power.`, { 'F(n) mod m': String(f) })
    }),
}

export const algorithms2: Algorithm[] = [
  mathSieveEratosthenes,
  mathSieveSpf,
  mathSieveLinear,
  mathSieveSegmented,
  mathPhiDivisors,
  mathPhiDivCount,
  mathPhiSieve,
  mathModFermat,
  mathModMulmod,
  mathPowBinary,
  mathPowRecursive,
  mathPowMatrix,
  mathPowFastDoubling,
]
