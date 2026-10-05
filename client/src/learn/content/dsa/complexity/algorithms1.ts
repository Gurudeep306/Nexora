import { trace } from '../../../engine/tracer'
import type { Algorithm } from '../../../engine/types'
import { list, rarr, rint } from '../../../algorithms/util'

/* Complexity topic — animations, part 1: comparing growth, sums, loop shapes, and the classic O(n²) → O(n) rewrites. */

const LOG2E = Math.log2(Math.E)

/** log₂ of each named function, so huge values (n!, nⁿ, 2ⁿ) never overflow. */
const FUNCS: Record<string, { label: string; lg: (n: number) => number }> = {
  '1': { label: '1', lg: () => 0 },
  'log n': { label: 'log₂ n', lg: (n) => Math.log2(Math.max(1e-300, Math.log2(n))) },
  'log^2 n': { label: '(log₂ n)²', lg: (n) => 2 * Math.log2(Math.max(1e-300, Math.log2(n))) },
  'sqrt n': { label: '√n', lg: (n) => Math.log2(n) / 2 },
  n: { label: 'n', lg: (n) => Math.log2(n) },
  'n log n': { label: 'n log₂ n', lg: (n) => Math.log2(n) + Math.log2(Math.max(1e-300, Math.log2(n))) },
  'n^2': { label: 'n²', lg: (n) => 2 * Math.log2(n) },
  'n^3': { label: 'n³', lg: (n) => 3 * Math.log2(n) },
  'n^10': { label: 'n¹⁰', lg: (n) => 10 * Math.log2(n) },
  '1.1^n': { label: '1.1ⁿ', lg: (n) => n * Math.log2(1.1) },
  '2^n': { label: '2ⁿ', lg: (n) => n },
  '3^n': { label: '3ⁿ', lg: (n) => n * Math.log2(3) },
  'n!': {
    label: 'n!',
    // exact for small n, Stirling (n log n − n log e + ½ log 2πn) beyond
    lg: (n) => {
      if (n <= 170) {
        let s = 0
        for (let k = 2; k <= n; k++) s += Math.log2(k)
        return s
      }
      return n * Math.log2(n) - n * LOG2E + 0.5 * Math.log2(2 * Math.PI * n)
    },
  },
  'n^n': { label: 'nⁿ', lg: (n) => n * Math.log2(n) },
  'log(n!)': {
    label: 'log₂(n!)',
    lg: (n) => {
      let s = 0
      if (n <= 1e6) for (let k = 2; k <= n; k++) s += Math.log2(k)
      else s = n * Math.log2(n) - n * LOG2E
      return Math.log2(Math.max(1e-300, s))
    },
  },
}
const FUNC_NAMES = Object.keys(FUNCS).join(', ')
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
/** 12 → ¹² */
export const sup = (k: number) => String(k).split('').map((c) => SUP[Number(c)] ?? c).join('')

/** Print 2^x readably: exact-ish when small, a×10^k when huge. */
function show(lg2: number): string {
  if (lg2 < -13) {
    const d = lg2 * Math.log10(2)
    const e = Math.floor(d)
    return `${(10 ** (d - e)).toFixed(2)}e${e}`
  }
  if (lg2 < 0) return (2 ** lg2).toPrecision(3)
  if (lg2 < 30) {
    const v = 2 ** lg2
    return Number.isInteger(Math.round(v * 1000) / 1000) && v < 1e6 ? String(Math.round(v * 1000) / 1000) : v < 1000 ? v.toPrecision(4) : String(Math.round(v))
  }
  const d = lg2 * Math.log10(2)
  const e = Math.floor(d)
  return `${(10 ** (d - e)).toFixed(2)}e${e}`
}

/* ───────────────────────── 1. Comparing growth with a limit ───────────────────────── */

export const cxRatio: Algorithm = {
  id: 'cx-ratio',
  title: 'The limit test — watch f(n) / g(n) as n grows',
  blurb: 'If the ratio heads to 0, f = o(g); to a constant, f = Θ(g); to infinity, f = ω(g).',
  legend: { active: 'new row', compare: 'ratio', found: 'verdict' },
  inputs: [
    { name: 'f', label: 'f(n)', type: 'string', default: 'n^10', hint: `one of: ${FUNC_NAMES}` },
    { name: 'g', label: 'g(n)', type: 'string', default: '1.1^n', hint: `one of: ${FUNC_NAMES}` },
    { name: 'ns', label: 'Values of n', type: 'array', default: '10 50 100 200 400 800 1600', maxLen: 10 },
  ],
  random: () => {
    const pairs = [
      ['n^10', '1.1^n'],
      ['n!', 'n^n'],
      ['log n', 'sqrt n'],
      ['log(n!)', 'n log n'],
      ['n^2', 'n^3'],
      ['2^n', '3^n'],
      ['n log n', 'n^2'],
      ['log^2 n', 'sqrt n'],
    ]
    const [f, g] = pairs[rint(0, pairs.length - 1)]
    return { f, g }
  },
  code: {
    pseudo: `
for each n in the list
  r ← f(n) / g(n)              // @row
if r keeps shrinking toward 0   → f = o(g)        // @limit
if r settles at a constant c > 0 → f = Θ(g)
if r grows without bound        → f = ω(g)`,
    cpp: `
// work in log₂ space so n! or 2ⁿ never overflows a double
for (double n : ns) {
    double lr = lg_f(n) - lg_g(n);       // log₂(f/g)   @row
    printf("%g  %g\\n", n, pow(2, lr));
}
// shrinking → o(g), flat → Θ(g), growing → ω(g)   @limit`,
    java: `
for (double n : ns) {
    double lr = lgF(n) - lgG(n);         // log₂(f/g)   @row
    System.out.printf("%g  %g%n", n, Math.pow(2, lr));
}
// shrinking → o(g), flat → Θ(g), growing → ω(g)   @limit`,
    python: `
import math
for n in ns:
    lr = lg_f(n) - lg_g(n)          # log2(f/g)   @row
    print(n, 2 ** lr)
# shrinking -> o(g), flat -> Θ(g), growing -> ω(g)   @limit`,
    js: `
for (const n of ns) {
  const lr = lgF(n) - lgG(n);            // log₂(f/g)   @row
  console.log(n, 2 ** lr);
}
// shrinking → o(g), flat → Θ(g), growing → ω(g)   @limit`,
    c: `
for (int k = 0; k < cnt; k++) {
    double n = ns[k];
    double lr = lg_f(n) - lg_g(n);       /* log2(f/g) */   // @row
    printf("%g  %g\\n", n, pow(2, lr));
}
/* shrinking -> o(g), flat -> Θ(g), growing -> ω(g) */   // @limit`,
  },
  run: ({ f, g, ns }) =>
    trace((t) => {
      const F = FUNCS[String(f).trim()]
      const G = FUNCS[String(g).trim()]
      if (!F || !G) throw new Error(`f and g must each be one of: ${FUNC_NAMES}`)
      const xs = (ns as number[]).filter((x) => x >= 2)
      if (xs.length < 2) throw new Error('Give at least two values of n, each ≥ 2.')
      const grid = t.grid('tab', [], { label: `f(n) = ${F.label} against g(n) = ${G.label}`, colLabels: ['n', F.label, G.label, 'f(n) / g(n)'] })
      const lrs: number[] = []
      for (const n of xs) {
        const lf = F.lg(n)
        const lgv = G.lg(n)
        const lr = lf - lgv
        lrs.push(lr)
        grid.rows.push([n, show(lf), show(lgv), show(lr)])
        const r = grid.rows.length - 1
        grid.clear()
        for (let c = 0; c < 3; c++) grid.role(r, c, 'active')
        grid.role(r, 3, 'compare')
        if (r > 0) grid.arrow([r - 1, 3], [r, 3], lr > lrs[r - 1] + 0.01 ? 'up' : lr < lrs[r - 1] - 0.01 ? 'down' : '=', 'compare')
        const trend = r === 0 ? '' : lr > lrs[r - 1] + 0.01 ? ' The ratio went up.' : lr < lrs[r - 1] - 0.01 ? ' The ratio went down.' : ' The ratio barely moved.'
        t.step('row', `n = ${n}: f(n) = ${show(lf)}, g(n) = ${show(lgv)}, so f/g = ${show(lr)}.${trend}`, { n, 'f/g': show(lr) })
      }
      // decide the limit far beyond the table, where the asymptotic behaviour has surely set in
      const far1 = F.lg(1e9) - G.lg(1e9)
      const far2 = F.lg(1e15) - G.lg(1e15)
      const verdict = far2 > far1 + 1 ? 'inf' : far2 < far1 - 1 ? 'zero' : 'const'
      grid.clear()
      const last = grid.rows.length - 1
      grid.role(last, 3, 'found')
      const early = lrs.length > 1 && ((verdict === 'zero' && lrs[1] > lrs[0]) || (verdict === 'inf' && lrs[1] < lrs[0]))
      const msg =
        verdict === 'zero'
          ? `The ratio tends to 0 (at n = 10¹⁵ it is ${show(far2)}): ${F.label} = o(${G.label}), so ${F.label} = O(${G.label}) but not Θ.`
          : verdict === 'inf'
            ? `The ratio grows without bound (at n = 10¹⁵ it is ${show(far2)}): ${F.label} = ω(${G.label}), so ${F.label} = Ω(${G.label}) but not O.`
            : `The ratio settles near a constant (${show(far2)} at n = 10¹⁵): ${F.label} = Θ(${G.label}).`
      t.step('limit', msg + (early ? ' Notice the early rows pointed the other way — small n can mislead; the limit is about large n.' : ''), { 'f/g': show(lrs[lrs.length - 1]) })
    }),
}

/* ───────────────────────── 2. Geometric series ───────────────────────── */

export const cxGeometric: Algorithm = {
  id: 'cx-geometric',
  title: 'A geometric series is dominated by its largest term',
  blurb: 'n + n/r + n/r² + … never reaches n · r/(r − 1): a constant multiple of the first term.',
  legend: { active: 'term just added', done: 'terms so far' },
  inputs: [
    { name: 'n', label: 'n (first term)', type: 'number', default: '64', min: 1, max: 4096 },
    { name: 'r', label: 'divide by r', type: 'number', default: '2', min: 2, max: 5 },
  ],
  random: () => ({ n: String(2 ** rint(4, 8)), r: String(rint(2, 4)) }),
  code: {
    pseudo: `
total ← 0; x ← n                   // @init
while x ≥ 1
  total ← total + x                // @term
  x ← ⌊x / r⌋
// total < n · r / (r − 1)          // @done`,
    cpp: `
long long geometric(long long n, long long r) {
    long long total = 0, x = n;          // @init
    while (x >= 1) {
        total += x;                      // @term
        x /= r;
    }
    return total;   // < n * r / (r - 1)    @done
}`,
    java: `
static long geometric(long n, long r) {
    long total = 0, x = n;               // @init
    while (x >= 1) {
        total += x;                      // @term
        x /= r;
    }
    return total;   // < n * r / (r - 1)    @done
}`,
    python: `
def geometric(n, r):
    total, x = 0, n                  # @init
    while x >= 1:
        total += x                   # @term
        x //= r
    return total    # < n*r/(r-1)       @done`,
    js: `
function geometric(n, r) {
  let total = 0, x = n;                  // @init
  while (x >= 1) {
    total += x;                          // @term
    x = Math.floor(x / r);
  }
  return total;   // < n * r / (r - 1)    @done
}`,
    c: `
long long geometric(long long n, long long r) {
    long long total = 0, x = n;          // @init
    while (x >= 1) {
        total += x;                      // @term
        x /= r;
    }
    return total;   /* < n*r/(r-1) */   // @done
}`,
  },
  run: ({ n, r }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      const R = Math.floor(r as number)
      if (N < 1 || R < 2) throw new Error('Use n ≥ 1 and r ≥ 2.')
      const bars = t.array('terms', [], { label: 'the terms n, n/r, n/r², …', bars: true })
      const bound = (N * R) / (R - 1)
      const m = t.meter('sum', 'Running total', [
        { label: 'n', value: N },
        { label: `n·${R}/${R - 1}`, value: Math.round(bound * 100) / 100 },
      ])
      let total = 0
      let x = N
      t.step('init', `Start with x = n = ${N}. Each term is the previous one divided by ${R}.`, { x, total })
      let k = 0
      while (x >= 1) {
        total += x
        bars.push(x)
        bars.clear()
        for (let i = 0; i < bars.length - 1; i++) bars.role(i, 'done')
        bars.role(bars.length - 1, 'active')
        m.add(x)
        const left = bound - total
        t.step(
          'term',
          k === 0
            ? `First term: ${x}. Already ${Math.round((100 * x) / bound)}% of the bound n·r/(r−1) = ${Math.round(bound * 100) / 100}.`
            : `Add n/${R}${k > 1 ? sup(k) : ''} = ${x}. Total ${total}; the gap to the bound shrinks to ${Math.round(left * 100) / 100} — each term is ${R}× smaller than the last.`,
          { x, total },
        )
        x = Math.floor(x / R)
        k++
      }
      m.role = 'done'
      bars.clear()
      t.step(
        'done',
        `${k} terms, total ${total} < ${Math.round(bound * 100) / 100}. A decreasing geometric series is Θ(first term): n(1 + 1/r + 1/r² + …) = n · r/(r − 1). That is why halving recursions like T(n) = T(n/2) + n cost Θ(n), not Θ(n log n).`,
        { total },
      )
    }),
}

/* ───────────────────────── 3. log log n: repeated squaring ───────────────────────── */

export const cxLogLog: Algorithm = {
  id: 'cx-loglog',
  title: 'Squaring loops — O(log log n)',
  blurb: 'i = 2, 4, 16, 256, 65536, …: the exponent doubles each step, so the number of steps is log₂ log₂ n.',
  legend: { new: 'value now', dim: 'earlier values', compare: 'i < n ?', found: 'i ≥ n: stop' },
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '1000000000', min: 3, max: 1e18 }],
  random: () => ({ n: String(10 ** rint(2, 18)) }),
  code: {
    pseudo: `
steps ← 0; i ← 2                 // @init
while i < n                      // @test
  i ← i · i                      // @square
  steps ← steps + 1
return steps   // = ⌈log₂ log₂ n⌉  @done`,
    cpp: `
int squarings(unsigned long long n) {
    int steps = 0; unsigned long long i = 2;            // @init
    while (i < n) {                                     // @test
        if (i > 4294967295ULL) { steps++; break; }      // i*i would overflow, and is ≥ n
        i = i * i; steps++;                             // @square
    }
    return steps;                                       // @done
}`,
    java: `
static int squarings(long n) {
    int steps = 0; long i = 2;                          // @init
    while (i < n) {                                     // @test
        if (i > 3037000499L) { steps++; break; }        // i*i would overflow, and is ≥ n
        i = i * i; steps++;                             // @square
    }
    return steps;                                       // @done
}`,
    python: `
def squarings(n):
    steps, i = 0, 2          # @init
    while i < n:             # @test
        i = i * i            # @square
        steps += 1
    return steps             # @done`,
    js: `
function squarings(n) {           // n: BigInt
  let steps = 0, i = 2n;          // @init
  while (i < n) {                 // @test
    i = i * i; steps++;           // @square
  }
  return steps;                   // @done
}`,
    c: `
int squarings(unsigned long long n) {
    int steps = 0; unsigned long long i = 2;            // @init
    while (i < n) {                                     // @test
        if (i > 4294967295ULL) { steps++; break; }
        i = i * i; steps++;                             // @square
    }
    return steps;                                       // @done
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = n as number
      if (!(N >= 3)) throw new Error('Use n ≥ 3.')
      const ll = Math.log2(Math.log2(N))
      const seq = t.array('seq', [], { label: 'values of i' })
      const m = t.meter('steps', 'Squarings', [
        { label: 'log₂ log₂ n', value: Math.round(ll * 100) / 100 },
        { label: 'log₂ n', value: Math.round(Math.log2(N) * 100) / 100 },
      ])
      let e = 1 // i = 2^e
      seq.push('2')
      seq.role(0, 'new')
      t.step('init', `i = 2 = 2^1. We stop once i ≥ n = ${N}. Write i as 2^e and watch e.`, { e, steps: 0 })
      let steps = 0
      for (;;) {
        const lgI = e
        const less = lgI < Math.log2(N)
        seq.clear()
        for (let k = 0; k < seq.length - 1; k++) seq.role(k, 'dim')
        seq.role(seq.length - 1, less ? 'compare' : 'found')
        t.step('test', less ? `i = 2^${e} < n: keep squaring.` : `i = 2^${e} ≥ n = ${N}: stop.`, { e, steps })
        if (!less) break
        e *= 2
        steps++
        m.add(1)
        seq.push(e <= 8 ? String(2 ** e) : `2${sup(e)}`)
        seq.clear()
        for (let k = 0; k < seq.length - 1; k++) seq.role(k, 'dim')
        seq.role(seq.length - 1, 'new')
        t.step('square', `Square i: 2^${e / 2} · 2^${e / 2} = 2^${e}. The exponent doubled — so the exponent reaches log₂ n after log₂ log₂ n doublings.`, { e, steps })
      }
      m.role = 'done'
      t.step('done', `${steps} squarings for n = ${N} (log₂ log₂ n ≈ ${ll.toFixed(2)}). Even n = 10¹⁸ needs only 6. Loops of this shape — and van Emde Boas trees, and Newton iterations — are O(log log n).`, { steps })
    }),
}

/* ───────────────────────── 4. Σ ⌊n/i⌋ in O(√n) blocks ───────────────────────── */

export const cxFloorBlocks: Algorithm = {
  id: 'cx-floor-blocks',
  title: 'Σ ⌊n / i⌋ in O(√n): group equal quotients',
  blurb: 'The quotient ⌊n / i⌋ takes at most 2√n different values, and equal ones sit in one contiguous block.',
  legend: { active: 'i', window: 'current block (same quotient)', done: 'summed', best: 'summed (next block)' },
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '30', min: 1, max: 60 }],
  random: () => ({ n: String(rint(12, 60)) }),
  code: {
    pseudo: `
function floorSum(n)
  total ← 0; i ← 1                       // @init
  while i ≤ n
    q ← ⌊n / i⌋                          // @block
    last ← ⌊n / q⌋     // largest j with ⌊n/j⌋ = q
    total ← total + q · (last − i + 1)   // @add
    i ← last + 1
  return total                           // @done`,
    cpp: `
long long floorSum(long long n) {
    long long total = 0;                         // @init
    for (long long i = 1; i <= n; ) {
        long long q = n / i, last = n / q;       // @block
        total += q * (last - i + 1);             // @add
        i = last + 1;
    }
    return total;                                // @done
}`,
    java: `
static long floorSum(long n) {
    long total = 0;                              // @init
    for (long i = 1; i <= n; ) {
        long q = n / i, last = n / q;            // @block
        total += q * (last - i + 1);             // @add
        i = last + 1;
    }
    return total;                                // @done
}`,
    python: `
def floor_sum(n):
    total, i = 0, 1                  # @init
    while i <= n:
        q = n // i
        last = n // q                # @block
        total += q * (last - i + 1)  # @add
        i = last + 1
    return total                     # @done`,
    js: `
function floorSum(n) {
  let total = 0;                               // @init
  for (let i = 1; i <= n; ) {
    const q = Math.floor(n / i), last = Math.floor(n / q);   // @block
    total += q * (last - i + 1);               // @add
    i = last + 1;
  }
  return total;                                // @done
}`,
    c: `
long long floor_sum(long long n) {
    long long total = 0;                         // @init
    for (long long i = 1; i <= n; ) {
        long long q = n / i, last = n / q;       // @block
        total += q * (last - i + 1);             // @add
        i = last + 1;
    }
    return total;                                // @done
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      if (N < 1) throw new Error('Use n ≥ 1.')
      // lay i = 1…N out in rows of 10 so even n = 60 fits on screen
      const W = Math.min(10, N)
      const R = Math.ceil(N / W)
      const rows = Array.from({ length: R }, (_, r) => Array.from({ length: W }, (_, c) => (r * W + c < N ? Math.floor(N / (r * W + c + 1)) : null)))
      const g = t.grid('q', rows, {
        label: `⌊${N} / i⌋ for every i (row label + column = i)`,
        rowLabels: Array.from({ length: R }, (_, r) => `i=${r * W + 1}…`),
        colLabels: Array.from({ length: W }, (_, c) => `+${c}`),
      })
      const cell = (i: number): [number, number] => [Math.floor((i - 1) / W), (i - 1) % W]
      const m = t.meter('blocks', 'Loop iterations (blocks)', [
        { label: '2√n', value: Math.round(2 * Math.sqrt(N) * 10) / 10 },
        { label: 'n', value: N },
      ])
      const doneRole: Record<number, 'done' | 'best'> = {}
      const paint = () => {
        g.clear()
        for (const [i, r] of Object.entries(doneRole)) g.role(...cell(Number(i)), r)
      }
      let total = 0
      t.step('init', `Summing ⌊${N}/i⌋ one i at a time costs n = ${N} iterations. But read the table: the same quotient repeats in long runs. We add a whole run at once.`, { total })
      let i = 1
      let b = 0
      while (i <= N) {
        const q = Math.floor(N / i)
        const last = Math.floor(N / q)
        paint()
        for (let j = i; j <= last; j++) g.role(...cell(j), 'window')
        g.role(...cell(i), 'active')
        m.add(1)
        t.step('block', `i = ${i}: q = ⌊${N}/${i}⌋ = ${q}. The last j with the same quotient is ⌊${N}/${q}⌋ = ${last}, so i = ${i}…${last} all give ${q}.`, { i, q, last, total })
        total += q * (last - i + 1)
        for (let j = i; j <= last; j++) doneRole[j] = b % 2 ? 'best' : 'done'
        paint()
        t.step('add', `Add ${q} × ${last - i + 1} = ${q * (last - i + 1)} in one step. Total ${total}. Jump to i = ${last + 1}.`, { i, q, last, total })
        i = last + 1
        b++
      }
      paint()
      m.role = 'done'
      t.step('done', `${b} blocks instead of ${N} terms. Why at most 2√n: for i ≤ √n there are at most √n values of i; for i > √n the quotient n/i is below √n, so at most √n distinct quotients remain. For n = 10¹² that is 2·10⁶ steps instead of 10¹².`, { total, blocks: b })
    }),
}

/* ───────────────────────── 5. Count pairs with sum ≤ k: two pointers ───────────────────────── */

export const cxPairsTwoPointer: Algorithm = {
  id: 'cx-pairs-two-pointer',
  title: 'Count pairs with sum ≤ k — n²/2 checks become n',
  blurb: 'Sort once. If a[lo] + a[hi] ≤ k then lo pairs with every index lo+1…hi at once.',
  legend: { found: 'pairs counted at once', compare: 'a[lo] + a[hi]', dim: 'finished', removed: 'too big — drop hi' },
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '7 2 9 4 1 6 3 8', maxLen: 12 },
    { name: 'k', label: 'k', type: 'number', default: '10' },
  ],
  random: () => ({ arr: list(rarr(rint(6, 10), 1, 15)), k: String(rint(8, 20)) }),
  code: {
    pseudo: `
function countPairs(a, k)
  sort(a)                                    // @sort
  lo ← 0; hi ← n − 1; count ← 0
  while lo < hi
    if a[lo] + a[hi] ≤ k                     // @check
      count ← count + (hi − lo)  // every j in lo+1..hi works   @count
      lo ← lo + 1
    else hi ← hi − 1           // a[hi] is too big for anyone   @shrink
  return count                               // @done`,
    cpp: `
long long countPairs(vector<long long> a, long long k) {
    sort(a.begin(), a.end());                    // @sort
    long long count = 0;
    int lo = 0, hi = (int)a.size() - 1;
    while (lo < hi) {
        if (a[lo] + a[hi] <= k) {                // @check
            count += hi - lo; lo++;              // @count
        } else hi--;                             // @shrink
    }
    return count;                                // @done
}`,
    java: `
static long countPairs(long[] a, long k) {
    Arrays.sort(a);                              // @sort
    long count = 0;
    int lo = 0, hi = a.length - 1;
    while (lo < hi) {
        if (a[lo] + a[hi] <= k) {                // @check
            count += hi - lo; lo++;              // @count
        } else hi--;                             // @shrink
    }
    return count;                                // @done
}`,
    python: `
def count_pairs(a, k):
    a = sorted(a)                    # @sort
    lo, hi, count = 0, len(a) - 1, 0
    while lo < hi:
        if a[lo] + a[hi] <= k:       # @check
            count += hi - lo         # @count
            lo += 1
        else:
            hi -= 1                  # @shrink
    return count                     # @done`,
    js: `
function countPairs(a, k) {
  a = [...a].sort((x, y) => x - y);              // @sort
  let lo = 0, hi = a.length - 1, count = 0;
  while (lo < hi) {
    if (a[lo] + a[hi] <= k) {                    // @check
      count += hi - lo; lo++;                    // @count
    } else hi--;                                 // @shrink
  }
  return count;                                  // @done
}`,
    c: `
long long count_pairs(long long *a, int n, long long k) {
    qsort(a, n, sizeof *a, cmp_ll);              // @sort
    long long count = 0;
    int lo = 0, hi = n - 1;
    while (lo < hi) {
        if (a[lo] + a[hi] <= k) {                // @check
            count += hi - lo; lo++;              // @count
        } else hi--;                             // @shrink
    }
    return count;                                // @done
}`,
  },
  run: ({ arr, k }) =>
    trace((t) => {
      const v = [...(arr as number[])]
      const K = k as number
      const n = v.length
      if (n < 2) throw new Error('Give at least two numbers.')
      const A = t.array('a', v, { label: 'a' })
      const m = t.meter('cmp', 'Sums checked', [
        { label: 'n', value: n },
        { label: 'n(n−1)/2 (brute force)', value: (n * (n - 1)) / 2 },
      ])
      t.step('sort', `Brute force checks all ${(n * (n - 1)) / 2} pairs. Instead, sort first (O(n log n)) so sums move predictably with the pointers.`, { k: K })
      // sort with identities preserved so values glide into place
      const order = A.cells.map((c, i) => ({ c, i })).sort((x, y) => (x.c.v as number) - (y.c.v as number))
      A.cells = order.map((o) => o.c)
      const a = A.values() as number[]
      let lo = 0
      let hi = n - 1
      let count = 0
      A.ptr('lo', lo).ptr('hi', hi)
      t.step('sort', `Sorted: ${a.join(' ')}. lo starts at the smallest, hi at the largest.`, { k: K, count })
      const dim = new Set<number>()
      const paint = () => {
        A.clear()
        for (const d of dim) A.role(d, 'dim')
      }
      while (lo < hi) {
        paint()
        A.role(lo, 'compare').role(hi, 'compare')
        m.add(1)
        const s = a[lo] + a[hi]
        t.step('check', `a[lo] + a[hi] = ${a[lo]} + ${a[hi]} = ${s} ${s <= K ? '≤' : '>'} ${K}.`, { lo, hi, sum: s, k: K, count })
        if (s <= K) {
          count += hi - lo
          paint()
          A.role(lo, 'active')
          A.range([{ from: lo + 1, to: hi, role: 'found', label: `+${hi - lo}` }])
          t.step('count', `Every j in ${lo + 1}…${hi} has a[j] ≤ a[hi], so a[${lo}] + a[j] ≤ ${K} too: ${hi - lo} pairs counted in one step. Total ${count}. a[${lo}] is finished.`, { lo, hi, k: K, count })
          A.range([])
          dim.add(lo)
          lo++
        } else {
          paint()
          A.role(hi, 'removed')
          t.step('shrink', `${a[hi]} is too big even with the smallest remaining value ${a[lo]} — it pairs with nobody left. Drop it: hi−−.`, { lo, hi, k: K, count })
          dim.add(hi)
          hi--
        }
        A.ptr('lo', lo).ptr('hi', hi)
      }
      paint()
      m.role = 'done'
      t.step('done', `${count} pairs with sum ≤ ${K}, using ${m.value} sum checks instead of ${(n * (n - 1)) / 2}. Each check moves lo or hi one step closer, so at most n − 1 checks: O(n) after the O(n log n) sort.`, { count })
    }),
}

/* ───────────────────────── 6. Repeated range sums vs prefix sums ───────────────────────── */

export const cxPrefixQueries: Algorithm = {
  id: 'cx-prefix-queries',
  title: 'q range-sum queries: O(n·q) loops vs O(n + q) with prefix sums',
  blurb: 'Pay n once to build P, then every query is one subtraction.',
  legend: { window: 'range being summed', write: 'prefix written', compare: 'P[r+1] and P[l]' },
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '3 1 4 1 5 9 2 6', maxLen: 10 },
    { name: 'qs', label: 'Queries l r (pairs)', type: 'array', default: '0 7 2 5 1 6 3 3', maxLen: 10 },
  ],
  random: () => {
    const n = rint(6, 9)
    const q: number[] = []
    for (let k = 0; k < 4; k++) {
      const l = rint(0, n - 1)
      q.push(l, rint(l, n - 1))
    }
    return { arr: list(rarr(n, 1, 9)), qs: list(q) }
  },
  code: {
    pseudo: `
// naive: each query walks its range
for (l, r) in queries
  s ← 0; for i ← l to r: s ← s + a[i]       // @naive
// prefix sums: P[i] = a[0] + … + a[i−1]
P[0] ← 0
for i ← 0 to n − 1: P[i+1] ← P[i] + a[i]    // @build
for (l, r) in queries
  answer ← P[r+1] − P[l]                    // @query
// O(n·q) became O(n + q)                     @done`,
    cpp: `
vector<long long> P(n + 1, 0);
for (int i = 0; i < n; i++) P[i + 1] = P[i] + a[i];    // @build
for (auto [l, r] : queries) {
    // naive would be: for (int i = l; i <= r; i++) s += a[i];   @naive
    cout << P[r + 1] - P[l] << '\\n';                   // @query
}
// O(n + q)                                               @done`,
    java: `
long[] P = new long[n + 1];
for (int i = 0; i < n; i++) P[i + 1] = P[i] + a[i];    // @build
for (int[] q : queries) {
    // naive: for (int i = q[0]; i <= q[1]; i++) s += a[i];   @naive
    out.append(P[q[1] + 1] - P[q[0]]).append('\\n');    // @query
}
// O(n + q)                                               @done`,
    python: `
P = [0] * (n + 1)
for i in range(n):
    P[i + 1] = P[i] + a[i]         # @build
for l, r in queries:
    # naive: sum(a[l:r+1])  -> O(r-l+1) each   @naive
    print(P[r + 1] - P[l])         # @query
# O(n + q)                          @done`,
    js: `
const P = new Array(n + 1).fill(0);
for (let i = 0; i < n; i++) P[i + 1] = P[i] + a[i];    // @build
for (const [l, r] of queries) {
  // naive: for (let i = l; i <= r; i++) s += a[i];   @naive
  out.push(P[r + 1] - P[l]);                          // @query
}
// O(n + q)                                             @done`,
    c: `
long long *P = calloc(n + 1, sizeof *P);
for (int i = 0; i < n; i++) P[i + 1] = P[i] + a[i];    // @build
for (int k = 0; k < q; k++) {
    /* naive: for (i = L[k]; i <= R[k]; i++) s += a[i]; */   // @naive
    printf("%lld\\n", P[R[k] + 1] - P[L[k]]);           // @query
}
/* O(n + q) */                                           // @done`,
  },
  run: ({ arr, qs }) =>
    trace((t) => {
      const a = arr as number[]
      const n = a.length
      const raw = qs as number[]
      if (!n) throw new Error('The array is empty.')
      if (raw.length < 2 || raw.length % 2) throw new Error('Queries are pairs: l r l r …')
      const Q: [number, number][] = []
      for (let k = 0; k < raw.length; k += 2) {
        const l = raw[k]
        const r = raw[k + 1]
        if (!(l >= 0 && r < n && l <= r)) throw new Error(`Query (${l}, ${r}) must satisfy 0 ≤ l ≤ r < ${n}.`)
        Q.push([l, r])
      }
      const A = t.array('a', a, { label: 'a' })
      const P = t.array('P', [0], { label: 'P (prefix sums)', capacity: n + 1 })
      const naive = t.meter('naive', 'Naive: elements read', [{ label: 'n·q', value: n * Q.length }])
      const fast = t.meter('fast', 'Prefix: operations', [{ label: 'n + q', value: n + Q.length }])
      t.step('naive', `${Q.length} queries on ${n} numbers. First the naive way: walk each range.`, {})
      for (const [l, r] of Q) {
        let s = 0
        for (let i = l; i <= r; i++) s += a[i]
        naive.add(r - l + 1)
        A.clear().range([{ from: l, to: r, role: 'window', label: `sum = ${s}` }])
        t.step('naive', `sum(${l}..${r}) = ${s}: ${r - l + 1} reads. A query over the whole array reads all n — q such queries cost n·q.`, { l, r, sum: s })
      }
      A.range([])
      for (let i = 0; i < n; i++) {
        P.push((P.get(i) as number) + a[i])
        fast.add(1)
        A.clear().role(i, 'active')
        P.clear().role(i, 'compare').role(i + 1, 'write')
        P.arrows = [{ from: i, to: i + 1, label: `+${a[i]}` }]
        t.step('build', `P[${i + 1}] = P[${i}] + a[${i}] = ${P.get(i)} + ${a[i]} = ${P.get(i + 1)}. Built once, in one pass.`, { i })
      }
      A.clear()
      P.clear()
      for (const [l, r] of Q) {
        const s = (P.get(r + 1) as number) - (P.get(l) as number)
        fast.add(1)
        A.clear().range([{ from: l, to: r, role: 'window' }])
        P.clear().role(r + 1, 'compare').role(l, 'compare')
        P.arrows = [{ from: l, to: r + 1, label: `${P.get(r + 1)} − ${P.get(l)}` }]
        t.step('query', `sum(${l}..${r}) = P[${r + 1}] − P[${l}] = ${s}: one subtraction, whatever the range length.`, { l, r, sum: s })
      }
      A.clear().range([])
      P.clear()
      naive.role = 'removed'
      fast.role = 'done'
      t.step('done', `Naive read ${naive.value} elements; prefix sums did ${fast.value} operations. With n = q = 2·10⁵ that is 4·10¹⁰ against 4·10⁵ — the difference between minutes and a millisecond.`, {})
    }),
}

export const algorithms1: Algorithm[] = [cxRatio, cxGeometric, cxLogLog, cxFloorBlocks, cxPairsTwoPointer, cxPrefixQueries]
