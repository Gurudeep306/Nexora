import { trace } from '../../../engine/tracer'
import type { Algorithm, Range } from '../../../engine/types'
import { list, rarr, rint } from '../../../algorithms/util'
import { parseMatrix } from './algorithms2'

/*
 * Arrays — Kadane variants, generalised majority vote, and in-place matrix techniques.
 */

const fmt = (x: number) => (x === -Infinity ? '−∞' : String(x))

/* ───────────────────────── Maximum product subarray ───────────────────────── */

export const arrMaxProduct: Algorithm = {
  id: 'arr-max-product',
  title: 'Maximum product subarray — track the largest and the smallest',
  blurb: 'A negative number turns the smallest product into the largest. So keep both, as a two-row DP table.',
  legend: { active: 'computing', compare: 'candidate source', best: 'best so far', swap: 'sign flip' },
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '2 3 -2 4 -1 0 -3', maxLen: 9 }],
  random: () => ({ arr: list(rarr(rint(5, 8), -4, 4)) }),
  code: {
    pseudo: `
function maxProduct(a, n)
  hi ← a[0]; lo ← a[0]; best ← a[0]               // @init
  for i ← 1 to n − 1
    x ← a[i]
    if x < 0: swap hi, lo                          // a negative flips the order   @swap
    hi ← max(x, hi · x)                            // largest product ending at i
    lo ← min(x, lo · x)                            // smallest product ending at i   @update
    best ← max(best, hi)                           // @best
  return best                                      // @done`,
    cpp: `
long long maxProduct(const vector<int>& a) {
    long long hi = a[0], lo = a[0], best = a[0];          // @init
    for (size_t i = 1; i < a.size(); i++) {
        long long x = a[i];
        if (x < 0) swap(hi, lo);                          // @swap
        hi = max(x, hi * x);
        lo = min(x, lo * x);                              // @update
        best = max(best, hi);                             // @best
    }
    return best;                                          // @done
}`,
    java: `
static long maxProduct(int[] a) {
    long hi = a[0], lo = a[0], best = a[0];               // @init
    for (int i = 1; i < a.length; i++) {
        long x = a[i];
        if (x < 0) { long t = hi; hi = lo; lo = t; }      // @swap
        hi = Math.max(x, hi * x);
        lo = Math.min(x, lo * x);                         // @update
        best = Math.max(best, hi);                        // @best
    }
    return best;                                          // @done
}`,
    python: `
def max_product(a):
    hi = lo = best = a[0]                     # @init
    for x in a[1:]:
        if x < 0:
            hi, lo = lo, hi                   # @swap
        hi = max(x, hi * x)
        lo = min(x, lo * x)                   # @update
        best = max(best, hi)                  # @best
    return best                               # @done`,
    js: `
function maxProduct(a) {
  let hi = a[0], lo = a[0], best = a[0];                // @init
  for (let i = 1; i < a.length; i++) {
    const x = a[i];
    if (x < 0) [hi, lo] = [lo, hi];                     // @swap
    hi = Math.max(x, hi * x);
    lo = Math.min(x, lo * x);                           // @update
    best = Math.max(best, hi);                          // @best
  }
  return best;                                          // @done
}`,
    c: `
long long max_product(const int *a, int n) {
    long long hi = a[0], lo = a[0], best = a[0];          // @init
    for (int i = 1; i < n; i++) {
        long long x = a[i];
        if (x < 0) { long long t = hi; hi = lo; lo = t; } // @swap
        hi = x > hi * x ? x : hi * x;
        lo = x < lo * x ? x : lo * x;                     // @update
        if (hi > best) best = hi;                         // @best
    }
    return best;                                          // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      if (!n) throw new Error('Give at least one value.')
      const a = t.array('a', v, { label: 'a' })
      const G = t.grid('dp', [Array.from({ length: n }, () => null), Array.from({ length: n }, () => null)], {
        label: 'products of subarrays ending at i',
        rowLabels: ['max (hi)', 'min (lo)'],
        colLabels: v.map((_, i) => String(i)),
      })
      let hi = v[0]
      let lo = v[0]
      let best = v[0]
      let bestAt = 0
      G.set(0, 0, hi)
      G.set(1, 0, lo)
      G.role(0, 0, 'best')
      a.ptr('i', 0).role(0, 'active')
      t.step('init', `Only one subarray ends at 0: [${v[0]}]. Its product ${v[0]} is both the largest and the smallest.`, { hi, lo, best })
      for (let i = 1; i < n; i++) {
        const x = v[i]
        const ph = hi
        const pl = lo
        a.clear().ptr('i', i).role(i, 'active')
        G.clear().role(0, bestAt, 'best')
        if (x < 0) {
          ;[hi, lo] = [lo, hi]
          G.role(0, i - 1, 'swap').role(1, i - 1, 'swap')
          t.step('swap', `a[${i}] = ${x} is negative: multiplying flips the order, so the old smallest (${pl}) will produce the new largest and the old largest (${ph}) the new smallest. Swap them first.`, { x, hi, lo, best })
        }
        const nh = Math.max(x, hi * x)
        const nl = Math.min(x, lo * x)
        hi = nh
        lo = nl
        G.set(0, i, hi)
        G.set(1, i, lo)
        G.clear().role(0, i, 'active').role(1, i, 'active').role(0, i - 1, 'compare').role(1, i - 1, 'compare')
        G.arrow([x < 0 ? 1 : 0, i - 1], [0, i], `×${x}`, 'compare').arrow([x < 0 ? 0 : 1, i - 1], [1, i], `×${x}`, 'compare')
        t.step('update', `Largest ending at ${i}: max(${x} alone, ${x < 0 ? pl : ph} × ${x}) = ${hi}. Smallest: min(${x} alone, ${x < 0 ? ph : pl} × ${x}) = ${lo}.${x === 0 ? ' A zero resets both — every product through it is 0, so start fresh after it.' : ''}`, { x, hi, lo, best })
        if (hi > best) {
          best = hi
          bestAt = i
        }
        G.clear().role(0, bestAt, 'best')
        t.step('best', `best = ${best}${bestAt === i ? ' (new)' : ''}.`, { x, hi, lo, best })
      }
      a.clear().ptr('i', null)
      G.clear().role(0, bestAt, 'best')
      t.step('done', `Maximum product: ${best}. Same O(n) one-pass shape as Kadane, with two states instead of one.`, { best })
    }),
}

/* ───────────────────────── Maximum circular subarray ───────────────────────── */

export const arrCircularKadane: Algorithm = {
  id: 'arr-circular-kadane',
  title: 'Maximum circular subarray — the best wrap is the total minus the worst middle',
  blurb: 'A wrapping subarray leaves out a contiguous middle. Maximising what is kept = minimising what is left out.',
  legend: { best: 'max subarray', removed: 'min subarray', found: 'wrapping answer', active: 'i' },
  inputs: [{ name: 'arr', label: 'Array (circular)', type: 'array', default: '8 -1 -3 8 -6 -2 9', maxLen: 10 }],
  random: () => ({ arr: list(rarr(rint(5, 9), -6, 9)) }),
  code: {
    pseudo: `
function maxCircular(a, n)
  total ← 0; curMax ← 0; bestMax ← −∞; curMin ← 0; bestMin ← +∞   // @init
  for x in a
    curMax ← max(x, curMax + x); bestMax ← max(bestMax, curMax)
    curMin ← min(x, curMin + x); bestMin ← min(bestMin, curMin)
    total ← total + x                                               // @scan
  if bestMax < 0: return bestMax          // all negative: no wrap allowed   @combine
  return max(bestMax, total − bestMin)                              // @combine`,
    cpp: `
long long maxCircular(const vector<int>& a) {
    long long total = 0, curMax = 0, bestMax = LLONG_MIN, curMin = 0, bestMin = LLONG_MAX;   // @init
    for (int x : a) {
        curMax = max<long long>(x, curMax + x); bestMax = max(bestMax, curMax);
        curMin = min<long long>(x, curMin + x); bestMin = min(bestMin, curMin);
        total += x;                                             // @scan
    }
    if (bestMax < 0) return bestMax;                            // @combine
    return max(bestMax, total - bestMin);                       // @combine
}`,
    java: `
static long maxCircular(int[] a) {
    long total = 0, curMax = 0, bestMax = Long.MIN_VALUE, curMin = 0, bestMin = Long.MAX_VALUE;   // @init
    for (int x : a) {
        curMax = Math.max(x, curMax + x); bestMax = Math.max(bestMax, curMax);
        curMin = Math.min(x, curMin + x); bestMin = Math.min(bestMin, curMin);
        total += x;                                             // @scan
    }
    if (bestMax < 0) return bestMax;                            // @combine
    return Math.max(bestMax, total - bestMin);                  // @combine
}`,
    python: `
def max_circular(a):
    total = cur_max = cur_min = 0                               # @init
    best_max, best_min = float('-inf'), float('inf')            # @init
    for x in a:
        cur_max = max(x, cur_max + x); best_max = max(best_max, cur_max)
        cur_min = min(x, cur_min + x); best_min = min(best_min, cur_min)
        total += x                                              # @scan
    if best_max < 0:                                            # @combine
        return best_max                                         # @combine
    return max(best_max, total - best_min)                      # @combine`,
    js: `
function maxCircular(a) {
  let total = 0, curMax = 0, bestMax = -Infinity, curMin = 0, bestMin = Infinity;   // @init
  for (const x of a) {
    curMax = Math.max(x, curMax + x); bestMax = Math.max(bestMax, curMax);
    curMin = Math.min(x, curMin + x); bestMin = Math.min(bestMin, curMin);
    total += x;                                               // @scan
  }
  if (bestMax < 0) return bestMax;                            // @combine
  return Math.max(bestMax, total - bestMin);                  // @combine
}`,
    c: `
long long max_circular(const int *a, int n) {
    long long total = 0, curMax = 0, bestMax = LLONG_MIN, curMin = 0, bestMin = LLONG_MAX;   // @init
    for (int i = 0; i < n; i++) {
        long long x = a[i];
        curMax = curMax + x > x ? curMax + x : x; if (curMax > bestMax) bestMax = curMax;
        curMin = curMin + x < x ? curMin + x : x; if (curMin < bestMin) bestMin = curMin;
        total += x;                                             // @scan
    }
    if (bestMax < 0) return bestMax;                            // @combine
    return bestMax > total - bestMin ? bestMax : total - bestMin;   // @combine
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      if (!n) throw new Error('Give at least one value.')
      const a = t.array('a', v, { label: 'a (the end wraps around to the start)' })
      let total = 0
      let curMax = 0
      let curMin = 0
      let bestMax = -Infinity
      let bestMin = Infinity
      let sMax = 0
      let sMin = 0
      let bMax: [number, number] = [0, 0]
      let bMin: [number, number] = [0, 0]
      t.step('init', 'Run two Kadanes at once: one for the largest subarray, one for the smallest. Also add up the total.', { total, bestMax: fmt(bestMax), bestMin: '+∞' })
      for (let i = 0; i < n; i++) {
        const x = v[i]
        if (curMax + x >= x && i > 0) curMax += x
        else {
          curMax = x
          sMax = i
        }
        if (curMax > bestMax) {
          bestMax = curMax
          bMax = [sMax, i]
        }
        if (curMin + x <= x && i > 0) curMin += x
        else {
          curMin = x
          sMin = i
        }
        if (curMin < bestMin) {
          bestMin = curMin
          bMin = [sMin, i]
        }
        total += x
        a.clear().ptr('i', i).role(i, 'active').range([
          { from: bMax[0], to: bMax[1], role: 'best', label: `max ${bestMax}` },
          { from: bMin[0], to: bMin[1], role: 'removed', label: `min ${bestMin}` },
        ])
        t.step('scan', `x = ${x}: best ending here ${curMax}, worst ending here ${curMin}. Best so far ${bestMax}, worst so far ${bestMin}, total ${total}.`, { total, curMax, bestMax, curMin, bestMin })
      }
      a.clear().ptr('i', null)
      if (bestMax < 0) {
        a.range([{ from: bMax[0], to: bMax[1], role: 'best', label: `answer ${bestMax}` }])
        t.step('combine', `Every value is negative. total − min would be total − total = 0, the empty subarray — not allowed. The answer is the ordinary maximum, ${bestMax}.`, { answer: bestMax })
        return
      }
      const wrap = total - bestMin
      const rs: Range[] = []
      if (wrap > bestMax) {
        if (bMin[1] + 1 <= n - 1) rs.push({ from: bMin[1] + 1, to: n - 1, role: 'found', label: 'kept' })
        if (bMin[0] - 1 >= 0) rs.push({ from: 0, to: bMin[0] - 1, role: 'found', label: 'kept (wraps)' })
        rs.push({ from: bMin[0], to: bMin[1], role: 'removed', label: `left out ${bestMin}` })
      } else rs.push({ from: bMax[0], to: bMax[1], role: 'best', label: `answer ${bestMax}` })
      a.range(rs)
      for (const r of rs) for (let i = r.from; i <= r.to; i++) a.role(i, r.role)
      t.step('combine', wrap > bestMax ? `A wrapping subarray = everything except a contiguous middle. Best wrap = total − min = ${total} − (${bestMin}) = ${wrap} > ${bestMax}. Answer ${wrap}.` : `Best wrap = total − min = ${total} − (${bestMin}) = ${wrap} ≤ ${bestMax}, so the non-wrapping maximum ${bestMax} wins.`, { total, bestMax, bestMin, answer: Math.max(bestMax, wrap) })
    }),
}

/* ───────────────────────── Maximum subarray sum with one deletion ───────────────────────── */

export const arrOneDeletion: Algorithm = {
  id: 'arr-one-deletion',
  title: 'Maximum subarray sum with at most one deletion — a two-state DP',
  blurb: 'keep[i]: best sum ending at i with no deletion. del[i]: best ending at i with exactly one element deleted. Each depends only on the previous column.',
  legend: { active: 'computing', compare: 'came from', best: 'best so far', removed: 'the deleted element' },
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '3 -1 -8 4 -1 2', maxLen: 9 }],
  random: () => ({ arr: list(rarr(rint(5, 8), -8, 6)) }),
  code: {
    pseudo: `
function maxSumOneDeletion(a, n)
  keep ← a[0]; del ← −∞; best ← a[0]               // @init
  for i ← 1 to n − 1
    del  ← max(keep, del + a[i])                    // delete a[i], or extend a run that already deleted   @del
    keep ← max(a[i], keep + a[i])                   // plain Kadane   @keep
    best ← max(best, keep, del)                     // @best
  return best                                       // @done`,
    cpp: `
long long maxSumOneDeletion(const vector<int>& a) {
    const long long NEG = LLONG_MIN / 4;
    long long keep = a[0], del = NEG, best = a[0];        // @init
    for (size_t i = 1; i < a.size(); i++) {
        del = max(keep, del + a[i]);                      // uses the OLD keep   @del
        keep = max<long long>(a[i], keep + a[i]);         // @keep
        best = max({best, keep, del});                    // @best
    }
    return best;                                          // @done
}`,
    java: `
static long maxSumOneDeletion(int[] a) {
    final long NEG = Long.MIN_VALUE / 4;
    long keep = a[0], del = NEG, best = a[0];             // @init
    for (int i = 1; i < a.length; i++) {
        del = Math.max(keep, del + a[i]);                 // @del
        keep = Math.max(a[i], keep + a[i]);               // @keep
        best = Math.max(best, Math.max(keep, del));       // @best
    }
    return best;                                          // @done
}`,
    python: `
def max_sum_one_deletion(a):
    keep, dele, best = a[0], float('-inf'), a[0]          # @init
    for x in a[1:]:
        dele = max(keep, dele + x)                        # @del
        keep = max(x, keep + x)                           # @keep
        best = max(best, keep, dele)                      # @best
    return best                                           # @done`,
    js: `
function maxSumOneDeletion(a) {
  let keep = a[0], del = -Infinity, best = a[0];        // @init
  for (let i = 1; i < a.length; i++) {
    del = Math.max(keep, del + a[i]);                   // @del
    keep = Math.max(a[i], keep + a[i]);                 // @keep
    best = Math.max(best, keep, del);                   // @best
  }
  return best;                                          // @done
}`,
    c: `
long long max_sum_one_deletion(const int *a, int n) {
    const long long NEG = LLONG_MIN / 4;
    long long keep = a[0], del = NEG, best = a[0];        // @init
    for (int i = 1; i < n; i++) {
        long long d = del + a[i];
        del = keep > d ? keep : d;                        // @del
        keep = a[i] > keep + a[i] ? a[i] : keep + a[i];   // @keep
        if (keep > best) best = keep;
        if (del > best) best = del;                       // @best
    }
    return best;                                          // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      if (!n) throw new Error('Give at least one value.')
      const a = t.array('a', v, { label: 'a' })
      const G = t.grid('dp', [Array.from({ length: n }, () => null as number | string | null), Array.from({ length: n }, () => null as number | string | null)], {
        label: 'best sum of a subarray ending at i',
        rowLabels: ['keep (0 deleted)', 'del (1 deleted)'],
        colLabels: v.map((_, i) => String(i)),
      })
      let keep = v[0]
      let del = -Infinity
      let best = v[0]
      let bestCell: [number, number] = [0, 0]
      G.set(0, 0, keep)
      G.set(1, 0, '−∞')
      G.role(0, 0, 'best')
      a.ptr('i', 0).role(0, 'active')
      t.step('init', `keep[0] = ${v[0]}. del[0] = −∞: deleting the only element would leave an empty subarray, which is not allowed.`, { keep, del: fmt(del), best })
      for (let i = 1; i < n; i++) {
        const x = v[i]
        const pk = keep
        const pd = del
        const fromKeep = pk >= pd + x
        del = Math.max(pk, pd + x)
        G.set(1, i, del)
        a.clear().ptr('i', i).role(i, 'active')
        if (fromKeep) a.role(i, 'removed')
        G.clear().role(1, i, 'active').role(...bestCell, 'best')
        if (fromKeep) G.role(0, i - 1, 'compare').arrow([0, i - 1], [1, i], `skip ${x}`, 'removed')
        else G.role(1, i - 1, 'compare').arrow([1, i - 1], [1, i], `+${x}`, 'compare')
        t.step('del', fromKeep ? `del[${i}] = max(keep[${i - 1}] = ${pk} (delete a[${i}] = ${x}), del[${i - 1}] + ${x} = ${fmt(pd + x)}) = ${del}: deleting ${x} is better.` : `del[${i}] = max(keep[${i - 1}] = ${pk}, del[${i - 1}] + ${x} = ${pd + x}) = ${del}: keep extending the run whose deletion is already spent.`, { x, keep: pk, del, best })
        keep = Math.max(x, pk + x)
        G.set(0, i, keep)
        a.clear().ptr('i', i).role(i, 'active')
        G.clear().role(0, i, 'active').role(...bestCell, 'best')
        if (pk + x >= x) G.role(0, i - 1, 'compare').arrow([0, i - 1], [0, i], `+${x}`, 'compare')
        t.step('keep', `keep[${i}] = max(${x} alone, keep[${i - 1}] + ${x} = ${pk + x}) = ${keep} — ordinary Kadane.`, { x, keep, del, best })
        if (keep > best) {
          best = keep
          bestCell = [0, i]
        }
        if (del > best) {
          best = del
          bestCell = [1, i]
        }
        G.clear().role(...bestCell, 'best')
        t.step('best', `best = max(best, keep, del) = ${best}.`, { keep, del, best })
      }
      a.clear().ptr('i', null)
      G.clear().role(...bestCell, 'best')
      t.step('done', `Answer ${best}. Two numbers per index, each from the previous column: O(n) time, O(1) space.`, { best })
    }),
}

/* ───────────────────────── Boyer–Moore generalised: elements > n/3 ───────────────────────── */

export const arrMajorityN3: Algorithm = {
  id: 'arr-majority-n3',
  title: 'Elements appearing more than n/3 times — two candidates, triple cancellation',
  blurb: 'Throw away three different values at a time. A value with more than n/3 copies cannot be thrown away completely.',
  legend: { active: 'reading', found: 'candidate 1', best: 'candidate 2', removed: 'cancelled' },
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '1 2 3 1 2 1 2 3 1 2', maxLen: 12 }],
  random: () => {
    const n = rint(7, 11)
    const a = rarr(n, 1, 4)
    for (let i = 0; i < Math.ceil(n / 3) + 1; i++) a[rint(0, n - 1)] = 2
    return { arr: list(a) }
  },
  code: {
    pseudo: `
function majorityThird(a, n)
  c1 ← none; n1 ← 0; c2 ← none; n2 ← 0
  for x in a
    if x = c1: n1 ← n1 + 1                         // @match1
    else if x = c2: n2 ← n2 + 1                    // @match2
    else if n1 = 0: c1 ← x; n1 ← 1                 // @new1
    else if n2 = 0: c2 ← x; n2 ← 1                 // @new2
    else: n1 ← n1 − 1; n2 ← n2 − 1                 // three different values cancel   @cancel
  return the candidates that really occur > n/3 times   // @verify`,
    cpp: `
vector<int> majorityThird(const vector<int>& a) {
    int c1 = 0, c2 = 1, n1 = 0, n2 = 0;               // c1 != c2 initially
    for (int x : a) {
        if (x == c1) n1++;                              // @match1
        else if (x == c2) n2++;                         // @match2
        else if (n1 == 0) { c1 = x; n1 = 1; }           // @new1
        else if (n2 == 0) { c2 = x; n2 = 1; }           // @new2
        else { n1--; n2--; }                            // @cancel
    }
    vector<int> out;
    for (int c : {c1, c2})
        if (count(a.begin(), a.end(), c) * 3 > (long long)a.size()) out.push_back(c);   // @verify
    if (out.size() == 2 && out[0] == out[1]) out.pop_back();
    return out;
}`,
    java: `
static List<Integer> majorityThird(int[] a) {
    int c1 = 0, c2 = 1, n1 = 0, n2 = 0;
    for (int x : a) {
        if (x == c1) n1++;                              // @match1
        else if (x == c2) n2++;                         // @match2
        else if (n1 == 0) { c1 = x; n1 = 1; }           // @new1
        else if (n2 == 0) { c2 = x; n2 = 1; }           // @new2
        else { n1--; n2--; }                            // @cancel
    }
    List<Integer> out = new ArrayList<>();
    for (int c : new int[]{c1, c2}) {
        int cnt = 0; for (int x : a) if (x == c) cnt++;
        if (3L * cnt > a.length && !out.contains(c)) out.add(c);   // @verify
    }
    return out;
}`,
    python: `
def majority_third(a):
    c1, c2, n1, n2 = None, None, 0, 0
    for x in a:
        if x == c1: n1 += 1                             # @match1
        elif x == c2: n2 += 1                           # @match2
        elif n1 == 0: c1, n1 = x, 1                     # @new1
        elif n2 == 0: c2, n2 = x, 1                     # @new2
        else: n1 -= 1; n2 -= 1                          # @cancel
    return [c for c in (c1, c2)
            if c is not None and 3 * a.count(c) > len(a)]   # @verify`,
    js: `
function majorityThird(a) {
  let c1 = null, c2 = null, n1 = 0, n2 = 0;
  for (const x of a) {
    if (x === c1) n1++;                                 // @match1
    else if (x === c2) n2++;                            // @match2
    else if (n1 === 0) { c1 = x; n1 = 1; }              // @new1
    else if (n2 === 0) { c2 = x; n2 = 1; }              // @new2
    else { n1--; n2--; }                                // @cancel
  }
  return [c1, c2].filter((c) => c !== null && 3 * a.filter((x) => x === c).length > a.length);   // @verify
}`,
    c: `
int majority_third(const int *a, int n, int *out) {
    int c1 = 0, c2 = 1, n1 = 0, n2 = 0;
    for (int i = 0; i < n; i++) {
        int x = a[i];
        if (x == c1) n1++;                              // @match1
        else if (x == c2) n2++;                         // @match2
        else if (n1 == 0) { c1 = x; n1 = 1; }           // @new1
        else if (n2 == 0) { c2 = x; n2 = 1; }           // @new2
        else { n1--; n2--; }                            // @cancel
    }
    int k = 0, cand[2] = {c1, c2};
    for (int j = 0; j < 2; j++) {
        int cnt = 0; for (int i = 0; i < n; i++) cnt += a[i] == cand[j];
        if (3LL * cnt > n) out[k++] = cand[j];          // @verify
    }
    return k;
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      if (!n) throw new Error('Give at least one value.')
      const a = t.array('a', v, { label: 'a' })
      const S1 = t.stack('s1', 'candidate 1: uncancelled votes')
      const S2 = t.stack('s2', 'candidate 2: uncancelled votes')
      let c1: number | null = null
      let c2: number | null = null
      let n1 = 0
      let n2 = 0
      const vars = (x: number) => ({ x, c1: c1 ?? '—', n1, c2: c2 ?? '—', n2 })
      for (let i = 0; i < n; i++) {
        const x = v[i]
        a.clear().ptr('i', i).role(i, 'active')
        for (let d = 0; d < i; d++) a.role(d, 'dim')
        S1.clear()
        S2.clear()
        if (x === c1) {
          n1++
          S1.push(x)
          S1.role(S1.length - 1, 'new')
          t.step('match1', `${x} equals candidate 1: one more vote for it (n1 = ${n1}).`, vars(x))
        } else if (x === c2) {
          n2++
          S2.push(x)
          S2.role(S2.length - 1, 'new')
          t.step('match2', `${x} equals candidate 2: one more vote (n2 = ${n2}).`, vars(x))
        } else if (n1 === 0) {
          c1 = x
          n1 = 1
          S1.items = []
          S1.push(x)
          S1.role(0, 'new')
          t.step('new1', `Candidate 1 has no votes left, so ${x} takes over slot 1.`, vars(x))
        } else if (n2 === 0) {
          c2 = x
          n2 = 1
          S2.items = []
          S2.push(x)
          S2.role(0, 'new')
          t.step('new2', `Slot 2 is free: ${x} becomes candidate 2.`, vars(x))
        } else {
          n1--
          n2--
          a.role(i, 'removed')
          S1.role(S1.length - 1, 'removed')
          S2.role(S2.length - 1, 'removed')
          t.step('cancel', `${x} differs from both candidates (${c1} and ${c2}). Throw away three different values at once: ${x}, one ${c1} vote and one ${c2} vote.`, vars(x))
          S1.pop()
          S2.pop()
          S1.clear()
          S2.clear()
        }
      }
      a.clear().ptr('i', null)
      const res: number[] = []
      for (const c of [c1, c2]) {
        if (c === null) continue
        const cnt = v.filter((x) => x === c).length
        a.clear()
        v.forEach((x, i) => {
          if (x === c) a.role(i, cnt * 3 > n ? 'found' : 'compare')
        })
        if (cnt * 3 > n && !res.includes(c)) res.push(c)
        t.step('verify', `Verify candidate ${c}: it occurs ${cnt} times; n/3 = ${(n / 3).toFixed(2)}, so it ${cnt * 3 > n ? 'IS' : 'is NOT'} in the answer.`, { candidate: c, count: cnt, 'n/3': Number((n / 3).toFixed(2)) })
      }
      a.clear()
      t.step('verify', `Answer: ${res.length ? res.join(', ') : 'none'}. Each cancellation removes 3 distinct values, so at most n/3 cancellations happen — a value with more than n/3 copies survives as a candidate. O(n) time, O(1) space.`, { answer: res.join(' ') || '—' })
    }),
}

/* ───────────────────────── Rotate a square matrix 90° in place ───────────────────────── */

export const arrRotateMatrix: Algorithm = {
  id: 'arr-rotate-matrix',
  title: 'Rotate a matrix 90° clockwise in place — transpose, then reverse each row',
  blurb: 'Clockwise rotation sends (r, c) to (c, N−1−r). A transpose does (r, c) → (c, r); reversing rows then does (c, r) → (c, N−1−r).',
  legend: { swap: 'swapped', done: 'final', pivot: 'diagonal (stays)', dim: 'untouched' },
  inputs: [{ name: 'N', label: 'N', type: 'number', default: '4', min: 2, max: 5 }],
  random: () => ({ N: String(rint(2, 5)) }),
  code: {
    pseudo: `
function rotate(M, N)
  for r ← 0 to N − 1                     // transpose: mirror across the main diagonal
    for c ← r + 1 to N − 1
      swap M[r][c], M[c][r]               // @transpose
  for r ← 0 to N − 1                     // reverse every row
    for c ← 0 to N/2 − 1
      swap M[r][c], M[r][N − 1 − c]       // @reverse
  // @done`,
    cpp: `
void rotate(vector<vector<int>>& M) {
    int N = M.size();
    for (int r = 0; r < N; r++)
        for (int c = r + 1; c < N; c++) swap(M[r][c], M[c][r]);        // @transpose
    for (int r = 0; r < N; r++)
        for (int c = 0; c < N / 2; c++) swap(M[r][c], M[r][N - 1 - c]); // @reverse
}                                                                       // @done`,
    java: `
static void rotate(int[][] M) {
    int N = M.length;
    for (int r = 0; r < N; r++)
        for (int c = r + 1; c < N; c++) { int t = M[r][c]; M[r][c] = M[c][r]; M[c][r] = t; }   // @transpose
    for (int r = 0; r < N; r++)
        for (int c = 0; c < N / 2; c++) { int t = M[r][c]; M[r][c] = M[r][N-1-c]; M[r][N-1-c] = t; }   // @reverse
}                                                                       // @done`,
    python: `
def rotate(M):
    N = len(M)
    for r in range(N):
        for c in range(r + 1, N):
            M[r][c], M[c][r] = M[c][r], M[r][c]     # @transpose
    for row in M:
        row.reverse()                              # @reverse
    return M                                       # @done`,
    js: `
function rotate(M) {
  const N = M.length;
  for (let r = 0; r < N; r++)
    for (let c = r + 1; c < N; c++) [M[r][c], M[c][r]] = [M[c][r], M[r][c]];   // @transpose
  for (const row of M) row.reverse();                                      // @reverse
  return M;                                                                // @done
}`,
    c: `
void rotate(int N, int M[N][N]) {
    for (int r = 0; r < N; r++)
        for (int c = r + 1; c < N; c++) { int t = M[r][c]; M[r][c] = M[c][r]; M[c][r] = t; }   // @transpose
    for (int r = 0; r < N; r++)
        for (int c = 0; c < N / 2; c++) { int t = M[r][c]; M[r][c] = M[r][N-1-c]; M[r][N-1-c] = t; }   // @reverse
}                                                                       // @done`,
  },
  run: ({ N }) =>
    trace((t) => {
      const n = N as number
      const M = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r * n + c + 1))
      const G = t.grid('M', M.map((r) => [...r]), { label: `M (${n} × ${n})`, rowLabels: M.map((_, r) => String(r)), colLabels: M.map((_, c) => String(c)) })
      for (let d = 0; d < n; d++) G.role(d, d, 'pivot')
      t.step('transpose', `Goal: element at (r, c) must end at (c, ${n - 1} − r). Step 1 is the transpose: mirror across the diagonal (purple cells stay put).`, {})
      for (let r = 0; r < n; r++)
        for (let c = r + 1; c < n; c++) {
          ;[M[r][c], M[c][r]] = [M[c][r], M[r][c]]
          G.set(r, c, M[r][c])
          G.set(c, r, M[c][r])
          G.keep('pivot', 'done').role(r, c, 'swap').role(c, r, 'swap').arrow([r, c], [c, r], '⇄', 'swap')
          t.step('transpose', `Swap M[${r}][${c}] and M[${c}][${r}]. Only cells above the diagonal start a swap — doing both halves would swap twice and undo it.`, { r, c })
          G.role(r, c, 'done').role(c, r, 'done')
        }
      G.clear()
      t.step('transpose', 'Transposed: row r is now the old column r. Rotation needs the old column read bottom to top, so each row must be reversed.', {})
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < Math.floor(n / 2); c++) {
          ;[M[r][c], M[r][n - 1 - c]] = [M[r][n - 1 - c], M[r][c]]
          G.set(r, c, M[r][c])
          G.set(r, n - 1 - c, M[r][n - 1 - c])
          G.keep('done').role(r, c, 'swap').role(r, n - 1 - c, 'swap').arrow([r, c], [r, n - 1 - c], '⇄', 'swap')
          t.step('reverse', `Row ${r}: swap columns ${c} and ${n - 1 - c}.`, { r, c })
        }
        G.keep('done')
        for (let c = 0; c < n; c++) G.role(r, c, 'done')
      }
      G.clear()
      t.step('done', `Rotated 90° clockwise: the old first row (1…${n}) is now the last column, top to bottom. O(N²) time, O(1) extra space.`, {})
    }),
}

/* ───────────────────────── Set matrix zeroes in O(1) space ───────────────────────── */

export const arrSetZeroes: Algorithm = {
  id: 'arr-set-zeroes',
  title: 'Set matrix zeroes with O(1) extra space — the first row and column as markers',
  blurb: 'Record "row r needs zeroing" in M[r][0] and "column c needs zeroing" in M[0][c]. Two flags remember whether row 0 and column 0 themselves had zeros.',
  legend: { removed: 'original zero', pivot: 'marker written', found: 'zeroed', active: 'checking', window: 'marker row / column' },
  inputs: [{ name: 'M', label: 'Matrix (rows separated by ;)', type: 'string', default: '1 2 3 4; 5 0 7 8; 9 10 11 0; 13 14 15 16' }],
  random: () => {
    const R = rint(3, 4)
    const C = rint(3, 5)
    return { M: Array.from({ length: R }, () => Array.from({ length: C }, () => (Math.random() < 0.15 ? 0 : rint(1, 9))).join(' ')).join('; ') }
  },
  code: {
    pseudo: `
function setZeroes(M, R, C)
  row0 ← (row 0 has a zero); col0 ← (column 0 has a zero)       // @flags
  for r ← 1 to R − 1, c ← 1 to C − 1
    if M[r][c] = 0: M[r][0] ← 0; M[0][c] ← 0                     // @mark
  for r ← 1 to R − 1, c ← 1 to C − 1
    if M[r][0] = 0 or M[0][c] = 0: M[r][c] ← 0                   // @apply
  if row0: zero row 0
  if col0: zero column 0                                         // @edges`,
    cpp: `
void setZeroes(vector<vector<int>>& M) {
    int R = M.size(), C = M[0].size();
    bool row0 = false, col0 = false;
    for (int c = 0; c < C; c++) if (M[0][c] == 0) row0 = true;
    for (int r = 0; r < R; r++) if (M[r][0] == 0) col0 = true;              // @flags
    for (int r = 1; r < R; r++)
        for (int c = 1; c < C; c++)
            if (M[r][c] == 0) M[r][0] = M[0][c] = 0;                        // @mark
    for (int r = 1; r < R; r++)
        for (int c = 1; c < C; c++)
            if (M[r][0] == 0 || M[0][c] == 0) M[r][c] = 0;                  // @apply
    if (row0) for (int c = 0; c < C; c++) M[0][c] = 0;
    if (col0) for (int r = 0; r < R; r++) M[r][0] = 0;                      // @edges
}`,
    java: `
static void setZeroes(int[][] M) {
    int R = M.length, C = M[0].length;
    boolean row0 = false, col0 = false;
    for (int c = 0; c < C; c++) if (M[0][c] == 0) row0 = true;
    for (int r = 0; r < R; r++) if (M[r][0] == 0) col0 = true;              // @flags
    for (int r = 1; r < R; r++)
        for (int c = 1; c < C; c++)
            if (M[r][c] == 0) { M[r][0] = 0; M[0][c] = 0; }                 // @mark
    for (int r = 1; r < R; r++)
        for (int c = 1; c < C; c++)
            if (M[r][0] == 0 || M[0][c] == 0) M[r][c] = 0;                  // @apply
    if (row0) for (int c = 0; c < C; c++) M[0][c] = 0;
    if (col0) for (int r = 0; r < R; r++) M[r][0] = 0;                      // @edges
}`,
    python: `
def set_zeroes(M):
    R, C = len(M), len(M[0])
    row0 = any(M[0][c] == 0 for c in range(C))
    col0 = any(M[r][0] == 0 for r in range(R))              # @flags
    for r in range(1, R):
        for c in range(1, C):
            if M[r][c] == 0:
                M[r][0] = M[0][c] = 0                       # @mark
    for r in range(1, R):
        for c in range(1, C):
            if M[r][0] == 0 or M[0][c] == 0:
                M[r][c] = 0                                 # @apply
    if row0:
        M[0] = [0] * C
    if col0:
        for r in range(R): M[r][0] = 0                      # @edges`,
    js: `
function setZeroes(M) {
  const R = M.length, C = M[0].length;
  const row0 = M[0].some((x) => x === 0);
  const col0 = M.some((row) => row[0] === 0);              // @flags
  for (let r = 1; r < R; r++)
    for (let c = 1; c < C; c++)
      if (M[r][c] === 0) M[r][0] = M[0][c] = 0;            // @mark
  for (let r = 1; r < R; r++)
    for (let c = 1; c < C; c++)
      if (M[r][0] === 0 || M[0][c] === 0) M[r][c] = 0;     // @apply
  if (row0) M[0].fill(0);
  if (col0) for (const row of M) row[0] = 0;               // @edges
}`,
    c: `
void set_zeroes(int R, int C, int M[R][C]) {
    int row0 = 0, col0 = 0;
    for (int c = 0; c < C; c++) if (M[0][c] == 0) row0 = 1;
    for (int r = 0; r < R; r++) if (M[r][0] == 0) col0 = 1;                 // @flags
    for (int r = 1; r < R; r++)
        for (int c = 1; c < C; c++)
            if (M[r][c] == 0) M[r][0] = M[0][c] = 0;                        // @mark
    for (int r = 1; r < R; r++)
        for (int c = 1; c < C; c++)
            if (M[r][0] == 0 || M[0][c] == 0) M[r][c] = 0;                  // @apply
    if (row0) for (int c = 0; c < C; c++) M[0][c] = 0;
    if (col0) for (int r = 0; r < R; r++) M[r][0] = 0;                      // @edges
}`,
  },
  run: ({ M }) =>
    trace((t) => {
      const m = parseMatrix(String(M), 5, 6)
      const R = m.length
      const C = m[0].length
      const G = t.grid('M', m.map((r) => [...r]), { label: 'M', rowLabels: m.map((_, r) => String(r)), colLabels: m[0].map((_, c) => String(c)) })
      const zeros: [number, number][] = []
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (m[r][c] === 0) zeros.push([r, c])
      for (const [r, c] of zeros) G.role(r, c, 'removed')
      const row0 = m[0].some((x) => x === 0)
      const col0 = m.some((row) => row[0] === 0)
      for (let c = 0; c < C; c++) if (!G.roles[`0,${c}`]) G.role(0, c, 'window')
      for (let r = 0; r < R; r++) if (!G.roles[`${r},0`]) G.role(r, 0, 'window')
      t.step('flags', `Row 0 and column 0 will be reused as marker storage, so first remember whether they contain a zero themselves: row0 = ${row0}, col0 = ${col0}.`, { row0: String(row0), col0: String(col0) })
      for (let r = 1; r < R; r++)
        for (let c = 1; c < C; c++)
          if (m[r][c] === 0) {
            m[r][0] = 0
            m[0][c] = 0
            G.set(r, 0, 0)
            G.set(0, c, 0)
            G.clear()
            for (const [zr, zc] of zeros) G.role(zr, zc, 'removed')
            G.role(r, 0, 'pivot').role(0, c, 'pivot').arrow([r, c], [r, 0], 'row', 'pivot').arrow([r, c], [0, c], 'col', 'pivot')
            t.step('mark', `M[${r}][${c}] = 0: write the marker M[${r}][0] = 0 ("row ${r} must be zeroed") and M[0][${c}] = 0 ("column ${c} must be zeroed"). Their old values are no longer needed — those cells will be zeroed anyway.`, { r, c })
          }
      G.clear()
      for (let r = 1; r < R; r++)
        for (let c = 1; c < C; c++) {
          if ((m[r][0] === 0 || m[0][c] === 0) && m[r][c] !== 0) {
            const was = m[r][c]
            m[r][c] = 0
            G.set(r, c, 0)
            G.keep('found')
            for (const [zr, zc] of zeros) G.role(zr, zc, 'removed')
            G.role(r, c, 'found').role(r, 0, 'active').role(0, c, 'active')
            t.step('apply', `M[${r}][0] = ${m[r][0]}, M[0][${c}] = ${m[0][c]}: a marker is 0, so M[${r}][${c}] (was ${was}) becomes 0.`, { r, c })
          }
        }
      G.keep('found')
      if (row0) for (let c = 0; c < C; c++) {
        m[0][c] = 0
        G.set(0, c, 0)
        G.role(0, c, 'found')
      }
      if (col0) for (let r = 0; r < R; r++) {
        m[r][0] = 0
        G.set(r, 0, 0)
        G.role(r, 0, 'found')
      }
      t.step('edges', `Last, the marker row and column themselves: ${row0 ? 'row 0 had a zero, so zero it' : 'row 0 had no original zero'}; ${col0 ? 'column 0 had a zero, so zero it' : 'column 0 had no original zero'}. Doing this last keeps the markers readable until they are no longer needed. O(R·C) time, O(1) extra space.`, { row0: String(row0), col0: String(col0) })
    }),
}

/* ───────────────────────── Staircase search in a row- and column-sorted matrix ───────────────────────── */

export const arrStaircase: Algorithm = {
  id: 'arr-staircase',
  title: 'Search a row- and column-sorted matrix — the staircase from the top-right',
  blurb: 'At the top-right corner, everything left is smaller and everything below is larger. Each comparison deletes a whole row or column.',
  legend: { active: 'current corner', dim: 'eliminated', found: 'found' },
  inputs: [
    { name: 'M', label: 'Matrix (rows and columns sorted)', type: 'string', default: '1 4 7 11 15; 2 5 8 12 19; 3 6 9 16 22; 10 13 14 17 24; 18 21 23 26 30' },
    { name: 'x', label: 'Find x', type: 'number', default: '14' },
  ],
  random: () => {
    const R = rint(3, 5)
    const C = rint(3, 5)
    const rows = Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => 2 * r + 3 * c + rint(0, 1)))
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++) {
        if (c) rows[r][c] = Math.max(rows[r][c], rows[r][c - 1] + 1)
        if (r) rows[r][c] = Math.max(rows[r][c], rows[r - 1][c] + 1)
      }
    const flat = rows.flat()
    return { M: rows.map((r) => r.join(' ')).join('; '), x: String(Math.random() < 0.7 ? flat[rint(0, flat.length - 1)] : rint(1, 30)) }
  },
  code: {
    pseudo: `
function search(M, R, C, x)
  r ← 0; c ← C − 1                       // top-right corner   @start
  while r < R and c ≥ 0
    if M[r][c] = x: return (r, c)        // @found
    if M[r][c] > x: c ← c − 1            // whole column c is too big   @left
    else r ← r + 1                       // whole row r is too small   @down
  return not found                       // @miss`,
    cpp: `
pair<int,int> search(const vector<vector<int>>& M, int x) {
    int R = M.size(), C = M[0].size(), r = 0, c = C - 1;   // @start
    while (r < R && c >= 0) {
        if (M[r][c] == x) return {r, c};                    // @found
        if (M[r][c] > x) c--;                               // @left
        else r++;                                           // @down
    }
    return {-1, -1};                                        // @miss
}`,
    java: `
static int[] search(int[][] M, int x) {
    int R = M.length, C = M[0].length, r = 0, c = C - 1;    // @start
    while (r < R && c >= 0) {
        if (M[r][c] == x) return new int[]{r, c};           // @found
        if (M[r][c] > x) c--;                               // @left
        else r++;                                           // @down
    }
    return new int[]{-1, -1};                               // @miss
}`,
    python: `
def search(M, x):
    R, C = len(M), len(M[0])
    r, c = 0, C - 1                          # @start
    while r < R and c >= 0:
        if M[r][c] == x:                     # @found
            return r, c                      # @found
        if M[r][c] > x:
            c -= 1                           # @left
        else:
            r += 1                           # @down
    return -1, -1                            # @miss`,
    js: `
function search(M, x) {
  const R = M.length, C = M[0].length;
  let r = 0, c = C - 1;                                   // @start
  while (r < R && c >= 0) {
    if (M[r][c] === x) return [r, c];                     // @found
    if (M[r][c] > x) c--;                                 // @left
    else r++;                                             // @down
  }
  return [-1, -1];                                        // @miss
}`,
    c: `
int search(int R, int C, int M[R][C], int x, int *fr, int *fc) {
    int r = 0, c = C - 1;                                   // @start
    while (r < R && c >= 0) {
        if (M[r][c] == x) { *fr = r; *fc = c; return 1; }   // @found
        if (M[r][c] > x) c--;                               // @left
        else r++;                                           // @down
    }
    return 0;                                               // @miss
}`,
  },
  run: ({ M, x }) =>
    trace((t) => {
      const m = parseMatrix(String(M), 6, 6)
      const R = m.length
      const C = m[0].length
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++) {
          if (c && m[r][c] < m[r][c - 1]) throw new Error('Each row must be sorted ascending.')
          if (r && m[r][c] < m[r - 1][c]) throw new Error('Each column must be sorted ascending.')
        }
      const X = x as number
      const G = t.grid('M', m.map((r) => [...r]), { label: 'M (rows and columns sorted)', rowLabels: m.map((_, r) => String(r)), colLabels: m[0].map((_, c) => String(c)) })
      let r = 0
      let c = C - 1
      let steps = 0
      const paint = () => {
        G.clear()
        for (let rr = 0; rr < R; rr++) for (let cc = 0; cc < C; cc++) if (rr < r || cc > c) G.role(rr, cc, 'dim')
        if (r < R && c >= 0) G.role(r, c, 'active')
      }
      paint()
      t.step('start', `Start at the top-right, M[0][${C - 1}] = ${m[0][C - 1]}: the largest in its row and the smallest in its column. That makes every comparison decisive.`, { r, c, x: X })
      while (r < R && c >= 0) {
        steps++
        if (m[r][c] === X) {
          paint()
          G.role(r, c, 'found')
          t.step('found', `M[${r}][${c}] = ${X}. Found after ${steps} comparisons; at most R + C − 1 = ${R + C - 1} are ever needed.`, { r, c, x: X, steps })
          return
        }
        if (m[r][c] > X) {
          const v = m[r][c]
          c--
          paint()
          t.step('left', `${v} > ${X}: everything below ${v} in column ${c + 1} is even bigger — the whole column is out. Move left.`, { r, c, x: X, steps })
        } else {
          const v = m[r][c]
          r++
          paint()
          t.step('down', `${v} < ${X}: everything left of ${v} in row ${r - 1} is even smaller — the whole row is out. Move down.`, { r, c, x: X, steps })
        }
      }
      paint()
      t.step('miss', `Walked off the matrix: ${X} is not present. ${steps} comparisons.`, { x: X, steps })
    }),
}

export const algorithms4: Algorithm[] = [arrMaxProduct, arrCircularKadane, arrOneDeletion, arrMajorityN3, arrRotateMatrix, arrSetZeroes, arrStaircase]
