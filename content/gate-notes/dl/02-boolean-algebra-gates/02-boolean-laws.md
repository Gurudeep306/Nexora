---
id: boolean-laws
subject: dl
chapter: boolean-algebra-gates
title: "Boolean algebra: postulates, laws and theorems"
order: 2
prerequisites: [logic-gates]
pyq_topics: [dl/boolean]
est_minutes: 60
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every identity, example and answer is checked by truth table in content/gate-notes/_checks/dl/l2_02_boolean_laws.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 33–35, set B pp. 104–106, set C pp. 189–192, 238–240 and 246, set D p. 400. A consensus typo in set D and unsimplified results in set C are recorded in _errata/dl.md."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (Boolean algebra, basic theorems); E. V. Huntington, Sets of independent postulates for the algebra of logic (1904)."
  - "PYQs: src/gate/questions.json (dl/boolean); all twelve keys are re-derived by truth-table enumeration in l2_02_boolean_laws.py."
updated: "2026-10-17"
---

The gates of the last lesson obey rules, and those rules let you rewrite one circuit as another,
usually smaller, circuit that computes the same thing. This lesson turns the rules into an algebra.
You will see the handful of postulates everything rests on, prove the famous laws from them
(absorption, De Morgan, consensus), learn the duality principle that gives you every law twice for
the price of once, split any function in two with Shannon's expansion, and solve systems of Boolean
equations. Twelve GATE questions test exactly these skills.

## Where this fits

[Lesson 1](lesson:logic-gates) gave you the gates and their truth tables. Here the same objects
become symbols you can manipulate: $+$ for OR, juxtaposition (or $\cdot$) for AND, a prime for NOT.
Lesson 3 adds XOR's own algebra, Lesson 4 the canonical forms that make every function a list of
rows, and Chapter 3 turns simplification into a mechanical procedure (K-maps). Everything there
assumes the laws of this lesson.

:::table{#radar title="GATE radar: Boolean laws" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 12 (1994–2026), one of the most frequent topics of the chapter |
| Marks | 5 one-mark, 5 two-mark, 2 descriptive |
| Formats | 8 MCQ, 2 MSQ, 2 descriptive (old papers) |
| Pattern 1 | Simplify an expression to one of four options: 2004, 2008 |
| Pattern 2 | Which identity is NOT valid / which are CORRECT: 2017, 2019, 2024, 2025, 2026 |
| Pattern 3 | Solve simultaneous Boolean equations: 1994, 1995, 2000 |
| Pattern 4 | Shannon expansion (2006) and consensus with a single complement (2002) |
| What examiners test | Absorption and the redundant-literal rule, De Morgan applied to a whole expression, consensus, and the habit of disproving with one counterexample |
:::

## The idea: an algebra of switches, not of numbers

:::intuition{#switch-algebra title="Why x + x = x is not a mistake" depth="standard"}
In school algebra $x + x = 2x$. In Boolean algebra $x + x = x$. Nothing is wrong: the symbols mean
different things. Here $+$ means "at least one of these switches is closed". Two copies of the same
switch in parallel are no better than one, so $x + x = x$. Likewise $1 + y = 1$: a wire that is
always closed, in parallel with anything, is always closed.

Some school rules survive (order does not matter, $xy = yx$; brackets can move,
$(x + y) + z = x + (y + z)$). Some change: AND distributes over OR as usual, $x(y + z) = xy + xz$,
but **OR also distributes over AND**, $x + yz = (x + y)(x + z)$, which is false for numbers. And
some school habits are simply illegal: there is no subtraction and no division, so you can never
"cancel" a term from both sides. Learning Boolean algebra is mostly learning which school reflexes to
keep and which to switch off.
:::

## The postulates and the duality principle

:::intuition{#duality-intuition title="Every rule has a mirror image" depth="standard"}
Look at the switch pictures again. "Switches in parallel with one stuck closed: the lamp is on" and
"switches in series with one stuck open: the lamp is off" are the same fact seen in a mirror that
swaps series with parallel and closed with open. Boolean algebra has that mirror built in: swap AND
with OR and 0 with 1 in any true law and you get another true law. Half of every list of laws is
therefore free, and when you forget a law you can often recover it from its twin.
:::

An algebra is a set of values with operations and a short list of axioms (postulates) from which
everything else is proved. For Boolean algebra the standard list is due to Huntington.

:::definition{#huntington term="Huntington's postulates for Boolean algebra" depth="quick"}
A set $B$ with two binary operations $+$ (OR) and $\cdot$ (AND) is a Boolean algebra when:

1. **Closure.** $x + y$ and $x \cdot y$ are in $B$ for all $x, y$ in $B$.
2. **Identities.** There are elements 0 and 1 with $x + 0 = x$ and $x \cdot 1 = x$.
3. **Commutativity.** $x + y = y + x$ and $x \cdot y = y \cdot x$.
4. **Distributivity, both ways.** $x \cdot (y + z) = xy + xz$ and $x + yz = (x + y)(x + z)$.
5. **Complements.** For every $x$ there is an $x'$ with $x + x' = 1$ and $x \cdot x' = 0$.
6. **Non-triviality.** There are at least two distinct elements ($0 \ne 1$).

With $B = \{0, 1\}$ and the gate tables of Lesson 1, every postulate holds (check each on the two
or four rows). That two-valued algebra is **switching algebra**, the one circuits use.
:::

Two remarks before using them. First, associativity, $(x + y) + z = x + (y + z)$, is *not* on the
list: it can be proved from the six postulates (the proof is long and not examined; for the
two-valued algebra a truth table settles it at once). Second, look at the list as pairs: every
postulate with $+$ has a twin with $\cdot$, obtained by swapping $+$ with $\cdot$ and 0 with 1. That
symmetry is the most useful fact in the subject.

:::definition{#dual-def term="The dual of an expression or a statement" depth="quick"}
The **dual** of a Boolean expression is obtained by swapping $+$ with $\cdot$ and 0 with 1
everywhere, **leaving every variable and every prime as it is**. The dual of an equation is the
equation between the duals.

- Dual of $x + 0 = x$ is $x \cdot 1 = x$.
- Dual of $xy + x'z$ is $(x + y)(x' + z)$ (keep the brackets that preserve the grouping).
- Dual of $x' + y'$ is $x' y'$.

**Functional form.** If $E$ is any expression of $f$, its dual $E^D$ computes
$f^D(x) = \big(f(x')\big)'$, whichever expression you started from. Proof: complement $f(x')$ with the
general De Morgan rule (below): it swaps every operator and every constant *and* complements every
literal. Each literal of $f(x')$ was already complemented once, so the second complement returns it to
its original form, and what is left is exactly $E$ with the operators and constants swapped, $E^D$.
(Lesson 1 used this for negative logic; Lesson 4 uses it for self-dual functions.)
:::

:::theorem{#duality name="Duality principle" depth="standard"}
If an identity can be proved from the postulates, its dual is also an identity.
:::

:::proof{#proof-duality of="the duality principle" depth="standard"}
**Idea first:** a proof is a chain of steps, each justified by a postulate; dualise every step.

Each of the six postulates is either self-dual (closure, non-triviality) or comes paired with its
dual (identities, commutativity, distributivity, complements). Take any proof of an identity and
replace every expression in it by its dual. Each step that used a postulate now uses that
postulate's dual, which is also a postulate, so every step is still valid. The last line of the new
chain is the dual identity. Hence one proof gives two theorems.
:::

:::trap{#trap-dual-complement title="The dual is not the complement" depth="quick"}
The dual of $x' + y'$ is $x' y'$; its **complement** is $(x' + y')' = xy$. Taking the dual swaps the
operators but leaves the literals alone; taking the complement swaps the operators *and* primes every
literal (De Morgan, below). A dual is a new identity-generator; it is generally a *different
function*. Examiners like to offer the dual as an option when they ask for the complement.
:::

:::note{#recap-postulates title="Recap" depth="quick"}
Six postulates: closure, identities 0 and 1, commutativity, both distributive laws, complements,
$0 \ne 1$. Swapping $+ \leftrightarrow \cdot$ and $0 \leftrightarrow 1$ turns every law into its dual
law. Dual ≠ complement.
:::

## The basic theorems

Here are the laws you will use every day, each with its dual. All of them follow from the
postulates; the most important proofs are given below, and the animation proves three of them by
truth table.

:::table{#laws-table title="The laws of Boolean algebra (each row: a law and its dual)" depth="quick"}
| Law | Form | Dual form |
|:--|:--|:--|
| Identity | $x + 0 = x$ | $x \cdot 1 = x$ |
| Null (dominance) | $x + 1 = 1$ | $x \cdot 0 = 0$ |
| Idempotence | $x + x = x$ | $x \cdot x = x$ |
| Complement | $x + x' = 1$ | $x \cdot x' = 0$ |
| Involution | $(x')' = x$ | (self-dual) |
| Commutative | $x + y = y + x$ | $xy = yx$ |
| Associative | $x + (y + z) = (x + y) + z$ | $x(yz) = (xy)z$ |
| Distributive | $x(y + z) = xy + xz$ | $x + yz = (x + y)(x + z)$ |
| Absorption | $x + xy = x$ | $x(x + y) = x$ |
| Redundant literal | $x + x'y = x + y$ | $x(x' + y) = xy$ |
| De Morgan | $(x + y)' = x'y'$ | $(xy)' = x' + y'$ |
| Consensus | $xy + x'z + yz = xy + x'z$ | $(x + y)(x' + z)(y + z) = (x + y)(x' + z)$ |
:::

Notice what is **not** in the table: $x \cdot x' = 1$, $x + 1 = x$, $x \cdot x = 0$. Those are the
false "laws" GATE offers as distractors (2024 and 2026). Each one fails on a single row.

:::derivation{#proof-idempotence of="idempotence from the postulates" depth="standard"}
$$
x = x + 0 = x + x x' = (x + x)(x + x') = (x + x) \cdot 1 = x + x .
$$
Each step uses one postulate: identity, complement, distributivity (OR over AND), complement,
identity. The dual chain proves $x \cdot x = x$.

**Sanity check.** $0 + 0 = 0$ and $1 + 1 = 1$ in the OR table.
:::

:::derivation{#null-law of="the null law x + 1 = 1" depth="standard"}
$$
x + 1 = (x + 1) \cdot 1 = (x + 1)(x + x') = x + 1 \cdot x' = x + x' = 1 .
$$
(Identity, complement, distributivity in reverse, commutativity and identity, complement.) The dual gives $x \cdot 0 = 0$.
:::

:::derivation{#absorption of="absorption: x + xy = x and x(x + y) = x" depth="quick"}
$$
x + xy = x \cdot 1 + x y = x (1 + y) = x \cdot 1 = x .
$$
The null law did the work: $1 + y = 1$. The dual, $x(x + y) = x$, follows by duality (or: expand,
$xx + xy = x + xy = x$).

**What it means.** A product term that *contains* another term of a sum is swallowed by it: in
$A + AB + ABC$ both longer terms vanish. In a product of sums, a factor that contains another factor
vanishes: $(P + Q)(P + Q + R) = P + Q$.
:::

:::derivation{#redundant-literal of="the redundant-literal rule: x + x′y = x + y" depth="quick"}
Use the distributive law of OR over AND:
$$
x + x'y = (x + x')(x + y) = 1 \cdot (x + y) = x + y .
$$
The dual is $x(x' + y) = xy$.

**What it means.** Inside a term, a literal whose *complement* appears alone in the sum can be
deleted: in $A' + AB$ the $A$ inside $AB$ is redundant, giving $A' + B$.

**Sanity check.** At $x = 0$ both sides are $y$; at $x = 1$ both sides are 1.
:::

:::theorem{#unique-complement name="The complement is unique, and (x′)′ = x" depth="standard"}
If $x + a = 1$, $xa = 0$, $x + b = 1$ and $xb = 0$, then $a = b$. Consequently $(x')' = x$
(involution).
:::

:::proof{#proof-unique-complement of="the uniqueness of the complement" depth="deep"}
**Idea first:** squeeze both candidates to the same product $ab$.

$a = a \cdot 1 = a(x + b) = ax + ab = 0 + ab = ab$, and in the same way
$b = b(x + a) = bx + ba = ab$. So $a = b$.

For involution, $x' + x = 1$ and $x' x = 0$ say that $x$ is *a* complement of $x'$. The complement of
$x'$ is unique, and $(x')'$ is one, so $(x')' = x$. This uniqueness is also the engine of the De Morgan
proof below: to show that something is the complement of $E$, it is enough to show that it ORs with
$E$ to 1 and ANDs with $E$ to 0.
:::

:::definition{#perfect-induction term="Proof by perfect induction (truth table)" depth="quick"}
An identity in $n$ variables is true exactly when both sides agree on all $2^n$ rows. Checking every
row is a complete, rigorous proof (called **perfect induction**), because a Boolean variable has no
other values. For two or three variables this is often the fastest proof of all.
:::

:::viz{#laws-viz spec="law-cards" mode="animate" depth="standard"}
:::

:::trick{#trick-absorb-scan title="Scan for absorption before expanding" depth="standard"}
Before multiplying anything out, scan the expression for two patterns: a term that contains another
whole term (absorb it: $x + xy = x$), and a literal whose complement stands alone (delete it:
$x + x'y = x + y$). They often finish the problem without any expansion.

**Why it works:** both are laws, so they never change the function. **When it fails:** the patterns
must be at the same level of a plain sum (or product). Under a bar, $(x + xy)'$ is still fine to
simplify inside, but a pattern split across an XOR, $x \oplus xy$, is not absorption:
$x \oplus xy = xy'$, not $x$.
:::

:::note{#recap-laws title="Recap" depth="quick"}
Identity, null, idempotence, complement, involution, commutative, associative, both distributive
laws, absorption ($x + xy = x$), redundant literal ($x + x'y = x + y$). Every law has a dual. A
truth table is a valid proof.
:::

## Simplifying expressions

:::definition{#simplify-method term="Method: simplifying a Boolean expression" depth="quick"}
1. **Remove bars** over sums and products with De Morgan (below), so that only single literals are
   primed.
2. **Absorb** terms that contain other terms; **delete redundant literals** ($x + x'y = x + y$).
3. **Factor** common literals ($xy + xz = x(y + z)$), then look again for $y + y' = 1$.
4. **Use consensus** (below) to drop, or occasionally add, a term.
5. **Stop** when no step shortens the expression, and **check** one or two rows against the original.

A minimal form need not be unique (Chapter 3), so options in GATE are compared by checking rows, not
by matching letters.
:::

### Worked examples: simplifying with the laws

::::example{#ex-simp-absorb level="easy" title="Absorption in a sum" depth="quick"}
Simplify $A + AB + ABC'$.

:::step{why="AB contains the term A, so x + xy = x swallows it."}
$A + AB = A$.
:::

:::step{why="ABC′ also contains A, so the same law swallows it."}
$A + ABC' = A$.
:::

:::answer
$A$.
:::
::::

::::example{#ex-simp-three level="medium" title="Three terms over two variables" depth="standard"}
Simplify $x'y' + xy + x'y$.

:::step{why="Two terms share x′; factor it out to expose y′ + y."}
$x'y' + x'y = x'(y' + y) = x' \cdot 1 = x'$.
:::

:::step{why="What remains is x′ + xy, the redundant-literal pattern: x′ stands alone, so the x inside xy is redundant."}
$x' + xy = x' + y$.
:::

:::step{why="Check a row where the answer could fail: x = 1, y = 0 gives 0 in the original (no term is 1) and 0 + 0 = 0 in the answer."}
Check: $(x, y) = (1, 0)$ gives $0$ on both sides; $(1, 1)$ gives $1$ on both sides.
:::

:::answer
$x' + y$.
:::
::::

::::example{#ex-simp-product level="gate" title="A product of three factors" depth="standard"}
Simplify $(P + Q')(PQ' + PR)(PR' + Q')$.

:::step{why="The middle factor has P in both terms; factoring P out makes the absorption visible."}
$PQ' + PR = P(Q' + R)$.
:::

:::step{why="(P + Q′) · P = P by absorption, so the first factor disappears."}
$(P + Q') \cdot P(Q' + R) = P(Q' + R)$.
:::

:::step{why="Now multiply (Q′ + R)(Q′ + PR′): by the distributive law x + yz = (x + y)(x + z) read backwards, this is Q′ + R·PR′."}
$(Q' + R)(Q' + PR') = Q' + R \cdot P R' = Q' + 0 = Q'$.
:::

:::step{why="Put the surviving factors together and check a row."}
So the expression is $P \cdot Q' = PQ'$. Check $P = 1, Q = 0, R = 0$: $(1)(1)(1) = 1$, and $PQ' = 1$.
:::

:::answer
$PQ'$.
:::
::::

::::example{#ex-simp-one level="gate" title="Edge case: an expression that is always 1" depth="standard"}
Simplify $x + x'y + x'y'$.

:::step{why="The last two terms share x′."}
$x'y + x'y' = x'(y + y') = x'$.
:::

:::step{why="x + x′ is the complement law."}
$x + x' = 1$.
:::

:::answer
$1$: the expression is a tautology. (Every row makes one of the three terms 1.)
:::
::::

::::check{#check-simp title="Your turn" depth="standard"}
Simplify $AB + AB' + A'B$.

:::answer
$AB + AB' = A$, then $A + A'B = A + B$ (redundant literal). Answer $A + B$.
:::
::::

## De Morgan's laws and complementing expressions

:::intuition{#demorgan-intuition title="Not (rain or snow) means no rain and no snow" depth="standard"}
"It is not true that it will rain or snow" means "no rain, and no snow": denying an OR denies every
part of it. "It is not true that both the doors are locked" means "at least one door is unlocked":
denying an AND only needs one part to fail. That is De Morgan's law in words. A NOT pushed inside a
bracket flips every literal it meets and swaps OR with AND on the way in.
:::

:::theorem{#demorgan name="De Morgan's laws" depth="standard"}
$$
(x + y)' = x' y', \qquad (xy)' = x' + y' .
$$
In words: the complement of an OR is the AND of the complements, and vice versa. With more terms,
$(x_1 + x_2 + \dots + x_n)' = x_1' x_2' \cdots x_n'$ and $(x_1 x_2 \cdots x_n)' = x_1' + \dots + x_n'$.
:::

:::proof{#proof-demorgan of="De Morgan's laws" depth="standard"}
**Idea first:** by the uniqueness of the complement, it is enough to show that $x'y'$ ORs with
$x + y$ to 1 and ANDs with it to 0.

OR: $(x + y) + x'y' = (x + y + x')(x + y + y')$ (OR distributes over AND) $= (1 + y)(x + 1) = 1$.

AND: $(x + y) \cdot x'y' = x x' y' + y x' y' = 0 + 0 = 0$.

So $x'y'$ is *the* complement of $x + y$. The second law is the dual of the first. The $n$-term form
follows by applying the two-term law repeatedly (associativity groups the terms two at a time).
:::

The two-variable law is easy to remember. The real skill GATE tests is complementing a *whole
expression*, which is De Morgan applied at every level at once.

:::definition{#demorgan-general term="The complement of any expression" depth="quick"}
To complement an expression written with $+$, $\cdot$ and primes on literals:

1. swap every $+$ with $\cdot$ (keeping the grouping, so add brackets where needed), and
2. complement every literal ($x \to x'$, $x' \to x$), and every constant ($0 \leftrightarrow 1$).

Equivalently: **the complement is the dual with every literal complemented.** Example:
$\big((A + B'C)(A' + D)\big)' = A'(B + C') + AD'$.
:::

:::viz{#complement-viz spec="complement-tree" mode="animate" depth="standard"}
:::

Why does the rule work? Apply De Morgan at the root: the complement of a product is the sum of the
complements of its factors. Each factor is itself a sum, so its complement is a product of
complements, and so on down to the leaves, where the complement is just a primed or unprimed
literal. Every operator is swapped exactly once and every literal is complemented exactly once.

### Worked examples: De Morgan and complements

::::example{#ex-dm-basic level="easy" title="Complement of a sum of products" depth="quick"}
Find $(AB + C)'$.

:::step{why="The outermost operator is +, so De Morgan turns it into a product of complements."}
$(AB + C)' = (AB)' \cdot C'$.
:::

:::step{why="The inner product is complemented by the other De Morgan law."}
$(AB)' = A' + B'$, so the result is $(A' + B')C'$.
:::

:::answer
$(A' + B')C' = A'C' + B'C'$.
:::
::::

::::example{#ex-dm-tree level="medium" title="Complementing a product of sums" depth="standard"}
Find the complement of $f = (A + B'C)(A' + D)$.

:::step{why="Swap every operator: the outer AND becomes OR, each OR becomes AND, the inner AND becomes OR."}
Shape after swapping: $(A \cdot (B' + C)) + (A' \cdot D)$ with the literals not yet touched.
:::

:::step{why="Now complement every literal."}
$A \to A'$, $B' \to B$, $C \to C'$, $A' \to A$, $D \to D'$: $f' = A'(B + C') + AD'$.
:::

:::step{why="Check one row: at A = 1, D = 0 the original is (1)(0 + 0) = 0, so f′ must be 1."}
At $A = 1, D = 0$: $f' = 0 + 1 \cdot 1 = 1$. Correct.
:::

:::answer
$f' = A'(B + C') + AD'$.
:::
::::

::::example{#ex-dm-pos level="gate" title="The complement of a product of sums, as a sum of products" depth="standard"}
Let $F = (X + Y + Z)(X' + Y)(Y' + Z)$. Write $F'$ as a sum of products.

:::step{why="The complement of a product of factors is the sum of the complements of the factors (De Morgan at the root)."}
$F' = (X + Y + Z)' + (X' + Y)' + (Y' + Z)'$.
:::

:::step{why="Each factor is a sum, so its complement is a product of complemented literals."}
$F' = X'Y'Z' + XY' + YZ'$.
:::

:::step{why="Cross-check with rows: F is 1 only where all three factors are 1."}
$F = 1$ needs $X + Y + Z = 1$, $X \Rightarrow Y$ and $Y \Rightarrow Z$: rows 001, 011, 111. So $F'$ is 1 on the other five rows, 000, 010, 100, 101, 110, and $X'Y'Z' + XY' + YZ'$ is 1 on exactly those.
:::

:::answer
$F' = X'Y'Z' + XY' + YZ'$ (other equal forms exist, for example $XY' + Y'Z' + YZ'$; compare forms by
rows). Simplest: $F = Z(X' + Y)$, so $F' = Z' + XY'$.
:::
::::

::::example{#ex-dm-dual level="gate" title="Edge case: dual versus complement" depth="standard"}
For $f = x' + y'$, find the dual and the complement, and say whether $f$ equals its dual.

:::step{why="The dual swaps + and · and leaves the literals alone."}
$f^D = x' y'$.
:::

:::step{why="The complement also complements every literal."}
$f' = x y$.
:::

:::step{why="Compare on a row: at x = 1, y = 0, f = 0 + 1 = 1 but the dual x′y′ = 0."}
$f \ne f^D$: they differ on row $(1, 0)$.
:::

:::answer
Dual $x'y'$, complement $xy$; three different functions ($f$ is NAND, its dual NOR, its complement AND).
:::
::::

:::note{#recap-demorgan title="Recap" depth="quick"}
$(x + y)' = x'y'$ and $(xy)' = x' + y'$. To complement any expression, swap every operator and
complement every literal; the complement is the dual with complemented literals.
:::

## The consensus theorem

:::intuition{#consensus-intuition title="A rule that is already covered by two other rules" depth="standard"}
A shop rule says: members (x) who brought a coupon (y) get a discount; non-members (x′) who spend over
a limit (z) also get one. Someone suggests a third rule: anyone with a coupon who spends over the
limit (yz) gets a discount. It adds nothing. Such a customer is either a member (and has a coupon, so
rule 1 applies) or a non-member (and spent over the limit, so rule 2 applies). Whatever x is, one of
the two old rules already covers them. That redundant third rule is the consensus term.
:::

:::theorem{#consensus name="Consensus theorem" depth="standard"}
$$
xy + x'z + yz = xy + x'z .
$$
The term $yz$, called the **consensus** of $xy$ and $x'z$, is redundant. It is found by taking two
terms that contain a variable in opposite forms ($x$ and $x'$), deleting that variable, and ANDing what
is left ($y$ and $z$).
:::

:::proof{#proof-consensus of="the consensus theorem" depth="standard"}
**Idea first:** split the consensus term on the variable that was deleted; each half is absorbed.

$$
\begin{aligned}
xy + x'z + yz &= xy + x'z + yz(x + x') \\
&= xy + x'z + xyz + x'yz \\
&= xy(1 + z) + x'z(1 + y) = xy + x'z .
\end{aligned}
$$
The half $xyz$ is absorbed by $xy$, and the half $x'yz$ by $x'z$.
:::

:::viz{#consensus-viz spec="consensus-cells" mode="animate" depth="standard"}
:::

:::definition{#consensus-dual term="The dual form of consensus" depth="quick"}
$$
(x + y)(x' + z)(y + z) = (x + y)(x' + z) .
$$
In a product of sums, the factor $(y + z)$ is redundant when there are factors $(x + y)$ and $(x' + z)$.
:::

Consensus can also be used **backwards**: adding the consensus term never changes the function, and
sometimes the bigger expression factors neatly. That is the trick behind a 2002 GATE question.

:::definition{#consensus-add term="Adding a consensus term to factor an expression" depth="standard"}
If $E = xy' + yz'$, the two terms contain $y'$ and $y$, so their consensus is $xz'$, and
$E = xy' + yz' + xz'$. This larger sum factors:
$$
xy' + xz' + yz' = (x + y)(y' + z'),
$$
which you can confirm by expanding the right side ($yy' = 0$ drops out). With De Morgan,
$y' + z' = (yz)'$, so $E = (x + y)(yz)'$: a form that needs a **single** NOT gate.
:::

:::trap{#trap-consensus-two title="Consensus needs exactly one opposed variable" depth="quick"}
The terms $xy$ and $x'y'$ disagree in **two** variables; their "consensus" would be $yy' = 0$, which is
nothing. So $xy + x'y' + (\text{some term})$ is not a consensus pattern, and no term may be dropped on
the strength of it. The expected wrong answer: deleting a term because it "is the consensus" of two
terms that differ in two places.
:::

:::trap{#trap-consensus-fake title="A term that only looks like a consensus term" depth="quick"}
In $AB + A'C + BC'$ the last term is $BC'$, not $BC$. The consensus of $AB$ and $A'C$ is $BC$; the term
$BC'$ has no such relation and is **not** redundant (row $A = 0, B = 1, C = 0$ is covered only by
$BC'$). Always form the consensus explicitly and compare literal by literal.
:::

### Worked examples: consensus

::::example{#ex-cons-basic level="easy" title="Drop the consensus term" depth="quick"}
Simplify $AB + A'C + BC$.

:::step{why="AB and A′C contain A and A′; deleting A and ANDing the rest gives BC."}
The consensus of $AB$ and $A'C$ is $BC$.
:::

:::step{why="The consensus theorem says that term is redundant."}
$AB + A'C + BC = AB + A'C$.
:::

:::answer
$AB + A'C$.
:::
::::

::::example{#ex-cons-pos level="medium" title="Consensus in a product of sums" depth="standard"}
Simplify $(A + B)(A' + C)(B + C)$.

:::step{why="The factors (A + B) and (A′ + C) contain A and A′; their consensus factor is (B + C)."}
This is the dual form of consensus with $x = A$, $y = B$, $z = C$.
:::

:::step{why="The dual theorem deletes the consensus factor."}
$(A + B)(A' + C)(B + C) = (A + B)(A' + C)$.
:::

:::step{why="Expanding gives an equivalent SOP; AA′ = 0 and BC is the consensus of AC and A′B."}
$(A + B)(A' + C) = AC + A'B + BC = AC + A'B$.
:::

:::answer
$(A + B)(A' + C) = AC + A'B$.
:::
::::

::::example{#ex-cons-add level="gate" title="A single complement for xy′ + x′z" depth="standard"}
Express $f = xy' + x'z$ using a single complement operation together with AND and OR.

:::step{why="The terms contain x and x′, so their consensus y′z can be added without changing f."}
$f = xy' + x'z + y'z$.
:::

:::step{why="Try to factor into two sums. (x + z)(x′ + y′) expands to xx′ + xy′ + x′z + y′z = xy′ + x′z + y′z, exactly the three terms."}
$f = (x + z)(x' + y')$.
:::

:::step{why="De Morgan turns the sum of two complemented literals into one complement."}
$x' + y' = (xy)'$, so $f = (x + z)(xy)'$.
:::

:::answer
$f = (x + z)(xy)'$, one NOT applied to $xy$. (Check: at $x = y = 1$ both sides are 0; at $x = 0, z = 1$ both are 1.)
:::
::::

::::example{#ex-cons-fake level="gate" title="Edge case: a lookalike that is not redundant" depth="standard"}
Is the term $BC'$ redundant in $AB + A'C + BC'$?

:::step{why="The only pair with a complemented variable is AB, A′C; its consensus is BC, not BC′."}
Consensus does not apply to $BC'$.
:::

:::step{why="Look for a row that only BC′ covers: B = 1, C = 0, and A = 0 so that AB = 0 (and A′C = 0 because C = 0)."}
At $A = 0, B = 1, C = 0$: $AB = 0$, $A'C = 0$, $BC' = 1$.
:::

:::answer
Not redundant: removing it changes the function on row 010.
:::
::::

:::note{#recap-consensus title="Recap" depth="quick"}
The consensus of $xy$ and $x'z$ is $yz$, and $xy + x'z + yz = xy + x'z$ (dual:
$(x + y)(x' + z)(y + z) = (x + y)(x' + z)$). It can be dropped, or added to make factoring possible.
:::

## Shannon expansion

:::intuition{#shannon-intuition title="Ask one question, then deal with the two cases" depth="standard"}
A complicated rule often becomes simple once one fact is known. "Is the customer a member?" If yes,
the rule is one thing; if no, it is another. Shannon's expansion does exactly this to a Boolean
function: pick one variable, write down what the function becomes when that variable is 0 and when it
is 1, and glue the two answers together with the variable as the selector. Repeating it on every
variable gives a decision tree, which is how a multiplexer computes any function.
:::

Any function can be split on one of its variables into "what it does when the variable is 0" and
"what it does when it is 1". This is the most general simplification tool there is, and it is also
the idea behind multiplexers (Chapter 4).

:::definition{#cofactor-def term="Cofactors" depth="quick"}
For $f(x_1, x_2, \dots, x_n)$, the **cofactors** with respect to $x_1$ are
$$
f_{x_1'} = f(0, x_2, \dots, x_n), \qquad f_{x_1} = f(1, x_2, \dots, x_n) :
$$
$f$ with $x_1$ fixed to 0 and to 1. Each is a function of the remaining $n - 1$ variables. In this
lesson we also write them $f|_{x_1=0}$ and $f|_{x_1=1}$; the three notations mean the same thing. For
$f = AB + A'C$: $f(0, B, C) = C$ and $f(1, B, C) = B$.
:::

:::theorem{#shannon name="Shannon's expansion theorem" depth="standard"}
For every Boolean function and every variable $x_i$,
$$
f = x_i' \cdot f(\dots, x_i = 0, \dots) + x_i \cdot f(\dots, x_i = 1, \dots) .
$$
:::

:::proof{#proof-shannon of="Shannon's expansion" depth="standard"}
**Idea first:** $x_i$ has only two values; check both (perfect induction on one variable).

If $x_i = 0$: the right side is $1 \cdot f(\dots 0 \dots) + 0 \cdot f(\dots 1 \dots) = f(\dots 0 \dots)$,
which is $f$ at this input. If $x_i = 1$: the right side is $0 + 1 \cdot f(\dots 1 \dots)$, again $f$.
The two sides agree for every input, so they are equal.
:::

:::definition{#shannon-pos term="The product (POS) form of Shannon's expansion" depth="quick"}
The dual of the theorem is also true:
$$
f = \big(x_i + f(\dots, x_i = 0, \dots)\big)\big(x_i' + f(\dots, x_i = 1, \dots)\big) .
$$
At $x_i = 0$ the second factor is 1 and the first is the 0-cofactor; at $x_i = 1$ it is the other way
round.
:::

:::viz{#shannon-viz spec="shannon-tree" mode="animate" depth="standard"}
:::

:::trap{#trap-shannon-literals title="Dropping the literals from the expansion" depth="quick"}
$f(0, x_2, \dots) + f(1, x_2, \dots)$ (the cofactors without their selecting literals) is **not** $f$.
It is 1 whenever *some* value of $x_1$ makes $f$ true; it equals $f$ only when $f$ does not depend on
$x_1$. For $f = AB$: $f(0, B) + f(1, B) = 0 + B = B \ne AB$. Never drop $x_i'$ and $x_i$.
:::

### Worked examples: Shannon expansion

::::example{#ex-sh-a level="easy" title="Expand on A" depth="quick"}
Expand $f = AB + A'C$ about $A$.

:::step{why="Fix A = 0: AB becomes 0 and A′C becomes C."}
$f(0, B, C) = C$.
:::

:::step{why="Fix A = 1: A′C becomes 0 and AB becomes B."}
$f(1, B, C) = B$.
:::

:::answer
$f = A' \cdot C + A \cdot B$ (which is how $f$ was written: it was already in Shannon form).
:::
::::

::::example{#ex-sh-b level="medium" title="Expand the same function on B" depth="standard"}
Expand $f = AB + A'C$ about $B$.

:::step{why="B = 0 kills AB."}
$f(A, 0, C) = A'C$.
:::

:::step{why="B = 1 turns AB into A; then A + A′C = A + C by the redundant-literal rule."}
$f(A, 1, C) = A + A'C = A + C$.
:::

:::step{why="Reassemble with the selecting literals B′ and B."}
$f = B'(A'C) + B(A + C)$.
:::

:::answer
$f = A'B'C + AB + BC$ after expanding. To simplify back: $A'B'C + BC = C(A'B' + B) = C(A' + B) = A'C + BC$
(redundant literal), so $f = AB + A'C + BC$; now $BC$ is the consensus of $AB$ and $A'C$, and it drops:
$f = AB + A'C$.
:::
::::

::::example{#ex-sh-false level="gate" title="Which expansion is false?" depth="standard"}
For $f(x, y, z) = xy + z$, which of these equals $f$? (i) $x' f(0, y, z) + x f(1, y, z)$
(ii) $f(0, y, z) + f(1, y, z)$ (iii) $z' f(x, y, 0) + z f(x, y, 1)$.

:::step{why="Compute the cofactors on x: f(0, y, z) = z and f(1, y, z) = y + z."}
(i) $x'z + x(y + z) = x'z + xy + xz = xy + z$. Equal (it is Shannon's theorem).
:::

:::step{why="Without the selecting literals the sum is z + y + z."}
(ii) $z + y + z = y + z$. At $x = 0, y = 1, z = 0$ this is 1 but $f = 0$. Not equal.
:::

:::step{why="Cofactors on z: f(x, y, 0) = xy and f(x, y, 1) = 1."}
(iii) $z' \cdot xy + z \cdot 1 = xy z' + z = xy + z$ (redundant literal). Equal.
:::

:::answer
(i) and (iii) equal $f$; (ii) does not.
:::
::::

::::example{#ex-sh-quant level="gate" title="Edge case: what f(0, …) + f(1, …) and f(0, …) · f(1, …) mean" depth="deep"}
For $f = xy + z$, compute $f(0, y, z) + f(1, y, z)$ and $f(0, y, z) \cdot f(1, y, z)$ and say what each means.

:::step{why="Use the cofactors from the previous example: z and y + z."}
Sum: $z + y + z = y + z$. Product: $z(y + z) = z$ (absorption).
:::

:::step{why="The sum is 1 exactly when at least one choice of x makes f true."}
$y + z$ = "there exists an $x$ with $f = 1$".
:::

:::step{why="The product is 1 exactly when both choices of x make f true."}
$z$ = "$f = 1$ for every $x$": indeed, with $z = 1$ the function is 1 whatever $x$ is.
:::

:::answer
$f(0, \dots) + f(1, \dots) = y + z$ (exists $x$), $f(0, \dots) f(1, \dots) = z$ (for all $x$). Neither is $f$.
:::
::::

:::note{#recap-shannon title="Recap" depth="quick"}
$f = x' f|_{x=0} + x f|_{x=1}$, and dually $f = (x + f|_{x=0})(x' + f|_{x=1})$. The literals $x'$ and
$x$ cannot be dropped.
:::

## Proving and disproving identities

:::intuition{#prove-intuition title="One counterexample sinks a claim; a proof must cover every case" depth="standard"}
"All swans are white" is refuted by one black swan, but no number of white swans proves it. Boolean
identities are the same, with one happy difference: there are only finitely many cases ($2^n$ rows),
so you *can* look at every swan. Disproving needs one row; proving needs all rows or an algebraic
argument that covers them all at once.
:::

Many GATE questions are "which of these is NOT valid?" or "which are CORRECT?". Proving and
disproving are different kinds of work, and the fastest route to each is different.

:::definition{#prove-disprove term="Method: deciding whether an identity holds" depth="quick"}
- **To disprove**, find **one** row on which the two sides differ. One counterexample is a complete
  disproof.
- **To prove**, either transform one side into the other with the laws, or compare both sides on
  **all** $2^n$ rows (perfect induction), or compare their minterm lists (Lesson 4).
- **Order of work in an MCQ "which is NOT valid":** first try quick rows on the suspicious options;
  prove only what you need.
:::

:::trick{#counterexample title="Try the easy rows first" depth="standard"}
For a claimed identity, test the all-0 row, the all-1 row and the rows with a single 1 before doing
any algebra. Most false identities fail on one of them: $x \cdot x' = 1$ fails at once. Be
persistent, though: $(x + y) \oplus z = x \oplus (y + z)$ *agrees* on all the easy rows (000, 111,
100, 010, 001) and fails only on 011 (left $1 \oplus 1 = 0$, right $0 \oplus 1 = 1$) and 110 (left
$1 \oplus 0 = 1$, right $1 \oplus 1 = 0$).

**Why it works:** a single differing row disproves an identity. **When it fails:** agreement on the
rows you tried proves nothing; an identity can fail only on one rare row, so a *proof* still needs
algebra or the full table.
:::

The example in the trick is worth noticing: the first row you try may agree, and that tells you
nothing. Keep going until a row differs, or switch to proving.

### Worked examples: proving, disproving and dualising

::::example{#ex-pd-disprove level="easy" title="Disprove with one row" depth="quick"}
Is $x + yz = (x + y)z$ an identity?

:::step{why="Try the row that makes the left side 1 most cheaply while the right side may be 0: x = 1, z = 0."}
At $x = 1, y = 0, z = 0$: left $1 + 0 = 1$; right $(1 + 0) \cdot 0 = 0$.
:::

:::step{why="One differing row is a complete disproof; the correct law is x + yz = (x + y)(x + z)."}
So it is not an identity.
:::

:::answer
No. It fails at $x = 1, y = 0, z = 0$.
:::
::::

::::example{#ex-pd-table level="medium" title="Prove by perfect induction" depth="standard"}
Prove $x'y + xy' + xy = x + y$.

:::step{why="Two variables give only four rows, so list them all."}
Rows 00, 01, 10, 11: left side $0, 1, 1, 1$ (each row is covered by the term whose literals it matches, and row 00 by none).
:::

:::step{why="The right side is OR."}
$x + y$: $0, 1, 1, 1$.
:::

:::step{why="Equal on every row means equal as functions; algebra agrees: xy′ + xy = x, then x + x′y = x + y."}
The identity holds.
:::

:::answer
True on all four rows (and by algebra: $x(y' + y) + x'y = x + x'y = x + y$).
:::
::::

::::example{#ex-pd-conditional level="gate" title="A conditional identity" depth="standard"}
Show that $x \oplus y = x + y$ holds **whenever** $xy = 0$, but is not an identity.

:::step{why="XOR and OR differ only on the row where both inputs are 1."}
Rows 00, 01, 10 give $x \oplus y = x + y$ (0, 1, 1); row 11 gives $0 \ne 1$.
:::

:::step{why="The condition xy = 0 excludes exactly row 11."}
On every allowed row the two sides agree.
:::

:::answer
It holds under $xy = 0$ (rows 00, 01, 10) and fails without it (row 11). A GATE option that states the condition is valid.
:::
::::

::::example{#ex-pd-dual level="gate" title="Edge case: a law from its dual" depth="standard"}
Use duality to obtain a second identity from $x + x'y = x + y$, and check it.

:::step{why="Swap + with · (keeping the grouping); variables and primes stay."}
Dual: $x \cdot (x' + y) = x \cdot y$.
:::

:::step{why="Check it independently: expand the left side."}
$xx' + xy = 0 + xy = xy$. True.
:::

:::step{why="The dual is a new law, not the complement: the complement of x + y would be x′y′."}
Note the difference: the dual of the right side $x + y$ is $xy$, while its complement is $x'y'$.
:::

:::answer
$x(x' + y) = xy$ (the dual redundant-literal rule), true by the duality principle.
:::
::::

## Solving Boolean equations

:::intuition{#equations-intuition title="Each equation crosses out some rows" depth="standard"}
A system of Boolean equations is a sieve. Start with every possible assignment of the variables; each
equation crosses out the rows on which its two sides differ; the rows that survive every equation are
the solutions. Because a sum is 0 only when every term is 0, equations of the form "sum = 0" cross out
most rows at once, so start with them.
:::

A Boolean equation is solved by finding the input values that make it true. GATE has asked for the
solution of small systems three times; the method uses two facts and a little bookkeeping.

:::definition{#bool-equations term="Method: solving simultaneous Boolean equations" depth="quick"}
Two facts do most of the work:

- A **sum is 0** exactly when **every term is 0**: $a + b + c = 0 \iff a = b = c = 0$.
- A **product is 1** exactly when **every factor is 1**: $abc = 1 \iff a = b = c = 1$.

**Procedure.** Start with the equation that pins variables directly (a sum equal to 0, or a product
equal to 1), substitute what you learn into the other equations, repeat. If several values remain,
list every combination that satisfies all equations. In an MCQ, substituting each option into every
equation is also a valid (and safe) method.
:::

:::derivation{#equation-to-zero of="any equation as a single equation equal to 0" depth="standard"}
Two functions are equal exactly when they never differ, and they differ exactly where
$f \oplus g = fg' + f'g$ is 1. So
$$
f = g \iff fg' + f'g = 0 .
$$
A **system** $f_1 = g_1, \dots, f_k = g_k$ holds exactly when all the "difference" functions are 0,
that is when their OR is 0:
$$
(f_1 g_1' + f_1' g_1) + \dots + (f_k g_k' + f_k' g_k) = 0 .
$$
The solutions are the rows where this single expression is 0.

**Sanity check.** $x + y = 1$ becomes $(x + y) \cdot 1' + (x + y)' \cdot 1 = x'y' = 0$, which is false
only at $x = y = 0$: the solutions are every row except 00, as expected.
:::

:::viz{#sieve-viz spec="equation-sieve" mode="animate" depth="standard"}
:::

### Worked examples: Boolean equations

::::example{#ex-eq-three level="easy" title="Two equations, three variables" depth="quick"}
Solve $A + BC = 1$ and $AB' + C = 0$.

:::step{why="A sum equal to 0 forces every term to 0."}
From $AB' + C = 0$: $C = 0$ and $AB' = 0$.
:::

:::step{why="Substitute C = 0 into the first equation."}
$A + B \cdot 0 = A = 1$.
:::

:::step{why="With A = 1, AB′ = 0 forces B′ = 0."}
$B = 1$.
:::

:::answer
$A = 1, B = 1, C = 0$ (check: $1 + 0 = 1$ and $0 + 0 = 0$).
:::
::::

::::example{#ex-eq-chain level="medium" title="Pin one variable at a time" depth="standard"}
Solve the system $x + y = 1$, $xy = 0$, $x'z + y' = 0$ for $x, y, z$.

:::step{why="The third equation is a sum equal to 0, so both terms are 0."}
$y' = 0$, so $y = 1$; and $x'z = 0$.
:::

:::step{why="With y = 1, the second equation xy = 0 forces x = 0."}
$x = 0$. (The first equation $0 + 1 = 1$ holds.)
:::

:::step{why="x′z = 0 with x = 0 means z = 0."}
$z = 0$.
:::

:::answer
$x = 0, y = 1, z = 0$, the only solution.
:::
::::

::::example{#ex-eq-two level="gate" title="A system with two solutions" depth="standard"}
Find all solutions of $P + Q = 1$, $PQ = 0$, $Q + R = R$, $P'R + S = 0$.

:::step{why="P + Q = 1 and PQ = 0 together say exactly one of P, Q is 1."}
Either $(P, Q) = (1, 0)$ or $(0, 1)$.
:::

:::step{why="Q + R = R means Q = 1 forces R = 1 (if Q = 1 the left side is 1)."}
$Q = 1 \Rightarrow R = 1$.
:::

:::step{why="The last equation is a sum equal to 0: S = 0 and P′R = 0, so P = 0 forces R = 0."}
$S = 0$, and $P = 0 \Rightarrow R = 0$.
:::

:::step{why="Combine: the branch (P, Q) = (0, 1) needs R = 1 and R = 0 at once, which is impossible; the branch (1, 0) leaves R free."}
Solutions: $P = 1, Q = 0, S = 0$, and $R = 0$ or $R = 1$.
:::

:::answer
Two solutions, $(P, Q, R, S) = (1, 0, 0, 0)$ and $(1, 0, 1, 0)$.
:::
::::

::::example{#ex-eq-cancel level="gate" title="Edge case: you cannot cancel" depth="standard"}
From $x + y = x + z$ can you conclude $y = z$? From $xy = xz$?

:::step{why="Try to break it: make x = 1 so both sides are 1 whatever y and z are."}
$x = 1, y = 0, z = 1$: $1 + 0 = 1 + 1$, both 1, yet $y \ne z$.
:::

:::step{why="For the product, make x = 0 so both sides are 0."}
$x = 0, y = 0, z = 1$: $0 = 0$, yet $y \ne z$.
:::

:::step{why="Together they do work: if x + y = x + z and xy = xz then y = z (check x = 0 with the first equation, x = 1 with the second)."}
With both equations: at $x = 0$ the first gives $y = z$; at $x = 1$ the second gives $y = z$.
:::

:::answer
Neither equation alone allows cancelling; both together do.
:::
::::

:::definition{#not-laws term="What Boolean algebra does not have" depth="quick"}
- **No cancellation:** $x + y = x + z$ does not imply $y = z$, and $xy = xz$ does not imply $y = z$.
- **No subtraction or division:** there is no "$-x$" and no "$1/x$"; "moving a term to the other side"
  is meaningless.
- **No $x + x = 2x$:** $x + x = x$.
:::

:::trap{#trap-cancel title="Cancelling a term from both sides" depth="quick"}
Students solving $AB + C = AB + D$ write $C = D$. Wrong: when $AB = 1$ both sides are 1 whatever $C$
and $D$ are. Convert the equation to "difference = 0" ($(AB + C) \oplus (AB + D) = 0$) or reason row
by row instead.
:::

:::note{#recap-equations title="Recap" depth="quick"}
A sum is 0 iff every term is 0; a product is 1 iff every factor is 1. $f = g \iff fg' + f'g = 0$. You
can never cancel a term from both sides.
:::

## GATE questions on this lesson

All twelve previous-year questions, roughly from the easiest to the hardest. Try each before opening
the solution; the chips above each question jump back to the blocks it uses.

:::pyq{id="cse-2024-2-cs-20" tests="laws-table,perfect-induction" depth="standard"}
:::

:::pyq{id="cse-2026-2-cs-6" tests="huntington,laws-table" depth="standard"}
:::

:::pyq{id="cse-2004-cs-17" tests="redundant-literal,simplify-method" depth="standard"}
:::

:::pyq{id="cse-2008-cs-26" tests="absorption,simplify-method" depth="standard"}
:::

:::pyq{id="cse-2019-cs-6" tests="prove-disprove,counterexample" depth="standard"}
:::

:::pyq{id="cse-2017-2-cs-27" tests="simplify-method,demorgan,counterexample" depth="standard"}
:::

:::pyq{id="cse-2025-2-cs-40" tests="consensus,demorgan-general,prove-disprove" depth="standard"}
:::

:::pyq{id="it-2006-cs-6" tests="shannon,cofactor-def,trap-shannon-literals" depth="standard"}
:::

:::pyq{id="cse-2002-b-55-a" tests="consensus-add,demorgan" depth="standard"}
:::

:::pyq{id="cse-1994-a-27-b" tests="bool-equations" depth="standard"}
:::

:::pyq{id="cse-1995-a-30" tests="bool-equations" depth="standard"}
:::

:::pyq{id="cse-2000-a-2-10" tests="bool-equations,counterexample" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need
care.

:::practice{id="nx-dl-02-02-q01" depth="standard"}
:::

:::practice{id="nx-dl-02-02-q02" depth="standard"}
:::

:::practice{id="nx-dl-02-02-q03" depth="standard"}
:::

:::practice{id="nx-dl-02-02-q04" depth="standard"}
:::

:::practice{id="nx-dl-02-02-q05" depth="standard"}
:::

:::practice{id="nx-dl-02-02-q06" depth="standard"}
:::

:::practice{id="nx-dl-02-02-q07" depth="standard"}
:::

:::practice{id="nx-dl-02-02-q08" depth="standard"}
:::

:::practice{id="nx-dl-02-02-q09" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Boolean algebra on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Postulates | identities, commutative, both distributive laws, complements ($x + x' = 1$, $xx' = 0$), $0 \ne 1$ |
| Duality | swap $+ \leftrightarrow \cdot$, $0 \leftrightarrow 1$; a law's dual is a law; dual ≠ complement |
| Null, idempotence | $x + 1 = 1$, $x \cdot 0 = 0$; $x + x = x$, $xx = x$ |
| Absorption | $x + xy = x$, $x(x + y) = x$ |
| Redundant literal | $x + x'y = x + y$, $x(x' + y) = xy$ |
| De Morgan | $(x + y)' = x'y'$, $(xy)' = x' + y'$; complement = dual with literals complemented |
| Consensus | $xy + x'z + yz = xy + x'z$; dual $(x + y)(x' + z)(y + z) = (x + y)(x' + z)$ |
| Shannon | $f = x' f\vert_{x=0} + x f\vert_{x=1} = (x + f\vert_{x=0})(x' + f\vert_{x=1})$ |
| Equations | sum = 0 ⇒ every term 0; product = 1 ⇒ every factor 1; $f = g \iff fg' + f'g = 0$ |
| Disproof | one differing row; proof needs algebra or all $2^n$ rows |

The two habits that win marks: **scan for absorption and redundant literals first**, and **disprove
with one row** before trying to prove anything.
:::

:::note{#further-depth title="Further depth: Boolean algebras that are not 0 and 1" depth="deep"}
The postulates describe more than switches. The subsets of any set, with union as $+$, intersection
as $\cdot$ and complement as $'$, form a Boolean algebra (the empty set is 0, the whole set is 1).
That is why Venn diagrams prove Boolean identities, and why Lesson 4 can treat functions as *sets of
rows*: AND becomes intersection, OR union, NOT complement. Every finite Boolean algebra is of this
kind, with $2^k$ elements for some $k$ (Stone's representation theorem).
:::
