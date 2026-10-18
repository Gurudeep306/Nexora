"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 4, Lesson 1 (designing combinational
circuits; code converters). Merged by _sol_ch4.py; every key and answer text is re-derived in
l4_01_design.py (minlib covers, comblib netlists and the exhaustive AND/OR/NOT gate search)."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import comblib as cl  # noqa: E402
from _sol_ch1_fp import opt  # noqa: E402

SOLUTIONS = {}

# The BCD mod 6 table, generated (digit, input bits I4 I3 I2 I1, residue, output bits R3 R2 R1).
MOD6_ROWS = [[str(d), "".join(map(str, cl.bits_of(d, 4))), str(d % 6), "".join(map(str, cl.bits_of(d % 6, 3)))] for d in range(10)]
MOD6_ROWS.append(["10–15", "1010–1111", "—", "X X X"])

# ── cse-2000-b-9-a: BCD mod 6, the truth table (DESC) ───────────────────────
SOLUTIONS["cse-2000-b-9-a"] = {
    "approach": "Concept tested: **writing a converter's truth table from a word specification**, with the bit order the question fixes ($I_1$ and $R_1$ are the LSBs) and the unused BCD codes 10–15 as don't-cares (\"do not detect illegal input\").",
    "concepts": ["Design procedure", "BCD", "Don't-cares", "Bit order"],
    "given": "Input: one BCD digit $I_4 I_3 I_2 I_1$ (weights 8 4 2 1, $I_1$ = LSB). Output: the digit modulo 6 as $R_4 R_3 R_2 R_1$ ($R_1$ = LSB). Illegal inputs are not detected.",
    "steps": [
        {"title": "Fix names and weights first", "body": "Write the weights over the columns before any row: $I_4 I_3 I_2 I_1$ = 8 4 2 1 and $R_3 R_2 R_1$ = 4 2 1. The question numbers the bits from the LSB, the opposite of the usual $A B C D$ habit; mixing the two mirrors every wire."},
        {"title": "Residues", "body": "$d \\bmod 6$: digits 0–5 are unchanged; 6 → 0, 7 → 1, 8 → 2, 9 → 3. The largest residue is 5 = 101, so three output bits suffice and $R_4 = 0$ on every row.", "scene": {"hl": [{"r": 6, "tone": "accent"}, {"r": 7, "tone": "accent"}, {"r": 8, "tone": "accent"}, {"r": 9, "tone": "accent"}]}},
        {"title": "Write the table", "body": "| Digit | $I_4 I_3 I_2 I_1$ | $R_4 R_3 R_2 R_1$ |\n|---|---|---|\n| 0 | 0000 | 0000 |\n| 1 | 0001 | 0001 |\n| 2 | 0010 | 0010 |\n| 3 | 0011 | 0011 |\n| 4 | 0100 | 0100 |\n| 5 | 0101 | 0101 |\n| 6 | 0110 | 0000 |\n| 7 | 0111 | 0001 |\n| 8 | 1000 | 0010 |\n| 9 | 1001 | 0011 |\n| 10–15 | 1010–1111 | XXXX |"},
        {"title": "Mark the illegal rows", "body": "Codes 1010–1111 are never produced by a BCD source, and the question says not to detect them, so all four outputs are don't-cares (X) on those six rows. Part (b) uses these Xs to shrink the circuit.", "scene": {"hl": [{"r": 10, "tone": "muted"}]}},
    ],
    "answer": {"value": "Digits 0–5 map to themselves; 6 → 0, 7 → 1, 8 → 2, 9 → 3 (outputs 0000, 0001, 0010, 0011); $R_4 = 0$ always; rows 10–15 are don't-cares", "matchesKey": True},
    "shortcut": "Mod 6 is even, so the output LSB equals the input LSB on every row ($R_1 = I_1$): subtracting 6 never changes parity. Only $R_2$ and $R_3$ need thought.",
    "pitfalls": [
        "Putting $I_1$ in the MSB column: digit 1 then reads as $I_4 = 1$ and every output expression comes out on the wrong inputs.",
        "Writing 0s instead of Xs on rows 10–15, which part (b)'s gate budget does not allow.",
        "Forgetting $R_4$: it exists in the labelling but is constant 0.",
    ],
    "verification": "Each output row read as binary equals the row's digit mod 6 (checked for all ten digits in l4_01_design.py).",
    "animation": {"kind": "table", "title": "BCD digit → digit mod 6", "cols": ["digit", "I₄I₃I₂I₁", "mod 6", "R₃R₂R₁"], "rows": MOD6_ROWS, "mono": True},
}

# ── cse-2000-b-9-b: BCD mod 6 with 2 AND, 1 OR, 2 NOT (DESC) ────────────────
SOLUTIONS["cse-2000-b-9-b"] = {
    "approach": "Concept tested: **minimising each converter output with the BCD don't-cares, then meeting a gate budget**. One K-map per output bit; the budget (two 2-input ANDs, one 2-input gate, two NOTs) is met exactly when rows 10–15 are used as Xs. The bank text says \"one two-input gate\"; the design needs an **OR** there.",
    "concepts": ["Code converter", "Don't-cares", "Gate count", "K-map per output"],
    "given": "The table of part (a): $R_1$ = 1 on digits 1, 3, 5, 7, 9; $R_2$ = 1 on 2, 3, 8, 9; $R_3$ = 1 on 4, 5; $R_4 = 0$; Xs on 10–15.",
    "steps": [
        {"title": "R₁ and R₄ cost nothing", "body": "$R_1$ is 1 exactly on the odd digits, so $R_1 = I_1$ (a wire). $R_4 = 0$ (tied low). No gate is used yet."},
        {"title": "R₂ (weight 2)", "body": "1s on 2, 3, 8, 9. Rows 8–15 are 1s and Xs: the octet $I_4$. Digits 2, 3 (0010, 0011) join the Xs 10, 11 in the quad with $I_3 = 0$, $I_2 = 1$. So $R_2 = I_4 + I_2\\overline{I_3}$: one NOT ($\\overline{I_3}$), one 2-input AND, one 2-input OR."},
        {"title": "R₃ (weight 4)", "body": "1s on 4, 5 (digits 6 and 7 have residues 0 and 1). 0100 and 0101 join the Xs 12, 13 in the quad $I_3\\overline{I_2}$. So $R_3 = I_3\\overline{I_2}$: one NOT, one 2-input AND."},
        {"title": "Tally against the budget", "body": "ANDs: $I_2\\overline{I_3}$ and $I_3\\overline{I_2}$ (two). The single other two-input gate is the OR in $R_2$. NOTs: $\\overline{I_3}$ and $\\overline{I_2}$ (two). Exactly the parts allowed, so the bank's \"one two-input gate\" must be an OR gate."},
        {"title": "Why the don't-cares are essential", "body": "Without them $R_2$ would be $\\overline{I_4}\\,\\overline{I_3}I_2 + I_4\\overline{I_3}\\,\\overline{I_2}$ and $R_3 = \\overline{I_4}I_3\\overline{I_2}$, which need 3-input ANDs and more inverters: far over budget."},
    ],
    "answer": {"value": "$R_1 = I_1$, $R_2 = I_4 + I_2\\overline{I_3}$, $R_3 = I_3\\overline{I_2}$, $R_4 = 0$, built with two 2-input ANDs, one 2-input OR and two NOTs", "matchesKey": True},
    "shortcut": "Even modulus: $R_1 = I_1$ for free. Then only digits 2, 3, 8, 9 ($R_2$) and 4, 5 ($R_3$) need loops, and each loop reaches into rows 10–15.",
    "pitfalls": [
        "Reading \"one two-input gate\" as a third AND or as an XOR: the $R_2$ expression needs an OR.",
        "Treating 10–15 as 0s, which makes $R_2$ and $R_3$ 3-literal terms and breaks the budget.",
        "Counting $R_1$ and $R_4$ as gates: a wire and a constant are free.",
    ],
    "verification": "The five-gate netlist (NOT $I_2$, NOT $I_3$, AND($I_3$, $\\overline{I_2}$), AND($I_2$, $\\overline{I_3}$), OR($I_4$, ·)) simulated on digits 0–9 outputs $d \\bmod 6$ every time (l4_01_design.py).",
    "animation": {"kind": "circuit", "title": "BCD mod 6: R₃ and R₂ (R₁ = I₁, R₄ = 0)",
                  "inputs": [{"id": "I4", "label": "I₄", "value": 1}, {"id": "I3", "label": "I₃", "value": 0}, {"id": "I2", "label": "I₂", "value": 0}],
                  "gates": [{"id": "n2", "type": "NOT", "in": ["I2"]}, {"id": "n3", "type": "NOT", "in": ["I3"]},
                            {"id": "r3", "type": "AND", "in": ["I3", "n2"]}, {"id": "t", "type": "AND", "in": ["I2", "n3"]},
                            {"id": "r2", "type": "OR", "in": ["I4", "t"]}],
                  "outputs": [{"id": "R3", "from": "r3", "label": "R₃"}, {"id": "R2", "from": "r2", "label": "R₂"}],
                  "showValues": True, "caption": "Input digit 8 (1000): R₃ = 0, R₂ = 1, and R₁ = I₁ = 0, so the output is 010 = 2."},
}

# ── cse-2001-b-58-b: excess-3 → BCD, b4 as a minimal POS (DESC) ─────────────
SOLUTIONS["cse-2001-b-58-b"] = {
    "approach": "Concept tested: **a code converter output as a minimal product of sums, using the unused excess-3 codes as don't-cares**. The figure labels the bits by weight ($e_8 e_4 e_2 e_1$, $b_8 b_4 b_2 b_1$), so $b_4$ is the BCD weight-4 bit; loop its 0s on the map.",
    "concepts": ["Excess-3 code", "Minimal POS", "Don't-cares", "Code converter"],
    "given": "Inputs $e_8 e_4 e_2 e_1$ carry digit $d$ as the code $d + 3$ (3–12). Unused codes 0, 1, 2, 13, 14, 15 are don't-cares. Output $b_4$ = weight-4 bit of $d$.",
    "steps": [
        {"title": "Where b₄ is 1", "body": "$b_4 = 1$ for digits 4, 5, 6, 7, which arrive as codes 7, 8, 9, 10 (0111, 1000, 1001, 1010). The 0s are codes 3, 4, 5, 6, 11, 12; the Xs are 0, 1, 2, 13, 14, 15."},
        {"title": "Loop the 0s: the e₄ = 0 pair", "body": "Codes 3 (0011) and 11 (1011) form a pair with $e_4 = 0$, $e_2 = e_1 = 1$: the sum term $(e_4 + \\overline{e_2} + \\overline{e_1})$. It cannot grow: the quads around it contain code 7, or codes 9 and 10, which are 1s."},
        {"title": "Loop the 0s: the e₄ = 1 quads", "body": "Codes 4, 5, 12 with X13 form the quad $e_4 = 1, e_2 = 0$: $(\\overline{e_4} + e_2)$. Codes 4, 6, 12 with X14 form $e_4 = 1, e_1 = 0$: $(\\overline{e_4} + e_1)$. Every 0 is now covered."},
        {"title": "Result and its ties", "body": "$b_4 = (\\overline{e_4} + e_2)(\\overline{e_4} + e_1)(e_4 + \\overline{e_2} + \\overline{e_1})$: 7 literals. Two other covers also cost 7: the quad $(e_8 + e_1)$ (codes 0, 2, 4, 6) can replace $(\\overline{e_4} + e_1)$, or $(e_8 + e_2)$ (codes 0, 1, 4, 5) can replace $(\\overline{e_4} + e_2)$. All three are minimal."},
        {"title": "If the labels were read as positions", "body": "Some solutions read the labels as $e_4 e_3 e_2 e_1$ / $b_4 b_3 b_2 b_1$ with $b_4$ the MSB. Then $b_4$ is the BCD 8s bit, 1 only on codes 11 and 12, and its minimal POS is $e_4(e_3 + e_2)(e_3 + e_1)$ (5 literals). The scan shows weight labels (e8, b8 at the top), so the weight-4 answer above is the one asked."},
    ],
    "answer": {"value": "$b_4 = (\\overline{e_4} + e_2)(\\overline{e_4} + e_1)(e_4 + \\overline{e_2} + \\overline{e_1})$ (7 literals; one of three equally minimal POS forms). Under the MSB reading of the labels: $b_4 = e_4(e_3 + e_2)(e_3 + e_1)$", "matchesKey": True},
    "shortcut": "Subtracting 3 only moves codes 7–10 onto digits 4–7; on the map those four 1s straddle the $e_8$ boundary, so the 0s split into one 3-literal pair and two 2-literal quads.",
    "pitfalls": [
        "Forgetting codes 0, 1, 2 as don't-cares (only 13–15 are remembered by habit).",
        "Treating $b_4$ as the BCD MSB when the figure labels are weights.",
        "Fixing the Xs to the values a minimal SOP used before looping the 0s; the POS chooses its own Xs.",
    ],
    "verification": "Over the ten legal codes 3–12 the product is 1 exactly on 7, 8, 9, 10; an exhaustive POS search finds no cover with fewer than 7 literals and exactly three with 7 (l4_01_design.py).",
    "animation": {"kind": "table", "title": "Excess-3 codes and b₄", "cols": ["code e₈e₄e₂e₁", "digit", "b₄"],
                  "rows": [[format(c, "04b"), str(c - 3) if 3 <= c <= 12 else "—", str(int(((c - 3) >> 2) & 1)) if 3 <= c <= 12 else "X"] for c in range(16)],
                  "mono": True},
}

# ── cse-2004-cs-58: BCD digit ≥ 5 with AND/OR/NOT (MCQ) ─────────────────────
assert cl.min_gates_aon([5, 6, 7, 8, 9], 4, range(10, 16)) == 3
SOLUTIONS["cse-2004-cs-58"] = {
    "approach": "Concept tested: **designing a detector with don't-cares and proving a gate count is minimal**. Rows 10–15 never occur, so they are don't-cares; the map gives $A + BD + BC = A + B(C + D)$, three AND/OR gates and no NOT. Then show two gates cannot work.",
    "concepts": ["BCD don't-cares", "Factoring", "Minimum gate count", "Lower bound"],
    "given": "Inputs $A B C D$ = a BCD digit (8 4 2 1). Output 1 for digits 5–9. Gates: AND, OR, NOT only; complements cost a NOT.",
    "steps": [
        {"title": "Truth table", "body": "$f = \\Sigma m(5, 6, 7, 8, 9) + d(10, 11, 12, 13, 14, 15)$."},
        {"title": "Map", "body": "Rows 8–15 are 1s and Xs: the octet $A$. Digits 5, 7 with Xs 13, 15 form $BD$; digits 6, 7 with Xs 14, 15 form $BC$. Minimal SOP: $f = A + BD + BC$."},
        {"title": "Factor to count gates", "body": "$f = A + B(C + D)$: OR($C$, $D$), AND($B$, ·), OR($A$, ·). Three gates; no inverter is needed because every literal is uncomplemented."},
        {"title": "Two gates are impossible", "body": "Use $f(0000) = 0$, $f(0011) = 0$, $f(0100) = 0$, $f(0101) = 1$, $f(0110) = 1$, $f(1000) = 1$. A NAND/NOR of inputs is 1 on 0000. An AND of literals is 1 on a cube; one holding 0101 and 1000 also holds 0000. An OR of literals is 0 on a cube; one holding 0011 and 0100 also holds 0101. $\\text{OR}(X) + \\text{AND}(Y)$: 0100 and 0011 force $X \\subseteq \\{A\\}$, then 0101 and 0110 force $Y = \\{B\\}$, which makes 0100 a 1. $\\text{AND}(X) \\cdot \\text{OR}(Y)$: 1000 and 0101 force $X = \\varnothing$. Every two-gate circuit is one of these."},
    ],
    "answer": {"value": "(B) 3", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "No circuit of two AND/OR/NOT gates agrees with the detector on digits 0–9 (case analysis above; an exhaustive search agrees)."),
        opt("B", True, "$A + B(C + D)$ uses OR, AND, OR, and two gates cannot do it."),
        opt("C", False, "Four is what you get from $A + BD + BC$ drawn with 2-input gates only, or by adding an unneeded inverter; the question allows any fan-in and the factored form needs three."),
        opt("D", False, "Five or more comes from ignoring the don't-cares: $A'BD + A'BC + AB'C'$ needs inverters and three AND terms."),
    ],
    "shortcut": "\"BCD digit ≥ 5\" is the excess-3 MSB $E_3 = B_3 + B_2(B_1 + B_0)$: memorise it, three gates.",
    "pitfalls": [
        "Not using rows 10–15 as don't-cares (the digit can never exceed 9).",
        "Counting product terms instead of gates, or forgetting that each complement costs a NOT.",
        "Answering 2 by imagining an \"AND-OR\" box as one gate.",
    ],
    "verification": "The netlist OR(C, D) → AND(B, ·) → OR(A, ·) outputs 1 exactly on digits 5–9; comblib.min_gates_aon finds no 1- or 2-gate circuit and returns 3.",
    "animation": {"kind": "circuit", "title": "Digit ≥ 5 in three gates",
                  "inputs": [{"id": "A", "label": "A", "value": 0}, {"id": "B", "label": "B", "value": 1}, {"id": "C", "label": "C", "value": 0}, {"id": "D", "label": "D", "value": 1}],
                  "gates": [{"id": "s", "type": "OR", "in": ["C", "D"]}, {"id": "p", "type": "AND", "in": ["B", "s"]}, {"id": "f", "type": "OR", "in": ["A", "p"]}],
                  "outputs": [{"id": "F", "from": "f", "label": "f"}], "showValues": True,
                  "caption": "Digit 5 (0101): C + D = 1, B(C + D) = 1, so f = 1."},
}

# ── cse-2012-cs-6: which function a 2-variable table represents (MCQ) ───────
SOLUTIONS["cse-2012-cs-6"] = {
    "approach": "Concept tested: **matching a truth table to an expression**. Read the output column row by row; an expression represents the table only if it agrees on all four rows, and one disagreeing row rules it out.",
    "concepts": ["Truth table", "Matching expressions", "Counterexample row"],
    "steps": [
        {"title": "Read the column", "body": "Rows $XY$ = 00, 01, 10, 11 give $f$ = 0, 0, 1, 1. The output is 1 exactly when $X = 1$, whatever $Y$ is.", "scene": {"hl": [{"r": 2, "tone": "success"}, {"r": 3, "tone": "success"}]}},
        {"title": "Name it", "body": "$f = X\\overline{Y} + XY = X(\\overline{Y} + Y) = X$. $f$ does not depend on $Y$ at all."},
        {"title": "Test the other options", "body": "$X + Y$ gives 1 on row 01 (table: 0). $X \\oplus Y$ gives 0 on row 11 (table: 1). $Y$ gives 1 on row 01 and 0 on row 10. Each has a counterexample row.", "scene": {"hl": [{"r": 1, "tone": "error"}, {"r": 3, "tone": "error"}]}},
    ],
    "answer": {"value": "(A) $X$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The column 0011 is the column of $X$ itself."),
        opt("B", False, "$X + Y$ is 0111: it is 1 on row 01, where the table has 0."),
        opt("C", False, "$X \\oplus Y$ is 0110: it is 0 on row 11, where the table has 1."),
        opt("D", False, "$Y$ is 0101: it is wrong on rows 01 and 10."),
    ],
    "shortcut": "In counting order the first variable's own column is 0011 and the second's is 0101; this table is 0011, so $f = X$.",
    "pitfalls": ["Picking $X + Y$ or $X \\oplus Y$ because they agree on three rows; one row decides.", "Reading the column against the wrong variable order."],
    "verification": "Evaluating each option on all four rows: only $X$ reproduces 0, 0, 1, 1.",
    "animation": {"kind": "table", "title": "The table and the column of X", "cols": ["X", "Y", "f", "X"],
                  "rows": [[0, 0, 0, 0], [0, 1, 0, 0], [1, 0, 1, 1], [1, 1, 1, 1]], "mono": True},
}
