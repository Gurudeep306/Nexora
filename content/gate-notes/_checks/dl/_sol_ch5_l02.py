"""Teacher-style v2 solutions for the 19 PYQs of Digital Logic Chapter 5, Lesson 2 (Multiplexers).

Merged by _sol_ch5.py, which writes them into src/gate/solutions/<paper>.json. Every key is re-derived by
comblib enumeration in l5_02_mux.py; the truth tables in the animations are generated here from the same
netlists (never typed by hand).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import comblib as cl  # noqa: E402
from _sol_ch1_fp import opt  # noqa: E402

SOLUTIONS = {}


def m2(s, i0, i1, name):
    return (name, "MUX", {"d": [i0, i1], "s": [s]})


def tt_frame(net, vars_, outs, title, labels=None):
    """A truth-table frame: one row per input combination, the inputs and then the named lines."""
    labels = labels or outs
    rows = []
    for r in cl.rows(vars_):
        v = cl.evaluate(net, r)
        rows.append([r[x] for x in vars_] + [v[o] for o in outs])
    return {"kind": "table", "title": title, "cols": list(vars_) + list(labels), "rows": rows, "mono": True}


def hl_rows(net, vars_, out, tone="success"):
    return [{"r": i, "tone": tone} for i, r in enumerate(cl.rows(vars_)) if cl.evaluate(net, r)[out]]


ABC, PQR, XYZ = list("ABC"), list("PQR"), list("xyz")

# ── 1996-a-47 ───────────────────────────────────────────────────────────────
n = [("f", "MUX", {"d": ["C", "~C", "~C", "C"], "s": ["A", "B"]})]
SOLUTIONS["cse-1996-a-47"] = {
    "approach": "Concept tested: **reading a 4:1 MUX** whose data inputs are a variable and its complement. Case-split on the select lines $S_1 = A$, $S_0 = B$: each select value passes one data input, and the four cases together are the function.",
    "concepts": ["Multiplexer equation", "Case split on selects", "3-input XOR (parity)"],
    "given": "4:1 MUX, $S_1 = A$, $S_0 = B$; $I_0 = C$, $I_1 = \\overline{C}$, $I_2 = \\overline{C}$, $I_3 = C$.",
    "steps": [
        {"title": "Write the MUX equation", "body": "$f = \\overline{A}\\,\\overline{B}\\,I_0 + \\overline{A}B\\,I_1 + A\\overline{B}\\,I_2 + AB\\,I_3 = \\overline{A}\\,\\overline{B}C + \\overline{A}B\\overline{C} + A\\overline{B}\\,\\overline{C} + ABC$."},
        {"title": "Read it as a rule", "body": "When $A = B$ (select 00 or 11) the output is $C$; when $A \\ne B$ (01 or 10) it is $\\overline{C}$. Copying $C$ when $A \\oplus B = 0$ and inverting it when $A \\oplus B = 1$ is exactly $(A \\oplus B) \\oplus C$.", "scene": {"hl": hl_rows(n, ABC, "f")}},
        {"title": "Confirm with the 1s", "body": "$f = 1$ on rows 001, 010, 100, 111, the rows with an odd number of 1s: the 3-input XOR."},
    ],
    "answer": {"value": "(C) $A \\oplus B \\oplus C$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\overline{A}\\,\\overline{B}C + \\overline{A}B\\overline{C} + ABC$ has only three of the four minterms; it misses $A\\overline{B}\\,\\overline{C}$ (row 100), where the MUX passes $I_2 = \\overline{C} = 1$."),
        opt("B", False, "$A + B + C$ is 1 on seven rows; at $ABC = 011$ the selects $AB = 01$ pass $I_1 = \\overline{C} = 0$, but the OR is 1."),
        opt("C", True, "The case split gives $C$ when $A = B$ and $\\overline{C}$ when $A \\ne B$: $A \\oplus B \\oplus C$."),
        opt("D", False, "$AB + BC + CA$ is the majority (carry) function, 1 on 011, 101, 110, 111; at 011 the MUX outputs $\\overline{C} = 0$."),
    ],
    "shortcut": "Data pattern $C, \\overline{C}, \\overline{C}, C$ is the XOR column $0, 1, 1, 0$ of the selects with $C$ for 0 and $\\overline{C}$ for 1: the answer is always selects-XOR-$C$.",
    "pitfalls": ["Taking $S_0$ as the MSB, which does not matter here (the pattern is symmetric) but does in most MUX questions.", "Picking (A) because it looks like a canonical SOP: count its minterms."],
    "verification": "Enumerating the 8 rows of the netlist gives 1s exactly at 1, 2, 4, 7, the minterms of $A \\oplus B \\oplus C$.",
    "animation": tt_frame(n, ABC, ["f"], "4:1 MUX with data C, C′, C′, C"),
}

# ── 1996-a-53 (descriptive) ────────────────────────────────────────────────
SOLUTIONS["cse-1996-a-53"] = {
    "approach": "Concept tested: **a MUX as a function selector**. The control inputs $C_1 C_0$ choose one of four functions of $A, B$, which is exactly what a 4:1 MUX with $C_1, C_0$ on its selects does; the data inputs carry the four functions, built from the allowed gates.",
    "concepts": ["Function selection", "MUX with gates on the data lines", "Sharing a gate output"],
    "given": "$C_1 C_0 = 00 \\to \\overline{A + B}$, $01 \\to A + B$, $10 \\to A \\oplus B$, $11 \\to AB$. Allowed: one 4:1 MUX, one 2-input XOR, one 2-input AND, one 2-input OR, one inverter.",
    "steps": [
        {"title": "Selects", "body": "Connect $S_1 = C_1$ and $S_0 = C_0$. Then the MUX passes $I_{(C_1 C_0)_2}$: $I_0$ for 00, $I_1$ for 01, $I_2$ for 10, $I_3$ for 11."},
        {"title": "Data inputs from the gates", "body": "$I_1 = A + B$ (the OR gate), $I_2 = A \\oplus B$ (the XOR gate), $I_3 = AB$ (the AND gate)."},
        {"title": "NOR without a NOR gate", "body": "Only one inverter and no NOR gate are allowed, so $I_0 = \\overline{A + B}$ must reuse the OR gate: feed the OR output both to $I_1$ and through the inverter to $I_0$. Every allowed gate is used exactly once."},
        {"title": "Check the table", "body": "With $C_1 C_0 = 00$ the output is NOT(OR) $= \\overline{A + B}$; 01 gives the OR, 10 the XOR, 11 the AND: the four rows of the specification, for every value of $A$ and $B$."},
    ],
    "answer": {"value": "A 4:1 MUX with $S_1 = C_1$, $S_0 = C_0$; $I_0 = \\overline{A + B}$ (OR gate followed by the inverter), $I_1 = A + B$ (OR), $I_2 = A \\oplus B$ (XOR), $I_3 = AB$ (AND).", "matchesKey": True},
    "shortcut": "Any \"control bits choose an operation\" table is a MUX: control bits on the selects, one operation per data input in the order of the control code.",
    "pitfalls": ["Swapping $C_1$ and $C_0$ on the selects, which exchanges $I_1$ and $I_2$ (the OR and XOR rows).", "Spending the inverter on an input ($\\overline{A}$ or $\\overline{B}$) and then having no way to make the NOR."],
    "verification": "Simulating the circuit over all 16 combinations of $C_1, C_0, A, B$ reproduces the table (l5_02_mux.py).",
}

# ── 1998-a-14 ───────────────────────────────────────────────────────────────
SOLUTIONS["cse-1998-a-14"] = {
    "approach": "Concept tested: **select lines vs data inputs**. $k$ select lines name $2^k$ data inputs, so a 4-bit select input means $2^4 = 16$ inputs.",
    "concepts": ["Select lines", "2^k : 1 multiplexer"],
    "steps": [
        {"title": "Count the input patterns", "body": "A 4-bit select value takes $2^4 = 16$ different values, $0000$ to $1111$."},
        {"title": "One input per pattern", "body": "Each select value connects a different data input to the output, so the MUX has 16 data inputs and one output: a 16:1 MUX."},
    ],
    "answer": {"value": "(C) 16 : 1 multiplexor", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "A 4:1 MUX has only 2 select lines; the 4 in the question is the number of select bits, not of inputs."),
        opt("B", False, "A 2:1 MUX has a single select line."),
        opt("C", True, "$2^4 = 16$ data inputs."),
        opt("D", False, "An 8:1 MUX has 3 select lines."),
    ],
    "shortcut": "Inputs $= 2^{\\text{select lines}}$; select lines $= \\lceil \\log_2 \\text{inputs} \\rceil$.",
    "pitfalls": ["Reading \"4-bit select\" as \"4 inputs\" and answering 4:1."],
    "verification": "$\\lceil \\log_2 16 \\rceil = 4$ select lines, as stated.",
}

# ── 2001-a-36 ───────────────────────────────────────────────────────────────
n = [m2("x1", "1", "0", "g"), m2("x2", "g", "x1", "f")]
X12 = ["x1", "x2"]
SOLUTIONS["cse-2001-a-36"] = {
    "approach": "Concept tested: **a cascade of two 2:1 MUXes** through a data input. With output $ac' + bc$, a MUX passes $a$ when $c = 0$ and $b$ when $c = 1$. Work inside out: the first MUX with constants is an inverter.",
    "concepts": ["2:1 MUX", "MUX cascade", "XNOR"],
    "given": "MUX 1: $a = 1$, $b = 0$, $c = x_1$, output $g$. MUX 2: $a = g$, $b = x_1$, $c = x_2$, output $f$.",
    "steps": [
        {"title": "First MUX", "body": "$g = 1 \\cdot x_1' + 0 \\cdot x_1 = x_1'$: a 2:1 MUX with constants 1, 0 on its data inputs is a NOT gate."},
        {"title": "Second MUX", "body": "$f = g\\,x_2' + x_1 x_2 = x_1' x_2' + x_1 x_2$.", "scene": {"hl": hl_rows(n, X12, "f")}},
        {"title": "Recognise it", "body": "$f = 1$ exactly when $x_1 = x_2$: the XNOR $x_1 x_2 + x_1' x_2'$."},
    ],
    "answer": {"value": "(C) $f = x_1 x_2 + x_1' x_2'$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$x_1' + x_2$ is 1 at $x_1 = 0, x_2 = 1$, where MUX 2 passes $b = x_1 = 0$."),
        opt("B", False, "$x_1' x_2 + x_1 x_2'$ is the XOR, the complement of the true output."),
        opt("C", True, "Inside out: $g = x_1'$, $f = x_1' x_2' + x_1 x_2$."),
        opt("D", False, "$x_1 + x_2'$ is 1 at $x_1 = 1, x_2 = 0$, where MUX 2 passes $g = x_1' = 0$."),
    ],
    "shortcut": "$c = x_2$ selects between $x_1'$ (for $x_2 = 0$) and $x_1$ (for $x_2 = 1$): that is $x_1 \\odot x_2$ at a glance.",
    "pitfalls": ["Using the usual $S'I_0 + SI_1$ labels with $a$ and $b$ swapped; the question defines the MUX by $ac' + bc$, so $a$ is the input for $c = 0$.", "Taking $g = x_1$ (forgetting that the constants make an inverter)."],
    "verification": "Rows $(x_1, x_2)$: 00 → $g = 1$ → 1; 01 → $x_1 = 0$; 10 → $g = 0$; 11 → $x_1 = 1$. Output 1, 0, 0, 1: XNOR.",
    "animation": tt_frame(n, X12, ["g", "f"], "Two cascaded 2:1 MUXes"),
}

# ── 2002-a-27 ───────────────────────────────────────────────────────────────
n = [("f", "MUX", {"d": ["x", "x", "y", "~y"], "s": ["~y", "z"], "en": "~z"})]
SOLUTIONS["cse-2002-a-27"] = {
    "approach": "Concept tested: **a MUX with an enable that shares a variable with a select line**. A disabled MUX outputs 0, so first find the rows where it is enabled, then see which data input those rows can reach.",
    "concepts": ["Enable input", "Select lines driven by complements", "Reading a MUX circuit"],
    "given": "$I_0 = I_1 = x$, $I_2 = y$, $I_3 = \\overline{y}$; $A_1 = \\overline{y}$, $A_0 = z$; $EN = \\overline{z}$ (active high, as drawn).",
    "steps": [
        {"title": "When is the MUX enabled?", "body": "$EN = \\overline{z}$, so the MUX works only for $z = 0$; every row with $z = 1$ gives $f = 0$.", "scene": {"hl": [{"r": i, "tone": "muted"} for i in (1, 3, 5, 7)]}},
        {"title": "Which inputs can be reached", "body": "With $z = 0$ the select bit $A_0 = z = 0$, so only $I_0$ ($A_1 = 0$) and $I_2$ ($A_1 = 1$) can be chosen."},
        {"title": "Split on y", "body": "$A_1 = \\overline{y}$. If $y = 1$: $A_1 A_0 = 00$, the MUX passes $I_0 = x$. If $y = 0$: $A_1 A_0 = 10$, it passes $I_2 = y = 0$."},
        {"title": "Put it together", "body": "$f = \\overline{z} \\cdot y \\cdot x = xy\\overline{z}$: 1 only on row $xyz = 110$.", "scene": {"hl": hl_rows(n, XYZ, "f")}},
    ],
    "answer": {"value": "(A) $xy\\overline{z}$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Enabled only for $z = 0$; then $y = 1$ picks $I_0 = x$ and $y = 0$ picks $I_2 = y = 0$: $f = xy\\overline{z}$."),
        opt("B", False, "$xy + z$ is 1 whenever $z = 1$, but those rows disable the MUX and give 0."),
        opt("C", False, "$x + y$ ignores both the enable and the fact that $I_2 = y$ is 0 on the rows that choose it."),
        opt("D", False, "(A) is exactly the function, so \"none of the above\" is wrong."),
    ],
    "shortcut": "Enable $= \\overline{z}$ forces the factor $\\overline{z}$, and $A_0 = z = 0$ halves the inputs; only $I_0$ and $I_2$ remain, and $I_2 = y$ is chosen only when $y = 0$.",
    "pitfalls": ["Treating the disabled rows as don't-cares or as \"pass the selected input\": they are 0s.", "Taking $A_1 = y$ instead of $\\overline{y}$, which swaps the roles of $I_0$ and $I_2$.", "Ignoring the enable entirely, which gives $xy + \\overline{y}z$."],
    "verification": "Enumerating the 8 rows of the netlist (enable modelled as active high, as in the 2002 paper's figure) gives a single 1 at $xyz = 110$.",
    "animation": tt_frame(n, XYZ, ["f"], "MUX with EN = z′, A1 = y′, A0 = z"),
}

# ── 2004-cs-60 ──────────────────────────────────────────────────────────────
SOLUTIONS["cse-2004-cs-60"] = {
    "approach": "Concept tested: **OR from one 2:1 MUX** with no extra hardware. Think if–then–else: if $T = 1$ the OR is 1; otherwise it equals $R$. So $T$ goes on the control, 1 on the input chosen for $T = 1$, and $R$ on the input chosen for $T = 0$.",
    "concepts": ["2:1 MUX as a gate", "MUX with constants", "If–then–else"],
    "given": "$Z = 0$ selects $X$, $Z = 1$ selects $Y$: output $= \\overline{Z}X + ZY$.",
    "steps": [
        {"title": "Plan the wiring", "body": "Put $T$ on $Z$. For $T = 1$ the output must be 1 whatever $R$ is, so $Y = 1$. For $T = 0$ the output must be $R$, so $X = R$."},
        {"title": "Verify", "body": "$\\overline{T}R + T \\cdot 1 = \\overline{T}R + T = T + R$ (absorption)."},
        {"title": "Check the other options", "body": "(B) $\\overline{T}T + TR = TR$, an AND. (C) $Z = 0$ always passes $X = T$. (D) $\\overline{T}R + T \\cdot 0 = \\overline{T}R$."},
    ],
    "answer": {"value": "(A) R to X, 1 to Y, T to Z", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "$\\overline{T}R + T = T + R$."),
        opt("B", False, "$X = T$, $Y = R$, $Z = T$ gives $\\overline{T}T + TR = TR$: AND, not OR."),
        opt("C", False, "With $Z = 0$ the MUX always passes $X = T$, so the output is just $T$."),
        opt("D", False, "$\\overline{T}R + T \\cdot 0 = \\overline{T}R$ (inhibition), 0 at $T = 1$."),
    ],
    "shortcut": "OR = MUX(select = one variable; $I_0$ = the other variable, $I_1$ = 1). AND = MUX(select = one; $I_0$ = 0, $I_1$ = the other).",
    "pitfalls": ["Putting the constant on the input for $T = 0$: that makes $\\overline{T}$-type functions, not OR."],
    "verification": "Rows $(T, R)$: 00 → $X = R = 0$; 01 → $X = 1$; 10 → $Y = 1$; 11 → $Y = 1$. Output 0, 1, 1, 1 = OR.",
}

# ── IT 2005-cs-48 ───────────────────────────────────────────────────────────
n = [m2("A", "B", "A", "s"), m2("s", "1", "0", "C")]
SOLUTIONS["it-2005-cs-48"] = {
    "approach": "Concept tested: **a MUX output driving the select of another MUX**, used to build NOR. Here control 1 selects the **upper** input. Make the first MUX compute $A + B$, then let the second MUX invert it with constants.",
    "concepts": ["MUX cascade through a select", "2:1 MUX as a gate", "NOR"],
    "given": "MUX 1: upper $A$, lower $B$, control $z$; output $s$ drives MUX 2's control. MUX 2: upper $x$, lower $y$; output $C = \\overline{A + B}$.",
    "steps": [
        {"title": "What MUX 2 must do", "body": "$C = s\\,x + \\overline{s}\\,y$. To get $C = \\overline{s}$ we need $x = 0$, $y = 1$; then $s$ must equal $A + B$."},
        {"title": "Make s = A + B", "body": "With $z = A$: $s = A \\cdot A + \\overline{A} B = A + \\overline{A}B = A + B$."},
        {"title": "Combine", "body": "$C = \\overline{s} = \\overline{A + B}$: $x = 0$, $y = 1$, $z = A$.", "scene": {"hl": hl_rows(n, ["A", "B"], "C")}},
    ],
    "answer": {"value": "(D) $x = 0$, $y = 1$, $z = A$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$x = 1$, $y = 0$ makes $C = s$; with $z = B$, $s = AB + \\overline{B}B = AB$, so $C = AB$."),
        opt("B", False, "$x = 1$, $y = 0$ makes $C = s = A + B$: OR, not NOR."),
        opt("C", False, "$z = B$ gives $s = BA + \\overline{B}B = AB$, so $C = \\overline{AB}$: NAND."),
        opt("D", True, "$s = A + B$ and $C = \\overline{s}$."),
    ],
    "shortcut": "A 2:1 MUX with constants 0 (for select 1) and 1 (for select 0) is an inverter of its select; so the first MUX must give $A + B$, which MUX$(z = A)$ with inputs $A, B$ does.",
    "pitfalls": ["Using the usual \"select 0 picks the top input\" convention; this figure states that control 1 selects the upper input.", "Choosing $z = B$, which makes the first MUX an AND."],
    "verification": "Rows $AB$: 00 → $s = B = 0$ → $C = y = 1$; 01 → $s = 1$ → 0; 10 → $s = A = 1$ → 0; 11 → 0. NOR.",
    "animation": tt_frame(n, ["A", "B"], ["s", "C"], "NOR from two 2:1 MUXes"),
}

# ── 2006-cs-35 ──────────────────────────────────────────────────────────────
n = [m2("z", "x", "~y", "g"), m2("y", "g", "x", "f")]
SOLUTIONS["cse-2006-cs-35"] = {
    "approach": "Concept tested: **a cascade of two 2:1 MUXes** through a data input. Write the first MUX's output, substitute it into the second MUX's equation, and compare the options by their minterms.",
    "concepts": ["MUX cascade", "Reading a MUX circuit", "Equivalent expressions"],
    "given": "MUX1: $I_0 = x$, $I_1 = \\overline{y}$, select $z$. MUX2: $I_0$ = MUX1, $I_1 = x$, select $y$.",
    "steps": [
        {"title": "MUX1", "body": "$g = x\\overline{z} + \\overline{y}z$."},
        {"title": "MUX2", "body": "$f = \\overline{y}\\,g + yx = \\overline{y}(x\\overline{z} + \\overline{y}z) + xy = x\\overline{y}\\,\\overline{z} + \\overline{y}z + xy$."},
        {"title": "Tidy up", "body": "$x\\overline{y}\\,\\overline{z} + xy = x(\\overline{y}\\,\\overline{z} + y) = x\\overline{z} + xy$. So $f = x\\overline{z} + xy + \\overline{y}z$: option (A) term for term. (Its minimal SOP is even shorter, $x + \\overline{y}z$, but the question asks which option is correct.)", "scene": {"hl": hl_rows(n, XYZ, "f")}},
    ],
    "answer": {"value": "(A) $x\\overline{z} + xy + \\overline{y}z$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Equal to $f = \\Sigma m(1, 4, 5, 6, 7)$."),
        opt("B", False, "$\\overline{yz}$ is 1 at $xyz = 000$, where MUX2 passes $g = x = 0$."),
        opt("C", False, "$\\overline{yz}$ is 1 at row 000, where MUX2 passes $g = x = 0$."),
        opt("D", False, "$\\overline{yz}$ again makes row 000 a 1, where $f = 0$."),
    ],
    "shortcut": "Split on $y$: $y = 1$ gives $x$; $y = 0$ gives MUX1 with $\\overline{y} = 1$, i.e. $x\\overline{z} + z = x + z$. So $f = xy + \\overline{y}(x + z) = x + \\overline{y}z$; only (A) equals it.",
    "pitfalls": ["Reading $\\overline{yz}$ (complement of the product) as $\\overline{y}z$.", "Expecting the options to be minimal: (A) is correct but not minimal."],
    "verification": "The netlist is 1 on rows 1, 4, 5, 6, 7; so is option (A), and every other option differs on row 000.",
    "animation": tt_frame(n, XYZ, ["g", "f"], "Cascaded MUXes of GATE 2006"),
}

# ── IT 2006-cs-36 ───────────────────────────────────────────────────────────
n = [("P", "OR", ["x", "y"]), ("Q", "AND", ["x", "y"]), m2("z", "Q", "P", "f")]
SOLUTIONS["it-2006-cs-36"] = {
    "approach": "Concept tested: **implementing a function on a smaller MUX with gate residues**. With $z$ on the select, each data input carries the cofactor of the majority function for that value of $z$.",
    "concepts": ["Shannon cofactors", "Residue functions", "Majority function"],
    "given": "2:1 MUX, select $z$; P → input 1, Q → input 0; both boxes see $x$ and $y$.",
    "steps": [
        {"title": "Cofactor for z = 1", "body": "With $z = 1$, majority needs only one more 1: $f = x + y$. So P (input 1) is an OR."},
        {"title": "Cofactor for z = 0", "body": "With $z = 0$, both $x$ and $y$ must be 1: $f = xy$. So Q (input 0) is an AND."},
        {"title": "Check", "body": "$f = \\overline{z}\\,xy + z(x + y) = xy + xz + yz$, the majority.", "scene": {"hl": hl_rows(n, XYZ, "f")}},
    ],
    "answer": {"value": "(D) P = OR, Q = AND", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "P = XOR gives $f = 0$ at $x = y = z = 1$ (XOR of 1, 1 is 0), but the majority is 1."),
        opt("B", False, "Q = XOR makes $f = 1$ at $x = 1, y = 0, z = 0$, which has only one 1."),
        opt("C", False, "Q = OR makes $f = 1$ at $x = 1, y = 0, z = 0$."),
        opt("D", True, "Cofactors: $f_{z=1} = x + y$, $f_{z=0} = xy$."),
    ],
    "shortcut": "Majority with one input fixed: fixed 1 → OR of the others; fixed 0 → AND of the others.",
    "pitfalls": ["Mixing up which box feeds input 1 (selected when $z = 1$)."],
    "verification": "Simulating the circuit with (P, Q) = (OR, AND) over all 8 rows gives 1s on 3, 5, 6, 7; every other option fails at least one row.",
    "animation": tt_frame(n, XYZ, ["P", "Q", "f"], "Majority on a 2:1 MUX"),
}

# ── 2007-cs-34 ──────────────────────────────────────────────────────────────
SOLUTIONS["cse-2007-cs-34"] = {
    "approach": "Concept tested: **the smallest MUX for every $n$-variable function**. With $n - 1$ variables on the selects, each data input needs only $0$, $1$, $x$ or $\\overline{x}$ of the last variable, and the one inverter makes $\\overline{x}$. One select fewer leaves 2-variable residues, which need gates.",
    "concepts": ["Shannon expansion", "Implementation table", "Minimum MUX size"],
    "steps": [
        {"title": "2^(n−1):1 is enough", "body": "Put $x_1 \\dots x_{n-1}$ on the selects. For each select value $s$, the data input must equal $f(s, x_n)$, a function of one variable: $0$, $1$, $x_n$ or $\\overline{x_n}$. The constants and $x_n$ are wires; $\\overline{x_n}$ comes from the inverter."},
        {"title": "2^(n−2):1 is not", "body": "With only $n - 2$ selects, two variables $u, v$ remain free on every data line. For the parity function $x_1 \\oplus \\dots \\oplus x_n$ every such residue is $u \\oplus v$ or its complement, which no wire, constant or single inverter can supply."},
        {"title": "Conclusion", "body": "The minimum is a $2^{n-1}$ line to 1 line MUX."},
    ],
    "answer": {"value": "(C) $2^{n-1}$ line to 1 line", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "A $2^n$:1 MUX works (wire the truth table) but is not the minimum."),
        opt("B", False, "$2^{n+1}$:1 has more select lines than variables; it is never needed."),
        opt("C", True, "$n - 1$ selects plus one inverter realise every function (Shannon), and fewer selects fail on parity."),
        opt("D", False, "$2^{n-2}$:1 leaves 2-variable residues such as $u \\oplus v$, impossible without gates."),
    ],
    "shortcut": "One inverter buys exactly one variable on the data lines: size $2^{n-1}$.",
    "pitfalls": ["Answering $2^n$ by thinking only of \"wire the truth table\".", "Answering $2^{n-2}$ by assuming residues can be any function."],
    "verification": "For $n = 3$ an exhaustive search over every wiring of a 2:1 MUX and one inverter finds no circuit for $x \\oplus y \\oplus z$, while a 4:1 MUX realises all 256 functions (l5_02_mux.py).",
}

# ── IT 2007-cs-8 ────────────────────────────────────────────────────────────
n = [m2("b", "b", "a", "m"), m2("a", "0", "m", "f")]
SOLUTIONS["it-2007-cs-8"] = {
    "approach": "Concept tested: **an AND gate from two cascaded 2:1 MUXes**. Try each option's wiring: evaluate MUX 1, then MUX 2, and compare with $ab$.",
    "concepts": ["2:1 MUX as a gate", "MUX cascade"],
    "given": "Mux 1: input 1 = $a$, input 0 = $b$, select $X_1$. Mux 2: input 1 = Mux 1, input 0 = $X_2$, select $X_3$.",
    "steps": [
        {"title": "Option (A): X1 = b", "body": "Mux 1 = $b\\,a + \\overline{b}\\,b = ab$."},
        {"title": "Option (A): X2 = 0, X3 = a", "body": "Mux 2 = $a \\cdot ab + \\overline{a} \\cdot 0 = ab$. ✓", "scene": {"hl": hl_rows(n, ["a", "b"], "f")}},
        {"title": "The other options", "body": "(B): Mux 1 $= ab$, Mux 2 $= b \\cdot ab + \\overline{b} \\cdot 1 = a + \\overline{b}$. (C): Mux 2 = Mux 1 $= a\\,a + \\overline{a}\\,b = a + b$. (D): Mux 1 $= a + b$, Mux 2 $= b(a + b) + 0 = b$."},
    ],
    "answer": {"value": "(A) $X_1 = b$, $X_2 = 0$, $X_3 = a$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Mux 1 gives $ab$, and Mux 2 with select $a$ and 0 on input 0 passes it unchanged."),
        opt("B", False, "Gives $a + \\overline{b}$ (1 at $a = b = 0$)."),
        opt("C", False, "Gives $a + b$."),
        opt("D", False, "Gives $b$ (1 at $a = 0, b = 1$)."),
    ],
    "shortcut": "AND = MUX(select = one variable; input 0 = 0, input 1 = the other). Mux 2 in (A) is exactly that with select $a$, and Mux 1 already gives $ab$ (any $m$ with $a\\cdot m = ab$ works).",
    "pitfalls": ["Forgetting that input 1 (not input 0) of each MUX is chosen when its select is 1."],
    "verification": "All four $(a, b)$ rows: (A) outputs 0, 0, 0, 1.",
    "animation": tt_frame(n, ["a", "b"], ["m", "f"], "AND from two 2:1 MUXes"),
}

# ── 2010-cs-9 ───────────────────────────────────────────────────────────────
n = [("f", "MUX", {"d": ["R", "~R", "~R", "R"], "s": ["P", "Q"]})]
SOLUTIONS["cse-2010-cs-9"] = {
    "approach": "Concept tested: **reading a 4:1 MUX** with data $R, \\overline{R}, \\overline{R}, R$. Case-split on $PQ$: equal selects pass $R$, different selects pass $\\overline{R}$.",
    "concepts": ["Multiplexer equation", "3-input XOR (parity)"],
    "given": "$S_1 = P$, $S_0 = Q$; $I_0 = R$, $I_1 = \\overline{R}$, $I_2 = \\overline{R}$, $I_3 = R$.",
    "steps": [
        {"title": "MUX equation", "body": "$f = \\overline{P}\\,\\overline{Q}R + \\overline{P}Q\\overline{R} + P\\overline{Q}\\,\\overline{R} + PQR$."},
        {"title": "Read the rule", "body": "$f = R$ when $P \\oplus Q = 0$ and $f = \\overline{R}$ when $P \\oplus Q = 1$: $f = (P \\oplus Q) \\oplus R$.", "scene": {"hl": hl_rows(n, PQR, "f")}},
        {"title": "Confirm with the 1s", "body": "The MUX outputs 1 on rows 001, 010, 100 and 111, the rows of $(P, Q, R)$ with an odd number of 1s: odd parity."},
    ],
    "answer": {"value": "(B) $P \\oplus Q \\oplus R$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "XNOR of three is the complement: 1 at $PQR = 000$, where the MUX passes $I_0 = R = 0$."),
        opt("B", True, "1 on the rows with an odd number of 1s: 001, 010, 100, 111."),
        opt("C", False, "$P + Q + R$ is 1 at 011, where the MUX passes $I_1 = \\overline{R} = 0$."),
        opt("D", False, "NOR of three is 1 only at 000, where the MUX outputs 0."),
    ],
    "shortcut": "Data $v, \\overline{v}, \\overline{v}, v$ on a 4:1 MUX is always $S_1 \\oplus S_0 \\oplus v$.",
    "pitfalls": ["Choosing XNOR (A) by mixing up which data input carries $R$ and which $\\overline{R}$."],
    "verification": "Row 000 → $I_0 = R = 0$; row 001 → 1; row 011 → $I_1 = \\overline{R} = 0$; row 111 → $I_3 = R = 1$: odd parity.",
    "animation": tt_frame(n, PQR, ["f"], "4:1 MUX with data R, R′, R′, R"),
}

# ── 2014-1-cs-45 ────────────────────────────────────────────────────────────
n = [("F", "MUX", {"d": ["0", "1", "R", "~R"], "s": ["P", "Q"]})]
SOLUTIONS["cse-2014-1-cs-45"] = {
    "approach": "Concept tested: **MUX output to a minimal SOP**. Write the MUX equation, list the minterms, and loop them on a K-map. Three options are the same function; only one is minimal.",
    "concepts": ["Multiplexer equation", "K-map minimisation", "Minimal vs equivalent"],
    "given": "$S_1 = P$, $S_0 = Q$; $I_0 = 0$, $I_1 = 1$, $I_2 = R$, $I_3 = \\overline{R}$.",
    "steps": [
        {"title": "MUX equation", "body": "$F = \\overline{P}\\,\\overline{Q} \\cdot 0 + \\overline{P}Q \\cdot 1 + P\\overline{Q}R + PQ\\overline{R} = \\overline{P}Q + P\\overline{Q}R + PQ\\overline{R}$."},
        {"title": "Minterms", "body": "$F = \\Sigma m(2, 3, 5, 6)$ over $(P, Q, R)$.", "scene": {"hl": hl_rows(n, PQR, "F")}},
        {"title": "Loop", "body": "$m_2, m_3$: $\\overline{P}Q$. $m_6$ is adjacent to $m_2$: $Q\\overline{R}$ (smaller than keeping $PQ\\overline{R}$). $m_5$ is isolated: $P\\overline{Q}R$. $F = \\overline{P}Q + Q\\overline{R} + P\\overline{Q}R$, 7 literals."},
    ],
    "answer": {"value": "(A) $\\overline{P}Q + Q\\overline{R} + P\\overline{Q}R$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The minimal cover: 7 literals."),
        opt("B", False, "Equal to $F$ but not minimal: the term $\\overline{P}Q\\overline{R}$ is redundant and $PQ\\overline{R}$ can grow to $Q\\overline{R}$."),
        opt("C", False, "Equal to $F$ but not minimal: $\\overline{P}QR + \\overline{P}Q\\overline{R}$ is just $\\overline{P}Q$, written as two terms."),
        opt("D", False, "$PQ\\overline{R}$ alone covers only $m_6$."),
    ],
    "shortcut": "A 1 on a data input contributes the whole select minterm ($\\overline{P}Q$); then look for the neighbour of the lone minterms ($m_6$ next to $m_2$).",
    "pitfalls": ["Stopping at the MUX equation, which is correct but has 8 literals.", "Choosing (B) or (C) because they are equal to $F$: the question asks for the minimal form."],
    "verification": "Options A, B and C all have minterms {2, 3, 5, 6}; minlib's exhaustive cover search gives 7 literals as the minimum, which only (A) attains.",
    "animation": tt_frame(n, PQR, ["F"], "4:1 MUX with data 0, 1, R, R′"),
}

# ── 2014-3-cs-8 ─────────────────────────────────────────────────────────────
SOLUTIONS["cse-2014-3-cs-8"] = {
    "approach": "Concept tested: **a MUX is an if–then–else**. \"If $x = 1$ then $y = a$ else $y = b$\" chooses between two inputs with a control bit and stores nothing: a 2:1 multiplexer with $x$ on the select.",
    "concepts": ["If–then–else", "2:1 MUX", "Combinational vs sequential"],
    "steps": [
        {"title": "Translate", "body": "$y = xa + \\overline{x}b$: the equation of a 2:1 MUX with select $x$, $I_1 = a$, $I_0 = b$."},
        {"title": "Rule out the others", "body": "No arithmetic is done (not a full adder), no inputs are prioritised into a code (not a priority encoder), and nothing is remembered, since both branches assign $y$ from current inputs (not a flip-flop)."},
        {"title": "Wire it", "body": "Select $= x$, $I_1 = a$, $I_0 = b$, output $= y$. The output changes as soon as $x$, $a$ or $b$ changes, with no clock: a combinational data selector."},
    ],
    "answer": {"value": "(C) Multiplexor", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "A full adder computes sum and carry of three bits; it does not choose between $a$ and $b$."),
        opt("B", False, "A priority encoder outputs the index of the highest active input, not one of the inputs."),
        opt("C", True, "$y = xa + \\overline{x}b$ is a 2:1 MUX."),
        opt("D", False, "A flip-flop stores a value; here $y$ follows the inputs at all times."),
    ],
    "shortcut": "`if` with an assignment in **both** branches = MUX; `if` with an assignment in only one branch (keep the old value otherwise) = storage.",
    "pitfalls": ["Choosing a flip-flop because of the word \"if\"."],
    "verification": "For each of the 8 rows of $(x, a, b)$, $xa + \\overline{x}b$ equals the selected input.",
}

# ── 2016-1-cs-30 ────────────────────────────────────────────────────────────
n = [m2("P", "0", "R", "g"), m2("Q", "~R", "g", "X")]
SOLUTIONS["cse-2016-1-cs-30"] = {
    "approach": "Concept tested: **two cascaded 2:1 MUXes** to a minimal SOP. MUX 1 with a 0 on one input is an AND; MUX 2 then chooses between $\\overline{R}$ and that AND.",
    "concepts": ["MUX cascade", "2:1 MUX as AND", "Minimal SOP"],
    "given": "MUX 1: $I_0 = 0$, $I_1 = R$, select $P$. MUX 2: $I_0 = \\overline{R}$, $I_1$ = MUX 1, select $Q$.",
    "steps": [
        {"title": "MUX 1", "body": "$g = \\overline{P} \\cdot 0 + P R = PR$."},
        {"title": "MUX 2", "body": "$X = \\overline{Q}\\,\\overline{R} + Q \\cdot PR = \\overline{Q}\\,\\overline{R} + PQR$.", "scene": {"hl": hl_rows(n, PQR, "X")}},
        {"title": "Is it minimal?", "body": "Minterms: $\\overline{Q}\\,\\overline{R}$ = {0, 4}, $PQR$ = {7}. $m_7$'s neighbours $m_3, m_5, m_6$ are all 0s, so $PQR$ cannot grow, and {0, 4} is already a pair. Minimal."},
    ],
    "answer": {"value": "(D) $\\overline{Q}\\,\\overline{R} + PQR$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\overline{P}\\,\\overline{Q} + PQR$ is 1 at $PQR = 001$, where MUX 2 passes $\\overline{R} = 0$."),
        opt("B", False, "$\\overline{P}Q + QR$ is 1 at 010, where MUX 2 passes $g = PR = 0$."),
        opt("C", False, "$PQ + \\overline{P}\\,\\overline{Q}R$ is 1 at 110, where $g = PR = 0$."),
        opt("D", True, "Inside out: $g = PR$, $X = \\overline{Q}\\,\\overline{R} + PQR$."),
    ],
    "shortcut": "Split on $Q$: $Q = 0 \\Rightarrow X = \\overline{R}$; $Q = 1 \\Rightarrow X = PR$. Write $\\overline{Q}\\,\\overline{R} + Q\\,PR$ directly.",
    "pitfalls": ["Taking MUX 1 as $P + R$ (an OR needs a 1 on a data input, not a 0)."],
    "verification": "The netlist is 1 on rows 0, 4, 7, exactly the minterms of option (D).",
    "animation": tt_frame(n, PQR, ["g", "X"], "Cascaded MUXes of GATE 2016"),
}

# ── 2020-cs-19 ──────────────────────────────────────────────────────────────
SOLUTIONS["cse-2020-cs-19"] = {
    "approach": "Concept tested: **select-line sizing**. One of 32 registers must be chosen, so the MUX needs enough select lines to name 32 inputs: $\\lceil \\log_2 32 \\rceil$.",
    "concepts": ["Select lines", "Register selection"],
    "steps": [
        {"title": "Inputs to name", "body": "32 registers → a 32:1 MUX (one per bit position if the registers are wide, all sharing the same selects)."},
        {"title": "Select lines", "body": "$2^k \\ge 32 \\Rightarrow k = \\log_2 32 = 5$."},
    ],
    "answer": {"value": "**5** select lines", "number": 5, "matchesKey": True},
    "shortcut": "Select lines $= \\lceil \\log_2(\\text{number of sources}) \\rceil$; the register width only changes how many MUXes, not how many selects.",
    "pitfalls": ["Answering 32 (data inputs) or 16 (half of them).", "Multiplying by the register width: all bit-MUXes share one set of select lines."],
    "verification": "5 lines give $2^5 = 32$ patterns, exactly one per register; 4 lines give only 16.",
}

# ── 2021-2-cs-5 ─────────────────────────────────────────────────────────────
f21 = [0, 1, 3, 4, 5, 6]
impl = {"kind": "table", "title": "Implementation table, selects y (S1), z (S0), residue x", "cols": ["I0 (yz=00)", "I1 (01)", "I2 (10)", "I3 (11)"],
        "rowLabels": ["x′", "x", "residue"], "corner": "",
        "rows": [[{"v": m, "tone": "success" if m in f21 else "muted"} for m in (0, 1, 2, 3)],
                 [{"v": m, "tone": "success" if m in f21 else "muted"} for m in (4, 5, 6, 7)],
                 ["1", "1", "x", "x′"]], "mono": True}
assert cl.impl_table(f21, 3, [1, 2], XYZ)[0] == ["1", "1", "x", "x′"]
SOLUTIONS["cse-2021-2-cs-5"] = {
    "approach": "Concept tested: **the implementation table** for a 4:1 MUX with $y, z$ on the selects. The residue variable is $x$; each data input serves rows $j$ ($x = 0$) and $j + 4$ ($x = 1$), and the pair reads as $0$, $1$, $x$ or $x'$.",
    "concepts": ["Implementation table", "Residues 0, 1, x, x′", "Select order"],
    "given": "$f(x, y, z) = \\Sigma m(0, 1, 3, 4, 5, 6)$. In every option $s_1 = y$, $s_0 = z$ and the data inputs (top to bottom) are $I_0 \\dots I_3$. (A): 1, 1, $x$, $x'$. (B): $x$, 1, $x'$, 1. (C): 1, 1, $x'$, $x$. (D): $x'$, 1, $x$, 1.",
    "steps": [
        {"title": "Pair the rows", "body": "$I_0$: rows 0, 4. $I_1$: rows 1, 5. $I_2$: rows 2, 6. $I_3$: rows 3, 7 (the column number $yz$, then add 4 for $x = 1$).", "scene": {"reveal": 8}},
        {"title": "Read each pair", "body": "$I_0$: 0 ✓, 4 ✓ → 1. $I_1$: 1 ✓, 5 ✓ → 1. $I_2$: 2 ✗, 6 ✓ → $x$. $I_3$: 3 ✓, 7 ✗ → $x'$.", "scene": {"reveal": 12, "hl": [{"r": 2, "c": 2, "tone": "accent"}, {"r": 2, "c": 3, "tone": "accent"}]}},
        {"title": "Match the options", "body": "Only (A) has $(1, 1, x, x')$. (C) swaps $x$ and $x'$; (B) and (D) put the constants on $I_1$ and $I_3$ and a literal on $I_0$, so they fail row 0 or row 4, where $f = 1$."},
    ],
    "answer": {"value": "(A): $I_0 = 1$, $I_1 = 1$, $I_2 = x$, $I_3 = x'$ with $s_1 = y$, $s_0 = z$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Matches the implementation table (1, 1, $x$, $x'$)."),
        opt("B", False, "$I_0 = x$ gives 0 on row 0, but $m_0$ is a minterm."),
        opt("C", False, "$I_2 = x'$ gives 1 on row 2, which is not a minterm (and $I_3 = x$ misses row 3)."),
        opt("D", False, "$I_0 = x'$ gives 0 on row 4, but $m_4$ is a minterm."),
    ],
    "shortcut": "Check the single rows that separate the options: row 0 ($yz = 00$, $x = 0$) needs $I_0 = 1$ at $x = 0$, killing (B); row 4 kills (D); row 2 kills (C).",
    "pitfalls": ["Reading a (0, 1) pair as $x'$: the pair is listed $x = 0$ first, so (0, 1) is $x$.", "Using the table for selects $x, y$ (which is 1, $z$, 1, $z'$) on a figure whose selects are $y, z$."],
    "verification": "Simulating each option's wiring over the 8 rows: only (A) is 1 exactly on 0, 1, 3, 4, 5, 6.",
    "animation": dict(impl, reveal=4),
}

# ── 2023-cs-34 ──────────────────────────────────────────────────────────────
f23rows = [(b, a, c) for b in (0, 1) for a in (0, 1) for c in (0, 1)]
fval = lambda a, b, c: int((not a) or (not b and c))
SOLUTIONS["cse-2023-cs-34"] = {
    "approach": "Concept tested: **wiring a truth table onto a MUX tree** with a given select order. $B$ chooses M1 ($B = 0$) or M2 ($B = 1$); inside each, $S_1 = A$ and $S_0 = C$, so $X_{4B + 2A + C} = f(A, B, C)$.",
    "concepts": ["MUX tree", "Truth table on data inputs", "Select order"],
    "given": "$f = \\overline{A} + \\overline{A}\\,\\overline{C} + A\\overline{B}C$. M1: $X_0 \\dots X_3$, M2: $X_4 \\dots X_7$, both with $S_1 = A$, $S_0 = C$; M3 (2:1) selects M1 for $B = 0$, M2 for $B = 1$.",
    "steps": [
        {"title": "Simplify f", "body": "$\\overline{A}\\,\\overline{C}$ is absorbed by $\\overline{A}$, and $\\overline{A} + A\\overline{B}C = \\overline{A} + \\overline{B}C$. So $f = 1$ whenever $A = 0$, and for $A = 1$ only when $B = 0, C = 1$."},
        {"title": "Index of each X", "body": "$X_i$ is reached when $B$ picks its MUX and $(A C)_2$ picks its position: $X_{4B + 2A + C}$. So $X_i = f$ at $B = i_2$, $A = i_1$, $C = i_0$.", "scene": {"reveal": 16}},
        {"title": "M1 (B = 0)", "body": "$AC = 00, 01$: $A = 0$ → 1, 1. $AC = 10$: $\\overline{B}C = 0$ → 0. $AC = 11$: $\\overline{B}C = 1$ → 1. $(X_0, X_1, X_2, X_3) = (1, 1, 0, 1)$.", "scene": {"reveal": 32, "hl": [{"r": i, "tone": "accent"} for i in range(4)]}},
        {"title": "M2 (B = 1)", "body": "$A = 0$ → 1, 1. $A = 1$: $\\overline{B} = 0$ → 0, 0. $(X_4, \\dots, X_7) = (1, 1, 0, 0)$.", "scene": {"hl": [{"r": i, "tone": "success"} for i in range(4, 8)], "reveal": 40}},
    ],
    "answer": {"value": "(C) $(1, 1, 0, 1, 1, 1, 0, 0)$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$X_3 = 0$ makes $f = 0$ at $A = 1, B = 0, C = 1$ (a 1 of $f$), and $X_6 = 1$ makes $f = 1$ at $A = 1, B = 1, C = 0$."),
        opt("B", False, "$X_3 = 0$ misses $A\\overline{B}C$, and $X_7 = 1$ adds $ABC$."),
        opt("C", True, "$X_{4B + 2A + C} = f(A, B, C)$ for all eight rows."),
        opt("D", False, "Inverts the role of $A$: $X_0 = 0$ gives $f = 0$ at $A = B = C = 0$, where $f = \\overline{A} = 1$."),
    ],
    "shortcut": "$f = \\overline{A} + \\overline{B}C$: every $X$ with $A = 0$ (positions 0, 1 in each MUX) is 1; with $A = 1$ only the M1 entry for $C = 1$ ($X_3$) is 1.",
    "pitfalls": ["Assuming the data inputs follow $AB$ order: the selects of M1 and M2 are $A$ and $C$, and $B$ is on M3.", "Putting $B = 1$ on M1."],
    "verification": "Simulating the three-MUX netlist with option (C)'s constants gives 1s on rows 0, 1, 2, 3, 5 of $(A, B, C)$, the minterms of $\\overline{A} + \\overline{B}C$; the other options differ on at least one row.",
    "animation": {"kind": "table", "title": "X index = 4B + 2A + C", "cols": ["B", "A", "C", "X", "value"],
                  "rows": [[b, a, c, f"X{4 * b + 2 * a + c}", fval(a, b, c)] for b, a, c in f23rows], "mono": True, "reveal": 0},
}

# ── 2024-1-cs-54 ────────────────────────────────────────────────────────────
n = [m2("A", "1", "1", "Q1"), m2("B", "0", "0", "Q2"), m2("C", "Q1", "Q2", "Y")]
SOLUTIONS["cse-2024-1-cs-54"] = {
    "approach": "Concept tested: **a two-level tree of 2:1 MUXes with constant data**. When both data inputs of a MUX are equal, its select does not matter. So $Q_1 \\equiv 1$ and $Q_2 \\equiv 0$, and M3 outputs $\\overline{C}$.",
    "concepts": ["MUX tree", "Constant data inputs", "Counting minterms"],
    "given": "M1: inputs $X_1 = 1$, $X_2 = 1$, select $A$. M2: inputs $X_3 = 0$, $X_4 = 0$, select $B$. M3: input 0 = $Q_1$, input 1 = $Q_2$, select $C$.",
    "steps": [
        {"title": "First level", "body": "M1 chooses between 1 and 1: $Q_1 = 1$ for every $A$. M2 chooses between 0 and 0: $Q_2 = 0$ for every $B$."},
        {"title": "Second level", "body": "$Y = \\overline{C}Q_1 + CQ_2 = \\overline{C}$.", "scene": {"hl": hl_rows(n, ABC, "Y")}},
        {"title": "Count", "body": "$Y = 1$ whenever $C = 0$; $A$ and $B$ are free: $2 \\times 2 = 4$ combinations."},
    ],
    "answer": {"value": "**4** combinations ($Y = \\overline{C}$)", "number": 4, "matchesKey": True},
    "shortcut": "Equal data inputs make a MUX's select irrelevant; the tree collapses to $Y = \\overline{C}$, half of the 8 rows.",
    "pitfalls": ["Counting only the rows where $A$ or $B$ \"chooses\" a 1, as if the selects mattered.", "Mixing up which M3 input is chosen by $C = 0$ (input 0, $Q_1$)."],
    "verification": "Enumerating all 8 rows of $(A, B, C)$: $Y = 1$ on 000, 010, 100, 110.",
    "animation": tt_frame(n, ABC, ["Q1", "Q2", "Y"], "Three 2:1 MUXes, X1 = X2 = 1, X3 = X4 = 0"),
}
