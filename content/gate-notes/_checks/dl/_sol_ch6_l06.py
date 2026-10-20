"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 6, Lesson 6 (shift registers,
ring and Johnson counters, LFSRs): cse-1991-b-6-a, cse-1991-b-6-b, cse-1993-ii-a-6-3, cse-2001-a-37,
cse-2006-cs-37, it-2007-cs-40, cse-2014-2-cs-7, cse-2015-1-cs-20, cse-2018-cs-22, cse-2025-1-cs-50.
Every key is re-derived by seqlib simulation in l6_06_registers.py; _sol_ch6.py merges this module
and writes src/gate/solutions."""
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


SOLUTIONS["cse-1991-b-6-a"] = {
    "approach": "Concept tested: **a parallel-in/serial-out register with a load path**. Every D input needs two sources, its data bit (load) and its left neighbour (shift), and a 2-to-1 AND-OR steering network driven by LOAD/SHIFT′ chooses between them; the clock stays common.",
    "concepts": ["Shift register", "PISO", "D flip-flop", "2-to-1 multiplexer"],
    "given": "D flip-flops and gates; inputs CLK, parallel data A, B, C, serial input S and control LOAD/$\\overline{\\text{SHIFT}}$; the register shifts from left to right.",
    "steps": [
        {"title": "Three stages on one clock", "body": "Three bits need three D flip-flops $Q_A, Q_B, Q_C$, all clocked by CLK. Shifting left to right means $Q_A$ feeds $Q_B$, $Q_B$ feeds $Q_C$, and $S$ enters $Q_A$; the serial output is $Q_C$."},
        {"title": "Steering each D input", "body": "Let $L = $ LOAD/$\\overline{\\text{SHIFT}}$. With one inverter for $\\overline{L}$: $D_A = L\\,A + \\overline{L}\\,S$, $D_B = L\\,B + \\overline{L}\\,Q_A$, $D_C = L\\,C + \\overline{L}\\,Q_B$, i.e. two ANDs and an OR (a 2-to-1 MUX) per stage: 6 ANDs, 3 ORs, 1 inverter."},
        {"title": "Check the two modes", "body": "$L = 1$: $D_A D_B D_C = ABC$, one edge loads the word. $L = 0$: $D_A D_B D_C = S\\,Q_A\\,Q_B$, each edge shifts one place towards $Q_C$.", "scene": {"reveal": 1}},
        {"title": "Trace a word", "body": "Load $ABC = 101$, then shift with $S = 0, 1, 1$: $Q_AQ_BQ_C$ = 101, 010, 101, 110, and the serial output $Q_C$ shows C, B, A = 1, 0, 1, followed by the first S bit.", "scene": {"reveal": 4}},
    ],
    "answer": {"value": "3 D flip-flops on CLK with $D_A = L A + \\overline{L} S$, $D_B = L B + \\overline{L} Q_A$, $D_C = L C + \\overline{L} Q_B$ ($L$ = LOAD/$\\overline{\\text{SHIFT}}$); serial output $Q_C$", "matchesKey": True},
    "shortcut": "A PISO is a universal shift register that only uses two of its four modes: write $D_i = L\\,I_i + \\overline{L}\\,Q_{i-1}$ for every stage and you are done.",
    "pitfalls": [
        "Gating the clock with LOAD instead of steering the D inputs: that breaks the synchronous discipline and creates glitches.",
        "Feeding $S$ into $Q_C$ (shifting the wrong way) or taking the output from $Q_A$.",
        "Forgetting the inverter: both terms of a steering pair need opposite enables.",
    ],
    "verification": "Simulating the three steering equations for every state and every input combination gives exactly the universal register's 'load' (L = 1) and 'shift right' (L = 0) modes; the trace above is the simulated one.",
    "animation": table("Load 101, then shift with S = 0, 1, 1", ["L", "S", "QA QB QC", "out QC"],
                       [["1", "–", "101", "1"], ["0", "0", "010", "0"], ["0", "1", "101", "1"], ["0", "1", "110", "0"]],
                       ["load", "shift 1", "shift 2", "shift 3"], reveal=1),
}

SOLUTIONS["cse-1991-b-6-b"] = {
    "approach": "Concept tested: **a shift register as a delay line made from a RAM**. A counter walks round all 1024 addresses; at each shift the old bit at the current address is read out before the new bit is written there, so every bit comes back out exactly 1024 shifts later.",
    "concepts": ["Shift register", "RAM", "Counter", "Delay line"],
    "given": "A $1\\text{K} \\times 1$ RAM with $D_{in}$, $D_{out}$ and READ/$\\overline{\\text{WRITE}}$; standard SSI/MSI parts (gates, registers, counters). Build a 1024-bit serial-in/serial-out unidirectional shift register.",
    "steps": [
        {"title": "Addressing", "body": "A 10-bit binary counter (mod-1024, since $2^{10} = 1024$) drives the address lines, so the shift clocks visit the locations 0, 1, …, 1023, 0, … in turn."},
        {"title": "One shift = read, write, increment", "body": "At each shift clock a small sequencer (or the two clock phases) does: READ/$\\overline{\\text{WRITE}} = 1$ and clock $M[\\text{ctr}]$ into a D flip-flop whose $Q$ is the serial output; READ/$\\overline{\\text{WRITE}} = 0$ to write $D_{in}$ into $M[\\text{ctr}]$; then increment the counter.", "scene": {"reveal": 3}},
        {"title": "Why the delay is 1024", "body": "A bit written at shift $j$ into address $a = j \\bmod 1024$ is not touched while the counter visits the other 1023 addresses. At shift $j + 1024$ the counter is back at $a$, and the read, which comes before the write, hands that bit to the output."},
        {"title": "Why the order matters", "body": "If the write came first, the location would be overwritten before it was read and the output would equal the input: no delay at all."},
    ],
    "answer": {"value": "Mod-1024 (10-bit) counter on the address lines; per shift: read $M[\\text{ctr}]$ into the output flip-flop, write $D_{in}$ into $M[\\text{ctr}]$, increment; output = input delayed by 1024 shifts", "matchesKey": True},
    "shortcut": "Think of a circular buffer: the data stays put and the pointer moves. Read-before-write at the pointer gives a delay equal to the buffer length.",
    "pitfalls": [
        "Writing before reading at the same address (the register collapses to a wire).",
        "Using a counter with fewer than 10 bits (some locations never used, a shorter delay) or more (addresses beyond 1K).",
        "Trying to move the bits inside the RAM: a RAM has no path between locations.",
    ],
    "verification": "A simulation of the RAM design on a random 3000-bit stream produces exactly the bits that leave a 1024-stage chain of D flip-flops (seqlib.shift_right), clock for clock; with write-before-read the output equals the input.",
    "animation": table("One shift clock", ["sub-step", "READ/WRITE′", "action"],
                       [["1", "1", "Dout FF ← M[ctr]"], ["2", "0", "M[ctr] ← Din"], ["3", "–", "ctr ← ctr + 1 (mod 1024)"]], reveal=1),
}

SOLUTIONS["cse-1993-ii-a-6-3"] = {
    "approach": "Concept tested: **a JK shift register with twisted feedback (Johnson counter)**. Each JK stage has $K = \\overline{J}$, so it copies $J$ like a D stage; the first stage takes $\\overline{Q_3}$. Trace from 000.",
    "concepts": ["Johnson counter", "JK flip-flop", "Shift register", "Mod-6 counter"],
    "given": "Three JK flip-flops on a common clock: $J_2 = Q_1$, $K_2 = \\overline{Q_1}$; $J_3 = Q_2$, $K_3 = \\overline{Q_2}$; $J_1 = \\overline{Q_3}$, $K_1 = Q_3$. Initial state 000. Options: shift register, mod-3, mod-6, mod-2 counter, none.",
    "steps": [
        {"title": "Each stage is a D stage", "body": "$Q^+ = J\\overline{Q} + \\overline{K}Q$ with $K = \\overline{J}$ gives $Q^+ = J\\overline{Q} + JQ = J$. So $Q_2^+ = Q_1$, $Q_3^+ = Q_2$, $Q_1^+ = \\overline{Q_3}$: a shift register with the complement of the last stage fed back."},
        {"title": "Trace from 000", "body": "000 → 100 → 110 → 111 → 011 → 001 → 000: six states.", "scene": {"reveal": 7}},
        {"title": "Name the function", "body": "Six states in the cycle: a mod-6 (Johnson) counter. The structure is a shift register (every stage copies the previous one) whose twisted feedback makes it count."},
        {"title": "Why (a) is accepted too", "body": "The arrangement is literally a shift register: data moves one stage per clock. The key (a) and (c) reads 'function performed' as both what the circuit is (a twisted-ring shift register) and what it does from 000 (count mod 6)."},
    ],
    "answer": {"value": "(a) shift register and (c) mod-6 counter", "choice": ["A", "C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Every stage copies the previous one at the clock: it is a shift register (with twisted feedback)."),
        opt("B", False, "Mod-3 would be a 3-stage ring counter ($J_1 = Q_3$); the inverted feedback doubles the cycle to 6."),
        opt("C", True, "From 000 the circuit cycles through 6 states: 000, 100, 110, 111, 011, 001."),
        opt("D", False, "The 2-cycle 010 ↔ 101 exists, but only from those start states, not from 000."),
        opt("E", False, "A and C apply."),
    ],
    "shortcut": "Q̄ of the last stage into the first = Johnson counter: $2n = 6$ states for 3 flip-flops.",
    "pitfalls": [
        "Treating the JK stages as toggling (J = K = 1) stages; here $K = \\overline{J}$ always.",
        "Counting the ring-counter modulus (3) instead of the Johnson modulus (6).",
        "Choosing mod-2 because the 010 ↔ 101 cycle exists; the start is 000.",
    ],
    "verification": "Simulating the three JK stages gives the same next state as a 3-bit Johnson step in all 8 states; from 000 the cycle has 6 states and the leftovers form 010 ↔ 101.",
    "animation": table("Trace from 000", ["Q1 Q2 Q3", "J1 = Q̄3"],
                       [["000", "1"], ["100", "1"], ["110", "1"], ["111", "0"], ["011", "0"], ["001", "0"], ["000", "1"]],
                       ["start", "1", "2", "3", "4", "5", "6"], reveal=1),
}

SOLUTIONS["cse-2001-a-37"] = {
    "approach": "Concept tested: **a shift register with XOR feedback (an LFSR)**. Write the next-state equations, then trace from the given state; as a number the register doubles and adds the feedback bit.",
    "concepts": ["LFSR", "Shift register", "XOR feedback", "State sequence"],
    "given": "Three D flip-flops: $D_1 = Q_0$, $D_2 = Q_1$, $D_0 = Q_1 \\oplus Q_2$; initially $Q_0 = 1$, $Q_1 = Q_2 = 0$; state $= 4Q_2 + 2Q_1 + Q_0$.",
    "steps": [
        {"title": "Next-state equations", "body": "$Q_0^+ = Q_1 \\oplus Q_2$, $Q_1^+ = Q_0$, $Q_2^+ = Q_1$. As a number $v$: $v^+ = (2v \\bmod 8) + (Q_1 \\oplus Q_2)$."},
        {"title": "Trace", "body": "1 (001): $0 \\oplus 0 = 0$ → 2. 2 (010): $1 \\oplus 0 = 1$ → 5. 5 (101): $0 \\oplus 1 = 1$ → 3. 3 (011): $1 \\oplus 0 = 1$ → 7.", "scene": {"reveal": 5}},
        {"title": "Finish the cycle", "body": "7 (111): $1 \\oplus 1 = 0$ → 6. 6 (110): $1 \\oplus 1 = 0$ → 4. 4 (100): $0 \\oplus 1 = 1$ → 1. All seven non-zero states: a maximal-length LFSR.", "scene": {"reveal": 8}},
    ],
    "answer": {"value": "(B) 1, 2, 5, 3, 7, 6, 4", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "1 → 3 is possible, but 3 → 4 is not: from 3 the register can only reach $2 \\cdot 3 = 6$ or 7."),
        opt("B", True, "The simulated sequence 1, 2, 5, 3, 7, 6, 4 (then 1 again)."),
        opt("C", False, "2 → 7 is impossible: from 2 only 4 or 5 can follow."),
        opt("D", False, "1 → 6 is impossible: from 1 only 2 or 3 can follow."),
    ],
    "shortcut": "Each next state is $2v \\bmod 8$ or one more; only option B obeys that at every step, so no XOR needs to be computed at all.",
    "pitfalls": [
        "Shifting in the wrong direction (reading $Q_0$ as the most significant bit).",
        "Updating $Q_1$ first and then using the new $Q_1$ in the XOR (every flip-flop uses the old state).",
    ],
    "verification": "Simulation from 001 gives 1, 2, 5, 3, 7, 6, 4, 1; 000 maps to itself, the only state off the cycle.",
    "animation": table("State sequence", ["Q2Q1Q0", "Q1 ⊕ Q2", "value"],
                       [["001", "0", "1"], ["010", "1", "2"], ["101", "1", "5"], ["011", "1", "3"], ["111", "0", "7"], ["110", "0", "6"], ["100", "1", "4"], ["001", "", "1"]],
                       reveal=1),
}

SOLUTIONS["cse-2006-cs-37"] = {
    "approach": "Concept tested: **tracing a shift register with an XOR inside the chain and a serial data input**. Fix the time order of the data first (first character first), then apply $q_0^+ = data$, $q_1^+ = q_0 \\oplus q_2$, $q_2^+ = q_1$ from the old state at every clock.",
    "concepts": ["Shift register", "XOR feedback", "Serial input", "Clock-by-clock trace"],
    "given": "Three cleared D flip-flops: $q_0$ takes $data$, $q_1$ takes $q_0 \\oplus q_2$, $q_2$ takes $q_1$. The data 100110000 is supplied in nine clock cycles. Find $q_2q_1q_0$.",
    "steps": [
        {"title": "Time order", "body": "The string is supplied in nine cycles in the order written: 1, 0, 0, 1, 1, 0, 0, 0, 0."},
        {"title": "First five clocks", "body": "000 → 001 → 010 → 100 → 011 → 111.", "scene": {"reveal": 6}},
        {"title": "The four zeros", "body": "111 → 100 → 010 → 100 → 010. With $data = 0$ the states 100 and 010 swap at every clock.", "scene": {"reveal": 10}},
    ],
    "answer": {"value": "(C) 010", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "000 would need the register to flush to zero, but with $data = 0$ the bit circulates 100 ↔ 010 through the XOR instead of leaving."),
        opt("B", False, "001 needs $q_0 = 1$, i.e. a 1 at the last clock; the last data bit is 0."),
        opt("C", True, "The simulated final state."),
        opt("D", False, "101 needs $q_0 = 1$ at the end too; the last data bit is 0."),
    ],
    "shortcut": "The last data bit is 0, so $q_0 = 0$: only 000 and 010 survive. 000 is impossible because once a 1 is inside, $q_1^+ = q_2$ (with $q_0 = 0$) keeps it circulating.",
    "pitfalls": [
        "Feeding the string last character first (that ends at 111, not an option).",
        "Treating $q_1$ as a plain copy of $q_0$ and forgetting the XOR with $q_2$.",
        "Updating the flip-flops one after another instead of from the old state.",
    ],
    "verification": "Simulation with the data in written order: 000, 001, 010, 100, 011, 111, 100, 010, 100, 010.",
    "animation": table("Nine clocks", ["data", "q2q1q0"],
                       [["–", "000"], ["1", "001"], ["0", "010"], ["0", "100"], ["1", "011"], ["1", "111"], ["0", "100"], ["0", "010"], ["0", "100"], ["0", "010"]],
                       ["start", "1", "2", "3", "4", "5", "6", "7", "8", "9"], reveal=1),
}

SOLUTIONS["it-2007-cs-40"] = {
    "approach": "Concept tested: **an LFSR with a serial input**. At each clock the leftmost cell takes input ⊕ rightmost cell and the register shifts right; compute the XOR from the old contents, then slide.",
    "concepts": ["LFSR", "Serial input", "XOR feedback", "Shift register"],
    "given": "A 4-cell register holding 0110; the XOR of the serial input and the rightmost cell feeds the leftmost cell; input 101101.",
    "steps": [
        {"title": "First three inputs", "body": "0110, in 1: $1 \\oplus 0 = 1$ → 1011. In 0: $0 \\oplus 1 = 1$ → 1101. In 1: $1 \\oplus 1 = 0$ → 0110.", "scene": {"reveal": 4}},
        {"title": "Last three inputs", "body": "They are again 1, 0, 1 and the register is again 0110, so the same three steps repeat: 1011, 1101, 0110.", "scene": {"reveal": 7}},
        {"title": "Input order", "body": "101101 reads the same in both directions, so whichever end of the string enters first, the result is the same."},
    ],
    "answer": {"value": "(A) 0110", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The simulated final contents."),
        opt("B", False, "1011 is the contents after the 1st (and the 4th) input, one clock too early in the cycle."),
        opt("C", False, "1101 is the contents after the 2nd (and the 5th) input."),
        opt("D", False, "1111 never appears: the register only visits 1011, 1101 and 0110 for this input."),
    ],
    "shortcut": "Notice the period: after 1, 0, 1 the register is back at 0110, and the input is that pattern twice.",
    "pitfalls": [
        "Shifting the register left, or XORing with the leftmost cell.",
        "Shifting first and computing the XOR from the new rightmost cell.",
    ],
    "verification": "seqlib.lfsr_step with the single tap on the last cell and the input XORed in gives 1011, 1101, 0110, 1011, 1101, 0110.",
    "animation": table("Six clocks", ["in", "in ⊕ right", "register"],
                       [["–", "–", "0110"], ["1", "1", "1011"], ["0", "1", "1101"], ["1", "0", "0110"], ["1", "1", "1011"], ["0", "1", "1101"], ["1", "0", "0110"]],
                       ["start", "1", "2", "3", "4", "5", "6"], reveal=1),
}

SOLUTIONS["cse-2014-2-cs-7"] = {
    "approach": "Concept tested: **a counter plus a decoder as a ring counter**. The decoder raises exactly one output, the one numbered by the count; as the count advances by one per clock, that single 1 moves one line per clock and wraps round.",
    "concepts": ["Ring counter", "Decoder", "Binary counter", "One-hot code"],
    "given": "$k = 2^n$; an $n$-bit binary counter drives an $n$-to-$2^n$ decoder.",
    "steps": [
        {"title": "What the decoder shows", "body": "In counter state $c$, decoder line $c$ is 1 and the other $k - 1$ lines are 0: a one-hot pattern of $k$ bits."},
        {"title": "What a clock does", "body": "The count goes $c \\to c + 1 \\pmod{2^n}$, so the 1 moves from line $c$ to line $c + 1$, and from line $k - 1$ back to line 0. For $n = 2$: 1000 → 0100 → 0010 → 0001 → 1000.", "scene": {"reveal": 5}},
        {"title": "Compare", "body": "A single 1 circulating through $k$ positions with period $k$ is exactly a $k$-bit ring counter."},
    ],
    "answer": {"value": "(C) $k$-bit ring counter", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "A $k$-bit binary up counter has $2^k$ states; the decoder outputs have only $k$ patterns, each with a single 1."),
        opt("B", False, "Same count problem as A, and the 1 moves upwards, not downwards."),
        opt("C", True, "One 1 circulating through $k$ lines, one step per clock: the $k$-bit ring counter's sequence."),
        opt("D", False, "A $k$-bit Johnson counter has $2k$ states with runs of 1s (1000, 1100, …), not a single 1."),
    ],
    "shortcut": "Decoder output = one-hot = ring-counter code.",
    "pitfalls": [
        "Answering 'binary up counter' because the inner counter counts up: the question is about the decoder outputs.",
        "Confusing ring (one 1 moving) with Johnson (1s filling, then 0s filling).",
    ],
    "verification": "For n = 1 … 4 the simulated decoder outputs over $2^n$ clocks equal the ring counter's cycle started at 10…0.",
    "animation": table("n = 2: count and decoder lines", ["count", "lines 0 1 2 3"],
                       [["00", "1000"], ["01", "0100"], ["10", "0010"], ["11", "0001"], ["00", "1000"]], reveal=1),
}

SOLUTIONS["cse-2015-1-cs-20"] = {
    "approach": "Concept tested: **the counting sequence of a Johnson counter**. The complement of the last stage enters the first, so from 0000 the register fills with 1s from the left and then with 0s; read each state with the first stage as the MSB.",
    "concepts": ["Johnson counter", "Twisted-ring counter", "Shift register"],
    "given": "A 4-bit Johnson counter with initial value 0000.",
    "steps": [
        {"title": "The rule", "body": "$Q_1^+ = \\overline{Q_4}$, $Q_i^+ = Q_{i-1}$ (shift right, the standard drawing)."},
        {"title": "Trace", "body": "0000 → 1000 → 1100 → 1110 → 1111 → 0111 → 0011 → 0001 → 0000: $2n = 8$ states.", "scene": {"reveal": 9}},
        {"title": "In decimal", "body": "0, 8, 12, 14, 15, 7, 3, 1, 0."},
    ],
    "answer": {"value": "(D) 0, 8, 12, 14, 15, 7, 3, 1, 0", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "This is the same Johnson counter shifting the other way (1s entering at the least significant end). The key follows the standard drawing, which shifts right from the most significant stage."),
        opt("B", False, "Not a shift sequence: 3 → 5 (0011 → 0101) changes two bits, and it has 9 states."),
        opt("C", False, "Not a shift sequence: 2 → 4 (0010 → 0100) changes two bits; a Johnson counter changes exactly one bit per clock and must pass through 1111."),
        opt("D", True, "The simulated sequence with the first stage as MSB."),
    ],
    "shortcut": "A Johnson sequence changes one bit per clock and goes 0 → all 1s → 0; only A and D look like that, and D is the standard (shift-right, MSB first) orientation.",
    "pitfalls": [
        "Using the ring counter (8 → 4 → 2 → 1) instead of the twisted ring.",
        "Reading the stages in the opposite order, which turns D into A.",
    ],
    "verification": "seqlib.register_cycle(johnson_step, 0000) gives 0, 8, 12, 14, 15, 7, 3, 1; the shift-left variant gives option A's 0, 1, 3, 7, 15, 14, 12, 8.",
    "animation": table("4-bit Johnson from 0000", ["Q1Q2Q3Q4", "value"],
                       [["0000", "0"], ["1000", "8"], ["1100", "12"], ["1110", "14"], ["1111", "15"], ["0111", "7"], ["0011", "3"], ["0001", "1"], ["0000", "0"]],
                       reveal=1),
}

SOLUTIONS["cse-2018-cs-22"] = {
    "approach": "Concept tested: **the state graph of a shift register**. Two D flip-flops in series are a 2-bit shift register: from $Q_1Q_2$ the input leads to $(in)Q_1$. A self-loop needs the shifted state to equal the old one.",
    "concepts": ["Shift register", "State diagram", "Self-loop", "D flip-flop"],
    "given": "Two positive-edge D flip-flops in series: $D_1 = in$, $D_2 = Q_1$, output $Q_2$.",
    "steps": [
        {"title": "Next state", "body": "$Q_1^+Q_2^+ = (in)\\,Q_1$."},
        {"title": "All transitions", "body": "00 → 00 (in = 0), 10 (in = 1); 01 → 00, 10; 10 → 01, 11; 11 → 01 (in = 0), 11 (in = 1).", "scene": {"reveal": 4}},
        {"title": "Self-loops", "body": "$(in)Q_1 = Q_1Q_2$ needs $in = Q_1 = Q_2$: only 00 (with in = 0) and 11 (with in = 1)."},
    ],
    "answer": {"value": "2", "number": 2, "matchesKey": True},
    "shortcut": "A shift register stays put only when every bit equals its neighbour: all 0s or all 1s, so always 2 states, for any length.",
    "pitfalls": [
        "Counting 01 and 10 because they return to themselves after two clocks (01 → 10 → 01); that is a cycle, not a self-loop.",
        "Counting arcs or (state, input) pairs instead of states.",
    ],
    "verification": "The simulated state graph has self-loops exactly at 00 and 11; for shift registers of 1 to 5 stages the self-loop states are always just 0…0 and 1…1.",
    "animation": table("Next state Q1Q2", ["in = 0", "in = 1"], [["00 ✓", "10"], ["00", "10"], ["01", "11"], ["01", "11 ✓"]],
                       ["00", "01", "10", "11"], reveal=1),
}

SOLUTIONS["cse-2025-1-cs-50"] = {
    "approach": "Concept tested: **the cycles of a Johnson counter, counted once**. The wiring ($\\overline{Q_3} \\to D_0$, each $Q$ into the next $D$) is a 4-bit Johnson counter; from any start it returns after 8 clocks, so it passes through 8 distinct states counting the start (7 not counting it).",
    "concepts": ["Johnson counter", "State cycles", "Counting states"],
    "given": "Four D flip-flops on one clock: $Q_0 \\to D_1$, $Q_1 \\to D_2$, $Q_2 \\to D_3$, $\\overline{Q_3} \\to D_0$; initialised with some value. Number of distinct states before returning to the initial state.",
    "steps": [
        {"title": "Recognise the circuit", "body": "A shift register with the complement of the last stage fed back: a 4-bit Johnson counter."},
        {"title": "The main cycle", "body": "From 0000: 0000 → 1000 → 1100 → 1110 → 1111 → 0111 → 0011 → 0001 → 0000, 8 states ($2n$).", "scene": {"reveal": 8}},
        {"title": "The other start states", "body": "The Johnson step is a permutation, so the other 8 states form their own cycles; here exactly one: 0010 → 1001 → 0100 → 1010 → 1101 → 0110 → 1011 → 0101 → 0010, also 8. Every start returns after 8 clocks."},
        {"title": "Count once", "body": "Distinct states gone through including the initial one: 8; excluding it: 7. The official key accepts 7 to 8."},
    ],
    "answer": {"value": "8 (7 if the initial state is not counted); key 7 to 8", "number": 8, "matchesKey": True},
    "shortcut": "$n$-bit Johnson counter: $2n$ states; for $n = 4$ both cycles have 8, so 'some value' does not matter.",
    "pitfalls": [
        "Answering 4 (the ring-counter count) or 16 (all states).",
        "Assuming the unused states drain into the main cycle; they form a separate cycle (which, for n = 4, happens to have the same length).",
    ],
    "verification": "Simulating all 16 start states, each returns to itself after exactly 8 clocks (two disjoint 8-cycles).",
    "animation": table("Both cycles of the 4-bit Johnson counter", ["main", "other"],
                       [["0000", "0010"], ["1000", "1001"], ["1100", "0100"], ["1110", "1010"], ["1111", "1101"], ["0111", "0110"], ["0011", "1011"], ["0001", "0101"]],
                       reveal=1),
}
