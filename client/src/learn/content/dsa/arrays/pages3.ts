import type { Page } from '../../../types'

export const memoryCache: Page = {
  id: 'memory-and-cache',
  title: 'Where arrays live: allocation, static vs dynamic, and the cache',
  summary: 'Stack, heap and static memory; what "static" and "dynamic" arrays really mean in each language; and why the order you walk memory in can change speed tenfold.',
  minutes: 16,
  blocks: [
    {
      t: 'md',
      md: `
        Two programs compute the same sum over the same $4096 \\times 4096$ matrix with the same $O(n^2)$ loop. One finishes in about 15 ms, the other in about 150 ms. Nothing about Big-O explains that — the difference is **how each loop walks memory**. To understand it we need two facts about real machines: *where* an array's bytes are placed, and *how* the CPU fetches them.

        ## Three places an array can live

        | region | how you get it | lifetime | size limit | typical use |
        |---|---|---|---|---|
        | **stack** | a local \`int a[100]\` in C/C++ | until the function returns | small: 1–8 MB for the whole stack | small scratch arrays |
        | **static / global** | \`int a[1000000];\` at file scope | the whole program | large (part of the executable image) | contest-style fixed buffers |
        | **heap** | \`malloc\`, \`new\`, \`vector\`, every Java/Python/JS array | until freed / garbage-collected | as much RAM as you have | anything big or growable |

        The stack is fast to allocate (moving one register) but tiny. Declaring \`int grid[2000][2000]\` (16 MB) as a **local** variable in C or C++ overflows it and the program dies with a segmentation fault before running a single line of your logic. Make it global, \`static\`, or a \`vector\`.

        ## "Static" vs "dynamic" arrays

        These words mean two different things, and interviewers use both:

        1. **Size fixed vs growable.** A *static* array has a capacity fixed at creation (\`int a[n]\`, \`std::array\`, Java \`int[]\`, \`Int32Array\`). A *dynamic* array grows on demand (\`vector\`, \`ArrayList\`, Python \`list\`, JS \`Array\`) by reallocating — the subject of the dynamic-arrays and amortized-analysis pages.
        2. **Allocated at compile time vs at run time.** In C, \`int a[100]\` has its size baked in; \`malloc(n * sizeof(int))\` picks the size at run time. Both are still *fixed-size* once created.

        | language | fixed-size, packed values | growable | note |
        |---|---|---|---|
        | C | \`int a[N]\`, \`malloc\` | write it yourself (\`realloc\`) | no bounds checks |
        | C++ | \`int a[N]\`, \`std::array<int, N>\` | \`std::vector<int>\` | vector stores ints contiguously |
        | Java | \`int[]\` (always on the heap) | \`ArrayList<Integer>\` | ArrayList holds *pointers to boxed* Integers |
        | Python | \`array.array('i')\`, NumPy arrays | \`list\` | a list is a dynamic array of *pointers to objects* |
        | JavaScript | \`Int32Array\`, \`Float64Array\` | \`Array\` | engines pack small ints/doubles when they can |

        **The packed-versus-pointers column matters as much as fixed-versus-growable:** an \`int[]\` holds the numbers themselves side by side; an \`ArrayList<Integer>\` or Python \`list\` holds addresses, and every element read is a second memory access to wherever that object lives.
      `,
    },
    {
      t: 'md',
      md: `
        ## The memory hierarchy

        A CPU can do an addition in well under a nanosecond, but fetching a value from main memory takes around **100 ns**. To hide that gap there are layers of small, fast caches:

        | level | typical size | latency (cycles) |
        |---|---|---|
        | register | a few hundred bytes | 0 |
        | L1 cache | 32–64 KB per core | ~4 |
        | L2 cache | 256 KB – 2 MB | ~12 |
        | L3 cache | 8–64 MB shared | ~40 |
        | main memory (RAM) | GBs | ~200–300 |

        Memory never moves to the cache one value at a time. It moves in **cache lines** of **64 bytes** — sixteen 4-byte ints. Touch one int and its fifteen neighbours come along for free. Two kinds of locality make this pay off:

        - **Spatial locality** — after using address $p$ you soon use $p + 4, p + 8, \\ldots$ Arrays scanned in order have perfect spatial locality.
        - **Temporal locality** — a value you just used is likely to be used again soon (a running sum, a small lookup table).

        Hardware **prefetchers** also notice sequential or fixed-stride access and fetch the next lines *before* you ask. A forward scan through an array is the single most cache-friendly thing a program can do.

        ## Row order vs column order

        A $R \\times C$ matrix in C, C++, NumPy or a flat JS typed array is **row-major**: element $(r, c)$ is at offset $r \\cdot C + c$. With \`c\` in the inner loop, consecutive accesses are adjacent in memory; with \`r\` in the inner loop they are $C$ elements apart — a different cache line every time, and by the time the loop comes back for the neighbour, the line has usually been evicted.

        The animation shrinks the machine down to something you can watch: a line holds 4 elements and the cache holds only 3 lines. Run it in **column** order first, then switch the order input to \`row\`.
      `,
    },
    { t: 'viz', algo: 'arr-cache-walk', caption: 'Column order (the default) misses on every access: 4 rows need 4 different lines but only 3 fit. Change order to "row" — 8 misses, one per line, the minimum.' },
    {
      t: 'md',
      md: `
        ## Counting misses exactly

        Let a line hold $B$ elements and the matrix be $R \\times C$ with $C$ a multiple of $B$.

        - **Row order** touches each line exactly once, in sequence: $\\dfrac{RC}{B}$ misses. With 4-byte ints and 64-byte lines, $B = 16$ — one miss per 16 additions.
        - **Column order**, when the cache cannot hold one line for each of the $R$ rows at once: every access lands on a line that was evicted since its last use, so **every one of the $RC$ accesses misses** — $B$ times more traffic. If the cache *can* hold $R$ lines (small matrices), column order is fine too: that is why the slowdown appears only once the matrix outgrows the cache.

        **Same instructions, same Big-O, up to $16\\times$ more memory traffic.** Big-O counts operations; the cache decides what each operation costs.
      `,
    },
    {
      t: 'code',
      title: 'Measure it yourself: same sum, two loop orders',
      code: {
        cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    const int N = 4096;
    vector<int> M(N * N, 1);                 // one contiguous row-major block
    auto time = [&](bool rowOrder) {
        auto t0 = chrono::steady_clock::now();
        long long s = 0;
        for (int i = 0; i < N; i++)
            for (int j = 0; j < N; j++)
                s += rowOrder ? M[i * N + j] : M[j * N + i];
        auto ms = chrono::duration<double, milli>(chrono::steady_clock::now() - t0).count();
        printf("%s order: sum=%lld  %.1f ms\\n", rowOrder ? "row" : "col", s, ms);
    };
    time(true);
    time(false);   // typically 5-10x slower
}`,
        java: `public class Main {
    public static void main(String[] args) {
        final int N = 4096;
        int[] M = new int[N * N];
        java.util.Arrays.fill(M, 1);
        for (int pass = 0; pass < 2; pass++) {
            boolean rowOrder = pass == 0;
            long t0 = System.nanoTime(), s = 0;
            for (int i = 0; i < N; i++)
                for (int j = 0; j < N; j++)
                    s += rowOrder ? M[i * N + j] : M[j * N + i];
            System.out.printf("%s order: sum=%d  %.1f ms%n", rowOrder ? "row" : "col", s, (System.nanoTime() - t0) / 1e6);
        }
    }
}`,
        python: `import time
import numpy as np            # NumPy arrays are packed and row-major (C order)

N = 4096
M = np.ones((N, N), dtype=np.int32)
for name, view in (("row", M), ("col", M.T)):     # M.T walks the same memory by columns
    t0 = time.perf_counter()
    s = int(np.ascontiguousarray(view).sum())       # copying a transposed view is the column walk
    print(name, "order:", s, f"{(time.perf_counter() - t0) * 1000:.1f} ms")`,
        js: `const N = 4096;
const M = new Int32Array(N * N).fill(1);    // packed, row-major
for (const rowOrder of [true, false]) {
  const t0 = performance.now();
  let s = 0;
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++)
      s += rowOrder ? M[i * N + j] : M[j * N + i];
  console.log(rowOrder ? 'row' : 'col', 'order:', s, (performance.now() - t0).toFixed(1), 'ms');
}`,
        c: `#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#define N 4096
static int M[N][N];                      /* 64 MB: global, never on the stack */
int main(void) {
    for (int i = 0; i < N; i++) for (int j = 0; j < N; j++) M[i][j] = 1;
    for (int pass = 0; pass < 2; pass++) {
        clock_t t0 = clock(); long long s = 0;
        for (int i = 0; i < N; i++)
            for (int j = 0; j < N; j++)
                s += pass == 0 ? M[i][j] : M[j][i];
        printf("%s order: sum=%lld  %.1f ms\\n", pass == 0 ? "row" : "col", s,
               1000.0 * (clock() - t0) / CLOCKS_PER_SEC);
    }
    return 0;
}`,
      },
      note: 'Exact timings depend on the machine; the ratio (usually 5–10×) is what matters. Java\'s int[][] is an array of separate row arrays, so the flat int[] above mirrors C memory.',
    },
    {
      t: 'md',
      md: `
        ## Three more consequences

        **Arrays beat linked lists at scanning.** Both are $O(n)$ to traverse, but an array scan streams cache lines while a list hops to wherever each node was allocated — often a miss per node. Measured, summing a large \`vector<int>\` is commonly 10–50× faster than summing a \`list<int>\`.

        **Array of structs vs struct of arrays.** If you store particles as \`struct { x, y, z, mass, colour }\` and a loop only reads \`x\`, every cache line also drags in four fields you do not use. Storing each field in its own array (*struct of arrays*) makes the loop read only what it needs — the layout game engines and databases use for hot loops.

        **Boxing costs.** \`ArrayList<Integer>\` stores references; each \`Integer\` is a separate object of ~16 bytes somewhere on the heap. Summing it chases a pointer per element. When performance matters in Java, use \`int[]\`; in Python, use NumPy or \`array\` for big numeric data.
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Large local arrays crash before your code runs',
      md: `\`int main() { int dp[5000][5000]; … }\` asks for 100 MB of **stack** — far above the usual 1–8 MB limit — and segfaults immediately. Move it to global scope, mark it \`static\`, or use \`vector<vector<int>>\` / \`malloc\`. Java and Python never put arrays on the stack, but deep **recursion** can still exhaust it.`,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How this comes up',
      md: `"Why is iterating a 2D array row by row faster than column by column?" is a classic systems-flavoured question. A complete answer names **row-major layout**, **64-byte cache lines**, **spatial locality** and the **prefetcher**, and adds that Big-O is unchanged — only the constant factor differs. Follow-ups: "what about Fortran/MATLAB?" (column-major, so the opposite loop is fast) and "array vs linked list for iteration?" (array, for the same reason).`,
    },
    {
      t: 'complexity',
      title: 'Same Big-O, different memory traffic (R × C matrix, B elements per line)',
      rows: [
        { op: 'Row-order traversal (row-major storage)', time: 'O(RC)', note: 'RC / B cache misses — optimal' },
        { op: 'Column-order traversal, R lines don\'t fit in cache', time: 'O(RC)', note: 'up to RC misses — B× more traffic' },
        { op: 'Array scan', time: 'O(n)', note: 'n / B misses, prefetcher-friendly' },
        { op: 'Linked-list scan', time: 'O(n)', note: 'up to n misses (one per node)' },
      ],
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-stack-overflow', 'arr-q-cache-line-ints', 'arr-q-row-misses', 'arr-q-col-misses', 'arr-q-boxed', 'arr-q-static-meaning', 'arr-q-soa'] },
  ],
}

export const sortedSearch: Page = {
  id: 'sorted-search',
  title: 'Searching a sorted array — a first look at binary search',
  summary: 'What sorted order buys you: early exits, halving, and the invariant that makes binary search correct.',
  minutes: 14,
  blocks: [
    {
      t: 'md',
      md: `
        Linear search must look at everything because an unsorted array gives no hints: after seeing \`a[i] ≠ x\` you know nothing about any other position. **Sorted order changes that.** One comparison now tells you about a whole block of elements.

        ## Hint 1: early exit

        Scanning a sorted array left to right, the moment you see \`a[i] > x\` you can stop: everything after is even larger. This helps when \`x\` is small or absent-and-small, but the worst case (x larger than everything) is still $n$ comparisons — still $O(n)$.

        ## Hint 2: look in the middle

        Compare \`x\` with the **middle** element \`a[mid]\`:

        - \`a[mid] == x\` — done;
        - \`a[mid] < x\` — every element at or left of \`mid\` is $\\le a[mid] < x$, so **the whole left half is ruled out**;
        - \`a[mid] > x\` — symmetrically, the right half is ruled out.

        One comparison discards half of what is left. That is **binary search**.
      `,
    },
    { t: 'viz', algo: 'arr-sorted-search', caption: 'Watch the window of still-possible indices halve. The meter compares the comparison count with log₂ n and with n.' },
    {
      t: 'md',
      md: `
        ## Why it is correct: the invariant

        > **Invariant:** if $x$ is anywhere in the array, it is in \`a[lo..hi]\`.

        - **Initially** \`lo = 0, hi = n − 1\`: the whole array — true.
        - **Maintained**: we only discard indices proven unable to hold $x$ (shown above), so if $x$ was in \`a[lo..hi]\` before, it still is.
        - **Termination**: each round either returns or shrinks \`hi − lo + 1\` by at least one (mid itself is always excluded). When \`lo > hi\` the range is empty, so by the invariant $x$ is not in the array.

        ## Why it is fast: counting rounds

        Let $m_k$ be the size of the range after $k$ rounds. The new range is one side of \`mid\`, so $m_{k+1} \\le \\lfloor m_k / 2 \\rfloor$. Starting from $m_0 = n$:

        $$m_k \\le \\frac{n}{2^k}$$

        The loop runs while $m_k \\ge 1$, i.e. while $2^k \\le n$, so it runs at most $\\lfloor \\log_2 n \\rfloor + 1$ times. For $n = 10^6$ that is **20 comparisons** instead of up to a million. For $n = 10^9$, 30.

        | n | linear (worst) | binary (worst) |
        |---|---|---|
        | 1 000 | 1 000 | 10 |
        | 1 000 000 | 1 000 000 | 20 |
        | 1 000 000 000 | 1 000 000 000 | 30 |
      `,
    },
    {
      t: 'code',
      title: 'Early-exit linear search and binary search',
      code: {
        cpp: `int linearSorted(const vector<int>& a, int x) {
    for (int i = 0; i < (int)a.size() && a[i] <= x; i++)   // stop once a[i] > x
        if (a[i] == x) return i;
    return -1;
}
int binarySearch(const vector<int>& a, int x) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;          // never overflows
        if (a[mid] == x) return mid;
        if (a[mid] < x) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
}
// library: binary_search(a.begin(), a.end(), x); lower_bound(...) gives the first index with a[i] >= x`,
        java: `static int linearSorted(int[] a, int x) {
    for (int i = 0; i < a.length && a[i] <= x; i++)
        if (a[i] == x) return i;
    return -1;
}
static int binarySearch(int[] a, int x) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = (lo + hi) >>> 1;             // unsigned shift: safe even if lo + hi overflows
        if (a[mid] == x) return mid;
        if (a[mid] < x) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
}
// library: Arrays.binarySearch(a, x) — any matching index, or (-(insertion point) - 1)`,
        python: `def linear_sorted(a, x):
    for i, v in enumerate(a):
        if v > x:
            break
        if v == x:
            return i
    return -1

def binary_search(a, x):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2               # Python ints never overflow
        if a[mid] == x:
            return mid
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

# library: from bisect import bisect_left; i = bisect_left(a, x); found = i < len(a) and a[i] == x`,
        js: `function linearSorted(a, x) {
  for (let i = 0; i < a.length && a[i] <= x; i++) if (a[i] === x) return i;
  return -1;
}
function binarySearch(a, x) {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (a[mid] === x) return mid;
    if (a[mid] < x) lo = mid + 1; else hi = mid - 1;
  }
  return -1;
}
// JavaScript has no built-in binary search on arrays — write it.`,
        c: `int linear_sorted(const int *a, int n, int x) {
    for (int i = 0; i < n && a[i] <= x; i++) if (a[i] == x) return i;
    return -1;
}
int binary_search(const int *a, int n, int x) {
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == x) return mid;
        if (a[mid] < x) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
}
/* library: bsearch() from <stdlib.h> with a comparator */`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'The three classic binary-search bugs',
      md: `1. **Overflow in \`(lo + hi) / 2\`** when both are near $2^{31}$ — use \`lo + (hi − lo) / 2\` (a bug that sat in Java's own library for nine years).
2. **Infinite loop** from \`lo = mid\` (instead of \`mid + 1\`) when \`hi = lo + 1\`: mid equals lo forever.
3. **Mixing conventions** — \`hi = n − 1\` with \`while (lo < hi)\`, or \`hi = n\` with \`hi = mid − 1\`. Pick *closed* \`[lo, hi]\` or *half-open* \`[lo, hi)\` and keep every line consistent with it.`,
    },
    {
      t: 'md',
      md: `
        ## Beyond "is it there?"

        Sorted arrays answer richer questions with the same halving idea — all covered in depth in the Binary Search chapter:

        - **lower bound**: the first index with \`a[i] ≥ x\` (the insertion point);
        - **upper bound**: the first index with \`a[i] > x\`;
        - **count of x** = upper bound − lower bound, in $O(\\log n)$;
        - **floor / ceiling**: the largest element $\\le x$, the smallest $\\ge x$;
        - **two sorted arrays**: intersection by two pointers in $O(n + m)$, or by binary-searching the smaller in the larger, $O(m \\log n)$ when $m \\ll n$.

        ### Middle ground: jump search

        Jump ahead in blocks of $\\sqrt n$ until you overshoot, then scan back inside one block: at most $\\sqrt n + \\sqrt n$ comparisons. Worse than binary search, but it only ever moves **forward** in big steps — which once mattered for tapes and still matters for some linked or compressed data.

        ### When sorting first pays off

        Sorting costs $O(n \\log n)$. Answering $q$ membership queries then costs $O(q \\log n)$, versus $O(qn)$ by linear search. Sorting wins as soon as $q$ exceeds roughly $\\log n$ — a handful of queries. A hash set gives $O(1)$ average per query but no order (no "next larger", no ranges).
      `,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'Linear search, unsorted', time: 'O(n)' },
        { op: 'Linear search with early exit, sorted', time: 'O(n)', note: 'stops at the first a[i] > x' },
        { op: 'Jump search, sorted', time: 'O(√n)' },
        { op: 'Binary search, sorted', time: 'O(log n)', space: 'O(1)' },
        { op: 'Sort once + q binary searches', time: 'O((n + q) log n)' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'Spot the hint',
      md: `"The array is **sorted**" is the loudest hint an interviewer can give. If your solution never uses it, it is almost certainly not the intended one. Sorted ⇒ think binary search, two pointers from both ends, or merging.`,
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-bs-rounds', 'arr-q-bs-invariant', 'arr-q-bs-trace', 'arr-q-bs-overflow', 'arr-q-bs-infinite', 'arr-q-sort-then-search', 'arr-q-early-exit'] },
  ],
}

export const amortized: Page = {
  id: 'amortized-analysis',
  title: 'Amortized analysis: three proofs that doubling is O(1)',
  summary: 'The aggregate, accounting and potential methods on the dynamic array; the growth-factor trade-off; and the shrinking policy that avoids thrashing.',
  minutes: 18,
  blocks: [
    {
      t: 'md',
      md: `
        A single \`push_back\` can cost $O(n)$ — when it triggers a resize. Yet we claim push is $O(1)$. That is not "average over random inputs"; it is a **guarantee about every sequence of operations**:

        > An operation has **amortized cost** $c$ if *any* sequence of $m$ operations, starting from empty, costs at most $c \\cdot m$ in total.

        Some operations cost more and some less; the total never exceeds $c$ per operation. Here are three ways to prove it for the doubling array — each is a tool you will reuse for hash tables, union-find, splay trees and monotonic stacks.

        **Cost model.** Writing one element costs 1; copying one element during a resize costs 1. The array starts with capacity 1 and doubles when full.
      `,
    },
    {
      t: 'steps',
      title: 'Method 1 — aggregate: add everything up',
      items: [
        { title: 'Writes', md: 'Each of the $n$ pushes writes one element: $n$ in total.' },
        { title: 'When do resizes happen?', md: 'A resize happens on the push that finds size = capacity. Capacities go $1, 2, 4, \\ldots$, so resizes happen when the size is $1, 2, 4, \\ldots, 2^k$ where $2^k$ is the largest power of two below $n$, i.e. $2^k < n$.' },
        { title: 'Cost of the copies', md: 'The resize at size $2^j$ copies $2^j$ elements. Total copies: $$\\sum_{j=0}^{k} 2^j = 2^{k+1} - 1 < 2 \\cdot 2^k < 2n.$$' },
        { title: 'Total', md: 'Writes + copies $< n + 2n = 3n$. Spread over $n$ pushes: **fewer than 3 units per push — O(1) amortized.**' },
      ],
    },
    {
      t: 'md',
      md: `
        ## Method 2 — accounting: prepay with coins

        Charge each push **3 coins** (its *amortized* cost). The push spends 1 coin on its own write and **stores 2 coins on the element it just wrote**. A resize must pay 1 coin per copied element out of stored coins. If the bank can never go negative, the real total is at most the $3n$ we charged.

        **Why the bank never runs dry.** Just after a resize to capacity $2c$, the array holds $c$ elements. Before the next resize, $c$ more pushes arrive (the elements at positions $c \\ldots 2c - 1$), each storing 2 coins: $2c$ coins. The next resize copies $2c$ elements — exactly paid: each newer element pays for its own copy and for the copy of one older element (position $j - c$). Watch the coins being spent:
      `,
    },
    { t: 'viz', algo: 'arr-amortized-bank', caption: 'Purple cells pay a coin for each copy. The coin row never shows a negative number, and the work meter never crosses the 3·pushes mark.' },
    {
      t: 'md',
      md: `
        ## Method 3 — potential: a stored-energy function

        Instead of coins on elements, keep one number describing the whole structure — its **potential** $\\Phi$, like energy stored in a spring. Define the amortized cost of an operation as

        $$\\hat c = c_{\\text{actual}} + \\Phi_{\\text{after}} - \\Phi_{\\text{before}}$$

        Summing over a sequence, the $\\Phi$ terms telescope: $\\sum \\hat c = \\sum c_{\\text{actual}} + \\Phi_{\\text{end}} - \\Phi_{\\text{start}}$. So if $\\Phi_{\\text{end}} \\ge \\Phi_{\\text{start}}$, the real total is at most the amortized total.

        For the doubling array choose

        $$\\Phi = 2 \\cdot \\text{size} - \\text{cap}.$$

        After the first push the array is always at least half full (size $\\ge$ cap/2), so $\\Phi \\ge 0$; it starts near 0. Now the two cases:

        - **Push without resize**: actual cost 1; size grows by 1, so $\\Delta\\Phi = 2$. $\\hat c = 1 + 2 = 3$.
        - **Push that resizes** at size = cap = $c$: actual cost $c$ copies $+ 1$ write $= c + 1$. Before: $\\Phi = 2c - c = c$. After: size $c + 1$, cap $2c$, $\\Phi = 2(c + 1) - 2c = 2$. So $\\hat c = (c + 1) + 2 - c = 3$.

        **Every push has amortized cost exactly 3.** The potential rises slowly with cheap pushes and is released all at once to pay for the expensive one.
      `,
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Amortized ≠ average-case',
      md: `**Average-case** analysis averages over random inputs and can be unlucky. **Amortized** analysis is a worst-case bound on the *total* of any sequence — no probability involved. What it does not promise is a bound on a *single* operation: one push can still take $O(n)$. Systems with hard latency limits (games, trading, audio) pre-reserve capacity or use *incremental* resizing that moves a few elements per operation.`,
    },
    {
      t: 'md',
      md: `
        ## Why multiply — and by how much?

        **Growing by a constant $k$** (cap $\\to$ cap + $k$): resizes happen at sizes $k, 2k, 3k, \\ldots$, copying
        $$k + 2k + \\cdots + \\left\\lfloor \\tfrac{n}{k} \\right\\rfloor k \\approx \\frac{n^2}{2k}$$
        elements — $\\Theta(n^2)$ total, $\\Theta(n)$ amortized per push. A bigger $k$ only shrinks the constant.

        **Growing by a factor $\\alpha > 1$**: the resizes copy about $n, n/\\alpha, n/\\alpha^2, \\ldots$ elements, a geometric series:
        $$n \\left(1 + \\frac1\\alpha + \\frac1{\\alpha^2} + \\cdots\\right) = n \\cdot \\frac{\\alpha}{\\alpha - 1}.$$

        | factor $\\alpha$ | copies per push (≈ $\\frac{\\alpha}{\\alpha-1}$) | worst unused space right after growth |
        |---|---|---|
        | 2 | 2 | 50% |
        | 1.5 | 3 | 33% |
        | 1.25 | 5 | 20% |
        | 1.125 (CPython, roughly) | 9 | 11% |

        Every $\\alpha > 1$ is $O(1)$ amortized; the choice trades copying time against wasted memory. There is a subtler argument for $\\alpha < \\varphi \\approx 1.618$: after several growths, the blocks freed earlier have total size $1 + \\alpha + \\cdots + \\alpha^{k-2} = \\frac{\\alpha^{k-1} - 1}{\\alpha - 1}$, and the allocator can reuse them for the next block of size $\\alpha^k$ only if that sum can reach it — possible for large $k$ exactly when $\\alpha^2 \\le \\alpha + 1$, i.e. $\\alpha \\le \\varphi$. That is one reason libraries pick **1.5**.
      `,
    },
    {
      t: 'md',
      md: `
        ## Shrinking without thrashing

        If many elements are popped, we would like to give memory back. The tempting policy — **halve the capacity when the array is half full** — has a fatal flaw. At size $= $ cap $= c$, one push doubles to $2c$ (copying $c$); one pop drops to size $c$ = half of $2c$, so it halves (copying $c$); the next push is full again… Every operation costs $\\Theta(n)$.
      `,
    },
    { t: 'viz', algo: 'arr-shrink-policy', caption: 'With policy "half", the push/pop see-saw resizes every single time — watch the copy meter run away from the ops line. Switch the policy to "quarter".' },
    {
      t: 'md',
      md: `
        **The fix: halve only when the array is a quarter full.** Proof that this is $O(1)$ amortized:

        1. Right after any resize — growing (from full, $c \\to 2c$ with $c$ elements) or shrinking (from $c/4$ elements, $c \\to c/2$) — the array is **exactly half full**.
        2. To trigger the next resize you need either size to climb from half to full ($\\ge$ cap/2 pushes) or fall from half to a quarter ($\\ge$ cap/4 pops). Either way **at least cap/4 operations** happen first.
        3. That resize copies at most cap elements (the current capacity). Spread over the $\\ge$ cap/4 cheap operations before it, that is at most 4 extra units each.

        So every operation costs $O(1)$ amortized, and the array never uses more than $4\\times$ the memory it needs. (CLRS proves the same result with a two-piece potential function.)
      `,
    },
    {
      t: 'code',
      title: 'A complete dynamic array with growth and safe shrinking',
      code: {
        cpp: `class IntVec {
    int *buf; int sz = 0, cap = 1;
    void resize(int nc) {
        int *nb = new int[nc];
        for (int i = 0; i < sz; i++) nb[i] = buf[i];
        delete[] buf; buf = nb; cap = nc;
    }
public:
    IntVec() : buf(new int[1]) {}
    ~IntVec() { delete[] buf; }
    void push(int x) { if (sz == cap) resize(2 * cap); buf[sz++] = x; }
    int pop() {
        int x = buf[--sz];
        if (cap > 1 && sz <= cap / 4) resize(cap / 2);   // quarter rule
        return x;
    }
    int& operator[](int i) { return buf[i]; }
    int size() const { return sz; }
};`,
        java: `class IntVec {
    private int[] buf = new int[1];
    private int sz = 0;
    private void resize(int nc) { buf = java.util.Arrays.copyOf(buf, nc); }
    void push(int x) { if (sz == buf.length) resize(2 * buf.length); buf[sz++] = x; }
    int pop() {
        int x = buf[--sz];
        if (buf.length > 1 && sz <= buf.length / 4) resize(buf.length / 2);
        return x;
    }
    int get(int i) { return buf[i]; }
    int size() { return sz; }
}`,
        python: `class IntVec:
    """A teaching dynamic array; Python's list already does this in C."""
    def __init__(self):
        self.buf, self.sz = [None], 0
    def _resize(self, nc):
        nb = [None] * nc
        nb[:self.sz] = self.buf[:self.sz]
        self.buf = nb
    def push(self, x):
        if self.sz == len(self.buf):
            self._resize(2 * len(self.buf))
        self.buf[self.sz] = x
        self.sz += 1
    def pop(self):
        self.sz -= 1
        x = self.buf[self.sz]
        if len(self.buf) > 1 and self.sz <= len(self.buf) // 4:
            self._resize(len(self.buf) // 2)
        return x`,
        js: `class IntVec {
  constructor() { this.buf = new Int32Array(1); this.sz = 0; }
  resize(nc) { const nb = new Int32Array(nc); nb.set(this.buf.subarray(0, this.sz)); this.buf = nb; }
  push(x) { if (this.sz === this.buf.length) this.resize(2 * this.buf.length); this.buf[this.sz++] = x; }
  pop() {
    const x = this.buf[--this.sz];
    if (this.buf.length > 1 && this.sz <= this.buf.length / 4) this.resize(this.buf.length >> 1);
    return x;
  }
  get(i) { return this.buf[i]; }
}`,
        c: `#include <stdlib.h>
typedef struct { int *buf; int sz, cap; } IntVec;
void iv_init(IntVec *v) { v->buf = malloc(sizeof(int)); v->sz = 0; v->cap = 1; }
static void iv_resize(IntVec *v, int nc) {
    v->buf = realloc(v->buf, nc * sizeof(int));   /* copies only if it cannot extend in place */
    v->cap = nc;
}
void iv_push(IntVec *v, int x) { if (v->sz == v->cap) iv_resize(v, 2 * v->cap); v->buf[v->sz++] = x; }
int iv_pop(IntVec *v) {
    int x = v->buf[--v->sz];
    if (v->cap > 1 && v->sz <= v->cap / 4) iv_resize(v, v->cap / 2);
    return x;
}
void iv_free(IntVec *v) { free(v->buf); }`,
      },
    },
    {
      t: 'complexity',
      rows: [
        { op: 'push (doubling)', time: 'O(1) amortized', note: 'O(n) worst case for one push' },
        { op: 'pop with quarter-full shrinking', time: 'O(1) amortized' },
        { op: 'pop with half-full shrinking', time: 'O(n) per op in the worst sequence', note: 'thrashing' },
        { op: 'growth by +k', time: 'O(n) amortized', note: 'Θ(n²/k) for n pushes' },
        { op: 'memory', time: '—', space: '≤ 4 × size (quarter rule)', note: '≤ 2 × size when only growing' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'What interviewers want to hear',
      md: `"Why is \`push_back\` O(1)?" — say **amortized**, give the **geometric series** $1 + 2 + 4 + \\cdots < 2n$, and mention that one push can still be $O(n)$. Strong candidates add why the growth is *multiplicative* (additive is $\\Theta(n^2)$), the half/quarter shrinking trap, and that \`reserve\` removes resizes when the size is known.`,
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-am-total', 'arr-q-am-potential', 'arr-q-am-resize-cost', 'arr-q-am-factor', 'arr-q-am-additive', 'arr-q-am-thrash', 'arr-q-am-quarter', 'arr-q-am-vs-avg'] },
  ],
}

export const indexAsHash: Page = {
  id: 'index-as-hash',
  title: 'In-place tricks: cyclic sort and the index as a hash',
  summary: 'When values live in 1…n, the array can be its own hash table: missing numbers by sum and XOR, cyclic sort, sign marking and the first missing positive.',
  minutes: 18,
  blocks: [
    {
      t: 'md',
      md: `
        A family of interview favourites shares one shape: **an array of $n$ numbers whose values lie in a small range like $0 \\ldots n$ or $1 \\ldots n$**, and a request for "what is missing / repeated" in $O(n)$ time and **$O(1)$ extra space**. A hash set would solve every one of them in $O(n)$ space. The trick is to notice that **the range of values matches the range of indices**, so the array itself can serve as the hash table: value $v$ is "stored" at index $v - 1$.

        ## Warm-up: one missing number from 0…n

        $n$ distinct numbers are taken from $0, 1, \\ldots, n$ — exactly one is absent. Find it.

        **By sums.** $0 + 1 + \\cdots + n = \\frac{n(n+1)}{2}$; subtract the actual sum. One pass, $O(1)$ space. Mind overflow in fixed-width languages: with $n = 10^5$ the sum is about $5 \\times 10^9$, past 32-bit range — use 64-bit.

        **By XOR**, which cannot overflow. XOR ($\\oplus$) is commutative and associative, $y \\oplus y = 0$ and $y \\oplus 0 = y$. XOR together every index $0 \\ldots n$ and every value: each present number appears **twice** and cancels; the missing one appears once and survives.
      `,
    },
    { t: 'viz', algo: 'arr-missing-xor', caption: 'The binary column shows bits flipping on and off as pairs cancel. The last frame double-checks with the sum formula.' },
    {
      t: 'code',
      title: 'Missing number: sum and XOR',
      code: {
        cpp: `int missingBySum(const vector<int>& a) {
    long long n = a.size(), s = n * (n + 1) / 2;
    for (int x : a) s -= x;
    return (int)s;
}
int missingByXor(const vector<int>& a) {
    int x = a.size();
    for (int i = 0; i < (int)a.size(); i++) x ^= i ^ a[i];
    return x;
}`,
        java: `static int missingBySum(int[] a) {
    long n = a.length, s = n * (n + 1) / 2;
    for (int x : a) s -= x;
    return (int) s;
}
static int missingByXor(int[] a) {
    int x = a.length;
    for (int i = 0; i < a.length; i++) x ^= i ^ a[i];
    return x;
}`,
        python: `def missing_by_sum(a):
    n = len(a)
    return n * (n + 1) // 2 - sum(a)

def missing_by_xor(a):
    x = len(a)
    for i, v in enumerate(a):
        x ^= i ^ v
    return x`,
        js: `function missingBySum(a) {
  const n = a.length;
  return n * (n + 1) / 2 - a.reduce((s, x) => s + x, 0);   // exact while below 2^53
}
function missingByXor(a) {
  let x = a.length;
  for (let i = 0; i < a.length; i++) x ^= i ^ a[i];
  return x;
}`,
        c: `int missing_by_sum(const int *a, int n) {
    long long s = (long long)n * (n + 1) / 2;
    for (int i = 0; i < n; i++) s -= a[i];
    return (int)s;
}
int missing_by_xor(const int *a, int n) {
    int x = n;
    for (int i = 0; i < n; i++) x ^= i ^ a[i];
    return x;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ### Two unknowns: one value missing, one duplicated

        Values from $1 \\ldots n$, but one value $d$ appears twice and one value $m$ is missing (the "set mismatch" problem). Two equations pin down two unknowns:

        $$S - S_{\\text{expected}} = d - m, \\qquad Q - Q_{\\text{expected}} = d^2 - m^2 = (d - m)(d + m)$$

        where $S$ and $Q$ are the actual sum and sum of squares. Dividing gives $d + m$; together with $d - m$ you get both. (Or use the XOR-and-split-by-a-set-bit trick from the Bits chapter, or sign marking below.)

        ## Cyclic sort

        If the values are a permutation of $1 \\ldots n$ we can sort in $O(n)$ **without comparisons**: value $v$ belongs at index $v - 1$, so keep swapping \`a[i]\` into its home until index $i$ holds the right value (or a duplicate of it), then move on.
      `,
    },
    { t: 'viz', algo: 'arr-cyclic-sort', caption: 'i stays put while it swaps. Every swap turns one more cell green — and a green cell never changes again.' },
    {
      t: 'md',
      md: `
        ### Why it is O(n) despite the inner swapping

        Count the loop iterations. Each iteration either **swaps** or **advances $i$**.

        - A swap moves the value $v = a[i]$ into index $v - 1$, which did **not** already hold $v$. After the swap that index holds its correct value and is never touched again (we only swap when \`a[i] ≠ a[j]\`, and a home index already holding its value fails that test). So there are at most $n$ swaps.
        - $i$ advances at most $n$ times.

        Total iterations $\\le 2n$: **$O(n)$ time, $O(1)$ space.**

        **Correct test:** compare \`a[i] != a[a[i] − 1]\` — the *values*. Testing \`a[i] != i + 1\` instead loops forever on a duplicate: \`[2, 2]\` would swap the two 2s with each other endlessly.

        After cyclic sort, every index $k$ with \`a[k] ≠ k + 1\` tells you **$k + 1$ is missing** and **\`a[k]\` is a duplicate**. So one routine answers "all missing numbers", "all duplicates", "the set mismatch" and more.

        ## Sign marking: remember "seen" without moving anything

        If you may modify values but prefer not to reorder them, borrow the **sign bit**: when you meet value $v$, flip \`a[v − 1]\` negative. Meeting $v$ again and finding \`a[v − 1]\` already negative means $v$ is a duplicate. Read values with \`abs()\`, since a later slot may already have been flipped.
      `,
    },
    { t: 'viz', algo: 'arr-dup-marks', caption: 'Red cells are "seen" marks. The values are still there — only their signs carry the extra bit of information.' },
    {
      t: 'code',
      title: 'All duplicates and all missing numbers (values in 1…n)',
      code: {
        cpp: `// duplicates by sign marking
vector<int> duplicates(vector<int> a) {
    vector<int> out;
    for (int x : a) {
        int j = abs(x) - 1;
        if (a[j] < 0) out.push_back(j + 1); else a[j] = -a[j];
    }
    return out;
}
// missing numbers by cyclic sort
vector<int> missingAll(vector<int> a) {
    int n = a.size();
    for (int i = 0; i < n; ) {
        int j = a[i] - 1;
        if (a[i] != a[j]) swap(a[i], a[j]); else i++;
    }
    vector<int> out;
    for (int k = 0; k < n; k++) if (a[k] != k + 1) out.push_back(k + 1);
    return out;
}`,
        java: `static List<Integer> duplicates(int[] a) {
    List<Integer> out = new ArrayList<>();
    for (int i = 0; i < a.length; i++) {
        int j = Math.abs(a[i]) - 1;
        if (a[j] < 0) out.add(j + 1); else a[j] = -a[j];
    }
    return out;
}
static List<Integer> missingAll(int[] a) {
    int n = a.length;
    for (int i = 0; i < n; ) {
        int j = a[i] - 1;
        if (a[i] != a[j]) { int t = a[i]; a[i] = a[j]; a[j] = t; } else i++;
    }
    List<Integer> out = new ArrayList<>();
    for (int k = 0; k < n; k++) if (a[k] != k + 1) out.add(k + 1);
    return out;
}`,
        python: `def duplicates(a):
    a = a[:]                        # work on a copy
    out = []
    for x in a:
        j = abs(x) - 1
        if a[j] < 0:
            out.append(j + 1)
        else:
            a[j] = -a[j]
    return out

def missing_all(a):
    a = a[:]
    i = 0
    while i < len(a):
        j = a[i] - 1
        if a[i] != a[j]:
            a[i], a[j] = a[j], a[i]
        else:
            i += 1
    return [k + 1 for k in range(len(a)) if a[k] != k + 1]`,
        js: `function duplicates(arr) {
  const a = arr.slice(), out = [];
  for (const x of a) {
    const j = Math.abs(x) - 1;
    if (a[j] < 0) out.push(j + 1); else a[j] = -a[j];
  }
  return out;
}
function missingAll(arr) {
  const a = arr.slice();
  for (let i = 0; i < a.length; ) {
    const j = a[i] - 1;
    if (a[i] !== a[j]) [a[i], a[j]] = [a[j], a[i]]; else i++;
  }
  return a.flatMap((v, k) => (v !== k + 1 ? [k + 1] : []));
}`,
        c: `int duplicates(int *a, int n, int *out) {          /* modifies a */
    int k = 0;
    for (int i = 0; i < n; i++) {
        int j = abs(a[i]) - 1;
        if (a[j] < 0) out[k++] = j + 1; else a[j] = -a[j];
    }
    return k;
}
int missing_all(int *a, int n, int *out) {         /* modifies a */
    for (int i = 0; i < n; ) {
        int j = a[i] - 1;
        if (a[i] != a[j]) { int t = a[i]; a[i] = a[j]; a[j] = t; } else i++;
    }
    int k = 0;
    for (int i = 0; i < n; i++) if (a[i] != i + 1) out[k++] = i + 1;
    return k;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## The boss: first missing positive

        > Given an **unsorted** array of integers (any values, negatives and huge ones included), return the smallest positive integer not present — in $O(n)$ time and $O(1)$ extra space.

        Sorting is $O(n \\log n)$; a hash set is $O(n)$ space. The key observation unlocks the in-place solution:

        **Claim.** The answer is in $1 \\ldots n + 1$.
        *Proof.* $n$ numbers can cover at most $n$ of the $n + 1$ values $1, \\ldots, n + 1$, so at least one of them is absent; the smallest absent one is $\\le n + 1$. ∎

        So values $\\le 0$ or $> n$ are **irrelevant** — they cannot change the answer. Run cyclic sort on just the values in $1 \\ldots n$ (leave the others wherever they land). Afterwards scan: the first index $k$ with \`a[k] ≠ k + 1\` gives the answer $k + 1$; if every slot is right, the answer is $n + 1$.

        **Why the scan is right:** if value $v \\in 1 \\ldots n$ is present, cyclic placement put a copy of it at index $v - 1$ (it is only skipped when its home already holds $v$). So \`a[k] = k + 1\` exactly when $k + 1$ is present.
      `,
    },
    { t: 'viz', algo: 'arr-first-missing', caption: 'Grey values are out of range and never move on purpose. After placement, the scan stops at the first slot missing its own value.' },
    {
      t: 'code',
      title: 'First missing positive',
      code: {
        cpp: `int firstMissingPositive(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n; ) {
        int v = a[i];
        if (v >= 1 && v <= n && a[v - 1] != v) swap(a[i], a[v - 1]);
        else i++;
    }
    for (int k = 0; k < n; k++) if (a[k] != k + 1) return k + 1;
    return n + 1;
}`,
        java: `static int firstMissingPositive(int[] a) {
    int n = a.length;
    for (int i = 0; i < n; ) {
        int v = a[i];
        if (v >= 1 && v <= n && a[v - 1] != v) { a[i] = a[v - 1]; a[v - 1] = v; }
        else i++;
    }
    for (int k = 0; k < n; k++) if (a[k] != k + 1) return k + 1;
    return n + 1;
}`,
        python: `def first_missing_positive(a):
    n, i = len(a), 0
    while i < n:
        v = a[i]
        if 1 <= v <= n and a[v - 1] != v:
            a[i], a[v - 1] = a[v - 1], v      # careful: RHS is evaluated first
        else:
            i += 1
    for k in range(n):
        if a[k] != k + 1:
            return k + 1
    return n + 1`,
        js: `function firstMissingPositive(a) {
  const n = a.length;
  for (let i = 0; i < n; ) {
    const v = a[i];
    if (v >= 1 && v <= n && a[v - 1] !== v) { a[i] = a[v - 1]; a[v - 1] = v; }
    else i++;
  }
  for (let k = 0; k < n; k++) if (a[k] !== k + 1) return k + 1;
  return n + 1;
}`,
        c: `int first_missing_positive(int *a, int n) {
    for (int i = 0; i < n; ) {
        int v = a[i];
        if (v >= 1 && v <= n && a[v - 1] != v) { a[i] = a[v - 1]; a[v - 1] = v; }
        else i++;
    }
    for (int k = 0; k < n; k++) if (a[k] != k + 1) return k + 1;
    return n + 1;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'The Python swap trap',
      md: `\`a[i], a[a[i] − 1] = a[a[i] − 1], a[i]\` is **wrong**: Python assigns left to right, so after \`a[i]\` changes, the second target \`a[a[i] − 1]\` points at a *different* index. Save the index first (\`j = a[i] − 1\`) and swap \`a[i], a[j]\`. The same trap exists for any "index computed from a value you are overwriting" in every language.`,
    },
    {
      t: 'md',
      md: `
        ## Read-only? Use the values as pointers

        If the array may **not** be modified, the in-place tricks are off the table. For "$n + 1$ values in $1 \\ldots n$, find the repeated one", read each index $i$ as a node with an edge to \`a[i]\`. Starting from index 0 (which no value points to), the walk must enter a cycle, and the cycle's entrance is the duplicated value — Floyd's tortoise and hare finds it in $O(n)$ time and $O(1)$ space (see the Linked Lists chapter). Binary search on the *value range* with counting is an $O(n \\log n)$ alternative.

        | technique | needs | time | extra space | modifies input |
        |---|---|---|---|---|
        | hash set | nothing | O(n) | O(n) | no |
        | sort, then scan | nothing | O(n log n) | O(1)–O(n) | yes (or copy) |
        | sum / XOR | exactly one missing | O(n) | O(1) | no |
        | cyclic sort | values in 1…n (others ignorable) | O(n) | O(1) | yes (reorders) |
        | sign marking | values in 1…n, positive | O(n) | O(1) | yes (signs) |
        | Floyd on i → a[i] | n+1 values in 1…n | O(n) | O(1) | no |
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'Ask before you mutate',
      md: `These solutions destroy or reorder the input. Say so out loud: "this modifies the array — is that acceptable, or should I restore it / use a copy?" Interviewers often follow up with "now do it without modifying the array", steering you to XOR/sum or Floyd. And always confirm the value range: "values are in 1…n" is the hint that makes the index-as-hash idea possible.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'Missing number (sum or XOR)', time: 'O(n)', space: 'O(1)' },
        { op: 'Cyclic sort', time: 'O(n)', space: 'O(1)', note: '≤ n swaps + ≤ n advances' },
        { op: 'All duplicates by sign marking', time: 'O(n)', space: 'O(1) + output' },
        { op: 'First missing positive', time: 'O(n)', space: 'O(1)' },
        { op: 'Duplicate, read-only (Floyd)', time: 'O(n)', space: 'O(1)' },
      ],
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-ih-xor', 'arr-q-ih-sum-overflow', 'arr-q-ih-cyclic-swaps', 'arr-q-ih-cyclic-trace', 'arr-q-ih-infinite', 'arr-q-ih-fmp-range', 'arr-q-ih-fmp-answer', 'arr-q-ih-mark', 'arr-q-ih-mismatch', 'arr-q-ih-fill-fmp'] },
  ],
}
