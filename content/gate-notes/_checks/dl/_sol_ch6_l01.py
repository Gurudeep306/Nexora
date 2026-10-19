"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 6, Lesson 1 (feedback, latches and
races): cse-1991-b-5-a, cse-1993-ii-a-6-2, cse-1999-a-33, cse-2004-cs-18, it-2007-cs-7, cse-2023-cs-11.
Every key is re-derived from the loop's fixed points or by gate-delay simulation in l6_01_latches.py;
_sol_ch6.py merges this module and writes src/gate/solutions."""
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


SOLUTIONS["cse-1991-b-5-a"] = {
    "approach": "Concept tested: **stable states of a feedback loop**. Cut the feedback wire, write the loop function $Q^+ = f(a, b, Q)$, and for each input pair keep the values of $Q$ that reproduce themselves ($f = Q$).",
    "concepts": ["Feedback loop", "Stable state", "Majority function", "Latch"],
    "given": "Three 2-input AND gates compute $aQ$, $ab$, $bQ$; a 3-input OR combines them; its output $Q$ is fed back into the first and third AND gates.",
    "steps": [
        {"title": "Cut the loop and write the loop function", "body": "With the feedback wire cut, the circuit is an ordinary AND–OR network: $Q^+ = aQ + ab + bQ$. This is the **majority** of $a$, $b$ and $Q$ (1 when at least two of them are 1)."},
        {"title": "Inputs that force a value", "body": "$ab = 00$: every product is 0, so $Q^+ = 0$ whether $Q$ is 0 or 1. Only $Q = 0$ is stable: $Q_n = 0$. $ab = 11$: the term $ab = 1$ forces $Q^+ = 1$: $Q_n = 1$.", "scene": {"reveal": 2}},
        {"title": "Inputs that leave the decision to Q", "body": "$ab = 01$: $Q^+ = bQ = Q$. Both $Q = 0$ and $Q = 1$ reproduce themselves, so the loop **holds** its previous value: $Q_n = Q$. The same for $ab = 10$, where $Q^+ = aQ = Q$.", "scene": {"reveal": 4}},
        {"title": "Name the circuit", "body": "Set by 11, reset by 00, hold on 01 and 10: the circuit is a one-bit memory (a latch) whose hold condition is $a \\ne b$."},
    ],
    "answer": {"value": "ab = 00 → 0; 01 → Q (unchanged); 10 → Q (unchanged); 11 → 1", "matchesKey": True},
    "shortcut": "Majority of $(a, b, Q)$: when $a = b$ they outvote $Q$; when $a \\ne b$, $Q$ casts the deciding vote and so keeps itself.",
    "pitfalls": [
        "Writing $Q_n = 1$ for 01 or 10 because \"one AND gate has a 1\": the AND gates there are $bQ$ or $aQ$, which need $Q = 1$ as well.",
        "Treating the circuit as combinational and leaving the 01 and 10 rows undefined: the feedback makes them memory rows.",
    ],
    "verification": "The fixed points of the netlist for each input row are {0}, {0, 1}, {0, 1}, {1}, and a gate-delay simulation started from either value settles to these.",
    "animation": table("Stable values of Q = aQ + ab + bQ", ["f if Q = 0", "f if Q = 1", "Qₙ"],
                       [[0, 0, "0"], [0, 1, "Q"], [0, 1, "Q"], [1, 1, "1"]], ["ab = 00", "ab = 01", "ab = 10", "ab = 11"], reveal=0),
}

SOLUTIONS["cse-1993-ii-a-6-2"] = {
    "approach": "Concept tested: **a loop with an odd number of inversions has no stable state**. The figure is missing from the paper scan; in the commonly reproduced version the \"state machine\" is a NOR gate with inputs $a$, $b$ and its own output $Q$ fed back. Cut the loop and ask when $Q^+ = \\overline{a + b + Q}$ has a fixed point.",
    "concepts": ["Feedback loop", "Stable state", "NOR gate", "Oscillation"],
    "given": "A NOR gate whose inputs are $a$, $b$ and its own output $Q$ (figure as commonly reproduced; the scan of the 1993 paper shows only the text).",
    "steps": [
        {"title": "Loop function", "body": "Cutting the feedback wire: $Q^+ = \\overline{a + b + Q}$."},
        {"title": "Case a + b = 1", "body": "A 1 is the controlling value of NOR, so $Q^+ = 0$ whatever $Q$ is. $Q = 0$ reproduces itself: a stable state exists."},
        {"title": "Case a + b = 0", "body": "Now $Q^+ = \\overline{Q}$: the gate is an inverter driving itself, an odd ring of length one. $Q = 0$ gives 1 and $Q = 1$ gives 0, so neither is stable and the output flips every gate delay."},
        {"title": "Restriction on the inputs", "body": "A stable state exists exactly when $a + b = 1$ (option B). Options A and C ($ab = 1$; $\\bar a + \\bar b = 0$, which is again $ab = 1$) are sufficient but exclude 01 and 10, which also work; D and E are wrong."},
    ],
    "answer": {"value": "(b) $a + b = 1$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$ab = 1$ does give a stable state, but it is not the restriction: $ab = 01$ and $10$ are stable too."),
        opt("B", True, "Stable exactly when a 1 on $a$ or $b$ masks the feedback, i.e. $a + b = 1$."),
        opt("C", False, "$\\bar a + \\bar b = 0$ means $a = b = 1$, the same as A: too narrow."),
        opt("D", False, "$\\overline{ab} = 1$ includes $a = b = 0$, the oscillating case."),
        opt("E", False, "$\\overline{a + b} = 1$ is exactly the oscillating case $a = b = 0$."),
    ],
    "shortcut": "Ask when the NOR stops being an inverter of its own output: as soon as another input is 1.",
    "pitfalls": [
        "Answering \"a + b = 0\" because a NOR with 0 inputs outputs 1: the third input is the output itself, so the gate inverts its own output.",
        "Choosing $a \\cdot b = 1$: it is sufficient but not necessary.",
    ],
    "verification": "Fixed points of $Q = \\overline{a + b + Q}$: none for $ab = 00$, $\\{0\\}$ for 01, 10 and 11. A delay simulation with $ab = 00$ toggles $Q$ every gate delay.",
    "animation": table("Q⁺ = NOR(a, b, Q)", ["f if Q = 0", "f if Q = 1", "stable?"],
                       [[1, 0, "no"], [0, 0, "Q = 0"], [0, 0, "Q = 0"], [0, 0, "Q = 0"]], ["ab = 00", "ab = 01", "ab = 10", "ab = 11"]),
}

SOLUTIONS["cse-1999-a-33"] = {
    "approach": "Concept tested: **steady states of a feedback loop**. The three AND gates in a chain collapse to one loop function $Y^+ = A\\,B\\,C\\,Y$; a steady state with $Y = 1$ needs $f(A, B, C, 1) = 1$.",
    "concepts": ["Feedback loop", "Stable state", "AND chain"],
    "given": "$g_1 = A\\,Y$, $g_2 = g_1 B$, $Y = g_2 C$, with $Y$ fed back to $g_1$.",
    "steps": [
        {"title": "One loop function", "body": "Cutting at $Y$ and composing the three ANDs: $Y^+ = ((A\\,Y)\\,B)\\,C = A\\,B\\,C\\,Y$."},
        {"title": "Condition for Y = 1 to last", "body": "$Y = 1$ is steady iff $f(A, B, C, 1) = ABC = 1$, i.e. $A = B = C = 1$."},
        {"title": "Check the options", "body": "A (001), B (011), C (101) each contain a 0, which forces every AND below it to 0: $Y^+ = 0$, so $Y = 1$ cannot be a steady state. Only D (111) keeps $Y = 1$."},
    ],
    "answer": {"value": "(D) $A = 1, B = 1, C = 1$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$A = 0$ forces $g_1 = 0$, hence $Y = 0$."),
        opt("B", False, "$A = 0$ forces $g_1 = 0$, hence $Y = 0$."),
        opt("C", False, "$B = 0$ forces $g_2 = 0$, hence $Y = 0$."),
        opt("D", True, "With $A = B = C = 1$ the chain passes $Y$ unchanged, so $Y = 1$ holds itself."),
    ],
    "shortcut": "A chain of ANDs round a loop holds a 1 only if every side input is 1.",
    "pitfalls": [
        "Forgetting that with $A = B = C = 1$ the loop is a memory: $Y = 0$ is also steady, so $A = B = C = 1$ does not force $Y = 1$; it only allows it.",
    ],
    "verification": "Fixed points of the netlist: $Y = 1$ appears only for $ABC = 111$ (where both $Y = 0$ and $Y = 1$ are fixed points).",
}

SOLUTIONS["cse-2004-cs-18"] = {
    "approach": "Concept tested: **the NAND latch's forbidden input**. A NAND latch has active-low inputs; 0 is the controlling value of NAND, so $S = R = 0$ forces **both** outputs to 1.",
    "concepts": ["NAND latch", "Active-low inputs", "Forbidden input"],
    "given": "Two cross-coupled NAND gates; both inputs $S$ and $R$ are 0.",
    "steps": [
        {"title": "Evaluate each gate", "body": "$Q = \\overline{S \\cdot \\overline{Q}} = \\overline{0 \\cdot \\overline{Q}} = 1$ and $\\overline{Q}' = \\overline{R \\cdot Q} = \\overline{0 \\cdot Q} = 1$, whatever the fed-back values are."},
        {"title": "Is it stable?", "body": "Feeding $Q = Q' = 1$ back changes nothing: each gate still has a 0 input. The state is stable while 00 is held, so it is **not** indeterminate; it is forbidden because $Q$ and $Q'$ are no longer complements."},
        {"title": "Where the unpredictability really is", "body": "If both inputs later return to 1 together, each NAND sees 1, 1 and both outputs fall at once, then rise at once: the latch races, and its final state depends on which gate is faster. That is a statement about the **release** 00 → 11, which this question does not ask about."},
    ],
    "answer": {"value": "(C) $Q = 1$, $Q' = 1$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "That is the reset state, reached with $S = 1$, $R = 0$ (active low)."),
        opt("B", False, "That is the set state, reached with $S = 0$, $R = 1$."),
        opt("C", True, "Both NANDs see a 0 and output 1."),
        opt("D", False, "The outputs are fully determined while the inputs are 00; unpredictability arises only when 00 is released to 11."),
    ],
    "pitfalls": [
        "Using the NOR table: for a NOR latch the forbidden input is 11 and gives $Q = Q' = 0$.",
        "Answering \"indeterminate\": that describes the release, not the held input.",
    ],
    "verification": "The only fixed point of the NAND latch netlist for inputs 00 is $Q = Q' = 1$.",
    "animation": table("NAND latch, active-low inputs", ["S", "R", "Q", "Q′"], [[1, 1, "hold", "hold"], [0, 1, 1, 0], [1, 0, 0, 1], [0, 0, 1, 1]],
                       ["hold", "set", "reset", "forbidden"]),
}

SOLUTIONS["it-2007-cs-7"] = {
    "approach": "Concept tested: **the release race of a NAND latch**. Oscillation needs the symmetric forbidden state ($Q = \\overline{Q} = 1$ for inputs 00) followed by **both** inputs releasing together (to 11), so the two gates switch in step.",
    "concepts": ["NAND latch", "Forbidden input", "Race", "Oscillation"],
    "given": "A cross-coupled NAND SR latch receives two input pairs in succession.",
    "steps": [
        {"title": "Only 00 gives a symmetric state", "body": "With 00 both gates see a controlling 0: $Q = \\overline{Q} = 1$. Every other input pair gives complementary outputs or holds them."},
        {"title": "Release 00 → 11", "body": "Now each gate sees 1, 1 and outputs 0: both outputs fall together. One delay later each sees a 0 and outputs 1: both rise together. With equal gate delays the pair alternates 11, 00, 11, … for ever.", "scene": {"reveal": 3}},
        {"title": "The other sequences settle", "body": "11 → 00: hold, then the forbidden state, which is stable while held. 01 → 10 and 10 → 01: a set followed by a reset (or the reverse), each ending in a stable complementary state."},
    ],
    "answer": {"value": "(D) 00, 11", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "11 then 00 goes **into** the forbidden state, which is stable while held ($Q = \\overline{Q} = 1$)."),
        opt("B", False, "Set then reset: each step ends in a stable state."),
        opt("C", False, "Reset then set: each step ends in a stable state."),
        opt("D", True, "Leaving the forbidden 00 with both inputs at once makes both gates switch together and race."),
    ],
    "pitfalls": [
        "Picking 11, 00 because 00 is \"the forbidden input\": the oscillation comes from leaving it, not entering it.",
        "Using the NOR latch's sequence (11 → 00) for a NAND latch.",
    ],
    "verification": "Gate-delay simulation of the NAND latch with equal delays: after 00 → 11 the outputs alternate 00, 11 and never settle; the other three sequences settle within two gate delays.",
    "animation": table("NAND latch after 00 → 11 (equal delays)", ["Q", "Q̄"], [[1, 1], [0, 0], [1, 1], [0, 0]],
                       ["held 00", "+1 delay", "+2 delays", "+3 delays"], reveal=1),
}

SOLUTIONS["cse-2023-cs-11"] = {
    "approach": "Concept tested: **a multiplexer with feedback is a D latch**. Substitute the feedback into the MUX equation and read the behaviour for each select value: transparent while selected, holding otherwise, i.e. level-sensitive.",
    "concepts": ["Multiplexer", "D latch", "Latch vs flip-flop", "Feedback"],
    "given": "A 2-input MUX with output $Q$ wired back to data input 0; data input 1 and select $S$ are external.",
    "steps": [
        {"title": "Loop function", "body": "$Q^+ = \\overline{S}\\cdot Q + S \\cdot I_1$."},
        {"title": "Behaviour for each S", "body": "$S = 1$: $Q^+ = I_1$, the output follows the data input. $S = 0$: $Q^+ = Q$, both values stable, the output holds."},
        {"title": "Latch, not flip-flop", "body": "During the **whole** interval $S = 1$, any change of $I_1$ passes to $Q$: the circuit is level-sensitive (transparent). That is a D latch with $D = I_1$ and enable $S$; a flip-flop would change only at an edge."},
    ],
    "answer": {"value": "(B) D Latch", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "A flip-flop samples only at a clock edge; this circuit is transparent for as long as $S = 1$."),
        opt("B", True, "$Q^+ = S\\,D + \\overline{S}\\,Q$ is the D-latch equation."),
        opt("C", False, "A half adder is combinational (no feedback, two outputs S and C)."),
        opt("D", False, "A demultiplexer routes one input to one of several outputs; it has no memory."),
    ],
    "shortcut": "A circuit with feedback that copies its input while a control is active and holds otherwise is a latch; edge behaviour needs two latches.",
    "pitfalls": [
        "Choosing \"D flip-flop\" because the circuit stores a bit: storing a bit is common to both; the edge is what makes a flip-flop.",
    ],
    "verification": "The netlist's fixed points are $\\{D\\}$ for $S = 1$ and $\\{0, 1\\}$ for $S = 0$; a delay simulation shows $Q$ following every change of $D$ while $S = 1$.",
}
