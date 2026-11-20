---
id: predicates-quantifiers
subject: dm
chapter: predicate-logic
title: Predicates, quantifiers and translation
order: 1
prerequisites: [equivalence-normal-forms]
pyq_topics: [dm/logic]
est_minutes: 90
difficulty: core
status: review
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every evaluation, translation, negation, PYQ key and practice answer is recomputed in content/gate-notes/_checks/dm/l2_01_quantifiers.py with predlib.py (exhaustive search over every interpretation on domains of size 1 to 3, plus hand-built worlds)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 26–37, set B pp. 168–173, set C pp. 296–311, set D pp. 676–679. Set A's gloss of 'only A are B' is recorded in _errata/dm.md."
  - "Facts checked against standard textbooks: K. H. Rosen, Discrete Mathematics and its Applications (predicates and quantifiers, nested quantifiers); H. B. Enderton, A Mathematical Introduction to Logic (structures and satisfaction)."
  - "PYQs: src/gate/questions.json (dm/logic); all nineteen keys are re-derived by model search in l2_01_quantifiers.py; GATE 2019's set S3 is discussed in _errata/dm.md."
updated: "2026-11-20"
---

Propositional logic can say "it is raining" or "7 is prime", one fixed sentence at a time. It cannot
say "**every** prime greater than 2 is odd" or "**some** student failed", because those sentences talk
about a whole collection at once. This lesson adds the two words that do that, **for all** ($\forall$)
and **there exists** ($\exists$), on top of the connectives you already know.

Almost every GATE question on this topic is a translation: an English sentence and four formulas, of
which three are subtly wrong. The wrong ones are wrong in a small number of ways that repeat every
year: $\forall$ paired with $\wedge$ instead of $\to$, $\exists$ paired with $\to$ instead of $\wedge$,
quantifiers in the wrong order, or a negation pushed in half way. We build the meaning carefully, then
learn each of those traps by name, so that you can check an option in seconds.

## Where this fits

This is the first lesson of Chapter 2. It uses everything from
[Chapter 1](lesson:propositions-connectives): connectives, implication read as a promise, and
[De Morgan's laws](lesson:equivalence-normal-forms). [Lesson 2](lesson:quantifier-laws-validity)
continues with the laws that let you move quantifiers around, and with validity: how to prove that a
quantified formula is always true, or find a small world where it fails. Later chapters speak this
language all the time: a relation is reflexive when $\forall x\, R(x, x)$, a function is onto when
$\forall y \exists x\, f(x) = y$, and in Theory of Computation the pumping lemma is a
$\exists\forall\exists\forall$ sentence.

:::table{#radar title="GATE radar: predicates, quantifiers and translation" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 19 (2004–2026) |
| Marks | 5 one-mark, 14 two-mark; 2 are multiple-select |
| Pattern 1 | Translate an English sentence into a formula: 2004, 2005, 2006, 2008, 2009, 2012, 2013, 2014 (both papers), 2025, 2026 |
| Pattern 2 | "Not all", "none" and negation of a quantified formula: 2007, 2009, 2010, 2014, IT 2004, IT 2008 |
| Pattern 3 | Number theory written in logic (prime, divides): 2011, 2019 |
| Pattern 4 | Which statement implies another, nested $\forall\exists$: 2023 |
| What examiners test | $\forall$ goes with $\to$ and $\exists$ goes with $\wedge$; $\forall x \exists y$ is weaker than $\exists y \forall x$; $\neg\forall = \exists\neg$ and $\neg\exists = \forall\neg$; "none of", "not all" and "only" |
:::

## From propositions to predicates

:::intuition{#blank-intuition title="A predicate is a sentence with a blank" depth="standard"}
Take the sentence "\_\_\_ is prime". On its own it is neither true nor false: it has a blank. Put 7 in
the blank and you get a true proposition; put 8 and you get a false one. A **predicate** is exactly
such a sentence with blanks, and the things that may go in the blanks form the **domain**.

Two blanks work the same way: "\_\_\_ is taller than \_\_\_" becomes a proposition once both blanks are
filled ("Asha is taller than Ravi"). So a predicate is a machine that eats objects from the domain and
returns T or F. Everything in this chapter is built from such machines.
:::

:::definition{#predicate-def term="Predicate, arity and domain" depth="quick"}
A **predicate** $P(x_1, \dots, x_k)$ is a statement about $k$ objects that becomes a proposition when
each $x_i$ is replaced by an object from a fixed non-empty set $D$, the **domain** (or universe of
discourse). $k$ is the **arity**: $\text{prime}(x)$ is unary, $\text{taller}(x, y)$ is binary,
$F(x, y, t)$ ("$x$ can fool $y$ at time $t$") is ternary.

- With $D = \mathbb{Z}$: $\text{even}(4)$ is T, $\text{even}(7)$ is F, $x < y$ is a binary predicate.
- Equality $x = y$ is a binary predicate that every domain has, with its usual meaning.
- A predicate with no free blank left is just a proposition, so propositional logic is the special
  case of arity 0.
:::

:::trap{#trap-open-predicate title="P(x) alone is not a proposition" depth="quick"}
"$x > 3$" has no truth value: it waits for $x$. It becomes a proposition in exactly two ways: give $x$ a
value ("$5 > 3$"), or **quantify** it ("for every $x$, $x > 3$", which is false on $\mathbb{Z}$). A
formula whose every variable is quantified is called a **sentence**; only sentences have a truth value
once the domain and the predicates are fixed.
:::

## The two quantifiers

:::intuition{#big-and-intuition title="∀ is a giant AND, ∃ is a giant OR" depth="standard"}
Suppose the domain is a small class of four students $a, b, c, d$, and $P(x)$ means "$x$ passed".
"Everyone passed" is the claim $P(a) \wedge P(b) \wedge P(c) \wedge P(d)$: it needs every student, and
one failure sinks it. "Someone passed" is $P(a) \vee P(b) \vee P(c) \vee P(d)$: one success is enough.

That is all a quantifier is. $\forall x\, P(x)$ is a conjunction with one term for each element of the
domain, and $\exists x\, P(x)$ is a disjunction with one term for each element. On an infinite domain
the conjunction is infinitely long, so we can no longer write it out, but the meaning is the same:
$\forall$ needs **no counterexample**, $\exists$ needs **one witness**.
:::

:::definition{#quantifier-def term="Universal and existential quantifiers" depth="quick"}
For a formula $\varphi(x)$ and a domain $D$:

- $\forall x\, \varphi(x)$ ("for all $x$, $\varphi(x)$") is **true** iff $\varphi(d)$ is true for **every**
  $d \in D$. It is false iff there is at least one **counterexample** $d$ with $\varphi(d)$ false.
- $\exists x\, \varphi(x)$ ("there exists an $x$ such that $\varphi(x)$") is **true** iff $\varphi(d)$
  is true for **at least one** $d \in D$, a **witness**. It is false iff $\varphi(d)$ is false for every $d$.

On a finite domain $D = \{d_1, \dots, d_n\}$:
$$\forall x\, \varphi(x) \equiv \varphi(d_1) \wedge \cdots \wedge \varphi(d_n), \qquad \exists x\, \varphi(x) \equiv \varphi(d_1) \vee \cdots \vee \varphi(d_n).$$
:::

:::viz{#forall-viz spec="forall-big-and" mode="animate" depth="standard"}
:::

:::viz{#exists-viz spec="exists-big-or" mode="animate" depth="standard"}
:::

:::definition{#nonempty-convention term="Domains are non-empty" depth="standard"}
Throughout this subject, and in every GATE question, the domain is **non-empty**. This matters for
exactly one family of facts. On a non-empty domain $\forall x\, P(x) \to \exists x\, P(x)$ is always
true: if $P$ holds for everything, it holds for the element that exists. On the empty domain,
$\forall x\, P(x)$ would be vacuously true (there is no counterexample) while $\exists x\, P(x)$ would be
false, so the implication would fail. Some reference notes evaluate over an empty domain without
saying so; we never do.
:::

:::theorem{#forall-exists-theorem name="Everything implies something" depth="standard"}
On every non-empty domain, $\forall x\, P(x) \to \exists x\, P(x)$ is true, whatever $P$ means. The
converse $\exists x\, P(x) \to \forall x\, P(x)$ is not: it fails as soon as $P$ is true of one element
and false of another.
:::

:::proof{#proof-forall-exists of="everything implies something" depth="standard"}
**Idea first:** an element exists, and the universal claim covers it.

Assume $\forall x\, P(x)$ is true. The domain has some element $d$. The universal claim includes $d$,
so $P(d)$ is true. Then $d$ is a witness for $\exists x\, P(x)$. For the converse, take $D = \{1, 2\}$
with $P(1)$ = T and $P(2)$ = F: $\exists x\, P(x)$ is true (witness 1) and $\forall x\, P(x)$ is false
(counterexample 2).
:::

### Bound and free variables

:::intuition{#scope-intuition title="A quantifier owns its variable inside a bracket" depth="standard"}
In $\int_0^1 x^2\, dx$ the letter $x$ is a dummy: the answer is $1/3$, and renaming $x$ to $t$ changes
nothing. Quantifiers work the same way. In $\forall x\, P(x)$ the $x$ is a dummy owned by $\forall$; the
sentence means the same as $\forall t\, P(t)$. A variable that no quantifier owns is **free**: it is a
genuine blank, and the formula's value depends on what you put there.
:::

:::definition{#bound-free-def term="Scope, bound and free occurrences" depth="quick"}
In $\forall x\, \psi$ and $\exists x\, \psi$, the formula $\psi$ is the **scope** of the quantifier. An
occurrence of $x$ inside the scope of a quantifier on $x$ is **bound** (by the nearest such quantifier);
an occurrence not inside any quantifier on $x$ is **free**. A formula with no free variables is a
**sentence**.

**Grouping convention.** A quantifier binds as tightly as $\neg$: it applies to the next atom,
negation, quantifier or bracket. So $\forall x\, P(x) \to Q(x)$ means $(\forall x\, P(x)) \to Q(x)$, and
the last $x$ is **free**. To make the quantifier cover the whole implication, write
$\forall x\, (P(x) \to Q(x))$. GATE options always print the brackets; read them carefully.
:::

:::viz{#scope-viz spec="scope-bracket" mode="animate" depth="standard"}
:::

:::trap{#trap-scope title="The bracket after the quantifier decides everything" depth="quick"}
$\forall x\, (P(x) \to Q(x))$ says "every $P$ is a $Q$". $(\forall x\, P(x)) \to Q(x)$ is not even a
sentence: it says "if everything is a $P$, then this particular $x$ is a $Q$", with $x$ free. When an
option's bracket closes early, ask which occurrences have escaped the quantifier.
:::

:::trick{#trick-rename title="Rename bound variables apart before you do anything" depth="standard"}
$\forall x\, P(x) \wedge \exists x\, Q(x)$ uses the letter $x$ twice for two different dummies. Rename one:
$\forall x\, P(x) \wedge \exists y\, Q(y)$. The meaning is unchanged (bound variables are dummies), and
every later step (pulling quantifiers out, negating, reading aloud) becomes safe. **When it fails:**
never rename a free variable, and never rename into a letter already used inside the scope, or you
capture it.
:::

## Worked examples: evaluating quantified formulas

::::example{#ex-eval-easy level="easy" title="A small domain, written out" depth="quick"}
Domain $D = \{1, 2, 3, 4\}$. Let $E(x)$: "$x$ is even" and $S(x)$: "$x < 4$". Find the values of
$\forall x\, S(x)$, $\exists x\, E(x)$ and $\forall x\, (E(x) \to S(x))$.

:::step{why="∀ is a conjunction over the domain: look for a counterexample."}
$S(1), S(2), S(3)$ are T but $S(4)$ is F, so $\forall x\, S(x)$ = **F** (counterexample 4).
:::

:::step{why="∃ is a disjunction: one witness suffices."}
$E(2)$ is T, so $\exists x\, E(x)$ = **T** (witness 2).
:::

:::step{why="For ∀x(E → S), only the elements where E is true can break the promise."}
$E$ is true at 2 and 4. At 2: $S(2)$ = T, kept. At 4: $S(4)$ = F, **broken**.
:::

:::answer
F, T, F. The implication fails only at $x = 4$, the even number that is not less than 4.
:::
::::

::::example{#ex-eval-medium level="medium" title="A binary predicate as a grid" depth="standard"}
Domain $\{a, b, c\}$; $R(x, y)$ is true exactly for the pairs $(a, b), (b, c), (c, a)$. Evaluate
$\forall x\, \exists y\, R(x, y)$ and $\exists y\, \forall x\, R(x, y)$.

:::step{why="Read ∀x∃y row by row: every row x needs at least one y."}
Row $a$ has $(a, b)$; row $b$ has $(b, c)$; row $c$ has $(c, a)$. Every row has a T, so
$\forall x\, \exists y\, R(x, y)$ = **T**.
:::

:::step{why="Read ∃y∀x column by column: one column must be all T."}
Column $a$ has only $(c, a)$; column $b$ only $(a, b)$; column $c$ only $(b, c)$. No column is full.
:::

:::answer
$\forall x\, \exists y\, R(x, y)$ = T, $\exists y\, \forall x\, R(x, y)$ = F. Each $x$ has a different
partner, so no single $y$ serves everyone. We return to this in the section on nested quantifiers.
:::
::::

::::example{#ex-eval-gate level="gate" title="Infinite domains: the claim decides the method" depth="standard"}
Over $\mathbb{N} = \{0, 1, 2, \dots\}$, decide: (i) $\forall x\, \exists y\, (y > x)$; (ii)
$\exists y\, \forall x\, (y > x)$; (iii) $\exists x\, \forall y\, (x \le y)$.

:::step{why="For ∀∃ we must produce a y for an arbitrary x: give a rule that works for every x."}
(i) Given any $x$, choose $y = x + 1$; then $y > x$. True for every $x$, so (i) is **T**.
:::

:::step{why="For ∃∀ we must name one y that beats everything; a single counterexample kills each candidate."}
(ii) Any candidate $y$ fails at $x = y$ (since $y > y$ is false). No candidate survives: **F**.
:::

:::step{why="Here one x must be ≤ every y: try the obvious candidate."}
(iii) $x = 0$ satisfies $0 \le y$ for every $y \in \mathbb{N}$: **T**. Over $\mathbb{Z}$ it would be F.
:::

:::answer
T, F, T. On an infinite domain you prove a $\forall$ with a general argument and refute it with one
counterexample; you prove an $\exists$ with one witness.
:::
::::

::::example{#ex-eval-edge level="gate" title="When the domain changes the answer" depth="standard"}
Is $\forall x\, \exists y\, (x = 2y)$ true? Answer for the domains $\mathbb{Z}$, the even integers, and
$\mathbb{Q}$.

:::step{why="Over ℤ, look for a counterexample x."}
$x = 1$: $1 = 2y$ needs $y = 1/2 \notin \mathbb{Z}$. **F** over $\mathbb{Z}$.
:::

:::step{why="Over the even integers, y must itself be even, so x must be a multiple of 4."}
$x = 2$ needs $y = 1$, which is not even. **F** over the even integers too.
:::

:::step{why="Over ℚ every number can be halved."}
For any $x$, $y = x/2 \in \mathbb{Q}$. **T** over $\mathbb{Q}$.
:::

:::answer
F, F, T. The same formula can be true in one domain and false in another, which is why every GATE
question states its domain (or its predicates fix it).
:::
::::

::::check{#check-eval title="Quick check: evaluating" depth="quick"}
On $D = \{1, 2, 3\}$ with $P = \{1, 3\}$ (the elements where $P$ is true): is $\forall x\, (P(x) \vee
x = 2)$ true? Is $\exists x\, (P(x) \wedge x > 2)$ true?

:::answer
Yes (1, 3 satisfy $P$, 2 satisfies
$x = 2$); yes (witness 3).
:::
::::

**Recap.** $\forall$ is a big AND (needs no counterexample), $\exists$ is a big OR (needs one
witness). A quantifier binds like $\neg$, so watch where its bracket closes. The same sentence can
change value when the domain changes.

## Translating English: the four basic forms

:::intuition{#form-intuition title="'All' is a promise, 'some' is a sighting" depth="standard"}
"All dogs bark" is a promise about dogs: walk through the whole domain, and **if** the thing in front
of you is a dog, **then** it had better bark. Cats, chairs and numbers are not tested; they keep the
promise vacuously, exactly like the false-hypothesis rows of $p \to q$. So "all" pairs with $\to$.

"Some dog barks" is a sighting: somewhere in the domain there is one thing that is a dog **and**
barks, both at once. So "some" pairs with $\wedge$. Mixing the pairs is the most common error in this
whole topic, and examiners put it in almost every question.
:::

:::definition{#four-forms term="The four basic forms (and their friends)" depth="quick"}
With $A(x)$ and $B(x)$ predicates on one domain:

| English | Formula | Equivalent forms |
|:--|:--|:--|
| All $A$ are $B$ | $\forall x\, (A(x) \to B(x))$ | $\neg\exists x\, (A(x) \wedge \neg B(x))$ |
| Some $A$ are $B$ | $\exists x\, (A(x) \wedge B(x))$ | $\neg\forall x\, (A(x) \to \neg B(x))$ |
| No $A$ is $B$ (none of the $A$ are $B$) | $\forall x\, (A(x) \to \neg B(x))$ | $\neg\exists x\, (A(x) \wedge B(x))$ |
| Not all $A$ are $B$ (some $A$ is not $B$) | $\exists x\, (A(x) \wedge \neg B(x))$ | $\neg\forall x\, (A(x) \to B(x))$ |
| Only $A$ are $B$ (all $B$ are $A$) | $\forall x\, (B(x) \to A(x))$ | $\neg\exists x\, (B(x) \wedge \neg A(x))$ |
| Everything is $B$ | $\forall x\, B(x)$ | |

The right-hand column is the left-hand column with the negation pushed through; the next section
proves that pushing.
:::

:::theorem{#pairing-theorem name="Why ∀ takes → and ∃ takes ∧" depth="standard"}
(1) $\forall x\, (A(x) \wedge B(x))$ is **stronger** than "all $A$ are $B$": it also claims that
everything in the domain is an $A$. (2) $\exists x\, (A(x) \to B(x))$ is **weaker** than "some $A$ are
$B$": it is made true by any single non-$A$, and by every world that has no $A$ at all.
:::

:::proof{#proof-pairing of="the pairing rule" depth="standard"}
**Idea first:** test each wrong formula on a world that contains something that is not an $A$.

(1) $A(x) \wedge B(x)$ implies $A(x) \to B(x)$ for each $x$ (if both hold, the promise is kept), so
$\forall x\, (A \wedge B)$ implies $\forall x\, (A \to B)$. The reverse fails: in a world with a cat and a
barking dog, "all dogs bark" is true but "everything is a barking dog" is false (the cat).

(2) $A(x) \wedge B(x)$ implies $A(x) \to B(x)$, so $\exists x\, (A \wedge B)$ implies $\exists x\, (A \to B)$.
The reverse fails: in a world with a cat and a silent dog, no dog barks, yet $A(\text{cat}) \to
B(\text{cat})$ is F → … = T, so $\exists x\, (A \to B)$ is true, witnessed by the cat.
:::

:::viz{#all-wrong-viz spec="all-are-wrong" mode="animate" depth="standard"}
:::

:::viz{#some-wrong-viz spec="some-are-wrong" mode="animate" depth="standard"}
:::

:::trap{#trap-forall-and title="∀ with ∧ claims that everything is an A" depth="quick"}
"All rainy days are cold" is **not** $\forall d\, (\text{Rainy}(d) \wedge \text{Cold}(d))$; that says
every day is rainy and cold. A single sunny day makes it false, although the English sentence says
nothing about sunny days. GATE 2014 offers exactly this as option A.
:::

:::trap{#trap-exists-imp title="∃ with → is made true by any non-A" depth="quick"}
"Some real numbers are rational" is **not** $\exists x\, (\text{rational}(x) \to \text{real}(x))$ or
$\exists x\, (\text{real}(x) \to \text{rational}(x))$; the second is true as soon as the domain contains
one object that is not a real number (a matrix, a person). GATE 2012 offers both.
:::

:::definition{#and-or-subjects term="Two subjects joined by 'and' become ∨" depth="standard"}
"Tigers **and** lions attack" means "every tiger attacks, and every lion attacks":
$$\forall x\, (T(x) \to K(x)) \wedge \forall x\, (L(x) \to K(x)) \equiv \forall x\, ((T(x) \vee L(x)) \to K(x)).$$
The "and" of English joins two **promises**; inside one promise it becomes an "or" of hypotheses,
because the promise must hold for anything that is a tiger **or** a lion. Writing $T(x) \wedge L(x)$
would restrict the promise to creatures that are both a tiger and a lion, of which there are none.
:::

:::derivation{#deriv-and-or of="(A → C) ∧ (B → C) ≡ (A ∨ B) → C" depth="standard"}
$(A \to C) \wedge (B \to C) \equiv (\neg A \vee C) \wedge (\neg B \vee C) \equiv (\neg A \wedge \neg B) \vee C$
(distributivity) $\equiv \neg(A \vee B) \vee C \equiv (A \vee B) \to C$. Inside $\forall x$ this holds for
each $x$, and $\forall$ distributes over $\wedge$ ([Lesson 2](lesson:quantifier-laws-validity)), which
gives the displayed equivalence. **Sanity check:** a tiger that does not attack falsifies both sides.
:::

:::trick{#trick-translate title="A three-question checklist for any translation option" depth="standard"}
1. **Main quantifier and its partner.** Does a $\forall$ over a restricted noun ("every teacher") meet
   $\to$, and an $\exists$ over a restricted noun ("some student") meet $\wedge$?
2. **Order.** Read the quantifiers left to right: does each later choice depend on the earlier ones,
   as the English says ("every teacher is liked by **some** student" lets the student depend on the
   teacher)?
3. **Negation.** "No", "none", "not all", "only": does the option say the same after pushing $\neg$
   all the way in?

It works because these three are where the four options of a translation question differ. It fails
only on sentences with counting ("exactly one", "at least two"), which need equality, below.
:::

:::table{#phrasebook title="Phrasebook: English to formula" depth="standard"}
| English | Formula |
|:--|:--|
| every / each / any / all $A$ … | $\forall x\, (A(x) \to \dots)$ |
| some / a / at least one / there is an $A$ … | $\exists x\, (A(x) \wedge \dots)$ |
| no $A$ … / none of the $A$ … | $\forall x\, (A(x) \to \neg\dots)$ $\equiv$ $\neg\exists x\, (A(x) \wedge \dots)$ |
| not every $A$ … / not all $A$ … | $\exists x\, (A(x) \wedge \neg\dots)$ |
| only $A$ … / none but $A$ … | $\forall x\, (\dots \to A(x))$ |
| $A$ and $B$ … (two kinds of subject) | $\forall x\, ((A(x) \vee B(x)) \to \dots)$ |
| an $A$ that is also a $B$ | $A(x) \wedge B(x)$ |
| $A$ … if they are $C$ | $\forall x\, (A(x) \to (C(x) \to \dots))$ $\equiv$ $\forall x\, ((A(x) \wedge C(x)) \to \dots)$ |
:::

## Worked examples: translation

::::example{#ex-tr-easy level="easy" title="All and some" depth="quick"}
Domain: all people. $S(x)$: $x$ is a student, $C(x)$: $x$ owns a cycle. Translate (a) "every student
owns a cycle", (b) "some student owns a cycle".

:::step{why="'Every student' restricts a universal: the restriction becomes the hypothesis of →."}
(a) $\forall x\, (S(x) \to C(x))$.
:::

:::step{why="'Some student' restricts an existential: the restriction is joined with ∧."}
(b) $\exists x\, (S(x) \wedge C(x))$.
:::

:::step{why="Sanity check each on a world with one teacher and no student cyclist."}
In that world (a) is vacuously true if there are no students, and (b) is false; the teacher never
disturbs either formula, as the English intends.
:::

:::answer
(a) $\forall x\, (S(x) \to C(x))$; (b) $\exists x\, (S(x) \wedge C(x))$.
:::
::::

::::example{#ex-tr-none level="medium" title="'None of my friends are perfect'" depth="standard"}
$F(x)$: $x$ is my friend, $P(x)$: $x$ is perfect. Translate "None of my friends are perfect" in two
equivalent ways.

:::step{why="'None' says there is no sighting of the forbidden combination."}
There is no $x$ that is my friend and perfect: $\neg\exists x\, (F(x) \wedge P(x))$.
:::

:::step{why="Push the negation in: ¬∃ becomes ∀¬, then ¬(F ∧ P) is F → ¬P."}
$\forall x\, \neg(F(x) \wedge P(x)) \equiv \forall x\, (F(x) \to \neg P(x))$: every friend is not perfect.
:::

:::step{why="Rule out the tempting wrong form."}
$\exists x\, (F(x) \wedge \neg P(x))$ says "some friend is not perfect", which is consistent with
another friend being perfect. It is the translation of "not all my friends are perfect".
:::

:::answer
$\neg\exists x\, (F(x) \wedge P(x)) \equiv \forall x\, (F(x) \to \neg P(x))$. (This is GATE 2013.)
:::
::::

::::example{#ex-tr-gate level="gate" title="Two subjects and a condition" depth="standard"}
Translate "Tigers and lions attack if they are hungry or threatened", with $T, L, H, R, K$ for tiger,
lion, hungry, threatened, attacks.

:::step{why="Two kinds of subject: the promise covers anything that is a tiger or a lion."}
Hypothesis on the subject: $T(x) \vee L(x)$.
:::

:::step{why="'attack if hungry or threatened' is an implication with the if-clause as hypothesis."}
$(H(x) \vee R(x)) \to K(x)$.
:::

:::step{why="Nest the condition inside the promise; universal over everything."}
$\forall x\, [(T(x) \vee L(x)) \to ((H(x) \vee R(x)) \to K(x))]$.
:::

:::answer
$\forall x\, [(T(x) \vee L(x)) \to ((H(x) \vee R(x)) \to K(x))]$. Writing $T \wedge L$ (no creature is
both) or replacing the inner $\to$ by $\wedge$ (which would claim every tiger is hungry) are the two
distractors of GATE 2006.
:::
::::

::::example{#ex-tr-ornaments level="gate" title="'Gold and silver ornaments are precious'" depth="standard"}
$G(x)$: gold ornament, $S(x)$: silver ornament, $P(x)$: precious. Which is right:
$\forall x\, ((G \wedge S) \to P)$ or $\forall x\, ((G \vee S) \to P)$?

:::step{why="Ask what the English promises about a single gold ornament that is not silver."}
The sentence says it is precious. Under $(G \wedge S) \to P$ the hypothesis is false for it, so the
formula says nothing: a non-precious pure-gold ornament would not falsify it.
:::

:::step{why="Check the ∨ form on the same object."}
$(G \vee S) \to P$: the hypothesis is true, so $P$ is required. The gold ornament is covered.
:::

:::answer
$\forall x\, ((G(x) \vee S(x)) \to P(x))$, the "two subjects become ∨" rule. (GATE 2009.)
:::
::::

::::example{#ex-tr-only level="medium" title="'Only' reverses the arrow" depth="standard"}
Translate "Only members may vote" with $M(x)$: member, $V(x)$: may vote.

:::step{why="'Only members' restricts who can be a voter: a voter must be a member."}
If $x$ may vote then $x$ is a member: $V(x) \to M(x)$.
:::

:::step{why="Universal over everyone."}
$\forall x\, (V(x) \to M(x))$.
:::

:::step{why="Compare with 'all members may vote', which is a different claim."}
"All members may vote" is $\forall x\, (M(x) \to V(x))$. "Only members may vote" allows a member who
may not vote (a suspended member) but forbids a non-member voter.
:::

:::answer
$\forall x\, (V(x) \to M(x))$, equivalently $\neg\exists x\, (V(x) \wedge \neg M(x))$.
:::
::::

**Recap.** "All $A$ are $B$" is $\forall x(A \to B)$; "some $A$ are $B$" is $\exists x(A \wedge B)$.
"No", "not all" and "only" are those two with a negation or the arrow reversed. Two kinds of subject
joined by "and" become $\vee$ in the hypothesis.

## Nested quantifiers and their order

:::intuition{#order-intuition title="A game between two players" depth="standard"}
Read a string of quantifiers as a game. A **∀** is a move by an opponent who wants the formula to be
false: they pick the element. A **∃** is your move: you pick the element, and you may look at every
choice made before you. You win if the final statement is true.

$\forall x\, \exists y\, \text{Loves}(x, y)$: the opponent names a person $x$, then you name someone $y$
whom $x$ loves. You may choose a different $y$ for each $x$. $\exists y\, \forall x\, \text{Loves}(x, y)$:
you must name one $y$ **first**, and then the opponent tries every $x$ against it. Moving later is an
advantage, so $\exists y\, \forall x$ is the harder claim: one $y$ loved by everyone.
:::

:::definition{#nested-def term="Nested quantifiers" depth="quick"}
A formula like $\forall x\, \exists y\, \varphi(x, y)$ is read from the outside in: for every $x$, the
formula $\exists y\, \varphi(x, y)$ is true. The inner choice may **depend** on the outer variable.
Adjacent quantifiers of the **same kind** commute:
$$\forall x\, \forall y\, \varphi \equiv \forall y\, \forall x\, \varphi, \qquad \exists x\, \exists y\, \varphi \equiv \exists y\, \exists x\, \varphi.$$
Quantifiers of **different kinds** do not, in general, commute.
:::

:::viz{#grid-viz spec="forall-exists-grid" mode="animate" depth="standard"}
:::

:::theorem{#ea-implies-ae name="∃∀ implies ∀∃, not conversely" depth="standard"}
For every formula $\varphi(x, y)$ and every domain,
$$\exists y\, \forall x\, \varphi(x, y) \;\Rightarrow\; \forall x\, \exists y\, \varphi(x, y),$$
and there are domains where the left side is false and the right side true.
:::

:::proof{#proof-ea-ae of="∃∀ ⇒ ∀∃" depth="standard"}
**Idea first:** one $y$ that works for all $x$ is, in particular, a choice of $y$ for each $x$.

Suppose $\exists y\, \forall x\, \varphi(x, y)$; let $y_0$ be the witness, so $\varphi(x, y_0)$ holds for
every $x$. Take any $x$. Then $y = y_0$ is a witness for $\exists y\, \varphi(x, y)$. Since $x$ was
arbitrary, $\forall x\, \exists y\, \varphi(x, y)$. For the failure of the converse, use $\mathbb{N}$ and
$\varphi(x, y) = (y > x)$: every $x$ has a larger $y$, but no $y$ is larger than every $x$.
:::

:::table{#grid-reading title="Reading the four orders on a grid" depth="standard"}
Draw $R(x, y)$ as a grid, rows $x$, columns $y$.

| Formula | Grid picture |
|:--|:--|
| $\forall x\, \forall y\, R$ | every cell is T |
| $\exists x\, \exists y\, R$ | some cell is T |
| $\forall x\, \exists y\, R$ | every **row** has a T |
| $\exists x\, \forall y\, R$ | some **row** is all T |
| $\forall y\, \exists x\, R$ | every **column** has a T |
| $\exists y\, \forall x\, R$ | some **column** is all T |
:::

:::trap{#trap-order title="'Every teacher is liked by some student' is not '∃ a student who likes every teacher'" depth="quick"}
The English lets the student depend on the teacher: $\forall x\, (T(x) \to \exists y\, (S(y) \wedge
L(y, x)))$. Pulling $\exists y$ to the front gives $\exists y\, \forall x\, (\dots)$: one student who
likes every teacher. That is a stronger claim. GATE 2005 offers it as option C.
:::

:::trap{#trap-inner-restrict title="The inner quantifier needs its own → or ∧" depth="quick"}
In "some boy is taller than **all** the girls", the inner "all the girls" is a universal over a
restricted noun, so it takes $\to$: $\forall y\, (G(y) \to \text{taller}(x, y))$. Writing
$\forall y\, (G(y) \wedge \text{taller}(x, y))$ claims that everyone in the class is a girl. Apply the
pairing rule at **every** level, not only the outermost one.
:::

## Worked examples: nested quantifiers

::::example{#ex-nest-easy level="easy" title="Reading a nested formula aloud" depth="quick"}
Domain: people. $L(x, y)$: $x$ loves $y$. Say in English: (a) $\forall x\, \exists y\, L(x, y)$,
(b) $\exists y\, \forall x\, L(x, y)$, (c) $\forall y\, \exists x\, L(x, y)$.

:::step{why="Outer ∀x, inner ∃y: the loved one may depend on the lover."}
(a) Everybody loves somebody.
:::

:::step{why="Outer ∃y, then ∀x: one fixed y works for every x."}
(b) There is someone whom everybody loves.
:::

:::step{why="Now y is the outer universal and x the inner witness: the lover depends on the loved."}
(c) Everybody is loved by somebody.
:::

:::answer
(a) everybody loves somebody; (b) somebody is loved by everybody; (c) everybody is loved by somebody.
(b) implies (a): everybody loves at least that one person. It does not imply (c): the loved person's
fans need not be loved by anyone.
:::
::::

::::example{#ex-nest-teacher level="gate" title="'Every teacher is liked by some student'" depth="standard"}
$T(x)$: teacher, $S(y)$: student, $L(y, x)$: $y$ likes $x$. Build the formula.

:::step{why="Outer phrase 'every teacher': a universal over a restricted noun, so →."}
$\forall x\, (T(x) \to \dots)$ where the gap says "$x$ is liked by some student".
:::

:::step{why="Inner phrase 'some student likes x': an existential over a restricted noun, so ∧."}
$\exists y\, (S(y) \wedge L(y, x))$.
:::

:::step{why="Check the two classic distractors."}
$\exists y\, (S(y) \to L(y, x))$ is satisfied by any non-student $y$; $\exists y\, \forall x$ puts one
student first.
:::

:::answer
$\forall x\, [T(x) \to \exists y\, (S(y) \wedge L(y, x))]$. (GATE 2005, option B.)
:::
::::

::::example{#ex-nest-taller level="gate" title="'Some boys are taller than all the girls'" depth="standard"}
$B(x)$: boy, $G(y)$: girl, $\text{taller}(x, y)$. Build the formula and say why the other pairings fail.

:::step{why="Outer 'some boy': ∃ with ∧."}
$\exists x\, (B(x) \wedge \dots)$ where the gap says "$x$ is taller than every girl".
:::

:::step{why="Inner 'all the girls': ∀ with →."}
$\forall y\, (G(y) \to \text{taller}(x, y))$.
:::

:::step{why="Reject the wrong pairings by small worlds."}
$\exists x\, (B(x) \to \dots)$ is true in any class containing a girl (she makes the hypothesis false).
$\forall y\, (G(y) \wedge \dots)$ fails whenever the class contains a boy, since a boy is not a girl.
:::

:::answer
$\exists x\, (B(x) \wedge \forall y\, (G(y) \to \text{taller}(x, y)))$. (GATE 2004, option D.)
:::
::::

::::example{#ex-nest-fsa level="gate" title="'Each FSA has an equivalent PDA'" depth="standard"}
$\text{fsa}(x)$, $\text{pda}(y)$, $\text{eq}(x, y)$. Write the sentence, and explain why
$\forall x\, \exists y\, (\text{fsa}(x) \wedge \text{pda}(y) \wedge \text{eq}(x, y))$ is wrong.

:::step{why="'Each FSA' is a universal over a restricted noun: →."}
$\forall x\, (\text{fsa}(x) \to \dots)$.
:::

:::step{why="'has an equivalent PDA' is an existential over a restricted noun: ∧."}
$\exists y\, (\text{pda}(y) \wedge \text{eq}(x, y))$.
:::

:::step{why="Test the ∧ version on a domain that contains a PDA that is not an FSA."}
For $x$ = that PDA, $\text{fsa}(x)$ is false, so $\exists y\, (\text{fsa}(x) \wedge \dots)$ is false and
the $\forall x$ fails. The ∧ version claims that **everything** is an FSA.
:::

:::answer
$\forall x\, (\text{fsa}(x) \to \exists y\, (\text{pda}(y) \wedge \text{eq}(x, y)))$. GATE 2008 prints
it as $(\forall x\, \text{fsa}(x)) \Rightarrow (\exists y\, \text{pda}(y) \wedge \text{equivalent}(x, y))$
(option A, the official key) with the bracket closing too early; read the $\forall x$ as covering the
whole implication, as intended. The other options are wrong for the reasons above.
:::
::::

:::viz{#translate-viz spec="translate-steps" mode="animate" depth="standard"}
:::

::::example{#ex-nest-known level="gate" title="'Known by everyone else, knows no one else'" depth="standard"}
For different persons, $M(x, y)$: $x$ knows $y$. Translate "There is a person who does not know anyone
else, but that person is known by everyone else."

:::step{why="'There is a person': one fixed y chosen first."}
$\exists y\, (\dots)$.
:::

:::step{why="Both halves are about every other person x: 'x knows y' and 'y does not know x'."}
For every $x \ne y$: $M(x, y) \wedge \neg M(y, x)$.
:::

:::step{why="'every other person' is a universal restricted by x ≠ y: so →."}
$\exists y\, \forall x\, ((x \ne y) \to (M(x, y) \wedge \neg M(y, x)))$.
:::

:::answer
$(\exists y)(\forall x)\, ((x \ne y) \to (M(x, y) \wedge \neg M(y, x)))$, GATE 2026 option A. Swapping to
$\forall y \exists x$ would describe every person, and $\exists y \exists x$ needs only one other person.
:::
::::

::::example{#ex-nest-implies level="gate" title="Which statements imply ∀x(P(x) → ∃y Q(x, y))?" depth="standard"}
Decide which of (A) $\exists x\, (P(x) \wedge \forall y\, Q(x, y))$, (B) $\forall x\, \forall y\, Q(x, y)$,
(C) $\exists y\, \forall x\, (P(x) \to Q(x, y))$, (D) $\exists x\, (P(x) \wedge \exists y\, Q(x, y))$ imply
the conjecture.

:::step{why="(B) is the strongest possible claim about Q: it hands every x any y."}
If $Q(x, y)$ holds for all pairs, then for each $x$ (with $P(x)$ or not) any $y$ is a witness. (B)
implies the conjecture.
:::

:::step{why="(C) is ∃∀, which implies the ∀∃ form by the theorem above."}
Let $y_0$ be the witness of (C). For any $x$ with $P(x)$, $Q(x, y_0)$ holds, so $\exists y\, Q(x, y)$.
(C) implies the conjecture.
:::

:::step{why="(A) and (D) are existential: they talk about one x and say nothing about the others."}
Counter-world: domain $\{0, 1\}$, $P$ true on both, $Q(0, y)$ true for all $y$, $Q(1, y)$ false for all
$y$. (A) and (D) hold (witness $x = 0$); the conjecture fails at $x = 1$.
:::

:::answer
**B and C.** (GATE 2023, multiple select.)
:::
::::

**Recap.** Quantifiers are read outside in; an inner $\exists$ may depend on the outer $\forall$.
$\exists\forall$ implies $\forall\exists$ but not conversely. Apply the $\to$/$\wedge$ pairing at every
level of nesting.

## Negation: De Morgan for quantifiers

:::intuition{#neg-intuition title="To deny 'everyone', find one exception" depth="standard"}
How do you prove "every swan is white" false? You do not need every swan to be black; you need **one**
non-white swan. So "not (every swan is white)" means "**some** swan is not white". And to deny "some
swan is black", you must check them all: "not (some swan is black)" means "**every** swan is not
black". Denying flips the quantifier and passes the "not" inward, just as De Morgan flips $\wedge$ and
$\vee$, which is no accident: $\forall$ is a big $\wedge$ and $\exists$ is a big $\vee$.
:::

:::theorem{#qdm-theorem name="De Morgan's laws for quantifiers" depth="standard"}
For every formula $\varphi(x)$ and every domain:
$$\neg\forall x\, \varphi(x) \equiv \exists x\, \neg\varphi(x), \qquad \neg\exists x\, \varphi(x) \equiv \forall x\, \neg\varphi(x).$$
:::

:::proof{#proof-qdm of="De Morgan for quantifiers" depth="standard"}
**Idea first:** a universal fails exactly when there is a counterexample.

$\neg\forall x\, \varphi(x)$ is true iff $\forall x\, \varphi(x)$ is false iff some $d$ has $\varphi(d)$
false iff some $d$ has $\neg\varphi(d)$ true iff $\exists x\, \neg\varphi(x)$ is true. The second law
follows by applying the first to $\neg\varphi$ and negating both sides:
$\neg\forall x\, \neg\varphi \equiv \exists x\, \varphi$, so $\forall x\, \neg\varphi \equiv \neg\exists x\, \varphi$.
On a finite domain this is literally De Morgan's law for the long $\wedge$ and $\vee$.
:::

:::derivation{#deriv-push of="pushing ¬ through a nested formula" depth="standard"}
To negate a formula with several quantifiers, push $\neg$ inward **one symbol at a time**:

1. $\neg\forall \Rightarrow \exists\neg$ and $\neg\exists \Rightarrow \forall\neg$ (each quantifier flips; the
   variables and the order stay);
2. when $\neg$ reaches the matrix (the quantifier-free part), use Chapter 1:
   $\neg(A \to B) \equiv A \wedge \neg B$, $\neg(A \wedge B) \equiv \neg A \vee \neg B$,
   $\neg(A \vee B) \equiv \neg A \wedge \neg B$, $\neg\neg A \equiv A$.

Example: $\neg\forall x\, \exists y\, (P(x) \to Q(x, y))$ $\equiv \exists x\, \neg\exists y\, (P(x) \to Q(x, y))$
$\equiv \exists x\, \forall y\, \neg(P(x) \to Q(x, y))$ $\equiv \exists x\, \forall y\, (P(x) \wedge \neg Q(x, y))$.
**Sanity check:** the order of the variables $x, y$ never changes; only the kinds flip.
:::

:::viz{#neg-viz spec="negation-ladder" mode="animate" depth="standard"}
:::

:::trap{#trap-half-push title="Flipping the quantifier but not the inside (or the reverse)" depth="quick"}
$\neg\forall x\, (G(x) \to C(x))$ is $\exists x\, (G(x) \wedge \neg C(x))$, "some graph is not connected".
It is **not** $\forall x\, (G(x) \to \neg C(x))$, "no graph is connected": that keeps the $\forall$ and
negates only the conclusion. GATE 2007 asks which option does **not** say "not every graph is
connected"; this half-push is the answer.
:::

:::trap{#trap-neg-imp title="¬(A → B) is A ∧ ¬B, never A → ¬B" depth="quick"}
A promise is broken only when the hypothesis holds and the conclusion fails. So the negation of an
implication is a conjunction. Options that keep an arrow after negating ($\exists x\, (\alpha \to \dots)$)
are wrong in every negation question; GATE IT 2008 has three of them.
:::

:::trick{#trick-neg-check title="Check a negation by counting symbols" depth="standard"}
After negating: every quantifier has flipped kind, the variable order is unchanged, every $\to$ in the
spine has become $\wedge$ with its right side negated, and the innermost atom carries exactly one
$\neg$ more than before. If any of the four fails, the option is wrong. It works because each rule in
the derivation changes exactly one of these features. It fails only when an option has also been
simplified with other laws, so fall back to the derivation then.
:::

## Worked examples: negation

::::example{#ex-neg-easy level="easy" title="Which pairs are equivalent?" depth="quick"}
Compare I: $\neg\forall x\, P(x)$, II: $\neg\exists x\, P(x)$, III: $\neg\exists x\, \neg P(x)$, IV:
$\exists x\, \neg P(x)$.

:::step{why="Push the negation through each one."}
I $\equiv \exists x\, \neg P(x)$; II $\equiv \forall x\, \neg P(x)$; III $\equiv \forall x\, P(x)$; IV is already
$\exists x\, \neg P(x)$.
:::

:::step{why="Match the normal forms."}
Only I and IV coincide. II says "nothing is $P$", III says "everything is $P$".
:::

:::answer
**I and IV.** (GATE 2009.)
:::
::::

::::example{#ex-neg-glitters level="medium" title="'Not all that glitters is gold'" depth="standard"}
Translate with $\text{glitters}(x)$ and $\text{gold}(x)$.

:::step{why="'All that glitters is gold' is a universal over glittering things."}
$\forall x\, (\text{glitters}(x) \to \text{gold}(x))$.
:::

:::step{why="'Not all' negates it; push the negation in."}
$\neg\forall x\, (\text{glitters} \to \text{gold}) \equiv \exists x\, \neg(\text{glitters} \to \text{gold}) \equiv
\exists x\, (\text{glitters}(x) \wedge \neg\text{gold}(x))$.
:::

:::step{why="Reject the strong reading."}
$\forall x\, (\text{glitters}(x) \to \neg\text{gold}(x))$ says nothing glittering is gold, which the
proverb does not claim.
:::

:::answer
$\exists x\, (\text{glitters}(x) \wedge \neg\text{gold}(x))$: something glitters and is not gold. (GATE
2014 paper 1; "not all rainy days are cold" in paper 3 is the same pattern.)
:::
::::

::::example{#ex-neg-gate level="gate" title="Negating a long nested formula" depth="standard"}
Negate $\forall x\, [\alpha \to (\exists y\, [\beta \to (\forall u\, \exists v\, \gamma)])]$, where $\alpha$,
$\beta$, $\gamma$ are formulas.

:::step{why="The outer quantifier flips; ¬ moves inside it."}
$\exists x\, \neg[\alpha \to (\exists y\, [\dots])]$.
:::

:::step{why="¬(A → B) is A ∧ ¬B."}
$\exists x\, [\alpha \wedge \neg\exists y\, [\beta \to (\forall u\, \exists v\, \gamma)]]$.
:::

:::step{why="Repeat for ∃y and the next implication."}
$\exists x\, [\alpha \wedge \forall y\, [\beta \wedge \neg\forall u\, \exists v\, \gamma]]$.
:::

:::step{why="Flip the last two quantifiers and negate γ."}
$\exists x\, [\alpha \wedge \forall y\, [\beta \wedge \exists u\, \forall v\, \neg\gamma]]$.
:::

:::answer
$\exists x\, [\alpha \wedge (\forall y\, [\beta \wedge (\exists u\, \forall v\, \neg\gamma)])]$. (GATE IT 2008,
option D.) The symbol-count trick confirms it: four quantifiers flipped, two arrows became $\wedge$, one
new $\neg$ on $\gamma$.
:::
::::

::::example{#ex-neg-fool level="gate" title="'∀x ∃y ∃t ¬F(x, y, t)' in English" depth="standard"}
$F(x, y, t)$: person $x$ can fool person $y$ at time $t$. Say $\forall x\, \exists y\, \exists t\, \neg F(x, y, t)$
in English.

:::step{why="Pull the negation back out of the ∃∃ to see what is being denied."}
$\exists y\, \exists t\, \neg F \equiv \neg\forall y\, \forall t\, F$: "$x$ cannot fool everyone all the time".
:::

:::step{why="Put the outer ∀x back."}
For every $x$: $x$ cannot fool everyone all the time.
:::

:::answer
"No one can fool everyone all the time." (GATE 2010, option B.) The tempting "everyone can fool some
person at some time" drops the $\neg$.
:::
::::

::::example{#ex-neg-equiv level="gate" title="An equivalent form with ¬ outside" depth="standard"}
Which is equivalent to $\exists x\, \forall y\, [(a \wedge b) \wedge \neg c]$: $\neg[\forall x\, \exists y\,
((a \wedge b) \to c)]$ or $\neg[\forall x\, \exists y\, ((a \vee b) \to c)]$? (Here $a, b, c$ are $a(x, y)$ etc.)

:::step{why="Negate the first candidate inward."}
$\neg\forall x\, \exists y\, ((a \wedge b) \to c) \equiv \exists x\, \forall y\, \neg((a \wedge b) \to c)
\equiv \exists x\, \forall y\, ((a \wedge b) \wedge \neg c)$. That is the target.
:::

:::step{why="Negate the second the same way and compare."}
It gives $\exists x\, \forall y\, ((a \vee b) \wedge \neg c)$, which is weaker: it is true when only $a$
holds.
:::

:::answer
$\neg[\forall x\, \exists y\, ((a \wedge b) \to c)]$. (GATE IT 2004, option C.)
:::
::::

::::check{#check-neg title="Quick check: negation" depth="quick"}
Negate "every student passed some exam": $\forall s\, (S(s) \to \exists e\, (E(e) \wedge P(s, e)))$.

:::answer
$\exists s\, (S(s) \wedge \forall e\, (E(e) \to \neg P(s, e)))$: some student passed no exam.
:::
::::

**Recap.** $\neg\forall = \exists\neg$ and $\neg\exists = \forall\neg$. Push $\neg$ in one symbol at a time;
the variable order never changes. The negation of an implication is a conjunction.

## Uniqueness and counting with equality

:::intuition{#unique-intuition title="'Exactly one' is 'at least one' plus 'no second one'" depth="standard"}
Plain quantifiers cannot count: $\exists x\, M(x)$ says "at least one". To say "exactly one", add a
guard: there is one, **and** anything else that qualifies is that same one. Equality is the tool that
lets a formula tell two elements apart, so every counting sentence ("exactly one", "at most one",
"at least two") uses $=$ or $\ne$.
:::

:::definition{#unique-def term="Unique existence ∃!" depth="quick"}
$\exists!x\, \varphi(x)$ ("there is exactly one $x$ with $\varphi$") abbreviates either of the
equivalent formulas
$$\exists x\, \big(\varphi(x) \wedge \forall z\, (\varphi(z) \to z = x)\big) \qquad \exists x\, \varphi(x) \wedge \forall x\, \forall z\, \big((\varphi(x) \wedge \varphi(z)) \to x = z\big).$$
The first reads "some $x$ qualifies, and every qualifier equals it"; the second "at least one, and at
most one". The guard can be written contrapositively: $\forall z\, (z \ne x \to \neg\varphi(z))$, or
$\neg\exists z\, (z \ne x \wedge \varphi(z))$.
:::

:::viz{#unique-viz spec="exists-unique" mode="animate" depth="standard"}
:::

:::table{#counting-table title="Counting with quantifiers and equality" depth="standard"}
| English | Formula |
|:--|:--|
| at least one | $\exists x\, \varphi(x)$ |
| at most one | $\forall x\, \forall y\, ((\varphi(x) \wedge \varphi(y)) \to x = y)$ |
| exactly one | at least one $\wedge$ at most one, or $\exists x\, (\varphi(x) \wedge \forall y\, (\varphi(y) \to y = x))$ |
| at least two | $\exists x\, \exists y\, (x \ne y \wedge \varphi(x) \wedge \varphi(y))$ |
| exactly two | $\exists x\, \exists y\, (x \ne y \wedge \varphi(x) \wedge \varphi(y) \wedge \forall z\, (\varphi(z) \to (z = x \vee z = y)))$ |
:::

:::trap{#trap-unique-missing title="Forgetting the 'at most' half, or the 'at least' half" depth="quick"}
$\forall x\, \forall y\, ((M(x) \wedge M(y)) \to x = y)$ alone is true when **no** element qualifies;
$\exists x\, M(x)$ alone allows two. "Exactly one" needs both halves. And
$\exists y\, \exists z\, (M(y) \wedge \neg M(z))$ is not a uniqueness condition at all: it only says that
something qualifies and something does not.
:::

## Worked examples: uniqueness

::::example{#ex-uniq-easy level="easy" title="Exactly one even prime" depth="quick"}
Domain $\mathbb{N}$, $E(x)$: $x$ even, $P(x)$: $x$ prime. Write and check "there is exactly one even
prime".

:::step{why="Use the 'qualifies, and every qualifier equals it' form."}
$\exists x\, (E(x) \wedge P(x) \wedge \forall z\, ((E(z) \wedge P(z)) \to z = x))$.
:::

:::step{why="Find the witness and check the guard."}
$x = 2$ qualifies. Any even $z > 2$ has the divisor 2, so it is not prime; the guard holds.
:::

:::answer
True, witness 2. The guard is what rules out a second even prime.
:::
::::

::::example{#ex-uniq-mother level="gate" title="'Everyone has exactly one mother'" depth="standard"}
$\text{mother}(y, x)$: $y$ is the mother of $x$; $\text{noteq}(z, y)$: $z \ne y$. Which of these say it?
(B) $\forall x\, \exists y\, [\text{mother}(y, x) \wedge \forall z\, (\text{noteq}(z, y) \to \neg\text{mother}(z, x))]$;
(C) $\forall x\, \forall y\, [\text{mother}(y, x) \to \exists z\, (\text{mother}(z, x) \wedge \neg\text{noteq}(z, y))]$;
(D) $\forall x\, \exists y\, [\text{mother}(y, x) \wedge \neg\exists z\, (\text{noteq}(z, y) \wedge \text{mother}(z, x))]$.

:::step{why="(B) is the ∃! pattern with the guard written contrapositively."}
"Some $y$ is $x$'s mother, and every $z$ other than $y$ is not": exactly one.
:::

:::step{why="(D) is (B) with the guard written as ¬∃."}
$\neg\exists z\, (z \ne y \wedge \text{mother}(z, x)) \equiv \forall z\, (z \ne y \to \neg\text{mother}(z, x))$. Same as (B).
:::

:::step{why="(C) only says: if y is a mother of x, then some z equal to y is a mother of x, which is trivially true."}
(C) is true in a world where nobody has a mother. It is not a uniqueness claim.
:::

:::answer
**B and D.** (GATE 2025, multiple select. The fourth option, $\exists y \exists z (\text{mother}(y, x) \wedge \neg\text{mother}(z, x))$, only says that someone is and someone is not $x$'s mother.)
:::
::::

::::example{#ex-uniq-atmost level="medium" title="At most one" depth="standard"}
Write "at most one student topped the class" with $T(x)$: $x$ topped.

:::step{why="'At most one' forbids two different toppers."}
There are no $x \ne y$ that both topped: $\neg\exists x\, \exists y\, (x \ne y \wedge T(x) \wedge T(y))$.
:::

:::step{why="Push the negation in to get the standard form."}
$\forall x\, \forall y\, ((T(x) \wedge T(y)) \to x = y)$.
:::

:::answer
$\forall x\, \forall y\, ((T(x) \wedge T(y)) \to x = y)$. It is **true** if nobody topped; add
$\exists x\, T(x)$ for "exactly one".
:::
::::

::::example{#ex-uniq-two level="gate" title="Exactly two, checked on worlds" depth="standard"}
Is $\exists x\, \exists y\, (x \ne y \wedge Q(x) \wedge Q(y))$ "exactly two" or "at least two"?
Test on $D = \{1, 2, 3\}$ with $Q$ true on all three.

:::step{why="Find witnesses."}
$x = 1$, $y = 2$ work, so the formula is true.
:::

:::step{why="Compare with the English."}
Three elements satisfy $Q$, so "exactly two" is false in this world. The formula said true.
:::

:::answer
It means **at least two**. "Exactly two" needs the third conjunct $\forall z\, (Q(z) \to (z = x \vee z = y))$.
:::
::::

## Number theory in logic

:::intuition{#prime-intuition title="Write the textbook definition, word for word" depth="standard"}
"$x$ is prime" means: $x \ne 1$, and whenever $x$ splits as $y \cdot z$, the factor $y$ is $1$ or $x$.
Every number-theory formula in GATE is one such definition, written with $\forall$ for "whenever" and
$\exists$ for "splits as". To judge an option, read it back into the definition and test it on 1, a
prime and a composite.
:::

:::definition{#prime-def term="Prime and divides in logic" depth="quick"}
Over the positive integers, with $y \mid x$ abbreviating $\exists z\, (x = y \cdot z)$:
$$\text{Prime}(x) \equiv x \ne 1 \wedge \forall y\, (y \mid x \to (y = 1 \vee y = x)).$$
"There are infinitely many primes" is $\forall x\, (\exists w\, (w > x \wedge \text{Prime}(w)))$: above
every number there is a prime. Over **all** integers, divisors can be negative ($-1 \mid x$ always), so a
definition written for positive integers can change its meaning; see the 2019 example.
:::

::::example{#ex-num-prime level="medium" title="Reading GATE 2011's predicate" depth="standard"}
Over positive integers, $P(x) = \neg(x = 1) \wedge \forall y\, (\exists z\, (x = y \cdot z) \Rightarrow (y = x) \vee (y = 1))$.
What does $P(x)$ say?

:::step{why="∃z (x = y·z) is 'y divides x'."}
$P(x)$: $x \ne 1$, and every divisor $y$ of $x$ is $x$ or $1$.
:::

:::step{why="Test on 1, a prime and a composite."}
$x = 1$: F (first conjunct). $x = 7$: divisors 1, 7: T. $x = 6$: divisor 2 is neither: F.
:::

:::answer
$P(x)$ is true exactly when $x$ is prime. (GATE 2011, option A.)
:::
::::

::::example{#ex-num-infinite level="gate" title="'Above every prime there is a prime': which domains?" depth="standard"}
$\varphi = \forall x\, [\text{Prime}'(x) \Rightarrow \exists w\, (w > x \wedge \text{Prime}'(w))]$, where
$\text{Prime}'(n)$ is $\forall z\, (z \mid n \Rightarrow (z = n \vee z = 1))$ with $z$ ranging over the domain.
Is $\varphi$ true on S1 = $\{1, \dots, 100\}$ and on S2 = the positive integers?

:::step{why="On a finite domain the largest prime has nowhere to go."}
On S1, $x = 97$ satisfies $\text{Prime}'$ (its divisors in S1 are 1 and 97), but no prime lies in
$\{98, 99, 100\}$. $\varphi$ is **false** on S1.
:::

:::step{why="On S2 this is Euclid's theorem."}
For any $x$, a prime factor of $x! + 1$ exceeds $x$. So every $x$ has a larger prime: **true** on S2.
:::

:::answer
False on S1, true on S2. (GATE 2019; for the third set, all integers, see the GATE question below and
the note there.)
:::
::::

::::check{#check-num title="Quick check: number theory" depth="quick"}
Write "$x$ is a perfect square" over the positive integers.

:::answer
$\exists y\, (x = y \cdot y)$.
And "$x$ is composite": $\exists y\, \exists z\, (y \ne 1 \wedge z \ne 1 \wedge x = y \cdot z)$.
:::
::::

**Recap.** Counting needs equality: "exactly one" = "at least one" + "at most one". Number-theory
predicates are textbook definitions written with $\forall$ (for "every divisor") and $\exists$ (for
"splits as"); test each on 1, a prime and a composite.

## Writing mathematics with quantifiers

:::intuition{#math-intuition title="Every definition in this subject is a quantified sentence" depth="standard"}
Open any later chapter and you will find definitions such as "a relation is **transitive** if whenever
$a R b$ and $b R c$, also $a R c$", or "a function is **onto** if every element of the codomain is hit".
Each "whenever", "every" and "some" is a quantifier in disguise. Writing them out formally is not
pedantry: it tells you exactly what a counterexample looks like, because the negation of the formula
is the recipe for one.
:::

:::table{#math-table title="Definitions you will meet, written as formulas" depth="standard"}
| Property | Formula | Its negation (what a counterexample is) |
|:--|:--|:--|
| $R$ is reflexive on $A$ | $\forall a\, R(a, a)$ | $\exists a\, \neg R(a, a)$: one element not related to itself |
| $R$ is symmetric | $\forall a\, \forall b\, (R(a, b) \to R(b, a))$ | $\exists a\, \exists b\, (R(a, b) \wedge \neg R(b, a))$ |
| $R$ is transitive | $\forall a\, \forall b\, \forall c\, ((R(a, b) \wedge R(b, c)) \to R(a, c))$ | three elements with $aRb$, $bRc$ but not $aRc$ |
| $f$ is one-to-one | $\forall x\, \forall y\, (f(x) = f(y) \to x = y)$ | two different inputs with the same output |
| $f: A \to B$ is onto | $\forall b\, \exists a\, (f(a) = b)$ | some $b$ that no $a$ reaches |
| $S$ has a largest element | $\exists m\, \forall x\, (x \le m)$ | every element has something above it |
| $\lim_{n\to\infty} a_n = L$ | $\forall \varepsilon > 0\, \exists N\, \forall n > N\, (\lvert a_n - L\rvert < \varepsilon)$ | some $\varepsilon$ beaten infinitely often |
:::

:::trap{#trap-any title="'Any' can mean ∀ or ∃: decide by the sentence" depth="quick"}
"Any student can solve this" means **every** student ($\forall$). But "if any student can solve this,
Asha can" means "if **some** student can" ($\exists x\, S(x) \to S(\text{Asha})$), equivalently
$\forall x\, (S(x) \to S(\text{Asha}))$. Read "any" inside the hypothesis of an "if" as "some". Likewise
"a" is universal in a general statement ("a whale is a mammal": every whale) and existential in a
report ("a whale was seen": some whale).
:::

::::example{#ex-math-onto level="medium" title="Onto, and what a failure looks like" depth="standard"}
$f: \mathbb{Z} \to \mathbb{Z}$, $f(x) = 2x$. Write "f is onto" as a formula, negate it, and decide.

:::step{why="Onto: every target value is reached by some input; the input may depend on the target, so ∀b comes first."}
$\forall b\, \exists a\, (2a = b)$.
:::

:::step{why="Negate by flipping each quantifier and negating the equation."}
$\exists b\, \forall a\, (2a \ne b)$: some target is never reached.
:::

:::step{why="Find the counterexample the negation asks for."}
$b = 1$: $2a = 1$ has no integer solution. The negation is true.
:::

:::answer
$f$ is **not** onto; the witness of the negation, $b = 1$, is the counterexample.
:::
::::

::::example{#ex-math-transitive level="gate" title="Testing transitivity through its negation" depth="standard"}
On $\{1, 2, 3\}$, is $R = \{(1, 2), (2, 3), (1, 3), (2, 2)\}$ transitive?

:::step{why="The negation says: find a, b, c with aRb and bRc but not aRc. Search the pairs that chain."}
Chains $aRb$, $bRc$: $(1,2),(2,3)$; $(1,2),(2,2)$; $(2,2),(2,3)$; $(2,2),(2,2)$.
:::

:::step{why="Check the required pair (a, c) for each chain."}
$(1, 3)$ ✓, $(1, 2)$ ✓, $(2, 3)$ ✓, $(2, 2)$ ✓.
:::

:::answer
No chain breaks, so the negation has no witness: $R$ **is** transitive.
:::
::::

::::example{#ex-math-any level="gate" title="'If anyone can do it, Asha can'" depth="standard"}
$C(x)$: $x$ can do it; $a$: Asha. Translate, and show the two readings agree.

:::step{why="'any' inside the hypothesis of an if means 'some'."}
$\exists x\, C(x) \to C(a)$.
:::

:::step{why="Move the ∃ out of a hypothesis: it becomes ∀ (the hypothesis is negated inside ¬A ∨ B)."}
$\neg\exists x\, C(x) \vee C(a) \equiv \forall x\, \neg C(x) \vee C(a) \equiv \forall x\, (C(x) \to C(a))$.
:::

:::answer
$\exists x\, C(x) \to C(a) \equiv \forall x\, (C(x) \to C(a))$: "whoever can do it, Asha can too". Reading
"anyone" as $\forall$ in the hypothesis ($\forall x\, C(x) \to C(a)$) gives a much weaker, nearly empty claim.
:::
::::

::::example{#ex-math-limit level="gate" title="Negating the definition of a limit" depth="standard"}
Negate $\forall \varepsilon > 0\, \exists N\, \forall n > N\, (\lvert a_n - L\rvert < \varepsilon)$.

:::step{why="Restricted quantifiers flip like ordinary ones: ∀ε>0 becomes ∃ε>0, keeping the restriction."}
$\exists \varepsilon > 0\, \neg\exists N\, \forall n > N\, (\dots)$.
:::

:::step{why="Continue: ¬∃N = ∀N, ¬∀n>N = ∃n>N, and negate the inequality."}
$\exists \varepsilon > 0\, \forall N\, \exists n > N\, (\lvert a_n - L\rvert \ge \varepsilon)$.
:::

:::answer
Some tolerance $\varepsilon$ is broken beyond every point $N$: infinitely many terms stay at least
$\varepsilon$ away from $L$. Note the restriction "$> 0$" stays put; it is not negated.
:::
::::

:::trick{#trick-restricted title="Restricted quantifiers flip without touching the restriction" depth="standard"}
$\forall x > 0\, \varphi$ is short for $\forall x\, (x > 0 \to \varphi)$ and $\exists x > 0\, \varphi$ for
$\exists x\, (x > 0 \wedge \varphi)$, the pairing rule again. Their negations are $\exists x > 0\, \neg\varphi$
and $\forall x > 0\, \neg\varphi$. It works because $\neg(A \to \varphi) \equiv A \wedge \neg\varphi$ and
$\neg(A \wedge \varphi) \equiv A \to \neg\varphi$ keep $A$ unnegated. It fails if you expand and then
negate carelessly, writing $x \le 0$: the restriction is never part of what is denied.
:::

**Recap.** Every definition you will meet is a quantified sentence; its negation is the recipe for a
counterexample. "Any" is $\forall$ in a statement but $\exists$ inside an "if". Restricted quantifiers
flip without touching the restriction.

## Try it: the Quantifier Lab

Set a small domain and click the cells of $P$, $Q$ and $R$ to build a world, then type any formula from
this lesson: the lab shows its value with the witness or counterexample of the outer quantifier
marked. Try $\forall x\, \exists y\, R(x, y)$ and $\exists y\, \forall x\, R(x, y)$ on the same grid, and
"all $P$ are $Q$" written both the right way and with $\wedge$.

:::lab{#lab-quant lab="quantifier-lab" tab="evaluate" depth="standard"}
:::

## GATE questions on this lesson

Each question sits after the blocks it tests; its solution walks through the reasoning and says why
each wrong option is wrong.

:::pyq{id="cse-2004-cs-23" tests="pairing-theorem,trap-inner-restrict,ex-nest-taller" depth="standard"}
:::

:::pyq{id="it-2004-it-3" tests="qdm-theorem,deriv-push,ex-neg-equiv" depth="standard"}
:::

:::pyq{id="cse-2005-cs-41" tests="four-forms,trap-order,ex-nest-teacher" depth="standard"}
:::

:::pyq{id="cse-2006-cs-26" tests="and-or-subjects,deriv-and-or,ex-tr-gate" depth="standard"}
:::

:::pyq{id="cse-2007-cs-22" tests="four-forms,qdm-theorem,trap-half-push" depth="standard"}
:::

:::pyq{id="cse-2008-cs-30" tests="pairing-theorem,trap-scope,ex-nest-fsa" depth="standard"}
:::

:::pyq{id="it-2008-it-22" tests="deriv-push,trap-neg-imp,trick-neg-check,ex-neg-gate" depth="standard"}
:::

:::pyq{id="cse-2009-cs-23" tests="and-or-subjects,ex-tr-ornaments" depth="standard"}
:::

:::pyq{id="cse-2009-cs-26" tests="qdm-theorem,ex-neg-easy" depth="standard"}
:::

:::pyq{id="cse-2010-cs-30" tests="qdm-theorem,nested-def,ex-neg-fool" depth="standard"}
:::

:::pyq{id="cse-2011-cs-30" tests="prime-def,ex-num-prime" depth="standard"}
:::

:::pyq{id="cse-2012-cs-13" tests="four-forms,trap-exists-imp" depth="standard"}
:::

:::pyq{id="cse-2013-cs-27" tests="four-forms,ex-tr-none" depth="standard"}
:::

:::pyq{id="cse-2014-1-cs-1" tests="four-forms,ex-neg-glitters" depth="standard"}
:::

:::pyq{id="cse-2014-3-cs-53" tests="four-forms,trap-forall-and,ex-neg-glitters" depth="standard"}
:::

:::pyq{id="cse-2019-cs-35" tests="prime-def,ex-num-infinite" depth="standard"}
:::

:::pyq{id="cse-2023-cs-16" tests="ea-implies-ae,ex-nest-implies" depth="standard"}
:::

:::pyq{id="cse-2025-1-cs-38" tests="unique-def,trap-unique-missing,ex-uniq-mother" depth="standard"}
:::

:::pyq{id="cse-2026-2-cs-1" tests="nested-def,counting-table,ex-nest-known" depth="standard"}
:::

## Practice

Our own questions, from warm-up to GATE level. Each answer is re-derived by model search in the
checks.

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
| Predicate | a sentence with blanks; becomes a proposition when the blanks are filled or quantified |
| $\forall x\, \varphi$ | big AND over the domain: true iff no counterexample |
| $\exists x\, \varphi$ | big OR over the domain: true iff one witness |
| Scope | a quantifier binds like $\neg$; the bracket after it decides what it covers |
| All $A$ are $B$ | $\forall x\, (A \to B)$ (not $\wedge$) |
| Some $A$ are $B$ | $\exists x\, (A \wedge B)$ (not $\to$) |
| No / not all / only | $\forall x(A \to \neg B)$ / $\exists x(A \wedge \neg B)$ / $\forall x(B \to A)$ |
| $A$ and $B$ subjects | $\forall x\, ((A \vee B) \to \dots)$ |
| Order | $\exists y \forall x \Rightarrow \forall x \exists y$, never the converse; same kinds commute |
| Negation | $\neg\forall = \exists\neg$, $\neg\exists = \forall\neg$; $\neg(A \to B) = A \wedge \neg B$; order unchanged |
| Exactly one | $\exists x\, (\varphi(x) \wedge \forall z\, (\varphi(z) \to z = x))$ |
:::

## Common mistakes

- Pairing $\forall$ with $\wedge$ ("all rainy days are cold" as "every day is rainy and cold").
- Pairing $\exists$ with $\to$ (made true by any object outside the noun).
- Translating "tigers and lions" as $T(x) \wedge L(x)$.
- Pulling an inner $\exists$ to the front ("liked by some student" read as one student liking every teacher).
- Negating half way: flipping the quantifier but leaving the inside, or keeping an arrow after negating.
- Reading "at least one" or "at most one" as "exactly one".
- Treating $P(x)$ with $x$ free as a proposition.

:::note{#further-depth title="Further depth: why first-order logic needs infinite domains" depth="deep"}
A propositional formula has finitely many truth assignments, so a truth table settles everything. A
first-order sentence is evaluated in a **structure** (a domain and meanings for the predicates), and
domains may be infinite. Some sentences have only infinite models: "$R$ is irreflexive and transitive,
and every element has an $R$-successor" forces an endless chain $d_1 R\, d_2 R\, d_3 \dots$ of distinct
elements. That is why validity in first-order logic cannot be decided by listing cases, a fact
[Lesson 2](lesson:quantifier-laws-validity) makes precise.
:::
