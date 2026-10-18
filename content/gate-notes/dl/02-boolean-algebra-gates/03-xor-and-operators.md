---
id: xor-and-operators
subject: dl
chapter: boolean-algebra-gates
title: XOR/XNOR algebra and custom operators
order: 3
prerequisites: [boolean-laws]
pyq_topics: [dl/boolean]
est_minutes: 45
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every identity, example and answer is checked by truth table in content/gate-notes/_checks/dl/l2_03_xor_operators.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 24–29, set B pp. 109–112, set C pp. 227–229, 247–248 and 255–256. Set C's 'a multiple of 4' parity slip is recorded in _errata/dl.md."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (exclusive-OR functions, parity generation and checking)."
  - "PYQs: src/gate/questions.json (dl/boolean); all sixteen keys are re-derived by truth-table enumeration in l2_03_xor_operators.py."
updated: "2026-10-17"
---

XOR is the odd one out among the gates. It has no controlling value, it does not obey absorption,
and yet it has an algebra of its own that is *more* like school algebra than Boolean algebra is: you
can cancel, you can "move terms across", and a chain of XORs simply counts. This lesson builds that
algebra, applies it to parity, and then turns to the GATE favourite of defining a strange operator
by a formula or a table and asking whether it is commutative or associative, or what a nested
expression simplifies to. Sixteen previous-year questions live here.

## Where this fits

[Lesson 1](lesson:logic-gates) introduced XOR as "the inputs differ" and XNOR as "the inputs are
equal"; [Lesson 2](lesson:boolean-laws) gave the general laws, and showed that $(x + y) \oplus z$
and $x \oplus (y + z)$ are different. Here XOR gets its own laws. They come back in parity and
Hamming codes (Chapter 1), in adders, where the sum bit is an XOR (Chapter 4), and in the comparators
of Chapter 5.

:::table{#radar title="GATE radar: XOR, XNOR and defined operators" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 16 (1992–2026), tied with Lesson 6 as the largest group in the chapter |
| Marks | 8 one-mark, 5 two-mark, 3 fill-in or MSQ from older papers |
| Pattern 1 | XOR/XNOR identities and complemented inputs: 2013, 2018, 2026 |
| Pattern 2 | Flatten an XOR expression and cancel: 2014 (and 2005, the parity function) |
| Pattern 3 | Parity: what must hold if $x_1 \oplus x_2 \oplus x_3 \oplus x_4 = 0$ (2016), B XORed n times (1998) |
| Pattern 4 | Commutative but not associative? (1992, 1998, 2015) |
| Pattern 5 | A defined operator: identify it, then evaluate a nest (1994, 1997, 2002, 2007, 2016) |
| What examiners test | Complemented inputs, associativity of XOR and non-associativity of NAND, and reading a defined operator as one of the 16 functions |
:::

## The idea: XOR is addition without carry

:::intuition{#xor-intuition title="Three ways to think about XOR" depth="standard"}
**A difference detector.** $x \oplus y$ is 1 exactly when $x$ and $y$ differ. Two people each hold
a light switch at the two ends of a staircase; the lamp's state changes whenever either one flips
their switch. That is XOR or XNOR, depending on how the wires are crossed (Lesson 6 wires it);
either way, one flip toggles the lamp.

**Addition without carry.** Add two bits and keep only the units digit: $0 + 0 = 0$, $0 + 1 = 1$,
$1 + 1 = 10_2$, units digit 0. That is $x \oplus y$. It is the sum bit of a half adder, and it is
why XOR is also called **addition modulo 2**.

**A controlled inverter.** Feed a data bit $x$ and a control bit $c$: if $c = 0$ the output is $x$,
if $c = 1$ it is $x'$. One gate, two behaviours, chosen by a wire.
:::

:::viz{#xorinv-viz spec="xor-controlled-inverter" mode="animate" depth="standard"}
:::

All three views are the same truth table, 0, 1, 1, 0. The "addition" view is the one that makes the
algebra easy, because addition modulo 2 behaves like ordinary addition with one extra rule:
$1 + 1 = 0$.

## Forms of XOR and XNOR

:::definition{#xor-forms term="Expressions for XOR" depth="quick"}
$$
x \oplus y \;=\; x'y + xy' \;=\; (x + y)(x' + y') \;=\; (x + y)(xy)' .
$$
- The first form reads the two 1-rows of the table (01 and 10).
- The second is the product-of-sums form (it is 0 on rows 00 and 11).
- The third says "at least one, but not both": OR, then remove the row where both are 1.
:::

:::definition{#xnor-forms term="Expressions for XNOR (equivalence)" depth="quick"}
$$
x \odot y \;=\; (x \oplus y)' \;=\; xy + x'y' \;=\; (x' + y)(x + y') .
$$
XNOR is 1 when $x = y$. The middle form reads the 1-rows 00 and 11; the last says "$x$ implies $y$
and $y$ implies $x$".
:::

:::note{#recap-forms title="Recap" depth="quick"}
XOR $= x'y + xy' = (x + y)(xy)'$; XNOR $= xy + x'y' = (x \oplus y)'$. XOR is "differ", "odd",
"add without carry"; XNOR is "equal".
:::

## The laws of XOR

:::table{#xor-laws title="Laws of XOR" depth="quick"}
| Law | Statement | Why (one line) |
|:--|:--|:--|
| Identity | $x \oplus 0 = x$ | XOR with 0 is the "copy" setting of the controlled inverter |
| Inversion | $x \oplus 1 = x'$ | XOR with 1 is the "invert" setting |
| Self-cancel | $x \oplus x = 0$ | equal inputs never differ |
| Complement | $x \oplus x' = 1$ | complementary inputs always differ |
| Commutative | $x \oplus y = y \oplus x$ | "differ" is symmetric |
| Associative | $(x \oplus y) \oplus z = x \oplus (y \oplus z)$ | both are the parity of $x, y, z$ (theorem below) |
| AND distributes | $x(y \oplus z) = xy \oplus xz$ | at $x = 0$ both sides are 0; at $x = 1$ both are $y \oplus z$ |
| Not idempotent | $x \oplus x = 0$, not $x$ | unlike AND and OR |
:::

:::theorem{#xor-assoc name="XOR is associative" depth="standard"}
$(x \oplus y) \oplus z = x \oplus (y \oplus z)$, and both are 1 exactly when an odd number of
$x, y, z$ are 1. So brackets in a chain of XORs can be dropped and the terms reordered freely.
:::

:::proof{#proof-xor-assoc of="associativity of XOR" depth="standard"}
**Idea first:** XOR is addition modulo 2, and ordinary addition is associative.

Read every value as an integer 0 or 1. By definition $a \oplus b = (a + b) \bmod 2$. Then
$$
(x \oplus y) \oplus z = \big((x + y) \bmod 2 + z\big) \bmod 2 = (x + y + z) \bmod 2 ,
$$
because reducing modulo 2 before or after adding $z$ gives the same remainder. The same
computation gives $x \oplus (y \oplus z) = (x + y + z) \bmod 2$. Both sides equal the parity of the
number of 1s.

**Sanity check by perfect induction:** on the 8 rows, both bracketings give 0, 1, 1, 0, 1, 0, 0, 1,
which is 1 exactly on rows 001, 010, 100, 111 (one or three 1s).
:::

Associativity and commutativity together give XOR's two power tools.

:::definition{#xor-cancel term="Cancellation" depth="quick"}
$$
x \oplus y = x \oplus z \implies y = z .
$$
XOR both sides with $x$: $x \oplus x \oplus y = x \oplus x \oplus z$, so $0 \oplus y = 0 \oplus z$.
This is exactly the cancellation that **fails** for OR and AND ([Lesson 2](lesson:boolean-laws)):
every XOR value can be "undone" by XORing again.
:::

:::definition{#xor-solve term="Moving a term across" depth="quick"}
$$
a \oplus b = c \iff a = b \oplus c \iff b = a \oplus c .
$$
XOR both sides with $b$. This turns "find the unknown" questions into one XOR: if $C = A \oplus B$
then $C \oplus A = B$. The same move works for XNOR: $a \odot b = c \iff a = b \odot c$ (proved in
`#xnor-equivalence`).
:::

:::definition{#and-over-xor term="AND distributes over XOR" depth="standard"}
$$
x(y \oplus z) = xy \oplus xz .
$$
If $x = 0$ both sides are 0; if $x = 1$ both sides are $y \oplus z$. This is the distributive law of
ordinary arithmetic modulo 2, with AND as multiplication.
:::

:::trap{#trap-or-xor title="OR does not distribute over XOR" depth="quick"}
$x + (y \oplus z)$ is **not** $(x + y) \oplus (x + z)$. At $x = 1$ the left side is 1, the right
side is $1 \oplus 1 = 0$. Only AND distributes over XOR. Likewise XOR and OR do not "associate" with
each other: $(x + y) \oplus z \ne x \oplus (y + z)$ (they differ on rows 011 and 110).
:::

### Complemented inputs

:::derivation{#complement-inputs of="what complementing an input of XOR does" depth="quick"}
Since $x' = x \oplus 1$,
$$
x' \oplus y = (x \oplus 1) \oplus y = (x \oplus y) \oplus 1 = (x \oplus y)' = x \odot y .
$$
In the same way $x \oplus y' = x \odot y$, and
$$
x' \oplus y' = x \oplus y \oplus 1 \oplus 1 = x \oplus y .
$$
**Rule:** each complement (on an input or on the output) flips XOR to XNOR and back. Two complements
cancel. So the four expressions $x \odot y$, $x' \oplus y$, $x \oplus y'$, $(x \oplus y)'$ are all the
same function, while $x' \oplus y'$ is plain XOR.

**Sanity check.** At $x = y = 0$: $x' \oplus y = 1 \oplus 0 = 1$ and $x \odot y = 1$; $x' \oplus y' =
1 \oplus 1 = 0 = x \oplus y$.
:::

:::trick{#trick-bubble-count title="Count the bubbles" depth="standard"}
In any XOR/XNOR expression of two signals, count the complements: one per primed input, one per
XNOR, one per bar over the whole thing. An even count gives XOR, an odd count gives XNOR. For
example $(x' \odot y)'$ has three (prime, XNOR, bar): XNOR.

**Why it works:** each complement is an "$\oplus\, 1$", and the 1s cancel in pairs. **When it fails:**
it applies only to pure XOR/XNOR expressions. A complement over an AND or OR, as in $(x + y)' \oplus z$, is not
an $\oplus\, 1$ on a variable of the XOR; expand it first.
:::

### XOR as arithmetic modulo 2

:::derivation{#gf2 of="XOR and AND in ordinary arithmetic" depth="standard"}
With 0 and 1 read as integers:
$$
x \oplus y = x + y - 2xy, \qquad xy = x \cdot y .
$$
Check: $(0, 0) \to 0$, $(0, 1) \to 1$, $(1, 0) \to 1$, $(1, 1) \to 2 - 2 = 0$. So XOR is integer
addition with the "2" removed. This is arithmetic in the two-element field (often written GF(2)):
XOR is $+$, AND is $\times$, and 1 is the only non-zero number.
:::

:::definition{#anf term="Writing OR and NOT with XOR and AND" depth="standard"}
$$
x' = x \oplus 1, \qquad x + y = x \oplus y \oplus xy .
$$
The second identity says "OR = add, then remove the double count". Every Boolean function can be
written as an XOR of AND-terms with this rule (its **algebraic normal form**, used again in Lesson 5).
:::

:::definition{#disjoint-or term="When OR and XOR agree" depth="quick"}
$$
\text{if } xy = 0 \text{ then } x + y = x \oplus y .
$$
OR and XOR differ only on the row where both inputs are 1. If that row cannot happen (the terms are
**disjoint**), they are the same. For example $x'y + xy' = x'y \oplus xy'$, and in Lesson 4 the
minterms of a canonical SOP are disjoint, so their OR is also their XOR.

**The other extreme.** If every 1 of $y$ is also a 1 of $x$ ($y$ implies $x$), then $x'y = 0$, so
$x \oplus y = xy' + x'y = xy'$: XOR removes $y$'s rows from $x$. Example: $(x + y) \oplus xy = (x + y)(xy)'$,
which is $x \oplus y$ again.
:::

### Worked examples: complemented inputs

::::example{#ex-ci-basic level="easy" title="Two complements and a constant" depth="quick"}
Simplify $x' \oplus y' \oplus 1$.

:::step{why="Each complement is an ⊕ 1, so write them out."}
$x \oplus 1 \oplus y \oplus 1 \oplus 1$.
:::

:::step{why="Three 1s leave one: an odd count of complements."}
$x \oplus y \oplus 1 = (x \oplus y)'$.
:::

:::answer
$x \odot y$.
:::
::::

::::example{#ex-ci-which level="medium" title="Which forms are the complement of XOR?" depth="standard"}
Which of $x' \oplus y$, $x \odot y'$ and $x' \odot y'$ equal $(x \oplus y)'$?

:::step{why="Count complements relative to plain XOR: (x ⊕ y)′ has one."}
Target: one complement.
:::

:::step{why="x′ ⊕ y has one (the prime); x ⊙ y′ has two (prime and XNOR); x′ ⊙ y′ has three."}
Odd counts: $x' \oplus y$ (1) and $x' \odot y'$ (3). Even: $x \odot y'$ (2).
:::

:::answer
$x' \oplus y$ and $x' \odot y'$ equal $(x \oplus y)'$; $x \odot y'$ equals $x \oplus y$.
:::
::::

::::example{#ex-ci-three level="gate" title="Complements spread over a three-input expression" depth="standard"}
Simplify $(A' \odot B)' \oplus C'$.

:::step{why="Write every complement and every XNOR as ⊕ 1."}
$A \oplus 1 \oplus B \oplus 1 \oplus 1 \oplus C \oplus 1$ (prime on $A$, the XNOR, the bar, prime on $C$).
:::

:::step{why="Four 1s cancel in pairs."}
$A \oplus B \oplus C$.
:::

:::answer
$A \oplus B \oplus C$ (odd parity).
:::
::::

::::example{#ex-ci-trap level="gate" title="Edge case: a bar over an OR is not a bubble on an XOR" depth="standard"}
Is $(x + y)' \oplus z$ equal to $x \oplus y \oplus z \oplus 1$?

:::step{why="The bar covers an OR, so it is not an ⊕ 1 on an input of the XOR chain."}
$(x + y)' = x'y'$, so the left side is $x'y' \oplus z$.
:::

:::step{why="Test a row: x = y = 1, z = 0."}
Left: $0 \oplus 0 = 0$. Right: $1 \oplus 1 \oplus 0 \oplus 1 = 1$.
:::

:::answer
No. The bubble count applies only to pure XOR/XNOR expressions.
:::
::::

### Worked examples: XOR algebra

::::example{#ex-xor-cancel level="easy" title="Cancel in pairs" depth="quick"}
Simplify $1 \oplus x \oplus x'$.

:::step{why="x ⊕ x′ = 1, because complementary inputs always differ."}
$x \oplus x' = 1$.
:::

:::step{why="Then 1 ⊕ 1 = 0."}
$1 \oplus 1 = 0$.
:::

:::answer
$0$.
:::
::::

::::example{#ex-xor-or level="medium" title="OR XOR AND" depth="standard"}
Simplify $(x + y) \oplus xy$.

:::step{why="Use x + y = x ⊕ y ⊕ xy from the arithmetic view."}
$(x + y) \oplus xy = x \oplus y \oplus xy \oplus xy$.
:::

:::step{why="xy ⊕ xy = 0 by self-cancellation."}
$= x \oplus y$.
:::

:::step{why="Perfect induction on all four rows confirms it; row 11 is the one where OR and XOR differ."}
Check rows 00, 01, 10, 11: $0, 1, 1, 0$. Correct.
:::

:::answer
$x \oplus y$.
:::
::::

::::example{#ex-xor-flatten level="gate" title="Flatten and count" depth="standard"}
Simplify $G = (P \oplus Q \oplus 1) \oplus (Q \oplus R) \oplus (R \oplus P \oplus 0) \oplus Q$.

:::step{why="XOR is associative and commutative, so drop every bracket."}
$G = P \oplus Q \oplus 1 \oplus Q \oplus R \oplus R \oplus P \oplus 0 \oplus Q$.
:::

:::step{why="Count each symbol; pairs cancel, so only odd counts survive."}
$P$: 2 copies (cancel). $Q$: 3 copies (one survives). $R$: 2 (cancel). Constants: $1 \oplus 0 = 1$.
:::

:::step{why="What survives is Q ⊕ 1, and XOR with 1 inverts."}
$G = Q \oplus 1 = Q'$.
:::

:::answer
$G = Q'$.
:::
::::

:::trick{#trick-flatten title="Flatten any pure XOR chain and count copies" depth="standard"}
Drop all brackets, then for each variable count its copies modulo 2, and count the constant 1s
modulo 2. A variable with an odd count stays; an odd number of 1s adds a final complement.

**Why it works:** associativity, commutativity, $a \oplus a = 0$ and $a \oplus 0 = a$. **When it fails:**
the moment an AND or OR sits between XORs, as in $(x + y) \oplus x$; expand those parts first
(here $x + y = x \oplus y \oplus xy$, so the expression is $y \oplus xy = x'y$).
:::

::::example{#ex-xor-or-trap level="gate" title="Edge case: OR inside an XOR" depth="standard"}
Is $x + (y \oplus z) = (x + y) \oplus (x + z)$?

:::step{why="Try x = 1, where OR has its controlling value."}
Left: $1 + (y \oplus z) = 1$. Right: $1 \oplus 1 = 0$.
:::

:::step{why="One differing row is a complete disproof."}
The identity is false.
:::

:::step{why="The correct distributive law is the one with AND: x(y ⊕ z) = xy ⊕ xz."}
What is true: $x(y \oplus z) = xy \oplus xz$, and $x + (y \oplus z) = x \oplus (y \oplus z) \oplus x(y \oplus z)$.
:::

:::answer
No: OR does not distribute over XOR (it fails whenever $x = 1$).
:::
::::

:::note{#recap-xor-laws title="Recap" depth="quick"}
XOR is associative and commutative, $x \oplus x = 0$, $x \oplus 0 = x$, $x \oplus 1 = x'$; so you can
cancel and move terms across. Each complement toggles XOR ↔ XNOR. Only AND distributes over XOR.
:::

## Parity: the XOR of many inputs

:::intuition{#parity-intuition title="A light that every switch can flip" depth="standard"}
Imagine a lamp wired so that each of $n$ switches, when flipped, toggles it. Start with every switch
down and the lamp off. Flip some switches up: each one toggles the lamp once, so the lamp is on exactly
when an odd number of switches are up. That lamp is an $n$-input XOR. It does not care which switches
are up, or in what order you flipped them: only how many, and only whether that number is odd.
:::

:::theorem{#parity name="An n-input XOR computes odd parity" depth="standard"}
$x_1 \oplus x_2 \oplus \dots \oplus x_n = 1$ exactly when an **odd** number of the $x_i$ are 1.
Equivalently, $x_1 \oplus \dots \oplus x_n = 0$ exactly when an **even** number (0, 2, 4, …) are 1.
:::

:::proof{#proof-parity of="the parity theorem" depth="standard"}
**Idea first:** each new input either keeps or flips the running value, and it flips exactly when the
input is 1.

Induction on $n$. For $n = 1$, $x_1$ is 1 exactly when one (an odd number) of the inputs is 1. Suppose
the claim holds for $n - 1$ inputs and let $p = x_1 \oplus \dots \oplus x_{n-1}$. Then
$p \oplus x_n = p$ if $x_n = 0$ (the count of 1s is unchanged) and $= p'$ if $x_n = 1$ (the count
grows by one, so its parity flips). In both cases the result is 1 exactly when the count of 1s among
all $n$ inputs is odd.
:::

:::viz{#parity-viz spec="xor-parity-chain" mode="animate" depth="standard"}
:::

A note on a slip that appears in some references: "$x_1 \oplus x_2 \oplus x_3 \oplus x_4 = 0$ means the
number of 1s is a multiple of 4" is wrong. It means the number of 1s is **even**: 0, 2 or 4.

:::definition{#iterated-xor term="XORing a value with itself repeatedly" depth="quick"}
For $k$ copies of the same bit (or bit string) $B$,
$$
\underbrace{B \oplus B \oplus \dots \oplus B}_{k \text{ copies}} = \begin{cases} B & k \text{ odd} \\ 0 & k \text{ even.} \end{cases}
$$
Pairs cancel, so only the parity of $k$ matters. Note the counting: $k$ copies use $k - 1$ XOR
operations.
:::

:::trap{#trap-n-times title="Copies or operations?" depth="quick"}
"B XORed with itself $n$ times" is ambiguous. If it means $n$ XOR **operations**, there are $n + 1$
copies, so the result is $B$ when $n$ is **even** and 0 when $n$ is odd. If it means $n$ **copies**, it
is the other way round. The 1998 GATE question uses the first reading (its key: "unchanged when $n$ is
even"). Always translate the words into a count of copies before applying the rule.
:::

### Worked examples: parity

::::example{#ex-par-string level="easy" title="The parity of a byte" depth="quick"}
Find $1 \oplus 0 \oplus 1 \oplus 1 \oplus 0 \oplus 1 \oplus 1 \oplus 0$ (the bits of 10110110).

:::step{why="By the parity theorem, only the number of 1s matters."}
Count the 1s: five.
:::

:::step{why="Five is odd."}
The XOR is 1.
:::

:::answer
$1$ (odd parity; an even-parity code would append the parity bit 1 to make six 1s).
:::
::::

::::example{#ex-par-minterms level="medium" title="The minterms of a 3-variable parity function" depth="standard"}
For which rows $ABC$ is $A \oplus B \oplus C = 1$? Give the row numbers.

:::step{why="The function is 1 when an odd number of A, B, C are 1: one or three."}
One 1: rows 001, 010, 100. Three 1s: row 111.
:::

:::step{why="Read the rows as numbers with A as the most significant bit."}
Rows 1, 2, 4, 7.
:::

:::step{why="The other four rows (0, 3, 5, 6) have an even number of 1s."}
So the function is 1 on exactly half the rows: four of eight.
:::

:::answer
Rows 1, 2, 4 and 7.
:::
::::

::::example{#ex-par-must level="gate" title="What must be true when the parity is odd?" depth="standard"}
Suppose $x_1 \oplus x_2 \oplus x_3 \oplus x_4 = 1$. Which of these must hold?
(i) $x_1 \oplus x_2 = (x_3 \oplus x_4)'$ (ii) $x_1 + x_2 + x_3 + x_4 = 1$ (iii) $x_1x_2x_3x_4 = 0$
(iv) $x_1' \oplus x_2' \oplus x_3' \oplus x_4' = 1$.

:::step{why="Move terms across: (x₁ ⊕ x₂) ⊕ (x₃ ⊕ x₄) = 1 means the two halves differ."}
(i) $x_1 \oplus x_2 = 1 \oplus (x_3 \oplus x_4) = (x_3 \oplus x_4)'$. Must hold.
:::

:::step{why="An odd number of 1s means at least one 1, and never all four."}
(ii) At least one input is 1, so the OR is 1: must hold. (iii) Four 1s would be even, so they are not all 1: must hold.
:::

:::step{why="Complementing all four inputs adds four 1s to the XOR, an even number, which changes nothing."}
(iv) $x_1' \oplus x_2' \oplus x_3' \oplus x_4' = x_1 \oplus x_2 \oplus x_3 \oplus x_4 \oplus 1 \oplus 1 \oplus 1 \oplus 1 = 1$. Must hold.
:::

:::answer
All four must hold. (With "$= 0$" instead, none of the four must hold: (i) and (iv) become false on
every row, 0000 breaks (ii) and 1111 breaks (iii). The true versions would be $x_1 \oplus x_2 = x_3 \oplus x_4$
and $x_1' \oplus x_2' \oplus x_3' \oplus x_4' = 0$.)
:::
::::

::::example{#ex-par-ntimes level="gate" title="Edge case: B XORed with itself n times" depth="standard"}
A bit string $B$ goes through $n$ successive XOR operations, each with $B$: $B \oplus (B \oplus (B \oplus \dots))$
with $n$ operators. What is the result for $n = 4$ and $n = 5$?

:::step{why="n operators join n + 1 copies of B."}
$n = 4$: five copies. $n = 5$: six copies.
:::

:::step{why="Copies cancel in pairs; an odd number of copies leaves one B."}
Five copies give $B$; six copies give $0$ (the all-zero string).
:::

:::answer
$n = 4$: $B$ (unchanged). $n = 5$: $0$. So the string is unchanged when the number of operations is even.
:::
::::

:::note{#recap-parity title="Recap" depth="quick"}
An XOR chain is 1 iff an odd number of inputs are 1 (0 means even, not "a multiple of 4"). $k$
copies of $B$ XOR to $B$ if $k$ is odd, else 0; $n$ operations means $n + 1$ copies.
:::

## XNOR as equivalence, and chains of XNOR

:::intuition{#xnor-intuition title="An equality test is a parity test in disguise" depth="standard"}
"Are these two bits equal?" is the opposite of "do they differ?", so XNOR is XOR with the answer
flipped: one extra toggle. Chaining XNORs adds one extra toggle per gate. With an even number of extra
toggles nothing changes; with an odd number the answer is flipped. Everything about XNOR chains follows
from counting those extra toggles.
:::

:::definition{#xnor-equivalence term="XNOR is equality" depth="quick"}
$x \odot y = 1 \iff x = y$. It is commutative and associative: $(x \odot y) \odot z = x \oplus y \oplus 1
\oplus z \oplus 1 = x \oplus y \oplus z$, and $x \odot (y \odot z)$ gives the same,
$x \odot x = 1$, $x \odot 1 = x$, $x \odot 0 = x'$. So if $C = A \odot B$, then
$C \odot A = A \odot B \odot A = B \odot (A \odot A) = B \odot 1 = B$: XNOR can be "undone" too.
:::

:::derivation{#xnor-chain of="a chain of XNORs in terms of XOR" depth="standard"}
Each $\odot$ is an $\oplus$ followed by $\oplus\, 1$. A chain $x_1 \odot x_2 \odot \dots \odot x_n$ has
$n - 1$ operators, so
$$
x_1 \odot x_2 \odot \dots \odot x_n = x_1 \oplus x_2 \oplus \dots \oplus x_n \oplus \underbrace{1 \oplus \dots \oplus 1}_{n - 1} .
$$
- **Odd $n$:** $n - 1$ is even, the 1s cancel, and the XNOR chain **equals** the XOR chain.
- **Even $n$:** one 1 survives, and the XNOR chain is the **complement** of the XOR chain.

Another reading: the chain is 1 exactly when the number of **0s** among the inputs is even.
:::

:::viz{#xnorchain-viz spec="xnor-chain" mode="static" depth="standard"}
:::

### Worked examples: XNOR chains

::::example{#ex-xc-eval level="easy" title="Evaluate a three-variable chain" depth="quick"}
Find $1 \odot 0 \odot 1$.

:::step{why="Evaluate left to right: 1 ⊙ 0 = 0 (they differ)."}
$1 \odot 0 = 0$.
:::

:::step{why="Then 0 ⊙ 1 = 0 (they differ)."}
$0 \odot 1 = 0$. Check: with three variables the chain equals the XOR, $1 \oplus 0 \oplus 1 = 0$.
:::

:::answer
$0$.
:::
::::

::::example{#ex-xc-four level="medium" title="A four-variable chain" depth="standard"}
Write $w \odot x \odot y \odot z$ in terms of XOR.

:::step{why="Three ⊙ operators add three ⊕ 1 terms."}
$w \oplus x \oplus y \oplus z \oplus 1 \oplus 1 \oplus 1$.
:::

:::step{why="Three 1s leave one."}
$(w \oplus x \oplus y \oplus z)'$.
:::

:::answer
The complement of the 4-input XOR (even parity of 1s): with an even number of variables the chain flips.
:::
::::

::::example{#ex-xc-count level="gate" title="Count the rows of a chain" depth="standard"}
On how many of the 16 rows is $a \odot b \odot c \odot d = 1$?

:::step{why="By the previous example it is the complement of a 4-input XOR."}
It is 1 when an **even** number of $a, b, c, d$ are 1.
:::

:::step{why="Even weights 0, 2, 4: C(4, 0) + C(4, 2) + C(4, 4) = 1 + 6 + 1."}
$8$ rows (the number of 0s is then also even, the other description of the chain).
:::

:::answer
8.
:::
::::

::::example{#ex-xc-gate level="gate" title="Edge case: chain versus 3-input XNOR gate" depth="standard"}
At $x = y = z = 0$, compare the chain $x \odot y \odot z$ with a catalogue 3-input XNOR gate.

:::step{why="The chain of an odd number of variables equals the XOR."}
Chain: $0 \oplus 0 \oplus 0 = 0$.
:::

:::step{why="A 3-input XNOR gate is defined as the complement of the 3-input XOR."}
Gate: $(0 \oplus 0 \oplus 0)' = 1$.
:::

:::answer
They differ (0 vs 1); for three inputs they are complements on every row.
:::
::::

:::trap{#trap-xnor-convention title="An n-input XNOR gate is not always the XNOR chain" depth="quick"}
A catalogue "3-input XNOR gate" is defined as the **complement** of the 3-input XOR (1 for an even
number of 1s). The chain $x \odot y \odot z$ of two 2-input XNOR gates is the XOR itself (1 for an odd
number of 1s). They agree only for an even number of inputs. When a question writes the operator
$\odot$ between three variables, it means the chain.
:::

## Properties of operators

:::intuition{#ops-intuition title="Does the order of the ingredients matter?" depth="standard"}
Mixing flour and sugar gives the same bowl whichever goes in first: that is commutativity. Mixing
flour with sugar and then adding eggs gives the same batter as mixing sugar with eggs and then adding
flour: that is associativity. Some kitchen operations fail one or both tests (you cannot "un-bake").
For a Boolean operator both questions are decided by its table: commutativity by two rows, associativity
by eight.
:::

GATE often defines an operator, by a formula or a table, and asks about its properties. Here are
the properties and how to test each one from a truth table.

:::definition{#operator-properties term="Properties of a binary operator ⋆" depth="quick"}
- **Commutative:** $x \star y = y \star x$ for all $x, y$.
- **Associative:** $(x \star y) \star z = x \star (y \star z)$ for all $x, y, z$.
- **Idempotent:** $x \star x = x$.
- **Identity element** $e$: $x \star e = e \star x = x$ (0 for OR and XOR, 1 for AND and XNOR).
- **Absorbing element** $a$: $x \star a = a \star x = a$ (1 for OR, 0 for AND; XOR and XNOR have none).

| Operator | Commutative | Associative | Idempotent |
|:--|:-:|:-:|:-:|
| AND, OR | yes | yes | yes |
| XOR, XNOR | yes | yes | no |
| NAND, NOR | yes | **no** | no |
| implication $x' + y$ | no | no | no |
:::

:::definition{#test-from-table term="Method: testing an operator from its table" depth="quick"}
1. **Commutative?** Compare the rows $(0, 1)$ and $(1, 0)$. Equal outputs ⇒ commutative (rows 00 and
   11 never matter).
2. **Associative?** Build the 8-row table of $(a \star b) \star c$ and $a \star (b \star c)$ and compare.
   One mismatch ⇒ not associative. Shortcut: exactly 8 of the 16 operators are associative, namely
   the constants 0 and 1, AND, OR, XOR, XNOR and the two projections $x \star y = x$ and $x \star y = y$.
   Every other operator fails, so identify the operator from its column first.
3. **Identify the operator** first whenever possible: its column (00, 01, 10, 11) names it in the
   sixteen-function table of [Lesson 1](lesson:logic-gates).
:::

:::viz{#assoc-viz spec="assoc-test" mode="animate" depth="standard"}
:::

:::theorem{#nand-not-assoc name="NAND and NOR are commutative but not associative" depth="standard"}
$(a \uparrow b) \uparrow c = ab + c'$ while $a \uparrow (b \uparrow c) = a' + bc$; they differ, for
example at $a = b = 0, c = 1$. Dually, $(a \downarrow b) \downarrow c = (a + b)c'$ and
$a \downarrow (b \downarrow c) = a'(b + c)$.
:::

:::proof{#proof-nand-not-assoc of="the non-associativity of NAND" depth="standard"}
**Idea first:** compute both bracketings with De Morgan; one row then separates them.

$(a \uparrow b) \uparrow c = \big((ab)' c\big)' = (ab)'' + c' = ab + c'$, and
$a \uparrow (b \uparrow c) = \big(a (bc)'\big)' = a' + bc$. At $a = 0, b = 0, c = 1$: the first is
$0 + 0 = 0$, the second is $1 + 0 = 1$. Commutativity holds because $ab = ba$. The NOR case is the dual.
:::

:::trap{#trap-nand-assoc title="NAND(NAND(a, b), c) is not a 3-input NAND" depth="quick"}
Because NAND is not associative, "$a \uparrow b \uparrow c$" has no meaning without brackets, and
neither bracketing equals the 3-input NAND $(abc)'$. This is the same fact as Lesson 1's cascaded-NAND
trap, now seen as an algebraic property.
:::

:::definition{#implication term="Implication-type operators" depth="quick"}
$x \to y = x' + y$ ("if $x$ then $y$") is 0 only when $x = 1, y = 0$. It is **not commutative**
($0 \to 1 = 1$ but $1 \to 0 = 0$) and **not associative** ($(0 \to 0) \to 0 = 0$ but
$0 \to (0 \to 0) = 1$). Useful facts: $x \to x = 1$, $x \to 0 = x'$, $1 \to y = y$, $0 \to y = 1$.
The 1997 and 2002 GATE operators are this function in disguise.
:::

### Worked examples: operator properties

::::example{#ex-op-comm level="easy" title="Commutative from the table" depth="quick"}
An operator has outputs 1, 1, 0, 1 for rows $xy$ = 00, 01, 10, 11. Is it commutative?

:::step{why="Only rows 01 and 10 can break commutativity."}
Row 01 gives 1, row 10 gives 0.
:::

:::step{why="Different outputs mean x ⋆ y ≠ y ⋆ x for x = 0, y = 1."}
Not commutative. (The column 1101 is implication, $x' + y$.)
:::

:::answer
Not commutative.
:::
::::

::::example{#ex-op-nand level="medium" title="Associativity of NAND, by one row" depth="standard"}
Show that NAND is not associative with a single row.

:::step{why="Use the closed forms from the theorem: ab + c′ against a′ + bc."}
Look for a row where $ab + c' \ne a' + bc$.
:::

:::step{why="Make the first 0 (needs c = 1 and ab = 0) and the second 1 (a = 0 works)."}
Take $a = 0, b = 0, c = 1$.
:::

:::step{why="Evaluate directly with NAND to be safe."}
$(0 \uparrow 0) \uparrow 1 = 1 \uparrow 1 = 0$, but $0 \uparrow (0 \uparrow 1) = 0 \uparrow 1 = 1$.
:::

:::answer
At $(0, 0, 1)$ the two bracketings give 0 and 1, so NAND is not associative.
:::
::::

::::example{#ex-op-bimp level="gate" title="Is x ∘ y = x + y′ associative?" depth="standard"}
Define $x \circ y = x + y'$. Is $\circ$ commutative? Associative?

:::step{why="Compare rows 01 and 10."}
$0 \circ 1 = 0 + 0 = 0$ but $1 \circ 0 = 1 + 1 = 1$: not commutative.
:::

:::step{why="Compute both bracketings symbolically."}
$(x \circ y) \circ z = (x + y') + z' = x + y' + z'$; $x \circ (y \circ z) = x + (y + z')' = x + y'z$.
:::

:::step{why="Make the second form 0 (x = 0 and y′z = 0) while the first is 1 (y′ + z′ = 1): y = 1, z = 0 does both."}
First: $0 + 0 + 1 = 1$. Second: $0 + 0 \cdot 1 = 0$. Different.
:::

:::answer
Neither commutative nor associative ($\circ$ is "y implies x").
:::
::::

::::example{#ex-op-left level="gate" title="Edge case: associative but not commutative" depth="standard"}
Define $x * y = x$ (the output copies the left input). Is it associative? Commutative?

:::step{why="Both bracketings return the leftmost argument."}
$(x * y) * z = x * z = x$ and $x * (y * z) = x$: equal for every row, so associative.
:::

:::step{why="Swapping the inputs changes the output whenever x ≠ y."}
$0 * 1 = 0$ but $1 * 0 = 1$: not commutative.
:::

:::answer
Associative but not commutative: the two properties are independent.
:::
::::

:::note{#recap-ops title="Recap" depth="quick"}
Commutative: rows 01 and 10 agree. Associative: compare both bracketings on 8 rows. AND, OR, XOR,
XNOR are both; NAND, NOR are commutative only; implication is neither.
:::

## Defined and nested operators

:::intuition{#defined-intuition title="A familiar face behind a strange name" depth="standard"}
GATE often invents a symbol, $*$ or $\#$, defines it by a formula or by a few properties, and asks
about it. There are only sixteen two-input operators, so the invented one is always an old friend in
disguise. Compute its four outputs, recognise it (XNOR, implication, NAND, …), and every law you
already know about that friend applies at once.
:::

:::definition{#defined-operators term="Method: questions about a defined operator" depth="quick"}
1. **Identify it.** Compute its four outputs (rows 00, 01, 10, 11) from the definition and look the
   column up: $AB + A'B'$ is XNOR (1001), $x' + y$ is implication (1101), a table 0110 is XOR.
2. **Use the known laws** of that operator (XNOR: commutative, associative, $A \odot A = 1$,
   $1 \odot B = B$; implication: $x \to 0 = x'$, $x \to x = 1$).
3. **If it is none of the named ones**, work row by row.
:::

:::definition{#nested term="Method: nested expressions" depth="quick"}
Evaluate a nest such as $f(f(x + y, y), z)$ **from the inside out**: simplify the inner call to a
short expression, substitute it, simplify again. Simplifying at every level keeps the algebra small.
:::

### Worked examples: defined and nested operators

::::example{#ex-def-imp level="easy" title="An implication operator" depth="quick"}
Let $x * y = x' + y$. Find $x * x$, $x * 0$ and $1 * y$.

:::step{why="Substitute into the definition each time."}
$x * x = x' + x = 1$.
:::

:::step{why="OR with 0 changes nothing."}
$x * 0 = x' + 0 = x'$.
:::

:::step{why="1′ = 0."}
$1 * y = 0 + y = y$.
:::

:::answer
$1$, $x'$, $y$.
:::
::::

::::example{#ex-def-xnor level="medium" title="An XNOR in disguise" depth="standard"}
Let $A \circ B = AB + A'B'$. Simplify $(A \circ B) \circ B$.

:::step{why="Compute the column: rows 00, 01, 10, 11 give 1, 0, 0, 1."}
$\circ$ is XNOR, so it is associative and $B \circ B = 1$.
:::

:::step{why="Regroup using associativity."}
$(A \circ B) \circ B = A \circ (B \circ B) = A \circ 1$.
:::

:::step{why="XNOR with 1 copies its other input."}
$A \circ 1 = A \cdot 1 + A' \cdot 0 = A$.
:::

:::answer
$A$.
:::
::::

::::example{#ex-def-props level="gate" title="An operator given by four properties" depth="standard"}
An operator $\#$ satisfies $x \# 0 = x'$, $x \# 1 = x$, $x \# x = 1$ and $x \# x' = 0$. What is $x \# y$?

:::step{why="The first two properties already give all four rows."}
$x \# 0 = x'$: rows $(0, 0) \to 1$, $(1, 0) \to 0$. $x \# 1 = x$: rows $(0, 1) \to 0$, $(1, 1) \to 1$.
:::

:::step{why="Read the column in row order 00, 01, 10, 11."}
1, 0, 0, 1: XNOR.
:::

:::step{why="Check the other two properties for consistency."}
$x \odot x = 1$ and $x \odot x' = 0$. Both hold.
:::

:::answer
$x \# y = xy + x'y' = x \odot y$.
:::
::::

::::example{#ex-def-nest level="gate" title="Edge case: a NOR nest" depth="standard"}
Let $f(A, B) = (A + B)'$. Simplify $f(f(x, x), f(y, y))$ and $f(f(x, y), f(x, y))$.

:::step{why="Tying both inputs of a NOR gives a NOT."}
$f(x, x) = x'$ and $f(y, y) = y'$.
:::

:::step{why="NOR of two complements is an AND by De Morgan."}
$f(x', y') = (x' + y')' = xy$.
:::

:::step{why="NOR of a signal with itself inverts it, so the second nest is NOT(NOR) = OR."}
$f(f(x, y), f(x, y)) = \big((x + y)'\big)' = x + y$.
:::

:::answer
$xy$ and $x + y$: NOR alone builds AND and OR (Lesson 5 makes this systematic).
:::
::::

:::note{#recap-defined title="Recap" depth="quick"}
Identify a defined operator by its four outputs, then use its laws. Evaluate nests from the inside
out, simplifying at every level.
:::

## GATE questions on this lesson

All sixteen previous-year questions, grouped by idea. Try each before opening the solution.

:::pyq{id="cse-2013-cs-21" tests="complement-inputs,xnor-forms" depth="standard"}
:::

:::pyq{id="cse-2018-cs-4" tests="complement-inputs,xor-laws" depth="standard"}
:::

:::pyq{id="cse-2026-1-cs-11" tests="xor-forms,complement-inputs,disjoint-or" depth="standard"}
:::

:::pyq{id="cse-2014-3-cs-55" tests="xor-laws,xor-assoc,trick-flatten" depth="standard"}
:::

:::pyq{id="it-2005-cs-7" tests="parity,xor-forms" depth="standard"}
:::

:::pyq{id="cse-2016-2-cs-8" tests="parity,complement-inputs" depth="standard"}
:::

:::pyq{id="cse-1998-a-13" tests="iterated-xor,trap-n-times" depth="standard"}
:::

:::pyq{id="cse-1992-a-2-i" tests="operator-properties,nand-not-assoc" depth="standard"}
:::

:::pyq{id="cse-1998-a-43" tests="nand-not-assoc,test-from-table" depth="standard"}
:::

:::pyq{id="cse-2015-1-cs-28" tests="test-from-table,xor-assoc" depth="standard"}
:::

:::pyq{id="cse-2016-1-cs-6" tests="defined-operators,xor-laws" depth="standard"}
:::

:::pyq{id="cse-1994-a-27-a-i" tests="defined-operators,xnor-equivalence" depth="standard"}
:::

:::pyq{id="cse-1994-a-27-a-ii" tests="xnor-equivalence,xor-solve" depth="standard"}
:::

:::pyq{id="cse-2007-cs-33" tests="xnor-equivalence,xor-solve,xnor-chain" depth="standard"}
:::

:::pyq{id="cse-1997-a-11" tests="implication,nested" depth="standard"}
:::

:::pyq{id="cse-2002-a-28" tests="nested,implication" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need
care.

:::practice{id="nx-dl-02-03-q01" depth="standard"}
:::

:::practice{id="nx-dl-02-03-q02" depth="standard"}
:::

:::practice{id="nx-dl-02-03-q03" depth="standard"}
:::

:::practice{id="nx-dl-02-03-q04" depth="standard"}
:::

:::practice{id="nx-dl-02-03-q05" depth="standard"}
:::

:::practice{id="nx-dl-02-03-q06" depth="standard"}
:::

:::practice{id="nx-dl-02-03-q07" depth="standard"}
:::

:::practice{id="nx-dl-02-03-q08" depth="standard"}
:::

:::practice{id="nx-dl-02-03-q09" depth="standard"}
:::

## Summary

:::summary{#summary-card title="XOR, XNOR and operators on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Forms | $x \oplus y = x'y + xy' = (x + y)(xy)'$; $x \odot y = xy + x'y' = (x \oplus y)'$ |
| Laws | $x \oplus 0 = x$, $x \oplus 1 = x'$, $x \oplus x = 0$, $x \oplus x' = 1$; commutative, associative |
| Cancel / move across | $x \oplus y = x \oplus z \Rightarrow y = z$; $a \oplus b = c \iff a = b \oplus c$ |
| Complemented inputs | $x' \oplus y = x \oplus y' = x \odot y$; $x' \oplus y' = x \oplus y$ (count the complements) |
| Arithmetic view | $x \oplus y = x + y - 2xy$; $x + y = x \oplus y \oplus xy$; $xy = 0 \Rightarrow x + y = x \oplus y$ |
| Distributive | $x(y \oplus z) = xy \oplus xz$; OR does **not** distribute over XOR |
| Parity | $n$-input XOR = 1 iff odd number of 1s; $k$ copies of $B$ give $B$ (odd $k$) or 0 |
| XNOR chain | equals the XOR chain for an odd number of variables, its complement for even |
| Operators | commutative: rows 01 = 10; associative: 8-row test; NAND/NOR not associative |
| Defined operators | identify the column, then use its laws; evaluate nests inside out |
:::

:::note{#further-depth title="Further depth: XOR in codes and cryptography" depth="deep"}
Because $x \oplus k \oplus k = x$, XOR with a secret key $k$ both encrypts and decrypts (the one-time
pad); because XOR is addition with no carry, error-detecting codes (parity, Hamming, CRC) are
computed with XOR trees; and because the minterms of $x_1 \oplus \dots \oplus x_n$ form a
checkerboard, no two of them are adjacent, which is why parity functions are the worst case for
K-map simplification (Chapter 3).
:::
