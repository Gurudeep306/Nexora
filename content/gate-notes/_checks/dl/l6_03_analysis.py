"""Checks for dl/06-sequential-circuits/03-sequential-analysis: every state table, trace, reachable
set, cycle, output value and diagram-to-equation answer of the lesson is a seqlib.Sync simulation
(step, graph, trace, reachable, cycle_from, autonomous_cycles); the synchronous-discipline claim is
checked with seqlib.sample. The 13 PYQ keys, every worked example, the viz captions' numbers and
every practice answer, MSQ option and distractor are recomputed."""
import pathlib
import sys
from itertools import product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import seqlib as sq  # noqa: E402

L = sq.lesson_text("03-sequential-analysis.md")
has = lambda *s: bl.must_contain(L, *s)  # noqa: E731
bank = bl.bank()
P = sq.practice()
B = sq.bstr
n = lambda v: 1 - v  # noqa: E731


def table(m):
    """{state string: next string} (autonomous) or {state: {x: next}}."""
    g = m.graph()
    if m.inputs:
        return {B(s): {x[0] if len(x) == 1 else x: B(t) for x, t in d.items()} for s, d in g.items()}
    return {B(s): B(d[None]) for s, d in g.items()}


def tr(m, s0, k=None, xs=None):
    return [B(s) for s in m.trace(s0, k, xs)]


def seq_update(m, s0, k, order=None):
    """The update-order mistake: flip-flops updated one by one (in `order`, default top to bottom), later
    ones seeing earlier new values."""
    s, out = list(s0), [B(s0)]
    for _ in range(k):
        for i in (order or range(len(m.ffs))):
            nm, kind, fns = m.ffs[i]
            e = m.env(tuple(s))
            s[i] = sq.ff_next(kind, s[i], **{p: f(e) & 1 for p, f in fns.items()})
        out.append(B(s))
    return out


def all_rows_ok(m, fn):
    return all(m.step(s, x) == fn(s, x) for s in m.states() for x in m.xs())


# ── Synchronous discipline (sanity check of the proof) ────────────────────
glitchy = [(None, 0), (6, 1), (9, 0), (12, 1)]
assert sq.sample([20], glitchy, tsu=3) == [(1, False)]
assert sq.sample([20], [(None, 0), (6, 1), (9, 0), (18, 1)], tsu=3) == [(1, True)]
has("$t_{su} = 3$ ns and an input that glitches at 6 ns", "move the last\nchange to 18 ns and it reports a setup violation")

# ── 1991: key B only ───────────────────────────────────────────────────────
assert bl.key_letters(bank["cse-1991-a-3-ii"]["answer"]) == ["B"]
has("Key: **only B**", "a spike there creates a false edge in every flip-flop at once")

# ── State equations: JK with J = x, K = B; special JK wirings ─────────────
mjk = sq.Sync([("A", "JK", {"J": lambda e: e["x"], "K": lambda e: e["B"]}),
               ("B", "JK", {"J": lambda e: n(e["A"]), "K": lambda e: e["x"]})], inputs=("x",))
assert all_rows_ok(mjk, lambda s, x: ((x[0] & n(s[0])) | (n(s[1]) & s[0]), (n(s[0]) & n(s[1])) | (n(x[0]) & s[1])))
for q, g in product((0, 1), repeat=2):
    assert sq.ff_next("JK", q, J=g, K=g) == g ^ q and sq.ff_next("JK", q, J=g, K=1 - g) == g
    assert sq.ff_next("JK", q, J=g, K=1) == g & (1 - q)
assert all(sq.ff_next("T", q, T=1 - q) == 1 for q in (0, 1))  # T = Q̄ sets once
assert all(sq.ff_next("JK", q, J=1 - q, K=1 - q) == 1 for q in (0, 1))
has("$Q^+ = \\overline{Q} \\oplus Q = 1$: it sets once", "agrees with the formula in all 8 rows")
assert mjk.step((1, 0), (1,))[0] == 1 and mjk.step((1, 1), (0,))[0] == 0

# ── PYQ 2011 (circuit-to-state-table) ─────────────────────────────────────
m11 = sq.Sync([("P", "D", {"D": lambda e: e["R"]}), ("Q", "D", {"D": lambda e: n(e["P"] | e["R"])}),
               ("R", "D", {"D": lambda e: e["Q"] & n(e["R"])})])
t11 = table(m11)
assert t11 == {"000": "010", "001": "100", "010": "011", "011": "100", "100": "000", "101": "100", "110": "001", "111": "100"}
has("000 → 010, 001 → 100, 010 → 011, 011 → 100, 100 → 000, 101 → 100, 110 → 001, 111 → 100")
opts = {"A": "000", "B": "001", "C": "010", "D": "011"}
assert [k for k, v in opts.items() if v == t11["010"]] == ["D"] == bl.key_letters(bank["cse-2011-cs-50"]["answer"])
has("$PQR = 011$ (GATE 2011, option D)")
# distractor 001: Q⁺ computed with the new R (R⁺ = 1, NOR = 0) while P⁺ still takes the old R = 0
assert (0, n(0 | 1), 1) == (0, 0, 1)
has("001 comes from computing $Q^+$ with the new $R = 1$ (NOR = 0) while $P^+$ still takes the old $R = 0$")
# the loop shape: 001, 101, 111 enter the cycle in one step, 110 in two (via 001); nothing leaves it
pre2011 = {B(x): [B(y) for y in sq.cycle_from(m11.step, x)[0]] for x in m11.states()}
assert {k: len(v) for k, v in pre2011.items() if v} == {"001": 1, "101": 1, "111": 1, "110": 2} and pre2011["110"] == ["110", "001"]
has("001, 101 and 111 in one step, 110 in two (via 001). None leads back out.")
pre, cyc = sq.cycle_from(m11.step, (0, 0, 0))
assert pre == [] and [B(x) for x in cyc] == ["000", "010", "011", "100"]
assert {"A": 3, "B": 4, "C": 5, "D": 6}["B"] == len(cyc) and bl.key_letters(bank["cse-2011-cs-51"]["answer"]) == ["B"]
has("4 states (GATE 2011, option B)", "000 → 010 → 011 → 100 → 000.")
p2, c2 = sq.cycle_from(m11.step, (1, 1, 0))
assert [B(x) for x in p2] == ["110", "001"] and set(c2) == set(cyc)
assert sq.self_starting(m11.step, m11.states(), cyc)
has("from 110 it gives tail 110, 001 and the same cycle ($2 + 4 = 6$)")

# ── PYQ 2005-64: D0 = Q̄0, D1 = Q0 ⊕ Q̄1, state Q0Q1 ─────────────────────────
m05 = sq.Sync([("Q0", "D", {"D": lambda e: n(e["Q0"])}), ("Q1", "D", {"D": lambda e: e["Q0"] ^ n(e["Q1"])})])
assert tr(m05, (0, 0), 4) == ["00", "11", "01", "10", "00"]
o05 = {"A": ["00", "11", "01"], "B": ["00", "11"], "C": ["00", "10", "01", "11"], "D": ["00", "11", "01", "10"]}
assert [k for k, v in o05.items() if v == tr(m05, (0, 0), 4)[:-1]] == ["D"] == [bank["cse-2005-cs-64"]["answer"]]
has("00 → 11 → 01 → 10 (→ 00), GATE 2005 option D")

# ── PYQ 1993: D_A = ĀB + ĀP̄, D_B = PB̄ + P̄A ────────────────────────────────
m93 = sq.Sync([("A", "D", {"D": lambda e: (n(e["A"]) & e["B"]) | (n(e["A"]) & n(e["P"]))}),
               ("B", "D", {"D": lambda e: (e["P"] & n(e["B"])) | (n(e["P"]) & e["A"])})], inputs=("P",))
t93 = table(m93)
key93 = "00,0→10; 00,1→01; 01,0→10; 01,1→10; 10,0→01; 10,1→01; 11,0→01; 11,1→00"
for part in key93.split("; "):
    s, rest = part.split(",")
    p, nx = rest.split("→")
    assert t93[s][int(p)] == nx
assert key93 in bank["cse-1993-ii-c-19"]["answer"]
for s in t93:
    has(f"| {s} | {t93[s][0]} | {t93[s][1]} |")
# the NAND-of-NANDs equals the AND-OR form
for a, b, p in product((0, 1), repeat=3):
    nand = lambda *v: n(int(all(v)))  # noqa: E731
    assert nand(nand(b, n(a)), nand(n(a), n(p))) == (n(a) & b) | (n(a) & n(p))
    assert nand(nand(p, n(b)), nand(n(p), a)) == (p & n(b)) | (n(p) & a)

# ── JK example table and input trace ──────────────────────────────────────
tjk = table(mjk)
assert tjk == {"00": {0: "01", 1: "11"}, "01": {0: "01", 1: "10"}, "10": {0: "10", 1: "10"}, "11": {0: "01", 1: "00"}}
mjkz = sq.Sync(mjk.ffs, outs={"z": lambda e: e["A"] & n(e["B"])}, inputs=("x",))
zjk = {B(s): mjkz.output(s)["z"] for s in mjkz.states()}
assert zjk == {"00": 0, "01": 0, "10": 1, "11": 0} and table(mjkz) == tjk
for s in tjk:
    has(f"| {s} | {tjk[s][0]} | {tjk[s][1]} | {zjk[s]} |")
assert all(mjkz.step((1, 0), (x,)) == (1, 0) for x in (0, 1))  # the trap state, where z = 1
stjk = mjkz.trace((0, 0), xs=[(1,), (0,), (1,), (1,)])
assert [B(x) for x in stjk] == ["00", "11", "01", "10", "10"]
assert [mjkz.output(x)["z"] for x in stjk[:4]] == [0, 0, 0, 1] and [mjkz.output(x)["z"] for x in stjk[1:5]] == [0, 0, 1, 1]
has("States after the clocks: 11, 01, 10, 10.", "Output during periods 1 to 4: **0, 0, 0, 1**", "gets 0, 0, 1, 1, one period early",
    "States during periods 1, 2, 3, 4: 00 (the initial state), 11, 01, 10.")

# ── Edge case: J = K = Ā on A, J = K = A on B ─────────────────────────────
me = sq.Sync([("A", "JK", {"J": lambda e: n(e["A"]), "K": lambda e: n(e["A"])}), ("B", "JK", {"J": lambda e: e["A"], "K": lambda e: e["A"]})])
assert tr(me, (0, 0), 4) == ["00", "10", "11", "10", "11"]
has("00 → 10 → 11 → 10 → 11 → …")

# ── Two D flip-flops and the update-order mistake ─────────────────────────
m2d = sq.Sync([("A", "D", {"D": lambda e: n(e["B"])}), ("B", "D", {"D": lambda e: e["A"]})])
assert tr(m2d, (0, 0), 4) == ["00", "10", "11", "01", "00"]
assert seq_update(m2d, (0, 0), 2) == ["00", "11", "00"]
has("Correct: 00, 10, 11, 01, 00", "the whole wrong trace\n00 → 11 → 00 has period 2 instead of 4")

# ── PYQ 1994 ──────────────────────────────────────────────────────────────
m94 = sq.Sync([("Q2", "JK", {"J": lambda e: n(e["Q0"]), "K": lambda e: 1}), ("Q1", "D", {"D": lambda e: e["Q2"]}),
               ("Q0", "T", {"T": lambda e: e["Q1"]})])
t94 = tr(m94, (0, 0, 0), 5)
assert t94 == ["000", "100", "010", "101", "011", "000"] and "011" in bank["cse-1994-b-34"]["answer"]
m94d = sq.Sync([m94.ffs[0], m94.ffs[1], ("Q0", "D", {"D": lambda e: e["Q1"]})])
assert tr(m94d, (0, 0, 0), 4)[-1] == "010"
has("After four pulses $Q_2Q_1Q_0 = 011$ (GATE 1994)", "gets 010 after four\npulses")

# ── PYQ 2017 ──────────────────────────────────────────────────────────────
m17 = sq.Sync([("Q1", "T", {"T": lambda e: e["Q0"]}), ("Q0", "D", {"D": lambda e: e["Q1"]})])
t17 = tr(m17, (1, 1), 4)
assert t17 == ["11", "01", "10", "11", "01"]
o17 = {"A": ("11", "00"), "B": ("11", "01"), "C": ("00", "11"), "D": ("01", "01")}
assert [k for k, v in o17.items() if v == (t17[3], t17[4])] == ["B"] == [bank["cse-2017-1-cs-33"]["answer"]]
m17d = sq.Sync([("Q1", "D", {"D": lambda e: e["Q0"]}), ("Q0", "D", {"D": lambda e: e["Q1"]})])
assert set(tr(m17d, (1, 1), 4)) == {"11"} and seq_update(m17, (1, 1), 1)[1] == "00"
# the update-order mistake in either order collapses into the 00 self-loop; neither matches an option
w17 = {o: seq_update(m17, (1, 1), 4, order=o) for o in ((0, 1), (1, 0))}
assert w17[(0, 1)][1:] == ["00"] * 4 and w17[(1, 0)][1:] == ["01", "00", "00", "00"]
assert all((w[3], w[4]) not in o17.values() for w in w17.values()) and table(m17)["00"] == "00"
assert (t17[3], t17[4]) != o17["C"] and "00" not in t17
has("00 for ever after, because (0, 0) is a self-loop. Neither mistake matches any option.")
has("After the 3rd cycle 11, after the 4th 01 (GATE 2017, option B)")

# ── PYQ 2015 ──────────────────────────────────────────────────────────────
m15 = sq.Sync([("D", "D", {"D": lambda e: e["J"]}), ("J", "JK", {"J": lambda e: e["D"], "K": lambda e: e["D"]})])
t15 = m15.trace((1, 0), 8)
out15 = "".join(str(s[1]) for s in t15)
assert out15 == "011011011"
o15 = {"A": "0110110", "B": "0100100", "C": "011101110", "D": "011001100"}
assert [k for k, v in o15.items() if out15.startswith(v)] == ["A"] == [bank["cse-2015-1-cs-37"]["answer"]]
assert table(m15)["00"] == "00"
# wrong: JK sees the D flip-flop's new output (D updated first)
assert set(s[1] for s in seq_update(m15, (1, 0), 4)) == {"0"}
w15 = {o: "".join(x[1] for x in seq_update(m15, (1, 0), 8, order=o)) for o in ((0, 1), (1, 0))}
assert w15 == {(0, 1): "000000000", (1, 0): "010000000"} and not any(w.startswith(v) for w in w15.values() for v in o15.values())
has("In GATE 2015 and 2017 the mistaken trace collapses into the\nall-zero self-loop (00, 00, … in 2017; 000… in 2015), which matches no option.")
has("0110110… (GATE 2015, option A)", "(1, 0) → ($0$, $1 \\oplus 0 = 1$) **(0, 1)**")

# ── PYQ 1996 ──────────────────────────────────────────────────────────────
m96 = sq.Sync([("Q1", "D", {"D": lambda e: e["Q2"] ^ e["Q3"]}), ("Q2", "D", {"D": lambda e: e["Q1"]}), ("Q3", "D", {"D": lambda e: e["Q2"]})])
nx96 = {sq.val(s): sq.val(m96.step(s)) for s in m96.states()}
assert nx96 == {0: 0, 1: 4, 2: 5, 3: 1, 4: 2, 5: 6, 6: 7, 7: 3}
for k, v in nx96.items():
    has(f"$S_{k}$ ({B(sq.bits(k, 3))}) → {B(sq.bits(v, 3))} = $S_{v}$")
cyc96 = [sq.val(x) for x in sq.cycle_from(m96.step, (0, 0, 1))[1]]
assert cyc96 == [1, 4, 2, 5, 6, 7, 3]
assert "S1 → S4 → S2 → S5 → S6 → S7 → S3 → S1" in bank["cse-1996-b-72"]["answer"]
reach96 = sorted(sq.val(x) for x in m96.reachable((1, 0, 0)))
assert [k for k in range(8) if k not in reach96] == [0] and bank["cse-1996-b-73"]["answer"] == "{S0}"
assert sq.lfsr_step((1, 0, 0), [1, 2]) == m96.step((1, 0, 0))  # the lab's 3-bit maximal-length LFSR is this circuit
assert all(sq.lfsr_step(s, [1, 2]) == m96.step(s) for s in m96.states())
has("Unreachable from $S_4$: $\\{S_0\\}$ (GATE 1996, Q73)")

# ── PYQ 2023 ──────────────────────────────────────────────────────────────
m23 = sq.Sync([("Q1", "T", {"T": lambda e: n(e["Q3"])}), ("Q2", "D", {"D": lambda e: e["Q1"]}), ("Q3", "T", {"T": lambda e: e["Q2"]})])
t23 = tr(m23, (0, 1, 1), 7)
assert t23 == ["011", "000", "100", "010", "101", "111", "110", "011"]
has("011 → 000 → 100 → 010 → 101 → 111 → 110 → 011")
r23 = {B(x) for x in m23.reachable((0, 1, 1))}
o23 = {"A": "001", "B": "100", "C": "101", "D": "111"}
assert [k for k, v in o23.items() if v not in r23] == ["A"] == [bank["cse-2023-cs-33"]["answer"]]
assert table(m23)["001"] == "001" and [t23.index(o23[k]) for k in "BCD"] == [2, 4, 5]
has("$(0, 0, 1)$ (GATE 2023, option A)", "at clocks 2, 4 and 5")

# ── Cycle theorem over every PYQ circuit, every start ─────────────────────
for m in (m11, m05, m94, m17, m15, m96, m23, me, m2d):
    N = 2 ** len(m.names)
    for s in m.states():
        pre, cyc = sq.cycle_from(m.step, s)
        assert len(pre) + len(cyc) <= N and len(set(tr(m, s, N + 3))) == len(pre) + len(cyc)

# ── Two separate cycles (3-bit twisted ring) ──────────────────────────────
mj = sq.Sync([("A", "D", {"D": lambda e: n(e["C"])}), ("B", "D", {"D": lambda e: e["A"]}), ("C", "D", {"D": lambda e: e["B"]})])
assert tr(mj, (0, 0, 0), 6) == ["000", "100", "110", "111", "011", "001", "000"] and tr(mj, (0, 1, 0), 2) == ["010", "101", "010"]
assert sorted(len(c) for c in sq.autonomous_cycles(mj.step, mj.states())) == [2, 6]
has("6 states from 000, 2 states from 010")

# ── IT 2005 ──────────────────────────────────────────────────────────────
mi5 = sq.Sync([("Q1", "D", {"D": lambda e: e["A"] ^ e["B"]}), ("Q2", "D", {"D": lambda e: n(e["Q1"]) & e["C"]})],
              outs={"z": lambda e: e["Q1"] & e["Q2"]}, inputs=("A", "B", "C"))
oi5 = {"A": [(0, 0, 0), (1, 0, 1), (1, 1, 1)], "B": [(1, 0, 1), (1, 1, 0), (1, 1, 1)],
       "C": [(0, 1, 1), (1, 0, 1), (1, 1, 1)], "D": [(0, 0, 1), (1, 1, 0), (1, 1, 1)]}
during3 = {k: {mi5.output(mi5.trace(s0, xs=xs)[2])["z"] for s0 in mi5.states()} for k, xs in oi5.items()}
after3 = {k: {mi5.output(mi5.trace(s0, xs=xs)[3])["z"] for s0 in mi5.states()} for k, xs in oi5.items()}
assert [k for k, v in during3.items() if v == {1}] == ["A"] == [bank["it-2005-cs-43"]["answer"]]
assert all(v == {0} for k, v in during3.items() if k != "A") and all(v == {0} for v in after3.values())
for k, xs in oi5.items():  # the closed form z(3) = (A2 ⊕ B2)·¬(A1 ⊕ B1)·C2
    (a1, b1, _), (a2, b2, c2), _ = xs
    assert during3[k] == {(a2 ^ b2) & n(a1 ^ b1) & c2}
has("Option A (GATE IT 2005), reading the output **during** cycle 3")

# ── IT 2006 ──────────────────────────────────────────────────────────────
def diag06(s, x, y):
    return x if s == 1 else n(y)


o06 = {"A": lambda s, x, y: (n(s) & n(y)) | (s & x), "B": lambda s, x, y: (s & x & n(y)) | (n(s) & y & n(x)),
       "C": lambda s, x, y: x & n(y), "D": lambda s, x, y: (n(s) & y) | (s & n(x))}
good = [k for k, f in o06.items() if all(f(s, x, y) == diag06(s, x, y) for s, x, y in product((0, 1), repeat=3))]
assert good == ["A"] == [bank["it-2006-cs-37"]["answer"]]
has("$S^+ = S'y' + Sx$ (GATE IT 2006, option A)")

# ── Up/down counter from its diagram, D and JK ────────────────────────────
up = lambda v: (v + 1) % 4  # noqa: E731
dn = lambda v: (v - 1) % 4  # noqa: E731
mud = sq.Sync([("A", "D", {"D": lambda e: e["A"] ^ e["B"] ^ e["x"]}), ("B", "D", {"D": lambda e: n(e["B"])})], inputs=("x",))
mudjk = sq.Sync([("A", "JK", {"J": lambda e: e["B"] ^ e["x"], "K": lambda e: e["B"] ^ e["x"]}), ("B", "JK", {"J": lambda e: 1, "K": lambda e: 1})], inputs=("x",))
for v, x in product(range(4), (0, 1)):
    want = sq.bits(dn(v) if x else up(v), 2)
    assert mud.step(sq.bits(v, 2), (x,)) == want == mudjk.step(sq.bits(v, 2), (x,))
for a, b, x in product((0, 1), repeat=3):
    an = a ^ b ^ x
    e = sq.excitation("JK", a, an)
    assert (e["J"] if a == 0 else e["K"]) == b ^ x
has("$D_B = \\overline{B}$ and $D_A = A \\oplus B \\oplus x$", "$J_A = K_A = B \\oplus x$ and $J_B = K_B = 1$")

# ── Missing arc: don't-care ──────────────────────────────────────────────
spec = {(0, 0): 0, (0, 1): 1, (1, 0): 0}
cands = {"i": lambda s, x: x, "ii": lambda s, x: n(s) & x, "iii": lambda s, x: s | x}
assert [k for k, f in cands.items() if all(f(*r) == v for r, v in spec.items())] == ["i", "ii"]
has("(i) and (ii) are both correct; (i) is minimal")

# ── Viz captions' numbers come from the same machines (the generator asserts them too) ─
has("1993 controller", "GATE 1996 circuit ready-made", "Start at 100 ($S_4$)", "(shown as Q1 and Q0) are the right two cells")

# ── Practice ─────────────────────────────────────────────────────────────
p1 = sq.Sync([("A", "D", {"D": lambda e: e["B"] ^ e["C"]}), ("B", "D", {"D": lambda e: n(e["A"]) & e["C"]}),
              ("C", "D", {"D": lambda e: e["A"] | n(e["B"])})])
nx1 = B(p1.step((1, 0, 0)))
o1 = bl.option_values(P["nx-dl-06-03-q01"])
bl.assert_mcq(P["nx-dl-06-03-q01"], [k for k, v in o1.items() if v == nx1][0])
assert o1["A"] == nx1[::-1] and o1["B"] == B((0 ^ 0, 1 & 1, 1 | 1)) and o1["D"] == B((n(0 ^ 0), 0, 1))

p2 = sq.Sync([("A", "T", {"T": lambda e: e["B"]}), ("B", "D", {"D": lambda e: n(e["A"])})])
o2 = bl.option_values(P["nx-dl-06-03-q02"])
bl.assert_mcq(P["nx-dl-06-03-q02"], [k for k, v in o2.items() if v == tr(p2, (0, 0), 5)[-1]][0])
p2d = sq.Sync([("A", "D", {"D": lambda e: e["B"]}), p2.ffs[1]])
assert o2["C"] == tr(p2d, (0, 0), 5)[-1] and o2["D"] == seq_update(p2, (0, 0), 5)[-1] and o2["A"] == tr(p2, (0, 0), 3)[-1]

p3 = sq.Sync([("A", "D", {"D": lambda e: e["B"]}), ("B", "D", {"D": lambda e: e["C"]}), ("C", "D", {"D": lambda e: n(e["A"]) & n(e["B"])})])
r3 = {B(x) for x in p3.reachable((1, 0, 0))}
assert tr(p3, (1, 0, 0), 5) == ["100", "000", "001", "011", "110", "100"]
bl.assert_msq(P["nx-dl-06-03-q03"], [k for k, v in bl.option_values(P["nx-dl-06-03-q03"]).items() if v not in r3])
assert table(p3)["101"] == "010"

p4 = sq.Sync([("A", "D", {"D": lambda e: e["B"] | e["C"]}), ("B", "D", {"D": lambda e: e["A"] & e["C"]}), ("C", "D", {"D": lambda e: n(e["B"])})])
pre4, cyc4 = sq.cycle_from(p4.step, (0, 0, 0))
assert [B(x) for x in pre4] == ["000"] and [B(x) for x in cyc4] == ["001", "101", "111", "110", "100"]
bl.assert_nat(P["nx-dl-06-03-q04"], len(cyc4))
assert {B(x) for x in p4.reachable((0, 0, 0))} == set(B(s) for s in p4.states()) - {"010", "011"}

o5 = {"A": lambda a, b, x: (b & n(a)) | (n(x) & a), "B": lambda a, b, x: b | (x & a), "C": lambda a, b, x: (b & a) | (x & n(a)),
      "D": lambda a, b, x: (b & n(a)) | (x & a)}
good5 = [k for k, f in o5.items() if all(f(a, b, x) == sq.ff_next("JK", a, J=b, K=n(x)) for a, b, x in product((0, 1), repeat=3))]
bl.assert_mcq(P["nx-dl-06-03-q05"], good5[0])
assert len(good5) == 1 and o5["B"](1, 1, 0) == 1 and sq.ff_next("JK", 1, J=1, K=1) == 0

p6 = sq.Sync([("A", "JK", {"J": lambda e: e["B"], "K": lambda e: e["C"]}), ("B", "D", {"D": lambda e: e["A"]}),
              ("C", "T", {"T": lambda e: e["A"] ^ e["B"]})])
loops6 = [B(s) for s in p6.states() if p6.step(s) == s]
assert loops6 == ["000", "001", "110"] and table(p6)["111"] == "011"
bl.assert_nat(P["nx-dl-06-03-q06"], len(loops6))

claims7 = {"A": sq.sample([20], glitchy, tsu=3) == [(1, False)],
           "B": False,  # flip-flops change only at edges: Sync.step is evaluated once per edge
           "C": tr(m2d, (0, 0), 1)[1] != seq_update(m2d, (0, 0), 1)[1] and tr(m2d, (0, 0), 1)[1] == "10",
           "D": False}
bl.assert_msq(P["nx-dl-06-03-q07"], [k for k, v in claims7.items() if v])

p8 = sq.Sync([("Q1", "D", {"D": lambda e: e["x"]}), ("Q2", "D", {"D": lambda e: e["Q1"]})], outs={"z": lambda e: e["Q1"] ^ e["Q2"]}, inputs=("x",))
st8 = p8.trace((0, 0), xs=[(1,), (1,), (0,), (0,)])
during8 = ", ".join(str(p8.output(s)["z"]) for s in st8[:4])
after8 = ", ".join(str(p8.output(s)["z"]) for s in st8[1:5])
o8 = bl.option_values(P["nx-dl-06-03-q08"])
bl.assert_mcq(P["nx-dl-06-03-q08"], [k for k, v in o8.items() if v == during8][0])
assert o8["A"] == during8 and o8["C"] == after8 and o8["D"] == "1, 1, 0, 0"
q1 = q2 = 0
wrong8 = []
for x in (1, 1, 0, 0):  # update-order mistake: Q2 copies the Q1 just written
    wrong8.append(q1 ^ q2)
    q1 = x
    q2 = q1
assert ", ".join(map(str, wrong8)) == o8["B"]

d9 = lambda s, x, y: x if s == 0 else n(y)  # noqa: E731
o9 = {"A": lambda s, x, y: (n(s) & x) | (s & y), "B": lambda s, x, y: x | n(y), "C": lambda s, x, y: (n(s) & x) | (s & n(y)),
      "D": lambda s, x, y: (s & n(x)) | (n(s) & y)}
good9 = [k for k, f in o9.items() if all(f(*r) == d9(*r) for r in product((0, 1), repeat=3))]
assert len(good9) == 1
bl.assert_mcq(P["nx-dl-06-03-q09"], good9[0])

p10 = sq.Sync([("A", "JK", {"J": lambda e: e["B"], "K": lambda e: e["C"]}), ("B", "D", {"D": lambda e: e["C"]}), ("C", "T", {"T": lambda e: e["A"]})])
pre10, cyc10 = sq.cycle_from(p10.step, (0, 0, 1))
assert [B(x) for x in pre10] == ["001", "011", "111"] and [B(x) for x in cyc10] == ["010", "100", "101"]
bl.assert_nat(P["nx-dl-06-03-q10"], len(pre10) + len(cyc10))

keys = [P[f"nx-dl-06-03-q{k:02d}"]["answer"] for k in range(1, 11) if P[f"nx-dl-06-03-q{k:02d}"]["type"] == "MCQ"]
assert set(keys) == set("ABCD") and max(keys.count(c) for c in "ABCD") <= 2
for q in (P[f"nx-dl-06-03-q{k:02d}"] for k in range(1, 11)):
    for b in q["blocks"]:
        assert f"#{b} " in L or f"#{b}}}" in L, (q["id"], b)
print("l6_03_analysis: synchronous discipline, state equations (D, T, JK shortcuts), 9 circuits tabulated and traced, "
      "update-order mistakes, cycle theorem on every start, reachability, output timing, diagram → equation, "
      "13 PYQ keys and 10 practice answers OK")
