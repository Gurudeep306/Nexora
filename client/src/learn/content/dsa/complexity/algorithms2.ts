import { trace } from '../../../engine/tracer'
import type { Algorithm, Scalar } from '../../../engine/types'
import { list, rarr, rint, sorted } from '../../../algorithms/util'
import { sup } from './algorithms1'

/* Complexity topic — animations, part 2: recurrences (recursion trees, substitution, Master theorem) and divide-and-conquer algorithms. */

const r2 = (x: number) => Math.round(x * 100) / 100

/* ───────────────────────── 1. The recursion tree of T(n) = a T(n/b) + n^k ───────────────────────── */

export const cxRecTree: Algorithm = {
  id: 'cx-rec-tree',
  title: 'Recursion tree, level by level — T(n) = a·T(n/b) + nᵏ',
  blurb: 'Every node costs f(size). Sum each level, then sum the levels: the ratio between levels decides who dominates.',
  legend: { active: 'level being expanded', done: 'level summed', found: 'dominant level', pivot: 'leaves (size 1)' },
  inputs: [
    { name: 'a', label: 'a (calls)', type: 'number', default: '2', min: 1, max: 8 },
    { name: 'b', label: 'b (shrink)', type: 'number', default: '2', min: 2, max: 4 },
    { name: 'k', label: 'k in f(n)=nᵏ', type: 'number', default: '1', min: 0, max: 3 },
    { name: 'n', label: 'n (a power of b)', type: 'number', default: '16', min: 1, max: 4096 },
  ],
  random: () => {
    const opts = [
      ['2', '2', '1', '16'],
      ['1', '2', '0', '64'],
      ['3', '2', '1', '8'],
      ['4', '2', '1', '8'],
      ['2', '2', '2', '16'],
      ['7', '2', '2', '8'],
      ['2', '2', '0', '16'],
      ['3', '3', '1', '27'],
    ]
    const [a, b, k, n] = opts[rint(0, opts.length - 1)]
    return { a, b, k, n }
  },
  code: {
    pseudo: `
// T(n) = a·T(n/b) + nᵏ,  T(1) = 1 — sum the tree one level at a time
nodes ← 1; size ← n; total ← 0
loop
  levelCost ← nodes · sizeᵏ              // @level
  total ← total + levelCost              // @sum
  if size = 1: break     // the leaves   @leaves
  nodes ← nodes · a; size ← size / b
return total                              // @total`,
    cpp: `
long long treeTotal(long long n, int a, int b, int k) {
    long long nodes = 1, size = n, total = 0;
    while (true) {
        long long each = 1;
        for (int e = 0; e < k; e++) each *= size;
        long long levelCost = nodes * each;           // @level
        total += levelCost;                           // @sum
        if (size == 1) break;                         // @leaves
        nodes *= a; size /= b;
    }
    return total;                                     // @total
}`,
    java: `
static long treeTotal(long n, int a, int b, int k) {
    long nodes = 1, size = n, total = 0;
    while (true) {
        long each = 1;
        for (int e = 0; e < k; e++) each *= size;
        long levelCost = nodes * each;                // @level
        total += levelCost;                           // @sum
        if (size == 1) break;                         // @leaves
        nodes *= a; size /= b;
    }
    return total;                                     // @total
}`,
    python: `
def tree_total(n, a, b, k):
    nodes, size, total = 1, n, 0
    while True:
        level_cost = nodes * size ** k     # @level
        total += level_cost                # @sum
        if size == 1:                      # @leaves
            break
        nodes *= a
        size //= b
    return total                           # @total`,
    js: `
function treeTotal(n, a, b, k) {
  let nodes = 1, size = n, total = 0;
  while (true) {
    const levelCost = nodes * size ** k;              // @level
    total += levelCost;                               // @sum
    if (size === 1) break;                            // @leaves
    nodes *= a; size = Math.floor(size / b);
  }
  return total;                                       // @total
}`,
    c: `
long long tree_total(long long n, int a, int b, int k) {
    long long nodes = 1, size = n, total = 0;
    for (;;) {
        long long each = 1;
        for (int e = 0; e < k; e++) each *= size;
        long long level_cost = nodes * each;          // @level
        total += level_cost;                          // @sum
        if (size == 1) break;                         // @leaves
        nodes *= a; size /= b;
    }
    return total;                                     // @total
}`,
  },
  run: ({ a, b, k, n }) =>
    trace((t) => {
      const A = Math.floor(a as number)
      const B = Math.floor(b as number)
      const K = Math.floor(k as number)
      const N = Math.floor(n as number)
      if (A < 1 || B < 2 || K < 0) throw new Error('Need a ≥ 1, b ≥ 2, k ≥ 0.')
      let D = 0
      for (let s = N; s > 1; s /= B) {
        if (s % B) throw new Error(`n must be a power of b (try ${B ** Math.max(1, Math.round(Math.log(N) / Math.log(B)))}).`)
        D++
      }
      const crit = Math.log(A) / Math.log(B) // log_b a
      const ratio = A / B ** K // level i+1 cost / level i cost
      const T = t.tree('rt', { label: `recursion tree (each node shows its size; its cost is size${K === 1 ? '' : sup(K)})` })
      const grid = t.grid('lv', [], { label: 'cost per level', colLabels: ['i', 'nodes', 'size', 'each', 'total'] , rowLabels: [] })
      grid.opts.label = `level i has ${A}ⁱ nodes of size n/${B}ⁱ, each costing size${sup(K)}`
      const critLabel = `n^log_b a = n${crit % 1 === 0 ? sup(crit) : `^${r2(crit)}`}`
      const m = t.meter(
        'tot',
        'T(n) so far',
        Math.abs(N ** K - N ** crit) < 1e-9
          ? [{ label: `f(n) = ${critLabel}`, value: N ** K }]
          : [
              { label: `f(n) = n${sup(K)}`, value: N ** K },
              { label: critLabel, value: r2(N ** crit) },
            ],
      )
      // draw while the tree stays readable
      const CAP = 40
      let drawn = 0
      let levelIds: string[] = []
      const root = T.node(N)
      T.setRoot(root)
      levelIds = [root]
      drawn = 1
      let drawing = true
      let total = 0
      const totals: number[] = []
      t.step('level', `T(${N}) = ${A}·T(${N}/${B}) + ${N}${sup(K)}. The root is one problem of size ${N}; it does ${N ** K} work itself and makes ${A} recursive call${A > 1 ? 's' : ''}.`, { n: N, a: A, b: B, k: K })
      for (let i = 0; i <= D; i++) {
        const size = N / B ** i
        const nodes = A ** i
        const each = size ** K
        const lvl = nodes * each
        totals.push(lvl)
        total += lvl
        m.add(lvl)
        T.keep('done', 'pivot')
        if (drawing) for (const id of levelIds) T.role(id, i === D ? 'pivot' : 'active')
        grid.clear()
        grid.rows.push([i, nodes, size, each, lvl])
        const r = grid.rows.length - 1
        for (let c = 0; c < 5; c++) grid.role(r, c, 'active')
        if (r > 0) grid.arrow([r - 1, 4], [r, 4], `×${r2(ratio)}`, 'compare')
        const why = i === 0 ? '' : ratio > 1 ? ` Each level costs ${r2(ratio)}× the one above — growing.` : ratio < 1 ? ` Each level costs ${r2(ratio)}× the one above — shrinking.` : ' Same as the level above.'
        t.step(
          i === D ? 'leaves' : 'level',
          i === D
            ? `Level ${i}: the ${nodes} leaves (size 1) cost 1 each = ${lvl}. There are a^log_b n = n^log_b a leaves.${drawing ? '' : ' (Too many to draw.)'}`
            : `Level ${i}: ${nodes} node${nodes > 1 ? 's' : ''} of size ${size}, each costing ${size}${sup(K)} = ${each}: level total ${lvl}.${why}`,
          { level: i, nodes, size, 'level total': lvl, total },
        )
        T.keep('done', 'pivot')
        if (drawing) for (const id of levelIds) T.role(id, i === D ? 'pivot' : 'done')
        grid.clear()
        for (let c = 0; c < 5; c++) grid.role(r, c, 'done')
        t.step('sum', `Running total ${total}.`, { level: i, total })
        if (i < D && drawing) {
          if (drawn + levelIds.length * A > CAP) drawing = false
          else {
            const next: string[] = []
            for (const p of levelIds)
              for (let c = 0; c < A; c++) {
                const id = T.node(size / B)
                T.addChild(p, id)
                next.push(id)
              }
            drawn += next.length
            levelIds = next
          }
        }
      }
      // verdict
      grid.clear()
      const maxL = Math.max(...totals)
      let verdict: string
      if (Math.abs(ratio - 1) < 1e-9) {
        totals.forEach((_, i) => grid.role(i, 4, 'found'))
        verdict = `Every level costs the same (${totals[0]}), and there are log_${B} n + 1 = ${D + 1} levels: T(n) = Θ(n${sup(K)} log n). Master theorem case 2.`
      } else if (ratio > 1) {
        grid.role(D, 4, 'found')
        verdict = `Level costs grow geometrically (×${r2(ratio)}), so the leaves dominate: T(n) = Θ(n^log_${B} ${A}) = Θ(n${crit % 1 === 0 ? sup(crit) : `^${r2(crit)}`}). Master theorem case 1.`
      } else {
        grid.role(0, 4, 'found')
        verdict = `Level costs shrink geometrically (×${r2(ratio)}), so the root dominates: T(n) = Θ(f(n)) = Θ(n${sup(K)}). Master theorem case 3.`
      }
      m.role = 'done'
      t.step('total', `T(${N}) = ${total}. ${verdict} (Largest level: ${maxL}.)`, { total })
    }),
}

/* ───────────────────────── 2. Unequal splits: T(n) = T(n/q) + T(n − n/q) + n ───────────────────────── */

export const cxUnequalTree: Algorithm = {
  id: 'cx-unequal-tree',
  title: 'Unequal splits — T(n) = T(n/3) + T(2n/3) + n',
  blurb: 'Full levels each cost exactly n; the tree is between log₃ n and log₃/₂ n deep, so T(n) = Θ(n log n).',
  legend: { active: 'this level', done: 'summed', pivot: 'leaf (too small to split)' },
  inputs: [
    { name: 'n', label: 'n', type: 'number', default: '27', min: 3, max: 40 },
    { name: 'q', label: 'split 1/q', type: 'number', default: '3', min: 2, max: 6 },
  ],
  random: () => ({ n: String(rint(12, 36)), q: String(rint(3, 5)) }),
  code: {
    pseudo: `
function T(n)
  if n ≤ 2 or n < q: return n             // @leaf
  left ← ⌊n / q⌋; right ← n − left        // @level
  return T(left) + T(right) + n           // @sum
// total over all levels                  // @total`,
    cpp: `
long long T(long long n, int q) {
    if (n <= 2 || n < q) return n;               // @leaf
    long long left = n / q, right = n - left;    // @level
    return T(left, q) + T(right, q) + n;         // @sum
}                                                // @total`,
    java: `
static long T(long n, int q) {
    if (n <= 2 || n < q) return n;               // @leaf
    long left = n / q, right = n - left;         // @level
    return T(left, q) + T(right, q) + n;         // @sum
}                                                // @total`,
    python: `
def T(n, q):
    if n <= 2 or n < q:                 # @leaf
        return n
    left = n // q; right = n - left     # @level
    return T(left, q) + T(right, q) + n # @sum
                                        # @total`,
    js: `
function T(n, q) {
  if (n <= 2 || n < q) return n;                 // @leaf
  const left = Math.floor(n / q), right = n - left;   // @level
  return T(left, q) + T(right, q) + n;           // @sum
}                                                // @total`,
    c: `
long long T(long long n, int q) {
    if (n <= 2 || n < q) return n;               // @leaf
    long long left = n / q, right = n - left;    // @level
    return T(left, q) + T(right, q) + n;         // @sum
}                                                // @total`,
  },
  run: ({ n, q }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      const Q = Math.floor(q as number)
      if (N < 3 || Q < 2) throw new Error('Need n ≥ 3 and q ≥ 2.')
      const T = t.tree('rt', { label: `T(n) = T(⌊n/${Q}⌋) + T(n − ⌊n/${Q}⌋) + n` })
      const grid = t.grid('lv', [], { label: 'cost per level', colLabels: ['level', 'nodes', 'total', 'vs n'] })
      const L32 = Math.log(N) / Math.log(Q / (Q - 1))
      const m = t.meter('tot', 'T(n) so far', [
        { label: `n·log_${Q} n`, value: r2(N * (Math.log(N) / Math.log(Q))) },
        { label: `n·log_${Q}/${Q - 1} n`, value: r2(N * L32) },
      ])
      type Nd = { id: string; size: number }
      let level: Nd[] = [{ id: T.node(N), size: N }]
      T.setRoot(level[0].id)
      let depth = 0
      let total = 0
      while (level.length) {
        const lvl = level.reduce((s, x) => s + x.size, 0)
        total += lvl
        m.add(lvl)
        T.keep('done', 'pivot')
        for (const x of level) T.role(x.id, x.size <= 2 || x.size < Q ? 'pivot' : 'active')
        grid.clear()
        grid.rows.push([depth, level.length, lvl, lvl === N ? '= n' : `< n`])
        const r = grid.rows.length - 1
        for (let c = 0; c < 4; c++) grid.role(r, c, 'active')
        const full = lvl === N
        t.step(
          'level',
          full
            ? `Level ${depth}: ${level.length} node${level.length > 1 ? 's' : ''} whose sizes add up to exactly n = ${N} — splitting never loses or creates elements, so a full level costs n.`
            : `Level ${depth}: some branches have already bottomed out, so this level costs only ${lvl} < n.`,
          { level: depth, 'level total': lvl, total },
        )
        for (const x of level) T.role(x.id, x.size <= 2 || x.size < Q ? 'pivot' : 'done')
        grid.clear()
        for (let c = 0; c < 4; c++) grid.role(r, c, 'done')
        const next: Nd[] = []
        for (const x of level) {
          if (x.size <= 2 || x.size < Q) continue
          const left = Math.floor(x.size / Q)
          const right = x.size - left
          for (const s of [left, right]) {
            const id = T.node(s)
            T.addChild(x.id, id)
            next.push({ id, size: s })
          }
        }
        if (!next.length) break
        t.step('sum', `Total so far ${total}. Split every non-leaf: the 1/${Q} side shrinks fast, the ${Q - 1}/${Q} side slowly.`, { level: depth, total })
        level = next
        depth++
      }
      T.keep('done', 'pivot')
      for (const x of level) T.role(x.id, 'pivot')
      t.step('leaf', `Every remaining branch is a leaf (too small to split). The shortest root-to-leaf path follows the 1/${Q} side (about log_${Q} n levels), the longest follows the ${Q - 1}/${Q} side (about log_${Q}/${Q - 1} n = ${r2(L32)} levels).`, { total })
      m.role = 'done'
      t.step('total', `T(${N}) = ${total}. Each level costs ≤ n and there are ≤ log_${Q}/${Q - 1} n + 1 levels, so T(n) = O(n log n); the first log_${Q} n levels are full, each exactly n, so T(n) = Ω(n log n). Together: Θ(n log n) — the Master theorem cannot say this, the tree can.`, { total })
    }),
}

/* ───────────────────────── 3. Substitution method: check a guess by induction ───────────────────────── */

const RECS: Record<string, { label: string; dep: (n: number) => number[]; f: (n: number, T: number[]) => number }> = {
  '2T(n/2)+n': { label: 'T(n) = 2T(⌊n/2⌋) + n', dep: (n) => [Math.floor(n / 2)], f: (n, T) => 2 * T[Math.floor(n / 2)] + n },
  'T(n/2)+1': { label: 'T(n) = T(⌊n/2⌋) + 1', dep: (n) => [Math.floor(n / 2)], f: (n, T) => T[Math.floor(n / 2)] + 1 },
  'T(n-1)+n': { label: 'T(n) = T(n − 1) + n', dep: (n) => [n - 1], f: (n, T) => T[n - 1] + n },
  '2T(n/2)+1': { label: 'T(n) = 2T(⌊n/2⌋) + 1', dep: (n) => [Math.floor(n / 2)], f: (n, T) => 2 * T[Math.floor(n / 2)] + 1 },
  '4T(n/2)+n': { label: 'T(n) = 4T(⌊n/2⌋) + n', dep: (n) => [Math.floor(n / 2)], f: (n, T) => 4 * T[Math.floor(n / 2)] + n },
}
const GUESSES: Record<string, { label: string; g: (n: number) => number }> = {
  'n log n': { label: 'n log₂ n', g: (n) => n * Math.log2(n) },
  'log n': { label: 'log₂ n', g: (n) => Math.log2(n) },
  'n^2': { label: 'n²', g: (n) => n * n },
  n: { label: 'n', g: (n) => n },
  'n^1.5': { label: 'n^1.5', g: (n) => n ** 1.5 },
}

export const cxGuessCheck: Algorithm = {
  id: 'cx-guess-check',
  title: 'The substitution method — does T(n) ≤ c·g(n) survive induction?',
  blurb: 'Each T(n) is built from a smaller T value (the arrow). If the bound holds there, the inductive step carries it up.',
  legend: { active: 'computing T(n)', compare: 'the smaller value it uses', done: 'bound holds', removed: 'bound fails' },
  inputs: [
    { name: 'rec', label: 'Recurrence', type: 'string', default: '2T(n/2)+n', hint: Object.keys(RECS).join(' | ') },
    { name: 'guess', label: 'Guess g(n)', type: 'string', default: 'n log n', hint: Object.keys(GUESSES).join(' | ') },
    { name: 'c', label: 'c', type: 'number', default: '2', min: 0, max: 100 },
    { name: 'N', label: 'up to n =', type: 'number', default: '12', min: 2, max: 16 },
  ],
  random: () => {
    const opts = [
      ['2T(n/2)+n', 'n log n', '2'],
      ['T(n/2)+1', 'log n', '2'],
      ['T(n-1)+n', 'n^2', '1'],
      ['2T(n/2)+n', 'n', '3'],
      ['4T(n/2)+n', 'n^2', '2'],
      ['2T(n/2)+1', 'n', '2'],
    ]
    const [rec, guess, c] = opts[rint(0, opts.length - 1)]
    return { rec, guess, c }
  },
  code: {
    pseudo: `
T[1] ← 1                                         // @base
for n ← 2 to N
  T[n] ← recurrence(n, T[smaller])               // @step
  holds[n] ← (T[n] ≤ c · g(n))                   // @step
// holds from some n₀ on? → T(n) = O(g(n))        // @verdict`,
    cpp: `
vector<double> T(N + 1);
T[1] = 1;                                        // @base
for (int n = 2; n <= N; n++) {
    T[n] = 2 * T[n / 2] + n;                     // @step
    bool holds = T[n] <= c * n * log2(n);        // @step
}
// holds for all n ≥ n₀ → T(n) = O(n log n)       // @verdict`,
    java: `
double[] T = new double[N + 1];
T[1] = 1;                                        // @base
for (int n = 2; n <= N; n++) {
    T[n] = 2 * T[n / 2] + n;                     // @step
    boolean holds = T[n] <= c * n * Math.log(n) / Math.log(2);   // @step
}
// holds for all n ≥ n₀ → T(n) = O(n log n)       // @verdict`,
    python: `
T = [0] * (N + 1)
T[1] = 1                                   # @base
for n in range(2, N + 1):
    T[n] = 2 * T[n // 2] + n               # @step
    holds = T[n] <= c * n * math.log2(n)   # @step
# holds for all n >= n0 -> T(n) = O(n log n)   @verdict`,
    js: `
const T = new Array(N + 1).fill(0);
T[1] = 1;                                        // @base
for (let n = 2; n <= N; n++) {
  T[n] = 2 * T[n >> 1] + n;                      // @step
  const holds = T[n] <= c * n * Math.log2(n);    // @step
}
// holds for all n ≥ n₀ → T(n) = O(n log n)       // @verdict`,
    c: `
double T[64];
T[1] = 1;                                        // @base
for (int n = 2; n <= N; n++) {
    T[n] = 2 * T[n / 2] + n;                     // @step
    int holds = T[n] <= c * n * log2(n);         // @step
}
/* holds for all n >= n0 -> T(n) = O(n log n) */  // @verdict`,
  },
  run: ({ rec, guess, c, N }) =>
    trace((t) => {
      const R = RECS[String(rec).trim()]
      const G = GUESSES[String(guess).trim()]
      if (!R) throw new Error(`Recurrence must be one of: ${Object.keys(RECS).join(', ')}`)
      if (!G) throw new Error(`Guess must be one of: ${Object.keys(GUESSES).join(', ')}`)
      const C = c as number
      const M = Math.min(16, Math.max(2, Math.floor(N as number)))
      const Tv: number[] = [0, 1]
      const rows: Scalar[][] = []
      const grid = t.grid('tab', rows, { label: `${R.label}, T(1) = 1   —   guess T(n) ≤ ${C}·${G.label}`, colLabels: ['n', 'T(n)', 'c·g(n)', 'holds?'] })
      const cg = (n: number) => r2(C * G.g(n))
      rows.push([1, 1, cg(1), 1 <= cg(1) + 1e-9 ? '✓' : '✗'])
      const ok: boolean[] = [false, 1 <= cg(1) + 1e-9]
      grid.role(0, 1, 'active').role(0, 3, ok[1] ? 'done' : 'removed')
      t.step('base', ok[1] ? `Base case n = 1: T(1) = 1 ≤ ${cg(1)}. ✓` : `Base case n = 1: T(1) = 1 but ${C}·${G.label} = ${cg(1)} at n = 1 — the bound fails here. That is allowed: Big-O only needs n ≥ n₀, so we will start the induction later (CLRS does exactly this for n log n).`, { n: 1, 'T(n)': 1 })
      for (let n = 2; n <= M; n++) {
        const v = R.f(n, Tv)
        Tv[n] = v
        const bound = cg(n)
        const holds = v <= bound + 1e-9
        ok[n] = holds
        rows.push([n, v, bound, holds ? '✓' : '✗'])
        grid.clear()
        for (let r = 0; r < n - 1; r++) grid.role(r, 3, ok[r + 1] ? 'done' : 'removed')
        grid.role(n - 1, 1, 'active')
        for (const d of R.dep(n)) {
          grid.role(d - 1, 1, 'compare')
          grid.arrow([d - 1, 1], [n - 1, 1], `T(${d})`, 'compare')
        }
        grid.role(n - 1, 3, holds ? 'done' : 'removed')
        const d0 = R.dep(n)[0]
        t.step(
          'step',
          `T(${n}) is built from T(${d0}) = ${Tv[d0]}: T(${n}) = ${v}. ${holds ? `≤ ${bound} ✓` : `> ${bound} ✗`}${ok[d0] && !holds ? ' — the bound held for the smaller value but did not carry up: the inductive step fails for this c.' : ''}`,
          { n, 'T(n)': v, bound },
        )
      }
      grid.clear()
      for (let r = 0; r < M; r++) grid.role(r, 3, ok[r + 1] ? 'done' : 'removed')
      let n0 = M + 1
      for (let n = M; n >= 1 && ok[n]; n--) n0 = n
      const tail = n0 <= M
      t.step(
        'verdict',
        tail
          ? `From n₀ = ${n0} on, every row holds. With the inductive step proved on paper (see the lesson), T(n) ≤ ${C}·${G.label} for all n ≥ ${n0}: T(n) = O(${G.label}). A table never proves it — it only tells you which c and n₀ to try.`
          : `The last rows fail: either the guess is too small or c is too small. Try a bigger c — if no c works for long, the guess is wrong (T(n) grows faster than ${G.label}).`,
        {},
      )
    }),
}

/* ───────────────────────── 4. Recursive binary search with its call stack ───────────────────────── */

export const cxBinarySearch: Algorithm = {
  id: 'cx-binary-search',
  title: 'Binary search — T(n) = T(n/2) + 1, and O(log n) stack frames',
  blurb: 'Each call does one comparison and recurses into half the range. The stack beside the array holds the pending calls.',
  legend: { window: 'range still possible', compare: 'mid', found: 'found', dim: 'discarded' },
  inputs: [
    { name: 'arr', label: 'Sorted array', type: 'array', default: '2 5 8 12 16 23 38 56 72 91 99 104 110', maxLen: 13 },
    { name: 'x', label: 'Find', type: 'number', default: '99' },
  ],
  random: () => {
    const a = sorted([...new Set(rarr(rint(9, 13), 1, 150))])
    return { arr: list(a), x: String(Math.random() < 0.8 ? a[rint(0, a.length - 1)] : rint(1, 150)) }
  },
  code: {
    pseudo: `
function bs(a, lo, hi, x)          // search a[lo..hi]
  if lo > hi: return −1             // @miss
  mid ← ⌊(lo + hi) / 2⌋              // @call
  if a[mid] = x: return mid         // @found
  if a[mid] < x: return bs(a, mid+1, hi, x)   // @right
  else return bs(a, lo, mid−1, x)             // @left`,
    cpp: `
int bs(const vector<int>& a, int lo, int hi, int x) {
    if (lo > hi) return -1;                     // @miss
    int mid = lo + (hi - lo) / 2;               // @call
    if (a[mid] == x) return mid;                // @found
    if (a[mid] < x) return bs(a, mid + 1, hi, x);   // @right
    return bs(a, lo, mid - 1, x);               // @left
}`,
    java: `
static int bs(int[] a, int lo, int hi, int x) {
    if (lo > hi) return -1;                     // @miss
    int mid = lo + (hi - lo) / 2;               // @call
    if (a[mid] == x) return mid;                // @found
    if (a[mid] < x) return bs(a, mid + 1, hi, x);   // @right
    return bs(a, lo, mid - 1, x);               // @left
}`,
    python: `
def bs(a, lo, hi, x):
    if lo > hi:                      # @miss
        return -1
    mid = (lo + hi) // 2             # @call
    if a[mid] == x:                  # @found
        return mid
    if a[mid] < x:
        return bs(a, mid + 1, hi, x) # @right
    return bs(a, lo, mid - 1, x)     # @left`,
    js: `
function bs(a, lo, hi, x) {
  if (lo > hi) return -1;                       // @miss
  const mid = (lo + hi) >> 1;                   // @call
  if (a[mid] === x) return mid;                 // @found
  if (a[mid] < x) return bs(a, mid + 1, hi, x); // @right
  return bs(a, lo, mid - 1, x);                 // @left
}`,
    c: `
int bs(const int *a, int lo, int hi, int x) {
    if (lo > hi) return -1;                     // @miss
    int mid = lo + (hi - lo) / 2;               // @call
    if (a[mid] == x) return mid;                // @found
    if (a[mid] < x) return bs(a, mid + 1, hi, x);   // @right
    return bs(a, lo, mid - 1, x);               // @left
}`,
  },
  run: ({ arr, x }) =>
    trace((t) => {
      const v = sorted(arr as number[])
      const X = x as number
      const n = v.length
      if (!n) throw new Error('The array is empty.')
      const A = t.array('a', v, { label: `a (n = ${n}, sorted)` })
      const S = t.stack('cs', 'call stack')
      const m = t.meter('cmp', 'Calls made', [
        { label: '⌊log₂ n⌋ + 1', value: Math.floor(Math.log2(n)) + 1 },
        { label: 'n', value: n },
      ])
      let lo = 0
      let hi = n - 1
      let hit = false
      const paint = () => {
        A.clear()
        for (let i = 0; i < n; i++) if (i < lo || i > hi) A.role(i, 'dim')
        A.range(lo <= hi ? [{ from: lo, to: hi, role: 'window', label: `${hi - lo + 1} left` }] : [])
      }
      for (;;) {
        S.push(`bs(${lo}, ${hi})`)
        S.clear().role(S.length - 1, 'active')
        m.add(1)
        paint()
        if (lo > hi) {
          A.ptr('mid', null)
          t.step('miss', `bs(${lo}, ${hi}): the range is empty — ${X} is not in the array. ${m.value} calls for n = ${n}.`, { lo, hi, x: X })
          break
        }
        const mid = (lo + hi) >> 1
        A.role(mid, 'compare').ptr('lo', lo).ptr('hi', hi).ptr('mid', mid)
        t.step('call', `bs(${lo}, ${hi}): ${hi - lo + 1} candidates. Look at the middle, a[${mid}] = ${v[mid]}.`, { lo, hi, mid, x: X })
        if (v[mid] === X) {
          A.clear().role(mid, 'found')
          hit = true
          t.step('found', `a[${mid}] = ${X}: found after ${m.value} call${m.value > 1 ? 's' : ''}. Each call halved the range, so at most ⌊log₂ ${n}⌋ + 1 = ${Math.floor(Math.log2(n)) + 1}.`, { lo, hi, mid, x: X })
          break
        }
        if (v[mid] < X) {
          lo = mid + 1
          paint()
          A.ptr('lo', lo).ptr('mid', null)
          t.step('right', `${v[mid]} < ${X}: everything at or left of ${mid} is too small. Recurse on the right half — a new frame on the stack.`, { lo, hi, x: X })
        } else {
          hi = mid - 1
          paint()
          A.ptr('hi', hi).ptr('mid', null)
          t.step('left', `${v[mid]} > ${X}: everything at or right of ${mid} is too big. Recurse on the left half — a new frame on the stack.`, { lo, hi, x: X })
        }
      }
      S.clear()
      for (let i = 0; i < S.length; i++) S.role(i, 'done')
      m.role = 'done'
      t.step(hit ? 'found' : 'miss', `T(n) = T(n/2) + 1 = Θ(log n) time. The stack peaked at ${S.length} frames — Θ(log n) space for the recursive version, O(1) for the loop version (the call is a tail call, so a loop does the same job).`, {})
    }),
}

/* ───────────────────────── 5. Karatsuba: three half-size products instead of four ───────────────────────── */

export const cxKaratsuba: Algorithm = {
  id: 'cx-karatsuba',
  title: 'Karatsuba multiplication — 3 recursive products, not 4',
  blurb: 'x·y = ac·10²ᵐ + ((a+b)(c+d) − ac − bd)·10ᵐ + bd. Three branches per node: Θ(n^log₂3) ≈ Θ(n^1.585).',
  legend: { active: 'current call', compare: 'waiting for its children', done: 'returned', pivot: 'single-digit product' },
  inputs: [
    { name: 'x', label: 'x', type: 'number', default: '1234', min: 0, max: 999999 },
    { name: 'y', label: 'y', type: 'number', default: '5678', min: 0, max: 999999 },
  ],
  random: () => ({ x: String(rint(1000, 9999)), y: String(rint(1000, 9999)) }),
  code: {
    pseudo: `
function K(x, y)
  if x < 10 or y < 10: return x · y        // @base
  m ← ⌊max(digits(x), digits(y)) / 2⌋
  a, b ← split x at m digits; c, d ← split y      // @split
  ac ← K(a, c); bd ← K(b, d)
  mid ← K(a + b, c + d) − ac − bd
  return ac·10²ᵐ + mid·10ᵐ + bd            // @combine`,
    cpp: `
long long K(long long x, long long y) {
    if (x < 10 || y < 10) return x * y;                       // @base
    int m = max(to_string(x).size(), to_string(y).size()) / 2;
    long long p = 1; for (int i = 0; i < m; i++) p *= 10;
    long long a = x / p, b = x % p, c = y / p, d = y % p;     // @split
    long long ac = K(a, c), bd = K(b, d);
    long long mid = K(a + b, c + d) - ac - bd;
    return ac * p * p + mid * p + bd;                         // @combine
}`,
    java: `
static long K(long x, long y) {
    if (x < 10 || y < 10) return x * y;                       // @base
    int m = Math.max(Long.toString(x).length(), Long.toString(y).length()) / 2;
    long p = 1; for (int i = 0; i < m; i++) p *= 10;
    long a = x / p, b = x % p, c = y / p, d = y % p;          // @split
    long ac = K(a, c), bd = K(b, d);
    long mid = K(a + b, c + d) - ac - bd;
    return ac * p * p + mid * p + bd;                         // @combine
}`,
    python: `
def K(x, y):
    if x < 10 or y < 10:                     # @base
        return x * y
    m = max(len(str(x)), len(str(y))) // 2
    p = 10 ** m
    a, b = divmod(x, p); c, d = divmod(y, p) # @split
    ac, bd = K(a, c), K(b, d)
    mid = K(a + b, c + d) - ac - bd
    return ac * p * p + mid * p + bd         # @combine`,
    js: `
function K(x, y) {
  if (x < 10 || y < 10) return x * y;                         // @base
  const m = Math.floor(Math.max(String(x).length, String(y).length) / 2);
  const p = 10 ** m;
  const a = Math.floor(x / p), b = x % p, c = Math.floor(y / p), d = y % p;   // @split
  const ac = K(a, c), bd = K(b, d);
  const mid = K(a + b, c + d) - ac - bd;
  return ac * p * p + mid * p + bd;                           // @combine
}`,
    c: `
long long K(long long x, long long y) {
    if (x < 10 || y < 10) return x * y;                       // @base
    int dx = 0, dy = 0; for (long long t = x; t; t /= 10) dx++; for (long long t = y; t; t /= 10) dy++;
    int m = (dx > dy ? dx : dy) / 2;
    long long p = 1; for (int i = 0; i < m; i++) p *= 10;
    long long a = x / p, b = x % p, c = y / p, d = y % p;     // @split
    long long ac = K(a, c), bd = K(b, d);
    long long mid = K(a + b, c + d) - ac - bd;
    return ac * p * p + mid * p + bd;                         // @combine
}`,
  },
  run: ({ x, y }) =>
    trace((t) => {
      const X = Math.floor(x as number)
      const Y = Math.floor(y as number)
      if (X < 0 || Y < 0 || X > 999999 || Y > 999999) throw new Error('Use whole numbers from 0 to 999 999.')
      const T = t.tree('rt', { label: 'recursion tree (each node is one call x·y)' })
      const S = t.stack('cs', 'call stack')
      const digits = Math.max(String(X).length, String(Y).length)
      const m = t.meter('mul', 'Single-digit multiplications', [
        { label: `n^1.585`, value: r2(digits ** Math.log2(3)) },
        { label: 'n² (school method)', value: digits * digits },
      ])
      const go = (a: number, b: number, parent: string | null): number => {
        const id = T.node(`${a}·${b}`)
        if (parent) T.addChild(parent, id)
        else T.setRoot(id)
        S.push(`K(${a}, ${b})`)
        T.role(id, 'active')
        S.clear().role(S.length - 1, 'active')
        if (a < 10 || b < 10) {
          const r = a * b
          m.add(1)
          T.role(id, 'pivot').note(id, `= ${r}`)
          t.step('base', `${a} · ${b}: one of them is a single digit, so multiply directly: ${r}. That is one elementary multiplication.`, { x: a, y: b, result: r })
          S.pop()
          return r
        }
        const mm = Math.floor(Math.max(String(a).length, String(b).length) / 2)
        const p = 10 ** mm
        const A1 = Math.floor(a / p)
        const B1 = a % p
        const C1 = Math.floor(b / p)
        const D1 = b % p
        T.role(id, 'compare')
        t.step('split', `${a}·${b}: split at m = ${mm} digits — a = ${A1}, b = ${B1}, c = ${C1}, d = ${D1}. Instead of the four products ac, ad, bc, bd, compute three: ac, bd and (a+b)(c+d).`, { x: a, y: b, a: A1, b: B1, c: C1, d: D1 })
        const ac = go(A1, C1, id)
        S.clear().role(S.length - 1, 'active')
        const bd = go(B1, D1, id)
        S.clear().role(S.length - 1, 'active')
        const ef = go(A1 + B1, C1 + D1, id)
        const mid = ef - ac - bd
        const r = ac * p * p + mid * p + bd
        T.keep('done', 'pivot')
        T.role(id, 'active').note(id, `= ${r}`)
        S.clear().role(S.length - 1, 'active')
        t.step('combine', `ad + bc = (a+b)(c+d) − ac − bd = ${ef} − ${ac} − ${bd} = ${mid}. Result: ${ac}·10^${2 * mm} + ${mid}·10^${mm} + ${bd} = ${r}. Additions and shifts are O(n); only the 3 recursive products matter.`, { x: a, y: b, result: r })
        S.pop()
        T.role(id, 'done')
        return r
      }
      const res = go(X, Y, null)
      m.role = 'done'
      t.step('combine', `${X} · ${Y} = ${res} using ${m.value} single-digit multiplications (the school method needs ${digits}² = ${digits * digits}). T(n) = 3T(n/2) + O(n) = Θ(n^log₂ 3) ≈ Θ(n^1.585): with four products it would be 4T(n/2) + O(n) = Θ(n²) — no gain at all.`, { result: res })
    }),
}

export const algorithms2: Algorithm[] = [cxRecTree, cxUnequalTree, cxGuessCheck, cxBinarySearch, cxKaratsuba]
