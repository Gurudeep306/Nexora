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


# ── Lesson 3: XOR, XNOR and defined operators ───────────────────────────────

SOLUTIONS["cse-2013-cs-21"] = {
    "approach": "Concept tested: **complemented inputs of XOR**. Each complement (on an input, or turning XOR into XNOR) toggles the function; two complements cancel.",
    "concepts": ["XOR / XNOR identities", "Complemented inputs"],
    "steps": [
        {"title": "The target", "body": "XNOR: $x \\odot y = (x \\oplus y)' = xy + x'y'$."},
        {"title": "One complemented input", "body": "$x \\oplus y' = x \\oplus y \\oplus 1 = (x \\oplus y)'$ and likewise $x' \\oplus y = (x \\oplus y)'$: both are XNOR."},
        {"title": "Two complemented inputs", "body": "$x' \\oplus y' = x \\oplus y \\oplus 1 \\oplus 1 = x \\oplus y$: plain XOR, not XNOR."},
    ],
    "answer": {"value": "(D) $x' \\oplus y'$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$xy + x'y'$ is the sum-of-products form of XNOR."),
        opt("B", False, "One complemented input turns XOR into XNOR."),
        opt("C", False, "One complemented input turns XOR into XNOR."),
        opt("D", True, "Two complements cancel: $x' \\oplus y' = x \\oplus y$, the opposite of XNOR."),
    ],
    "shortcut": "Count complements: XNOR has one relative to XOR. (B) and (C) have one, (D) has two.",
    "pitfalls": ["Assuming that complementing both inputs complements the output twice 'in the same direction'."],
    "verification": "At $x = y = 0$: XNOR is 1; (D) gives $1 \\oplus 1 = 0$.",
}

SOLUTIONS["cse-2018-cs-4"] = {
    "approach": "Concept tested: **XOR/XNOR identities**: $\\overline{P} \\oplus Q = \\overline{P \\oplus Q} = P \\odot Q$, $X \\oplus 1 = \\overline{X}$ and $X \\odot 0 = \\overline{X}$. Check each option.",
    "concepts": ["XOR / XNOR identities", "Complemented inputs"],
    "steps": [
        {"title": "(A) and (B)", "body": "(A) is the definition of XNOR. (B) one complemented input gives XNOR: $\\overline{P} \\oplus Q = P \\oplus Q \\oplus 1 = P \\odot Q$. Both correct."},
        {"title": "(C)", "body": "$\\overline{P} \\oplus \\overline{Q} = P \\oplus Q \\oplus 1 \\oplus 1 = P \\oplus Q$. Correct."},
        {"title": "(D)", "body": "Left: $P \\oplus \\overline{P} = 1$, so $1 \\oplus Q = \\overline{Q}$. Right: $P \\odot \\overline{P} = 0$, so $0 \\odot \\overline{Q} = \\overline{\\overline{Q}} = Q$. Left $\\overline{Q}$, right $Q$: **not correct**."},
    ],
    "answer": {"value": "(D)", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Correct by definition."),
        opt("B", False, "Correct: one complemented input gives XNOR."),
        opt("C", False, "Correct: two complements cancel."),
        opt("D", True, "Not correct: the left side is $\\overline{Q}$, the right side is $Q$."),
    ],
    "shortcut": "In (D), $P \\oplus \\overline{P} = 1$ and $P \\odot \\overline{P} = 0$; XOR with 1 inverts and XNOR with 0 inverts, so the left side is $\\overline{Q}$ and the right side is $\\overline{\\overline{Q}} = Q$.",
    "pitfalls": ["Treating $X \\odot 0$ as $X$ (that is $X \\oplus 0$)."],
    "verification": "At $Q = 0$: left $1 \\oplus 0 = 1$; right $0 \\odot 1 = 0$.",
}

SOLUTIONS["cse-2026-1-cs-11"] = {
    "approach": "Concept tested: **XOR of a function with a sub-function, and XOR forms**. Since $\\bar{P}Q$ implies $\\bar{P} + Q$, XOR removes those rows: $F = (\\bar{P} + Q)\\cdot\\overline{\\bar{P}Q}$. Then recognise which XOR forms equal the result.",
    "concepts": ["XOR / XNOR identities", "Complemented inputs", "Truth tables"],
    "steps": [
        {"title": "Truth table of F", "body": "| $P$ | $Q$ | $\\bar{P} + Q$ | $\\bar{P}Q$ | $F$ |\n|---|---|---|---|---|\n| 0 | 0 | 1 | 0 | 1 |\n| 0 | 1 | 1 | 1 | 0 |\n| 1 | 0 | 0 | 0 | 0 |\n| 1 | 1 | 1 | 0 | 1 |"},
        {"title": "Name it", "body": "$F$ is 1 on rows 00 and 11: $F = P \\odot Q = \\overline{P \\oplus Q}$."},
        {"title": "Check the options", "body": "(A) $\\overline{P \\oplus Q}$: XNOR, equal. (B) $P \\oplus Q$: the complement, not equal. (C) $\\bar{P} \\oplus Q$: one complement, XNOR, equal. (D) $\\bar{P} \\oplus \\bar{Q}$: two complements cancel, XOR, not equal."},
    ],
    "answer": {"value": "(A) and (C)", "choice": ["A", "C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "$F$ is XNOR."),
        opt("B", False, "XOR is the complement of $F$."),
        opt("C", True, "One complemented input turns XOR into XNOR."),
        opt("D", False, "Two complements cancel, giving XOR."),
    ],
    "shortcut": "When $Y$ implies $X$ (every 1 of $Y$ is a 1 of $X$), $X \\oplus Y = X\\bar{Y}$: here $(\\bar{P} + Q)(P + \\bar{Q}) = PQ + \\bar{P}\\bar{Q}$.",
    "pitfalls": ["Treating $\\oplus$ like $+$ and simplifying $(\\bar{P} + Q) \\oplus \\bar{P}Q$ by absorption to $\\bar{P} + Q$."],
    "verification": "Row 01: $F = 1 \\oplus 1 = 0$; (A) gives 0, (C) gives $1 \\oplus 1 = 0$; (B) gives 1.",
}

SOLUTIONS["cse-2014-3-cs-55"] = {
    "approach": "Concept tested: **XOR associativity and cancellation**. Flatten the whole expression, cancel equal terms in pairs, and keep what is left.",
    "concepts": ["XOR algebra", "Associativity", "XNOR"],
    "steps": [
        {"title": "Flatten", "body": "XOR is associative and commutative, so drop the brackets: $F = 1 \\oplus P \\oplus P \\oplus Q \\oplus P \\oplus Q \\oplus Q \\oplus 0$."},
        {"title": "Count copies", "body": "$P$ appears 3 times and $Q$ 3 times (odd: one copy of each survives); the constants give $1 \\oplus 0 = 1$."},
        {"title": "Result", "body": "$F = 1 \\oplus P \\oplus Q = \\overline{P \\oplus Q}$: option (D)."},
    ],
    "answer": {"value": "(D) $\\overline{P \\oplus Q}$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$P + Q$ is 0 on row 00, where $F = \\overline{0 \\oplus 0} = 1$."),
        opt("B", False, "NOR is 0 on row 11, but $F(1, 1) = 1$."),
        opt("C", False, "XOR is the complement of $F$."),
        opt("D", True, "Flattening leaves $1 \\oplus P \\oplus Q$."),
    ],
    "shortcut": "Count each symbol's copies mod 2: $P$ 3, $Q$ 3, constant 1 once.",
    "pitfalls": ["Dropping the leading constant 1 and answering $P \\oplus Q$."],
    "verification": "Row 00: $((1 \\oplus 0) \\oplus 0) \\oplus (0 \\oplus 0) = 1$, and $\\overline{0 \\oplus 0} = 1$.",
}

SOLUTIONS["it-2005-cs-7"] = {
    "approach": "Concept tested: **parity**. $(A \\oplus B) \\oplus C$ is 1 exactly on the rows with an odd number of 1s: minterms 1, 2, 4, 7. List the minterms of each option.",
    "concepts": ["XOR", "Parity function", "Minterms"],
    "steps": [
        {"title": "Target", "body": "Odd weight rows: 001, 010, 100, 111, i.e. $\\Sigma(1, 2, 4, 7)$."},
        {"title": "(A) and (B)", "body": "(A) $(A + B + C)(\\overline{A} + \\overline{B} + \\overline{C})$ is 0 only on 000 and 111: $\\Sigma(1, \\ldots, 6)$. (B) is 0 only on 000 and 110. Neither is the parity function."},
        {"title": "(C)", "body": "$ABC = m_7$; $\\overline{A}(B \\oplus C)$: $A = 0$ and $B \\ne C$, rows 001, 010; $\\overline{B}(A \\oplus C)$: $B = 0$ and $A \\ne C$, rows 001, 100. Union $\\{1, 2, 4, 7\\}$: equal."},
    ],
    "answer": {"value": "(C)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "1 on six rows (all but 000 and 111)."),
        opt("B", False, "1 on six rows (all but 000 and 110)."),
        opt("C", True, "Covers exactly $m_1, m_2, m_4, m_7$."),
        opt("D", False, "(C) is equivalent, so 'none of these' is wrong."),
    ],
    "shortcut": "The parity function is neutral (4 of 8 rows). (A) and (B) are 1 on 6 rows, so only (C) can match.",
    "pitfalls": ["Thinking 'odd parity' means 'not all equal' (that is option A)."],
    "verification": "Row 111: target 1; (C) $ABC = 1$. Row 011: target 0; (C): $ABC = 0$, $\\overline{A}(1 \\oplus 1) = 0$, $\\overline{B} = 0$. ✓",
}

SOLUTIONS["cse-2016-2-cs-8"] = {
    "approach": "Concept tested: **even parity and complemented inputs**. $x_1 \\oplus x_2 \\oplus x_3 \\oplus x_4 = 0$ means an even number of 1s; rearrange it, and refute the other options with one assignment each.",
    "concepts": ["XOR properties", "Even parity", "Complemented inputs"],
    "steps": [
        {"title": "Rewrite the condition", "body": "XOR is commutative and associative: $x_1 \\oplus x_3 = x_2 \\oplus x_4$ (move $x_2 \\oplus x_4$ across)."},
        {"title": "Option C", "body": "Complementing both inputs of an XOR leaves it unchanged: $\\bar{x}_1 \\oplus \\bar{x}_3 = x_1 \\oplus x_3$ and $\\bar{x}_2 \\oplus \\bar{x}_4 = x_2 \\oplus x_4$. So (C) is exactly the rewritten condition: it must hold."},
        {"title": "Refute the others", "body": "$x = 1111$ (four 1s, even) breaks (A) ($x_1x_2x_3x_4 = 1$), (B) ($x_1x_3 + x_2 = 1$) and (D) (the OR is 1)."},
    ],
    "answer": {"value": "(C)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Fails at 1111, which has even parity."),
        opt("B", False, "Fails at 1111 (also at 0101)."),
        opt("C", True, "A rearrangement of the given parity condition."),
        opt("D", False, "Fails at any even-weight row other than 0000, e.g. 1100."),
    ],
    "shortcut": "'XOR = 0' means an **even** number of 1s, which includes 1111 and 1100; that one assignment kills (A), (B) and (D).",
    "pitfalls": ["Reading 'XOR = 0' as 'all inputs are 0'.", "Reading it as 'the number of 1s is a multiple of 4' (it is any even number)."],
    "verification": "Over all 16 rows, the 8 rows with even parity all satisfy (C); each of the others fails on at least one of them.",
}

SOLUTIONS["cse-1998-a-13"] = {
    "approach": "Concept tested: **iterated XOR**. $B \\oplus B = 0$ and $B \\oplus 0 = B$, so only the number of copies of $B$ (mod 2) matters. With $n$ XOR *operations* there are $n + 1$ copies.",
    "concepts": ["XOR properties", "Iterated XOR"],
    "steps": [
        {"title": "Basic identities", "body": "$B \\oplus B = 0$, $B \\oplus 0 = B$, and $\\oplus$ is associative, so copies cancel in pairs."},
        {"title": "Count the copies", "body": "'XORed with itself $n$ times' means $n$ XOR operations: $B \\oplus B$ (one operation, two copies) $= 0$; two operations, three copies: $B$; and so on. $n$ operations join $n + 1$ copies."},
        {"title": "Conclude", "body": "$n + 1$ copies leave $B$ when $n + 1$ is odd, that is when $n$ is **even**. So the string remains unchanged when $n$ is even: option (D)."},
    ],
    "answer": {"value": "(D) remains unchanged when n is even", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "XOR with copies of itself never complements: it gives $B$ or $0$."),
        opt("B", False, "Same reason: no complement ever appears; for odd $n$ the result is 0."),
        opt("C", False, "XOR has nothing to do with division by 2 (that is a right shift)."),
        opt("D", True, "Even $n$ means an odd number $n + 1$ of copies, leaving $B$."),
    ],
    "shortcut": "Translate words into copies first: $n$ operations = $n + 1$ copies; odd copies = $B$.",
    "pitfalls": ["Counting $n$ copies instead of $n$ operations, which flips the answer; read the bracket $B \\oplus (B \\oplus (B \\ldots))$ as $n$ XOR signs."],
    "verification": "$n = 2$: $B \\oplus (B \\oplus B) = B \\oplus 0 = B$ (unchanged, $n$ even). $n = 1$: $B \\oplus B = 0$.",
}

SOLUTIONS["cse-1992-a-2-i"] = {
    "approach": "Concept tested: **commutativity and associativity of operators**. All four operators are commutative; test associativity, which only NAND fails.",
    "concepts": ["Commutativity", "Associativity", "NAND"],
    "steps": [
        {"title": "Commutativity", "body": "AND, OR, XOR and NAND are all symmetric in their two inputs (rows 01 and 10 give the same output)."},
        {"title": "AND, OR, XOR are associative", "body": "AND: both bracketings are 1 iff all three are 1. OR: iff any is 1. XOR: both give the parity of $a, b, c$."},
        {"title": "NAND is not", "body": "$(a \\uparrow b) \\uparrow c = ab + \\bar{c}$ and $a \\uparrow (b \\uparrow c) = \\bar{a} + bc$. At $a = b = 0, c = 1$: the first is 0, the second 1."},
    ],
    "answer": {"value": "(D) NAND", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "AND is commutative and associative."),
        opt("B", False, "OR is commutative and associative."),
        opt("C", False, "XOR is commutative and associative (parity)."),
        opt("D", True, "Commutative, but $(0 \\uparrow 0) \\uparrow 1 = 0 \\ne 1 = 0 \\uparrow (0 \\uparrow 1)$."),
    ],
    "shortcut": "Inverting gates (NAND, NOR) lose associativity; AND, OR, XOR, XNOR keep it.",
    "pitfalls": ["Marking XOR as non-associative because it is 'not idempotent'."],
    "verification": "8-row comparison of the two NAND bracketings: they differ on rows 001, 011, 100, 110.",
}

SOLUTIONS["cse-1998-a-43"] = {
    "approach": "Concept tested: **associativity test**. All four operators are commutative; compare $(a \\star b) \\star c$ with $a \\star (b \\star c)$. NAND fails, the others pass.",
    "concepts": ["Boolean operators", "Associativity", "NAND"],
    "steps": [
        {"title": "Commutativity", "body": "AND, OR, NAND and EXOR all give equal outputs on rows 01 and 10."},
        {"title": "Associativity of NAND", "body": "$(a \\uparrow b) \\uparrow c = ab + \\bar{c}$, $a \\uparrow (b \\uparrow c) = \\bar{a} + bc$. They differ at $(0, 0, 1)$."},
        {"title": "The others", "body": "AND, OR and EXOR are associative (all-ones, any-one and parity respectively), so NAND is the only one that is commutative but not associative."},
    ],
    "answer": {"value": "(C) NAND", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "AND is associative."),
        opt("B", False, "OR is associative."),
        opt("C", True, "Commutative but not associative."),
        opt("D", False, "EXOR is associative."),
    ],
    "shortcut": "Same fact as the 1992 question: NAND and NOR are the commutative, non-associative gates.",
    "pitfalls": ["Assuming every commutative operator is associative."],
    "verification": "$(0 \\uparrow 0) \\uparrow 1 = 1 \\uparrow 1 = 0$, $0 \\uparrow (0 \\uparrow 1) = 0 \\uparrow 1 = 1$.",
}

SOLUTIONS["cse-2015-1-cs-28"] = {
    "approach": "Concept tested: **identifying an operator from its table** and testing its properties. The table 0, 1, 1, 0 is XOR.",
    "concepts": ["XOR", "Commutativity", "Associativity"],
    "steps": [
        {"title": "Identify", "body": "$p \\neq q$ is 1 exactly when $p$ and $q$ differ: it is XOR."},
        {"title": "Commutative", "body": "Rows $(0, 1)$ and $(1, 0)$ both give 1, so $p \\neq q = q \\neq p$."},
        {"title": "Associative", "body": "Both bracketings $(p \\neq q) \\neq r$ and $p \\neq (q \\neq r)$ equal the parity of $p, q, r$, so they agree on all 8 rows."},
    ],
    "answer": {"value": "(A) both commutative and associative", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "XOR is both."),
        opt("B", False, "XOR is associative (parity), so 'not associative' is wrong."),
        opt("C", False, "The table is symmetric, so it is commutative."),
        opt("D", False, "It has both properties."),
    ],
    "shortcut": "Name the operator first: the column 0110 is XOR, whose properties you already know.",
    "pitfalls": ["Reading '$\\neq$' as 'not equal to' in the arithmetic sense and doubting associativity because '$a \\ne b \\ne c$' is ambiguous in words."],
    "verification": "Row $(1, 1, 1)$: $(1 \\neq 1) \\neq 1 = 0 \\neq 1 = 1$ and $1 \\neq (1 \\neq 1) = 1 \\neq 0 = 1$.",
}

SOLUTIONS["cse-2016-1-cs-6"] = {
    "approach": "Concept tested: **identifying a defined operator from properties**. The first two properties already fix all four rows of the table.",
    "concepts": ["Defined operators", "XOR"],
    "steps": [
        {"title": "Use x # 0 = x", "body": "Rows $(0, 0) \\to 0$ and $(1, 0) \\to 1$."},
        {"title": "Use x # 1 = x̄", "body": "Rows $(0, 1) \\to 1$ and $(1, 1) \\to 0$."},
        {"title": "Name it and check", "body": "Column 0, 1, 1, 0 (rows 00, 01, 10, 11): XOR, $x \\bar{y} + \\bar{x} y$. Consistency: $x \\oplus x = 0$ and $x \\oplus \\bar{x} = 1$, the other two properties."},
    ],
    "answer": {"value": "(A) $x\\bar{y} + \\bar{x}y$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "XOR, which satisfies all four properties."),
        opt("B", False, "$x\\bar{y} + \\bar{x}\\bar{y} = \\bar{y}$; then $x \\# 0 = 1$, not $x$."),
        opt("C", False, "$\\bar{x}y + xy = y$; then $x \\# 0 = 0$, not $x$."),
        opt("D", False, "XNOR: $x \\# 0 = \\bar{x}$, not $x$."),
    ],
    "shortcut": "'XOR with 0 copies, XOR with 1 inverts' is the controlled-inverter description of XOR.",
    "pitfalls": ["Confusing XOR (identity 0) with XNOR (identity 1)."],
    "verification": "Option (A) at $y = 0$: $x \\cdot 1 + \\bar{x} \\cdot 0 = x$. ✓",
}

SOLUTIONS["cse-1994-a-27-a-i"] = {
    "approach": "Concept tested: **a defined operator**: $A * B = AB + \\bar{A}\\bar{B}$ is XNOR (equivalence). Substitute $B = A$.",
    "concepts": ["XNOR / equivalence", "Idempotence", "Complement law"],
    "steps": [
        {"title": "Substitute", "body": "$A * A = A \\cdot A + \\bar{A} \\cdot \\bar{A} = A + \\bar{A}$ (idempotence)."},
        {"title": "Simplify", "body": "$A + \\bar{A} = 1$ (complement law). Equivalently, XNOR of equal inputs is always 1."},
    ],
    "answer": {"value": "$A * A = 1$", "matchesKey": True},
    "shortcut": "XNOR is equality, and $A$ always equals $A$.",
    "pitfalls": ["Answering $A$ (that would be AND or OR of $A$ with itself)."],
    "verification": "$A = 0$: $0 + 1 = 1$; $A = 1$: $1 + 0 = 1$.",
}

SOLUTIONS["cse-1994-a-27-a-ii"] = {
    "approach": "Concept tested: **undoing an XNOR**. $*$ is XNOR, which is commutative and associative with $A * A = 1$ and $1 * B = B$.",
    "concepts": ["XNOR / equivalence", "Associativity", "Moving a term across"],
    "steps": [
        {"title": "Regroup", "body": "$C * A = (A * B) * A = (A * A) * B$ (commutative and associative)."},
        {"title": "Simplify", "body": "$A * A = 1$ and $1 * B = 1 \\cdot B + 0 \\cdot \\bar{B} = B$. So $C * A = B$."},
        {"title": "Check by table", "body": "| $A$ | $B$ | $C = A * B$ | $C * A$ |\n|---|---|---|---|\n| 0 | 0 | 1 | 0 |\n| 0 | 1 | 0 | 1 |\n| 1 | 0 | 0 | 0 |\n| 1 | 1 | 1 | 1 |\n\nThe last column equals $B$."},
    ],
    "answer": {"value": "$C * A = B$", "matchesKey": True},
    "shortcut": "XNOR, like XOR, can be undone: if $C = A \\odot B$ then $C \\odot A = B$.",
    "pitfalls": ["Assuming XNOR is not associative because XNOR *gates* with three inputs behave differently (that concerns gates, not the operator chain)."],
    "verification": "The four rows of the table.",
}

SOLUTIONS["cse-2007-cs-33"] = {
    "approach": "Concept tested: **XNOR algebra**. $X * Y = XY + X'Y'$ is XNOR $= X \\oplus Y \\oplus 1$; it is associative and commutative, so each statement reduces by cancelling equal terms.",
    "concepts": ["XNOR", "XOR algebra", "Moving a term across"],
    "steps": [
        {"title": "Rewrite", "body": "$Z = X * Y = X \\oplus Y \\oplus 1$."},
        {"title": "Statements P and Q", "body": "$Y * Z = Y \\oplus (X \\oplus Y \\oplus 1) \\oplus 1 = X$: P holds. By symmetry $X * Z = Y$: Q holds."},
        {"title": "Statement R", "body": "$X * Y * Z = Z * Z = 1$ (XNOR of equal values; the chain is unambiguous because XNOR is associative): R holds."},
    ],
    "answer": {"value": "(D) all of P, Q, R are valid", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "R is also valid."),
        opt("B", False, "P is also valid."),
        opt("C", False, "Q is also valid."),
        opt("D", True, "All three reduce to identities."),
    ],
    "shortcut": "If $Z = X \\odot Y$, then $X, Y, Z$ have even 'XNOR-parity': any one is the XNOR of the other two, and the XNOR of all three is 1.",
    "pitfalls": ["Doubting R because $X * Y * Z$ has no brackets: XNOR is associative, so both bracketings agree."],
    "verification": "All four $(X, Y)$ rows: $Z = 1, 0, 0, 1$; $Y * Z = 0, 0, 1, 1 = X$; $X * Z = 0, 1, 0, 1 = Y$; $Z * Z = 1$.",
}

SOLUTIONS["cse-1997-a-11"] = {
    "approach": "Concept tested: **a defined implication operator and nesting**. $x * y = \\bar{x} + y$; substitute $z = \\bar{x} + y$ into $z * x = \\bar{z} + x$ and simplify.",
    "concepts": ["Implication", "De Morgan's law", "Absorption"],
    "steps": [
        {"title": "Apply the definition", "body": "$z * x = \\bar{z} + x = \\overline{\\bar{x} + y} + x$."},
        {"title": "De Morgan", "body": "$\\overline{\\bar{x} + y} = x\\bar{y}$, so $z * x = x\\bar{y} + x$."},
        {"title": "Absorb", "body": "$x\\bar{y} + x = x$ (absorption). Option (B)."},
    ],
    "answer": {"value": "(B) $x$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\bar{x} + y$ is $z$ itself, not $z * x$."),
        opt("B", True, "$\\bar{z} + x = x\\bar{y} + x = x$."),
        opt("C", False, "At $x = 1$ the result is 1, so it is not the constant 0."),
        opt("D", False, "At $x = 0$: $z = 1$, so $z * x = 0 + 0 = 0$, not 1."),
    ],
    "shortcut": "Check $x = 0$ and $x = 1$: $x = 1$ gives $\\bar{z} + 1 = 1$; $x = 0$ gives $z = 1$, so $\\bar{z} + 0 = 0$. The result equals $x$.",
    "pitfalls": ["Swapping the arguments (computing $x * z$ instead of $z * x$): implication is not commutative."],
    "verification": "Rows $(x, y)$: (0,0): $z = 1$, $z * x = 0$; (0,1): $z = 1$, 0; (1,0): $z = 0$, $1 + 1 = 1$; (1,1): $z = 1$, $0 + 1 = 1$. Column = $x$.",
}

SOLUTIONS["cse-2002-a-28"] = {
    "approach": "Concept tested: **nested operators**. $f(A, B) = A' + B$ is implication; evaluate from the inside out, simplifying at each level.",
    "concepts": ["Nested operators", "Absorption law", "De Morgan's law"],
    "steps": [
        {"title": "Inner call", "body": "$f(x + y, y) = (x + y)' + y = x'y' + y = x' + y$ (redundant literal: $y + y'x' = y + x'$)."},
        {"title": "Outer call", "body": "$f(x' + y, z) = (x' + y)' + z = xy' + z$ (De Morgan)."},
        {"title": "Match", "body": "$xy' + z$ is option (C)."},
    ],
    "answer": {"value": "(C) $xy' + z$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$x' + z$ is 1 at $x = 0, z = 0$, but there $xy' + z = 0$."),
        opt("B", False, "$xyz$ is 0 at $x = 1, y = 0, z = 0$, but $xy' + z = 1$ there."),
        opt("C", True, "The inside-out simplification."),
        opt("D", False, "(C) is correct."),
    ],
    "shortcut": "Implication: $f(A, B) = 0$ only when $A = 1, B = 0$. The outer call is 0 only when $z = 0$ and the inner value is 1, i.e. $x' + y = 1$; so the result is $\\overline{(x' + y)z'} = xy' + z$.",
    "pitfalls": ["Forgetting to complement the whole first argument: $(x + y)'$ is $x'y'$, not $x' + y'$."],
    "verification": "$x = 1, y = 0, z = 0$: inner $f(1, 0) = 0$, outer $f(0, 0) = 1$; $xy' + z = 1$. ✓",
}


# ── Lesson 4: canonical forms and counting ──────────────────────────────────

SOLUTIONS["cse-2007-cs-3"] = {
    "approach": "Concept tested: **counting Boolean functions**. A function is its truth table's output column: one free bit per row.",
    "concepts": ["Truth table", "Counting functions"],
    "steps": [
        {"title": "Count the rows", "body": "$n$ Boolean variables have $2^n$ input combinations, so the truth table has $2^n$ rows."},
        {"title": "Count the columns", "body": "Each row's output is chosen independently as 0 or 1, so there are $2 \\times 2 \\times \\dots \\times 2$ ($2^n$ factors) $= 2^{2^n}$ different output columns, i.e. functions."},
        {"title": "Check small n", "body": "$n = 1$: $2^{2} = 4$ functions ($0, x, x', 1$); $n = 2$: $2^4 = 16$, the sixteen two-input functions."},
    ],
    "answer": {"value": "(C) $2^{2^n}$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$n^2$ gives 1 for $n = 1$, but there are 4 functions of one variable."),
        opt("B", False, "$2^n$ is the number of rows (input combinations), not of functions."),
        opt("C", True, "One free output bit for each of the $2^n$ rows."),
        opt("D", False, "$2^{n^2}$ gives 2 for $n = 1$ and 16 for $n = 2$ but 512 for $n = 3$, where the true count is 256."),
    ],
    "shortcut": "Rows = $2^n$; functions = $2^{\\text{rows}}$.",
    "pitfalls": ["Answering the number of rows ($2^n$) instead of the number of functions."],
    "verification": "Enumerating every column for $n = 1, 2, 3$ gives 4, 16, 256.",
}

SOLUTIONS["cse-2010-cs-6"] = {
    "approach": "Concept tested: **expanding product terms into minterms**. Write each term as a pattern over $P, Q, R$ ($P$ is the most significant bit), expand the missing variable, and take the union.",
    "concepts": ["Minterms", "Canonical SOP"],
    "steps": [
        {"title": "Patterns", "body": "| Term | Pattern ($PQR$) | Rows | Minterms |\n|---|---|---|---|\n| $PQ$ | $11-$ | 110, 111 | 6, 7 |\n| $Q\\overline{R}$ | $-10$ | 010, 110 | 2, 6 |\n| $P\\overline{R}$ | $1-0$ | 100, 110 | 4, 6 |"},
        {"title": "Union", "body": "$\\{6, 7\\} \\cup \\{2, 6\\} \\cup \\{4, 6\\} = \\{2, 4, 6, 7\\}$: $f = m_2 + m_4 + m_6 + m_7$."},
    ],
    "answer": {"value": "(A) $m_2 + m_4 + m_6 + m_7$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The union of the three terms' minterms."),
        opt("B", False, "$m_0, m_1, m_3, m_5$ are exactly the rows where $f = 0$: this is $\\overline{f}$."),
        opt("C", False, "Contains $m_0, m_1$ ($P = 0, Q = 0$), where every term is 0."),
        opt("D", False, "Contains $m_3$ (011) and $m_5$ (101), where every term is 0."),
    ],
    "shortcut": "$f$ is the majority-like 'at least two of $P, Q, \\overline{R}$': rows where two or more of $P = 1$, $Q = 1$, $R = 0$ hold: 010, 100, 110, 111.",
    "pitfalls": ["Taking $R$ as the most significant bit, which renumbers every minterm.", "Counting $m_6$ three times instead of once."],
    "verification": "Row 3 (011): $PQ = 0$, $Q\\overline{R} = 0$, $P\\overline{R} = 0$, so $m_3$ is correctly excluded.",
}

SOLUTIONS["cse-2015-3-cs-44"] = {
    "approach": "Concept tested: **Σ and Π lists**. Expand $F = P' + QR$ into minterms ($P$ is the MSB); the maxterms are the remaining rows.",
    "concepts": ["Canonical SOP", "Canonical POS", "Minterms and maxterms"],
    "steps": [
        {"title": "Minterms", "body": "$P' \\to 0--$: rows 0, 1, 2, 3. $QR \\to -11$: rows 3, 7. Union: $F = \\Sigma(0, 1, 2, 3, 7)$."},
        {"title": "Maxterms", "body": "The other rows are 4, 5, 6, so $F = \\Pi(4, 5, 6)$."},
        {"title": "Judge the statements", "body": "S1 $\\Sigma(4,5,6)$: false (those are the 0-rows). S2 $\\Sigma(0,1,2,3,7)$: true. S3 $\\Pi(4,5,6)$: true. S4 $\\Pi(0,1,2,3,7)$: false (that is $F'$)."},
    ],
    "answer": {"value": "(A) S1 false, S2 true, S3 true, S4 false", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Matches the computed lists."),
        opt("B", False, "Swaps the meaning of Σ and Π: S1 and S4 describe $F'$."),
        opt("C", False, "S2 is true: $F$ is 1 on rows 0, 1, 2, 3, 7."),
        opt("D", False, "S1 is false and S3 is true."),
    ],
    "shortcut": "Σ lists the 1-rows, Π the 0-rows; a correct pair (S2, S3) always uses complementary lists.",
    "pitfalls": ["Thinking $\\Pi$ of a list equals $\\Sigma$ of the same list."],
    "verification": "Row 5 (101): $P' = 0$, $QR = 0$, so $F = 0$: 5 is a maxterm. Row 7: $QR = 1$, a minterm.",
}

SOLUTIONS["cse-2024-1-cs-37"] = {
    "approach": "Concept tested: **canonical forms and the majority function**. $\\Sigma(3, 5, 6, 7)$ is the 3-input majority; its Π list is the complementary set, and dependence on a variable is shown by one pair of inputs that differ only in it.",
    "concepts": ["Canonical SOP and POS", "Majority function", "Variable dependence"],
    "steps": [
        {"title": "Recognise the function", "body": "Rows 3, 5, 6, 7 are 011, 101, 110, 111: exactly the rows with at least two 1s. So $F = XY + YZ + XZ$ (majority)."},
        {"title": "(A): the Π form", "body": "The 0-rows are 0, 1, 2, 4, so $F = \\Pi(0, 1, 2, 4)$. Correct."},
        {"title": "(C) and (D): dependence", "body": "$F$ depends on $Y$: with $X = 1, Z = 0$, $Y = 0$ gives row 4 ($F = 0$) and $Y = 1$ gives row 6 ($F = 1$). By symmetry it also depends on $X$ (rows 2 and 6). Both (C) and (D) are false."},
    ],
    "answer": {"value": "(A) and (B)", "choice": ["A", "B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The maxterms are the complementary rows 0, 1, 2, 4."),
        opt("B", True, "The majority function's minimal SOP."),
        opt("C", False, "Rows 4 and 6 differ only in $Y$ but have different outputs."),
        opt("D", False, "Rows 2 and 6 differ only in $X$ but have different outputs."),
    ],
    "shortcut": "Majority is symmetric and depends on every input; as soon as you see $\\Sigma(3, 5, 6, 7)$, (B) is true and (C), (D) are false.",
    "pitfalls": ["Writing $\\Pi(3, 5, 6, 7)$ for the POS form (the same numbers under Π describe the complement)."],
    "verification": "$XY + YZ + XZ$ over rows 0–7 gives 0, 0, 0, 1, 0, 1, 1, 1.",
}

SOLUTIONS["cse-2021-1-cs-42"] = {
    "approach": "Concept tested: **complement of a product of sums, compared by minterm sets**. Find the rows where $F = 1$, complement them, and list each option's rows.",
    "concepts": ["Minterm sets", "Complement", "Canonical forms"],
    "given": "$F = (X + Y + Z)(\\overline{X} + Y)(\\overline{Y} + Z)$",
    "steps": [
        {"title": "Where F = 1", "body": "$(X + Y + Z) = 0$ on row 000; $(\\overline{X} + Y) = 0$ on rows $10- = \\{4, 5\\}$; $(\\overline{Y} + Z) = 0$ on rows $-10 = \\{2, 6\\}$. So $F = \\Pi(0, 2, 4, 5, 6) = \\Sigma(1, 3, 7)$ and $\\overline{F} = \\Sigma(0, 2, 4, 5, 6)$."},
        {"title": "(A)", "body": "Its factors are 0 on rows $\\{7\\}$, $01- = \\{2, 3\\}$ and $-01 = \\{1, 5\\}$, so (A) $= \\Sigma(0, 4, 6)$. Not $\\overline{F}$ (the literals were complemented but the operators were not swapped)."},
        {"title": "(B), (C), (D)", "body": "(B) $X\\overline{Y} \\to 10-$, $\\overline{Z} \\to --0$: $\\{4, 5\\} \\cup \\{0, 2, 4, 6\\} = \\{0, 2, 4, 5, 6\\}$. (C) factors are 0 on $0-1 = \\{1, 3\\}$ and $-11 = \\{3, 7\\}$, so (C) $= \\Sigma(0, 2, 4, 5, 6)$. (D) $\\{4, 5\\} \\cup \\{2, 6\\} \\cup \\{0\\} = \\{0, 2, 4, 5, 6\\}$. All three equal $\\overline{F}$."},
    ],
    "answer": {"value": "(B), (C) and (D)", "choice": ["B", "C", "D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\Sigma(0, 4, 6)$; it misses rows 2 and 5 of $\\overline{F}$."),
        opt("B", True, "$\\Sigma(0, 2, 4, 5, 6) = \\overline{F}$."),
        opt("C", True, "A POS whose maxterms are exactly $F$'s minterms 1, 3, 7."),
        opt("D", True, "The De Morgan expansion of $\\overline{F}$ (one term per factor of $F$)."),
    ],
    "shortcut": "De Morgan gives (D) directly: $\\overline{F} = \\overline{X}\\,\\overline{Y}\\,\\overline{Z} + X\\overline{Y} + Y\\overline{Z}$. Then only (A) needs a row: at 010 (A) is 0 but $\\overline{F} = 1$.",
    "pitfalls": ["Complementing the literals without swapping AND and OR (option A).", "Stopping after finding one correct option in an MSQ."],
    "verification": "Row 010: $F$'s third factor $\\overline{Y} + Z = 0$, so $\\overline{F} = 1$; (B) $\\overline{Z} = 1$ ✓, (C) $(0 + 1)(0 + 1) = 1$ ✓, (D) $Y\\overline{Z} = 1$ ✓, (A) $= 1 \\cdot 0 \\ldots = 0$ ✗.",
}

SOLUTIONS["cse-2001-b-58-a"] = {
    "approach": "Concept tested: **the self-dual test**. A 3-variable function is self-dual iff $f(\\bar{x}) = \\overline{f(x)}$, i.e. of every complementary pair of rows $(m, 7 - m)$ exactly one is a minterm.",
    "concepts": ["Self-dual function", "Duality", "Complementary pairs"],
    "steps": [
        {"title": "Pair the rows", "body": "The complementary pairs are $(0, 7), (1, 6), (2, 5), (3, 4)$ (indices adding up to $2^3 - 1 = 7$)."},
        {"title": "Check each pair", "body": "$f = \\Sigma(0, 1, 2, 4)$ takes 0 from $(0, 7)$, 1 from $(1, 6)$, 2 from $(2, 5)$ and 4 from $(3, 4)$: exactly one from each pair."},
        {"title": "Conclusion", "body": "So $f(\\bar{x}) = \\overline{f(x)}$ on every row and $f$ is self-dual. (In fact $f$ is 'at most one input is 1' $= M(\\bar{A}, \\bar{B}, \\bar{C})$, the majority of the complemented inputs; complementing inputs keeps self-duality.)"},
    ],
    "answer": {"value": "Yes: f = Σ(0, 1, 2, 4) is self-dual", "matchesKey": True},
    "shortcut": "Self-dual ⇔ neutral (4 of 8 minterms) and no complementary pair fully present. Here 4 minterms, and no two of 0, 1, 2, 4 add up to 7.",
    "pitfalls": ["Testing $f = \\overline{f}$ (never true) instead of $f = f^D$.", "Concluding 'self-dual' from neutrality alone."],
    "verification": "Dual expression: $f = A'B' + A'C' + B'C'$ ('at most one 1'); its dual $(A' + B')(A' + C')(B' + C')$ expands back to $A'B' + A'C' + B'C'$.",
}

SOLUTIONS["cse-2014-2-cs-6"] = {
    "approach": "Concept tested: **counting self-dual functions**. A self-dual function satisfies $F(\\bar{x}) = \\overline{F(x)}$; the $2^n$ inputs form $2^{n-1}$ complementary pairs, and choosing $F$ on one member of each pair fixes it on the other.",
    "concepts": ["Duality", "Self-dual functions", "Counting Boolean functions"],
    "steps": [
        {"title": "Dual as a function", "body": "The dual expression computes $F^D(x) = \\overline{F(\\bar{x})}$ (swap $+$/$\\cdot$ = De Morgan with all literals complemented). So $F = F^D$ means $F(\\bar{x}) = \\overline{F(x)}$ for every input $x$."},
        {"title": "Pair the inputs", "body": "Each input $x$ is paired with its bitwise complement $\\bar{x}$; the $2^n$ inputs form $2^{n-1}$ disjoint pairs."},
        {"title": "Count", "body": "In each pair, $F(x)$ can be chosen freely and then $F(\\bar{x}) = \\overline{F(x)}$ is forced. So there are $2^{2^{n-1}}$ self-dual functions."},
    ],
    "answer": {"value": "(D) $2^{2^{n-1}}$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$2^n$ agrees only at $n = 2$ (4); for $n = 3$ there are 16 self-dual functions, not 8."),
        opt("B", False, "$2^{n-1}$ is the number of complementary pairs, not of functions."),
        opt("C", False, "$2^{2^n}$ counts all functions of $n$ variables."),
        opt("D", True, "One free choice per pair."),
    ],
    "shortcut": "Self-dual functions are fixed by half the truth table: $2^{(\\text{rows}/2)}$.",
    "pitfalls": ["Choosing (A) after checking only $n = 2$, where $2^n = 2^{2^{n-1}} = 4$."],
    "verification": "Brute force: $n = 1, 2, 3, 4$ give 2, 4, 16, 256 self-dual functions, matching $2^{2^{n-1}}$.",
}

SOLUTIONS["cse-2025-1-cs-14"] = {
    "approach": "Concept tested: **the majority function**. $X$ is the 3-input majority; its key property is $X(p, p, q) = p$ (two equal inputs decide). Prove the true identities by cases on whether two inputs are equal, and refute the false ones with one assignment.",
    "concepts": ["Majority function", "Boolean identities", "Case analysis"],
    "steps": [
        {"title": "The tool", "body": "If $a = b$, then $X(a, b, z) = a$ whatever $z$ is. If $a \\ne b$, then $X(a, b, z) = z$ (the third input breaks the tie)."},
        {"title": "(B) holds", "body": "$X(a, b, X(a, b, c))$: if $a = b$ both sides are $a$; if $a \\ne b$ the left side is $X(a, b, c)$ (tie broken by the third input). Always equal."},
        {"title": "(D) holds", "body": "$X(a, c, c) = c$, so the right side is $X(a, M, c)$ with $M = X(a, b, c)$. If $a = c$: both sides are $a$. If $a \\ne c$: the right side is $M$ (tie broken), which is the left side."},
        {"title": "(A) and (C) fail", "body": "(A) at $(a, b, c, d, e) = (1, 1, 0, 0, 0)$: left $X(1, 1, 0) = 1$, right $X(X(1,1,0), 0, 0) = X(1, 0, 0) = 0$. (C) at $(a, b, c, d) = (1, 1, 0, 0)$: left $X(1, 1, X(1, 0, 0)) = 1$, right $X(1,1,1) \\text{ AND } X(0,0,0) = 1 \\cdot 0 = 0$."},
    ],
    "answer": {"value": "(B) and (D)", "choice": ["B", "D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Majority is not associative in this sense: fails at $(1, 1, 0, 0, 0)$."),
        opt("B", True, "Case split on $a = b$."),
        opt("C", False, "The right side is just $a \\cdot c$; fails at $(1, 1, 0, 0)$."),
        opt("D", True, "$X(a, c, c) = c$, then case split on $a = c$."),
    ],
    "shortcut": "Simplify the inner calls first: $X(a, b, a) = a$, $X(c, d, c) = c$, $X(a, c, c) = c$. Then (C) becomes '$\\ldots = ac$' and (D) '$X(a, b, c) = X(a, M, c)$'.",
    "pitfalls": ["Assuming the median identities of (A) because they look like associativity.", "Not simplifying $X(a, b, a)$ to $a$ before comparing."],
    "verification": "Brute force over all 32 assignments of $a, \\ldots, e$: (B) and (D) always hold; (A) fails on 4 of the 32 assignments, and (C) on 4 of the 16 assignments of $a, b, c, d$.",
}


# ── Lesson 5: universal gates and completeness ──────────────────────────────

def circuit(title, inputs, gates, out, caption=None):
    f = {"kind": "circuit", "title": title, "inputs": [{"id": i, "label": i, "value": v} for i, v in inputs],
         "gates": [{"id": g, "type": t, "in": ins} for g, t, ins in gates], "outputs": [{"id": "F", "from": out, "label": "F"}]}
    if caption:
        f["caption"] = caption
    return f


SOLUTIONS["it-2004-it-8"] = {
    "approach": "Concept tested: **XOR from NAND gates and minimality**. The standard construction shares one gate, $(AB)'$, between two others; then argue that three gates cannot work.",
    "concepts": ["NAND universality", "XOR realisation", "Minimum gate count"],
    "steps": [
        {"title": "Construction", "body": "$G_1 = \\overline{AB}$, $G_2 = \\overline{A\\,G_1} = \\overline{A} + B$, $G_3 = \\overline{G_1 B} = A + \\overline{B}$, $F = \\overline{G_2 G_3} = \\overline{(\\overline{A} + B)(A + \\overline{B})} = \\overline{AB + \\overline{A}\\,\\overline{B}} = A \\oplus B$. Four gates."},
        {"title": "Why not three", "body": "The output gate is $\\overline{PQ}$, so $PQ$ must be XNOR: $P$ and $Q$ must both be 1 on rows 00 and 11. With at most two earlier gates the only such signals are $\\overline{A} + B$, $A + \\overline{B}$ and the constant 1, and producing both of the first two already takes three gates. So three gates are not enough."},
        {"title": "Conclusion", "body": "The minimum is 4 (an exhaustive search over all circuits confirms it): option (B)."},
    ],
    "answer": {"value": "(B) 4", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Three NANDs cannot compute XOR (see the argument above)."),
        opt("B", True, "The shared-gate construction uses four, and it is minimal."),
        opt("C", False, "Five is the NAND count for XNOR (or for XOR built without sharing)."),
        opt("D", False, "Six or more comes from converting the SOP $A\\overline{B} + \\overline{A}B$ gate by gate."),
    ],
    "shortcut": "Remember the table: XOR = 4 NAND = 5 NOR; XNOR = 5 NAND = 4 NOR.",
    "pitfalls": ["Converting $A\\bar{B} + \\bar{A}B$ directly (2 inverters + 3 NANDs = 5) and calling it the minimum."],
    "verification": "Row 10: $G_1 = 1$, $G_2 = \\overline{1 \\cdot 1} = 0$, $G_3 = \\overline{1 \\cdot 0} = 1$, $F = \\overline{0 \\cdot 1} = 1 = 1 \\oplus 0$.",
    "animation": circuit("XOR from four NAND gates", [("A", 1), ("B", 0)], [("G1", "NAND", ["A", "B"]), ("G2", "NAND", ["A", "G1"]), ("G3", "NAND", ["G1", "B"]), ("G4", "NAND", ["G2", "G3"])], "G4",
                         "A = 1, B = 0: the output is 1."),
}

SOLUTIONS["cse-2009-cs-6"] = {
    "approach": "Concept tested: **NOR–NOR realisation from a product of sums, and a minimality argument**. Rewrite $AB + C$ as $(A + C)(B + C)$, which maps onto two levels of NOR gates; then show two gates are not enough.",
    "concepts": ["NOR as universal gate", "POS form", "NOR–NOR realisation"],
    "steps": [
        {"title": "Product-of-sums form", "body": "By distributivity (OR over AND), $AB + C = (A + C)(B + C)$."},
        {"title": "Three NOR gates", "body": "$G_1 = \\overline{A + C}$, $G_2 = \\overline{B + C}$, $G_3 = \\overline{G_1 + G_2} = \\overline{G_1}\\,\\overline{G_2} = (A + C)(B + C) = AB + C$. So 3 gates suffice."},
        {"title": "Two gates are not enough", "body": "The function depends on $A$, $B$ and $C$, so with two gates the output gate must read the other gate $G = \\overline{x + y}$ and one variable $z$. Its output is $\\overline{G + z} = (x + y)\\bar{z}$, which is 0 whenever $z = 1$. But $AB + C$ is 1 in some row with $z = 1$ whichever variable $z$ is ($C = 1$; or $A = B = 1, C = 0$). So 2 gates cannot work."},
        {"title": "Conclusion", "body": "The minimum is **3**: option (B). (The bank's earlier key D = 5 counted the naive conversion; it has been corrected.)"},
    ],
    "answer": {"value": "(B) 3", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Two NOR gates compute at most $(x + y)\\bar{z}$, never $AB + C$."),
        opt("B", True, "NOR–NOR on $(A + C)(B + C)$: three gates, and two are not enough."),
        opt("C", False, "Four gates work but are not the minimum."),
        opt("D", False, "Five is the count of the naive conversion (AND = 3 NORs, OR = 2 NORs), not the minimum."),
    ],
    "shortcut": "For NOR gates, go to a product of sums first: one NOR per sum term plus one output NOR.",
    "pitfalls": ["Converting the SOP gate by gate and getting 5.", "Forgetting that a minimum question also needs the argument that fewer gates fail."],
    "verification": "Truth table: for $C = 1$ both sums are 1, so the output is 1; for $C = 0$ it is $AB$. Matches $AB + C$ on all 8 rows. An exhaustive search over every 2-gate circuit finds no match.",
    "animation": circuit("AB + C from three NOR gates", [("A", 1), ("B", 1), ("C", 0)], [("G1", "NOR", ["A", "C"]), ("G2", "NOR", ["B", "C"]), ("G3", "NOR", ["G1", "G2"])], "G3",
                         "A = B = 1, C = 0: G1 = G2 = 0, so F = 1 = AB + C."),
}

SOLUTIONS["cse-1995-b-63-a"] = {
    "approach": "Concept tested: **NAND as an OR of complements** (De Morgan): $\\overline{abc} = \\bar{a} + \\bar{b} + \\bar{c}$. Match $Z$ to that pattern; the one literal that appears uncomplemented needs the inverter.",
    "concepts": ["De Morgan's law", "NAND implementation"],
    "steps": [
        {"title": "Rewrite each literal as a complement", "body": "$Z = \\overline{A} + \\overline{B} + C = \\overline{A} + \\overline{B} + \\overline{\\overline{C}}$."},
        {"title": "Apply De Morgan", "body": "$\\bar{a} + \\bar{b} + \\bar{c} = \\overline{abc}$ with $a = A$, $b = B$, $c = \\overline{C}$: $Z = \\overline{A \\cdot B \\cdot \\overline{C}}$."},
        {"title": "The circuit", "body": "One inverter produces $\\overline{C}$; one 3-input NAND gate takes $A$, $B$ and $\\overline{C}$ and outputs $Z$."},
    ],
    "answer": {"value": "Invert C, then $Z = \\text{NAND}(A, B, \\overline{C})$", "matchesKey": True},
    "shortcut": "A NAND is 'OR with bubbled inputs': every input that appears complemented in the OR goes in directly; every uncomplemented one needs an inverter.",
    "pitfalls": ["Feeding $C$ directly (that gives $\\bar{A} + \\bar{B} + \\bar{C}$)."],
    "verification": "Only row $A = B = 1$, $C = 0$ makes $Z = 0$; the NAND's inputs are then $1, 1, 1$, output 0. ✓",
}

SOLUTIONS["cse-2002-b-55-b"] = {
    "approach": "Concept tested: **multi-level NAND conversion by bubble pairs**. The circuit is AND → OR → OR; the first AND–OR level becomes NAND–NAND, and the second OR level needs an inverter (an unpaired bubble) before it can be a NAND too.",
    "concepts": ["NAND-only realisation", "Bubble pushing", "De Morgan's law"],
    "steps": [
        {"title": "Read the circuit", "body": "$f = (ab + cd) + ef$: AND gates on $(a, b)$, $(c, d)$, $(e, f)$, an OR of the first two, and an OR of that with the third."},
        {"title": "First AND–OR level", "body": "$N_1 = \\overline{ab}$, $N_2 = \\overline{cd}$, $N_3 = \\overline{N_1 N_2} = ab + cd$ (NAND–NAND)."},
        {"title": "The second OR level", "body": "To NAND $ab + cd$ with $ef$, the output NAND needs both inputs complemented: $\\overline{ef}$ comes from $N_5 = \\overline{ef}$, and $\\overline{ab + cd}$ needs an inverter $N_4 = \\overline{N_3 N_3}$."},
        {"title": "Output", "body": "$f = \\overline{N_4 N_5} = \\overline{N_4} + \\overline{N_5} = (ab + cd) + ef$. Six 2-input NANDs: $N_1, \\ldots, N_5$ and the output gate."},
    ],
    "answer": {"value": "N1 = (ab)′, N2 = (cd)′, N3 = NAND(N1, N2), N4 = NAND(N3, N3), N5 = (ef)′, f = NAND(N4, N5): six 2-input NANDs", "matchesKey": True},
    "shortcut": "Draw every gate as NAND and count bubbles on each wire: wherever a wire has a single bubble (here between the two OR levels), add one inverter.",
    "pitfalls": ["Replacing every gate by a NAND without the inverter, which computes $\\overline{ab + cd} + ef$.", "Using a 3-input NAND for the OR of three products (the question requires 2-input gates)."],
    "verification": "$a = b = 1$, others 0: $N_1 = 0$, $N_2 = 1$, $N_3 = 1$, $N_4 = 0$, $N_5 = 1$, $f = \\overline{0 \\cdot 1} = 1$. ✓",
}

SOLUTIONS["cse-2015-3-cs-2"] = {
    "approach": "Concept tested: **NAND as an operator**. $X \\# Y = X' + Y' = (XY)'$ is NAND, which is commutative but not associative; confirm the failure of associativity with one assignment.",
    "concepts": ["NAND gate", "Commutativity", "Associativity"],
    "steps": [
        {"title": "Recognise NAND", "body": "$X \\# Y = X' + Y' = (XY)'$ by De Morgan."},
        {"title": "Statement S2", "body": "$Q \\# R = (QR)' = (RQ)' = R \\# Q$: commutative. S2 is true."},
        {"title": "Statement S1", "body": "$(P \\# Q) \\# R = PQ + R'$ and $P \\# (Q \\# R) = P' + QR$. At $P = Q = 0, R = 1$: $0 + 0 = 0$ vs $1 + 0 = 1$. S1 is false."},
    ],
    "answer": {"value": "(B) only S2 is true", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "S1 (associativity) fails at $P = Q = 0, R = 1$."),
        opt("B", True, "NAND is commutative but not associative."),
        opt("C", False, "S1 is false."),
        opt("D", False, "S2 is true: AND, and hence NAND, is symmetric."),
    ],
    "shortcut": "Any NAND/NOR in disguise: commutative yes, associative no.",
    "pitfalls": ["Assuming the De Morgan form $X' + Y'$ is associative because OR is: the primes are applied to the *results* of the inner operation."],
    "verification": "$(0 \\# 0) \\# 1 = 1 \\# 1 = 0$; $0 \\# (0 \\# 1) = 0 \\# 1 = 1$.",
}

SOLUTIONS["cse-1992-a-2-ii"] = {
    "approach": "Concept tested: **functional completeness with constants**. With 0 and 1 available, a component is universal iff it can make a non-monotone function and a non-affine one (equivalently, NOT and AND).",
    "concepts": ["Functional completeness", "Multiplexer", "Half adder"],
    "steps": [
        {"title": "Multiplexer", "body": "A 2:1 MUX $y = \\bar{s}a + sb$: with $a = 1, b = 0$ it gives $\\bar{s}$ (NOT); with $a = 0$ it gives $sb$ (AND). Complete."},
        {"title": "Half adder", "body": "Sum $= x \\oplus y$, carry $= xy$. With $y = 1$ the sum is $\\bar{x}$ (NOT); the carry is AND. Complete."},
        {"title": "Ex-OR gates alone", "body": "Every XOR circuit is an XOR of inputs and constants (affine): it can never compute $xy$. Not complete."},
        {"title": "OR gates alone", "body": "Every OR circuit is monotone (and an OR of inputs): it can never compute $\\bar{x}$. Not complete."},
    ],
    "answer": {"value": "(B) multiplexers and (C) half adders", "choice": ["B", "C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "XOR gates are affine: no AND."),
        opt("B", True, "MUX with constants gives NOT and AND."),
        opt("C", True, "Half adder: sum with 1 is NOT, carry is AND."),
        opt("D", False, "OR gates are monotone: no NOT."),
    ],
    "shortcut": "With free constants, check two things only: can it make a complement (non-monotone)? can it make an AND-like product (non-affine)?",
    "pitfalls": ["Forgetting that the MUX and the half adder need the constants (they are 0- and/or 1-preserving without them); the standard reading allows constants."],
    "verification": "MUX$(x; 1, 0) = \\bar{x}$ and MUX$(x; 0, y) = xy$ on all four rows; half-adder sum with $y = 1$: $0 \\to 1$, $1 \\to 0$.",
}

SOLUTIONS["cse-1999-a-34"] = {
    "approach": "Concept tested: **Post's classes with constants available**. A set is complete iff it contains a non-monotone member and a non-affine member (the constants handle the other three classes).",
    "concepts": ["Functional completeness", "Multiplexer", "Post's criteria"],
    "steps": [
        {"title": "(A) XOR, NOT", "body": "Both are affine ($x \\oplus y$, $x \\oplus 1$); every circuit is an XOR of inputs and constants, so AND is impossible. Not sufficient."},
        {"title": "(B) 2:1 MUX", "body": "$\\text{MUX}(x; 1, 0) = \\bar{x}$ and $\\text{MUX}(x; 0, y) = xy$. Sufficient."},
        {"title": "(C) AND, XOR", "body": "$x \\oplus 1 = \\bar{x}$ gives NOT; with AND that is complete. Sufficient."},
        {"title": "(D) AB + C gates", "body": "$(A \\cdot B) + C$ has no complement and is monotone; constants are monotone too, so every circuit is monotone and NOT is impossible. Not sufficient."},
    ],
    "answer": {"value": "(B) and (C)", "choice": ["B", "C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Trapped in the affine class: no AND."),
        opt("B", True, "MUX with constants builds NOT and AND."),
        opt("C", True, "XOR with 1 is NOT; with AND that is complete."),
        opt("D", False, "Trapped in the monotone class: no NOT."),
    ],
    "shortcut": "Monotone (D) and affine (A) sets are the two classic dead ends.",
    "pitfalls": ["Thinking (D) is complete because it 'contains both AND and OR'.", "Rejecting (C) because neither gate alone is universal."],
    "verification": "Post class table: {XOR, NOT} all affine; {MUX} escapes M and A; {AND, XOR} escapes M (XOR) and A (AND); {AB + C} all monotone.",
}

SOLUTIONS["cse-1993-ii-b-9"] = {
    "approach": "Concept tested: **completeness of a building block**. A half adder outputs $S = x \\oplus y$ and $C = xy$. Show that it yields NOT and AND (with the constant 1), and use the completeness of {AND, NOT}.",
    "concepts": ["Half adder", "Functional completeness", "Constants"],
    "steps": [
        {"title": "AND", "body": "The carry output of a half adder with inputs $x, y$ is $xy$: an AND gate."},
        {"title": "NOT", "body": "Tie one input to logic 1: the sum output is $x \\oplus 1 = \\bar{x}$: an inverter."},
        {"title": "Everything else", "body": "{AND, NOT} is complete: $x + y = \\overline{\\bar{x}\\,\\bar{y}}$, and every function is a canonical SOP of ANDs, ORs and NOTs. So any Boolean function can be built from half adders (and the constant 1)."},
        {"title": "Why the constant is needed", "body": "Without it, every half-adder circuit maps the all-zero input to 0 (both $S$ and $C$ are 0-preserving), so NOT could never be built. The constant 1 is the standard assumption."},
    ],
    "answer": {"value": "Carry gives AND, sum with one input at 1 gives NOT; {AND, NOT} is complete, so half adders realise every function", "matchesKey": True},
    "shortcut": "Any block that offers an AND-type output and an XOR-type output is complete once the constant 1 is available.",
    "pitfalls": ["Claiming completeness without saying where the constant 1 comes from."],
    "verification": "Example: $x + y = \\overline{\\bar{x}\\,\\bar{y}}$ uses three half adders as inverters and one carry as AND, plus one more inverter.",
}

SOLUTIONS["cse-1998-a-57-a"] = {
    "approach": "Concept tested: **building XOR from implication gates**. IMP computes $a \\to b = \\bar{a} + b$. Write $f = x\\bar{y} + \\bar{x}y$ as a single implication whose inputs are themselves implications, using the constant 0 for one negation.",
    "concepts": ["Implication gate", "XOR", "Logic synthesis"],
    "steps": [
        {"title": "XOR as 'not both implications'", "body": "$x \\to y$ is 0 only at $(1, 0)$ and $y \\to x$ only at $(0, 1)$, so $(x \\to y)(y \\to x)$ is XNOR and $f = \\overline{(x \\to y)(y \\to x)} = \\overline{g_1} + \\overline{g_2}$ with $g_1 = x \\to y$, $g_2 = y \\to x$."},
        {"title": "Write it as one implication", "body": "$\\overline{g_1} + \\overline{g_2} = g_1 \\to \\overline{g_2}$, and $\\overline{g_2} = g_2 \\to 0$."},
        {"title": "The four gates", "body": "$g_1 = x \\to y$, $g_2 = y \\to x$, $g_3 = g_2 \\to 0 = \\overline{g_2}$, $f = g_1 \\to g_3$."},
    ],
    "answer": {"value": "g1 = x→y, g2 = y→x, g3 = g2→0 (= ¬g2), f = g1→g3 = ¬g1 + ¬g2 = x⊕y", "matchesKey": True},
    "shortcut": "IMP with 0 is NOT; IMP itself is 'OR with the first input inverted'. XOR = OR of the two 'inhibition' terms, each the complement of an implication.",
    "pitfalls": ["Using the gates without the constant 0: implication is 1-preserving, so some negation must come from a constant."],
    "verification": "| $x$ | $y$ | $g_1$ | $g_2$ | $g_3$ | $f$ |\n|---|---|---|---|---|---|\n| 0 | 0 | 1 | 1 | 0 | 0 |\n| 0 | 1 | 1 | 0 | 1 | 1 |\n| 1 | 0 | 0 | 1 | 0 | 1 |\n| 1 | 1 | 1 | 1 | 0 | 0 |",
}

SOLUTIONS["cse-1998-a-57-b"] = {
    "approach": "Concept tested: **functional completeness by building a known complete set**. Make NOT and OR from implication gates (with the constant 0); {NOT, OR} is complete.",
    "concepts": ["Functional completeness", "Implication gate", "Partial completeness"],
    "steps": [
        {"title": "Build NOT", "body": "$x \\to 0 = \\bar{x} + 0 = \\bar{x}$."},
        {"title": "Build OR", "body": "$(x \\to 0) \\to y = \\bar{\\bar{x}} + y = x + y$."},
        {"title": "Conclude", "body": "{NOT, OR} is functionally complete (AND $= \\overline{\\bar{x} + \\bar{y}}$), so implication gates with the constant 0 can realise every Boolean function."},
        {"title": "Why 0 is essential", "body": "$1 \\to 1 = 1$: implication is 1-preserving, so without the constant 0 every circuit outputs 1 on the all-ones input and NOT is impossible. The gate is *partially* complete."},
    ],
    "answer": {"value": "x→0 = x̄ (NOT); (x→0)→y = x + y (OR); {NOT, OR} is complete (given the constant 0)", "matchesKey": True},
    "shortcut": "To show completeness, build NOT and one of AND/OR; to show the need for a constant, check the all-0 and all-1 rows.",
    "pitfalls": ["Claiming completeness 'without constants', which is false (1-preserving)."],
    "verification": "Post's classes of $x' + y$: not 0-preserving, 1-preserving, not self-dual, not monotone, not affine. Only T₁ traps it, and the constant 0 escapes T₁.",
}

SOLUTIONS["cse-2015-1-cs-39"] = {
    "approach": "Concept tested: **completeness of a single function (no constants)**. Simplify each function; a single function is complete iff $f(0,\\ldots,0) = 1$, $f(1,\\ldots,1) = 0$ and it is not self-dual. Or construct NAND from it directly.",
    "concepts": ["Functional completeness", "NAND universality", "Boolean simplification"],
    "steps": [
        {"title": "Simplify g", "body": "$g = X'YZ + X'YZ' + XY = X'Y + XY = Y$. A circuit of $g$ gates only ever copies an input: not complete."},
        {"title": "Corner test for f", "body": "$f = X'YZ + XY' + Y'Z'$. $f(0,0,0) = Y'Z' = 1$ and $f(1,1,1) = 0$: escapes T₀ and T₁ (and hence M). It has the minterms $\\{0, 3, 4, 5\\}$; rows 3 and 4 are a complementary pair, so it is not self-dual. By the Sheffer criterion, $\\{f\\}$ is complete."},
        {"title": "Constructive check", "body": "$f(X, X, X) = \\bar{X}$ (NOT). $f(X, Y, Y) = X'Y + XY' + Y' = X'Y + Y' = X' + Y' = \\overline{XY}$: a NAND, which is universal."},
    ],
    "answer": {"value": "(B) only {f} is functionally complete", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$g = Y$ cannot even make NOT."),
        opt("B", True, "$f(X, Y, Y) = \\overline{XY}$ is NAND; $g$ is a projection."),
        opt("C", False, "$g$ is the one that fails."),
        opt("D", False, "$f$ is complete."),
    ],
    "shortcut": "Tie inputs together: $f(X, Y, Y)$ already gives NAND.",
    "pitfalls": ["Not simplifying $g$ and assuming it is complete because it contains complemented literals."],
    "verification": "Post's classes of $f$ (by truth table $\\Sigma(0, 3, 4, 5)$): not 0-preserving, not 1-preserving, not self-dual, not monotone, not affine.",
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
