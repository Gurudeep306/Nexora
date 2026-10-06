import type { Question } from '../../../questions/types'

const T = 'math'

export const questions3: Question[] = [
  // ── Modular inverse
  {
    id: 'math-q-inv-exists', topic: T, page: 'modular-inverse', kind: 'multi', difficulty: 'easy',
    title: 'Which residues are invertible mod 12?',
    prompt: 'Select **every** $a$ that has an inverse modulo $12$.',
    options: ['$a = 1$', '$a = 5$', '$a = 6$', '$a = 7$', '$a = 9$', '$a = 11$'],
    answers: [0, 1, 3, 5],
    hint: '$a^{-1} \\bmod m$ exists exactly when $\\gcd(a, m) = 1$.',
    explain: 'An inverse exists iff $\\gcd(a, 12) = 1$. That holds for $1, 5, 7, 11$ (each is its own inverse: $5 \\cdot 5 = 25 \\equiv 1$, $7 \\cdot 7 = 49 \\equiv 1$, $11 \\cdot 11 = 121 \\equiv 1$). $6$ shares the factor $6$ with $12$: every $6x \\bmod 12$ is $0$ or $6$, never $1$. $9$ shares the factor $3$: every $9x \\bmod 12$ is a multiple of $3$ ($0, 9, 6, 3$), so $1$ never appears.',
  },
  {
    id: 'math-q-inv-compute', topic: T, page: 'modular-inverse', kind: 'numeric', difficulty: 'medium',
    title: 'Extended Euclid by hand',
    prompt: 'Run extended Euclid on $(m, a) = (26, 11)$ keeping the invariant $r_i \\equiv t_i \\cdot a \\pmod m$. What is $11^{-1} \\bmod 26$, normalised into $[0, 26)$?',
    answer: 19,
    hint: 'Rows $(r, t)$: $(26, 0), (11, 1)$, then $q = 2$ gives $(4, -2)$ … continue until $r = 1$.',
    explain: 'Rows: $(26, 0)$, $(11, 1)$; $q = 2$: $(4, -2)$; $q = 2$: $(3, 5)$; $q = 1$: $(1, -7)$. So $r = 1$ with $t = -7$, i.e. $11^{-1} \\equiv -7 \\equiv 19$. Check: $11 \\cdot 19 = 209 = 8 \\cdot 26 + 1$. Answering $-7$ forgets to normalise — the $t$ column can be negative.',
  },
  {
    id: 'math-q-inv-wrong-div', topic: T, page: 'modular-inverse', kind: 'mcq', difficulty: 'easy',
    title: 'Dividing residues',
    prompt: 'We want $\\frac{20}{5} = 4$ modulo $7$. Code reduces first, `a = 20 % 7 = 6`, `b = 5 % 7 = 5`, and returns `a / b` (integer division). What does it return, and what is the correct way?',
    options: [
      'It returns $4$ — reducing before dividing is always safe',
      'It returns $1$; correct is $6 \\cdot 5^{-1} = 6 \\cdot 3 = 18 \\equiv 4$',
      'It returns $1$; correct is to divide first and never reduce',
      'It returns $1$; there is no correct way because $5 \\nmid 6$',
    ],
    answer: 1,
    explain: 'Integer division of residues gives $6 / 5 = 1$ — wrong. Division modulo $7$ is multiplication by the inverse: $5 \\cdot 3 = 15 \\equiv 1$, so $5^{-1} = 3$ and $6 \\cdot 3 = 18 \\equiv 4$ ✓. "Divide first" only works when the numbers are small enough to keep exactly (not $n!$ for $n = 10^6$). And $5 \\nmid 6$ does not matter: modulo a prime every nonzero residue is invertible.',
  },
  {
    id: 'math-q-inv-fermat', topic: T, page: 'modular-inverse', kind: 'numeric', difficulty: 'medium',
    title: 'Inverse by Fermat',
    prompt: 'By Fermat, $a^{-1} \\equiv a^{p-2} \\pmod p$ for a prime $p$. Compute $10^{-1} \\bmod 17$ (an integer in $[0, 17)$).',
    answer: 12,
    hint: 'You need $10^{15} \\bmod 17$ — or just look for $x$ with $10x \\equiv 1$ and confirm.',
    explain: '$10^{15} \\bmod 17 = 12$, and indeed $10 \\cdot 12 = 120 = 7 \\cdot 17 + 1$. The exponent is $p - 2 = 15$, not $p - 1$: $a^{p-1} \\equiv 1$ is Fermat\'s theorem itself, and splitting off one factor $a$ leaves $a^{p-2}$ as the inverse.',
  },
  {
    id: 'math-q-inv-composite', topic: T, page: 'modular-inverse', kind: 'mcq', difficulty: 'medium',
    title: 'Fermat on a composite modulus',
    prompt: 'Someone computes $3^{-1} \\bmod 10$ as `pow(3, 10 - 2, 10)`. What happens?',
    options: [
      'It returns $7$, the correct inverse',
      'It returns $1$, which is wrong ($3 \\cdot 1 \\not\\equiv 1$); the correct inverse is $7$, found by extended Euclid',
      'It crashes because $10$ is not prime',
      'It returns $0$ because $\\gcd(3, 10) > 1$',
    ],
    answer: 1,
    explain: '$3^8 = 6561 \\equiv 1 \\pmod{10}$, so the code returns $1$ — silently wrong, no crash. Fermat\'s $a^{p-2}$ is only valid for a **prime** modulus. The inverse does exist ($\\gcd(3, 10) = 1$): $3 \\cdot 7 = 21 \\equiv 1$. Extended Euclid works for any modulus; the Euler form $a^{\\varphi(m)-1} = 3^{3} = 27 \\equiv 7$ also works, but needs $\\varphi(10) = 4$, i.e. the factorisation.',
  },
  {
    id: 'math-q-inv-table', topic: T, page: 'modular-inverse', kind: 'array', difficulty: 'medium',
    title: 'The linear inverse table',
    prompt: 'Fill `inv[1..6]` modulo $p = 11$ with $\\texttt{inv[i]} = (p - \\lfloor p/i \\rfloor \\cdot \\texttt{inv[p \\% i]} \\bmod p) \\bmod p$, starting from `inv[1] = 1`. Give `inv[1], …, inv[6]`.',
    answer: [1, 6, 4, 3, 9, 2],
    placeholder: 'e.g. 1, 2, 3, 4, 5, 6',
    explain: '$i=2$: $11 = 5\\cdot2+1$, $-5\\cdot1 \\equiv 6$. $i=3$: $11 = 3\\cdot3+2$, $-3\\cdot6 = -18 \\equiv 4$. $i=4$: $11 = 2\\cdot4+3$, $-2\\cdot4 = -8 \\equiv 3$. $i=5$: $11 = 2\\cdot5+1$, $-2\\cdot1 \\equiv 9$. $i=6$: $11 = 1\\cdot6+5$, $-1\\cdot9 \\equiv 2$. Check each: $2\\cdot6, 3\\cdot4, 4\\cdot3, 5\\cdot9 = 45, 6\\cdot2$ are all $\\equiv 1$. Note each step reads `inv[p % i]`, a smaller index — not `inv[i - 1]`.',
  },
  {
    id: 'math-q-inv-fill', topic: T, page: 'modular-inverse', kind: 'fill', difficulty: 'medium',
    title: 'Inverse factorials',
    prompt: 'Complete the inverse-factorial table (prime `MOD > N`, `power(b, e, p)` is fast exponentiation).',
    lang: 'python',
    code: `
fact[0] = 1
for i in range(1, N + 1):
    fact[i] = fact[i - 1] * i % MOD
ifact[N] = power(fact[N], [[0]], MOD)
for i in range(N, 0, -1):
    ifact[i - 1] = ifact[i] * [[1]] % MOD`,
    blanks: [['MOD - 2', 'MOD-2'], ['i']],
    explain: 'One Fermat inverse, $\\text{fact}[N]^{p-2}$, then walk backwards: $((i-1)!)^{-1} = i \\cdot (i!)^{-1}$ because $i! = (i-1)! \\cdot i$. Multiplying by $i - 1$ or by $\\text{fact}[i]$ would be wrong — we are peeling off exactly one factor $i$. Using `MOD - 1` as the exponent gives $1$ (Fermat\'s theorem), not the inverse.',
  },
  {
    id: 'math-q-inv-match', topic: T, page: 'modular-inverse', kind: 'match', difficulty: 'medium',
    title: 'Which inverse method?',
    prompt: 'Match each method with the situation it is made for.',
    left: ['Extended Euclid', 'Fermat $a^{p-2}$', 'Linear table $\\text{inv}[i] = -\\lfloor p/i \\rfloor \\cdot \\text{inv}[p \\bmod i]$', 'Batch inversion with prefix products', 'Euler $a^{\\varphi(m)-1}$'],
    right: ['Any modulus with $\\gcd(a, m) = 1$, $O(\\log m)$', 'One inverse modulo a prime, $O(\\log p)$', 'All of $1^{-1}, \\dots, n^{-1}$ modulo a prime $p > n$ in $O(n)$', '$n$ arbitrary invertible values for the price of one inverse', 'Composite modulus whose factorisation you already know'],
    explain: 'Extended Euclid only needs the gcd to be $1$. Fermat needs a prime. The linear table relies on $p \\bmod i < i$ having been computed already, so it inverts the consecutive range $1..n$. Batch inversion inverts the full prefix product once and recovers each $a_i^{-1}$ in about three multiplications. Euler generalises Fermat but needs $\\varphi(m)$, which needs the factorisation of $m$.',
  },

  // ── Chinese Remainder Theorem
  {
    id: 'math-q-crt-solve', topic: T, page: 'crt', kind: 'numeric', difficulty: 'medium',
    title: 'Solve a small system',
    prompt: 'Find the smallest $x \\ge 0$ with $x \\equiv 2 \\pmod 3$, $x \\equiv 3 \\pmod 4$, $x \\equiv 1 \\pmod 5$.',
    answer: 11,
    hint: 'Merge two at a time: candidates $\\equiv 3 \\pmod 4$ are $3, 7, 11, \\dots$',
    explain: 'Merge $x \\equiv 2 \\pmod 3$ with $x \\equiv 3 \\pmod 4$: among $2, 5, 8, 11$ the one $\\equiv 3 \\pmod 4$ is $11$, so $x \\equiv 11 \\pmod{12}$. Then among $11, 23, 35, 47, 59$ the one $\\equiv 1 \\pmod 5$ is $11$ itself. Answer $x \\equiv 11 \\pmod{60}$; check $11 = 3\\cdot3+2 = 2\\cdot4+3 = 2\\cdot5+1$. The moduli are pairwise coprime, so the solution is unique modulo $60$.',
  },
  {
    id: 'math-q-crt-consistent', topic: T, page: 'crt', kind: 'multi', difficulty: 'medium',
    title: 'Which systems are solvable?',
    prompt: 'Select every system that has a solution.',
    options: [
      '$x \\equiv 1 \\pmod 4,\\ x \\equiv 3 \\pmod 6$',
      '$x \\equiv 1 \\pmod 4,\\ x \\equiv 2 \\pmod 6$',
      '$x \\equiv 3 \\pmod 6,\\ x \\equiv 5 \\pmod 9$',
      '$x \\equiv 2 \\pmod 6,\\ x \\equiv 8 \\pmod{10}$',
      '$x \\equiv 0 \\pmod 4,\\ x \\equiv 2 \\pmod 8$',
      '$x \\equiv 5 \\pmod 7,\\ x \\equiv 2 \\pmod 9$',
    ],
    answers: [0, 3, 5],
    hint: '$x \\equiv a \\pmod m$, $x \\equiv b \\pmod n$ is solvable iff $\\gcd(m, n) \\mid b - a$.',
    explain: 'Apply the gcd test. (1) $g = 2 \\mid 2$ ✓. (2) $g = 2 \\nmid 1$ ✗ — odd vs even. (3) $g = 3 \\nmid 2$ ✗. (4) $g = 2 \\mid 6$ ✓ (e.g. $x = 38$). (5) $g = 4 \\nmid 2$ ✗ — a multiple of $8$ plus $2$ is never a multiple of $4$. (6) $7$ and $9$ are coprime, so CRT guarantees a solution. Non-coprime moduli are not automatically inconsistent; only the gcd test decides.',
  },
  {
    id: 'math-q-crt-period', topic: T, page: 'crt', kind: 'numeric', difficulty: 'medium',
    title: 'Modulus of the merged answer',
    prompt: 'The system $x \\equiv 5 \\pmod{12}$, $x \\equiv 11 \\pmod{18}$ is solvable. Its solution is unique modulo what number?',
    answer: 36,
    explain: '$g = \\gcd(12, 18) = 6$ divides $11 - 5 = 6$, so a solution exists ($x = 29$). Two solutions differ by a common multiple of $12$ and $18$, so the answer is unique modulo $\\operatorname{lcm}(12, 18) = \\frac{12 \\cdot 18}{6} = 36$ — not $12 \\cdot 18 = 216$, which is the modulus only when the moduli are coprime.',
  },
  {
    id: 'math-q-crt-unique', topic: T, page: 'crt', kind: 'mcq', difficulty: 'easy',
    title: 'How many solutions in a range?',
    prompt: 'How many integers $x$ in $[0, 1000)$ satisfy $x \\equiv 2 \\pmod 3$, $x \\equiv 3 \\pmod 5$, $x \\equiv 2 \\pmod 7$?',
    options: ['$1$', '$9$', '$10$', '$105$'],
    answer: 2,
    explain: 'The moduli are pairwise coprime, so the solution is unique modulo $M = 105$: $x \\equiv 23$. The solutions in range are $23, 128, 233, \\dots, 968$ — that is $\\lfloor (999 - 23)/105 \\rfloor + 1 = 10$. "1" confuses unique modulo $M$ with unique overall; $105$ confuses the period with the count.',
  },
  {
    id: 'math-q-crt-construct', topic: T, page: 'crt', kind: 'numeric', difficulty: 'hard',
    title: 'A basis vector',
    prompt: 'For moduli $4, 5, 9$ ($M = 180$), the constructive formula uses $M_3 y_3$ with $M_3 = M / 9$ and $y_3 = M_3^{-1} \\bmod 9$. What is $M_3 y_3$? (It is $\\equiv 1 \\pmod 9$ and $\\equiv 0$ modulo $4$ and $5$.)',
    answer: 100,
    explain: '$M_3 = 180 / 9 = 20$, and $20 \\equiv 2 \\pmod 9$, whose inverse is $5$ ($2 \\cdot 5 = 10 \\equiv 1$). So $M_3 y_3 = 100$. Check: $100 = 11 \\cdot 9 + 1$, and $100$ is divisible by $4$ and $5$. Answering $20$ forgets $y_3$: $20$ is $\\equiv 0$ mod $4$ and $5$ but $\\equiv 2$, not $1$, mod $9$.',
  },
  {
    id: 'math-q-crt-overflow', topic: T, page: 'crt', kind: 'mcq', difficulty: 'medium',
    title: 'Where CRT overflows',
    prompt: 'Merging congruences with moduli near $10^{9}$ into a running $(r, M)$ with 64-bit integers, answers are below $10^{18}$. Which statement is right?',
    options: [
      'Nothing can overflow, because the final answer fits in 64 bits',
      'The step $x = r + M \\cdot k$ can overflow: $M \\cdot k$ can be about $\\operatorname{lcm} \\cdot m_i$ before reduction — use 128-bit, big integers, or Garner',
      'Only the gcd computation can overflow',
      'Overflow is impossible if all moduli are prime',
    ],
    answer: 1,
    explain: 'Intermediate products can be far larger than the answer: $k < m_i / g$ and $M$ may already be near the final lcm, so $M \\cdot k$ can reach about $10^{27}$. Fixes: `__int128`, `BigInteger`/`BigInt`, or Garner, which keeps every number below $m_j^2$. The gcd never exceeds its inputs, and primality of the moduli does not shrink the products.',
  },
  {
    id: 'math-q-crt-calendar', topic: T, page: 'crt', kind: 'numeric', difficulty: 'hard',
    title: 'When do all three jobs run?',
    prompt: 'Job A runs on days $\\equiv 2 \\pmod 6$, job B on days $\\equiv 5 \\pmod 9$, job C on days $\\equiv 8 \\pmod{10}$. What is the first day $\\ge 0$ on which all three run?',
    answer: 68,
    hint: 'Merge A and B first (check the gcd), then merge the result with C.',
    explain: 'A with B: $g = 3 \\mid 5 - 2$ ✓. $x = 2 + 6k$, $6k \\equiv 3 \\pmod 9 \\Rightarrow 2k \\equiv 1 \\pmod 3 \\Rightarrow k = 2$, $x \\equiv 14 \\pmod{18}$. With C: $g = 2 \\mid 8 - 14$ ✓. $x = 14 + 18k$, $18k \\equiv -6 \\pmod{10} \\Rightarrow 9k \\equiv -3 \\equiv 2 \\pmod 5 \\Rightarrow 4k \\equiv 2 \\Rightarrow k = 3$, $x = 68$, unique modulo $\\operatorname{lcm}(6, 9, 10) = 90$. Check: $68 = 66 + 2 = 63 + 5 = 60 + 8$.',
  },
  {
    id: 'math-q-crt-text', topic: T, page: 'crt', kind: 'text', difficulty: 'easy',
    title: 'Mixed radix',
    prompt: 'Which algorithm writes the CRT solution as $c_1 + c_2 m_1 + c_3 m_1 m_2 + \\cdots$ so that no intermediate number exceeds $m_j^2$? (One word, a person\'s name.)',
    accept: ['Garner', "Garner's", "Garner's algorithm", 'Garner algorithm'],
    placeholder: 'name',
    explain: '**Garner\'s algorithm** solves for the mixed-radix digits $c_j$ one at a time, each reduced modulo $m_j$, so it never materialises the huge product $M$. It needs pairwise coprime moduli and costs $O(k^2)$ multiplications plus $k$ inverses.',
  },

  // ── Counting
  {
    id: 'math-q-count-pin', topic: T, page: 'counting', kind: 'numeric', difficulty: 'easy',
    title: 'PINs with distinct digits',
    prompt: 'How many 4-digit codes have **all digits distinct** and a **first digit that is not 0**?',
    answer: 4536,
    explain: 'Product rule: $9$ choices for the first digit (1–9), then $9$ for the second (0 is back, the first digit is used), $8$, then $7$: $9 \\cdot 9 \\cdot 8 \\cdot 7 = 4536$. Which digits are available changes with earlier choices, but the **number** of options does not — that is all the product rule needs. $10 \\cdot 9 \\cdot 8 \\cdot 7 = 5040$ ignores the leading-zero rule; $9 \\cdot 8 \\cdot 7 \\cdot 6$ forgets that 0 becomes available after the first position.',
  },
  {
    id: 'math-q-count-banana', topic: T, page: 'counting', kind: 'numeric', difficulty: 'easy',
    title: 'Anagrams of BANANA',
    prompt: 'How many distinct words can be formed by rearranging all the letters of **BANANA**?',
    answer: 60,
    explain: 'Multiset permutation: 6 letters with A×3, N×2, B×1, so $\\frac{6!}{3!\\,2!\\,1!} = \\frac{720}{12} = 60$. $6! = 720$ counts each word $3!\\,2! = 12$ times (permuting the identical A\'s and N\'s among themselves).',
  },
  {
    id: 'math-q-count-stars', topic: T, page: 'counting', kind: 'numeric', difficulty: 'medium',
    title: 'Identical coins, distinct people',
    prompt: 'In how many ways can 10 identical coins be split among 4 people (someone may get none)?',
    answer: 286,
    explain: 'Non-negative solutions of $x_1 + x_2 + x_3 + x_4 = 10$: stars and bars with $10$ stars and $3$ bars, $\\binom{13}{3} = 286$. $\\binom{13}{4}$ is the same as $\\binom{13}{9}$ — wrong; $4^{10}$ would treat the coins as distinct.',
  },
  {
    id: 'math-q-count-positive', topic: T, page: 'counting', kind: 'mcq', difficulty: 'medium',
    title: 'Positive solutions',
    prompt: 'The number of solutions of $x_1 + \\cdots + x_k = n$ with every $x_i \\ge 1$ is…',
    options: ['$\\binom{n+k-1}{k-1}$', '$\\binom{n-1}{k-1}$', '$\\binom{n-1}{k}$', '$\\binom{n}{k}$'],
    answer: 1,
    explain: 'Give each variable its mandatory unit: $y_i = x_i - 1 \\ge 0$ and $\\sum y_i = n - k$, so the count is $\\binom{(n-k) + k - 1}{k - 1} = \\binom{n-1}{k-1}$. Equivalently, choose $k - 1$ of the $n - 1$ gaps between $n$ stars. $\\binom{n+k-1}{k-1}$ is the non-negative count. E.g. $n = 10, k = 4$: $\\binom 93 = 84$.',
  },
  {
    id: 'math-q-count-gaps', topic: T, page: 'counting', kind: 'numeric', difficulty: 'medium',
    title: 'No two girls adjacent',
    prompt: '5 distinct boys and 3 distinct girls stand in a row. How many arrangements have **no two girls adjacent**?',
    answer: 14400,
    explain: 'Gap method: arrange the boys ($5! = 120$), creating $6$ gaps (ends included). Put the 3 girls into 3 different gaps, in order: $P(6, 3) = 6 \\cdot 5 \\cdot 4 = 120$. Total $120 \\cdot 120 = 14400$. Using $\\binom 63$ instead of $P(6,3)$ forgets that the girls are distinct; using $4$ gaps forgets the two ends.',
  },
  {
    id: 'math-q-count-noconsec', topic: T, page: 'counting', kind: 'numeric', difficulty: 'hard',
    title: 'No two consecutive',
    prompt: 'How many ways are there to choose 4 numbers from $\\{1, \\dots, 12\\}$ so that no two chosen numbers are consecutive?',
    answer: 126,
    explain: 'Map sorted $s_1 < \\dots < s_4$ to $t_i = s_i - (i - 1)$: gaps of at least 2 become gaps of at least 1, and the $t_i$ are any 4-subset of $\\{1, \\dots, 12 - 4 + 1\\} = \\{1, \\dots, 9\\}$. The map is reversible, so the answer is $\\binom{n-k+1}{k} = \\binom94 = 126$.',
  },
  {
    id: 'math-q-count-lucas', topic: T, page: 'counting', kind: 'numeric', difficulty: 'hard',
    title: 'Lucas by hand',
    prompt: 'Use Lucas\' theorem to compute $\\binom{100}{51} \\bmod 7$.',
    answer: 2,
    hint: 'In base 7, $100 = 2 \\cdot 49 + 0 \\cdot 7 + 2$.',
    explain: 'Base 7: $100 = (2, 0, 2)_7$ and $51 = 1 \\cdot 49 + 0 \\cdot 7 + 2 = (1, 0, 2)_7$. Lucas: $\\binom21 \\binom00 \\binom22 = 2 \\cdot 1 \\cdot 1 = 2$. Had any digit of $k$ exceeded the matching digit of $n$ (e.g. $k = 30 = (0, 4, 2)_7$, middle digit $4 > 0$), the product would be $0$, i.e. $7 \\mid \\binom{100}{30}$.',
  },
  {
    id: 'math-q-count-which', topic: T, page: 'counting', kind: 'match', difficulty: 'medium',
    title: 'Which formula counts it?',
    prompt: 'Match each question (10 people or items) with the formula that counts it.',
    left: ['A committee of 3 from 10 people', 'Gold, silver and bronze among 10 runners', 'Seating 10 people around a round table (rotations equal)', '10 identical sweets into 3 distinct bags', 'Arrangements of the letters of MISSISSIPPI'],
    right: ['$\\binom{10}{3}$', '$P(10, 3) = 10 \\cdot 9 \\cdot 8$', '$9!$', '$\\binom{12}{2}$', '$\\frac{11!}{1!\\,4!\\,4!\\,2!}$'],
    explain: 'Committee: order does not matter, $\\binom{10}3 = 120$. Podium: swapping gold and silver gives a different result, so order matters, $P(10,3) = 720$. Round table: fix one person, arrange the rest, $(n-1)! = 9!$. Identical sweets: stars and bars, $\\binom{10+3-1}{3-1} = \\binom{12}2 = 66$. MISSISSIPPI: multinomial coefficient, $34650$.',
  },

  // ── Pascal, identities, Catalan
  {
    id: 'math-q-pascal-row', topic: T, page: 'pascal-binomial', kind: 'array', difficulty: 'easy',
    title: 'Row 7',
    prompt: 'Row 6 of Pascal\'s triangle is `1 6 15 20 15 6 1`. Write row 7: $\\binom70, \\binom71, \\dots, \\binom77$.',
    answer: [1, 7, 21, 35, 35, 21, 7, 1],
    placeholder: 'e.g. 1, 7, …',
    explain: 'Each inner entry is the sum of the two above it (Pascal\'s rule): $1+6 = 7$, $6+15 = 21$, $15+20 = 35$, then symmetric. Sanity check: the row sums to $2^7 = 128$.',
  },
  {
    id: 'math-q-pascal-identities', topic: T, page: 'pascal-binomial', kind: 'match', difficulty: 'medium',
    title: 'Name the identity',
    prompt: 'Match each identity with its name.',
    left: ['$\\binom nk = \\binom n{n-k}$', '$k\\binom nk = n\\binom{n-1}{k-1}$', '$\\sum_{i=r}^n \\binom ir = \\binom{n+1}{r+1}$', '$\\sum_i \\binom mi \\binom n{k-i} = \\binom{m+n}{k}$', '$\\sum_k \\binom nk = 2^n$'],
    right: ['Symmetry', 'Absorption', 'Hockey stick', 'Vandermonde', 'Row sum (binomial theorem with $x = y = 1$)'],
    explain: 'Symmetry: subset ↔ complement. Absorption: choose a committee and its chair, in two orders. Hockey stick: classify $(r+1)$-subsets by their largest element. Vandermonde: choose $k$ people from $m$ women and $n$ men, grouped by the number of women. Row sum: every subset counted once, by its size.',
  },
  {
    id: 'math-q-pascal-hockey', topic: T, page: 'pascal-binomial', kind: 'numeric', difficulty: 'medium',
    title: 'A sum in O(1)',
    prompt: 'Compute $\\binom33 + \\binom43 + \\binom53 + \\cdots + \\binom93$.',
    answer: 210,
    explain: 'Hockey stick with $r = 3$, $n = 9$: $\\sum_{i=3}^{9} \\binom i3 = \\binom{10}{4} = 210$. Termwise: $1 + 4 + 10 + 20 + 35 + 56 + 84 = 210$. A common slip is $\\binom{9}{4} = 126$ — the top goes up by one too ($n + 1$, $r + 1$).',
  },
  {
    id: 'math-q-pascal-hockey-name', topic: T, page: 'pascal-binomial', kind: 'text', difficulty: 'easy',
    title: 'The shape of the sum',
    prompt: 'The identity $\\sum_{i=r}^{n} \\binom ir = \\binom{n+1}{r+1}$ — a diagonal run of entries in Pascal\'s triangle summing to the entry just below and beside its end — is called the ______ identity.',
    accept: ['hockey stick', 'hockey-stick', 'hockeystick', 'hockey stick identity', 'hockey-stick identity', 'christmas stocking'],
    placeholder: 'name',
    explain: 'The **hockey stick** identity: the diagonal run is the stick, the entry $\\binom{n+1}{r+1}$ is the blade. Proof: count $(r+1)$-subsets of $\\{1, \\dots, n+1\\}$ by their largest element $i + 1$.',
  },
  {
    id: 'math-q-pascal-rolling', topic: T, page: 'pascal-binomial', kind: 'array', difficulty: 'medium',
    title: 'The wrong loop direction',
    prompt: 'A rolling row holds row 2: `row = [1, 2, 1, 0]`. To build row 3, a buggy loop runs `row[j] += row[j - 1]` for $j = 1, 2, 3$ (**left to right**). What does `row` contain afterwards?',
    answer: [1, 3, 4, 4],
    explain: '$j=1$: $2 + 1 = 3$. $j=2$: $1 + 3 = 4$ — it read the **new** `row[1]`. $j=3$: $0 + 4 = 4$. Result `[1, 3, 4, 4]` instead of `[1, 3, 3, 1]`. Updating right to left ($j = 3, 2, 1$) reads `row[j-1]` before it is overwritten, so it still holds the previous row\'s value.',
  },
  {
    id: 'math-q-pascal-bst', topic: T, page: 'pascal-binomial', kind: 'numeric', difficulty: 'medium',
    title: 'Counting BSTs',
    prompt: 'How many structurally different binary search trees store the 5 keys $1, 2, 3, 4, 5$?',
    answer: 42,
    hint: '$C_n = \\sum_{i=0}^{n-1} C_i C_{n-1-i}$ with $C_0 = 1$.',
    explain: 'Choosing root $i+1$ leaves $i$ keys on the left and $4 - i$ on the right, independently, so the count is $C_5 = C_0C_4 + C_1C_3 + C_2C_2 + C_3C_1 + C_4C_0 = 14 + 5 + 4 + 5 + 14 = 42$. Also $\\frac{1}{6}\\binom{10}{5} = 252/6 = 42$. $5! = 120$ counts insertion orders, many of which produce the same tree.',
  },
  {
    id: 'math-q-pascal-reflect', topic: T, page: 'pascal-binomial', kind: 'fill', difficulty: 'hard',
    title: 'Catalan by reflection',
    prompt: 'Reflecting a bad bracket string after its first visit to height $-1$ yields a string with $n-1$ "(" and $n+1$ ")". Complete the count (numbers only).',
    code: `
C_n  = C(2n, n) - C(2n, [[0]])
C_5  = 252 - [[1]]
     = [[2]]`,
    blanks: [['n+1', 'n + 1', '1+n', 'n-1', 'n - 1'], ['210'], ['42']],
    explain: 'Bad strings are in bijection with all strings having $n+1$ ")" among $2n$ symbols, counted by $\\binom{2n}{n+1}$ (equal to $\\binom{2n}{n-1}$ by symmetry). For $n = 5$: $\\binom{10}{5} - \\binom{10}{6} = 252 - 210 = 42 = \\frac{1}{6}\\binom{10}5$.',
  },
  {
    id: 'math-q-pascal-through', topic: T, page: 'pascal-binomial', kind: 'numeric', difficulty: 'medium',
    title: 'Paths through a point',
    prompt: 'Moving only **right** and **down**, a path makes 4 down moves and 5 right moves. How many paths pass through the point reached after exactly 2 down and 2 right moves?',
    answer: 60,
    explain: 'Product rule: (paths start → P) × (paths P → end). Start → P: 2 D and 2 R, $\\binom42 = 6$. P → end: 2 D and 3 R, $\\binom52 = 10$. Total $60$. Adding instead of multiplying ($16$) is wrong — every first half combines with every second half. All paths would be $\\binom94 = 126$.',
  },
]
