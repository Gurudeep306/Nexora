---
id: quantifier-laws-validity
subject: dm
chapter: predicate-logic
title: Quantifier laws, validity and models
order: 2
prerequisites: [predicates-quantifiers]
pyq_topics: [dm/logic]
est_minutes: 70
difficulty: advanced
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every counter-model, law instance, prenex form, model-size claim, PYQ key and practice answer is recomputed in content/gate-notes/_checks/dm/l2_02_validity.py with predlib.py (validity claims are proved in the text and searched up to size 3)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 37–43, set B pp. 172–177, set C pp. 311–318 and 326–328, set D pp. 679–681. Set A's empty-domain slip (pp. 28/31, 42) and set D p. 677 (closed QBF vs FOL) are in _errata/dm.md."
  - "Facts checked against standard textbooks: K. H. Rosen, Discrete Mathematics and its Applications (quantifier laws, prenex form); H. B. Enderton, A Mathematical Introduction to Logic (interpretations, validity, substructures, small models of ∃*∀* sentences)."
  - "PYQs: src/gate/questions.json (dm/logic); all sixteen keys are re-derived in l2_02_validity.py. As printed, 2013 and 2015 each have a second correct option; the solutions say so."
updated: "2026-10-23"
---

[Lesson 1](lesson:predicates-quantifiers) taught you to read and write first-order sentences: what
$\forall$ and $\exists$ mean, how to translate English, how to push a negation through a row of
quantifiers. This lesson asks the question GATE asks most often about such sentences: **is it always
true?** "Which of the following is valid", "which is NOT logically equivalent", "which sentences are
implied by $F$": sixteen previous-year questions, nearly all of them two-mark, reduce to that one
question.

In propositional logic the question was easy in principle: a formula has finitely many rows, so you
check them all. In first-order logic there is no finite table. A sentence can be read in infinitely
many **interpretations** (choose any non-empty domain, any meaning for each predicate), and "valid"
means true in every one of them. So we need two tools that work together. To show a sentence is **not**
valid, build one small interpretation that makes it false: a **counter-model**, usually on a domain of
two elements. To show a sentence **is** valid, give a short **proof** that works for every domain. The
quantifier laws are the proofs we use so often that we memorise them; the counter-models are the
reasons the other laws, the ones that only go one way, cannot be reversed.

The last third of the lesson covers the unusual questions: a sentence that is satisfiable but has no
finite model (GATE 1991), a sentence that is valid because of a diagonal trick (GATE 2003), logic
programs written as sentences (GATE 2003), induction (GATE 2025) and a sentence class whose models can
always be shrunk to a few elements (GATE 2018).

## Where this fits

You need [Lesson 1](lesson:predicates-quantifiers) of this chapter: predicates, the meaning of
$\forall$ and $\exists$, free and bound variables, and negation of quantifiers. From Chapter 1 you need
the vocabulary of [tautologies, satisfiability and equivalence](lesson:equivalence-normal-forms) (valid,
satisfiable, unsatisfiable, $\equiv$) and the habit, from [inference and
resolution](lesson:inference-resolution), of refuting a claim by exhibiting one situation where it
fails. Everything here is the first-order version of those ideas: a "row" becomes an
interpretation, and "check all rows" becomes "prove it, or find a counter-model". Later chapters use
the quantifier laws constantly: the definitions of reflexive, transitive, injective, onto and so on are
all quantified sentences, and negating or simplifying them uses exactly the laws below.

:::table{#radar title="GATE radar: quantifier laws, validity and models" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 16 (1991–2025) |
| Marks | 2 one-mark, 12 two-mark, 1 descriptive (5 marks), 1 unmarked multi-select |
| Pattern 1 | Which formula is (or is NOT) valid, built from the one-way laws: 1992, 2003 (Q32), IT 2005, IT 2007, 2016 |
| Pattern 2 | Equivalences and moving a quantifier past a formula without $x$: IT 2008, 2013, 2015, 2020 |
| Pattern 3 | Swapping $\forall$ and $\exists$; what $\forall x \exists y R$ implies: IT 2007, 2015, 2017 |
| Pattern 4 | Satisfiable / valid / models: IT 2006, 1991 (only infinite models), 2003 (Q33, a Russell-style formula), 2018 (small models) |
| Pattern 5 | Logic programs and induction as sentences: 2003 (Q71), 2025 |
| What examiners test | That $\forall$ distributes over $\wedge$ but not over $\vee$ (and $\exists$ the other way round), that a quantifier flips when it moves out of the **hypothesis** of an implication, that $\exists\forall \Rightarrow \forall\exists$ but not conversely, and that a two-element domain refutes every wrong law |
:::

## Interpretations, models and validity

:::intuition{#world-intuition title="A sentence is a question you ask of a world" depth="standard"}
"$\forall x \exists y\, R(x, y)$" means nothing until someone tells you **what $x$ ranges over** and
**what $R$ is**. Over the people in a room with $R$ = "is sitting next to", it may well be true; over
the integers with $R$ = "is greater than or equal to the square of", it is false (take $x = -1$: no
integer $y$ has $-1 \ge y^2$). The sentence is the same string of symbols; the **world** changed. A
world in which we can evaluate the sentence is called an interpretation.

So in first-order logic a sentence is not simply true or false. It is true in some worlds and false in
others, exactly like a propositional formula is true on some rows and false on others. The three
propositional verdicts come back: true in **every** world (valid), true in **some** world
(satisfiable), true in **no** world (unsatisfiable). The difference is that there are infinitely many
worlds, so we cannot list them; we have to reason about all of them at once, or find the one that
breaks the claim.
:::

:::definition{#interp-def term="Interpretation (structure) and truth in it" depth="quick"}
An **interpretation** $I$ of a formula consists of

1. a **non-empty** set $D$, the domain (universe);
2. for each predicate symbol of arity $n$, a set of $n$-tuples from $D$: the tuples for which it is
   true (for arity 0, simply T or F);
3. if the formula has free variables, a value in $D$ for each of them.

The value of a formula in $I$ is computed from the inside out, as in Lesson 1: an atom $R(a, b)$ is
true when $(a, b)$ is in the set chosen for $R$; connectives use their truth tables; $\forall x\, A$ is
true when $A$ is true for **every** value of $x$ in $D$, and $\exists x\, A$ when it is true for **at
least one**. If $A$ is true in $I$ we say $I$ **satisfies** $A$, or $I$ is a **model** of $A$, written
$I \models A$. A sentence (no free variables) has exactly one truth value in each interpretation.

Two conventions of this chapter are used throughout: domains are **never empty**, and a quantifier binds
as tightly as $\neg$, so $\forall x\, P(x) \to Q(x)$ means $(\forall x\, P(x)) \to Q(x)$. GATE options
always bracket the scope they mean.
:::

:::definition{#validity-def term="Valid, satisfiable, unsatisfiable, implies, equivalent" depth="quick"}
| Word | Meaning | How to show it |
|:--|:--|:--|
| **valid** (logically true) | true in **every** interpretation | a proof for an arbitrary domain |
| **satisfiable** | true in **at least one** interpretation | exhibit one model |
| **unsatisfiable** | true in **no** interpretation | a proof that any model leads to a contradiction |
| **not valid** (falsifiable) | false in at least one interpretation | exhibit one counter-model |
| $A$ **implies** $B$ ($A \models B$) | every model of $A$ is a model of $B$ | prove $A \to B$ valid |
| $A \equiv B$ | same value in every interpretation | prove $A \leftrightarrow B$ valid |

A sentence that is satisfiable and whose negation is also satisfiable is **contingent**: true in some
worlds, false in others. That is the first-order "contingency" of Chapter 1, and GATE words it as
"satisfiable and so is its negation".
:::

:::theorem{#validity-theorem name="The bridges between the verdicts" depth="standard"}
For any sentences $A$ and $B$:

1. $A$ is valid if and only if $\neg A$ is unsatisfiable.
2. $A \models B$ if and only if $A \to B$ is valid, if and only if $A \wedge \neg B$ is unsatisfiable.
3. If a propositional tautology has its variables replaced by first-order sentences (each variable by
   the same sentence everywhere), the result is valid. For example $\forall x\, P(x) \vee \neg \forall x\, P(x)$
   is valid, and so is $\big(\forall x (P(x) \to Q(x))\big) \leftrightarrow \big(\forall x (\neg P(x) \vee Q(x))\big)$,
   because $P(x) \to Q(x) \equiv \neg P(x) \vee Q(x)$ holds for every value of $x$.
:::

:::proof{#proof-validity-bridges of="the bridges between the verdicts" depth="standard"}
**Idea first:** in each fixed interpretation a sentence is just T or F, so the propositional facts of
Chapter 1 apply world by world.

(1) $A$ is true in every interpretation exactly when $\neg A$ is false in every interpretation, i.e. has
no model. (2) $A \to B$ is false in $I$ exactly when $A$ is true and $B$ false in $I$; so "$A \to B$
true everywhere" says "no world has $A$ without $B$", which is $A \models B$, and that is the same as
"$A \wedge \neg B$ has no model". (3) Fix any interpretation. Each substituted sentence has a truth value
there, so the whole formula takes the value of the tautology on one of its rows, which is T. For the
second example, inside the quantifier the two bodies agree for every value of $x$, so the two
$\forall$-sentences agree in every interpretation. **Sanity check:** (1) with $A = \forall x (P(x) \vee \neg P(x))$:
valid, and $\neg A \equiv \exists x (\neg P(x) \wedge P(x))$ clearly has no model.
:::

:::theorem{#finite-search-theorem name="What a search over small domains can and cannot tell you" depth="standard"}
A counter-model on a domain of any size, finite or not, proves that a sentence is **not valid**. But if
no interpretation on domains of size $1, 2, \dots, k$ falsifies a sentence, the sentence may still be
**not valid**: some sentences are false only in infinite domains. Likewise "no model up to size $k$" does
not mean unsatisfiable.
:::

:::proof{#proof-finite-search of="the limits of a finite search" depth="standard"}
**Idea first:** one bad world is enough to refute "true everywhere", but no finite list of good worlds
covers "everywhere".

The first sentence is the definition of "not valid". For the second, it is enough to exhibit one
sentence. The GATE 1991 sentence $\varphi$ (a relation that is serial, asymmetric, transitive and
irreflexive), studied later in this lesson, has a model (the natural numbers with $<$) but **no finite
model at all**. So $\neg\varphi$ is true in every finite interpretation of every size, yet it is not valid
because $(\mathbb{N}, <)$ falsifies it. In practice this means: for GATE options, a two- or
three-element counter-model settles "not valid"; "valid" needs one of the proofs below.
:::

:::viz{#search-viz spec="qlaw-countermodel-search" mode="animate" depth="standard"}
:::

:::trap{#trap-empty-domain title="∀x P(x) → ∃x P(x) needs a non-empty domain" depth="quick"}
$\forall x\, P(x) \to \exists x\, P(x)$ is valid **because** domains are non-empty: pick any element $a$;
$P(a)$ holds by the hypothesis, so $a$ witnesses $\exists x\, P(x)$. Over an empty domain every
$\forall$-sentence would be vacuously true and every $\exists$-sentence false, and the implication would
fail. Some books evaluate quantifiers over an empty set without warning; GATE, and this subject, assume
non-empty domains (GATE 2017 says so explicitly). The same assumption is behind $\exists x\,(W \to P(x))
\equiv W \to \exists x\, P(x)$ later in this lesson.
:::

:::trap{#trap-one-model title="True in one interpretation is not valid" depth="quick"}
"The sentence is true in the natural numbers, so it is valid" is the classic wrong step. Validity is a
claim about **every** domain and **every** meaning of the predicates. For a closed propositional formula
with quantified Boolean variables (a "QBF"), the value is fixed, so there "true" and "valid" coincide;
for first-order sentences with predicate symbols they do not. GATE IT 2006 is exactly this: a symmetric
relation exists, a non-symmetric one exists, so the sentence is neither valid nor unsatisfiable.
:::

:::trick{#trick-two-element title="Two elements, split the predicates" depth="standard"}
To refute a proposed law about $P$ and $Q$, take $D = \{0, 1\}$ and try the split $P = \{0\}$,
$Q = \{1\}$ (each element has exactly one property), or $P = \{0\}$, $Q = \varnothing$. For a binary $R$,
try a "cycle" $R = \{(0, 1), (1, 0)\}$ or a "column" $R = \{(0, 0), (1, 0)\}$.

**Why it works:** every wrong law in this lesson confuses "each element has the property" with "one
element has it for everybody", or "for each, some" with "some, for each". Two elements are the least that
can tell those apart. **When it fails:** sentences with three nested quantifiers or with transitivity
sometimes need three elements (a 3-cycle), and some need infinitely many (GATE 1991). If two elements do
not work after a sensible try, attempt a proof instead.
:::

:::note{#recap-validity title="Recap" depth="quick"}
An interpretation = non-empty domain + meanings for the predicates (+ values for free variables). Valid =
true in all, satisfiable = true in one, unsatisfiable = true in none; $A \models B$ iff $A \to B$ is valid.
A counter-model refutes validity; only a proof establishes it.
:::

### Worked examples: interpretations and verdicts

::::example{#ex-val-easy level="easy" title="Evaluating in a three-element world" depth="quick"}
$D = \{0, 1, 2\}$ and $R = \{(0, 1), (1, 2), (2, 0)\}$ (each element points to the next, cyclically).
Evaluate $\forall x \exists y\, R(x, y)$, $\exists y \forall x\, R(x, y)$ and $\forall x\, \neg R(x, x)$.

:::step{why="∀x∃y asks, for each x separately, for some y with R(x, y): look at each element's outgoing pairs."}
$x = 0$: $y = 1$ works. $x = 1$: $y = 2$. $x = 2$: $y = 0$. Every $x$ has a partner, so
$\forall x \exists y\, R(x, y)$ is **true**.
:::

:::step{why="∃y∀x asks for one y that every x points to: a y with three incoming pairs."}
Each element has exactly one incoming pair, so no $y$ is pointed to by all three. $\exists y \forall x\, R(x, y)$
is **false**.
:::

:::step{why="∀x ¬R(x, x) asks that no pair is a loop (x, x)."}
None of $(0, 0), (1, 1), (2, 2)$ is in $R$: **true**.
:::

:::answer
T, F, T. The first two sentences differ only in the order of the quantifiers, and this one interpretation
already separates them.
:::
::::

::::example{#ex-val-medium level="medium" title="Satisfiable, and so is its negation (GATE IT 2006)" depth="standard"}
Classify $\forall x \forall y\,(R(x, y) \to R(y, x))$: valid, unsatisfiable, or neither?

:::step{why="Read the sentence: whenever R relates x to y it also relates y to x. That is 'R is symmetric'."}
The sentence says $R$ is **symmetric**.
:::

:::step{why="To show satisfiable, exhibit one model."}
$D = \{0\}$, $R = \varnothing$: there are no pairs, so every implication $R(x, y) \to \dots$ has a false
hypothesis. True. So the sentence is **satisfiable**.
:::

:::step{why="To show not valid, exhibit a counter-model: a relation that is not symmetric."}
$D = \{0, 1\}$, $R = \{(0, 1)\}$: for $x = 0, y = 1$ the hypothesis holds and $R(1, 0)$ fails. False. So the
**negation** is satisfiable too.
:::

:::answer
Neither valid nor unsatisfiable: the sentence is satisfiable **and so is its negation** (contingent).
:::
::::

::::example{#ex-val-gate level="gate" title="Three sentences, three verdicts" depth="standard"}
Classify (i) $\forall x\, R(x, x) \to \exists x \exists y\, R(x, y)$, (ii) $\forall x \exists y\, R(x, y) \to \exists x\, R(x, x)$,
(iii) $\exists x\,(P(x) \wedge \forall y\, \neg P(y))$.

:::step{why="(i) looks valid. Prove it for an arbitrary non-empty domain."}
Pick any element $a$ (the domain is non-empty). If $\forall x\, R(x, x)$ holds then $R(a, a)$ holds, so $x = y = a$
witnesses $\exists x \exists y\, R(x, y)$. (i) is **valid**.
:::

:::step{why="(ii) claims that a serial relation must have a loop. Try to break it with two elements and a cycle."}
$D = \{0, 1\}$, $R = \{(0, 1), (1, 0)\}$: everyone has a successor, nobody points to itself. Hypothesis T,
conclusion F. (ii) is **not valid**; it is satisfiable (any $R$ with a loop is a model).
:::

:::step{why="(iii) asks for an x with P(x) while every y lacks P. Instantiate the ∀ at the witness itself."}
If $a$ is the witness, $P(a)$ holds and $\forall y\, \neg P(y)$ gives $\neg P(a)$. Contradiction in every
interpretation: (iii) is **unsatisfiable**.
:::

:::answer
(i) valid, (ii) contingent (satisfiable, not valid), (iii) unsatisfiable. Notice the two proof moves:
"pick an element" (uses non-emptiness) and "instantiate a $\forall$ at the witness of an $\exists$".
:::
::::

::::example{#ex-val-edge level="gate" title="Edge case: what the empty domain would break" depth="standard"}
Show that $\forall x\, P(x) \to \exists x\, P(x)$ is valid over non-empty domains, and explain what goes
wrong if the domain may be empty.

:::step{why="Non-empty: some element a exists. Use it as the witness."}
If $\forall x\, P(x)$ is true then $P(a)$ is true, so $\exists x\, P(x)$ is true. If $\forall x\, P(x)$ is false,
the implication is true anyway. Valid.
:::

:::step{why="Empty domain: ∀ over nothing is vacuously true, ∃ over nothing is false."}
With $D = \varnothing$, $\forall x\, P(x)$ = T and $\exists x\, P(x)$ = F, so the implication is T → F = **F**.
:::

:::answer
Valid under the standard non-empty convention; it would fail on an empty domain. That is why GATE states
"assuming non-empty domains" when it matters, and why $\forall \Rightarrow \exists$ is in the table of one-way
laws below.
:::
::::

## The two-way laws: what always equals what

:::intuition{#big-and-intuition title="∀ is a long AND, ∃ is a long OR" depth="standard"}
On a finite domain $\{a, b, c\}$, "$\forall x\, P(x)$" says exactly "$P(a) \wedge P(b) \wedge P(c)$" and
"$\exists x\, P(x)$" says "$P(a) \vee P(b) \vee P(c)$". Once you see that, the quantifier laws are just
the laws of $\wedge$ and $\vee$ from Chapter 1, stretched over the domain. An AND of ANDs can be regrouped
freely, so $\forall$ distributes over $\wedge$. An OR of ORs can be regrouped freely, so $\exists$
distributes over $\vee$. De Morgan turns the negation of a long AND into a long OR of negations, so
$\neg\forall = \exists\neg$.

What does **not** regroup is a mixture: an AND of ORs is not an OR of ANDs. That is where the one-way
laws of the next section come from. The picture works for infinite domains too: the proofs below never
use finiteness, only "every element" and "some element".
:::

:::definition{#expansion-def term="Finite expansion of a quantifier" depth="quick"}
Over a domain $D = \{a_1, \dots, a_n\}$:
$$\forall x\, A(x) \equiv A(a_1) \wedge \dots \wedge A(a_n), \qquad \exists x\, A(x) \equiv A(a_1) \vee \dots \vee A(a_n).$$
A sentence over a domain of $n$ elements is therefore a propositional formula in the atoms $P(a_i)$,
$R(a_i, a_j)$, … This is exactly what a counter-model search enumerates: every truth assignment to those
atoms.
:::

:::viz{#expansion-viz spec="qlaw-expansion" mode="animate" depth="standard"}
:::

:::definition{#two-way-laws term="The quantifier equivalences" depth="standard"}
For any formulas $A$, $B$ (which may contain $x$ free):

| # | Law | Name |
|:-:|:--|:--|
| 1 | $\neg\forall x\, A \equiv \exists x\, \neg A$, $\quad\neg\exists x\, A \equiv \forall x\, \neg A$ | De Morgan for quantifiers |
| 2 | $\forall x\,(A \wedge B) \equiv \forall x\, A \wedge \forall x\, B$ | $\forall$ distributes over $\wedge$ |
| 3 | $\exists x\,(A \vee B) \equiv \exists x\, A \vee \exists x\, B$ | $\exists$ distributes over $\vee$ |
| 4 | $\exists x\,(A \to B) \equiv \forall x\, A \to \exists x\, B$ | from 1 and 3 |
| 5 | $\forall x \forall y\, A \equiv \forall y \forall x\, A$, $\quad \exists x \exists y\, A \equiv \exists y \exists x\, A$ | like quantifiers commute |
| 6 | $\forall x\, A(x) \equiv \forall y\, A(y)$ (and the same for $\exists$), $y$ not occurring in $A$ | renaming a bound variable |
| 7 | $\forall x\, A \equiv \forall x\, A'$ whenever $A \equiv A'$ propositionally | replacement inside a quantifier |

Law 7 is what makes GATE 2015 option (C) valid: $P \to R$ and $\neg P \vee R$ are the same column, so
quantifying both the same way gives the same sentence.
:::

:::theorem{#two-way-theorem name="The quantifier equivalences hold" depth="standard"}
Each line of the table is valid as a biconditional, on every non-empty domain, finite or infinite.
:::

:::proof{#proof-two-way of="the quantifier equivalences" depth="standard"}
**Idea first:** fix an interpretation and read each side in words; the words say the same thing.

(1) "Not every element satisfies $A$" is the same as "some element fails $A$". The second form follows by
applying the first to $\neg A$ and negating both sides. (2) "Every element satisfies $A$ and $B$" holds iff
"every element satisfies $A$" and "every element satisfies $B$": both say that no element fails either
one. (3) "Some element satisfies $A$ or $B$": that element satisfies $A$ (so $\exists x A$) or it satisfies $B$
(so $\exists x B$); conversely a witness for either disjunct is a witness for $A \vee B$. (4)
$\exists x (A \to B) \equiv \exists x (\neg A \vee B) \equiv \exists x\, \neg A \vee \exists x\, B$ by (3), and
$\exists x\, \neg A \equiv \neg\forall x\, A$ by (1), so the whole is $\neg \forall x\, A \vee \exists x\, B$, which is
$\forall x\, A \to \exists x\, B$. (5) Both sides say "every pair $(x, y)$" (or "some pair"). (6) The name of
a bound variable is a placeholder; changing it everywhere, without capturing another variable, does not
change which elements are tested. (7) If the bodies agree for every value of $x$, the quantified sentences
agree.

**Sanity check** on $D = \{0, 1\}$, $P = \{0\}$, $Q = \{1\}$: $\exists x (P(x) \vee Q(x))$ is T, and
$\exists x\, P(x) \vee \exists x\, Q(x)$ is T ∨ T = T. $\forall x (P(x) \wedge Q(x))$ is F, and $\forall x\, P(x) \wedge \forall x\, Q(x)$
is F ∧ F = F. Both laws agree, as they must.
:::

:::trick{#trick-and-or title="∀ goes with ∧, ∃ goes with ∨" depth="standard"}
Remember one pairing: **$\forall$ distributes over $\wedge$, $\exists$ over $\vee$**, both ways. Every
other distribution (∀ over ∨, ∃ over ∧, either over →) holds in **one direction only** or not at all.

**Why it works:** a long AND inside a long AND regroups; a long OR inside a long OR regroups (the
expansion above). **When it fails:** as soon as the connective inside differs from the one the quantifier
stands for. And law 4 shows the trap in reverse: $\exists$ over $\to$ is an equivalence, but the
quantifier on the **hypothesis** turns into $\forall$, because a hypothesis is secretly negated
($A \to B \equiv \neg A \vee B$).
:::

:::note{#recap-two-way title="Recap" depth="quick"}
$\neg\forall = \exists\neg$, $\neg\exists = \forall\neg$; $\forall$ over $\wedge$ and $\exists$ over $\vee$ are
equivalences; $\exists x (A \to B) \equiv \forall x A \to \exists x B$; like quantifiers commute; bound
variables can be renamed; equivalent bodies give equivalent sentences.
:::

### Worked examples: the equivalences

::::example{#ex-two-easy level="easy" title="Negating a nested sentence" depth="quick"}
Write $\neg\forall x\,\big(P(x) \to \exists y\, Q(x, y)\big)$ with every $\neg$ on an atom.

:::step{why="De Morgan for quantifiers moves the ¬ past ∀ and flips it to ∃."}
$\exists x\, \neg\big(P(x) \to \exists y\, Q(x, y)\big)$.
:::

:::step{why="¬(A → B) ≡ A ∧ ¬B: a broken promise has a true hypothesis and a false conclusion."}
$\exists x\,\big(P(x) \wedge \neg\exists y\, Q(x, y)\big)$.
:::

:::step{why="De Morgan again: ¬∃y becomes ∀y¬."}
$\exists x\,\big(P(x) \wedge \forall y\, \neg Q(x, y)\big)$.
:::

:::answer
$\exists x\,\big(P(x) \wedge \forall y\, \neg Q(x, y)\big)$: "some $P$ is related by $Q$ to nothing".
:::
::::

::::example{#ex-two-medium level="medium" title="∃ over an implication" depth="standard"}
Show $\exists x\,(P(x) \to Q(x)) \equiv \forall x\, P(x) \to \exists x\, Q(x)$, and check it on $D = \{0, 1\}$,
$P = D$, $Q = \varnothing$.

:::step{why="Remove the arrow inside, so that the body is a disjunction (the connective ∃ distributes over)."}
$\exists x\,(\neg P(x) \vee Q(x)) \equiv \exists x\, \neg P(x) \vee \exists x\, Q(x)$ (law 3).
:::

:::step{why="De Morgan turns ∃¬ back into ¬∀, and ¬A ∨ B is A → B."}
$\neg\forall x\, P(x) \vee \exists x\, Q(x) \equiv \forall x\, P(x) \to \exists x\, Q(x)$.
:::

:::step{why="Sanity check in the given world: P holds everywhere, Q nowhere."}
Left: is there an $x$ with $P(x) \to Q(x)$? Both elements give T → F = F. Left = **F**. Right: T → F = **F**.
They agree.
:::

:::answer
The equivalence holds, and the quantifier on the hypothesis becomes $\forall$. (Writing
$\exists x\, P(x) \to \exists x\, Q(x)$ on the right would be wrong: in the world $P = \{0\}$, $Q = \varnothing$,
$D = \{0, 1\}$ the left is true (take $x = 1$) and that right side is false.)
:::
::::

::::example{#ex-two-gate level="gate" title="Which one is NOT equivalent? (GATE 2013)" depth="standard"}
Abbreviate $P = \forall y\,\alpha$ and $Q = \forall z\,\beta$. Which of
(A) $\forall x(\exists z\neg\beta \to \forall y\,\alpha)$, (B) $\forall x(\forall z\,\beta \to \exists y \neg\alpha)$,
(C) $\forall x(\forall y\,\alpha \to \exists z\neg\beta)$, (D) $\forall x(\exists y\neg\alpha \to \exists z\neg\beta)$
is not equivalent to $\neg\exists x(\forall y\,\alpha \wedge \forall z\,\beta)$?

:::step{why="Push the outer ¬ in with De Morgan: ¬∃x becomes ∀x¬, then ¬(P ∧ Q) is ¬P ∨ ¬Q."}
Given $\equiv \forall x\,(\neg P \vee \neg Q)$, where $\neg P \equiv \exists y\,\neg\alpha$ and $\neg Q \equiv \exists z\,\neg\beta$.
:::

:::step{why="Rewrite every option as ∀x(disjunction) using X → Y ≡ ¬X ∨ Y; then compare the disjunctions."}
(A) $\neg\neg Q \vee P = Q \vee P$. (B) $\neg Q \vee \neg P$. (C) $\neg P \vee \neg Q$. (D) $\neg\neg P \vee \neg Q = P \vee \neg Q$.
:::

:::step{why="B and C match the given disjunction; A and D do not. Confirm with one world for D."}
Take a world (for some $x$) with $P$ false and $Q$ true: the given body $\neg P \vee \neg Q$ is T; (D)'s body
$P \vee \neg Q$ is F. For (A) take $P$, $Q$ both false: given T, (A) F.
:::

:::answer
(D) is not equivalent, and the answer key is (D). As printed, (A) is **also** not equivalent
($Q \vee P$ instead of $\neg Q \vee \neg P$); the paper most likely had a misprint in (A). Under exam
conditions, choose the option the rewriting kills first, and note that B and C are the contrapositive pair.
:::
::::

::::example{#ex-two-edge level="gate" title="Edge case: renaming and commuting (GATE 2015, option D)" depth="standard"}
Is $\forall x \forall y\, P(x, y) \to \forall x \forall y\, P(y, x)$ valid?

:::step{why="Rename the bound variables of the conclusion: x to u, y to v (law 6)."}
Conclusion $\equiv \forall u \forall v\, P(v, u)$.
:::

:::step{why="Like quantifiers commute (law 5); then rename back: v to x, u to y."}
$\forall u \forall v\, P(v, u) \equiv \forall v \forall u\, P(v, u) \equiv \forall x \forall y\, P(x, y)$, the hypothesis.
:::

:::answer
**Valid**: both sides say "$P$ holds for every ordered pair". The trap is to read the swapped arguments as a
claim of symmetry; symmetry would be $\forall x \forall y (P(x, y) \to P(y, x))$, a different, contingent
sentence. (This makes option D of GATE 2015 valid as printed; the intended key is (C).)
:::
::::

## The one-way laws and their counter-models

:::intuition{#one-way-intuition title="Every student drinks tea or coffee" depth="standard"}
In a hostel, "**every** student drinks tea **or** coffee" is a claim about each student separately: Asha
drinks tea, Babu drinks coffee, and the claim is true. "Every student drinks tea, **or** every student
drinks coffee" is a much stronger claim about the whole hostel: it would need all of them on the same
drink. The stronger claim implies the weaker one, but not the other way round, and Asha and Babu are the
counter-example: two people, each with a different property.

The same two people break "some student drinks tea and some student drinks coffee, so some student drinks
both". Each of the one-way laws below has a strong side and a weak side, and the strong side always pins
the property to one element, or to all elements at once. The arrow goes from strong to weak, and a tiny
world with the properties split across elements stops the reverse arrow.
:::

:::definition{#one-way-laws term="The one-way laws (implications that do not reverse)" depth="standard"}
| # | Valid implication | Converse fails in | Counter-model to the converse ($D = \{0, 1\}$) |
|:-:|:--|:--|:--|
| a | $\forall x\, A \vee \forall x\, B \;\Rightarrow\; \forall x\,(A \vee B)$ | $\forall$ over $\vee$ | $A = \{0\}$, $B = \{1\}$ |
| b | $\exists x\,(A \wedge B) \;\Rightarrow\; \exists x\, A \wedge \exists x\, B$ | $\exists$ over $\wedge$ | $A = \{0\}$, $B = \{1\}$ |
| c | $\forall x\,(A \to B) \;\Rightarrow\; (\forall x\, A \to \forall x\, B)$ | $\forall$ over $\to$ | $A = \{0\}$, $B = \varnothing$ |
| d | $\forall x\,(A \to B) \;\Rightarrow\; (\exists x\, A \to \exists x\, B)$ | | $A = \{0\}$, $B = \{1\}$ |
| e | $\forall x\,(A \leftrightarrow B) \;\Rightarrow\; (\forall x\, A \leftrightarrow \forall x\, B)$ | $\forall$ over $\leftrightarrow$ | $A = \{0\}$, $B = \{1\}$ |
| f | $(\exists x\, A \to \forall x\, B) \;\Rightarrow\; \forall x\,(A \to B)$ | | $A = B = \{0\}$ |
| g | $\forall x\, A \;\Rightarrow\; \exists x\, A$ (non-empty domain) | | $A = \{0\}$ |

Read the table as "left implies right". In every row the converse (right implies left) is **not valid**,
and the last column is a two-element world where the right side is true and the left side false.
:::

:::theorem{#one-way-theorem name="The one-way laws hold, and only one way" depth="standard"}
Each implication (a)–(g) is valid, and each converse is falsified by the interpretation given in the
table.
:::

:::proof{#proof-one-way of="the one-way laws" depth="standard"}
**Idea first:** take an arbitrary element and follow it through; for the converse, check the listed world.

(a) If every element satisfies $A$, then every element satisfies $A \vee B$; same if every element satisfies
$B$. (b) A witness of $A \wedge B$ witnesses $A$ and witnesses $B$. (c) Suppose $\forall x (A \to B)$ and
$\forall x\, A$. Take any $a$: $A(a)$ holds and $A(a) \to B(a)$ holds, so $B(a)$ (modus ponens element by
element); hence $\forall x\, B$. (d) Suppose $\forall x (A \to B)$ and a witness $a$ of $A$: then $B(a)$, so
$\exists x\, B$. (e) Apply (c) in both directions, using $A \leftrightarrow B \equiv (A \to B) \wedge (B \to A)$
and law 2. (f) Take any $a$ with $A(a)$: then $\exists x\, A$, so $\forall x\, B$, so $B(a)$. (g) Pick any
element (the domain is non-empty).

Converses, in the worlds of the table: (a) $\forall x (A \vee B)$ is T (0 has $A$, 1 has $B$) but
$\forall x\, A$ and $\forall x\, B$ are both F. (b) $\exists x\, A$ and $\exists x\, B$ are T, but no element has
both. (c) $\forall x\, A$ is F, so $\forall x\, A \to \forall x\, B$ is T, but $A(0) \to B(0)$ is T → F. (d)
$\exists x\, A \to \exists x\, B$ is T → T, but again $A(0) \to B(0)$ fails. (e) $\forall x\, A$ and $\forall x\, B$ are
both F, so the biconditional is T, but $A(0) \leftrightarrow B(0)$ is T ↔ F. (f) $\forall x (A \to B)$ is T, but
$\exists x\, A$ is T and $\forall x\, B$ is F. (g) $\exists x\, A$ is T, $\forall x\, A$ is F.
:::

:::viz{#one-way-viz spec="qlaw-one-way" mode="animate" depth="standard"}
:::

:::trap{#trap-forall-or title="Distributing ∀ over ∨" depth="quick"}
$\forall x (P(x) \vee Q(x)) \to (\forall x\, P(x) \vee \forall x\, Q(x))$ is the wrong answer examiners
expect you to pick as valid: it is option (C) of GATE 1992, option (A) of IT 2005 and option (D) of 2016
(where it is the one that is NOT valid). The mirror image, $\exists x\, P(x) \wedge \exists x\, Q(x) \to \exists x
(P(x) \wedge Q(x))$, is the same mistake for $\exists$ (1992 (B), and IT 2007 (C) as an equivalence). One
world, $P = \{0\}$ and $Q = \{1\}$, kills both.
:::

:::trap{#trap-converse-arrow title="Reversing the ∀-over-→ law" depth="quick"}
$\forall x (P(x) \to Q(x)) \to (\forall x\, P(x) \to \forall x\, Q(x))$ is valid (law c) and is the key of
2003 (Q32), IT 2005 and IT 2007. Its converse $(\forall x\, P(x) \to \forall x\, Q(x)) \to \forall x (P(x) \to Q(x))$
is offered next to it every time, and is **not** valid: when $P$ is not universal, the hypothesis is
vacuously true and tells you nothing about individual elements. The biconditional version (IT 2005 (D))
fails for the same reason.
:::

:::trick{#trick-split-domain title="Test each option in the 'split world' first" depth="standard"}
For a four-option question on $P$ and $Q$, evaluate every option once in $D = \{0, 1\}$, $P = \{0\}$,
$Q = \{1\}$, and once with $Q = \varnothing$. In most papers this leaves exactly one survivor, and that one
is the valid law; prove it in one line to be sure.

**Why it works:** the split world makes all the "for each" claims true and all the "for one/for all
together" claims false, which is exactly where the converses fail. **When it fails:** when the options
involve free variables, binary predicates or a swapped quantifier order; then use the $\exists\forall$ grid
of the swap section.
:::

:::note{#recap-one-way title="Recap" depth="quick"}
Strong ⇒ weak: $\forall A \vee \forall B \Rightarrow \forall(A \vee B)$; $\exists(A \wedge B) \Rightarrow \exists A \wedge \exists B$;
$\forall(A \to B) \Rightarrow (\forall A \to \forall B)$ and $(\exists A \to \exists B)$; $\forall(A \leftrightarrow B) \Rightarrow
(\forall A \leftrightarrow \forall B)$; $\forall \Rightarrow \exists$. Every converse dies in a two-element world with
the properties split.
:::

### Worked examples: one-way laws

::::example{#ex-one-easy level="easy" title="Which are valid? (GATE 1992)" depth="quick"}
(A) $\forall x\, P \vee \forall x\, Q \to \forall x (P \vee Q)$; (B) $\exists x\, P \wedge \exists x\, Q \to \exists x (P \wedge Q)$;
(C) $\forall x (P \vee Q) \to \forall x\, P \vee \forall x\, Q$; (D) $\exists x (P \vee Q) \to \neg\forall x\, P \vee \exists x\, Q$
(all with argument $x$).

:::step{why="(A) is law (a): if one predicate holds everywhere, the disjunction holds everywhere."}
(A) is **valid**.
:::

:::step{why="(B) and (C) are the converses of laws (b) and (a). Test them in the split world P = {0}, Q = {1}."}
(B): $\exists x\, P$ = T, $\exists x\, Q$ = T, but no element has both: T → F. (C): every element has $P$ or $Q$, but
neither holds everywhere: T → F. Both **not valid**.
:::

:::step{why="(D) has the shape ∃x(P ∨ Q) → (∀xP → ∃xQ). Make the hypothesis true with P everywhere and Q nowhere."}
$D = \{0, 1\}$, $P = D$, $Q = \varnothing$: $\exists x (P \vee Q)$ = T, $\neg\forall x\, P$ = F, $\exists x\, Q$ = F. T → F:
**not valid**.
:::

:::answer
Only **(A)**.
:::
::::

::::example{#ex-one-medium level="medium" title="Always true? (GATE IT 2005)" depth="standard"}
(A) $\forall x (P \vee Q) \to (\forall x\, P \vee \forall x\, Q)$; (B) $\forall x (P \to Q) \to (\forall x\, P \to \forall x\, Q)$;
(C) $(\forall x\, P \to \forall x\, Q) \to \forall x (P \to Q)$; (D) $(\forall x\, P \leftrightarrow \forall x\, Q) \to \forall x (P \leftrightarrow Q)$.

:::step{why="(B) is law (c): modus ponens applied to each element."}
If every $x$ has $P \to Q$ and every $x$ has $P$, every $x$ has $Q$. **Valid**.
:::

:::step{why="(A) is the converse of law (a): the split world kills it."}
$P = \{0\}$, $Q = \{1\}$: hypothesis T, conclusion F.
:::

:::step{why="(C) and (D) are the converses of laws (c) and (e). Make ∀xP false so the hypothesis holds vacuously, then break one element."}
$P = \{0\}$, $Q = \{1\}$: $\forall x\, P$ and $\forall x\, Q$ are both F, so both hypotheses are T; but $P(0) \to Q(0)$
and $P(0) \leftrightarrow Q(0)$ are both F. Neither is valid.
:::

:::answer
**(B)**. One world, $P = \{0\}$, $Q = \{1\}$, refutes all three others.
:::
::::

::::example{#ex-one-gate level="gate" title="Which is NOT valid? (GATE 2016)" depth="standard"}
(A) $(\forall x\, p \to \forall x\, q) \to (\exists x \neg p \vee \forall x\, q)$; (B) $(\exists x\, p \vee \exists x\, q) \to \exists x (p \vee q)$;
(C) $\exists x (p \wedge q) \to (\exists x\, p \wedge \exists x\, q)$; (D) $\forall x (p \vee q) \to (\forall x\, p \vee \forall x\, q)$.

:::step{why="(A): rewrite the hypothesis: X → Y ≡ ¬X ∨ Y and ¬∀xp ≡ ∃x¬p."}
$\forall x\, p \to \forall x\, q \equiv \neg\forall x\, p \vee \forall x\, q \equiv \exists x\neg p \vee \forall x\, q$: the conclusion.
So (A) has the form $X \to X$: **valid**.
:::

:::step{why="(B) is law 3 read from right to left; (C) is law (b)."}
Both **valid**.
:::

:::step{why="(D) is ∀ distributed over ∨: the split world p = {0}, q = {1}."}
Hypothesis T, conclusion F ∨ F = F. **Not valid**.
:::

:::answer
**(D)**. Notice that (A) is a disguised tautology: once both sides are written without arrows they are
the same formula.
:::
::::

::::example{#ex-one-edge level="gate" title="Edge case: schematic formulas α and β (GATE 2003)" depth="standard"}
$\alpha$, $\beta$ are formulas with $x$ as the only free variable. Which is valid:
(A) $(\forall x\,\alpha \to \forall x\,\beta) \to \forall x(\alpha \to \beta)$, (B) $\forall x\,\alpha \to \exists x(\alpha \wedge \beta)$,
(C) $(\forall x(\alpha \vee \beta) \to \exists x\,\alpha) \to \forall x\,\alpha$, (D) $\forall x(\alpha \to \beta) \to (\forall x\,\alpha \to \forall x\,\beta)$?

:::step{why="α and β can be any formulas, so a counter-model may use the simplest choice: α = A(x), β = B(x) for fresh predicates. One failing instance makes the schema not valid."}
Work with unary predicates $A$, $B$ on $D = \{0, 1\}$.
:::

:::step{why="(D) is law (c), valid for every α, β. (A) is its converse; (B) asks for a common witness that α everywhere does not give."}
(A): $A = \{0\}$, $B = \varnothing$ gives T → F. (B): $A = D$, $B = \varnothing$ gives T → F.
:::

:::step{why="(C) is the tricky one: to falsify it we need its hypothesis true and ∀xα false. Make α true somewhere but not everywhere."}
$A = \{0\}$, $B = \{1\}$: $\forall x (A \vee B)$ = T, $\exists x\, A$ = T, so the hypothesis is T → T = T; the conclusion
$\forall x\, A$ is F. Not valid.
:::

:::answer
**(D)**. For schematic letters, a counter-model only has to work for **one** choice of $\alpha$ and $\beta$; a
validity claim must work for **all** choices, which is why only the general law survives.
:::
::::

## Moving a quantifier past a formula without x

:::intuition{#null-intuition title="A quantifier ignores what does not mention its variable" depth="standard"}
Let $W$ be "it is raining" and $P(x)$ "$x$ carries an umbrella". "For every person $x$: $x$ carries an
umbrella, or it is raining" is true exactly when it is raining (then every disjunction is true) or when
everybody carries an umbrella. So $\forall x (P(x) \vee W) \equiv \forall x\, P(x) \vee W$: the quantifier slides
past $W$ because $W$ has the same value for every $x$.

The surprise comes with implications. "For every person $x$: if $x$ carries an umbrella, then it is raining"
says that **one** umbrella is already enough to guarantee rain: it is $\exists x\, P(x) \to W$, not
$\forall x\, P(x) \to W$. A hypothesis is a negated position ($A \to W \equiv \neg A \vee W$), and moving a
quantifier out of a negated position flips it. GATE 2020 and IT 2008 are built on exactly this flip.
:::

:::definition{#null-laws term="Null quantification (W has no free x)" depth="standard"}
| Quantifier inside | Equivalent | Flips? |
|:--|:--|:-:|
| $\forall x\,(A \wedge W)$ | $\forall x\, A \wedge W$ | no |
| $\forall x\,(A \vee W)$ | $\forall x\, A \vee W$ | no |
| $\exists x\,(A \wedge W)$ | $\exists x\, A \wedge W$ | no |
| $\exists x\,(A \vee W)$ | $\exists x\, A \vee W$ | no |
| $\forall x\,(W \to A)$ | $W \to \forall x\, A$ | no |
| $\exists x\,(W \to A)$ | $W \to \exists x\, A$ | no |
| $\forall x\,(A \to W)$ | $\exists x\, A \to W$ | **yes** |
| $\exists x\,(A \to W)$ | $\forall x\, A \to W$ | **yes** |
| $\forall x\, W$, $\exists x\, W$ | $W$ | |

Rule of thumb: in the **conclusion** of an implication (or in $\wedge$, $\vee$) the quantifier keeps its type;
in the **hypothesis** it flips.
:::

:::theorem{#null-theorem name="Null quantification" depth="standard"}
If $x$ does not occur free in $W$, every line of the table above is valid (on non-empty domains).
:::

:::proof{#proof-null of="null quantification" depth="standard"}
**Idea first:** $W$ has one fixed truth value in a given interpretation; split into the two cases.

Fix an interpretation. *Case $W$ true.* $\forall x (A \vee W)$: every body is T, so T; and $\forall x\, A \vee W$ is
T. $\exists x (A \vee W)$: the body is T for every element, and there **is** an element, so T; right side T. (This
is one place where non-emptiness is used.) $\forall x (A \wedge W) \equiv \forall x\, A$ and $\forall x\, A \wedge W
\equiv \forall x\, A$; likewise for $\exists$. *Case $W$ false.* $\forall x (A \vee W) \equiv \forall x\, A$, and
$\forall x\, A \vee \text{F} \equiv \forall x\, A$; $\forall x (A \wedge \text{F})$ is F on a non-empty domain, and so is
the right side. The $\exists$ lines are the same with "some" for "every". The last line: $W$'s value does not
depend on $x$, so "for every $x$, $W$" and "for some $x$, $W$" both have $W$'s value (non-empty domain).
:::

:::derivation{#null-derivation of="the implication lines of the table" depth="standard"}
Rewrite each implication as a disjunction and use the four basic lines and De Morgan:

- $\forall x (A \to W) \equiv \forall x (\neg A \vee W) \equiv \forall x\, \neg A \vee W \equiv \neg\exists x\, A \vee W \equiv \exists x\, A \to W$.
- $\exists x (A \to W) \equiv \exists x (\neg A \vee W) \equiv \exists x\, \neg A \vee W \equiv \neg\forall x\, A \vee W \equiv \forall x\, A \to W$.
- $\forall x (W \to A) \equiv \forall x (\neg W \vee A) \equiv \neg W \vee \forall x\, A \equiv W \to \forall x\, A$, and the same with $\exists$.

The flip happens exactly at the step $\forall x\, \neg A \equiv \neg\exists x\, A$: the quantifier had to pass through
the hidden $\neg$ of the hypothesis. **Sanity check** on $D = \{0, 1\}$, $A = \{0\}$, $W$ = F:
$\forall x (A(x) \to W)$ is F (at $x = 0$: T → F); $\exists x\, A(x) \to W$ is T → F = F, agreeing; but the
unflipped $\forall x\, A(x) \to W$ is F → F = T, disagreeing.
:::

:::viz{#null-viz spec="qlaw-null-flip" mode="animate" depth="standard"}
:::

:::trap{#trap-null-flip title="Pulling ∀ out of a hypothesis without flipping it" depth="quick"}
"$\forall x (p(x) \to W) \equiv \forall x\, p(x) \to W$" looks like a harmless factoring and is the NOT-valid
option (C) of GATE 2020. In IT 2008 the wrong options make the same slip in the other direction, for
example $(\forall x\, \alpha(x)) \to \beta$ treated as if it gave $\forall x(\alpha(x) \to \beta)$. Always ask: is the
quantified part in the hypothesis? Then $\forall \leftrightarrow \exists$.
:::

:::trick{#trick-rewrite-or title="When in doubt, turn every → into ∨" depth="standard"}
Rewrite $X \to Y$ as $\neg X \vee Y$, push the $\neg$ through the quantifier with De Morgan, and only then move
the quantifier past $W$ using the $\vee$ lines. You never need to remember which lines flip.

**Why it works:** the four $\wedge/\vee$ lines never flip, and De Morgan does the flipping for you, visibly.
**When it fails:** only if $W$ secretly contains $x$ free. Then none of these laws apply; rename the bound
variable first (see the edge case below).
:::

:::note{#recap-null title="Recap" depth="quick"}
A quantifier passes a formula $W$ without free $x$ unchanged through $\wedge$, $\vee$ and the conclusion of $\to$;
out of a hypothesis it flips: $\forall x(A \to W) \equiv \exists x A \to W$, $\exists x(A \to W) \equiv \forall x A \to W$.
:::

### Worked examples: formulas without x

::::example{#ex-null-easy level="easy" title="Factoring out a constant condition" depth="quick"}
Simplify $\exists x\,(P(x) \wedge W) \vee \exists x\,(Q(x) \wedge W)$, where $W$ has no free $x$.

:::step{why="∃ distributes over ∨ (law 3), so the two ∃ can be merged into one."}
$\exists x\,\big((P(x) \wedge W) \vee (Q(x) \wedge W)\big)$.
:::

:::step{why="Factor W out inside (distributive law), then move ∃ past W (null quantification, ∧ line)."}
$\exists x\,\big((P(x) \vee Q(x)) \wedge W\big) \equiv \exists x\,(P(x) \vee Q(x)) \wedge W$.
:::

:::answer
$\exists x\,(P(x) \vee Q(x)) \wedge W$: "$W$, and something is $P$ or $Q$".
:::
::::

::::example{#ex-null-medium level="medium" title="Which is NOT valid? (GATE 2020)" depth="standard"}
$W$ has no free $x$. (A) $\forall x(p(x) \vee W) \equiv \forall x\, p(x) \vee W$; (B) $\exists x(p(x) \wedge W) \equiv \exists x\, p(x) \wedge W$;
(C) $\forall x(p(x) \to W) \equiv \forall x\, p(x) \to W$; (D) $\exists x(p(x) \to W) \equiv \forall x\, p(x) \to W$.

:::step{why="(A) and (B) are lines of the table with ∧ and ∨: no flip."}
Both **valid**.
:::

:::step{why="(D): p(x) is in the hypothesis, so ∃ must flip to ∀. It does."}
$\exists x(p(x) \to W) \equiv \forall x\, p(x) \to W$: **valid**.
:::

:::step{why="(C): the hypothesis position forces a flip, but (C) keeps ∀. Confirm with the sanity-check world."}
$\forall x(p(x) \to W) \equiv \exists x\, p(x) \to W$, not $\forall x\, p(x) \to W$. With $D = \{0, 1\}$, $p = \{0\}$, $W$ = F: left F,
right F → F = T.
:::

:::answer
**(C)** is not valid. (D) is the correct version of the same idea, and it is the option students wrongly
reject because "the quantifier changed".
:::
::::

::::example{#ex-null-gate level="gate" title="Which is logically valid? (GATE IT 2008)" depth="standard"}
$\alpha(x)$ has $x$ free; $\beta$ has no free variable.
(A) $[\beta \to \exists x\,\alpha(x)] \to \forall x[\beta \to \alpha(x)]$; (B) $\exists x[\beta \to \alpha(x)] \to [\beta \to \forall x\,\alpha(x)]$;
(C) $[\exists x\,\alpha(x) \to \beta] \to \forall x[\alpha(x) \to \beta]$; (D) $[\forall x\,\alpha(x) \to \beta] \to \forall x[\alpha(x) \to \beta]$.

:::step{why="Move every quantifier to the outside of β using the table, so each option compares two simple sentences."}
$\forall x[\beta \to \alpha] \equiv \beta \to \forall x\,\alpha$; $\exists x[\beta \to \alpha] \equiv \beta \to \exists x\,\alpha$;
$\forall x[\alpha \to \beta] \equiv \exists x\,\alpha \to \beta$.
:::

:::step{why="Substitute. (C) becomes X → X; the others compare a weak and a strong version of the same thing."}
(A): $(\beta \to \exists\alpha) \to (\beta \to \forall\alpha)$. (B): $(\beta \to \exists\alpha) \to (\beta \to \forall\alpha)$.
(C): $(\exists\alpha \to \beta) \to (\exists\alpha \to \beta)$, **valid**. (D): $(\forall\alpha \to \beta) \to (\exists\alpha \to \beta)$.
:::

:::step{why="Refute the others in one world: β true, α true at 0 only, D = {0, 1}."}
(A), (B): $\beta \to \exists\alpha$ = T but $\beta \to \forall\alpha$ = F. (D): with $\beta$ **false** instead, $\forall\alpha \to \beta$ is
F → F = T while $\exists\alpha \to \beta$ is T → F = F.
:::

:::answer
**(C)**: it is the null-quantification equivalence read in one direction.
:::
::::

::::example{#ex-null-drinker level="gate" title="The 'somebody is a trigger' sentence" depth="standard"}
Is $\exists x\,\big(P(x) \to \forall y\, P(y)\big)$ valid? ("There is a person such that, if that person
passes, everybody passes.")

:::step{why="The conclusion ∀yP(y) has no free x, so it plays the role of W."}
With $W = \forall y\, P(y)$: $\exists x(P(x) \to W) \equiv \forall x\, P(x) \to W$ (the flipping line).
:::

:::step{why="Rename the bound variable: ∀xP(x) and ∀yP(y) are the same sentence."}
$\forall x\, P(x) \to \forall y\, P(y)$ has the form $X \to X$.
:::

:::answer
**Valid**, although it sounds absurd. Intuition check: if everybody passes, any $x$ works; if somebody fails,
choose that person, and the implication is vacuously true.
:::
::::

::::example{#ex-null-edge level="gate" title="Edge case: the 'W' that secretly contains x" depth="standard"}
Is $\forall x\,(P(x) \to Q(x)) \equiv \exists x\, P(x) \to Q(x)$?

:::step{why="The law needs a W without free x. Here Q(x) has x free, so the law does not apply; and the right side even has a free x."}
The right side is $(\exists x\, P(x)) \to Q(x)$: its last $x$ is free (a quantifier binds only the next unit).
:::

:::step{why="Find a world and a value of the free x where the two sides differ."}
$D = \{0, 1\}$, $P = Q = \{0\}$, free $x = 1$: left T (only 0 has $P$, and it has $Q$); right T → $Q(1)$ = T → F = F.
:::

:::answer
**Not equivalent**. Null quantification is only for parts that do not mention the variable; otherwise
leave the quantifier where it is.
:::
::::

## Prenex normal form

:::intuition{#prenex-intuition title="Put all the quantifiers in a header" depth="standard"}
A formula like $\forall x\, P(x) \to \exists y\, Q(y)$ has quantifiers buried at different depths. It is often
convenient (for resolution, for classifying sentences, and for GATE 2018) to rewrite it so that **all**
quantifiers stand at the front, as a header, followed by a quantifier-free body: here
$\exists x \exists y\,(\neg P(x) \vee Q(y))$. The laws of the last two sections are exactly the moves we need:
pull a quantifier past a part that does not mention its variable, flipping it when it leaves a hypothesis.
The only extra care is to give every quantifier its own variable first, so that pulling one out never
captures another's variable.
:::

:::definition{#prenex-def term="Prenex normal form and the procedure" depth="standard"}
A formula is in **prenex normal form** if it is $Q_1 x_1\, Q_2 x_2 \dots Q_n x_n\; M$, each $Q_i$ is $\forall$ or $\exists$,
and the **matrix** $M$ has no quantifiers. To convert:

1. Eliminate $\leftrightarrow$ and $\to$ ($X \to Y \equiv \neg X \vee Y$).
2. Push every $\neg$ down to the atoms (De Morgan, both for connectives and quantifiers).
3. **Rename** bound variables so that no two quantifiers use the same variable and no bound variable is
   also free somewhere.
4. Pull quantifiers out one at a time with the null-quantification lines ($\forall x\, A \vee W \equiv \forall x (A
   \vee W)$ etc.). Where two quantifiers of the same kind meet the connective they distribute over
   ($\forall$ with $\wedge$, $\exists$ with $\vee$) you may merge them into one instead.
:::

:::theorem{#prenex-theorem name="Every formula has a prenex form" depth="standard"}
Every first-order formula is logically equivalent (on non-empty domains) to a formula in prenex normal
form, with the same free variables.
:::

:::proof{#proof-prenex of="the prenex theorem" depth="standard"}
**Idea first:** after steps 1–3, the formula is built from atoms with $\neg$ (on atoms only), $\wedge$, $\vee$ and
quantifiers, and each pull-out step is one null-quantification equivalence.

Induction on the formula. Atoms and negated atoms are prenex (empty header). If $A$ is prenex, so is
$\forall x\, A$ and $\exists x\, A$. If $A = Q_1 x_1 \dots A'$ and $B$ are prenex, with $x_1$ not free in $B$ (guaranteed
by step 3), then $A \wedge B \equiv Q_1 x_1 (\dots A' \wedge B)$ and $A \vee B \equiv Q_1 x_1(\dots A' \vee B)$ by the table;
repeating this moves all of $A$'s header and then all of $B$'s header to the front. Each step is an
equivalence, so the result is equivalent to the original. Steps 1–2 introduced no new free variables and
step 3 renamed only bound ones. **Sanity check:** $\neg\forall x\, P(x)$ becomes $\exists x\, \neg P(x)$, which is prenex
and equivalent.
:::

:::trap{#trap-rename title="Pulling two quantifiers out without renaming" depth="quick"}
$\forall x\, P(x) \vee \forall x\, Q(x)$ is **not** $\forall x\,(P(x) \vee Q(x))$: that is the one-way law (a) run backwards.
Rename first: $\forall x\, P(x) \vee \forall y\, Q(y) \equiv \forall x \forall y\,(P(x) \vee Q(y))$. Merging two quantifiers is safe
only for $\forall$ over $\wedge$ and $\exists$ over $\vee$.
:::

:::trick{#trick-prenex-order title="Choose the order of pulling" depth="standard"}
When two independent quantifiers are pulled out (from the two sides of an $\wedge$ or $\vee$), either may go
first: $\forall x\, P(x) \vee \exists y\, Q(y) \equiv \forall x \exists y\,(P(x) \vee Q(y)) \equiv \exists y \forall x\,(P(x) \vee Q(y))$. Pull the
$\exists$'s first if you want an $\exists^*\forall^*$ header (the GATE 2018 shape).

**Why it works:** the two quantified variables do not occur in each other's part, so neither depends on the
other. **When it fails:** if one quantifier is inside the scope of the other in the original (as in
$\forall x \exists y\, R(x, y)$), the order is fixed; swapping it is the subject of the next section.
:::

:::note{#recap-prenex title="Recap" depth="quick"}
Remove arrows, push $\neg$ to atoms, rename bound variables apart, pull quantifiers out with the null laws
(flipping only where an arrow hid a $\neg$, which step 1 already made visible). Merge only $\forall$/$\wedge$ and
$\exists$/$\vee$.
:::

### Worked examples: prenex form

::::example{#ex-pnf-easy level="easy" title="An implication between two quantified parts" depth="quick"}
Put $\forall x\, P(x) \to \exists x\, Q(x)$ in prenex form.

:::step{why="Step 1 and 2: remove the arrow and push the ¬ through ∀."}
$\neg\forall x\, P(x) \vee \exists x\, Q(x) \equiv \exists x\, \neg P(x) \vee \exists x\, Q(x)$.
:::

:::step{why="Two ∃'s around an ∨: ∃ distributes over ∨, so merge them (no renaming needed)."}
$\exists x\,(\neg P(x) \vee Q(x))$.
:::

:::answer
$\exists x\,(\neg P(x) \vee Q(x))$, i.e. $\exists x\,(P(x) \to Q(x))$: law 4 again, from a new direction.
:::
::::

::::example{#ex-pnf-medium level="medium" title="Negation first, then pull" depth="standard"}
Put $\neg\exists x \forall y\, R(x, y) \vee \forall z\, P(z)$ in prenex form.

:::step{why="Push the ¬ through both quantifiers: ¬∃ becomes ∀¬, then ¬∀ becomes ∃¬."}
$\forall x \exists y\, \neg R(x, y) \vee \forall z\, P(z)$.
:::

:::step{why="The variables are already distinct. z does not occur on the left and x, y not on the right, so pull the left header out, then ∀z."}
$\forall x \exists y \forall z\,\big(\neg R(x, y) \vee P(z)\big)$.
:::

:::answer
$\forall x \exists y \forall z\,(\neg R(x, y) \vee P(z))$. ($\forall z$ could also go first: $\forall z \forall x \exists y (\dots)$.)
:::
::::

::::example{#ex-pnf-gate level="gate" title="A three-level sentence" depth="standard"}
Put $\forall x \forall y\,\big[\exists z\,(P(x, z) \wedge P(y, z)) \to \exists u\, Q(x, y, u)\big]$ in prenex form.

:::step{why="Remove the arrow: the ∃z sits in the hypothesis, so it becomes ¬∃z, i.e. ∀z¬."}
$\forall x \forall y\,\big[\forall z\,\neg(P(x, z) \wedge P(y, z)) \vee \exists u\, Q(x, y, u)\big]$.
:::

:::step{why="De Morgan inside; then pull ∀z (u and z are different, and z is not in the right part)."}
$\forall x \forall y \forall z\,\big[\neg P(x, z) \vee \neg P(y, z) \vee \exists u\, Q(x, y, u)\big]$.
:::

:::step{why="Pull ∃u out of the disjunction (u is not in the left part)."}
$\forall x \forall y \forall z \exists u\,\big[\neg P(x, z) \vee \neg P(y, z) \vee Q(x, y, u)\big]$.
:::

:::answer
$\forall x \forall y \forall z \exists u\,[\neg P(x, z) \vee \neg P(y, z) \vee Q(x, y, u)]$. The $\exists z$ became $\forall z$ because it
came out of a hypothesis, exactly the null-quantification flip.
:::
::::

::::example{#ex-pnf-edge level="gate" title="Edge case: two quantifiers with the same variable" depth="standard"}
Put $\forall x\, P(x) \vee \forall x\, Q(x)$ in prenex form, and show that the "obvious" answer is wrong.

:::step{why="The two ∀ use the same name x, and ∀ does not distribute over ∨. Rename the second one."}
$\forall x\, P(x) \vee \forall y\, Q(y)$.
:::

:::step{why="Pull ∀x (x is not in the right part), then ∀y."}
$\forall x \forall y\,(P(x) \vee Q(y))$.
:::

:::step{why="Check the tempting ∀x(P(x) ∨ Q(x)) in the split world D = {0, 1}, P = {0}, Q = {1}."}
$\forall x (P(x) \vee Q(x))$ is T; the original is F ∨ F = F. So the shortcut is wrong. ($\forall x \forall y (P(x) \vee Q(y))$: at
$x = 1$, $y = 0$ it gives F ∨ F, so F, matching.)
:::

:::answer
$\forall x \forall y\,(P(x) \vee Q(y))$. Rename before you pull.
:::
::::

## Swapping quantifiers: ∃∀ implies ∀∃

:::intuition{#swap-intuition title="One master key, or a key for every lock" depth="standard"}
"There is a key that opens every lock" ($\exists k \forall \ell$) and "every lock is opened by some key"
($\forall \ell \exists k$) sound alike, but the first is far stronger. If a master key exists, then certainly
every lock has a key that opens it: the master key itself. But a building where every lock has its own key
need not have a master key.

In a relation table with rows $x$ and columns $y$, $\forall x \exists y\, R(x, y)$ says **every row has a 1**
somewhere, while $\exists y \forall x\, R(x, y)$ says **some column is all 1's**. A full column puts a 1 in every
row, so $\exists y \forall x \Rightarrow \forall x \exists y$. A diagonal of 1's has a 1 in every row and no full column, so
the converse fails.
:::

:::definition{#swap-def term="Orders of two quantifiers" depth="standard"}
For a binary $R$:

- $\forall x \forall y\, R \equiv \forall y \forall x\, R$ and $\exists x \exists y\, R \equiv \exists y \exists x\, R$ (law 5);
- $\exists y \forall x\, R(x, y) \Rightarrow \forall x \exists y\, R(x, y)$, not conversely;
- also $\exists x \forall y\, R(x, y) \Rightarrow \forall y \exists x\, R(x, y)$ (the same law with the letters renamed);
- the top of the chain is $\forall\forall$ and the bottom is $\exists\exists$: $\forall x \forall y R \Rightarrow \exists y \forall x R \Rightarrow
  \forall x \exists y R \Rightarrow \exists x \exists y R$.

In words: an $\exists$ can always be moved to the **right** past a $\forall$ (it becomes weaker, its witness may now
depend on that variable); moving it to the left is not allowed.
:::

:::theorem{#swap-theorem name="∃y∀x R(x, y) → ∀x∃y R(x, y) is valid; the converse is not" depth="standard"}
The implication holds in every interpretation, and the interpretation $D = \{0, 1\}$, $R = \{(0, 0), (1, 1)\}$
(equality) satisfies $\forall x \exists y\, R(x, y)$ but not $\exists y \forall x\, R(x, y)$.
:::

:::proof{#proof-swap of="the quantifier swap" depth="standard"}
**Idea first:** reuse the single witness for every $x$.

Suppose $\exists y \forall x\, R(x, y)$ and let $b$ be a witness: $R(a, b)$ holds for every $a$. Now take any $x = a$; we
need some $y$ with $R(a, y)$, and $y = b$ works. So $\forall x \exists y\, R(x, y)$. For the converse, in the
equality world every $x$ has $y = x$, but no single $y$ equals both 0 and 1. **Sanity check** on one
element: with $D = \{0\}$ both sentences say $R(0, 0)$, so they agree, which is why every counter-model to the
converse needs at least two elements.
:::

:::viz{#swap-viz spec="qlaw-swap-grid" mode="animate" depth="standard"}
:::

:::trap{#trap-swap title="∀x∃y does not give ∃y∀x" depth="quick"}
$\forall x \exists y\, P(x, y) \to \exists y \forall x\, P(x, y)$ is option (D) of IT 2007; the biconditional
$\forall x \exists y\, R \leftrightarrow \exists y \forall x\, R$ is option (A) of 2015; "$\exists y \forall x\, R(x, y)$" is sentence II of 2017. All are
wrong for the same reason: the $y$ chosen for each $x$ may be different. Over $\mathbb{N}$, "every number has a
larger one" is true, "some number is larger than every number" is false.
:::

:::trick{#trick-grid title="Draw the grid" depth="standard"}
For any two-quantifier sentence about $R$, draw a $2 \times 2$ (or $3 \times 3$) grid with rows $x$ and columns $y$.
$\forall x \exists y$: each row has a 1. $\exists y \forall x$: a full column. $\exists x \forall y$: a full row. $\forall y \exists x$: each column
has a 1. The identity diagonal satisfies all the "each" forms and none of the "full" forms; a single full
column satisfies $\exists y \forall x$ and $\forall x \exists y$ but neither $\exists x \forall y$ nor $\forall y \exists x$ (on $n \ge 2$ elements).

**Why it works:** the four sentences are exactly these four grid properties. **When it fails:** with three
or more nested quantifiers, the grid becomes a cube; use the "move ∃ right" rule instead.
:::

:::note{#recap-swap title="Recap" depth="quick"}
Same quantifiers commute; mixed ones do not. $\exists y \forall x R \Rightarrow \forall x \exists y R$ (a full column gives a 1 in
every row); the identity diagonal on two elements refutes the converse.
:::

### Worked examples: quantifier order

::::example{#ex-swap-easy level="easy" title="Numbers and 'less than'" depth="quick"}
Over the integers, evaluate $\forall x \exists y\,(x < y)$ and $\exists y \forall x\,(x < y)$.

:::step{why="∀x∃y: for each x find some y. The witness may depend on x."}
For any $x$, take $y = x + 1$: true.
:::

:::step{why="∃y∀x: one y must beat every x, including x = y itself."}
For any candidate $y$, the choice $x = y$ gives $y < y$, false. So no $y$ works: false.
:::

:::answer
True, false. The witness $x + 1$ depends on $x$; that dependence is what the order $\forall\exists$ allows and
$\exists\forall$ forbids.
:::
::::

::::example{#ex-swap-medium level="medium" title="What does ∀x∃y R(x, y) imply? (GATE 2017)" depth="standard"}
$F = \forall x \exists y\, R(x, y)$, non-empty domains. Which are implied: I $\exists y \exists x\, R(x, y)$,
II $\exists y \forall x\, R(x, y)$, III $\forall y \exists x\, R(x, y)$, IV $\neg\exists x \forall y\, \neg R(x, y)$?

:::step{why="IV: push the negation in. ¬∃x∀y¬R ≡ ∀x¬∀y¬R ≡ ∀x∃yR."}
IV $\equiv F$: implied.
:::

:::step{why="I: pick any element a (non-empty); F gives a b with R(a, b), and that pair witnesses ∃y∃x."}
I is implied (this is $\forall \Rightarrow \exists$ applied to the outer quantifier).
:::

:::step{why="II and III: use a 'column' world with two elements, where every row has a 1 but only in column 0."}
$D = \{0, 1\}$, $R = \{(0, 0), (1, 0)\}$ makes $F$ true and III false (column 1 is empty). The diagonal world
$R = \{(0, 0), (1, 1)\}$ makes $F$ true and II false.
:::

:::answer
**I and IV only**. II is the swapped (stronger) sentence; III is about columns, which $F$ does not mention.
:::
::::

::::example{#ex-swap-gate level="gate" title="Two traps in one question (GATE 2015)" depth="standard"}
Show that (A) $\forall x \exists y\, R(x, y) \leftrightarrow \exists y \forall x\, R(x, y)$ and (B)
$\forall x\,[\exists y\, R(x, y) \to S(x, y)] \to \forall x \exists y\, S(x, y)$ are not valid.

:::step{why="(A) is a biconditional, so it fails if one direction fails; ∀∃ → ∃∀ fails on the diagonal."}
$D = \{0, 1\}$, $R = \{(0, 0), (1, 1)\}$: left T, right F. Not valid.
:::

:::step{why="(B): the ∃y binds only R(x, y) (the bracket ends before S), so the y in S(x, y) is free. A counter-model may also choose the value of the free y."}
The hypothesis reads $\forall x\,[(\exists y\, R(x, y)) \to S(x, y)]$ with $y$ free.
:::

:::step{why="Make every hypothesis implication vacuous (R empty) and make S empty, so the conclusion fails."}
$D = \{0\}$, $R = S = \varnothing$, $y = 0$: hypothesis T (no $R$-pairs), conclusion $\forall x \exists y\, S$ = F. Not valid.
:::

:::answer
Both fail. (C) is valid by law 7 ($P \to R \equiv \neg P \vee R$ under the same quantifiers), the intended key.
:::
::::

::::example{#ex-swap-edge level="gate" title="Edge case: why a one-element world never refutes a swap" depth="standard"}
What is the smallest domain on which $\forall x \exists y\, R(x, y) \to \exists y \forall x\, R(x, y)$ has a counter-model?

:::step{why="On one element both sentences collapse to R(0, 0)."}
$D = \{0\}$: $\forall x \exists y\, R = R(0, 0) = \exists y \forall x\, R$. The implication is $R(0, 0) \to R(0, 0)$, always T.
:::

:::step{why="Two elements suffice: the diagonal (or the 'swap' R = {(0, 1), (1, 0)})."}
$R = \{(0, 0), (1, 1)\}$: left T, right F.
:::

:::answer
**2**. A search that starts at size 1 will report "no counter-model" there; that says nothing about validity
(the theorem on finite searches), it only means one element cannot separate "for each" from "for all".
:::
::::

## Satisfiable, but only in infinite worlds (GATE 1991)

:::intuition{#infinite-intuition title="A staircase with no top step" depth="standard"}
Suppose every person in a group must name someone **strictly taller** than themselves. In a finite group
the tallest person cannot do it: there is nobody taller. In an infinite group (heights $1, 2, 3, \dots$)
everybody can. A sentence can force exactly this situation: a relation that is a strict order (never
$x$ before $x$, transitive) in which every element has something after it. Such a sentence is satisfiable,
in the natural numbers with $<$, but every finite world falsifies it.

This matters for the method of this lesson: a counter-model search on small domains would never find a
model of it, and would never find a counter-model of its negation, yet the negation is not valid.
:::

:::definition{#strict-order-def term="The GATE 1991 sentence" depth="standard"}
$$\varphi = \underbrace{\forall x \exists y\, R(x, y)}_{\text{serial}} \wedge \underbrace{\forall x \forall y\,(R(x, y) \to \neg R(y, x))}_{\text{asymmetric}} \wedge \underbrace{\forall x \forall y \forall z\,(R(x, y) \wedge R(y, z) \to R(x, z))}_{\text{transitive}} \wedge \underbrace{\forall x\, \neg R(x, x)}_{\text{irreflexive}}.$$
A transitive, irreflexive relation is a **strict order**; "serial" says every element has a successor.
Note that asymmetry already implies irreflexivity (put $y = x$), so the last conjunct is redundant.
:::

:::theorem{#no-finite-model-theorem name="φ has models, but no finite ones" depth="standard"}
$(\mathbb{N}, <)$ is a model of $\varphi$. No interpretation with a finite domain is a model of $\varphi$.
:::

:::proof{#proof-no-finite-model of="the GATE 1991 theorem" depth="standard"}
**Idea first:** follow successors; in a finite world you must come back to an element already visited, and
transitivity then turns the loop into $R(a, a)$.

*Model.* In $\mathbb{N}$ with $R$ = "<": every $n$ has $n + 1 > n$ (serial); $m < n$ and $n < m$ never both hold
(asymmetric); $<$ is transitive; $n < n$ never holds (irreflexive).

*No finite model.* Suppose $D$ is finite with $|D| = k$ and $\varphi$ holds. Pick $a_0$; seriality gives $a_1$ with
$R(a_0, a_1)$, then $a_2$ with $R(a_1, a_2)$, and so on up to $a_k$. These are $k + 1$ names for elements of a
$k$-element set, so (pigeonhole) $a_i = a_j$ for some $i < j$. Transitivity along the chain
$a_i, a_{i+1}, \dots, a_j$ gives $R(a_i, a_j) = R(a_i, a_i)$, contradicting irreflexivity. **Sanity check:** with
transitivity removed, the 3-cycle $R = \{(0, 1), (1, 2), (2, 0)\}$ is serial, asymmetric and irreflexive, so
the proof really needs transitivity.
:::

:::viz{#chain-viz spec="qlaw-successor-chain" mode="animate" depth="standard"}
:::

:::trap{#trap-finite-search title="'No model on small domains' is not 'unsatisfiable'" depth="quick"}
A search over all interpretations on domains of size 1–4 finds no model of $\varphi$ (the Lab will tell you
the same for sizes 1–3). The tempting conclusion, "unsatisfiable", is the wrong answer: $(\mathbb{N}, <)$ is a
model. The search only shows "no **small** model"; the proof above shows "no **finite** model"; the model
$\mathbb{N}$ shows "satisfiable".
:::

:::note{#recap-infinite title="Recap" depth="quick"}
Serial + strict order (irreflexive, transitive; asymmetry follows) forces an infinite ascending chain: no
finite models, but $(\mathbb{N}, <)$ is a countable model. A finite search can never prove validity or
unsatisfiability.
:::

### Worked examples: infinite models

::::example{#ex-inf-easy level="easy" title="Checking a proposed model" depth="quick"}
Does $(\mathbb{Z}, <)$, the integers with "less than", satisfy $\varphi$? Does $(\mathbb{N}, \le)$?

:::step{why="Check the four conjuncts for < on the integers."}
Every integer has a larger one; $<$ is asymmetric, transitive, irreflexive. **Yes**, $(\mathbb{Z}, <)$ is a model
(another countable one).
:::

:::step{why="For ≤ test irreflexivity first: is n ≤ n ever true?"}
$n \le n$ is always true, so $\forall x\, \neg R(x, x)$ fails (and asymmetry fails at $x = y$). **No**.
:::

:::answer
$(\mathbb{Z}, <)$ yes; $(\mathbb{N}, \le)$ no. Strict orders, not weak ones.
:::
::::

::::example{#ex-inf-medium level="medium" title="Drop seriality" depth="standard"}
Does $\varphi$ without its first conjunct (only asymmetric, transitive, irreflexive) have a finite model? What is
the smallest?

:::step{why="Without seriality nothing forces any pair at all. Try the empty relation."}
$R = \varnothing$: asymmetric, transitive and irreflexive hold vacuously.
:::

:::step{why="Domains are non-empty, so the smallest domain has one element."}
$D = \{0\}$, $R = \varnothing$ is a model.
:::

:::answer
Yes, already on **one** element. Seriality is the conjunct that pushes models to infinity.
:::
::::

::::example{#ex-inf-gate level="gate" title="The full question (GATE 1991)" depth="standard"}
Does $\varphi$ have finite models? Is it satisfiable? If so, give a countable model.

:::step{why="Read the conjuncts as properties of R: serial, asymmetric, transitive, irreflexive."}
$\varphi$ says $R$ is a strict order without a last element.
:::

:::step{why="Finite worlds: follow successors k + 1 times; pigeonhole gives a repeat; transitivity gives R(a, a)."}
Contradiction with irreflexivity: **no finite models**.
:::

:::step{why="To show satisfiable, exhibit one model; the natural numbers are countable."}
$(\mathbb{N}, <)$ satisfies all four conjuncts.
:::

:::answer
No finite models; **satisfiable**, with the countable model $(\mathbb{N}, <)$.
:::
::::

::::example{#ex-inf-edge level="gate" title="Edge case: drop transitivity instead" depth="standard"}
What is the smallest model of "serial, asymmetric, irreflexive" (no transitivity)?

:::step{why="One element: seriality needs R(0, 0), which irreflexivity forbids."}
Size 1 is impossible.
:::

:::step{why="Two elements: 0 must point to 1 (not to itself) and 1 must point to 0; then (0, 1) and (1, 0) break asymmetry."}
Size 2 is impossible.
:::

:::step{why="Three elements: a cycle gives everyone a successor with no pair in both directions."}
$R = \{(0, 1), (1, 2), (2, 0)\}$ works.
:::

:::answer
**3**. Remove transitivity and the "staircase" can close into a loop; with transitivity the loop would force
$R(0, 0)$.
:::
::::

## A diagonal argument: the Russell-style formula (GATE 2003)

:::intuition{#barber-intuition title="The barber who shaves exactly those who do not shave themselves" depth="standard"}
A village barber claims to shave exactly the people who do not shave themselves. Does the barber shave
himself? If yes, then he is someone who shaves himself, so (by his claim) he does not; if no, then he is
someone who does not, so he does. Either way the claim contradicts itself when you apply it **to the barber
himself**. No such barber can exist, in any village.

In logic: $\neg\exists x \forall y\,(S(x, y) \leftrightarrow \neg S(y, y))$ is **valid**, and the whole proof is one move:
instantiate the $\forall y$ at $y = x$. The same move is behind Cantor's theorem and Russell's paradox, and GATE
2003 hides it inside a longer formula.
:::

:::theorem{#russell-theorem name="No x relates exactly to the non-self-related" depth="standard"}
For any binary $Q$, the sentence $\neg\exists x \forall y\,\big(Q(x, y) \leftrightarrow \neg Q(y, y)\big)$ is valid. Equivalently, for
every $x$, the formula $\forall y\,(Q(x, y) \leftrightarrow \neg Q(y, y))$ is false.
:::

:::proof{#proof-russell of="the diagonal theorem" depth="standard"}
**Idea first:** a "for all $y$" claim may be tested at any $y$, in particular at the $x$ we are talking about.

Fix an interpretation and any element $a$. If $\forall y\,(Q(a, y) \leftrightarrow \neg Q(y, y))$ held, then at $y = a$ we
would get $Q(a, a) \leftrightarrow \neg Q(a, a)$, which is false whatever $Q(a, a)$ is ($p \leftrightarrow \neg p$ is a
contradiction). So the $\forall y$-formula is false for every $a$, hence $\exists x \forall y(\dots)$ is false, and its
negation is true. **Sanity check:** on $D = \{0\}$ the inner formula is $Q(0, 0) \leftrightarrow \neg Q(0, 0)$, false for
both choices of $Q$.
:::

:::trick{#trick-diagonal title="Instantiate a ∀ at the variable outside it" depth="standard"}
When a formula has $\exists x \forall y\,(\dots y \dots)$ or $\forall x\,[\dots \forall y (\dots)]$ and the inside compares
something about $(x, y)$ with something about $(y, y)$, put $y = x$ and see what is left.

**Why it works:** a universal claim must survive every instance; the diagonal instance is often the one
that cannot. **When it fails:** if the $\forall y$ is outside the $\exists x$ ($\forall y \exists x$), the witness $x$ can
depend on $y$ and the diagonal trick no longer applies (see the edge case).
:::

:::note{#recap-russell title="Recap" depth="quick"}
$\forall y\,(Q(x, y) \leftrightarrow \neg Q(y, y))$ is false for every $x$ (put $y = x$); so
$\neg\exists x \forall y (\dots)$ is valid, and any formula built on that bracket can be simplified by replacing it
with F.
:::

### Worked examples: diagonal arguments

::::example{#ex-rus-easy level="easy" title="The barber, formally" depth="quick"}
Domain: the villagers; $S(x, y)$: "$x$ shaves $y$". Show that no villager $b$ satisfies
$\forall y\,(S(b, y) \leftrightarrow \neg S(y, y))$.

:::step{why="Instantiate the universal claim at the barber himself."}
$y = b$: $S(b, b) \leftrightarrow \neg S(b, b)$.
:::

:::step{why="p ↔ ¬p is false on both rows."}
The instance is false, so the universal claim is false for $b$.
:::

:::answer
No such barber exists, in any village: $\neg\exists x \forall y (S(x, y) \leftrightarrow \neg S(y, y))$ is valid.
:::
::::

::::example{#ex-rus-medium level="medium" title="A cousin of the barber" depth="standard"}
Is $\neg\exists x \forall y\,\big(R(x, y) \leftrightarrow \neg R(y, x)\big)$ valid?

:::step{why="Same shape: compare (x, y) with a swapped pair. Try the diagonal y = x."}
$R(x, x) \leftrightarrow \neg R(x, x)$: false for every $x$.
:::

:::step{why="So the ∀y-part fails for every x, the ∃x is false, and the negation is true in every interpretation."}
Valid.
:::

:::answer
**Valid**. Any relation of the form "$x$ is related to $y$ exactly when $y$ is not related to $x$" fails at
$y = x$.
:::
::::

::::example{#ex-rus-gate level="gate" title="Two interpretations (GATE 2003)" depth="standard"}
$\alpha = \forall x\,\big[P_x \leftrightarrow \forall y\,(Q_{xy} \leftrightarrow \neg Q_{yy})\big] \to \forall x\,\neg P_x$. $I_1$: domain $\mathbb{N}$,
$P_x$ = "$x$ is prime", $Q_{xy}$ = "$y$ divides $x$". $I_2$: the same with $P_x$ = "$x$ is composite". Which
interpretations satisfy $\alpha$?

:::step{why="The inner bracket ∀y(Q_xy ↔ ¬Q_yy) is the Russell bracket: false for every x by the diagonal theorem, in every interpretation."}
Replace it by F: the hypothesis becomes $\forall x\,(P_x \leftrightarrow \text{F}) \equiv \forall x\, \neg P_x$.
:::

:::step{why="Now α reads (∀x¬P_x) → (∀x¬P_x)."}
$\alpha \equiv X \to X$: true in **every** interpretation, whatever $P$ and $Q$ mean.
:::

:::step{why="Sanity check in I₁ directly: is the hypothesis true? It says every x is prime iff (false), i.e. no number is prime."}
In $I_1$ the hypothesis is false (2 is prime), so $\alpha$ is vacuously true. In $I_2$ (4 is composite) the same.
:::

:::answer
**Both** $I_1$ and $I_2$ satisfy $\alpha$; in fact $\alpha$ is valid. The meanings of $P$ and "divides" are a
distraction.
:::
::::

::::example{#ex-rus-edge level="gate" title="Edge case: swap the quantifiers and the paradox disappears" depth="standard"}
Is $\forall x \exists y\,\big(Q(x, y) \leftrightarrow \neg Q(y, y)\big)$ satisfiable?

:::step{why="Now y is chosen after x, so we cannot force y = x. One element still fails: y must be 0 = x."}
$D = \{0\}$: $Q(0, 0) \leftrightarrow \neg Q(0, 0)$ is F. No model on one element.
:::

:::step{why="Two elements: give 0 a loop and 1 none, then choose each x's partner to be the other element."}
$Q(0, 0)$ = T, $Q(1, 1)$ = F. For $x = 0$ take $y = 1$: need $Q(0, 1) \leftrightarrow \neg Q(1, 1)$ = T, so $Q(0, 1)$ = T. For
$x = 1$ take $y = 0$: need $Q(1, 0) \leftrightarrow$ F, so $Q(1, 0)$ = F.
:::

:::answer
**Satisfiable** (smallest model: 2 elements). The diagonal argument needs the order $\exists x \forall y$; with
$\forall x \exists y$ the witness escapes the diagonal.
:::
::::

## Logic programs as first-order sentences (GATE 2003)

:::intuition{#horn-intuition title="A rule is a promise about every value of its variables" depth="standard"}
A logic program (as in Prolog) is a list of rules like "$A(x) \leftarrow B(x, y), C(y)$": "$A(x)$ holds **if**
$B(x, y)$ and $C(y)$ hold". The arrow points from the body to the head, so the rule is the implication
$B(x, y) \wedge C(y) \to A(x)$, and it is meant for **every** value of every variable. A rule with an empty head,
"$\leftarrow B(x, x)$", says the body must never happen. The whole program asserts all its rules together, so it is
a **conjunction**.

The interesting part is the variable $y$ that appears only in the body. "For all $x$ and all $y$: if
$B(x, y) \wedge C(y)$ then $A(x)$" is the same as "for all $x$: if **some** $y$ has $B(x, y) \wedge C(y)$, then
$A(x)$". That is the null-quantification flip again: $y$ leaves a hypothesis, so $\forall y$ becomes $\exists y$.
:::

:::definition{#horn-def term="Horn clauses and their reading" depth="standard"}
| Program clause | Name | First-order sentence |
|:--|:--|:--|
| $H \leftarrow B_1, \dots, B_n$ | rule | $\forall \vec{v}\,(B_1 \wedge \dots \wedge B_n \to H)$, $\vec{v}$ = all variables |
| $H \leftarrow$ | fact | $\forall \vec{v}\, H$ |
| $\leftarrow B_1, \dots, B_n$ | goal / denial | $\forall \vec{v}\, \neg(B_1 \wedge \dots \wedge B_n) \equiv \neg\exists \vec{v}\,(B_1 \wedge \dots \wedge B_n)$ |
| a program | | the **conjunction** of its clauses |

Each clause is a disjunction with at most one positive literal ($\neg B_1 \vee \dots \vee \neg B_n \vee H$): a **Horn
clause**. Variables that occur only in the body can be quantified existentially inside the hypothesis.
:::

:::derivation{#horn-derivation of="body-only variables become ∃" depth="standard"}
For the rule $A(x) \leftarrow B(x, y), C(y)$:
$$\forall x \forall y\,\big(B(x, y) \wedge C(y) \to A(x)\big) \equiv \forall x\,\big(\exists y\,(B(x, y) \wedge C(y)) \to A(x)\big),$$
by the null-quantification line $\forall y\,(\Phi(y) \to W) \equiv \exists y\, \Phi(y) \to W$ with $W = A(x)$, which has no
free $y$. For the denial $\leftarrow B(x, x)$: $\forall x\, \neg B(x, x) \equiv \neg\exists x\, B(x, x)$ (De Morgan). **Sanity check**
on $D = \{0, 1\}$, $B = \{(0, 1)\}$, $C = \{1\}$, $A = \varnothing$: the left side fails at $x = 0, y = 1$; the right side
fails at $x = 0$ (the witness $y = 1$ exists, $A(0)$ is F). They agree.
:::

:::trap{#trap-horn-forall title="A body-only variable is not ∀ inside the hypothesis" depth="quick"}
The tempting translation $\forall x\,[\forall y\,(B(x, y) \wedge C(y)) \to A(x)]$ (options B and D of GATE 2003) demands
$A(x)$ only when **every** $y$ is a $B$-partner of $x$ and a $C$: far weaker than the program. And joining the
clauses with $\vee$ (option C) would let the program hold while one of its rules is broken.
:::

:::note{#recap-horn title="Recap" depth="quick"}
Rule $H \leftarrow B$: $\forall(B \to H)$; denial $\leftarrow B$: $\neg\exists B$; program: $\wedge$ of clauses; a variable only in
the body becomes $\exists$ inside the hypothesis.
:::

### Worked examples: logic programs

::::example{#ex-horn-easy level="easy" title="A grandparent rule" depth="quick"}
Translate $G(x, z) \leftarrow P(x, y), P(y, z)$ ("$x$ is a grandparent of $z$ if $x$ is a parent of some $y$ who is
a parent of $z$").

:::step{why="A rule is the universal closure of body → head."}
$\forall x \forall y \forall z\,\big(P(x, y) \wedge P(y, z) \to G(x, z)\big)$.
:::

:::step{why="y occurs only in the body, so ∀y moves into the hypothesis as ∃y."}
$\forall x \forall z\,\big(\exists y\,(P(x, y) \wedge P(y, z)) \to G(x, z)\big)$.
:::

:::answer
$\forall x \forall z\,(\exists y\,(P(x, y) \wedge P(y, z)) \to G(x, z))$, which reads exactly like the English rule.
:::
::::

::::example{#ex-horn-medium level="medium" title="A clause with no head" depth="standard"}
Translate the denial $\leftarrow B(x, x)$ and say what it forbids.

:::step{why="A headless clause has head F: ∀x(B(x, x) → F)."}
$\forall x\,(B(x, x) \to \text{F}) \equiv \forall x\, \neg B(x, x)$.
:::

:::step{why="De Morgan for quantifiers gives the form GATE uses."}
$\equiv \neg\exists x\, B(x, x)$.
:::

:::answer
$\neg\exists x\, B(x, x)$: no element is $B$-related to itself ($B$ is irreflexive).
:::
::::

::::example{#ex-horn-gate level="gate" title="Which sentence is the program? (GATE 2003)" depth="standard"}
$P$: $A(x) \leftarrow B(x, y), C(y)$ and $\leftarrow B(x, x)$. Options: (A) $\forall x[\exists y(B(x, y) \wedge C(y)) \to A(x)] \wedge
\neg\exists x\, B(x, x)$; (B), (D) the same with $\forall y$; (C) as (A) with $\vee$.

:::step{why="Translate each clause; the program is their conjunction."}
$\forall x \forall y\,(B(x, y) \wedge C(y) \to A(x)) \wedge \forall x\, \neg B(x, x)$.
:::

:::step{why="Move the body-only y into the hypothesis as ∃y (derivation above); rewrite the denial with De Morgan."}
$\forall x\,[\exists y\,(B(x, y) \wedge C(y)) \to A(x)] \wedge \neg\exists x\, B(x, x)$: option (A).
:::

:::step{why="Refute (B)/(D): a world where the program fails but ∀y-version holds."}
$D = \{0, 1\}$, $B = \{(0, 1)\}$, $C = \{1\}$, $A = \varnothing$: the rule fails at $x = 0$; but $\forall y(B(0, y) \wedge C(y))$ is
F (at $y = 0$), so (B) holds. (C): with $B = \{(0, 0)\}$ the denial fails while the $\vee$ can still be true.
:::

:::answer
**(A)**. (In the printed paper, (B) and (D) are identical; both are wrong for the same reason.)
:::
::::

::::example{#ex-horn-edge level="gate" title="Edge case: a head variable that is not in the body" depth="standard"}
Translate $P(x) \leftarrow Q(y)$.

:::step{why="Universal closure over both variables."}
$\forall x \forall y\,(Q(y) \to P(x))$.
:::

:::step{why="y is only in the body: ∀y becomes ∃y in the hypothesis. Then x is only in the head: ∀x moves into the conclusion unchanged."}
$\forall x\,(\exists y\, Q(y) \to P(x)) \equiv \exists y\, Q(y) \to \forall x\, P(x)$.
:::

:::answer
$\exists y\, Q(y) \to \forall x\, P(x)$: "if anything is a $Q$, then everything is a $P$", a strong rule hidden in a
short clause.
:::
::::

## Induction as a first-order statement (GATE 2025)

:::intuition{#domino-intuition title="Dominoes in a row" depth="standard"}
Stand dominoes at positions $0, 1, 2, \dots$. If domino 0 falls, and every domino that falls knocks over the
next one, then every domino falls. That is the principle of mathematical induction:
$\big(P(0) \wedge \forall x\,(P(x) \to P(x + 1))\big) \to \forall x\, P(x)$, for any property $P$ of natural numbers.

Each piece matters. Start at domino 1000 and push forwards, and the dominoes $0, \dots, 999$ stay standing.
Push **backwards** from domino 1000 ($P(x) \to P(x - 1)$), and $1001, 1002, \dots$ stay standing. The base must be
the first domino and the push must go towards the infinite end.
:::

:::definition{#induction-def term="The induction principle over ℕ" depth="standard"}
Domain $\mathbb{N} = \{0, 1, 2, \dots\}$ with its usual successor $x + 1$. For **every** predicate $P$:
$$\big(P(0) \wedge \forall x\,(P(x) \to P(x + 1))\big) \to \forall x\, P(x).$$
Here the domain and the meaning of $+1$ are **fixed** (the natural numbers); only $P$ is arbitrary. So
"always true" in GATE 2025 means true in $\mathbb{N}$ for every choice of $P$, not true in every interpretation
of the symbols (in other domains, with other meanings of "+1", it can fail).
:::

:::theorem{#induction-theorem name="Induction is sound on ℕ" depth="standard"}
For every subset $S \subseteq \mathbb{N}$ (the numbers where $P$ holds): if $0 \in S$ and $n \in S \Rightarrow n + 1 \in S$, then
$S = \mathbb{N}$.
:::

:::proof{#proof-induction of="the induction principle" depth="standard"}
**Idea first:** a first failure would need a predecessor that did not fail.

Suppose $S \ne \mathbb{N}$. Every non-empty set of natural numbers has a least element, so let $m$ be the least
number not in $S$. Since $0 \in S$, $m \ne 0$, so $m - 1$ is a natural number, and $m - 1 \in S$ (it is smaller than
$m$). The step rule gives $(m - 1) + 1 = m \in S$: contradiction. **Sanity check** on a finite initial segment:
on $\{0, \dots, 5\}$ (with the step required only where $x + 1 \le 5$), the only set containing 0 and closed
under $+1$ is the whole segment.
:::

:::trap{#trap-induction-base title="Wrong base, or wrong direction" depth="quick"}
$(P(1000) \wedge \forall x(P(x) \to P(x + 1))) \to \forall x P(x)$ fails for $P(x)$: "$x \ge 1000$"; the version with
$P(x) \to P(x - 1)$ and base 1000 fails for "$x \le 1000$"; base 0 with $P(x) \to P(x - 1)$ fails for "$x = 0$". The
examiners expect a student who "recognises induction" in any option with a base and a step.
:::

:::note{#recap-induction title="Recap" depth="quick"}
On $\mathbb{N}$: base $P(0)$ and step $P(x) \to P(x + 1)$ give $\forall x P(x)$ (least-counterexample proof). A
different base, or a step towards 0, leaves part of $\mathbb{N}$ uncovered; one predicate shows it.
:::

### Worked examples: induction

::::example{#ex-ind-easy level="easy" title="Base 1000, forwards" depth="quick"}
Refute $\big(P(1000) \wedge \forall x(P(x) \to P(x + 1))\big) \to \forall x P(x)$ over $\mathbb{N}$.

:::step{why="The dominoes from 1000 on fall; the ones before stay up. Choose P to describe exactly that."}
$P(x)$: "$x \ge 1000$". Then $P(1000)$ is T, and $x \ge 1000 \Rightarrow x + 1 \ge 1000$.
:::

:::step{why="Conclusion fails at any smaller number."}
$P(0)$ is F, so $\forall x P(x)$ is F.
:::

:::answer
Hypothesis T, conclusion F: not always true.
:::
::::

::::example{#ex-ind-medium level="medium" title="Base 1000, backwards" depth="standard"}
Refute $\big(P(1000) \wedge \forall x(P(x) \to P(x - 1))\big) \to \forall x P(x)$.

:::step{why="Backwards steps from 1000 reach 999, 998, …, 0 but never 1001."}
$P(x)$: "$x \le 1000$". $P(1000)$ is T; if $x \le 1000$ then $x - 1 \le 1000$.
:::

:::step{why="Check the conclusion above 1000."}
$P(1001)$ is F.
:::

:::answer
Not always true. (At $x = 0$, the term $0 - 1$ is not a natural number; read it as $0$ or restrict the step to
$x \ge 1$, and the counter-example works either way.)
:::
::::

::::example{#ex-ind-gate level="gate" title="Which ONE is TRUE? (GATE 2025)" depth="standard"}
Over $\mathbb{N}$, for an arbitrary $P$: (A) base $P(0)$, step $P(x) \to P(x + 1)$; (B) base $P(0)$, step
$P(x) \to P(x - 1)$; (C) base $P(1000)$, step $P(x) \to P(x - 1)$; (D) base $P(1000)$, step $P(x) \to P(x + 1)$;
each concluding $\forall x P(x)$.

:::step{why="(A) is the induction principle, proved by the least-counterexample argument."}
(A) is **always true**.
:::

:::step{why="(C) and (D): the worked examples above give P(x): x ≤ 1000 and P(x): x ≥ 1000."}
(C), (D) fail.
:::

:::step{why="(B): base 0 and steps downwards never leave 0. Take P(x): x = 0."}
$P(0)$ T; for $x \ge 1$, $P(x)$ is F so the step is vacuous; at $x = 0$ the step stays at 0. Conclusion
$P(1)$ = F.
:::

:::answer
**(A)**, the principle of mathematical induction.
:::
::::

::::example{#ex-ind-edge level="gate" title="Edge case: steps of 2 need two bases" depth="standard"}
Over $\mathbb{N}$, is $\big(P(0) \wedge \forall x(P(x) \to P(x + 2))\big) \to \forall x P(x)$ true for every $P$? What about adding $P(1)$?

:::step{why="Steps of 2 from 0 reach only the even numbers."}
$P(x)$: "$x$ is even" satisfies the hypothesis and fails at 1. Not always true.
:::

:::step{why="With P(0) and P(1), every n is reached from 0 or 1 by steps of 2: induct on the pair (P(2k), P(2k + 1))."}
Let $S(k)$: $P(2k) \wedge P(2k + 1)$. $S(0)$ holds; $S(k) \to S(k + 1)$ by two uses of the step. Ordinary induction
gives $\forall k\, S(k)$, which covers every number.
:::

:::answer
With one base: **no**; with bases $P(0)$ and $P(1)$: **yes**. A step of size $d$ needs $d$ consecutive bases.
:::
::::

## Small models: sentences of the form ∃…∃∀…∀ (GATE 2018)

:::intuition{#small-model-intuition title="Keep only the witnesses" depth="standard"}
Suppose a sentence says "there are three people $s, t, u$ such that, for everybody $v, w, x, y$, some
condition holds", and the condition talks only about who is related to whom (no functions like "the mother
of"). Take a world where it is true, with 7 people, and pick the three witnesses. Now send everybody else
home. Is the sentence still true in the smaller world of three people?

The $\exists$ part is fine: the witnesses are still there. The $\forall$ part is a claim about **every** choice of
$v, w, x, y$; in the smaller world there are **fewer** choices, all of which were already checked in the big
world. A condition without quantifiers and without functions only looks at the chosen elements, so it has the
same value as before. So the sentence stays true: a model of size at most 3 exists.
:::

:::definition{#bs-def term="The ∃*∀* (Bernays–Schönfinkel) class and substructures" depth="standard"}
A sentence is in the **$\exists^*\forall^*$ class** if it is in prenex form
$\exists x_1 \dots \exists x_k\, \forall y_1 \dots \forall y_m\; \psi$, where $\psi$ is quantifier-free and uses only predicate
symbols and $=$ (no function symbols, no constants other than these variables).

If $I$ is an interpretation with domain $D$ and $E \subseteq D$ is non-empty, the **restriction** of $I$ to $E$ has
domain $E$ and each predicate keeps exactly its tuples that lie inside $E$. A quantifier-free $\psi$ has the same
value in $I$ and in the restriction, for every choice of values from $E$.
:::

:::theorem{#small-model-theorem name="The small-model property" depth="standard"}
If an $\exists^*\forall^*$ sentence with $k \ge 1$ existential quantifiers has a model, it has a model with at most $k$
elements. (With $k = 0$, at most 1 element.) Hence satisfiability of such sentences is **decidable**: try all
interpretations on domains of size $1, \dots, k$.
:::

:::proof{#proof-small-model of="the small-model property" depth="standard"}
**Idea first:** restrict the model to the witnesses; a $\forall$ over a smaller set checks a subset of the old cases.

Let $I \models \exists x_1 \dots \exists x_k \forall \vec{y}\, \psi$ and choose witnesses $a_1, \dots, a_k$ (not necessarily different), so
$I \models \forall \vec{y}\, \psi(a_1, \dots, a_k, \vec{y})$. Let $E = \{a_1, \dots, a_k\}$, $1 \le |E| \le k$, and $J$ the restriction of $I$ to $E$.
For any values $\vec{b}$ from $E$, $\psi(\vec{a}, \vec{b})$ is true in $I$ (because $\vec{b}$ is one of the cases of the
$\forall$) and therefore true in $J$ (same atoms, same equalities). So $J \models \forall \vec{y}\, \psi(\vec{a}, \vec{y})$, and the
$a_i \in E$ witness the $\exists$'s: $J \models$ the sentence. Two hypotheses were used: **no function symbols** (a term
like $f(a_1)$ could point outside $E$) and **no $\exists$ after a $\forall$** (a witness for $\forall y \exists z$ could lie outside
$E$). **Sanity check:** $\exists x \forall y\, R(x, y)$ in $(\mathbb{N}, \le)$, witness $0$: restricted to $\{0\}$, $R(0, 0)$ is T.
:::

:::viz{#small-model-viz spec="qlaw-small-model" mode="animate" depth="standard"}
:::

:::trap{#trap-bs-limits title="Shrinking works; nothing else is guaranteed" depth="quick"}
From "a model of size 7 exists" you may conclude "a model of size $\le 3$ exists" (option A of GATE 2018). You
may **not** conclude that every model has 7 elements, that no model has more than 7, or that none has at most 3.
And the shrinking fails for $\forall\exists$ sentences: the GATE 1991 sentence is $\forall\exists$-shaped and has no finite
model at all.
:::

:::note{#recap-small-model title="Recap" depth="quick"}
$\exists^k\forall^*\psi$ without function symbols: restrict any model to the $k$ witnesses and it stays a model, so a model
of size $\le k$ exists and satisfiability is decidable. Functions or $\forall\exists$ break the argument.
:::

### Worked examples: small models

::::example{#ex-bs-easy level="easy" title="Shrinking to one element" depth="quick"}
$\exists x \forall y\, R(x, y)$ is true in $(\mathbb{N}, \le)$. Find a one-element model.

:::step{why="The sentence has k = 1 existential; find its witness in the given model."}
$x = 0$: $0 \le y$ for every $y$.
:::

:::step{why="Restrict R to the witness set {0}: keep the pair (0, 0), since 0 ≤ 0."}
$D = \{0\}$, $R = \{(0, 0)\}$: $\forall y\, R(0, y)$ is $R(0, 0)$ = T.
:::

:::answer
$D = \{0\}$ with $R(0, 0)$ true: a model of size $1 = k$.
:::
::::

::::example{#ex-bs-medium level="medium" title="Models may be stuck at one size" depth="standard"}
Find all domain sizes of models of $\exists x \exists y \forall z\,(x \ne y \wedge (z = x \vee z = y))$.

:::step{why="Read it: two different elements x, y, and every z is one of them."}
The domain has exactly two elements.
:::

:::step{why="Check that both sizes 1 and 3 fail: size 1 breaks x ≠ y, size 3 has a z equal to neither."}
Only size 2.
:::

:::answer
Exactly **2**. So in the $\exists^*\forall^*$ class a model cannot always be enlarged: "no model of size $> 7$" can be true for
some $\varphi$. But it is not **necessarily** true: $\exists s \exists t \exists u \forall v\,(v = v)$ has models of every size.
:::
::::

::::example{#ex-bs-gate level="gate" title="Which is necessarily true? (GATE 2018)" depth="standard"}
$\varphi = \exists s \exists t \exists u \forall v \forall w \forall x \forall y\, \psi$, $\psi$ quantifier-free, predicates and $=$ only. $\varphi$ has a
7-element model. (A) some model has $\le 3$ elements; (B) no model has $\le 3$; (C) no model has $> 7$; (D) every
model has exactly 7.

:::step{why="The shape is ∃³∀⁴ with no function symbols: the small-model theorem applies with k = 3."}
Restrict the 7-element model to the witnesses of $s, t, u$: a model with 1, 2 or 3 elements. (A) is true.
:::

:::step{why="(A) directly contradicts (B), and the restricted model also contradicts (D)."}
(B), (D) false.
:::

:::step{why="(C) and (D) can fail: take a ψ that is always true."}
$\psi = (v = v)$: $\varphi$ has models of every size, including 8. So (C) is not necessarily true.
:::

:::answer
**(A)**.
:::
::::

::::example{#ex-bs-edge level="gate" title="Edge case: a ∀∃ sentence does not shrink" depth="standard"}
$\theta = \forall x \exists y\, R(x, y) \wedge \forall x\, \neg R(x, x)$. Take its model $D = \{0, 1\}$, $R = \{(0, 1), (1, 0)\}$ and try to
shrink it to one element.

:::step{why="Keep only the element 0. The pair (0, 1) leaves with 1."}
$D = \{0\}$, $R = \varnothing$: now $\forall x \exists y\, R(x, y)$ needs $R(0, 0)$, which fails.
:::

:::step{why="And no one-element model exists at all: seriality needs R(0, 0), irreflexivity forbids it."}
The smallest model has **2** elements.
:::

:::answer
The witness for $y$ depended on $x$ and lived outside the kept set. For $\forall\exists$ sentences the small-model
argument fails; at the extreme (GATE 1991) there is no finite model at all.
:::
::::

## Try it: the Quantifier Lab

Type a sentence in the **Search for models** tab and the Lab tries every interpretation of its predicates on
domains of size 1, 2 and 3, reporting the first counter-model (so the sentence is not valid) or the first
model (so it is satisfiable). Use ASCII or symbols: `forall x`, `exists y`, `->`, `&`, `|`, `~`. Try the
presets for $\exists\forall \Rightarrow \forall\exists$ and its converse, then type the GATE 2016 options and watch the split world
appear for (D). Finally type the 1991 sentence: no model up to size 3, exactly as the theorem predicts, and a
reminder that the search proves nothing about validity.

:::lab{#lab-models lab="quantifier-lab" tab="models" depth="standard"}
:::

## GATE questions on this lesson

All sixteen previous-year questions. Try each before opening the solution.

:::pyq{id="cse-1991-b-15-b" tests="strict-order-def,no-finite-model-theorem,ex-inf-gate,trap-finite-search" depth="standard"}
:::

:::pyq{id="cse-1992-a-2-xv" tests="one-way-laws,one-way-theorem,ex-one-easy,trap-forall-or" depth="standard"}
:::

:::pyq{id="cse-2003-cs-32" tests="one-way-theorem,trap-converse-arrow,ex-one-edge" depth="standard"}
:::

:::pyq{id="cse-2003-cs-33" tests="russell-theorem,trick-diagonal,ex-rus-gate" depth="standard"}
:::

:::pyq{id="cse-2003-cs-71" tests="horn-def,horn-derivation,trap-horn-forall,ex-horn-gate" depth="standard"}
:::

:::pyq{id="it-2005-cs-36" tests="one-way-theorem,trap-converse-arrow,ex-one-medium" depth="standard"}
:::

:::pyq{id="it-2006-cs-21" tests="validity-def,trap-one-model,ex-val-medium" depth="standard"}
:::

:::pyq{id="it-2007-cs-21" tests="one-way-theorem,trap-forall-or,swap-theorem,trap-swap" depth="standard"}
:::

:::pyq{id="it-2008-it-21" tests="null-laws,null-derivation,ex-null-gate" depth="standard"}
:::

:::pyq{id="cse-2013-cs-47" tests="two-way-laws,ex-two-gate" depth="standard"}
:::

:::pyq{id="cse-2015-2-cs-55" tests="two-way-laws,swap-theorem,ex-swap-gate,ex-two-edge" depth="standard"}
:::

:::pyq{id="cse-2016-2-cs-27" tests="one-way-laws,trick-split-domain,ex-one-gate" depth="standard"}
:::

:::pyq{id="cse-2017-1-cs-2" tests="swap-theorem,trap-empty-domain,ex-swap-medium" depth="standard"}
:::

:::pyq{id="cse-2018-cs-28" tests="bs-def,small-model-theorem,trap-bs-limits,ex-bs-gate" depth="standard"}
:::

:::pyq{id="cse-2020-cs-39" tests="null-laws,trap-null-flip,ex-null-medium" depth="standard"}
:::

:::pyq{id="cse-2025-2-cs-5" tests="induction-def,induction-theorem,trap-induction-base,ex-ind-gate" depth="standard"}
:::

## Practice

Our own questions in GATE formats: the laws first, then models and counter-models, then the unusual
sentence classes.

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

:::practice{id="nx-dm-02-02-q13" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Quantifier laws and validity on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Interpretation | non-empty domain + a meaning for every predicate (+ values of free variables) |
| Verdicts | valid = true in all; satisfiable = true in one; contingent = it and its negation satisfiable |
| Method | not valid: one counter-model (two elements, properties split); valid: a proof |
| Two-way laws | $\neg\forall = \exists\neg$; $\forall$ over $\wedge$; $\exists$ over $\vee$; $\exists x(A \to B) \equiv \forall x A \to \exists x B$; like quantifiers commute |
| One-way laws | $\forall A \vee \forall B \Rightarrow \forall(A \vee B)$; $\exists(A \wedge B) \Rightarrow \exists A \wedge \exists B$; $\forall(A \to B) \Rightarrow (\forall A \to \forall B)$; $\forall \Rightarrow \exists$ |
| Null quantification | past $W$ (no free $x$) unchanged, except out of a hypothesis: $\forall x(A \to W) \equiv \exists x A \to W$, $\exists x(A \to W) \equiv \forall x A \to W$ |
| Prenex | remove arrows, push $\neg$, rename apart, pull out; merge only $\forall$/$\wedge$, $\exists$/$\vee$ |
| Order | $\exists y \forall x R \Rightarrow \forall x \exists y R$; converse fails on the 2-element diagonal |
| Infinite models | serial strict order: $(\mathbb{N}, <)$ is a model, no finite model (GATE 1991) |
| Diagonal | $\neg\exists x \forall y(Q(x, y) \leftrightarrow \neg Q(y, y))$ is valid: put $y = x$ |
| Logic programs | $H \leftarrow B$ is $\forall(B \to H)$; body-only variables become $\exists$; denial $\leftarrow B$ is $\neg\exists B$ |
| Induction | $P(0) \wedge \forall x(P(x) \to P(x + 1)) \to \forall x P(x)$ on $\mathbb{N}$; other bases or directions fail |
| Small models | $\exists^k\forall^*$, no functions: a model of size $\le k$ exists; satisfiability decidable |
:::

:::note{#further-depth title="Further depth: what cannot be decided, and why small domains are not enough" depth="deep"}
For propositional logic, validity is decidable by truth table. For first-order logic in general it is not:
there is no algorithm that, given any sentence, always halts and says whether it is valid (Church and
Turing, 1936). What does exist is a complete **proof system**: every valid sentence has a proof (Gödel's
completeness theorem), so validity is "semi-decidable": search proofs and counter-models in parallel, and if
the sentence is valid the proof search eventually succeeds, but for some invalid sentences (like the
negation of the 1991 sentence) no finite counter-model exists and the counter-model search runs forever.
Some fragments are decidable: the $\exists^*\forall^*$ class of GATE 2018, and sentences with only unary predicates (a
sentence with $m$ unary predicates, if satisfiable, has a model of at most $2^m$ elements, one per
combination of properties). Finally, if a sentence has an infinite model it has a countable one
(Löwenheim–Skolem), which is why GATE 1991 asks for a countable model.
:::
