"""Teacher-style v2 solutions for the PYQs of dm/03-sets-relations-functions/01-sets.
Every key is re-derived in l3_01_sets.py (nested sets as frozensets; identities by Venn-region semantics and
by brute force over every assignment of subsets of a small universe; counts by enumeration)."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from dmlib import opt  # noqa: E402

SOLUTIONS = {}


def tt(title, cols, rows, hl=None, caption=None):
    f = {"kind": "table", "title": title, "cols": cols, "rows": rows, "mono": True}
    if hl:
        f["hl"] = [{"r": r, "c": c, "tone": t} for r, c, t in hl]
    if caption:
        f["caption"] = caption
    return f


def venn(title, sets, regions=None, hl=None, caption=None):
    f = {"kind": "venn", "title": title, "sets": [{"id": i, "label": lab} for i, lab in sets]}
    if regions:
        f["regions"] = regions
    if hl is not None:
        f["hl"] = [{"region": r, "tone": t} for r, t in hl]
    if caption:
        f["caption"] = caption
    return f


def eq(title, lines, caption=None):
    f = {"kind": "equation", "title": title, "lines": [{"tex": t, "note": n} if n else {"tex": t} for t, n in lines]}
    if caption:
        f["caption"] = caption
    return f


def hl(*regions, tone="accent"):
    return {"hl": [{"region": r, "tone": tone} for r in regions]}


SOLUTIONS["cse-1993-ii-a-8-4"] = {
    "approach": "Concept tested: **the size of a power set applied to a Cartesian product**. First count the base set $A \\times A$, then raise 2 to that count.",
    "concepts": ["Power set", "Cartesian product", "Product rule"],
    "given": "$|A| = n$. Find $|P(A \\times A)|$.",
    "steps": [
        {"title": "Count the base set", "body": "An element of $A \\times A$ is an ordered pair $(a, b)$: $n$ choices for $a$ and $n$ for $b$, so $|A \\times A| = n^2$.",
         "scene": {"lines": [{"tex": "|A \\times A| = n \\cdot n = n^2", "note": "product rule"}]}},
        {"title": "Power set of the base", "body": "A set with $m$ elements has $2^m$ subsets (one in/out choice per element). With $m = n^2$: $|P(A \\times A)| = 2^{n^2}$.",
         "scene": {"lines": [{"tex": "|A \\times A| = n \\cdot n = n^2", "note": "product rule"}, {"tex": "|P(A \\times A)| = 2^{n^2}", "note": "2 choices per pair", "tone": "success"}]}},
        {"title": "Separate the look-alikes at n = 3", "body": "$2^{2^n} = 256$, $2^{n^2} = 512$, $(2^n)^2 = 64$, $(2^2)^n = 64$. Only option B equals 512 for every $n$; at $n = 2$ options A and B coincide (16), which is why a test value of 3 is safer.",
         "scene": {"lines": [{"tex": "|A \\times A| = n \\cdot n = n^2", "note": "product rule"}, {"tex": "|P(A \\times A)| = 2^{n^2}", "note": "2 choices per pair", "tone": "success"},
                             {"tex": "n = 3:\\; 2^{2^3} = 256,\\; 2^{9} = 512,\\; (2^3)^2 = 64,\\; (2^2)^3 = 64", "note": "only B gives 512"}]}},
    ],
    "answer": {"value": "$2^{n^2}$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$2^{2^n}$ is $|P(P(A))|$, the power set of the power set; it differs from $2^{n^2}$ for $n \\ge 3$ (256 against 512)."),
        opt("B", True, "$|A \\times A| = n^2$, and a set of $n^2$ elements has $2^{n^2}$ subsets."),
        opt("C", False, "$(2^n)^2 = 2^{2n}$ counts ordered **pairs of subsets** of $A$, not subsets of $A \\times A$."),
        opt("D", False, "$(2^2)^n = 4^n = 2^{2n}$, the same wrong value as C."),
        opt("E", False, "B is correct, so 'none of the above' is false."),
    ],
    "shortcut": "Power set of anything: 2 to the number of its elements. Count the elements of the base ($n^2$ pairs) and stop.",
    "pitfalls": ["Confusing $P(A \\times A)$ with $P(A) \\times P(A)$, whose size is $(2^n)^2$.", "Testing with $n = 2$, where $2^{2^n}$ and $2^{n^2}$ are both 16."],
    "verification": "Enumeration for $n = 0, 1, 2, 3$: the power set of $A \\times A$ has $1, 2, 16, 512$ elements, i.e. $2^{n^2}$.",
    "animation": eq("Counting subsets of A × A", [("|A| = n", None)]),
}

SOLUTIONS["cse-1995-a-20"] = {
    "approach": "Concept tested: **elements of a set whose elements are sets**. Count only the items directly inside the outer braces, then use $|P(S)| = 2^{|S|}$.",
    "concepts": ["Power set", "Nested sets", "Cardinality"],
    "given": "$S = \\{\\{\\phi\\}, 1, \\{2, 3\\}\\}$.",
    "steps": [
        {"title": "List the elements", "body": "Directly inside the outer braces are three items: the set $\\{\\phi\\}$, the number $1$ and the set $\\{2, 3\\}$. Do not open the inner sets: $\\phi$, $2$ and $3$ are not elements of $S$.",
         "scene": {"hl": [{"r": 0, "c": 1, "tone": "accent"}, {"r": 1, "c": 1, "tone": "accent"}, {"r": 2, "c": 1, "tone": "accent"}]}},
        {"title": "Apply the power-set formula", "body": "$|S| = 3$, so $|P(S)| = 2^3 = 8$. The formula does not care what the elements look like.",
         "scene": {"hl": [{"r": 3, "c": 1, "tone": "success"}]}},
        {"title": "List them as a check", "body": "$\\emptyset$; $\\{\\{\\phi\\}\\}$, $\\{1\\}$, $\\{\\{2, 3\\}\\}$; $\\{\\{\\phi\\}, 1\\}$, $\\{\\{\\phi\\}, \\{2, 3\\}\\}$, $\\{1, \\{2, 3\\}\\}$; and $S$ itself: $1 + 3 + 3 + 1 = 8$."},
    ],
    "answer": {"value": "8", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "2 would be $|P(S)|$ for a one-element set; $S$ has three elements."),
        opt("B", False, "4 is $2^2$: it treats $\\{\\phi\\}$ as empty and drops it, but $\\{\\phi\\}$ is a non-empty set and an element of $S$."),
        opt("C", True, "Three elements, $2^3 = 8$ subsets."),
        opt("D", False, "C is correct."),
    ],
    "shortcut": "Count the commas at the top level plus one: three elements, eight subsets.",
    "pitfalls": ["Unpacking $\\{2, 3\\}$ into two elements (giving $2^4 = 16$).", "Treating $\\{\\phi\\}$ as the empty set (giving $2^2 = 4$)."],
    "verification": "Built as a Python frozenset $\\{\\{\\emptyset\\}, 1, \\{2, 3\\}\\}$: it has 3 elements and its power set has 8.",
    "animation": tt("The elements of S", ["item", "element of S?"], [["{φ}", "yes (a set)"], ["1", "yes"], ["{2, 3}", "yes (a set)"], ["|P(S)|", "2³ = 8"]]),
}

SOLUTIONS["cse-1996-a-1"] = {
    "approach": "Concept tested: **simplifying a set expression by Venn regions**. With two sets there are four regions; write each piece as a list of regions and take the union.",
    "concepts": ["Set difference", "Venn regions", "Union"],
    "given": "$(A - B) \\cup (B - A) \\cup (A \\cap B)$.",
    "steps": [
        {"title": "Region of A − B", "body": "$A - B$ is the part of $A$ outside $B$: the region 'in $A$ only'.", "scene": hl("A")},
        {"title": "Add B − A", "body": "$B - A$ is the region 'in $B$ only'. Together, $A - B$ and $B - A$ make $A \\,\\Delta\\, B$.", "scene": hl("A", "B")},
        {"title": "Add A ∩ B", "body": "The lens in the middle. Now every region inside either circle is lit: in $A$ only, in $B$ only, in both.", "scene": hl("A", "B", "AB", tone="success")},
        {"title": "Name the result", "body": "The three regions that make up 'inside $A$ or inside $B$' are exactly $A \\cup B$. By laws: $(A \\cap B^c) \\cup (A \\cap B) = A$, and $A \\cup (B \\cap A^c) = A \\cup B$."},
    ],
    "answer": {"value": "$A \\cup B$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The three pieces are the three regions of $A \\cup B$."),
        opt("B", False, "$A^c \\cup B^c = (A \\cap B)^c$ omits the lens $A \\cap B$, which the expression contains, and adds the outside region."),
        opt("C", False, "$A \\cap B$ is only one of the three pieces."),
        opt("D", False, "$A^c \\cap B^c$ is the outside region, which none of the pieces touches."),
    ],
    "shortcut": "'Only $A$', 'only $B$' and 'both' together are 'at least one': $A \\cup B$.",
    "pitfalls": ["Reading $(A - B) \\cup (B - A)$ as the whole answer and forgetting the third piece."],
    "verification": "Region lists over $\\{AB, A, B, -\\}$, and brute force over all pairs of subsets of a 3-element universe: the expression equals $A \\cup B$ and differs from B, C, D.",
    "animation": venn("Regions of A and B", [("A", "A"), ("B", "B")], hl=[]),
}

SOLUTIONS["cse-2000-a-2-6"] = {
    "approach": "Concept tested: **what a power set always contains**. Use $X \\in P(S) \\iff X \\subseteq S$ to test each option; the law $P(A) \\cap P(B) = P(A \\cap B)$ settles option B.",
    "concepts": ["Power set", "Membership versus subset", "Power-set laws"],
    "given": "Which statement about $P(S)$ is always true?",
    "steps": [
        {"title": "Option D is always false", "body": "$S \\subseteq S$, so $S \\in P(S)$ for every set $S$. '$S \\notin P(S)$' never holds.",
         "scene": {"hl": [{"r": 3, "c": 1, "tone": "error"}]}},
        {"title": "Options A and C fail by size", "body": "For finite $S$ with $n$ elements, $|S| = n < 2^n = |P(S)| < 2^{2^n} = |P(P(S))|$. So $P(P(S)) \\ne P(S)$, and $P(S) \\cap S = P(S)$ would need $P(S) \\subseteq S$, impossible.",
         "scene": {"hl": [{"r": 3, "c": 1, "tone": "error"}, {"r": 0, "c": 1, "tone": "error"}, {"r": 2, "c": 1, "tone": "error"}]}},
        {"title": "Option B by the power-set law", "body": "$P(S) \\cap P(P(S)) = P(S \\cap P(S))$. For an ordinary set such as $S = \\{1, 2\\}$, no element of $S$ is a subset of $S$, so $S \\cap P(S) = \\emptyset$ and the intersection is $P(\\emptyset) = \\{\\emptyset\\}$.",
         "scene": {"hl": [{"r": 3, "c": 1, "tone": "error"}, {"r": 0, "c": 1, "tone": "error"}, {"r": 2, "c": 1, "tone": "error"}, {"r": 1, "c": 1, "tone": "success"}]}},
        {"title": "The fine print", "body": "B fails when some element of $S$ is also a subset of $S$: for $S = \\{\\emptyset\\}$ the intersection is $\\{\\emptyset, \\{\\emptyset\\}\\}$. B is the intended answer (it holds for every set of ordinary objects and is the only option that can hold); strictly, it is not true for literally every $S$."},
    ],
    "answer": {"value": "$P(S) \\cap P(P(S)) = \\{\\phi\\}$", "choice": ["B"], "matchesKey": True,
               "keyNote": "Holds exactly when no element of S is also a subset of S (true for sets of numbers, letters, etc.); fails for S = {∅}. B is the intended answer; A, C and D fail for every finite S."},
    "optionAnalysis": [
        opt("A", False, "$|P(P(S))| = 2^{2^n} \\ne 2^n = |P(S)|$, so they are never equal for finite $S$."),
        opt("B", True, "$P(S) \\cap P(P(S)) = P(S \\cap P(S)) = P(\\emptyset) = \\{\\emptyset\\}$ whenever no element of $S$ is a subset of $S$ (the intended reading; it fails for $S = \\{\\emptyset\\}$)."),
        opt("C", False, "$P(S) \\cap S = P(S)$ would mean $P(S) \\subseteq S$, impossible since $|P(S)| > |S|$."),
        opt("D", False, "$S \\subseteq S$, so $S \\in P(S)$ always."),
    ],
    "shortcut": "D is false for every $S$ ($S \\in P(S)$), A and C are false by counting, so B is the only candidate.",
    "pitfalls": ["Believing $S \\notin P(S)$ because '$S$ is the whole set, not a part of it': every set is a subset of itself.", "Accepting B without noticing that it depends on $S$ having no element that is also a subset of $S$."],
    "verification": "Python frozensets for $S = \\emptyset, \\{1\\}, \\{1, 2\\}, \\{1, 2, 3\\}, \\{\\emptyset\\}, \\{\\emptyset, \\{\\emptyset\\}\\}, \\{1, \\{1\\}\\}$: A, C, D fail for all; B holds exactly for the four sets with $S \\cap P(S) = \\emptyset$.",
    "animation": tt("The four options", ["option", "verdict"], [["A: P(P(S)) = P(S)", "?"], ["B: P(S) ∩ P(P(S)) = {∅}", "?"], ["C: P(S) ∩ S = P(S)", "?"], ["D: S ∉ P(S)", "?"]]),
}

SOLUTIONS["cse-2001-b-51-a"] = {
    "approach": "Concept tested: **proving a set equality by element chasing**. The elements of a power set are sets, so take an arbitrary set $X$ and show $X \\in P(A \\cap B) \\iff X \\in P(A) \\cap P(B)$.",
    "concepts": ["Power set", "Element chasing", "Subset"],
    "given": "Prove $P(A \\cap B) = P(A) \\cap P(B)$.",
    "steps": [
        {"title": "Unfold the left side", "body": "For any set $X$: $X \\in P(A \\cap B) \\iff X \\subseteq A \\cap B$, by the definition of the power set."},
        {"title": "Split the subset condition", "body": "$X \\subseteq A \\cap B$ means every $x \\in X$ satisfies $x \\in A$ and $x \\in B$, i.e. ($\\forall x \\in X$: $x \\in A$) and ($\\forall x \\in X$: $x \\in B$): $X \\subseteq A$ and $X \\subseteq B$. ('For all' distributes over 'and'.)",
         "scene": {"reveal": 3}},
        {"title": "Fold back", "body": "$X \\subseteq A \\iff X \\in P(A)$ and $X \\subseteq B \\iff X \\in P(B)$, so the condition is $X \\in P(A) \\cap P(B)$.",
         "scene": {"reveal": 5}},
        {"title": "Conclude", "body": "Each step is an 'if and only if', so every set belongs to one side exactly when it belongs to the other. The two power sets are equal. (The analogous claim for $\\cup$ fails: $\\{a, b\\}$ with $a \\in A - B$, $b \\in B - A$ is in $P(A \\cup B)$ but in neither $P(A)$ nor $P(B)$.)"},
    ],
    "answer": {"value": "$X \\in P(A \\cap B) \\iff X \\subseteq A \\cap B \\iff X \\subseteq A \\text{ and } X \\subseteq B \\iff X \\in P(A) \\cap P(B)$, so the sets are equal.", "matchesKey": True},
    "shortcut": "'Inside both' is the same as 'inside the overlap', for a whole set $X$ as much as for one element.",
    "pitfalls": ["Proving only one inclusion: both directions are needed (here every step is reversible, so one chain of ⇔ does both).", "Extending the result to unions, where only $P(A) \\cup P(B) \\subseteq P(A \\cup B)$ holds."],
    "verification": "Brute force over all pairs $A, B \\subseteq \\{0, 1, 2\\}$: $P(A \\cap B) = P(A) \\cap P(B)$ every time, while $P(A) \\cup P(B) = P(A \\cup B)$ exactly when $A \\subseteq B$ or $B \\subseteq A$.",
    "animation": eq("The chain of equivalences", [
        ("X \\in P(A \\cap B)", None), ("\\iff X \\subseteq A \\cap B", "definition of P"),
        ("\\iff X \\subseteq A \\;\\wedge\\; X \\subseteq B", "every element in both"), ("\\iff X \\in P(A) \\;\\wedge\\; X \\in P(B)", "definition of P"),
        ("\\iff X \\in P(A) \\cap P(B)", "definition of ∩")], caption="Each line is equivalent to the next.") | {"reveal": 2},
}

SOLUTIONS["cse-2005-cs-8"] = {
    "approach": "Concept tested: **comparing two set expressions**. Write each as a list of Venn regions (or rewrite differences as intersections with complements) and compare.",
    "concepts": ["Set difference", "Venn regions", "Set identities"],
    "given": "$X = (A - B) - C$, $Y = (A - C) - (B - C)$.",
    "steps": [
        {"title": "Regions of X", "body": "$A - B$ is $\\{AC, A\\}$ (in $A$, not in $B$). Removing $C$ leaves $\\{A\\}$: the part of $A$ outside both $B$ and $C$.", "scene": hl("A")},
        {"title": "Regions of A − C and B − C", "body": "$A - C = \\{AB, A\\}$ and $B - C = \\{AB, B\\}$.", "scene": hl("AB", "A", tone="info")},
        {"title": "Regions of Y", "body": "Removing $B - C$ from $A - C$ deletes $AB$ and leaves $\\{A\\}$.", "scene": hl("A", tone="success")},
        {"title": "Compare (and confirm by laws)", "body": "Both are the single region $A \\cap B^c \\cap C^c$, so $X = Y$ for all sets. By laws: $Y = (A \\cap C^c) \\cap (B \\cap C^c)^c = A \\cap C^c \\cap (B^c \\cup C) = A \\cap B^c \\cap C^c$."},
    ],
    "answer": {"value": "$X = Y$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Both equal $A \\cap B^c \\cap C^c$ (the region in $A$ only)."),
        opt("B", False, "A proper inclusion would need an element in $Y$ but not in $X$; they cover the same region, so there is none."),
        opt("C", False, "Same reason: the sets are always equal, so neither is a proper subset of the other."),
        opt("D", False, "A is correct."),
    ],
    "shortcut": "Removing $C$ from both $A$ and $B$ first and then subtracting is the same as subtracting $B$ and $C$ from $A$: $(A - C) - (B - C) = (A - B) - C = A - (B \\cup C)$.",
    "pitfalls": ["Picking a strict inclusion because the formulas look different; simplify first."],
    "verification": "Region lists ($X = Y = \\{A\\}$) and brute force over every triple of subsets of a 3-element universe agree.",
    "animation": venn("X = (A − B) − C", [("A", "A"), ("B", "B"), ("C", "C")], hl=[]),
}

SOLUTIONS["cse-2006-cs-22"] = {
    "approach": "Concept tested: **comparing set expressions in three sets**. Reduce each to its Venn regions; equal regions mean equal sets.",
    "concepts": ["Venn regions", "Set difference", "Set identities"],
    "given": "$X = (E \\cap F) - (F \\cap G)$, $Y = (E - (E \\cap G)) - (E - F)$.",
    "steps": [
        {"title": "Regions of X", "body": "$E \\cap F = \\{EFG, EF\\}$; removing $F \\cap G$ (which contains $EFG$) leaves $\\{EF\\}$: in $E$ and $F$, not in $G$.", "scene": hl("EF")},
        {"title": "First part of Y", "body": "$E - (E \\cap G) = E - G = \\{EF, E\\}$.", "scene": hl("EF", "E", tone="info")},
        {"title": "Subtract E − F", "body": "$E - F = \\{EG, E\\}$. Removing it deletes $E$ and leaves $\\{EF\\}$.", "scene": hl("EF", tone="success")},
        {"title": "Compare", "body": "$X = Y = E \\cap F \\cap G^c$ for all sets, so $X = Y$; options with a proper inclusion, and D, which needs $Y \\not\\subseteq X$, are wrong."},
    ],
    "answer": {"value": "$X = Y$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$X \\subset Y$ (proper) would need an element of $Y$ outside $X$; both are the region $E \\cap F \\cap G^c$."),
        opt("B", False, "Same reason in the other direction."),
        opt("C", True, "Both reduce to $E \\cap F \\cap G^c$."),
        opt("D", False, "$Y - X$ is always empty because $Y = X$."),
    ],
    "shortcut": "$X = E \\cap F \\cap G^c$ in one step; $Y = (E \\cap G^c) \\cap (E \\cap F^c)^c = E \\cap G^c \\cap (E^c \\cup F) = E \\cap F \\cap G^c$.",
    "pitfalls": ["Distributing the difference wrongly: $A - (B - C)$ is not $(A - B) - C$."],
    "verification": "Region semantics over $E, F, G$ and brute force over all triples of subsets of $\\{0, 1, 2\\}$: $X = Y$ always.",
    "animation": venn("X = (E ∩ F) − (F ∩ G)", [("E", "E"), ("F", "F"), ("G", "G")], hl=[]),
}

SOLUTIONS["cse-2006-cs-50"] = {
    "approach": "Concept tested: **sets as bit arrays**. Translate the bit formula into connectives ($\\wedge$, $\\vee$, $\\neg$), recognise exclusive or, and translate back to sets.",
    "concepts": ["Bit vectors", "Symmetric difference", "Exclusive or"],
    "given": "`z[i] = (x[i] ^ ~y[i]) V (~x[i] ^ y[i])` with `^` = AND, `V` = OR, `~` = NOT.",
    "steps": [
        {"title": "Read the notation", "body": "The line uses logic notation: `^` is $\\wedge$, `V` is $\\vee$, `~` is $\\neg$. So $z_i = (x_i \\wedge \\neg y_i) \\vee (\\neg x_i \\wedge y_i)$."},
        {"title": "Recognise XOR", "body": "The first bracket is 1 when $i \\in X$ and $i \\notin Y$ (that is $X - Y$); the second when $i \\in Y$ and $i \\notin X$ ($Y - X$). Their OR is 1 exactly when $x_i \\ne y_i$: $z_i = x_i \\oplus y_i$.",
         "scene": {"hl": [{"r": 2, "c": 0, "tone": "success"}, {"r": 2, "c": 3, "tone": "success"}, {"r": 2, "c": 5, "tone": "success"}]}},
        {"title": "Back to sets", "body": "$Z = (X - Y) \\cup (Y - X) = X \\,\\Delta\\, Y$: option D. On the example $X = \\{0, 2\\}$, $Y = \\{2, 3\\}$ (bits $1010$, $0011$) the loop gives $1001 = \\{0, 3\\}$."},
        {"title": "Why not the other readings", "body": "Option C, $(X - Y) \\cap (Y - X)$, is always empty (no element is in $X$-not-$Y$ and $Y$-not-$X$ at once). Reading `^` as C's XOR would give $x$ XNOR $y$ in both brackets, i.e. the complement of $X \\,\\Delta\\, Y$, which is not offered."},
    ],
    "answer": {"value": "$(X - Y) \\cup (Y - X)$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$X \\cup Y$ would also include elements in both sets, where the formula gives 0."),
        opt("B", False, "$X \\cap Y$: on $x_i = y_i = 1$ both brackets are 0, so those elements are excluded."),
        opt("C", False, "$(X - Y) \\cap (Y - X) = \\emptyset$ always; the loop sets $z_i = 1$ whenever $x_i \\ne y_i$."),
        opt("D", True, "OR of 'in $X$ not $Y$' and 'in $Y$ not $X$': the symmetric difference."),
    ],
    "shortcut": "$(a \\wedge \\neg b) \\vee (\\neg a \\wedge b)$ is the textbook expansion of $a \\oplus b$; XOR of membership bits is $\\Delta$.",
    "pitfalls": ["Reading `^` as the C XOR operator; the `V` for OR shows the line is in logic notation.", "Choosing C because it 'mentions both differences': it intersects them instead of uniting them."],
    "verification": "Simulated for all pairs $X, Y \\subseteq \\{0, 1, 2, 3\\}$: the loop's $Z$ always equals $(X - Y) \\cup (Y - X)$, and $(X - Y) \\cap (Y - X)$ is always empty.",
    "animation": tt("Bit by bit, X = 1010 and Y = 0011", ["i", "x", "y", "x∧¬y", "¬x∧y", "z"],
                    [["0", "1", "0", "1", "0", "1"], ["1", "0", "0", "0", "0", "0"], ["2", "1", "1", "0", "0", "0"], ["3", "0", "1", "0", "1", "1"]],
                    hl=[(0, 5, "success"), (3, 5, "success")]),
}

SOLUTIONS["it-2006-cs-23"] = {
    "approach": "Concept tested: **identities with symmetric difference**. Translate to membership bits ($\\Delta$ = XOR); $\\cap$ (AND) distributes over XOR, but the first statement fails, which one region (or one tiny example) shows.",
    "concepts": ["Symmetric difference", "Distributive laws", "Venn regions"],
    "given": "1. $P \\,\\Delta\\, (Q \\cup R) = (P \\,\\Delta\\, Q) \\cap (P \\,\\Delta\\, R)$. 2. $P \\cap (Q \\,\\Delta\\, R) = (P \\cap Q) \\,\\Delta\\, (P \\cap R)$.",
    "steps": [
        {"title": "Statement 1, left side", "body": "$P \\,\\Delta\\, (Q \\cup R)$ covers the regions lying in exactly one of $P$ and $Q \\cup R$: the region in $P$ only, and, outside $P$, the regions $Q$ only, $R$ only and $Q \\cap R$.",
         "scene": hl("A", "B", "C", "BC")},
        {"title": "Statement 1, right side", "body": "$(P \\,\\Delta\\, Q) \\cap (P \\,\\Delta\\, R)$: regions where $P \\ne Q$ and $P \\ne R$: $P$ only and $QR$. The regions '$Q$ only' and '$R$ only' are missing, so statement 1 is **false**. Example: $P = \\emptyset$, $Q = \\{1\\}$, $R = \\emptyset$ gives $\\{1\\}$ against $\\emptyset$.",
         "scene": {"hl": [{"region": "A", "tone": "success"}, {"region": "BC", "tone": "success"}, {"region": "B", "tone": "error"}, {"region": "C", "tone": "error"}]}},
        {"title": "Statement 2", "body": "In bits: $p \\wedge (q \\oplus r)$ against $(p \\wedge q) \\oplus (p \\wedge r)$. If $p = 0$ both are 0; if $p = 1$ both are $q \\oplus r$. So statement 2 is **true**: the regions $PQ$ and $PR$ (inside $P$, in exactly one of $Q$, $R$) on both sides.",
         "scene": hl("AB", "AC", tone="success")},
        {"title": "Conclude", "body": "Only statement 2 holds: option B."},
    ],
    "answer": {"value": "2 only", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Statement 1 fails, e.g. $P = R = \\emptyset$, $Q = \\{1\\}$."),
        opt("B", True, "Statement 2 is AND distributing over XOR; statement 1 fails."),
        opt("C", False, "Statement 2 holds for all sets."),
        opt("D", False, "Statement 1 fails."),
    ],
    "shortcut": "Test statement 1 with $P$ empty: the left side becomes $Q \\cup R$, the right side $Q \\cap R$; they differ as soon as $Q \\ne R$.",
    "pitfalls": ["Checking only elements of $P$, where both sides of statement 1 happen to agree.", "Assuming $\\Delta$ behaves like $\\cup$ in distributive laws."],
    "verification": "Region semantics and brute force over all triples of subsets of $\\{0, 1, 2\\}$: statement 1 has counterexamples, statement 2 none.",
    "animation": venn("P Δ (Q ∪ R) against (P Δ Q) ∩ (P Δ R)", [("A", "P"), ("B", "Q"), ("C", "R")], hl=[]),
}

SOLUTIONS["cse-2008-cs-2"] = {
    "approach": "Concept tested: **simplifying with set laws**. Combine the first two terms (they differ only in $P$), then use $X \\cup X^c = U$ with De Morgan.",
    "concepts": ["Set identities", "De Morgan's laws", "Complement"],
    "given": "$(P \\cap Q \\cap R) \\cup (P^c \\cap Q \\cap R) \\cup Q^c \\cup R^c$.",
    "steps": [
        {"title": "Merge the first two terms", "body": "$(P \\cap Q \\cap R) \\cup (P^c \\cap Q \\cap R) = (P \\cup P^c) \\cap (Q \\cap R) = U \\cap Q \\cap R = Q \\cap R$.",
         "scene": hl("ABC", "BC")},
        {"title": "Recognise the complement", "body": "By De Morgan, $Q^c \\cup R^c = (Q \\cap R)^c$.",
         "scene": {"hl": [{"region": "ABC", "tone": "accent"}, {"region": "BC", "tone": "accent"}, {"region": "A", "tone": "info"}, {"region": "AB", "tone": "info"}, {"region": "AC", "tone": "info"}, {"region": "B", "tone": "info"}, {"region": "C", "tone": "info"}, {"region": "-", "tone": "info"}]}},
        {"title": "Union with its complement", "body": "$(Q \\cap R) \\cup (Q \\cap R)^c = U$: every one of the eight regions is lit.",
         "scene": {"hl": [{"region": r, "tone": "success"} for r in ["ABC", "AB", "AC", "A", "BC", "B", "C", "-"]]}},
    ],
    "answer": {"value": "$U$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$Q^c \\cup R^c$ misses the region $Q \\cap R$, which the first two terms cover."),
        opt("B", False, "$P \\cup Q^c \\cup R^c$ misses $P^c \\cap Q \\cap R$, which the second term covers."),
        opt("C", False, "$P^c \\cup Q^c \\cup R^c$ misses $P \\cap Q \\cap R$, the first term."),
        opt("D", True, "The expression is $(Q \\cap R) \\cup (Q \\cap R)^c = U$."),
    ],
    "shortcut": "An element outside $Q \\cap R$ is caught by $Q^c \\cup R^c$; an element inside $Q \\cap R$ is caught by one of the first two terms, depending on $P$. Everything is caught.",
    "pitfalls": ["Dropping one of the first two terms and ending with B or C."],
    "verification": "Region semantics over $P, Q, R$ (all eight regions covered) and brute force over all triples of subsets of a 3-element universe.",
    "animation": venn("Regions of P, Q, R", [("A", "P"), ("B", "Q"), ("C", "R")], hl=[]),
}

SOLUTIONS["cse-2015-1-cs-16"] = {
    "approach": "Concept tested: **membership versus subset one level up**. $X \\in 2^A \\iff X \\subseteq A$, while $X \\subseteq 2^A$ needs every element of $X$ to be a subset of $A$.",
    "concepts": ["Power set", "Membership versus subset", "Empty set"],
    "given": "$A = \\{5, \\{6\\}, \\{7\\}\\}$.",
    "steps": [
        {"title": "I: ∅ ∈ 2^A", "body": "$\\emptyset \\subseteq A$ always, so $\\emptyset \\in 2^A$: **true**.", "scene": {"hl": [{"r": 0, "c": 1, "tone": "success"}]}},
        {"title": "II: ∅ ⊆ 2^A", "body": "The empty set is a subset of every set: **true**.", "scene": {"hl": [{"r": 0, "c": 1, "tone": "success"}, {"r": 1, "c": 1, "tone": "success"}]}},
        {"title": "III: {5, {6}} ∈ 2^A", "body": "Is $\\{5, \\{6\\}\\} \\subseteq A$? Its items $5$ and $\\{6\\}$ are both listed in $A$: **true**.",
         "scene": {"hl": [{"r": 0, "c": 1, "tone": "success"}, {"r": 1, "c": 1, "tone": "success"}, {"r": 2, "c": 1, "tone": "success"}]}},
        {"title": "IV: {5, {6}} ⊆ 2^A", "body": "Needs $5 \\in 2^A$, i.e. $5$ to be a subset of $A$; but $5$ is a number, not a set of elements of $A$. (Also $\\{6\\} \\in 2^A$ would need $6 \\in A$, false.) **False**.",
         "scene": {"hl": [{"r": 0, "c": 1, "tone": "success"}, {"r": 1, "c": 1, "tone": "success"}, {"r": 2, "c": 1, "tone": "success"}, {"r": 3, "c": 1, "tone": "error"}]}},
    ],
    "answer": {"value": "I, II and III only", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Misses II: $\\emptyset$ is a subset of every set, including $2^A$."),
        opt("B", False, "Misses I: $\\emptyset \\subseteq A$, so $\\emptyset$ is an element of $2^A$."),
        opt("C", True, "I, II, III are true; IV is false."),
        opt("D", False, "IV is false ($5 \\notin 2^A$) and III, which is true, is left out."),
    ],
    "shortcut": "Moving up from $A$ to $2^A$ turns '$\\subseteq A$' into '$\\in 2^A$'. III is the subset test $\\{5, \\{6\\}\\} \\subseteq A$ in disguise; IV asks for subsets of $2^A$, a level too high.",
    "pitfalls": ["Thinking $\\emptyset$ must be either an element or a subset, not both: it is both here.", "Treating IV as the same claim as III."],
    "verification": "Built $A$ and $2^A$ as Python frozensets: the four claims evaluate to True, True, True, False.",
    "animation": tt("Four claims about 2^A", ["claim", "verdict"], [["I: ∅ ∈ 2^A", "?"], ["II: ∅ ⊆ 2^A", "?"], ["III: {5,{6}} ∈ 2^A", "?"], ["IV: {5,{6}} ⊆ 2^A", "?"]]),
}

SOLUTIONS["cse-2015-2-cs-18"] = {
    "approach": "Concept tested: **the size of a power set**. Count the elements of the set, then $|P(S)| = 2^{|S|}$.",
    "concepts": ["Power set", "Cardinality"],
    "given": "$S = \\{0, 1, 2, \\dots, 10\\}$.",
    "steps": [
        {"title": "Count the elements", "body": "The numbers $0$ through $10$ inclusive: $10 - 0 + 1 = 11$ elements (do not forget $0$)."},
        {"title": "Two choices per element", "body": "Each of the 11 elements is in or out of a subset, independently: $2^{11}$ subsets."},
        {"title": "Compute", "body": "$2^{10} = 1024$, so $2^{11} = 2048$."},
    ],
    "answer": {"value": "2048", "number": 2048, "matchesKey": True},
    "shortcut": "$|\\{0, \\dots, n\\}| = n + 1$; here $2^{11} = 2048$.",
    "pitfalls": ["Counting 10 elements (forgetting $0$) and answering 1024.", "Answering $2^{11} - 1$, the number of proper (or non-empty) subsets."],
    "verification": "Enumerated: the power set of range(11) has 2048 elements.",
}

SOLUTIONS["cse-2015-3-cs-23"] = {
    "approach": "Concept tested: **quantified statements about subsets**. Test each option: a 'for all' claim falls to one counterexample, an 'exists' claim needs one witness, and D is an identity provable by rewriting differences as intersections.",
    "concepts": ["Set difference", "Complement", "Quantifiers"],
    "given": "$U = P(S)$ with $S = \\{1, \\dots, 6\\}$; $T'$ is the complement in $S$; $T \\setminus R$ is $T - R$.",
    "steps": [
        {"title": "A is false", "body": "$|X| = |X'|$ for all $X$? Take $X = \\emptyset$: $|X| = 0$ but $|X'| = 6$.",
         "scene": {"hl": [{"r": 0, "c": 1, "tone": "error"}]}},
        {"title": "B is false", "body": "Two disjoint 5-element subsets of a 6-element set would need $5 + 5 = 10 > 6$ elements.",
         "scene": {"hl": [{"r": 0, "c": 1, "tone": "error"}, {"r": 1, "c": 1, "tone": "error"}]}},
        {"title": "C is false", "body": "It claims every $X$ has $|X| = 2$ (among other things); $X = \\emptyset$ already breaks it.",
         "scene": {"hl": [{"r": 0, "c": 1, "tone": "error"}, {"r": 1, "c": 1, "tone": "error"}, {"r": 2, "c": 1, "tone": "error"}]}},
        {"title": "D is an identity", "body": "$X \\setminus Y = X \\cap Y'$ and $Y' \\setminus X' = Y' \\cap (X')' = Y' \\cap X$. Same set for every $X, Y$: **true**.",
         "scene": {"hl": [{"r": 0, "c": 1, "tone": "error"}, {"r": 1, "c": 1, "tone": "error"}, {"r": 2, "c": 1, "tone": "error"}, {"r": 3, "c": 1, "tone": "success"}]}},
    ],
    "answer": {"value": "$\\forall X \\in U\\ \\forall Y \\in U\\ (X \\setminus Y = Y' \\setminus X')$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$X = \\emptyset$ gives $0 \\ne 6$; only 3-element sets satisfy $|X| = |X'|$."),
        opt("B", False, "Disjoint 5-element sets need 10 elements; $S$ has 6."),
        opt("C", False, "A 'for all' over every pair cannot force $|X| = 2$; $X = \\emptyset$ is a counterexample."),
        opt("D", True, "$X - Y = X \\cap Y' = Y' - X'$: the contrapositive form of a difference."),
    ],
    "shortcut": "$A - B = A \\cap B^c$; apply it to both sides of D and they become the same intersection. (In logic: $x \\wedge \\neg y \\equiv \\neg y \\wedge \\neg\\neg x$.)",
    "pitfalls": ["Reading C as 'there exist $X, Y$ with …', which would be true ($X \\subseteq Y$, sizes 2 and 3); the quantifiers are universal."],
    "verification": "Exhaustive check over all 64 subsets of $\\{1, \\dots, 6\\}$ (and all 4096 pairs): A, B, C are false and D is true.",
    "animation": tt("The four statements", ["statement", "verdict"], [["A: ∀X |X| = |X'|", "?"], ["B: ∃X,Y |X|=|Y|=5, disjoint", "?"], ["C: ∀X,Y |X|=2, |Y|=3, X∖Y=∅", "?"], ["D: ∀X,Y X∖Y = Y'∖X'", "?"]]),
}

SOLUTIONS["cse-2021-2-cs-50"] = {
    "approach": "Concept tested: **counting pairs of subsets one element at a time**. Each element of $S$ independently chooses its membership pattern; $A \\subseteq B$ forbids one of the four patterns.",
    "concepts": ["Per-element counting", "Subset", "Product rule"],
    "given": "$|S| = 10$; count tuples $(A, B)$ with $A \\subseteq B \\subseteq S$.",
    "steps": [
        {"title": "List the patterns of one element", "body": "An element can be in both $A$ and $B$, in $B$ only, in $A$ only, or in neither.",
         "scene": {"hl": [{"r": 0, "c": 2, "tone": "success"}, {"r": 1, "c": 2, "tone": "success"}, {"r": 3, "c": 2, "tone": "success"}]}},
        {"title": "Cross out the forbidden one", "body": "$A \\subseteq B$ forbids exactly 'in $A$ but not in $B$'. Three patterns remain, and the condition says nothing else.",
         "scene": {"hl": [{"r": 0, "c": 2, "tone": "success"}, {"r": 1, "c": 2, "tone": "success"}, {"r": 3, "c": 2, "tone": "success"}, {"r": 2, "c": 2, "tone": "error"}]}},
        {"title": "Multiply over the elements", "body": "The 10 elements choose independently, and different choices give different pairs: $3^{10} = 59049$."},
        {"title": "Check another way", "body": "Choose $B$ of size $k$ ($\\binom{10}{k}$ ways), then $A \\subseteq B$ ($2^k$ ways): $\\sum_k \\binom{10}{k} 2^k = (1 + 2)^{10} = 59049$."},
    ],
    "answer": {"value": "59049", "number": 59049, "matchesKey": True},
    "shortcut": "Allowed patterns per element, raised to the number of elements: $3^{10}$.",
    "pitfalls": ["Treating $\\subseteq$ as proper ($3^{10} - 2^{10} = 58025$).", "Halving because 'the pair is unordered': $(A, B)$ is an ordered tuple.", "Counting all pairs ($4^{10}$)."],
    "verification": "Brute force for $|S| = 0, \\dots, 4$ gives $1, 3, 9, 27, 81$ pairs, matching $3^n$; hence $3^{10} = 59049$.",
    "animation": tt("Patterns of one element", ["in A?", "in B?", "allowed?"], [["1", "1", "yes"], ["0", "1", "yes"], ["1", "0", "no"], ["0", "0", "yes"]]),
}
