"""Checks for dl/02-boolean-algebra-gates/03-xor-and-operators: XOR/XNOR forms and laws (the laws
table re-evaluated), complemented inputs, the arithmetic view, parity and iterated XOR, XNOR chains,
operator properties over all 16 two-input operators, every worked example, all sixteen PYQ keys and
the practice answers."""
import pathlib
import re
import sys
from itertools import product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402

L = bl.lesson_text("03-xor-and-operators.md")
has = lambda *s: bl.must_contain(L, *s)
X, XY, XYZ = ["x"], ["x", "y"], ["x", "y", "z"]
eq = bl.equal
row = lambda e, r: bl.ev(bl.parse(e), r)

# Forms.
for f in ["x'y + xy'", "(x + y)(x' + y')", "(x + y)(xy)'"]:
    assert eq(f, "x \\oplus y", XY)
for f in ["(x \\oplus y)'", "xy + x'y'", "(x' + y)(x + y')"]:
    assert eq(f, "x \\odot y", XY)

# Laws table: parse the statements and check each (the 'not idempotent' row separately).
sec = L.split(":::table{#xor-laws")[1].split("\n:::")[0]
stmts = re.findall(r"^\| [A-Za-z -]+ \| \$(.+?)\$ \|", sec, re.M)
assert len(stmts) == 8
stmts = [s_ for s_ in stmts if ", not" not in s_]
for s_ in stmts:
    lhs, rhs = s_.split(" = ")
    v = sorted(bl.variables(bl.parse(lhs)) | bl.variables(bl.parse(rhs)))
    assert eq(lhs, rhs, v), s_
assert eq("x \\oplus x", "0", X) and not eq("x \\oplus x", "x", X)
par = bl.tt("(x \\oplus y) \\oplus z", XYZ)
assert par == bl.tt("x \\oplus (y \\oplus z)", XYZ) == (0, 1, 1, 0, 1, 0, 0, 1)
assert [i for i, v in enumerate(par) if v] == [1, 2, 4, 7]
assert all(((x + y) % 2 + z) % 2 == (x + y + z) % 2 for x, y, z in product((0, 1), repeat=3))
# Cancellation, moving across, distributivity.
for x, y, z in product((0, 1), repeat=3):
    if x ^ y == x ^ z:
        assert y == z
    assert (x ^ y == z) == (x == y ^ z) == (y == x ^ z)
assert eq("x(y \\oplus z)", "xy \\oplus xz", XYZ)
assert not eq("x + (y \\oplus z)", "(x + y) \\oplus (x + z)", XYZ)
diff = [i for i in range(8) if bl.tt("(x + y) \\oplus z", XYZ)[i] != bl.tt("x \\oplus (y + z)", XYZ)[i]]
assert diff == [0b011, 0b110]
has("(they differ on rows 011 and 110)")
# Complemented inputs and the bubble count.
assert eq("x' \\oplus y", "x \\odot y", XY) and eq("x \\oplus y'", "x \\odot y", XY) and eq("x' \\oplus y'", "x \\oplus y", XY)
assert eq("(x' \\odot y)'", "x \\odot y", XY)
# Arithmetic view.
assert all((x ^ y) == x + y - 2 * x * y for x, y in product((0, 1), repeat=2))
assert eq("x'", "x \\oplus 1", X) and eq("x + y", "x \\oplus y \\oplus xy", XY)
assert all((x | y) == (x ^ y) for x, y in product((0, 1), repeat=2) if x & y == 0)
assert eq("x'y + xy'", "x'y \\oplus xy'", XY)

# XOR examples.
assert eq("1 \\oplus x \\oplus x'", "0", X)
assert eq("(x + y) \\oplus xy", "x \\oplus y", XY)
PQR = ["P", "Q", "R"]
assert eq("(P \\oplus Q \\oplus 1) \\oplus (Q \\oplus R) \\oplus (R \\oplus P \\oplus 0) \\oplus Q", "Q'", PQR)
assert eq("(x + y) \\oplus x", "x'y", XY) and eq("y \\oplus xy", "x'y", XY)
assert eq("x + (y \\oplus z)", "x \\oplus (y \\oplus z) \\oplus x(y \\oplus z)", XYZ)

# Parity examples.
assert sum(map(int, "10110110")) == 5
assert bl.minterms("A \\oplus B \\oplus C", ["A", "B", "C"]) == [1, 2, 4, 7]
X4 = ["x1", "x2", "x3", "x4"]
odd = [r for r in bl.rows(X4) if (r["x1"] ^ r["x2"] ^ r["x3"] ^ r["x4"]) == 1]
for claim in ["(x_1 \\oplus x_2) \\odot (x_3 \\oplus x_4)'", "x_1 + x_2 + x_3 + x_4", "(x_1x_2x_3x_4)'", "x_1' \\oplus x_2' \\oplus x_3' \\oplus x_4'"]:
    assert all(row(claim, r) == 1 for r in odd), claim
even = [r for r in bl.rows(X4) if (r["x1"] ^ r["x2"] ^ r["x3"] ^ r["x4"]) == 0]
assert row("x_1 + x_2 + x_3 + x_4", even[0]) == 0 and row("(x_1x_2x_3x_4)'", even[-1]) == 0
for k in range(1, 9):
    v = 0
    for _ in range(k):
        v ^= 1
    assert v == k % 2
assert (4 + 1) % 2 == 1 and (5 + 1) % 2 == 0  # n operations ⇒ n + 1 copies

# XNOR facts and chains.
assert eq("x \\odot x", "1", X) and eq("x \\odot 1", "x", X) and eq("x \\odot 0", "x'", X)
assert eq("(x \\odot y) \\odot z", "x \\odot (y \\odot z)", XYZ)
for n in range(2, 6):
    vs = [f"v{i}" for i in range(n)]
    chain = " \\odot ".join(vs)
    xor = " \\oplus ".join(vs)
    assert bl.tt(chain, vs) == (bl.tt(xor, vs) if n % 2 else bl.complement_tt(bl.tt(xor, vs)))
    zeros_even = tuple(int((n - bin(i).count("1")) % 2 == 0) for i in range(2 ** n))
    assert bl.tt(chain, vs) == zeros_even

# Operator properties over all 16 two-input operators.
def op(col):
    return lambda a, b: col[2 * a + b]


def commutative(col):
    return col[1] == col[2]


def associative(col):
    f = op(col)
    return all(f(f(a, b), c) == f(a, f(b, c)) for a, b, c in product((0, 1), repeat=3))


cols = {"AND": (0, 0, 0, 1), "OR": (0, 1, 1, 1), "XOR": (0, 1, 1, 0), "XNOR": (1, 0, 0, 1), "NAND": (1, 1, 1, 0), "NOR": (1, 0, 0, 0), "IMP": (1, 1, 0, 1)}
props = {k: (commutative(c), associative(c), all(op(c)(a, a) == a for a in (0, 1))) for k, c in cols.items()}
assert props == {"AND": (True, True, True), "OR": (True, True, True), "XOR": (True, True, False), "XNOR": (True, True, False),
                 "NAND": (True, False, False), "NOR": (True, False, False), "IMP": (False, False, False)}
both = [c for c in product((0, 1), repeat=4) if commutative(c) and associative(c)]
assert len(both) == 6
# NAND/NOR closed forms and the separating rows.
ABC = ["a", "b", "c"]
assert eq("((ab)'c)'", "ab + c'", ABC) and eq("(a(bc)')'", "a' + bc", ABC)
assert row("ab + c'", {"a": 0, "b": 0, "c": 1}) == 0 and row("a' + bc", {"a": 0, "b": 0, "c": 1}) == 1
assert eq("((a + b)' + c)'", "(a + b)c'", ABC) and eq("(a + (b + c)')'", "a'(b + c)", ABC)
imp = op(cols["IMP"])
assert imp(imp(0, 0), 0) == 0 and imp(0, imp(0, 0)) == 1
# Operator examples.
assert not commutative((1, 1, 0, 1))
bimp = (1, 0, 1, 1)  # x + y'
assert not commutative(bimp) and not associative(bimp)
assert eq("(x + y') + z'", "x + y' + z'", XYZ) and eq("x + (y + z')'", "x + y'z", XYZ)
assert row("x + y' + z'", {"x": 0, "y": 1, "z": 0}) == 1 and row("x + y'z", {"x": 0, "y": 1, "z": 0}) == 0
left = (0, 0, 1, 1)  # x * y = x
assert associative(left) and not commutative(left)

# Defined/nested examples.
assert eq("x' + x", "1", X) and eq("x' + 0", "x'", X)
assert eq("((A B + A'B') B) + ((AB + A'B')' B')", "A", ["A", "B"])
assert bl.tt("x \\odot y", XY) == (1, 0, 0, 1)
nor = lambda a, b: 1 - (a | b)
assert all(nor(nor(x, x), nor(y, y)) == (x & y) and nor(nor(x, y), nor(x, y)) == (x | y) for x, y in product((0, 1), repeat=2))

# ── PYQ keys ────────────────────────────────────────────────────────────────
B = bl.bank()
q = B["cse-2013-cs-21"]
assert [o["l"] for o in q["options"] if bl.tt(o["t"], XY) != bl.tt("x \\odot y", XY)] == ["D"] == [q["answer"]]
q = B["cse-2018-cs-4"]
PQ = ["P", "Q"]
bad = [o["l"] for o in q["options"] if not eq(*o["t"].strip("$").split("="), PQ)]
assert bad == ["D"] == [q["answer"]]
q = B["cse-2026-1-cs-11"]
F = bl.tt("(\\bar{P} + Q) \\oplus (\\bar{P}Q)", PQ)
assert [o["l"] for o in q["options"] if bl.tt(o["t"], PQ) == F] == ["A", "C"] == bl.key_letters(q["answer"])
assert F == bl.tt("P \\odot Q", PQ)
q = B["cse-2014-3-cs-55"]
F = bl.tt("((1 \\oplus P) \\oplus (P \\oplus Q)) \\oplus ((P \\oplus Q) \\oplus (Q \\oplus 0))", PQ)
assert [o["l"] for o in q["options"] if bl.tt(o["t"], PQ) == F] == ["D"] == [q["answer"]]
q = B["it-2005-cs-7"]
A3 = ["A", "B", "C"]
F = bl.tt("(A \\oplus B) \\oplus C", A3)
assert [o["l"] for o in q["options"] if o["t"] != "None of these" and bl.tt(o["t"], A3) == F] == ["C"] == [q["answer"]]
q = B["cse-2016-2-cs-8"]
hold = [r for r in bl.rows(X4) if (r["x1"] ^ r["x2"] ^ r["x3"] ^ r["x4"]) == 0]
must = [o["l"] for o in q["options"] if all(row(o["t"].split("=")[0], r) == row(o["t"].split("=")[1], r) for r in hold)]
assert must == ["C"] == [q["answer"]]
q = B["cse-1998-a-13"]  # n XOR operations = n + 1 copies of B
res = lambda n: "B" if (n + 1) % 2 else "0"
assert all(res(n) == "B" for n in (2, 4, 6)) and all(res(n) == "0" for n in (1, 3, 5)) and q["answer"] == "D"
assert q["options"][3]["t"] == "remains unchanged when n is even"
for qid in ("cse-1992-a-2-i", "cse-1998-a-43"):
    q = B[qid]
    names = {o["l"]: o["t"].replace("EX-OR", "XOR").replace("EXOR", "XOR") for o in q["options"]}
    got = [k for k, n in names.items() if commutative(cols[n]) and not associative(cols[n])]
    assert got == bl.key_letters(q["answer"]), (qid, got)
q = B["cse-2015-1-cs-28"]
assert commutative(cols["XOR"]) and associative(cols["XOR"]) and q["answer"] == "A" and "0 | 1 | 1 |" in q["text"]
q = B["cse-2016-1-cs-6"]
col = (0, 1, 1, 0)  # x#0 = x, x#1 = x'
assert all(col[2 * a] == a and col[2 * a + 1] == 1 - a for a in (0, 1)) and col[0] == 0 and col[3] == 0 and col[1] == col[2] == 1
assert [o["l"] for o in q["options"] if bl.tt(o["t"], XY) == col] == ["A"] == [q["answer"]]
AB = ["A", "B"]
star = lambda a, b: (a & b) | ((1 - a) & (1 - b))
assert all(star(a, a) == 1 for a in (0, 1)) and B["cse-1994-a-27-a-i"]["answer"] == "1"
assert all(star(star(a, b), a) == b for a, b in product((0, 1), repeat=2)) and B["cse-1994-a-27-a-ii"]["answer"] == "B"
q = B["cse-2007-cs-33"]
okP = all(star(y, star(x, y)) == x for x, y in product((0, 1), repeat=2))
okQ = all(star(x, star(x, y)) == y for x, y in product((0, 1), repeat=2))
okR = all(star(star(x, y), star(x, y)) == 1 for x, y in product((0, 1), repeat=2))  # X*Y*Z with Z = X*Y
assert okP and okQ and okR and q["answer"] == "D"
q = B["cse-1997-a-11"]
s = lambda a, b: (1 - a) | b
z = lambda x, y: s(x, y)
assert all(s(z(x, y), x) == x for x, y in product((0, 1), repeat=2)) and q["answer"] == "B"
q = B["cse-2002-a-28"]
f = lambda a, b: (1 - a) | b
target = bl.tt(lambda x, y, z: f(f(x | y, y), z), XYZ)
assert [o["l"] for o in q["options"] if o["t"] != "None of the above" and bl.tt(o["t"], XYZ) == target] == ["C"] == [q["answer"]]

# ── Practice ────────────────────────────────────────────────────────────────
P = bl.practice()


def match(qid, target, vars_):
    return [o["l"] for o in P[qid]["options"] if bl.tt(o["t"], vars_) == bl.tt(target, vars_)]


m = match("nx-dl-02-03-q01", "x \\odot y", XY)
assert len(m) == 1
bl.assert_mcq(P["nx-dl-02-03-q01"], m[0])
bl.assert_msq(P["nx-dl-02-03-q02"], match("nx-dl-02-03-q02", "x \\odot y", XY))
bl.assert_nat(P["nx-dl-02-03-q03"], sum(bl.tt("A \\oplus B \\oplus C \\oplus D", ["A", "B", "C", "D"])))
bl.assert_mcq(P["nx-dl-02-03-q04"], "B" if 7 % 2 else "A")
m = match("nx-dl-02-03-q05", "(A \\oplus B) \\oplus (B \\oplus C) \\oplus (C \\oplus A \\oplus 1)", A3)
bl.assert_mcq(P["nx-dl-02-03-q05"], m[0])
assert len(m) == 1
nor_col = (1, 0, 0, 0)
lab = {(True, True): "A", (True, False): "B", (False, True): "C", (False, False): "D"}
bl.assert_mcq(P["nx-dl-02-03-q06"], lab[(commutative(nor_col), associative(nor_col))])
bl.assert_mcq(P["nx-dl-02-03-q07"], lab[(commutative(cols["IMP"]), associative(cols["IMP"]))])
bl.assert_nat(P["nx-dl-02-03-q08"], len(both))
d = lambda a, b: a | (1 - b)
assert all(d(d(x, y), x) == 1 for x, y in product((0, 1), repeat=2))
bl.assert_mcq(P["nx-dl-02-03-q09"], "A")
assert P["nx-dl-02-03-q09"]["options"][0]["t"] == "$1$"
assert sorted(k for k in P if k.startswith("nx-dl-02-03-")) == [f"nx-dl-02-03-q{i:02d}" for i in range(1, 10)]

assert bl.sympy_equivalent("(x \\oplus y) \\oplus z", "x \\oplus (y \\oplus z)", XYZ)
print("l2_03_xor_operators: XOR laws, parity, operator properties, 16 PYQ keys and the practice answers check out")
