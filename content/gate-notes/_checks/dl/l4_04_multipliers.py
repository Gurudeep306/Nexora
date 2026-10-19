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

# ── Review additions ─────────────────────────────────────────────────────
tr, prod = al.sequential_multiply(15, 13, 4)
assert prod == 195 == 0b11000011 and [(A, Q) for _, A, Q in tr] == [(0b0111, 0b1110), (0b0011, 0b1111), (0b1001, 0b0111), (0b1100, 0b0011)]
assert 0b0011 + 0b1111 == 0b10010 and 0b1001 + 0b1111 == 0b11000
for m in range(16):
    for q in range(16):
        A, Q = 0, q
        for k in range(4):
            t_ = A + (m if Q & 1 else 0)
            comb = (t_ << 4 | Q) >> 1
            A, Q = comb >> 4, comb & 15
            assert A * 2 ** (k + 1) + (Q >> (3 - k)) == m * (q % 2 ** (k + 1))
assert len(al.sequential_multiply(3, 0x00FF, 16)[0]) == 16 and bin(0x00FF).count("1") == 8 and bt.booth_ops(format(0x00FF, "016b")) == 2
assert al.sequential_multiply(9, 0, 4)[1] == 0
ops = [{(1, 0): "-M", (0, 1): "+M"}.get(((0b0110 >> i) & 1, (0b0110 >> (i - 1)) & 1 if i else 0), "none") for i in range(4)]
assert ops == ["none", "-M", "none", "+M"]
assert bt.bitpair_digits("1101") == [-1, 1]


def r4(m, q, n, w, trace=None):
    A, Q, Q1 = 0, q, 0
    for _ in range(n // 2):
        d = bt.bitpair_digit((Q >> 1) & 1, Q & 1, Q1)
        A = (A + d * m) % 2 ** w
        mid = A
        for _ in range(2):
            Q1 = Q & 1
            Q = (Q >> 1) | ((A & 1) << (n - 1))
            A = (A >> 1) | ((A >> (w - 1)) << (w - 1))
        if trace is not None:
            trace.append((d, mid, A, Q))
    return al.tc(((A << n) | Q) % 2 ** (2 * n), 2 * n)


trc = []
assert r4(6, 0b1101, 4, 6, trc) == -18 and trc == [(1, 0b000110, 0b000001, 0b1011), (-1, 0b111011, 0b111110, 0b1110)]
for n_ in (4, 6):
    bad5 = [(m, v) for m in range(-2 ** (n_ - 1), 2 ** (n_ - 1)) for v in range(-2 ** (n_ - 1), 2 ** (n_ - 1)) if r4(m, v % 2 ** n_, n_, n_ + 1) != m * v]
    assert all(m == -2 ** (n_ - 1) for m, _ in bad5) and bad5
    assert all(r4(m, v % 2 ** n_, n_, n_ + 2) == m * v for m in range(-2 ** (n_ - 1), 2 ** (n_ - 1)) for v in range(-2 ** (n_ - 1), 2 ** (n_ - 1)))
    if n_ == 4:
        assert len(bad5) == 5
# Radix-2 Booth: an n-bit A fails only for M = −2^(n−1).
for n_ in (4, 5):
    bad = [(m, v) for m in range(-2 ** (n_ - 1), 2 ** (n_ - 1)) for v in range(-2 ** (n_ - 1), 2 ** (n_ - 1)) if al.tc(booth_narrow(m, v % 2 ** n_, n_), 2 * n_) != m * v]
    assert bad and all(m == -2 ** (n_ - 1) for m, _ in bad)
# Constant-0 cells: exactly n per array (row-1 top cell and every row's lowest cell).
for n_ in range(2, 7):
    net = al.array_multiplier(n_)
    cells = {}
    for name, op, args in net:
        import re as _r
        m = _r.fullmatch(r"([pg])m(\d+)_(\d+)", name)
        if m:
            cells.setdefault((m.group(2), m.group(3)), set()).update(args)
        m = _r.fullmatch(r"([st])m(\d+)_(\d+)", name)
        if m:
            cells.setdefault((m.group(2), m.group(3)), set()).update(args)
    zero = [k for k, a in cells.items() if "0" in a]
    assert len(zero) == n_, (n_, zero)
# Carry-save array: 13 for 4 × 4, 5n − 7.
for n_ in range(3, 9):
    netc = al.array_multiplier_csa(n_)
    tc_ = al.arrival(netc, ins(n_))
    assert max(tc_[f"P{k}"] for k in range(2 * n_)) == 5 * n_ - 7
    if n_ <= 4:
        for x in range(2 ** n_):
            for y in range(2 ** n_):
                assert al.word(cl.evaluate(netc, env(n_, x, y)), "P", 2 * n_) == x * y
assert (64 ** 2 / 16 ** 2, round(64 * 63 / (16 * 15), 1), round(6 * 63 / (6 * 15), 1)) == (16, 16.8, 4.2)
has("$C\\,A = 1\\,0010$, shift: $A\\,Q = 1001\\,0111$", "With 5 bits, 5 of the 256 products come out wrong", "13 unit delays against 18")

# ── PYQs ─────────────────────────────────────────────────────────────────
assert bank["cse-1999-a-21"]["answer"] == "B" and bank["cse-2003-cs-11"]["answer"] == "C"

# ── Practice ─────────────────────────────────────────────────────────────
P = al.practice()
bl.assert_nat(P["nx-dl-04-04-q01"], al.multiplier_cost(8)[0])
bl.assert_nat(P["nx-dl-04-04-q02"], al.multiplier_cost(6)[1])
bl.assert_mcq(P["nx-dl-04-04-q03"], "C")
bl.assert_nat(P["nx-dl-04-04-q04"], ((2 ** 7 - 1) * (2 ** 5 - 1)).bit_length())
bl.assert_nat(P["nx-dl-04-04-q05"], delay[8])
assert delay[4] == 18
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
