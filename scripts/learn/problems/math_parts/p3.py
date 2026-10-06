# Math judged problems, part 3 (exec'd by ../math.py)
# Pages: modular-inverse, crt, counting, pascal-binomial
import random as _q3_rnd
import math as _q3_pm
from fractions import Fraction as _q3_Fr
from itertools import permutations as _q3_perms

_q3_P = 10**9 + 7


def _q3_check(fast, brute, gen, rounds=200):
    for _ in range(rounds):
        s = gen()
        assert fast(s) == brute(s), (s, fast(s), brute(s))


def _q3_qlines(vals):
    """T, then one query per line (each query may be a tuple)."""
    return f"{len(vals)}\n" + '\n'.join(' '.join(map(str, v)) if isinstance(v, tuple) else str(v) for v in vals) + '\n'


def _q3_each(s):
    L = s.strip().split('\n')
    return [tuple(map(int, l.split())) for l in L[1:1 + int(L[0])]]


# shared factorial table mod P (grown lazily)
_q3_F = [1]
_q3_IF = [1]


def _q3_need(n):
    if len(_q3_F) > n:
        return
    m = max(n + 1, 2 * len(_q3_F))
    F = _q3_F
    for i in range(len(F), m):
        F.append(F[-1] * i % _q3_P)
    IF = [0] * m
    IF[m - 1] = pow(F[m - 1], _q3_P - 2, _q3_P)
    for i in range(m - 1, 0, -1):
        IF[i - 1] = IF[i] * i % _q3_P
    _q3_IF[:] = IF


def _q3_C(n, r):
    if r < 0 or n < 0 or r > n:
        return 0
    _q3_need(n)
    return _q3_F[n] * _q3_IF[r] % _q3_P * _q3_IF[n - r] % _q3_P


_q3_MAXQ = lambda s: max([max(q) for q in _q3_each(s)] + [0])


# ═══════════════════════ modular-inverse ═══════════════════════

# 1. modular inverse queries
def _q3_inv_or(a, m):
    try:
        return pow(a, -1, m)
    except ValueError:
        return -1


def _q3_sol_inverse(s):
    return '\n'.join(str(_q3_inv_or(a, m)) for a, m in _q3_each(s))


def _q3_brute_inverse(s):
    out = []
    for a, m in _q3_each(s):
        out.append(str(next((x for x in range(m) if a * x % m == 1 % m), -1)))
    return '\n'.join(out)


_q3_check(_q3_sol_inverse, _q3_brute_inverse,
          lambda: _q3_qlines([(_q3_rnd.randint(0, 60), _q3_rnd.randint(1, 60)) for _ in range(6)]))


def _q3_gen_inverse(T=None):
    T = T or _q3_rnd.randint(1, 700)
    q = []
    for _ in range(T):
        r = _q3_rnd.random()
        if r < 0.3:
            q.append((_q3_rnd.randint(0, 10**9), 999999937))
        elif r < 0.6:
            g = _q3_rnd.randint(2, 1000)
            q.append((g * _q3_rnd.randint(0, 10**6), g * _q3_rnd.randint(1, 10**6)))
        else:
            q.append((_q3_rnd.randint(0, 10**9), _q3_rnd.randint(1, 10**9)))
    return _q3_qlines(q)


add('math-c-mod-inverse', 'Modular inverse queries', 'math', 'modular-inverse', 1000, ['math', 'modular inverse', 'extended gcd'],
    '<p>For each query (a, m) print the modular inverse of a modulo m: the unique x with 0 ≤ x &lt; m and a·x ≡ 1 (mod m). If no such x exists, print <code>-1</code>.</p>'
    '<p>m is <b>not</b> necessarily prime, so Fermat\'s little theorem does not apply — an inverse exists exactly when gcd(a, m) = 1, and the extended Euclidean algorithm finds it. Note that modulo 1 every number is congruent to 0 and to 1, so the answer for m = 1 is 0.</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>5</sup>). Next T lines: a m (0 ≤ a ≤ 10<sup>9</sup>, 1 ≤ m ≤ 10<sup>9</sup>).</p>',
    '<p>T lines, each the inverse in [0, m) or -1.</p>', _q3_sol_inverse,
    [_q3_qlines([(3, 11), (10, 17), (6, 9), (7, 1)])],
    [_q3_qlines([(0, 1), (0, 7), (1, 2), (10**9, 10**9), (10**9, 999999999), (999999999, 10**9), (2, 4)]),
     _q3_qlines([(1, 10**9), (999999937, 999999937), (123456789, 999999937)])],
    _q3_gen_inverse, n_rand=5, large=lambda: _q3_gen_inverse(4500))


# 2. harmonic numbers mod p (linear inverses)
def _q3_sol_harm(s):
    qs = _q3_each(s)
    n = max(q[0] for q in qs)
    P = _q3_P
    inv = [0, 1] + [0] * (n - 1)
    for i in range(2, n + 1):
        inv[i] = (P - (P // i) * inv[P % i] % P) % P
    H = [0] * (n + 1)
    acc = 0
    for i in range(1, n + 1):
        acc += inv[i]
        if acc >= P:
            acc -= P
        H[i] = acc
    return '\n'.join(str(H[q[0]]) for q in qs)


def _q3_brute_harm(s):
    out = []
    for (n,) in _q3_each(s):
        h = sum(_q3_Fr(1, i) for i in range(1, n + 1))
        out.append(str(h.numerator % _q3_P * pow(h.denominator, -1, _q3_P) % _q3_P))
    return '\n'.join(out)


_q3_check(_q3_sol_harm, _q3_brute_harm, lambda: _q3_qlines([_q3_rnd.randint(1, 80) for _ in range(5)]), rounds=60)

add('math-c-harmonic-mod', 'Harmonic numbers modulo a prime', 'math', 'modular-inverse', 1300, ['math', 'modular inverse', 'precomputation'],
    '<p>The n-th harmonic number is H<sub>n</sub> = 1/1 + 1/2 + … + 1/n. Written as a reduced fraction P/Q, the denominator Q is never divisible by p = 10<sup>9</sup> + 7 for the n below, so H<sub>n</sub> has a well-defined value P·Q<sup>−1</sup> modulo p. Answer T queries.</p>'
    '<p>With up to 10<sup>5</sup> queries and n up to 10<sup>6</sup>, summing n Fermat inverses per query is far too slow, and even one fast power per i costs 30 multiplications. Every inverse 1…n can be found in O(n) total with the identity inv(i) = −⌊p/i⌋ · inv(p mod i) (mod p); then prefix sums answer each query in O(1).</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>5</sup>). Next T lines: n (1 ≤ n ≤ 10<sup>6</sup>).</p>',
    '<p>T lines: H<sub>n</sub> modulo 10<sup>9</sup> + 7.</p>', _q3_sol_harm,
    [_q3_qlines([1, 2, 3, 4])],
    [_q3_qlines([1]), _q3_qlines([1000000, 999999, 5, 1000000])],
    lambda: _q3_qlines([_q3_rnd.randint(1, _q3_rnd.choice([100, 10**4, 10**6])) for _ in range(_q3_rnd.randint(1, 600))]),
    n_rand=5, large=lambda: _q3_qlines([_q3_rnd.randint(9 * 10**5, 10**6) for _ in range(8000)]))


# 3. sum of fractions mod p
def _q3_sol_frac(s):
    v = list(map(int, s.split()))
    n = v[0]
    P = _q3_P
    tot = 0
    for i in range(n):
        a, b = v[1 + 2 * i], v[2 + 2 * i]
        tot = (tot + a % P * pow(b, P - 2, P)) % P
    return str(tot)


def _q3_brute_frac(s):
    v = list(map(int, s.split()))
    n = v[0]
    f = sum((_q3_Fr(v[1 + 2 * i], v[2 + 2 * i]) for i in range(n)), _q3_Fr(0))
    return str(f.numerator % _q3_P * pow(f.denominator, -1, _q3_P) % _q3_P)


def _q3_gen_frac(n=None, lo=-10**9, hi=10**9, bhi=10**9):
    n = n or _q3_rnd.randint(1, 1000)
    rows = [f"{_q3_rnd.randint(lo, hi)} {_q3_rnd.randint(1, bhi)}" for _ in range(n)]
    return f"{n}\n" + '\n'.join(rows) + '\n'


_q3_check(_q3_sol_frac, _q3_brute_frac, lambda: _q3_gen_frac(_q3_rnd.randint(1, 6), -20, 20, 12))

add('math-c-fraction-sum', 'Sum of fractions modulo p', 'math', 'modular-inverse', 1000, ['math', 'modular inverse', 'fermat'],
    '<p>You are given n fractions a<sub>i</sub>/b<sub>i</sub>. Their exact sum is a rational number P/Q in lowest terms (Q &gt; 0). Print P·Q<sup>−1</sup> modulo p = 10<sup>9</sup> + 7 — the unique r in [0, p) with Q·r ≡ P (mod p).</p>'
    '<p>Adding the fractions exactly makes numerators and denominators explode. Instead, each a/b already has a value a·b<sup>−1</sup> mod p, and those values simply add: division by b is multiplication by b<sup>p−2</sup> (Fermat). Numerators can be negative — reduce them into [0, p) first.</p>',
    '<p>First line n (1 ≤ n ≤ 10<sup>5</sup>). Next n lines: a<sub>i</sub> b<sub>i</sub> (|a<sub>i</sub>| ≤ 10<sup>9</sup>, 1 ≤ b<sub>i</sub> ≤ 10<sup>9</sup>).</p>',
    '<p>One integer in [0, 10<sup>9</sup> + 7).</p>', _q3_sol_frac,
    ["3\n1 2\n1 3\n1 6\n", "2\n1 3\n-1 2\n"],
    ["1\n0 5\n", "1\n-1 1\n", "2\n1 2\n-1 2\n", "2\n1000000000 999999999\n-1000000000 1000000000\n", "1\n7 7\n"],
    _q3_gen_frac, n_rand=6)


# ═══════════════════════ crt ═══════════════════════

def _q3_merge(x, M, a, m):
    """x mod M combined with a mod m; returns (x', lcm) or None."""
    g = _q3_pm.gcd(M, m)
    d = (a - x) % m
    if d % g:
        return None
    mg = m // g
    k = (d // g) * pow(M // g % mg, -1, mg) % mg if mg > 1 else 0
    return x + M * k, M // g * m


def _q3_sol_crt2(s):
    out = []
    for a1, m1, a2, m2 in _q3_each(s):
        r = _q3_merge(a1, m1, a2, m2)
        out.append(str(r[0]) if r else '-1')
    return '\n'.join(out)


def _q3_brute_crt2(s):
    out = []
    for a1, m1, a2, m2 in _q3_each(s):
        L = m1 * m2 // _q3_pm.gcd(m1, m2)
        out.append(str(next((x for x in range(L) if x % m1 == a1 and x % m2 == a2), -1)))
    return '\n'.join(out)


def _q3_rq2(hi):
    m1, m2 = _q3_rnd.randint(1, hi), _q3_rnd.randint(1, hi)
    return (_q3_rnd.randint(0, m1 - 1), m1, _q3_rnd.randint(0, m2 - 1), m2)


_q3_check(_q3_sol_crt2, _q3_brute_crt2, lambda: _q3_qlines([_q3_rq2(30) for _ in range(6)]))


def _q3_gen_crt2(T=None):
    T = T or _q3_rnd.randint(1, 1000)
    q = []
    for _ in range(T):
        r = _q3_rnd.random()
        if r < 0.35:
            q.append(_q3_rq2(10**9))
        else:  # share a big common factor; make about half consistent
            g = _q3_rnd.randint(1, 10**5)
            m1, m2 = g * _q3_rnd.randint(1, 10**9 // g), g * _q3_rnd.randint(1, 10**9 // g)
            x = _q3_rnd.randint(0, 10**18)
            a1, a2 = x % m1, x % m2
            if _q3_rnd.random() < 0.4:
                a2 = _q3_rnd.randint(0, m2 - 1)
            q.append((a1, m1, a2, m2))
    return _q3_qlines(q)


add('math-c-crt-two', 'Two congruences', 'math', 'crt', 1500, ['math', 'chinese remainder theorem', 'extended gcd'],
    '<p>For each query find the smallest non-negative x with x ≡ a<sub>1</sub> (mod m<sub>1</sub>) and x ≡ a<sub>2</sub> (mod m<sub>2</sub>), or print <code>-1</code> if no such x exists.</p>'
    '<p>The moduli are <b>not</b> necessarily coprime. A solution exists exactly when g = gcd(m<sub>1</sub>, m<sub>2</sub>) divides a<sub>2</sub> − a<sub>1</sub>, and then it is unique modulo lcm(m<sub>1</sub>, m<sub>2</sub>) — which can reach 10<sup>18</sup>, so trying candidates one by one is hopeless.</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>5</sup>). Next T lines: a<sub>1</sub> m<sub>1</sub> a<sub>2</sub> m<sub>2</sub> (1 ≤ m<sub>i</sub> ≤ 10<sup>9</sup>, 0 ≤ a<sub>i</sub> &lt; m<sub>i</sub>).</p>',
    '<p>T lines, each the smallest x ≥ 0 or -1. (Any answer is below lcm(m<sub>1</sub>, m<sub>2</sub>) ≤ 10<sup>18</sup>.)</p>', _q3_sol_crt2,
    [_q3_qlines([(2, 3, 3, 5), (1, 4, 3, 6), (1, 4, 2, 6)])],
    [_q3_qlines([(0, 1, 0, 1), (0, 1, 5, 7), (3, 7, 3, 7), (2, 7, 3, 7), (999999999, 10**9, 999999936, 999999937),
                 (0, 10**9, 0, 999999999), (10**9 - 1, 10**9, 999999998, 999999999), (5, 6, 1, 4)])],
    _q3_gen_crt2, n_rand=5)


def _q3_sol_crtn(s):
    v = list(map(int, s.split()))
    n = v[0]
    x, M = 0, 1
    for i in range(n):
        r = _q3_merge(x, M, v[1 + 2 * i], v[2 + 2 * i])
        if r is None:
            return '-1'
        x, M = r
    return str(x)


def _q3_brute_crtn(s):
    v = list(map(int, s.split()))
    n = v[0]
    pairs = [(v[1 + 2 * i], v[2 + 2 * i]) for i in range(n)]
    L = 1
    for _, m in pairs:
        L = L * m // _q3_pm.gcd(L, m)
    return str(next((x for x in range(L) if all(x % m == a for a, m in pairs)), -1))


_q3_PR = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
          101, 103, 107, 109, 113, 1009, 10007, 100003, 999983]


def _q3_gen_crtn(n=None, small=False, bad=None):
    n = n or _q3_rnd.randint(1, 1500)
    if small:
        fac = {p: _q3_rnd.randint(0, 2) for p in _q3_rnd.sample([2, 3, 5, 7], 3)}
        cap = 10**9
    else:
        fac, L = {}, 1
        while True:
            p = _q3_rnd.choice(_q3_PR)
            if L * p > 10**18:
                break
            L *= p
            fac[p] = fac.get(p, 0) + 1
        cap = 10**9
    L = 1
    for p, e in fac.items():
        L *= p ** e
    x = _q3_rnd.randint(0, L - 1)
    rows = []
    for _ in range(n):
        m = 1
        for p, e in fac.items():
            k = _q3_rnd.randint(0, e)
            if m * p ** k <= cap:
                m *= p ** k
        rows.append([x % m, m])
    if bad if bad is not None else _q3_rnd.random() < 0.3:
        i = _q3_rnd.randrange(n)
        rows[i][0] = _q3_rnd.randint(0, rows[i][1] - 1)
    return f"{n}\n" + '\n'.join(f"{a} {m}" for a, m in rows) + '\n'


_q3_check(_q3_sol_crtn, _q3_brute_crtn, lambda: _q3_gen_crtn(_q3_rnd.randint(1, 5), small=True), rounds=300)

add('math-c-crt-many', 'A system of congruences', 'math', 'crt', 1800, ['math', 'chinese remainder theorem', 'number theory'],
    '<p>Find the smallest non-negative integer x satisfying all n congruences x ≡ a<sub>i</sub> (mod m<sub>i</sub>), or print <code>-1</code> if the system has no solution.</p>'
    '<p>The moduli are arbitrary — they may share factors, repeat, or equal 1. Merge the congruences one at a time: two congruences collapse into a single one modulo their lcm, or prove the system inconsistent. It is guaranteed that the lcm of <b>all</b> moduli is at most 10<sup>18</sup>, so every intermediate modulus fits in a signed 64-bit integer — but products like M·k must be arranged carefully.</p>',
    '<p>First line n (1 ≤ n ≤ 10<sup>4</sup>). Next n lines: a<sub>i</sub> m<sub>i</sub> (1 ≤ m<sub>i</sub> ≤ 10<sup>9</sup>, 0 ≤ a<sub>i</sub> &lt; m<sub>i</sub>). lcm(m<sub>1</sub>, …, m<sub>n</sub>) ≤ 10<sup>18</sup>.</p>',
    '<p>One integer: the smallest x ≥ 0, or -1.</p>', _q3_sol_crtn,
    ["3\n2 3\n3 5\n2 7\n", "3\n1 4\n3 6\n7 10\n", "2\n1 4\n2 6\n"],
    ["1\n0 1\n", "1\n999999999 1000000000\n", "2\n5 12\n5 12\n", "2\n5 12\n6 12\n",
     "3\n0 1\n0 1\n0 1\n",
     "2\n999999936 999999937\n999999999 1000000000\n",
     "4\n1 2\n2 3\n3 4\n4 5\n",
     "2\n999999999 1000000000\n0 1\n",
     _q3_gen_crtn(3000, bad=False)],
    _q3_gen_crtn, n_rand=7)


# ═══════════════════════ counting ═══════════════════════

# word arrangements
def _q3_sol_word(s):
    w = s.split()[1] if len(s.split()) > 1 else ''
    n = len(w)
    _q3_need(n)
    r = _q3_F[n]
    for c in set(w):
        r = r * _q3_IF[w.count(c)] % _q3_P
    return str(r)


def _q3_brute_word(s):
    w = s.split()[1]
    return str(len(set(_q3_perms(w))) % _q3_P)


def _q3_wi(w):
    return f"{len(w)}\n{w}\n"


_q3_check(_q3_sol_word, _q3_brute_word,
          lambda: _q3_wi(''.join(_q3_rnd.choice('aab' if _q3_rnd.random() < 0.5 else 'abcz') for _ in range(_q3_rnd.randint(1, 7)))))

add('math-c-word-arrangements', 'Arrangements of a word', 'math', 'counting', 1000, ['math', 'combinatorics', 'factorials'],
    '<p>How many <b>different</b> strings can be formed by rearranging all the letters of the given word? Print the count modulo 10<sup>9</sup> + 7.</p>'
    '<p>For a word with distinct letters the answer is n!. Repeated letters make some rearrangements identical: if letter c appears k<sub>c</sub> times, each distinct string is produced k<sub>c</sub>! times over, so divide — that is, multiply by inverse factorials.</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line: a word of n lowercase English letters.</p>',
    '<p>One integer: the number of distinct arrangements modulo 10<sup>9</sup> + 7.</p>', _q3_sol_word,
    [_q3_wi('abc'), _q3_wi('banana')],
    [_q3_wi('a'), _q3_wi('zzzz'), _q3_wi('ab'), _q3_wi('abcdefghijklmnopqrstuvwxyz'), _q3_wi('a' * 60000 + 'b'),
     _q3_wi('ab' * 30000)],
    lambda: _q3_wi(''.join(_q3_rnd.choice('abcdefghijklmnopqrstuvwxyz'[:_q3_rnd.randint(1, 26)]) for _ in range(_q3_rnd.randint(1, 3000)))),
    n_rand=5)


# stars and bars with a lower bound
def _q3_sol_stars(s):
    out = []
    for n, k, l in _q3_each(s):
        rest = n - k * l
        out.append(str(_q3_C(rest + k - 1, k - 1) if rest >= 0 else 0))
    return '\n'.join(out)


def _q3_brute_stars(s):
    out = []
    for n, k, l in _q3_each(s):
        # dp[j] = ways to give j candies to the children so far, each >= l
        dp = [1] + [0] * n
        for _ in range(k):
            nd = [0] * (n + 1)
            for j in range(n + 1):
                if dp[j]:
                    for t in range(l, n - j + 1):
                        nd[j + t] += dp[j]
            dp = nd
        out.append(str(dp[n] % _q3_P))
    return '\n'.join(out)


_q3_check(_q3_sol_stars, _q3_brute_stars,
          lambda: _q3_qlines([(_q3_rnd.randint(0, 12), _q3_rnd.randint(1, 5), _q3_rnd.randint(0, 4)) for _ in range(4)]), rounds=100)


def _q3_rstar():
    k = _q3_rnd.randint(1, 10**6)
    if _q3_rnd.random() < 0.5:
        l = _q3_rnd.randint(0, 10**6 // k)
        n = _q3_rnd.randint(min(10**6, k * l), 10**6)
    else:
        l, n = _q3_rnd.randint(0, 10**6), _q3_rnd.randint(0, 10**6)
    return (n, k, l)


add('math-c-stars-bars', 'Candies with a minimum', 'math', 'counting', 1300, ['math', 'combinatorics', 'stars and bars'],
    '<p>n identical candies are handed out to k children (children are distinguishable). Every child must get <b>at least</b> l candies, and all candies must be handed out. In how many ways can this be done? Answer T queries modulo 10<sup>9</sup> + 7.</p>'
    '<p>First give every child their l candies, then distribute what is left with no restriction — a stars-and-bars count. If there are not enough candies, the answer is 0. Careful: k·l can reach 10<sup>12</sup>.</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>5</sup>). Next T lines: n k l (0 ≤ n ≤ 10<sup>6</sup>, 1 ≤ k ≤ 10<sup>6</sup>, 0 ≤ l ≤ 10<sup>6</sup>).</p>',
    '<p>T lines.</p>', _q3_sol_stars,
    [_q3_qlines([(5, 2, 1), (7, 3, 2), (0, 4, 0), (3, 2, 2)])],
    [_q3_qlines([(0, 1, 0), (0, 1, 1), (10**6, 1, 10**6), (10**6, 10**6, 1), (10**6, 10**6, 0), (10**6, 10**6, 10**6), (10**6, 500000, 1), (1, 10**6, 0)])],
    lambda: _q3_qlines([_q3_rstar() for _ in range(_q3_rnd.randint(1, 600))]), n_rand=5,
    large=lambda: _q3_qlines([_q3_rstar() for _ in range(5000)]))


# grid paths avoiding one blocked cell
def _q3_sol_grid(s):
    out = []
    for n, m, x, y in _q3_each(s):
        tot = _q3_C(n + m - 2, n - 1)
        through = _q3_C(x + y - 2, x - 1) * _q3_C(n - x + m - y, n - x) % _q3_P
        out.append(str((tot - through) % _q3_P))
    return '\n'.join(out)


def _q3_brute_grid(s):
    out = []
    for n, m, x, y in _q3_each(s):
        dp = [[0] * (m + 1) for _ in range(n + 1)]
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                if (i, j) == (x, y):
                    continue
                dp[i][j] = 1 if (i, j) == (1, 1) else dp[i - 1][j] + dp[i][j - 1]
        out.append(str(dp[n][m] % _q3_P))
    return '\n'.join(out)


def _q3_rgrid(N):
    while True:
        n, m = _q3_rnd.randint(1, N), _q3_rnd.randint(1, N)
        if n * m >= 3:
            break
    while True:
        x, y = _q3_rnd.randint(1, n), _q3_rnd.randint(1, m)
        if (x, y) not in ((1, 1), (n, m)):
            return (n, m, x, y)


_q3_check(_q3_sol_grid, _q3_brute_grid, lambda: _q3_qlines([_q3_rgrid(7) for _ in range(5)]))

add('math-c-grid-blocked', 'Grid paths around a rock', 'math', 'counting', 1500, ['math', 'combinatorics', 'complementary counting'],
    '<p>A robot starts in the top-left cell (1, 1) of an n × m grid and must reach the bottom-right cell (n, m), moving only <b>down</b> (row + 1) or <b>right</b> (column + 1). One cell (x, y) holds a rock and cannot be entered. Count the robot\'s paths modulo 10<sup>9</sup> + 7, for T independent queries.</p>'
    '<p>A DP over the grid is Θ(n·m) — up to 10<sup>12</sup> cells. Count all paths with a binomial coefficient and subtract those that pass through the rock (paths to the rock times paths from it).</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>5</sup>). Next T lines: n m x y (1 ≤ n, m ≤ 10<sup>6</sup>, n·m ≥ 3, 1 ≤ x ≤ n, 1 ≤ y ≤ m, and (x, y) is neither (1, 1) nor (n, m)).</p>',
    '<p>T lines.</p>', _q3_sol_grid,
    [_q3_qlines([(2, 2, 1, 2), (3, 3, 2, 2), (3, 4, 2, 3)])],
    [_q3_qlines([(1, 3, 1, 2), (3, 1, 2, 1), (10**6, 10**6, 1, 2), (10**6, 10**6, 500000, 500000),
                 (10**6, 10**6, 10**6, 1), (10**6, 1, 3, 1), (2, 2, 2, 1), (10**6, 999999, 10**6, 999998)])],
    lambda: _q3_qlines([_q3_rgrid(_q3_rnd.choice([10, 10**6])) for _ in range(_q3_rnd.randint(1, 600))]), n_rand=5,
    large=lambda: _q3_qlines([_q3_rgrid(10**6) for _ in range(3000)]))


# ═══════════════════════ pascal-binomial ═══════════════════════

def _q3_sol_ncr(s):
    return '\n'.join(str(_q3_C(n, r)) for n, r in _q3_each(s))


_q3_check(_q3_sol_ncr, lambda s: '\n'.join(str(_q3_pm.comb(n, r) % _q3_P) for n, r in _q3_each(s)),
          lambda: _q3_qlines([(_q3_rnd.randint(0, 200), _q3_rnd.randint(0, 220)) for _ in range(6)]))


def _q3_rncr():
    n = _q3_rnd.randint(0, 10**6)
    r = _q3_rnd.randint(0, n) if _q3_rnd.random() < 0.9 else _q3_rnd.randint(0, 10**6)
    return (n, r)


add('math-c-ncr-queries', 'Binomial coefficient queries', 'math', 'pascal-binomial', 1100, ['math', 'combinatorics', 'factorials'],
    '<p>Answer T queries: print C(n, r) — the number of ways to choose r items out of n — modulo 10<sup>9</sup> + 7. If r &gt; n the answer is 0.</p>'
    '<p>Building Pascal\'s triangle up to n = 10<sup>6</sup> needs 5·10<sup>11</sup> cells, and multiplying r terms per query is too slow for 10<sup>5</sup> queries. Precompute factorials and inverse factorials once; then C(n, r) = n! · (r!)<sup>−1</sup> · ((n−r)!)<sup>−1</sup> is O(1).</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>5</sup>). Next T lines: n r (0 ≤ n, r ≤ 10<sup>6</sup>).</p>',
    '<p>T lines.</p>', _q3_sol_ncr,
    [_q3_qlines([(5, 2), (10, 0), (3, 5), (1000000, 500000)])],
    [_q3_qlines([(0, 0), (0, 1), (1, 1), (10**6, 10**6), (10**6, 1), (10**6, 999999), (999999, 10**6), (40, 20)])],
    lambda: _q3_qlines([_q3_rncr() for _ in range(_q3_rnd.randint(1, 600))]), n_rand=5,
    large=lambda: _q3_qlines([_q3_rncr() for _ in range(6000)]))


# Catalan numbers
def _q3_sol_cat(s):
    return '\n'.join(str(_q3_C(2 * n, n) * pow(n + 1, _q3_P - 2, _q3_P) % _q3_P) for (n,) in _q3_each(s))


def _q3_brute_cat(s):
    qs = [q[0] for q in _q3_each(s)]
    N = max(qs)
    c = [1] + [0] * N
    for i in range(1, N + 1):
        c[i] = sum(c[j] * c[i - 1 - j] for j in range(i))
    return '\n'.join(str(c[n] % _q3_P) for n in qs)


_q3_check(_q3_sol_cat, _q3_brute_cat, lambda: _q3_qlines([_q3_rnd.randint(0, 120) for _ in range(5)]), rounds=60)

add('math-c-catalan', 'Balanced bracket strings', 'math', 'pascal-binomial', 1400, ['math', 'combinatorics', 'catalan numbers'],
    '<p>A bracket string of length 2n is <b>balanced</b> if every prefix has at least as many <code>(</code> as <code>)</code> and the totals are equal. For each query n, print the number of balanced strings of length 2n modulo 10<sup>9</sup> + 7.</p>'
    '<p>The O(n<sup>2</sup>) Catalan recurrence is too slow for n = 10<sup>6</sup>. By the reflection argument the count is C(2n, n) − C(2n, n + 1) = C(2n, n)/(n + 1). Note that factorials up to 2·10<sup>6</sup> are needed.</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>5</sup>). Next T lines: n (0 ≤ n ≤ 10<sup>6</sup>).</p>',
    '<p>T lines.</p>', _q3_sol_cat,
    [_q3_qlines([1, 2, 3, 4])],
    [_q3_qlines([0, 1, 10**6, 999999, 19, 500000])],
    lambda: _q3_qlines([_q3_rnd.randint(0, _q3_rnd.choice([30, 10**6])) for _ in range(_q3_rnd.randint(1, 600))]), n_rand=5,
    large=lambda: _q3_qlines([_q3_rnd.randint(0, 10**6) for _ in range(8000)]))


# Lucas
def _q3_sol_lucas(s):
    v = list(map(int, s.split()))
    p, T = v[0], v[1]
    F = [1] * p
    for i in range(1, p):
        F[i] = F[i - 1] * i % p
    IF = [1] * p
    IF[p - 1] = pow(F[p - 1], p - 2, p)
    for i in range(p - 1, 0, -1):
        IF[i - 1] = IF[i] * i % p
    out = []
    for t in range(T):
        n, r = v[2 + 2 * t], v[3 + 2 * t]
        res = 1
        while (n or r) and res:
            a, b = n % p, r % p
            res = 0 if b > a else res * F[a] * IF[b] * IF[a - b] % p
            n //= p
            r //= p
        out.append(str(res))
    return '\n'.join(out)


def _q3_brute_lucas(s):
    v = list(map(int, s.split()))
    p, T = v[0], v[1]
    return '\n'.join(str(_q3_pm.comb(v[2 + 2 * t], v[3 + 2 * t]) % p) for t in range(T))


def _q3_gen_lucas(p, T, N):
    rows = []
    for _ in range(T):
        n = _q3_rnd.randint(0, N)
        r = _q3_rnd.randint(0, n) if _q3_rnd.random() < 0.85 else _q3_rnd.randint(0, N)
        rows.append(f"{n} {r}")
    return f"{p} {T}\n" + '\n'.join(rows) + '\n'


_q3_check(_q3_sol_lucas, _q3_brute_lucas, lambda: _q3_gen_lucas(_q3_rnd.choice([2, 3, 5, 7, 13, 101]), 6, 3000))

_q3_LP = [2, 3, 5, 7, 97, 1009, 65537, 99991, 99989]
add('math-c-lucas', 'Huge binomials modulo a small prime', 'math', 'pascal-binomial', 1900, ['math', 'combinatorics', 'lucas theorem'],
    '<p>Given a prime p, answer T queries: print C(n, r) mod p, where n and r can be as large as 10<sup>18</sup> (C(n, r) = 0 when r &gt; n).</p>'
    '<p>Factorials up to 10<sup>18</sup> are out of reach, and n! ≡ 0 (mod p) as soon as n ≥ p anyway, so the usual factorial formula breaks. Lucas\' theorem splits n and r into base-p digits: C(n, r) ≡ ∏ C(n<sub>i</sub>, r<sub>i</sub>) (mod p), and each small binomial uses a factorial table of size p.</p>',
    '<p>First line p T (p prime, 2 ≤ p ≤ 10<sup>5</sup>; 1 ≤ T ≤ 10<sup>5</sup>). Next T lines: n r (0 ≤ n, r ≤ 10<sup>18</sup>).</p>',
    '<p>T lines, each C(n, r) mod p.</p>', _q3_sol_lucas,
    ["7 4\n10 3\n1000 500\n6 2\n3 5\n", "2 3\n5 2\n7 3\n1000000000000000000 576460752303423488\n"],
    ["2 1\n0 0\n", "3 3\n1000000000000000000 0\n1000000000000000000 1000000000000000000\n0 1\n",
     "99991 4\n99991 1\n99990 45000\n999999999999999999 99991\n1000000000000000000 999999999999999999\n",
     "2 4\n1023 511\n1024 511\n1000000000000000000 1\n999999999999999999 576460752303423487\n"],
    lambda: _q3_gen_lucas(_q3_rnd.choice(_q3_LP), _q3_rnd.randint(1, 700), _q3_rnd.choice([10**6, 10**18])), n_rand=6,
    large=lambda: _q3_gen_lucas(2, 3000, 10**18))


# binomials modulo an arbitrary m
def _q3_factor(m):
    ps, d = [], 2
    while d * d <= m:
        if m % d == 0:
            ps.append(d)
            while m % d == 0:
                m //= d
        d += 1
    if m > 1:
        ps.append(m)
    return ps


def _q3_sol_anymod(s):
    v = list(map(int, s.split()))
    n, m, q = v[0], v[1], v[2]
    ks = v[3:3 + q]
    if m == 1:
        return '\n'.join('0' for _ in ks)
    ps = _q3_factor(m)
    want = set(ks)
    e = [0] * len(ps)
    cop = 1                     # product of the parts coprime to m (numerator · denominator⁻¹)
    ans = {}

    def val():
        r = cop
        for j, p in enumerate(ps):
            if e[j]:
                r = r * pow(p, e[j], m) % m
        return r
    if 0 in want:
        ans[0] = val()
    for k in range(1, n + 1):
        a, b = n - k + 1, k
        for j, p in enumerate(ps):
            while a % p == 0:
                a //= p
                e[j] += 1
            while b % p == 0:
                b //= p
                e[j] -= 1
        cop = cop * a % m * pow(b, -1, m) % m
        if k in want:
            ans[k] = val()
    return '\n'.join(str(ans[k]) for k in ks)


def _q3_brute_anymod(s):
    v = list(map(int, s.split()))
    n, m, q = v[0], v[1], v[2]
    return '\n'.join(str(_q3_pm.comb(n, k) % m) for k in v[3:3 + q])


def _q3_gen_anymod(n, m, q):
    return f"{n} {m} {q}\n" + '\n'.join(str(_q3_rnd.randint(0, n)) for _ in range(q)) + '\n'


_q3_check(_q3_sol_anymod, _q3_brute_anymod,
          lambda: _q3_gen_anymod(_q3_rnd.randint(1, 150), _q3_rnd.choice([1, 2, 4, 12, 36, 360, 1000, 2**20, 720720, _q3_rnd.randint(1, 10**9)]), 6))


def _q3_rand_m():
    r = _q3_rnd.random()
    if r < 0.3:
        return _q3_rnd.randint(1, 10**9)
    if r < 0.6:  # very smooth
        m = 1
        while True:
            p = _q3_rnd.choice([2, 3, 5, 7, 11, 13])
            if m * p > 10**9:
                return m
            m *= p
    return _q3_rnd.choice([10**9, 2**29, 3**18, 223092870, 735134400, 999999937, 999999999, 2 * 3 * 5 * 7 * 11 * 13 * 17 * 19 * 23])


add('math-c-binom-any-mod', 'Binomials modulo any m', 'math', 'pascal-binomial', 2100, ['math', 'combinatorics', 'number theory'],
    '<p>Given n and a modulus m that need <b>not</b> be prime, answer q queries: print C(n, k) mod m.</p>'
    '<p>Pascal\'s rule works for any modulus but row n of the triangle costs Θ(n<sup>2</sup>) — 2·10<sup>10</sup> here. The factorial formula needs inverses, which fail for numbers sharing a factor with m. Walk along the row with C(n, k) = C(n, k−1)·(n−k+1)/k, but split every factor into a part made of the primes of m (track those as exponents) and a part coprime to m (which <i>is</i> invertible modulo m).</p>',
    '<p>First line n m q (1 ≤ n ≤ 2·10<sup>5</sup>, 1 ≤ m ≤ 10<sup>9</sup>, 1 ≤ q ≤ 10<sup>5</sup>). Next q lines: k (0 ≤ k ≤ n).</p>',
    '<p>q lines, each C(n, k) mod m.</p>', _q3_sol_anymod,
    ["10 12 4\n0\n3\n5\n10\n", "6 1000 3\n2\n3\n4\n"],
    ["1 1 2\n0\n1\n", "200000 2 3\n0\n100000\n65536\n", "200000 1000000000 3\n1\n2\n100000\n",
     "100 999999937 2\n50\n0\n", "200000 735134400 4\n199999\n77777\n100000\n3\n"],
    lambda: _q3_gen_anymod(_q3_rnd.choice([_q3_rnd.randint(1, 500), _q3_rnd.randint(1, 2 * 10**5)]), _q3_rand_m(), _q3_rnd.randint(1, 700)),
    n_rand=6, large=lambda: _q3_gen_anymod(2 * 10**5, 735134400, 12000))
