"""Teacher-style v2 solutions for the 25 floating-point PYQs (Chapter 1, lessons 5–7).

This file is the source; `python3 content/gate-notes/_checks/dl/_sol_ch1_fp.py` writes each solution
into src/gate/solutions/<paper>.json (the v2 solutions pipeline), and pyq_ch1.py plus
scripts/gate/validate-solutions.mjs check the result. Every number quoted here is re-derived in
l05_fp_basics.py, l06_ieee754.py or l07_fp_arithmetic.py.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[4]


def opt(letter, correct, reason):
    return {"option": letter, "correct": correct, "reason": reason}


def bits_anim(title, rows, group=None):
    a = {"kind": "bits", "title": title, "rows": rows}
    if group:
        a["group"] = group
    return a


def row(label, fields, value=None):
    r = {"label": label, "fields": [dict(zip(("bits", "label", "tone"), f)) if len(f) == 3 else dict(zip(("bits", "label"), f)) for f in fields]}
    if value is not None:
        r["value"] = value
    return r


SOLUTIONS = {}

# ── Lesson 5: formats ───────────────────────────────────────────────────────

SOLUTIONS["cse-1996-a-25"] = {
    "approach": "Concept tested: the range of a **normalised fraction-form mantissa**. A 24-bit sign-magnitude mantissa has 1 sign bit and 23 magnitude bits; normalised means the first magnitude bit is 1, so the magnitude runs from $0.100\\ldots0$ to $0.111\\ldots1$.",
    "concepts": ["Normalised mantissa (fraction form)", "Sign-magnitude mantissa", "Geometric sum of fraction bits"],
    "given": "| Field | Bits | Code |\n|---|---|---|\n| Exponent | 8 (bits 31–24) | 2's complement |\n| Mantissa | 24 (bits 23–0) | sign-magnitude: 1 sign + 23 magnitude |",
    "steps": [
        {"title": "Count the magnitude bits", "body": "Sign-magnitude spends one of the 24 mantissa bits on the sign, so the magnitude is a 23-bit fraction $0.b_1b_2\\ldots b_{23}$. The exponent does not matter: the question asks about the mantissa's magnitude."},
        {"title": "Smallest normalised magnitude", "body": "Normalised (fraction form) means $b_1 = 1$. The smallest such fraction is $0.1000\\ldots0_2 = 2^{-1} = 0.5$."},
        {"title": "Largest magnitude", "body": "All 23 bits 1: $0.111\\ldots1_2 = \\tfrac12 + \\tfrac14 + \\dots + 2^{-23} = 1 - 2^{-23}$ (a geometric sum, one step short of 1)."},
        {"title": "Conclusion", "body": "The magnitude of a normalised mantissa lies in $[0.5,\\ 1 - 2^{-23}]$: option (D)."},
    ],
    "answer": {"value": "$0.5$ to $(1 - 2^{-23})$ — option (D)", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "0 is not normalised (no leading 1), and 1 needs a 1 before the point, which a pure fraction cannot hold."),
        opt("B", False, "The lower end 0.5 is right, but the upper end 1 is unreachable: 23 ones give $1 - 2^{-23}$."),
        opt("C", False, "$2^{-23}$ is the smallest *non-zero* fraction ($0.00\\ldots01$), which is not normalised; 0.5 is where normalised values start, not end."),
        opt("D", True, "Leading 1 forced ($\\ge 0.5$), all ones at most $1 - 2^{-23}$."),
    ],
    "shortcut": "Normalised fraction form always means $\\tfrac12 \\le M \\le 1 - 2^{-(\\text{magnitude bits})}$. Count the magnitude bits (24 − 1 sign = 23) and you are done.",
    "pitfalls": [
        "Using 24 magnitude bits ($1 - 2^{-24}$): the sign bit is part of the 24-bit mantissa.",
        "Answering the range of *values* (which needs the exponent) instead of the mantissa magnitude.",
        "Taking $2^{-23}$ as the smallest normalised mantissa.",
    ],
    "verification": "With 3 magnitude bits the normalised fractions are $0.100, 0.101, 0.110, 0.111 = 0.5, 0.625, 0.75, 0.875 = 1 - 2^{-3}$, the same pattern.",
}

SOLUTIONS["cse-1997-b-72-a"] = {
    "approach": "Concept tested: **encoding in a custom format** with a fraction-form mantissa and sign-magnitude fields. Convert to binary, normalise as $0.1\\ldots \\times 2^e$, keep 5 magnitude bits (truncating, as the key assumes) and write $e$ in 4-bit sign-magnitude.",
    "concepts": ["Fraction-form normalisation", "Sign-magnitude fields", "Truncation"],
    "given": "$f$: 6 bits = sign + 5 magnitude bits (a fraction). $e$: 4 bits = sign + 3 magnitude bits. $n = f \\cdot 2^{e}$. $A = 54.75$, $B = 9.75$.",
    "steps": [
        {"title": "A to binary and normalise", "body": "$54.75 = 110110.11_2 = 0.11011011_2 \\times 2^{6}$ (point moved 6 places left)."},
        {"title": "Fit A into the fields", "body": "Five magnitude bits: $11011$ (the dropped bits $011$ are lost by truncation). $e = 6 = 110_2$.\n\n$f_A = 0\\ 11011$, $e_A = 0\\ 110$; stored value $0.11011_2 \\times 2^6 = \\tfrac{27}{32} \\times 64 = 54$."},
        {"title": "B to binary and normalise", "body": "$9.75 = 1001.11_2 = 0.100111_2 \\times 2^{4}$."},
        {"title": "Fit B into the fields", "body": "Truncate to $10011$; $e = 4 = 100_2$.\n\n$f_B = 0\\ 10011$, $e_B = 0\\ 100$; stored value $0.10011_2 \\times 2^4 = \\tfrac{19}{32} \\times 16 = 9.5$."},
    ],
    "answer": {"value": "$A$: $f = 0\\,11011$, $e = 0\\,110$ (stores 54). $B$: $f = 0\\,10011$, $e = 0\\,100$ (stores 9.5).", "matchesKey": True},
    "shortcut": "Write the integer part's bit count as the exponent directly: $54 < 64 = 2^6$ gives $e = 6$, $9 < 16 = 2^4$ gives $e = 4$; then copy the first 5 bits of the binary string.",
    "pitfalls": [
        "Rounding instead of truncating: $B$ would become $0.10100 \\times 2^4 = 10$ (the official key truncates).",
        "Using 6 magnitude bits: the 6-bit $f$ includes its sign bit.",
        "Writing $e$ in 2's complement or biased form; the question says sign-magnitude.",
    ],
    "verification": "Decode: $0.11011_2 = 27/32$, $27/32 \\times 64 = 54$; $0.10011_2 = 19/32$, $19/32 \\times 16 = 9.5$. Both are within one truncated step of the originals.",
}

SOLUTIONS["cse-2002-b-57-a"] = {
    "approach": "Concept tested: a **base-16** format with an **excess-64** exponent and an unusual field order (sign | fraction | exponent). Normalise so the first *hex digit* of the fraction is non-zero, then assemble the 32 bits and regroup into hex.",
    "concepts": ["Base-16 normalisation", "Excess-64 exponent", "Field order"],
    "given": "| Field | Bits | Meaning |\n|---|---|---|\n| sign (MSB) | 1 | 0 = +, 1 = − |\n| fraction | 24 | point at its left end |\n| exponent | 7 | excess-64, base 16 |",
    "steps": [
        {"title": "Convert 7.5 to hex", "body": "$7.5 = 7.8_{16}$ (since $0.5 = 8/16$)."},
        {"title": "Normalise in base 16", "body": "Move the point one hex digit left: $7.8_{16} = 0.78_{16} \\times 16^{1}$. The first hex digit (7) is non-zero, so this is normalised and $E = 1$."},
        {"title": "Fields", "body": "- Sign: $1$ (negative).\n- Fraction (6 hex digits): $780000_{16} = 0111\\,1000\\,0000\\ldots0$.\n- Exponent: $1 + 64 = 65 = 41_{16} = 100\\,0001_2$."},
        {"title": "Assemble and regroup", "body": "$1\\ \\ 0111\\,1000\\,0000\\,0000\\,0000\\,0000\\ \\ 100\\,0001$\n\nRegroup the 32 bits in fours: $1011\\,1100\\,0000\\,0000\\,0000\\,0000\\,0100\\,0001 = \\texttt{BC000041}_{16}$."},
    ],
    "answer": {"value": "Sign $= 1$, fraction $= 780000_{16}$, exponent $= 41_{16}$ (65); word $=$ **BC000041H**", "matchesKey": True},
    "shortcut": "In base 16 a value between 1 and 16 always has exponent 1 (one hex digit before the point), so the exponent field is $64 + 1 = 41_{16}$ immediately.",
    "pitfalls": [
        "Normalising in binary ($0.1111 \\times 2^3$): the exponent is a power of 16, so normalise by hex digits.",
        "Putting the exponent right after the sign, as in IEEE: this format puts it last.",
        "Reading the fields' hex digits directly (`1 780000 41`): the fields are not nibble-aligned, so regroup the whole word.",
    ],
    "verification": "Decode BC000041: sign 1, fraction $0.78_{16} = 0.46875$, exponent $65 - 64 = 1$: $-0.46875 \\times 16 = -7.5$. ✓",
    "animation": bits_anim("The −7.5 word", [row("word", [("1", "sign", "error"), ("011110000000000000000000", "fraction 0x780000", "info"), ("1000001", "exp 65", "accent")], "BC000041")]),
}

SOLUTIONS["cse-2002-b-57-b"] = {
    "approach": "Concept tested: the **largest value** of a base-16 format. Take the largest fraction ($0.FFFFFF_{16}$) and the largest exponent (excess-64 in 7 bits gives $+63$), then convert $16^{63}$ to a power of 10.",
    "concepts": ["Range of a floating-point format", "Excess-64 exponent", "Powers of 16 to powers of 10"],
    "steps": [
        {"title": "Largest exponent", "body": "7-bit field: $e \\le 127$, so $E = 127 - 64 = 63$."},
        {"title": "Largest fraction", "body": "All 24 bits 1: $0.FFFFFF_{16} = 1 - 16^{-6} \\approx 1$."},
        {"title": "Largest value", "body": "$x_{\\max} = (1 - 16^{-6}) \\times 16^{63} \\approx 16^{63} = 2^{252}$."},
        {"title": "Convert to a power of 10", "body": "$\\log_{10} 2^{252} = 252 \\times 0.30103 \\approx 75.86$, so $x_{\\max} \\approx 10^{75.86} \\approx 7.2 \\times 10^{75}$. The nearest power of 10 is $10^{76}$."},
    ],
    "answer": {"value": "$x_{\\max} = (1 - 16^{-6})\\,16^{63} \\approx 7.2 \\times 10^{75}$, i.e. $\\approx 10^{76}$", "matchesKey": True},
    "shortcut": "$16^{63} = 2^{252}$ and $2^{10} \\approx 10^{3}$: $2^{252} = 2^{2} \\cdot (2^{10})^{25} \\approx 4 \\times 10^{75}$, close to $10^{76}$ (the exact log is 75.86).",
    "pitfalls": [
        "Using base 2 ($2^{63} \\approx 10^{19}$): the exponent is a power of 16.",
        "Taking $E_{\\max} = 64$ or $127$: excess-64 in 7 bits reaches $+63$.",
        "Rounding $10^{75.86}$ down to $10^{75}$: the nearest power is $10^{76}$.",
    ],
    "verification": "$7.24 \\times 10^{75}$ is $10^{75.86}$; $|75.86 - 76| < |75.86 - 75|$, so $10^{76}$ is nearer.",
}

SOLUTIONS["cse-2003-cs-43"] = {
    "approach": "Concept tested: the **gap between successive values** (one ulp). Within one exponent the mantissa steps by $2^{-9}$, so values step by $2^{-9} \\cdot 2^{e-31}$; the gap is largest at the largest ordinary exponent, $e = 62$ (the all-ones field means zero).",
    "concepts": ["Unit in the last place (ulp)", "Hidden-bit format", "Reserved exponent field"],
    "given": "16 bits: $s$ (1) | $e$ (6) | $m$ (9). Value $(-1)^s (1 + m \\cdot 2^{-9})\\, 2^{e-31}$ for $e \\ne 111111$; $0$ otherwise.",
    "steps": [
        {"title": "Gap inside one exponent", "body": "Consecutive $m$ differ by 1, so consecutive values differ by $\\Delta(e) = 2^{-9} \\times 2^{e - 31}$."},
        {"title": "Which exponent gives the largest gap", "body": "$\\Delta(e)$ grows with $e$. The field $e = 111111 = 63$ is reserved for zero, so the largest ordinary exponent is $e = 62$."},
        {"title": "Compute it", "body": "$\\Delta(62) = 2^{-9} \\times 2^{62 - 31} = 2^{-9} \\times 2^{31} = 2^{22}$."},
        {"title": "Across an exponent boundary", "body": "From the largest value at $e$ to $1.0 \\times 2^{e+1-31}$ the step is again $\\Delta(e)$, so no larger gap hides at a boundary. Answer: $2^{22}$, option (C)."},
    ],
    "answer": {"value": "$2^{22}$ — option (C)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$2^{-40} = 2^{-9} \\times 2^{0-31}$ is the **smallest** gap (at $e = 0$), not the largest."),
        opt("B", False, "$2^{-9}$ is the step of the mantissa alone, ignoring the factor $2^{e-31}$."),
        opt("C", True, "$2^{-9} \\times 2^{62-31} = 2^{22}$ at the largest ordinary exponent."),
        opt("D", False, "$2^{31}$ is the scale factor at $e = 62$ without the mantissa step $2^{-9}$ (and $2^{32}$ would use the reserved $e = 63$)."),
    ],
    "shortcut": "Largest gap = (mantissa step) × (largest power of two) $= 2^{-9} \\times 2^{62-31}$.",
    "pitfalls": [
        "Using $e = 63$, which is reserved for zero ($2^{-9} \\cdot 2^{32} = 2^{23}$ is not even offered).",
        "Forgetting that the gap scales with the exponent.",
    ],
    "verification": "Two successive values at the top: $(1 + 511 \\cdot 2^{-9})\\,2^{31}$ and $(1 + 510 \\cdot 2^{-9})\\,2^{31}$ differ by $2^{-9} \\cdot 2^{31} = 2^{22}$. ✓",
}

SOLUTIONS["cse-2005-cs-85a"] = {
    "approach": "Concept tested: **encoding without normalisation**. Convert the mantissa 0.239 to 8 binary places (truncating), store the exponent 13 in excess-64, and assemble sign | exponent | mantissa.",
    "concepts": ["Fraction to binary (repeated doubling)", "Excess-64 exponent", "Hex grouping of a 16-bit word"],
    "given": "16 bits: sign (bit 15) | exponent (bits 14–8, excess-64) | mantissa (bits 7–0, a pure fraction in sign-magnitude, the sign being bit 15).",
    "steps": [
        {"title": "0.239 to binary, 8 places", "body": "Double and peel: $0.478 \\to 0$, $0.956 \\to 0$, $1.912 \\to 1$, $1.824 \\to 1$, $1.648 \\to 1$, $1.296 \\to 1$, $0.592 \\to 0$, $1.184 \\to 1$.\n\nSo $0.239 \\approx 0.00111101_2$ (truncated)."},
        {"title": "Exponent field", "body": "$13 + 64 = 77 = 100\\,1101_2$."},
        {"title": "Assemble and group", "body": "$0\\ 1001101\\ 00111101 = 0100\\,1101\\,0011\\,1101 = \\texttt{4D 3D}$: option (D)."},
    ],
    "answer": {"value": "`4D 3D` — option (D)", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "`0D 24`: the exponent field lacks the bias (13 = 0001101) and the mantissa bits are wrong."),
        opt("B", False, "`0D 4D`: unbiased exponent, and the bytes of exponent and mantissa are confused."),
        opt("C", False, "`4D 0D`: right exponent byte, but the mantissa byte 0D is not 0.239."),
        opt("D", True, "Exponent 77 → `4D`, mantissa 00111101 → `3D`."),
    ],
    "shortcut": "With the sign bit 0, the high byte is just the excess-64 exponent: $77 = 4D_{16}$. Only options C and D start with `4D`, and $0.239 \\times 256 = 61.2 \\to 61 = 3D_{16}$.",
    "pitfalls": [
        "Forgetting the bias (exponent byte `0D`).",
        "Rounding $0.239 \\times 256 = 61.18$ the wrong way, or converting 0.239 as if it were 239.",
    ],
    "verification": "$3D_{16} = 61$ and $61/256 = 0.23828$, within $1/256$ of 0.239. ✓",
    "animation": bits_anim("0.239 × 2¹³ without normalisation", [row("word", [("0", "sign", "muted"), ("1001101", "exp 13+64", "accent"), ("00111101", "mantissa ≈ 0.239", "success")], "0x4D3D")], group=4),
}

SOLUTIONS["cse-2005-cs-85b"] = {
    "approach": "Concept tested: **normalising with a hidden bit**. Shift the mantissa $0.00111101$ left until its first 1 is just before the point (3 places), lower the exponent by 3, and store only the bits after that 1 (padding with 0s, as the question says).",
    "concepts": ["Normalisation (shift left, lower the exponent)", "Hidden (implicit) bit", "Excess-64 exponent"],
    "steps": [
        {"title": "Find the first 1", "body": "From part (a), $0.239 \\times 2^{13} \\approx 0.00111101_2 \\times 2^{13}$. The first 1 is in the 3rd place after the point."},
        {"title": "Shift left by 3", "body": "$0.00111101 \\times 2^{13} = 1.11101 \\times 2^{10}$: the significand is multiplied by $2^3$, so the exponent drops from 13 to 10."},
        {"title": "Fields", "body": "- Exponent: $10 + 64 = 74 = 100\\,1010_2$.\n- Mantissa: the 1 before the point is implicit, so store the bits after it, $11101$, padded with 0s to 8 bits: $1110\\,1000$. (These are exactly the 8 bits of part (a) shifted left by 3.)"},
        {"title": "Assemble", "body": "$0\\ 1001010\\ 11101000 = 0100\\,1010\\,1110\\,1000 = \\texttt{4A E8}$: option (D)."},
    ],
    "answer": {"value": "`4A E8` — option (D)", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "`0A 20`: exponent stored without the bias of 64, and the mantissa byte is wrong."),
        opt("B", False, "`11 34`: exponent field $0010001 = 17$, i.e. $E = -47$, unrelated to the number."),
        opt("C", False, "`49 D0`: exponent 73 (shift of 4) with mantissa $11010000$, which drops one of the 1s: it encodes $1.1101 \\times 2^9 = 928$, not 1952."),
        opt("D", True, "Exponent $13 - 3 + 64 = 74$ → `4A`; mantissa $11101000$ → `E8`."),
    ],
    "shortcut": "Normalising never changes the value, so decode the options: (D) gives $1.11101_2 \\times 2^{10} = 1.90625 \\times 1024 = 1952$, the same as part (a)'s $61/256 \\times 2^{13} = 1952$.",
    "pitfalls": [
        "Writing $1.1101 \\times 2^{10}$ (one 1 lost while shifting): $0.00111101$ has five 1s, so $1.11101$ keeps five 1s.",
        "Shifting left but *raising* the exponent.",
        "Storing the leading 1 as well (`4A F4`), which a hidden-bit format never does.",
    ],
    "verification": "Part (a) stores $61/256 \\times 2^{13} = 1952$. Option (D) stores $(1 + 29/32) \\times 2^{10} = 1952$. Same value, so no bits were lost and the key D is fully consistent (an older review note claiming the question was flawed miscounted the 1s).",
    "animation": bits_anim("Normalising: shift left by 3, exponent 13 → 10", [
        row("(a) raw", [("0", "sign", "muted"), ("1001101", "exp 77", "accent"), ("00111101", "0.00111101", "info")], "0x4D3D"),
        row("(b) normalised", [("0", "sign", "muted"), ("1001010", "exp 74", "accent"), ("11101000", "after the hidden 1", "success")], "0x4AE8"),
    ], group=4),
}


# ── Lesson 6: IEEE-754 ──────────────────────────────────────────────────────

SOLUTIONS["cse-2008-cs-4"] = {
    "approach": "Concept tested: **IEEE-754 special values**. An all-zero word has exponent field 0 and fraction 0, which IEEE reserves for zero; it is not a normalised number (normalised values need $1 \\le e \\le 254$ and carry a hidden 1).",
    "concepts": ["IEEE-754 special values", "Signed zero", "Hidden bit"],
    "steps": [
        {"title": "Split the word", "body": "`0x00000000` $\\Rightarrow s = 0$, $e = 0000\\,0000$, $f = 0$."},
        {"title": "Classify by the exponent field", "body": "$e = 0$ switches the hidden 1 off. With $f = 0$ the pattern is **zero**; with $f \\ne 0$ it would be a denormal. Normalised numbers need $1 \\le e \\le 254$."},
        {"title": "Sign", "body": "$s = 0$, so it is $+0$ (`0x80000000` is $-0$). It is a *special* value, not a normalised one: option (D)."},
    ],
    "answer": {"value": "The special value $+0$ — option (D)", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Reading $e = 0$ as $E = -127$ with a hidden 1 gives $2^{-127}$, but IEEE never puts a hidden 1 under $e = 0$, and $2^{-127}$ is only reachable as a denormal (`0x00400000`)."),
        opt("B", False, "$2^{-126}$ is the smallest normalised value, `0x00800000` (exponent field 1)."),
        opt("C", False, "Zero cannot be normalised (it has no leading 1); IEEE encodes it as a special value."),
        opt("D", True, "Exponent field 0 and fraction 0 is the reserved encoding of $+0$."),
    ],
    "shortcut": "Exponent field 0 or 255 ⇒ special (zero/denormal or ∞/NaN). Only 1 … 254 are normalised.",
    "pitfalls": ["Applying the normal formula $1.f \\times 2^{e-127}$ to $e = 0$.", "Calling zero 'normalised'."],
    "verification": "C's `float x = 0.0f;` has the bit pattern `0x00000000`, and `-0.0f` is `0x80000000`; they compare equal.",
}

SOLUTIONS["it-2008-it-7"] = {
    "approach": "Concept tested: **decoding single precision**. Split the 32 bits as 1 | 8 | 23, subtract the bias 127 from the exponent, restore the hidden 1 and shift the point.",
    "concepts": ["IEEE-754 single precision", "Bias 127", "Hidden bit"],
    "steps": [
        {"title": "Split the bits", "body": "`1 10000011 10100000000000000000000`: $s = 1$, $e = 1000\\,0011 = 131$, $f = 101\\,0\\ldots$"},
        {"title": "True exponent", "body": "$E = 131 - 127 = 4$."},
        {"title": "Significand and value", "body": "$1.101_2 \\times 2^{4} = 11010_2 = 26$, and the sign bit makes it $-26$: option (C)."},
    ],
    "answer": {"value": "$-26$ — option (C)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$-10$ comes from dropping the hidden 1: $0.101_2 \\times 2^4 = 10$."),
        opt("B", False, "$-13$ is $1.101_2 \\times 2^3$, i.e. a bias of 128."),
        opt("C", True, "$-1.101_2 \\times 2^{131-127} = -1.625 \\times 16 = -26$."),
        opt("D", False, "The pattern is an ordinary normal number, so one of the values is right."),
    ],
    "shortcut": "The word is `0xC1D00000`; `C1` + the next bit gives $e = 131$ (scale 16), and $1.625 \\times 16 = 26$.",
    "pitfalls": ["Forgetting the hidden 1.", "Using bias 128.", "Ignoring the sign bit."],
    "verification": "Re-encode $-26 = -11010_2 = -1.101 \\times 2^4$: $e = 131$, $f = 101\\ldots$, the same bits. ✓",
    "animation": bits_anim("Decoding the word", [row("word", [("1", "sign −", "error"), ("10000011", "e = 131 → E = 4", "accent"), ("10100000000000000000000", "f → 1.101", "info")], "−26")]),
}

SOLUTIONS["cse-2012-cs-7"] = {
    "approach": "Concept tested: **encoding** with the hidden bit and the biased exponent. $0.5 = 1.0 \\times 2^{-1}$, so the fraction field is all zeros and the (true) exponent is $-1$.",
    "concepts": ["Normalisation 1.f", "Hidden bit", "True vs biased exponent"],
    "steps": [
        {"title": "Normalise", "body": "$0.5 = 0.1_2 = 1.0_2 \\times 2^{-1}$."},
        {"title": "Fraction field", "body": "The bits after the point of $1.0$: all zeros, `000…000` (the leading 1 is hidden)."},
        {"title": "Exponent", "body": "The exponent **value** is $-1$; it is stored as $-1 + 127 = 126 = 0111\\,1110$. The options speak of the exponent value, so option (B)."},
    ],
    "answer": {"value": "Fraction $000\\ldots0$, exponent value $-1$ — option (B)", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Exponent 0 with fraction 0 is $1.0$, not $0.5$."),
        opt("B", True, "$0.5 = 1.0 \\times 2^{-1}$: empty fraction, exponent $-1$ (stored as 126)."),
        opt("C", False, "Fraction $100\\ldots$ with exponent 0 is $1.5$; it treats the significand as $0.1_2$ without the hidden 1."),
        opt("D", False, "$0.5 = 2^{-1}$ has a power-of-two denominator, so it is exact."),
    ],
    "shortcut": "Any power of two $2^k$ has fraction 0 and exponent value $k$.",
    "pitfalls": ["Confusing the exponent value ($-1$) with the stored field (126).", "Storing the leading 1 in the fraction."],
    "verification": "`0x3F000000` $= 0\\ 01111110\\ 0\\ldots$: $1.0 \\times 2^{126-127} = 0.5$. ✓",
}

SOLUTIONS["cse-2014-2-cs-45"] = {
    "approach": "Concept tested: **decimal to IEEE-754 encoding**. Convert $14.25$ to binary, normalise to $1.f \\times 2^3$, bias the exponent, set the sign bit, and regroup the 32 bits into hex.",
    "concepts": ["Decimal to binary", "Normalisation 1.f", "Bias 127", "Hex grouping"],
    "steps": [
        {"title": "Binary", "body": "$14 = 1110_2$, $0.25 = 0.01_2$, so $14.25 = 1110.01_2$."},
        {"title": "Normalise", "body": "$1110.01 = 1.11001 \\times 2^{3}$."},
        {"title": "Fields", "body": "$s = 1$; $e = 3 + 127 = 130 = 1000\\,0010$; $f = 11001\\,0\\ldots$ (23 bits)."},
        {"title": "Regroup", "body": "$1\\ 10000010\\ 1100100\\ldots = 1100\\,0001\\,0110\\,0100\\,0000\\ldots = \\texttt{C1640000}$: option (A)."},
    ],
    "answer": {"value": "`C1640000H` — option (A)", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Sign 1, exponent 130, fraction 11001."),
        opt("B", False, "`416C0000` is positive and has fraction $11011$ ($+14.75$)."),
        opt("C", False, "`41640000` is $+14.25$: the sign bit is missing."),
        opt("D", False, "`C16C0000` has fraction $11011$, i.e. $-14.75$ (0.25 converted as 0.11)."),
    ],
    "shortcut": "Negative and between 8 and 16 ⇒ the word starts `C16`; then $0.25 = 0.01$ makes the fraction $1100\\,1$ → `C164`.",
    "pitfalls": ["Storing the hidden 1.", "Forgetting the sign.", "Converting 0.25 as 0.11 (that is 0.75)."],
    "verification": "Decode `C1640000`: $-1.78125 \\times 8 = -14.25$. ✓",
    "animation": bits_anim("−14.25 in single precision", [row("X", [("1", "sign", "error"), ("10000010", "e = 130", "accent"), ("11001000000000000000000", "f = 11001…", "info")], "0xC1640000")]),
}

SOLUTIONS["cse-2017-2-cs-12"] = {
    "approach": "Concept tested: **decoding single precision** with a negative exponent. Split 1 | 8 | 23, compute $E = e - 127 = -3$, and evaluate $1.f \\times 2^{-3}$.",
    "concepts": ["IEEE-754 decoding", "Negative exponents", "Binary fraction to decimal"],
    "steps": [
        {"title": "Split", "body": "`0 01111100 11011010000000000000000`: $s = 0$, $e = 0111\\,1100 = 124$, $f = 1101101\\,0\\ldots$"},
        {"title": "Exponent", "body": "$E = 124 - 127 = -3$."},
        {"title": "Significand", "body": "$1.1101101_2 = 1 + \\tfrac12 + \\tfrac14 + \\tfrac1{16} + \\tfrac1{32} + \\tfrac1{128} = 1.8515625$."},
        {"title": "Value", "body": "$1.8515625 \\times 2^{-3} = 0.2314453125$. The closest option is $2.27 \\times 10^{-1}$: option (C)."},
    ],
    "answer": {"value": "$\\approx 0.2314$, closest to $2.27 \\times 10^{-1}$ — option (C)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$14.5$ is far too large; it would need a positive exponent."),
        opt("B", False, "$0.145$ lies in the right binade $[0.125, 0.25)$ but needs a significand of about 1.16; the fraction bits $1101101$ give 1.85."),
        opt("C", True, "$0.2314$ is nearest to $0.227$ among the options."),
        opt("D", False, "$22.7$ has the right digits but the exponent sign is wrong."),
    ],
    "shortcut": "$e = 124$ ⇒ the value is in $[2^{-3}, 2^{-2}) = [0.125, 0.25)$. Only $0.145$ and $0.227$ lie there, and $1.85/8 \\approx 0.23$.",
    "pitfalls": ["Reading the exponent as 248 or 62 by mis-cutting the fields.", "Forgetting the hidden 1 (gives about 0.106)."],
    "verification": "Python: `struct.unpack('>f', bytes.fromhex('3E6D0000'))` gives 0.2314453125. ✓",
}

SOLUTIONS["cse-2021-1-cs-24"] = {
    "approach": "Concept tested: **decoding** given fields. Exponent $10000001 = 129$ gives $E = 2$; the significand is $1.1111_2$; the sign is negative.",
    "concepts": ["IEEE-754 decoding", "Bias 127", "Hidden bit"],
    "steps": [
        {"title": "Exponent", "body": "$E = 1000\\,0001_2 - 127 = 129 - 127 = 2$."},
        {"title": "Significand", "body": "$1.f = 1.1111_2 = 1 + 0.5 + 0.25 + 0.125 + 0.0625 = 1.9375$."},
        {"title": "Value", "body": "$-1.9375 \\times 2^{2} = -7.75$ (equivalently $-111.11_2$)."},
    ],
    "answer": {"value": "$-7.75$", "number": -7.75, "matchesKey": True},
    "shortcut": "Shift the point right by $E = 2$: $1.1111_2 \\to 111.11_2 = 7.75$, then apply the sign.",
    "pitfalls": ["Answering $+7.75$ (sign ignored).", "Answering $-3.875$ (bias 128) or $-3.75$ (no hidden 1: $0.1111 \\times 4$)."],
    "verification": "Re-encode $-7.75 = -1.1111 \\times 2^2$: $e = 129$, $f = 1111$ — the given fields. ✓",
}

SOLUTIONS["cse-2021-2-cs-4"] = {
    "approach": "Concept tested: **the smallest normalised number**. Normalised values need an exponent field from 1 to 254; the smallest is field 1 with fraction 0, i.e. $1.0 \\times 2^{-126}$.",
    "concepts": ["Normalised vs denormal", "Reserved exponent fields", "Extremes of IEEE-754"],
    "steps": [
        {"title": "Which exponent fields are normal", "body": "Field 0 is zero/denormal and field 255 is ∞/NaN. Normal fields are $1 \\dots 254$, so the smallest normal field is $0000\\,0001$."},
        {"title": "Smallest significand", "body": "With the hidden 1, the smallest significand is $1.000\\ldots0$, i.e. fraction all zeros."},
        {"title": "Answer", "body": "Exponent $00000001$, mantissa $000\\ldots0$: $1.0 \\times 2^{1-127} = 2^{-126}$, option (C)."},
    ],
    "answer": {"value": "Exponent $00000001$, mantissa all zeros ($2^{-126}$) — option (C)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Exponent 0 and mantissa 0 is the special value $+0$."),
        opt("B", False, "Exponent 0 with mantissa $0\\ldots01$ is the smallest **denormal**, $2^{-149}$, not a normalised number."),
        opt("C", True, "The smallest normal field with the smallest fraction: $2^{-126}$."),
        opt("D", False, "Normal, but one ulp larger: $(1 + 2^{-23})\\,2^{-126}$."),
    ],
    "shortcut": "Smallest normal = `0x00800000` (just the lowest exponent bit set).",
    "pitfalls": ["Picking the denormal (B) because it is the smallest *positive* value.", "Treating exponent field 0 as normal."],
    "verification": "`0x00800000` decodes to $1.1755 \\times 10^{-38} = 2^{-126}$; `0x007FFFFF` (one less) is already a denormal. ✓",
}

SOLUTIONS["cse-2022-cs-31"] = {
    "approach": "Concept tested: **decoding several words**, then checking simple arithmetic claims. Decode $A$, $B$, $C$ to ordinary numbers first; each claim is then one line.",
    "concepts": ["IEEE-754 decoding", "Reading the exponent from the hex digits"],
    "steps": [
        {"title": "Decode A = 0xC1400000", "body": "$1\\ 10000010\\ 1000\\ldots$: $-1.1_2 \\times 2^{3} = -1.5 \\times 8 = -12$."},
        {"title": "Decode B = 0x42100000", "body": "$0\\ 10000100\\ 0010\\ldots$: $1.001_2 \\times 2^{5} = 1.125 \\times 32 = 36$."},
        {"title": "Decode C = 0x41400000", "body": "$0\\ 10000010\\ 1000\\ldots$: $1.5 \\times 8 = 12$ (it is $A$ with the sign bit cleared)."},
        {"title": "Check each claim", "body": "- (A) $A + C = -12 + 12 = 0$: true.\n- (B) $A + B = -12 + 36 = 24 \\ne 12 = C$: **false**.\n- (C) $3C = 36 = B$: true.\n- (D) $B - C = 24 > 0$: true.\n\nThe FALSE statement is (B)."},
    ],
    "answer": {"value": "(B) $C = A + B$ is false ($A + B = 24$, $C = 12$)", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "True: $A = -12$ and $C = 12$ differ only in the sign bit (`C1…` vs `41…`)."),
        opt("B", True, "False: $A + B = 24$, but $C = 12$."),
        opt("C", False, "True: $B = 36 = 3 \\times 12$."),
        opt("D", False, "True: $B - C = 24 > 0$."),
    ],
    "shortcut": "`C14…` and `414…` differ only in the top bit, so $A = -C$ instantly; `421` has exponent 132 (scale 32), so $B = 1.125 \\times 32 = 36$.",
    "pitfalls": ["Answering 'which is TRUE' by mistake.", "Decoding $B$ with exponent 131 (gives 18) by mis-cutting the bits."],
    "verification": "Python `struct` decodes the three words to −12.0, 36.0 and 12.0. ✓",
}

SOLUTIONS["cse-2024-2-cs-4"] = {
    "approach": "Concept tested: **special exponent fields and extremes**. Classify each pattern by its exponent field first: all ones is ∞ or NaN, not a number to compare; among the normal ones, the larger exponent wins.",
    "concepts": ["Special values", "Largest finite float", "Comparing floats by bits"],
    "steps": [
        {"title": "Classify", "body": "- (A) $e = 127$, $f$ all ones: $\\approx 2 - 2^{-23} \\approx 2$.\n- (B) $e = 254$, $f$ all ones: $(2 - 2^{-23})\\,2^{127} \\approx 3.4 \\times 10^{38}$, the largest finite float.\n- (C) $e = 255$, $f \\ne 0$: **NaN**.\n- (D) $e = 127$, $f = 0$: $1.0$."},
        {"title": "Compare the numbers", "body": "Among A, B, D (all positive and normal) the largest exponent decides: (B)."},
        {"title": "Answer", "body": "Option (B); (C) is not a number at all."},
    ],
    "answer": {"value": "(B), $(2 - 2^{-23})\\,2^{127}$ — the largest finite float", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "About 2: exponent field 127 means $E = 0$."),
        opt("B", True, "Exponent 254 ($E = 127$) with an all-ones fraction is the largest finite value."),
        opt("C", False, "Exponent 255 with a non-zero fraction is NaN, which is not ordered."),
        opt("D", False, "Exactly 1.0."),
    ],
    "shortcut": "Never pick an all-ones exponent field as 'largest': it is ∞ (fraction 0) or NaN (fraction ≠ 0).",
    "pitfalls": ["Choosing (C) because its bit pattern is the largest integer.", "Thinking exponent 255 with all-ones fraction is the maximum."],
    "verification": "`0x7F7FFFFF` = 3.4028234663852886e38 in Python; `0x7FFFFFFF` decodes to nan. ✓",
    "_keep_animation": True,
}

SOLUTIONS["cse-2026-2-cs-24"] = {
    "approach": "Concept tested: **decoding a hex word**. `C27` gives the sign and exponent ($1\\ 10000100$, $E = 5$); the fraction starts $1110001$.",
    "concepts": ["IEEE-754 decoding", "Hex to bits", "Bias 127"],
    "steps": [
        {"title": "Hex to bits", "body": "`C2710000` $= 1100\\,0010\\,0111\\,0001\\,0000\\ldots = 1\\ \\ 10000100\\ \\ 1110001\\,0\\ldots$"},
        {"title": "Exponent", "body": "$e = 1000\\,0100 = 132$, $E = 132 - 127 = 5$."},
        {"title": "Value", "body": "$1.1110001_2 \\times 2^5 = 111100.01_2 = 60 + 0.25 = 60.25$, so the number is $-60.25$."},
    ],
    "answer": {"value": "$-60.25$", "number": -60.25, "matchesKey": True},
    "shortcut": "Shift the point 5 places: $1.1110001 \\to 111100.01$; integer part 60, fraction .01 = 0.25.",
    "pitfalls": ["Dropping the hidden 1 (gives $-28.25$).", "Cutting the exponent at the hex-digit boundary ($e = 1000\\,010$...) instead of after 8 bits."],
    "verification": "Re-encode $-60.25 = -1.1110001 \\times 2^5$: $e = 132$, giving `C2710000`. ✓",
    "_keep_animation": True,
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
