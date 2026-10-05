import type { Page } from '../../../types'

export const cases: Page = {
  id: 'cases',
  title: 'Best, worst and average case',
  summary: 'One algorithm, one input size, different costs. Which case a bound describes — and which one to quote.',
  minutes: 12,
  blocks: [
    {
      t: 'md',
      md: `
        $T(n)$ is not always a single number: two inputs of the same size can take very different time. Linear search on $n$ elements makes **1** comparison if the target is first and **n** if it is missing.

        - **Worst case** — the maximum cost over all inputs of size $n$. A *guarantee*: it never takes longer.
        - **Best case** — the minimum. Usually uninformative: almost every algorithm has some lucky input.
        - **Average case** — the expected cost over a *distribution* of inputs (you must say which one). For linear search with the target equally likely at each position: $\\frac{1 + 2 + \\cdots + n}{n} = \\frac{n+1}{2}$.
      `,
    },
    { t: 'viz', algo: 'cx-cases', caption: 'Move the target to the front, the back, or remove it, and watch where the meter stops against the three marks.' },
    {
      t: 'md',
      md: `
        ## Which one do we quote?

        **The worst case**, unless stated otherwise. It is the only one that holds for every input — including the adversarial test a judge will certainly include.

        Some algorithms have very different cases, and it is worth knowing them:

        | algorithm | best | average | worst |
        |---|---|---|---|
        | linear search | $O(1)$ | $O(n)$ | $O(n)$ |
        | binary search | $O(1)$ | $O(\\log n)$ | $O(\\log n)$ |
        | insertion sort | $O(n)$ (already sorted) | $O(n^2)$ | $O(n^2)$ |
        | quicksort (naive pivot) | $O(n \\log n)$ | $O(n \\log n)$ | $O(n^2)$ (sorted input!) |
        | hash table lookup | $O(1)$ | $O(1)$ | $O(n)$ (all keys collide) |
        | merge sort | $O(n \\log n)$ | $O(n \\log n)$ | $O(n \\log n)$ |
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Best case is not "Big-Ω", worst case is not "Big-O"',
      md: 'These are two independent ideas. *Cases* pick which input we analyse; *O / Ω / Θ* describe how a function grows. "The worst case of insertion sort is Θ(n²)" and "the best case is Θ(n)" are both precise statements. Saying "insertion sort is Ω(n)" is true but weak.',
    },
    {
      t: 'md',
      md: `
        ## Expected vs average

        *Average case* averages over **inputs**. *Expected* running time of a **randomized** algorithm averages over the algorithm's own coin flips, for the *worst* input. Randomized quicksort (random pivot) is $O(n \\log n)$ expected on every input — no input is bad for it, only unlucky coin flips, and those are astronomically rare.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-case-default', 'cx-q-linear-avg', 'cx-q-insertion-best', 'cx-q-quick-worst', 'cx-q-case-vs-bound', 'cx-q-match-cases'] },
  ],
}

export const space: Page = {
  id: 'space',
  title: 'Space complexity',
  summary: 'Memory is a resource too: input vs auxiliary space, and the stack space recursion quietly uses.',
  minutes: 13,
  blocks: [
    {
      t: 'md',
      md: `
        **Space complexity** counts memory the same way time complexity counts operations: as a function of $n$, constants dropped.

        - **Input space** — the memory holding the input itself.
        - **Auxiliary (extra) space** — everything else the algorithm allocates: new arrays, hash maps, **and the call stack**.

        When people say "O(1) space" they mean O(1) *auxiliary* space: reversing an array in place with two pointers uses a couple of indexes, however big the array.

        | algorithm | extra space |
        |---|---|
        | sum, max, two pointers, reversal in place | $O(1)$ |
        | prefix-sum array, copy of the input | $O(n)$ |
        | merge sort (the merge buffer) | $O(n)$ |
        | an $n \\times n$ DP table | $O(n^2)$ |
        | recursion of depth $d$ | $O(d)$ for the stack |
      `,
    },
    { t: 'viz', algo: 'cx-rec-space', caption: 'Each pending call keeps a frame. The stack is deepest at the base case — n + 1 frames.' },
    {
      t: 'md',
      md: `
        ## The call stack is memory

        Every call that has not returned yet keeps a **stack frame**: its parameters, local variables and where to return to. A recursion that goes $n$ levels deep uses $O(n)$ stack space even if it allocates nothing.

        Typical stack limits are 1–8 MB. A C++ frame might be ~50–100 bytes, so a recursion depth around $10^5$–$10^6$ can crash with a **stack overflow**. Python refuses beyond ~1000 levels by default (\`sys.setrecursionlimit\` raises it, but the underlying C stack is still limited).

        Depth, not the total number of calls, is what matters: a recursion tree can have $2^n$ calls and still only be $n$ deep, because siblings run one after another and reuse the same stack space.
      `,
    },
    {
      t: 'code',
      title: 'The same sum: O(n) stack vs O(1) extra space',
      code: {
        python: `def total_rec(a, i=0):          # O(n) stack frames
    if i == len(a):
        return 0
    return a[i] + total_rec(a, i + 1)

def total_loop(a):               # O(1) extra space
    s = 0
    for x in a:
        s += x
    return s`,
        cpp: `long long totalRec(const vector<int>& a, size_t i = 0) {   // O(n) stack
    if (i == a.size()) return 0;
    return a[i] + totalRec(a, i + 1);
}

long long totalLoop(const vector<int>& a) {                 // O(1) extra
    long long s = 0;
    for (int x : a) s += x;
    return s;
}`,
        java: `static long totalRec(int[] a, int i) {     // O(n) stack
    if (i == a.length) return 0;
    return a[i] + totalRec(a, i + 1);
}

static long totalLoop(int[] a) {           // O(1) extra
    long s = 0;
    for (int x : a) s += x;
    return s;
}`,
        js: `function totalRec(a, i = 0) {        // O(n) stack
  if (i === a.length) return 0;
  return a[i] + totalRec(a, i + 1);
}

function totalLoop(a) {              // O(1) extra
  let s = 0;
  for (const x of a) s += x;
  return s;
}`,
        c: `long long total_rec(const int *a, int i, int n) {   /* O(n) stack */
    if (i == n) return 0;
    return a[i] + total_rec(a, i + 1, n);
}

long long total_loop(const int *a, int n) {          /* O(1) extra */
    long long s = 0;
    for (int i = 0; i < n; i++) s += a[i];
    return s;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'note',
      title: 'Time–space trade-offs',
      md: 'Many speed-ups buy time with memory: prefix sums (O(n) memory for O(1) queries), hash sets (O(n) memory to drop a nested loop), memoisation (a table to avoid recomputation). Sometimes the reverse is required — an in-place algorithm when memory is tight. Know which one the problem limits.',
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-aux', 'cx-q-rec-depth', 'cx-q-tree-depth', 'cx-q-space-prefix', 'cx-q-space-matrix', 'cx-q-fill-space'] },
  ],
}

export const amortized: Page = {
  id: 'amortized',
  title: 'Amortized analysis',
  summary: 'When an operation is usually cheap and occasionally expensive, average over a whole sequence — the honest cost of push_back.',
  minutes: 14,
  blocks: [
    {
      t: 'md',
      md: `
        A dynamic array (\`vector\`, \`ArrayList\`, Python \`list\`) usually appends in $O(1)$, but when it is full it allocates a bigger buffer and copies **everything** — $O(n)$ for that one push. So is push $O(n)$?

        Per operation, in the worst case, yes. But that worst case cannot happen *every time*. **Amortized analysis** bounds the total cost of a *sequence* of $k$ operations and divides by $k$.
      `,
    },
    { t: 'viz', algo: 'cx-amortized', caption: 'The tall red bars are the pushes that trigger a copy. They get rarer as the array grows, and the average stays under 3.' },
    {
      t: 'md',
      md: `
        ## The aggregate method

        With capacity doubling, copies happen when the size reaches $1, 2, 4, 8, \\ldots$ up to $k$. Total copying:

        $$ 1 + 2 + 4 + \\cdots + 2^{\\lfloor \\log_2 k \\rfloor} < 2k. $$

        Add the $k$ writes: fewer than $3k$ operations for $k$ pushes, so **O(1) amortized per push**.

        ## The accounting (banker's) method

        Charge every push 3 coins instead of 1. One pays for writing the value; the other two are saved "on" the element. When the array doubles from $m$ to $2m$, the $m/2$ elements pushed since the last doubling have saved $m$ coins — exactly enough to pay for copying all $m$ elements. The bank never goes negative, so 3 per push covers everything.

        ## Why doubling and not "+10"?

        If capacity grows by a constant $c$ each time, a copy happens every $c$ pushes and costs the current size: $c + 2c + 3c + \\cdots \\approx k^2 / (2c)$. That is $O(k)$ per push amortized — linear, not constant. **Geometric** growth (×2, ×1.5) is what makes it $O(1)$.
      `,
    },
    {
      t: 'callout',
      kind: 'warn',
      title: 'Amortized is not average case',
      md: 'Average case averages over random *inputs* and can be unlucky. Amortized cost is a **worst-case guarantee** for any sequence of operations — no probability involved. k pushes will always cost under 3k.',
    },
    {
      t: 'md',
      md: `
        ## Other amortized O(1) structures you will meet

        - **Two-pointer and sliding-window loops** — the inner \`while\` looks nested, but the left pointer only moves forward, $n$ times in total. The whole thing is $O(n)$ amortized. (You saw this in the variable window on the Arrays topic.)
        - **Monotonic stack** — each element is pushed once and popped at most once: $O(n)$ total.
        - **Union–find** with path compression — nearly $O(1)$ per operation.
        - **Queue from two stacks** — each element moves between stacks at most once.
      `,
    },
    {
      t: 'code',
      title: 'A loop that looks O(n²) but is O(n) amortized',
      note: 'The inner while can run many times for one hi, but lo only ever increases, so over the whole run it executes at most n times.',
      code: {
        cpp: `int lo = 0;
for (int hi = 0; hi < n; hi++) {       // n iterations
    sum += a[hi];
    while (sum > S) sum -= a[lo++];    // at most n iterations in TOTAL
}`,
        python: `lo = 0
for hi in range(n):          # n iterations
    total += a[hi]
    while total > S:         # at most n iterations in TOTAL
        total -= a[lo]
        lo += 1`,
        java: `int lo = 0;
for (int hi = 0; hi < n; hi++) {       // n iterations
    sum += a[hi];
    while (sum > S) sum -= a[lo++];    // at most n iterations in TOTAL
}`,
        js: `let lo = 0;
for (let hi = 0; hi < n; hi++) {      // n iterations
  sum += a[hi];
  while (sum > S) sum -= a[lo++];     // at most n iterations in TOTAL
}`,
        c: `int lo = 0;
for (int hi = 0; hi < n; hi++) {       /* n iterations */
    sum += a[hi];
    while (sum > S) sum -= a[lo++];    /* at most n in TOTAL */
}`,
      },
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-amort-def', 'cx-q-amort-total', 'cx-q-amort-copies', 'cx-q-amort-plus-c', 'cx-q-amort-window', 'cx-q-amort-vs-avg'] },
  ],
}

export const recurrences: Page = {
  id: 'recurrences',
  title: 'Recurrences and the recursion tree',
  summary: 'The cost of a recursive algorithm is a recurrence. Draw the tree, sum the levels — or use the Master theorem.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        A recursive function's cost is defined in terms of itself. For merge sort:

        $$ T(n) = 2\\,T(n/2) + n, \\qquad T(1) = 1 $$

        two half-size subproblems plus a linear merge. To solve it, **draw the recursion tree**: the root costs $n$, its two children cost $n/2$ each, the four grandchildren $n/4$ each, …

        - Level $k$ has $2^k$ nodes, each of size $n/2^k$, so the level costs $2^k \\cdot n/2^k = n$.
        - The sizes reach 1 after $\\log_2 n$ halvings, so there are $\\log_2 n + 1$ levels.

        Total: $n \\cdot (\\log_2 n + 1) = \\Theta(n \\log n)$.
      `,
    },
    { t: 'viz', algo: 'cx-merge-levels', caption: 'Split down to single elements, then merge up. Each merge level touches all n values once.' },
    {
      t: 'md',
      md: `
        ## The common recurrences

        | recurrence | tree shape | solution | example |
        |---|---|---|---|
        | $T(n) = T(n/2) + 1$ | a path of $\\log n$ nodes | $\\Theta(\\log n)$ | binary search |
        | $T(n) = T(n-1) + 1$ | a path of $n$ nodes | $\\Theta(n)$ | recursive sum |
        | $T(n) = T(n-1) + n$ | path, costs $n, n-1, \\ldots$ | $\\Theta(n^2)$ | selection sort, naive quicksort worst case |
        | $T(n) = 2T(n/2) + 1$ | full tree, $n$ leaves | $\\Theta(n)$ | tree traversal, max by divide and conquer |
        | $T(n) = 2T(n/2) + n$ | $\\log n$ levels × $n$ | $\\Theta(n \\log n)$ | merge sort |
        | $T(n) = 2T(n-1) + 1$ | full tree of depth $n$ | $\\Theta(2^n)$ | naive Fibonacci-like branching, Towers of Hanoi |
        | $T(n) = T(n/2) + n$ | $n + n/2 + n/4 + \\cdots$ | $\\Theta(n)$ | quickselect (expected) |

        ## The Master theorem

        For $T(n) = a\\,T(n/b) + f(n)$ with $a \\ge 1$, $b > 1$, compare $f(n)$ with $n^{\\log_b a}$ (the number of leaves):

        1. If $f(n) = O(n^{\\log_b a - \\varepsilon})$ — the **leaves dominate**: $T(n) = \\Theta(n^{\\log_b a})$.
        2. If $f(n) = \\Theta(n^{\\log_b a})$ — **every level costs the same**: $T(n) = \\Theta(n^{\\log_b a} \\log n)$.
        3. If $f(n) = \\Omega(n^{\\log_b a + \\varepsilon})$ (and a regularity condition holds) — the **root dominates**: $T(n) = \\Theta(f(n))$.

        Merge sort: $a = 2, b = 2$, $n^{\\log_2 2} = n = f(n)$ → case 2 → $\\Theta(n \\log n)$.
        Binary search: $a = 1, b = 2$, $n^{0} = 1 = f(n)$ → case 2 → $\\Theta(\\log n)$.
        Karatsuba multiplication: $T(n) = 3T(n/2) + n$, $n^{\\log_2 3} \\approx n^{1.585}$ beats $n$ → case 1 → $\\Theta(n^{1.585})$.
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'The Master theorem does not cover everything',
      md: 'It needs subproblems of **equal size n/b**. $T(n) = T(n-1) + n$ (subtract, not divide) or $T(n) = T(n/3) + T(2n/3) + n$ (unequal parts) need the recursion tree or substitution. The tree always works.',
    },
    {
      t: 'md',
      md: `
        ## Branching recursion: why naive Fibonacci is exponential

        \`fib(n) = fib(n-1) + fib(n-2)\` makes two calls, each making two more… The tree has about $\\varphi^n \\approx 1.618^n$ nodes: $T(n) = T(n-1) + T(n-2) + 1 = \\Theta(\\varphi^n)$. \`fib(50)\` would take billions of calls.

        The fix is to notice that the tree computes the same values over and over (\`fib(3)\` appears many times). Storing each result once — **memoisation** — collapses the tree to $n$ distinct calls: $\\Theta(n)$. That idea is the whole of dynamic programming, later in the course.
      `,
    },
    {
      t: 'code',
      title: 'Exponential vs linear: the same Fibonacci',
      code: {
        python: `def fib_slow(n):                 # Θ(φⁿ) calls
    return n if n < 2 else fib_slow(n - 1) + fib_slow(n - 2)

from functools import cache
@cache
def fib_memo(n):                 # Θ(n): each n computed once
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)`,
        cpp: `long long fibSlow(int n) {                    // Θ(φⁿ)
    return n < 2 ? n : fibSlow(n - 1) + fibSlow(n - 2);
}

long long memo[91];
long long fibMemo(int n) {                    // Θ(n)
    if (n < 2) return n;
    if (memo[n]) return memo[n];
    return memo[n] = fibMemo(n - 1) + fibMemo(n - 2);
}`,
        java: `static long fibSlow(int n) {                  // Θ(φⁿ)
    return n < 2 ? n : fibSlow(n - 1) + fibSlow(n - 2);
}

static long[] memo = new long[91];
static long fibMemo(int n) {                  // Θ(n)
    if (n < 2) return n;
    if (memo[n] != 0) return memo[n];
    return memo[n] = fibMemo(n - 1) + fibMemo(n - 2);
}`,
        js: `const fibSlow = (n) => (n < 2 ? n : fibSlow(n - 1) + fibSlow(n - 2));   // Θ(φⁿ)

const memo = new Map();
function fibMemo(n) {                                // Θ(n)
  if (n < 2) return n;
  if (!memo.has(n)) memo.set(n, fibMemo(n - 1) + fibMemo(n - 2));
  return memo.get(n);
}`,
        c: `long long fib_slow(int n) {                   /* Θ(φⁿ) */
    return n < 2 ? n : fib_slow(n - 1) + fib_slow(n - 2);
}

long long memo[91];
long long fib_memo(int n) {                   /* Θ(n) */
    if (n < 2) return n;
    if (memo[n]) return memo[n];
    return memo[n] = fib_memo(n - 1) + fib_memo(n - 2);
}`,
      },
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-rec-binary', 'cx-q-rec-merge-levels', 'cx-q-master-case', 'cx-q-rec-linear', 'cx-q-rec-2n', 'cx-q-fib-calls', 'cx-q-match-recurrence', 'cx-q-master-karatsuba'] },
    { t: 'practice', title: 'Practice', ids: ['cx-c-powmod'] },
  ],
}

export const hiddenCosts: Page = {
  id: 'hidden-costs',
  title: 'Hidden costs in real code',
  summary: 'Library calls, strings, copies and containers — the lines that look O(1) but are not.',
  minutes: 12,
  blocks: [
    {
      t: 'md',
      md: `
        The analysis is only as good as your knowledge of what each line costs. These are the ones that most often turn an intended $O(n)$ into $O(n^2)$.

        ## Removing from the front of an array

        \`list.pop(0)\` in Python, \`vector.erase(v.begin())\` in C++, \`ArrayList.remove(0)\` in Java and \`array.shift()\` in JavaScript all **shift every remaining element**. In a loop that drains the array, that is $O(n^2)$. Use a deque (\`collections.deque\`, \`std::deque\`, \`ArrayDeque\`) or keep a head index.
      `,
    },
    { t: 'viz', algo: 'arr-delete', initial: { k: '0' }, caption: 'Deleting index 0: every other element moves. This is what pop(0) and shift() do on every call.' },
    {
      t: 'md',
      md: `
        ## Building strings

        Strings are immutable in Java, Python and JavaScript: \`s = s + c\` creates a new string and copies the old one. Doing it $n$ times copies $1 + 2 + \\cdots + n = O(n^2)$ characters. Collect pieces in a list and join once (\`''.join(parts)\`, \`StringBuilder\`), or use \`+=\` on a C++ \`std::string\`, which appends in amortized $O(1)$.

        ## Membership tests

        \`x in list\` / \`list.contains\` / \`std::find\` scan the whole list: $O(n)$. Inside a loop that is $O(n^2)$. A hash set answers in $O(1)$ on average; a sorted array with binary search in $O(\\log n)$.

        ## Copies you did not ask for

        - Slices \`a[l:r]\`, \`substr\`, \`subList\` copies (in Python and C++ \`substr\`) cost $O(r - l)$.
        - Passing a \`vector\` or \`string\` **by value** in C++ copies it: use \`const T&\`.
        - Recursion that slices (\`solve(a[1:])\`) copies at every level: $O(n^2)$ total for a linear recursion. Pass indexes instead.

        ## Containers

        | operation | array / vector | balanced tree (\`set\`, \`TreeMap\`) | hash (\`unordered_set\`, \`HashMap\`, \`dict\`) |
        |---|---|---|---|
        | find a value | $O(n)$ | $O(\\log n)$ | $O(1)$ average |
        | insert | $O(1)$ at end, $O(n)$ elsewhere | $O(\\log n)$ | $O(1)$ average |
        | iterate in sorted order | sort first | $O(n)$ | not possible |
      `,
    },
    {
      t: 'code',
      title: 'O(n²) string building and its O(n) fix',
      code: {
        python: `# O(n²): each + copies everything so far
s = ''
for word in words:
    s = s + word

# O(n): one copy at the end
s = ''.join(words)`,
        java: `// O(n²)
String s = "";
for (String w : words) s = s + w;

// O(n)
StringBuilder sb = new StringBuilder();
for (String w : words) sb.append(w);
String t = sb.toString();`,
        js: `// Often optimised by engines, but not guaranteed:
let s = '';
for (const w of words) s += w;

// Predictable O(n)
const t = words.join('');`,
        cpp: `// std::string += appends in place: amortized O(1) per char, O(n) total
string s;
for (const string& w : words) s += w;

// but s = s + w builds a new string each time: O(n²)`,
        c: `/* strcat walks to the end of dst every call: O(n²) overall */
for (int i = 0; i < m; i++) strcat(buf, words[i]);

/* keep a pointer to the end instead: O(n) */
char *p = buf;
for (int i = 0; i < m; i++) { size_t L = strlen(words[i]); memcpy(p, words[i], L); p += L; }
*p = '\\0';`,
      },
    },
    {
      t: 'md',
      md: `
        ## Seeing the hidden costs

        Three costs that never show up in a Big-O written from the code alone: copying an immutable string on every \`+\`, the cache deciding which of two "identical" loops is fast, and a hash table whose keys all collide.
      `,
    },
    { t: 'viz', algo: 'cx-string-concat', caption: 'The copy meter climbs by the current length on every +: 1 + 2 + … + n characters. The builder copies each character once.' },
    { t: 'viz', algo: 'cx-cache', caption: 'Both orders touch every cell once — same Big-O. Count the misses: row order uses every loaded line fully, column order throws most of each line away.' },
    { t: 'viz', algo: 'cx-hash-collide', caption: 'With h(k) = k mod m and keys that are all multiples of m, every key lands in bucket 0 and each insert scans the whole chain. Change m to 7 and the keys spread out.' },
    {
      t: 'callout',
      kind: 'warn',
      title: 'Average-case guarantees can be attacked',
      md: 'Hash tables are O(1) *expected* only if keys spread out. An attacker who knows your hash function can send keys that all collide, turning every lookup into O(n) — a real denial-of-service technique. Randomised hashing (a secret seed, as in Python and Java\'s string hashing) restores the expected bound.',
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-pop0', 'cx-q-string-concat', 'cx-q-in-list', 'cx-q-slice-rec', 'cx-q-by-value', 'cx-q-match-containers'] },
  ],
}

export const cheatsheet: Page = {
  id: 'cheatsheet',
  title: 'Cheat sheet and review',
  summary: 'Everything from this topic on one page, plus a mixed set of questions to test it all.',
  minutes: 10,
  blocks: [
    {
      t: 'md',
      md: `
        ## Definitions

        - $f = O(g)$: $f(n) \\le c\\,g(n)$ for $n \\ge n_0$ — upper bound.
        - $f = \\Omega(g)$: $f(n) \\ge c\\,g(n)$ for $n \\ge n_0$ — lower bound.
        - $f = \\Theta(g)$: both — tight bound.
        - Drop constants and lower-order terms; log bases do not matter; exponent bases do.

        ## Counting patterns

        | code shape | count | class |
        |---|---|---|
        | one loop to n | $n$ | $O(n)$ |
        | loop then loop | $n + m$ | $O(n + m)$ |
        | loop in loop | $n \\cdot n$ | $O(n^2)$ |
        | \`j\` from \`i+1\` | $n(n-1)/2$ | $O(n^2)$ |
        | \`n /= 2\` or \`i *= 2\` | $\\log_2 n$ | $O(\\log n)$ |
        | log loop around n loop | $n \\log n$ | $O(n \\log n)$ |
        | \`j += i\` for every i | $n H_n$ | $O(n \\log n)$ |
        | \`i * i <= n\` | $\\sqrt n$ | $O(\\sqrt n)$ |
        | all subsets | $2^n$ | $O(2^n)$ |
        | all orderings | $n!$ | $O(n!)$ |

        ## Recurrences

        $T(n/2) + 1 \\to \\log n$ · $T(n-1) + 1 \\to n$ · $2T(n/2) + n \\to n \\log n$ · $T(n-1) + n \\to n^2$ · $2T(n-1) + 1 \\to 2^n$.

        ## Limits → target (≈ 10⁸ ops/s)

        $n \\le 10$: $n!$ · $20$: $2^n$ · $500$: $n^3$ · $5000$: $n^2$ · $10^6$: $n \\log n$ · $10^8$: $n$ · $10^{12}$: $\\sqrt n$ · $10^{18}$: $\\log n$.

        ## Also remember

        - Worst case is the default. Average needs a distribution. Amortized is a worst-case bound on a *sequence*.
        - Recursion depth $d$ costs $O(d)$ stack space.
        - \`pop(0)\`, \`in list\`, string \`+\` in a loop, slices and by-value copies are the usual hidden $O(n)$s.
      `,
    },
    { t: 'check', title: 'Mixed review', ids: ['cx-q-review-1', 'cx-q-review-2', 'cx-q-review-3', 'cx-q-review-4', 'cx-q-review-5', 'cx-q-review-6'] },
    { t: 'practice', title: 'All coding problems in this topic', ids: ['cx-c-sum-n', 'cx-c-distinct', 'cx-c-pairs', 'cx-c-halvings', 'cx-c-powmod', 'cx-c-harmonic', 'cx-c-divisors', 'cx-c-prime'] },
  ],
}
