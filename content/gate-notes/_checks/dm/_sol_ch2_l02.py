"""Teacher-style v2 solutions for the PYQs of dm/02-predicate-logic/02-quantifier-laws-validity. Every key
is re-derived by model search (predlib) or a bounded arithmetic check in l2_02_validity.py."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from dmlib import opt  # noqa: E402

SOLUTIONS = {}
TURN = "the turn-taking world $D = \\{1, 2\\}$, $P = \\{1\\}$, $Q = \\{2\\}$"

SOLUTIONS["cse-1991-b-15-b"] = {
    "approach": "Concept tested: **a sentence whose models are all infinite**. Follow successors: transitivity plus irreflexivity forbid returning to an old element, so the chain never ends.",
    "concepts": ["Models of a sentence", "Transitive irreflexive relations", "Infinite models"],
    "given": "$\\Phi = \\forall x\\, \\exists y\\, R(x, y) \\wedge \\forall x\\, \\forall y\\, (R(x, y) \\to \\neg R(y, x)) \\wedge \\forall x\\, \\forall y\\, \\forall z\\, (R(x, y) \\wedge R(y, z) \\to R(x, z)) \\wedge \\forall x\\, \\neg R(x, x)$.",
    "steps": [
        {"title": "Build the chain", "body": "In any model pick $d_0$ and successors $d_0 R d_1 R d_2 \\cdots$ (first conjunct)."},
        {"title": "All distinct", "body": "Transitivity gives $d_i R d_j$ for all $i < j$. If $d_i = d_j$ with $i < j$, then $d_i R d_i$, contradicting irreflexivity. So infinitely many distinct elements: **no finite model**."},
        {"title": "A countable model", "body": "$(\\mathbb{N}, <)$: every $n$ has $n + 1 > n$; $<$ is asymmetric, transitive and irreflexive. So $\\Phi$ is **satisfiable**."},
    ],
    "answer": {"value": "No finite models; satisfiable, e.g. by (ℕ, <)", "matchesKey": True},
    "shortcut": "‘Every element has a successor’ + ‘strict order’ = an endless ascending chain.",
    "pitfalls": ["Closing the chain into a cycle: transitivity around the cycle gives R(x, x).", "Concluding ‘unsatisfiable’ from ‘no finite model’."],
    "verification": "predlib finds no model on any domain of size 1 to 4; (ℕ, <) restricted to {0..5} satisfies the three universal conditions, and every n has n + 1.",
}

SOLUTIONS["cse-1992-a-2-xv"] = {
    "approach": "Concept tested: **the one-way quantifier laws**: ∀P ∨ ∀Q ⇒ ∀(P ∨ Q) is valid; its converse and ∃P ∧ ∃Q ⇒ ∃(P ∧ Q) are not.",
    "concepts": ["∀ over ∨ (one way)", "∃ over ∧ (one way)", "Counter-models"],
    "given": "Which are valid: A $(\\forall x)P \\vee (\\forall x)Q \\to (\\forall x)(P \\vee Q)$; B $(\\exists x)P \\wedge (\\exists x)Q \\to (\\exists x)(P \\wedge Q)$; C $(\\forall x)(P \\vee Q) \\to (\\forall x)P \\vee (\\forall x)Q$; D $(\\exists x)(P \\vee Q) \\to \\sim(\\forall x)P \\vee (\\exists x)Q$.",
    "steps": [
        {"title": "A", "body": "If all are P, all are P ∨ Q; same if all are Q. **Valid.**"},
        {"title": "B and C", "body": f"Both fail in {TURN}: B's hypothesis is true (witnesses 1 and 2) but no element is both; C's hypothesis is true but neither ∀ holds."},
        {"title": "D", "body": "Take P everywhere and Q nowhere: ∃x(P ∨ Q) is T, ∼∀x P is F and ∃x Q is F. **Not valid.**"},
    ],
    "answer": {"value": "A only", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The valid direction of ‘∀ over ∨’."),
        opt("B", False, "Two different witnesses need not be one element (turn-taking world)."),
        opt("C", False, "‘Each is P or Q’ does not give ‘all P or all Q’ (turn-taking world)."),
        opt("D", False, "P true everywhere, Q nowhere makes the hypothesis T and the conclusion F."),
    ],
    "shortcut": "Only the ‘∀∨ → ∀(∨)’ and ‘∃(∧) → ∃∧’ directions are valid; A is one of them, B and C are the reversed ones.",
    "pitfalls": ["Treating ∀ and ∃ as distributing over every connective."],
    "verification": "predlib: A valid on all worlds up to size 3; counter-models found for B, C and D.",
}

SOLUTIONS["cse-2003-cs-32"] = {
    "approach": "Concept tested: **∀x(α ⇒ β) ⇒ (∀x α ⇒ ∀x β) is valid, its converse is not**; α, β behave like predicates of x.",
    "concepts": ["One-way laws", "Counter-models"],
    "given": "α and β have x as their only free variable.",
    "steps": [
        {"title": "D", "body": "If every element keeps the promise α ⇒ β and every element satisfies α, every element satisfies β. **Valid.**"},
        {"title": "A", "body": "Converse of D: α = {1}, β = ∅ on {1, 2}: ∀x α is F so the hypothesis is T, but α ⇒ β fails at 1."},
        {"title": "B and C", "body": "B: α everywhere, β nowhere. C: α = {1}, β = ∅ makes ∀x(α ∨ β) false, so the hypothesis is T, while ∀x α is F."},
    ],
    "answer": {"value": "D", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "The converse of the valid law; refuted by α = {1}, β = ∅."),
        opt("B", False, "β may be false everywhere."),
        opt("C", False, "α = {1}, β = ∅: hypothesis vacuously true, conclusion false."),
        opt("D", True, "Modus ponens applied element by element."),
    ],
    "shortcut": "‘∀(α ⇒ β) ⇒ (∀α ⇒ ∀β)’ is the one GATE keeps asking; spot it and stop.",
    "pitfalls": ["Choosing A because it ‘looks symmetric’ with D."],
    "verification": "predlib with α, β as unary predicates: D valid up to size 3; A, B, C have counter-models of size 2.",
}

SOLUTIONS["cse-2003-cs-33"] = {
    "approach": "Concept tested: **a formula valid for a structural reason (Russell's barber)**. Setting y = x makes the inner biconditional Q_xx ⇔ ¬Q_xx, false for every x.",
    "concepts": ["Validity", "Diagonal argument", "Vacuous implication"],
    "given": "α: (∀x)[P_x ⇔ (∀y)[Q_xy ⇔ ¬Q_yy]] ⇒ (∀x)[¬P_x]; I₁: P = prime, Q_xy = ‘y divides x’; I₂: P = composite.",
    "steps": [
        {"title": "The inner formula is false for every x", "body": "For any x, the instance y = x reads Q_xx ⇔ ¬Q_xx, which is false. So (∀y)[Q_xy ⇔ ¬Q_yy] is false for every x."},
        {"title": "Simplify the hypothesis", "body": "(∀x)[P_x ⇔ F] is (∀x)¬P_x. So α reads (∀x)¬P_x ⇒ (∀x)¬P_x: true in every interpretation."},
        {"title": "Apply to I₁ and I₂", "body": "Both satisfy α (in fact the hypothesis is false in both, since 2 is prime and 4 is composite)."},
    ],
    "answer": {"value": "D", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "I₂ satisfies α too: α is valid."),
        opt("B", False, "I₁ satisfies α too."),
        opt("C", False, "α is true in every interpretation."),
        opt("D", True, "α is valid, so every interpretation satisfies it."),
    ],
    "shortcut": "Whenever a formula contains ∀y(Q(x, y) ⇔ ¬Q(y, y)), try y = x first.",
    "pitfalls": ["Evaluating divisibility facts in detail: the meanings never matter."],
    "verification": "predlib: α is valid on all interpretations up to size 3 (P unary, Q binary); in ℕ with ‘y divides x’, every x divides itself, so the diagonal instance fails, as the proof says.",
}

SOLUTIONS["cse-2003-cs-71"] = {
    "approach": "Concept tested: **reading a logic program as a first-order sentence**: a rule is a universally quantified implication; a body-only variable becomes ∃ inside the hypothesis; a headless rule is a negated existential; the program is a conjunction.",
    "concepts": ["Horn clauses", "Pulling ∀ into a hypothesis", "Goal clauses"],
    "given": "A(x) ← B(x, y), C(y);  ← B(x, x).",
    "steps": [
        {"title": "First rule", "body": "∀x∀y((B(x, y) ∧ C(y)) → A(x)) ≡ ∀x(∃y(B(x, y) ∧ C(y)) → A(x)), since y occurs only in the hypothesis."},
        {"title": "Second rule", "body": "A rule with an empty head forbids its body: ¬∃x B(x, x)."},
        {"title": "Combine", "body": "The program is the conjunction of its rules: option A."},
    ],
    "answer": {"value": "A", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "∃y inside the hypothesis, and ∧ between the rules."),
        opt("B", False, "∀y inside the hypothesis demands B(x, y) ∧ C(y) for every y: far too strong a condition for firing the rule."),
        opt("C", False, "∨ between the rules: a program asserts all of its rules."),
        opt("D", False, "As printed it is identical to B (the original paper's D differs in a connective); either way it uses ∀y in the hypothesis."),
    ],
    "shortcut": "Body-only variables are existential; programs are conjunctions.",
    "pitfalls": ["Writing ∀y inside the hypothesis.", "Joining rules with ∨."],
    "verification": "predlib: ∀x∀y((B ∧ C) → A) ≡ ∀x(∃y(B ∧ C) → A) on all worlds up to size 2; A differs from B and C on small worlds. (The bank notes that D is printed identically to B.)",
}

SOLUTIONS["it-2005-cs-36"] = {
    "approach": "Concept tested: **which one-way law is valid**: ∀x(P ⇒ Q) ⇒ (∀x P ⇒ ∀x Q).",
    "concepts": ["One-way laws", "Counter-models"],
    "given": "P(x), Q(x) arbitrary predicates.",
    "steps": [
        {"title": "B is valid", "body": "If each element keeps P ⇒ Q and all are P, all are Q."},
        {"title": "A", "body": f"∀ over ∨: refuted by {TURN}."},
        {"title": "C and D", "body": "C is the converse of B: P = {1}, Q = ∅. D: P = {1}, Q = {2} makes both ∀'s false (so ⇔ is true) while P ⇔ Q fails at 1."},
    ],
    "answer": {"value": "B", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "∀ does not distribute over ∨ in this direction."),
        opt("B", True, "Modus ponens element by element."),
        opt("C", False, "Converse of B; the hypothesis is vacuous when ∀x P fails."),
        opt("D", False, "Both ∀'s can be false while P and Q differ somewhere."),
    ],
    "shortcut": "Same law as GATE 2003 Q32 and IT 2007 Q21.",
    "pitfalls": ["Choosing D: equal truth values of the two ∀'s say nothing element by element."],
    "verification": "predlib: B valid up to size 3; counter-models of size 2 for A, C and D.",
}

SOLUTIONS["it-2006-cs-21"] = {
    "approach": "Concept tested: **valid / satisfiable / unsatisfiable**, and the duality with the negation.",
    "concepts": ["Satisfiable", "Valid", "Negation of a formula"],
    "given": "∀x∀y(R(x, y) ⇒ R(y, x)), ‘R is symmetric’.",
    "steps": [
        {"title": "Satisfiable", "body": "R = ∅ (or any symmetric relation) makes it true."},
        {"title": "Its negation is satisfiable", "body": "R = {(1, 2)} on {1, 2}: R(1, 2) holds but R(2, 1) does not, so the formula is false and its negation true."},
        {"title": "Classify", "body": "Satisfiable, not valid; the negation is satisfiable too: option B."},
    ],
    "answer": {"value": "B", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Not valid: a non-symmetric relation falsifies it."),
        opt("B", True, "Both the formula and its negation have models."),
        opt("C", False, "It is satisfiable (R = ∅)."),
        opt("D", False, "The negation is satisfiable (R = {(1, 2)})."),
    ],
    "shortcut": "Any formula that says ‘R has property X’ for a property some relations have and others lack is contingent.",
    "pitfalls": ["Confusing ‘satisfiable’ with ‘valid’."],
    "verification": "predlib finds a model (R = ∅) and a counter-model ({(0, 1)}) on domains of size ≤ 2.",
}

SOLUTIONS["it-2007-cs-21"] = {
    "approach": "Concept tested: **the valid one-way law and three invalid ones**.",
    "concepts": ["One-way laws", "∀∃ vs ∃∀", "∃ over ∧"],
    "given": "Which is valid?",
    "steps": [
        {"title": "A", "body": "∀x(P ⇒ Q) ⇒ (∀x P ⇒ ∀x Q): valid (modus ponens element by element)."},
        {"title": "B", "body": "∃x(P ∨ Q) ⇒ (∃x P ⇒ ∃x Q): P = {1}, Q = ∅ makes the left T and ∃x P ⇒ ∃x Q = T ⇒ F."},
        {"title": "C and D", "body": f"C claims ∃ distributes over ∧ both ways: {TURN} refutes it. D is ∀∃ ⇒ ∃∀: Lesson 1's grid refutes it."},
    ],
    "answer": {"value": "A", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The valid one-way law."),
        opt("B", False, "P = {1}, Q = ∅ refutes it."),
        opt("C", False, "Only ∃(P ∧ Q) ⇒ ∃P ∧ ∃Q holds; the ≡ fails backwards."),
        opt("D", False, "∀∃ does not imply ∃∀."),
    ],
    "shortcut": "A is the same law as IT 2005 option B.",
    "pitfalls": ["Accepting C because one direction is true."],
    "verification": "predlib: A valid up to size 3; counter-models for B, C, D.",
}

SOLUTIONS["it-2008-it-21"] = {
    "approach": "Concept tested: **moving ∃ out of a hypothesis flips it**: (∃x α(x)) → β ≡ ∀x(α(x) → β) when β has no free x.",
    "concepts": ["Pull-out laws", "Quantifier in a hypothesis"],
    "given": "α(x) has x free; β is a sentence.",
    "steps": [
        {"title": "C", "body": "By the pull-out law, its hypothesis and conclusion are equivalent, so C is ‘A → A’: valid."},
        {"title": "A and B", "body": "With β true and α = {1} on {1, 2}: A's hypothesis β → ∃x α is T but ∀x(β → α) fails at 2; B's hypothesis ∃x(β → α) is T (witness 1) but β → ∀x α is F."},
        {"title": "D", "body": "β false and α = {1}: (∀x α) → β is T (∀x α is F), but α → β fails at x = 1."},
    ],
    "answer": {"value": "C", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Fails with β true, α = {1}."),
        opt("B", False, "Fails with β true, α = {1}."),
        opt("C", True, "Its two sides are equivalent by the pull-out law."),
        opt("D", False, "Would need ∃x in the hypothesis, not ∀x; fails with β false, α = {1}."),
    ],
    "shortcut": "Memorise ∀x(α → β) ≡ ∃x α → β; then C is visibly ‘X → X’.",
    "pitfalls": ["Pulling ∀ out of a hypothesis without flipping it (option D)."],
    "verification": "predlib with α unary and β a 0-ary predicate: C valid up to size 3, the others refuted on size 2.",
}

SOLUTIONS["cse-2013-cs-47"] = {
    "approach": "Concept tested: **pushing ¬ through ∃ and rewriting implications**. Abbreviate P = ∀y α, Q = ∀z β; then ∃y¬α = ¬P and ∃z¬β = ¬Q.",
    "concepts": ["De Morgan for quantifiers", "Implication as disjunction"],
    "given": "Target ¬∃x(∀y α ∧ ∀z β) ≡ ∀x(¬P ∨ ¬Q).",
    "steps": [
        {"title": "Translate the options", "body": "A: ¬Q → P ≡ Q ∨ P. B: Q → ¬P ≡ ¬P ∨ ¬Q. C: P → ¬Q ≡ ¬P ∨ ¬Q. D: ¬P → ¬Q ≡ P ∨ ¬Q (all under ∀x)."},
        {"title": "Compare with the target", "body": "B and C are equivalent to it. A and D are not."},
        {"title": "Key", "body": "The question asks for the one NOT equivalent; as printed both A and D qualify. The published key is D (the bank keeps D)."},
    ],
    "answer": {"value": "D (published key; A is also not equivalent as printed)", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "As printed it is also NOT equivalent (it says ∀x(P ∨ Q)), but the published key is D; the question was flawed in having two such options."),
        opt("B", False, "Equivalent: Q → ¬P is ¬P ∨ ¬Q."),
        opt("C", False, "Equivalent: P → ¬Q is ¬P ∨ ¬Q."),
        opt("D", True, "NOT equivalent: ¬P → ¬Q is P ∨ ¬Q (published key)."),
    ],
    "shortcut": "Reduce every option to a disjunction of ±P, ±Q and compare with ¬P ∨ ¬Q.",
    "pitfalls": ["Forgetting that ∃y¬α is ¬∀y α.", "Missing that two options are non-equivalent; in the exam, mark the published key D."],
    "verification": "With P, Q as 0-ary stand-ins under ∀x, truth tables confirm B ≡ C ≡ target and A, D ≢ target. Recorded in _errata/dm.md (B-notes).",
}

SOLUTIONS["cse-2015-2-cs-55"] = {
    "approach": "Concept tested: **which quantified formula is valid**: replacing P → R by ¬P ∨ R inside the same quantifiers changes nothing.",
    "concepts": ["Equivalence inside quantifiers", "∀∃ vs ∃∀"],
    "given": "Which is a tautology (valid)?",
    "steps": [
        {"title": "C", "body": "P(x, y) → R(x, y) ≡ ¬P(x, y) ∨ R(x, y) for every pair, so the two sides of C agree in every world: valid."},
        {"title": "A and B", "body": "A claims ∀x∃y ⇔ ∃y∀x: the grid world refutes it. B: with R empty the hypothesis is vacuously true while ∀x∃y S fails when S is empty."},
        {"title": "D", "body": "As printed, ∀x∀y P(x, y) → ∀x∀y P(y, x) is also valid (both sides say P holds for every pair). The published key is C."},
    ],
    "answer": {"value": "C (published key; D is also valid as printed)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "∀∃ and ∃∀ are not equivalent."),
        opt("B", False, "R and S empty: hypothesis vacuously true, conclusion false."),
        opt("C", True, "The two sides are identical up to P → R ≡ ¬P ∨ R."),
        opt("D", False, "As printed it is valid too, but the published key is C; the question intended a non-valid D."),
    ],
    "shortcut": "An equivalence between two formulas that differ only by a propositional law inside identical quantifiers is always valid.",
    "pitfalls": ["Marking A because one direction holds."],
    "verification": "predlib: C and D valid up to size 2; A and B refuted. Recorded in _errata/dm.md (B-notes).",
}

SOLUTIONS["cse-2016-2-cs-27"] = {
    "approach": "Concept tested: **∀ does not distribute over ∨**; the other three options are valid laws.",
    "concepts": ["One-way laws", "Counter-models"],
    "given": "Which is NOT valid?",
    "steps": [
        {"title": "A", "body": "(∀x p ⇒ ∀x q) ≡ ¬∀x p ∨ ∀x q ≡ ∃x¬p ∨ ∀x q: the hypothesis equals the conclusion. Valid."},
        {"title": "B and C", "body": "B is (one direction of) ∃ over ∨; C is ∃(p ∧ q) ⇒ ∃p ∧ ∃q. Both valid."},
        {"title": "D", "body": f"∀x(p ∨ q) ⇒ ∀x p ∨ ∀x q fails in {TURN}."},
    ],
    "answer": {"value": "D", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Valid: hypothesis and conclusion are the same formula after rewriting →."),
        opt("B", False, "Valid: ∃ distributes over ∨."),
        opt("C", False, "Valid: the witness of p ∧ q serves both."),
        opt("D", True, "NOT valid: the turn-taking world."),
    ],
    "shortcut": "Look for ∀ over ∨ (or ∃ over ∧) in the forward direction: that is the NOT-valid one.",
    "pitfalls": ["Being thrown by A's unusual form."],
    "verification": "predlib: A, B, C valid up to size 3; D refuted on size 2.",
}

SOLUTIONS["cse-2017-1-cs-2"] = {
    "approach": "Concept tested: **logical implication between quantified sentences**: F = ∀x∃y R implies ∃y∃x R (non-empty domain) and ¬∃x∀y¬R (the same as F), but neither ∃y∀x R nor ∀y∃x R.",
    "concepts": ["Logical implication", "De Morgan", "∀∃ vs ∃∀"],
    "given": "F: ∀x(∃y R(x, y)), non-empty domains.",
    "steps": [
        {"title": "I", "body": "Take any element d and its witness y: R(d, y). So ∃y∃x R(x, y). Implied."},
        {"title": "IV", "body": "¬∃x∀y¬R ≡ ∀x∃y R = F. Implied."},
        {"title": "II and III", "body": "II: {1, 2} with R = {(1, 2), (2, 1)}: F true, no full column. III: R = {(1, 1), (2, 1)}: F true, column 2 empty."},
    ],
    "answer": {"value": "B (I and IV only)", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "I is implied too."),
        opt("B", True, "I and IV are implied; II and III are not."),
        opt("C", False, "II (∃∀) does not follow from ∀∃."),
        opt("D", False, "Neither II nor III follows."),
    ],
    "shortcut": "IV is F in disguise; I needs only one element. Rows vs columns rule out II and III.",
    "pitfalls": ["Thinking ∀x∃y gives ∀y∃x (rows vs columns)."],
    "verification": "predlib checks F → I and F → IV valid up to size 3 and finds counter-models for II and III.",
}

SOLUTIONS["cse-2018-cs-28"] = {
    "approach": "Concept tested: **the small-model property of ∃*∀* sentences without function symbols**: keep only the witnesses.",
    "concepts": ["Prenex prefix", "Substructures", "Small models"],
    "given": "φ = ∃s∃t∃u∀v∀w∀x∀y ψ, ψ quantifier-free with predicates and equality only; φ has a 7-element model.",
    "steps": [
        {"title": "Restrict to the witnesses", "body": "Let a, b, c witness s, t, u. The world with domain {a, b, c} (≤ 3 elements) and the predicates restricted keeps the witnesses, and each ∀-instance there has the same value as in the big model."},
        {"title": "So A holds", "body": "There is a model of size ≤ 3."},
        {"title": "B, C, D can fail", "body": "With ψ = (v = v), every non-empty world is a model: of size 1, 7 or 100."},
    ],
    "answer": {"value": "A", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The witnesses alone form a model."),
        opt("B", False, "Contradicted by the restriction argument."),
        opt("C", False, "ψ = (v = v) has models of every size."),
        opt("D", False, "Same counterexample: models of every size."),
    ],
    "shortcut": "Number of leading ∃'s (here 3) bounds the size of some model.",
    "pitfalls": ["Thinking the model size is fixed by the sentence."],
    "verification": "predlib: an ∃³∀ sentence true on a 7-element world stays true on the 3 witnesses (scene small-model); the general argument is in the lesson.",
}

SOLUTIONS["cse-2020-cs-39"] = {
    "approach": "Concept tested: **moving a quantifier past a formula W without x**: unchanged through ∨, ∧ and conclusions; flipped when leaving a hypothesis.",
    "concepts": ["Pull-out laws", "Implication as disjunction"],
    "given": "W has no free x.",
    "steps": [
        {"title": "Valid ones", "body": "A: ∀ past ∨. B: ∃ past ∧. D: ∃x(p → W) ≡ ∃x(¬p ∨ W) ≡ ∃x¬p ∨ W ≡ ¬∀x p ∨ W ≡ ∀x p → W."},
        {"title": "C", "body": "∀x(p → W) ≡ ∀x¬p ∨ W ≡ ¬∃x p ∨ W ≡ ∃x p → W, not ∀x p → W."},
        {"title": "Counter-model for C", "body": "{1, 2}, p = {1}, W false: ∀x(p → W) is F (at 1), ∀x p → W is T."},
    ],
    "answer": {"value": "C", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Valid: ∀ slides past ∨ when W has no x."),
        opt("B", False, "Valid: ∃ slides past ∧ (non-empty domain)."),
        opt("C", True, "NOT valid: the right side should be ∃x p(x) → W."),
        opt("D", False, "Valid: the hidden ¬ flips ∃ to ∀."),
    ],
    "shortcut": "A quantifier that leaves a hypothesis flips. C does not flip.",
    "pitfalls": ["Assuming quantifiers always slide past W unchanged."],
    "verification": "predlib with W a 0-ary predicate: A, B, D valid up to size 3; C refuted on size 2.",
}

SOLUTIONS["cse-2025-2-cs-5"] = {
    "approach": "Concept tested: **mathematical induction as a first-order statement over ℕ**: start at 0 and step +1.",
    "concepts": ["Induction schema", "Counterexample predicates"],
    "given": "P an arbitrary predicate on ℕ.",
    "steps": [
        {"title": "A", "body": "P(0) and P(x) ⇒ P(x + 1): every n is reached from 0 in n steps, so ∀x P(x). True for every P."},
        {"title": "B, C, D fail", "body": "B: P = {0}. C: P = {0, …, 1000}. D: P = {1000, 1001, …}. Each meets its hypothesis but not ∀x P(x)."},
    ],
    "answer": {"value": "A", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The induction principle."),
        opt("B", False, "P = {0}: downward steps from 0 reach nothing new."),
        opt("C", False, "P = {0, …, 1000}: nothing forces P(1001)."),
        opt("D", False, "P = {1000, 1001, …}: nothing forces P(0)."),
    ],
    "shortcut": "Ask which variant reaches every natural number from its start: only ‘from 0, upwards’.",
    "pitfalls": ["Accepting C because it ‘covers’ 0."],
    "verification": "For each of B, C, D, the stated P is checked on 0..3000: it meets the hypothesis and fails ∀x P(x); A is checked on every P ⊆ {0..8} over the domain {0..8} with x + 1 capped.",
}
