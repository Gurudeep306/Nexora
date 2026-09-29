import type { Page } from '../../../types'

export const prefixSums: Page = {
  id: 'prefix-sums',
  title: 'Prefix sums and difference arrays',
  summary: 'Spend O(n) once so that every range-sum question costs O(1) — and the reverse trick for range updates.',
  minutes: 15,
  blocks: [
    {
      t: 'md',
      md: `
        "What is the sum of \`arr[l..r]\`?" Answered directly, each question costs $r - l + 1$ additions — O(n) per query, **O(n·q)** for $q$ queries. With $n = q = 10^5$ that is $10^{10}$ operations: far too slow.

        ## The idea

        Precompute **prefix sums**: $P[i]$ = the sum of the first $i$ elements.

        $$P[0] = 0, \\qquad P[i+1] = P[i] + \\text{arr}[i]$$

        Then the sum of any range is a **difference of two prefixes**:

        $$\\text{arr}[l] + \\cdots + \\text{arr}[r] = P[r+1] - P[l]$$

        $P[r+1]$ covers the first $r+1$ elements; subtracting $P[l]$ removes the first $l$, leaving exactly indices $l \\ldots r$.
      `,
    },
    { t: 'viz', algo: 'arr-prefix', caption: 'Building P takes one pass; the query at the end is a single subtraction. Try other l and r.' },
    {
      t: 'callout',
      kind: 'tip',
      title: 'Why P has n + 1 entries',
      md: `Making $P[0] = 0$ (the empty prefix) means ranges that start at index 0 need no special case: $\\text{sum}(0..r) = P[r+1] - P[0]$. Off-by-one errors in prefix sums almost always come from dropping this extra slot.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'Build P', time: 'O(n)', space: 'O(n)' },
        { op: 'Range sum query', time: 'O(1)' },
        { op: 'q queries, naive', time: 'O(n·q)' },
        { op: 'q queries with prefix sums', time: 'O(n + q)' },
        { op: 'Update one element', time: 'O(n)', note: 'P must be rebuilt — use a Fenwick tree when values change' },
      ],
    },
    {
      t: 'md',
      md: `
        ## Where prefix sums show up

        - **Equilibrium index**: the first $i$ with (sum left of $i$) = (sum right of $i$). Left is $P[i]$, right is $P[n] - P[i+1]$.
        - **Count of subarrays with sum = k**: a subarray $l..r$ has sum $k$ exactly when $P[r+1] - P[l] = k$. Counting earlier prefixes equal to $P[r+1] - k$ in a hash map solves it in O(n) (see the Hashing chapter).
        - **Average of a range**, **number of 1s in a range** (prefix counts), **2D prefix sums** for rectangle sums in images and grids.

        ## The reverse: difference arrays

        Prefix sums make *range queries* cheap. **Difference arrays** make *range updates* cheap. To add $v$ to every element of \`arr[l..r]\`:

        1. \`D[l] += v\`
        2. \`D[r + 1] -= v\`

        After all updates, the prefix sum of $D$ gives how much each position received. Each update is O(1); one final O(n) pass applies them all.
      `,
    },
    {
      t: 'code',
      title: 'Difference array: many range additions, then read the result',
      code: {
        cpp: `vector<long long> D(n + 1, 0);
for (auto [l, r, v] : updates) { D[l] += v; D[r + 1] -= v; }  // O(1) each
long long run = 0;
for (int i = 0; i < n; i++) { run += D[i]; a[i] += run; }     // O(n) once`,
        java: `long[] D = new long[n + 1];
for (int[] u : updates) { D[u[0]] += u[2]; D[u[1] + 1] -= u[2]; }
long run = 0;
for (int i = 0; i < n; i++) { run += D[i]; a[i] += run; }`,
        python: `D = [0] * (n + 1)
for l, r, v in updates:
    D[l] += v
    D[r + 1] -= v
run = 0
for i in range(n):
    run += D[i]
    a[i] += run`,
        js: `const D = new Array(n + 1).fill(0);
for (const [l, r, v] of updates) { D[l] += v; D[r + 1] -= v; }
let run = 0;
for (let i = 0; i < n; i++) { run += D[i]; a[i] += run; }`,
        c: `long long *D = calloc(n + 1, sizeof(long long));
for (int u = 0; u < m; u++) { D[L[u]] += V[u]; D[R[u] + 1] -= V[u]; }
long long run = 0;
for (int i = 0; i < n; i++) { run += D[i]; a[i] += run; }
free(D);`,
      },
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-prefix-formula', 'arr-q-prefix-build', 'arr-q-prefix-query', 'arr-q-prefix-queries-cost', 'arr-q-diff'] },
    { t: 'practice', title: 'Practice', ids: ['arr-c-range-sum', 'arr-c-equilibrium', 'arr-c-range-add'] },
  ],
}

export const twoPointers: Page = {
  id: 'two-pointers',
  title: 'Two pointers',
  summary: 'Two indexes that move with purpose — from both ends of a sorted array, or read/write in the same direction.',
  minutes: 16,
  blocks: [
    {
      t: 'md',
      md: `
        Many array problems look like they need two nested loops — "check every pair" — which is $O(n^2)$. The **two-pointer** technique replaces the inner loop with a second index that only ever moves forward, so the total work becomes **O(n)**. There are two shapes.

        ## Shape 1: opposite ends (on sorted data)

        **Problem**: in a **sorted** array, is there a pair with sum $T$?

        Start with \`lo\` at the smallest value and \`hi\` at the largest. Look at \`s = a[lo] + a[hi]\`:

        - \`s == T\` — found it.
        - \`s < T\` — we need a bigger sum. \`a[lo]\` is already paired with the **largest** remaining value and it is still too small, so **no** pair using \`a[lo]\` can work. Discard it: \`lo++\`.
        - \`s > T\` — by the mirror argument \`a[hi]\` cannot be in any answer: \`hi--\`.

        Every step throws away one element **with proof** that it cannot be part of a solution. At most $n - 1$ steps.
      `,
    },
    { t: 'viz', algo: 'arr-two-sum-sorted', caption: 'Each dimmed element has been proven useless. Try a target that no pair reaches.' },
    {
      t: 'md',
      md: `
        ## Shape 2: same direction — a reader and a writer

        A **read** pointer \`r\` scans every element; a **write** pointer \`w\` marks where the next *kept* element goes. Everything left of \`w\` is final. This filters an array **in place**, in one pass, without extra memory.

        ### Remove duplicates from a sorted array
      `,
    },
    { t: 'viz', algo: 'arr-dedupe', caption: 'w only advances when a new value appears; r visits everything.' },
    {
      t: 'md',
      md: `
        ### Move zeroes to the end

        Same pattern: every non-zero value is swapped down to \`w\`. Because \`w\` never passes \`r\` and non-zero values are placed in the order they are read, their relative order is preserved — the algorithm is **stable**.
      `,
    },
    { t: 'viz', algo: 'arr-move-zeroes', caption: 'Non-zeros keep their order; zeroes bubble to the right.' },
    {
      t: 'md',
      md: `
        ## Recognising a two-pointer problem

        | clue | shape |
        |---|---|
        | sorted array + pair/triplet with a sum | opposite ends |
        | "in place", "O(1) extra space", remove / partition / compact | reader + writer |
        | palindrome check, reverse | opposite ends |
        | merge two sorted arrays | one pointer per array |
        | longest/shortest contiguous stretch | sliding window (next page) — a two-pointer variant |

        **3-sum** (does any triple sum to 0?) sorts the array, fixes the first element, and runs the pair-sum scan on the rest: $O(n^2)$ instead of $O(n^3)$.
      `,
    },
    {
      t: 'code',
      title: 'Merging two sorted arrays',
      code: {
        cpp: `vector<int> merge(const vector<int>& a, const vector<int>& b) {
    vector<int> out; out.reserve(a.size() + b.size());
    size_t i = 0, j = 0;
    while (i < a.size() && j < b.size())
        out.push_back(a[i] <= b[j] ? a[i++] : b[j++]);
    while (i < a.size()) out.push_back(a[i++]);
    while (j < b.size()) out.push_back(b[j++]);
    return out;
}`,
        java: `static int[] merge(int[] a, int[] b) {
    int[] out = new int[a.length + b.length];
    int i = 0, j = 0, k = 0;
    while (i < a.length && j < b.length) out[k++] = a[i] <= b[j] ? a[i++] : b[j++];
    while (i < a.length) out[k++] = a[i++];
    while (j < b.length) out[k++] = b[j++];
    return out;
}`,
        python: `def merge(a, b):
    out, i, j = [], 0, 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    return out + a[i:] + b[j:]`,
        js: `function merge(a, b) {
  const out = []; let i = 0, j = 0;
  while (i < a.length && j < b.length) out.push(a[i] <= b[j] ? a[i++] : b[j++]);
  return out.concat(a.slice(i), b.slice(j));
}`,
        c: `void merge(const int *a, int n, const int *b, int m, int *out) {
    int i = 0, j = 0, k = 0;
    while (i < n && j < m) out[k++] = a[i] <= b[j] ? a[i++] : b[j++];
    while (i < n) out[k++] = a[i++];
    while (j < m) out[k++] = b[j++];
}`,
      },
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'Say the invariant',
      md: `In an interview, don't just move pointers — state the **invariant**: "everything left of \`w\` is final", or "no pair outside \`[lo, hi]\` can sum to T". The invariant is the proof that the O(n) scan is correct, and naming it is what separates a guess from a solution.`,
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-2p-why', 'arr-q-2p-trace', 'arr-q-dedupe-result', 'arr-q-2p-order', 'arr-q-2p-sorted-needed'] },
    { t: 'practice', title: 'Practice', ids: ['arr-c-pair-sum', 'arr-c-dedupe', 'arr-c-move-zeroes'] },
  ],
}

export const slidingWindow: Page = {
  id: 'sliding-window',
  title: 'Sliding window',
  summary: 'Maintain a contiguous window and update its summary in O(1) as it moves — fixed and variable sizes.',
  minutes: 15,
  blocks: [
    {
      t: 'md',
      md: `
        A **window** is a contiguous stretch \`arr[lo..hi]\`. When it moves one step right, only **one element enters and one leaves** — so there is no need to recompute its sum (or count, or max) from scratch. Update the summary with what changed.

        ## Fixed size k

        **Problem**: the maximum sum of any $k$ consecutive elements.

        Naively, each of the $n - k + 1$ windows costs $k$ additions: $O(n \\cdot k)$. Sliding: compute the first window once, then for each step \`s = s + arr[i] − arr[i − k]\` — two operations per step, **O(n)** total.
      `,
    },
    { t: 'viz', algo: 'arr-window-fixed', caption: 'One element enters (green), one leaves (red), and the sum is patched rather than recomputed.' },
    {
      t: 'md',
      md: `
        ## Variable size

        **Problem**: the length of the shortest subarray with sum $\\ge S$ (all numbers positive).

        Grow the window by moving \`hi\` right. As soon as the sum reaches $S$, record the length and **shrink from the left** while it still reaches $S$ — each shrink might find a shorter answer.

        Why is this O(n) despite the inner \`while\`? Each index is **added once** (when \`hi\` passes it) and **removed at most once** (when \`lo\` passes it). Pointers never move backwards, so the total work is at most $2n$ steps.
      `,
    },
    { t: 'viz', algo: 'arr-window-var', caption: 'The window stretches right until it is big enough, then squeezes from the left.' },
    {
      t: 'callout',
      kind: 'warn',
      title: 'When the window trick is valid',
      md: `Shrinking from the left is only safe if **removing elements can never help the condition** — here, because all values are positive, dropping one always lowers the sum. With **negative numbers** the condition is no longer monotonic and the window can miss answers: use prefix sums with a sorted structure or a monotonic deque instead.`,
    },
    {
      t: 'md',
      md: `
        ## The general template

        \`\`\`pseudo
        lo ← 0
        for hi ← 0 to n − 1
          add arr[hi] to the window state
          while the window breaks (or satisfies) the condition
            update the answer if needed
            remove arr[lo] from the state; lo ← lo + 1
          update the answer if needed
        \`\`\`

        The same skeleton solves "longest substring without repeating characters" (the state is a set of characters), "at most K distinct values" (a count map), "max consecutive ones with at most K flips" (count of zeroes), and many more.
      `,
    },
    {
      t: 'code',
      title: 'Longest subarray with at most K zeroes (flip up to K zeroes to ones)',
      code: {
        cpp: `int longestOnes(const vector<int>& a, int K) {
    int lo = 0, zeros = 0, best = 0;
    for (int hi = 0; hi < (int)a.size(); hi++) {
        if (a[hi] == 0) zeros++;
        while (zeros > K) if (a[lo++] == 0) zeros--;
        best = max(best, hi - lo + 1);
    }
    return best;
}`,
        java: `static int longestOnes(int[] a, int K) {
    int lo = 0, zeros = 0, best = 0;
    for (int hi = 0; hi < a.length; hi++) {
        if (a[hi] == 0) zeros++;
        while (zeros > K) if (a[lo++] == 0) zeros--;
        best = Math.max(best, hi - lo + 1);
    }
    return best;
}`,
        python: `def longest_ones(a, K):
    lo = zeros = best = 0
    for hi, x in enumerate(a):
        zeros += x == 0
        while zeros > K:
            zeros -= a[lo] == 0
            lo += 1
        best = max(best, hi - lo + 1)
    return best`,
        js: `function longestOnes(a, K) {
  let lo = 0, zeros = 0, best = 0;
  for (let hi = 0; hi < a.length; hi++) {
    if (a[hi] === 0) zeros++;
    while (zeros > K) if (a[lo++] === 0) zeros--;
    best = Math.max(best, hi - lo + 1);
  }
  return best;
}`,
        c: `int longest_ones(const int *a, int n, int K) {
    int lo = 0, zeros = 0, best = 0;
    for (int hi = 0; hi < n; hi++) {
        if (a[hi] == 0) zeros++;
        while (zeros > K) if (a[lo++] == 0) zeros--;
        if (hi - lo + 1 > best) best = hi - lo + 1;
    }
    return best;
}`,
      },
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-window-update', 'arr-q-window-trace', 'arr-q-window-on', 'arr-q-window-negative', 'arr-q-window-count'] },
    { t: 'practice', title: 'Practice', ids: ['arr-c-window-max', 'arr-c-min-len', 'arr-c-longest-ones'] },
  ],
}

export const kadane: Page = {
  id: 'kadane',
  title: "Maximum subarray — Kadane's algorithm",
  summary: 'The best contiguous sum in one pass, by asking one question at every index.',
  minutes: 13,
  blocks: [
    {
      t: 'md',
      md: `
        **Problem**: find the contiguous subarray with the largest sum. \`[-2, 1, -3, 4, -1, 2, 1, -5, 4]\` → \`[4, -1, 2, 1]\` with sum **6**.

        Checking every subarray is $O(n^2)$ even with prefix sums. Kadane's algorithm does it in **O(n)** by asking, at each index $i$:

        > What is the best sum of a subarray that **ends exactly at** $i$?

        Call it \`cur\`. There are only two options: **extend** the best subarray ending at $i-1$ by \`arr[i]\`, or **start fresh** at \`arr[i]\`:

        $$\\text{cur}_i = \\max(\\text{arr}[i],\\ \\text{cur}_{i-1} + \\text{arr}[i])$$

        Start fresh exactly when \`cur\` so far is negative — a negative prefix only ever makes things worse. The answer is the largest \`cur\` seen anywhere.
      `,
    },
    { t: 'viz', algo: 'arr-kadane', caption: 'The cyan band is the run ending here (cur); the gold band is the best so far. Watch it restart after a big negative.' },
    {
      t: 'md',
      md: `
        ## Why it is correct

        Every subarray ends *somewhere*. If for every end position $i$ we know the best subarray ending there, the overall best is the maximum over all $i$. And the best subarray ending at $i$ is either \`[arr[i]]\` alone or (best ending at $i-1$) + \`arr[i]\` — any other subarray ending at $i$ extends a *worse* one ending at $i-1$. That is a tiny **dynamic programming** argument; Kadane's algorithm is DP with the table squeezed into one variable.

        ## Details that matter

        - **All negative** \`[-3, -1, -2]\`: the answer is \`-1\` (a subarray must be non-empty). Initialising \`best = 0\` would wrongly report 0 — start from \`arr[0]\`.
        - **Returning the indices**: remember where the current run started; when \`best\` improves, save (start, i).
        - **Empty allowed?** Some variants allow the empty subarray (answer ≥ 0). Then start \`cur = best = 0\` and use \`cur = max(0, cur + x)\`.
        - **Maximum product subarray** needs both the max *and* min product ending at $i$, since two negatives make a positive.
      `,
    },
    {
      t: 'code',
      title: 'Kadane with the subarray bounds',
      code: {
        cpp: `tuple<long long,int,int> maxSubarray(const vector<int>& a) {
    long long cur = a[0], best = a[0]; int s = 0, bs = 0, be = 0;
    for (int i = 1; i < (int)a.size(); i++) {
        if (cur < 0) { cur = a[i]; s = i; } else cur += a[i];
        if (cur > best) { best = cur; bs = s; be = i; }
    }
    return {best, bs, be};
}`,
        java: `static long[] maxSubarray(int[] a) {
    long cur = a[0], best = a[0]; int s = 0, bs = 0, be = 0;
    for (int i = 1; i < a.length; i++) {
        if (cur < 0) { cur = a[i]; s = i; } else cur += a[i];
        if (cur > best) { best = cur; bs = s; be = i; }
    }
    return new long[]{best, bs, be};
}`,
        python: `def max_subarray(a):
    cur = best = a[0]; s = bs = be = 0
    for i in range(1, len(a)):
        if cur < 0:
            cur, s = a[i], i
        else:
            cur += a[i]
        if cur > best:
            best, bs, be = cur, s, i
    return best, bs, be`,
        js: `function maxSubarray(a) {
  let cur = a[0], best = a[0], s = 0, bs = 0, be = 0;
  for (let i = 1; i < a.length; i++) {
    if (cur < 0) { cur = a[i]; s = i; } else cur += a[i];
    if (cur > best) { best = cur; bs = s; be = i; }
  }
  return [best, bs, be];
}`,
        c: `long long max_subarray(const int *a, int n, int *bs, int *be) {
    long long cur = a[0], best = a[0]; int s = 0; *bs = *be = 0;
    for (int i = 1; i < n; i++) {
        if (cur < 0) { cur = a[i]; s = i; } else cur += a[i];
        if (cur > best) { best = cur; *bs = s; *be = i; }
    }
    return best;
}`,
      },
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-kadane-meaning', 'arr-q-kadane-trace', 'arr-q-kadane-neg', 'arr-q-kadane-restart'] },
    { t: 'practice', title: 'Practice', ids: ['arr-c-kadane'] },
  ],
}

export const twoD: Page = {
  id: '2d-arrays',
  title: '2D arrays and matrices',
  summary: 'Grids stored as one line of memory, the r·C + c formula, and traversal orders.',
  minutes: 12,
  blocks: [
    {
      t: 'md',
      md: `
        A 2D array with $R$ rows and $C$ columns is still stored in **one-dimensional** memory. Almost every language (C, C++, Python's NumPy, JavaScript typed arrays) uses **row-major** order: row 0, then row 1, and so on. Element $(r, c)$ lives at

        $$\\text{offset}(r, c) = r \\times C + c$$

        (Fortran, MATLAB and Julia use **column-major**: $c \\times R + r$.)
      `,
    },
    { t: 'viz', algo: 'arr-row-major', caption: 'Each cell of the grid is written to the next memory slot, row after row.' },
    {
      t: 'md',
      md: `
        ## Why the loop order matters

        Reading \`M[r][c]\` with \`c\` in the **inner** loop walks memory one slot at a time — every cache line fetched is fully used. Swapping the loops (\`r\` inner) jumps $C$ slots on every step; for large matrices this can be **several times slower**, though the answer is identical.

        ## Jagged arrays

        Java's \`int[][]\`, Python's list of lists and JS arrays of arrays are **arrays of rows**, each row a separate array. Rows may have different lengths ("jagged") and are not necessarily next to each other in memory.

        ## Common traversals

        - **Row by row** / **column by column**
        - **Transpose**: \`T[c][r] = M[r][c]\`; for a square matrix, swap across the diagonal in place (\`c > r\` only).
        - **Diagonals**: cells with equal \`r − c\` share a diagonal; equal \`r + c\` share an anti-diagonal.
        - **Spiral order** — peel the outer ring, then recurse inward (keep four boundaries: top, bottom, left, right).
        - **Neighbours** in a grid: \`dr = [-1, 1, 0, 0]\`, \`dc = [0, 0, -1, 1]\` — the start of every grid BFS/DFS.
      `,
    },
    {
      t: 'code',
      title: 'Declaring a matrix and transposing it',
      code: {
        cpp: `vector<vector<int>> M(R, vector<int>(C, 0));     // R x C of zeros
vector<vector<int>> T(C, vector<int>(R));
for (int r = 0; r < R; r++)
    for (int c = 0; c < C; c++)
        T[c][r] = M[r][c];
// in place, square N x N:
for (int r = 0; r < N; r++)
    for (int c = r + 1; c < N; c++) swap(M[r][c], M[c][r]);`,
        java: `int[][] M = new int[R][C];
int[][] T = new int[C][R];
for (int r = 0; r < R; r++)
    for (int c = 0; c < C; c++)
        T[c][r] = M[r][c];`,
        python: `M = [[0] * C for _ in range(R)]   # NOT [[0] * C] * R — that repeats one row!
T = [[M[r][c] for r in range(R)] for c in range(C)]
T = [list(row) for row in zip(*M)]   # the idiomatic transpose`,
        js: `const M = Array.from({ length: R }, () => new Array(C).fill(0));
const T = Array.from({ length: C }, (_, c) => M.map(row => row[c]));`,
        c: `int M[R][C] = {0}, T[C][R];
for (int r = 0; r < R; r++)
    for (int c = 0; c < C; c++)
        T[c][r] = M[r][c];`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Python’s shared-row trap',
      md: `\`[[0] * C] * R\` builds **one** row and puts **R references to it** in the outer list — writing \`M[0][0] = 1\` changes the first element of every row. Always build rows in a comprehension: \`[[0] * C for _ in range(R)]\`.`,
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-rowmajor', 'arr-q-rowmajor-col', 'arr-q-python-rows', 'arr-q-transpose-shape'] },
    { t: 'practice', title: 'Practice', ids: ['arr-c-transpose', 'arr-c-spiral'] },
  ],
}

export const cheatsheet: Page = {
  id: 'cheatsheet',
  title: 'Summary, patterns and the problem set',
  summary: 'Everything from this chapter on one page, plus how to recognise which technique a problem wants.',
  minutes: 8,
  blocks: [
    {
      t: 'md',
      md: `
        ## Operation costs

        | operation | static array | dynamic array |
        |---|---|---|
        | read / write \`a[i]\` | O(1) | O(1) |
        | append at the end | — | O(1) amortized |
        | insert / delete at position k | O(n − k) | O(n − k) |
        | search (unsorted) | O(n) | O(n) |
        | search (sorted, binary search) | O(log n) | O(log n) |

        ## Which technique?

        | the problem says… | reach for |
        |---|---|
        | many range-sum questions on a fixed array | **prefix sums** |
        | many "add v to a[l..r]" updates, read at the end | **difference array** |
        | sorted array, find a pair / triplet | **two pointers from both ends** |
        | modify in place, O(1) extra space, keep/remove elements | **read + write pointers** |
        | best contiguous stretch of length k | **fixed sliding window** |
        | shortest / longest stretch satisfying a monotone condition | **variable sliding window** |
        | best contiguous sum (may be negative) | **Kadane** |
        | rotate / reverse without extra memory | **reversal tricks** |

        ## Habits that prevent bugs

        1. Use half-open ranges: \`for (i = 0; i < n; i++)\`.
        2. Initialise max/min from the first element, sums from 0, products from 1.
        3. Accumulate large sums in 64-bit integers.
        4. Reduce rotations by \`k mod n\`; guard empty arrays.
        5. Before submitting, trace the smallest cases by hand: $n = 0$, $n = 1$, all equal, all negative, already sorted.
      `,
    },
    {
      t: 'practice',
      title: 'The full Arrays problem set',
      ids: [
        'arr-c-sum',
        'arr-c-max-min',
        'arr-c-second',
        'arr-c-insert',
        'arr-c-delete',
        'arr-c-linear-search',
        'arr-c-count',
        'arr-c-reverse',
        'arr-c-rotate',
        'arr-c-range-sum',
        'arr-c-equilibrium',
        'arr-c-range-add',
        'arr-c-pair-sum',
        'arr-c-dedupe',
        'arr-c-move-zeroes',
        'arr-c-window-max',
        'arr-c-min-len',
        'arr-c-longest-ones',
        'arr-c-kadane',
        'arr-c-transpose',
        'arr-c-spiral',
      ],
    },
  ],
}
