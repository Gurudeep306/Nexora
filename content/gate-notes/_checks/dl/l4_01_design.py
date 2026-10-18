"""Checks for dl/04-combinational-circuits/01-combinational-design: the latch counterexample, every truth
table and minimal form of the worked examples, the digit ≥ 5 detector (minimal SOP, the 3-gate circuit, the
exhaustive AND/OR/NOT search and the two-gate case analysis), the voting functions, BCD mod 6 / mod 5 / mod 3,
BCD ↔ excess-3, excess-3 → BCD (the three 7-literal POS forms of b4 and the three 5-literal forms of b8),
the binary ↔ Gray theorem for n ≤ 8, erratum A 38, the seven-segment segment a, the shared converter
netlist, the five PYQ answers as they stand in the bank, and the ten practice answers and distractors."""
import itertools
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import comblib as cl  # noqa: E402
import minlib as ml  # noqa: E402

L = cl.lesson_text("01-combinational-design.md")
has = lambda *s: bl.must_contain(L, *s)
V3, V4 = list("ABC"), list("ABCD")
BCD_DC = list(range(10, 16))
XS3_DC = [0, 1, 2, 13, 14, 15]
E = ["e8", "e4", "e2", "e1"]


def msops(ones, dcs, n, vars_):
    return {frozenset(ml.term(c, vars_) for c in cov) for cov in ml.min_covers(ones, dcs, n)}


def mposs(ones, dcs, n, vars_):
    return {frozenset(ml.sum_term(c, vars_) for c in cov) for cov in ml.min_pos_covers(ones, dcs, n)}


def agrees(expr, ones, dcs, vars_):
    return ml.agrees(bl.minterms(expr, vars_), ones, dcs, len(vars_))


def digits_with(pred):
    return [d for d in range(10) if pred(d)]


def bit(x, b):
    return (x >> b) & 1


# ── Combinational vs a loop: the NOR latch has two stable states for S = R = 0 ─
stable = [(q, qb) for q in (0, 1) for qb in (0, 1) if q == 1 - (0 | qb) and qb == 1 - (0 | q)]
assert stable == [(0, 1), (1, 0)]
has("two** stable states", "topological order")

# ── Truth-table examples ────────────────────────────────────────────────────
XY = ["X", "Y"]
assert bl.tt("X' + Y", XY) == (1, 1, 0, 1) and bl.tt("XY'", XY) == (0, 0, 1, 0)
cols = {"X": (0, 0, 1, 1), "Y": (0, 1, 0, 1), "XY": (0, 0, 0, 1), "X + Y": (0, 1, 1, 1), "X \\oplus Y": (0, 1, 1, 0),
        "X \\odot Y": (1, 0, 0, 1), "X'": (1, 1, 0, 0), "Y'": (1, 0, 1, 0)}
for e, c in cols.items():
    assert bl.tt(e, XY) == c, e
has("0011 = $X$, 0101 = $Y$, 0001 = $XY$, 0111 = $X + Y$, 0110 = $X \\oplus Y$")
# Compressed table: 1-- → 1, 01- → 0, 001 → 1, 000 → 0.
comp = [m for m in range(8) if (m >> 2) or m == 1]
assert comp == [1, 4, 5, 6, 7] and msops(comp, [], 3, V3) == {frozenset(["A", "B'C"])}
# Four expressions vs the column 0,1,1,0,1,0,0,1.
odd = [1, 2, 4, 7]
assert bl.minterms("A \\oplus B \\oplus C", V3) == odd and bl.minterms("A'B'C + A'BC' + AB'C' + ABC", V3) == odd
assert bl.minterms("(A \\odot B) \\oplus C", V3) == [0, 3, 5, 6] and bl.minterms("A \\oplus (B \\odot C)'", V3) == odd
# Gray-ordered rows.
gray_rows = [0b000, 0b001, 0b011, 0b010, 0b110, 0b111, 0b101, 0b100]
col = [0, 1, 1, 0, 0, 1, 1, 0]
assert sorted(r for r, v in zip(gray_rows, col) if v) == [1, 3, 5, 7] == bl.minterms("C", V3)
assert [i for i, v in enumerate(col) if v] == [1, 2, 5, 6] == bl.minterms("B \\oplus C", V3)

# ── Detectors ────────────────────────────────────────────────────────────────
maj = [m for m in range(8) if bin(m).count("1") >= 2]
assert maj == [3, 5, 6, 7] and msops(maj, [], 3, V3) == {frozenset(["AB", "BC", "AC"])}
assert bl.minterms("A'B' + B'C' + C'A'", V3) == [0, 1, 2, 4] == [m for m in range(8) if m not in maj]
GE5 = [5, 6, 7, 8, 9]
assert msops(GE5, BCD_DC, 4, V4) == {frozenset(["A", "BD", "BC"])}
assert agrees("A + B(C + D)", GE5, BCD_DC, V4) and ml.min_literals_sop(GE5, BCD_DC, 4) == 5
assert msops(GE5, [], 4, V4) == {frozenset(["A'BD", "A'BC", "AB'C'"])} and ml.min_literals_sop(GE5, [], 4) == 9
assert cl.min_gates_aon(GE5, 4, BCD_DC) == 3
net = [("s", "OR", ["C", "D"]), ("p", "AND", ["B", "s"]), ("f", "OR", ["A", "p"])]
assert [cl.truth(net, V4, "f")[d] for d in range(10)] == [int(d >= 5) for d in range(10)]
# The 2-input version of A + BD + BC needs 4 gates (2 ANDs, 2 ORs); check it computes f.
net2 = [("p", "AND", ["B", "D"]), ("q", "AND", ["B", "C"]), ("r", "OR", ["p", "q"]), ("f", "OR", ["A", "r"])]
assert [cl.truth(net2, V4, "f")[d] for d in range(10)] == [int(d >= 5) for d in range(10)]
# The two-gate case analysis, form by form, over the care rows 0–9.
f = lambda m: int(m >= 5)
row = lambda m: dict(zip(V4, cl.bits_of(m, 4)))
care_ok = lambda g: all(g(row(m)) == f(m) for m in range(10))
subsets = [s for k in range(0, 5) for s in itertools.combinations(V4, k)]
AND = lambda s, r: int(all(r[v] for v in s))
OR = lambda s, r: int(any(r[v] for v in s))
lits = [(v, p) for v in V4 for p in (0, 1)]
litval = lambda l, r: r[l[0]] if l[1] else 1 - r[l[0]]
assert f(0b0000) == 0 and f(0b0011) == 0 and f(0b0100) == 0 and f(0b0101) == 1 and f(0b0110) == 1 and f(0b1000) == 1
assert not any(care_ok(lambda r, v=v: r[v]) for v in V4)
for s in subsets:
    if s:
        assert not care_ok(lambda r, s=s: 1 - AND(s, r)) and not care_ok(lambda r, s=s: 1 - OR(s, r))
for k in range(1, 5):
    for ls in itertools.combinations(lits, k):
        assert not care_ok(lambda r, ls=ls: int(all(litval(l, r) for l in ls)))
        assert not care_ok(lambda r, ls=ls: int(any(litval(l, r) for l in ls)))
for X in subsets:
    for Y in subsets:
        if Y:
            assert not care_ok(lambda r, X=X, Y=Y: OR(X, r) | AND(Y, r))
            assert not care_ok(lambda r, X=X, Y=Y: AND(X, r) & OR(Y, r))
# Edge case: no don't-cares. The 7-gate circuit works and no circuit of ≤ 4 gates exists.
netE = [("na", "NOT", ["A"]), ("nb", "NOT", ["B"]), ("nc", "NOT", ["C"]), ("s", "OR", ["C", "D"]),
        ("p", "AND", ["na", "B", "s"]), ("q", "AND", ["A", "nb", "nc"]), ("f", "OR", ["p", "q"])]
assert cl.ones_of(cl.truth(netE, V4, "f")) == GE5 and len(netE) == 7
assert cl.min_gates_aon(GE5, 4, [], max_k=4) is None
# At least two of four.
at2 = [m for m in range(16) if bin(m).count("1") >= 2]
assert len(at2) == 11 and [m for m in range(16) if m not in at2] == [0, 1, 2, 4, 8]
assert msops(at2, [], 4, V4) == {frozenset(["AB", "AC", "AD", "BC", "BD", "CD"])} and ml.min_literals_sop(at2, [], 4) == 12
assert mposs(at2, [], 4, V4) == {frozenset(["(A + B + C)", "(A + B + D)", "(A + C + D)", "(B + C + D)"])} and ml.min_literals_pos(at2, [], 4) == 12
assert bl.minterms("AB + CD + (A + B)(C + D)", V4) == at2
net_at2 = [("x", "OR", ["A", "B"]), ("y", "OR", ["C", "D"]), ("z", "AND", ["x", "y"]), ("u", "AND", ["A", "B"]),
           ("v", "AND", ["C", "D"]), ("f", "OR", ["u", "v", "z"])]
assert cl.ones_of(cl.truth(net_at2, V4, "f")) == at2
# Don't-care counts.
assert 2 ** 5 - 10 == 22 and 256 - 100 == 156

# ── BCD mod n ────────────────────────────────────────────────────────────────
I = ["I4", "I3", "I2", "I1"]
mod6 = {b: digits_with(lambda d, b=b: bit(d % 6, b)) for b in range(4)}
assert mod6 == {0: [1, 3, 5, 7, 9], 1: [2, 3, 8, 9], 2: [4, 5], 3: []}
assert msops(mod6[0], BCD_DC, 4, I) == {frozenset(["I1"])}
assert msops(mod6[1], BCD_DC, 4, I) == {frozenset(["I4", "I3'I2"])}
assert msops(mod6[2], BCD_DC, 4, I) == {frozenset(["I3I2'"])}
net6 = [("n2", "NOT", ["I2"]), ("n3", "NOT", ["I3"]), ("r3", "AND", ["I3", "n2"]), ("t", "AND", ["I2", "n3"]), ("r2", "OR", ["I4", "t"])]
for d in range(10):
    v = cl.evaluate(net6, dict(zip(I, cl.bits_of(d, 4))))
    assert cl.num([0, v["r3"], v["r2"], v["I1"]]) == d % 6
assert sorted(op for _, op, _ in net6) == ["AND", "AND", "NOT", "NOT", "OR"]
# Bit-order trap: with I1 read as the MSB, R1 = I4 and R2 = I1 + I3·I2′ (mirrored wires).
Irev = ["I1", "I2", "I3", "I4"]
assert msops(mod6[0], BCD_DC, 4, Irev) == {frozenset(["I4"])}
assert msops(mod6[1], BCD_DC, 4, Irev) == {frozenset(["I1", "I2'I3"])}
assert msops(mod6[2], BCD_DC, 4, Irev) == {frozenset(["I2I3'"])}
has("$R_1 = I_4$", "$R_2 = I_1 + \\overline{I_2} I_3$")
has("$\\overline{I_3} I_2$", "$R_2 = I_4 + I_2 \\overline{I_3}$", "$R_3 = I_3 \\overline{I_2}$")
# Parity trick: LSB passes for even n, not for odd n; low i bits pass for 2^i.
for n in range(2, 10):
    passes = all(bit(d % n, 0) == bit(d, 0) for d in range(10))
    assert passes == (n % 2 == 0), n
for i in (1, 2, 3):
    assert all(d % 2 ** i == d & (2 ** i - 1) for d in range(10))
mod5 = {b: digits_with(lambda d, b=b: bit(d % 5, b)) for b in range(3)}
assert mod5 == {0: [1, 3, 6, 8], 1: [2, 3, 7, 8], 2: [4, 9]}
assert msops(mod5[0], BCD_DC, 4, V4) == {frozenset(["AD'", "A'B'D", "BCD'"])} and ml.min_literals_sop(mod5[0], BCD_DC, 4) == 8
assert msops(mod5[1], BCD_DC, 4, V4) == {frozenset(["B'C", "CD", "AD'"])} and ml.min_literals_sop(mod5[1], BCD_DC, 4) == 6
assert msops(mod5[2], BCD_DC, 4, V4) == {frozenset(["AD", "BC'D'"])} and ml.min_literals_sop(mod5[2], BCD_DC, 4) == 5

# ── BCD → excess-3 ───────────────────────────────────────────────────────────
B = ["B3", "B2", "B1", "B0"]
xs3 = {b: digits_with(lambda d, b=b: bit(d + 3, b)) for b in range(4)}
assert xs3 == {0: [0, 2, 4, 6, 8], 1: [0, 3, 4, 7, 8], 2: [1, 2, 3, 4, 9], 3: [5, 6, 7, 8, 9]}
assert msops(xs3[0], BCD_DC, 4, B) == {frozenset(["B0'"])}
assert msops(xs3[1], BCD_DC, 4, B) == {frozenset(["B1'B0'", "B1B0"])}
assert msops(xs3[2], BCD_DC, 4, B) == {frozenset(["B2'B0", "B2'B1", "B2B1'B0'"])}
assert msops(xs3[3], BCD_DC, 4, B) == {frozenset(["B3", "B2B0", "B2B1"])}
for b, e in {0: "B0'", 1: "(B1 \\oplus B0)'", 2: "B2 \\oplus (B1 + B0)", 3: "B3 + B2(B1 + B0)"}.items():
    assert agrees(e, xs3[b], BCD_DC, B), e
# Shared netlist: 6 gates for all four outputs.
netX = [("s", "OR", ["B1", "B0"]), ("p", "AND", ["B2", "s"]), ("e3", "OR", ["B3", "p"]), ("e2", "XOR", ["B2", "s"]),
        ("e1", "XNOR", ["B1", "B0"]), ("e0", "NOT", ["B0"])]
for d in range(10):
    v = cl.evaluate(netX, dict(zip(B, cl.bits_of(d, 4))))
    assert cl.num([v["e3"], v["e2"], v["e1"], v["e0"]]) == d + 3
assert len(netX) == 6

# ── Excess-3 → BCD ───────────────────────────────────────────────────────────
bcd = {w: [c for c in range(3, 13) if (c - 3) & w] for w in (1, 2, 4, 8)}
assert bcd == {1: [4, 6, 8, 10, 12], 2: [5, 6, 9, 10], 4: [7, 8, 9, 10], 8: [11, 12]}
assert msops(bcd[1], XS3_DC, 4, E) == {frozenset(["e1'"])}
assert msops(bcd[2], XS3_DC, 4, E) == {frozenset(["e2'e1", "e2e1'"])} and ml.min_literals_sop(bcd[2], XS3_DC, 4) == 4
assert ml.min_literals_sop(bcd[2], [], 4) == 16
b4_forms = {frozenset(["(e4' + e2)", "(e4' + e1)", "(e4 + e2' + e1')"]), frozenset(["(e8 + e1)", "(e4' + e2)", "(e4 + e2' + e1')"]),
            frozenset(["(e8 + e2)", "(e4' + e1)", "(e4 + e2' + e1')"])}
assert mposs(bcd[4], XS3_DC, 4, E) == b4_forms and ml.min_literals_pos(bcd[4], XS3_DC, 4) == 7
assert bl.minterms("e8 + e1", E) == [m for m in range(16) if m not in (0, 2, 4, 6)]
assert bl.minterms("e8 + e2", E) == [m for m in range(16) if m not in (0, 1, 4, 5)]
# The (e4 + e2' + e1') pair cannot grow: both quads around codes 3, 11 contain a 1.
assert set(ml.cells("-0-1")) & set(bcd[4]) and set(ml.cells("-01-")) & set(bcd[4])
b8_forms = {frozenset(["(e8)", "(e4 + e1)", "(e2 + e1')"]), frozenset(["(e8)", "(e4 + e2)", "(e2' + e1)"]),
            frozenset(["(e8)", "(e4 + e2)", "(e4 + e1)"])}
assert mposs(bcd[8], XS3_DC, 4, E) == b8_forms and ml.min_literals_pos(bcd[8], XS3_DC, 4) == 5
assert bl.minterms("e2 + e1'", E) == [m for m in range(16) if m not in (1, 5, 9, 13)]

# ── Gray code ────────────────────────────────────────────────────────────────
def reflected(n):
    if n == 1:
        return ["0", "1"]
    r = reflected(n - 1)
    return ["0" + x for x in r] + ["1" + x for x in reversed(r)]


for n in range(1, 9):
    for b, g in enumerate(reflected(n)):
        assert int(g, 2) == b ^ (b >> 1)
        gb = [int(c) for c in g]
        back, acc = [], 0
        for c in gb:
            acc ^= c
            back.append(acc)
        assert cl.num(back) == b
assert format(0b1011 ^ (0b1011 >> 1), "04b") == "1110"
G = {i: [m for m in range(16) if bit(m ^ (m >> 1), i)] for i in range(4)}
assert msops(G[2], [], 4, V4) == {frozenset(["A'B", "AB'"])}
assert msops([m for m in G[2] if m < 10], BCD_DC, 4, V4) == {frozenset(["A", "B"])}
assert [m for m in G[2] if m < 10] == [4, 5, 6, 7, 8, 9]
for i, e in {1: ["B'C", "BC'"], 0: ["C'D", "CD'"]}.items():
    assert msops(G[i], [], 4, V4) == msops([m for m in G[i] if m < 10], BCD_DC, 4, V4) == {frozenset(e)}
assert 12 ^ (12 >> 1) == 0b1010 and bl.ev(bl.parse("A + B"), row(12)) == 1  # input 1100: Gray 1010, but A + B = 1
assert all(bit(d, 3) & bit(d, 2) == 0 for d in range(10))  # A and B never both 1 on BCD, so A + B = A ⊕ B there

# ── Seven-segment, segment a ────────────────────────────────────────────────
seg_a = [0, 2, 3, 5, 6, 7, 8, 9]
assert msops(seg_a, BCD_DC, 4, V4) == {frozenset(["A", "C", "BD", "B'D'"])}

# ── PYQs as they stand in the bank ───────────────────────────────────────────
BK = bl.bank()
q = BK["cse-2000-b-9-a"]
assert "$I_1$ as the least significant bit" in q["text"] and "Do not detect illegal input" in q["text"]
assert q["answer"] == "0–5 → same; 6→0, 7→1, 8→2, 9→3"
assert [d % 6 for d in range(10)] == [0, 1, 2, 3, 4, 5, 0, 1, 2, 3]
q = BK["cse-2000-b-9-b"]
assert "two two-input AND gates, one two-input gate and two NOT gates" in q["text"]
ans = q["answer"]
parts = dict(re.findall(r"\$R_(\d) = ([^$]+)\$", ans))
tolatex = lambda s: re.sub(r"\\bar\{I_(\d)\}", r"I\1'", s).replace("I_", "I")
assert parts["1"] == "I_1" and parts["4"] == "0"
assert agrees(tolatex(parts["2"]), mod6[1], BCD_DC, I) and agrees(tolatex(parts["3"]), mod6[2], BCD_DC, I)
q = BK["cse-2001-b-58-b"]
assert "e8, e4, e2, e1" in q["figures"][0]["alt"] and "b8, b4, b2, b1" in q["figures"][0]["alt"]
bank_b4 = re.search(r"\$b_4 = (\(.*?\))\$ for the weight-4", q["answer"]).group(1)
bank_b4 = re.sub(r"\\bar e_(\d)", r"e\1'", bank_b4).replace("e_", "e")
assert agrees(bank_b4, bcd[4], XS3_DC, E) and len(re.findall(r"e\d", bank_b4)) == 7
assert frozenset(["(e4' + e2)", "(e4' + e1)", "(e4 + e2' + e1')"]) in b4_forms
# MSB reading: labels e4 e3 e2 e1 = MSB … LSB, b4 = BCD MSB.
EM = ["e4", "e3", "e2", "e1"]
assert agrees("e4(e3 + e2)(e3 + e1)", bcd[8], XS3_DC, EM) and "e_4(e_3 + e_2)(e_3 + e_1)" in q["answer"]
q = BK["cse-2004-cs-58"]
assert bl.option_values(q)["B"] == "3" == str(cl.min_gates_aon(GE5, 4, BCD_DC)) and q["answer"] == "B"
assert "only AND, OR and NOT" in q["text"]
q = BK["cse-2012-cs-6"]
tab = [tuple(int(x) for x in r.strip("|").split("|")) for r in q["text"].splitlines() if re.match(r"^\| [01] \|", r)]
assert len(tab) == 4
ones12 = sorted(2 * x + y for x, y, v in tab if v)
assert bl.which(bl.option_values(q), lambda t: bl.minterms(t.strip("$"), XY) == ones12) == ["A"] == [q["answer"]]

# ── Practice ─────────────────────────────────────────────────────────────────
P = cl.practice()
p = lambda k: P[f"nx-dl-04-01-q{k:02d}"]
assert len([k for k in P if k.startswith("nx-dl-04-01-")]) == 10
odd5 = [5, 7, 9]
assert agrees("D(A + B)", odd5, BCD_DC, V4) and msops(odd5, BCD_DC, 4, V4) == {frozenset(["AD", "BD"])}
bl.assert_nat(p(1), cl.min_gates_aon(odd5, 4, BCD_DC))
f2 = [2, 3, 4, 6]
ok = bl.which(bl.option_values(p(2)), lambda t: bl.minterms(t.strip("$"), V3) == f2)
bl.assert_mcq(p(2), ok[0])
assert ok == ["B"] and 5 in bl.minterms("A \\oplus B", V3) and 3 not in bl.minterms("B \\oplus C", V3)
spec3 = [m for m in range(8) if (bit(m, 0) == 0 and bit(m, 2) ^ bit(m, 1)) or m == 7]
bl.assert_msq(p(3), bl.which(bl.option_values(p(3)), lambda t: int(re.search(r"m_(\d)", t).group(1)) in spec3))
ok = bl.which(bl.option_values(p(4)), lambda t: agrees(t.strip("$").replace("_", ""), xs3[2], BCD_DC, B))
bl.assert_mcq(p(4), ok[0])
assert ok == ["A"]
for e, d in (("B2 \\oplus B1 \\oplus B0", 3), ("B2 + B1 B0", 1), ("(B2)'(B1 + B0)", 4)):
    assert bl.ev(bl.parse(e), dict(zip(B, cl.bits_of(d, 4)))) != bit(d + 3, 2)
mod3r1 = digits_with(lambda d: bit(d % 3, 1))
assert mod3r1 == [2, 5, 8] and msops(mod3r1, BCD_DC, 4, V4) == {frozenset(["AD'", "B'CD'", "BC'D"])}
ok = bl.which(bl.option_values(p(5)), lambda t: agrees(t.strip("$"), mod3r1, BCD_DC, V4)
              and ml.min_literals_sop(mod3r1, BCD_DC, 4) == len(re.findall(r"[A-D]", t)))
bl.assert_mcq(p(5), ok[0])
assert ok == ["D"] and 3 % 3 == 0 and 9 % 3 == 0
bl.assert_nat(p(6), ml.min_literals_sop(bcd[2], XS3_DC, 4))
xor_b2g = [(f"g{i}", "XOR", [f"b{i}", f"b{i + 1}"]) for i in range(5)]
xor_g2b = [("c4", "XOR", ["h4", "h5"])] + [(f"c{i}", "XOR", [f"h{i}", f"c{i + 1}"]) for i in range(3, -1, -1)]
B6, H6 = [f"b{i}" for i in range(5, -1, -1)], [f"h{i}" for i in range(5, -1, -1)]
for m in range(64):
    v = cl.evaluate(xor_b2g, dict(zip(B6, cl.bits_of(m, 6))))
    assert cl.num([v["b5"]] + [v[f"g{i}"] for i in range(4, -1, -1)]) == m ^ (m >> 1)
    w = cl.evaluate(xor_g2b, dict(zip(H6, cl.bits_of(m ^ (m >> 1), 6))))
    assert cl.num([w["h5"]] + [w[f"c{i}"] for i in range(4, -1, -1)]) == m
bl.assert_nat(p(7), len(xor_b2g) + len(xor_g2b))
bl.assert_nat(p(8), 2 ** 8 - 10 * 10)
assert 6 + 6 != 156 and 6 * 6 != 156
truth9 = {"A gate network": len(stable) == 2, "When a question says": True,
          "With AND and OR gates": False, "When only AND, OR": False}
# C is false: at least two of four needs 7 gates two-level but 6 factored.
assert cl.ones_of(cl.truth(net_at2, V4, "f")) == at2 and len(net_at2) == 6
bl.assert_msq(p(9), sorted(l for l, t in bl.option_values(p(9)).items() if next(v for k, v in truth9.items() if t.startswith(k))))
nines = digits_with(lambda d: bit(9 - d, 2))
assert nines == [2, 3, 4, 5]
ok = bl.which(bl.option_values(p(10)), lambda t: agrees(t.strip("$").replace("_", ""), nines, BCD_DC, B))
bl.assert_mcq(p(10), ok[0])
assert ok == ["C"]
for k in (2, 4, 5, 10):
    assert p(k)["type"] == "MCQ"
assert sorted(p(k)["answer"] for k in (2, 4, 5, 10)) == ["A", "B", "C", "D"]

# ── Key sentences of the lesson ──────────────────────────────────────────────
has("$$f = A + BD + BC = A + B(C + D).$$", "**3 is the minimum**", "1100 (twelve): the true Gray code is 1010",
    "$E_2 = B_2 \\oplus (B_1 + B_0)$", "minimal POS forms, each with 7 literals",
    "**two 2-input ANDs, one 2-input OR and two NOTs**", "$a = A + C + BD + B'D'.$",
    "Six gates in all", "$256 - 100 = 156$", "$R_2 = AD + BC'D'$, $R_1 = B'C + CD + AD'$, $R_0 = AD' + A'B'D + BCD'$")

print("l4_01_design: detectors (exhaustive 2-gate case analysis and gate search), BCD mod 6/5/3, BCD ↔ excess-3, "
      "the b4 and b8 POS ties, Gray theorem for n ≤ 8, 5 PYQ answers and 10 practice answers OK")
