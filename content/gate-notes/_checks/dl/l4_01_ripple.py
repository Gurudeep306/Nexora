"""Checks for dl/04-arithmetic-circuits/01-adders-ripple-carry: the half/full adder and subtractor
tables and both carry forms are checked exhaustively; the NAND/NOR counts by an exhaustive gate
search and by simulating the quoted constructions; every delay of the lesson (theorem, models, worked
examples) from static arrival times of the netlists; the worst-case operands by the transport-delay
simulation over every operand; the pipeline by clocking the 2002 circuit; the five PYQ keys and every
practice answer, MSQ option and MCQ distractor are recomputed."""
import pathlib
import random
import sys
from itertools import product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import arithlib as al  # noqa: E402
import boollib as bl  # noqa: E402
import comblib as cl  # noqa: E402

L = al.lesson_text("01-adders-ripple-carry.md")
has = lambda *s: bl.must_contain(L, *s)  # noqa: E731
bank = bl.bank()

# ── Half and full adders, both carry forms, the OR/XOR theorem ─────────────
for a, b in product((0, 1), repeat=2):
    v = cl.evaluate(al.half_adder("A", "B", "S", "C"), {"A": a, "B": b})
    assert 2 * v["C"] + v["S"] == a + b
FA = al.full_adder("A", "B", "Ci", "S", "Co", "")
S_m, C_m = [], []
for m, (a, b, c) in enumerate(product((0, 1), repeat=3)):
    v = cl.evaluate(FA, {"A": a, "B": b, "Ci": c})
    assert 2 * v["Co"] + v["S"] == a + b + c
    assert not (v["g"] and v["t"])                      # or-not-xor
    assert (a & b) | (b & c) | (a & c) == (a & b) | (c & (a ^ b)) == (a & b) | (c & (a | b)) == v["Co"]
    S_m += [m] * v["S"]
    C_m += [m] * v["Co"]
assert S_m == [1, 2, 4, 7] and C_m == [3, 5, 6, 7]
has("$S = \\Sigma m(1, 2, 4, 7)$ and $C_{out} = \\Sigma m(3, 5, 6, 7)$")
# XOR in place of the OR still works; AND does not.
for gate, ok in (("XOR", True), ("AND", False)):
    net = FA[:-1] + [("Co", gate, ["g", "t"])]
    good = all(cl.evaluate(net, dict(zip(("A", "B", "Ci"), r)))["Co"] == (sum(r) >= 2) for r in product((0, 1), repeat=3))
    assert good == ok

# ── Gate counts ──────────────────────────────────────────────────────────
X2, A2 = (0, 1, 1, 0), (0, 0, 0, 1)
assert al.min_gates_multi(2, [X2, A2], "NAND") == 5 and al.min_gates_multi(2, [X2, A2], "NOR") == 5
assert al.min_gates_multi(2, [X2], "NAND") == 4 and al.min_gates_multi(2, [X2], "NOR") == 5
assert al.min_gates_multi(2, [(1, 0, 0, 1)], "NOR") == 4                     # four NORs make XNOR
# The quoted 5-NAND half adder and 9-NAND full adder.
HA5 = [("n1", "NAND", ["A", "B"]), ("n2", "NAND", ["A", "n1"]), ("n3", "NAND", ["B", "n1"]), ("S", "NAND", ["n2", "n3"]), ("C", "NAND", ["n1", "n1"])]
FA9 = [("n1", "NAND", ["A", "B"]), ("n2", "NAND", ["A", "n1"]), ("n3", "NAND", ["B", "n1"]), ("p", "NAND", ["n2", "n3"]),
       ("m1", "NAND", ["p", "Ci"]), ("m2", "NAND", ["p", "m1"]), ("m3", "NAND", ["Ci", "m1"]), ("S", "NAND", ["m2", "m3"]),
       ("Co", "NAND", ["n1", "m1"])]
for a, b in product((0, 1), repeat=2):
    v = cl.evaluate(HA5, {"A": a, "B": b})
    assert (v["S"], v["C"]) == (a ^ b, a & b)
for a, b, c in product((0, 1), repeat=3):
    v = cl.evaluate(FA9, {"A": a, "B": b, "Ci": c})
    assert 2 * v["Co"] + v["S"] == a + b + c
assert len(HA5) == 5 and len(FA9) == 9 and sum(al.gate_count(al.full_adder("a", "b", "c", "s", "o", "")).values()) == 5
has("| Half adder | 2 (XOR + AND) | **5** | **5** |", "| Full adder | 5 (2 HA + OR) | 9 | 9 |")
# NOR practice: the 5-NOR half adder quoted in the solution.
HN = [("n1", "NOR", ["A", "A"]), ("n2", "NOR", ["B", "B"]), ("n3", "NOR", ["A", "B"]), ("C", "NOR", ["n1", "n2"]), ("S", "NOR", ["n3", "C"])]
for a, b in product((0, 1), repeat=2):
    v = cl.evaluate(HN, {"A": a, "B": b})
    assert (v["S"], v["C"]) == (a ^ b, a & b)

# ── Subtractors ──────────────────────────────────────────────────────────
for x, y, b in product((0, 1), repeat=3):
    v = cl.evaluate(al.full_subtractor("x", "y", "b", "D", "Bo", ""), {"x": x, "y": y, "b": b})
    assert v["D"] - 2 * v["Bo"] == x - y - b
    assert v["Bo"] == int((1 - x) + y + b >= 2) == (((1 - x) & y) | ((1 - x) & b) | (y & b))
# Worked: 5 − 7 with a 4-bit ripple-borrow subtractor; 7 − (−8).
def ripple_sub(x, y, n):
    br, D, trace = 0, 0, []
    for i in range(n):
        xi, yi = x >> i & 1, y >> i & 1
        d = xi ^ yi ^ br
        nb = int((1 - xi) + yi + br >= 2)
        trace.append((d, nb))
        D |= d << i
        br = nb
    return D, br, trace

D, br, tr = ripple_sub(5, 7, 4)
assert (D, br) == (0b1110, 1) and [t[1] for t in tr] == [0, 1, 1, 1] and al.tc(D, 4) == -2
D, br, _ = ripple_sub(7, 8, 4)
assert (D, br) == (0b1111, 1) and not -8 <= 7 - (-8) <= 7
has("$D = 1110$ with final borrow 1", "$D = 1111$ and $B_{out} = 1$")

# ── Ripple adders: counts and delays ─────────────────────────────────────
# 1 HA + (n − 1) FA adds without a carry in (16 bits, random), n FA with a carry in.
net16 = al.half_adder("a0", "b0", "s0", "c1")
for i in range(1, 16):
    net16 += al.full_adder(f"a{i}", f"b{i}", f"c{i}", f"s{i}", f"c{i + 1}", str(i))
rnd = random.Random(41)
for _ in range(3000):
    a, b = rnd.randrange(2 ** 16), rnd.randrange(2 ** 16)
    v = cl.evaluate(net16, {**{f"a{i}": a >> i & 1 for i in range(16)}, **{f"b{i}": b >> i & 1 for i in range(16)}})
    assert al.word(v, "s", 16) + (v["c16"] << 16) == a + b
for n in range(1, 17):
    t = al.arrival(al.rca(n), al.inputs_of(n))
    assert t[f"c{n}"] == 2 * n + 1 and max(t[f"s{i}"] for i in range(n)) == 2 * n and t["s0"] == 2
    assert all(t[f"c{i}"] == 2 * i + 1 for i in range(1, n + 1)) and all(t[f"s{i}"] == 2 * i + 2 for i in range(1, n))
    ts = al.arrival(al.rca(n, sop=True), al.inputs_of(n))
    assert ts[f"c{n}"] == 2 * n and max(ts[f"s{i}"] for i in range(n)) == 2 * n
# The bound is reached: old (0, 0, c0 = 1) → new A = 2^n − 1, B = 0, c0 = 1.
for n in (4, 8, 16):
    st, _ = al.simulate(al.rca(n), al.inputs_of(n), al.env_of(n, 0, 0, 1), al.env_of(n, 2 ** n - 1, 0, 1))
    assert st[f"c{n}"] == 2 * n + 1
has("by $2n$ and the carry out by $2n + 1$", "9 gate delays ($2n + 1$)", "32 gate delays ($2n$)")
# Model (d) and the worked delays.
def model_d(n, x, a_, o):
    d = {"XOR": x, "AND": a_, "OR": o}
    t = al.arrival(al.rca(n), al.inputs_of(n), d)
    tab, tcc, tcs = x + a_ + o, a_ + o, x
    assert t[f"c{n}"] == tab + (n - 1) * tcc and max(t[f"s{i}"] for i in range(n)) == max(x + x, tab + (n - 2) * tcc + tcs)
    return t[f"c{n}"], max(t[f"s{i}"] for i in range(n))

for n in range(2, 9):
    for d in ((1, 1, 1), (2, 1, 1), (3, 1, 1), (3, 2, 2), (1, 2, 3)):
        model_d(n, *d)
assert model_d(4, 3, 1, 1) == (11, 12)
has("$s_3 = 9 + 3 = 12 > c_4 = 11$", "= 5 + 2 \\cdot 2 + 3 = 12$")
# GATE 2015 (units of 1.2 µs): full adder 4 units, gate level 10 units.
c4, s3 = model_d(4, 2, 1, 1)
fa_t = al.arrival(al.full_adder("a", "b", "c", "s", "o", ""), ["a", "b", "c"], {"XOR": 2})
t_fa = max(fa_t["s"], fa_t["o"])
assert t_fa == 4 and round(4 * t_fa * 1.2, 2) == 19.2 and round(max(c4, s3) * 1.2, 2) == 12.0 == round((4 + 3 * 2) * 1.2, 2)
q = bank["cse-2015-2-cs-48"]
assert float(q["answer"]) == 19.2
has("$4 \\times 4.8 = 19.2$ µs", "$c_4 = 4.8 + 3 \\times 2.4 = 12$ µs")

# ── Worst-case operands (transport-delay simulation over every B) ────────
net8 = al.rca(8)
I8 = al.inputs_of(8)


def settle8(a, b):
    st, _ = al.simulate(net8, I8, al.env_of(8, 0, 0), al.env_of(8, a % 256, b % 256))
    return max(st[x] for x in [f"s{i}" for i in range(8)] + ["c8"])


T1 = {b: settle8(1, b) for b in range(256)}
worst = max(T1.values())
assert [b for b, t in T1.items() if t == worst] == [255] and worst == 16
assert al.simulate(net8, I8, al.env_of(8, 0, 0), al.env_of(8, 1, 255))[0]["c8"] == 16
q = bank["cse-2016-2-cs-7"]
assert int(q["answer"]) == al.tc(255, 8) == -1
has("carry out at 16 units")
# Average longest carry chain ≈ log2 n (the aside): 32-bit random operands.
def chain(a, b, n):
    best = run = 0
    carry = False
    for i in range(n):
        x, y = a >> i & 1, b >> i & 1
        if x & y:
            run, carry = 1, True
        elif x ^ y and carry:
            run += 1
        else:
            run, carry = 0, False
        best = max(best, run)
    return best

mean = sum(chain(rnd.getrandbits(32), rnd.getrandbits(32), 32) for _ in range(20000)) / 20000
assert 4.0 <= mean <= 6.0, mean
# Worked: 8 bits all the way (two examples).
for a, b in ((1, 255), (3, 253)):
    assert chain(a, b, 8) == 8 and (a + b) % 256 == 0
# Pipelined adder worked example: 16 bits in 4 stages of 4 bits.
t4 = al.arrival(al.rca(4), al.inputs_of(4))
assert t4["c4"] == 9 and al.rca_delay_unit(16) == 33 and 4 * (9 + 1) == 40 and round(33 / 10, 1) == 3.3

# ── GATE 2002 pipeline ───────────────────────────────────────────────────
A_seq, B_seq = [6, 3, 7, 5, 0, 0, 0, 0], [5, 5, 3, 6, 0, 0, 0, 0]
Z = al.pipeline_2002(A_seq, B_seq)
assert all(int(Z[k], 2) == (A_seq[k - 2] + B_seq[k - 2] if k >= 2 else 0) for k in range(8))
key = bank["cse-2002-b-56-a"]["answer"]
assert key == "After clocks 1..8: " + ", ".join(Z), key
assert "pipelined" in bank["cse-2002-b-56-b"]["answer"]
# GATE 1999: 1 HA + 15 FA.
assert bl.key_letters(bank["cse-1999-a-41"]["answer"]) == ["B"]

# ── Practice ─────────────────────────────────────────────────────────────
P = al.practice()
bl.assert_mcq(P["nx-dl-04-01-q01"], "B")
q = P["nx-dl-04-01-q02"]
v = cl.evaluate(FA, {"A": 1, "B": 0, "Ci": 1})
lines = {"A": v["p"], "B": v["g"], "C": v["t"], "D": v["Co"]}
bl.assert_msq(q, [k for k, x in lines.items() if x])
bl.assert_nat(P["nx-dl-04-01-q03"], al.min_gates_multi(2, [X2, A2], "NOR"))
q = P["nx-dl-04-01-q04"]
cand = {"A": "x y + x b + y b", "B": "x \\oplus y \\oplus b", "C": "x' y + x' b + y b", "D": "x y' + x b + y' b"}
want = tuple(int((1 - x) + y + b >= 2) for x, y, b in product((0, 1), repeat=3))
ok = [k for k, e in cand.items() if bl.tt(e, list("xyb")) == want]
bl.assert_mcq(q, ok[0])
assert ok == ["C"]
bl.assert_nat(P["nx-dl-04-01-q05"], al.arrival(al.rca(12), al.inputs_of(12))["c12"])
fa_d = al.arrival(al.full_adder("a", "b", "c", "s", "o", ""), ["a", "b", "c"], {"XOR": 3, "AND": 2, "OR": 2})
assert max(fa_d["s"], fa_d["o"]) == 7 and al.arrival(al.rca(8), al.inputs_of(8), {"XOR": 3, "AND": 2, "OR": 2})["c8"] == 35
bl.assert_nat(P["nx-dl-04-01-q06"], 8 * max(fa_d["s"], fa_d["o"]))
q = P["nx-dl-04-01-q07"]
vals = {l: int(t.strip("$").replace("−", "-")) for l, t in bl.option_values(q).items()}
T4 = {l: settle8(4, b) for l, b in vals.items()}
glob = max(settle8(4, b) for b in range(256))
best = [l for l, t in T4.items() if t == max(T4.values())]
assert best == ["C"] and T4["C"] == glob
bl.assert_mcq(q, best[0])
q = P["nx-dl-04-01-q08"]
pairs = {"A": (0b0001, 0b1111), "B": (0b0011, 0b1101), "C": (0b1111, 0b1111), "D": (0b0101, 0b1011)}
okp = [k for k, (a, b) in pairs.items() if (a & b & 1) and all(((a >> i) ^ (b >> i)) & 1 for i in (1, 2, 3))]
bl.assert_msq(q, okp)
bl.assert_nat(P["nx-dl-04-01-q09"], (8 + 100 - 1) * (9 + 1))
q = P["nx-dl-04-01-q10"]
# B: for any positive delays and n ≥ 2, n·t_FA > both gate-level totals (checked over a grid).
for x, a_, o in product(range(1, 5), repeat=3):
    tfa = max(2 * x, x + a_ + o)
    for n in range(2, 9):
        c, s_ = model_d(n, x, a_, o)
        assert n * tfa > max(c, s_)
bl.assert_msq(q, ["A", "B"])
assert len([k for k in P if k.startswith("nx-dl-04-01-")]) == 10

# ── Building ripple adders (worked examples) ──────────────────────────────
v = cl.evaluate(al.rca(4), al.env_of(4, 0b1101, 0b0101))
assert al.word(v, "s", 4) == 0b0010 and v["c4"] == 1 and v["c3"] == 1 and al.tc(0b1101, 4) + 5 == 2
v = cl.evaluate(al.rca(4), al.env_of(4, 0b1011, 0b0110))
assert [v[f"s{i}"] for i in range(4)] == [1, 0, 0, 0] and [v[f"c{i}"] for i in range(1, 5)] == [0, 1, 1, 1]
assert sum(al.gate_count(al.rca(32)).values()) == 160 and al.gate_count(al.rca(32)) == {"XOR": 64, "AND": 64, "OR": 32}
for a in range(256):  # incrementer: c_{i+1} = a0 … ai
    v = cl.evaluate(al.rca(8), al.env_of(8, a, 1))
    assert all(v[f"c{i + 1}"] == int(all(a >> j & 1 for j in range(i + 1))) for i in range(8))
v = cl.evaluate(al.rca(4), al.env_of(4, 0b0101, 0b1100, 1))
assert v["c4"] == 1 and al.word(v, "s", 4) == 0b0010
has("$c_4\\,S = 1\\,0001$", "$32 \\times 5 = 160$ gates")
print("l4_01_ripple: HA/FA/HS/FS tables, carry forms, NAND/NOR minima (exhaustive), delay models on netlists (n ≤ 16), "
      "worst case B = −1 unique (transport simulation over all B), pipeline 2002, 5 PYQ keys and 10 practice answers OK")
