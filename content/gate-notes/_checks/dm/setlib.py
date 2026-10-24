"""Set helpers for the Chapter 3 checks (Lesson 1: sets, operations and identities).

Set expressions are Python callables over a dict of sets, e.g. ``lambda s: (s["A"] - s["B"]) - s["C"]``;
the universe is ``s["U"]``. Two independent deciders are provided and the checks use both:

- **region semantics** (``regions_of``): evaluate the expression on the 2^k Venn regions, coded as
  strings like "AB" (in A and B, not in C) and "-" (outside every set). By the region theorem of the
  lesson, an identity holds for all sets iff both sides cover the same regions, and X ⊆ Y for all sets
  iff regions(X) ⊆ regions(Y);
- **brute force** (``brute_equal``, ``brute_subset``): every assignment of subsets of a small universe.

Plus nested sets (frozensets), characteristic bit vectors, and counting tuples of subsets.
"""
import itertools
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from rellib import powerset  # noqa: E402,F401  (re-exported for the lesson checks)

E = frozenset()  # ∅


def fs(*xs):
    """A frozenset literal: fs(1, fs(2)) is {1, {2}}."""
    return frozenset(xs)


def show(x):
    """A readable roster: show(fs(E, fs(E))) == '{∅, {∅}}' (elements sorted by their text)."""
    if isinstance(x, frozenset):
        if not x:
            return "∅"
        return "{" + ", ".join(sorted((show(y) for y in x), key=lambda s: (len(s), s))) + "}"
    return str(x)


def is_subset(X, S):
    return isinstance(X, frozenset) and X <= S


# ── Venn regions ───────────────────────────────────────────────────────────

def region_names(names="ABC"):
    """All 2^k region codes in a fixed order: ABC, AB, AC, A, BC, B, C, - (for k = 3)."""
    out = []
    for bits in itertools.product((1, 0), repeat=len(names)):
        out.append("".join(n for n, b in zip(names, bits) if b) or "-")
    return out


def region_universe(names="ABC"):
    U = frozenset(region_names(names))
    sets = {n: frozenset(r for r in U if n in r) for n in names}
    sets["U"] = U
    return sets


def regions_of(expr, names="ABC"):
    """The regions an expression covers, in region_names order."""
    got = expr(region_universe(names))
    return [r for r in region_names(names) if r in got]


def identity(f, g, names="ABC"):
    return regions_of(f, names) == regions_of(g, names)


def always_subset(f, g, names="ABC"):
    return set(regions_of(f, names)) <= set(regions_of(g, names))


def assignments(names="ABC", n=3):
    """Every assignment of subsets of U = {0, ..., n-1} to the names (with s['U'])."""
    U = frozenset(range(n))
    subs = powerset(U)
    for combo in itertools.product(subs, repeat=len(names)):
        s = dict(zip(names, combo))
        s["U"] = U
        yield s


def brute_equal(f, g, names="ABC", n=3):
    """None if f == g for every assignment over an n-element universe, else a counterexample."""
    for s in assignments(names, n):
        if f(s) != g(s):
            return s
    return None


def brute_subset(f, g, names="ABC", n=3):
    for s in assignments(names, n):
        if not f(s) <= g(s):
            return s
    return None


def membership_table(exprs, names="ABC"):
    """Rows (one per membership pattern, 1s first) of 0/1 values of the names and the expressions."""
    rows = []
    for bits in itertools.product((1, 0), repeat=len(names)):
        code = "".join(n for n, b in zip(names, bits) if b) or "-"
        s = region_universe(names)
        rows.append(list(bits) + [int(code in e(s)) for e in exprs])
    return rows


# ── Bit vectors ────────────────────────────────────────────────────────────

def bits(X, U):
    """Characteristic string of X over the ordered universe U (list)."""
    return "".join("1" if u in X else "0" for u in U)


def from_bits(b, U):
    return frozenset(u for u, c in zip(U, b) if c == "1")


def bitop(a, b, op):
    f = {"or": lambda x, y: x | y, "and": lambda x, y: x & y, "xor": lambda x, y: x ^ y,
         "andnot": lambda x, y: x & (1 - y)}[op]
    return "".join(str(f(int(x), int(y))) for x, y in zip(a, b))


# ── Counting tuples of subsets ─────────────────────────────────────────────

def count_tuples(n, k, pred):
    """Number of k-tuples (A1, ..., Ak) of subsets of {0..n-1} with pred(*tuple) true (brute force)."""
    subs = powerset(range(n))
    return sum(1 for t in itertools.product(subs, repeat=k) if pred(*t))


def allowed_patterns(k, pred):
    """Membership patterns (b1..bk) of one element allowed by pred on single-element sets.

    pred is the same condition as in count_tuples, evaluated on the one-element universe {0}; by the
    per-element principle the count over an n-set is len(allowed_patterns) ** n when the condition is
    'every element satisfies a local rule'.
    """
    out = []
    for bits_ in itertools.product((0, 1), repeat=k):
        sets = [frozenset({0}) if b else frozenset() for b in bits_]
        if pred(*sets):
            out.append(bits_)
    return out
