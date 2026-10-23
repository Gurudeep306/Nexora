---
id: equivalence-normal-forms
subject: dm
chapter: propositional-logic
title: Tautologies, laws of equivalence and normal forms
order: 2
prerequisites: [propositions-connectives]
pyq_topics: [dm/logic]
est_minutes: 75
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every classification, law, rewrite ladder, falsification, canonical form, completeness verdict, count, PYQ key and practice answer is recomputed in content/gate-notes/_checks/dm/l1_02_equivalence.py with logiclib.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 19–25, set B pp. 163–167 and 250–254, set C pp. 292–328, set D pp. 673–675, set E pp. 781–797. Set A's claim that ∧ distributes over → and set C's maxterm numbering Π(1, 3, 6) (correct: Π(1, 4, 6)) are recorded in _errata/dm.md."
  - "Facts checked against standard textbooks: K. H. Rosen, Discrete Mathematics and its Applications (tautologies, logical equivalences, normal forms, functional completeness); C. L. Liu, Elements of Discrete Mathematics; E. Post's characterisation of complete sets of connectives."
  - "PYQs: src/gate/questions.json (dm/logic); all twenty-three keys are re-derived by truth table, brute force or exhaustive search in l1_02_equivalence.py."
updated: "2026-10-23"
---

Lesson 1 gave every formula a truth table. This lesson asks the questions GATE actually asks about
those tables. Is the column all T (a tautology), all F (a contradiction), or mixed? Do two different
formulas have the same column (are they equivalent)? Can we turn one formula into another by algebra
instead of by table? Can we write any column in a standard shape (a normal form)? And which small sets
of connectives are enough to write every column at all (functional completeness)?

This is the single biggest block of propositional logic in GATE: twenty-three previous-year questions,
from "which of these is a tautology" (asked in some form almost every few years) to canonical forms,
satisfiability of CNF and complete sets of connectives. The good news is that every one of them can be
settled by one of three tools: a truth table, a chain of laws, or the "try to make it false" test. We
learn all three and, more importantly, learn which one is fastest for which question.

## Where this fits

This lesson builds directly on [Lesson 1](lesson:propositions-connectives): you need the truth tables
of the five connectives, and especially the fact that $p \to q$ is false only on the row $p$ = T,
$q$ = F. Lesson 3 uses the classification vocabulary from here (valid, satisfiable) to define valid
arguments, and its resolution method works on the CNF we build here. Chapter 2 extends the laws to
quantifiers. In Digital Logic the same algebra appears as [Boolean laws](/gate/notes/dl/boolean-laws),
[canonical forms](/gate/notes/dl/canonical-forms) and [universal gates](/gate/notes/dl/universal-gates);
there the emphasis is on circuits and K-maps, here it is on proofs, tautologies and the logic
vocabulary GATE uses in the Discrete Mathematics section.

:::table{#radar title="GATE radar: tautologies, equivalence and normal forms" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 23 (1991–2021) |
| Marks | 7 one-mark, 11 two-mark, 4 descriptive, 1 unmarked multi-select |
| Pattern 1 | Which formula is (or is not) a tautology, or prove / refute one: 1992, 1996, 1997, 1999 (both parts), 2002, 2014, 2021 (both papers) |
| Pattern 2 | Which formulas are equivalent to a given one: 1993, 2008, 2015, 2017 (paper 1, Q1) |
| Pattern 3 | Satisfiable / valid vocabulary: 1991, 2001, 2004, 2005, 2006 |
| Pattern 4 | Canonical forms and CNF: 1995 (principal CNF), 2007 (satisfying half the clauses) |
| Pattern 5 | Functional completeness: 2008 (IT) |
| Pattern 6 | Value of a formula under given facts: 2000 (two equivalences given), 2017 (paper 1, Q29: a formula given false) |
| What examiners test | That ≡ is a statement about columns while ↔ is a connective, that $(A \wedge B) \to C$ splits into an **or** of implications, that one row is enough to refute a tautology, that maxterms are numbered by the row that makes them false, and that a set of connectives which always outputs T on the all-true row cannot build ¬ |
:::

## Tautologies, contradictions and contingencies

:::intuition{#verdict-intuition title="Three verdicts on a column" depth="standard"}
Write the truth table of a formula and look only at its final column. There are exactly three things
that column can look like. It can be **all T**: the formula is true in every possible world, whatever
the variables mean, so it is a law of logic (like "it is raining or it is not raining"). It can be
**all F**: the formula is false in every world, so it can never happen ("it is raining and it is not
raining"). Or it can be **mixed**: true in some worlds and false in others, so its truth depends on the
facts (like "it is raining").

Almost every vocabulary word in this section is a way of saying which of the three pictures you have,
or which pictures are ruled out. "Satisfiable" means "at least one T", so it rules out only the all-F
picture. "Falsifiable" means "at least one F", so it rules out only the all-T picture. Keep the three
pictures in mind and none of the words can confuse you.
:::

:::definition{#classes-def term="Tautology, contradiction, contingency, satisfiable, valid" depth="quick"}
Let $A$ be a formula and look at its truth-table column.

| Word | Column | Also called |
|:--|:--|:--|
| **tautology** | all T | valid, logically true |
| **contradiction** | all F | unsatisfiable, logically false |
| **contingency** | at least one T and at least one F | satisfiable but not valid |
| **satisfiable** | at least one T (tautology or contingency) | consistent |
| **falsifiable** | at least one F (contradiction or contingency) | not valid, invalid |

An assignment (row) that makes $A$ true **satisfies** $A$ (it is a model of $A$); a row that makes $A$
false **falsifies** it (it is a counterexample). Every tautology is satisfiable; a contingency is both
satisfiable and falsifiable; a contradiction is neither satisfiable nor valid.
:::

:::viz{#verdict-viz spec="verdict-columns" mode="animate" depth="standard"}
:::

:::theorem{#negation-swap-theorem name="Negation swaps the verdicts" depth="standard"}
$A$ is a tautology if and only if $\neg A$ is a contradiction; $A$ is satisfiable if and only if $\neg
A$ is not a tautology; and $A$ is a contingency if and only if $\neg A$ is a contingency.
:::

:::proof{#proof-negation-swap of="the negation swap" depth="standard"}
**Idea first:** negation flips every entry of the column, so "all T" becomes "all F" and "mixed" stays
"mixed".

The column of $\neg A$ is the column of $A$ with every entry flipped. If $A$'s column has no F, then
$\neg A$'s column has no T: tautology becomes contradiction, and the argument runs backwards too.
"$A$ has at least one T" is the same as "$\neg A$ has at least one F", which is "$\neg A$ is not a
tautology". A mixed column flips to a mixed column. This is why every "is it valid?" question can be
turned into "is the negation satisfiable?", the form a computer (and the falsification test below)
uses.
:::

:::theorem{#closure-theorem name="What tautologies and contradictions force" depth="standard"}
For any formulas $A$, $B$:

1. If $A$ is a tautology, then $A \vee B$ and $B \to A$ are tautologies, whatever $B$ is.
2. $A \wedge B$ is a tautology if and only if both $A$ and $B$ are tautologies.
3. If $A$ is a contradiction, then $A \to B$ is a tautology and $A \wedge B$ is a contradiction.
4. If $C \to D$ and $C \to \neg D$ are both tautologies, then $C$ is a contradiction (unsatisfiable).
5. **Substitution:** if $A$ is a tautology and we replace a variable everywhere in $A$ by the same
   formula, the result is still a tautology.
:::

:::proof{#proof-closure of="the closure facts" depth="standard"}
**Idea first:** each fact is a statement about every row, so check one arbitrary row.

Take any row. (1) $A$ is T there, and a disjunction with a true part is T; an implication with a true
conclusion is T. (2) $A \wedge B$ is T on a row exactly when both are T on it, so "T on every row"
holds for the conjunction exactly when it holds for each part. (3) $A$ is F on the row, so $A \to B$ is
$\text{F} \to \dots = $ T, and $A \wedge B$ is F. (4) Suppose some row made $C$ true. Both implications
are true on that row, so both $D$ and $\neg D$ would be true there, which is impossible. So no row makes
$C$ true. (5) After substitution, each row gives the replaced variable some truth value; the original
$A$ is true for every value of that variable, so the new formula is true on the row too.

**Sanity check for (4):** with $C = p \wedge \neg p$ both $C \to D$ and $C \to \neg D$ are vacuously
true for every $D$, and indeed $C$ is a contradiction. GATE 1991 is exactly fact (4) with $C = F_1
\wedge F_2$.
:::

:::trap{#trap-satisfiable title="'Satisfiable' includes the tautologies" depth="quick"}
A tautology **is** satisfiable (it is satisfied by every row, so certainly by one). When an option
says "satisfiable but not valid", it means "contingency"; when it says "satisfiable", a tautology also
qualifies. GATE 2001 offers "F1 is satisfiable, F2 is valid" and "F1 and F2 are both satisfiable":
the second is also true but the first is the precise one examiners keyed. Likewise "not a tautology"
does **not** mean "a contradiction": it means at least one F, which includes the contingencies.
:::

:::note{#recap-classes title="Recap" depth="quick"}
All T = tautology = valid; all F = contradiction = unsatisfiable; mixed = contingency. Satisfiable =
at least one T; falsifiable = at least one F. Negation swaps tautology and contradiction. If $C$
implies both $D$ and $\neg D$, then $C$ is unsatisfiable.
:::

### Worked examples: classifying formulas

::::example{#ex-class-easy level="easy" title="Three verdicts (GATE 2002)" depth="quick"}
Classify (i) $A \leftrightarrow (A \vee A)$, (ii) $(A \vee B) \to B$, (iii) $A \wedge \neg(A \vee B)$.

:::step{why="Idempotence: A ∨ A has the same column as A, and anything ↔ itself is true on every row."}
(i) $A \vee A \equiv A$, so the formula is $A \leftrightarrow A$: a **tautology**.
:::

:::step{why="An implication is false only on 'hypothesis T, conclusion F'. Look for such a row, then also for a true row."}
(ii) With $A$ = T, $B$ = F: $(\text{T}) \to \text{F} = $ F. With $B$ = T it is true. Both values occur:
a **contingency**.
:::

:::step{why="De Morgan turns ¬(A ∨ B) into ¬A ∧ ¬B; then the conjunction contains both A and ¬A."}
(iii) $A \wedge \neg A \wedge \neg B$ is false on every row: a **contradiction**.
:::

:::answer
(i) tautology, (ii) neither (contingency), (iii) contradiction.
:::
::::

::::example{#ex-class-medium level="medium" title="Satisfiable or valid? (GATE 2001)" depth="standard"}
$F_1 = P \to \neg P$ and $F_2 = (P \to \neg P) \vee (\neg P \to P)$. Classify both.

:::step{why="Rewrite with p → q ≡ ¬p ∨ q: the arrow disappears and idempotence finishes it."}
$F_1 \equiv \neg P \vee \neg P \equiv \neg P$: true when $P$ = F, false when $P$ = T. Satisfiable, not
valid.
:::

:::step{why="Rewrite both disjuncts the same way."}
$\neg P \to P \equiv P \vee P \equiv P$, so $F_2 \equiv \neg P \vee P$.
:::

:::step{why="Excluded middle: a variable or its negation is always true."}
$F_2$ is a tautology (valid).
:::

:::answer
$F_1$ is satisfiable (a contingency), $F_2$ is valid. Note that "$F_1$ is unsatisfiable" is the
tempting wrong answer: $P \to \neg P$ reads like a self-contradiction, but it is simply "$P$ is false",
which can happen.
:::
::::

::::example{#ex-class-gate level="gate" title="Two implications with opposite conclusions (GATE 1991)" depth="standard"}
$F_1 \wedge F_2 \to F_3$ and $F_1 \wedge F_2 \to \neg F_3$ are both tautologies. What must be true?

:::step{why="Precedence: ∧ binds tighter than →, so each formula is (F₁ ∧ F₂) → (…)."}
Let $C = F_1 \wedge F_2$. We know $C \to F_3$ and $C \to \neg F_3$ are tautologies.
:::

:::step{why="Fact 4 of the closure theorem: a row making C true would make F₃ and ¬F₃ both true."}
No row makes $C$ true: $F_1 \wedge F_2$ is **unsatisfiable**.
:::

:::step{why="Test the other claims with small examples instead of believing them."}
$F_1 = p$, $F_2 = \neg p$ fits (their conjunction is unsatisfiable) yet each is satisfiable and neither
is a tautology; $F_1 = p \vee \neg p$, $F_2 = p \wedge \neg p$ also fits, and there $F_1$ **is** a
tautology. So "both are tautologies", "neither is tautologous" and "neither is satisfiable" can all
fail.
:::

:::answer
Only "the conjunction $F_1 \wedge F_2$ is not satisfiable" is forced.
:::
::::

::::example{#ex-class-edge level="gate" title="Edge case: a tautology or-ed with anything (GATE 1999)" depth="standard"}
$A$ is a tautology and $B$ is any formula. Prove $A \vee B$ is a tautology. Is $A \wedge B$ one too?

:::step{why="A tautology is true under every assignment; fix an arbitrary assignment v."}
Under $v$, $A$ is T, so $A \vee B = \text{T} \vee v(B) = $ T.
:::

:::step{why="v was arbitrary, so the disjunction is true under every assignment."}
$A \vee B$ is a tautology.
:::

:::step{why="For the conjunction, a counterexample is enough: take B = p, a contingency."}
$A \wedge p \equiv p$ is false when $p$ = F.
:::

:::answer
$A \vee B$ is always a tautology; $A \wedge B$ is a tautology only when $B$ is one too (part 2 of the
closure theorem). The edge to remember: "or" with a tautology absorbs everything, "and" with a
tautology changes nothing.
:::
::::

## Logical equivalence versus the biconditional

:::intuition{#equiv-intuition title="Same column, different spelling" depth="standard"}
Two formulas are **equivalent** when they are the same proposition in different clothes: on every row
of the table they agree. "$p \to q$" and "$\neg p \vee q$" are spelled differently but cannot be told
apart by any situation. Equivalence is a statement we make **about** two formulas, the way "$2 + 3$
equals $5$" is a statement about two expressions.

The biconditional $p \leftrightarrow q$ looks similar but lives at a different level: it is a
connective **inside** a formula, and on a given row it may be true or false. The bridge between them is
one sentence: $A \equiv B$ exactly when the formula $A \leftrightarrow B$ is true on every row, that is,
is a tautology.
:::

:::definition{#equiv-def term="Logical equivalence and logical implication" depth="quick"}
- $A \equiv B$ ($A$ is **logically equivalent** to $B$) if $A$ and $B$ have the same truth value under
  every assignment to the variables of both. Equivalently, $A \leftrightarrow B$ is a tautology.
- $A \Rightarrow B$ ($A$ **logically implies** $B$) if every assignment that makes $A$ true makes $B$
  true. Equivalently, $A \to B$ is a tautology.
- $A \equiv B$ holds exactly when $A \Rightarrow B$ and $B \Rightarrow A$ both hold.

$\equiv$ and $\Rightarrow$ are claims about formulas (true or false, once and for all); $\leftrightarrow$
and $\to$ are connectives whose value changes from row to row. Some papers write $\equiv$ inside a
formula to mean $\leftrightarrow$ (GATE 2006 does); read the question's intent.
:::

:::theorem{#equiv-iff-theorem name="Equivalence is a tautological biconditional" depth="standard"}
$A \equiv B$ if and only if $A \leftrightarrow B$ is a tautology; and $A \Rightarrow B$ if and only if
$A \to B$ is a tautology.
:::

:::proof{#proof-equiv-iff of="equivalence as a tautology" depth="standard"}
**Idea first:** $\leftrightarrow$ is true on a row exactly when its sides agree on that row.

$A \leftrightarrow B$ is true on a row exactly when $A$ and $B$ have the same value on that row. So it is
true on **every** row exactly when $A$ and $B$ agree on every row, which is the definition of $A \equiv
B$. Similarly $A \to B$ is false on a row exactly when $A$ is T and $B$ is F there; it is a tautology
exactly when no such row exists, which is the definition of $A \Rightarrow B$. Because $A \leftrightarrow
B \equiv (A \to B) \wedge (B \to A)$, part 2 of the closure theorem gives the last line of the
definition.
:::

:::trap{#trap-equiv-vs-iff title="'A → B is a tautology' is not 'A ≡ B'" depth="quick"}
A one-way implication between formulas does not make them equivalent. GATE 2005 builds $X = (P \vee Q)
\to R$ and $Y = (P \to R) \vee (Q \to R)$: $X \to Y$ is a tautology but $Y \to X$ is not, so the option
"$X \equiv Y$" is wrong even though "$X \to Y$" is right. Always check both directions before you
write $\equiv$; one row with $B$ = T and $A$ = F kills the reverse direction.
:::

:::note{#recap-equiv title="Recap" depth="quick"}
$A \equiv B$: same column; test by "$A \leftrightarrow B$ is a tautology". $A \Rightarrow B$: no row with
$A$ = T, $B$ = F; test by "$A \to B$ is a tautology". Equivalence is implication both ways.
:::

### Worked examples: equivalence

::::example{#ex-eq-easy level="easy" title="Which is not the biconditional? (GATE 2015)" depth="quick"}
Which of these is NOT equivalent to $p \leftrightarrow q$: (A) $(\neg p \vee q) \wedge (p \vee \neg q)$,
(B) $(\neg p \vee q) \wedge (q \to p)$, (C) $(\neg p \wedge q) \vee (p \wedge \neg q)$, (D) $(\neg p \wedge
\neg q) \vee (p \wedge q)$?

:::step{why="p ↔ q is (p → q) ∧ (q → p), and each implication is a disjunction."}
$p \leftrightarrow q \equiv (\neg p \vee q) \wedge (\neg q \vee p)$: that is (A), and (B) is the same
with the second clause left as $q \to p$.
:::

:::step{why="The biconditional is true exactly when both are T or both are F: that is (D) read as a list of the true rows."}
(D) lists the rows TT and FF: equivalent.
:::

:::step{why="(C) lists the rows TF and FT, where p and q differ."}
(C) is $p \oplus q$, the negation of $p \leftrightarrow q$.
:::

:::answer
(C). A quick test: on the row $p = q =$ T the biconditional is T, and (C) is F.
:::
::::

::::example{#ex-eq-medium level="medium" title="What is ¬p → ¬q equivalent to? (GATE 2017)" depth="standard"}
Which of I. $p \to q$, II. $q \to p$, III. $\neg q \vee p$, IV. $\neg p \vee q$ are equivalent to $\neg p
\to \neg q$?

:::step{why="Rewrite the given implication as a disjunction: X → Y ≡ ¬X ∨ Y with X = ¬p, Y = ¬q."}
$\neg p \to \neg q \equiv p \vee \neg q$.
:::

:::step{why="Rewrite each candidate the same way and compare clauses."}
I: $\neg p \vee q$. II: $\neg q \vee p$. III: $\neg q \vee p$. IV: $\neg p \vee q$.
:::

:::step{why="Disjunction is commutative, so p ∨ ¬q and ¬q ∨ p are the same clause."}
II and III match; I and IV are the converse direction.
:::

:::answer
II and III only. ($\neg p \to \neg q$ is the inverse of $p \to q$, and the inverse equals the converse
$q \to p$, as Lesson 1 showed.)
:::
::::

::::example{#ex-eq-gate level="gate" title="Four expressions, one column (GATE 2008)" depth="standard"}
Which of I. $P \vee \neg Q$, II. $\neg(\neg P \wedge Q)$, III. $(P \wedge Q) \vee (P \wedge \neg Q) \vee
(\neg P \wedge \neg Q)$, IV. $(P \wedge Q) \vee (P \wedge \neg Q) \vee (\neg P \wedge Q)$ are equivalent?

:::step{why="A disjunction of full terms lists the rows where the formula is true; read them off directly."}
III is true on TT, TF, FF. IV is true on TT, TF, FT.
:::

:::step{why="I is false only where P = F and ¬Q = F, i.e. the row FT."}
I is true on TT, TF, FF: the same as III.
:::

:::step{why="De Morgan on II: ¬(¬P ∧ Q) ≡ P ∨ ¬Q, which is I."}
II ≡ I.
:::

:::answer
I, II and III are equivalent; IV is $P \vee Q$ (false only on FF), different.
:::
::::

::::example{#ex-eq-edge level="gate" title="Edge case: implication one way only (GATE 2005)" depth="standard"}
$X = (P \vee Q) \to R$, $Y = (P \to R) \vee (Q \to R)$. Which of $X \equiv Y$, $X \to Y$, $Y \to X$,
$\neg Y \to X$ is a tautology?

:::step{why="Hypothesis splitting (proved in the laws section): an ∨ in the hypothesis becomes an ∧ of implications."}
$X \equiv (P \to R) \wedge (Q \to R)$.
:::

:::step{why="A conjunction always implies the corresponding disjunction: if both parts are T, at least one is."}
$X \to Y$ is a tautology.
:::

:::step{why="For the reverse direction find a row with Y = T and X = F: make one implication true and the other false."}
$P$ = T, $Q$ = F, $R$ = F: $Q \to R$ = T so $Y$ = T, but $P \to R$ = F so $X$ = F. So $Y \to X$ fails and
$X \not\equiv Y$. On $P = Q =$ T, $R$ = F, $\neg Y$ = T and $X$ = F, so $\neg Y \to X$ fails too.
:::

:::answer
Only $X \to Y$. The edge: a one-way tautological implication is a perfectly good answer; it is not an
equivalence.
:::
::::

## The laws of equivalence

:::intuition{#laws-intuition title="An algebra with a few surprises" depth="standard"}
Because equivalence means "same column", we can replace a formula by an equivalent one anywhere, just
as we replace $2 + 3$ by $5$ in arithmetic. The laws below are a list of equivalences worth knowing by
heart, so that we can simplify without drawing tables. Many look like ordinary algebra ($\wedge$ like
multiplication, $\vee$ like addition), but logic has extras that numbers do not: $p \vee p = p$
(idempotence), $p \vee (p \wedge q) = p$ (absorption), and, unlike numbers, **both** distributive laws
hold: $\wedge$ over $\vee$ and $\vee$ over $\wedge$.

Every law is proved the same way: draw the table once, see the two columns agree, and then never draw
it again.
:::

:::definition{#laws-table term="The laws of equivalence (∧, ∨, ¬)" depth="quick"}
| Law | Form with ∧ | Dual form with ∨ |
|:--|:--|:--|
| Identity | $p \wedge \text{T} \equiv p$ | $p \vee \text{F} \equiv p$ |
| Domination | $p \wedge \text{F} \equiv \text{F}$ | $p \vee \text{T} \equiv \text{T}$ |
| Idempotent | $p \wedge p \equiv p$ | $p \vee p \equiv p$ |
| Complement (negation) | $p \wedge \neg p \equiv \text{F}$ | $p \vee \neg p \equiv \text{T}$ |
| Double negation | $\neg\neg p \equiv p$ | (self-dual) |
| Commutative | $p \wedge q \equiv q \wedge p$ | $p \vee q \equiv q \vee p$ |
| Associative | $(p \wedge q) \wedge r \equiv p \wedge (q \wedge r)$ | $(p \vee q) \vee r \equiv p \vee (q \vee r)$ |
| Distributive | $p \wedge (q \vee r) \equiv (p \wedge q) \vee (p \wedge r)$ | $p \vee (q \wedge r) \equiv (p \vee q) \wedge (p \vee r)$ |
| De Morgan | $\neg(p \wedge q) \equiv \neg p \vee \neg q$ | $\neg(p \vee q) \equiv \neg p \wedge \neg q$ |
| Absorption | $p \wedge (p \vee q) \equiv p$ | $p \vee (p \wedge q) \equiv p$ |

A useful pair that combines distribution and complement: $p \wedge (\neg p \vee q) \equiv p \wedge q$
and $p \vee (\neg p \wedge q) \equiv p \vee q$ ("the negated copy drops out").
:::

:::definition{#imp-laws term="Laws for → and ↔" depth="standard"}
| Name | Equivalence |
|:--|:--|
| Implication | $p \to q \equiv \neg p \vee q \equiv \neg q \to \neg p$ |
| Negated implication | $\neg(p \to q) \equiv p \wedge \neg q$ |
| Disjunction as implication | $p \vee q \equiv \neg p \to q$ |
| Biconditional | $p \leftrightarrow q \equiv (p \to q) \wedge (q \to p) \equiv (p \wedge q) \vee (\neg p \wedge \neg q) \equiv \neg p \leftrightarrow \neg q$ |
| Negated biconditional | $\neg(p \leftrightarrow q) \equiv p \leftrightarrow \neg q \equiv p \oplus q$ |
| Exportation | $(p \wedge q) \to r \equiv p \to (q \to r)$ |
| Conclusion splitting | $(p \to q) \wedge (p \to r) \equiv p \to (q \wedge r)$; $(p \to q) \vee (p \to r) \equiv p \to (q \vee r)$ |
| Hypothesis splitting | $(p \to r) \wedge (q \to r) \equiv (p \vee q) \to r$; $(p \to r) \vee (q \to r) \equiv (p \wedge q) \to r$ |
| Absurdity | $(p \to q) \wedge (p \to \neg q) \equiv \neg p$ |

Note what is **not** on the list: $\to$ is neither commutative nor associative, and $\wedge$ does not
distribute over $\to$ (see the trap below).
:::

:::theorem{#law-proof-theorem name="Every law is a tautology of the form A ↔ B" depth="standard"}
Each equivalence in the two tables holds: the two sides have identical truth tables.
:::

:::proof{#proof-laws of="the laws" depth="standard"}
**Idea first:** a law with $k$ variables is checked by its $2^k$ rows, once and for all; after that,
the substitution fact lets us use it with any formulas in place of the variables.

Take De Morgan, $\neg(p \wedge q) \equiv \neg p \vee \neg q$. The left side is false only when $p \wedge
q$ is true, i.e. on the row TT. The right side is false only when both $\neg p$ and $\neg q$ are false,
i.e. again on TT. Same false rows, same column. Absorption $p \vee (p \wedge q) \equiv p$: when $p$ is T
both sides are T; when $p$ is F, $p \wedge q$ is F and both sides are F. The distributive law $p \vee (q
\wedge r) \equiv (p \vee q) \wedge (p \vee r)$: when $p$ is T both sides are T; when $p$ is F both sides
reduce to $q \wedge r$. The other laws are checked in the same few lines (the check script runs all of
them). Finally, because a law is a tautology $A \leftrightarrow B$ in the variables $p, q, r$,
substituting formulas for those variables keeps it a tautology (closure theorem, part 5): that is what
licenses using "$\neg(X \wedge Y) \equiv \neg X \vee \neg Y$" for any formulas $X$, $Y$.
:::

:::derivation{#split-derivation of="hypothesis and conclusion splitting" depth="standard"}
Start from the right side of each law and rewrite every arrow as a disjunction.

$(p \vee q) \to r \equiv \neg(p \vee q) \vee r \equiv (\neg p \wedge \neg q) \vee r \equiv (\neg p \vee r)
\wedge (\neg q \vee r) \equiv (p \to r) \wedge (q \to r)$, by implication, De Morgan, distribution and
implication again.

$(p \wedge q) \to r \equiv \neg p \vee \neg q \vee r \equiv (\neg p \vee r) \vee (\neg q \vee r) \equiv (p
\to r) \vee (q \to r)$, using idempotence to duplicate $r$.

The key observation: the hypothesis sits under a hidden $\neg$ (in $\neg A \vee B$), and De Morgan flips
$\wedge$ and $\vee$ under a negation. The conclusion is not negated, so conclusion splitting keeps the
connective: $p \to (q \wedge r) \equiv \neg p \vee (q \wedge r) \equiv (\neg p \vee q) \wedge (\neg p \vee
r)$.

**Sanity check:** "If it rains or snows, the match is off" should mean "if it rains the match is off,
and if it snows the match is off": an **and** of two implications, as the first line says.
:::

:::derivation{#exportation-derivation of="exportation and absurdity" depth="standard"}
Exportation: $p \to (q \to r) \equiv \neg p \vee (\neg q \vee r) \equiv (\neg p \vee \neg q) \vee r
\equiv \neg(p \wedge q) \vee r \equiv (p \wedge q) \to r$, by implication twice, associativity and De
Morgan. Absurdity: $(p \to q) \wedge (p \to \neg q) \equiv p \to (q \wedge \neg q) \equiv p \to \text{F}
\equiv \neg p \vee \text{F} \equiv \neg p$, by conclusion splitting, complement and identity.

**Sanity check:** exportation says "if it is a weekday, then if it rains I take the bus" means "if it
is a weekday and it rains, I take the bus", which is how anyone would read it. Absurdity is the logic
behind proof by contradiction: if $p$ leads to both $q$ and $\neg q$, then $p$ is false.
:::

:::definition{#duality-def term="The dual of a formula" depth="standard"}
For a formula built from $\neg$, $\wedge$, $\vee$, T and F only, its **dual** $A^d$ is obtained by
swapping $\wedge$ with $\vee$ and T with F everywhere (the variables and the $\neg$ signs stay). For
example the dual of $p \wedge (q \vee \text{F})$ is $p \vee (q \wedge \text{T})$. Taking the dual twice
gives back the formula. To dualise a formula that contains $\to$ or $\leftrightarrow$, rewrite those
first.
:::

:::theorem{#duality-theorem name="Duality principle" depth="standard"}
If $A \equiv B$, then $A^d \equiv B^d$. In particular, every law in the first table comes with its dual
for free, which is why the table has two columns.
:::

:::proof{#proof-duality of="the duality principle" depth="standard"}
**Idea first:** negating a formula and pushing the $\neg$ all the way in with De Morgan produces the
dual, but with every variable negated.

By induction on the formula, $\neg A(p_1, \dots, p_n) \equiv A^d(\neg p_1, \dots, \neg p_n)$: De Morgan
turns $\neg(X \wedge Y)$ into $\neg X \vee \neg Y$ (an $\wedge$ becomes $\vee$), $\neg \text{T}$ becomes F,
and at the variables $\neg p_i$ remains. Now if $A \equiv B$, then $\neg A \equiv \neg B$, so $A^d(\neg
p_1, \dots) \equiv B^d(\neg p_1, \dots)$. This holds for every assignment, and as the assignment to the
$p_i$ ranges over all rows, the assignment to the $\neg p_i$ does too. So $A^d \equiv B^d$.

**Sanity check:** the dual of absorption $p \vee (p \wedge q) \equiv p$ is $p \wedge (p \vee q) \equiv
p$, which is also true.
:::

:::trap{#trap-distribute-imp title="∧ does not distribute over →" depth="quick"}
It is tempting to "multiply out" $p \wedge (q \to r)$ as $(p \wedge q) \to (p \wedge r)$. This is
**false**: with $p$ = F the left side is F, but the right side is $\text{F} \to \text{F} = $ T. (One
reference set in our checklist states this law; it is wrong, see the errata.) The forms that do hold
are $p \to (q \wedge r) \equiv (p \to q) \wedge (p \to r)$ and $p \vee (q \to r) \equiv (p \vee q) \to (p
\vee r)$, and also $p \to (q \to r) \equiv (p \to q) \to (p \to r)$. When in doubt, try the row that
makes the outside variable false.
:::

:::trick{#trick-hypothesis-split title="On the left of an arrow, ∧ and ∨ swap" depth="standard"}
To split an implication: on the **conclusion** side keep the connective, $p \to (q \wedge r) = (p \to
q) \wedge (p \to r)$; on the **hypothesis** side swap it, $(p \wedge q) \to r = (p \to r) \vee (q \to r)$
and $(p \vee q) \to r = (p \to r) \wedge (q \to r)$. GATE 2006 asked exactly whether the swapped
versions are right.

**Why it works:** $A \to B \equiv \neg A \vee B$; the hypothesis is under a negation, and De Morgan
swaps $\wedge$ and $\vee$ under a negation. **When it fails:** only for a hypothesis or conclusion made
of $\wedge$ or $\vee$ at the top; for $(p \to q) \to r$ there is nothing to split, and $\to$ is not
associative.
:::

:::note{#recap-laws title="Recap" depth="quick"}
Learn the ten $\wedge$/$\vee$ laws in dual pairs, plus $p \to q \equiv \neg p \vee q$, $\neg(p \to q)
\equiv p \wedge \neg q$, exportation, and splitting ("swap on the left, keep on the right"). Duality
gives every law's twin. $\wedge$ does not distribute over $\to$; $\to$ is neither commutative nor
associative.
:::

### Worked examples: the laws

::::example{#ex-law-easy level="easy" title="A one-line simplification (GATE 1993)" depth="quick"}
Simplify $p \wedge (\neg p \vee q)$ and classify it.

:::step{why="Distribute ∧ over ∨: p ∧ (X ∨ Y) ≡ (p ∧ X) ∨ (p ∧ Y)."}
$(p \wedge \neg p) \vee (p \wedge q)$.
:::

:::step{why="Complement law: p ∧ ¬p ≡ F; identity law: F ∨ X ≡ X."}
$\text{F} \vee (p \wedge q) \equiv p \wedge q$.
:::

:::answer
$p \wedge (\neg p \vee q) \equiv p \wedge q$, a contingency (not a tautology, not a contradiction, not
$p \vee q$). This is the "negated copy drops out" pattern.
:::
::::

::::example{#ex-law-medium level="medium" title="Absurdity by laws" depth="standard"}
Show $(p \to q) \wedge (p \to \neg q) \equiv \neg p$ using laws only.

:::step{why="Implication law on both conjuncts."}
$(\neg p \vee q) \wedge (\neg p \vee \neg q)$.
:::

:::step{why="Distribute ∨ over ∧ in reverse (factor out the common ¬p)."}
$\neg p \vee (q \wedge \neg q)$.
:::

:::step{why="Complement, then identity."}
$\neg p \vee \text{F} \equiv \neg p$.
:::

:::answer
$\neg p$. Sanity check by the one row that matters: with $p$ = T the left side needs both $q$ and $\neg
q$, so it is F, matching $\neg p$ = F.
:::
::::

::::example{#ex-law-gate level="gate" title="Two 'laws' that are both wrong (GATE 2006)" depth="standard"}
P1: $((A \wedge B) \to C) \equiv ((A \to C) \wedge (B \to C))$. P2: $((A \vee B) \to C) \equiv ((A \to C)
\vee (B \to C))$. Which are tautologies?

:::step{why="Hypothesis splitting: an ∧ on the left becomes ∨ of implications, not ∧."}
$(A \wedge B) \to C \equiv (A \to C) \vee (B \to C)$. P1 has $\wedge$ on the right: suspect.
:::

:::step{why="Find a row where the two sides of P1 differ: make exactly one of A → C, B → C false."}
$A$ = T, $B$ = F, $C$ = F: left side $(\text{F}) \to \text{F}$ = T; right side $(\text{T} \to \text{F})
\wedge \dots$ = F. P1 fails.
:::

:::step{why="P2 has the opposite swap. Use the same row."}
Left: $(\text{T}) \to \text{F}$ = F. Right: $(\text{F}) \vee (\text{F} \to \text{F}) = $ T. P2 fails.
:::

:::answer
Neither P1 nor P2 is a tautology; each has the $\wedge$ and $\vee$ on its right side exchanged. The
single row $A$ = T, $B$ = F, $C$ = F refutes both.
:::
::::

::::example{#ex-law-edge level="gate" title="Edge case: distributing ∧ over → (a false law)" depth="standard"}
Is $p \wedge (q \to r) \equiv (p \wedge q) \to (p \wedge r)$? Is $p \to (q \to r) \equiv (p \to q) \to (p \to
r)$?

:::step{why="Try the row that kills the outer ∧: p = F."}
Left: $\text{F} \wedge \dots = $ F. Right: $(\text{F}) \to (\text{F}) = $ T. They differ, so the first
"law" is false.
:::

:::step{why="For the second, rewrite both sides as disjunctions."}
$p \to (q \to r) \equiv \neg p \vee \neg q \vee r$. $(p \to q) \to (p \to r) \equiv \neg(\neg p \vee q) \vee
\neg p \vee r \equiv (p \wedge \neg q) \vee \neg p \vee r \equiv \neg q \vee \neg p \vee r$.
:::

:::answer
The first is **not** an equivalence (counterexample $p$ = F); the second **is** ($\to$ distributes over
$\to$ from the left). Same shape, different verdicts: always test the "outside variable false" row.
:::
::::

## Proving equivalences by laws

:::intuition{#ladder-intuition title="A ladder of rewrites, each rung named" depth="standard"}
A truth table proves an equivalence by brute force; it is safe but grows as $2^n$. A **law proof** is
a ladder: start at one formula and climb, one rung per law, until you reach the other. Each rung must
name its law, exactly as each step of an algebra derivation names what it did. When both formulas are
messy, climb from both ends towards a common simple form in the middle.

The order of the rungs is almost always the same, and knowing it is most of the skill: first get rid of
the arrows, then push the negations inward, then distribute and tidy up.
:::

:::definition{#ladder-method term="The standard rewrite recipe" depth="standard"}
1. **Remove arrows:** $A \to B \Rightarrow \neg A \vee B$; $A \leftrightarrow B \Rightarrow (A \to B) \wedge
   (B \to A)$ or $(A \wedge B) \vee (\neg A \wedge \neg B)$.
2. **Push $\neg$ inward** with De Morgan and double negation until every $\neg$ sits on a variable
   (negation normal form).
3. **Simplify:** idempotence, complement, identity, domination, absorption; distribute only when it
   creates something that cancels.
4. If both sides reach the same formula (up to commutativity and associativity), they are equivalent.
   If they do not, **stop simplifying and find a row where they differ**: laws can prove an equivalence
   but cannot by themselves prove a non-equivalence.
:::

:::viz{#ladder-viz spec="law-ladder" mode="animate" depth="standard"}
:::

:::theorem{#substitution-theorem name="Replacement of equivalents" depth="standard"}
If $X \equiv Y$ and $X$ occurs as a sub-formula of $A$, then replacing that occurrence by $Y$ gives a
formula equivalent to $A$. The same holds when $X \leftrightarrow Y$ is merely **given as true** in the
situation under discussion: then the replacement keeps the value of $A$ in that situation.
:::

:::proof{#proof-substitution of="replacement of equivalents" depth="standard"}
**Idea first:** a formula's value is computed from the values of its parts, never from their spelling.

On any row, $X$ and $Y$ have the same value. Evaluating $A$ bottom-up, the occurrence of $X$
contributes its value to its parent connective; with $Y$ in its place the parent receives the same
value, and so does every ancestor up to the root. So the two formulas agree on the row. Since the row
was arbitrary, they agree on every row. In the second form, we only use rows where $X \leftrightarrow Y$
is true, and on those rows the same argument applies. This is the rule that makes every rung of the
ladder legal, and it is how GATE 2000 is solved.
:::

:::trick{#trick-cases title="Split on one variable (proof by cases)" depth="standard"}
To decide a formula quickly, substitute $p$ = T and simplify, then $p$ = F and simplify. If both
results are tautologies, so is the formula; if both results agree with the other side, the formulas are
equivalent. With $p$ = T, every $p \vee \dots$ dies to T and every $p \wedge X$ shrinks to $X$; with $p$
= F the opposite happens.

**Why it works:** every row has $p$ = T or $p$ = F, so the two cases cover the table. **When it fails:**
it never gives a wrong answer, but if you split on a variable that appears only once, nothing
simplifies; split on the variable that occurs most often.
:::

:::note{#recap-ladder title="Recap" depth="quick"}
Arrows out, negations in, simplify. Name each law. Replacing a part by an equivalent part keeps the
whole equivalent. Laws prove "equivalent"; to prove "not equivalent", exhibit a row.
:::

### Worked examples: proofs by laws

::::example{#ex-proof-easy level="easy" title="A classic ladder" depth="quick"}
Prove $\neg(p \vee (\neg p \wedge q)) \equiv \neg p \wedge \neg q$.

:::step{why="De Morgan on the outer ¬ of a disjunction."}
$\neg p \wedge \neg(\neg p \wedge q)$.
:::

:::step{why="De Morgan again on ¬(¬p ∧ q), then double negation."}
$\neg p \wedge (p \vee \neg q)$.
:::

:::step{why="Distribute ¬p ∧ over the disjunction."}
$(\neg p \wedge p) \vee (\neg p \wedge \neg q)$.
:::

:::step{why="Complement law gives F, identity drops it."}
$\text{F} \vee (\neg p \wedge \neg q) \equiv \neg p \wedge \neg q$.
:::

:::answer
Proved, with the laws De Morgan, De Morgan, double negation, distributive, complement, identity.
(Faster: inside, $p \vee (\neg p \wedge q) \equiv p \vee q$, and De Morgan gives the result at once.)
:::
::::

::::example{#ex-proof-medium level="medium" title="Simplify before you judge (GATE 2021)" depth="standard"}
$S_1$: $(\neg p \wedge (p \vee q)) \to q$, $S_2$: $q \to (\neg p \wedge (p \vee q))$. Which are tautologies?

:::step{why="The shared part: distribute ¬p over (p ∨ q), the ¬p ∧ p term is F."}
$\neg p \wedge (p \vee q) \equiv (\neg p \wedge p) \vee (\neg p \wedge q) \equiv \neg p \wedge q$.
:::

:::step{why="S₁ becomes (¬p ∧ q) → q: a conjunction implies each of its parts."}
$S_1 \equiv \neg(\neg p \wedge q) \vee q \equiv p \vee \neg q \vee q \equiv \text{T}$.
:::

:::step{why="S₂ becomes q → (¬p ∧ q); look for a row with q = T and ¬p ∧ q = F, i.e. p = T."}
On $p = q =$ T: $\text{T} \to \text{F} = $ F. Not a tautology.
:::

:::answer
$S_1$ is a tautology and $S_2$ is not. ($S_1$ is the disjunctive syllogism of Lesson 3: from $p \vee q$
and $\neg p$, conclude $q$.)
:::
::::

::::example{#ex-proof-gate level="gate" title="Antecedent equals consequent (GATE 2021)" depth="standard"}
$S$: $((P \wedge Q) \to R) \to ((P \wedge Q) \to (Q \to R))$. Is $S$ a tautology, and are its two sides
equivalent?

:::step{why="Remove the arrows from the antecedent."}
$(P \wedge Q) \to R \equiv \neg P \vee \neg Q \vee R$.
:::

:::step{why="Remove the arrows from the consequent: (P ∧ Q) → (Q → R) is ¬(P ∧ Q) ∨ ¬Q ∨ R."}
$\neg P \vee \neg Q \vee \neg Q \vee R \equiv \neg P \vee \neg Q \vee R$ (idempotence).
:::

:::step{why="Both sides reduce to the same clause, so S has the shape X → X."}
$S \equiv X \to X \equiv \neg X \vee X \equiv \text{T}$.
:::

:::answer
$S$ is a tautology **and** its antecedent is equivalent to its consequent (both $\neg P \vee \neg Q \vee
R$). An MSQ: both of those options are correct; "neither tautology nor contradiction" and
"contradiction" are wrong.
:::
::::

::::example{#ex-proof-edge level="gate" title="Edge case: equivalences given as facts (GATE 2000)" depth="standard"}
It is given that $a \leftrightarrow (b \vee \neg b)$ and $b \leftrightarrow c$ hold. What is the value of
$(a \wedge b) \to (a \wedge c) \vee d$?

:::step{why="Precedence: ∧ before ∨ before →, so the formula is (a ∧ b) → ((a ∧ c) ∨ d)."}
Bracket it first.
:::

:::step{why="b ∨ ¬b is always T, so the first fact says a is T; replacement lets us put T for a."}
$(\text{T} \wedge b) \to ((\text{T} \wedge c) \vee d) \equiv b \to (c \vee d)$.
:::

:::step{why="The second fact makes b and c equal in every allowed situation, so replace c by b."}
$b \to (b \vee d) \equiv \neg b \vee b \vee d \equiv \text{T}$.
:::

:::answer
Always **true**. The edge: the facts are not tautologies, but in every situation where they hold we may
replace equals by equals, and then the formula is true in all of those situations.
:::
::::

## Fast tautology test: try to make it false

:::intuition{#falsify-intuition title="Play the prosecutor" depth="standard"}
To show a formula is a tautology by table you must check every row. To show it is **not**, one row is
enough. So flip the job around: try to build a row that makes the formula false. Assume it is false,
and see what that forces. An implication that is false forces its hypothesis to be T and its
conclusion to be F; a false disjunction forces both parts F; a true conjunction forces both parts T.
Follow the forced values like dominoes.

Two things can happen. Either the dominoes force some variable to be both T and F, a **clash**, and
then no falsifying row exists: the formula is a tautology. Or they settle into a consistent assignment,
and that assignment **is** the counterexample. For the implication-heavy formulas GATE likes, this takes
a few lines instead of eight or sixteen rows.
:::

:::definition{#falsify-method term="Falsification (the forcing rules)" depth="standard"}
Assume the formula is F and propagate with these rules, writing a value on each sub-formula:

| If we need | then |
|:--|:--|
| $A \to B$ = F | $A$ = T and $B$ = F (forced) |
| $A \vee B$ = F | $A$ = F and $B$ = F (forced) |
| $A \wedge B$ = T | $A$ = T and $B$ = T (forced) |
| $\neg A$ = T / F | $A$ = F / T (forced) |
| $A \to B$ = T, $A$ known T | $B$ = T (forced) |
| $A \to B$ = T, $B$ known F | $A$ = F (forced) |
| $A \wedge B$ = F, $A \vee B$ = T, $A \to B$ = T (nothing known) | **branch**: try each case |

A clash in **every** branch means tautology. A branch that finishes without a clash gives a falsifying
row: the formula is not a tautology (and to call it a contingency, also find one row where it is T).
:::

:::theorem{#falsify-theorem name="Falsification is a complete test" depth="standard"}
The procedure ends with a clash in every branch if and only if the formula is a tautology. When a branch
ends without a clash, completing its assignment arbitrarily gives a row on which the formula is false.
:::

:::proof{#proof-falsify of="the falsification test" depth="standard"}
**Idea first:** each rule only writes down what the truth tables force, and the branches cover every
possibility, so nothing is lost and nothing is invented.

Every forcing rule is read off a truth table: for instance $A \to B$ is F on exactly one row, $A$ = T,
$B$ = F, so in any falsifying row these values must hold. A branch splits on all the rows that make a
sub-formula take the required value, so every falsifying row of the formula survives in some branch. If
every branch clashes, no falsifying row exists: tautology. Conversely, a branch that is complete and
clash-free has given every sub-formula a value consistent with its connective, so evaluating the
formula on that assignment (with any values for untouched variables) reproduces F at the root.
:::

:::viz{#falsify-viz spec="falsify-tree" mode="animate" depth="standard"}
:::

:::trick{#trick-implication-chain title="For H → C, start from the conclusion" depth="standard"}
Most GATE tautology options have the form $H \to C$. Make $C$ false first (it usually forces several
variables), then ask whether $H$ can still be true. If $H$ is forced false, that option is a tautology;
if $H$ can be true, you have the counterexample. "Is $X \to Y$ a tautology" is also exactly "does $X$
logically imply $Y$", so the same move answers implication questions.

**Why it works:** $H \to C$ is false only when $H$ is T and $C$ is F. **When it fails:** if $C$ is a
conjunction or a biconditional, making it false does not force much (there are several ways); then start
from $H$ instead, or branch.
:::

:::trap{#trap-branching title="One clashing branch is not a proof" depth="quick"}
When a step only says "$A \vee B$ is T", you must try $A$ = T **and** $B$ = T as separate branches. A
clash in the first branch proves nothing about the second. The opposite mistake is just as common:
finding one row where the formula is T and calling it a tautology. A tautology needs every branch to
clash; a non-tautology needs one clean branch.
:::

:::note{#recap-falsify title="Recap" depth="quick"}
Assume F, force values (→ false: T then F; ∨ false: both F; ∧ true: both T), branch only when forced to.
Clash everywhere = tautology; a clean branch = counterexample. For $H \to C$, falsify $C$ first.
:::

### Worked examples: falsification

::::example{#ex-fal-easy level="easy" title="Which is a tautology? (GATE 1997)" depth="quick"}
Which of $(p \vee q) \to p$, $p \vee (q \to p)$, $p \vee (p \to q)$, $p \to (p \to q)$ is a tautology?

:::step{why="Falsify each. A disjunction is false only if both parts are false; p ∨ (p → q) false needs p = F and p → q = F."}
$p \to q$ = F needs $p$ = T: clash with $p$ = F. So $p \vee (p \to q)$ cannot be false.
:::

:::step{why="The other three each have a clean falsifying row."}
$(p \vee q) \to p$: $p$ = F, $q$ = T. $p \vee (q \to p)$: $p$ = F, $q$ = T. $p \to (p \to q)$: $p$ = T, $q$ = F.
:::

:::answer
$p \vee (p \to q)$, which is $p \vee \neg p \vee q$: excluded middle in disguise.
:::
::::

::::example{#ex-fal-medium level="medium" title="Exhibit the falsifying row (GATE 1999)" depth="standard"}
Show that $(\neg p \vee q) \to (q \to p)$ is not a tautology.

:::step{why="The main connective is →; to make it false, the conclusion must be F."}
$q \to p$ = F forces $q$ = T, $p$ = F.
:::

:::step{why="Now check that the hypothesis can be T with these values."}
$\neg p \vee q = \text{T} \vee \text{T} = $ T. No clash.
:::

:::answer
On $p$ = F, $q$ = T the formula is $\text{T} \to \text{F} = $ F, so it is not a tautology. (It is
$(p \to q) \to (q \to p)$: an implication does not imply its converse.)
:::
::::

::::example{#ex-fal-gate level="gate" title="Find the non-tautology (GATE 2014)" depth="standard"}
Which is NOT a tautology: (A) $((a \to b) \wedge (b \to c)) \to (a \to c)$, (B) $(a \leftrightarrow c) \to
(\neg b \to (a \wedge c))$, (C) $(a \wedge b \wedge c) \to (c \vee a)$, (D) $a \to (b \to a)$?

:::step{why="(A): falsify the conclusion a → c, giving a = T, c = F; then a → b = T forces b = T, and b → c = T forces c = T. Clash."}
(A) is a tautology (this is the hypothetical syllogism, animated above).
:::

:::step{why="(B): falsify the conclusion ¬b → (a ∧ c): ¬b = T and a ∧ c = F, so b = F and not both a, c true."}
Now the hypothesis $a \leftrightarrow c$ must be T: take $a = c =$ F. No clash.
:::

:::step{why="(C) and (D): falsifying the conclusion contradicts the hypothesis at once (c ∨ a = F needs c = F, but the hypothesis needs c = T; b → a = F needs a = F, but the hypothesis needs a = T)."}
(C) and (D) are tautologies.
:::

:::answer
(B) is not a tautology; the falsifying row is $a$ = F, $b$ = F, $c$ = F.
:::
::::

::::example{#ex-fal-edge level="gate" title="Edge case: 'a contradiction' that pins the values (GATE 2017)" depth="standard"}
$(p \to q) \to r$ is false ("a contradiction" in the question's words). What can be said about $(r \to
p) \to q$?

:::step{why="An implication is false only as T → F, so the given formula being false forces both sides."}
$r$ = F and $p \to q$ = T.
:::

:::step{why="Substitute r = F into the target: r → p is F → p = T."}
$(r \to p) \to q \equiv \text{T} \to q \equiv q$.
:::

:::step{why="Now read the options: the target has the same value as q."}
It is T exactly when $q$ is T. It is not always T (take $q$ = F, $p$ = F), not always F, and with $p$ =
F it still depends on $q$.
:::

:::answer
"Always true when $q$ is true". The edge: $(p \to q) \to r$ is not literally a contradiction (it is
satisfiable); the question means "it is false", and the falsification rules do the rest.
:::
::::

::::example{#ex-fal-extra level="gate" title="Satisfiable but not valid (GATE 2004)" depth="standard"}
Classify $(P \to (Q \vee R)) \to ((P \vee Q) \to R)$.

:::step{why="Falsify the conclusion (P ∨ Q) → R: P ∨ Q = T and R = F."}
Try $P$ = F, $Q$ = T, $R$ = F. Hypothesis $P \to (Q \vee R)$ = $\text{F} \to \dots$ = T. No clash: the
formula is F on this row.
:::

:::step{why="To rule out 'contradiction', find one row where it is true: make the conclusion true."}
$R$ = T makes the conclusion, and so the formula, T.
:::

:::answer
Satisfiable but not valid (a contingency).
:::
::::

## Normal forms: DNF, CNF and canonical forms

:::intuition{#nf-intuition title="List the ways to win, or list the rules" depth="standard"}
There are two natural ways to describe a truth-table column in words. You can **list the winning
rows**: "the formula is true when ($p$ and $q$), or when (not $q$ and $r$)". That is an OR of ANDs, a
disjunctive normal form. Or you can **list the rules**: "you must have ($p$ or $q$ or $r$), and you must
have ($p$ or not $q$ or $r$) …", each rule forbidding some rows. That is an AND of ORs, a conjunctive
normal form.

If each AND-term mentions every variable, it pins down exactly one row; if each OR-clause mentions
every variable, it forbids exactly one row. These full-length versions are the **canonical** forms, and
because they are just the table written out, every formula has exactly one of each.
:::

:::definition{#nf-def term="Literal, clause, DNF, CNF" depth="quick"}
- A **literal** is a variable or its negation ($p$, $\neg p$).
- A **product term** (elementary product) is a conjunction of literals; a **clause** (elementary sum) is
  a disjunction of literals.
- A formula is in **disjunctive normal form (DNF)** if it is a disjunction of product terms, and in
  **conjunctive normal form (CNF)** if it is a conjunction of clauses.

Examples: $(p \wedge \neg q) \vee r$ is DNF; $(p \vee q) \wedge (\neg p \vee r)$ is CNF; a single literal is
both; $p \to q$ is neither until rewritten as $\neg p \vee q$ (which is both).
:::

:::definition{#canonical-def term="Minterms, maxterms, PDNF and PCNF" depth="quick"}
Fix the variables in order $x_1, \dots, x_n$ (first is the most significant bit) and write T = 1.

- A **minterm** is a product term containing **every** variable exactly once. Minterm $m_i$ is the one
  that is true on row $i$ only (row $i$ = the assignment whose bits read as the number $i$): write $x_j$
  where the bit is 1 and $\neg x_j$ where it is 0.
- A **maxterm** is a clause containing every variable exactly once. Maxterm $M_i$ is the one that is
  **false** on row $i$ only: write $x_j$ where the bit is **0** and $\neg x_j$ where it is 1.
- The **principal (canonical) DNF**, PDNF, is the disjunction of the minterms of the rows where the
  formula is T: $f = \Sigma m(\dots)$. The **principal CNF**, PCNF, is the conjunction of the maxterms
  of the rows where the formula is F: $f = \Pi M(\dots)$.

The two index lists are complements of each other in $\{0, \dots, 2^n - 1\}$, so their sizes add up to
$2^n$ (and the number of variables is $\log_2$ of that sum). A clause or product that misses a variable
is **not** a maxterm or minterm.
:::

:::theorem{#canonical-theorem name="Every formula has a unique PDNF and PCNF" depth="standard"}
Every formula that is not a contradiction is equivalent to exactly one PDNF (up to the order of terms
and literals), and every formula that is not a tautology to exactly one PCNF. (By convention the PDNF of
a contradiction is F and the PCNF of a tautology is T.)
:::

:::proof{#proof-canonical of="existence and uniqueness of canonical forms" depth="standard"}
**Idea first:** a minterm is a "row detector"; or-ing the detectors of the true rows rebuilds the column.

Minterm $m_i$ is true on row $i$ and false elsewhere (each literal is true exactly when its variable
has the row's value). The disjunction of $m_i$ over the true rows of $f$ is therefore true on exactly
those rows: it has $f$'s column. Uniqueness: two different sets of minterms differ on some row $i$,
and the two disjunctions differ on that row, so they are not equivalent. For the PCNF, apply the same
argument to $\neg f$ and use De Morgan: $\neg m_i$ is $M_i$ (the clause false on row $i$ only), so $f =
\neg(\neg f) = \neg \bigvee_{f(i)=\text{F}} m_i = \bigwedge_{f(i)=\text{F}} M_i$.
:::

:::derivation{#maxterm-index-derivation of="the number of a maxterm" depth="standard"}
A clause $\ell_1 \vee \dots \vee \ell_n$ is false only when every literal is false. A plain literal $x_j$
is false when $x_j = 0$; a negated literal $\neg x_j$ is false when $x_j = 1$. So the falsifying row
reads off as: **plain → 0, negated → 1**, and that row's number is the maxterm's index. This is the
opposite of the minterm rule (plain → 1), which is why maxterm indices are a common slip.

**Sanity check:** $M_0 = x \vee y \vee z$ is false only on 000, and $M_7 = \neg x \vee \neg y \vee \neg z$
only on 111. For the clauses $P \vee Q \vee \neg R$, $\neg P \vee Q \vee R$, $\neg P \vee \neg Q \vee R$:
the falsifying rows are 001, 100, 110, so the PCNF is $\Pi(1, 4, 6)$. (One reference set writes
$\Pi(1, 3, 6)$ by applying the minterm rule to $\neg P \vee Q \vee R$; the correct index is 4.)
:::

:::viz{#canonical-viz spec="canonical-table" mode="animate" depth="standard"}
:::

:::definition{#convert-method term="Converting by laws" depth="standard"}
To reach a DNF or CNF without a table: (1) remove $\to$ and $\leftrightarrow$; (2) push $\neg$ inward to the
variables; (3) for DNF distribute $\wedge$ over $\vee$, for CNF distribute $\vee$ over $\wedge$; (4) drop
terms with $x \wedge \neg x$ and clauses with $x \vee \neg x$. To turn a DNF term into minterms, multiply in
each missing variable as $(x \vee \neg x)$; to turn a CNF clause into maxterms, add each missing variable
as $(x \wedge \neg x)$ and distribute. For three or four variables the table is usually faster and safer.
:::

:::trap{#trap-maxterm-numbering title="Numbering maxterms the minterm way" depth="quick"}
The clause $\neg P \vee Q \vee R$ is $M_4$, not $M_3$: it is false on $P$ = 1, $Q$ = 0, $R$ = 0, i.e.
100. Reading "plain = 1" (the minterm rule) gives 011 = 3, the index of the **complementary** row.
Examiners build options from exactly this slip, so for a maxterm always ask "which row makes this clause
false?".
:::

:::trick{#trick-complement-indices title="One table, both canonical forms" depth="standard"}
Write the column once and number the rows 0 to $2^n - 1$ (with T = 1, first variable most significant).
True rows give $\Sigma$, false rows give $\Pi$. The PCNF of $f$ uses the same indices as the PDNF of
$\neg f$, and the PDNF of $f$ has the indices missing from its PCNF.

**Why it works:** every row is either true or false, never both. **When it fails:** if the question
orders the variables differently (say $r$ as the most significant bit), the indices change; reorder
before comparing index lists.
:::

:::note{#recap-nf title="Recap" depth="quick"}
DNF = OR of ANDs, CNF = AND of ORs. Minterm $m_i$ true only on row $i$ (plain = 1); maxterm $M_i$ false
only on row $i$ (plain = 0). PDNF = $\Sigma$ of true rows, PCNF = $\Pi$ of false rows, complementary
index lists of total size $2^n$.
:::

### Worked examples: normal forms

::::example{#ex-nf-easy level="easy" title="Canonical forms of p → q" depth="quick"}
Find the PDNF and PCNF of $p \to q$ (variables in the order $p, q$).

:::step{why="Number the rows with T = 1: TT = 3, TF = 2, FT = 1, FF = 0. p → q is false only on TF."}
True rows: 3, 1, 0. False row: 2.
:::

:::step{why="Write the minterms of the true rows (plain = 1) and the maxterm of the false row (plain = 0)."}
PDNF: $(p \wedge q) \vee (\neg p \wedge q) \vee (\neg p \wedge \neg q) = \Sigma(0, 1, 3)$. PCNF: row 2 is
$p$ = 1, $q$ = 0, so $M_2 = \neg p \vee q$.
:::

:::answer
$\Sigma(0, 1, 3)$ and $\Pi(2) = \neg p \vee q$. The PCNF is the familiar implication law: one forbidden row,
one clause.
:::
::::

::::example{#ex-nf-medium level="medium" title="Principal CNF from a formula (GATE 1995)" depth="standard"}
Obtain the PCNF of $(p \wedge q) \vee (\neg q \wedge r)$.

:::step{why="Find the true rows: p ∧ q is true on 111, 110; ¬q ∧ r on 101, 001."}
True rows (as numbers): 7, 6, 5, 1. So the formula is $\Sigma(1, 5, 6, 7)$.
:::

:::step{why="The PCNF uses the remaining rows."}
False rows: 0, 2, 3, 4.
:::

:::step{why="Write each maxterm with plain = 0, negated = 1."}
$M_0 = p \vee q \vee r$, $M_2 = p \vee \neg q \vee r$ (010), $M_3 = p \vee \neg q \vee \neg r$ (011), $M_4 = \neg p
\vee q \vee r$ (100).
:::

:::answer
$(p \vee q \vee r) \wedge (p \vee \neg q \vee r) \wedge (p \vee \neg q \vee \neg r) \wedge (\neg p \vee q \vee r) =
\Pi(0, 2, 3, 4)$, animated in the table above.
:::
::::

::::example{#ex-nf-gate level="gate" title="Comparing by minterm lists (GATE 2008)" depth="standard"}
Use minterm lists over $(P, Q)$ to decide which of I. $P \vee \neg Q$, II. $\neg(\neg P \wedge Q)$, III.
$PQ \vee P\neg Q \vee \neg P\neg Q$, IV. $PQ \vee P\neg Q \vee \neg PQ$ are equivalent.

:::step{why="I is false only on P = 0, Q = 1, which is row 1; its true rows are the rest."}
I = $\Sigma(0, 2, 3)$, and II ≡ I by De Morgan.
:::

:::step{why="III and IV are already sums of minterms: read the index of each term (P is the high bit)."}
III = $m_3 + m_2 + m_0 = \Sigma(0, 2, 3)$. IV = $m_3 + m_2 + m_1 = \Sigma(1, 2, 3)$.
:::

:::answer
I, II and III share $\Sigma(0, 2, 3)$; IV is $\Sigma(1, 2, 3) = P \vee Q$. Canonical forms make "are these
equivalent" a comparison of two lists of numbers.
:::
::::

::::example{#ex-nf-edge level="gate" title="Edge case: numbering given maxterms" depth="standard"}
A formula is $(P \vee Q \vee \neg R) \wedge (\neg P \vee Q \vee R) \wedge (\neg P \vee \neg Q \vee R)$. Write it as
$\Pi(\dots)$ and as $\Sigma(\dots)$.

:::step{why="Each clause has all three variables, so each is a maxterm. Its index is the row that makes it false (plain = 0, negated = 1)."}
$P \vee Q \vee \neg R \to 001 = 1$; $\neg P \vee Q \vee R \to 100 = 4$; $\neg P \vee \neg Q \vee R \to 110 = 6$.
:::

:::step{why="The PDNF lists the remaining rows."}
$\Sigma(0, 2, 3, 5, 7)$.
:::

:::answer
$\Pi(1, 4, 6) = \Sigma(0, 2, 3, 5, 7)$. Not $\Pi(1, 3, 6)$: that comes from numbering $\neg P \vee Q \vee R$
with the minterm rule.
:::
::::

## Satisfiability of CNF

:::intuition{#sat-intuition title="Each clause forbids a slice of the table" depth="standard"}
A CNF is a list of rules, and an assignment satisfies the CNF when it obeys every rule. Think of each
clause as forbidding the rows that make it false: a clause with $k$ literals on $k$ different variables
is false only when all $k$ literals are false, which pins those $k$ variables, so it forbids exactly
$1/2^k$ of the table. The CNF is unsatisfiable exactly when the forbidden slices together cover every
row.

This picture gives quick, exact answers. A single short clause forbids a lot; a long clause forbids
little. And a random assignment breaks any one clause only with probability $1/2^k \le 1/2$, which is the
seed of the GATE 2007 result.
:::

:::definition{#sat-def term="SAT, k-CNF and the two famous cases" depth="standard"}
- **SAT**: given a formula in CNF, decide whether some assignment satisfies every clause.
- **k-CNF**: every clause has at most $k$ literals. **2-SAT** (2-CNF) can be decided in polynomial
  time (by implication graphs); **3-SAT** is NP-complete, and so is SAT in general. These are facts to
  state, not to prove, in this chapter.
- A clause containing both $x$ and $\neg x$ is always true and can be dropped; the **empty clause** (no
  literals) is always false.
:::

:::theorem{#half-clauses-theorem name="Some assignment satisfies at least half the clauses" depth="standard"}
For every CNF formula whose clauses are non-empty, there is an assignment that makes at least half of
the clauses true. More precisely, if the clauses have at least $k$ literals each on distinct variables,
some assignment satisfies at least a fraction $1 - 2^{-k}$ of them.
:::

:::proof{#proof-half-clauses of="the half-the-clauses theorem" depth="standard"}
**Idea first:** an assignment and its exact opposite cannot both falsify the same clause.

Take any assignment $\tau$ and its complement $\bar\tau$ (every variable flipped). A non-empty clause
that is false under $\tau$ has all its literals false under $\tau$, so all of them are true under
$\bar\tau$, and the clause is true under $\bar\tau$. So every clause is true under at least one of $\tau$,
$\bar\tau$. If $\tau$ satisfies $s$ of the $m$ clauses, $\bar\tau$ satisfies at least $m - s$, and the
larger of $s$ and $m - s$ is at least $m/2$.

The sharper bound is an averaging argument: under a uniformly random assignment, a clause with $k$
distinct variables is false with probability $2^{-k}$, so the expected number of satisfied clauses is
$m(1 - 2^{-k})$, and some assignment does at least as well as the average. **Sanity check:** the CNF $p
\wedge \neg p$ has two clauses and every assignment satisfies exactly one: half, so the bound $1/2$ is
tight.
:::

:::theorem{#k-cnf-count name="Counting forbidden rows" depth="standard"}
Let a CNF over $n$ variables consist of $m$ clauses, each with exactly $k$ literals on $k$ distinct
variables. If $m < 2^k$, the formula is satisfiable. If the $m$ clauses are distinct and each contains
all $n$ variables (each is a maxterm), exactly $2^n - m$ assignments satisfy it.
:::

:::proof{#proof-k-cnf of="the counting facts" depth="standard"}
**Idea first:** count the rows each clause forbids and see whether they can cover the table.

Each clause forbids exactly $2^{n-k}$ rows (its $k$ variables are pinned, the other $n - k$ are free).
Together $m$ clauses forbid at most $m \cdot 2^{n-k} < 2^k \cdot 2^{n-k} = 2^n$ rows, so some row
survives. When every clause is a maxterm, each forbids exactly one row, and distinct maxterms forbid
distinct rows, so exactly $m$ rows are forbidden and $2^n - m$ survive. **Sanity check:** the four
clauses $(p \vee q)(p \vee \neg q)(\neg p \vee q)(\neg p \vee \neg q)$ have $m = 4 = 2^2$ and forbid all four
rows: the bound $m < 2^k$ cannot be improved.
:::

:::trap{#trap-cnf-always-sat title="Not every CNF is satisfiable" depth="quick"}
The statement "for any CNF there is an assignment making all clauses true" is false: $p \wedge \neg p$ is
already a CNF with two one-literal clauses. What **is** always possible is half of the clauses. And the
opposite extreme, "some CNF has at most a quarter of its clauses true under every assignment", is ruled
out by the same theorem.
:::

:::note{#recap-sat title="Recap" depth="quick"}
A $k$-literal clause forbids $1/2^k$ of the rows. Fewer than $2^k$ such clauses cannot cover the table.
An assignment and its complement together satisfy every non-empty clause, so some assignment satisfies
at least half. 2-SAT is easy, 3-SAT is NP-complete.
:::

### Worked examples: satisfiability of CNF

::::example{#ex-sat-easy level="easy" title="All four clauses on two variables" depth="quick"}
Is $(p \vee q) \wedge (p \vee \neg q) \wedge (\neg p \vee q) \wedge (\neg p \vee \neg q)$ satisfiable?

:::step{why="Each clause is a maxterm over p, q and forbids one row: 00, 01, 10, 11 respectively."}
The four clauses forbid all $2^2 = 4$ rows.
:::

:::step{why="Confirm by laws: the first two combine to p (factor p out, q ∧ ¬q is F), the last two to ¬p."}
The formula is $p \wedge \neg p$.
:::

:::answer
Unsatisfiable: it is the product of all maxterms, $\Pi(0, 1, 2, 3)$.
:::
::::

::::example{#ex-sat-medium level="medium" title="Counting the survivors" depth="standard"}
How many assignments of $p, q, r$ satisfy $(p \vee q) \wedge (\neg p \vee r)$?

:::step{why="p ∨ q forbids rows with p = q = F: 2 rows (r free)."}
Forbidden by clause 1: FFT, FFF.
:::

:::step{why="¬p ∨ r forbids rows with p = T, r = F: 2 rows (q free)."}
Forbidden by clause 2: TTF, TFF.
:::

:::step{why="The two forbidden sets do not overlap (one needs p = F, the other p = T)."}
$8 - 4 = 4$ satisfying rows.
:::

:::answer
4 (TTT, TFT, FTT, FTF). Counting forbidden rows is faster than building the table, but watch for
overlaps when clauses share no variable that separates them.
:::
::::

::::example{#ex-sat-gate level="gate" title="What is true of every CNF? (GATE 2007)" depth="standard"}
Which is true: (A) for any CNF, some assignment makes at least half the clauses true; (B) for any CNF,
some assignment makes all clauses true; (C) some CNF has, under every assignment, at most one quarter of
its clauses true; (D) none of these?

:::step{why="(B) is the claim 'every CNF is satisfiable'; one unsatisfiable CNF refutes it."}
$p \wedge \neg p$: no assignment satisfies both clauses. (B) is false.
:::

:::step{why="(A) is the half-the-clauses theorem: an assignment and its complement cover every clause."}
(A) is true.
:::

:::step{why="(C) contradicts (A): every CNF has an assignment with at least half true, which is more than a quarter."}
(C) is false, and so is (D).
:::

:::answer
(A).
:::
::::

::::example{#ex-sat-edge level="gate" title="Edge case: the bound is tight" depth="standard"}
Give a CNF with four clauses where no assignment satisfies more than two of them. Does the "$1 - 2^{-k}$"
version contradict it?

:::step{why="Use two variables and their negations as one-literal clauses."}
$p \wedge \neg p \wedge q \wedge \neg q$: every assignment makes exactly one of $p, \neg p$ and one of $q, \neg q$
true, so exactly 2 of 4.
:::

:::step{why="Here k = 1, and 1 − 2⁻¹ = 1/2: the sharper bound also predicts exactly half."}
$4 \times (1 - 1/2) = 2$, achieved. No contradiction.
:::

:::answer
$p \wedge \neg p \wedge q \wedge \neg q$. The guarantee is "at least half", and one-literal clauses show it
cannot be raised for general CNF; with all clauses of size 3 the guarantee rises to $7/8$.
:::
::::

## Functional completeness

:::intuition{#complete-intuition title="Which building kits can build everything?" depth="standard"}
Every column is some formula: the PDNF writes any column with just $\neg$, $\wedge$ and $\vee$. So $\{\neg,
\wedge, \vee\}$ is a kit that can build every Boolean function. A natural question, and a favourite of
examiners, is which **smaller** kits still can. Since $\vee$ can be rebuilt from $\neg$ and $\wedge$ by De
Morgan, $\{\neg, \wedge\}$ is enough; a single connective, NAND, can even build $\neg$ by itself.

The opposite question is just as useful: why can a kit **fail**? The cleanest reason is that every
piece in it preserves some property, and so everything built from it keeps that property. If every
connective outputs T when all its inputs are T, then so does every formula built from them, and $\neg$
(which outputs F on input T) can never be built. Post's theorem says that five such properties are the
only obstacles.
:::

:::definition{#complete-def term="Functionally complete set" depth="quick"}
A set $S$ of connectives is **functionally complete** (adequate) if every Boolean function, of any
number of variables, is equivalent to some formula built from variables using only connectives in
$S$. A Boolean function of $n$ variables is any assignment of T/F to the $2^n$ rows, so there are
$2^{2^n}$ of them (16 for $n = 2$, 256 for $n = 3$).
:::

:::theorem{#standard-complete name="The standard complete sets" depth="standard"}
Each of these is functionally complete: $\{\neg, \wedge, \vee\}$, $\{\neg, \wedge\}$, $\{\neg, \vee\}$,
$\{\neg, \to\}$, $\{\to, \text{F}\}$, $\{\uparrow\}$ (NAND), $\{\downarrow\}$ (NOR).
:::

:::proof{#proof-standard-complete of="the standard complete sets" depth="standard"}
**Idea first:** to show a set is complete, build a known complete set from it.

$\{\neg, \wedge, \vee\}$: every non-contradictory function is its PDNF, and a contradiction is $p \wedge \neg
p$. $\{\neg, \wedge\}$: $p \vee q \equiv \neg(\neg p \wedge \neg q)$. $\{\neg, \vee\}$: $p \wedge q \equiv \neg(\neg p
\vee \neg q)$. $\{\neg, \to\}$: $p \vee q \equiv \neg p \to q$, so we have $\{\neg, \vee\}$. $\{\to, \text{F}\}$:
$\neg p \equiv p \to \text{F}$, so we have $\{\neg, \to\}$. NAND: $\neg p \equiv p \uparrow p$ and $p \wedge q
\equiv (p \uparrow q) \uparrow (p \uparrow q)$, so we have $\{\neg, \wedge\}$. NOR: $\neg p \equiv p \downarrow p$
and $p \vee q \equiv (p \downarrow q) \downarrow (p \downarrow q)$, so we have $\{\neg, \vee\}$.
:::

:::definition{#post-classes term="Post's five classes" depth="standard"}
A Boolean function $f$ is

| Class | Property | Examples inside | Examples outside |
|:--|:--|:--|:--|
| $T_0$ (F-preserving) | $f(\text{F}, \dots, \text{F}) = \text{F}$ | $\wedge, \vee, \oplus$ | $\neg, \to, \leftrightarrow, \uparrow, \downarrow$ |
| $T_1$ (T-preserving) | $f(\text{T}, \dots, \text{T}) = \text{T}$ | $\wedge, \vee, \to, \leftrightarrow$ | $\neg, \oplus, \uparrow, \downarrow$ |
| self-dual | $f(\neg x_1, \dots, \neg x_n) = \neg f(x_1, \dots, x_n)$ | $\neg$, majority | $\wedge, \vee, \to$ |
| monotone | changing an input from F to T never changes the output from T to F | $\wedge, \vee$ | $\neg, \to, \oplus$ |
| affine (linear) | $f = c_0 \oplus c_1 x_1 \oplus \dots \oplus c_n x_n$ | $\neg, \oplus, \leftrightarrow$ | $\wedge, \vee, \to$ |

Each class is closed under composition: plugging functions of the class into a function of the class
gives a function of the class.
:::

:::theorem{#post-theorem name="Post's completeness criterion" depth="standard"}
A set $S$ of connectives is functionally complete if and only if, for **each** of the five classes,
$S$ contains at least one connective that is **not** in that class.
:::

:::proof{#proof-post of="Post's criterion (necessity in full, sufficiency sketched)" depth="standard"}
**Idea first:** a class closed under composition is a trap; a complete set must have a way out of every
trap.

Necessity: suppose every connective in $S$ lies in one class $K$. Variables lie in every class, and $K$
is closed under composition, so every formula built from $S$ lies in $K$. But $\neg$ is outside $T_0$,
$T_1$ and the monotone class, and $\wedge$ is outside the self-dual and affine classes, so $S$ cannot
build both, and it is not complete. Sufficiency (sketch): a function outside $T_0$ and one outside $T_1$
give either $\neg$ or both constants; a non-self-dual function then gives a constant; a non-monotone one
gives $\neg$; and a non-affine one, with $\neg$ and the constants, gives $\wedge$. Then $\{\neg, \wedge\}$ is
available. For GATE, use the criterion in its necessary direction: to show a set is **not** complete,
find one class that traps all of it.
:::

:::derivation{#count-functions of="counting Boolean functions" depth="standard"}
A function of $n$ variables chooses T or F independently on each of the $2^n$ rows: $2^{2^n}$ functions.
Restricted counts follow the same "free choices" idea.

- $T_0$ (or $T_1$): one row is fixed, $2^n - 1$ free: $2^{2^n - 1}$ functions.
- Self-dual: the rows pair up as $(x, \bar x)$, and choosing $f(x)$ fixes $f(\bar x) = \neg f(x)$; there are
  $2^{n-1}$ pairs: $2^{2^{n-1}}$ functions.
- **Neutral** (exactly half the rows T): choose which $2^{n-1}$ of the $2^n$ rows are T:
  $\binom{2^n}{2^{n-1}}$ functions.
- Affine: choose $c_0, \dots, c_n$: $2^{n+1}$ functions.

**Sanity check** with $n = 2$: $2^4 = 16$ functions; $2^3 = 8$ preserve F; $2^2 = 4$ are self-dual ($p$,
$q$, $\neg p$, $\neg q$); $\binom{4}{2} = 6$ are neutral; $2^3 = 8$ are affine (the constants, $p$, $q$, their
negations, $\oplus$ and $\leftrightarrow$).
:::

:::viz{#complete-viz spec="completeness-map" mode="animate" depth="standard"}
:::

:::trap{#trap-xnor title="EX-NOR alone, or ↔ with ¬, is not complete" depth="quick"}
$\leftrightarrow$ (EX-NOR) outputs T on the all-T row, so every formula built from it alone does too, and
$\neg$ cannot be built: $\{\leftrightarrow\}$ is trapped in $T_1$ (GATE IT 2008). Adding $\neg$ escapes $T_1$
but not the affine class: $\neg$ and $\leftrightarrow$ are both affine, so $\{\neg, \leftrightarrow\}$ still
cannot build $\wedge$. And $\{\wedge, \vee, \to, \leftrightarrow\}$, four connectives, is not complete
either: all four preserve T.
:::

:::trick{#trick-t1-test title="The all-T / all-F test" depth="standard"}
Plug all-T into every connective of the set. If every output is T, the set cannot build $\neg$, so it
is not complete. Do the same with all-F. These two tests settle most GATE options in seconds.

**Why it works:** $T_1$ and $T_0$ are closed under composition. **When it fails:** passing both tests
does not prove completeness. $\{\oplus, \leftrightarrow\}$ passes ($\oplus$ escapes $T_1$, $\leftrightarrow$
escapes $T_0$) but both are affine, so the set is still incomplete. For a positive answer, build $\neg$
and $\wedge$ (or $\vee$) explicitly.
:::

:::note{#recap-complete title="Recap" depth="quick"}
Complete: $\{\neg, \wedge\}$, $\{\neg, \vee\}$, $\{\neg, \to\}$, $\{\to, \text{F}\}$, NAND, NOR. Not complete: any
set trapped in one of $T_0$, $T_1$, self-dual, monotone, affine, e.g. $\{\leftrightarrow\}$, $\{\neg,
\leftrightarrow\}$, $\{\wedge, \vee, \to, \leftrightarrow\}$. There are $2^{2^n}$ functions of $n$ variables.
:::

### Worked examples: functional completeness

::::example{#ex-comp-easy level="easy" title="Everything from NAND" depth="quick"}
Express $\neg p$, $p \wedge q$ and $p \vee q$ using only $\uparrow$ (NAND, $p \uparrow q \equiv \neg(p \wedge q)$).

:::step{why="Feed the same input twice: ¬(p ∧ p) = ¬p by idempotence."}
$\neg p \equiv p \uparrow p$.
:::

:::step{why="NAND then NOT gives AND; NOT is again a NAND with itself."}
$p \wedge q \equiv \neg(p \uparrow q) \equiv (p \uparrow q) \uparrow (p \uparrow q)$.
:::

:::step{why="De Morgan: p ∨ q ≡ ¬(¬p ∧ ¬q) = ¬p ↑ ¬q."}
$p \vee q \equiv (p \uparrow p) \uparrow (q \uparrow q)$.
:::

:::answer
NAND builds $\neg$, $\wedge$, $\vee$, so $\{\uparrow\}$ is complete. Sanity check on $p = q =$ F: $(\text{F}
\uparrow \text{F}) \uparrow (\text{F} \uparrow \text{F}) = \text{T} \uparrow \text{T} = $ F, matching $p \vee q$.
:::
::::

::::example{#ex-comp-medium level="medium" title="Implication and negation" depth="standard"}
Show $\{\to, \neg\}$ is complete, and that $\{\to\}$ alone is not.

:::step{why="Disjunction as implication: p ∨ q ≡ ¬p → q."}
$\vee$ is available, so $\{\neg, \vee\}$ is, which is complete.
:::

:::step{why="For {→} alone apply the all-T test: T → T = T."}
Every formula built from $\to$ alone is T on the all-T row, so $\neg p$ cannot be built.
:::

:::answer
$\{\to, \neg\}$ is complete; $\{\to\}$ is not (trapped in $T_1$). With the constant F added, $\{\to,
\text{F}\}$ is complete again, since $p \to \text{F} \equiv \neg p$.
:::
::::

::::example{#ex-comp-gate level="gate" title="Which set is not complete? (GATE IT 2008)" depth="standard"}
Which is NOT functionally complete: (A) EX-NOR, (B) implication and negation, (C) OR and negation, (D)
NAND?

:::step{why="(B), (C), (D) are on the standard list (proved above)."}
All three are complete.
:::

:::step{why="Apply the all-T test to EX-NOR: T ↔ T = T."}
EX-NOR preserves T, so it cannot build $\neg$.
:::

:::answer
(A) EX-NOR. (It is also affine, a second trap.)
:::
::::

::::example{#ex-comp-edge level="gate" title="Edge case: passing the quick tests is not enough" depth="standard"}
Is $\{\oplus, \leftrightarrow\}$ complete? How many single binary connectives are complete on their own?

:::step{why="All-T and all-F tests: ⊕(T, T) = F escapes T₁; ↔(F, F) = T escapes T₀. Both tests pass."}
No quick verdict.
:::

:::step{why="Check the affine class: p ⊕ q and p ↔ q = p ⊕ q ⊕ 1 are both affine, and so is everything built from them."}
$p \wedge q$ (not affine) cannot be built: not complete.
:::

:::step{why="A single binary connective must escape T₀ and T₁ (so f(F, F) = T and f(T, T) = F) and also escape self-duality; of the four candidates, ¬p and ¬q are self-dual."}
Only NAND and NOR remain.
:::

:::answer
$\{\oplus, \leftrightarrow\}$ is not complete (affine trap). Exactly **2** of the 16 binary connectives are
complete alone: NAND and NOR.
:::
::::

## Try it: the Truth Table Lab

Use the **Compare** tab to put two formulas side by side: the lab draws both columns, says whether
they are equivalent or whether one only implies the other, and highlights the rows where they differ.
Try GATE 2006's P1 by comparing `(A & B) -> C` with `(A -> C) & (B -> C)` (and then with `|` in the
middle), check the false law `p & (q -> r)` against `(p & q) -> (p & r)`, or compare GATE 2005's `(P |
Q) -> R` with `(P -> R) | (Q -> R)` and watch the verdict say "A implies B, but not conversely". The
Table tab prints minterm and maxterm lists with the numbering used in this lesson.

:::lab{#lab-compare lab="truth-table" tab="compare" depth="standard"}
:::

## GATE questions on this lesson

All twenty-three previous-year questions, in year order. Try each before opening the solution.

:::pyq{id="cse-1991-a-3-xii" tests="closure-theorem,classes-def,ex-class-gate" depth="standard"}
:::

:::pyq{id="cse-1992-a-2-xvi" tests="falsify-method,trick-implication-chain,falsify-theorem" depth="standard"}
:::

:::pyq{id="cse-1993-ii-a-8-2" tests="laws-table,ex-law-easy" depth="standard"}
:::

:::pyq{id="cse-1995-b-61" tests="canonical-def,maxterm-index-derivation,ex-nf-medium" depth="standard"}
:::

:::pyq{id="cse-1996-a-28" tests="falsify-method,imp-laws,trick-implication-chain" depth="standard"}
:::

:::pyq{id="cse-1997-a-17" tests="falsify-method,ex-fal-easy" depth="standard"}
:::

:::pyq{id="cse-1999-b-62-a" tests="falsify-method,ex-fal-medium" depth="standard"}
:::

:::pyq{id="cse-1999-b-62-b" tests="closure-theorem,ex-class-edge" depth="standard"}
:::

:::pyq{id="cse-2000-a-2-7" tests="substitution-theorem,ex-proof-edge" depth="standard"}
:::

:::pyq{id="cse-2001-a-3" tests="classes-def,trap-satisfiable,ex-class-medium" depth="standard"}
:::

:::pyq{id="cse-2002-b-53-b" tests="classes-def,laws-table,ex-class-easy" depth="standard"}
:::

:::pyq{id="cse-2004-cs-70" tests="classes-def,falsify-method,ex-fal-extra" depth="standard"}
:::

:::pyq{id="cse-2005-cs-40" tests="equiv-def,split-derivation,trap-equiv-vs-iff,ex-eq-edge" depth="standard"}
:::

:::pyq{id="cse-2006-cs-27" tests="split-derivation,trick-hypothesis-split,ex-law-gate" depth="standard"}
:::

:::pyq{id="cse-2007-cs-48" tests="half-clauses-theorem,trap-cnf-always-sat,ex-sat-gate" depth="standard"}
:::

:::pyq{id="cse-2008-cs-31" tests="canonical-def,ex-eq-gate,ex-nf-gate" depth="standard"}
:::

:::pyq{id="it-2008-it-1" tests="post-theorem,trap-xnor,ex-comp-gate" depth="standard"}
:::

:::pyq{id="cse-2014-2-cs-53" tests="falsify-method,falsify-viz,ex-fal-gate" depth="standard"}
:::

:::pyq{id="cse-2015-1-cs-14" tests="imp-laws,ex-eq-easy" depth="standard"}
:::

:::pyq{id="cse-2017-1-cs-1" tests="imp-laws,ex-eq-medium" depth="standard"}
:::

:::pyq{id="cse-2017-1-cs-29" tests="falsify-method,ex-fal-edge" depth="standard"}
:::

:::pyq{id="cse-2021-1-cs-7" tests="ladder-method,ex-proof-medium" depth="standard"}
:::

:::pyq{id="cse-2021-2-cs-15" tests="ladder-method,ladder-viz,ex-proof-gate" depth="standard"}
:::

## Practice

Our own questions in GATE formats: classification and laws first, then normal forms and CNF, then
completeness and counting.

:::practice{id="nx-dm-01-02-q01" depth="standard"}
:::

:::practice{id="nx-dm-01-02-q02" depth="standard"}
:::

:::practice{id="nx-dm-01-02-q03" depth="standard"}
:::

:::practice{id="nx-dm-01-02-q04" depth="standard"}
:::

:::practice{id="nx-dm-01-02-q05" depth="standard"}
:::

:::practice{id="nx-dm-01-02-q06" depth="standard"}
:::

:::practice{id="nx-dm-01-02-q07" depth="standard"}
:::

:::practice{id="nx-dm-01-02-q08" depth="standard"}
:::

:::practice{id="nx-dm-01-02-q09" depth="standard"}
:::

:::practice{id="nx-dm-01-02-q10" depth="standard"}
:::

:::practice{id="nx-dm-01-02-q11" depth="standard"}
:::

:::practice{id="nx-dm-01-02-q12" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Tautologies, laws and normal forms on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Verdicts | tautology = all T = valid; contradiction = all F = unsatisfiable; contingency = mixed; satisfiable = some T |
| Equivalence | $A \equiv B$ iff $A \leftrightarrow B$ is a tautology; $A \Rightarrow B$ iff $A \to B$ is a tautology |
| Core laws | De Morgan, absorption, both distributive laws, $p \wedge (\neg p \vee q) \equiv p \wedge q$; dual pairs |
| Arrows | $p \to q \equiv \neg p \vee q$; $\neg(p \to q) \equiv p \wedge \neg q$; $(p \wedge q) \to r \equiv p \to (q \to r)$ |
| Splitting | conclusion keeps the connective; hypothesis swaps it: $(p \vee q) \to r \equiv (p \to r) \wedge (q \to r)$ |
| Not laws | $\wedge$ over $\to$; $\to$ commutative or associative |
| Tautology test | assume F, force values; clash everywhere = tautology, clean branch = counterexample |
| Canonical forms | $m_i$ true only on row $i$ (plain = 1); $M_i$ false only on row $i$ (plain = 0); $\Sigma$ and $\Pi$ index lists are complements |
| CNF | some assignment satisfies $\ge$ half the clauses; $< 2^k$ clauses of size $k$ are satisfiable |
| Completeness | Post: escape $T_0$, $T_1$, self-dual, monotone, affine; NAND, NOR, $\{\neg, \wedge\}$, $\{\neg, \to\}$ complete; $\{\leftrightarrow\}$ not |
| Counting | $2^{2^n}$ functions; self-dual $2^{2^{n-1}}$; neutral $\binom{2^n}{2^{n-1}}$ |
:::

:::note{#further-depth title="Further depth: why tautology checking is hard and SAT solvers still work" depth="deep"}
Deciding whether a formula is a tautology is the complement of SAT (a formula is a tautology exactly
when its negation is unsatisfiable), so it is coNP-complete: no known method avoids exponential time on
every input, and the truth table's $2^n$ rows are the honest worst case. Yet modern SAT solvers settle
industrial formulas with millions of variables. They combine three ideas from this lesson: they work on
CNF (each clause is a small rule), they **force** values exactly like our falsification rules (unit
propagation: a clause with all literals false but one forces that one), and they **branch** only when
nothing is forced, learning a new clause from every clash so that the same dead end is never explored
twice. The "try to make it false" test you practised by hand is, in essence, the inner loop of these
programs.
:::
