"""Teacher-style v2 solutions for the PYQs of dm/01-propositional-logic/01-propositions-connectives.
Every key is re-derived by truth table in l1_01_connectives.py."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from dmlib import opt  # noqa: E402

SOLUTIONS = {}


def tt(title, cols, rows, labels=None, hl=None, caption=None):
    f = {"kind": "table", "title": title, "cols": cols, "rows": rows, "mono": True}
    if labels:
        f["rowLabels"] = labels
    if hl:
        f["hl"] = [{"r": r, "c": c, "tone": t} for r, c, t in hl]
    if caption:
        f["caption"] = caption
    return f


SOLUTIONS["cse-1994-a-3-13"] = {
    "approach": "Concept tested: **logical implication between formulas, decided by truth table**. $A$ implies $B$ exactly when no row makes $A$ true and $B$ false; so look for such a row.",
    "concepts": ["Truth table", "Logical implication", "Biconditional"],
    "given": "Claim: $p \\leftrightarrow q$ does **not** imply $p \\rightarrow \\neg q$.",
    "steps": [
        {"title": "What 'implies' means", "body": "$p \\leftrightarrow q$ implies $p \\to \\neg q$ iff every row where $p \\leftrightarrow q$ is T also has $p \\to \\neg q$ T. One row with T then F is enough to refute it."},
        {"title": "Build the two columns", "body": "Rows TT, TF, FT, FF. $p \\leftrightarrow q$: T, F, F, T. $p \\to \\neg q$ (false only when $p$ = T and $\\neg q$ = F, i.e. $q$ = T): F, T, T, T."},
        {"title": "Find the critical row", "body": "Row TT: $p \\leftrightarrow q$ = T but $p \\to \\neg q$ = F. So the implication fails, and the statement 'does not imply' is **true**."},
    ],
    "answer": {"value": "True ($p \\leftrightarrow q$ is T and $p \\to \\neg q$ is F on the row $p = q =$ T)", "matchesKey": True},
    "shortcut": "To refute 'A implies B', exhibit one row with A true and B false. The row $p = q =$ T makes the biconditional true and $p \\to \\neg q$ = T → F.",
    "pitfalls": ["Reading the question as 'is the biconditional equivalent to the implication': only one direction is asked.", "Forgetting that $p \\to \\neg q$ is false on exactly one row ($p$ = T, $q$ = T)."],
    "verification": "Truth table over $p, q$: the only row with $p \\leftrightarrow q$ = T and $p \\to \\neg q$ = F is TT.",
    "animation": tt("Columns of p ↔ q and p → ¬q", ["p", "q", "p ↔ q", "p → ¬q"],
                    [["T", "T", "T", "F"], ["T", "F", "F", "T"], ["F", "T", "F", "T"], ["F", "F", "T", "T"]], hl=[(0, 2, "success"), (0, 3, "error")]),
}

SOLUTIONS["cse-1995-a-44"] = {
    "approach": "Concept tested: **evaluating a formula from partial information**. Rewrite both the given fact and the target without arrows, list the situations the fact allows, and evaluate the target on each.",
    "concepts": ["Implication", "Truth table", "Indeterminate value"],
    "given": "$\\neg p \\Rightarrow q$ is true. Find the value of $\\neg p \\vee (p \\Rightarrow q)$.",
    "steps": [
        {"title": "Translate the fact", "body": "$\\neg p \\to q \\equiv \\neg\\neg p \\vee q \\equiv p \\vee q$. So $(p, q)$ is TT, TF or FT."},
        {"title": "Simplify the target", "body": "$p \\Rightarrow q \\equiv \\neg p \\vee q$, so $\\neg p \\vee (p \\Rightarrow q) \\equiv \\neg p \\vee q$."},
        {"title": "Evaluate on each allowed situation", "body": "TT: F ∨ T = T. TF: F ∨ F = **F**. FT: T. The value is T in two cases and F in one."},
        {"title": "Conclude", "body": "The information given does not fix the value: it **cannot be determined**."},
    ],
    "answer": {"value": "Cannot be determined", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "True only if $p$ is false or $q$ is true; the allowed situation $p$ = T, $q$ = F makes it false."),
        opt("B", False, "A proposition has exactly one truth value in each situation; 'multiple-valued' is not a truth value."),
        opt("C", False, "It is true in the situations TT and FT, which the fact allows."),
        opt("D", True, "T in two allowed situations, F in the third: the value is not determined."),
    ],
    "shortcut": "Target $\\equiv p \\to q$. Knowing only $p \\vee q$ leaves the row TF possible, where $p \\to q$ fails, and the row FT, where it holds.",
    "pitfalls": ["Assuming the target must be true because it 'contains' the given implication.", "Treating $\\neg p \\Rightarrow q$ as $p \\Rightarrow q$."],
    "verification": "Of the four rows, three satisfy $p \\vee q$; on them the target takes both values.",
    "animation": tt("Allowed situations (¬p → q true)", ["p", "q", "¬p ∨ (p → q)"], [["T", "T", "T"], ["T", "F", "F"], ["F", "T", "T"]], hl=[(1, 2, "error")]),
}

SOLUTIONS["cse-1998-a-5"] = {
    "approach": "Concept tested: **reading 'only if' and forming the converse**. 'p only if q' is $p \\to q$; the converse swaps the sides.",
    "concepts": ["Only if", "Converse", "Implication"],
    "given": "Assertion: 'I stay only if you go'.",
    "steps": [
        {"title": "Formalise", "body": "Let $s$: I stay, $g$: you go. 'I stay only if you go' is $s \\to g$ (staying is impossible without your going)."},
        {"title": "Converse", "body": "Swap the sides: $g \\to s$, 'if you go then I stay'."},
        {"title": "Match the wording", "body": "'I stay if you go' puts 'you go' in the if-clause: that is $g \\to s$. Option A."},
    ],
    "answer": {"value": "I stay if you go", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "'I stay if you go' is $g \\to s$, the converse of $s \\to g$."),
        opt("B", False, "'If I stay then you go' is $s \\to g$, the original assertion itself."),
        opt("C", False, "'If you do not go then I do not stay' is $\\neg g \\to \\neg s$, the contrapositive (equivalent to the original)."),
        opt("D", False, "'If I do not stay then you go' is $\\neg s \\to g$, unrelated to the converse."),
    ],
    "shortcut": "'p only if q' = $p \\to q$; 'p if q' = $q \\to p$. The converse of an only-if sentence is the same sentence with 'only if' replaced by 'if'.",
    "pitfalls": ["Reading 'only if' as 'if', which makes the original look like option A and the converse look like option B."],
    "verification": "$s \\to g$ and $g \\to s$ differ on the row $s$ = F, $g$ = T, so A is not the original; B and C are equivalent to the original.",
}

SOLUTIONS["cse-2002-a-8"] = {
    "approach": "Concept tested: **translating 'unless'**. 'A unless Z' means 'if not Z then A'; here A is the whole promise 'if X then Y'. Then use exportation.",
    "concepts": ["Unless", "Implication", "Exportation"],
    "given": "Sentence: 'If X then Y unless Z'.",
    "steps": [
        {"title": "Bracket the sentence", "body": "The qualifier 'unless Z' applies to the promise 'if X then Y': $(X \\to Y)$ unless $Z$."},
        {"title": "Unless = if not", "body": "$\\neg Z \\to (X \\to Y)$."},
        {"title": "Exportation", "body": "$A \\to (B \\to C) \\equiv (A \\wedge B) \\to C$, so the formula is $(X \\wedge \\neg Z) \\to Y$: option A."},
        {"title": "Check the forbidden situation", "body": "The sentence is broken only when X holds, Z does not, and Y fails. $(X \\wedge \\neg Z) \\to Y$ is false exactly on $X$ = T, $Z$ = F, $Y$ = F."},
    ],
    "answer": {"value": "$(X \\wedge \\neg Z) \\rightarrow Y$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Equals $\\neg Z \\to (X \\to Y)$ by exportation."),
        opt("B", False, "$(X \\wedge Y) \\to \\neg Z$ forbids X, Y and Z together, which the sentence allows."),
        opt("C", False, "$X \\to (Y \\wedge \\neg Z)$ forbids X with Z, but when Z holds the sentence promises nothing."),
        opt("D", False, "$(X \\to Y) \\wedge \\neg Z$ asserts that Z is false, which the sentence never claims."),
    ],
    "shortcut": "Each option forbids certain rows; the sentence forbids only X = T, Y = F, Z = F. Only A is false on exactly that row.",
    "pitfalls": ["Reading 'unless Z' as '∧ ¬Z' (option D).", "Attaching 'unless Z' to Y alone (option C)."],
    "verification": "Truth tables over X, Y, Z: only option A has the single false row (T, F, F).",
}

SOLUTIONS["cse-2006-cs-28"] = {
    "approach": "Concept tested: **an operator defined by a truth table**. Read off its false row to rewrite it with ¬ and ∨, then substitute each option and simplify with De Morgan.",
    "concepts": ["Truth table", "Custom connective", "De Morgan's laws"],
    "given": "$A \\odot B$: TT → T, TF → T, FT → F, FF → T; $\\sim$ is negation.",
    "steps": [
        {"title": "Rewrite the operator", "body": "It is false only at $A$ = F, $B$ = T. The disjunction false exactly there is $A \\vee \\neg B$, so $x \\odot y \\equiv x \\vee \\neg y$."},
        {"title": "Aim for a negated disjunction", "body": "$A \\wedge B \\equiv \\neg(\\neg A \\vee \\neg B)$. We need an option of the form $\\sim(\\dots)$ whose inside is $\\neg A \\vee \\neg B$."},
        {"title": "Evaluate the options", "body": "$\\sim A \\odot B \\equiv \\neg A \\vee \\neg B$ (NAND). $\\sim(A \\odot \\sim B) \\equiv \\neg(A \\vee B)$. $\\sim(\\sim A \\odot \\sim B) \\equiv \\neg(\\neg A \\vee B) \\equiv A \\wedge \\neg B$. $\\sim(\\sim A \\odot B) \\equiv \\neg(\\neg A \\vee \\neg B) \\equiv A \\wedge B$."},
    ],
    "answer": {"value": "$\\sim(\\sim A \\odot B)$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\sim A \\odot B = \\neg A \\vee \\neg B$, the NAND of A and B."),
        opt("B", False, "$\\sim(A \\odot \\sim B) = \\neg(A \\vee B) = \\neg A \\wedge \\neg B$ (NOR)."),
        opt("C", False, "$\\sim(\\sim A \\odot \\sim B) = \\neg(\\neg A \\vee B) = A \\wedge \\neg B$."),
        opt("D", True, "$\\neg(\\neg A \\vee \\neg B) = A \\wedge B$ by De Morgan."),
    ],
    "shortcut": "Test the row A = B = T: only A ∧ B-equivalent options give T there and F on the other three. A gives F at TT, so it is out; D gives T at TT and F elsewhere.",
    "pitfalls": ["Forgetting that $\\sim$ binds tighter than $\\odot$: $\\sim A \\odot B$ is $(\\sim A) \\odot B$.", "Reading the table as an implication $A \\to B$ (it is $B \\to A$)."],
    "verification": "Four-row truth tables of the four options: only D has the column T, F, F, F.",
    "animation": tt("A ⊙ B ≡ A ∨ ¬B", ["A", "B", "A ⊙ B"], [["T", "T", "T"], ["T", "F", "T"], ["F", "T", "F"], ["F", "F", "T"]], hl=[(2, 2, "error")]),
}

SOLUTIONS["cse-2009-cs-24"] = {
    "approach": "Concept tested: **an operator defined by a truth table**. $P \\square Q$ is false only at $P$ = F, $Q$ = T, so $P \\square Q \\equiv P \\vee \\neg Q$; substitute each option.",
    "concepts": ["Truth table", "Custom connective"],
    "given": "$P \\square Q$: TT → T, TF → T, FT → F, FF → T.",
    "steps": [
        {"title": "Rewrite the operator", "body": "The only false row is $P$ = F, $Q$ = T; $P \\vee \\neg Q$ is false exactly there. So $x \\square y \\equiv x \\vee \\neg y$ (which is $y \\to x$)."},
        {"title": "Substitute", "body": "A: $\\neg Q \\vee P$. B: $P \\vee \\neg\\neg Q = P \\vee Q$. C: $\\neg P \\vee \\neg Q$. D: $\\neg P \\vee Q$."},
        {"title": "Pick", "body": "Only B equals $P \\vee Q$."},
    ],
    "answer": {"value": "$P \\square \\neg Q$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\neg Q \\square \\neg P = \\neg Q \\vee P$, i.e. $Q \\to P$."),
        opt("B", True, "$P \\square \\neg Q = P \\vee \\neg\\neg Q = P \\vee Q$."),
        opt("C", False, "$\\neg P \\square Q = \\neg P \\vee \\neg Q$, a NAND."),
        opt("D", False, "$\\neg P \\square \\neg Q = \\neg P \\vee Q$, i.e. $P \\to Q$."),
    ],
    "shortcut": "$P \\vee Q$ is false only at FF. Plug FF into each option: only B gives F.",
    "pitfalls": ["Mistaking $\\square$ for $P \\to Q$; its false row is F, T, so it is $Q \\to P$."],
    "verification": "Truth tables of the four options: only B gives T, T, T, F.",
}

SOLUTIONS["cse-2014-1-cs-53"] = {
    "approach": "Concept tested: **expressing a counting condition ('exactly two true') as a formula**. Split on $r$: if $r$ is true exactly one of $p, q$ is true ($\\neg(p \\leftrightarrow q)$); if $r$ is false both are.",
    "concepts": ["Biconditional", "Exclusive or", "Truth table"],
    "given": "Want: true exactly when two of $p, q, r$ are true (rows TTF, TFT, FTT).",
    "steps": [
        {"title": "Case r = T", "body": "Exactly one of $p, q$ must be T: $p \\oplus q \\equiv \\neg(p \\leftrightarrow q)$. Term: $\\neg(p \\leftrightarrow q) \\wedge r$."},
        {"title": "Case r = F", "body": "Both $p$ and $q$ must be T: $p \\wedge q \\wedge \\neg r$."},
        {"title": "Combine and check boundary rows", "body": "Option B is the disjunction of the two cases. On TTT it gives (F ∧ T) ∨ F = F, on FFF it gives F: correct."},
    ],
    "answer": {"value": "$(\\sim(p \\leftrightarrow q) \\wedge r) \\vee (p \\wedge q \\wedge \\sim r)$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$(p \\leftrightarrow q) \\wedge r$ is true on TTT (three true) and on FFT (one true)."),
        opt("B", True, "Exactly the rows TTF, TFT, FTT."),
        opt("C", False, "$(p \\to q) \\wedge r$ is true on TTT and FFT as well."),
        opt("D", False, "A conjunction that needs both $r$ and $\\sim r$: always false."),
    ],
    "shortcut": "Test the all-true row TTT: options A and C are true there, so they are wrong; D is a contradiction.",
    "pitfalls": ["Checking only the rows with exactly two trues and not the row with three."],
    "verification": "Truth table over $p, q, r$: option B is true exactly on TTF, TFT, FTT.",
    "animation": tt("Option B against 'exactly two'", ["p", "q", "r", "exactly 2", "B"],
                    [["T", "T", "T", "F", "F"], ["T", "T", "F", "T", "T"], ["T", "F", "T", "T", "T"], ["T", "F", "F", "F", "F"],
                     ["F", "T", "T", "T", "T"], ["F", "T", "F", "F", "F"], ["F", "F", "T", "F", "F"], ["F", "F", "F", "F", "F"]],
                    hl=[(1, 4, "success"), (2, 4, "success"), (4, 4, "success")]),
}

SOLUTIONS["cse-2014-3-cs-1"] = {
    "approach": "Concept tested: **contrapositive equivalence**. Write both sentences as implications about one phone; one is the contrapositive of the other, so they are equivalent.",
    "concepts": ["Contrapositive", "Implication", "Translation"],
    "given": "P: good phones are not cheap. Q: cheap phones are not good.",
    "steps": [
        {"title": "Formalise", "body": "For a phone, let $g$: it is good, $c$: it is cheap. P: $g \\to \\neg c$. Q: $c \\to \\neg g$."},
        {"title": "Contrapositive", "body": "The contrapositive of $g \\to \\neg c$ is $\\neg\\neg c \\to \\neg g$, i.e. $c \\to \\neg g$, which is Q."},
        {"title": "Conclude", "body": "P ≡ Q, so P implies Q (L), Q implies P (M), and P is equivalent to Q (N): all three hold."},
    ],
    "answer": {"value": "L, M and N are TRUE", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "M also holds: Q implies P because they are contrapositives."),
        opt("B", False, "L also holds for the same reason."),
        opt("C", False, "Equivalence (N) brings both implications L and M with it."),
        opt("D", True, "P and Q are contrapositives, hence equivalent."),
    ],
    "shortcut": "Both sentences say the same thing: no phone is both good and cheap ($\\neg(g \\wedge c)$).",
    "pitfalls": ["Treating Q as the converse of P: the converse of $g \\to \\neg c$ would be $\\neg c \\to g$."],
    "verification": "$g \\to \\neg c$ and $c \\to \\neg g$ are both $\\neg g \\vee \\neg c$; their truth tables agree on all four rows.",
}

SOLUTIONS["cse-2016-1-cs-1"] = {
    "approach": "Concept tested: **evaluating a formula over a parameter**. Simplify the formula first (De Morgan, $\\neg(p \\to q) \\equiv p \\wedge \\neg q$), then ask which integers make the simplified condition true.",
    "concepts": ["De Morgan's laws", "Negated implication", "Open sentences"],
    "given": "$p$: $x \\in \\{8,9,10,11,12\\}$; $q$: composite; $r$: perfect square; $s$: prime. Find $x \\ge 2$ with $\\neg((p \\Rightarrow q) \\wedge (\\neg r \\vee \\neg s))$.",
    "steps": [
        {"title": "Simplify", "body": "$\\neg(A \\wedge B) = \\neg A \\vee \\neg B$: the formula is $\\neg(p \\to q) \\vee \\neg(\\neg r \\vee \\neg s) = (p \\wedge \\neg q) \\vee (r \\wedge s)$."},
        {"title": "The second disjunct is impossible", "body": "$r \\wedge s$: a perfect square $k^2$ ($k \\ge 2$) has divisor $k$, so it is not prime. Never true."},
        {"title": "The first disjunct", "body": "$p \\wedge \\neg q$: $x$ in 8…12 and not composite; for $x \\ge 2$ that means prime. Only 11."},
    ],
    "answer": {"value": "11", "number": 11, "matchesKey": True},
    "shortcut": "A negated implication $\\neg(p \\to q)$ is $p \\wedge \\neg q$: 'in the range and not composite'.",
    "pitfalls": ["Taking 'not composite' to include 1: the question restricts to $x \\ge 2$.", "Missing that $r \\wedge s$ can never hold."],
    "verification": "Brute force over $x = 2, \\dots, 499$: only $x = 11$ satisfies the formula.",
}

SOLUTIONS["cse-2016-2-cs-1"] = {
    "approach": "Concept tested: **logical implication**. $A$ implies $B$ iff every row making $A$ true makes $B$ true. Simplify $A = P \\wedge (P \\Rightarrow Q)$ first.",
    "concepts": ["Logical implication", "Modus ponens", "Truth table"],
    "given": "$A = P \\wedge (P \\Rightarrow Q)$; candidates: false, $Q$, true, $P \\vee Q$, $\\neg Q \\vee P$.",
    "steps": [
        {"title": "Simplify A", "body": "$P \\wedge (\\neg P \\vee Q) = (P \\wedge \\neg P) \\vee (P \\wedge Q) = P \\wedge Q$. So $A$ is true on exactly one row: $P = Q =$ T."},
        {"title": "Test each candidate on that row", "body": "false: F (not implied). $Q$: T. true: T. $P \\vee Q$: T. $\\neg Q \\vee P$: F ∨ T = T."},
        {"title": "Count", "body": "Four expressions are true on the only row where $A$ is true: **4**."},
    ],
    "answer": {"value": "4", "number": 4, "matchesKey": True},
    "shortcut": "When the premise is true on a single row, implication is just 'is the candidate true on that row?'.",
    "pitfalls": ["Thinking 'false' is implied because $A$ is 'sometimes false': implication needs the candidate true wherever $A$ is.", "Missing 'true', which is implied by everything."],
    "verification": "Truth table over $P, Q$: the candidates true at TT are $Q$, true, $P \\vee Q$, $\\neg Q \\vee P$.",
    "animation": tt("A = P ∧ (P → Q) and the five candidates", ["P", "Q", "A", "F", "Q", "T", "P∨Q", "¬Q∨P"],
                    [["T", "T", "T", "F", "T", "T", "T", "T"], ["T", "F", "F", "F", "F", "T", "T", "T"], ["F", "T", "F", "F", "T", "T", "T", "F"], ["F", "F", "F", "F", "F", "T", "F", "T"]],
                    hl=[(0, 2, "success"), (0, 3, "error"), (0, 4, "success"), (0, 5, "success"), (0, 6, "success"), (0, 7, "success")]),
}

SOLUTIONS["cse-2017-2-cs-11"] = {
    "approach": "Concept tested: **translating a compound English sentence**: split at the main 'and', translate each clause, and read 'X only if Y' as $X \\to Y$.",
    "concepts": ["Translation", "Only if", "Conjunction"],
    "given": "$p$: raining, $q$: cold, $r$: pleasant. 'It is not raining and it is pleasant, and it is not pleasant only if it is raining and it is cold.'",
    "steps": [
        {"title": "First clause", "body": "'It is not raining and it is pleasant': $\\neg p \\wedge r$."},
        {"title": "Second clause", "body": "'It is not pleasant only if it is raining and it is cold': 'X only if Y' is $X \\to Y$, so $\\neg r \\to (p \\wedge q)$."},
        {"title": "Join", "body": "The sentence asserts both: $(\\neg p \\wedge r) \\wedge (\\neg r \\to (p \\wedge q))$, option A."},
        {"title": "A remark on option B", "body": "B writes the second clause as $(p \\wedge q) \\to \\neg r$, the converse. Because the first clause already forces $p$ = F and $r$ = T, A and B happen to have the same truth table as whole formulas (both reduce to $\\neg p \\wedge r$); but B mistranslates the 'only if', and the question asks for the representation of the sentence, so the key is A."},
    ],
    "answer": {"value": "$(\\neg p \\wedge r) \\wedge (\\neg r \\rightarrow (p \\wedge q))$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Clause by clause translation, with 'only if' read as $\\neg r \\to (p \\wedge q)$."),
        opt("B", False, "Reverses the 'only if' in the second clause (it writes the converse). As a whole formula it is equivalent to A here, but it is not the sentence's representation."),
        opt("C", False, "Uses ∨ for the sentence's 'and', and also reverses the 'only if'."),
        opt("D", False, "Uses ∨ for 'and' and translates the second clause as $r \\to (p \\wedge q)$."),
    ],
    "shortcut": "Look for ∧ between the clauses (rules out C, D) and the arrow pointing **from** 'not pleasant' (rules out B).",
    "pitfalls": ["Reading 'X only if Y' as $Y \\to X$.", "Assuming that two options with the same truth table must both be keys in a translation question."],
    "verification": "A parses to exactly $(\\neg p \\wedge r) \\wedge (\\neg r \\to (p \\wedge q))$; truth tables show A ≡ B ≡ $\\neg p \\wedge r$ while C and D differ.",
}

SOLUTIONS["cse-2024-2-cs-2"] = {
    "approach": "Concept tested: **'cannot B when A' is $A \\to \\neg B$**. Identify the condition (the 'when' clause) as the hypothesis and check by the forbidden situation.",
    "concepts": ["Translation", "Implication", "Forbidden situation"],
    "given": "$p$: fail grade can be given; $q$: student scores more than 50%. 'Fail grade cannot be given when student scores more than 50% marks.'",
    "steps": [
        {"title": "Hypothesis and conclusion", "body": "'B when A' is $A \\to B$. The condition is $q$ (scores > 50%); the conclusion is 'fail grade cannot be given', $\\neg p$. So the formula is $q \\to \\neg p$."},
        {"title": "Check", "body": "The sentence forbids exactly one situation: a student above 50% getting a fail grade, $q \\wedge p$. $q \\to \\neg p$ is false exactly when $q$ = T and $p$ = T."},
    ],
    "answer": {"value": "$q \\to \\neg p$", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "False only when $q$ and $p$ are both true: the forbidden situation."),
        opt("B", False, "$q \\to p$ would force a fail grade to be possible for every student above 50%."),
        opt("C", False, "$p \\to q$ says a fail grade can be given only to students above 50%, the opposite rule."),
        opt("D", False, "$\\neg p \\to q$ forbids '$p$ false and $q$ false', unrelated to the sentence."),
    ],
    "shortcut": "The sentence forbids $p \\wedge q$, so the formula is $\\neg(p \\wedge q) \\equiv q \\to \\neg p \\equiv p \\to \\neg q$.",
    "pitfalls": ["Taking the first clause of the English sentence as the hypothesis: in 'B when A' the hypothesis comes second."],
    "verification": "Truth table over $p, q$: only option A is false exactly on $p = q =$ T.",
}
