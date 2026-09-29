import { trace } from '../engine/tracer'
import type { Algorithm } from '../engine/types'
import { list, rarr, rint } from './util'

/* ───────────────────────── 1. Access and update by index ───────────────────────── */

export const arrAccess: Algorithm = {
  id: 'arr-access',
  title: 'Reading and writing arr[i] — address arithmetic',
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '12 7 30 4 19 8', maxLen: 10 },
    { name: 'i', label: 'Index i', type: 'number', default: '3', min: 0, max: 9 },
    { name: 'v', label: 'New value', type: 'number', default: '42' },
  ],
  random: () => {
    const a = rarr(rint(5, 8), 1, 60)
    return { arr: list(a), i: String(rint(0, a.length - 1)), v: String(rint(1, 99)) }
  },
  code: {
    pseudo: `
// base = address of arr[0], size = bytes per element
function access(arr, i)
  address ← base + i × size        // @addr
  x ← value stored at address      // @read
  return x                         // @read
function update(arr, i, v)
  address ← base + i × size        // @addr2
  store v at address               // @write`,
    cpp: `
int access(const vector<int>& arr, int i) {
    // arr.data() + i  ==  base + i * sizeof(int)   // @addr
    int x = arr[i];                                  // @read
    return x;
}
void update(vector<int>& arr, int i, int v) {
    arr[i] = v;                                      // @addr2,write
}`,
    java: `
static int access(int[] arr, int i) {
    // the JVM computes base + i * 4, after a bounds check   // @addr
    int x = arr[i];                                          // @read
    return x;
}
static void update(int[] arr, int i, int v) {
    arr[i] = v;                                              // @addr2,write
}`,
    python: `
def access(arr, i):
    # a list stores references; arr[i] is still O(1)   # @addr
    x = arr[i]                                         # @read
    return x

def update(arr, i, v):
    arr[i] = v                                         # @addr2,write`,
    js: `
function access(arr, i) {
  // engines keep dense arrays contiguous: base + i * size   // @addr
  const x = arr[i];                                          // @read
  return x;
}
function update(arr, i, v) {
  arr[i] = v;                                                // @addr2,write
}`,
    c: `
int access(const int *arr, int i) {
    const int *p = arr + i;   /* base + i * sizeof(int) */   // @addr
    int x = *p;                                              // @read
    return x;
}
void update(int *arr, int i, int v) {
    *(arr + i) = v;                                          // @addr2,write
}`,
  },
  run: ({ arr, i, v }) =>
    trace((t) => {
      const vals = arr as number[]
      const idx = i as number
      if (idx >= vals.length) throw new Error(`Index ${idx} is outside 0…${vals.length - 1}.`)
      const base = 0x1000
      const a = t.array('arr', vals, { label: 'arr (int, 4 bytes each)', address: { base, size: 4 } })
      t.step('start', `The array lives in one block of memory. arr[0] is at 0x${base.toString(16)} and each int takes 4 bytes, so element k sits at 0x${base.toString(16)} + 4·k.`, { i: idx })
      a.ptr('i', idx)
      const addr = base + idx * 4
      t.step('addr', `To reach arr[${idx}] no searching is needed: the address is 0x${base.toString(16)} + ${idx}×4 = 0x${addr.toString(16)}. That is one multiplication and one addition — O(1), whatever the size of the array.`, { i: idx, address: `0x${addr.toString(16)}` })
      a.role(idx, 'active')
      t.step('read', `Read the value at 0x${addr.toString(16)}: arr[${idx}] = ${vals[idx]}.`, { i: idx, address: `0x${addr.toString(16)}`, x: vals[idx] })
      a.clear()
      t.step('addr2', `Writing works the same way: compute 0x${addr.toString(16)} again, then store.`, { i: idx, address: `0x${addr.toString(16)}`, v: v as number })
      a.set(idx, v as number)
      a.role(idx, 'write')
      t.step('write', `arr[${idx}] now holds ${v}. Nothing else moved — updating by index is also O(1).`, { i: idx, address: `0x${addr.toString(16)}`, v: v as number })
    }),
}

/* ───────────────────────── 2. Traversal: sum and maximum ───────────────────────── */

export const arrTraverse: Algorithm = {
  id: 'arr-traverse',
  title: 'One pass: sum and maximum',
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '4 9 2 15 7 11', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(5, 9), 1, 40)) }),
  code: {
    pseudo: `
function sumAndMax(arr, n)
  sum ← 0                        // @init
  best ← arr[0]                  // @init
  for i ← 0 to n − 1             // @loop
    sum ← sum + arr[i]           // @add
    if arr[i] > best then        // @cmp
      best ← arr[i]              // @best
  return (sum, best)             // @done`,
    cpp: `
pair<long long,int> sumAndMax(const vector<int>& arr) {
    long long sum = 0;                    // @init
    int best = arr[0];                    // @init
    for (size_t i = 0; i < arr.size(); i++) {   // @loop
        sum += arr[i];                    // @add
        if (arr[i] > best)                // @cmp
            best = arr[i];                // @best
    }
    return {sum, best};                   // @done
}`,
    java: `
static long[] sumAndMax(int[] arr) {
    long sum = 0;                              // @init
    int best = arr[0];                         // @init
    for (int i = 0; i < arr.length; i++) {     // @loop
        sum += arr[i];                         // @add
        if (arr[i] > best)                     // @cmp
            best = arr[i];                     // @best
    }
    return new long[]{sum, best};              // @done
}`,
    python: `
def sum_and_max(arr):
    total = 0                     # @init
    best = arr[0]                 # @init
    for i in range(len(arr)):     # @loop
        total += arr[i]           # @add
        if arr[i] > best:         # @cmp
            best = arr[i]         # @best
    return total, best            # @done`,
    js: `
function sumAndMax(arr) {
  let sum = 0;                               // @init
  let best = arr[0];                         // @init
  for (let i = 0; i < arr.length; i++) {     // @loop
    sum += arr[i];                           // @add
    if (arr[i] > best)                       // @cmp
      best = arr[i];                         // @best
  }
  return [sum, best];                        // @done
}`,
    c: `
void sum_and_max(const int *arr, int n, long long *sum, int *best) {
    *sum = 0;                           // @init
    *best = arr[0];                     // @init
    for (int i = 0; i < n; i++) {       // @loop
        *sum += arr[i];                 // @add
        if (arr[i] > *best)             // @cmp
            *best = arr[i];             // @best
    }
}                                       // @done`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const vals = arr as number[]
      if (!vals.length) throw new Error('Give the array at least one value.')
      const a = t.array('arr', vals, { label: 'arr' })
      let sum = 0
      let best = vals[0]
      let bi = 0
      a.role(0, 'best')
      t.step('init', `Start with sum = 0 and best = arr[0] = ${best} — the first element is the best we have seen so far.`, { sum, best })
      for (let i = 0; i < vals.length; i++) {
        a.clear().role(bi, 'best').ptr('i', i)
        if (i !== bi) a.role(i, 'active')
        t.step('loop', `Visit index ${i}. A traversal touches every element exactly once.`, { i, sum, best })
        sum += vals[i]
        t.step('add', `Add arr[${i}] = ${vals[i]} to the running sum → ${sum}.`, { i, sum, best })
        if (i !== bi) a.role(i, 'compare')
        t.step('cmp', `Is ${vals[i]} bigger than the best so far (${best})? ${vals[i] > best ? 'Yes.' : 'No — keep ' + best + '.'}`, { i, sum, best })
        if (vals[i] > best) {
          best = vals[i]
          bi = i
          a.clear().role(i, 'best').ptr('i', i)
          t.step('best', `New maximum: best = ${best}.`, { i, sum, best })
        }
      }
      a.clear().ptr('i', null).role(bi, 'found')
      t.step('done', `Done after ${vals.length} steps: sum = ${sum}, maximum = ${best} (at index ${bi}). Time O(n), extra space O(1).`, { sum, best })
    }),
}

/* ───────────────────────── 3. Insert at a position ───────────────────────── */

export const arrInsert: Algorithm = {
  id: 'arr-insert',
  title: 'Insert x at position k — shifting right',
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '3 8 14 20 27', maxLen: 9 },
    { name: 'k', label: 'Position k', type: 'number', default: '2', min: 0, max: 9 },
    { name: 'x', label: 'Value x', type: 'number', default: '11' },
  ],
  random: () => {
    const a = rarr(rint(4, 7), 1, 50)
    return { arr: list(a), k: String(rint(0, a.length)), x: String(rint(1, 99)) }
  },
  code: {
    pseudo: `
// arr has room for one more; n is the number of elements in use
function insertAt(arr, n, k, x)
  for j ← n − 1 downto k               // @loop
    arr[j + 1] ← arr[j]                // @shift
  arr[k] ← x                           // @write
  n ← n + 1                            // @grow
  return n`,
    cpp: `
// arr has capacity > n
int insertAt(int arr[], int n, int k, int x) {
    for (int j = n - 1; j >= k; j--)    // @loop
        arr[j + 1] = arr[j];            // @shift
    arr[k] = x;                         // @write
    return n + 1;                       // @grow
}
// with std::vector: v.insert(v.begin() + k, x) does the same shifting`,
    java: `
// arr.length > n
static int insertAt(int[] arr, int n, int k, int x) {
    for (int j = n - 1; j >= k; j--)    // @loop
        arr[j + 1] = arr[j];            // @shift
    arr[k] = x;                         // @write
    return n + 1;                       // @grow
}
// System.arraycopy(arr, k, arr, k + 1, n - k) shifts in one call`,
    python: `
def insert_at(arr, n, k, x):
    arr.append(None)              # make room at the end
    for j in range(n - 1, k - 1, -1):   # @loop
        arr[j + 1] = arr[j]       # @shift
    arr[k] = x                    # @write
    return n + 1                  # @grow
# arr.insert(k, x) does exactly this shifting internally`,
    js: `
function insertAt(arr, n, k, x) {
  for (let j = n - 1; j >= k; j--)   // @loop
    arr[j + 1] = arr[j];             // @shift
  arr[k] = x;                        // @write
  return n + 1;                      // @grow
}
// arr.splice(k, 0, x) is the built-in version`,
    c: `
/* arr must have room for n + 1 ints */
int insert_at(int *arr, int n, int k, int x) {
    for (int j = n - 1; j >= k; j--)    // @loop
        arr[j + 1] = arr[j];            // @shift
    arr[k] = x;                         // @write
    return n + 1;                       // @grow
}
/* memmove(arr + k + 1, arr + k, (n - k) * sizeof(int)); shifts in one call */`,
  },
  run: ({ arr, k, x }) =>
    trace((t) => {
      const vals = arr as number[]
      const n = vals.length
      const pos = k as number
      if (pos > n) throw new Error(`k must be between 0 and ${n}.`)
      const a = t.array('arr', vals, { label: `arr (capacity ${n + 1})`, capacity: n + 1 })
      a.range([{ from: pos, to: n - 1, role: 'window', label: 'must move right' }])
      a.ptr('k', pos)
      t.step('start', `Insert ${x} at index ${pos}. Every element from index ${pos} to ${n - 1} has to move one slot right to open a gap — ${n - pos} move${n - pos === 1 ? '' : 's'}.`, { n, k: pos, x: x as number })
      for (let j = n - 1; j >= pos; j--) {
        a.clear().ptr('j', j).role(j, 'active').arrow(j, j + 1, 'copy')
        t.step('loop', `j = ${j}: move from the right end first, so nothing is overwritten before it is copied.`, { n, k: pos, j })
        a.move(j + 1, j)
        a.role(j + 1, 'swap')
        t.step('shift', `arr[${j + 1}] ← arr[${j}] (${vals[j]} slides right).`, { n, k: pos, j })
      }
      a.clear().ptr('j', null).range([])
      a.set(pos, x as number)
      a.role(pos, 'new')
      t.step('write', `The gap is at index ${pos}; write ${x} there.`, { n, k: pos, x: x as number })
      t.step('grow', `n becomes ${n + 1}. Cost: ${n - pos} shifts. Worst case (k = 0) shifts all n elements → O(n); inserting at the end shifts nothing → O(1).`, { n: n + 1, k: pos })
    }),
}

/* ───────────────────────── 4. Delete at a position ───────────────────────── */

export const arrDelete: Algorithm = {
  id: 'arr-delete',
  title: 'Delete the element at position k — shifting left',
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '5 10 15 20 25 30', maxLen: 10 },
    { name: 'k', label: 'Position k', type: 'number', default: '1', min: 0, max: 9 },
  ],
  random: () => {
    const a = rarr(rint(5, 8), 1, 50)
    return { arr: list(a), k: String(rint(0, a.length - 1)) }
  },
  code: {
    pseudo: `
function deleteAt(arr, n, k)
  for j ← k to n − 2                   // @loop
    arr[j] ← arr[j + 1]                // @shift
  n ← n − 1                            // @shrink
  return n`,
    cpp: `
int deleteAt(int arr[], int n, int k) {
    for (int j = k; j < n - 1; j++)    // @loop
        arr[j] = arr[j + 1];           // @shift
    return n - 1;                      // @shrink
}
// std::vector: v.erase(v.begin() + k)`,
    java: `
static int deleteAt(int[] arr, int n, int k) {
    for (int j = k; j < n - 1; j++)    // @loop
        arr[j] = arr[j + 1];           // @shift
    return n - 1;                      // @shrink
}`,
    python: `
def delete_at(arr, k):
    n = len(arr)
    for j in range(k, n - 1):     # @loop
        arr[j] = arr[j + 1]       # @shift
    arr.pop()                     # @shrink
# del arr[k] / arr.pop(k) do this shifting internally`,
    js: `
function deleteAt(arr, k) {
  for (let j = k; j < arr.length - 1; j++)   // @loop
    arr[j] = arr[j + 1];                     // @shift
  arr.length -= 1;                           // @shrink
}
// arr.splice(k, 1) is the built-in version`,
    c: `
int delete_at(int *arr, int n, int k) {
    for (int j = k; j < n - 1; j++)    // @loop
        arr[j] = arr[j + 1];           // @shift
    return n - 1;                      // @shrink
}`,
  },
  run: ({ arr, k }) =>
    trace((t) => {
      const vals = arr as number[]
      const n = vals.length
      const pos = k as number
      if (pos >= n) throw new Error(`k must be between 0 and ${n - 1}.`)
      const a = t.array('arr', vals, { label: 'arr' })
      a.role(pos, 'removed').ptr('k', pos)
      t.step('start', `Delete arr[${pos}] = ${vals[pos]}. Arrays cannot have holes, so everything after it moves one slot left — ${n - 1 - pos} move${n - 1 - pos === 1 ? '' : 's'}.`, { n, k: pos })
      a.set(pos, null)
      for (let j = pos; j < n - 1; j++) {
        a.clear().ptr('j', j)
        a.role(j + 1, 'active').arrow(j + 1, j, 'copy')
        t.step('loop', `j = ${j}: fill the gap at ${j} with its right neighbour.`, { n, k: pos, j })
        a.move(j, j + 1)
        a.clear().ptr('j', j).role(j, 'swap')
        t.step('shift', `arr[${j}] ← arr[${j + 1}] (${vals[j + 1]} slides left).`, { n, k: pos, j })
      }
      a.clear().ptr('j', null)
      a.cells.length = n - 1
      t.step('shrink', `n becomes ${n - 1}. Deleting from the front costs n − 1 shifts → O(n); deleting the last element costs none → O(1).`, { n: n - 1 })
    }),
}

/* ───────────────────────── 5. Linear search ───────────────────────── */

export const arrLinear: Algorithm = {
  id: 'arr-linear-search',
  title: 'Linear search — look at each element until it matches',
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '14 3 27 9 3 41 18', maxLen: 12 },
    { name: 'target', label: 'Target', type: 'number', default: '9' },
  ],
  random: () => {
    const a = rarr(rint(6, 10), 1, 30)
    return { arr: list(a), target: String(Math.random() < 0.75 ? a[rint(0, a.length - 1)] : rint(31, 40)) }
  },
  code: {
    pseudo: `
function linearSearch(arr, n, target)
  for i ← 0 to n − 1                  // @loop
    if arr[i] = target then           // @cmp
      return i                        // @found
  return −1                           // @miss`,
    cpp: `
int linearSearch(const vector<int>& arr, int target) {
    for (int i = 0; i < (int)arr.size(); i++)   // @loop
        if (arr[i] == target)                   // @cmp
            return i;                           // @found
    return -1;                                  // @miss
}`,
    java: `
static int linearSearch(int[] arr, int target) {
    for (int i = 0; i < arr.length; i++)   // @loop
        if (arr[i] == target)              // @cmp
            return i;                      // @found
    return -1;                             // @miss
}`,
    python: `
def linear_search(arr, target):
    for i in range(len(arr)):     # @loop
        if arr[i] == target:      # @cmp
            return i              # @found
    return -1                     # @miss`,
    js: `
function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++)   // @loop
    if (arr[i] === target)               // @cmp
      return i;                          // @found
  return -1;                             // @miss
}`,
    c: `
int linear_search(const int *arr, int n, int target) {
    for (int i = 0; i < n; i++)         // @loop
        if (arr[i] == target)           // @cmp
            return i;                   // @found
    return -1;                          // @miss
}`,
  },
  run: ({ arr, target }) =>
    trace((t) => {
      const vals = arr as number[]
      const a = t.array('arr', vals, { label: 'arr' })
      t.step('start', `Search for ${target}. The array is not sorted, so there is no shortcut: check elements one by one from the left.`, { target: target as number })
      for (let i = 0; i < vals.length; i++) {
        a.clear().ptr('i', i)
        for (let d = 0; d < i; d++) a.role(d, 'dim')
        a.role(i, 'active')
        t.step('loop', `i = ${i}.`, { i, target: target as number })
        a.role(i, 'compare')
        t.step('cmp', `Is arr[${i}] = ${vals[i]} equal to ${target}? ${vals[i] === target ? 'Yes!' : 'No.'}`, { i, target: target as number })
        if (vals[i] === target) {
          a.role(i, 'found')
          t.step('found', `Found at index ${i} after ${i + 1} comparison${i ? 's' : ''}. We stop at the first match.`, { i, target: target as number, result: i })
          return
        }
      }
      a.clear().ptr('i', null)
      for (let d = 0; d < vals.length; d++) a.role(d, 'dim')
      t.step('miss', `Checked all ${vals.length} elements, no match: return −1. Worst case n comparisons → O(n).`, { target: target as number, result: -1 })
    }),
}

/* ───────────────────────── 6. Reverse in place ───────────────────────── */

export const arrReverse: Algorithm = {
  id: 'arr-reverse',
  title: 'Reverse in place — two pointers walking inward',
  inputs: [{ name: 'arr', label: 'Array', type: 'array', default: '1 2 3 4 5 6 7', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(5, 10), 1, 30)) }),
  code: {
    pseudo: `
function reverse(arr, lo, hi)
  while lo < hi                       // @loop
    swap arr[lo], arr[hi]             // @swap
    lo ← lo + 1                       // @move
    hi ← hi − 1                       // @move
// call reverse(arr, 0, n − 1)        // @done`,
    cpp: `
void reverseRange(vector<int>& arr, int lo, int hi) {
    while (lo < hi) {                    // @loop
        swap(arr[lo], arr[hi]);          // @swap
        lo++;                            // @move
        hi--;                            // @move
    }
}
// reverseRange(arr, 0, arr.size() - 1);  or  std::reverse(arr.begin(), arr.end());   // @done`,
    java: `
static void reverseRange(int[] arr, int lo, int hi) {
    while (lo < hi) {                    // @loop
        int t = arr[lo];                 // @swap
        arr[lo] = arr[hi];               // @swap
        arr[hi] = t;                     // @swap
        lo++;                            // @move
        hi--;                            // @move
    }
}   // @done`,
    python: `
def reverse_range(arr, lo, hi):
    while lo < hi:                          # @loop
        arr[lo], arr[hi] = arr[hi], arr[lo] # @swap
        lo += 1                             # @move
        hi -= 1                             # @move
# reverse_range(arr, 0, len(arr) - 1)   or   arr.reverse()   # @done`,
    js: `
function reverseRange(arr, lo, hi) {
  while (lo < hi) {                        // @loop
    [arr[lo], arr[hi]] = [arr[hi], arr[lo]];   // @swap
    lo++;                                  // @move
    hi--;                                  // @move
  }
}
// reverseRange(arr, 0, arr.length - 1)  or  arr.reverse()   // @done`,
    c: `
void reverse_range(int *arr, int lo, int hi) {
    while (lo < hi) {                    // @loop
        int t = arr[lo];                 // @swap
        arr[lo] = arr[hi];               // @swap
        arr[hi] = t;                     // @swap
        lo++;                            // @move
        hi--;                            // @move
    }
}   // @done`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const vals = arr as number[]
      const a = t.array('arr', vals, { label: 'arr' })
      let lo = 0
      let hi = vals.length - 1
      a.ptr('lo', lo).ptr('hi', hi)
      t.step('start', 'Put one pointer at each end. The first and last elements trade places, then the pointers move toward each other.', { lo, hi })
      while (true) {
        a.clear().ptr('lo', lo).ptr('hi', hi)
        for (let d = 0; d < lo; d++) a.role(d, 'done')
        for (let d = hi + 1; d < vals.length; d++) a.role(d, 'done')
        t.step('loop', lo < hi ? `lo = ${lo} < hi = ${hi}: keep going.` : `lo = ${lo}, hi = ${hi}: the pointers met${lo === hi ? ' on the middle element, which stays put' : ''}. Stop.`, { lo, hi })
        if (lo >= hi) break
        a.role(lo, 'swap').role(hi, 'swap')
        a.swap(lo, hi)
        a.arrow(lo, hi, undefined, 'swap').arrow(hi, lo, undefined, 'swap')
        t.step('swap', `Swap arr[${lo}] and arr[${hi}].`, { lo, hi })
        lo++
        hi--
        a.ptr('lo', lo).ptr('hi', hi)
        t.step('move', `Move inward: lo = ${lo}, hi = ${hi}.`, { lo, hi })
      }
      a.clear().ptr('lo', null).ptr('hi', null)
      for (let d = 0; d < vals.length; d++) a.role(d, 'done')
      t.step('done', `Reversed with ⌊n/2⌋ = ${Math.floor(vals.length / 2)} swaps. O(n) time, O(1) extra space — no second array needed.`, {})
    }),
}

/* ───────────────────────── 7. Rotate right by k (three reversals) ───────────────────────── */

export const arrRotate: Algorithm = {
  id: 'arr-rotate',
  title: 'Rotate right by k — the three-reversal trick',
  inputs: [
    { name: 'arr', label: 'Array', type: 'array', default: '1 2 3 4 5 6 7', maxLen: 10 },
    { name: 'k', label: 'k', type: 'number', default: '3', min: 0, max: 100 },
  ],
  random: () => ({ arr: list(rarr(rint(5, 8), 1, 20)), k: String(rint(1, 6)) }),
  code: {
    pseudo: `
function rotateRight(arr, n, k)
  k ← k mod n                         // @mod
  reverse(arr, 0, n − 1)              // @rev1
  reverse(arr, 0, k − 1)              // @rev2
  reverse(arr, k, n − 1)              // @rev3`,
    cpp: `
void rotateRight(vector<int>& a, int k) {
    int n = a.size();
    k %= n;                                   // @mod
    reverse(a.begin(), a.end());              // @rev1
    reverse(a.begin(), a.begin() + k);        // @rev2
    reverse(a.begin() + k, a.end());          // @rev3
}`,
    java: `
static void rotateRight(int[] a, int k) {
    int n = a.length;
    k %= n;                                   // @mod
    reverseRange(a, 0, n - 1);                // @rev1
    reverseRange(a, 0, k - 1);                // @rev2
    reverseRange(a, k, n - 1);                // @rev3
}`,
    python: `
def rotate_right(a, k):
    n = len(a)
    k %= n                        # @mod
    a.reverse()                   # @rev1
    a[:k] = reversed(a[:k])       # @rev2
    a[k:] = reversed(a[k:])       # @rev3`,
    js: `
function rotateRight(a, k) {
  const n = a.length;
  k %= n;                                  // @mod
  reverseRange(a, 0, n - 1);               // @rev1
  reverseRange(a, 0, k - 1);               // @rev2
  reverseRange(a, k, n - 1);               // @rev3
}`,
    c: `
void rotate_right(int *a, int n, int k) {
    k %= n;                                   // @mod
    reverse_range(a, 0, n - 1);               // @rev1
    reverse_range(a, 0, k - 1);               // @rev2
    reverse_range(a, k, n - 1);               // @rev3
}`,
  },
  run: ({ arr, k }) =>
    trace((t) => {
      const vals = arr as number[]
      const n = vals.length
      const a = t.array('arr', vals, { label: 'arr' })
      const kk = (k as number) % n
      t.step('mod', `Rotating by n brings the array back to itself, so only k mod n matters: ${k} mod ${n} = ${kk}. The last ${kk} elements should end up in front.`, { n, k: kk })
      a.range([{ from: n - kk, to: n - 1, role: 'best', label: `last ${kk}` }])
      t.step('mod', `Goal: move the highlighted block to the front while keeping both blocks in order.`, { n, k: kk })
      const rev = (lo: number, hi: number, step: string, label: string) => {
        a.range(lo <= hi ? [{ from: lo, to: hi, role: 'window', label }] : [])
        t.step(step, `${label}: reverse indices ${lo}…${hi}.`, { n, k: kk, lo, hi })
        while (lo < hi) {
          a.clear().role(lo, 'swap').role(hi, 'swap')
          a.swap(lo, hi)
          a.arrow(lo, hi, undefined, 'swap').arrow(hi, lo, undefined, 'swap')
          t.step(step, `Swap positions ${lo} and ${hi}.`, { n, k: kk, lo, hi })
          lo++
          hi--
        }
        a.clear()
      }
      rev(0, n - 1, 'rev1', 'Reverse everything')
      t.step('rev1', 'After reversing the whole array, the last k elements are at the front — but backwards, and so is the rest.', { n, k: kk })
      rev(0, kk - 1, 'rev2', 'Reverse the first k')
      rev(kk, n - 1, 'rev3', 'Reverse the rest')
      a.range([])
      for (let d = 0; d < n; d++) a.role(d, 'done')
      t.step('rev3', `Rotated right by ${kk}. Each element was swapped at most twice → O(n) time, O(1) extra space.`, { n, k: kk })
    }),
}

/* ───────────────────────── 8. Dynamic array push with doubling ───────────────────────── */

export const arrDynamic: Algorithm = {
  id: 'arr-dynamic',
  title: 'Dynamic array — push_back with capacity doubling',
  inputs: [{ name: 'vals', label: 'Values to push', type: 'array', default: '7 3 9 1 6 4', maxLen: 9 }],
  random: () => ({ vals: list(rarr(rint(5, 9), 1, 20)) }),
  code: {
    pseudo: `
function push(v)
  if size = capacity then            // @full
    newBuf ← allocate(2 × capacity) // @alloc
    for i ← 0 to size − 1            // @copy
      newBuf[i] ← buf[i]             // @copy
    free(buf); buf ← newBuf          // @swapbuf
    capacity ← 2 × capacity          // @swapbuf
  buf[size] ← v                      // @write
  size ← size + 1                    // @write`,
    cpp: `
struct DynArray {
    int *buf = new int[1]; int size = 0, cap = 1;
    void push(int v) {
        if (size == cap) {                          // @full
            int *nb = new int[2 * cap];            // @alloc
            for (int i = 0; i < size; i++)         // @copy
                nb[i] = buf[i];                    // @copy
            delete[] buf; buf = nb; cap *= 2;      // @swapbuf
        }
        buf[size++] = v;                           // @write
    }
};  // std::vector<int>::push_back works this way`,
    java: `
class DynArray {
    int[] buf = new int[1]; int size = 0;
    void push(int v) {
        if (size == buf.length) {                   // @full
            int[] nb = new int[2 * buf.length];    // @alloc
            for (int i = 0; i < size; i++)         // @copy
                nb[i] = buf[i];                    // @copy
            buf = nb;                              // @swapbuf
        }
        buf[size++] = v;                           // @write
    }
}   // java.util.ArrayList grows by 1.5x`,
    python: `
class DynArray:
    def __init__(self):
        self.buf, self.size, self.cap = [None], 0, 1
    def push(self, v):
        if self.size == self.cap:                   # @full
            nb = [None] * (2 * self.cap)           # @alloc
            for i in range(self.size):             # @copy
                nb[i] = self.buf[i]                # @copy
            self.buf, self.cap = nb, 2 * self.cap  # @swapbuf
        self.buf[self.size] = v                    # @write
        self.size += 1                             # @write
# CPython's list over-allocates by about 1/8 plus a constant`,
    js: `
class DynArray {
  constructor() { this.buf = new Int32Array(1); this.size = 0; }
  push(v) {
    if (this.size === this.buf.length) {                 // @full
      const nb = new Int32Array(2 * this.buf.length);   // @alloc
      for (let i = 0; i < this.size; i++)               // @copy
        nb[i] = this.buf[i];                            // @copy
      this.buf = nb;                                    // @swapbuf
    }
    this.buf[this.size++] = v;                          // @write
  }
}`,
    c: `
typedef struct { int *buf; int size, cap; } DynArray;
void push(DynArray *d, int v) {
    if (d->size == d->cap) {                                   // @full
        int *nb = malloc(2 * d->cap * sizeof(int));           // @alloc
        for (int i = 0; i < d->size; i++)                     // @copy
            nb[i] = d->buf[i];                                // @copy
        free(d->buf); d->buf = nb; d->cap *= 2;               // @swapbuf
    }
    d->buf[d->size++] = v;                                    // @write
}   /* realloc() can often grow in place */`,
  },
  run: ({ vals }) =>
    trace((t) => {
      const v = vals as number[]
      let cap = 1
      let size = 0
      let copies = 0
      let buf = t.array('buf', [], { label: 'buf (capacity 1)', capacity: 1 })
      t.step('start', 'An empty dynamic array: capacity 1, size 0. It will grow only when it runs out of room.', { size, capacity: cap, copies })
      for (const x of v) {
        buf.clear()
        t.step('full', size === cap ? `push(${x}): size ${size} = capacity ${cap} — full.` : `push(${x}): size ${size} < capacity ${cap}, there is room.`, { size, capacity: cap, copies })
        if (size === cap) {
          const nb = t.array('nb', [], { label: `new buffer (capacity ${2 * cap})`, capacity: 2 * cap })
          t.step('alloc', `Allocate a new buffer twice as big: ${2 * cap} slots.`, { size, capacity: cap, copies })
          for (let i = 0; i < size; i++) {
            buf.clear().role(i, 'active')
            nb.push(buf.get(i) as number)
            nb.clear().role(i, 'write')
            copies++
            t.step('copy', `Copy element ${i} (${buf.get(i)}) into the new buffer.`, { size, capacity: cap, i, copies })
          }
          t.drop(buf)
          nb.clear()
          nb.id = 'buf'
          nb.opts.label = `buf (capacity ${2 * cap})`
          buf = nb
          cap *= 2
          t.step('swapbuf', `Free the old buffer; the new one becomes buf. Capacity is now ${cap}.`, { size, capacity: cap, copies })
        }
        buf.set(size, x)
        buf.clear().role(size, 'new')
        size++
        t.step('write', `Store ${x} at index ${size - 1}; size = ${size}.`, { size, capacity: cap, copies })
      }
      buf.clear()
      t.step('write', `${v.length} pushes cost ${copies} copies in total — fewer than ${v.length}. Doubling makes copies rare, so push is O(1) amortized.`, { size, capacity: cap, copies })
    }),
}
