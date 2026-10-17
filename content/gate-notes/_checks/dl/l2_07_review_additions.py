"""Checks for the material added to Chapter 2 in the second-pass review: the proving/disproving
examples (lesson 2), complemented-input and XNOR-chain examples (lesson 3), the variable-order trap,
the self-dual pair proof and the majority examples (lesson 4), the Sheffer and minority examples and
the corrected gate-count rows (lesson 5), and the wrong-gate and edge-detector statements (lesson 6)."""
import pathlib
import sys
from itertools import product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402

eq, tt, row = bl.equal, bl.tt, (lambda e, r: bl.ev(bl.parse(e), r))
XY, XYZ, ABC = ["x", "y"], ["x", "y", "z"], ["A", "B", "C"]
L2, L3, L4, L5, L6 = (bl.lesson_text(f) for f in ["02-boolean-laws.md", "03-xor-and-operators.md", "04-canonical-forms.md",
                                                   "05-universal-gates.md", "06-gate-circuit-analysis.md"])

# Lesson 2.
assert row("x + yz", {"x": 1, "y": 0, "z": 0}) == 1 and row("(x + y)z", {"x": 1, "y": 0, "z": 0}) == 0
assert eq("x'y + xy' + xy", "x + y", XY) and tt("x'y + xy' + xy", XY) == (0, 1, 1, 1)
assert all(row("x \\oplus y", r) == row("x + y", r) for r in bl.rows(XY) if r["x"] & r["y"] == 0) and not eq("x \\oplus y", "x + y", XY)
assert eq(bl.dual("x + x'y"), "x(x' + y)", XY) and eq("x(x' + y)", "xy", XY)
diff = [i for i in range(8) if tt("(x + y) \\oplus z", XYZ)[i] != tt("x \\oplus (y + z)", XYZ)[i]]
assert diff == [3, 6]
assert eq("(X + Y + Z)(X' + Y)(Y' + Z)", "Z(X' + Y)", ["X", "Y", "Z"]) and eq("Z' + XY'", "((X + Y + Z)(X' + Y)(Y' + Z))'", ["X", "Y", "Z"])
assert eq("A'B'C + BC", "A'C + BC", ABC) and eq("AB + A'C + BC", "AB + A'C", ABC)
for t in bl.all_functions(3):  # functional form of the dual, for every function (via its canonical SOP)
    ms = [i for i in range(8) if t[i]]
    expr = " + ".join("".join(v + ("" if (i >> (2 - k)) & 1 else "'") for k, v in enumerate("ABC")) for i in ms) or "0"
    assert tt(bl.dual(expr), ABC) == bl.dual_tt(t)

# Lesson 3.
assert eq("x' \\oplus y' \\oplus 1", "x \\odot y", XY)
assert eq("x' \\oplus y", "(x \\oplus y)'", XY) and eq("x' \\odot y'", "(x \\oplus y)'", XY) and eq("x \\odot y'", "x \\oplus y", XY)
assert eq("(A' \\odot B)' \\oplus C'", "A \\oplus B \\oplus C", ABC)
assert row("(x + y)' \\oplus z", {"x": 1, "y": 1, "z": 0}) == 0 and row("x \\oplus y \\oplus z \\oplus 1", {"x": 1, "y": 1, "z": 0}) == 1
assert row("1 \\odot 0", {}) == 0 and row("(1 \\odot 0) \\odot 1", {}) == 0
W4 = ["w", "x", "y", "z"]
assert eq("w \\odot x \\odot y \\odot z", "(w \\oplus x \\oplus y \\oplus z)'", W4) and sum(tt("w \\odot x \\odot y \\odot z", W4)) == 8
assert row("x \\odot y \\odot z", {"x": 0, "y": 0, "z": 0}) == 0
assert eq("(x + y) \\oplus xy", "(x + y)(xy)'", XY)
assoc = [c for c in product((0, 1), repeat=4) if all(c[2 * c[2 * a + b] + d] == c[2 * a + c[2 * b + d]] for a, b, d in product((0, 1), repeat=3))]
assert sorted(assoc) == sorted([(0, 0, 0, 0), (1, 1, 1, 1), (0, 0, 0, 1), (0, 1, 1, 1), (0, 1, 1, 0), (1, 0, 0, 1), (0, 0, 1, 1), (0, 1, 0, 1)])
X4 = ["x1", "x2", "x3", "x4"]
even = [r for r in bl.rows(X4) if sum(r.values()) % 2 == 0]
assert all(row("(x_1 \\oplus x_2) \\odot (x_3 \\oplus x_4)'", r) == 0 for r in even)
assert all(row("x_1' \\oplus x_2' \\oplus x_3' \\oplus x_4'", r) == 0 for r in even)

# Lesson 4.
assert bl.minterms("AB'", ["B", "C", "A"]) == [1, 3]
bl.must_contain(L4, "$\\Sigma(1, 3)$ as $f(B, C, A)$")
for n in (2, 3, 4):
    for t in bl.all_functions(n) if n < 4 else list(bl.all_functions(4))[::97]:
        assert bl.is_self_dual(t) == all(t[i] != t[2 ** n - 1 - i] for i in range(2 ** n))
M = lambda a, b, c: (a & b) | (b & c) | (c & a)
assert M(1, 0, 1) == 1 and M(0, 0, 1) == 0
assert all(M(a, b, 0) == (a & b) and M(a, b, 1) == (a | b) for a, b in product((0, 1), repeat=2))
assert all(M(a, b, c) == (a if a == b else c) for a, b, c in product((0, 1), repeat=3))
assert all(M(1 - a, 1 - b, 1 - c) == 1 - M(a, b, c) for a, b, c in product((0, 1), repeat=3))
assert all(M(a, b, 1 - a) == b for a, b in product((0, 1), repeat=2))
assert eq("(a + b)(b + c)", "b + ac", ["a", "b", "c"]) and eq("(b + ac)(c + a)", "bc + ab + ac", ["a", "b", "c"])

# Lesson 5.
h = tt("x'z' + y'z'", XYZ)
assert h[0] == 1 and h[7] == 0 and sum(h) == 3 and not bl.is_self_dual(h) and bl.complete([h])
assert bl.minterms("x'z' + y'z'", XYZ) == [0, 2, 4] and tt(lambda x, y: h[4 * x + 2 * y], XY) == tt("(xy)'", XY)
m = tt("x'y' + y'z' + z'x'", XYZ)
assert m[0] == 1 and m[7] == 0 and bl.is_self_dual(m) and not bl.complete([m])
assert bl.min_gates(tt("A \\oplus B", ["A", "B"]), "NAND") == 4
assert eq("X' + Y + W'", "(X Y' W)'", ["X", "Y", "W"])

# Lesson 6.
V4 = ["a", "b", "c", "d"]
faulty = tt(lambda a, b, c, d: (1 - ((1 - (a & b)) & c)) | (1 - ((1 - (b & d)) & (1 - a))), V4)
assert faulty == tt("a + bd + c'", V4) and eq("ab + c' + bd + a", "a + bd + c'", V4)


def pulses(d1, d2):
    """Transitions of B = P ⊕ P(t − d2), P = A ⊕ A(t − d1), A a single rising edge at 0 (exact)."""
    P = [(0, d1)]
    Pd = [(d2, d2 + d1)]
    pts = sorted({t for a, b in P + Pd for t in (a, b)})
    val = lambda t: sum(a <= t < b for a, b in P) ^ sum(a <= t < b for a, b in Pd)
    changes, last = 0, 0
    for t in pts:
        v = val(t)
        if v != last:
            changes, last = changes + 1, v
    return changes


assert pulses(1, 3) == 4 and pulses(2, 4) == 4 and pulses(2, 2) == 2 and pulses(3, 1) == 4
print("l2_07_review_additions: every example added in the review checks out")
