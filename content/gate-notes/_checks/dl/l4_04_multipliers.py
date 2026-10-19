"""Checks for dl/04-arithmetic-circuits/04-multipliers-booth: the array multiplier netlists are simulated
exhaustively (n = 2 … 4) and on random operands (n = 5 … 8) against integer multiplication, their
gate/cell counts and critical paths are measured (delay 6(n − 1)), the left-or-down path property behind
the Θ(n) theorem is checked on every edge of the netlist; the sequential and Booth traces of the worked
examples come from arithlib/boothlib; the two PYQ keys and every practice answer are recomputed."""
import pathlib
import random
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import arithlib as al  # noqa: E402
import boollib as bl  # noqa: E402
import boothlib as bt  # noqa: E402
import comblib as cl  # noqa: E402

L = al.lesson_text("04-multipliers-booth.md")
has = lambda *s: bl.must_contain(L, *s)  # noqa: E731
bank = bl.bank()
rnd = random.Random(404)


def env(n, x, y):
    return {**{f"a{j}": x >> j & 1 for j in range(n)}, **{f"b{j}": y >> j & 1 for j in range(n)}}


def ins(n):
    return [f"a{j}" for j in range(n)] + [f"b{j}" for j in range(n)]


delay = {}
for n in range(2, 9):
    net = al.array_multiplier(n)
    pairs = [(x, y) for x in range(2 ** n) for y in range(2 ** n)] if n <= 4 else [(rnd.randrange(2 ** n), rnd.randrange(2 ** n)) for _ in range(800)]
    for x, y in pairs:
        assert al.word(cl.evaluate(net, env(n, x, y)), "P", 2 * n) == x * y
    t = al.arrival(net, ins(n))
    delay[n] = max(t[f"P{k}"] for k in range(2 * n))
    cnt = al.gate_count(net)
    assert cnt["AND"] == n * n + 2 * n * (n - 1) and cnt["XOR"] == 2 * n * (n - 1) and cnt["OR"] == n * (n - 1)
    assert al.multiplier_cost(n) == (n * n, n * (n - 1))
    # Left-or-down property: every cell-to-cell connection keeps or increases (row, weight), increasing one.
    def cell(sig):
        m = re.fullmatch(r"r(\d+)_(\d+)", sig) or re.fullmatch(r"k(\d+)_(\d+)", sig)
        if not m:
            return None
        i, j = int(m.group(1)), int(m.group(2))
        return (i, i + j - (1 if sig.startswith("k") else 0))  # a carry k_i_{j+1} leaves cell (i, j)
    for name, op, args in net:
        m = re.fullmatch(r"[pgt]m(\d+)_(\d+)", name)
        if not m:
            continue
        dst = (int(m.group(1)), int(m.group(1)) + int(m.group(2)))
        for a in args:
            src = cell(a)
            if src and src != dst:
                assert src[0] <= dst[0] and src[1] <= dst[1] and (src[0] < dst[0] or src[1] < dst[1]), (n, a, name)
assert [delay[n] for n in range(2, 9)] == [6 * (n - 1) for n in range(2, 9)] == [6, 12, 18, 24, 30, 36, 42]
has("6, 12, 18, 24, 30, 36, 42 for $n = 2 \\dots 8$")
# Upper bound of the theorem: the measured critical path has < 3n cells.
import _viz_ch4 as vz  # noqa: E402
for n in range(2, 7):
    cells, T, out = vz.array_critical_path(n)
    assert len(cells) < 3 * n and len(cells) >= n - 1 and out == f"P{2 * n - 1}" and T == delay[n]
cells, T, _ = vz.array_critical_path(4)
assert [tt for _, tt in cells] == [4, 6, 8, 9, 12, 13, 16, 18]
has("The path leaves the cells at 4, 6, 8, 9, 12, 13, 16, 18.")
# Counts quoted.
assert al.multiplier_cost(4) == (16, 12) and al.multiplier_cost(8) == (64, 56) and 16 + 12 * 5 == 76 == sum(al.gate_count(al.array_multiplier(4)).values())
assert 255 * 255 == 65025 < 2 ** 16 and 63 * 7 == 441 < 2 ** 9 and 6 * 3 == 18
# 2 × 2 worked example: 3 × 3.
v = cl.evaluate(al.array_multiplier(2), env(2, 3, 3))
assert al.word(v, "P", 4) == 9
# Worked: 42/18 ≈ 2.3.
assert round(42 / 18, 1) == 2.3

# ── Sequential and Booth hardware ────────────────────────────────────────
trace, prod = al.sequential_multiply(11, 5, 4)
assert prod == 55 and [(add, A, Q) for add, A, Q in trace] == [(1, 0b0101, 0b1010), (0, 0b0010, 0b1101), (1, 0b0110, 0b1110), (0, 0b0011, 0b0111)]
tr, prod = bt.booth_trace(6, 0b1101, 4)
assert [(op, A, Q, q1) for op, A, Q, q1 in tr] == [("A − M", 0b11101, 0b0110, 1), ("A + M", 0b00001, 0b1011, 0), ("A − M", 0b11101, 0b1101, 1), ("none", 0b11110, 0b1110, 1)]
assert prod == 0b11101110 and al.tc(prod, 8) == -18 and bt.booth_digits("1101") == [0, -1, 1, -1]
assert bt.booth_ops("00111100") == 2
# M = −8: a 4-bit accumulator gives the wrong sign; 5 bits are right.
def booth_narrow(m, q, n):
    A, Q, Q1 = 0, q, 0
    for _ in range(n):
        pair = (Q & 1, Q1)
        if pair == (1, 0):
            A = (A - m) % 2 ** n
        elif pair == (0, 1):
            A = (A + m) % 2 ** n
        Q1 = Q & 1
        Q = (Q >> 1) | ((A & 1) << (n - 1))
        A = (A >> 1) | ((A >> (n - 1)) << (n - 1))
    return (A << n) | Q


assert al.tc(booth_narrow(-8, 0b0001, 4), 8) == 8 and al.tc(bt.booth_trace(-8, 0b0001, 4)[1], 8) == -8
tr, _ = bt.booth_trace(-8, 0b0001, 4)
assert tr[0][1:] == (0b00100, 0b0000, 1) and tr[1][1] == 0b11110
has("$1111\\,1000 = -8$")

# ── PYQs ─────────────────────────────────────────────────────────────────
assert bank["cse-1999-a-21"]["answer"] == "B" and bank["cse-2003-cs-11"]["answer"] == "C"

# ── Practice ─────────────────────────────────────────────────────────────
P = al.practice()
bl.assert_nat(P["nx-dl-04-04-q01"], al.multiplier_cost(8)[0])
bl.assert_nat(P["nx-dl-04-04-q02"], al.multiplier_cost(6)[1])
bl.assert_mcq(P["nx-dl-04-04-q03"], "C")
bl.assert_nat(P["nx-dl-04-04-q04"], ((2 ** 7 - 1) * (2 ** 5 - 1)).bit_length())
bl.assert_nat(P["nx-dl-04-04-q05"], delay[5])
q = P["nx-dl-04-04-q06"]
cyc = len(al.sequential_multiply(1, 1, 16)[0])
bl.assert_mcq(q, [l for l, t in bl.option_values(q).items() if int(t) == cyc][0])
q = P["nx-dl-04-04-q07"]
acts = {}
for pair in ("00", "01", "10", "11"):
    acts[pair] = {(1, 0): "sub", (0, 1): "add"}.get((int(pair[0]), int(pair[1])), "none")
bl.assert_msq(q, [l for l, t in bl.option_values(q).items() if acts[t] != "none"])
bl.assert_msq(P["nx-dl-04-04-q08"], ["A", "B"])
bl.assert_mcq(P["nx-dl-04-04-q09"], "B")
bl.assert_mcq(P["nx-dl-04-04-q10"], "D")
assert len([k for k in P if k.startswith("nx-dl-04-04-")]) == 10
print("l4_04_multipliers: array netlists n = 2 … 8 (exhaustive to 4), counts n² / n(n − 1), delay 6(n − 1), left-or-down paths, "
      "critical path < 3n cells, sequential and Booth traces (5-bit A required for M = −8), 2 PYQ keys and 10 practice answers OK")
