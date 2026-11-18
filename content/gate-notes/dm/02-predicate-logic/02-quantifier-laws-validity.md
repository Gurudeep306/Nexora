---
id: quantifier-laws-validity
subject: dm
chapter: predicate-logic
title: Quantifier laws, validity and models
order: 2
prerequisites: [predicates-quantifiers]
pyq_topics: [dm/logic]
est_minutes: 70
difficulty: core
status: review
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every law, counter-model, model search, PYQ key and practice answer is recomputed in content/gate-notes/_checks/dm/l2_02_validity.py with predlib.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 37–43, set B pp. 172–177 (each half), set C pp. 311–318, set D pp. 679–681. The empty-domain slips (A 28/31, A 42, D 677/681) are recorded in _errata/dm.md."
  - "Facts checked against standard textbooks: Enderton, A Mathematical Introduction to Logic (the gap: Bernays–Schönfinkel small-model property, infinite-only models); Rosen (validity, satisfiability, counter-models); Liu (prenex form)."
  - "PYQs: src/gate/questions.json (dm/logic); all sixteen keys are re-derived by finite-domain evaluation and equivalence search in l2_02_validity.py."
updated: "2026-11-18"
---

Last lesson ended with translating English into logic. This lesson answers the question GATE actually
asks next: **which quantified formulas are true in every interpretation** — and how to prove a formula
is *not* by exhibiting one small counter-model. The tools are interpretations, models, validity, and a
handful of quantifier laws. Everything here is checkable on tiny domains, and the checks in
`l2_02_validity.py` recompute every claim below by brute force.

Here is the road map. We first make precise what an **interpretation** is (a domain plus a meaning for
every predicate) and what it means for a formula to be **valid**, **satisfiable** or **unsatisfiable**.
Then the **laws**: two equivalences and five one-way implications that decide most "which is valid"
questions in seconds. Next, moving quantifiers past parts of a formula that do not mention the
variable (**null quantification**) and pulling all quantifiers to the front (**prenex form**). The
second half is about **models**: how to search for a counter-model on a 2-element domain, a sentence
with only infinite models, the Bernays–Schönfinkel small-model property, Horn-clause logic
programs, and induction written as a first-order axiom.

## Where this fits

You need the quantifier basics from [Lesson 1 of this chapter](lesson:predicates-quantifiers):
big-AND/big-OR meaning of $\forall$ and $\exists$, free vs bound variables, and De Morgan for
quantifiers. This lesson uses them constantly. The validity questions here are the same game as
"which propositional formula is a tautology?" from [Lesson 2 of Chapter 1](lesson:equivalence-normal-forms),
just lifted to formulas with quantifiers. The lab at the end,
the Quantifier Lab, has a **models** tab that does the counter-model search of this
lesson live.

:::table{#radar title="GATE radar: quantifier laws, validity and models" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 16 (1991–2025) |
| Marks | 13 one-mark, 3 two-mark; 1 MSQ (1992), 1 descriptive (1991) |
| Pattern 1 | "Which of these is valid / NOT valid": 1992, 2003-32, 2005, 2007, 2008-IT, 2013, 2015-2, 2016-2, 2020 — decided by the one-way laws + 2-element counter-models |
| Pattern 2 | Models / satisfiability of a named sentence: 1991 (infinite-only), 2003-33 (both interpretations), 2006, 2017-1 |
| Pattern 3 | Quantifier-free fragments and small models: 2018 (Bernays–Schönfinkel) |
| Pattern 4 | Logic programs and induction as FOL: 2003-71 (Horn), 2025-2 (induction direction) |
| Trap | The non-empty-domain convention: $\forall xP \to \exists xP$ needs $D \neq \varnothing$ (errata A 28/31, A 42, D 681) |
:::

## Interpretations, models, validity

A quantified formula only becomes true or false once we fix **where the variables range** and
**what the predicates mean**. That pair is an interpretation.

:::definition{#interpretation-def term="Interpretation" depth="standard"}
An **interpretation** $I$ of a first-order language is:

1. a non-empty **domain** (universe) $D$ of objects, and
2. for every predicate symbol $P$ of arity $n$, a set $P^I \subseteq D^n$ — the tuples for which $P$ is true.

Constants, if any, get an element of $D$; function symbols get functions on $D$. For our purposes
(dm/logic PYQs) only the domain and the predicate extensions matter.
:::

:::definition{#model-def term="Model" depth="standard"}
An interpretation $I$ is a **model** of a formula $\varphi$ (written $I \models \varphi$) when $\varphi$ is
**true** in $I$, written $\models_I \varphi$. If $\varphi$ has free variables, we also fix their values
(an assignment); a formula with no free variables is a **sentence**, and its truth depends only on $I$.
:::

:::definition{#satisfiable-valid-unsat term="Satisfiable, valid, unsatisfiable" depth="standard"}
- **satisfiable**: true in at least one interpretation;
- **valid** (a tautology of FOL): true in *every* interpretation (every non-empty domain, every choice of predicate meanings);
- **unsatisfiable** (contradiction): true in no interpretation.

Note: $\varphi$ is valid $\iff$ $\neg\varphi$ is unsatisfiable. And "satisfiable but not valid" means:
true somewhere, false somewhere.
:::

:::trap{#trap-nonempty-domain title="The non-empty-domain convention" depth="quick"}
GATE (and this site) always takes the domain to be **non-empty**. That is why
$\forall x\,P(x) \to \exists x\,P(x)$ is valid here: if every element satisfies $P$, the domain must
contain at least one element, which is then a witness for $\exists x\,P(x)$. On an *empty* domain the
implication would fail ($\forall xP$ is vacuously true, $\exists xP$ false). The source booklets slip
on this (errata A 28/31, A 42, D 677/681); the convention is fixed as non-empty.
:::

:::intuition{#interpretation-picture title="An interpretation is a small world" depth="standard"}
Think of an interpretation as a tiny hand-made world: the domain is the list of citizens, and each
predicate paints some citizens (or pairs, triples) a colour. "$\forall x\,P(x)$" then literally asks:
is every citizen painted? A counter-model is just a world where the answer is "no" — and for GATE
purposes, worlds with 1, 2 or 3 citizens are almost always enough to find one.
:::

### Worked examples: interpretations and models

::::example{#ex-i-count level="easy" title="Counting interpretations of one unary predicate" depth="quick"}
How many interpretations are there for a single unary predicate $P$ over the domain $D = \{1, 2\}$?

:::step{why="An interpretation of P is exactly a choice of which elements lie in P — a subset of D."}
$P$ can be $\varnothing, \{1\}, \{2\}, \{1,2\}$ — that is $2^{|D|} = 2^2 = 4$ interpretations.
:::

:::step{why="Same count for a binary predicate R over {1,2}: R is a subset of D×D, which has 4 pairs."}
A binary $R$ has $2^{|D|^2} = 2^4 = 16$ interpretations. In general: $2^{|D|^n}$ for arity $n$.
:::

:::answer
4 interpretations for $P$ over $\{1,2\}$; 16 for a binary $R$. (Practice q03 and q09 use exactly these counts.)
:::
::::

::::example{#ex-i-model level="easy" title="Is this interpretation a model?" depth="quick"}
$D = \{1,2,3\}$, $P^I = \{2, 3\}$. Is $I$ a model of $\forall x\,(P(x) \to x \neq 1)$? Of $\exists x\,P(x)$?

:::step{why="Check ∀ cell by cell: the implication P(x) → x≠1 must hold for every element."}
$x=1$: $P(1)=F$, so $F \to F$ is T. $x=2$: $T \to T$. $x=3$: $T \to T$. All true.
:::

:::step{why="∃ needs just one witness."}
$P(2)$ is true, so $\exists x\,P(x)$ is true.
:::

:::answer
Yes to both: $I \models \forall x(P(x)\to x\neq1)$ and $I \models \exists x\,P(x)$.
:::
::::

::::example{#ex-i-valid level="medium" title="Valid or just satisfiable?" depth="standard"}
Classify $\forall x\,P(x) \to \exists x\,P(x)$: valid, satisfiable-but-not-valid, or unsatisfiable?

:::step{why="Validity needs truth in every interpretation; the non-empty-domain convention is what saves this one."}
If $\forall xP(x)$ is true in $I$, then $D$ is non-empty and every element is in $P^I$, so any element witnesses $\exists xP(x)$. If $\forall xP(x)$ is false, the implication is true. So true in every interpretation.
:::

:::step{why="It is not a contradiction: take D={1}, P={1} — the formula is true. So it is valid (hence satisfiable)."}
:::

:::answer
**Valid** (on non-empty domains). It fails only if empty domains were allowed — see the trap above.
:::
::::

::::example{#ex-i-sat-not-valid level="medium" title="Satisfiable but not valid" depth="standard"}
Classify $\forall x\forall y\,(R(x,y) \to R(y,x))$ (symmetry of $R$).

:::step{why="Find one model: the empty relation makes every implication vacuously true."}
$D=\{1,2\}$, $R^I=\varnothing$: both implications have false antecedents, so the sentence is true — satisfiable.
:::

:::step{why="Find one non-model: a one-directional edge breaks symmetry."}
$R^I=\{(1,2)\}$: at $(x,y)=(1,2)$, $R(1,2)\to R(2,1)$ is $T \to F = F$. So not valid.
:::

:::answer
**Satisfiable but not valid** — and so is its negation (the same one-directional $R$). This is exactly GATE IT 2006.
:::
::::

::::example{#ex-i-2003-33 level="gate" title="GATE 2003: both interpretations satisfy α (the Russell-style formula)" depth="standard"}
$\alpha = (\forall x)[P_x \Leftrightarrow (\forall y)[Q_{xy} \Leftrightarrow \neg Q_{yy}]] \Rightarrow (\forall x)[\neg P_x]$
over $\mathbb{N}$ with $Q_{xy}$ = "$y$ divides $x$". Show both $P$ = primes and $P$ = composites satisfy $\alpha$.

:::step{why="Find the witness that kills the inner ∀y: take y = x."}
$Q_{xx}$ ("x divides x") is true, so $Q_{xx} \Leftrightarrow \neg Q_{xx}$ is $T \Leftrightarrow F = F$; hence $\forall y(Q_{xy}\Leftrightarrow\neg Q_{yy})$ is false for every x.
:::

:::step{why="With the inner block false for every x, the antecedent becomes ∀x ¬P_x — and the conclusion is the same thing."}
$\alpha \equiv (\forall x\,\neg P_x) \Rightarrow (\forall x\,\neg P_x)$, true in every interpretation, whatever $P$ is. Both $I_1$ and $I_2$ satisfy it.
:::

:::answer
Both satisfy $\alpha$ (option D). The predicate $P$ is irrelevant because the antecedent is always false.
:::
::::

## The two equivalence laws

These are the only two quantifier distributions that work in **both directions**.

:::theorem{#law-forall-and name="∀ distributes over ∧" depth="standard"}
$\forall x\,(P(x) \wedge Q(x)) \equiv (\forall x\,P(x)) \wedge (\forall x\,Q(x))$.
:::

:::proof{#law-forall-and-proof depth="standard"}
"Every x satisfies both P and Q" $\iff$ "every x satisfies P" AND "every x satisfies Q". On a finite
domain both sides expand to the same big conjunction: $\bigwedge_{d \in D} (P(d) \wedge Q(d))
\equiv (\bigwedge_d P(d)) \wedge (\bigwedge_d Q(d))$. ∎
:::

:::theorem{#law-exists-or name="∃ distributes over ∨" depth="standard"}
$\exists x\,(P(x) \vee Q(x)) \equiv (\exists x\,P(x)) \vee (\exists x\,Q(x))$.
:::

:::proof{#law-exists-or-proof depth="standard"}
"Some x satisfies P or Q" $\iff$ "some x satisfies P" OR "some x satisfies Q" (the witness may differ
on the right). Big-OR version: $\bigvee_d (P(d) \vee Q(d)) \equiv (\bigvee_d P(d)) \vee (\bigvee_d Q(d))$. ∎
:::

:::viz{#viz-lawcheck spec="law-checked-on-world" mode="animate" depth="standard"}
:::

:::intuition{#same-connective title="Same quantifier + same connective = safe" depth="quick"}
$\forall$ with $\wedge$ and $\exists$ with $\vee$ are the two "matching" pairs — the quantifier and the
connective are both AND-like or both OR-like, so distribution is an equivalence. The moment the
connectives mix ($\forall$ with $\vee$, $\exists$ with $\wedge$), only one direction survives.
:::

### Worked examples: the equivalence laws

::::example{#ex-law-and level="easy" title="Proving ∀ over ∧ on a 3-element world" depth="quick"}
$D = \{a, b, c\}$, with $P = \{a, c\}$, $Q = \{b, c\}$. Evaluate both sides of
$\forall x(P(x)\wedge Q(x)) \equiv \forall xP(x) \wedge \forall xQ(x)$.

:::step{why="Left side: every element must be in both P and Q."}
$a$: P yes, Q no → already false. So LHS is F.
:::

:::step{why="Right side: ∀xP is F (b∉P), ∀xQ is F (a∉Q), so the ∧ is F."}
F ≡ F — the law holds on this world.
:::

:::answer
Both sides F; the equivalence holds (and the check verifies it on all 8 interpretations of P,Q over {a,b,c}).
:::
::::

::::example{#ex-law-or level="easy" title="Proving ∃ over ∨ on a 3-element world" depth="quick"}
Same $D$, $P=\{a\}$, $Q=\{b\}$. Evaluate $\exists x(P(x)\vee Q(x)) \equiv \exists xP(x) \vee \exists xQ(x)$.

:::step{why="Left side: some element is in P or in Q — a is in P, so true."}
:::

:::step{why="Right side: ∃xP is true (a), ∃xQ is true (b), so the ∨ is true."}
T ≡ T ✓. Note the witnesses differ on the right — that is allowed for ∨.
:::

:::answer
Both sides T. The law holds; the shared-witness requirement appears only with ∧, not ∨.
:::
::::

::::example{#ex-law-both-fail level="medium" title="When both sides are false" depth="standard"}
$P = \varnothing$, $Q = \varnothing$ on $D=\{a,b\}$. Evaluate both laws.

:::step{why="∀-∧ law: LHS ∀x(P∧Q) is F (nothing is in P), RHS (∀xP)∧(∀xQ) = F∧F = F."}
:::

:::step{why="∃-∨ law: LHS ∃x(P∨Q) = F, RHS (∃xP)∨(∃xQ) = F∨F = F. Both F ≡ F."}
:::

:::answer
Both laws hold in the all-false world too — equivalences must hold everywhere, not just in "interesting" worlds.
:::
::::

::::example{#ex-law-gate level="gate" title="Using the laws inside a bigger formula (GATE style)" depth="standard"}
Is $\forall x(P(x)\wedge Q(x)) \to (\forall xP(x)) \wedge (\forall xQ(x))$ valid?

:::step{why="Rewrite the antecedent with the law: ∀x(P∧Q) ≡ (∀xP)∧(∀xQ), so the formula becomes X → X."}
:::

:::step{why="X → X is true in every interpretation, so the original is valid."}
:::

:::answer
Valid. Substituting equivalent subformulas preserves validity — this is why the laws are useful inside larger formulas.
:::
::::

## The two not-laws (and the one-way replacements)

Now the mixed pairs. **Neither is an equivalence** — but each has a valid one-way version, and those
one-ways are half of what GATE tests.

:::theorem{#not-law-forall-or name="∀ does NOT distribute over ∨" depth="standard"}
$\forall x\,(P(x) \vee Q(x)) \not\equiv (\forall x\,P(x)) \vee (\forall x\,Q(x))$.
The valid direction is $(\forall xP) \vee (\forall xQ) \Rightarrow \forall x(P \vee Q)$.
:::

:::theorem{#not-law-exists-and name="∃ does NOT distribute over ∧" depth="standard"}
$\exists x\,(P(x) \wedge Q(x)) \not\equiv (\exists x\,P(x)) \wedge (\exists x\,Q(x))$.
The valid direction is $\exists x(P\wedge Q) \Rightarrow (\exists xP) \wedge (\exists xQ)$.
:::

:::trap{#trap-split-witness title="The witnesses must not split" depth="quick"}
On $D=\{1,2\}$ with $P=\{1\}$, $Q=\{2\}$: $\forall x(P\vee Q)$ is true (1 is in P, 2 is in Q), but
$\forall xP$ and $\forall xQ$ are both false. The single element that satisfies $P\vee Q$ **changes** with
x — that is exactly what the split right-hand side forbids. Same picture for $\exists$ over $\wedge$:
$\exists xP \wedge \exists xQ$ can use different witnesses; $\exists x(P\wedge Q)$ cannot.
:::

:::viz{#viz-countermodel spec="one-way-law-countermodel" mode="animate" depth="standard"}
:::

### Worked examples: the not-laws and their counter-models

::::example{#ex-notlaw-forall-or level="medium" title="Building the counter-model for ∀ over ∨" depth="standard"}
Refute $\forall x(P(x)\vee Q(x)) \equiv (\forall xP(x)) \vee (\forall xQ(x))$ on $D=\{1,2\}$.

:::step{why="Need LHS true and RHS false. LHS true means every element is in P or in Q."}
RHS false means not all are in P AND not all are in Q — so P misses something and Q misses something.
:::

:::step{why="Choose P={1}, Q={2}: LHS: x=1: T∨F=T; x=2: F∨T=T → true. RHS: ∀xP=F, ∀xQ=F → false."}
The two sides differ, so the equivalence is refuted.
:::

:::answer
Counter-model: $D=\{1,2\}$, $P=\{1\}$, $Q=\{2\}$. LHS T, RHS F. (GATE 2016-2 option D is exactly this.)
:::
::::

::::example{#ex-notlaw-exists-and level="medium" title="Building the counter-model for ∃ over ∧" depth="standard"}
Refute $\exists x(P(x)\wedge Q(x)) \equiv (\exists xP(x)) \wedge (\exists xQ(x))$ on $D=\{1,2\}$.

:::step{why="Need RHS true and LHS false: some element in P, some (possibly other) element in Q, but no element in both."}
:::

:::step{why="P={1}, Q={2}: RHS = T∧T = T; LHS: x=1: T∧F=F; x=2: F∧T=F → false."}
Refuted.
:::

:::answer
Counter-model: $P=\{1\}$, $Q=\{2\}$ on $\{1,2\}$. RHS T, LHS F.
:::
::::

::::example{#ex-oneway-ok level="easy" title="The valid direction survives the same world" depth="quick"}
On the same world ($P=\{1\}, Q=\{2\}$), evaluate
$(\forall xP)\vee(\forall xQ) \to \forall x(P\vee Q)$ and $\exists x(P\wedge Q) \to (\exists xP)\wedge(\exists xQ)$.

:::step{why="First: antecedent F∨F = F, so the implication is vacuously true."}
:::

:::step{why="Second: antecedent ∃x(P∧Q) = F, so again vacuously true. On worlds where the antecedent is true, the conclusion holds by the law."}
:::

:::answer
Both implications are true on this world — the one-way laws are valid (verified on all interpretations up to size 3 in the checks).
:::
::::

::::example{#ex-notlaw-converse level="gate" title="Killing the converse on a 1-element domain" depth="standard"}
Show $\forall x(P\vee Q) \to (\forall xP)\vee(\forall xQ)$ is NOT valid.

:::step{why="On D={1}, take P={1}, Q=∅: LHS ∀x(P∨Q) = T∨F = T. RHS: ∀xP = T, ∀xQ = F → T∨F = T. Equal here — need a 2-element split."}
:::

:::step{why="On D={1,2} with P={1}, Q={2} (as above): LHS T, RHS F — the implication is F."}
:::

:::answer
Not valid; the 2-element split is the minimal counter-model. GATE 1992 (option C) and 2016-2 (option D) live here.
:::
::::

## The five one-way laws

These five implications are valid. Their converses are all false (counter-models in the examples).
Together with the two equivalences above, they settle almost every "which is valid" option.

:::theorem{#one-way-laws name="The five one-way laws" depth="standard"}
1. $\forall x\,P(x) \Rightarrow \exists x\,P(x)$  (non-empty domain)
2. $(\forall x\,P(x)) \vee (\forall x\,Q(x)) \Rightarrow \forall x\,(P(x) \vee Q(x))$
3. $\exists x\,(P(x) \wedge Q(x)) \Rightarrow (\exists x\,P(x)) \wedge (\exists x\,Q(x))$
4. $\forall x\,(P(x) \Rightarrow Q(x)) \Rightarrow ((\forall x\,P(x)) \Rightarrow (\forall x\,Q(x)))$
5. $\exists y\,\forall x\,R(x,y) \Rightarrow \forall x\,\exists y\,R(x,y)$
:::

:::proof{#one-way-laws-proof depth="standard"}
(1) If every element is in P and D is non-empty, pick any element: it is in P. (2) If all are in P
(resp. Q), then all are in P∨Q. (3) The shared witness of P∧Q witnesses both. (4) If every x satisfies
P→Q and every x satisfies P, then every x satisfies Q. (5) If one fixed y works for every x, then for
each x that same y works. ∎
:::

:::theorem{#order-laws name="Order laws for ∀ and ∃" depth="standard"}
$\exists y\,\forall x\,R(x,y) \Rightarrow \forall x\,\exists y\,R(x,y)$, but not conversely.
Same-type quantifiers commute: $\forall x\forall y \equiv \forall y\forall x$ and $\exists x\exists y \equiv \exists y\exists x$.
:::

:::proof{#order-laws-proof depth="standard"}
Draw the x×y grid and mark the cells where $R(x,y)$ holds. "$\exists y\forall x$" means: **one full
column** is marked. "$\forall x\exists y$" means: **every row has a mark**. A full column makes every
row marked; the converse fails on a diagonal grid (every row marked, no full column). Same-type
commutation: "every pair" and "every pair" read in either order is the same grid. ∎
:::

:::theorem{#one-way-exists-forall name="One-way law restated" depth="quick"}
The grid law $\exists y\forall x R(x,y) \to \forall x\exists y R(x,y)$ is item 5 of the five laws; GATE
2017-1 tests exactly which of its neighbour statements follow from $\forall x\exists yR(x,y)$.
:::

:::viz{#viz-grid spec="exists-forall-implies-grid" mode="animate" depth="standard"}
:::

:::intuition{#grid-picture title="The grid picture for ∀∃" depth="standard"}
Always draw the grid. Rows = outer variable, columns = inner variable. "Every row has a mark" is weak;
"some column is full" is strong. Full column ⇒ every row marked, never the reverse. GATE 2007 option D,
2017-1 and practice q01-C are decided by this one picture.
:::

### Worked examples: the one-way laws

::::example{#ex-ow1 level="easy" title="∀xP → ∃xP on a 1-element domain" depth="quick"}
$D=\{a\}$, $P=\{a\}$. Evaluate $\forall xP(x) \to \exists xP(x)$.

:::step{why="Antecedent: ∀xP = T. Consequent: ∃xP = T (a is a witness)."}
T → T = T.
:::

:::step{why="With P=∅: antecedent F, so the implication is vacuously T. So it holds on both interpretations of P over {a}."}
:::

:::answer
Valid on every non-empty domain; this is law 1. It is the reason the non-empty-domain convention matters.
:::
::::

::::example{#ex-ow2 level="medium" title="Law 2 proved on a 2-element world" depth="standard"}
$D=\{1,2\}$. Show $(\forall xP)\vee(\forall xQ) \to \forall x(P\vee Q)$ holds for every P, Q on D.

:::step{why="Suppose the antecedent is true: either all elements are in P, or all are in Q."}
:::

:::step{why="Case all in P: then every x has P(x) true, so P(x)∨Q(x) is true for every x — consequent true. Case all in Q: symmetric. If the antecedent is false, the implication is vacuously true."}
:::

:::answer
Valid. (The converse is the not-law refuted in the previous section.)
:::
::::

::::example{#ex-ow4 level="medium" title="Law 4 — the GATE favourite" depth="standard"}
Prove $\forall x(P\to Q) \to ((\forall xP)\to(\forall xQ))$ and give a counter-model for its converse.

:::step{why="Assume ∀x(P→Q) and ∀xP. For any d: P(d) holds, and P(d)→Q(d) holds, so Q(d). Hence ∀xQ."}
:::

:::step{why="Converse: (∀xP→∀xQ) → ∀x(P→Q). On D={1,2}, P={1}, Q=∅: ∀xP=F, so antecedent F→F=T; but ∀x(P→Q) is false at x=1. F... the whole converse is T→F = F."}
:::

:::answer
The law is valid (GATE 2003-32 D, 2005, 2007 A); the converse fails on the 2-element split.
:::
::::

::::example{#ex-ow5 level="medium" title="Law 5 on the grid" depth="standard"}
On $D=\{a,b\}$, take $R=\{(a,a),(b,a)\}$ — column y=a is full. Evaluate both sides of law 5.

:::step{why="∃y∀xR(x,y): y=a gives R(a,a) and R(b,a) — both true, so LHS is T."}
:::

:::step{why="∀x∃yR(x,y): x=a: y=a works; x=b: y=a works — RHS is T. Now take the diagonal R={(a,a),(b,b)}: RHS is T but LHS is F (no full column)."}
:::

:::answer
Law 5 holds on the first grid; the diagonal is the counter-model for the converse (GATE 2007 D, 2017-1).
:::
::::

::::example{#ex-ow2017 level="gate" title="GATE 2017-1: what does ∀x∃yR imply?" depth="standard"}
$F = \forall x\exists y\,R(x,y)$. Which of I: $\exists y\exists xR(x,y)$, II: $\exists y\forall xR(x,y)$,
III: $\forall y\exists xR(x,y)$, IV: $\neg\exists x\forall y\neg R(x,y)$ are implied?

:::step{why="IV is F in disguise: ¬∃x∀y¬R ≡ ∀x∃yR — identical, so implied. I commutes the two ∃'s — implied."}
:::

:::step{why="II demands one full column — not implied. III swaps the argument order (∀y∃xR(x,y) is a different statement) — counter-model R={(1,1),(2,1)} on {1,2}: F holds, III fails at y=2."}
:::

:::answer
I and IV only (option B). Verified by searching all interpretations of R up to size 3 in l2_02_validity.py.
:::
::::

## Moving quantifiers past a formula without the variable

If $x$ does not occur free in $A$, the quantifier can slide across $A$ — for $\wedge$ and $\vee$ in
both directions, and for $\to$ with the quantifier flipped:

:::theorem{#null-quantification name="Null quantification (x not free in A)" depth="standard"}
- $\forall x\,(P(x) \wedge A) \equiv (\forall x\,P(x)) \wedge A$  and  $\forall x\,(P(x) \vee A) \equiv (\forall x\,P(x)) \vee A$
- $\exists x\,(P(x) \wedge A) \equiv (\exists x\,P(x)) \wedge A$  and  $\exists x\,(P(x) \vee A) \equiv (\exists x\,P(x)) \vee A$
- $\forall x\,(P(x) \to A) \equiv (\exists x\,P(x)) \to A$
- $\exists x\,(P(x) \to A) \equiv (\forall x\,P(x)) \to A$
The converses of the last two fail: $\forall x(P\to A) \not\equiv (\forall xP)\to A$.
:::

:::proof{#null-quantification-proof depth="standard"}
Since $x$ is not free in $A$, the truth of $A$ does not change when we vary $x$ over $D$. So
"for all x, (P(x) ∧ A)" is "(for all x, P(x)) and A" — the A factor can be pulled out of the big
AND/OR. For $\to$: $\forall x(P(x)\to A)$ says "if some x has P then A" — because if any $x$ has
$P(x)$, then for that x the implication forces $A$; and if no x has P, the implication holds
vacuously. Formally $\forall x(\neg P(x)\vee A) \equiv (\exists x\neg\neg P(x))... $ i.e.
$(\neg\exists xP(x)) \vee A \equiv (\exists xP(x))\to A$. ∎
:::

:::viz{#viz-null spec="quantifier-past-free-formula" mode="animate" depth="standard"}
:::

### Worked examples: null quantification

::::example{#ex-null-1 level="easy" title="∀x(P∨A) with A a sentence" depth="quick"}
$D=\{1,2\}$, $P=\{1\}$, and $A$ is a 0-ary predicate with $A^I = \text{true}$. Evaluate
$\forall x(P(x)\vee A)$ and $(\forall xP(x))\vee A$.

:::step{why="LHS: x=1: T∨T=T; x=2: F∨T=T → true. RHS: ∀xP = F, F∨T = T."}
:::

:::step{why="With A false: LHS: x=1: T∨F=T; x=2: F∨F=F → false. RHS: F∨F = F. Equal again."}
:::

:::answer
Both pairs agree — the equivalence holds for both truth values of A (checked on all interpretations up to size 3).
:::
::::

::::example{#ex-null-2 level="medium" title="The → flip: ∀x(P→A) ≡ (∃xP)→A" depth="standard"}
$D=\{1,2\}$, $P=\{1\}$, $A$ false. Evaluate $\forall x(P(x)\to A)$ and $(\exists xP(x))\to A$.

:::step{why="LHS: x=1: T→F = F → the ∀ is already false. RHS: ∃xP = T, T→F = F. Equal."}
:::

:::step{why="Now the trap pairing: $(\forall xP)\to A$ = F→F = T ≠ F = LHS. So ∀x(P→A) ≢ (∀xP)→A."}
:::

:::answer
The correct pairing is (∃xP)→A (option C of practice q04); (∀xP)→A is the wrong one (option A). GATE 2020 C is this trap.
:::
::::

::::example{#ex-null-3 level="medium" title="∃x(P→A) ≡ (∀xP)→A" depth="standard"}
Same world ($P=\{1\}$, $A$ false on $\{1,2\}$). Evaluate $\exists x(P(x)\to A)$ and $(\forall xP(x))\to A$.

:::step{why="LHS: x=1: T→F=F; x=2: F→F=T → ∃ is true. RHS: ∀xP=F, F→F=T. Equal."}
:::

:::step{why="Flip A to true: LHS: x=1: T→T=T → true. RHS: F→T=T. Equal. The law holds for both values of A."}
:::

:::answer
$\exists x(P\to A) \equiv (\forall xP)\to A$ — GATE 2020 option D is exactly this, and it is valid.
:::
::::

::::example{#ex-null-2008 level="gate" title="GATE IT 2008: the valid null-quantification option" depth="standard"}
With $\alpha(x)$ free in x and $\beta$ a sentence, which option is valid? (Wide-scope reading:
"$\forall x, \beta \to \alpha$" means $\forall x(\beta\to\alpha)$.)

:::step{why="Option C: $[(\exists x\alpha)\to\beta] \to [\forall x(\alpha\to\beta)]$. Since x is not free in β, the bracket equality $(∃xα→β) ≡ ∀x(α→β)$ holds, so C is X→X — valid."}
:::

:::step{why="A, B, D fail: e.g. β=T, α true only at one element of {1,2} refutes A and B; β=F with α true somewhere but not everywhere refutes D."}
:::

:::answer
C. Verified by substituting α:=A(x), β:=B (0-ary) and searching all interpretations up to size 3.
:::
::::

## Prenex form

:::definition{#prenex-def term="Prenex normal form" depth="standard"}
A formula is in **prenex form** when all its quantifiers stand at the very front, in a prefix
$Q_1x_1 Q_2x_2 \dots Q_kx_k$, followed by a quantifier-free matrix. Every formula has an equivalent
prenex form: pull quantifiers outward using the laws above, renaming bound variables to avoid
capture (e.g. $(\forall xP(x)) \wedge (\forall xQ(x)) \equiv \forall x\forall y\,(P(x)\wedge Q(y))$).
:::

:::viz{#viz-prenex spec="prenex-ladder" mode="animate" depth="standard"}
:::

### Worked examples: prenex conversion

::::example{#ex-prenex-1 level="medium" title="Pulling out of a disjunction of quantified parts" depth="standard"}
Convert $(\forall x\,P(x)) \vee (\exists y\,Q(y))$ to prenex form.

:::step{why="The two parts share no variable, so both quantifiers can move out over ∨ (null quantification): (∀xP)∨(∃yQ) ≡ ∀x(P ∨ ∃yQ) ≡ ∀x∃y(P(x)∨Q(y))."}
:::

:::step{why="Equally, ∃y can come first: ≡ ∃y∀x(P(x)∨Q(y)). Both are correct prenex forms — practice q12 tests exactly this."}
:::

:::answer
$\forall x\exists y\,(P(x)\vee Q(y))$ and $\exists y\forall x\,(P(x)\vee Q(y))$ are both equivalent prenex forms.
:::
::::

::::example{#ex-prenex-2 level="medium" title="Renaming to avoid capture" depth="standard"}
Convert $(\forall x\,P(x)) \wedge (\forall x\,Q(x))$ to prenex form.

:::step{why="Naively ∀x(P(x)∧∀xQ(x)) would capture the inner x. Rename the second: ∀x∀y(P(x)∧Q(y))."}
:::

:::step{why="Check: ∀x∀y(P(x)∧Q(y)) ≡ (∀xP)∧(∀yQ) by the ∀-∧ law twice — equivalent to the original."}
:::

:::answer
$\forall x\forall y\,(P(x)\wedge Q(y))$ — renaming bound variables never changes meaning (alpha-conversion).
:::
::::

::::example{#ex-prenex-3 level="gate" title="Which prenex forms are wrong? (practice q12 shape)" depth="standard"}
Which of $\forall x\forall y(P(x)\vee Q(y))$ and $\exists x\exists y(P(x)\vee Q(y))$ is equivalent to
$(\forall xP(x))\vee(\exists yQ(y))$?

:::step{why="∀x∀y(P∨Q) is equivalent to (∀xP)∨(∀yQ) (pull both out over ∨), not to (∀xP)∨(∃yQ). Counter-model: D={1,2}, P={1}, Q={2}: original = F∨T = T, but ∀∀ = F∨F = F."}
:::

:::step{why="∃x∃y(P∨Q) is equivalent to (∃xP)∨(∃yQ). Counter-model: D={1,2}, P={1}, Q=∅: original = F∨F = F, but ∃∃ finds x=1 with P(1)∨Q(1)=T, so ∃∃ = T."}
:::

:::answer
Neither: only $\forall x\exists y(P(x)\vee Q(y))$ and $\exists y\forall x(P(x)\vee Q(y))$ are equivalent to the original (verified by equivalence search up to size 3 — practice q12).
:::
::::

::::example{#ex-prenex-4 level="medium" title="Negation first, then pull out" depth="standard"}
Convert $\neg(\exists x\,P(x) \wedge \forall y\,Q(y))$ to prenex form.

:::step{why="Push the negation in: ¬(∃xP ∧ ∀yQ) ≡ ∀x¬P ∨ ∃y¬Q."}
:::

:::step{why="Now pull the quantifiers out over ∨ (null quantification, no shared variable): ∀x∃y(¬P(x) ∨ ¬Q(y)) ≡ ∃y∀x(¬P(x) ∨ ¬Q(y))."}
:::

:::answer
$∀x∃y(¬P(x)∨¬Q(y))$ (equivalently $∃y∀x(¬P(x)∨¬Q(y))$) — verified equivalent to the original up to size 3.
:::
::::

## Finding counter-models: the search GATE expects you to do mentally

"Which of the following is valid?" is decided by trying to **falsify** each option on tiny domains.
On a domain of size $n$, a unary predicate has $2^n$ possible meanings, a binary one $2^{n^2}$ — so
domains of size 1, 2, 3 give 2, 4, 8 (resp. 4, 16, 512) interpretations: small enough to enumerate
completely, big enough to refute almost every false law.

:::definition{#countermodel-search term="Counter-model search" depth="standard"}
To refute $\varphi$ (i.e. show it is not valid), enumerate domains $D = \{1\}, \{1,2\}, \{1,2,3\}$ and
every assignment of the predicate symbols; stop at the first $(D, I)$ with $I \not\models \varphi$.
That $(D,I)$ is a **counter-model**. If the search up to size 3 finds none and the predicate space is
small, the formula is very likely valid — and for the laws in this lesson, provable by the one-line
arguments given above.
:::

:::viz{#viz-search spec="countermodel-search" mode="animate" depth="standard"}
:::

### Worked examples: counter-model search

::::example{#ex-cm-1 level="easy" title="Enumerating interpretations of P over {1,2}" depth="quick"}
List all 4 interpretations of the unary predicate $P$ over $D=\{1,2\}$ and evaluate $\forall xP(x)$ in each.

:::step{why="Each interpretation is a subset of D: ∅, {1}, {2}, {1,2}."}
:::

:::step{why="∀xP is true only when P = {1,2}; in the other three rows some element fails P."}
:::

:::answer
4 rows; $\forall xP$ true in exactly 1 of them. So $\forall xP$ is satisfiable but not valid.
:::
::::

::::example{#ex-cm-2 level="medium" title="Refuting ∀x∃yR → ∃y∀xR by enumeration over {1,2}" depth="standard"}
Over $D=\{1,2\}$ there are $2^4 = 16$ binary relations. In how many is
$\forall x\exists yR(x,y) \to \exists y\forall xR(x,y)$ false?

:::step{why="The formula is false exactly when every row has a mark but no column is full."}
:::

:::step{why="Rows nonempty (9 relations) minus those with a full column (7) = 2: the diagonal {(1,1),(2,2)} and the anti-diagonal {(1,2),(2,1)}."}
:::

:::answer
Exactly 2 of the 16 relations falsify it — the two "matching" relations. The law's converse is not valid.
:::
::::

::::example{#ex-cm-3 level="gate" title="GATE 1992: which options survive the search?" depth="standard"}
Run the search on options A–D of GATE 1992 (validity of the four quantified statements).

:::step{why="A: ((∀xP)∨(∀xQ)) → ∀x(P∨Q) — this is one-way law 2, no counter-model in any of the 2^2+2^2 worlds up to size 3."}
:::

:::step{why="B, C, D each fall on D={1,2} with P={1}, Q={2} (B needs no shared witness, C is the converse of A, D fails with Q=∅ on {1})."}
:::

:::answer
Only A is valid — the MSQ answer is {A}. All four verdicts are recomputed in l2_02_validity.py.
:::
::::

::::example{#ex-cm-4 level="medium" title="How big can the search get?" depth="standard"}
How many interpretations of a binary predicate $R$ are there over a 3-element domain?

:::step{why="R ⊆ D×D, |D×D| = 9, so 2^9 = 512 interpretations."}
:::

:::step{why="Two unary predicates P, Q over {1,2,3}: 2^3 · 2^3 = 64. The checks enumerate all of these exhaustively; bigger spaces are sampled (3000 random worlds per domain size)."}
:::

:::answer
512 for one binary predicate over 3 elements — still enumerable; the predlib searches go up to size 3 fully when the space is ≤ 2^18.
:::
::::

## Sentences with only infinite models

Some sentences are satisfiable but have **no finite model** — first-order logic can say "the order
never ends".

:::theorem{#infinite-models name="The 1991 sentence has only infinite models" depth="standard"}
$\varphi = (\forall x\exists y\,R(x,y)) \wedge (\forall x\forall y(R(x,y)\to\neg R(y,x)))
\wedge (\forall x\forall y\forall z(R(x,y)\wedge R(y,z)\to R(x,z))) \wedge (\forall x\,\neg R(x,x))$
(serial + asymmetric + transitive + irreflexive) has **no finite model** but is satisfiable, e.g. $(\mathbb{N}, <)$.
:::

:::proof{#infinite-models-proof depth="standard"}
In any model, pick $x_0$ and follow successors: seriality gives $x_1$ with $R(x_0,x_1)$, then $x_2$ with
$R(x_1,x_2)$, and so on. Transitivity gives $R(x_i, x_j)$ for all $i<j$; asymmetry then forbids
$x_i = x_j$ for $i \neq j$ (else $R(x_i,x_i)$), and irreflexivity forbids it directly. So the witnesses
are pairwise distinct — an infinite supply is needed, impossible in a finite domain. On $\mathbb{N}$
with $<$ all four conjuncts hold. ∎
:::

:::viz{#viz-chain spec="infinite-models-chain" mode="animate" depth="standard"}
:::

### Worked examples: infinite-only models

::::example{#ex-inf-1 level="medium" title="Why the chain cannot loop" depth="standard"}
In a model of the 1991 sentence, suppose the successor chain revisits: $x_p = x_q$ for $p < q$.

:::step{why="Transitivity along the chain gives R(x_p, x_q) = R(x_p, x_p)."}
:::

:::step{why="But the last conjunct says ¬R(x,x) for all x — contradiction. So all chain elements are distinct."}
:::

:::answer
A finite domain cannot hold infinitely many distinct elements — hence no finite model. (Verified exhaustively for sizes 1–4 in the checks.)
:::
::::

::::example{#ex-inf-2 level="easy" title="Checking the four conjuncts on (ℕ, <)" depth="quick"}
Verify serial, asymmetric, transitive, irreflexive for $R$ = "$<$" on $\mathbb{N}$.

:::step{why="Serial: every n has n+1. Irreflexive: ¬(n<n). Asymmetric: n<m ⇒ ¬(m<n)."}
:::

:::step{why="Transitive: n<m<k ⇒ n<k. All four are immediate properties of <."}
:::

:::answer
$(\mathbb{N}, <)$ is a countable model — the sentence is satisfiable (GATE 1991 answer: no finite models; satisfiable).
:::
::::

::::example{#ex-inf-3 level="medium" title="A finite chain that fails seriality" depth="standard"}
$D=\{0,1,2,3,4\}$, $R = \{(x, x+1) : x < 4\}$. Which conjunct fails?

:::step{why="Asymmetry, transitivity (no two-step pairs exist), irreflexivity all hold on this chain."}
:::

:::step{why="Seriality fails at the top: x=4 has no y with R(4,y)."}
:::

:::answer
Only seriality fails — exactly why every finite chain breaks the sentence. Add a loop 4→0 and asymmetry/irreflexivity break instead.
:::
::::

::::example{#ex-inf-4 level="medium" title="Which conjunct forces infinity?" depth="standard"}
Drop the last two conjuncts of the 1991 sentence (keep serial + transitive). Does a finite model exist now?

:::step{why="Yes: take D={a} with R={(a,a)}. Serial: a has successor a. Transitive: R(a,a)∧R(a,a)→R(a,a) holds."}
:::

:::step{why="Asymmetry or irreflexivity is what forbids the loop R(a,a) — with either of them, the successor chain cannot revisit an element (transitivity would give R(x,x))."}
:::

:::answer
Serial + transitive alone have the 1-element model (D={a}, R={(a,a)}); adding asymmetry (or irreflexivity) kills every finite model.
:::
::::

## Bernays–Schönfinkel: the small-model property

:::definition{#bs-class term="Bernays–Schönfinkel class" depth="standard"}
Sentences of the form $\exists s_1 \dots \exists s_k \, \forall v_1 \dots \forall v_m \, \psi$ with
**quantifier-free** $\psi$ (predicates and equality only, no function symbols) form the
Bernays–Schönfinkel class. They have the **small-model property**: if such a sentence has any model
at all, it has one of size $\le k$ (the number of existential quantifiers).
:::

:::proof{#bs-proof depth="standard"}
Take witnesses $s_1^0, \dots, s_k^0$ in a model $M$ and restrict the universe to $D' = \{s_1^0,\dots,s_k^0\}$.
The original model satisfies $\psi$ for **all** values of the $\forall$-variables, so in particular for
values in $D'$. Hence $(D', \psi)$ is a model of size ≤ k. ∎
:::

### Worked examples: small models

::::example{#ex-bs-1 level="medium" title="GATE 2018: a 7-element model forces a ≤3 model" depth="standard"}
$\varphi = \exists s\exists t\exists u \forall v\forall w\forall x\forall y\, \psi(\dots)$ has a 7-element model. What is necessarily true?

:::step{why="Keep only the three witnesses s, t, u. The ∀ part held for all 7 elements, so it holds on the 3 kept ones."}
:::

:::step{why="So a model of size ≤ 3 exists (option A). Nothing forces size exactly 7 or forbids bigger models."}
:::

:::answer
Option A — the small-model property with k=3. Demonstrated in the checks on the concrete sentence "∃s∃t∃u∀… (s,t,u pairwise distinct)": models of size 7 and 3 exist, none of size 2.
:::
::::

::::example{#ex-bs-2 level="easy" title="Witness picking by hand" depth="quick"}
$\psi(s,t,u,\dots)$ = "s, t, u are pairwise distinct". The sentence has a model on {1..7} (pick 1,2,3). What is the smallest model?

:::step{why="Need three distinct witnesses, so any model has size at least 3."}
:::

:::step{why="On {1,2,3} with s=1, t=2, u=3 the ∀ part holds for all v,w,x,y ∈ {1,2,3}, because the distinctness of s,t,u does not depend on them."}
:::

:::answer
Size 3 — matching the bound k = 3. The check confirms: model at 7 ✓, at 3 ✓, at 2 ✗.
:::
::::

::::example{#ex-bs-3 level="medium" title="Why the quantifier-free restriction matters" depth="standard"}
Why does the argument fail for $\exists s \forall v\, \psi$ with function symbols allowed (e.g. successor)?

:::step{why="With a function symbol, the sub-universe {s₀} is not closed under the functions — the ∀ part may need values outside the witnesses (s₀, f(s₀), f(f(s₀)), …)."}
:::

:::step{why="Without function symbols (predicates + equality only), no new elements are ever forced, so the witness set alone suffices."}
:::

:::answer
The small-model property is special to the quantifier-free, function-free ∃*∀* fragment — that is why GATE 2018 says "predicate symbols and possibly equality, but no function symbols".
:::
::::

::::example{#ex-bs-4 level="easy" title="The k=1 case" depth="standard"}
$\varphi = \exists s\,\forall v\,(v = v)$ has a 5-element model. Apply the small-model property.

:::step{why="k = 1 existential quantifier, so if any model exists, one of size ≤ 1 exists — i.e. a 1-element domain works."}
:::

:::step{why="Check: on D={a}, pick s=a; the ∀v(v=v) part holds trivially. The sentence is true on every non-empty domain, including size 1."}
:::

:::answer
A 1-element model exists, exactly as the property predicts (witness: the single existential s).
:::
::::

## Horn clauses and logic programs as first-order sentences

:::definition{#horn-def term="Horn clause / logic program rule" depth="standard"}
A **logic program** is a set of rules $H \leftarrow B_1, \dots, B_n$ (read: "H if all the $B_i$") and
facts $H$. As a first-order sentence, a rule with head variable(s) becomes
$\forall x\,[(\exists y_1 \dots y_m\,(B_1 \wedge \dots \wedge B_n)) \to H]$ — the body variables are
**existential inside the antecedent**, the head variables **universal outside**. A fact
$\leftarrow B(x,x)$ (empty body) is the negative constraint $\neg\exists x\,B(x,x)$.
:::

:::proof{#horn-proof depth="standard"}
"A(x) holds whenever some y makes B(x,y)∧C(y) true" is exactly
$\forall x((\exists y(B(x,y)\wedge C(y))) \to A(x))$. Using $\forall y$ in the body would mean *all*
y's must satisfy it — a different, much stronger program. ∎
:::

:::viz{#viz-horn spec="horn-forward-chain" mode="animate" depth="standard"}
:::

### Worked examples: Horn programs

::::example{#ex-horn-1 level="gate" title="GATE 2003-71: translating the program" depth="standard"}
Program P:  A(x) ← B(x, y), C(y)   and   ← B(x, x).   Write the equivalent sentence.

:::step{why="The rule: head variable x is universal; body variable y is existential in the antecedent."}
$\forall x\,[(\exists y)(B(x,y)\wedge C(y)) \to A(x)]$.
:::

:::step{why="The fact ← B(x,x) is the negative constraint ¬∃x B(x,x), conjoined with ∧. Option A. (Errata: options B and D are printed identically in the paper — both wrongly use ∀y in the body.)"}
:::

:::answer
$\forall x[(\exists y)(B(x,y)\wedge C(y)) \Rightarrow A(x)] \wedge \neg\exists x\,B(x,x)$ — option A. Equivalence search up to size 3 confirms only A matches.
:::
::::

::::example{#ex-horn-2 level="medium" title="Forward chaining on a tiny program" depth="standard"}
Facts: B(1,2), C(2), and no B(x,x). Rule: A(x) ← B(x,y), C(y). Which A-facts are forced?

:::step{why="x=1: ∃y with B(1,y)∧C(y) — y=2 works (B(1,2) and C(2)) → A(1) is forced."}
:::

:::step{why="x=2: need y with B(2,y)∧C(y) — none (B only has (1,2)) → nothing forced. The negative fact ¬∃xB(x,x) holds since B(1,1) is absent."}
:::

:::answer
A(1) must hold; A(2) is free. The check evaluates the program sentence: false with A=∅, true with A={1}.
:::
::::

::::example{#ex-horn-3 level="medium" title="Why ∀y in the body is wrong" depth="standard"}
On $D=\{1,2\}$ with $B=\{(1,1),(1,2)\}$, $C=\{(1)\}$, $A=\{1\}$: compare
$\forall x((\exists y(B(x,y)\wedge C(y)))\to A(x))$ with $\forall x((\forall y(B(x,y)\wedge C(y)))\to A(x))$.

:::step{why="Existential version at x=1: y=1 works → A(1)=T required — satisfied. So the program sentence is true."}
:::

:::step{why="Universal version at x=1: ∀y(B(1,y)∧C(y)) needs y=2: B(1,2)∧C(2) = T∧F = F → antecedent false → implication true; but at a world with A(1)=F the two sentences differ — the search finds a separating model."}
:::

:::answer
The two readings differ; only the existential body matches the program semantics (verified by equivalence search).
:::
::::

::::example{#ex-horn-4 level="medium" title="The negative fact does real work" depth="standard"}
Program: A(x) ← B(x,y), C(y)  and  ← B(x,x). On D={1} with B={(1,1)}, C={(1,)}, must A(1) hold?

:::step{why="The rule at x=1: ∃y(B(1,y)∧C(y)) is true (y=1), so A(1) would be forced — but the fact ¬∃x B(x,x) is FALSE here (B(1,1) holds)."}
:::

:::step{why="So no interpretation with B(1,1) can be a model of the program at all; the negative fact forbids reflexive B pairs outright."}
:::

:::answer
The world B={(1,1)} is not a model of the program, regardless of A — the empty-body rule ←B(x,x) is the constraint ¬∃x B(x,x).
:::
::::

## Induction as a first-order axiom

:::definition{#induction-axiom term="Induction over ℕ as a sentence" depth="standard"}
Over the domain $\mathbb{N}$ with a successor function, the **induction axiom** is
$(P(0) \wedge \forall x\,(P(x) \Rightarrow P(x+1))) \Rightarrow \forall x\,P(x)$ — valid. The base must
be the bottom element (0) and the step must go **upward** (+1); any other base/direction leaves a
half-line uncovered.
:::

:::proof{#induction-proof depth="standard"}
If $P(0)$ and the step holds, then $P(1)$ (from $P(0)$), $P(2)$ (from $P(1)$), and so on — by ordinary
mathematical induction every natural number is reached. The wrong-direction variants: a downward
step from 0 proves nothing above 0 (counter-model $P=\{0\}$); a base at 1000 with a downward step
covers only $x\le 1000$; a base at 1000 with an upward step covers only $x\ge 1000$. ∎
:::

### Worked examples: the induction axiom

::::example{#ex-ind-1 level="gate" title="GATE 2025-2: which option is TRUE?" depth="standard"}
Over $\mathbb{N}$, which of A–D is true? (A: base 0, step +1; B: base 0, step −1; C: base 1000, step −1; D: base 1000, step +1.)

:::step{why="A is the induction axiom itself — true over ℕ by induction."}
:::

:::step{why="B's step goes down: P={0} satisfies the antecedent (nothing below 0 constrains) but not ∀xP. C covers only x≤1000: P={0..1000} refutes. D covers only x≥1000: P={1000,1001,…} refutes (on a finite cut {0..1001}, P={1000,1001})."}
:::

:::answer
A only. The check verifies A for every P on all finite domains {0..N}, N≤6 (fixed-point boundary convention), and exhibits the three counter-models on {0..1001}.
:::
::::

::::example{#ex-ind-2 level="medium" title="Finite-domain check of A" depth="standard"}
On $D=\{0,1,2\}$ with successor Ps(x)=x+1 for x<2 and Ps(2)=2 (fixed point), verify A for P={0,2}.

:::step{why="Antecedent: P(0)=T; step: x=0: T→Ps(0)=P(1)=F → F. So antecedent is false — implication vacuously true."}
:::

:::step{why="Try P={0,1,2}: antecedent T (step: 0→1→2→2 all true), consequent ∀xP=T → true. The search over all 2^3 subsets confirms A never fails on {0,1,2}."}
:::

:::answer
A holds for every P on {0,1,2} — and the check proves it for all subsets on every domain up to size 6.
:::
::::

::::example{#ex-ind-3 level="medium" title="Counter-model for the downward step" depth="standard"}
On {0..1001} with predecessor Pp(0)=0 (fixed point), take P={0}. Evaluate B = (P(0) ∧ ∀x(P(x)→Pp(x))) → ∀xP(x).

:::step{why="Antecedent: P(0)=T; step at x=0: T→Pp(0)=P(0)=T; at x≥1: F→anything=T. So antecedent T."}
:::

:::step{why="Consequent: ∀xP fails at x=1. So B is false in this world."}
:::

:::answer
B is refuted by P={0} — the downward step from 0 cannot climb. (GATE 2025-2 option B.)
:::
::::

::::example{#ex-ind-4 level="gate" title="GATE 2025-2 option D: base at 1000, step up" depth="standard"}
On {0..1001} with successor fixed-point Ps(1001)=1001, take P={1000, 1001}. Evaluate
D = (P(1000) ∧ ∀x(P(x)→Ps(x))) → ∀xP(x).

:::step{why="Antecedent: P(1000)=T; step: x=1000: T→P(1001)=T; x=1001: T→Ps(1001)=P(1001)=T; x<1000: F→anything=T. So antecedent T."}
:::

:::step{why="Consequent ∀xP fails at x=0. So D is false in this world."}
:::

:::answer
Refuted: an upward step from base 1000 never reaches below 1000. (Only option A of GATE 2025-2 survives.)
:::
::::

## Rules of inference for quantifiers

:::definition{#quantifier-inference term="UI, UG, EI, EG" depth="standard"}
From $\forall x\,\varphi(x)$ conclude $\varphi(t)$ for any term $t$ (**universal instantiation, UI**).
From $\varphi(x)$ for an arbitrary fixed $x$ conclude $\forall x\,\varphi(x)$ (**universal
generalisation, UG**). From $\exists x\,\varphi(x)$ introduce a fresh name $c$ with $\varphi(c)$
(**existential instantiation, EI**). From $\varphi(c)$ conclude $\exists x\,\varphi(x)$ (**EG**).
The order restriction: instantiate existentials **before** generalising (a fresh EI name must not
appear in the UG conclusion).
:::

:::trap{#trap-ug-order title="The classic invalid syllogism" depth="quick"}
"$\exists x\,P(x)$, so $\forall x\,P(x)$" is invalid: EI gives $P(c)$, and UG may only generalise over
variables that were arbitrary — $c$ is a fixed witness, not arbitrary. Correct order: do EI last, or
UG only over variables introduced by UI from a universal premise.
:::

### Worked examples: inference rules

::::example{#ex-inf-rules-1 level="medium" title="A valid syllogism" depth="standard"}
Premises: $\forall x\,(P(x) \to Q(x))$, $\forall x\,P(x)$. Conclude $\forall x\,Q(x)$.

:::step{why="UI on premise 1 with arbitrary x: P(x)→Q(x). UI on premise 2: P(x). Modus ponens: Q(x)."}
:::

:::step{why="x was arbitrary throughout, so UG gives ∀x Q(x)."}
:::

:::answer
Valid — this is exactly one-way law 4 read as an inference rule.
:::
::::

::::example{#ex-inf-rules-2 level="medium" title="An invalid one" depth="standard"}
Premises: $\exists x\,P(x)$. Conclude $\forall x\,P(x)$.

:::step{why="EI gives P(c) for a fresh witness c. UG over c is illegal — c is fixed by the premise."}
:::

:::step{why="Counter-model: D={1,2}, P={1}: premise true, conclusion false."}
:::

:::answer
Invalid. The trap above is exactly this move.
:::
::::

::::example{#ex-inf-rules-3 level="gate" title="Order matters: EI before UG" depth="standard"}
Premises: $\forall x\exists y\,R(x,y)$. Show we may conclude $\forall x\exists y\exists z\,(R(x,y)\wedge R(x,z))$... simpler: conclude $\neg\exists x\forall y\neg R(x,y)$.

:::step{why="The conclusion is logically equivalent to the premise (∀x∃yR ≡ ¬∃x∀y¬R) — so it follows with no rule juggling at all."}
:::

:::step{why="The general lesson (GATE 2017-1): from ∀x∃yR you may reorder/negate the *same* quantifier pattern, but not strengthen ∃y to ∀y."}
:::

:::answer
IV in GATE 2017-1 is implied because it is the same sentence with the negation pushed through; II (strengthening) is not.
:::
::::

::::example{#ex-inf-rules-4 level="easy" title="UI twice" depth="standard"}
From $\forall x\forall y\,(R(x,y) 	o R(y,x))$ derive $R(a,b) 	o R(b,a)$.

:::step{why="UI on x with a: ∀y(R(a,y)→R(y,a)). UI again on y with b: R(a,b)→R(b,a)."}
:::

:::step{why="Each instantiation replaces a universally quantified variable by a term; two UIs in a row are always safe."}
:::

:::answer
$R(a,b) 	o R(b,a)$ follows by two applications of UI.
:::
::::

## Negation laws recap (used by 2013 and 2015-2)

:::theorem{#negation-laws name="De Morgan for quantifiers and →" depth="standard"}
$\neg\forall x\,\varphi \equiv \exists x\,\neg\varphi$;  $\neg\exists x\,\varphi \equiv \forall x\,\neg\varphi$;
$\neg(P \to Q) \equiv P \wedge \neg Q$;  $P \to Q \equiv \neg P \vee Q$;  contrapositive $\neg Q \to \neg P \equiv P \to Q$.
:::

:::theorem{#law-equivalence-inside-quantifiers name="Equivalences hold inside quantifiers" depth="standard"}
If $\alpha \equiv \beta$ (same free variables), then $Q x\,\alpha \equiv Q x\,\beta$ for $Q \in \{\forall, \exists\}$.
So $[\forall x\exists y(P\to R)] \leftrightarrow [\forall x\exists y(\neg P\vee R)]$ is valid — GATE 2015-2 option C
is a tautology because its two sides are the *same* formula up to $P\to R \equiv \neg P\vee R$.
:::

:::trap{#trap-tautology-vs-valid title="Tautology (propositional) vs valid (FOL)" depth="quick"}
GATE 2015-2 asks for a **tautology** in the propositional sense: the truth-functional form must be a
propositional tautology. Option D ($\forall x\forall yP(x,y) \to \forall x\forall yP(y,x)$) is FOL-valid
(both sides then coincide), but its propositional skeleton is $A \to B$, not a tautology — so the key
is C. Recorded in _errata/dm.md.
:::

### Worked examples: negation laws in action

::::example{#ex-neg-2013 level="gate" title="GATE 2013-47: matching the negation" depth="standard"}
$\neg\exists x(\forall y\,\alpha \wedge \forall z\,\beta) \equiv \forall x(\exists y\,\neg\alpha \vee \exists z\,\neg\beta)$.
Which option is NOT equivalent?

:::step{why="B: ∀zβ → ∃y¬α ≡ ∃z¬β ∨ ∃y¬α ✓. C: ∀yα → ∃z¬β ≡ ∃y¬α ∨ ∃z¬β ✓. D: ∃y¬α → ∃z¬β ≡ ∀yα ∨ ∃z¬β — has ∀yα instead of ∃y¬α ✗."}
:::

:::step{why="Counter-model for D: one element, α=β=true: target = F∨F = F, D = T∨F = T. (Errata: as printed, option A is also not equivalent — GATE 2013 gave marks to all; the intended key is D.)"}
:::

:::answer
D (intended). B and C match; the equivalence search with α:=A(x,y), β:=B(x,z) confirms B, C equivalent and A, D refuted — see _errata/dm.md.
:::
::::

::::example{#ex-neg-2015 level="gate" title="GATE 2015-2: spotting the tautology" depth="standard"}
Which option is a tautology? C is $[∀x∃y(P→R)] ↔ [∀x∃y(¬P∨R)]$; D is $∀x∀yP(x,y) → ∀x∀yP(y,x)$.

:::step{why="C: P→R ≡ ¬P∨R pointwise, same quantifier prefix → both sides identical → ↔ is valid and its skeleton is X↔X — a tautology."}
:::

:::step{why="D is FOL-valid but its skeleton is A→B — not a propositional tautology. A and B have counter-models (diagonal R; R=∅,S=∅)."}
:::

:::answer
C. The check verifies C valid, A and B refuted, and D FOL-valid (hence the propositional reading matters — errata).
:::
::::

::::example{#ex-neg-contra level="easy" title="Contrapositive inside a quantifier" depth="quick"}
Show $\forall x(\neg Q(x) \to \neg P(x)) \equiv \forall x(P(x) \to Q(x))$.

:::step{why="¬Q→¬P ≡ P→Q pointwise (contrapositive), and the ∀ prefix is unchanged — by the inside-quantifier law the two are equivalent."}
:::

:::step{why="This is option IV of practice q06 — one of the three equivalent forms."}
:::

:::answer
Equivalent — verified by the equivalence search up to size 3 (I, II, IV all match ∀x(P→Q); III does not).
:::
::::

::::example{#ex-neg-4 level="easy" title="¬∃x∀y¬R ≡ ∀x∃yR on a concrete world" depth="quick"}
On D={1,2} with the diagonal R={(1,1),(2,2)}, evaluate both sides.

:::step{why="¬∃x∀y¬R(x,y): is there an x with ¬R(x,y) for all y? x=1: ¬R(1,2)=T... wait: ∀y¬R(1,y) needs ¬R(1,1)=F → false. Same for x=2. So ∃x∀y¬R = F, negation = T."}
:::

:::step{why="∀x∃yR(x,y): x=1: y=1 works; x=2: y=2 works → T. Both sides T — equal, as the law demands."}
:::

:::answer
Both true on the diagonal; the equivalence ¬∃∀¬ ≡ ∀∃ holds on all interpretations up to size 3 (this is statement IV of GATE 2017-1).
:::
::::

## Try it: the Quantifier Lab

Open the **models** tab of the lab: type a formula, and it searches every interpretation on domains of
size 1–3 for a model or a counter-model — exactly the search of this lesson. Try
`forall x exists y R(x,y) -> exists y forall x R(x,y)` (it will find the diagonal counter-model) and
`forall x (P(x) -> Q(x)) -> ((forall x P(x)) -> (forall x Q(x)))` (no counter-model — it is a law).

:::lab{#lab-quant-models lab="quantifier-lab" tab="models" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1991-b-15-b" tests="infinite-models,satisfiable-valid-unsat" depth="standard"}
:::

:::pyq{id="cse-1992-a-2-xv" tests="one-way-laws,not-law-forall-or" depth="standard"}
:::

:::pyq{id="cse-2003-cs-32" tests="one-way-laws" depth="standard"}
:::

:::pyq{id="cse-2003-cs-33" tests="interpretation-def,model-def" depth="standard"}
:::

:::pyq{id="cse-2003-cs-71" tests="horn-def" depth="standard"}
:::

:::pyq{id="it-2005-cs-36" tests="one-way-laws" depth="standard"}
:::

:::pyq{id="it-2006-cs-21" tests="satisfiable-valid-unsat" depth="standard"}
:::

:::pyq{id="it-2007-cs-21" tests="one-way-laws,order-laws" depth="standard"}
:::

:::pyq{id="it-2008-it-21" tests="null-quantification" depth="standard"}
:::

:::pyq{id="cse-2013-cs-47" tests="negation-laws,null-quantification" depth="standard"}
:::

:::pyq{id="cse-2015-2-cs-55" tests="law-equivalence-inside-quantifiers" depth="standard"}
:::

:::pyq{id="cse-2016-2-cs-27" tests="not-law-forall-or" depth="standard"}
:::

:::pyq{id="cse-2017-1-cs-2" tests="one-way-exists-forall,order-laws" depth="standard"}
:::

:::pyq{id="cse-2018-cs-28" tests="bs-class" depth="standard"}
:::

:::pyq{id="cse-2020-cs-39" tests="null-quantification" depth="standard"}
:::

:::pyq{id="cse-2025-2-cs-5" tests="induction-axiom" depth="standard"}
:::

## Practice

:::practice{id="nx-dm-02-02-q01" depth="standard"}
:::

:::practice{id="nx-dm-02-02-q02" depth="standard"}
:::

:::practice{id="nx-dm-02-02-q03" depth="standard"}
:::

:::practice{id="nx-dm-02-02-q04" depth="standard"}
:::

:::practice{id="nx-dm-02-02-q05" depth="standard"}
:::

:::practice{id="nx-dm-02-02-q06" depth="standard"}
:::

:::practice{id="nx-dm-02-02-q07" depth="standard"}
:::

:::practice{id="nx-dm-02-02-q08" depth="standard"}
:::

:::practice{id="nx-dm-02-02-q09" depth="standard"}
:::

:::practice{id="nx-dm-02-02-q10" depth="standard"}
:::

:::practice{id="nx-dm-02-02-q11" depth="standard"}
:::

:::practice{id="nx-dm-02-02-q12" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Quantifier laws, validity and models on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Interpretation | non-empty domain $D$ + an extension $P^I \subseteq D^n$ for every predicate; $2^{|D|^n}$ interpretations per arity-$n$ predicate |
| Model / valid / satisfiable | $I \models \varphi$; valid = true in every interpretation; satisfiable = true in some; valid ⇔ ¬φ unsatisfiable |
| Non-empty domain | GATE convention: $D \neq \varnothing$, so $\forall xP \to \exists xP$ is valid |
| Equivalences | $\forall x(P\wedge Q) \equiv \forall xP \wedge \forall xQ$;  $\exists x(P\vee Q) \equiv \exists xP \vee \exists xQ$ |
| Not-laws | $\forall$ over $\vee$ and $\exists$ over $\wedge$ are NOT equivalences (2-element split $P=\{1\},Q=\{2\}$) |
| Five one-way laws | $\forall P\to\exists P$; $(\forall P\vee\forall Q)\to\forall(P\vee Q)$; $\exists(P\wedge Q)\to(\exists P\wedge\exists Q)$; $\forall(P\to Q)\to((\forall P)\to(\forall Q))$; $\exists y\forall xR\to\forall x\exists yR$ |
| Order / grid | full column ⇒ every row marked; diagonal grid is the counter-model; same-type quantifiers commute |
| Null quantification | $x\notin$ free($A$): quantifier slides over $\wedge,\vee$ unchanged; over $\to$ it flips: $\forall x(P\to A)\equiv(\exists xP)\to A$, $\exists x(P\to A)\equiv(\forall xP)\to A$ |
| Prenex | pull quantifiers to the front, rename to avoid capture; both $\forall x\exists y$ and $\exists y\forall x$ can be right when the parts share no variable |
| Counter-model search | enumerate domains of size 1,2,3 and all predicate assignments; first falsifying world wins |
| Infinite-only models | serial + asymmetric + transitive + irreflexive ⇒ infinite chain ⇒ no finite model; $(\mathbb{N},<)$ is a model (1991) |
| Bernays–Schönfinkel | $\exists^*\forall^*$ quantifier-free, no functions ⇒ a model of size ≤ #existentials exists (2018) |
| Horn program | rule $A(x)\leftarrow B(x,y),C(y)$ ≡ $\forall x((\exists y(B\wedge C))\to A)$; fact $\leftarrow B(x,x)$ ≡ $\neg\exists xB(x,x)$ (2003-71) |
| Induction axiom | $(P(0)\wedge\forall x(P(x)\to P(x+1)))\to\forall xP(x)$ over ℕ; wrong base/direction leaves a half-line uncovered (2025-2) |
| Inference | UI, UG (only over arbitrary variables), EI (fresh name, before UG), EG |
:::

## Common mistakes

- Claiming $\forall$ distributes over $\vee$ or $\exists$ over $\wedge$ — they do not; only the one-way directions are valid. The 2-element split $P=\{1\}, Q=\{2\}$ refutes both equivalences instantly.
- Forgetting the non-empty-domain convention when checking $\forall xP \to \exists xP$ — on an empty domain it would fail; GATE fixes $D \neq \varnothing$ (errata A 28/31, A 42, D 681).
- Sliding a quantifier out of $\to$ without flipping it: $\forall x(P\to A)$ is $(\exists xP)\to A$, not $(\forall xP)\to A$ (GATE 2020 C is this trap).
- Reading a Horn rule's body variables as universally quantified — they are existential inside the antecedent; and joining rule + negative fact with $\lor$ instead of $\wedge$ (GATE 2003-71).
- Treating "has a 7-element model" as "every model has size 7" — Bernays–Schönfinkel says a model of size ≤ 3 must exist (GATE 2018 A); the 7 is irrelevant beyond guaranteeing existence.
- In induction questions, picking the option whose step goes downward or whose base is not at 0 — the step must climb from the bottom (GATE 2025-2 A).
- Calling a FOL-valid formula a "tautology" when GATE means propositional tautology — 2015-2 D is valid but its skeleton is $A\to B$; only C is $X \leftrightarrow X$ (errata).
- In ∀∃ order questions, assuming "every row has a mark" implies "some full column" — the diagonal grid says no (2007 D, 2017-1).
- Letting existential witnesses split: $\exists xP \wedge \exists xQ$ allows different witnesses; $\exists x(P\wedge Q)$ does not.
- Applying UG to a variable that came from EI — the witness is fixed, not arbitrary; this is the invalid "∃xP, therefore ∀xP" syllogism.
- In 2013-47-style negation matching, rewriting $P\to Q$ as $Q \vee \neg P$ and losing which disjunct is negated — write $\neg P \vee Q$ and check against $\exists y\neg\alpha \vee \exists z\neg\beta$ (errata: as printed, option A also fails; GATE gave marks to all).
