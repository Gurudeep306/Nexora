import type { Page } from '../../../types'

/* ═══════════════════════════════ Modular inverse ═══════════════════════════════ */

export const modularInverse: Page = {
  id: 'modular-inverse',
  title: 'Modular inverse: how to divide under a modulus',
  summary: 'When a⁻¹ mod m exists and why, three ways to compute it (extended Euclid, Fermat, the linear table), factorials with inverse factorials, and the rules for dividing safely.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        Counting problems love to end with "print the answer modulo $10^9 + 7$". Addition, subtraction and multiplication survive reduction: you can take \`% p\` after every step and the final residue is right. **Division does not.** Take $\\frac{12}{4} = 3$ modulo $7$:

        - reduce first: $12 \\bmod 7 = 5$ and $4 \\bmod 7 = 4$;
        - "divide" the residues: $5 / 4$ is not even an integer, and integer division gives $1$ — wrong, the answer is $3$.

        Yet $\\binom{n}{k} = \\frac{n!}{k!\\,(n-k)!}$ is a division, and $n!$ for $n = 10^6$ has five and a half million digits — we cannot compute it exactly and divide at the end. We need a way to divide **inside** the modular world.

        The fix is to stop thinking of division as an operation and start thinking of it as **multiplication by an inverse**. In ordinary arithmetic $\\frac{12}{4} = 12 \\cdot \\frac14$, where $\\frac14$ is the number that gives $1$ when multiplied by $4$. Modulo $7$, the number that gives $1$ when multiplied by $4$ is $2$, because $4 \\cdot 2 = 8 \\equiv 1$. So

        $$\\frac{12}{4} \\equiv 12 \\cdot 2 = 24 \\equiv 3 \\pmod 7. \\checkmark$$

        ## Definition, uniqueness, existence

        **Definition.** An inverse of $a$ modulo $m$ is an integer $x$ with $a x \\equiv 1 \\pmod m$. We write $x = a^{-1} \\bmod m$.

        **It is unique modulo $m$.** If $ax \\equiv 1$ and $ay \\equiv 1$, then $x \\equiv x(ay) = (xa)y \\equiv y \\pmod m$. So "the" inverse is one residue in $[0, m)$.

        **Theorem.** $a$ has an inverse modulo $m$ **if and only if** $\\gcd(a, m) = 1$.

        *Proof (⇒).* If $ax \\equiv 1$, then $ax = 1 + qm$ for some integer $q$, i.e. $ax - qm = 1$. Any common divisor $d$ of $a$ and $m$ divides the left side, so $d \\mid 1$. Hence $\\gcd(a, m) = 1$.

        *Proof (⇐).* If $\\gcd(a, m) = 1$, Bézout's identity (from the extended Euclid page) gives integers $x, y$ with $ax + my = 1$. Reading this modulo $m$, the term $my$ vanishes: $ax \\equiv 1$. $\\blacksquare$

        A second proof of (⇐) is worth knowing because it reappears in Fermat's theorem. Look at the map $x \\mapsto ax \\bmod m$ on the residues $\\{0, 1, \\dots, m-1\\}$. If $ax \\equiv ay$, then $m \\mid a(x - y)$, and since $\\gcd(a, m) = 1$, Euclid's lemma gives $m \\mid x - y$, so $x \\equiv y$. The map is **injective** on a finite set, hence a **bijection** — some $x$ is sent to $1$.

        **Bold rule: $a^{-1} \\bmod m$ exists exactly when $\\gcd(a, m) = 1$; in particular, modulo a prime $p$ every $a \\not\\equiv 0$ is invertible.** That is why contest moduli are primes like $10^9+7$ and $998244353$.

        When $\\gcd(a, m) = g > 1$ there is no inverse: every $ax \\bmod m$ is a multiple of $g$. Modulo $6$, the multiples of $2$ are $0, 2, 4, 0, 2, 4$ — the value $1$ never appears.
      `,
    },
    {
      t: 'md',
      md: `
        ## Method 1 — extended Euclid (any modulus)

        Run Euclid's algorithm on $(m, a)$, but carry one extra number per row. Keep the **invariant**

        $$r_i \\equiv t_i \\cdot a \\pmod m.$$

        It holds for the two starting rows: $r_0 = m \\equiv 0 \\cdot a$ and $r_1 = a \\equiv 1 \\cdot a$. Euclid makes the next remainder as $r_{i+1} = r_{i-1} - q_i r_i$ with $q_i = \\lfloor r_{i-1}/r_i \\rfloor$; apply the **same** combination to the $t$ column, $t_{i+1} = t_{i-1} - q_i t_i$. Subtracting $q_i$ times one true congruence from another true congruence gives a true congruence, so the invariant survives every step.

        Euclid stops when the remainder hits $0$; the row before it holds $r = \\gcd(a, m)$. If that is $1$, the invariant reads $1 \\equiv t \\cdot a$ — **$t$ is the inverse** (normalise it into $[0, m)$, it may be negative). If it is bigger than $1$, no inverse exists, and the algorithm has told you so for free.

        Hand trace, $17^{-1} \\bmod 60$:

        | $q$ | $r$ | $t$ | check $t \\cdot 17 \\bmod 60$ |
        |---|---|---|---|
        | — | 60 | 0 | 0 |
        | — | 17 | 1 | 17 |
        | 3 | 9 | −3 | 9 |
        | 1 | 8 | 4 | 8 |
        | 1 | 1 | −7 | 1 |
        | 8 | 0 | 60 | 0 |

        $r = 1$ with $t = -7$, so $17^{-1} \\equiv -7 \\equiv 53$. Check: $17 \\cdot 53 = 901 = 15 \\cdot 60 + 1$.
      `,
    },
    {
      t: 'viz',
      algo: 'math-inv-ext-euclid',
      caption: 'Each new row is "two rows up minus q times the row above" — in both columns. The last column checks the invariant r ≡ t·a on every row. Try a = 4, m = 6 to watch it end at gcd 2 and report "no inverse".',
    },
    {
      t: 'code',
      title: 'Inverse by extended Euclid (returns -1 / None when gcd ≠ 1)',
      code: {
        cpp: `long long inverse(long long a, long long m) {
    a %= m; if (a < 0) a += m;
    long long r0 = m, r1 = a, t0 = 0, t1 = 1;
    while (r1 != 0) {
        long long q = r0 / r1;
        long long r2 = r0 - q * r1; r0 = r1; r1 = r2;
        long long t2 = t0 - q * t1; t0 = t1; t1 = t2;   // |t| stays <= m: no overflow
    }
    if (r0 != 1) return -1;          // gcd(a, m) = r0 > 1
    return (t0 % m + m) % m;
}`,
        java: `static long inverse(long a, long m) {
    a = Math.floorMod(a, m);
    long r0 = m, r1 = a, t0 = 0, t1 = 1;
    while (r1 != 0) {
        long q = r0 / r1;
        long r2 = r0 - q * r1; r0 = r1; r1 = r2;
        long t2 = t0 - q * t1; t0 = t1; t1 = t2;
    }
    if (r0 != 1) return -1;          // gcd(a, m) = r0 > 1
    return Math.floorMod(t0, m);
}`,
        python: `def inverse(a, m):
    # Python 3.8+: pow(a, -1, m) does the same and raises ValueError if gcd > 1
    r0, r1, t0, t1 = m, a % m, 0, 1
    while r1:
        q = r0 // r1
        r0, r1 = r1, r0 - q * r1
        t0, t1 = t1, t0 - q * t1
    if r0 != 1:
        return None                  # gcd(a, m) = r0 > 1
    return t0 % m`,
        js: `function inverse(a, m) {            // m < 2^26 keeps q * t exact in doubles
  a = ((a % m) + m) % m;
  let r0 = m, r1 = a, t0 = 0, t1 = 1;
  while (r1 !== 0) {
    const q = Math.floor(r0 / r1);
    [r0, r1] = [r1, r0 - q * r1];
    [t0, t1] = [t1, t0 - q * t1];
  }
  if (r0 !== 1) return -1;           // gcd(a, m) = r0 > 1
  return ((t0 % m) + m) % m;
}`,
        c: `long long inverse(long long a, long long m) {
    a %= m; if (a < 0) a += m;
    long long r0 = m, r1 = a, t0 = 0, t1 = 1;
    while (r1 != 0) {
        long long q = r0 / r1;
        long long r2 = r0 - q * r1; r0 = r1; r1 = r2;
        long long t2 = t0 - q * t1; t0 = t1; t1 = t2;
    }
    if (r0 != 1) return -1;          /* gcd(a, m) = r0 > 1 */
    return (t0 % m + m) % m;
}`,
      },
      note: 'Cost: the same O(log m) iterations as Euclid. The coefficients never exceed m in absolute value, so q·t fits in 64 bits whenever m does (for m up to about 9·10¹⁸).',
    },
    {
      t: 'md',
      md: `
        ## Method 2 — Fermat's little theorem (prime modulus)

        **Theorem (Fermat).** If $p$ is prime and $p \\nmid a$, then $a^{p-1} \\equiv 1 \\pmod p$.

        *Proof.* By the bijection argument above, multiplying the nonzero residues $1, 2, \\dots, p-1$ by $a$ just permutes them. So the two products are equal modulo $p$:

        $$(1a)(2a)\\cdots((p-1)a) \\equiv 1 \\cdot 2 \\cdots (p-1) \\quad\\Longrightarrow\\quad a^{p-1}\\,(p-1)! \\equiv (p-1)! \\pmod p.$$

        Each of $1, \\dots, p-1$ is coprime to $p$, so $(p-1)!$ is invertible; multiply both sides by its inverse and $a^{p-1} \\equiv 1$ remains. $\\blacksquare$

        Split off one factor: $a \\cdot a^{p-2} = a^{p-1} \\equiv 1$. So

        $$a^{-1} \\equiv a^{p-2} \\pmod p,$$

        computed with fast exponentiation in $O(\\log p)$ multiplications. **This is the one-liner every contest template has — and it is only valid for a prime modulus.** For a composite $m$ the general form is Euler's theorem, $a^{\\varphi(m)} \\equiv 1$ for $\\gcd(a, m) = 1$ (same proof, permuting only the residues coprime to $m$), so $a^{-1} \\equiv a^{\\varphi(m) - 1}$ — but computing $\\varphi(m)$ needs the factorisation of $m$, so extended Euclid is simpler there.
      `,
    },
    {
      t: 'viz',
      algo: 'math-inv-fermat',
      caption: 'The exponent p − 2 is read bit by bit; the base is squared each step, and multiplied into the result when the bit is 1. Try p = 1009 to see that the number of steps is only about log₂ p.',
    },
    {
      t: 'code',
      title: 'Inverse by Fermat (p prime, a not divisible by p)',
      code: {
        cpp: `long long power(long long b, long long e, long long p) {
    long long r = 1; b %= p; if (b < 0) b += p;
    while (e > 0) {
        if (e & 1) r = r * b % p;     // p < 2^31 keeps r * b < 2^62
        b = b * b % p;
        e >>= 1;
    }
    return r;
}
long long inverseFermat(long long a, long long p) { return power(a, p - 2, p); }`,
        java: `static long power(long b, long e, long p) {
    long r = 1; b = Math.floorMod(b, p);
    while (e > 0) {
        if ((e & 1) == 1) r = r * b % p;
        b = b * b % p;
        e >>= 1;
    }
    return r;
}
static long inverseFermat(long a, long p) { return power(a, p - 2, p); }`,
        python: `def inverse_fermat(a, p):
    return pow(a, p - 2, p)      # built-in three-argument pow is fast exponentiation`,
        js: `function power(b, e, p) {           // BigInt: (1e9)^2 overflows 2^53
  b = ((BigInt(b) % p) + p) % p; e = BigInt(e);
  let r = 1n;
  while (e > 0n) {
    if (e & 1n) r = r * b % p;
    b = b * b % p;
    e >>= 1n;
  }
  return r;
}
const inverseFermat = (a, p) => power(a, BigInt(p) - 2n, BigInt(p));`,
        c: `long long power(long long b, long long e, long long p) {
    long long r = 1; b %= p; if (b < 0) b += p;
    while (e > 0) {
        if (e & 1) r = r * b % p;
        b = b * b % p;
        e >>= 1;
    }
    return r;
}
long long inverseFermat(long long a, long long p) { return power(a, p - 2, p); }`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Three ways Fermat silently lies',
      md: `
        - **Composite modulus.** \`pow(3, m - 2, m)\` with $m = 10^9$ returns a number, but not the inverse. Nothing crashes; the answer is just wrong. Use extended Euclid for non-prime moduli.
        - **$a \\equiv 0 \\pmod p$.** $0^{p-2} = 0$, and you multiply by $0$ instead of reporting "no inverse". This bites when $n \\ge p$ in $n!$ — the factorial contains $p$ itself.
        - **Overflow.** With $p \\approx 10^9$, \`b * b\` needs 64 bits; with $p \\approx 10^{18}$ it needs \`__int128\` (C/C++), \`BigInteger\`/\`Math.multiplyHigh\` (Java) or \`BigInt\` (JavaScript). In JavaScript plain numbers lose exactness above $2^{53} \\approx 9 \\cdot 10^{15}$, i.e. as soon as $p > 9.4 \\cdot 10^7$.
      `,
    },
    {
      t: 'md',
      md: `
        ## Method 3 — every inverse from 1 to n in O(n)

        Sometimes you need $1^{-1}, 2^{-1}, \\dots, n^{-1}$ modulo a prime $p > n$ (harmonic sums, probabilities $\\frac1i$, inverse factorials). $n$ separate Fermat calls cost $O(n \\log p)$. A neat identity does it in $O(n)$.

        **Derivation.** Divide $p$ by $i$ (with $2 \\le i < p$): $p = q i + r$ where $q = \\lfloor p / i \\rfloor$ and $r = p \\bmod i$. Since $p$ is prime and $1 < i < p$, $i \\nmid p$, so $0 < r < i$. Reading the equation modulo $p$:

        $$q i + r \\equiv 0 \\pmod p.$$

        Both $i$ and $r$ are invertible. Multiply by $i^{-1} r^{-1}$:

        $$q\\, r^{-1} + i^{-1} \\equiv 0 \\quad\\Longrightarrow\\quad i^{-1} \\equiv -\\left\\lfloor \\frac{p}{i} \\right\\rfloor \\cdot (p \\bmod i)^{-1} \\pmod p.$$

        Because $r < i$, the inverse of $r$ was computed earlier in the loop. One multiplication per $i$: **$O(n)$ total.** In code, write $-x$ as $p - x$ to stay non-negative:

        $$\\texttt{inv[i]} = (p - \\lfloor p/i \\rfloor \\cdot \\texttt{inv[p \\% i]} \\bmod p) \\bmod p.$$

        By hand, $p = 13$: $13 = 6 \\cdot 2 + 1$ gives $\\text{inv}[2] = -6 \\cdot 1 \\equiv 7$ (and $2 \\cdot 7 = 14 \\equiv 1$ ✓); $13 = 2 \\cdot 5 + 3$ gives $\\text{inv}[5] = -2 \\cdot \\text{inv}[3] = -2 \\cdot 9 = -18 \\equiv 8$ (and $5 \\cdot 8 = 40 = 39 + 1$ ✓).
      `,
    },
    {
      t: 'viz',
      algo: 'math-inv-table',
      caption: 'Each arrow goes from p mod i (always a smaller, already-filled index) to i. Notice that the arrows jump backwards by varying amounts — the dependency is not on i − 1, but it is always on something to the left.',
    },
    {
      t: 'code',
      title: 'All inverses 1..n modulo a prime p > n',
      code: {
        cpp: `vector<long long> inverses(int n, long long p) {
    vector<long long> inv(n + 1, 0);
    inv[1] = 1;
    for (int i = 2; i <= n; i++)
        inv[i] = (p - (p / i) * inv[p % i] % p) % p;   // (p/i) * inv < p^2: fine for p < 3e9
    return inv;
}`,
        java: `static long[] inverses(int n, long p) {
    long[] inv = new long[n + 1];
    inv[1] = 1;
    for (int i = 2; i <= n; i++)
        inv[i] = (p - (p / i) * inv[(int) (p % i)] % p) % p;
    return inv;
}`,
        python: `def inverses(n, p):
    inv = [0, 1] + [0] * (n - 1)
    for i in range(2, n + 1):
        inv[i] = (p - (p // i) * inv[p % i] % p) % p
    return inv`,
        js: `function inverses(n, p) {            // BigInt-free: needs p < 2^26 for exact products
  const inv = new Array(n + 1).fill(0);
  inv[1] = 1;
  for (let i = 2; i <= n; i++)
    inv[i] = (p - Math.floor(p / i) * inv[p % i] % p) % p;
  return inv;
}
// For p = 1e9 + 7 use BigInt: inv[i] = (P - (P / BigInt(i)) * inv[Number(P % BigInt(i))] % P) % P`,
        c: `void inverses(int n, long long p, long long *inv) {   /* inv has n + 1 slots */
    inv[1] = 1;
    for (int i = 2; i <= n; i++)
        inv[i] = (p - (p / i) * inv[p % i] % p) % p;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Batch inversion: n arbitrary values for the price of one inverse',
      md: `
        The table above only inverts $1..n$. To invert **arbitrary** nonzero values $a_1, \\dots, a_n$ (modulo any $m$ where they are all invertible), use prefix products $P_i = a_1 a_2 \\cdots a_i$ and invert only $P_n$. Walk backwards keeping $S = P_i^{-1}$: then $a_i^{-1} = S \\cdot P_{i-1}$ (because $P_i = P_{i-1} a_i$), and $S \\cdot a_i = P_{i-1}^{-1}$ is the next $S$. Total: one real inverse and about $3n$ multiplications. Inverse factorials below are the special case $a_i = i$.
      `,
    },
    {
      t: 'code',
      title: 'Batch inversion (all values must be invertible mod p)',
      code: {
        cpp: `vector<long long> batchInverse(const vector<long long>& a, long long p) {
    int n = a.size();
    vector<long long> pre(n + 1, 1), res(n);
    for (int i = 0; i < n; i++) pre[i + 1] = pre[i] * a[i] % p;
    long long s = power(pre[n], p - 2, p);          // (a0 * ... * a_{n-1})^{-1}
    for (int i = n - 1; i >= 0; i--) {
        res[i] = s * pre[i] % p;                    // = a_i^{-1}
        s = s * a[i] % p;                           // now (a0 * ... * a_{i-1})^{-1}
    }
    return res;
}`,
        java: `static long[] batchInverse(long[] a, long p) {
    int n = a.length;
    long[] pre = new long[n + 1], res = new long[n];
    pre[0] = 1;
    for (int i = 0; i < n; i++) pre[i + 1] = pre[i] * a[i] % p;
    long s = power(pre[n], p - 2, p);
    for (int i = n - 1; i >= 0; i--) {
        res[i] = s * pre[i] % p;
        s = s * a[i] % p;
    }
    return res;
}`,
        python: `def batch_inverse(a, p):
    pre = [1]
    for x in a:
        pre.append(pre[-1] * x % p)
    s = pow(pre[-1], p - 2, p)
    res = [0] * len(a)
    for i in range(len(a) - 1, -1, -1):
        res[i] = s * pre[i] % p
        s = s * a[i] % p
    return res`,
        js: `function batchInverse(a, p) {        // a: array of BigInt, p: BigInt
  const pre = [1n];
  for (const x of a) pre.push(pre[pre.length - 1] * x % p);
  let s = power(pre[a.length], p - 2n, p);
  const res = new Array(a.length);
  for (let i = a.length - 1; i >= 0; i--) {
    res[i] = s * pre[i] % p;
    s = s * a[i] % p;
  }
  return res;
}`,
        c: `void batchInverse(const long long *a, int n, long long p, long long *pre, long long *res) {
    pre[0] = 1;                                     /* pre has n + 1 slots */
    for (int i = 0; i < n; i++) pre[i + 1] = pre[i] * a[i] % p;
    long long s = power(pre[n], p - 2, p);
    for (int i = n - 1; i >= 0; i--) {
        res[i] = s * pre[i] % p;
        s = s * a[i] % p;
    }
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Factorials and inverse factorials

        The single most used application. Precompute, for a prime $p > N$:

        - $\\text{fact}[i] = i! \\bmod p$, forward: $\\text{fact}[i] = \\text{fact}[i-1] \\cdot i$;
        - $\\text{ifact}[N] = \\text{fact}[N]^{p-2}$ — **one** Fermat inverse;
        - $\\text{ifact}[i-1] = \\text{ifact}[i] \\cdot i$, backward.

        Why the backward step is right: $\\frac{1}{(i-1)!} = \\frac{i}{i!}$, i.e. $((i-1)!)^{-1} = i \\cdot (i!)^{-1}$. Every value is a product of invertible numbers because $p > N$.

        Then $\\binom{n}{k} \\equiv \\text{fact}[n] \\cdot \\text{ifact}[k] \\cdot \\text{ifact}[n-k]$ in $O(1)$ per query, and as a bonus $i^{-1} \\equiv \\text{ifact}[i] \\cdot \\text{fact}[i-1]$.
      `,
    },
    {
      t: 'viz',
      algo: 'math-inv-fact',
      caption: 'Forward arrows build fact[], a single exponentiation inverts the last factorial, and backward arrows peel one factor i off at a time. The final frame answers a binomial with three lookups.',
    },
    {
      t: 'code',
      title: 'Factorial tables and O(1) binomials modulo 1e9+7',
      code: {
        cpp: `const long long MOD = 1000000007;
vector<long long> fact, ifact;
void build(int N) {                                   // N < MOD
    fact.assign(N + 1, 1); ifact.assign(N + 1, 1);
    for (int i = 1; i <= N; i++) fact[i] = fact[i - 1] * i % MOD;
    ifact[N] = power(fact[N], MOD - 2, MOD);
    for (int i = N; i >= 1; i--) ifact[i - 1] = ifact[i] * i % MOD;
}
long long nCr(int n, int k) {
    if (k < 0 || k > n) return 0;
    return fact[n] * ifact[k] % MOD * ifact[n - k] % MOD;
}`,
        java: `static final long MOD = 1_000_000_007L;
static long[] fact, ifact;
static void build(int N) {
    fact = new long[N + 1]; ifact = new long[N + 1]; fact[0] = 1;
    for (int i = 1; i <= N; i++) fact[i] = fact[i - 1] * i % MOD;
    ifact[N] = power(fact[N], MOD - 2, MOD);
    for (int i = N; i >= 1; i--) ifact[i - 1] = ifact[i] * i % MOD;
}
static long nCr(int n, int k) {
    if (k < 0 || k > n) return 0;
    return fact[n] * ifact[k] % MOD * ifact[n - k] % MOD;
}`,
        python: `MOD = 10**9 + 7
def build(N):
    fact = [1] * (N + 1)
    for i in range(1, N + 1):
        fact[i] = fact[i - 1] * i % MOD
    ifact = [1] * (N + 1)
    ifact[N] = pow(fact[N], MOD - 2, MOD)
    for i in range(N, 0, -1):
        ifact[i - 1] = ifact[i] * i % MOD
    return fact, ifact

def nCr(n, k, fact, ifact):
    if k < 0 or k > n:
        return 0
    return fact[n] * ifact[k] % MOD * ifact[n - k] % MOD`,
        js: `const MOD = 1000000007n;
function build(N) {
  const fact = new Array(N + 1), ifact = new Array(N + 1);
  fact[0] = 1n;
  for (let i = 1; i <= N; i++) fact[i] = fact[i - 1] * BigInt(i) % MOD;
  ifact[N] = power(fact[N], MOD - 2n, MOD);
  for (let i = N; i >= 1; i--) ifact[i - 1] = ifact[i] * BigInt(i) % MOD;
  return [fact, ifact];
}
function nCr(n, k, fact, ifact) {
  if (k < 0 || k > n) return 0n;
  return fact[n] * ifact[k] % MOD * ifact[n - k] % MOD;
}`,
        c: `#define MOD 1000000007LL
#define MAXN 1000001
long long fact[MAXN], ifact[MAXN];
void build(int N) {
    fact[0] = 1;
    for (int i = 1; i <= N; i++) fact[i] = fact[i - 1] * i % MOD;
    ifact[N] = power(fact[N], MOD - 2, MOD);
    for (int i = N; i >= 1; i--) ifact[i - 1] = ifact[i] * i % MOD;
}
long long nCr(int n, int k) {
    if (k < 0 || k > n) return 0;
    return fact[n] * ifact[k] % MOD * ifact[n - k] % MOD;
}`,
      },
      note: 'Note the order fact[n] * ifact[k] % MOD * ifact[n - k] % MOD: reduce after every single multiplication, or the triple product overflows 64 bits.',
    },
    {
      t: 'complexity',
      title: 'Inverses at a glance',
      rows: [
        { op: 'Extended Euclid', time: 'O(log m)', space: 'O(1)', note: 'any m with gcd(a, m) = 1; also detects "no inverse"' },
        { op: 'Fermat a^(p−2)', time: 'O(log p)', space: 'O(1)', note: 'p must be prime, a ≢ 0' },
        { op: 'Euler a^(φ(m)−1)', time: 'O(log m) + factorising m', space: 'O(1)', note: 'rarely worth it over Euclid' },
        { op: 'Linear table inv[1..n]', time: 'O(n)', space: 'O(n)', note: 'p prime, n < p' },
        { op: 'Batch inversion of n values', time: 'O(n + log p)', space: 'O(n)', note: 'one real inverse' },
        { op: 'fact / ifact tables', time: 'O(N + log p) build, O(1) per C(n, k)', space: 'O(N)', note: 'N < p' },
      ],
    },
    {
      t: 'md',
      md: `
        ## Division done right — a checklist

        To compute $\\frac{A}{B} \\bmod m$ where the true quotient is an integer (or where the problem defines it as $A \\cdot B^{-1}$):

        1. **Reduce freely, then multiply by the inverse:** $\\frac{A}{B} \\equiv (A \\bmod m)\\cdot(B \\bmod m)^{-1}$. This is valid whenever $\\gcd(B, m) = 1$, because $B \\cdot \\frac AB = A$ and multiplying by $B^{-1}$ is the only way to undo $B$.
        2. **Many divisions? Defer them.** Keep a running numerator and denominator, both reduced mod $p$, and invert the denominator once at the end — one $O(\\log p)$ call instead of many.
        3. **If $\\gcd(B, m) > 1$, an inverse does not exist** — and $(A \\bmod m)/(B \\bmod m)$ is meaningless. Options:
           - avoid division entirely (Pascal's triangle builds $\\binom nk$ with additions only — next pages);
           - for $m = p^e \\cdot \\ldots$, split with CRT and handle each prime power, counting how many factors of $p$ cancel;
           - if the numbers are small, compute exactly (big integers) and reduce at the end.
        4. **Probability answers "as $P \\cdot Q^{-1} \\bmod p$"** mean exactly rule 1: compute the fraction $\\frac PQ$ in reduced or unreduced form, then output $P \\cdot Q^{-1}$. Unreduced is fine — $\\frac{2P}{2Q}$ gives the same residue.

        **Bold rule: never divide residues; multiply by an inverse, and check the denominator is coprime to the modulus.**
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Bugs that pass the samples',
      md: `
        - \`fact[n] / (fact[k] * fact[n - k]) % p\` — integer division of residues. Gives right answers for tiny $n$ (no reduction happened yet) and garbage later.
        - Forgetting to normalise the extended-Euclid result: it can be negative.
        - \`a % m\` for negative \`a\` is negative in C, C++, Java and JavaScript. Use \`((a % m) + m) % m\` or \`Math.floorMod\`.
        - Building \`ifact\` with \`N >= p\`: $N!$ contains the factor $p$, so it is $0$ and $0^{p-2} = 0$ poisons the whole table.
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How it shows up',
      md: `
        - "Return the count modulo $10^9 + 7$" in any combinatorics or probability problem — the interviewer checks that you **do not divide residues**, and that you know why $10^9 + 7$ being prime matters.
        - "Implement \`modInverse(a, m)\`" — expect the follow-up "what if $m$ is not prime?" (extended Euclid) and "when does it not exist?" (gcd $> 1$, with the one-line proof).
        - "Answer $10^5$ binomial queries" — precompute factorials and inverse factorials; state $O(N + \\log p)$ build and $O(1)$ query.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-inv-exists', 'math-q-inv-compute', 'math-q-inv-wrong-div', 'math-q-inv-fermat', 'math-q-inv-composite', 'math-q-inv-table', 'math-q-inv-fill', 'math-q-inv-match'] },
  ],
}

/* ═══════════════════════════════ Chinese Remainder Theorem ═══════════════════════════════ */

export const crt: Page = {
  id: 'crt',
  title: 'The Chinese Remainder Theorem',
  summary: 'Solve systems x ≡ aᵢ (mod mᵢ): the theorem with a constructive proof, merging two congruences with non-coprime moduli, iterative merging and Garner, overflow care, and where CRT appears in practice.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        An old puzzle (from the *Sunzi Suanjing*, about the 3rd century): *there is a number of things; counted by threes, two remain; by fives, three remain; by sevens, two remain. How many things?*

        $$x \\equiv 2 \\pmod 3, \\qquad x \\equiv 3 \\pmod 5, \\qquad x \\equiv 2 \\pmod 7.$$

        The same shape appears whenever **independent cycles** must line up: three traffic lights with periods 3, 5 and 7; planets returning to a position; a scheduled job that runs on every 4th day and every 6th hour. It also appears in computation: if a number is too big for one modulus, compute it modulo several smaller ones and **reassemble** it.

        **The naive way:** try $x = 0, 1, 2, \\dots$ until all congruences hold. The answer can be as large as $M = 3 \\cdot 5 \\cdot 7 = 105$; with moduli near $10^9$ the search space is $10^{18}$. Slightly better: step through only the values with the right residue mod the largest modulus. Still $O(M / \\max m_i)$. We want $O(k \\log M)$ for $k$ congruences.

        ## The theorem

        **Chinese Remainder Theorem.** Let $m_1, \\dots, m_k$ be **pairwise coprime** and $M = m_1 m_2 \\cdots m_k$. For any $a_1, \\dots, a_k$, the system $x \\equiv a_i \\pmod{m_i}$ has a solution, and the solution is **unique modulo $M$**.

        *Lemma.* If $a \\mid n$, $b \\mid n$ and $\\gcd(a, b) = 1$, then $ab \\mid n$. *Proof:* write $n = a u$. Then $b \\mid a u$ with $\\gcd(a, b) = 1$, so $b \\mid u$ by Euclid's lemma; $u = b v$ and $n = ab v$.

        *Uniqueness.* If $x$ and $y$ both solve the system, every $m_i$ divides $x - y$. Applying the lemma repeatedly (pairwise coprimality makes $m_1 \\cdots m_{j}$ coprime to $m_{j+1}$), $M \\mid x - y$.

        *Existence by counting.* Consider the map $x \\mapsto (x \\bmod m_1, \\dots, x \\bmod m_k)$ from $\\{0, \\dots, M-1\\}$ to tuples. Uniqueness says it is **injective**. There are $M$ inputs and $m_1 \\cdots m_k = M$ possible tuples, so an injective map is a **bijection**: every tuple $(a_1, \\dots, a_k)$ is hit. $\\blacksquare$

        That proof is clean but not an algorithm. Here is the two-modulus picture that makes it visible: all solutions of $x \\equiv a \\pmod m$ are $a, a + m, a + 2m, \\dots$; when $\\gcd(m, n) = 1$, the $n$ values $a + km$ for $k = 0..n-1$ are pairwise different modulo $n$ (if $k m \\equiv k' m \\pmod n$ then $n \\mid (k - k')$ by Euclid's lemma), so they cover all $n$ residues — exactly one of them is $\\equiv b$.
      `,
    },
    {
      t: 'viz',
      algo: 'math-crt-step',
      caption: 'With coprime moduli the second row is a permutation of 0..n−1, so exactly one candidate matches. Try m = 4, n = 6 (not coprime): residues repeat, only half of them are reachable, and b = 2 with a = 1 has no solution.',
    },
    {
      t: 'md',
      md: `
        ## The constructive formula

        Let $M_i = M / m_i$ (the product of all the *other* moduli) and $y_i = M_i^{-1} \\bmod m_i$ — it exists because $M_i$ is a product of numbers coprime to $m_i$. Then

        $$x \\equiv \\sum_{i=1}^{k} a_i\\, M_i\\, y_i \\pmod M.$$

        *Proof.* Fix $j$ and read the sum modulo $m_j$. For $i \\ne j$, $M_i$ contains the factor $m_j$, so the term vanishes. The $j$-th term is $a_j M_j y_j \\equiv a_j \\cdot 1 = a_j$. So $x \\equiv a_j \\pmod{m_j}$ for every $j$. $\\blacksquare$

        Each term $M_i y_i$ is a "basis vector": $\\equiv 1$ modulo $m_i$ and $\\equiv 0$ modulo every other modulus.

        **Sunzi's puzzle by hand.** $M = 105$.

        | $i$ | $a_i$ | $m_i$ | $M_i$ | $M_i \\bmod m_i$ | $y_i$ | $a_i M_i y_i$ |
        |---|---|---|---|---|---|---|
        | 1 | 2 | 3 | 35 | 2 | 2 | 140 |
        | 2 | 3 | 5 | 21 | 1 | 1 | 63 |
        | 3 | 2 | 7 | 15 | 1 | 1 | 30 |

        $x \\equiv 140 + 63 + 30 = 233 \\equiv 23 \\pmod{105}$. Check: $23 = 7\\cdot3 + 2 = 4\\cdot5 + 3 = 3\\cdot7 + 2$. ✓

        **Bold rule: with pairwise coprime moduli the system always has exactly one solution modulo the product.**
      `,
    },
    {
      t: 'md',
      md: `
        ## Two congruences, any moduli

        Real problems do not promise coprime moduli. Solve

        $$x \\equiv a \\pmod m, \\qquad x \\equiv b \\pmod n.$$

        Every solution of the first has the form $x = a + m k$. Substituting into the second:

        $$m k \\equiv b - a \\pmod n.$$

        Let $g = \\gcd(m, n)$.

        **Solvable iff $g \\mid b - a$.** (⇒) $mk - b + a = n\\ell$ for some $\\ell$, so $b - a = mk - n\\ell$ is a multiple of $g$. (⇐) Divide everything by $g$: $\\frac mg k \\equiv \\frac{b-a}{g} \\pmod{\\frac ng}$. Now $\\gcd(\\frac mg, \\frac ng) = 1$, so $\\frac mg$ is invertible modulo $\\frac ng$ and

        $$k \\equiv \\frac{b - a}{g} \\cdot \\left(\\frac{m}{g}\\right)^{-1} \\pmod{\\frac{n}{g}}.$$

        **The answer is unique modulo $\\operatorname{lcm}(m, n) = \\frac{mn}{g}$.** Two solutions differ by a common multiple of $m$ and $n$, i.e. by a multiple of the lcm; and $k$ is determined modulo $\\frac ng$, so $x = a + mk$ is determined modulo $m \\cdot \\frac ng = \\operatorname{lcm}(m, n)$.

        Examples:

        - $x \\equiv 1 \\pmod 4$, $x \\equiv 3 \\pmod 6$: $g = 2 \\mid 2$. $2k \\equiv 1 \\pmod 3$ gives $k = 2$, $x = 1 + 4 \\cdot 2 = 9$. Answer $x \\equiv 9 \\pmod{12}$.
        - $x \\equiv 1 \\pmod 4$, $x \\equiv 2 \\pmod 6$: $g = 2 \\nmid 1$. **No solution** — the first says $x$ is odd, the second says $x$ is even.

        ## Merging many congruences

        Fold the system left to right, keeping a single combined congruence $x \\equiv r \\pmod M$. Start with $r = a_1, M = m_1$; merge in each $(a_i, m_i)$ with the two-congruence rule, replacing $M$ by $\\operatorname{lcm}(M, m_i)$. If any merge fails the gcd test, the whole system is inconsistent. This works for any moduli, coprime or not, and is the version to keep in your template.
      `,
    },
    {
      t: 'viz',
      algo: 'math-crt-merge',
      caption: 'Each row folds one more congruence into the running (r, M). Watch the gcd column: when it is greater than 1 the modulus grows by only mᵢ/g. Try remainders "1 2" with moduli "4 6" to see the consistency check fail.',
    },
    {
      t: 'code',
      title: 'General CRT by merging (any moduli; returns no solution when inconsistent)',
      code: {
        cpp: `// requires inverse() from the modular-inverse page.
// Returns {r, M} with x ≡ r (mod M), or {-1, -1}. M = lcm must fit in 63 bits.
pair<long long, long long> crt(const vector<long long>& a, const vector<long long>& m) {
    long long r = ((a[0] % m[0]) + m[0]) % m[0], M = m[0];
    for (size_t i = 1; i < a.size(); i++) {
        long long g = __gcd(M, m[i]);
        long long d = a[i] - r;
        if (d % g != 0) return {-1, -1};
        long long mg = m[i] / g;
        long long k = (long long)((__int128)(((d / g) % mg + mg) % mg)
                                  * inverse((M / g) % mg, mg) % mg);
        long long newM = M * mg;                         // lcm(M, m[i])
        r = (long long)(((__int128)k * M + r) % newM);   // k*M can exceed 2^63
        M = newM;
    }
    return {r, M};
}`,
        java: `// returns {r, M} or null; BigInteger keeps every product exact
static long[] crt(long[] a, long[] m) {
    BigInteger r = BigInteger.valueOf(Math.floorMod(a[0], m[0])), M = BigInteger.valueOf(m[0]);
    for (int i = 1; i < a.length; i++) {
        BigInteger mi = BigInteger.valueOf(m[i]);
        BigInteger g = M.gcd(mi);
        BigInteger d = BigInteger.valueOf(a[i]).subtract(r);
        if (d.mod(g).signum() != 0) return null;
        BigInteger mg = mi.divide(g);
        BigInteger k = mg.equals(BigInteger.ONE) ? BigInteger.ZERO
            : d.divide(g).mod(mg).multiply(M.divide(g).mod(mg).modInverse(mg)).mod(mg);
        BigInteger newM = M.multiply(mg);
        r = r.add(k.multiply(M)).mod(newM);
        M = newM;
    }
    return new long[]{r.longValueExact(), M.longValueExact()};
}`,
        python: `from math import gcd

def crt(a, m):
    """x ≡ a[i] (mod m[i]) for all i  ->  (r, M) or None. Python ints never overflow."""
    r, M = a[0] % m[0], m[0]
    for ai, mi in zip(a[1:], m[1:]):
        g = gcd(M, mi)
        if (ai - r) % g:
            return None
        mg = mi // g
        k = (ai - r) // g % mg * pow(M // g, -1, mg) % mg if mg > 1 else 0
        r, M = (r + k * M) % (M * mg), M * mg
    return r, M`,
        js: `// a, m: arrays of BigInt. Returns [r, M] or null.
function crt(a, m) {
  const mod = (x, n) => ((x % n) + n) % n;
  const gcd = (x, y) => (y === 0n ? x : gcd(y, x % y));
  const inv = (x, n) => {                        // extended Euclid on BigInt
    let [r0, r1, t0, t1] = [n, mod(x, n), 0n, 1n];
    while (r1 !== 0n) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [t0, t1] = [t1, t0 - q * t1]; }
    return mod(t0, n);
  };
  let r = mod(a[0], m[0]), M = m[0];
  for (let i = 1; i < a.length; i++) {
    const g = gcd(M, m[i]);
    if (mod(a[i] - r, g) !== 0n) return null;
    const mg = m[i] / g;
    const k = mg === 1n ? 0n : mod((a[i] - r) / g, mg) * inv(M / g, mg) % mg;
    r = mod(r + k * M, M * mg);
    M *= mg;
  }
  return [r, M];
}`,
        c: `/* needs inverse() from the modular-inverse page; __int128 is a GCC/Clang extension */
long long gcdll(long long a, long long b) { while (b) { long long t = a % b; a = b; b = t; } return a; }
int crt(const long long *a, const long long *m, int n, long long *r_out, long long *M_out) {
    long long r = ((a[0] % m[0]) + m[0]) % m[0], M = m[0];
    for (int i = 1; i < n; i++) {
        long long g = gcdll(M, m[i]);
        long long d = a[i] - r;
        if (d % g != 0) return 0;                       /* inconsistent */
        long long mg = m[i] / g;
        long long k = (long long)((__int128)(((d / g) % mg + mg) % mg) * inverse((M / g) % mg, mg) % mg);
        long long newM = M * mg;
        r = (long long)(((__int128)k * M + r) % newM);
        M = newM;
    }
    *r_out = r; *M_out = M;
    return 1;
}`,
      },
      note: 'When mg = 1 the inverse modulo 1 is irrelevant: k ≡ 0 and the new congruence was already implied. The C++/C versions rely on inverse(x, 1) returning 0, which the extended-Euclid code does (r1 = 0 immediately, r0 = 1, t0 = 0).',
    },
    {
      t: 'md',
      md: `
        ## Garner's algorithm: mixed radix, small numbers only

        Sometimes $M$ is astronomically large — say the product of three primes near $10^9$, about $10^{27}$ — and you only need $x \\bmod$ some other number $q$, or digit-by-digit access. **Garner** writes the solution in **mixed radix**:

        $$x = c_1 + c_2 m_1 + c_3 m_1 m_2 + \\cdots + c_k m_1 m_2 \\cdots m_{k-1}, \\qquad 0 \\le c_i < m_i.$$

        Reading this modulo $m_j$, all terms after $c_j$ vanish, and $c_j$ can be solved from the earlier coefficients:

        $$c_j \\equiv \\big(a_j - (c_1 + c_2 m_1 + \\cdots + c_{j-1} m_1\\cdots m_{j-2})\\big) \\cdot (m_1 \\cdots m_{j-1})^{-1} \\pmod{m_j}.$$

        Every quantity is reduced modulo $m_j$, so **no number ever exceeds $m_j^2$** — no big integers needed. To get $x \\bmod q$, evaluate the mixed-radix sum modulo $q$. It is the same merging idea as above; the merge just never materialises the big $M$. Cost: $O(k^2)$ multiplications plus $k$ inverses (pairwise coprime moduli required).
      `,
    },
    {
      t: 'code',
      title: "Garner: x mod q from residues modulo pairwise coprime m[i] (all m[i] and q below 2^31)",
      code: {
        cpp: `long long garner(const vector<long long>& a, const vector<long long>& m, long long q) {
    int k = a.size();
    vector<long long> c(k);
    for (int j = 0; j < k; j++) {
        long long val = 0, prod = 1;              // prefix sum and product, both mod m[j]
        for (int i = 0; i < j; i++) {
            val = (val + c[i] * prod) % m[j];
            prod = prod * (m[i] % m[j]) % m[j];
        }
        long long diff = ((a[j] - val) % m[j] + m[j]) % m[j];
        c[j] = diff * inverse(prod, m[j]) % m[j];
    }
    long long x = 0, prod = 1;                    // evaluate the mixed radix mod q
    for (int i = 0; i < k; i++) {
        x = (x + c[i] % q * prod) % q;
        prod = prod * (m[i] % q) % q;
    }
    return x;
}`,
        java: `static long garner(long[] a, long[] m, long q) {
    int k = a.length;
    long[] c = new long[k];
    for (int j = 0; j < k; j++) {
        long val = 0, prod = 1;
        for (int i = 0; i < j; i++) {
            val = (val + c[i] * prod) % m[j];
            prod = prod * (m[i] % m[j]) % m[j];
        }
        long diff = Math.floorMod(a[j] - val, m[j]);
        c[j] = diff * inverse(prod, m[j]) % m[j];
    }
    long x = 0, prod = 1;
    for (int i = 0; i < k; i++) {
        x = (x + c[i] % q * prod) % q;
        prod = prod * (m[i] % q) % q;
    }
    return x;
}`,
        python: `def garner(a, m, q):
    c = []
    for j in range(len(a)):
        val, prod = 0, 1
        for i in range(j):
            val = (val + c[i] * prod) % m[j]
            prod = prod * m[i] % m[j]
        c.append((a[j] - val) * pow(prod, -1, m[j]) % m[j])
    x, prod = 0, 1
    for ci, mi in zip(c, m):
        x = (x + ci * prod) % q
        prod = prod * mi % q
    return x`,
        js: `// BigInt throughout; inv(x, n) is the extended-Euclid inverse on BigInt
function garner(a, m, q) {
  const mod = (x, n) => ((x % n) + n) % n;
  const c = [];
  for (let j = 0; j < a.length; j++) {
    let val = 0n, prod = 1n;
    for (let i = 0; i < j; i++) {
      val = (val + c[i] * prod) % m[j];
      prod = prod * (m[i] % m[j]) % m[j];
    }
    c.push(mod(a[j] - val, m[j]) * inv(prod, m[j]) % m[j]);
  }
  let x = 0n, prod = 1n;
  for (let i = 0; i < a.length; i++) {
    x = (x + c[i] % q * prod) % q;
    prod = prod * (m[i] % q) % q;
  }
  return x;
}`,
        c: `long long garner(const long long *a, const long long *m, int k, long long q) {
    long long c[64];                              /* k <= 64 */
    for (int j = 0; j < k; j++) {
        long long val = 0, prod = 1;
        for (int i = 0; i < j; i++) {
            val = (val + c[i] * prod) % m[j];
            prod = prod * (m[i] % m[j]) % m[j];
        }
        long long diff = ((a[j] - val) % m[j] + m[j]) % m[j];
        c[j] = diff * inverse(prod, m[j]) % m[j];
    }
    long long x = 0, prod = 1;
    for (int i = 0; i < k; i++) {
        x = (x + c[i] % q * prod) % q;
        prod = prod * (m[i] % q) % q;
    }
    return x;
}`,
      },
    },
    {
      t: 'complexity',
      title: 'CRT costs (k congruences, M = lcm of the moduli)',
      rows: [
        { op: 'Brute-force scan', time: 'O(M)', space: 'O(1)', note: 'only for tiny moduli or as a test oracle' },
        { op: 'Step by the largest modulus', time: 'O(M / max mᵢ)', space: 'O(1)' },
        { op: 'Constructive formula Σ aᵢMᵢyᵢ', time: 'O(k log M)', space: 'O(1)', note: 'pairwise coprime only; needs numbers up to M²' },
        { op: 'Iterative merge (general)', time: 'O(k log M)', space: 'O(1)', note: 'any moduli; detects inconsistency' },
        { op: 'Garner', time: 'O(k² + k log m)', space: 'O(k)', note: 'pairwise coprime; numbers stay below max mᵢ²' },
      ],
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Overflow is the classic CRT bug',
      md: `
        In the merge, $k < \\frac{m_i}{g}$ and $M$ can be close to the final lcm, so $k \\cdot M$ can be about $\\operatorname{lcm} \\cdot m_i$ — far past $2^{63}$ even when the answer itself fits. Also $\\frac{b-a}{g} \\cdot (\\frac Mg)^{-1}$ multiplies two numbers below $m_i$: fine for $m_i < 3 \\cdot 10^9$, not for $m_i \\approx 10^{18}$. Fixes: \`__int128\` in C/C++, \`BigInteger\` in Java, \`BigInt\` in JavaScript, or Garner (which never forms big numbers). Python's integers are unbounded. Also: reduce $(b - a)/g$ modulo $\\frac ng$ **before** multiplying, and normalise negative differences.
      `,
    },
    {
      t: 'md',
      md: `
        ## Where CRT is used

        - **Cycle alignment.** "Light A blinks at times $\\equiv 1 \\pmod 4$, B at $\\equiv 3 \\pmod 6$, C at $\\equiv 5 \\pmod{10}$ — when do all three blink?" Merge: $9 \\pmod{12}$, then with $5 \\pmod{10}$: $g = 2$ divides $5 - 9 = -4$, giving $45 \\pmod{60}$. Calendars (day of week × day of month), gear teeth, planets, and periodic schedules are all this.
        - **Big or composite moduli.** To compute $\\binom nk \\bmod 10^6$ ($= 2^6 \\cdot 5^6$), solve modulo $64$ and $15625$ separately and combine. Or compute an exact integer answer below $10^{18}$ modulo two primes near $10^9$ and reconstruct it — used with number-theoretic transforms, where each prime gives an exact convolution modulo itself.
        - **Double hashing.** Hashing modulo $p_1$ and $p_2$ is, by CRT, equivalent to hashing modulo $p_1 p_2$ — which is why two moduli near $10^9$ make collisions about as rare as one modulus near $10^{18}$.
        - **Speeding up arithmetic mod $n = pq$.** RSA decryption computes $c^d$ modulo $p$ and modulo $q$ separately (half-size numbers, about 4× faster) and combines with CRT.
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How it shows up',
      md: `
        CRT is rarer in interviews than in contests, but appears as: "find the smallest $x$ with these remainders" (state the gcd condition before coding), "two runners/lights/buses with periods $p$ and $q$ starting at offsets — when do they first coincide?", or as the hidden step in a modular-arithmetic follow-up ("what if the modulus were not prime?"). Interviewers check that you **handle non-coprime moduli** and **say how you avoid overflow**.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-crt-solve', 'math-q-crt-consistent', 'math-q-crt-period', 'math-q-crt-unique', 'math-q-crt-construct', 'math-q-crt-overflow', 'math-q-crt-calendar', 'math-q-crt-text'] },
  ],
}

/* ═══════════════════════════════ Counting ═══════════════════════════════ */

export const counting: Page = {
  id: 'counting',
  title: 'Counting: permutations, combinations, stars and bars',
  summary: 'The sum and product rules, permutations and combinations, multisets, restricted arrangements, stars and bars, bijections, and computing C(n, k) exactly, modulo p with tables, and with Lucas for huge n.',
  minutes: 22,
  blocks: [
    {
      t: 'md',
      md: `
        "How many 6-character passwords…", "how many ways to split 10 identical coins among 4 people…", "how many paths through this grid…" — counting questions show up directly in interviews and are the hidden core of most DP and probability problems.

        The naive approach is to **enumerate** and count. That is a fine *test oracle* but hopeless as an algorithm: there are $10! \\approx 3.6 \\cdot 10^6$ orderings of 10 items and $20! \\approx 2.4 \\cdot 10^{18}$ of 20. Counting turns a structure we cannot list into a formula we can evaluate in $O(n)$ or $O(1)$.

        ## The two basic rules

        **Sum rule.** If the objects split into **disjoint** groups, the total is the sum of the group sizes: $|A \\cup B| = |A| + |B|$ when $A \\cap B = \\varnothing$. (If the groups overlap, you overcount — that is inclusion–exclusion, a later page.)

        **Product rule.** If an object is built by a sequence of choices, where step 1 has $c_1$ options and — **whatever was chosen before** — step $i$ always has $c_i$ options, then there are $c_1 c_2 \\cdots c_k$ objects.

        *Proof.* Induction on $k$. For $k = 1$ it is the definition. For $k + 1$ steps, group the objects by their first $k$ choices: by induction there are $c_1 \\cdots c_k$ groups, and each group contains exactly $c_{k+1}$ objects (the last choice). By the sum rule the total is $c_1 \\cdots c_k \\cdot c_{k+1}$. $\\blacksquare$

        The phrase "whatever was chosen before" is the condition people forget: the **number** of options must not depend on earlier choices, even if *which* options are available does.

        Examples. A 4-digit PIN with distinct digits: $10 \\cdot 9 \\cdot 8 \\cdot 7 = 5040$. A licence plate of 3 letters then 3 digits: $26^3 \\cdot 10^3$. Subsets of an $n$-set: each element is in or out, $2^n$.

        ## Permutations and k-permutations

        Arranging all $n$ distinct items in a row: $n$ choices for the first position, $n-1$ for the second, …: $n!$ arrangements.

        Arranging only $k$ of them (ordered, no repetition):

        $$P(n, k) = n (n-1) \\cdots (n - k + 1) = \\frac{n!}{(n-k)!}.$$
      `,
    },
    {
      t: 'viz',
      algo: 'math-count-tree',
      caption: 'Each level is one position; the fan-out shrinks by one per level because one item is used up. Every root-to-leaf path is one arrangement. Try k = 3 to see 4·3·2 = 24 leaves.',
    },
    {
      t: 'md',
      md: `
        ## Combinations

        A **combination** is an unordered selection: a $k$-element subset. Count it by **double counting** the $k$-permutations. Every $k$-permutation is obtained by first choosing *which* $k$ items (a subset) and then *ordering* them ($k!$ ways). So

        $$P(n, k) = \\binom{n}{k} \\cdot k! \\quad\\Longrightarrow\\quad \\binom{n}{k} = \\frac{n!}{k!\\,(n-k)!}.$$

        **Bold rule: if order matters, use $P(n,k)$; if it does not, divide out the $k!$ orderings — $\\binom nk$.** Asking "does swapping two chosen items give a different object?" settles which one you need.

        ## Permutations of a multiset

        How many distinct words can be made from MISSISSIPPI (1 M, 4 I, 4 S, 2 P)? Pretend the copies are distinguishable: $I_1, I_2, \\dots$ — then there are $11!$ words. Each real word corresponds to exactly $1!\\,4!\\,4!\\,2!$ labelled words (permute the labels within each letter). So

        $$\\frac{11!}{1!\\,4!\\,4!\\,2!} = \\frac{39916800}{1 \\cdot 24 \\cdot 24 \\cdot 2} = 34650.$$

        In general, $n$ items with multiplicities $a_1 + a_2 + \\cdots + a_r = n$ give the **multinomial coefficient** $\\frac{n!}{a_1!\\,a_2!\\cdots a_r!}$. With two kinds it is just $\\binom{n}{a_1}$ — choose the positions of the first kind.

        ## Arrangements with restrictions

        Four techniques cover almost every restriction:

        - **Complement.** Count everything and subtract the bad ones. "At least one vowel" = all − "no vowels".
        - **Glue.** "A and B must be adjacent": glue them into one block, arrange $n - 1$ units ($(n-1)!$), times $2$ for the order inside the block: $2\\,(n-1)!$.
        - **Gaps.** "No two girls adjacent" with $b$ boys and $g$ girls: arrange the boys ($b!$), which creates $b + 1$ gaps (ends included); put the girls into distinct gaps in order: $P(b+1, g)$. For 4 boys and 3 girls: $4! \\cdot 5 \\cdot 4 \\cdot 3 = 1440$.
        - **Fix a reference.** Circular arrangements of $n$ people (rotations equal): fix one person's seat and arrange the rest: $(n-1)!$. Equivalently $n!/n$, because each circle corresponds to $n$ rotations.
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Overcounting by ordering what is not ordered',
      md: 'Choosing a team of 3 from 10 "by picking a first, second and third member" gives 10·9·8 = 720 — but each team was counted 3! = 6 times, so there are 120. Choosing "a captain and 2 others" is 10·C(9,2) = 360 — a different, valid question. Before multiplying, write down exactly which objects you count and check that each is produced once.',
    },
    {
      t: 'md',
      md: `
        ## Stars and bars

        **Question.** How many solutions does $x_1 + x_2 + \\cdots + x_k = n$ have in **non-negative integers**? (Equivalently: ways to put $n$ identical balls into $k$ distinct boxes; multisets of size $n$ from $k$ types.)

        **Theorem.** $\\binom{n + k - 1}{k - 1}$.

        *Proof (bijection).* Encode a solution as a row of $n$ stars and $k - 1$ bars: $x_1$ stars, a bar, $x_2$ stars, a bar, …, $x_k$ stars. For $n = 4, k = 3$, the solution $(1, 0, 3)$ is \`★||★★★\`. Every solution gives a row of $n + k - 1$ symbols with exactly $k - 1$ bars, and every such row decodes to exactly one solution (count the stars between consecutive bars). So solutions are in bijection with ways to choose which $k - 1$ of the $n + k - 1$ positions hold bars: $\\binom{n+k-1}{k-1}$. $\\blacksquare$

        **Positive solutions** ($x_i \\ge 1$): give every variable one unit first — set $y_i = x_i - 1 \\ge 0$, so $\\sum y_i = n - k$ and the count is $\\binom{n - 1}{k - 1}$. Equivalently, choose $k - 1$ of the $n - 1$ gaps between $n$ stars. **Lower bounds** $x_i \\ge l_i$: subtract them first. **Upper bounds** $x_i \\le u_i$ need inclusion–exclusion (later page).
      `,
    },
    {
      t: 'viz',
      algo: 'math-count-stars',
      caption: 'Every frame is one solution and its star-and-bar picture. Count the frames: 15 = C(6, 2). Try n = 3, k = 4.',
    },
    {
      t: 'md',
      md: `
        ## Counting through a bijection

        Stars and bars is an instance of the most powerful counting trick: **find a bijection with something you already know how to count.** A bijection proves the two sets have the same size without listing either. Three more you should own:

        - **Subsets ↔ bitmasks.** A subset of $\\{0, \\dots, n-1\\}$ is an $n$-bit number: $2^n$ subsets. This is also how you *enumerate* them in code.
        - **Lattice paths ↔ words.** A path from $(0, 0)$ to $(a, b)$ with unit steps right/up is a word with $a$ R's and $b$ U's: $\\binom{a+b}{a}$ (choose the R positions).
        - **No two consecutive.** Choosing $k$ numbers from $\\{1, \\dots, n\\}$ with no two consecutive: sort them $s_1 < s_2 < \\cdots < s_k$ and map to $t_i = s_i - (i - 1)$. Gaps of at least 2 become gaps of at least 1, so the $t_i$ are any strictly increasing sequence in $\\{1, \\dots, n - k + 1\\}$, and the map is reversible ($s_i = t_i + i - 1$). Answer: $\\binom{n - k + 1}{k}$. For $n = 10, k = 3$: $\\binom{8}{3} = 56$.

        **Bold rule: when a count looks awkward, transform the objects into ones you can count, and check the transformation is reversible.**
      `,
    },
    {
      t: 'md',
      md: `
        ## Computing C(n, k) in code

        Which method depends on $n$, the number of queries, and the modulus.

        ### Exact values for small n

        $\\binom{n}{k}$ fits in a signed 64-bit integer for every $k$ when $n \\le 66$ ($\\binom{66}{33} \\approx 7.2 \\cdot 10^{18}$). The multiplicative formula builds it with only integer steps:

        $$r_0 = 1, \\qquad r_i = \\frac{r_{i-1} \\cdot (n - k + i)}{i} \\quad (i = 1..k), \\qquad r_i = \\binom{n-k+i}{i}.$$

        Each $r_i$ is an integer (it is a binomial coefficient), so the division is exact. But the product $r_{i-1}(n - k + i)$ can overflow even when $r_i$ fits. Fix: divide first using a gcd. Let $g = \\gcd(r_{i-1}, i)$; then $\\frac{i}{g}$ must divide $n - k + i$ (it divides the product and is coprime to $\\frac{r_{i-1}}{g}$), so

        $$r_i = \\frac{r_{i-1}}{g} \\cdot \\frac{n-k+i}{i/g}$$

        with no intermediate value larger than the answer. Also use $k \\leftarrow \\min(k, n - k)$.
      `,
    },
    {
      t: 'code',
      title: 'Exact C(n, k) without overflow (answer must fit in 64 bits)',
      code: {
        cpp: `unsigned long long nCrExact(unsigned long long n, unsigned long long k) {
    if (k > n) return 0;
    k = min(k, n - k);
    unsigned long long r = 1;
    for (unsigned long long i = 1; i <= k; i++) {
        unsigned long long g = std::gcd(r, i);
        r = (r / g) * ((n - k + i) / (i / g));    // both divisions are exact
    }
    return r;
}`,
        java: `static long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }
static long nCrExact(long n, long k) {
    if (k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    long r = 1;
    for (long i = 1; i <= k; i++) {
        long g = gcd(r, i);
        r = (r / g) * ((n - k + i) / (i / g));    // exact; overflows only if the answer does
    }
    return r;
}`,
        python: `from math import comb      # Python's ints are exact: comb(n, k) is all you need

def nCr_exact(n, k):
    if k < 0 or k > n:
        return 0
    k = min(k, n - k)
    r = 1
    for i in range(1, k + 1):
        r = r * (n - k + i) // i    # exact at every step
    return r`,
        js: `// Numbers are exact only below 2^53; use BigInt for anything larger
function nCrExact(n, k) {
  n = BigInt(n); k = BigInt(k);
  if (k < 0n || k > n) return 0n;
  if (n - k < k) k = n - k;
  let r = 1n;
  for (let i = 1n; i <= k; i++) r = r * (n - k + i) / i;   // exact at every step
  return r;
}`,
        c: `unsigned long long gcdu(unsigned long long a, unsigned long long b) { while (b) { unsigned long long t = a % b; a = b; b = t; } return a; }
unsigned long long nCrExact(unsigned long long n, unsigned long long k) {
    if (k > n) return 0;
    if (n - k < k) k = n - k;
    unsigned long long r = 1;
    for (unsigned long long i = 1; i <= k; i++) {
        unsigned long long g = gcdu(r, i);
        r = (r / g) * ((n - k + i) / (i / g));
    }
    return r;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ### Modulo a prime, many queries: factorial tables

        For $n < p$ (typically $n \\le 10^6$ or $10^7$, $p = 10^9 + 7$), build \`fact\` and \`ifact\` once (previous page) and answer each query as $\\text{fact}[n] \\cdot \\text{ifact}[k] \\cdot \\text{ifact}[n-k]$: **$O(N + \\log p)$ precomputation, $O(1)$ per query.** This is the default in contest and interview code.

        ### Modulo a small prime, huge n: Lucas' theorem

        If $p$ is small (say $p \\le 10^5$) and $n$ is huge (up to $10^{18}$), the factorial table cannot reach $n$, and $n!$ contains the factor $p$ anyway. **Lucas' theorem** reduces the problem to digits.

        **Theorem (Lucas).** Write $n = \\sum n_i p^i$ and $k = \\sum k_i p^i$ in base $p$ ($0 \\le n_i, k_i < p$). Then

        $$\\binom{n}{k} \\equiv \\prod_i \\binom{n_i}{k_i} \\pmod p, \\qquad \\text{with } \\binom{n_i}{k_i} = 0 \\text{ when } k_i > n_i.$$

        *Proof sketch.* Two steps.

        1. $(1 + x)^p \\equiv 1 + x^p \\pmod p$ as polynomials. Indeed $\\binom pj = \\frac{p!}{j!(p-j)!}$ for $0 < j < p$: the numerator contains the prime $p$, the denominator does not, so $p \\mid \\binom pj$ and those middle terms vanish.
        2. Write $n = n_0 + p\\,n'$ and $k = k_0 + p\\,k'$ with $n_0, k_0 < p$. Then
           $$(1 + x)^n = (1 + x)^{n_0} \\big((1 + x)^p\\big)^{n'} \\equiv (1 + x)^{n_0} (1 + x^p)^{n'}.$$
           Compare the coefficients of $x^k$. On the left it is $\\binom nk$. On the right, a term is $x^j \\cdot x^{p\\ell}$ with $0 \\le j \\le n_0 < p$; since $j < p$, the exponent $j + p\\ell = k$ forces $j = k_0$ and $\\ell = k'$ — a single term, $\\binom{n_0}{k_0}\\binom{n'}{k'}$ (zero if $k_0 > n_0$). So $\\binom nk \\equiv \\binom{n_0}{k_0} \\binom{n'}{k'}$, and induction on the remaining digits finishes the proof. $\\blacksquare$

        With factorial tables modulo $p$ of size $p$ for the digit binomials, each query costs $O(\\log_p n)$.
      `,
    },
    {
      t: 'viz',
      algo: 'math-count-lucas',
      caption: 'n and k are written in base p; each column contributes one small binomial. Try n = 1000, k = 499, p = 7: a digit of k exceeds the digit of n, so 7 divides C(1000, 499).',
    },
    {
      t: 'code',
      title: "Lucas' theorem with factorial tables modulo a small prime p",
      code: {
        cpp: `struct Lucas {
    long long p; vector<long long> f, inv_f;
    Lucas(long long p) : p(p), f(p), inv_f(p) {
        f[0] = 1;
        for (long long i = 1; i < p; i++) f[i] = f[i - 1] * i % p;
        inv_f[p - 1] = power(f[p - 1], p - 2, p);
        for (long long i = p - 1; i >= 1; i--) inv_f[i - 1] = inv_f[i] * i % p;
    }
    long long small(long long n, long long k) {           // n, k < p
        if (k < 0 || k > n) return 0;
        return f[n] * inv_f[k] % p * inv_f[n - k] % p;
    }
    long long C(long long n, long long k) {               // any n, k >= 0
        long long res = 1;
        while (n > 0 || k > 0) {
            res = res * small(n % p, k % p) % p;
            if (res == 0) return 0;
            n /= p; k /= p;
        }
        return res;
    }
};`,
        java: `static long[] f, invF;
static long P;
static void initLucas(long p) {
    P = p; f = new long[(int) p]; invF = new long[(int) p];
    f[0] = 1;
    for (int i = 1; i < p; i++) f[i] = f[i - 1] * i % p;
    invF[(int) p - 1] = power(f[(int) p - 1], p - 2, p);
    for (int i = (int) p - 1; i >= 1; i--) invF[i - 1] = invF[i] * i % p;
}
static long small(int n, int k) {
    if (k > n) return 0;
    return f[n] * invF[k] % P * invF[n - k] % P;
}
static long lucas(long n, long k) {
    long res = 1;
    while (n > 0 || k > 0) {
        res = res * small((int) (n % P), (int) (k % P)) % P;
        if (res == 0) return 0;
        n /= P; k /= P;
    }
    return res;
}`,
        python: `def make_lucas(p):
    f = [1] * p
    for i in range(1, p):
        f[i] = f[i - 1] * i % p
    inv_f = [1] * p
    inv_f[p - 1] = pow(f[p - 1], p - 2, p)
    for i in range(p - 1, 0, -1):
        inv_f[i - 1] = inv_f[i] * i % p

    def C(n, k):
        res = 1
        while n or k:
            ni, ki = n % p, k % p
            if ki > ni:
                return 0
            res = res * f[ni] * inv_f[ki] * inv_f[ni - ki] % p
            n //= p; k //= p
        return res
    return C`,
        js: `function makeLucas(p) {               // p small (< 9e7), so products stay below 2^53... per step
  const f = [1];
  for (let i = 1; i < p; i++) f[i] = f[i - 1] * i % p;
  const pw = (b, e) => { let r = 1; for (; e > 0; e >>= 1, b = b * b % p) if (e & 1) r = r * b % p; return r; };
  const invF = new Array(p);
  invF[p - 1] = pw(f[p - 1], p - 2);
  for (let i = p - 1; i >= 1; i--) invF[i - 1] = invF[i] * i % p;
  return function C(n, k) {           // n, k may be BigInt for n up to 1e18
    n = BigInt(n); k = BigInt(k);
    const P = BigInt(p);
    let res = 1;
    while (n > 0n || k > 0n) {
      const ni = Number(n % P), ki = Number(k % P);
      if (ki > ni) return 0;
      res = res * f[ni] % p * invF[ki] % p * invF[ni - ki] % p;
      n /= P; k /= P;
    }
    return res;
  };
}`,
        c: `/* p small prime (p <= MAXP); f / invf built once by initLucas */
#define MAXP 100003
long long f[MAXP], invf[MAXP], LP;
void initLucas(long long p) {
    LP = p; f[0] = 1;
    for (long long i = 1; i < p; i++) f[i] = f[i - 1] * i % p;
    invf[p - 1] = power(f[p - 1], p - 2, p);
    for (long long i = p - 1; i >= 1; i--) invf[i - 1] = invf[i] * i % p;
}
long long lucas(long long n, long long k) {
    long long res = 1;
    while (n > 0 || k > 0) {
        long long ni = n % LP, ki = k % LP;
        if (ki > ni) return 0;
        res = res * f[ni] % LP * invf[ki] % LP * invf[ni - ki] % LP;
        n /= LP; k /= LP;
    }
    return res;
}`,
      },
    },
    {
      t: 'complexity',
      title: 'Choosing a binomial method',
      rows: [
        { op: 'Multiplicative formula (exact)', time: 'O(k log k)', space: 'O(1)', note: 'n ≤ 66 for every k in 64 bits; any n if the answer fits' },
        { op: "Pascal's triangle (next page)", time: 'O(n²) build, O(1) query', space: 'O(n²) or O(n) per row', note: 'any modulus, even composite; n ≤ ~5000' },
        { op: 'Factorial tables mod prime p', time: 'O(N + log p) build, O(1) query', space: 'O(N)', note: 'N < p; the default for 1e9+7' },
        { op: 'Lucas mod small prime p', time: 'O(p) build, O(log_p n) query', space: 'O(p)', note: 'n up to 1e18, p up to ~1e6' },
        { op: 'Composite modulus m', time: 'factor m, solve each prime power, CRT', space: '—', note: 'generalised Lucas for p^e; advanced' },
      ],
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Binomial bugs seen in real submissions',
      md: `
        - Computing \`fact[n] / (fact[k] * fact[n-k])\` with tables already reduced mod $p$ — division of residues.
        - Building factorials mod $p$ up to $N \\ge p$: everything from $p!$ on is $0$, and the inverse of $0$ is not $0$, it does not exist. Use Lucas when $n$ can reach $p$.
        - Forgetting \`k < 0 || k > n → 0\`: many formulas (stars and bars with $n < k$, paths with negative steps) silently ask for such values.
        - Exact formula with \`r = r * (n - k + i) / i\` in 64 bits: correct maths, overflowing intermediate. Use the gcd trick or 128-bit.
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How it shows up',
      md: `
        - "Unique paths in an $m \\times n$ grid" — DP is expected, but saying "it is $\\binom{m+n-2}{m-1}$, here is why" and computing it without overflow is a strong signal.
        - "Count arrangements / distributions" — expect the follow-up "now the items are identical" (stars and bars) or "now two must not be adjacent" (gaps).
        - "Return modulo $10^9+7$ for $10^5$ queries" — factorial tables. If the interviewer pushes "what if $n$ is $10^{18}$ and $p$ is small?", Lucas.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-count-pin', 'math-q-count-banana', 'math-q-count-stars', 'math-q-count-positive', 'math-q-count-gaps', 'math-q-count-noconsec', 'math-q-count-lucas', 'math-q-count-which'] },
  ],
}

/* ═══════════════════════════════ Pascal's triangle and binomials ═══════════════════════════════ */

export const pascalBinomial: Page = {
  id: 'pascal-binomial',
  title: "Pascal's triangle, binomial identities and Catalan numbers",
  summary: "C(n, k) = C(n−1, k−1) + C(n−1, k) with a combinatorial proof, the DP table for any modulus, the binomial theorem, the standard identities with proofs, Catalan numbers by reflection, and grid paths.",
  minutes: 22,
  blocks: [
    {
      t: 'md',
      md: `
        Factorial tables need a **prime** modulus larger than $n$. Problems sometimes ask for $\\binom nk$ modulo $10^9$, modulo $2^{32}$, or modulo a number given in the input — and then there is no inverse to divide by. There is a way to build every binomial coefficient using **only additions**.

        ## Pascal's rule

        $$\\binom{n}{k} = \\binom{n-1}{k-1} + \\binom{n-1}{k} \\qquad (1 \\le k \\le n - 1), \\qquad \\binom{n}{0} = \\binom{n}{n} = 1.$$

        *Combinatorial proof.* Count the $k$-subsets of $\\{1, \\dots, n\\}$ by whether they contain the element $n$.

        - Subsets **containing** $n$: the other $k - 1$ elements come from $\\{1, \\dots, n-1\\}$: $\\binom{n-1}{k-1}$ ways.
        - Subsets **not containing** $n$: all $k$ come from $\\{1, \\dots, n-1\\}$: $\\binom{n-1}{k}$ ways.

        The two cases are disjoint and cover everything, so the sum rule gives the identity. $\\blacksquare$

        **Bold rule: "take it or leave it" on one element turns a counting problem into a recurrence — Pascal's rule is the prototype of every subset DP.**

        Laid out row by row, the values form Pascal's triangle: each entry is the sum of the two above it.

        | $n$ | | | | | | | |
        |---|---|---|---|---|---|---|---|
        | 0 | 1 | | | | | | |
        | 1 | 1 | 1 | | | | | |
        | 2 | 1 | 2 | 1 | | | | |
        | 3 | 1 | 3 | 3 | 1 | | | |
        | 4 | 1 | 4 | 6 | 4 | 1 | | |
        | 5 | 1 | 5 | 10 | 10 | 5 | 1 | |
        | 6 | 1 | 6 | 15 | 20 | 15 | 6 | 1 |
      `,
    },
    {
      t: 'viz',
      algo: 'math-pascal-table',
      caption: 'Each cell is filled from the two cells above it, labelled "take" (element i chosen) and "skip". Set m = 2 and n = 10 to see the Sierpiński pattern of odd and even binomials; set m = 6 (not prime) — it still works, because nothing is ever divided.',
    },
    {
      t: 'md',
      md: `
        ## The DP table in code

        The table has $\\frac{(n+1)(n+2)}{2}$ cells, one addition each: $O(n^2)$ time. For $n = 5000$ that is 12.5 million additions — fast — but $O(n^2)$ memory of 64-bit values is 200 MB. Two remedies:

        - store \`int\` instead of \`long long\` when the modulus fits in 31 bits (the sum of two residues below $2^{31}$ still fits in an unsigned 32-bit value), or
        - keep **one row** and update it in place from right to left: \`row[j] += row[j - 1]\` for $j = i, i-1, \\dots, 1$. Going **right to left** matters: \`row[j - 1]\` must still hold the previous row's value when it is read. Left to right would read a value already updated in this row.
      `,
    },
    {
      t: 'code',
      title: 'Binomials modulo any m: full table, and one rolling row',
      code: {
        cpp: `// full table: C[i][j] for all 0 <= j <= i <= n
vector<vector<long long>> pascal(int n, long long m) {
    vector<vector<long long>> C(n + 1);
    for (int i = 0; i <= n; i++) {
        C[i].assign(i + 1, 1 % m);
        for (int j = 1; j < i; j++) C[i][j] = (C[i - 1][j - 1] + C[i - 1][j]) % m;
    }
    return C;
}
// row n only, O(n) memory
vector<long long> pascalRow(int n, long long m) {
    vector<long long> row(n + 1, 0);
    row[0] = 1 % m;
    for (int i = 1; i <= n; i++)
        for (int j = i; j >= 1; j--)                 // right to left!
            row[j] = (row[j] + row[j - 1]) % m;
    return row;
}`,
        java: `static long[][] pascal(int n, long m) {
    long[][] C = new long[n + 1][];
    for (int i = 0; i <= n; i++) {
        C[i] = new long[i + 1];
        C[i][0] = C[i][i] = 1 % m;
        for (int j = 1; j < i; j++) C[i][j] = (C[i - 1][j - 1] + C[i - 1][j]) % m;
    }
    return C;
}
static long[] pascalRow(int n, long m) {
    long[] row = new long[n + 1];
    row[0] = 1 % m;
    for (int i = 1; i <= n; i++)
        for (int j = i; j >= 1; j--)                 // right to left!
            row[j] = (row[j] + row[j - 1]) % m;
    return row;
}`,
        python: `def pascal(n, m):
    C = []
    for i in range(n + 1):
        row = [1 % m] * (i + 1)
        for j in range(1, i):
            row[j] = (C[i - 1][j - 1] + C[i - 1][j]) % m
        C.append(row)
    return C

def pascal_row(n, m):
    row = [1 % m] + [0] * n
    for i in range(1, n + 1):
        for j in range(i, 0, -1):                    # right to left!
            row[j] = (row[j] + row[j - 1]) % m
    return row`,
        js: `function pascal(n, m) {
  const C = [];
  for (let i = 0; i <= n; i++) {
    const row = new Array(i + 1).fill(1 % m);
    for (let j = 1; j < i; j++) row[j] = (C[i - 1][j - 1] + C[i - 1][j]) % m;
    C.push(row);
  }
  return C;
}
function pascalRow(n, m) {
  const row = new Array(n + 1).fill(0);
  row[0] = 1 % m;
  for (let i = 1; i <= n; i++)
    for (let j = i; j >= 1; j--)                     // right to left!
      row[j] = (row[j] + row[j - 1]) % m;
  return row;
}`,
        c: `#define MAXN 5001
static long long C[MAXN][MAXN];                      /* about 200 MB at MAXN = 5001 */
void pascal(int n, long long m) {
    for (int i = 0; i <= n; i++) {
        C[i][0] = C[i][i] = 1 % m;
        for (int j = 1; j < i; j++) C[i][j] = (C[i - 1][j - 1] + C[i - 1][j]) % m;
    }
}
void pascalRow(int n, long long m, long long *row) { /* row has n + 1 slots */
    for (int j = 0; j <= n; j++) row[j] = 0;
    row[0] = 1 % m;
    for (int i = 1; i <= n; i++)
        for (int j = i; j >= 1; j--)                 /* right to left! */
            row[j] = (row[j] + row[j - 1]) % m;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## The binomial theorem

        $$(x + y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{k} y^{n-k}.$$

        *Proof.* Expand $(x + y)(x + y)\\cdots(x + y)$ ($n$ factors) without collecting terms: each term picks $x$ or $y$ from every factor, giving $2^n$ products. The product equals $x^k y^{n-k}$ exactly when $x$ was picked from $k$ of the $n$ factors — and there are $\\binom nk$ ways to choose which. $\\blacksquare$

        Plugging in values gives identities for free:

        - $x = y = 1$: $\\sum_k \\binom nk = 2^n$ — **the row sums are powers of two** (every subset counted by its size).
        - $x = -1, y = 1$, $n \\ge 1$: $\\sum_k (-1)^k \\binom nk = 0$ — a nonempty set has as many even-sized as odd-sized subsets, $2^{n-1}$ each.
        - $x = 2, y = 1$: $\\sum_k \\binom nk 2^k = 3^n$ — each element is "out", "in, colour A" or "in, colour B".

        ## The standard identities, with proofs

        **Symmetry.** $\\binom nk = \\binom n{n-k}$. *Proof:* the map "subset ↦ its complement" is a bijection from $k$-subsets to $(n-k)$-subsets (it is its own inverse).

        **Absorption.** $k\\binom nk = n\\binom{n-1}{k-1}$. *Proof:* count (committee of $k$, chair from the committee). Left: choose the committee, then the chair. Right: choose the chair from all $n$, then the other $k-1$ members from the remaining $n - 1$.

        **Hockey stick.** $\\displaystyle\\sum_{i=r}^{n} \\binom{i}{r} = \\binom{n+1}{r+1}$. *Proof:* count $(r+1)$-subsets of $\\{1, \\dots, n+1\\}$ by their **largest** element. If the largest is $i + 1$ (for $r \\le i \\le n$), the other $r$ elements are chosen from $\\{1, \\dots, i\\}$: $\\binom ir$ ways. Summing over the possible largest elements gives every subset exactly once. (Algebraically: apply Pascal's rule to $\\binom{n+1}{r+1}$ repeatedly — it telescopes.) Example: $\\binom22 + \\binom32 + \\binom42 + \\binom52 = 1 + 3 + 6 + 10 = 20 = \\binom63$.

        **Vandermonde.** $\\displaystyle\\sum_{i=0}^{k} \\binom{m}{i}\\binom{n}{k-i} = \\binom{m+n}{k}$. *Proof:* choose $k$ people from $m$ women and $n$ men; group the choices by the number $i$ of women. Special case $m = n = k$, with symmetry $\\binom{n}{k-i} = \\binom ni$: $\\sum_i \\binom ni^2 = \\binom{2n}{n}$.

        **Bold rule: to prove a binomial identity, find one set and count it two ways.** That is how every proof above works, and it is the fastest way to remember the identities too.
      `,
    },
    {
      t: 'callout',
      kind: 'tip',
      title: 'Identities that turn O(n) sums into O(1)',
      md: 'Sums like $\\sum_{i=r}^n \\binom ir$ appear in "count all subsequences of length r+1 ending anywhere" or "number of triples with i < j < k ≤ n" problems. Recognise the hockey stick and replace an O(n) loop (or an O(n²) DP) with one binomial. Likewise $\\sum_k k\\binom nk = n2^{n-1}$ follows from absorption plus the row sum.',
    },
    {
      t: 'md',
      md: `
        ## Grid paths

        Moving from the top-left corner of a grid to the bottom-right with only **right** and **down** steps, through $a$ rows and $b$ columns of moves: every path is a word of $a$ D's and $b$ R's, so there are $\\binom{a+b}{a}$ paths. The DP view — "paths to a cell = paths to the cell above + paths to the cell on the left" — is Pascal's rule rotated by 45°: the value at $(r, c)$ is $\\binom{r+c}{r}$.

        Variations:

        - **Through a point** $P$: (paths start → P) × (paths P → end), by the product rule.
        - **Avoiding a point** $P$: all paths − paths through $P$ (complement).
        - **Obstacles everywhere:** run the DP and put $0$ on blocked cells — $O(ab)$. With few obstacles and a huge grid, sort the obstacles and use inclusion–exclusion over "first obstacle hit" with binomials — $O(k^2)$ for $k$ obstacles.
      `,
    },
    {
      t: 'viz',
      algo: 'math-pascal-paths',
      initial: { mode: 'free' },
      caption: 'Free paths: every cell is the sum of the cell above and the cell to its left, and the corner of an n × n grid is C(2n, n) = 70 for n = 4. Switch the mode to "dyck" to forbid crossing the diagonal.',
    },
    {
      t: 'md',
      md: `
        ## Catalan numbers

        Count the paths from $(0,0)$ to $(n,n)$ that **never go below the diagonal** — at every point the number of R steps so far is at least the number of D steps. Read R as "(" and D as ")": these are exactly the **balanced bracket strings** with $n$ pairs. The answer is the $n$-th **Catalan number**:

        $$C_n = \\frac{1}{n+1}\\binom{2n}{n}: \\qquad 1, 1, 2, 5, 14, 42, 132, 429, 1430, 4862, \\dots$$

        ### Derivation by reflection

        Use $\\pm1$ steps: "(" is $+1$, ")" is $-1$. A string is balanced iff the running sum (the height) never drops below $0$ and ends at $0$. Count the complement: **bad** strings with $n$ of each symbol whose height reaches $-1$ somewhere.

        Take a bad string and find the **first** moment its height is $-1$. Flip every symbol **after** that moment (swap "(" and ")"). The height after the moment is reflected across the line $-1$, so the final height becomes $-1 - (0 - (-1)) = -2$: the new string has $n - 1$ "(" and $n + 1$ ")".

        This is a bijection between bad strings and **all** strings with $n-1$ "(" and $n+1$ ")": any such string ends at $-2$, so it must pass $-1$, and flipping after its first visit to $-1$ undoes the map. Strings with $n + 1$ ")" among $2n$ symbols: $\\binom{2n}{n+1}$. Therefore

        $$C_n = \\binom{2n}{n} - \\binom{2n}{n+1} = \\binom{2n}{n} - \\frac{n}{n+1}\\binom{2n}{n} = \\frac{1}{n+1}\\binom{2n}{n},$$

        using $\\binom{2n}{n+1} = \\binom{2n}{n}\\cdot\\frac{n}{n+1}$ (multiply out the factorials). For $n = 4$: $70 - 56 = 14$. ✓

        The **ballot problem** is the same picture: if candidate A gets $a$ votes and B gets $b < a$, the probability A is strictly ahead throughout the count is $\\frac{a-b}{a+b}$ — proved by the same reflection.
      `,
    },
    {
      t: 'viz',
      algo: 'math-pascal-paths',
      initial: { mode: 'dyck' },
      caption: 'Cells below the diagonal are forbidden (0). The corner now holds 14 = C(8, 4) − C(8, 5) = 70 − 56: the reflection argument in numbers.',
    },
    {
      t: 'md',
      md: `
        ### The recurrence: first-return decomposition

        Every nonempty balanced string has a unique form $(\\,A\\,)\\,B$: the "(" at the front is matched by some ")", with a balanced string $A$ inside and a balanced string $B$ after. If $A$ has $i$ pairs, $B$ has $n - 1 - i$. By the sum and product rules,

        $$C_0 = 1, \\qquad C_n = \\sum_{i=0}^{n-1} C_i\\, C_{n-1-i}.$$

        This convolution is the fingerprint of Catalan: **whenever a structure splits into a root plus two independent sub-structures whose sizes add to $n - 1$, expect Catalan numbers.**

        - **Binary search trees** with $n$ distinct keys: choose the root $i+1$; the left subtree is a BST on $i$ keys and the right on $n - 1 - i$. $C_3 = 5$ BSTs on 3 keys.
        - **Full binary trees** with $n + 1$ leaves, and **ways to parenthesise** a product of $n + 1$ factors: $C_n$.
        - **Triangulations** of a convex $(n+2)$-gon: $C_n$ (the triangle on a fixed edge splits the polygon in two).
        - **Stack-sortable permutations** and valid push/pop sequences of $n$ items: $C_n$.
        - **Mountain ranges / Dyck paths** and monotone lattice paths not crossing the diagonal: $C_n$.
      `,
    },
    {
      t: 'viz',
      algo: 'math-pascal-catalan',
      caption: 'Each term pairs "i pairs inside the first bracket" with "n−1−i pairs after it". Watch the two factors move towards each other from opposite ends.',
    },
    {
      t: 'code',
      title: 'Catalan numbers: exact by the recurrence, and modulo p in O(1) with factorial tables',
      code: {
        cpp: `// exact: C_n fits in 64 bits up to n = 35
vector<unsigned long long> catalanExact(int n) {
    vector<unsigned long long> c(n + 1, 0);
    c[0] = 1;
    for (int m = 1; m <= n; m++)
        for (int i = 0; i < m; i++) c[m] += c[i] * c[m - 1 - i];
    return c;
}
// mod p, using fact / ifact from the modular-inverse page (needs 2n < p)
long long catalanMod(int n) {
    return fact[2 * n] * ifact[n] % MOD * ifact[n + 1] % MOD;   // (2n)! / (n! (n+1)!)
}`,
        java: `static long[] catalanExact(int n) {          // exact up to n = 35
    long[] c = new long[n + 1];
    c[0] = 1;
    for (int m = 1; m <= n; m++)
        for (int i = 0; i < m; i++) c[m] += c[i] * c[m - 1 - i];
    return c;
}
static long catalanMod(int n) {              // fact / ifact tables, 2n < MOD
    return fact[2 * n] * ifact[n] % MOD * ifact[n + 1] % MOD;
}`,
        python: `def catalan_exact(n):
    c = [1] + [0] * n
    for m in range(1, n + 1):
        c[m] = sum(c[i] * c[m - 1 - i] for i in range(m))
    return c

def catalan_mod(n, fact, ifact, MOD=10**9 + 7):
    return fact[2 * n] * ifact[n] % MOD * ifact[n + 1] % MOD`,
        js: `function catalanExact(n) {                   // BigInt: values pass 2^53 at n = 31
  const c = [1n];
  for (let m = 1; m <= n; m++) {
    c[m] = 0n;
    for (let i = 0; i < m; i++) c[m] += c[i] * c[m - 1 - i];
  }
  return c;
}
const catalanMod = (n, fact, ifact) => fact[2 * n] * ifact[n] % MOD * ifact[n + 1] % MOD;`,
        c: `void catalanExact(int n, unsigned long long *c) {   /* exact up to n = 35 */
    c[0] = 1;
    for (int m = 1; m <= n; m++) {
        c[m] = 0;
        for (int i = 0; i < m; i++) c[m] += c[i] * c[m - 1 - i];
    }
}
long long catalanMod(int n) {                /* fact / ifact tables, 2n < MOD */
    return fact[2 * n] * ifact[n] % MOD * ifact[n + 1] % MOD;
}`,
      },
      note: 'Why ifact[n + 1]: C_n = (2n)! / (n!·n!·(n+1)) = (2n)! / (n!·(n+1)!).',
    },
    {
      t: 'complexity',
      title: 'Costs on this page',
      rows: [
        { op: "Pascal's table to row n", time: 'O(n²)', space: 'O(n²), or O(n) for one row', note: 'any modulus' },
        { op: 'Grid paths, a × b, obstacles', time: 'O(ab)', space: 'O(b) with a rolling row' },
        { op: 'Grid paths, no obstacles', time: 'O(1) with factorial tables', space: 'O(a + b)' },
        { op: 'Catalan by recurrence', time: 'O(n²)', space: 'O(n)', note: 'exact or any modulus' },
        { op: 'Catalan by formula', time: 'O(1) per value after O(n) tables', space: 'O(n)', note: 'prime modulus > 2n' },
      ],
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Common slips',
      md: `
        - Rolling-row Pascal updated **left to right**: it reads values from the current row and produces nonsense (row 2 would become 1, 2, 2 instead of 1, 2, 1… and worse later).
        - $C_n$ by formula with $2n \\ge p$: $(2n)!$ is $0$ mod $p$. Use the recurrence or Lucas.
        - Off-by-one between "n pairs" and "n nodes" and "n + 1 leaves" and "(n + 2)-gon". Check with $n = 3$: 5 bracket strings, 5 BSTs on 3 keys, 5 triangulations of a pentagon.
        - Grid sizes: an $m \\times n$ grid **of cells** needs $m - 1$ down and $n - 1$ right moves: $\\binom{m+n-2}{m-1}$, not $\\binom{m+n}{m}$.
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How it shows up',
      md: `
        - "Unique paths" (LeetCode 62/63) — DP or $\\binom{m+n-2}{m-1}$; with obstacles, DP only.
        - "Unique binary search trees" (LeetCode 96) — the Catalan recurrence; the interviewer checks you can explain *why* left and right counts multiply.
        - "Generate all balanced parentheses" — the count $C_n$ bounds the output size, so the backtracking is $O(C_n \\cdot n)$, roughly $4^n / n^{1/2}$.
        - "Pascal's triangle" row $k$ in $O(k)$ space — the right-to-left update, or $\\binom{k}{j} = \\binom{k}{j-1}\\cdot\\frac{k-j+1}{j}$.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-pascal-row', 'math-q-pascal-identities', 'math-q-pascal-hockey', 'math-q-pascal-hockey-name', 'math-q-pascal-rolling', 'math-q-pascal-bst', 'math-q-pascal-reflect', 'math-q-pascal-through'] },
  ],
}
