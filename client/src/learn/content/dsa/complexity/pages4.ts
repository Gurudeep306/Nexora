import type { Page } from '../../../types'

export const summations: Page = {
  id: 'summations',
  title: 'The sums behind every loop',
  summary: 'Arithmetic, geometric and harmonic series, sums of powers, integral bounds — derived, then used to count dependent nested loops exactly.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        A loop whose inner work changes from one iteration to the next costs a **sum**. Four sums cover nearly every loop you will analyse. Learn to derive them, and to *recognise* them in code.

        ## 1. The arithmetic series

        $$ S = 1 + 2 + \\cdots + n = \\frac{n(n+1)}{2} = \\Theta(n^2). $$

        **Derivation (Gauss).** Write the sum forwards and backwards and add column by column: every column is $n + 1$, and there are $n$ columns, so $2S = n(n+1)$.

        $$ \\begin{array}{rcccccc} S &=& 1 &+& 2 &+ \\cdots +& n \\\\ S &=& n &+& (n-1) &+ \\cdots +& 1 \\\\ \\hline 2S &=& (n+1) &+& (n+1) &+ \\cdots +& (n+1) \\end{array} $$

        **Code shape:** \`for i in 0..n-1: for j in 0..i-1\` — the inner loop does "one more each time".

        ## 2. Sums of powers

        $\\sum_{k=1}^{n} k^2 = \\dfrac{n(n+1)(2n+1)}{6}$. **Derivation by telescoping:** $(k+1)^3 - k^3 = 3k^2 + 3k + 1$. Sum both sides for $k = 1 \\ldots n$; the left side telescopes to $(n+1)^3 - 1$:
        $$ (n+1)^3 - 1 = 3\\sum k^2 + 3\\cdot\\tfrac{n(n+1)}{2} + n, $$
        and solving for $\\sum k^2$ gives the formula.

        For asymptotics you rarely need exact formulas. **The bounding trick** gives $\\sum_{k=1}^{n} k^p = \\Theta(n^{p+1})$ for any constant $p \\ge 0$:
        - upper: each of the $n$ terms is at most $n^p$, so the sum is $\\le n^{p+1}$;
        - lower: the top half of the terms ($k \\ge n/2$) are each $\\ge (n/2)^p$, and there are $\\ge n/2$ of them, so the sum is $\\ge (n/2)^{p+1}$.

        The same trick shows $\\sum_{k=1}^{n} \\log k = \\Theta(n \\log n)$ — it is $\\log n!$.
      `,
    },
    {
      t: 'md',
      md: `
        ## 3. The geometric series

        For $r \\ne 1$: $\\displaystyle \\sum_{k=0}^{m} r^k = \\frac{r^{m+1} - 1}{r - 1}$.

        **Derivation.** Let $S = 1 + r + \\cdots + r^m$. Then $rS = r + r^2 + \\cdots + r^{m+1}$. Subtract: $rS - S = r^{m+1} - 1$. ∎

        Two consequences you will use constantly:
        - **Decreasing** ($r < 1$): the sum is less than $\\frac{1}{1-r}$ — a constant times the **first** term. $n + n/2 + n/4 + \\cdots < 2n$.
        - **Increasing** ($r > 1$): the sum is less than $\\frac{r}{r-1}$ times the **last** term. $1 + 2 + 4 + \\cdots + 2^m < 2^{m+1}$.

        **A geometric series is Θ of its largest term.** That one sentence explains dynamic-array doubling, the binary counter, the cost of building a heap, and the three cases of the Master theorem.
      `,
    },
    { t: 'viz', algo: 'cx-geometric', caption: 'The total creeps toward n·r/(r−1) but never reaches it. Try r = 3: the bound tightens to 1.5n.' },
    {
      t: 'md',
      md: `
        The most famous interview trap is a geometric series hiding in a nested loop:

        \`\`\`
        for (i = 1; i < n; i *= 2)        // i = 1, 2, 4, …
            for (j = 0; j < i; j++)       // i iterations
                work();
        \`\`\`

        Two nested loops, the outer one $\\log n$ times — so $O(n \\log n)$? No: the inner counts are $1 + 2 + 4 + \\cdots + 2^{\\lfloor \\log_2 (n-1) \\rfloor} < 2n$. **It is $\\Theta(n)$.** Multiply-the-loop-counts only works when the inner count does not depend on the outer variable.

        ## 4. The harmonic series

        $$ H_n = 1 + \\frac12 + \\frac13 + \\cdots + \\frac1n = \\ln n + \\gamma + O(1/n), \\qquad \\gamma \\approx 0.5772. $$

        **Bounds by integrals.** Since $1/x$ is decreasing, each term $1/k$ is at most the area under $1/x$ from $k-1$ to $k$ and at least the area from $k$ to $k+1$:
        $$ \\ln(n+1) = \\int_1^{n+1} \\frac{dx}{x} \\;\\le\\; H_n \\;\\le\\; 1 + \\int_1^{n} \\frac{dx}{x} = 1 + \\ln n. $$
        So $H_n = \\Theta(\\log n)$. **Code shape:** \`for i in 1..n: for j in i, 2i, 3i, … ≤ n\` costs $\\sum n/i = n H_n = \\Theta(n \\log n)$ — the sieve of Eratosthenes, "for every number, visit its multiples".

        ## The integral method in general

        If $f$ is increasing, $\\displaystyle\\int_{a-1}^{b} f(x)\\,dx \\le \\sum_{k=a}^{b} f(k) \\le \\int_{a}^{b+1} f(x)\\,dx$ (flip them for decreasing $f$). Any sum of a smooth function can be bracketed this way. Example: $\\sum_{k=1}^{n} \\sqrt k$ lies between $\\int_0^n \\sqrt x\\,dx = \\tfrac23 n^{3/2}$ and $\\tfrac23 (n+1)^{3/2}$, so it is $\\Theta(n^{3/2})$.

        ## Two more sums that appear in proofs

        - $\\displaystyle \\sum_{k=0}^{\\infty} \\frac{k}{2^k} = 2$. *Derivation:* let $S = \\sum k x^k$ for $|x| < 1$. Differentiate the geometric series $\\sum x^k = \\frac{1}{1-x}$ to get $\\sum k x^{k-1} = \\frac{1}{(1-x)^2}$, multiply by $x$: $S = \\frac{x}{(1-x)^2}$; at $x = \\tfrac12$ that is $2$. This is why building a heap bottom-up is $O(n)$.
        - $\\displaystyle \\sum_{k=1}^{m} k\\,2^k = (m-1)2^{m+1} + 2 = \\Theta(m\\,2^m)$ — the last term dominates again.
      `,
    },
    {
      t: 'md',
      md: `
        ## Dependent nested loops, counted exactly

        | code | count | class |
        |---|---|---|
        | \`for i<n: for j<i\` | $\\sum_{i=0}^{n-1} i = \\frac{n(n-1)}{2}$ | $\\Theta(n^2)$ |
        | \`for i<n: for j<i: for k<j\` | $\\binom{n}{3} = \\frac{n(n-1)(n-2)}{6}$ | $\\Theta(n^3)$ |
        | \`for i<n: for j<i*i\` | $\\sum i^2 \\approx n^3/3$ | $\\Theta(n^3)$ |
        | \`for i in 1..n: for j=1; j<i; j*=2\` | $\\sum \\lceil \\log_2 i \\rceil$ | $\\Theta(n \\log n)$ |
        | \`for i=1; i<n; i*=2: for j<i\` | $< 2n$ | $\\Theta(n)$ |
        | \`for i in 1..n: for j=i; j<=n; j+=i\` | $\\sum \\lfloor n/i \\rfloor \\approx n \\ln n$ | $\\Theta(n \\log n)$ |
        | \`for i in 1..n: for j=1; j*j<=i\` | $\\sum \\sqrt i \\approx \\tfrac23 n^{3/2}$ | $\\Theta(n^{3/2})$ |

        **The triple loop with $k < j < i$ counts the 3-element subsets of $\\{0,\\ldots,n-1\\}$** — each choice of three distinct numbers corresponds to exactly one $(i, j, k)$ with $i > j > k$. Counting by bijection is often faster than summing.
      `,
    },
    {
      t: 'code',
      title: 'Check a count by instrumenting the loop',
      note: 'When unsure, count. The geometric loop prints a number below 2n; the harmonic loop prints about n·ln n.',
      code: {
        cpp: `long long geometricLoop(long long n) {      // < 2n
    long long ops = 0;
    for (long long i = 1; i < n; i *= 2)
        for (long long j = 0; j < i; j++) ops++;
    return ops;
}
long long harmonicLoop(long long n) {       // ≈ n ln n
    long long ops = 0;
    for (long long i = 1; i <= n; i++)
        for (long long j = i; j <= n; j += i) ops++;
    return ops;
}`,
        java: `static long geometricLoop(long n) {          // < 2n
    long ops = 0;
    for (long i = 1; i < n; i *= 2)
        for (long j = 0; j < i; j++) ops++;
    return ops;
}
static long harmonicLoop(long n) {           // ≈ n ln n
    long ops = 0;
    for (long i = 1; i <= n; i++)
        for (long j = i; j <= n; j += i) ops++;
    return ops;
}`,
        python: `def geometric_loop(n):          # < 2n
    ops, i = 0, 1
    while i < n:
        ops += i                 # the inner loop runs i times
        i *= 2
    return ops

def harmonic_loop(n):           # ≈ n ln n
    return sum(n // i for i in range(1, n + 1))`,
        js: `function geometricLoop(n) {                 // < 2n
  let ops = 0;
  for (let i = 1; i < n; i *= 2)
    for (let j = 0; j < i; j++) ops++;
  return ops;
}
function harmonicLoop(n) {                  // ≈ n ln n
  let ops = 0;
  for (let i = 1; i <= n; i++)
    for (let j = i; j <= n; j += i) ops++;
  return ops;
}`,
        c: `long long geometric_loop(long long n) {     /* < 2n */
    long long ops = 0;
    for (long long i = 1; i < n; i *= 2)
        for (long long j = 0; j < i; j++) ops++;
    return ops;
}
long long harmonic_loop(long long n) {      /* ≈ n ln n */
    long long ops = 0;
    for (long long i = 1; i <= n; i++)
        for (long long j = i; j <= n; j += i) ops++;
    return ops;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: '"Two nested loops" is not an analysis',
      md: 'Count what the inner loop actually does for each outer value, then sum. Nested loops can be Θ(n) (geometric), Θ(n log n) (harmonic), Θ(n²), or worse. The sum decides — never the indentation.',
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'In interviews',
      md: 'A favourite: "what is the complexity of this code?" with a doubling outer loop and an inner loop up to i. Saying O(n log n) is the trap; walking through 1 + 2 + 4 + … < 2n and answering O(n) is exactly the reasoning they want to hear out loud.',
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-sum-squares', 'cx-q-sum-geo-loop', 'cx-q-sum-geo-bound', 'cx-q-sum-harmonic-bound', 'cx-q-sum-triple', 'cx-q-sum-k2k', 'cx-q-sum-sqrt-loop', 'cx-q-sum-match'] },
  ],
}

export const codeFragments: Page = {
  id: 'code-fragments',
  title: 'A field guide to tricky code',
  summary: 'Loops whose counters jump, shrink, square or never reset; recursion shapes; Euclid’s gcd — each analysed line by line.',
  minutes: 22,
  blocks: [
    {
      t: 'md',
      md: `
        Interviewers love code whose complexity is *not* what the indentation suggests. Here is the catalogue. For each: find what changes per iteration, write the sum, evaluate it.

        ## Loops whose counter does not step by 1

        | fragment | iterations | why |
        |---|---|---|
        | \`for (i = 1; i * i <= n; i++)\` | $\\lfloor\\sqrt n\\rfloor$ | stops when $i > \\sqrt n$ |
        | \`for (i = 1; i <= n; i *= 3)\` | $\\lfloor\\log_3 n\\rfloor + 1$ | $i = 3^k \\le n$ |
        | \`for (i = n; i > 0; i /= 2)\` | $\\lfloor\\log_2 n\\rfloor + 1$ | halving |
        | \`for (i = 2; i < n; i = i * i)\` | $\\approx \\log_2 \\log_2 n$ | the exponent doubles: $i = 2^{2^k}$ |
        | \`for (i = n; i > 1; i = sqrt(i))\` | $\\approx \\log_2 \\log_2 n$ | same, read backwards |
        | \`while (x) x &= x - 1\` | popcount$(x) \\le \\log_2 x + 1$ | clears the lowest set bit each time |
        | \`for (i = 0; i < n; i += k)\` | $\\lceil n/k \\rceil$ | $O(n)$ only if $k$ is a constant |
      `,
    },
    { t: 'viz', algo: 'cx-loglog', caption: 'The exponent doubles each time: 2¹, 2², 2⁴, 2⁸, 2¹⁶ … Even n = 10¹⁸ needs just 6 squarings.' },
    {
      t: 'md',
      md: `
        ## Nested loops with shrinking or jumping inner bounds

        **(a)** \`for (i = n; i > 0; i /= 2) for (j = 0; j < i; j++)\` — the inner counts are $n, n/2, n/4, \\ldots$: a decreasing geometric series, $< 2n$. **Θ(n).**

        **(b)** \`for (i = 0; i < n; i++) for (j = 1; j < n; j *= 2)\` — the inner loop is $\\lceil \\log_2 n\\rceil$ regardless of $i$. **Θ(n log n).**

        **(c)** \`for (i = 1; i <= n; i++) for (j = 1; j <= i; j *= 2)\` — $\\sum_i (\\lfloor\\log_2 i\\rfloor + 1) = \\Theta(\\log n!) = $ **Θ(n log n).**

        **(d) The hard one.**
        \`\`\`
        for (i = 1; i < n; i++)
            for (j = 1; j < i * i; j++)
                if (j % i == 0)
                    for (k = 0; k < j; k++) work();
        \`\`\`
        The middle loop runs $i^2 - 1$ times: $\\sum i^2 = \\Theta(n^3)$ tests. The innermost loop only runs when $j$ is a multiple of $i$: $j = i, 2i, \\ldots, (i-1)i$, costing $j$ each time. For fixed $i$ that is $i(1 + 2 + \\cdots + (i-1)) = i \\cdot \\tfrac{i(i-1)}{2} \\approx i^3/2$. Summing, $\\sum_{i<n} i^3/2 \\approx n^4/8$. **Θ(n⁴)** — the \`if\` filters most $j$, but the survivors are expensive.

        ## Pointers that never move backwards

        \`\`\`
        j = 0
        for i in 0..n-1:
            while j < n and ok(i, j): j += 1
        \`\`\`
        The \`while\` can run many times for one \`i\` — but \`j\` only increases and is capped at $n$, so the \`while\` body runs **at most $n$ times in total**. Plus $n$ outer iterations: **Θ(n)**. This is the amortized argument behind every two-pointer and sliding-window solution.

        Move \`j = 0\` *inside* the \`for\` and it becomes $\\Theta(n^2)$ in the worst case. One line's position changes the class.

        ## Recursion shapes

        | code | recurrence | cost |
        |---|---|---|
        | \`f(n): f(n-1)\` | $T(n) = T(n-1) + 1$ | $\\Theta(n)$ |
        | \`f(n): f(n/2)\` | $T(n) = T(n/2) + 1$ | $\\Theta(\\log n)$ |
        | \`f(n): f(n/2); f(n/2)\` | $T(n) = 2T(n/2) + 1$ | $\\Theta(n)$ — a tree with $n$ leaves |
        | \`f(n): loop n; f(n/2)\` | $T(n) = T(n/2) + n$ | $\\Theta(n)$ — geometric |
        | \`f(n): loop n; f(n/2); f(n/2)\` | $T(n) = 2T(n/2) + n$ | $\\Theta(n \\log n)$ |
        | \`f(n): f(n-1); f(n-1)\` | $T(n) = 2T(n-1) + 1$ | $\\Theta(2^n)$ |
        | \`f(n): for i<n: f(n-1)\` | $T(n) = nT(n-1) + n$ | $\\Theta(n!)$ — permutations |
        | \`f(n): f(n-1); f(n-2)\` | $T(n) = T(n-1) + T(n-2) + 1$ | $\\Theta(\\varphi^n)$, $\\varphi \\approx 1.618$ |

        The later pages solve these properly (substitution, recursion trees, the Master theorem).

        ## Euclid's gcd: a loop that is logarithmic for a subtle reason

        \`while b: a, b = b, a % b\`. Nothing is halved explicitly — yet it is $O(\\log \\min(a, b))$.

        **Lemma.** If $a \\ge b > 0$ then $a \\bmod b < a/2$. *Proof:* if $b \\le a/2$, then $a \\bmod b < b \\le a/2$. If $b > a/2$, then $a \\bmod b = a - b < a/2$. ∎

        Two iterations map $(a, b) \\to (b, a \\bmod b) \\to (a \\bmod b, \\ldots)$, so the first number is more than halved every two iterations: at most $2\\log_2 a + 1$ iterations. (Lamé's theorem sharpens this: the worst case is consecutive Fibonacci numbers, about $\\log_{\\varphi} a \\approx 1.44\\log_2 a$ iterations.)
      `,
    },
    { t: 'viz', algo: 'cx-euclid', caption: 'Consecutive Fibonacci numbers: every quotient is 1, so the numbers shrink as slowly as possible — and still only logarithmically.' },
    {
      t: 'code',
      title: 'Euclid’s algorithm — O(log min(a, b)) iterations',
      code: {
        cpp: `long long gcd(long long a, long long b) {
    while (b != 0) {
        long long r = a % b;
        a = b;
        b = r;
    }
    return a;
}`,
        java: `static long gcd(long a, long b) {
    while (b != 0) {
        long r = a % b;
        a = b;
        b = r;
    }
    return a;
}`,
        python: `def gcd(a, b):
    while b:
        a, b = b, a % b
    return a`,
        js: `function gcd(a, b) {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}`,
        c: `long long gcd(long long a, long long b) {
    while (b != 0) {
        long long r = a % b;
        a = b;
        b = r;
    }
    return a;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Grouping equal values: the O(√n) block trick

        To compute $\\sum_{i=1}^{n} \\lfloor n/i \\rfloor$ for $n$ up to $10^{12}$, a loop over $i$ is hopeless. But $\\lfloor n/i \\rfloor$ takes **at most $2\\sqrt n$ distinct values**: for $i \\le \\sqrt n$ there are only $\\sqrt n$ choices of $i$; for $i > \\sqrt n$ the quotient is below $\\sqrt n$. And all $i$ with the same quotient $q$ form one block ending at $\\lfloor n/q \\rfloor$. So jump from block to block:
      `,
    },
    { t: 'viz', algo: 'cx-floor-blocks', caption: 'Each coloured run is one loop iteration. The runs are short on the left and long on the right — about 2√n of them in total.' },
    {
      t: 'code',
      title: 'Σ ⌊n / i⌋ in O(√n)',
      code: {
        cpp: `long long floorSum(long long n) {
    long long total = 0;
    for (long long i = 1; i <= n; ) {
        long long q = n / i, last = n / q;     // every j in [i, last] has n / j == q
        total += q * (last - i + 1);
        i = last + 1;
    }
    return total;
}`,
        java: `static long floorSum(long n) {
    long total = 0;
    for (long i = 1; i <= n; ) {
        long q = n / i, last = n / q;
        total += q * (last - i + 1);
        i = last + 1;
    }
    return total;
}`,
        python: `def floor_sum(n):
    total, i = 0, 1
    while i <= n:
        q = n // i
        last = n // q
        total += q * (last - i + 1)
        i = last + 1
    return total`,
        js: `function floorSum(n) {               // n ≤ 2^53; use BigInt beyond
  let total = 0;
  for (let i = 1; i <= n; ) {
    const q = Math.floor(n / i), last = Math.floor(n / q);
    total += q * (last - i + 1);
    i = last + 1;
  }
  return total;
}`,
        c: `long long floor_sum(long long n) {
    long long total = 0;
    for (long long i = 1; i <= n; ) {
        long long q = n / i, last = n / q;
        total += q * (last - i + 1);
        i = last + 1;
    }
    return total;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Loop conditions that hide work',
      md: '`for (i = 0; i < strlen(s); i++)` in C recomputes the length every iteration — Θ(n²). `while (!q.empty() && …)` is fine, but `while (list.size() > 0) list.remove(0)` is quadratic. Read the condition and the update, not just the body.',
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'In interviews',
      md: 'Narrate: "the outer loop runs log n times; for each, the inner loop runs i times; that is 1 + 2 + 4 + … which is a geometric series bounded by 2n, so O(n) overall." Interviewers grade the derivation, not just the final letter.',
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-frag-sqrt', 'cx-q-frag-halving-inner', 'cx-q-frag-n4', 'cx-q-frag-j-reset', 'cx-q-frag-popcount', 'cx-q-frag-match-rec', 'cx-q-frag-euclid', 'cx-q-frag-blocks', 'cx-q-frag-fill-loglog'] },
  ],
}

export const estimatingRuntime: Page = {
  id: 'estimating-runtime',
  title: 'From constraints to complexity: estimating running time',
  summary: 'Turn the input limits into an operation budget, account for language speed, multiple test cases and memory — and measure growth empirically with the doubling test.',
  minutes: 18,
  blocks: [
    {
      t: 'md',
      md: `
        Before writing a line of code, a strong candidate already knows which complexity will pass. The input limits in a problem statement are a **hint from the setter**: they are chosen so that the intended solution fits and slower ones do not.

        ## The operation budget

        A modern judge core executes on the order of **$10^8$–$10^9$ simple operations per second** in compiled code. The safe planning number is **$10^8$ per second for C++**:

        | language | rough budget per second | notes |
        |---|---|---|
        | C / C++ | $10^8$ – $5\\cdot10^8$ | tight loops over arrays can do more |
        | Java | $\\sim 5\\cdot10^7$ – $2\\cdot10^8$ | after JIT warm-up; boxing (\`Integer\`) is slow |
        | JavaScript (Node) | $\\sim 5\\cdot10^7$ – $2\\cdot10^8$ | typed arrays help |
        | Python | $\\sim 10^6$ – $10^7$ | every operation is an interpreted bytecode; use built-ins |

        What counts as "simple" matters: an addition on registers costs under a nanosecond; a **cache miss** costs ~100 ns; a hash-map lookup ~20–100 ns; an integer division or modulo ~20–40 cycles. A "10⁸ operations" estimate made of hash lookups is really several seconds.

        ## The constraints table, extended

        | largest n | budget-safe complexity | typical technique |
        |---|---|---|
        | 10–12 | $O(n!)$, $O(n!\\cdot n)$ | permutations |
        | 18–22 | $O(2^n \\cdot n)$ | subsets, bitmask DP |
        | 35–45 | $O(2^{n/2})$ | meet in the middle |
        | 80–100 | $O(n^4)$ | four nested loops, some DP |
        | 300–500 | $O(n^3)$ | Floyd–Warshall, interval DP |
        | 2000–5000 | $O(n^2)$, $O(n^2 \\log n)$ | all pairs, 2D DP |
        | $10^5$ | $O(n\\sqrt n)$ | sqrt decomposition, Mo's algorithm |
        | $10^5$–$10^6$ | $O(n \\log n)$, $O(n \\log^2 n)$ | sorting, heaps, segment trees, binary search |
        | $10^7$–$10^8$ | $O(n)$ | linear scans, sieve, prefix sums |
        | $10^9$–$10^{12}$ | $O(\\sqrt n)$, $O(\\log n)$ | trial division, maths |
        | $10^{18}$ | $O(\\log n)$, $O(1)$ | fast power, binary search on the answer, formulas |
      `,
    },
    {
      t: 'steps',
      title: 'Estimate in four steps',
      items: [
        { title: 'Write the complexity with every variable', md: 'e.g. $O((n + q)\\log n)$, not just "n log n".' },
        { title: 'Plug in the maximum values', md: '$n = q = 2\\cdot10^5$: $(4\\cdot10^5)\\cdot 18 \\approx 7\\cdot 10^6$.' },
        { title: 'Multiply by the constant you expect', md: 'A segment tree visits ~4 log n nodes per query, not log n: say $3\\cdot10^7$.' },
        { title: 'Compare with the budget', md: '$3\\cdot10^7 \\ll 10^8$: comfortable in C++/Java, risky in Python. Under ~10⁸: go. Around 10⁹: think again.' },
      ],
    },
    {
      t: 'md',
      md: `
        ## Multiple test cases: read the *sum* constraint

        Statements often say "$t \\le 10^4$ test cases, $n \\le 2\\cdot10^5$, **and the sum of n over all test cases is at most $2\\cdot10^5$**". That last sentence means your total work is bounded by the sum — as long as **each test costs time proportional to its own $n$**.

        The classic mistake: clearing a global array of size $2\\cdot10^5$ at the start of each test. That is $10^4 \\times 2\\cdot10^5 = 2\\cdot10^9$ operations of pure \`memset\`, on tests that are mostly tiny. Clear only the first $n$ entries, or use local containers sized to $n$.

        Similarly, a per-test $O(\\text{maxValue})$ step (sieving to $10^6$ inside each test) multiplies by $t$. Precompute once, outside the test loop.

        ## Memory is a budget too

        A typical limit is 256 MB:

        | data | bytes each | how many fit in 256 MB |
        |---|---|---|
        | \`int\` / \`int32\` | 4 | $\\approx 6.7\\cdot10^7$ |
        | \`long long\` / \`long\` | 8 | $\\approx 3.3\\cdot10^7$ |
        | \`bool\` array (C++) | 1 | $2.7\\cdot10^8$ |
        | bitset | 1/8 | $2\\cdot10^9$ |
        | Java \`Integer\` in a collection | ~16–20 + reference | $\\approx 10^7$ |
        | Python int in a list | ~28 + 8 | $\\approx 7\\cdot10^6$ |

        A $5000 \\times 5000$ table of \`int\` is 100 MB — allowed; of \`long long\`, 200 MB — borderline; $10^4 \\times 10^4$ ints is 400 MB — too much: you need a rolling array (keep two rows).

        ## Measuring growth: the doubling test

        Sometimes you have code but no clean analysis. Run it at $n$, $2n$, $4n$, … and look at the ratio of times. If $T(n) \\approx a n^b$, then
        $$ \\frac{T(2n)}{T(n)} \\approx \\frac{a (2n)^b}{a n^b} = 2^b, \\qquad b \\approx \\log_2 \\frac{T(2n)}{T(n)}. $$
        A ratio near 2 means linear, 4 means quadratic, 8 cubic; slightly above 2 suggests $n \\log n$. For exponential code, even $n \\to n+1$ doubles the time.
      `,
    },
    { t: 'viz', algo: 'cx-doubling', caption: 'Switch the algorithm to n, n log n or n^3 and watch the log-ratio settle at the exponent.' },
    {
      t: 'code',
      title: 'A doubling-test harness',
      note: 'run(n) is whatever you want to measure. Use inputs large enough that each run takes at least ~0.1 s, and repeat to smooth out noise.',
      code: {
        cpp: `#include <bits/stdc++.h>
using namespace std;
void run(int n);   // the code under test

int main() {
    auto seconds = [](int n) {
        auto s = chrono::steady_clock::now();
        run(n);
        return chrono::duration<double>(chrono::steady_clock::now() - s).count();
    };
    double prev = seconds(1000);
    for (int n = 2000; n <= 512000; n *= 2) {
        double cur = seconds(n);
        printf("n=%7d  %.3fs  ratio %.2f  b ~ %.2f\\n", n, cur, cur / prev, log2(cur / prev));
        prev = cur;
    }
}`,
        java: `public class Doubling {
    static void run(int n) { /* the code under test */ }
    static double seconds(int n) {
        long s = System.nanoTime();
        run(n);
        return (System.nanoTime() - s) / 1e9;
    }
    public static void main(String[] args) {
        double prev = seconds(1000);
        for (int n = 2000; n <= 512000; n *= 2) {
            double cur = seconds(n);
            System.out.printf("n=%7d  %.3fs  ratio %.2f  b ~ %.2f%n", n, cur, cur / prev, Math.log(cur / prev) / Math.log(2));
            prev = cur;
        }
    }
}`,
        python: `import math, time

def run(n): ...                      # the code under test

def seconds(n):
    s = time.perf_counter()
    run(n)
    return time.perf_counter() - s

prev = seconds(1000)
n = 2000
while n <= 512000:
    cur = seconds(n)
    print(f"n={n:7d}  {cur:.3f}s  ratio {cur / prev:.2f}  b ~ {math.log2(cur / prev):.2f}")
    prev, n = cur, 2 * n`,
        js: `function run(n) { /* the code under test */ }
function seconds(n) {
  const s = performance.now();
  run(n);
  return (performance.now() - s) / 1000;
}
let prev = seconds(1000);
for (let n = 2000; n <= 512000; n *= 2) {
  const cur = seconds(n);
  console.log(\`n=\${n}  \${cur.toFixed(3)}s  ratio \${(cur / prev).toFixed(2)}  b ~ \${Math.log2(cur / prev).toFixed(2)}\`);
  prev = cur;
}`,
        c: `#include <stdio.h>
#include <math.h>
#include <time.h>
void run(int n);   /* the code under test */

static double seconds(int n) {
    clock_t s = clock();
    run(n);
    return (double)(clock() - s) / CLOCKS_PER_SEC;
}
int main(void) {
    double prev = seconds(1000);
    for (int n = 2000; n <= 512000; n *= 2) {
        double cur = seconds(n);
        printf("n=%7d  %.3fs  ratio %.2f  b ~ %.2f\\n", n, cur, cur / prev, log2(cur / prev));
        prev = cur;
    }
    return 0;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Estimates that go wrong',
      md: `- Forgetting a variable: "O(n log n)" when it is really O(n log n + q·n).
- Using the average when the judge uses the worst case (sorted input for a naive quicksort, anti-hash tests for unordered_map).
- Counting Python like C++: 10⁸ Python operations is a minute, not a second.
- Recursion depth: 10⁶ levels of recursion overflows a default stack in every language.`,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'In interviews',
      md: 'Ask for the constraints if they are not given ("how large can n get?"). Then say it: "n up to 10⁵, so O(n²) is 10¹⁰ — too slow; I am aiming for O(n log n)." It shows you choose the algorithm from the requirements instead of guessing.',
    },
    {
      t: 'md',
      md: `
        ## When the estimate says no: change the algorithm

        If the estimate lands far above the budget, shaving constants will not save you — the growth rate has to change. Two transformations you will use constantly:

        - **Sort + two pointers** replaces an $O(n^2)$ scan over all pairs with $O(n\\log n)$: after sorting, one comparison can settle a whole block of pairs at once.
        - **Precompute + answer** replaces $O(n)$ work per query with $O(1)$: $q$ range sums cost $O(n + q)$ with prefix sums instead of $O(nq)$.
      `,
    },
    { t: 'viz', algo: 'cx-pairs-two-pointer', caption: 'Each time a[lo] + a[hi] ≤ k, all hi − lo pairs starting at lo are counted in one step. The meter compares the work with n²/2.' },
    { t: 'viz', algo: 'cx-prefix-queries', caption: 'The naive meter grows by the range length on every query; the prefix-sum meter pays n once and then 1 per query.' },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-est-budget', 'cx-q-est-sum-n', 'cx-q-est-memory', 'cx-q-est-doubling', 'cx-q-est-mitm', 'cx-q-est-python', 'cx-q-est-nsqrt'] },
  ],
}
