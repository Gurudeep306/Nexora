import { trace } from '../../../engine/tracer'
import type { Algorithm } from '../../../engine/types'
import { list, rarr, rint, sorted } from '../../../algorithms/util'

/*
 * Arrays — memory, searching, amortized growth and the index-as-hash family.
 */

/* ───────────────────────── Cache lines: row-major vs column-major walks ───────────────────────── */

export const arrCacheWalk: Algorithm = {
  id: 'arr-cache-walk',
  title: 'Walking a matrix through a tiny cache',
  blurb: 'The same sum, two loop orders: one uses every byte of each cache line, the other throws lines away before using them.',
  legend: { active: 'accessed now', window: 'line in cache', found: 'hit (line reused)', new: 'just fetched', done: 'already summed' },
  inputs: [
    { name: 'R', label: 'Rows', type: 'number', default: '4', min: 2, max: 5 },
    { name: 'C', label: 'Columns', type: 'number', default: '8', min: 4, max: 8 },
    { name: 'order', label: 'Order (row / col)', type: 'string', default: 'col' },
    { name: 'lines', label: 'Cache lines', type: 'number', default: '3', min: 1, max: 4 },
  ],
  random: () => ({ R: String(rint(3, 5)), C: String(rint(4, 8)), order: Math.random() < 0.5 ? 'row' : 'col', lines: String(rint(2, 4)) }),
  code: {
    pseudo: `
// a cache line holds 4 consecutive elements; the cache holds K lines (LRU)
function sumRowOrder(M, R, C)
  total ← 0                                   // @init
  for r ← 0 to R − 1
    for c ← 0 to C − 1                        // c inner: walks memory 0,1,2,…
      total ← total + M[r][c]                 // @hit,miss
  return total                                // @done
function sumColOrder(M, R, C)
  total ← 0                                   // @init
  for c ← 0 to C − 1
    for r ← 0 to R − 1                        // r inner: jumps C elements each step
      total ← total + M[r][c]                 // @hit,miss
  return total                                // @done`,
    cpp: `
long long sumRowOrder(const vector<vector<int>>& M) {
    long long total = 0;                                    // @init
    for (size_t r = 0; r < M.size(); r++)
        for (size_t c = 0; c < M[0].size(); c++)
            total += M[r][c];                               // @hit,miss
    return total;                                           // @done
}
long long sumColOrder(const vector<vector<int>>& M) {
    long long total = 0;                                    // @init
    for (size_t c = 0; c < M[0].size(); c++)
        for (size_t r = 0; r < M.size(); r++)
            total += M[r][c];                               // @hit,miss
    return total;                                           // @done
}`,
    java: `
static long sumRowOrder(int[][] M) {
    long total = 0;                                         // @init
    for (int r = 0; r < M.length; r++)
        for (int c = 0; c < M[0].length; c++)
            total += M[r][c];                               // @hit,miss
    return total;                                           // @done
}
static long sumColOrder(int[][] M) {
    long total = 0;                                         // @init
    for (int c = 0; c < M[0].length; c++)
        for (int r = 0; r < M.length; r++)
            total += M[r][c];                               // @hit,miss
    return total;                                           // @done
}`,
    python: `
import numpy as np            # a real contiguous, row-major matrix
def sum_row_order(M):
    total = 0                                 # @init
    for r in range(M.shape[0]):
        for c in range(M.shape[1]):
            total += M[r, c]                  # @hit,miss
    return total                              # @done

def sum_col_order(M):
    total = 0                                 # @init
    for c in range(M.shape[1]):
        for r in range(M.shape[0]):
            total += M[r, c]                  # @hit,miss
    return total                              # @done`,
    js: `
// M is a flat Int32Array of R*C values, row-major
function sumRowOrder(M, R, C) {
  let total = 0;                                        // @init
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++)
      total += M[r * C + c];                            // @hit,miss
  return total;                                         // @done
}
function sumColOrder(M, R, C) {
  let total = 0;                                        // @init
  for (let c = 0; c < C; c++)
    for (let r = 0; r < R; r++)
      total += M[r * C + c];                            // @hit,miss
  return total;                                         // @done
}`,
    c: `
long long sum_row_order(int R, int C, int M[R][C]) {
    long long total = 0;                                    // @init
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++)
            total += M[r][c];                               // @hit,miss
    return total;                                           // @done
}
long long sum_col_order(int R, int C, int M[R][C]) {
    long long total = 0;                                    // @init
    for (int c = 0; c < C; c++)
        for (int r = 0; r < R; r++)
            total += M[r][c];                               // @hit,miss
    return total;                                           // @done
}`,
  },
  run: ({ R, C, order, lines }) =>
    trace((t) => {
      const rows = R as number
      const cols = C as number
      const K = lines as number
      const ord = String(order).trim().toLowerCase().startsWith('c') ? 'col' : 'row'
      const LINE = 4
      const g = t.grid('M', Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => r * cols + c)), {
        label: `M (${rows} × ${cols}) — each cell shows its memory offset r·C + c`,
        rowLabels: Array.from({ length: rows }, (_, r) => `r${r}`),
        colLabels: Array.from({ length: cols }, (_, c) => `c${c}`),
      })
      const nLines = Math.ceil((rows * cols) / LINE)
      const mem = t.grid('mem', Array.from({ length: nLines }, (_, ln) => Array.from({ length: LINE }, (_, k) => (ln * LINE + k < rows * cols ? ln * LINE + k : null))), {
        label: 'memory, one row per cache line (offsets)',
        rowLabels: Array.from({ length: nLines }, (_, ln) => `line ${ln}`),
        colLabels: Array.from({ length: LINE }, (_, k) => `+${k}`),
      })
      const cache = t.queue('cache', `cache: ${K} line${K > 1 ? 's' : ''}, least recently used at the front`)
      const meter = t.meter('misses', 'cache misses', [
        { label: 'ideal: R·C/4', value: Math.ceil((rows * cols) / LINE) },
        { label: 'every access', value: rows * cols },
      ])
      let hits = 0
      let misses = 0
      const showLines = (off: number) => {
        mem.clear()
        for (const it of cache.items) {
          const ln = Number(String(it.v).slice(1))
          for (let k = 0; k < LINE; k++) mem.role(ln, k, 'window')
        }
        mem.role(Math.floor(off / LINE), off % LINE, 'active')
      }
      t.step('init', `Summing in ${ord === 'row' ? 'row' : 'column'} order. Memory is fetched a whole line (4 elements) at a time; the cache keeps at most ${K} line${K > 1 ? 's' : ''} and evicts the least recently used.`, { hits, misses })
      const cells: [number, number][] = []
      if (ord === 'row') for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([r, c])
      else for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) cells.push([r, c])
      for (const [r, c] of cells) {
        const off = r * cols + c
        const ln = Math.floor(off / LINE)
        const at = cache.items.findIndex((it) => it.v === `L${ln}`)
        g.keep('done').role(r, c, 'active')
        cache.clear()
        if (at >= 0) {
          hits++
          const [cell] = cache.items.splice(at, 1)
          cache.items.push(cell)
          cache.role(cache.items.length - 1, 'found')
          showLines(off)
          t.step('hit', `M[${r}][${c}] is at offset ${off}, inside line ${ln}, which is already cached — a hit, almost free.`, { r, c, offset: off, line: ln, hits, misses })
        } else {
          misses++
          meter.add(1)
          let ev = ''
          if (cache.items.length >= K) {
            const old = cache.items.shift()!
            ev = ` The cache is full, so line ${String(old.v).slice(1)} (least recently used) is evicted.`
          }
          cache.push(`L${ln}`)
          cache.role(cache.items.length - 1, 'new')
          showLines(off)
          t.step('miss', `M[${r}][${c}] is at offset ${off}, in line ${ln}, which is not cached — a miss: fetch elements ${ln * LINE}…${ln * LINE + LINE - 1} from memory.${ev}`, { r, c, offset: off, line: ln, hits, misses })
        }
        g.role(r, c, 'done')
      }
      g.keep('done')
      mem.clear()
      t.step(
        'done',
        ord === 'row'
          ? `Row order: ${misses} misses for ${rows * cols} accesses — one per line, the minimum possible. Each fetched line is used completely before moving on.`
          : `Column order: ${misses} misses for ${rows * cols} accesses. Consecutive accesses are ${cols} elements apart, so ${rows > K ? 'the line fetched for a cell is evicted before its neighbours are needed' : 'each line is reused only if it survives until the next column'}. Same answer, ${Math.round((misses / Math.ceil((rows * cols) / LINE)) * 10) / 10}× the memory traffic of row order.`,
        { hits, misses },
      )
    }),
}

/* ───────────────────────── Sentinel linear search ───────────────────────── */

export const arrSentinel: Algorithm = {
  id: 'arr-sentinel',
  title: 'Sentinel search — one comparison per step instead of two',
  blurb: 'Plant the target in the last slot so the loop cannot run off the end, then undo the plant.',
  legend: { pivot: 'sentinel', compare: 'compared', found: 'stopped here', dim: 'checked' },
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '7 3 9 4 1 8 6', maxLen: 12 },
    { name: 'x', label: 'Find x', type: 'number', default: '5' },
  ],
  random: () => {
    const a = rarr(rint(6, 10), 1, 20)
    return { arr: list(a), x: String(Math.random() < 0.5 ? a[rint(0, a.length - 1)] : rint(1, 20)) }
  },
  code: {
    pseudo: `
function sentinelSearch(a, n, x)
  last ← a[n − 1]                       // @save
  a[n − 1] ← x                          // @plant
  i ← 0
  while a[i] ≠ x: i ← i + 1             // @cmp,stop
  a[n − 1] ← last                       // @restore
  if i < n − 1 or last = x: return i    // @result
  return −1                             // @result`,
    cpp: `
int sentinelSearch(vector<int>& a, int x) {
    int n = a.size();
    if (n == 0) return -1;
    int last = a[n - 1];                    // @save
    a[n - 1] = x;                           // @plant
    int i = 0;
    while (a[i] != x) i++;                  // @cmp,stop
    a[n - 1] = last;                        // @restore
    if (i < n - 1 || last == x) return i;   // @result
    return -1;                              // @result
}`,
    java: `
static int sentinelSearch(int[] a, int x) {
    int n = a.length;
    if (n == 0) return -1;
    int last = a[n - 1];                    // @save
    a[n - 1] = x;                           // @plant
    int i = 0;
    while (a[i] != x) i++;                  // @cmp,stop
    a[n - 1] = last;                        // @restore
    if (i < n - 1 || last == x) return i;   // @result
    return -1;                              // @result
}`,
    python: `
def sentinel_search(a, x):
    n = len(a)
    if n == 0:
        return -1
    last = a[n - 1]                         # @save
    a[n - 1] = x                            # @plant
    i = 0
    while a[i] != x:                        # @cmp,stop
        i += 1                              # @cmp
    a[n - 1] = last                         # @restore
    if i < n - 1 or last == x:              # @result
        return i                            # @result
    return -1                               # @result`,
    js: `
function sentinelSearch(a, x) {
  const n = a.length;
  if (n === 0) return -1;
  const last = a[n - 1];                    // @save
  a[n - 1] = x;                             // @plant
  let i = 0;
  while (a[i] !== x) i++;                   // @cmp,stop
  a[n - 1] = last;                          // @restore
  if (i < n - 1 || last === x) return i;    // @result
  return -1;                                // @result
}`,
    c: `
int sentinel_search(int *a, int n, int x) {
    if (n == 0) return -1;
    int last = a[n - 1];                    // @save
    a[n - 1] = x;                           // @plant
    int i = 0;
    while (a[i] != x) i++;                  // @cmp,stop
    a[n - 1] = last;                        // @restore
    if (i < n - 1 || last == x) return i;   // @result
    return -1;                              // @result
}`,
  },
  run: ({ arr, x }) =>
    trace((t) => {
      const v = [...(arr as number[])]
      if (!v.length) throw new Error('Give at least one value.')
      const X = x as number
      const n = v.length
      const a = t.array('a', v, { label: 'a' })
      let plain = 0
      let sent = 0
      const last = v[n - 1]
      a.role(n - 1, 'active')
      t.step('save', `Remember the last element (${last}) — we are about to overwrite it.`, { x: X, last })
      a.set(n - 1, X)
      a.clear().role(n - 1, 'pivot')
      t.step('plant', `Write x = ${X} into a[${n - 1}]. Now the loop is guaranteed to find x, so it never needs to test i < n.`, { x: X, last })
      let i = 0
      for (;;) {
        sent++
        plain += 2
        a.clear().role(n - 1, 'pivot').ptr('i', i)
        for (let d = 0; d < i; d++) a.role(d, 'dim')
        if (a.get(i) === X) {
          a.role(i, 'found')
          t.step('stop', `a[${i}] = ${X} = x: the loop stops. ${i === n - 1 ? 'It stopped on the sentinel slot.' : 'A real match before the sentinel.'}`, { i, x: X, 'sentinel compares': sent, 'plain compares': plain })
          break
        }
        a.role(i, 'compare')
        t.step('cmp', `a[${i}] = ${a.get(i)} ≠ ${X}: step on. Only one test per step — the plain loop would also test i < ${n}.`, { i, x: X, 'sentinel compares': sent, 'plain compares': plain })
        i++
      }
      a.set(n - 1, last)
      a.clear().role(n - 1, 'write').ptr('i', i)
      t.step('restore', `Put the original ${last} back into a[${n - 1}] — the array is unchanged.`, { i, x: X, last })
      const found = i < n - 1 || last === X
      a.clear().ptr('i', i)
      if (found) a.role(i, 'found')
      t.step(
        'result',
        found
          ? `Found at index ${i}${i === n - 1 ? ' (the real last element was x)' : ''}. ${sent} comparisons against about ${plain} for the plain loop.`
          : `i stopped on the sentinel and the real last element was ${last} ≠ ${X}: not found, return −1. ${sent} comparisons against ${plain} for the plain loop.`,
        { i, x: X, answer: found ? i : -1 },
      )
    }),
}

/* ───────────────────────── Searching a sorted array: the halving teaser ───────────────────────── */

export const arrSortedSearch: Algorithm = {
  id: 'arr-sorted-search',
  title: 'Searching a sorted array by halving',
  blurb: 'Sorted order lets one comparison rule out half of what is left.',
  legend: { pivot: 'mid', dim: 'ruled out', found: 'found', window: 'still possible' },
  inputs: [
    { name: 'arr', label: 'Sorted array', type: 'array', default: '2 5 8 12 16 23 38 56 72 91 95', maxLen: 16 },
    { name: 'x', label: 'Find x', type: 'number', default: '16' },
  ],
  random: () => {
    const a = [...new Set(sorted(rarr(rint(9, 15), 1, 99)))]
    return { arr: list(a), x: String(Math.random() < 0.7 ? a[rint(0, a.length - 1)] : rint(1, 99)) }
  },
  code: {
    pseudo: `
function search(a, n, x)              // a sorted ascending
  lo ← 0; hi ← n − 1                  // @init
  while lo ≤ hi
    mid ← lo + (hi − lo) / 2          // @mid
    if a[mid] = x: return mid         // @found
    if a[mid] < x: lo ← mid + 1       // @right
    else hi ← mid − 1                 // @left
  return −1                           // @miss`,
    cpp: `
int search(const vector<int>& a, int x) {
    int lo = 0, hi = (int)a.size() - 1;     // @init
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;       // @mid
        if (a[mid] == x) return mid;        // @found
        if (a[mid] < x) lo = mid + 1;       // @right
        else hi = mid - 1;                  // @left
    }
    return -1;                              // @miss
}`,
    java: `
static int search(int[] a, int x) {
    int lo = 0, hi = a.length - 1;          // @init
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;       // @mid
        if (a[mid] == x) return mid;        // @found
        if (a[mid] < x) lo = mid + 1;       // @right
        else hi = mid - 1;                  // @left
    }
    return -1;                              // @miss
}`,
    python: `
def search(a, x):
    lo, hi = 0, len(a) - 1                  # @init
    while lo <= hi:
        mid = (lo + hi) // 2                # @mid
        if a[mid] == x:                     # @found
            return mid                      # @found
        if a[mid] < x:                      # @right
            lo = mid + 1                    # @right
        else:
            hi = mid - 1                    # @left
    return -1                               # @miss`,
    js: `
function search(a, x) {
  let lo = 0, hi = a.length - 1;            // @init
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;             // @mid
    if (a[mid] === x) return mid;           // @found
    if (a[mid] < x) lo = mid + 1;           // @right
    else hi = mid - 1;                      // @left
  }
  return -1;                                // @miss
}`,
    c: `
int search(const int *a, int n, int x) {
    int lo = 0, hi = n - 1;                 // @init
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;       // @mid
        if (a[mid] == x) return mid;        // @found
        if (a[mid] < x) lo = mid + 1;       // @right
        else hi = mid - 1;                  // @left
    }
    return -1;                              // @miss
}`,
  },
  run: ({ arr, x }) =>
    trace((t) => {
      const v = arr as number[]
      for (let i = 1; i < v.length; i++) if (v[i] < v[i - 1]) throw new Error('The array must be sorted in ascending order.')
      const X = x as number
      const a = t.array('a', v, { label: 'a (sorted)' })
      const m = t.meter('cmp', 'comparisons', [
        { label: '⌊log₂ n⌋ + 1', value: Math.floor(Math.log2(Math.max(1, v.length))) + 1 },
        { label: 'n (linear scan)', value: v.length },
      ])
      let lo = 0
      let hi = v.length - 1
      const paint = () => {
        a.clear().ptr('lo', lo <= hi ? lo : null).ptr('hi', lo <= hi ? hi : null)
        for (let i = 0; i < v.length; i++) if (i < lo || i > hi) a.role(i, 'dim')
        a.range(lo <= hi ? [{ from: lo, to: hi, role: 'window', label: `${hi - lo + 1} left` }] : [])
      }
      paint()
      t.step('init', `Every index is still possible: lo = 0, hi = ${v.length - 1}.`, { lo, hi, x: X })
      while (lo <= hi) {
        const mid = lo + ((hi - lo) >> 1)
        paint()
        a.role(mid, 'pivot').ptr('mid', mid)
        m.add(1)
        t.step('mid', `Look at the middle of [${lo}, ${hi}]: a[${mid}] = ${v[mid]}.`, { lo, hi, mid, x: X })
        if (v[mid] === X) {
          a.role(mid, 'found')
          t.step('found', `a[${mid}] = ${X}. Found after ${m.value} comparison${m.value > 1 ? 's' : ''}; a linear scan would have needed ${mid + 1}.`, { lo, hi, mid, answer: mid })
          return
        }
        if (v[mid] < X) {
          lo = mid + 1
          paint()
          a.ptr('mid', null)
          t.step('right', `${v[mid]} < ${X}. Everything at or left of index ${mid} is ≤ ${v[mid]}, so too small — rule out the left part in one go.`, { lo, hi, x: X })
        } else {
          hi = mid - 1
          paint()
          a.ptr('mid', null)
          t.step('left', `${v[mid]} > ${X}. Everything at or right of index ${mid} is ≥ ${v[mid]}, so too big — rule out the right part.`, { lo, hi, x: X })
        }
      }
      paint()
      t.step('miss', `The range is empty (lo = ${lo} > hi = ${hi}): ${X} is not in the array. ${m.value} comparisons instead of ${v.length}.`, { lo, hi, answer: -1 })
    }),
}

/* ───────────────────────── Accounting method for doubling ───────────────────────── */

export const arrAmortizedBank: Algorithm = {
  id: 'arr-amortized-bank',
  title: 'Paying for doubling with saved coins (accounting method)',
  blurb: 'Charge every push 3 coins. One pays for the write, two are stored on the new element — and the stored coins always cover the next resize.',
  legend: { new: 'just pushed', active: 'being copied', write: 'copied', compare: 'pays a coin' },
  inputs: [{ name: 'n', label: 'Number of pushes', type: 'number', default: '9', min: 1, max: 16 }],
  random: () => ({ n: String(rint(5, 16)) }),
  code: {
    pseudo: `
// every push is charged 3 coins (its amortized cost)
function push(x)
  if size = cap                            // @full
    newBuf ← allocate(2 · cap)
    for j ← 0 to size − 1                  // each copy is paid by a stored coin
      newBuf[j] ← buf[j]                   // @copy
    buf ← newBuf; cap ← 2 · cap            // @swapbuf
  buf[size] ← x; size ← size + 1           // @push
  // 1 coin paid the write, 2 coins stay on the new element`,
    cpp: `
struct DynArray {
    int *buf = new int[1]; int size = 0, cap = 1;
    void push(int x) {
        if (size == cap) {                              // @full
            int *nb = new int[2 * cap];
            for (int j = 0; j < size; j++) nb[j] = buf[j];   // @copy
            delete[] buf; buf = nb; cap *= 2;           // @swapbuf
        }
        buf[size++] = x;                                // @push
    }
};`,
    java: `
class DynArray {
    int[] buf = new int[1]; int size = 0;
    void push(int x) {
        if (size == buf.length) {                       // @full
            int[] nb = new int[2 * buf.length];
            for (int j = 0; j < size; j++) nb[j] = buf[j];   // @copy
            buf = nb;                                   // @swapbuf
        }
        buf[size++] = x;                                // @push
    }
}`,
    python: `
class DynArray:
    def __init__(self):
        self.buf, self.size, self.cap = [None], 0, 1
    def push(self, x):
        if self.size == self.cap:                       # @full
            nb = [None] * (2 * self.cap)
            for j in range(self.size):
                nb[j] = self.buf[j]                     # @copy
            self.buf, self.cap = nb, 2 * self.cap       # @swapbuf
        self.buf[self.size] = x                         # @push
        self.size += 1                                  # @push`,
    js: `
class DynArray {
  constructor() { this.buf = new Int32Array(1); this.size = 0; }
  push(x) {
    if (this.size === this.buf.length) {                // @full
      const nb = new Int32Array(2 * this.buf.length);
      for (let j = 0; j < this.size; j++) nb[j] = this.buf[j];   // @copy
      this.buf = nb;                                    // @swapbuf
    }
    this.buf[this.size++] = x;                          // @push
  }
}`,
    c: `
typedef struct { int *buf; int size, cap; } DynArray;   /* start: buf = malloc(sizeof(int)), cap = 1 */
void push(DynArray *d, int x) {
    if (d->size == d->cap) {                            // @full
        int *nb = malloc(2 * d->cap * sizeof(int));
        for (int j = 0; j < d->size; j++) nb[j] = d->buf[j];   // @copy
        free(d->buf); d->buf = nb; d->cap *= 2;         // @swapbuf
    }
    d->buf[d->size++] = x;                              // @push
}`,
  },
  run: ({ n }) =>
    trace((t) => {
      const N = n as number
      let cap = 1
      let size = 0
      let actual = 0
      let buf = t.array('buf', [], { label: 'buffer (capacity 1)', capacity: 1 })
      const coins = t.array('coins', [], { label: 'coins stored on each element', capacity: 1 })
      const meter = t.meter('cost', 'actual work done (writes + copies)', [{ label: '3 · pushes', value: 0 }])
      const bank = () => coins.values().reduce<number>((s, c) => s + (Number(c) || 0), 0)
      t.step('push', 'Empty array, capacity 1. Every push will be charged exactly 3 coins: that is its amortized cost. We check the coins never run out.', { size, cap, 'coins in bank': 0, 'actual work': 0 })
      for (let k = 1; k <= N; k++) {
        meter.marks = [{ label: '3 · pushes', value: 3 * k }]
        if (size === cap) {
          buf.clear()
          coins.clear()
          t.step('full', `push #${k}: size ${size} = capacity ${cap}. We must move all ${size} elements into a buffer of ${2 * cap} — the bank holds ${bank()} coins to pay for it.`, { size, cap, 'coins in bank': bank(), 'actual work': actual })
          const nb = t.array('nb', [], { label: `new buffer (capacity ${2 * cap})`, capacity: 2 * cap })

          const h = Math.floor(cap / 2)
          for (let j = 0; j < size; j++) {
            const payer = cap === 1 ? 0 : j < h ? j + h : j
            coins.set(payer, (Number(coins.get(payer)) || 0) - 1)
            buf.clear().role(j, 'active')
            coins.clear().role(payer, 'compare')
            nb.push(buf.get(j) as number)
            nb.clear().role(j, 'write')
            actual++
            meter.add(1)
            t.step('copy', `Copy element ${j} (${buf.get(j)}). The coin comes from element ${payer}${payer === j ? ' itself' : `, pushed after the last resize`}.`, { size, cap, 'coins in bank': bank(), 'actual work': actual })
          }
          t.drop(buf)
          t.last(coins)
          t.last(meter)
          nb.id = 'buf'
          nb.opts.label = `buffer (capacity ${2 * cap})`
          coins.capacity = 2 * cap
          buf = nb
          cap *= 2
          buf.clear()
          coins.clear()
          t.step('swapbuf', `Old buffer freed; capacity is now ${cap}. The copies were fully paid by stored coins — the bank is at ${bank()}, never below zero.`, { size, cap, 'coins in bank': bank(), 'actual work': actual })
        }
        buf.set(size, k)
        coins.set(size, 2)
        buf.clear().role(size, 'new')
        coins.clear().role(size, 'new')
        size++
        actual++
        meter.add(1)
        t.step('push', `push(${k}): 3 coins arrive. 1 pays for writing it into slot ${size - 1}; 2 are stored on it for a future resize.`, { size, cap, 'coins in bank': bank(), 'actual work': actual })
      }
      buf.clear()
      coins.clear()
      t.step('push', `${N} pushes did ${actual} units of real work, and we charged 3 · ${N} = ${3 * N}. The bank never went negative, so the real total is at most 3n — O(1) amortized per push.`, { size, cap, 'coins in bank': bank(), 'actual work': actual })
    }),
}

/* ───────────────────────── Shrinking policy: half vs quarter ───────────────────────── */

export const arrShrinkPolicy: Algorithm = {
  id: 'arr-shrink-policy',
  title: 'When to shrink: the thrashing trap',
  blurb: 'Halve the buffer when it is half full and a push/pop see-saw resizes on every operation. Wait until a quarter full and it never does.',
  legend: { new: 'pushed', removed: 'popped slot', active: 'resized' },
  inputs: [
    { name: 'ops', label: 'Operations (+ push, − pop)', type: 'string', default: '+ + + + + + + + + - + - + - + -' },
    { name: 'policy', label: 'Shrink when (half / quarter)', type: 'string', default: 'half' },
  ],
  random: () => ({ ops: '+ + + + + + + + + - + - + - + - - -', policy: Math.random() < 0.5 ? 'half' : 'quarter' }),
  code: {
    pseudo: `
function push(x)
  if size = cap: resize(2 · cap)                  // @grow
  a[size] ← x; size ← size + 1                    // @push
function pop()
  size ← size − 1                                 // @pop
  if policy = half and size ≤ cap / 2: resize(cap / 2)      // @shrink
  if policy = quarter and size ≤ cap / 4: resize(cap / 2)   // @shrink`,
    cpp: `
void push(int x) {
    if (size == cap) resize(2 * cap);                       // @grow
    a[size++] = x;                                          // @push
}
void pop() {
    size--;                                                 // @pop
    if (cap > 1 && size <= cap / 4) resize(cap / 2);        // quarter policy  @shrink
}`,
    java: `
void push(int x) {
    if (size == cap) resize(2 * cap);                       // @grow
    a[size++] = x;                                          // @push
}
void pop() {
    size--;                                                 // @pop
    if (cap > 1 && size <= cap / 4) resize(cap / 2);        // quarter policy  @shrink
}`,
    python: `
def push(self, x):
    if self.size == self.cap:
        self.resize(2 * self.cap)                           # @grow
    self.a[self.size] = x                                   # @push
    self.size += 1                                          # @push

def pop(self):
    self.size -= 1                                          # @pop
    if self.cap > 1 and self.size <= self.cap // 4:         # @shrink
        self.resize(self.cap // 2)                          # quarter policy  @shrink`,
    js: `
push(x) {
  if (this.size === this.cap) this.resize(2 * this.cap);    // @grow
  this.a[this.size++] = x;                                  // @push
}
pop() {
  this.size--;                                              // @pop
  if (this.cap > 1 && this.size <= this.cap / 4) this.resize(this.cap / 2);   // @shrink
}`,
    c: `
void push(Dyn *d, int x) {
    if (d->size == d->cap) resize(d, 2 * d->cap);           // @grow
    d->a[d->size++] = x;                                    // @push
}
void pop(Dyn *d) {
    d->size--;                                              // @pop
    if (d->cap > 1 && d->size <= d->cap / 4) resize(d, d->cap / 2);   // @shrink
}`,
  },
  run: ({ ops, policy }) =>
    trace((t) => {
      const seq = String(ops).replace(/[^+\-−]/g, '').split('').map((c) => (c === '+' ? 1 : -1))
      if (!seq.length) throw new Error('Write operations as + (push) and - (pop).')
      if (seq.length > 30) throw new Error('At most 30 operations.')
      const quarter = String(policy).trim().toLowerCase().startsWith('q')
      let cap = 1
      let size = 0
      let copies = 0
      let resizes = 0
      const vals: number[] = []
      const a = t.array('a', [], { label: 'buffer (capacity 1)', capacity: 1 })
      const m = t.meter('copies', 'elements copied by resizes', [{ label: 'ops so far', value: 0 }])
      const relabel = () => {
        a.opts.label = `buffer (capacity ${cap})`
        a.capacity = cap
      }
      t.step('push', `Policy: shrink when ${quarter ? 'a quarter' : 'half'} full. Grow by doubling when full. Count the copies.`, { size, cap, copies, resizes })
      let k = 0
      for (const op of seq) {
        k++
        m.marks = [{ label: 'ops so far', value: k }]
        a.clear()
        if (op === 1) {
          if (size === cap) {
            copies += size
            resizes++
            m.add(size)
            cap *= 2
            relabel()
            for (let i = 0; i < size; i++) a.role(i, 'active')
            t.step('grow', `Op ${k} (push): full at ${size}/${cap / 2} — double to ${cap}, copying ${size} elements.`, { size, cap, copies, resizes })
            a.clear()
          }
          vals.push(k)
          a.push(k)
          size++
          a.role(size - 1, 'new')
          t.step('push', `Op ${k}: push → size ${size}, capacity ${cap}.`, { size, cap, copies, resizes })
        } else {
          if (size === 0) {
            t.step('pop', `Op ${k}: pop on an empty array — ignored.`, { size, cap, copies, resizes })
            continue
          }
          vals.pop()
          a.remove(size - 1)
          size--
          t.step('pop', `Op ${k}: pop → size ${size}, capacity ${cap}.`, { size, cap, copies, resizes })
          const limit = quarter ? cap / 4 : cap / 2
          if (cap > 1 && size <= limit) {
            copies += size
            resizes++
            m.add(size)
            cap = Math.max(1, cap / 2)
            relabel()
            for (let i = 0; i < size; i++) a.role(i, 'active')
            t.step('shrink', `size ${size} ≤ ${quarter ? 'cap/4' : 'cap/2'} = ${limit}: halve to ${cap}, copying ${size} elements.${quarter ? ' After shrinking the buffer is half full — far from both thresholds.' : ' But now the buffer is exactly full: the very next push must grow again.'}`, { size, cap, copies, resizes })
          }
        }
      }
      a.clear()
      t.step(
        'pop',
        quarter
          ? `Done: ${resizes} resizes, ${copies} copies over ${seq.length} operations. After any resize the array is half full, so at least cap/4 operations must happen before the next — amortized O(1).`
          : `Done: ${resizes} resizes, ${copies} copies over ${seq.length} operations. At the boundary every push and every pop resized — each costs O(n), so a see-saw of m operations costs O(m·n).`,
        { size, cap, copies, resizes },
      )
    }),
}

/* ───────────────────────── Cyclic sort: value v belongs at index v − 1 ───────────────────────── */

export const arrCyclicSort: Algorithm = {
  id: 'arr-cyclic-sort',
  title: 'Cyclic sort — send every value to its home index',
  blurb: 'When values are 1…n, the value itself says where it belongs. Each swap puts at least one value home for good.',
  legend: { active: 'i', compare: 'its home', swap: 'swapped', done: 'home', found: 'duplicate' },
  inputs: [{ name: 'arr', label: 'Values in 1…n', type: 'array', default: '3 5 2 1 4 6', maxLen: 10 }],
  random: () => {
    const n = rint(5, 9)
    const a = Array.from({ length: n }, (_, i) => i + 1)
    for (let i = n - 1; i > 0; i--) {
      const j = rint(0, i)
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return { arr: list(a) }
  },
  code: {
    pseudo: `
function cyclicSort(a, n)               // values in 1…n
  i ← 0
  while i < n                           // @look
    j ← a[i] − 1                        // home of a[i]
    if a[i] ≠ a[j]: swap a[i], a[j]     // @swap
    else i ← i + 1                      // @next
  // now a[k] = k + 1 wherever possible  // @done`,
    cpp: `
void cyclicSort(vector<int>& a) {
    int i = 0, n = a.size();
    while (i < n) {                         // @look
        int j = a[i] - 1;                   // home of a[i]
        if (a[i] != a[j]) swap(a[i], a[j]); // @swap
        else i++;                           // @next
    }
}                                           // @done`,
    java: `
static void cyclicSort(int[] a) {
    int i = 0, n = a.length;
    while (i < n) {                         // @look
        int j = a[i] - 1;                   // home of a[i]
        if (a[i] != a[j]) { int t = a[i]; a[i] = a[j]; a[j] = t; }   // @swap
        else i++;                           // @next
    }
}                                           // @done`,
    python: `
def cyclic_sort(a):
    i, n = 0, len(a)
    while i < n:                            # @look
        j = a[i] - 1                        # home of a[i]
        if a[i] != a[j]:                    # @swap
            a[i], a[j] = a[j], a[i]         # @swap
        else:
            i += 1                          # @next
    return a                                # @done`,
    js: `
function cyclicSort(a) {
  let i = 0;
  while (i < a.length) {                    // @look
    const j = a[i] - 1;                     // home of a[i]
    if (a[i] !== a[j]) [a[i], a[j]] = [a[j], a[i]];   // @swap
    else i++;                               // @next
  }
  return a;                                 // @done
}`,
    c: `
void cyclic_sort(int *a, int n) {
    int i = 0;
    while (i < n) {                         // @look
        int j = a[i] - 1;                   /* home of a[i] */
        if (a[i] != a[j]) { int t = a[i]; a[i] = a[j]; a[j] = t; }   // @swap
        else i++;                           // @next
    }
}                                           // @done`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      if (v.some((x) => !Number.isInteger(x) || x < 1 || x > n)) throw new Error(`Every value must be an integer from 1 to n = ${n}.`)
      const a = t.array('a', v, { label: 'a (value v belongs at index v − 1)' })
      let swaps = 0
      const paintHome = () => {
        for (let k = 0; k < n; k++) if (a.get(k) === k + 1) a.role(k, 'done')
      }
      let i = 0
      while (i < n) {
        const x = a.get(i) as number
        const j = x - 1
        a.clear().ptr('i', i)
        paintHome()
        a.role(i, 'active')
        if (j !== i) a.role(j, 'compare').arrow(i, j, `${x} → [${j}]`, 'swap')
        t.step('look', j === i ? `a[${i}] = ${x} is already at its home index ${j}.` : `a[${i}] = ${x} belongs at index ${j}, which holds ${a.get(j)}.`, { i, 'a[i]': x, home: j, swaps })
        if (a.get(i) !== a.get(j)) {
          a.swap(i, j)
          swaps++
          a.clear().ptr('i', i)
          paintHome()
          a.role(i, 'swap').role(j, 'done')
          t.step('swap', `Swap: ${x} lands at its home ${j} and stays there forever. i does not move — the value that came back (${a.get(i)}) still needs placing.`, { i, 'a[i]': a.get(i) as number, swaps })
        } else {
          a.clear().ptr('i', i)
          paintHome()
          if (j !== i) a.role(i, 'found')
          t.step('next', j === i ? `Nothing to do at ${i}; move on.` : `Index ${j} already holds ${x}: this ${x} is a duplicate. Leave it and move on.`, { i, 'a[i]': x, swaps })
          i++
        }
      }
      a.clear().ptr('i', null)
      paintHome()
      t.step('done', `Finished with ${swaps} swaps (each swap sends one value home permanently, so at most n − 1 = ${n - 1}). Total O(n) time, O(1) space.`, { swaps })
    }),
}

/* ───────────────────────── First missing positive ───────────────────────── */

export const arrFirstMissing: Algorithm = {
  id: 'arr-first-missing',
  title: 'First missing positive in O(n) time and O(1) space',
  blurb: 'Only values 1…n can matter. Park each such value at its home, ignore the rest, then the first index without its own value is the answer.',
  legend: { active: 'i', compare: 'its home', done: 'home', dim: 'ignored (out of range)', best: 'answer' },
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '7 3 -2 1 2 9 3', maxLen: 10 }],
  random: () => ({ arr: list(rarr(rint(5, 9), -3, 9)) }),
  code: {
    pseudo: `
function firstMissingPositive(a, n)
  i ← 0
  while i < n                                       // @look
    v ← a[i]
    if 1 ≤ v ≤ n and a[v − 1] ≠ v: swap a[i], a[v − 1]   // @swap
    else i ← i + 1                                  // @skip
  for k ← 0 to n − 1                                // @scan
    if a[k] ≠ k + 1: return k + 1                   // @answer
  return n + 1                                      // @answer`,
    cpp: `
int firstMissingPositive(vector<int>& a) {
    int n = a.size(), i = 0;
    while (i < n) {                                         // @look
        int v = a[i];
        if (v >= 1 && v <= n && a[v - 1] != v) swap(a[i], a[v - 1]);   // @swap
        else i++;                                           // @skip
    }
    for (int k = 0; k < n; k++)                             // @scan
        if (a[k] != k + 1) return k + 1;                    // @answer
    return n + 1;                                           // @answer
}`,
    java: `
static int firstMissingPositive(int[] a) {
    int n = a.length, i = 0;
    while (i < n) {                                         // @look
        int v = a[i];
        if (v >= 1 && v <= n && a[v - 1] != v) { a[i] = a[v - 1]; a[v - 1] = v; }   // @swap
        else i++;                                           // @skip
    }
    for (int k = 0; k < n; k++)                             // @scan
        if (a[k] != k + 1) return k + 1;                    // @answer
    return n + 1;                                           // @answer
}`,
    python: `
def first_missing_positive(a):
    n, i = len(a), 0
    while i < n:                                            # @look
        v = a[i]
        if 1 <= v <= n and a[v - 1] != v:                   # @swap
            a[i], a[v - 1] = a[v - 1], v                    # @swap
        else:
            i += 1                                          # @skip
    for k in range(n):                                      # @scan
        if a[k] != k + 1:                                   # @answer
            return k + 1                                    # @answer
    return n + 1                                            # @answer`,
    js: `
function firstMissingPositive(a) {
  const n = a.length; let i = 0;
  while (i < n) {                                           // @look
    const v = a[i];
    if (v >= 1 && v <= n && a[v - 1] !== v) { a[i] = a[v - 1]; a[v - 1] = v; }   // @swap
    else i++;                                               // @skip
  }
  for (let k = 0; k < n; k++)                               // @scan
    if (a[k] !== k + 1) return k + 1;                       // @answer
  return n + 1;                                             // @answer
}`,
    c: `
int first_missing_positive(int *a, int n) {
    int i = 0;
    while (i < n) {                                         // @look
        int v = a[i];
        if (v >= 1 && v <= n && a[v - 1] != v) { a[i] = a[v - 1]; a[v - 1] = v; }   // @swap
        else i++;                                           // @skip
    }
    for (int k = 0; k < n; k++)                             // @scan
        if (a[k] != k + 1) return k + 1;                    // @answer
    return n + 1;                                           // @answer
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      if (!n) throw new Error('Give at least one value.')
      const a = t.array('a', v, { label: `a (n = ${n}: only values 1…${n} can matter)` })
      const paint = () => {
        for (let k = 0; k < n; k++) {
          const x = a.get(k) as number
          if (x === k + 1) a.role(k, 'done')
          else if (x < 1 || x > n) a.role(k, 'dim')
        }
      }
      t.step('look', `The answer is in 1…${n + 1}: n values can fill at most the n slots 1…${n}. So anything ≤ 0 or > ${n} is irrelevant.`, { n })
      let i = 0
      while (i < n) {
        const x = a.get(i) as number
        a.clear().ptr('i', i)
        paint()
        a.role(i, 'active')
        if (x >= 1 && x <= n && a.get(x - 1) !== x) {
          a.role(x - 1, 'compare').arrow(i, x - 1, `${x} → [${x - 1}]`, 'swap')
          t.step('look', `a[${i}] = ${x} is in range and its home [${x - 1}] holds ${a.get(x - 1)}, not ${x}.`, { i, 'a[i]': x })
          a.swap(i, x - 1)
          a.clear().ptr('i', i)
          paint()
          a.role(i, 'swap')
          t.step('swap', `Swap: ${x} is home at [${x - 1}]. The incoming ${a.get(i)} is examined next at the same i.`, { i, 'a[i]': a.get(i) as number })
        } else {
          t.step('skip', x < 1 || x > n ? `a[${i}] = ${x} is outside 1…${n}: it can never affect the answer — skip.` : x === i + 1 ? `a[${i}] = ${x} is already home.` : `${x} already sits at its home [${x - 1}] — this copy is a duplicate; skip.`, { i, 'a[i]': x })
          i++
        }
      }
      a.clear().ptr('i', null)
      paint()
      for (let k = 0; k < n; k++) {
        a.clear().ptr('k', k)
        paint()
        if (a.get(k) !== k + 1) {
          a.role(k, 'best')
          t.step('answer', `a[${k}] = ${a.get(k)} ≠ ${k + 1}: the value ${k + 1} never arrived, so ${k + 1} is the first missing positive.`, { k, answer: k + 1 })
          return
        }
        a.role(k, 'active')
        t.step('scan', `a[${k}] = ${k + 1}: present.`, { k })
      }
      a.clear().ptr('k', null)
      paint()
      t.step('answer', `Every slot holds its own value 1…${n}, so the first missing positive is n + 1 = ${n + 1}.`, { answer: n + 1 })
    }),
}

/* ───────────────────────── Find all duplicates by sign marking ───────────────────────── */

export const arrDupMarks: Algorithm = {
  id: 'arr-dup-marks',
  title: 'Find all duplicates — the sign of a[v − 1] remembers "seen v"',
  blurb: 'Values are 1…n, so each value owns one slot. Flip that slot negative the first time; finding it already negative means a repeat.',
  legend: { active: 'reading', compare: 'slot owned by |v|', removed: 'marked (negative)', found: 'duplicate found' },
  inputs: [{ name: 'arr', label: 'Values in 1…n', type: 'array', default: '4 3 2 7 8 2 3 1', maxLen: 10 }],
  random: () => {
    const n = rint(6, 9)
    return { arr: list(Array.from({ length: n }, () => rint(1, n))) }
  },
  code: {
    pseudo: `
function findDuplicates(a, n)          // values in 1…n
  out ← []
  for i ← 0 to n − 1
    j ← |a[i]| − 1                      // @visit
    if a[j] < 0: out.append(|a[i]|)     // @dup
    else a[j] ← −a[j]                   // @mark
  return out                            // @done`,
    cpp: `
vector<int> findDuplicates(vector<int>& a) {
    vector<int> out;
    for (size_t i = 0; i < a.size(); i++) {
        int j = abs(a[i]) - 1;              // @visit
        if (a[j] < 0) out.push_back(j + 1); // @dup
        else a[j] = -a[j];                  // @mark
    }
    return out;                             // @done
}`,
    java: `
static List<Integer> findDuplicates(int[] a) {
    List<Integer> out = new ArrayList<>();
    for (int i = 0; i < a.length; i++) {
        int j = Math.abs(a[i]) - 1;         // @visit
        if (a[j] < 0) out.add(j + 1);       // @dup
        else a[j] = -a[j];                  // @mark
    }
    return out;                             // @done
}`,
    python: `
def find_duplicates(a):
    out = []
    for i in range(len(a)):
        j = abs(a[i]) - 1                   # @visit
        if a[j] < 0:                        # @dup
            out.append(j + 1)               # @dup
        else:
            a[j] = -a[j]                    # @mark
    return out                              # @done`,
    js: `
function findDuplicates(a) {
  const out = [];
  for (let i = 0; i < a.length; i++) {
    const j = Math.abs(a[i]) - 1;           // @visit
    if (a[j] < 0) out.push(j + 1);          // @dup
    else a[j] = -a[j];                      // @mark
  }
  return out;                               // @done
}`,
    c: `
int find_duplicates(int *a, int n, int *out) {
    int k = 0;
    for (int i = 0; i < n; i++) {
        int j = abs(a[i]) - 1;              // @visit
        if (a[j] < 0) out[k++] = j + 1;     // @dup
        else a[j] = -a[j];                  // @mark
    }
    return k;                               // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      if (v.some((x) => !Number.isInteger(x) || x < 1 || x > n)) throw new Error(`Every value must be an integer from 1 to n = ${n}.`)
      const a = t.array('a', v, { label: 'a (a negative a[j] means "value j + 1 has been seen")' })
      const dups: number[] = []
      const paint = () => {
        for (let k = 0; k < n; k++) if ((a.get(k) as number) < 0) a.role(k, 'removed')
      }
      for (let i = 0; i < n; i++) {
        const val = Math.abs(a.get(i) as number)
        const j = val - 1
        a.clear().ptr('i', i)
        paint()
        a.role(i, 'active').role(j, 'compare')
        if (i !== j) a.arrow(i, j, `|${a.get(i)}| = ${val}`, 'compare')
        t.step('visit', `Read a[${i}] = ${a.get(i)}. Use its absolute value ${val} (an earlier step may have flipped the sign): it owns slot ${j}.`, { i, value: val, slot: j, duplicates: dups.join(' ') || '—' })
        if ((a.get(j) as number) < 0) {
          dups.push(val)
          t.print(`${val}`)
          a.clear().ptr('i', i)
          paint()
          a.role(j, 'found')
          t.step('dup', `a[${j}] is already negative: ${val} was seen before. Report ${val}.`, { i, value: val, slot: j, duplicates: dups.join(' ') })
        } else {
          a.set(j, -(a.get(j) as number))
          a.clear().ptr('i', i)
          paint()
          a.role(j, 'write')
          t.step('mark', `a[${j}] was positive: first sighting of ${val}. Flip it to ${a.get(j)} — the value it stores is not lost, only its sign is borrowed.`, { i, value: val, slot: j, duplicates: dups.join(' ') || '—' })
        }
      }
      a.clear().ptr('i', null)
      paint()
      t.step('done', `Duplicates: ${dups.join(', ') || 'none'}. One pass, no extra memory beyond the answer. (Flip every value back to positive if the caller needs the array intact.)`, { duplicates: dups.join(' ') || '—' })
    }),
}

/* ───────────────────────── Missing number by XOR (and by sum) ───────────────────────── */

const bin = (x: number, w: number) => x.toString(2).padStart(w, '0')

export const arrMissingXor: Algorithm = {
  id: 'arr-missing-xor',
  title: 'Missing number — pairs cancel under XOR',
  blurb: 'XOR every index 0…n with every value; each present number appears twice and vanishes, leaving the missing one.',
  legend: { active: 'folded in now', done: 'folded in' },
  inputs: [{ name: 'arr', label: 'n distinct values from 0…n', type: 'array', default: '3 0 6 1 5 2 8 4', maxLen: 12 }],
  random: () => {
    const n = rint(5, 10)
    const all = Array.from({ length: n + 1 }, (_, i) => i)
    all.splice(rint(0, n), 1)
    for (let i = all.length - 1; i > 0; i--) {
      const j = rint(0, i)
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return { arr: list(all) }
  },
  code: {
    pseudo: `
function missing(a, n)                 // n values from 0…n, one absent
  x ← n                                // @init
  for i ← 0 to n − 1
    x ← x xor i xor a[i]               // @fold
  return x                             // @answer`,
    cpp: `
int missingNumber(const vector<int>& a) {
    int n = a.size(), x = n;                 // @init
    for (int i = 0; i < n; i++) x ^= i ^ a[i];   // @fold
    return x;                                // @answer
}`,
    java: `
static int missingNumber(int[] a) {
    int n = a.length, x = n;                 // @init
    for (int i = 0; i < n; i++) x ^= i ^ a[i];   // @fold
    return x;                                // @answer
}`,
    python: `
def missing_number(a):
    n = len(a)
    x = n                                    # @init
    for i, v in enumerate(a):
        x ^= i ^ v                           # @fold
    return x                                 # @answer`,
    js: `
function missingNumber(a) {
  let x = a.length;                          // @init
  for (let i = 0; i < a.length; i++) x ^= i ^ a[i];   // @fold
  return x;                                  // @answer
}`,
    c: `
int missing_number(const int *a, int n) {
    int x = n;                               // @init
    for (int i = 0; i < n; i++) x ^= i ^ a[i];   // @fold
    return x;                                // @answer
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const v = arr as number[]
      const n = v.length
      if (new Set(v).size !== n || v.some((x) => !Number.isInteger(x) || x < 0 || x > n)) throw new Error(`Give ${n} distinct integers from 0 to ${n}.`)
      const w = Math.max(3, n.toString(2).length)
      const a = t.array('a', v, { label: `a (n = ${n}, values from 0…${n})` })
      let x = n
      let sum = 0
      t.step('init', `Start x = n = ${n} (binary ${bin(n, w)}). The index n has no slot, so it is folded in up front.`, { x, 'x (binary)': bin(x, w) })
      for (let i = 0; i < n; i++) {
        const before = x
        x ^= i ^ v[i]
        sum += v[i]
        a.clear().ptr('i', i).role(i, 'active')
        for (let k = 0; k < i; k++) a.role(k, 'done')
        t.step('fold', `x = ${before} ⊕ ${i} ⊕ ${v[i]} = ${x}  (${bin(before, w)} ⊕ ${bin(i, w)} ⊕ ${bin(v[i], w)} = ${bin(x, w)}). Every number folded in twice cancels: y ⊕ y = 0.`, { i, 'a[i]': v[i], x, 'x (binary)': bin(x, w), 'running sum': sum })
      }
      a.clear().ptr('i', null)
      for (let k = 0; k < n; k++) a.role(k, 'done')
      const expect = (n * (n + 1)) / 2
      t.step('answer', `Each of 0…${n} was folded in once as an index (or the initial n) and once as a value — except the missing one, which appears only once. x = ${x}. Check by sums: ${expect} − ${sum} = ${expect - sum}.`, { answer: x, 'n(n+1)/2': expect, sum })
    }),
}

export const algorithms1: Algorithm[] = [arrCacheWalk, arrSentinel, arrSortedSearch, arrAmortizedBank, arrShrinkPolicy, arrCyclicSort, arrFirstMissing, arrDupMarks, arrMissingXor]
