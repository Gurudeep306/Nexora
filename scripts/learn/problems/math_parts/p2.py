# Math judged problems, part 2 (exec'd by ../math.py)
# Pages: sieve, divisor-functions, modular-arithmetic, fast-power.
import math as pymath
import random
import itertools as _q2_it

_q2_MOD = 10**9 + 7
_q2_T = 'math'


def _q2_check(fast, brute, gen, rounds=200):
    for _ in range(rounds):
        s = gen()
        a, b = fast(s), brute(s)
        assert a == b, (s, a, b)


def _q2_qlines(vals):
    """T, then one query per line (each query may be a tuple)."""
    return f"{len(vals)}\n" + '\n'.join(' '.join(map(str, v)) if isinstance(v, tuple) else str(v) for v in vals) + '\n'


def _q2_each(s):
    L = s.strip().split('\n')
    return [tuple(map(int, l.split())) for l in L[1:1 + int(L[0])]]


def _q2_isprime(n):
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


def _q2_rand_prime(lo, hi):
    while True:
        x = random.randint(lo, hi)
        if _q2_isprime(x):
            return x


_q2_cache = {}


def _q2_sieve(n):
    """bytearray is_prime[0..n]."""
    key = ('sieve', n)
    if key not in _q2_cache:
        s = bytearray([1]) * (n + 1)
        s[0] = 0
        if n >= 1:
            s[1] = 0
        for p in range(2, pymath.isqrt(n) + 1):
            if s[p]:
                s[p * p::p] = bytes(len(range(p * p, n + 1, p)))
        _q2_cache[key] = s
    return _q2_cache[key]


# ── 1. count primes up to n (sieve, easy) ──
_q2_CP_N = 5 * 10**6


def _q2_pi_table():
    if 'pi' not in _q2_cache:
        _q2_cache['pi'] = list(_q2_it.accumulate(_q2_sieve(_q2_CP_N)))
    return _q2_cache['pi']


def _q2_sol_count_primes(s):
    pi = _q2_pi_table()
    return '\n'.join(str(pi[n]) for (n,) in _q2_each(s))


_q2_check(_q2_sol_count_primes, lambda s: '\n'.join(str(sum(1 for x in range(2, n + 1) if _q2_isprime(x))) for (n,) in _q2_each(s)),
          lambda: _q2_qlines([random.randint(1, 300) for _ in range(5)]), 60)
add('math-c-count-primes', 'Count primes up to n', _q2_T, 'sieve', 900, ['math', 'sieve', 'prefix sums'],
    '<p>For each query n, print how many primes p satisfy p ≤ n.</p><p>There can be 10<sup>5</sup> queries with n up to 5·10<sup>6</sup>. Testing every number by trial division is far too slow. Sieve once up to the largest possible n, build a prefix count, and answer each query in O(1).</p>',
    '<p>First line Q (1 ≤ Q ≤ 10<sup>5</sup>). Next Q lines: n (1 ≤ n ≤ 5·10<sup>6</sup>).</p>', '<p>Q lines: π(n), the number of primes ≤ n.</p>', _q2_sol_count_primes,
    [_q2_qlines([10, 1, 100])], [_q2_qlines([2, 3, 4, 5]), _q2_qlines([5000000, 4999999, 1000000, 999983]), _q2_qlines([1, 1, 1])],
    lambda: _q2_qlines([random.choice([random.randint(1, 1000), random.randint(1, _q2_CP_N)]) for _ in range(random.randint(1, 1000))]), n_rand=5,
    large=lambda: _q2_qlines([random.randint(1, _q2_CP_N) for _ in range(10000)]))


# ── 2. sum and product modulo, with negatives (modular-arithmetic, easy) ──
def _q2_sol_sum_prod(s):
    v = ints(s)
    a = v[1:1 + v[0]]
    sm, pr = 0, 1
    for x in a:
        sm = (sm + x) % _q2_MOD
        pr = pr * (x % _q2_MOD) % _q2_MOD
    return f"{sm} {pr}"


def _q2_brute_sum_prod(s):
    v = ints(s)
    a = v[1:1 + v[0]]
    p = 1
    for x in a:
        p *= x
    return f"{sum(a) % _q2_MOD} {p % _q2_MOD}"


def _q2_gen_sum_prod(n=None):
    n = n or random.randint(1, SIZE)
    pool = [0, 1, -1, _q2_MOD, -_q2_MOD, _q2_MOD - 1, 10**18, -10**18]
    return arr_input([random.choice([random.randint(-10**18, 10**18), random.randint(-10**18, 10**18), random.randint(-50, 50), random.choice(pool)]) for _ in range(n)])


_q2_check(_q2_sol_sum_prod, _q2_brute_sum_prod, lambda: _q2_gen_sum_prod(random.randint(1, 8)))
add('math-c-sum-product-mod', 'Sum and product, modulo', _q2_T, 'modular-arithmetic', 800, ['math', 'modular arithmetic'],
    '<p>Given n integers, print their sum and their product, both modulo 10<sup>9</sup> + 7, as values in the range [0, 10<sup>9</sup> + 6].</p><p>The numbers can be negative and as large as 10<sup>18</sup> in absolute value. The true product has millions of digits, so reduce after every step. Remember that in C, C++, Java and JavaScript, <code>%</code> of a negative number is negative.</p>',
    '<p>The first line contains n (1 ≤ n ≤ 2·10<sup>5</sup>). The second line contains n integers a<sub>i</sub> (|a<sub>i</sub>| ≤ 10<sup>18</sup>).</p>', '<p>Two integers: the sum mod 10<sup>9</sup> + 7 and the product mod 10<sup>9</sup> + 7.</p>', _q2_sol_sum_prod,
    [arr_input([3, -5, 10]), arr_input([1000000007, 2])],
    [arr_input([-1]), arr_input([0]), arr_input([10**18, 10**18, 10**18]), arr_input([-10**18, -10**18, -10**18]), arr_input([-1] * 7), arr_input([_q2_MOD - 1, 1])],
    _q2_gen_sum_prod, n_rand=5)


# ── 3. a*b mod m with 64-bit values (modular-arithmetic, easy) ──
def _q2_sol_mulmod(s):
    return '\n'.join(str(a * b % m) for a, b, m in _q2_each(s))


def _q2_mulmod_slow(a, b, m):
    # double-and-add, the way a 64-bit language must do it
    a %= m
    b %= m
    r = 0
    while b:
        if b & 1:
            r = (r + a) % m
        a = (a + a) % m
        b >>= 1
    return r


_q2_check(_q2_sol_mulmod, lambda s: '\n'.join(str(_q2_mulmod_slow(a, b, m)) for a, b, m in _q2_each(s)),
          lambda: _q2_qlines([(random.randint(-10**18, 10**18), random.randint(-10**18, 10**18), random.randint(1, 10**18)) for _ in range(5)]))


def _q2_gen_mulmod():
    def one():
        m = random.choice([random.randint(1, 10**18), random.randint(10**18 - 1000, 10**18), random.randint(1, 100)])
        a = random.choice([random.randint(-10**18, 10**18), m - 1, -(m - 1), random.randint(-10, 10)])
        b = random.choice([random.randint(-10**18, 10**18), m - 1, -1])
        return (a, b, m)
    return _q2_qlines([one() for _ in range(random.randint(1, 1000))])


add('math-c-mulmod', 'Multiply modulo a huge m', _q2_T, 'modular-arithmetic', 1100, ['math', 'modular arithmetic', 'overflow'],
    '<p>For each query print a · b mod m as a value in [0, m − 1].</p><p>All three numbers can be as large as 10<sup>18</sup>, so even after reducing a and b below m their product needs about 120 bits and overflows a 64-bit integer. Use a 128-bit product, or multiply by doubling-and-adding (each partial sum stays below 2m &lt; 2<sup>63</sup>). a and b may be negative.</p>',
    '<p>First line Q (1 ≤ Q ≤ 10<sup>4</sup>). Next Q lines: a b m (|a|, |b| ≤ 10<sup>18</sup>, 1 ≤ m ≤ 10<sup>18</sup>).</p>', '<p>Q lines.</p>', _q2_sol_mulmod,
    [_q2_qlines([(3, 4, 5), (-7, 3, 10), (10**18, 10**18, 999999999999999989)])],
    [_q2_qlines([(0, 5, 1), (5, 5, 1), (-1, -1, 10**18), (10**18 - 1, 10**18 - 1, 10**18)]),
     _q2_qlines([(-10**18, 10**18, 10**18 - 1), (999999999999999988, 999999999999999988, 999999999999999989), (2**62, 2**62 // 3, 10**18)])],
    _q2_gen_mulmod, n_rand=5)


# ── 4. number and sum of divisors of one n (divisor-functions, easy) ──
def _q2_factor(n):
    f = []
    d = 2
    while d * d <= n:
        if n % d == 0:
            e = 0
            while n % d == 0:
                n //= d
                e += 1
            f.append((d, e))
        d += 1 if d == 2 else 2
    if n > 1:
        f.append((n, 1))
    return f


def _q2_sol_divcs(s):
    n = int(s.split()[0])
    cnt, sig = 1, 1
    for p, e in _q2_factor(n):
        cnt *= e + 1
        sig *= (p ** (e + 1) - 1) // (p - 1)
    return f"{cnt} {sig}"


def _q2_brute_divcs(s):
    n = int(s.split()[0])
    ds = [d for d in range(1, n + 1) if n % d == 0]
    return f"{len(ds)} {sum(ds)}"


_q2_check(_q2_sol_divcs, _q2_brute_divcs, lambda: f"{random.randint(1, 3000)}\n", 300)
add('math-c-divisor-count-sum', 'Number and sum of divisors', _q2_T, 'divisor-functions', 1000, ['math', 'divisors', 'factorization'],
    '<p>Print d(n), the number of positive divisors of n, and σ(n), their sum.</p><p>n goes up to 10<sup>12</sup>, so trying every candidate up to n is hopeless. Factor n = p<sub>1</sub><sup>e<sub>1</sub></sup> ⋯ p<sub>k</sub><sup>e<sub>k</sub></sup> by trial division up to √n; then d(n) = ∏(e<sub>i</sub> + 1) and σ(n) = ∏(1 + p<sub>i</sub> + … + p<sub>i</sub><sup>e<sub>i</sub></sup>).</p>',
    '<p>One integer n (1 ≤ n ≤ 10<sup>12</sup>).</p>', '<p>Two integers d(n) and σ(n) (σ(n) fits in a signed 64-bit integer).</p>', _q2_sol_divcs,
    ["12\n", "1\n"],
    ["2\n", "999999999989\n", "1000000000000\n", "963761198400\n", "999966000289\n", "549755813888\n", "999999000001\n"],
    lambda: f"{random.choice([random.randint(1, 10**12), random.randint(1, 10**6), _q2_rand_prime(10**5, 10**6) * _q2_rand_prime(10**5, 10**6)])}\n", n_rand=6)


# ── 5. factorise many numbers with a smallest-prime-factor sieve (sieve, medium) ──
_q2_SPF_N = 10**6


def _q2_spf():
    if 'spf' not in _q2_cache:
        n = _q2_SPF_N
        spf = list(range(n + 1))
        ps = [p for p in range(2, pymath.isqrt(n) + 1) if _q2_sieve(1000)[p]]
        for p in reversed(ps):          # smaller primes overwrite larger ones
            spf[p * p::p] = [p] * len(range(p * p, n + 1, p))
        _q2_cache['spf'] = spf
    return _q2_cache['spf']


def _q2_sol_spf(s):
    spf = _q2_spf()
    out = []
    for (x,) in _q2_each(s):
        f = []
        while x > 1:
            f.append(spf[x])
            x //= spf[x]
        out.append(fmt(f))
    return '\n'.join(out)


def _q2_brute_spf(s):
    return '\n'.join(fmt([p for p, e in _q2_factor(x) for _ in range(e)]) for (x,) in _q2_each(s))


_q2_check(_q2_sol_spf, _q2_brute_spf, lambda: _q2_qlines([random.choice([random.randint(2, 2000), random.randint(2, 10**6)]) for _ in range(20)]))
add('math-c-spf-factorize', 'Factorise many numbers', _q2_T, 'sieve', 1200, ['math', 'sieve', 'factorization'],
    '<p>For each query x, print its prime factors in non-decreasing order, each repeated as many times as it divides x (so their product is x).</p><p>With 10<sup>5</sup> queries, trial division up to √x each time is wasteful. Precompute the <b>smallest prime factor</b> spf[v] of every v ≤ 10<sup>6</sup> with a sieve; then repeatedly divide x by spf[x]. Each query takes O(log x) steps.</p>',
    '<p>First line Q (1 ≤ Q ≤ 10<sup>5</sup>). Next Q lines: x (2 ≤ x ≤ 10<sup>6</sup>).</p>', '<p>Q lines, the prime factors of x separated by spaces.</p>', _q2_sol_spf,
    [_q2_qlines([12, 7, 360])],
    [_q2_qlines([2, 4, 1000000, 999983, 524288, 999999, 998001, 510510])],
    lambda: _q2_qlines([random.choice([random.randint(2, 100), random.randint(2, 10**6)]) for _ in range(random.randint(1, 300))]), n_rand=5,
    large=lambda: _q2_qlines([random.randint(2, 10**6) for _ in range(6000)]))


# ── 6. coprime ordered pairs (divisor-functions, medium) — phi sieve + prefix ──
_q2_PHI_N = 10**6


def _q2_phi_prefix():
    if 'phi' not in _q2_cache:
        n = _q2_PHI_N
        phi = list(range(n + 1))
        isp = _q2_sieve(n)
        for p in range(2, n + 1):
            if isp[p]:
                phi[p::p] = [v - v // p for v in phi[p::p]]
        _q2_cache['phi'] = list(_q2_it.accumulate(phi))
    return _q2_cache['phi']


def _q2_sol_coprime(s):
    P = _q2_phi_prefix()
    return '\n'.join(str(2 * P[n] - 1) for (n,) in _q2_each(s))


_q2_check(_q2_sol_coprime, lambda s: '\n'.join(str(sum(1 for a in range(1, n + 1) for b in range(1, n + 1) if pymath.gcd(a, b) == 1)) for (n,) in _q2_each(s)),
          lambda: _q2_qlines([random.randint(1, 60) for _ in range(4)]), 60)
add('math-c-coprime-pairs', 'Coprime pairs in a square', _q2_T, 'divisor-functions', 1400, ['math', 'euler phi', 'sieve'],
    '<p>For each query n, count the ordered pairs (a, b) with 1 ≤ a, b ≤ n and gcd(a, b) = 1.</p><p>Checking all n² pairs is far too slow for n = 10<sup>6</sup>, especially with 10<sup>5</sup> queries. For a fixed larger element b ≥ 2, the number of a &lt; b coprime to b is Euler\'s φ(b). Compute φ for every value with a sieve and keep prefix sums.</p>',
    '<p>First line Q (1 ≤ Q ≤ 10<sup>5</sup>). Next Q lines: n (1 ≤ n ≤ 10<sup>6</sup>).</p>', '<p>Q lines, each the count (it fits in a signed 64-bit integer).</p>', _q2_sol_coprime,
    [_q2_qlines([1, 2, 3, 5])], [_q2_qlines([1000000, 999999, 4, 6]), _q2_qlines([1])],
    lambda: _q2_qlines([random.choice([random.randint(1, 100), random.randint(1, _q2_PHI_N)]) for _ in range(random.randint(1, 1000))]), n_rand=5,
    large=lambda: _q2_qlines([random.randint(1, _q2_PHI_N) for _ in range(7000)]))


# ── 7. d(n), sigma(n) mod p from a factorisation with huge exponents (divisor-functions, medium) ──
def _q2_sol_sigma_mod(s):
    v = ints(s)
    k = v[0]
    M = _q2_MOD
    d, sg = 1, 1
    for i in range(k):
        p, e = v[1 + 2 * i], v[2 + 2 * i]
        d = d * ((e + 1) % M) % M
        pm = p % M
        if pm == 1:
            term = (e + 1) % M
        else:
            term = (pow(pm, e + 1, M) - 1) * pow(pm - 1, M - 2, M) % M
        sg = sg * term % M
    return f"{d} {sg}"


def _q2_brute_sigma_mod(s):
    v = ints(s)
    n = 1
    for i in range(v[0]):
        n *= v[1 + 2 * i] ** v[2 + 2 * i]
    ds = set()
    for x in range(1, pymath.isqrt(n) + 1):
        if n % x == 0:
            ds |= {x, n // x}
    return f"{len(ds) % _q2_MOD} {sum(ds) % _q2_MOD}"


def _q2_fact_input(pairs):
    return f"{len(pairs)}\n" + '\n'.join(f"{p} {e}" for p, e in pairs) + '\n'


def _q2_gen_small_fact():
    ps = random.sample([2, 3, 5, 7, 11, 13], random.randint(1, 3))
    return _q2_fact_input([(p, random.randint(1, 4)) for p in ps])


_q2_check(_q2_sol_sigma_mod, _q2_brute_sigma_mod, _q2_gen_small_fact)

# primes congruent to 1 (and to 0) modulo 10^9+7, below 10^12: the r = 1 trap
_q2_ONE_PRIMES = [x for x in (k * _q2_MOD + 1 for k in range(2, 400, 2)) if _q2_isprime(x)][:3]
assert len(_q2_ONE_PRIMES) == 3
# exact check of the p ≡ 1 case with a big-integer geometric sum
assert _q2_sol_sigma_mod(_q2_fact_input([(_q2_ONE_PRIMES[0], 3)])) == f"4 {sum(_q2_ONE_PRIMES[0] ** i for i in range(4)) % _q2_MOD}"
assert _q2_sol_sigma_mod(_q2_fact_input([(_q2_MOD, 2)])) == f"3 {sum(_q2_MOD ** i for i in range(3)) % _q2_MOD}"


def _q2_gen_sigma_mod(k=None):
    k = k or random.randint(1, 1000)
    ps = set()
    while len(ps) < k:
        r = random.random()
        ps.add(random.choice(_q2_ONE_PRIMES + [_q2_MOD]) if r < 0.02 else _q2_rand_prime(2, 10**12 if r < 0.7 else 1000))
    return _q2_fact_input([(p, random.choice([random.randint(1, 10**18), random.randint(1, 5), _q2_MOD - 1, 2 * _q2_MOD - 1, _q2_MOD - 2])) for p in ps])


add('math-c-sigma-mod', 'Divisors of a giant number', _q2_T, 'divisor-functions', 1500, ['math', 'divisors', 'fast power', 'modular inverse'],
    '<p>A number n is given by its prime factorisation n = p<sub>1</sub><sup>e<sub>1</sub></sup> · p<sub>2</sub><sup>e<sub>2</sub></sup> ⋯ p<sub>k</sub><sup>e<sub>k</sub></sup>. Print d(n), its number of divisors, and σ(n), the sum of its divisors, both modulo 10<sup>9</sup> + 7.</p><p>The exponents reach 10<sup>18</sup>, so n has astronomically many digits. Use d(n) = ∏(e<sub>i</sub> + 1) and σ(n) = ∏(p<sub>i</sub><sup>e<sub>i</sub>+1</sup> − 1)/(p<sub>i</sub> − 1), with fast exponentiation and a modular inverse. Careful: some p<sub>i</sub> may be ≡ 1 (mod 10<sup>9</sup> + 7), where that denominator is 0 — and some may equal 10<sup>9</sup> + 7 itself.</p>',
    '<p>First line k (1 ≤ k ≤ 10<sup>4</sup>). Next k lines: p<sub>i</sub> e<sub>i</sub> — distinct primes 2 ≤ p<sub>i</sub> ≤ 10<sup>12</sup>, and 1 ≤ e<sub>i</sub> ≤ 10<sup>18</sup>.</p>', '<p>Two integers: d(n) mod 10<sup>9</sup> + 7 and σ(n) mod 10<sup>9</sup> + 7.</p>', _q2_sol_sigma_mod,
    [_q2_fact_input([(2, 2), (3, 1)]), _q2_fact_input([(2, 10**18)])],
    [_q2_fact_input([(_q2_ONE_PRIMES[0], 5)]), _q2_fact_input([(_q2_MOD, 10**18), (2, 1)]), _q2_fact_input([(2, _q2_MOD - 1)]),
     _q2_fact_input([(p, 10**18) for p in _q2_ONE_PRIMES]), _q2_fact_input([(999999999989, 1), (999999999959, 2)])],
    _q2_gen_sigma_mod, n_rand=6)


# ── 8. Fibonacci for n up to 1e18 (fast-power, medium) ──
def _q2_fib(n, M=_q2_MOD):
    # fast doubling: returns (F(n), F(n+1))
    a, b = 0, 1
    for bit in bin(n)[2:]:
        c = a * ((2 * b - a) % M) % M
        d = (a * a + b * b) % M
        a, b = (d, (c + d) % M) if bit == '1' else (c, d)
    return a


def _q2_brute_fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, (a + b) % _q2_MOD
    return a


_q2_check(lambda s: '\n'.join(str(_q2_fib(n)) for (n,) in _q2_each(s)), lambda s: '\n'.join(str(_q2_brute_fib(n)) for (n,) in _q2_each(s)),
          lambda: _q2_qlines([random.randint(0, 3000) for _ in range(5)]), 50)
add('math-c-fib-matrix', 'Huge Fibonacci numbers', _q2_T, 'fast-power', 1400, ['math', 'matrix exponentiation', 'fast power'],
    '<p>F(0) = 0, F(1) = 1, F(n) = F(n − 1) + F(n − 2). For each query print F(n) mod 10<sup>9</sup> + 7.</p><p>n reaches 10<sup>18</sup>, so iterating is out. The step (F(n), F(n+1)) → (F(n+1), F(n) + F(n+1)) is multiplication by the matrix [[0, 1], [1, 1]]; raise it to the n-th power by repeated squaring in O(log n).</p>',
    '<p>First line Q (1 ≤ Q ≤ 1000). Next Q lines: n (0 ≤ n ≤ 10<sup>18</sup>).</p>', '<p>Q lines.</p>', lambda s: '\n'.join(str(_q2_fib(n)) for (n,) in _q2_each(s)),
    [_q2_qlines([0, 1, 10, 100])], [_q2_qlines([2, 3, 10**18, 10**18 - 1, 2 * 10**9 + 16, 2**59, 2**60 - 1])],
    lambda: _q2_qlines([random.choice([random.randint(0, 100), random.randint(0, 10**18)]) for _ in range(random.randint(1, 1000))]), n_rand=5)


# ── 9. power tower a^(b^c) mod p (modular-arithmetic, medium) ──
def _q2_tower(a, b, c, M=_q2_MOD):
    if a % M == 0:
        e_zero = (b == 0 and c > 0)        # b^c = 0 only for b = 0, c > 0 (0^0 = 1)
        return 1 if e_zero else 0
    return pow(a % M, pow(b, c, M - 1), M)   # Fermat: exponent lives mod p - 1


def _q2_sol_tower(s):
    return '\n'.join(str(_q2_tower(a, b, c)) for a, b, c in _q2_each(s))


_q2_check(_q2_sol_tower, lambda s: '\n'.join(str(pow(a, b ** c, _q2_MOD)) for a, b, c in _q2_each(s)),
          lambda: _q2_qlines([(random.choice([0, 1, 2, random.randint(0, 10**18), _q2_MOD, 2 * _q2_MOD, _q2_MOD + 1]), random.randint(0, 12), random.randint(0, 5)) for _ in range(5)]), 150)
_q2_check(_q2_sol_tower, lambda s: '\n'.join(str(pow(a, b ** c, _q2_MOD)) for a, b, c in _q2_each(s)),
          lambda: _q2_qlines([(random.randint(0, 10**18), random.choice([_q2_MOD - 1, 2 * (_q2_MOD - 1), random.randint(0, 10**6)]), random.randint(0, 3)) for _ in range(3)]), 30)


def _q2_gen_tower():
    def one():
        a = random.choice([random.randint(0, 10**18), random.randint(0, 10), _q2_MOD * random.randint(0, 10**9)])
        b = random.choice([random.randint(0, 10**18), random.randint(0, 3), (_q2_MOD - 1) * random.randint(1, 10**9)])
        c = random.choice([random.randint(0, 10**18), random.randint(0, 3)])
        return (a, b, c)
    return _q2_qlines([one() for _ in range(random.randint(1, 1000))])


add('math-c-power-tower', 'Power tower modulo a prime', _q2_T, 'modular-arithmetic', 1600, ['math', 'fermat', 'fast power'],
    '<p>For each query print a<sup>(b<sup>c</sup>)</sup> mod p, where p = 10<sup>9</sup> + 7 is prime. Use the convention 0<sup>0</sup> = 1 at both levels.</p><p>The exponent b<sup>c</sup> can have about 10<sup>19</sup> digits, so it cannot be computed. When p does not divide a, Fermat\'s little theorem gives a<sup>p−1</sup> ≡ 1, so only b<sup>c</sup> mod (p − 1) matters. When p divides a, the answer is 0 unless the exponent is exactly 0.</p>',
    '<p>First line Q (1 ≤ Q ≤ 1000). Next Q lines: a b c (0 ≤ a, b, c ≤ 10<sup>18</sup>).</p>', '<p>Q lines.</p>', _q2_sol_tower,
    [_q2_qlines([(2, 3, 2), (3, 0, 0), (5, 1000000006, 1)])],
    [_q2_qlines([(0, 0, 0), (0, 0, 1), (0, 5, 0), (_q2_MOD, 0, 7), (_q2_MOD, 0, 0), (_q2_MOD, 10**18, 10**18), (2 * _q2_MOD, 0, 10**18)]),
     _q2_qlines([(2, _q2_MOD - 1, 1), (2, _q2_MOD - 1, 10**18), (10**18, 10**18, 10**18), (1, 10**18, 10**18), (_q2_MOD + 1, 2, 3)])],
    _q2_gen_tower, n_rand=5)


# ── 10. primes in a window [L, R] with R up to 1e12 (sieve, hard) ──
def _q2_seg_count(L, R):
    size = R - L + 1
    seg = bytearray([1]) * size
    if L <= 1:
        seg[:2 - L] = bytes(2 - L)
    lim = pymath.isqrt(R)
    if 'plist' not in _q2_cache:
        base = _q2_sieve(10**6)
        _q2_cache['plist'] = [p for p in range(2, 10**6 + 1) if base[p]]
    for p in _q2_cache['plist']:
        if p > lim:
            break
        start = max(p * p, (L + p - 1) // p * p)
        if start <= R:
            seg[start - L::p] = bytes(len(range(start - L, size, p)))
    return seg.count(1)


def _q2_sol_seg(s):
    L, R = map(int, s.split())
    return str(_q2_seg_count(L, R))


_q2_check(_q2_sol_seg, lambda s: str(sum(1 for x in range(int(s.split()[0]), int(s.split()[1]) + 1) if _q2_isprime(x))),
          lambda: (lambda L: f"{L} {L + random.randint(0, 300)}\n")(random.choice([1, 2, random.randint(1, 3000), random.randint(1, 10**12 - 400)])), 60)


def _q2_gen_seg():
    w = random.choice([10**6, random.randint(0, 10**6), random.randint(0, 1000)])
    L = random.choice([random.randint(1, 10**12 - w), 10**12 - w, random.randint(1, 10**7)])
    return f"{L} {L + w}\n"


add('math-c-segmented-sieve', 'Primes in a far-away window', _q2_T, 'sieve', 1700, ['math', 'sieve', 'segmented sieve'],
    '<p>Count the primes p with L ≤ p ≤ R.</p><p>R can be 10<sup>12</sup>: a sieve up to R would need a terabyte, and primality-testing each of the 10<sup>6</sup> numbers by trial division costs 10<sup>6</sup> · 10<sup>6</sup>. Instead sieve the primes up to √R ≤ 10<sup>6</sup>, then use each of them to cross out its multiples <b>inside the window</b> only (a <i>segmented sieve</i>).</p>',
    '<p>One line: L R (1 ≤ L ≤ R ≤ 10<sup>12</sup>, R − L ≤ 10<sup>6</sup>).</p>', '<p>One integer: the number of primes in [L, R].</p>', _q2_sol_seg,
    ["1 10\n", "100 200\n"],
    ["1 1\n", "2 2\n", "1 1000001\n", "999999000000 1000000000000\n", "999999999989 999999999989\n", "999999999990 1000000000000\n",
     "1000000 2000000\n", "4294967296 4295967296\n"],
    _q2_gen_seg, n_rand=7)


# ── 11. k-term linear recurrence via matrix power (fast-power, hard) ──
def _q2_matmul(A, B, M=_q2_MOD):
    k = len(A)
    Bt = list(zip(*B))
    return [[sum(a * b for a, b in zip(row, col)) % M for col in Bt] for row in A]


def _q2_sol_linrec(s):
    v = ints(s)
    k, n = v[0], v[1]
    c = v[2:2 + k]
    a = v[2 + k:2 + 2 * k]
    if n < k:
        return str(a[n] % _q2_MOD)
    # state (a_{m+k-1}, ..., a_m); companion matrix maps it to the next state
    Mx = [c[:]] + [[1 if j == i else 0 for j in range(k)] for i in range(k - 1)]
    R = [[1 if i == j else 0 for j in range(k)] for i in range(k)]
    e = n - (k - 1)
    while e:
        if e & 1:
            R = _q2_matmul(R, Mx)
        Mx = _q2_matmul(Mx, Mx)
        e >>= 1
    state = a[::-1]
    return str(sum(x * y for x, y in zip(R[0], state)) % _q2_MOD)


def _q2_brute_linrec(s):
    v = ints(s)
    k, n = v[0], v[1]
    c = v[2:2 + k]
    a = v[2 + k:2 + 2 * k]
    while len(a) <= n:
        a.append(sum(c[i] * a[-1 - i] for i in range(k)) % _q2_MOD)
    return str(a[n] % _q2_MOD)


def _q2_gen_linrec(nmax=10**18, k=None):
    k = k or random.randint(1, 10)
    n = random.choice([random.randint(0, nmax), random.randint(0, 15)])
    c = [random.choice([random.randint(0, _q2_MOD - 1), random.randint(0, 3), _q2_MOD - 1]) for _ in range(k)]
    a = [random.choice([random.randint(0, _q2_MOD - 1), random.randint(0, 3)]) for _ in range(k)]
    return f"{k} {n}\n{fmt(c)}\n{fmt(a)}\n"


_q2_check(_q2_sol_linrec, _q2_brute_linrec, lambda: _q2_gen_linrec(300), 200)
add('math-c-linear-recurrence', 'Linear recurrence, far ahead', _q2_T, 'fast-power', 1800, ['math', 'matrix exponentiation', 'linear recurrence'],
    '<p>A sequence satisfies a<sub>m</sub> = c<sub>1</sub>·a<sub>m−1</sub> + c<sub>2</sub>·a<sub>m−2</sub> + … + c<sub>k</sub>·a<sub>m−k</sub> (mod 10<sup>9</sup> + 7) for every m ≥ k. Given a<sub>0</sub>, …, a<sub>k−1</sub>, print a<sub>n</sub> mod 10<sup>9</sup> + 7.</p><p>n can be 10<sup>18</sup>. Put the last k values in a vector; one step of the recurrence is multiplication by a k × k <i>companion matrix</i>, so a<sub>n</sub> comes from that matrix raised to a power — O(k<sup>3</sup> log n) with fast exponentiation.</p>',
    '<p>First line: k n (1 ≤ k ≤ 10, 0 ≤ n ≤ 10<sup>18</sup>). Second line: c<sub>1</sub> … c<sub>k</sub>. Third line: a<sub>0</sub> … a<sub>k−1</sub>. All c<sub>i</sub>, a<sub>i</sub> are in [0, 10<sup>9</sup> + 6].</p>', '<p>One integer: a<sub>n</sub> mod 10<sup>9</sup> + 7.</p>', _q2_sol_linrec,
    ["2 10\n1 1\n0 1\n", "3 5\n1 1 1\n0 0 1\n"],
    ["1 0\n5\n7\n", "1 1000000000000000000\n2\n1\n", "2 1000000000000000000\n1 1\n0 1\n", "10 9\n1 1 1 1 1 1 1 1 1 1\n1 2 3 4 5 6 7 8 9 10\n",
     "10 1000000000000000000\n1000000006 1000000006 1000000006 1000000006 1000000006 1000000006 1000000006 1000000006 1000000006 1000000006\n1000000006 1000000006 1000000006 1000000006 1000000006 1000000006 1000000006 1000000006 1000000006 1000000006\n",
     "3 10\n0 0 0\n5 6 7\n"],
    _q2_gen_linrec, n_rand=8)


# ── 12. sum of sigma(k) for k ≤ n, n up to 1e12 (divisor-functions, hard) ──
def _q2_sol_sigma_sum(s):
    n = int(s.split()[0])
    r = pymath.isqrt(n)
    # hyperbola: sum_{d*q <= n} d = sum_{d<=r} d*floor(n/d) + sum_{q<=r} T(floor(n/q)) - r*T(r)
    tot = 0
    for i in range(1, r + 1):
        q = n // i
        tot += i * q + q * (q + 1) // 2
    tot -= r * (r * (r + 1) // 2)
    return str(tot % _q2_MOD)


def _q2_brute_sigma_sum(s):
    n = int(s.split()[0])
    return str(sum(d * (n // d) for d in range(1, n + 1)) % _q2_MOD)


_q2_check(_q2_sol_sigma_sum, _q2_brute_sigma_sum, lambda: f"{random.randint(1, 5000)}\n", 200)
add('math-c-sigma-prefix', 'Sum of all divisor sums', _q2_T, 'divisor-functions', 1800, ['math', 'divisors', 'sqrt decomposition'],
    '<p>Print σ(1) + σ(2) + … + σ(n) modulo 10<sup>9</sup> + 7, where σ(k) is the sum of the positive divisors of k.</p><p>n goes up to 10<sup>12</sup>. Swap the order of summation: each d ≤ n divides exactly ⌊n/d⌋ of the numbers 1…n, so the answer is Σ d·⌊n/d⌋. That is still O(n) terms, but ⌊n/d⌋ takes only O(√n) distinct values — handle each block of equal quotients at once (or split the pairs (d, q) with d·q ≤ n at √n).</p>',
    '<p>One integer n (1 ≤ n ≤ 10<sup>12</sup>).</p>', '<p>One integer: the sum modulo 10<sup>9</sup> + 7.</p>', _q2_sol_sigma_sum,
    ["5\n", "10\n"],
    ["1\n", "2\n", "1000000000000\n", "999999999999\n", "999999999989\n", "999966000289\n", "44721359\n"],
    lambda: f"{random.choice([random.randint(1, 10**12), random.randint(1, 10**6), random.randint(10**12 - 10**6, 10**12)])}\n", n_rand=6)
