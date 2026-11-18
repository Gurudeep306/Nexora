"""Teacher-style v2 solutions for the PYQs of dm/02-predicate-logic/02-quantifier-laws-validity.
Every key is re-derived by finite-domain evaluation in l2_02_validity.py."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from dmlib import opt  # noqa: E402

SOLUTIONS = {}

SOLUTIONS["cse-1991-b-15-b"] = {
    "approach": "Concept tested: **models of a first-order sentence** — the four conjuncts say R is serial, asymmetric (hence irreflexive), and transitive: a strict order where every element has a successor.",
    "concepts": ["First-order models", "Satisfiability", "Infinite-only models"],
    "given": "$(\\forall x)(\\exists y) R(x,y) \\land (\\forall x)(\\forall y)(R(x,y) \\rightarrow \\neg R(y,x)) \\land (\\forall x)(\\forall y)(\\forall z)(R(x,y) \\land R(y,z) \\rightarrow R(x,z)) \\land (\\forall x) \\neg R(x,x)$. Does it have finite models? Is it satisfiable?",
    "steps": [
        {"title": "No finite model", "body": "In a model with $n$ elements, start anywhere and follow successors (seriality): $x_0, x_1, \\dots, x_n$ with $R(x_m, x_{m+1})$. That is $n+1$ names for $n$ elements, so $x_p = x_q$ for some $p < q$. Transitivity along the chain then gives $R(x_p, x_q)$, i.e. $R(x_p, x_p)$ — contradicting $\\forall x\\,\\neg R(x,x)$. So **no finite model exists** (verified exhaustively for sizes 1–4 in the checks)."},
        {"title": "A countable model", "body": "Take domain $\\mathbb{N}$ with $R(x,y) \\iff x < y$. Serial: $y = x+1$. Asymmetric: $x<y \\Rightarrow \\neg(y<x)$. Transitive: $x<y<z \\Rightarrow x<z$. Irreflexive: $\\neg(x<x)$. All four hold, so the sentence is **satisfiable** — the model $(\\mathbb{N}, <)$ works."},
    ],
    "answer": {"value": "**No finite models**; **satisfiable**, e.g. the countable model $(\\mathbb{N}, <)$.", "matchesKey": True},
    "shortcut": "Serial + transitive + irreflexive forces an infinite chain $x_0 R x_1 R x_2 \\cdots$ of pairwise distinct elements — impossible in a finite domain.",
    "pitfalls": ["Answering 'unsatisfiable' because no finite model exists — first-order sentences can have only infinite models.", "Forgetting that asymmetry already implies irreflexivity (put $y = x$)."],
    "verification": "The checks enumerate all interpretations of R on domains of size 1–4: none satisfies the sentence; the four conjuncts are verified on $(\\mathbb{N}, <)$ directly.",
}

SOLUTIONS["cse-1992-a-2-xv"] = {
    "approach": "Concept tested: **which quantifier distributions are valid**. Only the $\\forall$ over $\\vee$ in the safe direction is valid: $(\\forall x P) \\lor (\\forall x Q) \\to \\forall x (P \\lor Q)$.",
    "concepts": ["Validity", "One-way quantifier laws"],
    "given": "Which of A–D are valid? A: $(\\forall x)P(x) \\lor (\\forall x)Q(x) \\to (\\forall x)(P(x) \\lor Q(x))$; B: $(\\exists x)P(x) \\land (\\exists x)Q(x) \\to (\\exists x)(P(x) \\land Q(x))$; C: $(\\forall x)(P(x) \\lor Q(x)) \\to (\\forall x)P(x) \\lor (\\forall x)Q(x)$; D: $(\\exists x)(P(x) \\lor Q(x)) \\to \\neg(\\forall x)P(x) \\lor (\\exists x)Q(x)$.",
    "steps": [
        {"title": "A is valid", "body": "If every x satisfies P (or every x satisfies Q), then every x satisfies $P \\lor Q$. One-line proof; verified on all interpretations up to size 3."},
        {"title": "B, C, D fail on U = {1, 2}", "body": "Take $P = \\{1\\}$, $Q = \\{2\\}$. B: LHS true, RHS false (no single x has both). C: LHS true, RHS false. D: LHS true; RHS is $\\neg\\forall xP \\lor \\exists xQ = F \\lor T$... use $Q=\\varnothing$ instead: then D's RHS is $F \\lor F = F$ while LHS is true. All three refuted on a 2-element domain."},
    ],
    "answer": {"value": "Only A is valid.", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "$(\\forall xP)\\lor(\\forall xQ) \\Rightarrow \\forall x(P\\lor Q)$: valid — one of the two universal sides already covers every element."),
        opt("B", False, "$\\exists xP \\land \\exists xQ$ may use different witnesses; $\\exists x(P\\land Q)$ needs one shared witness. Counter-model: $P=\\{1\\}, Q=\\{2\\}$ on $\\{1,2\\}$."),
        opt("C", False, "The converse of A. Counter-model: $P=\\{1\\}, Q=\\{2\\}$ on $\\{1,2\\}$: LHS true, RHS false."),
        opt("D", False, "$\\exists x(P\\lor Q) \\to \\neg\\forall xP \\lor \\exists xQ$: take $P=\\{1\\}, Q=\\varnothing$ on $\\{1\\}$: LHS true, RHS $F\\lor F = F$."),
    ],
    "shortcut": "Write the valid direction first: $(\\forall P)\\lor(\\forall Q) \\to \\forall(P\\lor Q)$; the converse needs a shared element, which a 2-element split refutes.",
    "pitfalls": ["Thinking $\\exists$ distributes over $\\land$ — it does not (B).", "Reading D's $\\sim(\\forall x)P(x)$ as $\\exists x\\neg P(x)$ — it is exactly that, and D still fails."],
    "verification": "The check evaluates all four statements on every interpretation of P, Q up to domain size 3 (full search, and seeded sampling beyond): only A is valid.",
}

SOLUTIONS["cse-2003-cs-32"] = {
    "approach": "Concept tested: **the valid distribution law** $\\forall x(\\alpha \\Rightarrow \\beta) \\Rightarrow ((\\forall x\\,\\alpha) \\Rightarrow (\\forall x\\,\\beta))$. Treat $\\alpha, \\beta$ as arbitrary formulas in x — substituting $A(x), B(x)$ covers every case.",
    "concepts": ["Validity", "One-way law for $\\forall$ over $\\to$"],
    "given": "Which of A–D is a valid first-order formula? ($\\alpha, \\beta$ have x as their only free variable.)",
    "steps": [
        {"title": "D is the law", "body": "If every x satisfies $\\alpha \\Rightarrow \\beta$, and every x satisfies $\\alpha$, then every x satisfies $\\beta$. Valid; no counter-model exists on any domain."},
        {"title": "A, B, C have counter-models", "body": "A fails with $A=\\{1\\}, B=\\varnothing$ on $\\{1,2\\}$: the antecedent $(\\forall xA \\Rightarrow \\forall xB)$ is $F \\Rightarrow F = T$, but $\\forall x(A \\Rightarrow B)$ is false at $x=1$. B fails with $A=\\{1\\}, B=\\varnothing$ on $\\{1\\}$: $\\forall xA = T$ but $\\exists x(A\\land B) = F$. C fails with $A=\\varnothing, B=\\{1\\}$ on $\\{1,2\\}$: $\\forall x(A\\lor B) = F$ and $\\exists xA = F$, so the antecedent is $T$, but $\\forall xA = F$."},
    ],
    "answer": {"value": "$(\\forall x)[\\alpha \\Rightarrow \\beta] \\Rightarrow ((\\forall x)[\\alpha] \\Rightarrow (\\forall x)[\\beta])$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$((\\forall\\alpha)\\Rightarrow(\\forall\\beta))\\Rightarrow\\forall(\\alpha\\Rightarrow\\beta)$: the converse direction — refuted by $A=\\{1\\}, B=\\varnothing$ on $\\{1,2\\}$."),
        opt("B", False, "$\\forall\\alpha \\Rightarrow \\exists(\\alpha\\land\\beta)$: refuted by $A=\\{1\\}, B=\\varnothing$ on a 1-element domain."),
        opt("C", False, "$((\\forall(\\alpha\\lor\\beta))\\Rightarrow\\exists\\alpha)\\Rightarrow\\forall\\alpha$: refuted by $A=\\varnothing, B=\\{1\\}$ on $\\{1,2\\}$."),
        opt("D", True, "The distribution law for $\\forall$ over $\\rightarrow$: valid on every interpretation."),
    ],
    "shortcut": "Remember the one law with $\\forall$ and $\\to$: $\\forall(\\alpha\\to\\beta) \\to (\\forall\\alpha \\to \\forall\\beta)$. Its converse (A) is the classic trap.",
    "pitfalls": ["Substituting $\\alpha, \\beta$ correctly — any unary predicates $A(x), B(x)$ capture all cases since only x is free."],
    "verification": "Substituting $\\alpha:=A(x), \\beta:=B(x)$, the check searches all interpretations up to size 3: only D is valid.",
}

SOLUTIONS["cse-2003-cs-33"] = {
    "approach": "Concept tested: **evaluating a formula on a named interpretation**. The inner $\\forall y(Q_{xy} \\Leftrightarrow \\neg Q_{yy})$ is false for every x (witness $y = x$: $Q_{xx}$ is true because x divides x, so $Q_{xx} \\Leftrightarrow \\neg Q_{xx}$ is $T \\Leftrightarrow F = F$).",
    "concepts": ["Interpretations", "Models", "Divisibility predicate"],
    "given": "$\\alpha: (\\forall x)[P_x \\Leftrightarrow (\\forall y)[Q_{xy} \\Leftrightarrow \\neg Q_{yy}]] \\Rightarrow (\\forall x)[\\neg P_x]$; $I_1$: domain $\\mathbb{N}$, $P$ = primes, $Q_{xy}$ = 'y divides x'; $I_2$: same but $P$ = composites. Which satisfies $\\alpha$?",
    "steps": [
        {"title": "The inner block is always false", "body": "For any x, take $y = x$: $Q_{xx}$ ('x divides x') is true, so $Q_{xx} \\Leftrightarrow \\neg Q_{xx}$ is false, so $\\forall y(Q_{xy} \\Leftrightarrow \\neg Q_{yy})$ is false for every x. Hence the antecedent $\\forall x[P_x \\Leftrightarrow \\text{false}]$ is $\\forall x\\,\\neg P_x$."},
        {"title": "$\\alpha$ becomes a tautology", "body": "$\\alpha \\equiv (\\forall x\\,\\neg P_x) \\Rightarrow (\\forall x\\,\\neg P_x)$, which is true in every interpretation — in particular both $I_1$ (P = primes) and $I_2$ (P = composites) satisfy it. Answer: both."},
    ],
    "answer": {"value": "Both $I_1$ and $I_2$ satisfy $\\alpha$.", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$I_1$ satisfies but $I_2$ does not — no: the antecedent is false in both, so the implication is true in both."),
        opt("B", False, "$I_2$ satisfies but $I_1$ does not — same mistake reversed."),
        opt("C", False, "Neither satisfies — wrong: the antecedent is false for every x in both interpretations."),
        opt("D", True, "Both satisfy: $\\forall y(Q_{xy}\\Leftrightarrow\\neg Q_{yy})$ is false at $y=x$ for every x, making the antecedent $\\forall x\\neg P_x$, so $\\alpha$ is $(∀x¬P)\\to(∀x¬P)$."),
    ],
    "shortcut": "Plug $y = x$ into the inner biconditional: $Q_{xx} \\Leftrightarrow \\neg Q_{xx}$ is always false, so the antecedent collapses to $\\forall x \\neg P_x$ and the whole formula is a tautology regardless of what P is.",
    "pitfalls": ["Reading $Q_{xy}$ as 'x divides y' — the note says y divides x, so $Q_{xx}$ is true.", "Evaluating the biconditional per-y instead of noticing the $y=x$ witness kills the whole $\\forall y$."],
    "verification": "The check evaluates $\\alpha$ over the domain {1..8} with the divides relation, for P = primes and P = composites: both true; and confirms $\\forall y(Q_{xy}\\Leftrightarrow\\neg Q_{yy})$ is false for every x.",
}

SOLUTIONS["cse-2003-cs-71"] = {
    "approach": "Concept tested: **reading a logic program as a first-order sentence**. The rule $A(x) \\leftarrow B(x,y), C(y)$ means: for every x, IF SOME y satisfies the body, THEN A(x). The fact $\\leftarrow B(x,x)$ is the negative fact $\\neg\\exists x\\, B(x,x)$.",
    "concepts": ["Horn clauses", "Logic programs", "Existential in the body"],
    "given": "Logic program P:  A(x) \u2190 B(x, y), C(y)   and   \u2190 B(x, x). Which sentence is equivalent to P?",
    "steps": [
        {"title": "Translate the rule", "body": "A rule with variables in the body is universally quantified over the head variable, and the body variables become existential INSIDE the antecedent: $\\forall x\\,[(\\exists y)(B(x,y) \\land C(y)) \\Rightarrow A(x)]$. Note: $\\forall y$ in the body would mean ALL y's must satisfy it — that is the wrong reading."},
        {"title": "Translate the fact", "body": "$\\leftarrow B(x,x)$ (a rule with empty body) is the constraint $\\neg\\exists x\\, B(x,x)$, joined by $\\land$. Full sentence: $\\forall x[(\\exists y)(B(x,y)\\land C(y)) \\Rightarrow A(x)] \\land \\neg\\exists x\\, B(x,x)$ — option A."},
    ],
    "answer": {"value": "$(\\forall x)[(\\exists y)[B(x,y) \\wedge C(y)] \\Rightarrow A(x)] \\wedge \\neg(\\exists x)[B(x,x)]$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Existential body inside the antecedent, fact negated and conjoined — exactly the program."),
        opt("B", False, "$\\forall y$ in the body demands every y satisfy $B(x,y)\\land C(y)$ — far too strong. (Errata: B and D are printed identically in the paper; both carry this error.)"),
        opt("C", False, "Joins rule and fact with $\\lor$ instead of $\\land$ — the fact must hold, not be optional."),
        opt("D", False, "Same $\\forall y$ error as B (the two options are identical as printed)."),
    ],
    "shortcut": "Head variable $\\to$ outer $\\forall$; body variables $\\to$ $\\exists$ inside the antecedent; empty-body rule $\\to$ negated fact with $\\land$.",
    "pitfalls": ["Putting $\\forall y$ around the body conjunction instead of $\\exists y$ inside the antecedent.", "Using $\\lor$ for the rule+fact pair."],
    "verification": "Equivalence search up to domain size 3 against the intended sentence: only A matches; B, C, D all differ (a separating model is in l2_02_validity.py).",
}

SOLUTIONS["it-2005-cs-36"] = {
    "approach": "Concept tested: **which implication between quantified statements is always true**. Only B is the $\\forall$-over-$\\to$ distribution law; A, C, D all fail on small counter-models.",
    "concepts": ["Validity", "Counter-models", "One-way laws"],
    "given": "P(x), Q(x) arbitrary predicates. Which statement is always TRUE?",
    "steps": [
        {"title": "B is valid", "body": "$\\forall x(P\\Rightarrow Q) \\Rightarrow ((\\forall xP) \\Rightarrow (\\forall xQ))$: if every x satisfies $P\\Rightarrow Q$ and every x satisfies P, then every x satisfies Q. A law — no counter-model exists."},
        {"title": "A, C, D fail", "body": "A is the not-law $\\forall(P\\lor Q) \\to \\forall P \\lor \\forall Q$: refuted by $P=\\{1\\}, Q=\\{2\\}$ on $\\{1,2\\}$. C is the converse of the law: same counter-model works ($\\forall xP\\Rightarrow\\forall xQ$ is $F\\Rightarrow F = T$ while $\\forall x(P\\Rightarrow Q)$ is false at 1). D fails with $P=\\{1\\}, Q=\\{2\\}$ on $\\{1,2\\}$: $(\\forall xP \\Leftrightarrow \\forall xQ)$ is $F \\Leftrightarrow F = T$ but $\\forall x(P \\Leftrightarrow Q)$ is false at both."},
    ],
    "answer": {"value": "$(\\forall x (P(x) \\Rightarrow Q(x))) \\Rightarrow ((\\forall x P(x)) \\Rightarrow (\\forall x Q(x)))$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\forall(P\\lor Q) \\to \\forall P \\lor \\forall Q$: refuted by $P=\\{1\\}, Q=\\{2\\}$ on $\\{1,2\\}$."),
        opt("B", True, "The $\\forall$-over-$\\to$ law — always true."),
        opt("C", False, "Converse of B — refuted by the same 2-element split."),
        opt("D", False, "$(∀xP \\Leftrightarrow ∀xQ) \\to ∀x(P \\Leftrightarrow Q)$: refuted by $P=\\{1\\}, Q=\\{2\\}$."),
    ],
    "shortcut": "There is exactly one valid $\\forall$-implication law; every other arrangement of the four options appears as its converse or a $\\lor$/$\\Leftrightarrow$ variant and dies on a 2-element domain.",
    "pitfalls": ["Treating $\\Leftrightarrow$ between the quantified sides as distributive (D)."],
    "verification": "Full search over all interpretations of P, Q up to domain size 3: only B is valid.",
}

SOLUTIONS["it-2006-cs-21"] = {
    "approach": "Concept tested: **satisfiability vs validity**. $\\varphi = \\forall x\\forall y(R(x,y) \\Rightarrow R(y,x))$ says R is symmetric — true in some interpretations, false in others, so it is satisfiable and its negation is satisfiable too.",
    "concepts": ["Satisfiable", "Valid", "Negation of a sentence"],
    "given": "$\\forall x \\forall y (R(x,y) \\Rightarrow R(y,x))$. The formula is ...?",
    "steps": [
        {"title": "Satisfiable", "body": "Take the empty relation $R = \\varnothing$ on any non-empty domain: every implication has a false antecedent, so $\\varphi$ is true. Hence satisfiable — and not valid, because $R = \\{(1,2\\})$ on $\\{1,2\\}$ falsifies it ($R(1,2) \\Rightarrow R(2,1)$ is $T \\Rightarrow F$)."},
        {"title": "Negation also satisfiable", "body": "The same $R = \\{(1,2\\})$ makes $\\neg\\varphi$ true. So $\\varphi$ is satisfiable and so is its negation — option B. (It is not valid, and its negation is not valid either: $R=\\varnothing$ falsifies the negation.)"},
    ],
    "answer": {"value": "Satisfiable, and its negation is satisfiable too.", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Not valid: $R=\\{(1,2\\})$ on $\\{1,2\\}$ falsifies symmetry."),
        opt("B", True, "$R=\\varnothing$ satisfies $\\varphi$; $R=\\{(1,2\\}$ satisfies $\\neg\\varphi$."),
        opt("C", False, "$\\varphi$ is satisfiable, so not unsatisfiable."),
        opt("D", False, "The negation is satisfiable (same one-directional R), so 'negation unsatisfiable' is wrong."),
    ],
    "shortcut": "A sentence that is true under the empty relation and false under a one-directional relation is satisfiable with satisfiable negation.",
    "pitfalls": ["Conflating 'not valid' with 'unsatisfiable'."],
    "verification": "The check computes satisfiable($\\varphi$), satisfiable($\\neg\\varphi$), valid($\\varphi$) over all interpretations up to size 3.",
}

SOLUTIONS["it-2007-cs-21"] = {
    "approach": "Concept tested: **spotting the single valid formula** among four — only A is the $\\forall$-over-$\\to$ law; B, C, D are the classic not-laws.",
    "concepts": ["Validity", "One-way laws", "Order of $\\forall\\exists$"],
    "given": "Which one of A–D is valid? A: $\\forall x(P\\Rightarrow Q)\\Rightarrow((\\forall xP)\\Rightarrow(\\forall xQ))$; B: $\\exists x(P\\lor Q)\\Rightarrow((\\exists xP)\\Rightarrow(\\exists xQ))$; C: $\\exists x(P\\land Q)\\equiv((\\exists xP)\\land(\\exists xQ))$; D: $\\forall x\\exists yP(x,y)\\Rightarrow\\exists y\\forall xP(x,y)$.",
    "steps": [
        {"title": "A is valid", "body": "The distribution law — proven in one line: assume $\\forall x(P\\Rightarrow Q)$ and $\\forall xP$; for any x, $P(x)$ and $P(x)\\Rightarrow Q(x)$ give $Q(x)$."},
        {"title": "B, C, D fail", "body": "B: $P=\\{1\\}, Q=\\varnothing$ on $\\{1\\}$ — LHS true, RHS $T\\Rightarrow F = F$. C is not an equivalence: same split refutes $\\leftarrow$. D is the famous order law in the wrong direction: the diagonal $R=\\{(1,1),(2,2)\\}$ on $\\{1,2\\}$ makes $\\forall x\\exists y$ true but $\\exists y\\forall x$ false."},
    ],
    "answer": {"value": "$\\forall x(P(x)\\Rightarrow Q(x))\\Rightarrow((\\forall xP(x))\\Rightarrow(\\forall xQ(x)))$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The $\\forall$-over-$\\to$ distribution law."),
        opt("B", False, "$\\exists x(P\\lor Q)$ true does not give $(\\exists xP)\\Rightarrow(\\exists xQ)$ — counter-model $P=\\{1\\}, Q=\\varnothing$ on $\\{1\\}$."),
        opt("C", False, "$\\exists x(P\\land Q)$ is stronger than $(\\exists xP)\\land(\\exists xQ)$ — the $\\equiv$ fails on the 2-element split."),
        opt("D", False, "$\\forall x\\exists y \\not\\Rightarrow \\exists y\\forall x$ — diagonal relation refutes it."),
    ],
    "shortcut": "Memorise the two order laws: $\\exists y\\forall x \\Rightarrow \\forall x\\exists y$ holds, the converse (D) does not.",
    "pitfalls": ["Reading C as an equivalence because both sides 'use existence'."],
    "verification": "Full search up to size 3 on all four options: only A is valid.",
}

SOLUTIONS["it-2008-it-21"] = {
    "approach": "Concept tested: **null quantification — moving a quantifier past a formula that does not contain the variable**. With x not free in $\\beta$: $((\\exists x\\,\\alpha) \\to \\beta) \\equiv \\forall x(\\alpha \\to \\beta)$, which is exactly C.",
    "concepts": ["Null quantification", "Validity", "Wide-scope reading of $\\forall x, \\varphi \\to \\psi$"],
    "given": "$\\alpha(x)$ has x free; $\\beta$ has no free variable. Which of A–D is logically valid?",
    "steps": [
        {"title": "C is valid", "body": "$[(\\exists x\\alpha) \\to \\beta] \\to [\\forall x(\\alpha \\to \\beta)]$: if some x makes $\\alpha$ true and $\\beta$ holds, then for every x, $\\alpha(x) \\to \\beta$ holds (either $\\alpha(x)$ is false, or $\\beta$ is true). Since x is not free in $\\beta$, the quantifier slides past it — no counter-model exists."},
        {"title": "A, B, D fail", "body": "Substitute $\\alpha := A(x)$, $\\beta := B$ (a sentence). A: $B=T$, A true only at 1 on $\\{1,2\\}$ — LHS $T\\to T$, RHS $\\forall x(B\\to A(x))$ false. B: same world, $\\exists x(B\\to A(x))$ true but $B\\to\\forall xA(x)$ false. D: $B=F$, A true only at 1 — LHS $(\\forall xA)\\to F$ is $F\\to F = T$, RHS $\\forall x(A(x)\\to F) = \\neg A(1)\\land\\neg A(2)$ false."},
    ],
    "answer": {"value": "$[(\\exists x,\\alpha(x))\\to\\beta]\\to[\\forall x,\\alpha(x)\\to\\beta]$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$[\\beta\\to\\exists x\\alpha]\\to\\forall x(\\beta\\to\\alpha)$: refuted by $\\beta=T$, $\\alpha$ true at exactly one element."),
        opt("B", False, "$[\\exists x(\\beta\\to\\alpha)]\\to[\\beta\\to\\forall x\\alpha]$: same counter-model."),
        opt("C", True, "Null quantification: $((\\exists x\\alpha)\\to\\beta) \\equiv \\forall x(\\alpha\\to\\beta)$ when x is not free in $\\beta$ — valid."),
        opt("D", False, "$((\\forall x\\alpha)\\to\\beta) \\to \\forall x(\\alpha\\to\\beta)$: refuted by $\\beta=F$ with $\\alpha$ true somewhere but not everywhere."),
    ],
    "shortcut": "When the moved formula has no free x, $\\forall x(A\\to\\beta) \\equiv (\\exists xA)\\to\\beta$ and $\\exists x(A\\to\\beta) \\equiv (\\forall xA)\\to\\beta$; only C uses the first in the valid direction.",
    "pitfalls": ["Reading '$\\forall x, \\beta \\to \\alpha(x)$' as $\\forall x(\\beta \\to \\alpha)$ — the wide-scope reading is intended (hand-bracketed in the checks)."],
    "verification": "With $\\alpha:=A(x)$, $\\beta:=B$ (0-ary), full search up to size 3: C valid; A, B, D all have counter-models.",
}

SOLUTIONS["cse-2013-cs-47"] = {
    "approach": "Concept tested: **negation push-through and implication-to-disjunction**. $\\neg\\exists x(\\forall y\\,\\alpha \\land \\forall z\\,\\beta) \\equiv \\forall x(\\exists y\\,\\neg\\alpha \\lor \\exists z\\,\\neg\\beta)$; options B and C are exactly this in $\\to$ clothing, D swaps $\\exists y\\neg\\alpha$ for $\\forall y\\alpha$.",
    "concepts": ["Negation laws", "Implication as disjunction", "Equivalence"],
    "given": "Which option is NOT logically equivalent to $\\neg\\exists x(\\forall y(\\alpha) \\land \\forall z(\\beta))$?",
    "steps": [
        {"title": "Push the negation in", "body": "$\\neg\\exists x(\\forall y\\alpha \\land \\forall z\\beta) \\equiv \\forall x \\neg(\\forall y\\alpha \\land \\forall z\\beta) \\equiv \\forall x(\\exists y\\neg\\alpha \\lor \\exists z\\neg\\beta)$."},
        {"title": "Match each option", "body": "B: $\\forall z\\beta \\to \\exists y\\neg\\alpha \\equiv \\exists z\\neg\\beta \\lor \\exists y\\neg\\alpha$ — matches. C: $\\forall y\\alpha \\to \\exists z\\neg\\beta \\equiv \\exists y\\neg\\alpha \\lor \\exists z\\neg\\beta$ — matches. D: $\\exists y\\neg\\alpha \\to \\exists z\\neg\\beta \\equiv \\forall y\\alpha \\lor \\exists z\\neg\\beta$ — has $\\forall y\\alpha$ instead of $\\exists y\\neg\\alpha$: NOT equivalent. (Errata: as printed, A is also not equivalent — GATE 2013 awarded marks to all; the intended answer is D.)"},
    ],
    "answer": {"value": "$\\forall x(\\exists y(\\neg\\alpha) \\to \\exists z(\\neg\\beta))$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "As printed, $\\forall x(\\exists z\\neg\\beta \\to \\forall y\\alpha)$ is also NOT equivalent (counter-model on a 1-element domain with $\\alpha,\\beta$ true) — GATE 2013 gave marks to all for this question; the intended answer is D."),
        opt("B", False, "Equivalent: $\\forall z\\beta \\to \\exists y\\neg\\alpha \\equiv \\exists z\\neg\\beta \\lor \\exists y\\neg\\alpha$."),
        opt("C", False, "Equivalent: $\\forall y\\alpha \\to \\exists z\\neg\\beta \\equiv \\exists y\\neg\\alpha \\lor \\exists z\\neg\\beta$."),
        opt("D", True, "NOT equivalent: $\\exists y\\neg\\alpha \\to \\exists z\\neg\\beta \\equiv \\forall y\\alpha \\lor \\exists z\\neg\\beta$, which differs from $\\exists y\\neg\\alpha \\lor \\exists z\\neg\\beta$ (model: one element, $\\alpha=\\beta=$ true)."),
    ],
    "shortcut": "After pushing the negation, the target is $\\forall x(\\exists y\\neg\\alpha \\lor \\exists z\\neg\\beta)$; any option whose first disjunct is $\\forall y\\alpha$ (i.e. D, after $\\to$-rewriting) is the odd one out.",
    "pitfalls": ["Rewriting $P\\to Q$ as $Q\\lor\\neg P$ instead of $\\neg P \\lor Q$ — same thing, but watch which disjunct survives.", "Forgetting this question was marks-to-all as printed (A also fails); the intended key is D."],
    "verification": "Substituting $\\alpha:=A(x,y), \\beta:=B(x,z)$, equivalence search up to size 3: B and C match the original; A and D have counter-models (recorded in _errata/dm.md).",
}

SOLUTIONS["cse-2015-2-cs-55"] = {
    "approach": "Concept tested: **tautology in the propositional sense**. C's two sides differ only by $P\\to R$ vs $\\neg P \\lor R$ under the same quantifier prefix — the same formula — so the biconditional is a tautology.",
    "concepts": ["Tautology", "Implication as disjunction", "Validity vs tautology"],
    "given": "Which one of A–D is a tautology?",
    "steps": [
        {"title": "C is a tautology", "body": "$[\\forall x\\exists y(P(x,y)\\to R(x,y))] \\leftrightarrow [\\forall x\\exists y(\\neg P(x,y)\\lor R(x,y))]$: inside, $P\\to R \\equiv \\neg P \\lor R$ pointwise, and the quantifier prefix is unchanged, so both sides are the same formula — the $\\leftrightarrow$ is true in every interpretation (a tautology in GATE's propositional sense)."},
        {"title": "A, B are not; D is valid but not a propositional tautology", "body": "A is the $\\forall\\exists$ vs $\\exists\\forall$ order swap — refuted by the diagonal. B fails with $R=\\varnothing, S=\\varnothing$ on a 1-element domain. D, $\\forall x\\forall yP(x,y) \\to \\forall x\\forall yP(y,x)$, is FOL-valid (if P holds on all pairs it holds on swapped pairs) — but its truth-functional form is $A \\to B$, not a propositional tautology, and GATE's key means the propositional sense here."},
    ],
    "answer": {"value": "$[\\forall x \\exists y (P(x,y) \\rightarrow R(x,y))] \\leftrightarrow [\\forall x \\exists y (\\neg P(x,y) \\vee R(x,y))]$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\forall x\\exists yR \\leftrightarrow \\exists y\\forall xR$: refuted by the diagonal relation on $\\{1,2\\}$."),
        opt("B", False, "Refuted by $R=\\varnothing, S=\\varnothing$ on $\\{1\\}$: antecedent true, consequent false."),
        opt("C", True, "Same formula on both sides up to $P\\to R \\equiv \\neg P\\lor R$ — tautology."),
        opt("D", False, "FOL-valid, but not a propositional tautology (form $A\\to B$); GATE's 'tautology' here is propositional — see errata."),
    ],
    "shortcut": "Scan for an option that is $X \\leftrightarrow X$ up to a pointwise equivalence under a fixed quantifier prefix — only C.",
    "pitfalls": ["Counting D as a tautology because it is FOL-valid — GATE 2015-2-55 means propositional tautology (recorded in _errata/dm.md)."],
    "verification": "Full search up to size 3: A and B have counter-models; C is valid; D is also FOL-valid, which is exactly why the propositional reading matters.",
}

SOLUTIONS["cse-2016-2-cs-27"] = {
    "approach": "Concept tested: **finding the NOT-valid formula**. A, B, C are laws; D is the classic not-law $\\forall x(p\\lor q) \\to (\\forall x p) \\lor (\\forall x q)$.",
    "concepts": ["Validity", "Not-laws", "Counter-models"],
    "given": "Which one of A–D is NOT valid?",
    "steps": [
        {"title": "A, B, C are valid", "body": "A: both sides equal $\\forall p \\to \\forall q$ after rewriting $\\exists x\\neg p \\equiv \\neg\\forall x p$ — an instance of $X\\to X$. B: $\\exists$ distributes over $\\lor$. C: $\\exists x(p\\land q)$ implies both existentials."},
        {"title": "D fails", "body": "On $\\{1,2\\}$ with $p=\\{1\\}, q=\\{2\\}$: $\\forall x(p\\lor q)$ is true, but $\\forall xp$ and $\\forall xq$ are both false — D is false. NOT valid."},
    ],
    "answer": {"value": "$\\forall x(p(x) \\vee q(x)) \\Rightarrow (\\forall x p(x) \\vee \\forall x q(x))$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Valid: the consequent $\\exists x\\neg p \\lor \\forall xq$ is exactly $\\neg\\forall xp \\lor \\forall xq$, i.e. the antecedent itself."),
        opt("B", False, "Valid: $\\exists$ over $\\lor$ distributes."),
        opt("C", False, "Valid: a shared witness for $p\\land q$ witnesses both existentials."),
        opt("D", True, "NOT valid — the counter-model $p=\\{1\\}, q=\\{2\\}$ on $\\{1,2\\}$."),
    ],
    "shortcut": "The only distribution that fails for $\\forall$ is over $\\lor$ — that is D.",
    "pitfalls": ["Thinking A's $\\exists x\\neg p(x)$ is unrelated to $\\forall xp(x)$ — it is its negation."],
    "verification": "Full search up to size 3: A, B, C valid; D has the 2-element counter-model.",
}

SOLUTIONS["cse-2017-1-cs-2"] = {
    "approach": "Concept tested: **what $\\forall x\\exists y R(x,y)$ implies**. I and IV are the same statement (IV is I with the negation pushed in); II and III strengthen it and fail on small models.",
    "concepts": ["Entailment", "Renaming bound variables", "Negation laws"],
    "given": "$F: \\forall x(\\exists y R(x,y))$. Which of I–IV are implied by F? I: $\\exists y(\\exists x R(x,y))$; II: $\\exists y(\\forall x R(x,y))$; III: $\\forall y(\\exists x R(x,y))$; IV: $\\neg\\exists x(\\forall y \\neg R(x,y))$.",
    "steps": [
        {"title": "I and IV are implied", "body": "I just commutes the two existentials. IV: $\\neg\\exists x\\forall y\\neg R \\equiv \\forall x\\exists y R$ — identical to F."},
        {"title": "II and III are not implied", "body": "II demands one single y works for every x: refuted by $R=\\{(1,2),(2,1)\\}$... use $R=\\{(1,1),(2,1)\\}$ on $\\{1,2\\}$: F holds, II fails (no y is R-related from both). III swaps the roles of the variables ($\\forall y\\exists x R(x,y)$ is a different statement): $R=\\{(1,1),(2,1)\\}$ makes F true and III false (y=2 has no x). So implied: I and IV only — option B."},
    ],
    "answer": {"value": "I and IV only.", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "IV only — but I is also implied (existentials commute)."),
        opt("B", True, "I (commute $\\exists\\exists$) and IV (same as F after pushing the negation) are implied; II and III are refuted on $\\{1,2\\}$."),
        opt("C", False, "II only — II is not implied."),
        opt("D", False, "II and III — neither is implied."),
    ],
    "shortcut": "IV is F in disguise ($\\neg\\exists\\forall\\neg = \\forall\\exists$); I is F with commuted existentials; II/III move a $\\forall$ inside and fail.",
    "pitfalls": ["Reading III as a mere renaming of F — renaming $\\forall x\\exists yR(x,y)$ gives $\\forall a\\exists bR(a,b)$, not $\\forall y\\exists xR(x,y)$ (arguments swap)."],
    "verification": "The check tests $F \\to$ each statement on all interpretations up to size 3: I and IV valid, II and III refuted.",
}

SOLUTIONS["cse-2018-cs-28"] = {
    "approach": "Concept tested: **the Bernays–Schönfinkel small-model property**. A sentence $\\exists s\\exists t\\exists u \\forall v\\dots \\psi$ (quantifier-free $\\psi$) that has any model has one of size ≤ 3: keep only the three existential witnesses.",
    "concepts": ["Bernays–Schönfinkel class", "Small-model property", "Witness picking"],
    "given": "$\\varphi = \\exists s\\exists t\\exists u \\forall v\\forall w\\forall x\\forall y\\, \\psi(s,t,u,v,w,x,y)$, $\\psi$ quantifier-free, only predicates and equality. $\\varphi$ has a 7-element model. Which statement is necessarily true?",
    "steps": [
        {"title": "Witness picking", "body": "Let $s_0, t_0, u_0$ be witnesses in the 7-element model. Restrict the universe to $D = \\{s_0, t_0, u_0\\}$ (size ≤ 3). Since the original model satisfies $\\psi$ for ALL v,w,x,y, it certainly satisfies it for v,w,x,y ∈ D. So $(D, \\psi)$ is a model of $\\varphi$ of size ≤ 3. Option A."},
        {"title": "Why the others are wrong", "body": "B is the negation of the truth. C and D confuse 'has a 7-element model' with 'every model has size 7' — adding dummy elements keeps a model valid only if the ∀ part tolerates them, which it does not in general; in any case nothing forces size exactly 7 or forbids bigger models."},
    ],
    "answer": {"value": "There exists at least one model of $\\varphi$ with universe of size ≤ 3.", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Bernays–Schönfinkel: the three existential witnesses alone form a model of size ≤ 3."),
        opt("B", False, "Exactly backwards — a small model necessarily exists."),
        opt("C", False, "A 7-element model says nothing about larger models existing."),
        opt("D", False, "Models of other sizes are fine; nothing forces exactly 7."),
    ],
    "shortcut": "$\\exists^*\\forall^*$ + quantifier-free ⇒ small-model property: delete everything except the existential witnesses.",
    "pitfalls": ["Thinking the ∀-part might break in the submodel — it cannot: universal statements only get easier on smaller domains."],
    "verification": "Demonstrated in the checks on the concrete $\\exists s\\exists t\\exists u\\forall\\dots$ sentence 's,t,u pairwise distinct': a 7-element model exists, a 3-element model exists, no 2-element model exists.",
}

SOLUTIONS["cse-2020-cs-39"] = {
    "approach": "Concept tested: **null quantification with →**. When x is not free in W: $\\forall x(p\\to W) \\equiv (\\exists xp) \\to W$ and $\\exists x(p\\to W) \\equiv (\\forall xp) \\to W$ — but $\\forall x(p\\to W) \\not\\equiv (\\forall xp) \\to W$, which is option C.",
    "concepts": ["Null quantification", "The → one-way laws", "Validity"],
    "given": "W has no free occurrence of x. Which option is NOT logically valid?",
    "steps": [
        {"title": "A, B, D are the null-quantification laws", "body": "A: $\\forall x(p\\lor W) \\equiv \\forall xp \\lor W$ ✓. B: $\\exists x(p\\land W) \\equiv \\exists xp \\land W$ ✓. D: $\\exists x(p\\to W) \\equiv (\\forall xp) \\to W$ ✓ (both sides say $\\neg\\forall xp \\lor W$)."},
        {"title": "C is not valid", "body": "$\\forall x(p\\to W) \\equiv (\\exists xp)\\to W$, not $(\\forall xp)\\to W$. Counter-model: $\\{1,2\\}$, $p=\\{1\\}$, W=false: LHS $\\forall x(p\\to F) = \\neg p(1)\\land\\neg p(2) = F$; RHS $(\\forall xp)\\to W = F \\to F = T$. LHS ≠ RHS."},
    ],
    "answer": {"value": "$\\forall x(p(x) \\rightarrow W) \\equiv \\forall x p(x) \\rightarrow W$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Valid null-quantification law for $\\lor$."),
        opt("B", False, "Valid null-quantification law for $\\land$."),
        opt("C", True, "NOT valid: the correct form is $\\forall x(p\\to W) \\equiv (\\exists x p)\\to W$; counter-model $p=\\{1\\}, W=F$ on $\\{1,2\\}$."),
        opt("D", False, "Valid: $\\exists x(p\\to W) \\equiv (\\forall xp)\\to W$."),
    ],
    "shortcut": "For $\\to$ the quantifier flips when it slides out: $\\forall x(p\\to W) \\equiv (\\exists xp)\\to W$ and $\\exists x(p\\to W) \\equiv (\\forall xp)\\to W$. Any option pairing $\\forall$ with $\\forall$ across $\\to$ is the wrong one.",
    "pitfalls": ["Assuming quantifiers slide out of $\\to$ unchanged — only $\\land$/\\lor keep the same quantifier both ways."],
    "verification": "Full search up to size 3 with W as a 0-ary predicate: A, B, D valid; C refuted.",
}

SOLUTIONS["cse-2025-2-cs-5"] = {
    "approach": "Concept tested: **mathematical induction as a first-order sentence over $\\mathbb{N}$**. Only A has the right base (P(0)) and the right step direction (upward, $P(x) \\Rightarrow P(x+1)$).",
    "concepts": ["Induction axiom", "Domain $\\mathbb{N}$", "Direction of the step"],
    "given": "P(x) over the natural numbers. Which ONE statement is TRUE?",
    "steps": [
        {"title": "A is the induction principle", "body": "$(P(0) \\land \\forall x[P(x) \\Rightarrow P(x+1)]) \\Rightarrow \\forall x P(x)$: P(0) starts the chain and each step climbs one rung, so every natural is reached. True over $\\mathbb{N}$."},
        {"title": "B, C, D are not", "body": "B's step goes downward ($P(x)\\Rightarrow P(x-1)$): it only certifies elements at or below the base, never above it — counter-model $P=\\{0\\}$ on $\\{0..1001\\}$: the step holds everywhere but $\\forall xP$ fails at 1. C: base at 1000 with a downward step covers only $x \\le 1000$ — counter-model $P = \\{0,\\dots,1000\\}$ misses 1001. D: base at 1000 with an upward step covers only $x \\ge 1000$ — counter-model $P = \\{1000, 1001\\}$ on $\\{0..1001\\}$ misses 0."},
    ],
    "answer": {"value": "$(P(0) \\land \\forall x[P(x) \\Rightarrow P(x+1)]) \\Rightarrow \\forall x P(x)$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The induction axiom: base at 0, step upward — reaches every natural number."),
        opt("B", False, "Step goes down: from P(0) nothing above 0 is forced (counter-model $P=\\{0\\}$)."),
        opt("C", False, "Base at 1000, step down: covers only $x\\le1000$ (counter-model $P=\\{0..1000\\}$ on $0..1001$)."),
        opt("D", False, "Base at 1000, step up: covers only $x\\ge1000$ (counter-model $P=\\{1000,1001\\}$ on $0..1001$)."),
    ],
    "shortcut": "Induction needs base at the BOTTOM (0) and step UPWARD (+1); any other base/direction leaves a half-line uncovered.",
    "pitfalls": ["Thinking a downward step from 0 still works because 'there is nothing below 0' — the step never propagates upward."],
    "verification": "On finite domains {0..N} with the fixed-point boundary convention (successor of N is N, predecessor of 0 is 0), the check verifies A for every P on all domains up to size 6, and exhibits explicit counter-models for B, C, D on {0..1001}.",
}
