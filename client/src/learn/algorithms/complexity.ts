import { trace } from '../engine/tracer'
import type { Algorithm, Scalar } from '../engine/types'
import { list, rarr, rint } from './util'

const lg = (n: number) => Math.log2(n)
const big = (x: number) => (x >= 1e7 ? x.toExponential(1).replace('e+', 'e') : String(Math.round(x)))

/* ───────────────────────── 1. Counting operations ───────────────────────── */

export const cxCountOps: Algorithm = {
  id: 'cx-count-ops',
  title: 'Counting operations — summing an array',
  blurb: 'Charge 1 for every assignment, test and addition, and watch the total grow as 3n + 3.',
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '4 8 15 16 23 42', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(3, 10), 1, 50)) }),
  code: {
    pseudo: `
function total(arr, n)
  s ← 0                    // 1 op          @init
  i ← 0                    // 1 op          @init
  while i < n              // n + 1 tests   @test
    s ← s + arr[i]         // n additions   @body
    i ← i + 1              // n increments  @inc
  return s                 // total 3n + 3  @done`,
    cpp: `
long long total(const vector<int>& a) {
    long long s = 0;               // @init
    size_t i = 0;                  // @init
    while (i < a.size()) {         // @test
        s += a[i];                 // @body
        i++;                       // @inc
    }
    return s;                      // @done
}`,
    java: `
static long total(int[] a) {
    long s = 0;                    // @init
    int i = 0;                     // @init
    while (i < a.length) {         // @test
        s += a[i];                 // @body
        i++;                       // @inc
    }
    return s;                      // @done
}`,
    python: `
def total(a):
    s = 0                  # @init
    i = 0                  # @init
    while i < len(a):      # @test
        s += a[i]          # @body
        i += 1             # @inc
    return s               # @done`,
    js: `
function total(a) {
  let s = 0;                       // @init
  let i = 0;                       // @init
  while (i < a.length) {           // @test
    s += a[i];                     // @body
    i++;                           // @inc
  }
  return s;                        // @done
}`,
    c: `
long long total(const int *a, int n) {
    long long s = 0;               // @init
    int i = 0;                     // @init
    while (i < n) {                // @test
        s += a[i];                 // @body
        i++;                       // @inc
    }
    return s;                      // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      const a = t.array('arr', v, { label: `arr (n = ${n})` })
      const m = t.meter('ops', 'Operations executed', [
        { label: 'n', value: n },
        { label: '3n + 3', value: 3 * n + 3 },
      ])
      let s = 0
      let i = 0
      m.add(2)
      t.step('init', 's = 0 and i = 0: two assignments, 2 operations. This happens once, whatever n is.', { s, i, ops: m.value })
      while (true) {
        m.add(1)
        a.clear().ptr('i', i < n ? i : null)
        if (i < n) a.role(i, 'compare')
        t.step('test', i < n ? `Test i < n: ${i} < ${n} is true (1 op).` : `Test i < n: ${i} < ${n} is false (1 op) — the loop ends. The test ran n + 1 = ${n + 1} times: once more than the body.`, { s, i, ops: m.value })
        if (i >= n) break
        s += v[i]
        m.add(1)
        a.clear().ptr('i', i).role(i, 'active')
        t.step('body', `s = s + arr[${i}] = ${s} (1 op).`, { s, i, ops: m.value })
        i++
        m.add(1)
        t.step('inc', `i = ${i} (1 op). Each pass of the loop costs 3 operations.`, { s, i, ops: m.value })
      }
      a.clear().ptr('i', null)
      m.role = 'done'
      t.step('done', `Total: 2 + (n + 1) + n + n = 3n + 3 = ${m.value}. Double the array and the count roughly doubles — the constant 3 and the + 3 do not change that. We say the running time is O(n).`, { s, ops: m.value })
    }),
}

/* ───────────────────────── 2. Nested loops: all ordered pairs ───────────────────────── */

export const cxNested: Algorithm = {
  id: 'cx-nested',
  legend: { done: 'visited', active: 'visiting now', window: 'this row' },
  title: 'Nested loops — n × n iterations',
  blurb: 'The inner loop runs n times for each of the n outer iterations.',
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '5', min: 1, max: 8 }],
  random: () => ({ n: String(rint(3, 8)) }),
  code: {
    pseudo: `
function allPairs(n)
  count ← 0                  // @init
  for i ← 0 to n − 1         // @outer
    for j ← 0 to n − 1       // @inner
      count ← count + 1      // @work
  return count               // = n²   @done`,
    cpp: `
long long allPairs(int n) {
    long long count = 0;                   // @init
    for (int i = 0; i < n; i++)            // @outer
        for (int j = 0; j < n; j++)        // @inner
            count++;                       // @work
    return count;                          // @done
}`,
    java: `
static long allPairs(int n) {
    long count = 0;                        // @init
    for (int i = 0; i < n; i++)            // @outer
        for (int j = 0; j < n; j++)        // @inner
            count++;                       // @work
    return count;                          // @done
}`,
    python: `
def all_pairs(n):
    count = 0                  # @init
    for i in range(n):         # @outer
        for j in range(n):     # @inner
            count += 1         # @work
    return count               # @done`,
    js: `
function allPairs(n) {
  let count = 0;                           // @init
  for (let i = 0; i < n; i++)              // @outer
    for (let j = 0; j < n; j++)            // @inner
      count++;                             // @work
  return count;                            // @done
}`,
    c: `
long long all_pairs(int n) {
    long long count = 0;                   // @init
    for (int i = 0; i < n; i++)            // @outer
        for (int j = 0; j < n; j++)        // @inner
            count++;                       // @work
    return count;                          // @done
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = n as number
      const g = t.grid('pairs', Array.from({ length: N }, () => Array<Scalar>(N).fill(null)), {
        label: 'Every (i, j) the loops visit',
        rowLabels: Array.from({ length: N }, (_, i) => `i=${i}`),
        colLabels: Array.from({ length: N }, (_, j) => `j=${j}`),
      })
      const m = t.meter('work', 'Times the body ran', [
        { label: 'n', value: N },
        { label: 'n²', value: N * N },
      ])
      t.step('init', `A grid of n × n = ${N * N} cells: one per (i, j) pair. Each time the body runs, one cell fills in.`, { count: 0 })
      for (let i = 0; i < N; i++) {
        g.keep('done')
        for (let j = 0; j < N; j++) g.role(i, j, 'window')
        t.step('outer', `Outer loop: i = ${i}. The whole inner loop (n = ${N} iterations) runs for this one value of i.`, { i, count: m.value })
        for (let j = 0; j < N; j++) {
          g.keep('done', 'window')
          g.role(i, j, 'active')
          g.set(i, j, m.value + 1)
          m.add(1)
          t.step(j === 0 ? 'inner' : 'work', `i = ${i}, j = ${j}: body run #${m.value}.`, { i, j, count: m.value })
          g.role(i, j, 'done')
        }
      }
      g.keep('done')
      m.role = 'done'
      t.step('done', `The body ran n · n = ${N} · ${N} = ${m.value} times. Double n and the work quadruples: O(n²).`, { count: m.value })
    }),
}

/* ───────────────────────── 3. Triangular loops: j starts after i ───────────────────────── */

export const cxTriangle: Algorithm = {
  id: 'cx-triangle',
  legend: { dim: 'skipped (j ≤ i)', done: 'visited', active: 'visiting now' },
  title: 'Triangular loops — j starts after i',
  blurb: 'Half the grid is skipped, yet n(n − 1)/2 is still Θ(n²).',
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '6', min: 2, max: 8 }],
  random: () => ({ n: String(rint(3, 8)) }),
  code: {
    pseudo: `
function distinctPairs(n)
  count ← 0                    // @init
  for i ← 0 to n − 1           // @outer
    for j ← i + 1 to n − 1     // @inner
      count ← count + 1        // @work
  return count                 // = n(n − 1)/2   @done`,
    cpp: `
long long distinctPairs(int n) {
    long long count = 0;                   // @init
    for (int i = 0; i < n; i++)            // @outer
        for (int j = i + 1; j < n; j++)    // @inner
            count++;                       // @work
    return count;                          // @done
}`,
    java: `
static long distinctPairs(int n) {
    long count = 0;                        // @init
    for (int i = 0; i < n; i++)            // @outer
        for (int j = i + 1; j < n; j++)    // @inner
            count++;                       // @work
    return count;                          // @done
}`,
    python: `
def distinct_pairs(n):
    count = 0                          # @init
    for i in range(n):                 # @outer
        for j in range(i + 1, n):      # @inner
            count += 1                 # @work
    return count                       # @done`,
    js: `
function distinctPairs(n) {
  let count = 0;                           // @init
  for (let i = 0; i < n; i++)              // @outer
    for (let j = i + 1; j < n; j++)        // @inner
      count++;                             // @work
  return count;                            // @done
}`,
    c: `
long long distinct_pairs(int n) {
    long long count = 0;                   // @init
    for (int i = 0; i < n; i++)            // @outer
        for (int j = i + 1; j < n; j++)    // @inner
            count++;                       // @work
    return count;                          // @done
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = n as number
      const g = t.grid('pairs', Array.from({ length: N }, () => Array<Scalar>(N).fill(null)), {
        label: 'Pairs with i < j',
        rowLabels: Array.from({ length: N }, (_, i) => `i=${i}`),
        colLabels: Array.from({ length: N }, (_, j) => `j=${j}`),
      })
      for (let i = 0; i < N; i++) for (let j = 0; j <= i; j++) g.role(i, j, 'dim')
      const m = t.meter('work', 'Times the body ran', [
        { label: 'n', value: N },
        { label: 'n(n−1)/2', value: (N * (N - 1)) / 2 },
        { label: 'n²', value: N * N },
      ])
      t.step('init', 'The dim cells (j ≤ i) are never visited: each unordered pair is counted once.', { count: 0 })
      for (let i = 0; i < N; i++) {
        g.keep('done', 'dim')
        t.step('outer', `i = ${i}: the inner loop runs for j = ${i + 1}…${N - 1}, that is ${N - 1 - i} time${N - 1 - i === 1 ? '' : 's'}.`, { i, count: m.value })
        for (let j = i + 1; j < N; j++) {
          g.keep('done', 'dim')
          g.role(i, j, 'active')
          m.add(1)
          g.set(i, j, m.value)
          t.step(j === i + 1 ? 'inner' : 'work', `(i, j) = (${i}, ${j}): run #${m.value}.`, { i, j, count: m.value })
          g.role(i, j, 'done')
        }
      }
      g.keep('done', 'dim')
      m.role = 'done'
      t.step('done', `(n − 1) + (n − 2) + … + 1 + 0 = n(n − 1)/2 = ${m.value}. That is about half of n² = ${N * N}, but halving is a constant factor: still O(n²). Double n and the work still roughly quadruples.`, { count: m.value })
    }),
}

/* ───────────────────────── 4. Halving: logarithmic loops ───────────────────────── */

export const cxHalving: Algorithm = {
  id: 'cx-halving',
  title: 'Halving — why loops like this are O(log n)',
  blurb: 'Each step throws away half of what is left, so even a billion needs only 30 steps.',
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '100', min: 1, max: 1000000000 }],
  random: () => ({ n: String(rint(2, 5000)) }),
  code: {
    pseudo: `
function halvings(n)
  steps ← 0                // @init
  while n > 1              // @test
    n ← ⌊n / 2⌋            // @half
    steps ← steps + 1      // @half
  return steps             // = ⌊log₂ n⌋   @done`,
    cpp: `
int halvings(long long n) {
    int steps = 0;             // @init
    while (n > 1) {            // @test
        n /= 2;                // @half
        steps++;               // @half
    }
    return steps;              // @done
}`,
    java: `
static int halvings(long n) {
    int steps = 0;             // @init
    while (n > 1) {            // @test
        n /= 2;                // @half
        steps++;               // @half
    }
    return steps;              // @done
}`,
    python: `
def halvings(n):
    steps = 0              # @init
    while n > 1:           # @test
        n //= 2            # @half
        steps += 1         # @half
    return steps           # @done`,
    js: `
function halvings(n) {
  let steps = 0;               // @init
  while (n > 1) {              // @test
    n = Math.floor(n / 2);     // @half
    steps++;                   // @half
  }
  return steps;                // @done
}`,
    c: `
int halvings(long long n) {
    int steps = 0;             // @init
    while (n > 1) {            // @test
        n /= 2;                // @half
        steps++;               // @half
    }
    return steps;              // @done
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      let x = Math.floor(n as number)
      const N = x
      const seq = t.array('seq', [x], { label: 'Values n takes' })
      const m = t.meter('steps', 'Loop iterations', [{ label: '⌊log₂ n⌋', value: Math.floor(lg(Math.max(1, N))) }])
      seq.role(0, 'active')
      t.step('init', `Start with n = ${N}. A loop that did n = n − 1 would need ${N - 1} iterations; this one divides by 2.`, { n: x, steps: 0 })
      while (true) {
        seq.clear().role(seq.length - 1, 'compare')
        t.step('test', x > 1 ? `n = ${x} > 1: keep going.` : `n = ${x}: stop.`, { n: x, steps: m.value })
        if (x <= 1) break
        const prev = x
        x = Math.floor(x / 2)
        seq.push(x)
        seq.clear().role(seq.length - 1, 'new').arrow(seq.length - 2, seq.length - 1, '÷2')
        m.add(1)
        t.step('half', `n = ⌊${prev} / 2⌋ = ${x}. Half of what was left is gone after one step.`, { n: x, steps: m.value })
      }
      seq.clear()
      m.role = 'done'
      t.step('done', `${m.value} iterations for n = ${N}: that is ⌊log₂ ${N}⌋ = ${Math.floor(lg(Math.max(1, N)))}. Doubling n adds just one more step — the signature of O(log n). (For n = 10⁹ it is 29.)`, { steps: m.value, 'n − 1 (linear)': N - 1 })
    }),
}

/* ───────────────────────── 5. Doubling outer loop × linear inner loop ───────────────────────── */

export const cxNLogN: Algorithm = {
  id: 'cx-nlogn',
  legend: { done: 'visited', active: 'visiting now' },
  title: 'O(n log n) — a doubling loop around a linear one',
  blurb: 'The outer loop runs about log₂ n times; each run costs n.',
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '8', min: 2, max: 12 }],
  random: () => ({ n: String(rint(4, 12)) }),
  code: {
    pseudo: `
function work(n)
  count ← 0                          // @init
  i ← 1
  while i < n                        // @outer
    for j ← 0 to n − 1               // @inner
      count ← count + 1              // @work
    i ← i × 2                        // @double
  return count                       // ≈ n log₂ n   @done`,
    cpp: `
long long work(int n) {
    long long count = 0;                       // @init
    for (int i = 1; i < n; i *= 2)             // @outer,double
        for (int j = 0; j < n; j++)            // @inner
            count++;                           // @work
    return count;                              // @done
}`,
    java: `
static long work(int n) {
    long count = 0;                            // @init
    for (int i = 1; i < n; i *= 2)             // @outer,double
        for (int j = 0; j < n; j++)            // @inner
            count++;                           // @work
    return count;                              // @done
}`,
    python: `
def work(n):
    count = 0                      # @init
    i = 1
    while i < n:                   # @outer
        for j in range(n):         # @inner
            count += 1             # @work
        i *= 2                     # @double
    return count                   # @done`,
    js: `
function work(n) {
  let count = 0;                               // @init
  for (let i = 1; i < n; i *= 2)               // @outer,double
    for (let j = 0; j < n; j++)                // @inner
      count++;                                 // @work
  return count;                                // @done
}`,
    c: `
long long work(int n) {
    long long count = 0;                       // @init
    for (int i = 1; i < n; i *= 2)             // @outer,double
        for (int j = 0; j < n; j++)            // @inner
            count++;                           // @work
    return count;                              // @done
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = n as number
      const is: number[] = []
      for (let i = 1; i < N; i *= 2) is.push(i)
      const g = t.grid('runs', is.map(() => Array<Scalar>(N).fill(null)), {
        label: 'One row per outer iteration',
        rowLabels: is.map((i) => `i=${i}`),
        colLabels: Array.from({ length: N }, (_, j) => String(j)),
      })
      const m = t.meter('work', 'Times the body ran', [
        { label: 'n', value: N },
        { label: 'n·⌈log₂ n⌉', value: N * is.length },
        { label: 'n²', value: N * N },
      ])
      t.step('init', `i takes the values ${is.join(', ')} — ${is.length} of them, about log₂ ${N} ≈ ${lg(N).toFixed(2)}.`, { count: 0 })
      is.forEach((i, r) => {
        g.keep('done')
        t.step('outer', `i = ${i}: run the inner loop in full, n = ${N} times.`, { i, count: m.value })
        for (let j = 0; j < N; j++) {
          g.keep('done')
          g.role(r, j, 'active')
          m.add(1)
          g.set(r, j, m.value)
          t.step(j === 0 ? 'inner' : 'work', `i = ${i}, j = ${j}: run #${m.value}.`, { i, j, count: m.value })
          g.role(r, j, 'done')
        }
        g.keep('done')
        t.step('double', `i doubles to ${i * 2}${i * 2 >= N ? ` ≥ n: the outer loop ends` : ''}.`, { i: i * 2, count: m.value })
      })
      m.role = 'done'
      t.step('done', `${is.length} rows × ${N} = ${m.value}. n log n grows a little faster than n and far slower than n² (${N * N}). Sorting algorithms like merge sort live here.`, { count: m.value })
    }),
}

/* ───────────────────────── 6. Harmonic loops ───────────────────────── */

export const cxHarmonic: Algorithm = {
  id: 'cx-harmonic',
  legend: { done: 'visited', active: 'visiting now' },
  title: 'Harmonic loops — j jumps by i',
  blurb: 'n/1 + n/2 + n/3 + … ≈ n ln n: looks quadratic, is not.',
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '10', min: 2, max: 12 }],
  random: () => ({ n: String(rint(6, 12)) }),
  code: {
    pseudo: `
function multiples(n)
  count ← 0                        // @init
  for i ← 1 to n                   // @outer
    for j ← i, 2i, 3i, … ≤ n       // @inner
      count ← count + 1            // @work
  return count     // n/1 + n/2 + … + n/n ≈ n ln n   @done`,
    cpp: `
long long multiples(int n) {
    long long count = 0;                           // @init
    for (int i = 1; i <= n; i++)                   // @outer
        for (int j = i; j <= n; j += i)            // @inner
            count++;                               // @work
    return count;                                  // @done
}`,
    java: `
static long multiples(int n) {
    long count = 0;                                // @init
    for (int i = 1; i <= n; i++)                   // @outer
        for (int j = i; j <= n; j += i)            // @inner
            count++;                               // @work
    return count;                                  // @done
}`,
    python: `
def multiples(n):
    count = 0                              # @init
    for i in range(1, n + 1):              # @outer
        for j in range(i, n + 1, i):       # @inner
            count += 1                     # @work
    return count                           # @done`,
    js: `
function multiples(n) {
  let count = 0;                                   // @init
  for (let i = 1; i <= n; i++)                     // @outer
    for (let j = i; j <= n; j += i)                // @inner
      count++;                                     // @work
  return count;                                    // @done
}`,
    c: `
long long multiples(int n) {
    long long count = 0;                           // @init
    for (int i = 1; i <= n; i++)                   // @outer
        for (int j = i; j <= n; j += i)            // @inner
            count++;                               // @work
    return count;                                  // @done
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = n as number
      const g = t.grid('mult', Array.from({ length: N }, () => Array<Scalar>(N).fill(null)), {
        label: 'Row i: the multiples of i up to n',
        rowLabels: Array.from({ length: N }, (_, i) => `i=${i + 1}`),
        colLabels: Array.from({ length: N }, (_, j) => String(j + 1)),
      })
      const H = Array.from({ length: N }, (_, i) => Math.floor(N / (i + 1))).reduce((a, b) => a + b, 0)
      const m = t.meter('work', 'Times the body ran', [
        { label: 'n', value: N },
        { label: 'n ln n', value: Math.round(N * Math.log(N)) },
        { label: 'n²', value: N * N },
      ])
      t.step('init', 'The inner loop starts at i and jumps by i, so row i only touches multiples of i.', { count: 0 })
      for (let i = 1; i <= N; i++) {
        g.keep('done')
        t.step('outer', `i = ${i}: the inner loop runs ⌊${N}/${i}⌋ = ${Math.floor(N / i)} time${Math.floor(N / i) === 1 ? '' : 's'}.`, { i, count: m.value })
        for (let j = i; j <= N; j += i) {
          g.keep('done')
          g.role(i - 1, j - 1, 'active')
          m.add(1)
          g.set(i - 1, j - 1, j)
          t.step(j === i ? 'inner' : 'work', `j = ${j}.`, { i, j, count: m.value })
          g.role(i - 1, j - 1, 'done')
        }
      }
      g.keep('done')
      m.role = 'done'
      t.step('done', `Total ${H} = n(1 + 1/2 + … + 1/n). The harmonic sum is about ln n, so this is O(n log n) — nowhere near the ${N * N} cells of the full grid. The sieve of Eratosthenes has this shape.`, { count: m.value })
    }),
}

/* ───────────────────────── 7. The growth table ───────────────────────── */

export const cxGrowth: Algorithm = {
  id: 'cx-growth',
  legend: { removed: 'over 10⁹ steps', compare: 'over 10⁸ steps' },
  title: 'Growth rates side by side',
  blurb: 'The same n plugged into each common running time.',
  inputs: [{ name: 'ns', label: 'Values of n', type: 'array', default: '1 2 4 8 16 32 64 128', maxLen: 10, min: 1, max: 100000 }],
  random: () => ({ ns: list([...new Set(rarr(7, 1, 200))].sort((a, b) => a - b)) }),
  code: {
    pseudo: `
for each n in ns                                  // @row
  print n, log₂ n, n, n log₂ n, n², n³, 2ⁿ       // @cells
// at 10⁸ simple steps per second:
//   n = 10⁶ → n log n ≈ 0.2 s, n² ≈ 3 hours`,
    cpp: `
for (double n : ns)                                          // @row
    printf("%g %g %g %g %g %g %g\\n", n, log2(n), n,
           n * log2(n), n * n, n * n * n, pow(2, n));       // @cells`,
    java: `
for (double n : ns)                                           // @row
    System.out.printf("%g %g %g %g %g %g %g%n", n, Math.log(n) / Math.log(2), n,
        n * Math.log(n) / Math.log(2), n * n, n * n * n, Math.pow(2, n));   // @cells`,
    python: `
from math import log2
for n in ns:                                              # @row
    print(n, log2(n), n, n * log2(n), n**2, n**3, 2**n)   # @cells`,
    js: `
for (const n of ns)                                           // @row
  console.log(n, Math.log2(n), n, n * Math.log2(n), n ** 2, n ** 3, 2 ** n);   // @cells`,
    c: `
for (int k = 0; k < m; k++) {                                 // @row
    double n = ns[k];
    printf("%g %g %g %g %g %g %g\\n", n, log2(n), n,
           n * log2(n), n * n, n * n * n, pow(2, n));         // @cells
}`,
  },
  run: ({ ns }) =>
    trace((t) => {
      const vals = [...(ns as number[])].sort((a, b) => a - b)
      const heads = ['log₂ n', 'n', 'n log₂ n', 'n²', 'n³', '2ⁿ']
      const g = t.grid('table', [], { label: 'Steps needed', colLabels: heads, rowLabels: [] })
      t.step('row', 'Each row plugs one n into every growth rate. At roughly 10⁸ simple steps per second, anything past 10⁹ is too slow for a 1-second limit.', {})
      vals.forEach((n, r) => {
        const cells = [lg(n), n, n * lg(n), n * n, n * n * n, Math.pow(2, n)]
        g.rows.push(cells.map((x) => (Number.isInteger(x) || x >= 1e7 ? big(x) : x.toFixed(1))))
        g.opts.rowLabels = vals.slice(0, r + 1).map((x) => `n=${x}`)
        g.clear()
        cells.forEach((x, c) => {
          if (x > 1e9) g.role(r, c, 'removed')
          else if (x > 1e8) g.role(r, c, 'compare')
        })
        for (let q = 0; q < r; q++)
          g.rows[q].forEach((_, c) => {
            const x = [lg(vals[q]), vals[q], vals[q] * lg(vals[q]), vals[q] ** 2, vals[q] ** 3, 2 ** vals[q]][c]
            if (x > 1e9) g.role(q, c, 'removed')
            else if (x > 1e8) g.role(q, c, 'compare')
          })
        const slow = heads.filter((_, c) => cells[c] > 1e9)
        t.step('cells', `n = ${n}: ${slow.length ? `${slow.join(', ')} already exceed${slow.length === 1 ? 's' : ''} 10⁹ steps (red).` : 'every rate is still tiny.'}`, { n })
      })
      t.step('cells', 'Read down a column: log n barely moves, n and n log n grow steadily, n² and n³ explode, and 2ⁿ is hopeless beyond n ≈ 30. The growth rate, not the constant, decides what is feasible.', {})
    }),
}

/* ───────────────────────── 8. Best, worst and average case ───────────────────────── */

export const cxCases: Algorithm = {
  id: 'cx-cases',
  legend: { dim: 'already checked' },
  title: 'Best, average and worst case — linear search',
  blurb: 'Same algorithm, same n, very different costs depending on where the target is.',
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '12 7 30 42 19 8 25 3', maxLen: 12 },
    { name: 'x', label: 'Target', type: 'number', default: '19' },
  ],
  random: () => {
    const a = rarr(rint(6, 10), 1, 50)
    return { arr: list(a), x: String(Math.random() < 0.7 ? a[rint(0, a.length - 1)] : 99) }
  },
  code: {
    pseudo: `
function search(arr, n, x)
  for i ← 0 to n − 1          // @loop
    if arr[i] = x             // @cmp
      return i                // best: 1 comparison   @found
  return −1                   // worst: n comparisons  @miss`,
    cpp: `
int search(const vector<int>& a, int x) {
    for (int i = 0; i < (int)a.size(); i++)   // @loop
        if (a[i] == x)                        // @cmp
            return i;                         // @found
    return -1;                                // @miss
}`,
    java: `
static int search(int[] a, int x) {
    for (int i = 0; i < a.length; i++)        // @loop
        if (a[i] == x)                        // @cmp
            return i;                         // @found
    return -1;                                // @miss
}`,
    python: `
def search(a, x):
    for i in range(len(a)):       # @loop
        if a[i] == x:             # @cmp
            return i              # @found
    return -1                     # @miss`,
    js: `
function search(a, x) {
  for (let i = 0; i < a.length; i++)          // @loop
    if (a[i] === x)                           // @cmp
      return i;                               // @found
  return -1;                                  // @miss
}`,
    c: `
int search(const int *a, int n, int x) {
    for (int i = 0; i < n; i++)               // @loop
        if (a[i] == x)                        // @cmp
            return i;                         // @found
    return -1;                                // @miss
}`,
  },
  run: ({ arr, x }) =>
    trace((t) => {
      const v = arr as number[]
      const X = x as number
      const n = v.length
      const a = t.array('arr', v, { label: 'arr' })
      const m = t.meter('cmp', 'Comparisons', [
        { label: 'best', value: 1 },
        { label: 'average', value: (n + 1) / 2 },
        { label: 'worst', value: n },
      ])
      t.step('loop', `Search for ${X} among n = ${n} values. Best case: it is first (1 comparison). Worst case: it is last or absent (${n}). Average, if it is equally likely to be anywhere: (n + 1)/2 = ${(n + 1) / 2}.`, { i: 0, comparisons: 0 })
      for (let i = 0; i < n; i++) {
        for (let q = 0; q < i; q++) a.role(q, 'dim')
        a.ptr('i', i).role(i, 'compare')
        m.add(1)
        t.step('cmp', `Compare arr[${i}] = ${v[i]} with ${X}.`, { i, comparisons: m.value })
        if (v[i] === X) {
          a.role(i, 'found')
          m.role = 'found'
          const kind = i === 0 ? 'the best case' : i === n - 1 ? 'the worst case for a present value' : 'somewhere in between'
          t.step('found', `Found at index ${i} after ${m.value} comparison${m.value === 1 ? '' : 's'} — ${kind}. Big-O describes the worst case unless we say otherwise, so linear search is O(n).`, { i, comparisons: m.value })
          return
        }
        a.role(i, 'dim')
      }
      a.ptr('i', null)
      m.role = 'removed'
      t.step('miss', `Not found: all ${n} values were checked. This is the worst case, and it is exactly what O(n) promises never to exceed (up to a constant).`, { comparisons: m.value })
    }),
}

/* ───────────────────────── 9. Space: the call stack of a recursive sum ───────────────────────── */

export const cxRecSpace: Algorithm = {
  id: 'cx-rec-space',
  legend: { active: 'running now', found: 'base case', write: 'returning', done: 'already summed' },
  title: 'Space complexity — recursion uses the call stack',
  blurb: 'No array is allocated, yet memory grows with n: one stack frame per pending call.',
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '3 1 4 1 5', maxLen: 8 }],
  random: () => ({ arr: list(rarr(rint(3, 7), 1, 9)) }),
  code: {
    pseudo: `
function sum(arr, i, n)          // sum of arr[i..n−1]
  if i = n then return 0         // @base
  rest ← sum(arr, i + 1, n)      // @call
  return arr[i] + rest           // @ret`,
    cpp: `
long long sum(const vector<int>& a, size_t i) {
    if (i == a.size()) return 0;          // @base
    long long rest = sum(a, i + 1);       // @call
    return a[i] + rest;                   // @ret
}`,
    java: `
static long sum(int[] a, int i) {
    if (i == a.length) return 0;          // @base
    long rest = sum(a, i + 1);            // @call
    return a[i] + rest;                   // @ret
}`,
    python: `
def total(a, i=0):
    if i == len(a):              # @base
        return 0                 # @base
    rest = total(a, i + 1)       # @call
    return a[i] + rest           # @ret`,
    js: `
function sum(a, i = 0) {
  if (i === a.length) return 0;           // @base
  const rest = sum(a, i + 1);             // @call
  return a[i] + rest;                     // @ret
}`,
    c: `
long long sum(const int *a, int i, int n) {
    if (i == n) return 0;                 // @base
    long long rest = sum(a, i + 1, n);    // @call
    return a[i] + rest;                   // @ret
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      const a = t.array('arr', v, { label: 'arr' })
      const st = t.stack('calls', 'Call stack')
      const m = t.meter('depth', 'Stack frames alive', [{ label: 'n + 1', value: n + 1 }])
      let peak = 0
      const rec = (i: number): number => {
        st.push(`sum(i=${i})`)
        m.value = st.length
        peak = Math.max(peak, st.length)
        st.clear().role(st.length - 1, 'active')
        a.clear().ptr('i', i < n ? i : null)
        if (i < n) a.role(i, 'active')
        if (i === n) {
          st.set(st.length - 1, 'sum(i=' + i + ') → 0')
          st.role(st.length - 1, 'found')
          t.step('base', `i = n = ${n}: the empty suffix sums to 0. The stack is at its deepest: ${st.length} frames, each waiting for the one above it.`, { i, depth: st.length, peak })
          st.pop()
          m.value = st.length
          return 0
        }
        t.step('call', `sum(i=${i}) cannot answer yet: it needs sum(i=${i + 1}) first, so its frame stays on the stack.`, { i, depth: st.length, peak })
        const rest = rec(i + 1)
        const r = v[i] + rest
        st.set(st.length - 1, `sum(i=${i}) → ${r}`)
        st.clear().role(st.length - 1, 'write')
        a.clear().ptr('i', i).role(i, 'active')
        for (let q = i + 1; q < n; q++) a.role(q, 'done')
        t.step('ret', `Back in sum(i=${i}): arr[${i}] + ${rest} = ${r}. Return, and the frame is freed.`, { i, rest, depth: st.length, peak })
        st.pop()
        m.value = st.length
        return r
      }
      t.step('call', 'No extra array is created — but every call that is still waiting keeps a stack frame (its i, its return address).', { depth: 0, peak: 0 })
      const total = rec(0)
      a.clear().ptr('i', null)
      m.value = peak
      m.role = 'done'
      t.step('ret', `Sum = ${total}. Time O(n), but the stack reached ${peak} frames: O(n) extra space. A plain loop with one accumulator needs O(1). Deep recursion (n ≈ 10⁵–10⁶) can overflow the stack.`, { result: total, peak })
    }),
}

/* ───────────────────────── 10. Amortized cost of push_back ───────────────────────── */

export const cxAmortized: Algorithm = {
  id: 'cx-amortized',
  legend: { removed: 'push that copies', new: 'cheap push', write: 'copied' },
  title: 'Amortized analysis — the true cost of push_back',
  blurb: 'Most pushes cost 1; a few cost a full copy. Averaged, it is under 3 per push.',
  inputs: [{ name: 'k', label: 'Pushes', type: 'number', default: '12', min: 1, max: 17 }],
  random: () => ({ k: String(rint(6, 17)) }),
  code: {
    pseudo: `
function push(x)
  if size = capacity                   // @full
    capacity ← 2 × capacity            // @grow
    copy all size elements             // cost: size   @grow
  data[size] ← x; size ← size + 1      // cost: 1      @write`,
    cpp: `
void push(int x) {
    if (size == cap) {                          // @full
        cap = cap ? 2 * cap : 1;                // @grow
        int *nd = new int[cap];
        copy(data, data + size, nd);            // @grow
        delete[] data; data = nd;
    }
    data[size++] = x;                           // @write
}`,
    java: `
void push(int x) {
    if (size == data.length) {                          // @full
        data = Arrays.copyOf(data, Math.max(1, 2 * size));  // @grow
    }
    data[size++] = x;                                   // @write
}`,
    python: `
def push(self, x):
    if self.size == self.cap:                 # @full
        self.cap = max(1, 2 * self.cap)       # @grow
        new = [None] * self.cap
        new[:self.size] = self.data[:self.size]   # @grow
        self.data = new
    self.data[self.size] = x                  # @write
    self.size += 1                            # @write`,
    js: `
push(x) {
  if (this.size === this.cap) {                     // @full
    this.cap = Math.max(1, 2 * this.cap);           // @grow
    const nd = new Array(this.cap);
    for (let i = 0; i < this.size; i++) nd[i] = this.data[i];   // @grow
    this.data = nd;
  }
  this.data[this.size++] = x;                       // @write
}`,
    c: `
void push(Vec *v, int x) {
    if (v->size == v->cap) {                        // @full
        v->cap = v->cap ? 2 * v->cap : 1;           // @grow
        v->data = realloc(v->data, v->cap * sizeof(int));   // @grow
    }
    v->data[v->size++] = x;                         // @write
}`,
  },
  run: ({ k }) =>
    trace((t) => {
      const K = k as number
      let cap = 1
      const buf = t.array('buf', [], { label: 'data (capacity 1)', capacity: 1 })
      const costs = t.array('cost', [], { label: 'Cost of each push', bars: true, capacity: K })
      const m = t.meter('total', 'Total cost so far', [
        { label: 'k', value: K },
        { label: '3k', value: 3 * K },
      ])
      t.step('write', 'Each push costs 1 for writing the value — plus the size of the array whenever it is full and must be copied into a buffer twice as large.', { size: 0, capacity: cap, total: 0 })
      for (let x = 1; x <= K; x++) {
        const size = buf.length
        let cost = 1
        t.step('full', size === cap ? `Push #${x}: size = capacity = ${cap} — full.` : `Push #${x}: size ${size} < capacity ${cap} — room left.`, { size, capacity: cap, total: m.value })
        if (size === cap) {
          cap *= 2
          buf.capacity = cap
          buf.opts.label = `data (capacity ${cap})`
          for (let q = 0; q < size; q++) buf.role(q, 'write')
          cost += size
          t.step('grow', `Allocate ${cap} slots and copy all ${size} values: ${size} extra operations.`, { size, capacity: cap, copies: size })
        }
        buf.clear()
        buf.push(x)
        buf.role(buf.length - 1, 'new')
        costs.push(cost)
        costs.clear().role(costs.length - 1, cost > 1 ? 'removed' : 'new')
        m.add(cost)
        t.step('write', `Write the value: this push cost ${cost}. Total ${m.value} for ${x} push${x === 1 ? '' : 'es'} → ${(m.value / x).toFixed(2)} per push.`, { size: buf.length, capacity: cap, total: m.value, 'per push': Number((m.value / x).toFixed(2)) })
      }
      m.role = 'done'
      t.step('write', `Copies happen at sizes 1, 2, 4, 8…, and 1 + 2 + 4 + … < 2k. So k pushes cost under 3k in total: O(1) amortized per push, even though a single push can cost O(n).`, { total: m.value, 'per push': Number((m.value / K).toFixed(2)) })
    }),
}

/* ───────────────────────── 11. Recursion tree of merge sort ───────────────────────── */

export const cxMergeLevels: Algorithm = {
  id: 'cx-merge-levels',
  legend: { window: 'one part', best: 'neighbouring part', done: 'merged part', write: 'merged' },
  title: 'Recursion tree — T(n) = 2T(n/2) + n',
  blurb: 'log₂ n levels, n work per level: n log n in total.',
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '38 27 43 3 9 82 10 5', maxLen: 8 }],
  random: () => ({ arr: list(rarr(8, 1, 99)) }),
  code: {
    pseudo: `
function mergeSort(a, lo, hi)             // T(n)
  if hi − lo ≤ 1 then return              // @base
  mid ← (lo + hi) / 2
  mergeSort(a, lo, mid)                   // T(n/2)   @split
  mergeSort(a, mid, hi)                   // T(n/2)   @split
  merge(a, lo, mid, hi)                   // + n      @merge`,
    cpp: `
void mergeSort(vector<int>& a, int lo, int hi) {
    if (hi - lo <= 1) return;                  // @base
    int mid = (lo + hi) / 2;
    mergeSort(a, lo, mid);                     // @split
    mergeSort(a, mid, hi);                     // @split
    inplace_merge(a.begin() + lo, a.begin() + mid, a.begin() + hi);   // @merge
}`,
    java: `
static void mergeSort(int[] a, int lo, int hi) {
    if (hi - lo <= 1) return;                  // @base
    int mid = (lo + hi) / 2;
    mergeSort(a, lo, mid);                     // @split
    mergeSort(a, mid, hi);                     // @split
    merge(a, lo, mid, hi);                     // @merge
}`,
    python: `
def merge_sort(a):
    if len(a) <= 1:                  # @base
        return a
    mid = len(a) // 2
    left = merge_sort(a[:mid])       # @split
    right = merge_sort(a[mid:])      # @split
    return merge(left, right)        # @merge`,
    js: `
function mergeSort(a) {
  if (a.length <= 1) return a;                 // @base
  const mid = a.length >> 1;
  const left = mergeSort(a.slice(0, mid));     // @split
  const right = mergeSort(a.slice(mid));       // @split
  return merge(left, right);                   // @merge
}`,
    c: `
void merge_sort(int *a, int *tmp, int lo, int hi) {
    if (hi - lo <= 1) return;                  // @base
    int mid = (lo + hi) / 2;
    merge_sort(a, tmp, lo, mid);               // @split
    merge_sort(a, tmp, mid, hi);               // @split
    merge(a, tmp, lo, mid, hi);                // @merge
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      const segsAt: [number, number][][] = [[[0, n]]]
      while (segsAt[segsAt.length - 1].some(([l, h]) => h - l > 1)) {
        const next: [number, number][] = []
        for (const [l, h] of segsAt[segsAt.length - 1]) {
          if (h - l <= 1) next.push([l, h])
          else {
            const mid = (l + h) >> 1
            next.push([l, mid], [mid, h])
          }
        }
        segsAt.push(next)
      }
      const depth = segsAt.length
      const m = t.meter('work', 'Merge work done', [
        { label: 'n', value: n },
        { label: 'n·log₂ n', value: Math.round(n * Math.ceil(lg(n))) },
        { label: 'n²', value: n * n },
      ])
      const paint = (L: ReturnType<typeof t.array>, segs: [number, number][], role: 'window' | 'done') => {
        L.range(segs.map(([l, h], k) => ({ from: l, to: h - 1, role: k % 2 ? 'best' : role, label: undefined })))
      }
      const L0 = t.array('L0', v, { label: 'level 0: the whole array' })
      paint(L0, segsAt[0], 'window')
      const levels = [L0]
      t.last(m)
      t.step('split', `Level 0 is the whole array: one problem of size ${n}.`, { level: 0, work: 0 })
      for (let d = 1; d < depth; d++) {
        const L = t.array(`L${d}`, v, { label: `level ${d}: ${segsAt[d].length} parts of size ≤ ${Math.ceil(n / 2 ** d)}` })
        paint(L, segsAt[d], 'window')
        levels[d] = L
        t.last(m)
        t.step(d === depth - 1 ? 'base' : 'split', d === depth - 1 ? `Level ${d}: every part has size 1 — the base case. ${depth} levels in all, about log₂ ${n} + 1.` : `Level ${d}: each part splits in two. Splitting is O(1) per call; the real work is merging on the way back up.`, { level: d, work: 0 })
      }
      const cur = [...v]
      for (let d = depth - 2; d >= 0; d--) {
        for (const [l, h] of segsAt[d]) {
          const part = cur.slice(l, h).sort((x, y) => x - y)
          for (let q = l; q < h; q++) cur[q] = part[q - l]
        }
        const L = levels[d]
        cur.forEach((x, q) => L.set(q, x))
        L.clear()
        for (let q = 0; q < n; q++) L.role(q, 'write')
        paint(L, segsAt[d], 'done')
        m.add(n)
        t.step('merge', `Merge back to level ${d}: the ${segsAt[d].length} merge${segsAt[d].length === 1 ? '' : 's'} at this level touch every element once — ${n} work in total, no matter how the parts are sized.`, { level: d, work: m.value })
        L.clear()
      }
      m.role = 'done'
      t.step('merge', `${depth - 1} merge levels × ${n} = ${m.value}. The recurrence T(n) = 2T(n/2) + n solves to Θ(n log n): the tree has log n levels and each costs n.`, { work: m.value })
    }),
}

/* ───────────────────────── 12. √n: divisors by trial division ───────────────────────── */

export const cxSqrt: Algorithm = {
  id: 'cx-sqrt',
  legend: { found: 'divisor ≤ √n' },
  title: 'O(√n) — divisors come in pairs',
  blurb: 'If i divides n, so does n / i; one of the two is at most √n.',
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '36', min: 1, max: 400 }],
  random: () => ({ n: String(rint(12, 400)) }),
  code: {
    pseudo: `
function divisors(n)
  i ← 1                         // @init
  while i × i ≤ n               // @test
    if n mod i = 0              // @check
      output i and n / i        // (once if i = n / i)   @pair
    i ← i + 1                   // @inc`,
    cpp: `
vector<long long> divisors(long long n) {
    vector<long long> d;
    for (long long i = 1;                   // @init
         i * i <= n;                        // @test
         i++) {                             // @inc
        if (n % i == 0) {                   // @check
            d.push_back(i);                 // @pair
            if (i != n / i) d.push_back(n / i);   // @pair
        }
    }
    return d;
}`,
    java: `
static List<Long> divisors(long n) {
    List<Long> d = new ArrayList<>();
    for (long i = 1;                        // @init
         i * i <= n;                        // @test
         i++) {                             // @inc
        if (n % i == 0) {                   // @check
            d.add(i);                       // @pair
            if (i != n / i) d.add(n / i);   // @pair
        }
    }
    return d;
}`,
    python: `
def divisors(n):
    d = []
    i = 1                              # @init
    while i * i <= n:                  # @test
        if n % i == 0:                 # @check
            d.append(i)                # @pair
            if i != n // i:            # @pair
                d.append(n // i)       # @pair
        i += 1                         # @inc
    return d`,
    js: `
function divisors(n) {
  const d = [];
  for (let i = 1;                          // @init
       i * i <= n;                         // @test
       i++) {                              // @inc
    if (n % i === 0) {                     // @check
      d.push(i);                           // @pair
      if (i !== n / i) d.push(n / i);      // @pair
    }
  }
  return d;
}`,
    c: `
int divisors(long long n, long long *d) {
    int k = 0;
    for (long long i = 1;                   // @init
         i * i <= n;                        // @test
         i++) {                             // @inc
        if (n % i == 0) {                   // @check
            d[k++] = i;                     // @pair
            if (i != n / i) d[k++] = n / i; // @pair
        }
    }
    return k;
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      const r = Math.floor(Math.sqrt(N))
      const cand = t.array('cand', Array.from({ length: r }, (_, k) => k + 1), { label: `Candidates i = 1 … ⌊√${N}⌋ = ${r}` })
      const m = t.meter('iter', 'Loop iterations', [
        { label: '√n', value: r },
        { label: 'n', value: N },
      ])
      const found: number[] = []
      t.step('init', `A loop up to n would test ${N} numbers. But divisors pair up — i with n / i — and the smaller of each pair is at most √${N} ≈ ${Math.sqrt(N).toFixed(2)}.`, { n: N, i: 1 })
      for (let i = 1; i * i <= N; i++) {
        cand.clear().ptr('i', i - 1).role(i - 1, 'active')
        m.add(1)
        t.step('test', `i = ${i}: i² = ${i * i} ≤ ${N}, keep going.`, { n: N, i, iterations: m.value })
        cand.role(i - 1, 'compare')
        t.step('check', `${N} mod ${i} = ${N % i}${N % i === 0 ? ' — a divisor!' : '.'}`, { n: N, i, iterations: m.value })
        if (N % i === 0) {
          const j = N / i
          found.push(i)
          t.print(i === j ? `${i}  (= √${N})` : `${i} × ${j}`)
          cand.role(i - 1, 'found')
          t.step('pair', i === j ? `${i} × ${i} = ${N}: a perfect square, so this divisor is counted once.` : `${i} × ${j} = ${N}: we get ${j} for free, without ever testing it.`, { n: N, i, iterations: m.value })
        }
        cand.clear()
        found.forEach((f) => cand.role(f - 1, 'found'))
        t.step('inc', `Next i = ${i + 1}.`, { n: N, i: i + 1, iterations: m.value })
      }
      cand.ptr('i', null)
      m.role = 'done'
      const all = new Set<number>()
      found.forEach((f) => { all.add(f); all.add(N / f) })
      t.step('test', `(${r + 1})² = ${(r + 1) ** 2} > ${N}: stop. ${all.size} divisors from just ${m.value} iterations instead of ${N} — O(√n). For n = 10¹² that is 10⁶ steps instead of 10¹².`, { n: N, iterations: m.value, divisors: all.size })
    }),
}
