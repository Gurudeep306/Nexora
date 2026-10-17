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


def write():
    bank = {q["id"]: q for q in json.loads((ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
    by_paper = {}
    for qid, sol in SOLUTIONS.items():
        by_paper.setdefault(bank[qid]["paper"], {})[qid] = sol
    for paper, sols in sorted(by_paper.items()):
        p = ROOT / "src" / "gate" / "solutions" / f"{paper}.json"
        d = json.loads(p.read_text())
        d["solutions"].update(sols)
        p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
        print(f"{paper}: {', '.join(sorted(sols))}")


if __name__ == "__main__":
    write()
