---
id: predicates-quantifiers
subject: dm
chapter: predicate-logic
title: Predicates, quantifiers and translation
order: 1
prerequisites: [propositions-connectives, equivalence-normal-forms]
pyq_topics: [dm/logic]
est_minutes: 70
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every evaluation, translation, negation, PYQ key and practice answer is recomputed in content/gate-notes/_checks/dm/l2_01_quantifiers.py with predlib.py (all interpretations on domains of size 1 to 3, plus hand-built worlds)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 26–37, set B pp. 168–173, set C pp. 296–311, set D pp. 676–679. Set A's gloss of 'only A are B' (p. 34) is reversed (see _errata/dm.md); we use ∀x(B(x) → A(x))."
  - "Facts checked against standard textbooks: K. H. Rosen, Discrete Mathematics and its Applications (predicates, quantifiers, nested quantifiers, translation); C. L. Liu, Elements of Discrete Mathematics; H. B. Enderton, A Mathematical Introduction to Logic."
  - "PYQs: src/gate/questions.json (dm/logic); all nineteen keys are re-derived in l2_01_quantifiers.py. The scope of GATE 2008's option A and the divisors in GATE 2019 are discussed in the lesson and the solutions."
updated: "2026-10-23"
---

Propositional logic treats "Socrates is mortal" as an unbreakable atom $p$. It cannot see that the
sentence is about **Socrates** and about the property **mortal**, so it cannot explain why "all humans
are mortal" and "Socrates is human" together force "Socrates is mortal". First-order logic opens the
atom. It splits a sentence into **objects** (Socrates, the number 7, a graph) and **properties or
relations** of those objects ("is mortal", "divides", "is taller than"), and it adds two new words,
"for all" ($\forall$) and "there exists" ($\exists$), that talk about many objects at once.

This lesson builds that language and, above all, teaches you to **translate** with it, because that is
what GATE asks: nineteen previous-year questions, most of them "which formula represents this English
sentence" or "which formula is equivalent to this one". Three skills settle nearly all of them: the
pairing rule (**$\forall$ goes with $\to$, $\exists$ goes with $\wedge$**), the order of nested
quantifiers ($\forall x \exists y$ is not $\exists y \forall x$), and pushing a negation through
quantifiers (each quantifier flips, the inside is negated). We prove each rule, test it on tiny worlds,
and name the wrong option examiners expect.

## Where this fits

This lesson needs [Chapter 1](lesson:propositions-connectives): the truth tables of the connectives,
and above all the fact that $p \to q$ is true whenever $p$ is false. It also uses the laws of
[Lesson 2 of Chapter 1](lesson:equivalence-normal-forms), especially De Morgan's laws and
$\neg(p \to q) \equiv p \wedge \neg q$. The next lesson of this chapter turns from translation to
**validity**: which quantified formulas are true in every interpretation, which quantifier laws hold in
one direction only, and how to refute a claim with a counter-model. Chapter 3 then writes the
properties of relations (reflexive, symmetric, transitive) and of functions (one-to-one, onto) as
quantified formulas, so the reading skills built here are used again there.

Four conventions hold throughout this subject, as in GATE. **Domains are non-empty.** A quantifier
**binds as tightly as $\neg$**: $\forall x\, P(x) \to Q(x)$ means $(\forall x\, P(x)) \to Q(x)$, and
GATE options always bracket the scope they intend. "**All A are B**" is $\forall x(A(x) \to B(x))$ and
"**some A are B**" is $\exists x(A(x) \wedge B(x))$. And $\exists! x$ means "there is exactly one $x$".

:::table{#radar title="GATE radar: predicates, quantifiers and translation" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 19 (2004–2026) |
| Marks | 6 one-mark, 13 two-mark; 17 MCQ and 2 MSQ (2023, 2025) |
| Pattern 1 | Translate an English sentence into a formula: 2004, 2005, 2006, 2008, 2009 (Q23), 2012, 2025, 2026 |
| Pattern 2 | "Not all", "none of", "not every": 2007, 2013, 2014 (both papers) |
| Pattern 3 | Negate a quantified formula or find an equivalent one: 2004 (IT), 2008 (IT), 2009 (Q26), 2010 |
| Pattern 4 | Read a formula about numbers (prime, divides, a larger prime): 2011, 2019 |
| Pattern 5 | Order of quantifiers and what implies what: 2023 (and inside 2004, 2005, 2026) |
| What examiners test | That "all" takes $\to$ and "some" takes $\wedge$; that "tigers and lions" means tiger **or** lion; that $\neg\forall \equiv \exists\neg$; that a restriction is **not** negated when you negate a restricted quantifier; that $\forall x \exists y$ and $\exists y \forall x$ differ; and that "exactly one" needs existence **and** uniqueness |
:::

## The idea: sentences with a hole

:::intuition{#hole-intuition title="A predicate is a sentence with a hole in it" depth="standard"}
Take the sentence "$7$ is prime" and cut out the $7$: you get "___ is prime", a sentence with a hole.
On its own it is neither true nor false; fill the hole with $7$ and it becomes true, fill it with $8$
and it becomes false. That sentence-with-a-hole is a **predicate**. Writing $P(x)$ for "$x$ is prime"
simply names the hole $x$.

There are two other ways to turn the open sentence into a proposition without picking one value. You
can claim that **every** value fills the hole truthfully ("every number is prime", false) or that **at
least one** does ("some number is prime", true). Those two claims are the quantifiers $\forall$ and
$\exists$. So predicate logic has exactly three ways to close a hole: substitute an object, say
"for all", or say "there exists".
:::

## Predicates and domains

:::definition{#predicate-def term="Predicate, arity and domain" depth="quick"}
A **predicate** is a statement $P(x_1, \dots, x_n)$ about $n$ objects whose truth value is fixed once
the objects are fixed; $n$ is its **arity**. "$x$ is even" is unary ($E(x)$), "$x$ divides $y$" is
binary ($x \mid y$), "$x$ fools $y$ at time $t$" is ternary ($F(x, y, t)$). A 0-ary predicate is just a
proposition.

The objects come from a **domain** (universe of discourse) $D$, a non-empty set fixed in advance:
the integers, the students in a class, all graphs. Equality $x = y$ is a binary predicate that always
means "the same object".
:::

:::definition{#interpretation-def term="Interpretation (a world)" depth="standard"}
An **interpretation** fixes the domain and says, for each predicate, exactly which tuples make it true
(its **extension**). For a unary predicate that is a subset of $D$; for a binary one, a set of ordered
pairs, i.e. a relation, which we can draw as a grid with a mark in row $x$, column $y$ when $R(x, y)$
holds.

Example: $D = \{1, 2, 3, 4\}$, $E(x)$: "$x$ is even" has extension $\{2, 4\}$; $L(x, y)$: "$x < y$" has
extension $\{(1,2), (1,3), (1,4), (2,3), (2,4), (3,4)\}$. A formula with no free variables (defined
below) is true or false **in an interpretation**; change the world and its value may change.
:::

:::trap{#trap-open-formula title="An open formula is not a proposition" depth="quick"}
$P(x) \to Q(x)$ has no truth value until $x$ is fixed or quantified, exactly like "$x$ is composite" in
Chapter 1. The fact that $x$ is a letter does not make it "any $x$": in logic an unquantified variable
is a hole, not a hidden $\forall$. Writing $P(x)$ when you mean $\forall x\, P(x)$ is the error behind
several wrong options in GATE 2008.
:::

## The quantifiers ∀ and ∃

:::intuition{#and-or-intuition title="∀ is a big AND, ∃ is a big OR" depth="standard"}
Line up the elements of the domain in a strip and write the value of $P$ under each one. "$\forall x\,
P(x)$" asks the strip a strict question: is **every** cell T? It is an AND of all the cells, so one F
cell (a **counterexample**) sinks it. "$\exists x\, P(x)$" asks a generous question: is **some** cell
T? It is an OR of all the cells, so one T cell (a **witness**) is enough.

This picture is not just a metaphor. On a finite domain $\{a_1, \dots, a_n\}$ the quantified formula
literally **is** the long conjunction or disjunction, and everything you know about $\wedge$ and $\vee$
(De Morgan, absorption, "one F kills an AND") carries over. On an infinite domain we cannot write the
infinite AND, but the meaning is the same: true when every element passes, or when some element
passes.
:::

:::definition{#quantifier-def term="Universal and existential quantifiers" depth="quick"}
In an interpretation with domain $D$:

| Formula | True when | False when |
|:--|:--|:--|
| $\forall x\, \varphi(x)$ | $\varphi(d)$ is true for **every** $d \in D$ | some $d$ makes $\varphi(d)$ false (a counterexample) |
| $\exists x\, \varphi(x)$ | $\varphi(d)$ is true for **at least one** $d \in D$ (a witness) | $\varphi(d)$ is false for every $d$ |

Readings of $\forall$: for all, for every, for each, any, all, everyone. Readings of $\exists$: there
exists, there is, for some, at least one, someone. The quantified variable is a dummy:
$\forall x\, P(x)$ and $\forall y\, P(y)$ say the same thing.
:::

:::theorem{#expansion-theorem name="Finite expansion" depth="standard"}
If $D = \{a_1, a_2, \dots, a_n\}$ then
$\forall x\, \varphi(x) \equiv \varphi(a_1) \wedge \varphi(a_2) \wedge \dots \wedge \varphi(a_n)$ and
$\exists x\, \varphi(x) \equiv \varphi(a_1) \vee \varphi(a_2) \vee \dots \vee \varphi(a_n)$.
:::

:::proof{#proof-expansion of="the finite expansion" depth="standard"}
**Idea first:** both sides are true in exactly the same situations, because both say "every cell" (or
"some cell").

The conjunction $\varphi(a_1) \wedge \dots \wedge \varphi(a_n)$ is true exactly when each conjunct is
true, i.e. when $\varphi(d)$ holds for every $d$ in the list. Since the list is the whole domain, that
is the definition of $\forall x\, \varphi(x)$. The disjunction is true exactly when at least one
disjunct is true, i.e. when some $d \in D$ makes $\varphi(d)$ true, which is the definition of
$\exists x\, \varphi(x)$. **Sanity check** with $D = \{1, 2\}$ and $P(x)$: "$x$ is even": $\forall x\,
P(x) = P(1) \wedge P(2) = \text{F} \wedge \text{T} = \text{F}$ and $\exists x\, P(x) = \text{F} \vee
\text{T} = \text{T}$, matching "not every number in $\{1, 2\}$ is even, but one is".
:::

:::viz{#strip-viz spec="quant-strip" mode="animate" depth="standard"}
:::

:::definition{#nonempty-convention term="Non-empty domains, and ∀ implies ∃" depth="standard"}
Because every domain has at least one element, $\forall x\, \varphi(x)$ implies $\exists x\,
\varphi(x)$: if every element passes and there is an element, some element passes. On an empty domain
the big AND would be empty (true) and the big OR empty (false), and the implication would fail; this is
why logic (and GATE) excludes empty domains. Some books evaluate quantifiers over an empty set without
saying so; we never do.

Note the difference between an empty **domain** (excluded) and an empty **predicate** (allowed): if no
element is a unicorn, the domain is still non-empty, and $\forall x(U(x) \to W(x))$ is simply
vacuously true.
:::

:::definition{#precedence-quant term="How far a quantifier reaches" depth="standard"}
A quantifier binds **as tightly as $\neg$**: it applies to the smallest formula right after it (an
atom, a negation, another quantifier, or a bracket). So

- $\forall x\, P(x) \wedge Q(x)$ means $(\forall x\, P(x)) \wedge Q(x)$, and the second $x$ is outside
  the quantifier;
- $\forall x\,(P(x) \wedge Q(x))$ needs the bracket to cover both;
- $\neg \forall x\, P(x)$ means $\neg(\forall x\, P(x))$, while $\forall x\, \neg P(x)$ is different.

GATE writes $(\forall x)$, $\forall(x)$, $\forall x{:}$ or $\forall x,$ for the same quantifier; a colon
or comma after the variable is usually meant to extend the scope to the end of the formula. When the
question's brackets are sloppy, read the intended scope from the English and say so.
:::

:::trick{#trick-witness title="One witness, one counterexample" depth="standard"}
To prove $\exists x\, \varphi$, name one witness. To refute $\forall x\, \varphi$, name one
counterexample. To prove $\forall x\, \varphi$ or refute $\exists x\, \varphi$ you must argue about
**every** element.

**Why it works:** the big OR needs one T cell, the big AND one F cell. **When it fails:** once
quantifiers are nested, a "witness" for $\exists y$ may depend on $x$; you must name a witness for each
$x$ (a rule), not one fixed object. That is exactly the $\forall x \exists y$ versus $\exists y \forall
x$ difference below.
:::

:::note{#recap-quantifiers title="Recap" depth="quick"}
A predicate is a sentence with holes; an interpretation fixes the domain and the extensions. $\forall$
is a big AND (one counterexample refutes it), $\exists$ a big OR (one witness proves it). Domains are
non-empty, so $\forall$ implies $\exists$. A quantifier reaches only as far as $\neg$ would: use
brackets for a wider scope.
:::

### Worked examples: evaluating quantifiers

::::example{#ex-eval-easy level="easy" title="Expanding over a small domain" depth="quick"}
On $D = \{1, 2, 3, 4\}$ let $E(x)$: "$x$ is even" and $S(x)$: "$x$ is a perfect square". Find the values
of $\forall x(E(x) \vee S(x))$ and $\exists x(E(x) \wedge S(x))$.

:::step{why="Fill the strip: compute both predicates for each element of the domain."}
$E$: F, T, F, T. $S$: T, F, F, T (squares in $D$: 1 and 4).
:::

:::step{why="∀ is the AND of the cells of E ∨ S; look for one F cell."}
$E \vee S$: T, T, **F**, T. The cell $x = 3$ is a counterexample, so $\forall x(E(x) \vee S(x))$ is
**false**.
:::

:::step{why="∃ is the OR of the cells of E ∧ S; look for one T cell."}
$E \wedge S$: F, F, F, **T**. The witness $x = 4$ makes $\exists x(E(x) \wedge S(x))$ **true**.
:::

:::answer
$\forall x(E(x) \vee S(x))$ is F (counterexample 3); $\exists x(E(x) \wedge S(x))$ is T (witness 4).
:::
::::

::::example{#ex-eval-medium level="medium" title="The same formula on different domains" depth="standard"}
Decide $\forall x \exists y\,(x < y)$ and $\exists x \forall y\,(x \le y)$ on (i) $D = \{1, 2, 3, 4, 5\}$,
(ii) the natural numbers $\mathbb{N} = \{0, 1, 2, \dots\}$, (iii) the integers $\mathbb{Z}$.

:::step{why="∀x∃y(x < y) says every element has a larger element: there is no largest element."}
(i) $x = 5$ has nothing larger in $D$: **false**. (ii), (iii) for any $x$ take $y = x + 1$: **true**.
:::

:::step{why="∃x∀y(x ≤ y) says some element is below or equal to everything: there is a least element."}
(i) $x = 1$ works: **true**. (ii) $x = 0$ works: **true**. (iii) any candidate $x$ fails against
$y = x - 1$: **false**.
:::

:::answer
(i) F, T; (ii) T, T; (iii) T, F. A closed formula has no truth value until the domain is fixed; the same
symbols say "no maximum" and "has a minimum", and which domains have those properties is a fact about
the domain.
:::
::::

::::example{#ex-eval-gate level="gate" title="Integers against reals" depth="standard"}
Is $\forall x\,(x \le x^2)$ true over the integers? Over the reals? What about $\exists x\,(x^2 + 1 = 0)$
over the reals?

:::step{why="Rewrite the inequality as a product so its sign is easy to read."}
$x \le x^2 \iff x^2 - x \ge 0 \iff x(x - 1) \ge 0$, which fails exactly for $0 < x < 1$.
:::

:::step{why="Over the integers there is no number strictly between 0 and 1, so no counterexample exists."}
Over $\mathbb{Z}$: **true** (every integer passes).
:::

:::step{why="Over the reals one counterexample is enough: pick a number between 0 and 1."}
Over $\mathbb{R}$: $x = \tfrac12$ gives $\tfrac12 \le \tfrac14$, false. So **false**.
:::

:::step{why="For ∃ we need a witness; x² + 1 ≥ 1 for every real x, so none exists."}
$\exists x\,(x^2 + 1 = 0)$ over $\mathbb{R}$: **false** (over the complex numbers $x = i$ would be a
witness).
:::

:::answer
$\forall x(x \le x^2)$: true over $\mathbb{Z}$, false over $\mathbb{R}$ (counterexample $\tfrac12$);
$\exists x(x^2 + 1 = 0)$ is false over $\mathbb{R}$.
:::
::::

::::example{#ex-eval-edge level="gate" title="Edge case: when nothing satisfies the restriction" depth="standard"}
On $D = \{1, 2, 3\}$ let $G(x)$: "$x > 5$" and $P(x)$: "$x$ is prime". Evaluate $\forall x(G(x) \to P(x))$,
$\exists x(G(x) \wedge P(x))$ and $\exists x(G(x) \to P(x))$.

:::step{why="G is false on every element, so every implication G(d) → P(d) has a false hypothesis."}
$G \to P$: T, T, T (all vacuously true). So $\forall x(G(x) \to P(x))$ is **true**.
:::

:::step{why="A conjunction with a false part is false, so no element is a witness."}
$G \wedge P$: F, F, F. So $\exists x(G(x) \wedge P(x))$ is **false**.
:::

:::step{why="∃ needs one T cell, and the vacuous column has three."}
$\exists x(G(x) \to P(x))$ is **true**, witnessed by $x = 1$, which is not even prime.
:::

:::answer
T, F, T. "Every number above 5 in $D$ is prime" is vacuously true, "some number above 5 is prime" is
false, and $\exists x(G \to P)$ is true for a silly reason. That last formula is the classic wrong
translation of "some", examined in the next section.
:::
::::

:::note{#recap-eval-examples title="Recap" depth="quick"}
Fill the strip, then AND it ($\forall$) or OR it ($\exists$). The domain is part of the question: the
same formula can be true on $\mathbb{N}$ and false on $\mathbb{Z}$. An implication over an empty
restriction is vacuously true in every cell.
:::

## Bound and free variables

:::intuition{#scope-intuition title="A quantifier owns the variables in its reach" depth="standard"}
Think of $\forall x$ as a loop header, `for x in D:`, and of its scope as the loop body. Inside the
body, $x$ is the loop variable: it is **bound**, and renaming it everywhere in the body changes
nothing. Outside the body, an $x$ refers to something else, an outside value nobody has fixed: it is
**free**. A formula is a proposition only when every variable is bound (or replaced by an object),
just as a program can run only when every variable it reads has a value.
:::

:::definition{#bound-free-def term="Scope, bound and free occurrences" depth="standard"}
In $\forall x\, \psi$ or $\exists x\, \psi$, the formula $\psi$ is the **scope** of the quantifier. An
occurrence of $x$ is **bound** if it lies in the scope of a quantifier on $x$ (it belongs to the
nearest such quantifier); otherwise it is **free**. A formula with no free variables is **closed** (a
**sentence**); only sentences have a truth value in an interpretation without further information.

In $\forall x\,(P(x) \to \exists y\, R(x, y, z)) \wedge Q(x)$: the $x$ in $P(x)$ and $R$ is bound by
$\forall x$, $y$ is bound by $\exists y$, $z$ is free, and the $x$ in $Q(x)$ is **free**, because the
bracket after $\forall x$ closes before $\wedge Q(x)$.
:::

:::theorem{#renaming-theorem name="Renaming a bound variable" depth="standard"}
If $y$ does not occur in $\psi$, then $\forall x\, \psi(x) \equiv \forall y\, \psi(y)$ and
$\exists x\, \psi(x) \equiv \exists y\, \psi(y)$, where $\psi(y)$ replaces the **free** occurrences of
$x$ in $\psi$ by $y$.
:::

:::proof{#proof-renaming of="renaming bound variables" depth="standard"}
**Idea first:** the name of a loop variable does not matter, provided it does not collide with a name
already in use.

$\forall x\, \psi(x)$ is true iff $\psi(d)$ holds for every $d \in D$; $\forall y\, \psi(y)$ is true
iff $\psi(d)$ holds for every $d$, the same list of conditions, because substituting $d$ for $x$ in
$\psi(x)$ or for $y$ in $\psi(y)$ produces the same formula $\psi(d)$. The side condition matters:
renaming $x$ to $y$ in $\forall x\, R(x, y)$ would give $\forall y\, R(y, y)$, which captures the free
$y$ and changes the meaning. **Sanity check:** $\forall x\, R(x, y)$ with $R$ = "$\le$" on $\{1, 2\}$ and
$y = 2$ is true, while $\forall y\, R(y, y)$ ("$\le$" is reflexive) is also true but says something
else; with $y = 1$ the first becomes false and the second stays true.
:::

:::trap{#trap-scope-free title="A sloppy bracket leaves a variable free" depth="quick"}
GATE 2008 offers $(\forall x\ fsa(x)) \Rightarrow (\exists y\ pda(y) \wedge equivalent(x, y))$ for
"each FSA has an equivalent PDA". As printed, $\forall x$ covers only $fsa(x)$, and the $x$ in
$equivalent(x, y)$ is free; the formula even claims "if **everything** is an FSA". The intended meaning
is $\forall x\,(fsa(x) \Rightarrow \exists y\,(pda(y) \wedge equivalent(x, y)))$. The key is this option
because every other option is wrong for a deeper reason; in your own answers, write the brackets.
:::

:::note{#recap-scope title="Recap" depth="quick"}
A quantifier binds the occurrences of its variable inside its scope; anything outside is free. Only
closed formulas have a truth value. Bound variables can be renamed to any fresh letter; never rename
into a name that is already free.
:::

### Worked examples: scope and free variables

::::example{#ex-scope-easy level="easy" title="Finding the free variables" depth="quick"}
List the free variables of (i) $\forall x\,(P(x) \to Q(x, y))$, (ii) $\exists y\, \forall x\, R(x, y)$,
(iii) $\forall x\, P(x) \to P(y)$.

:::step{why="Inside the bracket after ∀x every x is bound; y has no quantifier."}
(i) $x$ bound, $y$ **free**.
:::

:::step{why="Both variables have quantifiers whose scopes cover the atom."}
(ii) none: it is a sentence.
:::

:::step{why="Without a bracket ∀x reaches only P(x); P(y) is outside and y has no quantifier."}
(iii) $y$ **free** (and the formula reads $(\forall x\, P(x)) \to P(y)$).
:::

:::answer
(i) $\{y\}$, (ii) $\varnothing$ (a sentence), (iii) $\{y\}$.
:::
::::

::::example{#ex-scope-medium level="medium" title="The same letter, bound and free" depth="standard"}
On $D = \{1, 2\}$ with $P = \{1, 2\}$ and $Q = \{1\}$, what is the value of $\forall x\, P(x) \wedge Q(x)$?

:::step{why="Bracket by precedence: the quantifier binds as tightly as ¬."}
The formula is $(\forall x\, P(x)) \wedge Q(x)$: the second $x$ is free.
:::

:::step{why="The first part is a sentence: check every element."}
$\forall x\, P(x)$ is T (both elements are in $P$).
:::

:::step{why="The second part depends on which value the free x has."}
For $x = 1$: $Q(1)$ = T, so the formula is T. For $x = 2$: $Q(2)$ = F, so it is F.
:::

:::answer
It has **no single value**: T if the free $x$ is 1, F if it is 2. By contrast $\forall x\,(P(x) \wedge
Q(x))$ is a sentence, and it is F (counterexample 2).
:::
::::

::::example{#ex-scope-gate level="gate" title="Reading GATE 2008's options for scope" depth="standard"}
With $fsa(x)$, $pda(y)$, $equivalent(a, b)$, which options of GATE 2008 are sentences:
(A) $(\forall x\, fsa(x)) \Rightarrow (\exists y\, pda(y) \wedge equivalent(x, y))$,
(B) $\sim\forall y\,(\exists x\, fsa(x) \Rightarrow pda(y) \wedge equivalent(x, y))$,
(C) $\forall x\, \exists y\,(fsa(x) \wedge pda(y) \wedge equivalent(x, y))$?

:::step{why="In A, each quantifier is followed by a bare atom, so each reaches only that atom."}
(A): $\forall x$ covers $fsa(x)$; $\exists y$ covers $pda(y)$. Both $x$ and $y$ are free in
$equivalent(x, y)$.
:::

:::step{why="In B the bracket after ∀y covers everything, but ∃x is followed by a bare atom."}
(B): $y$ is bound; $\exists x$ covers only $fsa(x)$, so the $x$ in $equivalent(x, y)$ is free.
:::

:::step{why="In C both quantifiers precede one bracket that holds every atom."}
(C): a sentence. It says every object $x$ is an FSA (and has an equivalent PDA), which is far too
strong: it fails as soon as some object is not an FSA.
:::

:::answer
Only C is a sentence, and it is the wrong sentence. A is the intended reading
$\forall x(fsa(x) \Rightarrow \exists y(pda(y) \wedge equivalent(x, y)))$ with the brackets dropped, which
is why it is the key.
:::
::::

::::example{#ex-scope-edge level="gate" title="Edge case: a variable reused inside its own scope" depth="standard"}
Rewrite $\forall x\,(P(x) \wedge \exists x\, Q(x))$ so that no letter is used for two quantifiers, and
check that the meaning is unchanged.

:::step{why="An occurrence belongs to the nearest quantifier on its letter; the x in Q(x) belongs to ∃x."}
The $x$ in $P(x)$ belongs to $\forall x$, the $x$ in $Q(x)$ to $\exists x$.
:::

:::step{why="Rename the inner bound variable to a fresh letter (the renaming theorem)."}
$\forall x\,(P(x) \wedge \exists y\, Q(y))$.
:::

:::step{why="The inner part no longer mentions x, so it says 'Q is non-empty' for every x alike."}
Meaning: everything is $P$, and something is $Q$: $\forall x\, P(x) \wedge \exists y\, Q(y)$.
:::

:::answer
$\forall x\,(P(x) \wedge \exists y\, Q(y)) \equiv \forall x\, P(x) \wedge \exists y\, Q(y)$. Reused letters are
legal but confusing; rename before you translate or negate.
:::
::::

:::note{#recap-scope-examples title="Recap" depth="quick"}
Bracket by precedence, then attach each occurrence to its nearest quantifier. A formula with a free
variable has no fixed value. When a letter is reused, rename the inner one first.
:::

## Translating "all", "some", "no" and "some … not"

:::intuition{#pairing-intuition title="∀ talks about everything, so it needs a filter" depth="standard"}
The domain usually contains far more than the sentence is about. "All cats are mammals" is said in a
world that also contains dogs, stones and numbers. A universal quantifier ranges over **all** of them,
so we cannot say "everything is a cat and a mammal"; we must say "**for each thing, if it is a cat,
then it is a mammal**". The "if" is a filter: non-cats pass the filter vacuously and say nothing.

"Some cats are black" claims that **one thing** is both a cat and black: the witness must pass both
tests, so the connective is $\wedge$. Using $\to$ here would let any non-cat be a witness (we saw that
$\exists x(G \to P)$ is true for silly reasons). Hence the pairing rule: **$\forall$ goes with $\to$,
$\exists$ goes with $\wedge$**.
:::

:::definition{#four-forms term="The four basic forms" depth="quick"}
| English | Formula | Equivalent form |
|:--|:--|:--|
| All $A$ are $B$ (every $A$ is $B$) | $\forall x(A(x) \to B(x))$ | $\neg\exists x(A(x) \wedge \neg B(x))$ |
| Some $A$ are $B$ (at least one $A$ is $B$) | $\exists x(A(x) \wedge B(x))$ | $\neg\forall x(A(x) \to \neg B(x))$ |
| No $A$ is $B$ (none of the $A$ are $B$) | $\forall x(A(x) \to \neg B(x))$ | $\neg\exists x(A(x) \wedge B(x))$ |
| Some $A$ are not $B$ (not all $A$ are $B$) | $\exists x(A(x) \wedge \neg B(x))$ | $\neg\forall x(A(x) \to B(x))$ |

The rows come in contradictory pairs: "all" is the negation of "some … not", and "no" is the negation of
"some". That is why each equivalent form is a negation of the other pair's formula.
:::

:::theorem{#pairing-theorem name="Why the other pairing is wrong" depth="standard"}
(1) $\forall x(A(x) \wedge B(x))$ says "everything is an $A$ and a $B$"; it implies $\forall x(A(x) \to
B(x))$ but is false in every world that contains a non-$A$. (2) $\exists x(A(x) \to B(x))$ is true in
every world that contains a non-$A$ (or a $B$), whatever the $A$'s are like; it is implied by
$\exists x(A(x) \wedge B(x))$ but is far weaker.
:::

:::proof{#proof-pairing of="the pairing rule" depth="standard"}
**Idea first:** look at a single element that is **not** an $A$, and see what each formula makes of it.

For a non-$A$ element $d$: $A(d) \to B(d)$ is T (vacuous), $A(d) \wedge B(d)$ is F. (1) In
$\forall x(A \wedge B)$ that F cell sinks the whole AND, so the formula is false in every world with a
non-$A$, while "all $A$ are $B$" is perfectly possible there; and whenever $A(d) \wedge B(d)$ holds so does
$A(d) \to B(d)$, so (1) implies the correct form. (2) In $\exists x(A \to B)$ the T cell of $d$ is a
witness, so the formula is true in every world with a non-$A$, even one where no $A$ is a $B$. If
$A(d) \wedge B(d)$ holds then $A(d) \to B(d)$ holds, so $\exists x(A \wedge B)$ implies (2). **Sanity
check:** world $\{$cat (white), dog$\}$ with $A$ = cat, $B$ = black. "Some cats are black" is false;
$\exists x(A \wedge B)$ is F; $\exists x(A \to B)$ is T, witnessed by the dog.
:::

:::viz{#pairing-viz spec="quant-pairing" mode="animate" depth="standard"}
:::

:::trick{#trick-pairing title="Read ∀ as 'every … is', ∃ as 'some … that is'" depth="standard"}
Say the formula back in English with the filter: $\forall x(A \to B)$ "for each thing, **if** it is an
$A$ it is a $B$"; $\exists x(A \wedge B)$ "some thing **is** an $A$ **and** is a $B$". Any option with
$\forall x(A \wedge \dots)$ or $\exists x(A \to \dots)$ at the top is almost certainly wrong.

**Why it works:** the pairing theorem. **When it fails:** when the sentence really is about the whole
domain ("everything is either red or blue": $\forall x(R(x) \vee B(x))$), or when the restriction has
been folded into the domain (domain = cats, "all are mammals": $\forall x\, M(x)$). Inside a nested
formula the rule applies to each quantifier separately.
:::

:::trap{#trap-forall-and title="∀ with ∧ claims everything is an A" depth="quick"}
"All rainy days are cold" as $\forall d(R(d) \wedge C(d))$ says every day is rainy and cold. In GATE 2014
the option $\forall d(Rainy(d) \wedge \sim Cold(d))$ fails for the same reason: it makes every day rainy.
The wrong answer examiners expect is this one, because it "contains both words".
:::

:::trap{#trap-exists-imp title="∃ with → is true for silly reasons" depth="quick"}
"Some real numbers are rational" as $\exists x(rational(x) \to real(x))$ (GATE 2012, option D) is true in
any world that has one non-rational object, or one real one: it says almost nothing. The correct
$\exists x(real(x) \wedge rational(x))$ demands one object that is both.
:::

:::trap{#trap-every-not title="'Every A is not B' is usually 'no A is B'" depth="quick"}
"All that glitters is not gold" is, read literally, $\forall x(G(x) \to \neg Au(x))$: nothing that
glitters is gold. The proverb means "not all that glitters is gold", $\neg\forall x(G(x) \to Au(x))
\equiv \exists x(G(x) \wedge \neg Au(x))$. GATE 2014 writes the unambiguous "**not all** that glitters is
gold", and the literal $\forall x(G \to \neg Au)$ is offered as a distractor; it is far stronger.
:::

:::note{#recap-four-forms title="Recap" depth="quick"}
All: $\forall(A \to B)$. Some: $\exists(A \wedge B)$. No: $\forall(A \to \neg B) \equiv \neg\exists(A \wedge
B)$. Some not / not all: $\exists(A \wedge \neg B) \equiv \neg\forall(A \to B)$. $\forall$ with $\wedge$ is
too strong, $\exists$ with $\to$ too weak; test with a world containing one non-$A$.
:::

### Worked examples: the four forms

::::example{#ex-form-easy level="easy" title="Writing the four forms" depth="quick"}
With $C(x)$: "$x$ is a cat", $B(x)$: "$x$ is black", translate "all cats are black", "some cats are
black", "no cat is black", "some cats are not black".

:::step{why="All A are B: a universal with the filter A → B."}
$\forall x(C(x) \to B(x))$.
:::

:::step{why="Some A are B: one witness that passes both tests."}
$\exists x(C(x) \wedge B(x))$.
:::

:::step{why="No A is B: every A fails B; equivalently, there is no witness of A ∧ B."}
$\forall x(C(x) \to \neg B(x)) \equiv \neg\exists x(C(x) \wedge B(x))$.
:::

:::step{why="Some A are not B: one witness that is an A and fails B."}
$\exists x(C(x) \wedge \neg B(x)) \equiv \neg\forall x(C(x) \to B(x))$.
:::

:::answer
$\forall x(C \to B)$, $\exists x(C \wedge B)$, $\forall x(C \to \neg B)$, $\exists x(C \wedge \neg B)$; the first and
last are negations of each other, as are the second and third.
:::
::::

::::example{#ex-form-medium level="medium" title="A world that exposes the wrong pairing" depth="standard"}
World: $D = \{c_1, c_2, d\}$ with $C = \{c_1, c_2\}$ (cats), $B = \{c_1, d\}$ (black things; $d$ is a
black dog). Evaluate $\forall x(C \to B)$, $\forall x(C \wedge B)$, $\exists x(C \wedge B)$ and $\exists x(C \to
B)$.

:::step{why="Row by row: C → B is false only on a cat that is not black."}
$C \to B$: $c_1$ T, $c_2$ **F**, $d$ T. So $\forall x(C \to B)$ = F ($c_2$ is a white cat).
:::

:::step{why="C ∧ B is true only on a black cat."}
$C \wedge B$: $c_1$ **T**, $c_2$ F, $d$ F. So $\forall x(C \wedge B)$ = F and $\exists x(C \wedge B)$ = T.
:::

:::step{why="∃ over the C → B column: two T cells."}
$\exists x(C \to B)$ = T.
:::

:::step{why="Now delete the black cat: keep the dog and one white cat, and recompute the two ∃ forms."}
World $\{c_2, d\}$: $\exists x(C \wedge B)$ = F, but $\exists x(C \to B)$ = T (the dog is a vacuous witness).
:::

:::answer
F, F, T, T in the first world. In the second world "some cats are black" is false and $\exists x(C \wedge B)$
says so, but $\exists x(C \to B)$ still claims T: it is not a translation of "some".
:::
::::

::::example{#ex-form-gate level="gate" title="A restriction with two conditions" depth="standard"}
$S(x)$: $x$ is a student, $K(x)$: $x$ skips the lab, $P(x)$: $x$ passes. Translate "no student who skips
the lab passes" and decide which of these agree with it: (a) $\forall x((S(x) \wedge K(x)) \to \neg P(x))$,
(b) $\neg\exists x(S(x) \wedge K(x) \wedge P(x))$, (c) $\forall x(S(x) \to (K(x) \to \neg P(x)))$,
(d) $\forall x(S(x) \wedge K(x) \wedge \neg P(x))$.

:::step{why="'No A is B' with A = student who skips (S ∧ K) and B = passes."}
Target: $\forall x((S(x) \wedge K(x)) \to \neg P(x))$, which is (a).
:::

:::step{why="'No A is B' is also 'there is no A that is B'."}
(b) $\neg\exists x(S \wedge K \wedge P)$: equivalent (the negation of the 'some' form).
:::

:::step{why="Exportation from Chapter 1: (S ∧ K) → ¬P ≡ S → (K → ¬P), applied inside the quantifier."}
(c): equivalent.
:::

:::step{why="∀ with ∧ claims every object is a student who skips and fails: test a world with one non-student."}
(d) is false in any world that contains a non-student, while the sentence can be true there: **not**
equivalent.
:::

:::answer
(a), (b), (c) are correct; (d) is the $\forall$-with-$\wedge$ trap.
:::
::::

::::example{#ex-form-edge level="gate" title="Edge case: 'all' does not imply 'some'" depth="standard"}
Is "all unicorns are white" ($\forall x(U(x) \to W(x))$) enough to conclude "some unicorns are white"
($\exists x(U(x) \wedge W(x))$)? And is "some A are B" the same as "some B are A"?

:::step{why="Try a world with no unicorns; every implication has a false hypothesis."}
$D = \{h\}$ (a horse), $U = \varnothing$, $W = \{h\}$: $\forall x(U \to W)$ is T (vacuously).
:::

:::step{why="The ∃ form needs one object that is a unicorn: there is none."}
$\exists x(U \wedge W)$ is F. So "all" does **not** imply "some" when the subject class is empty.
:::

:::step{why="∧ is commutative, so the witness for A ∧ B is a witness for B ∧ A."}
$\exists x(A \wedge B) \equiv \exists x(B \wedge A)$: "some A are B" = "some B are A". But
$\forall x(A \to B) \not\equiv \forall x(B \to A)$ (the converse).
:::

:::answer
No: $\forall x(U \to W)$ is vacuously true when there are no unicorns, while $\exists x(U \wedge W)$ is false.
"Some" statements can be turned round, "all" statements cannot. (Only $\forall x\, P(x) \to \exists x\,
P(x)$ is guaranteed, by the non-empty domain.)
:::
::::

:::note{#recap-form-examples title="Recap" depth="quick"}
Translate the subject class into the filter, then pair: "all" with $\to$, "some" with $\wedge$. Test each
option on a world with one object outside the subject class; the wrong pairings give themselves away
there.
:::

## Translating "only", plurals and compound subjects

:::intuition{#only-intuition title="'Only' moves the filter to the other side" depth="standard"}
"All members can vote" puts the members in the filter: if you are a member, you can vote. "**Only**
members can vote" makes a different promise: if you can vote, you are a member. It says nothing about
whether every member can vote (perhaps members in arrears cannot); it only shuts non-members out.
This is the same reversal as "$p$ only if $q$" in Chapter 1: "only" marks the **necessary** condition,
which becomes the conclusion of the implication.

Plurals hide a second reversal. "Tigers and lions attack" does not talk about animals that are tigers
**and** lions (there are none); it talks about every tiger and every lion, i.e. every animal that is a
tiger **or** a lion. English "and" between two classes in the subject becomes $\vee$ in the filter.
:::

:::definition{#only-def term="Only, all and only, none but" depth="standard"}
| English | Formula | Why |
|:--|:--|:--|
| Only $A$ are $B$; none but $A$ are $B$; $A$ are the only $B$ | $\forall x(B(x) \to A(x))$ | being $B$ requires being $A$ |
| All and only $A$ are $B$; exactly the $A$ are $B$ | $\forall x(A(x) \leftrightarrow B(x))$ | both directions |
| $A$ and $C$ are $B$ (two classes) | $\forall x((A(x) \vee C(x)) \to B(x))$ | each $A$ and each $C$ is $B$ |
| $A$ that are $C$ are $B$ | $\forall x((A(x) \wedge C(x)) \to B(x))$ | one class with two conditions |
| Not every $A$ is $B$ | $\neg\forall x(A \to B) \equiv \exists x(A \wedge \neg B)$ | the negation of "all" |
| None of the $A$ are $B$ | $\neg\exists x(A \wedge B) \equiv \forall x(A \to \neg B)$ | the negation of "some" |

Some references gloss "only $A$ are $B$" as "every $A$ is $B$"; that gloss is reversed (the formula
$\forall x(B \to A)$ is the right one).
:::

:::derivation{#plural-derivation of="'A and C are B' as one universal" depth="standard"}
"Tigers are $B$ and lions are $B$" is $\forall x(T(x) \to B(x)) \wedge \forall x(L(x) \to B(x))$. A universal
distributes over $\wedge$ (proved in the next lesson; on a finite domain it is just regrouping one long
AND), so this is $\forall x((T(x) \to B(x)) \wedge (L(x) \to B(x)))$. Inside, Chapter 1's law
$(p \to r) \wedge (q \to r) \equiv (p \vee q) \to r$ gives $\forall x((T(x) \vee L(x)) \to B(x))$.
**Sanity check:** a lone tiger that does not attack must falsify the sentence. With $T(d)$ = T, $L(d)$ =
F, $B(d)$ = F: $(T \vee L) \to B$ = T → F = F, correct; but $(T \wedge L) \to B$ = F → F = T, which misses the
non-attacking tiger.
:::

:::trap{#trap-only title="'Only A are B' is not 'all A are B'" depth="quick"}
"Only members can vote" as $\forall x(M(x) \to V(x))$ is the converse of the truth: it forces every member
to be a voter and lets non-members vote. The right formula is $\forall x(V(x) \to M(x))$. The trap option
is the one that keeps the words in sentence order.
:::

:::trap{#trap-and-plural title="'Gold and silver ornaments' is gold OR silver" depth="quick"}
GATE 2006 ("tigers and lions attack if they are hungry or threatened") and GATE 2009 ("gold and silver
ornaments are precious") both offer $\forall x((G(x) \wedge S(x)) \to P(x))$. Nothing is both gold and
silver (and no animal is both a tiger and a lion), so that formula is vacuously true and says nothing
about any real ornament. The key uses $G(x) \vee S(x)$.
:::

:::note{#recap-only title="Recap" depth="quick"}
"Only $A$ are $B$" = $\forall x(B \to A)$; "all and only" = $\leftrightarrow$; two classes joined by "and"
in the subject become $\vee$ in the filter; "not every" and "none of" are negations of "all" and "some".
:::

### Worked examples: only, plurals and compound sentences

::::example{#ex-only-easy level="easy" title="'Only' against 'all'" depth="quick"}
$M(x)$: $x$ is a member, $V(x)$: $x$ can vote. Translate "only members can vote" and "all members can
vote", and give a world where one is true and the other false.

:::step{why="'Only A are B' puts B in the filter: being a voter requires membership."}
Only: $\forall x(V(x) \to M(x))$. All: $\forall x(M(x) \to V(x))$.
:::

:::step{why="Make a member who cannot vote: that breaks 'all' but not 'only'."}
$D = \{m\}$, $M = \{m\}$, $V = \varnothing$: only-form T (nobody votes), all-form F.
:::

:::answer
$\forall x(V \to M)$ versus $\forall x(M \to V)$: converses, and the world with one non-voting member separates
them.
:::
::::

::::example{#ex-only-medium level="medium" title="Two classes in the subject" depth="standard"}
$A(x)$: apple, $N(x)$: banana, $F(x)$: fruit. Translate "apples and bananas are fruit" and show that
$\forall x((A(x) \wedge N(x)) \to F(x))$ misses a counterexample.

:::step{why="Each apple and each banana is fruit: one filter covering both classes."}
$\forall x((A(x) \vee N(x)) \to F(x))$ (the plural derivation).
:::

:::step{why="Build a world where the sentence is false: an apple that is not fruit."}
$D = \{a\}$, $A = \{a\}$, $N = F = \varnothing$. Correct form: $(T \vee F) \to F$ = F, so the formula is F, as it
should be.
:::

:::step{why="Evaluate the ∧ version in the same world: the filter is false because nothing is both."}
$(T \wedge F) \to F$ = T, so $\forall x((A \wedge N) \to F)$ is T: it fails to notice the bad apple.
:::

:::answer
$\forall x((A(x) \vee N(x)) \to F(x))$. The $\wedge$ version is true in every world where nothing is both an
apple and a banana, i.e. in every sensible world.
:::
::::

::::example{#ex-only-gate level="gate" title="'Not every' (GATE 2007 style)" depth="standard"}
$E(x)$: $x$ is an error, $Fa(x)$: $x$ is fatal. Which of these say "not every error is fatal":
(a) $\neg\forall x(E(x) \to Fa(x))$, (b) $\exists x(E(x) \wedge \neg Fa(x))$, (c) $\neg\forall x(\neg E(x) \vee
Fa(x))$, (d) $\forall x(E(x) \to \neg Fa(x))$?

:::step{why="Translate literally: the negation of 'every error is fatal'."}
Target: $\neg\forall x(E(x) \to Fa(x))$, which is (a).
:::

:::step{why="Push the ¬ through: ¬∀ becomes ∃¬, and ¬(E → Fa) is E ∧ ¬Fa."}
$\exists x(E(x) \wedge \neg Fa(x))$, which is (b).
:::

:::step{why="Chapter 1: E → Fa ≡ ¬E ∨ Fa, so (c) is (a) with the arrow rewritten."}
(c) is equivalent.
:::

:::step{why="(d) says no error is fatal. Test a world with one fatal and one harmless error."}
$D = \{e_1, e_2\}$, $E = D$, $Fa = \{e_1\}$: the sentence is true (e₂ is not fatal), (d) is false
($e_1$ is fatal).
:::

:::answer
(a), (b), (c) represent it; (d) does not: "not every error is fatal" is weaker than "no error is fatal".
:::
::::

::::example{#ex-only-edge level="gate" title="Edge case: 'none but' and 'all and only'" depth="standard"}
$B(x)$: $x$ is brave, $De(x)$: $x$ deserves the prize. Translate "none but the brave deserve the prize"
and "all and only the brave deserve the prize", and compare.

:::step{why="'None but the brave' = 'only the brave': deserving requires bravery."}
$\forall x(De(x) \to B(x))$.
:::

:::step{why="'All and only' adds the other direction: every brave person deserves it."}
$\forall x(B(x) \leftrightarrow De(x))$, i.e. $\forall x(De \to B) \wedge \forall x(B \to De)$.
:::

:::step{why="Find a world that separates them: a brave person who does not deserve the prize."}
$D = \{b\}$, $B = \{b\}$, $De = \varnothing$: the first is T, the second F.
:::

:::answer
"None but" is one direction, $\forall x(De \to B)$; "all and only" is the biconditional. The biconditional
implies the one-way form, not conversely.
:::
::::

:::note{#recap-only-examples title="Recap" depth="quick"}
Find the class the sentence restricts ("only" puts it in the conclusion), join plural classes with $\vee$,
and always test the trap option on a one- or two-element world.
:::

## Nested quantifiers and their order

:::intuition{#order-intuition title="Who chooses first?" depth="standard"}
Read $\forall x \exists y\, L(x, y)$ as a game: an opponent picks any $x$, then **you** pick a $y$, and
you win if $L(x, y)$ holds. You may choose a different $y$ for each $x$. In $\exists y \forall x\, L(x,
y)$ you must commit to **one** $y$ first, and then the opponent tries every $x$ against it. Committing
first is harder, so $\exists y \forall x$ is the stronger claim.

On the grid of $L$ (rows $x$, columns $y$): $\forall x \exists y$ says **every row has a mark**;
$\exists y \forall x$ says **some column is full of marks**. A full column puts a mark in every row,
but marks scattered one per row need not fill any column. "Everybody loves somebody" is not "there is
somebody whom everybody loves".
:::

:::definition{#nested-def term="Nested quantifiers: the eight readings of L(x, y)" depth="standard"}
With $L(x, y)$: "$x$ loves $y$":

| Formula | Reading | On the grid |
|:--|:--|:--|
| $\forall x \forall y\, L$ | everyone loves everyone | all cells marked |
| $\exists x \exists y\, L$ | someone loves someone | some cell marked |
| $\forall x \exists y\, L$ | everyone loves someone | every row has a mark |
| $\exists y \forall x\, L$ | someone is loved by everyone | some column is full |
| $\forall y \exists x\, L$ | everyone is loved by someone | every column has a mark |
| $\exists x \forall y\, L$ | someone loves everyone | some row is full |

Like quantifiers commute: $\forall x \forall y \equiv \forall y \forall x$ and $\exists x \exists y \equiv \exists
y \exists x$ (one big AND, or one big OR, in a different order). Unlike quantifiers do not.
:::

:::theorem{#order-theorem name="∃∀ implies ∀∃, not conversely" depth="standard"}
$\exists y \forall x\, \varphi(x, y)$ implies $\forall x \exists y\, \varphi(x, y)$ in every interpretation.
The converse fails: there are interpretations where $\forall x \exists y\, \varphi$ is true and $\exists y
\forall x\, \varphi$ false.
:::

:::proof{#proof-order of="the order theorem" depth="standard"}
**Idea first:** a single $y$ that works for every $x$ is, in particular, a $y$ for each $x$.

Suppose $\exists y \forall x\, \varphi(x, y)$ holds, with witness $b$: $\varphi(d, b)$ is true for every
$d$. Take any $x = d$; then $y = b$ is a witness for $\exists y\, \varphi(d, y)$. As $d$ was arbitrary,
$\forall x \exists y\, \varphi(x, y)$ holds. For the converse, take $D = \{0, 1\}$ and $\varphi(x, y)$:
"$x = y$". Every $x$ has a $y$ equal to it ($y = x$), but no single $y$ equals both 0 and 1. **Sanity
check** with a familiar domain: over the integers $\forall x \exists y\,(x + y = 0)$ is true ($y = -x$),
while $\exists y \forall x\,(x + y = 0)$ is false (one $y$ cannot cancel every $x$).
:::

:::viz{#order-viz spec="quant-order-grid" mode="animate" depth="standard"}
:::

:::trick{#trick-order title="Swap only when the quantifiers match" depth="standard"}
Reorder freely inside a block of $\forall$'s or a block of $\exists$'s. Across a $\forall$/$\exists$
boundary, the only safe move is the weakening $\exists y \forall x \Rightarrow \forall x \exists y$ (moving
$\exists$ to the **right**). To test a proposed equivalence, draw a 2×2 grid with the diagonal marked
($x = y$): it satisfies every "for each … some" form and none of the "one … for all" forms.

**Why it works:** the order theorem. **When it fails:** never for like quantifiers; for unlike ones,
the reverse direction needs a separate argument (it can hold in a particular interpretation, but not in
general).
:::

:::trap{#trap-order title="'Every teacher is liked by some student' is ∀∃, not ∃∀" depth="quick"}
GATE 2005 offers $\exists y \forall x(teacher(x) \to (student(y) \wedge likes(y, x)))$: one student who likes
every teacher. The sentence allows a different student for each teacher, so its form is $\forall x(teacher(x)
\to \exists y(student(y) \wedge likes(y, x)))$. The $\exists\forall$ option is stronger; it implies the key but
is not equivalent.
:::

:::note{#recap-order title="Recap" depth="quick"}
The quantifier written first is chosen first. $\forall x \exists y$: every row has a mark (the $y$ may
depend on $x$). $\exists y \forall x$: one full column. The second implies the first, never the reverse in
general; like quantifiers commute.
:::

### Worked examples: nested quantifiers

::::example{#ex-nest-easy level="easy" title="Four readings of 'loves'" depth="quick"}
With $L(x, y)$: "$x$ loves $y$", translate: (i) everyone loves someone, (ii) someone is loved by
everyone, (iii) someone loves everyone, (iv) everyone is loved by someone.

:::step{why="The subject of 'loves' fills the first slot; the first word (everyone or someone) gives the outer quantifier."}
(i) $\forall x \exists y\, L(x, y)$. (iii) $\exists x \forall y\, L(x, y)$.
:::

:::step{why="In a passive sentence the grammatical subject is the one being loved, the second slot; it is quantified first."}
(ii) $\exists y \forall x\, L(x, y)$. (iv) $\forall y \exists x\, L(x, y)$.
:::

:::answer
(i) $\forall x \exists y\, L(x,y)$, (ii) $\exists y \forall x\, L(x,y)$, (iii) $\exists x \forall y\, L(x,y)$,
(iv) $\forall y \exists x\, L(x,y)$. The passive voice swaps which slot is quantified first.
:::
::::

::::example{#ex-nest-medium level="medium" title="A cycle on three people" depth="standard"}
$D = \{a, b, c\}$ and $L = \{(a, b), (b, c), (c, a)\}$. Evaluate the four formulas of the previous example.

:::step{why="Draw the grid: rows x, columns y; one mark per row, in three different columns."}
Row $a$: column $b$. Row $b$: column $c$. Row $c$: column $a$.
:::

:::step{why="Every row has a mark and every column has a mark."}
(i) $\forall x \exists y$: T. (iv) $\forall y \exists x$: T.
:::

:::step{why="A full row or a full column would need three marks in one line; each line has exactly one."}
(ii) $\exists y \forall x$: F. (iii) $\exists x \forall y$: F.
:::

:::answer
T, F, F, T. A cycle is the standard world in which "each has one" is true and "one for all" is false.
:::
::::

::::example{#ex-nest-gate level="gate" title="A master key (GATE 2004/2005 pattern)" depth="standard"}
$Lk(x)$: $x$ is a lock, $K(y)$: $y$ is a key, $O(y, x)$: $y$ opens $x$. Translate "every lock is opened by
some key" and "some key opens every lock", and decide which implies which.

:::step{why="Every lock (∀ with →) is opened by some key (∃ with ∧); the key may depend on the lock, so ∃ sits inside."}
$\forall x(Lk(x) \to \exists y(K(y) \wedge O(y, x)))$.
:::

:::step{why="Some key (∃ with ∧) opens every lock (∀ with →); one key is fixed first."}
$\exists y(K(y) \wedge \forall x(Lk(x) \to O(y, x)))$.
:::

:::step{why="The master key works for each lock, so the second implies the first (order theorem)."}
Master key $\Rightarrow$ every lock has a key.
:::

:::step{why="For the converse build two locks, each with its own key and no key opening both."}
$D = \{l_1, l_2, k_1, k_2\}$, $O = \{(k_1, l_1), (k_2, l_2)\}$: the first sentence is T, the second F.
:::

:::answer
"Some key opens every lock" implies "every lock is opened by some key"; the converse fails (two locks,
two private keys). Note how each quantifier keeps its own filter: $\forall$ with $\to$, $\exists$ with $\wedge$.
:::
::::

::::example{#ex-nest-edge level="gate" title="Edge case: 'everyone else' needs ≠" depth="standard"}
$Kn(x, y)$: $x$ knows $y$. Translate "someone knows everyone else", and evaluate your formula and
$\exists x \forall y\, Kn(x, y)$ on $D = \{a, b\}$ with $Kn = \{(a, b)\}$.

:::step{why="'Everyone else' quantifies over every y different from x: a restricted ∀ with the filter y ≠ x."}
$\exists x \forall y(y \ne x \to Kn(x, y))$.
:::

:::step{why="Check x = a: the only y ≠ a is b, and Kn(a, b) holds."}
$a$ is a witness: the formula is **T**.
:::

:::step{why="Without the filter, y = a is also tested, and nobody knows themselves here."}
$\exists x \forall y\, Kn(x, y)$: for $x = a$, $Kn(a, a)$ fails; for $x = b$, $Kn(b, a)$ fails: **F**.
:::

:::answer
$\exists x \forall y(y \ne x \to Kn(x, y))$, true here, while the unfiltered $\exists x \forall y\, Kn(x, y)$ is false.
"Else", "other", "different" always bring a $\ne$ filter (GATE 2026 uses exactly this).
:::
::::

:::note{#recap-nest-examples title="Recap" depth="quick"}
Quantify the slots in the order the sentence chooses them; passive voice quantifies the second slot
first. Give every quantifier its own filter. "Else" means $\ne$. A cycle separates $\forall\exists$ from
$\exists\forall$.
:::

## Negating quantified statements

:::intuition{#negation-intuition title="To deny 'all', find one exception" depth="standard"}
How do you prove someone wrong who says "every swan is white"? You do not need every swan to be black:
one non-white swan is enough. So "not every swan is white" means "**some** swan is not white". And to
deny "some swan is black" you must show that **no** swan is black: every swan is not black. A negation
passing a quantifier turns $\forall$ into $\exists$ and $\exists$ into $\forall$, and keeps going inward.

On a finite domain this is nothing but De Morgan's law applied to the big AND and the big OR:
$\neg(P_1 \wedge \dots \wedge P_n) = \neg P_1 \vee \dots \vee \neg P_n$.
:::

:::theorem{#quant-demorgan name="De Morgan's laws for quantifiers" depth="standard"}
$\neg\forall x\, \varphi(x) \equiv \exists x\, \neg\varphi(x)$ and $\neg\exists x\, \varphi(x) \equiv \forall x\, \neg\varphi(x)$.
Consequently $\forall x\, \varphi \equiv \neg\exists x\, \neg\varphi$ and $\exists x\, \varphi \equiv \neg\forall x\, \neg\varphi$.
:::

:::proof{#proof-quant-demorgan of="De Morgan for quantifiers" depth="standard"}
**Idea first:** "not every element passes" and "some element fails" describe the same situations.

$\neg\forall x\, \varphi$ is true iff $\forall x\, \varphi$ is false iff some $d \in D$ makes $\varphi(d)$ false
iff some $d$ makes $\neg\varphi(d)$ true iff $\exists x\, \neg\varphi$ is true. Applying this to $\neg\varphi$
gives $\neg\forall x\, \neg\varphi \equiv \exists x\, \neg\neg\varphi \equiv \exists x\, \varphi$; negating both sides gives
$\forall x\, \neg\varphi \equiv \neg\exists x\, \varphi$. The last two identities are the same laws with $\neg$
applied to both sides. **Sanity check** on $D = \{1, 2\}$: $\neg(P(1) \wedge P(2)) = \neg P(1) \vee \neg P(2)$,
which is Chapter 1's De Morgan law, as the finite expansion predicts.
:::

:::derivation{#restricted-negation of="negating 'all' and 'some' with a filter" depth="standard"}
$\neg\forall x(A(x) \to B(x)) \equiv \exists x\, \neg(A(x) \to B(x)) \equiv \exists x(A(x) \wedge \neg B(x))$, using
$\neg(p \to q) \equiv p \wedge \neg q$. And $\neg\exists x(A(x) \wedge B(x)) \equiv \forall x\, \neg(A(x) \wedge B(x)) \equiv
\forall x(\neg A(x) \vee \neg B(x)) \equiv \forall x(A(x) \to \neg B(x))$. So the negation of a restricted
quantifier is the **other** restricted quantifier with the **same** restriction and the conclusion
negated: the filter $A$ survives, the $\to$ becomes $\wedge$ (or back). **Sanity check:** "not all
graphs are connected" becomes "some graph is not connected", not "some non-graph is connected".
:::

:::viz{#negation-viz spec="quant-negation-ladder" mode="animate" depth="standard"}
:::

:::trick{#trick-negation title="Flip every quantifier, negate the matrix" depth="standard"}
For a formula with all its quantifiers in front, $\neg Q_1 x_1 \dots Q_n x_n\, \psi$ becomes $\bar Q_1 x_1
\dots \bar Q_n x_n\, \neg\psi$, where $\bar\forall = \exists$ and $\bar\exists = \forall$. Then simplify $\neg\psi$ with
Chapter 1's laws: $\neg(p \to q) = p \wedge \neg q$, $\neg(p \wedge q) = \neg p \vee \neg q$, $\neg(p \wedge \neg q) = p \to q$.

**Why it works:** De Morgan for quantifiers, applied once per quantifier from the outside in. **When it
fails:** when quantifiers sit inside the matrix (as in $\forall x(\alpha \to \exists y(\beta \to \dots))$). Then
the negation travels through the connectives first and meets each inner quantifier as it goes; flip
those too, one at a time, exactly where they stand.
:::

:::trap{#trap-neg-restriction title="Do not negate the filter" depth="quick"}
The negation of $\forall x(G(x) \to C(x))$ is $\exists x(G(x) \wedge \neg C(x))$, not $\exists x(\neg G(x) \wedge \neg C(x))$
and not $\forall x(G(x) \to \neg C(x))$. The second wrong form forgets to flip the quantifier; the first
negates the restriction. In GATE 2007 the option $\forall x(Graph(x) \Rightarrow \neg Connected(x))$ is the one
that does **not** represent "not every graph is connected".
:::

:::note{#recap-negation title="Recap" depth="quick"}
$\neg\forall = \exists\neg$, $\neg\exists = \forall\neg$; push inward one quantifier at a time. A restricted
"all" negates to a restricted "some … not", the filter untouched. $\neg(p \to q) = p \wedge \neg q$ does the
rest.
:::

### Worked examples: negation

::::example{#ex-neg-easy level="easy" title="Not every bird can fly" depth="quick"}
$B(x)$: bird, $Fl(x)$: can fly. Write the negation of "every bird can fly" with no $\neg$ in front of a
quantifier, and say it in English.

:::step{why="Translate the sentence first: 'all A are B'."}
$\forall x(B(x) \to Fl(x))$.
:::

:::step{why="¬∀ becomes ∃¬, then ¬(p → q) becomes p ∧ ¬q."}
$\neg\forall x(B \to Fl) \equiv \exists x\, \neg(B \to Fl) \equiv \exists x(B(x) \wedge \neg Fl(x))$.
:::

:::answer
$\exists x(B(x) \wedge \neg Fl(x))$: "some bird cannot fly" (a penguin is a witness).
:::
::::

::::example{#ex-neg-medium level="medium" title="Nobody beats everyone" depth="standard"}
$Bt(x, y)$: $x$ beats $y$. Push the negation all the way in: $\neg\exists x \forall y\, Bt(x, y)$. Read both forms.

:::step{why="The outer ¬∃x becomes ∀x¬."}
$\forall x\, \neg\forall y\, Bt(x, y)$.
:::

:::step{why="The remaining ¬∀y becomes ∃y¬."}
$\forall x \exists y\, \neg Bt(x, y)$.
:::

:::step{why="Check on a tiny world: D = {a, b}, Bt = {(a, b)}. Nobody beats both (a does not beat a)."}
Original: no row of the grid is full, so $\exists x \forall y\, Bt$ is F and its negation T. New form: every
row has an empty cell: T. They agree.
:::

:::answer
$\forall x \exists y\, \neg Bt(x, y)$: "nobody beats everyone" = "everyone fails to beat someone". This is the
pattern of GATE 2010's "no one can fool everyone all the time".
:::
::::

::::example{#ex-neg-gate level="gate" title="Negating a definition with three quantifiers" depth="standard"}
"$f$ is continuous at 0" is $\forall \varepsilon\,(\varepsilon > 0 \to \exists \delta\,(\delta > 0 \wedge \forall x\,(|x| < \delta \to
|f(x)| < \varepsilon)))$ (taking $f(0) = 0$). Write its negation with every $\neg$ on an atom.

:::step{why="The outermost quantifier is a restricted ∀ (filter ε > 0): it negates to a restricted ∃ with the same filter."}
$\exists \varepsilon\,(\varepsilon > 0 \wedge \neg\exists\delta(\dots))$.
:::

:::step{why="Next a restricted ∃ (filter δ > 0): it negates to a restricted ∀ with the same filter."}
$\exists \varepsilon\,(\varepsilon > 0 \wedge \forall \delta\,(\delta > 0 \to \neg\forall x(\dots)))$.
:::

:::step{why="Innermost restricted ∀ (filter |x| < δ) negates to a restricted ∃, and the conclusion is negated."}
$\exists \varepsilon\,(\varepsilon > 0 \wedge \forall \delta\,(\delta > 0 \to \exists x\,(|x| < \delta \wedge |f(x)| \ge \varepsilon)))$.
:::

:::answer
$\exists \varepsilon > 0\ \forall \delta > 0\ \exists x\,(|x| < \delta \wedge |f(x)| \ge \varepsilon)$: some tolerance $\varepsilon$ is beaten by
points arbitrarily close to 0. Every quantifier flipped, every filter kept, only the last atom negated.
:::
::::

::::example{#ex-neg-edge level="gate" title="Edge case: a negation that must not touch the filter" depth="standard"}
$S(s)$: student, $Ex(e)$: exam, $P(s, e)$: $s$ passed $e$. Negate "every student passed some exam" and
reject the tempting $\exists s(\neg S(s) \wedge \forall e(Ex(e) \to \neg P(s, e)))$.

:::step{why="Translate: each quantifier with its own filter."}
$\forall s(S(s) \to \exists e(Ex(e) \wedge P(s, e)))$.
:::

:::step{why="¬ of a restricted ∀ is a restricted ∃ with the same filter S(s) and the inside negated."}
$\exists s(S(s) \wedge \neg\exists e(Ex(e) \wedge P(s, e)))$.
:::

:::step{why="¬ of a restricted ∃ is a restricted ∀ with the same filter Ex(e)."}
$\exists s(S(s) \wedge \forall e(Ex(e) \to \neg P(s, e)))$.
:::

:::step{why="The tempting form negated the filter S(s). Test it on D = {s}: one student who passed the one exam e."}
With $D = \{s, e\}$, $S = \{s\}$, $Ex = \{e\}$, $P = \{(s, e)\}$: the sentence is T, so its negation must be F.
The tempting form is T (witness $e$, a non-student who passed nothing). Wrong.
:::

:::answer
$\exists s(S(s) \wedge \forall e(Ex(e) \to \neg P(s, e)))$: "some student passed no exam". Negating the filter
turns the claim into one about non-students.
:::
::::

:::note{#recap-neg-examples title="Recap" depth="quick"}
Work from the outside in: flip a quantifier, keep its filter, switch $\to$ and $\wedge$, move the $\neg$ one
level down. Check the result on a one- or two-element world where you know the answer.
:::

## Exactly one, at least two, at most one

:::intuition{#unique-intuition title="'Exactly one' is two promises" depth="standard"}
"Exactly one student topped the class" makes two claims: **someone** topped it (existence), and **no
one else** did (uniqueness). Existence alone is $\exists x\, T(x)$. Uniqueness alone is "any two toppers
are the same person". Neither is enough by itself: existence allows two toppers, uniqueness allows none.
Counting phrases (at least two, at most one) are built the same way, using $=$ and $\ne$ to compare the
objects we have named.
:::

:::definition{#unique-def term="Counting quantifiers" depth="standard"}
| English | Formula |
|:--|:--|
| at least one $P$ | $\exists x\, P(x)$ |
| at least two $P$ | $\exists x \exists y(x \ne y \wedge P(x) \wedge P(y))$ |
| at most one $P$ | $\forall x \forall y((P(x) \wedge P(y)) \to x = y)$ |
| exactly one $P$, $\exists! x\, P(x)$ | $\exists x(P(x) \wedge \forall y(P(y) \to y = x))$ |

"At most one" is the negation of "at least two"; "exactly one" is "at least one" $\wedge$ "at most one".
:::

:::theorem{#unique-forms-theorem name="Three ways to say 'exactly one'" depth="standard"}
The following are equivalent: (1) $\exists x(P(x) \wedge \forall y(P(y) \to y = x))$;
(2) $\exists x\, P(x) \wedge \forall x \forall y((P(x) \wedge P(y)) \to x = y)$; (3) $\exists x \forall y(P(y) \leftrightarrow y = x)$.
Each is true exactly when the extension of $P$ has one element.
:::

:::proof{#proof-unique-forms of="the three forms of uniqueness" depth="standard"}
**Idea first:** each form names a candidate and then checks that nothing else qualifies.

If $P$ has exactly one element $a$: (1) take $x = a$; every $y$ with $P(y)$ equals $a$. (2) $a$ witnesses
existence, and any two elements of $P$ are both $a$. (3) take $x = a$: $P(y)$ holds exactly when $y = a$.
If $P$ is empty: (1) and (3) need $P(x)$ for the chosen $x$ (in (3), $y = x$ forces $P(x)$), and (2) needs
$\exists x\, P(x)$; all three are false. If $P$ has two different elements $a, b$: whatever $x$ (1) or (3)
picks, one of $a, b$ differs from it and still satisfies $P$, so the check fails; in (2) the pair $a,
b$ breaks "at most one". So all three are true in exactly the same worlds. **Sanity check** on
$D = \{1, 2, 3\}$: $P = \{2\}$ makes all three T; $P = \varnothing$ and $P = \{1, 3\}$ make all three F.
:::

:::viz{#unique-viz spec="quant-exactly-one" mode="animate" depth="standard"}
:::

:::trick{#trick-three-worlds title="Test 'exactly one' on the 0, 1 and 2 worlds" depth="standard"}
To check an option for "exactly one", evaluate it in three tiny situations: nobody qualifies, exactly
one qualifies, two qualify. A correct formula is F, T, F. Existence-only formulas give F, T, **T**;
uniqueness-only formulas give **T**, T, F.

**Why it works:** "exactly one" depends only on the size of the extension, and the boundary sizes 0 and
2 are where the half-formulas fail. **When it fails:** if the option is not even about the right
predicate (wrong argument order, a free variable), fix that first.
:::

:::trap{#trap-unique-nested title="∃!x ∃!y is not 'exactly one pair'" depth="quick"}
$\exists! x \exists! y\, R(x, y)$ says that exactly one $x$ has exactly one partner. On $D = \{0, 1\}$ with $R =
\{(0, 0), (1, 0), (1, 1)\}$, only $x = 0$ has exactly one partner, so the formula is true, yet $R$ has three
pairs. Unlike $\exists\exists$, the uniqueness quantifiers do not combine into a statement about pairs.
:::

:::note{#recap-unique title="Recap" depth="quick"}
Exactly one = existence + uniqueness: $\exists x(P(x) \wedge \forall y(P(y) \to y = x))$. At least two needs
$\ne$; at most one says any two are equal. Test options on the 0-, 1- and 2-element situations.
:::

### Worked examples: counting with quantifiers

::::example{#ex-count-easy level="easy" title="∃ against ∃! on a small domain" depth="quick"}
On $D = \{1, 2, 3\}$, evaluate $\exists x\, P(x)$ and $\exists! x\, P(x)$ when (i) $P = \{2\}$, (ii) $P = \{1, 3\}$.

:::step{why="∃ only asks for one witness."}
(i) T (witness 2). (ii) T (witness 1).
:::

:::step{why="∃! asks for exactly one element in the extension of P."}
(i) T: only 2. (ii) F: both 1 and 3 qualify.
:::

:::answer
(i) T, T. (ii) T, F. "There is a" and "there is exactly one" part company as soon as two elements
qualify.
:::
::::

::::example{#ex-count-medium level="medium" title="At least two and at most one" depth="standard"}
For $P \subseteq \{1, 2, 3\}$, on how many of the $8$ possible extensions is "at least two" true, and on how
many is "at most one" true?

:::step{why="At least two needs two different witnesses x ≠ y: the extension must have 2 or 3 elements."}
Subsets of size 2 or 3: $\binom32 + \binom33 = 3 + 1 = 4$.
:::

:::step{why="At most one forbids two different elements: sizes 0 or 1."}
$\binom30 + \binom31 = 1 + 3 = 4$.
:::

:::step{why="The two formulas are negations of each other, so their counts must add up to 8."}
$4 + 4 = 8$. Check.
:::

:::answer
4 and 4. "At most one" $\equiv \neg$("at least two"), so every extension satisfies exactly one of them.
:::
::::

::::example{#ex-count-gate level="gate" title="Every student has exactly one advisor (GATE 2025 pattern)" depth="standard"}
$Ad(a, s)$: $a$ is an advisor of $s$. Which say "everyone has exactly one advisor":
(a) $\forall s \exists a(Ad(a, s) \wedge \forall b(b \ne a \to \neg Ad(b, s)))$,
(b) $\forall s \exists a \exists b(Ad(a, s) \wedge \neg Ad(b, s))$,
(c) $\forall s \forall a(Ad(a, s) \to \exists b(Ad(b, s) \wedge b = a))$?

:::step{why="Exactly one advisor for s: some a advises s, and no b different from a does."}
Target: $\forall s \exists! a\, Ad(a, s)$, which is (a) with uniqueness written as "every other $b$ is not an
advisor".
:::

:::step{why="Test (b) on the three situations for a person: 0, 1, 2 advisors (need a domain with a non-advisor)."}
(b) says "someone advises $s$ and someone does not": it is T with two advisors in a three-person world.
Existence without uniqueness.
:::

:::step{why="In (c), b = a always works, so the inner ∃ is true whenever Ad(a, s) is."}
(c) is true in **every** world, even when someone has no advisor.
:::

:::answer
Only (a). (b) lacks uniqueness, and (c) is a tautology (it never asserts existence and its uniqueness
check compares $a$ with itself).
:::
::::

::::example{#ex-count-edge level="gate" title="Edge case: nested uniqueness" depth="standard"}
On $D = \{0, 1\}$ with $R = \{(0, 0), (1, 0), (1, 1)\}$, evaluate $\exists! x \exists! y\, R(x, y)$ and
$\exists! y \exists! x\, R(x, y)$.

:::step{why="For each x count its partners y (row counts of the grid)."}
Row 0: one partner (0). Row 1: two partners (0, 1). Exactly one row has exactly one partner, so
$\exists! x \exists! y\, R$ = **T**.
:::

:::step{why="For each y count the x with R(x, y) (column counts)."}
Column 0: $x \in \{0, 1\}$, two. Column 1: $x = 1$ only, one. Exactly one column has one entry:
$\exists! y \exists! x\, R$ = **T**.
:::

:::step{why="Compare with 'exactly one pair', which needs |R| = 1."}
$|R| = 3$, so "exactly one pair" is F.
:::

:::answer
Both are T, while $R$ has three pairs: nested $\exists!$ counts rows (or columns) with one entry, not
pairs. (In other worlds the two orders even disagree; the Lab finds one quickly.)
:::
::::

:::note{#recap-count-examples title="Recap" depth="quick"}
Write existence and uniqueness separately and join them. A uniqueness check must compare with a
**different** object ($\ne$), never with itself. Nested $\exists!$ is about rows or columns, not pairs.
:::

## Numbers in logic: divides, prime, a larger prime

:::intuition{#numbers-intuition title="A definition is a formula with one free variable" depth="standard"}
"$x$ is prime" is a definition: "$x > 1$, and the only divisors of $x$ are $1$ and $x$". Written in logic
it becomes a formula $Prime(x)$ with exactly one free variable, $x$, and every other variable bound.
GATE gives you such a formula and asks what it means (2011), or plugs it into a bigger sentence such as
"for every prime there is a larger prime" and asks on which domains that sentence is true (2019). The
skill is to read the inner formula as a named predicate, then read the outer sentence with that name.
:::

:::definition{#number-predicates term="Divides, even, prime" depth="standard"}
Over the positive integers:

- $x \mid y$ ("$x$ divides $y$") is $\exists k\,(y = k \cdot x)$.
- $Even(x)$ is $\exists k\,(x = 2k)$, or $2 \mid x$.
- $Prime(x)$ is $x \ne 1 \wedge \forall y\,(y \mid x \to (y = 1 \vee y = x))$: $x$ is not 1 and its only divisors
  are 1 and $x$. Over the positive integers $x \ne 1$ is the same as $x > 1$.
- "There is no largest prime": $\forall x\,(Prime(x) \to \exists w\,(w > x \wedge Prime(w)))$.
:::

:::derivation{#prime-derivation of="why the prime formula needs x ≠ 1, and positive divisors" depth="standard"}
For $x = 1$ the only divisor is $1$, so "$\forall y(y \mid 1 \to y = 1 \vee y = 1)$" is true: without the clause
$x \ne 1$ the formula would call 1 a prime. For $x = 6$ the divisor $y = 2$ is neither 1 nor 6, so the
$\forall$ fails: composite numbers are rejected by one counterexample divisor. **Sanity check:**
evaluating the formula on $1, \dots, 30$ gives exactly $2, 3, 5, 7, 11, 13, 17, 19, 23, 29$. Over **all
integers**, $-1$ divides every number, so the divisor clause rejects every $x$ except $-1$ itself
($-1$'s divisors are $1$ and $-1$). The formula works only when $y$ ranges over positive divisors, which
is the reading every GATE question intends.
:::

:::trap{#trap-prime-one title="Forgetting x ≠ 1, or reading 'two factors other than 1 and x'" depth="quick"}
In GATE 2011 the distractor "$x$ has exactly two factors other than 1 and $x$" misreads the formula: the
formula says the only factors are 1 and $x$, i.e. **no** factor other than those two. And the clause
$\neg(x = 1)$ is what stops 1 from qualifying; "$P(x)$ means $x \ne 1$" ignores the second conjunct.
:::

:::note{#recap-numbers title="Recap" depth="quick"}
Read nested number formulas inside out: name the inner formula (prime, divides), then read the outer
sentence with that name. $Prime(x) = x \ne 1 \wedge \forall y(y \mid x \to y = 1 \vee y = x)$ over positive divisors.
Whether a sentence holds depends on the domain: "no largest prime" is false on $\{1, \dots, 100\}$.
:::

### Worked examples: number predicates

::::example{#ex-num-easy level="easy" title="Evaluating 'divides'" depth="quick"}
On $D = \{1, 2, 3, 4, 5, 6\}$, is $\forall x\,(1 \mid x)$ true? Is $\exists x \forall y\,(y \mid x)$ true?

:::step{why="1 divides every integer: x = x · 1."}
$\forall x\,(1 \mid x)$ is **T**.
:::

:::step{why="∃x∀y(y | x) needs one x divisible by every element of D: look for a common multiple inside D."}
Every $y \in D$ must divide $x$, so $x$ would be a multiple of $\mathrm{lcm}(1, \dots, 6) = 60$; no element of $D$ is.
**F**.
:::

:::answer
T and F. (On the positive integers $\exists x \forall y(y \mid x)$ is still false; on $\mathbb{N}$ with 0 it is true,
since every number divides 0.)
:::
::::

::::example{#ex-num-medium level="medium" title="Reading the prime formula" depth="standard"}
Which $x \in \{1, \dots, 12\}$ satisfy $\neg(x = 1) \wedge \forall y\,(\exists z\,(x = y \cdot z) \to (y = x \vee y = 1))$, with
$y, z$ ranging over positive integers?

:::step{why="∃z(x = y·z) is the formula for y | x: name it before reading the rest."}
The formula is $x \ne 1 \wedge \forall y(y \mid x \to y = x \vee y = 1)$: the definition of prime.
:::

:::step{why="Check the composite numbers: one divisor other than 1 and x is a counterexample to the ∀."}
4 (divisor 2), 6 (2), 8 (2), 9 (3), 10 (2), 12 (2) fail. 1 fails the first conjunct.
:::

:::answer
$x \in \{2, 3, 5, 7, 11\}$: exactly the primes in range. This is GATE 2011's formula.
:::
::::

::::example{#ex-num-gate level="gate" title="Is there always a larger prime? (GATE 2019 pattern)" depth="standard"}
Decide $\forall x\,(Prime(x) \to \exists w\,(w > x \wedge Prime(w)))$ on (i) $\{1, \dots, 50\}$, (ii) $\{1, \dots, 60\}$,
(iii) the positive integers.

:::step{why="The sentence fails exactly at the largest prime of the domain, if there is one."}
A counterexample is a prime $x$ with no prime above it in the domain.
:::

:::step{why="List the top primes: 47 is the largest prime ≤ 50, and 53, 59 are ≤ 60."}
(i) $x = 47$: no prime in $48, \dots, 50$: **F**. (ii) $x = 59$: no prime in $60$: **F**.
:::

:::step{why="On the positive integers there are infinitely many primes (Euclid), so every prime has a larger one."}
(iii) **T**.
:::

:::answer
F, F, T. Every finite domain fails (its largest prime is a counterexample); only an infinite supply of
primes satisfies the sentence.
:::
::::

::::example{#ex-num-edge level="gate" title="Edge case: the prime formula over all integers" depth="standard"}
Over $\mathbb{Z}$ (divisors also ranging over $\mathbb{Z}$), which $x$ satisfy $\forall z\,(z \mid x \to (z = x \vee z = 1))$?

:::step{why="−1 divides every integer, so z = −1 is tested for every x; it passes only if −1 = x (it is never 1)."}
Only $x = -1$ can survive.
:::

:::step{why="Check x = −1: its divisors are 1 and −1, and each is 1 or x."}
$x = -1$ satisfies it. For $x = 7$: $z = -7$ divides 7 and is neither 7 nor 1, a counterexample.
:::

:::answer
Only $x = -1$. Over the integers the textbook prime formula breaks; it needs "positive divisor". GATE
2019's sentence is about primes, so it must be read with positive divisors (the intended reading) to
make sense on the set of all integers.
:::
::::

:::note{#recap-num-examples title="Recap" depth="quick"}
Recognise the inner formula, name it, read the outer sentence. Check finite domains at their largest
element. Over the integers, negative divisors change the meaning: say which reading you use.
:::

## Try it: the Quantifier Lab

Pick a domain of 2 to 5 elements, tick the cells of the unary predicates $P$ and $Q$ and the grid of
the binary predicate $R$, and type a formula (use `forall x`, `exists x`, `->`, `&`, `|`, `~`, `=` and
`!=`, or the buttons). The Lab evaluates it and shows the strip or grid it used. Try `forall x exists y
R(x, y)` against `exists y forall x R(x, y)` on a cycle, `forall x (P(x) -> Q(x))` against `forall x (P(x)
& Q(x))` with one element outside $P$, and `∃!x Q(x)` as you tick a second element of $Q$.

:::lab{#lab-quant lab="quantifier-lab" tab="evaluate" depth="standard"}
:::

## GATE questions on this lesson

All nineteen previous-year questions. Try each before opening the solution.

:::pyq{id="cse-2004-cs-23" tests="four-forms,nested-def,ex-nest-gate,trick-pairing" depth="standard"}
:::

:::pyq{id="it-2004-it-3" tests="quant-demorgan,trick-negation,ex-neg-medium" depth="standard"}
:::

:::pyq{id="cse-2005-cs-41" tests="trap-order,order-theorem,ex-nest-gate" depth="standard"}
:::

:::pyq{id="cse-2006-cs-26" tests="only-def,plural-derivation,trap-and-plural" depth="standard"}
:::

:::pyq{id="cse-2007-cs-22" tests="restricted-negation,trap-neg-restriction,ex-only-gate" depth="standard"}
:::

:::pyq{id="cse-2008-cs-30" tests="bound-free-def,trap-scope-free,ex-scope-gate" depth="standard"}
:::

:::pyq{id="it-2008-it-22" tests="quant-demorgan,trick-negation,ex-neg-gate" depth="standard"}
:::

:::pyq{id="cse-2009-cs-23" tests="only-def,trap-and-plural,ex-only-medium" depth="standard"}
:::

:::pyq{id="cse-2009-cs-26" tests="quant-demorgan,proof-quant-demorgan" depth="standard"}
:::

:::pyq{id="cse-2010-cs-30" tests="quant-demorgan,ex-neg-medium,nested-def" depth="standard"}
:::

:::pyq{id="cse-2011-cs-30" tests="number-predicates,prime-derivation,ex-num-medium,trap-prime-one" depth="standard"}
:::

:::pyq{id="cse-2012-cs-13" tests="four-forms,pairing-theorem,trap-exists-imp" depth="standard"}
:::

:::pyq{id="cse-2013-cs-27" tests="four-forms,only-def,ex-form-easy" depth="standard"}
:::

:::pyq{id="cse-2014-1-cs-1" tests="trap-every-not,restricted-negation,ex-neg-easy" depth="standard"}
:::

:::pyq{id="cse-2014-3-cs-53" tests="four-forms,trap-forall-and,restricted-negation" depth="standard"}
:::

:::pyq{id="cse-2019-cs-35" tests="number-predicates,prime-derivation,ex-num-gate,ex-num-edge" depth="standard"}
:::

:::pyq{id="cse-2023-cs-16" tests="order-theorem,nonempty-convention,trick-order" depth="standard"}
:::

:::pyq{id="cse-2025-1-cs-38" tests="unique-def,unique-forms-theorem,trick-three-worlds,ex-count-gate" depth="standard"}
:::

:::pyq{id="cse-2026-2-cs-1" tests="nested-def,ex-nest-edge,order-intuition" depth="standard"}
:::

## Practice

Our own questions in GATE formats: translation both ways, negation, quantifier order and uniqueness.

:::practice{id="nx-dm-02-01-q01" depth="standard"}
:::

:::practice{id="nx-dm-02-01-q02" depth="standard"}
:::

:::practice{id="nx-dm-02-01-q03" depth="standard"}
:::

:::practice{id="nx-dm-02-01-q04" depth="standard"}
:::

:::practice{id="nx-dm-02-01-q05" depth="standard"}
:::

:::practice{id="nx-dm-02-01-q06" depth="standard"}
:::

:::practice{id="nx-dm-02-01-q07" depth="standard"}
:::

:::practice{id="nx-dm-02-01-q08" depth="standard"}
:::

:::practice{id="nx-dm-02-01-q09" depth="standard"}
:::

:::practice{id="nx-dm-02-01-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Predicates and quantifiers on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Predicate | a sentence with holes; true or false once the objects are fixed |
| $\forall$ / $\exists$ | big AND / big OR over the (non-empty) domain; one counterexample / one witness |
| Scope | a quantifier binds as tightly as $\neg$; bracket for a wider scope; outside it a variable is free |
| All / some | $\forall x(A \to B)$ / $\exists x(A \wedge B)$; never $\forall(A \wedge B)$ or $\exists(A \to B)$ |
| No / not all | $\forall x(A \to \neg B) \equiv \neg\exists x(A \wedge B)$ / $\exists x(A \wedge \neg B) \equiv \neg\forall x(A \to B)$ |
| Only | "only $A$ are $B$" $= \forall x(B \to A)$; "all and only" $= \forall x(A \leftrightarrow B)$ |
| Plurals | "$A$ and $C$ are $B$" $= \forall x((A \vee C) \to B)$ |
| Order | $\exists y \forall x \Rightarrow \forall x \exists y$, not conversely; like quantifiers commute |
| Negation | $\neg\forall = \exists\neg$, $\neg\exists = \forall\neg$; keep the filter, switch $\to$ and $\wedge$ |
| Exactly one | $\exists x(P(x) \wedge \forall y(P(y) \to y = x))$; test on 0, 1, 2 elements |
| Else / other | add the filter $y \ne x$ |
| Prime | $x \ne 1 \wedge \forall y(y \mid x \to y = 1 \vee y = x)$ over positive divisors |
:::

:::note{#further-depth title="Further depth: Skolem functions and the order of quantifiers" depth="deep"}
The game reading of $\forall x \exists y\, \varphi(x, y)$ has a precise form: the sentence is true exactly
when there is a **function** $f$ with $\varphi(x, f(x))$ for every $x$ (a strategy that answers each $x$).
$\exists y \forall x\, \varphi$ is the special case where $f$ is constant. This is why moving an $\exists$
to the right weakens a sentence (a constant function is a function) and moving it left strengthens it.
Logicians call $f$ a Skolem function; resolution provers in AI replace every $\exists$ by such a
function before they start, which is the bridge between this chapter and Chapter 1's resolution.
:::
