---
id: inference-resolution
subject: dm
chapter: propositional-logic
title: Arguments, rules of inference and resolution
order: 3
prerequisites: [propositions-connectives, equivalence-normal-forms]
pyq_topics: [dm/logic]
est_minutes: 55
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every validity verdict, critical row, consistency check, resolution refutation, puzzle solution, PYQ key and practice answer is recomputed in content/gate-notes/_checks/dm/l1_03_inference.py with logiclib.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 21–25, set B pp. 165–167, set C pp. 297–321, set D pp. 674–675, set E pp. 778–797. Resolution completeness and axiom-system terminology are a gap in the sets and are taught from the textbooks below."
  - "Facts checked against standard textbooks: K. H. Rosen, Discrete Mathematics and its Applications (valid arguments, rules of inference, fallacies, resolution, knights and knaves); H. B. Enderton, A Mathematical Introduction to Logic (soundness, completeness, consistency)."
  - "PYQs: src/gate/questions.json (dm/logic); all eight keys (three descriptive) are re-derived by truth table, resolution or brute force in l1_03_inference.py."
updated: "2026-10-23"
---

The first two lessons taught you to read a formula and to decide what it is worth in every possible
world. This lesson turns that skill into **reasoning**: given some statements we accept (the
premises), what else are we forced to accept (the conclusion)? Every proof you will ever write, every
"which of the following follows" question in GATE, and every logic-programming engine rests on the
same simple test: an argument is good when there is **no world in which the premises hold and the
conclusion fails**. We build that test, then the short-cuts that save you from writing whole truth
tables (the rules of inference), the two classic ways of reasoning badly (the fallacies), the single
rule that machines use to do all of it (resolution), the vocabulary of axiom systems, and finally the
truth-teller and liar puzzles that GATE uses to test whether you can turn a story into a formula.

## Where this fits

[Lesson 1](lesson:propositions-connectives) built truth tables and the implication $p \to q$; you will
use its one false row (T then F) constantly here. [Lesson 2](lesson:equivalence-normal-forms) taught
tautologies, satisfiability and conjunctive normal form (CNF); validity of an argument is a tautology
question in disguise, and resolution works on CNF clauses. Chapter 2 lifts everything in this lesson to
predicates and quantifiers: the GATE 1992 question at the end already uses one constant and two
variables, and we solve it here by substitution. If you have met SAT solvers or Prolog, resolution is
the engine under both.

:::table{#radar title="GATE radar: arguments, rules of inference and resolution" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 8 (1991–2015) |
| Marks | 3 one-mark (2012, both 2015 papers), 2 two-mark (2003, IT 2004), 3 descriptive (1991, 1992, 1993) |
| Pattern 1 | Which arguments (or inferences) are valid: IT 2004, 2012 |
| Pattern 2 | What follows from two English premises (chain of implications): 2015 |
| Pattern 3 | Resolution: which statement about the rule is false (2003); show a set inconsistent by resolution (1992) |
| Pattern 4 | Logical consequence by truth table (1993); axiom systems, consistency and completeness (1991) |
| Pattern 5 | Truth-tellers and liars: a statement about one's own honesty (2015) |
| What examiners test | That validity means "no row with true premises and false conclusion", that affirming the consequent and denying the antecedent are invalid, that a resolvent follows from its parents but not the other way round, and that a liar's statement is false |
:::

## Arguments and validity

:::intuition{#argument-intuition title="A valid argument cannot lead you from truth to falsehood" depth="standard"}
Think of an argument as a machine that takes true statements in and is supposed to hand a true
statement out. A **valid** machine has a guarantee: whenever everything you feed it is true, what comes
out is true. It makes no promise when you feed it something false; garbage in may give garbage out.

That is exactly the promise of an implication, from Lesson 1. "If all the premises are true, then the
conclusion is true" is broken only in one kind of world: premises all true, conclusion false. So
checking validity means hunting for such a world. If the hunt fails in every one of the $2^n$ worlds,
the argument is valid; if it succeeds even once, that world is a **counterexample** and the argument is
invalid, no matter how convincing it sounds.

Notice what validity does **not** care about: whether the premises are actually true today, and what
the sentences mean. "If the moon is cheese, then $7$ is even; the moon is cheese; so $7$ is even" is a
valid argument (it has the shape of modus ponens), with a false conclusion, because a premise is
false. Validity is a property of the **form**.
:::

:::definition{#argument-def term="Argument, valid, sound" depth="quick"}
An **argument** is a list of propositions $P_1, P_2, \dots, P_n$ (the **premises**) together with a
proposition $C$ (the **conclusion**), written $P_1, \dots, P_n \;\therefore\; C$.

- The argument is **valid** if every assignment of truth values that makes all of $P_1, \dots, P_n$
  true also makes $C$ true. We then write $P_1, \dots, P_n \models C$.
- A row of the truth table on which every premise is true is a **critical row**. Validity says: the
  conclusion is true on every critical row.
- An assignment with all premises true and the conclusion false is a **counterexample**; an argument is
  invalid exactly when it has one.
- A valid argument whose premises are actually true is **sound**; its conclusion is then true.
:::

:::theorem{#validity-theorem name="Three equivalent tests for validity" depth="standard"}
For premises $P_1, \dots, P_n$ and conclusion $C$, the following say the same thing:

1. the argument $P_1, \dots, P_n \;\therefore\; C$ is valid;
2. the formula $(P_1 \wedge P_2 \wedge \dots \wedge P_n) \to C$ is a **tautology**;
3. the formula $P_1 \wedge P_2 \wedge \dots \wedge P_n \wedge \neg C$ is **unsatisfiable** (a contradiction).
:::

:::proof{#proof-validity of="the three tests for validity" depth="standard"}
**Idea first:** all three statements say "there is no row with every premise true and the conclusion
false"; they only phrase it differently.

(1 ⇔ 2) Write $P = P_1 \wedge \dots \wedge P_n$; $P$ is true on a row exactly when every premise is,
i.e. on the critical rows. The implication $P \to C$ is false only on rows where $P$ is T and $C$ is F,
i.e. on counterexample rows. So $P \to C$ is true on every row (a tautology) exactly when there is no
counterexample, which is validity.

(2 ⇔ 3) $\neg(P \to C) \equiv P \wedge \neg C$ (the negated implication from Lesson 1). A formula is a
tautology exactly when its negation is a contradiction, so $P \to C$ is a tautology exactly when
$P \wedge \neg C$ is unsatisfiable. **Sanity check:** for $p, \neg p \;\therefore\; q$ there is no
critical row at all ($p \wedge \neg p$ is never true), so test 3 holds trivially and the argument is
valid; test 2 agrees, since $(p \wedge \neg p) \to q$ has a false hypothesis on every row.
:::

:::viz{#critical-viz spec="critical-rows" mode="animate" depth="standard"}
:::

:::trick{#trick-falsify-conclusion title="Assume the conclusion is false and try to make every premise true" depth="standard"}
You rarely need all $2^n$ rows. Start from the only rows that can hurt you: set the conclusion **false**,
which usually fixes one or two variables, then try to make the premises true one by one. Every forced
value narrows the search. If you reach a full assignment with every premise true, it is a
counterexample: **invalid**. If every attempt forces some premise to be false, **valid**.

**Why it works:** a counterexample is precisely "conclusion false, premises true", so searching from the
conclusion side searches only the rows that matter. **When it fails:** when the conclusion is false on
many rows (for example a disjunction $a \vee b \vee c$ is false on one pattern only, which is great; but
a conjunction $a \wedge b$ is false on three patterns), you must try each pattern; and when several
premises are disjunctions you may have to branch. Keep the branches written down, or switch to the full
table or to resolution.
:::

:::trap{#trap-valid-vs-true title="Valid is not the same as true, and invalid is not the same as false" depth="quick"}
Examiners like options such as "the conclusion is true, so the argument is valid" or "the conclusion is
false, so the argument is invalid". Both reasonings are wrong. A valid argument can have a false
conclusion (if a premise is false), and an invalid argument can have a true conclusion by luck. Only
the **form** decides validity: look for a row with true premises and a false conclusion, nothing else.
:::

### Worked examples: validity

::::example{#ex-arg-easy level="easy" title="Checking modus tollens by its critical rows" depth="quick"}
Is the argument $p \to q,\ \neg q \;\therefore\; \neg p$ valid?

:::step{why="Two variables give four rows; list both premise columns so we can find the critical rows (both premises true)."}
Rows TT, TF, FT, FF. $p \to q$: T, F, T, T. $\neg q$: F, T, F, T.
:::

:::step{why="A critical row needs every premise true: only FF has T in both columns."}
The only critical row is $p = $ F, $q = $ F.
:::

:::step{why="Validity only asks about the conclusion on the critical rows."}
On FF, $\neg p = $ T.
:::

:::answer
**Valid.** The conclusion is true on the single critical row, so no counterexample exists. This form
is called **modus tollens**.
:::
::::

::::example{#ex-arg-medium level="medium" title="The falsify-the-conclusion search" depth="standard"}
Decide whether $p \to (q \vee r),\ \neg q,\ p \;\therefore\; r$ is valid, without writing eight rows.

:::step{why="A counterexample must make the conclusion false, so start there."}
Set $r = $ F.
:::

:::step{why="Now force the premises to be true one at a time; the short premises fix variables immediately."}
$\neg q$ true forces $q = $ F; $p$ true forces $p = $ T.
:::

:::step{why="Every variable is now fixed; evaluate the remaining premise on this assignment."}
$p \to (q \vee r) = \text{T} \to (\text{F} \vee \text{F}) = \text{T} \to \text{F} = \text{F}$.
:::

:::answer
The only candidate counterexample makes a premise false, so there is no counterexample: the argument
is **valid**. Three variables, one row examined.
:::
::::

::::example{#ex-arg-gate level="gate" title="Which of four arguments are valid? (GATE IT 2004)" depth="standard"}
Decide the validity of
(1) $(\neg p \vee q) \wedge (r \to s) \wedge (p \vee r) \;\therefore\; \neg s \to q$;
(2) $(\neg p \wedge q) \wedge (q \to (p \to r)) \;\therefore\; \neg r$;
(3) $((q \wedge r) \to p) \wedge (\neg q \wedge p) \;\therefore\; r$;
(4) $p \wedge (p \to r) \wedge (q \vee \neg r) \;\therefore\; q$.

:::step{why="Argument 2: the conclusion ¬r is false when r = T. The premise ¬p ∧ q forces p = F and q = T. Then p → r is F → T = T, so q → (p → r) is T."}
$p = $ F, $q = $ T, $r = $ T makes both premises true and $\neg r$ false: a counterexample. (2) is invalid.
:::

:::step{why="Argument 3: the conclusion r is false when r = F. The premise ¬q ∧ p forces q = F, p = T; then q ∧ r is F, so (q ∧ r) → p is T."}
$p = $ T, $q = $ F, $r = $ F is a counterexample. (3) is invalid.
:::

:::step{why="Argument 4: p and p → r give r (modus ponens); then q ∨ ¬r with ¬r false gives q (disjunctive syllogism). A chain of valid rules cannot produce a counterexample."}
(4) is valid.
:::

:::step{why="Argument 1: falsify the conclusion ¬s → q, i.e. s = F and q = F. Then r → s forces r = F, p ∨ r forces p = T, and ¬p ∨ q = F ∨ F = F. A premise fails."}
No counterexample exists, so (1) is valid.
:::

:::answer
Arguments **1 and 4** are valid; 2 and 3 have the counterexamples shown. (In the chained-proofs
section we derive argument 1 step by step as well.)
:::
::::

::::example{#ex-arg-edge level="gate" title="Edge case: contradictory premises prove anything" depth="standard"}
Is $p,\ \neg p \;\therefore\; q$ valid? Is it sound?

:::step{why="Look for critical rows: p and ¬p must both be true, which never happens."}
There are no critical rows.
:::

:::step{why="Validity says the conclusion is true on every critical row; with no critical rows the condition holds vacuously, exactly like an implication with a false hypothesis."}
No counterexample can exist, so the argument is valid.
:::

:::step{why="Soundness needs a valid argument whose premises are all actually true; p and ¬p cannot both be true."}
It can never be sound.
:::

:::answer
**Valid but never sound.** From inconsistent premises every conclusion follows (logicians call this
"explosion"). That is why consistency of the premises, the next section, matters so much.
:::
::::

:::note{#recap-arguments title="Recap" depth="quick"}
Valid means: on every critical row (all premises T) the conclusion is T. Equivalently
$(P_1 \wedge \dots \wedge P_n) \to C$ is a tautology, or $P_1 \wedge \dots \wedge P_n \wedge \neg C$ is
unsatisfiable. Search for a counterexample by setting the conclusion false first.
:::

## Logical consequence and consistency

:::intuition{#consequence-intuition title="Consequence asks what follows; consistency asks whether anything can be true at all" depth="standard"}
"$C$ is a logical consequence of $\Gamma$" is just another name for "the argument from the set $\Gamma$ to
$C$ is valid": in every world where all of $\Gamma$ holds, $C$ holds too. Picture each formula as the set
of worlds (rows) where it is true. A consequence is a formula whose set of worlds **contains** the
worlds common to all of $\Gamma$.

A set of formulas is **consistent** if some world makes all of them true at once: their common set of
worlds is not empty. A detective's witness statements are consistent if there is at least one story in
which every witness is telling the truth. The two ideas are tied together: $C$ follows from $\Gamma$
exactly when adding $\neg C$ to $\Gamma$ leaves no possible world. This is the idea behind proof by
contradiction, and it is precisely what resolution will mechanise.
:::

:::definition{#consequence-def term="Logical consequence" depth="quick"}
A formula $C$ is a **logical consequence** of a set of formulas $\Gamma$ (written $\Gamma \models C$) if
every assignment that makes every formula of $\Gamma$ true makes $C$ true. For a single formula, $F \models
C$ is the same as "$F$ logically implies $C$", and it holds exactly when $F \to C$ is a tautology. To
show it **by truth table**: find all rows where $F$ is T and check that $C$ is T on each of them.
:::

:::definition{#consistency-def term="Consistent and inconsistent sets" depth="quick"}
A set $\Gamma = \{F_1, \dots, F_k\}$ is **consistent** (jointly satisfiable) if at least one assignment
makes all $F_i$ true, i.e. $F_1 \wedge \dots \wedge F_k$ is satisfiable. Otherwise it is
**inconsistent**: the conjunction is a contradiction.
:::

:::theorem{#refutation-theorem name="Consequence by refutation" depth="standard"}
$\Gamma \models C$ if and only if $\Gamma \cup \{\neg C\}$ is inconsistent.
:::

:::proof{#proof-refutation of="consequence by refutation" depth="standard"}
**Idea first:** a world for $\Gamma \cup \{\neg C\}$ is a world where $\Gamma$ holds and $C$ fails, which is
exactly a counterexample.

If $\Gamma \cup \{\neg C\}$ is consistent, some assignment makes all of $\Gamma$ true and $\neg C$ true,
i.e. $C$ false: a counterexample, so $\Gamma \not\models C$. Conversely, if $\Gamma \not\models C$ there is an
assignment making $\Gamma$ true and $C$ false; it makes every formula of $\Gamma \cup \{\neg C\}$ true, so
that set is consistent. The two sides fail together, so they hold together. **Sanity check:** with
$\Gamma = \{p\}$ and $C = p \vee q$, the set $\{p, \neg(p \vee q)\} = \{p, \neg p \wedge \neg q\}$ is
inconsistent, and indeed $p \models p \vee q$ (addition).
:::

:::trap{#trap-pairwise title="Every pair consistent does not make the whole set consistent" depth="quick"}
Checking formulas two at a time is a tempting short-cut, and it is wrong. $\{p \vee q,\ \neg p \vee q,\
\neg q\}$ is consistent pair by pair, but the first two together force $q$, which the third denies.
Consistency is a property of the **whole** set: one assignment must satisfy all of them at once.
:::

### Worked examples: consequence and consistency

::::example{#ex-cons-easy level="easy" title="Is a set of four premises consistent?" depth="quick"}
Is $\{p \to q,\ q \to r,\ p,\ \neg r\}$ consistent?

:::step{why="Single-letter formulas fix values at once; a consistent assignment must have p = T and r = F."}
$p = $ T, $r = $ F.
:::

:::step{why="p → q with p true forces q true (otherwise the premise has its false row T → F)."}
$q = $ T.
:::

:::step{why="Now check the last formula on the forced assignment."}
$q \to r = \text{T} \to \text{F} = \text{F}$.
:::

:::answer
**Inconsistent**: every attempt is forced into a false premise. Equivalently, by the refutation
theorem, $\{p \to q,\ q \to r,\ p\} \models r$.
:::
::::

::::example{#ex-cons-medium level="medium" title="C is a logical consequence, by truth table (GATE 1993)" depth="standard"}
Show by truth table that $C$ is a logical consequence of $F = A \wedge (A \to (B \vee C)) \wedge (B \to \neg A)$.

:::step{why="F is a conjunction, so it can be true only where A is true; that halves the table to the four rows with A = T."}
Rows with $A = $ T: $(B, C) = $ TT, TF, FT, FF.
:::

:::step{why="With A true, B → ¬A becomes B → F, which is true only when B is false; so B = F."}
Only $(B, C) = $ FT and FF remain.
:::

:::step{why="With A true, A → (B ∨ C) needs B ∨ C true; with B = F that means C = T."}
Only $A = $ T, $B = $ F, $C = $ T makes $F$ true.
:::

:::step{why="Logical consequence asks for C to be true on every row where F is true; there is just one such row."}
On that row $C = $ T.
:::

:::answer
$F$ is true on exactly one of the eight rows, $(A, B, C) = (1, 0, 1)$, and $C$ is true there, so
$F \models C$: $C$ is a logical consequence of $F$.
:::
::::

::::example{#ex-cons-gate level="gate" title="Two sets, one consistent" depth="standard"}
Which of the sets $S_1 = \{p \leftrightarrow q,\ q \to \neg p,\ p \vee q\}$ and
$S_2 = \{p \to q,\ \neg q \vee r,\ \neg r \to \neg p,\ p\}$ is consistent?

:::step{why="In S1, p ↔ q makes p and q equal, and p ∨ q then needs both true."}
$S_1$ forces $p = q = $ T.
:::

:::step{why="Evaluate the remaining formula of S1 on the forced values."}
$q \to \neg p = \text{T} \to \text{F} = \text{F}$: $S_1$ is inconsistent.
:::

:::step{why="In S2, p is given; p → q gives q; ¬q ∨ r with ¬q false gives r. Check the last formula."}
$p = q = r = $ T, and $\neg r \to \neg p = \text{F} \to \text{F} = \text{T}$.
:::

:::answer
$S_2$ is **consistent** (witness $p = q = r = $ T); $S_1$ is **inconsistent**. A single witness
assignment proves consistency; inconsistency needs every assignment ruled out, which the forcing did.
:::
::::

::::example{#ex-cons-edge level="gate" title="Edge case: consistent in pairs, inconsistent as a whole" depth="standard"}
Show that every two of $p \vee q$, $\neg p \vee q$, $\neg q$ are consistent, but all three are not.

:::step{why="A witness for each pair settles that pair."}
$\{p \vee q, \neg p \vee q\}$: $q = $ T. $\{p \vee q, \neg q\}$: $p = $ T, $q = $ F. $\{\neg p \vee q, \neg q\}$: $p = q = $ F.
:::

:::step{why="For all three, ¬q forces q = F; then p ∨ q needs p = T, while ¬p ∨ q needs p = F."}
$p$ would have to be both T and F: no assignment works.
:::

:::answer
Pairwise consistent, jointly **inconsistent**. Resolution sees it at once: $p \vee q$ and $\neg p \vee q$
resolve to $q$, which clashes with $\neg q$.
:::
::::

:::note{#recap-consequence title="Recap" depth="quick"}
$\Gamma \models C$ means $C$ holds in every world of $\Gamma$; a consistent set has at least one world.
$\Gamma \models C$ exactly when $\Gamma \cup \{\neg C\}$ is inconsistent. One witness proves consistency; check
the whole set at once, never only pairs.
:::

## Try it: arguments in the Truth Table Lab

Open the lab below, switch to the **Compare** tab's **Argument** mode, and type premises separated by
commas with a conclusion. The lab marks the critical rows and shows any counterexample row. Try
`p -> q, ~q` with `~p` (valid), then `p -> q, q` with `p` (invalid: watch the counterexample appear),
and the four IT 2004 arguments above.

:::lab{#lab-argument lab="truth-table" tab="compare" depth="standard"}
:::

## Rules of inference

:::intuition{#rules-intuition title="Small certified steps instead of one huge table" depth="standard"}
A truth table with 10 variables has 1024 rows; nobody checks arguments that way. Instead we use a short
list of tiny arguments that have been checked once and for all, the **rules of inference**, and chain
them. Each rule is like a pre-tested Lego brick: because each brick never leads from truth to
falsehood, a tower built from them never does either.

Every rule has a matching tautology: the rule "from $A$ and $A \to B$, conclude $B$" is valid because
$(A \wedge (A \to B)) \to B$ is a tautology. And because the letters in a rule can be replaced by any
formulas, one check covers infinitely many arguments: $A$ could be "it rains" or
"$(p \vee q) \wedge \neg r$".
:::

:::definition{#rules-def term="The standard rules of inference" depth="standard"}
| Rule | Premises | Conclusion | Tautology behind it |
|:--|:--|:--|:--|
| Modus ponens (MP) | $p,\ p \to q$ | $q$ | $(p \wedge (p \to q)) \to q$ |
| Modus tollens (MT) | $\neg q,\ p \to q$ | $\neg p$ | $(\neg q \wedge (p \to q)) \to \neg p$ |
| Hypothetical syllogism (HS) | $p \to q,\ q \to r$ | $p \to r$ | $((p \to q) \wedge (q \to r)) \to (p \to r)$ |
| Disjunctive syllogism (DS) | $p \vee q,\ \neg p$ | $q$ | $((p \vee q) \wedge \neg p) \to q$ |
| Addition | $p$ | $p \vee q$ | $p \to (p \vee q)$ |
| Simplification | $p \wedge q$ | $p$ | $(p \wedge q) \to p$ |
| Conjunction | $p,\ q$ | $p \wedge q$ | $(p \wedge q) \to (p \wedge q)$ |
| Resolution | $p \vee q,\ \neg p \vee r$ | $q \vee r$ | $((p \vee q) \wedge (\neg p \vee r)) \to (q \vee r)$ |
| Constructive dilemma | $(p \to q) \wedge (r \to s),\ p \vee r$ | $q \vee s$ | $(((p \to q) \wedge (r \to s)) \wedge (p \vee r)) \to (q \vee s)$ |
| Destructive dilemma | $(p \to q) \wedge (r \to s),\ \neg q \vee \neg s$ | $\neg p \vee \neg r$ | $(((p \to q) \wedge (r \to s)) \wedge (\neg q \vee \neg s)) \to (\neg p \vee \neg r)$ |

Besides these, any **equivalence** from Lesson 2 may be used to rewrite a line (contrapositive,
De Morgan, $p \to q \equiv \neg p \vee q$, double negation), because equivalent formulas are true on the
same rows.
:::

:::theorem{#rules-theorem name="Every rule in the table is valid" depth="standard"}
For each row of the table, the premises logically imply the conclusion; equivalently, the formula in
the last column is a tautology. The same holds after replacing $p, q, r, s$ by any formulas.
:::

:::proof{#proof-rules of="the validity of the rules" depth="standard"}
**Idea first:** for each rule, assume the conclusion is false and show some premise must then be false.

- **MP:** conclusion $q$ false. If $p$ is true then $p \to q$ is T → F = F; otherwise the premise $p$ is
  false. Either way a premise fails.
- **MT:** conclusion $\neg p$ false means $p$ true. If $\neg q$ is true then $q$ is false and $p \to q$
  is F; otherwise $\neg q$ is false.
- **HS:** $p \to r$ false means $p = $ T, $r = $ F. If $q = $ T, then $q \to r$ is F; if $q = $ F, then
  $p \to q$ is F.
- **DS:** $q$ false and $\neg p$ true make $p \vee q = $ F ∨ F = F.
- **Addition, simplification, conjunction:** immediate from the tables of $\vee$ and $\wedge$.
- **Resolution:** see the derivation below. **Dilemmas:** constructive: $q \vee s$ false makes $q, s$
  false; then $p \to q$ and $r \to s$ need $p, r$ false, and $p \vee r$ fails. Destructive: the same
  with the contrapositives $\neg q \to \neg p$, $\neg s \to \neg r$.

Substitution: the argument above used only the truth values of the letters, never what they say, so it
works when each letter is replaced by any formula (all occurrences of a letter by the same formula). The
check script verifies all ten tautologies by full truth table.
:::

:::derivation{#derivation-resolution-rule of="the resolution rule (p ∨ q), (¬p ∨ r) ⊨ (q ∨ r)" depth="standard"}
Split on the value of $p$, the letter that appears with opposite signs.

- If $p$ is T, then $\neg p$ is F, so the premise $\neg p \vee r$ can be true only if $r$ is T. Then
  $q \vee r$ is T.
- If $p$ is F, then the premise $p \vee q$ can be true only if $q$ is T. Then $q \vee r$ is T.

In every critical row the conclusion is true, so the rule is valid. In words: one of $p$, $\neg p$ is
false, so the "other half" of that clause must carry the truth. **Sanity check:** with $q$ = F (empty)
the rule reads $p,\ \neg p \vee r \;\therefore\; r$, which is modus ponens ($\neg p \vee r \equiv p \to r$);
with $r$ = F it reads $p \vee q,\ \neg p \;\therefore\; q$, which is disjunctive syllogism. Resolution
contains both.
:::

:::viz{#rule-chain-viz spec="rule-chain" mode="animate" depth="standard"}
:::

:::trick{#trick-contrapositive-chain title="Line the arrows up head to tail, using contrapositives" depth="standard"}
When premises are implications and the options are implications, write every premise **and** its
contrapositive. Then look for a chain $A \to B,\ B \to C$ where the middle letters match exactly; hypothetical
syllogism gives $A \to C$, and its contrapositive $\neg C \to \neg A$ is equally valid. GATE 2015: from
"corrupt → not elected" and "kind → elected", the contrapositive "elected → not corrupt" lines up with
"kind → elected", giving "kind → not corrupt".

**Why it works:** contrapositives are equivalent (Lesson 1), and HS is valid. **When it fails:** if the
middle letters do not match exactly (one says "elected", the other "not elected", and you cannot flip
either by contraposition to match), there is no chain; options built by swapping the ends of a valid
chain are converses, and they do not follow.
:::

### Worked examples: rules of inference

::::example{#ex-rule-easy level="easy" title="Name the rule" depth="quick"}
Name the rule used in each: (i) "It is a weekday; if it is a weekday I go to college; so I go to
college." (ii) "The file is on drive C or drive D; it is not on drive C; so it is on drive D." (iii)
"$7$ is prime; so $7$ is prime or $7$ is even."

:::step{why="(i) has the shape p, p → q, therefore q."}
(i) modus ponens.
:::

:::step{why="(ii) has the shape p ∨ q, ¬p, therefore q."}
(ii) disjunctive syllogism.
:::

:::step{why="(iii) adds an arbitrary disjunct to a true statement: p, therefore p ∨ q. The added part need not be true."}
(iii) addition.
:::

:::answer
MP, DS, addition. Note that (iii) is valid even though "$7$ is even" is false: a disjunction needs only
one true part.
:::
::::

::::example{#ex-rule-medium level="medium" title="A three-rule derivation" depth="standard"}
From $p \to q$, $q \to r$, $p \vee s$, $\neg s$, derive $r$, naming each rule.

:::step{why="The disjunction and the negation of one of its parts give the other part."}
1. $p$ from $p \vee s$, $\neg s$ (DS).
:::

:::step{why="Two implications sharing the middle letter q chain together."}
2. $p \to r$ from $p \to q$, $q \to r$ (HS).
:::

:::step{why="Now apply line 2 to line 1."}
3. $r$ from 1 and 2 (MP).
:::

:::answer
$r$ follows. Each line is justified by a valid rule, so the whole derivation is a valid argument. (A
truth table would need 16 rows.)
:::
::::

::::example{#ex-rule-gate level="gate" title="What follows from two implications? (GATE 2015)" depth="standard"}
S1: "If a candidate is known to be corrupt, then he will not be elected." S2: "If a candidate is kind,
he will be elected." Which follows: (A) corrupt → kind, (B) not corrupt → not kind, (C) kind → not
corrupt, (D) not kind → not corrupt?

:::step{why="Name the atoms about one candidate and translate each sentence as an implication."}
$c$: known to be corrupt, $e$: elected, $k$: kind. S1: $c \to \neg e$. S2: $k \to e$.
:::

:::step{why="The middle letters do not match yet (¬e and e). Take the contrapositive of S1 so that e appears as a hypothesis."}
S1 $\equiv e \to \neg c$.
:::

:::step{why="Now S2 ends in e and the rewritten S1 starts with e: hypothetical syllogism chains them."}
$k \to e,\ e \to \neg c \;\therefore\; k \to \neg c$.
:::

:::step{why="To reject the other options, find for each a row where S1 and S2 are both true but the option is false. Each option is an implication, so make its hypothesis true and its conclusion false, then fix e to satisfy the premises."}
B fails on $c = $ F, $e = $ T, $k = $ T; A fails on $c = $ T, $e = $ F, $k = $ F; D fails on $c = $ T, $e = $ F, $k = $ F.
:::

:::answer
**(C)** "If a person is kind, he is not known to be corrupt". Its contrapositive "corrupt → not kind"
also follows, but it is not offered.
:::
::::

::::example{#ex-rule-edge level="gate" title="Edge case: the destructive dilemma gives an 'or', not an 'and'" depth="standard"}
From $(p \to q) \wedge (r \to s)$ and $\neg q \vee \neg s$, does $\neg p \wedge \neg r$ follow, or only $\neg p \vee \neg r$?

:::step{why="The destructive dilemma is valid: each of ¬q, ¬s, by modus tollens, kills one of p, r."}
$\neg p \vee \neg r$ follows.
:::

:::step{why="For the stronger claim, look for a counterexample: make the premises true but ¬p ∧ ¬r false, e.g. with p true. Then q must be true (p → q), so ¬q ∨ ¬s needs s false, and r → s needs r false."}
$p = $ T, $q = $ T, $r = $ F, $s = $ F: premises T, $\neg p \wedge \neg r = $ F.
:::

:::answer
Only $\neg p \vee \neg r$ follows. We know **one** of the conclusions $q, s$ fails, not which, so we can
only say **one** of $p, r$ fails. Upgrading the "or" to "and" is a frequent wrong option.
:::
::::

:::note{#recap-rules title="Recap" depth="quick"}
MP, MT, HS, DS, addition, simplification, conjunction, resolution and the two dilemmas are valid because
their tautologies are. Any formula may replace a letter. Chain implications head to tail after taking
contrapositives; dilemmas conclude a disjunction.
:::

## Fallacies

:::intuition{#fallacy-intuition title="Running a promise backwards" depth="standard"}
"If it rains, the ground is wet. The ground is wet. So it rained." It sounds reasonable, and it is the
most common bad argument in the world. The promise "rain → wet" says nothing about why the ground is
wet: a sprinkler would do. Likewise "it did not rain, so the ground is dry" ignores the sprinkler.

These two shapes look like modus ponens and modus tollens but use the implication in the wrong
direction. They are called **fallacies**: argument forms that are **not** valid, though they can
accidentally have a true conclusion in a particular story.
:::

:::definition{#fallacy-def term="Affirming the consequent and denying the antecedent" depth="quick"}
| Form | Premises | Conclusion | Status |
|:--|:--|:--|:--|
| Modus ponens | $p \to q,\ p$ | $q$ | valid |
| Modus tollens | $p \to q,\ \neg q$ | $\neg p$ | valid |
| **Affirming the consequent** | $p \to q,\ q$ | $p$ | **invalid** |
| **Denying the antecedent** | $p \to q,\ \neg p$ | $\neg q$ | **invalid** |

Memory aid: from $p \to q$ you may go **forwards** from $p$ or **backwards** from $\neg q$; never forwards
from $\neg p$ or backwards from $q$. The fallacies are modus ponens applied to the converse $q \to p$ and to
the inverse $\neg p \to \neg q$, which are not equivalent to $p \to q$.
:::

:::theorem{#fallacy-theorem name="Both fallacies are invalid" depth="standard"}
$p \to q,\ q \not\models p$ and $p \to q,\ \neg p \not\models \neg q$; both have the same counterexample
row $p = $ F, $q = $ T.
:::

:::proof{#proof-fallacy of="the invalidity of the two fallacies" depth="standard"}
**Idea first:** one counterexample row is a complete proof of invalidity.

Take $p = $ F, $q = $ T. Then $p \to q = $ F → T = T. For affirming the consequent, the premise $q$ is
T and the conclusion $p$ is F. For denying the antecedent, the premise $\neg p$ is T and the conclusion
$\neg q$ is F. In both cases all premises are true and the conclusion false. **Sanity check:** this is
the row "no rain, sprinkler on": the promise is kept, the ground is wet, and it did not rain.
:::

:::viz{#fallacy-viz spec="fallacy-rows" mode="animate" depth="standard"}
:::

:::trap{#trap-fallacy-true-conclusion title="A fallacy with a true conclusion is still a fallacy" depth="quick"}
"If $n$ is divisible by $4$, $n$ is even; $8$ is even; so $8$ is divisible by $4$." The conclusion is
true, but the argument is affirming the consequent, so it is **not a correct inference**; with $6$ in place
of $8$ the same form gives a false conclusion. GATE asks whether an inference is **correct**, which
means valid, not whether its conclusion happens to be true.
:::

### Worked examples: fallacies

::::example{#ex-fal-easy level="easy" title="Spot the fallacy" depth="quick"}
"If $n$ is divisible by $4$, then $n$ is even. $6$ is even. Therefore $6$ is divisible by $4$." What is
wrong?

:::step{why="Translate: p = n divisible by 4, q = n even. The premises are p → q and q; the conclusion is p."}
Shape: $p \to q,\ q \;\therefore\; p$.
:::

:::step{why="This is the backwards use of the promise from its conclusion, the first fallacy in the table."}
Affirming the consequent.
:::

:::answer
**Invalid** (affirming the consequent); here the conclusion is even false, which is the counterexample
row $p = $ F, $q = $ T made concrete.
:::
::::

::::example{#ex-fal-medium level="medium" title="Four arguments, one premise" depth="standard"}
With the premise "if the alarm rings ($a$), I wake up ($w$)", classify: (i) $a$, so $w$; (ii) $\neg w$,
so $\neg a$; (iii) $w$, so $a$; (iv) $\neg a$, so $\neg w$.

:::step{why="Forward from the hypothesis and backward from the negated conclusion are the two valid uses."}
(i) modus ponens, valid; (ii) modus tollens, valid.
:::

:::step{why="Backward from the conclusion and forward from the negated hypothesis are the two fallacies; the row a = F, w = T (I woke up without the alarm) defeats both."}
(iii) affirming the consequent, invalid; (iv) denying the antecedent, invalid.
:::

:::answer
(i) and (ii) are valid; (iii) and (iv) are not. Notice that (ii) and (iii) both start from a fact about
$w$, but only the negative fact lets you reason backwards.
:::
::::

::::example{#ex-fal-gate level="gate" title="Two cricket inferences (GATE 2012)" depth="standard"}
I1: "If it rains the match will not be played. The match was played. So there was no rain." I2: "If it
rains the match will not be played. It did not rain. So the match was played." Which are correct?

:::step{why="Let r = it rains, m = the match is played. The common premise is r → ¬m."}
Premise: $r \to \neg m$.
:::

:::step{why="I1 has the extra premise m, i.e. the conclusion ¬m of the premise is false; concluding ¬r is going backwards from a negated conclusion."}
I1: $r \to \neg m,\ m \;\therefore\; \neg r$ is modus tollens: valid.
:::

:::step{why="I2 has the extra premise ¬r, the negated hypothesis, and concludes the negation of ¬m, i.e. m."}
I2: $r \to \neg m,\ \neg r \;\therefore\; m$ is denying the antecedent. Counterexample: $r = $ F, $m = $ F (no rain, match cancelled for another reason).
:::

:::answer
**I1 is correct but I2 is not.** The option "both correct" is the trap for students who treat the
promise as two-way.
:::
::::

::::example{#ex-fal-edge level="gate" title="Edge case: with 'if and only if' the backward step is valid" depth="standard"}
Is $p \leftrightarrow q,\ q \;\therefore\; p$ valid? And $p \leftrightarrow q,\ \neg p \;\therefore\; \neg q$?

:::step{why="Find the critical rows of the first argument: p ↔ q and q both true. p ↔ q is T on TT and FF; q is T on TT only."}
The single critical row is TT, where $p = $ T.
:::

:::step{why="For the second, p ↔ q and ¬p are both true only on FF, where ¬q is T."}
The single critical row is FF, where $\neg q = $ T.
:::

:::answer
Both are **valid**. The "fallacies" are fallacies of the one-way $\to$. A biconditional contains both
$p \to q$ and $q \to p$, so reasoning in either direction is modus ponens or tollens on one half. Always
check which connective the premise really uses.
:::
::::

:::note{#recap-fallacies title="Recap" depth="quick"}
From $p \to q$: forward from $p$ (MP) and backward from $\neg q$ (MT) are valid; backward from $q$
(affirming the consequent) and forward from $\neg p$ (denying the antecedent) are not, with
counterexample $p = $ F, $q = $ T. With $\leftrightarrow$ both directions are valid.
:::

## Chained proofs

:::intuition{#proof-intuition title="A proof is a path of certified steps" depth="standard"}
A formal proof is a numbered list. Each line is either a premise or follows from earlier lines by a
rule of inference (or is an equivalent rewriting of an earlier line). The last line is the conclusion.
Because every step preserves truth, the whole chain does: if the premises are true, line 1 is true, so
line 2 is true, and so on to the end.

Two extra moves make proofs much shorter. To prove an implication $A \to B$, you may **assume $A$** as a
temporary premise and derive $B$ (conditional proof). To prove $\neg A$, you may assume $A$ and derive a
contradiction (indirect proof). Both are justified by the refutation and validity theorems above.
:::

:::definition{#formal-proof-def term="Formal proof (derivation)" depth="quick"}
A **derivation** of $C$ from premises $\Gamma$ is a finite sequence of formulas ending with $C$, where each
formula is a premise, or follows from earlier formulas by a rule of inference, or is equivalent to an
earlier formula. We write $\Gamma \vdash C$ ("$C$ is derivable from $\Gamma$"). Every line is written with its
justification (rule and line numbers).
:::

:::theorem{#chaining-theorem name="Chaining and conditional proof preserve validity" depth="standard"}
(a) If $\Gamma \models A$ and $\Gamma \cup \{A\} \models C$, then $\Gamma \models C$. Hence every derivation built
from valid rules is a valid argument.
(b) **Deduction theorem (conditional proof):** $\Gamma \cup \{A\} \models B$ if and only if $\Gamma \models A \to B$.
:::

:::proof{#proof-chaining of="chaining and the deduction theorem" depth="standard"}
**Idea first:** reason about one critical row at a time.

(a) Take any assignment making all of $\Gamma$ true. Since $\Gamma \models A$, it makes $A$ true; so it makes
all of $\Gamma \cup \{A\}$ true, and therefore $C$ true. Applying this once per line of a derivation shows
the last line follows from the premises.

(b) Suppose $\Gamma \cup \{A\} \models B$, and take an assignment making $\Gamma$ true. If it makes $A$ false,
$A \to B$ is true (false hypothesis). If it makes $A$ true, it satisfies $\Gamma \cup \{A\}$, so $B$ is true and
$A \to B$ is true. Conversely, if $\Gamma \models A \to B$, any assignment making $\Gamma$ and $A$ true makes
$A \to B$ true with a true hypothesis, so $B$ is true. **Sanity check:** with $\Gamma$ empty, (b) says $A
\models B$ exactly when $A \to B$ is a tautology, matching the validity theorem.
:::

:::trick{#trick-backwards title="Plan the proof backwards from the conclusion" depth="standard"}
Ask "which rule could produce the conclusion as its last step?" If the conclusion is $\neg p$, look for
$p \to x$ and $\neg x$ (MT). If it is $p \to r$, look for a chain (HS), or assume $p$ and aim for $r$
(conditional proof). If it is a disjunction $a \vee b$, recall $a \vee b \equiv \neg a \to b$: assume $\neg a$
and aim for $b$.

**Why it works:** each rule has a recognisable conclusion shape, so the conclusion tells you which
premises you need. **When it fails:** if the argument is invalid, no plan can succeed; after two failed
plans, switch to the counterexample search, which settles the question either way.
:::

### Worked examples: chained proofs

::::example{#ex-chain-easy level="easy" title="Two rules in a row" depth="quick"}
Prove $\neg p$ from $p \to q$, $q \to r$, $\neg r$.

:::step{why="The conclusion is a negation, so plan modus tollens: we need some p → x and ¬x. Chain the implications to get p → r."}
1. $p \to r$ from $p \to q$, $q \to r$ (HS).
:::

:::step{why="Now line 1 and the premise ¬r are exactly the inputs of modus tollens."}
2. $\neg p$ from 1 and $\neg r$ (MT).
:::

:::answer
$\neg p$. (Equally: MT on $q \to r$, $\neg r$ gives $\neg q$; MT on $p \to q$, $\neg q$ gives $\neg p$.)
:::
::::

::::example{#ex-chain-medium level="medium" title="A deployment story" depth="standard"}
"If the server is up, the build runs. If the build runs and the tests pass, we deploy. The tests
passed. We did not deploy. Therefore the server was down." Formalise and prove.

:::step{why="Name the atoms: u = server up, b = build runs, t = tests pass, d = we deploy."}
Premises $u \to b$, $(b \wedge t) \to d$, $t$, $\neg d$; conclusion $\neg u$.
:::

:::step{why="¬d denies the conclusion of (b ∧ t) → d, so modus tollens applies; then De Morgan rewrites the negated conjunction."}
1. $\neg(b \wedge t)$ (MT). 2. $\neg b \vee \neg t$ (De Morgan).
:::

:::step{why="We know t, so ¬t is false; disjunctive syllogism keeps the other part."}
3. $\neg b$ from 2 and $t$ (DS).
:::

:::step{why="¬b denies the conclusion of u → b."}
4. $\neg u$ from $u \to b$ and 3 (MT).
:::

:::answer
The server was down. The argument is valid; the check script confirms it by its 16-row table.
:::
::::

::::example{#ex-chain-gate level="gate" title="Conditional proof of IT 2004 argument 1" depth="standard"}
Derive $\neg s \to q$ from $\neg p \vee q$, $r \to s$, $p \vee r$.

:::step{why="The conclusion is an implication, so use conditional proof: assume its hypothesis and aim for q."}
1. $\neg s$ (assumption).
:::

:::step{why="¬s denies the conclusion of r → s."}
2. $\neg r$ from $r \to s$ and 1 (MT).
:::

:::step{why="p ∨ r with r false keeps p."}
3. $p$ from $p \vee r$ and 2 (DS).
:::

:::step{why="¬p ∨ q with ¬p false (we have p) keeps q."}
4. $q$ from $\neg p \vee q$ and 3 (DS).
:::

:::answer
From the assumption $\neg s$ we derived $q$, so by the deduction theorem $\neg s \to q$ follows from the
premises. Argument 1 is valid, as the counterexample search also showed.
:::
::::

::::example{#ex-chain-edge level="gate" title="Edge case: an indirect proof from consistent premises" depth="standard"}
Prove $\neg p$ from $p \to q$ and $p \to \neg q$. Are the premises consistent?

:::step{why="Indirect proof: assume the opposite of what we want and look for a contradiction."}
1. $p$ (assumption).
:::

:::step{why="Apply modus ponens with each premise."}
2. $q$ (MP). 3. $\neg q$ (MP).
:::

:::step{why="Lines 2 and 3 contradict each other, so the assumption p cannot hold together with the premises: the premises together with p are inconsistent, and by the refutation theorem they imply ¬p."}
4. $\neg p$.
:::

:::answer
$\neg p$ follows. The premises themselves are **consistent** (take $p = $ F): the contradiction comes from
the assumption, not from the premises. Do not confuse an indirect proof with explosion from inconsistent
premises.
:::
::::

:::note{#recap-chains title="Recap" depth="quick"}
A derivation lists premises and lines that follow by rules; it is valid because each step is. To prove
$A \to B$, assume $A$ and derive $B$; to prove $\neg A$, assume $A$ and derive a contradiction. Plan from
the conclusion backwards.
:::

## Resolution

:::intuition{#resolution-intuition title="One rule, one target: the empty clause" depth="standard"}
Rules of inference are pleasant for people but awkward for machines: which rule should be tried next?
**Resolution** replaces the whole toolbox with one rule and one goal. Put every formula into clauses
(disjunctions of literals, Lesson 2's CNF). Add the **negation** of what you want to prove. Then keep
combining two clauses that disagree on one letter, cancelling that letter, until you produce the
**empty clause** $\square$, a clause with nothing left in it, which can never be true.

Producing $\square$ means the clause set has no satisfying assignment, so (by the refutation theorem) the
original conclusion follows. It is proof by contradiction, run as an algorithm. This is how Prolog
answers queries and how SAT solvers learn new clauses.
:::

:::definition{#clause-def term="Literal, clause, empty clause" depth="quick"}
A **literal** is a variable or its negation ($p$, $\neg p$). A **clause** is a disjunction of literals,
often written as a set: $p \vee \neg q \vee r = \{p, \neg q, r\}$. A formula in CNF is a set of clauses
that must all be true. The **empty clause** $\square$ is the disjunction of no literals; it is false under
every assignment (a disjunction is true only if some part is true, and it has no parts).
:::

:::definition{#resolution-def term="The resolution rule" depth="quick"}
If clause $C_1$ contains a literal $\ell$ and clause $C_2$ contains its complement $\neg \ell$, their
**resolvent** is
$$\operatorname{res}(C_1, C_2) = (C_1 \setminus \{\ell\}) \cup (C_2 \setminus \{\neg \ell\}).$$
For example $\{p, q\}$ and $\{\neg p, r\}$ resolve on $p$ to $\{q, r\}$; $\{p\}$ and $\{\neg p\}$ resolve to
$\square$. Exactly **one** complementary pair is cancelled per step.
:::

:::theorem{#resolution-sound-theorem name="A resolvent is a logical consequence of its parents (soundness)" depth="standard"}
$C_1 \wedge C_2 \models \operatorname{res}(C_1, C_2)$. The converse fails in general: the resolvent can be true
when the parents are not both true. Consequently, if $\square$ is derived from a clause set $S$, then $S$ is
unsatisfiable.
:::

:::proof{#proof-resolution-sound of="soundness of resolution" depth="standard"}
**Idea first:** $\ell$ and $\neg \ell$ cannot both be true, so one parent must be true "thanks to the rest".

Write $C_1 = \ell \vee A$ and $C_2 = \neg \ell \vee B$. On any assignment making both true: if $\ell$ is T,
then $\neg \ell$ is F, so $B$ is T; if $\ell$ is F, then $A$ is T. Either way $A \vee B$, the resolvent, is
T (this is the derivation in the rules section with formulas in place of letters). For the converse,
take $\ell$ = T, $A$ = T, $B$ = F: the resolvent $A \vee B$ is T, but $C_2 = \neg\ell \vee B$ is F, so the
resolvent does not imply the parents. Finally, every derived clause is true on every assignment
satisfying $S$ (chaining); $\square$ is true on none, so $S$ has no satisfying assignment.
:::

:::theorem{#completeness-theorem name="Refutation completeness (stated)" depth="standard"}
If a finite set $S$ of clauses is unsatisfiable, then repeated resolution starting from $S$ eventually
derives $\square$. Together with soundness: **$S$ is unsatisfiable if and only if $\square$ can be derived**.
Since only finitely many clauses exist over finitely many variables, saturating $S$ (adding resolvents
until nothing new appears) always terminates, so resolution is a decision procedure for propositional
satisfiability.
:::

:::proof{#proof-completeness of="refutation completeness (sketch)" depth="deep"}
**Idea first:** eliminate one variable at a time; a satisfying assignment survives each elimination
backwards.

Pick a variable $p$. Replace $S$ by $S'$: the clauses without $p$ or $\neg p$, plus every resolvent on $p$
(dropping tautologies). One checks that $S'$ is satisfiable exactly when $S$ is: an assignment for $S'$
extends to $p$ (set $p$ to satisfy whichever clauses still need it; if both a $p$-clause and a
$\neg p$-clause needed it, their resolvent would be false, contradicting the assignment). Each round
removes a variable. If $S$ is unsatisfiable, the last round has no variables and must contain $\square$.
Every clause produced is a resolution consequence of $S$, so $\square$ is derivable.
:::

:::definition{#refutation-def term="Proof by resolution refutation" depth="standard"}
To show $\Gamma \models C$ (or that a set is inconsistent):

1. Convert every formula of $\Gamma$, and $\neg C$, to CNF; collect all the clauses.
2. Repeatedly resolve two clauses on one complementary pair and add the resolvent.
3. If $\square$ appears, $\Gamma \cup \{\neg C\}$ is unsatisfiable, so $\Gamma \models C$. If saturation ends
   without $\square$, $\Gamma \not\models C$.

For **first-order** clauses with variables (Chapter 2), first substitute terms for variables so that two
literals become exact complements (here: replace $x$ and $y$ by the constant $a$); every instance of a
universally quantified clause is true when the clause is.
:::

:::viz{#resolution-viz spec="resolution-tree" mode="animate" depth="standard"}
:::

:::trap{#trap-double-resolve title="Never cancel two pairs at once" depth="quick"}
$\{p, q\}$ and $\{\neg p, \neg q\}$ clash on two letters. Cancelling both gives $\square$, a false
"refutation" of a satisfiable set ($p = $ T, $q = $ F satisfies both). Resolving on one pair gives
$\{q, \neg q\}$ or $\{p, \neg p\}$, both tautologies: useless but correct. One pair per step, always.
:::

:::trap{#trap-resolution-equisat title="The resolvent does not imply its parents" depth="quick"}
Resolution is a one-way street: parents $\models$ resolvent, but a satisfiable resolvent does not mean the
parents are jointly satisfiable. GATE 2003 asks which statement about the rule is **false**; the one
that sounds true but is the keyed false statement is "$P \vee Q$ is satisfiable if and only if
$(P \vee R) \wedge (Q \vee \neg R)$ is satisfiable". With formulas allowed for $P, Q, R$,
take $P = x$, $Q = \neg x$, $R = x$: the resolvent $x \vee \neg x$ is satisfiable but the parents become $x$
and $\neg x$, which are not. (The "if and only if" does hold when $R$ is a fresh letter not occurring in $P$
or $Q$; that special fact is what SAT solvers use, but it is not what the option claims.)
:::

### Worked examples: resolution

::::example{#ex-res-easy level="easy" title="Modus ponens and modus tollens as resolution" depth="quick"}
Show that MP and MT are single resolution steps.

:::step{why="Write the implication as a clause: p → q ≡ ¬p ∨ q."}
Clauses: $\{p\}$, $\{\neg p, q\}$ for MP; $\{\neg q\}$, $\{\neg p, q\}$ for MT.
:::

:::step{why="Resolve each pair on its one complementary literal."}
MP: $\{p\}$ with $\{\neg p, q\}$ on $p$ gives $\{q\}$. MT: $\{\neg q\}$ with $\{\neg p, q\}$ on $q$ gives $\{\neg p\}$.
:::

:::answer
Both rules are resolution with a one-literal clause. Disjunctive syllogism and hypothetical syllogism
($\{\neg p, q\}, \{\neg q, r\} \Rightarrow \{\neg p, r\}$) are resolution too.
:::
::::

::::example{#ex-res-medium level="medium" title="A refutation down to the empty clause" depth="standard"}
Prove $r$ from $p \vee q$, $p \to r$, $q \to r$ by resolution.

:::step{why="Clauses of the premises (p → r ≡ ¬p ∨ r), plus the negated conclusion."}
(1) $\{p, q\}$ (2) $\{\neg p, r\}$ (3) $\{\neg q, r\}$ (4) $\{\neg r\}$.
:::

:::step{why="Use the unit clause ¬r to strip r from (2) and (3)."}
(5) $\{\neg p\}$ from 2, 4. (6) $\{\neg q\}$ from 3, 4.
:::

:::step{why="Resolve (1) with (5) on p."}
(7) $\{q\}$ from 1, 5.
:::

:::step{why="q and ¬q are complementary unit clauses."}
(8) $\square$ from 6, 7.
:::

:::answer
$\square$ is derived, so $\{p \vee q, p \to r, q \to r, \neg r\}$ is unsatisfiable and $r$ follows. This is
the constructive dilemma with both of its conclusions equal to $r$ (from $p \vee q$, $p \to r$, $q \to r$
infer $r \vee r \equiv r$), proved by resolution; the animation above draws the tree.
:::
::::

::::example{#ex-res-gate level="gate" title="Inconsistency with a constant (GATE 1992)" depth="standard"}
Show inconsistent: (1) $Q(x) \to P(x) \vee \neg R(a)$, (2) $R(a) \vee \neg Q(a)$, (3) $Q(a)$, (4)
$\neg P(y)$; $x, y$ universally quantified, $a$ a constant.

:::step{why="Universal clauses hold for every value, in particular for a; substituting x = a and y = a makes the literals match exactly. Then treat P(a), Q(a), R(a) as three propositional atoms."}
(1) $\{\neg Q(a), P(a), \neg R(a)\}$ (2) $\{R(a), \neg Q(a)\}$ (3) $\{Q(a)\}$ (4) $\{\neg P(a)\}$.
:::

:::step{why="Modus ponens in resolution form: (3) with (2) on Q(a)."}
(5) $\{R(a)\}$.
:::

:::step{why="(3) with (1) on Q(a), then the result with (5) on R(a)."}
(6) $\{P(a), \neg R(a)\}$; (7) $\{P(a)\}$.
:::

:::step{why="(7) and (4) are complementary units."}
(8) $\square$.
:::

:::answer
The empty clause is derived, so the set is **inconsistent**. In modus ponens language: $Q(a)$ and (2)
give $R(a)$; $Q(a)$ and (1) give $P(a) \vee \neg R(a)$, hence $P(a)$; but (4) says $\neg P(a)$.
:::
::::

::::example{#ex-res-equisat level="gate" title="Statements about the resolution rule (GATE 2003)" depth="standard"}
For the rule "from $P \vee R$ and $Q \vee \neg R$ derive $P \vee Q$" ($P, Q, R$ any formulas), which is false:
(A) $((P \vee R) \wedge (Q \vee \neg R)) \Rightarrow (P \vee Q)$ is valid; (B) $(P \vee Q) \Rightarrow ((P \vee R)
\vee (Q \vee \neg R))$ is valid; (C) $P \vee Q$ is satisfiable iff $(P \vee R) \wedge (Q \vee \neg R)$ is
satisfiable; (D) $(P \vee Q) \Rightarrow$ FALSE iff both $P$ and $Q$ are unsatisfiable?

:::step{why="(A) is the soundness of resolution: the parents imply the resolvent."}
(A) is true.
:::

:::step{why="(B): the right side contains R ∨ ¬R, so it is a tautology, and anything implies a tautology."}
(B) is true.
:::

:::step{why="(D): X → FALSE is valid exactly when X is unsatisfiable, and a disjunction is unsatisfiable exactly when both parts are."}
(D) is true.
:::

:::step{why="(C): satisfiable parents give a satisfiable resolvent (by A), but not conversely; P = x, Q = ¬x, R = x makes the resolvent x ∨ ¬x satisfiable and the parents x ∧ ¬x unsatisfiable."}
(C) is false.
:::

:::answer
**(C).** Resolution preserves truth downwards (parents to resolvent), not satisfiability upwards.
:::
::::

::::example{#ex-res-edge level="gate" title="Edge case: two clashes, no refutation" depth="standard"}
Can $\{p \vee q,\ \neg p \vee \neg q\}$ be refuted by resolution?

:::step{why="The clauses clash on p and on q. Resolve on p alone."}
Resolvent $\{q, \neg q\}$, a tautology.
:::

:::step{why="Resolve on q alone."}
Resolvent $\{p, \neg p\}$, a tautology.
:::

:::step{why="No other pairs or new clauses exist; saturation stops without the empty clause, so by completeness the set is satisfiable. Find a witness."}
$p = $ T, $q = $ F satisfies both clauses (the set says "exactly one of $p, q$").
:::

:::answer
**No.** The set is satisfiable, and the only way to "get" $\square$ is the illegal double cancellation.
:::
::::

:::note{#horn-note title="Deep note: Horn clauses" depth="deep"}
A **Horn clause** has at most one positive literal: $\{\neg p_1, \dots, \neg p_k, q\}$, which is the rule
$(p_1 \wedge \dots \wedge p_k) \to q$; with $k = 0$ it is a fact $q$, and with no positive literal it is a goal
or constraint $\neg(p_1 \wedge \dots \wedge p_k)$. The resolvent of two Horn clauses is again Horn, and
satisfiability of a Horn set can be decided in **linear time** by forward chaining: start with the facts,
fire any rule whose body is fully true, and add its head; the set is unsatisfiable exactly when some
constraint's literals all become true. This is why logic programming (Prolog) restricts programs to
Horn clauses, and why "2-SAT and Horn-SAT are easy, 3-SAT is NP-complete" appears in complexity theory.
The general clause $p \vee q$ is not Horn, and it is exactly such clauses that force search.
:::

:::note{#recap-resolution title="Recap" depth="quick"}
Clauses are sets of literals; resolve two clauses on **one** complementary pair. Resolvents follow from
their parents (sound), and an unsatisfiable set always reaches $\square$ (complete). To prove $C$: clauses
of the premises plus $\neg C$, resolve to $\square$. For quantified clauses, substitute constants first.
:::

## Axiom systems: sound, complete, consistent

:::intuition{#axiom-intuition title="A rulebook and the truths it can reach" depth="standard"}
So far "follows" has meant "true in every world" ($\models$, semantic). A proof system is a different
thing: a rulebook (axioms plus inference rules) that produces strings, the **theorems** ($\vdash$,
syntactic). Three questions compare the rulebook with the truth. Does it only produce truths
(**sound**)? Does it produce every truth (**complete**)? Does it avoid producing a statement together
with its negation (**consistent**)?

For propositional logic, the standard proof systems are both sound and complete, so $\vdash$ and
$\models$ coincide. (Resolution is sound and **refutation**-complete: it always finds $\square$ in an
unsatisfiable set, but it cannot derive every consequence directly; from $p$ alone it never produces
$p \vee q$. That is why we use it on $\Gamma \cup \{\neg C\}$.) A **theory** (a set of axioms about some subject) is called complete in a second,
stronger sense if it settles every question: for every statement, it proves it or proves its negation.
GATE 1991 asks about this sense.
:::

:::definition{#axiom-def term="Axiom system, theorem, theory" depth="quick"}
An **axiom system** consists of a set $A$ of formulas (the **axioms**) and inference rules (for example
modus ponens). A **theorem** is a formula with a derivation from the axioms; we write $A \vdash \varphi$.
A **subsystem** of $A$ is a subset $A' \subseteq A$ of the axioms, with the same rules.
:::

:::definition{#axiom-props-def term="Sound, complete, consistent" depth="standard"}
| Property | Meaning |
|:--|:--|
| **Sound** proof system | every derivable formula is a logical consequence: $A \vdash \varphi$ implies $A \models \varphi$ |
| **Complete** proof system | every logical consequence is derivable: $A \models \varphi$ implies $A \vdash \varphi$ |
| **Consistent** axiom set | there is no $\varphi$ with both $A \vdash \varphi$ and $A \vdash \neg\varphi$ |
| **Complete** theory (negation-complete) | for every formula $\varphi$ of its language, $A \vdash \varphi$ or $A \vdash \neg\varphi$ |

With a sound and complete proof system, $A$ is consistent exactly when it has a model (is satisfiable),
and a consistent propositional theory is negation-complete exactly when it has **exactly one** model
over its variables.
:::

:::theorem{#subsystem-theorem name="Subsystems keep consistency but may lose completeness" depth="standard"}
If $A$ is consistent and $A' \subseteq A$, then $A'$ is consistent. If $A$ is complete, $A'$ need not be
complete.
:::

:::proof{#proof-subsystem of="the subsystem theorem" depth="standard"}
**Idea first:** fewer axioms prove fewer theorems; that can remove contradictions but never create one,
and it can also remove answers.

Consistency: every derivation from $A'$ is also a derivation from $A$ (the axioms it uses are in $A$). If
$A'$ proved both $\varphi$ and $\neg\varphi$, so would $A$, contradicting the consistency of $A$. (Semantically:
a model of $A$ satisfies every subset of $A$.) Completeness: a counterexample suffices. Over the variables
$p, q$, the theory $A = \{p, q\}$ is consistent and complete (its only model is $p = q = $ T, so every
formula or its negation follows). Its subsystem $A' = \{p\}$ has two models ($q$ = T or F), so it proves
neither $q$ nor $\neg q$: not complete. **Sanity check:** the empty subsystem proves only tautologies; it is
consistent and, as expected, far from complete.
:::

:::trap{#trap-two-completeness title="Two different meanings of 'complete'" depth="quick"}
"Propositional logic is complete" (Gödel-style **semantic** completeness: every valid formula is
provable) is a fact about the proof system and holds for every axiom set. "This theory is complete"
(**negation** completeness: it decides every statement) is a property of the axioms, and removing axioms
can destroy it. Answers that say "completeness is inherited because logic is complete" mix the two.
:::

### Worked examples: axiom systems

::::example{#ex-ax-easy level="easy" title="A complete little theory" depth="quick"}
Over the variables $p, q$, is the theory $\{p,\ p \to q\}$ consistent? Is it complete?

:::step{why="Find its models: p must be T, and then p → q forces q = T."}
Exactly one model: $p = q = $ T.
:::

:::step{why="A consistent theory with exactly one model decides every formula: each formula is either true on that model (so it follows) or false there (so its negation follows)."}
Consistent (it has a model) and complete.
:::

:::answer
**Consistent and complete.** For example it proves $q$ (MP), $p \wedge q$, and $\neg(p \to \neg q)$.
:::
::::

::::example{#ex-ax-medium level="medium" title="A consistent theory that is not complete" depth="standard"}
Over $p, q$, is $\{p \vee q\}$ complete?

:::step{why="List its models: every assignment except FF."}
Models TT, TF, FT.
:::

:::step{why="Test the formula p: it is true on TT, TF and false on FT. So neither p nor ¬p is true on all models."}
$\{p \vee q\} \not\models p$ and $\{p \vee q\} \not\models \neg p$.
:::

:::answer
Consistent but **not complete**: $p$ is undecided. A theory with more than one model always leaves some
formula undecided (one that distinguishes two of the models).
:::
::::

::::example{#ex-ax-gate level="gate" title="Subsystems of a complete consistent system (GATE 1991)" depth="standard"}
If a finite axiom system $A$ is complete and consistent, is every subsystem of $A$ complete and
consistent? Explain briefly.

:::step{why="Consistency passes to subsets: a derivation from fewer axioms is a derivation from A."}
Every subsystem is consistent.
:::

:::step{why="Completeness can fail: removing an axiom may leave a statement neither provable nor refutable. Give a concrete instance."}
$A = \{p, q\}$ (over $p, q$) is complete and consistent; the subsystem $\{p\}$ cannot decide $q$.
:::

:::answer
**Every subsystem is consistent, but not necessarily complete.** Dropping axioms never creates a
contradiction, but it can lose the ability to settle a statement.
:::
::::

::::example{#ex-ax-edge level="gate" title="Edge case: an inconsistent system decides everything" depth="standard"}
Over $p, q$, the axioms $\{p, \neg p\}$: which formulas are theorems? Is the system "complete"?

:::step{why="The axioms have no model, so every formula is true in all (zero) models; with a complete proof system every formula is derivable. Directly: from p, addition gives p ∨ φ, and DS with ¬p gives φ."}
Every formula is a theorem, including $q$ and $\neg q$.
:::

:::step{why="Negation completeness asks that φ or ¬φ be provable for each φ; here both always are."}
Trivially negation-complete, and inconsistent.
:::

:::answer
It proves everything, so it is **complete only in a useless way**. This is why the questions ask for
"complete **and** consistent": a theory is valuable when it decides every statement in exactly one
direction.
:::
::::

:::note{#recap-axioms title="Recap" depth="quick"}
Sound: proves only consequences. Complete (system): proves all consequences. Consistent: never proves
$\varphi$ and $\neg\varphi$. Complete (theory): decides every $\varphi$. Subsystems inherit consistency, not
completeness.
:::

## Truth-tellers and liars

:::intuition{#knights-intuition title="Every speaker comes with a hidden biconditional" depth="standard"}
On an island, truth-tellers always say true things and liars always say false things. You meet someone
and hear a sentence. You do not know their type, so give it a variable: $k$ = "this person is a
truth-teller". The rule of the island says: the statement is true **exactly when** the speaker is a
truth-teller. So every utterance $S$ becomes the formula $k \leftrightarrow S$.

Now the puzzle is a consistency problem from earlier in this lesson: list the assignments that satisfy
all the biconditionals. If exactly one survives, the puzzle is solved; if none survives, someone could
not have said that.
:::

:::definition{#knights-def term="Translating a truth-teller/liar statement" depth="quick"}
For a speaker $X$ with type variable $x$ ($x = $ T: truth-teller, $x = $ F: liar) who says $S$, add the
constraint
$$x \leftrightarrow S.$$
"I am a truth-teller" is $S = x$; "I am a liar" is $S = \neg x$; "$Y$ is a liar" is $S = \neg y$. Solve by
listing the assignments that satisfy every constraint.
:::

:::theorem{#knights-theorem name="'S if and only if I am telling the truth' forces S" depth="standard"}
Whatever the speaker's type, the constraint $x \leftrightarrow (S \leftrightarrow x)$ is equivalent to $S$. In
particular, a speaker who says "$S$ if and only if I am telling the truth" reveals that $S$ is true,
and reveals nothing about their own type.
:::

:::proof{#proof-knights of="the 'iff I am truthful' theorem" depth="standard"}
**Idea first:** a biconditional with $x$ on both sides cancels $x$.

Case $x$ = T: the constraint is $\text{T} \leftrightarrow (S \leftrightarrow \text{T})$, i.e. $S \leftrightarrow
\text{T}$, i.e. $S$. Case $x$ = F: it is $\text{F} \leftrightarrow (S \leftrightarrow \text{F})$; now $S
\leftrightarrow \text{F} \equiv \neg S$ and $\text{F} \leftrightarrow \neg S \equiv S$. In both cases the
constraint is exactly $S$. Algebraically, $\leftrightarrow$ is associative and $x \leftrightarrow x \equiv
\text{T}$. **Sanity check:** a liar who says "the coin is heads iff I am truthful" is saying something
false; "I am truthful" is F for him, so "heads ↔ F" must be false, so heads is T. Same answer.
:::

:::viz{#knights-viz spec="knights-grid" mode="animate" depth="standard"}
:::

:::trick{#trick-knights-iff title="Tabulate type × fact, keep the consistent cells" depth="standard"}
For one speaker and one unknown fact, draw a $2 \times 2$ grid: rows for the type, columns for the fact.
In each cell evaluate the statement, and keep the cell only if the statement's value equals the type
(true for a truth-teller, false for a liar). The surviving cells are the possible worlds; any option
true in all of them follows.

**Why it works:** the grid is the truth table of the constraint $x \leftrightarrow S$. **When it fails:** with
several speakers the grid has $2^n$ rows; then propagate forced values first (as in the consistency
examples), or use the theorem above to cancel self-references.
:::

### Worked examples: truth-tellers and liars

::::example{#ex-kn-easy level="easy" title="Who can say 'I am a liar'?" depth="quick"}
Can anyone on the island say "I am a liar"?

:::step{why="Translate with the speaker's type variable x: the statement is ¬x, so the constraint is x ↔ ¬x."}
Constraint $x \leftrightarrow \neg x$.
:::

:::step{why="A biconditional between a letter and its negation is false on both rows."}
$x$ = T: T ↔ F = F. $x$ = F: F ↔ T = F.
:::

:::answer
**Nobody**: a truth-teller would be lying and a liar would be telling the truth. The constraint is
unsatisfiable. ("I am a truth-teller", by contrast, can be said by anyone and reveals nothing.)
:::
::::

::::example{#ex-kn-medium level="medium" title="Two speakers" depth="standard"}
$A$ says "$B$ is a truth-teller". $B$ says "$A$ and I are of opposite types". What are $A$ and $B$?

:::step{why="Write one constraint per speaker: A's statement is b; B's statement is a ⊕ b."}
$a \leftrightarrow b$ and $b \leftrightarrow (a \oplus b)$.
:::

:::step{why="The first constraint makes a and b equal, so a ⊕ b is F."}
The second becomes $b \leftrightarrow \text{F}$, so $b = $ F.
:::

:::step{why="Back to the first constraint."}
$a = b = $ F.
:::

:::answer
**Both are liars.** Check: $A$'s statement "$B$ is a truth-teller" is false (fits a liar); $B$'s
statement "we are of opposite types" is false (fits a liar).
:::
::::

::::example{#ex-kn-gate level="gate" title="The coin and the biconditional (GATE 2015)" depth="standard"}
A person of unknown type tosses a fair coin, hides it, and says: "The result of the toss is head if
and only if I am telling the truth." What can you conclude?

:::step{why="Let h = the result is head, t = the speaker is truthful (type 1). The statement is h ↔ t, and the island rule adds t ↔ (h ↔ t)."}
Constraint $t \leftrightarrow (h \leftrightarrow t)$.
:::

:::step{why="Check the four cells. Type 1 (t = T): head gives statement T (allowed), tail gives F (not allowed). Type 2 (t = F): head gives T ↔ F = F (allowed for a liar), tail gives F ↔ F = T (not allowed)."}
Surviving worlds: (type 1, head) and (type 2, head).
:::

:::step{why="Test each option on both surviving worlds."}
"Head": true in both. "Tail": false in both. "Type 2 → tail": false in (type 2, head). "Type 1 → tail": false in (type 1, head).
:::

:::answer
**The result is head**, whatever the type. This is the theorem $t \leftrightarrow (h \leftrightarrow t) \equiv h$.
:::
::::

::::example{#ex-kn-edge level="gate" title="Edge case: 'If I am a truth-teller, the treasure is here'" depth="standard"}
A speaker says "if I am a truth-teller, then the treasure is here". What follows?

:::step{why="With x = speaker truthful and g = treasure here, the constraint is x ↔ (x → g)."}
Constraint $x \leftrightarrow (x \to g)$.
:::

:::step{why="Try x = F: the statement x → g has a false hypothesis, so it is TRUE, but a liar cannot say something true."}
$x = $ F is impossible.
:::

:::step{why="So x = T, and the statement must be true: T → g needs g = T."}
$x = $ T, $g = $ T.
:::

:::answer
The speaker is a **truth-teller and the treasure is here**. Vacuous truth from Lesson 1 is what traps the
liar: no liar can utter an implication whose hypothesis is "I am a truth-teller".
:::
::::

:::note{#recap-knights title="Recap" depth="quick"}
Speaker $X$ saying $S$ gives $x \leftrightarrow S$. Solve the constraints as a consistency problem. "$S$ iff I
am truthful" forces $S$; "I am a liar" is unsayable; "if I am truthful then $S$" forces both.
:::

## GATE questions on this lesson

All eight previous-year questions. Try each before opening the solution.

:::pyq{id="cse-1991-a-4-iv" tests="axiom-props-def,subsystem-theorem,ex-ax-gate" depth="standard"}
:::

:::pyq{id="cse-1992-b-15-a" tests="resolution-def,refutation-def,ex-res-gate" depth="standard"}
:::

:::pyq{id="cse-1993-ii-b-18" tests="consequence-def,ex-cons-medium" depth="standard"}
:::

:::pyq{id="cse-2003-cs-72" tests="resolution-sound-theorem,trap-resolution-equisat,ex-res-equisat" depth="standard"}
:::

:::pyq{id="it-2004-it-31" tests="validity-theorem,trick-falsify-conclusion,ex-arg-gate,ex-chain-gate" depth="standard"}
:::

:::pyq{id="cse-2012-cs-1" tests="rules-def,fallacy-def,ex-fal-gate" depth="standard"}
:::

:::pyq{id="cse-2015-2-cs-3" tests="trick-contrapositive-chain,ex-rule-gate" depth="standard"}
:::

:::pyq{id="cse-2015-3-cs-24" tests="knights-theorem,trick-knights-iff,ex-kn-gate" depth="standard"}
:::

## Practice

Our own questions in GATE formats: naming rules and judging validity first, then consistency,
resolution and puzzles.

:::practice{id="nx-dm-01-03-q01" depth="standard"}
:::

:::practice{id="nx-dm-01-03-q02" depth="standard"}
:::

:::practice{id="nx-dm-01-03-q03" depth="standard"}
:::

:::practice{id="nx-dm-01-03-q04" depth="standard"}
:::

:::practice{id="nx-dm-01-03-q05" depth="standard"}
:::

:::practice{id="nx-dm-01-03-q06" depth="standard"}
:::

:::practice{id="nx-dm-01-03-q07" depth="standard"}
:::

:::practice{id="nx-dm-01-03-q08" depth="standard"}
:::

:::practice{id="nx-dm-01-03-q09" depth="standard"}
:::

:::practice{id="nx-dm-01-03-q10" depth="standard"}
:::

:::practice{id="nx-dm-01-03-q11" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Arguments, inference and resolution on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Valid argument | conclusion T on every critical row; $(P_1 \wedge \dots \wedge P_n) \to C$ tautology; $P_1 \wedge \dots \wedge P_n \wedge \neg C$ unsatisfiable |
| Fast check | set the conclusion F, force the premises T; a full assignment is a counterexample |
| Consequence | $\Gamma \models C$ iff $\Gamma \cup \{\neg C\}$ inconsistent |
| Consistent set | one assignment makes all true; check the whole set, not pairs |
| Valid rules | MP, MT, HS, DS, addition, simplification, conjunction, resolution, dilemmas |
| Fallacies | affirming the consequent ($p \to q, q \therefore p$), denying the antecedent ($p \to q, \neg p \therefore \neg q$); counterexample $p$ = F, $q$ = T |
| Proof moves | chain rules; assume $A$ to prove $A \to B$; assume $A$, reach a contradiction, conclude $\neg A$ |
| Resolution | cancel one complementary pair; sound and refutation-complete; goal $\square$ |
| Axiom systems | subsystems stay consistent, may lose completeness |
| Truth-tellers | speaker $X$ saying $S$: $x \leftrightarrow S$; "$S$ iff I am truthful" forces $S$ |
:::

:::note{#further-depth title="Further depth: why logic needs both ⊨ and ⊢" depth="deep"}
For propositional logic, truth tables already decide $\models$, so a proof system may look redundant.
It is not: the table for 100 variables has $2^{100}$ rows, while a proof may be a few lines long. The
price is that **finding** a proof can be hard; deciding satisfiability is NP-complete (Cook–Levin), and
no known method avoids exponential time in the worst case. In first-order logic (Chapter 2) there are no
truth tables at all, because a domain can be infinite; there $\vdash$ is the only finite certificate of
truth, and Gödel's completeness theorem is what guarantees that $\vdash$ and $\models$ agree. His later
incompleteness theorem is about the other sense of "complete": no consistent, effectively listed set of
axioms for arithmetic decides every arithmetic statement.
:::
