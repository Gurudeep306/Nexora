"""Teacher-style v2 solutions for the PYQs of dm/02-predicate-logic/01-predicates-quantifiers. Every key
is re-derived by model search (predlib) in l2_01_quantifiers.py."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from dmlib import opt  # noqa: E402

SOLUTIONS = {}


def world(title, cols, rows, hl=None, caption=None):
    f = {"kind": "table", "title": title, "cols": cols, "rows": rows, "mono": True}
    if hl:
        f["hl"] = [{"r": r, "c": c, "tone": t} for r, c, t in hl]
    if caption:
        f["caption"] = caption
    return f


SOLUTIONS["cse-2004-cs-23"] = {
    "approach": "Concept tested: **translating nested quantifiers with the →/∧ pairing at every level**. 'Some boy' is ∃ with ∧; 'all the girls' is ∀ with →.",
    "concepts": ["Existential with ∧", "Universal with →", "Nested quantifiers"],
    "given": "'Some boys in the class are taller than all the girls'; taller(x, y): x is taller than y.",
    "steps": [
        {"title": "Outer phrase", "body": "'Some boy x such that …': $\\exists x\\, (\\text{boy}(x) \\wedge \\dots)$."},
        {"title": "Inner phrase", "body": "'x is taller than every girl': $\\forall y\\, (\\text{girl}(y) \\to \\text{taller}(x, y))$."},
        {"title": "Assemble", "body": "$(\\exists x)(\\text{boy}(x) \\wedge (\\forall y)(\\text{girl}(y) \\to \\text{taller}(x, y)))$: option D."},
    ],
    "answer": {"value": "D", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Outer → makes it true whenever the class contains a non-boy, and the inner ∧ claims everyone is a girl."),
        opt("B", False, "Inner $\\forall y\\, (\\text{girl}(y) \\wedge \\dots)$ claims every person in the domain is a girl; it fails as soon as one boy exists."),
        opt("C", False, "Outer $\\exists x\\, (\\text{boy}(x) \\to \\dots)$ is witnessed by any girl (false hypothesis), so it says almost nothing."),
        opt("D", True, "∃ with ∧ outside, ∀ with → inside, exactly the sentence."),
    ],
    "shortcut": "Check the two connectives: the outer one after ∃ must be ∧, the inner one after ∀ must be →. Only D has both.",
    "pitfalls": ["Applying the pairing rule only to the outermost quantifier.", "Reading 'some' as →."],
    "verification": "Model search over all interpretations on domains of size ≤ 3: A, B and C each have a world where they disagree with D, e.g. a domain with one girl and no boy makes A and C true but D false.",
    "animation": world("A world: one boy b taller than the only girl g", ["formula", "value"], [["A", "T"], ["B", "F"], ["C", "T"], ["D", "T"]],
                       hl=[(1, 1, "error"), (3, 1, "success")], caption="B fails because the boy is not a girl; the intended sentence is D."),
}

SOLUTIONS["it-2004-it-3"] = {
    "approach": "Concept tested: **negating a nested quantified formula (De Morgan for quantifiers)**. Negate each candidate with ¬ outside and compare with the target.",
    "concepts": ["¬∀ = ∃¬", "¬(A → B) = A ∧ ¬B"],
    "given": "Target: $(\\exists x)(\\forall y)[(a \\wedge b) \\wedge \\neg c]$, with $a, b, c$ short for $a(x, y)$ etc.",
    "steps": [
        {"title": "Write the target as a negation", "body": "$(a \\wedge b) \\wedge \\neg c \\equiv \\neg((a \\wedge b) \\to c)$, so the target is $\\exists x\\, \\forall y\\, \\neg((a \\wedge b) \\to c)$."},
        {"title": "Pull ¬ out through the quantifiers", "body": "$\\exists x\\, \\forall y\\, \\neg\\psi \\equiv \\exists x\\, \\neg\\exists y\\, \\psi \\equiv \\neg\\forall x\\, \\exists y\\, \\psi$ with $\\psi = (a \\wedge b) \\to c$."},
        {"title": "Match", "body": "$\\neg[(\\forall x)(\\exists y)((a \\wedge b) \\to c)]$ is option C."},
    ],
    "answer": {"value": "C", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "No outer negation: it is the negation of a different formula (with ∨) and has the opposite quantifiers."),
        opt("B", False, "Replaces $a \\wedge b$ by $a \\vee b$: true when only $a$ holds, so it is weaker."),
        opt("C", True, "Pushing the ¬ in gives $\\exists x\\, \\forall y\\, ((a \\wedge b) \\wedge \\neg c)$, the target."),
        opt("D", False, "Same as C but with $a \\vee b$: its negation is $\\exists x\\, \\forall y\\, ((a \\vee b) \\wedge \\neg c)$, weaker than the target."),
    ],
    "shortcut": "Negate each candidate inward and compare literally: C turns into the target, D into the ∨ version.",
    "pitfalls": ["Confusing $a \\wedge b$ with $a \\vee b$ while negating.", "Forgetting that the quantifier order is kept when the ¬ moves."],
    "verification": "predlib: C is equivalent to the target on every interpretation over domains up to size 2 (a, b, c binary); A, B, D each have a counter-world.",
}

SOLUTIONS["cse-2005-cs-41"] = {
    "approach": "Concept tested: **translation with nested quantifiers and the order ∀∃**. 'Every teacher' is ∀ with →; 'some student' is ∃ with ∧ and may depend on the teacher.",
    "concepts": ["Universal with →", "Existential with ∧", "Quantifier order"],
    "given": "'Every teacher is liked by some student.'",
    "steps": [
        {"title": "Outer", "body": "$\\forall x\\, [\\text{teacher}(x) \\to \\dots]$."},
        {"title": "Inner", "body": "'some student likes x': $\\exists y\\, [\\text{student}(y) \\wedge \\text{likes}(y, x)]$; the student may differ from teacher to teacher."},
        {"title": "Assemble", "body": "$\\forall x\\, [\\text{teacher}(x) \\to \\exists y\\, [\\text{student}(y) \\wedge \\text{likes}(y, x)]]$: option B."},
    ],
    "answer": {"value": "B", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Inner ∃ with →: any non-student y makes it true, so it says nothing about students."),
        opt("B", True, "→ under ∀, ∧ under ∃, and the student chosen after the teacher."),
        opt("C", False, "∃y∀x puts one student first, who likes every teacher: a stronger claim (and it even needs that y to be a student when there are no teachers)."),
        opt("D", False, "Outer ∧ claims everything is a teacher."),
    ],
    "shortcut": "Order first: the English lets the student depend on the teacher, so ∀x must come before ∃y; that rules out C. Then the pairing rule leaves B.",
    "pitfalls": ["Moving ∃y to the front.", "Pairing the inner ∃ with →."],
    "verification": "Model search: B differs from A, C and D on worlds of size ≤ 3 (e.g. two teachers each liked by a different student: B true, C false).",
}

SOLUTIONS["cse-2006-cs-26"] = {
    "approach": "Concept tested: **two kinds of subject joined by 'and', and an 'if' condition**. 'Tigers and lions' covers anything that is a tiger or a lion; 'attack if hungry or threatened' is (hungry ∨ threatened) → attacks.",
    "concepts": ["Subjects joined by 'and' become ∨", "Implication inside a universal"],
    "given": "'Tigers and lions attack if they are hungry or threatened.'",
    "steps": [
        {"title": "Who is promised about", "body": "Every tiger and every lion: $(T \\to \\dots) \\wedge (L \\to \\dots) \\equiv (T \\vee L) \\to \\dots$."},
        {"title": "What is promised", "body": "'attack if hungry or threatened': $(H \\vee R) \\to K$."},
        {"title": "Assemble", "body": "$\\forall x\\, [(T(x) \\vee L(x)) \\to \\{(H(x) \\vee R(x)) \\to K(x)\\}]$: option D."},
    ],
    "answer": {"value": "D", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\text{tiger} \\wedge \\text{lion}$ restricts the promise to creatures that are both, so nothing is promised about any real tiger or lion."),
        opt("B", False, "Inner ∧ claims every tiger and lion is hungry or threatened and attacks."),
        opt("C", False, "Reverses the inner implication: 'if they attack then they are hungry', plus a stray ∨ threatened."),
        opt("D", True, "Hypothesis T ∨ L, conclusion (H ∨ R) → K."),
    ],
    "shortcut": "Two plural subjects joined by 'and' are almost always ∨ in the hypothesis; then pick the option with the condition as the inner hypothesis.",
    "pitfalls": ["Writing tiger ∧ lion.", "Swapping the inner hypothesis and conclusion."],
    "verification": "$(T \\to C) \\wedge (L \\to C) \\equiv (T \\vee L) \\to C$ is checked by truth table; options A–C differ from D on small worlds.",
}

SOLUTIONS["cse-2007-cs-22"] = {
    "approach": "Concept tested: **'not every' and the negation of a universal**. 'Not every graph is connected' = $\\neg\\forall x\\, (G \\to C) \\equiv \\exists x\\, (G \\wedge \\neg C)$; find the option that does NOT say this.",
    "concepts": ["¬∀ = ∃¬", "Not all A are B"],
    "given": "Which option does NOT represent 'Not every graph is connected'?",
    "steps": [
        {"title": "Correct forms", "body": "A: $\\neg\\forall x\\, (G \\Rightarrow C)$ directly. B: push the ¬ in: $\\exists x\\, (G \\wedge \\neg C)$. C: $G \\Rightarrow C \\equiv \\neg G \\vee C$, so C is A rewritten."},
        {"title": "The odd one out", "body": "D: $\\forall x\\, (G \\Rightarrow \\neg C)$ says **no** graph is connected, a much stronger claim."},
    ],
    "answer": {"value": "D", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "It does represent the statement: the literal negation of 'every graph is connected'."),
        opt("B", False, "It does represent the statement: the negation pushed inward, 'some graph is not connected'."),
        opt("C", False, "It does represent the statement: A with $G \\Rightarrow C$ written as $\\neg G \\vee C$."),
        opt("D", True, "Does NOT represent it: keeps ∀ and negates only the conclusion, i.e. 'no graph is connected'."),
    ],
    "shortcut": "'Not every' must end up as an ∃ after pushing ¬ in; D is the only option that stays universal.",
    "pitfalls": ["Answering the positive question (which DOES represent) instead of the negative one.", "Half-pushing the negation."],
    "verification": "World with two graphs, one connected and one not: A, B, C true, D false.",
}

SOLUTIONS["cse-2008-cs-30"] = {
    "approach": "Concept tested: **'each A has a B' = ∀x (A(x) → ∃y (B(y) ∧ R(x, y)))**, and recognising the distractors that claim everything is an FSA.",
    "concepts": ["Universal with →", "Existential with ∧", "Scope of a quantifier"],
    "given": "'Each finite state automaton has an equivalent pushdown automaton.'",
    "steps": [
        {"title": "The intended formula", "body": "$\\forall x\\, (\\text{fsa}(x) \\Rightarrow \\exists y\\, (\\text{pda}(y) \\wedge \\text{equivalent}(x, y)))$."},
        {"title": "Option A", "body": "Printed as $(\\forall x\\, \\text{fsa}(x)) \\Rightarrow (\\exists y\\, \\text{pda}(y) \\wedge \\text{equivalent}(x, y))$; read with ∀x covering the whole implication (as the examiners intended) it is exactly the formula above. Strictly, the bracket closes early and leaves x free in the consequent."},
        {"title": "C and D", "body": "$\\forall x\\, \\exists y\\, (\\text{fsa}(x) \\wedge \\dots)$ requires every x in the domain to be an FSA; D also swaps the roles of x and y. B negates the whole statement."},
    ],
    "answer": {"value": "A (official key; read ∀x as covering the implication)", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "With ∀x scoping over the implication, it is 'every FSA has an equivalent PDA'."),
        opt("B", False, "Begins with a negation $\\sim\\forall y$: it denies something, so it cannot express the positive sentence."),
        opt("C", False, "∧ under ∀x claims every object is an FSA; false in any domain that also contains a PDA that is not an FSA."),
        opt("D", False, "Claims every x is a PDA with some FSA y equivalent to it, the roles reversed, and with the same ∧ problem."),
    ],
    "shortcut": "Eliminate by the pairing rule: C and D put ∧ under the universal, B starts with a negation. Only A has the → structure.",
    "pitfalls": ["Choosing C because it 'mentions everything' with ∀∃.", "Getting stuck on the printed bracket of A; GATE intended the full scope."],
    "verification": "With the intended scope, A agrees with the reference formula on every interpretation up to size 3; C and D have counter-worlds (a domain with one FSA and one PDA). The printed scope issue is noted in the question bank.",
}

SOLUTIONS["it-2008-it-22"] = {
    "approach": "Concept tested: **pushing ¬ through a long nested formula**: each quantifier flips, the order stays, each → becomes ∧ with its right side negated.",
    "concepts": ["¬∀ = ∃¬", "¬∃ = ∀¬", "¬(A → B) = A ∧ ¬B"],
    "given": "Negate $\\forall x\\, [\\alpha \\to (\\exists y\\, [\\beta \\to (\\forall u\\, \\exists v\\, \\gamma)])]$.",
    "steps": [
        {"title": "Outer ∀x", "body": "$\\exists x\\, \\neg[\\alpha \\to (\\dots)] \\equiv \\exists x\\, [\\alpha \\wedge \\neg\\exists y\\, [\\dots]]$."},
        {"title": "∃y", "body": "$\\neg\\exists y\\, [\\beta \\to \\dots] \\equiv \\forall y\\, [\\beta \\wedge \\neg\\forall u\\, \\exists v\\, \\gamma]$."},
        {"title": "∀u∃v", "body": "$\\neg\\forall u\\, \\exists v\\, \\gamma \\equiv \\exists u\\, \\forall v\\, \\neg\\gamma$."},
        {"title": "Assemble", "body": "$\\exists x\\, [\\alpha \\wedge (\\forall y\\, [\\beta \\wedge (\\exists u\\, \\forall v\\, \\neg\\gamma)])]$: option D."},
    ],
    "answer": {"value": "D", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Flips the quantifiers but keeps both arrows and never negates γ."),
        opt("B", False, "Negates γ but keeps the arrows; ¬(A → B) is A ∧ ¬B, not A → ¬B."),
        opt("C", False, "Keeps the quantifiers and negates the parts: that is not a negation at all."),
        opt("D", True, "Every quantifier flipped, both arrows became ∧, γ negated once."),
    ],
    "shortcut": "A correct negation of an implication chain has no arrows left: only D.",
    "pitfalls": ["Keeping → after negating.", "Negating α and β as well as γ."],
    "verification": "With α(x), β(y), γ(u, v) as predicates, predlib confirms D ≡ ¬(original) on all interpretations over domains of size ≤ 2, and finds counter-worlds for A, B, C.",
}

SOLUTIONS["cse-2009-cs-23"] = {
    "approach": "Concept tested: **two kinds of subject → ∨ in the hypothesis of a universal**.",
    "concepts": ["Subjects joined by 'and' become ∨", "Universal with →"],
    "given": "'Gold and silver ornaments are precious.'",
    "steps": [
        {"title": "Split the sentence", "body": "Every gold ornament is precious, and every silver ornament is precious: $\\forall x\\, (G \\to P) \\wedge \\forall x\\, (S \\to P)$."},
        {"title": "Combine", "body": "$\\equiv \\forall x\\, ((G(x) \\vee S(x)) \\to P(x))$: option D."},
    ],
    "answer": {"value": "D", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Reverses the arrow: every precious thing is gold and silver."),
        opt("B", False, "$G \\wedge S$ covers only ornaments that are both gold and silver; a pure gold ornament is not promised to be precious."),
        opt("C", False, "∃ with →: true as soon as one object is not both gold and silver."),
        opt("D", True, "Covers every gold ornament and every silver ornament."),
    ],
    "shortcut": "'A and B are C' as a general statement is always $(A \\vee B) \\to C$.",
    "pitfalls": ["Translating the English 'and' between the subjects as ∧."],
    "verification": "World with one gold-only ornament that is not precious: B is true there, but the sentence (and D) is false.",
}

SOLUTIONS["cse-2009-cs-26"] = {
    "approach": "Concept tested: **De Morgan for quantifiers**: rewrite every formula with ¬ pushed in, then compare.",
    "concepts": ["¬∀ = ∃¬", "¬∃ = ∀¬"],
    "given": "I $\\neg\\forall x\\, P(x)$, II $\\neg\\exists x\\, P(x)$, III $\\neg\\exists x\\, \\neg P(x)$, IV $\\exists x\\, \\neg P(x)$.",
    "steps": [
        {"title": "Normal forms", "body": "I ≡ $\\exists x\\, \\neg P(x)$; II ≡ $\\forall x\\, \\neg P(x)$; III ≡ $\\forall x\\, P(x)$; IV = $\\exists x\\, \\neg P(x)$."},
        {"title": "Compare", "body": "I and IV are the same formula; no other pair matches."},
    ],
    "answer": {"value": "B (I and IV)", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "I says 'something is not P'; III says 'everything is P', its opposite."),
        opt("B", True, "Both say 'something is not P'."),
        opt("C", False, "II says 'nothing is P'; III says 'everything is P'."),
        opt("D", False, "II is 'nothing is P' and IV is 'something is not P': on a domain where P holds for one element and not another, II is F and IV is T."),
    ],
    "shortcut": "Move every ¬ to the inside; formulas that become identical are equivalent.",
    "pitfalls": ["Thinking ¬∃ and ∃¬ are the same."],
    "verification": "predlib: I ≡ IV on all interpretations up to size 3; the other pairs have counter-worlds.",
}

SOLUTIONS["cse-2010-cs-30"] = {
    "approach": "Concept tested: **reading a negated nested formula back into English** by pulling the ¬ out of the inner existentials.",
    "concepts": ["∃¬ = ¬∀", "Nested quantifiers"],
    "given": "$\\forall x\\, \\exists y\\, \\exists t\\, (\\neg F(x, y, t))$, F(x, y, t): x can fool y at time t.",
    "steps": [
        {"title": "Pull ¬ out", "body": "$\\exists y\\, \\exists t\\, \\neg F \\equiv \\neg\\forall y\\, \\forall t\\, F$: 'x cannot fool every person at every time'."},
        {"title": "Outer ∀x", "body": "For every person x, x cannot fool everyone all the time: 'No one can fool everyone all the time'."},
    ],
    "answer": {"value": "B", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Drops the negation: that is $\\forall x\\, \\exists y\\, \\exists t\\, F$."),
        opt("B", True, "Exactly $\\forall x\\, \\neg\\forall y\\, \\forall t\\, F$."),
        opt("C", False, "'Everyone cannot fool some person all the time' reads as $\\forall x\\, \\exists y\\, \\forall t\\, \\neg F$ (or is ambiguous); the formula has ∃t, not ∀t."),
        opt("D", False, "'No one can fool some person at some time' is $\\forall x\\, \\neg\\exists y\\, \\exists t\\, F = \\forall x\\, \\forall y\\, \\forall t\\, \\neg F$, far stronger."),
    ],
    "shortcut": "∃…∃¬ is ¬∀…∀: 'not everyone, not every time'.",
    "pitfalls": ["Losing the negation.", "Turning ∃t into 'all the time'."],
    "verification": "The equivalence $\\exists y \\exists t \\neg F \\equiv \\neg \\forall y \\forall t F$ is checked by predlib on all small interpretations.",
}

SOLUTIONS["cse-2011-cs-30"] = {
    "approach": "Concept tested: **reading a number-theory predicate**: $\\exists z\\, (x = y \\cdot z)$ is 'y divides x'; test on 1, a prime and a composite.",
    "concepts": ["Divisibility in logic", "Prime"],
    "given": "$P(x) = \\neg(x = 1) \\wedge \\forall y\\, (\\exists z\\, (x = y * z) \\Rightarrow (y = x) \\vee (y = 1))$ over positive integers.",
    "steps": [
        {"title": "Translate", "body": "$x \\ne 1$, and every divisor $y$ of $x$ is $x$ or 1: the definition of a prime."},
        {"title": "Test", "body": "$P(1)$ = F; $P(7)$ = T; $P(6)$ = F (divisor 2)."},
    ],
    "answer": {"value": "A", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Exactly the definition of a prime."),
        opt("B", False, "$P(6)$ is false although 6 ≠ 1."),
        opt("C", False, "$P(1)$ and $P(6)$ are false."),
        opt("D", False, "A number with exactly two factors other than 1 and itself (like 6) makes P false."),
    ],
    "shortcut": "Test x = 1, 6, 7: only 'prime' gives F, F, T.",
    "pitfalls": ["Missing that $\\neg(x = 1)$ excludes 1."],
    "verification": "Brute force over x = 1..200 (y, z up to x): P(x) is true exactly for the primes.",
}

SOLUTIONS["cse-2012-cs-13"] = {
    "approach": "Concept tested: **'some A are B' = ∃x (A(x) ∧ B(x))**.",
    "concepts": ["Existential with ∧"],
    "given": "'Some real numbers are rational.'",
    "steps": [
        {"title": "Form", "body": "Some-statement: an object that is real and rational, $\\exists x\\, (\\text{real}(x) \\wedge \\text{rational}(x))$."},
        {"title": "Check", "body": "It is option C; the others use ∨, ∀ or →."},
    ],
    "answer": {"value": "C", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "∨ is satisfied by anything real or anything rational, e.g. $\\sqrt 2$ alone."),
        opt("B", False, "That is 'every real number is rational', false and not what is said."),
        opt("C", True, "One object with both properties."),
        opt("D", False, "∃ with → is witnessed by any non-rational object."),
    ],
    "shortcut": "∃ with ∧; reject every option with → under ∃.",
    "pitfalls": ["Choosing D because 'rational numbers are real' is true."],
    "verification": "Domain {π, 1/2, a matrix}: C true; on {π, a matrix}, C false but A and D true.",
}

SOLUTIONS["cse-2013-cs-27"] = {
    "approach": "Concept tested: **'none of the A are B' = ¬∃x (A(x) ∧ B(x)) = ∀x (A(x) → ¬B(x))**.",
    "concepts": ["No A is B", "¬∃ = ∀¬"],
    "given": "'None of my friends are perfect.' F(x): friend, P(x): perfect.",
    "steps": [
        {"title": "Form", "body": "There is no friend who is perfect: $\\neg\\exists x\\, (F(x) \\wedge P(x))$."},
        {"title": "Match", "body": "Option D is exactly this formula."},
    ],
    "answer": {"value": "D", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "'Some friend is not perfect': allows another friend to be perfect."),
        opt("B", False, "'Some non-friend is perfect': says nothing about friends."),
        opt("C", False, "'Some non-friend is not perfect': irrelevant to the friends."),
        opt("D", True, "No object is both a friend and perfect."),
    ],
    "shortcut": "'None' = ¬∃ over the conjunction.",
    "pitfalls": ["Reading 'none of my friends are perfect' as 'some friend is not perfect'."],
    "verification": "World with two friends, one perfect: A true, D false; the sentence is false there.",
}

SOLUTIONS["cse-2014-1-cs-1"] = {
    "approach": "Concept tested: **'not all A are B' = ∃x (A(x) ∧ ¬B(x))**.",
    "concepts": ["Not all A are B", "¬∀ = ∃¬"],
    "given": "'Not all that glitters is gold.'",
    "steps": [
        {"title": "Negate the universal", "body": "$\\neg\\forall x\\, (\\text{glitters} \\to \\text{gold}) \\equiv \\exists x\\, (\\text{glitters}(x) \\wedge \\neg\\text{gold}(x))$."},
        {"title": "Match", "body": "Option D."},
    ],
    "answer": {"value": "D", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "'Nothing that glitters is gold': far stronger than 'not all'."),
        opt("B", False, "'All gold glitters': a different statement."),
        opt("C", False, "'Some gold does not glitter': the roles of the predicates are swapped."),
        opt("D", True, "Something glitters and is not gold."),
    ],
    "shortcut": "'Not all A are B' → ∃ with A ∧ ¬B, with A the noun after 'all'.",
    "pitfalls": ["Choosing A (the half-pushed negation)."],
    "verification": "World with a glittering gold coin and a glittering brass button: D true, A false; the proverb is true there.",
}

SOLUTIONS["cse-2014-3-cs-53"] = {
    "approach": "Concept tested: **'not all A are B' = ∃d (A(d) ∧ ¬B(d))**, against ∀-with-∧ and ∃-with-→ distractors.",
    "concepts": ["Not all A are B", "Pairing rule"],
    "given": "'Not all rainy days are cold.'",
    "steps": [
        {"title": "Negate 'all rainy days are cold'", "body": "$\\neg\\forall d\\, (R(d) \\to C(d)) \\equiv \\exists d\\, (R(d) \\wedge \\neg C(d))$."},
        {"title": "Match", "body": "Option D (with ∼ for ¬)."},
    ],
    "answer": {"value": "D", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "∀ with ∧: every day is rainy and not cold."),
        opt("B", False, "'Every non-rainy day is cold': unrelated."),
        opt("C", False, "∃ with →: true as soon as one day is rainy (false hypothesis ¬R) or cold."),
        opt("D", True, "Some day is rainy and not cold."),
    ],
    "shortcut": "Same pattern as 'not all that glitters is gold' (paper 1 of the same year).",
    "pitfalls": ["Choosing A because it 'contains rainy and not cold'."],
    "verification": "World with a cold rainy day and a warm rainy day: D true; A false (the cold day).",
}

SOLUTIONS["cse-2019-cs-35"] = {
    "approach": "Concept tested: **reading a number-theory sentence and checking it on different domains**. φ says: every 'prime' x (all its divisors are x or 1) has a larger 'prime' w: there is no largest prime.",
    "concepts": ["Prime in logic", "Truth depends on the domain", "Euclid's theorem"],
    "given": "φ = ∀x [(∀z z|x ⇒ (z = x ∨ z = 1)) ⇒ ∃w (w > x) ∧ (∀z z|w ⇒ (w = z ∨ z = 1))], on S1 = {1..100}, S2 = positive integers, S3 = all integers.",
    "steps": [
        {"title": "S1 fails", "body": "x = 97 satisfies the hypothesis (its divisors in S1 are 1 and 97), but 98, 99, 100 are not prime, so no w exists. φ is false on S1."},
        {"title": "S2 holds", "body": "For any x, a prime factor of x! + 1 is larger than x (Euclid). So every x has a larger prime: φ is true on S2."},
        {"title": "S3, as intended", "body": "The examiners intend the same reading on the integers: primes still have no largest member, so φ is taken to hold on S3 as well. (Strictly, with negative divisors, −1 divides every number, and x = −1 is the only x meeting the hypothesis; then no w > −1 has only the divisors w and 1, since −1 divides it. See the note.)"},
        {"title": "Answer", "body": "S2 and S3: option C (official key)."},
    ],
    "answer": {"value": "C (official key)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "S1 is finite and fails at x = 97."),
        opt("B", False, "S1 fails."),
        opt("C", True, "The official key: S2 (and S3 under the intended reading) satisfy 'there is no largest prime'."),
        opt("D", False, "S1 fails."),
    ],
    "shortcut": "φ = 'there is no largest prime'. Any finite domain fails (its largest prime-like element); infinite domains of positive numbers pass.",
    "pitfalls": ["Thinking 97 has a larger prime 101 in S1: w must come from the domain.", "Forgetting x = 1 also meets the hypothesis on S1 (only divisor 1), harmless here."],
    "verification": "Brute force on S1 finds x = 97 as the failing element; on S2 a larger prime exists for every x checked up to 10,000. Note: read literally on S3 (with negative divisors), x = −1 makes φ false and no option would be right; the official key C treats S3 like S2. Recorded in _errata/dm.md.",
}

SOLUTIONS["cse-2023-cs-16"] = {
    "approach": "Concept tested: **which statements imply a ∀∃ statement**: ∃∀ implies ∀∃, a universal fact about Q implies it, and statements about one x do not.",
    "concepts": ["∃∀ ⇒ ∀∃", "Existential statements are weak"],
    "given": "Conjecture: $\\forall x\\, (P(x) \\Rightarrow \\exists y\\, Q(x, y))$.",
    "steps": [
        {"title": "B", "body": "If $Q(x, y)$ holds for all pairs, every x has a witness y. B implies the conjecture."},
        {"title": "C", "body": "Let $y_0$ witness C. For any x with P(x), $Q(x, y_0)$ holds. C implies the conjecture."},
        {"title": "A and D", "body": "Both speak about one x. World {0, 1}: P true on both, Q(0, ·) true, Q(1, ·) false. A and D hold, the conjecture fails at x = 1."},
    ],
    "answer": {"value": "B and C", "choice": ["B", "C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Only one x is shown to have its witnesses; another x with P may have none."),
        opt("B", True, "Every pair satisfies Q, so every x has a witness."),
        opt("C", True, "∃y∀x (P → Q) gives one y that works for every x with P: stronger than the conjecture."),
        opt("D", False, "Again about a single x."),
    ],
    "shortcut": "To imply a ∀ statement you need a ∀ (or an ∃∀ that contains it); options that begin with ∃x and say nothing more cannot.",
    "pitfalls": ["Thinking a single example (A, D) proves a universal claim."],
    "verification": "predlib: B → conjecture and C → conjecture are valid on all interpretations up to size 3; A and D have counter-models.",
}

SOLUTIONS["cse-2025-1-cs-38"] = {
    "approach": "Concept tested: **'exactly one' with equality**: one witness, plus a guard that every other element fails.",
    "concepts": ["Unique existence", "Equality in formulas"],
    "given": "'Everyone has exactly one mother'; mother(y, x), noteq(x, y).",
    "steps": [
        {"title": "Pattern", "body": "For every x: some y is x's mother, and no z other than y is x's mother."},
        {"title": "B", "body": "$\\forall z\\, (\\text{noteq}(z, y) \\to \\neg\\text{mother}(z, x))$ is the guard: exactly one."},
        {"title": "D", "body": "$\\neg\\exists z\\, (\\text{noteq}(z, y) \\wedge \\text{mother}(z, x))$ is the same guard written with ¬∃."},
        {"title": "A and C", "body": "A only says someone is and someone is not x's mother. C is trivially true (take z = y)."},
    ],
    "answer": {"value": "B and D", "choice": ["B", "D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "No uniqueness guard: allows two mothers."),
        opt("B", True, "Witness plus a ∀ guard: exactly one."),
        opt("C", False, "If y is a mother of x, z = y satisfies the inner part, so C is always true; it allows zero or many mothers."),
        opt("D", True, "Witness plus a ¬∃ guard, equivalent to B."),
    ],
    "shortcut": "Look for 'mother(y, x) ∧ (no other z)': both B and D have it.",
    "pitfalls": ["Picking only one of B and D: the guards are equivalent by ¬∃ = ∀¬.", "Accepting C because it 'mentions' equality."],
    "verification": "With noteq read as ≠, predlib finds B ≡ D ≡ the reference ∃! formula on every interpretation up to size 3; A and C have counter-worlds (two mothers; no mother).",
}

SOLUTIONS["cse-2026-2-cs-1"] = {
    "approach": "Concept tested: **quantifier order and a restricted universal 'everyone else'**: ∃y first (one person), then ∀x with x ≠ y as the hypothesis.",
    "concepts": ["∃∀ order", "Restricted universal with →", "Equality"],
    "given": "'There is a person who does not know anyone else, but that person is known by everyone else.' M(x, y): x knows y.",
    "steps": [
        {"title": "Outer", "body": "'There is a person y': $(\\exists y)$, chosen first."},
        {"title": "Inner", "body": "'everyone else' = every x with x ≠ y: $(\\forall x)((x \\ne y) \\to \\dots)$."},
        {"title": "Matrix", "body": "x knows y, and y does not know x: $M(x, y) \\wedge \\neg M(y, x)$. Assembled: option A."},
    ],
    "answer": {"value": "A", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "One y, for every other x: x knows y and y does not know x."),
        opt("B", False, "∀y∃x describes every person, and only needs one other x for each."),
        opt("C", False, "∃y∃x needs only one other person; also the implication is vacuous when x = y, making it trivially true on any domain."),
        opt("D", False, "∀y∀x claims this of every person, impossible with two people."),
    ],
    "shortcut": "'There is a person … everyone else' is ∃y∀x; only A has that order.",
    "pitfalls": ["Swapping ∃ and ∀.", "Using ∧ with x ≠ y under ∀ (it would force every x to differ from y, including y itself)."],
    "verification": "World {0, 1, 2} with M = {(1,0), (2,0), (1,2)}: A true (y = 0). The model search confirms A differs from B, C, D on small worlds.",
}
