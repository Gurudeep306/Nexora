import type { Page } from '../../../types'

export const recurrenceMethods: Page = {
  id: 'recurrence-methods',
  title: 'Solving recurrences: substitution, recursion trees and the Master theorem',
  summary: 'Three tools that turn T(n) = a·T(n/b) + f(n) into a closed form — and how to tell which one to reach for.',
  minutes: 22,
  blocks: [
    {
      t: 'md',
      md: `
        A recursive algorithm's cost is naturally written as a **recurrence**: the cost on input size $n$ in terms of the cost on smaller inputs, plus the work done at this level. Merge sort splits into two halves and merges in linear time, so

        $$T(n) = 2T(n/2) + n, \\qquad T(1) = 1.$$

        A recurrence is not an answer yet — "how fast is merge sort?" wants $\\Theta(n\\log n)$, not a formula that refers to itself. This page gives three ways to solve one:

        1. **The recursion tree** — draw the calls, add up the work level by level. Best for *finding* the answer.
        2. **The substitution method** — guess the answer, prove it by induction. Best for *proving* it rigorously, and for recurrences no formula covers.
        3. **The Master theorem** — a ready-made verdict for the shape $aT(n/b) + f(n)$. Fastest when it applies.

        ## The recursion tree method

        Each node is one call; its label is the work done **in that call, excluding the recursive calls**. For $T(n) = aT(n/b) + n^k$:

        - level 0 has 1 node of size $n$: cost $n^k$;
        - level $i$ has $a^i$ nodes of size $n/b^i$: cost $a^i (n/b^i)^k = n^k \\left(\\frac{a}{b^k}\\right)^i$;
        - the tree has $\\log_b n$ levels, and $a^{\\log_b n} = n^{\\log_b a}$ leaves.

        So the total is a **geometric series** with ratio $r = a / b^k$:

        $$T(n) = n^k \\sum_{i=0}^{\\log_b n} r^i.$$

        Everything depends on $r$:

        | ratio $r = a/b^k$ | which levels dominate | total |
        |---|---|---|
        | $r < 1$ | the **root** — each level is a constant factor cheaper | $\\Theta(n^k)$ |
        | $r = 1$ | **every level costs the same** $n^k$ | $\\Theta(n^k \\log n)$ |
        | $r > 1$ | the **leaves** — each level is more expensive | $\\Theta(n^{\\log_b a})$ |

        A geometric series is within a constant factor of its largest term, which is why only the root or the leaves matter unless the levels are equal.
      `,
    },
    {
      t: 'viz',
      algo: 'cx-rec-tree',
      caption: 'Try a = 2, b = 2, k = 1 (merge sort: every level costs n), then a = 4, k = 1 (leaves dominate: n²) and a = 1, k = 1 (root dominates: n). Watch the level sums.',
    },
    {
      t: 'md',
      md: `
        ## Unequal splits

        The tree method also handles recurrences no formula covers. For $T(n) = T(n/3) + T(2n/3) + n$ every **full** level still costs exactly $n$ (the pieces at each level add up to $n$). The shortest root-to-leaf path follows the $1/3$ branch and has length $\\log_3 n$; the longest follows the $2/3$ branch and has length $\\log_{3/2} n$. So

        $$n\\log_3 n \\;\\le\\; T(n) \\;\\le\\; n\\log_{3/2} n \\quad\\Longrightarrow\\quad T(n) = \\Theta(n\\log n).$$

        This is exactly why quicksort with a split that is merely *proportional* (even 1 : 99) stays $\\Theta(n\\log n)$ — only the base of the logarithm changes.
      `,
    },
    {
      t: 'viz',
      algo: 'cx-unequal-tree',
      caption: 'The tree is lopsided, but each complete level still sums to n. Change the split to 1/5 and see the depth grow while the per-level cost stays n.',
    },
    {
      t: 'md',
      md: `
        ## The substitution method

        Guess a bound, then prove it by **strong induction**, keeping the constant explicit.

        **Claim.** $T(n) = 2T(\\lfloor n/2 \\rfloor) + n$ with $T(1) = 1$ satisfies $T(n) \\le c\\, n\\log_2 n$ for all $n \\ge 2$, with $c = 2$.

        **Inductive step.** Assume the bound for all sizes below $n$. Then
        $$T(n) \\le 2\\,c\\frac{n}{2}\\log_2\\frac{n}{2} + n = c\\,n(\\log_2 n - 1) + n = c\\,n\\log_2 n - (c - 1)n \\le c\\,n\\log_2 n,$$
        because $c \\ge 1$.

        **Base cases.** $T(2) = 4 \\le 2\\cdot2\\cdot1$ and $T(3) = 2T(1) + 3 = 5 \\le 2\\cdot3\\log_2 3 \\approx 9.5$. Every larger $n$ reduces to sizes $\\ge 2$, so the induction is anchored.

        Two classic traps:

        - **Proving the wrong statement.** Showing $T(n) \\le c\\,n + n$ does *not* prove $T(n) = O(n)$ — the constant grew. The inductive conclusion must be the *exact* hypothesis with the *same* $c$.
        - **A guess that is right but too weak to induct.** For $T(n) = 2T(n/2) + 1$ the guess $T(n) \\le cn$ gives $T(n) \\le cn + 1$, which fails. Strengthen it to $T(n) \\le cn - 1$: then $T(n) \\le 2(c\\tfrac n2 - 1) + 1 = cn - 1$. ✓ Subtracting a lower-order term is the standard fix.
      `,
    },
    {
      t: 'viz',
      algo: 'cx-guess-check',
      caption: 'Each row checks T(n) ≤ c·g(n). Try the guess "n" for 2T(n/2)+n: it fails for every c eventually. Then try "n log n" with c = 2.',
    },
    {
      t: 'md',
      md: `
        ## The Master theorem, precisely

        For $T(n) = aT(n/b) + f(n)$ with $a \\ge 1$, $b > 1$, compare $f(n)$ with the **watershed** $n^{\\log_b a}$ (the leaf count):

        1. If $f(n) = O(n^{\\log_b a - \\varepsilon})$ for some $\\varepsilon > 0$ — $f$ is *polynomially smaller* — then $T(n) = \\Theta(n^{\\log_b a})$.
        2. If $f(n) = \\Theta(n^{\\log_b a}\\log^k n)$ with $k \\ge 0$, then $T(n) = \\Theta(n^{\\log_b a}\\log^{k+1} n)$.
        3. If $f(n) = \\Omega(n^{\\log_b a + \\varepsilon})$ for some $\\varepsilon > 0$ **and** the regularity condition $a f(n/b) \\le c f(n)$ holds for some $c < 1$, then $T(n) = \\Theta(f(n))$.

        It is the recursion-tree table above, made formal: case 1 = leaves dominate, case 2 = levels equal (with an extra log for each log in $f$), case 3 = root dominates.

        | recurrence | $n^{\\log_b a}$ | case | answer |
        |---|---|---|---|
        | $T(n/2) + 1$ (binary search) | $1$ | 2, $k=0$ | $\\Theta(\\log n)$ |
        | $2T(n/2) + n$ (merge sort) | $n$ | 2, $k=0$ | $\\Theta(n\\log n)$ |
        | $3T(n/2) + n$ (Karatsuba) | $n^{1.585}$ | 1 | $\\Theta(n^{\\log_2 3})$ |
        | $8T(n/2) + n^2$ (naive matrix D&C) | $n^3$ | 1 | $\\Theta(n^3)$ |
        | $7T(n/2) + n^2$ (Strassen) | $n^{2.807}$ | 1 | $\\Theta(n^{\\log_2 7})$ |
        | $2T(n/2) + n\\log n$ | $n$ | 2, $k=1$ | $\\Theta(n\\log^2 n)$ |
        | $T(n/2) + n$ | $1$ | 3 | $\\Theta(n)$ |

        **When it does not apply:** $T(n) = T(n-1) + n$ (subtracts instead of dividing — unroll it: $\\Theta(n^2)$); $T(n) = T(n/3) + T(2n/3) + n$ (unequal parts — use the tree); $T(n) = 2T(n/2) + n/\\log n$ ($f$ is smaller than $n$ but not *polynomially* smaller — it falls in the gap; the answer is $\\Theta(n\\log\\log n)$). For unequal splits in general, the **Akra–Bazzi** theorem generalises the Master theorem.
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Changing variables',
      md: 'Some recurrences become Master-friendly after a substitution. $T(n) = 2T(\\sqrt n) + \\log n$: let $m = \\log n$, $S(m) = T(2^m)$. Then $S(m) = 2S(m/2) + m = \\Theta(m\\log m)$, so $T(n) = \\Theta(\\log n \\cdot \\log\\log n)$.',
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'Saying it out loud',
      md: 'Interviewers rarely want the Master theorem by name. They want: "each call does O(n) work and splits into two halves, so there are log n levels of O(n) each — O(n log n)." That sentence is the recursion-tree method. Practise saying it for every divide-and-conquer algorithm you write.',
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-rm-ratio', 'cx-q-rm-master-a', 'cx-q-rm-master-b', 'cx-q-rm-gap', 'cx-q-rm-unequal', 'cx-q-rm-substitution', 'cx-q-rm-subtract', 'cx-q-rm-match'] },
  ],
}

export const recursiveAlgorithms: Page = {
  id: 'recursive-algorithms',
  title: 'Analysing recursive algorithms',
  summary: 'Binary search, Karatsuba and randomized quicksort — writing the recurrence from the code, solving it, and counting the stack.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        Analysing recursive code is a two-step routine:

        1. **Write the recurrence from the code.** Count the recursive calls ($a$), how much smaller each input is ($n/b$ or $n - 1$), and the non-recursive work per call ($f(n)$).
        2. **Solve it** with the tools from the previous page.

        Then, separately, count the **space**: the deepest chain of calls that are active at the same time, times the memory per frame.

        ## Binary search: $T(n) = T(n/2) + O(1)$

        One comparison, then one recursive call on half the range. Master case 2 with $k = 0$: $\\Theta(\\log n)$ time. The recursion depth is also $\\lceil\\log_2(n+1)\\rceil$, so a recursive binary search uses $O(\\log n)$ stack — an iterative one uses $O(1)$.
      `,
    },
    {
      t: 'viz',
      algo: 'cx-binary-search',
      caption: 'The stack on the right holds the calls that are still waiting for an answer. It never holds more than about log₂ n of them.',
    },
    {
      t: 'code',
      title: 'Recursive binary search',
      code: {
        cpp: `// returns an index of x in a[lo..hi], or -1
int search(const vector<int>& a, int lo, int hi, int x) {
    if (lo > hi) return -1;                 // empty range
    int mid = lo + (hi - lo) / 2;           // no overflow
    if (a[mid] == x) return mid;
    if (a[mid] < x) return search(a, mid + 1, hi, x);
    return search(a, lo, mid - 1, x);
}`,
        java: `static int search(int[] a, int lo, int hi, int x) {
    if (lo > hi) return -1;                 // empty range
    int mid = lo + (hi - lo) / 2;           // no overflow
    if (a[mid] == x) return mid;
    if (a[mid] < x) return search(a, mid + 1, hi, x);
    return search(a, lo, mid - 1, x);
}`,
        python: `def search(a, lo, hi, x):
    if lo > hi:                             # empty range
        return -1
    mid = (lo + hi) // 2
    if a[mid] == x:
        return mid
    if a[mid] < x:
        return search(a, mid + 1, hi, x)
    return search(a, lo, mid - 1, x)`,
        js: `function search(a, lo, hi, x) {
  if (lo > hi) return -1;                   // empty range
  const mid = (lo + hi) >> 1;
  if (a[mid] === x) return mid;
  if (a[mid] < x) return search(a, mid + 1, hi, x);
  return search(a, lo, mid - 1, x);
}`,
        c: `/* returns an index of x in a[lo..hi], or -1 */
int search(const int *a, int lo, int hi, int x) {
    if (lo > hi) return -1;                 /* empty range */
    int mid = lo + (hi - lo) / 2;           /* no overflow */
    if (a[mid] == x) return mid;
    if (a[mid] < x) return search(a, mid + 1, hi, x);
    return search(a, lo, mid - 1, x);
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Karatsuba: why 3 calls beat 4

        Multiplying two $n$-digit numbers the school way is $\\Theta(n^2)$. Split each into halves: $x = a\\cdot10^m + b$, $y = c\\cdot10^m + d$. Then

        $$xy = ac\\cdot10^{2m} + (ad + bc)\\cdot10^m + bd.$$

        Computing $ac, ad, bc, bd$ recursively gives $T(n) = 4T(n/2) + O(n)$, which is Master case 1 with $n^{\\log_2 4} = n^2$ — **no gain at all**. Karatsuba's trick: the middle term is

        $$ad + bc = (a + b)(c + d) - ac - bd,$$

        so three products suffice: $T(n) = 3T(n/2) + O(n) = \\Theta(n^{\\log_2 3}) \\approx \\Theta(n^{1.585})$.

        **The lesson generalises:** in divide and conquer, the number of recursive calls $a$ sits in the exponent ($n^{\\log_b a}$), while extra linear work only touches the lower-order term. Saving one call is worth far more than making the combine step faster. Strassen applies the same idea to matrices: 7 products instead of 8 gives $\\Theta(n^{\\log_2 7}) \\approx \\Theta(n^{2.807})$.
      `,
    },
    {
      t: 'viz',
      algo: 'cx-karatsuba',
      caption: 'Each node spawns three products, not four. The leaves are single-digit multiplications; count them against n² for the school method.',
    },
    {
      t: 'code',
      title: 'Karatsuba on machine integers (to show the recursion)',
      note: 'Real implementations work on digit arrays with a cut-off to the school method for small sizes; on 64-bit integers the recursion is only for illustration.',
      code: {
        cpp: `long long digits(long long x) { int d = 1; while (x >= 10) { x /= 10; d++; } return d; }
long long pow10(int m) { long long p = 1; while (m--) p *= 10; return p; }

long long karatsuba(long long x, long long y) {
    if (x < 10 || y < 10) return x * y;              // one-digit base case
    int m = max(digits(x), digits(y)) / 2;
    long long p = pow10(m);
    long long a = x / p, b = x % p, c = y / p, d = y % p;
    long long ac = karatsuba(a, c), bd = karatsuba(b, d);
    long long mid = karatsuba(a + b, c + d) - ac - bd;  // ad + bc with one product
    return ac * p * p + mid * p + bd;
}`,
        java: `static int digits(long x) { int d = 1; while (x >= 10) { x /= 10; d++; } return d; }

static long karatsuba(long x, long y) {
    if (x < 10 || y < 10) return x * y;              // one-digit base case
    int m = Math.max(digits(x), digits(y)) / 2;
    long p = 1;
    for (int i = 0; i < m; i++) p *= 10;
    long a = x / p, b = x % p, c = y / p, d = y % p;
    long ac = karatsuba(a, c), bd = karatsuba(b, d);
    long mid = karatsuba(a + b, c + d) - ac - bd;    // ad + bc with one product
    return ac * p * p + mid * p + bd;
}`,
        python: `def karatsuba(x, y):
    if x < 10 or y < 10:                             # one-digit base case
        return x * y
    m = max(len(str(x)), len(str(y))) // 2
    p = 10 ** m
    a, b = divmod(x, p)
    c, d = divmod(y, p)
    ac, bd = karatsuba(a, c), karatsuba(b, d)
    mid = karatsuba(a + b, c + d) - ac - bd          # ad + bc with one product
    return ac * p * p + mid * p + bd`,
        js: `// BigInt keeps the products exact
function karatsuba(x, y) {
  if (x < 10n || y < 10n) return x * y;              // one-digit base case
  const m = Math.floor(Math.max(x.toString().length, y.toString().length) / 2);
  const p = 10n ** BigInt(m);
  const a = x / p, b = x % p, c = y / p, d = y % p;
  const ac = karatsuba(a, c), bd = karatsuba(b, d);
  const mid = karatsuba(a + b, c + d) - ac - bd;     // ad + bc with one product
  return ac * p * p + mid * p + bd;
}`,
        c: `static int digits(long long x) { int d = 1; while (x >= 10) { x /= 10; d++; } return d; }

long long karatsuba(long long x, long long y) {
    if (x < 10 || y < 10) return x * y;              /* one-digit base case */
    int dx = digits(x), dy = digits(y);
    int m = (dx > dy ? dx : dy) / 2;
    long long p = 1;
    for (int i = 0; i < m; i++) p *= 10;
    long long a = x / p, b = x % p, c = y / p, d = y % p;
    long long ac = karatsuba(a, c), bd = karatsuba(b, d);
    long long mid = karatsuba(a + b, c + d) - ac - bd;   /* ad + bc with one product */
    return ac * p * p + mid * p + bd;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Randomized quicksort, counted pair by pair

        Quicksort's running time is driven by the number of comparisons $X$. Name the values in sorted order $z_1 < z_2 < \\dots < z_n$ and let $X_{ij}$ be 1 if $z_i$ and $z_j$ are ever compared. Then $X = \\sum_{i<j} X_{ij}$ and, by **linearity of expectation**,

        $$E[X] = \\sum_{i<j} \\Pr[z_i \\text{ and } z_j \\text{ are compared}].$$

        Two values are compared only when one of them is the pivot while both are still in the same subarray. Look at the block $z_i, z_{i+1}, \\dots, z_j$: it stays together until the first pivot is chosen **from inside it**. If that pivot is $z_i$ or $z_j$, they are compared; if it is anything strictly between, they are split apart forever. With random pivots each of the $j - i + 1$ values is equally likely to be first, so

        $$\\Pr = \\frac{2}{j - i + 1}, \\qquad E[X] = \\sum_{i<j}\\frac{2}{j-i+1} \\le 2n\\sum_{k=2}^{n}\\frac1k \\le 2n\\ln n = O(n\\log n).$$

        No assumption about the input was made — the randomness is in the algorithm, so this bound holds for **every** input.
      `,
    },
    {
      t: 'viz',
      algo: 'cx-quick-pairs',
      caption: 'Each cell (i, j) lights when z_i and z_j get compared. Adjacent values are always compared (probability 2/2 = 1); far-apart values rarely are.',
    },
    {
      t: 'complexity',
      title: 'The recursive algorithms of this course at a glance',
      rows: [
        { op: 'Binary search', time: 'Θ(log n)', space: 'O(log n) recursive, O(1) iterative', note: 'T(n) = T(n/2) + 1' },
        { op: 'Merge sort', time: 'Θ(n log n)', space: 'O(n) buffer + O(log n) stack', note: 'T(n) = 2T(n/2) + n' },
        { op: 'Quicksort (random pivot)', time: 'Θ(n log n) expected, Θ(n²) worst', space: 'O(log n) expected stack', note: 'E[comparisons] ≤ 2n ln n' },
        { op: 'Karatsuba', time: 'Θ(n^1.585)', space: 'O(n)', note: 'T(n) = 3T(n/2) + n' },
        { op: 'Strassen', time: 'Θ(n^2.807)', space: 'O(n²)', note: 'T(n) = 7T(n/2) + n²' },
        { op: 'Naive Fibonacci', time: 'Θ(φⁿ)', space: 'O(n) stack', note: 'T(n) = T(n−1) + T(n−2) + 1' },
      ],
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Space hides in the stack',
      md: 'A recursive function with depth $d$ uses $\\Theta(d)$ stack even if it allocates nothing. Naive recursive DFS on a path graph of $10^6$ nodes overflows the default stack in most languages. Quicksort with a bad pivot reaches depth $n$; recursing into the **smaller** side first (and looping on the larger) caps the depth at $\\log_2 n$.',
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-ra-bs-space', 'cx-q-ra-karatsuba', 'cx-q-ra-four-calls', 'cx-q-ra-quick-adjacent', 'cx-q-ra-quick-prob', 'cx-q-ra-recurrence-code', 'cx-q-ra-smaller-first'] },
  ],
}

export const lowerBounds: Page = {
  id: 'lower-bounds',
  title: 'Lower bounds: proving that no algorithm can be faster',
  summary: 'Decision trees prove sorting needs Ω(n log n) comparisons; adversary arguments pin down exact counts like ⌈3n/2⌉ − 2 for min and max.',
  minutes: 18,
  blocks: [
    {
      t: 'md',
      md: `
        Every complexity so far was an **upper bound**: an algorithm that achieves it. A **lower bound** is a statement about *all possible algorithms* for a problem: none of them can do better. It is how we know merge sort is optimal and why nobody will ever find an $O(n)$ comparison sort.

        Lower bounds are always relative to a **model of computation** — what an algorithm is allowed to do. The comparison model says: the only way to learn about the input is to compare two elements ($a_i < a_j$?).

        ## Decision trees

        Any comparison algorithm, on inputs of size $n$, can be drawn as a binary tree: each internal node is a comparison, its two children are the two possible answers, and each leaf is where the algorithm stops and outputs its answer. A run of the algorithm is one root-to-leaf path; the **worst-case number of comparisons is the tree's height**.

        For sorting, different input orders need different outputs (different permutations to undo), so the tree needs at least $n!$ leaves. A binary tree of height $h$ has at most $2^h$ leaves, therefore

        $$2^h \\ge n! \\quad\\Longrightarrow\\quad h \\ge \\log_2(n!).$$

        And $\\log_2(n!) = \\Theta(n\\log n)$: the upper bound is $n\\log_2 n$; for the lower bound, the largest $n/2$ factors of $n!$ are each at least $n/2$, so $n! \\ge (n/2)^{n/2}$ and $\\log_2(n!) \\ge \\frac n2\\log_2\\frac n2 = \\Omega(n\\log n)$.

        **Every comparison sort needs $\\Omega(n\\log n)$ comparisons in the worst case.** (The same counting argument works for the average case.)
      `,
    },
    {
      t: 'viz',
      algo: 'cx-decision-tree',
      caption: 'Insertion sort on 3 values: 6 orders need 6 leaves, so some path asks at least ⌈log₂ 6⌉ = 3 questions. Change the input and follow a different path.',
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'How counting sort "beats" the bound',
      md: 'Counting sort and radix sort run in $O(n + k)$ because they are **not comparison sorts**: they use values as array indices, which gives far more than one bit of information per step. A lower bound only binds algorithms inside its model.',
    },
    {
      t: 'md',
      md: `
        ## Adversary arguments

        A sharper technique: imagine an **adversary** who answers the algorithm's questions, inventing the input as it goes, always choosing answers that keep the algorithm in the dark for as long as possible (while staying consistent). If the adversary can force $c$ questions, every algorithm needs $c$.

        **Maximum alone needs $n - 1$ comparisons.** Every element except the maximum must lose at least one comparison — otherwise the algorithm cannot rule it out as the maximum — and each comparison produces only one loser.

        **Min and max together: $\\lceil 3n/2 \\rceil - 2$ comparisons, and no fewer.** The algorithm: compare elements in pairs ($n/2$ comparisons); the winners compete for the max ($n/2 - 1$), the losers for the min ($n/2 - 1$). Total $3n/2 - 2$ for even $n$.

        Why no algorithm can do better: track how much each element is "known".  An element that has never been compared could still be min or max (2 units of uncertainty); one that has only won could still be max (1 unit); only lost — still min (1 unit); won and lost — neither (0). Initially there are $2n$ units; at the end only the max and min may carry their 1 unit each, so $2n - 2$ units must be removed. The adversary answers so that:

        - comparing two fresh elements removes 2 units (one becomes a winner, one a loser) — this can happen at most $n/2$ times;
        - every other comparison removes **at most 1** unit (the adversary lets the known winner win again, the known loser lose again).

        So at least $n/2$ comparisons remove 2 units and the rest remove 1: total $\\ge n/2 + (2n - 2 - n) = 3n/2 - 2$.
      `,
    },
    {
      t: 'viz',
      algo: 'cx-min-max',
      caption: 'Pairs first: winners challenge the max, losers the min. Count the comparisons against 2n − 2 for the naive two-pass method.',
    },
    {
      t: 'code',
      title: 'Min and max in ⌈3n/2⌉ − 2 comparisons',
      code: {
        cpp: `pair<int,int> minMax(const vector<int>& a) {
    int n = a.size(), lo, hi, i;
    if (n % 2) { lo = hi = a[0]; i = 1; }                 // odd: start from one element
    else { lo = min(a[0], a[1]); hi = max(a[0], a[1]); i = 2; }
    for (; i + 1 < n; i += 2) {
        int s = a[i], b = a[i + 1];
        if (s > b) swap(s, b);                            // 1 comparison inside the pair
        lo = min(lo, s);                                  // loser challenges the min
        hi = max(hi, b);                                  // winner challenges the max
    }
    return {lo, hi};
}`,
        java: `static int[] minMax(int[] a) {
    int n = a.length, lo, hi, i;
    if (n % 2 == 1) { lo = hi = a[0]; i = 1; }            // odd: start from one element
    else { lo = Math.min(a[0], a[1]); hi = Math.max(a[0], a[1]); i = 2; }
    for (; i + 1 < n; i += 2) {
        int s = a[i], b = a[i + 1];
        if (s > b) { int t = s; s = b; b = t; }           // 1 comparison inside the pair
        lo = Math.min(lo, s);                             // loser challenges the min
        hi = Math.max(hi, b);                             // winner challenges the max
    }
    return new int[]{lo, hi};
}`,
        python: `def min_max(a):
    n = len(a)
    if n % 2:                                             # odd: start from one element
        lo = hi = a[0]
        i = 1
    else:
        lo, hi = min(a[0], a[1]), max(a[0], a[1])
        i = 2
    while i + 1 < n:
        s, b = a[i], a[i + 1]
        if s > b:                                         # 1 comparison inside the pair
            s, b = b, s
        lo = min(lo, s)                                   # loser challenges the min
        hi = max(hi, b)                                   # winner challenges the max
        i += 2
    return lo, hi`,
        js: `function minMax(a) {
  const n = a.length;
  let lo, hi, i;
  if (n % 2) { lo = hi = a[0]; i = 1; }                   // odd: start from one element
  else { lo = Math.min(a[0], a[1]); hi = Math.max(a[0], a[1]); i = 2; }
  for (; i + 1 < n; i += 2) {
    let s = a[i], b = a[i + 1];
    if (s > b) [s, b] = [b, s];                           // 1 comparison inside the pair
    lo = Math.min(lo, s);                                 // loser challenges the min
    hi = Math.max(hi, b);                                 // winner challenges the max
  }
  return [lo, hi];
}`,
        c: `void min_max(const int *a, int n, int *lo, int *hi) {
    int i;
    if (n % 2) { *lo = *hi = a[0]; i = 1; }               /* odd: start from one element */
    else { *lo = a[0] < a[1] ? a[0] : a[1]; *hi = a[0] < a[1] ? a[1] : a[0]; i = 2; }
    for (; i + 1 < n; i += 2) {
        int s = a[i], b = a[i + 1];
        if (s > b) { int t = s; s = b; b = t; }           /* 1 comparison inside the pair */
        if (s < *lo) *lo = s;                             /* loser challenges the min */
        if (b > *hi) *hi = b;                             /* winner challenges the max */
    }
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Other lower bounds worth knowing

        | problem | lower bound | idea |
        |---|---|---|
        | search in a sorted array (comparisons) | $\\lceil\\log_2(n+1)\\rceil$ | $n + 1$ possible answers, binary decision tree |
        | merge two sorted lists of size $n$ | $2n - 1$ comparisons | adversary: interleaved outputs |
        | element distinctness (algebraic decision trees) | $\\Omega(n\\log n)$ | hashing breaks the model — $O(n)$ expected |
        | any algorithm that must read the input | $\\Omega(n)$ | it cannot answer correctly without looking at every element (adversary hides the answer in an unread cell) |
        | second largest | $n + \\lceil\\log_2 n\\rceil - 2$ | tournament: the runner-up lost directly to the winner |

        The last one is a favourite interview follow-up: find the largest with a knockout tournament ($n - 1$ comparisons); the second largest must have lost to the champion, and the champion played only $\\lceil\\log_2 n\\rceil$ matches.
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'Using lower bounds in an interview',
      md: 'When you have an $O(n\\log n)$ comparison-based solution and the interviewer asks for better, the lower bound tells you where to look: either the problem has extra structure (bounded values → counting; sorted input → binary search), or you can avoid comparing (hashing). Saying "a comparison-based approach can\'t beat n log n here, so we need to exploit X" is a strong answer.',
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-lb-leaves', 'cx-q-lb-log-fact', 'cx-q-lb-counting', 'cx-q-lb-max', 'cx-q-lb-minmax', 'cx-q-lb-second', 'cx-q-lb-read'] },
  ],
}

export const hardProblems: Page = {
  id: 'hard-problems',
  title: 'When no fast algorithm is known: exponential time, pseudo-polynomial time and NP',
  summary: 'Subset sum, knapsack and the P vs NP question — recognising hard problems and what to do when you meet one.',
  minutes: 18,
  blocks: [
    {
      t: 'md',
      md: `
        Some problems have no known polynomial-time algorithm at all. Recognising them saves you from hunting for an $O(n\\log n)$ trick that does not exist — and tells you which tools *do* work.

        ## Exponential time: trying everything

        **Subset sum:** given $n$ numbers, is there a subset adding up to a target $T$? The direct approach decides, for each item, *take it or skip it*: a binary tree with $2^n$ leaves. Adding one item **doubles** the work — exponential growth.

        | $n$ | $2^n$ | at $10^8$ operations/s |
        |---|---|---|
        | 20 | $10^6$ | instant |
        | 30 | $10^9$ | ~10 s |
        | 40 | $10^{12}$ | ~3 hours |
        | 60 | $10^{18}$ | ~300 years |

        So in a problem with $n \\le 20$, $2^n$ is not just allowed — it is often **the intended solution**. With $n \\le 40$, **meet in the middle** splits the items into two halves of 20, enumerates $2^{20}$ subset sums of each, sorts one side and binary-searches it: $O(2^{n/2} \\cdot n)$.
      `,
    },
    {
      t: 'viz',
      algo: 'cx-subsets',
      caption: 'Each level is one item: left = take it, right = skip it. Add a fifth item mentally — every leaf would split in two.',
    },
    {
      t: 'md',
      md: `
        ## Pseudo-polynomial time: the knapsack table

        The 0/1 knapsack (and subset sum) has a well-known dynamic program with a table of size $n \\times (W + 1)$, where $W$ is the capacity: $O(nW)$ time. That looks polynomial — but $W$ is a **value**, not a size. Writing $W$ takes only $\\log_2 W$ bits, so as a function of the input *length* the table has $n \\cdot 2^{\\text{bits}}$ cells: exponential in the size of the input.

        Algorithms that are polynomial in the **numeric value** of the input but not in its **length** are called **pseudo-polynomial**. They are excellent when the numbers are small ($W \\le 10^5$) and useless when they are huge ($W = 10^{18}$).
      `,
    },
    {
      t: 'viz',
      algo: 'cx-knapsack',
      caption: 'One row per item, one column per capacity 0…W. Double W and the table doubles; add one digit to W and it grows tenfold.',
    },
    {
      t: 'code',
      title: 'Subset sum: brute force vs pseudo-polynomial DP',
      code: {
        cpp: `// O(2^n): try every subset as a bitmask
bool subsetBrute(const vector<int>& a, long long T) {
    int n = a.size();
    for (int mask = 0; mask < (1 << n); mask++) {
        long long s = 0;
        for (int i = 0; i < n; i++) if (mask >> i & 1) s += a[i];
        if (s == T) return true;
    }
    return false;
}

// O(n * T): can[s] = some subset of the items seen so far sums to s
bool subsetDP(const vector<int>& a, int T) {
    vector<char> can(T + 1, 0);
    can[0] = 1;
    for (int x : a)
        for (int s = T; s >= x; s--)        // backwards: each item used at most once
            if (can[s - x]) can[s] = 1;
    return can[T];
}`,
        java: `static boolean subsetBrute(int[] a, long T) {
    int n = a.length;
    for (int mask = 0; mask < (1 << n); mask++) {
        long s = 0;
        for (int i = 0; i < n; i++) if ((mask >> i & 1) == 1) s += a[i];
        if (s == T) return true;
    }
    return false;
}

static boolean subsetDP(int[] a, int T) {
    boolean[] can = new boolean[T + 1];
    can[0] = true;
    for (int x : a)
        for (int s = T; s >= x; s--)        // backwards: each item used at most once
            if (can[s - x]) can[s] = true;
    return can[T];
}`,
        python: `def subset_brute(a, T):                       # O(2^n)
    n = len(a)
    return any(sum(a[i] for i in range(n) if mask >> i & 1) == T for mask in range(1 << n))

def subset_dp(a, T):                          # O(n * T)
    can = [False] * (T + 1)
    can[0] = True
    for x in a:
        for s in range(T, x - 1, -1):         # backwards: each item used at most once
            if can[s - x]:
                can[s] = True
    return can[T]`,
        js: `function subsetBrute(a, T) {                // O(2^n)
  const n = a.length;
  for (let mask = 0; mask < (1 << n); mask++) {
    let s = 0;
    for (let i = 0; i < n; i++) if ((mask >> i) & 1) s += a[i];
    if (s === T) return true;
  }
  return false;
}

function subsetDP(a, T) {                     // O(n * T)
  const can = new Uint8Array(T + 1);
  can[0] = 1;
  for (const x of a)
    for (let s = T; s >= x; s--) if (can[s - x]) can[s] = 1;   // backwards: once per item
  return can[T] === 1;
}`,
        c: `/* O(2^n): try every subset as a bitmask */
int subset_brute(const int *a, int n, long long T) {
    for (int mask = 0; mask < (1 << n); mask++) {
        long long s = 0;
        for (int i = 0; i < n; i++) if (mask >> i & 1) s += a[i];
        if (s == T) return 1;
    }
    return 0;
}

/* O(n * T); can must have room for T + 1 entries */
int subset_dp(const int *a, int n, int T, char *can) {
    for (int s = 0; s <= T; s++) can[s] = 0;
    can[0] = 1;
    for (int i = 0; i < n; i++)
        for (int s = T; s >= a[i]; s--)       /* backwards: each item used at most once */
            if (can[s - a[i]]) can[s] = 1;
    return can[T];
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## P, NP and NP-completeness — the intuition

        - **P** is the class of yes/no problems solvable in polynomial time.
        - **NP** is the class of yes/no problems where a "yes" answer has a **certificate you can check in polynomial time**. For subset sum the certificate is the subset itself: add it up and compare with $T$.
        - Every problem in P is in NP (just solve it). Whether **P = NP** — whether every quickly *checkable* problem is also quickly *solvable* — is the most famous open question in computer science.
        - A problem is **NP-complete** if it is in NP and *every* NP problem reduces to it in polynomial time. A polynomial algorithm for any one NP-complete problem would give one for all of them.

        NP-complete problems you will meet: **SAT**, **subset sum**, **0/1 knapsack** (decision version), **travelling salesman** (decision version), **Hamiltonian path**, **graph colouring** with 3+ colours, **clique**, **vertex cover**, **longest simple path**. Their close cousins are easy: shortest path, 2-colouring (bipartiteness), Euler path, minimum spanning tree.

        ## What to do when a problem is hard

        1. **Read the constraints.** $n \\le 20$ → $O(2^n)$ or $O(2^n n)$ bitmask search or DP; $n \\le 40$ → meet in the middle; small numeric values → pseudo-polynomial DP.
        2. **Look for special structure** that makes it easy: trees instead of general graphs, intervals, bipartite graphs, sorted data.
        3. **Prune** the search: backtracking with good bounds (branch and bound) is exponential in theory but often fast in practice.
        4. Outside interviews: **approximation** algorithms with guarantees, and heuristics.
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'The constraint is the hint',
      md: 'If an interview problem gives $n \\le 15$ or $n \\le 20$, the interviewer is telling you an exponential algorithm is expected. Saying "this looks like subset sum, which is NP-complete, so with n ≤ 20 I\'ll enumerate subsets with a bitmask" shows you understand *why* the brute force is acceptable.',
    },
    {
      t: 'complexity',
      title: 'Hard problems and the algorithms that work anyway',
      rows: [
        { op: 'Subset sum, brute force', time: 'O(2ⁿ · n)', note: 'n ≤ 20' },
        { op: 'Subset sum, meet in the middle', time: 'O(2^(n/2) · n)', note: 'n ≤ 40' },
        { op: 'Subset sum / 0-1 knapsack DP', time: 'O(n · W)', space: 'O(W)', note: 'pseudo-polynomial: small W' },
        { op: 'TSP, Held–Karp DP', time: 'O(2ⁿ · n²)', space: 'O(2ⁿ · n)', note: 'n ≤ 16–20' },
        { op: 'Verify a certificate', time: 'polynomial', note: 'what makes a problem NP' },
      ],
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-hp-double', 'cx-q-hp-n20', 'cx-q-hp-pseudo', 'cx-q-hp-np-cert', 'cx-q-hp-npc', 'cx-q-hp-easy-cousin', 'cx-q-hp-mitm'] },
  ],
}
