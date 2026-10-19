"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 4, Lesson 3 (adder–subtractor, flags,
BCD adder, adder converters). Merged by _sol_ch4.py; both keys are re-derived by exhaustive simulation in
l4_03_addsub.py."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import arithlib as al  # noqa: E402
import comblib as cl  # noqa: E402
from _sol_ch1_fp import opt  # noqa: E402

SOLUTIONS = {}

ROWS = []
for b in range(16):
    v = cl.evaluate(al.adder_converter_1996(), {f"b{i}": b >> i & 1 for i in range(4)})
    if b >= 9:
        ROWS.append([str(b), f"{b:04b}", f"{v['d4']} {al.word(v, 'd', 4):04b}", f"{v['d4']}·12 + {al.word(v, 'd', 4)}"])

SOLUTIONS["cse-1996-a-46"] = {
    "approach": "Concept tested: **an adder used as a code converter**. The second operand is a constant (0100) switched on by a detector ($b_3b_2$, i.e. $b \\ge 12$); adding $16 - r$ when $b \\ge r$ splits $b$ into a base-$r$ carry digit and a units digit. Here $16 - 12 = 4$.",
    "concepts": ["Adder as converter", "Code conversion", "Radix"],
    "given": "4-bit adder: operand 1 = $b_3b_2b_1b_0$; operand 2 = $0,\\; b_3b_2,\\; 0,\\; 0$ (MSB → LSB); carry in 0; $d_4$ = carry out, $d_3 \\dots d_0$ = sum.",
    "steps": [
        {"title": "When is anything added?", "body": "Only when $b_3 = b_2 = 1$, i.e. $b \\ge 12$ (1100 … 1111). Then operand 2 is 0100 = 4; otherwise it is 0000."},
        {"title": "b = 0 … 11", "body": "Nothing is added: $d_4 = 0$ and $d_3 \\dots d_0 = b$, so the output is the single digit $b$ (0 … 11)."},
        {"title": "b = 12 … 15", "body": "$b + 4 = 16 + (b - 12)$: $d_4 = 1$ and $d_3 \\dots d_0 = b - 12 = 0 \\dots 3$. E.g. $13 \\to 1\\,0001$: one twelve and one unit."},
        {"title": "Name it", "body": "$d_4$ is the twelves digit and $d_3 \\dots d_0$ the units digit in base 12, with every units value 0 … 11: **binary to radix-12** conversion."},
    ],
    "answer": {"value": "D: binary to radix-12 conversion", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Binary to hex is the identity on 4 bits (one hex digit); this circuit changes 12 … 15."),
        opt("B", False, "Binary to BCD would correct from 10 upward by adding 6 (operand 0110, detector $b_3(b_2 + b_1)$); here 10 and 11 pass unchanged."),
        opt("C", False, "Gray code is $b \\oplus (b \\gg 1)$, made of XORs, not an addition; it never needs a fifth bit."),
        opt("D", True, "For $b \\ge 12$ it outputs carry 1 and $b - 12$; otherwise $b$: two base-12 digits."),
    ],
    "shortcut": "Constant added $= 16 - r$ when the detector says $b \\ge r$: 4 ⇒ $r = 12$.",
    "pitfalls": [
        "Choosing BCD because the circuit looks like the BCD adder's correction stage: BCD adds 6 from 10 up, not 4 from 12 up.",
        "Reading the operand as 0100 always: it is gated by $b_3b_2$.",
    ],
    "verification": "l4_03_addsub.py simulates the circuit for all 16 inputs: outputs 0 … 11 unchanged, 12 … 15 → 1 0000 … 1 0011, i.e. $12d_4 + d_3d_2d_1d_0 = b$ with units < 12.",
    "animation": {"kind": "table", "title": "Inputs 9 … 15 and the outputs d4 d3d2d1d0", "cols": ["b", "b3b2b1b0", "d4 d3…d0", "base 12"], "rows": ROWS, "mono": True},
}

OPS = []
for K in (0, 1):
    for C0 in (0, 1):
        OPS.append([str(K), str(C0), ["A + B", "A + B + 1", "A − B − 1", "A − B"][2 * K + C0]])

SOLUTIONS["cse-2003-cs-46"] = {
    "approach": "Concept tested: **the operations an XOR-controlled adder can perform**. $K$ selects $B$ or $\\bar B$ through the XORs and $C_0$ adds 0 or 1; that gives exactly four formulas in $A$ and $B$. An operation is available only if one of them equals it for every $B$.",
    "concepts": ["Adder–subtractor", "Two's complement", "Control lines"],
    "given": "Each full adder receives $A_i$ and $B_i \\oplus K$; the least significant carry in is $C_0$; operands are 2's complement.",
    "steps": [
        {"title": "The four settings", "body": "$(K, C_0) = (0, 0)$: $A + B$. $(0, 1)$: $A + B + 1$. $(1, 0)$: $A + \\bar B = A - B - 1$. $(1, 1)$: $A + \\bar B + 1 = A - B$."},
        {"title": "A + B and A − B", "body": "Both appear: settings (0, 0) and (1, 1)."},
        {"title": "A + 1", "body": "Every setting still adds $B$ or $\\bar B$. $A + 1$ would need the second operand to be 0 regardless of $B$, which $K$ and $C_0$ cannot do; $(0, 1)$ gives $A + B + 1$, equal to $A + 1$ only when $B$ happens to be 0."},
    ],
    "answer": {"value": "A: A + B and A − B, but not A + 1", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "$(0,0)$ adds, $(1,1)$ subtracts, and no setting removes $B$ from the sum."),
        opt("B", False, "A − B is available ($K = C_0 = 1$), and A + 1 is not."),
        opt("C", False, "A − B is available with $K = 1$, $C_0 = 1$."),
        opt("D", False, "A + 1 needs $B = 0$; $B$ is an operand, not a control line."),
    ],
    "shortcut": "$K$, $C_0$ give $A \\pm B$ variants only; anything without $B$ (like $A + 1$) needs control of $B$ itself.",
    "pitfalls": [
        "Setting $C_0 = 1$ and calling it $A + 1$ (it is $A + B + 1$).",
        "Thinking subtraction needs a separate circuit: the XORs and $C_0 = 1$ are exactly the two's-complement rule.",
    ],
    "verification": "l4_03_addsub.py simulates the 4-bit ALU for every $A$, $B$ and every $(K, C_0)$: (0,0) equals $A + B$, (1,1) equals $A - B$ (mod 16), and no setting equals $A + 1$ for all $B$.",
    "animation": {"kind": "table", "title": "What K and C0 select", "cols": ["K", "C0", "output"], "rows": OPS, "mono": True},
}
