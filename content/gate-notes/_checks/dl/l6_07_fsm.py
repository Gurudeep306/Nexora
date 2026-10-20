"""Checks for dl/06-sequential-circuits/07-finite-state-machines: every machine of the lesson is a
seqlib FSM (or a Sync circuit) and every run, output string, Mealy ↔ Moore conversion, detector,
shortest input, encoded state table and input equation is recomputed: FSM.run, to_moore,
minimal_states, detector / detects_ref, shortest, reachable, excitation, minlib minimal SOPs and
Sync simulation of the built circuits. The six PYQ keys and every practice answer, MSQ option and
MCQ distractor are re-derived."""
import itertools
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import minlib as ml  # noqa: E402
import seqlib as sq  # noqa: E402

L = sq.lesson_text("07-finite-state-machines.md")
LW = " ".join(L.split())
has = lambda *s: bl.must_contain(LW, *[" ".join(x.split()) for x in s])  # noqa: E731
bank = bl.bank()
P = sq.practice()


def X(s):
    return [int(c) for c in s]


def S(xs):
    return "".join(map(str, xs))


def strings(nmax, nmin=1):
    for n in range(nmin, nmax + 1):
        yield from (list(t) for t in itertools.product((0, 1), repeat=n))


def mealy_of_moore(m):
    """Theorem part 1: same states, arc output = output of the state entered."""
    return sq.FSM(m.states, m.alphabet, m.delta, {(s, x): m.out[m.delta[(s, x)]] for s in m.states for x in m.alphabet}, False, m.start)


def same_runs(a, b, n=8):
    return all(a.run(xs)["outs"] == b.run(xs)["outs"] for xs in strings(n))


def encoded(fsm, assign, kind, nb, inputs=("x",)):
    """Minimal SOPs of every flip-flop input and of z over (Q_{nb-1} … Q0, x) for a state assignment,
    with unused codes as don't-cares (the lesson's procedure)."""
    vars_ = [f"Q{nb - 1 - i}" for i in range(nb)] + list(inputs)
    n = nb + 1
    used = {assign[s]: s for s in fsm.states}
    res = {}
    for b in range(nb):
        cols = {nm: ([], []) for nm in sq.INPUTS[kind]}
        for m in range(2 ** n):
            bb = sq.bits(m, n)
            st, x = tuple(bb[:-1]), bb[-1]
            if st not in used:
                for nm in cols:
                    cols[nm][1].append(m)
                continue
            nxt = assign[fsm.delta[(used[st], x)]]
            e = sq.excitation(kind, st[b], nxt[b])
            for nm in cols:
                if e[nm] == "x":
                    cols[nm][1].append(m)
                elif e[nm] == 1:
                    cols[nm][0].append(m)
        for nm, (on, dc) in cols.items():
            res[f"{nm}{nb - 1 - b}"] = [s.replace("'", "′") for s in ml.min_sop(on, dc, n, vars_)]
    on, dc = [], []
    for m in range(2 ** n):
        bb = sq.bits(m, n)
        st, x = tuple(bb[:-1]), bb[-1]
        if st not in used:
            dc.append(m)
        elif fsm.o(used[st], x):
            on.append(m)
    res["z"] = [s.replace("'", "′") for s in ml.min_sop(on, dc, n, vars_)]
    return res


# ── The machines of the lesson ─────────────────────────────────────────────
M1 = sq.FSM.from_table({"P": ("P", "Q", 0, 0), "Q": ("R", "Q", 1, 0), "R": ("P", "Q", 0, 1)})
F01 = sq.FSM.from_table({"A": ("B", "A", 0, 1), "B": ("C", "A", 0, 1), "C": ("C", "D", 1, 0), "D": ("C", "A", 1, 0)})
F02 = sq.FSM.from_table({"A": ("A", "B", "00", "01"), "B": ("A", "C", "01", "10"), "C": ("A", "C", "01", "10")})
F05 = sq.FSM.from_table({"Q0": ("Q0", "Q1", 0, 1), "Q1": ("Q1", "Q1", 1, 0)})
F09 = sq.FSM.from_table({(0, 0): ((0, 0), (0, 1), 1, 0), (0, 1): ((1, 0), (0, 0), 0, 1),
                         (1, 0): ((0, 1), (0, 1), 0, 1), (1, 1): ((1, 0), (0, 0), 0, 1)})
F21 = sq.FSM.from_table({0: (0, 1, 0, 0), 1: (0, 1, 0, 1)})
PAR = sq.FSM.from_table({"E": ("E", "O", 1), "O": ("O", "E", 0)}, moore=True)
U = sq.FSM.from_table({"A": ("A", "B", 0, 0), "B": ("A", "B", 0, 0), "C": ("A", "C", 0, 1)})

# ── Mealy and Moore: the equivalence theorem on every machine of the lesson ──
for m in (M1, F01, F05, F21, sq.detector("101"), sq.detector("101", False), sq.detector("111"), sq.detector("1011")):
    mo = m.to_moore()
    assert same_runs(m, mo), m.states
    sz = len({m.out[k] for k in m.out})
    assert len(mo.states) <= len(m.states) * sz
for pat in ("101", "1011", "111", "1101"):
    for ov in (True, False):
        mo = sq.detector(pat, ov, True)
        assert same_runs(mo, mealy_of_moore(mo)) and len(mealy_of_moore(mo).states) == len(mo.states)
has("The 101 detector below has 3 Mealy states and 4 Moore states; the 2001 copy/complement machine has 4 Mealy states and 6 Moore states")
assert len(sq.detector("101").states) == 3 and len(sq.detector("101", moore=True).states) == 4 and len(F01.to_moore().states) == 6

# worked example: M1 on 0110010
r = M1.run(X("0110010"))
assert "".join(r["states"]) == "PPQQRPQR" and S(r["outs"]) == "0001001"
wrong = [M1.o(r["states"][k + 1], b) for k, b in enumerate(X("0110010"))]
assert wrong[3] == 0 and r["outs"][3] == 1  # reading R's row for the fourth input gives 0
has("States P, P, Q, Q, R, P, Q, R and output **0001001**", "(for the fourth input that would be R's row and output 0)")
# its Moore version: P0, Q0, Q1, R1
mo = M1.to_moore()
nm = {s: f"{s[0]}{s[1]}" for s in mo.states}
assert sorted(nm.values()) == ["P0", "Q0", "Q1", "R1"] and nm[mo.start] == "P0"
assert {nm[s]: (nm[mo.delta[(s, 0)]], nm[mo.delta[(s, 1)]], mo.out[s]) for s in mo.states} == {
    "P0": ("P0", "Q0", 0), "Q0": ("R1", "Q0", 0), "Q1": ("R1", "Q0", 1), "R1": ("P0", "Q1", 1)}
rm = mo.run(X("0110010"))
assert [nm[s] for s in rm["states"][1:]] == ["P0", "Q0", "Q0", "R1", "P0", "Q0", "R1"] and rm["first"] == 0 and S(rm["outs"]) == "0001001"
has("States P0 (output 0, the start), Q0 (0), Q1 (1), R1 (1).", "P0: 0 → P0, 1 → Q0. Q0 and Q1 (same arcs as Q): 0 → R1, 1 → Q0. R1: 0 → P0, 1 → Q1.",
    "States after each input: P0, Q0, Q0, R1, P0, Q0, R1, with outputs 0, 0, 0, 1, 0, 0, 1", "**4 Moore states** against 3 Mealy states")
# 2001 machine → Moore: 6 states, minimal, bound 8
mo01 = F01.to_moore()
assert sorted(f"{s}{y}" for s, y in mo01.states) == ["A0", "A1", "B0", "C0", "C1", "D0"] and mo01.minimal_states() == 6
inc = {s: sorted({F01.out[(a, x)] for (a, x), t in F01.delta.items() if t == s}) for s in "ABCD"}
assert inc == {"A": [0, 1], "B": [0], "C": [0, 1], "D": [0]}
has("A0, A1, B0, C0, C1, D0: **6** states", "$|S| \\cdot |Z| = 4 \\times 2 = 8$", "**6** Moore states (minimal), against 4 Mealy states and the bound 8")
# parity Moore machine and the empty input
assert PAR.run([])["first"] == 1 and S(PAR.run(X("1101"))["states"]) == "EOEEO"
rp = PAR.run(X("1101"))
assert str(rp["first"]) + S(rp["outs"]) == "10110" and rp["outs"][-1] == 0
has("Empty input: the output is E's output, **1**", "E → O → E → E → O, outputs 1 (initial), 0, 1, 1, 0", "the full output string is **10110**")

# ── Timing (the viz model): Mealy high in periods 3, 6; Moore in 4, 7 ─────
import _viz_ch6_l07 as vz  # noqa: E402
tm = vz.timing_model()
assert sorted({t // vz.P + 1 for t in range(tm["T"]) if tm["z_me"][t] and t != tm["spike"]}) == [3, 6]
assert sorted({t // vz.P + 1 for t in range(tm["T"]) if tm["z_mo"][t]}) == [4, 7]
has("Watch\nperiods 3, 4, 6, 7 and the spike in period 8")

# ── From words: the 2001 machine ───────────────────────────────────────────
ex_in, ex_out = "10110001001011011", "10110010110100011"
assert S(F01.run(X(ex_in))["outs"]) == ex_out


def copy_complement_ref(xs):
    """Direct reading of the 2001 words: copy until 00, complement until 11, repeat."""
    mode, prev, out = 0, None, []
    for x in xs:
        out.append(x ^ mode)
        if mode == 0 and prev == 0 and x == 0:
            mode, prev = 1, None
        elif mode == 1 and prev == 1 and x == 1:
            mode, prev = 0, None
        else:
            prev = x
    return out


assert all(F01.run(xs)["outs"] == copy_complement_ref(xs) for xs in strings(10))
assert F01.minimal_states() == 4
has("A: 0/0 → B, 1/1 → A; B: 0/0 → C,\n1/1 → A; C: 0/1 → C, 1/0 → D; D: 0/1 → C, 1/0 → A", "Running this machine on the 17 example bits gives exactly the example output")
a59 = bank["cse-2001-b-59-a"]["answer"]
assert "A: 0/0→B, 1/1→A; B: 0/0→C, 1/1→A; C: 0/1→C, 1/0→D; D: 0/1→C, 1/0→A" in a59
assert len(ex_in) == 17 and "101100 | 01001011 | 011" in bank["cse-2001-b-59-a"]["text"].replace("01001011 |", "01001011 |")

# ── Detectors ──────────────────────────────────────────────────────────────
d101, d101n, d101m = sq.detector("101"), sq.detector("101", False), sq.detector("101", moore=True)
assert d101.delta == {(0, 0): 0, (0, 1): 1, (1, 0): 2, (1, 1): 1, (2, 0): 0, (2, 1): 1} and d101.out[(2, 1)] == 1
assert d101n.delta[(2, 1)] == 0 and all(d101n.delta[k] == d101.delta[k] for k in d101.delta if k != (2, 1))
assert S(d101.run(X("10101"))["outs"]) == "00101" and S(d101n.run(X("10101"))["outs"]) == "00100"
has("On 10101 the first gives 00101, the second 00100", "101 on 10101: overlapping 00101, non-overlapping 00100")
# trick-suffix examples for 1011
d1011 = sq.detector("1011")
assert d1011.delta[(3, 0)] == 2 and d1011.delta[(3, 1)] == 1 and d1011.out[(3, 1)] == 1
has("1010 → 010 → **10**, a prefix, so go to\n$S_2$", "1011 → 011 → 11 → **1**, so the next state is $S_1$")
# theorem: k Mealy, k + 1 Moore, minimal; shortest time to a 1 from S_i is k − i
for pat in ("101", "110", "111", "1001", "1011", "0110", "1101", "10110"):
    k = len(pat)
    for ov in (True, False):
        dm, dmo = sq.detector(pat, ov), sq.detector(pat, ov, True)
        assert len(dm.states) == dm.minimal_states() == k and len(dmo.states) == dmo.minimal_states() == k + 1
        for i in range(k):
            assert len(dm.shortest(lambda t, y: y == 1, s0=i)) == k - i
        for xs in strings(9):
            assert dm.run(xs)["outs"] == dmo.run(xs)["outs"] == sq.detects_ref(pat, xs, ov)
# 100: the only border is empty, so overlapping = non-overlapping
assert sq.detector("100").delta == sq.detector("100", False).delta
has("for a pattern like 100, whose\nonly border is empty, they behave identically")
# viz run and examples
assert S(d101.run(X("1101011"))["outs"]) == "0001010"
r = d101.run(X("0101101"))
assert S(r["outs"]) == "0001001" and r["states"][5] == 1
has("Output **0001001**: detections at bits 4 and 7", "after 01011 the machine is in $S_1$, not $S_0$")
assert S(d101.run(X("1010101"))["outs"]) == "0010101" and S(d101n.run(X("1010101"))["outs"]) == "0010001"
has("Overlapping **0010101**, non-overlapping **0010001**")
dm1011 = sq.detector("1011", moore=True)
assert dm1011.delta == {(0, 0): 0, (0, 1): 1, (1, 0): 2, (1, 1): 1, (2, 0): 0, (2, 1): 3, (3, 0): 2, (3, 1): 4, (4, 0): 2, (4, 1): 1}
r = dm1011.run(X("10111011"))
assert r["states"][1:] == [1, 2, 3, 4, 1, 2, 3, 4] and S(r["outs"]) == "00010001" and r["first"] == 0
has("$S_4$: 0 → $S_2$ (10110 → 10), 1 → $S_1$ (10111 → 1).", "5 states; output **00010001**")
d111, d111n = sq.detector("111"), sq.detector("111", False)
assert d111.delta[(2, 1)] == 2 and d111.out[(2, 1)] == 1 and d111n.delta[(2, 1)] == 0
assert S(d111.run(X("11111"))["outs"]) == "00111" and S(d111.run(X("0111101111"))["outs"]) == "0001100011"
assert S(d111n.run(X("11111"))["outs"]) == "00100"
has("11111: outputs 0, 0, 1, 1, 1 = **00111**. 0111101111: **0001100011**.", "bits 4 and 5 are only 11: **00100**")

# ── Serial machines ────────────────────────────────────────────────────────
for v in range(256):
    o = F05.run([(v >> i) & 1 for i in range(8)])["outs"]
    w = sum(b << i for i, b in enumerate(o))
    assert w == (256 - v) % 256 and w != 255 - v and w != (v + 1) % 256 and w != (v - 1) % 256
    if v:
        j = (v & -v).bit_length() - 1
        assert all(((w >> i) & 1) == ((v >> i) & 1) for i in range(j + 1)) and all(((w >> i) & 1) != ((v >> i) & 1) for i in range(j + 1, 8))
r = F05.run([0, 0, 1, 0, 1, 1, 0])
assert r["outs"] == [0, 0, 1, 1, 0, 0, 1] and int("1001100", 2) == 76 == 128 - 52 == 128 - int("0110100", 2)
has("0110100 (52) fed as 0, 0, 1, 0, 1, 1, 0 gives 0, 0, 1, 1, 0, 0, 1, i.e. 1001100 = 76 = 128 − 52",
    "on all 256 eight-bit inputs it never once agrees with $255 - v$")
# serial adder
SA = sq.FSM(["c0", "c1"], [(0, 0), (0, 1), (1, 0), (1, 1)],
            {(c, (a, b)): ("c1" if a + b + (c == "c1") >= 2 else "c0") for c in ("c0", "c1") for a in (0, 1) for b in (0, 1)},
            {(c, (a, b)): (a + b + (c == "c1")) % 2 for c in ("c0", "c1") for a in (0, 1) for b in (0, 1)})
for a in range(16):
    for b in range(16):
        o = SA.run([((a >> i) & 1, (b >> i) & 1) for i in range(5)])["outs"]
        assert sum(x << i for i, x in enumerate(o)) == a + b
r = SA.run([(0, 1), (1, 1), (1, 1), (0, 0), (0, 0)])
assert r["states"] == ["c0", "c0", "c1", "c1", "c0", "c0"] and r["outs"] == [1, 0, 1, 1, 0]
has("states c0, c0, c1, c1, c0, c0 and sum bits 1, 0, 1, 1, 0, i.e. 01101 = 13 = 6 + 7")
# 2021 machine and its option strings
ex21i, ex21o = "00100011000011100", "00000001000001100"


def ref21(xs):
    prev, out = 0, []
    for x in xs:
        out.append(int(x == 1 and prev == 1))
        prev = x
    return out


assert S(F21.run(X(ex21i))["outs"]) == ex21o and all(F21.run(xs)["outs"] == ref21(xs) for xs in strings(10))
opt21 = {"A": (lambda s, b: s | b, lambda s, b: s & b), "B": (lambda s, b: b, lambda s, b: s & b),
         "C": (lambda s, b: b, lambda s, b: s & (1 - b)), "D": (lambda s, b: s | b, lambda s, b: s & (1 - b))}
outs21 = {}
for k, (tf, yf) in opt21.items():
    s_, o = 0, []
    for b in X(ex21i):
        o.append(yf(s_, b))
        s_ = tf(s_, b)
    outs21[k] = S(o)
assert outs21 == {"A": "00000011000011100", "B": ex21o, "C": "00010000100000010", "D": "00011100111100011"}
assert [k for k, v in outs21.items() if v == ex21o] == bl.key_letters(bank["cse-2021-2-cs-28"]["answer"]) == ["B"]
assert ex21i in bank["cse-2021-2-cs-28"]["text"] and ex21o in bank["cse-2021-2-cs-28"]["text"]
has("(A) gives 00000011000011100", "(C) gives\n00010000100000010, and (D) gives 00011100111100011", "**B**: $t = b$, $y = sb$ (GATE 2021)")
# 2002: sum of the present and previous bits
for xs in strings(8):
    prev, o = 0, F02.run(xs)["outs"]
    for x, y in zip(xs, o):
        assert format(prev + x, "02b") == y
        prev = x
assert F02.run(X("0110111"))["outs"] == ["00", "01", "10", "01", "01", "10", "10"]
assert F02.run(X("11"))["outs"][1] == "10" and F02.run(X("10"))["outs"][1] == "01"
assert F02.minimal_states() == 2 and F02.partitions()[-1] == [["A"], ["B", "C"]]
assert bl.key_letters(bank["cse-2002-a-30"]["answer"]) == ["A"]
has("00, 01, 10, 01, 01, 10, 10, each the sum of a bit and its predecessor", "Option **A** (GATE 2002)")
# 2005 key
assert bl.key_letters(bank["cse-2005-cs-63"]["answer"]) == ["B"] and "2's complement" in bl.option_values(bank["cse-2005-cs-63"])["B"]
has("It computes the **2's complement** (GATE 2005, option B)")
# unreachable-arc machine
assert U.reachable() == {"A", "B"} and U.shortest(lambda t, y: y == 1) is None
has("Reachable set {A, B}.")

# ── Shortest inputs ────────────────────────────────────────────────────────
assert [d101.shortest(lambda t, y: y == 1, s0=i) for i in (0, 1, 2)] == [(1, 0, 1), (0, 1), (1,)]
has("From $S_1$: **01** (length 2). From $S_0$: **101** (length 3).")
# 2001: shortest input whose last output differs from its last input
best = None
for xs in strings(5):
    if F01.run(xs)["outs"][-1] != xs[-1]:
        best = len(xs)
        break
assert best == 3 and all(F01.run(xs)["outs"][-1] == xs[-1] for xs in strings(2))
assert S(F01.run(X("000"))["outs"]) == "001" and S(F01.run(X("001"))["outs"]) == "000"
assert F01.shortest(lambda t, y: t in ("C", "D") and y == 1) == (0, 0, 0)
has("Length **3**: 000 (outputs 001) or 001 (outputs 000)")
# 2009
w = F09.shortest(lambda t, y: t == (0, 1) and y == 1)
assert w == (1, 0, 1) and F09.run(list(w))["states"] == [(0, 0), (0, 1), (1, 0), (0, 1)]
assert F09.shortest(lambda t, y: t == (0, 1)) == (1,) and F09.o((0, 0), 1) == 0
into01 = sorted((s, x, F09.o(s, x)) for (s, x), t in F09.delta.items() if t == (0, 1))
assert into01 == [((0, 0), 1, 0), ((1, 0), 0, 0), ((1, 0), 1, 1)]
# the table in the bank, row by row
txt = bank["cse-2009-cs-27"]["text"]
for (a, b_), (x, (na, nb), o) in [((0, 0), (0, (0, 0), 1)), ((0, 1), (0, (1, 0), 0)), ((1, 0), (0, (0, 1), 0)), ((1, 1), (0, (1, 0), 0)),
                                   ((0, 0), (1, (0, 1), 0)), ((0, 1), (1, (0, 0), 1)), ((1, 0), (1, (0, 1), 1)), ((1, 1), (1, (0, 0), 1))]:
    assert f"| {a} | {b_} | {x} | {na} | {nb} | {o} |" in txt
    assert F09.delta[((a, b_), x)] == (na, nb) and F09.o((a, b_), x) == o
assert [l for l, t in bl.option_values(bank["cse-2009-cs-27"]).items() if t == str(len(w))] == bl.key_letters(bank["cse-2009-cs-27"]["answer"]) == ["A"]
has("00 –1→ 01 –0→ 10 –1→ 01 with output 1: input **101**", "Length **3** (GATE 2009, option A)")
# unreachable target 11 and the BFS bound
assert F09.reachable() == {(0, 0), (0, 1), (1, 0)} and F09.shortest(lambda t, y: t == (1, 1)) is None
assert [sq.bstr(F09.delta[(s, x)]) for x in (0, 1) for s in [(0, 0), (0, 1), (1, 0), (1, 1)]] == ["00", "10", "01", "10", "01", "00", "01", "00"]
has("The next-state column contains 00, 10, 01, 10, 01, 00, 01, 00: **no arc enters 11**")
for m in (M1, F01, F09, d1011, dm1011):
    n = len(m.states)
    for t in m.states:
        w_ = m.shortest(lambda s_, y, t=t: s_ == t)
        assert w_ is None or len(w_) <= n - 1 or t == m.start
        for z in set(m.out.values()):
            w2 = m.shortest(lambda s_, y, t=t, z=z: s_ == t and y == z)
            assert w2 is None or len(w2) <= n

# ── From machine to circuit ────────────────────────────────────────────────
binA = {"A": (0, 0), "B": (0, 1), "C": (1, 0), "D": (1, 1)}
eJK = encoded(F01, binA, "JK", 2)
assert eJK == {"J1": ["Q0x′"], "K1": ["Q0x"], "J0": ["Q1′x′ + Q1x"], "K0": ["1"], "z": ["Q1′x + Q1x′"]}
eD = encoded(F01, binA, "D", 2)
assert eD == {"D1": ["Q0x′ + Q1Q0′"], "D0": ["Q1′Q0′x′ + Q1Q0′x"], "z": ["Q1′x + Q1x′"]}
grayA = {"A": (0, 0), "B": (0, 1), "C": (1, 1), "D": (1, 0)}
eG = encoded(F01, grayA, "JK", 2)
assert eG == {"J1": ["Q0x′"], "K1": ["Q0′x"], "J0": ["x′"], "K0": ["x"], "z": ["Q1′x + Q1x′"]}
# with the Gray-style codes Q0 = 'the last bit was 0' after the first input
for xs in strings(8):
    st = F01.run(xs)["states"][-1]
    assert grayA[st][1] == 1 - xs[-1]
# 24 assignments of 4 states to 2 bits, all giving correct circuits
assigns = list(itertools.permutations([(0, 0), (0, 1), (1, 0), (1, 1)]))
assert len(assigns) == 24
has("(24 for 4 states in 2 bits)")
# encoded table rows (worked example)
rows = {(sq.bstr(binA[s]), x): (sq.bstr(binA[F01.delta[(s, x)]]), F01.o(s, x)) for s in "ABCD" for x in (0, 1)}
assert rows == {("00", 0): ("01", 0), ("00", 1): ("00", 1), ("01", 0): ("10", 0), ("01", 1): ("00", 1),
                ("10", 0): ("10", 1), ("10", 1): ("11", 0), ("11", 0): ("10", 1), ("11", 1): ("00", 0)}
has("00: $x = 0$ → 01, 0; $x = 1$ → 00, 1. 01: 0 → 10, 0; 1 → 00, 1. 10: 0 → 10, 1; 1 → 11, 0. 11: 0 → 10, 1; 1 → 00, 0.")
# the built circuits, simulated
nb = lambda v: 1 - v  # noqa: E731
JKC = sq.Sync([("Q1", "JK", {"J": lambda e: e["Q0"] & nb(e["x"]), "K": lambda e: e["Q0"] & e["x"]}),
               ("Q0", "JK", {"J": lambda e: (e["Q1"] & e["x"]) | (nb(e["Q1"]) & nb(e["x"])), "K": lambda e: 1})],
              outs={"z": lambda e: e["x"] ^ e["Q1"]}, inputs=("x",))
DC = sq.Sync([("Q1", "D", {"D": lambda e: (e["Q0"] & nb(e["x"])) | (e["Q1"] & nb(e["Q0"]))}),
              ("Q0", "D", {"D": lambda e: (nb(e["Q1"]) & nb(e["Q0"]) & nb(e["x"])) | (e["Q1"] & nb(e["Q0"]) & e["x"])})],
             outs={"z": lambda e: e["x"] ^ e["Q1"]}, inputs=("x",))
GC = sq.Sync([("Q1", "JK", {"J": lambda e: e["Q0"] & nb(e["x"]), "K": lambda e: nb(e["Q0"]) & e["x"]}),
              ("Q0", "JK", {"J": lambda e: nb(e["x"]), "K": lambda e: e["x"]})], outs={"z": lambda e: e["x"] ^ e["Q1"]}, inputs=("x",))
OH = sq.Sync([("A", "D", {"D": lambda e: (e["A"] | e["B"] | e["D"]) & e["x"]}), ("B", "D", {"D": lambda e: e["A"] & nb(e["x"])}),
              ("C", "D", {"D": lambda e: (e["B"] | e["C"] | e["D"]) & nb(e["x"])}), ("D", "D", {"D": lambda e: e["C"] & e["x"]})],
             outs={"z": lambda e: ((e["A"] | e["B"]) & e["x"]) | ((e["C"] | e["D"]) & nb(e["x"]))}, inputs=("x",))


def circ_run(c, s0, xs):
    st, out = s0, []
    for b in xs:
        out.append(c.output(st, (b,))["z"])
        st = c.step(st, (b,))
    return out


for xs in strings(9):
    want = F01.run(xs)["outs"]
    assert circ_run(JKC, (0, 0), xs) == circ_run(DC, (0, 0), xs) == circ_run(GC, (0, 0), xs) == circ_run(OH, (1, 0, 0, 0), xs) == want
assert S(circ_run(JKC, (0, 0), X(ex_in))) == ex_out
assert OH.step((0, 0, 0, 0), (0,)) == OH.step((0, 0, 0, 0), (1,)) == (0, 0, 0, 0)
# one-hot theorem: from every one-hot code exactly one D is 1, for every machine of the lesson
for m in (F01, M1, d1011, F05):
    idx = {s: i for i, s in enumerate(m.states)}
    for s in m.states:
        for x in m.alphabet:
            ds = [int(any(m.delta[(a, xx)] == t and a == s and xx == x for a in m.states for xx in m.alphabet)) for t in m.states]
            assert sum(ds) == 1 and ds[idx[m.delta[(s, x)]]] == 1
b59 = bank["cse-2001-b-59-b"]["answer"]
for frag in ("J1 = Q0x'", "K1 = Q0x", "J0 = Q1x + Q1'x'", "K0 = 1", "z = x ⊕ Q1", "A=00, B=01, C=10, D=11"):
    assert frag in b59, frag
has("$$J_1 = Q_0\\bar x, \\quad K_1 = Q_0 x, \\quad J_0 = Q_1 x + \\bar Q_1 \\bar x, \\quad K_0 = 1, \\quad z = x \\oplus Q_1.$$",
    "$J_1 = Q_0\\bar x$,\n$K_1 = \\bar Q_0 x$, $J_0 = \\bar x$, $K_0 = x$",
    "$D_1 = Q_0\\bar x + Q_1\\bar Q_0$, $D_0 = \\bar Q_1\\bar Q_0\\bar x + Q_1\\bar Q_0 x$, $z = x \\oplus Q_1$",
    "$D_A = (Q_A + Q_B + Q_D)\\,x$", "$D_B = Q_A\\bar x$", "$D_C = (Q_B + Q_C + Q_D)\\,\\bar x$", "$D_D = Q_C x$",
    "$z = (Q_A + Q_B)\\,x + (Q_C + Q_D)\\,\\bar x$", "The price: 12 of the 16 codes are not\none-hot")
# the 2005 machine with one D flip-flop: D = Q + x, z = Q ⊕ x
C05 = sq.Sync([("Q", "D", {"D": lambda e: e["Q"] | e["x"]})], outs={"z": lambda e: e["Q"] ^ e["x"]}, inputs=("x",))
for xs in strings(9):
    assert circ_run(C05, (0,), xs) == F05.run(xs)["outs"]
has("$D = Q + x$, $z = Q \\oplus x$: one OR gate")
# the 2021 machine with one D flip-flop: D = b, y = Qb
C21 = sq.Sync([("Q", "D", {"D": lambda e: e["x"]})], outs={"z": lambda e: e["Q"] & e["x"]}, inputs=("x",))
assert all(circ_run(C21, (0,), xs) == F21.run(xs)["outs"] for xs in strings(9))

# ── Practice ───────────────────────────────────────────────────────────────
def by_value(q, v):
    return [k for k, t in bl.option_values(q).items() if t == v]


Q1 = sq.FSM.from_table({"A": ("A", "B", 0, 0), "B": ("C", "B", 0, 1), "C": ("A", "B", 1, 0)})
xs = X("0110110")
r = Q1.run(xs)
q = P["nx-dl-06-07-q01"]
bl.assert_mcq(q, by_value(q, S(r["outs"]))[0])
assert S(r["outs"]) == "0010010" and r["states"] == ["A", "A", "B", "B", "C", "B", "B", "C"]
late = "0" + S(r["outs"])[:-1]
nextrow = S(Q1.o(r["states"][k + 1], b) for k, b in enumerate(xs))
assert by_value(q, late) == ["A"] and by_value(q, nextrow) == ["C"] and by_value(q, S(xs)) == ["D"]
bl.assert_nat(P["nx-dl-06-07-q02"], sq.detector("1101", True, True).minimal_states())
assert len(sq.detector("1101", True, True).states) == 5 and len(sq.detector("1101").states) == 4
bl.assert_nat(P["nx-dl-06-07-q03"], sq.detector("10110", False).minimal_states())
assert len(sq.detector("10110", False, True).states) == 6
PM = sq.FSM.from_table({"E": ("E", "O", 0, 1), "O": ("O", "E", 1, 0)})
for xs in strings(8):
    assert PM.run(xs)["outs"] == [sum(xs[:k + 1]) % 2 for k in range(len(xs))]
claims = {"A": lambda xs: [0] + xs[:-1], "B": lambda xs: [1 - x for x in xs],
          "C": lambda xs: [sum(xs[:k + 1]) % 2 for k in range(len(xs))], "D": lambda xs: [int(k > 0 and xs[k - 1] == xs[k] == 1) for k in range(len(xs))]}
bl.assert_mcq(P["nx-dl-06-07-q04"], [k for k, f in claims.items() if all(PM.run(xs)["outs"] == f(xs) for xs in strings(8))][0])
assert PM.run([1])["outs"] == [1] and PM.run([0])["outs"] == [0] and PM.run([1, 1])["outs"] == [1, 0]
Q5 = sq.FSM.from_table({"S0": ("S1", "S0", 0, 0), "S1": ("S1", "S2", 0, 0), "S2": ("S3", "S0", 0, 0), "S3": ("S1", "S2", 0, 1)})
w5 = Q5.shortest(lambda t, y: y == 1)
assert w5 == (0, 1, 0, 1) and Q5.run(X("10101"))["outs"][-1] == 1
bl.assert_nat(P["nx-dl-06-07-q05"], len(w5))
truth6 = {"A": True,  # a Moore output is a function of the flip-flops only (definition); checked on the timing model
          "B": all(len(sq.detector(p_).states) >= len(sq.detector(p_, moore=True).states) for p_ in ("101", "1011", "111")),
          "C": tm["z_me"][tm["spike"]] != tm["z_me"][tm["spike"] - 1],
          "D": all(same_runs(m, mealy_of_moore(m)) for m in (sq.detector("101", True, True), dm1011, PAR))}
assert all(tm["z_mo"][t] == tm["z_mo"][t - 1] for t in range(1, tm["T"]) if t % vz.P)
bl.assert_msq(P["nx-dl-06-07-q06"], [k for k, v in truth6.items() if v])
opts7 = {"A": (lambda q_, x: x, lambda q_, x: q_ ^ x), "B": (lambda q_, x: q_ | x, lambda q_, x: q_ ^ x),
         "C": (lambda q_, x: q_ & x, lambda q_, x: q_ ^ x), "D": (lambda q_, x: q_ | x, lambda q_, x: (1 - q_) & x)}
ok7 = []
for k, (df, zf) in opts7.items():
    c = sq.Sync([("Q", "D", {"D": (lambda f: lambda e: f(e["Q"], e["x"]))(df)})], outs={"z": (lambda f: lambda e: f(e["Q"], e["x"]))(zf)}, inputs=("x",))
    if all(sum(b << i for i, b in enumerate(circ_run(c, (0,), [(v >> i) & 1 for i in range(8)]))) == (256 - v) % 256 for v in range(256)):
        ok7.append(k)
assert ok7 == ["B"]
bl.assert_mcq(P["nx-dl-06-07-q07"], ok7[0])
arcs8 = {"A": d1011.delta[(3, 1)] == 1 and d1011.out[(3, 1)] == 1, "B": d1011.delta[(2, 0)] == 0 and d1011.out[(2, 0)] == 0,
         "C": d1011.delta[(1, 1)] == 0 and d1011.out[(1, 1)] == 0, "D": d1011.delta[(3, 0)] == 2 and d1011.out[(3, 0)] == 0}
bl.assert_msq(P["nx-dl-06-07-q08"], [k for k, v in arcs8.items() if v])
assert sq.ff_count(12) == 4 and sq.ff_count(12) != 3
bl.assert_nat(P["nx-dl-06-07-q09"], 12 - sq.ff_count(12))
Q10 = sq.FSM.from_table({"A": ("A", "B", 0), "B": ("C", "B", 0), "C": ("A", "D", 0), "D": ("C", "B", 1)}, moore=True)
assert Q10.equivalent(sq.detector("101", True, True))
r10 = Q10.run(X("10101"))
full = str(r10["first"]) + S(r10["outs"])
q10 = P["nx-dl-06-07-q10"]
bl.assert_mcq(q10, by_value(q10, full)[0])
assert full == "000101" and by_value(q10, S(r10["outs"])) == ["A"]
rn = sq.detector("101", False, True).run(X("10101"))
assert by_value(q10, str(rn["first"]) + S(rn["outs"])) == ["B"] and by_value(q10, S(r10["outs"]) + "0") == ["D"]
assert len([k for k in P if k.startswith("nx-dl-06-07-")]) == 10
keys = [P[f"nx-dl-06-07-q{k:02d}"]["answer"] for k in range(1, 11) if P[f"nx-dl-06-07-q{k:02d}"]["type"] == "MCQ"]
assert keys.count("B") >= 2 and keys.count("C") >= 2 and max(keys.count(x) for x in "ABCD") <= 2
for k in range(1, 11):
    q = P[f"nx-dl-06-07-q{k:02d}"]
    for blk in q["blocks"]:
        assert f"#{blk} " in L or f"#{blk}}}" in L, (q["id"], blk)
print("l6_07_fsm: Mealy ↔ Moore equivalence on every machine, the 2001 machine against its words (all strings ≤ 10 bits), detectors "
      "minimal with k and k + 1 states for 8 patterns, 2's complement on all 256 bytes, serial adder, shortest inputs and the BFS bound, "
      "binary / Gray / one-hot circuits simulated, 6 PYQ keys and 10 practice answers OK")
