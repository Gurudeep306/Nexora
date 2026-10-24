"""Teacher-style v2 solutions for the PYQs of dm/02-predicate-logic/01-predicates-quantifiers.
Every key is re-derived in l2_01_quantifiers.py (options compared with the intended formula on every
interpretation over small domains, plus hand-built worlds)."""
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


def eqn(title, lines, caption=None):
    f = {"kind": "equation", "title": title, "lines": [{"tex": t, **({"note": n} if n else {})} for t, n in lines]}
    if caption:
        f["caption"] = caption
    return f


SOLUTIONS["cse-2004-cs-23"] = {
    "approach": "Concept tested: **translating a sentence with two quantifiers**. 'Some boys …' is an existential with ∧; 'taller than all the girls' is a universal with → nested inside it.",
    "concepts": ["Existential with ∧", "Universal with →", "Nested quantifiers"],
    "given": "'Some boys in the class are taller than all the girls'; $taller(x, y)$: $x$ is taller than $y$.",
    "steps": [
        {"title": "Outer quantifier", "body": "'Some boys are …' is 'some A are B': $\\exists x(boy(x) \\wedge \\dots)$. The witness must be a boy **and** have the property, so the connective is $\\wedge$."},
        {"title": "Inner quantifier", "body": "'$x$ is taller than all the girls' is 'every girl is shorter than $x$': $\\forall y(girl(y) \\to taller(x, y))$. Non-girls pass the filter vacuously."},
        {"title": "Combine", "body": "$\\exists x(boy(x) \\wedge \\forall y(girl(y) \\to taller(x, y)))$: option D."},
        {"title": "Test the wrong pairings on a tiny world", "body": "World: one boy $b$ and one girl $g$, with $b$ taller than $g$. The sentence is true. B's inner $\\forall y(girl(y) \\wedge taller(x, y))$ demands that **everyone**, $b$ included, is a girl: false. So B fails a world where the sentence holds."},
    ],
    "answer": {"value": "$(\\exists x)(boy(x) \\wedge (\\forall y)(girl(y) \\rightarrow taller(x, y)))$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Both pairings are wrong: $\\exists$ with $\\to$ (any non-boy is a witness) and $\\forall$ with $\\wedge$ (everyone must be a girl)."),
        opt("B", False, "The outer part is right, but $\\forall y(girl(y) \\wedge taller(x, y))$ makes every object a girl shorter than $x$, including $x$ himself."),
        opt("C", False, "The inner part is right, but $\\exists x(boy(x) \\to \\dots)$ is made true by any object that is not a boy."),
        opt("D", True, "'Some A' with $\\wedge$ outside, 'all girls' with $\\to$ inside."),
    ],
    "shortcut": "Pairing rule: $\\exists$ goes with $\\wedge$, $\\forall$ goes with $\\to$. Only D has both pairings right.",
    "pitfalls": ["Writing $\\forall y(girl(y) \\wedge taller(x,y))$ because the sentence 'mentions girls and taller'.", "Putting $\\forall y$ outside $\\exists x$: the boy is chosen first, then compared with every girl."],
    "verification": "Compared with $\\exists x(boy(x) \\wedge \\forall y(girl(y) \\to taller(x,y)))$ on every interpretation over domains of size 1 to 3, only option D agrees.",
    "animation": tt("World: boy b taller than girl g", ["option", "value", "sentence"], [["A", "T", "T"], ["B", "F", "T"], ["C", "T", "T"], ["D", "T", "T"]],
                    hl=[(1, 1, "error"), (3, 1, "success")], caption="A and C are true here only because x = g (not a boy) is a vacuous witness; they stay true when no boy is tall, unlike the sentence."),
}

SOLUTIONS["it-2004-it-3"] = {
    "approach": "Concept tested: **negating through quantifiers**. Write the given formula as a double negation and push the inner ¬ through: ∃x∀y φ ≡ ¬∀x∃y ¬φ, and ¬[(a ∧ b) ∧ ¬c] is (a ∧ b) → c.",
    "concepts": ["De Morgan for quantifiers", "Negated implication", "Equivalence"],
    "given": "$(\\exists x)(\\forall y)[(a(x,y) \\wedge b(x,y)) \\wedge \\neg c(x,y)]$.",
    "steps": [
        {"title": "Double negation", "body": "$\\exists x \\forall y\\, \\varphi \\equiv \\neg\\neg\\exists x \\forall y\\, \\varphi \\equiv \\neg\\forall x \\exists y\\, \\neg\\varphi$ (each quantifier flips as one ¬ passes it)."},
        {"title": "Negate the matrix", "body": "$\\neg[(a \\wedge b) \\wedge \\neg c] \\equiv \\neg(a \\wedge b) \\vee c \\equiv (a \\wedge b) \\to c$."},
        {"title": "Assemble", "body": "$\\neg[(\\forall x)(\\exists y)[(a \\wedge b) \\to c]]$: option C."},
        {"title": "Why D differs", "body": "D has $a \\vee b$ inside. Pushing its ¬ in gives $\\exists x \\forall y[(a \\vee b) \\wedge \\neg c]$, which is option B, a weaker claim than the given one (it needs only one of $a, b$)."},
    ],
    "answer": {"value": "$\\neg[(\\forall x)(\\exists y)[(a(x,y) \\wedge b(x,y)) \\rightarrow c(x,y)]]$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "This is (with ∨ in place of ∧) the **negation** of the given statement, not an equivalent: it has no outer ¬."),
        opt("B", False, "$a \\vee b$ replaces $a \\wedge b$: true when only $a$ holds, where the given formula is false."),
        opt("C", True, "Pushing its ¬ inward gives $\\exists x \\forall y[(a \\wedge b) \\wedge \\neg c]$ exactly."),
        opt("D", False, "Equivalent to option B, so it inherits B's $\\vee$ error."),
    ],
    "shortcut": "Push the ¬ of each option inward and compare with the given formula symbol by symbol; only C reproduces $(a \\wedge b) \\wedge \\neg c$.",
    "pitfalls": ["Forgetting to flip a quantifier when moving ¬ across it.", "Negating $(a \\wedge b) \\to c$ as $(a \\wedge b) \\to \\neg c$ instead of $(a \\wedge b) \\wedge \\neg c$."],
    "verification": "Script: push_not(C) equals the given formula structurally, and only C is equivalent to it on every interpretation over domains of size 1 and 2.",
    "animation": eqn("Pushing the negation of option C inward", [
        ("\\neg\\forall x\\,\\exists y\\,[(a \\wedge b) \\to c]", "option C"),
        ("\\exists x\\,\\neg\\exists y\\,[(a \\wedge b) \\to c]", "¬∀ = ∃¬"),
        ("\\exists x\\,\\forall y\\,\\neg[(a \\wedge b) \\to c]", "¬∃ = ∀¬"),
        ("\\exists x\\,\\forall y\\,[(a \\wedge b) \\wedge \\neg c]", "¬(p → q) = p ∧ ¬q")]),
}

SOLUTIONS["cse-2005-cs-41"] = {
    "approach": "Concept tested: **order of nested quantifiers with restrictions**. 'Every teacher is liked by some student' lets the student depend on the teacher: ∀x(teacher → ∃y(student ∧ likes(y, x))).",
    "concepts": ["Nested quantifiers", "Order of quantifiers", "Pairing rule"],
    "given": "'Every teacher is liked by some student'; $likes(y, x)$: $y$ likes $x$.",
    "steps": [
        {"title": "Outer: every teacher", "body": "'Every A is …' is $\\forall x(teacher(x) \\to \\dots)$."},
        {"title": "Inner: some student", "body": "'… is liked by some student' is 'some student likes $x$': $\\exists y(student(y) \\wedge likes(y, x))$. The $\\exists y$ sits inside $\\forall x$, so different teachers may have different admirers."},
        {"title": "Combine", "body": "$\\forall x[teacher(x) \\to \\exists y[student(y) \\wedge likes(y, x)]]$: option B."},
        {"title": "Option C is stronger, not equivalent", "body": "C, $\\exists y \\forall x(teacher(x) \\to (student(y) \\wedge likes(y, x)))$, names **one** student who likes every teacher. It implies B (the order theorem), but in a world with two teachers each liked only by a different student, B is true and C false."},
    ],
    "answer": {"value": "$\\forall x[teacher(x) \\rightarrow \\exists y[student(y) \\wedge likes(y, x)]]$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\exists y(student(y) \\to likes(y, x))$ is made true by any non-student $y$: $\\exists$ paired with $\\to$."),
        opt("B", True, "$\\forall$ with $\\to$ outside, $\\exists$ with $\\wedge$ inside, in the right order."),
        opt("C", False, "$\\exists y\\forall x$: a single student who likes all teachers. Stronger than the sentence."),
        opt("D", False, "$\\forall x(teacher(x) \\wedge \\dots)$ makes everything a teacher; the inner part also pairs $\\exists$ with $\\to$."),
    ],
    "shortcut": "Check the pairing at each quantifier (only B has ∀→ and ∃∧), then the order (the 'some' that depends on 'every' goes inside).",
    "pitfalls": ["Choosing C because 'some student' appears first in the formula's English rewrite.", "Swapping the arguments of $likes$: the student is the one who likes."],
    "verification": "Script: only B is equivalent to the intended formula on all interpretations up to size 3; C implies it but not conversely.",
}

SOLUTIONS["cse-2006-cs-26"] = {
    "approach": "Concept tested: **plural subjects and conditional predicates**. 'Tigers and lions' means every animal that is a tiger **or** a lion; 'attack if hungry or threatened' is (hungry ∨ threatened) → attacks.",
    "concepts": ["Plural subject as ∨", "Universal with →", "Implication"],
    "given": "'Tigers and lions attack if they are hungry or threatened.'",
    "steps": [
        {"title": "The subject class", "body": "The sentence is about each tiger and each lion. 'Tigers do X and lions do X' is $\\forall x(tiger \\to X) \\wedge \\forall x(lion \\to X) \\equiv \\forall x((tiger(x) \\vee lion(x)) \\to X)$."},
        {"title": "The property", "body": "'Attack if hungry or threatened': the if-clause is the hypothesis, so $X = (hungry(x) \\vee threatened(x)) \\to attacks(x)$."},
        {"title": "Combine", "body": "$\\forall x[(tiger(x) \\vee lion(x)) \\to \\{(hungry(x) \\vee threatened(x)) \\to attacks(x)\\}]$: option D."},
        {"title": "Why the ∧ subject fails", "body": "A's filter $tiger(x) \\wedge lion(x)$ is false for every real animal, so A is vacuously true and says nothing; a hungry tiger that does not attack does not falsify it."},
    ],
    "answer": {"value": "$\\forall x[(tiger(x) \\vee lion(x)) \\rightarrow \\{(hungry(x) \\vee threatened(x)) \\rightarrow attacks(x)\\}]$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "The filter $tiger \\wedge lion$ selects animals that are both, i.e. none; the formula is vacuous."),
        opt("B", False, "Asserts that every tiger and lion **is** hungry or threatened **and** attacks: the 'if' became 'and'."),
        opt("C", False, "$(attacks \\to hungry) \\vee threatened$ reverses the conditional: it says an attacking animal must be hungry (unless threatened)."),
        opt("D", True, "Plural subject as $\\vee$, condition as hypothesis, attack as conclusion."),
    ],
    "shortcut": "Two quick filters: the subject must be $tiger \\vee lion$ (rules out A) and the condition must imply the attack (rules out B and C).",
    "pitfalls": ["Translating the English 'and' between two classes as $\\wedge$.", "Reading 'X if Y' as $X \\to Y$; the if-clause is the hypothesis."],
    "verification": "Script: only D is equivalent to the intended formula on all interpretations of the five predicates over domains of size 1 to 3.",
}

SOLUTIONS["cse-2007-cs-22"] = {
    "approach": "Concept tested: **negating a restricted universal**. 'Not every graph is connected' is ¬∀x(G → C) ≡ ∃x(G ∧ ¬C); find the option that is **not** equivalent.",
    "concepts": ["Negation of ∀", "Restricted quantifiers", "Equivalence"],
    "given": "Which formula does **not** represent 'not every graph is connected'?",
    "steps": [
        {"title": "Translate", "body": "'Every graph is connected': $\\forall x(G(x) \\to C(x))$. Its negation: $\\neg\\forall x(G(x) \\to C(x))$, option A."},
        {"title": "Push the negation in", "body": "$\\exists x\\,\\neg(G \\to C) \\equiv \\exists x(G(x) \\wedge \\neg C(x))$, option B: some graph is not connected."},
        {"title": "Rewrite the arrow", "body": "$G \\to C \\equiv \\neg G \\vee C$, so option C is option A in disguise."},
        {"title": "The odd one out", "body": "D, $\\forall x(G \\to \\neg C)$, says **no** graph is connected. With one connected and one disconnected graph, the sentence is true and D is false."},
    ],
    "answer": {"value": "$\\forall x\\,(Graph(x) \\Rightarrow \\neg Connected(x))$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "A literal translation of the sentence, so it does represent it (not the answer)."),
        opt("B", False, "Equivalent to A by De Morgan for quantifiers and $\\neg(p \\to q) \\equiv p \\wedge \\neg q$."),
        opt("C", False, "Equivalent to A, since $G \\Rightarrow C \\equiv \\neg G \\vee C$."),
        opt("D", True, "'No graph is connected', much stronger than 'not every graph is connected': it does not represent the sentence."),
    ],
    "shortcut": "'Not all A are B' = 'some A is not B'. D keeps the ∀ and only negates the conclusion, so it is the one that is different.",
    "pitfalls": ["Negating only the conclusion and keeping ∀ ('every graph is not connected').", "Missing the 'DOES NOT' in the question."],
    "verification": "Script: A, B, C are equivalent to $\\neg\\forall x(G \\to C)$ on all interpretations up to size 3; D is not.",
}

SOLUTIONS["cse-2008-cs-30"] = {
    "approach": "Concept tested: **scope of quantifiers in a translation**. The intended formula is ∀x(fsa(x) ⇒ ∃y(pda(y) ∧ equivalent(x, y))); option A is this formula with the scope brackets dropped, and the others are wrong under any reading.",
    "concepts": ["Scope", "Free variables", "Nested quantifiers"],
    "given": "'Each finite state automaton has an equivalent pushdown automaton.'",
    "steps": [
        {"title": "Intended formula", "body": "'Each FSA has …': $\\forall x(fsa(x) \\Rightarrow \\dots)$. '… an equivalent PDA': $\\exists y(pda(y) \\wedge equivalent(x, y))$. Together: $\\forall x(fsa(x) \\Rightarrow \\exists y(pda(y) \\wedge equivalent(x, y)))$."},
        {"title": "Option A", "body": "A writes the same symbols in the same order. Read with each quantifier's scope extending to the end of the formula, it is exactly the intended formula. (As printed, $\\forall x$ covers only $fsa(x)$ and $x, y$ are free in $equivalent(x, y)$, a bracketing slip.)"},
        {"title": "Options C and D", "body": "C, $\\forall x \\exists y(fsa(x) \\wedge pda(y) \\wedge equivalent(x, y))$, claims every object is an FSA: $\\forall$ paired with $\\wedge$. D additionally swaps the roles ($fsa(y)$, $pda(x)$)."},
        {"title": "Option B", "body": "B begins $\\sim\\forall y$, a negated claim about all PDAs, and leaves $x$ free; it does not express 'each FSA has …' under any bracketing."},
    ],
    "answer": {"value": "$(\\forall x\\ fsa(x)) \\Rightarrow (\\exists y\\ pda(y) \\wedge equivalent(x, y))$, read as $\\forall x(fsa(x) \\Rightarrow \\exists y(pda(y) \\wedge equivalent(x, y)))$", "choice": ["A"], "matchesKey": True,
               "keyNote": "As printed, option A leaves x and y free in equivalent(x, y); the key A assumes each quantifier's scope runs to the end, which is the intended translation. B, C, D are wrong under every reading."},
    "optionAnalysis": [
        opt("A", True, "The intended formula once the quantifiers are given their intended (wide) scope."),
        opt("B", False, "Negated universal over PDAs with $x$ free: not a translation of the sentence."),
        opt("C", False, "$\\forall x(fsa(x) \\wedge \\dots)$ asserts every object is an FSA."),
        opt("D", False, "Asserts every object is a PDA with an FSA equivalent: roles swapped and $\\forall$ with $\\wedge$."),
    ],
    "shortcut": "Look for $\\forall$ with $\\Rightarrow$ on $fsa$ and $\\exists$ with $\\wedge$ on $pda$: only A has both, once its brackets are read generously.",
    "pitfalls": ["Rejecting A for its bracketing and picking C, which has correct brackets but the wrong connective.", "Treating an unquantified $x$ as if it were universally quantified."],
    "verification": "Script: A with wide scope is equivalent to the intended formula on all interpretations up to size 3; C, D and B (even with ∃x widened) are not; as printed A has free variables {x, y}.",
}

SOLUTIONS["it-2008-it-22"] = {
    "approach": "Concept tested: **pushing a negation through nested quantifiers and implications**. Each ∀ becomes ∃ and vice versa where the ¬ passes it, and each ¬(p → q) becomes p ∧ ¬q.",
    "concepts": ["De Morgan for quantifiers", "Negated implication", "Nested scope"],
    "given": "Negate $\\forall x, \\alpha \\to (\\exists y, \\beta \\to (\\forall u, \\exists v, \\gamma))$ (a comma extends a quantifier's scope to the end).",
    "steps": [
        {"title": "Outer quantifier", "body": "$\\neg\\forall x(\\alpha \\to R) \\equiv \\exists x\\,\\neg(\\alpha \\to R) \\equiv \\exists x(\\alpha \\wedge \\neg R)$, where $R = \\exists y(\\beta \\to S)$."},
        {"title": "Second quantifier", "body": "$\\neg\\exists y(\\beta \\to S) \\equiv \\forall y\\,\\neg(\\beta \\to S) \\equiv \\forall y(\\beta \\wedge \\neg S)$, where $S = \\forall u \\exists v\\, \\gamma$."},
        {"title": "Innermost block", "body": "$\\neg\\forall u \\exists v\\, \\gamma \\equiv \\exists u \\forall v\\, \\neg\\gamma$."},
        {"title": "Assemble", "body": "$\\exists x, \\alpha \\wedge (\\forall y, \\beta \\wedge (\\exists u, \\forall v, \\neg\\gamma))$: option D."},
    ],
    "answer": {"value": "$[\\exists x,\\alpha\\wedge(\\forall y,\\beta\\wedge(\\exists u,\\forall v,\\neg\\gamma))]$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Flips the quantifiers but keeps the implications and leaves $\\gamma$ un-negated."),
        opt("B", False, "Negates $\\gamma$ but keeps $\\to$; the negation of $p \\to q$ is $p \\wedge \\neg q$, not $p \\to \\neg q$."),
        opt("C", False, "Negates every atom without flipping any quantifier: that is not how ¬ passes ∀ or ∃."),
        opt("D", True, "Every quantifier flipped, every $\\to$ turned into $\\wedge$, $\\gamma$ negated, $\\alpha$ and $\\beta$ kept."),
    ],
    "shortcut": "In the negation, the hypotheses $\\alpha, \\beta$ survive unchanged and become conjuncts; only the final conclusion is negated. Only D has $\\wedge$ in both places.",
    "pitfalls": ["Negating the hypotheses $\\alpha$ and $\\beta$ (option C).", "Writing $\\neg(p \\to q)$ as $p \\to \\neg q$ (option B)."],
    "verification": "Script: push_not of the negated formula equals option D structurally (α(x), β(x, y), γ(u, v)), and only D is equivalent to the negation on all interpretations over domains of size 1 and 2.",
    "animation": eqn("Negation travelling inward", [
        ("\\neg\\forall x\\,(\\alpha \\to \\exists y\\,(\\beta \\to \\forall u\\,\\exists v\\,\\gamma))", "given, negated"),
        ("\\exists x\\,(\\alpha \\wedge \\neg\\exists y\\,(\\beta \\to \\forall u\\,\\exists v\\,\\gamma))", "¬∀ = ∃¬, ¬(p → q) = p ∧ ¬q"),
        ("\\exists x\\,(\\alpha \\wedge \\forall y\\,(\\beta \\wedge \\neg\\forall u\\,\\exists v\\,\\gamma))", "¬∃ = ∀¬, again"),
        ("\\exists x\\,(\\alpha \\wedge \\forall y\\,(\\beta \\wedge \\exists u\\,\\forall v\\,\\neg\\gamma))", "flip the last block")]),
}

SOLUTIONS["cse-2009-cs-23"] = {
    "approach": "Concept tested: **a plural subject joined by 'and'**. 'Gold and silver ornaments are precious' is about every ornament that is gold **or** silver: ∀x((G ∨ S) → P).",
    "concepts": ["Plural subject as ∨", "Universal with →"],
    "given": "$G(x)$: gold ornament, $S(x)$: silver ornament, $P(x)$: precious.",
    "steps": [
        {"title": "Two classes", "body": "The sentence says gold ornaments are precious and silver ornaments are precious: $\\forall x(G \\to P) \\wedge \\forall x(S \\to P)$."},
        {"title": "Merge", "body": "$\\forall$ distributes over $\\wedge$ and $(G \\to P) \\wedge (S \\to P) \\equiv (G \\vee S) \\to P$, so the sentence is $\\forall x((G(x) \\vee S(x)) \\to P(x))$: option D."},
        {"title": "Reject B", "body": "B's filter $G \\wedge S$ picks out ornaments that are both gold and silver; if there are none, B is vacuously true even when a gold ornament is not precious."},
    ],
    "answer": {"value": "$\\forall x ((G(x) \\vee S(x)) \\rightarrow P(x))$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\forall x(P \\to (G \\wedge S))$ says every precious thing is both gold and silver: the converse, with $\\wedge$."),
        opt("B", False, "The filter $G \\wedge S$ is (in any sensible world) empty, so B says nothing about real ornaments."),
        opt("C", False, "$\\exists$ with $\\to$: true as soon as one object is not both gold and silver."),
        opt("D", True, "Every ornament that is gold or silver is precious."),
    ],
    "shortcut": "'A and B are C' about two classes = $\\forall x((A \\vee B) \\to C)$.",
    "pitfalls": ["Translating the English 'and' of a plural subject as $\\wedge$."],
    "verification": "Script: only D is equivalent to $\\forall x((G \\vee S) \\to P)$ on all interpretations up to size 3. World with one gold, non-precious ornament: D false (correct), B true.",
    "animation": tt("World: one gold ornament that is not precious", ["option", "value", "sentence"], [["A", "T", "F"], ["B", "T", "F"], ["C", "T", "F"], ["D", "F", "F"]],
                    hl=[(3, 1, "success"), (1, 1, "error")]),
}

SOLUTIONS["cse-2009-cs-26"] = {
    "approach": "Concept tested: **De Morgan's laws for quantifiers**. Push each negation inside: ¬∀ = ∃¬ and ¬∃ = ∀¬; then compare the four normal forms.",
    "concepts": ["De Morgan for quantifiers", "Equivalence"],
    "given": "I. $\\neg\\forall x P(x)$, II. $\\neg\\exists x P(x)$, III. $\\neg\\exists x \\neg P(x)$, IV. $\\exists x \\neg P(x)$.",
    "steps": [
        {"title": "Normalise each", "body": "I: $\\exists x\\, \\neg P(x)$. II: $\\forall x\\, \\neg P(x)$. III: $\\forall x\\, \\neg\\neg P(x) = \\forall x\\, P(x)$. IV: $\\exists x\\, \\neg P(x)$."},
        {"title": "Compare", "body": "I and IV have the same normal form: 'some element is not $P$'. II says 'nothing is $P$', III says 'everything is $P$'."},
        {"title": "Check the pairs offered", "body": "I and III are negations of each other (not equivalent). II and III are 'nothing' vs 'everything'. II and IV differ on a world where one element is $P$ and one is not: II is F, IV is T."},
    ],
    "answer": {"value": "I and IV", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "I is $\\exists x\\neg P$, III is $\\forall x P$: they are negations of each other."),
        opt("B", True, "Both are $\\exists x \\neg P(x)$."),
        opt("C", False, "II is 'nothing is P', III is 'everything is P': opposite claims (on a non-empty domain they cannot both hold)."),
        opt("D", False, "II is $\\forall x\\neg P$, IV is $\\exists x\\neg P$; II implies IV but not conversely."),
    ],
    "shortcut": "¬∀ and ∃¬ are the same thing; that pairs I with IV at a glance.",
    "pitfalls": ["Moving the ¬ past the quantifier without flipping it (reading I as $\\forall x \\neg P$)."],
    "verification": "Script: among all six pairs, only (I, IV) are equivalent on every interpretation up to size 3.",
    "animation": tt("The four formulas on three worlds of {1, 2}", ["world", "I", "II", "III", "IV"],
                    [["P = ∅", "T", "T", "F", "T"], ["P = {1}", "T", "F", "F", "T"], ["P = {1, 2}", "F", "F", "T", "F"]],
                    hl=[(0, 1, "success"), (0, 4, "success"), (1, 1, "success"), (1, 4, "success"), (2, 1, "success"), (2, 4, "success")]),
}

SOLUTIONS["cse-2010-cs-30"] = {
    "approach": "Concept tested: **reading a negated quantifier block back into English**. Pull the negation outward: ∀x∃y∃t ¬F ≡ ¬∃x∀y∀t F, 'it is not the case that someone can fool everyone at every time'.",
    "concepts": ["De Morgan for quantifiers", "Nested quantifiers", "Translation"],
    "given": "$F(x, y, t)$: $x$ can fool $y$ at time $t$. Formula: $\\forall x \\exists y \\exists t\\,(\\neg F(x, y, t))$.",
    "steps": [
        {"title": "Pull ¬ outward", "body": "$\\forall x \\exists y \\exists t\\, \\neg F \\equiv \\forall x \\exists y\\, \\neg\\forall t\\, F \\equiv \\forall x\\, \\neg\\forall y \\forall t\\, F \\equiv \\neg\\exists x \\forall y \\forall t\\, F$."},
        {"title": "Read the inside", "body": "$\\exists x \\forall y \\forall t\\, F(x, y, t)$: 'someone can fool everyone all the time'."},
        {"title": "Read the negation", "body": "'No one can fool everyone all the time': option B. Directly: for every $x$ there is a person $y$ and a time $t$ at which $x$ fails to fool $y$."},
    ],
    "answer": {"value": "No one can fool everyone all the time.", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "'Everyone can fool some person at some time' is $\\forall x \\exists y \\exists t\\, F$: the ¬ is missing."),
        opt("B", True, "$\\neg\\exists x \\forall y \\forall t\\, F$, equivalent to the given formula."),
        opt("C", False, "'Everyone cannot fool some person all the time' most naturally reads $\\forall x \\exists y \\forall t\\, \\neg F$ (some $y$ is never fooled by $x$), which is stronger: it needs one $y$ who resists at every time."),
        opt("D", False, "'No one can fool some person at some time' is $\\neg\\exists x \\exists y \\exists t\\, F$ = $\\forall x \\forall y \\forall t\\, \\neg F$: nobody ever fools anybody. Far stronger."),
    ],
    "shortcut": "A ∀∃∃ block with ¬ inside is the denial of the ∃∀∀ block: 'not (someone … everyone … always)'.",
    "pitfalls": ["Reading $\\exists t\\, \\neg F$ as 'never fools' ($\\forall t\\, \\neg F$)."],
    "verification": "Script: push_not(¬∃x∀y∀t F) equals the given formula, and only B's formula is equivalent to it on all interpretations over domains of size 1 and 2.",
}

SOLUTIONS["cse-2011-cs-30"] = {
    "approach": "Concept tested: **reading a number-theory predicate**. ∃z(x = y·z) is 'y divides x'; the formula says x ≠ 1 and every divisor of x is 1 or x, the definition of a prime.",
    "concepts": ["Divides as ∃", "Prime predicate", "Reading formulas"],
    "given": "$P(x) = \\neg(x = 1) \\wedge \\forall y(\\exists z(x = y \\cdot z) \\Rightarrow (y = x) \\vee (y = 1))$ over the positive integers.",
    "steps": [
        {"title": "Name the inner part", "body": "$\\exists z(x = y \\cdot z)$ says $y \\mid x$. So $P(x) = x \\ne 1 \\wedge \\forall y(y \\mid x \\to y = x \\vee y = 1)$."},
        {"title": "Read it", "body": "'$x$ is not 1, and its only divisors are $x$ and 1': $x$ is prime."},
        {"title": "Test the distractors", "body": "B: $x = 4 \\ne 1$ but $P(4)$ is false (divisor 2). C: $P(1)$ is false. D: $P(2)$ is true although 2 has **no** factor other than 1 and 2."},
    ],
    "answer": {"value": "$P(x)$ being true means that $x$ is a prime number", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The formula is the definition of a prime; for $x = 1, \\dots, 199$ it holds exactly at the primes."),
        opt("B", False, "$x \\ne 1$ is only the first conjunct; $x = 4$ satisfies it but not $P$."),
        opt("C", False, "$P(1)$ is false (and so are $P(4), P(6), \\dots$)."),
        opt("D", False, "The formula says the only factors are 1 and $x$, i.e. none other; a number with two extra factors, such as 6 (factors 2 and 3), fails $P$, and the primes have none."),
    ],
    "shortcut": "Recognise the pattern $\\forall y(y \\mid x \\to y = 1 \\vee y = x)$: 'only trivial divisors' = prime (with $x \\ne 1$ excluding 1).",
    "pitfalls": ["Forgetting that $\\neg(x = 1)$ is what excludes 1.", "Reading 'the only factors are 1 and x' as 'two factors besides 1 and x'."],
    "verification": "Script: brute force over $x = 1, \\dots, 199$ (with $y, z$ over the positive integers) matches primality exactly; $P(1)$, $P(4)$ false, $P(2)$ true.",
}

SOLUTIONS["cse-2012-cs-13"] = {
    "approach": "Concept tested: **'some A are B' is ∃x(A ∧ B)**. The witness must be both a real number and rational.",
    "concepts": ["Existential with ∧", "Pairing rule"],
    "given": "'Some real numbers are rational.'",
    "steps": [
        {"title": "Pattern", "body": "'Some A are B' claims one object that is an A **and** a B: $\\exists x(real(x) \\wedge rational(x))$, option C."},
        {"title": "Why not →", "body": "$\\exists x(rational(x) \\to real(x))$ is true as soon as one object is not rational (or is real), whatever the reals are like; it does not say that some real is rational."},
        {"title": "Why not ∨ or ∀", "body": "$\\exists x(real \\vee rational)$ needs only something that is one of the two; $\\forall x(real \\to rational)$ claims **all** reals are rational, which is false."},
    ],
    "answer": {"value": "$\\exists x\\,(real(x) \\wedge rational(x))$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\vee$ is too weak: an irrational real (or any rational object) is a witness."),
        opt("B", False, "'All reals are rational', a different (and false) claim."),
        opt("C", True, "One object that is both real and rational."),
        opt("D", False, "$\\exists$ with $\\to$: true in any world with a non-rational object."),
    ],
    "shortcut": "$\\exists$ goes with $\\wedge$.",
    "pitfalls": ["Choosing D because 'rational numbers are real' is true; the question asks for a translation, not a true statement."],
    "verification": "Script: only C is equivalent to $\\exists x(real \\wedge rational)$ on all interpretations up to size 3.",
}

SOLUTIONS["cse-2013-cs-27"] = {
    "approach": "Concept tested: **'none of the A are B' is ¬∃x(A ∧ B)**, equivalently ∀x(A → ¬B).",
    "concepts": ["Negated existential", "No A is B"],
    "given": "'None of my friends are perfect'; $F(x)$: friend, $P(x)$: perfect.",
    "steps": [
        {"title": "Pattern", "body": "'None of the A are B' denies 'some A is B': $\\neg\\exists x(F(x) \\wedge P(x))$, option D."},
        {"title": "Equivalent form", "body": "Pushing the ¬ in: $\\forall x(\\neg F \\vee \\neg P) \\equiv \\forall x(F(x) \\to \\neg P(x))$, 'every friend is imperfect'."},
        {"title": "The others", "body": "A says some friend is imperfect (consistent with other friends being perfect); B and C talk about non-friends."},
    ],
    "answer": {"value": "$\\neg\\exists x(F(x) \\wedge P(x))$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "'Some friend is not perfect': true even if another friend is perfect."),
        opt("B", False, "'Someone who is not my friend is perfect': about non-friends."),
        opt("C", False, "'Someone who is not my friend is not perfect': about non-friends."),
        opt("D", True, "No object is both a friend and perfect."),
    ],
    "shortcut": "'None' = 'not some': put ¬ in front of the 'some A are B' formula.",
    "pitfalls": ["Choosing A ('some friend is not perfect'), which is 'not all', not 'none'."],
    "verification": "Script: only D is equivalent to $\\neg\\exists x(F \\wedge P)$ on all interpretations up to size 3.",
}

SOLUTIONS["cse-2014-1-cs-1"] = {
    "approach": "Concept tested: **'not all A are B'**. ¬∀x(glitters → gold) ≡ ∃x(glitters ∧ ¬gold): something glitters and is not gold.",
    "concepts": ["Negation of ∀", "Restricted quantifiers"],
    "given": "'Not all that glitters is gold.'",
    "steps": [
        {"title": "Translate the inner sentence", "body": "'All that glitters is gold': $\\forall x(glitters(x) \\Rightarrow gold(x))$."},
        {"title": "Negate", "body": "$\\neg\\forall x(glitters \\Rightarrow gold) \\equiv \\exists x\\,\\neg(glitters \\Rightarrow gold) \\equiv \\exists x(glitters(x) \\wedge \\neg gold(x))$: option D."},
        {"title": "The literal trap", "body": "A, $\\forall x(glitters \\Rightarrow \\neg gold)$, says nothing that glitters is gold: the negation went only onto the conclusion and the ∀ was not flipped."},
    ],
    "answer": {"value": "$\\exists x:\\ glitters(x) \\wedge \\neg gold(x)$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "'Nothing that glitters is gold', much stronger than 'not all'."),
        opt("B", False, "'All gold glitters', an unrelated universal (the converse direction)."),
        opt("C", False, "'Something is gold and does not glitter': the roles of the two predicates are swapped."),
        opt("D", True, "Some glittering thing is not gold."),
    ],
    "shortcut": "'Not all A are B' = 'some A is not B' = $\\exists x(A \\wedge \\neg B)$.",
    "pitfalls": ["Reading 'not all … is …' as 'all … is not …'.", "Swapping which predicate is the filter."],
    "verification": "Script (colon read as scope to the end): only D is equivalent to $\\neg\\forall x(glitters \\to gold)$ on all interpretations up to size 3.",
}

SOLUTIONS["cse-2014-3-cs-53"] = {
    "approach": "Concept tested: **'not all A are B'** with the pairing rule. ¬∀d(Rainy → Cold) ≡ ∃d(Rainy ∧ ¬Cold).",
    "concepts": ["Negation of ∀", "Existential with ∧"],
    "given": "'Not all rainy days are cold.'",
    "steps": [
        {"title": "Inner sentence", "body": "'All rainy days are cold': $\\forall d(Rainy(d) \\to Cold(d))$."},
        {"title": "Negate", "body": "$\\exists d(Rainy(d) \\wedge \\sim Cold(d))$: some day is rainy and not cold. Option D."},
        {"title": "Check the ∀ options", "body": "A, $\\forall d(Rainy \\wedge \\sim Cold)$, makes **every** day rainy and warm. B, $\\forall d(\\sim Rainy \\to Cold)$, is about dry days."},
    ],
    "answer": {"value": "$\\exists d\\,(Rainy(d) \\wedge \\sim Cold(d))$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\forall$ with $\\wedge$: every day would have to be rainy and not cold."),
        opt("B", False, "'Every dry day is cold': unrelated to rainy days."),
        opt("C", False, "$\\exists$ with $\\to$: true as soon as one day is rainy (or cold), a near-vacuous claim."),
        opt("D", True, "One rainy day that is not cold."),
    ],
    "shortcut": "Not all = some … not: $\\exists(A \\wedge \\neg B)$; the only option with $\\exists$ and $\\wedge$ is D.",
    "pitfalls": ["Choosing A, which 'contains rainy and not cold' but with the wrong quantifier."],
    "verification": "Script: only D is equivalent to $\\neg\\forall d(Rainy \\to Cold)$ on all interpretations up to size 3.",
}

SOLUTIONS["cse-2019-cs-35"] = {
    "approach": "Concept tested: **reading a nested number formula and evaluating it on domains**. φ says: for every prime x there is a prime w > x. It holds exactly on domains with no largest prime.",
    "concepts": ["Prime predicate", "Nested quantifiers", "Domains"],
    "given": "$\\varphi = \\forall x[(\\forall z\\, z \\mid x \\Rightarrow (z = x \\vee z = 1)) \\Rightarrow \\exists w(w > x \\wedge \\forall z(z \\mid w \\Rightarrow (w = z \\vee z = 1)))]$; S1 = {1, …, 100}, S2 = positive integers, S3 = integers.",
    "steps": [
        {"title": "Name the parts", "body": "The antecedent says '$x$'s only divisors are $x$ and 1' (call it $Pr(x)$, which also holds for $x = 1$). The consequent says 'some $w > x$ has $Pr(w)$'. So φ: every '$Pr$' element has a larger '$Pr$' element: there is no largest prime."},
        {"title": "The finite set S1", "body": "97 is prime and none of 98, 99, 100 is: $x = 97$ is a counterexample. φ is **false** on S1."},
        {"title": "The positive integers S2", "body": "There are infinitely many primes (Euclid), so every prime, and also $x = 1$, has a larger prime. φ is **true** on S2."},
        {"title": "S3, intended reading", "body": "With divisors read as positive divisors (the meaning of 'prime'), the elements passing the antecedent are 1, $-1$ and the positive primes; each has a larger prime. φ is **true** on S3. So the answer is S2 and S3."},
        {"title": "A remark on the strict reading", "body": "If $z$ ranges over all integers, $-1$ divides every number, so the antecedent holds only for $x = -1$, and no $w > -1$ passes the divisor test; φ would then be false on S3, and no option would match. The key follows the intended reading."},
    ],
    "answer": {"value": "S2 and S3", "choice": ["C"], "matchesKey": True,
               "keyNote": "Correct under the intended reading (divisors are positive). If z ranged over all integers, -1 would divide every number and φ would fail on S3; no option fits that strict reading."},
    "optionAnalysis": [
        opt("A", False, "S1 fails: 97 is the largest prime in {1, …, 100}."),
        opt("B", False, "S1 fails, as above."),
        opt("C", True, "Both infinite sets have no largest prime."),
        opt("D", False, "Includes S1, which fails at 97."),
    ],
    "shortcut": "'For every prime there is a larger prime' fails on every finite set (its largest prime) and holds on any set containing all the positive primes.",
    "pitfalls": ["Thinking 100 or 99 is prime and accepting S1.", "Treating 1 as a counterexample: 1 passes the antecedent, but 2 > 1 is prime."],
    "verification": "Script: on S1 the largest antecedent-passing element is 97 with nothing above it; Bertrand's postulate checked for every prime below 3000 (S2); on −200…200 with positive divisors every passing element below 150 has a larger one, while with all-integer divisors only −1 passes and has no partner.",
    "animation": tt("φ on the three sets", ["set", "largest prime?", "φ"], [["S1 = {1…100}", "97", "F"], ["S2 = ℤ⁺", "none", "T"], ["S3 = ℤ", "none (positive divisors)", "T"]],
                    hl=[(0, 2, "error"), (1, 2, "success"), (2, 2, "success")]),
}

SOLUTIONS["cse-2023-cs-16"] = {
    "approach": "Concept tested: **which quantified statements imply ∀x(P(x) → ∃y Q(x, y))**. An option implies the conjecture if, assuming it, every x with P(x) gets a witness y; a single counter-model rules an option out.",
    "concepts": ["Order of quantifiers", "Logical implication", "Counter-models"],
    "given": "Conjecture: $\\forall x(P(x) \\Rightarrow \\exists y\\, Q(x, y))$.",
    "steps": [
        {"title": "Option B", "body": "$\\forall x \\forall y\\, Q(x, y)$: for any $x$ with $P(x)$, every $y$ works, and the domain is non-empty, so some $y$ exists. B implies the conjecture."},
        {"title": "Option C", "body": "$\\exists y \\forall x(P(x) \\Rightarrow Q(x, y))$ names one $b$ with $P(x) \\Rightarrow Q(x, b)$ for every $x$. Then any $x$ with $P(x)$ has the witness $y = b$. C implies the conjecture (the ∃∀ ⇒ ∀∃ pattern)."},
        {"title": "Option A", "body": "$\\exists x(P(x) \\wedge \\forall y\\, Q(x, y))$ talks about one $x$ only. Counter-model: $D = \\{0, 1\\}$, $P = \\{0, 1\\}$, $Q = \\{(0,0), (0,1)\\}$: A holds at $x = 0$, but $x = 1$ has $P(1)$ and no $y$. A does not imply it."},
        {"title": "Option D", "body": "$\\exists x(P(x) \\wedge \\exists y\\, Q(x, y))$ is weaker still; the same world refutes it."},
    ],
    "answer": {"value": "B and C", "choice": ["B", "C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Guarantees a witness for one $x$, not for every $x$ with $P(x)$."),
        opt("B", True, "Every pair satisfies $Q$, and the non-empty domain supplies a $y$."),
        opt("C", True, "One $y$ that works for all $x$ is in particular a $y$ for each $x$."),
        opt("D", False, "Again only about one $x$; the counter-model of A refutes it."),
    ],
    "shortcut": "Statements that start with $\\exists x$ speak about one $x$ and cannot imply a $\\forall x$ claim; B and C both supply a witness for every $x$.",
    "pitfalls": ["Accepting A because it looks 'stronger' ($\\forall y$ inside); its outer $\\exists x$ is what makes it weak.", "Rejecting C because the quantifier order differs: ∃y∀x implies ∀x∃y."],
    "verification": "Script: B ⇒ conjecture and C ⇒ conjecture hold on every interpretation up to size 3 (proved in the lesson); A and D have counter-models of size 2.",
    "animation": tt("Counter-model for A and D", ["x", "P(x)", "Q(x,0)", "Q(x,1)", "∃y Q(x,y)"], [["0", "T", "T", "T", "T"], ["1", "T", "F", "F", "F"]],
                    hl=[(1, 4, "error"), (0, 4, "success")], caption="A and D hold at x = 0; the conjecture fails at x = 1."),
}

SOLUTIONS["cse-2025-1-cs-38"] = {
    "approach": "Concept tested: **'exactly one' as existence plus uniqueness**. Everyone has exactly one mother: ∀x∃y(mother(y, x) ∧ no z ≠ y is a mother of x). Test each option on a person with 0, 1 and 2 mothers.",
    "concepts": ["Uniqueness ∃!", "Nested quantifiers", "Counter-models"],
    "given": "$mother(y, x)$: $y$ is the mother of $x$; $noteq(x, y)$: $x \\ne y$.",
    "steps": [
        {"title": "Target", "body": "$\\forall x\\, \\exists! y\\, mother(y, x)$, i.e. $\\forall x \\exists y[mother(y, x) \\wedge \\forall z(z \\ne y \\to \\neg mother(z, x))]$."},
        {"title": "B and D", "body": "B is the target verbatim. D writes the uniqueness as $\\neg\\exists z(z \\ne y \\wedge mother(z, x))$, which equals $\\forall z(z \\ne y \\to \\neg mother(z, x))$ by De Morgan. Both are correct."},
        {"title": "Option A", "body": "$\\exists y \\exists z(mother(y, x) \\wedge \\neg mother(z, x))$: 'some $y$ is a mother of $x$ and some $z$ is not'. A person with two mothers in a three-person world satisfies it: existence without uniqueness."},
        {"title": "Option C", "body": "$\\forall y[mother(y, x) \\to \\exists z(mother(z, x) \\wedge \\neg noteq(z, y))]$: take $z = y$; the formula is always true, even for a person with no mother."},
    ],
    "answer": {"value": "B and D", "choice": ["B", "D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Allows two (or more) mothers; it only needs one mother and one non-mother."),
        opt("B", True, "Some $y$ is the mother, and every $z$ different from $y$ is not."),
        opt("C", False, "A tautology ($z = y$ always works); it asserts neither existence nor uniqueness."),
        opt("D", True, "Same as B with the inner $\\forall\\neg$ written as $\\neg\\exists$."),
    ],
    "shortcut": "Three-world test per person: 0 mothers, 1 mother, 2 mothers. A correct option gives F, T, F; A gives F, T, T and C gives T, T, T.",
    "pitfalls": ["Accepting A because it 'mentions both a mother and a non-mother'.", "Missing that C's inner witness can be $y$ itself."],
    "verification": "Script (noteq read as ≠): B and D are equivalent to $\\forall x \\exists! y\\, mother(y, x)$ on all interpretations up to size 3; A is not; C is valid.",
    "animation": tt("One person x with 0, 1, 2 mothers", ["mothers of x", "target", "A", "B", "C", "D"],
                    [["0", "F", "F", "F", "T", "F"], ["1", "T", "T", "T", "T", "T"], ["2", "F", "T", "F", "T", "F"]],
                    hl=[(2, 2, "error"), (0, 4, "error"), (2, 4, "error")], caption="A world with a third person who is nobody's mother."),
}

SOLUTIONS["cse-2026-2-cs-1"] = {
    "approach": "Concept tested: **'there is a person … everyone else' with ≠ and the order ∃y∀x**. Name the special person y first; then every other person x knows y and is not known by y.",
    "concepts": ["Order of quantifiers", "Restriction with ≠", "Translation"],
    "given": "$M(x, y)$: $x$ knows $y$. 'There is a person who does not know anyone else, but that person is known by everyone else.'",
    "steps": [
        {"title": "Outer quantifier", "body": "'There is a person' (call them $y$) comes first: $\\exists y$, outermost."},
        {"title": "Everyone else", "body": "'Everyone else' ranges over $x \\ne y$: $\\forall x(x \\ne y \\to \\dots)$."},
        {"title": "The two facts about each other person", "body": "$x$ knows $y$: $M(x, y)$; $y$ does not know $x$: $\\neg M(y, x)$. So $\\exists y \\forall x((x \\ne y) \\to (M(x, y) \\wedge \\neg M(y, x)))$: option A."},
        {"title": "Check the order", "body": "B ($\\forall y \\exists x$) says every person has someone else who knows them and whom they do not know: a different claim. C needs only one other person; D makes **everyone** such a person, impossible with two people."},
    ],
    "answer": {"value": "$(\\exists y)(\\forall x)\\,((x \\neq y) \\rightarrow (M(x, y) \\land \\neg M(y, x)))$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "One person $y$; every other $x$ knows $y$ and is unknown to $y$."),
        opt("B", False, "$\\forall y \\exists x$: for every person some other person fits, not one special person; and $x = y$ makes the inner implication vacuously true, so B is close to trivial."),
        opt("C", False, "$\\exists y \\exists x$: only one other person needs to know $y$ (or $x = y$ makes it vacuous)."),
        opt("D", False, "Everyone would be known by everyone else and know nobody: contradictory for two different people."),
    ],
    "shortcut": "'There is a person … everyone else' = $\\exists y \\forall x(x \\ne y \\to \\dots)$: only A has $\\exists\\forall$ in that order.",
    "pitfalls": ["Choosing B by quantifying 'everyone' first.", "Forgetting that $x \\ne y$ is a filter, so the matrix is an implication."],
    "verification": "Script: only A is equivalent to the intended formula on all interpretations up to size 3; in the world a → c, b → c, a → b, person c satisfies A.",
}
