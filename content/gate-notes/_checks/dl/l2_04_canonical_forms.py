"""Checks for dl/02-boolean-algebra-gates/04-canonical-forms: minterm/maxterm conventions, the
canonical forms, Σ ↔ Π, term sizes, minterm-set algebra, every counting formula (brute force over all
functions of up to four variables), duals and self-duality, the majority function, every worked
example, all eight PYQ keys and the practice answers."""
import pathlib
import sys
from itertools import combinations, permutations, product
from math import comb

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402

L = bl.lesson_text("04-canonical-forms.md")
has = lambda *s: bl.must_contain(L, *s)
ABC, XYZ, PQR = ["A", "B", "C"], ["X", "Y", "Z"], ["P", "Q", "R"]
eq = bl.equal
mt = bl.minterms

# Conventions.
assert mt("AB'C", ABC) == [5] and mt("A'B'C'", ABC) == [0] and mt("ABC", ABC) == [7]
assert bl.maxterms("A' + B + C'", ABC) == [5] and eq("(AB'C)'", "A' + B + C'", ABC)
assert eq("A'BC + ABC'", "A'BC + ABC'", ABC) and mt("A'BC + ABC'", ABC) == [3, 6]
# Canonical SOP/POS theorem for every 3-variable function.
for t in bl.all_functions(3):
    sop = tuple(int(any(t[i] and i == r for i in range(8))) for r in range(8))
    assert sop == t
assert mt("PQ + QR' + PR'", PQR) == [2, 4, 6, 7] and bl.maxterms("PQ + QR' + PR'", PQR) == [0, 1, 3, 5]
# Σ ↔ Π example and the trap.
assert bl.from_minterms([2, 3, 5, 6, 7], 3) == bl.complement_tt(bl.from_minterms([0, 1, 4], 3)) == bl.from_minterms([2, 3, 5, 6, 7], 3)
assert bl.from_minterms([4, 5, 6], 3) != bl.complement_tt(bl.from_minterms([4, 5, 6], 3))
# Expansion and term size.
assert mt("AB'", ABC) == [4, 5] and eq("AB'(C + C')", "AB'C + AB'C'", ABC)
for n in range(1, 6):
    for k in range(0, n + 1):
        vs = [f"v{i}" for i in range(n)]
        term = " ".join(vs[:k]) or "1"
        assert len(mt(term, vs)) == 2 ** (n - k)
assert (mt("PQ", PQR), mt("QR'", PQR), mt("PR'", PQR)) == ([6, 7], [2, 6], [4, 6])
assert mt("AB'", ABC) == [4, 5] and mt("AB'", ["C", "B", "A"]) == [1, 5]

# Worked examples: canonical forms.
assert mt("AB' + C", ABC) == [1, 3, 4, 5, 7]
assert mt("A + B'C", ABC) == [1, 4, 5, 6, 7] and bl.maxterms("A + B'C", ABC) == [0, 2, 3]
assert eq("A + B'C", "(A + B + C)(A + B' + C)(A + B' + C')", ABC)
assert bl.maxterms("(X + Y')(X' + Z)", XYZ) == [2, 3, 4, 6] and mt("(X + Y')(X' + Z)", XYZ) == [0, 1, 5, 7]

# Minterm-set algebra (theorem) over every pair of 3-variable functions.
for f in bl.all_functions(3):
    for g in [bl.from_minterms([1, 3, 5, 7], 3), bl.from_minterms([0, 2, 3, 5], 3)]:
        F, G = {i for i in range(8) if f[i]}, {i for i in range(8) if g[i]}
        assert {i for i in range(8) if f[i] & g[i]} == F & G and {i for i in range(8) if f[i] | g[i]} == F | G
        assert {i for i in range(8) if f[i] ^ g[i]} == F ^ G
f, g = {0, 2, 3, 5}, {2, 5, 6}
assert sorted(f & g) == [2, 5] and sorted(f | g) == [0, 2, 3, 5, 6] and sorted(f ^ g) == [0, 3, 6]
assert sorted(set(range(8)) - {1, 2, 4}) == [0, 3, 5, 6, 7]
assert mt("(A + B)(A' + C)", ABC) == [2, 3, 5, 7] and mt("A'B' + AC'", ABC) == [0, 1, 4, 6]
assert eq("((A + B)(A' + C))'", "A'B' + AC'", ABC)
assert eq("A'C", "A'C", ABC) and mt("A'C", ABC) == [1, 3] and mt("A'B'D", ["A", "B", "C", "D"]) == [1, 3]
for n in (3, 4):
    assert all(i + ((2 ** n - 1) ^ i) == 2 ** n - 1 for i in range(2 ** n))

# Counting, by brute force where feasible.
for n in (1, 2, 3):
    fs = list(bl.all_functions(n))
    assert len(fs) == 2 ** 2 ** n
    for k in range(2 ** n + 1):
        assert sum(1 for t in fs if sum(t) == k) == comb(2 ** n, k)
    assert sum(1 for t in fs if bl.is_neutral(t)) == comb(2 ** n, 2 ** (n - 1))
    assert sum(1 for t in fs if not bl.depends_on(t, 0)) == 2 ** 2 ** (n - 1)
    nondeg = sum(1 for t in fs if all(bl.depends_on(t, k) for k in range(n)))
    assert nondeg == sum((-1) ** j * comb(n, j) * 2 ** 2 ** (n - j) for j in range(n + 1))
    assert sum(1 for t in fs if bl.is_symmetric(t)) == 2 ** (n + 1)
    assert sum(1 for t in fs if bl.preserves0(t)) == 2 ** (2 ** n - 1) == sum(1 for t in fs if bl.preserves1(t))
    assert sum(1 for t in fs if bl.is_self_dual(t)) == 2 ** 2 ** (n - 1)
assert sum(1 for t in bl.all_functions(4) if bl.is_self_dual(t)) == 256
assert comb(8, 3) == 56 and sum(comb(8, j) for j in range(4)) == 93 and comb(8, 4) == 70 and comb(4, 2) == 6
assert 16 - 2 * 4 + 2 == 10 and 256 - 3 * 16 + 3 * 4 - 2 == 218
has("$16 - 2 \\cdot 4 + 1 \\cdot 2 = 10$", "$256 - 3 \\cdot 16 + 3 \\cdot 4 - 2 = 218$", "$1 + 8 + 28 + 56 = 93$")
# Dedekind numbers (monotone functions) for n = 1..3 by brute force.
assert [sum(1 for t in bl.all_functions(n) if bl.is_monotone(t)) for n in (1, 2, 3)] == [3, 6, 20]

# Duals.
for t in bl.all_functions(3):
    pass
for e in ["AB + C", "(A + B')C", "A + B'C", "AB + BC + CA"]:
    assert bl.tt(bl.dual(e), ABC) == bl.dual_tt(bl.tt(e, ABC))
assert eq(bl.dual("AB + C"), "(A + B)C", ABC) and eq("(A + B)C", "AC + BC", ABC)
assert eq(bl.dual("AB"), "A + B", ABC)
assert bl.dual_tt(bl.tt("x' + y'", ["x", "y"])) == bl.tt("x'y'", ["x", "y"])
# Self-dual test equivalence over all functions of 3 variables.
for t in bl.all_functions(3):
    pair_ok = all(t[i] + t[7 - i] == 1 for i in range(4))
    assert bl.is_self_dual(t) == pair_ok
n2 = [t for t in bl.all_functions(2) if bl.is_self_dual(t)]
assert sorted(n2) == sorted([bl.tt(e, ["A", "B"]) for e in ["A", "B", "A'", "B'"]])
assert bl.is_self_dual(bl.from_minterms([0, 3, 5, 6], 3)) and bl.from_minterms([0, 3, 5, 6], 3) == bl.tt("(A \\oplus B \\oplus C)'", ABC)
assert not bl.is_self_dual(bl.tt("x \\oplus y", ["x", "y"])) and bl.is_neutral(bl.tt("x \\oplus y", ["x", "y"]))
assert bl.is_self_dual(bl.tt("x \\oplus y \\oplus z", ["x", "y", "z"])) and mt("x \\oplus y \\oplus z", ["x", "y", "z"]) == [1, 2, 4, 7]
for t in bl.all_functions(3):
    if bl.is_self_dual(t):
        assert bl.is_self_dual(bl.complement_tt(t)) and bl.is_neutral(t)
        flip = tuple(t[i ^ 4] for i in range(8))  # complement input A
        assert bl.is_self_dual(flip)
for n in range(1, 6):
    vs = [f"v{i}" for i in range(n)]
    assert bl.is_self_dual(bl.tt(" \\oplus ".join(vs), vs)) == (n % 2 == 1)
# Majority.
M = bl.tt("AB + BC + CA", ABC)
assert mt("AB + BC + CA", ABC) == [3, 5, 6, 7] and bl.maxterms("AB + BC + CA", ABC) == [0, 1, 2, 4]
assert bl.is_self_dual(M) and bl.is_symmetric(M) and bl.is_monotone(M) and all(bl.depends_on(M, k) for k in range(3))
assert eq(bl.dual("AB + BC + CA"), "AB + BC + CA", ABC)
maj = lambda a, b, c: (a & b) | (b & c) | (c & a)
assert all(maj(a, a, b) == a for a, b in product((0, 1), repeat=2))
assert all(maj(a, b, c) == (a if a == b else c) for a, b, c in product((0, 1), repeat=3))

# ── PYQ keys ────────────────────────────────────────────────────────────────
B = bl.bank()
q = B["cse-2007-cs-3"]
counts = {n: 2 ** 2 ** n for n in (1, 2, 3)}
forms = {"A": lambda n: n ** 2, "B": lambda n: 2 ** n, "C": lambda n: 2 ** 2 ** n, "D": lambda n: 2 ** (n ** 2)}
assert [k for k, f_ in forms.items() if all(f_(n) == counts[n] for n in counts)] == ["C"] == [q["answer"]]
q = B["cse-2010-cs-6"]
target = mt("PQ + Q\\overline{R} + P\\overline{R}", PQR)
opts = {o["l"]: sorted(int(s.split("_")[1]) for s in o["t"].strip("$").split("+")) for o in q["options"]}
assert [k for k, v in opts.items() if v == target] == ["A"] == [q["answer"]]
q = B["cse-2015-3-cs-44"]
Fm = mt("P' + QR", PQR)
assert Fm == [0, 1, 2, 3, 7]
S = {"S1": Fm == [4, 5, 6], "S2": Fm == [0, 1, 2, 3, 7], "S3": bl.maxterms("P' + QR", PQR) == [4, 5, 6], "S4": bl.maxterms("P' + QR", PQR) == [0, 1, 2, 3, 7]}
assert S == {"S1": False, "S2": True, "S3": True, "S4": False} and q["answer"] == "A"
assert q["options"][0]["t"] == "(S1)-False, (S2)-True, (S3)-True, (S4)-False"
q = B["cse-2024-1-cs-37"]
F = bl.from_minterms([3, 5, 6, 7], 3)
ok = {"A": bl.complement_tt(bl.from_minterms([0, 1, 2, 4], 3)) == F, "B": bl.tt("XY + YZ + XZ", XYZ) == F,
      "C": not bl.depends_on(F, 1), "D": not bl.depends_on(F, 0)}
assert [k for k, v in ok.items() if v] == ["A", "B"] == bl.key_letters(q["answer"])
q = B["cse-2021-1-cs-42"]
Fc = bl.complement_tt(bl.tt("(X+Y+Z)(\\overline{X}+Y)(\\overline{Y}+Z)", XYZ))
assert [o["l"] for o in q["options"] if bl.tt(o["t"], XYZ) == Fc] == ["B", "C", "D"] == bl.key_letters(q["answer"])
q = B["cse-2001-b-58-a"]
assert bl.is_self_dual(bl.from_minterms([0, 1, 2, 4], 3)) and q["answer"] == "Yes"
q = B["cse-2014-2-cs-6"]
for n in (1, 2, 3, 4):
    c = sum(1 for t in bl.all_functions(n) if bl.is_self_dual(t))
    assert c == 2 ** 2 ** (n - 1)
    if n >= 3:  # at n = 2 the count 4 happens to equal 2^n, so only n ≥ 3 separates the options
        assert c != 2 ** n and c != 2 ** (n - 1) and c != 2 ** 2 ** n
assert q["answer"] == "D"
q = B["cse-2025-1-cs-14"]
V5 = ["a", "b", "c", "d", "e"]
rows5 = list(product((0, 1), repeat=5))
X = maj
claims = {"A": all(X(a, b, X(c, d, e)) == X(X(a, b, c), d, e) for a, b, c, d, e in rows5),
          "B": all(X(a, b, X(a, b, c)) == X(a, b, c) for a, b, c, d, e in rows5),
          "C": all(X(a, b, X(a, c, d)) == (X(a, b, a) & X(c, d, c)) for a, b, c, d, e in rows5),
          "D": all(X(a, b, c) == X(a, X(a, b, c), X(a, c, c)) for a, b, c, d, e in rows5)}
assert [k for k, v in claims.items() if v] == ["B", "D"] == bl.key_letters(q["answer"])

# ── Practice ────────────────────────────────────────────────────────────────
P = bl.practice()


def lists(q):
    out = {}
    for o in q["options"]:
        t = o["t"].strip("$")
        kind = "S" if "Sigma" in t else "P"
        nums = tuple(int(x) for x in t.split("(")[1].split(")")[0].split(","))
        out[o["l"]] = bl.from_minterms(nums, 3) if kind == "S" else bl.complement_tt(bl.from_minterms(nums, 3))
    return out


q = P["nx-dl-02-04-q01"]
m = [k for k, t in lists(q).items() if t == bl.tt("A'B + BC'", ABC)]
assert len(m) == 1
bl.assert_mcq(q, m[0])
q = P["nx-dl-02-04-q02"]
m = [k for k, t in lists(q).items() if t == bl.from_minterms([0, 2, 5, 7], 3)]
assert len(m) == 1
bl.assert_mcq(q, m[0])
bl.assert_nat(P["nx-dl-02-04-q03"], len(mt("AC'", ["A", "B", "C", "D", "E"])))
bl.assert_nat(P["nx-dl-02-04-q04"], sum(1 for t in bl.all_functions(3) if sum(t) <= 2))
q = P["nx-dl-02-04-q05"]
bl.assert_msq(q, [k for k, t in lists(q).items() if bl.is_self_dual(t)])
bl.assert_nat(P["nx-dl-02-04-q06"], sum(1 for t in bl.all_functions(2) if bl.is_neutral(t)))
q = P["nx-dl-02-04-q07"]
m = [o["l"] for o in q["options"] if bl.tt(o["t"], ABC) == bl.tt(bl.dual("(A + B')C"), ABC)]
assert len(m) == 1
bl.assert_mcq(q, m[0])
q = P["nx-dl-02-04-q08"]
m = [k for k, t in lists(q).items() if t == bl.from_minterms(sorted({1, 4, 6} ^ {1, 2, 6, 7}), 3)]
bl.assert_mcq(q, m[0])
claims = {"A": all(maj(a, a, b) == a for a, b in product((0, 1), repeat=2)),
          "B": all(maj(a, b, c) == 1 - maj(1 - a, 1 - b, 1 - c) for a, b, c in product((0, 1), repeat=3)),
          "C": all(maj(a, b, 1) == (a | b) for a, b in product((0, 1), repeat=2)),
          "D": all(maj(a, b, 0) == (a | b) for a, b in product((0, 1), repeat=2))}
bl.assert_msq(P["nx-dl-02-04-q09"], [k for k, v in claims.items() if v])
assert sorted(k for k in P if k.startswith("nx-dl-02-04-")) == [f"nx-dl-02-04-q{i:02d}" for i in range(1, 10)]

print("l2_04_canonical_forms: canonical forms, every count, self-duality, 8 PYQ keys and the practice answers check out")
