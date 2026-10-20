"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 6, Lesson 7 (finite state
machines: Mealy and Moore): cse-2001-b-59-a, cse-2001-b-59-b, cse-2002-a-30, cse-2005-cs-63,
cse-2009-cs-27, cse-2021-2-cs-28. Every key is re-derived by seqlib (FSM.run, shortest, to_moore,
excitation, Sync) in l6_07_fsm.py; _sol_ch6.py merges this module and writes src/gate/solutions."""
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


SOLUTIONS["cse-2001-b-59-a"] = {
    "approach": "Concept tested: **building a state machine from a word description**. Decide what must be remembered (the mode, and whether the last bit was the one that would end the mode), make each combination a state, put the output on the arcs (Mealy, since the output is the input or its complement), and test on the given example.",
    "concepts": ["Mealy machine", "State diagram", "Word to FSM", "Sequence detection"],
    "given": "A stream of bits; the circuit copies its input until two consecutive 0s appear, then outputs the complement until two consecutive 1s appear, and repeats. Example: input 101100 01001011 011, output 101100 10110100 011. S-K (JK) master–slave flip-flops are to be used.",
    "steps": [
        {"title": "What must be remembered", "body": "The **mode** (copy or complement) and, inside each mode, whether the last bit was the one that would end the mode if it came again: a 0 in copy mode, a 1 in complement mode. Two facts of one bit each: four states."},
        {"title": "Name the states", "body": "A: copy, last bit not 0 (also the start). B: copy, last bit 0. C: complement, last bit not 1. D: complement, last bit 1. The output is $x$ in A, B and $\\bar x$ in C, D, so it depends on the input: a Mealy machine with outputs on the arcs."},
        {"title": "Draw every arc", "body": "The bit that completes 00 or 11 is still processed in the old mode (the example copies the second 0 of the first 00). A: 0/0 → B, 1/1 → A. B: 0/0 → C, 1/1 → A. C: 0/1 → C, 1/0 → D. D: 0/1 → C, 1/0 → A. Eight arcs for four states, one per (state, input).", "scene": {"reveal": 4}},
        {"title": "Test on the example", "body": "Running the machine on the 17 bits 10110001001011011 from A gives 10110010110100011, the example output (101100 10110100 011), with states A A B A A B C C D C C D C D A B A A."},
    ],
    "answer": {"value": "4-state Mealy machine: A (copy, last≠0), B (copy, last=0), C (complement, last≠1), D (complement, last=1); A: 0/0→B, 1/1→A; B: 0/0→C, 1/1→A; C: 0/1→C, 1/0→D; D: 0/1→C, 1/0→A", "matchesKey": True},
    "shortcut": "State = (mode, 'one more of the same bit ends the mode'). Output = input XOR mode. Only the 'ending' bit moves you between modes.",
    "pitfalls": [
        "Switching mode before processing the completing bit (complementing the second 0 of 00): the example shows it is still copied.",
        "Using only two states (copy, complement): the machine must also remember the previous bit to recognise 00 and 11.",
        "Letting the 11 that ends complement mode start with a 0 → 1 pair from copy mode: after a mode change the 'last bit' memory starts afresh (states C and A).",
    ],
    "verification": "Simulated on every input up to 10 bits, the machine equals a direct reading of the words (copy until 00, complement until 11, repeat), and it is minimal (4 states, partition refinement merges nothing). An equivalent Moore machine needs 6 states.",
    "animation": table("State table (next state / output)", ["x = 0", "x = 1"],
                       [["B/0", "A/1"], ["C/0", "A/1"], ["C/1", "D/0"], ["C/1", "A/0"]],
                       ["A copy, last≠0", "B copy, last=0", "C comp, last≠1", "D comp, last=1"], reveal=1),
}

SOLUTIONS["cse-2001-b-59-b"] = {
    "approach": "Concept tested: **implementing a Mealy machine with JK flip-flops**. Assign codes to the four states, write the encoded state table, read the J and K columns from the JK excitation table (J only where Q = 0, K only where Q = 1) and minimise. 'S-K master–slave' is a JK flip-flop (set/reset, toggle on 11).",
    "concepts": ["State assignment", "JK flip-flop", "Excitation table", "K-map minimisation"],
    "given": "The 4-state machine of part (a): A: 0/0 → B, 1/1 → A; B: 0/0 → C, 1/1 → A; C: 0/1 → C, 1/0 → D; D: 0/1 → C, 1/0 → A. Two master–slave JK flip-flops $Q_1Q_0$; input $x$, output $z$.",
    "steps": [
        {"title": "State assignment", "body": "A = 00, B = 01, C = 10, D = 11. Then $Q_1$ is the mode (0 copy, 1 complement) and $Q_0$ the flag 'one more of the same bit ends the mode'. All four codes are used: no don't-cares from unused states."},
        {"title": "Encoded table", "body": "00: $x = 0$ → 01, $z = 0$; $x = 1$ → 00, 1. 01: 0 → 10, 0; 1 → 00, 1. 10: 0 → 10, 1; 1 → 11, 0. 11: 0 → 10, 1; 1 → 00, 0.", "scene": {"reveal": 8}},
        {"title": "J1 and K1", "body": "$J_1$ matters in rows with $Q_1 = 0$: it is 1 only in row (01, $x = 0$), so $J_1 = Q_0\\bar x$. $K_1$ matters in rows with $Q_1 = 1$: it is 1 only in row (11, $x = 1$), so $K_1 = Q_0 x$."},
        {"title": "J0 and K0", "body": "$J_0$ (rows with $Q_0 = 0$) is 1 in rows (00, 0) and (10, 1) and 0 in (00, 1), (10, 0): $J_0 = Q_1x + \\bar Q_1\\bar x$. Every row with $Q_0 = 1$ goes to $Q_0^+ = 0$: $K_0 = 1$."},
        {"title": "Output", "body": "$z = x$ in copy mode and $\\bar x$ in complement mode: $z = x \\oplus Q_1$."},
    ],
    "answer": {"value": "With A=00, B=01, C=10, D=11: $J_1 = Q_0\\bar x$, $K_1 = Q_0 x$, $J_0 = Q_1x + \\bar Q_1\\bar x$, $K_0 = 1$, $z = x \\oplus Q_1$", "matchesKey": True,
               "keyNote": "Any state assignment followed consistently is a correct answer; it changes the equations, not the behaviour. With A=00, B=01, C=11, D=10 the same procedure gives $J_1 = Q_0\\bar x$, $K_1 = \\bar Q_0x$, $J_0 = \\bar x$, $K_0 = x$."},
    "shortcut": "Choose codes whose bits mean something (mode, flag): $J_1$ = 'flag set and another 0 arrives', $K_1$ = 'flag set and another 1 arrives', and the flag is always cleared at the next clock ($K_0 = 1$).",
    "pitfalls": [
        "Reading 'S-K' as an SR flip-flop and forbidding S = R = 1: the question's flip-flop is the JK type.",
        "Writing J or K values in rows where they do not matter instead of don't-cares, which gives larger equations.",
        "Using D-flip-flop equations ($D = Q^+$) for J: J is $Q^+$ only in rows with $Q = 0$.",
    ],
    "verification": "The circuit with these equations, simulated on every input up to 9 bits, produces the same outputs as the state machine, and on the example 101100 01001011 011 it outputs 101100 10110100 011. The D design ($D_1 = Q_0\\bar x + Q_1\\bar Q_0$, $D_0 = \\bar Q_1\\bar Q_0\\bar x + Q_1\\bar Q_0 x$) and a one-hot design agree too.",
    "animation": table("Encoded table and JK columns (× = don't care)", ["Q1Q0 x", "Q1⁺Q0⁺", "z", "J1", "K1", "J0", "K0"],
                       [["00 0", "01", "0", "0", "×", "1", "×"], ["00 1", "00", "1", "0", "×", "0", "×"], ["01 0", "10", "0", "1", "×", "×", "1"],
                        ["01 1", "00", "1", "0", "×", "×", "1"], ["10 0", "10", "1", "×", "0", "0", "×"], ["10 1", "11", "0", "×", "0", "1", "×"],
                        ["11 0", "10", "1", "×", "0", "×", "1"], ["11 1", "00", "0", "×", "1", "×", "1"]], reveal=1),
}

SOLUTIONS["cse-2002-a-30"] = {
    "approach": "Concept tested: **interpreting a Mealy machine**. Give each state a meaning from the arcs that enter it (A: previous bit 0; B and C: previous bit 1), read the 2-bit outputs as numbers, and kill the false options with one short input each.",
    "concepts": ["Mealy machine", "Interpreting an FSM", "Serial arithmetic"],
    "given": "States A (start), B, C; arcs input/2-bit output: A: 0/00 → A, 1/01 → B; B: 0/01 → A, 1/10 → C; C: 0/01 → A, 1/10 → C.",
    "steps": [
        {"title": "Meaning of the states", "body": "A is entered only on input 0 (and is the start); B and C are entered only on input 1. So A = 'previous bit 0' and B, C = 'previous bit 1'."},
        {"title": "Read the outputs as numbers", "body": "From A: input 0 → 00 = 0 + 0, input 1 → 01 = 0 + 1. From B or C: input 0 → 01 = 1 + 0, input 1 → 10 = 1 + 1. Each output is the 2-bit sum of the previous and the present bit.", "scene": {"reveal": 4}},
        {"title": "Eliminate B and C", "body": "Input 11: the second output is 10, not 01, so (B) is false. Input 10: the second output is 01, not 00, so (C) is false. Since (A) holds, (D) is false."},
    ],
    "answer": {"value": "(A) Outputs the sum of the present and the previous bits of the input", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Every arc's output is (previous bit) + (present bit) in 2-bit binary, with the bit before the first taken as 0; checked on every input up to 8 bits."),
        opt("B", False, "After 11 the machine outputs 10 (= 1 + 1), not 01."),
        opt("C", False, "After 10 the machine outputs 01 (= 1 + 0), not 00."),
        opt("D", False, "Option A is true."),
    ],
    "shortcut": "Notice that B and C have identical rows: the machine only remembers the previous bit. With a 1-bit memory and a 2-bit output that counts 0, 1, 2, 'sum of the last two bits' is the natural reading.",
    "pitfalls": [
        "Reading the 2-bit output 10 as 'ten' or as two separate signals instead of the binary number 2.",
        "Thinking B and C mean different things: they are equivalent states (same outputs, same next states).",
    ],
    "verification": "Simulation on input 0110111 gives 00, 01, 10, 01, 01, 10, 10, each the sum of a bit and its predecessor; partition refinement merges B and C, leaving 2 states.",
    "animation": table("Input 0110111", ["prev", "x", "state", "output", "prev + x"],
                       [["0", "0", "A", "00", "0"], ["0", "1", "A", "01", "1"], ["1", "1", "B", "10", "2"], ["1", "0", "C", "01", "1"],
                        ["0", "1", "A", "01", "1"], ["1", "1", "B", "10", "2"], ["1", "1", "C", "10", "2"]], reveal=1),
}

SOLUTIONS["cse-2005-cs-63"] = {
    "approach": "Concept tested: **the serial 2's complementer**. The machine copies bits (Q0) until and including the first 1, then complements every later bit (Q1). With the bits arriving LSB first, 'copy up to the first 1, then complement' is exactly the 2's complement.",
    "concepts": ["Mealy machine", "2's complement", "Serial arithmetic", "Interpreting an FSM"],
    "given": "Two-state Mealy machine, input LSB first: Q0 (start): 0/0 self-loop, 1/1 → Q1; Q1: 0/1 and 1/0 self-loops.",
    "steps": [
        {"title": "What the states do", "body": "Q0 outputs each bit unchanged and leaves on the first 1 (copying it). Q1 inverts every bit and never leaves."},
        {"title": "Why that is −x", "body": "2's complement = invert and add 1. Inverting turns the trailing zeros into 1s and the lowest 1 into a 0; adding 1 ripples through those 1s and restores the low part exactly. So bits up to the first 1 are unchanged and the bits above are inverted: the machine's rule."},
        {"title": "Check on a number", "body": "0110100 (52) fed LSB first as 0, 0, 1, 0, 1, 1, 0 gives 0, 0, 1, 1, 0, 0, 1, i.e. 1001100 = 76 = 128 − 52.", "scene": {"reveal": 7}},
        {"title": "Kill the other options with input 0", "body": "Input 00…0 stays in Q0 and outputs 0. The 1's complement of 0 is 11…1, increment gives 1, decrement gives 11…1. Only the 2's complement of 0 is 0."},
    ],
    "answer": {"value": "(B) It computes the 2's complement of the input number", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "The machine complements only the bits after the first 1; on all 256 eight-bit inputs it never once equals 255 − v (for 0 it outputs 0, not 11111111)."),
        opt("B", True, "Copy up to and including the first 1, then complement: the output is (2ⁿ − v) mod 2ⁿ for every n-bit input (checked on all 256 bytes)."),
        opt("C", False, "Increment of 0 is 1, but the machine outputs 0; increment flips the trailing 1s, not the bits above the first 1."),
        opt("D", False, "Decrement of 0 is all 1s, but the machine outputs 0."),
    ],
    "shortcut": "The input 0 separates all four options at once: 1's complement → all 1s, increment → 1, decrement → all 1s, 2's complement → 0, and the machine outputs 0.",
    "pitfalls": [
        "Seeing 'complement' in Q1 and choosing 1's complement: the bits up to the first 1 are copied, not complemented.",
        "Reading the number MSB first: the question states LSB first, and the rule depends on it.",
    ],
    "verification": "Simulated on all 256 eight-bit numbers, LSB first, the output is (256 − v) mod 256 every time and never equals 255 − v, v + 1 or v − 1.",
    "animation": table("0110100 (52) LSB first", ["bit", "x", "state", "z"],
                       [["0", "0", "Q0", "0"], ["1", "0", "Q0", "0"], ["2", "1", "Q0 → Q1", "1"], ["3", "0", "Q1", "1"],
                        ["4", "1", "Q1", "0"], ["5", "1", "Q1", "0"], ["6", "0", "Q1", "1"]], reveal=1,
                       caption="Read z from bit 6 down to bit 0: 1001100 = 76 = 128 − 52."),
}

SOLUTIONS["cse-2009-cs-27"] = {
    "approach": "Concept tested: **shortest input to a (state, output) target, by breadth-first search**. First find the arcs that meet the target (next state 01 **and** output 1), then search from 00 for the source of such an arc and append its input.",
    "concepts": ["State table", "Breadth-first search", "Mealy machine", "Shortest input"],
    "given": "Present AB, input → next AB, output: 00,0 → 00,1; 01,0 → 10,0; 10,0 → 01,0; 11,0 → 10,0; 00,1 → 01,0; 01,1 → 00,1; 10,1 → 01,1; 11,1 → 00,1. Start 00; target: AB = 01 with output 1.",
    "steps": [
        {"title": "Arcs that meet the target", "body": "Arcs into 01: 00 –1/0, 10 –0/0 and 10 –1/1. Only **10 –1/1 → 01** has output 1, so the machine must first reach 10."},
        {"title": "Breadth-first from 00", "body": "Level 1: input 1 gives 01 (input 0 stays in 00). Level 2: from 01, input 0 gives 10. So 10 is reached with 10 (two inputs), and no shorter.", "scene": {"reveal": 3}},
        {"title": "Append the target arc", "body": "00 –1→ 01 –0→ 10 –1→ 01 with output 1: the input 101 of length 3.", "scene": {"reveal": 4}},
    ],
    "answer": {"value": "(A) 3 (input 101)", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "101 reaches 01 with output 1, and breadth-first search shows that 10 (the only source of a suitable arc) needs two inputs."),
        opt("B", False, "4 is longer than the shortest string 101."),
        opt("C", False, "5 comes from reading the table's columns in the wrong order or from a search that is not breadth-first."),
        opt("D", False, "6 is twice the shortest length; a string of length 6 that meets the target exists, but 101 already does at length 3."),
    ],
    "shortcut": "Look at the target arc first: only 10 –1/1 → 01 works. Reaching 10 from 00 takes 2 inputs (1, 0), so the answer is 2 + 1 = 3.",
    "pitfalls": [
        "Answering 1: input 1 from 00 does reach 01, but with output 0.",
        "Mixing up the present-state and next-state columns of the long table.",
        "Checking the output of the state reached instead of the output of the arc (this is a Mealy table).",
    ],
    "verification": "seqlib's breadth-first search with the target 'next state 01 and output 1' returns 101; the run visits 00, 01, 10, 01 with outputs 0, 0, 1. (State 11 is not reachable from 00 at all.)",
    "animation": table("Breadth-first search from 00", ["input so far", "state", "last output"],
                       [["–", "00", "–"], ["1", "01", "0"], ["10", "10", "0"], ["101", "01", "1"]], reveal=1),
}

SOLUTIONS["cse-2021-2-cs-28"] = {
    "approach": "Concept tested: **a two-state Mealy machine whose state is the previous input bit**. A 1 is replaced by 0 exactly when it is the first of its run, i.e. when the previous bit was 0, so the machine must remember the previous bit: $t = b$; and it passes a 1 only when the previous bit was 1: $y = sb$.",
    "concepts": ["Mealy machine", "Two-state machine", "Next-state equation", "Output equation"],
    "given": "Replace the first 1 of every run of consecutive 1s by 0; input 00100011000011100 → output 00000001000001100. States 0 and 1 (initial 0); present state $s$, next state $t$, input bit $b$, output $y$.",
    "steps": [
        {"title": "What to remember", "body": "Whether the present 1 is the first of its run depends only on the previous bit. So the state is the previous bit (0 at the start): $t = b$."},
        {"title": "The output", "body": "Output 1 only for a 1 whose predecessor was 1: $y = s \\cdot b$. A 0 always outputs 0, and a 1 after a 0 outputs 0."},
        {"title": "Check the options on the example", "body": "(B) $t = b$, $y = sb$ reproduces 00000001000001100. (A) $t = s + b$ never forgets a 1 and gives 00000011000011100. (C) gives 00010000100000010 and (D) 00011100111100011.", "scene": {"reveal": 4}},
    ],
    "answer": {"value": "(B) $t = b$, $y = sb$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$t = s + b$ stays in state 1 after the first 1 for ever, so every later 1 is passed: the example gives 00000011000011100."),
        opt("B", True, "State = previous bit and output = previous AND present: exactly 'drop the first 1 of each run'; matches the example and every input up to 10 bits."),
        opt("C", False, "$y = s\\bar b$ outputs 1 on the 0 that ends a run of 1s: 00010000100000010."),
        opt("D", False, "Both equations are wrong: 00011100111100011."),
    ],
    "shortcut": "'First 1 of a run' = 'a 1 whose previous bit is 0'. So remember the previous bit ($t = b$) and output previous AND present ($y = sb$). This is also the overlapping 11 detector.",
    "pitfalls": [
        "Choosing $t = s + b$ ('a 1 has been seen'): that is the 2's complementer's memory, not the previous bit.",
        "Using $\\bar b$ in the output: the output must be 0 whenever the input is 0.",
    ],
    "verification": "Simulated on every input up to 10 bits, the machine $t = b$, $y = sb$ equals a direct implementation of 'replace the first 1 of each run by 0'; with one D flip-flop it is $D = b$, $y = Qb$.",
    "animation": table("The four options on the example", ["t", "y", "output"],
                       [["s + b", "sb", "00000011000011100"], ["b", "sb", "00000001000001100"], ["b", "sb̄", "00010000100000010"], ["s + b", "sb̄", "00011100111100011"]],
                       ["A", "B", "C", "D"], reveal=0, caption="Wanted: 00000001000001100"),
}
