# Math judged problems, part 1 (exec'd by ../math.py)
# Pages: divisibility, gcd-lcm, extended-euclid, primes.
import math as _q1_m
import random as _q1_r
from fractions import Fraction as _q1_Frac

_Q1_T = 'math'


def _q1_check(fast, brute, gen, rounds=300):
    for _ in range(rounds):
        s = gen()
        a, b = fast(s), brute(s)
        assert a == b, (s, a, b)


def _q1_qlines(vals):
    """T, then one query per line (each query may be a tuple)."""
    return f"{len(vals)}\n" + '\n'.join(' '.join(map(str, v)) if isinstance(v, tuple) else str(v) for v in vals) + '\n'


def _q1_each(s):
    L = s.strip().split('\n')
    return [tuple(map(int, l.split())) for l in L[1:1 + int(L[0])]]


def _q1_ext(a, b):
    """Iterative extended Euclid: returns (g, x, y) with a·x + b·y = g."""
    x0, y0, x1, y1 = 1, 0, 0, 1
    while b:
        q = a // b
        a, b = b, a - q * b
        x0, x1 = x1, x0 - q * x1
        y0, y1 = y1, y0 - q * y1
    return a, x0, y0


_Q1_TQ = '<p>First line T, the number of queries. Next T lines: one query each.</p>'

# ═══════════════════════════ divisibility ═══════════════════════════


def _q1_sol_multiples(s):
    return '\n'.join(str(R // k - (L - 1) // k) for L, R, k in _q1_each(s))


_q1_check(_q1_sol_multiples,
          lambda s: '\n'.join(str(sum(1 for x in range(L, R + 1) if x % k == 0)) for L, R, k in _q1_each(s)),
          lambda: _q1_qlines([(lambda L: (L, L + _q1_r.randint(0, 60), _q1_r.randint(1, 25)))(_q1_r.randint(-80, 80)) for _ in range(6)]))


def _q1_gen_multiples():
    out = []
    for _ in range(_q1_r.randint(1, 800)):
        t = _q1_r.random()
        if t < 0.3:
            L = _q1_r.randint(-10**18, 10**18); R = _q1_r.randint(L, 10**18)
        elif t < 0.6:
            L = _q1_r.randint(-1000, 1000); R = L + _q1_r.randint(0, 2000)
        else:
            L = _q1_r.randint(-10**18, 0); R = _q1_r.randint(0, 10**18)
        k = _q1_r.choice([_q1_r.randint(1, 10), _q1_r.randint(1, 10**9), _q1_r.randint(1, 10**18)])
        out.append((L, R, k))
    return _q1_qlines(out)


add('math-c-multiples-range', 'Multiples in a range', _Q1_T, 'divisibility', 900, ['math', 'divisibility', 'floor division'],
    '<p>For each query, count the integers x with L ≤ x ≤ R that are divisible by k. The range may contain negative numbers and zero (0 is divisible by every k).</p>'
    '<p>The range can hold 2·10<sup>18</sup> numbers, so you cannot walk it. Use ⌊R/k⌋ − ⌊(L − 1)/k⌋ — but with <b>floor</b> division: in C, C++, Java and JavaScript, <code>/</code> rounds toward zero, which is wrong for negative numerators.</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>4</sup>). Next T lines: L R k (−10<sup>18</sup> ≤ L ≤ R ≤ 10<sup>18</sup>, 1 ≤ k ≤ 10<sup>18</sup>).</p>',
    '<p>T lines, one count each.</p>', _q1_sol_multiples,
    [_q1_qlines([(1, 10, 3), (-7, 7, 2), (-10, -1, 4)])],
    [_q1_qlines([(0, 0, 5), (-1, -1, 1), (5, 5, 6), (-6, -6, 3), (-10**18, 10**18, 1), (-10**18, 10**18, 10**18), (-10**18, -10**18, 7), (1, 10**18, 2)]),
     _q1_qlines([(-3, 3, 10**18), (-999999999999999999, 999999999999999999, 10**18), (-10**18 + 1, -1, 3)])],
    _q1_gen_multiples, n_rand=5)


def _q1_sol_mod911(s):
    L = s.strip().split('\n')
    out = []
    for d in L[1:1 + int(L[0])]:
        d = d.strip()
        r9 = sum(map(int, d)) % 9
        alt = 0
        for i, ch in enumerate(reversed(d)):   # weight +1, −1, +1, … from the units digit
            alt += int(ch) if i % 2 == 0 else -int(ch)
        out.append(f"{r9} {alt % 11}")
    return '\n'.join(out)


def _q1_gen_digits(n):
    return str(_q1_r.randint(1, 9)) + ''.join(_q1_r.choice('0123456789') for _ in range(n - 1))


_q1_check(_q1_sol_mod911, lambda s: '\n'.join(f"{int(d) % 9} {int(d) % 11}" for d in s.split()[1:]),
          lambda: _q1_qlines([_q1_gen_digits(_q1_r.randint(1, 40)) for _ in range(5)] + ['0']))

add('math-c-mod-9-11', 'Remainders by 9 and 11', _Q1_T, 'divisibility', 1000, ['math', 'divisibility', 'strings'],
    '<p>Each query is a non-negative integer N written in decimal — possibly with up to 10<sup>5</sup> digits. Print N mod 9 and N mod 11.</p>'
    '<p>N does not fit in any machine integer. Use the divisibility rules: since 10 ≡ 1 (mod 9), N is congruent to its digit sum mod 9; since 10 ≡ −1 (mod 11), N is congruent to the <b>alternating</b> digit sum taken from the units digit (+, −, +, …) mod 11. Keep the alternating sum non-negative before printing.</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: N, without leading zeros (N = 0 is written as <code>0</code>). The total number of digits is at most 2·10<sup>5</sup>.</p>',
    '<p>T lines: N mod 9 and N mod 11, separated by a space.</p>', _q1_sol_mod911,
    [_q1_qlines(['1234', '121', '99999999999999999999'])],
    [_q1_qlines(['0', '9', '10', '11', '100', '1000000000000000000000']), _q1_qlines(['9' * 1001, '1' + '0' * 1999, '10' * 500])],
    lambda: _q1_qlines([_q1_gen_digits(_q1_r.choice([_q1_r.randint(1, 30), _q1_r.randint(1, 3000)])) for _ in range(_q1_r.randint(1, 30))]),
    n_rand=4, large=lambda: _q1_qlines([_q1_gen_digits(100000)]))


def _q1_sol_subdiv(s):
    v = list(map(int, s.split()))
    n, k = v[0], v[1]
    seen = {0: 1}
    p = total = 0
    for x in v[2:2 + n]:
        p = (p + x) % k                       # Python % is already non-negative
        total += seen.get(p, 0)
        seen[p] = seen.get(p, 0) + 1
    return str(total)


def _q1_brute_subdiv(s):
    v = list(map(int, s.split()))
    n, k, a = v[0], v[1], v[2:2 + v[0]]
    return str(sum(1 for i in range(n) for j in range(i, n) if sum(a[i:j + 1]) % k == 0))


def _q1_gen_subdiv(n=None, lo=-10**9, hi=10**9, kmax=None):
    n = n or _q1_r.randint(1, 1000)
    k = _q1_r.randint(1, kmax or _q1_r.choice([5, 50, 10**9]))
    a = [_q1_r.randint(lo, hi) for _ in range(n)]
    return f"{n} {k}\n{' '.join(map(str, a))}\n"


_q1_check(_q1_sol_subdiv, _q1_brute_subdiv, lambda: _q1_gen_subdiv(_q1_r.randint(1, 12), -20, 20, 7))

add('math-c-subarray-div-k', 'Subarrays divisible by k', _Q1_T, 'divisibility', 1400, ['math', 'prefix sums', 'hashing'],
    '<p>Count the non-empty contiguous subarrays a<sub>i</sub>, …, a<sub>j</sub> whose sum is divisible by k. Values may be negative.</p>'
    '<p>Checking all O(n²) subarrays is too slow for n = 2·10<sup>5</sup>. A subarray sum is a difference of two prefix sums, and k divides P<sub>j</sub> − P<sub>i</sub> exactly when P<sub>i</sub> ≡ P<sub>j</sub> (mod k). Watch out: <code>%</code> of a negative number is negative in most languages. The answer can exceed 32 bits.</p>',
    '<p>First line n and k (1 ≤ n ≤ 2·10<sup>5</sup>, 1 ≤ k ≤ 10<sup>9</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>).</p>',
    '<p>One integer: the number of subarrays.</p>', _q1_sol_subdiv,
    ["6 5\n4 5 0 -2 -3 1\n", "3 3\n1 2 3\n"],
    ["1 7\n7\n", "1 7\n-3\n", "4 1\n5 -5 3 9\n", "5 2\n0 0 0 0 0\n", "3 1000000000\n1000000000 -1000000000 999999999\n", "4 3\n-1 -1 -1 -1\n"],
    _q1_gen_subdiv, n_rand=5, large=lambda: _q1_gen_subdiv(50000, -99, 99, 37))

# ═══════════════════════════ gcd-lcm ═══════════════════════════


def _q1_sol_frac(s):
    out = []
    for p, q in _q1_each(s):
        g = _q1_m.gcd(p, q)                    # gcd of absolute values, > 0 because q ≠ 0
        p, q = p // g, q // g
        if q < 0:
            p, q = -p, -q
        out.append(f"{p}/{q}")
    return '\n'.join(out)


_q1_check(_q1_sol_frac, lambda s: '\n'.join(f"{f.numerator}/{f.denominator}" for f in (_q1_Frac(p, q) for p, q in _q1_each(s))),
          lambda: _q1_qlines([(_q1_r.randint(-60, 60), _q1_r.choice([-1, 1]) * _q1_r.randint(1, 60)) for _ in range(6)]))


def _q1_gen_frac():
    out = []
    for _ in range(_q1_r.randint(1, 800)):
        g = _q1_r.choice([1, _q1_r.randint(1, 10**6), _q1_r.randint(1, 10**9)])
        p = _q1_r.randint(-10**18 // g, 10**18 // g) * g
        q = _q1_r.choice([-1, 1]) * max(1, _q1_r.randint(1, 10**18 // g)) * g
        out.append((p, q))
    return _q1_qlines(out)


add('math-c-reduce-fraction', 'Reduce a fraction', _Q1_T, 'gcd-lcm', 900, ['math', 'gcd'],
    '<p>For each query p/q, print the same fraction in lowest terms as <code>p/q</code>, where the denominator is positive and gcd(|p|, q) = 1. Zero is written <code>0/1</code>.</p>'
    '<p>Divide both parts by g = gcd(|p|, |q|) using Euclid’s algorithm (O(log) steps — trying every divisor would never finish for 10<sup>18</sup>), then move the sign to the numerator.</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>4</sup>). Next T lines: p q (|p|, |q| ≤ 10<sup>18</sup>, q ≠ 0).</p>',
    '<p>T lines, each a reduced fraction <code>p/q</code>.</p>', _q1_sol_frac,
    [_q1_qlines([(6, 8), (-10, -4), (3, -9), (0, -5)])],
    [_q1_qlines([(0, 1), (1, 1), (-1, -1), (7, 7), (10**18, 10**18), (-10**18, 10**18), (10**18, -999999999999999999), (999999999999999989, 1)]),
     _q1_qlines([(2**59, 2**40), (-(3**37), 3**20 * 2), (1, -10**18)])],
    _q1_gen_frac, n_rand=5)


_Q1_CAP = 10**18


def _q1_sol_gcdlcm(s):
    v = list(map(int, s.split()))
    a = v[1:1 + v[0]]
    g, l = 0, 1
    for x in a:
        g = _q1_m.gcd(g, x)
        if l != -1:
            q = l // _q1_m.gcd(l, x)
            l = -1 if q > _Q1_CAP // x else q * x     # overflow test without multiplying
    return f"{g}\n{l}"


def _q1_brute_gcdlcm(s):
    v = list(map(int, s.split()))
    a = v[1:1 + v[0]]
    g, l = 0, 1
    for x in a:
        g = _q1_m.gcd(g, x)
        l = l * x // _q1_m.gcd(l, x)
    return f"{g}\n{l if l <= _Q1_CAP else -1}"


def _q1_gen_gcdlcm(n=None):
    n = n or _q1_r.randint(1, 1000)
    t = _q1_r.random()
    if t < 0.3:
        base = _q1_r.randint(1, 1000)
        a = [base * _q1_r.choice([1, 2, 3, 4, 6, 12]) for _ in range(n)]
    elif t < 0.6:
        a = [_q1_r.choice([2, 3, 5, 7, 4, 8, 9, 16, 25, 27, 11, 13]) for _ in range(n)]
    else:
        a = [_q1_r.randint(1, 10**9) for _ in range(n)]
    return f"{n}\n{' '.join(map(str, a))}\n"


_q1_check(_q1_sol_gcdlcm, _q1_brute_gcdlcm, lambda: _q1_gen_gcdlcm(_q1_r.randint(1, 15)))
_Q1_P2 = [2**i for i in range(30)]
add('math-c-array-gcd-lcm', 'GCD and LCM of an array', _Q1_T, 'gcd-lcm', 1300, ['math', 'gcd', 'overflow'],
    '<p>Print the gcd of all n numbers and their lcm. If the lcm is larger than 10<sup>18</sup>, print <code>-1</code> instead.</p>'
    '<p>Fold the array: gcd(g, x) and lcm(l, x) = l / gcd(l, x) · x. Divide <b>before</b> multiplying, and test for overflow before it happens: l′ · x &gt; 10<sup>18</sup> exactly when l′ &gt; ⌊10<sup>18</sup> / x⌋. Once the lcm passes the cap it can never come back down.</p>',
    N_SPEC + '<p>1 ≤ a<sub>i</sub> ≤ 10<sup>9</sup>.</p>',
    '<p>Two lines: the gcd, then the lcm or <code>-1</code>.</p>', _q1_sol_gcdlcm,
    ["3\n4 6 10\n", "3\n1000000000 999999999 999999998\n"],
    ["1\n1\n", "1\n1000000000\n", "4\n7 7 7 7\n", "2\n1000000000 1000000000\n",
     arr_input(_Q1_P2), arr_input([10**9, 10**9 - 1, 7, 1]), arr_input([2**29 * 3, 2**29 * 5, 3 * 5 * 7, 2]),
     arr_input([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]), arr_input([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53]),
     arr_input([999999937, 999999929, 2])],
    _q1_gen_gcdlcm, n_rand=5, large=lambda: _q1_gen_gcdlcm(20000))


_Q1_AMAX = 10**5


def _q1_mobius(n):
    mu = [1] * (n + 1)
    is_comp = bytearray(n + 1)
    primes = []
    mu[0] = 0
    for i in range(2, n + 1):
        if not is_comp[i]:
            primes.append(i)
            mu[i] = -1
        for p in primes:
            if i * p > n:
                break
            is_comp[i * p] = 1
            if i % p == 0:
                mu[i * p] = 0
                break
            mu[i * p] = -mu[i]
    return mu


_Q1_MU = _q1_mobius(_Q1_AMAX)


def _q1_sol_coprime(s):
    v = list(map(int, s.split()))
    a = v[1:1 + v[0]]
    m = max(a)
    freq = [0] * (m + 1)
    for x in a:
        freq[x] += 1
    total = 0
    for d in range(1, m + 1):
        if _Q1_MU[d]:
            c = sum(freq[d::d])                 # how many a_i are multiples of d
            total += _Q1_MU[d] * (c * (c - 1) // 2)
    return str(total)


def _q1_brute_coprime(s):
    v = list(map(int, s.split()))
    a = v[1:1 + v[0]]
    return str(sum(1 for i in range(len(a)) for j in range(i + 1, len(a)) if _q1_m.gcd(a[i], a[j]) == 1))


def _q1_gen_coprime(n=None, hi=None):
    n = n or _q1_r.randint(1, 1000)
    hi = hi or _q1_r.choice([30, 1000, _Q1_AMAX])
    if _q1_r.random() < 0.3:
        a = [_q1_r.choice([2, 3, 6, 10, 15, 30, 1]) * _q1_r.randint(1, max(1, hi // 30)) for _ in range(n)]
    else:
        a = [_q1_r.randint(1, hi) for _ in range(n)]
    return f"{n}\n{' '.join(map(str, a))}\n"


_q1_check(_q1_sol_coprime, _q1_brute_coprime, lambda: _q1_gen_coprime(_q1_r.randint(1, 15), _q1_r.choice([10, 40, 300])), rounds=200)

add('math-c-coprime-array-pairs', 'Coprime pairs in an array', _Q1_T, 'gcd-lcm', 1900, ['math', 'gcd', 'möbius', 'inclusion-exclusion'],
    '<p>Count the pairs of positions i &lt; j with gcd(a<sub>i</sub>, a<sub>j</sub>) = 1. (gcd(1, 1) = 1, so two 1s form a coprime pair.)</p>'
    '<p>There are about 2·10<sup>10</sup> pairs for n = 2·10<sup>5</sup>, so calling gcd on each is too slow. Count from the other side: for each d, let c<sub>d</sub> be how many values are multiples of d; then C(c<sub>d</sub>, 2) pairs have d dividing their gcd. Inclusion–exclusion over d (the Möbius function) turns these counts into the number of pairs whose gcd is exactly 1. The answer can exceed 32 bits.</p>',
    N_SPEC + '<p>1 ≤ a<sub>i</sub> ≤ 10<sup>5</sup>.</p>',
    '<p>One integer: the number of coprime pairs.</p>', _q1_sol_coprime,
    ["4\n2 3 4 9\n", "3\n1 1 1\n"],
    ["1\n1\n", "1\n100000\n", "2\n6 10\n", "2\n100000 99999\n", "5\n7 7 7 7 7\n", "6\n2 4 8 16 32 64\n", "6\n1 2 3 4 5 6\n"],
    _q1_gen_coprime, n_rand=5, large=lambda: _q1_gen_coprime(30000, _Q1_AMAX))

# ═══════════════════════════ extended-euclid ═══════════════════════════


def _q1_min_x(a, b, c):
    """Smallest x ≥ 0 such that a·x + b·y = c for some integer y (a, b ≥ 1), or None."""
    g, xg, _ = _q1_ext(a, b)
    if c % g:
        return None
    m = b // g
    x = (xg % m) * ((c // g) % m) % m
    return x, (c - a * x) // b


def _q1_sol_minx(s):
    out = []
    for a, b, c in _q1_each(s):
        r = _q1_min_x(a, b, c)
        out.append('-1' if r is None else f"{r[0]} {r[1]}")
    return '\n'.join(out)


def _q1_brute_minx(s):
    out = []
    for a, b, c in _q1_each(s):
        for x in range(0, b + 1):
            if (c - a * x) % b == 0:
                out.append(f"{x} {(c - a * x) // b}")
                break
        else:
            out.append('-1')
    return '\n'.join(out)


def _q1_gen_abc(cmin, nq=None, big=True):
    out = []
    for _ in range(nq or _q1_r.randint(1, 600)):
        t = _q1_r.random()
        if t < 0.35 and big:
            g = _q1_r.randint(1, 1000)
            a = _q1_r.randint(1, 10**9 // g) * g
            b = _q1_r.randint(1, 10**9 // g) * g
            c = _q1_r.randint(cmin // g, 10**18 // g) * g
        elif t < 0.7 and big:
            a, b = _q1_r.randint(1, 10**9), _q1_r.randint(1, 10**9)
            c = _q1_r.randint(cmin, 10**18)
        else:
            a, b = _q1_r.randint(1, 1000), _q1_r.randint(1, 1000)
            c = _q1_r.randint(max(cmin, -10**6), 10**6)
        out.append((a, b, c))
    return _q1_qlines(out)


def _q1_gen_small_abc(cmin):
    return _q1_qlines([(_q1_r.randint(1, 30), _q1_r.randint(1, 30), _q1_r.randint(max(cmin, -200), 200)) for _ in range(6)])


_q1_check(_q1_sol_minx, _q1_brute_minx, lambda: _q1_gen_small_abc(-10**18))

add('math-c-dio-min-x', 'Smallest non-negative x', _Q1_T, 'extended-euclid', 1400, ['math', 'extended euclid', 'diophantine'],
    '<p>For each query, find integers x, y with a·x + b·y = c and x ≥ 0 as small as possible (y may be negative). Print x and y, or <code>-1</code> if there are no integer solutions.</p>'
    '<p>A solution exists exactly when g = gcd(a, b) divides c. Extended Euclid gives a·x′ + b·y′ = g; scale by c/g, then shift: all solutions are x + t·(b/g). Reduce x modulo b/g <b>before</b> multiplying, or x′ · (c/g) overflows 64 bits.</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>4</sup>). Next T lines: a b c (1 ≤ a, b ≤ 10<sup>9</sup>, |c| ≤ 10<sup>18</sup>).</p>',
    '<p>T lines: x y, or -1.</p>', _q1_sol_minx,
    [_q1_qlines([(3, 5, 7), (4, 6, 9), (6, 4, -10)])],
    [_q1_qlines([(1, 1, 0), (1, 1, -10**18), (7, 7, 14), (10**9, 1, 10**18), (1, 10**9, 10**18), (10**9, 999999999, -10**18), (999999937, 999999929, 1),
                 (10**9, 10**9, 10**18), (2, 4, 1), (10**9, 10**9, 999999999999999999), (5, 3, 0)])],
    lambda: _q1_gen_abc(-10**18), n_rand=5)


def _q1_sol_dcount(s):
    out = []
    for a, b, c in _q1_each(s):
        r = _q1_min_x(a, b, c)
        if r is None or r[1] < 0:
            out.append(0)
        else:
            out.append(r[1] // (a // _q1_m.gcd(a, b)) + 1)   # y steps down by a/g each time
    return '\n'.join(map(str, out))


_q1_check(_q1_sol_dcount,
          lambda s: '\n'.join(str(sum(1 for x in range(c // a + 1) if (c - a * x) % b == 0)) for a, b, c in _q1_each(s)),
          lambda: _q1_gen_small_abc(0))

add('math-c-dio-count', 'Count non-negative solutions', _Q1_T, 'extended-euclid', 1600, ['math', 'extended euclid', 'diophantine', 'counting'],
    '<p>You have unlimited coins worth a and worth b. In how many ways can you pay exactly c? That is: count the pairs of integers x ≥ 0, y ≥ 0 with a·x + b·y = c.</p>'
    '<p>Looping over x takes up to c/a = 10<sup>18</sup> steps. Instead, find the smallest x ≥ 0 that works (extended Euclid); its y is the largest possible. Every further solution adds b/g to x and subtracts a/g from y, so count how many steps keep y ≥ 0.</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>4</sup>). Next T lines: a b c (1 ≤ a, b ≤ 10<sup>9</sup>, 0 ≤ c ≤ 10<sup>18</sup>).</p>',
    '<p>T lines, one count each.</p>', _q1_sol_dcount,
    [_q1_qlines([(2, 3, 12), (4, 6, 9), (5, 7, 1)])],
    [_q1_qlines([(1, 1, 0), (1, 1, 10**18), (1, 2, 10**18), (7, 7, 49), (10**9, 10**9, 10**18), (10**9, 999999999, 10**18), (3, 5, 7),
                 (999999937, 999999929, 999999937 * 999999929), (2, 2, 999999999999999999), (6, 10, 2), (1000, 1, 999)])],
    lambda: _q1_gen_abc(0), n_rand=5)


def _q1_sol_bezout(s):
    out = []
    for a, b, c in _q1_each(s):
        r = _q1_min_x(a, b, c)
        if r is None:
            out.append('-1')
            continue
        x1, y1 = r
        g = _q1_m.gcd(a, b)
        m, n = b // g, a // g                  # x = x1 + k·m,  y = y1 − k·n
        q = y1 // n
        best = None
        for k in (-1, 0, q, q + 1):
            x, y = x1 + k * m, y1 - k * n
            key = (abs(x) + abs(y), x)
            if best is None or key < best:
                best = key
                ans = (x, y)
        out.append(f"{ans[0]} {ans[1]}")
    return '\n'.join(out)


def _q1_brute_bezout(s):
    out = []
    for a, b, c in _q1_each(s):
        best = None
        for x in range(-500, 501):
            if (c - a * x) % b == 0:
                y = (c - a * x) // b
                key = (abs(x) + abs(y), x)
                if best is None or key < best:
                    best = key
                    ans = (x, y)
        out.append('-1' if best is None else f"{ans[0]} {ans[1]}")
    return '\n'.join(out)


_q1_check(_q1_sol_bezout, _q1_brute_bezout, lambda: _q1_gen_small_abc(-10**18), rounds=200)

add('math-c-min-bezout', 'Smallest |x| + |y|', _Q1_T, 'extended-euclid', 1800, ['math', 'extended euclid', 'diophantine'],
    '<p>Among all integer solutions of a·x + b·y = c, print the one with the smallest |x| + |y|. If several tie, print the one with the smallest x. If there is no integer solution, print <code>-1</code>.</p>'
    '<p>All solutions are x = x<sub>0</sub> + k·(b/g), y = y<sub>0</sub> − k·(a/g). As a function of k, |x| + |y| is convex and piecewise linear, with corners where x or y crosses zero — so the best integer k sits next to one of those two corners. The raw extended-Euclid coefficients scaled by c/g can be about 10<sup>27</sup>: normalise first.</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>4</sup>). Next T lines: a b c (1 ≤ a, b ≤ 10<sup>9</sup>, |c| ≤ 10<sup>18</sup>).</p>',
    '<p>T lines: x y, or -1.</p>', _q1_sol_bezout,
    [_q1_qlines([(3, 5, 1), (2, 2, 6), (4, 6, 5)])],
    [_q1_qlines([(1, 1, 0), (1, 1, 1), (1, 1, -1), (1, 1, 10**18), (1, 1, -10**18), (10**9, 1, 10**18), (1, 10**9, -10**18),
                 (999999937, 999999929, 1), (999999937, 999999929, 10**18), (10**9, 999999999, -10**18), (3, 3, 3), (2, 3, 0), (5, 3, 4)])],
    lambda: _q1_gen_abc(-10**18), n_rand=5)

# ═══════════════════════════ primes ═══════════════════════════


def _q1_trial_prime(n):
    if n < 2:
        return False
    if n % 2 == 0:
        return n == 2
    d = 3
    while d * d <= n:
        if n % d == 0:
            return False
        d += 2
    return True


def _q1_sol_isprime(s):
    return '\n'.join('YES' if _q1_trial_prime(n) else 'NO' for (n,) in _q1_each(s))


_q1_check(_q1_sol_isprime, lambda s: '\n'.join('YES' if n >= 2 and all(n % d for d in range(2, n)) else 'NO' for (n,) in _q1_each(s)),
          lambda: _q1_qlines([_q1_r.randint(1, 400) for _ in range(10)]), rounds=50)

_Q1_BIGP = [999999937, 999999929, 999999893, 998244353, 31607 * 31627, 31601 * 31601]
add('math-c-is-prime', 'Is it prime?', _Q1_T, 'primes', 800, ['math', 'primes'],
    '<p>For each n, print <code>YES</code> if n is prime and <code>NO</code> otherwise. (1 is not prime.)</p>'
    '<p>Testing every divisor below n costs up to 10<sup>9</sup> steps per query. If n = d · e with d ≤ e then d ≤ √n, so it is enough to try divisors up to √n — about 31 623.</p>',
    '<p>First line T (1 ≤ T ≤ 100). Next T lines: n (1 ≤ n ≤ 10<sup>9</sup>).</p>',
    '<p>T lines: YES or NO.</p>', _q1_sol_isprime,
    [_q1_qlines([2, 15, 17, 1])],
    [_q1_qlines([1, 2, 3, 4, 9, 25, 49, 961, 999999937, 999999929, 1000000000, 31607 * 31627, 31601 * 31601, 999950884, 998244353])],
    lambda: _q1_qlines([_q1_r.choice([_q1_r.randint(1, 10**9), _q1_r.choice(_Q1_BIGP), _q1_r.randint(1, 100)]) for _ in range(100)]),
    n_rand=4)


def _q1_sieve(n):
    s = bytearray([1]) * (n + 1)
    s[0] = s[1] = 0
    for i in range(2, int(n ** 0.5) + 1):
        if s[i]:
            s[i * i::i] = bytearray(len(range(i * i, n + 1, i)))
    return [i for i in range(n + 1) if s[i]]


_Q1_PR = _q1_sieve(10**6)


def _q1_factor(n):
    f = []
    for p in _Q1_PR:
        if p * p > n:
            break
        if n % p == 0:
            e = 0
            while n % p == 0:
                n //= p
                e += 1
            f.append((p, e))
    if n > 1:
        f.append((n, 1))
    return f


def _q1_sol_factor(s):
    return '\n'.join(' '.join(f"{p}^{e}" for p, e in _q1_factor(n)) for (n,) in _q1_each(s))


def _q1_brute_factor(s):
    out = []
    for (n,) in _q1_each(s):
        f, d = [], 2
        while n > 1:
            e = 0
            while n % d == 0:
                n //= d
                e += 1
            if e:
                f.append(f"{d}^{e}")
            d += 1
        out.append(' '.join(f))
    return '\n'.join(out)


_q1_check(_q1_sol_factor, _q1_brute_factor, lambda: _q1_qlines([_q1_r.randint(2, 5000) for _ in range(10)]), rounds=50)

_Q1_P6 = [999983, 999979, 999961]
add('math-c-factorize', 'Prime factorisation', _Q1_T, 'primes', 1300, ['math', 'primes', 'factorisation'],
    '<p>Factor each n into primes. Print the factors in increasing order as <code>p^e</code>, separated by spaces (the exponent is always written, even when it is 1). Example: 360 → <code>2^3 3^2 5^1</code>.</p>'
    '<p>Trial division only has to go up to √n ≤ 10<sup>6</sup>: divide out each factor completely as you meet it, and whatever is left above 1 at the end is a single prime.</p>',
    '<p>First line T (1 ≤ T ≤ 20). Next T lines: n (2 ≤ n ≤ 10<sup>12</sup>).</p>',
    '<p>T lines, one factorisation each.</p>', _q1_sol_factor,
    [_q1_qlines([360, 97, 1000000000000])],
    [_q1_qlines([2, 4, 6, 999999999989, 999983 * 999979, 2**39, 3**25, 999983**2, 999961 * 2 * 3 * 5 * 7 * 11,
                 10**12 - 1, 963761198400, 999999000001, 2 * 499999999979])],
    lambda: _q1_qlines([_q1_r.choice([_q1_r.randint(2, 10**12), _q1_r.choice(_Q1_P6) * _q1_r.choice(_Q1_P6), _q1_r.randint(2, 10**6) * _q1_r.randint(1, 10**4)])
                        for _ in range(20)]), n_rand=4)


_Q1_MR_BASES = (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37)


def _q1_mr(n):
    if n < 2:
        return False
    for p in _Q1_MR_BASES:
        if n % p == 0:
            return n == p
    d, r = n - 1, 0
    while d % 2 == 0:
        d //= 2
        r += 1
    for a in _Q1_MR_BASES:
        x = pow(a, d, n)
        if x == 1 or x == n - 1:
            continue
        for _ in range(r - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True


assert all(_q1_mr(n) == _q1_trial_prime(n) for n in range(1, 20000))
assert all(_q1_mr(n) == _q1_trial_prime(n) for n in (_q1_r.randint(1, 10**11) for _ in range(300)))
assert all(_q1_mr(n) == _q1_trial_prime(n) for n in (561, 1105, 1729, 2047, 3215031751, 25326001, 3474749660383, 341550071728321))


def _q1_sol_mr(s):
    return '\n'.join('YES' if _q1_mr(n) else 'NO' for (n,) in _q1_each(s))


_Q1_MR_TRAPS = [3825123056546413051, 1122004669633, 2152302898747, 3474749660383, 341550071728321,
                3825123056546413051 - 2, 4 * 10**18, 4 * 10**18 - 1, 3999999999999999999, 2305843009213693951, 999999999999999989,
                1000000007 * 1000000009, 999999937 * 999999929, 2**61 - 1, 2**31 - 1, 2**61 + 1]
_Q1_MR_PRIMES = [p for p in [10**18 + 3, 10**18 + 9, 2**61 - 1, 999999999999999989, 4 * 10**18 - 49, 3 * 10**18 + 37, 1999999999999999949,
                             2305843009213693951, 3999999999999999959] if _q1_mr(p) and p <= 4 * 10**18]


def _q1_rand_prime(lo, hi):
    while True:
        x = _q1_r.randint(lo, hi) | 1
        if _q1_mr(x):
            return x


def _q1_gen_mr(nq=None):
    out = []
    for _ in range(nq or _q1_r.randint(1, 500)):
        t = _q1_r.random()
        if t < 0.3:
            out.append(_q1_rand_prime(10**17, 4 * 10**18))
        elif t < 0.55:
            p = _q1_rand_prime(10**8, 2 * 10**9)
            out.append(p * _q1_rand_prime(10**8, 4 * 10**18 // p))
        elif t < 0.65:
            p = _q1_rand_prime(10**5, 10**6)
            out.append(p * p * (1 if _q1_r.random() < 0.5 else p))
        else:
            out.append(_q1_r.randint(1, 4 * 10**18))
    return _q1_qlines(out)


add('math-c-miller-rabin', 'Primality up to 4·10¹⁸', _Q1_T, 'primes', 2000, ['math', 'primes', 'miller-rabin', 'modular arithmetic'],
    '<p>For each n, print <code>YES</code> if n is prime and <code>NO</code> otherwise.</p>'
    '<p>Trial division to √n ≈ 2·10<sup>9</sup> is far too slow. Use the Miller–Rabin test: write n − 1 = d · 2<sup>r</sup> and check each base a; a prime n always passes, and for n &lt; 3.3·10<sup>24</sup> the twelve bases 2, 3, 5, …, 37 catch every composite — no randomness needed. Fermat’s test alone is fooled by Carmichael numbers, and fewer bases are fooled by tricky inputs such as 3825123056546413051. The products of residues need 128-bit arithmetic (or a careful mulmod).</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: n (1 ≤ n ≤ 4·10<sup>18</sup>).</p>',
    '<p>T lines: YES or NO.</p>', _q1_sol_mr,
    [_q1_qlines([7, 561, 1000000000000000003, 999999999999999999])],
    [_q1_qlines([1, 2, 3, 4, 37, 41, 1369, 1105, 1729, 2047, 3215031751, 25326001] + _Q1_MR_TRAPS + _Q1_MR_PRIMES)],
    _q1_gen_mr, n_rand=4, large=lambda: _q1_qlines([_q1_rand_prime(10**18, 4 * 10**18) for _ in range(1000)]))
