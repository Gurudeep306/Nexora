import { trace } from '../engine/tracer'
import type { Algorithm } from '../engine/types'
import { list, rarr, rint, sorted } from './util'

/* ───────────────────────── 17. Difference array: many range additions ───────────────────────── */

function parseUpdates(s: string, n: number): [number, number, number][] {
  const out: [number, number, number][] = []
  for (const part of s.split(/[;|]/).map((x) => x.trim()).filter(Boolean)) {
    const nums = part.split(/[\s,]+/).map(Number)
    if (nums.length !== 3 || nums.some((x) => !Number.isFinite(x))) throw new Error('Write each update as "l r v", separated by semicolons, e.g. 1 3 5; 2 6 -2')
    const [l, r, v] = nums
    if (l < 0 || r >= n || l > r) throw new Error(`Each update needs 0 ≤ l ≤ r ≤ ${n - 1}.`)
    out.push([l, r, v])
  }
  if (!out.length) throw new Error('Add at least one update.')
  if (out.length > 5) throw new Error('At most 5 updates keep the animation short.')
  return out
}

export const arrDiff: Algorithm = {
  id: 'arr-diff',
  legend: { write: 'add v here', removed: 'subtract v here', window: 'range updated' },
  title: 'Difference array — many range additions in O(1) each',
  blurb: 'Mark where each addition starts and stops; one prefix-sum pass applies them all.',
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '5 5 5 5 5 5 5 5', maxLen: 10 },
    { name: 'ups', label: 'Updates (l r v; …)', type: 'string', default: '1 4 3; 3 6 2; 0 2 -1' },
  ],
  random: () => {
    const n = rint(6, 9)
    const ups = Array.from({ length: rint(2, 4) }, () => {
      const l = rint(0, n - 2)
      return `${l} ${rint(l, n - 1)} ${rint(-3, 5) || 1}`
    })
    return { arr: list(rarr(n, 0, 9)), ups: ups.join('; ') }
  },
  code: {
    pseudo: `
function applyUpdates(arr, n, updates)
  D ← n + 1 zeros                       // @init
  for each (l, r, v) in updates         // @upd
    D[l] ← D[l] + v                     // @addl
    D[r + 1] ← D[r + 1] − v             // @subr
  run ← 0                               // @run0
  for i ← 0 to n − 1                    // @scan
    run ← run + D[i]                    // @scan
    arr[i] ← arr[i] + run               // @apply`,
    cpp: `
void applyUpdates(vector<long long>& arr, const vector<array<long long,3>>& ups) {
    int n = arr.size();
    vector<long long> D(n + 1, 0);                 // @init
    for (auto& [l, r, v] : ups) {                  // @upd
        D[l] += v;                                 // @addl
        D[r + 1] -= v;                             // @subr
    }
    long long run = 0;                             // @run0
    for (int i = 0; i < n; i++) {                  // @scan
        run += D[i];                               // @scan
        arr[i] += run;                             // @apply
    }
}`,
    java: `
static void applyUpdates(long[] arr, int[][] ups) {
    int n = arr.length;
    long[] D = new long[n + 1];                    // @init
    for (int[] u : ups) {                          // @upd
        D[u[0]] += u[2];                           // @addl
        D[u[1] + 1] -= u[2];                       // @subr
    }
    long run = 0;                                  // @run0
    for (int i = 0; i < n; i++) {                  // @scan
        run += D[i];                               // @scan
        arr[i] += run;                             // @apply
    }
}`,
    python: `
def apply_updates(arr, updates):
    n = len(arr)
    D = [0] * (n + 1)                 # @init
    for l, r, v in updates:           # @upd
        D[l] += v                     # @addl
        D[r + 1] -= v                 # @subr
    run = 0                           # @run0
    for i in range(n):                # @scan
        run += D[i]                   # @scan
        arr[i] += run                 # @apply`,
    js: `
function applyUpdates(arr, updates) {
  const n = arr.length;
  const D = new Array(n + 1).fill(0);            // @init
  for (const [l, r, v] of updates) {             // @upd
    D[l] += v;                                   // @addl
    D[r + 1] -= v;                               // @subr
  }
  let run = 0;                                   // @run0
  for (let i = 0; i < n; i++) {                  // @scan
    run += D[i];                                 // @scan
    arr[i] += run;                               // @apply
  }
}`,
    c: `
void apply_updates(long long *arr, int n, int m, int L[], int R[], long long V[]) {
    long long *D = calloc(n + 1, sizeof *D);       // @init
    for (int u = 0; u < m; u++) {                  // @upd
        D[L[u]] += V[u];                           // @addl
        D[R[u] + 1] -= V[u];                       // @subr
    }
    long long run = 0;                             // @run0
    for (int i = 0; i < n; i++) {                  // @scan
        run += D[i];                               // @scan
        arr[i] += run;                             // @apply
    }
    free(D);
}`,
  },
  run: ({ arr, ups }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      const U = parseUpdates(String(ups), n)
      const a = t.array('arr', v, { label: 'arr' })
      const D = t.array('D', Array(n + 1).fill(0), { label: 'D (difference array, n + 1 slots)' })
      t.step('init', `D starts as ${n + 1} zeros. D[i] will say "from index i on, add this much".`, {})
      U.forEach(([l, r, val], k) => {
        a.clear().range([{ from: l, to: r, role: 'window', label: `+${val} to ${l}…${r}` }])
        D.clear()
        t.step('upd', `Update ${k + 1}: add ${val} to arr[${l}…${r}]. Doing it directly would touch ${r - l + 1} cells; we touch only two.`, { l, r, v: val })
        D.set(l, (D.get(l) as number) + val)
        D.role(l, 'write')
        t.step('addl', `D[${l}] += ${val}: from index ${l} onward, everything gets +${val}…`, { l, r, v: val, [`D[${l}]`]: D.get(l) as number })
        D.set(r + 1, (D.get(r + 1) as number) - val)
        D.role(r + 1, 'removed')
        t.step('subr', `…and D[${r + 1}] −= ${val} cancels it from index ${r + 1} onward, so only ${l}…${r} is affected.`, { l, r, v: val, [`D[${r + 1}]`]: D.get(r + 1) as number })
      })
      a.clear().range([])
      D.clear()
      let run = 0
      t.step('run0', `All ${U.length} updates cost O(1) each. Now one pass: a running sum of D says how much each index received.`, { run })
      for (let i = 0; i < n; i++) {
        run += D.get(i) as number
        D.clear().role(i, 'active').ptr('i', i)
        a.clear().ptr('i', i)
        t.step('scan', `run += D[${i}] (${D.get(i)}) → run = ${run}: index ${i} received ${run} in total.`, { i, run })
        a.set(i, (a.get(i) as number) + run)
        a.role(i, 'write')
        t.step('apply', `arr[${i}] += ${run} → ${a.get(i)}.`, { i, run })
      }
      a.clear().ptr('i', null)
      D.clear().ptr('i', null)
      for (let i = 0; i < n; i++) a.role(i, 'done')
      t.step('apply', `Done: ${U.length} range updates in O(${U.length} + ${n}) instead of O(total range lengths).`, { run })
    }),
}

/* ───────────────────────── 18. Dutch national flag (sort 0s, 1s, 2s) ───────────────────────── */

export const arrDutch: Algorithm = {
  id: 'arr-dutch-flag',
  legend: { done: 'zone of 0s', window: 'zone of 1s', best: 'zone of 2s' },
  title: 'Dutch national flag — sort 0s, 1s and 2s in one pass',
  blurb: 'Three pointers split the array into four zones: 0s, 1s, unknown, 2s.',
  inputs: [{ name: 'arr', label: 'Array of 0, 1, 2', type: 'array', default: '2 0 2 1 1 0 1 2 0', maxLen: 12, min: 0, max: 2 }],
  random: () => ({ arr: list(rarr(rint(7, 11), 0, 2)) }),
  code: {
    pseudo: `
function sortColors(a, n)
  lo ← 0; mid ← 0; hi ← n − 1         // @init
  while mid ≤ hi                       // @loop
    if a[mid] = 0                      // @zero
      swap(a[lo], a[mid]); lo++; mid++ // @zero
    else if a[mid] = 1                 // @one
      mid++                            // @one
    else                               // @two
      swap(a[mid], a[hi]); hi−−        // @two`,
    cpp: `
void sortColors(vector<int>& a) {
    int lo = 0, mid = 0, hi = (int)a.size() - 1;   // @init
    while (mid <= hi) {                            // @loop
        if (a[mid] == 0)                           // @zero
            swap(a[lo++], a[mid++]);               // @zero
        else if (a[mid] == 1)                      // @one
            mid++;                                 // @one
        else                                       // @two
            swap(a[mid], a[hi--]);                 // @two
    }
}`,
    java: `
static void sortColors(int[] a) {
    int lo = 0, mid = 0, hi = a.length - 1;        // @init
    while (mid <= hi) {                            // @loop
        if (a[mid] == 0) {                         // @zero
            int t = a[lo]; a[lo++] = a[mid]; a[mid++] = t;   // @zero
        } else if (a[mid] == 1) {                  // @one
            mid++;                                 // @one
        } else {                                   // @two
            int t = a[mid]; a[mid] = a[hi]; a[hi--] = t;     // @two
        }
    }
}`,
    python: `
def sort_colors(a):
    lo, mid, hi = 0, 0, len(a) - 1        # @init
    while mid <= hi:                      # @loop
        if a[mid] == 0:                   # @zero
            a[lo], a[mid] = a[mid], a[lo] # @zero
            lo += 1; mid += 1             # @zero
        elif a[mid] == 1:                 # @one
            mid += 1                      # @one
        else:                             # @two
            a[mid], a[hi] = a[hi], a[mid] # @two
            hi -= 1                       # @two`,
    js: `
function sortColors(a) {
  let lo = 0, mid = 0, hi = a.length - 1;          // @init
  while (mid <= hi) {                              // @loop
    if (a[mid] === 0) {                            // @zero
      [a[lo], a[mid]] = [a[mid], a[lo]]; lo++; mid++;   // @zero
    } else if (a[mid] === 1) {                     // @one
      mid++;                                       // @one
    } else {                                       // @two
      [a[mid], a[hi]] = [a[hi], a[mid]]; hi--;     // @two
    }
  }
}`,
    c: `
void sort_colors(int *a, int n) {
    int lo = 0, mid = 0, hi = n - 1, t;            // @init
    while (mid <= hi) {                            // @loop
        if (a[mid] == 0) {                         // @zero
            t = a[lo]; a[lo++] = a[mid]; a[mid++] = t;   // @zero
        } else if (a[mid] == 1) {                  // @one
            mid++;                                 // @one
        } else {                                   // @two
            t = a[mid]; a[mid] = a[hi]; a[hi--] = t;     // @two
        }
    }
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const a = t.array('arr', v, { label: 'arr' })
      let lo = 0
      let mid = 0
      let hi = v.length - 1
      const zones = () => {
        const r: { from: number; to: number; role: 'done' | 'window' | 'best'; label: string }[] = []
        if (lo > 0) r.push({ from: 0, to: lo - 1, role: 'done', label: '0s' })
        if (mid > lo) r.push({ from: lo, to: mid - 1, role: 'window', label: '1s' })
        if (hi < v.length - 1) r.push({ from: hi + 1, to: v.length - 1, role: 'best', label: '2s' })
        a.range(r)
      }
      a.ptr('lo', lo).ptr('mid', mid).ptr('hi', hi)
      t.step('init', 'Four zones: [0, lo) holds 0s, [lo, mid) holds 1s, [mid, hi] is still unknown, (hi, n) holds 2s. At the start everything is unknown.', { lo, mid, hi })
      let guard = 0
      while (mid <= hi && guard++ < 100) {
        a.clear().ptr('lo', lo).ptr('mid', mid).ptr('hi', hi).role(mid, 'active')
        zones()
        t.step('loop', `mid = ${mid} ≤ hi = ${hi}: look at a[mid] = ${a.get(mid)}.`, { lo, mid, hi })
        const x = a.get(mid)
        if (x === 0) {
          a.swap(lo, mid)
          a.clear().role(lo, 'swap').role(mid, 'swap').arrow(mid, lo, undefined, 'swap').arrow(lo, mid, undefined, 'swap')
          lo++
          mid++
          a.ptr('lo', lo).ptr('mid', mid)
          zones()
          t.step('zero', `It is 0: swap it to position lo (the first 1, or itself), then grow the 0-zone and the 1-zone: lo = ${lo}, mid = ${mid}.`, { lo, mid, hi })
        } else if (x === 1) {
          mid++
          a.clear().ptr('mid', mid)
          zones()
          t.step('one', `It is 1: already in the right zone — just advance mid to ${mid}.`, { lo, mid, hi })
        } else {
          a.swap(mid, hi)
          a.clear().role(mid, 'swap').role(hi, 'swap').arrow(mid, hi, undefined, 'swap').arrow(hi, mid, undefined, 'swap')
          hi--
          a.ptr('hi', hi)
          zones()
          t.step('two', `It is 2: swap it to position hi and shrink hi to ${hi}. mid stays — the value that came back from hi is unknown and must be checked.`, { lo, mid, hi })
        }
      }
      a.clear().ptr('mid', null)
      zones()
      t.step('loop', `mid > hi: the unknown zone is empty. Sorted in one pass, O(n) time, O(1) space — no counting, no extra array.`, { lo, mid, hi })
    }),
}

/* ───────────────────────── 19. Merge two sorted arrays ───────────────────────── */

export const arrMerge: Algorithm = {
  id: 'arr-merge-sorted',
  title: 'Merge two sorted arrays',
  blurb: 'Compare the fronts, take the smaller, advance — the heart of merge sort.',
  inputs: [
    { name: 'A', label: 'A (sorted)', type: 'array', default: '1 4 7 9', maxLen: 6 },
    { name: 'B', label: 'B (sorted)', type: 'array', default: '2 3 8 10 12', maxLen: 6 },
  ],
  random: () => ({ A: list(sorted(rarr(rint(3, 6), 1, 20))), B: list(sorted(rarr(rint(3, 6), 1, 20))) }),
  code: {
    pseudo: `
function merge(A, n, B, m)
  i ← 0; j ← 0; k ← 0                  // @init
  while i < n and j < m                // @loop
    if A[i] ≤ B[j]                     // @cmp
      C[k] ← A[i]; i++; k++            // @takeA
    else
      C[k] ← B[j]; j++; k++            // @takeB
  copy the rest of A, then of B        // @rest
  return C                             // @done`,
    cpp: `
vector<int> mergeSorted(const vector<int>& A, const vector<int>& B) {
    vector<int> C(A.size() + B.size());
    size_t i = 0, j = 0, k = 0;                     // @init
    while (i < A.size() && j < B.size()) {          // @loop
        if (A[i] <= B[j])                           // @cmp
            C[k++] = A[i++];                        // @takeA
        else
            C[k++] = B[j++];                        // @takeB
    }
    while (i < A.size()) C[k++] = A[i++];           // @rest
    while (j < B.size()) C[k++] = B[j++];           // @rest
    return C;                                       // @done
}`,
    java: `
static int[] mergeSorted(int[] A, int[] B) {
    int[] C = new int[A.length + B.length];
    int i = 0, j = 0, k = 0;                        // @init
    while (i < A.length && j < B.length) {          // @loop
        if (A[i] <= B[j])                           // @cmp
            C[k++] = A[i++];                        // @takeA
        else
            C[k++] = B[j++];                        // @takeB
    }
    while (i < A.length) C[k++] = A[i++];           // @rest
    while (j < B.length) C[k++] = B[j++];           // @rest
    return C;                                       // @done
}`,
    python: `
def merge_sorted(A, B):
    C = []
    i = j = 0                          # @init
    while i < len(A) and j < len(B):   # @loop
        if A[i] <= B[j]:               # @cmp
            C.append(A[i]); i += 1     # @takeA
        else:
            C.append(B[j]); j += 1     # @takeB
    C.extend(A[i:]); C.extend(B[j:])   # @rest
    return C                           # @done`,
    js: `
function mergeSorted(A, B) {
  const C = [];
  let i = 0, j = 0;                              // @init
  while (i < A.length && j < B.length) {         // @loop
    if (A[i] <= B[j])                            // @cmp
      C.push(A[i++]);                            // @takeA
    else
      C.push(B[j++]);                            // @takeB
  }
  while (i < A.length) C.push(A[i++]);           // @rest
  while (j < B.length) C.push(B[j++]);           // @rest
  return C;                                      // @done
}`,
    c: `
void merge_sorted(const int *A, int n, const int *B, int m, int *C) {
    int i = 0, j = 0, k = 0;                        // @init
    while (i < n && j < m) {                        // @loop
        if (A[i] <= B[j])                           // @cmp
            C[k++] = A[i++];                        // @takeA
        else
            C[k++] = B[j++];                        // @takeB
    }
    while (i < n) C[k++] = A[i++];                  // @rest
    while (j < m) C[k++] = B[j++];                  // @rest
}                                                   // @done`,
  },
  run: ({ A, B }) =>
    trace((t) => {
      const x = A as number[]
      const y = B as number[]
      for (const [name, arr] of [['A', x], ['B', y]] as const)
        for (let q = 1; q < arr.length; q++) if (arr[q] < arr[q - 1]) throw new Error(`${name} must be sorted ascending.`)
      const a = t.array('A', x, { label: 'A' })
      const b = t.array('B', y, { label: 'B' })
      const c = t.array('C', [], { label: 'C (merged)', capacity: x.length + y.length })
      let i = 0
      let j = 0
      a.ptr('i', 0)
      b.ptr('j', 0)
      c.ptr('k', 0)
      t.step('init', 'i reads A, j reads B, k writes C. The smallest remaining value is always at A[i] or B[j].', { i, j, k: 0 })
      while (i < x.length && j < y.length) {
        a.clear().ptr('i', i).role(i, 'compare')
        b.clear().ptr('j', j).role(j, 'compare')
        c.clear()
        t.step('loop', `Both arrays still have values: compare A[${i}] = ${x[i]} with B[${j}] = ${y[j]}.`, { i, j, k: c.length })
        const takeA = x[i] <= y[j]
        t.step('cmp', takeA ? `${x[i]} ≤ ${y[j]}: A's front is smaller (ties go to A, which keeps the merge stable).` : `${x[i]} > ${y[j]}: B's front is smaller.`, { i, j, k: c.length })
        if (takeA) {
          c.push(x[i])
          a.clear().role(i, 'done')
          i++
          a.ptr('i', i < x.length ? i : null)
        } else {
          c.push(y[j])
          b.clear().role(j, 'done')
          j++
          b.ptr('j', j < y.length ? j : null)
        }
        c.clear().role(c.length - 1, 'new').ptr('k', c.length < x.length + y.length ? c.length : null)
        t.step(takeA ? 'takeA' : 'takeB', `C[${c.length - 1}] = ${c.get(c.length - 1)}. Advance ${takeA ? 'i' : 'j'} and k.`, { i, j, k: c.length })
      }
      const restA = i < x.length
      a.clear()
      b.clear()
      c.clear()
      if (i < x.length || j < y.length) {
        t.step('rest', `${restA ? 'B' : 'A'} is used up. Everything left in ${restA ? 'A' : 'B'} is already sorted and larger than all of C — copy it over.`, { i, j, k: c.length })
        while (i < x.length) {
          c.push(x[i])
          a.clear().role(i, 'done')
          i++
          c.clear().role(c.length - 1, 'new')
          t.step('rest', `C[${c.length - 1}] = ${c.get(c.length - 1)}.`, { i, j, k: c.length })
        }
        while (j < y.length) {
          c.push(y[j])
          b.clear().role(j, 'done')
          j++
          c.clear().role(c.length - 1, 'new')
          t.step('rest', `C[${c.length - 1}] = ${c.get(c.length - 1)}.`, { i, j, k: c.length })
        }
      }
      a.ptr('i', null)
      b.ptr('j', null)
      c.clear().ptr('k', null)
      for (let q = 0; q < c.length; q++) c.role(q, 'done')
      t.step('done', `Merged ${x.length} + ${y.length} values with at most ${x.length + y.length - 1} comparisons: O(n + m).`, { i, j, k: c.length })
    }),
}

/* ───────────────────────── 20. Leaders (scan from the right) ───────────────────────── */

export const arrLeaders: Algorithm = {
  id: 'arr-leaders',
  legend: { found: 'leader', dim: 'to the right' },
  title: 'Leaders — scan from the right with a running maximum',
  blurb: 'A leader is greater than everything to its right. One right-to-left pass finds them all.',
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '16 17 4 3 5 2', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(6, 10), 1, 25)) }),
  code: {
    pseudo: `
function leaders(arr, n)
  best ← −∞                            // @init
  for i ← n − 1 downto 0               // @loop
    if arr[i] > best                   // @cmp
      output arr[i]                    // @lead
      best ← arr[i]                    // @lead
  // leaders come out right-to-left`,
    cpp: `
vector<int> leaders(const vector<int>& a) {
    vector<int> out;
    int best = INT_MIN;                            // @init
    for (int i = (int)a.size() - 1; i >= 0; i--) { // @loop
        if (a[i] > best) {                         // @cmp
            out.push_back(a[i]);                   // @lead
            best = a[i];                           // @lead
        }
    }
    reverse(out.begin(), out.end());
    return out;
}`,
    java: `
static List<Integer> leaders(int[] a) {
    List<Integer> out = new ArrayList<>();
    int best = Integer.MIN_VALUE;                  // @init
    for (int i = a.length - 1; i >= 0; i--) {      // @loop
        if (a[i] > best) {                         // @cmp
            out.add(a[i]);                         // @lead
            best = a[i];                           // @lead
        }
    }
    Collections.reverse(out);
    return out;
}`,
    python: `
def leaders(a):
    out = []
    best = float('-inf')               # @init
    for i in range(len(a) - 1, -1, -1):# @loop
        if a[i] > best:                # @cmp
            out.append(a[i])           # @lead
            best = a[i]                # @lead
    return out[::-1]`,
    js: `
function leaders(a) {
  const out = [];
  let best = -Infinity;                            // @init
  for (let i = a.length - 1; i >= 0; i--) {        // @loop
    if (a[i] > best) {                             // @cmp
      out.push(a[i]);                              // @lead
      best = a[i];                                 // @lead
    }
  }
  return out.reverse();
}`,
    c: `
int leaders(const int *a, int n, int *out) {
    int cnt = 0, best = INT_MIN;                   // @init
    for (int i = n - 1; i >= 0; i--) {             // @loop
        if (a[i] > best) {                         // @cmp
            out[cnt++] = a[i];                     // @lead
            best = a[i];                           // @lead
        }
    }
    return cnt;   /* out holds them right-to-left */
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const a = t.array('arr', v, { label: 'arr' })
      const leadIdx: number[] = []
      let best: number | string = '−∞'
      t.step('init', 'Walk from the right end, remembering the largest value seen so far. Anything bigger than that is bigger than everything to its right.', { best })
      for (let i = v.length - 1; i >= 0; i--) {
        a.clear().ptr('i', i).role(i, 'active')
        leadIdx.forEach((q) => a.role(q, 'found'))
        a.range(i + 1 <= v.length - 1 ? [{ from: i + 1, to: v.length - 1, role: 'dim', label: `max = ${best}` }] : [])
        t.step('loop', `i = ${i}: arr[i] = ${v[i]}.`, { i, best })
        const lead = typeof best === 'string' || v[i] > best
        a.role(i, 'compare')
        t.step('cmp', lead ? `${v[i]} > ${best}: bigger than every value to its right.` : `${v[i]} ≤ ${best}: something to the right is at least as big — not a leader.`, { i, best })
        if (lead) {
          best = v[i]
          leadIdx.push(i)
          t.print(String(v[i]))
          a.clear().ptr('i', i)
          leadIdx.forEach((q) => a.role(q, 'found'))
          t.step('lead', `${v[i]} is a leader. It also becomes the new maximum.`, { i, best })
        }
      }
      a.clear().ptr('i', null).range([])
      leadIdx.forEach((q) => a.role(q, 'found'))
      t.step('lead', `Leaders: ${[...leadIdx].reverse().map((q) => v[q]).join(', ')}. The last element is always one. One pass, O(n) — the naive "check everything to the right" is O(n²).`, { best })
    }),
}

/* ───────────────────────── 21. Majority element (Boyer–Moore voting) ───────────────────────── */

export const arrMajority: Algorithm = {
  id: 'arr-majority',
  legend: { removed: 'cancels a vote', new: 'adds a vote', found: 'the candidate', dim: 'already counted' },
  title: 'Majority element — Boyer–Moore voting',
  blurb: 'Pair each vote with a different one and cancel both; a true majority survives.',
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '2 2 1 3 2 1 2 2 3', maxLen: 12 }],
  random: () => {
    const n = rint(7, 11)
    const m = rint(1, 4)
    const a = rarr(n, 1, 4)
    for (let k = 0; k < Math.floor(n / 2) + 1; k++) a[rint(0, n - 1)] = m
    return { arr: list(a) }
  },
  code: {
    pseudo: `
function majority(arr, n)
  cand ← none; count ← 0              // @init
  for i ← 0 to n − 1                  // @loop
    if count = 0                      // @adopt
      cand ← arr[i]; count ← 1        // @adopt
    else if arr[i] = cand             // @same
      count ← count + 1               // @same
    else                              // @diff
      count ← count − 1               // @diff
  verify: is cand more than n/2 times? // @verify`,
    cpp: `
int majority(const vector<int>& a) {
    int cand = 0, count = 0;                       // @init
    for (int x : a) {                              // @loop
        if (count == 0) { cand = x; count = 1; }   // @adopt
        else if (x == cand) count++;               // @same
        else count--;                              // @diff
    }
    int occ = std::count(a.begin(), a.end(), cand);   // @verify
    return occ * 2 > (int)a.size() ? cand : -1;    // @verify
}`,
    java: `
static int majority(int[] a) {
    int cand = 0, count = 0;                       // @init
    for (int x : a) {                              // @loop
        if (count == 0) { cand = x; count = 1; }   // @adopt
        else if (x == cand) count++;               // @same
        else count--;                              // @diff
    }
    int occ = 0;
    for (int x : a) if (x == cand) occ++;          // @verify
    return occ * 2 > a.length ? cand : -1;         // @verify
}`,
    python: `
def majority(a):
    cand, count = None, 0             # @init
    for x in a:                       # @loop
        if count == 0:                # @adopt
            cand, count = x, 1        # @adopt
        elif x == cand:               # @same
            count += 1                # @same
        else:                         # @diff
            count -= 1                # @diff
    return cand if a.count(cand) * 2 > len(a) else -1   # @verify`,
    js: `
function majority(a) {
  let cand = null, count = 0;                      // @init
  for (const x of a) {                             // @loop
    if (count === 0) { cand = x; count = 1; }      // @adopt
    else if (x === cand) count++;                  // @same
    else count--;                                  // @diff
  }
  const occ = a.filter((x) => x === cand).length;  // @verify
  return occ * 2 > a.length ? cand : -1;           // @verify
}`,
    c: `
int majority(const int *a, int n) {
    int cand = 0, count = 0;                       // @init
    for (int i = 0; i < n; i++) {                  // @loop
        if (count == 0) { cand = a[i]; count = 1; }   // @adopt
        else if (a[i] == cand) count++;            // @same
        else count--;                              // @diff
    }
    int occ = 0;
    for (int i = 0; i < n; i++) occ += a[i] == cand;   // @verify
    return occ * 2 > n ? cand : -1;                // @verify
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const a = t.array('arr', v, { label: 'arr' })
      const votes = t.stack('votes', 'Uncancelled votes for cand')
      let cand: number | string = '—'
      let count = 0
      t.step('init', 'No candidate yet. Think of count as a pile of votes for the candidate; a different value cancels one vote.', { cand, count })
      for (let i = 0; i < v.length; i++) {
        a.clear().ptr('i', i).role(i, 'active')
        for (let q = 0; q < i; q++) a.role(q, 'dim')
        a.role(i, 'active')
        t.step('loop', `i = ${i}: arr[i] = ${v[i]}.`, { i, cand, count })
        if (count === 0) {
          cand = v[i]
          count = 1
          votes.items = []
          votes.push(v[i])
          votes.clear().role(0, 'new')
          t.step('adopt', `count is 0 — nothing to defend. ${v[i]} becomes the candidate with 1 vote.`, { i, cand, count })
        } else if (v[i] === cand) {
          count++
          votes.push(v[i])
          votes.clear().role(votes.length - 1, 'new')
          t.step('same', `Same as the candidate: one more vote, count = ${count}.`, { i, cand, count })
        } else {
          count--
          votes.clear().role(votes.length - 1, 'removed')
          a.role(i, 'removed')
          t.step('diff', `${v[i]} ≠ ${cand}: it cancels one of ${cand}'s votes. count = ${count}.`, { i, cand, count })
          votes.pop()
          votes.clear()
        }
      }
      const occ = v.filter((x) => x === cand).length
      a.clear().ptr('i', null)
      v.forEach((x, q) => a.role(q, x === cand ? 'found' : 'dim'))
      const ok = occ * 2 > v.length
      t.step('verify', `The survivor is ${cand}. A majority must survive the cancelling — but a survivor need not be a majority, so count it: ${occ} of ${v.length} → ${ok ? `more than half, ${cand} is the majority.` : 'not more than half — there is no majority.'} O(n) time, O(1) space.`, { cand, count, occurrences: occ })
    }),
}

/* ───────────────────────── 22. Spiral order of a matrix ───────────────────────── */

export const arrSpiral: Algorithm = {
  id: 'arr-spiral',
  legend: { done: 'printed', active: 'printing now' },
  title: 'Spiral order — four shrinking boundaries',
  blurb: 'Walk the top row, right column, bottom row, left column, then move every boundary inward.',
  inputs: [
    { name: 'R', label: 'Rows', type: 'number', default: '4', min: 1, max: 6 },
    { name: 'C', label: 'Columns', type: 'number', default: '5', min: 1, max: 7 },
  ],
  random: () => ({ R: String(rint(2, 5)), C: String(rint(2, 6)) }),
  code: {
    pseudo: `
function spiral(M, R, C)
  top ← 0; bottom ← R − 1; left ← 0; right ← C − 1   // @init
  while top ≤ bottom and left ≤ right               // @loop
    for c ← left to right: output M[top][c]         // @top
    top ← top + 1
    for r ← top to bottom: output M[r][right]       // @right
    right ← right − 1
    if top ≤ bottom
      for c ← right downto left: output M[bottom][c]   // @bottom
      bottom ← bottom − 1
    if left ≤ right
      for r ← bottom downto top: output M[r][left]  // @left
      left ← left + 1`,
    cpp: `
vector<int> spiral(const vector<vector<int>>& M) {
    vector<int> out;
    int top = 0, bottom = M.size() - 1, left = 0, right = M[0].size() - 1;   // @init
    while (top <= bottom && left <= right) {                              // @loop
        for (int c = left; c <= right; c++) out.push_back(M[top][c]);     // @top
        top++;
        for (int r = top; r <= bottom; r++) out.push_back(M[r][right]);   // @right
        right--;
        if (top <= bottom) {
            for (int c = right; c >= left; c--) out.push_back(M[bottom][c]);  // @bottom
            bottom--;
        }
        if (left <= right) {
            for (int r = bottom; r >= top; r--) out.push_back(M[r][left]);    // @left
            left++;
        }
    }
    return out;
}`,
    java: `
static List<Integer> spiral(int[][] M) {
    List<Integer> out = new ArrayList<>();
    int top = 0, bottom = M.length - 1, left = 0, right = M[0].length - 1;  // @init
    while (top <= bottom && left <= right) {                             // @loop
        for (int c = left; c <= right; c++) out.add(M[top][c]);          // @top
        top++;
        for (int r = top; r <= bottom; r++) out.add(M[r][right]);        // @right
        right--;
        if (top <= bottom) {
            for (int c = right; c >= left; c--) out.add(M[bottom][c]);   // @bottom
            bottom--;
        }
        if (left <= right) {
            for (int r = bottom; r >= top; r--) out.add(M[r][left]);     // @left
            left++;
        }
    }
    return out;
}`,
    python: `
def spiral(M):
    out = []
    top, bottom, left, right = 0, len(M) - 1, 0, len(M[0]) - 1   # @init
    while top <= bottom and left <= right:                       # @loop
        for c in range(left, right + 1): out.append(M[top][c])   # @top
        top += 1
        for r in range(top, bottom + 1): out.append(M[r][right]) # @right
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1): out.append(M[bottom][c])   # @bottom
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1): out.append(M[r][left])     # @left
            left += 1
    return out`,
    js: `
function spiral(M) {
  const out = [];
  let top = 0, bottom = M.length - 1, left = 0, right = M[0].length - 1;  // @init
  while (top <= bottom && left <= right) {                             // @loop
    for (let c = left; c <= right; c++) out.push(M[top][c]);           // @top
    top++;
    for (let r = top; r <= bottom; r++) out.push(M[r][right]);         // @right
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) out.push(M[bottom][c]);      // @bottom
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) out.push(M[r][left]);        // @left
      left++;
    }
  }
  return out;
}`,
    c: `
int spiral(int R, int C, int M[R][C], int *out) {
    int k = 0, top = 0, bottom = R - 1, left = 0, right = C - 1;   // @init
    while (top <= bottom && left <= right) {                     // @loop
        for (int c = left; c <= right; c++) out[k++] = M[top][c];   // @top
        top++;
        for (int r = top; r <= bottom; r++) out[k++] = M[r][right]; // @right
        right--;
        if (top <= bottom) {
            for (int c = right; c >= left; c--) out[k++] = M[bottom][c];   // @bottom
            bottom--;
        }
        if (left <= right) {
            for (int r = bottom; r >= top; r--) out[k++] = M[r][left];     // @left
            left++;
        }
    }
    return k;
}`,
  },
  run: ({ R, C }) =>
    trace((t) => {
      const rows = R as number
      const cols = C as number
      const M = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => r * cols + c + 1))
      const g = t.grid('M', M.map((r) => [...r]), { label: `M (${rows} × ${cols})`, rowLabels: M.map((_, r) => String(r)), colLabels: M[0].map((_, c) => String(c)) })
      const out = t.array('out', [], { label: 'output', capacity: rows * cols })
      let top = 0
      let bottom = rows - 1
      let left = 0
      let right = cols - 1
      const b = () => ({ top, bottom, left, right })
      const visit = (r: number, c: number, step: string, note: string) => {
        g.keep('done')
        g.role(r, c, 'active')
        out.push(M[r][c])
        out.clear().role(out.length - 1, 'new')
        t.step(step, note, b())
        g.role(r, c, 'done')
      }
      t.step('init', 'Four boundaries fence off the part not yet printed. Each lap prints its outer ring, then pulls every boundary one step in.', b())
      while (top <= bottom && left <= right) {
        g.keep('done')
        t.step('loop', `Ring with rows ${top}…${bottom} and columns ${left}…${right}.`, b())
        for (let c = left; c <= right; c++) visit(top, c, 'top', `Top row, left to right: M[${top}][${c}] = ${M[top][c]}.`)
        top++
        for (let r = top; r <= bottom; r++) visit(r, right, 'right', `Right column, downward: M[${r}][${right}] = ${M[r][right]}.`)
        right--
        if (top <= bottom) {
          for (let c = right; c >= left; c--) visit(bottom, c, 'bottom', `Bottom row, right to left: M[${bottom}][${c}] = ${M[bottom][c]}.`)
          bottom--
        }
        if (left <= right) {
          for (let r = bottom; r >= top; r--) visit(r, left, 'left', `Left column, upward: M[${r}][${left}] = ${M[r][left]}.`)
          left++
        }
      }
      g.keep('done')
      out.clear()
      t.step('loop', `The boundaries crossed: all ${rows * cols} cells printed exactly once, O(R·C). The two "if" checks stop a single remaining row or column from being printed twice.`, b())
    }),
}
