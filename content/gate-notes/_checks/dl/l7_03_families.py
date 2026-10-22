"""Checks for dl/07-beyond-syllabus/03-logic-families: every switch-network value, conduction condition,
pass level, CMOS gate (transistor count, exclusivity, inversion), sizing figure, noise margin, fan-out,
power and power-delay number of the lesson is recomputed with beyondlib (a switch-level MOS simulator and
exact Fractions); the four PYQ keys are re-derived and asserted against the bank; every practice answer,
MSQ option and MCQ distractor is re-derived."""
import pathlib
import re
import sys
from fractions import Fraction as F
from itertools import product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import beyondlib as bz  # noqa: E402

L = bz.lesson_text("03-logic-families.md")
has = lambda *s: bl.must_contain(L, *s)  # noqa: E731
P = bz.practice()
bank = bl.bank()
d = bz.dec
AND, OR = bz.AND, bz.OR
assert L.split("---\n", 2)[2].lstrip().startswith("*Optional: beyond the core GATE syllabus.*")
assert sorted(re.findall(r':::pyq\{id="([^"]+)"', L)) == ["cse-1991-a-1-i", "cse-1991-a-3-i", "cse-1994-a-3-10", "cse-1998-a-15"]


def depth(e, kind):
    """Longest series stack of a network built from e (NMOS: AND = series; PMOS: OR = series)."""
    if isinstance(e, str):
        return 1
    ds = [depth(x, kind) for x in e[1]]
    return sum(ds) if (e[0] == "and") == (kind == "n") else max(ds)


def single(kind, gate, val):
    """One transistor from a driven terminal (value val) to an otherwise unconnected node o."""
    return bz.evaluate([(kind, "g", "x", "o")], {"g": gate}, "o", {"x": val})


# ── The switch model ───────────────────────────────────────────────────────
assert single("n", 1, 0)["value"] == 0 and single("n", 1, 0)["level"] == "strong"
assert single("n", 1, 1)["value"] == 1 and single("n", 1, 1)["level"] == "degraded"
assert single("p", 0, 1)["level"] == "strong" and single("p", 0, 0)["level"] == "degraded"
assert single("n", 0, 1)["value"] == "Z" and single("p", 1, 0)["value"] == "Z"
assert bz.VDD - bz.VTN == F("4.3") and bz.pass_voltage(1, ["n"]) == F("4.3") and bz.pass_voltage(0, ["p"]) == F("0.7")
assert bz.pass_voltage(0, ["n"]) == 0 and bz.pass_voltage(1, ["p"]) == 5
has("an NMOS passes a 1 as 4.3 V and a PMOS passes a 0 as", "Input 0 V: output 0 V (strong 0). Input 5 V: output $5 - 0.7 = 4.3$ V (degraded 1).",
    "Gate 0: the output floats (Z).", "5 V\nstrong, 0.7 V degraded 0.")

# medium: x -> NMOS(a) -> NMOS(b) -> f, NMOS(c) from x to f
NET_M = [("n", "a", "x", "m"), ("n", "b", "m", "f"), ("n", "c", "x", "f")]
rows_m = [f"{a}{b}{c}" for a, b, c in product((0, 1), repeat=3)
          if bz.evaluate(NET_M, {"a": a, "b": b, "c": c}, "f", {"x": 1})["value"] != "Z"]
assert rows_m == [f"{a}{b}{c}" for a, b, c in product((0, 1), repeat=3) if (a & b) | c] == ["001", "011", "101", "110", "111"]
has("Rows $(a, b, c) = 001, 011, 101, 110, 111$: five of the eight. In the other three the output floats.")
# series-parallel theorem on the medium network (conduction function ab + c)
for a, b, c in product((0, 1), repeat=3):
    assert bz.net_conducts(NET_M, {"a": a, "b": b, "c": c}, "x", "f") == bool((a & b) | c)

# ── The 1991 network (cse-1991-a-1-i) ──────────────────────────────────────
for a, b, x, y in product((0, 1), repeat=4):
    r = bz.f_1991(a, b, x, y)
    if a == b:
        assert r["value"] == "Z"
    else:
        assert r["value"] == ((1 - a) & b & x | a & (1 - b) & y) and r["level"] == "degraded" and not r["fight"]
        assert r["value"] == (x if (a, b) == (0, 1) else y)
assert d(bz.pass_voltage(1, ["p", "n"])) == "4.3" and d(bz.pass_voltage(0, ["n", "p"])) == "0.7"
assert bank["cse-1991-a-1-i"]["type"] == "FILL" and bank["cse-1991-a-1-i"]["answer"] == "$f = \\overline{a}bx + a\\overline{b}y$"
has("$f = \\overline{a}bx + a\\overline{b}y$, with $f$ **floating** for $a = b$", "$ab = 01$: top on, $f = x$. $ab = 10$: bottom on, $f = y$.",
    "drops to $4.3$ V at the NMOS; a 0 crosses the NMOS fully but stops at\n$0.7$ V at the PMOS")

# edge: x via NMOS(s), y via PMOS(s)
NET_E = [("n", "s", "x", "f"), ("p", "s", "y", "f")]
lv = {}
for s, x, y in product((0, 1), repeat=3):
    r = bz.evaluate(NET_E, {"s": s}, "f", {"x": x, "y": y})
    assert r["value"] == (x if s else y) and not r["fight"]
    lv[(s, x if s else y)] = r["level"]
assert lv == {(1, 1): "degraded", (1, 0): "strong", (0, 1): "strong", (0, 0): "degraded"}
assert bz.pass_voltage(1, ["n"]) == F("4.3") and bz.pass_voltage(1, ["p"]) == 5 and bz.pass_voltage(0, ["p"]) == F("0.7")
has("$f = sx + \\overline{s}y$: a 2:1 multiplexer with only two transistors.", "$x = 1$ through the NMOS arrives as $4.3$ V (degraded); $y = 1$ through the PMOS arrives as $5$ V (strong);")

# transmission gate MUX: strong both ways, 4 transistors
for s, i0, i1 in product((0, 1), repeat=3):
    r = bz.evaluate(bz.TG_MUX, {"s": s}, "y", {"i0": i0, "i1": i1})
    assert r["value"] == (i1 if s else i0) and r["level"] == "strong"
assert len(bz.TG_MUX) == 4
has("no floating case, using 4 transistors")

# ── CMOS gates ─────────────────────────────────────────────────────────────
GATES = {"inverter": "A", "NAND2": AND("A", "B"), "NOR2": OR("A", "B"), "NAND3": AND("A", "B", "C"),
         "AOI21": OR(AND("A", "B"), "C"), "OAI22": AND(OR("A", "B"), OR("C", "D")), "AOI22": OR(AND("A", "B"), AND("C", "D")),
         "q02": AND(OR("A", "B"), "C")}
COUNT = {k: bz.transistors(bz.cmos_gate(e)[0]) for k, e in GATES.items()}
assert COUNT == {"inverter": 2, "NAND2": 4, "NOR2": 4, "NAND3": 6, "AOI21": 6, "OAI22": 8, "AOI22": 8, "q02": 6}
has("inverter (1 + 1 = 2 transistors), NAND2 (two NMOS in series, two PMOS in parallel: 4), NOR2 (two",
    "NAND3 (6), the AND-OR-invert $\\overline{AB + C}$ (6).")
for k, e in GATES.items():
    assert bz.exclusive(e), k  # duality theorem: exactly one network on, Y = NOT e, strong
    vs = bz.variables(e)
    allt = bz.cmos_gate(e)[0]
    # inverting-stage theorem: raising any input never raises Y
    for bits in product((0, 1), repeat=len(vs)):
        env = dict(zip(vs, bits))
        y0 = bz.evaluate(allt, env, "Y")["value"]
        for v in vs:
            if env[v] == 0:
                assert bz.evaluate(allt, {**env, v: 1}, "Y")["value"] <= y0, (k, env, v)
# AND rises with an input, so it is not a single stage; NAND2 + inverter = 6
assert bz.ev(AND("A", "B"), {"A": 1, "B": 0}) < bz.ev(AND("A", "B"), {"A": 1, "B": 1}) and COUNT["NAND2"] + COUNT["inverter"] == 6
has("$AB$ needs a NAND2 followed by an inverter: $4 + 2 = 6$ transistors")
# NAND2 rows
nand = bz.cmos_gate(GATES["NAND2"])
assert [bz.evaluate(nand[0], {"A": a, "B": b}, "Y")["value"] for a, b in product((0, 1), repeat=2)] == [1, 1, 1, 0]
assert [bz.net_conducts(nand[1], {"A": a, "B": b}, "Y", "GND") for a, b in product((0, 1), repeat=2)] == [False, False, False, True]
has("$Y = 1, 1, 1, 0$ for $AB = 00, 01, 10, 11$.")
# AOI21 spot rows
aoi = bz.cmos_gate(GATES["AOI21"])[0]
assert bz.evaluate(aoi, {"A": 1, "B": 1, "C": 0}, "Y")["value"] == 0 and bz.evaluate(aoi, {"A": 1, "B": 0, "C": 0}, "Y")["value"] == 1
has("6 transistors (three literals, $2 \\times 3$)")
# OAI22: 8 transistors, stacks of two on each side
assert depth(GATES["OAI22"], "n") == 2 and depth(GATES["OAI22"], "p") == 2
has("$4$ literals: $8$ transistors; series stacks of 2 on both sides.")

# ── NAND vs NOR sizing ─────────────────────────────────────────────────────
for n in range(1, 8):
    assert bz.sized_area("NAND", n) == n * n + 2 * n and bz.sized_area("NOR", n) == n + 2 * n * n
    assert bz.sized_area("NOR", n) - bz.sized_area("NAND", n) == n * n - n
    assert depth(AND(*"ABCDEFG"[:n]), "n") == n == depth(OR(*"ABCDEFG"[:n]), "p")
assert [bz.sized_area(k, n) for n in (1, 2, 3) for k in ("NAND", "NOR")] == [3, 3, 8, 10, 15, 21]
assert F(bz.sized_area("NOR", 3), bz.sized_area("NAND", 3)) == F(7, 5)  # 40 % bigger
assert bz.worst_resistance("NAND", 2) == (2, 2) and bz.worst_resistance("NOR", 2) == (1, 4)
has("$n = 1$ gives $3$ for both", "$n = 2$: NAND 8, NOR 10.", "$n = 3$: NAND 15, NOR 21.", "$A_{\\text{NAND}}(3) = 9 + 6 = 15$",
    "$A_{\\text{NOR}}(3) = 3 + 18 = 21$", "NAND3 15 units of width against NOR3 21: the NOR is 40%",
    "NAND2 pulls down through $2R$ and up through $2R$; NOR2 pulls down through $R$ but up through $4R$.")

# ── Levels and noise margins ───────────────────────────────────────────────
T, C5 = bz.TTL, bz.CMOS5
assert bz.noise_margins(T) == (F("0.4"), F("0.4")) and bz.noise_margins(C5) == (F("1.4"), F("1.4"))
assert [d(T[k], 1) for k in ("VOH", "VOL", "VIH", "VIL")] == ["2.4", "0.4", "2.0", "0.8"]
assert [d(C5[k]) for k in ("VOH", "VOL", "VIH", "VIL")] == ["4.9", "0.1", "3.5", "1.5"] and C5["VIH"] == F(7, 10) * 5 and C5["VIL"] == F(3, 10) * 5
has("| Standard TTL ($V_{CC} = 5$ V) | 2.4 V | 0.4 V | 2.0 V | 0.8 V | 0.4 V | 0.4 V |",
    "| 4.9 V | 0.1 V | 3.5 V | 1.5 V | 1.4 V | 1.4 V |", "TTL: $NM_H = 2.4 - 2.0 = 0.4$ V; CMOS: $4.9 - 3.5 = 1.4$ V.",
    "TTL: $NM_L = 0.8 - 0.4 = 0.4$ V; CMOS: $1.5 - 0.1 = 1.4$ V.")
# mixed: TTL output into a CMOS input
nmh, nml = T["VOH"] - C5["VIH"], C5["VIL"] - T["VOL"]
assert (nmh, nml) == (F("-1.1"), F("1.1")) and bz.classify(T["VOH"], C5) == "undefined" and bz.classify("2.0", {**C5, "VIH": F(2)}) == "1"
has("$NM_H = V_{OH}^{TTL} - V_{IH}^{CMOS} = 2.4 - 3.5 = -1.1$ V.", "$NM_L = V_{IL}^{CMOS} - V_{OL}^{TTL} = 1.5 - 0.4 = 1.1$ V.")

# ── GATE 1998 (cse-1998-a-15) ──────────────────────────────────────────────
R98 = {k: bz.interval_reading(v) for k, v in bz.OPT_1998.items()}
assert R98["A"] == "unbounded above the supply" and R98["D"] == "all logic 1"
assert "undefined" in R98["B"] and "0" in R98["C"] and "undefined" in R98["C"]
assert bz.classify("0.8", T) == "0" and bz.classify("1.5", T) == "undefined" and bz.classify("2.8", T) == "1"
assert [k for k, r in R98.items() if r == "all logic 1"] == bl.key_letters(bank["cse-1998-a-15"]["answer"]) == ["D"]
opts98 = bl.option_values(bank["cse-1998-a-15"])
assert "2.8" in opts98["D"] and "2.5" in opts98["A"]
assert bz.classify("2.5", T) == "1" and bz.classify("2.0", T) == "1" and bz.classify(T["VCC"], T) == "1"  # A's voltages up to V_CC are valid 1s
has("So the accepted key is D, chosen because", "A comes closest (every voltage from 2.5 V up to $V_{CC}$ is also a valid 1)",
    "Treat D as the best-supported reading of a loosely worded question,\nnot as an official TTL figure")

# ── Fan-out ────────────────────────────────────────────────────────────────
fo = {k: bz.fanout_of(*v) for k, v in {"std": (bz.TTL_STD, bz.TTL_STD), "ls": (bz.TTL_LS, bz.TTL_LS), "ls-std": (bz.TTL_LS, bz.TTL_STD)}.items()}
assert fo["std"] == (10, 10, 10) and fo["ls"] == (20, 20, 20) and fo["ls-std"] == (5, 5, 10)
has("so the fan-out is $\\min(10, 10) = 10$", "Fan-out $= \\min(20, 20) = 20$.", "fan-out $= \\min(5, 10) = 5$.")

# ── Power ──────────────────────────────────────────────────────────────────
C, f = F(10, 10 ** 12), 10 ** 7
assert C * 25 == F(250, 10 ** 12) and bz.dyn_power(C, 5, f) == F(25, 10 ** 4)
p33 = bz.dyn_power(C, F("3.3"), f)
assert p33 == F(1089, 10 ** 6) and round(float(1 - p33 / bz.dyn_power(C, 5, f)) * 100) == 56 and F("1.7") / 5 == F(34, 100)
assert bz.dyn_power(C, F("2.5"), f) * 4 == bz.dyn_power(C, 5, f)
has("$10^{-11} \\times 25 \\times 10^{7} = 2.5$ mW", "At 5 V: $C V^2 = 10\\ \\text{pF} \\times 25 = 250$ pJ per cycle (125 pJ in the PMOS, 125 pJ in the NMOS).",
    "$P = 250\\ \\text{pJ} \\times 10^7 = 2.5$ mW.", "At 3.3 V: $10\\ \\text{pF} \\times 10.89 \\times 10^7 = 1.089$ mW.", "(a 56% saving from a 34% lower supply)")
pdp = {k: bz.pdp(bz.FAMILIES[k]["p_mw"] / 1000, bz.FAMILIES[k]["tpd_ns"] / 10 ** 9) * 10 ** 12 for k in ("TTL", "74LS", "ECL")}
assert pdp == {"TTL": 100, "74LS": 19, "ECL": 25}
has("standard TTL $10\\ \\text{mW} \\times 10\\ \\text{ns} = 100$ pJ", "$2\\ \\text{mW} \\times 9.5\\ \\text{ns} = 19$ pJ; ECL $25\\ \\text{mW} \\times 1\\ \\text{ns} = 25$ pJ.")

# ── nMOS vs CMOS (cse-1991-a-3-i) and the static-current theorem ───────────
for e in (AND("A", "B"), OR("A", "B"), OR(AND("A", "B"), "C"), "A"):
    vs = bz.variables(e)
    nm, cm = bz.nmos_gate(e), bz.cmos_gate(e)[0]
    for bits in product((0, 1), repeat=len(vs)):
        env = dict(zip(vs, bits))
        rn = bz.evaluate(nm, env, "Y")
        assert rn["value"] == 1 - bz.ev(e, env) and rn["fight"] == bool(bz.ev(e, env))
        assert not bz.evaluate(cm, env, "Y")["fight"]
    assert bz.transistors(nm) == len(vs) + 1 and bz.transistors(cm) == 2 * len(vs)
assert bz.nand_transistors(2, "nMOS") == 3 and bz.nand_transistors(2, "CMOS") == 4
assert bl.key_letters(bank["cse-1991-a-3-i"]["answer"]) == ["A"]
assert [o["l"] for o in bank["cse-1991-a-3-i"]["options"]] == list("ABCDE")
has("($2n$ transistors against $n + 1$")

# ── GATE 1994 (cse-1994-a-3-10) ────────────────────────────────────────────
M = bz.match_1994()
key94 = ", ".join(f"({k})-({M[k]})" for k in ("i", "ii", "iii", "iv"))
assert key94 == bank["cse-1994-a-3-10"]["answer"] == "(i)-(c), (ii)-(a), (iii)-(d), (iv)-(b)"
assert bz.FAMILIES["ECL"]["device"] == bz.FAMILIES["TTL"]["device"] == "bipolar"
assert bz.FAMILIES["CMOS"]["device"] == bz.FAMILIES["GaAs"]["device"] == "unipolar"
# ex-fam-match: our own shuffled descriptions, each satisfied by exactly one family
OWN = {"P": lambda f: f["device"] == "bipolar" and f["cost"] == "inexpensive",
       "Q": lambda f: f["device"] == "unipolar" and f.get("very_fast") and f.get("radiation_hard") and f["cost"] == "high",
       "R": lambda f: f["device"] == "unipolar" and f.get("low_power"),
       "S": lambda f: f["device"] == "bipolar" and f.get("fastest_silicon") and f["p_mw"] > 10}
mine_match = {fam: [k for k, t in OWN.items() if t(bz.FAMILIES[fam])] for fam in ("ECL", "GaAs", "TTL", "CMOS")}
assert mine_match == {"ECL": ["S"], "GaAs": ["Q"], "TTL": ["P"], "CMOS": ["R"]}
assert pdp["74LS"] < pdp["ECL"]
has("ECL–S, GaAs–Q, TTL–P, CMOS–R. By PDP, 74LS (19 pJ) beats ECL (25 pJ)",
    "74LS: $2\\ \\text{mW} \\times 9.5\\ \\text{ns} = 19$ pJ; ECL: $25\\ \\text{mW} \\times 1\\ \\text{ns} = 25$ pJ.",
    'Older comparisons, including GATE 1994, describe CMOS as "low power; modest speed and packing density"')

# ── Practice ───────────────────────────────────────────────────────────────
q = P["nx-dl-07-03-q01"]
assert single("n", 1, 1)["level"] == "degraded" and bz.pass_voltage(1, ["n"]) == F("4.3")
bl.assert_mcq(q, bl.which(bl.option_values(q), lambda t: t.startswith(f"{d(bz.pass_voltage(1, ['n']))} V, a degraded"))[0])
# q02: which PDN conducts exactly when (A + B)C
q = P["nx-dl-07-03-q02"]
cand = {"A": [("n", "A", "Y", "m1"), ("n", "B", "m1", "m2"), ("n", "C", "m2", "GND")],
        "B": [("n", v, "Y", "GND") for v in "ABC"],
        "C": [("n", "A", "Y", "m1"), ("n", "B", "m1", "GND"), ("n", "C", "Y", "GND")],
        "D": [("n", "A", "Y", "m1"), ("n", "B", "Y", "m1"), ("n", "C", "m1", "GND")]}
ok = [k for k, net in cand.items() if all(bz.net_conducts(net, dict(zip("ABC", bits)), "Y", "GND") == bool(bz.ev(GATES["q02"], dict(zip("ABC", bits))))
                                          for bits in product((0, 1), repeat=3))]
assert ok == ["D"]
bl.assert_mcq(q, ok[0])
bl.assert_nat(P["nx-dl-07-03-q03"], COUNT["AOI22"])
assert bz.transistors(bz.nmos_gate(GATES["AOI22"])) == 5 and COUNT["AOI22"] // 2 == 4
# q04
rn, rr = bz.worst_resistance("NAND", 2), bz.worst_resistance("NOR", 2)
st4 = {"A": depth(GATES["NAND2"], "n") == 2, "B": depth(GATES["NOR2"], "p") == 2, "C": rr[1] == 2 * rn[0],
       "D": COUNT["NOR2"] < COUNT["NAND2"]}
bl.assert_msq(P["nx-dl-07-03-q04"], [k for k, v in st4.items() if v])
# q05
fam = {"VOH": F("2.7"), "VOL": F("0.5"), "VIH": F("2.0"), "VIL": F("0.8")}
nm5 = bz.noise_margins(fam)
q = P["nx-dl-07-03-q05"]
bl.assert_mcq(q, bl.which(bl.option_values(q), lambda t: t == f"{d(nm5[0])} V and {d(nm5[1])} V")[0])
assert bl.option_values(q)["C"] == f"{d(nm5[1])} V and {d(nm5[0])} V"
# q06
p6 = bz.dyn_power(F(20, 10 ** 12), F("3.3"), 5 * 10 ** 7) * 1000
assert p6 == F("10.89")
bl.assert_nat(P["nx-dl-07-03-q06"], float(p6))
assert float(p6 / 2) == 5.445
# q07
q = P["nx-dl-07-03-q07"]
bl.assert_mcq(q, bl.which(bl.option_values(q), lambda t: t == str(fo["ls-std"][0]))[0])
assert bl.option_values(q)["A"] == str(fo["ls"][0]) and bl.option_values(q)["B"] == str(int(fo["ls-std"][2]))
# q08: the edge network with the device types swapped (x via PMOS(s), y via NMOS(s)); levels of a 0
NET_Q8 = [("p", "s", "x", "f"), ("n", "s", "y", "f")]
r8 = {(s, x, y): bz.evaluate(NET_Q8, {"s": s}, "f", {"x": x, "y": y}) for s, x, y in product((0, 1), repeat=3)}
st8 = {"A": all(r["value"] == ((1 - s) & x | s & y) for (s, x, y), r in r8.items()),
       "B": all(r["value"] != "Z" for r in r8.values()),
       "C": r8[(0, 0, 0)]["value"] == 0 and r8[(0, 0, 0)]["level"] == "strong",
       "D": r8[(1, 0, 0)]["value"] == 0 and r8[(1, 0, 0)]["level"] == "strong"}
assert r8[(0, 0, 1)]["level"] == "degraded" and bz.pass_voltage(0, ["p"]) == F("0.7") and bz.pass_voltage(0, ["n"]) == 0
bl.assert_msq(P["nx-dl-07-03-q08"], [k for k, v in st8.items() if v])
assert P["nx-dl-07-03-q08"]["options"][0]["t"] == "$f = \\overline{s}\\,x + s\\,y$" and NET_Q8 != NET_E

mine = sorted(k for k in P if k.startswith("nx-dl-07-03-"))
assert len(mine) == 8
mcq = [P[k]["answer"] for k in mine if P[k]["type"] == "MCQ"]
assert sorted(set(mcq)) == ["A", "B", "D"]
ids = set(re.findall(r"\{#([a-z0-9-]+)", L))
for k in mine:
    assert set(P[k]["blocks"]) <= ids, (k, set(P[k]["blocks"]) - ids)
print("l7_03_families: switch model, pass networks (the 1991 network on all 16 rows), TG MUX, 8 CMOS gates "
      "(duality, inversion, counts), sizing, margins, the 1998 intervals, fan-out, power, PDP, nMOS static current, "
      "the 1994 match, 4 PYQ keys and 8 practice answers OK")
