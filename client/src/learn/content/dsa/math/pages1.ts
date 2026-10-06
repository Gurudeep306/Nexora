import type { Page } from '../../../types'

/* ═══════════════════════════════ 1. Divisibility ═══════════════════════════════ */

export const divisibility: Page = {
  id: 'divisibility',
  title: 'Divisibility, the division algorithm and floor arithmetic',
  summary: 'What “a divides b” means and the rules it obeys, why every integer has one quotient and one remainder, floor and ceiling without floats, how each language’s % treats negatives, parity, digit rules and counting multiples in a range.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        Half the "math" problems in coding rounds are really divisibility in disguise. *How many numbers in [L, R] are divisible by 3 or 5?* *Can these coins split into equal piles?* *Is this 10,000-digit number a multiple of 11?* *Why does my hash function return a negative bucket?* Each one has a two-line answer — **if** you know a handful of exact facts about quotients and remainders, and know where the computer disagrees with the mathematics.

        The naive approach to all of these is to loop: check every number in [L, R], convert the huge number to an integer, call \`ceil()\` on a double. Loops are too slow when R is $10^{18}$, big numbers do not fit in 64 bits, and doubles silently round. This page replaces each with an exact, O(1) integer formula, and proves the formula.

        ## The divisibility relation

        For integers $a$ and $b$, we say **$a$ divides $b$**, written $a \\mid b$, when $b = k\\,a$ for some integer $k$. Then $a$ is a *divisor* (factor) of $b$, and $b$ is a *multiple* of $a$.

        - $3 \\mid 12$ ($12 = 4\\cdot 3$), $3 \\nmid 13$, $-3 \\mid 12$, $7 \\mid -14$.
        - **Every integer divides 0** ($0 = 0\\cdot a$). But **0 divides only 0**: $0 \\mid b$ means $b = k\\cdot 0 = 0$.
        - $1 \\mid b$ and $b \\mid b$ for every $b$.

        Notice the definition never divides — it multiplies. That is why it is exact for negative numbers and for zero, where "$b / a$ has no remainder" gets murky.

        ## Five rules, each one line to prove

        Let $a, b, c$ be integers.

        1. **Transitivity.** If $a \\mid b$ and $b \\mid c$ then $a \\mid c$. *Proof:* $b = ka$, $c = lb = (lk)a$.
        2. **Linear combinations.** If $a \\mid b$ and $a \\mid c$ then $a \\mid bx + cy$ for **all** integers $x, y$. *Proof:* $b = ka$, $c = la$, so $bx + cy = (kx + ly)a$.
        3. **Size.** If $a \\mid b$ and $b \\ne 0$ then $|a| \\le |b|$. *Proof:* $b = ka$ with $k \\ne 0$, so $|k| \\ge 1$ and $|b| = |k|\\,|a| \\ge |a|$.
        4. **Antisymmetry (up to sign).** If $a \\mid b$ and $b \\mid a$ then $a = \\pm b$. *Proof:* if either is 0 both are (rule "0 divides only 0"); otherwise rule 3 both ways gives $|a| = |b|$.
        5. **Scaling.** For $m \\ne 0$: $a \\mid b \\iff ma \\mid mb$. *Proof:* $b = ka \\iff mb = k(ma)$, cancelling $m \\ne 0$.

        **Rule 2 is the workhorse of the whole topic: whatever divides two numbers divides every integer combination of them** — in particular their sum, their difference and $b - qc$. Euclid's algorithm, Bézout's identity and every digit rule below are rule 2 applied cleverly.
      `,
    },
    {
      t: 'md',
      md: `
        ## The division algorithm

        **Theorem.** For every integer $a$ and every integer $b > 0$ there are **unique** integers $q$ (quotient) and $r$ (remainder) with

        $$a = b\\,q + r, \\qquad 0 \\le r < b.$$

        Moreover $q = \\lfloor a / b \\rfloor$.

        *Existence.* Consider the set $S = \\{\\, a - bk : k \\in \\mathbb Z,\\ a - bk \\ge 0 \\,\\}$. It is not empty: $k = -|a|$ gives $a + b|a| \\ge a + |a| \\ge 0$. A non-empty set of non-negative integers has a least element (the well-ordering principle); call it $r = a - bq$. By construction $r \\ge 0$. If $r \\ge b$, then $r - b = a - b(q + 1)$ would be a smaller element of $S$ — contradiction. So $0 \\le r < b$.

        *Uniqueness.* Suppose $bq + r = bq' + r'$ with both remainders in $[0, b)$. Then $b(q - q') = r' - r$, so $b \\mid r' - r$. But $|r' - r| < b$, and by rule 3 the only multiple of $b$ smaller than $b$ in absolute value is 0. So $r = r'$, and then $q = q'$ because $b \\ne 0$.

        *Why $q = \\lfloor a/b \\rfloor$:* dividing $a = bq + r$ by $b$ gives $a/b = q + r/b$ with $0 \\le r/b < 1$, which is exactly the definition of the floor.

        **Picture it on the number line:** the multiples of $b$ cut the integers into blocks $[bq, bq + b)$ of length $b$. Every integer $a$ lies in exactly one block — $q$ says which block, $r$ says how far into it. That picture also tells you what the "right" answer is for negative $a$: $-7$ lies in the block $[-9, -6)$, so $-7 = 3\\cdot(-3) + 2$, quotient $-3$, remainder $2$.
      `,
    },
    {
      t: 'viz',
      algo: 'math-div-floor',
      caption: 'For a = 7 nothing goes wrong. For a = −7 watch truncation land on −6, to the right of a, giving r = −1; one step left fixes it. Try your own values, including exact multiples like −9.',
    },
    {
      t: 'md',
      md: `
        ## What \`/\` and \`%\` actually do in each language

        Machines (and most languages) do not implement the theorem above. They implement **truncating division**: the quotient is $a/b$ rounded **toward zero**, and the remainder is whatever makes $a = bq + r$ true, so it takes the **sign of the dividend $a$**. Python (and Ruby) implement **floor division**: the quotient is rounded **down**, and the remainder takes the **sign of the divisor $b$**.

        | expression | C, C++, Java, JS, C#, Go, Rust | Python |
        |---|---|---|
        | \`7 / 3\`, \`7 % 3\` | 2, 1 | \`7 // 3\` = 2, \`7 % 3\` = 1 |
        | \`-7 / 3\`, \`-7 % 3\` | **−2, −1** | **−3, 2** |
        | \`7 / -3\`, \`7 % -3\` | −2, 1 | −3, −2 |
        | \`-7 / -3\`, \`-7 % -3\` | 2, −1 | 2, −1 |

        Both conventions satisfy $a = bq + r$ and $|r| < |b|$; they differ only when the signs of $a$ and $b$ differ and the division is not exact. (In C89 the rounding of negative division was implementation-defined; C99 and C++11 fixed it to truncation. JavaScript has no integer division at all: \`Math.trunc(a / b)\` matches \`%\`, \`Math.floor(a / b)\` matches Python.)

        **Rule of thumb: in every language except Python, \`a % m\` is negative when \`a\` is negative.** The standard fix, for $m > 0$, is

        $$\\text{floorMod}(a, m) = ((a \\bmod_{\\text{trunc}} m) + m) \\bmod_{\\text{trunc}} m.$$

        The inner \`%\` lands in $(-m, m)$; adding $m$ lands in $(0, 2m)$; the outer \`%\` lands in $[0, m)$. Java ships it as \`Math.floorMod\` (and \`Math.floorDiv\`).
      `,
    },
    {
      t: 'md',
      md: `
        ## Floor and ceiling with integers only

        Most problems need $\\lceil a/b \\rceil$ somewhere: *pages needed to print $a$ lines at $b$ per page*, *trips to carry $a$ boxes $b$ at a time*, *binary search on the answer with a capacity*. Writing \`ceil((double)a / b)\` is a bug waiting to happen: a double has 53 bits of mantissa, so for $a$ near $10^{18}$ the division is rounded before \`ceil\` ever sees it.

        **Identity 1 (positive $a$, $b > 0$, or any $a \\ge 0$):** $\\lceil a/b \\rceil = \\lfloor (a + b - 1)/b \\rfloor$.

        *Proof.* Write $a = bq + r$ with $0 \\le r < b$. If $r = 0$: $a + b - 1 = bq + (b - 1)$ with $0 \\le b - 1 < b$, so the floor is $q = a/b = \\lceil a/b \\rceil$. If $r \\ge 1$: $a + b - 1 = b(q + 1) + (r - 1)$ with $0 \\le r - 1 < b$, so the floor is $q + 1$, and $\\lceil a/b \\rceil = q + 1$ because $a/b = q + r/b$ is strictly between $q$ and $q + 1$. ∎

        It holds for negative $a$ too with true floor division, but **not** with C's truncating \`/\`: \`(-7 + 3 - 1) / 3 = -5 / 3 = -1\` in C, while $\\lceil -7/3 \\rceil = -2$. And $a + b - 1$ can overflow when $a$ is near the type's maximum. A version with neither problem for $a \\ge 0$: \`a / b + (a % b != 0)\`.

        **Identity 2 (any signs):** $\\lceil x \\rceil = -\\lfloor -x \\rfloor$, so $\\lceil a/b \\rceil = -\\lfloor -a/b \\rfloor$. *Proof:* negation reverses order, so the smallest integer $\\ge x$ is the negative of the largest integer $\\le -x$.

        **Identity 3 (nested floors):** for $b, c > 0$, $\\left\\lfloor \\lfloor a/b \\rfloor / c \\right\\rfloor = \\lfloor a/(bc) \\rfloor$.

        *Proof.* Let $a = bq + r$ ($0 \\le r < b$) and $q = cq' + r'$ ($0 \\le r' < c$). Then $a = bc\\,q' + (br' + r)$ and $0 \\le br' + r \\le b(c - 1) + (b - 1) = bc - 1$. By uniqueness in the division algorithm, $q' = \\lfloor a/(bc) \\rfloor$. ∎ So \`n / 2 / 5 == n / 10\` for $n \\ge 0$ — you may divide in stages.

        **Identity 4 (shifting):** $\\lfloor (a + kb)/b \\rfloor = \\lfloor a/b \\rfloor + k$ for any integer $k$. *Proof:* $a + kb = b(q + k) + r$ with the same $r$.
      `,
    },
    {
      t: 'code',
      title: 'Exact floor, ceiling and mod for any signs (b ≠ 0, m > 0)',
      code: {
        cpp: `// C++ '/' truncates toward zero; correct it when the signs differ and the division is inexact
long long floorDiv(long long a, long long b) {
    long long q = a / b;
    if (a % b != 0 && ((a < 0) != (b < 0))) q--;
    return q;
}
long long ceilDiv(long long a, long long b) {
    long long q = a / b;
    if (a % b != 0 && ((a < 0) == (b < 0))) q++;
    return q;
}
long long floorMod(long long a, long long m) {   // result in [0, m)
    return ((a % m) + m) % m;
}`,
        java: `// Java has these built in (Java 8+): Math.floorDiv, Math.floorMod; Math.ceilDiv since Java 18
static long floorDiv(long a, long b) { return Math.floorDiv(a, b); }
static long ceilDiv(long a, long b) { return -Math.floorDiv(-a, b); }   // a != Long.MIN_VALUE
static long floorMod(long a, long m) { return Math.floorMod(a, m); }     // result in [0, m)`,
        python: `# Python's // and % already floor; ceil is "floor of the negation, negated"
def floor_div(a, b): return a // b
def ceil_div(a, b): return -(-a // b)
def floor_mod(a, m): return a % m          # in [0, m) for m > 0`,
        js: `// exact while |a|, |b| < 2^53: the rounding error of a / b is smaller than its distance to the next integer
const floorDiv = (a, b) => Math.floor(a / b);
const ceilDiv = (a, b) => Math.ceil(a / b);
const floorMod = (a, m) => ((a % m) + m) % m;   // result in [0, m)
// for BigInt: a / b truncates like C; fix it as in the C version`,
        c: `/* C99 and later: '/' truncates toward zero */
long long floor_div(long long a, long long b) {
    long long q = a / b;
    if (a % b != 0 && ((a < 0) != (b < 0))) q--;
    return q;
}
long long ceil_div(long long a, long long b) {
    long long q = a / b;
    if (a % b != 0 && ((a < 0) == (b < 0))) q++;
    return q;
}
long long floor_mod(long long a, long long m) {   /* result in [0, m) */
    return ((a % m) + m) % m;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Three bugs everyone writes once',
      md: `
        - **\`if (x % 2 == 1)\` to test oddness.** For $x = -3$ in C, C++, Java or JS, \`x % 2\` is $-1$, so negative odd numbers look even. Write \`x % 2 != 0\` or \`(x & 1) != 0\`.
        - **A negative array index from a hash or a rotation.** \`arr[(i - k) % n]\` goes negative when \`i < k\`. Use \`((i - k) % n + n) % n\`.
        - **\`ceil(a / b)\` with integer \`a\`, \`b\`.** In C, C++, Java and C# the integer division happens first, so \`ceil(7 / 2)\` is \`ceil(3)\` = 3, not 4. Casting to double fixes that but loses exactness past $2^{53}$. Use \`(a + b - 1) / b\` for non-negative values.
      `,
    },
    {
      t: 'md',
      md: `
        ## Congruences: the language for remainders

        We write $a \\equiv b \\pmod m$ ("$a$ is congruent to $b$ modulo $m$") when $m \\mid a - b$ — equivalently, when $a$ and $b$ leave the same remainder on division by $m$. (If $a = mq + r$ and $b = mq' + r$ then $a - b = m(q - q')$; conversely, if $m \\mid a - b$ the uniqueness argument forces equal remainders.)

        Congruences can be added and multiplied like equations. If $a \\equiv a'$ and $b \\equiv b' \\pmod m$ then

        - $a + b \\equiv a' + b'$, because $(a + b) - (a' + b') = (a - a') + (b - b')$ is a sum of multiples of $m$;
        - $ab \\equiv a'b'$, because $ab - a'b' = a(b - b') + b'(a - a')$ is a combination of multiples of $m$ (rule 2).

        **So in any expression built from $+$, $-$ and $\\times$ you may replace any number by anything congruent to it, at any time, without changing the final remainder.** This is why programs reduce mod $10^9 + 7$ after every multiplication, and it is the whole proof of the digit rules. (Division is different — that needs the modular inverse, later in this topic.)

        ## Parity

        Parity is arithmetic modulo 2: every integer is even ($\\equiv 0$) or odd ($\\equiv 1$). The rules even + even = even, odd + odd = even, odd + even = odd, and "a product is odd only if every factor is odd" are the congruence rules above for $m = 2$. Two consequences that solve real problems:

        - **The parity of a sum equals the parity of the number of odd terms.** *Proof:* reduce every term mod 2; even terms contribute 0, odd terms 1.
        - **Parity invariants.** If every allowed move changes a quantity by an even amount, its parity never changes. *Example:* you may add or subtract any element of $[1, 2, \\dots, n]$ to reach a target $T$ from 0 by choosing a sign for each element. Flipping the sign of $k$ changes the sum by $2k$ — even — so $T$ is reachable only if $T \\equiv n(n+1)/2 \\pmod 2$. Interviewers love this: the parity check prunes the search to nothing in O(1).

        In code, \`x & 1\` reads the lowest bit, which is the parity in two's complement for negative numbers too (\`-3 & 1 == 1\`).

        ## Why the digit rules work

        A decimal number $n = d_k d_{k-1} \\dots d_1 d_0$ means $n = \\sum_i d_i \\cdot 10^i$. Reduce each power of 10 modulo $m$:

        - **$m = 3$ or $9$:** $10 \\equiv 1$, so $10^i \\equiv 1^i = 1$ and $n \\equiv \\sum d_i$. **A number and its digit sum leave the same remainder mod 3 and mod 9.**
        - **$m = 11$:** $10 \\equiv -1$, so $10^i \\equiv (-1)^i$ and $n \\equiv d_0 - d_1 + d_2 - \\dots$ — the alternating sum from the right.
        - **$m = 2, 5, 10$:** $10 \\equiv 0$, so only $d_0$ survives. **$m = 4$:** $100 \\equiv 0$, so the last two digits decide. **$m = 8$:** the last three.
        - **$m = 7$:** the remainders of $1, 10, 100, \\dots$ cycle $1, 3, 2, 6, 4, 5$, i.e. $1, 3, 2, -1, -3, -2$ — a rule exists, it is just not pretty.

        Example: $918082$: alternating sum $2 - 8 + 0 - 8 + 1 - 9 = -22 \\equiv 0 \\pmod{11}$, so $11 \\mid 918082$ (indeed $918082 = 11 \\cdot 83462$).
      `,
    },
    {
      t: 'viz',
      algo: 'math-div-digits',
      caption: 'Each digit is multiplied by 10ⁱ reduced mod m. Try m = 9 (all weights 1: the digit sum), m = 11 (alternating ±1), and m = 7 (the cycle 1, 3, 2, −1, −3, −2).',
    },
    {
      t: 'md',
      md: `
        The same loop, read left to right, is **Horner's rule**: $n \\bmod m$ for a number given as a string of a million digits, without ever building the number. Each step computes $r \\leftarrow (10r + d) \\bmod m$, which is legal by the congruence rules; $r$ stays below $m$, so \`10 * r + d\` fits easily in 64 bits for any $m < 9\\cdot 10^{17}$.
      `,
    },
    {
      t: 'code',
      title: 'n mod m for a huge decimal string (Horner’s rule)',
      code: {
        cpp: `long long modOfDecimal(const string& s, long long m) {   // m < 9e17
    long long r = 0;
    for (char c : s) r = (r * 10 + (c - '0')) % m;
    return r;
}`,
        java: `static long modOfDecimal(String s, long m) {              // m < 9e17
    long r = 0;
    for (int i = 0; i < s.length(); i++) r = (r * 10 + (s.charAt(i) - '0')) % m;
    return r;
}`,
        python: `def mod_of_decimal(s: str, m: int) -> int:
    r = 0
    for c in s:
        r = (r * 10 + int(c)) % m
    return r          # int(s) % m also works in Python, but costs O(len^2) to parse huge s`,
        js: `function modOfDecimal(s, m) {                             // m < 2^53 / 10
  let r = 0;
  for (const c of s) r = (r * 10 + (c.charCodeAt(0) - 48)) % m;
  return r;
}`,
        c: `long long mod_of_decimal(const char *s, long long m) {   /* m < 9e17 */
    long long r = 0;
    for (; *s; s++) r = (r * 10 + (*s - '0')) % m;
    return r;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Counting multiples in a range

        *How many integers in $[L, R]$ are divisible by $k$?* ($k > 0$.) The loop is $O(R - L)$; with $R = 10^{18}$ it never finishes.

        **Step 1 — from 1 to $R$ (for $R \\ge 0$).** The positive multiples of $k$ are $k, 2k, 3k, \\dots$; the $j$-th one is $\\le R$ exactly when $j \\le R/k$, i.e. $j \\le \\lfloor R/k \\rfloor$. So there are $\\lfloor R/k \\rfloor$ of them.

        **Step 2 — any range.** Let $f(n)$ count the multiples of $k$ in $(-\\infty, n]$ above some fixed far-left point; the count in $[L, R]$ is $f(R) - f(L - 1)$, and with floor division the constant cancels:

        $$\\#\\{x \\in [L, R] : k \\mid x\\} = \\left\\lfloor \\frac{R}{k} \\right\\rfloor - \\left\\lfloor \\frac{L - 1}{k} \\right\\rfloor.$$

        *Proof for any signs.* The multiples $jk$ in $[L, R]$ are exactly the integers $j$ with $L \\le jk \\le R$, i.e. $\\lceil L/k \\rceil \\le j \\le \\lfloor R/k \\rfloor$. That is $\\lfloor R/k \\rfloor - \\lceil L/k \\rceil + 1$ values. Finally $\\lceil L/k \\rceil - 1 = \\lfloor (L - 1)/k \\rfloor$ by Identity 1 (with true floor division it holds for every integer $L$). ∎

        Check: $[7, 23]$, $k = 4$: $\\lfloor 23/4 \\rfloor - \\lfloor 6/4 \\rfloor = 5 - 1 = 4$ (8, 12, 16, 20). With negatives, $[-10, 10]$, $k = 3$: $\\lfloor 10/3 \\rfloor - \\lfloor -11/3 \\rfloor = 3 - (-4) = 7$ (−9, −6, −3, 0, 3, 6, 9) — but only if $\\lfloor -11/3 \\rfloor$ is computed as $-4$. In C it is $-3$, and the count comes out 6.
      `,
    },
    {
      t: 'viz',
      algo: 'math-div-count',
      caption: 'Green: multiples up to R, counted by ⌊R/k⌋. Grey: the ones below L, counted by ⌊(L−1)/k⌋. Try L = 8, k = 4 to see why it must be L − 1 and not L.',
    },
    {
      t: 'code',
      title: 'Count multiples of k in [L, R] (any signs, k > 0)',
      code: {
        cpp: `long long countMultiples(long long L, long long R, long long k) {
    return floorDiv(R, k) - floorDiv(L - 1, k);   // floorDiv from above
}
// divisible by a OR b: add both, subtract the double-counted multiples of lcm(a, b)
long long countEither(long long L, long long R, long long a, long long b) {
    long long l = a / std::gcd(a, b) * b;
    return countMultiples(L, R, a) + countMultiples(L, R, b) - countMultiples(L, R, l);
}`,
        java: `static long countMultiples(long L, long R, long k) {
    return Math.floorDiv(R, k) - Math.floorDiv(L - 1, k);
}
static long countEither(long L, long R, long a, long b) {
    long l = a / gcd(a, b) * b;               // gcd from the next page
    return countMultiples(L, R, a) + countMultiples(L, R, b) - countMultiples(L, R, l);
}`,
        python: `from math import gcd

def count_multiples(L, R, k):
    return R // k - (L - 1) // k

def count_either(L, R, a, b):
    l = a // gcd(a, b) * b
    return count_multiples(L, R, a) + count_multiples(L, R, b) - count_multiples(L, R, l)`,
        js: `const countMultiples = (L, R, k) => Math.floor(R / k) - Math.floor((L - 1) / k);
function countEither(L, R, a, b) {
  const l = a / gcd(a, b) * b;               // gcd from the next page
  return countMultiples(L, R, a) + countMultiples(L, R, b) - countMultiples(L, R, l);
}`,
        c: `long long count_multiples(long long L, long long R, long long k) {
    return floor_div(R, k) - floor_div(L - 1, k);   /* floor_div from above */
}
long long count_either(long long L, long long R, long long a, long long b) {
    long long l = a / gcd(a, b) * b;               /* gcd from the next page */
    return count_multiples(L, R, a) + count_multiples(L, R, b) - count_multiples(L, R, l);
}`,
      },
      note: '“Divisible by a or b” is inclusion–exclusion with lcm(a, b) — both get full pages later in this topic.',
    },
    {
      t: 'complexity',
      title: 'Costs on this page',
      rows: [
        { op: 'a / b, a % b, floorDiv, ceilDiv, floorMod (machine words)', time: 'O(1)', space: 'O(1)' },
        { op: 'multiples of k in [L, R]', time: 'O(1)', space: 'O(1)', note: 'vs O(R − L) for the loop' },
        { op: 'n mod m for a d-digit string (Horner)', time: 'O(d)', space: 'O(1)', note: 'no big-integer parsing' },
        { op: 'digit-rule test for 3, 9, 11', time: 'O(d)', space: 'O(1)' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How this shows up',
      md: `
        - *"Count numbers in [L, R] divisible by k"* or *"…by a or b"* — the interviewer wants $\\lfloor R/k \\rfloor - \\lfloor (L-1)/k \\rfloor$ and inclusion–exclusion, and checks you say "L − 1".
        - *"Koko eating bananas"*, *"ship packages in D days"* — binary search on the answer where every check sums $\\lceil a_i / s \\rceil$. Say \`(a + s - 1) / s\` and mention why not doubles.
        - *"Rotate an array"*, *"circular buffer"*, *"day of the week k days ago"* — the negative-modulo trap. Volunteer the \`((x % n) + n) % n\` fix before you are asked.
        - *"Can the target be reached by choosing signs / flipping…"* — look for a parity invariant first.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-div-java-mod', 'math-q-div-python-floor', 'math-q-div-count', 'math-q-div-ceil-fill', 'math-q-div-rules', 'math-q-div-11', 'math-q-div-pow10', 'math-q-div-lang-match'] },
  ],
}

/* ═══════════════════════════════ 2. GCD and LCM ═══════════════════════════════ */

export const gcdLcm: Page = {
  id: 'gcd-lcm',
  title: 'GCD and LCM: Euclid’s algorithm and why it is logarithmic',
  summary: 'The greatest common divisor, Euclid’s algorithm with a full proof of correctness, the Lamé bound that makes it O(log min(a, b)), lcm without overflow, gcd over arrays, the identities interviews lean on, and binary GCD.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        The **greatest common divisor** $\\gcd(a, b)$ is the largest integer dividing both $a$ and $b$. It turns up whenever two periodic things interact:

        - reducing a fraction $\\tfrac{84}{126}$ to lowest terms divides both by $\\gcd = 42$: $\\tfrac{2}{3}$;
        - rotating an array of length $n$ by $k$ in place splits it into exactly $\\gcd(n, k)$ independent cycles;
        - with jugs of 6 and 9 litres you can measure exactly the multiples of $\\gcd(6, 9) = 3$;
        - two buses arriving every $a$ and $b$ minutes meet every $\\operatorname{lcm}(a, b)$ minutes.

        **Conventions.** $\\gcd(a, 0) = |a|$, because every number divides 0, so the common divisors of $a$ and $0$ are just the divisors of $a$. $\\gcd(0, 0) = 0$ by convention (every integer divides both, so there is no largest — 0 is chosen because it keeps every identity on this page true). The gcd is always taken non-negative, and $\\gcd(a, b) = \\gcd(|a|, |b|)$.

        ## The naive way

        Try every $d$ from $\\min(a, b)$ down to 1 and return the first that divides both. That is $O(\\min(a, b))$ — about $10^{18}$ steps for 64-bit inputs. Factoring both numbers is no better: factoring is slow (see the primes page). Euclid found something astonishingly better around 300 BC.

        ## The key lemma

        **Lemma.** For $b \\ne 0$: $\\gcd(a, b) = \\gcd(b,\\ a \\bmod b)$.

        *Proof.* Write $a = qb + r$ with $r = a \\bmod b$. We show the two pairs have **exactly the same set of common divisors** — then in particular the same greatest one.

        - If $d \\mid a$ and $d \\mid b$, then $d \\mid a - qb = r$ (rule 2: a combination of $a$ and $b$). So $d$ is a common divisor of $b$ and $r$.
        - If $d \\mid b$ and $d \\mid r$, then $d \\mid qb + r = a$. So $d$ is a common divisor of $a$ and $b$. ∎

        Note the proof never used $0 \\le r < b$ — **it works for any $q$**: $\\gcd(a, b) = \\gcd(b, a - qb)$ for every integer $q$. Choosing $q = \\lfloor a/b \\rfloor$ makes the second number as small as possible, which is what makes the algorithm fast.

        ## Euclid's algorithm

        Replace $(a, b)$ by $(b, a \\bmod b)$ until $b = 0$; then the answer is $a$.

        - **Correct:** the lemma says the gcd of the pair never changes (the *invariant*), and at the end $\\gcd(a, 0) = a$.
        - **Terminates:** the second component strictly decreases ($a \\bmod b < b$) and stays $\\ge 0$, so it reaches 0.

        By hand: $\\gcd(1071, 462)$: $1071 = 2\\cdot462 + 147$, $462 = 3\\cdot147 + 21$, $147 = 7\\cdot21 + 0$. Answer **21**. Three divisions instead of hundreds of trials.
      `,
    },
    {
      t: 'viz',
      algo: 'math-gcd-euclid',
      caption: 'Each row is one division a = q·b + r; the arrows show b and r sliding into the next row. Then try 89 and 55 — consecutive Fibonacci numbers, where every quotient is 1 and the meter reaches the Lamé bound exactly.',
    },
    {
      t: 'code',
      title: 'Euclid’s algorithm, iterative and recursive',
      code: {
        cpp: `#include <numeric>   // std::gcd, std::lcm (C++17) do the same, for any signs

long long gcd(long long a, long long b) {        // iterative
    a = llabs(a); b = llabs(b);
    while (b != 0) {
        long long r = a % b;
        a = b; b = r;
    }
    return a;
}

long long gcdRec(long long a, long long b) {     // recursive, a, b >= 0
    return b == 0 ? a : gcdRec(b, a % b);
}`,
        java: `static long gcd(long a, long b) {                // iterative
    a = Math.abs(a); b = Math.abs(b);
    while (b != 0) {
        long r = a % b;
        a = b; b = r;
    }
    return a;
}

static long gcdRec(long a, long b) {             // recursive, a, b >= 0
    return b == 0 ? a : gcdRec(b, a % b);
}
// java.math.BigInteger has a.gcd(b) for big numbers`,
        python: `import math                     # math.gcd(a, b) is built in (and math.lcm since 3.9)

def gcd(a, b):                  # iterative
    a, b = abs(a), abs(b)
    while b:
        a, b = b, a % b
    return a

def gcd_rec(a, b):              # recursive
    return a if b == 0 else gcd_rec(b, a % b)`,
        js: `function gcd(a, b) {                           // iterative; no built-in in JS
  a = Math.abs(a); b = Math.abs(b);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

const gcdRec = (a, b) => (b === 0 ? a : gcdRec(b, a % b));   // a, b >= 0

// BigInt version for values past 2^53
function gcdBig(a, b) { while (b) [a, b] = [b, a % b]; return a < 0n ? -a : a; }`,
        c: `long long gcd(long long a, long long b) {        /* iterative */
    if (a < 0) a = -a;
    if (b < 0) b = -b;
    while (b != 0) {
        long long r = a % b;
        a = b; b = r;
    }
    return a;
}

long long gcd_rec(long long a, long long b) {    /* recursive, a, b >= 0 */
    return b == 0 ? a : gcd_rec(b, a % b);
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Why it is fast: two proofs

        ### Proof 1 — the remainder is less than half

        **Claim.** If $a \\ge b > 0$ then $a \\bmod b < a/2$.

        *Proof.* Two cases. If $b \\le a/2$: the remainder is less than $b \\le a/2$. If $b > a/2$: then $q = 1$ (since $2b > a$), so $a \\bmod b = a - b < a - a/2 = a/2$. ∎

        After two iterations $(a, b) \\to (b, r) \\to (r, \\cdot)$, the first component went from $a$ to $r = a \\bmod b < a/2$. **So the first number at least halves every two steps**, and it cannot halve more than $\\log_2 a$ times before reaching 0: at most $2\\log_2 a + 2$ divisions.

        ### Proof 2 — Lamé's theorem: Fibonacci numbers are the worst case

        Let $F_1 = F_2 = 1$, $F_{k+2} = F_{k+1} + F_k$ (1, 1, 2, 3, 5, 8, 13, …).

        **Theorem (Lamé, 1844).** If $a > b \\ge 1$ and Euclid's algorithm performs $k \\ge 1$ divisions, then $b \\ge F_{k+1}$ and $a \\ge F_{k+2}$.

        *Proof by induction on $k$.*
        - $k = 1$: $b \\ge 1 = F_2$, and $a > b$ gives $a \\ge 2 = F_3$.
        - $k \\ge 2$: the first division gives $a = qb + r$, and the pair $(b, r)$ needs the remaining $k - 1 \\ge 1$ divisions, so $r \\ge 1$, $b > r$, and the hypothesis applies: $b \\ge F_{k+1}$, $r \\ge F_k$. Since $q \\ge 1$: $a = qb + r \\ge b + r \\ge F_{k+1} + F_k = F_{k+2}$. ∎

        Now bound Fibonacci from below. Let $\\varphi = \\frac{1 + \\sqrt 5}{2} \\approx 1.618$, which satisfies $\\varphi^2 = \\varphi + 1$. **Claim:** $F_n \\ge \\varphi^{n-2}$ for $n \\ge 1$. It holds for $n = 1$ ($1 \\ge \\varphi^{-1}$) and $n = 2$ ($1 \\ge 1$); and inductively $F_{n+1} = F_n + F_{n-1} \\ge \\varphi^{n-2} + \\varphi^{n-3} = \\varphi^{n-3}(\\varphi + 1) = \\varphi^{n-1}$.

        Combining: $b \\ge F_{k+1} \\ge \\varphi^{k-1}$, so

        $$k \\le 1 + \\log_\\varphi b \\approx 1 + 1.44\\log_2 b.$$

        Since $\\log_\\varphi 10 \\approx 4.785 < 5$, the number of divisions is **at most five times the number of decimal digits of the smaller number** — Lamé's original statement. For 64-bit inputs that is under 93 iterations, ever.

        **The bound is tight:** on $(F_{k+2}, F_{k+1})$ every quotient is 1 and the pair steps down the Fibonacci sequence one index at a time, taking exactly $k$ divisions. Fibonacci numbers are the slowest inputs for Euclid. (If $a < b$, the first division just swaps them, costing one extra step.)

        **Euclid's algorithm runs in $O(\\log \\min(a, b))$ divisions** — and the recursive version uses $O(\\log \\min(a, b))$ stack frames, which is never a problem.
      `,
    },
    {
      t: 'complexity',
      title: 'GCD and LCM',
      rows: [
        { op: 'gcd(a, b), Euclid', time: 'O(log min(a, b))', space: 'O(1) iterative, O(log) recursive', note: '≤ 5 × (decimal digits of min) divisions' },
        { op: 'lcm(a, b) = a / gcd · b', time: 'O(log min(a, b))', space: 'O(1)' },
        { op: 'gcd of n numbers (fold)', time: 'O(n + log max)', space: 'O(1)', note: 'the gcd only shrinks, at most log₂ max times' },
        { op: 'binary gcd (Stein)', time: 'O(log a + log b) iterations', space: 'O(1)', note: 'shifts and subtractions only' },
        { op: 'naive: try every d', time: 'O(min(a, b))', space: 'O(1)', note: 'hopeless for 64-bit inputs' },
      ],
    },
    {
      t: 'md',
      md: `
        ## The least common multiple

        $\\operatorname{lcm}(a, b)$ is the smallest **positive** integer that both $a$ and $b$ divide ($a, b \\ne 0$). The key identity is

        $$\\gcd(a, b)\\cdot\\operatorname{lcm}(a, b) = |a\\,b|.$$

        *Proof.* Take $a, b > 0$ and let $g = \\gcd(a, b)$, $a = g a'$, $b = g b'$. First, $\\gcd(a', b') = 1$: a common divisor $d > 1$ of $a', b'$ would make $gd$ a common divisor of $a, b$ larger than $g$. Let $L = g a' b'$. It is a common multiple ($L = a b' = a' b$). Now let $M$ be any positive common multiple. Write $M = a k = g a' k$. Since $b \\mid M$: $g b' \\mid g a' k$, so $b' \\mid a' k$. Because $\\gcd(a', b') = 1$, Euclid's lemma (proved with Bézout on the next page) gives $b' \\mid k$, so $k = b' j$ and $M = g a' b' j = L j \\ge L$. So $L$ is the least, and $g \\cdot L = g^2 a' b' = ab$. ∎

        **Overflow.** Never compute \`a * b / gcd(a, b)\`: the product can overflow even when the lcm fits ($a = b = 3\\cdot10^9$: the product is $9\\cdot10^{18}$, near the 64-bit limit, while the lcm is $3\\cdot 10^9$). Divide first: **\`a / gcd(a, b) * b\`** — the division is exact because $g \\mid a$, and the result can overflow only if the lcm itself does. When even the lcm may overflow (lcm of an array grows like a product), check before multiplying: if \`a / g > LIMIT / b\`, cap or report.
      `,
    },
    {
      t: 'code',
      title: 'lcm without overflow, and gcd / lcm of an array',
      code: {
        cpp: `long long lcm(long long a, long long b) {            // a, b > 0
    return a / gcd(a, b) * b;                           // divide first
}

long long gcdAll(const vector<long long>& v) {
    long long g = 0;                                    // gcd(0, x) = x
    for (long long x : v) {
        g = gcd(g, x);
        if (g == 1) break;                              // cannot shrink further
    }
    return g;
}

// lcm of an array, capped: returns -1 if it exceeds limit (e.g. 1e18)
long long lcmAll(const vector<long long>& v, long long limit) {
    long long l = 1;
    for (long long x : v) {
        long long step = x / gcd(l, x);
        if (l > limit / step) return -1;                // l * step would exceed limit
        l *= step;
    }
    return l;
}`,
        java: `static long lcm(long a, long b) { return a / gcd(a, b) * b; }   // a, b > 0

static long gcdAll(long[] v) {
    long g = 0;                                         // gcd(0, x) = x
    for (long x : v) {
        g = gcd(g, x);
        if (g == 1) break;
    }
    return g;
}

// lcm of an array, capped: returns -1 if it exceeds limit
static long lcmAll(long[] v, long limit) {
    long l = 1;
    for (long x : v) {
        long step = x / gcd(l, x);
        if (l > limit / step) return -1;
        l *= step;
    }
    return l;
}`,
        python: `from math import gcd
from functools import reduce

def lcm(a, b):
    return a // gcd(a, b) * b            # Python ints never overflow; this is still the habit

def gcd_all(v):
    return reduce(gcd, v, 0)             # math.gcd(*v) also works (3.9+)

def lcm_all(v):
    return reduce(lcm, v, 1)             # can grow huge: reduce mod p only if the problem asks`,
        js: `const lcm = (a, b) => a / gcd(a, b) * b;             // exact while the lcm < 2^53

function gcdAll(v) {
  let g = 0;
  for (const x of v) {
    g = gcd(g, x);
    if (g === 1) break;
  }
  return g;
}

function lcmAll(v, limit = Number.MAX_SAFE_INTEGER) {   // -1 when it would exceed limit
  let l = 1;
  for (const x of v) {
    const step = x / gcd(l, x);
    if (l > Math.floor(limit / step)) return -1;
    l *= step;
  }
  return l;
}`,
        c: `long long lcm(long long a, long long b) { return a / gcd(a, b) * b; }   /* a, b > 0 */

long long gcd_all(const long long *v, int n) {
    long long g = 0;
    for (int i = 0; i < n; i++) {
        g = gcd(g, v[i]);
        if (g == 1) break;
    }
    return g;
}

/* lcm of an array, capped: returns -1 if it exceeds limit */
long long lcm_all(const long long *v, int n, long long limit) {
    long long l = 1;
    for (int i = 0; i < n; i++) {
        long long step = v[i] / gcd(l, v[i]);
        if (l > limit / step) return -1;
        l *= step;
    }
    return l;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## GCD of many numbers

        $\\gcd(a_1, \\dots, a_n)$ — the largest number dividing all of them — can be folded left: $\\gcd(a_1, \\dots, a_n) = \\gcd(\\gcd(a_1, \\dots, a_{n-1}), a_n)$. *Proof:* $d$ divides all $n$ numbers iff $d$ divides the first $n - 1$ and $a_n$, iff (by the fact that the common divisors of a set are exactly the divisors of its gcd — Bézout, next page) $d$ divides $\\gcd(a_1..a_{n-1})$ and $a_n$.

        Cost: each step is $O(\\log)$, but better — the running gcd can only **shrink to a proper divisor** when it changes, so it at least halves each time it changes. Across the whole array it changes at most $\\log_2 a_1$ times; the other steps find $g \\mid a_i$ after a single division. Total $O(n + \\log \\max)$. And once $g = 1$ you can stop.
      `,
    },
    {
      t: 'viz',
      algo: 'math-gcd-array',
      caption: 'g falls 84 → 42 → 7 → 1 and the scan stops: nothing can change a gcd of 1. Try an array whose elements share a factor, like 12 18 30 42.',
    },
    {
      t: 'md',
      md: `
        ## Identities worth knowing

        Each follows from the lemma or from the $a = ga'$, $b = gb'$ decomposition above.

        | identity | why | used for |
        |---|---|---|
        | $\\gcd(a, b) = \\gcd(a, b - a) = \\gcd(a, b + ka)$ | the lemma with any $q$ | gcd of all pairwise differences: $\\gcd(a_2 - a_1, a_3 - a_1, \\dots)$ |
        | $\\gcd(ka, kb) = k\\gcd(a, b)$, $k > 0$ | scaling rule 5 | factoring out a common $k$ |
        | $\\gcd(a/g, b/g) = 1$ | shown above | lowest-terms fractions, the Diophantine page |
        | $\\gcd(a, b)\\cdot\\operatorname{lcm}(a, b) = ab$ | shown above | lcm without factoring |
        | $\\gcd(a, b) = 1$ and $a \\mid bc$ ⇒ $a \\mid c$ | Euclid's lemma (next page) | cancellation in congruences |
        | $\\gcd(F_m, F_n) = F_{\\gcd(m, n)}$ | Euclid runs on the indices | puzzle questions |
        | $\\gcd(2^m - 1, 2^n - 1) = 2^{\\gcd(m, n)} - 1$ | $2^m - 1 \\equiv 2^{m \\bmod n} - 1 \\pmod{2^n - 1}$ | same |

        The first row deserves an example: *"Can you make all elements equal by repeatedly adding $k$ to any element?"* — all differences must be multiples of $k$, i.e. $k \\mid \\gcd$ of the differences. *"Find the largest $m$ such that all $a_i$ have the same remainder mod $m$"* — the answer is exactly $\\gcd_i |a_i - a_1|$.
      `,
    },
    {
      t: 'md',
      md: `
        ## Binary GCD (Stein's algorithm)

        Division is the slowest arithmetic instruction (tens of cycles for 64-bit operands). Stein's algorithm (1967) uses only shifts, subtractions and comparisons, built on four facts for $a, b > 0$:

        1. $\\gcd(2a, 2b) = 2\\gcd(a, b)$ — scaling.
        2. If $b$ is odd: $\\gcd(2a, b) = \\gcd(a, b)$ — 2 is not a common divisor, so removing it from one side changes nothing. (*Proof:* any common divisor $d$ of $2a$ and $b$ is odd, because $b$ is; an odd $d$ dividing $2a$ divides $a$, since $\\gcd(d, 2) = 1$ and Euclid's lemma applies. The converse is immediate.)
        3. $\\gcd(a, b) = \\gcd(a, b - a)$ — the lemma with $q = 1$.
        4. If $a, b$ are both odd, $b - a$ is even — so rule 2 can immediately strip at least one bit.

        So: pull out the common power of two $2^k$ with $k = \\operatorname{ctz}(a \\mid b)$ (trailing zeros of the bitwise OR), make $a$ odd, then loop: make $b$ odd, order them so $a \\le b$, replace $b$ by $b - a$. When $b = 0$ the answer is $a \\cdot 2^k$.

        *Why $O(\\log a + \\log b)$ iterations:* each iteration subtracts and then (in the next round) shifts $b$ right at least once, so the total bit length of $a$ and $b$ drops by at least one per round.
      `,
    },
    {
      t: 'viz',
      algo: 'math-gcd-binary',
      caption: 'Watch the binary columns: shifts delete trailing zeros, and every subtraction of two odd numbers creates at least one new trailing zero to delete.',
    },
    {
      t: 'code',
      title: 'Binary GCD',
      note: '__builtin_ctzll is GCC/Clang; MSVC has _BitScanForward64, and C++20 has std::countr_zero.',
      code: {
        cpp: `unsigned long long binaryGcd(unsigned long long a, unsigned long long b) {
    if (a == 0 || b == 0) return a + b;
    int k = __builtin_ctzll(a | b);         // common power of two
    a >>= __builtin_ctzll(a);               // a odd from now on
    do {
        b >>= __builtin_ctzll(b);           // b odd
        if (a > b) swap(a, b);
        b -= a;                             // even (or 0)
    } while (b != 0);
    return a << k;
}`,
        java: `static long binaryGcd(long a, long b) {     // a, b >= 0
    if (a == 0 || b == 0) return a + b;
    int k = Long.numberOfTrailingZeros(a | b);
    a >>= Long.numberOfTrailingZeros(a);
    do {
        b >>= Long.numberOfTrailingZeros(b);
        if (a > b) { long t = a; a = b; b = t; }
        b -= a;
    } while (b != 0);
    return a << k;
}`,
        python: `def binary_gcd(a, b):                   # a, b >= 0
    if a == 0 or b == 0:
        return a + b
    ctz = lambda x: (x & -x).bit_length() - 1
    k = ctz(a | b)
    a >>= ctz(a)
    while b:
        b >>= ctz(b)
        if a > b:
            a, b = b, a
        b -= a
    return a << k                          # (math.gcd is faster in Python: it is C code)`,
        js: `function binaryGcd(a, b) {                 // 0 <= a, b < 2^31 (bitwise ops are 32-bit)
  if (a === 0 || b === 0) return a + b;
  const ctz = (x) => 31 - Math.clz32(x & -x);
  const k = ctz(a | b);
  a >>>= ctz(a);
  do {
    b >>>= ctz(b);
    if (a > b) [a, b] = [b, a];
    b -= a;
  } while (b !== 0);
  return a * 2 ** k;
}`,
        c: `unsigned long long binary_gcd(unsigned long long a, unsigned long long b) {
    if (a == 0 || b == 0) return a + b;
    int k = __builtin_ctzll(a | b);
    a >>= __builtin_ctzll(a);
    do {
        b >>= __builtin_ctzll(b);
        if (a > b) { unsigned long long t = a; a = b; b = t; }
        b -= a;
    } while (b != 0);
    return a << k;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'GCD bugs',
      md: `
        - **\`a * b / gcd(a, b)\`** overflows long before the lcm does. Always \`a / gcd(a, b) * b\`.
        - **Negative inputs** with a hand-written gcd: in C, C++, Java and JS \`%\` keeps the dividend's sign, so \`gcd(-4, 6)\` can return $-2$. Take absolute values first (\`std::gcd\` does it for you).
        - **Starting a gcd fold at 1** instead of 0 gives 1 for every array. The neutral element of gcd is 0; of lcm, 1.
        - **lcm of an array** grows like the product — 50 random numbers up to 100 already overflow 64 bits. Cap it, use big integers, or work with prime exponents.
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How this shows up',
      md: `
        - *"Greatest common divisor of strings"* — $s + t = t + s$ iff both are repetitions of a common block, and that block has length $\\gcd(|s|, |t|)$.
        - *"X of a kind in a deck of cards"* — partition counts into groups of equal size $X \\ge 2$: possible iff the gcd of all counts is $\\ge 2$.
        - *"Rotate array"* with $O(1)$ extra space via cycles — there are $\\gcd(n, k)$ cycles of length $n / \\gcd(n, k)$.
        - *"Fraction addition"*, *"simplify a ratio"*, *"slope as a hashable key"* (max points on a line): reduce $(dy, dx)$ by their gcd and fix the sign.
        - Follow-ups: "what is the complexity of your gcd?" — say $O(\\log \\min(a, b))$ and mention Fibonacci as the worst case. "Can it overflow?" — gcd cannot (it never exceeds its inputs); lcm can.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-gcd-trace', 'math-q-gcd-lcm', 'math-q-gcd-overflow', 'math-q-gcd-worst', 'math-q-gcd-identities', 'math-q-gcd-fold', 'math-q-gcd-binary-order', 'math-q-gcd-steps'] },
  ],
}

/* ═══════════════════════════════ 3. Extended Euclid ═══════════════════════════════ */

export const extendedEuclid: Page = {
  id: 'extended-euclid',
  title: 'Bézout’s identity, extended Euclid and linear Diophantine equations',
  summary: 'Why gcd(a, b) is always a combination ax + by, two ways to find x and y (back-substitution and the iterative table), and how to solve, enumerate and count the integer solutions of ax + by = c.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        You have a 4-litre jug and a 6-litre jug. Can you measure exactly 50 litres into a tank, pouring jugs in and out? Each full pour adds 4 or 6, each "take out" subtracts, so the question is: **are there integers $x, y$ with $4x + 6y = 50$?** And if so, which ones, and how many with $x, y \\ge 0$?

        Equations $ax + by = c$ in integers are **linear Diophantine equations**. The same equation hides inside the **modular inverse** ($ax \\equiv 1 \\pmod m$ means $ax + my = 1$), the Chinese Remainder Theorem, and every "can these step sizes reach that target" puzzle. Trying all $x$ is $O(|c|)$ at best and does not tell you *all* solutions. The tool that solves it in $O(\\log)$ is Euclid's algorithm, run so that it remembers how each remainder was built.

        ## Bézout's identity

        **Theorem (Bézout).** For integers $a, b$ not both 0, there are integers $x, y$ with

        $$a x + b y = \\gcd(a, b).$$

        Moreover, $\\gcd(a, b)$ is the **smallest positive** integer of the form $ax + by$, and the integers of that form are exactly the multiples of $\\gcd(a, b)$.

        *Proof.* Let $S = \\{\\, ax + by > 0 : x, y \\in \\mathbb Z \\,\\}$. It is non-empty (take $x = a, y = b$: $a^2 + b^2 > 0$), so it has a least element $d = a x_0 + b y_0$.

        - **$d$ divides $a$.** Divide: $a = qd + r$ with $0 \\le r < d$. Then $r = a - q(ax_0 + by_0) = a(1 - qx_0) + b(-qy_0)$ is itself of the form $ax + by$. If $r > 0$ it would be an element of $S$ smaller than $d$ — impossible. So $r = 0$ and $d \\mid a$. The same argument gives $d \\mid b$.
        - **Every common divisor $c$ of $a, b$ divides $d$**, by rule 2 ($d$ is a combination of $a$ and $b$). So $|c| \\le d$.

        Hence $d$ is the greatest common divisor. Every combination $ax + by$ is a multiple of $d$ (rule 2 again), and every multiple $kd = a(kx_0) + b(ky_0)$ is a combination. ∎

        **Two corollaries used everywhere:**

        1. **$\\gcd(a, b) = 1$ if and only if $ax + by = 1$ has a solution.** (If it does, 1 is the smallest positive combination.)
        2. **Euclid's lemma.** If $a \\mid bc$ and $\\gcd(a, b) = 1$, then $a \\mid c$. *Proof:* $ax + by = 1$; multiply by $c$: $acx + bcy = c$. Both terms are multiples of $a$ (the second because $a \\mid bc$), so $a \\mid c$. In particular, **if a prime $p$ divides $bc$, it divides $b$ or $c$** — the fact that makes prime factorisation unique.

        Bézout's proof is not constructive — "take the smallest element" does not say how to find it. Extended Euclid does.
      `,
    },
    {
      t: 'md',
      md: `
        ## Extended Euclid by back-substitution

        Run Euclid on $(99, 78)$ and write each line as "remainder = …":

        | division | remainder as a combination of the previous two |
        |---|---|
        | $99 = 1\\cdot78 + 21$ | $21 = 99 - 1\\cdot 78$ |
        | $78 = 3\\cdot21 + 15$ | $15 = 78 - 3\\cdot21$ |
        | $21 = 1\\cdot15 + 6$ | $6 = 21 - 1\\cdot15$ |
        | $15 = 2\\cdot6 + 3$ | $3 = 15 - 2\\cdot 6$ |
        | $6 = 2\\cdot3 + 0$ | gcd $= 3$ |

        Now substitute **upwards**, always eliminating the smallest number:

        $$\\begin{aligned}
        3 &= 15 - 2\\cdot6 = 15 - 2(21 - 15) = 3\\cdot15 - 2\\cdot21 \\\\
          &= 3(78 - 3\\cdot21) - 2\\cdot21 = 3\\cdot78 - 11\\cdot21 \\\\
          &= 3\\cdot78 - 11(99 - 78) = -11\\cdot99 + 14\\cdot78.
        \\end{aligned}$$

        Check: $-1089 + 1092 = 3$. ✓ So $x = -11$, $y = 14$.

        **The recursion does exactly this substitution.** Suppose the recursive call on $(b,\\ a \\bmod b)$ returned $x_1, y_1$ with

        $$b\\,x_1 + (a \\bmod b)\\,y_1 = g.$$

        Substitute $a \\bmod b = a - \\lfloor a/b \\rfloor\\, b$ and regroup by $a$ and $b$:

        $$a\\,y_1 + b\\,\\bigl(x_1 - \\lfloor a/b \\rfloor\\, y_1\\bigr) = g.$$

        So **$x = y_1$ and $y = x_1 - \\lfloor a/b \\rfloor\\, y_1$**. The base case $b = 0$ is $a\\cdot1 + 0\\cdot0 = a = g$. Correctness is induction along the recursion, which is Euclid's, so it terminates after $O(\\log \\min(a, b))$ calls.
      `,
    },
    {
      t: 'viz',
      algo: 'math-ext-recursive',
      caption: 'Calls go down the chain as plain Euclid. The base case answers (1, 0); on the way back up each call rebuilds its own (x, y) from its child’s — the back-substitution above, one line per frame.',
    },
    {
      t: 'md',
      md: `
        ## The iterative table

        Recursion is fine (the depth is logarithmic), but the iterative form is just as short and makes the invariant visible. Keep, for each remainder $r_i$ in Euclid's sequence, coefficients $s_i, t_i$ with

        $$r_i = s_i\\, a + t_i\\, b. \\qquad (\\ast)$$

        Start with $r_0 = a = 1\\cdot a + 0\\cdot b$ and $r_1 = b = 0\\cdot a + 1\\cdot b$. Euclid computes $q_i = \\lfloor r_{i-1}/r_i \\rfloor$ and $r_{i+1} = r_{i-1} - q_i r_i$. Apply **the same** update to the coefficients:

        $$s_{i+1} = s_{i-1} - q_i s_i, \\qquad t_{i+1} = t_{i-1} - q_i t_i.$$

        *Invariant proof (induction).* If $(\\ast)$ holds for $i - 1$ and $i$, then $r_{i+1} = r_{i-1} - q_i r_i = (s_{i-1} - q_i s_i)a + (t_{i-1} - q_i t_i)b = s_{i+1}a + t_{i+1}b$. ∎

        When $r_{n+1} = 0$, $r_n = \\gcd(a, b)$ and $(s_n, t_n)$ is the Bézout pair. For $(240, 46)$:

        | $i$ | $q_i$ | $r_i$ | $s_i$ | $t_i$ |
        |---|---|---|---|---|
        | 0 | | 240 | 1 | 0 |
        | 1 | 5 | 46 | 0 | 1 |
        | 2 | 4 | 10 | 1 | −5 |
        | 3 | 1 | 6 | −4 | 21 |
        | 4 | 1 | 4 | 5 | −26 |
        | 5 | 2 | 2 | −9 | 47 |
        | 6 | | 0 | 23 | −120 |

        So $\\gcd = 2 = 240\\cdot(-9) + 46\\cdot 47$. (The last row is a bonus: $23\\cdot240 - 120\\cdot46 = 0$ gives the step $(b/g, -a/g)$ between solutions — see below.)

        **How big can $x$ and $y$ get?** For $a, b \\ge 1$ the recursive version returns $|x| \\le b/g$ and $|y| \\le a/g$. *Proof by induction on the recursion:* if $a \\bmod b = 0$, the child returns $(1, 0)$, giving $x = 0$, $y = 1 \\le a/g$. Otherwise the child $(b, r)$ with $r = a \\bmod b \\ge 1$ satisfies $|x_1| \\le r/g$, $|y_1| \\le b/g$; then $|x| = |y_1| \\le b/g$ and $|y| \\le |x_1| + q|y_1| \\le (r + qb)/g = a/g$. ∎ **So extended Euclid never overflows: coefficients and intermediate products stay within the inputs' size.**
      `,
    },
    {
      t: 'viz',
      algo: 'math-ext-table',
      caption: 'Each new row is “row i−1 minus q times row i” — applied to r, s and t alike — so the last column, s·a + t·b, always equals r. Stop when r reaches 0; the row above holds the answer.',
    },
    {
      t: 'code',
      title: 'Extended Euclid: recursive and iterative',
      code: {
        cpp: `// recursive: returns g = gcd(a, b) and sets a*x + b*y = g  (a, b >= 0)
long long extGcd(long long a, long long b, long long& x, long long& y) {
    if (b == 0) { x = 1; y = 0; return a; }
    long long x1, y1;
    long long g = extGcd(b, a % b, x1, y1);
    x = y1;
    y = x1 - (a / b) * y1;
    return g;
}

// iterative: same contract
long long extGcdIter(long long a, long long b, long long& x, long long& y) {
    long long r0 = a, r1 = b, s0 = 1, s1 = 0, t0 = 0, t1 = 1;
    while (r1 != 0) {
        long long q = r0 / r1, tmp;
        tmp = r0 - q * r1; r0 = r1; r1 = tmp;
        tmp = s0 - q * s1; s0 = s1; s1 = tmp;
        tmp = t0 - q * t1; t0 = t1; t1 = tmp;
    }
    x = s0; y = t0;
    return r0;
}`,
        java: `// returns {g, x, y} with a*x + b*y = g  (a, b >= 0)
static long[] extGcd(long a, long b) {
    if (b == 0) return new long[] {a, 1, 0};
    long[] r = extGcd(b, a % b);
    return new long[] {r[0], r[2], r[1] - (a / b) * r[2]};
}

static long[] extGcdIter(long a, long b) {
    long r0 = a, r1 = b, s0 = 1, s1 = 0, t0 = 0, t1 = 1;
    while (r1 != 0) {
        long q = r0 / r1, tmp;
        tmp = r0 - q * r1; r0 = r1; r1 = tmp;
        tmp = s0 - q * s1; s0 = s1; s1 = tmp;
        tmp = t0 - q * t1; t0 = t1; t1 = tmp;
    }
    return new long[] {r0, s0, t0};
}`,
        python: `def ext_gcd(a, b):                 # returns (g, x, y) with a*x + b*y = g
    if b == 0:
        return a, 1, 0
    g, x1, y1 = ext_gcd(b, a % b)
    return g, y1, x1 - (a // b) * y1

def ext_gcd_iter(a, b):
    r0, r1, s0, s1, t0, t1 = a, b, 1, 0, 0, 1
    while r1:
        q = r0 // r1
        r0, r1 = r1, r0 - q * r1
        s0, s1 = s1, s0 - q * s1
        t0, t1 = t1, t0 - q * t1
    return r0, s0, t0`,
        js: `// returns [g, x, y] with a*x + b*y = g  (a, b >= 0, below 2^53)
function extGcd(a, b) {
  if (b === 0) return [a, 1, 0];
  const [g, x1, y1] = extGcd(b, a % b);
  return [g, y1, x1 - Math.floor(a / b) * y1];
}

function extGcdIter(a, b) {
  let r0 = a, r1 = b, s0 = 1, s1 = 0, t0 = 0, t1 = 1;
  while (r1 !== 0) {
    const q = Math.floor(r0 / r1);
    [r0, r1] = [r1, r0 - q * r1];
    [s0, s1] = [s1, s0 - q * s1];
    [t0, t1] = [t1, t0 - q * t1];
  }
  return [r0, s0, t0];
}`,
        c: `/* returns g = gcd(a, b) and sets *x, *y with a*x + b*y = g  (a, b >= 0) */
long long ext_gcd(long long a, long long b, long long *x, long long *y) {
    if (b == 0) { *x = 1; *y = 0; return a; }
    long long x1, y1;
    long long g = ext_gcd(b, a % b, &x1, &y1);
    *x = y1;
    *y = x1 - (a / b) * y1;
    return g;
}

long long ext_gcd_iter(long long a, long long b, long long *x, long long *y) {
    long long r0 = a, r1 = b, s0 = 1, s1 = 0, t0 = 0, t1 = 1, q, tmp;
    while (r1 != 0) {
        q = r0 / r1;
        tmp = r0 - q * r1; r0 = r1; r1 = tmp;
        tmp = s0 - q * s1; s0 = s1; s1 = tmp;
        tmp = t0 - q * t1; t0 = t1; t1 = tmp;
    }
    *x = s0; *y = t0;
    return r0;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Linear Diophantine equations $ax + by = c$

        Assume $a, b$ not both zero and let $g = \\gcd(a, b)$.

        **Solvability.** $ax + by = c$ has an integer solution **if and only if $g \\mid c$.** *Proof:* if it has one, $g$ divides $a$ and $b$, so it divides $ax + by = c$. Conversely, if $c = kg$, take Bézout's $ax' + by' = g$ and multiply by $k$: $x_0 = x'\\cdot\\tfrac{c}{g}$, $y_0 = y'\\cdot\\tfrac{c}{g}$. ∎

        So $4x + 6y = 50$ is solvable ($\\gcd = 2$ divides 50), while $4x + 6y = 51$ is not — the left side is always even. This is the jug answer: **measurable amounts are exactly the multiples of the gcd.**

        **All solutions.** Let $a' = a/g$, $b' = b/g$ (coprime). Given one solution $(x_0, y_0)$, every solution is

        $$x = x_0 + k\\,b', \\qquad y = y_0 - k\\,a', \\qquad k \\in \\mathbb Z.$$

        *Proof.* These are solutions: $a(x_0 + kb') + b(y_0 - ka') = c + k(ab' - ba') = c + k\\tfrac{ab - ba}{g} = c$. Conversely, if $(x, y)$ is any solution, subtracting gives $a(x - x_0) = b(y_0 - y)$; divide by $g$: $a'(x - x_0) = b'(y_0 - y)$. So $b' \\mid a'(x - x_0)$, and since $\\gcd(a', b') = 1$, Euclid's lemma gives $b' \\mid x - x_0$: write $x - x_0 = kb'$. Substituting back, $a'kb' = b'(y_0 - y)$, so $y = y_0 - ka'$. ∎

        **Geometrically, the solutions are lattice points on a line, evenly spaced by $(b', -a')$.** Using $b$ instead of $b' = b/g$ as the step is a classic bug: it skips $g - 1$ of every $g$ solutions.

        ### Worked example: $4x + 6y = 50$

        - Extended Euclid: $\\gcd(4, 6) = 2 = 4\\cdot(-1) + 6\\cdot 1$.
        - Scale by $c/g = 25$: $x_0 = -25$, $y_0 = 25$. Check: $-100 + 150 = 50$. ✓
        - Steps: $b' = 3$, $a' = 2$: $x = -25 + 3k$, $y = 25 - 2k$.
        - **Smallest non-negative $x$:** $x_0 \\bmod b'$ taken in $[0, b')$: $-25 \\bmod 3 = 2$ (floor mod). Then $y = (50 - 4\\cdot2)/6 = 7$. Solution $(2, 7)$.

        The same point comes from the family with $k = 9$: $x = -25 + 27 = 2$, $y = 25 - 18 = 7$. ✓ Always re-derive $y$ from the equation rather than trusting a remembered formula.

        ### Counting solutions in a box

        *How many solutions have $x_1 \\le x \\le x_2$ and $y_1 \\le y \\le y_2$?* Translate each bound into a bound on $k$ (for $a', b' > 0$):

        - $x_1 \\le x_0 + kb' \\le x_2 \\iff \\lceil (x_1 - x_0)/b' \\rceil \\le k \\le \\lfloor (x_2 - x_0)/b' \\rfloor$;
        - $y_1 \\le y_0 - ka' \\le y_2 \\iff \\lceil (y_0 - y_2)/a' \\rceil \\le k \\le \\lfloor (y_0 - y_1)/a' \\rfloor$.

        Intersect the two intervals; the count is $\\max(0, k_{hi} - k_{lo} + 1)$. **Use true floor and ceiling** (the divisibility page's \`floorDiv\`/\`ceilDiv\`) — the numerators are often negative. For $x, y \\ge 0$ in the example: $k \\ge \\lceil 25/3 \\rceil = 9$ and $k \\le \\lfloor 25/2 \\rfloor = 12$, so **4 solutions**: $(2, 7), (5, 5), (8, 3), (11, 1)$.
      `,
    },
    {
      t: 'viz',
      algo: 'math-ext-dioph',
      caption: 'One particular solution from extended Euclid, then the whole family x = x₀ + k·b/g, y = y₀ − k·a/g. Green rows have x, y ≥ 0. Try c = 51 (no solutions: 2 ∤ 51) and a = 3, b = 5, c = 47.',
    },
    {
      t: 'code',
      title: 'Smallest non-negative solution, and counting solutions in a box',
      note: 'For a, b > 0 and |a|, |b|, |c|, bounds ≤ 10⁹, every intermediate fits in 64 bits: the reduced x is < b/g, so a·x < lcm(a, b) ≤ 10¹⁸. JavaScript needs values below 2^53, i.e. inputs ≤ ~10⁶ here (or BigInt). floorDiv / ceilDiv are from the divisibility page; extGcd from above.',
      code: {
        cpp: `// smallest x >= 0 with a*x + b*y = c (a, b > 0); false if there is no solution
bool solveMinX(long long a, long long b, long long c, long long& x, long long& y) {
    long long xg, yg, g = extGcd(a, b, xg, yg);
    if (c % g != 0) return false;
    long long bp = b / g;
    // x = xg * (c/g) mod bp, reduced BEFORE multiplying so nothing overflows
    x = floorMod(floorMod(xg, bp) * floorMod(c / g, bp), bp);
    y = (c - a * x) / b;
    return true;
}

// number of solutions with x1 <= x <= x2 and y1 <= y <= y2
long long countInBox(long long a, long long b, long long c,
                     long long x1, long long x2, long long y1, long long y2) {
    long long x0, y0;
    if (!solveMinX(a, b, c, x0, y0)) return 0;
    long long g = gcd(a, b), ap = a / g, bp = b / g;
    long long lo = max(ceilDiv(x1 - x0, bp), ceilDiv(y0 - y2, ap));
    long long hi = min(floorDiv(x2 - x0, bp), floorDiv(y0 - y1, ap));
    return max(0LL, hi - lo + 1);
}`,
        java: `// returns {x, y} with the smallest x >= 0, or null if there is no solution (a, b > 0)
static long[] solveMinX(long a, long b, long c) {
    long[] e = extGcd(a, b);
    long g = e[0];
    if (c % g != 0) return null;
    long bp = b / g;
    long x = Math.floorMod(Math.floorMod(e[1], bp) * Math.floorMod(c / g, bp), bp);
    return new long[] {x, (c - a * x) / b};
}

static long countInBox(long a, long b, long c, long x1, long x2, long y1, long y2) {
    long[] s = solveMinX(a, b, c);
    if (s == null) return 0;
    long g = gcd(a, b), ap = a / g, bp = b / g;
    long x0 = s[0], y0 = s[1];
    long lo = Math.max(ceilDiv(x1 - x0, bp), ceilDiv(y0 - y2, ap));
    long hi = Math.min(Math.floorDiv(x2 - x0, bp), Math.floorDiv(y0 - y1, ap));
    return Math.max(0, hi - lo + 1);
}
static long ceilDiv(long t, long m) { return -Math.floorDiv(-t, m); }   // true ceiling for m > 0`,
        python: `def solve_min_x(a, b, c):              # a, b > 0; returns (x, y) with smallest x >= 0, or None
    g, xg, _ = ext_gcd(a, b)
    if c % g:
        return None
    bp = b // g
    x = xg * (c // g) % bp                 # Python's % is already a floor mod
    return x, (c - a * x) // b

def count_in_box(a, b, c, x1, x2, y1, y2):
    s = solve_min_x(a, b, c)
    if s is None:
        return 0
    x0, y0 = s
    g = gcd(a, b); ap, bp = a // g, b // g
    lo = max(-((x0 - x1) // bp), -((y2 - y0) // ap))     # ceil(t/m) == -((-t) // m)
    hi = min((x2 - x0) // bp, (y0 - y1) // ap)
    return max(0, hi - lo + 1)`,
        js: `function solveMinX(a, b, c) {           // a, b > 0; [x, y] or null
  const [g, xg] = extGcd(a, b);
  if (c % g !== 0) return null;
  const bp = b / g;
  const x = floorMod(floorMod(xg, bp) * floorMod(c / g, bp), bp);
  return [x, (c - a * x) / b];
}

function countInBox(a, b, c, x1, x2, y1, y2) {
  const s = solveMinX(a, b, c);
  if (!s) return 0;
  const [x0, y0] = s;
  const g = gcd(a, b), ap = a / g, bp = b / g;
  const lo = Math.max(Math.ceil((x1 - x0) / bp), Math.ceil((y0 - y2) / ap));
  const hi = Math.min(Math.floor((x2 - x0) / bp), Math.floor((y0 - y1) / ap));
  return Math.max(0, hi - lo + 1);
}`,
        c: `/* smallest x >= 0 with a*x + b*y = c (a, b > 0); returns 0 if there is no solution */
int solve_min_x(long long a, long long b, long long c, long long *x, long long *y) {
    long long xg, yg, g = ext_gcd(a, b, &xg, &yg);
    if (c % g != 0) return 0;
    long long bp = b / g;
    *x = floor_mod(floor_mod(xg, bp) * floor_mod(c / g, bp), bp);
    *y = (c - a * *x) / b;
    return 1;
}

long long count_in_box(long long a, long long b, long long c,
                       long long x1, long long x2, long long y1, long long y2) {
    long long x0, y0;
    if (!solve_min_x(a, b, c, &x0, &y0)) return 0;
    long long g = gcd(a, b), ap = a / g, bp = b / g;
    long long lo1 = ceil_div(x1 - x0, bp), lo2 = ceil_div(y0 - y2, ap);
    long long hi1 = floor_div(x2 - x0, bp), hi2 = floor_div(y0 - y1, ap);
    long long lo = lo1 > lo2 ? lo1 : lo2, hi = hi1 < hi2 ? hi1 : hi2;
    return hi >= lo ? hi - lo + 1 : 0;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Preview: the modular inverse

        Division modulo $m$ means multiplying by an **inverse**: a number $x$ with $a x \\equiv 1 \\pmod m$. By definition that says $m \\mid ax - 1$, i.e. $ax + my = 1$ for some integer $y$ — a Diophantine equation with $c = 1$. By Bézout's corollary:

        **$a$ has an inverse modulo $m$ if and only if $\\gcd(a, m) = 1$, and extended Euclid finds it in $O(\\log m)$**: take the $x$ it returns and reduce it into $[0, m)$.

        Example: the inverse of 3 mod 11. $\\gcd(3, 11) = 1 = 3\\cdot4 - 11\\cdot1$, so $3^{-1} \\equiv 4$ (check: $12 \\equiv 1$). Unlike the Fermat method ($a^{m-2}$), this works for any modulus, prime or not. The modular-inverse page builds on this.
      `,
    },
    {
      t: 'code',
      title: 'Modular inverse via extended Euclid',
      code: {
        cpp: `// inverse of a modulo m (m >= 2), or -1 if gcd(a, m) != 1
long long modInverse(long long a, long long m) {
    long long x, y;
    long long g = extGcd(((a % m) + m) % m, m, x, y);
    if (g != 1) return -1;
    return ((x % m) + m) % m;
}`,
        java: `static long modInverse(long a, long m) {          // -1 if none
    long[] e = extGcd(Math.floorMod(a, m), m);
    if (e[0] != 1) return -1;
    return Math.floorMod(e[1], m);
}`,
        python: `def mod_inverse(a, m):                 # None if none; Python 3.8+ also has pow(a, -1, m)
    g, x, _ = ext_gcd(a % m, m)
    return x % m if g == 1 else None`,
        js: `function modInverse(a, m) {                 // -1 if none
  const [g, x] = extGcd(((a % m) + m) % m, m);
  return g === 1 ? ((x % m) + m) % m : -1;
}`,
        c: `long long mod_inverse(long long a, long long m) {   /* -1 if none */
    long long x, y;
    long long g = ext_gcd(((a % m) + m) % m, m, &x, &y);
    if (g != 1) return -1;
    return ((x % m) + m) % m;
}`,
      },
    },
    {
      t: 'complexity',
      title: 'Extended Euclid and friends',
      rows: [
        { op: 'extended Euclid (either form)', time: 'O(log min(a, b))', space: 'O(1) iterative, O(log) recursive', note: '|x| ≤ b/g, |y| ≤ a/g' },
        { op: 'one solution of ax + by = c', time: 'O(log min(a, b))', space: 'O(1)' },
        { op: 'count solutions in a box', time: 'O(log min(a, b))', space: 'O(1)', note: 'two interval intersections, no enumeration' },
        { op: 'modular inverse', time: 'O(log m)', space: 'O(1)', note: 'exists iff gcd(a, m) = 1' },
      ],
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Where solutions go wrong',
      md: `
        - **Forgetting to scale by $c/g$**, or scaling by $c$: extended Euclid solves $ax + by = g$, not $= c$.
        - **Stepping by $b$ instead of $b/g$** and missing most solutions.
        - **Overflow in $x' \\cdot (c/g)$**: $x'$ can be near $b$ and $c/g$ near $10^{18}$. Reduce modulo $b/g$ first (as in the code), or use 128-bit arithmetic.
        - **Negative $a$ or $b$**: solve with $|a|, |b|$ and flip the sign of the matching coefficient afterwards ($a x = (-a)(-x)$).
        - **Truncating division in the range bounds**: $\\lceil (x_1 - x_0)/b' \\rceil$ with a negative numerator needs true ceiling.
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How this shows up',
      md: `
        - *"Water and jug problem"*: target $z$ is measurable iff $z \\le x + y$ and $\\gcd(x, y) \\mid z$. Saying "Bézout" and proving the "only if" direction in one sentence (every pour keeps the total a multiple of the gcd) is what the interviewer wants.
        - *"Check if it is a good array"* (can some integer combination of the elements equal 1?): yes iff the gcd of the whole array is 1 — Bézout for many numbers.
        - *"Reach a point by moves (x, y) → (x + y, y) or (x, x + y)"* and similar: the gcd is invariant under the moves.
        - Modular inverse for a **non-prime** modulus: the interviewer is checking that you know Fermat needs a prime and extended Euclid does not.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-ext-backsub', 'math-q-ext-solvable', 'math-q-ext-general', 'math-q-ext-count', 'math-q-ext-row', 'math-q-ext-fill', 'math-q-ext-inverse'] },
  ],
}

/* ═══════════════════════════════ 4. Primes ═══════════════════════════════ */

export const primes: Page = {
  id: 'primes',
  title: 'Primes: infinitely many, unique factorisation, trial division and Miller–Rabin',
  summary: 'What makes primes the atoms of the integers, why factorisation is unique, why testing divisors up to √n is enough, how to factor in O(√n), and how Miller–Rabin decides primality for 64-bit numbers in microseconds.',
  minutes: 22,
  blocks: [
    {
      t: 'md',
      md: `
        "Is 1 000 000 007 prime?" "How many divisors does 720 720 have?" "Is this fraction reducible?" Each of these questions comes down to one thing: **the prime factorisation**. Primes are the atoms of multiplication. Every divisor, every gcd, every lcm and Euler's φ can be read straight off the factorisation.

        A naive test for whether $n$ is prime tries every $d$ from 2 to $n - 1$. That is $\\Theta(n)$ divisions, which is hopeless for $n = 10^{12}$. This page shows why you can stop at $\\sqrt n$, and how to go far beyond $\\sqrt n$ when $n$ reaches $10^{18}$.

        ## Definitions

        An integer $p \\ge 2$ is **prime** if its only positive divisors are 1 and $p$. An integer $n \\ge 2$ that is not prime is **composite**: $n = ab$ with $1 < a, b < n$. **1 is neither** prime nor composite. This is a convention, and it is exactly the one that makes factorisation unique: if 1 were prime, $6 = 2\\cdot 3 = 1\\cdot2\\cdot3 = 1\\cdot1\\cdot2\\cdot3$.

        **Every $n \\ge 2$ has a prime divisor.** *Proof.* The smallest divisor $d > 1$ of $n$ exists, because $n$ itself is one. If $d$ were composite, $d = ab$ with $1 < a < d$, then $a$ would divide $n$ and be smaller than $d$, a contradiction. ∎

        ## There are infinitely many primes (Euclid)

        Suppose $p_1, \\dots, p_k$ were all the primes. Let $N = p_1 p_2 \\cdots p_k + 1$. $N \\ge 2$, so it has a prime divisor $p$, which must be some $p_i$. Then $p_i \\mid N$ and $p_i \\mid p_1\\cdots p_k$, so $p_i$ divides their difference, 1. That is impossible. ∎

        (Note that $N$ need not be prime itself: $2\\cdot3\\cdot5\\cdot7\\cdot11\\cdot13 + 1 = 30031 = 59 \\cdot 509$. The proof only needs *some* prime outside the list.)

        **How dense are they?** The Prime Number Theorem says $\\pi(n)$, the number of primes $\\le n$, is about $n / \\ln n$:

        | n | π(n) | n / ln n |
        |---|---|---|
        | $10^3$ | 168 | 145 |
        | $10^6$ | 78 498 | 72 382 |
        | $10^9$ | 50 847 534 | 48 254 942 |

        So **about one number in $\\ln n$ is prime**. Near $10^9$ that is one in 21. Two facts follow that you will use constantly. First, a random search for a prime near $n$ finds one within about $\\ln n$ tries. Second, a list of all primes up to $10^7$ has only 664 579 entries.
      `,
    },
    {
      t: 'md',
      md: `
        ## The Fundamental Theorem of Arithmetic

        **Theorem.** Every integer $n \\ge 2$ can be written as a product of primes $n = p_1^{e_1} p_2^{e_2} \\cdots p_k^{e_k}$ with $p_1 < \\dots < p_k$ and $e_i \\ge 1$, and this representation is **unique**.

        *Existence (strong induction).* If $n$ is prime, we are done. Otherwise $n = ab$ with $1 < a, b < n$. Both factor by the induction hypothesis, and concatenating the two factorisations factors $n$.

        *Uniqueness.* The key is **Euclid's lemma**, proved on the extended-Euclid page from Bézout: *if a prime $p$ divides $bc$, then $p \\mid b$ or $p \\mid c$*. By induction this extends to any product: if $p \\mid q_1 q_2 \\cdots q_m$, then $p$ divides some $q_j$.

        Now suppose $p_1 p_2 \\cdots p_r = q_1 q_2 \\cdots q_s$ are two factorisations into primes, listed with repetition. $p_1$ divides the right side, so $p_1 \\mid q_j$ for some $j$. Since $q_j$ is prime and $p_1 > 1$, $p_1 = q_j$. Cancel it from both sides and repeat. When one side runs out, the other must have run out too, because a product of primes is never 1. So the two lists are the same multiset. ∎

        **Why you care.** Once you have $n = \\prod p_i^{e_i}$:
        - $d \\mid n$ exactly when $d = \\prod p_i^{f_i}$ with $0 \\le f_i \\le e_i$, so $n$ has $\\prod (e_i + 1)$ divisors;
        - $\\gcd(a, b)$ takes the **min** exponent of each prime, $\\operatorname{lcm}$ the **max**, which proves $\\gcd\\cdot\\operatorname{lcm} = ab$ in one line;
        - $n$ is a perfect square exactly when every $e_i$ is even.

        The divisor-functions page builds on all of these.
      `,
    },
    {
      t: 'md',
      md: `
        ## Trial division: why √n is enough

        **Lemma.** If $n$ is composite, it has a divisor $d$ with $2 \\le d \\le \\sqrt n$.

        *Proof.* Write $n = ab$ with $1 < a \\le b$. If $a > \\sqrt n$, then $b \\ge a > \\sqrt n$ and $ab > n$, a contradiction. So $a \\le \\sqrt n$. ∎

        Divisors come in pairs $(d, n/d)$ that mirror around $\\sqrt n$. **If no $d \\le \\sqrt n$ divides $n$, nothing above $\\sqrt n$ can either, so $n$ is prime.** That turns $\\Theta(n)$ into $O(\\sqrt n)$: $10^6$ divisions for $n = 10^{12}$.

        Write the loop condition as **\`d * d <= n\`**, not \`d <= sqrt(n)\`. Floating-point \`sqrt\` can round $\\sqrt{p^2}$ down to $p - 0.0000001$ and skip the one divisor that matters. And \`d * d\` stays exact in 64-bit while $d \\le 3\\cdot10^9$.

        Watch it on $n = 221$: 2, 3, … 12 fail, then 13 divides ($221 = 13 \\cdot 17$). For $n = 97$ the loop stops after $d = 9$, because $10\\cdot10 > 97$.
      `,
    },
    { t: 'viz', algo: 'math-prime-trial', caption: 'Watch the loop stop as soon as d·d passes n. The divisors above √n are never tried, because each would pair with one below √n that was already tried.' },
    {
      t: 'md',
      md: `
        **The 6k ± 1 speed-up.** Every prime $p > 3$ is $6k \\pm 1$, because $6k, 6k\\pm2$ are even and $6k+3$ is divisible by 3. So after testing 2 and 3 you only need to try $d = 5, 7, 11, 13, 17, 19, \\dots$, stepping $+2, +4$. That cuts the divisions by a factor of 3 without changing the $O(\\sqrt n)$ bound.
      `,
    },
    {
      t: 'code',
      title: 'Primality by trial division (6k ± 1), O(√n)',
      code: {
        cpp: `bool isPrime(long long n) {
    if (n < 2) return false;
    if (n < 4) return true;                  // 2 and 3
    if (n % 2 == 0 || n % 3 == 0) return false;
    for (long long d = 5; d * d <= n; d += 6)   // d = 6k − 1, d + 2 = 6k + 1
        if (n % d == 0 || n % (d + 2) == 0) return false;
    return true;
}`,
        java: `static boolean isPrime(long n) {
    if (n < 2) return false;
    if (n < 4) return true;                  // 2 and 3
    if (n % 2 == 0 || n % 3 == 0) return false;
    for (long d = 5; d * d <= n; d += 6)     // d = 6k − 1, d + 2 = 6k + 1
        if (n % d == 0 || n % (d + 2) == 0) return false;
    return true;
}`,
        python: `def is_prime(n: int) -> bool:
    if n < 2:
        return False
    if n < 4:
        return True                          # 2 and 3
    if n % 2 == 0 or n % 3 == 0:
        return False
    d = 5
    while d * d <= n:                        # d = 6k − 1, d + 2 = 6k + 1
        if n % d == 0 or n % (d + 2) == 0:
            return False
        d += 6
    return True`,
        js: `function isPrime(n) {                     // exact for n < 2^53
  if (n < 2) return false;
  if (n < 4) return true;                  // 2 and 3
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let d = 5; d * d <= n; d += 6)      // d = 6k − 1, d + 2 = 6k + 1
    if (n % d === 0 || n % (d + 2) === 0) return false;
  return true;
}`,
        c: `#include <stdbool.h>
bool is_prime(long long n) {
    if (n < 2) return false;
    if (n < 4) return true;                  /* 2 and 3 */
    if (n % 2 == 0 || n % 3 == 0) return false;
    for (long long d = 5; d * d <= n; d += 6)   /* d = 6k − 1, d + 2 = 6k + 1 */
        if (n % d == 0 || n % (d + 2) == 0) return false;
    return true;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Factorisation by trial division

        Run the same loop, but when $d$ divides $n$, **divide it out completely** before moving on, and keep going on the smaller $n$.

        Two invariants make this correct:
        1. **Every $d$ that divides is prime.** When we reach $d$, every smaller prime has already been divided out. A composite $d$ has a prime factor smaller than $d$, which no longer divides the current $n$, so $d$ cannot divide $n$ either.
        2. **What is left at the end is 1 or a prime.** The loop stops when $d^2 > n$, with no divisor $\\le d - 1$ left in $n$. By the √n lemma, the remaining $n > 1$ has no divisor up to $\\sqrt n$, so it is prime. That last prime is the one people forget to print.

        Example: $360$. $d = 2$ divides three times, leaving 45. $d = 3$ divides twice, leaving 5. At $d = 3$ the check $3 \\cdot 3 > 5$ ends the loop, and $5 > 1$ is recorded. Result: $2^3\\cdot3^2\\cdot5$.

        **Cost.** At most $O(\\sqrt n)$ iterations, plus at most $\\log_2 n$ successful divisions, since each one at least halves $n$. Because $n$ shrinks, the loop often ends far earlier. $2^{40}$ finishes after a single $d$.
      `,
    },
    { t: 'viz', algo: 'math-prime-factor', caption: 'Each time d divides, n shrinks, and so does the √n bound the loop is racing against. The prime left at the end is the last factor.' },
    {
      t: 'code',
      title: 'Prime factorisation, O(√n): returns (prime, exponent) pairs',
      code: {
        cpp: `vector<pair<long long, int>> factorize(long long n) {
    vector<pair<long long, int>> f;
    for (long long d = 2; d * d <= n; d++) {
        if (n % d) continue;
        int e = 0;
        while (n % d == 0) { n /= d; e++; }   // divide d out completely
        f.push_back({d, e});
    }
    if (n > 1) f.push_back({n, 1});           // the prime left over
    return f;
}`,
        java: `static List<long[]> factorize(long n) {
    List<long[]> f = new ArrayList<>();
    for (long d = 2; d * d <= n; d++) {
        if (n % d != 0) continue;
        int e = 0;
        while (n % d == 0) { n /= d; e++; }   // divide d out completely
        f.add(new long[]{d, e});
    }
    if (n > 1) f.add(new long[]{n, 1});       // the prime left over
    return f;
}`,
        python: `def factorize(n: int) -> list[tuple[int, int]]:
    f = []
    d = 2
    while d * d <= n:
        if n % d == 0:
            e = 0
            while n % d == 0:                 # divide d out completely
                n //= d
                e += 1
            f.append((d, e))
        d += 1
    if n > 1:
        f.append((n, 1))                      # the prime left over
    return f`,
        js: `function factorize(n) {                   // exact for n < 2^53
  const f = [];
  for (let d = 2; d * d <= n; d++) {
    if (n % d !== 0) continue;
    let e = 0;
    while (n % d === 0) { n /= d; e++; }   // divide d out completely
    f.push([d, e]);
  }
  if (n > 1) f.push([n, 1]);               // the prime left over
  return f;
}`,
        c: `/* fills p[] and e[]; returns the number of distinct primes (at most 15 for n < 2^63) */
int factorize(long long n, long long p[], int e[]) {
    int k = 0;
    for (long long d = 2; d * d <= n; d++) {
        if (n % d) continue;
        p[k] = d; e[k] = 0;
        while (n % d == 0) { n /= d; e[k]++; }   /* divide d out completely */
        k++;
    }
    if (n > 1) { p[k] = n; e[k] = 1; k++; }      /* the prime left over */
    return k;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'One query or many?',
      md: `
        Trial division costs $O(\\sqrt n)$ **per number**. For $10^5$ numbers up to $10^7$, that is $10^5 \\cdot 3162 \\approx 3\\cdot10^8$ operations: too slow. **Many numbers that are all small: sieve the smallest prime factor once, then each factorisation is $O(\\log n)$** (see the sieve page). **One or a few numbers that are large: trial division to $10^{12}$, Miller–Rabin and Pollard rho beyond.**
      `,
    },
    {
      t: 'md',
      md: `
        ## Beyond √n: Miller–Rabin

        For $n$ near $10^{18}$, $\\sqrt n = 10^9$ divisions is about a second **per number**. Primality can be decided much faster with a *test* that never finds a factor.

        **Fermat's little theorem** (proved on the modular-arithmetic page) says that for a prime $p$ and $p \\nmid a$, $a^{p-1} \\equiv 1 \\pmod p$. The contrapositive is useful: **if $a^{n-1} \\not\\equiv 1 \\pmod n$ for some $a$, then $n$ is composite.** The catch is that some composites, the Carmichael numbers such as $561 = 3\\cdot11\\cdot17$, pass this for every $a$ coprime to them.

        **The extra ingredient: square roots of 1.** Modulo a prime $p$, $x^2 \\equiv 1$ means $p \\mid (x-1)(x+1)$, so $x \\equiv \\pm1$ by Euclid's lemma. A prime has no other square roots of 1. Composites usually do: $67^2 = 4489 = 8\\cdot561 + 1$, so $67^2 \\equiv 1 \\pmod{561}$.

        **The test.** Write $n - 1 = d \\cdot 2^s$ with $d$ odd, and look at the chain

        $$a^d,\\ a^{2d},\\ a^{4d},\\ \\dots,\\ a^{2^s d} = a^{n-1} \\pmod n,$$

        where each term is the square of the previous one. If $n$ is prime, the last term is 1 (Fermat). Walking back from the end, each term is a square root of the next, so the first 1 in the chain is either the very first term or is preceded by $n - 1$. So for a prime, **either $a^d \\equiv 1$, or some $a^{2^r d} \\equiv -1$ with $0 \\le r < s$**. A base $a$ for which neither happens is a **witness** that $n$ is composite.

        For a composite $n$, at least $3/4$ of the bases are witnesses (Rabin's theorem). Better still, for 64-bit inputs specific small base sets are proven to catch every composite. **Testing the bases $\\{2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37\\}$ is deterministic for all $n < 3.3\\cdot10^{24}$**, which covers all of 64-bit.

        **Cost.** Each base costs $O(\\log n)$ modular multiplications. That is about $12 \\cdot 64$ multiplications in total, a few microseconds. The only trap is that $a\\cdot b \\bmod n$ overflows 64 bits for $n > 3\\cdot10^9$. Use \`__int128\` in C/C++, \`Math.multiplyHigh\` or \`BigInteger\` in Java, \`BigInt\` in JavaScript, and plain ints in Python.
      `,
    },
    { t: 'viz', algo: 'math-prime-mr', caption: 'The default 1 373 653 = 829 · 1657 is a strong liar for bases 2 and 3: both chains pass. Base 5 is a witness, and the composite is caught. Try 561 too: the small-prime check catches it at 3 straight away.' },
    {
      t: 'code',
      title: 'Deterministic Miller–Rabin for 64-bit n',
      code: {
        cpp: `using u64 = unsigned long long;
using u128 = unsigned __int128;
u64 mulmod(u64 a, u64 b, u64 m) { return (u128)a * b % m; }
u64 powmod(u64 a, u64 e, u64 m) {
    u64 r = 1; a %= m;
    for (; e; e >>= 1, a = mulmod(a, a, m)) if (e & 1) r = mulmod(r, a, m);
    return r;
}
bool isPrime(u64 n) {
    if (n < 2) return false;
    for (u64 p : {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37})
        if (n % p == 0) return n == p;
    u64 d = n - 1; int s = 0;
    while (d % 2 == 0) { d /= 2; s++; }          // n − 1 = d · 2^s
    for (u64 a : {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37}) {
        u64 x = powmod(a, d, n);
        if (x == 1 || x == n - 1) continue;
        bool passed = false;
        for (int r = 1; r < s && !passed; r++) {
            x = mulmod(x, x, n);
            passed = (x == n - 1);
        }
        if (!passed) return false;               // a is a witness
    }
    return true;
}`,
        java: `static long mulmod(long a, long b, long m) {    // 0 <= a, b < m < 2^63
    return java.math.BigInteger.valueOf(a).multiply(java.math.BigInteger.valueOf(b))
           .mod(java.math.BigInteger.valueOf(m)).longValue();
}
static long powmod(long a, long e, long m) {
    long r = 1; a %= m;
    for (; e > 0; e >>= 1, a = mulmod(a, a, m)) if ((e & 1) == 1) r = mulmod(r, a, m);
    return r;
}
static final long[] BASES = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37};
static boolean isPrime(long n) {
    if (n < 2) return false;
    for (long p : BASES) if (n % p == 0) return n == p;
    long d = n - 1; int s = 0;
    while (d % 2 == 0) { d /= 2; s++; }          // n − 1 = d · 2^s
    outer:
    for (long a : BASES) {
        long x = powmod(a, d, n);
        if (x == 1 || x == n - 1) continue;
        for (int r = 1; r < s; r++) {
            x = mulmod(x, x, n);
            if (x == n - 1) continue outer;
        }
        return false;                            // a is a witness
    }
    return true;
}`,
        python: `def is_prime(n: int) -> bool:
    if n < 2:
        return False
    bases = (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37)
    for p in bases:
        if n % p == 0:
            return n == p
    d, s = n - 1, 0
    while d % 2 == 0:                            # n − 1 = d · 2^s
        d //= 2
        s += 1
    for a in bases:
        x = pow(a, d, n)                         # Python ints never overflow
        if x == 1 or x == n - 1:
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False                         # a is a witness
    return True`,
        js: `function powmod(a, e, m) {                  // BigInt arguments
  let r = 1n; a %= m;
  for (; e > 0n; e >>= 1n, a = a * a % m) if (e & 1n) r = r * a % m;
  return r;
}
function isPrime(n) {                           // n: BigInt
  if (n < 2n) return false;
  const bases = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  for (const p of bases) if (n % p === 0n) return n === p;
  let d = n - 1n, s = 0;
  while (d % 2n === 0n) { d /= 2n; s++; }        // n − 1 = d · 2^s
  next: for (const a of bases) {
    let x = powmod(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let r = 1; r < s; r++) {
      x = x * x % n;
      if (x === n - 1n) continue next;
    }
    return false;                                // a is a witness
  }
  return true;
}`,
        c: `#include <stdbool.h>
typedef unsigned long long u64;
typedef unsigned __int128 u128;                  /* GCC / Clang */
static u64 mulmod(u64 a, u64 b, u64 m) { return (u128)a * b % m; }
static u64 powmod(u64 a, u64 e, u64 m) {
    u64 r = 1; a %= m;
    for (; e; e >>= 1, a = mulmod(a, a, m)) if (e & 1) r = mulmod(r, a, m);
    return r;
}
bool is_prime(u64 n) {
    static const u64 B[12] = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37};
    if (n < 2) return false;
    for (int i = 0; i < 12; i++) if (n % B[i] == 0) return n == B[i];
    u64 d = n - 1; int s = 0;
    while (d % 2 == 0) { d /= 2; s++; }          /* n − 1 = d · 2^s */
    for (int i = 0; i < 12; i++) {
        u64 x = powmod(B[i], d, n);
        if (x == 1 || x == n - 1) continue;
        bool passed = false;
        for (int r = 1; r < s && !passed; r++) {
            x = mulmod(x, x, n);
            passed = (x == n - 1);
        }
        if (!passed) return false;               /* B[i] is a witness */
    }
    return true;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'note',
      title: 'Factoring big numbers: Pollard rho',
      md: `
        Miller–Rabin says *whether* $n$ is prime, not what its factors are. To factor a 64-bit composite, **Pollard's rho** iterates $x \\mapsto x^2 + c \\bmod n$ and watches $\\gcd(|x - y|, n)$ with Floyd's cycle detection, a trick you will meet again with linked lists. A factor $p$ shows up after about $\\sqrt p \\le n^{1/4}$ steps, roughly $3\\cdot10^4$ for $n = 10^{18}$. Recurse on both parts, using Miller–Rabin to stop at primes. It is contest material, rarely asked in interviews, but it is good to know it exists.
      `,
    },
    {
      t: 'complexity',
      title: 'Primality and factorisation',
      rows: [
        { op: 'trial-division primality', time: 'O(√n)', space: 'O(1)', note: '10⁶ steps at n = 10¹²' },
        { op: 'trial-division factorisation', time: 'O(√n)', space: 'O(log n) factors', note: 'often far less: n shrinks as factors come out' },
        { op: 'Miller–Rabin, 12 fixed bases', time: 'O(12 · log n) mulmods', space: 'O(1)', note: 'deterministic for every 64-bit n' },
        { op: 'Pollard rho (expected)', time: 'O(n^(1/4) · log n)', space: 'O(1)', note: 'with Miller–Rabin to stop at primes' },
        { op: 'factor many n ≤ N', time: 'O(N log log N) once + O(log n) each', space: 'O(N)', note: 'smallest-prime-factor sieve' },
      ],
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Bugs that fail hidden tests',
      md: `
        - **Calling 1 prime**, or 0, or negatives. Handle $n < 2$ first.
        - **\`d <= sqrt(n)\` in floating point**: it skips $d = p$ when $n = p^2$ and \`sqrt\` rounds down. Use \`d * d <= n\`.
        - **Forgetting the leftover prime** after the factorisation loop, so that $2\\cdot 10^9 + 14 = 2 \\cdot 1000000007$ comes out as just "2".
        - **\`int\` loop variables**: \`d * d\` overflows 32 bits once $d > 46340$, which happens for any $n > 2^{31}$.
        - **Overflowing \`a * a % n\`** in Miller–Rabin for $n > 3\\cdot10^9$, which silently gives wrong answers. Use 128-bit or BigInt.
        - **Fermat-only tests**: Carmichael numbers (561, 1105, 1729, …) pass them.
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How this shows up',
      md: `
        - *"Check if a number is prime"*: they expect $O(\\sqrt n)$ with \`d * d <= n\` and the pairing argument for why √n suffices. Mention 6k ± 1 as a constant-factor improvement.
        - *"Count primes below n"* (LeetCode 204): that is the sieve, not repeated trial division. Know both and when each wins.
        - *"Ugly numbers"*, *"Largest prime factor"*, *"Smallest number with given prime factors"*: factorisation and its invariants.
        - Follow-up *"what if n is up to 10¹⁸?"*: name Miller–Rabin with deterministic bases and the mulmod overflow problem. That answer separates strong candidates from the rest.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['math-q-prime-one', 'math-q-prime-sqrt', 'math-q-prime-euclid', 'math-q-prime-unique', 'math-q-prime-leftover', 'math-q-prime-count', 'math-q-prime-carmichael', 'math-q-prime-many'] },
  ],
}
