"""Partial orders and lattices for the Discrete Mathematics checks (Chapter 4) and the Hasse Lab.

A poset is given by its elements (a list) and `leq(a, b)` (a callable) or a set of pairs. Everything is
brute force on small posets, so each lattice property is checked straight from its definition.
"""
import itertools
import math
from functools import lru_cache


class Poset:
    def __init__(self, elems, leq):
        self.E = list(elems)
        if callable(leq):
            self.R = {(a, b) for a in self.E for b in self.E if leq(a, b)}
        else:
            self.R = set(leq) | {(a, a) for a in self.E}
        self.idx = {e: i for i, e in enumerate(self.E)}

    def le(self, a, b):
        return (a, b) in self.R

    def lt(self, a, b):
        return a != b and self.le(a, b)

    def is_partial_order(self):
        E, R = self.E, self.R
        refl = all((a, a) in R for a in E)
        anti = all(not ((a, b) in R and (b, a) in R) or a == b for a in E for b in E)
        trans = all((a, c) in R for a in E for b in E for c in E if (a, b) in R and (b, c) in R)
        return refl and anti and trans

    def covers(self):
        """Hasse edges (a, b): a < b with nothing strictly between."""
        return sorted((a, b) for a in self.E for b in self.E if self.lt(a, b)
                      and not any(self.lt(a, c) and self.lt(c, b) for c in self.E))

    def levels(self):
        """Rank of each element = length of the longest chain below it (for drawing)."""
        rank = {}
        for e in sorted(self.E, key=lambda x: sum(self.lt(y, x) for y in self.E)):
            rank[e] = max([rank[d] + 1 for d in self.E if self.lt(d, e) and d in rank] or [0])
        return rank

    def minimal(self):
        return [a for a in self.E if not any(self.lt(b, a) for b in self.E)]

    def maximal(self):
        return [a for a in self.E if not any(self.lt(a, b) for b in self.E)]

    def least(self):
        return next((a for a in self.E if all(self.le(a, b) for b in self.E)), None)

    def greatest(self):
        return next((a for a in self.E if all(self.le(b, a) for b in self.E)), None)

    def upper_bounds(self, S):
        return [u for u in self.E if all(self.le(s, u) for s in S)]

    def lower_bounds(self, S):
        return [l for l in self.E if all(self.le(l, s) for s in S)]

    def lub(self, *S):
        ub = self.upper_bounds(S)
        return next((u for u in ub if all(self.le(u, v) for v in ub)), None)

    def glb(self, *S):
        lb = self.lower_bounds(S)
        return next((l for l in lb if all(self.le(v, l) for v in lb)), None)

    def is_lattice(self):
        return all(self.lub(a, b) is not None and self.glb(a, b) is not None for a in self.E for b in self.E)

    def lattice_failure(self):
        for a, b in itertools.combinations(self.E, 2):
            if self.lub(a, b) is None:
                return ("join", a, b)
            if self.glb(a, b) is None:
                return ("meet", a, b)
        return None

    def join(self, a, b):
        return self.lub(a, b)

    def meet(self, a, b):
        return self.glb(a, b)

    def is_distributive(self):
        J, M = self.join, self.meet
        return all(M(a, J(b, c)) == J(M(a, b), M(a, c)) for a in self.E for b in self.E for c in self.E)

    def distributive_failure(self):
        J, M = self.join, self.meet
        for a, b, c in itertools.product(self.E, repeat=3):
            if M(a, J(b, c)) != J(M(a, b), M(a, c)):
                return a, b, c
        return None

    def complements(self, a):
        z, o = self.least(), self.greatest()
        if z is None or o is None:
            return []
        return [b for b in self.E if self.join(a, b) == o and self.meet(a, b) == z]

    def is_complemented(self):
        return self.least() is not None and self.greatest() is not None and all(self.complements(a) for a in self.E)

    def is_boolean(self):
        return self.is_lattice() and self.is_distributive() and self.is_complemented()

    def chains(self):
        """All chains (non-empty totally ordered subsets)."""
        out = []
        for r in range(1, len(self.E) + 1):
            for S in itertools.combinations(self.E, r):
                if all(self.le(a, b) or self.le(b, a) for a, b in itertools.combinations(S, 2)):
                    out.append(S)
        return out

    def height(self):
        """Number of elements in a longest chain."""
        return max(len(c) for c in self.chains())

    def width(self):
        """Size of a largest antichain."""
        best = 0
        for r in range(1, len(self.E) + 1):
            for S in itertools.combinations(self.E, r):
                if all(not self.le(a, b) and not self.le(b, a) for a, b in itertools.combinations(S, 2)):
                    best = r
        return best

    def linear_extensions(self):
        """Count the total orders compatible with the poset (topological sorts)."""
        E = self.E
        n = len(E)
        below = [sum(1 << self.idx[d] for d in E if self.lt(d, e)) for e in E]

        @lru_cache(None)
        def f(mask):
            if mask == (1 << n) - 1:
                return 1
            return sum(f(mask | 1 << i) for i in range(n) if not mask >> i & 1 and below[i] & mask == below[i])
        return f(0)

    def sublattice(self, S):
        S = set(S)
        return all(self.join(a, b) in S and self.meet(a, b) in S for a in S for b in S)


def divisors(n):
    return [d for d in range(1, n + 1) if n % d == 0]


def divisor_poset(n):
    return Poset(divisors(n), lambda a, b: b % a == 0)


def subset_poset(k):
    E = [frozenset(c) for r in range(k + 1) for c in itertools.combinations(range(1, k + 1), r)]
    return Poset(E, lambda a, b: a <= b)


def poset_of(elems, leq):
    return Poset(elems, leq)


def squarefree(n):
    return all(n % (p * p) for p in range(2, int(math.isqrt(n)) + 1))


def all_posets(n):
    """Every partial order on range(n) (labelled), by brute force over the strict relations."""
    E = list(range(n))
    pairs = [(a, b) for a in E for b in E if a != b]
    for mask in range(2 ** len(pairs)):
        R = {p for j, p in enumerate(pairs) if mask >> j & 1}
        if any((b, a) in R for a, b in R):
            continue
        if any((a, c) not in R for a, b in R for b2, c in R if b == b2 and a != c):
            continue
        yield Poset(E, R)


def unlabelled_lattices(n):
    """Number of pairwise non-isomorphic lattices with n elements (brute force; n <= 6)."""
    seen = set()
    for P in all_posets(n):
        if not P.is_lattice():
            continue
        key = min(tuple(sorted((p[a], p[b]) for a, b in P.R)) for p in itertools.permutations(range(n)))
        seen.add(key)
    return len(seen)
