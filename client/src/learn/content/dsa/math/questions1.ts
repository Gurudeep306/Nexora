import type { Question } from '../../../questions/types'

const T = 'math'

export const questions1: Question[] = [
  // ── Divisibility, the division algorithm and floor arithmetic
  {
    id: 'math-q-div-java-mod', topic: T, page: 'divisibility', kind: 'mcq', difficulty: 'easy',
    title: 'Java’s % on a negative dividend',
    prompt: 'In Java, what does `-17 % 5` evaluate to?',
    options: ['3', '-2', '2', '-3'],
    answer: 1,
    hint: 'Java truncates the quotient toward zero, and the remainder takes the sign of the dividend.',
    explain: 'Java truncates: $-17 / 5 = -3.4$ rounds toward zero to $-3$, and the remainder is whatever makes $a = bq + r$ true: $-17 - 5\\cdot(-3) = -2$. The mathematical remainder $3$ (from $-17 = 5\\cdot(-4) + 3$) is what `Math.floorMod(-17, 5)` or Python’s `-17 % 5` gives, not `%` in Java. $2$ and $-3$ satisfy neither convention: $5\\cdot q + 2 = -17$ and $5q - 3 = -17$ have no integer $q$.',
  },
  {
    id: 'math-q-div-python-floor', topic: T, page: 'divisibility', kind: 'array', difficulty: 'medium',
    title: 'Python floors',
    prompt: 'In Python, evaluate these four expressions, in order:\n\n`-17 // 5`, `-17 % 5`, `17 // -5`, `17 % -5`',
    answer: [-4, 3, -4, -3],
    placeholder: 'e.g. 1, 2, 3, 4',
    hint: 'Python rounds the quotient **down**, and the remainder takes the sign of the divisor.',
    explain: '$-17/5 = -3.4$ floors to $-4$, and $-17 - 5\\cdot(-4) = 3$. $17/(-5) = -3.4$ also floors to $-4$, and $17 - (-5)(-4) = -3$: the remainder takes the sign of the **divisor** $-5$. A C, C++ or Java programmer would expect $-3, -2, -3, 2$ (truncation toward zero, remainder with the sign of the dividend). Both conventions satisfy $a = bq + r$ with $|r| < |b|$; they only disagree when the signs differ and the division is inexact, as here.',
  },
  {
    id: 'math-q-div-count', topic: T, page: 'divisibility', kind: 'numeric', difficulty: 'medium',
    title: 'Multiples of 7 in a range',
    prompt: 'How many integers $x$ with $-50 \\le x \\le 100$ are divisible by $7$?',
    answer: 22,
    hint: 'Use $\\lfloor R/k \\rfloor - \\lfloor (L-1)/k \\rfloor$ with **true** floor division.',
    explain: '$\\lfloor 100/7 \\rfloor - \\lfloor -51/7 \\rfloor = 14 - (-8) = 22$: the multiples are $-49, -42, \\dots, -7, 0, 7, \\dots, 98$ (7 negative, zero, and 14 positive). Two traps: using $L$ instead of $L - 1$ drops $-49$ when $L$ is itself a multiple (not here, but always write $L - 1$), and computing $-51 / 7$ with C/Java truncating division gives $-7$ instead of $-8$, so the count comes out $21$.',
  },
  {
    id: 'math-q-div-ceil-fill', topic: T, page: 'divisibility', kind: 'fill', difficulty: 'easy',
    title: 'Ceiling without doubles',
    prompt: 'Complete both integer-only versions of $\\lceil a/b \\rceil$ for $a \\ge 0$, $b > 0$ (C-style `/` and `%`).',
    lang: 'cpp',
    code: `
long long ceilA(long long a, long long b) { return (a + [[0]]) / b; }
long long ceilB(long long a, long long b) { return a / b + (a % b [[1]] 0); }`,
    blanks: [['b - 1', 'b-1', '-1 + b'], ['!=', '>']],
    explain: 'Identity 1: $\\lceil a/b \\rceil = \\lfloor (a + b - 1)/b \\rfloor$. If $b \\mid a$ the extra $b - 1$ is not enough to reach the next multiple; otherwise it always is. Adding $b$ instead would be wrong for exact multiples ($\\lceil 6/3 \\rceil = 2$, but $9/3 = 3$). The second form adds 1 exactly when the division is inexact and also avoids the overflow of $a + b - 1$ near the type maximum. Never write `ceil((double)a / b)`: past $2^{53}$ the double is already rounded.',
  },
  {
    id: 'math-q-div-rules', topic: T, page: 'divisibility', kind: 'multi', difficulty: 'medium',
    title: 'Which divisibility facts hold?',
    prompt: 'For integers $a, b, c$, select every statement that is **always** true.',
    options: [
      'If $a \\mid b$ and $a \\mid c$, then $a \\mid 3b - 5c$.',
      'If $a \\mid bc$, then $a \\mid b$ or $a \\mid c$.',
      '$0 \\mid 0$.',
      'If $a \\mid b$ and $b \\mid a$, then $a = b$.',
      'If $a \\mid b$ and $b \\ne 0$, then $|a| \\le |b|$.',
      'If $a \\mid b + c$, then $a \\mid b$.',
    ],
    answers: [0, 2, 4],
    explain: 'True: the linear-combination rule (rule 2) gives $a \\mid bx + cy$ for any $x, y$, here $x = 3$, $y = -5$. $0 \\mid 0$ because $0 = k\\cdot 0$ (0 divides only 0, but it does divide 0). The size rule: $b = ka$ with $k \\ne 0$ forces $|b| \\ge |a|$.\n\nFalse: $4 \\mid 2\\cdot 6$ but $4 \\nmid 2$ and $4 \\nmid 6$ (that property holds only for primes, via Euclid’s lemma). Antisymmetry is only up to sign: $3 \\mid -3$ and $-3 \\mid 3$. And $3 \\mid 1 + 2$ while $3 \\nmid 1$.',
  },
  {
    id: 'math-q-div-11', topic: T, page: 'divisibility', kind: 'numeric', difficulty: 'medium',
    title: 'Remainder mod 11 from the digits',
    prompt: 'What is $8\\,274\\,916 \\bmod 11$? (Use the alternating digit sum.)',
    answer: 1,
    hint: 'Since $10 \\equiv -1 \\pmod{11}$, weight the digits $+1, -1, +1, \\dots$ starting from the **rightmost**.',
    explain: 'From the right: $6 - 1 + 9 - 4 + 7 - 2 + 8 = 23$, and $23 = 2\\cdot 11 + 1$, so the remainder is $1$. This works because $10^i \\equiv (-1)^i \\pmod{11}$ and congruences may be substituted into sums and products. Starting the alternation from the **left** is a common slip: with 7 digits it happens to give the same sign pattern here, but for an even number of digits it flips the sign of the result. The plain digit sum ($37$) is the rule for 3 and 9, not 11.',
  },
  {
    id: 'math-q-div-pow10', topic: T, page: 'divisibility', kind: 'array', difficulty: 'medium',
    title: 'Powers of 10 modulo 7',
    prompt: 'List $10^i \\bmod 7$ for $i = 0, 1, 2, 3, 4, 5$ (each in $[0, 7)$).',
    answer: [1, 3, 2, 6, 4, 5],
    placeholder: 'six numbers',
    hint: 'Each term is $10 \\times$ the previous one, reduced mod 7: you never need the big power itself.',
    explain: 'Start at $1$, then multiply by $10 \\equiv 3$ each time: $1, 3, 9 \\equiv 2, 6, 18 \\equiv 4, 12 \\equiv 5$, and the next would be $15 \\equiv 1$, so the cycle has length 6. These are the digit weights for a divisibility-by-7 rule (equivalently $1, 3, 2, -1, -3, -2$). Contrast with $m = 9$ (all weights 1, the digit sum) and $m = 11$ (alternating $\\pm 1$): 7 has a rule too, it is just not pretty.',
  },
  {
    id: 'math-q-div-lang-match', topic: T, page: 'divisibility', kind: 'match', difficulty: 'medium',
    title: 'Same numbers, different languages',
    prompt: 'Match each expression with its value.',
    left: ['C++ `-7 / 2`', 'C++ `-7 % 2`', 'Python `-7 // 2`', 'Python `-7 % 2`', 'Python `7 % -3`', 'Java `Math.floorDiv(-9, 2)`'],
    right: ['-3', '-1', '-4', '1', '-2', '-5'],
    explain: 'C++ truncates toward zero: $-3.5 \\to -3$, remainder $-7 - 2\\cdot(-3) = -1$ (sign of the dividend; this is why `x % 2 == 1` misses negative odd numbers). Python floors: $-3.5 \\to -4$, remainder $-7 - 2\\cdot(-4) = 1$. `7 % -3` in Python takes the sign of the divisor: $7 = (-3)(-3) + (-2)$. `Math.floorDiv` is Java’s floor division: $-4.5 \\to -5$, not the $-4$ that `/` would give.',
  },

  // ── GCD and LCM
  {
    id: 'math-q-gcd-trace', topic: T, page: 'gcd-lcm', kind: 'array', difficulty: 'easy',
    title: 'Trace Euclid',
    prompt: 'Run Euclid’s algorithm on $(252, 198)$. List the remainders $a \\bmod b$ in the order they are computed, including the final $0$.',
    answer: [54, 36, 18, 0],
    placeholder: 'e.g. 9, 3, 0',
    explain: '$252 = 1\\cdot 198 + 54$, $198 = 3\\cdot 54 + 36$, $54 = 1\\cdot 36 + 18$, $36 = 2\\cdot 18 + 0$. The last non-zero remainder, $18$, is the gcd. Each step replaces $(a, b)$ by $(b, a \\bmod b)$, which keeps the set of common divisors unchanged (the lemma), so the gcd never changes along the way.',
  },
  {
    id: 'math-q-gcd-lcm', topic: T, page: 'gcd-lcm', kind: 'numeric', difficulty: 'easy',
    title: 'Recover b from gcd and lcm',
    prompt: 'Positive integers $a$ and $b$ have $\\gcd(a, b) = 6$ and $\\operatorname{lcm}(a, b) = 210$. If $a = 42$, what is $b$?',
    answer: 30,
    hint: '$\\gcd(a, b)\\cdot \\operatorname{lcm}(a, b) = ab$.',
    explain: '$ab = 6 \\cdot 210 = 1260$, so $b = 1260 / 42 = 30$. Check: $\\gcd(42, 30) = 6$ and $42/6 \\cdot 30 = 210$. ✓ The identity follows from writing $a = 6a\'$, $b = 6b\'$ with $\\gcd(a\', b\') = 1$: then $\\operatorname{lcm} = 6a\'b\'$. Answering $210/42 = 5$ forgets that the gcd and lcm share the common factor.',
  },
  {
    id: 'math-q-gcd-overflow', topic: T, page: 'gcd-lcm', kind: 'mcq', difficulty: 'medium',
    title: 'lcm in 64 bits',
    prompt: 'With `long long a = 4000000000, b = 6000000000;` (lcm $= 1.2\\cdot 10^{10}$), which expression returns the correct lcm?',
    options: [
      '`a * b / gcd(a, b)`',
      '`a / gcd(a, b) * b`',
      '`(a / gcd(a, b)) * (b / gcd(a, b))`',
      '`a * b / (gcd(a, b) * gcd(a, b))`',
    ],
    answer: 1,
    explain: '`a / gcd(a, b) * b` divides first ($4\\cdot10^9 / 2\\cdot 10^9 = 2$, exact because $g \\mid a$) and then multiplies: $2 \\cdot 6\\cdot10^9 = 1.2\\cdot10^{10}$, which overflows only if the lcm itself does. `a * b` is $2.4\\cdot10^{19}$, past $2^{63} \\approx 9.22\\cdot 10^{18}$, so options 1 and 4 overflow before dividing. Option 3 does not overflow but computes $a\'b\' = 6$, the lcm divided by the gcd.',
  },
  {
    id: 'math-q-gcd-worst', topic: T, page: 'gcd-lcm', kind: 'text', difficulty: 'easy',
    title: 'Euclid’s worst inputs',
    prompt: 'Among all pairs of a given size, Euclid’s algorithm takes the most divisions on consecutive members of which famous sequence? (One word.)',
    accept: ['Fibonacci', 'Fibonacci numbers', 'consecutive Fibonacci numbers', 'Fibonacci sequence', 'fib'],
    explain: 'Fibonacci. On $(F_{k+2}, F_{k+1})$ every quotient is 1 and the pair steps down the sequence one index at a time, taking exactly $k$ divisions. Lamé’s theorem shows nothing smaller can take that many: $k$ divisions force $b \\ge F_{k+1} \\ge \\varphi^{k-1}$, so $k \\le 1 + \\log_\\varphi b$, i.e. at most about 5 divisions per decimal digit. Powers of 2 or primes are not the worst case: $(64, 32)$ finishes in one division.',
  },
  {
    id: 'math-q-gcd-identities', topic: T, page: 'gcd-lcm', kind: 'multi', difficulty: 'hard',
    title: 'Which gcd identities hold?',
    prompt: 'For positive integers $a, b, c, k$, select every identity that is **always** true.',
    options: [
      '$\\gcd(a, b) = \\gcd(a, b + ka)$',
      '$\\gcd(ka, kb) = k\\gcd(a, b)$',
      '$\\gcd(a, bc) = \\gcd(a, b)\\cdot \\gcd(a, c)$',
      '$\\operatorname{lcm}(a, b) = ab$',
      '$\\gcd(2^6 - 1, 2^4 - 1) = 2^2 - 1$',
      '$\\gcd\\!\\left(\\tfrac{a}{\\gcd(a,b)}, \\tfrac{b}{\\gcd(a,b)}\\right) = 1$',
    ],
    answers: [0, 1, 4, 5],
    explain: 'True: adding a multiple of one argument to the other is the Euclid lemma with any $q$. Scaling multiplies every common divisor by $k$. $\\gcd(2^m - 1, 2^n - 1) = 2^{\\gcd(m,n)} - 1$ gives $\\gcd(63, 15) = 3$. Dividing out the gcd leaves coprime parts (a common divisor $d > 1$ would make $gd$ a bigger common divisor).\n\nFalse: $\\gcd(2, 2\\cdot 2) = 2$, not $\\gcd(2,2)\\gcd(2,2) = 4$ (it only holds when $b, c$ are coprime). $\\operatorname{lcm}(a, b) = ab$ only when $\\gcd(a, b) = 1$; in general $\\gcd\\cdot\\operatorname{lcm} = ab$.',
  },
  {
    id: 'math-q-gcd-fold', topic: T, page: 'gcd-lcm', kind: 'fill', difficulty: 'easy',
    title: 'Neutral elements of the folds',
    prompt: 'Fill in the starting values and the early-exit value.',
    lang: 'cpp',
    code: `
long long gcdAll(const vector<long long>& v) {
    long long g = [[0]];
    for (long long x : v) {
        g = gcd(g, x);
        if (g == [[1]]) break;      // nothing can shrink it further
    }
    return g;
}
long long lcmAll(const vector<long long>& v) {
    long long l = [[2]];
    for (long long x : v) l = l / gcd(l, x) * x;
    return l;
}`,
    blanks: [['0'], ['1'], ['1']],
    explain: 'The neutral element of gcd is $0$, because $\\gcd(0, x) = x$ (every number divides 0). Starting at $1$ is the classic bug: $\\gcd(1, x) = 1$, so every array would report 1. Once $g = 1$ no further element can lower it, so you can stop. For lcm the neutral element is $1$ ($\\operatorname{lcm}(1, x) = x$); starting at 0 would make every lcm 0.',
  },
  {
    id: 'math-q-gcd-binary-order', topic: T, page: 'gcd-lcm', kind: 'order', difficulty: 'medium',
    title: 'Binary GCD, step by step',
    prompt: 'Put the steps of Stein’s binary GCD (for $a, b \\ge 0$) in the order the code performs them.',
    items: [
      'If $a = 0$ or $b = 0$, return $a + b$',
      '$k \\leftarrow \\operatorname{ctz}(a \\mid b)$, the common power of two',
      'Shift $a$ right until it is odd',
      'Loop: shift $b$ right until it is odd',
      'Loop: swap so that $a \\le b$',
      'Loop: $b \\leftarrow b - a$ (repeat while $b \\ne 0$)',
      'Return $a \\cdot 2^k$ (`a << k`)',
    ],
    explain: 'The common factor $2^k$ is pulled out first, from $a \\mid b$ (the OR), because $\\gcd(2a, 2b) = 2\\gcd(a, b)$; it is put back at the very end. After that, removing 2s from just one side is safe whenever the other side is odd ($\\gcd(2a, b) = \\gcd(a, b)$ for odd $b$). Inside the loop both numbers are odd, so $b - a$ is even and the next shift deletes at least one bit. Subtracting before ordering could make $b$ negative.',
  },
  {
    id: 'math-q-gcd-steps', topic: T, page: 'gcd-lcm', kind: 'numeric', difficulty: 'medium',
    title: 'Divisions on Fibonacci inputs',
    prompt: 'How many divisions (`a % b` evaluations with $b \\ne 0$) does Euclid’s algorithm perform on $(144, 89)$?',
    answer: 10,
    hint: '$144 = F_{12}$ and $89 = F_{11}$; on $(F_{k+2}, F_{k+1})$ the algorithm takes exactly $k$ divisions.',
    explain: 'Every quotient is 1 until the end: $(144, 89) \\to (89, 55) \\to (55, 34) \\to \\dots \\to (3, 2) \\to (2, 1) \\to (1, 0)$. That is $k = 12 - 2 = 10$ divisions, matching Lamé’s bound with equality. Counting 11 or 12 usually comes from counting the final $(1, 0)$ state or from treating $F_{12}$ as $k$ itself.',
  },

  // ── Extended Euclid
  {
    id: 'math-q-ext-backsub', topic: T, page: 'extended-euclid', kind: 'array', difficulty: 'medium',
    title: 'Back-substitute',
    prompt: 'Euclid on $(87, 33)$: $87 = 2\\cdot33 + 21$, $33 = 1\\cdot21 + 12$, $21 = 1\\cdot12 + 9$, $12 = 1\\cdot9 + 3$, $9 = 3\\cdot3 + 0$.\n\nBack-substitution (equivalently, the recursive `extGcd(87, 33)`) produces $87x + 33y = 3$. Enter $x, y$.',
    answer: [-3, 8],
    placeholder: 'x, y',
    explain: 'Substitute upwards, always eliminating the smallest number: $3 = 12 - 9 = 12 - (21 - 12) = 2\\cdot12 - 21 = 2(33 - 21) - 21 = 2\\cdot33 - 3\\cdot21 = 2\\cdot33 - 3(87 - 2\\cdot33) = -3\\cdot87 + 8\\cdot33$. Check: $-261 + 264 = 3$. ✓ Other pairs such as $(8, -21)$ also satisfy the equation (add $(b/g, -a/g) = (11, -29)$), but back-substitution gives the small one with $|x| \\le b/g$, $|y| \\le a/g$.',
  },
  {
    id: 'math-q-ext-solvable', topic: T, page: 'extended-euclid', kind: 'multi', difficulty: 'easy',
    title: 'Which equations have integer solutions?',
    prompt: 'Select every equation that has a solution in integers $x, y$.',
    options: ['$6x + 9y = 21$', '$6x + 9y = 20$', '$12x + 18y = 6$', '$14x + 21y = 10$', '$7x + 11y = 1$', '$15x + 25y = -35$'],
    answers: [0, 2, 4, 5],
    explain: '$ax + by = c$ is solvable iff $\\gcd(a, b) \\mid c$. $\\gcd(6, 9) = 3$ divides 21 but not 20. $\\gcd(12, 18) = 6 \\mid 6$. $\\gcd(14, 21) = 7 \\nmid 10$. $\\gcd(7, 11) = 1$ divides everything. $\\gcd(15, 25) = 5 \\mid -35$ (negative targets are fine). The "only if" is one line: the gcd divides $a$ and $b$, hence every $ax + by$.',
  },
  {
    id: 'math-q-ext-general', topic: T, page: 'extended-euclid', kind: 'mcq', difficulty: 'medium',
    title: 'All solutions',
    prompt: '$(x, y) = (4, 1)$ solves $6x + 15y = 39$. Which formula gives **every** integer solution ($k \\in \\mathbb Z$)?',
    options: [
      '$x = 4 + 15k,\\ y = 1 - 6k$',
      '$x = 4 + 5k,\\ y = 1 - 2k$',
      '$x = 4 + 5k,\\ y = 1 + 2k$',
      '$x = 4 + 3k,\\ y = 1 - 3k$',
    ],
    answer: 1,
    explain: 'With $g = \\gcd(6, 15) = 3$, the step is $(b/g, -a/g) = (5, -2)$: $6(4 + 5k) + 15(1 - 2k) = 39 + 30k - 30k$. ✓ Option 1 steps by $(b, -a)$: every point it gives is a solution, but it skips $g - 1 = 2$ of every 3 (e.g. $(9, -1)$). Option 3 has the wrong sign: $x$ and $y$ must move in opposite directions when $a, b > 0$. Option 4 is not even a solution for $k = 1$: $42 - 30 = 12$.',
  },
  {
    id: 'math-q-ext-count', topic: T, page: 'extended-euclid', kind: 'numeric', difficulty: 'hard',
    title: 'Non-negative solutions',
    prompt: 'How many pairs of **non-negative** integers $(x, y)$ satisfy $7x + 4y = 100$?',
    answer: 4,
    hint: 'Find one solution, write the family $x = x_0 + 4k$, $y = y_0 - 7k$, then turn $x \\ge 0$ and $y \\ge 0$ into bounds on $k$.',
    explain: '$\\gcd(7, 4) = 1$. One solution is $(0, 25)$, so $x = 4k$, $y = 25 - 7k$. $x \\ge 0 \\iff k \\ge 0$; $y \\ge 0 \\iff k \\le \\lfloor 25/7 \\rfloor = 3$. So $k \\in \\{0, 1, 2, 3\\}$: $(0, 25), (4, 18), (8, 11), (12, 4)$. Stepping $x$ by 1 instead of $b/g = 4$ would invent non-solutions; forgetting $k = 0$ (an endpoint) gives 3.',
  },
  {
    id: 'math-q-ext-row', topic: T, page: 'extended-euclid', kind: 'array', difficulty: 'medium',
    title: 'Next row of the table',
    prompt: 'The iterative extended-Euclid table for $(a, b) = (161, 28)$ so far:\n\n| $i$ | $r_i$ | $s_i$ | $t_i$ |\n|---|---|---|---|\n| 1 | 28 | 0 | 1 |\n| 2 | 21 | 1 | −5 |\n\nEnter row 3 as $r_3, s_3, t_3$.',
    answer: [7, -1, 6],
    placeholder: 'r, s, t',
    explain: '$q_2 = \\lfloor 28/21 \\rfloor = 1$, and the same update applies to all three columns: $r_3 = 28 - 1\\cdot21 = 7$, $s_3 = 0 - 1\\cdot1 = -1$, $t_3 = 1 - 1\\cdot(-5) = 6$. Check the invariant $r = sa + tb$: $-161 + 168 = 7$. ✓ The next row has $r_4 = 0$, so $\\gcd = 7 = 161\\cdot(-1) + 28\\cdot 6$. A common slip is subtracting row $i$ from row $i - 1$ in $r$ but adding in $s$, $t$; the invariant check catches it immediately.',
  },
  {
    id: 'math-q-ext-fill', topic: T, page: 'extended-euclid', kind: 'fill', difficulty: 'medium',
    title: 'Recursive extended Euclid',
    prompt: 'Complete the recursive extended Euclid so that `a*x + b*y == g` on return ($a, b \\ge 0$).',
    lang: 'cpp',
    code: `
long long extGcd(long long a, long long b, long long& x, long long& y) {
    if (b == 0) { x = [[0]]; y = [[1]]; return a; }
    long long x1, y1;
    long long g = extGcd(b, a % b, x1, y1);
    x = [[2]];
    y = [[3]];
    return g;
}`,
    blanks: [['1'], ['0'], ['y1'], ['x1 - (a / b) * y1', 'x1 - a / b * y1', 'x1 - (a/b)*y1', '-(a / b) * y1 + x1']],
    explain: 'Base case: $a\\cdot1 + 0\\cdot0 = a = \\gcd(a, 0)$. The child guarantees $b x_1 + (a \\bmod b) y_1 = g$; substituting $a \\bmod b = a - \\lfloor a/b \\rfloor b$ and regrouping gives $a y_1 + b(x_1 - \\lfloor a/b \\rfloor y_1) = g$. So $x$ takes the child’s **$y_1$** (not $x_1$: the roles shift because the child’s first argument is $b$), and $y = x_1 - \\lfloor a/b \\rfloor y_1$.',
  },
  {
    id: 'math-q-ext-inverse', topic: T, page: 'extended-euclid', kind: 'numeric', difficulty: 'medium',
    title: 'Inverse modulo a composite',
    prompt: 'Find the inverse of $17$ modulo $60$: the $x \\in [0, 60)$ with $17x \\equiv 1 \\pmod{60}$.',
    answer: 53,
    hint: 'Solve $17x + 60y = 1$ with extended Euclid, then reduce $x$ into $[0, 60)$.',
    explain: 'Euclid: $60 = 3\\cdot17 + 9$, $17 = 1\\cdot9 + 8$, $9 = 1\\cdot8 + 1$. Back-substituting: $1 = 9 - 8 = 2\\cdot9 - 17 = 2(60 - 3\\cdot17) - 17 = 2\\cdot60 - 7\\cdot17$, so $x = -7 \\equiv 53$. Check: $17\\cdot53 = 901 = 15\\cdot60 + 1$. ✓ Fermat’s $a^{m-2}$ does not apply because 60 is not prime; extended Euclid only needs $\\gcd(17, 60) = 1$. Forgetting to reduce gives $-7$, which is right mod 60 but not in $[0, 60)$.',
  },

  // ── Primes
  {
    id: 'math-q-prime-one', topic: T, page: 'primes', kind: 'mcq', difficulty: 'easy',
    title: 'Why 1 is not prime',
    prompt: 'Why is $1$ defined to be neither prime nor composite?',
    options: [
      'Because 1 has no divisors at all',
      'So that prime factorisation is unique: otherwise $6 = 2\\cdot3 = 1\\cdot2\\cdot3 = \\dots$',
      'Because primes must be odd',
      'Because $\\sqrt 1 = 1$, so trial division would never run',
    ],
    answer: 1,
    explain: 'It is a convention, chosen so the Fundamental Theorem of Arithmetic holds: if 1 were prime you could insert any number of 1s into a factorisation. 1 does have a divisor (itself), so option 1 is false; 2 is an even prime; and the trial-division loop is a programming detail, not the reason for a definition. In code, this means handling $n < 2$ before anything else.',
  },
  {
    id: 'math-q-prime-sqrt', topic: T, page: 'primes', kind: 'numeric', difficulty: 'medium',
    title: 'How far does trial division go?',
    prompt: 'The plain loop `for (d = 2; d * d <= n; d++) if (n % d == 0) return false;` runs on $n = 1009$, which is prime. How many values of `d` does it test?',
    answer: 30,
    hint: 'Find the largest $d$ with $d^2 \\le 1009$.',
    explain: '$31^2 = 961 \\le 1009 < 1024 = 32^2$, so $d$ runs over $2, 3, \\dots, 31$: $30$ values, and none divides 1009. Testing up to $\\sqrt n$ suffices because a composite $n = ab$ with $a \\le b$ has $a \\le \\sqrt n$. Going to $n - 1$ would be 1007 tests; stopping at $d = 31$ but counting from 1 gives 31.',
  },
  {
    id: 'math-q-prime-euclid', topic: T, page: 'primes', kind: 'mcq', difficulty: 'medium',
    title: 'Euclid’s N',
    prompt: '$N = 2\\cdot3\\cdot5\\cdot7\\cdot11\\cdot13 + 1 = 30031$. Which statement is correct?',
    options: [
      '$N$ is prime, as Euclid’s proof guarantees',
      '$N$ is composite, so this disproves Euclid’s argument',
      '$N$ is composite ($59 \\cdot 509$), but every prime factor of $N$ is missing from the list $2, \\dots, 13$',
      '$N$ is divisible by 13 because 13 is the last prime used',
    ],
    answer: 2,
    explain: '$30031 = 59\\cdot509$. The proof never claims $N$ is prime: it only needs **some** prime factor of $N$, and no listed $p_i$ can be one, because $p_i \\mid N$ and $p_i \\mid p_1\\cdots p_k$ would give $p_i \\mid 1$. That is why options 1, 2 and 4 are wrong: $N$ leaves remainder 1 on division by every listed prime, including 13.',
  },
  {
    id: 'math-q-prime-unique', topic: T, page: 'primes', kind: 'mcq', difficulty: 'medium',
    title: 'The heart of uniqueness',
    prompt: 'In the proof that prime factorisation is unique, which fact lets us match $p_1$ with some $q_j$ in $p_1 p_2 \\cdots p_r = q_1 q_2 \\cdots q_s$?',
    options: [
      'Every $n \\ge 2$ has a prime divisor',
      'Euclid’s lemma: if a prime divides a product, it divides one of the factors',
      'There are infinitely many primes',
      'A composite $n$ has a divisor $\\le \\sqrt n$',
    ],
    answer: 1,
    explain: '$p_1$ divides the right-hand product, so by Euclid’s lemma (from Bézout) it divides some $q_j$; since $q_j$ is prime, $p_1 = q_j$, and we cancel and repeat. "Every $n \\ge 2$ has a prime divisor" proves **existence**, not uniqueness. The other two are true but irrelevant here. Euclid’s lemma genuinely needs primality: $4 \\mid 2\\cdot 6$ but $4$ divides neither factor.',
  },
  {
    id: 'math-q-prime-leftover', topic: T, page: 'primes', kind: 'array', difficulty: 'medium',
    title: 'Don’t forget the leftover',
    prompt: 'Run the page’s `factorize` on $n = 35\\,999\\,388 = 2^2 \\cdot 3^2 \\cdot 999\\,983$. List the **primes** it appends, in order (ignore the exponents).',
    answer: [2, 3, 999983],
    placeholder: 'primes in order',
    explain: '$d = 2$ divides twice ($n \\to 8\\,999\\,847$), $d = 3$ twice ($n \\to 999\\,983$). The loop keeps going while $d^2 \\le 999\\,983$, i.e. up to $d = 999$, and nothing divides. The loop ends with $n = 999\\,983 > 1$, which must be prime (no divisor up to its square root), so the `if (n > 1)` line appends it. Forgetting that line outputs only $[2, 3]$, the classic hidden-test failure.',
  },
  {
    id: 'math-q-prime-count', topic: T, page: 'primes', kind: 'numeric', difficulty: 'medium',
    title: 'Counting divisors',
    prompt: '$720\\,720 = 2^4 \\cdot 3^2 \\cdot 5 \\cdot 7 \\cdot 11 \\cdot 13$. How many positive divisors does it have?',
    answer: 240,
    hint: 'A divisor picks an exponent $0 \\le f_i \\le e_i$ for each prime independently.',
    explain: 'By unique factorisation, $d \\mid n$ exactly when $d = \\prod p_i^{f_i}$ with $0 \\le f_i \\le e_i$, so the count is $\\prod (e_i + 1) = 5\\cdot3\\cdot2\\cdot2\\cdot2\\cdot2 = 240$. Multiplying the exponents ($4\\cdot2 = 8$) or adding them up forgets the choice $f_i = 0$; the $+1$ is that choice.',
  },
  {
    id: 'math-q-prime-carmichael', topic: T, page: 'primes', kind: 'mcq', difficulty: 'hard',
    title: 'Catching a Carmichael number',
    prompt: '$561 = 3\\cdot11\\cdot17$ satisfies $a^{560} \\equiv 1 \\pmod{561}$ for every $a$ coprime to 561. What does Miller–Rabin check that the plain Fermat test does not?',
    options: [
      'That $a^{n-1} \\equiv 1 \\pmod n$ for more bases',
      'That 1 has no square roots modulo $n$ other than $\\pm 1$ along the chain $a^d, a^{2d}, \\dots, a^{n-1}$',
      'That $n$ has no divisor up to $\\sqrt n$',
      'That $n \\equiv \\pm 1 \\pmod 6$',
    ],
    answer: 1,
    explain: 'Modulo a prime, $x^2 \\equiv 1$ forces $x \\equiv \\pm 1$ (Euclid’s lemma on $(x - 1)(x + 1)$). Composites usually have other square roots of 1, e.g. $67^2 \\equiv 1 \\pmod{561}$. Writing $n - 1 = d\\cdot 2^s$ ($560 = 35\\cdot 2^4$), Miller–Rabin requires $a^d \\equiv 1$ or some $a^{2^r d} \\equiv -1$; a non-trivial root of 1 in the chain exposes $n$. More Fermat bases cannot help: Carmichael numbers pass them all. Trial division to $\\sqrt n$ would work but is the slow method being replaced, and $6k \\pm 1$ is only a necessary condition.',
  },
  {
    id: 'math-q-prime-many', topic: T, page: 'primes', kind: 'match', difficulty: 'medium',
    title: 'Pick the method',
    prompt: 'Match each task with the method the page recommends.',
    left: [
      'Is one $n \\le 10^{12}$ prime?',
      'Is one $n \\le 10^{18}$ prime?',
      'Factor $10^5$ numbers, each $\\le 10^7$',
      'Factor one 64-bit composite',
    ],
    right: [
      'Trial division with `d * d <= n` ($\\sim 10^6$ steps)',
      'Miller–Rabin with 12 fixed bases and 128-bit mulmod',
      'Smallest-prime-factor sieve, then $O(\\log n)$ per number',
      'Pollard rho, with Miller–Rabin to stop at primes',
    ],
    explain: 'Trial division is $O(\\sqrt n)$: fine at $10^{12}$, but $10^9$ steps per number at $10^{18}$, where deterministic Miller–Rabin answers in microseconds. For many small numbers, $10^5 \\cdot \\sqrt{10^7} \\approx 3\\cdot10^8$ trial divisions is too slow; one sieve pass amortises the work. Miller–Rabin never finds factors, so factoring a big composite needs Pollard rho (about $n^{1/4}$ steps).',
  },
]
