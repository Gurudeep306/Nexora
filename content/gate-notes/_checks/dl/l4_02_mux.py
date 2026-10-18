"""Checks for dl/04-combinational-circuits/02-multiplexers: the MUX equation (8:1 against its definition,
every data/select row), the gate-level and NAND counts, select-line sizing, enables (the 8:1 from two enabled
4:1 MUXes and an OR), every reading example (netlists evaluated row by row, minimal forms by minlib), the
implementation tables and residues (including don't-cares and every choice of residue variable), the
Shannon realisation theorem over all 256 functions of 3 variables, the minimum-size lower bound (an
exhaustive search over every wiring of a 2:1 MUX and one inverter), MUX trees (counts and a 16:1 tree netlist),
the gates a 2:1 MUX makes (exhaustive over every wiring), the NAND cascade (erratum D 400), the applications,
all 19 PYQ keys from the bank (figure alt texts and the 2021 option SVGs) and the 10 practice answers."""
import itertools
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import comblib as cl  # noqa: E402
import minlib as ml  # noqa: E402

L = cl.lesson_text("02-multiplexers.md")
has = lambda *s: bl.must_contain(L, *s)
ABC, PQR, XYZ, ABCD = list("ABC"), list("PQR"), list("xyz"), list("ABCD")
B = bl.bank()
P = cl.practice()


def ones(net, vars_, out="f"):
    return cl.ones_of(cl.truth(net, vars_, out))


def min_sops(o, vars_, dcs=()):
    return sorted(ml.sop(c, vars_) for c in ml.min_covers(o, list(dcs), len(vars_)))


def m2(s, i0, i1, name):
    """A 2:1 MUX node (I0 chosen when s = 0)."""
    return (name, "MUX", {"d": [i0, i1], "s": [s]})


# ── The MUX equation, gate-level counts, select lines ───────────────────────
for d in itertools.product((0, 1), repeat=8):
    for s in itertools.product((0, 1), repeat=3):
        eq = sum(d[i] for i in range(8) if cl.num(s) == i)
        assert cl.mux(list(d), list(s)) == eq == d[4 * s[0] + 2 * s[1] + s[2]]
# 2:1 MUX full truth table (S, I1, I0) in row order, as printed in #mux-truth-table.
assert [cl.mux([i0, i1], [s]) for s, i1, i0 in itertools.product((0, 1), repeat=3)] == [0, 1, 0, 1, 0, 0, 1, 1]
assert cl.mux([1, 0], [0]) == 1  # the (S, I1, I0) = (0, 0, 1) row (erratum A 64)
# NAND–NAND 4:1 MUX: 2 inverters + 4 three-input NANDs + 1 four-input NAND = 7 = 2^2 + 2 + 1.
V = ["S1", "S0", "I0", "I1", "I2", "I3"]
nand_mux = [("n1", "NOT", ["S1"]), ("n0", "NOT", ["S0"]),
            ("a0", "NAND", ["n1", "n0", "I0"]), ("a1", "NAND", ["n1", "S0", "I1"]),
            ("a2", "NAND", ["S1", "n0", "I2"]), ("a3", "NAND", ["S1", "S0", "I3"]), ("Y", "NAND", ["a0", "a1", "a2", "a3"])]
ref = [("Y", "MUX", {"d": ["I0", "I1", "I2", "I3"], "s": ["S1", "S0"]})]
assert cl.truth(nand_mux, V, "Y") == cl.truth(ref, V, "Y") and len(nand_mux) == 2 ** 2 + 2 + 1
assert [cl.select_lines(n) for n in (2, 32, 33, 1, 6, 48, 16)] == [1, 5, 6, 0, 3, 6, 4]
has("$k = \\lceil \\log_2 32 \\rceil = 5$", "4 select lines is a 16:1 MUX", "$2^n + n + 1$ gates")

# Worked examples: the MUX, its selects and its enable.
net = [("f", "MUX", {"d": ["0", "1", "1", "0"], "s": ["A", "B"]})]
assert ones(net, ["A", "B"]) == bl.minterms("A \\oplus B", ["A", "B"]) and cl.mux([0, 1, 1, 0], [1, 0]) == 1
assert cl.num([1, 1, 0]) == 6 and cl.num([0, 1, 1]) == 3
# 8:1 from two enabled 4:1 MUXes and an OR: one-hot data proves Y = I_s for every select value.
V8 = ["S2", "S1", "S0"] + [f"I{i}" for i in range(8)]
net8 = [("ma", "MUX", {"d": ["I0", "I1", "I2", "I3"], "s": ["S1", "S0"], "en": "~S2"}),
        ("mb", "MUX", {"d": ["I4", "I5", "I6", "I7"], "s": ["S1", "S0"], "en": "S2"}),
        ("Y", "OR", ["ma", "mb"])]
for r in cl.rows(V8):
    assert cl.evaluate(net8, r)["Y"] == r[f"I{cl.num([r['S2'], r['S1'], r['S0']])}"]
r = dict(zip(V8, [1, 0, 1] + [0] * 8)); r["I5"] = 1
assert cl.evaluate(net8, r)["ma"] == 0 and cl.evaluate(net8, r)["Y"] == 1
has(':::viz{#mux-enable-expand-viz spec="mux-enable-expand" mode="animate" depth="standard"}')
# Trap 2002 sentence: only I0 = x (for y = 1) can give a 1.
has("so only $I_0$ and $I_2$ can be chosen, and $I_2 = y$ is chosen only when $y = 0$", "$f = xy\\overline{z}$. Also check the polarity")
# 6:1 MUX: 3 selects; unused inputs grounded give 0 on 110 and 111.
assert cl.select_lines(6) == 3 and cl.mux([1] * 6 + [0, 0], [1, 1, 1]) == 0

# ── Reading MUX circuits ────────────────────────────────────────────────────
net = [("f", "MUX", {"d": ["C", "~C", "~C", "C"], "s": ["A", "B"]})]
assert ones(net, ABC) == bl.minterms("A \\oplus B \\oplus C", ABC) == [1, 2, 4, 7]
net14 = [("f", "MUX", {"d": ["0", "1", "R", "~R"], "s": ["P", "Q"]})]
assert ones(net14, PQR) == [2, 3, 5, 6] and min_sops([2, 3, 5, 6], PQR) == ["P'Q + QR' + PQ'R"]
assert bl.equal("P'Q + PQ'R + PQR'", "P'Q + QR' + PQ'R", PQR) and len(re.findall(r"[PQR]", "P'Q + PQ'R + PQR'")) == 8
has("minimal (8 literals). In GATE 2014 two of the wrong options are also equal to $F$ but are not minimal")
# Data-input cascade.
net = [m2("z", "y", "~x", "g"), m2("y", "x", "g", "f")]
assert ones(net, XYZ) == [2, 3, 4, 5, 6] and min_sops([2, 3, 4, 5, 6], XYZ) == ["x'y + xy' + xz'", "x'y + yz' + xy'"]
assert bl.minterms("(x \\oplus y) + yz'", XYZ) == [2, 3, 4, 5, 6] and bl.equal("xy' + yz' + x'yz", "x'y + xy' + yz'", XYZ)
has("there MUX 1 feeds MUX 2's **input 0**, so you substitute $y = 0$ inside $g$")  # 2006: checked against the alt text below
# Select-driven cascade: X = P' + R', Q vanishes.
net = [m2("P", "Q", "R", "g"), m2("g", "1", "~P", "X")]
assert ones(net, PQR, "X") == bl.minterms("P' + R'", PQR) and cl.ones_of(tuple(1 - v for v in cl.truth(net, PQR, "X"))) == [5, 7]
# Enable sharing a variable with a select (active-low EN driven by y).
net = [("f", "MUX", {"d": ["z", "1", "~z", "1"], "s": ["x", "y"], "en": "y", "en_low": True})]
assert ones(net, XYZ) == [1, 4] == bl.minterms("y'(x \\oplus z)", XYZ)
noen = [("f", "MUX", {"d": ["z", "1", "~z", "1"], "s": ["x", "y"]})]
assert ones(noen, XYZ) == bl.minterms("y + (x \\oplus z)", XYZ) and len(ones(noen, XYZ)) == 6
# if–then–else.
assert bl.equal("xa + x'b", "x'b + xa", ["x", "a", "b"])
has("is exactly if–then–else", "case-split on the variable inside it")

# ── Implementing functions ──────────────────────────────────────────────────
GATES = {"AND": "AB", "OR": "A + B", "NAND": "(AB)'", "NOR": "(A + B)'", "XOR": "A \\oplus B", "XNOR": "(A \\oplus B)'"}
COL = {"AND": "0 0 0 1", "OR": "0 1 1 1", "NAND": "1 1 1 0", "NOR": "1 0 0 0", "XOR": "0 1 1 0", "XNOR": "1 0 0 1"}
for g, e in GATES.items():
    assert " ".join(map(str, bl.tt(e, ["A", "B"]))) == COL[g]
    has(f"| {g} | {COL[g]} |")
assert bl.tt("AB + A'B'", ["A", "B"]) == (1, 0, 0, 1)  # (1, 0, 0, 1) is XNOR (erratum B 120 / 166)
f21 = [0, 1, 3, 4, 5, 6]
assert cl.impl_table(f21, 3, [1, 2], XYZ) == (["1", "1", "x", "x′"], ["x"])
assert cl.impl_table(f21, 3, [0, 1], XYZ) == (["1", "z", "1", "z′"], ["z"])
assert cl.mux_realises(f21, 3, [1, 2], ["1", "1", "x", "x'"], XYZ) and cl.mux_realises(f21, 3, [0, 1], ["1", "z", "1", "z'"], XYZ)
assert 7 not in f21 and 2 not in f21
maj = bl.minterms("xy + yz + zx", XYZ)
assert cl.impl_table(maj, 3, [0, 1], XYZ) == (["0", "z", "z", "1"], ["z"])
g4 = [1, 3, 4, 11, 12, 13, 14, 15]
assert cl.impl_table(g4, 4, [0, 1, 2], ABCD) == (["D", "D", "D′", "0", "0", "D", "1", "1"], ["D"])
assert min_sops(g4, ABCD) == ["AB + A'B'D + B'CD + BC'D'", "AB + A'B'D + BC'D' + ACD"]
assert all(ml.cost(c) == (11, 4) for c in ml.min_covers(g4, [], 4))
# Don't-cares: Σ(1, 4, 6) + d(5, 7) with S1 = A, S0 = B.
assert cl.impl_table([1, 4, 6], 3, [0, 1], ABC, dcs=[5, 7]) == (["C", "0", "1", "1"], ["C"])
assert cl.impl_table([1, 4, 6], 3, [0, 1], ABC) == (["C", "0", "C′", "C′"], ["C"])
assert ml.agrees(bl.minterms("A'B'C + A", ABC), [1, 4, 6], [5, 7], 3)
# Select order: Σ(2, 3, 5, 6).
assert cl.impl_table([2, 3, 5, 6], 3, [0, 1], ABC)[0] == ["0", "1", "C", "C′"]
assert cl.impl_table([2, 3, 5, 6], 3, [1, 0], ABC)[0] == ["0", "C", "1", "C′"]
# Residue choice: A'B + AC.
fm = bl.minterms("A'B + AC", ABC)
assert cl.impl_table(fm, 3, [0, 1], ABC)[0] == ["0", "1", "C", "C"] and cl.impl_table(fm, 3, [1, 2], ABC)[0] == ["0", "A", "A′", "1"]
# Fewer selects: majority on a 2:1 MUX with select z.
assert cl.impl_table(maj, 3, [2], XYZ) == (["xy", "x + y"], ["x", "y"])
# #ex-impl-fewer: Σ(1, 2, 6, 7) on a 2:1 MUX, select A: I0 = B ⊕ C, I1 = B; with select C: B and XNOR.
f1267 = [1, 2, 6, 7]
assert cl.impl_table(f1267, 3, [0], ABC) == (["B′C + BC′", "B"], ["B", "C"])
assert bl.equal("B'C + BC'", "B \\oplus C", ["B", "C"])
nf = [("x", "XOR", ["B", "C"]), m2("A", "x", "B", "f")]
assert ones(nf, ABC) == f1267 and 5 not in f1267 and 3 not in f1267
assert cl.impl_table(f1267, 3, [2], ABC) == (["B", "A′B′ + AB"], ["A", "B"])
has("$I_0 = B \\oplus C$ (one XOR), $I_1 = B$ (a wire)")
# Shannon realisation: for every 3-variable function and every pair of select variables, the residues are 0, 1, x, x′.
for t in bl.all_functions(3):
    o = cl.ones_of(t)
    for sel in itertools.permutations(range(3), 2):
        names, rv = cl.impl_table(o, 3, list(sel), XYZ)
        assert set(names) <= {"0", "1", rv[0], rv[0] + "′"}
        assert cl.mux_realises(o, 3, list(sel), [n.replace("′", "'") for n in names], XYZ)
# Minimum size: a 2:1 MUX with one inverter cannot make 3-input parity (every wiring tried).
parity = bl.tt("x \\oplus y \\oplus z", XYZ)
sig = ["0", "1", "x", "y", "z"]
found = False
for inv_in in ["x", "y", "z", None]:          # None: the inverter sits on the MUX output
    pins = sig + (["~" + inv_in] if inv_in else [])
    for s, i0, i1 in itertools.product(pins, repeat=3):
        t = cl.truth([("m", "MUX", {"d": [i0, i1], "s": [s]})], XYZ, "m")
        if inv_in is None:
            t = tuple(1 - v for v in t)
        found |= t == parity
assert not found
# Parity's cofactors on n − 2 selects are 2-variable XOR/XNOR (never a literal or constant), n = 4.
par4 = bl.minterms("A \\oplus B \\oplus C \\oplus D", ABCD)
for sel in itertools.combinations(range(4), 2):
    names, _ = cl.impl_table(par4, 4, list(sel), ABCD)
    assert all(len(n) > 2 for n in names)
has("$(I_0, I_1, I_2, I_3) = (1, 1, x, x')$", "$(I_0, \\dots, I_7) = (D, D, D', 0, 0, D, 1, 1)$", "$(I_0, I_1, I_2, I_3) = (1, z, 1, z')$",
    "$(I_0, I_1, I_2, I_3) = (0, z, z, 1)$", "$(I_0, I_1, I_2, I_3) = (C, 0, 1, 1)$")

# ── Trees ───────────────────────────────────────────────────────────────────
T = {(8, 2): 7, (16, 4): 5, (64, 4): 21, (64, 2): 63, (32, 4): 11, (64, 8): 9, (10, 4): 4, (128, 4): 43}
for (n, k), tot in T.items():
    assert cl.mux_tree(n, k)[1] == tot
assert cl.mux_tree(10, 4) == ([3, 1], 4, 2) and cl.mux_tree(32, 4) == ([8, 2, 1], 11, 3) and cl.mux_tree(64, 2)[0] == [32, 16, 8, 4, 2, 1]
for n, k in ((8, 2), (16, 4), (64, 4), (64, 2), (64, 8)):
    assert cl.mux_tree(n, k)[1] == (n - 1) // (k - 1)
assert 8 + 2 + 0.5 == 10.5 and (32 - 1) / 3 != 11
# 16:1 tree from 4:1: S1S0 on level 1, S3S2 on level 2; one-hot data shows Y = I_s.
VS = ["S3", "S2", "S1", "S0"]
tree = [(f"g{j}", "MUX", {"d": [f"I{4 * j + i}" for i in range(4)], "s": ["S1", "S0"]}) for j in range(4)]
tree.append(("Y", "MUX", {"d": ["g0", "g1", "g2", "g3"], "s": ["S3", "S2"]}))
for s in range(16):
    for j in range(16):
        env = dict(zip(VS, cl.bits_of(s, 4)))
        env.update({f"I{i}": int(i == j) for i in range(16)})
        assert cl.evaluate(tree, env)["Y"] == int(s == j)
assert cl.num([1, 0, 0, 1]) == 9 and 4 * 2 + 1 == 9
has("| Trees | $\\lceil N/k \\rceil$", "the answer is 11", "21 four-to-one MUXes or 63 two-to-one MUXes")

# ── The MUX as gates ────────────────────────────────────────────────────────
AB = ["A", "B"]
wired = {
    "A'": [m2("A", "1", "0", "f")], "AB": [m2("B", "0", "A", "f")], "A + B": [m2("B", "A", "1", "f")],
    "A + B'": [m2("B", "1", "A", "f")], "AB'": [m2("B", "A", "0", "f")],
    "(AB)'": [m2("B", "0", "A", "g"), m2("g", "1", "0", "f")],
    "(A + B)'": [m2("A", "1", "0", "g"), m2("B", "g", "0", "f")],
    "A \\oplus B": [m2("A", "B", "~B", "f")],
}
for e, net in wired.items():
    assert cl.truth(net, AB, "f") == bl.tt(e, AB), e
# Every wiring of one 2:1 MUX with A, B, 0, 1 (no complements): exactly 12 functions.
single = {cl.truth([m2(s, a, b, "f")], AB, "f") for s, a, b in itertools.product(["A", "B", "0", "1"], repeat=3)}
want = {bl.tt(e, AB) for e in ["0", "1", "A", "B", "A'", "B'", "AB", "A + B", "AB'", "A'B", "A + B'", "A' + B"]}
assert single == want and len(single) == 12
for e in ["(AB)'", "(A + B)'", "A \\oplus B", "(A \\oplus B)'"]:
    assert bl.tt(e, AB) not in single
# Half subtractor from two MUXes without complements: borrow MUX(A; B, 0) = A'B, difference MUX(B; A, A'B).
hs = [m2("A", "B", "0", "bo"), m2("B", "A", "bo", "d")]
assert cl.truth(hs, AB, "bo") == bl.tt("A'B", AB) and cl.truth(hs, AB, "d") == bl.tt("A \\oplus B", AB)
has("borrow $= \\text{MUX}(A;\\ B, 0) = A'B$, and difference $= \\text{MUX}(B;\\ A, A'B)$")
# Half adder: carry MUX(A; 0, B), sum MUX(A; B, B').
assert cl.truth([m2("A", "0", "B", "c")], AB, "c") == bl.tt("AB", AB) and cl.truth([m2("A", "B", "~B", "s")], AB, "s") == bl.tt("A \\oplus B", AB)
# Without constants a MUX preserves 0 (and 1).
assert all(cl.mux([a, b], [s]) == 0 for a, b, s in [(0, 0, 0)]) and cl.mux([1, 1], [1]) == 1
# Erratum D 400: the constant cascade is NAND; no pair of constants on MUX 2 gives OR.
for c0, c1 in itertools.product("01", repeat=2):
    t = cl.truth([m2("B", "0", "A", "g"), m2("g", c0, c1, "f")], AB, "f")
    assert t != bl.tt("A + B", AB)
    if (c0, c1) == ("1", "0"):
        assert t == bl.tt("(AB)'", AB)
    if (c0, c1) == ("0", "1"):
        assert t == bl.tt("AB", AB)
# OR without extra hardware (2004 pattern) and the rejected alternatives.
assert cl.truth([m2("A", "B", "1", "f")], AB, "f") == bl.tt("A + B", AB) and cl.truth([m2("A", "A", "B", "f")], AB, "f") == bl.tt("AB", AB)
has("$Y = \\overline{AB}$, NAND", "a constant cascade is NAND, not OR")

# ── Applications ────────────────────────────────────────────────────────────
assert cl.num([1, 0, 1]) == 5 and 2 ** 3 == 8
assert cl.select_lines(32) == 5 and 16 * cl.mux_tree(32, 4)[1] == 176
assert cl.impl_table(bl.minterms("A \\oplus B \\oplus C", ABC), 3, [1, 2], ABC)[0] == ["A", "A′", "A′", "A"]
assert cl.impl_table(bl.minterms("AB + BC + CA", ABC), 3, [1, 2], ABC)[0] == ["0", "A", "A", "1"]
VS4 = ["C1", "C0", "A", "B"]
sel_net = [("o", "OR", ["A", "B"]), ("no", "NOT", ["o"]), ("an", "AND", ["A", "B"]), ("xo", "XOR", ["A", "B"]),
           ("F", "MUX", {"d": ["an", "xo", "o", "no"], "s": ["C1", "C0"]})]
spec = {0: "AB", 1: "A \\oplus B", 2: "A + B", 3: "(A + B)'"}
for r in cl.rows(VS4):
    assert cl.evaluate(sel_net, r)["F"] == bl.ev(bl.parse(spec[2 * r["C1"] + r["C0"]]), r)
# #ex-app-edge: 00 → A (a wire), 01 → A′, 10 → AB, 11 → A ⊕ B with one inverter, one AND, one XOR.
edge_net = [("na", "NOT", ["A"]), ("an", "AND", ["A", "B"]), ("xo", "XOR", ["A", "B"]),
            ("F", "MUX", {"d": ["A", "na", "an", "xo"], "s": ["C1", "C0"]})]
spec_e = {0: "A", 1: "A'", 2: "AB", 3: "A \\oplus B"}
for r in cl.rows(VS4):
    assert cl.evaluate(edge_net, r)["F"] == bl.ev(bl.parse(spec_e[2 * r["C1"] + r["C0"]]), r)
assert len(edge_net) - 1 == 3
assert cl.evaluate(edge_net, {"C1": 0, "C0": 0, "A": 1, "B": 0})["F"] == 1 and cl.evaluate(edge_net, {"C1": 1, "C0": 1, "A": 1, "B": 1})["F"] == 0
has("One 4:1 MUX plus three gates (one inverter, one AND, one XOR) for four operations")

# ── PYQs (keys from the bank as it stands) ─────────────────────────────────
def key(qid):
    return B[qid]["answer"]


def which_eq(qid, ones_, vars_, conv=lambda t: t):
    return [l for l, t in bl.option_values(B[qid]).items() if bl.minterms(conv(t.strip("$")), vars_) == ones_]


# 1996-a-47 and 2010-cs-9: C, C′, C′, C / R, R′, R′, R.
alt = B["cse-1996-a-47"]["figures"][0]["alt"]
assert "I0 = C, I1 = C̄, I2 = C̄, I3 = C" in alt and "S1 = A, S0 = B" in alt
o = ones([("f", "MUX", {"d": ["C", "~C", "~C", "C"], "s": ["A", "B"]})], ABC)
assert which_eq("cse-1996-a-47", o, ABC) == ["C"] == [key("cse-1996-a-47")]
alt = B["cse-2010-cs-9"]["figures"][0]["alt"]
assert "R, R', R', R" in alt and "S1 driven by P, S0 driven by Q" in alt
o = ones([("f", "MUX", {"d": ["R", "~R", "~R", "R"], "s": ["P", "Q"]})], PQR)
assert which_eq("cse-2010-cs-9", o, PQR) == ["B"] == [key("cse-2010-cs-9")]
# 1996-a-53 (DESC): the selector with one inverter on the OR output realises the table.
V96 = ["C1", "C0", "A", "B"]
n96 = [("o", "OR", ["A", "B"]), ("no", "NOT", ["o"]), ("x", "XOR", ["A", "B"]), ("a", "AND", ["A", "B"]),
       ("F", "MUX", {"d": ["no", "o", "x", "a"], "s": ["C1", "C0"]})]
t96 = {0: "(A + B)'", 1: "A + B", 2: "A \\oplus B", 3: "AB"}
for r in cl.rows(V96):
    assert cl.evaluate(n96, r)["F"] == bl.ev(bl.parse(t96[2 * r["C1"] + r["C0"]]), r)
assert "I0 = NOT(A+B), I1 = A+B, I2 = A⊕B, I3 = AB" in key("cse-1996-a-53") and "S1=C1, S0=C0" in key("cse-1996-a-53")
# 1998: 4 select bits → 16:1.
assert [l for l, t in bl.option_values(B["cse-1998-a-14"]).items() if t.replace(" ", "") == f"{2 ** 4}:1multiplexor"] == ["C"] == [key("cse-1998-a-14")]
# 2001: output ac' + bc, i.e. a when c = 0.
alt = B["cse-2001-a-36"]["figures"][0]["alt"]
assert "input a = 1, input b = 0, select c = x1, output g" in alt and "input a = g, input b = x1, select c = x2" in alt
X12 = ["x1", "x2"]
n01 = [m2("x1", "1", "0", "g"), m2("x2", "g", "x1", "f")]
assert which_eq("cse-2001-a-36", ones(n01, X12), X12, lambda t: t.split("=")[1]) == ["C"] == [key("cse-2001-a-36")]
# 2002: x → I0, I1; y → I2; y′ → I3 and A1; z → A0; z′ → EN (active high).
alt = B["cse-2002-a-27"]["figures"][0]["alt"]
assert "x is wired to I0 and I1" in alt and "y is wired to I2 and through a NOT gate to I3" in alt and "(y') also drives A1" in alt
assert "z drives A0 and through a NOT gate drives EN" in alt
n02 = [("f", "MUX", {"d": ["x", "x", "y", "~y"], "s": ["~y", "z"], "en": "~z"})]
o02 = ones(n02, XYZ)
assert o02 == bl.minterms("xyz'", XYZ)
assert [l for l, t in bl.option_values(B["cse-2002-a-27"]).items() if t.startswith("$") and bl.minterms(t.strip("$"), XYZ) == o02] == ["A"] == [key("cse-2002-a-27")]
n02l = [("f", "MUX", {"d": ["x", "x", "y", "~y"], "s": ["~y", "z"], "en": "~z", "en_low": True})]
assert ones(n02l, XYZ) == bl.minterms("xz + y'z", XYZ)  # an active-low reading gives (x + y′)z, not offered
assert ones([("f", "MUX", {"d": ["x", "x", "y", "~y"], "s": ["~y", "z"]})], XYZ) == bl.minterms("xy + y'z", XYZ)  # enable ignored
# 2004: Z = 0 selects X.
TR = ["T", "R"]
ok = []
for l, t in bl.option_values(B["cse-2004-cs-60"]).items():
    conn = dict((p.split(" to ")[1].strip(), p.split(" to ")[0].strip()) for p in t.split(","))
    if cl.truth([m2(conn["Z"], conn["X"], conn["Y"], "f")], TR, "f") == bl.tt("T + R", TR):
        ok.append(l)
assert ok == ["A"] == [key("cse-2004-cs-60")]
# IT 2005: control 1 selects the upper input; MUX 1 upper A, lower B, select z; MUX 2 upper x, lower y, select = MUX 1.
alt = B["it-2005-cs-48"]["figures"][0]["alt"]
assert "MUX 1 has inputs A (upper, select=1) and B (lower, select=0) and select line z" in alt and "MUX 2 has upper input x and lower input y" in alt
ok = []
for l, t in bl.option_values(B["it-2005-cs-48"]).items():
    x, y, z = [v.strip() for v in t.split(",")]
    net = [m2(z, "B", "A", "s"), m2("s", y, x, "f")]
    if cl.truth(net, AB, "f") == bl.tt("(A + B)'", AB):
        ok.append(l)
assert ok == ["D"] == [key("it-2005-cs-48")]
assert cl.truth([m2("A", "B", "A", "s")], AB, "s") == bl.tt("A + B", AB)
# 2006.
alt = B["cse-2006-cs-35"]["figures"][0]["alt"]
assert "MUX1: input 0 = x, input 1 = y-bar, select = z" in alt and "MUX2: input 0 = output of MUX1, input 1 = x, select = y" in alt
n06 = [m2("z", "x", "~y", "g"), m2("y", "g", "x", "f")]
o06 = ones(n06, XYZ)
assert which_eq("cse-2006-cs-35", o06, XYZ) == ["A"] == [key("cse-2006-cs-35")]
assert min_sops(o06, XYZ) == ["x + y'z"]  # option A is correct but not minimal
# IT 2006: P on input 1, Q on input 0, select z.
G2 = {"XOR": "XOR", "AND": "AND", "OR": "OR"}
ok = []
for l, t in bl.option_values(B["it-2006-cs-36"]).items():
    p, q = [v.strip() for v in t.split(",")]
    net = [("P", G2[p], ["x", "y"]), ("Q", G2[q], ["x", "y"]), m2("z", "Q", "P", "f")]
    if ones(net, XYZ) == maj:
        ok.append(l)
assert ok == ["D"] == [key("it-2006-cs-36")]
# 2007: 2^(n−1):1 (proved above for n = 3 by exhaustive search).
assert bl.option_values(B["cse-2007-cs-34"])["C"].startswith("$2^{n-1}$") and key("cse-2007-cs-34") == "C"
# IT 2007: mux 1 (input 1 = a, input 0 = b, select X1) → input 1 of mux 2 (input 0 = X2, select X3).
alt = B["it-2007-cs-8"]["figures"][0]["alt"]
assert "Mux 1: input 1 = a, input 0 = b, select X1" in alt and "mux 2 input 0 = X2, select X3" in alt
ab = ["a", "b"]
ok = []
for l, t in bl.option_values(B["it-2007-cs-8"]).items():
    v = dict(p.strip().split(" = ") for p in t.split(","))
    net = [m2(v["X1"], "b", "a", "m"), m2(v["X3"], v["X2"], "m", "f")]
    if cl.truth(net, ab, "f") == bl.tt("ab", ab):
        ok.append(l)
assert ok == ["A"] == [key("it-2007-cs-8")]
# 2014-1: options A, B, C are all equal to F; only A is minimal.
q = B["cse-2014-1-cs-45"]
alt = q["figures"][0]["alt"]
assert "input 0 = constant 0, input 1 = constant 1, input 2 = R, input 3 = R̄" in alt and "S1 = P and S0 = Q" in alt
o14 = ones(net14, PQR)
eq14 = which_eq("cse-2014-1-cs-45", o14, PQR)
assert eq14 == ["A", "B", "C"]
lits = {l: len(re.findall(r"[PQR]", bl.option_values(q)[l])) for l in eq14}
assert lits["A"] == ml.min_literals_sop(o14, [], 3) == 7 and lits["B"] == lits["C"] == 11 and key("cse-2014-1-cs-45") == "A"
# 2014-3: if–else is a multiplexer.
assert bl.option_values(B["cse-2014-3-cs-8"])[key("cse-2014-3-cs-8")] == "Multiplexor"
# 2016.
alt = B["cse-2016-1-cs-30"]["figures"][0]["alt"]
assert "MUX 1: input 0 tied to 0, input 1 = R, select s = P" in alt and "MUX 2: input 0 = R-bar (complement of R), select s = Q" in alt
n16 = [m2("P", "0", "R", "g"), m2("Q", "~R", "g", "X")]
o16 = ones(n16, PQR, "X")
assert which_eq("cse-2016-1-cs-30", o16, PQR, lambda t: t.replace("\\bar{", "\\overline{")) == ["D"] == [key("cse-2016-1-cs-30")]
assert min_sops(o16, PQR) == ["Q'R' + PQR"]
# 2020: 32 registers.
assert cl.select_lines(32) == 5 == int(key("cse-2020-cs-19"))
# 2021: read the option SVGs (data labels top to bottom = I0..I3; s1 = y, s0 = z).
FIG = bl.ROOT / "public" / "gate-fig" / "cse-2021-2"
ok = []
for l in "ABCD":
    svg = (FIG / f"cs-5-{l}.svg").read_text()
    data = re.findall(r'text-anchor="end" font-style="italic">([^<]*)<', svg)
    ys = [int(y) for y in re.findall(r'<text x="34" y="(\d+)" text-anchor="end"', svg)]
    sel = re.findall(r'text-anchor="middle" font-style="italic">([^<]*)<', svg)
    assert ys == sorted(ys) and len(data) == 4 and sel == ["y", "z"]
    assert '<text x="94" y="117">s<tspan font-size="10" dy="3">1</tspan>' in svg and '<text x="100" y="172" text-anchor="middle" font-style="italic">y<' in svg
    if cl.mux_realises(f21, 3, [1, 2], [d.replace("′", "'") for d in data], XYZ):
        ok.append(l)
assert ok == ["A"] == [key("cse-2021-2-cs-5")]
# 2023: M1, M2 with S1 = A, S0 = C; M3 select B (M1 → input 0).
q = B["cse-2023-cs-34"]
alt = q["figures"][0]["alt"]
assert "select lines S1 = A, S0 = C" in alt and alt.count("S1 = A, S0 = C") == 2 and "whose select line S is B" in alt
f23 = bl.minterms("A' + A'C' + AB'C", ABC)
assert f23 == bl.minterms("A' + B'C", ABC)
ok = []
for l, t in bl.option_values(q).items():
    xs = [v.strip() for v in t.strip("()").split(",")]
    net = [("M1", "MUX", {"d": xs[:4], "s": ["A", "C"]}), ("M2", "MUX", {"d": xs[4:], "s": ["A", "C"]}), m2("B", "M1", "M2", "f")]
    if ones(net, ABC) == f23:
        ok.append(l)
assert ok == ["C"] == [key("cse-2023-cs-34")]
# X index = 4B + 2A + C (B picks M1/M2, then S1 = A, S0 = C); swapping A and C on the 4:1 selects gives another vector.
assert cl.impl_table(f23, 3, [1, 0, 2], ABC)[0] == ["1", "1", "0", "1", "1", "1", "0", "0"]
assert cl.impl_table(f23, 3, [1, 2, 0], ABC)[0] == ["1", "0", "1", "1", "1", "0", "1", "0"]
# 2024: X1 = X2 = 1, X3 = X4 = 0 → Y = C′: 4 rows.
alt = B["cse-2024-1-cs-54"]["figures"][0]["alt"]
assert "M1 (top left): input 0 is X1, input 1 is X2, select line S1 driven by A" in alt and "M3 (right, between them): input 0 is Q1 (from M1), input 1 is Q2 (from M2), select line S3 driven by C" in alt
n24 = [m2("A", "1", "1", "Q1"), m2("B", "0", "0", "Q2"), m2("C", "Q1", "Q2", "Y")]
o24 = ones(n24, ABC, "Y")
assert o24 == bl.minterms("C'", ABC) and len(o24) == 4 and str(key("cse-2024-1-cs-54")).split(" to ")[0] == "4"
# Marks in the radar.
marks = [B[i]["marks"] for i in re.findall(r':::pyq\{id="([^"]+)"', L)]
assert len(marks) == 19 and marks.count(1) == 6 and marks.count(2) == 12 and marks.count(5) == 1

# Claims made in the solutions' option analyses (_sol_ch4_l02.py).
for l in "BCD":
    assert 0 in bl.minterms(bl.option_values(B["cse-2006-cs-35"])[l].strip("$"), XYZ) and 0 not in o06
for (x, y, z), e in {("1", "0", "B"): "AB", ("1", "0", "A"): "A + B", ("0", "1", "B"): "(AB)'"}.items():
    assert cl.truth([m2(z, "B", "A", "s"), m2("s", y, x, "f")], AB, "f") == bl.tt(e, AB)
for x1, x2, x3, e in [("b", "1", "b", "a + b'"), ("a", "b", "1", "a + b"), ("a", "0", "b", "b")]:
    assert cl.truth([m2(x1, "b", "a", "m"), m2(x3, x2, "m", "f")], ab, "f") == bl.tt(e, ab)
assert [r for r in range(8) if bl.minterms("\\overline{P}\\,\\overline{Q} + PQR", PQR).count(r) and r not in o16] == [1]
for qid, rows_ in [("cse-2016-1-cs-30", {"B": 2, "C": 6})]:
    for l, r in rows_.items():
        assert r in bl.minterms(bl.option_values(B[qid])[l].strip("$").replace("\\bar{", "\\overline{"), PQR) and r not in o16

# ── Practice ────────────────────────────────────────────────────────────────
def mcq_by_fn(qid, o, vars_):
    q = P[qid]
    good = [l for l, t in bl.option_values(q).items() if bl.minterms(t.strip("$"), vars_) == o]
    assert len(good) == 1, (qid, good)
    bl.assert_mcq(q, good[0])
    for w in q["common_wrong"]:
        assert bl.minterms(bl.option_values(q)[w["answer"]].strip("$"), vars_) != o


o = ones([("f", "MUX", {"d": ["1", "C", "~C", "0"], "s": ["A", "B"]})], ABC)
assert o == [0, 1, 3, 4]
mcq_by_fn("nx-dl-04-02-q01", o, ABC)
assert ones([("f", "MUX", {"d": ["1", "~C", "C", "0"], "s": ["A", "B"]})], ABC) == bl.minterms("A'B' + A'C' + B'C", ABC)  # swapped residues
assert bl.minterms("A'C' + B'C", ABC) != o and 2 in bl.minterms("A'B' + BC'", ABC) and 2 not in o
W = list("wxy")
q = P["nx-dl-04-02-q02"]
names, rv = cl.impl_table([1, 2, 3, 6], 3, [0, 2], W)
assert names == ["x", "1", "x", "0"] and rv == ["x"]
fmt = lambda ns: "$(" + ", ".join("\\overline{x}" if n == "x′" else n for n in ns) + ")$"
bl.assert_mcq(q, [l for l, t in bl.option_values(q).items() if t == fmt(names)][0])
assert bl.option_values(q)["B"] == fmt(cl.impl_table([1, 2, 3, 6], 3, [2, 0], W)[0])
for l, t in bl.option_values(q).items():
    if l != q["answer"]:
        ds = [x.strip().replace("\\overline{x}", "x'") for x in t.strip("$()").split(",")]
        assert not cl.mux_realises([1, 2, 3, 6], 3, [0, 2], ds, W)
# q03: each wiring evaluated.
q = P["nx-dl-04-02-q03"]
f3 = [2, 3, 5, 6]
pos = {"A": 0, "B": 1, "C": 2}
good = []
for l, t in bl.option_values(q).items():
    s1, s0 = re.findall(r"S_[10] = ([ABC])", t)
    data = [d.strip().replace("\\overline{C}", "C'").replace("\\overline{A}", "A'") for d in re.search(r"= \(([^)]*)\)\$$", t).group(1).split(",")]
    if cl.mux_realises(f3, 3, [pos[s1], pos[s0]], data, ABC):
        good.append(l)
bl.assert_msq(q, good)
assert good == ["A", "B"] and cl.impl_table(f3, 3, [2, 1], ABC)[0] == ["0", "1", "A", "A′"] and cl.impl_table(f3, 3, [0, 2], ABC)[0] == ["B", "B", "B", "B′"]
# q04 (no inverter): 2^5 = 32:1. With 4 selects, parity needs x′ on half the data lines for every choice of
# selects, and a data line carrying 0, 1 or a variable never shows the pattern (1, 0) on two rows that differ only in x.
q = P["nx-dl-04-02-q04"]
bl.assert_mcq(q, [l for l, t in bl.option_values(q).items() if t == f"{2 ** 5} : 1"][0])
assert "no inverter" in q["text"]
V5 = list("ABCDE")
par5 = bl.minterms("A \\oplus B \\oplus C \\oplus D \\oplus E", V5)
for sel in itertools.combinations(range(5), 4):
    names, rv = cl.impl_table(par5, 5, list(sel), V5)
    assert names.count(rv[0] + "′") == 8 and names.count(rv[0]) == 8
# On two rows that differ only in x, a data line wired to 0, 1, x or another variable v reads (0, 0), (1, 1),
# (0, 1) or (v, v): never (1, 0), so x′ cannot be supplied without an inverter.
for x in V5:
    for m in range(32):
        if not m >> (4 - V5.index(x)) & 1:
            r0 = dict(zip(V5, cl.bits_of(m, 5)))
            r1 = {**r0, x: 1}
            pats = {(0, 0), (1, 1)} | {(r0[v], r1[v]) for v in V5}
            assert (1, 0) not in pats
assert all(len(n) > 2 for n in cl.impl_table(par5, 5, [0, 1, 2], V5)[0])
assert cl.mux_realises(par5, 5, [0, 1, 2, 3, 4], [str(int(m in par5)) for m in range(32)], V5)
bl.assert_nat(P["nx-dl-04-02-q05"], cl.mux_tree(128, 4)[1])
assert cl.mux_tree(128, 4)[0] == [32, 8, 2, 1] and cl.mux_tree(128, 2)[1] == 127
bl.assert_nat(P["nx-dl-04-02-q06"], cl.select_lines(48))
q = P["nx-dl-04-02-q07"]
o7 = ones([m2("P", "Q", "~R", "g"), m2("Q", "R", "g", "f")], PQR)
assert o7 == [1, 2, 3, 5, 6] and 4 in bl.minterms("P'Q + PR' + Q'R", PQR)
mcq_by_fn("nx-dl-04-02-q07", o7, PQR)
# q08: functions of one 2:1 MUX on A, B, 0, 1 (computed above as `single`).
q = P["nx-dl-04-02-q08"]
good = [l for l, t in bl.option_values(q).items() if bl.tt(t.strip("$"), AB) in single]
bl.assert_msq(q, good)
assert good == ["B", "D"]
o9 = ones([m2("A", "1", "0", "m1"), m2("C", "m1", "B", "m2"), m2("D", "m2", "A", "f")], ABCD)
assert o9 == bl.minterms("A'C'D' + BCD' + AD", ABCD)
bl.assert_nat(P["nx-dl-04-02-q09"], len(o9))
assert len(bl.minterms("A'C' + BC", ABCD)) + 4 == 12
q = P["nx-dl-04-02-q10"]
net = [("a", "AND", ["x", "y"]), ("f", "MUX", {"d": ["1", "z", "~z", "1"], "s": ["x", "y"], "en": "a", "en_low": True})]
o10 = ones(net, XYZ)
assert o10 == [0, 1, 3, 4]
mcq_by_fn("nx-dl-04-02-q10", o10, XYZ)
assert ones([("f", "MUX", {"d": ["1", "z", "~z", "1"], "s": ["x", "y"]})], XYZ) == bl.minterms("x'z + y'z' + xy", XYZ)
assert ones([("a", "AND", ["x", "y"]), ("f", "MUX", {"d": ["1", "z", "~z", "1"], "s": ["x", "y"], "en": "a"})], XYZ) == bl.minterms("xy", XYZ)
assert len([k for k in P if k.startswith("nx-dl-04-02-")]) == 10
keys = [P[k]["answer"] for k in P if k.startswith("nx-dl-04-02-") and P[k]["type"] == "MCQ"]
assert max(keys.count(c) for c in "ABCD") <= 2

print("l4_02_mux: MUX equation, NAND count, enables, 6 reading circuits, implementation tables (all 3-variable functions, every select pair), "
      "minimum MUX size (every 2:1 + inverter wiring), trees and a 16:1 netlist, MUX gates (every single-MUX wiring), 19 PYQ keys and 10 practice answers OK")
