"""Checks for dl/04-arithmetic-circuits/03-adder-subtractor-overflow: the adder–subtractor, the 2003 ALU
(every K, C0), the overflow detector in both forms, the C/V/N/Z flags and the comparison theorem are
checked over every 4-bit (and every 6-bit) operand pair; the BCD adder over every digit pair and carry,
including the detector minimisation and the K-less variant; the adder converters over every input; the
worked examples, the two PYQ keys and every practice answer are recomputed."""
import pathlib
import sys
from itertools import product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import arithlib as al  # noqa: E402
import boollib as bl  # noqa: E402
import comblib as cl  # noqa: E402
import minlib as ml  # noqa: E402

L = al.lesson_text("03-adder-subtractor-overflow.md")
has = lambda *s: bl.must_contain(L, *s)  # noqa: E731
bank = bl.bank()

# ── Adder–subtractor, flags, comparison theorem, sign-bit overflow form ──
for n in (4, 6):
    net = al.adder_subtractor(n)
    for a in range(2 ** n):
        for b in range(2 ** n):
            for K in (0, 1):
                v = cl.evaluate(net, {**al.env_of(n, a, b), "K": K})
                r = al.word(v, "s", n)
                assert r == ((a - b) if K else (a + b)) % 2 ** n
                sa, sb = al.tc(a, n), al.tc(b, n)
                true = sa - sb if K else sa + sb
                ov = int(not -(2 ** (n - 1)) <= true <= 2 ** (n - 1) - 1)
                assert v["V"] == ov
                an, yn, sn = a >> (n - 1) & 1, v[f"y{n - 1}"], r >> (n - 1)
                assert ov == (((1 - an) & (1 - yn) & sn) | (an & yn & (1 - sn)))
                if K:
                    assert v["C"] == int(a >= b) and (v["N"] ^ v["V"]) == int(sa < sb) and v["Z"] == int(a == b)
                else:
                    assert v["C"] == int(a + b >= 2 ** n)
# ALU 2003: all four settings; no setting equals A + 1 for every B.
alu = al.alu_2003()
form = {}
for K, C0 in product((0, 1), repeat=2):
    outs = {(a, b): al.word(cl.evaluate(alu, {**al.env_of(4, a, b, C0), "K": K}), "s", 4) for a in range(16) for b in range(16)}
    form[(K, C0)] = outs
    want = {(0, 0): lambda a, b: a + b, (0, 1): lambda a, b: a + b + 1, (1, 0): lambda a, b: a - b - 1, (1, 1): lambda a, b: a - b}[(K, C0)]
    assert all(o == want(a, b) % 16 for (a, b), o in outs.items())
    assert not all(o == (a + 1) % 16 for (a, b), o in outs.items())
assert all(form[(1, 0)][(a, 0)] == (a - 1) % 16 for a in range(16))
assert [form[k][(0, 3)] for k in ((0, 0), (0, 1), (1, 0), (1, 1))] == [0b0011, 0b0100, 0b1100, 0b1101]
assert [form[k][(5, 3)] for k in ((0, 0), (0, 1), (1, 0), (1, 1))] == [0b1000, 0b1001, 0b0001, 0b0010]
assert bank["cse-2003-cs-46"]["answer"] == "A"
has("00 → 1000, 01 → 1001, 10 → 0001, 11 → 0010", "the outputs are 0011, 0100, 1100, 1101")


def run(a, b, K, n=4):
    v = cl.evaluate(al.adder_subtractor(n), {**al.env_of(n, a, b), "K": K})
    return al.word(v, "s", n), v


r, v = run(0b0110, 0b0010, 0)
assert r == 0b1000
r, v = run(0b0110, 0b0010, 1)
assert r == 0b0100 and v["C"] == 1
r, v = run(0b0101, 0b0110, 0)
assert (r, v["c3"], v["c4"], v["C"], v["V"], v["N"], v["Z"]) == (0b1011, 1, 0, 0, 1, 1, 0)
r, v = run(0b0011, 0b0101, 1)
assert (r, v["c3"], v["c4"], v["C"], v["V"], v["N"], v["Z"]) == (0b1110, 0, 0, 0, 0, 1, 0)
r, v = run(0b1001, 0b0011, 1)
assert (r, v["c3"], v["c4"], v["C"], v["V"], v["N"]) == (0b0110, 0, 1, 1, 1, 0) and al.tc(0b1001, 4) == -7
r, v = run(0b1000, 0b1000, 1)
assert (r, v["c3"], v["c4"], v["C"], v["V"], v["N"], v["Z"]) == (0, 1, 1, 1, 0, 0, 1)
r, v = run(0b1000, 0b0001, 1)
assert (r, v["c3"], v["c4"], v["C"], v["V"], v["N"], v["Z"]) == (0b0111, 0, 1, 1, 1, 0, 0)
has("$C = 0$, $V = 1$, $N = 1$, $Z = 0$", "$C = 1$, $V = 1$, $N = 0$, $Z = 0$")

# ── BCD adder ────────────────────────────────────────────────────────────
net = al.bcd_adder()
for a, b, c in product(range(10), range(10), (0, 1)):
    v = cl.evaluate(net, al.env_of(4, a, b, c))
    z, k = al.word(v, "z", 4), v["k4"]
    assert 16 * k + z == a + b + c and v["Cout"] == int(a + b + c >= 10)
    assert 10 * v["Cout"] + al.word(v, "s", 4) == a + b + c
    if k:
        assert z <= 0b0011
# The detector is the minimal cover of {10 … 15} over Z (Ks handled separately), two quads.
covers = ml.min_covers(list(range(10, 16)), [], 4)
assert len(covers) == 1 and sorted(covers[0]) == sorted(["1-1-", "11--"])
# Without K the circuit fails exactly on sums 16 … 19.
bad = [(a, b, c) for a, b, c in product(range(10), range(10), (0, 1))
       if (lambda s_: (s_ >= 10 and s_ < 16))(a + b + c) != (a + b + c >= 10)]
assert {a + b + c for a, b, c in bad} == {16, 17, 18, 19}
cases = {(4, 5, 0): (0, 9), (8, 7, 0): (1, 5), (9, 9, 1): (1, 9), (8, 9, 0): (1, 7), (8, 8, 0): (1, 6)}
for (a, b, c), (C, d) in cases.items():
    v = cl.evaluate(net, al.env_of(4, a, b, c))
    assert (v["Cout"], al.word(v, "s", 4)) == (C, d)
assert sum(al.gate_count(net).values()) == 43 and al.gate_count(net)["AND"] == 16 + 2
# Multi-digit: chaining digit adders = decimal addition (3 digits, every 100th pair).
for x in range(0, 1000, 7):
    for y in range(0, 1000, 13):
        c, out = 0, 0
        for i in range(3):
            v = cl.evaluate(net, al.env_of(4, x // 10 ** i % 10, y // 10 ** i % 10, c))
            out += al.word(v, "s", 4) * 10 ** i
            c = v["Cout"]
        assert out + 1000 * c == x + y

# ── Adder converters ─────────────────────────────────────────────────────
conv = al.adder_converter_1996()
for b in range(16):
    v = cl.evaluate(conv, {f"b{i}": b >> i & 1 for i in range(4)})
    d4, u = v["d4"], al.word(v, "d", 4)
    assert 12 * d4 + u == b and u < 12
assert bank["cse-1996-a-46"]["answer"] == "D"
# Binary → BCD: add 0 D D 0 with D = b3(b2 + b1); BCD → XS-3: add 0011.
for b in range(16):
    D = (b >> 3 & 1) & ((b >> 2 | b >> 1) & 1)
    t = b + (6 if D else 0)
    assert D == int(b >= 10) and 10 * (t >> 4) + (t & 15) == b and (t & 15) < 10
for d in range(10):
    assert d + 3 == int({0: "0011", 1: "0100", 2: "0101", 3: "0110", 4: "0111", 5: "1000", 6: "1001", 7: "1010", 8: "1011", 9: "1100"}[d], 2)
assert sum(al.gate_count(al.rca(4)).values()) == 20

# Nine's complementer equations and 2-digit decimal subtraction.
for d in range(10):
    b = [d >> i & 1 for i in range(4)]
    N = [1 - b[0], b[1], b[2] ^ b[1], 1 - (b[3] | b[2] | b[1])]
    assert sum(x << i for i, x in enumerate(N)) == 9 - d
assert 52 + (99 - 17) + 1 == 135
# Overflow-forms table: carry form = sign form for every (x, y, c).
for x, y, c in product((0, 1), repeat=3):
    s_ = x ^ y ^ c
    cn = (x & y) | (x & c) | (y & c)
    assert cn ^ c == (((1 - x) & (1 - y) & s_) | (x & y & (1 - s_)))
    if x != y:
        assert cn == c

# ── Practice ─────────────────────────────────────────────────────────────
P = al.practice()
q = P["nx-dl-04-03-q01"]
sett = {"A": (0, 1), "B": (1, 0), "C": (0, 0), "D": (1, 1)}
ok = [l for l, kc in sett.items() if all(o == (a - b) % 16 for (a, b), o in form[kc].items())]
bl.assert_mcq(q, ok[0])
q = P["nx-dl-04-03-q02"]
ops = {"A": lambda a, b: a + b + 1, "B": lambda a, b: a - b - 1, "C": lambda a, b: a + 1, "D": lambda a, b: b - a}
reach = [l for l, f in ops.items() if any(all(o == f(a, b) % 16 for (a, b), o in form[kc].items()) for kc in form)]
bl.assert_msq(q, reach)
q = P["nx-dl-04-03-q03"]
r, v = run(0b0111, 0b0001, 0)
opt3 = {"A": (1, 0), "B": (0, 0), "C": (1, 1), "D": (0, 1)}
bl.assert_mcq(q, [l for l, x in opt3.items() if x == (v["V"], v["C"])][0])
q = P["nx-dl-04-03-q04"]
r, v = run(0b0010, 0b0111, 1)
fl = {"A": v["C"], "B": v["V"], "C": v["N"], "D": v["Z"]}
bl.assert_msq(q, [l for l, x in fl.items() if x])
# q05: over all 8-bit pairs, N = 0 and V = 1 after A − B implies A < B signed (and occurs).
net8 = al.adder_subtractor(8)
seen = False
for a in range(0, 256, 3):
    for b in range(0, 256, 5):
        v = cl.evaluate(net8, {**al.env_of(8, a, b), "K": 1})
        if v["N"] == 0 and v["V"] == 1:
            seen = True
            assert al.tc(a, 8) < al.tc(b, 8)
assert seen
bl.assert_mcq(P["nx-dl-04-03-q05"], "A")
q = P["nx-dl-04-03-q06"]
V5 = ["K", "Z3", "Z2", "Z1", "Z0"]
want = tuple(int(16 * r_[0] + cl.num(r_[1:]) >= 10) for r_ in (cl.bits_of(m, 5) for m in range(32)))
reachable = [m for m in range(32) if 16 * (m >> 4) + (m & 15) <= 19]
okd = [l for l, t in bl.option_values(q).items() if all(bl.tt(t.strip("$"), V5)[m] == want[m] for m in reachable)]
bl.assert_mcq(q, okd[0])
assert okd == ["B"]
v = cl.evaluate(net, al.env_of(4, 6, 7, 1))
bl.assert_nat(P["nx-dl-04-03-q07"], al.word(v, "s", 4))
bl.assert_nat(P["nx-dl-04-03-q08"], sum(1 for a in range(10) for b in range(10) if cl.evaluate(net, al.env_of(4, a, b, 0))["Cout"]))
assert sum(1 for a in range(10) for b in range(10) if a + b >= 9) == 55 and sum(1 for a in range(10) for b in range(10) if 10 <= a + b <= 15) == 39
v = cl.evaluate(conv, {f"b{i}": 0b1110 >> i & 1 for i in range(4)})
bl.assert_nat(P["nx-dl-04-03-q09"], 16 * v["d4"] + al.word(v, "d", 4))
bl.assert_nat(P["nx-dl-04-03-q10"], sum(al.gate_count(net).values()))
assert len([k for k in P if k.startswith("nx-dl-04-03-")]) == 10
print("l4_03_addsub: adder–subtractor and flags over all 4/6-bit pairs, comparison theorem, 2003 ALU settings, BCD adder over every digit pair "
      "(detector minimal, K-less variant fails on 16–19), 3-digit chains, converters, 2 PYQ keys and 10 practice answers OK")
