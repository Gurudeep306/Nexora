"""Checks for dl/02-boolean-algebra-gates/05-universal-gates: the NAND/NOR constructions, the gate
count table (every entry re-derived by exhaustive search), the XOR minimality theorem, two-level and
multi-level conversions, Post's classes and theorem (checked against brute-force closure for small
sets), the Sheffer count, every worked example, all eleven PYQ keys (including the corrected key of
cse-2009-cs-6) and the practice answers."""
import pathlib
import re
import sys
from itertools import product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402

L = bl.lesson_text("05-universal-gates.md")
has = lambda *s: bl.must_contain(L, *s)
AB, ABC = ["A", "B"], ["A", "B", "C"]
eq = bl.equal
tt = bl.tt

# Constructions.
assert eq("(x x)'", "x'", ["x"]) and eq("(((AB)')((AB)'))'", "AB", AB) and eq("((AA)'(BB)')'", "A + B", AB)
assert eq("((A + A)')", "A'", AB) and eq("((A + B)' + (A + B)')'", "A + B", AB) and eq("((A + A)' + (B + B)')'", "AB", AB)
assert eq("x + y", "(x'y')'", ["x", "y"]) and eq("xy", "(x' + y')'", ["x", "y"])
G1 = "(AB)'"
G2, G3 = f"(A{G1})'", f"({G1}B)'"
assert eq(G2, "A' + B", AB) and eq(G3, "A + B'", AB) and eq(f"(({G2})({G3}))'", "A \\oplus B", AB)
# NAND properties.
assert eq("x \\uparrow y", "y \\uparrow x", ["x", "y"]) and not eq("(x \\uparrow y) \\uparrow z", "x \\uparrow (y \\uparrow z)", ["x", "y", "z"])
assert eq("x \\uparrow x", "x'", ["x"]) and eq("x' + y'", "x \\uparrow y", ["x", "y"])

# Gate count table: parse every row and re-derive both minima.
sec = L.split(":::table{#gate-count-table")[1].split("\n:::")[0]
rows = [((e + "'") if neg else e, a, b) for neg, e, a, b in re.findall(r"^\| (NOT )?\$(.+?)\$ \| \**(\d+)\** \| \**(\d+)\** \|$", sec, re.M)]
assert len(rows) == 14, rows
for expr, nand, nor in rows:
    v = sorted(bl.variables(bl.parse(expr)))
    t = tt(expr, v)
    assert bl.min_gates(t, "NAND", max_k=7) == int(nand), (expr, "NAND")
    assert bl.min_gates(t, "NOR", max_k=7) == int(nor), (expr, "NOR")
# Duality of counts: the NAND count of f equals the NOR count of its dual.
for expr, nand, nor in rows:
    v = sorted(bl.variables(bl.parse(expr)))
    d = bl.dual_tt(tt(expr, v))
    assert bl.min_gates(d, "NOR", max_k=7) == int(nand)
# XOR minimality, and the reachable-signal list of the proof.
assert bl.min_gates(tt("A \\oplus B", AB), "NAND", max_k=3) is None
reach = set()
start = bl.input_masks(2)
for a in range(2):
    for b in range(a, 2):
        g = bl._mask_op(bl.GATE2["NAND"], start[a], start[b], 4)
        sig = start + [g]
        reach.add(g)
        for i in range(3):
            for j in range(i, 3):
                reach.add(bl._mask_op(bl.GATE2["NAND"], sig[i], sig[j], 4))
cols = {sum(((m >> r) & 1) << (3 - r) for r in range(4)) for m in reach}
name = lambda c: f"{c:04b}"
assert {name(c) for c in cols} == {"1110", "1100", "1010", "0001", "1101", "1011", "1111", "0011", "0101"}
both = [c for c in ({name(c) for c in cols} | {"0011", "0101"}) if c[0] == "1" and c[3] == "1"]
assert sorted(both) == ["1011", "1101", "1111"]

# Two-level and multi-level examples.
V4 = ["A", "B", "C", "D"]
assert eq("((AB)'(CD)')'", "AB + CD", V4) and eq("((A + B)' + (C + D)')'", "(A + B)(C + D)", V4)
assert eq("((AB)' C')'", "AB + C", ABC) and eq("((AB)' C)'", "AB + C'", ABC)
assert eq("AB + C", "(A + C)(B + C)", ABC) and eq("((A + C)' + (B + C)')'", "AB + C", ABC)
V6 = ["a", "b", "c", "d", "e", "f"]
n1, n2, n5 = "(a + b)'", "(c + d)'", "(e + f)'"
n3 = f"({n1} + {n2})'"
n4 = f"({n3} + {n3})'"
assert eq(f"({n4} + {n5})'", "(a + b)(c + d)(e + f)", V6)
# Edge examples and minimum-count examples.
assert eq("(X Y' Z)'", "X' + Y + Z'", ["X", "Y", "Z"])
assert bl.min_gates(tt("(ABC)'", ABC), "NAND") == 3 and eq("(((AB)')' C)'", "(ABC)'", ABC)
assert bl.min_gates(tt("A + BC", ABC), "NAND") == 3 and eq("((BC)' A')'", "A + BC", ABC)
assert bl.min_gates(tt("A \\odot B", AB), "NAND") == 5 and bl.min_gates(tt("A \\odot B", AB), "NOR") == 4
assert bl.min_gates(tt("A'B", AB), "NOR") == 2 and bl.min_gates(tt("A'B", AB), "NAND") == 3
assert eq("(A + (B + B)')'", "A'B", AB) and eq("((((AB)')B)')'", "A'B", AB)
# Trap: AB + C with NOR, naive 5, minimum 3; the two-gate form (x + y)z′.
assert bl.min_gates(tt("AB + C", ABC), "NOR") == 3
assert eq("((x + y)' + z)'", "(x + y)z'", ["x", "y", "z"])

# Post's classes: closure checked by brute force for small generating sets.
def closure(funcs, n=2, constants=()):
    """Every function of n variables computable from the inputs (and constants) with the given 2-input functions."""
    R = 2 ** n
    cur = set(bl.input_masks(n)) | {0 if c == 0 else (1 << R) - 1 for c in constants}
    ops = [lambda a, b, t=t: bl._mask_op(lambda x, y: t[2 * x + y], a, b, R) for t in funcs]
    while True:
        new = {op(a, b) for op in ops for a in cur for b in cur} - cur
        if not new:
            return cur
        cur |= new


two = list(product((0, 1), repeat=4))
full = (1 << 4) - 1
for t in two:
    cl = closure([t])
    assert (len(cl) == 16) == bl.complete([t]), t
    assert (len(closure([t], constants=(0, 1))) == 16) == bl.complete([t], constants=(0, 1)), t
assert sum(1 for t in two if bl.complete([t])) == 2
# Sets from the checklist and the complete-with-constants table.
f2 = lambda e: tt(e, ["x", "y"])
assert bl.complete([f2("(xy)'")]) and not bl.complete([f2("xy"), f2("x + y")]) and not bl.complete([f2("x \\oplus y"), tt("x'", ["x"])])
assert bl.complete([f2("xy"), tt("x'", ["x"])]) and not bl.complete([f2("x' + y")]) and bl.complete([f2("x' + y")], constants=(0,))
mux = tt("s'a + sb", ["s", "a", "b"])
maj = tt("xy + yz + zx", ["x", "y", "z"])
assert not bl.complete([mux]) and bl.complete([mux], constants=(0, 1)) and not bl.complete([maj], constants=(0, 1))
assert bl.complete([f2("xy"), f2("x \\oplus y")], constants=(1,)) and not bl.complete([f2("xy"), f2("x \\oplus y")])
assert bl.complete([f2("x'y")], constants=(1,)) and not bl.complete([f2("x'y")])
assert not bl.complete([f2("x \\oplus y"), f2("x \\odot y")], constants=(0, 1))
assert eq("s'a + sb", "s'a + sb", ["s", "a", "b"])
m = lambda s, a, b: ((1 - s) & a) | (s & b)
assert all(m(x, 1, 0) == 1 - x and m(x, 0, y) == (x & y) and m(x, y, 1) == (x | y) for x, y in product((0, 1), repeat=2))
imp = lambda x, y: (1 - x) | y
assert all(imp(x, 0) == 1 - x and imp(imp(x, 0), y) == (x | y) for x, y in product((0, 1), repeat=2))
assert all(imp(imp(x, y), imp(imp(y, x), 0)) == (x ^ y) for x, y in product((0, 1), repeat=2))
assert all(((x ^ 1) == 1 - x) for x in (0, 1))
inh = lambda x, y: (1 - x) & y
assert all(inh(x, 1) == 1 - x and inh(1 - x, y) == (x & y) for x, y in product((0, 1), repeat=2))
# Sheffer criterion over all 3-variable functions.
for t in bl.all_functions(3):
    sheffer = t[0] == 1 and t[7] == 0 and not bl.is_self_dual(t)
    assert sheffer == bl.complete([t])
    if t[0] == 1 and t[7] == 0 and bl.is_affine(t):
        assert bl.is_self_dual(t)

# ── PYQ keys ────────────────────────────────────────────────────────────────
B = bl.bank()
q = B["it-2004-it-8"]
n = bl.min_gates(tt("A \\oplus B", AB), "NAND")
assert [o["l"] for o in q["options"] if o["t"] == str(n)] == ["B"] == [q["answer"]]
q = B["cse-2009-cs-6"]
n = bl.min_gates(tt("AB + C", ABC), "NOR")
assert n == 3
assert [o["l"] for o in q["options"] if o["t"] == str(n)] == ["B"]
assert q["answer"] == "B", f"cse-2009-cs-6: bank key {q['answer']}; the proven answer is B (3 NOR gates) — apply src/gate/fixes/cse-2009.json"
q = B["cse-1995-b-63-a"]
assert eq("(A B C')'", "A' + B' + C", ABC)
q = B["cse-2002-b-55-b"]
V6s = ["a", "b", "c", "d", "e", "f"]
N1, N2, N5 = "(ab)'", "(cd)'", "(ef)'"
N3 = f"({N1}{N2})'"
N4 = f"({N3}{N3})'"
assert eq(f"({N4}{N5})'", "ab + cd + ef", V6s) and eq(N3, "ab + cd", V6s)
q = B["cse-2015-3-cs-2"]
h = lambda x, y: (1 - x) | (1 - y)
S1 = all(h(h(p, q_), r) == h(p, h(q_, r)) for p, q_, r in product((0, 1), repeat=3))
S2 = all(h(q_, r) == h(r, q_) for q_, r in product((0, 1), repeat=2))
assert (S1, S2) == (False, True) and q["answer"] == "B"
q = B["cse-1992-a-2-ii"]
cands = {"A": [f2("x \\oplus y")], "B": [mux], "C": [f2("x \\oplus y"), f2("xy")], "D": [f2("x + y")]}
assert [k for k, fs in cands.items() if bl.complete(fs, constants=(0, 1))] == ["B", "C"] == bl.key_letters(q["answer"])
q = B["cse-1999-a-34"]
cands = {"A": [f2("x \\oplus y"), tt("x'", ["x"])], "B": [mux], "C": [f2("xy"), f2("x \\oplus y")], "D": [tt("AB + C", ABC)]}
assert [k for k, fs in cands.items() if bl.complete(fs, constants=(0, 1))] == ["B", "C"] == bl.key_letters(q["answer"])
q = B["cse-1993-ii-b-9"]
assert bl.complete([f2("x \\oplus y"), f2("xy")], constants=(1,)) and not bl.complete([f2("x \\oplus y"), f2("xy")])
for qid in ("cse-1998-a-57-a", "cse-1998-a-57-b"):
    assert B[qid]["type"] == "DESC"
assert bl.complete([f2("x' + y")], constants=(0,))
q = B["cse-2015-1-cs-39"]
XYZ = ["X", "Y", "Z"]
f = tt("X'YZ + XY' + Y'Z'", XYZ)
g = tt("X'YZ + X'YZ' + XY", XYZ)
assert bl.complete([f]) and not bl.complete([g]) and g == tt("Y", XYZ) and q["answer"] == "B"
assert eq("X'YY + XY' + Y'Y'", "(XY)'", ["X", "Y"]) and bl.minterms("X'YZ + XY' + Y'Z'", XYZ) == [0, 3, 4, 5]

# ── Practice ────────────────────────────────────────────────────────────────
P = bl.practice()
q = P["nx-dl-02-05-q01"]
bl.assert_mcq(q, [o["l"] for o in q["options"] if o["t"] == str(bl.min_gates(tt("AB", AB), "NOR"))][0])
bl.assert_nat(P["nx-dl-02-05-q02"], bl.min_gates(tt("A \\odot B", AB), "NAND"))
q = P["nx-dl-02-05-q03"]
F = tt("((AB')'(CD)')'", V4)
m_ = [o["l"] for o in q["options"] if tt(o["t"], V4) == F]
assert len(m_) == 1
bl.assert_mcq(q, m_[0])
sets = {"A": [f2("xy"), f2("x \\oplus y")], "B": [f2("x + y"), f2("x \\odot y")], "C": [f2("xy"), f2("x + y")], "D": [f2("x \\oplus y"), f2("x \\odot y")]}
bl.assert_msq(P["nx-dl-02-05-q04"], [k for k, fs in sets.items() if bl.complete(fs, constants=(0, 1))])
x_ = f2("x'y + xy'")
pc = bl.post_classes(x_)
bl.assert_msq(P["nx-dl-02-05-q05"], [k for k, c in {"A": "0-preserving", "B": "affine", "C": "self-dual", "D": "monotone"}.items() if pc[c]])
bl.assert_nat(P["nx-dl-02-05-q06"], sum(1 for t in two if bl.complete([t])))
q = P["nx-dl-02-05-q07"]
F = tt(lambda x, y: m(x, y, 1), ["x", "y"])
bl.assert_mcq(q, [o["l"] for o in q["options"] if tt(o["t"], ["x", "y"]) == F][0])
q = P["nx-dl-02-05-q08"]
V3 = ["x", "y", "z"]
ok = [o["l"] for o in q["options"] if bl.complete([tt(o["t"].split("=")[1], V3)])]
assert len(ok) == 1
bl.assert_mcq(q, ok[0])
bl.assert_nat(P["nx-dl-02-05-q09"], bl.min_gates(tt("A + B + C", ABC), "NAND", max_k=7))
assert sorted(k for k in P if k.startswith("nx-dl-02-05-")) == [f"nx-dl-02-05-q{i:02d}" for i in range(1, 10)]

print("l2_05_universal_gates: constructions, gate minima by search, Post classes, 11 PYQ keys and the practice answers check out")
