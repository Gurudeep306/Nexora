"""Checks for dl/06-sequential-circuits/01-latches: every loop of the lesson is a seqlib netlist; its
stable states are its fixed points, and every latch trace (set, hold, reset, the forbidden input, the
release race with equal, unequal and inertial delays) is a gate-delay simulation. The six PYQ keys,
every worked example and every practice answer, MSQ option and MCQ distractor are recomputed."""
import pathlib
import sys
from itertools import product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import seqlib as sq  # noqa: E402

L = sq.lesson_text("01-latches.md")
has = lambda *s: bl.must_contain(L, *s)  # noqa: E731
bank = bl.bank()
P = sq.practice()


def stable(gates, env, out="Q"):
    return sorted(fp[out] for fp in sq.fixed_points(gates, env))


# ── The single-loop theorem: f(x,·) ∈ {0, 1, Q, Q̄} ↔ constant / memory / oscillator ──
for f0, f1 in product((0, 1), repeat=2):
    st = [q for q, fq in ((0, f0), (1, f1)) if fq == q]
    kind = "memory" if (f0, f1) == (0, 1) else "osc" if (f0, f1) == (1, 0) else "const"
    assert {"memory": [0, 1], "osc": [], "const": [f0]}[kind] == st
    # and dynamically: start from both values, run 6 loop delays
    for q0 in (0, 1):
        g = [("Q", "MUX", ["Q", str(f0), str(f1)])]  # Q⁺ = f(Q) as a MUX on Q
        h = [r["Q"] for r in sq.async_sim(g, lambda t: {}, {"Q": q0}, 6)]
        if kind == "osc":
            assert all(h[t] != h[t - 1] for t in range(2, 7))
        elif kind == "memory":
            assert set(h) == {q0}
        else:
            assert h[-1] == f0 and h[2:] == [f0] * 5

# ── Worked examples: feedback analysis ─────────────────────────────────────
OR = [("Q", "OR", ["x", "Q"])]
assert stable(OR, {"x": 0}) == [0, 1] and stable(OR, {"x": 1}) == [1]
MAJ = [("Q", "OR", ["t1", "t2", "t3"]), ("t1", "AND", ["a", "Q"]), ("t2", "AND", ["a", "b"]), ("t3", "AND", ["b", "Q"])]
assert {(a, b): stable(MAJ, {"a": a, "b": b}) for a, b in product((0, 1), repeat=2)} == {
    (0, 0): [0], (0, 1): [0, 1], (1, 0): [0, 1], (1, 1): [1]}
CHAIN = [("g1", "AND", ["A", "Y"]), ("g2", "AND", ["g1", "B"]), ("Y", "AND", ["g2", "C"])]
y1 = [abc for abc in product((0, 1), repeat=3) if 1 in stable(CHAIN, dict(zip("ABC", abc)), "Y")]
assert y1 == [(1, 1, 1)] and stable(CHAIN, {"A": 1, "B": 1, "C": 1}, "Y") == [0, 1]
NORF = [("Q", "NOR", ["a", "b", "Q"])]
for a, b in product((0, 1), repeat=2):
    assert stable(NORF, {"a": a, "b": b}) == ([0] if a or b else [])
h = [r["Q"] for r in sq.async_sim(NORF, lambda t: {"a": 0, "b": 0}, {"Q": 0}, 8)]
assert h == [0, 1, 0, 1, 0, 1, 0, 1, 0]
has("$Q^+ = aQ + ab + bQ$, the majority of $a$, $b$, $Q$", "$Y^+ = A\\,B\\,C\\,Y$", "$Q^+ = \\overline{a + b + Q}$")

# ── Ring oscillator: k odd inverters, period 2·k·t_pd ─────────────────────
for k, d in ((3, 1), (5, 2), (7, 3)):
    gates = [(f"n{i}", "NOT", [f"n{(i - 1) % k}"]) for i in range(k)]
    init = {f"n{i}": i % 2 for i in range(k)}
    v = [r["n0"] for r in sq.async_sim(gates, lambda t: {}, init, 12 * k * d, {g[0]: d for g in gates})]
    ch = [t for t in range(1, len(v)) if v[t] != v[t - 1]]
    assert ch[2] - ch[0] == 2 * k * d and ch[3] - ch[1] == 2 * k * d
    # an even ring of inverters is a memory (two stable states)
even = [(f"n{i}", "NOT", [f"n{(i - 1) % 4}"]) for i in range(4)]
assert len(sq.fixed_points(even, {})) == 2 and len(sq.fixed_points([(f"n{i}", "NOT", [f"n{(i - 1) % 3}"]) for i in range(3)], {})) == 0
has("the period is $2k\\,t_{pd}$")

# ── NOR and NAND latches ──────────────────────────────────────────────────
NOR, NAND = sq.sr_latch("NOR"), sq.sr_latch("NAND")
for s_, r_ in product((0, 1), repeat=2):
    fn = sorted((f["Q"], f["Qb"]) for f in sq.fixed_points(NOR, {"S": s_, "R": r_}))
    fa = sorted((f["Q"], f["Qb"]) for f in sq.fixed_points(NAND, {"S": s_, "R": r_}))
    assert fn == {(0, 0): [(0, 1), (1, 0)], (0, 1): [(0, 1)], (1, 0): [(1, 0)], (1, 1): [(0, 0)]}[(s_, r_)]
    assert fa == {(1, 1): [(0, 1), (1, 0)], (1, 0): [(0, 1)], (0, 1): [(1, 0)], (0, 0): [(1, 1)]}[(s_, r_)]
# characteristic equation Q⁺ = S + R̄Q (SR = 0) agrees with the latch's settled state
for s_, r_, q in product((0, 1), repeat=3):
    if s_ and r_:
        continue
    _, summ = sq.latch_run("NOR", [(0, 1) if q == 0 else (1, 0), (0, 0), (s_, r_)], hold=6)
    assert summ[-1][2] == (s_ | ((1 - r_) & q)) == sq.ff_next("SR", q, S=s_, R=r_)
# the scene's sequences and captions
hist, summ = sq.latch_run("NOR", [(1, 0), (0, 0), (0, 1), (0, 0), (1, 1), (0, 0)], hold=8)
assert summ[:5] == [(1, 0, 1, 0), (0, 0, 1, 0), (0, 1, 0, 1), (0, 0, 0, 1), (1, 1, 0, 0)] and summ[5][2] == "osc"
assert [(r["Q"], r["Qb"]) for r in hist[40:44]] == [(0, 0), (1, 1), (0, 0), (1, 1)]
# release race: equal delays oscillate even with inertial gates; unequal: the faster gate's output → 1
assert sq.latch_run("NOR", [(1, 1), (0, 0)], hold=12, inertial=True)[1][1][2] == "osc"
assert sq.latch_run("NOR", [(1, 1), (0, 0)], hold=12, delay={"Q": 1, "Qb": 2}, inertial=True)[1][1][2:] == (1, 0)
assert sq.latch_run("NOR", [(1, 1), (0, 0)], hold=12, delay={"Q": 2, "Qb": 1}, inertial=True)[1][1][2:] == (0, 1)
# releasing only one input is harmless
assert sq.latch_run("NOR", [(1, 1), (1, 0)], hold=8)[1][1] == (1, 0, 1, 0)
assert sq.latch_run("NOR", [(1, 1), (0, 1)], hold=8)[1][1] == (0, 1, 0, 1)
has("with delays 1 and 2 (inertial) they settle at\n10, and with 2 and 1 at 01")
# NAND worked example: gate by gate from Q Q̄ = 01 with S̄R̄ = 01, then 11
h, s2 = sq.latch_run("NAND", [(0, 1), (1, 1)], q0=(0, 1), hold=6)
assert [(r["Q"], r["Qb"]) for r in h[:3]] == [(0, 1), (1, 1), (1, 0)] and s2[1] == (1, 1, 1, 0)
# NOR worked example
_, s3 = sq.latch_run("NOR", [(1, 0), (0, 0), (0, 1), (0, 0)], hold=6)
assert [x[2] for x in s3] == [1, 1, 0, 0]

# ── PYQs ───────────────────────────────────────────────────────────────────
assert bank["cse-1991-b-5-a"]["answer"].startswith("00 → 0; 01 → Q (unchanged); 10 → Q (unchanged); 11 → 1")
assert bl.key_letters(bank["cse-1993-ii-a-6-2"]["answer"]) == ["B"]          # a + b = 1
# options: A a·b = 1, B a + b = 1, C ā + b̄ = 0 (= ab), D ¬(ab) = 1, E ¬(a + b) = 1
conds = {"A": lambda a, b: a & b, "B": lambda a, b: a | b, "C": lambda a, b: a & b, "D": lambda a, b: 1 - (a & b), "E": lambda a, b: 1 - (a | b)}
ok = [k for k, c in conds.items() if all(bool(c(a, b)) == bool(stable(NORF, {"a": a, "b": b})) for a, b in product((0, 1), repeat=2))]
assert ok == ["B"]
opts99 = {"A": (0, 0, 1), "B": (0, 1, 1), "C": (1, 0, 1), "D": (1, 1, 1)}
assert [k for k, v in opts99.items() if 1 in stable(CHAIN, dict(zip("ABC", v)), "Y")] == bl.key_letters(bank["cse-1999-a-33"]["answer"]) == ["D"]
assert sq.fixed_points(NAND, {"S": 0, "R": 0}) == [{"Q": 1, "Qb": 1}] and bank["cse-2004-cs-18"]["answer"] == "C"
seq07 = {"A": [(1, 1), (0, 0)], "B": [(0, 1), (1, 0)], "C": [(1, 0), (0, 1)], "D": [(0, 0), (1, 1)]}
osc = [k for k, sq_ in seq07.items() if sq.latch_run("NAND", sq_, hold=10)[1][1][2] == "osc"]
assert osc == ["D"] == [bank["it-2007-cs-7"]["answer"]]
MUXL = [("Q", "MUX", ["S", "Q", "D"])]
for s_, d in product((0, 1), repeat=2):
    assert stable(MUXL, {"S": s_, "D": d}) == ([d] if s_ else [0, 1])
assert bank["cse-2023-cs-11"]["answer"] == "B"
has("(GATE 2004, option C)", "(IT 2007, option D)", "(GATE 2023, option B)")

# ── D latch and gated SR ──────────────────────────────────────────────────
for c, d, q in product((0, 1), repeat=3):
    s_, r_ = c & d, c & (1 - d)
    assert sq.ff_next("SR", q, S=s_, R=r_) == (c & d) | ((1 - c) & q)
# gated SR from four NANDs with S = R = 1, C = 1 → inner forbidden 00 → Q = Q̄ = 1; C falls → race
G4 = [("a", "NAND", ["S", "C"]), ("b", "NAND", ["R", "C"]), ("Q", "NAND", ["a", "Qb"]), ("Qb", "NAND", ["b", "Q"])]
assert [(f["Q"], f["Qb"]) for f in sq.fixed_points(G4, {"S": 1, "R": 1, "C": 1})] == [(1, 1)]
hh = sq.async_sim(G4, lambda t: {"S": 1, "R": 1, "C": 1 if t < 10 else 0}, {"a": 0, "b": 0, "Q": 1, "Qb": 1}, 40)
assert len({(r["Q"], r["Qb"]) for r in hh[-6:]}) == 2  # still racing
# worked examples
def d_latch(C, D, q=0):
    out = []
    for c, d in zip(C, D):
        q = d if c else q
        out.append(q)
    return out
assert d_latch([1, 0, 1, 0], [1, 0, 0, 1]) == [1, 1, 0, 0]
# MUX latch scene: follows D one MUX delay later while S = 1, holds while S = 0
Sv = [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0]
Dv = [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0]
Qv = [r["Q"] for r in sq.async_sim(MUXL, lambda t: {"S": Sv[t], "D": Dv[t]}, {"Q": 0}, len(Sv) - 1)]
assert all(Qv[t] == (Dv[t - 1] if Sv[t - 1] else Qv[t - 1]) for t in range(1, len(Sv)))

# Worked example: a D latch with D = Q̄ (a T latch) toggles ⌈t_w / t_pd⌉ times (1 tick = 5 ns, t_pd = 2 ticks).
for width, changes, final in ((5, 3, 1), (3, 2, 0)):
    clk = [0] + [1] * width + [0] * 8
    r = sq.scope("T", "latch", clk, {"T": [1] * len(clk)}, q0=0, tpd=2)
    ch = [t for t in range(1, len(clk)) if r["Q"][t] != r["Q"][t - 1]]
    assert len(ch) == changes == -(-width // 2) and r["Q"][-1] == final
has("**3** changes, $Q$ = 1, 0, 1", "With a 15 ns pulse there would be 2 changes and $Q = 0$",
    "$T = 6$ ns, $f = 1/6\\ \\text{ns} \\approx 166.7$ MHz")
assert round(1000 / 6, 1) == 166.7

# ── Practice ───────────────────────────────────────────────────────────────
q = P["nx-dl-06-01-q01"]
NANDF = [("Y", "NAND", ["A", "Y"])]
assert stable(NANDF, {"A": 0}, "Y") == [1] and stable(NANDF, {"A": 1}, "Y") == []
bl.assert_mcq(q, "B")
_, s4 = sq.latch_run("NOR", [(0, 1), (1, 0), (0, 0), (0, 1), (0, 0)], hold=8)
assert s4[-1] == (0, 0, 0, 1)
bl.assert_mcq(P["nx-dl-06-01-q02"], "C")
assert sq.fixed_points(NOR, {"S": 1, "R": 1}) == [{"Q": 0, "Qb": 0}]
bl.assert_mcq(P["nx-dl-06-01-q03"], "D")
loops = {"A": [("Q", "OR", ["x", "Q"])], "B": [("Q", "AND", ["~x", "Q"])], "C": [("Q", "XOR", ["x", "Q"])], "D": [("Q", "NAND", ["x", "Q"])]}
bl.assert_msq(P["nx-dl-06-01-q04"], [k for k, g in loops.items() if any(stable(g, {"x": x}) == [0, 1] for x in (0, 1))])
ch5 = {"A": ("NOR", [(1, 1), (0, 0)]), "B": ("NOR", [(1, 0), (0, 1)]), "C": ("NAND", [(0, 0), (1, 1)]), "D": ("NAND", [(1, 1), (0, 0)])}
bl.assert_msq(P["nx-dl-06-01-q05"], [k for k, (kind, sqn) in ch5.items() if sq.latch_run(kind, sqn, hold=10)[1][1][2] == "osc"])
got = d_latch([1, 1, 0, 0, 1, 0], [1, 0, 1, 1, 1, 0])
assert got == [1, 0, 0, 0, 1, 1]
assert bl.option_values(P["nx-dl-06-01-q06"])["B"] == ", ".join(map(str, got))
bl.assert_mcq(P["nx-dl-06-01-q06"], "B")
bl.assert_nat(P["nx-dl-06-01-q07"], sum(len(stable(MAJ, {"a": a, "b": b})) for a, b in product((0, 1), repeat=2)))
bl.assert_msq(P["nx-dl-06-01-q08"], ["A", "B", "D"])
gates5 = [(f"n{i}", "NOT", [f"n{(i - 1) % 5}"]) for i in range(5)]
v = [r["n0"] for r in sq.async_sim(gates5, lambda t: {}, {f"n{i}": i % 2 for i in range(5)}, 120, {g[0]: 2 for g in gates5})]
chg = [t for t in range(1, len(v)) if v[t] != v[t - 1]]
bl.assert_nat(P["nx-dl-06-01-q09"], 1000 // (chg[2] - chg[0]))  # period in ns → MHz
# q10: D on I0, Y on I1 is transparent while S = 0
MUXA = [("Y", "MUX", ["S", "D", "Y"])]
for s_, d in product((0, 1), repeat=2):
    assert stable(MUXA, {"S": s_, "D": d}, "Y") == ([d] if s_ == 0 else [0, 1])
bl.assert_mcq(P["nx-dl-06-01-q10"], "A")
assert len([k for k in P if k.startswith("nx-dl-06-01-")]) == 10
print("l6_01_latches: loop theorem (all four f, static and simulated), worked loops, ring oscillators, NOR/NAND latch "
      "fixed points and gate-delay traces, release race (equal, unequal, inertial), D/gated/MUX latches, "
      "6 PYQ keys and 10 practice answers OK")
