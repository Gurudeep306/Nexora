import type { Page } from '../../../types'

export const inclusionExclusion: Page = {
  id: 'inclusion-exclusion',
  title: 'Inclusion–exclusion: counting by over-counting and correcting',
  summary: 'Add the sets, subtract the pairwise overlaps, add back the triples — proved, then used for divisibility counts, coprime counts, derangements, surjections and the Möbius function.',
  minutes: 22,
  blocks: [
    {
      t: 'md',
      md: `
        How many numbers in $1 \\dots 100$ are divisible by 2, 3 or 5?

        A loop that tests each number works for $n = 100$, but the same question with $n = 10^{18}$ would run for centuries. We need a formula. The tempting one is "multiples of 2, plus multiples of 3, plus multiples of 5":

        $$\\left\\lfloor \\tfrac{100}{2} \\right\\rfloor + \\left\\lfloor \\tfrac{100}{3} \\right\\rfloor + \\left\\lfloor \\tfrac{100}{5} \\right\\rfloor = 50 + 33 + 20 = 103.$$

        That is more than 100 numbers — impossible. The sum counts 6 twice (once as a multiple of 2, once of 3) and 30 three times. **Inclusion–exclusion is the bookkeeping that turns an over-count into an exact count:** add the single sets, subtract what was counted twice, add back what was subtracted too often, and so on.

        ## Two and three sets

        For two finite sets, the elements of $A \\cap B$ are counted once in $|A|$ and once in $|B|$, so

        $$|A \\cup B| = |A| + |B| - |A \\cap B|.$$

        For three sets, after subtracting the three pairwise intersections, an element of $A \\cap B \\cap C$ has been added 3 times and subtracted 3 times — it is counted 0 times, so we add the triple intersection back:

        $$|A \\cup B \\cup C| = |A| + |B| + |C| - |A\\cap B| - |A \\cap C| - |B \\cap C| + |A \\cap B \\cap C|.$$

        For the opening question, let $A_d$ be the multiples of $d$ in $1\\dots100$. Multiples of both 2 and 3 are exactly the multiples of 6, so $|A_2 \\cap A_3| = \\lfloor 100/6 \\rfloor = 16$, and so on:

        $$50 + 33 + 20 - 16 - 10 - 6 + 3 = 74.$$

        ## The general formula

        For finite sets $A_1, \\dots, A_k$ and a non-empty $S \\subseteq \\{1,\\dots,k\\}$, write $A_S = \\bigcap_{i \\in S} A_i$. Then

        $$\\Big|\\bigcup_{i=1}^{k} A_i\\Big| = \\sum_{\\emptyset \\ne S \\subseteq \\{1..k\\}} (-1)^{|S|+1}\\, |A_S|.$$

        Odd-sized subsets are added, even-sized subsets subtracted. There are $2^k - 1$ terms.

        **Proof.** Both sides count elements, so it is enough to show every element contributes exactly what it should: 1 if it lies in the union, 0 otherwise.

        - An element in **no** $A_i$ lies in no $A_S$; it contributes 0 to the right side. ✓
        - Take an element $x$ that lies in exactly $j \\ge 1$ of the sets. It lies in $A_S$ exactly when $S$ is a subset of those $j$ indices. There are $\\binom{j}{t}$ such subsets of size $t$, each contributing $(-1)^{t+1}$, so $x$ contributes
        $$\\sum_{t=1}^{j} (-1)^{t+1}\\binom{j}{t} \\;=\\; 1 - \\sum_{t=0}^{j} (-1)^{t}\\binom{j}{t} \\;=\\; 1 - (1 - 1)^j \\;=\\; 1 - 0 \\;=\\; 1,$$
        using the binomial theorem $(1 + y)^j = \\sum_t \\binom jt y^t$ at $y = -1$, and $j \\ge 1$ so $0^j = 0$. ✓

        So the right side counts each element of the union exactly once. $\\blacksquare$

        **The complement form** is often more convenient. With a universe $U$ and $A_\\emptyset = U$, the number of elements in *none* of the sets is

        $$\\Big|U \\setminus \\bigcup A_i\\Big| = \\sum_{S \\subseteq \\{1..k\\}} (-1)^{|S|}\\, |A_S|.$$

        It is $|U|$ minus the union, with every sign flipped. Most "count the objects with no bad property" problems use this form: let $A_i$ be the objects with bad property $i$, and you only ever need to count objects that have a given *set* of bad properties — usually much easier than counting objects that avoid them.
      `,
    },
    {
      t: 'viz',
      algo: 'math-pie-count-once',
      caption: 'Each term adds or subtracts 1 for every multiple of its lcm. Watch 6 and 30: after the singles they are counted 2 and 3 times; the pairs and the triple bring every one back to exactly 1.',
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Why the signs alternate',
      md: 'The alternating sum $\\sum_{t \\ge 0} (-1)^t \\binom{j}{t}$ is 0 for every $j \\ge 1$: a set with at least one element has as many even-sized subsets as odd-sized ones (toggle a fixed element to pair them up). That single fact is all of inclusion–exclusion.',
    },
    {
      t: 'md',
      md: `
        ## Pattern 1: numbers divisible by at least one of $d_1, \\dots, d_k$

        Let $A_i$ = multiples of $d_i$ in $[1, n]$. A number is in $A_S$ when it is divisible by every $d_i$, $i \\in S$, i.e. by their **least common multiple**:

        $$|A_S| = \\left\\lfloor \\frac{n}{\\operatorname{lcm}(d_i : i \\in S)} \\right\\rfloor.$$

        **Use the lcm, not the product.** For $d = \\{4, 6\\}$ the common multiples are multiples of 12, not of 24. The two agree only when the $d_i$ are pairwise coprime (for example, distinct primes).

        To visit every subset, loop a bitmask from $1$ to $2^k - 1$: bit $i$ set means $d_i \\in S$, and the parity of the popcount gives the sign. The whole count costs $O(2^k \\cdot k \\log D)$ — independent of $n$, so $n = 10^{18}$ is no problem. For $k \\le 20$ this is about $2 \\cdot 10^7$ operations.

        **Overflow.** The lcm of a few large numbers grows past $2^{63}$ quickly. Once the lcm exceeds $n$ the term is $0$, so cap it: before computing $L' = \\frac{L}{\\gcd(L, d)} \\cdot d$, test $\\frac{L}{\\gcd(L,d)} > \\lfloor n/d \\rfloor$ and, if so, treat the lcm as "more than $n$". The test is the overflow-safe comparison from the Number patterns page: for positive integers, $a \\cdot b > c \\iff a > \\lfloor c / b \\rfloor$.
      `,
    },
    {
      t: 'viz',
      algo: 'math-pie-bitmask',
      caption: 'Divisors 4, 6, 10, 15 are not coprime: {4, 6} has lcm 12, not 24. Try n = 10¹² with divisors 999983 999979 999961 to see the cap stop an lcm far above n.',
    },
    {
      t: 'md',
      md: `
        **Pruning with DFS.** When many lcms exceed $n$, enumerate subsets by depth-first search over the divisors in increasing order and stop extending a subset as soon as its lcm passes $n$ — every superset has an even larger lcm and contributes 0. With the 25 primes below 100 and $n = 10^6$ this visits 15 849 subsets instead of $2^{25} - 1 \\approx 3.4 \\cdot 10^7$.

        ## Pattern 2: numbers coprime to $m$, and Euler's φ

        How many $x \\in [1, n]$ have $\\gcd(x, m) = 1$? A number shares a factor with $m$ exactly when some **prime** $p \\mid m$ divides it. So factor $m$ into its distinct primes $p_1, \\dots, p_r$ and use the complement form with $A_i$ = multiples of $p_i$:

        $$\\#\\{x \\le n : \\gcd(x, m) = 1\\} = \\sum_{S \\subseteq \\{1..r\\}} (-1)^{|S|} \\left\\lfloor \\frac{n}{\\prod_{i \\in S} p_i} \\right\\rfloor.$$

        Distinct primes are pairwise coprime, so here the lcm *is* the product. And $r$ is tiny: the product of the first 15 primes is about $6.1 \\cdot 10^{17}$, so **any $m \\le 10^{18}$ has at most 15 distinct prime factors** — at most $2^{15} = 32768$ terms.

        *Worked example.* $n = 100$, $m = 12 = 2^2 \\cdot 3$. Primes $\\{2, 3\\}$: $100 - 50 - 33 + 16 = 33$.

        **Link to φ.** Put $n = m$. Every $\\lfloor m / \\prod p \\rfloor$ is exact, and the sum factors:

        $$\\varphi(m) = \\sum_{S} (-1)^{|S|} \\frac{m}{\\prod_{i\\in S} p_i} = m \\prod_{i=1}^{r}\\left(1 - \\frac{1}{p_i}\\right),$$

        because expanding the product $\\prod (1 - 1/p_i)$ produces exactly one term $(-1)^{|S|}/\\prod_{i \\in S} p_i$ per subset $S$. Euler's product formula *is* inclusion–exclusion.

        For a range $[L, R]$ use $f(R) - f(L - 1)$, where $f(n)$ counts $[1, n]$ — the standard prefix trick.
      `,
    },
    {
      t: 'code',
      title: 'Count x in [1, n] coprime to m',
      note: 'Trial division finds the distinct primes of m in O(√m); the inclusion–exclusion loop is O(2^r · r) with r ≤ 15. The product of a subset of m’s distinct primes divides m, so it never overflows.',
      code: {
        cpp: `long long coprimeCount(long long n, long long m) {   // m ≥ 1
    vector<long long> ps;                               // distinct primes of m
    for (long long p = 2; p * p <= m; p++)
        if (m % p == 0) { ps.push_back(p); while (m % p == 0) m /= p; }
    if (m > 1) ps.push_back(m);
    int r = ps.size();
    long long res = 0;
    for (int mask = 0; mask < (1 << r); mask++) {       // mask 0: the whole range
        long long prod = 1; int bits = 0;
        for (int i = 0; i < r; i++) if (mask >> i & 1) { prod *= ps[i]; bits++; }
        res += (bits % 2 ? -1 : 1) * (n / prod);
    }
    return res;
}`,
        java: `static long coprimeCount(long n, long m) {            // m ≥ 1
    java.util.List<Long> ps = new java.util.ArrayList<>();
    for (long p = 2; p * p <= m; p++)
        if (m % p == 0) { ps.add(p); while (m % p == 0) m /= p; }
    if (m > 1) ps.add(m);
    int r = ps.size();
    long res = 0;
    for (int mask = 0; mask < (1 << r); mask++) {       // mask 0: the whole range
        long prod = 1; int bits = 0;
        for (int i = 0; i < r; i++) if ((mask >> i & 1) == 1) { prod *= ps.get(i); bits++; }
        res += (bits % 2 == 1 ? -1 : 1) * (n / prod);
    }
    return res;
}`,
        python: `def coprime_count(n, m):                 # m >= 1
    ps, p = [], 2
    while p * p <= m:
        if m % p == 0:
            ps.append(p)
            while m % p == 0:
                m //= p
        p += 1
    if m > 1:
        ps.append(m)
    res = 0
    for mask in range(1 << len(ps)):     # mask 0: the whole range
        prod, bits = 1, 0
        for i, q in enumerate(ps):
            if mask >> i & 1:
                prod *= q; bits += 1
        res += (-1) ** bits * (n // prod)
    return res`,
        js: `function coprimeCount(n, m) {             // n, m below 2^53
  const ps = [];
  for (let p = 2; p * p <= m; p++)
    if (m % p === 0) { ps.push(p); while (m % p === 0) m /= p; }
  if (m > 1) ps.push(m);
  let res = 0;
  for (let mask = 0; mask < (1 << ps.length); mask++) {   // mask 0: the whole range
    let prod = 1, bits = 0;
    ps.forEach((q, i) => { if (mask >> i & 1) { prod *= q; bits++; } });
    res += (bits % 2 ? -1 : 1) * Math.floor(n / prod);
  }
  return res;
}`,
        c: `long long coprimeCount(long long n, long long m) {   /* m >= 1 */
    long long ps[64]; int r = 0;
    for (long long p = 2; p * p <= m; p++)
        if (m % p == 0) { ps[r++] = p; while (m % p == 0) m /= p; }
    if (m > 1) ps[r++] = m;
    long long res = 0;
    for (int mask = 0; mask < (1 << r); mask++) {       /* mask 0: the whole range */
        long long prod = 1; int bits = 0;
        for (int i = 0; i < r; i++) if (mask >> i & 1) { prod *= ps[i]; bits++; }
        res += (bits % 2 ? -1 : 1) * (n / prod);
    }
    return res;
}`,
      },
    },
    { t: 'check', title: 'Quick check', ids: ['math-q-pie-74', 'math-q-pie-lcm-not-product'] },
    {
      t: 'md',
      md: `
        ## Pattern 3: derangements

        $n$ guests check their hats; the hats come back in a uniformly random order. In how many orders does **nobody** get their own hat? A permutation $p$ of $\\{1..n\\}$ with no **fixed point** ($p(i) \\ne i$ for all $i$) is a **derangement**; their number is $D(n)$.

        **Derivation by inclusion–exclusion.** Universe: all $n!$ permutations. Bad property $i$: $p(i) = i$. For a set $S$ of $t$ positions, the permutations fixing all of $S$ are free on the other $n - t$ positions: $|A_S| = (n - t)!$. There are $\\binom{n}{t}$ such $S$. The complement form gives

        $$D(n) = \\sum_{t=0}^{n} (-1)^t \\binom{n}{t} (n-t)! = n! \\sum_{t=0}^{n} \\frac{(-1)^t}{t!}.$$

        The sum is the Taylor series of $e^{-1}$ cut off after $n$ terms, so **a random permutation is a derangement with probability about $1/e \\approx 36.8\\%$** — almost independent of $n$. In fact the tail of the alternating series is smaller than $\\frac{1}{(n+1)!}$, so $|D(n) - n!/e| < \\frac{1}{n+1} \\le \\frac12$ and $D(n)$ is $n!/e$ rounded to the nearest integer for $n \\ge 1$.

        | $n$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
        |---|---|---|---|---|---|---|---|---|---|
        | $D(n)$ | 1 | 0 | 1 | 2 | 9 | 44 | 265 | 1854 | 14833 |

        **The recurrence** $D(n) = (n-1)\\big(D(n-1) + D(n-2)\\big)$ for $n \\ge 2$, with $D(0) = 1$, $D(1) = 0$.

        *Proof.* In a derangement, element 1 goes to some position $j \\ne 1$: $n - 1$ choices, and by symmetry each choice gives the same count. Fix $j$ and ask where element $j$ goes.

        1. **$j$ goes to position 1** — 1 and $j$ swap. The other $n - 2$ elements must form a derangement among themselves: $D(n-2)$ ways.
        2. **$j$ does not go to position 1.** Now the $n - 1$ elements other than 1 must fill the $n - 1$ positions other than $j$, with each element $i \\ne j$ avoiding position $i$ and element $j$ avoiding position 1. Relabel position 1 as "$j$'s forbidden position": this is exactly a derangement of $n - 1$ elements, $D(n-1)$ ways.

        The cases are disjoint and cover everything, so each $j$ gives $D(n-1) + D(n-2)$. $\\blacksquare$

        An equivalent one-term form, $D(n) = n\\,D(n-1) + (-1)^n$, follows from the sum formula by peeling off its last term.
      `,
    },
    {
      t: 'viz',
      algo: 'math-pie-derange',
      caption: 'Each D(n) uses the two values above it (the arrows). The last column D(n)/n! locks onto 0.3679 ≈ 1/e by n = 7.',
    },
    {
      t: 'md',
      md: `
        **Variants that interviews and contests love:**

        - *Exactly $k$ fixed points:* choose the fixed ones, derange the rest — $\\binom{n}{k} D(n-k)$.
        - *Secret Santa / gift exchange:* "nobody draws themselves" is a derangement; the probability of a valid draw is about $1/e$, which is why "redraw until valid" takes about $e \\approx 2.7$ attempts on average (a geometric distribution — next page).
        - *Mod a prime:* the recurrence needs only additions and multiplications, so it works directly mod $10^9 + 7$ in $O(n)$.

        ## Pattern 4: surjections (onto functions)

        How many functions $f: \\{1..n\\} \\to \\{1..k\\}$ hit every value? (Equivalently: distribute $n$ distinct balls into $k$ distinct boxes with no box empty.) Bad property $i$: value $i$ is missed. Functions missing every value in a set $S$ of size $j$ map into the other $k - j$ values: $(k - j)^n$ of them. So

        $$\\operatorname{Surj}(n, k) = \\sum_{j=0}^{k} (-1)^j \\binom{k}{j} (k - j)^n.$$

        *Worked example,* $n = 4$, $k = 3$: $3^4 - 3 \\cdot 2^4 + 3 \\cdot 1^4 - 0 = 81 - 48 + 3 = 36$.

        Dividing by $k!$ (the boxes become identical) gives the Stirling number of the second kind: $S(n, k) = \\operatorname{Surj}(n,k)/k!$, the number of ways to split $n$ labelled items into $k$ non-empty unlabelled groups. Here $S(4, 3) = 6$ — choose which two items share a group.
      `,
    },
    {
      t: 'code',
      title: 'Surjections mod a prime p (p > k)',
      note: 'C(k, j) is built incrementally: C(k, j+1) = C(k, j) · (k − j) / (j + 1), the division done with a Fermat inverse. O(k log n) overall. 0⁰ is taken as 1, so Surj(0, 0) = 1.',
      code: {
        cpp: `long long power(long long b, long long e, long long p) {
    long long r = 1 % p; b %= p;
    for (; e > 0; e >>= 1, b = b * b % p) if (e & 1) r = r * b % p;
    return r;
}
long long surjections(long long n, int k, long long p) {
    long long res = 0, c = 1;                          // c = C(k, j)
    for (int j = 0; j <= k; j++) {
        long long term = c * power(k - j, n, p) % p;
        res = (j % 2 ? res - term + p : res + term) % p;
        c = c * ((k - j) % p) % p * power(j + 1, p - 2, p) % p;   // C(k, j + 1)
    }
    return res;
}`,
        java: `static long power(long b, long e, long p) {
    long r = 1 % p; b %= p;
    for (; e > 0; e >>= 1, b = b * b % p) if ((e & 1) == 1) r = r * b % p;
    return r;
}
static long surjections(long n, int k, long p) {      // p < 2^31 so products fit in long
    long res = 0, c = 1;                               // c = C(k, j)
    for (int j = 0; j <= k; j++) {
        long term = c * power(k - j, n, p) % p;
        res = (j % 2 == 1 ? res - term + p : res + term) % p;
        c = c * ((k - j) % p) % p * power(j + 1, p - 2, p) % p;   // C(k, j + 1)
    }
    return res;
}`,
        python: `def surjections(n, k, p):
    res, c = 0, 1                                      # c = C(k, j)
    for j in range(k + 1):
        term = c * pow(k - j, n, p) % p
        res = (res - term if j % 2 else res + term) % p
        c = c * (k - j) % p * pow(j + 1, p - 2, p) % p     # C(k, j + 1)
    return res`,
        js: `function power(b, e, p) {                    // BigInt arguments
  let r = 1n % p; b %= p;
  for (; e > 0n; e >>= 1n, b = b * b % p) if (e & 1n) r = r * b % p;
  return r;
}
function surjections(n, k, p) {               // numbers in, BigInt arithmetic inside
  const P = BigInt(p), N = BigInt(n);
  let res = 0n, c = 1n;                       // c = C(k, j)
  for (let j = 0; j <= k; j++) {
    const term = c * power(BigInt(k - j), N, P) % P;
    res = (j % 2 ? res - term + P : res + term) % P;
    c = c * BigInt(k - j) % P * power(BigInt(j + 1), P - 2n, P) % P;   // C(k, j + 1)
  }
  return res;
}`,
        c: `long long power(long long b, long long e, long long p) {
    long long r = 1 % p; b %= p;
    for (; e > 0; e >>= 1, b = b * b % p) if (e & 1) r = r * b % p;
    return r;
}
long long surjections(long long n, int k, long long p) {
    long long res = 0, c = 1;                          /* c = C(k, j) */
    for (int j = 0; j <= k; j++) {
        long long term = c * power(k - j, n, p) % p;
        res = (j % 2 ? res - term + p : res + term) % p;
        c = c * ((k - j) % p) % p * power(j + 1, p - 2, p) % p;   /* C(k, j + 1) */
    }
    return res;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Pattern 5: the Möbius function — counting coprime pairs

        How many pairs $(a, b)$ with $1 \\le a, b \\le n$ have $\\gcd(a, b) = 1$? With $n = 10^7$ there are $10^{14}$ pairs — far too many to test.

        Use inclusion–exclusion over primes: bad property $p$ = "$p$ divides both $a$ and $b$". Pairs that are bad for every prime in a set $S$ are pairs where $d = \\prod_{p \\in S} p$ divides both: $\\lfloor n/d \\rfloor^2$ of them. Every squarefree $d$ is the product of exactly one set of primes, so

        $$\\#\\text{coprime pairs} = \\sum_{d=1}^{n} \\mu(d) \\left\\lfloor \\frac nd \\right\\rfloor^2, \\qquad \\mu(d) = \\begin{cases} 1 & d = 1 \\\\ (-1)^r & d \\text{ is a product of } r \\text{ distinct primes} \\\\ 0 & p^2 \\mid d \\text{ for some prime } p.\\end{cases}$$

        $\\mu$ is the **Möbius function**: it is nothing but the inclusion–exclusion sign attached to each squarefree $d$, with $0$ for the non-squarefree numbers that never appear as a product of a *set* of primes.

        **The key identity** $\\sum_{d \\mid m} \\mu(d) = [m = 1]$. *Proof:* if $m > 1$ has $r \\ge 1$ distinct primes, the divisors with $\\mu \\ne 0$ are the products of subsets of those primes, so the sum is $\\sum_t \\binom rt (-1)^t = 0$; for $m = 1$ it is $\\mu(1) = 1$. This lets you replace the condition $\\gcd(a,b) = 1$ by a sum:

        $$\\sum_{a,b \\le n} [\\gcd(a,b) = 1] = \\sum_{a,b \\le n}\\; \\sum_{d \\mid \\gcd(a,b)} \\mu(d) = \\sum_{d=1}^n \\mu(d) \\cdot \\#\\{(a,b): d \\mid a, d \\mid b\\} = \\sum_{d=1}^n \\mu(d) \\left\\lfloor \\frac nd \\right\\rfloor^2.$$

        Swapping the order of summation — "for each $d$, which pairs does it touch?" — is the move to remember.

        *Worked example,* $n = 4$: $\\mu(1)\\cdot 16 + \\mu(2)\\cdot 4 + \\mu(3)\\cdot 1 + \\mu(4)\\cdot 1 = 16 - 4 - 1 + 0 = 11$. Listing them: $(1, \\cdot)$ gives 4, $(\\cdot, 1)$ adds 3 more, plus $(2,3), (3,2), (3,4), (4,3)$ — 11. ✓

        A **linear sieve** computes $\\mu(1..n)$ in $O(n)$: when $i \\cdot p$ is first produced with $p$ its smallest prime, $\\mu(i p) = 0$ if $p \\mid i$ (now $p^2$ divides it) and $-\\mu(i)$ otherwise (one more distinct prime). Since $\\lfloor n/d \\rfloor$ takes only $O(\\sqrt n)$ distinct values (Number patterns page), the final sum can also be done in $O(\\sqrt n)$ blocks given prefix sums of $\\mu$.
      `,
    },
    {
      t: 'code',
      title: 'Möbius by linear sieve, then coprime pairs in [1, n]²',
      code: {
        cpp: `long long coprimePairs(int n) {
    vector<int> mu(n + 1, 0), primes;
    vector<bool> comp(n + 1, false);
    mu[1] = 1;
    for (int i = 2; i <= n; i++) {
        if (!comp[i]) { primes.push_back(i); mu[i] = -1; }
        for (int p : primes) {
            if ((long long) i * p > n) break;
            comp[i * p] = true;
            if (i % p == 0) { mu[i * p] = 0; break; }      // p² divides i·p
            mu[i * p] = -mu[i];                            // one more distinct prime
        }
    }
    long long res = 0;
    for (int d = 1; d <= n; d++) res += (long long) mu[d] * (n / d) * (n / d);
    return res;
}`,
        java: `static long coprimePairs(int n) {
    int[] mu = new int[n + 1], primes = new int[n + 1];
    boolean[] comp = new boolean[n + 1];
    int cnt = 0;
    mu[1] = 1;
    for (int i = 2; i <= n; i++) {
        if (!comp[i]) { primes[cnt++] = i; mu[i] = -1; }
        for (int k = 0; k < cnt; k++) {
            int p = primes[k];
            if ((long) i * p > n) break;
            comp[i * p] = true;
            if (i % p == 0) { mu[i * p] = 0; break; }      // p² divides i·p
            mu[i * p] = -mu[i];                            // one more distinct prime
        }
    }
    long res = 0;
    for (int d = 1; d <= n; d++) res += (long) mu[d] * (n / d) * (n / d);
    return res;
}`,
        python: `def coprime_pairs(n):
    mu = [0] * (n + 1); mu[1] = 1
    comp = [False] * (n + 1); primes = []
    for i in range(2, n + 1):
        if not comp[i]:
            primes.append(i); mu[i] = -1
        for p in primes:
            if i * p > n:
                break
            comp[i * p] = True
            if i % p == 0:
                mu[i * p] = 0              # p² divides i·p
                break
            mu[i * p] = -mu[i]             # one more distinct prime
    return sum(mu[d] * (n // d) ** 2 for d in range(1, n + 1))`,
        js: `function coprimePairs(n) {
  const mu = new Int8Array(n + 1), comp = new Uint8Array(n + 1), primes = [];
  mu[1] = 1;
  for (let i = 2; i <= n; i++) {
    if (!comp[i]) { primes.push(i); mu[i] = -1; }
    for (const p of primes) {
      if (i * p > n) break;
      comp[i * p] = 1;
      if (i % p === 0) { mu[i * p] = 0; break; }       // p² divides i·p
      mu[i * p] = -mu[i];                              // one more distinct prime
    }
  }
  let res = 0;                                         // exact while n² < 2^53
  for (let d = 1; d <= n; d++) { const q = Math.floor(n / d); res += mu[d] * q * q; }
  return res;
}`,
        c: `long long coprimePairs(int n) {
    int *mu = calloc(n + 1, sizeof *mu), *primes = malloc((n + 1) * sizeof *primes);
    char *comp = calloc(n + 1, 1);
    int cnt = 0;
    mu[1] = 1;
    for (int i = 2; i <= n; i++) {
        if (!comp[i]) { primes[cnt++] = i; mu[i] = -1; }
        for (int k = 0; k < cnt; k++) {
            int p = primes[k];
            if ((long long) i * p > n) break;
            comp[i * p] = 1;
            if (i % p == 0) { mu[i * p] = 0; break; }      /* p² divides i·p */
            mu[i * p] = -mu[i];                            /* one more distinct prime */
        }
    }
    long long res = 0;
    for (int d = 1; d <= n; d++) res += (long long) mu[d] * (n / d) * (n / d);
    free(mu); free(primes); free(comp);
    return res;
}`,
      },
    },
    {
      t: 'complexity',
      title: 'Inclusion–exclusion patterns',
      rows: [
        { op: 'Divisible by any of k numbers, in [1, n]', time: 'O(2ᵏ · k log D)', space: 'O(k)', note: 'independent of n; cap the lcm at n' },
        { op: 'Coprime to m, in [1, n]', time: 'O(√m + 2ʳ · r)', space: 'O(r)', note: 'r ≤ 15 distinct primes for m ≤ 10¹⁸' },
        { op: 'Derangements D(0..n) mod p', time: 'O(n)', space: 'O(n) or O(1)', note: 'recurrence; no inverses needed' },
        { op: 'Surjections n → k mod p', time: 'O(k log n)', space: 'O(1)', note: 'k + 1 terms, a fast power each' },
        { op: 'Möbius μ(1..n) by linear sieve', time: 'O(n)', space: 'O(n)', note: 'each composite produced once' },
        { op: 'Coprime pairs in [1, n]²', time: 'O(n), or O(√n) per query with μ prefix sums', space: 'O(n)', note: 'Σ μ(d)·⌊n/d⌋²' },
      ],
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'The bugs people really write',
      md: `
- **Product instead of lcm** for non-coprime divisors: $\\{4, 6\\}$ overlaps on multiples of 12, not 24.
- **lcm overflow:** \`L * d\` for two numbers near $10^{10}$ wraps around silently in C++/Java/C and gives a garbage (possibly small, possibly negative) divisor. Divide first and cap at $n$.
- **Wrong sign convention:** in the *union* form odd subsets are $+$; in the *complement* ("none of the properties") form odd subsets are $-$ and the empty set contributes $+|U|$.
- **Forgetting the empty set** (or counting it in the union form, where it would add $|U|$).
- **Repeated divisors** in the input, such as $\\{2, 2, 3\\}$, give the right answer only if handled consistently — remove duplicates first; it also halves the work.
- **Ranges:** "in $[L, R]$" is $f(R) - f(L-1)$, not $f(R) - f(L)$.
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How it shows up',
      md: 'Typical phrasings: "count numbers up to 10¹⁸ divisible by at least one of these primes", "how many integers in a range are coprime to m", "the k-th number divisible by a or b" (binary search on x, count with inclusion–exclusion — LeetCode "Ugly Number III"), "count arrangements where no item is in its original place", "count strings that contain every vowel". The interviewer checks that you (1) name the bad properties, (2) can count the objects having a *given set* of properties, (3) get the signs right, and (4) notice the 2ᵏ cost — and prune when k is large.',
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-pie-range', 'math-q-pie-coprime-12', 'math-q-pie-derange-5', 'math-q-pie-surj', 'math-q-pie-signs', 'math-q-pie-mobius', 'math-q-pie-rec-fill', 'math-q-pie-exact-k'] },
  ],
}

export const probability: Page = {
  id: 'probability',
  title: 'Probability and expectation for programmers',
  summary: 'Sample spaces, conditioning, Bayes, and the one tool that solves most contest problems — linearity of expectation with indicator variables — then expected values mod p, reservoir sampling and Fisher–Yates, all proved.',
  minutes: 24,
  blocks: [
    {
      t: 'md',
      md: `
        Probability shows up in programming in two ways. **Problems ask for it:** "what is the expected number of rolls…", "print the answer as $P \\cdot Q^{-1} \\bmod 998244353$". And **algorithms use it:** randomized quicksort, hashing, treaps, random sampling, shuffling. In both cases a handful of exact tools does almost all the work, and the most important one — linearity of expectation — is a two-line proof that people still get wrong under pressure.

        ## Sample spaces and events

        A **sample space** $\\Omega$ is the set of all outcomes of an experiment; an **event** is a subset of it. For a finite space where every outcome is equally likely,

        $$P(E) = \\frac{|E|}{|\\Omega|}.$$

        Rolling two dice: $\\Omega$ is the 36 ordered pairs $(a, b)$. The event "sum is 7" is $\\{(1,6), (2,5), \\dots, (6,1)\\}$, so $P = 6/36 = 1/6$.

        **Model the outcomes so they are equally likely.** The sums $2, 3, \\dots, 12$ are 11 outcomes, but they are *not* equally likely — treating them so gives $P(\\text{sum} = 7) = 1/11$, a classic error. Ordered pairs are the right atoms.

        Three rules follow directly from counting:

        - **Complement:** $P(\\bar E) = 1 - P(E)$. "At least one six in 4 rolls" $= 1 - (5/6)^4 \\approx 0.518$.
        - **Union:** $P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$ — inclusion–exclusion from the previous page, divided by $|\\Omega|$.
        - **Union bound:** $P(A_1 \\cup \\dots \\cup A_k) \\le \\sum P(A_i)$, always. It is how hashing analyses bound "some collision happens".

        ## Conditional probability and independence

        Knowing that $B$ happened shrinks the sample space to $B$:

        $$P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}, \\qquad P(B) > 0.$$

        *Example.* Two dice show a sum of 8. What is the chance the first die is a 3? The outcomes with sum 8 are $(2,6), (3,5), (4,4), (5,3), (6,2)$ — five equally likely ones — and one has first die 3: $P = 1/5$, not $1/6$.

        Rearranged, this is the **multiplication rule** $P(A \\cap B) = P(B)\\,P(A \\mid B)$, and splitting by cases gives the **law of total probability**: if $B_1, \\dots, B_m$ partition $\\Omega$, then $P(A) = \\sum_i P(B_i)\\,P(A \\mid B_i)$.

        Events are **independent** when knowing one tells you nothing about the other: $P(A \\cap B) = P(A)\\,P(B)$. Independence is a *property you must justify*, not a default. Separate dice are independent; "the first card is an ace" and "the second card is an ace" (no replacement) are not — $P(\\text{2nd ace} \\mid \\text{1st ace}) = 3/51 \\ne 4/52$.

        **Pairwise independence is weaker than full independence.** Flip two fair coins; let $A$ = "first is heads", $B$ = "second is heads", $C$ = "exactly one is heads". Every pair is independent ($P = 1/4 = \\tfrac12 \\cdot \\tfrac12$), yet $P(A \\cap B \\cap C) = 0 \\ne 1/8$.

        ## Bayes' rule

        Flip a conditional around:

        $$P(A \\mid B) = \\frac{P(B \\mid A)\\, P(A)}{P(B)} = \\frac{P(B \\mid A)\\,P(A)}{P(B \\mid A)P(A) + P(B \\mid \\bar A)P(\\bar A)}.$$

        *Example.* A test detects a disease 99% of the time and gives a false positive 1% of the time; 1% of people have the disease. You test positive. Then

        $$P(\\text{sick} \\mid +) = \\frac{0.99 \\cdot 0.01}{0.99 \\cdot 0.01 + 0.01 \\cdot 0.99} = \\frac12.$$

        Only 50%, because healthy people are 99 times as common, so their 1% false positives are as many as the true positives. The same reasoning tells you what a Bloom filter's "maybe present" is worth when real hits are rare.
      `,
    },
    { t: 'check', title: 'Quick check', ids: ['math-q-prob-cond', 'math-q-prob-bayes'] },
    {
      t: 'md',
      md: `
        ## Random variables and expectation

        A **random variable** $X$ assigns a number to each outcome — the sum of two dice, the number of comparisons quicksort makes, the number of fixed points of a random permutation. Its **expectation** is the probability-weighted average:

        $$E[X] = \\sum_{\\omega \\in \\Omega} X(\\omega)\\,P(\\omega) = \\sum_{x} x \\cdot P(X = x).$$

        One fair die: $E = (1 + 2 + \\dots + 6)/6 = 3.5$. The expected value need not be a possible value.

        ## Linearity of expectation

        **For any random variables $X, Y$ on the same space and constants $a, b$: $E[aX + bY] = a\\,E[X] + b\\,E[Y]$ — whether or not $X$ and $Y$ are independent.**

        *Proof.* Expand the definition over outcomes:

        $$E[aX + bY] = \\sum_{\\omega} \\big(aX(\\omega) + bY(\\omega)\\big) P(\\omega) = a\\sum_\\omega X(\\omega)P(\\omega) + b\\sum_\\omega Y(\\omega)P(\\omega) = aE[X] + bE[Y].$$

        Nothing about the joint behaviour of $X$ and $Y$ was used — only that a sum can be split. By induction it holds for any finite sum $X_1 + \\dots + X_n$. $\\blacksquare$

        Contrast with products: $E[XY] = E[X]E[Y]$ **does** need independence. Let $X = Y$ = one fair coin (1 for heads): $E[XY] = E[X^2] = 1/2$, but $E[X]E[Y] = 1/4$.

        ## Indicator variables: the technique

        For an event $A$, the **indicator** $I_A$ is 1 when $A$ happens and 0 otherwise. Its expectation is a probability:

        $$E[I_A] = 1 \\cdot P(A) + 0 \\cdot P(\\bar A) = P(A).$$

        So to find the expected **count** of something, write the count as a sum of indicators — one per place the thing could happen — and add up their probabilities. You never need the distribution of the count itself, which is usually horrible.

        **Expected fixed points of a random permutation.** Let $X$ = number of $i$ with $p(i) = i$, and $I_i = [p(i) = i]$. Then $X = I_1 + \\dots + I_n$. A uniformly random permutation sends $i$ to each position with probability $1/n$, so $E[I_i] = 1/n$ and

        $$E[X] = n \\cdot \\frac1n = 1.$$

        For every $n$. The $I_i$ are dependent (if $n - 1$ points are fixed, the last one is forced), and it does not matter.
      `,
    },
    {
      t: 'viz',
      algo: 'math-prob-fixed-points',
      caption: 'Row totals jump between 0 and n — the distribution of X is irregular. Column totals are all (n−1)!. Summing by columns instead of rows is exactly what linearity of expectation does.',
    },
    {
      t: 'md',
      md: `
        More indicator classics — each is a one-liner once you pick the indicators:

        | quantity (uniform random permutation of $n$) | indicators | expectation |
        |---|---|---|
        | fixed points | $[p(i) = i]$, $n$ of them, each $\\frac1n$ | $1$ |
        | inversions (pairs $i < j$ with $p(i) > p(j)$) | one per pair, each $\\frac12$ by symmetry | $\\frac{n(n-1)}{4}$ |
        | records / "new maximum" updates when scanning left to right | $[p(i)$ is the largest of the first $i]$, probability $\\frac1i$ | $H_n = 1 + \\frac12 + \\dots + \\frac1n \\approx \\ln n$ |
        | pairs compared by randomized quicksort | $[$ranks $i<j$ compared$]$, probability $\\frac{2}{j-i+1}$ | $\\approx 2n\\ln n$ |

        The records row explains why "update the running max" executes only about $\\ln n$ times on random input: the $i$-th element is the largest of the first $i$ with probability $1/i$, since each of those $i$ elements is equally likely to be the largest.

        ## The geometric distribution: waiting for a success

        Repeat independent trials, each succeeding with probability $p > 0$, until the first success. The number of trials $X$ has

        $$P(X = k) = (1-p)^{k-1} p, \\qquad E[X] = \\frac1p.$$

        *Proof via the tail-sum formula.* For a random variable taking values in $\\{0, 1, 2, \\dots\\}$, $E[X] = \\sum_{k \\ge 1} P(X \\ge k)$: on the right, an outcome with $X = x$ is counted once for each $k = 1, \\dots, x$, i.e. $x$ times. Here $X \\ge k$ means the first $k - 1$ trials all failed, so

        $$E[X] = \\sum_{k \\ge 1} (1 - p)^{k-1} = \\frac{1}{1 - (1-p)} = \\frac1p.$$

        *Second proof, first-step analysis.* Condition on the first trial: with probability $p$ we are done after 1 trial; otherwise we have used 1 trial and the process restarts. So $E = 1 + (1 - p)E$, giving $E = 1/p$. (This needs $E$ finite, which the first proof guarantees.)

        **Rolling a die until a six:** $p = 1/6$, so $E = 6$ rolls.

        **First-step analysis with states** handles harder waits. *Until two sixes in a row:* let $E_0$ = expected rolls from scratch, $E_1$ = expected rolls when the last roll was a six. Then

        $$E_1 = 1 + \\tfrac56 E_0, \\qquad E_0 = 1 + \\tfrac16 E_1 + \\tfrac56 E_0.$$

        Substituting, $E_0 = \\tfrac76 + \\tfrac{35}{36}E_0$, so $E_0 = 42$. Not $6 + 6 = 12$ and not even $6^2 = 36$: every non-six right after a six throws the progress away, and the wait starts over.

        ## Coupon collector

        Each cereal box holds one of $n$ coupons uniformly at random. How many boxes until you own all $n$? Split the wait into **phases**: phase $i$ ($i = 0..n-1$) starts when you own $i$ distinct coupons and ends at the next new one. During phase $i$ each box is new with probability $\\frac{n - i}{n}$, so the phase is geometric with mean $\\frac{n}{n - i}$. By linearity,

        $$E[T] = \\sum_{i=0}^{n-1} \\frac{n}{n-i} = n\\left(1 + \\frac12 + \\dots + \\frac1n\\right) = n H_n \\approx n \\ln n.$$

        All six faces of a die: $6 H_6 = 6 \\cdot \\frac{49}{20} = 14.7$ rolls. The last coupon alone costs $n$ boxes on average — the long tail of every "collect them all".
      `,
    },
    {
      t: 'callout',
      kind: 'tip',
      title: 'The recipe for expected-value problems',
      md: '1. Is the quantity a **count**? Write it as a sum of indicators and add probabilities. 2. Is it a **waiting time**? Split into phases that are each geometric, or write first-step equations over states and solve them (a DP or a linear system). 3. Only reach for the full distribution when 1 and 2 fail.',
    },
    {
      t: 'md',
      md: `
        ## Expected values modulo a prime

        Exact expected values are rational, and contest problems avoid printing fractions by asking for $P \\cdot Q^{-1} \\bmod p$ (usually $p = 998244353$ or $10^9 + 7$), where the answer is $P/Q$ in lowest terms.

        **Why this is well defined.** $p$ is prime and the statement guarantees $Q \\not\\equiv 0 \\pmod p$, so $Q$ has an inverse mod $p$. Map each fraction $a/b$ to $a \\cdot b^{-1} \\bmod p$. This map respects $+$, $-$, $\\times$ and $\\div$ (it is a ring homomorphism from fractions with denominators coprime to $p$ into $\\mathbb{Z}_p$), so **you can run the whole computation mod $p$, dividing by multiplying with inverses**, and never build the fraction at all — the result is the same as reducing the exact answer at the end.

        *Example.* $E = 7/2$ mod $10^9 + 7$: $2^{-1} = 500000004$, and $7 \\cdot 500000004 \\bmod (10^9 + 7) = 500000007$. Sanity check: $2 \\cdot 500000007 = 1000000014 \\equiv 7$. ✓

        Two consequences: you **cannot compare** such residues ("is the expectation more than 3?") — the order is lost — and a probability mod $p$ is **not** in $[0, 1]$. If the problem needs comparisons, keep exact fractions or doubles too.
      `,
    },
    {
      t: 'code',
      title: 'Coupon collector n·Hₙ as P·Q⁻¹ mod 998244353',
      note: 'Each 1/i is a modular inverse by Fermat (p prime): O(n log p). The Modular inverse page shows the O(n) table inv[i] = −⌊p/i⌋ · inv[p mod i].',
      code: {
        cpp: `const long long MOD = 998244353;
long long power(long long b, long long e) {
    long long r = 1; b %= MOD;
    for (; e > 0; e >>= 1, b = b * b % MOD) if (e & 1) r = r * b % MOD;
    return r;
}
long long inverse(long long a) { return power(a, MOD - 2); }   // a not divisible by MOD

long long couponCollector(int n) {
    long long h = 0;                                   // H_n mod p
    for (int i = 1; i <= n; i++) h = (h + inverse(i)) % MOD;
    return n % MOD * h % MOD;
}`,
        java: `static final long MOD = 998244353;
static long power(long b, long e) {
    long r = 1; b %= MOD;
    for (; e > 0; e >>= 1, b = b * b % MOD) if ((e & 1) == 1) r = r * b % MOD;
    return r;
}
static long inverse(long a) { return power(a, MOD - 2); }

static long couponCollector(int n) {
    long h = 0;                                        // H_n mod p
    for (int i = 1; i <= n; i++) h = (h + inverse(i)) % MOD;
    return n % MOD * h % MOD;
}`,
        python: `MOD = 998244353

def coupon_collector(n):
    h = 0                                              # H_n mod p
    for i in range(1, n + 1):
        h = (h + pow(i, MOD - 2, MOD)) % MOD
    return n % MOD * h % MOD

# check against the exact fraction for small n:
# from fractions import Fraction
# e = n * sum(Fraction(1, i) for i in range(1, n + 1))
# assert coupon_collector(n) == e.numerator * pow(e.denominator, -1, MOD) % MOD`,
        js: `const MOD = 998244353n;
function power(b, e) {                                 // BigInt: products reach 2^60
  let r = 1n; b %= MOD;
  for (; e > 0n; e >>= 1n, b = b * b % MOD) if (e & 1n) r = r * b % MOD;
  return r;
}
const inverse = (a) => power(BigInt(a), MOD - 2n);

function couponCollector(n) {
  let h = 0n;                                          // H_n mod p
  for (let i = 1; i <= n; i++) h = (h + inverse(i)) % MOD;
  return BigInt(n) % MOD * h % MOD;
}`,
        c: `#define MOD 998244353LL
long long power(long long b, long long e) {
    long long r = 1; b %= MOD;
    for (; e > 0; e >>= 1, b = b * b % MOD) if (e & 1) r = r * b % MOD;
    return r;
}
long long inverse(long long a) { return power(a, MOD - 2); }

long long couponCollector(int n) {
    long long h = 0;                                   /* H_n mod p */
    for (int i = 1; i <= n; i++) h = (h + inverse(i)) % MOD;
    return n % MOD * h % MOD;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Randomized algorithms you must be able to prove

        ### Reservoir sampling

        A stream of unknown length arrives one item at a time; memory is $O(k)$. Keep a uniformly random sample of $k$ items: every $k$-subset of what has arrived so far must be equally likely. (A uniform random *line from a huge log file* is the case $k = 1$.)

        **Algorithm R.** Keep the first $k$ items. When item number $i > k$ arrives (1-based), draw $j$ uniformly from $\\{1, \\dots, i\\}$; if $j \\le k$, item $i$ replaces reservoir slot $j$, otherwise it is discarded.

        **Claim.** After $t \\ge k$ items, each of them is in the reservoir with probability exactly $k/t$.

        *Proof by induction on $t$.* For $t = k$ every item is kept: $k/k = 1$. ✓ Suppose it holds after $t - 1$ items, and item $t$ arrives.

        - Item $t$ enters with probability $P(j \\le k) = k/t$. ✓
        - An item already in the reservoir is evicted only if item $t$ enters **and** picks its slot: probability $\\frac{k}{t} \\cdot \\frac1k = \\frac1t$. So it survives with probability $\\frac{t-1}{t}$, and overall it is present with probability $\\frac{k}{t-1} \\cdot \\frac{t-1}{t} = \\frac kt$. ✓ $\\blacksquare$

        (The same induction shows the stronger statement: every $k$-subset of the first $t$ items is equally likely, with probability $1/\\binom tk$.)
      `,
    },
    {
      t: 'viz',
      algo: 'math-prob-reservoir',
      caption: 'Item i enters with probability k/i: early items almost always enter, late ones rarely — but late entrants also have fewer chances to be evicted, and the two effects cancel exactly. Change the seed to replay with other draws.',
    },
    {
      t: 'md',
      md: `
        ### Fisher–Yates shuffle

        Produce a uniformly random permutation of an array in place, in $O(n)$.

        **Algorithm.** For $i = n-1$ down to $1$: draw $j$ uniformly from $\\{0, \\dots, i\\}$ and swap $a[i]$ with $a[j]$.

        **Claim.** Every one of the $n!$ permutations is produced with probability exactly $1/n!$.

        *Proof.* The algorithm makes $n - 1$ independent choices with $n, n-1, \\dots, 2$ options, so there are $n \\cdot (n-1) \\cdots 2 = n!$ equally likely **choice sequences**, each with probability $1/n!$. It remains to show that different choice sequences produce different permutations; then the map from choice sequences to permutations is a bijection between two sets of size $n!$, and each permutation gets exactly one sequence. Invariant: after the step for index $i$, positions $i..n-1$ are final, and positions $0..i$ hold the not-yet-placed elements. Two sequences that first differ at step $i$ put *different* elements into position $i$ (the prefix $0..i$ holds distinct elements and $j$ indexes into it), and position $i$ is never touched again, so the outputs differ. $\\blacksquare$
      `,
    },
    {
      t: 'viz',
      algo: 'math-prob-fisher-yates',
      caption: 'The shaded prefix shrinks by one each step; j may equal i (the element stays put) — forbidding that would make the shuffle biased. The product of the choice counts is n!.',
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Shuffles that look random and are not',
      md: `
- **"Swap each $a[i]$ with $a[\\text{random}(0, n-1)]$"** makes $n^n$ equally likely choice sequences. For $n = 3$ that is 27 sequences onto 6 permutations; 27 is not divisible by 6, so some permutations *must* be more likely than others. Always draw from the shrinking range $[0, i]$.
- **Drawing $j$ from $[0, i-1]$** (excluding $i$) is Sattolo's algorithm: it produces only the $(n-1)!$ single-cycle permutations, never one with a fixed point.
- **\`rand() % m\`** is biased when $m$ does not divide the generator's range ($2^{31}$ for many C libraries): the small remainders come up slightly more often. Use \`uniform_int_distribution\`, \`Random.nextInt(bound)\`, \`random.randint\`, or rejection sampling.
- **Sorting with a random comparator** (\`sort(() => Math.random() - 0.5)\`) is not a uniform shuffle: the comparator is inconsistent and the result depends on the sorting algorithm.
- **Fixed seeds** in hashing are attackable (anti-hash tests on contest sites); seed from the clock or a hardware source.
      `,
    },
    {
      t: 'complexity',
      title: 'Probability toolkit',
      rows: [
        { op: 'Expected count via indicators', time: 'O(number of indicators)', note: 'no independence needed' },
        { op: 'Geometric wait (prob. p each try)', time: 'O(1)', note: 'E = 1/p' },
        { op: 'First-step equations over s states', time: 'O(s) if acyclic (DP), O(s³) by Gaussian elimination', note: 'mod p: divide with inverses' },
        { op: 'Coupon collector n·Hₙ mod p', time: 'O(n log p)', space: 'O(1)', note: 'O(n) with the inverse table' },
        { op: 'Reservoir sampling (k of a stream of n)', time: 'O(n)', space: 'O(k)', note: 'one pass, n unknown in advance' },
        { op: 'Fisher–Yates shuffle', time: 'O(n)', space: 'O(1) extra', note: 'n − 1 random draws' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How it shows up',
      md: '"Pick a random node from a linked list of unknown length in one pass" (reservoir, k = 1 — LeetCode 382), "shuffle an array" (Fisher–Yates — LeetCode 384; expect "prove it is uniform" as the follow-up), "random point in a rectangle set / weighted random pick" (prefix sums + binary search), "rand7 from rand5" (rejection sampling; expected calls via the geometric distribution). Quant and research interviews add expectation puzzles: dice until a pattern, coupon collector, expected fixed points. The interviewer wants the indicator decomposition said out loud and the uniformity proof, not just code.',
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-prob-linearity', 'math-q-prob-geometric', 'math-q-prob-coupon', 'math-q-prob-inversions', 'math-q-prob-modp', 'math-q-prob-reservoir', 'math-q-prob-naive-shuffle', 'math-q-prob-match'] },
  ],
}

export const numberPatterns: Page = {
  id: 'number-patterns',
  title: 'Number patterns: bases, digits, exact roots, floor sums and big numbers',
  summary: 'The everyday integer tricks behind countless problems — base conversion (even base −2), digit manipulation, exact integer square roots, Σ⌊n/i⌋ in O(√n), series formulas, overflow-safe comparisons and arithmetic on digit strings.',
  minutes: 24,
  blocks: [
    {
      t: 'md',
      md: `
        This page collects the small integer techniques that turn up everywhere: as the whole problem ("convert to base 7", "is n a perfect square?"), or as the one step that makes a solution fast or correct ("sum ⌊n/i⌋ for $n = 10^{12}$", "does this product overflow?"). Each is short; each has a classic bug.

        ## Positional notation and base conversion

        In base $b \\ge 2$, the digit string $d_{k-1} \\dots d_1 d_0$ (each $0 \\le d_i < b$) means

        $$n = \\sum_{i=0}^{k-1} d_i\\, b^i = d_0 + b\\big(d_1 + b(d_2 + \\dots)\\big).$$

        **Number → digits: repeated division.** The nested form shows $n = d_0 + b \\cdot m$ with $m$ the number written by the remaining digits. Since $0 \\le d_0 < b$, division with remainder gives exactly $d_0 = n \\bmod b$ and $m = \\lfloor n/b \\rfloor$ — the remainder is *unique*, so this is the only possible last digit. Recurse on $m$ until it is 0. Digits come out **least significant first**, so reverse them at the end. There are $\\lfloor \\log_b n \\rfloor + 1$ digits, so the loop is $O(\\log_b n)$.

        **Digits → number: Horner's rule.** Read left to right: $n \\leftarrow n \\cdot b + d$. It evaluates the nested form with one multiply-add per digit and no powers.

        **Negative bases.** With $b = -2$, every integer — negative ones too — has a unique representation with digits $\\{0, 1\\}$ and no sign: $6 = 16 - 8 - 2 = 11010_{(-2)}$. The same repeated division works if the remainder is forced into $[0, |b|)$: languages truncate toward zero, so $n \\bmod b$ can come out negative; then add $|b|$ to the remainder and 1 to the quotient. The equation still balances because $b \\cdot 1 + |b| = 0$ for $b < 0$.
      `,
    },
    {
      t: 'viz',
      algo: 'math-pat-base',
      caption: 'Each division pushes the next digit; the stack is read top-down. Try b = −2 (and a negative n) to see the remainder correction step fire.',
    },
    {
      t: 'md',
      md: `
        ## Digit manipulation

        The loop \`while n > 0: d = n % 10; n /= 10\` visits the decimal digits from the right. Everything else is built from it: digit sum, digit product, reversing a number, palindromic numbers, counting a digit.

        **Digit sum mod 9.** Since $10 \\equiv 1 \\pmod 9$, every power $10^i \\equiv 1$, so $n = \\sum d_i 10^i \\equiv \\sum d_i \\pmod 9$. **A number and its digit sum leave the same remainder mod 9** (and mod 3). Repeating the digit sum until one digit remains gives the **digital root** $1 + (n - 1) \\bmod 9$ for $n \\ge 1$, in $O(1)$.

        **Divisibility by 11.** $10 \\equiv -1 \\pmod{11}$, so $n \\equiv d_0 - d_1 + d_2 - \\dots \\pmod{11}$: the alternating digit sum.

        **Number of digits.** It is $\\lfloor \\log_{10} n \\rfloor + 1$ for $n \\ge 1$ — mathematically. In floating point, \`log10(999999999999999999)\` returns exactly 18.0 (the argument rounds to $10^{18}$ as a double), so the formula says 19 digits for an 18-digit number. Count with the division loop, or compare against a table of powers of 10.

        **Reversing digits with overflow.** Reversing a 32-bit integer can overflow ($1\\,999\\,999\\,999 \\to 9\\,999\\,999\\,991$). Before \`r = r * 10 + d\`, check \`r > (LIMIT - d) / 10\` — the division-based test explained under *Overflow-safe checks* below.
      `,
    },
    {
      t: 'code',
      title: 'Horner parsing, digit sum and digital root',
      code: {
        cpp: `// value of a digit string in base b (2..36); assumes it fits in long long
long long parseBase(const string& s, int b) {
    long long n = 0;
    for (char ch : s) {
        int d = isdigit(ch) ? ch - '0' : toupper(ch) - 'A' + 10;
        n = n * b + d;                                 // Horner
    }
    return n;
}
int digitSum(long long n) {                            // n ≥ 0
    int s = 0;
    for (; n > 0; n /= 10) s += n % 10;
    return s;
}
int digitalRoot(long long n) { return n == 0 ? 0 : 1 + (n - 1) % 9; }`,
        java: `static long parseBase(String s, int b) {             // or Long.parseLong(s, b)
    long n = 0;
    for (char ch : s.toCharArray()) {
        int d = Character.isDigit(ch) ? ch - '0' : Character.toUpperCase(ch) - 'A' + 10;
        n = n * b + d;                                 // Horner
    }
    return n;
}
static int digitSum(long n) {                          // n ≥ 0
    int s = 0;
    for (; n > 0; n /= 10) s += n % 10;
    return s;
}
static int digitalRoot(long n) { return n == 0 ? 0 : (int) (1 + (n - 1) % 9); }`,
        python: `def parse_base(s, b):                     # or int(s, b) for 2 <= b <= 36
    n = 0
    for ch in s:
        n = n * b + int(ch, 36)            # Horner
    return n

def digit_sum(n):                          # n >= 0
    s = 0
    while n > 0:
        s += n % 10; n //= 10
    return s

def digital_root(n):
    return 0 if n == 0 else 1 + (n - 1) % 9`,
        js: `function parseBase(s, b) {                 // or parseInt(s, b) while the value < 2^53
  let n = 0;
  for (const ch of s) n = n * b + parseInt(ch, 36);   // Horner
  return n;
}
function digitSum(n) {                     // n ≥ 0
  let s = 0;
  for (; n > 0; n = Math.floor(n / 10)) s += n % 10;
  return s;
}
const digitalRoot = (n) => (n === 0 ? 0 : 1 + (n - 1) % 9);`,
        c: `long long parseBase(const char *s, int b) {      /* needs <ctype.h> */
    long long n = 0;
    for (; *s; s++) {
        int d = isdigit((unsigned char) *s) ? *s - '0' : toupper((unsigned char) *s) - 'A' + 10;
        n = n * b + d;                                 /* Horner */
    }
    return n;
}
int digitSum(long long n) {                            /* n >= 0 */
    int s = 0;
    for (; n > 0; n /= 10) s += n % 10;
    return s;
}
int digitalRoot(long long n) { return n == 0 ? 0 : (int) (1 + (n - 1) % 9); }`,
      },
    },
    {
      t: 'md',
      md: `
        ## Exact integer square roots

        "Is $n$ a perfect square?", "largest $x$ with $x^2 \\le n$", "how many squares are $\\le n$?" — all need $\\lfloor \\sqrt n \\rfloor$ **exactly**. The obvious \`(long long) sqrt(n)\` is wrong for large $n$:

        - A double has a 53-bit mantissa. $n = 999\\,999\\,999\\,999\\,999\\,999$ rounds to $10^{18}$ when converted, and \`sqrt\` returns exactly $10^9$ — but $\\lfloor\\sqrt n\\rfloor = 999\\,999\\,999$.
        - Even when $n < 2^{53}$ is stored exactly, the *result* can round up: $n = 67108865^2 - 1 = 4\\,503\\,599\\,761\\,588\\,224$ gives \`sqrt(n)\` $= 67108865$, one too many.

        **Fix 1: adjust the float guess.** \`r = (long long) sqrtl(n); while (r * r > n) r--; while ((r + 1) * (r + 1) <= n) r++;\` — the guess is off by at most one or two, and the loops repair it (mind overflow of $(r+1)^2$ near $2^{63}$).

        **Fix 2: binary search on the answer**, the predicate $x^2 \\le n$ written overflow-free as $x \\le \\lfloor n/x \\rfloor$. Sixty-odd iterations, exact.

        **Fix 3: Newton's method in integers.** Start at $x = n$ and repeat $y = \\lfloor (x + \\lfloor n/x \\rfloor)/2 \\rfloor$; stop as soon as $y \\ge x$ and return $x$.

        *Proof that Newton returns exactly $s = \\lfloor\\sqrt n\\rfloor$* (for $n \\ge 2$). First, since $x$ is an integer, $\\lfloor (x + \\lfloor n/x \\rfloor)/2 \\rfloor = \\lfloor (x + n/x)/2 \\rfloor$ (dropping the fractional part of $n/x$ cannot cross an integer boundary after halving).

        1. **Never below $s$:** by AM–GM, $(x + n/x)/2 \\ge \\sqrt{x \\cdot n/x} = \\sqrt n$, so $y \\ge \\lfloor\\sqrt n\\rfloor = s$.
        2. **Strictly decreasing while above $s$:** if $x > s$ then $x \\ge s + 1 > \\sqrt n$, so $n/x < x$, so $(x + n/x)/2 < x$ and $y < x$. The loop continues.
        3. **Stops at $s$:** when $x = s$, step 1 gives $y \\ge s = x$, so the loop returns $x = s$.

        $x$ starts at $n \\ge s$, decreases strictly while above $s$, and cannot go below $s$ — so it reaches $s$ and stops there. $\\blacksquare$ Far from the root each step roughly halves $x$; near it, the number of correct digits doubles (quadratic convergence), so about $\\log_2 n$ iterations in total from $x = n$, and far fewer from a good starting guess.
      `,
    },
    {
      t: 'viz',
      algo: 'math-pat-isqrt',
      caption: 'x halves while it is far above the root, then lands in a couple of steps. Try n = 4503599761588224 — a case where floating-point sqrt answers 67108865, one too many.',
    },
    {
      t: 'md',
      md: `
        **Perfect powers.** "Is $n = a^k$ for some integers $a, k \\ge 2$?" Only $k \\le \\log_2 n$ can work (since $a \\ge 2$), so try each $k$ from 2 to 63 and compute the integer $k$-th root by binary search, checking $x^k \\le n$ with an **overflow-capped power** (stop multiplying as soon as the product passes $n$).

        **Fast rejection for squares.** A square is $\\equiv 0, 1, 4, 9 \\pmod{16}$ — only 4 of 16 residues — so \`(n & 15)\` rejects 75% of non-squares before any root is taken. (Squares of even numbers are $0$ or $4$, of odd numbers $(2m+1)^2 = 4m(m+1) + 1 \\equiv 1$ or $9 \\pmod{16}$, since $m(m+1)$ is even.)
      `,
    },
    {
      t: 'code',
      title: 'Exact isqrt, perfect-square test, integer k-th root',
      note: '3037000499 is ⌊√(2⁶³ − 1)⌋, so mid · mid never overflows; the k-th power check stops before it would. JavaScript uses BigInt so it stays exact past 2⁵³.',
      code: {
        cpp: `long long isqrt(long long n) {                // largest x with x*x <= n, n >= 0
    long long lo = 0, hi = min(n, 3037000499LL);
    while (lo < hi) {
        long long mid = lo + (hi - lo + 1) / 2;
        if (mid <= n / mid) lo = mid; else hi = mid - 1;   // mid*mid <= n, no overflow
    }
    return lo;
}
bool isSquare(long long n) {
    if (n < 0) return false;
    long long r = isqrt(n);
    return r * r == n;
}
bool powLeq(long long x, int k, long long n) {  // x^k <= n ?  (x >= 1)
    long long r = 1;
    for (int i = 0; i < k; i++) { if (r > n / x) return false; r *= x; }
    return true;
}
long long kthRoot(long long n, int k) {         // largest x with x^k <= n, n >= 1
    long long lo = 1, hi = n;
    while (lo < hi) {
        long long mid = lo + (hi - lo + 1) / 2;
        if (powLeq(mid, k, n)) lo = mid; else hi = mid - 1;
    }
    return lo;
}`,
        java: `static long isqrt(long n) {                   // largest x with x*x <= n, n >= 0
    long lo = 0, hi = Math.min(n, 3037000499L);
    while (lo < hi) {
        long mid = lo + (hi - lo + 1) / 2;
        if (mid <= n / mid) lo = mid; else hi = mid - 1;   // mid*mid <= n, no overflow
    }
    return lo;
}
static boolean isSquare(long n) {
    if (n < 0) return false;
    long r = isqrt(n);
    return r * r == n;
}
static boolean powLeq(long x, int k, long n) {   // x^k <= n ?  (x >= 1)
    long r = 1;
    for (int i = 0; i < k; i++) { if (r > n / x) return false; r *= x; }
    return true;
}
static long kthRoot(long n, int k) {            // largest x with x^k <= n, n >= 1
    long lo = 1, hi = n;
    while (lo < hi) {
        long mid = lo + (hi - lo + 1) / 2;
        if (powLeq(mid, k, n)) lo = mid; else hi = mid - 1;
    }
    return lo;
}`,
        python: `import math

def is_square(n):
    return n >= 0 and math.isqrt(n) ** 2 == n     # math.isqrt is exact for any size

def kth_root(n, k):                               # largest x with x**k <= n, n >= 1
    lo, hi = 1, 1 << (n.bit_length() // k + 1)    # 2^(bits/k + 1) is above the root
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if mid ** k <= n:
            lo = mid
        else:
            hi = mid - 1
    return lo`,
        js: `function isqrt(n) {                        // BigInt n >= 0n
  let lo = 0n, hi = n < 3037000499n ? n : 3037000499n;
  while (hi * hi < n) hi *= 2n;               // BigInt has no overflow: grow if needed
  while (lo < hi) {
    const mid = (lo + hi + 1n) / 2n;
    if (mid * mid <= n) lo = mid; else hi = mid - 1n;
  }
  return lo;
}
const isSquare = (n) => n >= 0n && isqrt(n) ** 2n === n;
function kthRoot(n, k) {                      // BigInt n >= 1n, number k >= 1
  let lo = 1n, hi = n;
  const K = BigInt(k);
  while (lo < hi) {
    const mid = (lo + hi + 1n) / 2n;
    if (mid ** K <= n) lo = mid; else hi = mid - 1n;
  }
  return lo;
}`,
        c: `long long isqrt(long long n) {                /* largest x with x*x <= n, n >= 0 */
    long long lo = 0, hi = n < 3037000499LL ? n : 3037000499LL;
    while (lo < hi) {
        long long mid = lo + (hi - lo + 1) / 2;
        if (mid <= n / mid) lo = mid; else hi = mid - 1;   /* mid*mid <= n */
    }
    return lo;
}
int isSquare(long long n) {
    if (n < 0) return 0;
    long long r = isqrt(n);
    return r * r == n;
}
int powLeq(long long x, int k, long long n) {   /* x^k <= n ?  (x >= 1) */
    long long r = 1;
    for (int i = 0; i < k; i++) { if (r > n / x) return 0; r *= x; }
    return 1;
}
long long kthRoot(long long n, int k) {         /* largest x with x^k <= n, n >= 1 */
    long long lo = 1, hi = n;
    while (lo < hi) {
        long long mid = lo + (hi - lo + 1) / 2;
        if (powLeq(mid, k, n)) lo = mid; else hi = mid - 1;
    }
    return lo;
}`,
      },
    },
    { t: 'check', title: 'Quick check', ids: ['math-q-pat-isqrt-float', 'math-q-pat-mod16'] },
    {
      t: 'md',
      md: `
        ## Σ ⌊n/i⌋ in O(√n): quotient blocks

        Many counting sums have the shape $\\sum_{i=1}^{n} f(i)\\,\\lfloor n/i \\rfloor$. The plainest one,

        $$\\sum_{i=1}^{n} \\left\\lfloor \\frac{n}{i} \\right\\rfloor = \\sum_{k=1}^{n} d(k),$$

        counts the pairs $(i, m)$ with $i \\cdot m \\le n$ — so it is also the total number of divisors of $1, \\dots, n$. For $n = 10^{12}$ a loop over $i$ is hopeless. But the quotients repeat: for $n = 30$ they are $30, 15, 10, 7, 6, 5, 4, 3, 3, 3, 2, 2, \\dots$

        **Claim 1: $\\lfloor n/i \\rfloor$ takes at most $2\\sqrt n$ distinct values.** For $i \\le \\sqrt n$ there are at most $\\sqrt n$ choices of $i$, hence at most $\\sqrt n$ values. For $i > \\sqrt n$ the value is $\\lfloor n/i \\rfloor < \\sqrt n$, a non-negative integer below $\\sqrt n$ — at most $\\sqrt n$ possibilities. Total $\\le 2\\sqrt n$. $\\blacksquare$

        **Claim 2: the block of $l$ ends at $r = \\lfloor n / \\lfloor n/l \\rfloor \\rfloor$.** Let $q = \\lfloor n/l \\rfloor \\ge 1$. For integer $i$: $\\lfloor n/i \\rfloor \\ge q \\iff n/i \\ge q \\iff i \\le n/q \\iff i \\le \\lfloor n/q \\rfloor$. So the indices with quotient $\\ge q$ are exactly $1..\\lfloor n/q \\rfloor$, and since the quotient never increases with $i$, all of $l..r$ share the quotient $q$ while $r + 1$ has a smaller one. $\\blacksquare$

        So iterate over blocks: $q = \\lfloor n/l \\rfloor$, $r = \\lfloor n/q \\rfloor$, add $q \\cdot (r - l + 1)$, jump to $l = r + 1$. At most $2\\sqrt n$ iterations: $2 \\cdot 10^6$ for $n = 10^{12}$.
      `,
    },
    {
      t: 'viz',
      algo: 'math-pat-floor-blocks',
      caption: 'Blocks are single cells at the start (large quotients) and grow wide at the end (small quotients). The meter compares the iterations with 2√n and with n.',
    },
    {
      t: 'md',
      md: `
        **Weighted versions.** If the weight $f$ has a closed-form prefix sum $F$, the block contributes $q \\cdot (F(r) - F(l - 1))$:

        - $\\sum_{k \\le n} \\sigma(k) = \\sum_{i=1}^{n} i \\lfloor n/i \\rfloor$ (each $i$ is a divisor of its $\\lfloor n/i \\rfloor$ multiples): weight $f(i) = i$, block sum $q \\cdot \\frac{(l + r)(r - l + 1)}{2}$.
        - $\\sum_{i=1}^{n} (n \\bmod i) = n^2 - \\sum_{i=1}^{n} i \\lfloor n/i \\rfloor$, since $n \\bmod i = n - i\\lfloor n/i \\rfloor$.
        - $\\sum_{d} \\mu(d) \\lfloor n/d \\rfloor^2$ (coprime pairs, previous page): with prefix sums of $\\mu$, $O(\\sqrt n)$ per query.
        - Two quotients at once, $\\lfloor n/i \\rfloor$ and $\\lfloor m/i \\rfloor$: take $r = \\min(\\lfloor n/q_1 \\rfloor, \\lfloor m/q_2 \\rfloor)$; still $O(\\sqrt n + \\sqrt m)$ blocks.

        ## GCD-sum tricks: group by the value of the gcd

        **$\\sum_{i=1}^{n} \\gcd(i, n)$.** Instead of computing $n$ gcds, ask for each possible value $g$ how many $i$ have $\\gcd(i, n) = g$. Write $i = g j$: then $\\gcd(gj, n) = g \\iff \\gcd(j, n/g) = 1$, with $1 \\le j \\le n/g$ — that is $\\varphi(n/g)$ values. So

        $$\\sum_{i=1}^{n}\\gcd(i, n) = \\sum_{g \\mid n} g \\cdot \\varphi(n/g).$$

        For $n = 6$: gcds are $1, 2, 3, 2, 1, 6$, total 15; the formula gives $1\\cdot\\varphi(6) + 2\\varphi(3) + 3\\varphi(2) + 6\\varphi(1) = 2 + 4 + 3 + 6 = 15$. ✓ Cost: factor $n$ and enumerate its divisors, $O(\\sqrt n)$.

        **$\\sum_{i, j \\le n} \\gcd(i, j)$.** Use $m = \\sum_{d \\mid m} \\varphi(d)$ (Gauss) to write $\\gcd(i,j) = \\sum_{d \\mid i, d \\mid j} \\varphi(d)$, then swap the sums — exactly the Möbius move:

        $$\\sum_{i,j \\le n} \\gcd(i, j) = \\sum_{d=1}^{n} \\varphi(d) \\left\\lfloor \\frac nd \\right\\rfloor^2.$$

        Check $n = 2$: pairs give $1 + 1 + 1 + 2 = 5$, formula $\\varphi(1)\\cdot 4 + \\varphi(2) \\cdot 1 = 5$. ✓ With a φ sieve this is $O(n)$, or $O(\\sqrt n)$ per query with prefix sums and blocks. **The pattern: replace a function of the gcd by a divisor sum, then swap the order of summation.**

        ## Series you should know cold

        | sum | closed form | proof idea |
        |---|---|---|
        | $1 + 2 + \\dots + n$ | $\\frac{n(n+1)}{2}$ | pair $i$ with $n + 1 - i$: $n$ pairs of sum $n + 1$, each counted twice |
        | $a + (a+1) + \\dots + b$ | $\\frac{(a + b)(b - a + 1)}{2}$ | same pairing |
        | $1^2 + 2^2 + \\dots + n^2$ | $\\frac{n(n+1)(2n+1)}{6}$ | telescope $(i+1)^3 - i^3 = 3i^2 + 3i + 1$ over $i = 0..n$ |
        | $1^3 + \\dots + n^3$ | $\\left(\\frac{n(n+1)}{2}\\right)^2$ | induction |
        | $1 + r + \\dots + r^{n}$ | $\\frac{r^{n+1} - 1}{r - 1}$, $r \\ne 1$ | $S - rS = 1 - r^{n+1}$ |
        | $1 + \\frac12 + \\dots + \\frac1n$ | $H_n = \\ln n + 0.5772\\ldots + O(1/n)$ | compare with $\\int dx/x$ |

        *The squares, derived.* Summing $(i+1)^3 - i^3 = 3i^2 + 3i + 1$ for $i = 0..n$, the left side telescopes to $(n+1)^3$, so $(n+1)^3 = 3S_2 + 3\\frac{n(n+1)}2 + (n+1)$. Solving, $S_2 = \\frac{(n+1)\\left(2(n+1)^2 - 3n - 2\\right)}{6} = \\frac{n(n+1)(2n+1)}{6}$.

        **Computing them mod $p$.** Division by 2 or 6 is not allowed mod $p$ directly: multiply by the inverse ($2^{-1}, 6^{-1} \\bmod p$), or — for exact 64-bit values — divide the **even factor** first: one of $n, n+1$ is even, so $\\frac{n(n+1)}{2} = \\frac n2 (n+1)$ or $n\\frac{n+1}{2}$ never overflows where the true answer fits. For the geometric series mod $p$, the formula divides by $r - 1$: handle $r \\equiv 1 \\pmod p$ separately (the sum is then $n + 1$).
      `,
    },
    {
      t: 'code',
      title: 'Series mod a prime p (p > 3)',
      code: {
        cpp: `long long power(long long b, long long e, long long p) {
    long long r = 1 % p; b %= p;
    for (; e > 0; e >>= 1, b = b * b % p) if (e & 1) r = r * b % p;
    return r;
}
long long sum1(long long n, long long p) {            // 1 + 2 + … + n, 0 <= n < 2^62
    long long a = n, b = n + 1;
    if (a % 2 == 0) a /= 2; else b /= 2;               // divide the even factor first
    return a % p * (b % p) % p;
}
long long sum2(long long n, long long p) {            // 1² + … + n²
    long long inv6 = power(6, p - 2, p);
    return n % p * ((n + 1) % p) % p * ((2 * n + 1) % p) % p * inv6 % p;
}
long long geometric(long long r, long long n, long long p) {   // 1 + r + … + rⁿ
    r %= p;
    if (r == 1) return (n + 1) % p;
    return (power(r, n + 1, p) - 1 + p) % p * power(r - 1 + p, p - 2, p) % p;
}`,
        java: `static long power(long b, long e, long p) {
    long r = 1 % p; b %= p;
    for (; e > 0; e >>= 1, b = b * b % p) if ((e & 1) == 1) r = r * b % p;
    return r;
}
static long sum1(long n, long p) {                    // 1 + 2 + … + n
    long a = n, b = n + 1;
    if (a % 2 == 0) a /= 2; else b /= 2;               // divide the even factor first
    return a % p * (b % p) % p;
}
static long sum2(long n, long p) {                    // 1² + … + n²  (p < 2^31)
    long inv6 = power(6, p - 2, p);
    return n % p * ((n + 1) % p) % p * ((2 * n + 1) % p) % p * inv6 % p;
}
static long geometric(long r, long n, long p) {       // 1 + r + … + rⁿ
    r %= p;
    if (r == 1) return (n + 1) % p;
    return (power(r, n + 1, p) - 1 + p) % p * power(r - 1 + p, p - 2, p) % p;
}`,
        python: `def sum1(n, p):                            # 1 + 2 + … + n
    return n * (n + 1) // 2 % p            # Python ints: exact, then reduce

def sum2(n, p):                            # 1² + … + n²
    return n * (n + 1) * (2 * n + 1) // 6 % p

def geometric(r, n, p):                    # 1 + r + … + rⁿ
    r %= p
    if r == 1:
        return (n + 1) % p
    return (pow(r, n + 1, p) - 1) * pow(r - 1, p - 2, p) % p`,
        js: `function power(b, e, p) {                  // BigInt
  let r = 1n % p; b %= p;
  for (; e > 0n; e >>= 1n, b = b * b % p) if (e & 1n) r = r * b % p;
  return r;
}
const sum1 = (n, p) => n * (n + 1n) / 2n % p;                 // BigInt: exact
const sum2 = (n, p) => n * (n + 1n) * (2n * n + 1n) / 6n % p;
function geometric(r, n, p) {              // 1 + r + … + rⁿ, all BigInt
  r %= p;
  if (r === 1n) return (n + 1n) % p;
  return (power(r, n + 1n, p) - 1n + p) % p * power(r - 1n + p, p - 2n, p) % p;
}`,
        c: `long long power(long long b, long long e, long long p) {
    long long r = 1 % p; b %= p;
    for (; e > 0; e >>= 1, b = b * b % p) if (e & 1) r = r * b % p;
    return r;
}
long long sum1(long long n, long long p) {            /* 1 + 2 + … + n */
    long long a = n, b = n + 1;
    if (a % 2 == 0) a /= 2; else b /= 2;               /* divide the even factor first */
    return a % p * (b % p) % p;
}
long long sum2(long long n, long long p) {            /* 1² + … + n² */
    long long inv6 = power(6, p - 2, p);
    return n % p * ((n + 1) % p) % p * ((2 * n + 1) % p) % p * inv6 % p;
}
long long geometric(long long r, long long n, long long p) {   /* 1 + r + … + rⁿ */
    r %= p;
    if (r == 1) return (n + 1) % p;
    return (power(r, n + 1, p) - 1 + p) % p * power(r - 1 + p, p - 2, p) % p;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Overflow-safe checks

        Signed overflow in C and C++ is undefined behaviour; in Java and C# it silently wraps; in JavaScript integers above $2^{53}$ silently lose precision. The products in binary-search predicates, lcm computations and capped powers are the usual victims.

        **Multiplication.** For integers $a \\ge 0$, $b > 0$, $c \\ge 0$:

        $$a \\cdot b > c \\iff a > \\left\\lfloor \\frac{c}{b} \\right\\rfloor.$$

        *Proof.* If $a \\le \\lfloor c/b \\rfloor$ then $ab \\le \\lfloor c/b \\rfloor b \\le c$. If $a \\ge \\lfloor c/b \\rfloor + 1$ then $ab \\ge (\\lfloor c/b \\rfloor + 1)b > c$, because $c < (\\lfloor c/b\\rfloor + 1) b$ by the definition of the floor. $\\blacksquare$ The right side involves only a division — it cannot overflow.

        **Addition.** $a + b > c \\iff a > c - b$ (no overflow when $b \\le c$, both non-negative).

        **Built-ins.** C/C++ (GCC, Clang): \`__builtin_mul_overflow(a, b, &r)\` returns true on overflow; \`__int128\` holds any product of two 64-bit numbers. Java: \`Math.multiplyExact\` throws \`ArithmeticException\`; \`Math.multiplyHigh\` gives the top 64 bits. Python: integers never overflow (but huge ones get slow). JavaScript: \`Number.isSafeInteger\`, or switch to \`BigInt\`.

        **Where it matters:** binary search with predicate $x^2 \\le n$ or $x^k \\le n$; "smallest power of $b$ above $n$"; lcm accumulation; $n(n+1)/2$ for $n$ near $4 \\cdot 10^9$; comparing fractions $a/b < c/d$ via $ad < cb$ (needs 128-bit or the division trick).
      `,
    },
    {
      t: 'code',
      title: 'Overflow-safe product test and capped power',
      code: {
        cpp: `// does a·b exceed c?   a, b, c >= 0
bool mulExceeds(long long a, long long b, long long c) {
    return b != 0 && a > c / b;
}
// a^e if it is <= limit, else -1  (a >= 0)
long long powCapped(long long a, int e, long long limit) {
    long long r = 1;
    while (e-- > 0) {
        if (mulExceeds(r, a, limit)) return -1;
        r *= a;
    }
    return r <= limit ? r : -1;
}`,
        java: `static boolean mulExceeds(long a, long b, long c) {   // a, b, c >= 0
    return b != 0 && a > c / b;
}
static long powCapped(long a, int e, long limit) {     // a^e or -1
    long r = 1;
    while (e-- > 0) {
        if (mulExceeds(r, a, limit)) return -1;
        r *= a;
    }
    return r <= limit ? r : -1;
}`,
        python: `# Python ints never overflow; the same logic stops the numbers growing huge
def mul_exceeds(a, b, c):                  # a, b, c >= 0
    return b != 0 and a > c // b

def pow_capped(a, e, limit):               # a**e or -1
    r = 1
    for _ in range(e):
        if mul_exceeds(r, a, limit):
            return -1
        r *= a
    return r if r <= limit else -1`,
        js: `// exact for a, b, c below 2^53 (Math.floor(c / b) is then exact)
function mulExceeds(a, b, c) {
  return b !== 0 && a > Math.floor(c / b);
}
function powCapped(a, e, limit) {          // a^e or -1
  let r = 1;
  while (e-- > 0) {
    if (mulExceeds(r, a, limit)) return -1;
    r *= a;
  }
  return r <= limit ? r : -1;
}`,
        c: `int mulExceeds(long long a, long long b, long long c) {   /* a, b, c >= 0 */
    return b != 0 && a > c / b;
}
long long powCapped(long long a, int e, long long limit) {  /* a^e or -1 */
    long long r = 1;
    while (e-- > 0) {
        if (mulExceeds(r, a, limit)) return -1;
        r *= a;
    }
    return r <= limit ? r : -1;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Big numbers as digit strings

        Python integers, Java's \`BigInteger\` and JavaScript's \`BigInt\` handle arbitrary sizes. C and C++ do not, and interviews ask for it anyway ("add two numbers given as strings", "multiply strings" — LeetCode 415 and 43). Store digits, simulate school arithmetic:

        - **Addition**: walk both strings from the right with a carry; $\\Theta(\\max(n, m))$. The carry is at most 1.
        - **Multiplication**: digit $a[i] \\cdot b[j]$ contributes to place value $10^{(n-1-i) + (m-1-j)}$, which is index $i + j + 1$ of an $(n + m)$-cell result (index 0 is the most significant). Accumulate all $n \\cdot m$ products first, then sweep the carries once from right to left; $\\Theta(nm)$. Each cell receives at most $\\min(n, m)$ products of at most 81, so cells fit easily in 64 bits.
        - The product of an $n$-digit and an $m$-digit number has $n + m - 1$ or $n + m$ digits — hence the array size and the final leading-zero strip.
      `,
    },
    {
      t: 'viz',
      algo: 'math-pat-bigmul',
      caption: 'Every product drops into res[i + j + 1] without carrying; cells may hold 2-digit values. The single carry sweep at the end normalises them.',
    },
    {
      t: 'code',
      title: 'Adding two non-negative numbers given as strings',
      code: {
        cpp: `string addStrings(const string& x, const string& y) {
    string r; int carry = 0;
    for (int i = x.size() - 1, j = y.size() - 1; i >= 0 || j >= 0 || carry; i--, j--) {
        int s = carry + (i >= 0 ? x[i] - '0' : 0) + (j >= 0 ? y[j] - '0' : 0);
        r.push_back('0' + s % 10);
        carry = s / 10;
    }
    reverse(r.begin(), r.end());
    return r;
}`,
        java: `static String addStrings(String x, String y) {
    StringBuilder r = new StringBuilder(); int carry = 0;
    for (int i = x.length() - 1, j = y.length() - 1; i >= 0 || j >= 0 || carry > 0; i--, j--) {
        int s = carry + (i >= 0 ? x.charAt(i) - '0' : 0) + (j >= 0 ? y.charAt(j) - '0' : 0);
        r.append((char) ('0' + s % 10));
        carry = s / 10;
    }
    return r.reverse().toString();
}`,
        python: `def add_strings(x, y):
    r, carry = [], 0
    i, j = len(x) - 1, len(y) - 1
    while i >= 0 or j >= 0 or carry:
        s = carry + (int(x[i]) if i >= 0 else 0) + (int(y[j]) if j >= 0 else 0)
        r.append(str(s % 10))
        carry = s // 10
        i -= 1; j -= 1
    return ''.join(reversed(r))`,
        js: `function addStrings(x, y) {
  const r = []; let carry = 0;
  for (let i = x.length - 1, j = y.length - 1; i >= 0 || j >= 0 || carry; i--, j--) {
    const s = carry + (i >= 0 ? +x[i] : 0) + (j >= 0 ? +y[j] : 0);
    r.push(s % 10);
    carry = Math.floor(s / 10);
  }
  return r.reverse().join('');
}`,
        c: `/* out needs max(strlen(x), strlen(y)) + 2 bytes */
void addStrings(const char *x, const char *y, char *out) {
    int i = strlen(x) - 1, j = strlen(y) - 1, k = 0, carry = 0;
    while (i >= 0 || j >= 0 || carry) {
        int s = carry + (i >= 0 ? x[i--] - '0' : 0) + (j >= 0 ? y[j--] - '0' : 0);
        out[k++] = '0' + s % 10;
        carry = s / 10;
    }
    out[k] = '\\0';
    for (int a = 0, b = k - 1; a < b; a++, b--) { char t = out[a]; out[a] = out[b]; out[b] = t; }
}`,
      },
    },
    {
      t: 'complexity',
      title: 'Number patterns',
      rows: [
        { op: 'Base conversion (either direction)', time: 'O(log_b n)', space: 'O(log_b n)', note: 'one division / multiply-add per digit' },
        { op: 'Digit sum, reverse, digit count', time: 'O(log₁₀ n)', space: 'O(1)', note: 'digital root is O(1)' },
        { op: 'isqrt by binary search', time: 'O(log n)', space: 'O(1)', note: 'predicate mid ≤ n / mid' },
        { op: 'isqrt by Newton from x = n', time: 'O(log n)', space: 'O(1)', note: 'quadratic once close' },
        { op: 'Perfect power test', time: 'O(log² n · log n)', space: 'O(1)', note: 'k ≤ 63 roots, each a binary search with capped powers' },
        { op: 'Σ f(i)·⌊n/i⌋ with a prefix-summable f', time: 'O(√n)', space: 'O(1)', note: '≤ 2√n blocks' },
        { op: 'Σ gcd(i, n)', time: 'O(√n)', space: 'O(number of divisors)', note: 'Σ g·φ(n/g) over divisors g' },
        { op: 'Add / multiply digit strings', time: 'O(n + m) / O(n·m)', space: 'O(n + m)', note: 'Karatsuba: O(n^1.585)' },
      ],
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'The bugs people really write',
      md: `
- \`(long long) sqrt(n)\` and \`floor(log10(n)) + 1\` on 64-bit inputs: floating point is off by one exactly on the boundary cases tests love.
- \`%\` of a negative number is negative in C, C++, Java and JavaScript (\`-7 % 3 == -1\`) but non-negative in Python (\`-7 % 3 == 2\`). Normalise with \`((a % m) + m) % m\`.
- \`n * (n + 1) / 2\` overflowing although the result fits: divide the even factor first.
- \`for (i = 1; i * i <= n; i++)\` overflows \`int\` when $n$ is near $2^{31}$; use \`i <= n / i\`.
- Floor blocks: computing \`n / (n / l)\` when \`n / l\` is 0 (divide by zero) — the loop must stop at \`l <= n\`.
- Strings: forgetting the final carry ("999" + "1"), or not stripping leading zeros from a product ("0" × "123" must print "0").
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How it shows up',
      md: '"Sqrt(x) without the library" (LeetCode 69: binary search or Newton; the follow-up is overflow), "valid perfect square", "reverse integer" (overflow check before multiplying), "add / multiply strings", "convert to base −2" (LeetCode 1017), "Excel column title" (base 26 *without* a zero digit: subtract 1 before each division), "count the total number of digit 1 in 1..n", "sum of divisors of 1..n" (floor blocks). The interviewer is checking exactness: integer arithmetic throughout, overflow handled, and a proof that the loop terminates with the right answer.',
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-pat-base-neg2', 'math-q-pat-floor-sum', 'math-q-pat-blocks', 'math-q-pat-block-end', 'math-q-pat-gcd-sum', 'math-q-pat-overflow-fill', 'math-q-pat-mul-array', 'math-q-pat-digit9'] },
  ],
}

export const cheatsheet: Page = {
  id: 'cheatsheet',
  title: 'Math for DSA cheatsheet',
  summary: 'Every pattern of the topic on one page: what it solves, its cost, the template in five languages, a recognition guide and a constraints → technique table.',
  minutes: 18,
  blocks: [
    {
      t: 'md',
      md: `
        This page is for the night before an interview and the first minute of a contest problem. Each line points back to the page with the proof; the templates are the versions worth memorising.

        ## Recognition guide: if the problem says X, think Y

        | the problem says… | think… | page |
        |---|---|---|
        | "divisible by", "multiple of", "remainder when divided by" | $a \\bmod m$, the division algorithm, digit tricks for 3, 9, 11 | Divisibility |
        | "largest number dividing all", "simplify the fraction", "tile a rectangle with squares" | $\\gcd$ by Euclid, $O(\\log)$ | GCD and LCM |
        | "when do the cycles line up again", "smallest number divisible by all" | $\\operatorname{lcm} = a / \\gcd \\cdot b$, divide first | GCD and LCM |
        | "find integers $x, y$ with $ax + by = c$", "can we measure exactly $c$ litres with jugs $a, b$" | extended Euclid; solvable $\\iff \\gcd(a,b) \\mid c$ | Extended Euclid |
        | "is $n$ prime" for one $n \\le 10^{12}$ | trial division to $\\sqrt n$ | Primes |
        | "is $n$ prime" for $n \\le 10^{18}$ | deterministic Miller–Rabin | Primes |
        | "all primes up to $10^7$", "for each number up to $n$…" | sieve of Eratosthenes / linear sieve | Sieve |
        | "factorize many numbers $\\le 10^7$" | smallest-prime-factor sieve, $O(\\log x)$ per number | Sieve |
        | "number of divisors", "sum of divisors", "count $x \\le n$ coprime to $n$" | $d(n) = \\prod (e_i + 1)$, $\\sigma$, Euler $\\varphi$ from the factorisation | Divisor functions |
        | "print the answer modulo $10^9 + 7$" | reduce after every $+$ and $\\times$; never compare residues | Modular arithmetic |
        | "$a^b$ with $b$ up to $10^{18}$", "$n$-th term of a linear recurrence" | binary exponentiation; matrix power $O(k^3 \\log n)$ | Fast power |
        | "divide modulo $p$", "answer is $P/Q$, print $P \\cdot Q^{-1}$" | Fermat inverse $a^{p-2}$ ($p$ prime) or extended Euclid | Modular inverse |
        | "$x \\equiv r_i \\pmod{m_i}$", "a number that leaves these remainders" | Chinese remainder theorem, merge pairwise | CRT |
        | "how many ways", "arrangements", "choose a team" | product rule, permutations, $\\binom nk$, stars and bars | Counting |
        | "$\\binom nk \\bmod p$, many queries, $n \\le 10^6$" | factorial and inverse-factorial tables, $O(1)$ per query | Pascal and binomials |
        | "$\\binom nk \\bmod p$ with $n \\le 10^{18}$, small prime $p$" | Lucas' theorem | Pascal and binomials |
        | "balanced parentheses", "binary trees with $n$ nodes", "monotone lattice paths not crossing the diagonal" | Catalan numbers $\\frac{1}{n+1}\\binom{2n}{n}$ | Pascal and binomials |
        | "at least one of", "none of", "divisible by any of these" | inclusion–exclusion over subsets (bitmask), lcm of each subset | Inclusion–exclusion |
        | "nobody gets their own…" | derangements $D(n) = (n-1)(D(n-1) + D(n-2))$ | Inclusion–exclusion |
        | "every box non-empty", "uses every colour" | surjections $\\sum (-1)^j \\binom kj (k-j)^n$ | Inclusion–exclusion |
        | "count pairs with $\\gcd = 1$", "sum of gcd over pairs" | Möbius / φ divisor sums, swap the order of summation | Inclusion–exclusion, Number patterns |
        | "expected number of…" | linearity of expectation with indicator variables | Probability |
        | "expected time until…" | geometric $1/p$, phases, first-step equations over states | Probability |
        | "random sample from a stream", "shuffle uniformly" | reservoir sampling, Fisher–Yates (prove uniformity) | Probability |
        | "sum of $\\lfloor n/i \\rfloor$", "$n$ up to $10^{12}$" with a divisor-ish sum | quotient blocks, $\\le 2\\sqrt n$ values | Number patterns |
        | "perfect square", "integer square root" | exact isqrt: binary search or integer Newton, never raw \`sqrt\` | Number patterns |
        | "numbers as strings", "100-digit numbers" | digit-array arithmetic (or BigInteger / BigInt / Python int) | Number patterns |
        | "base $b$", "base $-2$", "Excel columns" | repeated division and Horner's rule | Number patterns |

        ## Constraints → technique

        | constraint | budget | technique |
        |---|---|---|
        | $k \\le 20$ sets / primes / divisors | $2^k \\approx 10^6$ | subset enumeration, inclusion–exclusion by bitmask (prune when the lcm passes $n$) |
        | $n \\le 5000$ and $\\binom nk$ modulo anything | $n^2$ | Pascal's triangle, no inverses needed |
        | $n \\le 10^6 \\dots 10^7$ | $O(n)$ or $O(n \\log\\log n)$ | sieves (primes, SPF, φ, μ), factorial tables, harmonic loops $\\sum n/i = O(n \\log n)$ |
        | single $n \\le 10^{12}$ (or $10^{14}$) | $O(\\sqrt n) = 10^6$ | trial division, divisor enumeration, $\\varphi(n)$, quotient blocks |
        | $n \\le 10^{18}$ | $O(\\log n)$ or $O(\\log^2 n)$ | Euclid, fast power, matrix power, Miller–Rabin, binary search with overflow-safe predicates, Lucas for small $p$ |
        | answer "mod $p$" with divisions | — | inverses: Fermat for prime $p$, extended Euclid otherwise; inverse table $O(n)$ |
        | several pairwise coprime moduli | — | CRT; for non-coprime moduli check $\\gcd \\mid$ difference |
        | values beyond $2^{63}$ | — | \`__int128\`, \`BigInteger\`, \`BigInt\`, Python int, or digit strings |
      `,
    },
    {
      t: 'complexity',
      title: 'Every pattern at a glance',
      rows: [
        { op: 'gcd / lcm (Euclid)', time: 'O(log min(a, b))', space: 'O(1)', note: 'lcm = a / gcd · b' },
        { op: 'Extended Euclid, Diophantine ax + by = c', time: 'O(log)', space: 'O(1) iterative', note: 'solvable iff gcd | c; general solution x + k·b/g' },
        { op: 'Primality by trial division', time: 'O(√n)', space: 'O(1)', note: 'Miller–Rabin O(k log³ n) for 64-bit' },
        { op: 'Sieve of Eratosthenes up to n', time: 'O(n log log n)', space: 'O(n)', note: 'start crossing at p²' },
        { op: 'Linear / SPF sieve', time: 'O(n)', space: 'O(n)', note: 'factorise any x ≤ n in O(log x)' },
        { op: 'd(n), σ(n), φ(n) from factorisation', time: 'O(√n) or O(log n) with SPF', space: 'O(1)', note: 'multiplicative functions' },
        { op: 'Fast power a^b mod m', time: 'O(log b)', space: 'O(1)', note: '__int128 for m > 2³¹' },
        { op: 'Matrix power (k × k)', time: 'O(k³ log n)', space: 'O(k²)', note: 'linear recurrences, path counts' },
        { op: 'Modular inverse', time: 'O(log m)', space: 'O(1)', note: 'exists iff gcd(a, m) = 1; table of 1..n in O(n)' },
        { op: 'CRT, merging two congruences', time: 'O(log)', space: 'O(1)', note: 'moduli need not be coprime' },
        { op: 'nCr with factorial tables', time: 'O(n) build, O(1) query', space: 'O(n)', note: 'p prime > n' },
        { op: 'Lucas, nCr mod small prime p', time: 'O(p + log_p n) or O(p log_p n)', space: 'O(p)', note: 'n up to 10¹⁸' },
        { op: 'Catalan numbers', time: 'O(n) with tables', space: 'O(n)', note: 'C(2n, n) / (n + 1)' },
        { op: 'Inclusion–exclusion over k sets', time: 'O(2ᵏ · k)', space: 'O(k)', note: 'complement form for "none of"' },
        { op: 'Derangements D(n)', time: 'O(n)', space: 'O(1)', note: '≈ n!/e' },
        { op: 'Expected value by indicators', time: 'O(#indicators)', space: 'O(1)', note: 'no independence needed' },
        { op: 'Reservoir sampling / Fisher–Yates', time: 'O(n)', space: 'O(k) / O(1)', note: 'uniform, proved by induction / bijection' },
        { op: 'Σ ⌊n/i⌋ by quotient blocks', time: 'O(√n)', space: 'O(1)', note: 'r = n / (n / l)' },
        { op: 'Exact isqrt', time: 'O(log n)', space: 'O(1)', note: 'binary search or integer Newton' },
      ],
    },
    {
      t: 'md',
      md: `
        ## Core templates

        The four blocks below are the ones to have in muscle memory. C++ uses \`#include <bits/stdc++.h>\` and \`using namespace std;\`; Java methods are \`static\` inside your class; the C versions need \`<stdio.h>\`, \`<stdlib.h>\` and \`<string.h>\`.

        **1. gcd, lcm, extended Euclid, inverse, CRT.** Extended Euclid returns $g = \\gcd(a, b)$ with $ax + by = g$. The inverse of $a$ mod $m$ exists iff $\\gcd(a, m) = 1$ and is $x \\bmod m$. CRT merges $x \\equiv r_1 \\ (m_1)$ and $x \\equiv r_2 \\ (m_2)$: write $x = r_1 + m_1 t$, need $m_1 t \\equiv r_2 - r_1 \\pmod{m_2}$, solvable iff $g = \\gcd(m_1, m_2)$ divides $r_2 - r_1$, then $t \\equiv \\frac{r_2 - r_1}{g} \\cdot x \\pmod{m_2/g}$ and the result is unique mod $\\operatorname{lcm}(m_1, m_2)$.
      `,
    },
    {
      t: 'code',
      title: 'gcd · lcm · extended Euclid · modular inverse · CRT',
      note: 'C++ uses __int128 inside the CRT so lcm(m₁, m₂) may go up to ~10¹⁸. The Java and C versions reduce before multiplying and are safe while each modulus is below ~3·10⁹ and the lcm fits in 64 bits; JavaScript uses BigInt throughout.',
      code: {
        cpp: `long long gcd(long long a, long long b) { while (b) { a %= b; swap(a, b); } return a; }
long long lcm(long long a, long long b) { return a / gcd(a, b) * b; }   // divide first

long long extgcd(long long a, long long b, long long& x, long long& y) {   // a·x + b·y = g
    if (b == 0) { x = 1; y = 0; return a; }
    long long x1, y1, g = extgcd(b, a % b, x1, y1);
    x = y1; y = x1 - (a / b) * y1;
    return g;
}
long long modinv(long long a, long long m) {          // -1 if gcd(a, m) != 1
    long long x, y;
    if (extgcd(((a % m) + m) % m, m, x, y) != 1) return -1;
    return ((x % m) + m) % m;
}
// x ≡ r1 (mod m1), x ≡ r2 (mod m2)  →  {r, lcm}, or {-1, -1} if impossible
pair<long long, long long> crt(long long r1, long long m1, long long r2, long long m2) {
    long long x, y, g = extgcd(m1, m2, x, y);
    if ((r2 - r1) % g != 0) return {-1, -1};
    long long mg = m2 / g, l = m1 / g * m2;
    long long t = (long long) ((__int128) ((r2 - r1) / g) * x % mg);
    long long r = (long long) (((__int128) m1 * t + r1) % l);
    return {(r + l) % l, l};
}`,
        java: `static long gcd(long a, long b) { while (b != 0) { long t = a % b; a = b; b = t; } return a; }
static long lcm(long a, long b) { return a / gcd(a, b) * b; }

static long ex, ey;                                   // extgcd's x and y
static long extgcd(long a, long b) {                  // a·ex + b·ey = g
    if (b == 0) { ex = 1; ey = 0; return a; }
    long g = extgcd(b, a % b);
    long t = ex; ex = ey; ey = t - (a / b) * ey;
    return g;
}
static long modinv(long a, long m) {                  // -1 if gcd(a, m) != 1
    if (extgcd(((a % m) + m) % m, m) != 1) return -1;
    return ((ex % m) + m) % m;
}
static long[] crt(long r1, long m1, long r2, long m2) {   // {r, lcm} or null
    long g = extgcd(m1, m2), x = ex;
    if ((r2 - r1) % g != 0) return null;
    long mg = m2 / g, l = m1 / g * m2;
    long t = ((r2 - r1) / g % mg) * (x % mg) % mg;    // both factors below mg
    long r = ((m1 % l) * ((t + mg) % mg) + r1) % l;   // m1·t < l
    return new long[] { (r + l) % l, l };
}`,
        python: `def gcd(a, b):                            # also math.gcd / math.lcm
    while b:
        a, b = b, a % b
    return a

def lcm(a, b):
    return a // gcd(a, b) * b

def extgcd(a, b):                          # (g, x, y) with a*x + b*y = g
    if b == 0:
        return a, 1, 0
    g, x1, y1 = extgcd(b, a % b)
    return g, y1, x1 - (a // b) * y1

def modinv(a, m):                          # or pow(a, -1, m) (Python 3.8+)
    g, x, _ = extgcd(a % m, m)
    return x % m if g == 1 else -1

def crt(r1, m1, r2, m2):                   # (r, lcm) or None
    g, x, _ = extgcd(m1, m2)
    if (r2 - r1) % g:
        return None
    l = m1 // g * m2
    t = (r2 - r1) // g * x % (m2 // g)
    return (r1 + m1 * t) % l, l`,
        js: `// BigInt throughout: write 12n, or convert with BigInt(x)
function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a < 0n ? -a : a; }
const lcm = (a, b) => a / gcd(a, b) * b;
const mod = (a, m) => ((a % m) + m) % m;

function extgcd(a, b) {                    // [g, x, y] with a*x + b*y = g
  if (b === 0n) return [a, 1n, 0n];
  const [g, x1, y1] = extgcd(b, a % b);
  return [g, y1, x1 - (a / b) * y1];
}
function modinv(a, m) {                    // -1n if gcd(a, m) != 1
  const [g, x] = extgcd(mod(a, m), m);
  return g === 1n ? mod(x, m) : -1n;
}
function crt(r1, m1, r2, m2) {             // [r, lcm] or null
  const [g, x] = extgcd(m1, m2);
  if ((r2 - r1) % g !== 0n) return null;
  const l = m1 / g * m2;
  const t = mod((r2 - r1) / g * x, m2 / g);
  return [mod(r1 + m1 * t, l), l];
}`,
        c: `long long gcd(long long a, long long b) { while (b) { long long t = a % b; a = b; b = t; } return a; }
long long lcm(long long a, long long b) { return a / gcd(a, b) * b; }

long long extgcd(long long a, long long b, long long *x, long long *y) {   /* a·x + b·y = g */
    if (b == 0) { *x = 1; *y = 0; return a; }
    long long x1, y1, g = extgcd(b, a % b, &x1, &y1);
    *x = y1; *y = x1 - (a / b) * y1;
    return g;
}
long long modinv(long long a, long long m) {          /* -1 if gcd(a, m) != 1 */
    long long x, y;
    if (extgcd(((a % m) + m) % m, m, &x, &y) != 1) return -1;
    return ((x % m) + m) % m;
}
/* returns 0 if impossible, else 1 with *r, *l set: x ≡ *r (mod *l) */
int crt(long long r1, long long m1, long long r2, long long m2, long long *r, long long *l) {
    long long x, y, g = extgcd(m1, m2, &x, &y);
    if ((r2 - r1) % g != 0) return 0;
    long long mg = m2 / g;
    *l = m1 / g * m2;
    long long t = ((r2 - r1) / g % mg) * (x % mg) % mg;
    t = (t + mg) % mg;
    *r = ((m1 % *l) * t + r1) % *l;
    *r = (*r + *l) % *l;
    return 1;
}`,
      },
    },
    {
      t: 'md',
      md: `
        **2. Fast power and matrix power.** Square-and-multiply reads the exponent's bits: $a^{b} = \\prod_{\\text{bit } i \\text{ set}} a^{2^i}$, $O(\\log b)$ multiplications. A linear recurrence of order $k$ is one $k \\times k$ matrix power: $\\begin{pmatrix}1&1\\\\1&0\\end{pmatrix}^n = \\begin{pmatrix}F_{n+1}&F_n\\\\F_n&F_{n-1}\\end{pmatrix}$.
      `,
    },
    {
      t: 'code',
      title: 'Fast power, safe mulmod, matrix power (Fibonacci mod m)',
      note: 'For moduli above 2³¹ the product of two residues overflows 64 bits: C++ multiplies in unsigned __int128; Java can use BigInteger.modPow; the Java and C versions here assume m < 2³¹.',
      code: {
        cpp: `using u64 = unsigned long long;
u64 mulmod(u64 a, u64 b, u64 m) { return (unsigned __int128) a * b % m; }
u64 power(u64 b, u64 e, u64 m) {                       // bᵉ mod m, any m < 2^64
    u64 r = 1 % m; b %= m;
    for (; e > 0; e >>= 1, b = mulmod(b, b, m)) if (e & 1) r = mulmod(r, b, m);
    return r;
}

using Mat = vector<vector<long long>>;
Mat matmul(const Mat& A, const Mat& B, long long m) {   // m < 2^31
    int n = A.size();
    Mat C(n, vector<long long>(n, 0));
    for (int i = 0; i < n; i++)
        for (int k = 0; k < n; k++) if (A[i][k])
            for (int j = 0; j < n; j++) C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % m;
    return C;
}
Mat matpow(Mat A, long long e, long long m) {
    int n = A.size();
    Mat R(n, vector<long long>(n, 0));
    for (int i = 0; i < n; i++) R[i][i] = 1 % m;
    for (; e > 0; e >>= 1, A = matmul(A, A, m)) if (e & 1) R = matmul(R, A, m);
    return R;
}
long long fib(long long n, long long m) { return matpow({{1, 1}, {1, 0}}, n, m)[0][1]; }`,
        java: `static long power(long b, long e, long m) {            // m < 2^31
    long r = 1 % m; b %= m;
    for (; e > 0; e >>= 1, b = b * b % m) if ((e & 1) == 1) r = r * b % m;
    return r;
}

static long[][] matmul(long[][] A, long[][] B, long m) {
    int n = A.length;
    long[][] C = new long[n][n];
    for (int i = 0; i < n; i++)
        for (int k = 0; k < n; k++) if (A[i][k] != 0)
            for (int j = 0; j < n; j++) C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % m;
    return C;
}
static long[][] matpow(long[][] A, long e, long m) {
    int n = A.length;
    long[][] R = new long[n][n];
    for (int i = 0; i < n; i++) R[i][i] = 1 % m;
    for (; e > 0; e >>= 1, A = matmul(A, A, m)) if ((e & 1) == 1) R = matmul(R, A, m);
    return R;
}
static long fib(long n, long m) { return matpow(new long[][] {{1, 1}, {1, 0}}, n, m)[0][1]; }`,
        python: `# pow(b, e, m) is built in and exact for any size

def matmul(A, B, m):
    n = len(A)
    return [[sum(A[i][k] * B[k][j] for k in range(n)) % m for j in range(n)] for i in range(n)]

def matpow(A, e, m):
    n = len(A)
    R = [[int(i == j) % m for j in range(n)] for i in range(n)]
    while e > 0:
        if e & 1:
            R = matmul(R, A, m)
        A = matmul(A, A, m)
        e >>= 1
    return R

def fib(n, m):
    return matpow([[1, 1], [1, 0]], n, m)[0][1]`,
        js: `function power(b, e, m) {                  // BigInt arguments
  let r = 1n % m; b %= m;
  for (; e > 0n; e >>= 1n, b = b * b % m) if (e & 1n) r = r * b % m;
  return r;
}
function matmul(A, B, m) {                 // BigInt entries
  const n = A.length;
  return A.map((_, i) => B[0].map((_, j) => {
    let s = 0n;
    for (let k = 0; k < n; k++) s += A[i][k] * B[k][j];
    return s % m;
  }));
}
function matpow(A, e, m) {
  const n = A.length;
  let R = A.map((row, i) => row.map((_, j) => (i === j ? 1n % m : 0n)));
  for (; e > 0n; e >>= 1n, A = matmul(A, A, m)) if (e & 1n) R = matmul(R, A, m);
  return R;
}
const fib = (n, m) => matpow([[1n, 1n], [1n, 0n]], BigInt(n), BigInt(m))[0][1];`,
        c: `long long power(long long b, long long e, long long m) {   /* m < 2^31 */
    long long r = 1 % m; b %= m;
    for (; e > 0; e >>= 1, b = b * b % m) if (e & 1) r = r * b % m;
    return r;
}

#define K 2                                            /* matrix size */
typedef struct { long long a[K][K]; } Mat;
Mat matmul(Mat A, Mat B, long long m) {
    Mat C; memset(&C, 0, sizeof C);
    for (int i = 0; i < K; i++)
        for (int k = 0; k < K; k++)
            for (int j = 0; j < K; j++) C.a[i][j] = (C.a[i][j] + A.a[i][k] * B.a[k][j]) % m;
    return C;
}
Mat matpow(Mat A, long long e, long long m) {
    Mat R; memset(&R, 0, sizeof R);
    for (int i = 0; i < K; i++) R.a[i][i] = 1 % m;
    for (; e > 0; e >>= 1, A = matmul(A, A, m)) if (e & 1) R = matmul(R, A, m);
    return R;
}
long long fib(long long n, long long m) {
    Mat A = {{{1, 1}, {1, 0}}};
    return matpow(A, n, m).a[0][1];
}`,
      },
    },
    {
      t: 'md',
      md: `
        **3. Sieve, factorisation, φ, divisor count.** The smallest-prime-factor table factorises any $x \\le n$ by repeated division in $O(\\log x)$. For a single large $n$, trial division to $\\sqrt n$ gives the factorisation, and $\\varphi(n) = n \\prod (1 - 1/p)$, $d(n) = \\prod (e_i + 1)$.
      `,
    },
    {
      t: 'code',
      title: 'Smallest-prime-factor sieve, factorisation, φ, number of divisors',
      code: {
        cpp: `vector<int> spf;                                       // smallest prime factor
void buildSpf(int n) {                                 // O(n log log n)
    spf.assign(n + 1, 0);
    for (int i = 2; i <= n; i++) if (spf[i] == 0)
        for (int j = i; j <= n; j += i) if (spf[j] == 0) spf[j] = i;
}
vector<pair<int, int>> factorize(int x) {              // x <= n, O(log x)
    vector<pair<int, int>> f;
    while (x > 1) {
        int p = spf[x], e = 0;
        while (x % p == 0) { x /= p; e++; }
        f.push_back({p, e});
    }
    return f;
}
int numDivisors(int x) { int d = 1; for (auto [p, e] : factorize(x)) d *= e + 1; return d; }
long long phi(long long n) {                           // trial division, O(√n)
    long long r = n;
    for (long long p = 2; p * p <= n; p++)
        if (n % p == 0) { while (n % p == 0) n /= p; r -= r / p; }
    if (n > 1) r -= r / n;
    return r;
}`,
        java: `static int[] spf;                                      // smallest prime factor
static void buildSpf(int n) {
    spf = new int[n + 1];
    for (int i = 2; i <= n; i++) if (spf[i] == 0)
        for (int j = i; j <= n; j += i) if (spf[j] == 0) spf[j] = i;
}
static java.util.List<int[]> factorize(int x) {        // pairs {p, e}
    java.util.List<int[]> f = new java.util.ArrayList<>();
    while (x > 1) {
        int p = spf[x], e = 0;
        while (x % p == 0) { x /= p; e++; }
        f.add(new int[] { p, e });
    }
    return f;
}
static int numDivisors(int x) { int d = 1; for (int[] pe : factorize(x)) d *= pe[1] + 1; return d; }
static long phi(long n) {
    long r = n;
    for (long p = 2; p * p <= n; p++)
        if (n % p == 0) { while (n % p == 0) n /= p; r -= r / p; }
    if (n > 1) r -= r / n;
    return r;
}`,
        python: `def build_spf(n):
    spf = list(range(n + 1))               # spf[i] = i until a smaller prime claims it
    for i in range(2, int(n ** 0.5) + 1):
        if spf[i] == i:                    # i is prime
            for j in range(i * i, n + 1, i):
                if spf[j] == j:
                    spf[j] = i
    return spf

def factorize(x, spf):                     # [(p, e), ...]
    f = []
    while x > 1:
        p, e = spf[x], 0
        while x % p == 0:
            x //= p; e += 1
        f.append((p, e))
    return f

def num_divisors(x, spf):
    d = 1
    for _, e in factorize(x, spf):
        d *= e + 1
    return d

def phi(n):
    r, p = n, 2
    while p * p <= n:
        if n % p == 0:
            while n % p == 0:
                n //= p
            r -= r // p
        p += 1
    if n > 1:
        r -= r // n
    return r`,
        js: `function buildSpf(n) {
  const spf = new Int32Array(n + 1);
  for (let i = 2; i <= n; i++) if (spf[i] === 0)
    for (let j = i; j <= n; j += i) if (spf[j] === 0) spf[j] = i;
  return spf;
}
function factorize(x, spf) {               // [[p, e], ...]
  const f = [];
  while (x > 1) {
    const p = spf[x]; let e = 0;
    while (x % p === 0) { x /= p; e++; }
    f.push([p, e]);
  }
  return f;
}
const numDivisors = (x, spf) => factorize(x, spf).reduce((d, [, e]) => d * (e + 1), 1);
function phi(n) {                          // n < 2^53
  let r = n;
  for (let p = 2; p * p <= n; p++)
    if (n % p === 0) { while (n % p === 0) n /= p; r -= r / p; }
  if (n > 1) r -= r / n;
  return r;
}`,
        c: `int *spf;                                              /* smallest prime factor */
void buildSpf(int n) {
    spf = calloc(n + 1, sizeof *spf);
    for (int i = 2; i <= n; i++) if (spf[i] == 0)
        for (int j = i; j <= n; j += i) if (spf[j] == 0) spf[j] = i;
}
/* writes primes to p[], exponents to e[]; returns how many */
int factorize(int x, int *p, int *e) {
    int k = 0;
    while (x > 1) {
        p[k] = spf[x]; e[k] = 0;
        while (x % p[k] == 0) { x /= p[k]; e[k]++; }
        k++;
    }
    return k;
}
int numDivisors(int x) {
    int p[32], e[32], k = factorize(x, p, e), d = 1;
    for (int i = 0; i < k; i++) d *= e[i] + 1;
    return d;
}
long long phi(long long n) {
    long long r = n;
    for (long long p = 2; p * p <= n; p++)
        if (n % p == 0) { while (n % p == 0) n /= p; r -= r / p; }
    if (n > 1) r -= r / n;
    return r;
}`,
      },
    },
    {
      t: 'md',
      md: `
        **4. Binomials mod a prime.** Build $n!$ forward and $(n!)^{-1}$ backward with one inverse: $\\frac{1}{(i-1)!} = \\frac{i}{i!}$. Then $\\binom nr = \\frac{n!}{r!\\,(n-r)!}$ is three table lookups. For huge $n$ and a small prime $p$, Lucas' theorem multiplies the binomials of the base-$p$ digits: $\\binom nr \\equiv \\prod \\binom{n_i}{r_i} \\pmod p$.
      `,
    },
    {
      t: 'code',
      title: 'Factorial tables, nCr mod p, Lucas',
      note: 'Tables need n < p (otherwise n! ≡ 0). Lucas’ small binomials are computed directly here in O(p); precompute factorials mod p when many queries share the same p.',
      code: {
        cpp: `const long long MOD = 1000000007;
long long powmod(long long b, long long e, long long m) {
    long long r = 1 % m; b %= m;
    for (; e > 0; e >>= 1, b = b * b % m) if (e & 1) r = r * b % m;
    return r;
}
vector<long long> fact, ifact;
void buildFact(int n) {                                // O(n) + one inverse
    fact.assign(n + 1, 1); ifact.assign(n + 1, 1);
    for (int i = 1; i <= n; i++) fact[i] = fact[i - 1] * i % MOD;
    ifact[n] = powmod(fact[n], MOD - 2, MOD);
    for (int i = n; i > 0; i--) ifact[i - 1] = ifact[i] * i % MOD;
}
long long nCr(int n, int r) {
    if (r < 0 || r > n) return 0;
    return fact[n] * ifact[r] % MOD * ifact[n - r] % MOD;
}
long long smallC(long long a, long long b, long long p) {   // a, b < p
    if (b > a) return 0;
    long long num = 1, den = 1;
    for (long long i = 0; i < b; i++) { num = num * ((a - i) % p) % p; den = den * ((i + 1) % p) % p; }
    return num * powmod(den, p - 2, p) % p;
}
long long lucas(long long n, long long r, long long p) {    // C(n, r) mod prime p
    long long res = 1;
    for (; (n > 0 || r > 0) && res; n /= p, r /= p) res = res * smallC(n % p, r % p, p) % p;
    return res;
}`,
        java: `static final long MOD = 1_000_000_007L;
static long powmod(long b, long e, long m) {
    long r = 1 % m; b %= m;
    for (; e > 0; e >>= 1, b = b * b % m) if ((e & 1) == 1) r = r * b % m;
    return r;
}
static long[] fact, ifact;
static void buildFact(int n) {
    fact = new long[n + 1]; ifact = new long[n + 1];
    fact[0] = 1;
    for (int i = 1; i <= n; i++) fact[i] = fact[i - 1] * i % MOD;
    ifact[n] = powmod(fact[n], MOD - 2, MOD);
    for (int i = n; i > 0; i--) ifact[i - 1] = ifact[i] * i % MOD;
}
static long nCr(int n, int r) {
    if (r < 0 || r > n) return 0;
    return fact[n] * ifact[r] % MOD * ifact[n - r] % MOD;
}
static long smallC(long a, long b, long p) {            // a, b < p
    if (b > a) return 0;
    long num = 1, den = 1;
    for (long i = 0; i < b; i++) { num = num * ((a - i) % p) % p; den = den * ((i + 1) % p) % p; }
    return num * powmod(den, p - 2, p) % p;
}
static long lucas(long n, long r, long p) {
    long res = 1;
    for (; (n > 0 || r > 0) && res != 0; n /= p, r /= p) res = res * smallC(n % p, r % p, p) % p;
    return res;
}`,
        python: `MOD = 10**9 + 7

def build_fact(n):
    fact = [1] * (n + 1)
    for i in range(1, n + 1):
        fact[i] = fact[i - 1] * i % MOD
    ifact = [1] * (n + 1)
    ifact[n] = pow(fact[n], MOD - 2, MOD)
    for i in range(n, 0, -1):
        ifact[i - 1] = ifact[i] * i % MOD
    return fact, ifact

def ncr(n, r, fact, ifact):
    if r < 0 or r > n:
        return 0
    return fact[n] * ifact[r] % MOD * ifact[n - r] % MOD

def small_c(a, b, p):                      # a, b < p
    if b > a:
        return 0
    num = den = 1
    for i in range(b):
        num = num * (a - i) % p
        den = den * (i + 1) % p
    return num * pow(den, p - 2, p) % p

def lucas(n, r, p):                        # C(n, r) mod prime p
    res = 1
    while (n or r) and res:
        res = res * small_c(n % p, r % p, p) % p
        n //= p; r //= p
    return res`,
        js: `const MOD = 1000000007n;
function powmod(b, e, m) {                 // BigInt
  let r = 1n % m; b %= m;
  for (; e > 0n; e >>= 1n, b = b * b % m) if (e & 1n) r = r * b % m;
  return r;
}
function buildFact(n) {                    // returns [fact, ifact] as BigInt arrays
  const fact = [1n], ifact = new Array(n + 1);
  for (let i = 1; i <= n; i++) fact[i] = fact[i - 1] * BigInt(i) % MOD;
  ifact[n] = powmod(fact[n], MOD - 2n, MOD);
  for (let i = n; i > 0; i--) ifact[i - 1] = ifact[i] * BigInt(i) % MOD;
  return [fact, ifact];
}
function nCr(n, r, fact, ifact) {
  if (r < 0 || r > n) return 0n;
  return fact[n] * ifact[r] % MOD * ifact[n - r] % MOD;
}
function smallC(a, b, p) {                 // BigInt, a, b < p
  if (b > a) return 0n;
  let num = 1n, den = 1n;
  for (let i = 0n; i < b; i++) { num = num * (a - i) % p; den = den * (i + 1n) % p; }
  return num * powmod(den, p - 2n, p) % p;
}
function lucas(n, r, p) {                  // BigInt
  let res = 1n;
  for (; (n > 0n || r > 0n) && res; n /= p, r /= p) res = res * smallC(n % p, r % p, p) % p;
  return res;
}`,
        c: `#define MOD 1000000007LL
long long powmod(long long b, long long e, long long m) {
    long long r = 1 % m; b %= m;
    for (; e > 0; e >>= 1, b = b * b % m) if (e & 1) r = r * b % m;
    return r;
}
long long *fact, *ifact;
void buildFact(int n) {
    fact = malloc((n + 1) * sizeof *fact); ifact = malloc((n + 1) * sizeof *ifact);
    fact[0] = 1;
    for (int i = 1; i <= n; i++) fact[i] = fact[i - 1] * i % MOD;
    ifact[n] = powmod(fact[n], MOD - 2, MOD);
    for (int i = n; i > 0; i--) ifact[i - 1] = ifact[i] * i % MOD;
}
long long nCr(int n, int r) {
    if (r < 0 || r > n) return 0;
    return fact[n] * ifact[r] % MOD * ifact[n - r] % MOD;
}
long long smallC(long long a, long long b, long long p) {   /* a, b < p */
    if (b > a) return 0;
    long long num = 1, den = 1;
    for (long long i = 0; i < b; i++) { num = num * ((a - i) % p) % p; den = den * ((i + 1) % p) % p; }
    return num * powmod(den, p - 2, p) % p;
}
long long lucas(long long n, long long r, long long p) {
    long long res = 1;
    for (; (n > 0 || r > 0) && res; n /= p, r /= p) res = res * smallC(n % p, r % p, p) % p;
    return res;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Short patterns (code on their pages)

        - **Inclusion–exclusion by bitmask:** \`for mask in 1 … 2ᵏ−1: L = lcm of chosen; ans += (popcount odd ? +1 : −1) · n / L\`, with the lcm capped at $n + 1$ to avoid overflow.
        - **Derangements:** \`D[0] = 1, D[1] = 0, D[n] = (n − 1)(D[n − 1] + D[n − 2])\`.
        - **Expected value mod p:** run the computation in $\\mathbb Z_p$; every $/q$ becomes $\\cdot q^{p-2}$.
        - **Quotient blocks:** \`for (l = 1; l <= n; l = r + 1) { q = n / l; r = n / q; ans += q * (r − l + 1); }\`.
        - **Exact isqrt:** binary search with \`mid <= n / mid\`, or integer Newton from $x = n$.
        - **Overflow test:** $a \\cdot b > c \\iff a > \\lfloor c/b \\rfloor$.
        - **Inverse table 1…n mod prime p:** \`inv[1] = 1; inv[i] = (p − p / i) · inv[p % i] % p\`.
        - **Euler's theorem for huge exponents:** $a^{e} \\equiv a^{e \\bmod \\varphi(m)} \\pmod m$ when $\\gcd(a, m) = 1$ (for prime $m$: $e \\bmod (m-1)$).
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'The ten bugs that fail hidden tests',
      md: `
1. \`a * b % m\` overflowing because $m > 2^{31}$ — use \`__int128\` / a mulmod.
2. Negative remainders: \`(a - b) % m\` can be negative in C, C++, Java and JS — add $m$.
3. \`lcm = a * b / gcd\` overflowing — divide first.
4. Dividing mod $p$ with \`/\` instead of multiplying by the inverse.
5. Inverse of a number divisible by $p$ (e.g. $n!$ with $n \\ge p$) — it does not exist.
6. Floating-point \`sqrt\`, \`log\`, \`pow\` on 64-bit integers.
7. Sieve bound off by one (\`< n\` vs \`<= n\`), or treating 1 as prime.
8. Comparing residues mod $p$ as if they were the real values.
9. Inclusion–exclusion with product instead of lcm, or with the sign flipped.
10. \`int\` loop variables in \`i * i <= n\` and in factorial tables.
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'Thirty seconds before you code',
      md: 'Read the constraints first and map them through the table above: they usually name the technique. Then say the plan in one sentence with its complexity ("factor m by trial division, O(√m), then inclusion–exclusion over its ≤ 15 primes"), name the overflow and modulus risks, and only then write code. Interviewers grade the reasoning as much as the result.',
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-cheat-recognize', 'math-q-cheat-constraints', 'math-q-cheat-needs-inverse', 'math-q-cheat-order-ie', 'math-q-cheat-fib-mod', 'math-q-cheat-lucas'] },
  ],
}
