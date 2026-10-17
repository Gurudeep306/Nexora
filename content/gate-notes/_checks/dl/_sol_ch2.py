"""Teacher-style v2 solutions for the 64 PYQs of Digital Logic Chapter 2 (Boolean algebra and gates).

This file is the source; `python3 content/gate-notes/_checks/dl/_sol_ch2.py` writes each solution
into src/gate/solutions/<paper>.json (the v2 solutions pipeline), and pyq_ch2.py plus
scripts/gate/validate-solutions.mjs check the result. Every key is re-derived from scratch by
truth-table enumeration (or exhaustive search) in the lesson checks l2_01 … l2_06.

Each solution names the concept tested, works the steps, explains every option, adds a shortcut
or verification and lists the pitfalls.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _sol_ch1_fp import ROOT, opt  # noqa: E402

SOLUTIONS = {}

# ── Lesson 1: logic gates ───────────────────────────────────────────────────

SOLUTIONS["cse-1999-a-7"] = {
    "approach": "Concept tested: **gates with tied or constant inputs** and **controlling values**. Evaluate each option for $x = 0$ and $x = 1$ (two rows decide everything) and look for the one that is not $\\overline{x}$.",
    "concepts": ["NAND and NOR", "Controlling values", "Tied inputs"],
    "steps": [
        {"title": "Tie both inputs", "body": "$x$ NAND $x = \\overline{x \\cdot x} = \\overline{x}$ and $x$ NOR $x = \\overline{x + x} = \\overline{x}$: an AND or OR of a signal with itself is the signal, and the output bubble inverts it."},
        {"title": "Feed a non-controlling constant", "body": "1 does not control AND ($x \\cdot 1 = x$), so $x$ NAND $1 = \\overline{x \\cdot 1} = \\overline{x}$."},
        {"title": "Feed a controlling constant", "body": "1 controls OR ($x + 1 = 1$), so $x$ NOR $1 = \\overline{x + 1} = \\overline{1} = 0$ for **both** values of $x$. It is the constant 0, not $\\overline{x}$."},
        {"title": "Conclusion", "body": "Only option (D) is not equivalent to $\\overline{x}$."},
    ],
    "answer": {"value": "(D) $x$ NOR 1", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\overline{x \\cdot x} = \\overline{x}$: tying a NAND's inputs makes an inverter."),
        opt("B", False, "$\\overline{x + x} = \\overline{x}$: tying a NOR's inputs makes an inverter."),
        opt("C", False, "$\\overline{x \\cdot 1} = \\overline{x}$: 1 is the non-controlling value of NAND, so the gate inverts $x$."),
        opt("D", True, "$\\overline{x + 1} = 0$: 1 is the controlling value of NOR, so the output is stuck at 0."),
    ],
    "shortcut": "An inverting gate fed its **controlling** value gives a constant (NOR with 1 → 0, NAND with 0 → 1); fed the **non-controlling** value or its own input twice, it gives $\\overline{x}$.",
    "pitfalls": ["Thinking 'NOR inverts, so x NOR 1 = x̄': the 1 forces the OR part to 1 first.", "Confusing x NOR 1 with x NOR 0, which is the inverter."],
    "verification": "Two-row table: for $x = 0, 1$ options (A)–(C) give $1, 0$; option (D) gives $0, 0$.",
}


# ── Lesson 2: Boolean laws ──────────────────────────────────────────────────

SOLUTIONS["cse-2024-2-cs-20"] = {
    "approach": "Concept tested: the **basic laws** (identity, null, idempotence, complement). A one-variable identity is settled by its two rows, $x = 0$ and $x = 1$; an identity that fails on either row is FALSE.",
    "concepts": ["Identity law", "Null law", "Idempotence", "Complement law"],
    "steps": [
        {"title": "Check each statement on both rows", "body": "| Statement | $x = 0$ | $x = 1$ | Verdict |\n|---|---|---|---|\n| $x \\cdot 1 = x$ | $0 = 0$ | $1 = 1$ | true (identity) |\n| $x + 1 = x$ | $1 \\ne 0$ | $1 = 1$ | **false** |\n| $x \\cdot x = 0$ | $0 = 0$ | $1 \\ne 0$ | **false** |\n| $x + \\bar{x} = 1$ | $1 = 1$ | $1 = 1$ | true (complement) |"},
        {"title": "Name the correct laws", "body": "The true forms are the **null law** $x + 1 = 1$ and **idempotence** $x \\cdot x = x$. Statements (B) and (C) are distorted versions of them."},
        {"title": "Conclusion", "body": "The FALSE statements are (B) and (C)."},
    ],
    "answer": {"value": "(B) and (C)", "choice": ["B", "C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "True: 1 is the identity of AND, $x \\cdot 1 = x$."),
        opt("B", True, "False: 1 controls OR, so $x + 1 = 1$, not $x$ (fails at $x = 0$)."),
        opt("C", True, "False: $x \\cdot x = x$ (idempotence); it fails at $x = 1$. It is $x \\cdot \\bar{x}$ that is 0."),
        opt("D", False, "True: the complement law $x + \\bar{x} = 1$."),
    ],
    "shortcut": "For a single variable, try $x = 0$ and $x = 1$: a statement that fails on either is false.",
    "pitfalls": ["Reading the question as 'which are TRUE'.", "Confusing $x \\cdot x$ (= $x$) with $x \\cdot \\bar{x}$ (= 0)."],
    "verification": "Statements (A) and (D) are postulates of Boolean algebra (identity and complement); (B) and (C) each fail on one row.",
}

SOLUTIONS["cse-2026-2-cs-6"] = {
    "approach": "Concept tested: **Huntington's postulates** (commutativity and complements). A property must hold for every value; check each option on $a = 0, 1$ (and $b$ where needed).",
    "concepts": ["Huntington postulates", "Complement law", "Commutative law"],
    "steps": [
        {"title": "Commutativity", "body": "(A) $a + b = b + a$ and (D) $a \\cdot b = b \\cdot a$ are postulates: OR and AND tables are symmetric in their inputs."},
        {"title": "Complements", "body": "The complement postulate says $a + a' = 1$ (option C) **and** $a \\cdot a' = 0$. A variable and its complement are never both 1, so their AND is 0."},
        {"title": "The odd one out", "body": "(B) claims $a \\cdot a' = 1$. At $a = 0$: $0 \\cdot 1 = 0 \\ne 1$; at $a = 1$: $1 \\cdot 0 = 0 \\ne 1$. It fails on every row: not a property."},
    ],
    "answer": {"value": "(B) $a \\cdot a' = 1$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Commutativity of OR: a postulate."),
        opt("B", True, "False on both rows: the correct law is $a \\cdot a' = 0$."),
        opt("C", False, "The complement postulate $a + a' = 1$."),
        opt("D", False, "Commutativity of AND: a postulate."),
    ],
    "shortcut": "AND of anything with its complement is 0, OR is 1. Any option claiming otherwise is the answer.",
    "pitfalls": ["Mixing up the two halves of the complement postulate."],
    "verification": "Two-row table for $a \\cdot a'$: 0, 0. Never 1.",
}

SOLUTIONS["cse-2004-cs-17"] = {
    "approach": "Concept tested: **factoring and the redundant-literal rule** $x + \\bar{x}y = x + y$ (here in the form $x' + xy = x' + y$).",
    "concepts": ["Distributive law", "Redundant-literal rule", "Absorption"],
    "steps": [
        {"title": "Factor the two x′ terms", "body": "$x'y' + x'y = x'(y' + y) = x' \\cdot 1 = x'$. The function is now $x' + xy$."},
        {"title": "Delete the redundant literal", "body": "In $x' + xy$, the literal $x'$ stands alone, so the $x$ inside $xy$ is redundant: $x' + xy = (x' + x)(x' + y) = x' + y$."},
        {"title": "Check by rows", "body": "The original has a term equal to 1 on rows $xy = 00$ ($x'y'$), $01$ ($x'y$) and $11$ ($xy$); it is 0 only on row 10. $x' + y$ is 0 exactly on row 10. Option (D)."},
    ],
    "answer": {"value": "(D) $x' + y$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$x' + y'$ is 0 on row 11, but the original is 1 there ($xy = 1$)."),
        opt("B", False, "$x + y$ is 0 on row 00, but the original is 1 there ($x'y' = 1$)."),
        opt("C", False, "$x + y'$ (as reprinted; the scan's symbol is unclear) is 0 on row 01, but the original is 1 there. The answer does not depend on how (C) is read."),
        opt("D", True, "Matches on all four rows: 0 only on row 10."),
    ],
    "shortcut": "Three of the four minterms are present ($m_0, m_1, m_3$); the function is 0 only at $x = 1, y = 0$, so it is the single OR $x' + y$.",
    "pitfalls": ["Factoring $y$ instead and stopping at $y + x'y'$ without simplifying it to $x' + y$."],
    "verification": "Row 10: original $0 + 0 + 0 = 0$, $x' + y = 0$; the other three rows give 1 in both.",
}

SOLUTIONS["cse-2008-cs-26"] = {
    "approach": "Concept tested: **absorption and the distributive law**. Factor $P$ out of the middle factor; the first factor is then absorbed, and the last two collapse by $(x + y)(x + z) = x + yz$.",
    "concepts": ["Absorption law", "Distributive law", "Complement law"],
    "steps": [
        {"title": "Factor the middle term", "body": "$P\\overline{Q} + PR = P(\\overline{Q} + R)$."},
        {"title": "Absorb the first factor", "body": "$(P + \\overline{Q}) \\cdot P = P$ (absorption $x(x + y) = x$), so the product so far is $P(\\overline{Q} + R)$."},
        {"title": "Combine the remaining sums", "body": "$(\\overline{Q} + R)(\\overline{Q} + P\\overline{R}) = \\overline{Q} + R \\cdot P\\overline{R} = \\overline{Q} + 0 = \\overline{Q}$ (OR distributes over AND; $R\\overline{R} = 0$)."},
        {"title": "Result", "body": "$P \\cdot \\overline{Q} = P\\overline{Q}$: option (A)."},
    ],
    "answer": {"value": "(A) $P\\overline{Q}$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The simplification above; it agrees on all 8 rows."),
        opt("B", False, "$P\\overline{R}$ is 1 at $P = 1, Q = 1, R = 0$, but there the middle factor $P\\overline{Q} + PR = 0$."),
        opt("C", False, "$P\\overline{Q} + R$ is 1 at $P = 0, R = 1$, but there the middle factor is 0."),
        opt("D", False, "$P\\overline{R} + Q$ is 1 at $P = 0, Q = 1$, but then $P\\overline{Q} + PR = 0$."),
    ],
    "shortcut": "The middle factor forces $P = 1$; with $P = 1$ the expression is $(1)(\\overline{Q} + R)(\\overline{R} + \\overline{Q}) = \\overline{Q} + R\\overline{R} = \\overline{Q}$. So the answer is $P\\overline{Q}$.",
    "pitfalls": ["Expanding all three factors into 8 terms and losing track.", "Forgetting that the middle factor already forces $P = 1$."],
    "verification": "$P = 1, Q = 0, R = 0$: $(1)(1)(1) = 1$ and $P\\overline{Q} = 1$; $P = 1, Q = 1$: the middle factor is $R$ and the last is $\\overline{R}$, product 0, and $P\\overline{Q} = 0$.",
}

SOLUTIONS["cse-2019-cs-6"] = {
    "approach": "Concept tested: **proving and disproving identities**. Options that are known laws need no work; the suspicious one is disproved by a single row.",
    "concepts": ["XOR properties", "Counterexample method"],
    "steps": [
        {"title": "Known laws", "body": "(A) XOR is associative (both sides are the parity of $x, y, z$). (D) $(xy + x'y')' $ is the complement of XNOR, which is XOR."},
        {"title": "The conditional identity", "body": "(C) If $xy = 0$, the row $x = y = 1$ never occurs. On the other three rows $x \\oplus y$ and $x + y$ agree ($0, 1, 1$). So (C) is valid under its condition."},
        {"title": "Disprove (B) with one row", "body": "Try $x = 0, y = 1, z = 1$: left $(0 + 1) \\oplus 1 = 1 \\oplus 1 = 0$; right $0 \\oplus (1 + 1) = 0 \\oplus 1 = 1$. They differ, so (B) is not an identity. (The row $1, 0, 0$ agrees: keep trying rows until one differs.)"},
    ],
    "answer": {"value": "(B)", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Valid: XOR is associative."),
        opt("B", True, "Not valid: fails at $x = 0, y = 1, z = 1$."),
        opt("C", False, "Valid: with $xy = 0$ the only row where XOR and OR differ (11) is excluded."),
        opt("D", False, "Valid: $xy + x'y'$ is XNOR, and its complement is XOR."),
    ],
    "shortcut": "OR and XOR differ only on the row where both inputs are 1. Mixing them, as in (B), breaks as soon as such a row appears on one side only.",
    "pitfalls": ["Testing only one row of (B) (e.g. 100, which agrees) and concluding it is valid.", "Rejecting (C) without using its condition $xy = 0$."],
    "verification": "Full table of (B): the two sides differ on rows 011 and 110 and agree on the other six; one differing row is enough.",
}

SOLUTIONS["cse-2017-2-cs-27"] = {
    "approach": "Concept tested: **simplification with absorption and De Morgan**. Simplify the left side of each option and compare with its right side; the one that disagrees is INCORRECT.",
    "concepts": ["Absorption law", "De Morgan's law", "Distributive law"],
    "steps": [
        {"title": "(A)", "body": "$wx + w(x + y) + x(x + y) = wx + wx + wy + x + xy = x + wy$ (the terms $wx$ and $xy$ are absorbed by $x$). Correct."},
        {"title": "(B)", "body": "$\\overline{w\\bar{x}(y + \\bar{z})} = \\bar{w} + x + \\overline{y + \\bar{z}} = \\bar{w} + x + \\bar{y}z$ (De Morgan twice). Adding $\\bar{w}x$ changes nothing (absorbed by $\\bar{w}$). Correct."},
        {"title": "(C)", "body": "$w\\bar{x}(y + x\\bar{z}) = w\\bar{x}y + w\\bar{x}x\\bar{z} = w\\bar{x}y$. Then $(w\\bar{x}y + \\bar{w}\\bar{x})y = w\\bar{x}y + \\bar{w}\\bar{x}y = \\bar{x}y$. The option claims $x\\bar{y}$: **incorrect**."},
        {"title": "(D)", "body": "$(w + y)(wxy + wyz)$: each term of the second factor contains both $w$ and $y$, so multiplying by $(w + y)$ changes nothing (absorption). Correct."},
    ],
    "answer": {"value": "(C)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Simplifies to $x + wy$, as claimed."),
        opt("B", False, "De Morgan gives $\\bar{w} + x + \\bar{y}z$, as claimed."),
        opt("C", True, "The left side is $\\bar{x}y$, not $x\\bar{y}$ (e.g. $x = 0, y = 1$: left 1, right 0)."),
        opt("D", False, "$(w + y) \\cdot wy(x + z) = wy(x + z)$, as claimed."),
    ],
    "shortcut": "For (C), the outer factor $y$ makes the whole left side 0 whenever $y = 0$, but the right side $x\\bar{y}$ needs $y = 0$ to be 1. They can never be 1 together, so they cannot be equal (both are not identically 0).",
    "pitfalls": ["Losing a bar while applying De Morgan in (B).", "Missing that $\\bar{x}x = 0$ kills a term in (C)."],
    "verification": "$w = 0, x = 0, y = 1$: left of (C) $= (0 + 1) \\cdot 1 = 1$, right $= 0$.",
}

SOLUTIONS["cse-2025-2-cs-40"] = {
    "approach": "Concept tested: **consensus, De Morgan on a whole expression, and comparing functions by minterms**. Use consensus for (B) and (C), push the complement through the product for (D), and list minterms for (A).",
    "concepts": ["Consensus theorem", "De Morgan's law", "Minterm comparison"],
    "steps": [
        {"title": "(A): compare minterms", "body": "Left: $\\bar{A}BC = m_3$, $A\\bar{B}\\bar{C} = m_4$, $\\bar{A}\\bar{B}\\bar{C} = m_0$, $A\\bar{B}C = m_5$, $ABC = m_7$, so $\\{0, 3, 4, 5, 7\\}$. Right: $BC = \\{3, 7\\}$, $\\bar{B}\\bar{C} = \\{0, 4\\}$, $\\bar{A}\\bar{B} = \\{0, 1\\}$, so $\\{0, 1, 3, 4, 7\\}$. They differ ($m_5$ vs $m_1$): incorrect."},
        {"title": "(B): consensus", "body": "$BC$ is the consensus of $AB$ and $\\bar{A}C$, so $AB + \\bar{A}C + BC = AB + \\bar{A}C$. Correct."},
        {"title": "(C): expand", "body": "$(A + C)(\\bar{A} + B) = A\\bar{A} + AB + \\bar{A}C + BC = AB + \\bar{A}C$ (consensus again). Correct."},
        {"title": "(D): De Morgan", "body": "The complement of a product is the sum of the complements: $\\overline{A + \\bar{B} + \\bar{D}} = \\bar{A}BD$, $\\overline{C + D} = \\bar{C}\\bar{D}$, $\\overline{\\bar{A} + C + D} = A\\bar{C}\\bar{D}$, $\\overline{A + B + \\bar{D}} = \\bar{A}\\bar{B}D$. Sum: $\\bar{A}BD + \\bar{A}\\bar{B}D + \\bar{C}\\bar{D} + A\\bar{C}\\bar{D} = \\bar{A}D + \\bar{C}\\bar{D}$. Correct."},
    ],
    "answer": {"value": "(B), (C) and (D)", "choice": ["B", "C", "D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Incorrect: the left side contains $m_5$ ($A\\bar{B}C$) but not $m_1$; the right side contains $m_1$ ($\\bar{A}\\bar{B}C$) but not $m_5$."),
        opt("B", True, "Consensus theorem."),
        opt("C", True, "Expands to $AB + \\bar{A}C + BC$, then consensus."),
        opt("D", True, "De Morgan per factor, then $\\bar{A}BD + \\bar{A}\\bar{B}D = \\bar{A}D$ and $A\\bar{C}\\bar{D}$ is absorbed by $\\bar{C}\\bar{D}$."),
    ],
    "shortcut": "(B) and (C) are the two faces of the consensus theorem. Only (A) needs real checking, and the single row $A = 1, B = 0, C = 1$ settles it (left 1, right 0).",
    "pitfalls": ["Complementing the factors of (D) without swapping $+$ to $\\cdot$ inside each.", "Assuming (A) because both sides have similar-looking terms."],
    "verification": "Row $A = 1, B = 0, C = 1$ in (A): left $A\\bar{B}C = 1$; right $BC = 0$, $\\bar{B}\\bar{C} = 0$, $\\bar{A}\\bar{B} = 0$.",
}

SOLUTIONS["it-2006-cs-6"] = {
    "approach": "Concept tested: **Shannon expansion** $f = x_i' f|_{x_i=0} + x_i f|_{x_i=1}$. Check each option against it; the one that drops the selecting literals is not an identity.",
    "concepts": ["Shannon expansion", "Cofactors"],
    "steps": [
        {"title": "(A) and (B)", "body": "$x_1' f + x_1 f = (x_1' + x_1) f = f$, and the same for $x_2$. True for every $f$ (they are not even expansions, just $f \\cdot 1$)."},
        {"title": "(C)", "body": "$x_n' f(x_1, \\ldots, 0) + x_n f(x_1, \\ldots, 1)$ is exactly Shannon's expansion on $x_n$. True."},
        {"title": "(D)", "body": "$f(0, x_2, \\ldots) + f(1, x_2, \\ldots)$ has no selecting literals. Take $f = x_1 x_2$: it gives $0 + x_2 = x_2 \\ne x_1x_2$ (at $x_1 = 0, x_2 = 1$). Not true in general."},
    ],
    "answer": {"value": "(D)", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Always true: $(x_1' + x_1)f = f$."),
        opt("B", False, "Always true: $(x_2 + x_2')f = f$."),
        opt("C", False, "Shannon's expansion on $x_n$; always true."),
        opt("D", True, "Drops $x_1'$ and $x_1$; it equals 'f is 1 for some value of $x_1$', not $f$."),
    ],
    "shortcut": "$f(0, \\ldots) + f(1, \\ldots)$ is the 'exists $x_1$' function; it equals $f$ only when $f$ does not depend on $x_1$.",
    "pitfalls": ["Thinking (A) is false because it 'is not an expansion': it is still an identity.", "Missing the literals in (D)."],
    "verification": "For $f = x_1x_2$ at $(x_1, x_2) = (0, 1)$: $f = 0$ while (D) gives 1. Options (A)–(C) give 0 there.",
}

SOLUTIONS["cse-2002-b-55-a"] = {
    "approach": "Concept tested: **adding a consensus term to make factoring possible**, then **De Morgan** to merge two complemented literals into one complement.",
    "concepts": ["Consensus theorem", "De Morgan's law", "Factoring"],
    "steps": [
        {"title": "Add the consensus term", "body": "In $xy' + yz'$ the variable $y$ appears as $y'$ and $y$; the consensus of the two terms is $xz'$. Adding it does not change $f$: $f = xy' + yz' + xz'$."},
        {"title": "Factor into two sums", "body": "$(x + y)(y' + z') = xy' + xz' + yy' + yz' = xy' + xz' + yz'$, exactly the three terms. So $f = (x + y)(y' + z')$."},
        {"title": "One complement", "body": "De Morgan: $y' + z' = (yz)'$. Hence $f = (x + y)\\,(yz)'$."},
        {"title": "The circuit", "body": "One AND gate forms $yz$, the single NOT gate inverts it, one OR gate forms $x + y$, and a final AND gate multiplies the two: AND, NOT, OR, AND."},
    ],
    "answer": {"value": "$f = (x + y)\\,(yz)'$: an OR of $x, y$ ANDed with the NOT of $yz$", "matchesKey": True},
    "shortcut": "When a sum of products needs two different complemented literals, try to collect them into one factor $(a' + b') = (ab)'$; adding a consensus term is the usual way to create that factor.",
    "pitfalls": ["Writing $x\\overline{y} + y\\overline{z}$ with two NOT gates, which the question forbids.", "Expanding $(x + y)(yz)'$ incorrectly and losing the term $xz'$ (it is the harmless consensus term)."],
    "verification": "Rows where $f = 1$: $xy' = 1$ at 100, 101; $yz' = 1$ at 010, 110. $(x + y)(yz)'$ is 1 at 010, 100, 101, 110 and 0 elsewhere (at 011 and 111, $yz = 1$). Same four rows.",
}

SOLUTIONS["cse-1994-a-27-b"] = {
    "approach": "Concept tested: **solving Boolean equations**. A sum equal to 0 forces every term to 0; substitute what you learn into the other equation.",
    "concepts": ["Boolean equations", "OR is 0 iff all terms are 0"],
    "steps": [
        {"title": "Start with the equation equal to 0", "body": "$AC + B = 0$ forces $B = 0$ and $AC = 0$."},
        {"title": "Substitute into the first equation", "body": "With $B = 0$, $AB = 0$, so $AB + \\overline{A}C = 1$ becomes $\\overline{A}C = 1$, which forces $\\overline{A} = 1$ and $C = 1$, i.e. $A = 0$, $C = 1$."},
        {"title": "Check the remaining condition", "body": "$AC = 0 \\cdot 1 = 0$, as required."},
    ],
    "answer": {"value": "$A = 0, B = 0, C = 1$", "matchesKey": True},
    "shortcut": "A product equal to 1 ($\\overline{A}C = 1$) pins every factor; a sum equal to 0 pins every term.",
    "pitfalls": ["Starting with the first equation, which has several solutions on its own.", "Forgetting to re-check $AC = 0$."],
    "verification": "$AB + \\overline{A}C = 0 + 1 \\cdot 1 = 1$ and $AC + B = 0 + 0 = 0$. A truth-table search over all 8 rows finds this as the only solution.",
}

SOLUTIONS["cse-1995-a-30"] = {
    "approach": "Concept tested: **simultaneous Boolean equations**. The first equation pins $A$ and $B$, the second then pins $C$, the third $D$.",
    "concepts": ["Boolean equations", "Sum = 0 rule"],
    "steps": [
        {"title": "First equation", "body": "$\\overline{A} + AB = 0$ needs both terms 0: $\\overline{A} = 0 \\Rightarrow A = 1$, and $AB = 0 \\Rightarrow B = 0$."},
        {"title": "Second equation", "body": "$AB = AC$ becomes $0 = 1 \\cdot C$, so $C = 0$."},
        {"title": "Third equation", "body": "$AB + A\\overline{C} + CD = \\overline{C}D$ becomes $0 + 1 + 0 = 1 \\cdot D$, so $D = 1$."},
        {"title": "Conclusion", "body": "$A = 1, B = 0, C = 0, D = 1$: option (A)."},
    ],
    "answer": {"value": "(A) $A = 1, B = 0, C = 0, D = 1$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Satisfies all three equations; it is the unique solution."),
        opt("B", False, "$B = 1$ makes $\\overline{A} + AB = 1 \\ne 0$."),
        opt("C", False, "$C = 1$ breaks $AB = AC$ ($0 \\ne 1$)."),
        opt("D", False, "$D = 0$ breaks the third equation: the left side is 1, the right side $\\overline{C}D = 0$."),
    ],
    "shortcut": "Substitute the options: (B) fails the first equation, (C) the second, (D) the third.",
    "pitfalls": ["Cancelling $A$ in $AB = AC$ to get $B = C$: cancellation is not allowed in general (it happens to be valid here only because $A = 1$)."],
    "verification": "Searching all 16 rows, the three equations hold only at $ABCD = 1001$.",
}

SOLUTIONS["cse-2000-a-2-10"] = {
    "approach": "Concept tested: **simultaneous Boolean equations**, checked option by option. Note that the system has several solutions; the question only asks which offered tuple is one of them.",
    "concepts": ["Boolean equations", "Substitution"],
    "steps": [
        {"title": "Read off the constraints", "body": "$xy = 0$ (from the second equation; then the fourth reduces to $\\bar{z}\\bar{w} = 0$, so $z$ and $w$ are not both 0); $x + y + z = 1$; $xz + w = 1$."},
        {"title": "Test each option (x y z w)", "body": "| Option | $x+y+z$ | $xy$ | $xz+w$ | $xy+\\bar z\\bar w$ | OK? |\n|---|---|---|---|---|---|\n| A: 0 1 0 0 | 1 | 0 | **0** | **1** | no |\n| B: 1 1 0 1 | 1 | **1** | 1 | **1** | no |\n| C: 1 0 1 1 | 1 | 0 | 1 | 0 | yes |\n| D: 1 0 0 0 | 1 | 0 | **0** | **1** | no |"},
        {"title": "Conclusion", "body": "Only (C) satisfies all four equations."},
    ],
    "answer": {"value": "(C) 1 0 1 1", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$xz + w = 0 \\ne 1$, and $\\bar{z}\\bar{w} = 1$ breaks the fourth equation."),
        opt("B", False, "$xy = 1$ breaks the second equation."),
        opt("C", True, "All four equations hold."),
        opt("D", False, "$xz + w = 0$ and $\\bar{z}\\bar{w} = 1$."),
    ],
    "shortcut": "The fourth equation with $xy = 0$ says $z + w = 1$; together with $xz + w = 1$ it rejects every option with $w = 0$ unless $x = z = 1$. Only (C) survives.",
    "pitfalls": ["Assuming the solution is unique: a full search finds six solutions (0011, 0101, 0111, 1001, 1010, 1011); (C) is the only one offered."],
    "verification": "$1 + 0 + 1 = 1$, $1 \\cdot 0 = 0$, $1 \\cdot 1 + 1 = 1$, $0 + 0 \\cdot 0 = 0$.",
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
