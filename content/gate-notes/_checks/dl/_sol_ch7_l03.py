"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 7, Lesson 3 (logic families and
switch-level circuits): cse-1991-a-1-i, cse-1991-a-3-i, cse-1994-a-3-10, cse-1998-a-15. Every key is
re-derived in l7_03_families.py (switch-level simulation of the 1991 network, the nMOS and CMOS NAND, the
family data, the TTL levels); the tables below are computed with beyondlib. _sol_ch7.py merges this module
and writes src/gate/solutions."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import beyondlib as bz  # noqa: E402
from _sol_ch1_fp import opt  # noqa: E402

SOLUTIONS = {}


def table(title, cols, rows, labels=None, reveal=None, caption=None):
    f = {"kind": "table", "title": title, "cols": cols, "rows": rows, "mono": True}
    if labels:
        f["rowLabels"] = labels
    if reveal is not None:
        f["reveal"] = reveal
    if caption:
        f["caption"] = caption
    return f


# ── 1991 Q1(i): the pass-transistor network ───────────────────────────────
_rows91 = []
for a, b in ((0, 0), (0, 1), (1, 0), (1, 1)):
    env = {"a": a, "b": b}
    top = all(bz.conducts(t, env) for t in bz.NET_1991[:2])
    bot = all(bz.conducts(t, env) for t in bz.NET_1991[2:])
    vals = {bz.f_1991(a, b, x, y)["value"] for x in (0, 1) for y in (0, 1)}
    f = "Z (floats)" if vals == {"Z"} else ("x" if top else "y")
    _rows91.append(["on" if top else "off", "on" if bot else "off", f])
assert _rows91 == [["off", "off", "Z (floats)"], ["on", "off", "x"], ["off", "on", "y"], ["off", "off", "Z (floats)"]]
V1, V0 = bz.dec(bz.pass_voltage(1, ["p", "n"])), bz.dec(bz.pass_voltage(0, ["p", "n"]))

SOLUTIONS["cse-1991-a-1-i"] = {
    "approach": "Concept tested: **pass-transistor networks in the switch model**. An NMOS conducts when its gate is 1 and a PMOS (drawn with a bubble) when its gate is 0; transistors in series conduct only together (AND). Find the condition under which each input reaches $f$.",
    "concepts": ["Pass transistor", "NMOS and PMOS switches", "Series = AND", "Floating output"],
    "given": "Input $x$ reaches $f$ through a PMOS gated by $a$ and then an NMOS gated by $b$. Input $y$ reaches $f$ through an NMOS gated by $a$ and then a PMOS gated by $b$. The two paths meet at $f$.",
    "steps": [
        {"title": "Condition for the top path", "body": "PMOS($a$) is on when $a = 0$, NMOS($b$) when $b = 1$. In series both must be on: the top path conducts when $\\overline{a}\\,b = 1$, and then $f = x$.", "scene": {"reveal": 6}},
        {"title": "Condition for the bottom path", "body": "NMOS($a$) is on when $a = 1$, PMOS($b$) when $b = 0$: the bottom path conducts when $a\\,\\overline{b} = 1$, and then $f = y$.", "scene": {"reveal": 9}},
        {"title": "The paths never fight", "body": "$\\overline{a}b$ and $a\\overline{b}$ cannot both be 1, so $x$ and $y$ are never connected to $f$ at the same time."},
        {"title": "Combine", "body": "$f = \\overline{a}\\,b\\,x + a\\,\\overline{b}\\,y$."},
        {"title": "What the expression does not say", "body": f"For $a = b$ (00 or 11) neither path conducts: $f$ is connected to nothing and **floats**. Where $f$ is driven, the value passes one transistor of each type, so its level is degraded (with $V_{{DD}} = 5$ V and 0.7 V thresholds, a 1 arrives as {V1} V and a 0 as {V0} V).", "scene": {"reveal": 12}},
    ],
    "answer": {"value": "$f = \\overline{a}bx + a\\overline{b}y$ (and $f$ floats when $a = b$)", "matchesKey": True},
    "shortcut": "Write one product per path: the gate variable for each NMOS, its complement for each PMOS, times the path's input. OR the products.",
    "pitfalls": [
        "Reading the bubble the wrong way round (PMOS on at 1, NMOS on at 0) gives $f = a\\overline{b}x + \\overline{a}by$, with $x$ and $y$ swapped; ignoring the bubbles altogether (every device read as NMOS) gives $f = ab(x + y)$, which conducts both paths at once for $ab = 11$.",
        "Calling the circuit a multiplexer that always gives an output: for $a = b$ the output floats.",
        "Treating the series transistors as OR: a path needs every transistor on it to conduct.",
    ],
    "verification": "A switch-level simulation of the four transistors for all 16 values of $(a, b, x, y)$ gives $f = x$ for $ab = 01$, $f = y$ for $ab = 10$, and no conducting path (Z) for $ab = 00$ and $11$.",
    "animation": table("1991 network: which path conducts", ["top: ā·b", "bottom: a·b̄", "f"], _rows91,
                       ["a b = 00", "a b = 01", "a b = 10", "a b = 11"], reveal=3),
}

# ── 1991 Q3(i): advantage of CMOS over nMOS ───────────────────────────────
NAND2 = bz.AND("A", "B")
_cm, _nm = bz.cmos_gate(NAND2)[0], bz.nmos_gate(NAND2)
_fight_cmos = [bz.evaluate(_cm, {"A": a, "B": b}, "Y")["fight"] for a in (0, 1) for b in (0, 1)]
_fight_nmos = [bz.evaluate(_nm, {"A": a, "B": b}, "Y")["fight"] for a in (0, 1) for b in (0, 1)]
assert _fight_cmos == [False] * 4 and _fight_nmos == [False, False, False, True]
TC, TN = bz.transistors(_cm), bz.transistors(_nm)
assert (TC, TN) == (4, 3)

SOLUTIONS["cse-1991-a-3-i"] = {
    "approach": "Concept tested: **why CMOS replaced nMOS**. Compare the two ways of building the same gate: CMOS uses a PMOS pull-up network complementary to the NMOS pull-down, nMOS uses a single always-on load. Check each claimed advantage against that structure.",
    "concepts": ["CMOS", "nMOS", "Static power", "Logic families"],
    "given": "Options: (A) lower power dissipation, (B) greater speed, (C) smaller chip size, (D) fewer masks for fabrication, (E) none of the above. More than one may be correct.",
    "steps": [
        {"title": "Power", "body": "In CMOS exactly one of the pull-up and pull-down networks conducts for every input, so in steady state no path joins $V_{DD}$ to ground: static power is (ideally) zero. In nMOS the load is always on, so whenever the output is low the load and the pull-down conduct together and current flows continuously. **A is correct.**"},
        {"title": "Size", "body": f"A CMOS gate needs two transistors per input (a NAND2 has {TC}), an nMOS gate one per input plus the load (a NAND2 has {TN}); the PMOS devices also need their own wells. CMOS is **larger**, so C is wrong."},
        {"title": "Masks", "body": "The wells and the extra p-type implants of CMOS add fabrication steps: CMOS needs **more** masks, so D is wrong."},
        {"title": "Speed", "body": "Each CMOS input drives two gates (twice the input capacitance) and the cells are larger, so wires are longer; the PMOS devices must also be widened to keep up with the NMOS. nMOS has its own slow edge (its load is deliberately weak so that $V_{OL}$ stays low), so neither family wins on speed outright. Speed was not an advantage of CMOS over nMOS, so B is not counted."},
        {"title": "Conclusion", "body": "Only A holds, so E (none) is wrong too."},
    ],
    "answer": {"value": "(A) lower power dissipation", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Complementary networks: no static current; nMOS draws current whenever its output is low."),
        opt("B", False, "Not an advantage: each input drives two gates (twice the input capacitance) and the cells are larger."),
        opt("C", False, "CMOS needs 2n transistors for an n-input gate against n + 1, plus wells: it is larger."),
        opt("D", False, "CMOS needs more masks (wells, extra implants), not fewer."),
        opt("E", False, "A is a genuine advantage, so 'none' is wrong."),
    ],
    "shortcut": "CMOS's one decisive advantage is near-zero static power; it pays for it with area and process steps.",
    "pitfalls": [
        "Ticking B and C because CMOS is 'the modern technology': per gate it is larger and needs more masks.",
        "Confusing static power (CMOS ≈ 0) with dynamic power, which every family has.",
    ],
    "verification": f"Switch-level simulation of a NAND2 in both styles: the nMOS version has a conducting $V_{{DD}}$–ground path on input 11 (output low); the CMOS version has none on any input. Transistor counts {TC} (CMOS) and {TN} (nMOS).",
    "animation": table("CMOS vs nMOS (NAND2)", ["CMOS", "nMOS"],
                       [[TC, TN], ["none", "when Y = 0"], ["more (wells)", "fewer"], ["2 gates per input", "weak pull-up"]],
                       ["transistors", "static current", "masks", "speed limited by"]),
}

# ── 1994 Q3.10: match the families ────────────────────────────────────────
M = bz.match_1994()
assert M == {"i": "c", "ii": "a", "iii": "d", "iv": "b"}
FAM = {"i": "ECL", "ii": "GaAs", "iii": "TTL", "iv": "CMOS"}
KEY94 = ", ".join(f"({k})-({M[k]})" for k in ("i", "ii", "iii", "iv"))
assert KEY94 == "(i)-(c), (ii)-(a), (iii)-(d), (iv)-(b)"

SOLUTIONS["cse-1994-a-3-10"] = {
    "approach": "Concept tested: **the signature of each logic family**. Split first by device type (bipolar or unipolar), then use speed, power and density to separate the two families on each side.",
    "concepts": ["Logic families", "ECL", "TTL", "CMOS", "GaAs"],
    "given": "List I: (i) ECL, (ii) GaAs, (iii) TTL, (iv) CMOS. List II: (a) unipolar, very high speed, difficult to fabricate, good resistance to radiation; (b) unipolar, low power, modest speed and packing density; (c) bipolar, highest speed silicon IC, low packing density; (d) bipolar, modest packing density, inexpensive.",
    "steps": [
        {"title": "Device type", "body": "ECL and TTL are built from bipolar transistors, so they take (c) and (d). GaAs (MESFET) and CMOS are field-effect, unipolar families, so they take (a) and (b)."},
        {"title": "The two bipolar families", "body": "ECL never saturates its transistors, which makes it the fastest silicon family, at high static power and so low packing density: (i)–(c). TTL is the cheap, moderate-density workhorse: (iii)–(d)."},
        {"title": "The two unipolar families", "body": "GaAs is very fast and radiation-hard but hard and expensive to fabricate: (ii)–(a). CMOS is the low-power family: (iv)–(b). (In 1994 terms CMOS speed and density were 'modest'; the low power is what identifies it.)"},
        {"title": "Eliminate the other pairings", "body": "(c) says bipolar, so it cannot be GaAs or CMOS; (a) says unipolar and very high speed, so it cannot be CMOS ('modest speed'): hence (ii)–(a) and (iv)–(b). (d) 'inexpensive, modest density' rules out ECL (low density, costly): hence (iii)–(d), leaving (i)–(c). Each description fits exactly one family."},
    ],
    "answer": {"value": KEY94, "matchesKey": True},
    "shortcut": "Bipolar or unipolar first; then the fastest of each pair is ECL (bipolar) and GaAs (unipolar).",
    "pitfalls": [
        "Giving ECL the 'very high speed, unipolar' description: ECL is bipolar silicon; the unipolar very-fast family is GaAs.",
        "Giving CMOS 'inexpensive, bipolar': CMOS is unipolar; the cheap bipolar family is TTL.",
        "Matching CMOS to (a) because modern CMOS is fast: (a) says 'difficult to fabricate' and 'radiation-hard', the GaAs signature.",
    ],
    "verification": "Each List II description is satisfied by exactly one family in the lesson's family table (device type, speed, power, density, cost), and each is used once.",
    "animation": table("Families: device type and signature", ["device", "signature", "List II"],
                       [[bz.FAMILIES[FAM[k]]["device"], sig, f"({M[k]})"] for k, sig in
                        (("i", "fastest silicon"), ("ii", "very fast, radiation-hard"), ("iii", "inexpensive"), ("iv", "low power"))],
                       [f"({k}) {FAM[k]}" for k in ("i", "ii", "iii", "iv")]),
}

# ── 1998 Q15: the TTL logic-1 level ───────────────────────────────────────
T = bz.TTL
R98 = {k: bz.interval_reading(v) for k, v in bz.OPT_1998.items()}
assert [k for k, r in R98.items() if r == "all logic 1"] == ["D"]
NMH, NML = bz.noise_margins(T)
d = bz.dec

SOLUTIONS["cse-1998-a-15"] = {
    "approach": "Concept tested: **TTL input and output voltage levels**. Standard TTL reads an input as 1 from $V_{IH} = 2.0$ V up to $V_{CC}$ and as 0 up to $V_{IL} = 0.8$ V; its outputs give at least 2.4 V for a 1. No option names 2.0 V, so read the question as: which option describes voltages that are all valid TTL logic 1s?",
    "concepts": ["TTL levels", "V_IH and V_IL", "Noise margin"],
    "given": "Options: (A) any voltage above 2.5 V; (B) between 0.8 V and 5.0 V; (C) below 5.0 V; (D) below $V_{cc}$ but above 2.8 V.",
    "steps": [
        {"title": "The standard TTL levels", "body": f"$V_{{OH}} = {d(T['VOH'])}$ V, $V_{{OL}} = {d(T['VOL'])}$ V, $V_{{IH}} = {d(T['VIH'])}$ V, $V_{{IL}} = {d(T['VIL'])}$ V, $V_{{CC}} = {d(T['VCC'])}$ V. An input reads 1 for $2.0\\ \\text{{V}} \\le v \\le V_{{CC}}$, 0 for $0 \\le v \\le 0.8$ V, and is undefined in between."},
        {"title": "Option A", "body": "Every voltage from 2.5 V up to $V_{CC}$ is a valid 1, so A comes close. But 'above 2.5 V' has no upper limit: it also includes voltages above $V_{CC}$, outside the operating range of the gate."},
        {"title": "Options B and C", "body": "'Between 0.8 V and 5.0 V' includes the undefined band 0.8–2.0 V; 'below 5.0 V' includes 0 V, a logic 0. Neither describes logic 1."},
        {"title": "Option D", "body": "'Below $V_{CC}$ but above 2.8 V' lies entirely inside 2.0 V to $V_{CC}$: every voltage in it is read as a 1. It is the only option of which that is true, so D is the accepted key. It is the best-supported reading of a loosely worded question, not an official TTL figure: 2.8 V appears in no data sheet, and A (2.5 V up to $V_{CC}$, all valid 1s) fails only because it has no upper end."},
    ],
    "answer": {"value": "(D) any voltage below $V_{cc}$ but above 2.8 V", "choice": ["D"], "matchesKey": True,
               "keyNote": "No option states the real threshold $V_{IH} = 2.0$ V, and 2.8 V is not a TTL data-sheet figure. D is the best-supported reading ('a range of voltages that are all valid logic 1s within the supply'), not an official TTL figure; the key could not be checked against an official answer. The scan of the 1998 paper matches the bank."},
    "optionAnalysis": [
        opt("A", False, "Closest wrong option: 2.5 V to V_CC are valid 1s, but it is unbounded above and includes voltages higher than V_CC, which are not valid inputs."),
        opt("B", False, "Includes 0.8–2.0 V, the undefined region (and 0.8 V itself is a logic 0)."),
        opt("C", False, "Includes 0 V to 0.8 V, which TTL reads as logic 0."),
        opt("D", True, "2.8 V to V_CC lies wholly inside the TTL logic-1 input band 2.0 V to V_CC."),
    ],
    "shortcut": "Check each range against the band 2.0 V to $V_{CC}$: only a range wholly inside it describes logic 1.",
    "pitfalls": [
        "Choosing A: its voltages up to $V_{CC}$ are valid 1s too, but it has no upper end, which makes D the better fit.",
        f"Quoting the output level 2.4 V as the input threshold: inputs accept 1 from 2.0 V; the gap is the noise margin $NM_H = {d(NMH)}$ V.",
    ],
    "verification": f"Testing each option's range against the TTL input levels: A unbounded above the supply, B and C include undefined and logic-0 voltages, D all logic 1. Noise margins $NM_H = {d(NMH)}$ V, $NM_L = {d(NML)}$ V.",
    "animation": table("TTL: how an input reads each option's range", ["range", "reads as"],
                       [["> 2.5 V", "unbounded above V_CC"], ["0.8 – 5.0 V", "undefined + 1"], ["< 5.0 V", "0 + undefined + 1"], ["2.8 V – V_CC", "all logic 1"]],
                       ["A", "B", "C", "D"]),
}
