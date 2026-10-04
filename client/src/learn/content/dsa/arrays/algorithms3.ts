import { trace } from '../../../engine/tracer'
import type { Algorithm, Range } from '../../../engine/types'
import { list, rarr, rint } from '../../../algorithms/util'

/*
 * Arrays — k-sum, water problems, window counting and the monotonic deque.
 */

/* ───────────────────────── 3-sum with de-duplication ───────────────────────── */

export const arrThreeSum: Algorithm = {
  id: 'arr-three-sum',
  title: '3-sum — fix one, two-pointer the rest, skip duplicates',
  blurb: 'Sort, then for each anchor a[i] find pairs in a[i+1..] summing to −a[i]. Skipping equal neighbours makes every triplet appear once.',
  legend: { pivot: 'anchor a[i]', active: 'lo / hi', found: 'triplet', dim: 'ruled out', removed: 'duplicate skipped' },
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '-1 0 1 2 -1 -4 2', maxLen: 10 }],
  random: () => ({ arr: list(rarr(rint(6, 9), -4, 4)) }),
  code: {
    pseudo: `
function threeSum(a, n)
  sort a                                       // @sort
  for i ← 0 to n − 3
    if i > 0 and a[i] = a[i−1]: continue       // same anchor again   @skip-i
    if a[i] > 0: break                         // three positives can't sum to 0   @stop
    lo ← i + 1; hi ← n − 1                     // @fix
    while lo < hi
      s ← a[i] + a[lo] + a[hi]                 // @sum
      if s < 0: lo ← lo + 1                    // @move-lo
      else if s > 0: hi ← hi − 1               // @move-hi
      else
        report (a[i], a[lo], a[hi])            // @found
        while lo < hi and a[lo] = a[lo+1]: lo ← lo + 1   // @skip-dup
        while lo < hi and a[hi] = a[hi−1]: hi ← hi − 1   // @skip-dup
        lo ← lo + 1; hi ← hi − 1
  // @done`,
    cpp: `
vector<array<int,3>> threeSum(vector<int> a) {
    sort(a.begin(), a.end());                                  // @sort
    vector<array<int,3>> out;
    int n = a.size();
    for (int i = 0; i + 2 < n; i++) {
        if (i > 0 && a[i] == a[i - 1]) continue;               // @skip-i
        if (a[i] > 0) break;                                   // @stop
        int lo = i + 1, hi = n - 1;                            // @fix
        while (lo < hi) {
            int s = a[i] + a[lo] + a[hi];                      // @sum
            if (s < 0) lo++;                                   // @move-lo
            else if (s > 0) hi--;                              // @move-hi
            else {
                out.push_back({a[i], a[lo], a[hi]});           // @found
                while (lo < hi && a[lo] == a[lo + 1]) lo++;    // @skip-dup
                while (lo < hi && a[hi] == a[hi - 1]) hi--;    // @skip-dup
                lo++; hi--;
            }
        }
    }
    return out;                                                // @done
}`,
    java: `
static List<int[]> threeSum(int[] a) {
    Arrays.sort(a);                                            // @sort
    List<int[]> out = new ArrayList<>();
    int n = a.length;
    for (int i = 0; i + 2 < n; i++) {
        if (i > 0 && a[i] == a[i - 1]) continue;               // @skip-i
        if (a[i] > 0) break;                                   // @stop
        int lo = i + 1, hi = n - 1;                            // @fix
        while (lo < hi) {
            int s = a[i] + a[lo] + a[hi];                      // @sum
            if (s < 0) lo++;                                   // @move-lo
            else if (s > 0) hi--;                              // @move-hi
            else {
                out.add(new int[]{a[i], a[lo], a[hi]});        // @found
                while (lo < hi && a[lo] == a[lo + 1]) lo++;    // @skip-dup
                while (lo < hi && a[hi] == a[hi - 1]) hi--;    // @skip-dup
                lo++; hi--;
            }
        }
    }
    return out;                                                // @done
}`,
    python: `
def three_sum(a):
    a = sorted(a)                                  # @sort
    out, n = [], len(a)
    for i in range(n - 2):
        if i > 0 and a[i] == a[i - 1]:             # @skip-i
            continue                               # @skip-i
        if a[i] > 0:                               # @stop
            break                                  # @stop
        lo, hi = i + 1, n - 1                      # @fix
        while lo < hi:
            s = a[i] + a[lo] + a[hi]               # @sum
            if s < 0:
                lo += 1                            # @move-lo
            elif s > 0:
                hi -= 1                            # @move-hi
            else:
                out.append((a[i], a[lo], a[hi]))   # @found
                while lo < hi and a[lo] == a[lo + 1]: lo += 1   # @skip-dup
                while lo < hi and a[hi] == a[hi - 1]: hi -= 1   # @skip-dup
                lo += 1; hi -= 1
    return out                                     # @done`,
    js: `
function threeSum(arr) {
  const a = [...arr].sort((x, y) => x - y);                  // @sort
  const out = [], n = a.length;
  for (let i = 0; i + 2 < n; i++) {
    if (i > 0 && a[i] === a[i - 1]) continue;                // @skip-i
    if (a[i] > 0) break;                                     // @stop
    let lo = i + 1, hi = n - 1;                              // @fix
    while (lo < hi) {
      const s = a[i] + a[lo] + a[hi];                        // @sum
      if (s < 0) lo++;                                       // @move-lo
      else if (s > 0) hi--;                                  // @move-hi
      else {
        out.push([a[i], a[lo], a[hi]]);                      // @found
        while (lo < hi && a[lo] === a[lo + 1]) lo++;         // @skip-dup
        while (lo < hi && a[hi] === a[hi - 1]) hi--;         // @skip-dup
        lo++; hi--;
      }
    }
  }
  return out;                                                // @done
}`,
    c: `
int cmp_int(const void *x, const void *y) { int a = *(const int *)x, b = *(const int *)y; return (a > b) - (a < b); }
int three_sum(int *a, int n, int out[][3]) {
    qsort(a, n, sizeof(int), cmp_int);                         // @sort
    int k = 0;
    for (int i = 0; i + 2 < n; i++) {
        if (i > 0 && a[i] == a[i - 1]) continue;               // @skip-i
        if (a[i] > 0) break;                                   // @stop
        int lo = i + 1, hi = n - 1;                            // @fix
        while (lo < hi) {
            int s = a[i] + a[lo] + a[hi];                      // @sum
            if (s < 0) lo++;                                   // @move-lo
            else if (s > 0) hi--;                              // @move-hi
            else {
                out[k][0] = a[i]; out[k][1] = a[lo]; out[k][2] = a[hi]; k++;   // @found
                while (lo < hi && a[lo] == a[lo + 1]) lo++;    // @skip-dup
                while (lo < hi && a[hi] == a[hi - 1]) hi--;    // @skip-dup
                lo++; hi--;
            }
        }
    }
    return k;                                                  // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = [...(arr as number[])].sort((x, y) => x - y)
      const n = v.length
      if (n < 3) throw new Error('Give at least three values.')
      const a = t.array('a', arr as number[], { label: 'a' })
      t.step('sort', 'The input as given. Sorting first is what makes the pointer moves provable.', {})
      for (let i = 0; i < n; i++) a.set(i, v[i])
      a.clear()
      t.step('sort', `Sorted: ${v.join(' ')}. Now for every anchor a[i], we need a pair to its right summing to −a[i].`, {})
      let found = 0
      const paint = (i: number, lo: number, hi: number) => {
        a.clear().ptr('i', i).ptr('lo', lo).ptr('hi', hi).role(i, 'pivot')
        for (let d = 0; d < i; d++) a.role(d, 'dim')
        for (let d = i + 1; d < lo; d++) a.role(d, 'dim')
        for (let d = hi + 1; d < n; d++) a.role(d, 'dim')
        if (lo < n) a.role(lo, 'active')
        if (hi > i) a.role(hi, 'active')
      }
      for (let i = 0; i + 2 < n; i++) {
        if (i > 0 && v[i] === v[i - 1]) {
          a.clear().ptr('i', i).ptr('lo', null).ptr('hi', null).role(i, 'removed')
          t.step('skip-i', `a[${i}] = ${v[i]} equals the previous anchor: every triplet it could start was already reported. Skip.`, { i, found })
          continue
        }
        if (v[i] > 0) {
          a.clear().ptr('i', i).ptr('lo', null).ptr('hi', null).role(i, 'pivot')
          t.step('stop', `a[${i}] = ${v[i]} > 0: everything from here on is positive, so no triplet can sum to 0. Stop early.`, { i, found })
          break
        }
        let lo = i + 1
        let hi = n - 1
        paint(i, lo, hi)
        t.step('fix', `Anchor a[${i}] = ${v[i]}: search a[${lo}..${hi}] for a pair summing to ${-v[i]}.`, { i, lo, hi, need: -v[i], found })
        while (lo < hi) {
          const s = v[i] + v[lo] + v[hi]
          paint(i, lo, hi)
          t.step('sum', `${v[i]} + ${v[lo]} + ${v[hi]} = ${s}.`, { i, lo, hi, sum: s, found })
          if (s < 0) {
            lo++
            paint(i, lo, hi)
            t.step('move-lo', `${s} < 0: a[lo] = ${v[lo - 1]} is too small even with the largest partner a[hi] — discard it.`, { i, lo, hi, found })
          } else if (s > 0) {
            hi--
            paint(i, lo, hi)
            t.step('move-hi', `${s} > 0: a[hi] = ${v[hi + 1]} is too big even with the smallest partner a[lo] — discard it.`, { i, lo, hi, found })
          } else {
            found++
            t.print(`(${v[i]}, ${v[lo]}, ${v[hi]})`)
            paint(i, lo, hi)
            a.role(i, 'found').role(lo, 'found').role(hi, 'found')
            t.step('found', `Triplet (${v[i]}, ${v[lo]}, ${v[hi]}) sums to 0.`, { i, lo, hi, found })
            let skipped = false
            while (lo < hi && v[lo] === v[lo + 1]) {
              lo++
              skipped = true
            }
            while (lo < hi && v[hi] === v[hi - 1]) {
              hi--
              skipped = true
            }
            lo++
            hi--
            paint(i, lo, Math.max(hi, i + 1))
            t.step('skip-dup', skipped ? 'Step lo past every copy of its value and hi past every copy of its value — otherwise the same triplet would be reported again.' : 'Move both pointers inward: with a[lo] fixed, only a different a[hi] could work, and vice versa.', { i, lo, hi, found })
          }
        }
      }
      a.clear().ptr('i', null).ptr('lo', null).ptr('hi', null)
      t.step('done', `${found} distinct triplet${found === 1 ? '' : 's'}. Each anchor runs one O(n) two-pointer scan: O(n²) total after the O(n log n) sort.`, { found })
    }),
}

/* ───────────────────────── Container with most water ───────────────────────── */

export const arrContainer: Algorithm = {
  id: 'arr-container',
  title: 'Container with most water — always move the shorter wall',
  blurb: 'The shorter wall limits the height. Keeping it while narrowing can never help, so it is discarded.',
  legend: { active: 'walls', window: 'water now', best: 'best so far', dim: 'discarded' },
  inputs: [{ name: 'arr', label: 'Heights', type: 'array', default: '1 8 6 2 5 4 8 3 7', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(7, 11), 1, 9)) }),
  code: {
    pseudo: `
function maxArea(h, n)
  lo ← 0; hi ← n − 1; best ← 0                          // @init
  while lo < hi
    area ← (hi − lo) · min(h[lo], h[hi])                // @area
    best ← max(best, area)
    if h[lo] < h[hi]: lo ← lo + 1                       // @move-lo
    else hi ← hi − 1                                    // @move-hi
  return best                                           // @done`,
    cpp: `
long long maxArea(const vector<int>& h) {
    int lo = 0, hi = (int)h.size() - 1; long long best = 0;   // @init
    while (lo < hi) {
        long long area = 1LL * (hi - lo) * min(h[lo], h[hi]);   // @area
        best = max(best, area);
        if (h[lo] < h[hi]) lo++;                              // @move-lo
        else hi--;                                            // @move-hi
    }
    return best;                                              // @done
}`,
    java: `
static long maxArea(int[] h) {
    int lo = 0, hi = h.length - 1; long best = 0;             // @init
    while (lo < hi) {
        long area = (long) (hi - lo) * Math.min(h[lo], h[hi]);   // @area
        best = Math.max(best, area);
        if (h[lo] < h[hi]) lo++;                              // @move-lo
        else hi--;                                            // @move-hi
    }
    return best;                                              // @done
}`,
    python: `
def max_area(h):
    lo, hi, best = 0, len(h) - 1, 0                 # @init
    while lo < hi:
        area = (hi - lo) * min(h[lo], h[hi])        # @area
        best = max(best, area)
        if h[lo] < h[hi]:
            lo += 1                                 # @move-lo
        else:
            hi -= 1                                 # @move-hi
    return best                                     # @done`,
    js: `
function maxArea(h) {
  let lo = 0, hi = h.length - 1, best = 0;                  // @init
  while (lo < hi) {
    const area = (hi - lo) * Math.min(h[lo], h[hi]);        // @area
    best = Math.max(best, area);
    if (h[lo] < h[hi]) lo++;                                // @move-lo
    else hi--;                                              // @move-hi
  }
  return best;                                              // @done
}`,
    c: `
long long max_area(const int *h, int n) {
    int lo = 0, hi = n - 1; long long best = 0;               // @init
    while (lo < hi) {
        int m = h[lo] < h[hi] ? h[lo] : h[hi];
        long long area = (long long)(hi - lo) * m;            // @area
        if (area > best) best = area;
        if (h[lo] < h[hi]) lo++;                              // @move-lo
        else hi--;                                            // @move-hi
    }
    return best;                                              // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const h = arr as number[]
      const n = h.length
      if (n < 2) throw new Error('Give at least two heights.')
      const a = t.array('h', h, { label: 'wall heights', bars: true })
      let lo = 0
      let hi = n - 1
      let best = 0
      let bestR: Range | null = null
      const paint = () => {
        a.clear().ptr('lo', lo).ptr('hi', hi).role(lo, 'active').role(hi, 'active')
        for (let d = 0; d < lo; d++) a.role(d, 'dim')
        for (let d = hi + 1; d < n; d++) a.role(d, 'dim')
      }
      paint()
      t.step('init', 'Start with the widest container: the two outermost walls.', { lo, hi, best })
      while (lo < hi) {
        const ht = Math.min(h[lo], h[hi])
        const area = (hi - lo) * ht
        const improved = area > best
        if (improved) {
          best = area
          bestR = { from: lo, to: hi, role: 'best', label: `best ${best}` }
        }
        paint()
        a.range([{ from: lo, to: hi, role: 'window', label: `${hi - lo} × ${ht} = ${area}` }, ...(bestR && !improved ? [bestR] : [])])
        t.step('area', `Width ${hi - lo} × height min(${h[lo]}, ${h[hi]}) = ${area}.${improved ? ' New best.' : ''}`, { lo, hi, area, best })
        if (h[lo] < h[hi]) {
          lo++
          paint()
          a.range(bestR ? [bestR] : [])
          t.step('move-lo', `h[lo] = ${h[lo - 1]} is the shorter wall. Any container using it with a closer right wall is narrower and still at most ${h[lo - 1]} tall — never better than ${area}. Discard it.`, { lo, hi, best })
        } else {
          hi--
          paint()
          a.range(bestR ? [bestR] : [])
          t.step('move-hi', `h[hi] = ${h[hi + 1]} is the shorter (or equal) wall. Every container keeping it is narrower and no taller — discard it.`, { lo, hi, best })
        }
      }
      a.clear().ptr('lo', null).ptr('hi', null).range(bestR ? [bestR] : [])
      t.step('done', `Best area ${best}${bestR ? `, walls ${bestR.from} and ${bestR.to}` : ''}. Each step discards one wall with proof: n − 1 steps, O(n).`, { best })
    }),
}

/* ───────────────────────── Trapping rain water: prefix max arrays ───────────────────────── */

export const arrTrapPrefix: Algorithm = {
  id: 'arr-trap-prefix',
  title: 'Trapping rain water — precompute the tallest wall on each side',
  blurb: 'Water above bar i = min(tallest to the left, tallest to the right) − h[i]. Two sweeps build the maxima, a third adds the water.',
  legend: { active: 'i', write: 'just computed', found: 'water here', window: 'side considered' },
  inputs: [{ name: 'arr', label: 'Heights', type: 'array', default: '0 1 0 2 1 0 1 3 2 1 2 1', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(7, 11), 0, 5)) }),
  code: {
    pseudo: `
function trap(h, n)
  L[0] ← h[0]
  for i ← 1 to n − 1: L[i] ← max(L[i−1], h[i])         // @lmax
  R[n−1] ← h[n−1]
  for i ← n − 2 downto 0: R[i] ← max(R[i+1], h[i])     // @rmax
  total ← 0
  for i ← 0 to n − 1: total ← total + min(L[i], R[i]) − h[i]   // @water
  return total                                         // @done`,
    cpp: `
long long trap(const vector<int>& h) {
    int n = h.size();
    vector<int> L(n), R(n);
    L[0] = h[0];
    for (int i = 1; i < n; i++) L[i] = max(L[i - 1], h[i]);          // @lmax
    R[n - 1] = h[n - 1];
    for (int i = n - 2; i >= 0; i--) R[i] = max(R[i + 1], h[i]);     // @rmax
    long long total = 0;
    for (int i = 0; i < n; i++) total += min(L[i], R[i]) - h[i];     // @water
    return total;                                                    // @done
}`,
    java: `
static long trap(int[] h) {
    int n = h.length;
    int[] L = new int[n], R = new int[n];
    L[0] = h[0];
    for (int i = 1; i < n; i++) L[i] = Math.max(L[i - 1], h[i]);     // @lmax
    R[n - 1] = h[n - 1];
    for (int i = n - 2; i >= 0; i--) R[i] = Math.max(R[i + 1], h[i]);   // @rmax
    long total = 0;
    for (int i = 0; i < n; i++) total += Math.min(L[i], R[i]) - h[i];   // @water
    return total;                                                    // @done
}`,
    python: `
def trap(h):
    n = len(h)
    L, R = h[:], h[:]
    for i in range(1, n):
        L[i] = max(L[i - 1], h[i])                  # @lmax
    for i in range(n - 2, -1, -1):
        R[i] = max(R[i + 1], h[i])                  # @rmax
    total = 0
    for i in range(n):
        total += min(L[i], R[i]) - h[i]             # @water
    return total                                    # @done`,
    js: `
function trap(h) {
  const n = h.length, L = h.slice(), R = h.slice();
  for (let i = 1; i < n; i++) L[i] = Math.max(L[i - 1], h[i]);      // @lmax
  for (let i = n - 2; i >= 0; i--) R[i] = Math.max(R[i + 1], h[i]); // @rmax
  let total = 0;
  for (let i = 0; i < n; i++) total += Math.min(L[i], R[i]) - h[i]; // @water
  return total;                                                     // @done
}`,
    c: `
long long trap(const int *h, int n, int *L, int *R) {
    L[0] = h[0];
    for (int i = 1; i < n; i++) L[i] = L[i - 1] > h[i] ? L[i - 1] : h[i];       // @lmax
    R[n - 1] = h[n - 1];
    for (int i = n - 2; i >= 0; i--) R[i] = R[i + 1] > h[i] ? R[i + 1] : h[i];  // @rmax
    long long total = 0;
    for (int i = 0; i < n; i++) total += (L[i] < R[i] ? L[i] : R[i]) - h[i];    // @water
    return total;                                                               // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const h = arr as number[]
      const n = h.length
      if (n < 1) throw new Error('Give at least one height.')
      if (h.some((x) => x < 0)) throw new Error('Heights must be non-negative.')
      const H = t.array('h', h, { label: 'h (bars)', bars: true })
      const L = t.array('L', Array.from({ length: n }, () => null), { label: 'L[i] = tallest in h[0..i]' })
      const R = t.array('R', Array.from({ length: n }, () => null), { label: 'R[i] = tallest in h[i..n−1]' })
      const W = t.array('W', Array.from({ length: n }, () => null), { label: 'water above i = min(L, R) − h' })
      const l: number[] = []
      const r: number[] = Array.from({ length: n }, () => 0)
      for (let i = 0; i < n; i++) {
        l[i] = i ? Math.max(l[i - 1], h[i]) : h[i]
        L.set(i, l[i])
        H.clear().ptr('i', i).role(i, 'active').range([{ from: 0, to: i, role: 'window', label: 'left side' }])
        L.clear().role(i, 'write')
        t.step('lmax', i ? `L[${i}] = max(L[${i - 1}] = ${l[i - 1]}, h[${i}] = ${h[i]}) = ${l[i]}.` : `L[0] = h[0] = ${h[0]}.`, { i })
      }
      L.clear()
      for (let i = n - 1; i >= 0; i--) {
        r[i] = i < n - 1 ? Math.max(r[i + 1], h[i]) : h[i]
        R.set(i, r[i])
        H.clear().ptr('i', i).role(i, 'active').range([{ from: i, to: n - 1, role: 'window', label: 'right side' }])
        R.clear().role(i, 'write')
        t.step('rmax', i < n - 1 ? `R[${i}] = max(R[${i + 1}] = ${r[i + 1]}, h[${i}] = ${h[i]}) = ${r[i]}.` : `R[${n - 1}] = h[${n - 1}] = ${h[n - 1]}.`, { i })
      }
      R.clear()
      let total = 0
      for (let i = 0; i < n; i++) {
        const w = Math.min(l[i], r[i]) - h[i]
        total += w
        W.set(i, w)
        H.clear().ptr('i', i).role(i, 'active').range([])
        L.clear().role(i, 'compare')
        R.clear().role(i, 'compare')
        W.clear().role(i, w > 0 ? 'found' : 'write')
        t.step('water', `Water above ${i}: min(${l[i]}, ${r[i]}) − ${h[i]} = ${w}. The lower of the two tallest walls sets the water level.`, { i, water: w, total })
      }
      H.clear().ptr('i', null)
      L.clear()
      R.clear()
      W.clear()
      t.step('done', `Total trapped water: ${total}. Three O(n) passes and two extra arrays: O(n) time, O(n) space.`, { total })
    }),
}

/* ───────────────────────── Trapping rain water: two pointers ───────────────────────── */

export const arrTrapTwo: Algorithm = {
  id: 'arr-trap-two',
  title: 'Trapping rain water — two pointers, O(1) space',
  blurb: 'Whichever side has the lower running maximum is the one whose water level is already known.',
  legend: { active: 'pointer', found: 'water settled', done: 'settled (no water)', dim: 'not yet' },
  inputs: [{ name: 'arr', label: 'Heights', type: 'array', default: '0 1 0 2 1 0 1 3 2 1 2 1', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(7, 11), 0, 5)) }),
  code: {
    pseudo: `
function trap(h, n)
  lo ← 0; hi ← n − 1; leftMax ← 0; rightMax ← 0; total ← 0   // @init
  while lo ≤ hi
    if leftMax ≤ rightMax                                     // left level is decided
      leftMax ← max(leftMax, h[lo])
      total ← total + leftMax − h[lo]; lo ← lo + 1            // @left
    else
      rightMax ← max(rightMax, h[hi])
      total ← total + rightMax − h[hi]; hi ← hi − 1           // @right
  return total                                                // @done`,
    cpp: `
long long trap(const vector<int>& h) {
    int lo = 0, hi = (int)h.size() - 1;
    long long leftMax = 0, rightMax = 0, total = 0;            // @init
    while (lo <= hi) {
        if (leftMax <= rightMax) {
            leftMax = max<long long>(leftMax, h[lo]);
            total += leftMax - h[lo++];                         // @left
        } else {
            rightMax = max<long long>(rightMax, h[hi]);
            total += rightMax - h[hi--];                        // @right
        }
    }
    return total;                                               // @done
}`,
    java: `
static long trap(int[] h) {
    int lo = 0, hi = h.length - 1;
    long leftMax = 0, rightMax = 0, total = 0;                 // @init
    while (lo <= hi) {
        if (leftMax <= rightMax) {
            leftMax = Math.max(leftMax, h[lo]);
            total += leftMax - h[lo++];                         // @left
        } else {
            rightMax = Math.max(rightMax, h[hi]);
            total += rightMax - h[hi--];                        // @right
        }
    }
    return total;                                               // @done
}`,
    python: `
def trap(h):
    lo, hi = 0, len(h) - 1
    left_max = right_max = total = 0              # @init
    while lo <= hi:
        if left_max <= right_max:
            left_max = max(left_max, h[lo])
            total += left_max - h[lo]             # @left
            lo += 1                               # @left
        else:
            right_max = max(right_max, h[hi])
            total += right_max - h[hi]            # @right
            hi -= 1                               # @right
    return total                                  # @done`,
    js: `
function trap(h) {
  let lo = 0, hi = h.length - 1, leftMax = 0, rightMax = 0, total = 0;   // @init
  while (lo <= hi) {
    if (leftMax <= rightMax) {
      leftMax = Math.max(leftMax, h[lo]);
      total += leftMax - h[lo++];                             // @left
    } else {
      rightMax = Math.max(rightMax, h[hi]);
      total += rightMax - h[hi--];                            // @right
    }
  }
  return total;                                               // @done
}`,
    c: `
long long trap(const int *h, int n) {
    int lo = 0, hi = n - 1;
    long long leftMax = 0, rightMax = 0, total = 0;            // @init
    while (lo <= hi) {
        if (leftMax <= rightMax) {
            if (h[lo] > leftMax) leftMax = h[lo];
            total += leftMax - h[lo++];                         // @left
        } else {
            if (h[hi] > rightMax) rightMax = h[hi];
            total += rightMax - h[hi--];                        // @right
        }
    }
    return total;                                               // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const h = arr as number[]
      const n = h.length
      if (n < 1) throw new Error('Give at least one height.')
      if (h.some((x) => x < 0)) throw new Error('Heights must be non-negative.')
      const H = t.array('h', h, { label: 'h (bars)', bars: true })
      const W = t.array('W', Array.from({ length: n }, () => null), { label: 'water settled above each bar' })
      let lo = 0
      let hi = n - 1
      let lm = 0
      let rm = 0
      let total = 0
      const settled = new Set<number>()
      const paint = () => {
        H.clear()
        if (lo <= hi) H.ptr('lo', lo).ptr('hi', hi)
        else H.ptr('lo', null).ptr('hi', null)
        for (const i of settled) H.role(i, (W.get(i) as number) > 0 ? 'found' : 'done')
      }
      paint()
      t.step('init', 'Both maxima start at 0. Invariant: leftMax is the tallest bar left of lo, rightMax the tallest right of hi.', { lo, hi, leftMax: lm, rightMax: rm, total })
      while (lo <= hi) {
        if (lm <= rm) {
          lm = Math.max(lm, h[lo])
          const w = lm - h[lo]
          total += w
          W.set(lo, w)
          settled.add(lo)
          paint()
          H.role(lo, 'active')
          W.clear().role(lo, w > 0 ? 'found' : 'write')
          t.step('left', `leftMax ≤ rightMax, so the left side is the bottleneck: some bar to the right is at least ${rm} ≥ leftMax. Bar ${lo}'s level is leftMax = ${lm}; water ${lm} − ${h[lo]} = ${w}.`, { lo, hi, leftMax: lm, rightMax: rm, total })
          lo++
        } else {
          rm = Math.max(rm, h[hi])
          const w = rm - h[hi]
          total += w
          W.set(hi, w)
          settled.add(hi)
          paint()
          H.role(hi, 'active')
          W.clear().role(hi, w > 0 ? 'found' : 'write')
          t.step('right', `rightMax < leftMax, so the right side is the bottleneck. Bar ${hi}'s level is rightMax = ${rm}; water ${rm} − ${h[hi]} = ${w}.`, { lo, hi, leftMax: lm, rightMax: rm, total })
          hi--
        }
      }
      paint()
      W.clear()
      t.step('done', `Total: ${total}. Every bar was settled exactly once by one pointer — O(n) time and O(1) extra space.`, { total })
    }),
}

/* ───────────────────────── Trapping rain water: monotonic stack ───────────────────────── */

export const arrTrapStack: Algorithm = {
  id: 'arr-trap-stack',
  title: 'Trapping rain water — a decreasing stack fills water layer by layer',
  blurb: 'Keep bar indices with decreasing heights. A taller bar closes a basin: pop its bottom and add one horizontal layer of water.',
  legend: { active: 'current bar', compare: 'basin floor', pivot: 'left wall', window: 'water layer added' },
  inputs: [{ name: 'arr', label: 'Heights', type: 'array', default: '4 2 0 3 2 5', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(6, 10), 0, 5)) }),
  code: {
    pseudo: `
function trap(h, n)
  stack ← empty; total ← 0
  for i ← 0 to n − 1
    while stack not empty and h[i] > h[top]          // bar i closes a basin
      floor ← pop()                                  // @pop
      if stack empty: break
      left ← top
      width ← i − left − 1
      depth ← min(h[left], h[i]) − h[floor]
      total ← total + width · depth                  // @fill
    push i                                           // @push
  return total                                       // @done`,
    cpp: `
long long trap(const vector<int>& h) {
    vector<int> st; long long total = 0;
    for (int i = 0; i < (int)h.size(); i++) {
        while (!st.empty() && h[i] > h[st.back()]) {
            int floor = st.back(); st.pop_back();               // @pop
            if (st.empty()) break;
            int left = st.back();
            long long width = i - left - 1;
            long long depth = min(h[left], h[i]) - h[floor];
            total += width * depth;                             // @fill
        }
        st.push_back(i);                                        // @push
    }
    return total;                                               // @done
}`,
    java: `
static long trap(int[] h) {
    int[] st = new int[h.length]; int top = 0; long total = 0;
    for (int i = 0; i < h.length; i++) {
        while (top > 0 && h[i] > h[st[top - 1]]) {
            int floor = st[--top];                              // @pop
            if (top == 0) break;
            int left = st[top - 1];
            long width = i - left - 1;
            long depth = Math.min(h[left], h[i]) - h[floor];
            total += width * depth;                             // @fill
        }
        st[top++] = i;                                          // @push
    }
    return total;                                               // @done
}`,
    python: `
def trap(h):
    st, total = [], 0
    for i, x in enumerate(h):
        while st and x > h[st[-1]]:
            floor = st.pop()                                    # @pop
            if not st:
                break
            left = st[-1]
            width = i - left - 1
            depth = min(h[left], x) - h[floor]
            total += width * depth                              # @fill
        st.append(i)                                            # @push
    return total                                                # @done`,
    js: `
function trap(h) {
  const st = []; let total = 0;
  for (let i = 0; i < h.length; i++) {
    while (st.length && h[i] > h[st[st.length - 1]]) {
      const floor = st.pop();                                 // @pop
      if (!st.length) break;
      const left = st[st.length - 1];
      const width = i - left - 1;
      const depth = Math.min(h[left], h[i]) - h[floor];
      total += width * depth;                                 // @fill
    }
    st.push(i);                                               // @push
  }
  return total;                                               // @done
}`,
    c: `
long long trap(const int *h, int n, int *st) {
    int top = 0; long long total = 0;
    for (int i = 0; i < n; i++) {
        while (top > 0 && h[i] > h[st[top - 1]]) {
            int floor = st[--top];                              // @pop
            if (top == 0) break;
            int left = st[top - 1];
            long long width = i - left - 1;
            int m = h[left] < h[i] ? h[left] : h[i];
            total += width * (m - h[floor]);                    // @fill
        }
        st[top++] = i;                                          // @push
    }
    return total;                                               // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const h = arr as number[]
      const n = h.length
      if (n < 1) throw new Error('Give at least one height.')
      if (h.some((x) => x < 0)) throw new Error('Heights must be non-negative.')
      const H = t.array('h', h, { label: 'h (bars)', bars: true })
      const S = t.stack('st', 'stack of indices (heights decrease upward)')
      const st: number[] = []
      let total = 0
      for (let i = 0; i < n; i++) {
        while (st.length && h[i] > h[st[st.length - 1]]) {
          const floor = st.pop()!
          S.pop()
          H.clear().ptr('i', i).role(i, 'active').role(floor, 'compare').range([])
          if (!st.length) {
            t.step('pop', `h[${i}] = ${h[i]} > h[${floor}] = ${h[floor]}: pop ${floor}. Nothing is left on the stack, so there is no left wall — water would spill out.`, { i, floor, total })
            break
          }
          const left = st[st.length - 1]
          H.role(left, 'pivot')
          t.step('pop', `h[${i}] = ${h[i]} > h[${floor}] = ${h[floor]}: pop the basin floor ${floor}. Its left wall is ${left} (height ${h[left]}).`, { i, floor, left, total })
          const width = i - left - 1
          const depth = Math.min(h[left], h[i]) - h[floor]
          total += width * depth
          H.range(width > 0 && depth > 0 ? [{ from: left + 1, to: i - 1, role: 'window', label: `+${width}×${depth}` }] : [])
          t.step('fill', `Layer between walls ${left} and ${i}: width ${width}, from height ${h[floor]} up to min(${h[left]}, ${h[i]}) = ${Math.min(h[left], h[i])}, so ${width} × ${depth} = ${width * depth}.`, { i, floor, left, total })
        }
        st.push(i)
        S.push(`${i} (h=${h[i]})`)
        S.clear().role(S.length - 1, 'new')
        H.clear().ptr('i', i).role(i, 'active').range([])
        t.step('push', `Push ${i}. The stack's heights still decrease from bottom to top, so every bar on it is still waiting for a taller bar to its right.`, { i, total })
        S.clear()
      }
      H.clear().ptr('i', null)
      t.step('done', `Total: ${total}. Each index is pushed once and popped at most once, so the nested loop is O(n) overall.`, { total })
    }),
}

/* ───────────────────────── Exactly K = atMost(K) − atMost(K − 1) ───────────────────────── */

export const arrAtMostK: Algorithm = {
  id: 'arr-at-most-k',
  title: 'Exactly k odd numbers — count "at most k", subtract "at most k − 1"',
  blurb: 'A window can count subarrays with at most k odds (each right end adds hi − lo + 1). Exactly k is the difference of two such counts.',
  legend: { window: 'valid window', active: 'hi', removed: 'dropped from the left', found: 'odd' },
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '1 1 2 1 1', maxLen: 10 },
    { name: 'k', label: 'k (odd numbers)', type: 'number', default: '3', min: 1, max: 6 },
  ],
  random: () => ({ arr: list(rarr(rint(5, 8), 1, 6)), k: String(rint(1, 3)) }),
  code: {
    pseudo: `
function atMost(a, n, k)                 // subarrays with ≤ k odd numbers
  lo ← 0; odd ← 0; count ← 0
  for hi ← 0 to n − 1
    odd ← odd + (a[hi] is odd)           // @add
    while odd > k                        // @shrink
      odd ← odd − (a[lo] is odd); lo ← lo + 1
    count ← count + (hi − lo + 1)        // every start in [lo, hi] works   @count
  return count
function exactly(a, n, k)
  return atMost(a, n, k) − atMost(a, n, k − 1)   // @combine`,
    cpp: `
long long atMost(const vector<int>& a, int k) {
    long long count = 0; int lo = 0, odd = 0;
    for (int hi = 0; hi < (int)a.size(); hi++) {
        odd += a[hi] & 1;                                  // @add
        while (odd > k) odd -= a[lo++] & 1;                // @shrink
        count += hi - lo + 1;                              // @count
    }
    return count;
}
long long exactly(const vector<int>& a, int k) {
    return atMost(a, k) - atMost(a, k - 1);                // @combine
}`,
    java: `
static long atMost(int[] a, int k) {
    long count = 0; int lo = 0, odd = 0;
    for (int hi = 0; hi < a.length; hi++) {
        odd += a[hi] & 1;                                  // @add
        while (odd > k) odd -= a[lo++] & 1;                // @shrink
        count += hi - lo + 1;                              // @count
    }
    return count;
}
static long exactly(int[] a, int k) {
    return atMost(a, k) - atMost(a, k - 1);                // @combine
}`,
    python: `
def at_most(a, k):
    count = lo = odd = 0
    for hi, x in enumerate(a):
        odd += x & 1                                       # @add
        while odd > k:                                     # @shrink
            odd -= a[lo] & 1                               # @shrink
            lo += 1                                        # @shrink
        count += hi - lo + 1                               # @count
    return count

def exactly(a, k):
    return at_most(a, k) - at_most(a, k - 1)               # @combine`,
    js: `
function atMost(a, k) {
  let count = 0, lo = 0, odd = 0;
  for (let hi = 0; hi < a.length; hi++) {
    odd += a[hi] & 1;                                      // @add
    while (odd > k) odd -= a[lo++] & 1;                    // @shrink
    count += hi - lo + 1;                                  // @count
  }
  return count;
}
const exactly = (a, k) => atMost(a, k) - atMost(a, k - 1); // @combine`,
    c: `
long long at_most(const int *a, int n, int k) {
    long long count = 0; int lo = 0, odd = 0;
    for (int hi = 0; hi < n; hi++) {
        odd += a[hi] & 1;                                  // @add
        while (odd > k) odd -= a[lo++] & 1;                // @shrink
        count += hi - lo + 1;                              // @count
    }
    return count;
}
long long exactly(const int *a, int n, int k) {
    return at_most(a, n, k) - at_most(a, n, k - 1);       // @combine
}`,
  },
  run: ({ arr, k }) =>
    trace((t) => {
      const v = arr as number[]
      const K = k as number
      const a = t.array('a', v, { label: 'a (odd values highlighted)' })
      const results: number[] = []
      for (const kk of [K, K - 1]) {
        let lo = 0
        let odd = 0
        let count = 0
        const paintOdd = () => {
          for (let i = 0; i < v.length; i++) if (Math.abs(v[i]) % 2 === 1 && a.roles[i] === undefined) a.role(i, 'found')
        }
        for (let hi = 0; hi < v.length; hi++) {
          odd += Math.abs(v[hi]) % 2
          a.clear().ptr('lo', lo).ptr('hi', hi).role(hi, 'active').range([{ from: lo, to: hi, role: 'window', label: `${odd} odd` }])
          paintOdd()
          t.step('add', `Pass "at most ${kk}": add a[${hi}] = ${v[hi]}${v[hi] % 2 ? ' (odd)' : ''} → window has ${odd} odd.`, { pass: `≤ ${kk}`, lo, hi, odd, count })
          if (odd > kk) {
            while (odd > kk) {
              odd -= Math.abs(v[lo]) % 2
              a.role(lo, 'removed')
              lo++
            }
            a.ptr('lo', lo).range([{ from: lo, to: hi, role: 'window', label: `${odd} odd` }])
            t.step('shrink', `More than ${kk} odd: drop from the left until valid — lo = ${lo}. Any window starting earlier would also be invalid, so lo never needs to move back.`, { pass: `≤ ${kk}`, lo, hi, odd, count })
          }
          count += hi - lo + 1
          a.clear().ptr('lo', lo).ptr('hi', hi).range([{ from: lo, to: hi, role: 'window', label: `+${hi - lo + 1}` }])
          paintOdd()
          t.step('count', `Every subarray ending at ${hi} and starting in [${lo}, ${hi}] has ≤ ${kk} odd numbers: add ${hi - lo + 1} → ${count}.`, { pass: `≤ ${kk}`, lo, hi, odd, count })
        }
        results.push(count)
        a.clear().ptr('lo', null).ptr('hi', null).range([])
      }
      t.step('combine', `atMost(${K}) − atMost(${K - 1}) = ${results[0]} − ${results[1]} = ${results[0] - results[1]} subarrays with exactly ${K} odd numbers. "Exactly" is not monotone, but "at most" is — so count two monotone things and subtract.`, { 'at most k': results[0], 'at most k−1': results[1], exactly: results[0] - results[1] })
    }),
}

/* ───────────────────────── Longest subarray with at most K distinct values ───────────────────────── */

export const arrKDistinct: Algorithm = {
  id: 'arr-k-distinct',
  title: 'Longest subarray with at most k distinct values',
  blurb: 'A count map knows how many distinct values the window holds. When it exceeds k, shrink until some value’s count drops to zero.',
  legend: { window: 'window', best: 'best so far', active: 'entering', removed: 'leaving', new: 'count changed' },
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '1 2 1 2 3 3 2 2 4 1', maxLen: 12 },
    { name: 'k', label: 'k', type: 'number', default: '2', min: 1, max: 5 },
  ],
  random: () => ({ arr: list(rarr(rint(7, 11), 1, 4)), k: String(rint(1, 3)) }),
  code: {
    pseudo: `
function longestKDistinct(a, n, k)
  cnt ← empty map; lo ← 0; best ← 0
  for hi ← 0 to n − 1
    cnt[a[hi]] ← cnt[a[hi]] + 1                     // @add
    while size(cnt) > k                             // @shrink
      cnt[a[lo]] ← cnt[a[lo]] − 1
      if cnt[a[lo]] = 0: delete cnt[a[lo]]
      lo ← lo + 1
    best ← max(best, hi − lo + 1)                   // @best
  return best                                       // @done`,
    cpp: `
int longestKDistinct(const vector<int>& a, int k) {
    unordered_map<int, int> cnt; int lo = 0, best = 0;
    for (int hi = 0; hi < (int)a.size(); hi++) {
        cnt[a[hi]]++;                                         // @add
        while ((int)cnt.size() > k) {                         // @shrink
            if (--cnt[a[lo]] == 0) cnt.erase(a[lo]);
            lo++;
        }
        best = max(best, hi - lo + 1);                        // @best
    }
    return best;                                              // @done
}`,
    java: `
static int longestKDistinct(int[] a, int k) {
    HashMap<Integer, Integer> cnt = new HashMap<>(); int lo = 0, best = 0;
    for (int hi = 0; hi < a.length; hi++) {
        cnt.merge(a[hi], 1, Integer::sum);                    // @add
        while (cnt.size() > k) {                              // @shrink
            if (cnt.merge(a[lo], -1, Integer::sum) == 0) cnt.remove(a[lo]);
            lo++;
        }
        best = Math.max(best, hi - lo + 1);                   // @best
    }
    return best;                                              // @done
}`,
    python: `
def longest_k_distinct(a, k):
    cnt, lo, best = {}, 0, 0
    for hi, x in enumerate(a):
        cnt[x] = cnt.get(x, 0) + 1                            # @add
        while len(cnt) > k:                                   # @shrink
            cnt[a[lo]] -= 1                                   # @shrink
            if cnt[a[lo]] == 0:
                del cnt[a[lo]]
            lo += 1
        best = max(best, hi - lo + 1)                         # @best
    return best                                               # @done`,
    js: `
function longestKDistinct(a, k) {
  const cnt = new Map(); let lo = 0, best = 0;
  for (let hi = 0; hi < a.length; hi++) {
    cnt.set(a[hi], (cnt.get(a[hi]) ?? 0) + 1);               // @add
    while (cnt.size > k) {                                    // @shrink
      const c = cnt.get(a[lo]) - 1;
      if (c === 0) cnt.delete(a[lo]); else cnt.set(a[lo], c);
      lo++;
    }
    best = Math.max(best, hi - lo + 1);                       // @best
  }
  return best;                                                // @done
}`,
    c: `
/* values in 0..MAXV: a counting array replaces the map */
int longest_k_distinct(const int *a, int n, int k, int *cnt /* zeroed, size MAXV+1 */) {
    int lo = 0, best = 0, distinct = 0;
    for (int hi = 0; hi < n; hi++) {
        if (cnt[a[hi]]++ == 0) distinct++;                    // @add
        while (distinct > k) {                                // @shrink
            if (--cnt[a[lo]] == 0) distinct--;
            lo++;
        }
        if (hi - lo + 1 > best) best = hi - lo + 1;           // @best
    }
    return best;                                              // @done
}`,
  },
  run: ({ arr, k }) =>
    trace((t) => {
      const v = arr as number[]
      const K = k as number
      const M = 5
      const a = t.array('a', v, { label: 'a' })
      const H = t.hash('cnt', M, { label: 'cnt: value → count in window (value mod 5)' })
      const cnt = new Map<number, number>()
      const bucket = (x: number) => ((x % M) + M) % M
      const show = (x: number, role: 'new' | 'removed') => {
        const b = bucket(x)
        const at = H.buckets[b].findIndex((c) => String(c.v).startsWith(`${x}:`))
        const c = cnt.get(x) ?? 0
        if (c === 0) {
          if (at >= 0) H.remove(b, at)
          H.role(b, null, role)
        } else if (at >= 0) {
          H.set(b, at, `${x}:${c}`)
          H.role(b, at, role)
        } else H.role(b, H.insert(b, `${x}:${c}`), role)
      }
      let lo = 0
      let best = 0
      let bestR: Range | null = null
      for (let hi = 0; hi < v.length; hi++) {
        cnt.set(v[hi], (cnt.get(v[hi]) ?? 0) + 1)
        H.clear()
        show(v[hi], 'new')
        a.clear().ptr('lo', lo).ptr('hi', hi).role(hi, 'active').range([{ from: lo, to: hi, role: 'window', label: `${cnt.size} distinct` }, ...(bestR ? [bestR] : [])])
        t.step('add', `Add a[${hi}] = ${v[hi]} → its count is ${cnt.get(v[hi])}; the window holds ${cnt.size} distinct value${cnt.size > 1 ? 's' : ''}.`, { lo, hi, distinct: cnt.size, best })
        if (cnt.size > K) {
          while (cnt.size > K) {
            const x = v[lo]
            cnt.set(x, cnt.get(x)! - 1)
            if (cnt.get(x) === 0) cnt.delete(x)
            H.clear()
            show(x, 'removed')
            lo++
            a.clear().ptr('lo', lo).ptr('hi', hi).role(lo - 1, 'removed').range([{ from: lo, to: hi, role: 'window', label: `${cnt.size} distinct` }])
            t.step('shrink', cnt.has(x) ? `Too many distinct values: drop a[${lo - 1}] = ${x}. Its count falls to ${cnt.get(x)} — it is still inside, so still ${cnt.size} distinct; keep shrinking.` : `Drop a[${lo - 1}] = ${x}: its count reaches 0, so it leaves the map — ${cnt.size} distinct now.`, { lo, hi, distinct: cnt.size, best })
          }
        }
        if (hi - lo + 1 > best) {
          best = hi - lo + 1
          bestR = { from: lo, to: hi, role: 'best', label: `best ${best}` }
        }
        H.clear()
        a.clear().ptr('lo', lo).ptr('hi', hi).range(bestR && bestR.from === lo && bestR.to === hi ? [bestR] : [{ from: lo, to: hi, role: 'window', label: `len ${hi - lo + 1}` }, ...(bestR ? [bestR] : [])])
        t.step('best', `Window a[${lo}..${hi}] is valid, length ${hi - lo + 1}. Best = ${best}.`, { lo, hi, distinct: cnt.size, best })
      }
      a.clear().ptr('lo', null).ptr('hi', null).range(bestR ? [bestR] : [])
      t.step('done', `Longest subarray with at most ${K} distinct values: ${best}. Both pointers only move right — O(n) map operations.`, { best })
    }),
}

/* ───────────────────────── Sliding window maximum (monotonic deque) ───────────────────────── */

export const arrSlidingMax: Algorithm = {
  id: 'arr-sliding-max',
  title: 'Sliding window maximum — a deque of candidates',
  blurb: 'Keep indices whose values decrease from front to back. The front is always the window’s maximum; a new value evicts every smaller one behind it.',
  legend: { window: 'window', active: 'entering', removed: 'evicted (can never be max)', found: 'window max' },
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '1 3 -1 -3 5 3 6 7', maxLen: 12 },
    { name: 'k', label: 'Window size k', type: 'number', default: '3', min: 1, max: 6 },
  ],
  random: () => ({ arr: list(rarr(rint(7, 11), -5, 9)), k: String(rint(2, 4)) }),
  code: {
    pseudo: `
function windowMax(a, n, k)
  dq ← empty deque of indices; out ← []
  for i ← 0 to n − 1
    while dq not empty and a[dq.back] ≤ a[i]: dq.pop_back()   // @pop-back
    dq.push_back(i)                                           // @push
    if dq.front ≤ i − k: dq.pop_front()                       // slid out   @pop-front
    if i ≥ k − 1: out.append(a[dq.front])                     // @emit
  return out`,
    cpp: `
vector<int> windowMax(const vector<int>& a, int k) {
    deque<int> dq; vector<int> out;
    for (int i = 0; i < (int)a.size(); i++) {
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();   // @pop-back
        dq.push_back(i);                                            // @push
        if (dq.front() <= i - k) dq.pop_front();                    // @pop-front
        if (i >= k - 1) out.push_back(a[dq.front()]);               // @emit
    }
    return out;
}`,
    java: `
static int[] windowMax(int[] a, int k) {
    ArrayDeque<Integer> dq = new ArrayDeque<>();
    int[] out = new int[a.length - k + 1];
    for (int i = 0; i < a.length; i++) {
        while (!dq.isEmpty() && a[dq.peekLast()] <= a[i]) dq.pollLast();   // @pop-back
        dq.addLast(i);                                              // @push
        if (dq.peekFirst() <= i - k) dq.pollFirst();                // @pop-front
        if (i >= k - 1) out[i - k + 1] = a[dq.peekFirst()];         // @emit
    }
    return out;
}`,
    python: `
from collections import deque
def window_max(a, k):
    dq, out = deque(), []
    for i, x in enumerate(a):
        while dq and a[dq[-1]] <= x:                  # @pop-back
            dq.pop()                                  # @pop-back
        dq.append(i)                                  # @push
        if dq[0] <= i - k:                            # @pop-front
            dq.popleft()                              # @pop-front
        if i >= k - 1:
            out.append(a[dq[0]])                      # @emit
    return out`,
    js: `
function windowMax(a, k) {
  const dq = new Array(a.length); let head = 0, tail = 0;     // array-backed deque
  const out = [];
  for (let i = 0; i < a.length; i++) {
    while (tail > head && a[dq[tail - 1]] <= a[i]) tail--;    // @pop-back
    dq[tail++] = i;                                           // @push
    if (dq[head] <= i - k) head++;                            // @pop-front
    if (i >= k - 1) out.push(a[dq[head]]);                    // @emit
  }
  return out;
}`,
    c: `
int window_max(const int *a, int n, int k, int *dq, int *out) {
    int head = 0, tail = 0, m = 0;
    for (int i = 0; i < n; i++) {
        while (tail > head && a[dq[tail - 1]] <= a[i]) tail--;    // @pop-back
        dq[tail++] = i;                                           // @push
        if (dq[head] <= i - k) head++;                            // @pop-front
        if (i >= k - 1) out[m++] = a[dq[head]];                   // @emit
    }
    return m;
}`,
  },
  run: ({ arr, k }) =>
    trace((t) => {
      const v = arr as number[]
      const K = k as number
      if (K > v.length) throw new Error('k cannot exceed the array length.')
      const a = t.array('a', v, { label: 'a' })
      const Q = t.queue('dq', 'deque of indices (front = window max)')
      const out = t.array('out', [], { label: 'window maxima', capacity: v.length - K + 1 })
      const dq: number[] = []
      const sync = () => {
        Q.items = []
        for (const i of dq) Q.push(`${i}: ${v[i]}`)
      }
      for (let i = 0; i < v.length; i++) {
        const lo = Math.max(0, i - K + 1)
        a.clear().ptr('i', i).role(i, 'active').range([{ from: lo, to: i, role: 'window', label: `window` }])
        let popped = 0
        while (dq.length && v[dq[dq.length - 1]] <= v[i]) {
          const j = dq.pop()!
          a.role(j, 'removed')
          popped++
        }
        if (popped) {
          sync()
          t.step('pop-back', `a[${i}] = ${v[i]} arrives. ${popped} smaller-or-equal value${popped > 1 ? 's' : ''} at the back can never be a maximum again (${v[i]} is newer and at least as big) — evict ${popped > 1 ? 'them' : 'it'}.`, { i })
        }
        dq.push(i)
        sync()
        Q.clear().role(Q.length - 1, 'new')
        t.step('push', `Push index ${i}. Values in the deque still decrease from front to back.`, { i })
        Q.clear()
        if (dq[0] <= i - K) {
          const j = dq.shift()!
          sync()
          a.role(j, 'dim')
          t.step('pop-front', `Front index ${j} is outside the window [${i - K + 1}, ${i}] — drop it.`, { i })
        }
        if (i >= K - 1) {
          out.push(v[dq[0]])
          out.clear().role(out.length - 1, 'new')
          a.role(dq[0], 'found')
          Q.clear().role(0, 'found')
          t.step('emit', `Window a[${i - K + 1}..${i}]: the maximum is the front, a[${dq[0]}] = ${v[dq[0]]}.`, { i, max: v[dq[0]] })
          out.clear()
          Q.clear()
        }
      }
      a.clear().ptr('i', null).range([])
      t.step('emit', `Maxima: ${out.values().join(' ')}. Each index is pushed and popped at most once: O(n) total, versus O(n·k) for rescanning every window.`, {})
    }),
}

export const algorithms3: Algorithm[] = [arrThreeSum, arrContainer, arrTrapPrefix, arrTrapTwo, arrTrapStack, arrAtMostK, arrKDistinct, arrSlidingMax]
