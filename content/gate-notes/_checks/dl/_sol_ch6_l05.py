"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 6, Lesson 5 (synchronous counter
design): cse-1991-b-5-c, cse-1992-b-4-c, cse-1998-b-68, cse-2004-cs-61, cse-2014-3-cs-45, cse-2015-2-cs-7,
cse-2016-1-cs-8, cse-2017-2-cs-42, cse-2021-1-cs-28, cse-2026-1-cs-27. Every key is re-derived by designing
or simulating the counter in l6_05_sync_design.py; _sol_ch6.py merges this module and writes src/gate/solutions."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
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


SOLUTIONS["cse-1991-b-5-c"] = {
    "approach": "Concept tested: **the maximum clock frequency of a synchronous counter**. The period must cover the slowest path from a flip-flop output, through the gates, to a flip-flop input: $T \\ge t_{FF} + t_{\\text{gates}} + t_{su}$. Only gates on such paths count.",
    "concepts": ["Synchronous counter", "AND-chain gating", "Critical path", "Maximum clock frequency"],
    "given": "Three JK flip-flops on one clock. $J_0 = K_0 = 1$; AND$_1 = 1 \\cdot Q_0$ drives $J_1 = K_1$; AND$_2$ = AND$_1 \\cdot Q_1$ drives $J_2 = K_2$; AND$_3$ = AND$_2 \\cdot Q_2$ is the carry output. Every flip-flop and AND gate: 10 ns; setup time negligible.",
    "steps": [
        {"title": "What the circuit is", "body": "Each stage has $J = K$, so it is a T stage: $T_1 = Q_0$, $T_2 = Q_1Q_0$. It is a 3-bit synchronous binary up counter whose AND terms are built as a serial chain."},
        {"title": "List the paths that end at a flip-flop input", "body": "To $J_1K_1$: flip-flop + AND$_1$ = 20 ns. To $J_2K_2$: flip-flop + AND$_1$ + AND$_2$ = 30 ns. AND$_3$ feeds no flip-flop, so no path through it ends inside the counter.", "scene": {"reveal": 2}},
        {"title": "The period", "body": "$T \\ge 30$ ns (setup negligible), so $f_{\\max} = 1/30\\ \\text{ns} \\approx 33.3$ MHz.", "scene": {"reveal": 3}},
    ],
    "answer": {"value": "≈ 33.3 MHz (minimum period 30 ns)", "matchesKey": True},
    "shortcut": "Count the gates between a flip-flop and the **last** J/K input: two here. $10 + 2 \\times 10 = 30$ ns.",
    "pitfalls": [
        "Adding the carry-out gate AND$_3$ (40 ns, 25 MHz): it drives no flip-flop of this counter.",
        "Counting only one gate (20 ns, 50 MHz), as if the gating were parallel.",
        "Ignoring the first AND gate because one of its inputs is the constant 1: it is still a real gate with a real delay.",
    ],
    "verification": "Simulated as a Sync machine with J = K inputs, the circuit counts 0, 1, …, 7, 0; the path delays 20 ns and 30 ns give the 30 ns bound.",
    "animation": table("Paths that end at a flip-flop input", ["path", "delay (ns)"],
                       [["FF0 → AND1 → J1K1", 20], ["FF0 → AND1 → AND2 → J2K2", 30], ["… → AND3 → carry out (no FF)", "not a FF path"]],
                       ["stage 1", "stage 2", "carry"], reveal=1),
}

SOLUTIONS["cse-1992-b-4-c"] = {
    "approach": "Concept tested: **designing a counter for a given sequence with D flip-flops**. 'At most one flip-flop changes per step' is the 3-bit Gray code. With D flip-flops each input is the next-state bit, so each D equation is read straight off the state table and minimised.",
    "concepts": ["Gray code", "Counter design", "D flip-flop", "K-map"],
    "given": "A 3-bit counter with D flip-flops in which no more than one flip-flop changes state between consecutive states.",
    "steps": [
        {"title": "Choose the sequence", "body": "The reflected Gray code: 000 → 001 → 011 → 010 → 110 → 111 → 101 → 100 → 000. All 8 states are used, so there are no don't-cares and nothing can lock out."},
        {"title": "D2 = next MSB", "body": "$Q_2^+ = 1$ for the present states 010, 110, 111, 101. Pairs 010/110 ($Q_1\\overline{Q_0}$) and 111/101 ($Q_2Q_0$): $D_2 = Q_1\\overline{Q_0} + Q_2Q_0$.", "scene": {"reveal": 2}},
        {"title": "D1 = next middle bit", "body": "$Q_1^+ = 1$ for 001, 011, 010, 110. Pairs 001/011 ($\\overline{Q_2}Q_0$) and 010/110 ($Q_1\\overline{Q_0}$): $D_1 = \\overline{Q_2}Q_0 + Q_1\\overline{Q_0}$.", "scene": {"reveal": 3}},
        {"title": "D0 = next LSB", "body": "$Q_0^+ = 1$ for 000, 001, 110, 111: $Q_0$ is irrelevant and $Q_2 = Q_1$ is needed: $D_0 = \\overline{Q_2}\\,\\overline{Q_1} + Q_2Q_1 = \\overline{Q_2 \\oplus Q_1}$.", "scene": {"reveal": 4}},
    ],
    "answer": {"value": "Gray sequence 000→001→011→010→110→111→101→100→000 with $D_2 = Q_1\\overline{Q_0} + Q_2Q_0$, $D_1 = \\overline{Q_2}Q_0 + Q_1\\overline{Q_0}$, $D_0 = \\overline{Q_2 \\oplus Q_1}$", "matchesKey": True},
    "shortcut": "In a Gray sequence the parity of the state alternates every step; that is why $D_0$ comes out as the XNOR of the other two bits.",
    "pitfalls": [
        "Writing T-style 'change' columns for D flip-flops: a D input is the new value, not the change.",
        "Using a non-cyclic Gray order: the last state 100 must return to 000 with one bit change too.",
    ],
    "verification": "seqlib.design_counter for the Gray sequence with D flip-flops returns exactly these three minimal SOPs, and the built circuit's only cycle is the 8-state Gray cycle.",
    "animation": table("Gray counter: next state = D inputs", ["Q2Q1Q0", "Q2⁺Q1⁺Q0⁺"],
                       [["000", "001"], ["001", "011"], ["011", "010"], ["010", "110"], ["110", "111"], ["111", "101"], ["101", "100"], ["100", "000"]], reveal=1),
}

SOLUTIONS["cse-1998-b-68"] = {
    "approach": "Concept tested: **a counter for an arbitrary sequence**. Three flip-flops (the largest value is 4 = 100); write the state table, use the unused states 0, 5, 6, 7 as don't-cares, read each D input as the next-state bit and minimise; then check the unused states.",
    "concepts": ["Arbitrary-sequence counter", "D flip-flop", "Don't-cares", "Self-starting"],
    "given": "Design a synchronous counter that goes through 1, 4, 2, 3, 1, 4, 2, 3, …",
    "steps": [
        {"title": "State table", "body": "$Q_2Q_1Q_0$: 001 → 100, 100 → 010, 010 → 011, 011 → 001. Unused: 000, 101, 110, 111 (don't-cares)."},
        {"title": "D1 and D0", "body": "$D_1$ is 1 in rows 100 and 010; with the don't-cares 000 and 110 they fill the $Q_0 = 0$ half: $D_1 = \\overline{Q_0}$. $D_0$ is 1 in rows 010 and 011; with 110 and 111 they fill the $Q_1 = 1$ half: $D_0 = Q_1$.", "scene": {"reveal": 3}},
        {"title": "The D2 column", "body": "$D_2$ is 1 only in row 001. It pairs with the don't-care 101 ($\\overline{Q_1}Q_0$) or with 000 ($\\overline{Q_2}\\,\\overline{Q_1}$); both are minimal. Take $D_2 = \\overline{Q_1}Q_0$.", "scene": {"reveal": 4}},
        {"title": "Self-start check", "body": "With these equations 000 → 010, 101 → 100, 110 → 011, 111 → 001: every unused state enters the cycle in one clock."},
    ],
    "answer": {"value": "With D flip-flops ($Q_2Q_1Q_0$): $D_2 = \\overline{Q_1}Q_0$ (or $\\overline{Q_2}\\,\\overline{Q_1}$), $D_1 = \\overline{Q_0}$, $D_0 = Q_1$; self-starting", "matchesKey": True},
    "shortcut": "Read the D columns as next-state bits: $Q_1^+$ is the complement of $Q_0$ in every used row, and $Q_0^+$ copies $Q_1$; only $D_2$ needs a gate.",
    "pitfalls": [
        "Using 2 flip-flops because there are 4 states: the values 1 … 4 need 3 bits unless you re-encode the states (and then the outputs need decoding).",
        "Not checking the unused states: don't-cares can create a lock-out (here they do not).",
    ],
    "verification": "seqlib.design_counter([1, 4, 2, 3], 'D') returns D2 ∈ {Q1′Q0, Q2′Q1′}, D1 = Q0′, D0 = Q1, and self_starting is true for both choices of D2.",
    "animation": table("1 → 4 → 2 → 3 with D flip-flops", ["Q2Q1Q0", "next", "D2 D1 D0"],
                       [["001", "100", "1 0 0"], ["100", "010", "0 1 0"], ["010", "011", "0 1 1"], ["011", "001", "0 0 1"], ["000/101/110/111", "x", "x x x"]],
                       ["1", "4", "2", "3", "unused"], reveal=1),
}

SOLUTIONS["cse-2004-cs-61"] = {
    "approach": "Concept tested: **T flip-flop counter design**. For T flip-flops $T = Q \\oplus Q^+$: the T column marks the rows in which the bit changes. Build the T1 column for 0 → 2 → 3 → 1 and match it.",
    "concepts": ["T flip-flop", "Excitation table", "Counter design", "XOR"],
    "given": "A 2-bit counter with T flip-flops ($Q_2$ = MSB, $Q_1$ = LSB) for 0 → 2 → 3 → 1 → 0; $T_2$ is driven by an XNOR of $Q_2$ and $Q_1$; $X = T_1$ is missing.",
    "steps": [
        {"title": "Sequence in bits", "body": "00 → 10 → 11 → 01 → 00."},
        {"title": "T columns", "body": "Mark the bits that change: rows 00, 10, 11, 01 give $T_2$ = 1, 0, 1, 0 and $T_1$ = 0, 1, 0, 1.", "scene": {"reveal": 4}},
        {"title": "Read the functions", "body": "$T_2$ is 1 in 00 and 11: $\\overline{Q_2 \\oplus Q_1}$, which is the XNOR in the figure (a consistency check). $T_1$ is 1 in 10 and 01: $T_1 = Q_1 \\oplus Q_2$."},
    ],
    "answer": {"value": "(D) $X = Q_1 \\oplus Q_2$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\overline{Q_2}$ gives $T_1 = 1$ in state 00, so 00 would go to 11 instead of 10."),
        opt("B", False, "$Q_2 + Q_1$ gives $T_1 = 1$ in state 11, so 11 would go to 00 instead of 01."),
        opt("C", False, "The XNOR is $T_2$'s equation; with it both stages get the same input and 00 → 11."),
        opt("D", True, "$T_1$ = 0, 1, 0, 1 in rows 00, 10, 11, 01 is exactly $Q_1 \\oplus Q_2$; the circuit then steps 00 → 10 → 11 → 01 → 00."),
    ],
    "shortcut": "On 00 → 10 only the MSB changes, so $T_1 = 0$ in state 00: that rules out A ($\\overline{Q_2} = 1$) and C (XNOR = 1) at once; B gives $T_1 = 1$ in state 11, where the LSB must stay 1.",
    "pitfalls": [
        "Writing the next-state bit instead of the change (the D answer $D_1 = Q_2$).",
        "Mixing up which flip-flop is the MSB: the figure's $Q_2$ is the MSB.",
    ],
    "verification": "Simulating the two T flip-flops with $T_2 = \\overline{Q_2 \\oplus Q_1}$ and each option as $T_1$: only option D gives 0, 2, 3, 1, 0.",
    "animation": table("T = Q ⊕ Q⁺ for 0 → 2 → 3 → 1", ["Q2Q1", "Q2⁺Q1⁺", "T2", "T1"],
                       [["00", "10", 1, 0], ["10", "11", 0, 1], ["11", "01", 1, 0], ["01", "00", 0, 1]], reveal=1),
}

SOLUTIONS["cse-2014-3-cs-45"] = {
    "approach": "Concept tested: **tracing a given synchronous JK counter**. Write $J$ and $K$ of every stage, reduce stages to D or T form where possible, and update all three flip-flops together from the old state.",
    "concepts": ["JK flip-flop", "Synchronous counter", "State trace"],
    "given": "JK flip-flops on one clock with $J_2 = \\overline{Q_1}$, $K_2 = Q_0$, $J_1 = Q_2$, $K_1 = \\overline{Q_2}$, $J_0 = Q_1$, $K_0 = \\overline{Q_0}$; initial $Q_2Q_1Q_0 = 000$.",
    "steps": [
        {"title": "Simplify", "body": "$K_1 = \\overline{J_1}$: stage 1 is a D stage, $Q_1^+ = Q_2$. Stage 0: $Q_0^+ = Q_1\\overline{Q_0} + Q_0 = Q_1 + Q_0$. Stage 2: $Q_2^+ = \\overline{Q_1}\\,\\overline{Q_2} + \\overline{Q_0}Q_2$."},
        {"title": "Clock 1 (from 000)", "body": "$Q_2^+ = 1$, $Q_1^+ = 0$, $Q_0^+ = 0$: **100**.", "scene": {"reveal": 2}},
        {"title": "Clock 2 (from 100)", "body": "$Q_2^+ = \\overline{Q_1}\\,\\overline{Q_2} + \\overline{Q_0}Q_2 = 0 + 1 = 1$, $Q_1^+ = Q_2 = 1$, $Q_0^+ = Q_1 + Q_0 = 0$: **110**.", "scene": {"reveal": 3}},
        {"title": "Clock 3 (from 110)", "body": "$Q_2^+ = \\overline{Q_0}Q_2 = 1$, $Q_1^+ = 1$, $Q_0^+ = Q_1 + Q_0 = 1$: **111**.", "scene": {"reveal": 4}},
    ],
    "answer": {"value": "(C) 100, 110, 111", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "001, 010, 011 assumes the circuit is a binary counter; from 000, $J_2 = 1$ sets $Q_2$ at once."),
        opt("B", False, "111 after one clock would need $Q_1$ and $Q_0$ to be set from 000, but $J_1 = Q_2 = 0$ and $J_0 = Q_1 = 0$."),
        opt("C", True, "Trace: 000 → 100 → 110 → 111."),
        opt("D", False, "100 is right, but from 100 stage 1 loads $Q_2 = 1$, so the second state has $Q_1 = 1$ and $Q_2$ stays 1 ($K_2 = Q_0 = 0$): 110, not 011."),
    ],
    "shortcut": "Stage 1 copies $Q_2$ (J = Q2, K = Q̄2). From 000 the first state has $Q_2 = 1$ and $Q_1 = 0$: only options C and D start with 100; the second state must then have $Q_1 = 1$ and $Q_2$ held: 110.",
    "pitfalls": [
        "Updating the flip-flops one at a time and using new values for the next one.",
        "Assuming a 'counter' counts in binary.",
    ],
    "verification": "A Sync simulation gives 000, 100, 110, 111, 011, 001, 101, 011, …: the circuit then circulates 011 → 001 → 101.",
    "animation": table("Trace from 000", ["Q2Q1Q0", "J2K2", "J1K1", "J0K0", "next"],
                       [["000", "10", "01", "01", "100"], ["100", "10", "10", "01", "110"], ["110", "00", "10", "11", "111"]], reveal=1),
}

SOLUTIONS["cse-2015-2-cs-7"] = {
    "approach": "Concept tested: **states versus outputs**. A value that repeats with different successors needs a separate state per position; the counter needs one state per position of the minimal period, then $\\lceil \\log_2 L \\rceil$ flip-flops.",
    "concepts": ["Counter states", "Minimal period", "Flip-flop count"],
    "given": "A synchronous counter (JK flip-flops) with count sequence 0, 0, 1, 1, 2, 2, 3, 3, 0, 0, …",
    "steps": [
        {"title": "Positions, not values", "body": "The first 0 is followed by 0 and the second 0 by 1, so the two 0s must be different states; the same holds for every value. The minimal period is 8."},
        {"title": "Flip-flops", "body": "8 states need $\\lceil \\log_2 8 \\rceil = 3$ flip-flops."},
        {"title": "A realisation", "body": "A mod-8 binary counter $Q_2Q_1Q_0$: its top two bits $Q_2Q_1$ read 0, 0, 1, 1, 2, 2, 3, 3, so no output logic is needed."},
    ],
    "answer": {"value": "3", "number": 3, "matchesKey": True},
    "shortcut": "Drop the LSB of a mod-8 count: 0..7 → 0,0,1,1,2,2,3,3. Three flip-flops.",
    "pitfalls": [
        "Counting the 4 distinct values and answering 2.",
        "Answering 8 (one flip-flop per state, one-hot).",
    ],
    "verification": "seqlib.counter_states_needed gives 8 for this sequence, and ff_count(8) = 3.",
}

SOLUTIONS["cse-2016-1-cs-8"] = {
    "approach": "Concept tested: **states versus outputs**. The value 0 appears three times with three different successors (1, 2, 3), so each occurrence is its own state; count the positions of the minimal period.",
    "concepts": ["Counter states", "Minimal period", "Flip-flop count"],
    "given": "A synchronous counter for 0-1-0-2-0-3, repeating, with J-K flip-flops; minimum number of flip-flops.",
    "steps": [
        {"title": "Why values are not enough", "body": "With only the values as states, state 0 would have to go to 1, to 2 and to 3; a next-state function gives one successor per state."},
        {"title": "Count the positions", "body": "The minimal period is 6 (0, 1, 0, 2, 0, 3), so 6 states."},
        {"title": "Flip-flops", "body": "$\\lceil \\log_2 6 \\rceil = 3$. A mod-6 counter plus output logic, e.g. with states 0 … 5: $z_1 = Q_1Q_0 + Q_2Q_0$, $z_0 = \\overline{Q_1}Q_0$."},
    ],
    "answer": {"value": "3", "number": 3, "matchesKey": True},
    "shortcut": "Six positions fit in $2^3 = 8$: 3 flip-flops.",
    "pitfalls": [
        "Answering 2 (four distinct values 0–3).",
        "Answering 4 (an off-by-one printed in some notes; 6 ≤ 8 needs only 3 bits).",
    ],
    "verification": "seqlib.counter_states_needed([0, 1, 0, 2, 0, 3]) = 6 and ff_count(6) = 3; the output functions were minimised with states 6 and 7 as don't-cares.",
}

SOLUTIONS["cse-2017-2-cs-42"] = {
    "approach": "Concept tested: **T flip-flop design of a saturating counter**. $T = Q \\oplus Q^+$: write the change of each bit in each row, then read $T_1$ and $T_0$ as functions of $Q_1Q_0$.",
    "concepts": ["Saturating counter", "T flip-flop", "Excitation"],
    "given": "Next-state table: 00 → 01, 01 → 10, 10 → 11, 11 → 11; T flip-flops.",
    "steps": [
        {"title": "T columns", "body": "00 → 01: $T_1T_0 = 01$. 01 → 10: 11. 10 → 11: 01. 11 → 11: 00.", "scene": {"reveal": 4}},
        {"title": "Read T1", "body": "1 only in row 01: $T_1 = \\overline{Q_1}Q_0$."},
        {"title": "Read T0", "body": "1 in every row except 11: $T_0 = \\overline{Q_1Q_0} = \\overline{Q_1} + \\overline{Q_0}$."},
    ],
    "answer": {"value": "(B) $T_1 = \\bar{Q}_1Q_0$, $T_0 = \\bar{Q}_1 + \\bar{Q}_0$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$T_1 = Q_1Q_0$ is 1 in state 11, which would leave the saturating state (11 → 01); also $T_0 = \\bar Q_1 \\bar Q_0$ is 0 in 01."),
        opt("B", True, "Matches the T column in all four rows."),
        opt("C", False, "$T_1 = Q_1 + Q_0$ is 1 in states 10 and 11, so 10 → 01 and 11 → 01."),
        opt("D", False, "$T_0 = Q_1 + Q_0$ is 0 in state 00 (00 would stay) and 1 in state 11 (11 → 10)."),
    ],
    "shortcut": "The saturating row 11 → 11 needs $T_1 = T_0 = 0$ in state 11: option A gives $T_1 = 1$, C gives $T_1 = 1$, D gives $T_0 = 1$. Only B survives.",
    "pitfalls": [
        "Using the next-state bits as T inputs (that is the D design: $D_1 = Q_1 + Q_0$, $D_0 = Q_1 + \\overline{Q_0}$).",
        "Forgetting that saturating means a self-loop: no bit may change in 11.",
    ],
    "verification": "Each option was simulated as a pair of T flip-flops over all four states; only B reproduces the table.",
    "animation": table("T = Q ⊕ Q⁺", ["Q1Q0", "Q1⁺Q0⁺", "T1", "T0"],
                       [["00", "01", 0, 1], ["01", "10", 1, 1], ["10", "11", 0, 1], ["11", "11", 0, 0]], reveal=1),
}

SOLUTIONS["cse-2021-1-cs-28"] = {
    "approach": "Concept tested: **tracing a synchronous T counter**. Each T input says which bit flips; compute all three from the present state, then flip them together.",
    "concepts": ["T flip-flop", "Synchronous counter", "State trace"],
    "given": "T flip-flops $P$, $Q$, $R$ on one clock with $T_P = R$, $T_Q = \\overline{P}$, $T_R = \\overline{Q}$; initial $PQR = 000$.",
    "steps": [
        {"title": "Clock 1 (from 000)", "body": "$T_P = 0$, $T_Q = 1$, $T_R = 1$: Q and R flip: **011**.", "scene": {"reveal": 2}},
        {"title": "Clock 2 (from 011)", "body": "$T_P = 1$, $T_Q = 1$, $T_R = 0$: P and Q flip: **101**.", "scene": {"reveal": 3}},
        {"title": "Clock 3 (from 101)", "body": "$T_P = 1$, $T_Q = 0$, $T_R = 1$: P and R flip: **000**.", "scene": {"reveal": 4}},
    ],
    "answer": {"value": "(A) 011, 101, 000", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Trace: 000 → 011 → 101 → 000 (a mod-3 counter)."),
        opt("B", False, "From 000 both $T_Q = \\overline{P} = 1$ and $T_R = \\overline{Q} = 1$, so two bits flip: the first state is 011, not 001."),
        opt("C", False, "011 and 101 are right, but from 101 the inputs are $T_P = 1$, $T_Q = 0$, $T_R = 1$, giving 000, not 111."),
        opt("D", False, "Starts with 001, which ignores $T_Q = 1$ in state 000."),
    ],
    "shortcut": "From 000 two T inputs are 1, so the first state has two 1s: only A and C start with 011; in 101, $T_Q = \\overline{P} = 0$, so Q stays 0 and the third state cannot be 111.",
    "pitfalls": [
        "Treating the T inputs as the next values (D-style).",
        "Guessing the third state from a pattern instead of computing it.",
    ],
    "verification": "The full table is 000 → 011 → 101 → 000, 001 → 110, 010 → 000, 100 → 101, 110 → 110, 111 → 011: besides the main cycle, 110 is a self-loop, so the counter is not self-starting (001 and 110 never reach the cycle).",
    "animation": table("Trace from 000", ["PQR", "T_P T_Q T_R", "next"],
                       [["000", "0 1 1", "011"], ["011", "1 1 0", "101"], ["101", "1 0 1", "000"]], reveal=1),
}

SOLUTIONS["cse-2026-1-cs-27"] = {
    "approach": "Concept tested: **D flip-flop design of a counter with an input**. With D flip-flops $D_i = Q_i^+$; list the rows $(P, Q_1, Q_0)$ where each next bit is 1 and minimise on a 3-variable map. A single carefully chosen row is enough to eliminate wrong options.",
    "concepts": ["Saturating up/down counter", "D flip-flop", "K-map"],
    "given": "A 2-bit saturating counter: up when $P = 0$ (00→01→10→11→11), down when $P = 1$ (11→10→01→00→00); D flip-flops; the 8-row next-state table.",
    "steps": [
        {"title": "Minterms of D1", "body": "$Q_1^+ = 1$ in rows 001, 010, 011 (P = 0) and 111 (P = 1)."},
        {"title": "Minimise D1", "body": "Pairs 010/011 ($\\overline{P}Q_1$), 001/011 ($\\overline{P}Q_0$), 011/111 ($Q_1Q_0$): $D_1 = \\overline{P}Q_1 + \\overline{P}Q_0 + Q_1Q_0$."},
        {"title": "Minterms and cover of D0", "body": "$Q_0^+ = 1$ in rows 000, 010, 011 and 110. Pairs 000/010 ($\\overline{P}\\,\\overline{Q_0}$), 010/011 ($\\overline{P}Q_1$), 010/110 ($Q_1\\overline{Q_0}$): $D_0 = \\overline{P}\\,\\overline{Q_0} + \\overline{P}Q_1 + Q_1\\overline{Q_0}$."},
        {"title": "Match", "body": "Both equations are option B term for term."},
    ],
    "answer": {"value": "(B) $D_1 = \\bar{P}Q_1 + \\bar{P}Q_0 + Q_1Q_0$, $D_0 = \\bar{P}\\,\\overline{Q_0} + \\bar{P}Q_1 + Q_1\\overline{Q_0}$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Row P = 0, 00 must give 01, but A gives $D_1 = 0$, $D_0 = 0$ (00); it also fails rows 010, 101, 110, 111."),
        opt("B", True, "Equals the table on all 8 rows; both equations are the minimal SOPs."),
        opt("C", False, "Row P = 0, 00: $D_1 = \\bar P \\bar Q_1 = 1$ and $D_0 = 0$, giving 10 instead of 01; it also fails rows 001 and 010."),
        opt("D", False, "Row P = 0, 00 gives 00 instead of 01; it also fails 010, 100 and 101."),
    ],
    "shortcut": "Test the row P = 0, $Q_1Q_0 = 00$ (next 01): A → 00, B → 01, C → 10, D → 00. One row, one survivor.",
    "pitfalls": [
        "Writing T-style change columns for D flip-flops.",
        "Swapping the roles of P = 0 (up) and P = 1 (down).",
    ],
    "verification": "Each option was simulated as two D flip-flops with input P over all 8 rows; only B matches every row, and minlib's minimal SOPs of the two D columns are exactly B's terms.",
    "animation": table("Next-state table (P Q1 Q0 → Q1⁺Q0⁺)", ["P Q1 Q0", "Q1⁺Q0⁺", "option B"],
                       [["0 0 0", "01", "01"], ["0 0 1", "10", "10"], ["0 1 0", "11", "11"], ["0 1 1", "11", "11"],
                        ["1 0 0", "00", "00"], ["1 0 1", "00", "00"], ["1 1 0", "01", "01"], ["1 1 1", "10", "10"]], reveal=1),
}
