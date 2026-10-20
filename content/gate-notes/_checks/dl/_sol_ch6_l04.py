"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 6, Lesson 4 (counter basics and
ripple counters): cse-1994-a-2-1, it-2005-cs-11, cse-2007-cs-36, cse-2010-cs-32, cse-2011-cs-15,
cse-2025-2-cs-24. Every key is re-derived by event simulation of the counter in l6_04_ripple.py;
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


SOLUTIONS["cse-1994-a-2-1"] = {
    "approach": "Concept tested: **the number of flip-flops of a mod-N counter**. A mod-N counter must be in N different states, and k flip-flops hold at most $2^k$ patterns, so k is the smallest integer with $2^k \\ge N$.",
    "concepts": ["Counter modulus", "Flip-flop count", "Binary state code"],
    "given": "A binary modulo-N counter (N distinct states, binary-coded).",
    "steps": [
        {"title": "A mod-N counter needs N distinct states", "body": "After $0, 1, \\dots, N - 1$ pulses the counter must be in $N$ different states; if two were equal it would repeat with a shorter period and would not be mod-N."},
        {"title": "k flip-flops give 2^k states", "body": "So we need $2^k \\ge N$, i.e. $k \\ge \\log_2 N$. Since $k$ is an integer, $k \\ge \\lceil \\log_2 N \\rceil$."},
        {"title": "That many are enough", "body": "With $k = \\lceil \\log_2 N \\rceil$ the patterns $0 \\dots N - 1$ exist, and a binary counter that returns to 0 after $N - 1$ (for example by clearing at $N$) realises the cycle."},
    ],
    "answer": {"value": "$\\lceil \\log_2 N \\rceil$", "matchesKey": True},
    "shortcut": "Find the powers of two around N: mod-10 lies between 8 and 16, so 4 flip-flops; mod-258 between 256 and 512, so 9.",
    "pitfalls": [
        "Rounding $\\log_2 N$ down or to the nearest integer (mod-10 would get 3).",
        "Using $\\lfloor \\log_2 N \\rfloor + 1$, which is one too many when N is a power of two.",
        "Answering N (that is a one-hot design, not the minimum).",
    ],
    "verification": "seqlib.ff_count agrees with the smallest k having $2^k \\ge N$ for every N from 2 to 1999.",
}

SOLUTIONS["it-2005-cs-11"] = {
    "approach": "Concept tested: **counting pulses with wrap-around**. An n-bit up counter adds 1 modulo $2^n$ per pulse, so from a to b it needs $(b - a) \\bmod 2^n$ pulses.",
    "concepts": ["Up counter", "Modular arithmetic", "Wrap-around"],
    "given": "An 8-bit up counter goes from 10101100 to 00100111 (rightmost bit = LSB).",
    "steps": [
        {"title": "Convert to decimal", "body": "$10101100_2 = 172$ and $00100111_2 = 39$."},
        {"title": "The target is smaller, so the counter wraps", "body": "It counts 172 → 255 (83 pulses), wraps to 0 (1 pulse) and counts 0 → 39 (39 pulses): $83 + 1 + 39 = 123$. In one line: $(39 - 172) \\bmod 256 = 256 - 172 + 39 = 123$.", "scene": {"reveal": 2}},
        {"title": "Check forward", "body": "$172 + 123 = 295 = 256 + 39$. ✓", "scene": {"reveal": 3}},
    ],
    "answer": {"value": "(D) 123", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "134 is an off-by-one on 133 (counting the start state as well)."),
        opt("B", False, "133 = 172 − 39 is the number of pulses a **down** counter would need; an up counter must go round through 255."),
        opt("C", False, "124 counts one pulse too many (both ends of the wrap)."),
        opt("D", True, "$(39 - 172) \\bmod 256 = 123$."),
    ],
    "shortcut": "Up and down distances between two states add up to $2^n$: if you computed 133 by subtraction, the up count is $256 - 133 = 123$.",
    "pitfalls": [
        "Subtracting the smaller from the larger number and ignoring the direction (133).",
        "Off-by-one errors around the wrap from 255 to 0.",
    ],
    "verification": "Stepping a simulated 8-bit counter from 172 reaches 39 for the first time after exactly 123 pulses.",
    "animation": table("Pulses from 172 to 39", ["from", "to", "pulses"], [[172, 255, 83], [255, 0, 1], [0, 39, 39], ["", "total", 123]],
                       ["count up", "wrap", "count up", ""], reveal=1),
}

SOLUTIONS["cse-2007-cs-36"] = {
    "approach": "Concept tested: **a mod-N counter made with an asynchronous clear**. Find the first count at which the AND gate fires; because Clear acts regardless of the clock, that state is wiped at once and is not part of the cycle.",
    "concepts": ["Asynchronous clear", "Mod-N counter", "Clear detect gate"],
    "given": "A 4-bit binary counter with outputs $A_4A_3A_2A_1$ ($A_1$ = LSB); Clear = 1 clears regardless of the clock; Load = 0 and Count = 1; Clear = $A_3 \\cdot A_1$; parallel inputs 0011; delays negligible; start at 0.",
    "steps": [
        {"title": "What the control inputs select", "body": "Load = 0, Count = 1: 'count next' at every rising edge. The inputs 0011 are never loaded."},
        {"title": "When the gate fires", "body": "$A_3$ has weight 4 and $A_1$ weight 1, so $A_3A_1 = 1$ first at $0101_2 = 5$ (the earlier counts 0 … 4 never have both bits).", "scene": {"reveal": 5}},
        {"title": "Asynchronous: 5 vanishes", "body": "The Clear row of the table has the clock as don't-care, so Clear acts immediately: the moment 5 appears the counter is reset to 0. State 5 lasts only for the clear delay (zero here).", "scene": {"reveal": 6}},
        {"title": "The cycle", "body": "0, 1, 2, 3, 4, 0, …: a mod-5 counter, exactly the 'AND the 1 bits of N' rule with $N = 5 = 0101$."},
    ],
    "answer": {"value": "(C) 0, 1, 2, 3, 4", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "0, 3, 4 assumes the inputs 0011 are loaded; that needs Load = 1, but Load is 0."),
        opt("B", False, "0, 3, 4, 5 loads 0011 as well and also keeps 5, which the clear removes."),
        opt("C", True, "Counting 0 … 4; at 5 the asynchronous clear resets the counter to 0 at once."),
        opt("D", False, "Keeping 5 in the cycle treats the clear as synchronous (acting at the next edge). With an asynchronous clear, 5 never lasts."),
    ],
    "shortcut": "Write the gate's inputs as a number: $A_3A_1$ → 0101 = 5. An asynchronous clear at N gives 0 … N − 1.",
    "pitfalls": [
        "Treating the clear as synchronous and keeping state 5 (option D).",
        "Taking $A_4$ as the LSB, which would make the gate detect a different number.",
        "Thinking the parallel inputs matter when Load = 0.",
    ],
    "verification": "An event simulation of the counter with Clear = $A_3A_1$ settles at 1, 2, 3, 4, 0, 1, … after successive edges; with a synchronous clear it would cycle 0 … 5.",
    "animation": table("Counting with Clear = A3·A1", ["A4A3A2A1", "A3·A1", "result"],
                       [["0000", 0, "count"], ["0001", 0, "count"], ["0010", 0, "count"], ["0011", 0, "count"], ["0100", 0, "count"], ["0101", 1, "cleared at once"], ["0000", 0, "count"]],
                       ["0", "1", "2", "3", "4", "5", "0"], reveal=1),
}

SOLUTIONS["cse-2010-cs-32"] = {
    "approach": "Concept tested: **the direction of a ripple counter from its wiring**. Positive-edge T flip-flops clocked by the previous $Q$ toggle when that $Q$ **rises**, which is the borrow of a down count. Step $Q_1Q_0$ pulse by pulse.",
    "concepts": ["Ripple counter", "T flip-flop", "Positive edge", "Down counter"],
    "given": "Two positive-edge-triggered T flip-flops with $T = 1$; FF0 is clocked by Clock (output $Q_0$), FF1 by $Q_0$ (output $Q_1$); initial $Q_1Q_0 = 00$.",
    "steps": [
        {"title": "Stage 0", "body": "$T = 1$: $Q_0$ toggles at every clock: 1, 0, 1, 0."},
        {"title": "Stage 1 toggles when Q0 rises", "body": "Pulse 1: $Q_0$ 0 → 1 is a rising edge for FF1, $Q_1$ → 1: **11**. Pulse 2: $Q_0$ falls, no edge: **10**. Pulse 3: $Q_0$ rises, $Q_1$ → 0: **01**. Pulse 4: **00**.", "scene": {"reveal": 4}},
        {"title": "Name it", "body": "3, 2, 1, 0: a down counter, as the rule table predicts for a positive edge with $Q$ (negative edge with $Q$ would count up)."},
    ],
    "answer": {"value": "(A) 11, 10, 01, 00", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Simulation: 11, 10, 01, 00."),
        opt("B", False, "10 after the first pulse has $Q_0 = 0$, but $Q_0$ must toggle to 1 at the first clock."),
        opt("C", False, "Starts with $Q_0 = 0$ after pulse 1, impossible for a T flip-flop with $T = 1$."),
        opt("D", False, "11, 10 is right, but 00 after pulse 3 has $Q_0 = 0$; $Q_0$ must be 1 after an odd number of pulses."),
    ],
    "shortcut": "$Q_0$ alone decides: it must read 1, 0, 1, 0, and only option A has that column.",
    "pitfalls": [
        "Applying the negative-edge rule 'Q into the next clock = up counter' to positive-edge flip-flops.",
        "Letting FF1 toggle on the falling edge of $Q_0$.",
    ],
    "verification": "seqlib.ripple_events with two positive-edge stages clocked by Q settles at 3, 2, 1, 0.",
    "animation": table("Q1Q0 pulse by pulse", ["Q0", "edge for FF1", "Q1Q0"],
                       [[0, "", "00"], [1, "rise: toggle", "11"], [0, "fall: none", "10"], [1, "rise: toggle", "01"], [0, "fall: none", "00"]],
                       ["start", "pulse 1", "pulse 2", "pulse 3", "pulse 4"], reveal=1),
}

SOLUTIONS["cse-2011-cs-15"] = {
    "approach": "Concept tested: **flip-flops for a mod-N counter**: the smallest k with $2^k \\ge N$, i.e. $\\lceil \\log_2 258 \\rceil$.",
    "concepts": ["Counter modulus", "Flip-flop count"],
    "given": "A mod-258 counter built with D flip-flops; minimum number of flip-flops.",
    "steps": [
        {"title": "Place 258 between powers of two", "body": "$2^8 = 256 < 258 \\le 512 = 2^9$."},
        {"title": "Round up", "body": "Eight flip-flops hold only 256 states, two short; nine hold 512. So $k = \\lceil \\log_2 258 \\rceil = 9$."},
        {"title": "The flip-flop type does not matter", "body": "D, T or JK changes the gates in front of the flip-flops, not how many states they can store."},
    ],
    "answer": {"value": "(A) 9", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "$\\lceil \\log_2 258 \\rceil = 9$."),
        opt("B", False, "8 flip-flops give only $2^8 = 256 < 258$ states (rounding $\\log_2 258 \\approx 8.01$ down)."),
        opt("C", False, "512 is the number of states nine flip-flops provide, not the number of flip-flops."),
        opt("D", False, "258 is a one-hot design (one flip-flop per state), not the minimum."),
    ],
    "shortcut": "256 is $2^8$; anything above it needs a ninth bit.",
    "pitfalls": ["Rounding the logarithm to the nearest integer.", "Confusing the number of states with the number of flip-flops."],
    "verification": "seqlib.ff_count(258) = 9; ff_count(256) = 8 and ff_count(257) = 9.",
}

SOLUTIONS["cse-2025-2-cs-24"] = {
    "approach": "Concept tested: **a ripple counter as a frequency divider**. Each toggling stage doubles the period, so the last stage of an n-bit ripple counter has period $2^n$ times the input clock period.",
    "concepts": ["Ripple counter", "Frequency division", "Clock period"],
    "given": "A 4-bit ripple counter; the waveform at the last flip-flop has period 64 µs. Find the counter's (input) frequency in kHz.",
    "steps": [
        {"title": "Period of the last stage", "body": "Stage $i$ has period $2^{i+1}T$; the last of 4 stages has period $2^4 T = 16T$."},
        {"title": "Solve for the clock period", "body": "$16T = 64\\ \\mu\\text{s}$, so $T = 4\\ \\mu\\text{s}$."},
        {"title": "Invert", "body": "$f = 1 / 4\\ \\mu\\text{s} = 0.25$ MHz $= 250$ kHz."},
    ],
    "answer": {"value": "250 kHz", "number": 250, "matchesKey": True},
    "shortcut": "Last-stage frequency $1/64\\ \\mu\\text{s} = 15.625$ kHz, times $2^4 = 16$: 250 kHz.",
    "pitfalls": [
        "Answering the last stage's own frequency, 15.625 kHz.",
        "Dividing by n = 4 instead of $2^n = 16$ (62.5 kHz).",
    ],
    "verification": "In an event simulation of 3-, 4- and 5-bit ripple counters, stage $i$'s rising edges are exactly $2^{i+1}$ clock periods apart, delays included.",
}
