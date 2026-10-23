"""Teacher-style v2 solutions for the PYQs of dm/01-propositional-logic/02-equivalence-normal-forms.
Every key is re-derived by truth table, brute force or exhaustive search in l1_02_equivalence.py."""
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
    f = {"kind": "equation", "title": title, "lines": [{"tex": t, "note": n} if n else {"tex": t} for t, n in lines]}
    if caption:
        f["caption"] = caption
    return f


SOLUTIONS["cse-1991-a-3-xii"] = {
    "approach": "Concept tested: **what two tautological implications with opposite conclusions force**. If $C \\to D$ and $C \\to \\neg D$ are both tautologies, no row can make $C$ true; apply this with $C = F_1 \\wedge F_2$, then test the other claims with small examples.",
    "concepts": ["Tautology", "Satisfiability", "Implication"],
    "given": "$F_1 \\wedge F_2 \\to F_3$ and $F_1 \\wedge F_2 \\to \\neg F_3$ are both tautologies.",
    "steps": [
        {"title": "Bracket by precedence", "body": "$\\wedge$ binds tighter than $\\to$, so the formulas are $(F_1 \\wedge F_2) \\to F_3$ and $(F_1 \\wedge F_2) \\to \\neg F_3$. Write $C = F_1 \\wedge F_2$."},
        {"title": "Suppose some row makes C true", "body": "Both implications are true on that row (they are tautologies), and their hypothesis $C$ is true, so both conclusions $F_3$ and $\\neg F_3$ are true there. That is impossible."},
        {"title": "Conclude", "body": "No row makes $C$ true: $F_1 \\wedge F_2$ is **unsatisfiable**. (Equivalently: $(C \\to F_3) \\wedge (C \\to \\neg F_3) \\equiv C \\to (F_3 \\wedge \\neg F_3) \\equiv \\neg C$, and this is a tautology.)"},
        {"title": "Test the other claims", "body": "$F_1 = p$, $F_2 = \\neg p$ satisfies the hypothesis: neither is a tautology and both are satisfiable, so A and D fail. $F_1 = p \\vee \\neg p$, $F_2 = p \\wedge \\neg p$ also satisfies it, and now $F_1$ is a tautology, so C fails. Since B holds, E fails."},
    ],
    "answer": {"value": "The conjunction $F_1 \\wedge F_2$ is not satisfiable", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "If both were tautologies, $F_1 \\wedge F_2$ would be true on every row, and then $F_3$ and $\\neg F_3$ would both be true. The opposite is forced."),
        opt("B", True, "A row making $F_1 \\wedge F_2$ true would make both $F_3$ and $\\neg F_3$ true."),
        opt("C", False, "Not forced: $F_1 = p \\vee \\neg p$ (a tautology) with $F_2 = p \\wedge \\neg p$ meets the hypothesis."),
        opt("D", False, "Not forced: $F_1 = p$, $F_2 = \\neg p$ are each satisfiable, yet their conjunction is not."),
        opt("E", False, "B is forced, so 'none of the above' is wrong."),
    ],
    "shortcut": "Absurdity law: $(C \\to D) \\wedge (C \\to \\neg D) \\equiv \\neg C$. Both being tautologies means $\\neg C$ is a tautology, i.e. $C$ is a contradiction.",
    "pitfalls": ["Concluding that each of $F_1$, $F_2$ is unsatisfiable: only their conjunction must be.", "Reading 'neither is tautologous' as a consequence; one of them may well be a tautology."],
    "verification": "Brute force over all functions $F_1, F_2, F_3$ of two variables: whenever both implications are tautologies, $F_1 \\wedge F_2$ is all F, while each of A, C, D has counterexamples.",
    "animation": eqn("The absurdity law at work", [("(C \\to F_3) \\wedge (C \\to \\neg F_3)", "both tautologies"), ("\\equiv C \\to (F_3 \\wedge \\neg F_3)", "conclusion splitting"), ("\\equiv C \\to \\mathrm{F} \\equiv \\neg C", "so ¬C is a tautology")]),
}

SOLUTIONS["cse-1992-a-2-xvi"] = {
    "approach": "Concept tested: **testing tautologies by falsification**. An implication is false only as T → F; for each option, try to make the conclusion false and the hypothesis true. One clean row refutes an option.",
    "concepts": ["Tautology", "Falsification", "Right-associative →"],
    "given": "(a) $a \\vee b \\to b \\wedge c$, (b) $a \\wedge b \\to b \\vee c$, (c) $a \\vee b \\to (b \\to c)$, (d) $a \\to b \\to (b \\to c)$.",
    "steps": [
        {"title": "Option (a)", "body": "Falsify $b \\wedge c$ with $b$ = F; keep $a \\vee b$ true with $a$ = T. Row $a$ = T, $b$ = F, $c$ = F gives T → F = F. Not a tautology."},
        {"title": "Option (b)", "body": "To falsify, $b \\vee c$ = F needs $b$ = F, but the hypothesis $a \\wedge b$ = T needs $b$ = T. Clash: **tautology** (a conjunction implies a disjunction sharing a variable)."},
        {"title": "Option (c)", "body": "$b \\to c$ = F needs $b$ = T, $c$ = F; then $a \\vee b$ = T. Row $a$ = T, $b$ = T, $c$ = F falsifies it."},
        {"title": "Option (d)", "body": "$\\to$ is right-associative: $a \\to (b \\to (b \\to c)) \\equiv \\neg a \\vee \\neg b \\vee c$, false on $a$ = T, $b$ = T, $c$ = F. (Read as $(a \\to b) \\to (b \\to c)$ it fails on $a$ = F, $b$ = T, $c$ = F.) Not a tautology either way."},
    ],
    "answer": {"value": "Only (b)", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Falsified by $a$ = T, $b$ = F, $c$ = F: hypothesis T, conclusion F."),
        opt("B", True, "Falsifying the conclusion forces $b$ = F, which makes the hypothesis false: a clash on every attempt."),
        opt("C", False, "Falsified by $a = b =$ T, $c$ = F."),
        opt("D", False, "Equals $\\neg a \\vee \\neg b \\vee c$; falsified by $a = b =$ T, $c$ = F."),
    ],
    "shortcut": "For $H \\to C$, falsify $C$ first: in (b) that alone forces $b$ = F and kills the hypothesis.",
    "pitfalls": ["Regrouping (d) as $(a \\to b) \\to (b \\to c)$ and then worrying; it is not a tautology under either reading.", "Calling (c) a tautology because $b$ appears on both sides."],
    "verification": "Truth tables over $a, b, c$: (b) is T on all 8 rows; (a), (c), (d) each have a false row.",
}

SOLUTIONS["cse-1993-ii-a-8-2"] = {
    "approach": "Concept tested: **simplifying with the distributive and complement laws**. Distribute $p \\wedge$ over the disjunction; the $p \\wedge \\neg p$ part is F and drops out.",
    "concepts": ["Distributive law", "Complement law", "Logical equivalence"],
    "given": "$p \\wedge (\\sim p \\vee q)$.",
    "steps": [
        {"title": "Distribute", "body": "$p \\wedge (\\neg p \\vee q) \\equiv (p \\wedge \\neg p) \\vee (p \\wedge q)$."},
        {"title": "Complement and identity", "body": "$p \\wedge \\neg p \\equiv \\text{F}$ and $\\text{F} \\vee X \\equiv X$, so the formula is $p \\wedge q$."},
        {"title": "Check the options", "body": "$p \\wedge q$ is true on one row and false on three: not a tautology, not a contradiction, and not $p \\vee q$ (they differ on TF)."},
    ],
    "answer": {"value": "Logically equivalent to $p \\wedge q$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "False on $p$ = F, so not a tautology."),
        opt("B", True, "$p \\wedge (\\neg p \\vee q) \\equiv (p \\wedge \\neg p) \\vee (p \\wedge q) \\equiv p \\wedge q$."),
        opt("C", False, "On $p$ = T, $q$ = F the formula is F but $p \\vee q$ is T."),
        opt("D", False, "True on $p = q =$ T, so not a contradiction."),
        opt("E", False, "B holds, so 'none of the above' is wrong."),
    ],
    "shortcut": "The pattern $p \\wedge (\\neg p \\vee q) \\equiv p \\wedge q$: inside a conjunction with $p$, the literal $\\neg p$ is false and drops out.",
    "pitfalls": ["Applying absorption $p \\wedge (p \\vee q) \\equiv p$ to a formula with $\\neg p$; absorption needs the same literal."],
    "verification": "Columns over TT, TF, FT, FF: the formula gives T, F, F, F, identical to $p \\wedge q$.",
    "animation": tt("p ∧ (¬p ∨ q) against p ∧ q", ["p", "q", "¬p ∨ q", "formula", "p ∧ q"],
                    [["T", "T", "T", "T", "T"], ["T", "F", "F", "F", "F"], ["F", "T", "T", "F", "F"], ["F", "F", "T", "F", "F"]], hl=[(0, 3, "success"), (0, 4, "success")]),
}

SOLUTIONS["cse-1995-b-61"] = {
    "approach": "Concept tested: **principal (canonical) CNF from the truth table**. List the rows where the formula is false; each gives a maxterm, written with a plain literal where the bit is 0 and a negated literal where it is 1.",
    "concepts": ["Principal CNF", "Maxterms", "Truth table"],
    "given": "$(p \\wedge q) \\vee (\\neg q \\wedge r)$, variables in the order $p, q, r$.",
    "steps": [
        {"title": "Find the true rows", "body": "$p \\wedge q$ is true on 111 and 110; $\\neg q \\wedge r$ is true on 101 and 001. True rows: 7, 6, 5, 1, so the formula is $\\Sigma(1, 5, 6, 7)$."},
        {"title": "The false rows", "body": "The remaining rows are 000, 010, 011, 100: indices 0, 2, 3, 4."},
        {"title": "Write the maxterms", "body": "Plain = 0, negated = 1: $M_0 = p \\vee q \\vee r$, $M_2 = p \\vee \\neg q \\vee r$, $M_3 = p \\vee \\neg q \\vee \\neg r$, $M_4 = \\neg p \\vee q \\vee r$."},
        {"title": "Multiply them", "body": "PCNF $= (p \\vee q \\vee r)(p \\vee \\neg q \\vee r)(p \\vee \\neg q \\vee \\neg r)(\\neg p \\vee q \\vee r) = \\Pi(0, 2, 3, 4)$."},
    ],
    "answer": {"value": "$(p \\vee q \\vee r)(p \\vee \\neg q \\vee r)(p \\vee \\neg q \\vee \\neg r)(\\neg p \\vee q \\vee r) = \\Pi(0, 2, 3, 4)$", "matchesKey": True},
    "shortcut": "PCNF indices are the complement of the PDNF indices: find the 4 true rows (easy here), and the other 4 rows are the maxterms.",
    "pitfalls": ["Writing a maxterm with the minterm rule (plain = 1): row 100 would then wrongly become $p \\vee \\neg q \\vee \\neg r$.", "Leaving a clause without all three variables; that is a CNF, but not the principal one."],
    "verification": "The product of the four clauses has the same 8-row column as the formula (checked by script), and each clause is false on exactly its own row.",
    "animation": tt("Rows of (p ∧ q) ∨ (¬q ∧ r)", ["p", "q", "r", "f", "#", "term"],
                    [["T", "T", "T", "T", "7", "m7"], ["T", "T", "F", "T", "6", "m6"], ["T", "F", "T", "T", "5", "m5"], ["T", "F", "F", "F", "4", "M4"],
                     ["F", "T", "T", "F", "3", "M3"], ["F", "T", "F", "F", "2", "M2"], ["F", "F", "T", "T", "1", "m1"], ["F", "F", "F", "F", "0", "M0"]],
                    hl=[(3, 5, "error"), (4, 5, "error"), (5, 5, "error"), (7, 5, "error")]),
}

SOLUTIONS["cse-1996-a-28"] = {
    "approach": "Concept tested: **recognising tautologies by simplification and falsification**. 'False' here means 'not a tautology': find the option that some row makes false.",
    "concepts": ["Tautology", "Implication laws", "Falsification"],
    "given": "Four formulas in $x, y$; find the one that is not always true.",
    "steps": [
        {"title": "Option A", "body": "$((x \\to y) \\wedge x) \\to y$ is modus ponens: falsifying $y$ and keeping $x$ true makes $x \\to y$ false. Clash: tautology."},
        {"title": "Option B", "body": "$(\\neg x \\to y) \\wedge (\\neg x \\to \\neg y) \\equiv \\neg x \\to (y \\wedge \\neg y) \\equiv \\neg\\neg x \\equiv x$ (absurdity), so B is $x \\to x$: tautology."},
        {"title": "Option C", "body": "$x \\to (x \\vee y)$: falsifying the conclusion needs $x$ = F, which makes the hypothesis false. Tautology."},
        {"title": "Option D", "body": "$\\neg x \\to \\neg y \\equiv x \\vee \\neg y$, so D is $(x \\vee y) \\leftrightarrow (x \\vee \\neg y)$. On $x$ = F, $y$ = T: left T, right F, so D is F."},
    ],
    "answer": {"value": "$((x \\vee y) \\leftrightarrow (\\neg x \\rightarrow \\neg y))$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Modus ponens; it is a tautology, so it is not the false one."),
        opt("B", False, "By absurdity the hypothesis is equivalent to $x$, giving $x \\to x$: a tautology."),
        opt("C", False, "Addition: a formula implies its disjunction with anything. A tautology."),
        opt("D", True, "Equivalent to $x$ (both sides agree exactly when $x$ is T), so it is false whenever $x$ = F."),
    ],
    "shortcut": "Try $x$ = F in D: $(x \\vee y)$ becomes $y$ and $\\neg x \\to \\neg y$ becomes $\\neg y$, and $y \\leftrightarrow \\neg y$ is always F.",
    "pitfalls": ["Thinking B is false because its two hypotheses 'contradict': they only force $x$ = T, which is what B concludes."],
    "verification": "Truth tables over $x, y$: A, B, C are T on all four rows; D is F on FT and FF.",
}

SOLUTIONS["cse-1997-a-17"] = {
    "approach": "Concept tested: **finding the tautology by falsification**. For each option try to build a falsifying row; the one where every attempt clashes is the tautology.",
    "concepts": ["Tautology", "Falsification", "Excluded middle"],
    "given": "(A) $(p \\vee q) \\to p$, (B) $p \\vee (q \\to p)$, (C) $p \\vee (p \\to q)$, (D) $p \\to (p \\to q)$.",
    "steps": [
        {"title": "Option C", "body": "A false disjunction needs both parts F: $p$ = F and $p \\to q$ = F. But $p \\to q$ = F needs $p$ = T. Clash, so C is a tautology: it is $p \\vee \\neg p \\vee q$."},
        {"title": "Options A and B", "body": "A: $p$ = F, $q$ = T gives T → F. B: $p$ = F needs $q \\to p$ = F, i.e. $q$ = T: row $p$ = F, $q$ = T falsifies B too."},
        {"title": "Option D", "body": "$p \\to (p \\to q) \\equiv \\neg p \\vee q$, false on $p$ = T, $q$ = F."},
    ],
    "answer": {"value": "$p \\vee (p \\to q)$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Falsified by $p$ = F, $q$ = T."),
        opt("B", False, "$p \\vee \\neg q \\vee p$; falsified by $p$ = F, $q$ = T."),
        opt("C", True, "$p \\vee \\neg p \\vee q$ contains $p \\vee \\neg p$: always true."),
        opt("D", False, "Equivalent to $p \\to q$; falsified by $p$ = T, $q$ = F."),
    ],
    "shortcut": "Rewrite each as a single clause: look for a variable and its negation in the same clause. Only C has $p$ and $\\neg p$.",
    "pitfalls": ["Choosing D because it 'repeats p': exportation turns it into $(p \\wedge p) \\to q = p \\to q$."],
    "verification": "Truth tables over $p, q$: only C is T on all four rows.",
}

SOLUTIONS["cse-1999-b-62-a"] = {
    "approach": "Concept tested: **showing a formula is not a tautology by exhibiting one falsifying row**. Make the conclusion false, then check the hypothesis can still be true.",
    "concepts": ["Tautology", "Falsification", "Converse"],
    "given": "$(\\sim p \\vee q) \\Rightarrow (q \\Rightarrow p)$.",
    "steps": [
        {"title": "Falsify the conclusion", "body": "$q \\Rightarrow p$ is false only when $q$ = T and $p$ = F."},
        {"title": "Check the hypothesis on that row", "body": "$\\sim p \\vee q = \\text{T} \\vee \\text{T} = $ T. No clash."},
        {"title": "Conclude", "body": "On $p$ = F, $q$ = T the formula is T ⇒ F = F, so it is not a tautology. (It says $(p \\to q) \\to (q \\to p)$: an implication does not imply its converse.)"},
    ],
    "answer": {"value": "$p$ = F, $q$ = T makes the formula false, so it is not a tautology", "matchesKey": True},
    "shortcut": "$\\sim p \\vee q$ is $p \\to q$; the formula claims every implication implies its converse, and the row $p$ = F, $q$ = T separates them.",
    "pitfalls": ["Trying to prove the formula by laws: laws cannot show a non-equivalence; a single row is the proof."],
    "verification": "Of the four rows only FT makes the formula false (TT, TF, FF give T).",
    "animation": tt("The only falsifying row", ["p", "q", "¬p ∨ q", "q → p", "formula"],
                    [["T", "T", "T", "T", "T"], ["T", "F", "F", "T", "T"], ["F", "T", "T", "F", "F"], ["F", "F", "T", "T", "T"]], hl=[(2, 4, "error")]),
}

SOLUTIONS["cse-1999-b-62-b"] = {
    "approach": "Concept tested: **the definition of tautology applied row by row**. A tautology is true under every assignment; a disjunction with a true part is true.",
    "concepts": ["Tautology", "Disjunction", "Proof over all assignments"],
    "given": "$A$ is a tautology and $B$ is any formula. Show $A \\vee B$ is a tautology.",
    "steps": [
        {"title": "Fix an arbitrary assignment", "body": "Let $v$ be any assignment of truth values to all variables of $A$ and $B$."},
        {"title": "Use the hypothesis", "body": "$A$ is a tautology, so $v(A)$ = T."},
        {"title": "Evaluate the disjunction", "body": "$v(A \\vee B) = \\text{T} \\vee v(B) = $ T, whatever $v(B)$ is."},
        {"title": "Generalise", "body": "Since $v$ was arbitrary, $A \\vee B$ is true under every assignment: it is a tautology."},
    ],
    "answer": {"value": "Under every assignment $A$ is T, hence $A \\vee B$ is T: $A \\vee B$ is a tautology", "matchesKey": True},
    "shortcut": "Domination law: $A \\equiv \\text{T}$, so $A \\vee B \\equiv \\text{T} \\vee B \\equiv \\text{T}$.",
    "pitfalls": ["Proving it for one example $B$ only: the argument must work for an arbitrary $B$.", "Extending the claim to $A \\wedge B$, which is a tautology only if $B$ is."],
    "verification": "Checked over all 16 two-variable functions: whenever $A$'s column is all T, the column of $A \\vee B$ is all T for every $B$.",
}

SOLUTIONS["cse-2000-a-2-7"] = {
    "approach": "Concept tested: **replacement of equivalents under given facts**. Use $a \\leftrightarrow (b \\vee \\neg b)$ to replace $a$ by T and $b \\leftrightarrow c$ to replace $c$ by $b$; the formula collapses to a tautology.",
    "concepts": ["Replacement of equivalents", "Excluded middle", "Precedence"],
    "given": "$a \\leftrightarrow (b \\vee \\neg b)$ and $b \\leftrightarrow c$ hold. Value of $(a \\wedge b) \\to (a \\wedge c) \\vee d$?",
    "steps": [
        {"title": "Bracket by precedence", "body": "$\\wedge$, then $\\vee$, then $\\to$: the formula is $(a \\wedge b) \\to ((a \\wedge c) \\vee d)$."},
        {"title": "Use the first fact", "body": "$b \\vee \\neg b$ is always T, so $a$ is T. The formula becomes $b \\to (c \\vee d)$ (identity law $\\text{T} \\wedge X \\equiv X$)."},
        {"title": "Use the second fact", "body": "$b$ and $c$ have the same value, so replace $c$ by $b$: $b \\to (b \\vee d) \\equiv \\neg b \\vee b \\vee d$."},
        {"title": "Conclude", "body": "$\\neg b \\vee b$ is T, so the formula is always **true** in every situation allowed by the facts."},
    ],
    "answer": {"value": "True", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "After the replacements the formula is $b \\to (b \\vee d)$, a tautology."),
        opt("B", False, "It is never false under the facts."),
        opt("C", False, "When $b$ is F the formula is still T, so it does not follow $b$."),
        opt("D", False, "When $d$ is F the formula is still T, so it does not follow $d$."),
    ],
    "shortcut": "The facts give $a$ = T and $c = b$; a formula of the form $b \\to (b \\vee \\dots)$ is the addition tautology.",
    "pitfalls": ["Reading the formula as $((a \\wedge b) \\to (a \\wedge c)) \\vee d$; with → lowest it is $(a \\wedge b) \\to (\\dots \\vee d)$ (the answer is T either way here, but the habit matters)."],
    "verification": "Over all 16 assignments of $a, b, c, d$, the 4 that satisfy both facts ($a$ = T, $b = c$) all make the formula T.",
}

SOLUTIONS["cse-2001-a-3"] = {
    "approach": "Concept tested: **satisfiable versus valid**. Simplify each formula with $X \\Rightarrow Y \\equiv \\neg X \\vee Y$ and read off its column.",
    "concepts": ["Satisfiable", "Valid", "Implication law"],
    "given": "$F1 = P \\Rightarrow \\neg P$, $F2 = (P \\Rightarrow \\neg P) \\vee (\\neg P \\Rightarrow P)$.",
    "steps": [
        {"title": "Simplify F1", "body": "$P \\Rightarrow \\neg P \\equiv \\neg P \\vee \\neg P \\equiv \\neg P$: true when $P$ = F, false when $P$ = T. Satisfiable, not valid."},
        {"title": "Simplify F2", "body": "$\\neg P \\Rightarrow P \\equiv P \\vee P \\equiv P$, so $F2 \\equiv \\neg P \\vee P$: valid (a tautology)."},
        {"title": "Match the options", "body": "'F1 is satisfiable, F2 is valid' states both facts precisely."},
    ],
    "answer": {"value": "F1 is satisfiable, F2 is valid", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "$F1 \\equiv \\neg P$ is satisfiable (by $P$ = F); $F2 \\equiv \\neg P \\vee P$ is valid."),
        opt("B", False, "F1 is satisfiable: $P$ = F makes $P \\Rightarrow \\neg P$ true (F ⇒ T)."),
        opt("C", False, "Same error as B: F1 is not unsatisfiable."),
        opt("D", False, "Literally true (a valid formula is satisfiable), but it understates F2; the keyed, precise answer is A."),
    ],
    "shortcut": "$X \\Rightarrow \\neg X$ just says '$X$ is false', which can happen; $(X \\Rightarrow \\neg X) \\vee (\\neg X \\Rightarrow X)$ is $\\neg X \\vee X$.",
    "pitfalls": ["Treating $P \\Rightarrow \\neg P$ as a contradiction.", "Forgetting that every valid formula is also satisfiable, which makes D technically true; GATE keys the most precise statement."],
    "verification": "Columns over $P$ = T, F: F1 gives F, T; F2 gives T, T.",
}

SOLUTIONS["cse-2002-b-53-b"] = {
    "approach": "Concept tested: **classifying formulas as tautology, contradiction or contingency**. Simplify with idempotence and De Morgan; to show 'neither', exhibit one true and one false row.",
    "concepts": ["Tautology", "Contradiction", "Contingency"],
    "given": "(i) $A \\leftrightarrow (A \\vee A)$, (ii) $(A \\vee B) \\rightarrow B$, (iii) $A \\wedge (\\neg(A \\vee B))$.",
    "steps": [
        {"title": "Formula (i)", "body": "Idempotence: $A \\vee A \\equiv A$, so the formula is $A \\leftrightarrow A$, true on every row: **tautology**."},
        {"title": "Formula (ii)", "body": "$A$ = T, $B$ = F gives $(\\text{T}) \\to \\text{F}$ = F; $B$ = T gives T. Both values occur: **neither** (a contingency)."},
        {"title": "Formula (iii)", "body": "De Morgan: $\\neg(A \\vee B) \\equiv \\neg A \\wedge \\neg B$, so the formula is $A \\wedge \\neg A \\wedge \\neg B$, false on every row: **contradiction**."},
    ],
    "answer": {"value": "(i) tautology; (ii) neither; (iii) contradiction", "matchesKey": True},
    "shortcut": "(ii) is 'from $A \\vee B$ conclude $B$', which fails when only $A$ holds.",
    "pitfalls": ["Calling (ii) a contradiction because it is not a tautology; it is true whenever $B$ is true."],
    "verification": "Truth tables: (i) T, T; (ii) T, F, T, T over TT, TF, FT, FF; (iii) F on all four rows.",
}

SOLUTIONS["cse-2004-cs-70"] = {
    "approach": "Concept tested: **satisfiable but not valid (contingency)**. Find one row that falsifies the formula and one that satisfies it.",
    "concepts": ["Contingency", "Falsification", "Satisfiable"],
    "given": "$(P \\to (Q \\vee R)) \\to ((P \\vee Q) \\to R)$.",
    "steps": [
        {"title": "Falsify the conclusion", "body": "$(P \\vee Q) \\to R$ = F needs $P \\vee Q$ = T and $R$ = F."},
        {"title": "Keep the hypothesis true", "body": "Take $P$ = F, $Q$ = T, $R$ = F: $P \\to (Q \\vee R)$ = F → T = T. So the formula is T → F = F: **not valid**."},
        {"title": "Find a satisfying row", "body": "With $R$ = T the conclusion is T, so the whole formula is T: **satisfiable**."},
    ],
    "answer": {"value": "Satisfiable but not valid", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "False on $P$ = F, $Q$ = T, $R$ = F and true whenever $R$ = T."),
        opt("B", False, "The row $P$ = F, $Q$ = T, $R$ = F falsifies it."),
        opt("C", False, "Any row with $R$ = T satisfies it."),
        opt("D", False, "A describes it exactly."),
    ],
    "shortcut": "A conclusion that is a bare $R$ (after the arrow) can always be made true, so the formula is satisfiable; then one falsifying row settles it.",
    "pitfalls": ["Trying $P$ = T first: then the hypothesis needs $Q \\vee R$, and with $R$ = F you need $Q$ = T, which also works (TTF), but missing the easy row wastes time."],
    "verification": "Truth table over $P, Q, R$: false on TTF and FTF, true on the other six rows.",
}

SOLUTIONS["cse-2005-cs-40"] = {
    "approach": "Concept tested: **implication between formulas versus equivalence, via hypothesis splitting**. $X \\equiv (P \\to R) \\wedge (Q \\to R)$ and $Y \\equiv (P \\to R) \\vee (Q \\to R)$; a conjunction implies the disjunction of the same parts, not conversely.",
    "concepts": ["Logical implication", "Hypothesis splitting", "Equivalence"],
    "given": "$X = (P \\vee Q) \\to R$, $Y = (P \\to R) \\vee (Q \\to R)$.",
    "steps": [
        {"title": "Rewrite X", "body": "$(P \\vee Q) \\to R \\equiv \\neg(P \\vee Q) \\vee R \\equiv (\\neg P \\wedge \\neg Q) \\vee R \\equiv (\\neg P \\vee R) \\wedge (\\neg Q \\vee R) = (P \\to R) \\wedge (Q \\to R)$."},
        {"title": "X → Y", "body": "$(A \\wedge B) \\to (A \\vee B)$ is a tautology, with $A = P \\to R$, $B = Q \\to R$. So B is correct."},
        {"title": "Refute the others", "body": "$P$ = T, $Q$ = F, $R$ = F: $Y$ = T ($Q \\to R$ is T), $X$ = F. So $Y \\to X$ fails and $X \\not\\equiv Y$. $P = Q =$ T, $R$ = F: $\\neg Y$ = T, $X$ = F, so $\\neg Y \\to X$ fails."},
    ],
    "answer": {"value": "$X \\rightarrow Y$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$X$ and $Y$ differ on $P$ = T, $Q$ = F, $R$ = F."),
        opt("B", True, "$X$ is the conjunction of the two implications, $Y$ their disjunction."),
        opt("C", False, "The row $P$ = T, $Q$ = F, $R$ = F has $Y$ = T and $X$ = F."),
        opt("D", False, "On $P = Q =$ T, $R$ = F, $\\neg Y$ is T but $X$ is F."),
    ],
    "shortcut": "Also $Y \\equiv (P \\wedge Q) \\to R$. A weaker hypothesis ($P \\vee Q$) in $X$ makes $X$ the stronger statement, and the stronger implies the weaker.",
    "pitfalls": ["Splitting the hypothesis with the same connective: $(P \\vee Q) \\to R$ is an **and** of implications, not an or."],
    "verification": "Truth tables over $P, Q, R$: $X \\to Y$ is T on all 8 rows; each other option has a false row.",
}

SOLUTIONS["cse-2006-cs-27"] = {
    "approach": "Concept tested: **hypothesis splitting** — on the left of an arrow, ∧ and ∨ swap. Both P1 and P2 keep the connective instead of swapping it, so find a row where each pair of sides differs.",
    "concepts": ["Hypothesis splitting", "Tautology", "Counterexample"],
    "given": "P1: $((A \\wedge B) \\to C) \\equiv ((A \\to C) \\wedge (B \\to C))$. P2: $((A \\vee B) \\to C) \\equiv ((A \\to C) \\vee (B \\to C))$.",
    "steps": [
        {"title": "The correct laws", "body": "$(A \\wedge B) \\to C \\equiv \\neg A \\vee \\neg B \\vee C \\equiv (A \\to C) \\vee (B \\to C)$, and $(A \\vee B) \\to C \\equiv (A \\to C) \\wedge (B \\to C)$. P1 and P2 have the connectives swapped."},
        {"title": "Refute P1", "body": "$A$ = T, $B$ = F, $C$ = F: left $(\\text{F}) \\to \\text{F}$ = T; right $(\\text{T} \\to \\text{F}) \\wedge (\\text{F} \\to \\text{F})$ = F. The biconditional is F."},
        {"title": "Refute P2", "body": "Same row: left $(\\text{T}) \\to \\text{F}$ = F; right $(\\text{F}) \\vee (\\text{T})$ = T. The biconditional is F."},
    ],
    "answer": {"value": "Both P1 and P2 are not tautologies", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "P1 fails on $A$ = T, $B$ = F, $C$ = F."),
        opt("B", False, "P2 fails on the same row."),
        opt("C", False, "Neither is a tautology."),
        opt("D", True, "Each has the ∧/∨ on its right side swapped; one row refutes both."),
    ],
    "shortcut": "Remember 'on the left, ∧ and ∨ swap'. Seeing the same connective on both sides is enough to suspect both, and the row T, F, F confirms it.",
    "pitfalls": ["Distributing the arrow over the hypothesis as if it were multiplication."],
    "verification": "Truth tables over $A, B, C$: each biconditional is false on TFF and FTF.",
    "animation": tt("The row A = T, B = F, C = F", ["formula", "left", "right"],
                    [["P1", "T", "F"], ["P2", "F", "T"]], hl=[(0, 2, "error"), (1, 2, "error")]),
}

SOLUTIONS["cse-2007-cs-48"] = {
    "approach": "Concept tested: **a guarantee for every CNF: some assignment satisfies at least half the clauses**. Pair any assignment with its complement: every non-empty clause is true under at least one of the two.",
    "concepts": ["CNF", "Satisfiability", "Complement argument"],
    "given": "Statements about every formula in conjunctive normal form.",
    "steps": [
        {"title": "Refute B", "body": "$p \\wedge \\neg p$ is a CNF with two clauses and no assignment satisfies both. So not every CNF is satisfiable."},
        {"title": "Prove A", "body": "Take any assignment $\\tau$ and its complement $\\bar\\tau$. A clause false under $\\tau$ has all literals false, so all of them are true under $\\bar\\tau$. Hence every clause is true under $\\tau$ or $\\bar\\tau$; if $\\tau$ satisfies $s$ of $m$ clauses, $\\bar\\tau$ satisfies at least $m - s$, and one of them gets $\\ge m/2$."},
        {"title": "Refute C and D", "body": "C says some CNF has at most a quarter of its clauses true under every assignment; A gives an assignment with at least half. So C is false, and D ('none') is false since A holds."},
    ],
    "answer": {"value": "For any formula, some assignment makes at least half the clauses true", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "An assignment and its complement together satisfy every clause, so one satisfies at least half."),
        opt("B", False, "$p \\wedge \\neg p$ is an unsatisfiable CNF."),
        opt("C", False, "Contradicts A: half is more than a quarter."),
        opt("D", False, "A is true."),
    ],
    "shortcut": "Averaging: a random assignment satisfies each clause with probability at least 1/2, so the expected number is at least $m/2$, and some assignment reaches the average.",
    "pitfalls": ["Confusing 'some assignment satisfies half' with 'every assignment satisfies half' ($p \\wedge q \\wedge r$ with all F satisfies none)."],
    "verification": "Exhaustive check over all clause sets on two variables and 6000 random clause lists on three and four variables: the best assignment always satisfies at least half.",
}

SOLUTIONS["cse-2008-cs-31"] = {
    "approach": "Concept tested: **equivalence by canonical forms**. Write each expression as a minterm list over $(P, Q)$; equal lists mean equivalent formulas.",
    "concepts": ["Minterms", "De Morgan's laws", "Logical equivalence"],
    "given": "I. $P \\vee \\sim Q$; II. $\\sim(\\sim P \\wedge Q)$; III. $PQ \\vee P\\sim Q \\vee \\sim P \\sim Q$; IV. $PQ \\vee P\\sim Q \\vee \\sim PQ$.",
    "steps": [
        {"title": "Expression I", "body": "$P \\vee \\neg Q$ is false only when $P$ = F and $Q$ = T (row 01 = 1). So I = $\\Sigma(0, 2, 3)$."},
        {"title": "Expression II", "body": "De Morgan: $\\neg(\\neg P \\wedge Q) \\equiv P \\vee \\neg Q$, the same as I."},
        {"title": "III and IV", "body": "III lists minterms 11, 10, 00 = $\\Sigma(3, 2, 0)$, equal to I. IV lists 11, 10, 01 = $\\Sigma(1, 2, 3)$, which is $P \\vee Q$."},
    ],
    "answer": {"value": "Only I, II and III", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "III also equals I: it lists exactly the rows where $P \\vee \\neg Q$ is true."),
        opt("B", True, "I, II, III all have minterms {0, 2, 3}."),
        opt("C", False, "IV is $\\Sigma(1, 2, 3) = P \\vee Q$, true on row 01 where I is false."),
        opt("D", False, "IV differs from the others on rows 00 and 01."),
    ],
    "shortcut": "III is missing only the minterm $\\neg P Q$, so it is $\\neg(\\neg P \\wedge Q)$, which is II.",
    "pitfalls": ["Simplifying IV as $P \\vee \\neg Q$ by misreading $\\sim PQ$ as $\\sim(PQ)$."],
    "verification": "Columns over TT, TF, FT, FF: I, II, III give T, T, F, T; IV gives T, T, T, F.",
    "animation": tt("Minterm lists over (P, Q)", ["expr", "Σ"], [["I", "0, 2, 3"], ["II", "0, 2, 3"], ["III", "0, 2, 3"], ["IV", "1, 2, 3"]], hl=[(3, 1, "error")]),
}

SOLUTIONS["it-2008-it-1"] = {
    "approach": "Concept tested: **functional completeness via Post's classes**. A set is complete only if it escapes each of the five classes; a set whose every connective preserves T cannot build ¬.",
    "concepts": ["Functional completeness", "Post's classes", "EX-NOR"],
    "given": "Sets: EX-NOR; {implication, negation}; {OR, negation}; NAND.",
    "steps": [
        {"title": "The standard complete sets", "body": "$\\{\\neg, \\vee\\}$ is complete (De Morgan gives $\\wedge$); $\\{\\to, \\neg\\}$ is complete since $p \\vee q \\equiv \\neg p \\to q$; NAND is complete since $\\neg p = p \\uparrow p$ and $p \\wedge q = (p \\uparrow q) \\uparrow (p \\uparrow q)$."},
        {"title": "The all-T test on EX-NOR", "body": "$\\text{T} \\leftrightarrow \\text{T} = \\text{T}$, so EX-NOR preserves T (class $T_1$); every formula built from it is T on the all-T row and $\\neg p$ cannot be built."},
        {"title": "Conclude", "body": "EX-NOR alone is not functionally complete. (It is also affine, a second reason.)"},
    ],
    "answer": {"value": "EX-NOR", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "EX-NOR preserves T and is affine; it cannot build ¬ or ∧."),
        opt("B", False, "Complete: $\\neg p \\to q \\equiv p \\vee q$, and $\\{\\neg, \\vee\\}$ is complete."),
        opt("C", False, "Complete: $p \\wedge q \\equiv \\neg(\\neg p \\vee \\neg q)$."),
        opt("D", False, "NAND alone is complete."),
    ],
    "shortcut": "Plug all-T into each connective: EX-NOR returns T, so it is trapped in $T_1$.",
    "pitfalls": ["Thinking EX-NOR is complete because XOR-type gates are 'universal' in some circuits; adding ¬ still leaves it affine."],
    "verification": "Post class membership computed by script: EX-NOR lies in $T_1$ and affine; each of B, C, D escapes all five classes.",
}

SOLUTIONS["cse-2014-2-cs-53"] = {
    "approach": "Concept tested: **finding the non-tautology by falsification**. For each option falsify the conclusion and see whether the hypothesis can stay true.",
    "concepts": ["Tautology", "Falsification", "Hypothetical syllogism"],
    "given": "(A) $((a \\to b) \\wedge (b \\to c)) \\to (a \\to c)$, (B) $(a \\leftrightarrow c) \\to (\\sim b \\to (a \\wedge c))$, (C) $(a \\wedge b \\wedge c) \\to (c \\vee a)$, (D) $a \\to (b \\to a)$.",
    "steps": [
        {"title": "Option A", "body": "$a \\to c$ = F forces $a$ = T, $c$ = F; then $a \\to b$ = T forces $b$ = T and $b \\to c$ = T forces $c$ = T. Clash: tautology."},
        {"title": "Option B", "body": "Falsify $\\sim b \\to (a \\wedge c)$: $b$ = F and $a \\wedge c$ = F. Then $a \\leftrightarrow c$ = T with $a = c =$ F. No clash: the row $a = b = c =$ F makes B false."},
        {"title": "Options C and D", "body": "C: $c \\vee a$ = F needs $a = c =$ F, but the hypothesis needs both T. D: $b \\to a$ = F needs $a$ = F, but the hypothesis needs $a$ = T. Both clash: tautologies."},
    ],
    "answer": {"value": "(B) is not a tautology", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Hypothetical syllogism; falsifying it forces $c$ to be both T and F."),
        opt("B", True, "False on $a = b = c =$ F: hypothesis F ↔ F = T, conclusion T → F = F."),
        opt("C", False, "A conjunction implies a disjunction of some of its parts: a tautology."),
        opt("D", False, "$a \\to (b \\to a) \\equiv \\neg a \\vee \\neg b \\vee a$: a tautology."),
    ],
    "shortcut": "In B the hypothesis $a \\leftrightarrow c$ is satisfied by $a = c =$ F, which also kills $a \\wedge c$; with $b$ = F the conclusion fails.",
    "pitfalls": ["Assuming a biconditional hypothesis forces its sides true; F ↔ F is T."],
    "verification": "Truth tables over $a, b, c$: A, C, D are T on all 8 rows; B is F on FFF only.",
    "animation": tt("Falsifying option B", ["a", "b", "c", "a ↔ c", "¬b → (a ∧ c)", "B"], [["F", "F", "F", "T", "F", "F"]], hl=[(0, 5, "error")]),
}

SOLUTIONS["cse-2015-1-cs-14"] = {
    "approach": "Concept tested: **the equivalent forms of the biconditional**. $p \\leftrightarrow q$ is true exactly when $p$ and $q$ agree; the option true when they differ is XOR, its negation.",
    "concepts": ["Biconditional", "Implication law", "Exclusive or"],
    "given": "Find the option NOT equivalent to $p \\leftrightarrow q$.",
    "steps": [
        {"title": "The implication form", "body": "$p \\leftrightarrow q \\equiv (p \\to q) \\wedge (q \\to p) \\equiv (\\neg p \\vee q) \\wedge (p \\vee \\neg q)$: option A; B is A with $q \\to p$ left unrewritten."},
        {"title": "The agreement form", "body": "True exactly on TT and FF: $(p \\wedge q) \\vee (\\neg p \\wedge \\neg q)$, option D."},
        {"title": "The odd one out", "body": "Option C, $(\\neg p \\wedge q) \\vee (p \\wedge \\neg q)$, is true exactly on FT and TF: it is $p \\oplus q = \\neg(p \\leftrightarrow q)$."},
    ],
    "answer": {"value": "$(\\neg p \\wedge q) \\vee (p \\wedge \\neg q)$", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$(p \\to q) \\wedge (q \\to p)$ written as clauses: equivalent."),
        opt("B", False, "Same as A with the second clause kept as $q \\to p$: equivalent."),
        opt("C", True, "Lists the rows where $p, q$ differ: XOR, the negation of $p \\leftrightarrow q$."),
        opt("D", False, "Lists the rows where $p, q$ agree: equivalent."),
    ],
    "shortcut": "Test the row $p = q =$ T: A, B, D are T there, C is F.",
    "pitfalls": ["Confusing the CNF (A) with the DNF (D) and suspecting one of them; both are correct."],
    "verification": "Columns over TT, TF, FT, FF: A, B, D give T, F, F, T; C gives F, T, T, F.",
}

SOLUTIONS["cse-2017-1-cs-1"] = {
    "approach": "Concept tested: **implication law and converse/inverse**. Rewrite every implication as a disjunction and compare the clauses: $\\neg p \\Rightarrow \\neg q \\equiv p \\vee \\neg q$.",
    "concepts": ["Implication law", "Inverse", "Converse"],
    "given": "$(\\neg p) \\Rightarrow (\\neg q)$; candidates I. $p \\Rightarrow q$, II. $q \\Rightarrow p$, III. $(\\neg q) \\vee p$, IV. $(\\neg p) \\vee q$.",
    "steps": [
        {"title": "Rewrite the given statement", "body": "$\\neg p \\Rightarrow \\neg q \\equiv \\neg\\neg p \\vee \\neg q \\equiv p \\vee \\neg q$."},
        {"title": "Rewrite the candidates", "body": "I: $\\neg p \\vee q$. II: $\\neg q \\vee p$. III: $\\neg q \\vee p$. IV: $\\neg p \\vee q$."},
        {"title": "Compare", "body": "II and III are the clause $p \\vee \\neg q$; I and IV are the different clause $\\neg p \\vee q$ (they differ on $p$ = T, $q$ = F)."},
    ],
    "answer": {"value": "II and III only", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "I is $p \\Rightarrow q$, of which the given statement is the inverse; they differ on $p$ = T, $q$ = F."),
        opt("B", False, "I and IV are both $\\neg p \\vee q$, the wrong clause."),
        opt("C", False, "II is right but III is also equivalent."),
        opt("D", True, "II ($q \\Rightarrow p$, the contrapositive of the given statement) and III ($p \\vee \\neg q$)."),
    ],
    "shortcut": "$\\neg p \\Rightarrow \\neg q$ has contrapositive $q \\Rightarrow p$; and $q \\Rightarrow p \\equiv \\neg q \\vee p$.",
    "pitfalls": ["Cancelling the negations to get $p \\Rightarrow q$: negating both sides of an implication gives the inverse, not an equivalent statement."],
    "verification": "Truth tables over $p, q$: the given statement, II and III are T, T, F, T (false only on FT); I and IV are T, F, T, T.",
}

SOLUTIONS["cse-2017-1-cs-29"] = {
    "approach": "Concept tested: **forcing values from a false implication**. '$(p \\to q) \\to r$ is a contradiction' is meant as 'it is false'; an implication is false only as T → F, which pins $r$ = F and $p \\to q$ = T.",
    "concepts": ["Implication", "Falsification", "Substitution"],
    "given": "$(p \\to q) \\to r$ is false. Describe $(r \\to p) \\to q$.",
    "steps": [
        {"title": "Force the values", "body": "$(p \\to q) \\to r$ = F needs $p \\to q$ = T and $r$ = F. The allowed rows are $(p, q) \\in$ {TT, FT, FF} with $r$ = F."},
        {"title": "Substitute r = F", "body": "$r \\to p = \\text{F} \\to p = $ T, so $(r \\to p) \\to q = \\text{T} \\to q \\equiv q$."},
        {"title": "Read the options", "body": "The target equals $q$: it is T exactly when $q$ is T. On the allowed row FF it is F, so it is not a tautology; on TT it is T, so not a contradiction; with $p$ = F it is F on FF."},
    ],
    "answer": {"value": "Always TRUE when $q$ is TRUE", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "On the allowed row $p = q =$ F (with $r$ = F) the target is F."),
        opt("B", False, "On the allowed row $p = q =$ T the target is T."),
        opt("C", False, "With $p$ = F, the allowed row $q$ = F still gives F."),
        opt("D", True, "Under the condition the target is equivalent to $q$."),
    ],
    "shortcut": "Once $r$ = F, any implication out of $r$ is T, so $(r \\to p) \\to q$ collapses to $q$.",
    "pitfalls": ["Taking 'contradiction' literally: $(p \\to q) \\to r$ is satisfiable, so the question can only mean that its value is false.", "Forgetting that $p \\to q$ = T still allows $p$ = F with $q$ either value."],
    "verification": "Over the three rows where $(p \\to q) \\to r$ is false (TTF, FTF, FFF), the target takes the values T, T, F, matching $q$.",
    "animation": tt("Rows where (p → q) → r is false", ["p", "q", "r", "(r → p) → q"], [["T", "T", "F", "T"], ["F", "T", "F", "T"], ["F", "F", "F", "F"]], hl=[(2, 3, "error")]),
}

SOLUTIONS["cse-2021-1-cs-7"] = {
    "approach": "Concept tested: **simplifying a shared sub-formula, then testing each implication**. $\\neg p \\wedge (p \\vee q) \\equiv \\neg p \\wedge q$; a conjunction implies its parts, but $q$ alone does not imply $\\neg p \\wedge q$.",
    "concepts": ["Distributive law", "Tautology", "Disjunctive syllogism"],
    "given": "$S_1 = (\\neg p \\wedge (p \\vee q)) \\to q$, $S_2 = q \\to (\\neg p \\wedge (p \\vee q))$.",
    "steps": [
        {"title": "Simplify the shared part", "body": "$\\neg p \\wedge (p \\vee q) \\equiv (\\neg p \\wedge p) \\vee (\\neg p \\wedge q) \\equiv \\neg p \\wedge q$."},
        {"title": "Test S1", "body": "$(\\neg p \\wedge q) \\to q \\equiv p \\vee \\neg q \\vee q \\equiv$ T: a tautology (disjunctive syllogism)."},
        {"title": "Test S2", "body": "$q \\to (\\neg p \\wedge q)$ is false when $q$ = T and $\\neg p \\wedge q$ = F, i.e. $p = q =$ T. Not a tautology."},
    ],
    "answer": {"value": "$S_1$ is a tautology but $S_2$ is not a tautology", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$S_2$ fails on $p = q =$ T."),
        opt("B", True, "$S_1 \\equiv$ T; $S_2$ is false on $p = q =$ T."),
        opt("C", False, "$S_1$ is the tautology; $S_2$ is not."),
        opt("D", False, "$S_1$ is a tautology."),
    ],
    "shortcut": "$S_2$ is the converse of $S_1$; converses of tautological implications are usually not tautologies. Test $p = q =$ T.",
    "pitfalls": ["Assuming that because $S_1$ is a tautology its converse $S_2$ is one too."],
    "verification": "Truth tables over $p, q$: $S_1$ is T on all four rows; $S_2$ is F on TT.",
}

SOLUTIONS["cse-2021-2-cs-15"] = {
    "approach": "Concept tested: **proving equivalence by a rewrite ladder**. Remove the arrows from both sides; antecedent and consequent both become $\\neg P \\vee \\neg Q \\vee R$, so $S$ is $X \\to X$.",
    "concepts": ["Implication law", "Idempotent law", "Tautology"],
    "given": "$S: ((P \\wedge Q) \\to R) \\to ((P \\wedge Q) \\to (Q \\to R))$.",
    "steps": [
        {"title": "Antecedent", "body": "$(P \\wedge Q) \\to R \\equiv \\neg(P \\wedge Q) \\vee R \\equiv \\neg P \\vee \\neg Q \\vee R$."},
        {"title": "Consequent", "body": "$(P \\wedge Q) \\to (Q \\to R) \\equiv \\neg P \\vee \\neg Q \\vee (\\neg Q \\vee R) \\equiv \\neg P \\vee \\neg Q \\vee R$ (idempotence)."},
        {"title": "Conclude", "body": "The two sides are equivalent, so $S \\equiv X \\to X \\equiv \\neg X \\vee X \\equiv$ T: $S$ is a tautology (B) and D holds; A and C are false."},
    ],
    "answer": {"value": "(B) and (D)", "choice": ["B", "D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$S$ is a tautology, so it is not 'neither'."),
        opt("B", True, "$S$ has the form $X \\to X$."),
        opt("C", False, "A tautology is never a contradiction."),
        opt("D", True, "Both sides reduce to $\\neg P \\vee \\neg Q \\vee R$."),
    ],
    "shortcut": "Exportation: $(P \\wedge Q) \\to (Q \\to R) \\equiv (P \\wedge Q \\wedge Q) \\to R \\equiv (P \\wedge Q) \\to R$.",
    "pitfalls": ["Marking only B: in an MSQ, D is also correct and is the reason B holds."],
    "verification": "Truth tables over $P, Q, R$: antecedent and consequent agree on all 8 rows (both false only on TTF), and $S$ is T on all 8.",
    "animation": eqn("Both sides of S", [("(P \\wedge Q) \\to R \\equiv \\neg P \\vee \\neg Q \\vee R", "antecedent"), ("(P \\wedge Q) \\to (Q \\to R) \\equiv \\neg P \\vee \\neg Q \\vee \\neg Q \\vee R", "consequent"), ("\\equiv \\neg P \\vee \\neg Q \\vee R", "idempotent: S is X → X")]),
}
