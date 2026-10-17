"""Checks for dl/02-boolean-algebra-gates/02-boolean-laws: the postulates and laws table (every law
and its dual, re-evaluated), the derivation chains, De Morgan and the general complement rule,
consensus, Shannon expansion (over every 3-variable function), equation solving, every worked
example, all twelve PYQ keys (re-derived from the option texts) and the practice answers."""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402

L = bl.lesson_text("02-boolean-laws.md")
has = lambda *s: bl.must_contain(L, *s)
X, XY, XYZ = ["x"], ["x", "y"], ["x", "y", "z"]
ABC, ABCD = ["A", "B", "C"], ["A", "B", "C", "D"]
eq = bl.equal

# Postulates hold in the two-valued algebra.
for a in XYZ:
    pass
assert eq("x + 0", "x", X) and eq("x 1", "x", X) and eq("x + y", "y + x", XY) and eq("x(y + z)", "xy + xz", XYZ)
assert eq("x + yz", "(x + y)(x + z)", XYZ) and bl.tt("x + x'", X) == (1, 1) and bl.tt("x x'", X) == (0, 0)

# Laws table: parse every row, check the law and its dual, and that the dual column is the syntactic dual.
sec = L.split(":::table{#laws-table")[1].split("\n:::")[0]
rows = re.findall(r"^\| (.+?) \| \$(.+?)\$ \| (.+?) \|$", sec, re.M)
assert len(rows) == 12, len(rows)
for name, form, dual_form in rows:
    lhs, rhs = form.split(" = ")
    v = sorted(bl.variables(bl.parse(lhs)) | bl.variables(bl.parse(rhs)))
    assert eq(lhs, rhs, v), name
    if dual_form != "(self-dual)":
        dl, dr = dual_form.strip("$").split(" = ")
        assert eq(dl, dr, v), name
        assert eq(bl.dual(lhs), dl, v) and eq(bl.dual(rhs), dr, v), name
# False "laws" quoted as distractors.
assert not eq("x x'", "1", X) and not eq("x + 1", "x", X) and not eq("x x", "0", X)

# Dual definition examples and the dual-vs-complement trap.
assert eq(bl.dual("xy + x'z"), "(x + y)(x' + z)", XYZ) and eq(bl.dual("x' + y'"), "x'y'", XY)
assert eq("(x' + y')'", "xy", XY) and not eq("x' + y'", "x'y'", XY)

# Derivation chains (each intermediate expression equals the start).
for chain, v in [(["x", "x + 0", "x + x x'", "(x + x)(x + x')", "(x + x) 1", "x + x"], X),
                 (["x + 1", "(x + 1) 1", "(x + 1)(x + x')", "x + 1 x'", "x + x'", "1"], X),
                 (["x + xy", "x 1 + x y", "x(1 + y)", "x 1", "x"], XY),
                 (["x + x'y", "(x + x')(x + y)", "1 (x + y)", "x + y"], XY),
                 (["xy + x'z + yz", "xy + x'z + yz(x + x')", "xy + x'z + xyz + x'yz", "xy(1 + z) + x'z(1 + y)", "xy + x'z"], XYZ)]:
    assert all(eq(chain[0], c, v) for c in chain), chain
assert bl.tt("(x + y) + x'y'", XY) == (1,) * 4 and bl.tt("(x + y) x'y'", XY) == (0,) * 4
assert eq("A + AB", "A", ["A", "B"]) and eq("(P + Q)(P + Q + R)", "P + Q", ["P", "Q", "R"]) and eq("A' + AB", "A' + B", ["A", "B"])
# Trick-absorb-scan caveat: x ⊕ xy = xy′.
assert eq("x \\oplus xy", "xy'", XY) and not eq("x \\oplus xy", "x", XY)
# Associativity (perfect induction).
assert eq("x + (y + z)", "(x + y) + z", XYZ) and eq("x(yz)", "(xy)z", XYZ)

# Simplification examples.
assert eq("A + AB + ABC'", "A", ABC)
assert eq("x'y' + xy + x'y", "x' + y", XY)
P3 = ["P", "Q", "R"]
assert eq("(P + Q')(PQ' + PR)(PR' + Q')", "PQ'", P3) and eq("(Q' + R)(Q' + PR')", "Q'", P3)
assert eq("x + x'y + x'y'", "1", XY) and eq("AB + AB' + A'B", "A + B", ["A", "B"])

# De Morgan examples.
assert eq("(AB + C)'", "(A' + B')C'", ABC) and eq("(A' + B')C'", "A'C' + B'C'", ABC)
f = "(A + B'C)(A' + D)"
assert bl.tt("A'(B + C') + AD'", ABCD) == bl.complement_tt(bl.tt(f, ABCD))
assert bl.ev(bl.parse("A'(B + C') + AD'"), {"A": 1, "B": 0, "C": 0, "D": 0}) == 1
XYZc = ["X", "Y", "Z"]
F = "(X + Y + Z)(X' + Y)(Y' + Z)"
assert bl.minterms(F, XYZc) == [1, 3, 7]
assert bl.tt("X'Y'Z' + XY' + YZ'", XYZc) == bl.complement_tt(bl.tt(F, XYZc)) == bl.tt("XY' + Y'Z' + YZ'", XYZc)
assert bl.maxterms(F, XYZc) == [0, 2, 4, 5, 6]
has("rows 001, 011, 111", "000, 010, 100, 101, 110")
fx = bl.tt("x' + y'", XY)
assert bl.dual_tt(fx) == bl.tt("x'y'", XY) and bl.complement_tt(fx) == bl.tt("xy", XY) and bl.dual_tt(fx) != fx

# Consensus examples.
assert eq("AB + A'C + BC", "AB + A'C", ABC) and eq("(A + B)(A' + C)(B + C)", "(A + B)(A' + C)", ABC)
assert eq("(A + B)(A' + C)", "AC + A'B", ABC)
assert eq("xy' + yz'", "xy' + yz' + xz'", XYZ) and eq("xy' + yz'", "(x + y)(y' + z')", XYZ) and eq("xy' + yz'", "(x + y)(yz)'", XYZ)
assert eq("xy' + x'z", "(x + z)(x' + y')", XYZ) and eq("xy' + x'z", "(x + z)(xy)'", XYZ) and eq("xy' + x'z + y'z", "xy' + x'z", XYZ)
assert not eq("AB + A'C + BC'", "AB + A'C", ABC) and bl.ev(bl.parse("AB + A'C + BC'"), {"A": 0, "B": 1, "C": 0}) == 1

# Shannon: the theorem and its POS form for every 3-variable function and every variable.
for t in bl.all_functions(3):
    for k in range(3):
        bit = 1 << (2 - k)
        f0 = [t[i & ~bit] for i in range(8)]
        f1 = [t[i | bit] for i in range(8)]
        xi = [(i >> (2 - k)) & 1 for i in range(8)]
        assert tuple(((1 - xi[i]) & f0[i]) | (xi[i] & f1[i]) for i in range(8)) == t
        assert tuple((xi[i] | f0[i]) & ((1 - xi[i]) | f1[i]) for i in range(8)) == t
assert eq("A'C + AB", "AB + A'C", ABC) and eq("A + A'C", "A + C", ABC) and eq("B'(A'C) + B(A + C)", "AB + A'C", ABC)
assert eq("A'B'C + AB + BC", "AB + A'C", ABC)
# The false expansion and the quantifier example (f = xy + z).
assert eq("x'z + x(y + z)", "xy + z", XYZ) and not eq("z + y + z", "xy + z", XYZ)
assert bl.ev(bl.parse("y + z"), {"x": 0, "y": 1, "z": 0}) == 1 and bl.ev(bl.parse("xy + z"), {"x": 0, "y": 1, "z": 0}) == 0
assert eq("z' xy + z", "xy + z", XYZ) and eq("z(y + z)", "z", XYZ)
assert not eq("0 + B", "AB", ["A", "B"])

# Counterexample trick: (x + y) ⊕ z vs x ⊕ (y + z).
row = lambda e, r: bl.ev(bl.parse(e), r)
assert row("(x + y) \\oplus z", {"x": 1, "y": 0, "z": 0}) == row("x \\oplus (y + z)", {"x": 1, "y": 0, "z": 0}) == 1
assert (row("(x + y) \\oplus z", {"x": 0, "y": 1, "z": 1}), row("x \\oplus (y + z)", {"x": 0, "y": 1, "z": 1})) == (0, 1)


def solve(eqs, vars_):
    return [r for r in bl.rows(vars_) if all(row(a, r) == row(b, r) for a, b in eqs)]


# Equations: f = g ⇔ fg′ + f′g = 0; sanity check x + y = 1.
assert bl.tt("(x + y) 1' + (x + y)' 1", XY) == bl.tt("x'y'", XY)
assert [tuple(r.values()) for r in solve([("A + BC", "1"), ("AB' + C", "0")], ABC)] == [(1, 1, 0)]
assert [tuple(r.values()) for r in solve([("x + y", "1"), ("xy", "0"), ("x'z + y'", "0")], XYZ)] == [(0, 1, 0)]
PQRS = ["P", "Q", "R", "S"]
assert [tuple(r.values()) for r in solve([("P + Q", "1"), ("PQ", "0"), ("Q + R", "R"), ("P'R + S", "0")], PQRS)] == [(1, 0, 0, 0), (1, 0, 1, 0)]
assert row("x + y", {"x": 1, "y": 0}) == row("x + z", {"x": 1, "z": 1}) and row("xy", {"x": 0, "y": 0}) == row("xz", {"x": 0, "z": 1})
assert [tuple(r.values()) for r in solve([("A' + AB", "0"), ("AB", "AC"), ("AB + AC' + CD", "C'D")], ABCD)] == [(1, 0, 0, 1)]

# ── PYQ keys ────────────────────────────────────────────────────────────────
B = bl.bank()


def opt_eq(q, letter):
    t = next(o["t"] for o in q["options"] if o["l"] == letter).strip("$")
    return t


def identity_letters(q, vars_, valid=True, pre=lambda s: s):
    out = []
    for o in q["options"]:
        lhs, rhs = pre(o["t"].strip("$")).split("=")
        if bl.equal(lhs, rhs, vars_) == valid:
            out.append(o["l"])
    return out


# cse-2024-2-cs-20: which are FALSE.
q = B["cse-2024-2-cs-20"]
assert identity_letters(q, X, valid=False) == ["B", "C"] == bl.key_letters(q["answer"])
# cse-2026-2-cs-6: which is NOT a property.
q = B["cse-2026-2-cs-6"]
assert identity_letters(q, ["a", "b"], valid=False) == ["B"] == bl.key_letters(q["answer"])
# cse-2004-cs-17.
q = B["cse-2004-cs-17"]
target = bl.tt("x'y' + xy + x'y", XY)
assert [o["l"] for o in q["options"] if bl.tt(o["t"], XY) == target] == ["D"] == [q["answer"]]
# cse-2008-cs-26.
q = B["cse-2008-cs-26"]
target = bl.tt("(P+\\overline{Q})(P.\\overline{Q}+P.R)(P.\\overline{R}+\\overline{Q})", P3)
assert [o["l"] for o in q["options"] if bl.tt(o["t"], P3) == target] == ["A"] == [q["answer"]]
# cse-2019-cs-6: which is NOT valid (option C is conditional on xy = 0).
q = B["cse-2019-cs-6"]
ok = {"A": eq("(x \\oplus y) \\oplus z", "x \\oplus (y \\oplus z)", XYZ), "B": eq("(x + y) \\oplus z", "x \\oplus (y + z)", XYZ),
      "C": all(row("x \\oplus y", r) == row("x + y", r) for r in bl.rows(XY) if r["x"] & r["y"] == 0),
      "D": eq("x \\oplus y", "(xy + x'y')'", XY)}
assert [k for k, v in ok.items() if not v] == ["B"] == [q["answer"]]
assert "$(x \\oplus y) \\oplus z = x \\oplus (y \\oplus z)$" == q["options"][0]["t"]
# cse-2017-2-cs-27: which is INCORRECT.
q = B["cse-2017-2-cs-27"]
WXYZ = ["w", "x", "y", "z"]
assert identity_letters(q, WXYZ, valid=False) == ["C"] == [q["answer"]]
# cse-2025-2-cs-40: which are CORRECT.
q = B["cse-2025-2-cs-40"]
assert identity_letters(q, ABCD, valid=True) == ["B", "C", "D"] == bl.key_letters(q["answer"])
# it-2006-cs-6: which expansion is NOT true, over every 3-variable function.
q = B["it-2006-cs-6"]


def forms(t):
    f = lambda a, b, c: t[a * 4 + b * 2 + c]
    rowsv = [(a, b, c) for a in (0, 1) for b in (0, 1) for c in (0, 1)]
    return {"A": all(f(a, b, c) == (((1 - a) & f(a, b, c)) | (a & f(a, b, c))) for a, b, c in rowsv),
            "B": all(f(a, b, c) == ((b & f(a, b, c)) | ((1 - b) & f(a, b, c))) for a, b, c in rowsv),
            "C": all(f(a, b, c) == (((1 - c) & f(a, b, 0)) | (c & f(a, b, 1))) for a, b, c in rowsv),
            "D": all(f(a, b, c) == (f(0, b, c) | f(1, b, c)) for a, b, c in rowsv)}


always = {k: all(forms(t)[k] for t in bl.all_functions(3)) for k in "ABCD"}
assert [k for k, v in always.items() if not v] == ["D"] == [q["answer"]]
# cse-2002-b-55-a: one complement.
q = B["cse-2002-b-55-a"]
assert eq("xy' + yz'", "(x+y)(yz)'", XYZ) and "(yz)'" in q["answer"]
# cse-1994-a-27-b.
q = B["cse-1994-a-27-b"]
assert [tuple(r.values()) for r in solve([("AB + A'C", "1"), ("AC + B", "0")], ABC)] == [(0, 0, 1)]
assert q["answer"] == "A = 0, B = 0, C = 1"
# cse-1995-a-30.
q = B["cse-1995-a-30"]
sol = solve([("A' + AB", "0"), ("AB", "AC"), ("AB + AC' + CD", "C'D")], ABCD)
want = {"A = %d, B = %d, C = %d, D = %d" % tuple(r.values()) for r in sol}
assert [o["l"] for o in q["options"] if o["t"] in want] == ["A"] == [q["answer"]]
# cse-2000-a-2-10.
q = B["cse-2000-a-2-10"]
XYZW = ["x", "y", "z", "w"]
sol = solve([("x + y + z", "1"), ("xy", "0"), ("xz + w", "1"), ("xy + z'w'", "0")], XYZW)
want = {" ".join(map(str, r.values())) for r in sol}
assert [o["l"] for o in q["options"] if o["t"] in want] == ["C"] == [q["answer"]]
assert len(sol) == 6  # the system has six solutions; only option C is among them

# ── Practice ────────────────────────────────────────────────────────────────
P = bl.practice()
AB = ["A", "B"]


def match(qid, target, vars_):
    q = P[qid]
    return [o["l"] for o in q["options"] if bl.tt(o["t"], vars_) == bl.tt(target, vars_)]


bl.assert_mcq(P["nx-dl-02-02-q01"], match("nx-dl-02-02-q01", "A'B + AB + AB'", AB)[0])
assert len(match("nx-dl-02-02-q01", "A'B + AB + AB'", AB)) == 1
q = P["nx-dl-02-02-q02"]
bad = [o["l"] for o in q["options"] if not eq(*o["t"].strip("$").split(" = "), XYZ)]
bl.assert_mcq(q, bad[0]) and None
assert len(bad) == 1
bl.assert_msq(P["nx-dl-02-02-q03"], match("nx-dl-02-02-q03", "AB + A'C", ABC))
comp = "((A + B)(C' + D))'"
bl.assert_mcq(P["nx-dl-02-02-q04"], match("nx-dl-02-02-q04", comp, ABCD)[0])
assert len(match("nx-dl-02-02-q04", comp, ABCD)) == 1
fA = "A + B'C"
s5 = {"A": eq(bl.dual(fA), "A(B' + C)", ABC), "B": bl.tt("A'(B + C')", ABC) == bl.complement_tt(bl.tt(fA, ABC)),
      "C": bl.tt(bl.dual(fA), ABC) == bl.complement_tt(bl.tt(fA, ABC)), "D": eq(bl.dual(fA), fA, ABC)}
bl.assert_msq(P["nx-dl-02-02-q05"], [k for k, v in s5.items() if v])
assert bl.ev(bl.parse("A'(B + C')"), {"A": 1, "B": 0, "C": 0}) == 0 and bl.ev(bl.dual(fA), {"A": 1, "B": 0, "C": 0}) == 1
cof = [bl.ev(bl.parse("AB + BC + CA"), {"A": 1, "B": b, "C": c}) for b in (0, 1) for c in (0, 1)]
bl.assert_nat(P["nx-dl-02-02-q06"], sum(cof))
sol = solve([("x'y + z", "1"), ("x + y'", "0"), ("y z'", "0")], XYZ)
q = P["nx-dl-02-02-q07"]
bl.assert_mcq(q, [o["l"] for o in q["options"] if o["t"].strip("$") == "(%d, %d, %d)" % tuple(sol[0].values())][0])
assert len(sol) == 1
bl.assert_nat(P["nx-dl-02-02-q08"], len(solve([("AB + C", "1"), ("A + D", "0")], ABCD)))
bl.assert_mcq(P["nx-dl-02-02-q09"], match("nx-dl-02-02-q09", "(A + B)(A + B')(A' + C)", ABC)[0])
assert sorted(k for k in P if k.startswith("nx-dl-02-02-")) == [f"nx-dl-02-02-q{i:02d}" for i in range(1, 10)]

# Independent cross-check of a few identities with sympy.
assert bl.sympy_equivalent("xy + x'z + yz", "xy + x'z", XYZ) and bl.sympy_equivalent("(P + Q')(PQ' + PR)(PR' + Q')", "PQ'", P3)
print("l2_02_boolean_laws: laws, derivations, examples, 12 PYQ keys and the practice answers check out")
