---
id: predicates-quantifiers
subject: dm
chapter: predicate-logic
title: Predicates, quantifiers and translation
order: 1
prerequisites: [equivalence-normal-forms]
pyq_topics: [dm/logic]
est_minutes: 70
difficulty: basic
status: review
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every evaluation, translation, negation step, uniqueness form, PYQ key and practice answer is recomputed in content/gate-notes/_checks/dm/l2_01_predicates.py with predlib.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 26–37, set B pp. 168–173 (each half), set C pp. 296–311, set D pp. 676–679. Set A's reversed gloss of \"only A are B\" (p. 34) and the empty-domain notes (A 28/31, A 42) are recorded in _errata/dm.md."
  - "Facts checked against standard textbooks: K. H. Rosen, Discrete Mathematics and its Applications (predicates, quantifiers, nested quantifiers, translating English); C. L. Liu, Elements of Discrete Mathematics."
  - "PYQs: src/gate/questions.json (dm/logic); all nineteen keys are re-derived by finite-domain evaluation and equivalence search in l2_01_predicates.py."
updated: "2026-11-18"
---

Propositional logic could only talk about whole sentences that are already true or false. Real
mathematics — and real GATE questions — talk about **objects**: "every student", "some course",
"no graph is connected". This lesson adds the two missing ingredients: **predicates** (sentences with
holes, like "$x$ is prime") and **quantifiers** (the words "every" and "some" that plug the holes).
Everything else in the chapter — laws, validity, models — is built on exactly these two ideas, so we
take them slowly.

Here is the shape of the lesson. First we make precise what a predicate and a domain are, and when an
open formula becomes a proposition. Then we meet the two quantifiers as what they really are on a
finite domain — a big AND and a big OR — because that single fact decides most GATE questions. Then
we learn the free/bound distinction and the scope of a quantifier, which tells you which variable a
quantifier actually controls. The heart of the lesson is translation: the six sentence shapes and the
wrong pairings that cost marks every year. After that come nested quantifiers (and why their order
matters), uniqueness and the counting quantifiers, De Morgan for quantifiers, and finally number
predicates like prime and divides written in logic. A five-step method for translation questions pulls
it all together at the end.

## Where this fits

This is Chapter 2 of Discrete Mathematics. You need the truth tables and the implication
$p \to q$ from [Lesson 1](lesson:propositions-connectives) and the equivalence laws from
[Lesson 2](lesson:equivalence-normal-forms); here we reuse them inside quantified formulas.
[Lesson 2 of this chapter](lesson:quantifier-laws-validity) turns the translations of this lesson into
laws: which quantified formulas are valid, and how to find counter-models. If you have done
[Boolean algebra in Digital Logic](/gate/notes/dl/boolean-laws), the connectives $\wedge, \vee, \neg,
\to, \leftrightarrow$ are the same ones you already know.

A word on notation before we start, because GATE papers print formulas in several styles: we write
$\forall x\,P(x)$ and $\exists x\,P(x)$; some papers print $(\forall x)P(x)$ or $(\exists x)(\ldots)$;
some use words ("for all x", "there exists y"); some use ASCII in the options (∀, ∃, →, ∧, ¬ all
appear verbatim in recent papers). All of these are the same symbols — the reader and the Quantifier
Lab's parser accept Unicode, ASCII and LaTeX forms alike, and a quantifier binds as tightly as ¬
unless brackets widen its scope. GATE options always bracket the scope, so follow their brackets.

:::table{#radar title="GATE radar: predicates, quantifiers and translation" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 19 (2004–2026) |
| Marks | 10 one-mark, 9 two-mark; 2 MSQ (2023, 2025-1) |
| Pattern 1 | Translate an English sentence with "all / some / no / only / not all / none": 2004, 2005, 2006, 2009, 2012, 2013, 2014 (×2), 2026 |
| Pattern 2 | The wrong pairing: $\forall$ with $\wedge$ and $\exists$ with $\rightarrow$ are the traps: 2004, 2008, 2025-1 |
| Pattern 3 | Nested quantifiers and their order ($\forall x\exists y$ vs $\exists y\forall x$): 2004, 2008, 2010, 2023 |
| Pattern 4 | Negation pushed through quantifiers: 2008-IT, 2009 |
| Pattern 5 | Number predicates (prime, divides): 2011, 2019 |
| What examiners test | That "all A are B" is $\forall x(A \to B)$ (vacuously true outside A), "some A are B" is $\exists x(A \wedge B)$, "only A are B" is $\forall x(B \to A)$, and that the order of different quantifiers matters |
:::

## Predicates and domains

:::intuition{#world-of-objects title="Propositional logic cannot count objects" depth="standard"}
Try to express "All men are mortal. Socrates is a man. Therefore Socrates is mortal." in
propositional logic. You can't: the argument's force comes from the word **all**, which ranges over
objects. Propositional logic has no objects, so it cannot even state the first premise honestly.
First-order logic (FOL) adds a **domain of discourse** — a non-empty set of objects we are talking
about — and **predicates**, which are statements with variables that become true or false once each
variable is filled with an object from the domain. "$x$ is prime" is not a proposition yet; but
"$2$ is prime" is (true), and "$9$ is prime" is (false).
:::

:::definition{#predicate-def term="Predicate and domain" depth="quick"}
A **predicate** (or **propositional function**) is an expression $P(x_1, \dots, x_n)$ with variables
$x_1, \dots, x_n$ such that replacing each variable by an element of the **domain** $D$ gives a
proposition. $P$ is called an $n$-ary (or $n$-place) predicate; $n = 1$ is unary (a property), $n = 2$
is binary (a relation). The **domain of discourse** $D$ is the set of all values the variables may
take. By convention (GATE always assumes this) **domains are non-empty** — see the trap below.

- $P(x)$: "$x$ is prime", domain $\mathbb{N}$: $P(2)$ is T, $P(9)$ is F.
- $L(x, y)$: "$x$ loves $y$", domain = people: $L(\text{Rama}, \text{Sita})$ is a proposition.
- A predicate with 0 variables is just a proposition.
:::

:::definition{#domain-def term="Domain of discourse" depth="quick"}
The **domain** (universe) $D$ is the set over which the variables range. Different variables may in
principle have different domains, but GATE questions almost always use one shared domain, stated in
the question ("$x, y$ chosen from some universe"). Unless stated otherwise, **the domain is non-empty**:
on an empty domain $\forall x\,P(x)$ would be vacuously true and $\exists x\,P(x)$ false, which GATE
never intends (recorded in `_errata/dm.md`, set A pp. 28/31 and 42).
:::

:::trap{#trap-open-sentence title="An open sentence is not yet a proposition" depth="quick"}
"$x$ is composite" has no truth value while $x$ is free. It becomes a proposition when you fix $x$
("$9$ is composite" — T) or quantify it ("$\exists x$ (x is composite)" — T). A formula with free
variables is **not a sentence**; GATE's true/false questions about formulas always quantify all
variables first.
:::

### Worked examples: predicates and domains

::::example{#ex-p-easy level="easy" title="Filling the hole" depth="quick"}
Domain $D = \{2, 3, 4\}$, predicate $P(x)$ = "$x$ is prime". Give the truth values of $P(2), P(3), P(4)$.

:::step{why="A predicate becomes a proposition when the variable is replaced by a domain element."}
$P(2)$: $2$ is prime → **T**. $P(3)$: **T**. $P(4)$: $4 = 2 \cdot 2$ → **F**.
:::

:::step{why="Each replacement is independent: P(2), P(3), P(4) are three separate propositions."}
:::

:::answer
$P(2) = T$, $P(3) = T$, $P(4) = F$.
:::
::::

::::example{#ex-p-medium level="medium" title="A binary predicate on a small domain" depth="standard"}
Domain $D = \{1, 2, 3\}$, $R(x, y)$ = "$x < y$". List all pairs $(x, y) \in D \times D$ for which $R(x, y)$ is true.

:::step{why="A binary predicate is true on some ordered pairs of the domain and false on the rest; listing them is just evaluating."}
Fix $x = 1$: $R(1, 2)$ and $R(1, 3)$ are T, $R(1, 1)$ is F. Fix $x = 2$: $R(2, 3)$ is T, $R(2, 1)$, $R(2, 2)$ are F. Fix $x = 3$: all three are F.
:::

:::step{why="Count them: the pairs are exactly the strictly-above-diagonal entries of the 3×3 grid."}
The true pairs are $(1,2), (1,3), (2,3)$ — three pairs.
:::

:::answer
$R = \{(1,2), (1,3), (2,3)\}$, $|R| = 3$.
:::
::::

::::example{#ex-p-gate level="gate" title="Which elements satisfy the predicate? (GATE style)" depth="standard"}
Domain $D = \{1, \dots, 8\}$. $P(x)$ = "$x > 1$ and every divisor $y$ of $x$ is $1$ or $x$", i.e.
$P(x) \equiv (x > 1) \wedge \forall y\,(y \mid x \to (y = 1 \vee y = x))$. Which $x \in D$ satisfy $P(x)$?

:::step{why="This is the definition of prime written in logic; evaluate it element by element."}
Check each $x$: $1$ fails $x > 1$. $2$: divisors $1, 2$ → T. $3$: $1, 3$ → T. $4$: divisor $2$ is neither $1$ nor $4$ → F. $5$: T. $6$: divisor $2$ → F. $7$: T. $8$: divisor $2$ → F.
:::

:::step{why="The survivors are exactly the primes."}
$P$ holds on $\{2, 3, 5, 7\}$.
:::

:::answer
$\{2, 3, 5, 7\}$ — four elements; these are exactly the primes in $D$.
:::
::::

::::example{#ex-p-edge level="gate" title="Edge case: the domain changes the answer" depth="standard"}
Same predicate $P(x)$ as above. Over domain $D = \{-2, -1, 0, 1, 2\}$ with "$y \mid x$" read as ordinary
integer divisibility, which elements satisfy $P(x)$?

:::step{why="Over the integers, negative divisors count. For $x = 2$, $y = -1$ divides $2$, and $-1$ is neither $1$ nor $2$, so the universal fails."}
For every $x \le 0$ the clause $x > 1$ fails. For $x = 2$: $y = -2$ divides $2$ and is neither $1$ nor $2$ → F. For $x = 1$: fails $x>1$. So no element satisfies $P$.
:::

:::step{why="The lesson: a predicate's meaning depends on the declared domain and on what the symbols ($\mid$, $>$) are declared to mean. State them, then evaluate."}
:::

:::answer
Over $\{-2, \dots, 2\}$ with integer divisibility, **no** element satisfies $P$ — even $2$ fails because $-1 \mid 2$. (GATE questions mean positive divisors on positive domains unless stated.)
:::
::::

:::note{#recap-pred title="Recap" depth="quick"}
A predicate $P(x_1,\dots,x_n)$ becomes a proposition when every variable is replaced by an element of
the domain $D$ (non-empty by convention). Unary predicates are properties, binary ones are relations.
An open formula is not yet a proposition until all variables are fixed or quantified.
:::

## Universal quantifier: a big AND

:::intuition{#big-and title="∀ is a big AND over the domain" depth="standard"}
"$\forall x\,P(x)$" reads "$P(x)$ is true for **all** $x$ in the domain". If the domain is finite,
say $D = \{a, b, c, d\}$, that is literally the conjunction $P(a) \wedge P(b) \wedge P(c) \wedge P(d)$:
one false element kills the whole statement — exactly like one broken link in a chain. That is why a
single counterexample refutes a "for all" claim.
:::

:::definition{#forall-def term="Universal quantifier ∀x P(x)" depth="quick"}
$\forall x\,P(x)$ is true iff $P(d)$ is true for **every** $d \in D$. An element $c$ with $P(c)$ false
is called a **counterexample** to $\forall x\,P(x)$.
:::

:::theorem{#forall-expansion name="∀ over a finite domain is a conjunction" depth="standard"}
If $D = \{x_1, \dots, x_n\}$ then $\forall x\,P(x) \equiv P(x_1) \wedge P(x_2) \wedge \dots \wedge P(x_n)$.
:::

:::proof{#forall-expansion-proof depth="standard"}
(⇒) If $\forall x P(x)$ is true, then instantiating at each $x_i$ gives $P(x_i)$ true, so the
conjunction is true. (⇐) If the conjunction is true, every $P(x_i)$ is true, and since $D$ has no
other elements, $\forall x P(x)$ is true. Both directions use only the definition of $\forall$.
:::

:::viz{#viz-forall spec="forall-big-and" mode="animate" depth="standard"}
:::

### Worked examples: evaluating ∀

::::example{#ex-f-easy level="easy" title="All elements of a tiny domain" depth="quick"}
$D = \{1, 2\}$, $P(x)$ = "$x \ge 1$". Evaluate $\forall x\,P(x)$.

:::step{why="Expand the big AND: $P(1) \wedge P(2)$."}
$P(1) = T$, $P(2) = T$, so $T \wedge T = T$.
:::

:::step{why="The big AND over two elements is just the single conjunction P(1) ∧ P(2)."}
:::

:::answer
$\forall x\,P(x)$ is **true**.
:::
::::

::::example{#ex-f-medium level="medium" title="One counterexample kills it" depth="standard"}
$D = \{2, 3, 4, 5\}$, $P(x)$ = "$x$ is prime". Evaluate $\forall x\,P(x)$ and name the counterexample.

:::step{why="Expand: $P(2) \wedge P(3) \wedge P(4) \wedge P(5)$."}
$P(2) = T$, $P(3) = T$, $P(4) = F$, $P(5) = T$.
:::

:::step{why="A conjunction is false as soon as one factor is false."}
$T \wedge T \wedge F \wedge T = F$.
:::

:::answer
**False**; the counterexample is $4$.
:::
::::

::::example{#ex-f-gate level="gate" title="∀ over a relation (GATE style)" depth="standard"}
Domain $D = \{a, b\}$, $R(x, y)$ = "$x$ knows $y$", $R = \{(a, b)\}$. Evaluate $\forall x\,\exists y\,R(x, y)$
and $\exists y\,\forall x\,R(x, y)$.

:::step{why="First formula: for each x, is there a y with R(x,y)? x=a: y=b works. x=b: R(b,a), R(b,b) both absent → fails."}
So $\forall x\exists y R(x,y)$ is **false** (b has no outgoing arrow).
:::

:::step{why="Second formula: is there one y that every x points to? y=a: R(a,a) absent → no. y=b: R(b,b) absent → no."}
So $\exists y\forall x R(x,y)$ is also **false** here.
:::

:::answer
Both false; the witness failure for the first is $x = b$, for the second both $y$.
:::
::::

::::example{#ex-f-edge level="gate" title="Edge case: ∀x A ≡ A when x is not free in A" depth="standard"}
Evaluate $\forall x\,(2 + 2 = 4)$ and $\forall x\,(P \vee Q)$ where $P, Q$ are propositions, over any
non-empty domain.

:::step{why="The quantified variable does not occur in the formula, so quantifying changes nothing: the value is the formula's own value."}
$\forall x\,(2+2=4) \equiv T$; $\forall x\,(P \vee Q) \equiv P \vee Q$.
:::

:::step{why="Formally: expanding the big AND gives $n$ copies of the same value, and $v \wedge v = v$."}
:::

:::answer
$\forall x\,A \equiv A$ whenever $x$ is not free in $A$ (the **null quantification** rule, used again in Lesson 2).
:::
::::

:::note{#recap-forall title="Recap" depth="quick"}
$\forall x P(x)$ = big AND over the domain; false iff some element is a counterexample. On a finite
domain it is literally the conjunction of the values. If $x$ is not free in $A$, $\forall x A \equiv A$.
:::

## Existential quantifier: a big OR that stops early

:::intuition{#big-or title="∃ is a big OR with a first witness" depth="standard"}
"$\exists x\,P(x)$" reads "**there exists** (at least one) $x$ in the domain with $P(x)$". On a finite
domain $D = \{a,b,c,d\}$ it is the disjunction $P(a) \vee P(b) \vee P(c) \vee P(d)$: **one** true
element makes it true, and you can stop checking — that element is the **witness**.
:::

:::definition{#exists-def term="Existential quantifier ∃x P(x)" depth="quick"}
$\exists x\,P(x)$ is true iff $P(d)$ is true for **at least one** $d \in D$. Such a $d$ is a witness.
Other English words for it: "some", "there is", "for at least one".
:::

:::theorem{#exists-expansion name="∃ over a finite domain is a disjunction" depth="standard"}
If $D = \{x_1, \dots, x_n\}$ then $\exists x\,P(x) \equiv P(x_1) \vee \dots \vee P(x_n)$.
:::

:::proof{#exists-expansion-proof depth="standard"}
(⇒) A witness $x_i$ gives $P(x_i)$ true, so the disjunction is true. (⇐) If the disjunction is true,
some $P(x_i)$ is true, and $x_i$ is a witness. ∎
:::

:::trick{#trick-first-witness title="Stop at the first witness" depth="quick"}
When evaluating $\exists x\,P(x)$ on a finite domain, check elements one by one and **stop at the
first true one** — you do not need to check the rest. This is how the big OR short-circuits, and it is
the fastest way to prove an existential in a GATE option check: find one witness and you are done. It
fails only when you are trying to *refute* an existential — then you must check all elements.
:::

:::viz{#viz-exists spec="exists-big-or" mode="animate" depth="standard"}
:::

### Worked examples: evaluating ∃

::::example{#ex-e-easy level="easy" title="Is there an even number?" depth="quick"}
$D = \{1, 3, 5\}$, $P(x)$ = "$x$ is even". Evaluate $\exists x\,P(x)$.

:::step{why="Big OR: $P(1) \vee P(3) \vee P(5) = F \vee F \vee F$."}
:::

:::step{why="The big OR over three elements is F ∨ F ∨ F, which is F — no witness, no truth."}
:::

:::answer
**False** — no witness exists.
:::
::::

::::example{#ex-e-medium level="medium" title="First witness stops the search" depth="standard"}
$D = \{1, 2, 3, 4\}$, $P(x)$ = "$x$ is even". Evaluate $\exists x\,P(x)$, showing where you stop.

:::step{why="Check in order: $P(1) = F$, $P(2) = T$ — witness found, stop."}
$F \vee T \vee \dots = T$.
:::

:::step{why="Once the OR has a T, further terms cannot change it: T ∨ anything = T."}
:::

:::answer
**True**, witness $x = 2$ (you never needed to check 3 and 4).
:::
::::

::::example{#ex-e-gate level="gate" title="Some real numbers are rational (GATE 2012 pattern)" depth="standard"}
Domain = real numbers, predicates $real(x)$, $rational(x)$. Which formula says "some real numbers are
rational"?

:::step{why="“Some A are B” needs a witness that is BOTH: $\exists x\,(real(x) \wedge rational(x))$. The → version would be true because of any non-real element — vacuously."}
$\exists x(real \wedge rational)$ is the correct form; $\exists x(real \to rational)$ is not.
:::

:::step{why="On the reals, 1/2 is both real and rational, so the correct formula is true; the → version is true because of any non-real element."}
:::

:::answer
$\exists x\,(real(x) \wedge rational(x))$ — true, witness $x = 1/2$.
:::
::::

::::example{#ex-e-edge level="gate" title="Edge case: ∃ and ∀ on a one-element domain" depth="standard"}
$D = \{a\}$. When is $\exists x\,P(x)$ true, and when is $\forall x\,P(x)$ true?

:::step{why="The big OR and the big AND each have a single term: $\exists x P(x) \equiv P(a) \equiv \forall x P(x)$."}
On a one-element domain the two quantifiers coincide.
:::

:::step{why="This is why counter-models for ∀∃-order questions need at least two elements."}
:::

:::answer
Both are true exactly when $P(a)$ is true; they are equivalent on any singleton domain.
:::
::::

:::note{#recap-exists title="Recap" depth="quick"}
$\exists x P(x)$ = big OR over the domain; true iff at least one witness exists, and evaluation can
stop at the first witness. On a singleton domain $\forall$ and $\exists$ coincide.
:::

## Free and bound variables, and scope

:::definition{#free-bound-def term="Bound and free variables" depth="quick"}
In a formula, an occurrence of a variable is **bound** if it lies inside the scope of a quantifier
$\forall x$ or $\exists x$ for that same variable; otherwise it is **free**. A formula with no free
variables is a **sentence** (closed formula) — only sentences have a definite truth value under an
interpretation.
:::

:::definition{#scope-def term="Scope of a quantifier" depth="quick"}
The **scope** of $\forall x$ (or $\exists x$) is the sub-formula it applies to: with brackets, the
bracketed part; without brackets, the next single unit (an atom, a bracketed formula, a negation, or
another quantifier). GATE options always bracket the scope, so there is no ambiguity: in
$(\forall x)(P(x) \to Q(x))$, the scope of $\forall x$ is $(P(x) \to Q(x))$.
:::

:::trap{#trap-null-quantifier title="Quantifying a variable that does not occur changes nothing" depth="quick"}
$\forall x\,A \equiv A$ and $\exists x\,A \equiv A$ when $x$ is not free in $A$. Example:
$\forall x\,(P \to Q) \equiv P \to Q$. If you forget this, you may think a quantifier "adds" meaning —
it only binds variables that actually occur in its scope.
:::

:::viz{#viz-scope spec="scope-bracket-grow" mode="animate" depth="standard"}
:::

### Worked examples: free, bound, scope

::::example{#ex-b-easy level="easy" title="Find the free variables" depth="quick"}
$\exists x\,(x + y = 1)$. Which variables are free?

:::step{why="x is inside $\exists x$'s scope → bound. y is not in any quantifier's scope → free."}
:::

:::step{why="A sentence needs NO free variables; here y remains, so ∃x(x+y=1) is not yet a proposition."}
:::

:::answer
Free variables: $\{y\}$; bound: $x$.
:::
::::

::::example{#ex-b-medium level="medium" title="Two quantifiers, one letter" depth="standard"}
$\exists x\,(P(x) \wedge Q(x)) \wedge \forall x\,R(x)$. Which occurrences of $x$ are bound by which quantifier?

:::step{why="Each quantifier binds only the x's in its own scope. The first $\exists x$ binds the x in $P(x) \wedge Q(x)$; the second $\forall x$ binds the x in $R(x)$. They do not interfere."}
:::

:::step{why="Scopes of different quantifiers with the same letter simply do not overlap, so each binds its own part."}
:::

:::answer
The $x$ in $P, Q$ is bound by $\exists x$; the $x$ in $R$ is bound by $\forall x$; no free $x$ remains (the formula is a sentence if $P, Q, R$ are the only predicates).
:::
::::

::::example{#ex-b-gate level="gate" title="Scope without brackets (GATE convention)" depth="standard"}
In $\forall x\,P(x) \vee Q(x)$, what is the scope of $\forall x$?

:::step{why="A quantifier binds as tightly as ¬: it scopes over the next unit only. So this reads $(\forall x\,P(x)) \vee Q(x)$, NOT $\forall x\,(P(x) \vee Q(x))$."}
The $x$ in $Q(x)$ is **free**.
:::

:::step{why="GATE options avoid this by bracketing; when they don't, apply the tight-binding rule."}
:::

:::answer
Scope = $P(x)$ only; the formula is $(\forall x P(x)) \vee Q(x)$ with $x$ free in $Q(x)$.
:::
::::

::::example{#ex-b-edge level="gate" title="Edge case: renaming a bound variable" depth="standard"}
Is $\forall x\,P(x)$ equivalent to $\forall y\,P(y)$?

:::step{why="A bound variable is a dummy: renaming it throughout its scope does not change the meaning (as long as the new name doesn't capture a free variable)."}
Yes — both say "P holds on every element of the domain".
:::

:::step{why="Renaming is safe because the quantifier's meaning is 'for every element of the domain', which does not mention the letter."}
:::

:::answer
Yes, $\forall x P(x) \equiv \forall y P(y)$; bound variables can be renamed freely (avoiding capture).
:::
::::

:::note{#recap-bound title="Recap" depth="quick"}
A variable occurrence is bound if a quantifier for it encloses it; otherwise free. Scope = the
sub-formula the quantifier applies to (bracketed in GATE options; otherwise the next unit). A formula
with no free variables is a sentence. Renaming bound variables is free; quantifying a non-occurring
variable changes nothing.
:::

## Translating English into logic

:::intuition{#translation-intuition title="The quantifier chooses the connective" depth="standard"}
Think of "all A are B" as a **rule with exceptions allowed outside A**: every A must be B, but
non-A's don't matter — that is exactly what $A \to B$ does (vacuously true when $A$ is false). And
"some A are B" claims a **witness inside A∩B** — that is what $A \wedge B$ does. So the quantifier
tells you the connective: $\forall$ over a restricted set uses $\to$; $\exists$ uses $\wedge$.
:::

:::theorem{#translation-table name="The six sentence shapes" depth="standard"}
With predicates $A(x)$, $B(x)$ over domain $D$:

| English | Formula |
|:--|:--|
| All A are B | $\forall x\,(A(x) \to B(x))$ |
| Some A are B | $\exists x\,(A(x) \wedge B(x))$ |
| No A is B | $\forall x\,(A(x) \to \neg B(x)) \equiv \neg\exists x\,(A(x) \wedge B(x))$ |
| Only A are B | $\forall x\,(B(x) \to A(x))$ |
| Not all A are B | $\exists x\,(A(x) \wedge \neg B(x)) \equiv \neg\forall x\,(A(x) \to B(x))$ |
| All and only A are B | $\forall x\,(A(x) \leftrightarrow B(x))$ |
:::

:::proof{#translation-table-proof depth="standard"}
For "all A are B": the claim fails exactly when some $a$ is A but not B, i.e. when
$\exists x(A(x) \wedge \neg B(x))$ — the negation of that is $\forall x\,\neg(A \wedge \neg B)
\equiv \forall x(A \to B)$. The others follow the same way: negate the existential witness form for
"no", and note "only A are B" says being B forces being A. ∎
:::

:::trap{#trap-wrong-pairing title="The classic wrong pairing: ∀ with ∧, ∃ with →" depth="quick"}
"All A are B" is **not** $\forall x(A \wedge B)$ — that claims every object is both A and B and fails
on any non-A. "Some A are B" is **not** $\exists x(A \to B)$ — that is true whenever some object is
not A (vacuously). GATE 2004, 2008 and 2025-1 are built on exactly this trap.
:::

:::viz{#viz-allwrong spec="all-vs-wrong-conj" mode="animate" depth="standard"}
:::

:::viz{#viz-somewrong spec="some-vs-wrong-imp" mode="animate" depth="standard"}
:::

:::viz{#viz-phrase spec="translate-phrase-by-phrase" mode="animate" depth="standard"}
:::

### Worked examples: translation

::::example{#ex-t-easy level="easy" title="All dogs bark" depth="quick"}
Translate: "All dogs bark." ($dog(x)$, $bark(x)$).

:::step{why="“All A are B” → ∀x(A → B)."}
$\forall x\,(dog(x) \to bark(x))$.
:::

:::step{why="The ∧ version would be false in any world containing a non-dog; the → version ignores non-dogs."}
:::

:::answer
$\forall x\,(dog(x) \to bark(x))$ — not $\forall x(dog \wedge bark)$, which would say everything is a barking dog.
:::
::::

::::example{#ex-t-medium level="medium" title="Some cats are black" depth="standard"}
Translate: "Some cats are black." ($cat(x)$, $black(x)$).

:::step{why="“Some A are B” → ∃x(A ∧ B): a witness must be both."}
$\exists x\,(cat(x) \wedge black(x))$.
:::

:::step{why="The → version would be true in a world with a non-cat; only the ∧ version demands a cat witness."}
:::

:::answer
$\exists x\,(cat(x) \wedge black(x))$ — not $\exists x(cat \to black)$.
:::
::::

::::example{#ex-t-medium2 level="medium" title="No student is perfect" depth="standard"}
Translate: "No student is perfect." ($student(x)$, $perfect(x)$).

:::step{why="“No A is B” = ¬∃x(A ∧ B), equivalently ∀x(A → ¬B)."}
$\neg\exists x\,(student(x) \wedge perfect(x)) \equiv \forall x\,(student(x) \to \neg perfect(x))$.
:::

:::step{why="Both forms are logically equivalent by the quantifier De Morgan law ¬∃ ≡ ∀¬ (proved below)."}
:::

:::answer
$\neg\exists x(student \wedge perfect)$; both forms are accepted.
:::
::::

::::example{#ex-t-gate level="gate" title="Gold and silver ornaments are precious (GATE 2009)" depth="standard"}
Translate: "Gold and silver ornaments are precious." ($G(x)$: gold ornament, $S(x)$: silver
ornament, $P(x)$: precious).

:::step{why="“Gold and silver ornaments” means ornaments that are gold OR silver: the restricted set is $(G(x) \vee S(x))$. “Are precious” under a universal → implication."}
$\forall x\,((G(x) \vee S(x)) \to P(x))$.
:::

:::step{why="Check the wrong options: $\forall x(P \to (G \wedge S))$ reverses it; $\forall x((G \wedge S) \to P)$ demands every object be both gold and silver; $\exists x((G \wedge S) \to P)$ is vacuous."}
:::

:::answer
$\forall x\,((G(x) \vee S(x)) \to P(x))$.
:::
::::

::::example{#ex-t-gate2 level="gate" title="Only A are B" depth="standard"}
Translate: "Only members can vote." ($member(x)$, $canVote(x)$).

:::step{why="“Only A are B”: if you can vote, you must be a member — B forces A: ∀x(B → A)."}
$\forall x\,(canVote(x) \to member(x))$.
:::

:::step{why="Note the direction: “all members can vote” would be ∀x(member → canVote), the opposite. “All and only” would be the biconditional."}
:::

:::answer
$\forall x\,(canVote(x) \to member(x))$.
:::
::::

::::example{#ex-t-edge level="gate" title="Edge case: 'every student loves someone'" depth="standard"}
Translate: "Every student loves someone." ($student(x)$, $loves(x, y)$).

:::step{why="“Every student” → ∀x(student(x) → …). “Loves someone” → ∃y loves(x, y) — the someone may depend on the student, so ∃y is INSIDE the ∀x scope."}
$\forall x\,(student(x) \to \exists y\,loves(x, y))$.
:::

:::step{why="If you put ∃y outside — ∃y∀x(student(x) → loves(x,y)) — you'd claim ONE person is loved by every student: different meaning."}
:::

:::answer
$\forall x\,(student(x) \to \exists y\,loves(x, y))$; the inner quantifier's witness may depend on $x$.
:::
::::

:::note{#recap-translation title="Recap" depth="quick"}
all A are B = ∀(A→B); some A are B = ∃(A∧B); no A is B = ∀(A→¬B) = ¬∃(A∧B); only A are B = ∀(B→A);
not all = ∃(A∧¬B); all and only = ∀(A↔B). The wrong pairings ∀(A∧B) and ∃(A→B) are the classic traps.
:::

## Nested quantifiers and their order

:::definition{#nested-def term="Nested quantifiers" depth="quick"}
Quantifiers can stack: $\forall x\,\exists y\,R(x, y)$ means "for every $x$ there is (possibly a
different) $y$ such that $R(x,y)$". The **order matters** when the quantifiers differ:
$\forall x\exists y\,R(x,y) \not\equiv \exists y\forall x\,R(x,y)$ in general.
:::

:::theorem{#same-quantifiers-commute name="Same quantifiers commute" depth="standard"}
$\forall x\,\forall y\,P(x,y) \equiv \forall y\,\forall x\,P(x,y)$ and
$\exists x\,\exists y\,P(x,y) \equiv \exists y\,\exists x\,P(x,y)$.
:::

:::proof{#commute-proof depth="standard"}
"Every pair (x,y) satisfies P" is the same claim as "every pair (y,x) satisfies P" — the grid of pairs
is the same set read in the other order. Same for "some pair". Formally, both expand to the big
AND (resp. OR) over all $n^2$ pairs. ∎
:::

:::theorem{#one-way-exists-forall name="∃y∀x implies ∀x∃y (one way only)" depth="standard"}
$\exists y\,\forall x\,P(x,y) \;\Rightarrow\; \forall x\,\exists y\,P(x,y)$ is valid; the converse is not.
:::

:::proof{#one-way-proof depth="standard"}
If one fixed $y_0$ works for **every** $x$, then for each $x$ the same $y_0$ is a witness, so
$\forall x\exists y$ holds. Converse counter-model: $D = \{a, b\}$, $P = \{(a,a), (b,b)\}$: every row
$x$ has a mark (the diagonal), but no single column $y$ is full — so $\forall x\exists y$ is true and
$\exists y\forall x$ is false. ∎
:::

:::trap{#trap-order-matters title="∀x∃y ≠ ∃y∀x" depth="quick"}
Read them on the x×y grid: $\forall x\exists y$ = **every row has a mark**; $\exists y\forall x$ = **one
full column**. A full column makes every row marked; the reverse fails (a diagonal has every row
marked but no full column). GATE 2023 tests exactly this implication direction.
:::

:::viz{#viz-grid spec="order-grid-forall-exists" mode="animate" depth="standard"}
:::

### Worked examples: nested quantifiers

::::example{#ex-n-easy level="easy" title="∀x∀y on a 2×2 grid" depth="quick"}
$D = \{a, b\}$, $P(x, y)$ = "$x \neq y$". Evaluate $\forall x\,\forall y\,P(x, y)$.

:::step{why="Big AND over all 4 pairs: $P(a,a) \wedge P(a,b) \wedge P(b,a) \wedge P(b,b) = F \wedge T \wedge T \wedge F$."}
:::

:::step{why="Four pairs, one AND: the single F at (a,a) decides the whole value."}
:::

:::answer
**False** ($P(a,a)$ fails — nothing is unequal to itself).
:::
::::

::::example{#ex-n-medium level="medium" title="Reading ∀x∃y on a number line" depth="standard"}
$D = \{1, 2, 3\}$, $R(x, y)$ = "$x < y$". Evaluate $\forall x\,\exists y\,R(x, y)$ and
$\exists y\,\forall x\,R(x, y)$.

:::step{why="∀x∃y: x=1 → y=2 works; x=2 → y=3 works; x=3 → no y in D with 3<y → fails."}
So $\forall x\exists y R$ is **false** (x=3 has no larger element).
:::

:::step{why="∃y∀x: need one y larger than every x — impossible since the max is 3 and 3<3 is false."}
So $\exists y\forall x R$ is **false** too.
:::

:::answer
Both false; here the failure is the maximum element $x = 3$.
:::
::::

::::example{#ex-n-gate level="gate" title="Every teacher is liked by some student (GATE 2005)" depth="standard"}
Translate and sanity-check: "Every teacher is liked by some student."

:::step{why="∀x(teacher(x) → ∃y(student(y) ∧ likes(y,x))) — note the argument order of likes: the STUDENT likes the TEACHER, so likes(y, x) with y the student."}
The ∃y is inside the ∀x scope, so each teacher may be liked by a different student.
:::

:::step{why="Wrong options put student ∧ likes (claiming every object is a student) or student → likes (vacuous at non-students)."}
:::

:::answer
$\forall x\,(teacher(x) \to \exists y\,(student(y) \wedge likes(y, x)))$.
:::
::::

::::example{#ex-n-edge level="gate" title="Edge case: 'no one can fool everyone all the time' (GATE 2010)" depth="standard"}
$F(x, y, t)$ = "$x$ can fool $y$ at time $t$". What does $\forall x\,\exists y\,\exists t\,\neg F(x, y, t)$
say in English?

:::step{why="For every person x, there exist a person y and a time t such that x cannot fool y at t."}
I.e. everyone has someone they cannot fool at some time — "no one can fool everyone all the time".
:::

:::step{why="Equivalently $\neg\exists x\,\forall y\,\forall t\,F(x,y,t)$: there is no x that fools everyone always."}
:::

:::answer
"No one can fool everyone all the time." (Equivalent form: $\neg\exists x\forall y\forall t\,F(x,y,t)$.)
:::
::::

:::trick{#trick-grid-reading title="Read nested quantifiers on the grid" depth="quick"}
For a binary predicate, draw the x×y grid and put a mark where P(x,y) holds. Then
$\forall x\exists y$ reads "every row has a mark", $\exists y\forall x$ reads "one column is full",
$\forall x\forall y$ reads "every cell marked", $\exists x\exists y$ reads "some cell marked".
Once you can picture the grid, the one-way laws and their counter-models are obvious — this is the
single most useful picture in the whole chapter.
:::

:::note{#recap-nested title="Recap" depth="quick"}
Nested quantifiers stack; same-kind quantifiers commute, mixed ones don't. On the x×y grid:
∀x∃y = every row marked, ∃y∀x = one full column; ∃y∀x ⇒ ∀x∃y, never the converse. Inside a
translation, the inner quantifier's witness may depend on the outer variable.
:::

## Exactly one, and the counting quantifiers

:::definition{#unique-def term="Uniqueness ∃!x P(x)" depth="quick"}
$\exists! x\,P(x)$ — "there exists a **unique** $x$ such that $P(x)$" — means **exactly one** element
satisfies $P$. It is the conjunction of two conditions:
$$\exists! x\,P(x) \;\equiv\; \exists x\,P(x) \;\wedge\; \forall x\,\forall y\,\big((P(x) \wedge P(y)) \to x = y\big),$$
or compactly $\exists x\,(P(x) \wedge \forall y\,(P(y) \to y = x))$, or
$\exists x\,\forall y\,(P(y) \leftrightarrow y = x)$.
:::

:::theorem{#counting-def name="At least n, at most n, exactly n" depth="standard"}
- At least $n$: $\exists x_1 \dots \exists x_n\,(P(x_1) \wedge \dots \wedge P(x_n) \wedge$ all pairwise
  $x_i \neq x_j)$ — $n$ distinct witnesses.
- At most $n$: $\forall x_1 \dots \forall x_{n+1}\,\big((P(x_1) \wedge \dots \wedge P(x_{n+1})) \to$ some
  pair $x_i = x_j\big)$ — any $n+1$ P-elements contain a repeat (pigeonhole).
- Exactly $n$ = at least $n$ ∧ at most $n$; for $n = 1$ that is $\exists!$.
:::

:::proof{#counting-proof depth="standard"}
"At most n" fails exactly when there are $n+1$ **distinct** P-elements; negating that gives the
∀-form with the pairwise-equal disjunction. The at-least form lists $n$ witnesses and demands they be
pairwise distinct. ∎
:::

:::viz{#viz-unique spec="unique-exists-unique" mode="animate" depth="standard"}
:::

### Worked examples: uniqueness and counting phrases

::::example{#ex-u-easy level="easy" title="Exactly one in a 3-element domain" depth="quick"}
$D = \{a, b, c\}$, $P = \{b\}$. Evaluate $\exists! x\,P(x)$.

:::step{why="Exists part: ∃xP(x) = T (witness b). At-most-one part: the only P-element is b, so any two P-elements are equal → ∀x∀y(P(x)∧P(y) → x=y) = T."}
:::

:::step{why="Both parts of ∃! hold: a witness exists (b) and no two P-elements differ."}
:::

:::answer
**True** — exactly one element (b) satisfies P.
:::
::::

::::example{#ex-u-medium level="medium" title="Two witnesses break uniqueness" depth="standard"}
$D = \{a, b, c\}$, $P = \{a, b\}$. Evaluate $\exists! x\,P(x)$.

:::step{why="Exists: T. At-most-one: the pair (a, b) has P(a) ∧ P(b) = T but a = b is F → the universal is F."}
:::

:::step{why="Existence holds but uniqueness fails at the pair (a, b) — the conjunction is F."}
:::

:::answer
**False** — there are two, not exactly one.
:::
::::

::::example{#ex-u-gate level="gate" title="'There are at least two cats'" depth="standard"}
Write "there are at least two cats" ($cat(x)$) in FOL.

:::step{why="Two witnesses, required to be different:"}
$\exists x\,\exists y\,(cat(x) \wedge cat(y) \wedge x \neq y)$.
:::

:::step{why="The two witnesses must be distinct, hence x ≠ y; without it the formula would allow x = y."}
:::

:::answer
$\exists x\exists y\,(cat(x) \wedge cat(y) \wedge x \neq y)$.
:::
::::

::::example{#ex-u-edge level="gate" title="Edge case: 'at most one' vs 'exactly one'" depth="standard"}
$D = \{a, b\}$, $P = \emptyset$. Evaluate $\forall x\forall y((P(x) \wedge P(y)) \to x = y)$ and $\exists! x\,P(x)$.

:::step{why="At-most-one is vacuously true (no two P-elements exist). But ∃! needs the exists part too: ∃xP(x) = F."}
:::

:::step{why="With P empty there are no two P-elements, so the universal is vacuously true, but ∃xP(x) is false."}
:::

:::answer
At-most-one = **true** (vacuously); ∃! = **false**. "At most one" allows zero; "exactly one" does not.
:::
::::

:::note{#recap-unique title="Recap" depth="quick"}
∃!x P(x) = ∃xP(x) ∧ ∀x∀y(P(x)∧P(y) → x=y): at least one AND at most one. At least n = n distinct
witnesses; at most n = any n+1 P-elements contain a pair equal. "At most one" is vacuous when P is empty.
:::

## Negation: De Morgan for quantifiers

:::theorem{#negation-laws name="Negating quantifiers" depth="standard"}
$$\neg\forall x\,P(x) \equiv \exists x\,\neg P(x), \qquad \neg\exists x\,P(x) \equiv \forall x\,\neg P(x).$$
:::

:::proof{#negation-proof depth="standard"}
"Not all x satisfy P" means there is a counterexample — some x with ¬P(x): that is the first law.
"No x satisfies P" means every x fails P: the second. Formally on a finite domain, ¬ flips the big
AND into a big OR of negations (propositional De Morgan on $n$ terms). ∎
:::

:::intuition{#negation-intuition title="¬ flips the quantifier and moves inward" depth="standard"}
Think of ¬ as a mirror: it flips ∀ to ∃ and ∃ to ∀, and then walks one step inward. To negate a whole
chain $\neg\forall x\exists y\,\varphi$, flip and push one quantifier at a time until ¬ sits only on the
innermost atoms.
:::

:::viz{#viz-neg spec="negation-push-ladder" mode="animate" depth="standard"}
:::

### Worked examples: negation

::::example{#ex-g-easy level="easy" title="Not all birds can fly" depth="quick"}
Negate $\forall x\,(bird(x) \to fly(x))$.

:::step{why="¬∀x(A→B) ≡ ∃x¬(A→B) ≡ ∃x(A ∧ ¬B)."}
$\exists x\,(bird(x) \wedge \neg fly(x))$ — "some bird cannot fly".
:::

:::step{why="¬(A→B) is exactly A∧¬B: the implication fails precisely when A holds and B fails."}
:::

:::answer
$\exists x\,(bird(x) \wedge \neg fly(x))$.
:::
::::

::::example{#ex-g-medium level="medium" title="No one is perfect, checked on a 2-element domain" depth="standard"}
Show $\neg\exists x\,P(x) \equiv \forall x\,\neg P(x)$ on $D = \{a, b\}$ with $P = \{a\}$, and again with $P = \emptyset$.

:::step{why="P = {a}: LHS: ∃xP(x) = T (witness a), so ¬∃xP(x) = F. RHS: ∀x¬P(x) = ¬P(a) ∧ ¬P(b) = F ∧ T = F."}
Both false — equal.
:::

:::step{why="P = ∅: LHS = ¬F = T; RHS = T ∧ T = T. Equal again."}
:::

:::answer
Equivalent on this domain for both extensions of P — as the law says.
:::
::::

::::example{#ex-g-gate level="gate" title="Negating a four-quantifier formula (GATE IT 2008)" depth="standard"}
Negate $[\forall x,\,\alpha \to (\exists y,\,\beta \to (\forall u,\,\exists v,\,\gamma))]$.

:::step{why="Push ¬ inward one quantifier at a time, flipping each: ¬∀x → ∃x¬; ¬∃y → ∀y¬; ¬∀u → ∃u¬; ¬∃v → ∀v¬."}
Result: $\exists x\,(\alpha \wedge \forall y\,(\beta \wedge \exists u\,(\forall v\,\neg\gamma)))$ — using ¬(A→B) ≡ A∧¬B at each implication.
:::

:::step{why="Each flip is one application of ¬∀≡∃¬ or ¬∃≡∀¬; the innermost ¬(A→B) becomes A∧¬B."}
:::

:::answer
$\exists x\,\alpha \wedge \forall y\,\beta \wedge \exists u\,\forall v\,\neg\gamma$ (brackets as in the original structure).
:::
::::

::::example{#ex-g-edge level="gate" title="Edge case: double negation and quantifiers" depth="standard"}
Simplify $\neg\neg\forall x\,P(x)$ and say which of $\neg\exists x\neg P(x)$, $\forall x\,P(x)$,
$\exists x\,P(x)$ it equals.

:::step{why="¬¬ cancels: $\neg\neg\forall x P \equiv \forall x P$. And $\neg\exists x\neg P(x) \equiv \forall x\,\neg\neg P(x) \equiv \forall x P(x)$."}
:::

:::step{why="On a 2-element domain, ∃xP and ∀xP can differ (P true at one element only), so ∃xP is not the answer."}
:::

:::answer
The first two equal $\forall x\,P(x)$; $\exists x\,P(x)$ is different (weaker on domains with ≥ 2 elements; equivalent to ∀ only on singleton domains).
:::
::::

:::note{#recap-negation title="Recap" depth="quick"}
¬∀xP ≡ ∃x¬P and ¬∃xP ≡ ∀x¬P; ¬(P→Q) ≡ P∧¬Q. Push ¬ through a chain one quantifier at a time,
flipping each, until it rests on atoms. ¬¬ cancels.
:::

## Number predicates: divides and prime in logic

:::definition{#number-predicates term="Writing number facts in FOL" depth="quick"}
- $y \mid x$ ("$y$ divides $x$") is a binary predicate; equivalently $\exists k\,(x = y \cdot k)$.
- $prime(x) \equiv (x > 1) \wedge \forall y\,((y \mid x) \to (y = 1 \vee y = x))$ — over the positive integers.
- $even(x) \equiv \exists k\,(x = 2k)$; $x < y$ is itself a binary predicate.
GATE loves these: the formula is evaluated on the positive integers unless the question says otherwise.
:::

### Worked examples: number predicates

::::example{#ex-num-easy level="easy" title="even(x) as a quantifier" depth="quick"}
Write "$x$ is even" using $\exists k$.

:::step{why="There is an integer k with x = 2k:"}
$even(x) \equiv \exists k\,(x = 2 \cdot k)$.
:::

:::step{why="Check: 6 = 2·3 gives k = 3 (true); 7 = 2k has no integer solution (false). The existential is exactly 'there is a multiplier'."}
:::

:::answer
$\exists k\,(x = 2k)$.
:::
::::

::::example{#ex-num-medium level="medium" title="Prime check by hand" depth="standard"}
Using $prime(x) \equiv (x>1) \wedge \forall y(y \mid x \to y = 1 \vee y = x)$, evaluate $prime(6)$ and $prime(7)$ over the positive integers.

:::step{why="6: y = 2 divides 6, and 2 is neither 1 nor 6 → the universal fails → prime(6) = F."}
7: divisors 1, 7 only → T.
:::

:::step{why="7: the only divisors are 1 and 7, both allowed → prime(7) = T. So the formula reads exactly 'x > 1 and its only divisors are 1 and x'."}
:::

:::answer
$prime(6) = F$, $prime(7) = T$.
:::
::::

::::example{#ex-num-gate level="gate" title="The GATE 2011 prime formula" depth="standard"}
Given $P(x) = \neg(x = 1) \wedge \forall y\,(\exists z\,(x = y \cdot z) \to (y = x) \vee (y = 1))$ over the
positive integers, what does $P(x)$ mean?

:::step{why="$\exists z\,(x = yz)$ says "y divides x". So P(x) = x ≠ 1 and every divisor y of x is 1 or x — exactly prime."}
:::

:::step{why="Verified numerically for all x ≤ 60: P(x) ⇔ x is prime."}
:::

:::answer
$P(x)$ means "$x$ is a prime number".
:::
::::

::::example{#ex-num-edge level="gate" title="Edge case: 'every prime has a larger prime' (GATE 2019)" depth="standard"}
The formula $\varphi$: $\forall x\,[(\forall z\, z|x \Rightarrow (z=x)\vee(z=1)) \Rightarrow \exists w\,(w > x) \wedge (\forall z\, z|w \Rightarrow (w=z)\vee(z=1))]$
says "every prime has a larger prime". Over which of $S_1 = \{1..100\}$, $S_2 = \mathbb{N}^+$,
$S_3 = \mathbb{Z}$ is it true?

:::step{why="Over $S_2$ (positive integers): true — Euclid: for any prime x, a prime factor of x!+1 is larger than x. Over $S_1$: false — the largest prime ≤ 100 is 97 and has no larger prime in $S_1$."}
:::

:::step{why="Over $S_3$ read literally with integer divisibility, negative divisors break the reading (e.g. $-1 \mid 2$); GATE intends the positive-divisor reading, under which $\mathbb{Z}$ behaves like $S_2$ here."}
:::

:::answer
$S_2$ and $S_3$ (key C) — the question means positive divisors.
:::
::::

:::note{#recap-numbers title="Recap" depth="quick"}
$y \mid x \equiv \exists k\, x = yk$; $prime(x) \equiv x>1 \wedge \forall y\,(y|x \to y=1 \vee y=x)$; $even(x)
\equiv \exists k\, x = 2k$. Evaluate number predicates on the positive integers unless stated.
:::

## More English patterns: unless, whenever, at least, neither–nor

:::intuition{#more-patterns-intuition title="GATE reuses five English habits" depth="standard"}
Besides "all / some / no / only", exam sentences reuse a handful of habits: **unless** ("if not"),
**whenever / if** ("→"), **at least n** (n distinct witnesses), **neither–nor** (¬A ∧ ¬B), and
**not both** (¬(A ∧ B)). Each has exactly one faithful shape; the lesson is to recognise the habit
and pick the shape.
:::

:::theorem{#more-patterns name="Five more translation habits" depth="standard"}
- "$A$ unless $B$" = "if not B then A" = $\neg B \to A$ (equivalently $A \vee B$).
- "$A$ whenever $B$" / "if $B$ then $A$" = $B \to A$.
- "At least $n$ A's" = $\exists x_1 \dots \exists x_n$ with all $A(x_i)$ and all pairwise distinct.
- "Neither A nor B" = $\neg A \wedge \neg B$; "not both A and B" = $\neg(A \wedge B)$.
- "Everyone except $a$ is $P$" = $\neg P(a) \wedge \forall x\,(x \neq a \to P(x))$ — equivalently
  $\forall x\,(P(x) \leftrightarrow x \neq a)$ ("except" is a negated biconditional).
:::

:::proof{#more-patterns-proof depth="standard"}
"A unless B" asserts A in every situation where B fails — the forbidden situation is B ∧ ¬A, so the
formula is ¬(B ∧ ¬A) ≡ ¬B → A. "Whenever B, A" forbids B ∧ ¬A as well — same shape with the roles
swapped: B → A. The counting and except forms were derived in the uniqueness section. ∎
:::

:::trap{#trap-unless title="'Unless' is not ∧" depth="quick"}
"You fail unless you study" is $\neg study \to fail$ — NOT $study \wedge fail$. The ∧ version asserts
both, the correct version only forbids "not study and pass". GATE 2002 (propositional) and the 2026
predicate questions both ride on this.
:::

### Worked examples: more patterns

::::example{#ex-m-easy level="easy" title="Unless" depth="quick"}
Translate: "The match is cancelled unless it rains." ($c$: cancelled, $r$: rains).

:::step{why="“A unless B” = ¬B → A:"}
$\neg r \to c$, equivalently $c \vee r$.
:::

:::step{why="The sentence forbids exactly one situation — no rain AND no cancellation. ¬r → c is false only there, so it matches; r ∧ c instead asserts both."}
:::

:::answer
$\neg r \to c$. (Not $r \wedge c$.)
:::
::::

::::example{#ex-m-medium level="medium" title="Whenever" depth="standard"}
Translate: "Whenever $x$ is prime, $x$ is odd or $x = 2$." ($prime(x)$, $odd(x)$).

:::step{why="“Whenever A, B” = ∀x(A → B):"}
$\forall x\,(prime(x) \to (odd(x) \vee x = 2))$.
:::

:::step{why="Check x = 2: prime, and odd ∨ (x = 2) holds via the second disjunct → T. Check x = 9: not prime → vacuously T. The formula is true on the positive integers."}
:::

:::answer
$\forall x\,(prime(x) \to (odd(x) \vee (x = 2)))$.
:::
::::

::::example{#ex-m-gate level="gate" title="At least three" depth="standard"}
Write "there are at least three distinct primes below 10" in FOL over the positive integers,
using $prime(x)$ and $lt(x, y)$ = "$x < y$".

:::step{why="Three distinct witnesses, each prime and below 10:"}
$\exists x\exists y\exists z\,(prime(x) \wedge prime(y) \wedge prime(z) \wedge lt(x, 10) \wedge lt(y, 10) \wedge lt(z, 10) \wedge x \neq y \wedge y \neq z \wedge z \neq x)$.
:::

:::step{why="Evaluate: primes below 10 are 2, 3, 5, 7 — four of them, so three distinct ones exist (e.g. 2, 3, 5) and the formula is true."}
:::

:::answer
The formula above — true, witnesses 2, 3, 5 (also 7).
:::
::::

::::example{#ex-m-edge level="gate" title="Edge case: 'except' is a negated biconditional" depth="standard"}
Translate: "Everything is a cube except $b$." ($cube(x)$).

:::step{why="Wrong: $\forall x\,(cube(x)) \wedge \neg cube(b)$ — a contradiction. Right: b is not a cube and everything else is:"}
$\neg cube(b) \wedge \forall x\,(x \neq b \to cube(x)) \equiv \forall x\,(cube(x) \leftrightarrow x \neq b)$.
:::

:::step{why="The biconditional says cube(x) holds iff x ≠ b — exactly 'b is the only non-cube'. Both directions are needed, which is why ↔ (not →) is right."}
:::

:::answer
$\forall x\,(cube(x) \leftrightarrow x \neq b)$.
:::
::::

:::note{#recap-more title="Recap" depth="quick"}
unless = ¬B→A; whenever/if = B→A; at least n = n pairwise-distinct witnesses; neither–nor = ¬A∧¬B;
not both = ¬(A∧B); except a = ∀x(P(x) ↔ x≠a). Each habit has exactly one faithful shape.
:::

:::note{#further-vacuous title="Further depth: why vacuous truth is the right convention" depth="deep"}
"All A are B" being true when there are no A's (vacuously) is not a trick — it is what makes
mathematical statements behave. Consider "every even prime greater than 2 is odd". There are no such
numbers, and we want the statement to count as true (it makes no false claim), not false. The truth
table of → is the only one for which universally quantified implications like this behave correctly:
instantiating "∀x(A→B)" at an element where A is false must give true, or the universal could be
refuted by objects the statement never talked about. Every logic textbook and every proof assistant
uses the same convention, and GATE does too.
:::

## A five-step method for every translation question

GATE translation questions (2004, 2005, 2006, 2009, 2012, 2013, 2014, 2026) all look different but
follow the same recipe. Learn the recipe and the options become mechanical to check.

**Step 1 — Find the quantifier words.** Scan the sentence for "every / all / each" (→ ∀), "some /
there exists / at least one" (→ ∃), "no / none" (→ ¬∃ or ∀¬), "not all" (→ ¬∀ or ∃¬), "only" (→
reversed →), "exactly one" (→ ∃!). Each quantifier word in the sentence becomes one quantifier in the
formula, in the same left-to-right order. If the sentence has two quantifier words ("some boys … all
the girls"), the first becomes the outer quantifier.

**Step 2 — Name the predicates and note the argument order.** Write down what each predicate means
and, for binary ones, which argument is which. In "x is taller than y", taller(x, y) has the taller
one first. In "teacher is liked by student", likes(student, teacher) — the liked one is second. This
is where most wrong options live: swapping the arguments gives a different formula.

**Step 3 — Attach the connective that the quantifier forces.** Under ∀ over a restricted set, use →;
under ∃, use ∧. More precisely: if the quantifier's variable is the SUBJECT being restricted
("all A are B", "some A is B"), the restricted predicate A(x) sits next to the connective chosen by the
quantifier. The object of the sentence ("…are B", "…taller than all girls") goes on the other side.

**Step 4 — Bracket the scopes explicitly.** Write the formula with full brackets first:
$\exists x\,(\ldots)$ around the existential part, $(\forall y)(\ldots)$ around the inner universal.
GATE's options always bracket; matching their bracket structure option by option eliminates most wrong
answers without any evaluating.

**Step 5 — Verify on a tiny world.** Pick a 2–3 element domain where the sentence is true, and one
where it is false, and evaluate the candidate formulas by hand (big AND / big OR). The right formula
matches the sentence on both worlds; the wrong pairings (∀∧, ∃→) differ on at least one of them. This is
exactly what the Quantifier Lab's evaluate tab does for you, and what the lesson check script does by
machine for all 19 PYQs of this lesson.

A worked run of the method on GATE 2004 ("Some boys in the class are taller than all the girls"):
step 1 finds "some" (outer ∃x) and "all" (inner ∀y); step 2 gives boy(x), girl(y), taller(x, y) with
the taller one first; step 3 attaches ∧ to the ∃ and → to the ∀; step 4 brackets:
$\exists x\,(boy(x) \wedge (\forall y)(girl(y) \to taller(x, y)))$; step 5 checks it on a world with one
boy taller than the only girl (true) and a world where nobody is taller (false, and the ∃→ option
wrongly says true). Option D of that question is exactly this formula.

Two habits make the method fast in an exam. First, **eliminate by bracket structure**: if the
sentence has an outer "some … all …" shape, any option whose outer quantifier is ∀ (or whose inner
quantifier is ∃ over the wrong variable) is wrong without any evaluating. Second, **kill wrong options
with a one-element world**: a wrong pairing like ∃x(A→B) usually fails or vacuously succeeds on a
single-element domain, so one quick evaluation separates it from the correct ∧ form. The scenes in this
lesson (the wrong-pairing tables, the order grid, the negation ladder) are exactly these checks played
out visually, and the Quantifier Lab lets you run them on any world you invent.

## Reading a quantified formula aloud

:::intuition{#read-aloud title="Say it back in English" depth="standard"}
The fastest sanity check for any quantified formula is to read it aloud as an English sentence:
$\forall x\exists y\,R(x,y)$ is "for every x there is a y with R(x,y)" — like "everyone has someone
they like". $\exists y\forall x\,R(x,y)$ is "there is a y that works for every x" — "someone is
liked by everyone". If the English reading does not match the intended sentence, the formula is wrong,
no matter how plausible the symbols look.
:::

When reading aloud, remember the two traps from the scenes above: ∀ over a restricted set sounds like
"all of them" but tolerates exceptions OUTSIDE the set (that is the →), and ∃ sounds like "at least
one" but must produce a concrete witness INSIDE the set (that is the ∧). "Not all" and "none" are just
negations of those two readings. With these readings in your head, every option in a GATE translation
question can be confirmed or killed in one line.

## Domains in GATE: the non-empty convention

:::note{#domain-convention title="Why GATE always assumes a non-empty domain" depth="deep"}
On an empty domain, $\forall x\,P(x)$ would be vacuously true (there is no counterexample) and
$\exists x\,P(x)$ false (there is no witness). That asymmetry is real mathematics, but it is never what
GATE means: every GATE question that quantifies assumes the universe is non-empty, which is why
$\forall x\,P(x) \Rightarrow \exists x\,P(x)$ is treated as valid (it fails only on the empty domain —
this is recorded in `_errata/dm.md` for the reference sets A pp. 28/31 and 42 and B p. 172, which
compute quantifiers over empty domains without saying so). So in this subject: **declare the domain,
keep it non-empty unless the question explicitly says otherwise, and then ∀ implies ∃**. When a question
does talk about empty domains (rare, and always says so), use the vacuous rules above instead.

The same convention explains another classic: a formula with no free variables is a sentence and has a
definite truth value in each interpretation; a formula with free variables is judged "for all values of
the free variables" when the question asks whether it is valid. Keep the two cases apart and half the
confusion in Lesson 2 disappears.
:::

## Try it: the Quantifier Lab

Open the Quantifier Lab below: pick a small domain, set the predicates $P, Q, R$ by clicking the
grid, and type a formula with `forall`/`exists` (or ∀/∃). The **evaluate** tab computes the value and
highlights the witnesses / counterexamples — try `forall x (P(x) -> Q(x))`,
`exists x (P(x) & forall y (P(y) -> y = x))` (∃!), and `forall x exists y R(x, y)` against
`exists y forall x R(x, y)`.

:::lab{#lab-quant-eval lab="quantifier-lab" tab="evaluate" depth="standard"}
:::

## GATE questions on this lesson

All nineteen previous-year questions assigned here. Try each before opening the solution.

:::pyq{id="cse-2004-cs-23" tests="translation-table,trap-wrong-pairing,nested-def" depth="standard"}
:::

:::pyq{id="it-2004-it-3" tests="negation-laws,nested-def" depth="standard"}
:::

:::pyq{id="cse-2005-cs-41" tests="translation-table,nested-def" depth="standard"}
:::

:::pyq{id="cse-2006-cs-26" tests="translation-table" depth="standard"}
:::

:::pyq{id="cse-2007-cs-22" tests="translation-table,negation-laws" depth="standard"}
:::

:::pyq{id="cse-2008-cs-30" tests="translation-table,nested-def" depth="standard"}
:::

:::pyq{id="it-2008-it-22" tests="negation-laws" depth="standard"}
:::

:::pyq{id="cse-2009-cs-23" tests="translation-table" depth="standard"}
:::

:::pyq{id="cse-2009-cs-26" tests="negation-laws" depth="standard"}
:::

:::pyq{id="cse-2010-cs-30" tests="negation-laws,nested-def" depth="standard"}
:::

:::pyq{id="cse-2011-cs-30" tests="number-predicates,nested-def" depth="standard"}
:::

:::pyq{id="cse-2012-cs-13" tests="translation-table" depth="standard"}
:::

:::pyq{id="cse-2013-cs-27" tests="translation-table,negation-laws" depth="standard"}
:::

:::pyq{id="cse-2014-1-cs-1" tests="translation-table,negation-laws" depth="standard"}
:::

:::pyq{id="cse-2014-3-cs-53" tests="translation-table" depth="standard"}
:::

:::pyq{id="cse-2019-cs-35" tests="number-predicates,nested-def" depth="standard"}
:::

:::pyq{id="cse-2023-cs-16" tests="nested-def,one-way-exists-forall" depth="standard"}
:::

:::pyq{id="cse-2025-1-cs-38" tests="unique-def,counting-def" depth="standard"}
:::

:::pyq{id="cse-2026-2-cs-1" tests="translation-table,nested-def" depth="standard"}
:::

## Practice

Our own questions in GATE formats: translation both ways, evaluation on small domains, quantifier
order, uniqueness, negation, and number predicates.

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

:::practice{id="nx-dm-02-01-q11" depth="standard"}
:::

:::practice{id="nx-dm-02-01-q12" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Predicates, quantifiers and translation on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Predicate | $P(x_1,\dots,x_n)$ becomes a proposition when every variable is filled from the (non-empty) domain $D$ |
| ∀ | big AND over $D$; false iff a counterexample exists; $\forall x A \equiv A$ if $x \notin$ free($A$) |
| ∃ | big OR over $D$; true iff a witness exists; stop at the first witness |
| Free / bound | bound = inside a quantifier's scope for that variable; a formula with no free variables is a sentence |
| all A are B | $\forall x(A \to B)$ — not $\forall x(A \wedge B)$ |
| some A are B | $\exists x(A \wedge B)$ — not $\exists x(A \to B)$ |
| no A is B | $\forall x(A \to \neg B) \equiv \neg\exists x(A \wedge B)$ |
| only A are B | $\forall x(B \to A)$; not all A are B = $\exists x(A \wedge \neg B)$; all and only = $\forall x(A \leftrightarrow B)$ |
| order | $\forall x\forall y$ and $\exists x\exists y$ commute; $\exists y\forall x \Rightarrow \forall x\exists y$, not conversely (grid: full column ⇒ every row) |
| ∃! | exactly one = ∃xP(x) ∧ ∀x∀y(P(x)∧P(y) → x=y) |
| at least / at most n | n distinct witnesses / any n+1 P-elements contain a pair equal |
| negation | $\neg\forall x P \equiv \exists x\neg P$; $\neg\exists x P \equiv \forall x\neg P$; $\neg(P\to Q) \equiv P \wedge \neg Q$ |
| number predicates | $y \mid x \equiv \exists k\, x = yk$; $prime(x) \equiv x>1 \wedge \forall y\,(y|x \to y=1 \vee y=x)$ |
:::

## Common mistakes

- Writing "all A are B" as $\forall x(A \wedge B)$ — it must be $\forall x(A \to B)$; the ∧ version fails on every non-A, because it claims every object is an A. The implication is the only connective that is true when A is false, which is exactly "non-A's don't matter".
- Writing "some A are B" as $\exists x(A \to B)$ — that is vacuously true at every non-A, so it says almost nothing. The witness must be both A and B: $\exists x(A \wedge B)$.
- Reading "only A are B" as "all A are B" — it is the other direction, $\forall x(B \to A)$: being B forces being A. ("All and only" is the biconditional.)
- Thinking $\forall x\exists y$ and $\exists y\forall x$ are equivalent — on the x×y grid, one full column implies every row is marked, not the reverse. A diagonal grid is the standard counter-model.
- Forgetting that the inner quantifier's witness may depend on the outer variable: "every student loves someone" ($\forall x\exists y$) is not "someone is loved by every student" ($\exists y\forall x$).
- Negating a chain of quantifiers by flipping only the outermost one — ¬ flips every quantifier it passes, and also rewrites the innermost connectives ($\neg(P\to Q) \equiv P \wedge \neg Q$).
- Treating $\exists!$ as "at most one" — it also requires existence; on a domain where P is empty, "at most one P" is true but $\exists!x P(x)$ is false.
- Evaluating a number predicate over the wrong domain — e.g. letting negative divisors count when the question means positive integers, which breaks the prime formula at x = 2.
- Mixing up the argument order of a relation: in "every teacher is liked by some student" the likes predicate is $likes(student, teacher)$, so it appears as $likes(y, x)$ inside — swapping it changes the meaning completely.
