"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 6, Lesson 2 (flip-flops, edge
triggering and timing): cse-2000-a-2-12, cse-2001-a-33, cse-2005-cs-62, cse-2006-cs-8, it-2008-it-37.
Every key is re-derived by cycle-by-cycle or tick-by-tick simulation in l6_02_flip_flops.py;
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


SOLUTIONS["cse-2000-a-2-12"] = {
    "approach": "Concept tested: **two flip-flops on one clock edge**. Both sample the values from just before the edge: the JK with $J = K = 1$ toggles $P$, and the D flip-flop loads the **old** $P$. Step the pair $(P, Q)$ edge by edge from $(0, 1)$.",
    "concepts": ["JK flip-flop", "D flip-flop", "Master–slave", "Same-edge sampling"],
    "given": "A master–slave JK flip-flop with $J = K = 1$ and output $P$; a master–slave D flip-flop with $D = P$ and output $Q$; a common clock; initial $(P, Q) = (0, 1)$. The paper asks for $(P, Q)$ \"after the clock cycles\".",
    "steps": [
        {"title": "Next-state equations", "body": "JK with $J = K = 1$: $P^+ = \\overline{P}$ (toggle). D: $Q^+ = D = P$, where $P$ is the value **before** the edge (both flip-flops sample at the same instant, and $P$'s new value appears only after it)."},
        {"title": "First clock cycle", "body": "From $(0, 1)$: $P^+ = 1$ and $Q^+ = $ old $P = 0$. After one cycle $(P, Q) = (1, 0)$.", "scene": {"reveal": 1}},
        {"title": "Second clock cycle", "body": "From $(1, 0)$: $P^+ = 0$ and $Q^+ = $ old $P = 1$. After two cycles $(P, Q) = (0, 1)$, the initial state.", "scene": {"reveal": 2}},
        {"title": "Which reading the key uses", "body": "The pair alternates $(0, 1) \\leftrightarrow (1, 0)$ with period 2: $(1, 0)$ after an odd number of cycles, $(0, 1)$ after an even number. The printed wording \"after the clock cycles\" (plural) is read as two cycles, giving $(0, 1)$, option D, the stored key. If the intended wording was \"after the clock cycle\" (one cycle), the answer would be $(1, 0)$, option A; the paper could not be checked."},
    ],
    "answer": {"value": "(D) 0, 1 (after two clock cycles)", "choice": ["D"], "matchesKey": True,
               "keyNote": "Two-cycle reading of \"after the clock cycles\"; after one cycle the state is (1, 0), option A. The 2000 paper was not available to confirm the wording."},
    "optionAnalysis": [
        opt("A", False, "$(1, 0)$ is the state after **one** cycle (or any odd number), not after the two cycles of the stored reading."),
        opt("B", False, "$(1, 1)$ would need the D flip-flop to see the JK's **new** output at the same edge, which it cannot."),
        opt("C", False, "$(0, 0)$ never occurs: $Q$ is always the complement of the current $P$ after the first edge."),
        opt("D", True, "After two cycles the pair is back at $(0, 1)$."),
    ],
    "shortcut": "J = K = 1 makes $P$ a divide-by-two; $Q$ is $P$ delayed by one clock. So $Q = \\overline{P}$ after every edge, and the pair has period 2.",
    "pitfalls": [
        "Letting the D flip-flop take the JK's new value at the same edge, giving $(1, 1)$.",
        "Not stating the number of cycles: the answer alternates between A and D with the parity.",
    ],
    "verification": "A cycle-by-cycle simulation of the two flip-flops gives $(0, 1), (1, 0), (0, 1), (1, 0), \\dots$",
    "animation": table("(P, Q) edge by edge", ["P", "Q"], [[0, 1], [1, 0], [0, 1], [1, 0]],
                       ["start", "after 1 cycle", "after 2 cycles", "after 3 cycles"], reveal=0),
}

SOLUTIONS["cse-2001-a-33"] = {
    "approach": "Concept tested: **what an edge samples**. With hold time 0, an input that changes exactly at an edge is read as its **old** value (it was stable through the setup window before the edge). Read every flip-flop input just before each rising edge and update both flip-flops together.",
    "concepts": ["D flip-flop", "Setup and hold", "Timing diagram", "Edge detector"],
    "given": "Positive-edge D flip-flops, $t_{su} = 20$ ns, $t_h = 0$, $Q_0 = Q_1 = 0$ initially. $D_0 = X$, $D_1 = X\\,\\overline{Q_0}$, $Y = Q_1$. X rises exactly at rising edge 1 and falls just before edge 6; the clock period is at least 40 ns.",
    "steps": [
        {"title": "Edge 1: X changes at the edge", "body": "The setup window is the 20 ns before the edge, during which X was 0; with $t_h = 0$ nothing after the edge counts. Both flip-flops read X = 0: $Q_0 = 0$, $D_1 = 0$, so $Y = 0$."},
        {"title": "Edge 2: Y rises", "body": "Now X = 1 and $\\overline{Q_0} = 1$ (the old $Q_0$), so $D_1 = 1$ and Y becomes 1. At the same edge $Q_0$ becomes 1.", "scene": {"reveal": 2}},
        {"title": "Edge 3 onwards: Y falls and stays low", "body": "$\\overline{Q_0} = 0$ makes $D_1 = 0$: Y falls at edge 3 and stays 0 at edges 4, 5 and 6 (at edge 6 X has dropped, which affects only $Q_0$; $D_1$ is 0 either way).", "scene": {"reveal": 3}},
        {"title": "Match the plots", "body": "Y is high for exactly one clock period, from edge 2 to edge 3: option A. The circuit is a rising-edge detector for X."},
    ],
    "answer": {"value": "(A) Y high from the 2nd to the 3rd marked edge", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Y = 1 only between edges 2 and 3."),
        opt("B", False, "Starting Y at edge 1 reads X as 1 at the edge where it changes; with $t_h = 0$ the old 0 is sampled."),
        opt("C", False, "High from edge 1 to 2: the same mistake at edge 1, and it also drops Y at edge 2 where $D_1 = 1$."),
        opt("D", False, "High from edge 3 to 6 ignores $\\overline{Q_0}$: once $Q_0 = 1$, $D_1 = 0$."),
    ],
    "shortcut": "$D_1 = X\\,\\overline{Q_0}$ with $Q_0$ = X delayed one clock is \"X now and not X a clock ago\": a one-period pulse at the first edge that sees X = 1.",
    "pitfalls": [
        "Treating an input that changes exactly at the edge as already new at that edge.",
        "Letting flip-flop 1 see flip-flop 0's new output at the same edge.",
    ],
    "verification": "A tick-by-tick simulation (10 ns ticks, 40 ns clock, setup 2 ticks, hold 0) gives Y = 1 only between edges 2 and 3 and flags no violation at edges 1 to 5.",
    "animation": table("Sampled just before each rising edge", ["X", "Q̄₀", "D₁", "Y after"], [[0, 1, 0, 0], [1, 1, 1, 1], [1, 0, 0, 0], [1, 0, 0, 0]],
                       ["edge 1", "edge 2", "edge 3", "edge 4"], reveal=0),
}

SOLUTIONS["cse-2005-cs-62"] = {
    "approach": "Concept tested: **a D flip-flop delays its input by one clock**. Write the output of period $i + 1$ as the D input of period $i$: $Y_{i+1} = A_i X_i + \\overline{X_i}\\,\\overline{Y_i}$, then evaluate period by period with the given X.",
    "concepts": ["D flip-flop", "Timing diagram", "Next-state equation"],
    "given": "Positive-edge D flip-flop with $D = A\\,X + \\overline{X}\\,\\overline{Q}$ and $Y = Q$. X is 1 in periods 0, 1, 3, 4 and 0 in periods 2 and 5; $A_i$ is A in period $i$.",
    "steps": [
        {"title": "One period of delay", "body": "The edge that starts period $i + 1$ loads the D input of period $i$: $Y_{i+1} = D_i = A_i X_i + \\overline{X_i}\\,\\overline{Y_i}$."},
        {"title": "Periods where X = 1", "body": "$D = A$: $Y_1 = A_0$, $Y_2 = A_1$, $Y_4 = A_3$, $Y_5 = A_4$.", "scene": {"reveal": 2}},
        {"title": "Period 2, where X = 0", "body": "$D = \\overline{Q}$, the complement of the flip-flop's **own** output in period 2, which is $Y_2 = A_1$. So $Y_3 = \\overline{A_1}$.", "scene": {"reveal": 3}},
        {"title": "Assemble", "body": "$Y_1 \\dots Y_5 = A_0,\\ A_1,\\ \\overline{A_1},\\ A_3,\\ A_4$: option A."},
    ],
    "answer": {"value": "(A) $A_0\\,A_1\\,A_1'\\,A_3\\,A_4$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Matches $Y_{i+1} = D_i$ period by period."),
        opt("B", False, "$A_2'$ complements the input A of period 2; with X = 0 the flip-flop complements its own output $Y_2 = A_1$."),
        opt("C", False, "Shifts everything one period early ($A_1$ in period 1): it ignores the flip-flop's delay."),
        opt("D", False, "No delay and the wrong complements; period 1 must be $A_0$."),
    ],
    "shortcut": "With X = 1 the circuit is a delay line for A; with X = 0 it toggles. So copy $A$ one period late, and in the period after an X = 0 period write the complement of the previous output.",
    "pitfalls": [
        "Reading $\\overline{Q}$ as $\\overline{A}$ in the X = 0 period.",
        "Forgetting the one-period delay of the D flip-flop.",
    ],
    "verification": "Simulating the flip-flop for all 64 values of $A_0 \\dots A_5$ (and either initial Q) reproduces option A every time; each other option fails for some A.",
    "animation": table("Y in period i + 1 = D in period i", ["X", "D", "Y next"],
                       [[1, "A₀", "A₀"], [1, "A₁", "A₁"], [0, "Q̄ = A₁′", "A₁′"], [1, "A₃", "A₃"], [1, "A₄", "A₄"]],
                       ["period 0", "period 1", "period 2", "period 3", "period 4"], reveal=0),
}

SOLUTIONS["cse-2006-cs-8"] = {
    "approach": "Concept tested: **using both clock edges to delay a signal**. f changes only at falling edges, so its fastest form has period $2T$ and a 180° delay is one clock period $T$, with no inversion. Sample f at the rising edge (half a period after it changed), then at the falling edge.",
    "concepts": ["D flip-flop", "Clock edges", "Phase delay", "Setup and hold"],
    "given": "A 50% duty-cycle clock of period $T$; f changes only at the clock's negative edges; positive-edge D flip-flops, some clocked through an inverter (which makes the falling edge active). Option drawings as in the 2006 paper: (A) $\\overline{f}$ → FF on $\\overline{clk}$ → $\\overline{Q}$ → FF on clk; (B) $\\overline{f}$ → FF on clk → Q → FF on $\\overline{clk}$; (C) f → FF on clk → Q → FF on $\\overline{clk}$; (D) f → FF on $\\overline{clk}$ → $\\overline{Q}$ → FF on clk.",
    "steps": [
        {"title": "What 180° means here", "body": "The fastest f is high one clock period and low the next: period $2T$. Half of that is $T$, so the circuit must output f (not $\\overline{f}$) delayed by exactly one clock period."},
        {"title": "Polarity", "body": "B inverts f once: it outputs $\\overline{f}$. D inverts once (the $\\overline{Q}$): $\\overline{f}$. A inverts twice and C not at all: only these keep the polarity."},
        {"title": "Timing of A", "body": "A's first flip-flop is clocked at the falling edge, the very instant f changes: a hold problem. With zero hold it reads the old value and the total delay is $1.5T$ (270°); with any hold time the sample is unreliable. Either way, not 180°."},
        {"title": "Timing of C", "body": "The first flip-flop samples f at the rising edge, half a period after f last changed; the second samples that at the next falling edge, half a period later. Every change of f reappears exactly $T$ later: 180° of the fastest f, with no setup or hold risk."},
    ],
    "answer": {"value": "(C) f → D flip-flop on clk → D flip-flop on inverted clk", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Samples f at the falling edge exactly when f changes (a hold/race problem); with the old value it delays by $1.5T$ = 270°."),
        opt("B", False, "Delays by $T$ but outputs $\\overline{f}$: an inversion, not a 180° delay of f."),
        opt("C", True, "Rising-edge stage then falling-edge stage: delay exactly $T$, half the $2T$ period of the fastest f."),
        opt("D", False, "Samples at the changing edge like A and outputs $\\overline{f}$ through the $\\overline{Q}$."),
    ],
    "shortcut": "Never sample a signal on the edge at which it changes; sample it on the other edge first. Then count half periods: two half periods = one clock = 180° of a signal with period 2T.",
    "pitfalls": [
        "Confusing a 180° phase delay with an inversion: for a square wave they look alike, but option B inverts every f, not only the fastest one.",
        "Picking A because its two inversions cancel, without checking when its first flip-flop samples.",
    ],
    "verification": "Tick-by-tick simulation with a 4-tick clock: C's output equals f shifted by one clock period (plus the clock-to-Q delay); A's equals f shifted by 1.5 periods; B and D give $\\overline{f}$. With a hold time of 1 tick, the first flip-flop of A and of D flags a violation at every change of f; C's flip-flops flag none.",
}

SOLUTIONS["it-2008-it-37"] = {
    "approach": "Concept tested: **realising a state diagram with a JK flip-flop**. Read when the state changes, then use the JK excitation table: a change from 0 needs $J = 1$, a change from 1 needs $K = 1$, staying needs $J = 0$ (from 0) or $K = 0$ (from 1).",
    "concepts": ["JK flip-flop", "Excitation table", "State diagram", "XOR"],
    "given": "States 0 and 1. In each state, inputs $xy$ = 00 or 11 keep the state and 01 or 10 move to the other state. J and K are functions of $x$, $y$ and $Q$.",
    "steps": [
        {"title": "When does the state change?", "body": "Exactly for $xy$ = 01 or 10, i.e. when $x \\oplus y = 1$; it holds when $x \\oplus y = 0$, in both states."},
        {"title": "From state 0", "body": "Change ($0 \\to 1$) needs $(J, K) = (1, x)$; stay ($0 \\to 0$) needs $(0, x)$. So $J = x \\oplus y$ and $K$ is free.", "scene": {"reveal": 2}},
        {"title": "From state 1", "body": "Change ($1 \\to 0$) needs $(x, 1)$; stay ($1 \\to 1$) needs $(x, 0)$. So $K = x \\oplus y$ and $J$ is free.", "scene": {"reveal": 4}},
        {"title": "One choice for both states", "body": "$J = K = x \\oplus y$ satisfies both halves: the JK toggles when $x \\oplus y = 1$ and holds when it is 0 (option D)."},
    ],
    "answer": {"value": "(D) $J = x \\oplus y$, $K = x \\oplus y$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$J = K = \\overline{x \\oplus y}$ toggles on 00 and 11 and holds on 01 and 10: the opposite of the diagram."),
        opt("B", False, "From state 0 with $xy = 00$ it gives $J = 1$: the flip-flop would leave state 0."),
        opt("C", False, "From state 0 with $xy = 01$ it gives $J = 1, K = 0$ (set, correct), but from state 1 with $xy = 01$ it gives $K = 0$: it stays in 1 instead of moving to 0."),
        opt("D", True, "Toggle exactly when $x \\oplus y = 1$."),
    ],
    "shortcut": "A diagram that says \"change\" or \"stay\" independently of the state is a T flip-flop with T = the change condition; a JK does it with $J = K = T$.",
    "pitfalls": [
        "Mixing up which input matters in which state: from 0 only J matters, from 1 only K.",
    ],
    "verification": "Checking all 8 combinations of $Q$, $x$, $y$: only option D gives the next state of the diagram every time.",
    "animation": table("JK excitation for each arc", ["xy", "Q → Q⁺", "J", "K"],
                       [["00/11", "0 → 0", 0, "x"], ["01/10", "0 → 1", 1, "x"], ["00/11", "1 → 1", "x", 0], ["01/10", "1 → 0", "x", 1]],
                       reveal=0),
}
