"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 6, Lesson 3 (analysing synchronous
sequential circuits): cse-1991-a-3-ii, cse-1993-ii-c-19, cse-1994-b-34, cse-1996-b-72, cse-1996-b-73,
cse-2005-cs-64, it-2005-cs-43, it-2006-cs-37, cse-2011-cs-50, cse-2011-cs-51, cse-2015-1-cs-37,
cse-2017-1-cs-33, cse-2023-cs-33. Every key is re-derived by seqlib.Sync simulation in
l6_03_analysis.py; _sol_ch6.py merges this module and writes src/gate/solutions."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _sol_ch1_fp import opt  # noqa: E402

SOLUTIONS = {}


def table(title, cols, rows, labels=None, reveal=None):
    f = {"kind": "table", "title": title, "cols": cols, "rows": rows, "mono": True}
    if labels:
        f["rowLabels"] = labels
    if reveal is not None:
        f["reveal"] = reveal
    return f


SOLUTIONS["cse-1991-a-3-ii"] = {
    "approach": "Concept tested: **the synchronous design discipline**. With one clock and a period longer than the slowest path, every flip-flop samples settled values, so hazards and races inside the logic are over before any edge looks. Judge each option against that one fact.",
    "concepts": ["Synchronous circuits", "Asynchronous circuits", "Hazards", "Clock period"],
    "given": "An MSQ: which is an advantage of synchronous sequential circuits over asynchronous ones: faster operation, ease of avoiding problems due to hazards, lower hardware requirement, better noise immunity, none of these.",
    "steps": [
        {"title": "What the clock buys", "body": "If $T \\ge t_{cq} + t_{logic,max} + t_{su}$, every flip-flop input has settled before its setup window opens. A glitch (hazard) or a race between two state bits happens between edges, while no flip-flop is sampling, so it cannot be stored. That is option B."},
        {"title": "Speed", "body": "The clock period must cover the **worst-case** path in every cycle, while an asynchronous circuit reacts as soon as its gates switch. Synchronous design is not faster: A is wrong."},
        {"title": "Hardware", "body": "Every state bit needs a clocked flip-flop and the clock must be distributed to all of them. Synchronous circuits are not smaller: C is wrong."},
        {"title": "Noise", "body": "Noise immunity (option D) means voltage noise margins, a property of the logic family. The timing style only filters **timing** glitches that are over before the setup window. Noise on the clock line is worse in a synchronous circuit, because a spike there creates a false edge in every flip-flop at once. So D is not the advantage; B is, and since B holds, E is wrong."},
    ],
    "answer": {"value": "(B) ease of avoiding problems due to hazards", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "The clock waits for the slowest path every cycle; asynchronous circuits are, if anything, faster."),
        opt("B", True, "Glitches and races settle between edges, when no flip-flop samples, so they cause no errors."),
        opt("C", False, "Flip-flops and the clock network cost hardware; asynchronous designs are usually smaller."),
        opt("D", False, "Noise immunity means voltage noise margins, set by the logic family; the clock filters only timing glitches that end before the setup window, and a spike on the clock line is worse in a synchronous circuit (a false edge in every flip-flop at once)."),
        opt("E", False, "B is a genuine advantage."),
    ],
    "shortcut": "Synchronous design trades speed and hardware for correctness: the only advantage on the list is the hazard/race immunity.",
    "pitfalls": [
        "Picking 'faster': the period is set by the worst-case path.",
        "Picking 'lower hardware': flip-flops plus clock distribution are extra hardware.",
    ],
    "verification": "Edge sampling with a 20 ns clock and 3 ns setup: an input that glitches at 6 and 9 ns and settles at 12 ns is sampled cleanly; only a change inside the setup window (18 ns) is flagged.",
}

SOLUTIONS["cse-1993-ii-c-19"] = {
    "approach": "Concept tested: **the analysis procedure**. Turn the NAND network into input equations (a NAND of NANDs is an AND–OR), use $Q^+ = D$ for both flip-flops, and evaluate every state for both values of $P$.",
    "concepts": ["State table", "D flip-flop", "NAND-NAND logic", "Analysis procedure"],
    "given": "Two D flip-flops with state bits $A$, $B$ and a control input $P$. From the figure, $D_A = \\overline{\\overline{B\\overline{A}}\\cdot\\overline{\\overline{A}\\,\\overline{P}}}$ and $D_B = \\overline{\\overline{P\\overline{B}}\\cdot\\overline{\\overline{P}A}}$.",
    "steps": [
        {"title": "Input equations", "body": "By De Morgan a two-level NAND–NAND network is AND–OR: $D_A = \\overline{A}B + \\overline{A}\\,\\overline{P}$ and $D_B = P\\overline{B} + \\overline{P}A$."},
        {"title": "State equations", "body": "D flip-flops load their inputs: $A^+ = \\overline{A}(B + \\overline{P})$, $B^+ = P\\overline{B} + \\overline{P}A$.", "scene": {"reveal": 1}},
        {"title": "Rows with A = 0", "body": "$AB = 00$: $P = 0$ → 10, $P = 1$ → 01. $AB = 01$: $P = 0$ → 10, $P = 1$ → 10.", "scene": {"reveal": 2}},
        {"title": "Rows with A = 1", "body": "$A^+ = 0$ always. $AB = 10$: $B^+ = \\overline{P} + P = 1$, so 01 for both $P$. $AB = 11$: $P = 0$ → 01, $P = 1$ → 00.", "scene": {"reveal": 4}},
    ],
    "answer": {"value": "AB, P → A⁺B⁺: 00,0→10; 00,1→01; 01,0→10; 01,1→10; 10,0→01; 10,1→01; 11,0→01; 11,1→00 (D_A = A'B + A'P', D_B = PB' + P'A)", "matchesKey": True},
    "shortcut": "Read $A^+ = \\overline{A}(B + \\overline{P})$ first: every state with $A = 1$ goes to $A^+ = 0$, which fills half the table at once.",
    "pitfalls": [
        "Converting NAND–NAND to OR–AND instead of AND–OR.",
        "Mixing up which inverter output ($\\overline{A}$ or $A$) feeds which first-level gate.",
    ],
    "verification": "Simulating the two flip-flops for all 4 states and both values of P reproduces the eight rows; the NAND-of-NANDs and the AND–OR forms agree on all 8 input rows.",
    "animation": table("Next state A⁺B⁺", ["P = 0", "P = 1"], [["10", "01"], ["10", "10"], ["01", "01"], ["01", "00"]], ["AB = 00", "AB = 01", "AB = 10", "AB = 11"], reveal=0),
}

SOLUTIONS["cse-1994-b-34"] = {
    "approach": "Concept tested: **tracing a mixed JK/D/T circuit**. Write each flip-flop's own state equation, then clock all three together, always computing from the old state.",
    "concepts": ["JK flip-flop", "D flip-flop", "T flip-flop", "Clock-by-clock trace"],
    "given": "JK flip-flop $Q_2$ with $J = \\overline{Q_0}$, $K = 1$; D flip-flop $Q_1$ with $D = Q_2$; T flip-flop $Q_0$ with $T = Q_1$; common clock; $Q_2Q_1Q_0 = 000$ initially; four clock pulses.",
    "steps": [
        {"title": "State equations", "body": "JK with $K = 1$: $Q_2^+ = J\\overline{Q_2} = \\overline{Q_0}\\,\\overline{Q_2}$. D: $Q_1^+ = Q_2$. T: $Q_0^+ = Q_1 \\oplus Q_0$."},
        {"title": "Pulses 1 and 2", "body": "000 → ($1$, $0$, $0$) **100** → ($0$, $1$, $0$) **010**.", "scene": {"reveal": 2}},
        {"title": "Pulse 3", "body": "From 010: $Q_2^+ = 1 \\cdot 1 = 1$, $Q_1^+ = 0$, $Q_0^+ = 1 \\oplus 0 = 1$: **101**.", "scene": {"reveal": 3}},
        {"title": "Pulse 4", "body": "From 101: $Q_2^+ = 0 \\cdot 0 = 0$, $Q_1^+ = 1$, $Q_0^+ = 0 \\oplus 1 = 1$: **011**.", "scene": {"reveal": 4}},
    ],
    "answer": {"value": "$Q_2Q_1Q_0 = 011$ after four pulses", "matchesKey": True},
    "shortcut": "With $K = 1$ the JK can only reset or toggle, so $Q_2^+ = \\overline{Q_0}\\,\\overline{Q_2}$; build the 8-row table once and follow it four times.",
    "pitfalls": [
        "Treating the T flip-flop as a D ($Q_0^+ = Q_1$), which gives 010 after four pulses.",
        "Letting the D or T flip-flop see the JK's new output at the same edge.",
    ],
    "verification": "Simulation gives 000 → 100 → 010 → 101 → 011 → 000: a 5-state cycle, with 011 after the fourth pulse.",
    "animation": table("Q2Q1Q0 pulse by pulse", ["J K", "D", "T", "Q2Q1Q0"], [["–", "–", "–", "000"], ["1 1", "0", "0", "100"], ["1 1", "1", "0", "010"], ["1 1", "0", "1", "101"], ["0 1", "1", "0", "011"]],
                       ["start", "pulse 1", "pulse 2", "pulse 3", "pulse 4"], reveal=0),
}

SOLUTIONS["cse-1996-b-72"] = {
    "approach": "Concept tested: **state table to state diagram**. Three D flip-flops form a shift register with XOR feedback; compute the next state of all eight states and join the arcs.",
    "concepts": ["State diagram", "D flip-flop", "Shift register", "LFSR"],
    "given": "Three D flip-flops on one clock with $D_2 = Q_1$, $D_3 = Q_2$ and $D_1 = Q_2 \\oplus Q_3$. State $S_k$ means $Q_1Q_2Q_3 = k$ in binary.",
    "steps": [
        {"title": "State equations", "body": "$Q_1^+ = Q_2 \\oplus Q_3$, $Q_2^+ = Q_1$, $Q_3^+ = Q_2$."},
        {"title": "First four states", "body": "$S_0$ (000) → 000 = $S_0$; $S_1$ (001) → 100 = $S_4$; $S_2$ (010) → 101 = $S_5$; $S_3$ (011) → 001 = $S_1$.", "scene": {"reveal": 4}},
        {"title": "Last four states", "body": "$S_4$ (100) → 010 = $S_2$; $S_5$ (101) → 110 = $S_6$; $S_6$ (110) → 111 = $S_7$; $S_7$ (111) → 011 = $S_3$.", "scene": {"reveal": 8}},
        {"title": "Join the arcs", "body": "$S_0$ is a self-loop. From $S_1$: $S_1 \\to S_4 \\to S_2 \\to S_5 \\to S_6 \\to S_7 \\to S_3 \\to S_1$, one cycle through all seven non-zero states."},
    ],
    "answer": {"value": "S0 → S0 (self-loop); S1 → S4 → S2 → S5 → S6 → S7 → S3 → S1 (one 7-state cycle)", "matchesKey": True},
    "shortcut": "A shift register with XOR feedback keeps 000 at 000 (XOR of zeros is 0); for a maximal-length tap choice all other states form one cycle of $2^n - 1$.",
    "pitfalls": [
        "Numbering the states with $Q_3$ as the most significant bit; the question fixes $Q_1Q_2Q_3$.",
        "Shifting in the wrong direction ($Q_2^+ = Q_3$ instead of $Q_1$).",
    ],
    "verification": "Simulating every state gives the map 0→0, 1→4, 2→5, 3→1, 4→2, 5→6, 6→7, 7→3, i.e. the self-loop and the 7-cycle.",
    "animation": table("Next state of each Sk", ["Q1Q2Q3", "next"], [["000", "S0"], ["001", "S4"], ["010", "S5"], ["011", "S1"], ["100", "S2"], ["101", "S6"], ["110", "S7"], ["111", "S3"]],
                       ["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7"], reveal=0),
}

SOLUTIONS["cse-1996-b-73"] = {
    "approach": "Concept tested: **reachability**. For an autonomous circuit the reachable set from a start is its trace until the first repeated state; everything else is unreachable.",
    "concepts": ["Reachability", "Cycle theorem", "State diagram"],
    "given": "The circuit of Q72 ($Q_1^+ = Q_2 \\oplus Q_3$, $Q_2^+ = Q_1$, $Q_3^+ = Q_2$), started in $S_4$ (100).",
    "steps": [
        {"title": "Trace from S4", "body": "$S_4 \\to S_2 \\to S_5 \\to S_6 \\to S_7 \\to S_3 \\to S_1 \\to S_4$: the trace repeats after seven clocks."},
        {"title": "Nothing new can appear", "body": "The next state depends only on the present state, so after the first repeat the circuit goes round the same cycle for ever (the cycle theorem)."},
        {"title": "Compare with all eight states", "body": "Reached: $S_1 \\dots S_7$. Missing: $S_0$, whose only arc is its own self-loop, so no other state leads into it."},
    ],
    "answer": {"value": "{S0}", "matchesKey": True},
    "shortcut": "With the diagram of Q72 in hand: $S_4$ lies on the 7-state cycle, so the only state off it, $S_0$, is unreachable.",
    "pitfalls": [
        "Answering 'none', thinking a 3-bit circuit must visit all 8 states.",
        "Listing states unreachable from 000 instead of from the given start $S_4$.",
    ],
    "verification": "A search of the simulated state graph from 100 reaches exactly {1, 2, 3, 4, 5, 6, 7}.",
}

SOLUTIONS["cse-2005-cs-64"] = {
    "approach": "Concept tested: **next-state equations of D flip-flops**. Read $D_0 = \\overline{Q_0}$ and $D_1 = Q_0 \\oplus \\overline{Q_1}$ from the figure, tabulate the four states and follow the table from 00, writing states as $Q_0Q_1$.",
    "concepts": ["D flip-flop", "State table", "State sequence"],
    "given": "Two positive-edge D flip-flops; $D_0 = \\overline{Q_0}$, $D_1 = Q_0 \\oplus \\overline{Q_1}$; state written $Q_0Q_1$; initial state 00.",
    "steps": [
        {"title": "State equations", "body": "$Q_0^+ = \\overline{Q_0}$ and $Q_1^+ = Q_0 \\oplus \\overline{Q_1}$."},
        {"title": "Tabulate", "body": "00 → (1, $0 \\oplus 1$) = 11; 11 → (0, $1 \\oplus 0$) = 01; 01 → (1, $0 \\oplus 0$) = 10; 10 → (0, $1 \\oplus 1$) = 00.", "scene": {"reveal": 4}},
        {"title": "Follow from 00", "body": "00 → 11 → 01 → 10 → 00: option D."},
    ],
    "answer": {"value": "(D) 00 → 11 → 01 → 10 (→ 00)", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "01 goes to 10, not back to 00."),
        opt("B", False, "11 goes to 01, not to 00."),
        opt("C", False, "00 goes to 11 ($Q_0$ toggles and $Q_1^+ = 0 \\oplus 1 = 1$), not to 10."),
        opt("D", True, "Matches the table from 00."),
    ],
    "shortcut": "$Q_0$ toggles every clock, so the first bit must alternate 0, 1, 0, 1: only C and D qualify, and $Q_1^+ = 1$ from 00 picks D.",
    "pitfalls": [
        "Writing states as $Q_1Q_0$ by habit; the question uses $Q_0Q_1$.",
        "Using $Q_1$ instead of $\\overline{Q_1}$ at the XOR.",
    ],
    "verification": "Simulation from 00 gives 00, 11, 01, 10, 00.",
    "animation": table("Q0Q1 clock by clock", ["Q0Q1"], [["00"], ["11"], ["01"], ["10"], ["00"]], ["start", "clock 1", "clock 2", "clock 3", "clock 4"], reveal=0),
}

SOLUTIONS["it-2005-cs-43"] = {
    "approach": "Concept tested: **when to read a state-only output**. During cycle 3 the state has been through the edges that end cycles 1 and 2, so z depends only on the first two input rows. Express z in those inputs and test each option.",
    "concepts": ["Output timing", "D flip-flop", "Clock-by-clock trace"],
    "given": "$D_1 = A \\oplus B$, $D_2 = \\overline{Q_1}\\,C$, $z = Q_1Q_2$; each option gives $(A, B, C)$ for cycles 1, 2, 3. Which always gives $z = 1$ 'at the end of the third cycle'?",
    "steps": [
        {"title": "State after two edges", "body": "Edge 1 samples row 1: $Q_1 = A_1 \\oplus B_1$. Edge 2 samples row 2: $Q_1 = A_2 \\oplus B_2$ and $Q_2 = \\overline{Q_1}\\,C_2 = \\overline{(A_1 \\oplus B_1)}\\,C_2$. The initial state no longer matters."},
        {"title": "z during cycle 3", "body": "$z = (A_2 \\oplus B_2)\\cdot\\overline{(A_1 \\oplus B_1)}\\cdot C_2$."},
        {"title": "Test the options", "body": "A: $1 \\cdot 1 \\cdot 1 = 1$. B: $A_1 \\oplus B_1 = 1$, so 0. C: $A_1 \\oplus B_1 = 1$, so 0. D: $A_2 \\oplus B_2 = 0$, so 0."},
        {"title": "The other reading", "body": "If a third edge is applied, $Q_1 = A_3 \\oplus B_3 = 0$ for every option (row 3 is 1 1 1), so $z = 0$ for all four and the question has no answer. The consistent reading is z **during** cycle 3, just before the edge that closes it."},
    ],
    "answer": {"value": "(A) 000, 101, 111", "choice": ["A"], "matchesKey": True,
               "keyNote": "Read as z during cycle 3 (after the edges ending cycles 1 and 2). After a third edge every option gives z = 0."},
    "optionAnalysis": [
        opt("A", True, "$A_1 \\oplus B_1 = 0$ makes $Q_2 = C_2 = 1$ and $A_2 \\oplus B_2 = 1$ makes $Q_1 = 1$: z = 1 from every initial state."),
        opt("B", False, "Row 1 has $A \\oplus B = 1$, so $Q_2 = 0$ after edge 2."),
        opt("C", False, "Row 1 has $A \\oplus B = 1$, so $Q_2 = 0$ after edge 2."),
        opt("D", False, "Row 2 has $A \\oplus B = 0$, so $Q_1 = 0$ after edge 2."),
    ],
    "shortcut": "z needs $Q_1 = 1$ and $Q_2 = 1$ together; $Q_2 = 1$ needs $Q_1 = 0$ one clock earlier, so $A \\oplus B$ must be 0 in row 1 and 1 in row 2, with $C = 1$ in row 2.",
    "pitfalls": [
        "Applying a third edge: then every option gives 0.",
        "Letting $D_2$ use the new $Q_1$ of the same edge.",
    ],
    "verification": "Simulating all four initial states for each option: only A gives z = 1 during cycle 3 every time; after a third edge all options give 0.",
}

SOLUTIONS["it-2006-cs-37"] = {
    "approach": "Concept tested: **from a state diagram to a next-state equation**. In each state write $S^+$ as a function of the inputs from its arcs, then combine with $S$ as the selector (Shannon expansion).",
    "concepts": ["State diagram", "Next-state equation", "Shannon expansion"],
    "given": "Two states. $S = 1$: self-loop on $x = 1$, arc to 0 on $x = 0$. $S = 0$: self-loop on $y = 1$, arc to 1 on $y = 0$.",
    "steps": [
        {"title": "State 1", "body": "The next state is 1 exactly when $x = 1$: $S^+ = x$."},
        {"title": "State 0", "body": "The next state is 1 exactly when $y = 0$: $S^+ = \\overline{y}$."},
        {"title": "Combine", "body": "$S^+ = \\overline{S}\\,\\overline{y} + S\\,x$, i.e. $S'y' + Sx$: option A."},
    ],
    "answer": {"value": "(A) $S^+ = S'y' + Sx$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Agrees with every arc of the diagram."),
        opt("B", False, "In state 1 with $x = 1$, $y = 1$ it gives 0, but the self-loop keeps 1."),
        opt("C", False, "Ignores the state: in state 0 with $x = y = 0$ it gives 0, but the arc on $y = 0$ goes to 1."),
        opt("D", False, "Swaps every arc: it leaves state 1 when $x = 1$ and leaves state 0 when $y = 1$."),
    ],
    "shortcut": "Check one arc per state: $S = 1, x = 1$ must give 1 and $S = 0, y = 0$ must give 1. Only A passes both.",
    "pitfalls": [
        "Mixing which input matters in which state.",
        "Reading the self-loop labels as the conditions for leaving.",
    ],
    "verification": "Testing all 8 combinations of $S$, $x$, $y$: only option A matches the diagram everywhere.",
}

SOLUTIONS["cse-2011-cs-50"] = {
    "approach": "Concept tested: **input equations of D flip-flops**. Read $D_P$, $D_Q$, $D_R$ from the gates; with D flip-flops they are the next state. Substitute the present values (all old values).",
    "concepts": ["D flip-flop", "Next-state equation", "Counter analysis"],
    "given": "$D_P = R$, $D_Q = \\overline{P + R}$ (NOR), $D_R = Q\\,\\overline{R}$ (AND with $\\overline{R}$). Before the edge $PQR = 010$.",
    "steps": [
        {"title": "State equations", "body": "$P^+ = R$, $Q^+ = \\overline{P}\\,\\overline{R}$, $R^+ = Q\\overline{R}$."},
        {"title": "Substitute 010", "body": "$P^+ = 0$; $Q^+ = 1 \\cdot 1 = 1$; $R^+ = 1 \\cdot 1 = 1$. So $PQR = 011$."},
        {"title": "Whole table (for Q51)", "body": "000 → 010, 001 → 100, 010 → 011, 011 → 100, 100 → 000, 101 → 100, 110 → 001, 111 → 100."},
    ],
    "answer": {"value": "(D) 011", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Would need $Q^+ = 0$, but $P = R = 0$ makes the NOR 1."),
        opt("B", False, "Computing $Q^+$ with the new $R = 1$ gives 0: the same-edge mistake."),
        opt("C", False, "No change: forgets that $D_R = Q\\overline{R} = 1$."),
        opt("D", True, "Every flip-flop loads its input computed from 010."),
    ],
    "shortcut": "Only $R$ can change from 010: $D_P = R = 0$ and $D_Q = 1$ keep P and Q, while $D_R = Q\\overline{R} = 1$.",
    "pitfalls": ["Using a newly computed bit to compute another bit of the same edge."],
    "verification": "Simulating the three flip-flops from 010 gives 011.",
}

SOLUTIONS["cse-2011-cs-51"] = {
    "approach": "Concept tested: **reachability and the cycle theorem**. From the power-on state 000, follow the next-state table until a state repeats; the distinct states seen are all the counter will ever produce.",
    "concepts": ["Reachability", "Cycle theorem", "Counter analysis"],
    "given": "The circuit of Q50 ($P^+ = R$, $Q^+ = \\overline{P}\\,\\overline{R}$, $R^+ = Q\\overline{R}$), reset to 000 at power on.",
    "steps": [
        {"title": "Trace from 000", "body": "000 → 010 → 011 → 100 → 000."},
        {"title": "The trace has repeated", "body": "The next state depends only on the present one, so the circuit cycles through these four states for ever."},
        {"title": "The other states", "body": "001, 101, 111 go to 100 and 110 goes to 001: they lead into the cycle but are never produced from 000."},
    ],
    "answer": {"value": "(B) 4", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Stops the trace one step early and misses 100."),
        opt("B", True, "000, 010, 011, 100."),
        opt("C", False, "Counts a state that only leads into the cycle."),
        opt("D", False, "Counts states never produced from 000."),
    ],
    "shortcut": "With the full table from Q50, the answer is four lookups.",
    "pitfalls": ["Counting every state whose arc touches the cycle instead of the states actually visited from 000."],
    "verification": "The simulated trace from 000 has tail 0 and cycle length 4.",
}

SOLUTIONS["cse-2015-1-cs-37"] = {
    "approach": "Concept tested: **two flip-flops on one edge, with a JK used as a T**. $J = K = Q_D$ makes the JK a T stage with $T = Q_D$; trace the pair from (1, 0), always from the old values.",
    "concepts": ["JK flip-flop", "D flip-flop", "Same-edge sampling", "State sequence"],
    "given": "D flip-flop output $Q_D$ drives $J$ and $K$; the JK output $Q_{JK}$ drives $D$; common clock; initially $Q_D = 1$, $Q_{JK} = 0$; non-zero propagation delays.",
    "steps": [
        {"title": "State equations", "body": "$Q_D^+ = Q_{JK}$ and $Q_{JK}^+ = Q_D \\oplus Q_{JK}$."},
        {"title": "Trace", "body": "(1, 0) → (0, 1) → (1, 1) → (1, 0): period 3.", "scene": {"reveal": 3}},
        {"title": "Read the JK output", "body": "$Q_{JK}$ = 0, 1, 1, 0, 1, 1, 0, …: option A."},
    ],
    "answer": {"value": "(A) 0110110…", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The pair cycles through (1, 0), (0, 1), (1, 1)."),
        opt("B", False, "Only one 1 in every three bits; in fact the JK stays at 1 for two edges, because in (0, 1) it sees J = K = 0 and holds before (1, 1) toggles it back."),
        opt("C", False, "Period 4 is impossible: the trace repeats after 3 states."),
        opt("D", False, "Period 4 again; the state (0, 0) that a period-4 pattern would need is a self-loop never entered."),
    ],
    "shortcut": "The JK toggles whenever the D flip-flop holds 1, and the D flip-flop holds the JK's previous value: write the two bits in a column and the period-3 pattern appears in three lines.",
    "pitfalls": [
        "Letting the JK see the D flip-flop's new output: from (1, 0) it would read J = K = 0 and stay at 0.",
        "Treating the JK as a D with input $Q_D$.",
    ],
    "verification": "Simulation from (1, 0) gives JK outputs 0, 1, 1, 0, 1, 1, 0, 1, 1.",
    "animation": table("(Q_D, Q_JK) edge by edge", ["Q_D", "Q_JK"], [[1, 0], [0, 1], [1, 1], [1, 0]], ["start", "edge 1", "edge 2", "edge 3"], reveal=0),
}

SOLUTIONS["cse-2017-1-cs-33"] = {
    "approach": "Concept tested: **a mixed T/D circuit traced clock by clock**. Substitute each flip-flop into its own equation and trace from 11.",
    "concepts": ["T flip-flop", "D flip-flop", "Clock-by-clock trace"],
    "given": "T flip-flop $Q_1$ with $T = Q_0$; D flip-flop $Q_0$ with $D = Q_1$; common clock; initially $Q_1Q_0 = 11$.",
    "steps": [
        {"title": "State equations", "body": "$Q_1^+ = Q_0 \\oplus Q_1$, $Q_0^+ = Q_1$."},
        {"title": "Trace", "body": "11 → 01 → 10 → 11 → 01: the state after cycles 1, 2, 3, 4.", "scene": {"reveal": 4}},
        {"title": "Answer", "body": "After the 3rd cycle 11, after the 4th 01: option B."},
    ],
    "answer": {"value": "(B) 11 after the 3rd cycle, 01 after the 4th", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "00 never occurs from 11 (it is a self-loop of this circuit)."),
        opt("B", True, "Matches the trace."),
        opt("C", False, "00 never occurs from 11: (0, 0) is a self-loop of this circuit that the trace 11 → 01 → 10 → 11 never enters. (The update-order mistake gives 00, 00, which is not option C either.)"),
        opt("D", False, "01 after the 3rd cycle is the state after the 1st (or 4th) cycle."),
    ],
    "shortcut": "The circuit has period 3 from 11 (11, 01, 10), so cycle 3 is back at 11 and cycle 4 equals cycle 1: 01.",
    "pitfalls": [
        "Treating the T flip-flop as a D: then 11 stays 11 for ever.",
        "Updating $Q_1$ first and feeding its new value to the D flip-flop.",
    ],
    "verification": "Simulation from 11 gives 01, 10, 11, 01.",
    "animation": table("Q1Q0 after each cycle", ["T", "D", "Q1Q0"], [["–", "–", "11"], [1, 1, "01"], [1, 0, "10"], [0, 1, "11"], [1, 1, "01"]],
                       ["start", "cycle 1", "cycle 2", "cycle 3", "cycle 4"], reveal=0),
}

SOLUTIONS["cse-2023-cs-33"] = {
    "approach": "Concept tested: **reachability from a given start**. 'Can never be obtained' means 'not in the reachable set of 011'. Trace from 011 until it repeats and see which option is missing.",
    "concepts": ["Reachability", "T flip-flop", "D flip-flop", "Self-loop"],
    "given": "T flip-flop $Q_1$ with $T = \\overline{Q_3}$; D flip-flop $Q_2$ with $D = Q_1$; T flip-flop $Q_3$ with $T = Q_2$; initially $(Q_1, Q_2, Q_3) = (0, 1, 1)$.",
    "steps": [
        {"title": "State equations", "body": "$Q_1^+ = Q_1 \\oplus \\overline{Q_3}$, $Q_2^+ = Q_1$, $Q_3^+ = Q_3 \\oplus Q_2$."},
        {"title": "Trace from 011", "body": "011 → 000 → 100 → 010 → 101 → 111 → 110 → 011.", "scene": {"reveal": 7}},
        {"title": "Reachable set", "body": "Seven states appear; 001 does not. Its own row is $001 \\to 001$ ($Q_1^+ = 0 \\oplus 0$, $Q_2^+ = 0$, $Q_3^+ = 1 \\oplus 0$): a self-loop that no other state enters."},
    ],
    "answer": {"value": "(A) (0, 0, 1)", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "001 is a self-loop off the 7-state cycle through 011."),
        opt("B", False, "(1, 0, 0) appears at clock 2."),
        opt("C", False, "(1, 0, 1) appears at clock 4."),
        opt("D", False, "(1, 1, 1) appears at clock 5."),
    ],
    "shortcut": "Look for a self-loop first: a state that maps to itself can only be seen if the circuit starts there.",
    "pitfalls": [
        "Starting the trace from 000 instead of the given 011.",
        "Treating the T stages as D stages.",
    ],
    "verification": "A search of the simulated state graph from 011 reaches every state except 001.",
    "animation": table("Trace from 011", ["Q1Q2Q3"], [["011"], ["000"], ["100"], ["010"], ["101"], ["111"], ["110"], ["011"]],
                       ["start", "1", "2", "3", "4", "5", "6", "7"], reveal=0),
}
