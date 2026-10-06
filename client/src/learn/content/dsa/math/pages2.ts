import type { Page } from '../../../types'

/* Math topic — pages, part 2: sieves, divisor functions and φ, modular arithmetic, fast power. */

export const sieve: Page = {
  id: 'sieve',
  title: 'Sieves: every prime up to n, and the factorisation of every number',
  summary: 'Eratosthenes and why it starts at p², the n log log n bound proved, bit-packed memory, the smallest-prime-factor sieve, the linear sieve, and the segmented sieve for ranges up to 10¹².',
  minutes: 22,
  blocks: [
    {
      t: 'md',
      md: `
        Primality of one number is a $\\sqrt n$ loop. But many problems need primality — or the factorisation — of **every** number up to $n$: count primes below $10^7$, factorise $10^5$ array values, precompute $\\varphi(1..n)$. Testing each number separately costs

        $$\\sum_{x=2}^{n} \\sqrt{x} \\approx \\tfrac23 n^{1.5},$$

        about $2\\cdot10^{10}$ operations for $n = 10^7$. Far too slow.

        The fix is to turn the question around. Instead of asking every number "who divides you?", let every **prime announce its multiples**: 2 crosses out 4, 6, 8, …; 3 crosses out 9, 12, 15, …; whatever is never crossed is prime. That is the **Sieve of Eratosthenes** (about 240 BC), and it runs in $O(n\\log\\log n)$ — for $n = 10^7$, about $3\\cdot10^7$ cheap steps.

        ## The algorithm

        1. Mark every number $2..n$ "maybe prime".
        2. For $p = 2, 3, 4, \\dots$ while $p^2 \\le n$: if $p$ is still unmarked, it is prime — cross out $p^2, p^2 + p, p^2 + 2p, \\dots \\le n$.
        3. Everything still unmarked is prime.

        Two details make it fast, and both need a proof:

        - **Start crossing at $p^2$, not $2p$.** A multiple $p\\cdot k$ with $k < p$ has a prime factor $q \\le k < p$ — so the smaller prime $q$ crossed it already.
        - **Stop the outer loop at $\\sqrt n$.** A composite $x \\le n$ has a prime factor $\\le \\sqrt x \\le \\sqrt n$ (if both factors of $x = ab$ exceeded $\\sqrt x$, then $ab > x$). So after the primes up to $\\sqrt n$ have crossed, every composite is gone.

        **Correctness, as an invariant.** When the outer loop reaches $p$, a number $x$ is crossed **iff** it has a prime factor $q < p$ with $q^2 \\le x$. (Prime $q$ crosses exactly its multiples $\\ge q^2$, and only primes cross — a composite $p$ is skipped.) Now if $p$ itself is composite, its smallest prime factor $q$ satisfies $q^2 \\le p$, so $p$ is crossed; contrapositive: **an uncrossed $p$ is prime.** At the end, every composite $x \\le n$ has smallest prime $q \\le \\sqrt n$ with $q^2 \\le x$, so it is crossed. ∎
      `,
    },
    {
      t: 'viz',
      algo: 'math-sieve-eratosthenes',
      caption: 'Watch 12, 18, 24, 30: they get crossed by 2 and then again by 3. Those repeat crossings are the whole difference between n log log n and n. And notice 3 starts at 9, 5 at 25, 7 at 49.',
    },
    {
      t: 'code',
      title: 'Sieve of Eratosthenes — all primes ≤ n',
      code: {
        cpp: `vector<int> primesUpTo(int n) {
    vector<bool> composite(n + 1, false);        // 1 bit per number
    vector<int> primes;
    for (long long p = 2; p <= n; p++) {
        if (composite[p]) continue;
        primes.push_back((int) p);
        for (long long j = p * p; j <= n; j += p)   // long long: p*p overflows int near 2^31
            composite[j] = true;
    }
    return primes;
}`,
        java: `static List<Integer> primesUpTo(int n) {
    boolean[] composite = new boolean[n + 1];
    List<Integer> primes = new ArrayList<>();
    for (long p = 2; p <= n; p++) {
        if (composite[(int) p]) continue;
        primes.add((int) p);
        for (long j = p * p; j <= n; j += p)        // long: p*p overflows int near 2^31
            composite[(int) j] = true;
    }
    return primes;
}`,
        python: `def primes_up_to(n):
    if n < 2:
        return []
    is_prime = bytearray([1]) * (n + 1)
    is_prime[0] = is_prime[1] = 0
    p = 2
    while p * p <= n:
        if is_prime[p]:
            # slice assignment crosses all multiples in C speed
            is_prime[p * p::p] = bytes(len(range(p * p, n + 1, p)))
        p += 1
    return [i for i in range(n + 1) if is_prime[i]]`,
        js: `function primesUpTo(n) {
  const composite = new Uint8Array(n + 1);
  const primes = [];
  for (let p = 2; p <= n; p++) {
    if (composite[p]) continue;
    primes.push(p);
    for (let j = p * p; j <= n; j += p) composite[j] = 1;
  }
  return primes;
}`,
        c: `/* returns a malloc'd array of the primes <= n; *count receives its length */
int *primesUpTo(int n, int *count) {
    char *composite = calloc(n + 1, 1);
    int *primes = malloc(sizeof(int) * (n / 2 + 2)), k = 0;
    for (long long p = 2; p <= n; p++) {
        if (composite[p]) continue;
        primes[k++] = (int) p;
        for (long long j = p * p; j <= n; j += p) composite[j] = 1;
    }
    free(composite);
    *count = k;
    return primes;
}`,
      },
      note: 'This version runs p all the way to n so it can collect the primes in one pass; the inner loop is simply empty once p² > n.',
    },
    {
      t: 'md',
      md: `
        ## Why $O(n \\log\\log n)$ — a full derivation

        Prime $p$ crosses about $n/p$ numbers, so the total work is

        $$W(n) \\;\\le\\; \\sum_{p \\le \\sqrt n} \\frac{n}{p} \\;=\\; n \\sum_{p \\le \\sqrt n} \\frac1p.$$

        If we summed $1/k$ over **all** $k$ we would get the harmonic number $H \\approx \\ln n$. Summing only over primes gives something far smaller: **$\\sum_{p \\le x} 1/p = \\ln\\ln x + O(1)$** (Mertens, 1874; the constant is $\\approx 0.2615$). Here is a self-contained proof of the upper bound we need.
      `,
    },
    {
      t: 'steps',
      title: 'Proof that Σ 1/p over primes p ≤ x is O(log log x)',
      items: [
        {
          title: 'The product of primes up to x is at most 4^x',
          md: 'Every prime $p$ with $m + 1 < p \\le 2m + 1$ divides $\\binom{2m+1}{m} = \\frac{(2m+1)!}{m!\\,(m+1)!}$: it appears in the numerator and not in the denominator. And $\\binom{2m+1}{m} \\le 4^m$, because it and the equal term $\\binom{2m+1}{m+1}$ together are at most $\\sum_k \\binom{2m+1}{k} = 2^{2m+1}$. So $\\prod_{m+1 < p \\le 2m+1} p \\le 4^m$. By strong induction on $x$ (for odd $x = 2m + 1$ use the bound for $m + 1$; even $x > 2$ is not prime, so it has the same product as $x - 1$): $\\prod_{p \\le x} p \\le 4^{m+1}\\cdot4^m = 4^{2m+1} = 4^x$. Taking logs: $\\theta(x) = \\sum_{p \\le x}\\ln p \\le x\\ln 4$.',
        },
        {
          title: 'Bound one dyadic block',
          md: 'Look at the primes in $(2^k, 2^{k+1}]$. Each one has $\\frac1p = \\frac{\\ln p}{p\\ln p} \\le \\frac{\\ln p}{2^k \\cdot k\\ln 2}$. Summing and using step 1: $\\sum_{2^k < p \\le 2^{k+1}} \\frac1p \\le \\frac{\\theta(2^{k+1})}{2^k\\,k\\ln2} \\le \\frac{2^{k+1}\\ln4}{2^k\\,k\\ln2} = \\frac{4}{k}$.',
        },
        {
          title: 'Add up the blocks',
          md: 'For $k = 1, \\dots, \\lceil\\log_2 x\\rceil$ (plus the prime 2 on its own): $\\sum_{p \\le x}\\frac1p \\le \\frac12 + \\sum_{k=1}^{\\lceil \\log_2 x\\rceil} \\frac4k = O(\\ln\\log_2 x) = O(\\log\\log x)$, because a harmonic sum up to $K$ is $\\le \\ln K + 1$.',
        },
        {
          title: 'Plug into the sieve',
          md: '$W(n) \\le n\\sum_{p \\le \\sqrt n}\\frac1p = O(n\\log\\log\\sqrt n) = O(n\\log\\log n)$. The bound is tight: Euler showed $\\sum_{p\\le x} 1/p \\ge \\ln\\ln x - 1$ (expand $\\prod_{p \\le x}(1 - 1/p)^{-1} \\ge \\sum_{k \\le x} 1/k \\ge \\ln x$ and take logs). So the sieve is $\\Theta(n\\log\\log n)$.',
        },
      ],
    },
    {
      t: 'md',
      md: `
        In numbers: for $n = 10^6$ the sieve makes about $2.2\\cdot10^6$ cross-outs; $\\ln\\ln 10^6 \\approx 2.6$. **$\\log\\log n$ never exceeds 4 for any $n$ you will ever store**, so in practice the sieve is "linear with a constant of about 3" — the real bottleneck is memory traffic, not the crossing count.

        ## Memory: bits, odd numbers, cache

        A \`bool\` per number costs a byte: $10^8$ bytes = 100 MB, over most memory limits. Three standard savings:

        - **One bit per number.** C++ \`vector<bool>\` and \`bitset\`, Java \`BitSet\`, or manual \`uint64\` words: $n/8$ bytes — 12.5 MB for $10^8$.
        - **Odd numbers only.** 2 is the only even prime, so store only $3, 5, 7, \\dots$: index $i$ stands for $2i + 1$. Half the memory and half the work; the multiples of an odd $p$ worth crossing are $p^2, p^2 + 2p, \\dots$ (the odd ones), i.e. index step $p$.
        - **Cache.** Crossing with a large stride touches a new cache line every step. Once $n$ outgrows the cache (a few MB), a **segmented** sieve — below — that processes blocks of ~32 KB is several times faster even for the full range $[2, n]$.
      `,
    },
    {
      t: 'code',
      title: 'Odd-only sieve: half the memory (index i ↔ number 2i + 1)',
      code: {
        cpp: `// counts primes <= n using (n+1)/2 bytes; swap vector<char> for vector<bool> for bits
long long countPrimes(long long n) {
    if (n < 2) return 0;
    long long half = (n - 1) / 2;                 // odd numbers 3, 5, ..., <= n
    vector<char> comp(half + 1, 0);               // comp[i] <=> 2i+1 composite
    for (long long i = 1; (2 * i + 1) * (2 * i + 1) <= n; i++) {
        if (comp[i]) continue;
        long long p = 2 * i + 1;
        for (long long j = (p * p - 1) / 2; j <= half; j += p) comp[j] = 1;   // p^2, p^2+2p, ...
    }
    long long cnt = 1;                            // the prime 2
    for (long long i = 1; i <= half; i++) cnt += !comp[i];
    return cnt;
}`,
        java: `static long countPrimes(long n) {
    if (n < 2) return 0;
    int half = (int) ((n - 1) / 2);               // odd numbers 3, 5, ..., <= n
    boolean[] comp = new boolean[half + 1];       // comp[i] <=> 2i+1 composite
    for (long i = 1; (2 * i + 1) * (2 * i + 1) <= n; i++) {
        if (comp[(int) i]) continue;
        long p = 2 * i + 1;
        for (long j = (p * p - 1) / 2; j <= half; j += p) comp[(int) j] = true;
    }
    long cnt = 1;                                 // the prime 2
    for (int i = 1; i <= half; i++) if (!comp[i]) cnt++;
    return cnt;
}`,
        python: `def count_primes(n):
    if n < 2:
        return 0
    half = (n - 1) // 2                           # odd numbers 3, 5, ..., <= n
    comp = bytearray(half + 1)                    # comp[i] <=> 2i+1 composite
    i = 1
    while (2 * i + 1) ** 2 <= n:
        if not comp[i]:
            p = 2 * i + 1
            start = (p * p - 1) // 2
            comp[start::p] = b'\\x01' * len(range(start, half + 1, p))
        i += 1
    return 1 + comp.count(0) - 1                  # +1 for the prime 2, -1 for index 0 (the number 1)`,
        js: `function countPrimes(n) {
  if (n < 2) return 0;
  const half = Math.floor((n - 1) / 2);           // odd numbers 3, 5, ..., <= n
  const comp = new Uint8Array(half + 1);          // comp[i] <=> 2i+1 composite
  for (let i = 1; (2 * i + 1) * (2 * i + 1) <= n; i++) {
    if (comp[i]) continue;
    const p = 2 * i + 1;
    for (let j = (p * p - 1) / 2; j <= half; j += p) comp[j] = 1;
  }
  let cnt = 1;                                    // the prime 2
  for (let i = 1; i <= half; i++) if (!comp[i]) cnt++;
  return cnt;
}`,
        c: `long long countPrimes(long long n) {
    if (n < 2) return 0;
    long long half = (n - 1) / 2;                 /* odd numbers 3, 5, ..., <= n */
    char *comp = calloc(half + 1, 1);             /* comp[i] <=> 2i+1 composite */
    for (long long i = 1; (2 * i + 1) * (2 * i + 1) <= n; i++) {
        if (comp[i]) continue;
        long long p = 2 * i + 1;
        for (long long j = (p * p - 1) / 2; j <= half; j += p) comp[j] = 1;
    }
    long long cnt = 1;                            /* the prime 2 */
    for (long long i = 1; i <= half; i++) cnt += !comp[i];
    free(comp);
    return cnt;
}`,
      },
      note: 'Index 0 stands for the number 1, which is never crossed and never counted. Why the index step is p: consecutive odd multiples of p differ by 2p, and index = (number − 1) / 2 halves that.',
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'The bugs people actually write',
      md: `
        - **\`int j = p * p\` overflows** when $p > 46340$. With $n$ near $2^{31}$ that silently wraps negative and the loop runs forever or writes out of bounds. Use 64-bit for \`p * p\`.
        - **Forgetting 0 and 1.** They are not prime; a sieve that starts "all true" must clear them. And $n < 2$ must return no primes without touching index 1 of a size-1 array.
        - **\`p * p < n\` instead of \`<= n\`.** For $n = 49$ that misses crossing 49.
        - **Allocating \`n\` instead of \`n + 1\`** cells, then reading \`isPrime[n]\`.
      `,
    },
    {
      t: 'md',
      md: `
        ## The smallest-prime-factor sieve: factorise anything in $O(\\log x)$

        Change one thing: instead of a yes/no mark, write **which prime** got there first. Let $\\text{spf}[x]$ be the smallest prime factor of $x$. When prime $p$ visits $j$ and finds it still empty, set $\\text{spf}[j] = p$; if it is taken, leave it.

        **Claim: the first prime to reach $j$ is its smallest prime factor $q$.** Primes are processed in increasing order, so no prime smaller than $q$ ever reaches $j$ (they don't divide it), and $q$ does reach $j$ because $j \\ge q^2$ (if $j$ is composite, $j = q\\cdot k$ with $k \\ge q$). Primes larger than $\\sqrt n$ write only themselves.

        **Factorising $x$** is then a walk: output $\\text{spf}[x]$, replace $x$ by $x/\\text{spf}[x]$, repeat until 1. Each step divides by at least 2, so **there are at most $\\log_2 x$ steps** — for $x \\le 10^7$, at most 23 lookups, versus a $\\sqrt x \\approx 3162$-step trial division.
      `,
    },
    {
      t: 'viz',
      algo: 'math-sieve-spf',
      caption: 'Each prime writes itself only into empty cells. Then the factor walk jumps 60 → 30 → 15 → 5 → 1 along the arrows — the number at least halves on every jump.',
    },
    {
      t: 'md',
      md: `
        The SPF table answers many questions in $O(\\log x)$ each: the distinct prime factors, the number of divisors (count runs of equal primes, multiply $e + 1$), $\\varphi(x)$, whether $x$ is square-free. It costs one \`int\` per number (40 MB for $10^7$), so it is the tool when you must factorise **many** numbers up to a few times $10^7$.

        ## The linear sieve: each composite written exactly once

        Eratosthenes crosses 12 twice (by 2 and by 3) and 30 three times. The **linear (Euler) sieve** produces every composite $m$ exactly once, from the pair

        $$m = \\text{lp}(m) \\cdot i, \\qquad i = m / \\text{lp}(m),$$

        where $\\text{lp}(m)$ is the least prime factor. It walks $i = 2..n$ and, for each prime $p \\le \\text{lp}(i)$ (in increasing order, while $i\\cdot p \\le n$), sets $\\text{lp}[i\\cdot p] = p$.

        **Proof that every composite is written exactly once.**

        - *At least once.* Let $m \\le n$ be composite, $p = \\text{lp}(m)$, $i = m/p \\ge 2$. Every prime factor of $i$ divides $m$, so $\\text{lp}(i) \\ge p$. When the loop is at $i$, the prime $p$ is already in the list ($p \\le i$) and passes the test $p \\le \\text{lp}(i)$ — so $\\text{lp}[m] = p$ is written.
        - *At most once.* If the pair $(i, p)$ writes $m = ip$, then $p \\le \\text{lp}(i)$, so $p$ is the smallest prime of $m$: $p = \\text{lp}(m)$, and then $i = m/p$ is forced. One pair, one write.

        So the inner loop body runs exactly once per composite, the outer loop once per $i$: **$\\Theta(n)$ total**. ∎
      `,
    },
    {
      t: 'viz',
      algo: 'math-sieve-linear',
      caption: 'Each arrow i → i·p is the single write of that cell. The orange "stop" frames are the trick: at i = 9, p = 5 would produce 45, but lp(45) = 3 — 45 waits for i = 15, p = 3.',
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Linear in theory, not always faster in practice',
      md: 'The linear sieve stores an `int` per number and a list of primes, and does a multiplication per write; a bit-packed Eratosthenes touches 32× less memory. For just "is it prime / count primes", the bitset Eratosthenes usually wins. The linear sieve earns its place when you want **lp[] and a multiplicative function** (φ, μ, d) for all $n$ in one $O(n)$ pass — see the next page.',
    },
    {
      t: 'md',
      md: `
        ## The segmented sieve: primes in $[L, R]$ with $R$ up to $10^{12}$

        "Print the primes between $L = 10^{12} - 10^6$ and $R = 10^{12}$." An array of $10^{12}$ cells is impossible, and trial division on $10^6$ numbers at $10^6$ steps each is $10^{12}$ operations. But we only need the window:

        - **Every composite $x \\le R$ has a prime factor $\\le \\sqrt R$** (the same argument as before). With $R = 10^{12}$ that is $10^6$: sieve the **base primes** up to $\\sqrt R$ once — 78 498 of them.
        - Keep one boolean per number of the **segment**: index $x - L$.
        - For each base prime $p$, cross its multiples inside $[L, R]$, starting at the first multiple of $p$ that is $\\ge L$, i.e. $\\lceil L/p \\rceil \\cdot p$ — but **never below $p^2$**, so that $p$ itself is not crossed when it lies in the window.

        Cost: $O(\\sqrt R \\log\\log R)$ for the base sieve plus, per base prime, $(R - L)/p + 1$ steps — $O((R - L)\\log\\log R + \\pi(\\sqrt R))$. For the example: about $3\\cdot10^6$ steps. Memory: $\\sqrt R + (R - L)$ cells.
      `,
    },
    {
      t: 'viz',
      algo: 'math-sieve-segmented',
      caption: 'Only the window is stored. Watch each base prime compute its own starting point ⌈L/p⌉·p and stride through the segment; try L = 1 to see why max(p², …) matters.',
    },
    {
      t: 'code',
      title: 'Segmented sieve — complete, with the base sieve',
      code: {
        cpp: `// primes in [L, R]; works for R up to ~1e12 with R - L up to ~1e7
vector<long long> primesInRange(long long L, long long R) {
    long long lim = sqrtl((long double) R);
    while (lim * lim > R) lim--;
    while ((lim + 1) * (lim + 1) <= R) lim++;
    vector<char> small(lim + 1, 1);
    vector<long long> base;
    for (long long p = 2; p <= lim; p++) {
        if (!small[p]) continue;
        base.push_back(p);
        for (long long j = p * p; j <= lim; j += p) small[j] = 0;
    }
    vector<char> seg(R - L + 1, 1);
    for (long long p : base)
        for (long long j = max(p * p, (L + p - 1) / p * p); j <= R; j += p) seg[j - L] = 0;
    vector<long long> out;
    for (long long x = max(L, 2LL); x <= R; x++) if (seg[x - L]) out.push_back(x);
    return out;
}`,
        java: `static List<Long> primesInRange(long L, long R) {
    int lim = (int) Math.sqrt((double) R);
    while ((long) lim * lim > R) lim--;
    while ((long) (lim + 1) * (lim + 1) <= R) lim++;
    boolean[] comp = new boolean[lim + 1];
    List<Long> base = new ArrayList<>();
    for (int p = 2; p <= lim; p++) {
        if (comp[p]) continue;
        base.add((long) p);
        for (long j = (long) p * p; j <= lim; j += p) comp[(int) j] = true;
    }
    boolean[] segComp = new boolean[(int) (R - L + 1)];
    for (long p : base)
        for (long j = Math.max(p * p, (L + p - 1) / p * p); j <= R; j += p) segComp[(int) (j - L)] = true;
    List<Long> out = new ArrayList<>();
    for (long x = Math.max(L, 2); x <= R; x++) if (!segComp[(int) (x - L)]) out.add(x);
    return out;
}`,
        python: `from math import isqrt

def primes_in_range(L, R):
    lim = isqrt(R)
    small = bytearray([1]) * (lim + 1)
    base = []
    for p in range(2, lim + 1):
        if small[p]:
            base.append(p)
            small[p * p::p] = bytes(len(range(p * p, lim + 1, p)))
    seg = bytearray([1]) * (R - L + 1)
    for p in base:
        start = max(p * p, (L + p - 1) // p * p)
        if start <= R:
            seg[start - L::p] = bytes(len(range(start, R + 1, p)))
    return [x for x in range(max(L, 2), R + 1) if seg[x - L]]`,
        js: `// exact while R < 2^53; R up to 1e12 is fine
function primesInRange(L, R) {
  let lim = Math.floor(Math.sqrt(R));
  while (lim * lim > R) lim--;
  while ((lim + 1) * (lim + 1) <= R) lim++;
  const small = new Uint8Array(lim + 1).fill(1);
  const base = [];
  for (let p = 2; p <= lim; p++) {
    if (!small[p]) continue;
    base.push(p);
    for (let j = p * p; j <= lim; j += p) small[j] = 0;
  }
  const seg = new Uint8Array(R - L + 1).fill(1);
  for (const p of base)
    for (let j = Math.max(p * p, Math.ceil(L / p) * p); j <= R; j += p) seg[j - L] = 0;
  const out = [];
  for (let x = Math.max(L, 2); x <= R; x++) if (seg[x - L]) out.push(x);
  return out;
}`,
        c: `/* fills out[] with the primes in [L, R]; returns how many. out needs room for R - L + 1 values. */
int primesInRange(long long L, long long R, long long *out) {
    long long lim = (long long) sqrtl((long double) R);
    while (lim * lim > R) lim--;
    while ((lim + 1) * (lim + 1) <= R) lim++;
    char *small = malloc(lim + 1), *seg = malloc(R - L + 1);
    memset(small, 1, lim + 1);
    memset(seg, 1, R - L + 1);
    for (long long p = 2; p <= lim; p++) {
        if (!small[p]) continue;
        for (long long j = p * p; j <= lim; j += p) small[j] = 0;
        long long start = (L + p - 1) / p * p;
        if (start < p * p) start = p * p;
        for (long long j = start; j <= R; j += p) seg[j - L] = 0;
    }
    int k = 0;
    for (long long x = L < 2 ? 2 : L; x <= R; x++) if (seg[x - L]) out[k++] = x;
    free(small); free(seg);
    return k;
}`,
      },
      note: 'The square root is computed in floating point and then corrected by ±1 — sqrt of a number near 10¹² can be off by one after rounding, and an off-by-one here drops a base prime.',
    },
    {
      t: 'complexity',
      title: 'Sieves at a glance',
      rows: [
        { op: 'Trial division of every x ≤ n', time: 'Θ(n√n / log n)', space: 'O(1)', note: 'the baseline the sieve replaces' },
        { op: 'Eratosthenes', time: 'Θ(n log log n)', space: 'n bits (n/2 odd-only)', note: '≈ 2.5n cross-outs in practice' },
        { op: 'Smallest-prime-factor sieve', time: 'Θ(n log log n) build', space: 'n ints', note: 'then factorise any x ≤ n in O(log x)' },
        { op: 'Linear (Euler) sieve', time: 'Θ(n)', space: 'n ints + π(n) primes', note: 'each composite written once; gives lp[] and multiplicative functions' },
        { op: 'Segmented sieve on [L, R]', time: 'O((R − L) log log R + √R)', space: 'O(√R + R − L)', note: 'R up to 10¹², window up to ~10⁷' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How sieves show up in interviews',
      md: `
        - **"Count primes less than n"** (LeetCode 204) — the interviewer wants Eratosthenes, the start-at-$p^2$ argument, and the complexity; a strong answer mentions $O(n\\log\\log n)$ and the bit/odd-only memory savings.
        - **"Closest prime pair in [L, R]"** or "primes in a range with R up to 10⁹" — segmented sieve, and why base primes up to $\\sqrt R$ suffice.
        - **"Factorise 10⁵ numbers up to 10⁶"** or "count distinct prime factors of each array element" — SPF table, $O(\\log x)$ per query.
        - Follow-up: *"what if n = 10¹⁰?"* — memory forces a segmented sieve; *"what if you only need π(n)?"* — mention that sub-linear prime-counting algorithms (Lucy/Meissel–Lehmer, $O(n^{3/4})$ or better) exist.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-sieve-start', 'math-q-sieve-cross-count', 'math-q-sieve-spf-array', 'math-q-sieve-linear-pair', 'math-q-sieve-segment-start', 'math-q-sieve-fill', 'math-q-sieve-memory', 'math-q-sieve-match'] },
  ],
}

export const divisorFunctions: Page = {
  id: 'divisor-functions',
  title: 'Divisor functions and Euler’s φ',
  summary: 'Counting and summing divisors from the factorisation (with proofs), listing divisors in O(√n), the harmonic divisor sieve, multiplicative functions, Euler’s totient with its formula, φ sieves, Σφ(d) = n, and how many divisors a number can really have.',
  minutes: 22,
  blocks: [
    {
      t: 'md',
      md: `
        "How many divisors does $n$ have?" "What is the sum of the divisors of $n$?" "How many $k \\le n$ have $\\gcd(k, n) = 1$?" These three questions — $d(n)$, $\\sigma(n)$, $\\varphi(n)$ — sit underneath a surprising number of problems: counting fractions, cyclic patterns, perfect numbers, complexity bounds for "loop over the divisors of every element".

        The naive answer loops $k = 1..n$ and tests $n \\bmod k$: $O(n)$, hopeless for $n = 10^{12}$. The key insight: **all three are determined by the prime factorisation**, which costs $O(\\sqrt n)$.

        ## Divisors are exponent vectors

        Write $n = p_1^{e_1} p_2^{e_2} \\cdots p_k^{e_k}$ (the Fundamental Theorem of Arithmetic says this is unique). **Claim: the divisors of $n$ are exactly the numbers $p_1^{f_1}\\cdots p_k^{f_k}$ with $0 \\le f_i \\le e_i$, each obtained once.**

        *Proof.* Such a number divides $n$: the quotient is $\\prod p_i^{e_i - f_i}$, an integer. Conversely if $d \\mid n$, write $n = d\\cdot c$; any prime of $d$ divides $n$, so it is some $p_i$, and comparing exponents in the unique factorisation of $n = dc$ gives $f_i \\le e_i$. Different exponent vectors give different numbers, again by uniqueness. ∎

        ## The number of divisors $d(n)$

        Choosing a divisor = choosing each $f_i$ independently from $e_i + 1$ options, so

        $$d(n) = (e_1 + 1)(e_2 + 1)\\cdots(e_k + 1).$$

        Example: $360 = 2^3\\cdot3^2\\cdot5$, so $d(360) = 4\\cdot3\\cdot2 = 24$.

        ## The sum of divisors $\\sigma(n)$

        Expand the product of geometric series

        $$(1 + p_1 + \\dots + p_1^{e_1})(1 + p_2 + \\dots + p_2^{e_2})\\cdots(1 + p_k + \\dots + p_k^{e_k}).$$

        By the distributive law it is the sum of all products that pick one term $p_i^{f_i}$ from each bracket — that is, **every divisor exactly once**. Summing each geometric series:

        $$\\sigma(n) = \\prod_{i=1}^{k} \\frac{p_i^{e_i + 1} - 1}{p_i - 1}.$$

        Example: $\\sigma(12) = (1 + 2 + 4)(1 + 3) = 28 = 1 + 2 + 3 + 4 + 6 + 12$, and $\\sigma(360) = 15\\cdot13\\cdot6 = 1170$. A number with $\\sigma(n) = 2n$ is **perfect** (6, 28, 496, 8128).
      `,
    },
    {
      t: 'code',
      title: 'd(n) and σ(n) from trial-division factorisation — O(√n)',
      code: {
        cpp: `// n up to ~1e12: sqrt(n) = 1e6 iterations; sigma(n) < 2^63 for n <= 1e17
pair<long long, long long> divisorCountAndSum(long long n) {
    long long d = 1, s = 1;
    for (long long p = 2; p * p <= n; p++) {
        if (n % p) continue;
        long long e = 0, pk = 1, geo = 1;          // geo = 1 + p + ... + p^e
        while (n % p == 0) { n /= p; e++; pk *= p; geo += pk; }
        d *= e + 1;
        s *= geo;
    }
    if (n > 1) { d *= 2; s *= 1 + n; }             // one prime > sqrt(original n) is left
    return {d, s};
}`,
        java: `static long[] divisorCountAndSum(long n) {
    long d = 1, s = 1;
    for (long p = 2; p * p <= n; p++) {
        if (n % p != 0) continue;
        long e = 0, pk = 1, geo = 1;               // geo = 1 + p + ... + p^e
        while (n % p == 0) { n /= p; e++; pk *= p; geo += pk; }
        d *= e + 1;
        s *= geo;
    }
    if (n > 1) { d *= 2; s *= 1 + n; }             // one prime > sqrt(original n) is left
    return new long[]{d, s};
}`,
        python: `def divisor_count_and_sum(n):
    d, s, p = 1, 1, 2
    while p * p <= n:
        if n % p == 0:
            e, pk, geo = 0, 1, 1                   # geo = 1 + p + ... + p^e
            while n % p == 0:
                n //= p; e += 1; pk *= p; geo += pk
            d *= e + 1
            s *= geo
        p += 1
    if n > 1:                                      # one prime > sqrt(original n) is left
        d *= 2; s *= 1 + n
    return d, s`,
        js: `// exact while sigma(n) < 2^53 (n up to ~1e15); use BigInt beyond
function divisorCountAndSum(n) {
  let d = 1, s = 1;
  for (let p = 2; p * p <= n; p++) {
    if (n % p !== 0) continue;
    let e = 0, pk = 1, geo = 1;                    // geo = 1 + p + ... + p^e
    while (n % p === 0) { n /= p; e++; pk *= p; geo += pk; }
    d *= e + 1;
    s *= geo;
  }
  if (n > 1) { d *= 2; s *= 1 + n; }               // one prime > sqrt(original n) is left
  return [d, s];
}`,
        c: `void divisorCountAndSum(long long n, long long *d, long long *s) {
    *d = 1; *s = 1;
    for (long long p = 2; p * p <= n; p++) {
        if (n % p) continue;
        long long e = 0, pk = 1, geo = 1;          /* geo = 1 + p + ... + p^e */
        while (n % p == 0) { n /= p; e++; pk *= p; geo += pk; }
        *d *= e + 1;
        *s *= geo;
    }
    if (n > 1) { *d *= 2; *s *= 1 + n; }           /* one prime > sqrt(original n) is left */
}`,
      },
      note: 'Why one leftover prime at most: after removing every prime ≤ √n, what remains has no factor ≤ √n, so it is 1 or a single prime (two such primes would multiply past n).',
    },
    {
      t: 'md',
      md: `
        ## Listing the divisors in $O(\\sqrt n)$

        Divisors come in **pairs** $(d, n/d)$, and in each pair the smaller one is at most $\\sqrt n$: if $d \\cdot e = n$ with $d \\le e$ then $d^2 \\le de = n$. So try $d = 1, 2, \\dots, \\lfloor\\sqrt n\\rfloor$; every hit gives two divisors, $d$ and $n/d$ — except when $d = n/d$, i.e. $n$ is a perfect square, where the pair is one number.

        Collect the small ones ascending and the partners descending, and concatenate: the full list comes out **sorted** without a sort.
      `,
    },
    {
      t: 'viz',
      algo: 'math-phi-divisors',
      caption: 'n = 36: each successful test produces two divisors, except d = 6 = 36/6, which must be added once. Try n = 97 (prime: only the pair 1, 97) and n = 360.',
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Perfect squares and float square roots',
      md: 'Two classic bugs: adding $\\sqrt n$ twice for perfect squares (so $d(36)$ comes out 10 instead of 9), and looping `i <= sqrt(n)` with a floating-point `sqrt` that returns 5.9999999 for 36. Loop on `i * i <= n` in integer arithmetic instead (64-bit if $n > 2^{31}$).',
    },
    {
      t: 'md',
      md: `
        ## Divisor counts for all of $1..n$: the harmonic sieve

        To get $d(m)$ for every $m \\le n$, don't factorise each $m$. Turn the loop inside out: **for each $d$, add 1 to every multiple of $d$** — $d$ divides exactly those numbers. Divisor $d$ touches $\\lfloor n/d \\rfloor$ cells, so the work is

        $$\\sum_{d=1}^{n} \\left\\lfloor\\frac nd\\right\\rfloor \\le n\\sum_{d=1}^{n}\\frac1d = n\\,H_n.$$

        **Why $H_n \\le \\ln n + 1$:** for $d \\ge 2$, $\\frac1d \\le \\int_{d-1}^{d}\\frac{dx}{x}$ (the curve is above $1/d$ on that interval), so $H_n \\le 1 + \\int_1^n \\frac{dx}{x} = 1 + \\ln n$. The sieve is $O(n\\log n)$ — for $n = 10^6$ about $1.4\\cdot10^7$ increments.

        The same skeleton computes $\\sigma$ for all $m$ (add $d$ instead of 1), or any "sum over divisors" $\\sum_{d \\mid m} f(d)$.
      `,
    },
    {
      t: 'viz',
      algo: 'math-phi-divcount',
      caption: 'Each d lights up its ⌊n/d⌋ multiples. The work per d shrinks like n/d — the meter ends near n·ln n, far below the n·√n of trial-dividing each number.',
    },
    {
      t: 'md',
      md: `
        ## Multiplicative functions

        A function $f$ on positive integers is **multiplicative** if $f(1) = 1$ and

        $$f(ab) = f(a)\\,f(b) \\quad \\text{whenever } \\gcd(a, b) = 1.$$

        **$d$ is multiplicative.** If $\\gcd(a, b) = 1$, every divisor of $ab$ splits uniquely as $d_1 d_2$ with $d_1 \\mid a$, $d_2 \\mid b$ (the primes of $a$ and $b$ are disjoint, so sort each prime power of the divisor to the side it came from). That is a bijection between divisors of $ab$ and pairs, so $d(ab) = d(a)d(b)$. The same bijection gives $\\sigma(ab) = \\sum d_1 d_2 = \\sigma(a)\\sigma(b)$.

        **Coprime is essential:** $d(4) = 3$ but $d(2)\\,d(2) = 4$. Functions with $f(ab) = f(a)f(b)$ for **all** $a, b$ (like $f(n) = n^2$) are called *completely* multiplicative; $d$, $\\sigma$, $\\varphi$ are not.

        **Why it matters:** a multiplicative function is fixed by its values on prime powers. Compute $f(p^e)$ by a formula, multiply over the factorisation — exactly what the $d$ and $\\sigma$ formulas did.

        ## Euler’s totient $\\varphi(n)$

        $\\varphi(n)$ counts the $k \\in [1, n]$ with $\\gcd(k, n) = 1$. Examples: $\\varphi(1) = 1$, $\\varphi(9) = 6$ (1, 2, 4, 5, 7, 8), $\\varphi(12) = 4$ (1, 5, 7, 11).

        - **Prime $p$:** every $k < p$ is coprime to it, so $\\varphi(p) = p - 1$.
        - **Prime power $p^e$:** $k$ shares a factor with $p^e$ iff $p \\mid k$. Of $1..p^e$, exactly $p^{e-1}$ are multiples of $p$, so $\\varphi(p^e) = p^e - p^{e-1} = p^e\\left(1 - \\tfrac1p\\right)$.

        ### The product formula

        $$\\varphi(n) = n\\prod_{p \\mid n}\\left(1 - \\frac1p\\right).$$

        *Proof (inclusion–exclusion).* Let $p_1, \\dots, p_k$ be the distinct primes of $n$. $k$ is coprime to $n$ iff no $p_i$ divides $k$. For any set $S$ of these primes, the numbers in $1..n$ divisible by all of them are the multiples of $\\prod_{i\\in S} p_i$ — exactly $n / \\prod_{i \\in S}p_i$ of them (it divides $n$). Inclusion–exclusion counts the numbers divisible by none:

        $$\\varphi(n) = n - \\sum_i \\frac{n}{p_i} + \\sum_{i<j}\\frac{n}{p_ip_j} - \\dots = n\\prod_{i=1}^{k}\\left(1 - \\frac1{p_i}\\right),$$

        the last step being the expansion of the product (each subset $S$ contributes $(-1)^{|S|}/\\prod_S p_i$). ∎ As a consequence $\\varphi$ is multiplicative: for coprime $a, b$ the primes of $ab$ are those of $a$ plus those of $b$, so the products split.

        Example: $\\varphi(36) = 36\\cdot\\tfrac12\\cdot\\tfrac23 = 12$, $\\varphi(100) = 100\\cdot\\tfrac12\\cdot\\tfrac45 = 40$.

        **In integer code, never multiply by the fraction.** Do \`res -= res / p\`: it is exact, because at that moment $p$ still divides \`res\`.
      `,
    },
    {
      t: 'code',
      title: 'φ(n) for one n — O(√n)',
      code: {
        cpp: `long long phi(long long n) {
    long long res = n;
    for (long long p = 2; p * p <= n; p++) {
        if (n % p) continue;
        while (n % p == 0) n /= p;
        res -= res / p;                  // res *= (1 - 1/p), exactly
    }
    if (n > 1) res -= res / n;           // leftover prime > sqrt
    return res;
}`,
        java: `static long phi(long n) {
    long res = n;
    for (long p = 2; p * p <= n; p++) {
        if (n % p != 0) continue;
        while (n % p == 0) n /= p;
        res -= res / p;                  // res *= (1 - 1/p), exactly
    }
    if (n > 1) res -= res / n;           // leftover prime > sqrt
    return res;
}`,
        python: `def phi(n):
    res, p = n, 2
    while p * p <= n:
        if n % p == 0:
            while n % p == 0:
                n //= p
            res -= res // p              # res *= (1 - 1/p), exactly
        p += 1
    if n > 1:                            # leftover prime > sqrt
        res -= res // n
    return res`,
        js: `function phi(n) {
  let res = n;
  for (let p = 2; p * p <= n; p++) {
    if (n % p !== 0) continue;
    while (n % p === 0) n /= p;
    res -= res / p;                      // exact: p divides res here
  }
  if (n > 1) res -= res / n;             // leftover prime > sqrt
  return res;
}`,
        c: `long long phi(long long n) {
    long long res = n;
    for (long long p = 2; p * p <= n; p++) {
        if (n % p) continue;
        while (n % p == 0) n /= p;
        res -= res / p;                  /* res *= (1 - 1/p), exactly */
    }
    if (n > 1) res -= res / n;           /* leftover prime > sqrt */
    return res;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## φ for all of $1..n$

        The sieve version applies the factor $(1 - 1/p)$ to every multiple of every prime: start with $\\varphi[i] = i$; when the loop meets an untouched $p$ (still $\\varphi[p] = p$, so no smaller prime divides it — it is prime), do \`phi[j] -= phi[j] / p\` for all multiples $j$ of $p$.

        **Why the division is exact.** Just before prime $p$ is processed, $\\varphi[j] = j\\prod_{q < p,\\, q \\mid j}(1 - 1/q) = \\frac{j}{\\prod q}\\prod(q - 1)$. The factor $p$ of $j$ is still inside $j / \\prod q$, so $p \\mid \\varphi[j]$. Same loop shape as Eratosthenes (but starting at $p$, not $p^2$ — every multiple needs the factor): $O(n\\log\\log n)$.
      `,
    },
    {
      t: 'viz',
      algo: 'math-phi-sieve',
      caption: 'Follow cell 12: 12 → 12 − 6 = 6 when p = 2, then 6 − 2 = 4 when p = 3. Every prime p leaves phi[p] = p − 1 behind.',
    },
    {
      t: 'md',
      md: `
        **With the linear sieve, in $O(n)$.** When the linear sieve writes $m = i\\cdot p$ (with $p = \\text{lp}(m)$):

        - if $p \\mid i$, then $m$ has the same primes as $i$, so $\\varphi(m) = p\\cdot\\varphi(i)$ (the formula's $n$ grew by $p$, the product didn't change);
        - otherwise $\\gcd(i, p) = 1$ and multiplicativity gives $\\varphi(m) = \\varphi(i)\\,(p - 1)$.
      `,
    },
    {
      t: 'code',
      title: 'φ for 1..n with the linear sieve — O(n)',
      code: {
        cpp: `vector<int> phiLinear(int n) {
    vector<int> phi(n + 1), lp(n + 1, 0), primes;
    if (n >= 1) phi[1] = 1;
    for (int i = 2; i <= n; i++) {
        if (lp[i] == 0) { lp[i] = i; phi[i] = i - 1; primes.push_back(i); }
        for (int p : primes) {
            if (p > lp[i] || (long long) i * p > n) break;
            lp[i * p] = p;
            phi[i * p] = (p == lp[i]) ? phi[i] * p : phi[i] * (p - 1);
        }
    }
    return phi;
}`,
        java: `static int[] phiLinear(int n) {
    int[] phi = new int[n + 1], lp = new int[n + 1];
    List<Integer> primes = new ArrayList<>();
    if (n >= 1) phi[1] = 1;
    for (int i = 2; i <= n; i++) {
        if (lp[i] == 0) { lp[i] = i; phi[i] = i - 1; primes.add(i); }
        for (int p : primes) {
            if (p > lp[i] || (long) i * p > n) break;
            lp[i * p] = p;
            phi[i * p] = (p == lp[i]) ? phi[i] * p : phi[i] * (p - 1);
        }
    }
    return phi;
}`,
        python: `def phi_linear(n):
    phi, lp, primes = [0] * (n + 1), [0] * (n + 1), []
    if n >= 1:
        phi[1] = 1
    for i in range(2, n + 1):
        if lp[i] == 0:
            lp[i], phi[i] = i, i - 1
            primes.append(i)
        for p in primes:
            if p > lp[i] or i * p > n:
                break
            lp[i * p] = p
            phi[i * p] = phi[i] * p if p == lp[i] else phi[i] * (p - 1)
    return phi`,
        js: `function phiLinear(n) {
  const phi = new Int32Array(n + 1), lp = new Int32Array(n + 1), primes = [];
  if (n >= 1) phi[1] = 1;
  for (let i = 2; i <= n; i++) {
    if (lp[i] === 0) { lp[i] = i; phi[i] = i - 1; primes.push(i); }
    for (const p of primes) {
      if (p > lp[i] || i * p > n) break;
      lp[i * p] = p;
      phi[i * p] = p === lp[i] ? phi[i] * p : phi[i] * (p - 1);
    }
  }
  return phi;
}`,
        c: `/* phi, lp: n + 1 ints each, lp zeroed; primes: room for n ints */
void phiLinear(int n, int *phi, int *lp, int *primes) {
    int cnt = 0;
    if (n >= 1) phi[1] = 1;
    for (int i = 2; i <= n; i++) {
        if (lp[i] == 0) { lp[i] = i; phi[i] = i - 1; primes[cnt++] = i; }
        for (int k = 0; k < cnt; k++) {
            int p = primes[k];
            if (p > lp[i] || (long long) i * p > n) break;
            lp[i * p] = p;
            phi[i * p] = (p == lp[i]) ? phi[i] * p : phi[i] * (p - 1);
        }
    }
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## The identity $\\sum_{d \\mid n}\\varphi(d) = n$

        Group the numbers $k = 1..n$ by $g = \\gcd(k, n)$. Write $k = g\\cdot k'$ and $n = g\\cdot n'$: then $\\gcd(k, n) = g$ exactly when $\\gcd(k', n') = 1$ with $1 \\le k' \\le n'$ — and there are $\\varphi(n') = \\varphi(n/g)$ such $k'$. Every $k$ lands in exactly one group, so

        $$n = \\sum_{g \\mid n}\\varphi(n/g) = \\sum_{d \\mid n}\\varphi(d)$$

        (as $g$ runs over the divisors, so does $d = n/g$). Check with $n = 12$: $\\varphi(1) + \\varphi(2) + \\varphi(3) + \\varphi(4) + \\varphi(6) + \\varphi(12) = 1 + 1 + 2 + 2 + 2 + 4 = 12$.

        A reading worth remembering: **among the fractions $\\frac1n, \\frac2n, \\dots, \\frac nn$, reduced to lowest terms, exactly $\\varphi(d)$ have denominator $d$.** It is why "count reduced fractions with denominator ≤ N" is $\\sum_{d \\le N}\\varphi(d)$, and why $\\gcd$-sum problems like $\\sum_{k=1}^n \\gcd(k, n) = \\sum_{d \\mid n} d\\,\\varphi(n/d)$ fall apart neatly.

        ## How many divisors can a number have?

        Many solutions loop over the divisors of every element. To bound them you need the true maximum of $d(n)$, not the trivial $2\\sqrt n$ (from the pairing argument):

        | $n \\le$ | max $d(n)$ | attained at |
        |---|---|---|
        | $10^3$ | 32 | 840 |
        | $10^5$ | 128 | 83 160 |
        | $10^6$ | 240 | 720 720 |
        | $10^9$ | 1 344 | 735 134 400 |
        | $10^{12}$ | 6 720 | 963 761 198 400 |
        | $10^{18}$ | 103 680 | 897 612 484 786 617 600 |

        **The maximum grows slower than any power $n^\\varepsilon$**, but in contest ranges a rough rule is "about $\\sqrt[3]{n}$": $10^6$ for $10^{18}$, a thousand-ish for $10^9$. So "for each of $10^5$ values up to $10^9$, iterate its divisors" is at most $1.3\\cdot10^8$ steps — fine; computing those divisors by $\\sqrt n$ trial division ($3\\cdot10^9$) is not — use the SPF table or factorise once.

        The record-holders (*highly composite numbers*) all look alike: small primes with **non-increasing exponents**, $2^a3^b5^c\\cdots$ with $a \\ge b \\ge c \\ge \\dots$ — swapping a larger exponent onto a smaller prime keeps $d(n)$ and makes $n$ smaller.
      `,
    },
    {
      t: 'complexity',
      title: 'Divisor functions at a glance',
      rows: [
        { op: 'd(n), σ(n), φ(n) for one n', time: 'O(√n)', space: 'O(1)', note: 'trial-division factorisation; O(log n) with an SPF table' },
        { op: 'List all divisors of n', time: 'O(√n)', space: 'O(d(n))', note: 'pairs (d, n/d); sorted for free' },
        { op: 'd or σ for all m ≤ n', time: 'O(n log n)', space: 'O(n)', note: 'harmonic sieve Σ n/d' },
        { op: 'φ for all m ≤ n', time: 'O(n log log n)', space: 'O(n)', note: 'Eratosthenes-style; O(n) with the linear sieve' },
        { op: 'Divisors of a factorised n', time: 'O(d(n))', space: 'O(d(n))', note: 'generate exponent vectors — no trial division' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'Where these show up',
      md: `
        - **"Which numbers have exactly three divisors?"** $d(n) = 3 = (e + 1)$ forces one prime with $e = 2$: squares of primes. Sieve primes up to $\\sqrt N$ and count.
        - **"Four divisors: sum the divisors of the array elements that have exactly four"** (LeetCode 1390) — enumerate in $O(\\sqrt n)$, stop early after 5.
        - **"Count reduced fractions / coprime pairs up to N"** — $\\sum \\varphi$, with a φ sieve.
        - **Bulb switcher** (LeetCode 319): a bulb ends on iff it is toggled an odd number of times iff $d(k)$ is odd iff $k$ is a perfect square — the answer is $\\lfloor\\sqrt n\\rfloor$. The interviewer checks that you know divisors pair up.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-phi-dcount', 'math-q-phi-sigma', 'math-q-phi-totient', 'math-q-phi-sum-divisors', 'math-q-phi-three-divisors', 'math-q-phi-multiplicative', 'math-q-phi-maxdiv', 'math-q-phi-sieve-fill'] },
  ],
}

export const modularArithmetic: Page = {
  id: 'modular-arithmetic',
  title: 'Modular arithmetic: computing with remainders',
  summary: 'Congruences and why +, −, × respect them (and division does not), normalising negatives in every language, overflow-safe multiplication, why 10⁹+7, hashing and counting mod p, and Fermat’s and Euler’s theorems with proofs.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        "Count the paths in a $1000 \\times 1000$ grid" — the answer has about 600 digits. Problems with huge answers ask for them **modulo $10^9 + 7$**, and hash functions, cyclic schedules and checksums all compute with remainders. Modular arithmetic is the algebra that makes this legal: it tells you **when you may reduce early** (almost always) **and when you may not** (division, comparison).

        ## Congruence

        For a modulus $m \\ge 1$, $a \\bmod m$ is the remainder $r$ with $a = qm + r$, $0 \\le r < m$. We say

        $$a \\equiv b \\pmod m \\iff m \\mid (a - b),$$

        "$a$ and $b$ leave the same remainder". It is an equivalence relation (reflexive, symmetric, transitive — e.g. $m \\mid a - b$ and $m \\mid b - c$ give $m \\mid a - c$), so the integers fall into $m$ classes $\\{0, 1, \\dots, m - 1\\}$.

        ## $+$, $-$, $\\times$ respect congruence

        **Theorem.** If $a \\equiv a'$ and $b \\equiv b' \\pmod m$, then $a + b \\equiv a' + b'$, $a - b \\equiv a' - b'$ and $ab \\equiv a'b'$.

        *Proof.* Write $a' = a + km$ and $b' = b + lm$. Then $a' \\pm b' = (a \\pm b) + (k \\pm l)m$, and

        $$a'b' = ab + (al + bk + klm)\\,m.$$

        In each case the difference is a multiple of $m$. ∎

        **Consequence: you may reduce after every operation.** Any expression built from $+$, $-$, $\\times$ (and therefore powers, sums, products, polynomial evaluation, matrix products, DP transitions that only add and multiply) gives the same remainder whether you reduce at the end or after every step. Reducing early keeps numbers small enough for machine words.

        Example — the last digit of $7^{222}$: modulo 10, $7^2 = 49 \\equiv 9$, $7^4 \\equiv 81 \\equiv 1$. Since $222 = 4\\cdot55 + 2$, $7^{222} = (7^4)^{55}\\cdot7^2 \\equiv 1\\cdot49 \\equiv 9$.
      `,
    },
    {
      t: 'md',
      md: `
        ## Division is different

        $2\\cdot3 \\equiv 2\\cdot8 \\pmod{10}$ (both are 6 mod 10), yet $3 \\not\\equiv 8$. Cancelling the 2 failed because 2 shares a factor with 10. The precise rule:

        **Cancellation law.** $ca \\equiv cb \\pmod m \\implies a \\equiv b \\pmod{m / \\gcd(c, m)}$. In particular, if $\\gcd(c, m) = 1$ you may cancel $c$ outright.

        *Proof.* Let $g = \\gcd(c, m)$, $c = gc'$, $m = gm'$ with $\\gcd(c', m') = 1$. From $m \\mid c(a - b)$ we get $m' \\mid c'(a - b)$; since $m'$ shares no prime with $c'$, every prime power of $m'$ must divide $a - b$, so $m' \\mid a - b$. ∎

        And reducing a quotient is simply wrong: $\\frac{12}{4} = 3 \\equiv 3 \\pmod 5$, but $\\frac{12 \\bmod 5}{4 \\bmod 5} = \\frac24$ isn't even an integer. **To "divide by $b$" modulo $m$ you multiply by the modular inverse $b^{-1}$, which exists exactly when $\\gcd(b, m) = 1$** — always, for a prime modulus and $b \\not\\equiv 0$. Computing it is the subject of the modular-inverse page; Fermat's theorem below already gives one way.

        Comparisons don't survive either: after reducing, $10^9 + 8$ becomes 1, smaller than 5. **Never take min/max or compare values that were reduced mod $m$** — reduce only quantities you will add or multiply further.

        ## Negative numbers: every language disagrees

        Mathematically $-7 \\bmod 3 = 2$. But:

        | language | \`-7 % 3\` | rule |
        |---|---|---|
        | C, C++ (since C99/C++11), Java, JavaScript, C#, Go, Rust | $-1$ | remainder takes the sign of the dividend (truncating division) |
        | Python, Ruby | $2$ | remainder takes the sign of the divisor (floor division) |

        So in C-family languages a subtraction can leave a negative "remainder" that then indexes an array out of bounds or breaks equality checks. **Normalise**: \`((a % m) + m) % m\` for any $a$, or for values already in $[0, m)$, \`(a - b + m) % m\`. Java also offers \`Math.floorMod(a, m)\`.
      `,
    },
    {
      t: 'code',
      title: 'Safe add, subtract, multiply, normalise (m < 2³¹)',
      code: {
        cpp: `const long long MOD = 1'000'000'007;
long long norm(long long a) { a %= MOD; return a < 0 ? a + MOD : a; }   // any a
long long add(long long a, long long b) { return (a + b) % MOD; }      // a, b in [0, MOD)
long long sub(long long a, long long b) { return (a - b + MOD) % MOD; }
long long mul(long long a, long long b) { return a * b % MOD; }        // < 2^60 before %
// with int operands write 1LL * a * b % MOD — int * int overflows before any widening`,
        java: `static final long MOD = 1_000_000_007L;
static long norm(long a) { return Math.floorMod(a, MOD); }            // any a
static long add(long a, long b) { return (a + b) % MOD; }             // a, b in [0, MOD)
static long sub(long a, long b) { return (a - b + MOD) % MOD; }
static long mul(long a, long b) { return a * b % MOD; }               // < 2^60 before %
// with int operands write (long) a * b % MOD — int * int overflows first`,
        python: `MOD = 10**9 + 7
def norm(a): return a % MOD          # Python's % is already non-negative for MOD > 0
def add(a, b): return (a + b) % MOD
def sub(a, b): return (a - b) % MOD
def mul(a, b): return a * b % MOD    # big ints: no overflow, but keep numbers small for speed`,
        js: `const MOD = 1000000007;
const norm = (a) => ((a % MOD) + MOD) % MOD;          // any a
const add = (a, b) => (a + b) % MOD;                  // a, b in [0, MOD)
const sub = (a, b) => (a - b + MOD) % MOD;
// a * b can reach 1e18 > 2^53: plain Numbers LOSE digits. Split b into 16-bit halves:
const mul = (a, b) => ((a * (b >>> 16)) % MOD * 65536 + a * (b & 65535)) % MOD;
// (or use BigInt: Number(BigInt(a) * BigInt(b) % 1000000007n))`,
        c: `const long long MOD = 1000000007LL;
long long norm(long long a) { a %= MOD; return a < 0 ? a + MOD : a; }  /* any a */
long long add(long long a, long long b) { return (a + b) % MOD; }      /* a, b in [0, MOD) */
long long sub(long long a, long long b) { return (a - b + MOD) % MOD; }
long long mul(long long a, long long b) { return a * b % MOD; }        /* < 2^60 before % */`,
      },
      note: 'JavaScript\'s split multiply is exact because a < 2³⁰ and each partial product stays below 2⁴⁷, well inside the 2⁵³ range of exact integers.',
    },
    {
      t: 'md',
      md: `
        ## Overflow: how big can $a \\cdot b$ get?

        With $a, b < m$, the product is below $m^2$. Signed 64-bit integers hold up to $2^{63} - 1 \\approx 9.22\\cdot10^{18}$.

        - $m < 2^{31}$ (e.g. $10^9 + 7$): $m^2 < 2^{62}$ — **\`a * b % m\` is safe in 64-bit**, as long as the multiplication actually happens in 64 bits.
        - $m$ up to $10^{18}$ (64-bit hashing, Miller–Rabin, $2^{61} - 1$): $m^2 \\approx 10^{36}$ — overflow. Options:
          - C/C++ (GCC/Clang): \`(__int128) a * b % m\` — one instruction, the standard choice.
          - Java: \`Math.multiplyHigh\` + careful reduction, or \`BigInteger\`, or the doubling method below.
          - Python: nothing to do — integers are arbitrary precision.
          - JavaScript: \`BigInt\`.
          - Anywhere: **multiply by doubling** — the "Russian peasant" method computes $a\\cdot b$ as a sum of $a\\cdot2^i$ over the set bits of $b$, keeping every intermediate below $2m$: $O(\\log b)$ additions, no overflow for $m < 2^{62}$.
      `,
    },
    {
      t: 'viz',
      algo: 'math-mod-mulmod',
      caption: 'The invariant res + a·b ≡ original a·b (mod m) holds at every frame, while a keeps doubling mod m. Nothing stored ever exceeds 2m. Try a = 123456789012, b = 987654, m = 1000000000039.',
    },
    {
      t: 'code',
      title: 'a·b mod m for m up to ~10¹⁸',
      code: {
        cpp: `// GCC/Clang: 128-bit intermediate, O(1)
unsigned long long mulmod(unsigned long long a, unsigned long long b, unsigned long long m) {
    return (unsigned __int128) a * b % m;
}`,
        java: `// exact for 0 <= a, b < m < 2^62: Math.multiplyHigh gives the top 64 bits; BigInteger is simplest
static long mulmod(long a, long b, long m) {
    return java.math.BigInteger.valueOf(a).multiply(java.math.BigInteger.valueOf(b))
            .mod(java.math.BigInteger.valueOf(m)).longValue();
}`,
        python: `def mulmod(a, b, m):
    return a * b % m          # arbitrary-precision integers: always exact`,
        js: `// BigInt arithmetic is exact at any size
function mulmod(a, b, m) {
  return Number((BigInt(a) * BigInt(b)) % BigInt(m));   // Number() is exact while m < 2^53
}`,
        c: `/* GCC/Clang: 128-bit intermediate */
unsigned long long mulmod(unsigned long long a, unsigned long long b, unsigned long long m) {
    return (unsigned long long) ((unsigned __int128) a * b % m);
}`,
      },
      note: 'In a hot loop in Java, the doubling method from the animation (pure long arithmetic) avoids BigInteger allocations.',
    },
    {
      t: 'md',
      md: `
        ## Why $10^9 + 7$?

        - **It is prime.** Every nonzero residue then has an inverse, so division (by anything not a multiple of the modulus) works — needed for $\\binom nk = \\frac{n!}{k!(n-k)!}$ and expected values.
        - **It fits.** $10^9 + 7 < 2^{30}$, so the sum of two residues is below $2^{31}$ (fits a signed 32-bit int) and the product of two is below $2^{60}$ (fits a signed 64-bit int with room to spare).
        - **It is big.** Different true answers rarely collide mod a number this size, and in hashing a random collision has probability about $10^{-9}$ per pair.
        - **It is easy to type** and everyone uses it. Its sibling $998\\,244\\,353 = 119\\cdot2^{23} + 1$ is chosen when the problem needs the number-theoretic transform (it has $2^{23}$-th roots of unity).

        ## Modular arithmetic in counting and hashing

        **Counting.** A DP like "paths[i][j] = paths[i−1][j] + paths[i][j−1]" only adds, so reducing every cell mod $p$ gives the true answer mod $p$ — the theorem above. Products of counts (independent choices) are fine too. What breaks: dividing (use inverses), subtracting without re-normalising, and comparing reduced values.

        **Polynomial hashing.** Map a string to $H(s) = (s_0B^{n-1} + s_1B^{n-2} + \\dots + s_{n-1}) \\bmod p$. Prefix hashes $h_{i+1} = (h_i\\cdot B + s_i) \\bmod p$ give the hash of any substring in $O(1)$ — all with $+$ and $\\times$, so reducing is legal.

        **Why collisions are rare — a real bound.** For two different strings $s \\ne t$ of length $n$, $H(s) - H(t)$ is a nonzero polynomial in $B$ of degree $\\le n - 1$ with coefficients mod $p$. Modulo a prime, a nonzero polynomial of degree $k$ has at most $k$ roots (the same proof as over the reals: each root $r$ splits off a factor $(B - r)$, which needs division by the leading coefficient — legal because $p$ is prime). So for a uniformly random base $B$, $\\Pr[H(s) = H(t)] \\le \\frac{n-1}{p}$. Comparing $k$ substrings pairwise multiplies this by up to $k^2/2$ — which is why with $10^5$–$10^6$ comparisons people use **two moduli** or the Mersenne prime $2^{61} - 1$ (needs 128-bit multiplication).
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Mod bugs that pass the samples',
      md: `
        - \`int a, b; long long x = a * b % MOD;\` — the product is computed in **int** and overflows before it is widened. Write \`1LL * a * b % MOD\`.
        - \`(a - b) % MOD\` in C++/Java/JS is negative when $a < b$ — the answer prints as a negative number, or the next array index crashes.
        - \`sum += x\` for $10^6$ terms of size $10^9$ without reducing: $10^{15}$ fits 64-bit, but squaring the result later does not. Reduce as you go.
        - \`ans = max(ans, dp % MOD)\` — comparing reduced values compares remainders, not magnitudes.
        - JavaScript: \`a * b % MOD\` with $a, b \\approx 10^9$ loses the low digits silently (products above $2^{53}$ round).
      `,
    },
    {
      t: 'md',
      md: `
        ## Fermat's little theorem

        **Theorem.** If $p$ is prime and $p \\nmid a$, then $a^{p-1} \\equiv 1 \\pmod p$. (Multiplying by $a$: $a^p \\equiv a$ for **every** $a$.)

        *Proof.* Consider the $p - 1$ numbers $a\\cdot1, a\\cdot2, \\dots, a\\cdot(p-1)$ modulo $p$.

        1. **None is 0:** $p \\mid ak$ with $p \\nmid a$ would need $p \\mid k$, impossible for $1 \\le k < p$.
        2. **They are distinct:** $ak \\equiv ak'$ means $p \\mid a(k - k')$, so $p \\mid k - k'$, so $k = k'$.

        So they are $1, 2, \\dots, p - 1$ in some order — a permutation. Multiply all of them:

        $$a^{p-1}\\cdot(p-1)! \\equiv (p-1)! \\pmod p.$$

        $(p-1)!$ is a product of numbers coprime to $p$, so it is coprime to $p$ and can be cancelled (cancellation law). Hence $a^{p-1} \\equiv 1$. ∎
      `,
    },
    {
      t: 'viz',
      algo: 'math-mod-fermat',
      caption: 'The bottom row is the top row shuffled — that is the whole proof. Then try m = 12, a = 5 (Euler’s version: only the 4 residues coprime to 12 take part) and m = 12, a = 4 to see the permutation, and the theorem, break.',
    },
    {
      t: 'md',
      md: `
        ## Euler's theorem

        **Theorem.** If $\\gcd(a, m) = 1$ then $a^{\\varphi(m)} \\equiv 1 \\pmod m$.

        *Proof.* Exactly the same argument, applied to the $\\varphi(m)$ residues $r_1, \\dots, r_{\\varphi(m)}$ coprime to $m$. Multiplying by $a$ keeps each coprime to $m$ (no prime of $m$ divides $a$ or $r_i$), never maps two to the same class (cancel $a$, legal since $\\gcd(a, m) = 1$), so it permutes them. Multiply: $a^{\\varphi(m)}\\prod r_i \\equiv \\prod r_i$, and $\\prod r_i$ is coprime to $m$, so cancel. ∎ For prime $m = p$, $\\varphi(p) = p - 1$ and this is Fermat.

        What the theorems buy you:

        - **Inverses mod a prime:** $a\\cdot a^{p-2} = a^{p-1} \\equiv 1$, so $a^{-1} \\equiv a^{p-2} \\pmod p$ — one fast power.
        - **Shrinking exponents:** $a^b \\equiv a^{b \\bmod \\varphi(m)}$ when $\\gcd(a, m) = 1$ (details and traps on the fast-power page).
        - **A primality test (with a catch):** if $a^{n-1} \\not\\equiv 1 \\pmod n$ for some $a$, $n$ is certainly composite. The converse fails: **Carmichael numbers** such as $561 = 3\\cdot11\\cdot17$ satisfy $a^{560} \\equiv 1$ for every $a$ coprime to 561. That is why real primality tests (Miller–Rabin) check more.

        Example: $3^{100} \\bmod 7$. By Fermat $3^6 \\equiv 1$, and $100 = 6\\cdot16 + 4$, so $3^{100} \\equiv 3^4 = 81 \\equiv 4$.
      `,
    },
    {
      t: 'complexity',
      title: 'Costs of modular operations',
      rows: [
        { op: 'a ± b mod m, a·b mod m (m < 2³¹)', time: 'O(1)', note: '64-bit product, one division' },
        { op: 'a·b mod m (m < 2⁶³) with __int128', time: 'O(1)', note: 'GCC/Clang; ~2–5× a 64-bit multiply' },
        { op: 'a·b mod m by doubling', time: 'O(log b)', note: 'portable, no wide types' },
        { op: 'Normalise a negative value', time: 'O(1)', note: '((a % m) + m) % m' },
        { op: 'Rolling hash of a substring', time: 'O(1) after O(n) prefix hashes', note: 'collision ≤ (n − 1)/p per pair for random base' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'What interviewers probe',
      md: `
        - "Return the answer modulo $10^9 + 7$" — they watch for reductions **inside** the loop, \`long\` products, and correct handling of subtraction.
        - "Why can you take mod at every step but not divide?" — cite the proof: congruence is preserved by $+, -, \\times$; division needs an inverse.
        - Rabin–Karp / "find duplicate substrings": they ask about collisions. Say: random base, large prime, verify on hash match or double-hash; the $\\frac{n-1}{p}$ root-counting bound.
        - "What is $2^{100} \\bmod 7$ in your head?" — $2^3 = 8 \\equiv 1$, $100 = 3\\cdot33 + 1$, so $2$.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-mod-neg', 'math-q-mod-last-digit', 'math-q-mod-cancel', 'math-q-mod-overflow', 'math-q-mod-fermat', 'math-q-mod-carmichael', 'math-q-mod-why-prime', 'math-q-mod-fill-norm'] },
  ],
}

export const fastPower: Page = {
  id: 'fast-power',
  title: 'Fast power: binary exponentiation and matrix power',
  summary: 'aᵇ in O(log b) by repeated squaring — recursive and iterative, with proofs — then the same idea on matrices: Fibonacci and any linear recurrence in O(k³ log n), fast doubling, and when you may shrink the exponent with Euler.',
  minutes: 22,
  blocks: [
    {
      t: 'md',
      md: `
        Compute $3^{10^{18}} \\bmod (10^9 + 7)$. Multiplying by 3 one step at a time is $10^{18}$ multiplications — centuries. Yet the answer takes **60 squarings**.

        The idea is that squaring **doubles** the exponent: $3 \\to 3^2 \\to 3^4 \\to 3^8 \\to \\dots$ reaches $3^{2^{60}}$ in 60 steps. Every exponent is a sum of powers of two (its binary expansion), so every power is a product of some of these squares.

        ## Recursive form

        $$a^b = \\begin{cases} 1 & b = 0 \\\\ \\left(a^{\\lfloor b/2\\rfloor}\\right)^2 & b \\text{ even} \\\\ \\left(a^{\\lfloor b/2\\rfloor}\\right)^2\\cdot a & b \\text{ odd} \\end{cases}$$

        **Correctness** by strong induction on $b$: for $b = 2k$, $(a^k)^2 = a^{2k}$; for $b = 2k + 1$, $(a^k)^2\\cdot a = a^{2k+1}$; the recursive call has a smaller exponent $k < b$ (for $b \\ge 1$).

        **Cost:** $T(b) = T(\\lfloor b/2 \\rfloor) + O(1)$, so $T(b) = O(\\log b)$: the exponent loses one bit per call, there are $\\lfloor\\log_2 b\\rfloor + 1$ calls before it reaches 0, and each does at most two multiplications. **The crucial detail: compute $a^{\\lfloor b/2\\rfloor}$ once and square it.** Writing \`power(a, b/2) * power(a, b/2)\` makes two calls per level — $T(b) = 2T(b/2) + O(1) = O(b)$, all the gain lost.
      `,
    },
    {
      t: 'viz',
      algo: 'math-pow-recursive',
      caption: 'The recursion is a single chain 13 → 6 → 3 → 1 → 0. On the way back each call squares its child’s answer and, for odd b, multiplies by a once more.',
    },
    {
      t: 'md',
      md: `
        ## Iterative form, and its invariant

        Read the bits of $b$ from least significant up. Keep \`base\` $= a^{2^i}$ (square it each round) and multiply it into \`res\` when bit $i$ is 1:

        $$3^{13} = 3^{8}\\cdot3^{4}\\cdot3^{1}, \\qquad 13 = 1101_2.$$

        **Invariant:** at the top of every round, $\\text{res}\\cdot\\text{base}^{b} \\equiv a^{b_0} \\pmod m$, where $b_0$ is the original exponent and $b$ the remaining one.

        - *Initially* res $= 1$, base $= a$, $b = b_0$. ✓
        - *One round:* if $b$ is odd, $\\text{res}\\cdot\\text{base}^b = (\\text{res}\\cdot\\text{base})\\cdot\\text{base}^{b-1}$, so moving one factor into res keeps the product; now $b$ (or $b - 1$) is even and $\\text{base}^{2k} = (\\text{base}^2)^{k}$, so squaring base and halving $b$ keeps it too.
        - *At the end* $b = 0$, so res $\\equiv a^{b_0}$. ∎

        It does exactly $\\lfloor\\log_2 b\\rfloor + 1$ squarings and $\\text{popcount}(b)$ multiplications, uses $O(1)$ memory and no recursion.
      `,
    },
    {
      t: 'viz',
      algo: 'math-pow-binary',
      caption: 'Each row of the table is one round. When the bit is 1, the current base (a to a power of two) joins res; the base is squared every round regardless. The invariant res·base^b ≡ a^13 holds at every frame.',
    },
    {
      t: 'steps',
      title: 'Trace: 3¹³ mod 1000 by hand',
      items: [
        { title: 'b = 13 = 1101₂, res = 1, base = 3', md: 'Bit 0 is 1: res = 3. Square: base = 9, b = 6.' },
        { title: 'b = 6, bit 1 is 0', md: 'res stays 3. Square: base = 81, b = 3.' },
        { title: 'b = 3, bit 2 is 1', md: 'res = 3·81 = 243. Square: base = 6561 mod 1000 = 561, b = 1.' },
        { title: 'b = 1, bit 3 is 1', md: 'res = 243·561 = 136 323 → 323. Square (unused): base = 721, b = 0. Answer: $3^{13} = 1\\,594\\,323 \\equiv 323$.' },
      ],
    },
    {
      t: 'code',
      title: 'Modular power for any 64-bit modulus',
      code: {
        cpp: `// a^b mod m for m up to ~1.8e19 (128-bit intermediate products)
unsigned long long power(unsigned long long a, unsigned long long b, unsigned long long m) {
    unsigned long long res = 1 % m;
    a %= m;
    while (b > 0) {
        if (b & 1) res = (unsigned __int128) res * a % m;
        a = (unsigned __int128) a * a % m;
        b >>= 1;
    }
    return res;
}`,
        java: `import java.math.BigInteger;
// built-in, exact for any sizes; for m < 2^31 the long loop from the animation is faster
static long power(long a, long b, long m) {
    return BigInteger.valueOf(a).modPow(BigInteger.valueOf(b), BigInteger.valueOf(m)).longValue();
}`,
        python: `# built-in: three-argument pow is binary exponentiation, exact for any sizes
def power(a, b, m):
    return pow(a, b, m)`,
        js: `// BigInt keeps every product exact
function power(a, b, m) {
  a = BigInt(a) % BigInt(m); b = BigInt(b); m = BigInt(m);
  let res = 1n % m;
  while (b > 0n) {
    if (b & 1n) res = res * a % m;
    a = a * a % m;
    b >>= 1n;
  }
  return res;
}`,
        c: `/* a^b mod m for m up to ~1.8e19 (GCC/Clang 128-bit intermediates) */
unsigned long long power(unsigned long long a, unsigned long long b, unsigned long long m) {
    unsigned long long res = 1 % m;
    a %= m;
    while (b > 0) {
        if (b & 1) res = (unsigned long long) ((unsigned __int128) res * a % m);
        a = (unsigned long long) ((unsigned __int128) a * a % m);
        b >>= 1;
    }
    return res;
}`,
      },
      note: '`1 % m` rather than `1`: with m = 1 every answer is 0, and a loop that never runs (b = 0) would otherwise return 1.',
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Only associativity is used',
      md: 'Nothing in the proof needed numbers: only that the product is **associative** and has an identity. So the same loop raises **matrices**, polynomials mod $x^n$, permutations (apply a shuffle $10^{18}$ times), or functions under composition to a huge power — $O(\\log b)$ "multiplications" of whatever kind. Commutativity is not needed: every factor is a power of the same element.',
    },
    {
      t: 'md',
      md: `
        ## Matrix exponentiation

        Multiplying $k\\times k$ matrices, $C_{ij} = \\sum_{t} A_{it}B_{tj}$, costs $k^3$ multiplications, and matrix product is associative. So $M^n$ takes $O(k^3\\log n)$ operations by fast power, starting from the identity $I$.

        **Fibonacci.** $F_0 = 0$, $F_1 = 1$, $F_{n+1} = F_n + F_{n-1}$. Put two consecutive terms in a vector; one step of the recurrence is a matrix multiplication:

        $$\\begin{pmatrix}F_{n+1}\\\\F_n\\end{pmatrix} = \\begin{pmatrix}1 & 1\\\\1 & 0\\end{pmatrix}\\begin{pmatrix}F_n\\\\F_{n-1}\\end{pmatrix}.$$

        Row 1 is the recurrence $F_{n+1} = 1\\cdot F_n + 1\\cdot F_{n-1}$; row 2 just copies $F_n$ down. Applying it $n$ times: **$M^n = \\begin{pmatrix}F_{n+1} & F_n\\\\F_n & F_{n-1}\\end{pmatrix}$** — by induction: true for $n = 1$, and $M^{n+1} = M^n M$ has first row $(F_{n+1} + F_n,\\; F_{n+1}) = (F_{n+2}, F_{n+1})$ and second row $(F_n + F_{n-1},\\; F_n) = (F_{n+1}, F_n)$. So $F_n \\bmod m$ for $n = 10^{18}$ costs about 60 squarings of a $2\\times2$ matrix.
      `,
    },
    {
      t: 'viz',
      algo: 'math-pow-matrix',
      caption: 'Same loop as integer fast power — B is squared every round, and multiplied into R when the bit of n is 1. The exponents of R add up to n; R[0][1] is F(n).',
    },
    {
      t: 'md',
      md: `
        ## Any linear recurrence

        For $a_n = c_1a_{n-1} + c_2a_{n-2} + \\dots + c_ka_{n-k}$, the state is the last $k$ terms and the **companion matrix** shifts it:

        $$\\begin{pmatrix}a_n\\\\a_{n-1}\\\\\\vdots\\\\a_{n-k+1}\\end{pmatrix} = \\begin{pmatrix}c_1 & c_2 & \\cdots & c_{k-1} & c_k\\\\1 & 0 & \\cdots & 0 & 0\\\\ & \\ddots & & & \\\\0 & 0 & \\cdots & 1 & 0\\end{pmatrix}\\begin{pmatrix}a_{n-1}\\\\a_{n-2}\\\\\\vdots\\\\a_{n-k}\\end{pmatrix}.$$

        First row = the recurrence; the subdiagonal of 1s shifts each term down one slot. Then $(a_n, \\dots, a_{n-k+1})^T = M^{\\,n-k+1}(a_{k-1}, \\dots, a_0)^T$ for $n \\ge k - 1$.

        **Constants and extra terms: grow the state.** For $a_n = 2a_{n-1} + 3a_{n-2} + 5$, add a component that is always 1:

        $$\\begin{pmatrix}a_n\\\\a_{n-1}\\\\1\\end{pmatrix} = \\begin{pmatrix}2 & 3 & 5\\\\1 & 0 & 0\\\\0 & 0 & 1\\end{pmatrix}\\begin{pmatrix}a_{n-1}\\\\a_{n-2}\\\\1\\end{pmatrix}.$$

        The same trick carries a running sum $S_n = S_{n-1} + a_n$, a polynomial term like $n$ (carry $n$ and 1: $n \\to n + 1$), or several interleaved sequences. The rule: **if the next state is a linear combination of the current state, it is a matrix.** Typical uses: "number of length-$n$ strings avoiding a pattern" with $n = 10^{18}$, tilings of a $3\\times n$ board, paths of exactly $n$ steps in a graph ($A^n$ of the adjacency matrix counts them).
      `,
    },
    {
      t: 'code',
      title: 'k × k matrix power mod m — O(k³ log n)',
      code: {
        cpp: `typedef vector<vector<long long>> Mat;
const long long MOD = 1'000'000'007;
Mat mul(const Mat& A, const Mat& B) {
    int k = A.size();
    Mat C(k, vector<long long>(k, 0));
    for (int i = 0; i < k; i++)
        for (int t = 0; t < k; t++) {
            if (A[i][t] == 0) continue;
            for (int j = 0; j < k; j++) C[i][j] = (C[i][j] + A[i][t] * B[t][j]) % MOD;
        }
    return C;
}
Mat matPow(Mat M, long long n) {
    int k = M.size();
    Mat R(k, vector<long long>(k, 0));
    for (int i = 0; i < k; i++) R[i][i] = 1;               // identity
    while (n > 0) {
        if (n & 1) R = mul(R, M);
        M = mul(M, M);
        n >>= 1;
    }
    return R;
}`,
        java: `static final long MOD = 1_000_000_007L;
static long[][] mul(long[][] A, long[][] B) {
    int k = A.length;
    long[][] C = new long[k][k];
    for (int i = 0; i < k; i++)
        for (int t = 0; t < k; t++) {
            if (A[i][t] == 0) continue;
            for (int j = 0; j < k; j++) C[i][j] = (C[i][j] + A[i][t] * B[t][j]) % MOD;
        }
    return C;
}
static long[][] matPow(long[][] M, long n) {
    int k = M.length;
    long[][] R = new long[k][k];
    for (int i = 0; i < k; i++) R[i][i] = 1;               // identity
    while (n > 0) {
        if ((n & 1) == 1) R = mul(R, M);
        M = mul(M, M);
        n >>= 1;
    }
    return R;
}`,
        python: `MOD = 10**9 + 7

def mul(A, B):
    k = len(A)
    C = [[0] * k for _ in range(k)]
    for i in range(k):
        for t in range(k):
            if A[i][t]:
                a, row, Bt = A[i][t], C[i], B[t]
                for j in range(k):
                    row[j] = (row[j] + a * Bt[j]) % MOD
    return C

def mat_pow(M, n):
    k = len(M)
    R = [[int(i == j) for j in range(k)] for i in range(k)]   # identity
    while n > 0:
        if n & 1:
            R = mul(R, M)
        M = mul(M, M)
        n >>= 1
    return R`,
        js: `const MOD = 1000000007n;          // BigInt: products reach 1e18 > 2^53
function mul(A, B) {
  const k = A.length;
  const C = Array.from({ length: k }, () => new Array(k).fill(0n));
  for (let i = 0; i < k; i++)
    for (let t = 0; t < k; t++) {
      if (A[i][t] === 0n) continue;
      for (let j = 0; j < k; j++) C[i][j] = (C[i][j] + A[i][t] * B[t][j]) % MOD;
    }
  return C;
}
function matPow(M, n) {           // M: BigInt entries, n: BigInt
  const k = M.length;
  let R = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? 1n : 0n)));
  while (n > 0n) {
    if (n & 1n) R = mul(R, M);
    M = mul(M, M);
    n >>= 1n;
  }
  return R;
}`,
        c: `#define K 3                       /* matrix size */
#define MOD 1000000007LL
/* C = A*B mod MOD; C may alias A or B */
void mul(long long A[K][K], long long B[K][K], long long C[K][K]) {
    long long T[K][K] = {{0}};
    for (int i = 0; i < K; i++)
        for (int t = 0; t < K; t++)
            for (int j = 0; j < K; j++) T[i][j] = (T[i][j] + A[i][t] * B[t][j]) % MOD;
    memcpy(C, T, sizeof T);
}
/* R = M^n */
void matPow(long long M[K][K], long long n, long long R[K][K]) {
    long long B[K][K];
    memcpy(B, M, sizeof B);
    for (int i = 0; i < K; i++) for (int j = 0; j < K; j++) R[i][j] = (i == j);
    while (n > 0) {
        if (n & 1) mul(R, B, R);
        mul(B, B, B);
        n >>= 1;
    }
}`,
      },
      note: 'For a_n = 2a₋₁ + 3a₋₂ + 5: M = [[2,3,5],[1,0,0],[0,0,1]], and (a_n, a_{n−1}, 1) = M^(n−1)·(a₁, a₀, 1).',
    },
    {
      t: 'md',
      md: `
        ## Fast doubling for Fibonacci

        Square the Fibonacci matrix symbolically: $M^{2k} = (M^k)^2$ gives

        $$\\begin{pmatrix}F_{2k+1} & F_{2k}\\\\F_{2k} & F_{2k-1}\\end{pmatrix} = \\begin{pmatrix}F_{k+1} & F_k\\\\F_k & F_{k-1}\\end{pmatrix}^2,$$

        so $F_{2k+1} = F_{k+1}^2 + F_k^2$ and $F_{2k} = F_k F_{k+1} + F_{k-1}F_k = F_k(F_{k+1} + F_{k-1}) = F_k\\,(2F_{k+1} - F_k)$, using $F_{k-1} = F_{k+1} - F_k$.

        So from the pair $(F_k, F_{k+1})$ we get $(F_{2k}, F_{2k+1})$ with three multiplications, and $(F_{2k+1}, F_{2k+2}) = (F_{2k+1}, F_{2k} + F_{2k+1})$ for odd $n$. Recursing on $\\lfloor n/2\\rfloor$ gives $O(\\log n)$ — about 3 multiplications per bit instead of the 8 (or 16, multiply plus square) of the $2\\times2$ matrix method. Check: $F_{10} = 55$, $F_{11} = 89$ give $F_{20} = 55\\cdot(178 - 55) = 6765$. ✓
      `,
    },
    {
      t: 'viz',
      algo: 'math-pow-fastdoubling',
      caption: 'Calls go down 13 → 6 → 3 → 1 → 0, and pairs come back up: (0,1) → (1,1) → (2,3) → (8,13) → (233,377). Watch the parity decide which pair is returned.',
    },
    {
      t: 'md',
      md: `
        ## Shrinking the exponent with Euler

        By Euler's theorem, if $\\gcd(a, m) = 1$, write $b = q\\,\\varphi(m) + r$:

        $$a^b = \\left(a^{\\varphi(m)}\\right)^q a^r \\equiv a^{\\,b \\bmod \\varphi(m)} \\pmod m.$$

        That is how you evaluate exponents that are themselves huge: $a^{(b^c)} \\bmod p$ for prime $p \\nmid a$ is $a^{e} \\bmod p$ with $e = b^c \\bmod (p - 1)$ — **the exponent is reduced mod $p - 1$, not mod $p$**. Example: $3^{(2^5)} \\bmod 7$: $2^5 = 32 \\equiv 2 \\pmod 6$, so the answer is $3^2 = 9 \\equiv 2$.

        **The caveat: $\\gcd(a, m)$ must be 1.** Take $a = 5$, $m = 5$, $b = 4$: truly $5^4 \\equiv 0$, but $b \\bmod \\varphi(5) = 0$ gives $5^0 = 1$. Wrong. When $a$ might share a factor with $m$, use the **generalised** form: for $b \\ge \\log_2 m$,

        $$a^b \\equiv a^{\\,\\varphi(m) + (b \\bmod \\varphi(m))} \\pmod m.$$

        *Proof.* It suffices to check it modulo each prime power $p^k \\,\\|\\, m$ (if every $p^k$ divides a difference, so does their product $m$). If $p \\nmid a$, Euler mod $p^k$ applies, since $\\varphi(p^k) \\mid \\varphi(m)$ and both exponents agree mod $\\varphi(m)$. If $p \\mid a$, then $a^e \\equiv 0 \\pmod{p^k}$ whenever $e \\ge k$; both exponents qualify: $b \\ge \\log_2 m \\ge k$, and $\\varphi(m) \\ge \\varphi(p^k) = p^{k-1}(p - 1) \\ge k$. ∎ This is the tool for power towers $a^{b^{c^{\\cdots}}} \\bmod m$, recursing with $m \\to \\varphi(m)$ (which reaches 1 in $O(\\log m)$ steps).
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Fast-power bugs',
      md: `
        - **Two recursive calls:** \`pow(a, b/2) * pow(a, b/2)\` is $O(b)$. Store the half.
        - **Reducing the exponent mod $m$** instead of mod $\\varphi(m)$ (or $p - 1$). $2^{7} \\bmod 7 = 2$, but $2^{7 \\bmod 7} = 1$.
        - **Forgetting \`a %= m\`** first: with $a = 10^{18}$, \`a * a\` overflows on the first square.
        - **\`pow()\` from \`<cmath>\`/\`Math.pow\`** returns a double: exact only up to $2^{53}$, and it cannot reduce mod $m$ along the way.
        - **Negative exponents** (LeetCode "Pow(x, n)"): compute $x^{|n|}$ and invert; with \`int n = INT_MIN\`, $-n$ overflows — widen to 64-bit before negating.
        - $b = 0$ with $m = 1$: return \`1 % m\`, not 1.
      `,
    },
    {
      t: 'complexity',
      title: 'Fast power at a glance',
      rows: [
        { op: 'aᵇ by repeated multiplication', time: 'O(b)', space: 'O(1)', note: 'hopeless for b = 10¹⁸' },
        { op: 'Binary exponentiation (iterative)', time: 'O(log b)', space: 'O(1)', note: '⌊log₂ b⌋ + 1 squarings, popcount(b) products' },
        { op: 'Binary exponentiation (recursive)', time: 'O(log b)', space: 'O(log b) stack', note: 'one recursive call per level' },
        { op: 'k × k matrix power', time: 'O(k³ log n)', space: 'O(k²)', note: 'any linear recurrence of order k' },
        { op: 'Fibonacci by fast doubling', time: 'O(log n)', space: 'O(log n) stack', note: '≈ 3 multiplications per bit' },
        { op: 'Power tower mod m', time: 'O(log m · log b)', space: 'O(log m)', note: 'recurse m → φ(m), generalised Euler' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How it is asked',
      md: `
        - **Pow(x, n)** (LeetCode 50): the expected answer is iterative binary exponentiation with the negative-$n$ and \`INT_MIN\` cases. Follow-up: "prove it is $O(\\log n)$" — one bit per iteration.
        - **Super Pow** (LeetCode 372): $a^b \\bmod 1337$ with $b$ given as a digit array — process digits with $a^{10x + d} = (a^x)^{10}\\cdot a^d$, or reduce $b$ mod $\\varphi(1337) = 1140$ (careful: 1337 = 7·191 and $a$ may share a factor — the digit method avoids that trap).
        - **"Fibonacci / climbing stairs for n = 10¹⁸"** — matrix power; the interviewer checks you can derive the matrix from the recurrence, not just recall it.
        - **"Count paths of exactly k steps in a graph"** — adjacency-matrix power.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-pow-rounds', 'math-q-pow-trace', 'math-q-pow-matrix', 'math-q-pow-order', 'math-q-pow-euler-trap', 'math-q-pow-tower', 'math-q-pow-doubling', 'math-q-pow-match'] },
  ],
}
