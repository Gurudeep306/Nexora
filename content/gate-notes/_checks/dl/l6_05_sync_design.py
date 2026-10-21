"""Checks for dl/06-sequential-circuits/05-synchronous-counter-design: every input equation, excitation
column, next state, trace, lock-out cycle, clock period and output function of the lesson is produced by
seqlib (design_counter / designed_step for the excitation-table design with don't-cares or forced unused
states, Sync for given circuits, autonomous_cycles / self_starting for the lock-out check,
counter_states_needed / ff_count for repeated-value sequences) or by minlib on the excitation columns of a
next-state table with an input. The ten PYQ keys, every worked example and every practice answer, MSQ
option and MCQ distractor are recomputed."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import minlib as ml  # noqa: E402
import seqlib as sq  # noqa: E402

L = sq.lesson_text("05-synchronous-counter-design.md")
LN = " ".join(L.split())  # line breaks of the lesson do not matter
has = lambda *s: bl.must_contain(LN, *(" ".join(x.split()) for x in s))  # noqa: E731
bank = bl.bank()
P = sq.practice()
B = sq.bstr


def neg(v):
    return 1 - v


def b3(v, n=3):
    return format(v, f"0{n}b")


def nxt_map(step, n):
    return {v: step(v) for v in range(2 ** n)}


def sync_map(c):
    return {sq.val(s): sq.val(c.step(s)) for s in c.states()}


def design_map(nxt, nstate, kind, vars_):
    """Minimal SOPs of every flip-flop input for a next-state table over vars_ (inputs first, then the
    state bits, MSB first); nxt maps a row number to the next state (None or missing = don't-care)."""
    nv = len(vars_)
    out = {}
    for bit in range(nstate - 1, -1, -1):
        for nm in sq.INPUTS[kind]:
            on, dc = [], []
            for m in range(2 ** nv):
                if nxt.get(m) is None:
                    dc.append(m)
                    continue
                e = sq.excitation(kind, (m >> bit) & 1, (nxt[m] >> bit) & 1)[nm]
                if e == "x":
                    dc.append(m)
                elif e == 1:
                    on.append(m)
            out[f"{nm}{bit}"] = [s.replace("'", "′") for s in ml.min_sop(on, dc, nv, vars_)]
    return out


def same(a, b):
    """Two SOP strings equal up to the order of their terms."""
    return sorted(a.split(" + ")) == sorted(b.split(" + "))


# ── Excitation columns (theorem d-from-next) ──────────────────────────────
for kind in sq.KINDS:
    for q in (0, 1):
        for qn in (0, 1):
            e = sq.excitation(kind, q, qn)
            if kind == "D":
                assert e == {"D": qn}
            if kind == "T":
                assert e == {"T": q ^ qn}
            if kind == "JK":
                assert e == ({"J": qn, "K": "x"} if q == 0 else {"J": "x", "K": 1 - qn})
            if kind == "SR":
                want = {"S": qn, "R": 0 if qn else "x"} if q == 0 else {"S": "x" if qn else 0, "R": 1 - qn}
                assert e == want, (q, qn, e)

# ── Synchronous binary counter (theorem binary-t) ─────────────────────────
for n in (2, 3, 4, 5):
    d = sq.design_counter(list(range(2 ** n)), "T")
    for i in range(n):
        want = "1" if i == 0 else "".join(f"Q{j}" for j in range(i - 1, -1, -1))
        assert d["sop"][f"T{i}"] == [want], (n, i, d["sop"])
    dn = sq.design_counter(list(range(2 ** n - 1, -1, -1)), "T")
    for i in range(1, n):
        assert dn["sop"][f"T{i}"] == ["".join(f"Q{j}′" for j in range(i - 1, -1, -1))]
    for v in range(2 ** n):  # bit i flips on +1 iff all lower bits are 1
        u = (v + 1) % 2 ** n
        for i in range(n):
            assert ((v ^ u) >> i) & 1 == all((v >> j) & 1 for j in range(i))
d3 = sq.design_counter(list(range(8)), "T")
assert d3["sop"] == {"T2": ["Q1Q0"], "T1": ["Q0"], "T0": ["1"]}
assert sq.design_counter(list(range(16)), "T")["sop"]["T3"] == ["Q2Q1Q0"]
dd3 = sq.design_counter(list(range(8)), "D")["sop"]
assert dd3["D0"] == ["Q0′"] and same(dd3["D1"][0], "Q1′Q0 + Q1Q0′") and same(dd3["D2"][0], "Q2Q1′ + Q2Q0′ + Q2′Q1Q0")
has("returns exactly\n$T_0 = 1$, $T_1 = Q_0$, $T_2 = Q_1Q_0$, and for 0 … 15 it adds $T_3 = Q_2Q_1Q_0$",
    "$D_0 = \\overline{Q_0}$, $D_1 = \\overline{Q_1}Q_0 + Q_1\\overline{Q_0}$ and $D_2 = Q_2\\overline{Q_1} + Q_2\\overline{Q_0} + \\overline{Q_2}Q_1Q_0$")
# easy example: T vectors and states
c3 = sq.Sync([("Q2", "T", {"T": lambda e: e["Q1"] & e["Q0"]}), ("Q1", "T", {"T": lambda e: e["Q0"]}), ("Q0", "T", {"T": lambda e: 1})])
tr = c3.trace((0, 0, 0), 4)
assert [B(x) for x in tr[1:]] == ["001", "010", "011", "100"]
tv = [B(tuple(c3.excite(x)[k]["T"] for k in ("Q2", "Q1", "Q0"))) for x in tr[:4]]
assert tv == ["001", "011", "001", "111"]
has("001, 010, 011, 100: binary counting", "(001, 011, 001, 111)")
# up/down aside: 16-row table with the mode M as the first variable
ud = {m: (((m & 7) + (1 if not m >> 3 else -1)) % 8) for m in range(16)}
dud = design_map(ud, 3, "T", ["M", "Q2", "Q1", "Q0"])
assert dud["T0"] == ["1"] and same(dud["T1"][0], "M′Q0 + MQ0′") and same(dud["T2"][0], "M′Q1Q0 + MQ1′Q0′")
assert len(dud["T1"]) == len(dud["T2"]) == 1

# ── f_max ─────────────────────────────────────────────────────────────────
def fmax_chain(t_ff, t_and, t_su, gates_on_path):
    return 1000 / (t_ff + gates_on_path * t_and + t_su)


# 1991: AND1 = 1·Q0 → J1K1, AND2 = AND1·Q1 → J2K2, AND3 = carry out (no flip-flop)
paths91 = {"J1K1": 1, "J2K2": 2}  # gates between a flip-flop output and each flip-flop input
assert max(paths91.values()) == 2
f91 = fmax_chain(10, 10, 0, 2)
assert round(f91, 1) == 33.3 and 10 + 2 * 10 == 30
assert fmax_chain(10, 10, 0, 3) == 25 and fmax_chain(10, 10, 0, 1) == 50 and fmax_chain(10, 10, 0, 0) == 100
assert "33.3 MHz" in bank["cse-1991-b-5-c"]["answer"] and "30 ns" in bank["cse-1991-b-5-c"]["answer"]
# and the counter really is a binary counter (J = K = T)
c91 = sq.Sync([("Q2", "JK", {"J": lambda e: e["Q1"] & e["Q0"], "K": lambda e: e["Q1"] & e["Q0"]}),
               ("Q1", "JK", {"J": lambda e: 1 & e["Q0"], "K": lambda e: 1 & e["Q0"]}), ("Q0", "JK", {"J": lambda e: 1, "K": lambda e: 1})])
assert [sq.val(x) for x in c91.trace((0, 0, 0), 8)] == [0, 1, 2, 3, 4, 5, 6, 7, 0]
has("$10 + 10 + 10 = 30$ ns, so\n$f_{\\max} = 1/30\\ \\text{ns} \\approx 33.3$ MHz", "About **33.3 MHz** (period 30 ns), GATE 1991",
    "- **25 MHz** (40 ns)", "- **50 MHz** (20 ns)", "- **100 MHz** (10 ns)")
# medium: t_cq 8, AND 4, t_su 2
assert 8 + 4 + 2 == 14 and round(1000 / 14, 2) == 71.43 and 8 + 2 * 4 + 2 == 18 and round(1000 / 18, 2) == 55.56
assert 8 + 6 * 4 + 2 == 34 and round(1000 / 34, 2) == 29.41
has("$f_{\\max} = 1/14\\ \\text{ns} \\approx 71.43$ MHz", "$f_{\\max} \\approx 55.56$ MHz", "$8 + 6 \\times 4 + 2 = 34$ ns, about 29.41 MHz")
# edge: 4-bit chain (3 gates to J3K3), with the carry 4 gates; 8-bit cascade: 7 gates to J7K7
assert fmax_chain(10, 10, 0, 3) == 25 and fmax_chain(10, 10, 0, 4) == 20 and fmax_chain(10, 10, 0, 7) == 12.5
has("4-bit: $10 + 3 \\times 10 = 40$ ns, $f_{\\max} = 25$ MHz", "$10 + 70 = 80$ ns, $f_{\\max} = 12.5$ MHz")

# ── 2004: 0 → 2 → 3 → 1 with T (Q2 = MSB) ─────────────────────────────────
d04 = sq.design_counter([0, 2, 3, 1], "T", 2)
assert d04["sop"] == {"T1": ["Q1′Q0′ + Q1Q0"], "T0": ["Q1′Q0 + Q1Q0′"]}  # seqlib's Q1Q0 = the figure's Q2Q1
opts04 = {"A": lambda e: neg(e["Q2"]), "B": lambda e: e["Q2"] | e["Q1"], "C": lambda e: neg(e["Q1"] ^ e["Q2"]), "D": lambda e: e["Q1"] ^ e["Q2"]}
ok04 = []
for k, f in opts04.items():
    c = sq.Sync([("Q2", "T", {"T": lambda e: neg(e["Q2"] ^ e["Q1"])}), ("Q1", "T", {"T": f})])
    if [sq.val(x) for x in c.trace((0, 0), 4)] == [0, 2, 3, 1, 0]:
        ok04.append(k)
assert ok04 == bl.key_letters(bank["cse-2004-cs-61"]["answer"]) == ["D"]
dD04 = sq.design_counter([0, 2, 3, 1], "D", 2)["sop"]
assert dD04 == {"D1": ["Q0′"], "D0": ["Q1"]}  # the figure's D2 = Q1′, D1 = Q2: a 2-bit twisted ring
assert sq.register_cycle(sq.johnson_step, (0, 0)) == [(0, 0), (1, 0), (1, 1), (0, 1)]
dJ04 = sq.design_counter([0, 2, 3, 1], "JK", 2)["sop"]
assert dJ04 == {"J1": ["Q0′"], "K1": ["Q0"], "J0": ["Q1"], "K0": ["Q1′"]}
has("$T_2$: 1, 0, 1, 0 and $T_1$: 0, 1, 0, 1", "$X = Q_1 \\oplus Q_2$ (GATE 2004, option D)", "$D_2 = \\overline{Q_1}$, $D_1 = Q_2$")

# ── 1998: 1 → 4 → 2 → 3 with D and JK ─────────────────────────────────────
d98 = sq.design_counter([1, 4, 2, 3], "D", 3)
assert d98["sop"] == {"D2": ["Q1′Q0", "Q2′Q1′"], "D1": ["Q0′"], "D0": ["Q1"]}
s98 = nxt_map(sq.designed_step(d98, "D"), 3)
assert {u: s98[u] for u in (0, 5, 6, 7)} == {0: 2, 5: 4, 6: 3, 7: 1} and sq.self_starting(lambda v: s98[v], range(8), [1, 4, 2, 3])
alt98 = sync_map(sq.Sync([("Q2", "D", {"D": lambda e: neg(e["Q2"]) & neg(e["Q1"])}), ("Q1", "D", {"D": lambda e: neg(e["Q0"])}), ("Q0", "D", {"D": lambda e: e["Q1"]})]))
assert {u: alt98[u] for u in (0, 5, 6, 7)} == {0: 6, 5: 0, 6: 3, 7: 1} and sq.self_starting(lambda v: alt98[v], range(8), [1, 4, 2, 3])
assert [alt98[v] for v in (1, 4, 2, 3)] == [4, 2, 3, 1]
key98 = bank["cse-1998-b-68"]["answer"]
assert "D2 = Q̄1Q0" in key98 and "D1 = Q̄0" in key98 and "D0 = Q1" in key98
# the D2 column: 1 only in row 001; dcs 000, 101, 110, 111
assert d98["inputs"]["D2"] == ([1], [0, 5, 6, 7]) and d98["inputs"]["D1"] == ([2, 4], [0, 5, 6, 7]) and d98["inputs"]["D0"] == ([2, 3], [0, 5, 6, 7])
has("000 → 010, 101 → 100, 110 → 011, 111 → 001: each unused state enters the cycle in one clock",
    "the unused states go 000 → 110 → 011, 101 → 000, 110 → 011, 111 → 001")
assert [1, 4, 2, 3][30 % 4] == 2
s98c = sq.designed_step(d98, "D")
x = 1
for _ in range(30):
    x = s98c(x)
assert x == 2
has("$[1, 4, 2, 3][30 \\bmod 4] = 2$ after 30 clocks")
dJ98 = sq.design_counter([1, 4, 2, 3], "JK", 3)
assert dJ98["sop"] == {"J2": ["Q1′"], "K2": ["1"], "J1": ["Q0′", "Q2"], "K1": ["Q0"], "J0": ["Q1", "Q2′"], "K0": ["Q1′"]}
sJ98 = nxt_map(sq.designed_step(dJ98, "JK"), 3)
assert {u: sJ98[u] for u in (0, 5, 6, 7)} == {0: 6, 5: 0, 6: 3, 7: 1} and sq.self_starting(lambda v: sJ98[v], range(8), [1, 4, 2, 3])
pre, cyc = sq.cycle_from(lambda v: sJ98[v], 5)
assert pre == [5, 0, 6] and len(pre) == 3
has("000 → 110 → 011, 101 → 000, 110 → 011, 111 → 001: every unused state reaches the cycle (101 after three clocks)")

# ── 1992: 3-bit Gray counter with D (and JK) ──────────────────────────────
gray = [0, 1, 3, 2, 6, 7, 5, 4]
assert all(bin(a ^ b).count("1") == 1 for a, b in zip(gray, gray[1:] + gray[:1])) and gray == [i ^ (i >> 1) for i in range(8)]
dg = sq.design_counter(gray, "D", 3)
assert all(len(v) == 1 for v in dg["sop"].values())
assert same(dg["sop"]["D2"][0], "Q1Q0′ + Q2Q0") and same(dg["sop"]["D1"][0], "Q2′Q0 + Q1Q0′") and same(dg["sop"]["D0"][0], "Q2′Q1′ + Q2Q1")
assert dg["inputs"]["D2"][0] == [2, 5, 6, 7] and dg["inputs"]["D1"][0] == [1, 2, 3, 6] and dg["inputs"]["D0"][0] == [0, 1, 6, 7]
k92 = bank["cse-1992-b-4-c"]["answer"]
assert "D_2 = Q_1\\overline{Q_0} + Q_2Q_0" in k92 and "D_1 = \\overline{Q_2}Q_0 + Q_1\\overline{Q_0}" in k92 and "\\overline{Q_2 \\oplus Q_1}" in k92
assert all(bin(gray[k]).count("1") % 2 != bin(gray[(k + 1) % 8]).count("1") % 2 for k in range(8))  # parity alternates
# the LSB flips exactly on the even-parity states, so Q0+ = Q0 xor not(Q2 xor Q1 xor Q0) = not(Q2 xor Q1)
for k in range(8):
    g, h = gray[k], gray[(k + 1) % 8]
    assert ((g ^ h) & 1) == (bin(g).count("1") % 2 == 0) and (h & 1) == 1 - (((g >> 2) ^ (g >> 1)) & 1)
has("in the reflected Gray order the LSB flips exactly on the even-parity states", "$Q_0^+ = Q_0 \\oplus \\overline{Q_2 \\oplus Q_1 \\oplus Q_0} = \\overline{Q_2 \\oplus Q_1}$")
djg = sq.design_counter(gray, "JK", 3)["sop"]
assert djg["J2"] == ["Q1Q0′"] and djg["K2"] == ["Q1′Q0′"] and djg["J1"] == ["Q2′Q0"] and djg["K1"] == ["Q2Q0"]
assert same(djg["J0"][0], "Q2′Q1′ + Q2Q1") and same(djg["K0"][0], "Q2′Q1 + Q2Q1′")
assert sq.autonomous_cycles(sq.designed_step(dg, "D"), range(8)) == [gray]
has("$D_2 = Q_1\\overline{Q_0} + Q_2Q_0$, $D_1 = \\overline{Q_2}Q_0 + Q_1\\overline{Q_0}$, $D_0 = \\overline{Q_2 \\oplus Q_1}$ (GATE 1992)")

# ── Enable counter, 2017, 2026, mod-3 ─────────────────────────────────────
en = {m: (((m & 3) + 1) % 4 if m >> 2 else m & 3) for m in range(8)}
den = design_map(en, 2, "T", ["x", "Q1", "Q0"])
assert den == {"T1": ["xQ0"], "T0": ["x"]}
dden = design_map(en, 2, "D", ["x", "Q1", "Q0"])
assert same(dden["D0"][0], "x′Q0 + xQ0′") and same(dden["D1"][0], "x′Q1 + Q1Q0′ + xQ1′Q0")
assert all(((m >> 1) & 1) ^ ((m >> 2) & (m & 1)) == (en[m] >> 1) & 1 for m in range(8))  # D1 = Q1 ⊕ xQ0
has("$T_0 = x$, $T_1 = xQ_0$", "$D_1 = \\overline{x}Q_1 + Q_1\\overline{Q_0} + x\\overline{Q_1}Q_0$ (that is, $Q_1 \\oplus xQ_0$)")
# 2017 saturating up with T
sat = {0: 1, 1: 2, 2: 3, 3: 3}
assert design_map(sat, 2, "T", ["Q1", "Q0"]) == {"T1": ["Q1′Q0"], "T0": ["Q1′ + Q0′"]}
dsat = design_map(sat, 2, "D", ["Q1", "Q0"])
assert same(dsat["D1"][0], "Q1 + Q0") and same(dsat["D0"][0], "Q1 + Q0′")
assert [B(sq.bits(sat[v] ^ v, 2)) for v in range(4)] == ["01", "11", "01", "00"]
opts17 = {"A": (lambda e: e["Q1"] & e["Q0"], lambda e: neg(e["Q1"]) & neg(e["Q0"])),
          "B": (lambda e: neg(e["Q1"]) & e["Q0"], lambda e: neg(e["Q1"]) | neg(e["Q0"])),
          "C": (lambda e: e["Q1"] | e["Q0"], lambda e: neg(e["Q1"]) | neg(e["Q0"])),
          "D": (lambda e: neg(e["Q1"]) & e["Q0"], lambda e: e["Q1"] | e["Q0"])}
ok17, t11 = [], {}
for k, (t1, t0) in opts17.items():
    c = sq.Sync([("Q1", "T", {"T": t1}), ("Q0", "T", {"T": t0})])
    if sync_map(c) == sat:
        ok17.append(k)
    t11[k] = (c.excite((1, 1))["Q1"]["T"], c.excite((1, 1))["Q0"]["T"])
assert ok17 == bl.key_letters(bank["cse-2017-2-cs-42"]["answer"]) == ["B"]
assert t11 == {"A": (1, 0), "B": (0, 0), "C": (1, 0), "D": (0, 1)}  # row 11 alone eliminates A, C, D
has("$T_1 = \\overline{Q_1}Q_0$, $T_0 = \\overline{Q_1} + \\overline{Q_0}$ (GATE 2017, option B)", "option A gives $T_1 = 1$, option C $T_1 = 1$ and option D\n$T_0 = 1$",
    "00 → 01: $T_1T_0 = 01$. 01 → 10: 11. 10 → 11: 01. 11 → 11: 00.")
# 2026 up/down saturating with D: rows (P, Q1, Q0)
t26 = {0: 1, 1: 2, 2: 3, 3: 3, 4: 0, 5: 0, 6: 1, 7: 2}
for r in bank["cse-2026-1-cs-27"]["text"].split("\n"):
    cells = [c.strip() for c in r.strip("|").split("|")]
    if len(cells) == 5 and all(c in "01" for c in cells):
        p_, a, b_, na, nb = map(int, cells)
        assert t26[4 * p_ + 2 * a + b_] == 2 * na + nb
d26 = design_map(t26, 2, "D", ["P", "Q1", "Q0"])
assert len(d26["D1"]) == 1 and len(d26["D0"]) == 1
assert same(d26["D1"][0], "P′Q1 + P′Q0 + Q1Q0") and same(d26["D0"][0], "P′Q0′ + P′Q1 + Q1Q0′")
Pv = lambda e: e["P"]  # noqa: E731
o26 = {"A": (lambda e: (Pv(e) & e["Q1"]) | (neg(Pv(e)) & e["Q0"]) | (e["Q1"] & e["Q0"]), lambda e: (Pv(e) & e["Q0"]) | (neg(Pv(e)) & e["Q1"]) | (e["Q1"] & neg(e["Q0"]))),
       "B": (lambda e: (neg(Pv(e)) & e["Q1"]) | (neg(Pv(e)) & e["Q0"]) | (e["Q1"] & e["Q0"]), lambda e: (neg(Pv(e)) & neg(e["Q0"])) | (neg(Pv(e)) & e["Q1"]) | (e["Q1"] & neg(e["Q0"]))),
       "C": (lambda e: (neg(Pv(e)) & neg(e["Q1"])) | (neg(Pv(e)) & e["Q0"]) | (e["Q1"] & e["Q0"]), lambda e: (neg(Pv(e)) & e["Q0"]) | (neg(Pv(e)) & e["Q1"]) | (e["Q1"] & neg(e["Q0"]))),
       "D": (lambda e: (Pv(e) & neg(e["Q1"])) | (neg(Pv(e)) & e["Q0"]) | (e["Q1"] & e["Q0"]), lambda e: (Pv(e) & neg(e["Q0"])) | (neg(Pv(e)) & e["Q1"]) | (e["Q1"] & neg(e["Q0"])))}
ok26, row000 = [], {}
for k, (d1, d0) in o26.items():
    c = sq.Sync([("Q1", "D", {"D": d1}), ("Q0", "D", {"D": d0})], inputs=("P",))
    if all(sq.val(c.step(sq.bits(m & 3, 2), (m >> 2,))) == t26[m] for m in range(8)):
        ok26.append(k)
    row000[k] = B(c.step((0, 0), (0,)))
assert ok26 == bl.key_letters(bank["cse-2026-1-cs-27"]["answer"]) == ["B"]
assert row000 == {"A": "00", "B": "01", "C": "10", "D": "00"}
assert [m for m in range(8) if (t26[m] >> 1) & 1] == [1, 2, 3, 7] and [m for m in range(8) if t26[m] & 1] == [0, 2, 3, 6]
has("Option A gives 00 there, option C gives 10, option D gives 00", "option B (GATE 2026)",
    "$Q_1^+ = 1$ in rows 001, 010, 011 (up) and 111 (down). $Q_0^+ = 1$ in rows 000, 010, 011 (up) and 110 (down).")
# mod-3, don't-care vs forced
m3 = sq.design_counter([0, 1, 2], "D", 2)
assert m3["sop"] == {"D1": ["Q0"], "D0": ["Q1′Q0′"]} and sq.designed_step(m3, "D")(3) == 2
m3f = sq.design_counter([0, 1, 2], "D", 2, unused=0)
assert m3f["sop"] == {"D1": ["Q1′Q0"], "D0": ["Q1′Q0′"]} and sq.designed_step(m3f, "D")(3) == 0
has("In 11: $D_1 = Q_0 = 1$, $D_0 = 0$: 11 → 10", "With don't-cares 3 → 2")

# ── Repeated values (2015, 2016) ──────────────────────────────────────────
s15, s16 = [0, 0, 1, 1, 2, 2, 3, 3], [0, 1, 0, 2, 0, 3]
assert sq.counter_states_needed(s15) == 8 and sq.counter_states_needed(s16) == 6
assert sq.ff_count(8) == 3 == sq.ff_count(6)
assert bank["cse-2015-2-cs-7"]["answer"] == 3 == sq.ff_count(sq.counter_states_needed(s15))
assert bank["cse-2016-1-cs-8"]["answer"] == 3 == sq.ff_count(sq.counter_states_needed(s16))
assert sq.ff_count(len(set(s15))) == 2 == sq.ff_count(len(set(s16)))  # the trap answer
assert [v >> 1 for v in range(8)] == s15  # Q2Q1 of a mod-8 binary counter
assert sq.counter_states_needed([0, 1, 0, 1]) == 2 and sq.ff_count(2) == 1
# 2016 output logic over a binary mod-6 state counter (states 6, 7 don't-care)
z = dict(enumerate(s16))
z1 = ml.min_sop([s for s in range(6) if z[s] >> 1], [6, 7], 3, ["Q2", "Q1", "Q0"])
z0 = ml.min_sop([s for s in range(6) if z[s] & 1], [6, 7], 3, ["Q2", "Q1", "Q0"])
assert len(z1) == 1 and same(z1[0], "Q1Q0 + Q2Q0") and z0 == ["Q1'Q0"]
has("$z_1 = Q_1Q_0 + Q_2Q_0$ and $z_0 = \\overline{Q_1}Q_0$", "**3** (GATE 2015)", "**3** flip-flops (GATE 2016)",
    "8 for 0, 0, 1, 1, 2, 2, 3, 3, and 6 for 0, 1, 0, 2, 0, 3", "0, 1, 0, 1 has period 2 and\nneeds only 1 flip-flop")
# theorem: an output sequence of minimal period L from f(state) of an autonomous machine needs ≥ L states (exhaustive, small machines)
for nstates in range(1, 5):
    import itertools
    for nxt in itertools.product(range(nstates), repeat=nstates):
        for outs in itertools.product((0, 1, 2), repeat=nstates):
            pre, cyc = sq.cycle_from(lambda s: nxt[s], 0)
            seq = [outs[s] for s in cyc]
            assert sq.counter_states_needed(seq) <= len(cyc) <= nstates

# ── Lock-out: the 0 → 3 → 5 → 6 counter ────────────────────────────────────
main = [0, 3, 5, 6]
c371 = sq.Sync([("A", "JK", {"J": lambda e: e["B"], "K": lambda e: e["B"]}), ("B", "JK", {"J": lambda e: 1, "K": lambda e: 1}),
                ("C", "JK", {"J": lambda e: neg(e["B"]), "K": lambda e: neg(e["B"])})])
n371 = sync_map(c371)
assert [n371[v] for v in main] == [3, 5, 6, 0]
assert sq.autonomous_cycles(lambda v: n371[v], range(8)) == [[0, 3, 5, 6], [1, 2, 4, 7]]
assert not sq.self_starting(lambda v: n371[v], range(8), main)
dT = sq.design_counter(main, "T", 3)
assert dT["sop"] == {"T2": ["Q1"], "T1": ["1"], "T0": ["Q1′"]} and nxt_map(sq.designed_step(dT, "T"), 3) == n371
dD = sq.design_counter(main, "D", 3)
assert dD["sop"] == {"D2": ["Q0"], "D1": ["Q1′"], "D0": ["Q2′"]}
assert sq.autonomous_cycles(sq.designed_step(dD, "D"), range(8)) == [[0, 3, 5, 6], [1, 7, 4, 2]]
dJ = sq.design_counter(main, "JK", 3)
assert dJ["sop"] == {"J2": ["Q0", "Q1"], "K2": ["Q0′", "Q1"], "J1": ["1"], "K1": ["1"], "J0": ["Q1′", "Q2′"], "K0": ["Q1′", "Q2"]}
# the locking wiring picks J2 = K2 = Q1 and J0 = K0 = Q1′: both minimal choices
assert "Q1" in dJ["sop"]["J2"] and "Q1" in dJ["sop"]["K2"] and "Q1′" in dJ["sop"]["J0"] and "Q1′" in dJ["sop"]["K0"]
# the trace of the unused states, with the toggle reasons of the lesson
assert [B(sq.bits(v, 3)) for v in (1, n371[1], n371[2], n371[4], n371[7])] == ["001", "010", "100", "111", "001"]
has("$$001 \\to 010 \\to 100 \\to 111 \\to 001,$$", "001 ($B = 0$): A holds, B → 1, C toggles → **010**", "010 ($B = 1$): A → 1, B → 0, C holds → **100**",
    "100 ($B = 0$): A holds, B → 1, C → 1: **111**", "111 ($B = 1$): A → 0, B → 0, C holds: **001**",
    "[000, 011, 101, 110] and [001, 010, 100, 111]")
# cure 1: forced to 000
dF = sq.design_counter(main, "JK", 3, unused=0)
assert dF["sop"] == {"J2": ["Q1Q0"], "K2": ["Q0′ + Q1"], "J1": ["Q2′Q0′ + Q2Q0"], "K1": ["1"], "J0": ["Q2′Q1′"], "K0": ["Q1′ + Q2"]}
nF = nxt_map(sq.designed_step(dF, "JK"), 3)
assert all(nF[u] == 0 for u in (1, 2, 4, 7)) and [nF[v] for v in main] == [3, 5, 6, 0]
has("$J_A = Q_BQ_C$, $K_A = \\overline{Q_C} + Q_B$, $J_B = \\overline{Q_A}\\,\\overline{Q_C} + Q_AQ_C$, $K_B = 1$, $J_C = \\overline{Q_A}\\,\\overline{Q_B}$, $K_C = \\overline{Q_B} + Q_A$")
# cure 3: J_A = Q_C, K_A = Q_C′ (seqlib's first minimal JK cover)
calt = sq.Sync([("A", "JK", {"J": lambda e: e["C"], "K": lambda e: neg(e["C"])}), ("B", "JK", {"J": lambda e: 1, "K": lambda e: 1}),
                ("C", "JK", {"J": lambda e: neg(e["B"]), "K": lambda e: neg(e["B"])})])
nA = sync_map(calt)
assert [nA[v] for v in main] == [3, 5, 6, 0] and {u: nA[u] for u in (1, 2, 4, 7)} == {1: 6, 2: 0, 4: 3, 7: 5}
assert sq.self_starting(lambda v: nA[v], range(8), main) and nxt_map(sq.designed_step(dJ, "JK"), 3) == nA
has("001 → 110, 010 → 000, 100 → 011, 111 → 101")
# cure 2 of the definition: one redirected arc opens the cycle (e.g. 111 → 000 only)
one = dict(n371)
one[7] = 0
assert sq.self_starting(lambda v: one[v], range(8), main)
# ... but re-minimising after forcing one row can create a new cycle: D design, force only 001 -> 000
assert sq.autonomous_cycles(sq.designed_step(dD, "D"), range(8))[1] == [1, 7, 4, 2]
f1 = design_map({0: 3, 3: 5, 5: 6, 6: 0, 1: 0}, 3, "D", ["Q2", "Q1", "Q0"])
assert all(len(f1[k]) == 4 for k in f1)
assert any(same(x, "Q1Q0 + Q2Q0") for x in f1["D2"]) and any(same(x, "Q1′Q0′ + Q2Q0") for x in f1["D1"]) and any(same(x, "Q1′Q0′ + Q1Q0") for x in f1["D0"])
cf1 = sq.Sync([("Q2", "D", {"D": lambda e: (e["Q1"] & e["Q0"]) | (e["Q2"] & e["Q0"])}),
               ("Q1", "D", {"D": lambda e: (neg(e["Q1"]) & neg(e["Q0"])) | (e["Q2"] & e["Q0"])}),
               ("Q0", "D", {"D": lambda e: (neg(e["Q1"]) & neg(e["Q0"])) | (e["Q1"] & e["Q0"])})])
nf1 = sync_map(cf1)
assert [nf1[v] for v in main] == [3, 5, 6, 0] and nf1[1] == 0 and nf1[7] == 7 and not sq.self_starting(lambda v: nf1[v], range(8), main)
has("locks out on 001 → 111 → 100 → 010", "$D_2 = Q_1Q_0 + Q_2Q_0$, $D_1 = \\overline{Q_1}\\,\\overline{Q_0} + Q_2Q_0$", "a brand-new **self-loop**",
    "**Then re-run the self-start check**")
# the lab example: T flip-flops, don't-cares → lock-out; forced to 0 → self-starting
assert not sq.self_starting(sq.designed_step(dT, "T"), range(8), main)
assert sq.self_starting(sq.designed_step(sq.design_counter(main, "T", 3, unused=0), "T"), range(8), main)
# with the default JK the first minimal cover is J2 = Q0, K2 = Q0′ (cure 3): self-starting
assert dJ["sop"]["J2"][0] == "Q0" and dJ["sop"]["K2"][0] == "Q0′" and sq.self_starting(sq.designed_step(dJ, "JK"), range(8), main)
assert not sq.self_starting(sq.designed_step(dD, "D"), range(8), main)
has("$T_2 = Q_1$, $T_1 = 1$,\n$T_0 = \\overline{Q_1}$ (the $J_A = K_A = Q_B$ counter of this lesson)", "first minimal cover for 0, 3, 5, 6 happens to be $J_2 = Q_0$, $K_2 = \\overline{Q_0}$ (cure 3 above)",
    "With **D** it locks out too,\non 001 → 111 → 100 → 010", "in the **Circuit** menu")
# theorem lockout (2): self-starting ⇔ the main cycle is the only cycle, over every 3-bit design in seqlib's designer
import itertools  # noqa: E402
for seq in itertools.permutations(range(8), 4):
    if seq[0] != 0:
        continue
    for kind in ("D", "T", "JK"):
        st = sq.designed_step(sq.design_counter(list(seq), kind, 3), kind)
        cyc = sq.autonomous_cycles(st, range(8))
        assert sq.self_starting(st, range(8), list(seq)) == (len(cyc) == 1)
        assert any(set(c) == set(seq) for c in cyc)
# full-length: binary and Gray use all states
for seq in (list(range(8)), gray):
    assert sorted(seq) == list(range(8))

# ── Analysing given counters ──────────────────────────────────────────────
# T0 = Q̄0, T1 = Q0
ctq = sq.Sync([("Q1", "T", {"T": lambda e: e["Q0"]}), ("Q0", "T", {"T": lambda e: neg(e["Q0"])})])
assert [B(x) for x in ctq.trace((0, 0), 5)] == ["00", "01", "11", "01", "11", "01"]
assert all(sq.ff_next("T", q, T=1 - q) == 1 for q in (0, 1))
has("00 → 01 → 11 → 01 → 11 → 01.", "01, 11, 01, 11, 01: the counter never shows 00 or 10 again")
# 2014
c14 = sq.Sync([("Q2", "JK", {"J": lambda e: neg(e["Q1"]), "K": lambda e: e["Q0"]}), ("Q1", "JK", {"J": lambda e: e["Q2"], "K": lambda e: neg(e["Q2"])}),
               ("Q0", "JK", {"J": lambda e: e["Q1"], "K": lambda e: neg(e["Q0"])})])
t14 = [B(x) for x in c14.trace((0, 0, 0), 7)]
assert t14 == ["000", "100", "110", "111", "011", "001", "101", "011"]
pre14, cyc14 = sq.cycle_from(c14.step, (0, 0, 0))
assert len(pre14) == 4 and [B(x) for x in cyc14] == ["011", "001", "101"]
for s_ in c14.states():  # the simplified state equations of the lesson
    q2, q1, q0 = s_
    assert c14.step(s_) == ((neg(q1) & neg(q2)) | (neg(q0) & q2), q2, q1 | q0)
opts14 = {o["l"]: o["t"] for o in bank["cse-2014-3-cs-45"]["options"]}
assert [k for k, v in opts14.items() if v == ", ".join(t14[1:4])] == bl.key_letters(bank["cse-2014-3-cs-45"]["answer"]) == ["C"]
has("**100, 110, 111** (GATE 2014, option C)", "the counter goes 011, 001, 101, 011, …: a 3-state cycle after a 4-state tail")
# 2021
c21 = sq.Sync([("P", "T", {"T": lambda e: e["R"]}), ("Q", "T", {"T": lambda e: neg(e["P"])}), ("R", "T", {"T": lambda e: neg(e["Q"])})])
t21 = [B(x) for x in c21.trace((0, 0, 0), 3)]
assert t21 == ["000", "011", "101", "000"]
opts21 = {o["l"]: o["t"] for o in bank["cse-2021-1-cs-28"]["options"]}
assert [k for k, v in opts21.items() if v == ", ".join(t21[1:])] == bl.key_letters(bank["cse-2021-1-cs-28"]["answer"]) == ["A"]
assert [k for k, v in opts21.items() if v.startswith("001")] == ["B", "D"]
n21 = {B(s_): B(c21.step(s_)) for s_ in c21.states()}
assert {k: n21[k] for k in ("001", "010", "100", "110", "111")} == {"001": "110", "010": "000", "100": "101", "110": "110", "111": "011"}
assert sq.autonomous_cycles(c21.step, c21.states()) == [[(0, 0, 0), (0, 1, 1), (1, 0, 1)], [(1, 1, 0)]]
has("**011, 101, 000** (GATE 2021, option A)", "001 → 110, 010 → 000, 100 → 101, 110 → 110, 111 → 011")
# edge: JK mod-3 with an unused self-loop
cm3 = sq.Sync([("Q1", "JK", {"J": lambda e: e["Q0"], "K": lambda e: neg(e["Q0"])}), ("Q0", "JK", {"J": lambda e: neg(e["Q1"]), "K": lambda e: neg(e["Q1"])})])
nm3 = {B(s_): B(cm3.step(s_)) for s_ in cm3.states()}
assert nm3 == {"00": "01", "01": "10", "10": "00", "11": "11"}
dm3 = sq.design_counter([0, 1, 2], "JK", 2)
assert dm3["sop"] == {"J1": ["Q0"], "K1": ["1"], "J0": ["Q1′"], "K0": ["1"]} and sq.designed_step(dm3, "JK")(3) == 0
assert dm3["inputs"]["K1"][0] == [2] and dm3["inputs"]["K0"][0] == [1]  # one specified 1 each; the rest don't-cares
has("11 → 11.")

# ── The viz scenes' claims (also asserted in _viz_ch6_l05.py) ─────────────
ev = sq.ripple_events(3, 1, [10 * k for k in range(1, 9)])
assert sq.settled_states(ev, [10 * k for k in range(1, 9)], 100) == [1, 2, 3, 4, 5, 6, 7, 0]
has("pass through 010 and 000 on the way")

# ── PYQ key format checks for the DESC questions ──────────────────────────
for qid in ("cse-1991-b-5-c", "cse-1992-b-4-c", "cse-1998-b-68"):
    assert bank[qid]["type"] == "DESC"
assert bank["cse-2015-2-cs-7"]["type"] == bank["cse-2016-1-cs-8"]["type"] == "NAT"

# ── Practice ──────────────────────────────────────────────────────────────
def opts(q):
    return bl.option_values(P[q])


# q01: 0 → 1 → 3 → 2 with T
assert sq.design_counter([0, 1, 3, 2], "T", 2)["sop"] == {"T1": ["Q1′Q0 + Q1Q0′"], "T0": ["Q1′Q0′ + Q1Q0"]}
q1 = {"B": (lambda e: e["Q1"] ^ e["Q0"], lambda e: neg(e["Q1"] ^ e["Q0"])), "A": (lambda e: e["Q0"], lambda e: neg(e["Q1"])),
      "C": (lambda e: neg(e["Q1"] ^ e["Q0"]), lambda e: e["Q1"] ^ e["Q0"]), "D": (lambda e: e["Q0"], lambda e: 1)}
good = [k for k, (t1, t0) in q1.items() if [sq.val(x) for x in sq.Sync([("Q1", "T", {"T": t1}), ("Q0", "T", {"T": t0})]).trace((0, 0), 4)] == [0, 1, 3, 2, 0]]
bl.assert_mcq(P["nx-dl-06-05-q01"], good[0])
assert good == ["B"] and sq.design_counter([0, 1, 3, 2], "D", 2)["sop"] == {"D1": ["Q0"], "D0": ["Q1′"]}
# q02: 0 → 1 → 3 → 7 → 6 → 4 with D
d02 = sq.design_counter([0, 1, 3, 7, 6, 4], "D", 3)
assert d02["sop"] == {"D2": ["Q1"], "D1": ["Q0"], "D0": ["Q2′"]}
assert sq.autonomous_cycles(sq.designed_step(d02, "D"), range(8)) == [[0, 1, 3, 7, 6, 4], [2, 5]]
q2 = {"A": (lambda e: e["Q1"] & e["Q0"], lambda e: e["Q0"], lambda e: neg(e["Q2"])), "B": (lambda e: neg(e["Q1"]), lambda e: neg(e["Q0"]), lambda e: e["Q2"]),
      "C": (lambda e: e["Q0"], lambda e: e["Q1"], lambda e: neg(e["Q2"])), "D": (lambda e: e["Q1"], lambda e: e["Q0"], lambda e: neg(e["Q2"]))}
good = []
for k, (f2, f1, f0) in q2.items():
    c = sq.Sync([("Q2", "D", {"D": f2}), ("Q1", "D", {"D": f1}), ("Q0", "D", {"D": f0})])
    if [sq.val(x) for x in c.trace((0, 0, 0), 6)] == [0, 1, 3, 7, 6, 4, 0]:
        good.append(k)
assert good == ["D"]
bl.assert_mcq(P["nx-dl-06-05-q02"], "D")
cB = sq.Sync([("Q2", "D", {"D": q2["B"][0]}), ("Q1", "D", {"D": q2["B"][1]}), ("Q0", "D", {"D": q2["B"][2]})])
assert [B(x) for x in cB.trace((0, 0, 0), 3)] == ["000", "110", "011", "000"]  # common_wrong B of q02
# q03
s03 = [0, 3, 0, 3, 1, 0, 3, 0, 3, 1]
assert sq.counter_states_needed(s03) == 5 and sq.ff_count(len(s03)) == 4 and sq.ff_count(len(set(s03))) == 2
bl.assert_nat(P["nx-dl-06-05-q03"], sq.ff_count(sq.counter_states_needed(s03)))
# q04: D design of 0 → 3 → 5 → 6 from 001
sD = sq.designed_step(dD, "D")
path = [1]
for _ in range(4):
    path.append(sD(path[-1]))
assert [b3(v) for v in path] == ["001", "111", "100", "010", "001"]
assert opts("nx-dl-06-05-q04")["D"] == "It cycles " + " → ".join(b3(v) for v in path) + " and never reaches the main cycle."
bl.assert_mcq(P["nx-dl-06-05-q04"], "D")
assert not {1, 7, 4, 2} & {0, 3, 5, 6} and [path[1], path[2]] == [7, 4]  # common_wrong B of q04: 111 and 100 are unused
# q05 common_wrong [A, B]: every unused state reaches the cycle in one clock; q09 common_wrong 8 = all states on a cycle
assert all(s98[u] in (1, 4, 2, 3) for u in (0, 5, 6, 7))
# q05: 1998 counter
q5 = {"A": s98[0] == 2, "B": s98[5] == 4, "C": s98[7] == 7, "D": sq.self_starting(lambda v: s98[v], range(8), [1, 4, 2, 3])}
assert s98[7] == 1 and s98[6] == 3
bl.assert_msq(P["nx-dl-06-05-q05"], [k for k, v in q5.items() if v])
# q06: 5-bit serial chain, t_cq 6, AND 3, t_su 2 → 4 gates to J4K4
f06 = fmax_chain(6, 3, 2, 4)
bl.assert_nat(P["nx-dl-06-05-q06"], f06)
assert round(fmax_chain(6, 3, 2, 5), 2) == 43.48 and round(fmax_chain(6, 3, 0, 4), 2) == 55.56 and round(fmax_chain(6, 3, 2, 1), 2) == 90.91
assert [w["answer"] for w in P["nx-dl-06-05-q06"]["common_wrong"]] == [43.48, 55.56, 90.91]
# q07: JK columns of Q0 for 00 → 10 → 11 → 01
nx07 = {0: 2, 2: 3, 3: 1, 1: 0}
ex = {s_: sq.excitation("JK", s_ & 1, nx07[s_] & 1) for s_ in nx07}
q7 = {"A": ex[2] == {"J": 1, "K": "x"}, "B": ex[3] == {"J": "x", "K": 0}, "C": ex[1] == {"J": "x", "K": 1},
      "D": all(ex[s_]["K"] in ("x", (s_ >> 1) & 1) for s_ in nx07)}
bl.assert_msq(P["nx-dl-06-05-q07"], [k for k, v in q7.items() if v])
assert dJ04["J0"] == ["Q1"] and dJ04["K0"] == ["Q1′"]
# q08
c08 = sq.Sync([("Q2", "JK", {"J": lambda e: e["Q1"], "K": lambda e: e["Q0"]}), ("Q1", "JK", {"J": lambda e: neg(e["Q0"]), "K": lambda e: e["Q2"]}),
               ("Q0", "JK", {"J": lambda e: e["Q2"], "K": lambda e: e["Q1"]})])
t08 = [B(x) for x in c08.trace((0, 0, 0), 5)]
assert t08 == ["000", "010", "110", "101", "001", "001"] and c08.step((0, 0, 1)) == (0, 0, 1)
asD = sq.Sync([("Q2", "D", {"D": lambda e: e["Q1"]}), ("Q1", "D", {"D": lambda e: neg(e["Q0"])}), ("Q0", "D", {"D": lambda e: e["Q2"]})])


def in_order(s_):
    e = dict(zip(["Q2", "Q1", "Q0"], s_))
    for nm, kind, fns in c08.ffs:
        e[nm] = sq.ff_next(kind, e[nm], **{k: f(e) for k, f in fns.items()})
    return tuple(e[k] for k in ("Q2", "Q1", "Q0"))


wrong_order = [(0, 0, 0)]
for _ in range(3):
    wrong_order.append(in_order(wrong_order[-1]))
o8 = opts("nx-dl-06-05-q08")
assert o8["B"] == ", ".join(B(x) for x in asD.trace((0, 0, 0), 3)[1:]) and o8["C"] == ", ".join(B(x) for x in wrong_order[1:]) and o8["D"] == "001, 010, 011"
bl.assert_mcq(P["nx-dl-06-05-q08"], [k for k, v in o8.items() if v == ", ".join(t08[1:4])][0])
# q09: 0 → 2 → 5 → 7 with T
d09 = sq.design_counter([0, 2, 5, 7], "T", 3)
assert d09["sop"] == {"T2": ["Q1"], "T1": ["1"], "T0": ["Q1"]}
cyc09 = sq.autonomous_cycles(sq.designed_step(d09, "T"), range(8))
assert cyc09 == [[0, 2, 5, 7], [1, 3, 4, 6]]
bl.assert_nat(P["nx-dl-06-05-q09"], sum(len(c) for c in cyc09 if set(c) != {0, 2, 5, 7}))
assert [w["answer"] for w in P["nx-dl-06-05-q09"]["common_wrong"]] == [0, 8] and sum(len(c) for c in cyc09) == 8
# q10
q10 = {"A": all(sq.excitation("D", q, qn)["D"] == qn for q in (0, 1) for qn in (0, 1)),
       "B": all(sq.self_starting(sq.designed_step(sq.design_counter(main, k, 3), k), range(8), main) for k in ("D", "T", "JK")),
       "C": sq.counter_states_needed([0, 1, 0, 2]) >= 4,
       # parallel gating: one AND between flip-flops for every width n, so f_max does not change with n (D is false)
       "D": len({fmax_chain(8, 4, 2, 1 if n > 1 else 0) for n in (2, 4, 8, 16)}) > 1}
bl.assert_msq(P["nx-dl-06-05-q10"], [k for k, v in q10.items() if v])
# blocks of every practice question exist in the lesson; MCQ key spread
for qid in [f"nx-dl-06-05-q{k:02d}" for k in range(1, 11)]:
    for blk in P[qid]["blocks"]:
        assert f"#{blk} " in L or f"#{blk}}}" in L, (qid, blk)
keys = [P[f"nx-dl-06-05-q{k:02d}"]["answer"] for k in range(1, 11) if P[f"nx-dl-06-05-q{k:02d}"]["type"] == "MCQ"]
assert keys == ["B", "D", "D", "A"] and max(keys.count(x) for x in "ABCD") <= 2  # 05-q01 keyed B for the chapter spread
assert len([k for k in P if k.startswith("nx-dl-06-05-")]) == 10

print("l6_05_sync_design: excitation columns, binary T counters (up/down, 2–5 bits), f_max with serial and parallel gating, "
      "D/T/JK designs of 2004, 1998, 1992 (Gray), enable and saturating counters (2017, 2026), repeated-value state counts "
      "and output logic, the 0 → 3 → 5 → 6 lock-out and both cures, the self-start criterion over every 4-state 3-bit design, "
      "traces of 2014, 2021 and the edge cases, 10 PYQ keys and 10 practice answers OK")
