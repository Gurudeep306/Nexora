import { trace } from '../../../engine/tracer'
import type { Algorithm, Range } from '../../../engine/types'
import { list, rarr, rint } from '../../../algorithms/util'

/*
 * Arrays — prefix sums with hashing, prefix products, 2D prefix sums and 2D difference arrays.
 */

const bucketOf = (x: number, m: number) => ((x % m) + m) % m

/** Parses "1 2 3; 4 5 6" into a matrix of numbers. */
export function parseMatrix(text: string, maxR = 6, maxC = 7): number[][] {
  const rows = String(text)
    .split(/[;\n|]/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.split(/[\s,]+/).filter(Boolean).map(Number))
  if (!rows.length) throw new Error('Write the matrix as rows separated by ";", e.g. "1 2; 3 4".')
  if (rows.some((r) => r.length !== rows[0].length)) throw new Error('Every row must have the same number of values.')
  if (rows.some((r) => r.some((x) => !Number.isFinite(x)))) throw new Error('Only numbers, please.')
  if (rows.length > maxR || rows[0].length > maxC) throw new Error(`At most ${maxR} rows and ${maxC} columns.`)
  return rows
}

/* ───────────────────────── Count subarrays with sum k (prefix sums + hash map) ───────────────────────── */

export const arrSubarraySumK: Algorithm = {
  id: 'arr-subarray-sum-k',
  title: 'Count subarrays with sum k — prefix sums meet a hash map',
  blurb: 'A subarray ending here sums to k exactly when an earlier prefix equals (current prefix − k). Count those prefixes in a hash map.',
  legend: { active: 'a[j]', found: 'a subarray with sum k', new: 'stored / updated', compare: 'looked up' },
  inputs: [
    { name: 'arr', label: 'Array (negatives allowed)', type: 'array', default: '3 4 -7 1 3 3 1 -4', maxLen: 10 },
    { name: 'k', label: 'k', type: 'number', default: '7' },
  ],
  random: () => ({ arr: list(rarr(rint(6, 9), -3, 6)), k: String(rint(2, 7)) }),
  code: {
    pseudo: `
function countSubarrays(a, n, k)
  count ← 0; P ← 0
  seen ← {0: 1}                       // the empty prefix   @init
  for j ← 0 to n − 1
    P ← P + a[j]                      // prefix through j   @add
    count ← count + seen[P − k]       // earlier prefixes that fit   @lookup
    seen[P] ← seen[P] + 1             // @store
  return count                        // @done`,
    cpp: `
long long countSubarrays(const vector<int>& a, long long k) {
    unordered_map<long long, long long> seen{{0, 1}};    // @init
    long long P = 0, count = 0;
    for (int x : a) {
        P += x;                                          // @add
        auto it = seen.find(P - k);                      // @lookup
        if (it != seen.end()) count += it->second;       // @lookup
        seen[P]++;                                       // @store
    }
    return count;                                        // @done
}`,
    java: `
static long countSubarrays(int[] a, long k) {
    HashMap<Long, Long> seen = new HashMap<>();
    seen.put(0L, 1L);                                    // @init
    long P = 0, count = 0;
    for (int x : a) {
        P += x;                                          // @add
        count += seen.getOrDefault(P - k, 0L);           // @lookup
        seen.merge(P, 1L, Long::sum);                    // @store
    }
    return count;                                        // @done
}`,
    python: `
from collections import defaultdict
def count_subarrays(a, k):
    seen = defaultdict(int)
    seen[0] = 1                         # @init
    P = count = 0
    for x in a:
        P += x                          # @add
        count += seen.get(P - k, 0)     # @lookup
        seen[P] += 1                    # @store
    return count                        # @done`,
    js: `
function countSubarrays(a, k) {
  const seen = new Map([[0, 1]]);                       // @init
  let P = 0, count = 0;
  for (const x of a) {
    P += x;                                             // @add
    count += seen.get(P - k) ?? 0;                      // @lookup
    seen.set(P, (seen.get(P) ?? 0) + 1);                // @store
  }
  return count;                                         // @done
}`,
    c: `
/* C has no hash map: sort the n + 1 prefixes with their positions, or use a
   small open-addressing table. Shown here with a hypothetical map API. */
long long count_subarrays(const int *a, int n, long long k) {
    Map *seen = map_new(); map_add(seen, 0, 1);          // @init
    long long P = 0, count = 0;
    for (int j = 0; j < n; j++) {
        P += a[j];                                       // @add
        count += map_get(seen, P - k);                   // @lookup
        map_add(seen, P, 1);                             // @store
    }
    map_free(seen);
    return count;                                        // @done
}`,
  },
  run: ({ arr, k }) =>
    trace((t) => {
      const v = arr as number[]
      const K = k as number
      const M = 5
      const a = t.array('a', v, { label: 'a' })
      const H = t.hash('seen', M, { label: 'seen: prefix sum → how many times (5 buckets, key mod 5)' })
      const pos = new Map<number, number[]>() // prefix value -> list of prefix indices (number of elements)
      const put = (p: number, idx: number) => {
        const b = bucketOf(p, M)
        const at0 = pos.get(p) ?? []
        at0.push(idx)
        pos.set(p, at0)
        const at = H.buckets[b].findIndex((c) => String(c.v).startsWith(`${p}×`))
        if (at >= 0) {
          H.set(b, at, `${p}×${at0.length}`)
          return [b, at] as const
        }
        return [b, H.insert(b, `${p}×1`)] as const
      }
      let P = 0
      let count = 0
      const [b0, i0] = put(0, 0)
      H.role(b0, i0, 'new')
      t.step('init', 'Store the empty prefix: P = 0 has been seen once. Without it, subarrays that start at index 0 would never be counted.', { P, count })
      const found: Range[] = []
      for (let j = 0; j < v.length; j++) {
        P += v[j]
        a.clear().ptr('j', j).role(j, 'active').range([])
        H.clear()
        t.step('add', `P = sum of a[0..${j}] = ${P}.`, { j, P, 'P − k': P - K, count })
        const need = P - K
        const nb = bucketOf(need, M)
        const at = H.buckets[nb].findIndex((c) => String(c.v).startsWith(`${need}×`))
        H.role(nb, null, 'compare')
        if (at >= 0) {
          const starts = pos.get(need) ?? []
          count += starts.length
          H.role(nb, at, 'found')
          found.length = 0
          for (const s of starts.slice(-2)) found.push({ from: s, to: j, role: 'found', label: `a[${s}..${j}]` })
          a.range(found)
          t.step('lookup', `Need an earlier prefix equal to P − k = ${P} − ${K} = ${need}. It was seen ${starts.length} time${starts.length > 1 ? 's' : ''}, so ${starts.length} subarray${starts.length > 1 ? 's' : ''} ending at ${j} sum${starts.length > 1 ? '' : 's'} to ${K}: ${starts.map((s) => `a[${s}..${j}]`).join(', ')}.`, { j, P, 'P − k': need, count })
        } else {
          t.step('lookup', `Need an earlier prefix equal to ${P} − ${K} = ${need}. Bucket ${nb} has none — no subarray ending at ${j} sums to ${K}.`, { j, P, 'P − k': need, count })
        }
        H.clear()
        a.range([])
        const [b, i] = put(P, j + 1)
        H.role(b, i, 'new')
        t.step('store', `Record prefix ${P} (now seen ${pos.get(P)!.length} time${pos.get(P)!.length > 1 ? 's' : ''}) so later positions can pair with it.`, { j, P, count })
      }
      a.clear().ptr('j', null)
      H.clear()
      t.step('done', `${count} subarray${count === 1 ? '' : 's'} sum to ${K}. One pass and one hash lookup per element: O(n) time, O(n) space — and negative numbers are no problem.`, { count })
    }),
}

/* ───────────────────────── Longest subarray with sum k (first occurrence) ───────────────────────── */

export const arrLongestSumK: Algorithm = {
  id: 'arr-longest-sum-k',
  title: 'Longest subarray with sum k — remember the first time each prefix appears',
  blurb: 'To make the subarray ending at j as long as possible, pair it with the earliest prefix equal to P − k.',
  legend: { active: 'a[j]', best: 'longest so far', found: 'candidate', new: 'first occurrence stored', compare: 'looked up' },
  inputs: [
    { name: 'arr', label: 'Array (negatives allowed)', type: 'array', default: '1 -1 5 -2 3 -3 2', maxLen: 10 },
    { name: 'k', label: 'k', type: 'number', default: '3' },
  ],
  random: () => ({ arr: list(rarr(rint(6, 9), -3, 5)), k: String(rint(1, 6)) }),
  code: {
    pseudo: `
function longestWithSum(a, n, k)
  first ← {0: 0}         // prefix value → smallest i with P[i] = value   @init
  P ← 0; best ← 0
  for j ← 0 to n − 1
    P ← P + a[j]                                   // @add
    if P − k in first                              // @lookup
      best ← max(best, j + 1 − first[P − k])       // @best
    if P not in first: first[P] ← j + 1            // keep the earliest   @store
  return best                                      // @done`,
    cpp: `
int longestWithSum(const vector<int>& a, long long k) {
    unordered_map<long long, int> first{{0, 0}};             // @init
    long long P = 0; int best = 0;
    for (int j = 0; j < (int)a.size(); j++) {
        P += a[j];                                           // @add
        auto it = first.find(P - k);                         // @lookup
        if (it != first.end()) best = max(best, j + 1 - it->second);   // @best
        first.emplace(P, j + 1);                             // no-op if present   @store
    }
    return best;                                             // @done
}`,
    java: `
static int longestWithSum(int[] a, long k) {
    HashMap<Long, Integer> first = new HashMap<>();
    first.put(0L, 0);                                        // @init
    long P = 0; int best = 0;
    for (int j = 0; j < a.length; j++) {
        P += a[j];                                           // @add
        Integer i = first.get(P - k);                        // @lookup
        if (i != null) best = Math.max(best, j + 1 - i);     // @best
        first.putIfAbsent(P, j + 1);                         // @store
    }
    return best;                                             // @done
}`,
    python: `
def longest_with_sum(a, k):
    first = {0: 0}                          # @init
    P = best = 0
    for j, x in enumerate(a):
        P += x                              # @add
        if P - k in first:                  # @lookup
            best = max(best, j + 1 - first[P - k])   # @best
        first.setdefault(P, j + 1)          # @store
    return best                             # @done`,
    js: `
function longestWithSum(a, k) {
  const first = new Map([[0, 0]]);                         // @init
  let P = 0, best = 0;
  for (let j = 0; j < a.length; j++) {
    P += a[j];                                             // @add
    if (first.has(P - k))                                  // @lookup
      best = Math.max(best, j + 1 - first.get(P - k));     // @best
    if (!first.has(P)) first.set(P, j + 1);                // @store
  }
  return best;                                             // @done
}`,
    c: `
/* with a hypothetical map from long long to int (see the lesson for a sort-based C version) */
int longest_with_sum(const int *a, int n, long long k) {
    Map *first = map_new(); map_put(first, 0, 0);            // @init
    long long P = 0; int best = 0;
    for (int j = 0; j < n; j++) {
        P += a[j];                                           // @add
        if (map_has(first, P - k)) {                         // @lookup
            int len = j + 1 - map_get(first, P - k);
            if (len > best) best = len;                      // @best
        }
        if (!map_has(first, P)) map_put(first, P, j + 1);    // @store
    }
    return best;                                             // @done
}`,
  },
  run: ({ arr, k }) =>
    trace((t) => {
      const v = arr as number[]
      const K = k as number
      const M = 5
      const a = t.array('a', v, { label: 'a' })
      const H = t.hash('first', M, { label: 'first: prefix sum → earliest prefix length (key mod 5)' })
      const first = new Map<number, number>()
      const store = (p: number, idx: number) => {
        first.set(p, idx)
        const b = bucketOf(p, M)
        return [b, H.insert(b, `${p}→${idx}`)] as const
      }
      let P = 0
      let best = 0
      let bestRange: Range | null = null
      const [b0, i0] = store(0, 0)
      H.role(b0, i0, 'new')
      t.step('init', 'Prefix 0 occurs at length 0 (before any element).', { P, best })
      for (let j = 0; j < v.length; j++) {
        P += v[j]
        a.clear().ptr('j', j).role(j, 'active').range(bestRange ? [bestRange] : [])
        H.clear()
        t.step('add', `P = sum of a[0..${j}] = ${P}.`, { j, P, best })
        const need = P - K
        const nb = bucketOf(need, M)
        H.role(nb, null, 'compare')
        t.step('lookup', `Look for prefix ${need} (= P − k) in bucket ${nb}.`, { j, P, 'P − k': need, best })
        if (first.has(need)) {
          const i = first.get(need)!
          const len = j + 1 - i
          const at = H.buckets[nb].findIndex((c) => c.v === `${need}→${i}`)
          H.role(nb, at, 'found')
          const cand: Range = { from: i, to: j, role: 'found', label: `len ${len}` }
          if (len > best) {
            best = len
            bestRange = { from: i, to: j, role: 'best', label: `best ${len}` }
            a.range([bestRange])
            t.step('best', `Found: the earliest prefix ${need} has length ${i}, so a[${i}..${j}] sums to ${K} with length ${len} — a new best.`, { j, P, best })
          } else {
            a.range(bestRange ? [bestRange, cand] : [cand])
            t.step('best', `a[${i}..${j}] sums to ${K} but has length ${len} ≤ best ${best}.`, { j, P, best })
          }
        }
        H.clear()
        a.range(bestRange ? [bestRange] : [])
        if (!first.has(P)) {
          const [b, i] = store(P, j + 1)
          H.role(b, i, 'new')
          t.step('store', `First time prefix ${P} appears: remember length ${j + 1}.`, { j, P, best })
        } else {
          const b = bucketOf(P, M)
          H.role(b, H.buckets[b].findIndex((c) => String(c.v).startsWith(`${P}→`)), 'compare')
          t.step('store', `Prefix ${P} was already seen at length ${first.get(P)}: keep the earlier one — it gives longer subarrays later.`, { j, P, best })
        }
      }
      a.clear().ptr('j', null)
      H.clear()
      t.step('done', best ? `Longest subarray with sum ${K}: length ${best}${bestRange ? ` (a[${bestRange.from}..${bestRange.to}])` : ''}.` : `No subarray sums to ${K}: answer 0.`, { best })
    }),
}

/* ───────────────────────── Product of array except self ───────────────────────── */

export const arrProductExceptSelf: Algorithm = {
  id: 'arr-product-except-self',
  title: 'Product of array except self — prefix and suffix products, no division',
  blurb: 'out[i] = (product of everything left of i) × (product of everything right of i). Two passes, one running product each.',
  legend: { active: 'i', window: 'covered by the running product', write: 'written' },
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '2 3 4 5 0 1', maxLen: 9 }],
  random: () => ({ arr: list(rarr(rint(4, 7), -3, 5)) }),
  code: {
    pseudo: `
function productExceptSelf(a, n)
  left ← 1                                   // @init
  for i ← 0 to n − 1
    out[i] ← left; left ← left · a[i]        // product of a[0..i−1]   @left
  right ← 1
  for i ← n − 1 downto 0
    out[i] ← out[i] · right; right ← right · a[i]   // times a[i+1..n−1]   @right
  return out                                 // @done`,
    cpp: `
vector<long long> productExceptSelf(const vector<int>& a) {
    int n = a.size();
    vector<long long> out(n);
    long long left = 1;                                      // @init
    for (int i = 0; i < n; i++) { out[i] = left; left *= a[i]; }        // @left
    long long right = 1;
    for (int i = n - 1; i >= 0; i--) { out[i] *= right; right *= a[i]; } // @right
    return out;                                              // @done
}`,
    java: `
static long[] productExceptSelf(int[] a) {
    int n = a.length;
    long[] out = new long[n];
    long left = 1;                                           // @init
    for (int i = 0; i < n; i++) { out[i] = left; left *= a[i]; }        // @left
    long right = 1;
    for (int i = n - 1; i >= 0; i--) { out[i] *= right; right *= a[i]; } // @right
    return out;                                              // @done
}`,
    python: `
def product_except_self(a):
    n = len(a)
    out = [1] * n
    left = 1                                 # @init
    for i in range(n):
        out[i] = left                        # @left
        left *= a[i]                         # @left
    right = 1
    for i in range(n - 1, -1, -1):
        out[i] *= right                      # @right
        right *= a[i]                        # @right
    return out                               # @done`,
    js: `
function productExceptSelf(a) {
  const n = a.length, out = new Array(n);
  let left = 1;                                              // @init
  for (let i = 0; i < n; i++) { out[i] = left; left *= a[i]; }          // @left
  let right = 1;
  for (let i = n - 1; i >= 0; i--) { out[i] *= right; right *= a[i]; }   // @right
  return out;                                                // @done
}`,
    c: `
void product_except_self(const int *a, int n, long long *out) {
    long long left = 1;                                      // @init
    for (int i = 0; i < n; i++) { out[i] = left; left *= a[i]; }        // @left
    long long right = 1;
    for (int i = n - 1; i >= 0; i--) { out[i] *= right; right *= a[i]; } // @right
}                                                            // @done`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      if (n < 2) throw new Error('Give at least two values.')
      const a = t.array('a', v, { label: 'a' })
      const out = t.array('out', Array.from({ length: n }, () => null), { label: 'out' })
      let left = 1
      t.step('init', 'Division would be easy (total / a[i]) but breaks on zeros. Instead: out[i] = left[i] × right[i], built with two running products.', { left })
      for (let i = 0; i < n; i++) {
        out.set(i, left)
        a.clear().ptr('i', i).role(i, 'active').range(i > 0 ? [{ from: 0, to: i - 1, role: 'window', label: `left = ${left}` }] : [])
        out.clear().role(i, 'write')
        t.step('left', `out[${i}] = product of a[0..${i - 1}] = ${left}${i === 0 ? ' (empty product)' : ''}. Then left ×= a[${i}] → ${left * v[i]}.`, { i, left, 'left after': left * v[i] })
        left *= v[i]
      }
      let right = 1
      for (let i = n - 1; i >= 0; i--) {
        const before = out.get(i) as number
        out.set(i, before * right)
        a.clear().ptr('i', i).role(i, 'active').range(i < n - 1 ? [{ from: i + 1, to: n - 1, role: 'window', label: `right = ${right}` }] : [])
        out.clear().role(i, 'found')
        t.step('right', `out[${i}] = ${before} × ${right} (product of a[${i + 1}..${n - 1}]) = ${before * right}. Then right ×= a[${i}].`, { i, right, 'out[i]': before * right })
        right *= v[i]
      }
      a.clear().ptr('i', null).range([])
      out.clear()
      const zeros = v.filter((x) => x === 0).length
      t.step('done', `Done in two passes, O(n) time and O(1) extra space besides the output. ${zeros === 1 ? 'With exactly one zero, only its own slot is non-zero.' : zeros > 1 ? 'With two or more zeros, every product is 0.' : 'No division was used, so zeros would have been handled too.'}`, {})
    }),
}

/* ───────────────────────── 2D prefix sums ───────────────────────── */

export const arrPrefix2D: Algorithm = {
  id: 'arr-prefix-2d',
  title: '2D prefix sums — inclusion–exclusion, cell by cell',
  blurb: 'P[r][c] is the sum of the rectangle above-left of (r, c). Each entry = the cell + up + left − the overlap counted twice.',
  legend: { active: 'computing', compare: 'added', removed: 'subtracted', found: 'added (query)', window: 'block covered by P' },
  inputs: [
    { name: 'M', label: 'Matrix (rows separated by ;)', type: 'string', default: '3 0 1 4; 5 6 3 2; 1 2 0 1; 4 1 0 1' },
    { name: 'q', label: 'Query r1 c1 r2 c2', type: 'array', default: '1 1 2 3', maxLen: 4 },
  ],
  random: () => {
    const R = rint(3, 4)
    const C = rint(3, 5)
    const rows = Array.from({ length: R }, () => rarr(C, 0, 9).join(' ')).join('; ')
    const r1 = rint(0, R - 1)
    const c1 = rint(0, C - 1)
    return { M: rows, q: `${r1} ${c1} ${rint(r1, R - 1)} ${rint(c1, C - 1)}` }
  },
  code: {
    pseudo: `
// P has (R + 1) × (C + 1) entries; row 0 and column 0 are 0
for r ← 0 to R − 1
  for c ← 0 to C − 1
    P[r+1][c+1] ← M[r][c] + P[r][c+1] + P[r+1][c] − P[r][c]   // @build
function sum(r1, c1, r2, c2)       // inclusive corners
  return P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1]   // @query`,
    cpp: `
vector<vector<long long>> P(R + 1, vector<long long>(C + 1, 0));
for (int r = 0; r < R; r++)
    for (int c = 0; c < C; c++)
        P[r+1][c+1] = M[r][c] + P[r][c+1] + P[r+1][c] - P[r][c];   // @build
auto sum = [&](int r1, int c1, int r2, int c2) {
    return P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1];   // @query
};`,
    java: `
long[][] P = new long[R + 1][C + 1];
for (int r = 0; r < R; r++)
    for (int c = 0; c < C; c++)
        P[r+1][c+1] = M[r][c] + P[r][c+1] + P[r+1][c] - P[r][c];   // @build
long sum(int r1, int c1, int r2, int c2) {
    return P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1];   // @query
}`,
    python: `
P = [[0] * (C + 1) for _ in range(R + 1)]
for r in range(R):
    for c in range(C):
        P[r+1][c+1] = M[r][c] + P[r][c+1] + P[r+1][c] - P[r][c]   # @build

def rect_sum(r1, c1, r2, c2):
    return P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1]   # @query`,
    js: `
const P = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0));
for (let r = 0; r < R; r++)
  for (let c = 0; c < C; c++)
    P[r+1][c+1] = M[r][c] + P[r][c+1] + P[r+1][c] - P[r][c];   // @build
const rectSum = (r1, c1, r2, c2) =>
  P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1];       // @query`,
    c: `
static long long P[MAXR + 1][MAXC + 1];   /* row 0 and column 0 stay 0 */
for (int r = 0; r < R; r++)
    for (int c = 0; c < C; c++)
        P[r+1][c+1] = M[r][c] + P[r][c+1] + P[r+1][c] - P[r][c];   // @build
long long rect_sum(int r1, int c1, int r2, int c2) {
    return P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1];   // @query
}`,
  },
  run: ({ M, q }) =>
    trace((t) => {
      const m = parseMatrix(String(M), 5, 6)
      const R = m.length
      const C = m[0].length
      const qq = q as number[]
      if (qq.length !== 4) throw new Error('The query needs four numbers: r1 c1 r2 c2.')
      const [r1, c1, r2, c2] = qq
      if (!(0 <= r1 && r1 <= r2 && r2 < R && 0 <= c1 && c1 <= c2 && c2 < C)) throw new Error(`Need 0 ≤ r1 ≤ r2 < ${R} and 0 ≤ c1 ≤ c2 < ${C}.`)
      const G = t.grid('M', m.map((r) => [...r]), { label: 'M', rowLabels: m.map((_, r) => String(r)), colLabels: m[0].map((_, c) => String(c)) })
      const P = Array.from({ length: R + 1 }, () => Array.from({ length: C + 1 }, () => 0))
      const PG = t.grid('P', Array.from({ length: R + 1 }, (_, r) => Array.from({ length: C + 1 }, (_, c) => (r === 0 || c === 0 ? 0 : null as number | null))), {
        label: 'P (one extra row and column of zeros)',
        rowLabels: Array.from({ length: R + 1 }, (_, r) => String(r)),
        colLabels: Array.from({ length: C + 1 }, (_, c) => String(c)),
      })
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++) {
          P[r + 1][c + 1] = m[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c]
          PG.set(r + 1, c + 1, P[r + 1][c + 1])
          G.clear().role(r, c, 'active')
          for (let rr = 0; rr <= r; rr++) for (let cc = 0; cc <= c; cc++) if (rr !== r || cc !== c) G.role(rr, cc, 'window')
          PG.clear().role(r + 1, c + 1, 'active').role(r, c + 1, 'compare').role(r + 1, c, 'compare').role(r, c, 'removed')
          PG.arrow([r, c + 1], [r + 1, c + 1], '+', 'compare').arrow([r + 1, c], [r + 1, c + 1], '+', 'compare').arrow([r, c], [r + 1, c + 1], '−', 'removed')
          t.step('build', `P[${r + 1}][${c + 1}] = M[${r}][${c}] + up + left − diagonal = ${m[r][c]} + ${P[r][c + 1]} + ${P[r + 1][c]} − ${P[r][c]} = ${P[r + 1][c + 1]}. The diagonal block was inside both "up" and "left", so it was counted twice.`, { r, c, 'P[r+1][c+1]': P[r + 1][c + 1] })
        }
      G.clear()
      for (let rr = r1; rr <= r2; rr++) for (let cc = c1; cc <= c2; cc++) G.role(rr, cc, 'window')
      PG.clear().role(r2 + 1, c2 + 1, 'found').role(r1, c1, 'found').role(r1, c2 + 1, 'removed').role(r2 + 1, c1, 'removed')
      const ans = P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]
      t.step('query', `Sum of rows ${r1}…${r2}, columns ${c1}…${c2} = P[${r2 + 1}][${c2 + 1}] − P[${r1}][${c2 + 1}] − P[${r2 + 1}][${c1}] + P[${r1}][${c1}] = ${P[r2 + 1][c2 + 1]} − ${P[r1][c2 + 1]} − ${P[r2 + 1][c1]} + ${P[r1][c1]} = ${ans}. Take the big block, cut off the strip above and the strip to the left, and add back the corner both cuts removed.`, { r1, c1, r2, c2, answer: ans })
    }),
}

/* ───────────────────────── 2D difference array ───────────────────────── */

export const arrDiff2D: Algorithm = {
  id: 'arr-diff-2d',
  title: '2D difference array — four corners per update, one prefix pass at the end',
  blurb: 'Adding v to a rectangle costs four writes. A 2D prefix sum over the corner marks recovers every cell’s total.',
  legend: { found: '+v corner', removed: '−v corner', active: 'summing', compare: 'read', window: 'updated rectangle' },
  inputs: [
    { name: 'R', label: 'Rows', type: 'number', default: '4', min: 1, max: 5 },
    { name: 'C', label: 'Columns', type: 'number', default: '5', min: 1, max: 6 },
    { name: 'ups', label: 'Updates "r1 c1 r2 c2 v; …"', type: 'string', default: '0 0 1 2 3; 1 1 3 3 2; 2 0 2 4 1' },
  ],
  random: () => {
    const R = rint(3, 4)
    const C = rint(3, 5)
    const ups = Array.from({ length: rint(2, 3) }, () => {
      const r1 = rint(0, R - 1)
      const c1 = rint(0, C - 1)
      return `${r1} ${c1} ${rint(r1, R - 1)} ${rint(c1, C - 1)} ${rint(1, 5)}`
    }).join('; ')
    return { R: String(R), C: String(C), ups }
  },
  code: {
    pseudo: `
// D has (R + 1) × (C + 1) zeros
function update(r1, c1, r2, c2, v)
  D[r1][c1] += v; D[r1][c2+1] −= v              // @update
  D[r2+1][c1] −= v; D[r2+1][c2+1] += v          // @update
// afterwards, a 2D prefix sum turns D into the final values
for r ← 0 to R − 1
  for c ← 0 to C − 1
    A[r][c] ← D[r][c] + A[r−1][c] + A[r][c−1] − A[r−1][c−1]   // @sum
return A                                                    // @done`,
    cpp: `
vector<vector<long long>> D(R + 1, vector<long long>(C + 1, 0));
void update(int r1, int c1, int r2, int c2, long long v) {
    D[r1][c1] += v; D[r1][c2+1] -= v;                       // @update
    D[r2+1][c1] -= v; D[r2+1][c2+1] += v;                   // @update
}
// finalize in place: D[r][c] becomes the value of cell (r, c)
for (int r = 0; r < R; r++)
    for (int c = 0; c < C; c++)
        D[r][c] += (r ? D[r-1][c] : 0) + (c ? D[r][c-1] : 0) - (r && c ? D[r-1][c-1] : 0);   // @sum
// @done`,
    java: `
long[][] D = new long[R + 1][C + 1];
void update(int r1, int c1, int r2, int c2, long v) {
    D[r1][c1] += v; D[r1][c2+1] -= v;                       // @update
    D[r2+1][c1] -= v; D[r2+1][c2+1] += v;                   // @update
}
for (int r = 0; r < R; r++)
    for (int c = 0; c < C; c++)
        D[r][c] += (r > 0 ? D[r-1][c] : 0) + (c > 0 ? D[r][c-1] : 0) - (r > 0 && c > 0 ? D[r-1][c-1] : 0);   // @sum
// @done`,
    python: `
D = [[0] * (C + 1) for _ in range(R + 1)]
def update(r1, c1, r2, c2, v):
    D[r1][c1] += v; D[r1][c2 + 1] -= v                      # @update
    D[r2 + 1][c1] -= v; D[r2 + 1][c2 + 1] += v              # @update

for r in range(R):
    for c in range(C):
        up = D[r - 1][c] if r else 0
        left = D[r][c - 1] if c else 0
        diag = D[r - 1][c - 1] if r and c else 0
        D[r][c] += up + left - diag                         # @sum
# @done`,
    js: `
const D = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0));
function update(r1, c1, r2, c2, v) {
  D[r1][c1] += v; D[r1][c2 + 1] -= v;                       // @update
  D[r2 + 1][c1] -= v; D[r2 + 1][c2 + 1] += v;               // @update
}
for (let r = 0; r < R; r++)
  for (let c = 0; c < C; c++)
    D[r][c] += (r ? D[r - 1][c] : 0) + (c ? D[r][c - 1] : 0) - (r && c ? D[r - 1][c - 1] : 0);   // @sum
// @done`,
    c: `
static long long D[MAXR + 1][MAXC + 1];
void update(int r1, int c1, int r2, int c2, long long v) {
    D[r1][c1] += v; D[r1][c2+1] -= v;                       // @update
    D[r2+1][c1] -= v; D[r2+1][c2+1] += v;                   // @update
}
void finalize(int R, int C) {
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++)
            D[r][c] += (r ? D[r-1][c] : 0) + (c ? D[r][c-1] : 0) - (r && c ? D[r-1][c-1] : 0);   // @sum
}                                                           // @done`,
  },
  run: ({ R, C, ups }) =>
    trace((t) => {
      const rows = R as number
      const cols = C as number
      const list2 = String(ups)
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.split(/[\s,]+/).map(Number))
      if (!list2.length) throw new Error('Give at least one update "r1 c1 r2 c2 v".')
      if (list2.length > 5) throw new Error('At most 5 updates.')
      for (const u of list2) {
        if (u.length !== 5 || u.some((x) => !Number.isFinite(x))) throw new Error('Each update is five numbers: r1 c1 r2 c2 v.')
        const [r1, c1, r2, c2] = u
        if (!(0 <= r1 && r1 <= r2 && r2 < rows && 0 <= c1 && c1 <= c2 && c2 < cols)) throw new Error(`Each update needs 0 ≤ r1 ≤ r2 < ${rows} and 0 ≤ c1 ≤ c2 < ${cols}.`)
      }
      const D = Array.from({ length: rows + 1 }, () => Array.from({ length: cols + 1 }, () => 0))
      const DG = t.grid('D', D.map((r) => [...r]), {
        label: 'D: corner marks (extra row and column catch the −v marks)',
        rowLabels: Array.from({ length: rows + 1 }, (_, r) => String(r)),
        colLabels: Array.from({ length: cols + 1 }, (_, c) => String(c)),
      })
      const A = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null as number | null))
      const AG = t.grid('A', A.map((r) => [...r]), { label: 'A: final values (prefix sums of D)', rowLabels: A.map((_, r) => String(r)), colLabels: Array.from({ length: cols }, (_, c) => String(c)) })
      for (const [r1, c1, r2, c2, v] of list2) {
        D[r1][c1] += v
        D[r1][c2 + 1] -= v
        D[r2 + 1][c1] -= v
        D[r2 + 1][c2 + 1] += v
        for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) DG.set(r, c, D[r][c])
        DG.clear()
        for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) DG.role(r, c, 'window')
        DG.role(r1, c1, 'found').role(r2 + 1, c2 + 1, 'found').role(r1, c2 + 1, 'removed').role(r2 + 1, c1, 'removed')
        t.step('update', `Add ${v} to rows ${r1}…${r2}, columns ${c1}…${c2}: +${v} at (${r1},${c1}) starts it, −${v} at (${r1},${c2 + 1}) and (${r2 + 1},${c1}) stop it spilling right and down, +${v} at (${r2 + 1},${c2 + 1}) repairs the corner subtracted twice. Four writes, whatever the size.`, { r1, c1, r2, c2, v })
      }
      DG.clear()
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const up = r ? (A[r - 1][c] as number) : 0
          const left = c ? (A[r][c - 1] as number) : 0
          const diag = r && c ? (A[r - 1][c - 1] as number) : 0
          A[r][c] = D[r][c] + up + left - diag
          AG.set(r, c, A[r][c])
          AG.clear().role(r, c, 'active')
          DG.clear().role(r, c, 'compare')
          if (r) AG.role(r - 1, c, 'compare').arrow([r - 1, c], [r, c], '+', 'compare')
          if (c) AG.role(r, c - 1, 'compare').arrow([r, c - 1], [r, c], '+', 'compare')
          if (r && c) AG.role(r - 1, c - 1, 'removed').arrow([r - 1, c - 1], [r, c], '−', 'removed')
          t.step('sum', `A[${r}][${c}] = D[${r}][${c}] + up + left − diagonal = ${D[r][c]} + ${up} + ${left} − ${diag} = ${A[r][c]}: the sum of every corner mark above-left of (${r},${c}).`, { r, c, 'A[r][c]': A[r][c] })
        }
      AG.clear()
      DG.clear()
      t.step('done', `Every cell now holds the total added to it. ${list2.length} updates cost O(1) each, plus one O(R·C) pass — instead of O(R·C) per update.`, {})
    }),
}

export const algorithms2: Algorithm[] = [arrSubarraySumK, arrLongestSumK, arrProductExceptSelf, arrPrefix2D, arrDiff2D]
