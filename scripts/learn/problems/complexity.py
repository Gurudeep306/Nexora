"""Complexity & Big-O — judged problems."""
import random
from lib import *  # noqa: F401,F403


# ─────────────────────────── Complexity ───────────────────────────
MOD = 10**9 + 7
BIG = 10**5


def lines_of(s):
    return s.strip().split('\n')


def sol_sum_n(s):
    L = lines_of(s)
    return '\n'.join(str((n % MOD) * ((n + 1) % MOD) * pow(2, MOD - 2, MOD) % MOD) for n in map(int, L[1:1 + int(L[0])]))


def gen_queries(vals):
    return f"{len(vals)}\n" + '\n'.join(map(str, vals)) + '\n'


add('cx-c-sum-n', 'Sum 1 to n, modulo', 'complexity', 'why-measure', 900, ['math', 'complexity'],
    '<p>For each query n, print 1 + 2 + … + n modulo 10<sup>9</sup> + 7.</p><p>n can be as large as 10<sup>18</sup>, so a loop is out of the question — use the formula n(n + 1)/2. Careful: n(n + 1) overflows 64 bits, and you cannot simply divide by 2 after taking a remainder (reduce first, or divide the even factor by 2 before multiplying).</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: n (1 ≤ n ≤ 10<sup>18</sup>).</p>', '<p>T lines, each the sum modulo 10<sup>9</sup> + 7.</p>', sol_sum_n,
    [gen_queries([3, 10, 1000000000000000000])], [gen_queries([1]), gen_queries([2, MOD - 1, MOD, MOD + 1, 2 * MOD])],
    lambda: gen_queries([random.randint(1, 10**18) for _ in range(random.randint(1, 1000))]), n_rand=4)


def sol_distinct(s):
    v = ints(s)
    return str(len(set(v[1:1 + v[0]])))


add('cx-c-distinct', 'Count distinct values', 'complexity', 'loops', 1000, ['sorting', 'complexity'],
    '<p>Print how many <b>different</b> values the array contains.</p><p>Comparing every pair is O(n²) — too slow for n = 2·10<sup>5</sup>. Sort first (equal values become neighbours), or use a hash set.</p>',
    N_SPEC + '<p>|a<sub>i</sub>| ≤ 10<sup>9</sup>.</p>', '<p>One integer.</p>', sol_distinct,
    [arr_input([3, 1, 3, 2, 1]), arr_input([7, 7, 7])],
    [arr_input([5]), arr_input([1, 2, 3, 4, 5]), arr_input([-1, 1, -1, 1])],
    lambda: arr_input([random.randint(-50, 50) if random.random() < 0.5 else random.randint(-10**9, 10**9) for _ in range(random.randint(1, SIZE))]),
    n_rand=5, large=lambda: arr_input([random.randint(1, 60000) for _ in range(BIG)]))


def sol_pairs(s):
    L = lines_of(s)
    n, t = ints(L[0])
    a = ints(L[1])
    from collections import Counter
    c = Counter()
    total = 0
    for x in a:
        total += c[t - x]
        c[x] += 1
    return str(total)


def gen_pairs(n=None, lo=-50, hi=50):
    n = n or random.randint(1, SIZE)
    a = [random.randint(lo, hi) for _ in range(n)]
    t = random.randint(2 * lo, 2 * hi)
    return f"{n} {t}\n{fmt(a)}\n"


add('cx-c-pairs', 'Count pairs with sum T', 'complexity', 'loops', 1300, ['two pointers', 'hashing', 'complexity'],
    '<p>Count the pairs of positions i &lt; j with a<sub>i</sub> + a<sub>j</sub> = T.</p><p>With n up to 2·10<sup>5</sup> there are 2·10<sup>10</sup> pairs — you cannot look at them all. Sort and use two pointers (counting runs of equal values), or count complements with a hash map. The answer can exceed 32 bits.</p>',
    '<p>First line n and T (1 ≤ n ≤ 2·10<sup>5</sup>, |T| ≤ 2·10<sup>9</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>).</p>', '<p>One integer: the number of pairs.</p>', sol_pairs,
    ["5 6\n1 5 3 3 5\n", "4 2\n1 1 1 1\n"],
    ["1 4\n2\n", "2 4\n2 2\n", "3 0\n-1 1 0\n", "3 100\n1 2 3\n"],
    gen_pairs, n_rand=6, large=lambda: gen_pairs(BIG, 1, 20))


def sol_halv(s):
    L = lines_of(s)
    return '\n'.join(str(int(n).bit_length() - 1) for n in L[1:1 + int(L[0])])


add('cx-c-halvings', 'How many halvings?', 'complexity', 'logarithms', 800, ['math', 'logarithms'],
    '<p>Starting from n, repeat <code>n = ⌊n / 2⌋</code> until n = 1. How many steps does it take? Answer T queries.</p><p>This is ⌊log<sub>2</sub> n⌋ — the loop itself is only about 60 steps even for 10<sup>18</sup>. (Floating-point log2 can be off by one for large n; integer halving or bit length is exact.)</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: n (1 ≤ n ≤ 10<sup>18</sup>).</p>', '<p>T lines, one count each.</p>', sol_halv,
    [gen_queries([100, 1, 1024])], [gen_queries([2, 3, 2**59 - 1, 2**59, 10**18, 2**50 + 1])],
    lambda: gen_queries([random.randint(1, 10**18) for _ in range(random.randint(1, 1000))]), n_rand=4)


def sol_powmod(s):
    L = lines_of(s)
    out = []
    for line in L[1:1 + int(L[0])]:
        a, b, m = map(int, line.split())
        out.append(str(pow(a, b, m)))
    return '\n'.join(out)


def gen_pow():
    q = random.randint(1, 2000)
    return f"{q}\n" + '\n'.join(f"{random.randint(0, 10**9)} {random.randint(0, 10**18)} {random.randint(1, 10**9)}" for _ in range(q)) + '\n'


add('cx-c-powmod', 'Fast modular power', 'complexity', 'logarithms', 1200, ['math', 'binary exponentiation'],
    '<p>For each query print a<sup>b</sup> mod m.</p><p>b goes up to 10<sup>18</sup>: multiplying b times would take forever. Square-and-multiply needs about log<sub>2</sub> b ≈ 60 steps. m ≤ 10<sup>9</sup>, so the product of two residues fits in 64 bits. Note 0<sup>0</sup> = 1 and anything mod 1 is 0.</p>',
    '<p>First line Q (1 ≤ Q ≤ 2000). Next Q lines: a b m (0 ≤ a ≤ 10<sup>9</sup>, 0 ≤ b ≤ 10<sup>18</sup>, 1 ≤ m ≤ 10<sup>9</sup>).</p>', '<p>Q lines.</p>', sol_powmod,
    ["3\n2 10 1000\n3 0 7\n2 1000000000000000000 1000000007\n"],
    ["1\n0 0 5\n", "1\n5 3 1\n", "2\n1000000000 1000000000000000000 999999937\n0 5 7\n"], gen_pow, n_rand=4)


def sol_harm(s):
    n = int(s.strip())
    total, i = 0, 1
    while i <= n:
        q = n // i
        j = n // q
        total += q * (j - i + 1)
        i = j + 1
    return str(total)


add('cx-c-harmonic', 'Sum of ⌊n / i⌋', 'complexity', 'logarithms', 1700, ['math', 'sqrt decomposition'],
    '<p>Print S = ⌊n/1⌋ + ⌊n/2⌋ + … + ⌊n/n⌋. (S is also the number of pairs (i, j) with i · j ≤ n, and the total work of the "j += i" loop from the lesson.)</p><p>n goes up to 10<sup>12</sup>, so an O(n) loop is too slow. The quotient ⌊n/i⌋ takes only about 2√n different values, and all i with the same quotient form one block: from i to ⌊n / ⌊n/i⌋⌋. Add a whole block at once.</p>',
    '<p>One integer n (1 ≤ n ≤ 10<sup>12</sup>).</p>', '<p>One integer S.</p>', sol_harm,
    ["5\n", "10\n"], ["1\n", "2\n", "1000000000000\n", "999999999989\n"],
    lambda: f"{random.choice([random.randint(1, 1000), random.randint(1, 10**7), random.randint(1, 10**12)])}\n", n_rand=5)


def factor(n):
    f, d = {}, 2
    while d * d <= n:
        while n % d == 0:
            f[d] = f.get(d, 0) + 1
            n //= d
        d += 1 if d == 2 else 2
    if n > 1:
        f[n] = f.get(n, 0) + 1
    return f


def sol_div(s):
    n = int(s.strip())
    r = 1
    for e in factor(n).values():
        r *= e + 1
    return str(r)


add('cx-c-divisors', 'Count the divisors', 'complexity', 'growth-classes', 1000, ['math', 'number theory'],
    '<p>Print the number of positive divisors of n.</p><p>n ≤ 10<sup>12</sup>: testing every number up to n is 10<sup>12</sup> steps. Divisors pair up as (i, n/i), so testing i up to √n (10<sup>6</sup>) is enough — count 2 for each pair, 1 when i = n/i.</p>',
    '<p>One integer n (1 ≤ n ≤ 10<sup>12</sup>).</p>', '<p>One integer.</p>', sol_div,
    ["36\n", "13\n"], ["1\n", "2\n", "999999999989\n", "963761198400\n", "1000000000000\n", "999966000289\n"],
    lambda: f"{random.choice([random.randint(1, 10**6), random.randint(1, 10**12)])}\n", n_rand=5)


def is_prime(n):
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n % p == 0:
            return n == p
    d, r = n - 1, 0
    while d % 2 == 0:
        d //= 2
        r += 1
    for a in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(r - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True


def sol_prime(s):
    L = lines_of(s)
    return '\n'.join('YES' if is_prime(int(x)) else 'NO' for x in L[1:1 + int(L[0])])


def gen_prime():
    vals = []
    for _ in range(random.randint(1, 20)):
        x = random.randint(1, 10**12)
        if random.random() < 0.4:
            while not is_prime(x):
                x += 1
        vals.append(min(x, 10**12))
    return gen_queries(vals)


add('cx-c-prime', 'Prime or not', 'complexity', 'growth-classes', 1100, ['math', 'number theory'],
    '<p>For each number, print YES if it is prime and NO otherwise.</p><p>Each number is up to 10<sup>12</sup>; trial division up to √n is 10<sup>6</sup> steps per number, 2·10<sup>7</sup> for all of them — fine. Remember 1 is not prime.</p>',
    '<p>First line T (1 ≤ T ≤ 20). Next T lines: n (1 ≤ n ≤ 10<sup>12</sup>).</p>', '<p>T lines, YES or NO.</p>', sol_prime,
    [gen_queries([2, 15, 97, 1])], [gen_queries([999999999989, 999999999999, 1000000000000, 999966000289, 3, 4]), gen_queries([1] * 20)],
    gen_prime, n_rand=5)


# ─────────────────────────── Round 2: one problem set per page ───────────────────────────
# Each efficient reference is cross-checked against a brute force on small inputs.

import math
from collections import Counter
from functools import lru_cache
from bisect import bisect_left, bisect_right


def _check(fast, brute, gen, rounds=300):
    for _ in range(rounds):
        s = gen()
        assert fast(s) == brute(s), (s, fast(s), brute(s))


def qlines(vals):
    """T, then one query per line (each query may be a tuple)."""
    return f"{len(vals)}\n" + '\n'.join(' '.join(map(str, v)) if isinstance(v, tuple) else str(v) for v in vals) + '\n'


def each_query(s, cast=int):
    L = lines_of(s)
    return [tuple(map(cast, l.split())) for l in L[1:1 + int(L[0])]]


# ── summations ──
def sol_sum_sq(s):
    return '\n'.join(str(n * (n + 1) * (2 * n + 1) // 6 % MOD) for (n,) in each_query(s))


_check(sol_sum_sq, lambda s: '\n'.join(str(sum(i * i for i in range(1, n + 1)) % MOD) for (n,) in each_query(s)),
       lambda: qlines([random.randint(1, 60) for _ in range(5)]))
add('cx-c-sum-squares', 'Sum of squares', 'complexity', 'summations', 1100, ['math', 'summations', 'modular'],
    '<p>For each query n print 1² + 2² + … + n² modulo 10<sup>9</sup> + 7.</p><p>The closed form is n(n + 1)(2n + 1)/6. With n up to 10<sup>18</sup> you must divide by 6 exactly before reducing (or multiply by the modular inverse of 6).</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: n (1 ≤ n ≤ 10<sup>18</sup>).</p>', '<p>T lines.</p>', sol_sum_sq,
    [qlines([3, 10, 10**18])], [qlines([1, 2, 999999999999999999, 1000000006, 1000000007])],
    lambda: qlines([random.choice([random.randint(1, 1000), random.randint(1, 10**18)]) for _ in range(random.randint(1, 1000))]), n_rand=5)


def sol_div_ab(s):
    out = []
    for n, a, b in each_query(s):
        l = a // math.gcd(a, b) * b
        out.append(n // a + n // b - n // l)
    return '\n'.join(map(str, out))


_check(sol_div_ab, lambda s: '\n'.join(str(sum(1 for x in range(1, n + 1) if x % a == 0 or x % b == 0)) for n, a, b in each_query(s)),
       lambda: qlines([(random.randint(1, 300), random.randint(1, 20), random.randint(1, 20)) for _ in range(5)]))
add('cx-c-div-a-or-b', 'Divisible by a or b', 'complexity', 'summations', 1200, ['math', 'inclusion-exclusion'],
    '<p>For each query, count the integers x with 1 ≤ x ≤ n that are divisible by a or by b (or both).</p><p>n is up to 10<sup>18</sup>, so you cannot loop. ⌊n/a⌋ counts the multiples of a; numbers divisible by both were counted twice — they are the multiples of lcm(a, b).</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: n a b (1 ≤ n ≤ 10<sup>18</sup>, 1 ≤ a, b ≤ 10<sup>9</sup>).</p>', '<p>T lines.</p>', sol_div_ab,
    [qlines([(10, 2, 3), (100, 4, 6), (10**18, 1, 1)])], [qlines([(1, 2, 3), (6, 6, 6), (10**18, 10**9, 999999937), (10**18, 999999937, 999999929)])],
    lambda: qlines([(random.randint(1, 10**18), random.randint(1, 10**9), random.randint(1, 10**9)) for _ in range(random.randint(1, 1000))]), n_rand=5)


def sol_geom(s):
    out = []
    for r, k in each_query(s):
        rr = r % MOD
        out.append((k + 1) % MOD if rr == 1 else (pow(rr, k + 1, MOD) - 1) * pow(rr - 1, MOD - 2, MOD) % MOD)
    return '\n'.join(map(str, out))


_check(sol_geom, lambda s: '\n'.join(str(sum(r ** i for i in range(k + 1)) % MOD) for r, k in each_query(s)),
       lambda: qlines([(random.choice([0, 1, 2, 3, 10, MOD + 1]), random.randint(0, 30)) for _ in range(5)]))
add('cx-c-geometric', 'Geometric series', 'complexity', 'summations', 1500, ['math', 'summations', 'fast power'],
    '<p>For each query print 1 + r + r² + … + r<sup>k</sup> modulo 10<sup>9</sup> + 7.</p><p>With k up to 10<sup>18</sup>, use the closed form (r<sup>k+1</sup> − 1)/(r − 1) with fast exponentiation and a modular inverse — but watch out: when r ≡ 1 (mod 10<sup>9</sup> + 7) the formula divides by zero, and every term is 1.</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: r k (0 ≤ r ≤ 10<sup>9</sup> + 8, 0 ≤ k ≤ 10<sup>18</sup>).</p>', '<p>T lines.</p>', sol_geom,
    [qlines([(2, 3), (1, 10**18), (10, 0)])], [qlines([(0, 0), (0, 5), (MOD + 1, 7), (MOD, 3), (10**9, 10**18)])],
    lambda: qlines([(random.choice([random.randint(0, 10**9), 1, MOD + 1]), random.randint(0, 10**18)) for _ in range(random.randint(1, 1000))]), n_rand=5)


# ── code fragments ──
def sol_triple(s):
    return '\n'.join(str(n * (n + 1) * (n + 2) // 6) for (n,) in each_query(s))


def brute_triple(s):
    out = []
    for (n,) in each_query(s):
        c = 0
        for i in range(1, n + 1):
            for j in range(i, n + 1):
                c += n - j + 1
        out.append(c)
    return '\n'.join(map(str, out))


_check(sol_triple, brute_triple, lambda: qlines([random.randint(1, 30) for _ in range(5)]))
add('cx-c-triple-loop', 'How many times does it run?', 'complexity', 'code-fragments', 1300, ['loops', 'combinatorics'],
    '<p>Count how many times <code>count++</code> executes:</p><pre>for i in 1..n:\n    for j in i..n:\n        for k in j..n:\n            count++</pre><p>Simulating is Θ(n³). Each run corresponds to a choice i ≤ j ≤ k from 1…n — a multiset of size 3 — so the answer is C(n + 2, 3).</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: n (1 ≤ n ≤ 2·10<sup>6</sup>).</p>', '<p>T lines, the exact count (fits in a signed 64-bit integer).</p>', sol_triple,
    [qlines([1, 2, 3, 10])], [qlines([2000000, 1999999, 4])],
    lambda: qlines([random.randint(1, 2 * 10**6) for _ in range(random.randint(1, 1000))]), n_rand=5)


def sol_dbl(s):
    return '\n'.join(str(2 ** (n.bit_length()) - 1) for (n,) in each_query(s))


def brute_dbl(s):
    out = []
    for (n,) in each_query(s):
        c, i = 0, 1
        while i <= n:
            c += i
            i *= 2
        out.append(c)
    return '\n'.join(map(str, out))


_check(sol_dbl, brute_dbl, lambda: qlines([random.randint(1, 10**6) for _ in range(5)]))
add('cx-c-doubling-loop', 'A loop that doubles', 'complexity', 'code-fragments', 1100, ['loops', 'logarithms', 'geometric series'],
    '<p>Count how many times <code>count++</code> executes:</p><pre>for (i = 1; i &lt;= n; i *= 2)\n    for (j = 0; j &lt; i; j++)\n        count++;</pre><p>It looks like O(n log n) — but the inner loops sum to 1 + 2 + 4 + … , a geometric series. Find the exact value.</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: n (1 ≤ n ≤ 10<sup>18</sup>).</p>', '<p>T lines.</p>', sol_dbl,
    [qlines([1, 5, 8, 1000])], [qlines([2, 3, 4, 2**59, 2**59 - 1, 10**18])],
    lambda: qlines([random.choice([random.randint(1, 1000), random.randint(1, 10**18)]) for _ in range(random.randint(1, 1000))]), n_rand=5)


def sol_sqrt_chain(s):
    out = []
    for (n,) in each_query(s):
        c = 0
        while n >= 2:
            n = math.isqrt(n)
            c += 1
        out.append(c)
    return '\n'.join(map(str, out))


add('cx-c-sqrt-chain', 'Repeated square roots', 'complexity', 'code-fragments', 1300, ['loops', 'log log n', 'precision'],
    '<p>Start from n and repeat <code>n = ⌊√n⌋</code> while n ≥ 2. How many steps?</p><p>Each step halves the number of bits, so the answer is about log₂ log₂ n — at most 6 for 10<sup>18</sup>. The real trap is precision: <code>sqrt</code> on doubles can be off by one for large n, so correct the floating result with integer checks.</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: n (1 ≤ n ≤ 10<sup>18</sup>).</p>', '<p>T lines.</p>', sol_sqrt_chain,
    [qlines([1, 2, 16, 65536, 10**18])], [qlines([3, 4, 15, 255, 256, 65535, 999999999**2, 999999999**2 - 1, 10**18 - 1, 999999999999999999])],
    lambda: qlines([random.choice([random.randint(1, 10**18), random.randint(1, 10**6) ** 2, random.randint(2, 10**9) ** 2 - 1]) for _ in range(random.randint(1, 1000))]), n_rand=5)


# ── logarithms ──
def sol_digits(s):
    out = []
    for n, b in each_query(s):
        d = 1
        while n >= b:
            n //= b
            d += 1
        out.append(d)
    return '\n'.join(map(str, out))


add('cx-c-digits-base', 'Digits in base b', 'complexity', 'logarithms', 1000, ['logarithms', 'number bases'],
    '<p>For each query print how many digits n has when written in base b (0 has one digit).</p><p>The answer is ⌊log<sub>b</sub> n⌋ + 1 for n ≥ 1 — but floating-point logarithms can be off by one exactly at powers of b. Repeated integer division is exact and takes at most 60 steps.</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: n b (0 ≤ n ≤ 10<sup>18</sup>, 2 ≤ b ≤ 36).</p>', '<p>T lines.</p>', sol_digits,
    [qlines([(255, 2), (255, 16), (0, 10), (10**18, 10)])], [qlines([(1, 2), (35, 36), (36, 36), (999, 10), (1000, 10), (2**59, 2), (2**59 - 1, 2), (3**37, 3), (3**37 - 1, 3)])],
    lambda: qlines([(random.choice([random.randint(0, 10**18), random.randint(0, 100)]), random.randint(2, 36)) for _ in range(random.randint(1, 1000))]), n_rand=5)


def sol_power_steps(s):
    out = []
    for n, c in each_query(s):
        k, p = 0, 1
        while p < n:
            p *= c
            k += 1
        out.append(k)
    return '\n'.join(map(str, out))


add('cx-c-power-steps', 'Smallest power that reaches n', 'complexity', 'logarithms', 1100, ['logarithms', 'overflow'],
    '<p>For each query print the smallest k ≥ 0 such that c<sup>k</sup> ≥ n — that is ⌈log<sub>c</sub> n⌉.</p><p>Multiply step by step, but guard against overflow: once the power reaches n you can stop, and checking <code>p &gt; (n − 1) / c</code> before multiplying avoids ever exceeding the range.</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: n c (1 ≤ n ≤ 10<sup>18</sup>, 2 ≤ c ≤ 10<sup>9</sup>).</p>', '<p>T lines.</p>', sol_power_steps,
    [qlines([(1, 2), (8, 2), (9, 2), (10**18, 10)])], [qlines([(10**18, 10**9), (10**18 + 0, 999999999), (2, 10**9), (10**9, 10**9), (10**9 + 1, 10**9), (2**60, 2)][:5] + [(10**18, 2)])],
    lambda: qlines([(random.randint(1, 10**18), random.choice([2, 3, 10, random.randint(2, 10**9)])) for _ in range(random.randint(1, 1000))]), n_rand=5)


# ── growth classes ──
def sol_squares(s):
    return '\n'.join(str(math.isqrt(b) - math.isqrt(a - 1)) for a, b in each_query(s))


_check(sol_squares, lambda s: '\n'.join(str(sum(1 for x in range(a, b + 1) if math.isqrt(x) ** 2 == x)) for a, b in each_query(s)),
       lambda: qlines([tuple(sorted((random.randint(1, 500), random.randint(1, 500)))) for _ in range(5)]))
add('cx-c-squares-range', 'Perfect squares in a range', 'complexity', 'growth-classes', 1100, ['math', 'square root'],
    '<p>For each query count the perfect squares x² with a ≤ x² ≤ b.</p><p>Looping is O(b). The count is ⌊√b⌋ − ⌊√(a − 1)⌋ — O(1), provided your integer square root is exact for numbers near 10<sup>18</sup>.</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: a b (1 ≤ a ≤ b ≤ 10<sup>18</sup>).</p>', '<p>T lines.</p>', sol_squares,
    [qlines([(1, 10), (17, 24), (1, 10**18)])], [qlines([(1, 1), (2, 3), (4, 4), ((10**9 - 1) ** 2, 10**18), (10**18 - 1, 10**18), (999999999999999999, 999999999999999999)])],
    lambda: qlines([tuple(sorted((random.randint(1, 10**18), random.randint(1, 10**18)))) for _ in range(random.randint(1, 1000))]), n_rand=5)


_SIEVE_N = 5 * 10**6
_pi_cache = []


def _prime_count_table():
    if not _pi_cache:
        is_p = bytearray([1]) * (_SIEVE_N + 1)
        is_p[0] = is_p[1] = 0
        for i in range(2, math.isqrt(_SIEVE_N) + 1):
            if is_p[i]:
                is_p[i * i::i] = bytearray(len(range(i * i, _SIEVE_N + 1, i)))
        pi, c = [0] * (_SIEVE_N + 1), 0
        for i in range(_SIEVE_N + 1):
            c += is_p[i]
            pi[i] = c
        _pi_cache.append(pi)
    return _pi_cache[0]


def sol_count_primes(s):
    pi = _prime_count_table()
    return '\n'.join(str(pi[n]) for (n,) in each_query(s))


add('cx-c-count-primes', 'Counting primes', 'complexity', 'growth-classes', 1300, ['math', 'sieve', 'precomputation'],
    '<p>Answer up to 10<sup>5</sup> queries: how many primes are ≤ n?</p><p>Trial division per query is far too slow. Run the Sieve of Eratosthenes once up to 5·10<sup>6</sup> — O(N log log N) — build prefix counts, and answer each query in O(1).</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>5</sup>). Next T lines: n (1 ≤ n ≤ 5·10<sup>6</sup>).</p>', '<p>T lines.</p>', sol_count_primes,
    [qlines([1, 2, 10, 100])], [qlines([3, 4, 5000000, 4999999, 1000000])],
    lambda: qlines([random.randint(1, _SIEVE_N) for _ in range(random.randint(1, 3000))]), n_rand=4,
    large=lambda: qlines([random.randint(1, _SIEVE_N) for _ in range(30000)]))


def sol_cmp_growth(s):
    out = []
    for p1, a1, b1, p2, a2, b2 in each_query(s):
        x, y = (p1, a1, b1), (p2, a2, b2)
        out.append('<' if x < y else '>' if x > y else '=')
    return '\n'.join(out)


add('cx-c-compare-growth', 'Which grows faster?', 'complexity', 'growth-classes', 1200, ['asymptotics', 'growth rates'],
    '<p>Each function has the form f(n) = p<sup>n</sup> · n<sup>a</sup> · (log n)<sup>b</sup> with integers p ≥ 1, a ≥ 0, b ≥ 0. For each pair (f, g) print <code>&lt;</code> if f = o(g), <code>&gt;</code> if g = o(f), and <code>=</code> if f = Θ(g).</p><p>The rule to discover: an exponential base dominates any power of n, and any power of n dominates any power of log n.</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: p1 a1 b1 p2 a2 b2 (1 ≤ p ≤ 10, 0 ≤ a, b ≤ 10).</p>', '<p>T lines, one symbol each.</p>', sol_cmp_growth,
    [qlines([(1, 2, 0, 1, 1, 5), (2, 0, 0, 1, 10, 10), (1, 1, 1, 1, 1, 1), (1, 0, 3, 1, 1, 0)])],
    [qlines([(3, 0, 0, 2, 10, 10), (1, 0, 0, 1, 0, 0), (1, 0, 1, 1, 0, 0), (2, 1, 0, 2, 0, 9)])],
    lambda: qlines([tuple(random.randint(1, 3) if k % 3 == 0 else random.randint(0, 4) for k in range(6)) for _ in range(random.randint(1, 1000))]), n_rand=5)


# ── asymptotic proofs ──
def _q(d, b, c, n):
    return d * n * n - b * n - c


def sol_witness(s):
    out = []
    for a, C, b, c in each_query(s):
        d = C - a
        # q is convex with vertex at b/(2d); for n >= v it increases
        v = max(1, b // (2 * d))
        if all(_q(d, b, c, n) >= 0 for n in range(max(1, v - 1), v + 3)):
            out.append(1)
            continue
        lo, hi = max(1, v - 1), 4 * 10**6
        while lo < hi:                          # largest n >= lo with q(n) < 0
            mid = (lo + hi + 1) // 2
            if _q(d, b, c, mid) < 0:
                lo = mid
            else:
                hi = mid - 1
        out.append(lo + 1 if _q(d, b, c, lo) < 0 else 1)
    return '\n'.join(map(str, out))


def brute_witness(s):
    out = []
    for a, C, b, c in each_query(s):
        last_bad = 0
        for n in range(1, 5000):
            if a * n * n + b * n + c > C * n * n:
                last_bad = n
        out.append(last_bad + 1)
    return '\n'.join(map(str, out))


_check(sol_witness, brute_witness, lambda: qlines([(lambda a: (a, a + random.randint(1, 4), random.randint(-300, 300), random.randint(-500, 500)))(random.randint(0, 5)) for _ in range(5)]))
add('cx-c-big-o-witness', 'Find the Big-O witness', 'complexity', 'asymptotic-proofs', 1600, ['asymptotics', 'proofs', 'binary search'],
    '<p>To prove a·n² + b·n + c = O(n²) you exhibit constants C and n₀ with a·n² + b·n + c ≤ C·n² for every n ≥ n₀. Given a, b, c and C (with C &gt; a), print the <b>smallest</b> integer n₀ ≥ 1 that works.</p><p>The difference (C − a)n² − bn − c is a parabola opening upwards: once it becomes non-negative to the right of its vertex it stays so. Binary search on the increasing part.</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: a C b c (0 ≤ a &lt; C ≤ 1000, |b|, |c| ≤ 10<sup>6</sup>).</p>', '<p>T lines, the smallest n₀.</p>', sol_witness,
    [qlines([(3, 4, 5, 6), (1, 2, -10, -10), (0, 1, 1000000, 0)])],
    [qlines([(999, 1000, 1000000, 1000000), (0, 1000, -1000000, -1000000), (5, 6, 0, 0), (0, 1, 0, 1), (0, 1, 0, 1000000)])],
    lambda: qlines([(lambda a: (a, random.randint(a + 1, min(1000, a + random.choice([1, 3, 500])) ), random.randint(-10**6, 10**6), random.randint(-10**6, 10**6)))(random.randint(0, 999)) for _ in range(random.randint(1, 1000))]), n_rand=5)


# ── estimating running time: choose the right growth rate ──
def sol_max_pair_prod(s):
    n, a = read_arr(s)
    a = sorted(a)
    return str(max(a[0] * a[1], a[-1] * a[-2]))


def read_arr(s):
    v = ints(s)
    return v[0], v[1:1 + v[0]]


_check(sol_max_pair_prod, lambda s: (lambda n, a: str(max(a[i] * a[j] for i in range(n) for j in range(i + 1, n))))(*read_arr(s)),
       lambda: arr_input([random.randint(-9, 9) for _ in range(random.randint(2, 9))]))
add('cx-c-max-pair-product', 'Largest product of two', 'complexity', 'estimating-runtime', 1000, ['arrays', 'sorting', 'greedy'],
    '<p>Print the largest product a<sub>i</sub> · a<sub>j</sub> over all pairs of different positions.</p><p>n = 2·10<sup>5</sup> means 2·10<sup>10</sup> pairs — far over budget. Only four values can matter: the two largest and the two smallest (two negatives make a positive).</p>',
    '<p>First line n (2 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>).</p>', '<p>One integer (it can need 64 bits).</p>', sol_max_pair_prod,
    [arr_input([3, 5, -2, 4]), arr_input([-10, -3, 1, 2])],
    [arr_input([-1, -1]), arr_input([0, -5]), arr_input([10**9, 10**9]), arr_input([-10**9, -10**9, 1]), arr_input([-5, 0, 3])],
    lambda: arr_input([random.randint(-10**9, 10**9) for _ in range(random.randint(2, SIZE))]), large=lambda: arr_input([random.randint(-10**9, 10**9) for _ in range(20000)]))


def sol_inv(s):
    n, a = read_arr(s)

    def sort(x):
        if len(x) <= 1:
            return x, 0
        m = len(x) // 2
        L, cl = sort(x[:m])
        R, cr = sort(x[m:])
        out, i, j, c = [], 0, 0, cl + cr
        while i < len(L) and j < len(R):
            if L[i] <= R[j]:
                out.append(L[i]); i += 1
            else:
                out.append(R[j]); j += 1
                c += len(L) - i
        out += L[i:]
        out += R[j:]
        return out, c
    return str(sort(a)[1])


_check(sol_inv, lambda s: (lambda n, a: str(sum(1 for i in range(n) for j in range(i + 1, n) if a[i] > a[j])))(*read_arr(s)),
       lambda: arr_input([random.randint(1, 6) for _ in range(random.randint(1, 10))]))
add('cx-c-inversions', 'Counting inversions', 'complexity', 'estimating-runtime', 1500, ['divide and conquer', 'merge sort', 'counting'],
    '<p>An inversion is a pair i &lt; j with a<sub>i</sub> &gt; a<sub>j</sub>. Count them.</p><p>Checking all pairs is Θ(n²) — 2·10<sup>10</sup> for n = 2·10<sup>5</sup>. During merge sort, whenever an element of the right half is placed before the remaining elements of the left half, it forms an inversion with each of them: Θ(n log n).</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>).</p>', '<p>One integer (it can exceed 2<sup>31</sup>).</p>', sol_inv,
    [arr_input([2, 4, 1, 3, 5]), arr_input([5, 4, 3, 2, 1])],
    [arr_input([1]), arr_input([1, 1, 1]), arr_input(list(range(1, 30))), arr_input(list(range(300, 0, -1)))],
    lambda: arr_input([random.randint(-10**9, 10**9) for _ in range(random.randint(1, SIZE))]),
    large=lambda: arr_input([random.randint(1, 10**9) for _ in range(20000)]))


def sol_closest(s):
    n, a = read_arr(s)
    a = sorted(a)
    return str(min(a[i + 1] - a[i] for i in range(n - 1)))


_check(sol_closest, lambda s: (lambda n, a: str(min(abs(a[i] - a[j]) for i in range(n) for j in range(i + 1, n))))(*read_arr(s)),
       lambda: arr_input([random.randint(-30, 30) for _ in range(random.randint(2, 9))]))
add('cx-c-closest-values', 'Closest pair of values', 'complexity', 'estimating-runtime', 1000, ['sorting'],
    '<p>Print the smallest |a<sub>i</sub> − a<sub>j</sub>| over all pairs of different positions.</p><p>After sorting, the closest pair is always adjacent — so O(n log n) instead of O(n²).</p>',
    '<p>First line n (2 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>).</p>', '<p>One integer.</p>', sol_closest,
    [arr_input([7, 1, 19, 4, 12]), arr_input([5, 5])],
    [arr_input([-10**9, 10**9]), arr_input([1, 3, 6, 10, 15])],
    lambda: arr_input([random.randint(-10**9, 10**9) for _ in range(random.randint(2, SIZE))]), large=lambda: arr_input(random.sample(range(-10**9, 10**9, 7), 20000)))


# ── cases ──
def sol_lin_cost(s):
    L = lines_of(s)
    n = int(L[0])
    a = L[1].split()
    first = {}
    for i, x in enumerate(a):
        first.setdefault(x, i)
    return '\n'.join(str(first[x] + 1) if x in first else str(n) for x in L[3].split()[:int(L[2])])


def gen_lin_cost(n=None, q=None):
    n = n or random.randint(1, SIZE)
    q = q or random.randint(1, SIZE)
    a = [random.randint(1, 2 * n) for _ in range(n)]
    return f"{n}\n{fmt(a)}\n{q}\n{fmt(random.randint(1, 2 * n) for _ in range(q))}\n"


add('cx-c-linear-search-cost', 'Best case, worst case', 'complexity', 'cases', 1200, ['analysis', 'hashing', 'precomputation'],
    '<p>A linear search scans the array from the left and stops at the first element equal to x, counting one comparison per element it inspects. For each query x print how many comparisons it makes: the position of the first occurrence (1-based) if x is present, or n if it is absent.</p><p>Simulating each search is O(n) per query — too slow for n = q = 2·10<sup>5</sup>. Precompute the first occurrence of every value.</p>',
    '<p>Line 1: n. Line 2: n integers (1 ≤ a<sub>i</sub> ≤ 10<sup>9</sup>). Line 3: q. Line 4: q integers.</p>', '<p>q lines.</p>', sol_lin_cost,
    ["5\n4 2 7 2 9\n4\n4 2 9 5\n"], ["1\n7\n2\n7 8\n", "3\n5 5 5\n2\n5 6\n"], gen_lin_cost, large=lambda: gen_lin_cost(20000, 20000))


def sol_bs_cost(s):
    L = lines_of(s)
    n = int(L[0])
    a = list(map(int, L[1].split()))
    out = []
    for x in map(int, L[3].split()[:int(L[2])]):
        lo, hi, probes = 0, n - 1, 0
        while lo <= hi:
            mid = (lo + hi) // 2
            probes += 1
            if a[mid] == x:
                break
            if a[mid] < x:
                lo = mid + 1
            else:
                hi = mid - 1
        out.append(probes)
    return '\n'.join(map(str, out))


def gen_bs_cost(n=None, q=None):
    n = n or random.randint(1, SIZE)
    q = q or random.randint(1, SIZE)
    a = sorted(random.sample(range(1, 4 * n + 10), n))
    return f"{n}\n{fmt(a)}\n{q}\n{fmt(random.choice([random.choice(a), random.randint(0, 4 * n + 12)]) for _ in range(q))}\n"


add('cx-c-binary-search-cost', 'How many probes?', 'complexity', 'cases', 1200, ['binary search', 'simulation'],
    '<p>The array is sorted and its values are distinct. For each query x, run exactly this binary search and print how many times it reads <code>a[mid]</code>:</p><pre>lo = 0, hi = n − 1\nwhile lo ≤ hi:\n    mid = ⌊(lo + hi) / 2⌋     ← one probe\n    if a[mid] == x: stop\n    if a[mid] &lt; x: lo = mid + 1 else hi = mid − 1</pre><p>Compare the best case (1 probe) with the worst (⌊log₂ n⌋ + 1).</p>',
    '<p>Line 1: n (1 ≤ n ≤ 2·10<sup>5</sup>). Line 2: n distinct sorted integers. Line 3: q (1 ≤ q ≤ 2·10<sup>5</sup>). Line 4: q integers.</p>', '<p>q lines.</p>', sol_bs_cost,
    ["7\n2 5 8 12 16 23 38\n4\n12 2 38 13\n"], ["1\n5\n2\n5 6\n"], gen_bs_cost, large=lambda: gen_bs_cost(20000, 20000))


# ── space ──
def sol_tree_height(s):
    v = ints(s)
    n = v[0]
    par = [0, 0] + v[1:n]
    children = [[] for _ in range(n + 1)]
    for i in range(2, n + 1):
        children[par[i]].append(i)
    depth, best, stack = [0] * (n + 1), 0, [1]
    while stack:
        u = stack.pop()
        best = max(best, depth[u])
        for w in children[u]:
            depth[w] = depth[u] + 1
            stack.append(w)
    return str(best)


def gen_tree(n=None, shape=None):
    n = n or random.randint(1, SIZE)
    shape = shape or random.choice(['random', 'path', 'star', 'caterpillar'])
    order = list(range(2, n + 1))
    random.shuffle(order)
    nodes, par = [1], {}
    for i, u in enumerate(order):
        if shape == 'path':
            par[u] = nodes[-1]
        elif shape == 'star':
            par[u] = 1
        elif shape == 'caterpillar':
            par[u] = nodes[-1] if i % 2 == 0 else random.choice(nodes)
        else:
            par[u] = random.choice(nodes)
        nodes.append(u)
    return f"{n}\n" + fmt(par[i] for i in range(2, n + 1)) + "\n"


add('cx-c-tree-height', 'Height of a deep tree', 'complexity', 'space', 1300, ['trees', 'iterative dfs', 'stack depth'],
    '<p>A rooted tree has n nodes; node 1 is the root and p<sub>i</sub> is the parent of node i. Print the height of the tree: the largest number of edges on a path from the root down to a node.</p><p>A recursive DFS uses one stack frame per level — on a path of 2·10<sup>5</sup> nodes that overflows the default stack in most languages. Use an explicit stack (or BFS).</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n − 1 integers p<sub>2</sub> … p<sub>n</sub> (the line is empty when n = 1). The parents form a valid tree rooted at 1.</p>', '<p>One integer.</p>', sol_tree_height,
    ["5\n1 1 2 3\n", "1\n\n"], [gen_tree(2), gen_tree(50, 'path'), gen_tree(50, 'star')],
    gen_tree, n_rand=6, large=lambda: gen_tree(20000, 'path'))


def sol_single(s):
    n, a = read_arr(s)
    x = 0
    for v in a:
        x ^= v
    return str(x)


def gen_single(n=None):
    k = (n or random.randint(1, SIZE)) // 2
    vals = random.sample(range(0, 10**9), k + 1)
    a = vals[:k] * 2 + [vals[k]]
    random.shuffle(a)
    return arr_input(a)


add('cx-c-single-number', 'The one without a partner', 'complexity', 'space', 1100, ['xor', 'bit manipulation', 'constant space'],
    '<p>Every value appears exactly twice except one, which appears once. Print it.</p><p>A hash map uses O(n) extra memory. XOR of all values uses O(1): x ⊕ x = 0 and ⊕ is associative and commutative, so every pair cancels.</p>',
    '<p>First line n (odd, 1 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (0 ≤ a<sub>i</sub> ≤ 10<sup>9</sup>).</p>', '<p>One integer.</p>', sol_single,
    [arr_input([4, 1, 2, 1, 2]), arr_input([7])], [arr_input([0, 5, 5]), arr_input([10**9, 3, 10**9])], gen_single, large=lambda: gen_single(20001))


# ── amortized analysis ──
def sol_flips(s):
    return '\n'.join(str(2 * n - bin(n).count('1')) for (n,) in each_query(s))


def brute_flips(s):
    out = []
    for (n,) in each_query(s):
        out.append(sum(bin(i ^ (i + 1)).count('1') for i in range(n)))
    return '\n'.join(map(str, out))


_check(sol_flips, brute_flips, lambda: qlines([random.randint(0, 3000) for _ in range(5)]))
add('cx-c-counter-flips', 'Binary counter bit flips', 'complexity', 'amortized-methods', 1300, ['amortized analysis', 'bits'],
    '<p>A binary counter starts at 0 and is incremented n times. Each increment flips some bits (trailing 1s become 0, then one 0 becomes 1). Print the total number of bit flips.</p><p>A single increment can flip ~60 bits, yet the total is below 2n: bit k flips every 2<sup>k</sup> increments. The exact total is 2n − popcount(n).</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: n (0 ≤ n ≤ 10<sup>18</sup>).</p>', '<p>T lines.</p>', sol_flips,
    [qlines([0, 1, 4, 7])], [qlines([2, 3, 8, 2**59, 2**59 - 1, 10**18])],
    lambda: qlines([random.choice([random.randint(0, 10**6), random.randint(0, 10**18)]) for _ in range(random.randint(1, 1000))]), n_rand=5)


def sol_multipop(s):
    L = lines_of(s)
    st, out = [], []
    for line in L[1:1 + int(L[0])]:
        t, x = map(int, line.split())
        if t == 1:
            st.append(x)
        else:
            tot = 0
            for _ in range(min(x, len(st))):
                tot += st.pop()
            out.append(tot)
    return '\n'.join(map(str, out))


def gen_multipop(q=None):
    q = q or random.randint(1, SIZE)
    ops = []
    for _ in range(q - 1):
        ops.append((1, random.randint(1, 10**9)) if random.random() < 0.7 else (2, random.choice([1, 2, 5, 100, 10**9])))
    ops.append((2, 10**9))
    return qlines(ops)


add('cx-c-multipop', 'Stack with multipop', 'complexity', 'amortized-methods', 1300, ['amortized analysis', 'stack'],
    '<p>Process q operations on an empty stack: <code>1 x</code> pushes x; <code>2 k</code> pops min(k, size) elements and you print the sum of the popped values (0 if the stack was empty).</p><p>One multipop can cost Θ(q), so the naive bound is O(q²) — but each element is popped at most once after being pushed once: the whole sequence is O(q) (aggregate method).</p>',
    '<p>First line q (1 ≤ q ≤ 2·10<sup>5</sup>). Next q lines: <code>1 x</code> (1 ≤ x ≤ 10<sup>9</sup>) or <code>2 k</code> (1 ≤ k ≤ 10<sup>9</sup>). The last operation is a multipop.</p>', '<p>One line per multipop.</p>', sol_multipop,
    [qlines([(1, 5), (1, 3), (1, 7), (2, 2), (1, 1), (2, 10)])], [qlines([(2, 1)]), qlines([(1, 10**9)] * 5 + [(2, 10**9)])],
    gen_multipop, large=lambda: gen_multipop(20000))


def sol_two_stacks(s):
    L = lines_of(s)
    ins, outs, res, moves = [], [], [], 0
    for line in L[1:1 + int(L[0])]:
        p = line.split()
        if p[0] == '1':
            ins.append(int(p[1]))
        else:
            if not outs:
                while ins:
                    outs.append(ins.pop())
                    moves += 1
            res.append(outs.pop())
    res.append(moves)
    return '\n'.join(map(str, res))


def gen_two_stacks(q=None):
    q = q or random.randint(1, SIZE)
    ops, size = [], 0
    for _ in range(q):
        if size and random.random() < 0.45:
            ops.append((2,))
            size -= 1
        else:
            ops.append((1, random.randint(1, 10**9)))
            size += 1
    return f"{len(ops)}\n" + '\n'.join(' '.join(map(str, o)) for o in ops) + '\n'


add('cx-c-two-stack-queue', 'A queue from two stacks', 'complexity', 'amortized-methods', 1400, ['amortized analysis', 'queue', 'stack'],
    '<p>Implement a FIFO queue with two stacks, <i>in</i> and <i>out</i>: <code>1 x</code> pushes x onto <i>in</i>; <code>2</code> dequeues — if <i>out</i> is empty, first move every element of <i>in</i> onto <i>out</i> (one at a time, popping from <i>in</i>), then pop from <i>out</i> and print the value. Every dequeue is valid.</p><p>After all operations, also print the total number of elements moved from <i>in</i> to <i>out</i>. Each element moves at most once, so dequeue is amortized O(1).</p>',
    '<p>First line q (1 ≤ q ≤ 2·10<sup>5</sup>). Next q lines: <code>1 x</code> or <code>2</code>.</p>', '<p>One line per dequeue, then one line with the total number of moves.</p>', sol_two_stacks,
    ["6\n1 10\n1 20\n2\n1 30\n2\n2\n"], ["1\n1 5\n", "2\n1 9\n2\n"], gen_two_stacks, large=lambda: gen_two_stacks(20000))


# ── expected running time ──
_H = []


def _harm(n):
    if not _H:
        h = [0] * (10**6 + 1)
        inv = [0, 1] + [0] * (10**6 - 1)
        for i in range(2, 10**6 + 1):
            inv[i] = (MOD - (MOD // i) * inv[MOD % i] % MOD) % MOD
        for i in range(1, 10**6 + 1):
            h[i] = (h[i - 1] + inv[i]) % MOD
        _H.append(h)
    return _H[0][n]


def sol_records(s):
    return '\n'.join(str(_harm(n)) for (n,) in each_query(s))


def sol_coupon(s):
    return '\n'.join(str(n % MOD * _harm(n) % MOD) for (n,) in each_query(s))


def sol_quick(s):
    return '\n'.join(str((2 * (n + 1) * _harm(n) - 4 * n) % MOD) for (n,) in each_query(s))


def _frac_mod(fr):
    return fr.numerator % MOD * pow(fr.denominator, MOD - 2, MOD) % MOD


def brute_records(s):
    from fractions import Fraction
    from itertools import permutations
    out = []
    for (n,) in each_query(s):
        tot = cnt = 0
        for p in permutations(range(n)):
            best = -1
            for x in p:
                if x > best:
                    best = x
                    tot += 1
            cnt += 1
        out.append(_frac_mod(Fraction(tot, cnt)))
    return '\n'.join(map(str, out))


def brute_quick(s):
    from fractions import Fraction

    @lru_cache(None)
    def E(n):
        if n <= 1:
            return Fraction(0)
        return n - 1 + Fraction(2, n) * sum(E(k) for k in range(n))
    return '\n'.join(str(_frac_mod(E(n))) for (n,) in each_query(s))


_check(sol_records, brute_records, lambda: qlines([random.randint(1, 6)]), rounds=20)
_check(sol_quick, brute_quick, lambda: qlines([random.randint(1, 40) for _ in range(3)]), rounds=20)
EXP_NOTE = '<p>An expected value here is a fraction P/Q. Print P · Q<sup>−1</sup> modulo 10<sup>9</sup> + 7, where Q<sup>−1</sup> is the modular inverse (Fermat: Q<sup>p−2</sup>). Precompute the inverses of 1…10<sup>6</sup> once — inv[i] = −⌊p/i⌋ · inv[p mod i] — and prefix sums of them.</p>'
add('cx-c-expected-records', 'Expected number of records', 'complexity', 'expected-analysis', 1600, ['probability', 'linearity of expectation', 'modular inverse'],
    '<p>A uniformly random permutation of 1…n is read left to right. An element is a <b>record</b> if it is larger than everything before it. What is the expected number of records?</p><p>Indicator variables: position i holds a record with probability 1/i (the maximum of the first i elements is equally likely to be anywhere among them), so the expectation is H<sub>n</sub> = 1 + 1/2 + … + 1/n.</p>' + EXP_NOTE,
    '<p>First line T (1 ≤ T ≤ 10<sup>5</sup>). Next T lines: n (1 ≤ n ≤ 10<sup>6</sup>).</p>', '<p>T lines.</p>', sol_records,
    [qlines([1, 2, 3])], [qlines([10**6, 999999, 4])],
    lambda: qlines([random.randint(1, 10**6) for _ in range(random.randint(1, 2000))]), n_rand=5)
add('cx-c-coupon', 'Coupon collector', 'complexity', 'expected-analysis', 1600, ['probability', 'expected value', 'modular inverse'],
    '<p>Each cereal box contains one of n coupon types, uniformly at random. What is the expected number of boxes you must open to collect all n types?</p><p>With k types already collected, a new type appears with probability (n − k)/n, so that phase takes n/(n − k) boxes on average. Summing over k gives n · H<sub>n</sub>.</p>' + EXP_NOTE,
    '<p>First line T (1 ≤ T ≤ 10<sup>5</sup>). Next T lines: n (1 ≤ n ≤ 10<sup>6</sup>).</p>', '<p>T lines.</p>', sol_coupon,
    [qlines([1, 2, 3])], [qlines([10**6, 6])],
    lambda: qlines([random.randint(1, 10**6) for _ in range(random.randint(1, 2000))]), n_rand=5)


# ── recurrences ──
def sol_rec_eval(s):
    out = []
    for a, b, n in each_query(s):
        chain = []
        while n > 0:
            chain.append(n)
            n //= b
        t = 0
        for m in reversed(chain):
            t = (a * t + m) % MOD
        out.append(t)
    return '\n'.join(map(str, out))


def brute_rec_eval(s):
    out = []
    for a, b, n in each_query(s):
        @lru_cache(None)
        def T(m):
            return 0 if m == 0 else a * T(m // b) + m
        out.append(T(n) % MOD)
    return '\n'.join(map(str, out))


_check(sol_rec_eval, brute_rec_eval, lambda: qlines([(random.randint(1, 9), random.randint(2, 5), random.randint(0, 10**6)) for _ in range(4)]))
add('cx-c-recurrence-eval', 'Evaluate a divide-and-conquer recurrence', 'complexity', 'recurrences', 1300, ['recurrences', 'modular arithmetic'],
    '<p>T(0) = 0 and T(n) = a · T(⌊n / b⌋) + n for n ≥ 1. For each query print T(n) modulo 10<sup>9</sup> + 7.</p><p>There is only one recursive call per level, so the recursion visits just log<sub>b</sub> n values — evaluate the chain n, ⌊n/b⌋, ⌊n/b²⌋, … from the bottom up.</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: a b n (1 ≤ a ≤ 10<sup>9</sup>, 2 ≤ b ≤ 10<sup>9</sup>, 0 ≤ n ≤ 10<sup>18</sup>).</p>', '<p>T lines.</p>', sol_rec_eval,
    [qlines([(2, 2, 8), (1, 2, 10), (3, 3, 1)])], [qlines([(1, 2, 0), (10**9, 2, 10**18), (5, 10**9, 10**18)])],
    lambda: qlines([(random.randint(1, 10**9), random.randint(2, 20), random.randint(0, 10**18)) for _ in range(random.randint(1, 1000))]), n_rand=5)


def sol_two_branch(s):
    memo = {0: 0}

    def T(n):
        stack = [n]
        while stack:
            m = stack[-1]
            if m in memo:
                stack.pop()
                continue
            x, y = m // 2, m // 3
            if x in memo and y in memo:
                memo[m] = memo[x] + memo[y] + 1
                stack.pop()
            else:
                if x not in memo:
                    stack.append(x)
                if y not in memo:
                    stack.append(y)
        return memo[n]
    return '\n'.join(str(T(n)) for (n,) in each_query(s))


def brute_two_branch(s):
    @lru_cache(None)
    def T(n):
        return 0 if n == 0 else T(n // 2) + T(n // 3) + 1
    return '\n'.join(str(T(n)) for (n,) in each_query(s))


_check(sol_two_branch, brute_two_branch, lambda: qlines([random.randint(0, 10**12) for _ in range(5)]))
add('cx-c-two-branch', 'Two unequal branches, memoised', 'complexity', 'recurrence-methods', 1600, ['recurrences', 'memoisation', 'hash map'],
    '<p>T(0) = 0 and T(n) = T(⌊n/2⌋) + T(⌊n/3⌋) + 1. For each query print T(n) exactly.</p><p>Plain recursion branches twice per call and is far too slow for n = 10<sup>18</sup>. But every value reached has the form ⌊n / (2<sup>i</sup>3<sup>j</sup>)⌋ — only O(log² n) distinct arguments. Memoise them in a hash map.</p>',
    '<p>First line T (1 ≤ T ≤ 100). Next T lines: n (0 ≤ n ≤ 10<sup>18</sup>).</p>', '<p>T lines (each answer fits in a signed 64-bit integer).</p>', sol_two_branch,
    [qlines([0, 1, 6, 100])], [qlines([10**18, 2, 3])],
    lambda: qlines([random.choice([random.randint(0, 10**18), random.randint(0, 1000)]) for _ in range(random.randint(1, 100))]), n_rand=5)


def sol_fib_calls(s):
    out = []
    for (n,) in each_query(s):
        a, b = 0, 1                       # F(0), F(1)
        for _ in range(n + 1):
            a, b = b, a + b               # a = F(n + 1) after the loop
        out.append(2 * a - 1)
    return '\n'.join(map(str, out))


def brute_fib_calls(s):
    out = []
    for (n,) in each_query(s):
        calls = [0]

        def fib(k):
            calls[0] += 1
            return k if k < 2 else fib(k - 1) + fib(k - 2)
        fib(n)
        out.append(calls[0])
    return '\n'.join(map(str, out))


_check(sol_fib_calls, brute_fib_calls, lambda: qlines([random.randint(0, 18) for _ in range(3)]), rounds=30)
add('cx-c-fib-calls', 'How many calls does naive Fibonacci make?', 'complexity', 'recurrences', 1400, ['recurrences', 'recursion tree'],
    '<p>This function is called once:</p><pre>fib(k): if k &lt; 2 return k\n        return fib(k − 1) + fib(k − 2)</pre><p>How many calls are made in total (including the first) for fib(n)?</p><p>The call count satisfies C(k) = 1 + C(k − 1) + C(k − 2) with C(0) = C(1) = 1. Prove that C(n) = 2F(n + 1) − 1 and compute it in O(n) — the naive function itself would need ~10<sup>17</sup> calls.</p>',
    '<p>First line T (1 ≤ T ≤ 100). Next T lines: n (0 ≤ n ≤ 85).</p>', '<p>T lines.</p>', sol_fib_calls,
    [qlines([0, 1, 2, 5])], [qlines([85, 84, 30])],
    lambda: qlines([random.randint(0, 85) for _ in range(random.randint(1, 100))]), n_rand=5)


# ── recursive algorithms ──
def sol_kara(s):
    return '\n'.join(str(pow(3, (n - 1).bit_length(), MOD)) for (n,) in each_query(s))


add('cx-c-karatsuba-leaves', 'Karatsuba’s base cases', 'complexity', 'recursive-algorithms', 1300, ['divide and conquer', 'logarithms', 'fast power'],
    '<p>Karatsuba pads two n-digit numbers to 2<sup>k</sup> digits (the smallest power of two ≥ n) and splits in half until single digits remain, making 3 recursive products per call. How many single-digit multiplications happen at the leaves? Print the count modulo 10<sup>9</sup> + 7.</p><p>The answer is 3<sup>k</sup> with k = ⌈log₂ n⌉ — compute k exactly with integer operations and the power by fast exponentiation.</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: n (1 ≤ n ≤ 10<sup>18</sup>).</p>', '<p>T lines.</p>', sol_kara,
    [qlines([1, 2, 3, 64])], [qlines([2**59, 2**59 + 1, 10**18, 4, 5])],
    lambda: qlines([random.choice([random.randint(1, 1000), random.randint(1, 10**18), 2 ** random.randint(0, 59)]) for _ in range(random.randint(1, 1000))]), n_rand=5)
add('cx-c-quicksort-expected', 'Expected comparisons of quicksort', 'complexity', 'recursive-algorithms', 1700, ['probability', 'quicksort', 'modular inverse'],
    '<p>Randomized quicksort picks a uniformly random pivot, compares it with every other element of the subarray, and recurses on both sides. Print the expected number of comparisons for n distinct values.</p><p>Summing 2/(j − i + 1) over all pairs gives 2(n + 1)H<sub>n</sub> − 4n.</p>' + EXP_NOTE,
    '<p>First line T (1 ≤ T ≤ 10<sup>5</sup>). Next T lines: n (1 ≤ n ≤ 10<sup>6</sup>).</p>', '<p>T lines.</p>', sol_quick,
    [qlines([1, 2, 3])], [qlines([10**6, 4, 5])],
    lambda: qlines([random.randint(1, 10**6) for _ in range(random.randint(1, 2000))]), n_rand=5)


# ── lower bounds ──
def sol_minmax(s):
    n, a = read_arr(s)
    return f"{min(a)} {max(a)} {(3 * n + 1) // 2 - 2}"


add('cx-c-min-max-count', 'Min, max and the comparisons it takes', 'complexity', 'lower-bounds', 1200, ['lower bounds', 'pairs'],
    '<p>Print the minimum, the maximum, and the number of comparisons the optimal pairing algorithm makes on n elements: ⌈3n/2⌉ − 2.</p><p>Implement the pairing method itself (compare inside pairs, winners challenge the max, losers the min) and make it count — then check that the count matches the formula.</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>).</p>', '<p>Three integers: min, max, comparisons.</p>', sol_minmax,
    [arr_input([7, 3, 9, 1, 6, 8, 2, 5]), arr_input([4, 2, 9])], [arr_input([5]), arr_input([2, 1]), arr_input([-10**9, 10**9, 0])],
    lambda: arr_input([random.randint(-10**9, 10**9) for _ in range(random.randint(1, SIZE))]), large=lambda: arr_input([random.randint(-10**9, 10**9) for _ in range(20001)]))


def sol_second_lb(s):
    n, a = read_arr(s)
    return f"{sorted(a)[-2]} {n + (n - 1).bit_length() - 2}"


add('cx-c-second-largest', 'The runner-up and its lower bound', 'complexity', 'lower-bounds', 1400, ['lower bounds', 'tournament'],
    '<p>The values are distinct. Print the second largest value, and the minimum worst-case number of comparisons needed to find the largest and second largest: n + ⌈log₂ n⌉ − 2.</p><p>A knockout tournament finds the champion in n − 1 comparisons; the runner-up lost directly to the champion, who played ⌈log₂ n⌉ matches — a second mini-tournament among those finishes the job.</p>',
    '<p>First line n (2 ≤ n ≤ 2·10<sup>5</sup>). Second line n distinct integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>).</p>', '<p>Two integers.</p>', sol_second_lb,
    [arr_input([5, 9, 2, 7]), arr_input([1, 2])], [arr_input([2, 1]), arr_input(list(range(64))), arr_input(list(range(65)))],
    lambda: arr_input(random.sample(range(-10**9, 10**9), random.randint(2, SIZE))), large=lambda: arr_input(random.sample(range(-10**9, 10**9), 20000)))


# ── hard problems ──
def sol_subset_count(s):
    v = ints(s)
    n, T = v[0], v[1]
    a = v[2:2 + n]
    sums = Counter({0: 1})
    for x in a:
        nxt = Counter(sums)
        for k, c in sums.items():
            nxt[k + x] += c
        sums = nxt
    return str(sums[T])


def brute_subset_count(s):
    v = ints(s)
    n, T = v[0], v[1]
    a = v[2:2 + n]
    return str(sum(1 for m in range(1 << n) if sum(a[i] for i in range(n) if m >> i & 1) == T))


_check(sol_subset_count, brute_subset_count, lambda: arr_input([random.randint(1, 6) for _ in range(random.randint(1, 10))], extra_before=str(random.randint(0, 20))))


def gen_subset(n, big=10**9):
    a = [random.randint(1, big) for _ in range(n)]
    pick = [x for x in a if random.random() < 0.5]
    return arr_input(a, extra_before=str(sum(pick) if random.random() < 0.8 else random.randint(0, sum(a))))


add('cx-c-subset-count', 'Count the subsets (n ≤ 20)', 'complexity', 'hard-problems', 1300, ['bitmask', 'brute force', 'subset sum'],
    '<p>Count the subsets of the n items (including the empty subset) whose values sum to exactly T.</p><p>Subset sum is NP-complete, but n ≤ 20 means only 2<sup>20</sup> ≈ 10<sup>6</sup> subsets: enumerate them as bitmasks.</p>',
    '<p>First line n and T (1 ≤ n ≤ 20, 0 ≤ T ≤ 2·10<sup>10</sup>). Second line n integers (1 ≤ a<sub>i</sub> ≤ 10<sup>9</sup>).</p>', '<p>One integer.</p>', sol_subset_count,
    [arr_input([3, 5, 6, 7], extra_before='13'), arr_input([1, 1, 1], extra_before='2')],
    [arr_input([5], extra_before='0'), arr_input([5], extra_before='5'), arr_input([1] * 20, extra_before='10')],
    lambda: gen_subset(random.randint(1, 20)), n_rand=6)


def sol_mitm(s):
    v = ints(s)
    n, T = v[0], v[1]
    a = v[2:2 + n]

    def all_sums(part):
        sums = [0]
        for x in part:
            sums += [y + x for y in sums]
        return sums
    L, R = all_sums(a[:n // 2]), sorted(all_sums(a[n // 2:]))
    return str(sum(bisect_right(R, T - x) - bisect_left(R, T - x) for x in L))


_check(sol_mitm, sol_subset_count, lambda: arr_input([random.randint(1, 8) for _ in range(random.randint(1, 12))], extra_before=str(random.randint(0, 30))))
add('cx-c-subset-mitm', 'Count the subsets (n ≤ 40)', 'complexity', 'hard-problems', 1800, ['meet in the middle', 'subset sum', 'binary search'],
    '<p>Count the subsets of the n items (including the empty one) whose values sum to exactly T.</p><p>2<sup>40</sup> ≈ 10<sup>12</sup> subsets is too many, and the values are too large for a DP over sums. <b>Meet in the middle</b>: list the 2<sup>20</sup> subset sums of each half, sort one list, and for each sum s of the other half count how many entries equal T − s.</p>',
    '<p>First line n and T (1 ≤ n ≤ 40, 0 ≤ T ≤ 4·10<sup>13</sup>). Second line n integers (1 ≤ a<sub>i</sub> ≤ 10<sup>12</sup>).</p>', '<p>One integer (up to 2<sup>40</sup>).</p>', sol_mitm,
    [arr_input([3, 5, 6, 7], extra_before='13'), arr_input([2, 2, 2, 2], extra_before='4')],
    [arr_input([1] * 40, extra_before='20'), arr_input([10**12] * 3, extra_before=str(2 * 10**12))],
    lambda: gen_subset(random.randint(1, 40), 10**12), n_rand=5, large=lambda: gen_subset(40, 10**12))


def sol_knap_w(s):
    L = lines_of(s)
    n, W = map(int, L[0].split())
    best = [0] * (W + 1)
    for line in L[1:1 + n]:
        w, val = map(int, line.split())
        for c in range(W, w - 1, -1):
            if best[c - w] + val > best[c]:
                best[c] = best[c - w] + val
    return str(best[W])


def brute_knap(s):
    L = lines_of(s)
    n, W = map(int, L[0].split())
    items = [tuple(map(int, l.split())) for l in L[1:1 + n]]
    best = 0
    for m in range(1 << n):
        w = sum(items[i][0] for i in range(n) if m >> i & 1)
        if w <= W:
            best = max(best, sum(items[i][1] for i in range(n) if m >> i & 1))
    return str(best)


def gen_knap(n, W, wmax, vmax):
    items = [(random.randint(1, wmax), random.randint(1, vmax)) for _ in range(n)]
    return f"{n} {W}\n" + '\n'.join(f"{w} {v}" for w, v in items) + '\n'


_check(sol_knap_w, brute_knap, lambda: gen_knap(random.randint(1, 10), random.randint(1, 30), 12, 20))
add('cx-c-knapsack-weight', '0/1 knapsack, small capacity', 'complexity', 'hard-problems', 1500, ['dynamic programming', 'knapsack', 'pseudo-polynomial'],
    '<p>n items have weights w<sub>i</sub> and values v<sub>i</sub>. Choose a subset with total weight ≤ W and the largest total value. Print that value.</p><p>W ≤ 2·10<sup>4</sup>: the O(n·W) table over capacities is fast. (It is pseudo-polynomial — fine here because W is small.)</p>',
    '<p>First line n W (1 ≤ n ≤ 100, 1 ≤ W ≤ 2·10<sup>4</sup>). Next n lines: w<sub>i</sub> v<sub>i</sub> (1 ≤ w<sub>i</sub> ≤ 2·10<sup>4</sup>, 1 ≤ v<sub>i</sub> ≤ 10<sup>9</sup>).</p>', '<p>One integer.</p>', sol_knap_w,
    ["4 7\n2 3\n3 4\n4 5\n5 6\n"], ["1 1\n2 100\n", "3 10\n10 1\n10 2\n10 3\n"],
    lambda: gen_knap(random.randint(1, 100), random.randint(1, 20000), random.choice([100, 20000]), 10**9), n_rand=5,
    large=lambda: gen_knap(100, 20000, 2000, 10**9))


def sol_knap_v(s):
    L = lines_of(s)
    n, W = map(int, L[0].split())
    items = [tuple(map(int, l.split())) for l in L[1:1 + n]]
    V = sum(v for _, v in items)
    INF = float('inf')
    mw = [0] + [INF] * V                           # min weight for each exact value
    for w, v in items:
        for t in range(V, v - 1, -1):
            if mw[t - v] + w < mw[t]:
                mw[t] = mw[t - v] + w
    return str(max(t for t in range(V + 1) if mw[t] <= W))


_check(sol_knap_v, brute_knap, lambda: gen_knap(random.randint(1, 10), random.randint(1, 40), 15, 9))
add('cx-c-knapsack-value', '0/1 knapsack, huge capacity', 'complexity', 'hard-problems', 1800, ['dynamic programming', 'knapsack', 'change of state'],
    '<p>Same knapsack, but now weights and the capacity go up to 10<sup>9</sup> — a table over capacities is impossible. The values, however, are small.</p><p>Swap the roles: let best[t] be the <b>minimum weight</b> needed to reach total value exactly t. The table has Σv ≤ 2·10<sup>4</sup> columns; the answer is the largest t with best[t] ≤ W.</p>',
    '<p>First line n W (1 ≤ n ≤ 100, 1 ≤ W ≤ 10<sup>9</sup>). Next n lines: w<sub>i</sub> v<sub>i</sub> (1 ≤ w<sub>i</sub> ≤ 10<sup>9</sup>, 1 ≤ v<sub>i</sub> ≤ 200).</p>', '<p>One integer.</p>', sol_knap_v,
    ["4 7\n2 3\n3 4\n4 5\n5 6\n", "3 1000000000\n1000000000 200\n1 1\n999999999 199\n"], ["1 1\n2 100\n"],
    lambda: gen_knap(random.randint(1, 100), random.randint(1, 10**9), 10**9, 200), n_rand=6)


# ── hidden costs ──
def sol_pop_front(s):
    L = lines_of(s)
    q, head, out = [], 0, []
    for line in L[1:1 + int(L[0])]:
        p = line.split()
        if p[0] == '1':
            q.append(p[1])
        else:
            out.append(q[head])
            head += 1
    return '\n'.join(out)


add('cx-c-pop-front', 'Removing from the front', 'complexity', 'hidden-costs', 1100, ['queue', 'hidden costs'],
    '<p>Process q operations on an empty sequence: <code>1 x</code> appends x at the back; <code>2</code> removes the front element and prints it (it is never empty).</p><p><code>list.pop(0)</code>, <code>shift()</code> and <code>erase(begin())</code> move every remaining element — Θ(n) each, Θ(q²) overall. Keep a head index instead (or a real deque).</p>',
    '<p>First line q (1 ≤ q ≤ 2·10<sup>5</sup>). Next q lines: <code>1 x</code> (1 ≤ x ≤ 10<sup>9</sup>) or <code>2</code>.</p>', '<p>One line per removal.</p>', sol_pop_front,
    ["5\n1 3\n1 4\n2\n1 5\n2\n"], ["2\n1 7\n2\n"],
    lambda: gen_two_stacks(random.randint(1, SIZE)), large=lambda: "20000\n" + "\n".join(["1 1000000000"] * 10000 + ["2"] * 10000) + "\n")


def sol_member(s):
    L = lines_of(s)
    have = set(L[1].split())
    return '\n'.join('YES' if x in have else 'NO' for x in L[3].split()[:int(L[2])])


add('cx-c-membership', 'Membership queries', 'complexity', 'hidden-costs', 1000, ['hashing', 'sorting', 'hidden costs'],
    '<p>Given n numbers and q queries, print YES if the query value is among the numbers and NO otherwise.</p><p><code>x in list</code> / <code>indexOf</code> / <code>std::find</code> is a hidden Θ(n) scan — Θ(nq) overall. Use a hash set (O(1) expected per query) or sort once and binary-search (O(log n)).</p>',
    '<p>Line 1: n. Line 2: n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>). Line 3: q. Line 4: q integers.</p>', '<p>q lines.</p>', sol_member,
    ["5\n4 -2 7 2 9\n4\n2 3 9 -2\n"], ["1\n0\n2\n0 1\n"], gen_lin_cost, large=lambda: gen_lin_cost(20000, 20000))


# ── Big-O ──
def sol_dominant(s):
    out = []
    for q in each_query(s):
        d, coeffs = q[0], q[1:]
        top = next(d - i for i, c in enumerate(coeffs) if c != 0)
        out.append('Theta(1)' if top == 0 else 'Theta(n)' if top == 1 else f'Theta(n^{top})')
    return '\n'.join(out)


def gen_dominant():
    out = []
    for _ in range(random.randint(1, 1000)):
        d = random.randint(0, 10)
        c = [random.choice([0, 0, random.randint(1, 10**9)]) for _ in range(d + 1)]
        if not any(c):
            c[random.randrange(d + 1)] = random.randint(1, 10**9)
        out.append(tuple([d] + c))
    return qlines(out)


add('cx-c-dominant-term', 'The dominant term', 'complexity', 'big-o', 900, ['asymptotics', 'big-o'],
    '<p>Each query is a polynomial c<sub>d</sub>n<sup>d</sup> + … + c<sub>1</sub>n + c<sub>0</sub> with non-negative coefficients, not all zero. Print its tight bound in the form <code>Theta(1)</code>, <code>Theta(n)</code> or <code>Theta(n^k)</code>.</p><p>Constants and lower-order terms do not matter — but a leading coefficient of 0 means that term is not there at all.</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Each next line: d followed by d + 1 coefficients c<sub>d</sub> … c<sub>0</sub> (0 ≤ d ≤ 10, 0 ≤ c ≤ 10<sup>9</sup>).</p>', '<p>T lines.</p>', sol_dominant,
    [qlines([(2, 3, 0, 7), (3, 0, 0, 5, 1), (0, 42)])], [qlines([(10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0), (1, 1000000000, 0)])],
    gen_dominant, n_rand=5)
