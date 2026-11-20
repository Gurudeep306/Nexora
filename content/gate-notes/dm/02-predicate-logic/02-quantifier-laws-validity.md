---
id: quantifier-laws-validity
subject: dm
chapter: predicate-logic
title: Quantifier laws, validity and models
order: 2
prerequisites: [predicates-quantifiers]
pyq_topics: [dm/logic]
est_minutes: 90
difficulty: advanced
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every law, counter-model, PYQ key and practice answer is recomputed in content/gate-notes/_checks/dm/l2_02_validity.py with predlib.py (search over all worlds of size 1 to 3, plus hand-built worlds)."
  - "Written without the reference notes (not available when this lesson was written): coverage from the official syllabus, the PYQ bank and the textbooks below; to be re-checked against the notes once their text is ready."
  - "Facts checked against standard textbooks: K. H. Rosen, Discrete Mathematics and its Applications; H. B. Enderton, A Mathematical Introduction to Logic (structures, validity, prenex form, small models of ∃…∃∀…∀ sentences)."
  - "PYQs: src/gate/questions.json (dm/logic); all sixteen keys are re-derived by model search in l2_02_validity.py; the printing problems of 2003, 2013 and 2015 are noted in _errata/dm.md."
updated: "2026-11-20"
---

In propositional logic, a truth table settles every question: list the rows, read the column. A
first-order formula has no such table. Its truth depends on a whole **world**: which objects exist,
and which predicates hold of which objects. There are infinitely many possible worlds, of every size.
So the questions change shape. "Is this formula always true?" becomes "is it true in **every** world?",
and the usual way to answer "no" is to **build one small world** where it fails, a counter-model.

This lesson is about that skill, plus the short list of quantifier laws that let you rewrite formulas
safely. Half of them are two-way equivalences; the other half work in **one direction only**, and GATE
asks about exactly that difference again and again ("which of these is valid?", "which is NOT
equivalent?"). For each one-way law we keep a two-element counter-model in our pocket.

The lesson runs in four parts: what a world is and what "valid" means; the laws, with a proof for each
valid direction and a counter-model for each invalid one; moving quantifiers past formulas that do not
mention their variable, which leads to prenex form; and a gallery of sentences whose models are
special (always true, only infinite, always small). Every GATE question on the topic sits in one of
these four parts, and each part ends with worked examples taken from them.

## Where this fits

[Lesson 1](lesson:predicates-quantifiers) gave quantifiers their meaning and taught translation and
negation. Here we treat formulas as objects to be classified: valid, satisfiable or unsatisfiable,
exactly as [Chapter 1](lesson:equivalence-normal-forms) classified propositional formulas as
tautologies, contingencies and contradictions. The counter-model habit is reused in every later
chapter: a relation that is "almost" transitive, a group table that is "almost" associative, a graph
that "should" be Hamiltonian. The last sections touch the edge of what logic can decide, which
returns in Theory of Computation as undecidability.

:::table{#radar title="GATE radar: quantifier laws, validity and models" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 16 (1991–2025) |
| Marks | 2 one-mark, 12 two-mark, 1 multiple-select (1992, marks not printed), 1 five-mark descriptive (1991) |
| Pattern 1 | Which formula is valid / NOT valid (∀ over ∨, ∃ over ∧, ∀(P→Q) vs ∀P→∀Q): 1992, 2003, IT 2005, IT 2007, 2015, 2016 |
| Pattern 2 | Moving a quantifier past a formula without the variable: IT 2008, 2013, 2020 |
| Pattern 3 | Satisfiable / valid / implied, on general worlds: IT 2006, 2017 |
| Pattern 4 | Models of special sentences (infinite-only, ∃∀ small models, induction, a Russell-style formula): 1991, 2003, 2018, 2025 |
| Pattern 5 | Logic programs (Horn clauses) as first-order sentences: 2003 |
| What examiners test | ∀ distributes over ∧ and ∃ over ∨, but not the other way; $\forall x(p(x) \to W) \equiv \exists x\, p(x) \to W$; a counter-model needs only two elements |
:::

## Worlds, models and validity

:::intuition{#world-intuition title="A formula is a description; a world either fits it or not" depth="standard"}
Think of a formula as a description in a dating profile: "everyone here likes someone, and nobody likes
themselves". A **world** is an actual group of people with an actual liking relation. Some groups fit
the description, some do not. A description that fits **every** possible group (like "everyone who
likes someone likes someone") is valid. One that fits **no** group (like "someone likes everyone and
nobody likes anyone") is unsatisfiable. Most descriptions fit some groups and not others.

To show a description does not always fit, you do not argue in general: you **exhibit** one group where
it fails. That group is a counter-model, and most of this lesson is learning to build small ones fast.
:::

:::definition{#interp-def term="Interpretation (structure)" depth="quick"}
An **interpretation** $I$ of a formula consists of

1. a non-empty **domain** $D$;
2. for each predicate symbol $P$ of arity $k$, a set $P^I \subseteq D^k$ of the $k$-tuples where $P$ is
   true (and, if there are constants or function symbols, their meanings in $D$);
3. for each free variable, an element of $D$ (sentences need none).

$I$ **satisfies** $\varphi$, written $I \models \varphi$, when $\varphi$ evaluates to T in $I$ using the
rules of Lesson 1 (∀ as a big AND, ∃ as a big OR). Such an $I$ is a **model** of $\varphi$.
:::

:::definition{#valid-def term="Valid, satisfiable, unsatisfiable" depth="quick"}
A formula $\varphi$ is

- **valid** (logically true) if **every** interpretation satisfies it; we write $\models \varphi$;
- **satisfiable** if **some** interpretation satisfies it;
- **unsatisfiable** (a contradiction) if **no** interpretation satisfies it;
- **contingent** if it is satisfiable but not valid.

Two formulas are **logically equivalent**, $\varphi \equiv \psi$, when every interpretation gives them the
same value, i.e. when $\varphi \leftrightarrow \psi$ is valid. $\varphi$ **logically implies** $\psi$ when every
model of $\varphi$ is a model of $\psi$, i.e. when $\varphi \to \psi$ is valid.
:::

:::theorem{#duality-theorem name="Validity and satisfiability are duals" depth="standard"}
$\varphi$ is valid iff $\neg\varphi$ is unsatisfiable. $\varphi$ is satisfiable iff $\neg\varphi$ is not
valid. Consequently every formula falls into exactly one of three classes: valid (its negation
unsatisfiable), unsatisfiable (its negation valid), or contingent (it and its negation both
satisfiable).
:::

:::proof{#proof-duality of="the duality" depth="standard"}
**Idea first:** $\neg$ flips the value in every single world.

In each interpretation exactly one of $\varphi$, $\neg\varphi$ is true. "Every world makes $\varphi$ true"
is the same as "no world makes $\neg\varphi$ true". "Some world makes $\varphi$ true" is the same as "not
every world makes $\neg\varphi$ true". The three classes are disjoint and cover everything: a formula is
true in all worlds, in none, or in some but not all.
:::

:::trick{#trick-counter title="Refute validity with the smallest world you can" depth="standard"}
To show that $A \to B$ is **not** valid, build a world where $A$ is true and $B$ is false. Start with a
domain of **two** elements, $\{1, 2\}$, and make the predicates differ on them ($P$ true at 1 only, $Q$
true at 2 only). Almost every one-way law in GATE breaks on such a world. It works because a law that
fails, fails because "for each element" and "for one element" can come apart, and two elements are
enough to make them come apart. It fails only for formulas that need many elements to break
(counting statements, or formulas with only infinite models).
:::

:::viz{#search-viz spec="model-search" mode="animate" depth="standard"}
:::

:::trap{#trap-finite-search title="A finite search can refute validity, never prove it" depth="quick"}
If a search over all worlds of size 1, 2 and 3 finds no counter-model, the formula may still fail in a
world of size 4, or only in an infinite world. A valid verdict needs an argument that covers every
world (a proof); a not-valid verdict needs one counter-model. The Quantifier Lab and our checks use
the search only to find counter-models, and prove the valid laws below by argument.
:::

## Worked examples: classifying formulas

::::example{#ex-cls-easy level="easy" title="Satisfiable, and so is its negation" depth="quick"}
Classify $\forall x\, \forall y\, (R(x, y) \to R(y, x))$ ("R is symmetric").

:::step{why="Find a model: the simplest world is one where R holds nowhere."}
$D = \{1\}$, $R = \varnothing$: every implication has a false hypothesis, so the formula is T. Satisfiable.
:::

:::step{why="Find a model of the negation: one pair without its mirror."}
$D = \{1, 2\}$, $R = \{(1, 2)\}$: $R(1, 2)$ holds but $R(2, 1)$ does not. The formula is F, so its
negation is satisfiable.
:::

:::answer
**Contingent**: satisfiable, and its negation is satisfiable too (GATE IT 2006, option B). Not valid,
not unsatisfiable.
:::
::::

::::example{#ex-cls-valid level="medium" title="A valid formula needs an argument" depth="standard"}
Show $\forall x\, P(x) \to \exists x\, P(x)$ is valid.

:::step{why="A valid formula must hold in every world: take an arbitrary one."}
Let $I$ be any interpretation with domain $D \ne \varnothing$. If $\forall x\, P(x)$ is false in $I$, the
implication is true.
:::

:::step{why="Otherwise use the element that the non-empty domain guarantees."}
If $\forall x\, P(x)$ is true, pick any $d \in D$; $P(d)$ holds, so $d$ witnesses $\exists x\, P(x)$.
:::

:::answer
True in every world: **valid** (on non-empty domains, our standing convention).
:::
::::

::::example{#ex-cls-unsat level="medium" title="An unsatisfiable sentence" depth="standard"}
Classify $\exists x\, \forall y\, R(x, y) \wedge \forall x\, \exists y\, \neg R(x, y)$.

:::step{why="Suppose some world satisfies it, and take the witness of the first conjunct."}
Let $a$ be such that $R(a, y)$ for every $y$.
:::

:::step{why="Apply the second conjunct to that same a."}
It gives some $y$ with $\neg R(a, y)$, contradicting the first conjunct.
:::

:::answer
No world can satisfy it: **unsatisfiable**. By the duality theorem its negation is valid; pushing the
negation in, that negation reads $\exists x\, \forall y\, R(x, y) \to \exists x\, \forall y\, R(x, y)$, plainly
true in every world.
:::
::::

::::example{#ex-cls-implied level="gate" title="What does ∀x ∃y R(x, y) imply?" depth="standard"}
$F = \forall x\, \exists y\, R(x, y)$. Which of I $\exists y\, \exists x\, R(x, y)$, II $\exists y\, \forall x\, R(x, y)$,
III $\forall y\, \exists x\, R(x, y)$, IV $\neg\exists x\, \forall y\, \neg R(x, y)$ does $F$ imply?

:::step{why="I: the domain is non-empty, so take any x and its witness y."}
Any $d \in D$ has some $y$ with $R(d, y)$, so a related pair exists. **I follows.**
:::

:::step{why="IV: push the negation through."}
$\neg\exists x\, \forall y\, \neg R \equiv \forall x\, \exists y\, R = F$. **IV follows** (it is $F$).
:::

:::step{why="II and III: for each, build a world where F holds and it fails."}
II: $D = \{1, 2\}$, $R = \{(1, 2), (2, 1)\}$. Every row has a T, so $F$ holds; neither column is full,
so II fails. III: $R = \{(1, 1), (2, 1)\}$. Every row has a T (in column 1), so $F$ holds; column 2 is
empty, so III fails.
:::

:::answer
**I and IV only** (GATE 2017, option B).
:::
::::

::::check{#check-classify title="Quick check: classify" depth="quick"}
Classify (i) $\exists x\, (P(x) \wedge \neg P(x))$, (ii) $\exists x\, P(x) \vee \exists x\, \neg P(x)$, (iii)
$\exists x\, P(x) \to \forall x\, P(x)$.

:::answer
(i) Unsatisfiable: no element is both $P$ and not $P$. (ii) Valid: the domain is non-empty, and any element
is either $P$ or not $P$. (iii) Contingent: true when $P$ holds everywhere or nowhere, false on
$D = \{1, 2\}$ with $P = \{1\}$.
:::
::::

**Recap.** A world (interpretation) is a domain plus meanings for the predicates. Valid = true in every
world; satisfiable = true in some; unsatisfiable = true in none. Refute validity with one small
counter-model; prove it with an argument.

## The quantifier laws

:::intuition{#laws-intuition title="∀ is a big AND, so it shares AND's habits" depth="standard"}
Because $\forall$ is a long $\wedge$ and $\exists$ a long $\vee$, every law about $\wedge$ and $\vee$ has a
quantifier cousin. $\forall$ splits over $\wedge$ just as a long list of ANDs can be regrouped: "everyone
is tall and everyone is kind" is "everyone is tall and kind". $\exists$ splits over $\vee$ the same way.
But $\forall$ does **not** split over $\vee$: "everyone is a cat person or a dog person" does not say
"everyone is a cat person, or everyone is a dog person". The individual choices can differ from person
to person, and that is the whole story of the one-way laws.
:::

:::theorem{#two-way-laws name="The two-way laws" depth="standard"}
For all formulas $\varphi$, $\psi$:

1. $\forall x\, (\varphi \wedge \psi) \equiv \forall x\, \varphi \wedge \forall x\, \psi$ ($\forall$ distributes over $\wedge$);
2. $\exists x\, (\varphi \vee \psi) \equiv \exists x\, \varphi \vee \exists x\, \psi$ ($\exists$ distributes over $\vee$);
3. $\neg\forall x\, \varphi \equiv \exists x\, \neg\varphi$ and $\neg\exists x\, \varphi \equiv \forall x\, \neg\varphi$ (De Morgan);
4. $\forall x\, \forall y\, \varphi \equiv \forall y\, \forall x\, \varphi$ and $\exists x\, \exists y\, \varphi \equiv \exists y\, \exists x\, \varphi$;
5. $\forall x\, \varphi \equiv \forall y\, \varphi[y/x]$ (renaming a bound variable to a fresh one).
:::

:::proof{#proof-two-way of="∀ over ∧ and ∃ over ∨" depth="standard"}
**Idea first:** read both sides element by element.

(1) Left side true iff for every $d$, both $\varphi(d)$ and $\psi(d)$ hold iff every $d$ satisfies $\varphi$
and every $d$ satisfies $\psi$ iff the right side is true. (2) Left side true iff some $d$ satisfies
$\varphi$ or $\psi$ iff some $d$ satisfies $\varphi$ or some $d$ satisfies $\psi$. (2) also follows from (1)
by De Morgan: negate both sides of (1) applied to $\neg\varphi$, $\neg\psi$.
:::

:::theorem{#one-way-laws name="The one-way laws" depth="standard"}
Each of these implications is valid, and its **converse is not**:

| Valid direction | Converse fails on |
|:--|:--|
| $\forall x\, \varphi \vee \forall x\, \psi \;\Rightarrow\; \forall x\, (\varphi \vee \psi)$ | $D = \{1, 2\}$, $\varphi$ true at 1, $\psi$ true at 2 |
| $\exists x\, (\varphi \wedge \psi) \;\Rightarrow\; \exists x\, \varphi \wedge \exists x\, \psi$ | the same world |
| $\forall x\, (\varphi \to \psi) \;\Rightarrow\; (\forall x\, \varphi \to \forall x\, \psi)$ | $\varphi$ true at 1 only, $\psi$ nowhere |
| $\forall x\, (\varphi \to \psi) \;\Rightarrow\; (\exists x\, \varphi \to \exists x\, \psi)$ | $\varphi$ true at 1 only, $\psi$ true at 2 only |
| $\forall x\, (\varphi \leftrightarrow \psi) \;\Rightarrow\; (\forall x\, \varphi \leftrightarrow \forall x\, \psi)$ | $\varphi$ true at 1, $\psi$ true at 2 (both $\forall$'s false) |
| $\exists y\, \forall x\, \varphi \;\Rightarrow\; \forall x\, \exists y\, \varphi$ | Lesson 1's grid; $(\mathbb{N}, <)$ |
| $\forall x\, \varphi \;\Rightarrow\; \exists x\, \varphi$ | any world where $\varphi$ holds somewhere but not everywhere |
:::

:::proof{#proof-one-way of="the one-way laws" depth="standard"}
**Idea first:** in each valid direction, the left side hands you, for every element, what the right
side needs; the converse would need one choice to work for everyone.

Row 1: if every $d$ satisfies $\varphi$, then every $d$ satisfies $\varphi \vee \psi$; same if every $d$
satisfies $\psi$. Row 2: a $d$ with $\varphi \wedge \psi$ witnesses both $\exists x\, \varphi$ and
$\exists x\, \psi$. Row 3: if every element passes the promise $\varphi \to \psi$ and every element
satisfies $\varphi$, then every element satisfies $\psi$ (modus ponens, element by element). Row 4: a
witness of $\varphi$ also satisfies $\psi$ by the promise. Row 5: if $\varphi$ and $\psi$ agree on every
element, then "all satisfy $\varphi$" and "all satisfy $\psi$" agree. Rows 6 and 7 were proved in
Lesson 1. Each converse fails on the world in the table: check it in your head, or in the Lab.
:::

:::viz{#forall-or-viz spec="forall-or-counter" mode="animate" depth="standard"}
:::

:::viz{#exists-and-viz spec="exists-and-counter" mode="animate" depth="standard"}
:::

:::viz{#laws-map-viz spec="law-map" mode="animate" depth="standard"}
:::

:::trap{#trap-distribute title="∀ over ∨ and ∃ over ∧ are the classic wrong 'laws'" depth="quick"}
$\forall x\, (P(x) \vee Q(x)) \to (\forall x\, P(x) \vee \forall x\, Q(x))$ is **not valid**: in a class
where every student likes tea or coffee, it does not follow that all like tea or all like coffee. GATE
asks this in 1992, IT 2005 and 2016. Likewise $\exists x\, P(x) \wedge \exists x\, Q(x) \to \exists x\, (P(x)
\wedge Q(x))$ is not valid: someone likes tea and someone likes coffee, but perhaps nobody likes both.
:::

:::trap{#trap-forall-imp title="∀x(P → Q) and (∀x P → ∀x Q) are not the same" depth="quick"}
$\forall x\, (P \to Q)$ is a promise about **each** element; $\forall x\, P \to \forall x\, Q$ is a single
promise about the **whole** domain, which is vacuously kept whenever $P$ fails somewhere. The first
implies the second; the second does not imply the first. GATE IT 2005, IT 2007 and 2003 all test this
direction.
:::

:::trick{#trick-two-elements title="The two-element world that breaks every wrong law" depth="standard"}
Keep this world ready: $D = \{1, 2\}$, $P$ true only at 1, $Q$ true only at 2. In it, $\forall x\, P$,
$\forall x\, Q$, $\exists x\, (P \wedge Q)$ are all **false**, while $\forall x\, (P \vee Q)$, $\exists x\, P$,
$\exists x\, Q$ are all **true**. Any formula whose left side uses the true ones and right side the
false ones is refuted at once. It works because the two predicates "take turns". It cannot refute a
law that is actually valid, of course, and for ∃∀ versus ∀∃ use a binary relation instead (the grid).
:::

:::table{#method-table title="A method for 'which of these is valid?'" depth="standard"}
| Step | What you do | Why it is fast |
|:--|:--|:--|
| 1 | Rewrite each option without $\leftrightarrow$, and with $\to$ only at the top level | most options are "law → converse" in disguise |
| 2 | Match each against the two-way and one-way tables | a row of the one-way table settles it in one look |
| 3 | For an unknown direction, try $D = \{1, 2\}$, $P = \{1\}$, $Q = \{2\}$ (or $Q = \varnothing$) | the turn-taking world breaks almost every invalid law |
| 4 | For a binary $R$, try the 2 × 2 "swap" grid $R = \{(1, 2), (2, 1)\}$ and the "one column" grid $\{(1, 1), (2, 1)\}$ | they separate $\forall\exists$ from $\exists\forall$ and rows from columns |
| 5 | If nothing breaks it, prove it with the take–unpack–build story | a valid option deserves a two-line argument, not hope |
:::

## Worked examples: valid or not

::::example{#ex-law-easy level="easy" title="Which direction is valid?" depth="quick"}
Is $\forall x\, P(x) \vee \forall x\, Q(x) \to \forall x\, (P(x) \vee Q(x))$ valid? Is its converse?

:::step{why="Forward: take any world where the left side holds; it is one of two cases."}
If every element is $P$, every element is $P \vee Q$; likewise if every element is $Q$. **Valid.**
:::

:::step{why="Converse: try the two-element world."}
$P = \{1\}$, $Q = \{2\}$: $\forall x\, (P \vee Q)$ is T, but $\forall x\, P$ and $\forall x\, Q$ are both F.
:::

:::answer
The forward direction is valid (GATE 1992 option A); the converse is not (options C there, D in 2016).
:::
::::

::::example{#ex-law-medium level="medium" title="∀(P → Q) against ∀P → ∀Q" depth="standard"}
Which of these is valid: (i) $\forall x\, (P \to Q) \to (\forall x\, P \to \forall x\, Q)$; (ii)
$(\forall x\, P \to \forall x\, Q) \to \forall x\, (P \to Q)$; (iii) $(\forall x\, P \leftrightarrow \forall x\, Q) \to
\forall x\, (P \leftrightarrow Q)$?

:::step{why="(i) is row 3 of the one-way table."}
Every element passes the promise; if all are $P$, all are $Q$. **Valid.**
:::

:::step{why="(ii): the left side is vacuous when ∀x P fails; make P fail somewhere but hold at 1, with Q empty."}
$P = \{1\}$, $Q = \varnothing$ on $\{1, 2\}$: $\forall x\, P$ = F, so the left side is T; $P(1) \to Q(1)$ = F, so
the right side is F. **Not valid.**
:::

:::step{why="(iii): make both ∀'s false but P, Q differ."}
$P = \{1\}$, $Q = \{2\}$: both $\forall$'s are F, so their $\leftrightarrow$ is T, but $P(1) \leftrightarrow Q(1)$
is F. **Not valid.**
:::

:::answer
Only (i). (GATE IT 2005 and IT 2007, option B and option A respectively.)
:::
::::

::::example{#ex-law-gate level="gate" title="Pick the NOT valid one" depth="standard"}
Which is NOT valid: (A) $(\forall x\, p \Rightarrow \forall x\, q) \Rightarrow (\exists x\, \neg p \vee \forall x\, q)$;
(B) $(\exists x\, p \vee \exists x\, q) \Rightarrow \exists x\, (p \vee q)$; (C) $\exists x\, (p \wedge q) \Rightarrow
(\exists x\, p \wedge \exists x\, q)$; (D) $\forall x\, (p \vee q) \Rightarrow (\forall x\, p \vee \forall x\, q)$?

:::step{why="A: rewrite the hypothesis without the arrow."}
$\forall x\, p \Rightarrow \forall x\, q \equiv \neg\forall x\, p \vee \forall x\, q \equiv \exists x\, \neg p \vee \forall x\, q$:
the hypothesis **is** the conclusion. Valid.
:::

:::step{why="B is the two-way law ∃ over ∨ (one direction of it); C is row 2 of the one-way table."}
Both valid.
:::

:::step{why="D is ∀ over ∨, refuted by the two-element world."}
$p = \{1\}$, $q = \{2\}$: left T, right F.
:::

:::answer
**D** is not valid (GATE 2016).
:::
::::

::::example{#ex-law-alpha level="gate" title="Laws stated with formulas α and β" depth="standard"}
$\alpha$, $\beta$ have $x$ as their only free variable. Which is valid: (A) $(\forall x\, \alpha \Rightarrow
\forall x\, \beta) \Rightarrow \forall x\, (\alpha \Rightarrow \beta)$; (B) $\forall x\, \alpha \Rightarrow \exists x\, (\alpha
\wedge \beta)$; (C) $(\forall x\, (\alpha \vee \beta) \Rightarrow \exists x\, \alpha) \Rightarrow \forall x\, \alpha$;
(D) $\forall x\, (\alpha \Rightarrow \beta) \Rightarrow (\forall x\, \alpha \Rightarrow \forall x\, \beta)$?

:::step{why="α and β behave like predicates P(x), Q(x): reuse the table."}
D is row 3: **valid**. A is its converse: not valid ($\alpha = \{1\}$, $\beta = \varnothing$).
:::

:::step{why="B: β can be false everywhere."}
$\alpha$ everywhere, $\beta$ nowhere: left T, right F. Not valid.
:::

:::step{why="C: make ∀x α false while the hypothesis is true."}
$\alpha = \{1\}$, $\beta = \varnothing$: $\forall x\, (\alpha \vee \beta)$ is F, so the hypothesis is T; $\forall x\, \alpha$ is F.
:::

:::answer
**D** (GATE 2003).
:::
::::

::::example{#ex-law-tautology level="gate" title="A 'tautology' among quantified formulas" depth="standard"}
Which is valid: (A) $\forall x\, \exists y\, R \leftrightarrow \exists y\, \forall x\, R$; (C) $\forall x\, \exists y\, (P \to R)
\leftrightarrow \forall x\, \exists y\, (\neg P \vee R)$?

:::step{why="A claims ∀∃ and ∃∀ are equivalent; only one direction holds."}
The grid world of Lesson 1 makes $\forall x\, \exists y$ true and $\exists y\, \forall x$ false. Not valid.
:::

:::step{why="C replaces P → R by ¬P ∨ R inside identical quantifiers."}
$P \to R \equiv \neg P \vee R$ holds for every pair, so the two sides agree in every world. Valid.
:::

:::answer
C is valid (GATE 2015 paper 2, published key C; as printed, its option D, $\forall x\, \forall y\, P(x, y) \to
\forall x\, \forall y\, P(y, x)$, is valid too, since both sides say "P holds for every pair").
:::
::::

::::check{#check-laws title="Quick check: one-way or two-way?" depth="quick"}
For each, say "equivalent" or "only →": (a) $\forall x\, (P \wedge Q)$ vs $\forall x\, P \wedge \forall x\, Q$;
(b) $\exists x\, (P \wedge Q)$ vs $\exists x\, P \wedge \exists x\, Q$; (c) $\exists x\, (P \vee Q)$ vs
$\exists x\, P \vee \exists x\, Q$; (d) $\exists y\, \forall x\, R$ vs $\forall x\, \exists y\, R$.

:::answer
(a) equivalent; (b) only → (left implies right); (c) equivalent; (d) only → ($\exists\forall$ implies $\forall\exists$).
:::
::::

:::note{#later-note title="Where these laws come back" depth="standard"}
The one-way laws are not curiosities. In Chapter 3, "$R$ is reflexive or $S$ is reflexive" implies
"$R \cup S$ is reflexive" but not conversely: that is $\forall\varphi \vee \forall\psi \Rightarrow
\forall(\varphi \vee \psi)$ in disguise. In Chapter 5, "every element has an inverse" is a $\forall\exists$
statement, while "there is an identity" is $\exists\forall$, and the order is exactly why the identity must
be found before inverses can be talked about. In Algorithms, "for every input there is a fast
algorithm" and "there is an algorithm fast on every input" differ in the same way.
:::

**Recap.** $\forall$ distributes over $\wedge$ and $\exists$ over $\vee$, both ways. $\forall$ over $\vee$,
$\exists$ over $\wedge$, $\forall(P \to Q)$ vs $\forall P \to \forall Q$ and $\forall\exists$ vs $\exists\forall$
hold in one direction only. The two-element world with $P = \{1\}$, $Q = \{2\}$ refutes the wrong
directions.

## Moving quantifiers past a formula without the variable

:::intuition{#pull-intuition title="A sentence that does not mention x does not care about x" depth="standard"}
Let $W$ be "it is raining", a statement with no $x$ in it. "For every student $x$: $x$ studies, or it is
raining" is the same as "every student studies, or it is raining": if it rains, both are true; if not,
both say every student studies. So $\forall x$ slides past $W$ freely in a disjunction or conjunction.

The surprise comes with implication. "For every $x$: if $x$ is late, the class starts late" is the same as
"if **someone** is late, the class starts late". A $\forall$ around a **hypothesis** turns into an
$\exists$ when it moves inside the hypothesis. The reason is Chapter 1's $p \to q \equiv \neg p \vee q$:
the hypothesis carries a hidden negation, and negation flips the quantifier.
:::

:::theorem{#pull-laws name="Quantifiers past a formula W with no free x" depth="standard"}
If $x$ does not occur free in $W$ (and the domain is non-empty):

| Law | |
|:--|:--|
| $\forall x\, (\varphi \vee W) \equiv \forall x\, \varphi \vee W$ | $\exists x\, (\varphi \vee W) \equiv \exists x\, \varphi \vee W$ |
| $\forall x\, (\varphi \wedge W) \equiv \forall x\, \varphi \wedge W$ | $\exists x\, (\varphi \wedge W) \equiv \exists x\, \varphi \wedge W$ |
| $\forall x\, (W \to \varphi) \equiv W \to \forall x\, \varphi$ | $\exists x\, (W \to \varphi) \equiv W \to \exists x\, \varphi$ |
| $\forall x\, (\varphi \to W) \equiv \exists x\, \varphi \to W$ | $\exists x\, (\varphi \to W) \equiv \forall x\, \varphi \to W$ |

The last row is the one to remember: a quantifier **flips** when it moves into the hypothesis of $\to$.
:::

:::proof{#proof-pull of="the pull-out laws" depth="standard"}
**Idea first:** split on the truth value of $W$, which is the same for every $x$.

If $W$ is true: $\forall x\, (\varphi \vee W)$ is true and so is $\forall x\, \varphi \vee W$; $\forall x\, (\varphi
\wedge W) \equiv \forall x\, \varphi$, matching the right side. If $W$ is false: $\forall x\, (\varphi \vee W)
\equiv \forall x\, \varphi$ and $\forall x\, (\varphi \wedge W)$ is false, matching again. The $\exists$ rows
are the same argument (the $\exists$ $\wedge$ row and the $\exists$ $\vee$ row need the domain non-empty,
for the case where $W$ is true). For the arrow rows, rewrite $\varphi \to W$ as $\neg\varphi \vee W$:
$\forall x\, (\neg\varphi \vee W) \equiv \forall x\, \neg\varphi \vee W \equiv \neg\exists x\, \varphi \vee W \equiv
\exists x\, \varphi \to W$. The other arrow rows follow the same way.
:::

:::viz{#pull-viz spec="pull-past-w" mode="animate" depth="standard"}
:::

:::trap{#trap-pull-flip title="∀x(p(x) → W) is NOT ∀x p(x) → W" depth="quick"}
"For every $x$, if $x$ is late then the class starts late" is not "if everyone is late, the class starts
late". The second is much weaker. GATE 2020 lists $\forall x\, (p(x) \to W) \equiv \forall x\, p(x) \to W$ as
an option and asks which is NOT valid: that one. Its correct partner,
$\exists x\, (p(x) \to W) \equiv \forall x\, p(x) \to W$, is valid.
:::

:::definition{#prenex-def term="Prenex normal form" depth="standard"}
A formula is in **prenex form** when all its quantifiers stand at the front, followed by a
quantifier-free part (the matrix): $Q_1 x_1\, Q_2 x_2 \cdots Q_n x_n\, M$. Every formula has an
equivalent prenex form, obtained by: (1) rewriting $\to$ and $\leftrightarrow$ with $\neg, \wedge, \vee$;
(2) pushing $\neg$ inward (De Morgan for quantifiers); (3) renaming bound variables apart; (4) pulling
the quantifiers out one at a time with the laws above. The prefix tells you the formula's **shape**,
which decides things like the small-model property below ($\exists\cdots\exists\forall\cdots\forall$).
:::

:::viz{#prenex-viz spec="prenex-steps" mode="animate" depth="standard"}
:::

## Worked examples: pulling quantifiers

::::example{#ex-pull-easy level="easy" title="Pulling past W" depth="quick"}
Simplify $\forall x\, (\text{Late}(x) \to \text{Delay})$, where Delay has no $x$.

:::step{why="Rewrite the implication as a disjunction."}
$\forall x\, (\neg\text{Late}(x) \vee \text{Delay}) \equiv \forall x\, \neg\text{Late}(x) \vee \text{Delay}$.
:::

:::step{why="Turn the ∀¬ back into ¬∃ and the disjunction back into an implication."}
$\neg\exists x\, \text{Late}(x) \vee \text{Delay} \equiv \exists x\, \text{Late}(x) \to \text{Delay}$.
:::

:::answer
"If anyone is late, there is a delay": $\exists x\, \text{Late}(x) \to \text{Delay}$.
:::
::::

::::example{#ex-pull-gate level="gate" title="Which pull-out law is NOT valid?" depth="standard"}
$W$ has no free $x$. Which is NOT valid: (A) $\forall x\, (p \vee W) \equiv \forall x\, p \vee W$; (B) $\exists x\, (p
\wedge W) \equiv \exists x\, p \wedge W$; (C) $\forall x\, (p \to W) \equiv \forall x\, p \to W$; (D) $\exists x\, (p \to W)
\equiv \forall x\, p \to W$?

:::step{why="A, B and D are rows of the pull-out table."}
A: $\forall$ past $\vee$. B: $\exists$ past $\wedge$. D: $\exists$ into a hypothesis becomes $\forall$. All valid.
:::

:::step{why="C should have ∃ on the right; test the two-element world with W false."}
$p = \{1\}$ on $\{1, 2\}$, $W$ = F: $\forall x\, (p \to W)$ is F (at $x = 1$); $\forall x\, p \to W$ is F → F = T.
:::

:::answer
**C** (GATE 2020).
:::
::::

::::example{#ex-pull-beta level="gate" title="α(x) and a sentence β" depth="standard"}
$\alpha(x)$ has $x$ free; $\beta$ has no free variable. Which is valid: (A) $[\beta \to \exists x\, \alpha] \to
[\forall x\, (\beta \to \alpha)]$; (B) $[\exists x\, (\beta \to \alpha)] \to [\beta \to \forall x\, \alpha]$; (C)
$[\exists x\, \alpha \to \beta] \to [\forall x\, (\alpha \to \beta)]$; (D) $[\forall x\, \alpha \to \beta] \to
[\forall x\, (\alpha \to \beta)]$?

:::step{why="C: by the table, ∃x α → β is equivalent to ∀x (α → β), so C is A → A."}
Valid.
:::

:::step{why="Refute the others in the world D = {1, 2}, α = {1}."}
A: $\beta$ = T: left T ($\exists x\, \alpha$), right F at $x = 2$. B: $\beta$ = T: left T (witness 1), right
F ($\forall x\, \alpha$ fails). D: $\beta$ = F: left T ($\forall x\, \alpha$ is F), right F at $x = 1$.
:::

:::answer
**C** (GATE IT 2008).
:::
::::

::::example{#ex-pull-not-equiv level="gate" title="Which is NOT equivalent to ¬∃x (∀y α ∧ ∀z β)?" depth="standard"}
Here $\alpha, \beta$ may mention $x$. Abbreviate $P = \forall y\, \alpha$, $Q = \forall z\, \beta$. Compare with
(A) $\forall x\, (\exists z\, \neg\beta \to \forall y\, \alpha)$, (B) $\forall x\, (\forall z\, \beta \to \exists y\, \neg\alpha)$,
(C) $\forall x\, (\forall y\, \alpha \to \exists z\, \neg\beta)$, (D) $\forall x\, (\exists y\, \neg\alpha \to \exists z\, \neg\beta)$.

:::step{why="Push the outer negation in: ¬∃x(P ∧ Q) = ∀x(¬P ∨ ¬Q)."}
Target: for each $x$, "not $P$ or not $Q$".
:::

:::step{why="Translate each option with ∃z¬β = ¬Q and ∃y¬α = ¬P."}
A: $\neg Q \to P \equiv Q \vee P$. B: $Q \to \neg P \equiv \neg P \vee \neg Q$ ✓. C: $P \to \neg Q \equiv \neg P \vee \neg Q$ ✓. D: $\neg P \to \neg Q \equiv P \vee \neg Q$.
:::

:::answer
B and C are equivalent; **both A and D are NOT**. The key recorded for GATE 2013 is D; as printed, the
question has two such options. See the note in its solution.
:::
::::

::::check{#check-pull title="Quick check: pull it out" depth="quick"}
With $W$ free of $x$, rewrite each with the quantifier outermost: (a) $\exists x\, P(x) \to W$;
(b) $W \to \exists x\, P(x)$; (c) $\forall x\, P(x) \to W$.

:::answer
(a) $\forall x\, (P(x) \to W)$ (flips: it left a hypothesis); (b) $\exists x\, (W \to P(x))$ (unchanged: it was in the
conclusion); (c) $\exists x\, (P(x) \to W)$ (flips).
:::
::::

**Recap.** A quantifier slides past a formula without its variable through $\vee$ and $\wedge$
unchanged, but **flips** when it moves into the hypothesis of $\to$: $\forall x\, (p(x) \to W) \equiv
\exists x\, p(x) \to W$. Prenex form puts every quantifier in front, and its prefix is the formula's
shape.

## Open formulas, closures and capture

:::intuition{#open-intuition title="A free variable is an unspoken 'for all'" depth="standard"}
When an algebra book writes $(a + b)^2 = a^2 + 2ab + b^2$, it means "for all $a$ and $b$", although no
quantifier is written. Logic follows the same habit: an **open** formula (one with free variables) is
called valid when it is true for **every** value of its free variables, in every world. So asking
whether $P(x) \to P(x)$ is valid is the same as asking whether $\forall x\, (P(x) \to P(x))$ is. The one
thing that can go wrong is careless substitution, where a free variable gets "captured" by a
quantifier it was never meant to meet.
:::

:::definition{#closure-def term="Universal closure and capture" depth="standard"}
The **universal closure** of a formula $\varphi$ with free variables $x_1, \dots, x_n$ is
$\forall x_1 \cdots \forall x_n\, \varphi$. An open formula is **valid** iff its universal closure is valid,
and **satisfiable** iff its existential closure $\exists x_1 \cdots \exists x_n\, \varphi$ is satisfiable.

**Substitution** $\varphi[t/x]$ replaces the free occurrences of $x$ by the term $t$. It is **safe**
only if no variable of $t$ becomes bound by a quantifier inside $\varphi$; otherwise the variable is
**captured** and the meaning changes. Rename the bound variable first to avoid capture.
:::

:::trap{#trap-capture title="Capture: ∀x ∃y (y ≠ x) with x := y" depth="quick"}
$\exists y\, (y \ne x)$ says "something differs from $x$", true in every domain with two elements. Naively
substituting $y$ for $x$ gives $\exists y\, (y \ne y)$, which is false everywhere: the new $y$ was captured
by $\exists y$. The safe way: rename first, $\exists z\, (z \ne x)$, then substitute: $\exists z\, (z \ne y)$,
"something differs from $y$", the intended meaning.
:::

::::example{#ex-open-valid level="medium" title="Is the open formula P(x) → ∃y P(y) valid?" depth="standard"}
Decide validity of $P(x) \to \exists y\, P(y)$, where $x$ is free.

:::step{why="An open formula is valid iff its universal closure is."}
Consider $\forall x\, (P(x) \to \exists y\, P(y))$.
:::

:::step{why="Take any world and any element a; if P(a) holds, a itself is a witness."}
$P(a)$ gives $\exists y\, P(y)$ with $y = a$; if $P(a)$ fails, the implication is vacuous.
:::

:::answer
**Valid**. (Existential generalisation: from an instance, infer "something".)
:::
::::

::::example{#ex-open-capture level="gate" title="A substitution that changes the meaning" depth="standard"}
$\varphi(x) = \forall y\, (R(x, y) \to R(y, x))$. Compare $\varphi[z/x]$ and the naive $\varphi[y/x]$.

:::step{why="Substituting a fresh variable z is safe: z is not bound in φ."}
$\varphi[z/x] = \forall y\, (R(z, y) \to R(y, z))$: "every $y$ that $z$ relates to relates back to $z$".
:::

:::step{why="Substituting y is unsafe: the new y falls under ∀y."}
Naive result $\forall y\, (R(y, y) \to R(y, y))$, which is valid and says nothing about any particular
element. The free variable has disappeared.
:::

:::answer
$\varphi[z/x]$ keeps the meaning; the naive $\varphi[y/x]$ is captured. Rename the bound $y$ (say to
$w$) before substituting $y$: $\forall w\, (R(y, w) \to R(w, y))$.
:::
::::

**Recap.** Free variables in a validity question are silently universal. Substitute only after
renaming bound variables apart, or a free variable may be captured and the meaning lost.

## Sentences with special models

### A formula true in every world: Russell's barber

:::intuition{#barber-intuition title="The barber who shaves exactly those who do not shave themselves" depth="standard"}
A village barber shaves exactly the villagers who do not shave themselves. Does the barber shave
himself? If yes, he is someone who shaves himself, so he must not; if no, he is someone who does not, so
he must. No such barber can exist. In logic: no $x$ can satisfy $\forall y\, (Q(x, y) \leftrightarrow
\neg Q(y, y))$, **whatever** the relation $Q$ is, because the instance $y = x$ reads
$Q(x, x) \leftrightarrow \neg Q(x, x)$, which is false.
:::

:::theorem{#barber-theorem name="No element 'Q-relates exactly to the non-self-related'" depth="standard"}
For every binary predicate $Q$ and every domain, $\neg\exists x\, \forall y\, (Q(x, y) \leftrightarrow \neg
Q(y, y))$ is valid. Consequently, for every $P$,
$\forall x\, [P(x) \leftrightarrow \forall y\, (Q(x, y) \leftrightarrow \neg Q(y, y))] \to \forall x\, \neg P(x)$
is valid.
:::

:::proof{#proof-barber of="the barber theorem" depth="standard"}
**Idea first:** test the formula on the diagonal.

Suppose some $a$ satisfied $\forall y\, (Q(a, y) \leftrightarrow \neg Q(y, y))$. Take $y = a$: $Q(a, a)
\leftrightarrow \neg Q(a, a)$, which is false in every world. So no $a$ exists: for every $x$ the inner
formula $\forall y\, (\dots)$ is false. Then the hypothesis $\forall x\, [P(x) \leftrightarrow \text{false}]$
says $\forall x\, \neg P(x)$, which is exactly the conclusion. The implication holds in every world.
:::

### Sentences with only infinite models

:::definition{#infinite-def term="A sentence with no finite model" depth="standard"}
Let $\Phi$ be the conjunction of: $\forall x\, \exists y\, R(x, y)$ (every element has a successor),
$\forall x\, \forall y\, (R(x, y) \to \neg R(y, x))$ (asymmetric), $\forall x\, \forall y\, \forall z\,
((R(x, y) \wedge R(y, z)) \to R(x, z))$ (transitive) and $\forall x\, \neg R(x, x)$ (irreflexive). Then
$\Phi$ is **satisfiable** (by $(\mathbb{N}, <)$) but has **no finite model**.
:::

:::proof{#proof-infinite of="no finite model" depth="standard"}
**Idea first:** follow successors; you can never come back, so you never stop.

In any model, start at $d_0$ and pick successors $d_0 R d_1 R d_2 R \cdots$ (the first conjunct). By
transitivity $d_i R d_j$ whenever $i < j$. If two of them were equal, $d_i = d_j$ with $i < j$, then
$d_i R d_i$, contradicting irreflexivity. So the $d_i$ are all distinct: the domain is infinite. And
$(\mathbb{N}, <)$ satisfies each conjunct: every $n$ has $n + 1 > n$; $<$ is asymmetric, transitive and
irreflexive.
:::

:::viz{#chain-viz spec="infinite-chain" mode="animate" depth="standard"}
:::

### Small models: the ∃∀ shape

:::intuition{#small-intuition title="Universal claims survive when you throw elements away" depth="standard"}
"Every guest at this party shook hands with the host" stays true if some guests go home: a universal
claim about a group is still true about any part of it that contains the people the claim mentions. An
existential claim is different: "someone here speaks Tamil" can become false if that person leaves. So
if a sentence first names a few elements with $\exists$ and then makes only universal claims, we can
send everyone else home. The named elements, by themselves, still form a world where the sentence is
true. That is the whole small-model argument.
:::

:::theorem{#small-model-theorem name="∃*∀* sentences have small models" depth="standard"}
Let $\varphi = \exists x_1 \cdots \exists x_k\, \forall y_1 \cdots \forall y_m\, \psi$, with $\psi$ quantifier-free
and using only predicates and equality (no function symbols). If $\varphi$ has any model, it has a model
with **at most $\max(k, 1)$ elements**. So satisfiability of such sentences is decidable: try every
world of size $1$ to $k$.
:::

:::proof{#proof-small-model of="the small-model property" depth="standard"}
**Idea first:** keep only the witnesses; universal statements survive when you remove elements.

Take a model $I$ and witnesses $a_1, \dots, a_k$ for the $\exists$'s. Let $I'$ be the world whose domain is
$\{a_1, \dots, a_k\}$ (at most $k$ elements, as duplicates collapse; if $k = 0$, keep any one element) with every predicate restricted to it.
In $I'$ the same $a_i$ are still available as witnesses. The $\forall y$'s now range over fewer
elements, and each instance $\psi(a_1, \dots, a_k, b_1, \dots, b_m)$ with $b_j \in \{a_1, \dots, a_k\}$ has
the same value in $I'$ as in $I$, because $\psi$ only looks at predicates and equality of those
elements, with no function symbols that could reach outside. All instances were true in $I$, so all
are true in $I'$.
:::

:::trick{#trick-prefix title="Read the prefix before anything else" depth="standard"}
When a question describes a sentence only by its shape ("$\exists s\, \exists t\, \exists u\, \forall v \cdots$, no
function symbols"), the answer is almost always about model sizes, and the prefix decides it. Count the
leading $\exists$'s: that number bounds the smallest model, because the witnesses alone form one. A
leading $\forall$ followed by $\exists$ gives no such bound (the successor sentence $\forall x\, \exists y\,
R(x, y)$ plus a few universal conditions forces infinity). It works because only witnesses of the
outermost $\exists$'s are fixed independently of the rest of the domain. It fails as soon as function
symbols appear: a term like $f(s)$ can name elements outside the witnesses, so the restricted world may
not be closed under $f$.
:::

:::viz{#small-viz spec="small-model" mode="animate" depth="standard"}
:::

### Induction as a first-order axiom

:::intuition{#induction-intuition title="Dominoes, and dominoes that fall the wrong way" depth="standard"}
Line up a domino for each natural number. If the first one falls ($P(0)$) and each falling domino knocks
over the next ($P(x) \to P(x + 1)$), then every domino falls, because each number is reached from 0 by
finitely many steps. Now change either half. Start from domino 1000 and push **backwards**
($P(x) \to P(x - 1)$): dominoes 999, 998, …, 0 fall, but 1001 never moves. Start from domino 1000 and push
**forwards**: everything from 1000 upward falls, but 0 to 999 are untouched. Only "start at the very
beginning and go forwards" covers all of $\mathbb{N}$.
:::

:::definition{#induction-def term="The induction schema" depth="standard"}
Over the natural numbers $\{0, 1, 2, \dots\}$, for every predicate $P$:
$$\big(P(0) \wedge \forall x\, (P(x) \to P(x + 1))\big) \to \forall x\, P(x).$$
It is true because every natural number is reached from 0 by finitely many $+1$ steps (the dominoes
fall in order). Variants that start elsewhere, or step the other way, reach only part of $\mathbb{N}$.
:::

:::derivation{#deriv-induction-variants of="why the variants of induction fail" depth="standard"}
For each wrong variant we exhibit a predicate that satisfies its hypothesis but not $\forall x\, P(x)$.
**Downward from 0:** $P = \{0\}$. $P(0)$ holds; $P(x) \to P(x - 1)$ is vacuous for $x \ge 1$ and, for $x = 0$,
asks only $P(0)$ again (reading $0 - 1$ as 0, or as "no step"). **Downward from 1000:** $P = \{0, \dots,
1000\}$; every true $P(x)$ has $x - 1$ in the set. **Upward from 1000:** $P = \{1000, 1001, \dots\}$; every
true $P(x)$ has $x + 1$ in the set. In all three, $P(1001)$ or $P(0)$ fails. **Sanity check:** for the true
schema, a counterexample would need a least $n$ with $\neg P(n)$; $n \ne 0$, so $P(n - 1)$ holds and the
step gives $P(n)$, a contradiction. That least-element argument is exactly why induction is valid on
$\mathbb{N}$.
:::

### Logic programs as sentences

:::intuition{#horn-intuition title="A rule is a promise about all values of its variables" depth="standard"}
A Prolog-style rule "$x$ is a grandparent if $x$ is a parent of some $y$ and $y$ is a parent" is read by a
computer as: whenever you can find values making the body true, you may conclude the head. A variable
like $y$ that appears only in the body is "some $y$": you only need one. The program as a whole is a
list of such promises, all of which must hold, so the rules are joined by $\wedge$. A rule with no head
says that its body must never become true, which is a negated existential.
:::

:::definition{#horn-def term="Horn clauses and logic programs" depth="standard"}
A logic-program rule $A(x) \leftarrow B(x, y), C(y)$ means "for all $x, y$: if $B(x, y)$ and $C(y)$, then
$A(x)$", i.e. $\forall x\, \forall y\, ((B(x, y) \wedge C(y)) \to A(x))$. Since $y$ occurs only in the
hypothesis, the pull-out law turns $\forall y$ into $\exists y$ there:
$\forall x\, (\exists y\, (B(x, y) \wedge C(y)) \to A(x))$. A headless rule $\leftarrow B(x, x)$ (a goal or
constraint) means "there is no $x$ with $B(x, x)$": $\neg\exists x\, B(x, x)$. A program is the
conjunction of its rules. Each rule is a **Horn clause**: a disjunction of literals with at most one
positive literal ($\neg B \vee \neg C \vee A$).
:::

:::viz{#horn-viz spec="horn-chain" mode="animate" depth="standard"}
:::

## Worked examples: special sentences

::::example{#ex-sp-barber level="gate" title="Two interpretations of a barber formula" depth="standard"}
$\alpha: \forall x\, [P_x \leftrightarrow \forall y\, (Q_{xy} \leftrightarrow \neg Q_{yy})] \to \forall x\, \neg P_x$.
$I_1$: domain $\mathbb{N}$, $P_x$: $x$ is prime, $Q_{xy}$: $y$ divides $x$. $I_2$: the same with $P_x$: $x$ is
composite. Which interpretations satisfy $\alpha$?

:::step{why="The barber theorem says α is valid: true in every interpretation."}
For any $x$, $y = x$ gives $Q_{xx} \leftrightarrow \neg Q_{xx}$, false; so $\forall y\, (\dots)$ is false for every $x$.
:::

:::step{why="Then the hypothesis says ∀x (P_x ↔ F), i.e. ∀x ¬P_x, which is the conclusion."}
In $I_1$ the hypothesis is false (2 is prime, $P_2$ = T but the right side is F), so $\alpha$ is true
vacuously; the same holds in $I_2$ (4 is composite).
:::

:::answer
**Both** satisfy $\alpha$ (GATE 2003, option D). The meanings of $P$ and $Q$ never mattered.
:::
::::

::::example{#ex-sp-infinite level="gate" title="Finite models of the successor formula" depth="standard"}
Does $\Phi$ (every element has an $R$-successor; $R$ asymmetric, transitive, irreflexive) have a finite
model? Is it satisfiable?

:::step{why="Try to close a finite chain: the last element needs a successor somewhere."}
In $\{1, 2, 3\}$ with $1 R 2 R 3$, element 3 needs a successor. Choosing 1 creates the cycle $1 R 2 R 3 R 1$.
:::

:::step{why="Transitivity along the cycle produces a self-loop."}
From $1 R 2$, $2 R 3$ we get $1 R 3$; with $3 R 1$, transitivity gives $1 R 1$, contradicting irreflexivity.
Every finite attempt ends this way.
:::

:::answer
**No finite model; satisfiable** by $(\mathbb{N}, <)$, a countable model (GATE 1991). Our search finds no
model on domains of size 1 to 4, as the proof predicts.
:::
::::

::::example{#ex-sp-small level="gate" title="A model with 7 elements: what else must exist?" depth="standard"}
$\varphi = \exists s\, \exists t\, \exists u\, \forall v\, \forall w\, \forall x\, \forall y\, \psi$ ($\psi$ quantifier-free, predicates
and equality only) has a model with 7 elements. Which is necessarily true: (A) a model of size ≤ 3
exists; (B) no model of size ≤ 3 exists; (C) no model of size > 7 exists; (D) every model has size 7?

:::step{why="Apply the small-model theorem with k = 3."}
Restrict the 7-element model to the witnesses of $s, t, u$: a model of size at most 3. **A** holds.
:::

:::step{why="B, C, D claim facts that a simple ψ refutes."}
Take $\psi$ = $(v = v)$: every non-empty world is a model, of size 1, 7 or 100. So B, C and D can all fail.
:::

:::answer
**A** (GATE 2018).
:::
::::

::::example{#ex-sp-induction level="gate" title="Which 'induction' is sound?" depth="standard"}
Over $\mathbb{N}$, which is true for every $P$: (A) $P(0) \wedge \forall x\, (P(x) \to P(x + 1))$ gives
$\forall x\, P(x)$; (B) $P(0)$ and downward steps; (C) $P(1000)$ and downward steps; (D) $P(1000)$ and
upward steps?

:::step{why="A is the induction schema: every n is reached from 0 by +1 steps."}
Valid.
:::

:::step{why="For each other option, give a P that meets the hypothesis but is not true everywhere."}
B: $P = \{0\}$ (downward steps from 0 go nowhere new). C: $P = \{0, \dots, 1000\}$. D: $P = \{1000, 1001, \dots\}$.
:::

:::answer
**A** (GATE 2025). C proves $P$ only up to 1000, D only from 1000 on.
:::
::::

::::example{#ex-sp-horn level="gate" title="A logic program as a sentence" depth="standard"}
Translate the program $A(x) \leftarrow B(x, y), C(y)$; $\leftarrow B(x, x)$.

:::step{why="A rule is a universally quantified implication from body to head."}
$\forall x\, \forall y\, ((B(x, y) \wedge C(y)) \to A(x))$.
:::

:::step{why="y appears only in the hypothesis: ∀y moves inside as ∃y."}
$\forall x\, (\exists y\, (B(x, y) \wedge C(y)) \to A(x))$.
:::

:::step{why="A headless rule forbids its body; programs are conjunctions."}
$\wedge\ \neg\exists x\, B(x, x)$.
:::

:::answer
$\forall x\, [\exists y\, (B(x, y) \wedge C(y)) \to A(x)] \wedge \neg\exists x\, B(x, x)$ (GATE 2003, option A).
Writing $\forall y$ inside the hypothesis, or $\vee$ between the rules, changes the meaning.
:::
::::

**Recap.** Some sentences are valid for a structural reason (the barber's diagonal), some have only
infinite models (endless successor chains), and $\exists\cdots\exists\forall\cdots\forall$ sentences always
have a model no larger than the number of $\exists$'s. Induction is a valid schema over $\mathbb{N}$, and
logic programs are conjunctions of universally quantified Horn clauses.

## Worked examples: proving laws and converting forms

:::intuition{#proof-shape-intuition title="A validity proof is a short story about an arbitrary world" depth="standard"}
Every validity proof in this lesson has the same three beats. **Take** an arbitrary world in which the
hypothesis is true (you may not choose it). **Unpack** each quantifier in the hypothesis: a $\forall$ you
may apply to any element you like; an $\exists$ hands you a witness you did not choose. **Build** what
the conclusion asks for: for a $\forall$, an arbitrary element; for an $\exists$, a witness you name. If
you ever need to choose something the hypothesis did not give you, the law is probably one-way, and
the counter-model hides exactly there.
:::

::::example{#ex-pf-exists-and level="easy" title="Prove ∃x (P ∧ Q) → ∃x P ∧ ∃x Q" depth="quick"}
Prove the forward direction of row 2 of the one-way table.

:::step{why="Take an arbitrary world where the hypothesis holds; it hands us a witness."}
Let $a$ satisfy $P(a) \wedge Q(a)$.
:::

:::step{why="Use the same witness twice."}
$P(a)$ shows $\exists x\, P(x)$; $Q(a)$ shows $\exists x\, Q(x)$. So both conjuncts of the conclusion hold.
:::

:::answer
Valid. The converse fails because two different witnesses (one for $P$, one for $Q$) need not be the
same element.
:::
::::

::::example{#ex-pf-imp-exists level="medium" title="Prove ∀x (P → Q) → (∃x P → ∃x Q)" depth="standard"}
Prove row 4 of the one-way table, and show the converse fails.

:::step{why="Assume both hypotheses in an arbitrary world: the promise for every element, and a witness of P."}
$\forall x\, (P(x) \to Q(x))$ and $P(a)$ for some $a$.
:::

:::step{why="Apply the universal promise to the witness we were given."}
$P(a) \to Q(a)$ with $P(a)$ gives $Q(a)$, so $\exists x\, Q(x)$.
:::

:::step{why="For the converse, give P and Q different witnesses."}
$P = \{1\}$, $Q = \{2\}$: $\exists x\, P \to \exists x\, Q$ is T → T = T, but $P(1) \to Q(1)$ is F.
:::

:::answer
Valid forward; the converse is not valid.
:::
::::

::::example{#ex-pf-instance level="medium" title="Instantiation: ∀x ∀y R(x, y) → ∀x R(x, x)" depth="standard"}
Prove it, and decide whether $\forall x\, R(x, x) \to \forall x\, \forall y\, R(x, y)$ holds.

:::step{why="A universal may be applied to any elements, including the same element twice."}
Given any $a$, apply $\forall x\, \forall y\, R(x, y)$ with $x = a$, $y = a$: $R(a, a)$. Valid.
:::

:::step{why="The converse would need off-diagonal pairs that the hypothesis never mentions."}
$D = \{1, 2\}$, $R = \{(1, 1), (2, 2)\}$: reflexive, but $R(1, 2)$ is false.
:::

:::answer
Forward valid (universal instantiation); converse not valid.
:::
::::

::::example{#ex-pf-prenex level="gate" title="Prenex form of an implication between quantified formulas" depth="standard"}
Put $\forall x\, P(x) \to \exists x\, Q(x)$ into prenex form.

:::step{why="Rename bound variables apart so pulling out cannot capture anything."}
$\forall x\, P(x) \to \exists y\, Q(y)$.
:::

:::step{why="∀x sits in the hypothesis: pulling it out flips it to ∃x."}
$\exists x\, (P(x) \to \exists y\, Q(y))$.
:::

:::step{why="∃y sits in the conclusion: it comes out unchanged."}
$\exists x\, \exists y\, (P(x) \to Q(y))$.
:::

:::answer
$\exists x\, \exists y\, (P(x) \to Q(y))$, an $\exists^2$ sentence (so by the small-model theorem it is
satisfiable iff it has a model of size ≤ 2). Check on $P$ everywhere, $Q$ nowhere: both forms are F.
:::
::::

::::example{#ex-pf-prenex2 level="gate" title="Prenex form with a negation in front" depth="standard"}
Convert $\neg\exists x\, (P(x) \wedge \forall y\, R(x, y))$ to prenex form.

:::step{why="Push the outer ¬ through ∃x."}
$\forall x\, \neg(P(x) \wedge \forall y\, R(x, y)) \equiv \forall x\, (\neg P(x) \vee \neg\forall y\, R(x, y))$.
:::

:::step{why="Push ¬ through ∀y."}
$\forall x\, (\neg P(x) \vee \exists y\, \neg R(x, y))$.
:::

:::step{why="¬P(x) has no y: pull ∃y out past the ∨ unchanged."}
$\forall x\, \exists y\, (\neg P(x) \vee \neg R(x, y))$.
:::

:::answer
$\forall x\, \exists y\, (\neg P(x) \vee \neg R(x, y))$: "for every $x$, either $x$ is not $P$ or some $y$
breaks $R(x, y)$".
:::
::::

**Recap.** A validity proof takes an arbitrary world, unpacks the hypothesis (apply each $\forall$ as
you like, accept each $\exists$'s witness) and builds the conclusion. Prenex conversion: rename, push
$\neg$ in, pull quantifiers out, flipping them when they leave a hypothesis.

## Controlling the size of a model

:::intuition{#size-intuition title="Equality lets a sentence count the domain" depth="standard"}
Without equality, a sentence cannot tell "one element" from "two identical-looking elements", so it
cannot force a domain to be big or small. With equality it can: "there are two different things" is
$\exists x\, \exists y\, (x \ne y)$, and "everything is the same thing" is $\forall x\, \forall y\, (x = y)$.
These sentences are the building blocks of questions like GATE 2018 and of the counting formulas of
Lesson 1.
:::

:::table{#size-table title="Sentences that control the domain's size" depth="standard"}
| Sentence | Its models |
|:--|:--|
| $\exists x\, \exists y\, (x \ne y)$ | domains with **at least 2** elements |
| $\forall x\, \forall y\, (x = y)$ | domains with **exactly 1** element |
| $\exists x\, \exists y\, \forall z\, (z = x \vee z = y)$ | domains with **at most 2** elements |
| $\exists x\, \exists y\, (x \ne y \wedge \forall z\, (z = x \vee z = y))$ | domains with **exactly 2** elements |
| the successor sentence $\Phi$ | **infinite** domains only |
:::

::::example{#ex-size-atmost level="medium" title="At most two elements" depth="standard"}
Show that $\exists x\, \exists y\, \forall z\, (z = x \vee z = y)$ holds exactly in domains of size 1 or 2.

:::step{why="In a domain of size ≤ 2, name its elements as witnesses (repeat one if there is only one)."}
$\{a\}$: $x = y = a$. $\{a, b\}$: $x = a$, $y = b$. Every $z$ is one of them.
:::

:::step{why="In a domain of size 3 or more, any two witnesses miss a third element."}
Whatever $x, y$ are chosen, some $z$ differs from both, falsifying $\forall z$.
:::

:::answer
Models: exactly the domains of size 1 or 2. It is an $\exists^2\forall$ sentence, and true to the
small-model theorem, its models include one of size ≤ 2.
:::
::::

::::example{#ex-size-sat level="gate" title="Is it satisfiable, and how small can a model be?" depth="standard"}
Decide whether $\exists x\, \exists y\, (x \ne y \wedge P(x) \wedge \neg P(y)) \wedge \forall z\, \forall w\, ((P(z) \wedge P(w)) \to z = w)$ is satisfiable, and give a smallest model.

:::step{why="The first conjunct needs two different elements, one P and one not P."}
At least 2 elements; $P$ true somewhere and false somewhere.
:::

:::step{why="The second conjunct allows at most one element with P."}
$D = \{1, 2\}$, $P = \{1\}$ satisfies both.
:::

:::answer
Satisfiable; a smallest model has **2** elements ($P$ true at exactly one of them). The prefix is
$\exists^2\forall^2$, and 2 is indeed ≤ the number of $\exists$'s.
:::
::::

::::example{#ex-size-unsat level="gate" title="Two size conditions that clash" depth="standard"}
Is $\forall x\, \forall y\, (x = y) \wedge \exists x\, \exists y\, (x \ne y)$ satisfiable?

:::step{why="The first conjunct forces exactly one element."}
Any two elements are equal: $|D| = 1$.
:::

:::step{why="The second needs two different elements."}
$|D| \ge 2$. Both cannot hold.
:::

:::answer
**Unsatisfiable**; its negation is valid. The search over sizes 1 to 3 confirms that no world fits.
:::
::::

**Recap.** With equality a sentence can say "at least $n$", "at most $n$" or "exactly $n$" elements, and
some sentences (like $\Phi$) force infinity. Small-model questions are about which of these a sentence's
shape allows.

## Try it: search for counter-models

Type any law from this lesson into the Lab's **models** tab. It searches every interpretation on
domains of size 1 to 3 and shows the first counter-model it finds (so the formula is not valid), or a
model (so it is satisfiable). Try $(\forall x\, (P(x) \vee Q(x))) \to ((\forall x\, P(x)) \vee (\forall x\, Q(x)))$,
then its converse.

:::lab{#lab-models lab="quantifier-lab" tab="models" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1991-b-15-b" tests="infinite-def,proof-infinite,ex-sp-infinite" depth="standard"}
:::

:::pyq{id="cse-1992-a-2-xv" tests="one-way-laws,trap-distribute,ex-law-easy" depth="standard"}
:::

:::pyq{id="cse-2003-cs-32" tests="one-way-laws,trap-forall-imp,ex-law-alpha" depth="standard"}
:::

:::pyq{id="cse-2003-cs-33" tests="barber-theorem,ex-sp-barber" depth="standard"}
:::

:::pyq{id="cse-2003-cs-71" tests="horn-def,pull-laws,ex-sp-horn" depth="standard"}
:::

:::pyq{id="it-2005-cs-36" tests="one-way-laws,trap-forall-imp,ex-law-medium" depth="standard"}
:::

:::pyq{id="it-2006-cs-21" tests="valid-def,duality-theorem,ex-cls-easy" depth="standard"}
:::

:::pyq{id="it-2007-cs-21" tests="one-way-laws,trick-two-elements,ex-law-medium" depth="standard"}
:::

:::pyq{id="it-2008-it-21" tests="pull-laws,ex-pull-beta" depth="standard"}
:::

:::pyq{id="cse-2013-cs-47" tests="pull-laws,two-way-laws,ex-pull-not-equiv" depth="standard"}
:::

:::pyq{id="cse-2015-2-cs-55" tests="one-way-laws,ex-law-tautology" depth="standard"}
:::

:::pyq{id="cse-2016-2-cs-27" tests="trap-distribute,ex-law-gate" depth="standard"}
:::

:::pyq{id="cse-2017-1-cs-2" tests="valid-def,one-way-laws,ex-cls-implied" depth="standard"}
:::

:::pyq{id="cse-2018-cs-28" tests="small-model-theorem,ex-sp-small" depth="standard"}
:::

:::pyq{id="cse-2020-cs-39" tests="pull-laws,trap-pull-flip,ex-pull-gate" depth="standard"}
:::

:::pyq{id="cse-2025-2-cs-5" tests="induction-def,ex-sp-induction" depth="standard"}
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

## Summary

:::summary{#summary-card title="Quantifier laws and validity on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Interpretation | non-empty domain + a meaning (set of tuples) for every predicate |
| Valid / satisfiable / unsatisfiable | true in every / some / no interpretation; $\varphi$ valid iff $\neg\varphi$ unsatisfiable |
| Prove valid | an argument for an arbitrary world |
| Refute validity | one counter-model; try $D = \{1, 2\}$, $P = \{1\}$, $Q = \{2\}$ |
| Two-way laws | $\forall$ over $\wedge$; $\exists$ over $\vee$; De Morgan; same quantifiers commute; rename bound variables |
| One-way laws | $\forall\varphi \vee \forall\psi \Rightarrow \forall(\varphi \vee \psi)$; $\exists(\varphi \wedge \psi) \Rightarrow \exists\varphi \wedge \exists\psi$; $\forall(\varphi \to \psi) \Rightarrow (\forall\varphi \to \forall\psi)$; $\exists\forall \Rightarrow \forall\exists$ |
| Pull past $W$ (no free $x$) | unchanged through $\vee, \wedge$ and the conclusion of $\to$; **flips** in the hypothesis: $\forall x(p \to W) \equiv \exists x\, p \to W$ |
| Barber | $\neg\exists x\, \forall y\, (Q(x, y) \leftrightarrow \neg Q(y, y))$ is valid |
| Infinite-only | serial + transitive + irreflexive has no finite model; $(\mathbb{N}, <)$ is a model |
| $\exists^k\forall^*$ | a model exists iff one of size ≤ $k$ exists (no function symbols) |
| Induction | $P(0) \wedge \forall x (P(x) \to P(x+1)) \to \forall x\, P(x)$ over $\mathbb{N}$ |
| Horn rule | $A(x) \leftarrow B(x, y), C(y)$ = $\forall x (\exists y (B \wedge C) \to A(x))$; $\leftarrow B$ = $\neg\exists B$ |
:::

## Common mistakes

- Distributing $\forall$ over $\vee$ or $\exists$ over $\wedge$ (in the wrong direction).
- Treating $\forall x\, (P \to Q)$ and $\forall x\, P \to \forall x\, Q$ as equivalent.
- Pulling $\forall x$ out of a hypothesis without flipping it to $\exists x$.
- Believing a finite search proves validity.
- Forgetting the non-empty-domain convention (it is what makes $\forall \Rightarrow \exists$ valid).
- Reading a logic-program rule's body variable as universal inside the hypothesis.

:::note{#further-depth title="Further depth: complete, but not decidable" depth="deep"}
Gödel's completeness theorem (1929) says every valid first-order formula has a proof in a standard
proof system, so "valid" and "provable" coincide. Yet Church and Turing (1936) showed there is **no
algorithm** that decides validity for all first-order formulas: you can list all proofs and will
eventually find one if the formula is valid, but if it is not valid the search may never end (its
counter-models may all be infinite, as for the negation of $\Phi$ above). Fragments like the
$\exists^*\forall^*$ sentences are decidable precisely because of small-model properties. Theory of
Computation proves the general undecidability with the halting problem.
:::
