"""Teacher-style v2 solutions for the number-arithmetic PYQs of Chapter 1 lessons 9 and 10
(moved from Chapter 5's adder/overflow and multiplier lessons).

`python3 content/gate-notes/_checks/dl/_sol_ch1_arith.py` writes each solution into
src/gate/solutions/<paper>.json; pyq_ch1.py and scripts/gate/validate-solutions.mjs check them.
Every number is re-derived in l09_code_arithmetic.py / l10_multiplication_booth.py.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _sol_ch1_fp import ROOT, opt, bits_anim, row  # noqa: E402

SOLUTIONS = {}

# ── Lesson 9 ────────────────────────────────────────────────────────────────

SOLUTIONS["it-2006-cs-7"] = {
    "approach": "Concept tested: **2's-complement addition and overflow**. Add the patterns as unsigned numbers, drop the carry out, and remember that operands of opposite signs can never overflow.",
    "concepts": ["2's-complement addition", "Overflow rule"],
    "steps": [
        {"title": "Decode", "body": "$1101 = -3$ and $0100 = +4$ in 4-bit 2's complement."},
        {"title": "Add", "body": "$1101 + 0100 = 1\\,0001$; drop the carry out of 4 bits: $0001 = +1 = -3 + 4$."},
        {"title": "Overflow?", "body": "The operands have opposite signs, so the sum lies between them and cannot overflow. (Carries: into the sign column 1, out of it 1: equal.) Answer (C)."},
    ],
    "answer": {"value": "$0001$ and no overflow — option (C)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "The carry out of the top bit is dropped in 2's complement; it is not an overflow."),
        opt("B", False, "$1001$ would come from ignoring the carry into bit 3; the sum bits are $0001$."),
        opt("C", True, "$-3 + 4 = 1$, in range."),
        opt("D", False, "Wrong sum and a carry mistaken for overflow."),
    ],
    "shortcut": "Opposite signs ⇒ never overflow; $-3 + 4 = 1 = 0001$.",
    "pitfalls": ["Treating the carry out as overflow.", "Keeping the carry as a fifth bit."],
    "verification": "$0001 - 0100 = 1101$ in 4 bits, i.e. $1 - 4 = -3$. ✓",
}

SOLUTIONS["cse-2022-cs-8"] = {
    "approach": "Concept tested: **overflow in 2's-complement addition**. Decode each pair; only two operands of the same sign can overflow, when their sum leaves $-8 \\dots 7$.",
    "concepts": ["2's-complement range", "Overflow rule"],
    "steps": [
        {"title": "Decode every pair", "body": "- (A) $1011 + 1110 = -5 + (-2) = -7$.\n- (B) $1100 + 1010 = -4 + (-6) = -10$.\n- (C) $0011 + 0100 = 3 + 4 = 7$.\n- (D) $1001 + 1111 = -7 + (-1) = -8$."},
        {"title": "Compare with the range", "body": "4-bit 2's complement holds $-8 \\dots 7$. Only (B), $-10$, is outside."},
        {"title": "Confirm with the bits", "body": "$1100 + 1010 = 1\\,0110$: two negative operands give $0110 = +6$, a positive-looking result: overflow. Answer (B)."},
    ],
    "answer": {"value": "(B) R1 = 1100, R2 = 1010", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$-7$ fits; the carry out is dropped harmlessly."),
        opt("B", True, "$-10 < -8$: overflow (result $0110$ looks positive)."),
        opt("C", False, "$7$ is exactly the largest value, so it fits."),
        opt("D", False, "$-8$ is exactly the smallest value, so it fits."),
    ],
    "shortcut": "Overflow ⇔ same-sign operands and a sum outside $[-8, 7]$; check only (A), (B), (D) (both negative).",
    "pitfalls": ["Calling every carry out an overflow (A and D carry but are correct).", "Thinking $-8$ or $+7$ overflow."],
    "verification": "Carry rule for (B): into the sign column 0, out of it 1: they differ. ✓",
}

SOLUTIONS["it-2004-it-42"] = {
    "approach": "Concept tested: **overflow in 4-bit 2's complement**. Decode each sum and compare it with the range $-8 \\dots 7$.",
    "concepts": ["2's-complement range", "Overflow rule"],
    "steps": [
        {"title": "Sum 1", "body": "$1100 + 1100 = -4 + (-4) = -8$: in range (pattern $1000$)."},
        {"title": "Sum 2", "body": "$0011 + 0111 = 3 + 7 = 10 > 7$: overflow ($1010$ looks negative)."},
        {"title": "Sum 3", "body": "$1111 + 0111 = -1 + 7 = 6$: opposite signs, no overflow. Only sum 2 overflows: option (B)."},
    ],
    "answer": {"value": "2 only — option (B)", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$-8$ is representable; the carry out of $1100 + 1100$ is not overflow."),
        opt("B", True, "Only $3 + 7 = 10$ leaves the range."),
        opt("C", False, "Opposite signs never overflow in addition."),
        opt("D", False, "Both 1 and 3 merely produce a carry out."),
    ],
    "shortcut": "Same-sign pairs only: (1) $-8$ fits, (2) $10$ does not.",
    "pitfalls": ["Equating carry out with overflow.", "Forgetting that $-8$ is in the 4-bit range."],
    "verification": "Carry rule: sum 2 has carry into bit 3 = 1, out = 0 (differ); sums 1 and 3 have equal carries. ✓",
}

SOLUTIONS["cse-2002-a-21"] = {
    "approach": "Concept tested: **the overflow condition** for 2's-complement addition. Overflow needs same-sign operands; equivalently the carry into the sign bit differs from the carry out of it.",
    "concepts": ["Overflow rule", "Carry vs overflow"],
    "steps": [
        {"title": "Opposite signs", "body": "If one operand is positive and the other negative, the sum lies between them, hence inside the range: no overflow is possible. That is statement (B)."},
        {"title": "Check the other statements", "body": "(A) A carry from the sign bit happens in many correct sums, e.g. $-1 + 1 = 0$ ($1111 + 0001 = 1\\,0000$). (C) Overflow is flagged when the two carries **differ**, not when they match."},
        {"title": "Conclusion", "body": "(B) is true, so (D) 'none of the above' is false. Answer (B)."},
    ],
    "answer": {"value": "(B) overflow cannot occur when a positive value is added to a negative value", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "A carry out of the sign bit is not overflow: $1111 + 0001 = 1\\,0000$ is the correct $0$."),
        opt("B", True, "The sum of opposite-sign values lies between them, so it always fits."),
        opt("C", False, "Overflow is flagged when the carry into and out of the sign bit **differ**."),
        opt("D", False, "(B) is a correct statement."),
    ],
    "shortcut": "Remember V = $c_{n-1} \\oplus c_n$; anything else in the options is a distractor.",
    "pitfalls": ["Some old keys say (D); (B) is the factually correct statement (see the question's review note)."],
    "verification": "Brute force over all 4-bit pairs: no opposite-sign pair overflows. ✓",
}

SOLUTIONS["cse-1992-b-4-a"] = {
    "approach": "Concept tested: **the overflow condition**. Overflow is about the signed range, not about the carry out: it happens exactly when the carry into the sign bit differs from the carry out of it, i.e. when two same-sign operands give a result of the other sign.",
    "concepts": ["Overflow rule", "Carry into vs out of the MSB"],
    "steps": [
        {"title": "Why a carry is not enough", "body": "In 2's complement the carry out of the MSB is discarded: $-1 + 1 = 1111 + 0001 = 1\\,0000$ gives the correct 0 with a carry. So 'carry out' cannot mean overflow."},
        {"title": "The condition", "body": "Overflow $\\iff c_{n-1} \\oplus c_n = 1$ (carry into the sign column ≠ carry out of it) $\\iff$ both operands have the same sign and the result's sign differs."},
        {"title": "Why it holds", "body": "Both non-negative: $c_n = 0$, and overflow means the sign bit became 1, which needs $c_{n-1} = 1$. Both negative: $c_n = 1$, and overflow means the sign bit became 0, which needs $c_{n-1} = 0$. Mixed signs never overflow and always have $c_{n-1} = c_n$."},
    ],
    "answer": {"value": "Overflow iff the carry into the MSB differs from the carry out of the MSB (equivalently, both operands have the same sign and the result's sign differs)", "matchesKey": True},
    "shortcut": "$V = c_{n-1} \\oplus c_n$.",
    "pitfalls": ["Writing 'overflow when there is a carry out of the MSB'.", "Forgetting that opposite signs never overflow."],
    "verification": "$0101 + 0100 = 1001$: carries in/out of the MSB are 1/0, and $5 + 4 = 9$ does overflow. ✓",
}

SOLUTIONS["cse-2017-1-cs-9"] = {
    "approach": "Concept tested: **the overflow condition in terms of signs**. Overflow happens when both operands have the same sign and the sum's sign is different: $A_7 B_7 \\overline{S_7} + \\overline{A_7}\\,\\overline{B_7} S_7$.",
    "concepts": ["Overflow rule", "Sign bits"],
    "steps": [
        {"title": "Two negative operands", "body": "$A_7 = B_7 = 1$ and a non-negative-looking result $S_7 = 0$: the term $A_7 B_7 \\overline{S_7}$."},
        {"title": "Two non-negative operands", "body": "$A_7 = B_7 = 0$ and a negative-looking result $S_7 = 1$: the term $\\overline{A_7}\\,\\overline{B_7} S_7$."},
        {"title": "Answer", "body": "The OR of the two terms is option (C). The ripple-carry adder only computes the bits; the condition is about the numbers."},
    ],
    "answer": {"value": "(C) $A_7 B_7 \\overline{S_7} + \\overline{A_7}\\,\\overline{B_7} S_7$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "A carry out of the top bit alone is not overflow ($-1 + 1$ carries but is correct)."),
        opt("B", False, "All carries being 1 is neither necessary nor sufficient (e.g. $-1 + (-1)$ is correct)."),
        opt("C", True, "Same-sign operands with a different-sign result."),
        opt("D", False, "Bit 0 says nothing about the sign; this is the same formula on the wrong bits."),
    ],
    "shortcut": "Overflow formulas always involve the **sign bits** (bit 7 here); that eliminates (D) and (B).",
    "pitfalls": ["Choosing the carry-out option (A)."],
    "verification": "Brute force over all 8-bit pairs: (C) is 1 exactly when the true sum is outside $-128 \\dots 127$. ✓",
}

SOLUTIONS["cse-2006-cs-39"] = {
    "approach": "Concept tested: **detecting overflow from the operands' and the result's sign bits**. Here $c_{n-1}$ is the top **sum** bit, so overflow is $a_{n-1} b_{n-1} \\overline{c_{n-1}} + \\overline{a_{n-1}}\\,\\overline{b_{n-1}} c_{n-1}$.",
    "concepts": ["Overflow rule", "Reading the question's notation"],
    "steps": [
        {"title": "Notation", "body": "The sum bits are $c_{n-1} \\ldots c_0$ and the carry out is $c_{out}$. So $c_{n-1}$ is the result's sign bit, not a carry."},
        {"title": "Overflow condition", "body": "Same-sign operands, different-sign result: $a_{n-1} b_{n-1} \\overline{c_{n-1}}$ (both negative, result non-negative) or $\\overline{a_{n-1}}\\,\\overline{b_{n-1}} c_{n-1}$ (both non-negative, result negative). That is option (B)."},
        {"title": "Why the carry formulas fail here", "body": "The textbook $c_{in} \\oplus c_{out}$ uses the carry **into** the sign column, which this notation does not name; $c_{out} \\oplus c_{n-1}$ mixes the carry out with a sum bit."},
    ],
    "answer": {"value": "(B) $a_{n-1}b_{n-1}\\overline{c_{n-1}} + \\overline{a_{n-1}}\\,\\overline{b_{n-1}}\\,c_{n-1}$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Carry out with equal sign bits fires for $-1 + (-1)$ (correct result $-2$)."),
        opt("B", True, "Same-sign operands, other-sign result."),
        opt("C", False, "$c_{n-1}$ here is a sum bit, so $c_{out} \\oplus c_{n-1}$ is not the carry test: $-1 + 1 = 1111 + 0001 = 1\\,0000$ gives $c_{out} = 1$ and sum bit 0, so it flags a correct sum."),
        opt("D", False, "$a \\oplus b \\oplus c_{n-1}$ is the carry into the sign column (sum bit = $a \\oplus b \\oplus$ carry-in), not an overflow test."),
    ],
    "shortcut": "Look for the formula built only from the three sign bits with 'same, same, different'.",
    "pitfalls": ["Reading $c_{n-1}$ as a carry and picking (C)."],
    "verification": "Brute force over all 4-bit pairs: (B) matches the range test exactly; (C) disagrees on some pairs. ✓",
}

SOLUTIONS["it-2008-it-15"] = {
    "approach": "Concept tested: **carry, overflow and sign flags**. Add as unsigned for C, check the signed range (or same-sign rule) for V, and read the result's top bit for S.",
    "concepts": ["Flags C, V, S", "Carry vs overflow"],
    "steps": [
        {"title": "Add", "body": "$01001101 + 11101001$: as unsigned $77 + 233 = 310 = 256 + 54$, so the result is $00110110$ and $C = 1$."},
        {"title": "Overflow", "body": "Signed: $77 + (-23) = 54$, in range; the operands have opposite signs, so $V = 0$."},
        {"title": "Sign", "body": "The result's top bit is 0: $S = 0$. Flags $1, 0, 0$: option (B)."},
    ],
    "answer": {"value": "C = 1, V = 0, S = 0 — option (B)", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Overflow is impossible with opposite-sign operands."),
        opt("B", True, "Carry out yes, overflow no, result positive."),
        opt("C", False, "There is a carry out ($310 > 255$) and no overflow."),
        opt("D", False, "The result $00110110$ has sign bit 0."),
    ],
    "shortcut": "Opposite signs ⇒ V = 0 immediately; $4D + E9 = 136_{16}$ ⇒ C = 1 and the result $36_{16}$ is positive.",
    "pitfalls": ["Setting V whenever C is set."],
    "verification": "$0x4D + 0xE9 = 0x136$: low byte $0x36 = 54 = 77 - 23$. ✓",
}

SOLUTIONS["cse-2024-1-cs-3"] = {
    "approach": "Concept tested: **overflow in subtraction**. Decode $A = 10$ and $B = -6$ in 5 bits (range $-16 \\dots 15$) and evaluate each operation; subtraction overflows when the operands have opposite signs and the true result leaves the range.",
    "concepts": ["5-bit 2's-complement range", "Overflow in addition and subtraction"],
    "steps": [
        {"title": "Decode", "body": "$A = 01010 = 10$, $B = 11010 = -16 + 10 = -6$. Range: $-16 \\dots 15$."},
        {"title": "Evaluate", "body": "- (A) $A + B = 4$.\n- (B) $A - B = 16 > 15$: overflow.\n- (C) $B - A = -16$: just fits.\n- (D) $2B = -12$: fits."},
        {"title": "Answer", "body": "Only (B) leaves the range."},
    ],
    "answer": {"value": "(B) $A - B = 16$ overflows", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Opposite signs in an addition never overflow: $4$."),
        opt("B", True, "$10 - (-6) = 16$, one more than the largest 5-bit value 15."),
        opt("C", False, "$-6 - 10 = -16$, exactly the smallest 5-bit value."),
        opt("D", False, "$-12$ fits ($11010 \\ll 1 = 10100$, top two bits equal)."),
    ],
    "shortcut": "Subtraction can overflow only for opposite signs: (B) and (C); $16 > 15$ but $-16 \\ge -16$.",
    "pitfalls": ["Thinking $-16$ is out of range in 5 bits.", "Forgetting that subtracting a negative number adds."],
    "verification": "$A - B = A + (-B) = 01010 + 00110 = 10000$: positive operands, negative-looking result: overflow. ✓",
    "_keep_animation": True,
}

SOLUTIONS["cse-2026-2-cs-18"] = {
    "approach": "Concept tested: **overflow of sums and differences** in 4-bit 2's complement. Decode the four numbers and check each true result against $-8 \\dots 7$.",
    "concepts": ["4-bit 2's-complement range", "Overflow in addition and subtraction"],
    "steps": [
        {"title": "Decode", "body": "$N_1 = 1011 = -5$, $N_2 = 1101 = -3$, $N_3 = 1010 = -6$, $N_4 = 1001 = -7$."},
        {"title": "Evaluate", "body": "- (A) $N_1 + N_2 = -8$: fits.\n- (B) $N_2 + N_3 = -9$: overflow.\n- (C) $N_3 - N_4 = -6 + 7 = 1$: fits.\n- (D) $N_1 + N_4 = -12$: overflow."},
        {"title": "Answer", "body": "(B) and (D)."},
    ],
    "answer": {"value": "(B) and (D)", "choice": ["B", "D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$-8$ is the smallest 4-bit value, so it fits."),
        opt("B", True, "$-9 < -8$."),
        opt("C", False, "Same-sign operands in a subtraction never overflow: $1$."),
        opt("D", True, "$-12 < -8$."),
    ],
    "shortcut": "All four are negative: sums can overflow (if below $-8$), the difference cannot.",
    "pitfalls": ["Treating $-8$ as overflow.", "Thinking a subtraction of two negatives can overflow."],
    "verification": "Bits: $1101 + 1010 = 1\\,0111$ (looks $+7$) and $1011 + 1001 = 1\\,0100$ (looks $+4$): negative operands, positive results. ✓",
    "_keep_animation": True,
}

SOLUTIONS["cse-2019-cs-8"] = {
    "approach": "Concept tested: **sign-magnitude range and overflow**. With $n$ bits the magnitudes go up to $2^{n-1} - 1$; $X - Y$ with opposite signs adds the magnitudes, reaching $2^n - 2$, which needs $n$ magnitude bits plus a sign: $n + 1$ bits.",
    "concepts": ["Sign-magnitude range", "Overflow in sign-magnitude"],
    "steps": [
        {"title": "Range of X and Y", "body": "$n$-bit sign-magnitude: $-(2^{n-1} - 1) \\dots 2^{n-1} - 1$."},
        {"title": "Worst case of X − Y", "body": "$X = 2^{n-1} - 1$, $Y = -(2^{n-1} - 1)$: $X - Y = 2^n - 2$ (and symmetrically $-(2^n - 2)$)."},
        {"title": "Bits needed", "body": "Magnitude $2^n - 2 < 2^n$ needs $n$ bits, plus 1 sign bit: $n + 1$ bits. Option (C)."},
    ],
    "answer": {"value": "$n + 1$ bits — option (C)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$n$ bits hold magnitudes up to $2^{n-1} - 1$, but $X - Y$ can reach $2^n - 2$."),
        opt("B", False, "Fewer bits than the operands cannot hold even $X - 0$."),
        opt("C", True, "One extra bit absorbs the doubled magnitude."),
        opt("D", False, "Two extra bits are more than the minimum."),
    ],
    "shortcut": "Adding or subtracting two $n$-bit numbers never needs more than one extra bit.",
    "pitfalls": ["Thinking subtraction can only shrink the result (opposite signs make it grow)."],
    "verification": "$n = 4$: $7 - (-7) = 14$ needs magnitude 1110 (4 bits) + sign = 5 bits. ✓",
}

SOLUTIONS["cse-2026-1-cs-12"] = {
    "approach": "Concept tested: **overflow in sign-magnitude**. Decode $X = -52$ and $Y = +76$; 8-bit sign-magnitude holds $-127 \\dots 127$. Operations that add the magnitudes ($52 + 76 = 128$) overflow.",
    "concepts": ["Sign-magnitude decoding", "Sign-magnitude range"],
    "steps": [
        {"title": "Decode", "body": "$X = 1\\,0110100 = -52$, $Y = 0\\,1001100 = +76$."},
        {"title": "Evaluate", "body": "- (A) $X + Y = 24$.\n- (B) $X - Y = -128$.\n- (C) $-X + Y = 128$.\n- (D) $-X - Y = -24$."},
        {"title": "Range", "body": "8-bit sign-magnitude reaches only $\\pm 127$, so $\\pm 128$ overflow: (B) and (C)."},
    ],
    "answer": {"value": "(B) and (C)", "choice": ["B", "C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Opposite signs: the magnitudes are subtracted, $24$."),
        opt("B", True, "$-52 - 76 = -128$; sign-magnitude has no $-128$."),
        opt("C", True, "$52 + 76 = 128 > 127$."),
        opt("D", False, "$-24$ fits."),
    ],
    "shortcut": "Overflow needs the magnitudes to be added: (B) and (C) both give $|52| + |76| = 128$.",
    "pitfalls": ["Using the 2's-complement range $-128 \\dots 127$ and accepting $-128$."],
    "verification": "$128$ needs 8 magnitude bits ($10000000$), but sign-magnitude leaves only 7. ✓",
    "_keep_animation": True,
}

SOLUTIONS["cse-1995-a-51"] = {
    "approach": "Concept tested: **unsigned byte arithmetic**: wrap-around on overflow and underflow. $A = 5C_{16} = 92$, $B = 92_{16} = 146$; each result is taken mod 256 for a byte (mod 65536 for the 2-byte integer).",
    "concepts": ["Unsigned addition and borrow", "Modular (wrap-around) results", "Binary multiplication"],
    "steps": [
        {"title": "X := A + B", "body": "$92 + 146 = 238 = EE_{16}$, which fits in a byte: $X = EEH$, no error."},
        {"title": "Y := abs(A − B)", "body": "$|92 - 146| = 54 = 36_{16}$: $Y = 36H$."},
        {"title": "W := A − B", "body": "$92 - 146 = -54$ cannot be stored in an unsigned byte (a borrow out of bit 7): the byte holds $256 - 54 = 202 = CA_{16}$, and the error condition is an **underflow** (negative result)."},
        {"title": "Z := A × B", "body": "$92 \\times 146 = 13432 = 3478_{16}$, which fits in two bytes: $Z = 3478H$."},
    ],
    "answer": {"value": "X = EEH, Y = 36H, W = CAH (A − B is negative: underflow for an unsigned byte), Z = 3478H", "matchesKey": True},
    "shortcut": "Hex directly: $5C + 92 = EE$; $92 - 5C = 36$; $5C - 92 = -36 \\equiv CA \\pmod{100_{16}}$.",
    "pitfalls": ["Reporting $W = -54$ (an unsigned byte cannot hold it).", "Missing that $X$ does **not** overflow ($238 \\le 255$)."],
    "verification": "$CA + 36 = 100_{16}$, so $CA$ is $-36_{16}$ mod 256. ✓",
}


# ── Lesson 10 ───────────────────────────────────────────────────────────────

SOLUTIONS["cse-1991-a-1-v"] = {
    "approach": "Concept tested: **product bits as Boolean functions**. Write the partial products in columns; column 1 contains only $a_1b_0$ and $a_0b_1$ and receives no carry (column 0 has a single term), so its bit is their sum mod 2.",
    "concepts": ["Partial products", "Column sums mod 2", "AND as 1-bit multiplication"],
    "steps": [
        {"title": "Partial-product columns", "body": "Column 0: $a_0b_0$. Column 1: $a_1b_0$ and $a_0b_1$. Column 2: $a_2b_0$, $a_1b_1$, $a_0b_2$ plus the carry from column 1."},
        {"title": "Carry into column 1", "body": "Column 0 has one term, so it never carries: $c_0 = a_0 b_0$."},
        {"title": "Column 1", "body": "$c_1 = (a_1 b_0 + a_0 b_1) \\bmod 2 = a_1 b_0 \\oplus a_0 b_1$; the carry $a_1b_0 \\cdot a_0b_1$ goes to column 2."},
    ],
    "answer": {"value": "$c_1 = a_1b_0 \\oplus a_0b_1$", "matchesKey": True},
    "shortcut": "Bit $k$ of a product = XOR of the column-$k$ terms XOR the carries into column $k$; columns 0 and 1 have no incoming carry.",
    "pitfalls": ["Writing $a_1b_0 + a_0b_1$ (OR): two 1s give bit 0 with a carry.", "Including a carry from column 0, which cannot exist."],
    "verification": "$A = 0011$, $B = 0011$: $3 \\times 3 = 9 = 1001$, so $c_1 = 0$; formula $1\\cdot1 \\oplus 1\\cdot1 = 0$. ✓",
}

SOLUTIONS["cse-1996-a-23"] = {
    "approach": "Concept tested: **Booth's operation count**. Booth adds or subtracts once for every bit change of the multiplier (reading from an appended 0), so alternating bits are the worst case and runs are the best.",
    "concepts": ["Booth recoding", "Operation count = bit changes", "Best and worst multipliers"],
    "steps": [
        {"title": "Count rule", "body": "With $q_{-1} = 0$, Booth does an addition/subtraction at every $i$ with $q_i \\ne q_{i-1}$."},
        {"title": "Apply to the options (12 bits for the dots)", "body": "- (A) $1010\\ldots10$: every pair above the lowest changes: $n - 1 = 11$.\n- (B) $100\\ldots001$: changes at bit 0, bit 1 and the top: 3.\n- (C) $111\\ldots1$: one change at bit 0: 1.\n- (D) $0111\\ldots10$: two changes: 2."},
        {"title": "Answer", "body": "(A), the alternating pattern, needs the most operations: option (A)."},
    ],
    "answer": {"value": "$1010\\ldots1010$ — option (A)", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Alternating bits change at almost every position: about $n$ operations."),
        opt("B", False, "Only 3 changes: a single 1 at each end."),
        opt("C", False, "All 1s: one subtraction at bit 0, the best case for a negative multiplier."),
        opt("D", False, "One run of 1s: one subtraction and one addition."),
    ],
    "shortcut": "Booth loves runs and hates alternation.",
    "pitfalls": ["Picking the pattern with the most 1s (C): Booth's cost depends on transitions, not on 1s."],
    "verification": "Brute force over all 12-bit multipliers: the maximum, 12, is $0101\\ldots01$; $1010\\ldots10$ gives 11, the most among the options. ✓",
}

SOLUTIONS["cse-1999-a-20"] = {
    "approach": "Concept tested: **Booth recoding of a negative number**. Write $-57$ in 8-bit 2's complement, append $q_{-1} = 0$, and recode each pair $(q_i, q_{i-1})$: $10 \\to -1$, $01 \\to +1$, else 0.",
    "concepts": ["2's complement", "Booth recoding", "Value check"],
    "steps": [
        {"title": "−57 in 8 bits", "body": "$256 - 57 = 199 = 1100\\,0111$."},
        {"title": "Pairs from the right", "body": "$(q_0, q_{-1}) = (1,0) \\to -1$; $(1,1), (1,1) \\to 0$; $(0,1) \\to +1$; $(0,0), (0,0) \\to 0$; $(1,0) \\to -1$; $(1,1) \\to 0$."},
        {"title": "Digits MSB first", "body": "$0\\ {-1}\\ 0\\ 0\\ {+1}\\ 0\\ 0\\ {-1}$. Check: $-64 + 8 - 1 = -57$. Option (B)."},
    ],
    "answer": {"value": "$0\\ {-1}\\ 0\\ 0\\ {+1}\\ 0\\ 0\\ {-1}$ — option (B)", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "The lowest digit is missing ($q_{-1} = 0$ forgotten): value $-56$."),
        opt("B", True, "$-64 + 8 - 1 = -57$."),
        opt("C", False, "Value $-64 + 32 - 4 + 1 = -35$: wrong pairs."),
        opt("D", False, "Value $-32 + 8 - 1 = -25$: the digits are shifted one place."),
    ],
    "shortcut": "Check each option's value by place weights; only one gives $-57$.",
    "pitfalls": ["Reading the pair the other way (gives $+57$).", "Recoding $+57 = 0011\\,1001$ and negating the digits by hand, then mis-aligning."],
    "verification": "Brute force recoding of every 8-bit value reproduces each recoding's value; (B) is the only option equal to $-57$. ✓",
}

SOLUTIONS["it-2005-cs-8"] = {
    "approach": "Concept tested: **Booth recoding** of the multiplier $-57$: 8-bit pattern $1100\\,0111$, appended 0, digit $= q_{i-1} - q_i$.",
    "concepts": ["Booth recoding", "2's complement of −57"],
    "steps": [
        {"title": "Pattern", "body": "$-57 = 1100\\,0111$ (8-bit 2's complement)."},
        {"title": "Recode", "body": "Pairs from the right $(1,0), (1,1), (1,1), (0,1), (0,0), (0,0), (1,0), (1,1)$ give $-1, 0, 0, +1, 0, 0, -1, 0$."},
        {"title": "Answer", "body": "MSB first: $0\\ {-1}\\ 0\\ 0\\ 1\\ 0\\ 0\\ {-1}$: option (A). Value $-64 + 8 - 1 = -57$."},
    ],
    "answer": {"value": "$0\\ {-1}\\ 0\\ 0\\ 1\\ 0\\ 0\\ {-1}$ — option (A)", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "$-64 + 8 - 1 = -57$."),
        opt("B", False, "That is the plain 2's-complement pattern $1100\\,0111$, not a recoding."),
        opt("C", False, "The lowest digit is lost (no appended 0): $-56$."),
        opt("D", False, "Every sign flipped (pair read the wrong way): $+57$."),
    ],
    "shortcut": "A negative multiplier's leading run of 1s ends in a single $-1$ at the top of the run.",
    "pitfalls": ["Forgetting the appended 0.", "Reading the pair as current − right."],
    "verification": "Sum of the recoded digits times powers of two is $-57$. ✓",
}

SOLUTIONS["cse-2004-cs-66"] = {
    "approach": "Concept tested: **signed (2's-complement) multiplication**. Decode $A = -6$ and $B = 10$; the product $-60$ fits in 8 bits, so the answer is the 8-bit pattern of $-60$.",
    "concepts": ["2's-complement decoding", "Signed shift-and-add"],
    "steps": [
        {"title": "Decode", "body": "$A = 1111\\,1010 = -6$, $B = 0000\\,1010 = 10$."},
        {"title": "Multiply with sign-extended partial products", "body": "$B$ has 1s at bits 1 and 3: $A \\cdot 2 + A \\cdot 8 = 1111\\,0100 + 1101\\,0000 = 1\\,1100\\,0100 \\to 1100\\,0100$."},
        {"title": "Check", "body": "$1100\\,0100 = -128 + 64 + 4 = -60 = -6 \\times 10$: option (A)."},
    ],
    "answer": {"value": "$11000100$ ($-60$) — option (A)", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "$-60$ in 8-bit 2's complement."),
        opt("B", False, "$10011100 = -100$."),
        opt("C", False, "$10100101 = -91$."),
        opt("D", False, "$11010101 = -43$."),
    ],
    "shortcut": "Decode, multiply in decimal, encode: $-60 = -(0011\\,1100) = 1100\\,0100$.",
    "pitfalls": ["Multiplying the patterns as unsigned ($250 \\times 10$)."],
    "verification": "$1100\\,0100 + 0011\\,1100 = 1\\,0000\\,0000$, so it is the negative of 60. ✓",
}

SOLUTIONS["it-2006-cs-38"] = {
    "approach": "Concept tested: **bit-pair (radix-4) recoding**. Each triple $(x_{i+1}, x_i, x_{i-1})$ selects $D = -2x_{i+1} + x_i + x_{i-1}$ times $Y$.",
    "concepts": ["Bit-pair recoding", "Radix-4 Booth digits"],
    "steps": [
        {"title": "The digit formula", "body": "Pairing two Booth digits: $D = 2(x_i - x_{i+1}) + (x_{i-1} - x_i) = -2x_{i+1} + x_i + x_{i-1}$."},
        {"title": "Row 5: 100", "body": "$D = -2 + 0 + 0 = -2$: partial product $-2Y$."},
        {"title": "Row 8: 111", "body": "$D = -2 + 1 + 1 = 0$: partial product 0 (inside a run of 1s). Option (C)."},
    ],
    "answer": {"value": "$-2Y$ and $0$ — option (C)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$2Y$ for row 5 ignores the $-2$ weight of $x_{i+1}$."),
        opt("B", False, "Row 8 is inside a run of 1s, so it contributes 0, not $2Y$."),
        opt("C", True, "$-2 + 0 + 0 = -2$ and $-2 + 1 + 1 = 0$."),
        opt("D", False, "Row 5 is not 0: a run of 1s starts at $x_{i+1}$."),
    ],
    "shortcut": "The table is antisymmetric: triples that are bitwise complements (row $r$ and row $9 - r$) have opposite digits ($000 \\leftrightarrow 111$: 0, $011 \\leftrightarrow 100$: $\\pm 2$).",
    "pitfalls": ["Treating $x_{i+1}$ as $+2$ instead of $-2$."],
    "verification": "The given rows check out with the formula: $001 \\to 1$, $011 \\to 2$, $101 \\to -1$, $110 \\to -1$. ✓",
}

SOLUTIONS["it-2008-it-42"] = {
    "approach": "Concept tested: **counting Booth's additions/subtractions**: one per bit change of the multiplier read with an appended 0. The multiplicand is irrelevant.",
    "concepts": ["Booth recoding", "Operation count = bit changes"],
    "steps": [
        {"title": "Multiplier with the appended 0", "body": "$0111\\,0111\\,1011\\,1101\\ |\\ 0$."},
        {"title": "Count changes from the right", "body": "Pairs $(q_i, q_{i-1})$ that differ: $i = 0$ (1 over 0), $1$, $2$, $6$, $7$, $11$, $12$, $15$. That is 8 changes."},
        {"title": "Answer", "body": "Recoding $+1\\,0\\,0\\,{-1}\\,{+1}\\,0\\,0\\,0\\,{-1}\\,{+1}\\,0\\,0\\,0\\,{-1}\\,{+1}\\,{-1}$ has 8 non-zero digits: 8 operations, option (B)."},
    ],
    "answer": {"value": "8 — option (B)", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "6 misses some changes (for example at bits 0 and 1)."),
        opt("B", True, "Eight bit changes, so eight additions/subtractions."),
        opt("C", False, "10 overcounts; the runs of 1s cost only their two ends."),
        opt("D", False, "12 is the number of 1s: the plain shift-and-add count."),
    ],
    "shortcut": "Count the boundaries between runs (plus the boundary with the appended 0 if $q_0 = 1$).",
    "pitfalls": ["Counting 1s.", "Forgetting the appended 0 (misses the change at bit 0)."],
    "verification": "boothlib's brute-force-checked recoder gives 8 non-zero digits for this multiplier. ✓",
}

SOLUTIONS["cse-2025-2-cs-22"] = {
    "approach": "Concept tested: **Booth's operation count**: count the positions where $q_i \\ne q_{i-1}$ in $Q$ with $q_{-1} = 0$; the multiplicand $M$ does not matter.",
    "concepts": ["Booth recoding", "Operation count = bit changes"],
    "steps": [
        {"title": "Write Q with the appended 0", "body": "$1010\\,0100\\,1010\\,1010\\ |\\ 0$."},
        {"title": "Count changes from the right", "body": "Bits $q_0 \\ldots q_{15}$ = 0,1,0,1,0,1,0,1,0,0,1,0,0,1,0,1. Changes at $i = 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 14, 15$: 13."},
        {"title": "Answer", "body": "13 additions and subtractions."},
    ],
    "answer": {"value": "13", "number": 13, "matchesKey": True},
    "shortcut": "The low byte $1010\\,1010$ alone gives 7 changes; the high byte $1010\\,0100$ adds 6.",
    "pitfalls": ["Counting the 1s (7).", "Including the multiplicand.", "Counting a change at $i = 0$ (here $q_0 = 0 = q_{-1}$)."],
    "verification": "The recoding $-1\\,+1\\,-1\\,0\\,+1\\,-1\\,0\\,+1\\,-1\\,+1\\,-1\\,+1\\,-1\\,+1\\,-1\\,0$ has 13 non-zero digits. ✓",
}


def write():
    bank = {q["id"]: q for q in json.loads((ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
    by_paper = {}
    for qid, sol in SOLUTIONS.items():
        by_paper.setdefault(bank[qid]["paper"], {})[qid] = sol
    for paper, sols in sorted(by_paper.items()):
        p = ROOT / "src" / "gate" / "solutions" / f"{paper}.json"
        d = json.loads(p.read_text())
        for qid, sol in sols.items():
            sol = dict(sol)
            keep = sol.pop("_keep_animation", False)
            if keep and "animation" not in sol and d["solutions"].get(qid, {}).get("animation"):
                sol["animation"] = d["solutions"][qid]["animation"]
            d["solutions"][qid] = sol
        p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
        print(f"{paper}: {', '.join(sorted(sols))}")


if __name__ == "__main__":
    write()
