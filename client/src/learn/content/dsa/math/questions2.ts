import type { Question } from '../../../questions/types'

const T = 'math'

export const questions2: Question[] = [
  // ── Sieves
  {
    id: 'math-q-sieve-start', topic: T, page: 'sieve', kind: 'mcq', difficulty: 'easy',
    title: 'Why start at p²?',
    prompt: 'In the Sieve of Eratosthenes, prime $p$ starts crossing at $p^2$ instead of $2p$. Why is that safe?',
    options: [
      'Every multiple $p\\cdot k$ with $k < p$ has a prime factor $q \\le k < p$, so a smaller prime already crossed it.',
      'Numbers between $2p$ and $p^2$ are all prime.',
      'Crossing below $p^2$ would cross $p$ itself.',
      'It is only an optimisation for even $p$; for odd $p$ you must start at $2p$.',
    ],
    answer: 0,
    hint: 'Look at $p\\cdot k$ with $k < p$: what is its smallest prime factor?',
    explain: 'A multiple $pk$ with $2 \\le k < p$ has a prime factor $q \\le k < p$, and the smaller prime $q$ was processed earlier and crossed $pk$ already. So starting at $p^2$ loses nothing. Numbers between $2p$ and $p^2$ are certainly not all prime (e.g. $3p$ for $p = 5$ is 15). Starting at $2p$ would never cross $p$ itself (that starts at $1\\cdot p$), and the argument holds for every prime, odd or even.',
  },
  {
    id: 'math-q-sieve-cross-count', topic: T, page: 'sieve', kind: 'numeric', difficulty: 'medium',
    title: 'Count the cross-outs',
    prompt: 'Run the Sieve of Eratosthenes on $n = 30$, where each prime $p$ with $p^2 \\le n$ crosses $p^2, p^2 + p, \\dots \\le 30$. How many cross-out **writes** happen in total (counting a number crossed twice as two writes)?',
    answer: 24,
    hint: 'Only primes with $p^2 \\le 30$ cross anything: 2, 3, 5.',
    explain: 'Prime 2 crosses $4, 6, \\dots, 30$: 14 writes. Prime 3 crosses $9, 12, \\dots, 30$: 8 writes. Prime 5 crosses $25, 30$: 2 writes. Total $14 + 8 + 2 = 24$. There are only 19 composites in $2..30$ — the extra 5 writes are repeats like 12, 18, 24, 30 (crossed by 2 and 3) and 30 again by 5. Those repeats are exactly what makes Eratosthenes $n\\log\\log n$ rather than linear. Counting from $2p$ instead of $p^2$, or including 7 (since $49 > 30$ it crosses nothing), gives a wrong total.',
  },
  {
    id: 'math-q-sieve-spf-array', topic: T, page: 'sieve', kind: 'array', difficulty: 'medium',
    title: 'Fill the SPF table',
    prompt: 'Build the smallest-prime-factor table for $n = 20$. Give $\\text{spf}[2], \\text{spf}[3], \\dots, \\text{spf}[20]$ in order (19 values).',
    answer: [2, 3, 2, 5, 2, 7, 2, 3, 2, 11, 2, 13, 2, 3, 2, 17, 2, 19, 2],
    placeholder: 'e.g. 2, 3, 2, …',
    explain: 'Each prime writes itself only into empty cells, in increasing order, so the first writer is the smallest prime factor. Every even number gets 2. Odd composites: 9 and 15 get 3. Primes (3, 5, 7, 11, 13, 17, 19) get themselves. A common slip is writing the **largest** prime factor (e.g. 5 for 15) — that would happen if later primes overwrote taken cells.',
  },
  {
    id: 'math-q-sieve-linear-pair', topic: T, page: 'sieve', kind: 'text', difficulty: 'medium',
    title: 'Who writes 63?',
    prompt: 'In the linear (Euler) sieve every composite $m$ is written exactly once, by the pair $(i, p)$ with $m = i\\cdot p$. Which pair writes $\\text{lp}[63]$? Answer as `i, p`.',
    accept: ['21, 3', '21,3', '(21, 3)', '(21,3)', 'i=21, p=3', 'i = 21, p = 3', '21 3', 'i=21,p=3'],
    placeholder: 'i, p',
    hint: 'The writing prime is always $\\text{lp}(m)$.',
    explain: 'The writer is $p = \\text{lp}(63) = 3$ and $i = 63/3 = 21$. It passes the test $p \\le \\text{lp}(i)$ since $\\text{lp}(21) = 3$. The other factorisation, $i = 9, p = 7$, is rejected: at $i = 9$ the loop stops once $p > \\text{lp}(9) = 3$, so 7 never pairs with 9. That stopping rule is what makes each composite written exactly once.',
  },
  {
    id: 'math-q-sieve-segment-start', topic: T, page: 'sieve', kind: 'numeric', difficulty: 'medium',
    title: 'Where does 7 start?',
    prompt: 'A segmented sieve processes the window $[L, R] = [20, 60]$. At which number does base prime $p = 7$ start crossing?',
    answer: 49,
    hint: 'The start is $\\max(p^2, \\lceil L/p \\rceil \\cdot p)$.',
    explain: 'The first multiple of 7 that is $\\ge 20$ is $\\lceil 20/7\\rceil\\cdot7 = 21$, but the start is $\\max(p^2, 21) = \\max(49, 21) = 49$. Starting at 21 would not be wrong here (21, 28, 35, 42 are composite and get crossed by 2, 3 or 5 anyway), but the $p^2$ floor matters in general: it guarantees $p$ itself is never crossed when it lies inside the window (try $L = 1$). Answering 21 forgets the max; 14 forgets the window.',
  },
  {
    id: 'math-q-sieve-fill', topic: T, page: 'sieve', kind: 'fill', difficulty: 'easy',
    title: 'Complete Eratosthenes',
    prompt: 'Fill in the loop bounds of the classic sieve (use `p` and `n`).',
    lang: 'python',
    code: `
composite = [False] * (n + 1)
p = 2
while [[0]]:
    if not composite[p]:
        j = [[1]]
        while j <= n:
            composite[j] = True
            j += [[2]]
    p += 1`,
    blanks: [['p * p <= n', 'p*p <= n', 'p*p<=n', 'p ** 2 <= n', 'p**2 <= n'], ['p * p', 'p*p', 'p ** 2', 'p**2'], ['p']],
    explain: 'The outer loop stops at $\\sqrt n$ — every composite $\\le n$ has a prime factor $\\le \\sqrt n$. Note `<=`, not `<`: with $n = 49$, `p * p < n` would never cross 49. Crossing starts at $p^2$ because smaller multiples were already crossed by smaller primes, and steps by $p$ to visit every multiple.',
  },
  {
    id: 'math-q-sieve-memory', topic: T, page: 'sieve', kind: 'numeric', difficulty: 'medium',
    title: 'Memory for 10⁹',
    prompt: 'You sieve up to $n = 10^9$ storing **one bit per odd number** only. About how many megabytes ($10^6$ bytes) does the sieve array take?',
    answer: 62.5,
    tolerance: 1,
    unit: 'MB',
    explain: 'There are $n/2 = 5\\cdot10^8$ odd numbers, at one bit each: $5\\cdot10^8 / 8 = 6.25\\cdot10^7$ bytes $= 62.5$ MB. One **byte** per number would be 1000 MB; one bit per number (not odd-only) 125 MB; one byte per odd number 500 MB. Odd-only halves both memory and work because 2 is the only even prime.',
  },
  {
    id: 'math-q-sieve-match', topic: T, page: 'sieve', kind: 'match', difficulty: 'medium',
    title: 'Pick the sieve',
    prompt: 'Match each task with the right tool.',
    left: [
      'Count primes below $10^8$ within 64 MB',
      'Factorise $10^5$ values, each $\\le 10^6$',
      'List the primes in $[10^{12} - 10^6, 10^{12}]$',
      'Compute $\\varphi(1..n)$ together with lp[] in one $\\Theta(n)$ pass',
    ],
    right: [
      'Bit-packed (odd-only) Eratosthenes',
      'Smallest-prime-factor table, $O(\\log x)$ per query',
      'Segmented sieve with base primes up to $10^6$',
      'Linear (Euler) sieve',
    ],
    explain: 'Counting primes needs only yes/no marks, so the bit-packed Eratosthenes wins on memory (6.25 MB odd-only). Many factorisations want the SPF table: each walk is at most $\\log_2 x$ lookups. A window near $10^{12}$ cannot be stored whole; the segmented sieve only needs base primes up to $\\sqrt R = 10^6$. The linear sieve writes each composite once with its least prime — exactly what a multiplicative-function recurrence needs.',
  },

  // ── Divisor functions and φ
  {
    id: 'math-q-phi-dcount', topic: T, page: 'divisor-functions', kind: 'numeric', difficulty: 'easy',
    title: 'Divisors of 720',
    prompt: 'How many positive divisors does $720$ have?',
    answer: 30,
    hint: 'Factorise first: $720 = 2^? \\cdot 3^? \\cdot 5^?$.',
    explain: '$720 = 2^4\\cdot3^2\\cdot5$, so $d(720) = (4 + 1)(2 + 1)(1 + 1) = 30$. Each divisor is a choice of exponents $0..4$, $0..2$, $0..1$. Multiplying the exponents themselves ($4\\cdot2\\cdot1 = 8$) forgets that exponent 0 is a choice too; adding them misses that choices are independent.',
  },
  {
    id: 'math-q-phi-sigma', topic: T, page: 'divisor-functions', kind: 'numeric', difficulty: 'medium',
    title: 'Sum of divisors of 72',
    prompt: 'Compute $\\sigma(72)$, the sum of all positive divisors of 72.',
    answer: 195,
    explain: '$72 = 2^3\\cdot3^2$, so $\\sigma(72) = (1 + 2 + 4 + 8)(1 + 3 + 9) = 15\\cdot13 = 195$. Expanding the product picks one power of 2 and one power of 3 — every divisor exactly once. Forgetting the term 1 in each bracket, or summing only proper divisors ($195 - 72 = 123$), are the usual slips.',
  },
  {
    id: 'math-q-phi-totient', topic: T, page: 'divisor-functions', kind: 'numeric', difficulty: 'easy',
    title: 'φ(84)',
    prompt: 'Compute $\\varphi(84)$.',
    answer: 24,
    explain: '$84 = 2^2\\cdot3\\cdot7$, so $\\varphi(84) = 84\\cdot\\tfrac12\\cdot\\tfrac23\\cdot\\tfrac67 = 24$. Each **distinct** prime contributes one factor $(1 - 1/p)$ — the exponent of 2 does not matter. In integer code: `res = 84 → 42 → 28 → 24` via `res -= res / p`. Using $(p - 1)$ per prime without the $n$ (i.e. $1\\cdot2\\cdot6 = 12$) forgets the $p^{e-1}$ part of $\\varphi(p^e)$.',
  },
  {
    id: 'math-q-phi-sum-divisors', topic: T, page: 'divisor-functions', kind: 'numeric', difficulty: 'medium',
    title: 'Σ φ(d) over divisors of 1000',
    prompt: 'Compute $\\displaystyle\\sum_{d \\mid 1000} \\varphi(d)$.',
    answer: 1000,
    hint: 'Group $k = 1..n$ by $\\gcd(k, n)$.',
    explain: 'For every $n$, $\\sum_{d \\mid n}\\varphi(d) = n$: grouping $k = 1..n$ by $g = \\gcd(k, n)$, the group of $g$ has exactly $\\varphi(n/g)$ members, and every $k$ is in one group. So the sum is $1000$, with no need to list the 16 divisors. Equivalently, of the fractions $\\frac{k}{1000}$ in lowest terms, exactly $\\varphi(d)$ have denominator $d$.',
  },
  {
    id: 'math-q-phi-three-divisors', topic: T, page: 'divisor-functions', kind: 'multi', difficulty: 'easy',
    title: 'Exactly three divisors',
    prompt: 'Select every number that has **exactly three** positive divisors.',
    options: ['4', '8', '9', '12', '16', '25', '49', '121'],
    answers: [0, 2, 5, 6, 7],
    explain: '$d(n) = \\prod(e_i + 1) = 3$ forces a single prime with $e = 2$: $n = p^2$. So 4, 9, 25, 49, 121. $8 = 2^3$ has 4 divisors; $16 = 2^4$ is a square but has 5 (squares have an **odd** count, not necessarily 3); $12 = 2^2\\cdot3$ has 6.',
  },
  {
    id: 'math-q-phi-multiplicative', topic: T, page: 'divisor-functions', kind: 'multi', difficulty: 'medium',
    title: 'Multiplicative or not?',
    prompt: 'Select every **true** statement.',
    options: [
      '$d(ab) = d(a)\\,d(b)$ whenever $\\gcd(a, b) = 1$',
      '$d(ab) = d(a)\\,d(b)$ for all positive $a, b$',
      '$\\sigma(ab) = \\sigma(a)\\,\\sigma(b)$ whenever $\\gcd(a, b) = 1$',
      '$\\varphi(6\\cdot 6) = \\varphi(6)^2$',
      '$f(n) = n^2$ is completely multiplicative',
    ],
    answers: [0, 2, 4],
    explain: '$d$ and $\\sigma$ are multiplicative: for coprime $a, b$ each divisor of $ab$ splits uniquely into a divisor of $a$ times a divisor of $b$. Without coprimality it fails: $d(4) = 3$ but $d(2)^2 = 4$. Likewise $\\varphi(36) = 12$ while $\\varphi(6)^2 = 4$ — 6 and 6 share primes. $n^2$ satisfies $(ab)^2 = a^2b^2$ for all $a, b$, so it is completely multiplicative.',
  },
  {
    id: 'math-q-phi-maxdiv', topic: T, page: 'divisor-functions', kind: 'mcq', difficulty: 'medium',
    title: 'How many divisors at most?',
    prompt: 'Your solution iterates over all divisors of each of $10^5$ array values, each $\\le 10^9$ (divisors already generated from a factorisation). The maximum of $d(n)$ for $n \\le 10^9$ is closest to:',
    options: ['$32$', '$1\\,344$', '$31\\,623$ (that is $\\sqrt{10^9}$)', '$63\\,246$ (that is $2\\sqrt{10^9}$)'],
    answer: 1,
    explain: 'The record for $n \\le 10^9$ is $d(735\\,134\\,400) = 1344$ — roughly $\\sqrt[3]{n}$. So the loop is at most $1.3\\cdot10^8$ steps, fine. $2\\sqrt n$ is only the trivial pairing bound and is far from tight; 32 is the record for $n \\le 1000$.',
  },
  {
    id: 'math-q-phi-sieve-fill', topic: T, page: 'divisor-functions', kind: 'fill', difficulty: 'medium',
    title: 'Complete the φ sieve',
    prompt: 'Complete the $O(n\\log\\log n)$ φ sieve (use `p`, `j`, `phi`).',
    lang: 'python',
    code: `
phi = list(range(n + 1))
for p in range(2, n + 1):
    if phi[p] == [[0]]:              # untouched, so p is prime
        for j in range([[1]], n + 1, p):
            phi[j] -= [[2]]`,
    blanks: [['p'], ['p'], ['phi[j] // p', 'phi[j]//p']],
    explain: 'A cell still equal to its index has not been touched by any smaller prime, so it is prime. Unlike Eratosthenes, the inner loop starts at $p$ itself, not $p^2$: **every** multiple needs the factor $(1 - 1/p)$, including $p$ (which leaves $\\varphi(p) = p - 1$). `phi[j] -= phi[j] // p` applies that factor exactly, because $p$ still divides `phi[j]` at that moment; multiplying by a float `(1 - 1/p)` risks rounding errors.',
  },

  // ── Modular arithmetic
  {
    id: 'math-q-mod-neg', topic: T, page: 'modular-arithmetic', kind: 'mcq', difficulty: 'easy',
    title: 'Negative remainders',
    prompt: 'What does `-17 % 5` evaluate to in **Java** and in **Python**?',
    options: ['Java $-2$, Python $3$', 'Java $3$, Python $3$', 'Java $-2$, Python $-2$', 'Java $3$, Python $-2$'],
    answer: 0,
    explain: 'Java (like C, C++, JavaScript) truncates the quotient toward zero: $-17 = -3\\cdot5 - 2$, so the remainder takes the dividend\'s sign: $-2$. Python floors the quotient: $-17 = -4\\cdot5 + 3$, so the result is $3$ — the mathematical residue. In C-family code normalise with `((a % m) + m) % m` or `Math.floorMod`.',
  },
  {
    id: 'math-q-mod-last-digit', topic: T, page: 'modular-arithmetic', kind: 'numeric', difficulty: 'easy',
    title: 'Last digit of 3²⁰²⁶',
    prompt: 'What is the last digit of $3^{2026}$?',
    answer: 9,
    hint: 'Work mod 10 and find the first power of 3 that is $\\equiv 1$.',
    explain: 'Modulo 10: $3^1 = 3$, $3^2 = 9$, $3^3 \\equiv 7$, $3^4 \\equiv 1$. Since $2026 = 4\\cdot506 + 2$, $3^{2026} = (3^4)^{506}\\cdot3^2 \\equiv 9$. Reducing the exponent mod 10 (giving $3^6 \\equiv 9$ here by luck) is not a valid rule in general — exponents reduce by the cycle length (here 4), not by the modulus.',
  },
  {
    id: 'math-q-mod-cancel', topic: T, page: 'modular-arithmetic', kind: 'numeric', difficulty: 'medium',
    title: 'What survives cancelling?',
    prompt: 'From $6x \\equiv 6y \\pmod{15}$ you may conclude $x \\equiv y \\pmod{m}$ for which largest $m$?',
    answer: 5,
    explain: 'The cancellation law: $ca \\equiv cb \\pmod m \\implies a \\equiv b \\pmod{m/\\gcd(c, m)}$. Here $\\gcd(6, 15) = 3$, so $x \\equiv y \\pmod 5$. Concluding mod 15 is wrong: $x = 0, y = 5$ gives $0 \\equiv 30 \\pmod{15}$ yet $0 \\not\\equiv 5$. You may cancel outright only when $\\gcd(c, m) = 1$.',
  },
  {
    id: 'math-q-mod-overflow', topic: T, page: 'modular-arithmetic', kind: 'multi', difficulty: 'medium',
    title: 'Which products are safe?',
    prompt: '`MOD = 1e9+7`; `a`, `b` are already in $[0, \\text{MOD})$. Select every expression that computes $a\\cdot b \\bmod \\text{MOD}$ **correctly**.',
    options: [
      'C++, `int a, b`: `long long x = a * b % MOD;`',
      'C++, `int a, b`: `long long x = 1LL * a * b % MOD;`',
      'Java, `long a, b`: `long x = a * b % MOD;`',
      'JavaScript, numbers: `const x = a * b % MOD;`',
      'Python: `x = a * b % MOD`',
    ],
    answers: [1, 2, 4],
    explain: 'The product is below $(10^9 + 7)^2 < 2^{60}$, so it is safe **if the multiply happens in 64 bits**. `a * b` with two `int`s is computed in 32 bits and overflows before being widened; `1LL * a * b` widens first. Java `long * long` is fine. JavaScript numbers are doubles, exact only to $2^{53}$, so a product near $10^{18}$ silently loses low digits — use BigInt or the split multiply. Python integers are arbitrary precision.',
  },
  {
    id: 'math-q-mod-fermat', topic: T, page: 'modular-arithmetic', kind: 'numeric', difficulty: 'medium',
    title: 'Fermat in your head',
    prompt: 'Compute $2^{100} \\bmod 13$.',
    answer: 3,
    hint: '13 is prime, so $2^{12} \\equiv 1$.',
    explain: 'By Fermat, $2^{12} \\equiv 1 \\pmod{13}$. $100 = 12\\cdot8 + 4$, so $2^{100} \\equiv 2^4 = 16 \\equiv 3$. Reducing the exponent mod 13 (giving $2^{9} = 512 \\equiv 5$) is the classic error: exponents reduce mod $p - 1$, not mod $p$.',
  },
  {
    id: 'math-q-mod-carmichael', topic: T, page: 'modular-arithmetic', kind: 'mcq', difficulty: 'medium',
    title: 'What 561 teaches',
    prompt: '$561 = 3\\cdot11\\cdot17$, yet $a^{560} \\equiv 1 \\pmod{561}$ for every $a$ coprime to 561. What does this show?',
    options: [
      'The converse of Fermat fails: passing $a^{n-1} \\equiv 1$ does not prove $n$ prime.',
      'Fermat\'s little theorem is false for some primes.',
      '561 is prime.',
      'Euler\'s theorem fails for composite moduli.',
    ],
    answer: 0,
    explain: 'Fermat says prime $\\Rightarrow a^{p-1} \\equiv 1$; it says nothing in the other direction. Carmichael numbers like 561 pass the test for **every** coprime base, so a Fermat test alone can be fooled — Miller–Rabin checks more. Fermat\'s theorem itself has a proof and holds for all primes; Euler\'s theorem is fine too ($a^{\\varphi(561)} = a^{320} \\equiv 1$) — 561 just happens to satisfy the stronger-looking $a^{560} \\equiv 1$ as well.',
  },
  {
    id: 'math-q-mod-why-prime', topic: T, page: 'modular-arithmetic', kind: 'multi', difficulty: 'easy',
    title: 'Why 10⁹ + 7?',
    prompt: 'Select every **genuine** reason contest problems use $10^9 + 7$.',
    options: [
      'It is prime, so every nonzero residue has a modular inverse.',
      'The product of two residues is below $2^{60}$, fitting a signed 64-bit integer.',
      'The sum of two residues fits a signed 32-bit integer.',
      'Modulo $10^9 + 7$ you may compare reduced values to find the maximum.',
      'It supports the number-theoretic transform with $2^{23}$-th roots of unity.',
    ],
    answers: [0, 1, 2],
    explain: 'Primality gives inverses (division for $\\binom nk$, expected values); $10^9 + 7 < 2^{30}$ makes sums fit 32 bits and products fit 64 bits. Comparing reduced values is never valid under any modulus. The NTT-friendly modulus is $998\\,244\\,353 = 119\\cdot2^{23} + 1$, not $10^9 + 7$.',
  },
  {
    id: 'math-q-mod-fill-norm', topic: T, page: 'modular-arithmetic', kind: 'fill', difficulty: 'easy',
    title: 'Normalise in C++',
    prompt: 'Complete these C++ helpers so the result is always in $[0, \\text{MOD})$. `norm` takes any `a` (possibly negative); `sub` takes `a, b` already in $[0, \\text{MOD})$.',
    lang: 'cpp',
    code: `
long long norm(long long a) { return [[0]]; }
long long sub(long long a, long long b) { return [[1]]; }`,
    blanks: [
      ['((a % MOD) + MOD) % MOD', '(a % MOD + MOD) % MOD', '((a%MOD)+MOD)%MOD', '(a%MOD+MOD)%MOD'],
      ['(a - b + MOD) % MOD', '(a-b+MOD)%MOD', '(a + MOD - b) % MOD', '(a+MOD-b)%MOD'],
    ],
    explain: 'In C++ `a % MOD` keeps the sign of `a`, so it lies in $(-\\text{MOD}, \\text{MOD})$; adding MOD makes it positive and a second `% MOD` brings it back below MOD. For `sub`, $a - b \\in (-\\text{MOD}, \\text{MOD})$ already, so one `+ MOD` and one `% MOD` suffice. Plain `(a - b) % MOD` is negative whenever $a < b$.',
  },

  // ── Fast power
  {
    id: 'math-q-pow-rounds', topic: T, page: 'fast-power', kind: 'numeric', difficulty: 'easy',
    title: 'Rounds for 10¹⁸',
    prompt: 'Iterative binary exponentiation with $b = 10^{18}$: how many loop rounds (squarings of `base`) run?',
    answer: 60,
    hint: 'One round per bit of $b$: $\\lfloor\\log_2 b\\rfloor + 1$.',
    explain: '$2^{59} \\approx 5.8\\cdot10^{17} \\le 10^{18} < 2^{60}$, so $b$ has $\\lfloor\\log_2 b\\rfloor + 1 = 60$ bits and the loop runs 60 rounds. The number of multiplications into `res` is the popcount of $b$ (24 here), not 60. Either way it is $O(\\log b)$ instead of $10^{18}$ steps.',
  },
  {
    id: 'math-q-pow-trace', topic: T, page: 'fast-power', kind: 'array', difficulty: 'medium',
    title: 'Trace 3¹¹ mod 100',
    prompt: 'Run the iterative loop for $3^{11} \\bmod 100$ (`res = 1`, `base = 3`; each round: if `b & 1` then `res = res * base % 100`; then square `base`, halve `b`). Give the value of `res` at the **end** of each round.',
    answer: [3, 27, 27, 47],
    placeholder: 'res after round 1, 2, …',
    explain: '$11 = 1011_2$. Round 1: bit 1, res $= 3$, base $\\to 9$. Round 2: bit 1, res $= 27$, base $\\to 81$. Round 3: bit 0, res stays 27, base $\\to 6561 \\bmod 100 = 61$. Round 4: bit 1, res $= 27\\cdot61 = 1647 \\to 47$. Check: $3^{11} = 177147 \\equiv 47$. Multiplying in when the bit is 0, or forgetting to reduce base to 61, gives a different trace.',
  },
  {
    id: 'math-q-pow-matrix', topic: T, page: 'fast-power', kind: 'mcq', difficulty: 'medium',
    title: 'Build the matrix',
    prompt: 'For $a_n = a_{n-1} + a_{n-2} + 1$, with state vector $(a_{n-1}, a_{n-2}, 1)^T$, which matrix $M$ gives $(a_n, a_{n-1}, 1)^T = M\\,(a_{n-1}, a_{n-2}, 1)^T$?',
    options: [
      '$\\begin{pmatrix}1 & 1 & 1\\\\1 & 0 & 0\\\\0 & 0 & 1\\end{pmatrix}$',
      '$\\begin{pmatrix}1 & 1 & 0\\\\1 & 0 & 0\\\\0 & 0 & 1\\end{pmatrix}$',
      '$\\begin{pmatrix}1 & 1 & 1\\\\0 & 1 & 0\\\\0 & 0 & 1\\end{pmatrix}$',
      '$\\begin{pmatrix}1 & 1 & 1\\\\1 & 0 & 0\\\\1 & 1 & 1\\end{pmatrix}$',
    ],
    answer: 0,
    explain: 'Row 1 is the recurrence: $a_n = 1\\cdot a_{n-1} + 1\\cdot a_{n-2} + 1\\cdot1$. Row 2 shifts: the new second component is $a_{n-1}$. Row 3 keeps the constant: $1 = 0 + 0 + 1\\cdot1$. Option B drops the $+1$; option C copies $a_{n-2}$ instead of shifting $a_{n-1}$ down; option D makes the constant component grow.',
  },
  {
    id: 'math-q-pow-order', topic: T, page: 'fast-power', kind: 'order', difficulty: 'medium',
    title: 'Fibonacci for n = 10¹⁸',
    prompt: 'Order these ways of computing $F_n \\bmod m$ from **fastest** to **slowest** for huge $n$.',
    items: [
      'Fast doubling ($\\approx 3$ multiplications per bit)',
      '$2\\times2$ matrix power ($\\approx 8$–16 multiplications per bit)',
      '$3\\times3$ matrix power of a padded state ($\\approx 27$–54 per bit)',
      'Loop $F_{i+1} = F_i + F_{i-1}$ for $i$ up to $n$ ($O(n)$)',
      'Naive recursion $F(n-1) + F(n-2)$ ($O(\\varphi^n)$)',
    ],
    explain: 'All three matrix/doubling methods are $O(\\log n)$ and differ only by the constant per bit: fast doubling needs about 3 products, a $2\\times2$ product costs 8 (and both a square and a multiply may happen), a $3\\times3$ product costs 27. The linear loop is $O(n)$ — $10^{18}$ steps is centuries — and naive recursion is exponential.',
  },
  {
    id: 'math-q-pow-euler-trap', topic: T, page: 'fast-power', kind: 'mcq', difficulty: 'hard',
    title: 'The Euler shortcut goes wrong',
    prompt: 'To compute $6^{b} \\bmod 10$ someone uses $6^{\\,b \\bmod \\varphi(10)} = 6^{\\,b \\bmod 4}$. For $b = 4$ it outputs $6^0 = 1$, but the true value is $6$. Why?',
    options: [
      '$\\gcd(6, 10) = 2 \\ne 1$, so Euler\'s theorem does not apply; use $a^{\\varphi(m) + (b \\bmod \\varphi(m))}$ for $b \\ge \\log_2 m$.',
      '$\\varphi(10)$ is 5, not 4.',
      'The exponent should be reduced mod 10, not mod $\\varphi(10)$.',
      'Euler\'s theorem needs $m$ prime.',
    ],
    answer: 0,
    explain: 'Euler\'s theorem $a^{\\varphi(m)} \\equiv 1$ requires $\\gcd(a, m) = 1$; here $6^4 = 1296 \\equiv 6 \\ne 1$. The generalised form $a^b \\equiv a^{\\varphi(m) + (b \\bmod \\varphi(m))}$ (valid for $b \\ge \\log_2 m$) gives $6^{4 + 0} \\equiv 6$. ✓ $\\varphi(10) = 4$ is correct (1, 3, 7, 9). Reducing mod 10 is never right for exponents, and Euler works for any modulus as long as $a$ is coprime to it.',
  },
  {
    id: 'math-q-pow-tower', topic: T, page: 'fast-power', kind: 'numeric', difficulty: 'hard',
    title: 'A small tower',
    prompt: 'Compute $2^{(3^{5})} \\bmod 13$.',
    answer: 8,
    hint: '13 is prime and does not divide 2: reduce the exponent mod 12.',
    explain: 'Since $\\gcd(2, 13) = 1$, reduce the exponent mod $\\varphi(13) = 12$: $3^5 = 243 = 12\\cdot20 + 3$, so the answer is $2^3 = 8$. Reducing $243$ mod 13 instead ($243 \\equiv 9$, giving $2^9 = 512 \\equiv 5$) is the classic wrong move — exponents live mod $p - 1$, not mod $p$.',
  },
  {
    id: 'math-q-pow-doubling', topic: T, page: 'fast-power', kind: 'numeric', difficulty: 'medium',
    title: 'One doubling step',
    prompt: 'Given $F_{15} = 610$ and $F_{16} = 987$, use fast doubling to compute $F_{30}$.',
    answer: 832040,
    hint: '$F_{2k} = F_k\\,(2F_{k+1} - F_k)$.',
    explain: '$F_{30} = F_{15}(2F_{16} - F_{15}) = 610\\cdot(1974 - 610) = 610\\cdot1364 = 832\\,040$. The other formula, $F_{31} = F_{16}^2 + F_{15}^2 = 974\\,169 + 372\\,100 = 1\\,346\\,269$, gives the next term — confusing the two is the usual slip.',
  },
  {
    id: 'math-q-pow-match', topic: T, page: 'fast-power', kind: 'match', difficulty: 'medium',
    title: 'Which tool?',
    prompt: 'Match each problem with the technique it needs.',
    left: [
      '$x^n$ for a double $x$ and `int n` that may be `INT_MIN`',
      'Number of walks of exactly $k$ steps between two vertices',
      '$a^{b^{c}} \\bmod m$ with $a$ possibly sharing factors with $m$',
      '$a_n = 2a_{n-1} + 3a_{n-2} + 5$ for $n = 10^{18}$',
    ],
    right: [
      'Binary exponentiation of $x^{|n|}$ in 64-bit, then invert',
      'Power of the adjacency matrix',
      'Generalised Euler, recursing $m \\to \\varphi(m)$',
      '$3\\times3$ matrix power with a constant-1 state component',
    ],
    explain: 'Pow(x, n) is plain binary exponentiation, but $-n$ overflows for `INT_MIN`, so widen first. $(A^k)_{uv}$ counts walks of length $k$. Power towers reduce exponents mod $\\varphi(m)$ recursively, and when $\\gcd(a, m)$ may exceed 1 the generalised form $a^{\\varphi(m) + (b \\bmod \\varphi(m))}$ is needed. A linear recurrence with a constant becomes a matrix once a component that is always 1 is added.',
  },
]
