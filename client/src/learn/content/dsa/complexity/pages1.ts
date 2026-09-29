import type { Page } from '../../../types'

export const whyMeasure: Page = {
  id: 'why-measure',
  title: 'Why count steps instead of seconds',
  summary: 'Stopwatch timings depend on the machine, the language and the input. Counting basic operations gives a measure that does not.',
  minutes: 12,
  blocks: [
    {
      t: 'md',
      md: `
        Two programs solve the same problem. Which one is faster? The obvious answer — run both and time them — turns out to be a poor way to *compare algorithms*:

        - The same code runs at different speeds on a laptop, a phone and a judge server.
        - C++ is often 10–50× faster than Python for the same loop.
        - One input can be easy and another hard: searching for the first element is instant, searching for a missing one is not.
        - Timings on small inputs hide what happens on large ones — and large inputs are where it matters.

        What we actually want to know is **how the work grows as the input grows**. For that we count steps.

        ## The cost model

        We pretend the computer does **basic operations** — an assignment, an arithmetic operation, a comparison, reading \`arr[i]\`, a function call — each in one unit of time. This is the *RAM model*: every basic operation costs 1, and memory access by index is O(1) (you saw why on the Arrays page: the address is computed, not searched for).

        Then the running time of an algorithm is a **function of the input size** $n$: $T(n)$ = the number of basic operations on an input of size $n$.
      `,
    },
    { t: 'viz', algo: 'cx-count-ops', caption: 'Every operation adds 1 to the meter. Try a longer array: the count follows 3n + 3 exactly.' },
    {
      t: 'md',
      md: `
        ## Reading the count

        For the sum loop the count is $T(n) = 3n + 3$:

        | part | runs | operations |
        |---|---|---|
        | \`s = 0\`, \`i = 0\` | once | 2 |
        | test \`i < n\` | $n + 1$ times (the last test fails) | $n + 1$ |
        | \`s += arr[i]\` | $n$ times | $n$ |
        | \`i++\` | $n$ times | $n$ |

        The exact constants depend on what we choose to count (is \`s += arr[i]\` one operation or three — read, add, write?). That is fine, because we are about to throw the constants away. What does **not** depend on those choices is the shape: the count is **proportional to n**. Double the input, double the work.
      `,
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Why constants do not matter (much)',
      md: `Whether the loop costs $3n$ or $5n$ changes the time by a fixed factor — the same factor a faster CPU or a better compiler gives you. Whether it costs $n$ or $n^2$ changes *how the time scales*: at $n = 10^6$ that is the difference between a millisecond and fifteen minutes. Complexity analysis keeps what scales and drops what does not.`,
    },
    {
      t: 'md',
      md: `
        ## What "input size" means

        $n$ is whatever measures how big the input is:

        - an array or string — its **length**;
        - a number — often its **value** $n$ (a loop \`for i in 1..n\`), but sometimes its **number of digits**, $\\log_{10} n$;
        - a matrix — its **rows and columns**, $R \\times C$;
        - a graph — **vertices and edges**, $V$ and $E$.

        When there are several inputs, the cost can depend on several sizes: merging arrays of sizes $n$ and $m$ is $O(n + m)$, a nested loop over both is $O(n \\cdot m)$. Do not collapse them into one $n$ unless they really are the same.
      `,
    },
    {
      t: 'steps',
      items: [
        { title: 'Pick the size', md: 'Decide what n (and m, …) are for this input.' },
        { title: 'Find the basic operation', md: 'The comparison, addition or visit that runs the most. Its count dominates.' },
        { title: 'Count how often it runs', md: 'As a function of n — loops multiply, sequences add.' },
        { title: 'Keep the fastest-growing term', md: 'Drop constant factors and lower-order terms: $3n + 3 \\to O(n)$.' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'In interviews',
      md: 'You will be asked "what is the time and space complexity?" for every solution you write. Say both, name the variables ("O(n log n) time where n is the length of the array, O(1) extra space"), and be ready to point at the line that dominates.',
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-why-not-time', 'cx-q-count-test', 'cx-q-count-ops', 'cx-q-input-size', 'cx-q-two-sizes', 'cx-q-fill-count'] },
    { t: 'practice', title: 'Practice', ids: ['cx-c-sum-n'] },
  ],
}

export const bigO: Page = {
  id: 'big-o',
  title: 'Big-O, Big-Ω and Big-Θ',
  summary: 'The precise meaning of "grows like": upper bounds, lower bounds, tight bounds — and the rules for simplifying them.',
  minutes: 18,
  blocks: [
    {
      t: 'md',
      md: `
        Saying "$3n + 3$ grows like $n$" needs a definition. Asymptotic notation gives it, by comparing functions **for large n**, **up to a constant factor**.

        ## Big-O: an upper bound

        $f(n) = O(g(n))$ means: there are constants $c > 0$ and $n_0$ such that

        $$f(n) \\le c \\cdot g(n) \\quad \\text{for every } n \\ge n_0.$$

        In words: from some point on, $f$ never exceeds a constant multiple of $g$.

        **Example.** $3n + 3 = O(n)$: take $c = 4$ and $n_0 = 3$. For $n \\ge 3$, $3n + 3 \\le 3n + n = 4n$. ✓

        **Example.** $3n + 3 = O(n^2)$ as well — $n^2$ is also an upper bound, just a loose one. Big-O only promises "not worse than".

        ## Big-Ω: a lower bound

        $f(n) = \\Omega(g(n))$ means $f(n) \\ge c \\cdot g(n)$ for all $n \\ge n_0$, for some $c > 0$. "At least this much work."

        $3n + 3 = \\Omega(n)$ (take $c = 3$). But $3n + 3$ is **not** $\\Omega(n^2)$: no constant $c$ keeps $3n + 3 \\ge c n^2$ once $n$ is large.

        ## Big-Θ: a tight bound

        $f(n) = \\Theta(g(n))$ when it is both $O(g(n))$ and $\\Omega(g(n))$ — $f$ is sandwiched between two multiples of $g$. $3n + 3 = \\Theta(n)$.
      `,
    },
    {
      t: 'callout',
      kind: 'note',
      title: 'How people actually use them',
      md: 'In practice — interviews, editorials, documentation — "O(n²)" usually *means* Θ(n²): the tightest bound you can state. Writing O(n³) for an O(n²) algorithm is technically true and practically wrong. Always give the tightest bound you can justify.',
    },
    {
      t: 'md',
      md: `
        ## The simplification rules

        These follow from the definition and are all you need day to day:

        1. **Drop constant factors.** $5n^2 = O(n^2)$, $\\tfrac{n}{2} = O(n)$, $1000 = O(1)$.
        2. **Keep only the fastest-growing term.** $n^2 + 100n + 10^6 = O(n^2)$ — for large $n$ the $n^2$ term dwarfs the rest.
        3. **Sequential code adds.** Loop A then loop B costs $O(f + g)$, which is $O(\\max(f, g))$.
        4. **Nested code multiplies.** A loop of $f$ iterations whose body costs $g$ costs $O(f \\cdot g)$.
        5. **Log bases do not matter.** $\\log_2 n = \\dfrac{\\ln n}{\\ln 2}$ — a constant factor apart — so we just write $O(\\log n)$.
        6. **Exponent bases do matter.** $2^n$ and $3^n$ are *not* the same class: $3^n / 2^n = 1.5^n$ is not a constant.
      `,
    },
    { t: 'viz', algo: 'cx-growth', caption: 'Plug the same n into each rate. Red cells need more than 10⁹ steps — beyond a one-second limit.' },
    {
      t: 'md',
      md: `
        ## Proving a bound, step by step

        Show that $f(n) = 2n^2 + 7n + 4$ is $\\Theta(n^2)$.

        - **Upper:** for $n \\ge 1$, $7n \\le 7n^2$ and $4 \\le 4n^2$, so $f(n) \\le 2n^2 + 7n^2 + 4n^2 = 13n^2$. Take $c = 13$, $n_0 = 1$.
        - **Lower:** $f(n) \\ge 2n^2$ for all $n \\ge 0$. Take $c = 2$.

        Both hold, so $f = \\Theta(n^2)$. The pattern is always the same: bound every smaller term by the largest one.

        ## Little-o and little-ω (for completeness)

        $f = o(g)$ means $f$ grows **strictly slower**: $f(n)/g(n) \\to 0$. So $n = o(n^2)$ but $n^2 \\ne o(n^2)$. Similarly $f = \\omega(g)$ means strictly faster. You rarely need these, but they explain phrases like "sub-linear" ($o(n)$) and "super-polynomial".
      `,
    },
    {
      t: 'complexity',
      title: 'Simplify these',
      rows: [
        { op: '4n + 10', time: 'O(n)', note: 'drop constants' },
        { op: 'n² + n log n', time: 'O(n²)', note: 'n² dominates' },
        { op: '3 log₂ n + 20', time: 'O(log n)', note: 'base is irrelevant' },
        { op: 'n³/1000 + 10⁹ n', time: 'O(n³)', note: 'for large enough n the cube wins' },
        { op: '2ⁿ + n¹⁰⁰', time: 'O(2ⁿ)', note: 'any exponential beats any polynomial' },
        { op: 'n + m (two inputs)', time: 'O(n + m)', note: 'cannot simplify further' },
      ],
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Asymptotics are about large n',
      md: 'An $O(n)$ algorithm with a huge constant can lose to an $O(n^2)$ one for small inputs — which is why library sorts switch to insertion sort for tiny arrays. Big-O answers "how does it scale", not "which is faster on this exact input".',
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-bigo-def', 'cx-q-bigo-c', 'cx-q-loose', 'cx-q-simplify', 'cx-q-theta', 'cx-q-log-base', 'cx-q-exp-base', 'cx-q-match-notation'] },
  ],
}

export const loops: Page = {
  id: 'loops',
  title: 'Analysing loops',
  summary: 'Single loops, nested loops, loops that depend on each other — count the iterations and multiply.',
  minutes: 16,
  blocks: [
    {
      t: 'md',
      md: `
        Almost every complexity question comes down to: **how many times does the innermost statement run?**

        ## One loop

        \`for i in 0..n-1: body\` runs the body $n$ times. If the body is $O(1)$ the loop is $O(n)$. If the step is 2 (\`i += 2\`), it runs $n/2$ times — still $O(n)$.

        ## Loops one after another

        Two separate loops of $n$ iterations cost $n + n = 2n = O(n)$. Sequence **adds**, and adding the same order of growth does not change it.

        ## Nested loops

        When a loop of $n$ iterations contains another loop of $n$ iterations, the inner body runs $n \\times n$ times. Nesting **multiplies**.
      `,
    },
    { t: 'viz', algo: 'cx-nested', caption: 'Each outer iteration fills a whole row. n rows of n cells: n².' },
    {
      t: 'md',
      md: `
        ## When the inner loop depends on the outer one

        A very common shape starts the inner loop after \`i\`: every unordered pair once.

        \`\`\`
        for i in 0..n-1:
            for j in i+1..n-1:
                body
        \`\`\`

        Row $i$ has $n - 1 - i$ iterations, so the total is

        $$ (n-1) + (n-2) + \\cdots + 1 + 0 = \\frac{n(n-1)}{2}. $$

        That is about $n^2/2$ — half the grid — but halving is a constant factor. **Still $\\Theta(n^2)$.**
      `,
    },
    { t: 'viz', algo: 'cx-triangle', caption: 'The dim half is skipped. Compare the meter with the n² mark: always about half, never a different growth rate.' },
    {
      t: 'callout',
      kind: 'tip',
      title: 'The arithmetic series',
      md: '$1 + 2 + \\cdots + n = \\dfrac{n(n+1)}{2} = \\Theta(n^2)$. Any time a loop does "a little more work each iteration" (1, 2, 3, … up to n), you are looking at this sum.',
    },
    {
      t: 'md',
      md: `
        ## Three nested loops, and loops over different sizes

        - Three nested loops of $n$ each: $n^3$ (matrix multiplication, Floyd–Warshall).
        - A loop over \`A\` (size $n$) containing a loop over \`B\` (size $m$): $n \\cdot m$, **not** $n^2$.
        - A loop whose inner loop runs a **fixed** number of times (say, the 4 neighbours of a grid cell): $4n = O(n)$. A constant inner loop does not add a dimension.

        ## Watch out for hidden loops

        A single line can hide a loop:

        | line | real cost |
        |---|---|
        | \`x in some_list\` (Python) | $O(n)$ — a linear scan |
        | \`list.insert(0, x)\`, \`list.pop(0)\` | $O(n)$ — shifts everything |
        | \`s = s + c\` on strings in a loop | $O(\\text{len})$ each time → $O(n^2)$ total |
        | \`sorted(a)\`, \`std::sort\` | $O(n \\log n)$ |
        | \`a[l:r]\` slice / \`substr\` | $O(r - l)$ — it copies |
        | \`std::find\`, \`indexOf\`, \`count\` | $O(n)$ |

        A "single loop" that calls \`list.index\` inside is really two nested loops.
      `,
    },
    {
      t: 'code',
      title: 'Same task, O(n²) and O(n): does any value repeat?',
      note: 'The first compares every pair. The second remembers what it has seen (hashing, covered later) — or sorts first for O(n log n) with no extra structure.',
      code: {
        python: `# O(n²): every pair
def has_dup_slow(a):
    for i in range(len(a)):
        for j in range(i + 1, len(a)):
            if a[i] == a[j]:
                return True
    return False

# O(n) expected: a set remembers what we have seen
def has_dup_fast(a):
    seen = set()
    for x in a:
        if x in seen:          # O(1) average for a set
            return True
        seen.add(x)
    return False`,
        cpp: `// O(n²): every pair
bool hasDupSlow(const vector<int>& a) {
    for (size_t i = 0; i < a.size(); i++)
        for (size_t j = i + 1; j < a.size(); j++)
            if (a[i] == a[j]) return true;
    return false;
}

// O(n log n): sort a copy, then duplicates are neighbours
bool hasDupSort(vector<int> a) {
    sort(a.begin(), a.end());
    for (size_t i = 1; i < a.size(); i++)
        if (a[i] == a[i - 1]) return true;
    return false;
}`,
        java: `// O(n²): every pair
static boolean hasDupSlow(int[] a) {
    for (int i = 0; i < a.length; i++)
        for (int j = i + 1; j < a.length; j++)
            if (a[i] == a[j]) return true;
    return false;
}

// O(n) expected: a HashSet
static boolean hasDupFast(int[] a) {
    Set<Integer> seen = new HashSet<>();
    for (int x : a)
        if (!seen.add(x)) return true;
    return false;
}`,
        js: `// O(n²): every pair
function hasDupSlow(a) {
  for (let i = 0; i < a.length; i++)
    for (let j = i + 1; j < a.length; j++)
      if (a[i] === a[j]) return true;
  return false;
}

// O(n) expected: a Set
function hasDupFast(a) {
  const seen = new Set();
  for (const x of a) {
    if (seen.has(x)) return true;
    seen.add(x);
  }
  return false;
}`,
        c: `/* O(n²): every pair */
int has_dup_slow(const int *a, int n) {
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            if (a[i] == a[j]) return 1;
    return 0;
}

/* O(n log n): sort, then compare neighbours */
static int cmp(const void *x, const void *y) { return (*(int*)x > *(int*)y) - (*(int*)x < *(int*)y); }
int has_dup_sort(int *a, int n) {
    qsort(a, n, sizeof(int), cmp);
    for (int i = 1; i < n; i++) if (a[i] == a[i - 1]) return 1;
    return 0;
}`,
      },
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-seq-loops', 'cx-q-nested-count', 'cx-q-triangle-count', 'cx-q-nm', 'cx-q-hidden-in', 'cx-q-const-inner', 'cx-q-loop-order', 'cx-q-fill-triangle'] },
    { t: 'practice', title: 'Practice', ids: ['cx-c-distinct', 'cx-c-pairs'] },
  ],
}

export const logarithms: Page = {
  id: 'logarithms',
  title: 'Logarithms in loops',
  summary: 'Halving, doubling, n log n and the harmonic series — where log n comes from and why it is so small.',
  minutes: 17,
  blocks: [
    {
      t: 'md',
      md: `
        $\\log_2 n$ answers one question: **how many times can you halve $n$ before reaching 1?** (Equivalently: to which power must you raise 2 to get $n$?)

        | n | 8 | 1 024 | 1 000 000 | 10⁹ | 10¹⁸ |
        |---|---|---|---|---|---|
        | log₂ n | 3 | 10 | ≈ 20 | ≈ 30 | ≈ 60 |

        Logarithms grow absurdly slowly. That is why an $O(\\log n)$ algorithm on a billion items finishes in about 30 steps.

        ## Halving loops

        Any loop where the remaining work is **divided** by a constant each iteration runs $O(\\log n)$ times:

        \`\`\`
        while n > 1:
            n = n / 2
        \`\`\`

        Binary search is the famous example: each comparison discards half of the remaining range.
      `,
    },
    { t: 'viz', algo: 'cx-halving', caption: 'Try n = 1 000 000 and then 2 000 000: one extra step. Try 10⁹: only 29.' },
    {
      t: 'md',
      md: `
        ## Doubling loops

        The mirror image: \`i = 1; while i < n: i = i * 2\` also runs about $\\log_2 n$ times, because $i$ reaches $2^k \\ge n$ after $k = \\lceil \\log_2 n \\rceil$ doublings. Multiplying by 3 instead gives $\\log_3 n$ — the same $O(\\log n)$.

        ## n log n

        Put a linear loop **inside** a logarithmic one (or the other way round) and you get $O(n \\log n)$. This is the cost of efficient sorting and of many divide-and-conquer algorithms.
      `,
    },
    { t: 'viz', algo: 'cx-nlogn', caption: 'Only ⌈log₂ n⌉ rows, each a full pass over n. Compare the meter with the n² mark.' },
    {
      t: 'md',
      md: `
        ## The harmonic series: a trap that looks quadratic

        \`\`\`
        for i in 1..n:
            for j = i; j <= n; j += i:
                body
        \`\`\`

        Two nested loops — but the inner one runs $\\lfloor n/i \\rfloor$ times, shrinking as $i$ grows:

        $$ \\frac{n}{1} + \\frac{n}{2} + \\frac{n}{3} + \\cdots + \\frac{n}{n} = n \\left(1 + \\frac12 + \\cdots + \\frac1n\\right) \\approx n \\ln n. $$

        The sum $H_n = 1 + \\tfrac12 + \\cdots + \\tfrac1n$ (the *harmonic number*) grows like $\\ln n$. So this is $O(n \\log n)$, not $O(n^2)$. The **sieve of Eratosthenes** and "for every number, visit its multiples" loops have this shape.
      `,
    },
    { t: 'viz', algo: 'cx-harmonic', caption: 'Row i visits only the multiples of i. The lower rows are almost empty.' },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Useful log facts',
      md: `
- $\\log(ab) = \\log a + \\log b$, so $\\log(n^k) = k \\log n$ — $\\log(n^2)$ is still $O(\\log n)$.
- $\\log_a n = \\log_b n / \\log_b a$: any two bases differ by a constant.
- $\\log n! = \\Theta(n \\log n)$ (Stirling) — which is why comparison sorting needs $\\Omega(n \\log n)$ comparisons.
- A number $n$ has about $\\log_{10} n$ decimal digits and $\\log_2 n$ bits.
      `,
    },
    {
      t: 'code',
      title: 'Fast exponentiation — O(log b) multiplications instead of b',
      note: 'Square the base and halve the exponent each step. The exponent loses one bit per iteration, so the loop runs about log₂ b times — 60 iterations even for b = 10¹⁸.',
      code: {
        cpp: `long long power(long long a, long long b, long long m) {
    long long r = 1 % m;
    a %= m;
    while (b > 0) {
        if (b & 1) r = (__int128)r * a % m;
        a = (__int128)a * a % m;
        b >>= 1;
    }
    return r;
}`,
        java: `static long power(long a, long b, long m) {   // m < 3·10⁹, so a * a fits in a long
    long r = 1 % m;
    a %= m;
    while (b > 0) {
        if ((b & 1) == 1) r = r * a % m;
        a = a * a % m;
        b >>= 1;
    }
    return r;
}`,
        python: `def power(a, b, m):
    r = 1 % m
    a %= m
    while b > 0:
        if b & 1:
            r = r * a % m
        a = a * a % m
        b >>= 1
    return r
# built in: pow(a, b, m)`,
        js: `function power(a, b, m) {       // BigInt: a, b, m are 123n-style
  let r = 1n % m;
  a %= m;
  while (b > 0n) {
    if (b & 1n) r = r * a % m;
    a = a * a % m;
    b >>= 1n;
  }
  return r;
}`,
        c: `long long power(long long a, long long b, long long m) {
    long long r = 1 % m;
    a %= m;
    while (b > 0) {
        if (b & 1) r = (__int128)r * a % m;
        a = (__int128)a * a % m;
        b >>= 1;
    }
    return r;
}`,
      },
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-log-values', 'cx-q-halving-count', 'cx-q-doubling', 'cx-q-log-nested', 'cx-q-harmonic', 'cx-q-log-square', 'cx-q-while-div3', 'cx-q-fill-pow'] },
    { t: 'practice', title: 'Practice', ids: ['cx-c-halvings', 'cx-c-powmod', 'cx-c-harmonic'] },
  ],
}

export const growthClasses: Page = {
  id: 'growth-classes',
  title: 'The growth classes, and reading constraints',
  summary: 'O(1) to O(n!) in one ladder — and how the input limits in a problem tell you which class your solution must be in.',
  minutes: 15,
  blocks: [
    {
      t: 'md',
      md: `
        ## The ladder

        From slowest-growing to fastest-growing:

        $$ 1 \\;<\\; \\log n \\;<\\; \\sqrt{n} \\;<\\; n \\;<\\; n \\log n \\;<\\; n^2 \\;<\\; n^3 \\;<\\; 2^n \\;<\\; n! $$

        | class | name | typical source |
        |---|---|---|
        | $O(1)$ | constant | index an array, push onto a stack, a formula |
        | $O(\\log n)$ | logarithmic | binary search, balanced-tree operations, fast power |
        | $O(\\sqrt n)$ | square root | trial division, divisor enumeration |
        | $O(n)$ | linear | one pass: sum, max, two pointers, sliding window |
        | $O(n \\log n)$ | linearithmic | sorting, divide and conquer, heap of n items |
        | $O(n^2)$ | quadratic | all pairs, simple DP on two indices, bubble sort |
        | $O(n^3)$ | cubic | three nested loops, matrix multiplication, Floyd–Warshall |
        | $O(2^n)$ | exponential | all subsets |
        | $O(n!)$ | factorial | all orderings (permutations) |

        Everything up to $n^3$ (and $n^k$ for constant $k$) is **polynomial**. $2^n$ and $n!$ are not — they become infeasible around $n = 25$ and $n = 11$.
      `,
    },
    { t: 'viz', algo: 'cx-sqrt', caption: 'Divisors pair up around √n, so the loop stops there. Try a perfect square such as 144.' },
    {
      t: 'md',
      md: `
        ## From constraints to complexity

        A judge allows roughly **10⁸ simple operations per second** in C++ (fewer in Java, about 10⁷ in Python). Read the limits in the statement and pick the class that fits:

        | largest n | what fits in ~1 s | typical approach |
        |---|---|---|
        | ≤ 10–11 | $O(n!)$ | try every permutation |
        | ≤ 20–25 | $O(2^n)$, $O(2^n \\cdot n)$ | every subset, bitmask DP |
        | ≤ 500 | $O(n^3)$ | three nested loops, interval DP |
        | ≤ 5 000 | $O(n^2)$ | all pairs, 2D DP |
        | ≤ 10⁵ – 10⁶ | $O(n \\log n)$ | sort, binary search, heaps, segment trees |
        | ≤ 10⁷ – 10⁸ | $O(n)$ | one pass, prefix sums, two pointers |
        | ≤ 10¹² | $O(\\sqrt n)$ | trial division |
        | ≤ 10¹⁸ | $O(\\log n)$ or $O(1)$ | fast power, binary search on the answer, a formula |

        This table is the single most useful thing on this page. When you see $n \\le 2 \\cdot 10^5$, an $O(n^2)$ idea ($4 \\cdot 10^{10}$ steps) is dead on arrival — look for $O(n \\log n)$.
      `,
    },
    {
      t: 'callout',
      kind: 'tip',
      title: 'Estimate before you code',
      md: 'Plug the maximum n into your complexity: $n = 2 \\cdot 10^5$ with $O(n \\log n)$ is $2 \\cdot 10^5 \\times 18 \\approx 3.6 \\cdot 10^6$ — easily fine. With $O(n^2)$ it is $4 \\cdot 10^{10}$ — 400 seconds. Ten seconds of arithmetic saves an hour of coding the wrong idea.',
    },
    {
      t: 'md',
      md: `
        ## Polynomial vs exponential, felt

        If a computer doubles in speed, how much bigger an input can each class handle in the same time?

        - $O(n)$: **twice** as large.
        - $O(n^2)$: $\\sqrt 2 \\approx 1.41$ times as large.
        - $O(2^n)$: **one** more element.

        Faster hardware helps polynomial algorithms and barely touches exponential ones. That is the practical reason the distinction matters.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-ladder', 'cx-q-constraint-2e5', 'cx-q-constraint-20', 'cx-q-constraint-1e12', 'cx-q-ops-estimate', 'cx-q-double-speed', 'cx-q-match-constraints', 'cx-q-sqrt-why'] },
    { t: 'practice', title: 'Practice', ids: ['cx-c-divisors', 'cx-c-prime'] },
  ],
}
