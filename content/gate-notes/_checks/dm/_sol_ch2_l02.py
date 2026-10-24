"""Teacher-style v2 solutions for the PYQs of dm/02-predicate-logic/02-quantifier-laws-validity.
Every key is re-derived (counter-model search, proof checks, direct evaluation) in l2_02_validity.py."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from dmlib import opt  # noqa: E402

SOLUTIONS = {}


def tt(title, cols, rows, hl=None, caption=None, labels=None):
    f = {"kind": "table", "title": title, "cols": cols, "rows": rows, "mono": True}
    if labels:
        f["rowLabels"] = labels
    if hl:
        f["hl"] = [{"r": r, "c": c, "tone": t} for r, c, t in hl]
    if caption:
        f["caption"] = caption
    return f


def eq(title, lines, caption=None):
    f = {"kind": "equation", "title": title, "lines": [{"tex": t, **({"note": n} if n else {})} for t, n in lines]}
    if caption:
        f["caption"] = caption
    return f


SPLIT = "$D = \\{0, 1\\}$, $P = \\{0\\}$, $Q = \\{1\\}$"

SOLUTIONS["cse-1991-b-15-b"] = {
    "approach": "Concept tested: **satisfiable sentences with only infinite models**. Read the four conjuncts as properties of $R$; show that a finite domain leads to a contradiction, then exhibit the natural numbers as a model.",
    "concepts": ["Interpretation", "Satisfiability", "Strict order", "Infinite model"],
    "given": "$\\varphi = \\forall x \\exists y R(x,y) \\wedge \\forall x \\forall y (R(x,y) \\to \\neg R(y,x)) \\wedge \\forall x \\forall y \\forall z (R(x,y) \\wedge R(y,z) \\to R(x,z)) \\wedge \\forall x \\neg R(x,x)$.",
    "steps": [
        {"title": "Name the properties", "body": "The conjuncts say $R$ is **serial** (every element has a successor), **asymmetric**, **transitive** and **irreflexive**: a strict order with no last element. (Irreflexivity even follows from asymmetry with $y = x$.)"},
        {"title": "Follow successors in a finite domain", "body": "Let $|D| = k$ be finite. Start at $a_0$ and use seriality $k$ times: $R(a_0, a_1), R(a_1, a_2), \\dots, R(a_{k-1}, a_k)$. These are $k + 1$ names for elements of a $k$-element set, so $a_i = a_j$ for some $i < j$."},
        {"title": "Transitivity closes the loop", "body": "Transitivity along $a_i, a_{i+1}, \\dots, a_j$ gives $R(a_i, a_j)$, i.e. $R(a_i, a_i)$, contradicting irreflexivity. So **no finite model** exists."},
        {"title": "Exhibit a countable model", "body": "Domain $\\mathbb{N}$, $R$ = '<': every $n$ has $n + 1 > n$; $<$ is asymmetric, transitive and irreflexive. So $\\varphi$ is **satisfiable**, with the countable model $(\\mathbb{N}, <)$ (also $(\\mathbb{Z}, <)$ or $(\\mathbb{Q}, <)$)."},
    ],
    "answer": {"value": "**No finite models**; it is **satisfiable**, e.g. $(\\mathbb{N}, <)$ is a countable model.", "matchesKey": True},
    "shortcut": "Serial + strict order = an infinite ascending staircase. Finite worlds force a loop, and transitivity turns any loop into $R(a, a)$.",
    "pitfalls": ["Concluding 'unsatisfiable' because no small model exists: a finite search cannot prove unsatisfiability.", "Offering $(\\mathbb{N}, \\le)$: $\\le$ is reflexive, so irreflexivity and asymmetry fail."],
    "verification": "An exhaustive search over every relation on domains of size 1–4 finds no model; $(\\mathbb{N}, <)$ satisfies each conjunct directly. Dropping transitivity allows the finite 3-cycle model, which shows that conjunct is essential.",
    "animation": {"kind": "graph", "title": "A successor chain in a 4-element domain must loop", "directed": True, "layout": "manual",
                  "nodes": [{"id": "a0", "x": 0, "y": 0}, {"id": "a1", "x": 1, "y": 0}, {"id": "a2", "x": 2, "y": 0}, {"id": "a3", "x": 3, "y": 0}],
                  "edges": [{"from": "a0", "to": "a1"}, {"from": "a1", "to": "a2"}, {"from": "a2", "to": "a3"}, {"from": "a3", "to": "a1", "tone": "warning"},
                            {"from": "a1", "to": "a3", "tone": "error", "dashed": True}],
                  "caption": "a3 must point back; transitivity gives R(a1, a3) and R(a3, a1), hence R(a1, a1)."},
}

SOLUTIONS["cse-1992-a-2-xv"] = {
    "approach": "Concept tested: **the one-way quantifier laws**. Prove the implications that follow from 'every / some' reasoning, and refute the others with a two-element world.",
    "concepts": ["Validity", "One-way laws", "Counter-model"],
    "given": "Four implications built from $\\forall$, $\\exists$, $\\wedge$, $\\vee$ over unary $P$, $Q$.",
    "steps": [
        {"title": "(a) is a valid law", "body": "If $\\forall x P(x)$, every $x$ satisfies $P(x) \\vee Q(x)$; the same if $\\forall x Q(x)$. So $\\forall x P \\vee \\forall x Q \\to \\forall x (P \\vee Q)$ is valid."},
        {"title": "(b) and (c): the split world", "body": f"In {SPLIT}: (b) $\\exists x P$ and $\\exists x Q$ are T but no element has both, T → F. (c) every element has $P$ or $Q$ but neither holds everywhere, T → F."},
        {"title": "(d): P everywhere, Q nowhere", "body": "$D = \\{0, 1\\}$, $P = D$, $Q = \\varnothing$: $\\exists x(P \\vee Q)$ = T, $\\neg\\forall x P$ = F, $\\exists x Q$ = F, so T → F."},
    ],
    "answer": {"value": "Only (a)", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "One-way law: a predicate true everywhere makes the disjunction true everywhere."),
        opt("B", False, f"Two different witnesses need not coincide: {SPLIT} makes it T → F."),
        opt("C", False, f"∀ does not distribute over ∨: {SPLIT} has every element P or Q but neither universal."),
        opt("D", False, "With $P$ everywhere and $Q$ nowhere the hypothesis is T and both disjuncts of the conclusion are F."),
    ],
    "shortcut": "∀ goes with ∧ and ∃ with ∨ both ways; ∀ over ∨ and ∃ over ∧ only from the 'one predicate for all' side. The split world refutes the reverse directions.",
    "pitfalls": ["Accepting (C) because it 'looks like distribution'.", "Missing that (D) is $\\exists(P \\vee Q) \\to (\\forall P \\to \\exists Q)$, which fails when $Q$ is empty."],
    "verification": "Exhaustive search on domains of size 1–3: no counter-model for (a); (b), (c), (d) each have a two-element counter-model.",
    "animation": tt("Split world D = {0, 1}", ["x", "P(x)", "Q(x)", "P∨Q", "P∧Q"], [["0", "T", "F", "T", "F"], ["1", "F", "T", "T", "F"]], hl=[(0, 3, "success"), (1, 3, "success"), (0, 4, "error"), (1, 4, "error")],
                    caption="∀(P∨Q) is T, ∀P ∨ ∀Q is F; ∃P ∧ ∃Q is T, ∃(P∧Q) is F."),
}

SOLUTIONS["cse-2003-cs-32"] = {
    "approach": "Concept tested: **∀ over → and its converse**, for schematic formulas. One instance with simple predicates refutes a schema; the valid one must hold for every α, β.",
    "concepts": ["Validity", "One-way laws", "Schematic formulas"],
    "given": "$\\alpha$, $\\beta$: formulas with $x$ as the only free variable.",
    "steps": [
        {"title": "Choose simple instances", "body": "A schema is valid only if every instance is; to refute one, take $\\alpha = A(x)$, $\\beta = B(x)$ with fresh unary predicates on $D = \\{0, 1\\}$."},
        {"title": "(D) is the ∀-over-→ law", "body": "If $\\alpha \\to \\beta$ holds for every $x$ and $\\alpha$ holds for every $x$, then by modus ponens at each $x$, $\\beta$ holds for every $x$. Valid for all $\\alpha$, $\\beta$."},
        {"title": "Refute (A) and (B)", "body": "(A), the converse of (D): $A = \\{0\\}$, $B = \\varnothing$ makes $\\forall A \\to \\forall B$ vacuously T but $A(0) \\to B(0)$ F. (B): $A = D$, $B = \\varnothing$ gives T → F (no common witness)."},
        {"title": "Refute (C)", "body": "Need the hypothesis $\\forall x(\\alpha \\vee \\beta) \\to \\exists x \\alpha$ true and $\\forall x \\alpha$ false: $A = \\{0\\}$, $B = \\{1\\}$ gives (T → T) → F = F."},
    ],
    "answer": {"value": "$(\\forall x)[\\alpha \\Rightarrow \\beta] \\Rightarrow ((\\forall x)[\\alpha] \\Rightarrow (\\forall x)[\\beta])$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Converse of the valid law: with α true only at 0 and β nowhere, the hypothesis is vacuously true and the conclusion false."),
        opt("B", False, "∀α gives no element where β holds: α everywhere, β nowhere makes it T → F."),
        opt("C", False, "α = {0}, β = {1}: the inner implication is T → T, but ∀α is F."),
        opt("D", True, "Modus ponens applied at every element: valid for all α, β."),
    ],
    "shortcut": "Of the options, only (D) moves from a strong 'for every x' hypothesis to a weaker conclusion; the others go backwards.",
    "pitfalls": ["Thinking a counter-model must work for every α, β: one instance is enough to refute a schema.", "Picking (A) because it has the same symbols as (D) in a different order."],
    "verification": "With α, β replaced by unary predicates, exhaustive search up to size 3 finds no counter-model for (D) and two-element counter-models for (A), (B), (C).",
    "animation": tt("Counter-models on D = {0, 1}", ["option", "A (α)", "B (β)", "value"], [["A", "{0}", "∅", "F"], ["B", "{0,1}", "∅", "F"], ["C", "{0}", "{1}", "F"], ["D", "any", "any", "T"]],
                    hl=[(3, 3, "success"), (0, 3, "error"), (1, 3, "error"), (2, 3, "error")]),
}

SOLUTIONS["cse-2003-cs-33"] = {
    "approach": "Concept tested: **a diagonal (Russell-style) argument**. The inner bracket $\\forall y(Q_{xy} \\Leftrightarrow \\neg Q_{yy})$ fails at $y = x$, so it is false for every $x$ in every interpretation; then α simplifies to $X \\Rightarrow X$.",
    "concepts": ["Interpretation", "Validity", "Diagonal argument"],
    "given": "$\\alpha: \\forall x[P_x \\Leftrightarrow \\forall y(Q_{xy} \\Leftrightarrow \\neg Q_{yy})] \\Rightarrow \\forall x \\neg P_x$; $I_1$: ℕ, P = prime, Q(x,y) = 'y divides x'; $I_2$: P = composite.",
    "steps": [
        {"title": "Instantiate the inner ∀ at y = x", "body": "For any $x$: $\\forall y(Q_{xy} \\Leftrightarrow \\neg Q_{yy})$ implies $Q_{xx} \\Leftrightarrow \\neg Q_{xx}$, which is false. So the bracket is **false for every x**, in every interpretation."},
        {"title": "Simplify the hypothesis", "body": "$P_x \\Leftrightarrow \\text{F} \\equiv \\neg P_x$, so the hypothesis is $\\forall x \\neg P_x$."},
        {"title": "α is X → X", "body": "$\\alpha \\equiv \\forall x \\neg P_x \\Rightarrow \\forall x \\neg P_x$: true in **every** interpretation, whatever $P$ and $Q$ mean. In particular both $I_1$ and $I_2$ satisfy it."},
        {"title": "Check directly in I₁", "body": "The hypothesis claims no number is prime (since the bracket is false). 2 is prime, so the hypothesis is false and α is vacuously true. In $I_2$, 4 is composite: same."},
    ],
    "answer": {"value": "Both $I_1$ and $I_2$ satisfy α", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "α is valid, so it cannot fail in $I_2$."),
        opt("B", False, "α is valid, so it cannot fail in $I_1$."),
        opt("C", False, "Both interpretations make the hypothesis false (some prime, some composite exists), so α holds vacuously in both."),
        opt("D", True, "The diagonal instance kills the bracket; α becomes X → X, true in every interpretation."),
    ],
    "shortcut": "Whenever a formula compares $Q(x, y)$ with $Q(y, y)$ under $\\forall y$, set $y = x$ first.",
    "pitfalls": ["Evaluating 'divides' and 'prime' number by number instead of noticing the formula is valid.", "Thinking the answer depends on whether 0 or 1 are in ℕ: it does not."],
    "verification": "No counter-model to α on domains of size 1–3 (exhaustive); on {1, …, 39} with 'divides' and either meaning of P, α evaluates to true.",
    "animation": eq("Collapse of α", [("\\forall y(Q_{xy} \\Leftrightarrow \\neg Q_{yy}) \\Rightarrow (Q_{xx} \\Leftrightarrow \\neg Q_{xx}) \\equiv \\text{F}", "instantiate y = x"),
                                       ("P_x \\Leftrightarrow \\text{F} \\equiv \\neg P_x", "for every x"),
                                       ("\\alpha \\equiv \\forall x\\neg P_x \\Rightarrow \\forall x \\neg P_x", "valid: X → X")]),
}

SOLUTIONS["cse-2003-cs-71"] = {
    "approach": "Concept tested: **Horn-clause logic programs as first-order sentences**. A rule head ← body is the universal closure of body → head; a variable only in the body becomes ∃ inside the hypothesis; a headless clause is a denial; the program is the conjunction.",
    "concepts": ["Horn clause", "Null quantification", "Logic program"],
    "given": "Program: $A(x) \\leftarrow B(x, y), C(y)$ and $\\leftarrow B(x, x)$.",
    "steps": [
        {"title": "Translate the rule", "body": "$\\forall x \\forall y\\,(B(x, y) \\wedge C(y) \\Rightarrow A(x))$."},
        {"title": "Move the body-only variable", "body": "$y$ is not in $A(x)$, so $\\forall y(\\Phi(y) \\Rightarrow W) \\equiv \\exists y \\Phi(y) \\Rightarrow W$: the rule is $\\forall x[\\exists y(B(x, y) \\wedge C(y)) \\Rightarrow A(x)]$."},
        {"title": "Translate the denial", "body": "$\\leftarrow B(x, x)$ is $\\forall x \\neg B(x, x) \\equiv \\neg\\exists x B(x, x)$."},
        {"title": "Join with ∧", "body": "A program asserts all its clauses: $\\forall x[\\exists y(B(x, y) \\wedge C(y)) \\Rightarrow A(x)] \\wedge \\neg\\exists x B(x, x)$, option (A)."},
    ],
    "answer": {"value": "(∀x)[(∃y)[B(x,y) ∧ C(y)] ⇒ A(x)] ∧ ¬(∃x)[B(x,x)]", "choice": ["A"], "matchesKey": True,
               "keyNote": "As printed, options (B) and (D) are identical (the original paper probably had a different connective in one of them); both are wrong for the same reason."},
    "optionAnalysis": [
        opt("A", True, "Exactly the conjunction of the two translated clauses, with the body-only y existential in the hypothesis."),
        opt("B", False, "∀y inside the hypothesis: in $D = \\{0, 1\\}$, $B = \\{(0, 1)\\}$, $C = \\{1\\}$, $A = \\varnothing$ the program fails but (B) holds."),
        opt("C", False, "Clauses of a program are joined by ∧; with ∨ the sentence can hold while the denial is broken ($B = \\{(0, 0)\\}$, $C = \\varnothing$)."),
        opt("D", False, "Printed identical to (B): the same ∀y error."),
    ],
    "shortcut": "Body-only variables are existential: 'if some y makes the body true, the head holds'.",
    "pitfalls": ["Quantifying y universally inside the hypothesis (options B/D).", "Joining clauses with ∨ (option C)."],
    "verification": "Option (A) is equivalent to the literal translation on every interpretation of A, B, C up to size 3; the listed worlds separate (B), (C), (D) from the program.",
    "animation": eq("From program to sentence", [("A(x) \\leftarrow B(x,y), C(y) \\;\\;\\leadsto\\;\\; \\forall x \\forall y\\,(B(x,y) \\wedge C(y) \\to A(x))", "rule"),
                                                  ("\\equiv \\forall x\\,(\\exists y\\,(B(x,y) \\wedge C(y)) \\to A(x))", "y only in the body"),
                                                  ("\\leftarrow B(x,x) \\;\\;\\leadsto\\;\\; \\neg \\exists x\\, B(x,x)", "denial")]),
}

SOLUTIONS["it-2005-cs-36"] = {
    "approach": "Concept tested: **∀ over → (valid) versus its converses and ∀ over ∨ (not valid)**. Prove (B) by modus ponens at each element; one split world refutes the other three.",
    "concepts": ["Validity", "One-way laws", "Counter-model"],
    "given": "Arbitrary unary predicates $P$, $Q$.",
    "steps": [
        {"title": "(B) is valid", "body": "Assume $\\forall x(P \\Rightarrow Q)$ and $\\forall x P$. For any element $a$, $P(a)$ and $P(a) \\Rightarrow Q(a)$ give $Q(a)$. So $\\forall x Q$."},
        {"title": "(A): ∀ over ∨", "body": f"In {SPLIT}, every element has $P$ or $Q$, but neither is universal: T ⇒ F."},
        {"title": "(C), (D): converses", "body": "In the same world $\\forall x P$ and $\\forall x Q$ are both F, so $\\forall P \\Rightarrow \\forall Q$ and $\\forall P \\Leftrightarrow \\forall Q$ are both T; but $P(0) \\Rightarrow Q(0)$ and $P(0) \\Leftrightarrow Q(0)$ are F."},
    ],
    "answer": {"value": "(∀x(P(x) ⇒ Q(x))) ⇒ ((∀x P(x)) ⇒ (∀x Q(x)))", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, f"∀ does not distribute over ∨: {SPLIT}."),
        opt("B", True, "Modus ponens at every element; valid."),
        opt("C", False, "Converse of (B): when $P$ is not universal the hypothesis is vacuous and says nothing about individual elements."),
        opt("D", False, "Both sides of ∀P ⇔ ∀Q can be false while $P$ and $Q$ disagree at an element."),
    ],
    "shortcut": "Evaluate all four options in the split world: only (B) survives.",
    "pitfalls": ["Choosing (C) because 'implication between universals' feels the same as a universal implication.", "Choosing (D) by analogy with ∀ over ∧."],
    "verification": "Exhaustive search up to size 3: no counter-model for (B); (A), (C), (D) all fail in the split world.",
    "animation": tt("The split world refutes A, C, D", ["option", "hypothesis", "conclusion", "value"], [["A", "T", "F", "F"], ["B", "F", "F", "T"], ["C", "T", "F", "F"], ["D", "T", "F", "F"]],
                    hl=[(1, 3, "success"), (0, 3, "error"), (2, 3, "error"), (3, 3, "error")], caption="D = {0, 1}, P = {0}, Q = {1}"),
}

SOLUTIONS["it-2006-cs-21"] = {
    "approach": "Concept tested: **satisfiable, valid, contingent**. The sentence says $R$ is symmetric; exhibit one interpretation where it holds and one where it fails.",
    "concepts": ["Interpretation", "Satisfiability", "Validity"],
    "given": "$\\forall x \\forall y (R(x, y) \\Rightarrow R(y, x))$.",
    "steps": [
        {"title": "Read it", "body": "Whenever $R(x, y)$, also $R(y, x)$: '$R$ is symmetric'."},
        {"title": "A model", "body": "$D = \\{0\\}$, $R = \\varnothing$ (or equality, or any symmetric relation): every implication has a false hypothesis or holds. **Satisfiable.**"},
        {"title": "A counter-model", "body": "$D = \\{0, 1\\}$, $R = \\{(0, 1)\\}$: $R(0, 1)$ holds and $R(1, 0)$ does not. So the **negation** is satisfiable too."},
        {"title": "Match the options", "body": "Neither valid nor unsatisfiable: 'satisfiable and so is its negation'."},
    ],
    "answer": {"value": "satisfiable and so is its negation", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Not valid: $R = \\{(0, 1)\\}$ falsifies it."),
        opt("B", True, "A symmetric relation is a model; a non-symmetric one is a model of the negation."),
        opt("C", False, "It is satisfiable (the empty relation)."),
        opt("D", False, "Its negation is satisfiable, by $R = \\{(0, 1)\\}$."),
    ],
    "shortcut": "A sentence that states a property some relations have and others lack is always contingent.",
    "pitfalls": ["Calling it valid because it is true for the 'obvious' relation (equality).", "Confusing 'satisfiable' with 'valid'."],
    "verification": "Model search: a model on 1 element and a counter-model on 2 elements.",
    "animation": tt("A model and a counter-model", ["world", "R", "symmetric?"], [["D = {0}", "∅", "T"], ["D = {0, 1}", "{(0, 1)}", "F"]], hl=[(0, 2, "success"), (1, 2, "error")]),
}

SOLUTIONS["it-2007-cs-21"] = {
    "approach": "Concept tested: **valid quantifier laws versus tempting non-laws** (∃ over → with the wrong quantifier, ∃ over ∧ as an equivalence, swapping ∀∃).",
    "concepts": ["Validity", "One-way laws", "Quantifier order"],
    "given": "Four formulas over $P$, $Q$ (unary) and $P(x, y)$ (binary).",
    "steps": [
        {"title": "(A) is valid", "body": "If every $x$ has $P \\Rightarrow Q$ and every $x$ has $P$, every $x$ has $Q$ (modus ponens at each element)."},
        {"title": "(B) fails", "body": "$\\exists x(P \\vee Q) \\Rightarrow (\\exists x P \\Rightarrow \\exists x Q)$: with $P$ everywhere and $Q$ nowhere on $\\{0, 1\\}$ the hypothesis is T and $\\exists P \\Rightarrow \\exists Q$ is T → F."},
        {"title": "(C) fails", "body": f"$\\exists x(P \\wedge Q) \\equiv \\exists x P \\wedge \\exists x Q$ fails right-to-left: {SPLIT}."},
        {"title": "(D) fails", "body": "$\\forall x \\exists y P(x, y) \\Rightarrow \\exists y \\forall x P(x, y)$: on $\\{0, 1\\}$ with $P$ = equality, every $x$ has $y = x$, but no single $y$ works for both."},
    ],
    "answer": {"value": "∀x(P(x) ⇒ Q(x)) ⇒ ((∀xP(x)) ⇒ (∀xQ(x)))", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The ∀-over-→ law: valid."),
        opt("B", False, "P everywhere, Q nowhere: hypothesis T, conclusion T → F."),
        opt("C", False, f"Only one direction holds; {SPLIT} breaks the other."),
        opt("D", False, "∀∃ does not give ∃∀: the equality relation on two elements."),
    ],
    "shortcut": "Memorise the three facts: ∀ over → is one-way and valid as written in (A); ∃ over ∧ is one-way; ∃∀ ⇒ ∀∃ only.",
    "pitfalls": ["Accepting (C) as an equivalence.", "Accepting (D): the witness y may depend on x."],
    "verification": "Exhaustive search up to size 3: no counter-model for (A); two-element counter-models for (B), (C), (D).",
    "animation": tt("Equality on {0, 1}: P(x, y)", ["x \\ y", "0", "1"], [["0", "1", "0"], ["1", "0", "1"]], hl=[(0, 1, "success"), (1, 2, "success")],
                    caption="Every row has a 1 (∀x∃y), but no column is full (no ∃y∀x)."),
}

SOLUTIONS["it-2008-it-21"] = {
    "approach": "Concept tested: **moving a quantifier past a formula without x (null quantification)**. Pull every quantifier out to the β-free side; a quantifier leaving the hypothesis of → flips.",
    "concepts": ["Null quantification", "Validity", "Counter-model"],
    "given": "$\\alpha(x)$ has $x$ free; $\\beta$ has no free variable.",
    "steps": [
        {"title": "The three rewrites", "body": "$\\forall x(\\beta \\to \\alpha) \\equiv \\beta \\to \\forall x \\alpha$; $\\exists x(\\beta \\to \\alpha) \\equiv \\beta \\to \\exists x \\alpha$; $\\forall x(\\alpha \\to \\beta) \\equiv \\exists x \\alpha \\to \\beta$ (flip out of the hypothesis)."},
        {"title": "Substitute", "body": "(A) $(\\beta \\to \\exists\\alpha) \\to (\\beta \\to \\forall\\alpha)$. (B) $(\\beta \\to \\exists\\alpha) \\to (\\beta \\to \\forall\\alpha)$. (C) $(\\exists\\alpha \\to \\beta) \\to (\\exists\\alpha \\to \\beta)$. (D) $(\\forall\\alpha \\to \\beta) \\to (\\exists\\alpha \\to \\beta)$."},
        {"title": "(C) is X → X", "body": "Valid. (It is the null-quantification equivalence read one way.)"},
        {"title": "Refute the rest", "body": "$D = \\{0, 1\\}$, α true at 0 only. With β = T: $\\beta \\to \\exists\\alpha$ = T, $\\beta \\to \\forall\\alpha$ = F, so (A), (B) fail. With β = F: $\\forall\\alpha \\to \\beta$ = T, $\\exists\\alpha \\to \\beta$ = F, so (D) fails."},
    ],
    "answer": {"value": "$[(\\exists x\\,\\alpha(x)) \\to \\beta] \\to [\\forall x\\,(\\alpha(x) \\to \\beta)]$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Becomes (β → ∃α) → (β → ∀α): with β true and α true at one element only, T → F."),
        opt("B", False, "∃x(β → α) is β → ∃α, not β → ∀α; same counter-model as (A)."),
        opt("C", True, "∀x(α → β) ≡ ∃xα → β, so the formula is X → X."),
        opt("D", False, "Becomes (∀α → β) → (∃α → β): with β false and α true at one element only, T → F."),
    ],
    "shortcut": "Rewrite every implication as ∨, then the quantifier passes β without changing; the flip appears via De Morgan.",
    "pitfalls": ["Pulling ∀ out of a hypothesis without flipping it (the trap in option D).", "Reading '∀x, β → α(x)' as (∀x β) → α(x): the comma means the quantifier scopes over the whole implication."],
    "verification": "With α(x) = A(x) and β a nullary predicate, exhaustive search up to size 3 finds no counter-model for (C) and two-element counter-models for (A), (B), (D).",
    "animation": eq("Null quantification turns (C) into X → X", [("\\forall x\\,(\\alpha(x) \\to \\beta) \\equiv \\forall x\\,(\\neg\\alpha(x) \\vee \\beta)", None),
                                                                 ("\\equiv (\\forall x\\, \\neg\\alpha(x)) \\vee \\beta \\equiv \\neg\\exists x\\,\\alpha(x) \\vee \\beta", "β has no x"),
                                                                 ("\\equiv (\\exists x\\,\\alpha(x)) \\to \\beta", "the flip")]),
}

SOLUTIONS["cse-2013-cs-47"] = {
    "approach": "Concept tested: **De Morgan for quantifiers and rewriting implications**. Push the negation in, abbreviate the inner quantified blocks, and compare each option as a disjunction under ∀x.",
    "concepts": ["De Morgan for quantifiers", "Equivalence", "Implication law"],
    "given": "Find the option NOT equivalent to $\\neg\\exists x(\\forall y(\\alpha) \\wedge \\forall z(\\beta))$.",
    "steps": [
        {"title": "Push the negation", "body": "Write $P = \\forall y\\,\\alpha$, $Q = \\forall z\\,\\beta$. Given $\\equiv \\forall x\\,\\neg(P \\wedge Q) \\equiv \\forall x(\\neg P \\vee \\neg Q)$, with $\\neg P \\equiv \\exists y \\neg\\alpha$, $\\neg Q \\equiv \\exists z \\neg\\beta$."},
        {"title": "Rewrite each option", "body": "(A) $\\forall x(\\neg Q \\to P) = \\forall x(Q \\vee P)$. (B) $\\forall x(Q \\to \\neg P) = \\forall x(\\neg Q \\vee \\neg P)$. (C) $\\forall x(P \\to \\neg Q) = \\forall x(\\neg P \\vee \\neg Q)$. (D) $\\forall x(\\neg P \\to \\neg Q) = \\forall x(P \\vee \\neg Q)$."},
        {"title": "Compare", "body": "(B) and (C) match the given form (they are contrapositives of each other). (D) differs: with $P$ false and $Q$ true at some $x$, the given body is T and (D)'s body F. So (D) is NOT equivalent."},
        {"title": "A printing problem", "body": "(A) also differs: with $P$, $Q$ both false the given body is T, (A)'s body F. As printed, two options are not equivalent; the key is (D)."},
    ],
    "answer": {"value": "(D) $\\forall x(\\exists y(\\neg\\alpha) \\to \\exists z(\\neg\\beta))$", "choice": ["D"], "matchesKey": True,
               "keyNote": "As printed, option (A) is also not equivalent (it reduces to ∀x(Q ∨ P)); the paper most likely misprinted (A). The bank key (D) is a correct NOT-equivalent option."},
    "optionAnalysis": [
        opt("A", False, "Reduces to ∀x(Q ∨ P), which is also not equivalent as printed; not the keyed answer (likely a misprint in the paper)."),
        opt("B", False, "∀x(Q → ¬P) = ∀x(¬Q ∨ ¬P): equivalent."),
        opt("C", False, "∀x(P → ¬Q) = ∀x(¬P ∨ ¬Q): equivalent."),
        opt("D", True, "∀x(¬P → ¬Q) = ∀x(P ∨ ¬Q): differs when P is false and Q true. Not equivalent."),
    ],
    "shortcut": "Treat ∀yα and ∀zβ as single letters P, Q: the question is then propositional under one ∀x.",
    "pitfalls": ["Distributing the outer ¬ into α and β themselves instead of only flipping the quantifiers.", "Forgetting that X → Y and ¬Y → ¬X are the same (B and C)."],
    "verification": "With α = A(x, y), β = B(x, z), exhaustive search on domains of size 1–2: (B) and (C) are equivalent to the given sentence; (A) and (D) each have a counter-model.",
    "animation": tt("Each option's body as a function of P = ∀yα, Q = ∀zβ", ["P", "Q", "given ¬P∨¬Q", "A", "B", "C", "D"],
                    [["T", "T", "F", "T", "F", "F", "T"], ["T", "F", "T", "T", "T", "T", "T"], ["F", "T", "T", "T", "T", "T", "F"], ["F", "F", "T", "F", "T", "T", "T"]],
                    hl=[(2, 6, "error"), (0, 3, "warning"), (3, 3, "warning")]),
}

SOLUTIONS["cse-2015-2-cs-55"] = {
    "approach": "Concept tested: **valid quantified biconditionals and implications**: replacement of equivalent bodies, the ∀∃/∃∀ swap, and free variables.",
    "concepts": ["Validity", "Quantifier order", "Replacement", "Free variables"],
    "given": "Four well-formed formulas over $R$, $S$, $P$.",
    "steps": [
        {"title": "(C) is valid", "body": "$P(x,y) \\to R(x,y) \\equiv \\neg P(x,y) \\vee R(x,y)$ for every $x, y$, so quantifying both sides the same way ($\\forall x \\exists y$) gives the same sentence: the biconditional is valid."},
        {"title": "(A) fails", "body": "$\\forall x \\exists y R \\leftrightarrow \\exists y \\forall x R$ needs both directions; ∀∃ → ∃∀ fails on $\\{0, 1\\}$ with $R$ = equality."},
        {"title": "(B) fails", "body": "The ∃y binds only $R(x, y)$, so $y$ in $S(x, y)$ is free. With $D = \\{0\\}$, $R = S = \\varnothing$: every hypothesis implication is vacuously T, but $\\forall x \\exists y S$ is F."},
        {"title": "(D) as printed", "body": "$\\forall x \\forall y P(x,y) \\to \\forall x \\forall y P(y,x)$: rename and commute the bound variables, and the conclusion is the hypothesis. So (D) is **also** valid as printed; the intended key is (C)."},
    ],
    "answer": {"value": "Option (C)", "choice": ["C"], "matchesKey": True,
               "keyNote": "As printed, (D) is valid too (both sides say P holds for every ordered pair); the published key is (C)."},
    "optionAnalysis": [
        opt("A", False, "The swap ∀x∃y → ∃y∀x fails (equality on two elements), so the biconditional is not valid."),
        opt("B", False, "y in S(x, y) is free; R = S = ∅ on one element makes the hypothesis T and the conclusion F."),
        opt("C", True, "The two sides have equivalent bodies under the same quantifiers: valid."),
        opt("D", False, "Valid as printed (bound variables can be renamed and like quantifiers commute), but it is not the keyed answer; the paper probably intended a different formula."),
    ],
    "shortcut": "Look for an option whose two sides differ only by a propositional law: that one is valid by replacement.",
    "pitfalls": ["Reading (D) as 'P is symmetric': symmetry would be ∀x∀y(P(x,y) → P(y,x)).", "Missing the free y in (B)."],
    "verification": "Exhaustive search up to size 3 finds no counter-model for (C) or (D); (A) fails on two elements and (B) on one.",
    "animation": tt("Verdicts", ["option", "valid?", "reason"], [["A", "no", "∀∃ ⇏ ∃∀"], ["B", "no", "free y"], ["C", "yes", "same body"], ["D", "yes*", "rename"]],
                    hl=[(2, 1, "success"), (3, 1, "warning")], caption="* valid as printed; key is (C)"),
}

SOLUTIONS["cse-2016-2-cs-27"] = {
    "approach": "Concept tested: **which quantifier distributions are valid**. Rewrite (A) without arrows, recognise (B) and (C) as laws, and refute (D) in the split world.",
    "concepts": ["Validity", "One-way laws", "Counter-model"],
    "given": "Find the formula that is NOT valid.",
    "steps": [
        {"title": "(A) is X → X", "body": "$\\forall x p \\Rightarrow \\forall x q \\equiv \\neg\\forall x p \\vee \\forall x q \\equiv \\exists x \\neg p \\vee \\forall x q$, which is the conclusion. Valid."},
        {"title": "(B), (C) are laws", "body": "(B) is ∃ over ∨ (an equivalence, used right-to-left). (C) is the one-way law ∃(p ∧ q) ⇒ ∃p ∧ ∃q. Both valid."},
        {"title": "(D) fails", "body": "$D = \\{0, 1\\}$, $p = \\{0\\}$, $q = \\{1\\}$: $\\forall x(p \\vee q)$ = T, $\\forall x p \\vee \\forall x q$ = F ∨ F = F."},
    ],
    "answer": {"value": "Option (D) is not valid", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Valid: hypothesis and conclusion are the same formula once the arrow is rewritten."),
        opt("B", False, "Valid: ∃ distributes over ∨."),
        opt("C", False, "Valid: a common witness witnesses each conjunct."),
        opt("D", True, "Not valid: ∀ does not distribute over ∨ (split world)."),
    ],
    "shortcut": "∀ with ∨ is the only mismatched pairing among the options.",
    "pitfalls": ["Marking (A) as not valid because it 'changes ∀ into ∃'.", "Confusing (C) (valid direction) with its converse."],
    "verification": "Exhaustive search up to size 3: no counter-model for (A), (B), (C); (D) fails on two elements.",
    "animation": tt("Split world for (D)", ["x", "p(x)", "q(x)", "p∨q"], [["0", "T", "F", "T"], ["1", "F", "T", "T"]], hl=[(0, 3, "success"), (1, 3, "success"), (1, 1, "error"), (0, 2, "error")]),
}

SOLUTIONS["cse-2017-1-cs-2"] = {
    "approach": "Concept tested: **what ∀x∃y R(x, y) implies**: ∀ ⇒ ∃ on non-empty domains, De Morgan for quantifiers, and why the order cannot be swapped.",
    "concepts": ["Logical implication", "Quantifier order", "De Morgan for quantifiers"],
    "given": "$F = \\forall x \\exists y R(x, y)$; domains non-empty.",
    "steps": [
        {"title": "IV equals F", "body": "$\\neg\\exists x \\forall y \\neg R(x,y) \\equiv \\forall x \\neg\\forall y \\neg R \\equiv \\forall x \\exists y R(x,y) = F$. Implied."},
        {"title": "I follows", "body": "Pick any element $a$; $F$ gives $b$ with $R(a, b)$, so $\\exists y \\exists x R(x, y)$. Implied (needs non-empty domain)."},
        {"title": "II fails", "body": "$D = \\{0, 1\\}$, $R$ = equality: every $x$ has $y = x$, but no $y$ works for all $x$. $F$ true, II false."},
        {"title": "III fails", "body": "$D = \\{0, 1\\}$, $R = \\{(0, 0), (1, 0)\\}$: every row has a 1, but column 1 is empty, so $\\forall y \\exists x R$ is false."},
    ],
    "answer": {"value": "I and IV only", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Misses I, which follows because the domain is non-empty."),
        opt("B", True, "I by ∀ ⇒ ∃, IV by De Morgan; II and III have counter-models."),
        opt("C", False, "II is the swapped, stronger sentence ∃y∀x: refuted by equality."),
        opt("D", False, "II and III both fail (equality and the 'column' relation)."),
    ],
    "shortcut": "In grid terms F says 'every row has a 1': I (some 1) and IV (no all-0 row) follow; 'a full column' (II) and 'every column has a 1' (III) do not.",
    "pitfalls": ["Thinking ∀x∃y gives ∃y∀x.", "Overlooking that IV is just F after pushing the negation."],
    "verification": "Exhaustive search up to size 3: F → I and F → IV have no counter-model; F → II and F → III fail on two elements.",
    "animation": tt("The 'column' world R = {(0,0), (1,0)}", ["x \\ y", "0", "1"], [["0", "1", "0"], ["1", "1", "0"]], hl=[(0, 1, "success"), (1, 1, "success"), (0, 2, "error"), (1, 2, "error")],
                    caption="Every row has a 1 (F true); column 1 is empty (III false)."),
}

SOLUTIONS["cse-2018-cs-28"] = {
    "approach": "Concept tested: **the small-model property of ∃*∀* sentences without function symbols** (the Bernays–Schönfinkel class). Restrict any model to the witnesses of the existential quantifiers.",
    "concepts": ["Model", "Substructure", "Small-model property", "Prenex form"],
    "given": "$\\varphi = \\exists s \\exists t \\exists u \\forall v \\forall w \\forall x \\forall y\\, \\psi$, $\\psi$ quantifier-free, predicates and equality only; $\\varphi$ has a 7-element model.",
    "steps": [
        {"title": "Pick the witnesses", "body": "In the 7-element model choose $a, b, c$ for $s, t, u$ with $\\forall v \\forall w \\forall x \\forall y\\, \\psi(a, b, c, v, w, x, y)$ true."},
        {"title": "Restrict the model", "body": "Let $E = \\{a, b, c\\}$ (1 to 3 elements) and keep only the tuples of each predicate that lie inside $E$."},
        {"title": "The ∀ part survives", "body": "Every choice of $v, w, x, y$ from $E$ was a case in the big model, and ψ (no quantifiers, no functions) depends only on the chosen elements, so it stays true. The witnesses are still present, so $\\varphi$ holds in a model of size $\\le 3$."},
        {"title": "Discard the rest", "body": "(B) contradicts what we just built. (C) and (D) fail for ψ = $(v = v)$, which has models of every size, e.g. 8."},
    ],
    "answer": {"value": "There exists at least one model of φ with universe of size ≤ 3", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Restricting the given model to the three witnesses gives a model of size at most 3."),
        opt("B", False, "Contradicted by the restricted model."),
        opt("C", False, "Not necessarily: with ψ = (v = v), φ has models of every size."),
        opt("D", False, "The restricted model (size ≤ 3) is a counter-example, and larger models can also exist."),
    ],
    "shortcut": "∃^k∀* without functions ⇒ a model with at most k elements: keep only the witnesses.",
    "pitfalls": ["Thinking the bound is exactly 3: witnesses may coincide, so the model can have 1 or 2 elements.", "Applying the argument to ∀∃ sentences, where witnesses depend on the universal variables."],
    "verification": "Executed on random ∃²∀² sentences: whenever a model exists, its restriction to the witnesses is a model, and one of size ≤ 2 is always found.",
    "animation": {"kind": "graph", "title": "Keep the witnesses s, t, u", "directed": True, "layout": "manual",
                  "nodes": [{"id": str(i), "x": i, "y": 0, **({"tone": "accent", "sub": "stu"[(i - 2) // 2]} if i in (2, 4, 6) else {"tone": "muted"})} for i in range(7)],
                  "edges": [{"from": "2", "to": "4", "tone": "accent"}, {"from": "4", "to": "6", "tone": "accent"}, {"from": "2", "to": "6", "tone": "accent"}],
                  "caption": "A 7-element model restricted to {2, 4, 6} is still a model."},
}

SOLUTIONS["cse-2020-cs-39"] = {
    "approach": "Concept tested: **null quantification**: moving a quantifier past a formula $W$ without free $x$, flipping it when it leaves the hypothesis of an implication.",
    "concepts": ["Null quantification", "Equivalence", "Counter-model"],
    "given": "$W$ has no free occurrence of $x$.",
    "steps": [
        {"title": "(A), (B): ∧ and ∨ lines", "body": "$\\forall x(p \\vee W) \\equiv \\forall x p \\vee W$ and $\\exists x(p \\wedge W) \\equiv \\exists x p \\wedge W$: split on $W$ (T or F); both sides agree. Valid."},
        {"title": "(D): flip out of the hypothesis", "body": "$\\exists x(p \\to W) \\equiv \\exists x(\\neg p \\vee W) \\equiv \\exists x \\neg p \\vee W \\equiv \\neg\\forall x p \\vee W \\equiv \\forall x p \\to W$. Valid."},
        {"title": "(C): missing flip", "body": "The same chain for ∀ gives $\\forall x(p \\to W) \\equiv \\exists x p \\to W$, not $\\forall x p \\to W$. Counter-model: $D = \\{0, 1\\}$, $p = \\{0\\}$, $W$ = F: left F (at $x = 0$), right F → F = T."},
    ],
    "answer": {"value": "C", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Valid: ∀ passes W in a disjunction."),
        opt("B", False, "Valid: ∃ passes W in a conjunction."),
        opt("C", True, "Not valid: ∀ in a hypothesis must become ∃; fails with p = {0}, W false."),
        opt("D", False, "Valid: the ∃ correctly becomes ∀ as it leaves the hypothesis."),
    ],
    "shortcut": "Hypothesis position flips the quantifier: (D) flips and is right, (C) does not flip and is wrong.",
    "pitfalls": ["Rejecting (D) because 'the quantifier changed'.", "Factoring ∀ out of p(x) → W as if → were ∧."],
    "verification": "Exhaustive search up to size 3 (W a nullary predicate): (A), (B), (D) have no counter-model; (C) fails on two elements.",
    "animation": tt("World D = {0, 1}, p = {0}, W = F", ["form", "value"], [["∀x(p(x) → W)", "F"], ["∃x p(x) → W", "F"], ["∀x p(x) → W", "T"]], hl=[(2, 1, "error"), (1, 1, "success")]),
}

SOLUTIONS["cse-2025-2-cs-5"] = {
    "approach": "Concept tested: **the induction principle over ℕ**. Option (A) is mathematical induction; each other option has a base or a step direction that leaves part of ℕ uncovered, shown by one predicate.",
    "concepts": ["Mathematical induction", "Counter-example", "Well-ordering"],
    "given": "$P$ arbitrary over $\\mathbb{N} = \\{0, 1, 2, \\dots\\}$.",
    "steps": [
        {"title": "(A) is induction", "body": "Suppose $P(0)$ and $\\forall x(P(x) \\Rightarrow P(x + 1))$ but some number fails; let $m$ be the least. $m \\ne 0$, so $m - 1 \\in \\mathbb{N}$ satisfies $P$, and the step gives $P(m)$: contradiction. So $\\forall x P(x)$."},
        {"title": "(D): base 1000, forwards", "body": "$P(x)$: $x \\ge 1000$. Base and step hold; $P(0)$ fails."},
        {"title": "(C): base 1000, backwards", "body": "$P(x)$: $x \\le 1000$. Base and step $P(x) \\Rightarrow P(x - 1)$ hold; $P(1001)$ fails."},
        {"title": "(B): base 0, backwards", "body": "$P(x)$: $x = 0$. $P(0)$ holds; the step is vacuous for $x \\ge 1$ (and stays at 0 if $0 - 1$ is read as 0); $P(1)$ fails."},
    ],
    "answer": {"value": "Option **(A)**, the principle of mathematical induction", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The induction principle; valid by the least-counterexample argument."),
        opt("B", False, "Steps towards 0 from the base 0 never reach 1: P(x) = (x = 0) is a counter-example."),
        opt("C", False, "Covers 0…1000 only: P(x) = (x ≤ 1000)."),
        opt("D", False, "Covers 1000 onwards only: P(x) = (x ≥ 1000)."),
    ],
    "shortcut": "The base must be the least element and the step must point away from it.",
    "pitfalls": ["Accepting any 'base + step' as induction.", "Worrying about $0 - 1$ in (B) and (C): the counter-examples work under either reading."],
    "verification": "On {0, …, 2999} the three counter-example predicates satisfy each hypothesis and fail the conclusion; on initial segments up to 10, every set containing 0 and closed under +1 is the whole segment.",
    "animation": tt("Which numbers each option reaches", ["option", "base", "step", "covers"], [["A", "0", "+1", "all of ℕ"], ["B", "0", "−1", "{0}"], ["C", "1000", "−1", "0…1000"], ["D", "1000", "+1", "1000…"]],
                    hl=[(0, 3, "success"), (1, 3, "error"), (2, 3, "error"), (3, 3, "error")]),
}
