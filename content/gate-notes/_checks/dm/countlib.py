"""Counting for the Discrete Mathematics checks (Chapter 6) and the Counting Lab.

Closed forms (the twelvefold way, binomials, multinomials, Stirling numbers, partitions, derangements,
Catalan numbers, inclusion-exclusion, divisor counts, Legendre's formula) next to brute-force
enumerators, so every formula a lesson uses is confirmed on small cases.
"""
import itertools
import math
from functools import lru_cache

C = math.comb
P = math.perm


@lru_cache(None)
def stirling2(n, k):
    if n == k:
        return 1
    if k == 0 or k > n:
        return 0
    return k * stirling2(n - 1, k) + stirling2(n - 1, k - 1)


@lru_cache(None)
def partitions_at_most(n, k):
    """Partitions of n into at most k parts (= into parts of size at most k)."""
    if n == 0:
        return 1
    if k == 0:
        return 0
    if k > n:
        return partitions_at_most(n, n)
    return partitions_at_most(n, k - 1) + partitions_at_most(n - k, k)


def partitions_exactly(n, k):
    if k == 0:
        return 1 if n == 0 else 0
    return partitions_at_most(n - k, k) if n >= k else 0


def partitions(n):
    return partitions_at_most(n, n)


# ── The twelvefold way: n balls into k boxes ──────────────────────────────
# keys: (balls distinct?, boxes distinct?, rule) with rule in "any" | "≤1" | "≥1"

def twelvefold(n, k, balls_distinct, boxes_distinct, rule):
    if balls_distinct and boxes_distinct:
        return {"any": k ** n, "≤1": P(k, n) if n <= k else 0, "≥1": math.factorial(k) * stirling2(n, k)}[rule]
    if not balls_distinct and boxes_distinct:
        return {"any": C(n + k - 1, k - 1) if k else int(n == 0), "≤1": C(k, n), "≥1": C(n - 1, k - 1) if n >= k and k else int(n == k == 0)}[rule]
    if balls_distinct and not boxes_distinct:
        return {"any": sum(stirling2(n, j) for j in range(k + 1)), "≤1": int(n <= k), "≥1": stirling2(n, k)}[rule]
    return {"any": partitions_at_most(n, k), "≤1": int(n <= k), "≥1": partitions_exactly(n, k)}[rule]


def twelvefold_brute(n, k, balls_distinct, boxes_distinct, rule):
    """Enumerate functions balls → boxes and count classes under the symmetries."""
    seen = set()
    for f in itertools.product(range(k), repeat=n):
        counts = [f.count(b) for b in range(k)]
        if rule == "≤1" and max(counts, default=0) > 1:
            continue
        if rule == "≥1" and min(counts, default=1) < 1:
            continue
        if balls_distinct and boxes_distinct:
            key = f
        elif not balls_distinct and boxes_distinct:
            key = tuple(counts)
        elif balls_distinct and not boxes_distinct:
            key = frozenset(frozenset(i for i in range(n) if f[i] == b) for b in range(k) if counts[b])
        else:
            key = tuple(sorted(counts))
        seen.add(key)
    return len(seen)


TWELVE = [(bd, xd, r) for bd in (True, False) for xd in (True, False) for r in ("any", "≤1", "≥1")]


def stars_bars(n, k, lower=None, upper=None):
    """Solutions of x1 + … + xk = n with lower[i] <= xi <= upper[i] (brute force)."""
    lower = lower or [0] * k
    upper = upper or [n] * k
    return sum(1 for xs in itertools.product(*[range(lo, hi + 1) for lo, hi in zip(lower, upper)]) if sum(xs) == n)


def bounded_pie(n, k, upper):
    """Same count with a common upper bound u, by inclusion–exclusion: Σ (−1)^i C(k, i) C(n − i(u+1) + k − 1, k − 1)."""
    u = upper
    return sum((-1) ** i * C(k, i) * C(n - i * (u + 1) + k - 1, k - 1) for i in range(k + 1) if n - i * (u + 1) >= 0)


def multinomial(*ks):
    out = math.factorial(sum(ks))
    for x in ks:
        out //= math.factorial(x)
    return out


def word_arrangements(word):
    from collections import Counter
    return multinomial(*Counter(word).values())


def derangements(n):
    return round(math.factorial(n) * sum((-1) ** i / math.factorial(i) for i in range(n + 1))) if n else 1


def derangements_exact(n):
    return sum((-1) ** i * C(n, i) * math.factorial(n - i) for i in range(n + 1))


def derangements_brute(n):
    return sum(1 for p in itertools.permutations(range(n)) if all(p[i] != i for i in range(n)))


def word_derangements(word):
    """Distinct arrangements of the letters of word with no letter in a position it occupied."""
    n = len(word)
    out = set()
    for p in set(itertools.permutations(word)):
        if all(p[i] != word[i] for i in range(n)):
            out.add(p)
    return len(out)


def catalan(n):
    return C(2 * n, n) // (n + 1)


def onto(m, n):
    return sum((-1) ** i * C(n, i) * (n - i) ** m for i in range(n + 1))


def pie_count(N, divisors):
    """Integers in 1..N divisible by at least one of the given numbers (inclusion–exclusion on lcm)."""
    total = 0
    for r in range(1, len(divisors) + 1):
        for S in itertools.combinations(divisors, r):
            total += (-1) ** (r + 1) * (N // math.lcm(*S))
    assert total == sum(1 for x in range(1, N + 1) if any(x % d == 0 for d in divisors))
    return total


def pie_terms(sizes):
    """sizes: dict frozenset(indices) -> |intersection|; returns (union size, list of (subset, sign, size))."""
    terms = []
    union = 0
    for S, v in sorted(sizes.items(), key=lambda kv: (len(kv[0]), sorted(kv[0]))):
        sign = (-1) ** (len(S) + 1)
        terms.append((sorted(S), sign, v))
        union += sign * v
    return union, terms


def tau(n):
    return sum(1 for d in range(1, n + 1) if n % d == 0)


def tau_formula(n):
    from sympy import factorint
    out = 1
    for e in factorint(n).values():
        out *= e + 1
    return out


def legendre(n, p):
    e, q = 0, p
    while q <= n:
        e += n // q
        q *= p
    return e


def phi(n):
    from sympy import totient
    return int(totient(n))


def lattice_paths(m, n, forbidden=()):
    """Up/right paths from (0, 0) to (m, n) avoiding the forbidden points (DP)."""
    F = set(forbidden)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        for j in range(n + 1):
            if (i, j) in F:
                continue
            if i == j == 0:
                dp[i][j] = 1
            else:
                dp[i][j] = (dp[i - 1][j] if i else 0) + (dp[i][j - 1] if j else 0)
    return dp[m][n], dp


def no_two_adjacent(n_zeros, k_ones):
    """Binary strings of n zeros and k ones with no two ones adjacent: C(n+1, k)."""
    brute = sum(1 for pos in itertools.combinations(range(n_zeros + k_ones), k_ones) if all(b - a > 1 for a, b in zip(pos, pos[1:])))
    assert brute == C(n_zeros + 1, k_ones)
    return brute


def pigeonhole_min(boxes, r):
    """Least N such that every placement of N objects in `boxes` boxes puts at least r in some box."""
    return boxes * (r - 1) + 1
