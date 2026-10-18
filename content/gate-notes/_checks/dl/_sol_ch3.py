"""Teacher-style v2 solutions for the 39 PYQs of Digital Logic Chapter 3 (Minimisation).

This file is the source; `python3 content/gate-notes/_checks/dl/_sol_ch3.py` writes each solution
into src/gate/solutions/<paper>.json (the v2 solutions pipeline), and pyq_ch3.py plus
scripts/gate/validate-solutions.mjs check the result. Every key is re-derived from scratch in the
lesson checks l3_01 … l3_04 (Quine–McCluskey, Petrick, exhaustive search).

K-map animations are generated here from minlib, never typed by hand: `km()` builds the frame from a
cell list and `grp()` turns a product term into the cells of its loop, in the variable order the frame
uses (a printed map with rows CD and columns AB is drawn with variables [C, D, A, B], so the animation
looks like the paper's map). pyq_ch3.py re-plots every animation and checks it against the function
the question defines.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import minlib as ml  # noqa: E402
from _sol_ch1_fp import ROOT, opt  # noqa: E402

SOLUTIONS = {}


def pt(term):
    """Typographic primes for labels: A'B → A′B."""
    return term.replace("'", "′")


def grp(term, vars_, tone=None, label=None):
    """A K-map group for a product term (letters must be names in vars_)."""
    cube = ml.parse_term(term, vars_)
    g = {"cells": ml.cells(cube), "label": label or pt(term)}
    if tone:
        g["tone"] = tone
    return g


def zgrp(sum_vars, vars_, tone="error", label=None):
    """A group of 0-cells for a sum term written as the list of its literals, e.g. ["Q"] or ["P", "R", "S"]."""
    cube = ["-"] * len(vars_)
    for lit in sum_vars:
        v = lit.rstrip("'")
        cube[vars_.index(v)] = "1" if lit.endswith("'") else "0"
    cube = "".join(cube)
    return {"cells": ml.cells(cube), "label": label or pt("(" + " + ".join(sum_vars) + ")"), "tone": tone}


def km(vars_, ones, dcs=(), groups=(), title=None, **kw):
    f = {"kind": "kmap", "variables": list(vars_), "ones": sorted(ones), "groups": list(groups)}
    if dcs:
        f["dcs"] = sorted(dcs)
    if title:
        f["title"] = title
    f.update(kw)
    return f


def relabel(ones, from_vars, to_vars):
    """Minterm numbers of the same cells under another variable order."""
    out = []
    n = len(from_vars)
    for m in ones:
        bits = dict(zip(from_vars, format(m, f"0{n}b")))
        out.append(int("".join(bits[v] for v in to_vars), 2))
    return sorted(out)


ABCD, ABC = list("ABCD"), list("ABC")

# ── Lesson 1: Karnaugh maps ─────────────────────────────────────────────────

CDAB = list("CDAB")
o95 = relabel([0, 2, 5, 7, 8, 10, 13, 15], ABCD, CDAB)
SOLUTIONS["cse-1995-b-63-b"] = {
    "approach": "Concept tested: **reading a printed K-map** whose rows are $CD$ and columns $AB$, with **corner and centre quads**. Loop the four corners and the centre block; each quad keeps the two variables that never change in it.",
    "concepts": ["Karnaugh map", "Wrap-around (corners)", "XNOR pattern"],
    "given": "Rows $CD$, columns $AB$, both 00, 01, 11, 10. Rows 00 and 10: 1 0 0 1. Rows 01 and 11: 0 1 1 0.",
    "steps": [
        {"title": "Read the axes", "body": "Rows are labelled by $C D$ and columns by $A B$, both in Gray order. The loops do not depend on how the axes are arranged; only the labels of each loop matter.", "scene": {"groups": []}},
        {"title": "The four corners", "body": "Rows $CD = 00$ and $10$ have $D = 0$; columns $AB = 00$ and $10$ have $B = 0$. The four corner cells face each other across both borders, so they are one quad with $B = 0$, $D = 0$: the term $\\overline{B}\\,\\overline{D}$.", "scene": {"groups": [grp("B'D'", CDAB, "accent")]}},
        {"title": "The centre quad", "body": "Rows $CD = 01, 11$ ($D = 1$) and columns $AB = 01, 11$ ($B = 1$) form a $2 \\times 2$ block: $BD$.", "scene": {"groups": [grp("B'D'", CDAB, "accent"), grp("BD", CDAB, "success")]}},
        {"title": "Check", "body": "Every 1 is in one of the two quads and neither quad can grow (each has 0s on all four sides). $A$ and $C$ change inside both quads, so they drop out."},
    ],
    "answer": {"value": "$f = BD + \\overline{B}\\,\\overline{D}$ $\\;(= \\overline{B \\oplus D})$", "matchesKey": True},
    "shortcut": "Corners plus centre on a 4-variable map is always $\\overline{x \\oplus y}$ of the two variables that are the second bits of the row and column labels.",
    "pitfalls": ["Writing $AC$-type terms by reading the map as if rows were $AB$: only $B$ and $D$ stay fixed here.", "Looping the corners as two separate pairs, which gives 6 literals instead of 2."],
    "verification": "Expanding $BD + \\overline{B}\\,\\overline{D}$ gives minterms 0, 2, 5, 7, 8, 10, 13, 15 of $f(A, B, C, D)$: exactly the eight 1-cells of the map.",
    "animation": km(CDAB, o95, title="Rows CD, columns AB (as printed)"),
}

o96 = relabel([1, 3, 4, 6, 9, 11, 12, 14], ABCD, CDAB)
SOLUTIONS["cse-1996-a-49"] = {
    "approach": "Concept tested: **POS from the 0s** of a map with a partial checkerboard. The 0s are the corners and the centre; each 0-quad is read as a sum term (0 → plain letter, 1 → primed letter).",
    "concepts": ["Minimal POS", "Grouping 0s", "XOR pattern"],
    "given": "Rows $CD$, columns $AB$ (Gray order). Rows 00 and 10: 0 1 1 0. Rows 01 and 11: 1 0 0 1.",
    "steps": [
        {"title": "Find the 0s", "body": "The 0s are the four corners (rows $CD = 00, 10$, columns $AB = 00, 10$) and the centre block (rows 01, 11, columns 01, 11). The figure plots these 0-cells (the 1s of $\\overline{f}$), so the loops below are loops of 0s.", "scene": {"groups": []}},
        {"title": "Corner 0s", "body": "The corners have $B = 0$ and $D = 0$. A loop of 0s is a factor that must be 0 there, so each fixed 0 becomes a plain letter: $(B + D)$.", "scene": {"groups": [zgrp(["B", "D"], CDAB, "error")]}},
        {"title": "Centre 0s", "body": "The centre has $B = 1$, $D = 1$, so the factor is $(\\overline{B} + \\overline{D})$.", "scene": {"groups": [zgrp(["B", "D"], CDAB, "error"), zgrp(["B'", "D'"], CDAB, "warning")]}},
        {"title": "Product of sums", "body": "$f = (B + D)(\\overline{B} + \\overline{D})$. Multiplying out: $B\\overline{B} + B\\overline{D} + \\overline{B}D + D\\overline{D} = B\\overline{D} + \\overline{B}D = B \\oplus D$, which matches the 1-cells."},
    ],
    "answer": {"value": "(C) $(B + D)(\\overline{B} + \\overline{D})$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$B\\overline{D} + \\overline{B}D$ is the same function, but it is a sum of products; the question asks for the product-of-sums form."),
        opt("B", False, "$(B + \\overline{C} + D)(\\overline{B} + C + \\overline{D})$ brings in $C$, on which the map does not depend; it is 1 on corner cells with $C = 1$, $D = 0$, which are 0s."),
        opt("C", True, "The two 0-quads read as sum terms."),
        opt("D", False, "$(B + \\overline{D})(\\overline{B} + D) = \\overline{B \\oplus D}$: the complement of the map (the 0-loops read with the SOP habit)."),
    ],
    "shortcut": "1s in the middle columns of the outer rows and the outer columns of the middle rows is $B \\oplus D$; its POS is $(B + D)(\\overline{B} + \\overline{D})$.",
    "pitfalls": ["Choosing the SOP (A) because it is equal: the form matters.", "Reading a 0-loop's fixed 1s as plain letters, which gives option D."],
    "verification": "Cell $CD = 01$, $AB = 00$ ($B = 0$, $D = 1$): $(0 + 1)(1 + 0) = 1$, and the map has a 1 there. Corner cell ($B = D = 0$): $(0 + 0) = 0$. ✓",
    "animation": km(CDAB, relabel([0, 2, 5, 7, 8, 10, 13, 15], ABCD, CDAB), title="The 0-cells of f, drawn as the 1s of f′ (rows CD, columns AB)"),
}

W = list("wxyz")
o97 = [0, 1, 2, 3, 7, 11, 15]
SOLUTIONS["cse-1997-b-71-a"] = {
    "approach": "Concept tested: **POS → minimal SOP**. Find the 0-rows of each factor, take the remaining rows as the minterms, and loop them on a K-map.",
    "concepts": ["POS to SOP", "Karnaugh map", "Minimal SOP"],
    "steps": [
        {"title": "Zeros of each factor", "body": "A sum term is 0 only when all its literals are 0:\n\n| Factor | 0 when | Rows |\n|---|---|---|\n| $\\overline{w} + y$ | $w = 1, y = 0$ | 8, 9, 12, 13 |\n| $\\overline{x} + y$ | $x = 1, y = 0$ | 4, 5, 12, 13 |\n| $w + \\overline{x} + z$ | $w = 0, x = 1, z = 0$ | 4, 6 |\n| $\\overline{w} + z$ | $w = 1, z = 0$ | 8, 10, 12, 14 |\n| $\\overline{x} + z$ | $x = 1, z = 0$ | 4, 6, 12, 14 |"},
        {"title": "Minterms", "body": "Zeros: $\\{4, 5, 6, 8, 9, 10, 12, 13, 14\\}$. So $f = \\Sigma m(0, 1, 2, 3, 7, 11, 15)$.", "scene": {"groups": []}},
        {"title": "Loop the 1s", "body": "Row $wx = 00$ is all 1s: $\\overline{w}\\,\\overline{x}$. Column $yz = 11$ is all 1s: $yz$. Together they cover all seven 1s ($m_3$ is in both).", "scene": {"groups": [grp("w'x'", W, "accent"), grp("yz", W, "success")]}},
    ],
    "answer": {"value": "$f = \\overline{w}\\,\\overline{x} + yz$", "matchesKey": True},
    "shortcut": "Multiply the factors that share a literal: $(\\overline{w} + y)(\\overline{w} + z) = \\overline{w} + yz$ and $(\\overline{x} + y)(\\overline{x} + z) = \\overline{x} + yz$; their product is $\\overline{w}\\,\\overline{x} + yz$, and the factor $(w + \\overline{x} + z)$ is then redundant (it is 1 whenever $\\overline{w}\\,\\overline{x} + yz$ is).",
    "pitfalls": ["Taking the zeros of a factor as its minterms (the Σ/Π mix-up).", "Forgetting that $m_3$ may be covered twice."],
    "verification": "$\\overline{w}\\,\\overline{x}$ covers 0–3 and $yz$ covers 3, 7, 11, 15: union $\\{0, 1, 2, 3, 7, 11, 15\\}$, the complement of the zero set.",
    "animation": km(W, o97),
}

SOLUTIONS["cse-1997-b-71-b"] = {
    "approach": "Concept tested: **counting minterms**. If the output is stuck at 0, the circuit is wrong exactly on the inputs where $f = 1$, so count the minterms of $f$.",
    "concepts": ["Stuck-at-0 fault", "Counting minterms"],
    "steps": [
        {"title": "Where a stuck-at-0 output is wrong", "body": "A stuck-at-0 output always shows 0. It is correct on the rows where $f = 0$ and wrong on every row where $f = 1$."},
        {"title": "Count the 1s of f", "body": "From part (a), $f = \\overline{w}\\,\\overline{x} + yz$. $\\overline{w}\\,\\overline{x}$ covers $2^{4-2} = 4$ rows and $yz$ covers 4; they share $\\overline{w}\\,\\overline{x}yz$ (1 row). By inclusion–exclusion $4 + 4 - 1 = 7$."},
        {"title": "Cross-check with the factors", "body": "Directly from the POS: the zero-rows of the five factors are $\\{4, 5, 6, 8, 9, 10, 12, 13, 14\\}$ (9 rows), so $f$ is 1 on $16 - 9 = 7$ rows. A stuck-at-0 output is wrong on those 7."},
    ],
    "answer": {"value": "**7** input combinations", "number": 7, "matchesKey": True},
    "shortcut": "Wrong rows of a stuck-at-$v$ output = rows where $f \\ne v$: for stuck-at-0, the number of minterms.",
    "pitfalls": ["Counting the 0s (9) instead of the 1s.", "Adding 4 + 4 without removing the shared minterm $m_3$."],
    "verification": "Part (a)'s minterm list $\\{0, 1, 2, 3, 7, 11, 15\\}$ has 7 entries.",
}

o98 = [0, 3, 4, 7]
SOLUTIONS["cse-1998-a-42"] = {
    "approach": "Concept tested: **a map printed with binary-order labels**. The columns read $BC = 00, 01, 10, 11$, so the end columns are not neighbours. Decode each 1 from its label, re-draw in Gray order, then loop.",
    "concepts": ["Gray order", "Reading a printed map", "XNOR"],
    "given": "Rows $A = 0, 1$; columns printed $BC = 00, 01, 10, 11$; both rows read 1 0 0 1.",
    "steps": [
        {"title": "Decode the 1s", "body": "The 1s are in the columns labelled $BC = 00$ and $BC = 11$, in both rows: $m_0, m_4$ ($B = C = 0$) and $m_3, m_7$ ($B = C = 1$)."},
        {"title": "Re-draw in Gray order", "body": "With columns 00, 01, 11, 10 the 1s sit in the first and third columns, which are not adjacent. Each column is a vertical pair ($A$ changes).", "scene": {"groups": []}},
        {"title": "Loop", "body": "$\\overline{B}\\,\\overline{C}$ ($m_0, m_4$) and $BC$ ($m_3, m_7$): $f = \\overline{B}\\,\\overline{C} + BC = \\overline{B \\oplus C}$.", "scene": {"groups": [grp("B'C'", ABC, "accent"), grp("BC", ABC, "success")]}},
    ],
    "answer": {"value": "(C) $\\overline{B \\oplus C}$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$A \\cdot B$ is 1 only on $m_6, m_7$; the map has 1s in row $A = 0$ too."),
        opt("B", False, "The majority function is 1 on $m_3, m_5, m_6, m_7$; the map has $m_0$ and $m_4$ instead of $m_5, m_6$."),
        opt("C", True, "$\\overline{B \\oplus C}$ is 1 exactly when $B = C$: columns 00 and 11 in both rows."),
        opt("D", False, "$A \\cdot B \\cdot C$ is the single cell $m_7$."),
    ],
    "shortcut": "The value does not depend on the row, so $A$ drops; the 1-columns are $BC = 00$ and $11$, i.e. $B = C$: XNOR.",
    "pitfalls": ["Treating the printed end columns (00 and 11) as a wrap-around group and answering $\\overline{C}$ or $\\overline{B}$-type terms.", "Assuming every printed map is in Gray order."],
    "verification": "Truth table of $\\overline{B \\oplus C}$: 1 for $BC = 00, 11$ and both values of $A$, i.e. $\\{0, 3, 4, 7\\}$. ✓",
    "animation": km(ABC, o98, title="Re-drawn in Gray order"),
}

XYWZ = list("xywz")
o00 = relabel([6, 7, 10, 11, 14, 15], W, XYWZ)
d00 = relabel([1, 3, 5], W, XYWZ)
SOLUTIONS["cse-2000-a-2-11"] = {
    "approach": "Concept tested: **expressions that implement a map with don't-cares**. An expression implements the map if it agrees on every care cell (1s and 0s); don't-cares may go either way. Check each option against the cells.",
    "concepts": ["Don't-cares", "Equivalent forms", "Reading a printed map"],
    "given": "Rows $xy$, columns $wz$ (Gray order). 1s: $xy = 11$ (whole row), $xy = 01$ at $wz = 11, 10$. Don't-cares at $wz = 01$ in rows 00, 01, 10.",
    "steps": [
        {"title": "Read the map", "body": "Over $(w, x, y, z)$ the 1s are $m_6, m_7, m_{10}, m_{11}, m_{14}, m_{15}$ (all with $y = 1$ and $w + x = 1$) and the don't-cares $m_1, m_3, m_5$.", "scene": {"groups": []}},
        {"title": "Loop", "body": "Row $xy = 11$ is the quad $xy$; the cells $xy = 01, 11$ in columns $wz = 11, 10$ form the quad $wy$. So $f = xy + wy = (w + x)y$; the don't-cares are not needed.", "scene": {"groups": [grp("xy", XYWZ, "accent"), grp("wy", XYWZ, "success")]}},
        {"title": "Check each option", "body": "(A) $(w + x)y$ is the loop result. (B) $xy + yw$ is the same thing expanded. (C) $(w + x)(\\overline{w} + y)(\\overline{x} + y)$: for $w = 1$ it reduces to $1 \\cdot y \\cdot (\\overline{x} + y) = y$, for $w = 0$ to $x \\cdot 1 \\cdot (\\overline{x} + y) = xy$; so it is $wy + xy = (w + x)y$ exactly. All three implement the map."},
    ],
    "answer": {"value": "(D) None of the above: (A), (B) and (C) all implement the map", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Implements the map: it is exactly the two quads factored."),
        opt("B", False, "Implements the map: the two quads $xy$ and $wy$."),
        opt("C", False, "Implements the map: split on $w$; it is $y$ when $w = 1$ and $xy$ when $w = 0$, i.e. exactly $(w + x)y$ (and 0 on the don't-cares $m_1, m_3, m_5$, which is allowed)."),
        opt("D", True, "Since all three implement the map, none of them is the one that does NOT."),
    ],
    "shortcut": "Factor first: $xy + wy = (w + x)y$, so (A) and (B) are one function; then test (C) on the few care cells it could disagree on.",
    "pitfalls": ["Requiring an option to be equal on the don't-care cells too.", "Reading the rows as $wx$: the labels are $xy$ on the rows and $wz$ on the columns."],
    "verification": "Over all 16 rows, each of (A), (B), (C) agrees with the map on the 13 care cells (by enumeration).",
    "animation": km(XYWZ, o00, d00, title="Rows xy, columns wz (as printed)"),
}

SOLUTIONS["it-2004-it-44"] = {
    "approach": "Concept tested: **minterm expansion and a 3-variable K-map**. Turn each product into its minterm, plot, loop, and compare with the options by minterm lists.",
    "concepts": ["Minterms", "Karnaugh map", "Equivalent forms"],
    "steps": [
        {"title": "Minterms", "body": "$A\\overline{B}C = m_5$, $\\overline{A}BC = m_3$, $AB\\overline{C} = m_6$, $\\overline{A}\\,\\overline{B}C = m_1$, $A\\overline{B}\\,\\overline{C} = m_4$. So $f = \\Sigma m(1, 3, 4, 5, 6)$.", "scene": {"groups": []}},
        {"title": "Forced loops", "body": "$m_3$ pairs only with $m_1$: $\\overline{A}C$. $m_6$ pairs only with $m_4$: $A\\overline{C}$.", "scene": {"groups": [grp("A'C", ABC, "accent"), grp("AC'", ABC, "success")]}},
        {"title": "The last 1", "body": "$m_5$ can pair with $m_4$ ($A\\overline{B}$) or with $m_1$ ($\\overline{B}C$); both cost 2 literals, so there are two minimal SOPs. Option (B) uses $A\\overline{B}$.", "scene": {"groups": [grp("A'C", ABC, "accent"), grp("AC'", ABC, "success"), grp("AB'", ABC, "warning")]}},
    ],
    "answer": {"value": "(B) $A\\overline{B} + A\\overline{C} + \\overline{A}C$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$A\\overline{C} + AB + \\overline{A}C = \\Sigma(1, 3, 4, 6, 7)$: has $m_7$, lacks $m_5$."),
        opt("B", True, "$\\Sigma(4, 5) \\cup \\Sigma(4, 6) \\cup \\Sigma(1, 3) = \\Sigma(1, 3, 4, 5, 6)$."),
        opt("C", False, "$\\overline{A}B + A\\overline{C} + A\\overline{B} = \\Sigma(2, 3, 4, 5, 6)$: has $m_2$, lacks $m_1$."),
        opt("D", False, "$\\overline{A}B + AC + A\\overline{B} = \\Sigma(2, 3, 4, 5, 7)$."),
    ],
    "shortcut": "Only option (B) contains $\\overline{A}C$ and no $\\overline{A}B$; checking $m_1 = \\overline{A}\\,\\overline{B}C$ alone already rules out (C) and (D).",
    "pitfalls": ["The reprint prints the fifth term as $A\\overline{B}C$ again and option (B) without its '+'; the original paper (and this bank, repaired) has $A\\overline{B}\\,\\overline{C}$.", "Thinking the minimal SOP is unique: $\\overline{B}C$ could replace $A\\overline{B}$."],
    "verification": "Enumerating all eight rows, only option (B) matches the function on every row.",
    "animation": km(ABC, [1, 3, 4, 5, 6]),
}

SOLUTIONS["cse-2005-cs-18"] = {
    "approach": "Concept tested: **minimising a Σ list** and matching it against options. Loop the forced 1s first; then compare the options term by term.",
    "concepts": ["Karnaugh map", "Essential groups", "Minimal SOP"],
    "steps": [
        {"title": "Plot", "body": "$f = \\Sigma(1, 4, 5, 9, 11, 12)$ over $(A, B, C, D)$.", "scene": {"groups": []}},
        {"title": "Forced loops", "body": "$m_{12}$ (1100) has one neighbouring 1, $m_4$: pair $B\\overline{C}\\,\\overline{D}$. $m_{11}$ (1011) has one, $m_9$: pair $A\\overline{B}D$.", "scene": {"groups": [grp("BC'D'", ABCD, "accent"), grp("AB'D", ABCD, "success")]}},
        {"title": "The rest", "body": "Left: $m_1, m_5$ (and $m_4, m_9$ are already covered). The pair $m_1, m_5$ is $\\overline{A}\\,\\overline{C}D$.", "scene": {"groups": [grp("BC'D'", ABCD, "accent"), grp("AB'D", ABCD, "success"), grp("A'C'D", ABCD, "warning")]}},
    ],
    "answer": {"value": "(A) $B\\overline{C}\\,\\overline{D} + \\overline{A}\\,\\overline{C}D + A\\overline{B}D$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Exactly the three loops; their union is $\\{1, 4, 5, 9, 11, 12\\}$."),
        opt("B", False, "$AB\\overline{C}$ covers $m_{12}, m_{13}$: $m_{13}$ is a 0."),
        opt("C", False, "$AC\\overline{D}$ covers $m_{10}, m_{14}$, both 0s."),
        opt("D", False, "$\\overline{A}BD$ covers $m_5, m_7$: $m_7$ is a 0."),
    ],
    "shortcut": "Check a single minterm that only one option can produce: $m_{11} = A\\overline{B}CD$ is covered only by $A\\overline{B}D$, which only (A) has.",
    "pitfalls": ["Grabbing the pair $m_1, m_9$ ($\\overline{B}\\,\\overline{C}D$) first: it is a prime implicant, but then $m_5$ needs a fourth term (12 literals instead of 9).", "Not checking the extra minterms an option's terms bring in."],
    "verification": "Expanding (A): $\\{4, 12\\} \\cup \\{1, 5\\} \\cup \\{9, 11\\}$ = the given list; 9 literals, the minimum (by Quine–McCluskey and Petrick).",
    "animation": km(ABCD, [1, 4, 5, 9, 11, 12]),
}

SOLUTIONS["cse-2007-cs-32"] = {
    "approach": "Concept tested: **equality of SOP expressions**. Two SOPs are equivalent iff they have the same minterm list; expand each of P, Q, R, S with dash patterns and compare with $\\Sigma(0, 4, 5, 7, 8, 9, 13, 15)$.",
    "concepts": ["Equivalent forms", "Minterm expansion", "Consensus"],
    "steps": [
        {"title": "The function", "body": "$f = \\Sigma(0, 4, 5, 7, 8, 9, 13, 15)$ over $(w, x, y, z)$. Its minimal SOP is $xz + \\overline{w}\\,\\overline{y}\\,\\overline{z} + w\\overline{x}\\,\\overline{y}$.", "scene": {"groups": [grp("xz", W, "accent"), grp("w'y'z'", W, "success"), grp("wx'y'", W, "warning")]}},
        {"title": "Statements P and Q", "body": "(P) $\\overline{x}\\,\\overline{y}\\,\\overline{z} = \\{0, 8\\}$, $\\overline{w}x\\overline{y} = \\{4, 5\\}$, $w\\overline{y}z = \\{9, 13\\}$, $xz = \\{5, 7, 13, 15\\}$: union = $f$. (Q) $\\{0, 4\\} \\cup \\{8, 9\\} \\cup \\{5, 7, 13, 15\\}$ = $f$."},
        {"title": "Statement R", "body": "(R) $\\{0, 4\\} \\cup \\{8, 9\\} \\cup \\{7, 15\\} \\cup \\{5, 13\\}$ = $f$ (it just splits $xz$ into two pairs)."},
        {"title": "Statement S", "body": "(S) $\\overline{x}\\,\\overline{y}\\,\\overline{z} = \\{0, 8\\}$, $w\\overline{x}\\,\\overline{y} = \\{8, 9\\}$, $\\overline{w}y = \\{2, 3, 6, 7\\}$: it contains $m_2, m_3, m_6$ (0s of $f$) and misses $m_4, m_5, m_{13}, m_{15}$. Not equivalent."},
    ],
    "answer": {"value": "(D) S only", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "P is equivalent (its terms cover exactly the eight minterms)."),
        opt("B", False, "Q is equivalent; it is in fact the minimal SOP."),
        opt("C", False, "R is equivalent: $xyz + x\\overline{y}z = xz$."),
        opt("D", True, "Only S has a different minterm list."),
    ],
    "shortcut": "Look for a term that is obviously too big or in the wrong place: $\\overline{w}y$ in S includes $m_2 = 0010$, which is not in the list.",
    "pitfalls": ["Thinking a non-minimal expression (P, R) is 'not equivalent'.", "Comparing shapes of terms instead of minterm sets."],
    "verification": "Enumeration over all 16 rows: P, Q, R agree with $f$ everywhere; S differs on 7 rows.",
    "animation": km(W, [0, 4, 5, 7, 8, 9, 13, 15]),
}

SOLUTIONS["cse-2007-cs-9"] = {
    "approach": "Concept tested: **variables a function ignores**. $f$ ignores a variable iff its minterm list is closed under flipping that variable (adding or subtracting its weight).",
    "concepts": ["Free variables", "Karnaugh map"],
    "steps": [
        {"title": "Weights", "body": "In $f(w, x, y, z)$ the weights are $w = 8$, $x = 4$, $y = 2$, $z = 1$."},
        {"title": "Test each variable", "body": "List $\\{1, 3, 4, 6, 9, 11, 12, 14\\}$.\n\n- $w$ (±8): 1↔9, 3↔11, 4↔12, 6↔14, all present: **ignored**.\n- $y$ (±2): 1↔3, 4↔6, 9↔11, 12↔14, all present: **ignored**.\n- $x$ (±4): $m_1$ in, $m_5$ out: depends.\n- $z$ (±1): $m_1$ in, $m_0$ out: depends.", "scene": {"groups": [grp("x'z", W, "accent"), grp("xz'", W, "success")]}},
        {"title": "Minimal form", "body": "$f = \\overline{x}z + x\\overline{z} = x \\oplus z$: only $x$ and $z$ appear."},
    ],
    "answer": {"value": "(B) independent of two variables ($w$ and $y$)", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "It ignores two variables, $w$ and $y$, not just one."),
        opt("B", True, "$f = x \\oplus z$ does not involve $w$ or $y$."),
        opt("C", False, "It depends on both $x$ and $z$ (flipping either changes $f$)."),
        opt("D", False, "Flipping $w$ or $y$ never changes $f$."),
    ],
    "shortcut": "The list splits into pairs $(m, m + 8)$ and also into pairs $(m, m + 2)$, so flipping $w$ or $y$ never changes $f$: both are free.",
    "pitfalls": ["Concluding 'depends on all' because all four variables appear in the minterms.", "Testing only one minterm per variable for independence (one counterexample proves dependence, but independence needs every minterm)."],
    "verification": "The truth table of $x \\oplus z$ over $(w, x, y, z)$ has exactly the minterms 1, 3, 4, 6, 9, 11, 12, 14.",
    "animation": km(W, [1, 3, 4, 6, 9, 11, 12, 14]),
}

abcd = list("abcd")
o78 = [0, 1, 4, 5, 8, 10, 12, 13, 14]
SOLUTIONS["it-2007-cs-78"] = {
    "approach": "Concept tested: **plotting an expression on a map** whose axes are labelled with letters ($\\bar a\\bar b$, $\\bar a b$, $ab$, $a\\bar b$ = 00, 01, 11, 10). Expand each term with dashes and compare cell by cell with the four option maps.",
    "concepts": ["Plotting a K-map", "Minterm expansion"],
    "steps": [
        {"title": "Expand the terms", "body": "$a\\bar d = 1{-}{-}0 = \\{8, 10, 12, 14\\}$; $\\bar a\\bar c = 0{-}0{-} = \\{0, 1, 4, 5\\}$; $b\\bar c d = {-}101 = \\{5, 13\\}$. Union: $\\{0, 1, 4, 5, 8, 10, 12, 13, 14\\}$.", "scene": {"groups": [grp("a'c'", abcd, "accent"), grp("ad'", abcd, "success"), grp("bc'd", abcd, "warning")]}},
        {"title": "Row by row", "body": "Row $\\bar a\\bar b$: $\\bar c\\bar d, \\bar c d$. Row $\\bar a b$: $\\bar c\\bar d, \\bar c d$. Row $ab$: $\\bar c\\bar d, \\bar c d, c\\bar d$. Row $a\\bar b$: $\\bar c\\bar d, c\\bar d$."},
        {"title": "Compare", "body": "Option (A)'s crosses are exactly these. (B) misses $\\bar a b \\bar c d$ ($m_5$) and adds $a\\bar b\\bar c d$ ($m_9$); (C) adds $\\bar a b c\\bar d$ ($m_6$); (D) adds $a\\bar b cd$ ($m_{11}$)."},
    ],
    "answer": {"value": "(A)", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Its crosses are exactly $m_0, m_1, m_4, m_5, m_8, m_{10}, m_{12}, m_{13}, m_{14}$."),
        opt("B", False, "Row $\\bar a b$ has only $\\bar c\\bar d$ (misses $m_5$), and row $a\\bar b$ has an extra $\\bar c d$ ($m_9$)."),
        opt("C", False, "Row $\\bar a b$ has an extra cross at $c\\bar d$ ($m_6$), which no term of the expression covers."),
        opt("D", False, "Row $a\\bar b$ has $\\bar c\\bar d, cd, c\\bar d$: the $cd$ cell ($m_{11}$) is not covered by any term."),
    ],
    "shortcut": "Check the cells only one option disagrees on: $m_5$ ($\\bar a b\\bar c d$) is covered by $\\bar a\\bar c$, which kills (B); $m_6$ and $m_{11}$ are 0s, which kill (C) and (D).",
    "pitfalls": ["Reading a bar as 1.", "Forgetting the wrap: $a\\bar d$ covers both outer columns of rows $ab$ and $a\\bar b$."],
    "verification": "Re-plotting each option's crosses as a minterm set (from the figure) gives a match only for (A).",
    "animation": km(abcd, o78),
}

SOLUTIONS["it-2007-cs-79"] = {
    "approach": "Concept tested: **equivalent SOPs of one map**. The map from Q78 is $\\Sigma(0, 1, 4, 5, 8, 10, 12, 13, 14)$; expand every option and find the one whose minterm list differs.",
    "concepts": ["Equivalent forms", "Minterm expansion"],
    "steps": [
        {"title": "The function", "body": "$f = \\bar a\\bar c + a\\bar d + b\\bar c d = \\Sigma(0, 1, 4, 5, 8, 10, 12, 13, 14)$; its minimal SOP is $\\bar a\\bar c + a\\bar d + b\\bar c$.", "scene": {"groups": [grp("a'c'", abcd, "accent"), grp("ad'", abcd, "success"), grp("bc'", abcd, "warning")]}},
        {"title": "Expand each option", "body": "(A) $\\bar c\\bar d = \\{0, 4, 8, 12\\}$, $a\\bar d$, $ab\\bar c = \\{12, 13\\}$, $\\bar a\\bar c d = \\{1, 5\\}$: union = $f$.\n\n(B) $\\bar a\\bar c$, $\\bar c\\bar d$, $a\\bar d$, $ab\\bar c d = \\{13\\}$: union = $f$.\n\n(C) $\\bar a\\bar c$, $a\\bar d$, $ab\\bar c$, $\\bar c d = \\{1, 5, 9, 13\\}$: contains $m_9$, a 0.\n\n(D) $\\bar b\\bar c\\bar d = \\{0, 8\\}$, $ac\\bar d = \\{10, 14\\}$, $\\bar a\\bar c$, $ab\\bar c$: union = $f$."},
    ],
    "answer": {"value": "(C)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Equal to the map (not minimal, but it represents it)."),
        opt("B", False, "Equal to the map."),
        opt("C", True, "$\\bar c d$ covers $m_9 = a\\bar b\\bar c d$, which is 0 on the map."),
        opt("D", False, "Equal to the map: $\\bar b\\bar c\\bar d + ac\\bar d$ is another way to cover the $a\\bar d$ cells with $\\bar a\\bar c$'s help."),
    ],
    "shortcut": "Look for a term whose cells leave the 1-region: $\\bar c d$ spans all four rows of column $\\bar c d$, and row $a\\bar b$ of that column is 0.",
    "pitfalls": ["Assuming that only the minimal SOP 'corresponds' to the map.", "Missing that $\\bar c d$ is a 4-cell term (it covers a whole column)."],
    "verification": "Enumeration: options A, B, D agree with the map on all 16 cells; C disagrees only on $m_9$.",
    "animation": km(abcd, o78),
}

SOLUTIONS["it-2008-it-8"] = {
    "approach": "Concept tested: **free variables**. Test each variable for closure of the minterm list under flipping it; or minimise and see which variables survive.",
    "concepts": ["Free variables", "Karnaugh map"],
    "steps": [
        {"title": "Test D (weight 1)", "body": "$\\{2, 3, 6, 7, 8, 9, 10, 11, 12, 13\\}$ pairs as 2↔3, 6↔7, 8↔9, 10↔11, 12↔13: closed, so $f$ **ignores D**."},
        {"title": "Test A, B, C", "body": "$A$ (±8): $m_2$ in, $m_{10}$ in, but $m_3 \\to 11$ in, $m_6 \\to 14$ out: depends. $B$ (±4): $m_2$ in, $m_6$ in, $m_3 \\to 7$ in, $m_8 \\to 12$ in, $m_{10} \\to 14$ out: depends. $C$ (±2): $m_8 \\to 10$ in, $m_{12} \\to 14$ out: depends.", "scene": {"groups": [grp("A'C", ABCD, "accent"), grp("AC'", ABCD, "success"), grp("AB'", ABCD, "warning")]}},
        {"title": "Minimal form", "body": "$f = \\overline{A}C + A\\overline{C} + A\\overline{B}$ (or $\\overline{B}C$ in place of $A\\overline{B}$): no $D$ anywhere."},
    ],
    "answer": {"value": "(A) independent of one variable ($D$)", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Only $D$ is free."),
        opt("B", False, "$A$, $B$ and $C$ each change $f$ somewhere (e.g. $m_{10}$ vs $m_{14}$ for $B$)."),
        opt("C", False, "Three free variables would make $f$ a single literal (or a constant), with 8 (or 0 or 16) minterms; this function has 10."),
        opt("D", False, "Flipping $D$ never changes $f$."),
    ],
    "shortcut": "The list is made of consecutive even–odd pairs (2,3), (6,7), (8,9), (10,11), (12,13): that is exactly 'independent of the last variable'.",
    "pitfalls": ["Stopping after finding one free variable without checking the others.", "Using the wrong weight for a variable."],
    "verification": "$f$ as a function of $(A, B, C)$ alone is $\\Sigma(1, 3, 4, 5, 6)$ (dividing each minterm by 2), which depends on all three.",
    "animation": km(ABCD, [2, 3, 6, 7, 8, 9, 10, 11, 12, 13]),
}

PQR = list("PQR")
SOLUTIONS["cse-2011-cs-14"] = {
    "approach": "Concept tested: **POS of maxterms → minimal SOP**. Each factor contains all three variables, so it is one maxterm; the function is 1 on every other row.",
    "concepts": ["Maxterms", "POS to SOP", "Karnaugh map"],
    "steps": [
        {"title": "The zeros", "body": "$(P + \\overline{Q} + \\overline{R}) = 0$ at $P = 0, Q = 1, R = 1$: $M_3$. $(P + \\overline{Q} + R) = M_2$. $(P + Q + \\overline{R}) = M_1$. So $f = \\Pi M(1, 2, 3) = \\Sigma m(0, 4, 5, 6, 7)$.", "scene": {"groups": []}},
        {"title": "Loop", "body": "Row $P = 1$ is a quad: $P$. $m_0$ pairs with $m_4$ (column $QR = 00$): $\\overline{Q}\\,\\overline{R}$.", "scene": {"groups": [grp("P", PQR, "accent"), grp("Q'R'", PQR, "success")]}},
        {"title": "Algebra check", "body": "The first two factors combine: $(P + \\overline{Q} + \\overline{R})(P + \\overline{Q} + R) = P + \\overline{Q}$. Then $(P + \\overline{Q})(P + Q + \\overline{R}) = P + \\overline{Q}(Q + \\overline{R}) = P + \\overline{Q}\\,\\overline{R}$."},
    ],
    "answer": {"value": "(B) $P + \\overline{Q}\\,\\overline{R}$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\overline{P}Q + \\overline{R}$ is 1 on $m_2, m_3$, which are 0s."),
        opt("B", True, "The two loops."),
        opt("C", False, "$\\overline{P}Q + R$ is 1 on $m_1, m_3$ (0s)."),
        opt("D", False, "$PQ + R$ misses $m_0$ and $m_4$ and adds $m_1, m_3$."),
    ],
    "shortcut": "The three zeros all have $P = 0$ and are not $\\overline{Q}\\,\\overline{R}$: so $f = 1$ iff $P = 1$ or $Q = R = 0$.",
    "pitfalls": ["Reading the maxterm indices as minterms (Σ/Π mix-up), which gives $\\overline{P}(Q + R)$.", "Writing the POS's literals as a product directly."],
    "verification": "$P + \\overline{Q}\\,\\overline{R}$ at $P = 0$: 1 only for $QR = 00$, so it is 0 on rows 1, 2, 3, exactly the three maxterms.",
    "animation": km(PQR, [0, 4, 5, 6, 7]),
}

PQRS = list("PQRS")
SOLUTIONS["cse-2014-1-cs-7"] = {
    "approach": "Concept tested: **minimal SOP by map or algebra**. Expand the three terms into cells, loop the largest groups; or factor $Q$ out and use $x + \\overline{x}y = x + y$ twice.",
    "concepts": ["Minimal SOP", "Absorption", "Karnaugh map"],
    "steps": [
        {"title": "Plot", "body": "$PQ = \\{12, 13, 14, 15\\}$, $\\overline{P}QR = \\{6, 7\\}$, $\\overline{P}Q\\overline{R}S = \\{5\\}$: $F = \\Sigma(5, 6, 7, 12, 13, 14, 15)$.", "scene": {"groups": []}},
        {"title": "Loop", "body": "Quads $PQ$ (12–15), $QR$ (6, 7, 14, 15) and $QS$ (5, 7, 13, 15): each is needed ($m_{12}$ only in $PQ$, $m_6$ only in $QR$, $m_5$ only in $QS$).", "scene": {"groups": [grp("PQ", PQRS, "accent"), grp("QR", PQRS, "success"), grp("QS", PQRS, "warning")]}},
        {"title": "Algebra check", "body": "$F = Q(P + \\overline{P}R + \\overline{P}\\,\\overline{R}S) = Q(P + R + \\overline{R}S) = Q(P + R + S) = PQ + QR + QS$."},
    ],
    "answer": {"value": "(A) $PQ + QR + QS$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The three essential quads."),
        opt("B", False, "$P + Q + R + S$ is 1 on 15 rows; $F$ has only 7 minterms."),
        opt("C", False, "$\\overline{P} + \\overline{Q} + \\overline{R} + \\overline{S}$ is 0 only on $m_{15}$, the opposite of $F$ there."),
        opt("D", False, "$\\overline{P}R + \\overline{P}\\,\\overline{R}S + P$ drops the common factor $Q$ entirely, adding many 0-rows."),
    ],
    "shortcut": "Every term contains $Q$, so $F = Q \\cdot (\\dots)$, and (B), (C), (D) are 1 somewhere with $Q = 0$: only (A) survives.",
    "pitfalls": ["Dropping the common $Q$ while simplifying.", "Stopping at $Q(P + R + S)$ when the question asks for SOP form."],
    "verification": "Expanding (A) gives $\\{12..15\\} \\cup \\{6, 7, 14, 15\\} \\cup \\{5, 7, 13, 15\\} = \\{5, 6, 7, 12, 13, 14, 15\\}$. ✓",
    "animation": km(PQRS, [5, 6, 7, 12, 13, 14, 15]),
}

SOLUTIONS["cse-2015-2-cs-37"] = {
    "approach": "Concept tested: **counting the minterms of a complemented expression**. Find the rows where the bracket is 0; those are the minterms of its complement.",
    "concepts": ["Complement", "Counting minterms", "De Morgan"],
    "steps": [
        {"title": "When is the bracket 0?", "body": "$D' + AB' + A'C + AC'D + A'C'D$ is 0 only if every term is 0. $D' = 0$ forces $D = 1$."},
        {"title": "With D = 1", "body": "The bracket becomes $AB' + A'C + AC' + A'C'$. Now $A'C + A'C' = A'$ and $AC'$: the sum is $A' + AB' + AC' = A' + B' + C'$ (redundant-literal rule). It is 0 only for $A = B = C = 1$."},
        {"title": "Count", "body": "The bracket is 0 on exactly one row, $ABCD = 1111$, so its complement has one minterm, $m_{15}$."},
    ],
    "answer": {"value": "**1** minterm ($ABCD$)", "number": 1, "matchesKey": True},
    "shortcut": "A sum is 0 only when every term is 0: $D = 1$ kills $D'$; then $A'C + A'C'$ forces $A = 1$, $AB'$ forces $B = 1$, $AC'D$ forces $C = 1$. One row.",
    "pitfalls": ["Counting the minterms of the bracket (15) instead of its complement.", "Expanding term by term and losing track of overlaps."],
    "verification": "Enumerating all 16 rows, the bracket is 1 on 15 of them and 0 only on 1111.",
}

SOLUTIONS["cse-2021-2-cs-52"] = {
    "approach": "Concept tested: **a function defined by conditions**. Each condition fills a region of the map; fill them all, notice the cells no condition reaches, and minimise with those cells as don't-cares.",
    "concepts": ["Partial specification", "Don't-cares", "Literal count"],
    "steps": [
        {"title": "f(w, 0, 0, z) = 1", "body": "$x = y = 0$: cells 0, 1, 8, 9 are 1."},
        {"title": "f(1, x, 1, z) = x + z", "body": "$w = 1$, $y = 1$: cells 10 ($x = z = 0$) → 0, and 11, 14, 15 → 1."},
        {"title": "f(w, 1, y, z) = wz + y", "body": "$x = 1$: cell 4 (0100) → 0, 5 → 0, 6 → 1, 7 → 1, 12 → 0, 13 → 1, 14 → 1, 15 → 1 (agreeing with the previous condition on 14, 15)."},
        {"title": "Unreached cells", "body": "Cells 2 (0010) and 3 (0011) have $w = 0$, $x = 0$, $y = 1$: no condition covers them. Treat them as don't-cares.", "scene": {"groups": []}},
        {"title": "Minimise", "body": "1s: 0, 1, 6, 7, 8, 9, 11, 13, 14, 15. Loops: $\\overline{x}\\,\\overline{y}$ (0, 1, 8, 9), $xy$ (6, 7, 14, 15), $wz$ (9, 11, 13, 15). The don't-cares are not needed. $f = \\overline{x}\\,\\overline{y} + xy + wz$: 6 literals.", "scene": {"groups": [grp("x'y'", W, "accent"), grp("xy", W, "success"), grp("wz", W, "warning")]}},
    ],
    "answer": {"value": "**6** literals ($\\overline{x}\\,\\overline{y} + xy + wz$)", "number": 6, "matchesKey": True},
    "shortcut": "Each condition is a cofactor: $f = \\overline{x}\\,\\overline{y}$ on its region, $= wz + y$ when $x = 1$, $= x + z$ when $w = y = 1$; the three quads appear directly.",
    "pitfalls": ["Setting the unreached cells 2 and 3 to 1 (cost 8) or to 0 and 1 (cost 9): choose them to minimise.", "Missing that the conditions overlap and must agree (cells 14, 15)."],
    "verification": "Of the four functions that satisfy the three conditions, the minimal SOPs cost 6, 8, 8 and 9 literals (enumeration); the intended answer is the minimum, 6.",
    "animation": km(W, [0, 1, 6, 7, 8, 9, 11, 13, 14, 15], [2, 3]),
}

B3 = ["b3", "b2", "b1", "b0"]
SOLUTIONS["cse-2025-1-cs-32"] = {
    "approach": "Concept tested: **minimal SOP with corners and a wrap-around column**. Start from the loneliest 1 ($m_{11}$), then the full column, then the corners.",
    "concepts": ["Karnaugh map", "Corner quad", "Minimal SOP"],
    "steps": [
        {"title": "Plot", "body": "$F = \\Sigma(0, 2, 4, 8, 10, 11, 12)$ over $(b_3, b_2, b_1, b_0)$.", "scene": {"groups": []}},
        {"title": "The loner", "body": "$m_{11}$ (1011) has only one neighbouring 1, $m_{10}$: pair $b_3\\overline{b_2}b_1$.", "scene": {"groups": [grp("b3b2'b1", B3, "warning", "b₃b₂′b₁")]}},
        {"title": "Column and corners", "body": "Column $b_1b_0 = 00$ ($m_0, m_4, m_{12}, m_8$): $\\overline{b_1}\\,\\overline{b_0}$. Corners ($m_0, m_2, m_8, m_{10}$): $\\overline{b_2}\\,\\overline{b_0}$, needed for $m_2$.", "scene": {"groups": [grp("b3b2'b1", B3, "warning", "b₃b₂′b₁"), grp("b1'b0'", B3, "accent", "b₁′b₀′"), grp("b2'b0'", B3, "success", "b₂′b₀′")]}},
    ],
    "answer": {"value": "(A) $\\overline{b}_1\\overline{b}_0 + \\overline{b}_2\\overline{b}_0 + b_1\\overline{b}_2b_3$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The three loops; 7 literals."),
        opt("B", False, "Misses $m_{11}$ (1011 has $b_0 = 1$)."),
        opt("C", False, "$b_1b_2b_3$ covers $m_{14}, m_{15}$ (0s) and the cover misses $m_4, m_{11}, m_{12}$."),
        opt("D", False, "$\\overline{b}_3$ covers all of $m_0$–$m_7$, including 0s like $m_1$."),
    ],
    "shortcut": "$m_{11} = 1011$ has $b_0 = 1$, so it needs a term without $\\overline{b}_0$: only (A)'s $b_1\\overline{b}_2b_3$ qualifies ((C)'s $b_1b_2b_3$ needs $b_2 = 1$, (D)'s $\\overline{b}_3$ needs $b_3 = 0$).",
    "pitfalls": ["Forgetting the corners are a quad (writing $\\overline{b}_2\\overline{b}_1\\overline{b}_0$ and $\\overline{b}_2 b_1\\overline{b}_0$ separately).", "Missing the loner $m_{11}$ (option B)."],
    "verification": "Union of the loops: $\\{0, 4, 8, 12\\} \\cup \\{0, 2, 8, 10\\} \\cup \\{10, 11\\}$ = the given list.",
    "animation": km(B3, [0, 2, 4, 8, 10, 11, 12]),
}

o25 = [0, 2, 5, 7, 8, 10, 13, 15]
SOLUTIONS["cse-2025-2-cs-33"] = {
    "approach": "Concept tested: **expressions equal to a map** (MSQ). The map is corners + centre, $\\overline{x}\\,\\overline{z} + xz$; expand every option and compare minterm lists; an option need not be minimal to be correct.",
    "concepts": ["Equivalent forms", "Corner quad", "XNOR pattern"],
    "steps": [
        {"title": "Read the map", "body": "Rows $wx$, columns $yz$: rows 1 and 4 read 1 0 0 1, rows 2 and 3 read 0 1 1 0. 1s: $m_0, m_2, m_8, m_{10}$ (corners) and $m_5, m_7, m_{13}, m_{15}$ (centre).", "scene": {"groups": [grp("x'z'", W, "accent"), grp("xz", W, "success")]}},
        {"title": "Option by option", "body": "(A) the four corner minterms written out plus $xz$: same set. (B) has $w\\overline{x}yz = m_{11}$ (a 0) and lacks $m_8, m_{10}$. (C) has $w\\overline{x}\\,\\overline{y}z = m_9$ (a 0) and lacks $m_2, m_{10}$. (D) $\\overline{x}\\,\\overline{z} + xz$ is the minimal form."},
    ],
    "answer": {"value": "(A) and (D)", "choice": ["A", "D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Corners as four minterms plus the centre quad: equal (not minimal)."),
        opt("B", False, "Contains $m_{11}$ and misses $m_8$, $m_{10}$."),
        opt("C", False, "Contains $m_9$ and misses $m_2$, $m_{10}$."),
        opt("D", True, "The two quads: corners $\\overline{x}\\,\\overline{z}$ and centre $xz$."),
    ],
    "shortcut": "Any correct option must contain all four corners; (B) and (C) each list a non-corner cell among their minterms.",
    "pitfalls": ["Rejecting (A) because it is not minimal: the question asks which expressions represent $F$.", "Reading the corners as two pairs only."],
    "verification": "Enumeration: (A) and (D) match the map on all 16 cells; (B) and (C) differ on 3 cells each.",
    "animation": km(W, o25),
}

SOLUTIONS["cse-2026-2-cs-30"] = {
    "approach": "Concept tested: **an octet**. The eight minterms are rows $AB = 00$ and $AB = 10$, which are adjacent through the wrap: one group of 8 = one literal.",
    "concepts": ["Group size", "Wrap-around", "Minimal SOP"],
    "steps": [
        {"title": "Binary patterns", "body": "0–3 are $00{-}{-}$ and 8–11 are $10{-}{-}$: in all eight, $B = 0$; $A$, $C$, $D$ take every combination."},
        {"title": "On the map", "body": "Rows $AB = 00$ (top) and $10$ (bottom) are neighbours across the top/bottom border: an octet. $2^3$ cells keep $4 - 3 = 1$ literal: $\\overline{B}$.", "scene": {"groups": [grp("B'", ABCD, "accent")]}},
    ],
    "answer": {"value": "(B) $B'$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$A' + B' + C' + D'$ is 0 only on $m_{15}$: 15 minterms."),
        opt("B", True, "The octet."),
        opt("C", False, "$A'B' + AB$ is $\\{0..3\\} \\cup \\{12..15\\}$: the wrong second block."),
        opt("D", False, "$A'$ is $m_0$–$m_7$."),
    ],
    "shortcut": "The list is closed under ±8 (flip $A$), ±2 and ±1 (flip $C$, $D$) and contains only $B = 0$ numbers: $f = \\overline{B}$.",
    "pitfalls": ["Not seeing that the top and bottom rows wrap (answering $A'B' + AB'$, which is equal but not minimal).", "Confusing 8–11 ($AB = 10$) with 12–15 ($AB = 11$)."],
    "verification": "$\\overline{B}$ over four variables has $2^3 = 8$ minterms: those with bit $B$ (weight 4) equal to 0, i.e. 0–3 and 8–11. ✓",
    "animation": km(ABCD, [0, 1, 2, 3, 8, 9, 10, 11]),
}


# ── Lesson 2: prime implicants and don't-cares ──────────────────────────────

XYZ = list("xyz")
SOLUTIONS["cse-1997-a-36"] = {
    "approach": "Concept tested: **minterm vs implicant vs prime implicant**. Simplify $f$, then test each claim against the definitions: an implicant's cells must all be 1s; a prime implicant must lose that property when any literal is dropped.",
    "concepts": ["Implicant", "Prime implicant", "Minterm"],
    "steps": [
        {"title": "Simplify f", "body": "$\\overline{x} + \\overline{y}x = \\overline{x} + \\overline{y}$ (redundant-literal rule), so $f = \\overline{x} + \\overline{y} + z = \\Sigma(0, 1, 2, 3, 4, 5, 7)$; only $m_6 = xy\\overline{z}$ is 0.", "scene": {"groups": []}},
        {"title": "The prime implicants", "body": "The 1s are covered by three quads, $\\overline{x}$, $\\overline{y}$ and $z$, each maximal. These are the prime implicants.", "scene": {"groups": [grp("x'", XYZ, "accent"), grp("y'", XYZ, "success"), grp("z", XYZ, "warning")]}},
        {"title": "Test each claim", "body": "(A) $\\overline{y}x$ is an implicant, but it lies inside $\\overline{y}$ (drop $x$ and it is still an implicant): **not prime**.\n\n(B) $xz$ has 2 literals; a minterm of a 3-variable function has 3. **Not a minterm.**\n\n(C) $xz = \\{m_5, m_7\\}$, both 1s: **an implicant**. True.\n\n(D) $y = \\{m_2, m_3, m_6, m_7\\}$ contains the 0-cell $m_6$: not even an implicant."},
    ],
    "answer": {"value": "(C) $xz$ is an implicant of $f$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\overline{y}x \\subset \\overline{y}$, and $\\overline{y}$ is itself an implicant, so $\\overline{y}x$ is not prime."),
        opt("B", False, "A minterm contains all three variables; $xz$ has two."),
        opt("C", True, "Both cells of $xz$ ($m_5$, $m_7$) are 1s."),
        opt("D", False, "$y$ covers $m_6$, where $f = 0$."),
    ],
    "shortcut": "$f$ is 0 only at $xy\\overline{z}$. A product is an implicant iff it avoids that one cell: $xz$ (needs $z = 1$) avoids it; $y$ does not.",
    "pitfalls": ["Calling every term of the given expression a prime implicant: $\\overline{y}x$ and $xz$ are implicants that can be enlarged.", "Confusing 'implicant' with 'minterm'."],
    "verification": "Truth table: $f$ is 1 on every row except 110; $xz$ is 1 on rows 101, 111 only.",
    "animation": km(XYZ, [0, 1, 2, 3, 4, 5, 7]),
}

abc = list("abc")
SOLUTIONS["cse-2004-cs-59"] = {
    "approach": "Concept tested: **essential prime implicants**. List all PIs of $f$, then find the 1-cells that lie in exactly one PI.",
    "concepts": ["Prime implicant", "Essential prime implicant"],
    "steps": [
        {"title": "Minterms", "body": "$\\overline{a}c = \\{1, 3\\}$, $a\\overline{c} = \\{4, 6\\}$, $\\overline{b}c = \\{1, 5\\}$: $f = \\Sigma(1, 3, 4, 5, 6)$.", "scene": {"groups": []}},
        {"title": "All prime implicants", "body": "Pairs: $\\overline{a}c$ (1, 3), $\\overline{b}c$ (1, 5), $a\\overline{b}$ (4, 5), $a\\overline{c}$ (4, 6). No quad fits (each would contain $m_0$, $m_2$ or $m_7$).", "scene": {"groups": [grp("a'c", abc, "accent"), grp("b'c", abc, "info"), grp("ab'", abc, "warning"), grp("ac'", abc, "success")]}},
        {"title": "Distinguished cells", "body": "$m_3$ lies only in $\\overline{a}c$; $m_6$ only in $a\\overline{c}$. $m_1$, $m_4$, $m_5$ each lie in two PIs. So the EPIs are $\\overline{a}c$ and $a\\overline{c}$.", "scene": {"groups": [grp("a'c", abc, "success"), grp("ac'", abc, "success")], "hl": [{"cell": 3, "tone": "warning"}, {"cell": 6, "tone": "warning"}]}},
    ],
    "answer": {"value": "(A) $\\overline{a}c$ and $a\\overline{c}$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The only PIs through $m_3$ and $m_6$ respectively."),
        opt("B", False, "$\\overline{b}c$ is a PI but $m_1$ and $m_5$ are also covered by other PIs: it is selective."),
        opt("C", False, "$a\\overline{c}$ is essential too (through $m_6$)."),
        opt("D", False, "$b\\overline{c} = \\{2, 6\\}$ contains the 0-cell $m_2$: not even an implicant."),
    ],
    "shortcut": "In the given SOP, a term is essential iff it has a cell no other term (and no consensus term) covers: $m_3$ and $m_6$.",
    "pitfalls": ["Assuming every term of the given expression is essential ($\\overline{b}c$ is not).", "Forgetting the PI $a\\overline{b}$, which is not in the expression but competes for $m_4, m_5$."],
    "verification": "Quine–McCluskey on $\\Sigma(1, 3, 4, 5, 6)$ gives the same four PIs; the chart's single-mark columns are 3 and 6.",
    "animation": km(abc, [1, 3, 4, 5, 6]),
}

RSPQ = list("RSPQ")
o06 = ml.from_map(["1001", "0011", "1110", "1001"], "RS", "PQ", RSPQ)[0]
SOLUTIONS["it-2006-cs-35"] = {
    "approach": "Concept tested: **essential prime implicants on a printed map** (rows $RS$, columns $PQ$). List the PIs, find the 1-cells covered by one PI only, and match against the options.",
    "concepts": ["Essential prime implicant", "Corner quad", "Reading a printed map"],
    "given": "Rows $RS$, columns $PQ$ (Gray order). Rows: 00: 1 0 0 1; 01: 0 0 1 1; 11: 1 1 1 0; 10: 1 0 0 1.",
    "steps": [
        {"title": "Read the 1s", "body": "In terms of $(P, Q, R, S)$: the four corners ($Q = 0$, $S = 0$: $m_0, m_2, m_8, m_{10}$), row $RS = 01$ at $PQ = 11, 10$ ($m_{13}, m_9$), row $RS = 11$ at $PQ = 00, 01, 11$ ($m_3, m_7, m_{15}$).", "scene": {"groups": []}},
        {"title": "Prime implicants", "body": "Corner quad $\\overline{Q}\\,\\overline{S}$; pairs $\\overline{P}\\,\\overline{Q}R$ (2, 3), $\\overline{P}RS$ (3, 7), $QRS$ (7, 15), $PQS$ (13, 15), $P\\overline{R}S$ (9, 13), $P\\overline{Q}\\,\\overline{R}$ (8, 9). No other quad fits.", "scene": {"groups": [grp("Q'S'", RSPQ, "success"), grp("P'RS", RSPQ, "accent"), grp("PQS", RSPQ, "warning")]}},
        {"title": "Distinguished cells", "body": "$m_0$ (row 00, column 00) lies only in $\\overline{Q}\\,\\overline{S}$. Every other 1 lies in two PIs (e.g. $m_9$ in $P\\overline{R}S$ and $P\\overline{Q}\\,\\overline{R}$). So $\\overline{Q}\\,\\overline{S}$ is the only EPI.", "scene": {"groups": [grp("Q'S'", RSPQ, "success")], "hl": [{"cell": 0, "tone": "warning"}]}},
    ],
    "answer": {"value": "(D) $\\overline{Q}\\,\\overline{S}$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$QRS$ ($m_7, m_{15}$) is a PI, but $m_7$ is also in $\\overline{P}RS$ and $m_{15}$ in $PQS$."),
        opt("B", False, "$PQS$ ($m_{13}, m_{15}$) is a PI, but both cells have another PI."),
        opt("C", False, "$PQ'S'$ ($m_8, m_{10}$) lies inside the corner quad: an implicant, not prime."),
        opt("D", True, "The corner quad; $m_0$ is covered by nothing else."),
    ],
    "shortcut": "Check the corner cells first: four 1s in the corners almost always form an essential quad, because the corner cells' other neighbours are 0s.",
    "pitfalls": ["Reading the rows as $PQ$ (the paper puts $RS$ on the rows).", "Picking $PQ'S'$, which is inside the corner quad and therefore not prime."],
    "verification": "Quine–McCluskey on $\\Sigma(0, 2, 3, 7, 8, 9, 10, 13, 15)$: 7 PIs; the only single-mark column is $m_0$, under $\\overline{Q}\\,\\overline{S}$.",
    "animation": km(RSPQ, o06, title="Rows RS, columns PQ (as printed)"),
}

SOLUTIONS["cse-2015-3-cs-43"] = {
    "approach": "Concept tested: **counting prime implicants**. Plot the six minterms and grow a maximal loop from every 1; count every maximal loop, whether or not a minimal SOP would use it.",
    "concepts": ["Prime implicant", "Karnaugh map"],
    "steps": [
        {"title": "Plot", "body": "$f(w, x, y, z) = \\Sigma(0, 2, 4, 5, 6, 10)$: row $wx = 00$ has $m_0, m_2$; row 01 has $m_4, m_5, m_6$; row 10 has $m_{10}$.", "scene": {"groups": []}},
        {"title": "Grow from each 1", "body": "$m_0, m_2, m_4, m_6$ form a quad (rows 00, 01; columns 00 and 10, through the wrap): $\\overline{w}\\,\\overline{z}$. $m_5$ pairs only with $m_4$: $\\overline{w}x\\overline{y}$. $m_{10}$ pairs only with $m_2$: $\\overline{x}y\\overline{z}$.", "scene": {"groups": [grp("w'z'", W, "accent"), grp("w'xy'", W, "success"), grp("x'yz'", W, "warning")]}},
        {"title": "Count", "body": "No other loop is maximal (every other pair lies inside the quad). So there are **3** prime implicants, all essential here."},
    ],
    "answer": {"value": "**3** prime implicants", "number": 3, "matchesKey": True},
    "shortcut": "A 1 with a single neighbouring 1 ($m_5$, $m_{10}$) contributes exactly one PI (a pair); the remaining 1s form one quad.",
    "pitfalls": ["Counting the pairs inside the quad (e.g. $m_0, m_2$) as separate prime implicants.", "Missing the wrap-around that makes $m_0, m_2, m_4, m_6$ a quad."],
    "verification": "Quine–McCluskey and a scan of all 81 cubes both give exactly $\\{\\overline{w}\\,\\overline{z}, \\overline{w}x\\overline{y}, \\overline{x}y\\overline{z}\\}$.",
    "animation": km(W, [0, 2, 4, 5, 6, 10]),
}

SOLUTIONS["cse-2018-cs-49"] = {
    "approach": "Concept tested: **essential prime implicants with don't-cares**. Use the Xs to form the largest PIs, then count the PIs that are the only cover of some **1**-cell (a don't-care never makes a PI essential).",
    "concepts": ["Essential prime implicant", "Don't-care conditions"],
    "given": "$F(P, Q, R, S) = \\Sigma m(0, 2, 5, 7, 9, 11) + d(3, 8, 10, 12, 14)$.",
    "steps": [
        {"title": "Plot", "body": "1s: 0, 2, 5, 7, 9, 11. Xs: 3, 8, 10, 12, 14.", "scene": {"groups": []}},
        {"title": "Prime implicants", "body": "Using the Xs: $\\overline{Q}\\,\\overline{S}$ (0, 2, 8, 10), $P\\overline{Q}$ (8, 9, 10, 11), $\\overline{Q}R$ (2, 3, 10, 11), $\\overline{P}QS$ (5, 7), $\\overline{P}RS$ (3, 7). ($P\\overline{S}$ = 8, 10, 12, 14 is made of Xs only, so it covers no 1 and is never used.)", "scene": {"groups": [grp("Q'S'", PQRS, "accent"), grp("PQ'", PQRS, "info"), grp("Q'R", PQRS, "warning"), grp("P'QS", PQRS, "success"), grp("P'RS", PQRS, "cat1")]}},
        {"title": "Distinguished 1-cells", "body": "$m_0$: only $\\overline{Q}\\,\\overline{S}$. $m_5$: only $\\overline{P}QS$. $m_9$: only $P\\overline{Q}$. ($m_2$, $m_7$, $m_{11}$ each lie in two PIs.)", "scene": {"groups": [grp("Q'S'", PQRS, "success"), grp("P'QS", PQRS, "success"), grp("PQ'", PQRS, "success")], "hl": [{"cell": 0, "tone": "warning"}, {"cell": 5, "tone": "warning"}, {"cell": 9, "tone": "warning"}]}},
        {"title": "Count", "body": "3 essential PIs. They already cover every 1, so $F = \\overline{Q}\\,\\overline{S} + \\overline{P}QS + P\\overline{Q}$."},
    ],
    "answer": {"value": "**3** essential prime implicants", "number": 3, "matchesKey": True},
    "shortcut": "Look at the 1s with the fewest 1/X neighbours: $m_0$, $m_5$, $m_9$ each have one maximal loop.",
    "pitfalls": ["Counting a PI as essential because it is the only one through some don't-care cell: essential is decided by 1-cells only.", "Forgetting that the Xs can make the corner quad."],
    "verification": "Quine–McCluskey with the don't-cares, then a chart over the six 1-cells only: single-mark columns 0, 5, 9.",
    "animation": km(PQRS, [0, 2, 5, 7, 9, 11], [3, 8, 10, 12, 14]),
}

SOLUTIONS["cse-1991-b-5-b"] = {
    "approach": "Concept tested: **minimal SOP with don't-cares**. Use an X only when it enlarges a loop: the four corners give one quad, and $m_{15}$ joins three Xs in a second quad.",
    "concepts": ["Don't-care conditions", "Corner quad", "Minimal SOP"],
    "steps": [
        {"title": "Plot", "body": "1s: 0, 2, 8, 10, 15. Xs: 3, 11, 12, 14.", "scene": {"groups": []}},
        {"title": "The corners", "body": "$m_0, m_2, m_8, m_{10}$ are the four corners: $\\overline{B}\\,\\overline{D}$.", "scene": {"groups": [grp("B'D'", ABCD, "accent")]}},
        {"title": "The lone 1 at m15", "body": "$m_{15}$ (1111) has neighbours $X_{14}$, $X_{11}$, $m_7$ (0) and $m_{13}$ (0). The quad $m_{10}, X_{11}, X_{14}, m_{15}$ (rows $AB = 11, 10$, columns $CD = 11, 10$) is $AC$.", "scene": {"groups": [grp("B'D'", ABCD, "accent"), grp("AC", ABCD, "success")]}},
        {"title": "Unused Xs", "body": "$X_3$ and $X_{12}$ would only enlarge loops we do not need, so they stay 0."},
    ],
    "answer": {"value": "$f = \\overline{B}\\,\\overline{D} + AC$", "matchesKey": True},
    "shortcut": "Corners first; then the only 1 left ($m_{15}$) takes the biggest loop the Xs allow.",
    "pitfalls": ["Covering $m_{15}$ with the pair $ABC$ (3 literals) instead of the quad $AC$.", "Adding a term to cover the X at $m_3$ or $m_{12}$."],
    "verification": "Without don't-cares the minimum is $\\overline{B}\\,\\overline{D} + ABCD$ (6 literals); with them, 4 literals, and Petrick's method confirms $\\overline{B}\\,\\overline{D} + AC$ is the unique minimum.",
    "animation": km(ABCD, [0, 2, 8, 10, 15], [3, 11, 12, 14]),
}

SOLUTIONS["cse-1999-a-8"] = {
    "approach": "Concept tested: **implementing a map with don't-cares**. Find the minimal SOP (Xs used only to enlarge loops), then check each option against the care cells.",
    "concepts": ["Don't-care conditions", "Minimal SOP", "Equivalent forms"],
    "given": "Rows $AB$, columns $CD$. Row 00: 0 0 1 0; row 01: X X 1 X; row 11: 0 1 1 0; row 10: 0 1 1 0.",
    "steps": [
        {"title": "Read the map", "body": "1s: $m_3, m_7, m_{15}, m_{11}$ (column $CD = 11$), $m_{13}, m_9$ (column 01, rows 11 and 10). Xs: $m_4, m_5, m_6$.", "scene": {"groups": []}},
        {"title": "Loop", "body": "Column $CD = 11$: $CD$. Rows 11 and 10, columns 01 and 11: $AD$. The Xs are not needed.", "scene": {"groups": [grp("CD", ABCD, "accent"), grp("AD", ABCD, "success")]}},
        {"title": "Factor", "body": "$CD + AD = D(C + A)$: option (B)."},
    ],
    "answer": {"value": "(B) $D(C + A)$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\overline{A}B + CD$ is 1 on $m_4$–$m_7$ (Xs, fine) but 0 on $m_9$ and $m_{13}$, which are 1s."),
        opt("B", True, "$AD + CD$ factored; it agrees with every care cell."),
        opt("C", False, "$AD + \\overline{A}B$ misses $m_3$ (row 00, column 11)."),
        opt("D", False, "$(C + D)(\\overline{C} + D) = D$, so this is $D(A + B)$: it misses $m_3$ and is 1 on $m_1$, a 0."),
    ],
    "shortcut": "Every 1 has $D = 1$, and the 1s with $C = 0$ all have $A = 1$: $f = D(A + C)$.",
    "pitfalls": ["Using the Xs in row 01 to make $\\overline{A}B$ although no 1 needs it.", "Forgetting that $(C + D)(\\overline{C} + D)$ collapses to $D$."],
    "verification": "Enumeration: (B) matches all 13 care cells; (A), (C), (D) each fail on at least one.",
    "animation": km(ABCD, [3, 7, 9, 11, 13, 15], [4, 5, 6]),
}

YZWX = list("yzwx")
o01, d01 = ml.from_map(["0X0X", "X1X1", "0X10", "01X0"], "yz", "wx", YZWX)
SOLUTIONS["cse-2001-a-11"] = {
    "approach": "Concept tested: **minimal SOP with many don't-cares**, on a map whose rows are $yz$ and columns $wx$. There is no essential PI, so compare covers by cost.",
    "concepts": ["Don't-care conditions", "Minimal SOP", "Reading a printed map"],
    "given": "Rows $yz$, columns $wx$. Row 00: 0 X 0 X; row 01: X 1 X 1; row 11: 0 X 1 0; row 10: 0 1 X 0.",
    "steps": [
        {"title": "Read the 1s", "body": "In $(w, x, y, z)$: $m_5$ (row 01, column 01), $m_9$ (row 01, column 10), $m_{15}$ (row 11, column 11), $m_6$ (row 10, column 01). Xs: 1, 4, 7, 8, 13, 14.", "scene": {"groups": []}},
        {"title": "Two quads", "body": "Row $yz = 01$ is all 1s and Xs: $\\overline{y}z$ covers $m_5$ and $m_9$. Rows 11 and 10 at columns 01, 11 ($m_7, m_{15}, m_6, m_{14}$) are 1s and Xs: $xy$ covers $m_{15}$ and $m_6$.", "scene": {"groups": [grp("y'z", YZWX, "accent"), grp("xy", YZWX, "success")]}},
        {"title": "Why nothing cheaper", "body": "$m_9$ and $m_6$ have no common loop, so at least two terms are needed; $\\overline{y}z + xy$ has two terms of 2 literals. It is the unique minimum (4 literals), although no PI is essential."},
    ],
    "answer": {"value": "(A) $xy + \\overline{y}z$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Two quads, 4 literals: minimal."),
        opt("B", False, "$w\\overline{x}\\,\\overline{y} + xy + xz$ also implements the map, but it costs 7 literals."),
        opt("C", False, "$\\overline{w}x + \\overline{y}z + xy$ implements the map with 6 literals; $\\overline{w}x$ is unnecessary."),
        opt("D", False, "$xz + y$ is 1 on $m_2$ and $m_3$ (row 10 and row 11 of column 00), which are 0s."),
    ],
    "shortcut": "Two 1s that cannot share a loop ($m_9$ and $m_6$) force at least two terms; the 2-term option is the answer if it is correct.",
    "pitfalls": ["Rejecting (A) because $\\overline{y}z$ is not essential: minimality is about cost, and here no PI is essential.", "Reading the rows as $wx$."],
    "verification": "Petrick's method over the PIs (with the Xs) gives the single minimal cover $\\{\\overline{y}z, xy\\}$; (B) and (C) agree with the map but cost more.",
    "animation": km(YZWX, o01, d01, title="Rows yz, columns wx (as printed)"),
}

o02, d02 = ml.from_map(["0110", "X001", "X001", "011X"], "yz", "wx", YZWX)
SOLUTIONS["cse-2002-a-12"] = {
    "approach": "Concept tested: **don't-cares and an XOR pattern** on a map with rows $yz$, columns $wx$. Loop the 1s with the useful Xs; the result is $x \\oplus z$.",
    "concepts": ["Don't-care conditions", "XOR pattern", "Reading a printed map"],
    "given": "Rows $yz$, columns $wx$. Row 00: 0 1 1 0; rows 01, 11: X 0 0 1; row 10: 0 1 1 X.",
    "steps": [
        {"title": "Read the map", "body": "1s with $z = 0$ sit in the middle columns ($x = 1$); 1s with $z = 1$ sit in column $wx = 10$ ($x = 0$, $w = 1$), with Xs in column 00.", "scene": {"groups": []}},
        {"title": "Loop", "body": "Rows $yz = 00, 10$ ($z = 0$) × columns 01, 11 ($x = 1$): the quad $x\\overline{z}$. Rows 01, 11 ($z = 1$) × columns 00, 10 ($x = 0$, using the Xs in column 00 through the wrap): the quad $\\overline{x}z$.", "scene": {"groups": [grp("xz'", YZWX, "accent"), grp("x'z", YZWX, "success")]}},
        {"title": "Result", "body": "$f = x\\overline{z} + \\overline{x}z = x \\oplus z$: option (B) ($xz' + zx'$)."},
    ],
    "answer": {"value": "(B) $xz' + zx'$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$xz + y'z$ is 1 where $x = z = 1$ (columns 01, 11, rows 01, 11), which are 0s."),
        opt("B", True, "The two quads."),
        opt("C", False, "$x'y + zx'$ is 1 on row $yz = 10$, column 00 ($m_2$), which is 0, and misses the $x\\overline{z}$ 1s."),
        opt("D", False, "(B) is correct, so 'none of the above' is wrong."),
    ],
    "shortcut": "The 1s sit where $x$ and $z$ differ (with Xs filling in): XOR of $x$ and $z$.",
    "pitfalls": ["Not using the Xs in column 00, which leaves $\\overline{x}z$ as a pair ($w\\overline{x}z$, 3 literals).", "Reading the rows as $wx$."],
    "verification": "$x \\oplus z$ agrees with all 13 care cells of the map (enumeration).",
    "animation": km(YZWX, o02, d02, title="Rows yz, columns wx (as printed)"),
}

CDAB_l = list("cdab")
o08, d08 = ml.from_map(["1101", "X000", "X000", "110X"], "cd", "ab", CDAB_l)
SOLUTIONS["cse-2008-cs-5"] = {
    "approach": "Concept tested: **minimal SOP with don't-cares** on a map with rows $cd$, columns $ab$. Two quads cover every 1; options that are equal but use more terms are not minimal.",
    "concepts": ["Don't-care conditions", "Minimal SOP", "Corner quad"],
    "given": "Rows $cd$, columns $ab$. Row 00: 1 1 0 1; rows 01, 11: X 0 0 0; row 10: 1 1 0 X.",
    "steps": [
        {"title": "Read the 1s", "body": "In $(a, b, c, d)$: $m_0, m_4, m_8$ (row 00), $m_2, m_6$ (row 10). Xs: $m_1, m_3$ (column 00), $m_{10}$.", "scene": {"groups": []}},
        {"title": "Two quads", "body": "Rows $cd = 00, 10$ ($d = 0$) × columns $ab = 00, 01$ ($a = 0$): $\\overline{a}\\,\\overline{d}$ ($m_0, m_4, m_2, m_6$). The corners with $X_{10}$: $\\overline{b}\\,\\overline{d}$ ($m_0, m_8, m_2, X_{10}$).", "scene": {"groups": [grp("a'd'", CDAB_l, "accent"), grp("b'd'", CDAB_l, "success")]}},
        {"title": "Check", "body": "All five 1s are covered with 4 literals; $X_1, X_3$ are not needed."},
    ],
    "answer": {"value": "(A) $\\overline{b}\\,\\overline{d} + \\overline{a}\\,\\overline{d}$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Two quads, 4 literals."),
        opt("B", False, "Implements the map, but uses three terms and 7 literals ($\\overline{a}b\\overline{d}$ lies inside $\\overline{a}\\,\\overline{d}$)."),
        opt("C", False, "$ab\\overline{d}$ covers $m_{12}, m_{14}$ (0s) and misses $m_4, m_6$."),
        opt("D", False, "Implements the map (using $X_1, X_3$ in $\\overline{a}\\,\\overline{b}$), but costs 6 literals; $\\overline{a}\\,\\overline{b}$ is unnecessary."),
    ],
    "shortcut": "Every 1 has $d = 0$; the ones with $b = 1$ have $a = 0$: $f = \\overline{d}(\\overline{a} + \\overline{b})$.",
    "pitfalls": ["Choosing (D) because it 'uses more don't-cares'.", "Reading the rows as $ab$."],
    "verification": "Petrick's method gives the unique minimal cover $\\{\\overline{a}\\,\\overline{d}, \\overline{b}\\,\\overline{d}\\}$ (4 literals).",
    "animation": km(CDAB_l, o08, d08, title="Rows cd, columns ab (as printed)"),
}

o12, d12 = ml.from_map(["1XX1", "X001", "0000", "100X"], "cd", "ab", CDAB_l)
SOLUTIONS["cse-2012-cs-30"] = {
    "approach": "Concept tested: **minimal SOP with don't-cares** (rows $cd$, columns $ab$). Both quads are essential; options that add terms or leave a 1 uncovered are not minimal.",
    "concepts": ["Don't-care conditions", "Minimal SOP", "Essential prime implicant"],
    "given": "Rows $cd$, columns $ab$. Row 00: 1 X X 1; row 01: X 0 0 1; row 11: 0 0 0 0; row 10: 1 0 0 X.",
    "steps": [
        {"title": "Read the 1s", "body": "In $(a, b, c, d)$: $m_0$, $m_8$ (row 00), $m_9$ (row 01, column 10), $m_2$ (row 10, column 00). Xs: $m_4$, $m_{12}$, $m_1$, $m_{10}$.", "scene": {"groups": []}},
        {"title": "Loops", "body": "Corners with $X_{10}$: $\\overline{b}\\,\\overline{d}$ ($m_0, m_2, m_8, X_{10}$). $m_9$ needs $\\overline{b}\\,\\overline{c}$ ($m_0, X_1, m_8, m_9$). Both are essential ($m_2$ only in the first, $m_9$ only in the second).", "scene": {"groups": [grp("b'd'", CDAB_l, "accent"), grp("b'c'", CDAB_l, "success")]}},
    ],
    "answer": {"value": "(B) $\\overline{b}\\,\\overline{d} + \\overline{b}\\,\\overline{c}$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\overline{b}\\,\\overline{d}$ alone misses $m_9$."),
        opt("B", True, "The two essential quads, 4 literals."),
        opt("C", False, "Covers $m_9$ with the 4-literal minterm $a\\overline{b}\\,\\overline{c}d$ instead of the quad $\\overline{b}\\,\\overline{c}$: correct but not minimal (6 literals)."),
        opt("D", False, "Adds the redundant $\\overline{c}\\,\\overline{d}$ (6 literals)."),
    ],
    "shortcut": "$m_9$ is the only 1 outside the corners; give it the largest loop the Xs allow ($\\overline{b}\\,\\overline{c}$).",
    "pitfalls": ["Covering $m_9$ with its minterm (option C).", "Adding $\\overline{c}\\,\\overline{d}$ because it uses the Xs $m_4, m_{12}$."],
    "verification": "PIs with the Xs: $\\overline{b}\\,\\overline{d}$, $\\overline{b}\\,\\overline{c}$, $\\overline{c}\\,\\overline{d}$; the chart over $\\{0, 2, 8, 9\\}$ has single-mark columns 2 and 9.",
    "animation": km(CDAB_l, o12, d12, title="Rows cd, columns ab (as printed)"),
}

SOLUTIONS["cse-2014-3-cs-7"] = {
    "approach": "Concept tested: **don't-cares need not be covered**. Plot the four real 1s, use the Xs only to enlarge their loops, and reject options that spend terms on the Xs.",
    "concepts": ["Don't-care conditions", "Corner quad", "XNOR pattern"],
    "given": "1s: 0, 5, 10, 15. Don't-cares: 2, 7, 8, 13.",
    "steps": [
        {"title": "Plot", "body": "Over $(P, Q, R, S)$: 1s at $m_0$, $m_5$, $m_{10}$, $m_{15}$; Xs at $m_2$, $m_7$, $m_8$, $m_{13}$.", "scene": {"groups": []}},
        {"title": "Loop", "body": "Corners $m_0, X_2, X_8, m_{10}$: $\\overline{Q}\\,\\overline{S}$. Centre $m_5, X_7, X_{13}, m_{15}$: $QS$.", "scene": {"groups": [grp("Q'S'", PQRS, "accent"), grp("QS", PQRS, "success")]}},
    ],
    "answer": {"value": "(B) $\\overline{Q}\\,\\overline{S} + QS$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$Q\\overline{S} + \\overline{Q}S$ is the complement pattern: 0 on all four 1s."),
        opt("B", True, "Two quads that swallow the Xs for free."),
        opt("C", False, "Correct on the 1s but uses four 3-literal pairs (12 literals)."),
        opt("D", False, "Four 3-literal terms; equal on the care cells, not minimal."),
    ],
    "shortcut": "The 1s are where $Q = S$: $\\overline{Q \\oplus S} = \\overline{Q}\\,\\overline{S} + QS$.",
    "pitfalls": ["Spending terms to cover the Xs.", "Choosing (A), the XOR, by mixing up the corner pattern."],
    "verification": "(B), (C), (D) all agree with the care cells; only (B) has the minimum 4 literals.",
    "animation": km(PQRS, [0, 5, 10, 15], [2, 7, 8, 13]),
}

SOLUTIONS["cse-2017-2-cs-28"] = {
    "approach": "Concept tested: **minimal POS with don't-cares**. Loop the 0s, using the Xs that enlarge 0-loops, and read each loop as a sum term (0 → plain letter, 1 → primed letter).",
    "concepts": ["Minimal POS", "Don't-care conditions"],
    "given": "$f = \\Sigma_m(0, 1, 2, 3, 7, 8, 10) + \\Sigma_d(5, 6, 11, 15)$; the 0s are 4, 9, 12, 13, 14.",
    "steps": [
        {"title": "The 0s", "body": "0s: $m_4, m_9, m_{12}, m_{13}, m_{14}$ (the figure plots the 0s, so its loops are loops of 0s).", "scene": {"groups": []}},
        {"title": "First 0-loop", "body": "$m_4, X_6, m_{12}, m_{14}$ ($x = 1$, $z = 0$): the factor $(\\overline{x} + z)$.", "scene": {"groups": [{"cells": ml.cells(ml.parse_term("xz'", W)), "label": "(x′ + z)", "tone": "error"}]}},
        {"title": "Second 0-loop", "body": "$m_9, X_{11}, m_{13}, X_{15}$ ($w = 1$, $z = 1$): the factor $(\\overline{w} + \\overline{z})$.", "scene": {"groups": [{"cells": ml.cells(ml.parse_term("xz'", W)), "label": "(x′ + z)", "tone": "error"}, {"cells": ml.cells(ml.parse_term("wz", W)), "label": "(w′ + z′)", "tone": "warning"}]}},
        {"title": "Result", "body": "$f = (\\overline{w} + \\overline{z})(\\overline{x} + z)$, 4 literals."},
    ],
    "answer": {"value": "(A) $(\\overline{w} + \\overline{z})(\\overline{x} + z)$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The two quads of 0s read as sum terms."),
        opt("B", False, "$(\\overline{w} + z)(x + z) = z + \\overline{w}x$ is 0 at $m_8$ ($w = 1$, $x = 0$, $z = 0$), which is a 1."),
        opt("C", False, "$(w + z)(\\overline{x} + z)$ is 0 at $m_0$ ($w = z = 0$), a 1."),
        opt("D", False, "$(w + \\overline{z})(\\overline{x} + z)$ is 0 at $m_1$ ($w = 0$, $z = 1$), a 1."),
    ],
    "shortcut": "Each option has the factor pattern; test one 1-cell per option: $m_8$ kills (B), $m_0$ kills (C), $m_1$ kills (D).",
    "pitfalls": ["Reading a 0-loop with the SOP habit (1 → plain letter).", "Requiring the POS to agree with the minimal SOP on don't-care cells: the SOP $\\overline{x}\\,\\overline{z} + \\overline{w}z$ and this POS choose the Xs differently."],
    "verification": "Enumeration over the 12 care cells: only (A) agrees with all of them; 4 literals is the minimum POS cost (Petrick on the 0s).",
    "animation": km(W, [4, 9, 12, 13, 14], [5, 6, 11, 15], title="The 0-cells of f (drawn as the 1s of f′), with the don't-cares"),
}

SOLUTIONS["cse-2026-1-cs-38"] = {
    "approach": "Concept tested: **several minimal SOPs**. Find the EPIs, then every cheapest way to cover what is left; an option is correct iff it equals $F$ **and** has the minimum cost.",
    "concepts": ["Essential prime implicant", "Multiple minimal covers", "Equivalent forms"],
    "given": "$F(P, Q, R, S) = \\Sigma m(1, 2, 3, 4, 5, 7, 10, 12, 13, 14)$.",
    "steps": [
        {"title": "Prime implicants", "body": "$\\overline{P}S$ (1, 3, 5, 7), $Q\\overline{R}$ (4, 5, 12, 13), and the pairs $\\overline{P}\\,\\overline{Q}R$ (2, 3), $\\overline{Q}R\\overline{S}$ (2, 10), $PR\\overline{S}$ (10, 14), $PQ\\overline{S}$ (12, 14).", "scene": {"groups": [grp("P'S", PQRS, "accent"), grp("QR'", PQRS, "success")]}},
        {"title": "EPIs", "body": "$m_1$ lies only in $\\overline{P}S$; $m_4$ only in $Q\\overline{R}$. Both are essential and cover 1, 3, 4, 5, 7, 12, 13."},
        {"title": "Left: m2, m10, m14", "body": "Two more pairs are needed (no single PI covers all three). The 2-term covers: $\\{\\overline{Q}R\\overline{S}, PR\\overline{S}\\}$, $\\{\\overline{Q}R\\overline{S}, PQ\\overline{S}\\}$, $\\{\\overline{P}\\,\\overline{Q}R, PR\\overline{S}\\}$. Each gives $F$ with 4 terms and 10 literals: three minimal SOPs.", "scene": {"groups": [grp("P'S", PQRS, "accent"), grp("QR'", PQRS, "success"), grp("Q'RS'", PQRS, "warning"), grp("PQS'", PQRS, "info")]}},
        {"title": "Check the options", "body": "(A) uses $\\overline{P}\\,\\overline{Q}R$ and $\\overline{Q}R\\overline{S}$: $m_{14}$ uncovered. (B) $\\overline{P}\\,\\overline{Q}R + PR\\overline{S}$: a minimal cover. (C) $PQ\\overline{S} + PR\\overline{S}$: $m_2$ uncovered. (D) $PQ\\overline{S} + \\overline{Q}R\\overline{S}$: a minimal cover."},
    ],
    "answer": {"value": "(B) and (D)", "choice": ["B", "D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Misses $m_{14}$ (no term with $P = 1$, $R = 1$, $S = 0$)."),
        opt("B", True, "EPIs + $\\overline{P}\\,\\overline{Q}R$ + $PR\\overline{S}$: equal to $F$, 10 literals."),
        opt("C", False, "Misses $m_2$ (0010)."),
        opt("D", True, "EPIs + $PQ\\overline{S}$ + $\\overline{Q}R\\overline{S}$: equal to $F$, 10 literals."),
    ],
    "shortcut": "All four options share the EPIs; test only the cells the last two terms must cover: 2, 10, 14.",
    "pitfalls": ["Assuming there is a single minimal SOP and marking only one option.", "Checking cost but not equality (A and C have the right cost but miss a 1)."],
    "verification": "Petrick's method on the reduced chart gives exactly three minimal covers; (B) and (D) are two of them.",
    "animation": km(PQRS, [1, 2, 3, 4, 5, 7, 10, 12, 13, 14]),
}


# ── Lesson 3: tabulation and variable-entered maps ──────────────────────────

SOLUTIONS["cse-1992-a-1-i"] = {
    "approach": "Concept tested: **reading a variable-entered map**. Each cell holds the residue of $f$ as a function of the entered variable $A$; read the plain 1s, then loop each entered literal with the 1s as helpers and AND it in (or unfold the map into a 3-variable K-map).",
    "concepts": ["Variable-entered map", "Shannon expansion", "Minimal SOP"],
    "given": "Map variables $B$ (rows) and $C$ (columns); entries: $(B, C) = (0, 0): 1$, $(0, 1): 0$, $(1, 0): \\overline{A}$, $(1, 1): A$.",
    "steps": [
        {"title": "Plain 1s", "body": "The 1 at $B = 0, C = 0$ gives $\\overline{B}\\,\\overline{C}$ (true for both values of $A$)."},
        {"title": "The A pass", "body": "The entry $A$ at $(1, 1)$: its neighbours are $(0, 1) = 0$ and $(1, 0) = \\overline{A}$ (which cannot join an $A$-loop), so it stays alone: $BC$, giving $A \\cdot BC = ABC$."},
        {"title": "The A′ pass", "body": "The entry $\\overline{A}$ at $(1, 0)$ may join the 1 at $(0, 0)$ (same column $C = 0$): the loop $\\overline{C}$, giving $\\overline{A}\\,\\overline{C}$.", "scene": {"groups": [grp("B'C'", ABC, "accent"), grp("A'C'", ABC, "success"), grp("ABC", ABC, "warning")]}},
        {"title": "Check by unfolding", "body": "Unfolded over $(A, B, C)$: $m_0, m_4$ (from the 1), $m_2$ (from $\\overline{A}$ at $B = 1, C = 0$), $m_7$ (from $A$ at $B = C = 1$): $f = \\Sigma(0, 2, 4, 7)$. Its K-map loops are exactly $\\overline{B}\\,\\overline{C}$, $\\overline{A}\\,\\overline{C}$ and $ABC$, all essential."},
    ],
    "answer": {"value": "$\\overline{B}\\,\\overline{C} + \\overline{A}\\,\\overline{C} + ABC$", "matchesKey": True},
    "shortcut": "Shannon expansion on $A$: $f = \\overline{A}(\\overline{B}\\,\\overline{C} + B\\overline{C}) + A(\\overline{B}\\,\\overline{C} + BC) = \\overline{A}\\,\\overline{C} + A\\overline{B}\\,\\overline{C} + ABC$, and $A\\overline{B}\\,\\overline{C} + \\overline{A}\\,\\overline{C}$ absorbs into $\\overline{B}\\,\\overline{C} + \\overline{A}\\,\\overline{C}$ via the cell $m_0$.",
    "pitfalls": ["Looping $A$ with $\\overline{A}$ because they are adjacent: they are 1 for opposite values of $A$.", "Forgetting that a 1-cell can serve as a don't-care in the $A$- and $\\overline{A}$-passes."],
    "verification": "The unfolded function $\\Sigma(0, 2, 4, 7)$ has the three essential PIs $\\overline{B}\\,\\overline{C}$, $\\overline{A}\\,\\overline{C}$, $ABC$ (Quine–McCluskey), 7 literals in all.",
    "animation": km(ABC, [0, 2, 4, 7], title="The VEM unfolded into a 3-variable map"),
}


# ── Lesson 4: two-level implementation ──────────────────────────────────────

SOLUTIONS["cse-2006-cs-38"] = {
    "approach": "Concept tested: **static-1 hazards**. A two-level AND–OR cover keeps $f$ at 1 while one input changes between two adjacent 1-cells only if a single cube contains **both** cells. List every adjacent pair of 1s and check each cover.",
    "concepts": ["Static-1 hazard", "Adjacent minterms", "Consensus cube"],
    "given": "$f = \\Sigma(5, 7, 11, 12, 13, 15)$ over $(w, x, y, z)$; only one input changes at a time.",
    "steps": [
        {"title": "Adjacent pairs of 1s", "body": "Pairs one bit apart: 5–7 ($y$), 5–13 ($w$), 7–15 ($w$), 11–15 ($x$), 12–13 ($z$), 13–15 ($y$). Each must lie inside one cube of the cover.", "scene": {"groups": []}},
        {"title": "Cover (A)", "body": "$\\overline{w}xz$ = {5, 7}, $wx\\overline{y}$ = {12, 13}, $x\\overline{y}z$ = {5, 13}, $xyz$ = {7, 15}, $wyz$ = {11, 15}. The pair 13–15 is in no cube: going from 1101 to 1111 ($y$ rises with $w = x = z = 1$), $wx\\overline{y}$ and $x\\overline{y}z$ turn off while $xyz$ and $wyz$ turn on, and if the turn-off is faster $f$ dips to 0.", "scene": {"groups": [grp("w'xz", W, "accent"), grp("wxy'", W, "success"), grp("xy'z", W, "info"), grp("xyz", W, "warning"), grp("wyz", W, "cat1")], "hl": [{"cell": 13, "tone": "error"}, {"cell": 15, "tone": "error"}]}},
        {"title": "Covers (B) and (C)", "body": "(B) $wxz$ = {13, 15}, $\\overline{w}xy$ = {6, 7}, $wyz$ = {11, 15}: contains $m_6$ (a 0) and misses 5 and 12. (C) $wx\\overline{y}\\,\\overline{z}$ = {12}, $xz$ = {5, 7, 13, 15}, $w\\overline{x}yz$ = {11}: equals $f$, but the pairs 12–13 and 11–15 are each split between two cubes. Neither is acceptable."},
        {"title": "Cover (D)", "body": "$wx\\overline{y}$ {12, 13}, $wyz$ {11, 15}, $wxz$ {13, 15}, $\\overline{w}xz$ {5, 7}, $x\\overline{y}z$ {5, 13}, $xyz$ {7, 15}: every one of the six pairs has its own cube, and the union is exactly $f$.", "scene": {"groups": [grp("wxy'", W, "success"), grp("wyz", W, "cat1"), grp("wxz", W, "accent"), grp("w'xz", W, "info"), grp("xy'z", W, "warning"), grp("xyz", W, "cat2")], "hl": []}},
    ],
    "answer": {"value": "(D) $wx\\overline{y},\\ wyz,\\ wxz,\\ \\overline{w}xz,\\ x\\overline{y}z,\\ xyz$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Equal to $f$ but no cube contains both 13 and 15: a static-1 hazard when $y$ changes with $w = x = z = 1$."),
        opt("B", False, "Not even a cover of $f$: it includes $m_6$ and misses $m_5$, $m_{12}$."),
        opt("C", False, "A cover of $f$, but 12–13 and 11–15 are split between cubes (two hazards)."),
        opt("D", True, "Contains a cube for each of the six adjacent pairs (it adds the consensus cube $wxz$ to cover 13–15)."),
    ],
    "shortcut": "Find the pair the cheap covers miss: here 13–15. Only (D) contains $wxz$, the consensus of $wx\\overline{y}$ and $wyz$, which bridges it.",
    "pitfalls": ["Choosing the cover with the most cubes without checking each adjacent pair.", "Checking that a cover equals $f$ but not that it is hazard-free (option C)."],
    "verification": "An exhaustive check of all six adjacent 1-pairs against each option (l3_04_two_level.py) finds 0 uncovered pairs only for (D); (A) misses 13–15.",
    "animation": km(W, [5, 7, 11, 12, 13, 15]),
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
            d["solutions"][qid] = dict(sol)
        p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
        print(f"{paper}: {', '.join(sorted(sols))}")


if __name__ == "__main__":
    write()
