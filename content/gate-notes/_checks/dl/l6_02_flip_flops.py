"""Checks for dl/06-sequential-circuits/02-flip-flops: every characteristic table, equation, excitation
entry and conversion of the lesson is found by trying every input (seqlib.ff_next, excitation,
convert); every waveform (latch vs edge, master–slave, race-around, setup/hold windows, the timing
examples and the 2001/2006 circuits) is a tick-by-tick seqlib.scope run or an edge sampling with
seqlib.sample; preset and clear are checked on the gate-level 6-NAND edge-triggered D flip-flop with
seqlib.async_sim. The five PYQ keys, every worked example and every practice answer, MSQ option and
distractor are recomputed."""
import math
import pathlib
import random
import sys
from itertools import product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import seqlib as sq  # noqa: E402

L = sq.lesson_text("02-flip-flops.md")
has = lambda *s: bl.must_contain(L, *s)  # noqa: E731
bank = bl.bank()
P = sq.practice()
rng = random.Random(602)


def changes(w):
    return [t for t in range(1, len(w)) if w[t] != w[t - 1]]


def inv(w):
    return ["X" if a == "X" else 1 - a for a in w]


def AND(a, b):
    return 0 if 0 in (a, b) else "X" if "X" in (a, b) else 1


# ── Characteristic tables and equations ───────────────────────────────────
for q, a, b in product((0, 1), repeat=3):
    assert sq.ff_next("JK", q, J=a, K=b) == ((a & (1 - q)) | ((1 - b) & q))
    assert sq.ff_next("T", q, T=a) == a ^ q and sq.ff_next("D", q, D=a) == a
    if not (a and b):
        assert sq.ff_next("SR", q, S=a, R=b) == (a | ((1 - b) & q))
# Q⁺ = T is wrong (erratum B 183): it disagrees with the T table on two of four rows
assert sum(sq.ff_next("T", q, T=t) != t for q, t in product((0, 1), repeat=2)) == 2
# D has no Q in its equation (erratum D 400)
assert all(sq.ff_next("D", 0, D=d) == sq.ff_next("D", 1, D=d) == d for d in (0, 1))
# JK with K = J̄ is a D flip-flop; JK with J = K = T is a T flip-flop
for q, x in product((0, 1), repeat=2):
    assert sq.ff_next("JK", q, J=x, K=1 - x) == sq.ff_next("D", q, D=x)
    assert sq.ff_next("JK", q, J=x, K=x) == sq.ff_next("T", q, T=x)
# the characteristic table block, row by row
rows = {"SR": {(0, 0): "$Q$", (0, 1): "0", (1, 0): "1", (1, 1): "–"},
        "JK": {(0, 0): "$Q$", (0, 1): "0", (1, 0): "1", (1, 1): "$\\overline{Q}$"}}
for kind, tab in rows.items():
    for (a, b), shown in tab.items():
        nx = [sq.ff_next(kind, q, **dict(zip(sq.INPUTS[kind], (a, b)))) for q in (0, 1)]
        want = {(None, None): "–", (0, 1): "$Q$", (1, 0): "$\\overline{Q}$", (0, 0): "0", (1, 1): "1"}[tuple(nx)]
        assert want == shown, (kind, a, b)
        has(f"| {kind} | ${sq.INPUTS[kind][0]} {sq.INPUTS[kind][1]} = {a}{b}$ | {shown} |")
has("$$Q^+ = S + \\overline{R}\\,Q, \\qquad SR = 0.$$", "$$Q^+ = J\\,\\overline{Q} + \\overline{K}\\,Q.$$", "$$Q^+ = D.$$",
    "$$Q^+ = T\\,\\overline{Q} + \\overline{T}\\,Q = T \\oplus Q.$$")
# JK rows with Q⁺ = 1: 001, 100, 101, 110; SR rows: 001, 100, 101
assert [r[:3] for r in sq.char_table("JK") if r[3] == 1] == [(0, 0, 1), (1, 0, 0), (1, 0, 1), (1, 1, 0)]
assert sorted(r[:3] for r in sq.char_table("SR") if r[3] == 1) == [(0, 0, 1), (1, 0, 0), (1, 0, 1)]
has("$(J, K, Q)$ = 001 (hold a 1), 100 and 101 (set), and 110 (toggle a 0 to 1)")

# ── Excitation tables (table block and derivation) ────────────────────────
ex = {k: {(q, qn): sq.excitation(k, q, qn) for q, qn, _ in sq.excitation_table(k)} for k in sq.KINDS}
for (q, qn) in product((0, 1), repeat=2):
    e = {**ex["SR"][(q, qn)], **ex["JK"][(q, qn)], **ex["D"][(q, qn)], **ex["T"][(q, qn)]}
    has("| " + " | ".join(str(v) for v in (q, qn, e["S"], e["R"], e["J"], e["K"], e["D"], e["T"])) + " |")
    assert e["D"] == qn and e["T"] == q ^ qn
assert [(v["J"], v["K"]) for v in ex["JK"].values()] == [(0, "x"), (1, "x"), ("x", 1), ("x", 0)]
assert [(v["S"], v["R"]) for v in ex["SR"].values()] == [(0, "x"), (1, 0), (0, 1), ("x", 0)]
has("$0 \\to 0$ (0, x), $0 \\to 1$ (1, x), $1 \\to 0$ (x, 1), $1 \\to 1$ (x, 0). SR:\n(0, x), (1, 0), (0, 1), (x, 0)")

# ── Conversions ───────────────────────────────────────────────────────────
norm = lambda d: {k: [sorted(x.split(" + ")) for x in v] for k, v in d.items()}  # noqa: E731
assert norm(sq.convert("JK", "D")) == {"D": [sorted(["JQ′", "K′Q"])]}
assert norm(sq.convert("T", "D")) == {"D": [sorted(["TQ′", "T′Q"])]}
assert norm(sq.convert("D", "JK")) == {"J": [["D"]], "K": [["D′"]]}
assert norm(sq.convert("JK", "T")) == {"T": [sorted(["JQ′", "KQ"])]}
assert norm(sq.convert("SR", "JK")) == {"J": [["S"]], "K": [["R"]]}
assert norm(sq.convert("JK", "SR")) == {"S": [["JQ′"]], "R": [["KQ"]]}
has("$$D = J\\,\\overline{Q} + \\overline{K}\\,Q.$$", "$$D = T \\oplus Q = T\\,\\overline{Q} + \\overline{T}\\,Q.$$",
    "$$J = D, \\qquad K = \\overline{D}.$$", "$$T = J\\,\\overline{Q} + K\\,Q.$$", "$J = S$, $K = R$: wire them straight through",
    "$S = J\\overline{Q}$, $R = KQ$")
# the circuits really behave as the target on every row
for j, k, q in product((0, 1), repeat=3):
    assert sq.ff_next("D", q, D=(j & (1 - q)) | ((1 - k) & q)) == sq.ff_next("JK", q, J=j, K=k)
    assert sq.ff_next("T", q, T=(j & (1 - q)) | (k & q)) == sq.ff_next("JK", q, J=j, K=k)
    if not (j and k):  # SR from JK on the allowed rows
        assert sq.ff_next("JK", q, J=j, K=k) == sq.ff_next("SR", q, S=j, R=k)
assert sq.ff_next("JK", 0, J=1, K=1) == 1 and sq.ff_next("JK", 1, J=1, K=1) == 0  # SR 11 → toggles
# the D-from-JK derivation table
for d, q in product((0, 1), repeat=2):
    e = sq.excitation("JK", q, d)
    has(f"| {d} | {q} | {d} | {e['J']} | {e['K']} |")

# ── Master–slave: Q changes only at falling edges, to D at that edge ─────
for _ in range(200):
    clk = [0] + [v for _ in range(6) for v in [1] * rng.randint(1, 4) + [0] * rng.randint(1, 4)]
    D = [rng.randint(0, 1) for _ in clk]
    r = sq.scope("D", "ms", clk, {"D": D}, tpd=1)
    falls = [t for t in range(1, len(clk)) if clk[t - 1] == 1 and clk[t] == 0]
    assert r["edges"] == falls
    for t in changes(r["S"]):
        assert t in falls
    for t in falls:
        assert r["S"][t] == D[t - 1]  # the value D had as the clock fell
    for t in range(len(clk)):
        if clk[t]:
            assert r["M"][t] == D[t]  # master transparent while CLK = 1
# 1s-catching: JK master–slave, Q = 0, K = 0, a one-tick J pulse mid-high-phase → Q = 1
clk = [0, 0] + [1] * 6 + [0] * 4
J = [0] * 4 + [1] + [0] * 7
r = sq.scope("JK", "ms", clk, {"J": J, "K": [0] * 12}, tpd=1)
assert r["Q"][-1] == 1 and J[7] == 0  # J was 0 at the falling edge
rp = sq.scope("JK", "pos", clk, {"J": J, "K": [0] * 12}, tpd=1)
assert rp["Q"][-1] == 0  # an edge-triggered JK samples J = 0 and stays 0

# ── Race-around: ⌈t_w / t_pd⌉ toggles; once iff t_w ≤ t_pd ────────────────
for tpd in (2, 3, 4):
    for w in range(1, 20):
        c = [0, 0] + [1] * w + [0] * (3 * tpd)
        one = [1] * len(c)
        n = len(changes(sq.scope("JK", "latch", c, {"J": one, "K": one}, tpd=tpd)["Q"]))
        assert n == math.ceil(w / tpd) and (n == 1) == (w <= tpd)
        ms = sq.scope("JK", "ms", c, {"J": one, "K": one}, tpd=tpd)
        assert len(changes(ms["Q"])) == 1
has("1, 1, 1, 1 toggles for $w = 1 \\dots 4$, then 2 for $w = 5 \\dots 8$, 3 for $w = 9 \\dots 12$")


def race(width_ns, tpd_ns, tick):
    c = [0, 0] + [1] * (width_ns // tick) + [0] * (3 * tpd_ns // tick)
    one = [1] * len(c)
    r = sq.scope("JK", "latch", c, {"J": one, "K": one}, q0=0, tpd=tpd_ns // tick)
    ch = changes(r["Q"])
    return len(ch), [(t - 2) * tick for t in ch], r["Q"][-1]


assert race(6, 10, 2)[0] == 1 and math.ceil(6 / 10) == 1  # pulse shorter than the delay
assert race(10, 10, 2)[0] == 1 and race(11, 10, 1)[0] == 2  # the boundary t_w = t_pd
has("$\\lceil 6 / 10 \\rceil = \\lceil 0.6 \\rceil = 1$ toggle", "$\\lceil 10 / 10 \\rceil = 1$ toggle", "$\\lceil 11 / 10 \\rceil = 2$ toggles",
    "one toggle per pulse needs $t_w \\le t_{pd} < T$", "asks for $t_w \\le t_{pd} < T$")
# edge case: D latch with D = Q̄ (= T latch, T = 1), t_pd = 6 ns, two pulses of 13 ns (3 changes each) or 12 ns (2 each)
for w, per, ends in ((13, 3, [1, 0]), (12, 2, [0, 0])):
    clk = [0] + [1] * w + [0] * 20 + [1] * w + [0] * 20
    rr = sq.scope("T", "latch", clk, {"T": [1] * len(clk)}, q0=0, tpd=6)
    p1, p2 = 1 + w + 20, len(clk)
    assert len(changes(rr["Q"][:p1])) == per and len(changes(rr["Q"][p1 - 1:p2])) == per
    assert [rr["Q"][p1 - 1], rr["Q"][-1]] == ends and per == math.ceil(w / 6)
has("$\\lceil 13 / 6 \\rceil = 3$ changes", "$\\lceil 12 / 6 \\rceil = 2$ changes per pulse")
n, at, fin = race(30, 8, 2)
assert (n, at, fin) == (4, [8, 16, 24, 32], 0) and math.ceil(30 / 8) == 4
assert race(20, 8, 2)[0::2] == (3, 1)
has("$\\lceil 30 / 8 \\rceil = \\lceil 3.75 \\rceil = 4$ toggles, completing at 8, 16, 24 and 32 ns",
    "and ends at **0**, where it started", "With a 20 ns\npulse it would toggle 3 times and end at 1")

# ── Worked examples: characteristic ───────────────────────────────────────
assert (sq.ff_next("SR", 1, S=0, R=1), sq.ff_next("JK", 1, J=1, K=0), sq.ff_next("D", 1, D=1), sq.ff_next("T", 1, T=1)) == (0, 1, 1, 0)
has("SR → 0, JK → 1, D → 1, T → 0")
q, seq = 0, []
for j, k in [(1, 0), (0, 0), (1, 1), (1, 1), (0, 1), (1, 1)]:
    q = sq.ff_next("JK", q, J=j, K=k)
    seq.append(q)
assert seq == [1, 1, 0, 1, 0, 1]
has("$Q$ = 1, 1, 0, 1, 0, 1 after edges 1 to 6")
tq = sq.Sync([("Q", "T", {"T": lambda e: 1 - e["Q"]})]).trace((0,), 5)
assert [s[0] for s in tq] == [0, 1, 1, 1, 1, 1]
assert all(sq.ff_next("T", q, T=1 - q) == 1 for q in (0, 1)) and all(sq.ff_next("D", q, D=1 - q) == 1 - q for q in (0, 1))

# ── PYQ 2000: JK (J = K = 1) → P, D = P → Q; (P, Q) alternates with period 2 ─
m2000 = sq.Sync([("P", "JK", {"J": lambda e: 1, "K": lambda e: 1}), ("Q", "D", {"D": lambda e: e["P"]})])
tr = m2000.trace((0, 1), 4)
assert tr == [(0, 1), (1, 0), (0, 1), (1, 0), (0, 1)]
opts2000 = {"A": (1, 0), "B": (1, 1), "C": (0, 0), "D": (0, 1)}
# the stem says "After three clock cycles" (wording restored, key fixed D → A in src/gate/fixes/cse-2000.json)
assert "After three clock cycles" in bank["cse-2000-a-2-12"]["text"] and not bank["cse-2000-a-2-12"].get("needsReview")
assert [k for k, v in opts2000.items() if v == tr[3]] == ["A"] == bl.key_letters(bank["cse-2000-a-2-12"]["answer"])
assert [k for k, v in opts2000.items() if v == tr[2]] == ["D"]  # the two-cycle (even) state, the old key: the trap
assert all(tr[n] == tr[n % 2] for n in range(5))  # period 2
# the same-edge trap: letting Q see the new P gives (1, 1), option B
assert (sq.ff_next("JK", 0, J=1, K=1), sq.ff_next("JK", 0, J=1, K=1)) == (1, 1) and opts2000["B"] == (1, 1)
has("Find $(P, Q)$ after three clock cycles", "Three is odd, so the answer is $(1, 0)$, option A",
    "Two cycles (or any even number) give $(0, 1)$", "which is option D", "**period 2**", "$(P, Q) = (1, 1)$ after one cycle",
    "here $3 \\bmod 2 = 1$")

# ── Edge-triggered vs latch on the same waveform (pulse between edges) ────
N = 61
clk = [0] + [1 if (t - 1) % 20 < 10 else 0 for t in range(1, N)]
Dp = [1 if 23 <= t - 1 < 31 else 0 for t in range(N)]
ff = sq.scope("D", "pos", clk, {"D": Dp}, tpd=1)
la = sq.scope("D", "latch", clk, {"D": Dp}, tpd=1)
assert set(ff["S"]) == {0}
assert [t - 1 for t in range(N) if la["S"][t] == 1] == list(range(23, 40))
has("Latch: 1 from 23 to 40 ns, then 0")

# ── Preset and clear on the gate-level edge-triggered D flip-flop (6 NANDs) ─
G74 = [("g1", "NAND", ["PRE", "g4", "g2"]), ("g2", "NAND", ["g1", "CLR", "CLK"]), ("g3", "NAND", ["g2", "CLK", "g4"]),
       ("g4", "NAND", ["g3", "CLR", "D"]), ("Q", "NAND", ["PRE", "g2", "Qb"]), ("Qb", "NAND", ["Q", "CLR", "g3"])]
INIT = {"g1": 1, "g2": 1, "g3": 1, "g4": 0, "Q": 0, "Qb": 1}


def run74(pre, clr, clk, d):
    h = sq.async_sim(G74, lambda t: {"PRE": pre[t], "CLR": clr[t], "CLK": clk[t], "D": d[t]}, INIT, len(clk) - 1)
    return [r["Q"] for r in h], [r["Qb"] for r in h]


N = 80
ck = [1 if (t // 10) % 2 else 0 for t in range(N)]
one, zero = [1] * N, [0] * N
dd = [1 if 15 <= t < 45 else 0 for t in range(N)]
q74, _ = run74(one, one, ck, dd)
assert changes(q74) and all(any(e <= t <= e + 3 for e in (10, 30, 50, 70)) for t in changes(q74))  # edge-triggered
assert q74[25] == 0 and q74[40] == 1 and q74[60] == 0  # D = 1 mid-pulse at 15 is ignored until the edge at 30
qp, _ = run74([0 if 3 <= t < 6 else 1 for t in range(N)], one, ck, zero)
assert qp[2] == 0 and qp[5] == 1 and qp[9] == 1  # preset → 1 at once, before any edge
qc, _ = run74(one, [0 if 25 <= t < 60 else 1 for t in range(N)], ck, one)
assert qc[20] == 1 and all(qc[t] == 0 for t in range(28, 61)) and qc[-1] == 1  # edges at 30, 50 ignored while cleared
qb2, qbb = run74(zero, zero, ck, dd)
assert qb2[-1] == qbb[-1] == 1  # both active: Q = Q̄ = 1
for pre, clr, want in ((0, 1, [1]), (1, 0, [0])):
    for c, d in product((0, 1), repeat=2):
        assert sorted({fp["Q"] for fp in sq.fixed_points(G74, {"PRE": pre, "CLR": clr, "CLK": c, "D": d})}) == want
has("$\\overline{PRE} = 0$ has the single stable state $Q = 1$")

# ── Setup/hold window (scope rule) ─────────────────────────────────────────
clk = [0, 0, 0, 0] + [1] * 6 + [0] * 6
for c in range(1, len(clk)):
    D = [0] * c + [1] * (len(clk) - c)
    r = sq.scope("D", "pos", clk, {"D": D}, tsu=2, th=2, tpd=1)
    e = 4
    inside = e - 2 < c < e + 2
    assert bool(r["viol"]) == inside and (r["S"][e] == "X") == inside
    if not inside:
        assert r["S"][e] == (1 if c < e else 0)
# a change exactly at the edge with t_h = 0 → old value, no violation
r = sq.scope("D", "pos", clk, {"D": [0] * 4 + [1] * 12}, tsu=2, th=0)
assert r["viol"] == [] and r["S"][4] == 0

# ── Timing worked examples ────────────────────────────────────────────────
edges = [10, 30, 50, 70]
smp = sq.sample(edges, [(None, 0), (15, 1), (42, 0), (61, 1)])
assert smp == [(0, False), (1, False), (0, False), (1, False)]
qq, moves = 0, []
for e, (v, _) in zip(edges, smp):
    if v != qq:
        moves.append(e + 3)
    qq = v
assert moves == [33, 53, 73]
has("Q = 0 until 33 ns, 1 from 33 to 53 ns, 0 from 53 to 73 ns, 1 after 73 ns")


def min_period(tcq, tlog, tsu, step=0.5):
    """Smallest T (grid) at which data launched at 0 is captured cleanly at the edge T (seqlib.sample)."""
    T = step
    while True:
        (v, bad), = sq.sample([T], [(None, 0), (tcq + tlog, 1)], tsu=tsu)
        if v == 1 and not bad:
            return T
        T += step


assert min_period(5, 12, 3) == 20 and 1000 / 20 == 50
assert sq.sample([18], [(None, 0), (17, 1)], tsu=3) == [(1, True)] and sq.sample([20], [(None, 0), (17, 1)], tsu=3) == [(1, False)]
assert 5 + 2 >= 1 and round(1000 / 15, 1) == 66.7 and round(1000 / 17, 1) == 58.8
has("$T \\ge 20$ ns, $f_{max} = 50$ MHz", "$T_{min} = t_{cq} + t_{logic,max} + t_{su} = 5 + 12 + 3 = 20$ ns",
    "(giving 15 ns, 66.7 MHz)", "(17 ns, 58.8 MHz)", "$t_{cq} + t_{logic,min} = 5 + 2 = 7$ ns",
    "Running at\n$T = 18$ ns would put the data's arrival (17 ns) inside the setup window")
# hold violation: Q1 → D2 directly, t_cq = 1, t_h = 2
assert sq.sample([0], [(None, 0), (1, 1)], th=2) == [(0, True)]
assert sq.sample([0], [(None, 0), (2, 1)], th=2) == [(0, False)]  # with a 1 ns buffer
has("add at least $2 - 1 = 1$ ns of delay")

# ── PYQ 2001: D0 = X, D1 = X·Q̄0, Y = Q1; t_su = 20 ns (2 ticks of 10 ns), t_h = 0 ──
clk = [0] * 3 + [1, 1, 0, 0] * 7
N = len(clk)
ed = [t for t in range(1, N) if clk[t] and not clk[t - 1]]
X = [1 if ed[0] <= t < ed[5] - 1 else 0 for t in range(N)]  # rises exactly at edge 1, falls just before edge 6
r0 = sq.scope("D", "pos", clk, {"D": X}, tsu=2, th=0, tpd=1)
D1 = [AND(X[t], inv(r0["Q"])[t]) for t in range(N)]
r1 = sq.scope("D", "pos", clk, {"D": D1}, tsu=2, th=0, tpd=1)
Y = r1["Q"]
assert [Y[e + 1] for e in ed] == [0, 1, 0, 0, 0, 0, 0]  # high from edge 2 to edge 3 only
assert [v for v in r0["viol"] if v[0] < ed[5]] == [] and r1["viol"] == []
assert r0["viol"] == [(ed[5], "setup", "D")]  # X falls inside the setup window of edge 6: flip-flop 0 only
assert all(D1[t] == 0 for t in range(ed[5] - 3, ed[5] + 3))  # D1 = X·Q̄0 is 0 on both sides of edge 6
assert r0["S"][ed[0]] == 0  # X sampled as the old 0 at edge 1
# option drawings: A high between markers 2 and 3; B 1–3; C 1–2; D 3–6
opt2001 = {"A": (2, 3), "B": (1, 3), "C": (1, 2), "D": (3, 6)}
hi = [k + 1 for k, e in enumerate(ed) if Y[e + 1] == 1]
assert [k for k, (a, b) in opt2001.items() if list(range(a, b)) == hi] == ["A"] == [bank["cse-2001-a-33"]["answer"]]
has("(GATE 2001, option A)", "flags a setup violation on $D_0$ at edge 6 only, which does not reach Y",
    "At edge 6, X falls inside the 20 ns setup window")

# ── PYQ 2005: D = A·X + X̄·Q̄; Y over periods 1 … 5 ─────────────────────────
Xp = [1, 1, 0, 1, 1, 0]
opts05 = {"A": lambda A: [A[0], A[1], 1 - A[1], A[3], A[4]], "B": lambda A: [A[0], A[1], 1 - A[2], A[3], A[4]],
          "C": lambda A: [A[1], A[2], 1 - A[2], A[3], A[4]], "D": lambda A: [A[1], 1 - A[2], A[3], A[4], 1 - A[5]]}
m05 = sq.Sync([("Y", "D", {"D": lambda e: (e["A"] & e["X"]) | ((1 - e["X"]) & (1 - e["Y"]))})], inputs=("A", "X"))
ok05 = {k: True for k in opts05}
for A in product((0, 1), repeat=6):
    for y0 in (0, 1):
        ys = [s[0] for s in m05.trace((y0,), xs=[(A[i], Xp[i]) for i in range(5)])][1:]
        for k, f in opts05.items():
            ok05[k] &= ys == f(A)
assert [k for k, v in ok05.items() if v] == ["A"] == [bank["cse-2005-cs-62"]["answer"]]
has("(GATE 2005, option A)", "$Y_3 = \\overline{Y_2} = \\overline{A_1}$", "all 64 values of\n$A_0 \\dots A_5$")

# ── PYQ 2006: which pair of D flip-flops delays f (changing at falling edges) by 180° ─
clk = [0] + [1, 1, 0, 0] * 10
N = len(clk)
nclk = [1 - c for c in clk]
negs = [t for t in range(1, N) if clk[t - 1] == 1 and clk[t] == 0]
pat = [1, 0, 1, 1, 0, 0, 1, 0, 1, 0]
f = []
v = 0
for t in range(N):
    if t in negs:
        v = pat[negs.index(t) % len(pat)]
    f.append(v)
ffq = lambda c, d, th=0: sq.scope("D", "pos", c, {"D": d}, th=th, tpd=1)  # noqa: E731
outs = {"C": ffq(nclk, ffq(clk, f)["Q"])["Q"], "B": ffq(nclk, ffq(clk, inv(f))["Q"])["Q"],
        "A": ffq(clk, inv(ffq(nclk, inv(f))["Q"]))["Q"], "D": ffq(clk, inv(ffq(nclk, f)["Q"]))["Q"]}
period = 4


def delayed(o, sh, flip=False):
    return all(o[t] == (1 - f[t - sh] if flip else f[t - sh]) for t in range(12, N))


assert delayed(outs["C"], period + 1)  # one clock period (+ 1 tick clock-to-Q)
assert delayed(outs["A"], period + period // 2 + 1)  # 1.5 T when the changing edge yields the old value
assert delayed(outs["B"], period + 1, True) and delayed(outs["D"], period + period // 2 + 1, True)
assert [k for k, o in outs.items() if delayed(o, period + 1)] == ["C"] == [bank["cse-2006-cs-8"]["answer"]]
# with any hold time, the first flip-flop of A and D samples f exactly as it changes: a violation; C's never do
assert ffq(nclk, inv(f), th=1)["viol"] and ffq(nclk, f, th=1)["viol"]
assert not ffq(clk, f, th=1)["viol"] and not ffq(nclk, ffq(clk, f)["Q"], th=1)["viol"]
has("(GATE 2006, option C)", "the total delay becomes $1.5T$, 270°", "shifted by 4\nticks (one clock period) plus the 1-tick clock-to-Q delay")

# ── PYQ IT 2008: toggle iff x ⊕ y = 1 ─────────────────────────────────────
xo = lambda x, y: x ^ y  # noqa: E731
xn = lambda x, y: 1 - (x ^ y)  # noqa: E731
opts08 = {"A": (xn, xn), "B": (xn, xo), "C": (xo, xn), "D": (xo, xo)}
good = [k for k, (fj, fk) in opts08.items()
        if all(sq.ff_next("JK", q, J=fj(x, y), K=fk(x, y)) == (q if x == y else 1 - q) for q, x, y in product((0, 1), repeat=3))]
assert good == ["D"] == [bank["it-2008-it-37"]["answer"]]
for q, x, y in product((0, 1), repeat=3):
    e = sq.excitation("JK", q, q ^ x ^ y)
    assert (e["J"] if q == 0 else e["K"]) == x ^ y and (e["K"] if q == 0 else e["J"]) == "x"
has("(IT 2008, option D)")

# ── Negative vs positive edge on the same input ───────────────────────────
wv = [(None, 0), (5, 1), (25, 0), (33, 1), (58, 0)]
assert [v for v, _ in sq.sample([10, 30, 50, 70], wv)] == [1, 0, 1, 0]
assert [v for v, _ in sq.sample([20, 40, 60], wv)] == [1, 1, 0]
has("Negative edge: 1, 0, 1, 0. Positive edge: 1, 1, 0.")

# ── The 180° theorem: rising then falling stage, any f changing at falling edges ─
for _ in range(50):
    pat = [rng.randint(0, 1) for _ in range(10)]
    f2, v = [], 0
    for t in range(N):
        if t in negs:
            v = pat[negs.index(t)]
        f2.append(v)
    o = ffq(nclk, ffq(clk, f2)["Q"])["Q"]
    assert all(o[t] == f2[t - period - 1] for t in range(period + 1, N))

# ── Practice ───────────────────────────────────────────────────────────────
q1 = sq.ff_next("JK", 1, J=1, K=1)
q2 = sq.ff_next("JK", q1, J=1, K=0)
assert bl.option_values(P["nx-dl-06-02-q01"])["A"] == f"{q1}, then {q2}"
bl.assert_mcq(P["nx-dl-06-02-q01"], "A")
claims = {"A": sq.excitation("JK", 0, 1) == {"J": 1, "K": "x"}, "B": sq.excitation("SR", 1, 1) == {"S": "x", "R": 0},
          "C": sq.excitation("T", 1, 0) == {"T": 0},
          "D": [jk for jk in product((0, 1), repeat=2) if sq.ff_next("JK", 1, J=jk[0], K=jk[1]) == 1] == [(1, 0)]}
bl.assert_msq(P["nx-dl-06-02-q02"], [k for k, v in claims.items() if v])
tf = {"A": lambda j, k, q: (j & (1 - q)) | ((1 - k) & q), "B": lambda j, k, q: j ^ k, "C": lambda j, k, q: j | k,
      "D": lambda j, k, q: (j & (1 - q)) | (k & q)}
bl.assert_mcq(P["nx-dl-06-02-q03"], [k for k, fn in tf.items()
                                     if all(sq.ff_next("T", q, T=fn(j, kk, q)) == sq.ff_next("JK", q, J=j, K=kk)
                                            for j, kk, q in product((0, 1), repeat=3))][0])
assert min_period(6, 15, 4) == 25
bl.assert_nat(P["nx-dl-06-02-q04"], 1000 / min_period(6, 15, 4))
assert [round(1000 / 21, 1), round(1000 / 19, 1)] == [w["answer"] for w in P["nx-dl-06-02-q04"]["common_wrong"]]
n5 = race(35, 10, 5)[0]
assert n5 == 4 and math.floor(35 / 10) == 3
bl.assert_mcq(P["nx-dl-06-02-q05"], [k for k, t in bl.option_values(P["nx-dl-06-02-q05"]).items() if t == str(n5)][0])
m6 = sq.Sync([("Q1", "D", {"D": lambda e: e["x"]}), ("Q2", "D", {"D": lambda e: e["Q1"]})], inputs=("x",))
q2s = [s[1] for s in m6.trace((0, 0), xs=[(1,), (1,), (0,), (1,)])][1:]
assert q2s == [0, 1, 1, 0]
o6 = bl.option_values(P["nx-dl-06-02-q06"])
bl.assert_mcq(P["nx-dl-06-02-q06"], [k for k, t in o6.items() if t == ", ".join(map(str, q2s))][0])
assert o6["B"] == "1, 1, 0, 1"  # the same-edge mistake: Q2 = x
Tseq = [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1]
tq = [s[0] for s in sq.Sync([("Q", "T", {"T": lambda e: e["T"]})], inputs=("T",)).trace((0,), xs=[(t,) for t in Tseq])][1:]
assert tq == [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0]
bl.assert_nat(P["nx-dl-06-02-q07"], sum(tq))
assert sum(Tseq) == 4 and sum(1 for k in range(12) if tq[k] == 1 and (k == 0 or tq[k - 1] == 0)) == 2
# q08 on the gate-level flip-flop: A preset → 1 at once; C edges ignored while cleared; D 11 is normal; B false
assert qp[5] == 1 and all(qc[t] == 0 for t in range(28, 61))
bl.assert_msq(P["nx-dl-06-02-q08"], ["A", "C"])
ed9 = [10, 20, 30, 40, 50, 60, 70, 80]
ch9 = [8, 14, 21.5, 27.5, 39, 50.5, 62, 78.5]
wv9 = [(None, 0)] + [(t, k % 2 ^ 1) for k, t in enumerate(ch9)]
bad = [b for _, b in sq.sample(ed9, wv9, tsu=3, th=1)]
bl.assert_nat(P["nx-dl-06-02-q09"], sum(bad))
assert sum(b for _, b in sq.sample(ed9, wv9, tsu=3)) == 4 and sum(any(e - 4 < t < e + 4 for t in ch9) for e in ed9) == 7
assert all(not (e <= 21.5 < e + 1) and not (e - 3 < 21.5 < e) for e in ed9)  # no boundary tie
# q10 statements from the master–slave scope model
clk = [0, 0] + [1] * 5 + [0] * 4 + [1] * 3 + [0] * 3
one = [1] * len(clk)
ms = sq.scope("JK", "ms", clk, {"J": one, "K": one}, tpd=1)
falls = [t for t in range(1, len(clk)) if clk[t - 1] == 1 and clk[t] == 0]
st_a = all(t in falls for t in changes(ms["S"])) and all(clk[t] or ms["M"][t] == ms["M"][t - 1] for t in range(1, len(clk)))
st_b = any(clk[t] and t not in falls for t in changes(ms["S"]))
st_c = len(changes(ms["S"])) == len(falls)
st_d = sq.scope("JK", "ms", [0, 0] + [1] * 6 + [0] * 4, {"J": [0] * 4 + [1] + [0] * 7, "K": [0] * 12})["Q"][-1] == 0
bl.assert_msq(P["nx-dl-06-02-q10"], [k for k, v in zip("ABCD", (st_a, st_b, st_c, st_d)) if v])
assert len([k for k in P if k.startswith("nx-dl-06-02-")]) == 10
mcq = [P[f"nx-dl-06-02-q{i:02d}"]["answer"] for i in range(1, 11) if P[f"nx-dl-06-02-q{i:02d}"]["type"] == "MCQ"]
assert sorted(mcq) == ["A", "B", "C", "D"]  # keys spread over all four letters
for q in (P[f"nx-dl-06-02-q{i:02d}"] for i in range(1, 11)):
    for b in q["blocks"]:
        assert f"#{b} " in L or f"#{b}}}" in L, (q["id"], b)
print("l6_02_flip_flops: characteristic tables and equations, excitation tables, 6 conversions, master–slave sampling "
      "and 1s-catching, race-around count, gate-level preset/clear, setup/hold window, f_max and hold checks, "
      "5 PYQ keys (2000, 2001, 2005, 2006, IT 2008) and 10 practice answers OK")
