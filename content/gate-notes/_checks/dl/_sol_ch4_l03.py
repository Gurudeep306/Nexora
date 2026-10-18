"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 4, Lesson 3 (decoders,
demultiplexers, encoders and priority encoders). Merged by _sol_ch4.py; every key is re-derived in
l4_03_decoders.py (comblib netlists with DEC and MUX nodes)."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import comblib as cl  # noqa: E402
from _sol_ch1_fp import opt  # noqa: E402

SOLUTIONS = {}

# ── cse-1992-b-4-b: priority encoder from 4:1 MUXes (DESC) ──────────────────
SOLUTIONS["cse-1992-b-4-b"] = {
    "approach": "Concept tested: **a priority encoder built from multiplexers**. Write the priority encoder's table, then put the two highest-priority inputs $A$ and $B$ on the select lines of one 4:1 MUX per output bit and read each data input as a residue in $C$ (0, 1 or $C$). The paper does not give the output codes, so we state the assignment: A → 11, B → 10, C → 01, none → 00.",
    "concepts": ["Priority encoder", "MUX implementation table", "Residues", "Code assignment"],
    "given": "Inputs $A$ (highest priority), $B$, $C$ (lowest). Outputs $X_1X_0$; none active → 00. Codes assumed: A → 11, B → 10, C → 01 (the natural choice: the highest input gets the largest code, and 00 is left for \"none\").",
    "steps": [
        {"title": "The priority table", "body": "Scan from $A$ down; the first active input decides the code.\n\n| $A$ | $B$ | $C$ | Winner | $X_1$ | $X_0$ |\n|---|---|---|---|---|---|\n| 1 | x | x | A | 1 | 1 |\n| 0 | 1 | x | B | 1 | 0 |\n| 0 | 0 | 1 | C | 0 | 1 |\n| 0 | 0 | 0 | none | 0 | 0 |"},
        {"title": "Equations", "body": "$X_1 = 1$ when $A$ or $B$ wins: $A + \\overline{A}B = A + B$. $X_0 = 1$ when $A$ or $C$ wins: $A + \\overline{A}\\,\\overline{B}C = A + \\overline{B}C$ (the rule $x + \\overline{x}y = x + y$ removes $\\overline{A}$)."},
        {"title": "Choose the select lines", "body": "Put $A$ on $S_1$ and $B$ on $S_0$ of two 4:1 MUXes, one for $X_1$ and one for $X_0$. Then each data input sees only $C$, so every residue is 0, 1, $C$ or $\\overline{C}$, and no extra gate is needed."},
        {"title": "Data inputs of the X₁ MUX", "body": "$AB = 00$: $X_1 = 0$ whatever $C$ is → **0**. $AB = 01$: $B$ wins → **1**. $AB = 10$ and $11$: $A$ wins → **1**, **1**. Data $(I_0, I_1, I_2, I_3) = (0, 1, 1, 1)$.", "scene": {"hl": [{"c": 1, "tone": "accent"}]}},
        {"title": "Data inputs of the X₀ MUX", "body": "$AB = 00$: $X_0 = 1$ exactly when $C = 1$ → **$C$**. $AB = 01$: $B$ wins, code 10 → **0**. $AB = 10, 11$: $A$ wins, code 11 → **1**, **1**. Data $(C, 0, 1, 1)$.", "scene": {"hl": [{"c": 2, "tone": "success"}]}},
        {"title": "Another code assignment", "body": "The data inputs depend on the codes, not on the method. With A → 01, B → 10, C → 11 (none → 00): $X_1 = \\overline{A}(B + C)$ with data $(C, 1, 0, 0)$, and $X_0 = A + \\overline{B}C$ with data $(C, 0, 1, 1)$. Recompute each column from the table for whatever codes the question intends."},
    ],
    "answer": {"value": "With A→11, B→10, C→01: $X_1 = A + B$, $X_0 = A + \\overline{B}C$; with A, B as MUX selects, the $X_1$ MUX data ($AB = 00, 01, 10, 11$) are 0, 1, 1, 1 and the $X_0$ MUX data are C, 0, 1, 1", "matchesKey": True},
    "shortcut": "Put the two highest-priority inputs on the selects: whenever either is 1 the code is fixed (a constant on the data line), and only the $AB = 00$ line depends on the lowest input $C$.",
    "pitfalls": [
        "Treating it as a plain encoder: with $A = B = 1$ the outputs must still give A's code, not the OR of two codes.",
        "Putting $C$ on a select line: then the residues are functions of $A$ and $B$ and extra gates are needed.",
        "Swapping $S_1$ and $S_0$, which permutes the data inputs (with $B$ on $S_1$, the $X_1$ data become 0, 1, 1, 1 in the order $BA = 00, 01, 10, 11$ and the $X_0$ data $C, 1, 0, 1$).",
    ],
    "verification": "All 8 rows of $(A, B, C)$, simulated with both MUXes: $(X_1, X_0)$ = 00, 01, 10, 10, 11, 11, 11, 11 for rows 0–7, which is A → 11, B → 10, C → 01, none → 00 (checked by enumeration in l4_03_decoders.py).",
    "animation": {"kind": "table", "title": "Implementation table, selects A (S₁), B (S₀)", "cols": ["AB", "X₁ (C = 0, 1)", "X₀ (C = 0, 1)"],
                  "rows": [["00", "0 0 → 0", "0 1 → C"], ["01", "1 1 → 1", "0 0 → 0"], ["10", "1 1 → 1", "1 1 → 1"], ["11", "1 1 → 1", "1 1 → 1"]],
                  "mono": True},
}

# ── cse-2007-cs-8: 6:64 from 3:8 decoders ───────────────────────────────────
levels, total = cl.decoder_tree(6, 3)
SOLUTIONS["cse-2007-cs-8"] = {
    "approach": "Concept tested: **decoder expansion with enables**. Leaves decode the low bits; the enables of the leaves must themselves be decoded from the high bits, by another decoder, because no other gates are allowed.",
    "concepts": ["Decoder", "Enable input", "Decoder tree"],
    "steps": [
        {"title": "Leaves", "body": f"Each 3:8 decoder gives 8 outputs, so $64 / 8 = {levels[0]}$ leaf decoders, all fed by the low address bits $A_2A_1A_0$. Leaf $j$ supplies outputs $8j$ to $8j + 7$."},
        {"title": "Who enables the leaves?", "body": "Exactly one leaf may be on: leaf $j$ when the high bits $A_5A_4A_3$ equal $j$. Eight enable lines, one-hot in three bits, is precisely a 3:8 decoder on $A_5A_4A_3$. Without it (no other gates allowed), all eight leaves would be on at once and light eight outputs."},
        {"title": "Count", "body": f"${levels[0]} + {levels[1]} = {total}$. Check with the closed form for $k \\mid n$: $(2^6 - 1)/(2^3 - 1) = 63/7 = 9$."},
    ],
    "answer": {"value": "(C) 9", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "7 decoders have at most $7 \\times 8 = 56$ outputs, fewer than 64, so 7 cannot even supply the outputs; 7 is the block count of a different tree (3:8 from 1:2 decoders, $4 + 2 + 1$)."),
        opt("B", False, "8 counts only the leaves; nothing would then decode the high three bits to enable one leaf at a time."),
        opt("C", True, "8 leaves on the low bits plus 1 decoder on the high bits driving their enables."),
        opt("D", False, "10 adds a block that is not needed: the top decoder is enabled by the tree's own enable (or tied high)."),
    ],
    "shortcut": "Leaves first, then divide by 8 until one block: $8 + 1 = 9$; or $(2^n - 1)/(2^k - 1)$ when $k$ divides $n$.",
    "pitfalls": ["Answering 8 (the leaves only).", "Using an inverter or mixed enable polarities, which the question rules out."],
    "verification": "The 9-block netlist (one 3:8 on $A_5A_4A_3$ driving the enables of eight 3:8s on $A_2A_1A_0$) was simulated on all 128 rows of $(E, A_5 \\dots A_0)$ and equals a 6:64 decoder.",
}

# ── it-2008-it-9: NOR of four decoder outputs ──────────────────────────────
SOLUTIONS["it-2008-it-9"] = {
    "approach": "Concept tested: **a function from a decoder and a NOR gate**. Decoder output $O_i$ is the minterm $m_i$ of the inputs in the stated order ($z$ is the MSB); a NOR of some outputs is 1 exactly on the **other** rows.",
    "concepts": ["Decoder outputs are minterms", "Decoder + NOR", "Address order"],
    "given": "3:8 decoder, inputs $z$ (MSB), $y$, $x$ (LSB); outputs $O_7, O_5, O_2, O_0$ into a 4-input NOR with output $f$.",
    "steps": [
        {"title": "Rows that give f = 0", "body": "A NOR outputs 0 as soon as one input is 1. $O_7, O_5, O_2, O_0$ are 1 on rows 7, 5, 2, 0, so $f = 0$ there.", "scene": {"hl": [{"r": 0, "tone": "error"}, {"r": 2, "tone": "error"}, {"r": 5, "tone": "error"}, {"r": 7, "tone": "error"}]}},
        {"title": "Rows that give f = 1", "body": "$f = 1$ on the remaining rows 1, 3, 4, 6. In the order $(z, y, x)$ these are 001, 011, 100, 110.", "scene": {"hl": [{"r": 1, "tone": "success"}, {"r": 3, "tone": "success"}, {"r": 4, "tone": "success"}, {"r": 6, "tone": "success"}]}},
        {"title": "Simplify", "body": "In every one of these rows $x \\ne z$, and $y$ takes both values. So $f = x\\overline{z} + \\overline{x}z = x \\oplus z$."},
        {"title": "Does the MSB matter here?", "body": "Reading $x$ as the MSB would reverse each index's bits: $1 \\leftrightarrow 4$, $3 \\leftrightarrow 6$. The set $\\{1, 3, 4, 6\\}$ maps to itself, so this circuit happens to give $x \\oplus z$ either way; in general the order changes the function and must be fixed first."},
    ],
    "answer": {"value": "(B) $x\\overline{z} + \\overline{x}z$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "As printed, $xz + \\overline{xz}$ is the constant 1. Read as $xz + \\overline{x}\\,\\overline{z}$ it is $x \\odot z$, the complement of $f$: what an OR of the four outputs would give (forgetting the NOR's inversion)."),
        opt("B", True, "$x \\oplus z$: 1 on rows 1, 3, 4, 6, exactly the rows whose outputs are not on the NOR."),
        opt("C", False, "$\\overline{xy} + yz$ is 1 on rows 0, 1, 2, 4, 5, 6, 7 (all but row 3); it is 1 on rows 0, 2, 5, 7 where $f = 0$."),
        opt("D", False, "$xy + \\overline{yz}$ is 0 only on row 6 ($z = y = 1$, $x = 0$); it is 1 on rows 0, 2, 5, 7 where $f = 0$."),
    ],
    "shortcut": "NOR of the outputs = OR of the outputs **not** connected: rows 1, 3, 4, 6, which pair up as $x \\ne z$.",
    "pitfalls": ["Taking $f$ as the OR of $m_7, m_5, m_2, m_0$, which gives the complement $x \\odot z$.", "Reading the indices with $x$ as the MSB without checking (harmless here, wrong in general)."],
    "verification": "Simulated on all 8 rows with $z$ as the MSB: $f = (0, 1, 0, 1, 1, 0, 1, 0)$, which equals $x \\oplus z$ row for row.",
    "animation": {"kind": "table", "title": "Decoder rows (z y x) and the NOR output", "cols": ["z y x", "output on", "f"],
                  "rows": [[f"{i >> 2}{(i >> 1) & 1}{i & 1}", f"O{i}", int(i in (1, 3, 4, 6))] for i in range(8)], "mono": True},
}

# ── cse-2013-cs-5: name the block from its table ───────────────────────────
SOLUTIONS["cse-2013-cs-5"] = {
    "approach": "Concept tested: **recognising a priority encoder from its truth table**. Four inputs go in, a 2-bit code and a valid bit come out, and the input columns contain x's: lower inputs do not matter once a higher one is active.",
    "concepts": ["Priority encoder", "Valid bit", "Encoder vs decoder"],
    "given": "Inputs $D_0 \\dots D_3$; outputs $X_0, X_1$ and $V$; five rows, with x's in the input columns of the last three.",
    "steps": [
        {"title": "Direction of the block", "body": "Four inputs → a 2-bit code: many lines in, few out. That is the encoder direction (a decoder goes from a few address bits to many one-hot outputs)."},
        {"title": "Read the rows", "body": "Row 3 ($D_1 = 1$, $D_2 = D_3 = 0$, $D_0$ = x) gives code 01; row 4 ($D_2 = 1$, $D_3 = 0$, $D_0, D_1$ = x) gives 10; row 5 ($D_3 = 1$, the rest x) gives 11. The code is the index of the **highest** active input, and every lower input is a don't-care.", "scene": {"hl": [{"r": 2, "tone": "accent"}, {"r": 3, "tone": "accent"}, {"r": 4, "tone": "accent"}]}},
        {"title": "The valid bit", "body": "The all-zero row has $V = 0$ and don't-care outputs; every other row has $V = 1$. A valid output that flags \"some input is active\" is the second signature of a priority encoder. (Note that the table lists $X_0$ before $X_1$; from the rows, $X_0$ is the high bit of the code.)", "scene": {"hl": [{"r": 0, "tone": "warning"}]}},
    ],
    "answer": {"value": "(A) Priority encoder", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Highest active input wins (x's on the lower inputs), output is its index, and $V$ marks a valid input."),
        opt("B", False, "A decoder maps an $n$-bit number to $2^n$ one-hot outputs; here 4 inputs give a 2-bit code, the opposite direction, and a decoder's table has x's in its address columns only on the disabled row ($E = 0$, all outputs 0), never on rows with a 1 output."),
        opt("C", False, "A multiplexer has select inputs and data inputs and one output equal to the selected data input; there are no select lines here and the outputs are codes, not a copied data bit."),
        opt("D", False, "A demultiplexer has one data input and copies it to one of many outputs; this block has four inputs and a coded output."),
    ],
    "shortcut": "x's in the **input** columns plus a valid bit = priority encoder.",
    "pitfalls": ["Choosing \"decoder\" because the word \"valid\" sounds like an enable.", "Reading $X_1$ as the high bit because it is the usual name; the table puts $X_0$ first, and it is $X_0$ that is 1 for $D_2$ and $D_3$."],
    "verification": "Expanding the x's, the five rows cover all 16 input patterns (1 + 1 + 2 + 4 + 8) and each agrees with a 4:2 priority encoder ($D_3$ highest) whose code is written $X_0X_1$ with $X_0$ the MSB. Column order check: $D_2$'s row gives $X_0X_1 = 10$, so $X_0$ is the weight-2 bit (and $D_1$'s row, $X_0X_1 = 01$, confirms $X_1$ is the weight-1 bit).",
    "animation": {"kind": "table", "title": "The table (D₀ D₁ D₂ D₃ → X₀ X₁ V)", "cols": ["D0", "D1", "D2", "D3", "X0", "X1", "V"],
                  "rows": [[0, 0, 0, 0, "x", "x", 0], [1, 0, 0, 0, 0, 0, 1], ["x", 1, 0, 0, 0, 1, 1], ["x", "x", 1, 0, 1, 0, 1], ["x", "x", "x", 1, 1, 1, 1]], "mono": True},
}

# ── cse-2020-cs-20: m + n for a 1 KB byte-addressable RAM ───────────────────
SOLUTIONS["cse-2020-cs-20"] = {
    "approach": "Concept tested: **address decoding**. A decoder that uniquely addresses a memory needs one output per addressable location and $\\log_2$ of that many inputs.",
    "concepts": ["Decoder", "Address decoding", "Byte-addressable memory"],
    "steps": [
        {"title": "Count the locations", "body": "Byte-addressable: each byte is one location. $1\\ \\text{KB} = 2^{10} = 1024$ bytes, so 1024 locations."},
        {"title": "Size the decoder", "body": "One output per location: $n = 1024$. The address that picks one of 1024 locations has $m = \\log_2 1024 = 10$ bits, so the decoder is 10:1024. A smaller decoder cannot give 1024 distinct one-hot outputs, so this is the minimum."},
        {"title": "Add", "body": "$m + n = 10 + 1024 = 1034$."},
    ],
    "answer": {"value": "1034", "number": 1034, "matchesKey": True},
    "shortcut": "For $2^k$ bytes, byte-addressable: $m + n = k + 2^k$.",
    "pitfalls": ["Taking 1 K as 1000.", "Adding only inputs or only outputs (10, 20 or 1024).", "Counting words instead of bytes; the memory is byte-addressable."],
    "verification": "$2^{10} = 1024$, and a 10:1024 decoder has 10 inputs and 1024 outputs: $10 + 1024 = 1034$.",
}

# ── cse-2022-cs-30: P, Q and T in the display system ───────────────────────
SOLUTIONS["cse-2022-cs-30"] = {
    "approach": "Concept tested: **naming blocks by their job**. An address field must switch on one word of a memory: number in, one-hot out, a decoder. A mode bit that chooses between two words is the select of a multiplexer.",
    "concepts": ["Decoder", "Multiplexer", "Address decoding", "DEMUX vs decoder"],
    "given": "16-bit code word = M (1 bit) + S-address + R-address. S: 1024 words; R: 32 registers. P serves S, Q serves R, T chooses between S's and R's words by M and loads X.",
    "steps": [
        {"title": "Field widths", "body": "S has $1024 = 2^{10}$ words, so its address field is 10 bits; R has $32 = 2^5$ registers, so 5 bits; with M that is $1 + 10 + 5 = 16$ bits, the whole code word."},
        {"title": "Blocks P and Q", "body": "P takes the 10-bit field and must activate exactly one of S's 1024 words: a $10:2^{10}$ decoder. Likewise Q takes the 5-bit field and activates one of 32 registers: a $5:2^5$ decoder."},
        {"title": "Block T", "body": "T receives two whole words (one from S, one from R) and passes one of them to X according to M: a 2:1 multiplexer (one per bit of the word), with M on its select line."},
        {"title": "Why not the others", "body": "A DEMUX has one data input and routes it to one of many outputs; P and Q have no data to route, only an address to decode, and \"1:10\" has 10 outputs, not 1024. An encoder goes the other way (many one-hot lines → a short code) and passes no data, so it cannot be T."},
    ],
    "answer": {"value": "(C) P is a $10:2^{10}$ decoder; Q is a $5:2^5$ decoder; T is a 2:1 multiplexer", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "A 10:1 MUX would pick one of 10 inputs; P must turn a 10-bit address into one of 1024 word selects, and Q one of 32."),
        opt("B", False, "P and Q are right, but T cannot be an encoder: an encoder converts one-hot lines into a code and has no data path to pass a word from S or R into X."),
        opt("C", True, "Address fields → one-hot word selects (decoders); mode bit chooses one of two words (2:1 MUX)."),
        opt("D", False, "A 1:10 DEMUX routes one data bit to one of 10 outputs. P has no data input to route and must drive 1024 word lines; even read as \"a decoder is a DEMUX with data on the enable\", the size would be 1:1024, not 1:10."),
    ],
    "shortcut": "Field of $k$ address bits → $k:2^k$ decoder; \"choose one of two words by a bit\" → 2:1 MUX.",
    "pitfalls": ["Confusing the field width (10) with the number of outputs (1024).", "Choosing the DEMUX option because a decoder and a DEMUX share their gates: the DEMUX option has the wrong size and a data input that does not exist here."],
    "verification": "$\\log_2 1024 = 10$, $\\log_2 32 = 5$, $1 + 10 + 5 = 16$ = the code-word width.",
}

# ── cse-2026-2-cs-49: a 2:4 decoder feeding a 4:1 MUX ───────────────────────
SOLUTIONS["cse-2026-2-cs-49"] = {
    "approach": "Concept tested: **decoder outputs are minterms**. Each data input of the MUX is either a constant or a decoder output $D_j = m_j(A, B)$, which is 1 on exactly one $(A, B)$ row. Count the rows with $Y = 1$ for each select value and add.",
    "concepts": ["Decoder outputs are minterms", "MUX equation", "Counting rows"],
    "given": "2:4 decoder (active high) on $A$ (MSB), $B$; 4:1 MUX with $I_0 = D_0$, $I_1 = 0$, $I_2 = 1$, $I_3 = D_3$, selects $S_1S_0$. Rows are $[A\\,B\\,S_1\\,S_0]$, 16 in all.",
    "steps": [
        {"title": "S₁S₀ = 00", "body": "$Y = D_0 = \\overline{A}\\,\\overline{B}$: 1 on one of the four $(A, B)$ rows → **1**.", "scene": {"hl": [{"r": 0, "tone": "success"}]}},
        {"title": "S₁S₀ = 01", "body": "$Y = I_1 = 0$ → **0** rows.", "scene": {"hl": [{"r": 1, "tone": "muted"}]}},
        {"title": "S₁S₀ = 10", "body": "$Y = I_2 = 1$ for every $(A, B)$ → **4** rows.", "scene": {"hl": [{"r": 2, "tone": "success"}]}},
        {"title": "S₁S₀ = 11", "body": "$Y = D_3 = AB$ → **1** row.", "scene": {"hl": [{"r": 3, "tone": "success"}]}},
        {"title": "Add", "body": "The select values do not overlap, so $1 + 0 + 4 + 1 = 6$. As an expression: $Y = \\overline{S_1}\\,\\overline{S_0}\\,\\overline{A}\\,\\overline{B} + S_1\\overline{S_0} + S_1S_0AB$."},
    ],
    "answer": {"value": "6", "number": 6, "matchesKey": True},
    "shortcut": "A decoder output on a data line contributes 1 row, a constant 1 contributes $2^2 = 4$, a constant 0 nothing: $1 + 0 + 4 + 1$.",
    "pitfalls": ["Counting the constant-1 input as a single row instead of all four $(A, B)$ rows.", "Counting the unconnected outputs $D_1, D_2$: they reach nothing."],
    "verification": "The netlist (DEC on $A, B$; MUX with data $D_0$, 0, 1, $D_3$) simulated over all 16 rows gives $Y = 1$ on exactly 6.",
    "animation": {"kind": "table", "title": "Rows with Y = 1 per select value", "cols": ["S₁S₀", "data passed", "rows of (A, B) with Y = 1"],
                  "rows": [["00", "D0 = A′B′", 1], ["01", "0", 0], ["10", "1", 4], ["11", "D3 = AB", 1]], "mono": True},
}

# Consistency with the enumeration (the full checks are in l4_03_decoders.py).
assert total == 9
net = [("Q", "DEC", {"a": ["z", "y", "x"]}), ("f", "NOR", ["Q.7", "Q.5", "Q.2", "Q.0"])]
assert cl.ones_of(cl.truth(net, ["z", "y", "x"], "f")) == [1, 3, 4, 6]
net = [("Q", "DEC", {"a": ["A", "B"]}), ("Y", "MUX", {"d": ["Q.0", "0", "1", "Q.3"], "s": ["S1", "S0"]})]
assert len(cl.ones_of(cl.truth(net, ["A", "B", "S1", "S0"], "Y"))) == 6
