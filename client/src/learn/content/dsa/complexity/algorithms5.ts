import { trace } from '../../../engine/tracer'
import type { Algorithm, Scalar } from '../../../engine/types'
import { rint } from '../../../algorithms/util'

/* Complexity topic — animations, part 5: the cost model (big numbers), Euclid's logarithmic loop, and the doubling experiment. */

const r2 = (x: number) => Math.round(x * 100) / 100

/* ───────────────────────── 1. Adding big numbers digit by digit ───────────────────────── */

export const cxBigAdd: Algorithm = {
  id: 'cx-big-add',
  title: 'Adding two big numbers — O(d), not O(1)',
  blurb: 'A machine word holds about 19 decimal digits. Beyond that, "+" is a loop over the digits with a carry.',
  legend: { active: 'column being added', write: 'digit written', compare: 'carry' },
  inputs: [
    { name: 'x', label: 'x (digits)', type: 'string', default: '987654321098' },
    { name: 'y', label: 'y (digits)', type: 'string', default: '76543210987' },
  ],
  random: () => {
    const d = (k: number) => String(rint(1, 9)) + Array.from({ length: k - 1 }, () => rint(0, 9)).join('')
    return { x: d(rint(8, 12)), y: d(rint(5, 12)) }
  },
  code: {
    pseudo: `
function add(x, y)          // digit strings, least significant digit last
  carry ← 0; i ← |x| − 1; j ← |y| − 1          // @init
  while i ≥ 0 or j ≥ 0 or carry > 0
    s ← carry + digit(x, i) + digit(y, j)      // @col
    write s mod 10; carry ← ⌊s / 10⌋           // @write
    i ← i − 1; j ← j − 1
  return the written digits, reversed          // @done`,
    cpp: `
string add(const string& x, const string& y) {
    string r; int carry = 0;                                   // @init
    for (int i = x.size() - 1, j = y.size() - 1; i >= 0 || j >= 0 || carry; i--, j--) {
        int s = carry + (i >= 0 ? x[i] - '0' : 0) + (j >= 0 ? y[j] - '0' : 0);   // @col
        r.push_back('0' + s % 10); carry = s / 10;             // @write
    }
    reverse(r.begin(), r.end());
    return r;                                                  // @done
}`,
    java: `
static String add(String x, String y) {
    StringBuilder r = new StringBuilder(); int carry = 0;      // @init
    for (int i = x.length() - 1, j = y.length() - 1; i >= 0 || j >= 0 || carry > 0; i--, j--) {
        int s = carry + (i >= 0 ? x.charAt(i) - '0' : 0) + (j >= 0 ? y.charAt(j) - '0' : 0);   // @col
        r.append((char) ('0' + s % 10)); carry = s / 10;       // @write
    }
    return r.reverse().toString();                             // @done
}`,
    python: `
def add(x, y):
    r, carry = [], 0                       # @init
    i, j = len(x) - 1, len(y) - 1
    while i >= 0 or j >= 0 or carry:
        s = carry + (int(x[i]) if i >= 0 else 0) + (int(y[j]) if j >= 0 else 0)   # @col
        r.append(str(s % 10)); carry = s // 10   # @write
        i -= 1; j -= 1
    return ''.join(reversed(r))            # @done`,
    js: `
function add(x, y) {
  const r = []; let carry = 0;                                 // @init
  for (let i = x.length - 1, j = y.length - 1; i >= 0 || j >= 0 || carry; i--, j--) {
    const s = carry + (i >= 0 ? +x[i] : 0) + (j >= 0 ? +y[j] : 0);   // @col
    r.push(s % 10); carry = Math.floor(s / 10);                // @write
  }
  return r.reverse().join('');                                 // @done
}`,
    c: `
/* writes x + y into out (big enough: max(|x|,|y|) + 2 bytes) */
void add(const char *x, const char *y, char *out) {
    int i = strlen(x) - 1, j = strlen(y) - 1, k = 0, carry = 0;   // @init
    char tmp[512];
    while (i >= 0 || j >= 0 || carry) {
        int s = carry + (i >= 0 ? x[i--] - '0' : 0) + (j >= 0 ? y[j--] - '0' : 0);   // @col
        tmp[k++] = '0' + s % 10; carry = s / 10;               // @write
    }
    for (int q = 0; q < k; q++) out[q] = tmp[k - 1 - q];
    out[k] = '\\0';                                             // @done
}`,
  },
  run: ({ x, y }) =>
    trace((t) => {
      const X = String(x).trim()
      const Y = String(y).trim()
      if (!/^\d{1,12}$/.test(X) || !/^\d{1,12}$/.test(Y)) throw new Error('Type two whole numbers of up to 12 digits.')
      const W = Math.max(X.length, Y.length) + 1
      const pad = (s: string) => Array.from({ length: W }, (_, k) => {
        const i = s.length - W + k
        return i >= 0 ? Number(s[i]) : null
      }) as Scalar[]
      const ax = t.array('x', pad(X), { label: 'x' })
      const ay = t.array('y', pad(Y), { label: 'y' })
      const ar = t.array('r', Array(W).fill(null), { label: 'x + y' })
      const m = t.meter('ops', 'Digit additions', [{ label: 'd = digits', value: W - 1 }])
      let carry = 0
      t.step('init', `${X.length}- and ${Y.length}-digit numbers. On a 64-bit machine, numbers past ~1.8·10¹⁹ do not fit a word, so "+" becomes this loop: one step per digit column.`, { carry })
      for (let k = W - 1; k >= 0; k--) {
        const dx = (ax.get(k) as number | null) ?? 0
        const dy = (ay.get(k) as number | null) ?? 0
        if (ax.get(k) == null && ay.get(k) == null && !carry) break
        const s = carry + dx + dy
        ax.clear().role(k, 'active')
        ay.clear().role(k, 'active')
        ar.clear()
        m.add(1)
        t.step('col', `Column ${W - 1 - k} (from the right): ${carry} + ${dx} + ${dy} = ${s}.`, { carry, sum: s })
        carry = Math.floor(s / 10)
        ar.set(k, s % 10)
        ar.role(k, 'write')
        if (carry && k > 0) ar.role(k - 1, 'compare')
        t.step('write', `Write ${s % 10}, carry ${carry}.`, { carry })
      }
      ax.clear()
      ay.clear()
      ar.clear()
      m.role = 'done'
      t.step('done', `${m.value} column additions for ${Math.max(X.length, Y.length)}-digit inputs: Θ(d). In Python every int is like this — adding two 10⁶-digit numbers is a million steps, not one. In the RAM model only word-sized numbers (about log n bits) cost O(1).`, { digits: m.value })
    }),
}

/* ───────────────────────── 2. Euclid's algorithm: why it is O(log) ───────────────────────── */

export const cxEuclid: Algorithm = {
  id: 'cx-euclid',
  title: 'Euclid’s gcd — the numbers at least halve every two steps',
  blurb: 'a mod b < a/2 always. Consecutive Fibonacci numbers are the worst case: about log_φ n steps.',
  legend: { active: 'this step (a, b)', found: 'gcd', compare: 'a mod b < a / 2' },
  inputs: [
    { name: 'a', label: 'a', type: 'number', default: '89', min: 1, max: 1e15 },
    { name: 'b', label: 'b', type: 'number', default: '55', min: 0, max: 1e15 },
  ],
  random: () => {
    const fib = [1, 2]
    while (fib.length < 30) fib.push(fib[fib.length - 1] + fib[fib.length - 2])
    const k = rint(8, 25)
    return Math.random() < 0.5 ? { a: String(fib[k]), b: String(fib[k - 1]) } : { a: String(rint(100, 100000)), b: String(rint(10, 10000)) }
  },
  code: {
    pseudo: `
function gcd(a, b)
  while b ≠ 0                 // @step
    (a, b) ← (b, a mod b)     // @step
  return a                    // @done`,
    cpp: `
long long gcd(long long a, long long b) {
    while (b != 0) {                 // @step
        long long r = a % b;
        a = b; b = r;                // @step
    }
    return a;                        // @done
}`,
    java: `
static long gcd(long a, long b) {
    while (b != 0) {                 // @step
        long r = a % b;
        a = b; b = r;                // @step
    }
    return a;                        // @done
}`,
    python: `
def gcd(a, b):
    while b:                 # @step
        a, b = b, a % b      # @step
    return a                 # @done`,
    js: `
function gcd(a, b) {
  while (b !== 0) {                  // @step
    [a, b] = [b, a % b];             // @step
  }
  return a;                          // @done
}`,
    c: `
long long gcd(long long a, long long b) {
    while (b != 0) {                 // @step
        long long r = a % b;
        a = b; b = r;                // @step
    }
    return a;                        // @done
}`,
  },
  run: ({ a, b }) =>
    trace((t) => {
      let A = Math.floor(a as number)
      let B = Math.floor(b as number)
      if (A < 1 || B < 0) throw new Error('Use a ≥ 1 and b ≥ 0.')
      const G = t.grid('steps', [], { label: 'each row is one iteration', colLabels: ['a', 'b', 'a%b', '<a/2?'] })
      const top = Math.max(A, B, 2)
      const phi = (1 + Math.sqrt(5)) / 2
      const m = t.meter('it', 'Iterations', [
        { label: 'log_φ(max) (Fibonacci worst case)', value: r2(Math.log(top) / Math.log(phi)) },
        { label: '2·log₂(max)', value: r2(2 * Math.log2(top)) },
      ])
      t.step('step', `gcd(${A}, ${B}). Each iteration replaces (a, b) by (b, a mod b).`, { a: A, b: B })
      while (B !== 0) {
        const r = A % B
        G.rows.push([A, B, r, r < A / 2 ? 'yes' : 'no'])
        const k = G.rows.length - 1
        G.clear()
        for (let c = 0; c < 3; c++) G.role(k, c, 'active')
        G.role(k, 3, 'compare')
        if (k >= 2) G.arrow([k - 2, 0], [k, 0], '≤ ½', 'compare')
        m.add(1)
        t.step('step', `${A} mod ${B} = ${r}. ${r < A / 2 ? `${r} < ${A}/2: ` : ''}If b ≤ a/2 then a mod b < b ≤ a/2; if b > a/2 then a mod b = a − b < a/2. Either way the remainder is under half of a.`, { a: A, b: B, 'a mod b': r })
        A = B
        B = r
      }
      G.clear()
      if (G.rows.length) G.role(G.rows.length - 1, 1, 'found')
      m.role = 'done'
      t.step('done', `gcd = ${A} after ${m.value} iterations. Two iterations turn a into a mod b < a/2, so after 2k iterations a < max/2ᵏ: at most 2·log₂(max) + 1 iterations. Fibonacci inputs shrink slowest (each quotient is 1), giving ≈ log_φ n ≈ 1.44·log₂ n — still O(log n).`, { gcd: A })
    }),
}

/* ───────────────────────── 3. The doubling experiment ───────────────────────── */

const SHAPES: Record<string, { label: string; ops: (n: number) => number }> = {
  n: { label: 'one loop', ops: (n) => n },
  'n log n': { label: 'sort-like', ops: (n) => n * Math.ceil(Math.log2(n)) },
  'n^2': { label: 'all pairs', ops: (n) => (n * (n - 1)) / 2 },
  'n^3': { label: 'triple loop', ops: (n) => (n * (n - 1) * (n - 2)) / 6 },
  'sqrt n': { label: 'trial division', ops: (n) => Math.floor(Math.sqrt(n)) },
  '2^n': { label: 'all subsets', ops: (n) => 2 ** n },
}

export const cxDoubling: Algorithm = {
  id: 'cx-doubling',
  title: 'The doubling experiment — read the exponent off the ratios',
  blurb: 'Double n, measure the work, take the ratio T(2n)/T(n). Its log₂ is the exponent b in T(n) ≈ a·nᵇ.',
  legend: { active: 'new measurement', compare: 'ratio', found: 'estimated exponent' },
  inputs: [
    { name: 'shape', label: 'Algorithm', type: 'string', default: 'n^2', hint: Object.keys(SHAPES).join(' | ') },
    { name: 'n0', label: 'Start n', type: 'number', default: '250', min: 4, max: 100000 },
  ],
  random: () => {
    const k = Object.keys(SHAPES).filter((s) => s !== '2^n')
    return { shape: k[rint(0, k.length - 1)], n0: String(rint(100, 2000)) }
  },
  code: {
    pseudo: `
n ← n₀; prev ← time(run(n))                    // @row
repeat
  n ← 2n; cur ← time(run(n))
  ratio ← cur / prev; b ← log₂(ratio)          // @ratio
  prev ← cur
// b settles at the exponent: 1 → linear, 2 → quadratic   @done`,
    cpp: `
auto t = [&](int n) {                    // wall-clock time of one run
    auto s = chrono::steady_clock::now(); run(n);
    return chrono::duration<double>(chrono::steady_clock::now() - s).count();
};
double prev = t(n0);                                       // @row
for (int n = 2 * n0; n <= 64 * n0; n *= 2) {
    double cur = t(n);
    printf("%d %.3f ratio %.2f b %.2f\\n", n, cur, cur / prev, log2(cur / prev));   // @ratio
    prev = cur;
}                                                          // @done`,
    java: `
double prev = time(n0);                                    // @row
for (int n = 2 * n0; n <= 64 * n0; n *= 2) {
    double cur = time(n);   // System.nanoTime() around run(n)
    System.out.printf("%d %.3f ratio %.2f b %.2f%n", n, cur, cur / prev, Math.log(cur / prev) / Math.log(2));   // @ratio
    prev = cur;
}                                                          // @done`,
    python: `
import time
def t(n):
    s = time.perf_counter(); run(n); return time.perf_counter() - s
prev = t(n0)                                               # @row
n = 2 * n0
while n <= 64 * n0:
    cur = t(n)
    print(n, cur, cur / prev, math.log2(cur / prev))       # @ratio
    prev, n = cur, 2 * n
                                                           # @done`,
    js: `
const t = (n) => { const s = performance.now(); run(n); return performance.now() - s; };
let prev = t(n0);                                          // @row
for (let n = 2 * n0; n <= 64 * n0; n *= 2) {
  const cur = t(n);
  console.log(n, cur, cur / prev, Math.log2(cur / prev));  // @ratio
  prev = cur;
}                                                          // @done`,
    c: `
double prev = seconds(n0);   /* clock() around run(n) */  // @row
for (int n = 2 * n0; n <= 64 * n0; n *= 2) {
    double cur = seconds(n);
    printf("%d %.3f ratio %.2f b %.2f\\n", n, cur, cur / prev, log2(cur / prev));   // @ratio
    prev = cur;
}                                                          // @done`,
  },
  run: ({ shape, n0 }) =>
    trace((t) => {
      const S = SHAPES[String(shape).trim()]
      if (!S) throw new Error(`Algorithm must be one of: ${Object.keys(SHAPES).join(', ')}`)
      const start = Math.floor(n0 as number)
      const isExp = String(shape).trim() === '2^n'
      const G = t.grid('tab', [], { label: `T(n) for the “${S.label}” shape (operation counts stand in for seconds)`, colLabels: ['n', 'T(n)', 'T(2n)/T(n)', 'log₂ ratio'] })
      let n = isExp ? Math.min(start, 20) : start
      let prev = S.ops(n)
      G.rows.push([n, Math.round(prev), '—', '—'])
      G.role(0, 0, 'active').role(0, 1, 'active')
      t.step('row', `Measure at n = ${n}: ${Math.round(prev)} operations. Now keep doubling n.`, { n })
      let last = 0
      for (let k = 0; k < 6; k++) {
        n = isExp ? n + 1 : n * 2
        const cur = S.ops(n)
        const ratio = cur / prev
        last = Math.log2(ratio)
        G.rows.push([n, cur > 1e12 ? cur.toExponential(2) : Math.round(cur), r2(ratio), r2(last)])
        const r = G.rows.length - 1
        G.clear().role(r, 0, 'active').role(r, 1, 'active').role(r, 2, 'compare').role(r, 3, 'compare')
        G.arrow([r - 1, 1], [r, 1], `×${r2(ratio)}`, 'compare')
        t.step('ratio', isExp ? `n + 1 = ${n}: the work doubles again (ratio ${r2(ratio)}) — for exponential growth even adding ONE to n doubles the time.` : `n = ${n}: T(2n)/T(n) = ${r2(ratio)}, so b ≈ log₂ ${r2(ratio)} = ${r2(last)}.`, { n, ratio: r2(ratio), b: r2(last) })
        prev = cur
      }
      G.clear().role(G.rows.length - 1, 3, 'found')
      t.step(
        'done',
        isExp
          ? 'Adding 1 to n doubles the time: T(n) ≈ a·2ⁿ. No polynomial exponent fits — the doubling ratio itself would be 2ⁿ, exploding.'
          : `The log-ratio settles near ${r2(last)}${String(shape).trim() === 'n log n' ? ' (slightly above 1 — the log factor adds a little each doubling)' : ''}. Predict: if n = 10⁶ took 1 s, then n = 4·10⁶ takes about 4ᵇ ≈ ${r2(4 ** last)} s. Real timings are noisier (caches, JIT warm-up), so repeat runs and use large n.`,
        { b: r2(last) },
      )
    }),
}

export const algorithms5: Algorithm[] = [cxBigAdd, cxEuclid, cxDoubling]
