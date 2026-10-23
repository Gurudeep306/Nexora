"""Teacher-style v2 solutions for the PYQs of dm/01-propositional-logic/03-inference-resolution.
Every key (and every descriptive answer's facts) is re-derived in l1_03_inference.py."""
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


SOLUTIONS["cse-1991-a-4-iv"] = {
    "approach": "Concept tested: **consistency and (negation) completeness of axiom systems under removing axioms**. Fewer axioms prove fewer theorems: that can never create a contradiction, but it can leave a statement undecided.",
    "concepts": ["Axiom system", "Consistency", "Completeness", "Subsystem"],
    "given": "A finite axiom system $A$ that is complete (for every $\\varphi$, $A \\vdash \\varphi$ or $A \\vdash \\neg\\varphi$) and consistent (never both). Question: is every subsystem $A' \\subseteq A$ complete and consistent?",
    "steps": [
        {"title": "Consistency is inherited", "body": "Any derivation from $A'$ uses only axioms of $A'$, which are axioms of $A$, so it is also a derivation from $A$. If $A'$ proved both $\\varphi$ and $\\neg\\varphi$, then $A$ would too, contradicting the consistency of $A$. So **every subsystem is consistent**. (Semantically: a model of $A$ is a model of every subset.)"},
        {"title": "Completeness is not inherited", "body": "Removing an axiom can make a statement unprovable without making its negation provable. Example over the variables $p, q$: $A = \\{p, q\\}$ has exactly one model ($p = q =$ T), so it decides every formula: complete and consistent. Its subsystem $A' = \\{p\\}$ has two models ($q$ = T and $q$ = F), so it proves neither $q$ nor $\\neg q$."},
        {"title": "General reason", "body": "A consistent propositional theory is complete exactly when it has one model. Dropping axioms can only add models; once two models exist, the formula that separates them is undecided."},
        {"title": "Answer", "body": "No: every subsystem is **consistent**, but **not necessarily complete**."},
    ],
    "answer": {"value": "Every subsystem is consistent but not necessarily complete", "matchesKey": True},
    "shortcut": "Think 'fewer axioms, fewer theorems': contradictions (two theorems $\\varphi$, $\\neg\\varphi$) can only disappear, and so can answers.",
    "pitfalls": ["Mixing the two meanings of complete: propositional logic's proof system is complete (proves every valid formula) whatever the axioms, but a **theory** being complete depends on its axioms.", "Answering 'yes, both' because a subsystem 'is part of a good system'."],
    "verification": "By brute force over all 16 formulas in $p, q$: $\\{p, q\\}$ decides each one, $\\{p\\}$ leaves $q$ undecided, and both $\\{p\\}$ and $\\emptyset$ are satisfiable (consistent).",
    "animation": tt("Models of A = {p, q} and of the subsystem {p}", ["p", "q", "A = {p, q}", "A' = {p}"],
                    [["T", "T", "model", "model"], ["T", "F", "-", "model"], ["F", "T", "-", "-"], ["F", "F", "-", "-"]],
                    hl=[(0, 2, "success"), (0, 3, "warning"), (1, 3, "warning")], caption="One model: complete. Two models: q is undecided."),
}

SOLUTIONS["cse-1992-b-15-a"] = {
    "approach": "Concept tested: **refutation by resolution (or chained modus ponens)**. Universal clauses hold for every value, so substitute $x = a$, $y = a$; then the four statements become clauses over the atoms $P(a), Q(a), R(a)$, and we derive the empty clause.",
    "concepts": ["Resolution", "Modus ponens", "Inconsistency", "Instantiation"],
    "given": "(1) $Q(x) \\to P(x) \\vee \\sim R(a)$; (2) $R(a) \\vee \\sim Q(a)$; (3) $Q(a)$; (4) $\\sim P(y)$; $x, y$ universally quantified, $a$ a constant.",
    "steps": [
        {"title": "Instantiate and write clauses", "body": "With $x = a$ and $y = a$: (1) $\\{\\neg Q(a), P(a), \\neg R(a)\\}$ (since $A \\to B \\equiv \\neg A \\vee B$), (2) $\\{R(a), \\neg Q(a)\\}$, (3) $\\{Q(a)\\}$, (4) $\\{\\neg P(a)\\}$."},
        {"title": "Derive R(a)", "body": "Resolve (3) with (2) on $Q(a)$: (5) $\\{R(a)\\}$. In modus ponens form: $Q(a)$ and $Q(a) \\to R(a)$ give $R(a)$."},
        {"title": "Derive P(a)", "body": "Resolve (3) with (1) on $Q(a)$: (6) $\\{P(a), \\neg R(a)\\}$. Resolve (6) with (5) on $R(a)$: (7) $\\{P(a)\\}$."},
        {"title": "Reach the empty clause", "body": "Resolve (7) with (4): $\\{P(a)\\}$ and $\\{\\neg P(a)\\}$ give $\\square$. The set is unsatisfiable, i.e. **inconsistent**."},
    ],
    "answer": {"value": "Inconsistent: R(a) from (2), (3); P(a) from (1) with x = a; this contradicts ~P(a) from (4) with y = a", "matchesKey": True},
    "shortcut": "Every step is modus ponens on ground instances: $Q(a) \\Rightarrow R(a) \\Rightarrow P(a)$, while (4) says nothing is $P$.",
    "pitfalls": ["Forgetting that (4) with a universal $y$ applies to $a$: $\\sim P(y)$ means $P$ is false for every object.", "Reading (1) as $(Q(x) \\to P(x)) \\vee \\sim R(a)$; the arrow binds weaker than $\\vee$, so it is $Q(x) \\to (P(x) \\vee \\sim R(a))$."],
    "verification": "As propositional formulas over $P(a), Q(a), R(a)$ the four statements have no common satisfying assignment (8-row check), and resolution saturation derives $\\square$.",
    "animation": {"kind": "tree", "title": "Resolution tree down to the empty clause", "root": {
        "label": "□", "tone": "success", "children": [
            {"label": "P(a)", "children": [
                {"label": "P(a) ∨ ¬R(a)", "children": [{"label": "(1) ¬Q(a) ∨ P(a) ∨ ¬R(a)"}, {"id": "q3a", "label": "(3) Q(a)"}]},
                {"label": "R(a)", "children": [{"label": "(2) R(a) ∨ ¬Q(a)"}, {"id": "q3b", "label": "(3) Q(a)"}]}]},
            {"label": "(4) ¬P(a)", "tone": "warning"}]}},
}

SOLUTIONS["cse-1993-ii-b-18"] = {
    "approach": "Concept tested: **logical consequence by truth table**. $C$ is a logical consequence of $F$ iff $C$ is true on every row where $F$ is true; so find the rows that make $F$ true.",
    "concepts": ["Logical consequence", "Truth table", "Implication"],
    "given": "$F = A \\wedge (A \\to (B \\vee C)) \\wedge (B \\to \\sim A)$. Show $F \\models C$.",
    "steps": [
        {"title": "Restrict to A = T", "body": "$F$ is a conjunction containing $A$, so $F$ can be true only on the four rows with $A = 1$."},
        {"title": "Use B → ¬A", "body": "With $A = 1$, $B \\to \\sim A$ is $B \\to 0$, true only when $B = 0$. Rows left: $(A, B, C) = (1, 0, 1)$ and $(1, 0, 0)$."},
        {"title": "Use A → (B ∨ C)", "body": "With $A = 1$ and $B = 0$ it needs $C = 1$. The row $(1, 0, 0)$ fails. So $F$ is true on exactly one row: $(1, 0, 1)$."},
        {"title": "Check C there", "body": "On $(1, 0, 1)$, $C = 1$. Every row with $F$ true has $C$ true, so $F \\to C$ is a tautology and $C$ is a logical consequence of $F$."},
    ],
    "answer": {"value": "F is true only for A = 1, B = 0, C = 1, where C is true; hence F ⊨ C", "matchesKey": True},
    "shortcut": "Chain the premises: $A$ and $B \\to \\sim A$ give $\\sim B$ (modus tollens); $A$ and $A \\to (B \\vee C)$ give $B \\vee C$ (modus ponens); then $\\sim B$ gives $C$ (disjunctive syllogism).",
    "pitfalls": ["Checking $C$ on all eight rows: rows where $F$ is false do not matter.", "Concluding 'not a consequence' because $C$ is false on some row where $F$ is also false."],
    "verification": "Full 8-row truth table: $F$ = 1 only on row 101.",
    "animation": tt("Truth table of F (rows with A = 1)", ["A", "B", "C", "A→(B∨C)", "B→¬A", "F", "C"],
                    [["1", "1", "1", "1", "0", "0", "1"], ["1", "1", "0", "1", "0", "0", "0"], ["1", "0", "1", "1", "1", "1", "1"], ["1", "0", "0", "0", "1", "0", "0"]],
                    hl=[(2, 5, "success"), (2, 6, "success")], caption="Rows with A = 0 make F false and are omitted."),
}

SOLUTIONS["cse-2003-cs-72"] = {
    "approach": "Concept tested: **what the resolution rule guarantees**. The parents imply the resolvent (soundness), but not the other way round; so satisfiability passes from the parents to the resolvent, not back.",
    "concepts": ["Resolution", "Soundness", "Satisfiability", "Validity"],
    "given": "Rule: from $(P \\vee R)$ and $(Q \\vee \\neg R)$ derive $(P \\vee Q)$, with $P, Q, R$ arbitrary formulas. Find the FALSE statement.",
    "steps": [
        {"title": "Option A: soundness", "body": "If $R$ is true, $Q \\vee \\neg R$ forces $Q$; if $R$ is false, $P \\vee R$ forces $P$. Either way $P \\vee Q$ holds. So $((P \\vee R) \\wedge (Q \\vee \\neg R)) \\Rightarrow (P \\vee Q)$ is valid: A is true."},
        {"title": "Option B: a tautology on the right", "body": "$(P \\vee R) \\vee (Q \\vee \\neg R)$ contains $R \\vee \\neg R$, so it is always true, and every formula implies a tautology: B is true."},
        {"title": "Option D", "body": "$X \\Rightarrow$ FALSE is valid exactly when $X$ is unsatisfiable; $P \\vee Q$ is unsatisfiable exactly when both $P$ and $Q$ are. D is true."},
        {"title": "Option C: the converse fails", "body": "By A, satisfiable parents give a satisfiable resolvent. The converse is false: take $P = x$, $Q = \\neg x$, $R = x$. Then $P \\vee Q = x \\vee \\neg x$ is satisfiable, but $(P \\vee R) \\wedge (Q \\vee \\neg R) = x \\wedge \\neg x$ is not. C is the false statement."},
    ],
    "answer": {"value": "(C): P ∨ Q satisfiable does not imply (P ∨ R) ∧ (Q ∨ ¬R) satisfiable", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "True: this is the soundness of resolution (case on $R$)."),
        opt("B", False, "True: the right side contains $R \\vee \\neg R$, a tautology."),
        opt("C", True, "False in general: $P = x$, $Q = \\neg x$, $R = x$ makes the resolvent satisfiable and the parents unsatisfiable. (It does hold when $R$ is a fresh letter not in $P, Q$, but the option does not say so.)"),
        opt("D", False, "True: $P \\vee Q \\Rightarrow$ FALSE is valid iff $P \\vee Q$ is unsatisfiable iff both $P$ and $Q$ are."),
    ],
    "shortcut": "Resolution only goes downhill: parents ⊨ resolvent. Any 'if and only if' between parents and resolvent is suspect.",
    "pitfalls": ["Treating $P, Q, R$ as distinct atoms: then C happens to hold (choose $R$ freely), but the rule is stated for arbitrary formulas.", "Thinking B is false because $P \\vee Q$ 'loses' $R$: the right side is a tautology."],
    "verification": "Brute force with $P, Q, R$ ranging over all 16 truth tables in two letters: A, B and D hold in every case; C fails for some (for example $P = x$, $Q = \\neg x$, $R = x$).",
    "animation": eq("The counterexample to C", [
        ("P = x,\\quad Q = \\neg x,\\quad R = x", "choose formulas"),
        ("P \\vee Q = x \\vee \\neg x", "satisfiable (a tautology)"),
        ("(P \\vee R) \\wedge (Q \\vee \\neg R) = x \\wedge \\neg x", "unsatisfiable")]),
}

SOLUTIONS["it-2004-it-31"] = {
    "approach": "Concept tested: **validity of an argument**. $P_1 \\wedge \\dots \\wedge P_n \\to C$ is valid iff no assignment makes every premise true and the conclusion false. For each argument, set the conclusion false and try to make the premises true.",
    "concepts": ["Valid argument", "Counterexample", "Rules of inference"],
    "given": "1. $(\\neg p \\vee q) \\wedge (r \\to s) \\wedge (p \\vee r) \\to (\\neg s \\to q)$; 2. $(\\neg p \\wedge q) \\wedge (q \\to (p \\to r)) \\to \\neg r$; 3. $((q \\wedge r) \\to p) \\wedge (\\neg q \\wedge p) \\to r$; 4. $p \\wedge (p \\to r) \\wedge (q \\vee \\neg r) \\to q$.",
    "steps": [
        {"title": "Argument 1", "body": "Conclusion $\\neg s \\to q$ false means $s = $ F, $q = $ F. Then $r \\to s$ needs $r = $ F, $p \\vee r$ needs $p = $ T, and $\\neg p \\vee q = $ F ∨ F = F. No counterexample: **valid**. (Proof: assume $\\neg s$; MT gives $\\neg r$; DS gives $p$; DS gives $q$.)"},
        {"title": "Argument 2", "body": "Conclusion $\\neg r$ false means $r = $ T. $\\neg p \\wedge q$ forces $p = $ F, $q = $ T; then $p \\to r$ is T and $q \\to (p \\to r)$ is T. All premises true, conclusion false: **invalid** (counterexample $p = $ F, $q = $ T, $r = $ T)."},
        {"title": "Argument 3", "body": "Conclusion $r$ false means $r = $ F. $\\neg q \\wedge p$ forces $q = $ F, $p = $ T; then $q \\wedge r = $ F and $(q \\wedge r) \\to p$ is T. **Invalid** (counterexample $p = $ T, $q = $ F, $r = $ F)."},
        {"title": "Argument 4", "body": "$p$ and $p \\to r$ give $r$ (MP); $q \\vee \\neg r$ with $\\neg r$ false gives $q$ (DS). **Valid**."},
        {"title": "Match the option", "body": "Valid: 1 and 4, option C."},
    ],
    "answer": {"value": "1 and 4", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Argument 2 is invalid: $p = $ F, $q = $ T, $r = $ T makes its premises true and $\\neg r$ false."),
        opt("B", False, "Argument 3 is invalid: $p = $ T, $q = $ F, $r = $ F makes its premises true and $r$ false."),
        opt("C", True, "Arguments 1 and 4 have no counterexample; both can be derived by modus tollens/ponens and disjunctive syllogism."),
        opt("D", False, "Arguments 2 and 3 have counterexamples."),
    ],
    "shortcut": "Arguments 2 and 3 conclude something about $r$ while their premises leave $r$ free (in 2, $p$ = F makes $p \\to r$ true; in 3, $q$ = F makes $(q \\wedge r) \\to p$ true): a free conclusion letter is a quick sign of invalidity.",
    "pitfalls": ["Testing validity by 'the conclusion seems related to the premises' instead of hunting for a counterexample row.", "In argument 1, forgetting that $\\neg s \\to q$ is false only when $s$ = F and $q$ = F."],
    "verification": "Truth tables over $p, q, r, s$: arguments 1 and 4 are tautologies; 2 fails only on $(p, q, r) = $ (F, T, T), 3 only on (T, F, F).",
    "animation": tt("Counterexample search", ["argument", "conclusion F needs", "premises forced", "result"],
                    [["1", "s = F, q = F", "r = F, p = T, ¬p ∨ q = F", "valid"], ["2", "r = T", "p = F, q = T: all T", "invalid"],
                     ["3", "r = F", "q = F, p = T: all T", "invalid"], ["4", "q = F", "r = T, q ∨ ¬r = F", "valid"]],
                    hl=[(0, 3, "success"), (1, 3, "error"), (2, 3, "error"), (3, 3, "success")]),
}

SOLUTIONS["cse-2012-cs-1"] = {
    "approach": "Concept tested: **modus tollens versus the fallacy of denying the antecedent**. Translate both inferences with $r$: it rains, $m$: the match is played. The common premise is $r \\to \\neg m$.",
    "concepts": ["Modus tollens", "Denying the antecedent", "Fallacy"],
    "given": "I1: $r \\to \\neg m$, $m$, therefore $\\neg r$. I2: $r \\to \\neg m$, $\\neg r$, therefore $m$.",
    "steps": [
        {"title": "Inference I1", "body": "The premise $m$ denies the conclusion $\\neg m$ of the implication; going back to $\\neg r$ is **modus tollens**, a valid rule. The only row with $r \\to \\neg m$ and $m$ true is $r = $ F, $m = $ T, where $\\neg r$ is T."},
        {"title": "Inference I2", "body": "The premise $\\neg r$ denies the hypothesis; concluding the negation of the consequent ($m$) is **denying the antecedent**, a fallacy. Counterexample: $r = $ F, $m = $ F (no rain, but the match was cancelled for another reason): both premises true, conclusion false."},
        {"title": "Conclude", "body": "I1 is a correct inference, I2 is not: option B."},
    ],
    "answer": {"value": "I1 is correct but I2 is not a correct inference", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "I2 is denying the antecedent; the row $r = $ F, $m = $ F refutes it."),
        opt("B", True, "I1 is modus tollens (valid); I2 is denying the antecedent (invalid)."),
        opt("C", False, "This reverses the verdicts: I1 is the valid one."),
        opt("D", False, "I1 has no counterexample: its single critical row has $\\neg r$ true."),
    ],
    "shortcut": "From $A \\to B$ you may go forward from $A$ or backward from $\\neg B$. I1 goes backward from $\\neg B$ ($B = \\neg m$, and $m$ denies it); I2 goes forward from $\\neg A$, which is not allowed.",
    "pitfalls": ["Treating 'if it rains the match is not played' as 'the match is not played exactly when it rains' (a biconditional), which would make I2 valid.", "Judging I2 by whether its conclusion sounds plausible."],
    "verification": "Truth table over $r, m$: I1's premises are both true only on (F, T) where $\\neg r$ holds; I2's premises are both true on (F, T) and (F, F), and $m$ fails on (F, F).",
    "animation": tt("The two inferences on the table of r → ¬m", ["r", "m", "r → ¬m", "I1 premises", "I2 premises"],
                    [["T", "T", "F", "-", "-"], ["T", "F", "T", "-", "-"], ["F", "T", "T", "yes: ¬r T", "yes: m T"], ["F", "F", "T", "-", "yes: m F"]],
                    hl=[(2, 3, "success"), (3, 4, "error")]),
}

SOLUTIONS["cse-2015-2-cs-3"] = {
    "approach": "Concept tested: **chaining implications with a contrapositive (hypothetical syllogism)**. Write both statements as implications about one candidate, flip one by contraposition so the middle terms match, and chain.",
    "concepts": ["Contrapositive", "Hypothetical syllogism", "Translation"],
    "given": "S1: corrupt → not elected. S2: kind → elected.",
    "steps": [
        {"title": "Formalise", "body": "$c$: known to be corrupt, $e$: elected, $k$: kind. S1: $c \\to \\neg e$. S2: $k \\to e$."},
        {"title": "Contrapositive of S1", "body": "$c \\to \\neg e \\equiv e \\to \\neg c$ (swap and negate). Now $e$ is a hypothesis."},
        {"title": "Chain", "body": "$k \\to e$ and $e \\to \\neg c$ give $k \\to \\neg c$ by hypothetical syllogism: 'if a person is kind, he is not known to be corrupt'. That is option C."},
        {"title": "Reject the others", "body": "Each other option has a row with S1 and S2 true and the option false: A ($c \\to k$) fails at $c = $ T, $e = $ F, $k = $ F; B ($\\neg c \\to \\neg k$) at $c = $ F, $e = $ T, $k = $ T; D ($\\neg k \\to \\neg c$) at $c = $ T, $e = $ F, $k = $ F."},
    ],
    "answer": {"value": "If a person is kind, he is not known to be corrupt", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$c \\to k$: a corrupt, unelected, unkind candidate satisfies S1 and S2 but not A."),
        opt("B", False, "$\\neg c \\to \\neg k$: a kind, elected, honest candidate satisfies S1 and S2 but breaks it (honest yet kind)."),
        opt("C", True, "$k \\to e$ and $e \\to \\neg c$ chain to $k \\to \\neg c$."),
        opt("D", False, "$\\neg k \\to \\neg c$ is the contrapositive of option A, so it fails with A: a corrupt, unkind, unelected candidate satisfies S1 and S2 but breaks it."),
    ],
    "shortcut": "Combine into one statement: S1 and S2 together say a kind candidate is elected and an elected candidate is not corrupt, so 'kind and corrupt' never happens: $\\neg(k \\wedge c) \\equiv k \\to \\neg c \\equiv c \\to \\neg k$.",
    "pitfalls": ["Chaining without contraposition: $c \\to \\neg e$ and $k \\to e$ do not share a middle term as written.", "Choosing the converse or inverse of the valid conclusion (options B and D)."],
    "verification": "Truth table over $c, e, k$: on every row where S1 and S2 hold, only option C is always true.",
    "animation": eq("Contrapositive, then chain", [
        ("S_1:\\ c \\to \\neg e \\;\\equiv\\; e \\to \\neg c", "contrapositive"),
        ("S_2:\\ k \\to e", "given"),
        ("k \\to e,\\ e \\to \\neg c \\;\\models\\; k \\to \\neg c", "hypothetical syllogism")]),
}

SOLUTIONS["cse-2015-3-cs-24"] = {
    "approach": "Concept tested: **truth-teller/liar reasoning as a biconditional**. A speaker's statement $S$ is true exactly when the speaker is truthful: $t \\leftrightarrow S$. Here $S = (h \\leftrightarrow t)$, so the constraint is $t \\leftrightarrow (h \\leftrightarrow t)$.",
    "concepts": ["Biconditional", "Truth-tellers and liars", "Case analysis"],
    "given": "$t$: the person is Type 1 (truthful); $h$: the coin shows head. Statement: 'head if and only if I am telling the truth'.",
    "steps": [
        {"title": "Type 1 (t = T)", "body": "The statement must be true: $h \\leftrightarrow \\text{T}$, i.e. $h$. Head."},
        {"title": "Type 2 (t = F)", "body": "The statement must be false: $h \\leftrightarrow \\text{F} \\equiv \\neg h$ must be false, so $h$ is true. Head again."},
        {"title": "Evaluate the options", "body": "In both possible worlds the coin is head. A ('head') is true in both; B ('tail') in neither; C ('Type 2 → tail') fails in the world (Type 2, head); D ('Type 1 → tail') fails in (Type 1, head)."},
    ],
    "answer": {"value": "The result is head", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Both consistent worlds, (Type 1, head) and (Type 2, head), have head."),
        opt("B", False, "Tail is impossible: a truth-teller would be stating a falsehood, a liar a truth."),
        opt("C", False, "A Type 2 person can only be in the world with head."),
        opt("D", False, "A Type 1 person's true statement forces head."),
    ],
    "shortcut": "$t \\leftrightarrow (h \\leftrightarrow t) \\equiv h$, because $\\leftrightarrow$ is associative and $t \\leftrightarrow t$ is always true. Any statement of the form 'X iff I am truthful' reveals X.",
    "pitfalls": ["Concluding that the answer depends on the type: the type stays unknown, but the coin does not.", "Forgetting that a liar's statement must be false, not merely 'unreliable'."],
    "verification": "Of the four (type, coin) worlds, exactly (Type 1, head) and (Type 2, head) satisfy $t \\leftrightarrow (h \\leftrightarrow t)$.",
    "animation": tt("Type × coin: keep the worlds where the statement matches the type", ["type", "coin", "h ↔ t", "fits?"],
                    [["Type 1", "head", "T", "yes"], ["Type 1", "tail", "F", "no"], ["Type 2", "head", "F", "yes"], ["Type 2", "tail", "T", "no"]],
                    hl=[(0, 3, "success"), (2, 3, "success"), (1, 3, "error"), (3, 3, "error")]),
}
