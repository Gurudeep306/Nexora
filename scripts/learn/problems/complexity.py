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
