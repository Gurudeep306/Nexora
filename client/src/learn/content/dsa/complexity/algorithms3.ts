import { trace } from '../../../engine/tracer'
import type { Algorithm, Scalar } from '../../../engine/types'
import { list, rarr, rint } from '../../../algorithms/util'

/* Complexity topic — animations, part 3: quicksort's cases, the indicator-variable proof, decision trees and adversary lower bounds. */

const r2 = (x: number) => Math.round(x * 100) / 100

/** A tiny deterministic generator so "random" pivots replay identically when scrubbing. */
function lcg(seed: number) {
  let s = (Math.floor(seed) >>> 0) || 1
  return (lo: number, hi: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return lo + (s % (hi - lo + 1))
  }
}

/* ───────────────────────── 1. Quicksort: the recursion tree decides the cost ───────────────────────── */

export const cxQuicksort: Algorithm = {
  id: 'cx-quicksort',
  title: 'Quicksort — balanced splits vs the sorted-input disaster',
  blurb: 'Lomuto partition with a last-element or random pivot. Watch the recursion tree: its depth is the whole story.',
  legend: { pivot: 'pivot', compare: 'a[j] vs pivot', swap: 'swapped', window: 'current subarray', done: 'in final place', active: 'this call' },
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '1 2 3 4 5 6 7 8', maxLen: 10 },
    { name: 'pivot', label: 'Pivot (last | random)', type: 'string', default: 'last' },
    { name: 'seed', label: 'Seed', type: 'number', default: '7', min: 1, max: 99999 },
  ],
  random: () => ({ arr: list(rarr(rint(7, 10), 1, 30)), pivot: Math.random() < 0.5 ? 'last' : 'random', seed: String(rint(1, 999)) }),
  code: {
    pseudo: `
function quicksort(a, lo, hi)
  if lo ≥ hi: return                       // @base
  p ← choose pivot index in [lo, hi]; swap a[p], a[hi]   // @pick
  i ← lo
  for j ← lo to hi − 1
    if a[j] < a[hi]                        // @cmp
      swap a[i], a[j]; i ← i + 1           // @swap
  swap a[i], a[hi]   // pivot is home      // @place
  quicksort(a, lo, i − 1); quicksort(a, i + 1, hi)`,
    cpp: `
void quicksort(vector<int>& a, int lo, int hi, mt19937& rng) {
    if (lo >= hi) return;                                 // @base
    int p = randomPivot ? uniform_int_distribution<int>(lo, hi)(rng) : hi;
    swap(a[p], a[hi]);                                    // @pick
    int i = lo;
    for (int j = lo; j < hi; j++)
        if (a[j] < a[hi]) {                               // @cmp
            swap(a[i], a[j]); i++;                        // @swap
        }
    swap(a[i], a[hi]);                                    // @place
    quicksort(a, lo, i - 1, rng);
    quicksort(a, i + 1, hi, rng);
}`,
    java: `
static void quicksort(int[] a, int lo, int hi, Random rng) {
    if (lo >= hi) return;                                 // @base
    int p = randomPivot ? lo + rng.nextInt(hi - lo + 1) : hi;
    int t = a[p]; a[p] = a[hi]; a[hi] = t;                // @pick
    int i = lo;
    for (int j = lo; j < hi; j++)
        if (a[j] < a[hi]) {                               // @cmp
            t = a[i]; a[i] = a[j]; a[j] = t; i++;         // @swap
        }
    t = a[i]; a[i] = a[hi]; a[hi] = t;                    // @place
    quicksort(a, lo, i - 1, rng);
    quicksort(a, i + 1, hi, rng);
}`,
    python: `
def quicksort(a, lo, hi):
    if lo >= hi:                                   # @base
        return
    p = random.randint(lo, hi) if random_pivot else hi
    a[p], a[hi] = a[hi], a[p]                      # @pick
    i = lo
    for j in range(lo, hi):
        if a[j] < a[hi]:                           # @cmp
            a[i], a[j] = a[j], a[i]; i += 1        # @swap
    a[i], a[hi] = a[hi], a[i]                      # @place
    quicksort(a, lo, i - 1)
    quicksort(a, i + 1, hi)`,
    js: `
function quicksort(a, lo, hi) {
  if (lo >= hi) return;                                   // @base
  const p = randomPivot ? lo + Math.floor(Math.random() * (hi - lo + 1)) : hi;
  [a[p], a[hi]] = [a[hi], a[p]];                          // @pick
  let i = lo;
  for (let j = lo; j < hi; j++)
    if (a[j] < a[hi]) {                                   // @cmp
      [a[i], a[j]] = [a[j], a[i]]; i++;                   // @swap
    }
  [a[i], a[hi]] = [a[hi], a[i]];                          // @place
  quicksort(a, lo, i - 1);
  quicksort(a, i + 1, hi);
}`,
    c: `
void quicksort(int *a, int lo, int hi) {
    if (lo >= hi) return;                                 // @base
    int p = random_pivot ? lo + rand() % (hi - lo + 1) : hi;
    int t = a[p]; a[p] = a[hi]; a[hi] = t;                // @pick
    int i = lo;
    for (int j = lo; j < hi; j++)
        if (a[j] < a[hi]) {                               // @cmp
            t = a[i]; a[i] = a[j]; a[j] = t; i++;         // @swap
        }
    t = a[i]; a[i] = a[hi]; a[hi] = t;                    // @place
    quicksort(a, lo, i - 1);
    quicksort(a, i + 1, hi);
}`,
  },
  run: ({ arr, pivot, seed }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      if (n < 2) throw new Error('Give at least two numbers.')
      const mode = String(pivot).trim().toLowerCase()
      if (mode !== 'last' && mode !== 'random') throw new Error('Pivot must be "last" or "random".')
      const rnd = lcg(seed as number)
      const A = t.array('a', v, { label: 'a', bars: true })
      const T = t.tree('rt', { label: 'recursion tree (node = pivot, note = subarray size)', binary: true })
      let H = 0
      for (let k = 1; k <= n; k++) H += 1 / k
      const m = t.meter('cmp', 'Comparisons', [
        { label: 'expected with random pivots', value: r2(2 * (n + 1) * H - 4 * n) },
        { label: 'n(n−1)/2 (worst)', value: (n * (n - 1)) / 2 },
      ])
      const done = new Set<number>()
      let maxDepth = 0
      const paint = (lo: number, hi: number) => {
        A.clear()
        for (const d of done) A.role(d, 'done')
        A.range(lo <= hi ? [{ from: lo, to: hi, role: 'window' }] : [])
      }
      const qs = (lo: number, hi: number, parent: string | null, side: number, depth: number) => {
        maxDepth = Math.max(maxDepth, depth)
        if (lo > hi) return
        if (lo === hi) {
          done.add(lo)
          const id = T.node(A.get(lo) as Scalar, 'n=1')
          if (parent) T.setChild(parent, side, id)
          else T.setRoot(id)
          T.keep('done').role(id, 'done')
          paint(lo, hi)
          t.step('base', `Subarray [${lo}] has one element (${A.get(lo)}): already sorted, nothing to compare.`, { lo, hi, depth })
          return
        }
        const p = mode === 'random' ? rnd(lo, hi) : hi
        if (p !== hi) A.swap(p, hi)
        const pv = A.get(hi) as number
        const id = T.node(pv, `n=${hi - lo + 1}`)
        if (parent) T.setChild(parent, side, id)
        else T.setRoot(id)
        T.keep('done').role(id, 'active')
        paint(lo, hi)
        A.role(hi, 'pivot')
        t.step('pick', `quicksort(${lo}, ${hi}) on ${hi - lo + 1} elements. Pivot ${pv}${mode === 'random' ? ` (chosen at random${p !== hi ? `, moved to the end` : ''})` : ' (the last element)'}. Partition will compare it with the other ${hi - lo}.`, { lo, hi, pivot: pv, depth })
        let i = lo
        for (let j = lo; j < hi; j++) {
          m.add(1)
          paint(lo, hi)
          A.role(hi, 'pivot').role(j, 'compare').ptr('i', i).ptr('j', j)
          const less = (A.get(j) as number) < pv
          t.step('cmp', `a[${j}] = ${A.get(j)} ${less ? '<' : '≥'} ${pv}${less ? ': it belongs on the left.' : ': it stays on the right.'}`, { lo, hi, pivot: pv, i, j, depth })
          if (less) {
            if (i !== j) {
              A.swap(i, j)
              paint(lo, hi)
              A.role(hi, 'pivot').role(i, 'swap').role(j, 'swap')
              t.step('swap', `Swap a[${i}] and a[${j}]: the "less than pivot" zone grows to ${i - lo + 1}.`, { lo, hi, pivot: pv, i: i + 1, j, depth })
            }
            i++
          }
        }
        A.swap(i, hi)
        done.add(i)
        paint(lo, hi)
        A.ptr('i', null).ptr('j', null)
        A.role(i, 'pivot')
        const L = i - lo
        const R = hi - i
        t.step('place', `Pivot ${pv} goes to index ${i}, its final place. Split: ${L} on the left, ${R} on the right${L === 0 || R === 0 ? ' — completely lopsided, so the next call is only one smaller.' : '.'}`, { lo, hi, pivot: pv, depth })
        T.role(id, 'done')
        qs(lo, i - 1, id, 0, depth + 1)
        qs(i + 1, hi, id, 1, depth + 1)
      }
      t.step('base', `Sort ${n} values with a ${mode} pivot. Every comparison is counted on the meter.`, { n })
      qs(0, n - 1, null, 0, 0)
      A.clear().range([])
      for (let k = 0; k < n; k++) A.role(k, 'done')
      m.role = m.value > n * Math.log2(n) * 1.5 ? 'removed' : 'done'
      t.step(
        'place',
        `Sorted with ${m.value} comparisons; the recursion tree is ${maxDepth} levels deep. ${
          m.value >= (n * (n - 1)) / 2 - 1
            ? 'Every pivot was an extreme value, so each level peeled off one element: (n−1) + (n−2) + … = n(n−1)/2 — the Θ(n²) worst case, and Θ(n) stack depth.'
            : 'Balanced-ish splits give a tree about log n deep with ≤ n comparisons per level: Θ(n log n).'
        } Try "random" on the sorted input: the bad case disappears for every input — only unlucky coin flips remain.`,
        { comparisons: m.value, depth: maxDepth },
      )
    }),
}

/* ───────────────────────── 2. Indicator variables: which pairs get compared? ───────────────────────── */

export const cxQuickPairs: Algorithm = {
  id: 'cx-quick-pairs',
  title: 'Expected comparisons of randomized quicksort, pair by pair',
  blurb: 'Values zᵢ < zⱼ are compared iff the first pivot chosen from zᵢ…zⱼ is zᵢ or zⱼ — probability 2/(j − i + 1).',
  legend: { found: 'compared (Xᵢⱼ = 1)', removed: 'separated forever (Xᵢⱼ = 0)', pivot: 'pivot row/column', window: 'still undecided', dim: 'not a pair' },
  inputs: [
    { name: 'n', label: 'n (values 1…n)', type: 'number', default: '7', min: 3, max: 9 },
    { name: 'seed', label: 'Seed', type: 'number', default: '11', min: 1, max: 99999 },
  ],
  random: () => ({ n: String(rint(5, 9)), seed: String(rint(1, 9999)) }),
  code: {
    pseudo: `
// X = Σ over pairs i < j of X_ij,  X_ij = 1 if z_i and z_j are ever compared
function rqs(S)                       // S = a set of consecutive ranks
  if |S| ≤ 1: return                  // @split
  pick pivot z_k uniformly from S     // @pivot
  compare z_k with every other z in S // these X_kj become 1   @cmp
  rqs(S below z_k); rqs(S above z_k)  // pairs across z_k: X = 0 forever   @split
// E[X] = Σ 2/(j−i+1) = 2(n+1)H_n − 4n ≈ 1.39 n log₂ n   @done`,
    cpp: `
// E[comparisons] = sum over i < j of 2 / (j - i + 1)
double expectedComparisons(int n) {
    double e = 0;
    for (int i = 1; i <= n; i++)                 // @pivot
        for (int j = i + 1; j <= n; j++)
            e += 2.0 / (j - i + 1);              // @cmp
    return e;   // = 2(n+1)H_n - 4n                 @split,done
}`,
    java: `
static double expectedComparisons(int n) {
    double e = 0;
    for (int i = 1; i <= n; i++)                 // @pivot
        for (int j = i + 1; j <= n; j++)
            e += 2.0 / (j - i + 1);              // @cmp
    return e;   // = 2(n+1)H_n - 4n                 @split,done
}`,
    python: `
def expected_comparisons(n):
    e = 0.0
    for i in range(1, n + 1):            # @pivot
        for j in range(i + 1, n + 1):
            e += 2 / (j - i + 1)         # @cmp
    return e  # = 2(n+1)H_n - 4n            @split,done`,
    js: `
function expectedComparisons(n) {
  let e = 0;
  for (let i = 1; i <= n; i++)                   // @pivot
    for (let j = i + 1; j <= n; j++)
      e += 2 / (j - i + 1);                      // @cmp
  return e;   // = 2(n+1)H_n - 4n                   @split,done
}`,
    c: `
double expected_comparisons(int n) {
    double e = 0;
    for (int i = 1; i <= n; i++)                 // @pivot
        for (int j = i + 1; j <= n; j++)
            e += 2.0 / (j - i + 1);              // @cmp
    return e;   /* = 2(n+1)H_n - 4n */             // @split,done
}`,
  },
  run: ({ n, seed }) =>
    trace((t) => {
      const N = Math.floor(n as number)
      if (N < 3 || N > 9) throw new Error('Use 3 ≤ n ≤ 9.')
      const rnd = lcg(seed as number)
      const rows: Scalar[][] = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => (j > i ? `2/${j - i + 1}` : null)))
      const G = t.grid('pairs', rows, { label: 'pair (zᵢ, zⱼ): probability 2/(j−i+1) until decided', rowLabels: Array.from({ length: N }, (_, i) => `z${i + 1}`), colLabels: Array.from({ length: N }, (_, j) => `z${j + 1}`) })
      const S = t.array('ranks', Array.from({ length: N }, (_, i) => i + 1), { label: 'sorted values z₁ … zₙ' })
      let H = 0
      for (let k = 1; k <= N; k++) H += 1 / k
      const E = 2 * (N + 1) * H - 4 * N
      const m = t.meter('cmp', 'Comparisons this run', [
        { label: 'E[X]', value: r2(E) },
        { label: 'n(n−1)/2', value: (N * (N - 1)) / 2 },
      ])
      const state: ('?' | 'yes' | 'no')[][] = Array.from({ length: N }, () => Array(N).fill('?'))
      const paint = (piv?: number) => {
        G.clear()
        for (let i = 0; i < N; i++)
          for (let j = 0; j < N; j++) {
            if (j <= i) G.role(i, j, 'dim')
            else G.role(i, j, state[i][j] === 'yes' ? 'found' : state[i][j] === 'no' ? 'removed' : 'window')
          }
        if (piv != null) for (let k = 0; k < N; k++) if (k !== piv && G.roles[`${Math.min(k, piv)},${Math.max(k, piv)}`] === 'window') G.role(Math.min(k, piv), Math.max(k, piv), 'pivot')
      }
      paint()
      t.step('split', `Each cell is a pair zᵢ < zⱼ with indicator Xᵢⱼ. The total number of comparisons is X = Σ Xᵢⱼ, so E[X] = Σ Pr[zᵢ and zⱼ are compared] — the numbers in the cells. Their sum is ${r2(E)}.`, { 'E[X]': r2(E) })
      const rec = (lo: number, hi: number) => {
        if (lo >= hi) return
        const k = rnd(lo, hi)
        S.clear().range([{ from: lo, to: hi, role: 'window' }]).role(k, 'pivot')
        paint(k)
        t.step('pivot', `Among z${lo + 1}…z${hi + 1} the pivot is z${k + 1}, chosen uniformly. It is compared with every other value in this range — and only now.`, { pivot: `z${k + 1}`, comparisons: m.value })
        for (let x = lo; x <= hi; x++) {
          if (x === k) continue
          const i = Math.min(x, k)
          const j = Math.max(x, k)
          state[i][j] = 'yes'
          G.set(i, j, '✓')
          m.add(1)
        }
        for (let i = lo; i < k; i++)
          for (let j = k + 1; j <= hi; j++) {
            state[i][j] = 'no'
            G.set(i, j, '✗')
          }
        paint()
        S.clear().range([{ from: lo, to: hi, role: 'window' }]).role(k, 'pivot')
        t.step('cmp', `${hi - lo} comparison${hi - lo === 1 ? '' : 's'} (✓). And every pair with one value below z${k + 1} and one above it goes into different halves: they will never meet (✗). That is why zᵢ, zⱼ are compared only if zᵢ or zⱼ is the first pivot picked from zᵢ…zⱼ: 2 lucky choices out of j − i + 1.`, { pivot: `z${k + 1}`, comparisons: m.value })
        rec(lo, k - 1)
        rec(k + 1, hi)
      }
      rec(0, N - 1)
      S.clear().range([])
      paint()
      m.role = 'done'
      t.step('done', `This run made ${m.value} comparisons; the expectation is ${r2(E)}. Summing 2/(j−i+1): for each gap d = j − i there are n − d pairs, so E[X] = Σ_d (n−d)·2/(d+1) ≤ 2n·H_n = O(n log n). Pick another seed: the ✓ pattern changes, the average does not.`, { comparisons: m.value, 'E[X]': r2(E) })
    }),
}

/* ───────────────────────── 3. The decision tree of a comparison sort ───────────────────────── */

const LETTERS = 'abcd'

export const cxDecisionTree: Algorithm = {
  id: 'cx-decision-tree',
  title: 'Decision tree of insertion sort — why sorting needs log₂(n!) comparisons',
  blurb: 'Every comparison sort is a binary tree of questions. It needs a leaf for each of the n! orders, so it is at least log₂(n!) deep.',
  legend: { active: 'question being asked', found: 'the answer (leaf)', done: 'path taken', dim: 'other branches' },
  inputs: [{ name: 'arr', label: 'Values a b c (d)', type: 'array', default: '30 10 20', maxLen: 4 }],
  random: () => {
    const k = rint(3, 4)
    const v = Array.from({ length: k }, (_, i) => (i + 1) * 10).sort(() => Math.random() - 0.5)
    return { arr: list(v) }
  },
  code: {
    pseudo: `
function insertionSort(a)
  for i ← 1 to n − 1
    j ← i
    while j > 0 and a[j−1] > a[j]      // each test is one question   @cmp
      swap a[j−1], a[j]; j ← j − 1
  // the answers so far pin down one order   @leaf
// n! possible orders ⇒ some path asks ≥ ⌈log₂ n!⌉ questions   @bound`,
    cpp: `
void insertionSort(vector<int>& a) {
    for (size_t i = 1; i < a.size(); i++)
        for (size_t j = i; j > 0 && a[j - 1] > a[j]; j--)   // @cmp
            swap(a[j - 1], a[j]);
}   // a leaf of the decision tree                         @leaf
// height ≥ log2(n!) = Θ(n log n)                          @bound`,
    java: `
static void insertionSort(int[] a) {
    for (int i = 1; i < a.length; i++)
        for (int j = i; j > 0 && a[j - 1] > a[j]; j--) {   // @cmp
            int t = a[j]; a[j] = a[j - 1]; a[j - 1] = t;
        }
}   // a leaf of the decision tree                        @leaf
// height ≥ log2(n!) = Θ(n log n)                         @bound`,
    python: `
def insertion_sort(a):
    for i in range(1, len(a)):
        j = i
        while j > 0 and a[j - 1] > a[j]:     # @cmp
            a[j - 1], a[j] = a[j], a[j - 1]
            j -= 1
    # a leaf of the decision tree            @leaf
# height >= log2(n!) = Θ(n log n)            @bound`,
    js: `
function insertionSort(a) {
  for (let i = 1; i < a.length; i++)
    for (let j = i; j > 0 && a[j - 1] > a[j]; j--)       // @cmp
      [a[j - 1], a[j]] = [a[j], a[j - 1]];
}   // a leaf of the decision tree                       @leaf
// height ≥ log2(n!) = Θ(n log n)                        @bound`,
    c: `
void insertion_sort(int *a, int n) {
    for (int i = 1; i < n; i++)
        for (int j = i; j > 0 && a[j - 1] > a[j]; j--) {   // @cmp
            int t = a[j]; a[j] = a[j - 1]; a[j - 1] = t;
        }
}   /* a leaf of the decision tree */                     // @leaf
/* height >= log2(n!) = Θ(n log n) */                     // @bound`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      if (n < 3 || n > 4) throw new Error('Give 3 or 4 values.')
      if (new Set(v).size !== n) throw new Error('Use distinct values.')
      // Build the tree by running insertion sort on every ordering of ranks, recording (x:y, outcome) per comparison.
      const perms: number[][] = []
      const permute = (cur: number[], rest: number[]) => {
        if (!rest.length) perms.push(cur)
        rest.forEach((x, i) => permute([...cur, x], [...rest.slice(0, i), ...rest.slice(i + 1)]))
      }
      permute([], Array.from({ length: n }, (_, i) => i))
      type Q = { x: number; y: number; gt: boolean }
      const runIS = (rank: number[]) => {
        const a = Array.from({ length: n }, (_, i) => i) // element ids by position
        const qs: Q[] = []
        for (let i = 1; i < n; i++) {
          let j = i
          while (j > 0) {
            const gt = rank[a[j - 1]] > rank[a[j]]
            qs.push({ x: a[j - 1], y: a[j], gt })
            if (!gt) break
            ;[a[j - 1], a[j]] = [a[j], a[j - 1]]
            j--
          }
        }
        return { qs, order: a }
      }
      const T = t.tree('dt', { label: `decision tree for ${n} elements (${perms.length} leaves = ${n}!)` })
      const nodeAt = new Map<string, string>()
      const key = (qs: Q[]) => qs.map((q) => (q.gt ? '>' : '≤')).join('')
      for (const p of perms) {
        const { qs, order } = runIS(p)
        let parent: string | null = null
        for (let d = 0; d <= qs.length; d++) {
          const k = key(qs.slice(0, d))
          let id = nodeAt.get(k)
          if (!id) {
            id = d < qs.length ? T.node(`${LETTERS[qs[d].x]}:${LETTERS[qs[d].y]}`) : T.node(order.map((e) => LETTERS[e]).join(''))
            nodeAt.set(k, id)
            if (parent) T.setChild(parent, qs[d - 1].gt ? 1 : 0, id, qs[d - 1].gt ? '>' : '≤')
            else T.setRoot(id)
          }
          parent = id
        }
      }
      const lgFact = Math.log2(perms.length)
      const height = Math.max(...perms.map((p) => runIS(p).qs.length))
      const A = t.array('in', v, { label: `input: ${v.map((x, i) => `${LETTERS[i]} = ${x}`).join(', ')}` })
      const m = t.meter('q', 'Comparisons on this path', [
        { label: `log₂ ${n}!`, value: r2(lgFact) },
        { label: 'tree height', value: height },
      ])
      for (const id of T.nodes.keys()) T.role(id, 'dim')
      T.role(T.root, 'active')
      t.step('cmp', `Each internal node asks one question "x:y — is x > y?"; the answer picks the branch. Each of the ${perms.length} leaves is one possible sorted order. The tree is the algorithm, for every input of size ${n} at once.`, {})
      const rank = v.map((x) => v.filter((y) => y < x).length)
      const { qs, order } = runIS(rank)
      let path = ''
      for (const q of qs) {
        const id = nodeAt.get(path)!
        T.role(id, 'active')
        m.add(1)
        A.clear().role(q.x, 'compare').role(q.y, 'compare')
        t.step('cmp', `Ask ${LETTERS[q.x]}:${LETTERS[q.y]} — is ${v[q.x]} > ${v[q.y]}? ${q.gt ? 'Yes: go right (and insertion sort swaps them).' : 'No: go left (they are in order, the insertion stops).'}`, { question: `${LETTERS[q.x]}:${LETTERS[q.y]}`, answer: q.gt ? '>' : '≤' })
        T.role(id, 'done')
        const next = nodeAt.get(path + (q.gt ? '>' : '≤'))!
        T.edgeRole(id, next, 'done')
        path += q.gt ? '>' : '≤'
      }
      const leaf = nodeAt.get(path)!
      T.role(leaf, 'found')
      A.clear()
      t.step('leaf', `Leaf "${order.map((e) => LETTERS[e]).join('')}": sorted order ${order.map((e) => v[e]).join(' ≤ ')} after ${qs.length} comparisons. Different inputs end at different leaves, so every one of the ${perms.length} orders needs its own leaf.`, { comparisons: qs.length })
      m.role = 'done'
      t.step('bound', `A binary tree of height h has at most 2^h leaves. We need ≥ n! leaves, so 2^h ≥ n!, h ≥ log₂ n! = ${r2(lgFact)} — at least ${Math.ceil(lgFact)} comparisons in the worst case for n = ${n}. In general log₂ n! ≥ (n/2)·log₂(n/2) = Ω(n log n): no comparison sort can beat n log n.`, {})
    }),
}

/* ───────────────────────── 4. Min and max together: 3n/2 comparisons, and the adversary's proof ───────────────────────── */

export const cxMinMax: Algorithm = {
  id: 'cx-min-max',
  title: 'Min and max in ⌈3n/2⌉ − 2 comparisons — and the adversary proof it is optimal',
  blurb: 'Compare in pairs: the winner challenges the max, the loser the min. An adversary shows no algorithm can do better.',
  legend: { compare: 'pair compared', best: 'current max', pivot: 'current min', dim: 'out of the running for both' },
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '7 3 9 1 6 8 2 5', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(6, 12), 1, 50)) }),
  code: {
    pseudo: `
function minMax(a)
  mn ← mx ← first element (or the first pair, ordered)     // @init
  for each next pair (x, y)
    if x > y: swap x, y          // 1 comparison            @pair
    if y > mx: mx ← y            // winner challenges max   @max
    if x < mn: mn ← x            // loser challenges min    @min
  return (mn, mx)    // 3 per 2 elements                    @done`,
    cpp: `
pair<int,int> minMax(const vector<int>& a) {
    int n = a.size(), i, mn, mx;
    if (n % 2) { mn = mx = a[0]; i = 1; }                         // @init
    else { mn = min(a[0], a[1]); mx = max(a[0], a[1]); i = 2; }   // @init
    for (; i + 1 < n; i += 2) {
        int x = a[i], y = a[i + 1];
        if (x > y) swap(x, y);                                    // @pair
        if (y > mx) mx = y;                                       // @max
        if (x < mn) mn = x;                                       // @min
    }
    return {mn, mx};                                              // @done
}`,
    java: `
static int[] minMax(int[] a) {
    int n = a.length, i, mn, mx;
    if (n % 2 == 1) { mn = mx = a[0]; i = 1; }                    // @init
    else { mn = Math.min(a[0], a[1]); mx = Math.max(a[0], a[1]); i = 2; }   // @init
    for (; i + 1 < n; i += 2) {
        int x = a[i], y = a[i + 1];
        if (x > y) { int t = x; x = y; y = t; }                   // @pair
        if (y > mx) mx = y;                                       // @max
        if (x < mn) mn = x;                                       // @min
    }
    return new int[]{mn, mx};                                     // @done
}`,
    python: `
def min_max(a):
    n = len(a)
    if n % 2:                                   # @init
        mn = mx = a[0]; i = 1
    else:
        mn, mx = min(a[0], a[1]), max(a[0], a[1]); i = 2
    while i + 1 < n:
        x, y = a[i], a[i + 1]
        if x > y: x, y = y, x                   # @pair
        if y > mx: mx = y                       # @max
        if x < mn: mn = x                       # @min
        i += 2
    return mn, mx                               # @done`,
    js: `
function minMax(a) {
  const n = a.length; let i, mn, mx;
  if (n % 2) { mn = mx = a[0]; i = 1; }                           // @init
  else { mn = Math.min(a[0], a[1]); mx = Math.max(a[0], a[1]); i = 2; }   // @init
  for (; i + 1 < n; i += 2) {
    let x = a[i], y = a[i + 1];
    if (x > y) [x, y] = [y, x];                                   // @pair
    if (y > mx) mx = y;                                           // @max
    if (x < mn) mn = x;                                           // @min
  }
  return [mn, mx];                                                // @done
}`,
    c: `
void min_max(const int *a, int n, int *pmn, int *pmx) {
    int i, mn, mx;
    if (n % 2) { mn = mx = a[0]; i = 1; }                         // @init
    else { mn = a[0] < a[1] ? a[0] : a[1]; mx = a[0] < a[1] ? a[1] : a[0]; i = 2; }   // @init
    for (; i + 1 < n; i += 2) {
        int x = a[i], y = a[i + 1];
        if (x > y) { int t = x; x = y; y = t; }                   // @pair
        if (y > mx) mx = y;                                       // @max
        if (x < mn) mn = x;                                       // @min
    }
    *pmn = mn; *pmx = mx;                                         // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const a = arr as number[]
      const n = a.length
      if (n < 2) throw new Error('Give at least two numbers.')
      const A = t.array('a', a, { label: 'a' })
      // adversary bookkeeping: N = never compared, W = has only won, L = has only lost, X = both (out of the running)
      const st = t.array('st', Array(n).fill('N'), { label: 'status: N never compared · W only won · L only lost · X both' })
      const status: string[] = Array(n).fill('N')
      const units = t.meter('units', 'Information units gained', [{ label: '2n − 2 needed', value: 2 * n - 2 }])
      const cmps = t.meter('cmp', 'Comparisons', [
        { label: '⌈3n/2⌉ − 2', value: Math.ceil((3 * n) / 2) - 2 },
        { label: '2n − 2 (naive)', value: 2 * n - 2 },
      ])
      const value = (s: string) => (s === 'N' ? 2 : s === 'X' ? 0 : 1) // units still to be "spent" learning about this element
      const record = (win: number, lose: number) => {
        const before = value(status[win]) + value(status[lose])
        status[win] = status[win] === 'N' ? 'W' : status[win] === 'L' ? 'X' : status[win]
        status[lose] = status[lose] === 'N' ? 'L' : status[lose] === 'W' ? 'X' : status[lose]
        const gained = before - value(status[win]) - value(status[lose])
        st.set(win, status[win])
        st.set(lose, status[lose])
        units.add(gained)
        cmps.add(1)
        return gained
      }
      let mxI: number
      let mnI: number
      let i: number
      const paint = () => {
        A.clear()
        st.clear()
        for (let k = 0; k < n; k++) if (status[k] === 'X') { A.role(k, 'dim'); st.role(k, 'dim') }
        A.role(mxI, 'best').role(mnI, 'pivot')
        A.ptr('max', mxI).ptr('min', mnI)
      }
      if (n % 2) {
        mxI = mnI = 0
        i = 1
        paint()
        t.step('init', `n = ${n} is odd: a[0] = ${a[0]} starts as both min and max, free of charge. To be sure of the answer, every element except the max must have lost once and every element except the min must have won once: 2n − 2 = ${2 * n - 2} "units" of information.`, { min: a[0], max: a[0] })
      } else {
        const g = record(a[0] >= a[1] ? 0 : 1, a[0] >= a[1] ? 1 : 0)
        mxI = a[0] >= a[1] ? 0 : 1
        mnI = 1 - mxI
        i = 2
        paint()
        A.role(0, 'compare').role(1, 'compare')
        t.step('init', `Compare the first pair: ${a[mxI]} > ${a[mnI]}. Two never-compared elements: this comparison yields ${g} units (one win, one loss). We need 2n − 2 = ${2 * n - 2} units in total.`, { min: a[mnI], max: a[mxI] })
      }
      while (i + 1 < n) {
        const big = a[i] >= a[i + 1] ? i : i + 1
        const small = big === i ? i + 1 : i
        const g = record(big, small)
        paint()
        A.role(i, 'compare').role(i + 1, 'compare')
        t.step('pair', `Pair (${a[i]}, ${a[i + 1]}): ${a[big]} wins. Both were fresh (N), so this one comparison earns ${g} units — the only kind of comparison that earns 2.`, { min: a[mnI], max: a[mxI] })
        const gm = record(a[big] > a[mxI] ? big : mxI, a[big] > a[mxI] ? mxI : big)
        if (a[big] > a[mxI]) mxI = big
        paint()
        A.role(big, 'compare')
        t.step('max', `Winner ${a[big]} vs max: max is now ${a[mxI]}. Only ${gm} unit — the loser of the pair (${a[small]}) can never be the max, so it never meets the max.`, { min: a[mnI], max: a[mxI] })
        const gn = record(a[small] < a[mnI] ? mnI : small, a[small] < a[mnI] ? small : mnI)
        if (a[small] < a[mnI]) mnI = small
        paint()
        A.role(small, 'compare')
        t.step('min', `Loser ${a[small]} vs min: min is now ${a[mnI]}. ${gn} unit. Three comparisons for two new elements.`, { min: a[mnI], max: a[mxI] })
        i += 2
      }
      paint()
      units.role = 'done'
      cmps.role = 'done'
      const lb = Math.ceil((3 * n) / 2) - 2
      t.step('done', `min = ${a[mnI]}, max = ${a[mxI]} with ${cmps.value} comparisons. The adversary argument: a comparison of two fresh (N) elements earns at most 2 units, any other at most 1 (the adversary answers to keep W's winning and L's losing). At most ⌊n/2⌋ comparisons can be N-vs-N, earning ≤ 2⌊n/2⌋ ≈ n units; the remaining ≈ n − 2 units cost one comparison each. Total ≥ ${lb} for n = ${n} — this algorithm is optimal.`, { min: a[mnI], max: a[mxI] })
    }),
}

export const algorithms3: Algorithm[] = [cxQuicksort, cxQuickPairs, cxDecisionTree, cxMinMax]
