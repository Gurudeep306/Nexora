import { trace } from '../engine/tracer'
import type { Algorithm } from '../engine/types'
import { list, rarr, rint, sorted } from './util'

/* ───────────────────────── 9. Prefix sums: build + range query ───────────────────────── */

export const arrPrefix: Algorithm = {
  id: 'arr-prefix',
  title: 'Prefix sums — build once, answer any range sum in O(1)',
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '3 1 4 1 5 9 2 6', maxLen: 10 },
    { name: 'l', label: 'l', type: 'number', default: '2', min: 0 },
    { name: 'r', label: 'r', type: 'number', default: '5', min: 0 },
  ],
  random: () => {
    const a = rarr(rint(6, 9), 1, 9)
    const l = rint(0, a.length - 2)
    return { arr: list(a), l: String(l), r: String(rint(l, a.length - 1)) }
  },
  code: {
    pseudo: `
// P[i] = arr[0] + … + arr[i − 1]   (P has n + 1 entries)
function buildPrefix(arr, n)
  P[0] ← 0                              // @p0
  for i ← 0 to n − 1                    // @loop
    P[i + 1] ← P[i] + arr[i]            // @build
  return P
function rangeSum(P, l, r)              // sum of arr[l..r]
  return P[r + 1] − P[l]                // @query`,
    cpp: `
vector<long long> buildPrefix(const vector<int>& arr) {
    vector<long long> P(arr.size() + 1, 0);    // @p0
    for (size_t i = 0; i < arr.size(); i++)    // @loop
        P[i + 1] = P[i] + arr[i];              // @build
    return P;
}
long long rangeSum(const vector<long long>& P, int l, int r) {
    return P[r + 1] - P[l];                    // @query
}`,
    java: `
static long[] buildPrefix(int[] arr) {
    long[] P = new long[arr.length + 1];       // @p0
    for (int i = 0; i < arr.length; i++)       // @loop
        P[i + 1] = P[i] + arr[i];              // @build
    return P;
}
static long rangeSum(long[] P, int l, int r) {
    return P[r + 1] - P[l];                    // @query
}`,
    python: `
def build_prefix(arr):
    P = [0] * (len(arr) + 1)          # @p0
    for i in range(len(arr)):         # @loop
        P[i + 1] = P[i] + arr[i]      # @build
    return P

def range_sum(P, l, r):
    return P[r + 1] - P[l]            # @query
# itertools.accumulate(arr, initial=0) builds P too`,
    js: `
function buildPrefix(arr) {
  const P = new Array(arr.length + 1).fill(0);   // @p0
  for (let i = 0; i < arr.length; i++)           // @loop
    P[i + 1] = P[i] + arr[i];                    // @build
  return P;
}
const rangeSum = (P, l, r) => P[r + 1] - P[l];   // @query`,
    c: `
void build_prefix(const int *arr, int n, long long *P) {
    P[0] = 0;                                   // @p0
    for (int i = 0; i < n; i++)                 // @loop
        P[i + 1] = P[i] + arr[i];               // @build
}
long long range_sum(const long long *P, int l, int r) {
    return P[r + 1] - P[l];                     // @query
}`,
  },
  run: ({ arr, l, r }) =>
    trace((t) => {
      const v = arr as number[]
      const L = l as number
      const R = r as number
      if (L > R || R >= v.length) throw new Error(`Need 0 ≤ l ≤ r ≤ ${v.length - 1}.`)
      const a = t.array('arr', v, { label: 'arr' })
      const P = t.array('P', [0], { label: 'P (prefix sums)', capacity: v.length + 1 })
      P.role(0, 'write')
      t.step('p0', 'P[0] = 0: the sum of zero elements. P[i] will hold the sum of the first i elements.', { i: 0 })
      let s = 0
      for (let i = 0; i < v.length; i++) {
        a.clear().ptr('i', i).role(i, 'active').range([{ from: 0, to: i, role: 'window', label: `first ${i + 1}` }])
        P.clear().role(i, 'compare')
        t.step('loop', `i = ${i}.`, { i, 'P[i]': s })
        s += v[i]
        P.push(s)
        P.clear().role(i + 1, 'write').arrow(i, i + 1, `+${v[i]}`)
        t.step('build', `P[${i + 1}] = P[${i}] + arr[${i}] = ${s - v[i]} + ${v[i]} = ${s}. Each entry reuses the previous one, so building is O(n).`, { i, 'P[i+1]': s })
      }
      a.clear().ptr('i', null).range([{ from: L, to: R, role: 'best', label: `arr[${L}..${R}]` }])
      P.clear().role(R + 1, 'active').role(L, 'compare').ptr('r+1', R + 1).ptr('l', L)
      const ans = v.slice(L, R + 1).reduce((x, y) => x + y, 0)
      t.step('query', `sum(arr[${L}..${R}]) = P[${R + 1}] − P[${L}] = ${P.get(R + 1)} − ${P.get(L)} = ${ans}. P[${R + 1}] counts the first ${R + 1} elements; subtracting P[${L}] removes the first ${L}. One subtraction per query — O(1).`, { l: L, r: R, answer: ans })
    }),
}

/* ───────────────────────── 10. Two pointers: pair with sum in a sorted array ───────────────────────── */

export const arrTwoSum: Algorithm = {
  id: 'arr-two-sum-sorted',
  title: 'Two pointers — a pair with a given sum (sorted array)',
  inputs: [
    { name: 'arr', label: 'Sorted array', type: 'array', default: '1 3 4 6 8 11 14', maxLen: 12 },
    { name: 'target', label: 'Target', type: 'number', default: '17' },
  ],
  random: () => {
    const a = sorted(rarr(rint(6, 10), 1, 30))
    return { arr: list(a), target: String(a[rint(0, 2)] + a[rint(a.length - 3, a.length - 1)]) }
  },
  code: {
    pseudo: `
function pairSum(arr, n, target)       // arr sorted ascending
  lo ← 0; hi ← n − 1                   // @init
  while lo < hi                        // @loop
    s ← arr[lo] + arr[hi]              // @sum
    if s = target then return (lo, hi) // @found
    else if s < target then lo ← lo + 1   // @inc
    else hi ← hi − 1                   // @dec
  return none                          // @miss`,
    cpp: `
pair<int,int> pairSum(const vector<int>& a, int target) {
    int lo = 0, hi = (int)a.size() - 1;         // @init
    while (lo < hi) {                           // @loop
        int s = a[lo] + a[hi];                  // @sum
        if (s == target) return {lo, hi};       // @found
        else if (s < target) lo++;              // @inc
        else hi--;                              // @dec
    }
    return {-1, -1};                            // @miss
}`,
    java: `
static int[] pairSum(int[] a, int target) {
    int lo = 0, hi = a.length - 1;              // @init
    while (lo < hi) {                           // @loop
        int s = a[lo] + a[hi];                  // @sum
        if (s == target) return new int[]{lo, hi};   // @found
        else if (s < target) lo++;              // @inc
        else hi--;                              // @dec
    }
    return null;                                // @miss
}`,
    python: `
def pair_sum(a, target):
    lo, hi = 0, len(a) - 1            # @init
    while lo < hi:                    # @loop
        s = a[lo] + a[hi]             # @sum
        if s == target:               # @found
            return lo, hi             # @found
        elif s < target:              # @inc
            lo += 1                   # @inc
        else:
            hi -= 1                   # @dec
    return None                       # @miss`,
    js: `
function pairSum(a, target) {
  let lo = 0, hi = a.length - 1;              // @init
  while (lo < hi) {                           // @loop
    const s = a[lo] + a[hi];                  // @sum
    if (s === target) return [lo, hi];        // @found
    else if (s < target) lo++;                // @inc
    else hi--;                                // @dec
  }
  return null;                                // @miss
}`,
    c: `
int pair_sum(const int *a, int n, int target, int *i, int *j) {
    int lo = 0, hi = n - 1;                     // @init
    while (lo < hi) {                           // @loop
        int s = a[lo] + a[hi];                  // @sum
        if (s == target) { *i = lo; *j = hi; return 1; }   // @found
        else if (s < target) lo++;              // @inc
        else hi--;                              // @dec
    }
    return 0;                                   // @miss
}`,
  },
  run: ({ arr, target }) =>
    trace((t) => {
      const v = arr as number[]
      for (let i = 1; i < v.length; i++) if (v[i] < v[i - 1]) throw new Error('The array must be sorted in ascending order.')
      const T = target as number
      const a = t.array('arr', v, { label: 'arr (sorted)' })
      let lo = 0
      let hi = v.length - 1
      a.ptr('lo', lo).ptr('hi', hi)
      t.step('init', `Target ${T}. Start with the smallest (lo) and the largest (hi) element.`, { lo, hi, target: T })
      while (lo < hi) {
        a.clear().ptr('lo', lo).ptr('hi', hi)
        for (let d = 0; d < lo; d++) a.role(d, 'dim')
        for (let d = hi + 1; d < v.length; d++) a.role(d, 'dim')
        t.step('loop', `lo = ${lo}, hi = ${hi}.`, { lo, hi, target: T })
        const s = v[lo] + v[hi]
        a.role(lo, 'compare').role(hi, 'compare')
        t.step('sum', `arr[lo] + arr[hi] = ${v[lo]} + ${v[hi]} = ${s}.`, { lo, hi, s, target: T })
        if (s === T) {
          a.role(lo, 'found').role(hi, 'found')
          t.step('found', `${s} = ${T}: found the pair (${v[lo]}, ${v[hi]}) at indices ${lo} and ${hi}.`, { lo, hi, s, target: T })
          return
        }
        if (s < T) {
          a.role(lo, 'dim')
          lo++
          a.ptr('lo', lo)
          t.step('inc', `${s} < ${T}: the sum is too small. arr[lo] paired with the largest remaining value is still too small, so arr[lo] can't be in any answer — drop it (lo++).`, { lo, hi, s, target: T })
        } else {
          a.role(hi, 'dim')
          hi--
          a.ptr('hi', hi)
          t.step('dec', `${s} > ${T}: too big. arr[hi] with even the smallest remaining value overshoots, so drop it (hi--).`, { lo, hi, s, target: T })
        }
      }
      a.clear()
      t.step('miss', `The pointers met: no pair sums to ${T}. Each step discards one element, so at most n − 1 steps → O(n), versus O(n²) for checking every pair.`, { lo, hi, target: T })
    }),
}

/* ───────────────────────── 11. Remove duplicates from a sorted array (in place) ───────────────────────── */

export const arrDedupe: Algorithm = {
  id: 'arr-dedupe',
  title: 'Remove duplicates in place — a read pointer and a write pointer',
  inputs: [{ name: 'arr', label: 'Sorted array', type: 'array', default: '1 1 2 3 3 3 5 8 8', maxLen: 12 }],
  random: () => ({ arr: list(sorted(rarr(rint(7, 11), 1, 7))) }),
  code: {
    pseudo: `
function dedupe(arr, n)                // arr sorted
  if n = 0 then return 0
  w ← 1                                // @init
  for r ← 1 to n − 1                   // @loop
    if arr[r] ≠ arr[w − 1] then        // @cmp
      arr[w] ← arr[r]                  // @write
      w ← w + 1                        // @write
  return w                             // @done`,
    cpp: `
int dedupe(vector<int>& a) {
    if (a.empty()) return 0;
    int w = 1;                                    // @init
    for (int r = 1; r < (int)a.size(); r++)       // @loop
        if (a[r] != a[w - 1])                     // @cmp
            a[w++] = a[r];                        // @write
    return w;                                     // @done
}   // std::unique(a.begin(), a.end()) does the same`,
    java: `
static int dedupe(int[] a) {
    if (a.length == 0) return 0;
    int w = 1;                                    // @init
    for (int r = 1; r < a.length; r++)            // @loop
        if (a[r] != a[w - 1])                     // @cmp
            a[w++] = a[r];                        // @write
    return w;                                     // @done
}`,
    python: `
def dedupe(a):
    if not a:
        return 0
    w = 1                         # @init
    for r in range(1, len(a)):    # @loop
        if a[r] != a[w - 1]:      # @cmp
            a[w] = a[r]           # @write
            w += 1                # @write
    return w                      # @done`,
    js: `
function dedupe(a) {
  if (a.length === 0) return 0;
  let w = 1;                                  // @init
  for (let r = 1; r < a.length; r++)          // @loop
    if (a[r] !== a[w - 1])                    // @cmp
      a[w++] = a[r];                          // @write
  return w;                                   // @done
}`,
    c: `
int dedupe(int *a, int n) {
    if (n == 0) return 0;
    int w = 1;                                    // @init
    for (int r = 1; r < n; r++)                   // @loop
        if (a[r] != a[w - 1])                     // @cmp
            a[w++] = a[r];                        // @write
    return w;                                     // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      for (let i = 1; i < v.length; i++) if (v[i] < v[i - 1]) throw new Error('The array must be sorted.')
      if (!v.length) throw new Error('Give at least one value.')
      const a = t.array('arr', v, { label: 'arr' })
      let w = 1
      a.ptr('w', w).range([{ from: 0, to: 0, role: 'done', label: 'kept' }])
      t.step('init', 'arr[0] is always kept. w marks where the next unique value will be written; r reads ahead.', { w })
      for (let r = 1; r < v.length; r++) {
        a.clear().ptr('w', w).ptr('r', r).range([{ from: 0, to: w - 1, role: 'done', label: 'kept' }])
        a.role(r, 'active')
        t.step('loop', `r = ${r}.`, { w, r })
        a.role(r, 'compare').role(w - 1, 'compare')
        const same = a.get(r) === a.get(w - 1)
        t.step('cmp', `Is arr[r] = ${a.get(r)} different from the last kept value arr[w−1] = ${a.get(w - 1)}? ${same ? 'No — a duplicate, skip it.' : 'Yes — keep it.'}`, { w, r })
        if (!same) {
          a.set(w, a.get(r) as number)
          a.clear().role(w, 'write').ptr('w', w).ptr('r', r).arrow(r, w, 'copy')
          w++
          a.range([{ from: 0, to: w - 1, role: 'done', label: 'kept' }])
          t.step('write', `Copy it to arr[${w - 1}] and advance w to ${w}.`, { w, r })
        }
      }
      a.clear().ptr('r', null).range([{ from: 0, to: w - 1, role: 'done', label: `${w} unique` }])
      for (let d = w; d < v.length; d++) a.role(d, 'dim')
      t.step('done', `The first ${w} slots hold the unique values in order; the rest is leftover. One pass, O(n) time, O(1) space.`, { w })
    }),
}

/* ───────────────────────── 12. Move zeroes to the end (stable) ───────────────────────── */

export const arrMoveZeroes: Algorithm = {
  id: 'arr-move-zeroes',
  title: 'Move all zeroes to the end, keeping the order of the rest',
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '0 4 0 3 12 0 7', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(6, 10), 0, 6).map((x) => (x < 3 ? 0 : x))) }),
  code: {
    pseudo: `
function moveZeroes(arr, n)
  w ← 0                                // @init
  for r ← 0 to n − 1                   // @loop
    if arr[r] ≠ 0 then                 // @cmp
      swap arr[w], arr[r]              // @swap
      w ← w + 1                        // @swap`,
    cpp: `
void moveZeroes(vector<int>& a) {
    int w = 0;                                    // @init
    for (int r = 0; r < (int)a.size(); r++)       // @loop
        if (a[r] != 0)                            // @cmp
            swap(a[w++], a[r]);                   // @swap
}`,
    java: `
static void moveZeroes(int[] a) {
    int w = 0;                                    // @init
    for (int r = 0; r < a.length; r++)            // @loop
        if (a[r] != 0) {                          // @cmp
            int t = a[w]; a[w] = a[r]; a[r] = t;  // @swap
            w++;                                  // @swap
        }
}`,
    python: `
def move_zeroes(a):
    w = 0                             # @init
    for r in range(len(a)):           # @loop
        if a[r] != 0:                 # @cmp
            a[w], a[r] = a[r], a[w]   # @swap
            w += 1                    # @swap`,
    js: `
function moveZeroes(a) {
  let w = 0;                                  // @init
  for (let r = 0; r < a.length; r++)          // @loop
    if (a[r] !== 0) {                         // @cmp
      [a[w], a[r]] = [a[r], a[w]];            // @swap
      w++;                                    // @swap
    }
}`,
    c: `
void move_zeroes(int *a, int n) {
    int w = 0;                                    // @init
    for (int r = 0; r < n; r++)                   // @loop
        if (a[r] != 0) {                          // @cmp
            int t = a[w]; a[w] = a[r]; a[r] = t;  // @swap
            w++;                                  // @swap
        }
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const a = t.array('arr', v, { label: 'arr' })
      let w = 0
      a.ptr('w', 0)
      t.step('init', 'w is the next slot for a non-zero value. Everything left of w is already final.', { w })
      for (let r = 0; r < v.length; r++) {
        a.clear().ptr('w', w).ptr('r', r).range(w > 0 ? [{ from: 0, to: w - 1, role: 'done', label: 'placed' }] : [])
        a.role(r, 'active')
        t.step('loop', `r = ${r}.`, { w, r })
        const nz = a.get(r) !== 0
        a.role(r, 'compare')
        t.step('cmp', `arr[${r}] = ${a.get(r)} ${nz ? 'is non-zero: bring it to position w.' : 'is zero: leave it for now, it will drift right.'}`, { w, r })
        if (nz) {
          a.role(w, 'swap').role(r, 'swap')
          a.swap(w, r)
          a.arrow(w, r, undefined, 'swap').arrow(r, w, undefined, 'swap')
          w++
          a.ptr('w', w).range([{ from: 0, to: w - 1, role: 'done', label: 'placed' }])
          t.step('swap', w - 1 === r ? `w = r, so the swap does nothing; advance w to ${w}.` : `Swap arr[${w - 1}] and arr[${r}], advance w to ${w}.`, { w, r })
        }
      }
      a.clear().ptr('r', null).range([{ from: 0, to: w - 1, role: 'done', label: 'non-zero, in order' }])
      t.step('swap', `Done: ${w} non-zero values in their original order, zeroes at the end. One pass, O(n), O(1) space.`, { w })
    }),
}

/* ───────────────────────── 13. Sliding window: fixed size k ───────────────────────── */

export const arrWindowFixed: Algorithm = {
  id: 'arr-window-fixed',
  title: 'Sliding window — maximum sum of k consecutive elements',
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '2 1 5 1 3 2 7 1', maxLen: 12 },
    { name: 'k', label: 'k', type: 'number', default: '3', min: 1 },
  ],
  random: () => ({ arr: list(rarr(rint(7, 11), 1, 9)), k: String(rint(2, 4)) }),
  code: {
    pseudo: `
function maxWindowSum(arr, n, k)
  s ← arr[0] + … + arr[k − 1]          // @first
  best ← s                             // @first
  for i ← k to n − 1                   // @loop
    s ← s + arr[i] − arr[i − k]        // @slide
    best ← max(best, s)                // @best
  return best                          // @done`,
    cpp: `
long long maxWindowSum(const vector<int>& a, int k) {
    long long s = 0;
    for (int i = 0; i < k; i++) s += a[i];         // @first
    long long best = s;                            // @first
    for (int i = k; i < (int)a.size(); i++) {      // @loop
        s += a[i] - a[i - k];                      // @slide
        best = max(best, s);                       // @best
    }
    return best;                                   // @done
}`,
    java: `
static long maxWindowSum(int[] a, int k) {
    long s = 0;
    for (int i = 0; i < k; i++) s += a[i];         // @first
    long best = s;                                 // @first
    for (int i = k; i < a.length; i++) {           // @loop
        s += a[i] - a[i - k];                      // @slide
        best = Math.max(best, s);                  // @best
    }
    return best;                                   // @done
}`,
    python: `
def max_window_sum(a, k):
    s = sum(a[:k])                    # @first
    best = s                          # @first
    for i in range(k, len(a)):        # @loop
        s += a[i] - a[i - k]          # @slide
        best = max(best, s)           # @best
    return best                       # @done`,
    js: `
function maxWindowSum(a, k) {
  let s = 0;
  for (let i = 0; i < k; i++) s += a[i];           // @first
  let best = s;                                    // @first
  for (let i = k; i < a.length; i++) {             // @loop
    s += a[i] - a[i - k];                          // @slide
    best = Math.max(best, s);                      // @best
  }
  return best;                                     // @done
}`,
    c: `
long long max_window_sum(const int *a, int n, int k) {
    long long s = 0;
    for (int i = 0; i < k; i++) s += a[i];         // @first
    long long best = s;                            // @first
    for (int i = k; i < n; i++) {                  // @loop
        s += a[i] - a[i - k];                      // @slide
        if (s > best) best = s;                    // @best
    }
    return best;                                   // @done
}`,
  },
  run: ({ arr, k }) =>
    trace((t) => {
      const v = arr as number[]
      const K = k as number
      if (K > v.length) throw new Error(`k must be at most ${v.length}.`)
      const a = t.array('arr', v, { label: 'arr' })
      let s = v.slice(0, K).reduce((x, y) => x + y, 0)
      let best = s
      let bl = 0
      a.range([{ from: 0, to: K - 1, role: 'window', label: `window = ${s}` }])
      t.step('first', `Sum the first window, indices 0…${K - 1}: ${s}. That is the best so far.`, { s, best, k: K })
      for (let i = K; i < v.length; i++) {
        a.clear().range([{ from: i - K, to: i - 1, role: 'window', label: `window = ${s}` }]).role(i, 'new').role(i - K, 'removed')
        t.step('loop', `Slide right: ${v[i]} (index ${i}) comes in, ${v[i - K]} (index ${i - K}) leaves.`, { i, s, best, k: K })
        s += v[i] - v[i - K]
        a.clear().range([{ from: i - K + 1, to: i, role: 'window', label: `window = ${s}` }])
        t.step('slide', `Instead of re-adding k numbers, adjust: s = s + ${v[i]} − ${v[i - K]} = ${s}. Two operations per move, whatever k is.`, { i, s, best, k: K })
        if (s > best) {
          best = s
          bl = i - K + 1
        }
        t.step('best', `best = max(best, ${s}) = ${best}.`, { i, s, best, k: K })
      }
      a.clear().range([{ from: bl, to: bl + K - 1, role: 'best', label: `best = ${best}` }])
      t.step('done', `The best window is indices ${bl}…${bl + K - 1} with sum ${best}. O(n) instead of O(n·k).`, { best, k: K })
    }),
}

/* ───────────────────────── 14. Sliding window: variable size ───────────────────────── */

export const arrWindowVar: Algorithm = {
  id: 'arr-window-var',
  title: 'Variable window — shortest subarray with sum ≥ S (positive numbers)',
  inputs: [
    { name: 'arr', label: 'Array (positive)', type: 'array', default: '2 3 1 2 4 3', maxLen: 12, min: 1 },
    { name: 'S', label: 'S', type: 'number', default: '7', min: 1 },
  ],
  random: () => ({ arr: list(rarr(rint(7, 11), 1, 8)), S: String(rint(8, 16)) }),
  code: {
    pseudo: `
function shortestAtLeast(arr, n, S)
  lo ← 0; sum ← 0; best ← ∞            // @init
  for hi ← 0 to n − 1                  // @grow
    sum ← sum + arr[hi]                // @grow
    while sum ≥ S                      // @check
      best ← min(best, hi − lo + 1)    // @record
      sum ← sum − arr[lo]              // @shrink
      lo ← lo + 1                      // @shrink
  return best = ∞ ? 0 : best           // @done`,
    cpp: `
int shortestAtLeast(const vector<int>& a, long long S) {
    int lo = 0, best = INT_MAX; long long sum = 0;   // @init
    for (int hi = 0; hi < (int)a.size(); hi++) {     // @grow
        sum += a[hi];                                // @grow
        while (sum >= S) {                           // @check
            best = min(best, hi - lo + 1);           // @record
            sum -= a[lo++];                          // @shrink
        }
    }
    return best == INT_MAX ? 0 : best;               // @done
}`,
    java: `
static int shortestAtLeast(int[] a, long S) {
    int lo = 0, best = Integer.MAX_VALUE; long sum = 0;   // @init
    for (int hi = 0; hi < a.length; hi++) {               // @grow
        sum += a[hi];                                     // @grow
        while (sum >= S) {                                // @check
            best = Math.min(best, hi - lo + 1);           // @record
            sum -= a[lo++];                               // @shrink
        }
    }
    return best == Integer.MAX_VALUE ? 0 : best;          // @done
}`,
    python: `
def shortest_at_least(a, S):
    lo, total, best = 0, 0, float('inf')   # @init
    for hi in range(len(a)):               # @grow
        total += a[hi]                     # @grow
        while total >= S:                  # @check
            best = min(best, hi - lo + 1)  # @record
            total -= a[lo]                 # @shrink
            lo += 1                        # @shrink
    return 0 if best == float('inf') else best   # @done`,
    js: `
function shortestAtLeast(a, S) {
  let lo = 0, sum = 0, best = Infinity;        // @init
  for (let hi = 0; hi < a.length; hi++) {      // @grow
    sum += a[hi];                              // @grow
    while (sum >= S) {                         // @check
      best = Math.min(best, hi - lo + 1);      // @record
      sum -= a[lo++];                          // @shrink
    }
  }
  return best === Infinity ? 0 : best;         // @done
}`,
    c: `
int shortest_at_least(const int *a, int n, long long S) {
    int lo = 0, best = n + 1; long long sum = 0;     // @init
    for (int hi = 0; hi < n; hi++) {                 // @grow
        sum += a[hi];                                // @grow
        while (sum >= S) {                           // @check
            if (hi - lo + 1 < best) best = hi - lo + 1;   // @record
            sum -= a[lo++];                          // @shrink
        }
    }
    return best == n + 1 ? 0 : best;                 // @done
}`,
  },
  run: ({ arr, S }) =>
    trace((t) => {
      const v = arr as number[]
      const T = S as number
      const a = t.array('arr', v, { label: 'arr' })
      let lo = 0
      let sum = 0
      let best = Infinity
      let bl = -1
      t.step('init', `Find the shortest stretch whose sum reaches ${T}. The window [lo, hi] grows on the right and shrinks on the left.`, { lo, sum, best: '∞', S: T })
      const show = (hi: number) => {
        a.clear().ptr('lo', lo).ptr('hi', hi)
        a.range(lo <= hi ? [{ from: lo, to: hi, role: 'window', label: `sum = ${sum}` }] : [])
      }
      for (let hi = 0; hi < v.length; hi++) {
        sum += v[hi]
        show(hi)
        a.role(hi, 'new')
        t.step('grow', `Extend right: add arr[${hi}] = ${v[hi]} → sum = ${sum}.`, { lo, hi, sum, best: best === Infinity ? '∞' : best, S: T })
        while (sum >= T) {
          show(hi)
          t.step('check', `sum ${sum} ≥ ${T}: this window works. Record it, then try to make it shorter.`, { lo, hi, sum, best: best === Infinity ? '∞' : best, S: T })
          if (hi - lo + 1 < best) {
            best = hi - lo + 1
            bl = lo
          }
          t.step('record', `Length ${hi - lo + 1}; best = ${best}.`, { lo, hi, sum, best, S: T })
          a.role(lo, 'removed')
          sum -= v[lo]
          lo++
          t.step('shrink', `Drop arr[${lo - 1}] = ${v[lo - 1]} from the left → sum = ${sum}, lo = ${lo}.`, { lo, hi, sum, best, S: T })
        }
      }
      a.clear().ptr('lo', null).ptr('hi', null)
      if (bl >= 0) a.range([{ from: bl, to: bl + best - 1, role: 'best', label: `shortest: ${best}` }])
      t.step('done', best === Infinity ? `No window reaches ${T}: answer 0.` : `Shortest length is ${best}. Each index enters once and leaves once, so the whole scan is O(n) even with the inner while.`, { best: best === Infinity ? 0 : best, S: T })
    }),
}

/* ───────────────────────── 15. Kadane's algorithm ───────────────────────── */

export const arrKadane: Algorithm = {
  id: 'arr-kadane',
  title: "Kadane's algorithm — maximum subarray sum",
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '-2 1 -3 4 -1 2 1 -5 4', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(7, 11), -9, 9)) }),
  code: {
    pseudo: `
function maxSubarray(arr, n)
  cur ← arr[0]; best ← arr[0]           // @init
  for i ← 1 to n − 1                    // @loop
    cur ← max(arr[i], cur + arr[i])     // @extend
    best ← max(best, cur)               // @best
  return best                           // @done`,
    cpp: `
long long maxSubarray(const vector<int>& a) {
    long long cur = a[0], best = a[0];            // @init
    for (size_t i = 1; i < a.size(); i++) {       // @loop
        cur = max<long long>(a[i], cur + a[i]);   // @extend
        best = max(best, cur);                    // @best
    }
    return best;                                  // @done
}`,
    java: `
static long maxSubarray(int[] a) {
    long cur = a[0], best = a[0];                 // @init
    for (int i = 1; i < a.length; i++) {          // @loop
        cur = Math.max(a[i], cur + a[i]);         // @extend
        best = Math.max(best, cur);               // @best
    }
    return best;                                  // @done
}`,
    python: `
def max_subarray(a):
    cur = best = a[0]                 # @init
    for x in a[1:]:                   # @loop
        cur = max(x, cur + x)         # @extend
        best = max(best, cur)         # @best
    return best                       # @done`,
    js: `
function maxSubarray(a) {
  let cur = a[0], best = a[0];                  // @init
  for (let i = 1; i < a.length; i++) {          // @loop
    cur = Math.max(a[i], cur + a[i]);           // @extend
    best = Math.max(best, cur);                 // @best
  }
  return best;                                  // @done
}`,
    c: `
long long max_subarray(const int *a, int n) {
    long long cur = a[0], best = a[0];            // @init
    for (int i = 1; i < n; i++) {                 // @loop
        cur = (cur + a[i] > a[i]) ? cur + a[i] : a[i];   // @extend
        if (cur > best) best = cur;               // @best
    }
    return best;                                  // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      if (!v.length) throw new Error('Give at least one value.')
      const a = t.array('arr', v, { label: 'arr' })
      let cur = v[0]
      let best = v[0]
      let cs = 0
      let bs = 0
      let be = 0
      a.range([{ from: 0, to: 0, role: 'window', label: `cur = ${cur}` }])
      t.step('init', 'cur is the best sum of a subarray that ends exactly here; best is the best seen anywhere. Both start at arr[0].', { cur, best })
      for (let i = 1; i < v.length; i++) {
        a.clear().ptr('i', i).role(i, 'active')
        a.range([{ from: cs, to: i - 1, role: 'window', label: `cur = ${cur}` }, { from: bs, to: be, role: 'best', label: `best = ${best}` }])
        t.step('loop', `i = ${i}, arr[i] = ${v[i]}.`, { i, cur, best })
        const ext = cur + v[i]
        if (v[i] > ext) {
          cur = v[i]
          cs = i
          a.range([{ from: cs, to: i, role: 'window', label: `cur = ${cur}` }, { from: bs, to: be, role: 'best', label: `best = ${best}` }])
          t.step('extend', `Extending gives ${ext}, starting fresh at ${v[i]} is better — the old run (sum ${ext - v[i]}) only drags us down. Start a new subarray here.`, { i, cur, best })
        } else {
          cur = ext
          a.range([{ from: cs, to: i, role: 'window', label: `cur = ${cur}` }, { from: bs, to: be, role: 'best', label: `best = ${best}` }])
          t.step('extend', `Extend the current run: ${cur - v[i]} + ${v[i]} = ${cur} (≥ ${v[i]} alone).`, { i, cur, best })
        }
        if (cur > best) {
          best = cur
          bs = cs
          be = i
        }
        a.range([{ from: cs, to: i, role: 'window', label: `cur = ${cur}` }, { from: bs, to: be, role: 'best', label: `best = ${best}` }])
        t.step('best', `best = max(best, cur) = ${best}.`, { i, cur, best })
      }
      a.clear().ptr('i', null).range([{ from: bs, to: be, role: 'best', label: `max = ${best}` }])
      t.step('done', `Maximum subarray: indices ${bs}…${be}, sum ${best}. One pass, O(n) time, O(1) space.`, { best })
    }),
}

/* ───────────────────────── 16. 2D arrays: row-major layout ───────────────────────── */

export const arrRowMajor: Algorithm = {
  id: 'arr-row-major',
  title: 'A 2D array in memory — row-major order',
  inputs: [
    { name: 'rows', label: 'Rows', type: 'number', default: '3', min: 1, max: 4 },
    { name: 'cols', label: 'Columns', type: 'number', default: '4', min: 1, max: 5 },
  ],
  code: {
    pseudo: `
// M has R rows and C columns, stored row after row
function index(r, c)
  return r × C + c                      // @index
for r ← 0 to R − 1                      // @row
  for c ← 0 to C − 1                    // @cell
    visit M[r][c]                       // @cell`,
    cpp: `
int M[R][C];                      // one block of R*C ints
// &M[r][c] == &M[0][0] + (r * C + c)    // @index
for (int r = 0; r < R; r++)           // @row
    for (int c = 0; c < C; c++)       // @cell
        visit(M[r][c]);               // @cell`,
    java: `
int[][] M = new int[R][C];   // an array of R row arrays
// (a Java 2D array is rows of references; each row is contiguous)   // @index
for (int r = 0; r < R; r++)           // @row
    for (int c = 0; c < C; c++)       // @cell
        visit(M[r][c]);               // @cell`,
    python: `
# flat storage, the way NumPy lays it out
flat = [0] * (R * C)
def at(r, c):
    return flat[r * C + c]            # @index
for r in range(R):                    # @row
    for c in range(C):                # @cell
        visit(at(r, c))               # @cell`,
    js: `
const flat = new Int32Array(R * C);   // one contiguous block
const at = (r, c) => flat[r * C + c]; // @index
for (let r = 0; r < R; r++)           // @row
  for (let c = 0; c < C; c++)         // @cell
    visit(at(r, c));                  // @cell`,
    c: `
int M[R][C];                      /* contiguous, row after row */
/* M[r][c] is *(&M[0][0] + r * C + c) */   // @index
for (int r = 0; r < R; r++)           // @row
    for (int c = 0; c < C; c++)       // @cell
        visit(M[r][c]);               // @cell`,
  },
  run: ({ rows, cols }) =>
    trace((t) => {
      const R = rows as number
      const C = cols as number
      const vals = Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => (r + 1) * 10 + c))
      const g = t.grid('M', vals.map((r) => [...r]), { label: `M (${R} × ${C})`, rowLabels: vals.map((_, r) => `r${r}`), colLabels: vals[0].map((_, c) => `c${c}`) })
      const flat = t.array('flat', [], { label: 'memory (one block)', capacity: R * C, address: { base: 0x2000, size: 4 } })
      t.step('index', `Memory is one-dimensional, so a ${R}×${C} grid is stored row after row. Element (r, c) lives at offset r × ${C} + c.`, { R, C })
      for (let r = 0; r < R; r++) {
        g.roles = {}
        for (let c = 0; c < C; c++) g.role(r, c, 'window')
        t.step('row', `Row ${r} occupies offsets ${r * C}…${r * C + C - 1}.`, { r, R, C })
        for (let c = 0; c < C; c++) {
          g.roles = {}
          for (let cc = 0; cc < C; cc++) g.role(r, cc, 'window')
          g.role(r, c, 'active')
          flat.push(vals[r][c])
          flat.clear().role(r * C + c, 'write')
          t.step('cell', `M[${r}][${c}] = ${vals[r][c]} → offset ${r} × ${C} + ${c} = ${r * C + c}.`, { r, c, offset: r * C + c })
        }
      }
      g.roles = {}
      flat.clear()
      t.step('cell', 'Walking row by row (c in the inner loop) reads memory in order, which is the fastest pattern for the CPU cache. Swapping the loops jumps C elements each step.', { R, C })
    }),
}
