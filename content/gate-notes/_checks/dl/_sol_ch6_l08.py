"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 6, Lesson 8 (state minimisation):
cse-1996-a-48, cse-2003-cs-44, cse-2025-1-cs-49. Every key is re-derived in l6_08_minimisation.py
(seqlib FSM.partitions, cross-checked with the implication table and a product-machine equivalence
test); _sol_ch6.py merges this module and writes src/gate/solutions."""
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


SOLUTIONS["cse-1996-a-48"] = {
    "approach": "Concept tested: **state minimisation by partition refinement**. Group the states by their whole output row ($P_0$), then split each group by the groups their next states fall in, and repeat until nothing splits; the number of groups is the number of states of the minimal machine.",
    "concepts": ["Equivalent states", "Partition refinement", "Implication table", "Mealy machine"],
    "given": "A Mealy machine (next state, output): $A$: $D$/0, $B$/1; $B$: $A$/0, $C$/1; $C$: $A$/0, $B$/1; $D$: $A$/1, $C$/1 (for inputs 0, 1).",
    "steps": [
        {"title": "P0 by output rows", "body": "The output rows are $A$ 01, $B$ 01, $C$ 01, $D$ 11, so $P_0 = \\{A, B, C\\}, \\{D\\}$.", "scene": {"reveal": 1}},
        {"title": "Round 1", "body": "Label each state of $\\{A, B, C\\}$ by the blocks of its next states: $A \\to (D, B)$ = ($\\{D\\}$, big block); $B \\to (A, C)$ and $C \\to (A, B)$ = (big, big). $A$ splits off: $P_1 = \\{A\\}, \\{B, C\\}, \\{D\\}$.", "scene": {"reveal": 2}},
        {"title": "Round 2", "body": "$B \\to (A, C)$ and $C \\to (A, B)$ both go to ($\\{A\\}$, $\\{B, C\\}$): no split, so $P_2 = P_1$ and $B \\equiv C$."},
        {"title": "Cross-check with the implication table", "body": "Pass 0 crosses $A$–$D$, $B$–$D$, $C$–$D$ (outputs). $A$–$B$ implies $A$–$D$ and $A$–$C$ implies $A$–$D$, so both are crossed in pass 1; $B$–$C$ implies only itself and survives. Same result: $B \\equiv C$.", "scene": {"reveal": 3}},
    ],
    "answer": {"value": "(B) 3", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "4 is the answer of someone who merges only identical rows: no two rows are identical, but $B \\equiv C$ because their next states lie in the same class."),
        opt("B", True, "Classes $\\{A\\}, \\{B, C\\}, \\{D\\}$: 3 states. Merged table: $A$: $D$/0, $B$/1; $B$: $A$/0, $B$/1; $D$: $A$/1, $B$/1."),
        opt("C", False, "2 is the number of blocks of $P_0$; stopping there merges $A$ with $B$ and $C$, but the input string 0 0 gives 0, 1 from $A$ and 0, 0 from $B$."),
        opt("D", False, "1 would need every output row to be equal; $D$'s row (11) differs from the others (01)."),
    ],
    "shortcut": "Only $D$ has a different output row, so the question is which states lead to $D$: on input 0, $A$ goes to $D$ while $B$ and $C$ go to $A$. That splits $A$ off, and $B$, $C$ have nothing left to separate them: 3.",
    "pitfalls": [
        "Looking for identical rows and answering 4: $B$ goes to $A, C$ and $C$ to $A, B$, different rows but equivalent states.",
        "Stopping at $P_0$ (answer 2): the first grouping by outputs is not yet the equivalence.",
        "Grouping by the $x = 0$ output alone: $P_0$ of a Mealy machine uses the whole output row.",
    ],
    "verification": "Partition refinement and the implication table both give $\\{A\\}, \\{B, C\\}, \\{D\\}$; the merged 3-state machine produces the same output string as the original for every input string (product-machine check).",
    "animation": table("Partition refinement", ["partition", "blocks"],
                       [["P0 (output rows)", "{A,B,C} {D}"], ["P1", "{A} {B,C} {D}"], ["P2 = P1", "3 states"]],
                       reveal=1),
}

SOLUTIONS["cse-2003-cs-44"] = {
    "approach": "Concept tested: **the minimum number of states for a word specification**. Decide what the machine must remember (the difference $z - n$ while it is between $-1$ and $+1$, then only the verdict), build a machine with that many states, and prove nothing smaller works with pairwise distinguishable input histories.",
    "concepts": ["State minimisation", "Distinguishable states", "Mealy machine", "Absorbing state"],
    "given": "1 input, 2 outputs. Output 00 until, after $k$ bits with $z_k$ zeros and $n_k$ ones, $z_k - n_k = 2$ (output 10 at tick $k$ and for ever) or $n_k - z_k = 2$ (output 01 at tick $k$ and for ever). Minimum number of states?",
    "steps": [
        {"title": "What to remember", "body": "Before a verdict the output is 00 and $d = z - n$ can only be $-1$, 0 or $+1$ (it starts at 0, each bit moves it by 1, and reaching $\\pm 2$ ends the counting). After a verdict only the verdict matters. So: three counting states and two absorbing verdict states."},
        {"title": "A five-state machine", "body": "Mealy (the output at tick $k$ comes with input $k$): $d = 0$: 0 → $+1$/00, 1 → $-1$/00. $d = +1$: 0 → L10/10, 1 → $0$/00. $d = -1$: 0 → $0$/00, 1 → L01/01. L10: any input → L10/10. L01: any input → L01/01.", "scene": {"reveal": 5}},
        {"title": "No four-state machine exists", "body": "The histories ε, 0, 1, 00, 11 lead to $d = 0, +1, -1$, L10, L01, whose output rows (00 00, 10 00, 00 01, 10 10, 01 01) are all different. So every pair of histories is separated by a one-bit suffix, and by the pigeonhole principle a machine with fewer than 5 states would send two of them to the same state, which would then answer that suffix in the same way."},
        {"title": "Read as Moore", "body": "Taking the state reached after $k$ bits to carry the output of tick $k$ gives the same five states ($d = -1, 0, +1$ with output 00, and the two verdict states with 10 and 01). Either way: 5."},
    ],
    "answer": {"value": "(A) 5", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Three counting states ($d = -1, 0, +1$) and two absorbing verdict states, and the five histories ε, 0, 1, 00, 11 are pairwise distinguishable."),
        opt("B", False, "6 adds a separate start state, but the start is just $d = 0$ (equivalent to it), or keeps an extra copy of a verdict state."),
        opt("C", False, "7 keeps $d = +2$ and $d = -2$ as counting states besides the two verdict states; they are the verdict states."),
        opt("D", False, "8 tracks more of the count than any future output depends on; minimisation merges those states."),
    ],
    "shortcut": "Write the output row of each situation: counting at 0 (00 00), at +1 (10 00), at −1 (00 01), verdict 10 (10 10), verdict 01 (01 01). Five different rows means five pairwise distinguishable states already in $P_0$, and a five-state machine exists: 5.",
    "pitfalls": [
        "Counting the differences −2 … +2 and then adding the two verdict states (7): the states $d = \\pm 2$ are the verdicts.",
        "Treating the start as a state of its own (6): it is the $d = 0$ state.",
        "Forgetting that after a verdict the machine must keep its output for ever: the verdict states must be absorbing, and there are two of them because the two verdicts output differently.",
    ],
    "verification": "A machine that tracks $d$ up to $\\pm 6$ together with the verdict has 29 reachable states; partition refinement reduces it to exactly 5, and the five-state machine above is equivalent to it (same output string for every input string). The Moore reading also minimises to 5.",
    "animation": table("The five-state Mealy machine", ["state", "input 0", "input 1"],
                       [["d = 0", "+1 / 00", "−1 / 00"], ["d = +1", "L10 / 10", "0 / 00"], ["d = −1", "0 / 00", "L01 / 01"],
                        ["L10", "L10 / 10", "L10 / 10"], ["L01", "L01 / 01", "L01 / 01"]], reveal=1),
}

SOLUTIONS["cse-2025-1-cs-49"] = {
    "approach": "Concept tested: **partition refinement of a Mealy state table**. $P_0$ groups the states by their whole output row; each round splits a block whose members send some input into different blocks; stop when a round splits nothing. The blocks are the states of the minimal machine.",
    "concepts": ["Partition refinement", "Equivalent states", "Implication table", "Mealy machine"],
    "given": "Eight states $A$–$H$ (next state for $X = 0, 1$; output $f$ for $X = 0, 1$): $A$: $F, B$ / 0, 0; $B$: $D, C$ / 0, 0; $C$: $F, E$ / 0, 0; $D$: $G, A$ / 1, 0; $E$: $D, C$ / 0, 0; $F$: $F, B$ / 1, 1; $G$: $G, H$ / 0, 1; $H$: $G, A$ / 1, 0.",
    "steps": [
        {"title": "Reachability", "body": "From $A$ every state is reachable ($A \\to F, B$; $B \\to D, C$; $C \\to E$; $D \\to G$; $G \\to H$), so no row is dropped."},
        {"title": "P0 by output rows", "body": "00: $A, B, C, E$; 10: $D, H$; 11: $F$; 01: $G$. $P_0 = \\{A, B, C, E\\}, \\{D, H\\}, \\{F\\}, \\{G\\}$ (blocks 1–4).", "scene": {"reveal": 1}},
        {"title": "Round 1", "body": "Labels (block of the next state for $X = 0$, for $X = 1$): $A \\to (F, B)$ = (3, 1), $C \\to (F, E)$ = (3, 1), $B \\to (D, C)$ = (2, 1), $E \\to (D, C)$ = (2, 1); $D$ and $H \\to (G, A)$ = (4, 1). So $P_1 = \\{A, C\\}, \\{B, E\\}, \\{D, H\\}, \\{F\\}, \\{G\\}$.", "scene": {"reveal": 2}},
        {"title": "Round 2", "body": "$A$ and $C$ go to $F$ and to $B$ or $E$ (one block); $B$ and $E$ both go to $(D, C)$; $D$ and $H$ both go to $(G, A)$. Nothing splits: $P_2 = P_1$, 5 classes.", "scene": {"reveal": 3}},
        {"title": "Cross-check with the implication table", "body": "Of the 28 pairs, 21 are crossed in pass 0 (different output rows). Pass 1 crosses $A$–$B$, $A$–$E$, $B$–$C$, $C$–$E$ (each implies $D$–$F$, whose output rows 10 and 11 differ). $A$–$C$ (implies $B$–$E$), $B$–$E$ and $D$–$H$ (identical rows) survive: the same 5 classes."},
    ],
    "answer": {"value": "5", "number": 5, "matchesKey": True},
    "shortcut": "Merge the identical rows first ($B = E$, $D = H$); then $A \\to (F, B)$ and $C \\to (F, E = B)$ are identical too. Five rows remain, and their output rows plus one round of refinement show no further merge: 5. (Identical-row merging happens to finish this table; it is not a complete method in general.)",
    "pitfalls": [
        "Counting the blocks of $P_0$ (4): two of those states are not equivalent ($A$ and $B$ differ on the input string 0 1: outputs 0, 1 from $A$ and 0, 0 from $B$).",
        "Merging $B = E$ and $D = H$ and stopping (6): after those merges $A$ and $C$ have identical rows as well.",
        "Grouping by the $X = 0$ output column only: $P_0$ of a Mealy machine uses both output columns.",
    ],
    "verification": "Partition refinement, the implication table and a product-machine equivalence check of the merged 5-state machine ($A$: $F, B$ / 00; $B$: $D, A$ / 00; $D$: $G, A$ / 10; $F$: $F, B$ / 11; $G$: $G, D$ / 01) against the original all agree. The machine still needs 3 flip-flops, as 8 states did.",
    "animation": table("Refinement rounds", ["partition", "blocks"],
                       [["P0 (output rows)", "{A,B,C,E} {D,H} {F} {G}"], ["P1", "{A,C} {B,E} {D,H} {F} {G}"], ["P2 = P1", "5 states"]],
                       reveal=1),
}
