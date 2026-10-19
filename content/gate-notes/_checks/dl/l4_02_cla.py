"""Checks for dl/04-arithmetic-circuits/02-carry-look-ahead: the recurrence, the OR-propagate theorem and
the expansion are checked exhaustively; every look-ahead netlist (single-level, multi-level with 2- and
4-way blocks up to 64 bits, rippled CLA blocks, carry-select) is simulated against integer addition and
timed with static arrival times; gate counts and fan-ins are read off the netlists; the 2006 options are
compared with the carry function on all 64 rows; the five PYQ keys and every practice answer are
recomputed."""
import pathlib
import random
import sys
from itertools import product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import arithlib as al  # noqa: E402
import boollib as bl  # noqa: E402
import comblib as cl  # noqa: E402

L = al.lesson_text("02-carry-look-ahead.md")
has = lambda *s: bl.must_contain(L, *s)  # noqa: E731
bank = bl.bank()
rnd = random.Random(402)

# ── Recurrence, OR propagate, expansion ──────────────────────────────────
for a, b, c in product((0, 1), repeat=3):
    g, p, t = a & b, a ^ b, a | b
    cout = (a + b + c) >> 1
    assert cout == g | (p & c) == g | (t & c) and not (g and p)
    assert ((a + b + c) & 1) == p ^ c
    if a and b and not c:
        assert (t ^ c) != ((a + b + c) & 1)
for n in (3, 4):
    for a in range(2 ** n):
        for b in range(2 ** n):
            for c0 in (0, 1):
                g = [(a >> i) & (b >> i) & 1 for i in range(n)]
                p = [((a >> i) ^ (b >> i)) & 1 for i in range(n)]
                for k in range(1, n + 1):
                    terms = [g[j] & all(p[m] for m in range(j + 1, k)) for j in range(k)] + [c0 & all(p[m] for m in range(k))]
                    assert int(any(terms)) == ((a % 2 ** k) + (b % 2 ** k) + c0) >> k
has("$c_4 = g_3 + p_3g_2 + p_3p_2g_1 + p_3p_2p_1g_0 + p_3p_2p_1p_0c_0.$")

# ── Netlists: correctness ────────────────────────────────────────────────
def check(net, n, samples=None):
    if samples is None:
        for a in range(2 ** n):
            for b in range(2 ** n):
                for c in (0, 1):
                    v = cl.evaluate(net, al.env_of(n, a, b, c))
                    assert al.word(v, "s", n) + (v[f"c{n}"] << n) == a + b + c
    else:
        for _ in range(samples):
            a, b, c = rnd.randrange(2 ** n), rnd.randrange(2 ** n), rnd.randrange(2)
            v = cl.evaluate(net, al.env_of(n, a, b, c))
            assert al.word(v, "s", n) + (v[f"c{n}"] << n) == a + b + c


def worst(net, n, d=None):
    t = al.arrival(net, al.inputs_of(n), d)
    return max(t[x] for x in [f"s{i}" for i in range(n)] + [f"c{n}"])


for n in (2, 3, 4):
    check(al.cla(n, 4), n)
for n in (2, 4):
    check(al.cla(n, 2), n)
for n, k in ((8, 4), (16, 4), (32, 4), (64, 4), (8, 2), (16, 2)):
    check(al.cla(n, k), n, 1500)
for n in (8, 16, 64):
    check(al.cla_blocks_rippled(n), n, 1500)
for n in (8, 16):
    check(al.carry_select(n, 4), n, 1500)

# ── Delays, gate counts, fan-in ──────────────────────────────────────────
c4 = al.cla(4)
t = al.arrival(c4, al.inputs_of(4))
assert worst(c4, 4) == 4 and t["c4"] == 3 and al.rca_delay_unit(4) == 9
t2 = al.arrival(c4, al.inputs_of(4), {"XOR": 2})
assert max(t2[f"c{i}"] for i in range(1, 5)) == 4 and worst(c4, 4, {"XOR": 2}) == 6
# Single-level 8-bit CLA = cla(8, k = 8): delay 4, widest gate 9, 36 ANDs.
s8 = al.cla(8, 8)
assert worst(s8, 8) == 4
carry_and = [x for x in s8 if x[1] == "AND" and not x[0].startswith("g")]
carry_or = [x for x in s8 if x[1] == "OR"]
assert len(carry_and) == 36 and len(carry_or) == 8 and max(len(x[2]) for x in carry_and + carry_or) == 9
for n in range(1, 9):
    net = al.lookahead([f"g{i}" for i in range(n)], [f"p{i}" for i in range(n)], "c0", [f"c{i + 1}" for i in range(n)], "u")
    cnt = al.gate_count(net)
    assert cnt["AND"] == n * (n + 1) // 2 and cnt["OR"] == n and max(len(x[2]) for x in net) == n + 1
has("**10 ANDs and 4 ORs**", "$1 + 2 + \\dots + 8 = 36$ AND gates")
# Multi-level: 4-way 4, 8, 12 (= 4d), 32 bits 11; 2-way 4, 7, 11, 15; fan-in ≤ k + 1.
assert [worst(al.cla(n), n) for n in (4, 16, 64)] == [4, 8, 12] and worst(al.cla(32), 32) == 11 and worst(al.cla(8), 8) == 7
assert [worst(al.cla(n, 2), n) for n in (2, 4, 8, 16)] == [4, 7, 11, 15]
for n, k in ((16, 4), (64, 4), (16, 2)):
    d = round(__import__("math").log(n, k))
    assert worst(al.cla(n, k), n) <= 4 * d
    assert max(len(x[2]) for x in al.cla(n, k) if x[1] in ("AND", "OR")) <= k + 1
t16 = al.arrival(al.cla(16), al.inputs_of(16))
assert t16["P0_4"] == 2 and t16["G0_4"] == 3 and t16["c4"] == 4 and max(t16[f"c{i}"] for i in (8, 12, 16)) == 5
assert max(t16[f"c{i}"] for i in range(1, 17)) == 7
t32 = al.arrival(al.cla(32), al.inputs_of(32))
t64 = al.arrival(al.cla(64), al.inputs_of(64))
assert t32["c16"] == 6 and t64["c48"] == 7
has("$c_8, c_{12}, c_{16}$\nat 5; inner carries by 7; last sums at 8", "ready at 6, while at 64 bits the top superblock waits\nfor $c_{48}$ at 7")
assert sum(al.gate_count(al.cla(16)).values()) == 118 and sum(al.gate_count(al.rca(16)).values()) == 80
assert sum(al.gate_count(al.lab_adder("cla", 16)).values()) - 118 == 18 == sum(al.gate_count(al.lab_adder("rca", 16)).values()) - 80
# Hybrids.
rb16 = al.arrival(al.cla_blocks_rippled(16), al.inputs_of(16))
assert [rb16[f"c{4 * j}"] for j in range(1, 5)] == [3, 5, 7, 9] and rb16["c15"] == 9 and worst(al.cla_blocks_rippled(16), 16) == 10
assert worst(al.cla_blocks_rippled(64), 64) == 34 == 64 // 2 + 2
for n in (8, 16, 64):
    assert worst(al.carry_select(n, 4), n, {"MUX": 2}) == 9 + 2 * (n // 4 - 1)
assert worst(al.carry_select(8, 4), 8, {"MUX": 2}) == 11 and al.rca_delay_unit(8) == 17
assert al.rca_delay_unit(64) == 129
# Serial adder.
out, c = al.serial_add(0b10110110, 0b01101101, 8)
assert sum(b << i for i, b in enumerate(out)) == (182 + 109) % 256 == 0b00100011 and c == 1
has("$182 + 109 = 291 = 256 + 35$")
# Worked examples.
assert (0b1011 & 0b0110, 0b1011 ^ 0b0110) == (0b0010, 0b1101) and 11 + 6 == 17
assert (0b0101 & 0b0011, 0b0101 ^ 0b0011) == (0b0001, 0b0110) and 5 + 3 + 1 == 9
assert 0b1001 ^ 0b0110 == 0b1111 and 0b1001 & 0b0110 == 0
A, B = 0b01101011, 0b00110110
assert (A & 15) + (B & 15) == 17 and (A >> 4) + (B >> 4) + 1 == 0b1010 and A + B == 161 == 0b10100001

# ── PYQs ─────────────────────────────────────────────────────────────────
assert bank["cse-1997-a-15"]["answer"] == "B"
assert bank["cse-2004-cs-62"]["answer"] == "B" and worst(c4, 4, {"XOR": 2}) == 6
assert bank["cse-2007-cs-35"]["answer"] == "B"
assert bank["cse-2016-1-cs-33"]["answer"] == "B"
q = bank["cse-2006-cs-36"]
V6 = ["a2", "a1", "a0", "b2", "b1", "b0"]
target = tuple(int((cl.num(r[:3]) + cl.num(r[3:])) >= 8) for r in (cl.bits_of(m, 6) for m in range(64)))
opts = {o["l"]: bl.tt(o["t"].strip("$"), V6) for o in q["options"]}
assert [l for l, tt in opts.items() if tt == target] == ["A"] and q["answer"] == "A"
row = lambda a, b: cl.num(cl.bits_of(a, 3) + cl.bits_of(b, 3))  # noqa: E731
assert opts["B"][row(0b011, 0b100)] == 1 and target[row(0b011, 0b100)] == 0
assert opts["C"][row(0b100, 0b000)] == 1 and target[row(0b100, 0b000)] == 0
assert opts["D"][row(0b001, 0b001)] == 1 and target[row(0b001, 0b001)] == 0
assert opts["A"][row(0b001, 0b111)] == 1 and opts["A"][row(0b011, 0b100)] == 0

# ── Practice ─────────────────────────────────────────────────────────────
P = al.practice()
q = P["nx-dl-04-02-q01"]
a, b = 0b1100, 0b1010
val = {"A": (a & b) >> 3 & 1, "B": (a ^ b) >> 2 & 1, "C": (a ^ b) >> 1 & 1, "D": (a & b) & 1}
bl.assert_msq(q, [k for k, v in val.items() if v])
q = P["nx-dl-04-02-q02"]
V = ["g1", "g0", "p1", "p0", "c0"]
want = bl.tt("g_1 + p_1 g_0 + p_1 p_0 c_0", V)
ok = [l for l, t_ in bl.option_values(q).items() if bl.tt(t_.strip("$"), V) == want]
bl.assert_mcq(q, ok[0])
assert ok == ["A"]
bl.assert_nat(P["nx-dl-04-02-q03"], al.gate_count(al.lookahead([f"g{i}" for i in range(6)], [f"p{i}" for i in range(6)], "c0", [f"c{i + 1}" for i in range(6)], "u"))["AND"])
bl.assert_nat(P["nx-dl-04-02-q04"], worst(al.cla(8, 8), 8))
bl.assert_nat(P["nx-dl-04-02-q05"], max(len(x[2]) for x in al.lookahead([f"g{i}" for i in range(6)], [f"p{i}" for i in range(6)], "c0", [f"c{i + 1}" for i in range(6)], "u")))
bl.assert_mcq(P["nx-dl-04-02-q06"], "D")
assert max(len(x[2]) for x in al.cla(64, 2) if x[1] in ("AND", "OR")) <= 3
tx = al.arrival(al.cla(16), al.inputs_of(16), {"XOR": 2})
assert tx["P0_4"] == 3 and tx["G0_4"] == 4 and max(tx[f"c{4 * j}"] for j in range(1, 5)) == 6 and max(tx[f"c{i}"] for i in range(1, 17)) == 8
bl.assert_nat(P["nx-dl-04-02-q07"], worst(al.cla(16), 16, {"XOR": 2}))
q = P["nx-dl-04-02-q08"]
d = worst(al.carry_select(16, 4), 16, {"MUX": 2})
bl.assert_mcq(q, [l for l, t_ in bl.option_values(q).items() if int(t_) == d][0])
bl.assert_nat(P["nx-dl-04-02-q09"], 32 * 5)
q = P["nx-dl-04-02-q10"]
rows = list(product((0, 1), repeat=3))
st = {"A": all(((a + b + c) >> 1) == ((a & b) | ((a | b) & c)) for a, b, c in rows),
      "B": all(((a + b + c) & 1) == ((a | b) ^ c) for a, b, c in rows),
      "C": all(not ((a & b) and (a ^ b)) for a, b, c in rows),
      "D": any((a & b) and (a | b) for a, b, c in rows)}
bl.assert_msq(q, [k for k, v in st.items() if v])
assert len([k for k in P if k.startswith("nx-dl-04-02-")]) == 10
print("l4_02_cla: recurrence and expansion (exhaustive), CLA netlists to 64 bits (simulated), delays 4/6/8/11/12, 2-way 4/7/11/15, "
      "gate counts n(n+1)/2, fan-in n + 1, hybrids, serial adder, 5 PYQ keys (2006 options on all 64 rows) and 10 practice answers OK")
