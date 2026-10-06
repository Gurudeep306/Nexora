# Math judged problems, part 4 (exec'd by ../math.py)
# Pages: inclusion-exclusion, probability, number-patterns.
import itertools as _q4_it
import math as _q4_pymath
import random as _q4_rnd
import sys as _q4_sys
from fractions import Fraction as _q4_Fr

if hasattr(_q4_sys, 'set_int_max_str_digits'):
    _q4_sys.set_int_max_str_digits(0)

_q4_MOD = 10**9 + 7


def _q4_lines(s):
    return s.strip().split('\n')


def _q4_qlines(vals):
    """T, then one query per line (each query may be a tuple)."""
    return f"{len(vals)}\n" + '\n'.join(' '.join(map(str, v)) if isinstance(v, tuple) else str(v) for v in vals) + '\n'


def _q4_each(s):
    L = _q4_lines(s)
    return [tuple(map(int, l.split())) for l in L[1:1 + int(L[0])]]


def _q4_check(fast, brute, gen, rounds=200):
    for _ in range(rounds):
        s = gen()
        assert fast(s) == brute(s), (s, fast(s), brute(s))


def _q4_frac_mod(f):
    return f.numerator % _q4_MOD * pow(f.denominator % _q4_MOD, _q4_MOD - 2, _q4_MOD) % _q4_MOD


# Validation uses a private RNG so the shared seeded stream (test data) is unaffected.
_q4_vr = _q4_rnd.Random(4444)


# ─────────────────────────── inclusion–exclusion ───────────────────────────
def _q4_primes_of(m):
    ps, d = [], 2
    while d * d <= m:
        if m % d == 0:
            ps.append(d)
            while m % d == 0:
                m //= d
        d += 1 if d == 2 else 2
    if m > 1:
        ps.append(m)
    return ps


def _q4_sol_coprime(s):
    out = []
    for n, m in _q4_each(s):
        ps = _q4_primes_of(m)
        tot = 0
        for mask in range(1 << len(ps)):
            d, bits = 1, 0
            for i, p in enumerate(ps):
                if mask >> i & 1:
                    d *= p
                    bits += 1
            tot += (-1) ** bits * (n // d)
        out.append(str(tot))
    return '\n'.join(out)


_q4_check(_q4_sol_coprime,
          lambda s: '\n'.join(str(sum(1 for x in range(1, n + 1) if _q4_pymath.gcd(x, m) == 1)) for n, m in _q4_each(s)),
          lambda: _q4_qlines([(_q4_vr.randint(1, 300), _q4_vr.choice([1, 2, 30, 210, 2310, _q4_vr.randint(1, 3000)])) for _ in range(4)]))

add('math-c-coprime-count', 'Count numbers coprime to m', 'math', 'inclusion-exclusion', 1100, ['math', 'inclusion-exclusion', 'primes'],
    '<p>For each query, count the integers x with 1 ≤ x ≤ n and gcd(x, m) = 1.</p>'
    '<p>n is up to 10<sup>12</sup>, so checking every x is far too slow. A number fails to be coprime to m exactly when it is divisible by one of m\'s <b>distinct</b> prime factors — and m ≤ 10<sup>9</sup> has at most 9 of them. Count the "bad" numbers with inclusion–exclusion over those primes.</p>',
    '<p>First line T (1 ≤ T ≤ 100). Next T lines: n m (1 ≤ n ≤ 10<sup>12</sup>, 1 ≤ m ≤ 10<sup>9</sup>).</p>',
    '<p>T lines, one count each.</p>', _q4_sol_coprime,
    [_q4_qlines([(10, 6), (100, 30), (7, 1)])],
    [_q4_qlines([(1, 1), (1, 2), (10**12, 1), (10**12, 223092870), (10**12, 999999937), (10**12, 2**29), (5, 10**9)]),
     _q4_qlines([(10**12, 646969323), (999999999999, 735134400), (12345, 1000000000)])],
    lambda: _q4_qlines([(random.choice([random.randint(1, 1000), random.randint(1, 10**12)]),
                         random.choice([random.randint(1, 10**9), 223092870, 2 * 3 * 5 * 7 * 11 * 13 * random.randint(1, 30000), random.randint(1, 1000)]))
                        for _ in range(random.randint(1, 100))]), n_rand=6)


def _q4_sol_divany(s):
    v = list(map(int, s.split()))
    n, k = v[0], v[1]
    a = v[2:2 + k]
    total = 0
    stack = [(0, 1, 0)]  # (next index, lcm so far, subset size)
    while stack:
        i, l, sz = stack.pop()
        if i == k:
            if sz:
                total += (n // l) if sz % 2 else -(n // l)
            continue
        stack.append((i + 1, l, sz))
        nl = l // _q4_pymath.gcd(l, a[i]) * a[i]
        if nl <= n:  # supersets have lcm >= nl > n and contribute 0
            stack.append((i + 1, nl, sz + 1))
    return str(total)


_q4_check(_q4_sol_divany,
          lambda s: (lambda v: str(sum(1 for x in range(1, v[0] + 1) if any(x % y == 0 for y in v[2:2 + v[1]]))))(list(map(int, s.split()))),
          lambda: (lambda n, k: f"{n} {k}\n" + ' '.join(str(_q4_vr.randint(1, 40)) for _ in range(k)) + '\n')(_q4_vr.randint(1, 1500), _q4_vr.randint(1, 8)))


def _q4_gen_divany(k=None, big=False):
    k = k or random.randint(1, 16)
    n = random.randint(1, 10**18)
    if big:
        a = [random.randint(1, 10**18) for _ in range(k)]
    else:
        a = [random.choice([random.randint(1, 30), random.randint(1, 10**6), random.randint(1, 10**9)]) for _ in range(k)]
    return f"{n} {k}\n{' '.join(map(str, a))}\n"


add('math-c-div-any', 'Divisible by at least one', 'math', 'inclusion-exclusion', 1500, ['math', 'inclusion-exclusion', 'lcm', 'bitmasks'],
    '<p>Given n and k positive integers a<sub>1</sub>, …, a<sub>k</sub>, count the integers x with 1 ≤ x ≤ n that are divisible by <b>at least one</b> a<sub>i</sub>.</p>'
    '<p>n goes up to 10<sup>18</sup>. By inclusion–exclusion the answer is the alternating sum, over non-empty subsets S, of ⌊n / lcm(S)⌋. The trap is overflow: the lcm of a few numbers near 10<sup>18</sup> is astronomically large. Once an lcm exceeds n, that subset (and every superset) contributes 0 — stop growing it before it overflows.</p>',
    '<p>First line n and k (1 ≤ n ≤ 10<sup>18</sup>, 1 ≤ k ≤ 16). Second line k integers a<sub>i</sub> (1 ≤ a<sub>i</sub> ≤ 10<sup>18</sup>; values may repeat).</p>',
    '<p>One integer: the count.</p>', _q4_sol_divany,
    ["30 2\n2 3\n", "100 3\n4 6 10\n"],
    ["1 1\n1\n", "1 1\n2\n", "1000000000000000000 1\n1\n",
     "1000000000000000000 3\n1000000000000000000 999999999999999999 999999999999999989\n",
     "1000000000000000000 16\n2 3 5 7 11 13 17 19 23 29 31 37 41 43 47 53\n",
     "999999999999999999 16\n2 2 2 2 2 2 2 2 4 4 4 4 4 4 4 4\n",
     "1000000000000000000 4\n1000000000 1000000000 999999937 999999929\n"],
    lambda: random.choice([_q4_gen_divany, lambda: _q4_gen_divany(big=True)])(), n_rand=8)


def _q4_sol_surj(s):
    n, k = map(int, s.split())
    M = _q4_MOD
    tot, c = 0, 1  # c = C(k, i)
    for i in range(k + 1):
        term = c * pow(k - i, n, M) % M
        tot = (tot - term) % M if i % 2 else (tot + term) % M
        c = c * (k - i) % M * pow(i + 1, M - 2, M) % M
    return str(tot)


_q4_check(_q4_sol_surj,
          lambda s: (lambda n, k: str(sum(1 for f in _q4_it.product(range(k), repeat=n) if len(set(f)) == k) % _q4_MOD))(*map(int, s.split())),
          lambda: f"{_q4_vr.randint(1, 6)} {_q4_vr.randint(1, 5)}\n", rounds=80)


add('math-c-surjections', 'Every worker gets a task', 'math', 'inclusion-exclusion', 1400, ['math', 'inclusion-exclusion', 'combinatorics', 'modular'],
    '<p>There are n different tasks and k different workers. In how many ways can every task be assigned to one worker so that <b>every worker gets at least one task</b>? Print the count modulo 10<sup>9</sup> + 7.</p>'
    '<p>Equivalently: count the functions from an n-element set <b>onto</b> a k-element set. There are k<sup>n</sup> functions in total; subtract those that miss some worker using inclusion–exclusion over the set of missed workers. If k &gt; n the answer is 0.</p>',
    '<p>One line: n k (1 ≤ n ≤ 10<sup>9</sup>, 1 ≤ k ≤ 2·10<sup>5</sup>).</p>',
    '<p>One integer: the count modulo 10<sup>9</sup> + 7.</p>', _q4_sol_surj,
    ["3 2\n", "4 3\n"],
    ["1 1\n", "5 1\n", "3 4\n", "1 200000\n", "200000 200000\n", "1000000000 200000\n", "1000000000 1\n", "999999999 199999\n", "6 6\n"],
    lambda: random.choice([f"{random.randint(1, 30)} {random.randint(1, 30)}\n",
                           f"{random.randint(1, 10**9)} {random.randint(1, 2 * 10**5)}\n"]), n_rand=7)


_q4_MU_N = 2 * 10**5


def _q4_mu_prefix(N):
    mu = [1] * (N + 1)
    is_comp = bytearray(N + 1)
    primes = []
    mu[0] = 0
    for i in range(2, N + 1):
        if not is_comp[i]:
            primes.append(i)
            mu[i] = -1
        for p in primes:
            ip = i * p
            if ip > N:
                break
            is_comp[ip] = 1
            if i % p == 0:
                mu[ip] = 0
                break
            mu[ip] = -mu[i]
    pre = [0] * (N + 1)
    for i in range(1, N + 1):
        pre[i] = pre[i - 1] + mu[i]
    return pre


_q4_MU_PRE = _q4_mu_prefix(_q4_MU_N)


def _q4_coprime_pairs(a, b):
    pre = _q4_MU_PRE
    res, d, lim = 0, 1, min(a, b)
    while d <= lim:
        qa, qb = a // d, b // d
        e = min(a // qa, b // qb)
        res += (pre[e] - pre[d - 1]) * qa * qb
        d = e + 1
    return res


def _q4_sol_gcdk(s):
    return '\n'.join(str(_q4_coprime_pairs(a // k, b // k)) for a, b, k in _q4_each(s))


_q4_check(_q4_sol_gcdk,
          lambda s: '\n'.join(str(sum(1 for x in range(1, a + 1) for y in range(1, b + 1) if _q4_pymath.gcd(x, y) == k)) for a, b, k in _q4_each(s)),
          lambda: _q4_qlines([(_q4_vr.randint(1, 60), _q4_vr.randint(1, 60), _q4_vr.randint(1, 12)) for _ in range(3)]), rounds=60)


def _q4_gen_gcdk(t=None, big=False):
    t = t or random.randint(1, 500)
    qs = []
    for _ in range(t):
        if big:
            qs.append((random.randint(150000, _q4_MU_N), random.randint(150000, _q4_MU_N), random.choice([1, 1, 1, 2, 3])))
        else:
            qs.append((random.randint(1, _q4_MU_N), random.randint(1, _q4_MU_N), random.choice([1, 2, random.randint(1, 100), random.randint(1, _q4_MU_N)])))
    return _q4_qlines(qs)


add('math-c-gcd-pairs', 'Pairs with gcd exactly k', 'math', 'inclusion-exclusion', 1900, ['math', 'mobius', 'inclusion-exclusion', 'sqrt decomposition'],
    '<p>For each query (a, b, k), count the ordered pairs (x, y) with 1 ≤ x ≤ a, 1 ≤ y ≤ b and gcd(x, y) = k.</p>'
    '<p>Checking all pairs is hopeless. First, gcd(x, y) = k means x = kx\', y = ky\' with gcd(x\', y\') = 1, so it suffices to count coprime pairs in a smaller box. Coprime pairs follow from inclusion–exclusion over the common divisor d with the Möbius function: Σ<sub>d</sub> μ(d)·⌊A/d⌋·⌊B/d⌋. With up to 500 queries, also group the d with equal (⌊A/d⌋, ⌊B/d⌋) into O(√A + √B) blocks using prefix sums of μ.</p>',
    '<p>First line T (1 ≤ T ≤ 500). Next T lines: a b k (1 ≤ a, b, k ≤ 2·10<sup>5</sup>).</p>',
    '<p>T lines, one count each.</p>', _q4_sol_gcdk,
    [_q4_qlines([(5, 5, 1), (6, 4, 2), (3, 3, 4)])],
    [_q4_qlines([(1, 1, 1), (1, 1, 2), (200000, 200000, 1), (200000, 1, 1), (200000, 200000, 200000), (200000, 199999, 100000), (100, 100, 7)])],
    _q4_gen_gcdk, n_rand=6, large=lambda: _q4_gen_gcdk(500, True))


# ─────────────────────────── probability & expectation ───────────────────────────
def _q4_sol_inv(s):
    M = _q4_MOD
    i4 = pow(4, M - 2, M)
    return '\n'.join(str(n % M * ((n - 1) % M) % M * i4 % M) for (n,) in _q4_each(s))


def _q4_brute_inv(s):
    out = []
    for (n,) in _q4_each(s):
        tot = sum(sum(1 for i in range(n) for j in range(i + 1, n) if p[i] > p[j]) for p in _q4_it.permutations(range(n)))
        out.append(str(_q4_frac_mod(_q4_Fr(tot, _q4_pymath.factorial(n)))))
    return '\n'.join(out)


_q4_check(_q4_sol_inv, _q4_brute_inv, lambda: _q4_qlines([_q4_vr.randint(1, 7) for _ in range(3)]), rounds=30)

add('math-c-expected-inversions', 'Expected inversions', 'math', 'probability', 900, ['math', 'probability', 'expectation', 'modular'],
    '<p>A permutation p of 1…n is chosen uniformly at random. An <b>inversion</b> is a pair of positions i &lt; j with p<sub>i</sub> &gt; p<sub>j</sub>. For each query n, print the expected number of inversions.</p>'
    '<p>The expectation is a rational number P/Q in lowest terms; print P·Q<sup>−1</sup> modulo 10<sup>9</sup> + 7 (Q is never divisible by 10<sup>9</sup> + 7). For example 1/2 is printed as 500000004.</p>'
    '<p>n reaches 10<sup>18</sup>, so you need a closed form. Linearity of expectation: what is the probability that one fixed pair of positions is inverted?</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: n (1 ≤ n ≤ 10<sup>18</sup>).</p>',
    '<p>T lines.</p>', _q4_sol_inv,
    [_q4_qlines([1, 2, 3])],
    [_q4_qlines([4, 10**18, _q4_MOD, _q4_MOD + 1, 2 * _q4_MOD, 999999999999999999])],
    lambda: _q4_qlines([random.choice([random.randint(1, 100), random.randint(1, 10**18)]) for _ in range(random.randint(1, 1000))]), n_rand=4)


_q4_DN = 10**6


def _q4_derange_table(N):
    M = _q4_MOD
    fact = [1] * (N + 1)
    for i in range(1, N + 1):
        fact[i] = fact[i - 1] * i % M
    inv = [1] * (N + 1)
    inv[N] = pow(fact[N], M - 2, M)
    for i in range(N, 0, -1):
        inv[i - 1] = inv[i] * i % M
    pr = [0] * (N + 1)
    acc = 0
    for i in range(N + 1):
        acc = (acc + inv[i]) % M if i % 2 == 0 else (acc - inv[i]) % M
        pr[i] = acc
    return pr


_q4_DPR = _q4_derange_table(_q4_DN)


def _q4_sol_derange(s):
    return '\n'.join(str(_q4_DPR[n]) for (n,) in _q4_each(s))


def _q4_brute_derange(s):
    out = []
    for (n,) in _q4_each(s):
        good = sum(1 for p in _q4_it.permutations(range(n)) if all(p[i] != i for i in range(n)))
        out.append(str(_q4_frac_mod(_q4_Fr(good, _q4_pymath.factorial(n)))))
    return '\n'.join(out)


_q4_check(_q4_sol_derange, _q4_brute_derange, lambda: _q4_qlines([_q4_vr.randint(1, 7) for _ in range(3)]), rounds=30)

add('math-c-derangement-prob', 'Nobody gets their own hat', 'math', 'probability', 1100, ['math', 'probability', 'inclusion-exclusion', 'modular'],
    '<p>n guests leave their hats at the door, and the hats are handed back in a uniformly random order. What is the probability that <b>no</b> guest gets their own hat back? Answer T queries.</p>'
    '<p>The probability is a fraction P/Q in lowest terms; print P·Q<sup>−1</sup> modulo 10<sup>9</sup> + 7. By inclusion–exclusion over the guests who do get their own hat, it equals Σ<sub>i=0..n</sub> (−1)<sup>i</sup>/i!. With many queries, precompute the answer for every n once.</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>4</sup>). Next T lines: n (1 ≤ n ≤ 10<sup>6</sup>).</p>',
    '<p>T lines.</p>', _q4_sol_derange,
    [_q4_qlines([1, 2, 3, 4])],
    [_q4_qlines([10**6, 999999, 5, 13, 1, 2])],
    lambda: _q4_qlines([random.choice([random.randint(1, 20), random.randint(1, _q4_DN)]) for _ in range(random.randint(1, 300))]), n_rand=5,
    large=lambda: _q4_qlines([random.randint(1, _q4_DN) for _ in range(5000)]))


_q4_CN = 10**6


def _q4_harm_table(N):
    M = _q4_MOD
    inv = [0, 1] + [0] * (N - 1)
    for i in range(2, N + 1):
        inv[i] = (M - (M // i) * inv[M % i] % M) % M
    H = [0] * (N + 1)
    for i in range(1, N + 1):
        H[i] = (H[i - 1] + inv[i]) % M
    return H


_q4_H = _q4_harm_table(_q4_CN)


def _q4_sol_coupon(s):
    M = _q4_MOD
    return '\n'.join(str(m * (_q4_H[m] - _q4_H[m - c]) % M) for m, c in _q4_each(s))


def _q4_brute_coupon(s):
    # exact expected value by a first-step Markov chain over "number of distinct faces seen"
    out = []
    for m, c in _q4_each(s):
        E = _q4_Fr(0)  # E[j] = expected further rolls when j distinct faces seen; E[c] = 0
        for j in range(c - 1, -1, -1):
            # E[j] = 1 + (j/m) E[j] + ((m-j)/m) E[j+1]
            E = (1 + _q4_Fr(m - j, m) * E) / (1 - _q4_Fr(j, m))
        out.append(str(_q4_frac_mod(E)))
    return '\n'.join(out)


_q4_check(_q4_sol_coupon, _q4_brute_coupon,
          lambda: _q4_qlines([(lambda m: (m, _q4_vr.randint(1, m)))(_q4_vr.randint(1, 40)) for _ in range(4)]))


def _q4_gen_coupon(t=None, big=False):
    t = t or random.randint(1, 300)
    qs = []
    for _ in range(t):
        m = random.randint(1, _q4_CN) if big or random.random() < 0.6 else random.randint(1, 50)
        qs.append((m, random.choice([m, random.randint(1, m)])))
    return _q4_qlines(qs)


add('math-c-coupon-collector', 'Collect c different faces', 'math', 'probability', 1300, ['math', 'probability', 'expectation', 'modular'],
    '<p>You roll a fair die with m faces again and again. What is the expected number of rolls until you have seen at least c <b>different</b> faces? Answer T queries.</p>'
    '<p>The answer is a fraction P/Q in lowest terms; print P·Q<sup>−1</sup> modulo 10<sup>9</sup> + 7. Hint: split the process into phases — while you have seen j distinct faces, each roll shows a new face with probability (m − j)/m, so the phase lasts a geometric number of rolls.</p>',
    '<p>First line T (1 ≤ T ≤ 10<sup>4</sup>). Next T lines: m c (1 ≤ c ≤ m ≤ 10<sup>6</sup>).</p>',
    '<p>T lines.</p>', _q4_sol_coupon,
    [_q4_qlines([(1, 1), (2, 2), (6, 6), (6, 2)])],
    [_q4_qlines([(10**6, 10**6), (10**6, 1), (10**6, 500000), (3, 3), (999983, 999983)])],
    _q4_gen_coupon, n_rand=5, large=lambda: _q4_gen_coupon(5000, True))


def _q4_sol_emax(s):
    m, k = map(int, s.split())
    M = _q4_MOD
    sk = 0
    for y in range(1, m):
        sk += pow(y, k, M)
    sk %= M
    return str((m - sk * pow(pow(m, k, M), M - 2, M)) % M)


def _q4_brute_emax(s):
    m, k = map(int, s.split())
    tot = sum(max(t) for t in _q4_it.product(range(1, m + 1), repeat=k))
    return str(_q4_frac_mod(_q4_Fr(tot, m ** k)))


_q4_check(_q4_sol_emax, _q4_brute_emax, lambda: f"{_q4_vr.randint(1, 6)} {_q4_vr.randint(1, 5)}\n", rounds=60)

add('math-c-expected-max', 'Expected maximum of k dice', 'math', 'probability', 1600, ['math', 'probability', 'expectation', 'fast power'],
    '<p>You roll k fair dice, each with faces 1, 2, …, m. What is the expected value of the <b>largest</b> face shown?</p>'
    '<p>The answer is a fraction P/Q in lowest terms; print P·Q<sup>−1</sup> modulo 10<sup>9</sup> + 7. k can be 10<sup>18</sup>, so you cannot enumerate outcomes or run a DP over the dice. Use the tail-sum formula E[X] = Σ<sub>x≥1</sub> P(X ≥ x), and note that P(max ≤ y) = (y/m)<sup>k</sup> because the dice are independent.</p>',
    '<p>One line: m k (1 ≤ m ≤ 2·10<sup>5</sup>, 1 ≤ k ≤ 10<sup>18</sup>).</p>',
    '<p>One integer.</p>', _q4_sol_emax,
    ["6 1\n", "2 2\n", "6 2\n"],
    ["1 1\n", "1 1000000000000000000\n", "200000 1\n", "200000 1000000000000000000\n", "199999 1000000006\n", "2 1000000006\n", "100000 2\n"],
    lambda: random.choice([f"{random.randint(1, 50)} {random.randint(1, 50)}\n",
                           f"{random.randint(1, 2 * 10**5)} {random.randint(1, 10**18)}\n"]), n_rand=6)


# ─────────────────────────── number patterns ───────────────────────────
def _q4_sol_mul(s):
    a, b = s.split()
    return str(int(a) * int(b))


def _q4_school(a, b):
    # independent brute: grade-school multiplication on digit lists
    r = [0] * (len(a) + len(b))
    for i, x in enumerate(reversed(a)):
        for j, y in enumerate(reversed(b)):
            r[i + j] += int(x) * int(y)
    carry = 0
    for i in range(len(r)):
        carry += r[i]
        r[i] = carry % 10
        carry //= 10
    t = ''.join(map(str, reversed(r))).lstrip('0')
    return t or '0'


def _q4_rand_num(L, rng):
    if L == 1:
        return str(rng.randint(0, 9))
    return str(rng.randint(1, 9)) + ''.join(rng.choice('0123456789') for _ in range(L - 1))


_q4_check(_q4_sol_mul, lambda s: _q4_school(*s.split()),
          lambda: f"{_q4_rand_num(_q4_vr.randint(1, 30), _q4_vr)}\n{_q4_rand_num(_q4_vr.randint(1, 30), _q4_vr)}\n")


def _q4_gen_mul(big=False):
    la = random.randint(1000, 2000) if big else random.randint(1, 200)
    lb = random.randint(1000, 2000) if big else random.randint(1, 200)
    return f"{_q4_rand_num(la, random)}\n{_q4_rand_num(lb, random)}\n"


add('math-c-big-multiply', 'Multiply huge numbers', 'math', 'number-patterns', 1000, ['math', 'big integers', 'strings'],
    '<p>Given two non-negative integers a and b as decimal strings, print a · b.</p>'
    '<p>Each number can have 2000 digits — far beyond 64 bits. Do what you learned at school: multiply digit by digit into an array of column sums, then propagate carries once at the end. Strip leading zeros from the result (but print <code>0</code> for zero).</p>',
    '<p>Two lines: a and b (each 1 to 2000 digits, no leading zeros unless the number is exactly <code>0</code>).</p>',
    '<p>One line: the product, without leading zeros.</p>', _q4_sol_mul,
    ["12\n34\n", "999\n999\n"],
    ["0\n0\n", "0\n123456789\n", "1\n" + '9' * 2000 + "\n", '9' * 2000 + "\n" + '9' * 2000 + "\n", "10\n" + '1' + '0' * 1999 + "\n",
     "18446744073709551616\n18446744073709551616\n"],
    _q4_gen_mul, n_rand=7, large=lambda: _q4_gen_mul(True))


_q4_DIG = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'


def _q4_to_base(x, b):
    if x == 0:
        return '0'
    out = []
    while x:
        x, r = divmod(x, b)
        out.append(_q4_DIG[r])
    return ''.join(reversed(out))


def _q4_sol_base(s):
    a, b, t = s.split()
    a, b = int(a), int(b)
    return _q4_to_base(int(t, a), b)


def _q4_brute_base(s):
    a, b, t = s.split()
    a, b = int(a), int(b)
    x = 0
    for ch in t:
        x = x * a + _q4_DIG.index(ch)
    # brute: largest power of b, then greedy digits
    if x == 0:
        return '0'
    p = 1
    while p * b <= x:
        p *= b
    out = ''
    while p:
        d = x // p
        out += _q4_DIG[d]
        x -= d * p
        p //= b
    return out


def _q4_rand_base_str(a, L, rng):
    if L == 1:
        return _q4_DIG[rng.randrange(a)]
    return _q4_DIG[rng.randint(1, a - 1)] + ''.join(_q4_DIG[rng.randrange(a)] for _ in range(L - 1))


_q4_check(_q4_sol_base, _q4_brute_base,
          lambda: (lambda a: f"{a} {_q4_vr.randint(2, 36)}\n{_q4_rand_base_str(a, _q4_vr.randint(1, 25), _q4_vr)}\n")(_q4_vr.randint(2, 36)))


def _q4_gen_base(L=None):
    a = random.randint(2, 36)
    b = random.randint(2, 36)
    L = L or random.choice([random.randint(1, 20), random.randint(1, 1000)])
    return f"{a} {b}\n{_q4_rand_base_str(a, L, random)}\n"


add('math-c-base-convert', 'Convert between bases', 'math', 'number-patterns', 1200, ['math', 'big integers', 'number bases'],
    '<p>A number t is written in base a. Print it in base b.</p>'
    '<p>Digits are <code>0</code>–<code>9</code> followed by uppercase <code>A</code>–<code>Z</code> (A = 10, …, Z = 35). t has up to 1000 digits, so it does not fit in any built-in integer type. Keep the number as an array of digits and do long division by b repeatedly — each remainder is the next digit of the answer, from least significant to most.</p>',
    '<p>First line a b (2 ≤ a, b ≤ 36). Second line t: 1 to 1000 base-a digits, no leading zeros unless t is <code>0</code>.</p>',
    '<p>One line: t in base b, uppercase, no leading zeros.</p>', _q4_sol_base,
    ["10 2\n255\n", "16 10\nFF\n", "2 36\n1000110\n"],
    ["10 10\n0\n", "36 2\nZ\n", "2 10\n1\n", "10 16\n18446744073709551616\n",
     "36 2\n" + 'Z' * 1000 + "\n", "2 36\n1" + '0' * 999 + "\n", "7 7\n" + _q4_rand_base_str(7, 300, _q4_vr) + "\n"],
    _q4_gen_base, n_rand=8)


def _q4_iroot(n, k):
    r = int(round(n ** (1.0 / k)))
    while r > 0 and r ** k > n:
        r -= 1
    while (r + 1) ** k <= n:
        r += 1
    return r


def _q4_sol_pp(s):
    out = []
    for (n,) in _q4_each(s):
        for k in range(60, 0, -1):
            r = _q4_iroot(n, k)
            if r >= 2 and r ** k == n:
                out.append(f"{r} {k}")
                break
    return '\n'.join(out)


def _q4_brute_pp(s):
    out = []
    for (n,) in _q4_each(s):
        best = (n, 1)
        for a in range(2, n + 1):
            p, k = a, 1
            while p < n:
                p *= a
                k += 1
            if p == n and k > best[1]:
                best = (a, k)
        out.append(f"{best[0]} {best[1]}")
    return '\n'.join(out)


_q4_check(_q4_sol_pp, _q4_brute_pp,
          lambda: _q4_qlines([_q4_vr.choice([_q4_vr.randint(2, 3000), _q4_vr.randint(2, 12) ** _q4_vr.randint(1, 3)]) for _ in range(4)]), rounds=60)


def _q4_gen_pp(t=None):
    t = t or random.randint(1, 1000)
    qs = []
    for _ in range(t):
        r = random.random()
        if r < 0.45:
            k = random.randint(2, 59)
            hi = _q4_iroot(10**18, k)
            if hi < 2:
                k, hi = 2, 10**9
            a = random.randint(2, hi)
            n = a ** k
            n += random.choice([0, 0, 0, -1, 1]) if n + 1 <= 10**18 else 0
            qs.append(max(2, n))
        elif r < 0.6:
            a = random.randint(10**9 - 1000, 10**9)
            qs.append(a * a + random.choice([0, -1, 1, -2 * a + 1]))
        else:
            qs.append(random.randint(2, 10**18))
    return _q4_qlines([min(q, 10**18) for q in qs])


add('math-c-perfect-power', 'Largest perfect power', 'math', 'number-patterns', 1700, ['math', 'binary search', 'number theory', 'precision'],
    '<p>For each n, write it as n = a<sup>k</sup> with integers a ≥ 2 and k ≥ 1, choosing the <b>largest possible k</b>. Print a and k. (Every n ≥ 2 has the trivial form n<sup>1</sup>.)</p>'
    '<p>Only k ≤ 59 can work since 2<sup>60</sup> &gt; 10<sup>18</sup>. For each k you need the exact integer k-th root ⌊n<sup>1/k</sup>⌋. Floating-point <code>pow(n, 1.0/k)</code> is only an estimate — near 10<sup>18</sup>, doubles cannot even represent n exactly — so correct the estimate with exact integer arithmetic, and check r<sup>k</sup> without overflowing.</p>',
    '<p>First line T (1 ≤ T ≤ 1000). Next T lines: n (2 ≤ n ≤ 10<sup>18</sup>).</p>',
    '<p>T lines: a k.</p>', _q4_sol_pp,
    [_q4_qlines([64, 12, 1000000007, 1024])],
    [_q4_qlines([2, 4, 8, 2**59, 3**37, 10**18, 999999999999999999, 999999998000000001, 999999998000000000, 999999998000000002,
                 576460752303423487, 576460752303423488, 2**58 * 3 // 3, 7**21, 999999874000003969, 10**18 - 1])],
    _q4_gen_pp, n_rand=6)


def _q4_sol_sigma(s):
    n = int(s)
    M = _q4_MOD
    tot, i = 0, 1
    while i <= n:
        q = n // i
        j = n // q
        tot += q % M * ((i + j) * (j - i + 1) // 2 % M)
        i = j + 1
    return str(tot % M)


def _q4_brute_sigma(s):
    n = int(s)
    return str(sum(d for x in range(1, n + 1) for d in range(1, x + 1) if x % d == 0) % _q4_MOD)


_q4_check(_q4_sol_sigma, _q4_brute_sigma, lambda: f"{_q4_vr.randint(1, 400)}\n", rounds=60)

add('math-c-divisor-sum-prefix', 'Sum of divisor sums', 'math', 'number-patterns', 1800, ['math', 'divisors', 'sqrt decomposition', 'modular'],
    '<p>Let σ(i) be the sum of all positive divisors of i (σ(6) = 1 + 2 + 3 + 6 = 12). Print σ(1) + σ(2) + … + σ(n) modulo 10<sup>9</sup> + 7.</p>'
    '<p>n goes up to 10<sup>11</sup>, so even an O(n) loop is too slow. Swap the order of summation: each d is a divisor of exactly ⌊n/d⌋ numbers up to n, so the sum is Σ<sub>d</sub> d·⌊n/d⌋. The quotient ⌊n/d⌋ takes only O(√n) distinct values; handle each run of equal quotients with an arithmetic-series formula.</p>',
    '<p>One integer n (1 ≤ n ≤ 10<sup>11</sup>).</p>',
    '<p>One integer: the sum modulo 10<sup>9</sup> + 7.</p>', _q4_sol_sigma,
    ["6\n", "10\n"],
    ["1\n", "2\n", "100000000000\n", "99999999977\n", "1000000007\n", "2000000014\n", "44721359549\n"],
    lambda: f"{random.choice([random.randint(1, 1000), random.randint(1, 10**8), random.randint(1, 10**11)])}\n", n_rand=6)
