"""Sets, relations and functions for the Discrete Mathematics checks (Chapter 3) and the Relation Lab.

Relations on A = range(n) (or any list) are frozensets of pairs. Everything is brute force and small,
so the checks can enumerate every relation on up to 3–4 elements and compare with the closed formulas
the lessons prove.
"""
import itertools
import math
from functools import lru_cache


def pairs(A):
    return [(a, b) for a in A for b in A]


def all_relations(A):
    P = pairs(A)
    for mask in range(2 ** len(P)):
        yield frozenset(p for j, p in enumerate(P) if mask >> j & 1)


def reflexive(R, A):
    return all((a, a) in R for a in A)


def irreflexive(R, A):
    return all((a, a) not in R for a in A)


def symmetric(R, A=None):
    return all((b, a) in R for a, b in R)


def antisymmetric(R, A=None):
    return all(a == b or (b, a) not in R for a, b in R)


def asymmetric(R, A=None):
    return all((b, a) not in R for a, b in R)


def transitive(R, A=None):
    return all((a, d) in R for a, b in R for c, d in R if b == c)


def equivalence(R, A):
    return reflexive(R, A) and symmetric(R) and transitive(R)


def partial_order(R, A):
    return reflexive(R, A) and antisymmetric(R) and transitive(R)


PROPS = {"reflexive": reflexive, "irreflexive": irreflexive, "symmetric": symmetric, "antisymmetric": antisymmetric,
         "asymmetric": asymmetric, "transitive": transitive}


def props(R, A):
    return {k: (f(R, A)) for k, f in PROPS.items()}


def violations(R, A):
    """For each property, a witness of failure (None when it holds)."""
    out = {}
    out["reflexive"] = next(((a, a) for a in A if (a, a) not in R), None)
    out["irreflexive"] = next(((a, a) for a in A if (a, a) in R), None)
    out["symmetric"] = next(((a, b) for a, b in sorted(R) if (b, a) not in R), None)
    out["antisymmetric"] = next(((a, b) for a, b in sorted(R) if a != b and (b, a) in R), None)
    out["asymmetric"] = next(((a, b) for a, b in sorted(R) if (b, a) in R), None)
    out["transitive"] = next(((a, b, d) for a, b in sorted(R) for c, d in sorted(R) if b == c and (a, d) not in R), None)
    return out


def compose(R, S):
    """R ∘ S in the 'first R then S' convention used in GATE: {(a, c) : (a, b) ∈ R, (b, c) ∈ S}."""
    return frozenset((a, d) for a, b in R for c, d in S if b == c)


def inverse(R):
    return frozenset((b, a) for a, b in R)


def power(R, k, A):
    out = frozenset((a, a) for a in A)
    for _ in range(k):
        out = compose(out, R)
    return out


def reflexive_closure(R, A):
    return frozenset(R) | {(a, a) for a in A}


def symmetric_closure(R):
    return frozenset(R) | inverse(R)


def transitive_closure(R, A):
    """Warshall's algorithm; returns the closure and the matrix after each k (for the animation)."""
    A = list(A)
    idx = {a: i for i, a in enumerate(A)}
    n = len(A)
    M = [[(A[i], A[j]) in R for j in range(n)] for i in range(n)]
    stages = [[row[:] for row in M]]
    for k in range(n):
        for i in range(n):
            if M[i][k]:
                for j in range(n):
                    if M[k][j]:
                        M[i][j] = True
        stages.append([row[:] for row in M])
    clo = frozenset((A[i], A[j]) for i in range(n) for j in range(n) if M[i][j])
    assert clo == _tc_naive(R, A), "Warshall disagrees with the naive closure"
    del idx
    return clo, stages


def _tc_naive(R, A):
    T = frozenset(R)
    while True:
        T2 = T | compose(T, T)
        if T2 == T:
            return T
        T = T2


def equivalence_closure(R, A):
    return transitive_closure(symmetric_closure(reflexive_closure(R, A)), A)[0]


def classes(R, A):
    out, seen = [], set()
    for a in A:
        if a in seen:
            continue
        c = sorted(b for b in A if (a, b) in R)
        seen |= set(c)
        out.append(c)
    return out


def from_partition(blocks):
    return frozenset((a, b) for B in blocks for a in B for b in B)


def set_partitions(items):
    items = list(items)
    if not items:
        yield []
        return
    first, rest = items[0], items[1:]
    for p in set_partitions(rest):
        for i in range(len(p)):
            yield p[:i] + [[first] + p[i]] + p[i + 1:]
        yield [[first]] + p


@lru_cache(None)
def stirling2(n, k):
    if n == k:
        return 1
    if k == 0 or k > n:
        return 0
    return k * stirling2(n - 1, k) + stirling2(n - 1, k - 1)


def bell(n):
    return sum(stirling2(n, k) for k in range(n + 1))


# ── Closed-form counts of relation families on an n-set (proved in dm-03-02) ──

def count_formulas(n):
    m = n * (n - 1) // 2
    return {
        "all": 2 ** (n * n),
        "reflexive": 2 ** (n * n - n),
        "irreflexive": 2 ** (n * n - n),
        "symmetric": 2 ** (n * (n + 1) // 2),
        "antisymmetric": 2 ** n * 3 ** m,
        "asymmetric": 3 ** m,
        "reflexive+symmetric": 2 ** m,
        "reflexive+antisymmetric": 3 ** m,
        "symmetric+antisymmetric": 2 ** n,
        "neither reflexive nor irreflexive": 2 ** (n * n) - 2 * 2 ** (n * n - n),
        "equivalence": bell(n),
    }


def count_brute(n):
    A = list(range(n))
    c = {k: 0 for k in count_formulas(n)}
    for R in all_relations(A):
        p = props(R, A)
        c["all"] += 1
        c["reflexive"] += p["reflexive"]
        c["irreflexive"] += p["irreflexive"]
        c["symmetric"] += p["symmetric"]
        c["antisymmetric"] += p["antisymmetric"]
        c["asymmetric"] += p["asymmetric"]
        c["reflexive+symmetric"] += p["reflexive"] and p["symmetric"]
        c["reflexive+antisymmetric"] += p["reflexive"] and p["antisymmetric"]
        c["symmetric+antisymmetric"] += p["symmetric"] and p["antisymmetric"]
        c["neither reflexive nor irreflexive"] += (not p["reflexive"]) and (not p["irreflexive"])
        c["equivalence"] += p["reflexive"] and p["symmetric"] and p["transitive"]
    return c


# ── Functions ─────────────────────────────────────────────────────────────

def all_functions(A, B):
    for vals in itertools.product(B, repeat=len(A)):
        yield dict(zip(A, vals))


def injective(f):
    return len(set(f.values())) == len(f)


def surjective(f, B):
    return set(f.values()) == set(B)


def bijective(f, B):
    return injective(f) and surjective(f, B)


def image(f, E):
    return {f[x] for x in E}


def preimage(f, Y):
    return {x for x in f if f[x] in Y}


def count_functions(m, n):
    """Functions from an m-set to an n-set: all, injective, surjective, bijective."""
    inj = math.perm(n, m) if m <= n else 0
    sur = math.factorial(n) * stirling2(m, n) if n <= m else 0
    return {"all": n ** m, "injective": inj, "surjective": sur, "bijective": math.factorial(n) if m == n else 0}


def onto_pie(m, n):
    return sum((-1) ** i * math.comb(n, i) * (n - i) ** m for i in range(n + 1))


def involutions(n):
    """Functions f on an n-set with f(f(x)) = x: Σ_k n! / (k! 2^k (n−2k)!)."""
    return sum(math.factorial(n) // (math.factorial(k) * 2 ** k * math.factorial(n - 2 * k)) for k in range(n // 2 + 1))


def powerset(S):
    S = list(S)
    return [frozenset(c) for r in range(len(S) + 1) for c in itertools.combinations(S, r)]
