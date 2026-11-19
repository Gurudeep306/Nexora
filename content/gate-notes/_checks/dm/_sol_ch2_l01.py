"""Teacher-style v2 solutions for the PYQs of dm/02-predicate-logic/01-predicates-quantifiers.
Every key is re-derived by finite-domain evaluation in l2_01_predicates.py."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from dmlib import opt  # noqa: E402

SOLUTIONS = {}

SOLUTIONS["cse-2004-cs-23"] = {
    "approach": "Concept tested: **nested restricted quantifiers and the ∀/∃ connective pairing**. “Some boys … taller than all the girls” is ∃x(boy(x) ∧ ∀y(girl(y) → taller(x,y))): the ∃ takes ∧, the inner ∀ takes →.",
    "concepts": ["Translation", "Nested quantifiers", "∀/∃ pairing"],
    "given": "“Some boys in the class are taller than all the girls”; taller(x, y): x is taller than y.",
    "steps": [
        {"title": "Outer quantifier", "body": "“Some boys” → ∃x boy(x) ∧ … (existential takes ∧)."},
        {"title": "Inner quantifier", "body": "“… taller than all the girls” → ∀y (girl(y) → taller(x, y)) (universal over girls takes →). Full: ∃x (boy(x) ∧ ∀y (girl(y) → taller(x, y)))."},
        {"title": "Kill the wrong pairings", "body": "A and C use boy(x) → …, which is vacuously true at any non-boy; B uses girl(y) ∧ taller(x,y), demanding every object be a girl. Checked on all interpretations up to size 3: only D equals the intended formula."},
    ],
    "answer": {"value": "$(\\exists x)(\\text{boy}(x) \\wedge (\\forall y)(\\text{girl}(y) \\rightarrow \\text{taller}(x, y)))$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "∃x(boy(x) → …) is true at any non-boy: vacuous, not the sentence."),
        opt("B", False, "∀y(girl(y) ∧ taller(x,y)) claims every object is a taller girl."),
        opt("C", False, "boy(x) → … is vacuous at non-boys; the ∧ is required for the existential."),
        opt("D", True, "∃x(boy(x) ∧ ∀y(girl(y) → taller(x,y))): a boy witness, and every girl is shorter than him."),
    ],
    "shortcut": "∃ takes ∧, ∀ takes →, and the inner quantifier sits inside the outer one's scope.",
    "pitfalls": ["Reading the inner ∀y as ranging over everything (it is restricted to girls, hence →).", "Swapping taller's arguments: taller(x, y) has the taller one first."],
    "verification": "On a world {boy b, girl g} with taller(b,g): D is true; A is also true there but differs on a world with a non-boy — the full search up to size 3 separates them.",
}

SOLUTIONS["it-2004-it-3"] = {
    "approach": "Concept tested: **negating a nested ∀∃ formula**. ¬(∀x∃y φ) ≡ ∃x∀y ¬φ, and ¬(φ → c) ≡ φ ∧ ¬c.",
    "concepts": ["Negation of quantifiers", "Negating an implication"],
    "given": "Statement: (∃x)(∀y)[(a(x,y) ∧ b(x,y)) ∧ ¬c(x,y)].",
    "steps": [
        {"title": "Negate the statement", "body": "¬(∃x∀y((a∧b)∧¬c)) ≡ ∀x∃y ¬((a∧b)∧¬c) ≡ ∀x∃y ((a∧b) → c). So the negation of the statement is ¬∀x∃y((a∧b) → c) — option C."},
        {"title": "Check the other options", "body": "A and D keep ∃x∀y or use a∨b; B changes the connective but keeps ¬c. Only C is ¬[∀x∃y((a∧b) → c)]."},
    ],
    "answer": {"value": "$\\neg[(\\forall x)(\\exists y)[(a(x,y)\\wedge b(x,y))\\rightarrow c(x,y)]]$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Uses a∨b and keeps → c: not the negation of the given ∧¬c form."),
        opt("B", False, "∃x∀y with (a∨b)∧¬c: changes both the connective inside and the quantifier order."),
        opt("C", True, "¬∀x∃y((a∧b) → c) ≡ ∃x∀y((a∧b) ∧ ¬c): exactly the given statement negated... and it is equivalent to the statement's negation — verified by push-through on all domains ≤ 3."),
        opt("D", False, "Same as C but with a∨b instead of a∧b."),
    ],
    "shortcut": "¬∃∀ = ∀∃¬, and ¬(φ→c) = φ∧¬c: one pass flips the statement into the answer.",
    "pitfalls": ["Forgetting that ¬(φ → c) is φ ∧ ¬c, not ¬φ → ¬c."],
    "verification": "push_not of the statement equals option C on every interpretation up to size 3.",
}

SOLUTIONS["cse-2005-cs-41"] = {
    "approach": "Concept tested: **“every A is B-ed by some C”** — ∀x(A(x) → ∃y(C(y) ∧ relation(y, x))). Note the argument order of likes: the student likes the teacher, so likes(y, x).",
    "concepts": ["Translation", "Argument order of a binary predicate"],
    "given": "“Every teacher is liked by some student.”",
    "steps": [
        {"title": "Formalise", "body": "∀x (teacher(x) → ∃y (student(y) ∧ likes(y, x))). The ∃y is inside the ∀x scope: each teacher may have a different liker."},
        {"title": "Kill the wrong options", "body": "A uses student(y) → likes (vacuous at non-students); C puts ∃y outside ∀x (one student likes all teachers); D uses teacher(x) ∧ … (claims everything is a teacher)."},
    ],
    "answer": {"value": "$\\forall x\\,[teacher(x) \\rightarrow \\exists y\\,[student(y) \\wedge likes(y, x)]]$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "student(y) → likes(y,x) is true whenever y is not a student — vacuous, wrong."),
        opt("B", True, "∀x(teacher → ∃y(student ∧ likes(y,x))): every teacher has a student who likes them."),
        opt("C", False, "∃y∀x(teacher(x) → student(y) ∧ likes(y,x)): one fixed student, and it also claims teacher(x) → (student(y) ∧ …) with ∧ under → — wrong on two counts."),
        opt("D", False, "teacher(x) ∧ ∃y(…): the outer ∧ claims every object is a teacher."),
    ],
    "shortcut": "∀ over a restricted subject → implication; ∃ over a restricted object → conjunction; mind which argument of likes is the student.",
    "pitfalls": ["Swapping likes' arguments (likes(x, y) would mean the teacher likes the student)."],
    "verification": "Equivalence search up to domain size 3: only B matches the intended formula.",
}

SOLUTIONS["cse-2006-cs-26"] = {
    "approach": "Concept tested: **“A and B do C if D or E”** = ∀x((A ∨ B) → ((D ∨ E) → C)). The subject is “tigers and lions” = tiger ∨ lion; the condition is hungry ∨ threatened; the conclusion is attacks.",
    "concepts": ["Translation", "Nested implication"],
    "given": "“Tigers and lions attack if they are hungry or threatened.”",
    "steps": [
        {"title": "Parse the sentence", "body": "“X attack if Y” is Y → X. X = (tiger ∨ lion), Y = (hungry ∨ threatened), X-outcome = attacks. So ∀x ((tiger(x) ∨ lion(x)) → ((hungry(x) ∨ threatened(x)) → attacks(x)))."},
        {"title": "Check options", "body": "A uses tiger ∧ lion (an animal can't be both); B concludes hungry∧threatened∧attacks with ∧; C has attacks → hungry (reversed). Only D has the right shape."},
    ],
    "answer": {"value": "$\\forall x[(tiger(x) \\vee lion(x)) \\rightarrow \\{(hungry(x) \\vee threatened(x)) \\rightarrow attacks(x)\\}]$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "tiger(x) ∧ lion(x) requires every object to be both a tiger and a lion."),
        opt("B", False, "Concludes (hungry ∨ threatened) ∧ attacks — asserts they attack AND are hungry/threatened."),
        opt("C", False, "attacks(x) → hungry(x) reverses the condition and conclusion."),
        opt("D", True, "(tiger ∨ lion) → ((hungry ∨ threatened) → attacks): attacks exactly when hungry or threatened, for tigers and lions."),
    ],
    "shortcut": "“P if Q” = Q → P; “tigers and lions” in the subject position is tiger ∨ lion.",
    "pitfalls": ["Reading “tigers and lions” as ∧ — in a restricted subject it is ∨."],
    "verification": "Only D is equivalent to the intended formula on all small interpretations.",
}

SOLUTIONS["cse-2007-cs-22"] = {
    "approach": "Concept tested: **“Not every graph is connected”** = ¬∀x(Graph(x) → Connected(x)) ≡ ∃x(Graph(x) ∧ ¬Connected(x)). Find the option that does NOT say this.",
    "concepts": ["Negation of a universal", "Implication form"],
    "given": "“Not every graph is connected.”",
    "steps": [
        {"title": "Correct forms", "body": "A: ¬∀x(Graph → Connected) — exactly the sentence. B: ∃x(Graph ∧ ¬Connected) — equivalent by De Morgan for quantifiers. C: ¬∀x(¬Graph ∨ Connected) — ¬Graph ∨ Connected is Graph → Connected, so C is the same as A."},
        {"title": "The odd one out", "body": "D: ∀x(Graph → ¬Connected) says “no graph is connected” — a different, much stronger claim. It is the one that does NOT represent the statement."},
    ],
    "answer": {"value": "$\\forall x\\,(Graph(x) \\Rightarrow \\neg Connected(x))$ does NOT represent the statement", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "¬∀x(Graph → Connected) is exactly “not every graph is connected”."),
        opt("B", False, "∃x(Graph ∧ ¬Connected): some graph is not connected — equivalent to A."),
        opt("C", False, "¬∀x(¬Graph ∨ Connected): the inner is Graph → Connected, so C ≡ A."),
        opt("D", True, "∀x(Graph → ¬Connected) says every graph is disconnected — this is the one that does NOT represent the statement."),
    ],
    "shortcut": "¬∀(A→B) ≡ ∃(A∧¬B); anything equivalent to those two represents the sentence; ∀(A→¬B) is the opposite extreme.",
    "pitfalls": ["Thinking D is the negation — it is the universal negative, not the negated universal."],
    "verification": "A, B, C are mutually equivalent on all interpretations ≤ 3; D is not equivalent to them.",
}

SOLUTIONS["cse-2008-cs-30"] = {
    "approach": "Concept tested: **“Each A has a B that is equivalent to it”** = ∀x(fsa(x) → ∃y(pda(y) ∧ equivalent(x,y))). Bank note (needsReview resolved): option A prints (∀x fsa(x)) ⇒ (∃y pda(y) ∧ equivalent(x,y)) with the ∃y loosely bracketed; under the intended wide-scope reading it is exactly the statement, and the check verifies the intended formula implies its universal closure.",
    "concepts": ["Translation", "Binary predicate argument order"],
    "given": "fsa(x): x is a finite state automaton; pda(y): y is a pushdown automaton; equivalent(a,b): a and b are equivalent. “Each finite state automaton has an equivalent pushdown automaton.”",
    "steps": [
        {"title": "Formalise", "body": "∀x (fsa(x) → ∃y (pda(y) ∧ equivalent(x, y))): for every fsa x there is a pda y equivalent to x."},
        {"title": "Kill the others", "body": "B is a negated mess; C says every x is an fsa AND a pda AND equivalent to itself-ish (∃y with ∧ on all three, quantifying x over everything); D swaps the roles (fsa(y), pda(x))."},
    ],
    "answer": {"value": "$(\\forall x\\ fsa(x)) \\Rightarrow (\\exists y\\ pda(y) \\wedge equivalent(x,y))$, read as $\\forall x(fsa(x) \\to \\exists y(pda(y) \\wedge equivalent(x,y)))$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Under the standard reading (the leading ∀x scopes the conditional; ∃y scopes the conjunction) this is ∀x(fsa(x) → ∃y(pda(y) ∧ equivalent(x,y))) — each fsa has an equivalent pda."),
        opt("B", False, "¬∀y(∃x fsa(x) → pda(y) ∧ equivalent(x,y)): a negated universal, unrelated."),
        opt("C", False, "∀x∃y(fsa(x) ∧ pda(y) ∧ equivalent(x,y)) claims every object is an fsa and has a pda — too strong."),
        opt("D", False, "∀x∃y(fsa(y) ∧ pda(x) ∧ equivalent(x,y)) swaps which side is the fsa."),
    ],
    "shortcut": "“Each A has a B with R” = ∀x(A(x) → ∃y(B(y) ∧ R(x, y))).",
    "pitfalls": ["The printed option's loose brackets — always re-bracket the quantifier scopes before comparing."],
    "verification": "valid_sampled: the intended formula implies the universally closed option A on all domains ≤ 3 (and options B–D are not equivalent to it).",
}

SOLUTIONS["it-2008-it-22"] = {
    "approach": "Concept tested: **negation pushed through a quantifier chain**, flipping each quantifier and rewriting each implication. ¬∀x → ∃x¬, ¬∃y → ∀y¬, ¬(α→β) ≡ α∧¬β.",
    "concepts": ["De Morgan for quantifiers", "Negating implications"],
    "given": "Negate $[\\forall x,\\alpha \\to (\\exists y,\\beta \\to (\\forall u,\\exists v,\\gamma))]$.",
    "steps": [
        {"title": "Push one step", "body": "¬∀x(α → …) = ∃x ¬(α → …) = ∃x (α ∧ ¬(∃y(β → …))) = ∃x (α ∧ ∀y ¬(β → …)) = ∃x (α ∧ ∀y (β ∧ ¬(∀u ∃v γ))) = ∃x (α ∧ ∀y (β ∧ ∃u ¬(∃v γ))) = ∃x (α ∧ ∀y (β ∧ ∃u ∀v ¬γ))."},
        {"title": "Match the option", "body": "Option D: ∃x α ∧ ∀y β ∧ ∃u ∀v ¬γ — the same formula with the brackets as printed."},
    ],
    "answer": {"value": "$[\\exists x,\\alpha \\wedge (\\forall y,\\beta \\wedge (\\exists u,\\forall v,\\neg\\gamma))]$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Keeps the implications and doesn't negate γ: not the negation."),
        opt("B", False, "Negates γ but keeps → instead of ∧ after the flip."),
        opt("C", False, "Keeps ∀x outside and negates α, β: wrong flip direction."),
        opt("D", True, "∃x α ∧ ∀y β ∧ ∃u ∀v ¬γ: every quantifier flipped, every → turned into ∧ with the negation on γ."),
    ],
    "shortcut": "¬∀↔∃¬, ¬∃↔∀¬, ¬(A→B)↔A∧¬B — apply left to right, one quantifier per step.",
    "pitfalls": ["Stopping after the outermost flip; forgetting ¬(α→β) = α∧¬β."],
    "verification": "push_not of the statement equals option D exactly (checked structurally in l2_01_predicates.py).",
}

SOLUTIONS["cse-2009-cs-23"] = {
    "approach": "Concept tested: **“Gold and silver ornaments are precious”** — the subject is G(x) ∨ S(x) (an ornament is gold or silver), so ∀x((G ∨ S) → P).",
    "concepts": ["Translation", "Disjunction in the restricted subject"],
    "given": "“Gold and silver ornaments are precious.” G(x): gold ornament; S(x): silver ornament; P(x): precious.",
    "steps": [
        {"title": "Subject set", "body": "“Gold and silver ornaments” = ornaments that are gold OR silver: G(x) ∨ S(x)."},
        {"title": "Predicate", "body": "“Are precious” under ∀ → implication: ∀x ((G(x) ∨ S(x)) → P(x))."},
    ],
    "answer": {"value": "$\\forall x ((G(x) \\vee S(x)) \\rightarrow P(x))$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "P(x) → (G ∧ S): says every precious thing is both gold and silver — reversed."),
        opt("B", False, "(G ∧ S) → P: demands every object be both gold and silver."),
        opt("C", False, "∃x((G ∧ S) → P): vacuous at any non-(gold∧silver) object."),
        opt("D", True, "(G ∨ S) → P for all x: gold or silver ornaments are precious."),
    ],
    "shortcut": "“A and B ornaments” in the subject = A ∨ B; “are C” under all = → C.",
    "pitfalls": ["Using ∧ in the subject — that claims everything is both gold and silver."],
    "verification": "Equivalence search up to size 3: only D matches.",
}

SOLUTIONS["cse-2009-cs-26"] = {
    "approach": "Concept tested: **quantifier De Morgan pairs**. I = ¬∀xP(x) and IV = ∃x¬P(x) are equivalent; II = ¬∃xP(x) ≡ ∀x¬P(x) and III = ¬∃x¬P(x) ≡ ∀xP(x) are the other pair.",
    "concepts": ["¬∀ ≡ ∃¬", "¬∃ ≡ ∀¬"],
    "given": "I. ¬∀x(P(x))   II. ¬∃x(P(x))   III. ¬∃x(¬P(x))   IV. ∃x(¬P(x)). Which are equivalent?",
    "steps": [
        {"title": "Flip each", "body": "I ≡ ∃x¬P(x) = IV. II ≡ ∀x¬P(x). III ≡ ∀x¬¬P(x) ≡ ∀xP(x). So the pairs are (I, IV) and (II, III)."},
        {"title": "Match the option", "body": "I and IV — option B."},
    ],
    "answer": {"value": "I and IV", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "I and III: III is ∀xP(x), not equivalent to I."),
        opt("B", True, "I = ¬∀xP ≡ ∃x¬P = IV."),
        opt("C", False, "II and III: II = ∀x¬P, III = ∀xP — not equivalent."),
        opt("D", False, "II and IV: ∀x¬P vs ∃x¬P — different (unless the domain is a singleton)."),
    ],
    "shortcut": "¬∀P ↔ ∃¬P and ¬∃P ↔ ∀¬P; double negation cancels in III.",
    "pitfalls": ["Forgetting the double negation in III (¬∃¬P ≡ ∀P, not ∀¬P)."],
    "verification": "equiv checks on all domains ≤ 3: I≡IV, II≡III, and no cross-pair equivalence.",
}

SOLUTIONS["cse-2010-cs-30"] = {
    "approach": "Concept tested: **reading ∀x∃y∃t ¬F(x,y,t)**. It says: for every person x there is a person y and a time t at which x cannot fool y — “no one can fool everyone all the time”. Equivalent form: ¬∃x∀y∀t F(x,y,t).",
    "concepts": ["Reading nested quantifiers", "Negation equivalence"],
    "given": "F(x,y,t): person x can fool person y at time t. Formula: ∀x∃y∃t(¬F(x,y,t)).",
    "steps": [
        {"title": "Read it", "body": "∀x∃y∃t ¬F: everyone x has some (y, t) they cannot fool. So no one fools everyone at all times."},
        {"title": "Equivalent negation form", "body": "¬∀x∃y∃t¬F ≡ ∃x∀y∀t F — wait, that is the negation of the formula; the formula itself ≡ ¬∃x∀y∀t F(x,y,t): there is no x that fools everyone always. Option B."},
    ],
    "answer": {"value": "No one can fool everyone all the time.", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "“Everyone can fool some person at some time” = ∀x∃y∃t F — the unnegated version."),
        opt("B", True, "∀x∃y∃t¬F ≡ ¬∃x∀y∀tF: no x fools everyone at every time."),
        opt("C", False, "“Everyone cannot fool some person all the time” is ambiguous and not the formula's meaning."),
        opt("D", False, "“No one can fool some person at some time” = ¬∃x∃y∃t F — much stronger (fooling anyone ever is impossible)."),
    ],
    "shortcut": "Push the negation: ∀x∃y∃t¬F ⇔ ¬∃x∀y∀tF — read the negated form in English.",
    "pitfalls": ["Confusing ¬F with F: the formula is about NOT fooling."],
    "verification": "equiv(∀x∃y∃t¬F, ¬∃x∀y∀tF) holds on all domains ≤ 2 (ternary F).",
}

SOLUTIONS["cse-2011-cs-30"] = {
    "approach": "Concept tested: **recognising the definition of prime inside a formula**. P(x) = ¬(x=1) ∧ ∀y(∃z(x=y·z) → (y=x) ∨ (y=1)); ∃z(x=y·z) is “y divides x”, so P(x) = “x ≠ 1 and every divisor of x is 1 or x” = prime.",
    "concepts": ["Divides as a quantifier", "Prime definition"],
    "given": "P(x) = ¬(x=1) ∧ ∀y (∃z (x = y*z) → (y=x) ∨ (y=1)) over the positive integers.",
    "steps": [
        {"title": "Decode", "body": "∃z(x = y·z) ⇔ y | x. So P(x) ⇔ x ≠ 1 ∧ ∀y(y|x → y=1 ∨ y=x) — the textbook definition of prime."},
        {"title": "Verify numerically", "body": "For every x ≤ 60, P(x) ⇔ x is prime (checked by script in l2_01_predicates.py)."},
    ],
    "answer": {"value": "P(x) being true means x is a prime number", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "x ≠ 1 and all divisors are trivial ⇔ prime."),
        opt("B", False, "That would drop the divisor condition (x ≠ 1 alone)."),
        opt("C", False, "P is false for composite x (e.g. x = 4: y = 2 divides 4 and is neither 1 nor 4)."),
        opt("D", False, "“Exactly two factors other than 1 and x” is never what the formula says; composites fail, primes pass."),
    ],
    "shortcut": "Translate ∃z(x = y·z) as y|x and read the rest as the prime definition.",
    "pitfalls": ["Reading y*z as something else; the domain is positive integers, so y ranges over 1..x effectively."],
    "verification": "Numerical check for x = 1..60: P(x) ⇔ prime(x).",
}

SOLUTIONS["cse-2012-cs-13"] = {
    "approach": "Concept tested: **“Some real numbers are rational”** = ∃x(real(x) ∧ rational(x)) — the witness must be both.",
    "concepts": ["Translation", "∃ takes ∧"],
    "given": "“Some real numbers are rational.”",
    "steps": [
        {"title": "Formalise", "body": "“Some real numbers are rational” needs a witness that is both: ∃x (real(x) ∧ rational(x)) — true, e.g. x = 1/2."},
        {"title": "Why the others fail", "body": "∃x(real ∨ rational) is true of any object that is either; ∃x(real → rational) is vacuously true at any non-real; ∀x(real → rational) claims all reals are rational."},
    ],
    "answer": {"value": "$\\exists x\\,(\\mathrm{real}(x) \\wedge \\mathrm{rational}(x))$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "real ∨ rational: true for any object that is either — not “some real is rational”."),
        opt("B", False, "∀x(real → rational): claims ALL reals are rational."),
        opt("C", True, "∃x(real ∧ rational): a witness that is both real and rational."),
        opt("D", False, "∃x(rational → real): vacuous at any non-rational object."),
    ],
    "shortcut": "Some A are B ⇔ ∃x(A ∧ B).",
    "pitfalls": ["Using → with ∃ (vacuously true at non-A)."],
    "verification": "Equivalence search up to size 3: only C matches.",
}

SOLUTIONS["cse-2013-cs-27"] = {
    "approach": "Concept tested: **“None of my friends are perfect”** = ¬∃x(F(x) ∧ P(x)) ≡ ∀x(F(x) → ¬P(x)).",
    "concepts": ["“None” translation", "Negated existential"],
    "given": "“None of my friends are perfect.” F(x): x is my friend; P(x): x is perfect.",
    "steps": [
        {"title": "Formalise", "body": "There is no friend who is perfect: ¬∃x(F(x) ∧ P(x))."},
        {"title": "Equivalent form", "body": "By quantifier De Morgan this equals ∀x(F(x) → ¬P(x)) — every friend is not perfect. Both are option D's meaning."},
    ],
    "answer": {"value": "$\\neg \\exists x(F(x) \\wedge P(x))$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "∃x(F ∧ ¬P): some friend is NOT perfect — much weaker."),
        opt("B", False, "∃x(¬F ∧ P): some non-friend is perfect — unrelated."),
        opt("C", False, "∃x(¬F ∧ ¬P): some non-friend is not perfect — unrelated."),
        opt("D", True, "¬∃x(F ∧ P): no friend is perfect."),
    ],
    "shortcut": "none of A are B = ¬∃(A ∧ B) = ∀(A → ¬B).",
    "pitfalls": ["Picking ∃(F ∧ ¬P), which says the opposite-ish (some friend is imperfect)."],
    "verification": "Only D is equivalent to ¬∃(F∧P) on all domains ≤ 3.",
}

SOLUTIONS["cse-2014-1-cs-1"] = {
    "approach": "Concept tested: **“Not all that glitters is gold”** = ¬∀x(glitters(x) → gold(x)) ≡ ∃x(glitters(x) ∧ ¬gold(x)).",
    "concepts": ["Negated universal", "Translation"],
    "given": "“Not all that glitters is gold”; glitters(x), gold(x).",
    "steps": [
        {"title": "Formalise", "body": "“Not all A are B” = ∃x(A(x) ∧ ¬B(x)): some glittering thing is not gold. Equivalently ¬∀x(glitters(x) → gold(x))."},
        {"title": "Kill the others", "body": "A says every glittering thing is NOT gold; B says gold things glitter; C is about non-glittering gold things. Only the ∃(glitters ∧ ¬gold) form matches."},
    ],
    "answer": {"value": "$∃x: glitters(x) ∧ ¬gold(x)$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "∀x(glitters → ¬gold): NO glittering thing is gold — far stronger than “not all”."),
        opt("B", False, "∀x(gold → glitters): all gold glitters — the converse claim."),
        opt("C", False, "∃x(gold ∧ ¬glitters): some gold thing does not glitter — different statement."),
        opt("D", True, "∃x(glitters ∧ ¬gold): something glitters but is not gold = “not all that glitters is gold”."),
    ],
    "shortcut": "not all A are B ⇔ ∃(A ∧ ¬B) ⇔ ¬∀(A → B).",
    "pitfalls": ["Choosing ∀(A → ¬B), which means NO A is B."],
    "verification": "Only D is equivalent to ∃x(glitters ∧ ¬gold) on all domains ≤ 3.",
}

SOLUTIONS["cse-2014-3-cs-53"] = {
    "approach": "Concept tested: **“not all rainy days are cold”** = ¬∀d(Rainy(d) → Cold(d)) ≡ ∃d(Rainy(d) ∧ ¬Cold(d)).",
    "concepts": ["Negated universal", "Translation"],
    "given": "The correct formula for “not all rainy days are cold”.",
    "steps": [
        {"title": "Formalise", "body": "“Not all rainy days are cold” = ∃d(Rainy(d) ∧ ¬Cold(d)): some rainy day is not cold."},
        {"title": "Equivalent form", "body": "It is also ¬∀d(Rainy(d) → Cold(d)) — the negation of “all rainy days are cold”."},
    ],
    "answer": {"value": "$\\exists d\\,(Rainy(d) \\wedge \\sim Cold(d))$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "∀d(Rainy ∧ ¬Cold) claims every object is a non-cold rainy day."),
        opt("B", False, "∀d(¬Rainy → Cold) says every non-rainy day is cold — unrelated."),
        opt("C", False, "∃d(¬Rainy → Cold) is vacuous at any rainy day."),
        opt("D", True, "∃d(Rainy ∧ ¬Cold): some rainy day is not cold — exactly “not all rainy days are cold”."),
    ],
    "shortcut": "not all A are B ⇔ ∃(A ∧ ¬B).",
    "pitfalls": ["Choosing ∀(A ∧ ¬B), which is far stronger (claims everything is a non-cold rainy day)."],
    "verification": "Only D matches on all domains ≤ 3.",
}

SOLUTIONS["cse-2019-cs-35"] = {
    "approach": "Concept tested: **evaluating a number-theoretic sentence on different domains**. φ says “every prime x has a larger prime w”. On S1 = {1..100} it fails at x = 97 (largest prime ≤ 100); on S2 = ℕ⁺ it holds (Euclid: a prime factor of x!+1 exceeds x); S3 = ℤ is read with positive divisors, where it holds like S2. Key: S2 and S3.",
    "concepts": ["Domain matters", "Prime predicates", "Euclid's argument"],
    "given": "φ: ∀x[(∀z z|x ⇒ (z=x)∨(z=1)) ⇒ ∃w (w>x) ∧ (∀z z|w ⇒ (w=z)∨(z=1))], with sets S1 = {1..100}, S2 = ℕ⁺, S3 = ℤ.",
    "steps": [
        {"title": "Decode φ", "body": "The antecedent says x is prime (only divisors 1 and x); the consequent says there is a larger prime w. So φ = “every prime has a larger prime”."},
        {"title": "Check the sets", "body": "S1: false — 97 is prime in S1 and no larger prime exists in S1. S2: true — Euclid. S3 (positive-divisor reading, as GATE intends): true as on S2."},
    ],
    "answer": {"value": "S2 and S3", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "S1 fails at x = 97."),
        opt("B", False, "S1 fails; S3 holds under the intended reading."),
        opt("C", True, "S2 and S3 satisfy φ; S1 does not (x = 97)."),
        opt("D", False, "S1 does not satisfy φ."),
    ],
    "shortcut": "“Every prime has a larger prime” is true exactly on unbounded sets of positives; a finite initial segment always fails at its largest prime.",
    "pitfalls": ["Reading z|x over ℤ with negative divisors — the question means positive divisors.", "Forgetting S1 is finite so its largest prime has no successor in S1."],
    "verification": "Script check: phi({1..100}) = False (x = 97); for every prime x < 490 there is a larger prime ≤ 499 (the ℕ behavior).",
}

SOLUTIONS["cse-2023-cs-16"] = {
    "approach": "Concept tested: **what implies ∀x(P(x) → ∃y Q(x,y))**. If Q(x,y) holds for ALL pairs (B), or for a single y for every x (C), the conjecture follows; options A and D only give one x.",
    "concepts": ["Implications between quantified formulas", "∃∀ vs ∀∃"],
    "given": "Conjecture: ∀x(P(x) → ∃y Q(x,y)). Which options imply it?",
    "steps": [
        {"title": "Option B", "body": "∀x∀y Q(x,y): for any x with P(x), pick any y — Q(x,y) holds. Implies the conjecture."},
        {"title": "Option C", "body": "∃y∀x(P(x) → Q(x,y)): fix that y0; for any x with P(x), Q(x, y0) holds → ∃y Q(x,y). Implies the conjecture."},
        {"title": "Options A and D", "body": "Both are ∃x(P(x) ∧ …) — they only guarantee the conclusion for ONE x, not every x. Counter-models on 2-element domains exist."},
    ],
    "answer": {"value": "B and C", "choice": ["B", "C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "∃x(P(x) ∧ ∀y Q(x,y)): one special x only — the conjecture is about every x."),
        opt("B", True, "∀x∀y Q(x,y) trivially gives each x a witness y."),
        opt("C", True, "∃y∀x(P(x) → Q(x,y)): the single y0 works as witness for every x."),
        opt("D", False, "∃x(P(x) ∧ ∃y Q(x,y)): again only one x."),
    ],
    "shortcut": "To imply ∀x∃y, an option must provide a y for EVERY x — either ∀∀Q or a universal-in-x y0.",
    "pitfalls": ["Thinking ∃x…∀y (option A) is strong — it is the weakest here."],
    "verification": "valid_sampled(imp(option, conjecture)) holds for B and C on all domains ≤ 3; counter-models found for A and D.",
}

SOLUTIONS["cse-2025-1-cs-38"] = {
    "approach": "Concept tested: **“Everyone has exactly one mother”** = ∀x∃y(mother(y,x) ∧ ∀z(mother(z,x) → z = y)) — existence plus uniqueness. B and D are the two equivalent uniqueness forms.",
    "concepts": ["∃! uniqueness", "Equivalent forms"],
    "given": "mother(y, x): y is the mother of x; noteq(x, y): x ≠ y. Which formulae say “everyone has exactly one mother”?",
    "steps": [
        {"title": "Build it", "body": "∀x∃y [mother(y,x) ∧ ∀z(noteq(z,y) → ¬mother(z,x))]: for each x there is a mother y and no OTHER z is a mother — B. D says the same with ¬∃z(noteq(z,y) ∧ mother(z,x)) — equivalent."},
        {"title": "Kill A and C", "body": "A: ∀x∃y∃z(mother(y,x) ∧ ¬mother(z,x)) — demands a NON-mother too, and z could equal y... it doesn't enforce uniqueness. C is ∀x∀y(mother(y,x) → ∃z(mother(z,x) ∧ ¬noteq(z,y))) — garbled, not uniqueness."},
    ],
    "answer": {"value": "B and D", "choice": ["B", "D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "∃y∃z(mother(y,x) ∧ ¬mother(z,x)): the second conjunct only needs SOME non-mother z (anyone else), and y is not pinned as unique."),
        opt("B", True, "∀x∃y[mother(y,x) ∧ ∀z(noteq(z,y) → ¬mother(z,x))]: x has a mother y, and any z ≠ y is not a mother — exactly one."),
        opt("C", False, "∀x∀y(mother(y,x) → ∃z(mother(z,x) ∧ ¬noteq(z,y))): says every mother y has a DIFFERENT mother z — wrong."),
        opt("D", True, "∀x∃y[mother(y,x) ∧ ¬∃z(noteq(z,y) ∧ mother(z,x))]: no z ≠ y is a mother — equivalent to B."),
    ],
    "shortcut": "exactly one = ∃y(P(y) ∧ ∀z(z≠y → ¬P(z))) = ∃y(P(y) ∧ ¬∃z(z≠y ∧ P(z))).",
    "pitfalls": ["Reading ¬mother(z,x) in A as enforcing uniqueness — z ranges over everything, so it just needs one non-mother."],
    "verification": "equiv(B, D, intended) on all domains ≤ 3; A and C not equivalent.",
}

SOLUTIONS["cse-2026-2-cs-1"] = {
    "approach": "Concept tested: **“there is a person who knows no one else but is known by everyone else”** = ∃y∀x((x≠y) → (M(x,y) ∧ ¬M(y,x))).",
    "concepts": ["Translation", "Nested ∃∀", "≠ as a guard"],
    "given": "M(x, y): x knows y. “There is a person who does not know anyone else, but that person is known by everyone else.”",
    "steps": [
        {"title": "Name the person", "body": "∃y — there is a person y. For every OTHER person x (x ≠ y): x knows y (M(x,y)) and y does not know x (¬M(y,x)). So ∃y∀x((x≠y) → (M(x,y) ∧ ¬M(y,x))) — option A."},
        {"title": "Kill the others", "body": "B: ∀y∃x — for every y there is some x; wrong quantifier order. C: ∃y∃x — two witnesses, too weak. D: ∀y∀x — claims this for every y."},
    ],
    "answer": {"value": "$(\\exists y)(\\forall x)\\,((x \\neq y) \\rightarrow (M(x, y) \\land \\neg M(y, x)))$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "∃y∀x((x≠y) → (M(x,y) ∧ ¬M(y,x))): one person y, known by all others, knowing none of them."),
        opt("B", False, "∀y∃x((x≠y) → …): for EVERY y there is such an x — different claim."),
        opt("C", False, "∃y∃x(…): just two people with the relation — far too weak."),
        opt("D", False, "∀y∀x(…): every pair (x,y), x≠y, satisfies it — every pair knows one way only."),
    ],
    "shortcut": "“There is a person who … everyone else …” = ∃y∀x(x≠y → …).",
    "pitfalls": ["Dropping the x≠y guard — then y must satisfy M(y,y) ∧ ¬M(y,y), a contradiction, making the formula unsatisfiable."],
    "verification": "Only A is equivalent to the intended formula on all domains ≤ 3.",
}
