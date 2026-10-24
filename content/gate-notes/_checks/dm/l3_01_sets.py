"""Checks for dm/03-sets-relations-functions/01-sets: membership versus subset on nested sets (frozensets),
power-set sizes and laws, Cartesian products, the operations and the algebra of Δ, bit vectors, every
identity (by region semantics and by brute force over all assignments of subsets of a small universe),
the per-element counts (closed form against enumeration), every worked example, all fourteen PYQ keys and
the ten practice answers."""
import itertools
import math
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib as D  # noqa: E402
import logiclib as L  # noqa: E402
import setlib as S  # noqa: E402
from setlib import E, fs  # noqa: E402

B = D.bank()
P = D.practice(3)
TXT = D.lesson_text(3, "01")
PS = lambda X: frozenset(S.powerset(X))  # noqa: E731
R = S.regions_of
ABC = "ABC"


def both_ways(f, g, names=ABC, n=3):
    """f == g for all sets, by regions and by brute force (and the two deciders agree)."""
    r = S.identity(f, g, names)
    b = S.brute_equal(f, g, names, n) is None
    assert r == b, "region semantics and brute force disagree"
    return r


def sub_ways(f, g, names=ABC, n=3):
    r = S.always_subset(f, g, names)
    b = S.brute_subset(f, g, names, n) is None
    assert r == b
    return r


# ── Basics, ∅ vs {∅}, equality theorem (set-def, special-sets, trap-empty-vs-singleton, equality-theorem) ──
assert fs(1, 2, 2, 3) == fs(3, 1, 2) and len(fs(1, fs(1), fs(1, 2))) == 3
assert len(E) == 0 and len(fs(E)) == 1 and len(fs(E, fs(E))) == 2 and E != fs(E)
for X in S.powerset(range(3)):
    assert E <= X and X <= X
assert not (E in E) and PS(E) == fs(E)

# ── Membership versus subset (member-subset-bridge, trick-strip-braces, trap-member-transitive) ──
for x in [1, fs(1), E, fs(E)]:
    for Sx in [fs(1, fs(1)), fs(E), fs(fs(1)), fs(E, fs(E))]:
        assert (x in Sx) == (fs(x) <= Sx) and (fs(x) in PS(Sx)) == (fs(x) <= Sx)
assert 1 in fs(1) and fs(1) in fs(fs(1)) and 1 not in fs(fs(1))                  # proof-bridge
S6 = fs(5, fs(6))
assert fs(6) in S6 and not fs(6) <= S6 and fs(fs(6)) <= S6                         # trick-strip-braces
assert 5 not in fs(fs(5), 7)                                                       # trap-member-transitive
T = fs(1, fs(1), fs(1, fs(1)), E, fs(1))
assert len(T) == 4                                                                  # ex-mem-easy
Sm = fs(E, fs(E))
assert [E in Sm, E <= Sm, fs(E) in Sm, fs(E) <= Sm, fs(fs(E)) <= Sm, fs(fs(E)) in Sm] == [True] * 5 + [False]  # ex-mem-medium
A_ = fs("a", fs("b"), fs("c"))
PA = PS(A_)
assert [E in PA, E <= PA, fs("a", fs("b")) in PA, fs("a", fs("b")) <= PA] == [True, True, True, False]  # ex-mem-gate
assert fs("b") not in PA
A1 = fs(1, 2)
B1 = fs(A1, 3)
C1 = fs(B1)
assert 1 not in B1 and A1 not in C1 and not A1 <= B1 and fs(A1) <= B1             # ex-mem-edge

# ── Power sets (powerset-size, nested-powerset, powerset-meet, powerset-self, traps) ──
for n in range(7):
    X = range(n)
    ps = S.powerset(X)
    assert len(ps) == 2 ** n and sum(math.comb(n, k) for k in range(n + 1)) == 2 ** n
    assert sum(1 for Y in ps if Y != frozenset(X)) == 2 ** n - 1
    assert sorted(S.bits(Y, list(X)) for Y in ps) == sorted("".join(b) for b in itertools.product("01", repeat=n))
pe = PS(E)
ppe = PS(pe)
pppe = PS(ppe)
assert pe == fs(E) and ppe == fs(E, fs(E)) and pppe == fs(E, fs(E), fs(fs(E)), fs(E, fs(E))) and len(pppe) == 4
for n in range(1, 5):
    A = range(n)
    assert len(PS(list(itertools.product(A, A)))) == 2 ** (n * n) if n <= 3 else True
    assert len(PS(PS(A))) == 2 ** 2 ** n if n <= 3 else True
assert 2 ** 2 ** 2 == 2 ** (2 * 2) == 16 and 2 ** 4 == 4 ** 2 and (2 ** 8, 2 ** 9) == (256, 512)  # nested-powerset sanity
assert ((2 ** 3) ** 2, 2 ** 9, 2 ** 8) == (64, 512, 256)                            # trap-powerset-exponent
for A in S.powerset(range(3)):                                                       # powerset-meet 1–3
    for Bb in S.powerset(range(3)):
        assert PS(A & Bb) == PS(A) & PS(Bb)
        assert PS(A) | PS(Bb) <= PS(A | Bb)
        assert (PS(A) | PS(Bb) == PS(A | Bb)) == (A <= Bb or Bb <= A)
        assert (A <= Bb) == (PS(A) <= PS(Bb))
for Sx in [fs(1, 2), fs(1, 2, 3), fs(E), fs(E, fs(E)), fs(1, fs(1)), E]:               # powerset-self
    p = PS(Sx)
    assert E in p and Sx in p and E <= p
    assert p & PS(p) == PS(Sx & p)
    assert (p & PS(p) == fs(E)) == (not (Sx & p))
assert PS(fs(1, 2)) & PS(PS(fs(1, 2))) == fs(E)                                       # ex-ps-edge
assert PS(fs(E)) & PS(PS(fs(E))) == fs(E, fs(E))
for Sx in [fs(1), fs(1, 2), fs(E), fs(1, 2, 3)]:                                     # trap-always-true: A, C, D false
    p = PS(Sx)
    assert PS(p) != p and (p & Sx) != p and Sx in p
assert len(PS("xyz")) == 8 and sum(1 for Y in PS("xyz") if len(Y) == 2) == 3        # ex-ps-easy
Sp = fs(E, fs(1, 2), 3, fs(3))
assert len(Sp) == 4 and len(PS(Sp)) == 16 and fs(E) in PS(Sp) and fs(1) not in PS(Sp) and fs(3, fs(3)) in PS(Sp)  # ex-ps-medium
Aa, Bb = fs(1, 2), fs(2, 3)                                                           # ex-ps-union
U_ = PS(Aa) | PS(Bb)
assert len(U_) == 4 + 4 - len(PS(Aa & Bb)) == 6 and len(PS(Aa | Bb)) == 8
assert sorted(map(sorted, PS(Aa | Bb) - U_)) == [[1, 2, 3], [1, 3]]

# ── Cartesian products (product-def, product-laws, trap-product-order, examples) ──
prod = lambda X, Y: frozenset(itertools.product(X, Y))  # noqa: E731
assert len(prod(fs(1, 2), "abc")) == 6
small = S.powerset(range(3))
for A in small:
    for Bb in small:
        assert len(prod(A, Bb)) == len(A) * len(Bb)
        assert (prod(A, Bb) == prod(Bb, A)) == (A == Bb or not A or not Bb)
        for C in small:
            assert prod(A, Bb | C) == prod(A, Bb) | prod(A, C) and prod(A, Bb & C) == prod(A, Bb) & prod(A, C)
            assert prod(A, Bb - C) == prod(A, Bb) - prod(A, C)
            assert prod(Bb | C, A) == prod(Bb, A) | prod(C, A) and prod(Bb - C, A) == prod(Bb, A) - prod(C, A)
            for Dd in small[:4]:
                assert prod(A, Bb) & prod(C, Dd) == prod(A & C, Bb & Dd)
                assert prod(A, Bb) | prod(C, Dd) <= prod(A | C, Bb | Dd)
assert (1, 2) not in prod(fs(1), fs(1)) | prod(fs(2), fs(2)) and (1, 2) in prod(fs(1, 2), fs(1, 2))  # law 4 counterexample
assert prod(fs(1), fs(2)) != prod(fs(2), fs(1))
assert ((1, 2), 3) != (1, (2, 3))
Ap, Bp = fs(0, 1), fs("x", "y", "z")                                                  # ex-prod-easy
assert (len(prod(Ap, Bp)), len(prod(Bp, Ap)), len(list(itertools.product(Ap, repeat=3))), 2 ** len(prod(Ap, Bp))) == (6, 6, 8, 64)
assert prod(fs(1, 2), fs(2, 3)) & prod(fs(2, 3), fs(1, 2)) == fs((2, 2))              # ex-prod-medium
assert prod(fs(1, 2), fs(1)) != prod(fs(1), fs(1, 2)) and (2, 1) not in prod(fs(1), fs(1, 2))  # ex-prod-edge
assert prod(fs(1, 2), E) == E == prod(E, fs(1, 2))
# ex-prod-gate: the logic step  x∈A ∧ y∈B ∧ (x∉A ∨ y∉C)  ≡  x∈A ∧ y∈B ∧ y∉C
assert L.equivalent("a & b & (~a | ~c)", "a & b & ~c")

# ── Operations and Δ (ops-def, symdiff-def, symdiff-laws, bitvector-def, traps, examples) ──
Dl = lambda X, Y: X ^ Y  # noqa: E731
for A in small:
    for Bb in small:
        assert Dl(A, Bb) == (A - Bb) | (Bb - A) == (A | Bb) - (A & Bb)
U8 = frozenset(range(1, 9))
A8, B8 = fs(1, 2, 3, 4), fs(3, 4, 5, 6)                                               # ex-op-easy
assert (A8 | B8, A8 & B8, A8 - B8, B8 - A8, A8 ^ B8, U8 - A8) == (fs(1, 2, 3, 4, 5, 6), fs(3, 4), fs(1, 2), fs(5, 6), fs(1, 2, 5, 6), fs(5, 6, 7, 8))
assert len(A8 ^ B8) == len(A8) + len(B8) - 2 * len(A8 & B8) == 4
O8 = list(range(1, 9))                                                                 # ex-op-medium
a8, b8 = S.bits(A8, O8), S.bits(B8, O8)
assert (a8, b8) == ("11110000", "00111100")
assert [S.bitop(a8, b8, o) for o in ("or", "and", "andnot", "xor")] == ["11111100", "00110000", "11000000", "11001100"]
assert S.bits(U8 - A8, O8) == "00001111" and S.from_bits("11001100", O8) == fs(1, 2, 5, 6)
for A in S.powerset(range(4)):                                                         # bitvector table incl. ⊆ test
    for Bb in S.powerset(range(4)):
        a, b = S.bits(A, range(4)), S.bits(Bb, range(4))
        assert S.from_bits(S.bitop(a, b, "or"), range(4)) == A | Bb and S.from_bits(S.bitop(a, b, "and"), range(4)) == A & Bb
        assert S.from_bits(S.bitop(a, b, "xor"), range(4)) == A ^ Bb and S.from_bits(S.bitop(a, b, "andnot"), range(4)) == A - Bb
        assert (A <= Bb) == ("1" not in S.bitop(a, b, "andnot")) and a.count("1") == len(A)
U = lambda s: s["U"]  # noqa: E731
X_, Y_, Z_ = (lambda s: s["A"]), (lambda s: s["B"]), (lambda s: s["C"])
# symdiff-laws 1–5 (regions + brute force)
assert both_ways(lambda s: s["A"] ^ s["B"], lambda s: s["B"] ^ s["A"])
assert both_ways(lambda s: (s["A"] ^ s["B"]) ^ s["C"], lambda s: s["A"] ^ (s["B"] ^ s["C"]))
assert both_ways(lambda s: s["A"] ^ frozenset(), X_) and both_ways(lambda s: s["A"] ^ s["A"], lambda s: frozenset())
assert both_ways(lambda s: s["A"] ^ s["U"], lambda s: s["U"] - s["A"]) and both_ways(lambda s: s["A"] ^ (s["U"] - s["A"]), U)
assert both_ways(lambda s: s["A"] & (s["B"] ^ s["C"]), lambda s: (s["A"] & s["B"]) ^ (s["A"] & s["C"]))
assert not both_ways(lambda s: s["A"] | (s["B"] ^ s["C"]), lambda s: (s["A"] | s["B"]) ^ (s["A"] | s["C"]))
assert both_ways(lambda s: (s["A"] | s["B"]) ^ (s["A"] | s["C"]), lambda s: (s["B"] ^ s["C"]) - s["A"])   # ex-op-edge
assert (fs(1) | (fs(1) ^ E), (fs(1) | fs(1)) ^ (fs(1) | E)) == (fs(1), E)
for A in S.powerset(range(3)):                                                          # cancellation (3)
    for Bb in S.powerset(range(3)):
        sols = [X for X in S.powerset(range(3)) if A ^ X == Bb]
        assert sols == [A ^ Bb]
Ac, Bc = fs(1, 2, 3), fs(2, 3, 4, 5)                                                    # ex-op-cancel
assert Ac ^ Bc == fs(1, 4, 5) and Ac ^ fs(1, 4, 5) == Bc
assert not any((Ac | X) == Bc for X in S.powerset(range(1, 7)))
for k in range(1, 5):                                                                    # parity (6)
    for t in itertools.product(S.powerset(range(2)), repeat=k):
        acc = frozenset()
        for X in t:
            acc ^= X
        assert all((x in acc) == (sum(x in X for X in t) % 2 == 1) for x in range(2))
for A in small:                                                                           # (7)
    for Bb in small:
        assert len(A ^ Bb) == len(A) + len(Bb) - 2 * len(A & Bb)
# trap-delta-union / IT 2006 statement 1 counterexample
P_, Q_, R_ = E, fs(1), E
assert P_ ^ (Q_ | R_) == fs(1) and (P_ ^ Q_) & (P_ ^ R_) == E
# trap-caret: logic reading gives XOR; C-XOR reading gives XNOR, the complement
assert L.equivalent("(x & ~y) | (~x & y)", "x xor y")
assert L.equivalent("(x xor ~y) | (~x xor y)", "~(x xor y)")
# ex-op-gate
assert L.equivalent("(~x & ~y) | (x & y)", "~(x xor y)")
assert both_ways(lambda s: s["U"] - (s["A"] ^ s["B"]), lambda s: (s["A"] & s["B"]) | ((s["U"] - s["A"]) & (s["U"] - s["B"])), "AB")

# ── Identities (laws-table, transfer, membership table, regions, union-count, examples) ──
c = lambda s, x: s["U"] - x  # noqa: E731
laws = [
    (lambda s: s["A"] | frozenset(), X_), (lambda s: s["A"] & s["U"], X_),
    (lambda s: s["A"] | s["U"], U), (lambda s: s["A"] & frozenset(), lambda s: frozenset()),
    (lambda s: s["A"] | s["A"], X_), (lambda s: s["A"] & s["A"], X_),
    (lambda s: s["A"] | c(s, s["A"]), U), (lambda s: s["A"] & c(s, s["A"]), lambda s: frozenset()),
    (lambda s: c(s, c(s, s["A"])), X_),
    (lambda s: s["A"] | (s["B"] & s["C"]), lambda s: (s["A"] | s["B"]) & (s["A"] | s["C"])),
    (lambda s: s["A"] & (s["B"] | s["C"]), lambda s: (s["A"] & s["B"]) | (s["A"] & s["C"])),
    (lambda s: c(s, s["A"] | s["B"]), lambda s: c(s, s["A"]) & c(s, s["B"])),
    (lambda s: c(s, s["A"] & s["B"]), lambda s: c(s, s["A"]) | c(s, s["B"])),
    (lambda s: s["A"] | (s["A"] & s["B"]), X_), (lambda s: s["A"] & (s["A"] | s["B"]), X_),
    (lambda s: s["A"] - (s["B"] | s["C"]), lambda s: (s["A"] - s["B"]) & (s["A"] - s["C"])),
    (lambda s: s["A"] - (s["B"] & s["C"]), lambda s: (s["A"] - s["B"]) | (s["A"] - s["C"])),
    (lambda s: (s["A"] - s["B"]) - s["C"], lambda s: s["A"] - (s["B"] | s["C"])),
    (lambda s: (s["A"] - s["B"]) - s["C"], lambda s: (s["A"] - s["C"]) - (s["B"] - s["C"])),
    (lambda s: s["A"] - (s["A"] - s["B"]), lambda s: s["A"] & s["B"]),
    (lambda s: s["A"] - s["B"], lambda s: s["A"] - (s["A"] & s["B"])),
    (lambda s: s["A"] - s["B"], lambda s: s["A"] & c(s, s["B"])),
]
for f, g in laws:
    assert both_ways(f, g)
assert not both_ways(lambda s: s["A"] - s["B"], lambda s: s["B"] - s["A"])
for A in small:                                                                          # subset criteria
    for Bb in small:
        Uu = frozenset(range(3))
        assert (A <= Bb) == (A | Bb == Bb) == (A & Bb == A) == ((Uu - Bb) <= (Uu - A)) == (not (A - Bb))
# transfer theorem: a few logic laws, as formulas and as set identities
for phi, psi, f, g in [("~(a | b)", "~a & ~b", lambda s: c(s, s["A"] | s["B"]), lambda s: c(s, s["A"]) & c(s, s["B"])),
                       ("a & (b xor c)", "(a & b) xor (a & c)", lambda s: s["A"] & (s["B"] ^ s["C"]), lambda s: (s["A"] & s["B"]) ^ (s["A"] & s["C"])),
                       ("a | (b xor c)", "(a | b) xor (a | c)", lambda s: s["A"] | (s["B"] ^ s["C"]), lambda s: (s["A"] | s["B"]) ^ (s["A"] | s["C"]))]:
    assert L.equivalent(phi, psi) == both_ways(f, g)
# venn-regions-def: lists, and 2^(2^k) expressions
assert S.region_names() == ["ABC", "AB", "AC", "A", "BC", "B", "C", "-"]
assert R(X_) == ["ABC", "AB", "AC", "A"] and R(lambda s: s["A"] & s["B"]) == ["ABC", "AB"] and R(lambda s: s["A"] - s["B"]) == ["AC", "A"]
assert R(lambda s: s["A"] ^ s["B"]) == ["AC", "A", "BC", "B"] and R(lambda s: c(s, s["A"])) == ["BC", "B", "C", "-"]
assert R(lambda s: c(s, s["A"] | s["B"] | s["C"])) == ["-"] and 2 ** 2 ** 3 == 256
# membership table (ex-id-medium) and the sets-membership-table scene's identity
mt = S.membership_table([lambda s: s["A"] - (s["B"] & s["C"]), lambda s: s["A"] - s["B"], lambda s: s["A"] - s["C"],
                         lambda s: (s["A"] - s["B"]) | (s["A"] - s["C"])])
assert [r[3] for r in mt] == [0, 1, 1, 1, 0, 0, 0, 0] and [r[4] for r in mt] == [0, 0, 1, 1, 0, 0, 0, 0]
assert [r[5] for r in mt] == [0, 1, 0, 1, 0, 0, 0, 0] and [r[6] for r in mt] == [r[3] for r in mt]
assert R(lambda s: s["A"] - (s["B"] & s["C"])) == ["AB", "AC", "A"]
assert L.equivalent("a & ~(b & c)", "(a & ~b) | (a & ~c)")                                # ex-id-medium as logic
assert L.equivalent("~(a | b)", "~a & ~b")                                                # ex-id-easy
f_gate = lambda s: (s["A"] | s["B"]) & (s["A"] | c(s, s["B"])) & (c(s, s["A"]) | s["B"])  # noqa: E731  ex-id-gate
assert both_ways(f_gate, lambda s: s["A"] & s["B"], "AB") and S.regions_of(f_gate, "AB") == ["AB"]
assert (S.regions_of(lambda s: s["A"] | s["B"], "AB"), S.regions_of(lambda s: s["A"] | c(s, s["B"]), "AB"),
        S.regions_of(lambda s: c(s, s["A"]) | s["B"], "AB")) == (["AB", "A", "B"], ["AB", "A", "-"], ["AB", "B", "-"])
lhs, rhs = (lambda s: (s["A"] - s["B"]) - s["C"]), (lambda s: s["A"] - (s["B"] - s["C"]))  # ex-id-edge
assert R(lhs) == ["A"] and R(rhs) == ["ABC", "AC", "A"] and R(lambda s: s["B"] - s["C"]) == ["AB", "B"]
assert not both_ways(lhs, rhs) and sub_ways(lhs, rhs)
assert (fs(1) - E) - fs(1) == E and fs(1) - (E - fs(1)) == fs(1)
assert all(((A - Bb) - C == A - (Bb - C)) == (not (A & C)) for A in small for Bb in small for C in small)
# region theorem 1–3 on random-ish pairs: equal lists ⇔ identity; ⊆ lists ⇔ always ⊆ (both deciders inside)
exprs = [X_, lambda s: s["A"] & s["B"], lambda s: s["A"] - s["C"], lambda s: (s["A"] & s["B"]) - s["C"],
         lambda s: s["A"] ^ s["B"] ^ s["C"], lambda s: (s["A"] | s["B"]) - s["C"], lambda s: c(s, s["A"]) | s["B"]]
for f in exprs:
    for g in exprs:
        both_ways(f, g)
        sub_ways(f, g)
# union-count, two and three sets, brute force
for A in small:
    for Bb in small:
        assert len(A | Bb) == len(A) + len(Bb) - len(A & Bb)
        for C in small:
            assert len(A | Bb | C) == len(A) + len(Bb) + len(C) - len(A & Bb) - len(A & C) - len(Bb & C) + len(A & Bb & C)
# Worked examples: comparing expressions
assert both_ways(lambda s: (s["A"] | s["B"]) - (s["A"] ^ s["B"]), lambda s: s["A"] & s["B"])     # ex-cmp-easy
assert S.regions_of(lambda s: (s["A"] | s["B"]) - (s["A"] ^ s["B"]), "AB") == ["AB"]
Xm, Ym = (lambda s: (s["A"] | s["B"]) - s["C"]), (lambda s: (s["A"] - s["C"]) | (s["B"] - s["C"]))  # ex-cmp-medium
assert R(lambda s: s["A"] | s["B"]) == ["ABC", "AB", "AC", "A", "BC", "B"] and R(Xm) == R(Ym) == ["AB", "A", "B"] and both_ways(Xm, Ym)
Xg, Yg = (lambda s: (s["A"] & s["B"]) - s["C"]), (lambda s: s["A"] - s["C"])                    # ex-cmp-gate
assert R(Xg) == ["AB"] and R(Yg) == ["AB", "A"] and sub_ways(Xg, Yg) and not both_ways(Xg, Yg)
assert (fs(1) & E) - E != fs(1) - E and (fs(1) & fs(1)) - E == fs(1) - E
n_all, nA, nB, nAB = 100, 60, 50, 30                                                              # ex-cmp-count
assert (nA - nAB, nB - nAB, nA + nB - nAB, n_all - (nA + nB - nAB), nA + nB - 2 * nAB) == (30, 20, 80, 20, 50)
live = [r for r in S.region_names() if r not in ("AC", "A")]                                      # ex-cmp-edge (A ⊆ B)
Xe, Ye = (lambda s: (s["A"] | s["C"]) & (s["B"] - s["C"])), (lambda s: s["A"] - s["C"])
assert [r for r in R(Xe) if r in live] == ["AB"] == [r for r in R(Ye) if r in live]
assert all(Xe(s) == Ye(s) for s in S.assignments(ABC, 3) if s["A"] <= s["B"])
assert not both_ways(Xe, Ye) and "A" in R(Ye) and "A" not in R(Xe)

# ── Per-element counting (per-element-theorem, standard-counts, nonlocal-counts, examples) ──
for n in range(0, 5):
    cnt = lambda pred, k=2: S.count_tuples(n, k, pred)  # noqa: E731
    Sn = frozenset(range(n))
    table = [(lambda a, b: True, 4), (lambda a, b: a <= b, 3), (lambda a, b: not (a & b), 3),
             (lambda a, b: (a | b) == Sn, 3), (lambda a, b: not (a & b) and (a | b) == Sn, 2), (lambda a, b: a == b, 2)]
    for pred, base in table:
        assert cnt(pred) == base ** n
    assert cnt(lambda a, b, c: a <= b <= c, 3) == 4 ** n
    assert cnt(lambda a, b: a < b) == 3 ** n - 2 ** n
    assert cnt(lambda a, b: len(a & b) == 1) == n * 3 ** max(n - 1, 0) if n else True
    unordered = {frozenset([a, b]) for a in S.powerset(range(n)) for b in S.powerset(range(n)) if not (a & b)}
    assert len(unordered) == (3 ** n + 1) // 2
    for k in range(n + 1):
        assert cnt(lambda a, b: a <= b and len(b) == k) == math.comb(n, k) * 2 ** k
    assert sum(math.comb(n, k) * 2 ** k for k in range(n + 1)) == 3 ** n
assert [p for p in S.allowed_patterns(2, lambda a, b: a <= b)] == [(0, 0), (0, 1), (1, 1)]
assert len(S.allowed_patterns(3, lambda a, b, c: a <= b <= c)) == 4
assert S.count_tuples(1, 2, lambda a, b: a <= b) == 3                                             # n = 1 sanity
assert S.count_tuples(4, 2, lambda a, b: not (a & b)) == 81                                        # ex-cnt-easy
assert [math.comb(4, k) * 2 ** k for k in range(5)] == [1, 8, 24, 32, 16] and sum([1, 8, 24, 32, 16]) == 81  # ex-cnt-medium
assert S.count_tuples(5, 2, lambda a, b: len(a & b) == 1) == 405 == 5 * 81                         # ex-cnt-gate
assert S.count_tuples(3, 3, lambda a, b, c: a <= b <= c) == 64                                     # ex-cnt-chain
assert S.count_tuples(3, 2, lambda a, b: a < b) == 19                                              # ex-cnt-edge
assert (3 ** 3 + 1) // 2 == 14 and (3 + 1) // 2 == 2
assert (3 ** 10, 3 ** 10 - 2 ** 10) == (59049, 58025)                                               # trap-ordered-pairs

# ── PYQs (keys re-derived) ────────────────────────────────────────────────
# 1993: |P(A × A)| = 2^(n²): option B only (compare the options' values at n = 3; E "none" is false).
vals93 = {"A": 2 ** 2 ** 3, "B": 2 ** 9, "C": (2 ** 3) ** 2, "D": (2 ** 2) ** 3}
assert all(len(PS(list(itertools.product(range(n), repeat=2)))) == 2 ** (n * n) for n in range(4))
D.assert_key("cse-1993-ii-a-8-4", [k for k, v in vals93.items() if v == 2 ** 9])
# 1995: S = {{∅}, 1, {2, 3}}: 3 elements, 8 subsets.
S95 = fs(fs(E), 1, fs(2, 3))
D.assert_key("cse-1995-a-20", "C" if len(PS(S95)) == 8 else "?")
# 1996: (A − B) ∪ (B − A) ∪ (A ∩ B) = A ∪ B.
f96 = lambda s: (s["A"] - s["B"]) | (s["B"] - s["A"]) | (s["A"] & s["B"])  # noqa: E731
opts96 = {"A": lambda s: s["A"] | s["B"], "B": lambda s: c(s, s["A"]) | c(s, s["B"]),
          "C": lambda s: s["A"] & s["B"], "D": lambda s: c(s, s["A"]) & c(s, s["B"])}
D.assert_key("cse-1996-a-1", [k for k, g in opts96.items() if both_ways(f96, g, "AB")])
# 2000: always-true test over many S. A, C, D fail for every S tried; B holds iff S ∩ P(S) = ∅ (fails at S = {∅}).
cands = [E, fs(1), fs(1, 2), fs(1, 2, 3), fs(E), fs(E, fs(E)), fs(1, fs(1))]
okB = [Sx for Sx in cands if PS(Sx) & PS(PS(Sx)) == fs(E)]
assert all(not (PS(PS(Sx)) == PS(Sx)) and not ((PS(Sx) & Sx) == PS(Sx)) and Sx in PS(Sx) for Sx in cands)
assert fs(E) not in okB and len(okB) == 4                                            # key B is "intended", see lesson
D.assert_key("cse-2000-a-2-6", "B")
assert "special S" in B["cse-2000-a-2-6"]["reviewNote"]
# 2001 (DESC): P(A ∩ B) = P(A) ∩ P(B), checked above for all A, B ⊆ {0,1,2}; the bank's model answer agrees.
assert B["cse-2001-b-51-a"]["type"] == "DESC" and "X ⊆ A and X ⊆ B" in B["cse-2001-b-51-a"]["answer"]
# 2005: X = (A − B) − C, Y = (A − C) − (B − C): equal.
X05, Y05 = (lambda s: (s["A"] - s["B"]) - s["C"]), (lambda s: (s["A"] - s["C"]) - (s["B"] - s["C"]))
assert both_ways(X05, Y05) and R(X05) == ["A"]
D.assert_key("cse-2005-cs-8", "A")
# 2006-22: X = (E ∩ F) − (F ∩ G), Y = (E − (E ∩ G)) − (E − F): equal (region EF).
X06 = lambda s: (s["E"] & s["F"]) - (s["F"] & s["G"])  # noqa: E731
Y06 = lambda s: (s["E"] - (s["E"] & s["G"])) - (s["E"] - s["F"])  # noqa: E731
assert both_ways(X06, Y06, "EFG") and S.regions_of(X06, "EFG") == ["EF"]
D.assert_key("cse-2006-cs-22", "C")
# 2006-50: z = (x ∧ ¬y) ∨ (¬x ∧ y) bitwise = X Δ Y = (X − Y) ∪ (Y − X).
assert "V (~x[i] ^ y[i])" in B["cse-2006-cs-50"]["text"]
for Xs in S.powerset(range(4)):
    for Ys in S.powerset(range(4)):
        z = frozenset(i for i in range(4) if (i in Xs and i not in Ys) or (i not in Xs and i in Ys))
        assert z == (Xs - Ys) | (Ys - Xs) and (Xs - Ys) & (Ys - Xs) == E
D.assert_key("cse-2006-cs-50", "D")
# IT 2006: statement 1 false, statement 2 true → B.
st1 = both_ways(lambda s: s["A"] ^ (s["B"] | s["C"]), lambda s: (s["A"] ^ s["B"]) & (s["A"] ^ s["C"]))
st2 = both_ways(lambda s: s["A"] & (s["B"] ^ s["C"]), lambda s: (s["A"] & s["B"]) ^ (s["A"] & s["C"]))
assert (st1, st2) == (False, True)
D.assert_key("it-2006-cs-23", "B")
# 2008: (P∩Q∩R) ∪ (Pᶜ∩Q∩R) ∪ Qᶜ ∪ Rᶜ = U.
f08 = lambda s: (s["P"] & s["Q"] & s["R"]) | (c(s, s["P"]) & s["Q"] & s["R"]) | c(s, s["Q"]) | c(s, s["R"])  # noqa: E731
opts08 = {"A": lambda s: c(s, s["Q"]) | c(s, s["R"]), "B": lambda s: s["P"] | c(s, s["Q"]) | c(s, s["R"]),
          "C": lambda s: c(s, s["P"]) | c(s, s["Q"]) | c(s, s["R"]), "D": U}
D.assert_key("cse-2008-cs-2", [k for k, g in opts08.items() if both_ways(f08, g, "PQR")])
# 2015-1: A = {5, {6}, {7}}: I, II, III true, IV false → C.
A15 = fs(5, fs(6), fs(7))
P15 = PS(A15)
truth15 = [E in P15, E <= P15, fs(5, fs(6)) in P15, fs(5, fs(6)) <= P15]
assert truth15 == [True, True, True, False]
D.assert_key("cse-2015-1-cs-16", "C")
# 2015-2: |P({0..10})| = 2048.
D.assert_key("cse-2015-2-cs-18", len(S.powerset(range(11))))
# 2015-3: U = P({1..6}); only D holds.
S6_ = frozenset(range(1, 7))
U15 = S.powerset(S6_)
cA = all(len(X) == len(S6_ - X) for X in U15)
cB = any(len(X) == 5 and len(Y) == 5 and not (X & Y) for X in U15 for Y in U15)
cC = all(len(X) == 2 and len(Y) == 3 and not (X - Y) for X in U15 for Y in U15)
cD = all(X - Y == (S6_ - Y) - (S6_ - X) for X in U15 for Y in U15)
assert (cA, cB, cC, cD) == (False, False, False, True)
D.assert_key("cse-2015-3-cs-23", "D")
# 2021-2: (A, B) with A ⊆ B ⊆ S, |S| = 10: 3^10 (enumeration for n ≤ 4 confirms the formula above).
D.assert_key("cse-2021-2-cs-50", 3 ** 10)

# ── Practice ───────────────────────────────────────────────────────────────
q01S = fs(1, fs(2, 3), fs(E), E)
D.assert_mcq(P["nx-dm-03-01-q01"], {(4, 16): "A", (5, 32): "B", (6, 64): "C", (3, 8): "D"}[(len(q01S), len(PS(q01S)))])
D.assert_nat(P["nx-dm-03-01-q02"], len(PS(PS(fs("a", "b")))))
qa, qb = "10110010", "01110100"
q03 = {"A": "00110000", "B": "11000110", "C": "11110110", "D": "10000010"}
assert (S.bitop(qa, qb, "and"), S.bitop(qa, qb, "or"), S.bitop(qa, qb, "andnot")) == (q03["A"], q03["C"], q03["D"])
assert S.from_bits(S.bitop(qa, qb, "xor"), O8) == fs(1, 2, 6, 7)
D.assert_mcq(P["nx-dm-03-01-q03"], [k for k, v in q03.items() if v == S.bitop(qa, qb, "xor")][0])
q04 = {"A": (lambda s: s["A"] - (s["B"] & s["C"]), lambda s: (s["A"] - s["B"]) | (s["A"] - s["C"])),
       "B": (lambda s: s["A"] | (s["B"] ^ s["C"]), lambda s: (s["A"] | s["B"]) ^ (s["A"] | s["C"])),
       "C": (lambda s: s["A"] & (s["B"] ^ s["C"]), lambda s: (s["A"] & s["B"]) ^ (s["A"] & s["C"])),
       "D": (lambda s: (s["A"] - s["B"]) - s["C"], lambda s: s["A"] - (s["B"] - s["C"]))}
D.assert_msq(P["nx-dm-03-01-q04"], [k for k, (f, g) in q04.items() if both_ways(f, g)])
D.assert_nat(P["nx-dm-03-01-q05"], S.count_tuples(6, 2, lambda a, b: a <= b and len(b) == 4))
assert math.comb(6, 4) * 2 ** 4 == 240
X6 = lambda s: (s["A"] & s["B"]) | (s["A"] - s["C"])  # noqa: E731
Y6 = lambda s: s["A"] - (s["C"] - s["B"])  # noqa: E731
assert R(X6) == R(Y6) == ["ABC", "AB", "A"] and R(lambda s: s["C"] - s["B"]) == ["AC", "C"]
D.assert_mcq(P["nx-dm-03-01-q06"], "C" if both_ways(X6, Y6) else "?")
q07ok = {k: all(f(A, Bb) for A in small for Bb in small) for k, f in {
    "A": lambda A, Bb: PS(A | Bb) == PS(A) | PS(Bb), "B": lambda A, Bb: PS(A - Bb) == PS(A) - PS(Bb),
    "C": lambda A, Bb: PS(A) & PS(Bb) == fs(E), "D": lambda A, Bb: PS(A & Bb) == PS(A) & PS(Bb)}.items()}
assert not any(PS(A - Bb) == PS(A) - PS(Bb) for A in small for Bb in small)
D.assert_mcq(P["nx-dm-03-01-q07"], [k for k, v in q07ok.items() if v][0])
S4 = frozenset(range(4))
D.assert_nat(P["nx-dm-03-01-q08"], S.count_tuples(4, 2, lambda a, b: (a | b) == S4 and bool(a & b)))
assert 3 ** 4 - 2 ** 4 == 65
S9 = fs(1, fs(2), fs(1, 2))
q09 = {"A": fs(2) in S9, "B": fs(2) <= S9, "C": fs(1) <= S9, "D": fs(1, fs(2)) in PS(S9)}
D.assert_msq(P["nx-dm-03-01-q09"], [k for k, v in q09.items() if v])
inter = 25 + 18 - 35
q10 = {"A": 27, "B": 35, "C": 19, "D": 43}
assert inter == 8 and 35 - inter == 25 + 18 - 2 * inter == 27
D.assert_mcq(P["nx-dm-03-01-q10"], [k for k, v in q10.items() if v == 35 - inter][0])
assert len([k for k in P if k.startswith("nx-dm-03-01-")]) == 10

import collections  # noqa: E402
ids = D.outline_pyqs("dm-03-01-sets")
mk = collections.Counter((B[i]["marks"], B[i]["type"] == "NAT") for i in ids)
assert len(ids) == 14 and mk[(1, False)] + mk[(1, True)] == 7 and mk[(1, True)] == 1                # radar marks
assert mk[(2, False)] + mk[(2, True)] == 6 and mk[(2, True)] == 1 and mk[(None, False)] == 1
import re  # noqa: E402
block_ids = re.findall(r"\{#([a-z0-9-]+)", TXT)
assert len(block_ids) == len(set(block_ids)), "duplicate block ids"
for qid, tests in re.findall(r':::pyq\{id="([^"]+)" tests="([^"]+)"', TXT):
    assert set(tests.split(",")) <= set(block_ids), (qid, set(tests.split(",")) - set(block_ids))
for qid, q in P.items():
    if qid.startswith("nx-dm-03-01-"):
        assert set(q["blocks"]) <= set(block_ids), (qid, set(q["blocks"]) - set(block_ids))
D.must_contain(TXT, "$|T| = 4$", "$|P(S)| = 16$", "512, 256 and 64", "X = \\{1, 4, 5\\}$", "$3^4 = 81$", "$5 \\cdot 81 = 405$",
               "$4^3 = 64$", "(i) 19, (ii) 14", "$3^{10} = 59049$", "20 study neither", "$\\{(2, 2)\\}$", "11001100")
print("l3_01_sets: nested membership, power sets, products, Δ and bit vectors, identities (regions = brute force), per-element counts, 14 PYQ keys and 10 practice answers OK")
