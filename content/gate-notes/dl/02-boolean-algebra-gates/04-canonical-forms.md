---
id: canonical-forms
subject: dl
chapter: boolean-algebra-gates
title: Minterms, maxterms and canonical forms
order: 4
prerequisites: [boolean-laws]
pyq_topics: [dl/boolean]
est_minutes: 50
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every minterm list, count and answer is checked by enumeration in content/gate-notes/_checks/dl/l2_04_canonical_forms.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 36–37 and 43, set B pp. 105–108 and 112–113, set C pp. 192–198, 241–244, 253–254 and 268–269, set E p. 408. Set C's 'number of variables = 2ⁿ' slip is recorded in _errata/dl.md."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (canonical and standard forms); counting results re-derived by brute force over every function of up to four variables."
  - "PYQs: src/gate/questions.json (dl/boolean); all eight keys are re-derived by enumeration in l2_04_canonical_forms.py."
updated: "2026-10-17"
---

A truth table lists, row by row, where a function is 1. This lesson turns that list into an
expression: every function is an OR of "row detectors" called minterms (and, dually, an AND of
maxterms), and that expression is unique. Once functions are lists of rows, AND, OR, XOR and NOT
become set operations, counting functions becomes counting subsets, and two classic GATE topics
fall out: how many functions of $n$ variables exist, and how many of them are **self-dual**.

## Where this fits

[Lesson 2](lesson:boolean-laws) simplified expressions by algebra; here we go the other way, to
the *fully expanded* standard form, because it is the one that is unique. Lesson 5 uses the canonical form
to prove that {AND, OR, NOT} can build every function; Lesson 6 uses minterm-set algebra to read
circuits made of function blocks; and Chapter 3 (K-maps) starts from the minterm list.

:::table{#radar title="GATE radar: minterms, maxterms and counting" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 8 (2001–2025) |
| Marks | 4 one-mark, 3 two-mark, 1 descriptive |
| Pattern 1 | Expand an expression into minterms: 2010 |
| Pattern 2 | Σ and Π forms of the same function: 2015, 2024 |
| Pattern 3 | Which expressions equal the complement: 2021 |
| Pattern 4 | Counting: all functions (2007), self-dual functions (2014); is a function self-dual (2001) |
| Pattern 5 | The majority function: 2024, 2025 |
| What examiners test | Index conventions (first variable = MSB), Σ vs Π lists, and the complementary-pair argument for self-duality |
:::

## The idea: one detector per 1-row

:::intuition{#row-detectors title="Build f from row detectors" depth="standard"}
Suppose a function of $A, B, C$ is 1 exactly on rows 011 and 110. Build a tiny circuit that is 1
**only** on row 011: it must check "$A$ is 0, $B$ is 1, $C$ is 1", which is the product $A'BC$. Build
another that is 1 only on row 110: $ABC'$. Now OR the two detectors: the result is 1 on row 011
(the first detector fires), on row 110 (the second fires), and nowhere else. So
$f = A'BC + ABC'$.

This works for **every** function: one detector per 1-row, all ORed together. A detector is called a
**minterm**, and the OR of the detectors is the **canonical sum of products**. It needs no cleverness
at all, which is why it is the starting point of every systematic method.
:::

## Terms, SOP and POS

:::definition{#terms-def term="Literals, product terms and sum terms" depth="quick"}
- A **literal** is a variable or its complement: $A$, $A'$.
- A **product term** is an AND of literals: $AB'C$, $B'$.
- A **sum term** is an OR of literals: $A + B' + C$.
:::

:::definition{#sop-pos term="Sum of products and product of sums" depth="quick"}
- A **sum of products (SOP)** is an OR of product terms: $AB + A'C$.
- A **product of sums (POS)** is an AND of sum terms: $(A + B)(A' + C)$.

Every function has many SOP and POS forms. Two of them are special because they are unique: the
canonical forms below.
:::

## Minterms and maxterms

:::definition{#minterm-def term="Minterm" depth="quick"}
For $n$ variables, a **minterm** is a product term containing every variable exactly once (plain or
complemented). Minterm $m_i$ is the one that is 1 **only on row $i$**: write $i$ in binary with $n$
bits, then use $x$ where the bit is 1 and $x'$ where it is 0. The **first variable is the most
significant bit**.

Example, $f(A, B, C)$: $m_5$ is row $101$, so $m_5 = AB'C$; $m_0 = A'B'C'$; $m_7 = ABC$.
:::

:::definition{#maxterm-def term="Maxterm" depth="quick"}
A **maxterm** is a sum term containing every variable exactly once. Maxterm $M_i$ is the one that is
0 **only on row $i$**: use $x$ where the bit is **0** and $x'$ where it is 1 (the opposite of a
minterm), so that every literal is 0 on that row.

Example, $f(A, B, C)$: $M_5$ is 0 only on row 101, so $M_5 = A' + B + C'$.
:::

:::definition{#minterm-maxterm-complement term="Minterms and maxterms are complements" depth="quick"}
$M_i = (m_i)'$. By De Morgan, $(AB'C)' = A' + B + C'$: the maxterm with the same index. So "$m_i$ is
1 only on row $i$" and "$M_i$ is 0 only on row $i$" are the same statement.
:::

## The canonical forms

:::theorem{#canonical-sop name="Canonical sum of products" depth="standard"}
Every Boolean function equals the OR of the minterms of the rows where it is 1:
$$
f = \sum_{i \,:\, f(i) = 1} m_i ,
$$
written in short as $f = \Sigma m(i_1, i_2, \dots)$ or $\Sigma(i_1, i_2, \dots)$.
:::

:::proof{#proof-canonical-sop of="the canonical SOP" depth="standard"}
**Idea first:** compare both sides on each row; on any row, exactly one minterm is 1.

Take any row $r$. Every minterm except $m_r$ is 0 on row $r$. If $f(r) = 1$, then $m_r$ is in the sum,
so the sum is 1 on row $r$. If $f(r) = 0$, then $m_r$ is not in the sum and every term in it is 0 on
row $r$, so the sum is 0. The two sides agree on every row.
:::

:::definition{#canonical-pos term="Canonical product of sums" depth="quick"}
Dually, every function is the AND of the maxterms of the rows where it is **0**:
$$
f = \prod_{i \,:\, f(i) = 0} M_i = \Pi M(j_1, j_2, \dots).
$$
On a 0-row $r$, the factor $M_r$ is 0, so the product is 0; on a 1-row every factor is 1.
:::

:::theorem{#canonical-unique name="The canonical forms are unique" depth="standard"}
Two expressions **over the same ordered variable list** describe the same function exactly when they have the same minterm list (equivalently,
the same maxterm list). In particular every function has exactly one canonical SOP and one canonical POS.
:::

:::proof{#proof-canonical-unique of="uniqueness of the canonical forms" depth="standard"}
**Idea first:** a canonical SOP is a list of 1-rows, and a function determines its own 1-rows.

The minterm list in $\Sigma m(\dots)$ is, by the proof above, exactly the set of rows where the
expression is 1. A function has one such set, so it has one list (up to the order of writing). Two
expressions are therefore equal iff their lists are equal. The same argument with 0-rows gives the
POS. This is why GATE options are best compared by their minterm lists.
:::

:::viz{#highlighter-viz spec="minterm-highlighter" mode="animate" depth="standard"}
:::

## Converting between Σ and Π

:::definition{#sigma-pi term="Σ and Π lists are complementary" depth="quick"}
For $n$ variables, write $R = \{0, 1, \dots, 2^n - 1\}$ for all rows. If $f = \Sigma m(S)$ then
$$
f = \Pi M(R \setminus S), \qquad f' = \Sigma m(R \setminus S) = \Pi M(S) .
$$
The 1-rows of $f$ are its minterms, the 0-rows its maxterms, and complementing $f$ swaps the two.
Example over three variables: $\Sigma m(2, 3, 5, 6, 7) = \Pi M(0, 1, 4)$.
:::

:::trap{#trap-sigma-pi title="Same list, Σ or Π: two different functions" depth="quick"}
$\Sigma(4, 5, 6)$ and $\Pi(4, 5, 6)$ are **not** the same function: the first is 1 on rows 4, 5, 6;
the second is 0 on rows 4, 5, 6 (so it is 1 on the other five). In fact $\Pi M(S) = \big(\Sigma m(S)\big)'$.
Examiners pair a correct $\Sigma$ list with the same numbers under $\Pi$ to catch this.
:::

## Expanding a term into minterms

:::definition{#expand-terms term="Method: expanding a sum of products into minterms" depth="quick"}
A product term that lacks some variables covers every row consistent with the literals it has.
Algebraically, multiply in $(v + v')$ for each missing variable $v$; for example over $A, B, C$:
$$
AB' = AB'(C + C') = AB'C + AB'C' = m_5 + m_4 .
$$
Do this for every term, then take the **union** of the minterm lists (a minterm reached twice is
listed once, because $x + x = x$).
:::

:::definition{#term-size term="How many minterms a term covers" depth="quick"}
A product term with $k$ literals in a function of $n$ variables covers exactly $2^{\,n - k}$ minterms:
the $k$ fixed variables leave $n - k$ free ones, each with two values. A single variable ($k = 1$)
covers half the rows; a minterm ($k = n$) covers one. Dually, a sum term with $k$ literals has
$2^{\,n - k}$ maxterms.
:::

:::trick{#trick-dash title="Write each term as a pattern with dashes" depth="standard"}
Write a product term as an $n$-symbol pattern: 1 for a plain literal, 0 for a complemented one, $-$
for a missing variable. Over $P, Q, R$: $PQ \to 11-$, $QR' \to -10$, $PR' \to 1-0$. Each dash takes
both values: $11- = \{110, 111\} = \{6, 7\}$, $-10 = \{2, 6\}$, $1-0 = \{4, 6\}$. The union is
$\{2, 4, 6, 7\}$.

**Why it works:** a missing variable is a free choice, which is exactly the $(v + v')$ expansion.
**When it fails:** only if you put the variables in the wrong order (the pattern must follow the
order the function is written in, $f(P, Q, R)$), or if the expression is not a sum of products yet
(expand any bars and brackets first).
:::

:::trap{#trap-var-order title="Indices depend on the variable order" depth="quick"}
The same expression has different minterm numbers under different variable orders. $AB'$ is
$\Sigma(4, 5)$ as $f(A, B, C)$ but $\Sigma(1, 3)$ as $f(B, C, A)$, because now $B$ is the most
significant bit and $A$ the least. Always use the order given in the question.
:::

:::trap{#trap-rows-functions title="Rows are not functions" depth="quick"}
$n$ variables give $2^n$ **rows** (minterms) but $2^{2^n}$ **functions**. Examiners offer $2^n$, $n^2$
and $2^{n^2}$ as distractors for "how many functions"; $2^n$ is the size of one truth table, not the
number of different tables.
:::

### Worked examples: minterms and canonical forms

::::example{#ex-can-list level="easy" title="Minterms of a two-term SOP" depth="quick"}
Find the minterm list of $f(A, B, C) = AB' + C$.

:::step{why="Write each term as a pattern over A, B, C."}
$AB' \to 10-$, $C \to --1$.
:::

:::step{why="Expand the dashes: each one doubles the rows."}
$10- = \{100, 101\} = \{4, 5\}$; $--1 = \{001, 011, 101, 111\} = \{1, 3, 5, 7\}$.
:::

:::step{why="OR is union; row 5 appears in both lists but is listed once."}
$\{1, 3, 4, 5, 7\}$.
:::

:::answer
$f = \Sigma m(1, 3, 4, 5, 7)$.
:::
::::

::::example{#ex-can-both level="medium" title="Both canonical forms" depth="standard"}
Write $F(A, B, C) = A + B'C$ in canonical SOP and canonical POS.

:::step{why="A alone fixes one variable, so it covers 2³⁻¹ = 4 rows; B′C fixes two, so 2 rows."}
$A \to 1-- = \{4, 5, 6, 7\}$; $B'C \to -01 = \{1, 5\}$.
:::

:::step{why="The union is the minterm list."}
$F = \Sigma m(1, 4, 5, 6, 7)$.
:::

:::step{why="The maxterms are the remaining rows."}
$F = \Pi M(0, 2, 3)$.
:::

:::step{why="Write the POS out to check: M₀ = A + B + C, M₂ = A + B′ + C, M₃ = A + B′ + C′."}
$F = (A + B + C)(A + B' + C)(A + B' + C')$; each factor is 0 on its own row and 1 elsewhere.
:::

:::answer
$\Sigma m(1, 4, 5, 6, 7) = \Pi M(0, 2, 3)$.
:::
::::

::::example{#ex-can-pos level="gate" title="From a POS to both lists" depth="standard"}
Find $\Sigma$ and $\Pi$ for $f(X, Y, Z) = (X + Y')(X' + Z)$.

:::step{why="A sum term is 0 only when every literal is 0; find those rows."}
$X + Y' = 0$ when $X = 0, Y = 1$: rows $01-$ = $\{2, 3\}$. $X' + Z = 0$ when $X = 1, Z = 0$: rows $1-0 = \{4, 6\}$.
:::

:::step{why="The product is 0 wherever any factor is 0."}
$f = \Pi M(2, 3, 4, 6)$.
:::

:::step{why="The minterms are the other rows."}
$f = \Sigma m(0, 1, 5, 7)$.
:::

:::answer
$f = \Sigma m(0, 1, 5, 7) = \Pi M(2, 3, 4, 6)$. (Check row 5 = 101: $(1 + 1)(0 + 1) = 1$.)
:::
::::

::::example{#ex-can-order level="gate" title="Edge case: the variable order changes the numbers" depth="standard"}
Give the minterm list of $AB'$ as a function $f(A, B, C)$ and as $g(C, B, A)$.

:::step{why="For f(A, B, C), A is the most significant bit: the pattern is 10− in the order A, B, C."}
$f$: rows 100, 101, so $\Sigma(4, 5)$.
:::

:::step{why="For g(C, B, A), C is the most significant bit and A the least: the pattern in the order C, B, A is −01."}
$g$: rows 001, 101, so $\Sigma(1, 5)$.
:::

:::answer
$\Sigma(4, 5)$ for $f(A, B, C)$, $\Sigma(1, 5)$ for $g(C, B, A)$: the same function, different numbers.
:::
::::

:::note{#recap-canonical title="Recap" depth="quick"}
$m_i$ is 1 only on row $i$, $M_i = m_i'$ is 0 only on row $i$ (first variable = MSB). Every function
is $\Sigma$ of its 1-rows and $\Pi$ of its 0-rows; both lists are unique and complementary. A
$k$-literal term covers $2^{n-k}$ minterms.
:::

## Functions as sets of rows

:::intuition{#sets-intuition title="A function is a set of lit squares" depth="standard"}
Draw the $2^n$ rows as squares on a strip and light the squares where the function is 1. A function
*is* its set of lit squares. Now two functions are two sets of lit squares, and the gates become set
operations you can see: AND keeps the squares lit in both, OR the squares lit in either, XOR the
squares lit in exactly one, NOT the dark squares. Questions about circuits of function blocks become
questions about overlapping sets.
:::

Once a function is a list of rows, its algebra is the algebra of sets.

:::theorem{#minterm-sets name="Minterm-set algebra" depth="standard"}
If $f = \Sigma(F)$ and $g = \Sigma(G)$ over the same variables, then
$$
f \cdot g = \Sigma(F \cap G), \quad f + g = \Sigma(F \cup G), \quad f \oplus g = \Sigma(F \,\triangle\, G), \quad f' = \Sigma(R \setminus F),
$$
where $\triangle$ is the symmetric difference (rows in exactly one of the sets) and $R$ is the set of
all rows.
:::

:::proof{#proof-minterm-sets of="minterm-set algebra" depth="standard"}
**Idea first:** decide each row separately.

On a row $r$: $f \cdot g$ is 1 iff both are 1, iff $r \in F$ and $r \in G$, iff $r \in F \cap G$. $f + g$
is 1 iff $r$ is in at least one set: $F \cup G$. $f \oplus g$ is 1 iff exactly one is 1: $r$ in one set
but not the other. $f'$ is 1 iff $f$ is 0: $r \notin F$. Each statement holds on every row, so the
functions are equal.
:::

:::viz{#sets-viz spec="minterm-set-venn" mode="animate" depth="standard"}
:::

:::trick{#trick-pair-sum title="Complementary rows add up to 2ⁿ − 1" depth="standard"}
The row whose bits are all flipped from row $i$ is row $2^n - 1 - i$: for three variables the pairs
are $(0, 7), (1, 6), (2, 5), (3, 4)$, for four variables $(0, 15), (1, 14), \dots, (7, 8)$.

**Why it works:** $i$ plus its bitwise complement is the all-ones pattern, $2^n - 1$. **When it fails:**
only with the wrong $n$; a "3-variable" list read as 4-variable pairs with 15, not 7.
:::

Try the set view yourself: enter two minterm lists and read off their AND, OR, XOR and complement.

:::lab{#lab-sets lab="gate-bench" tab="sets" depth="standard"}
:::

### Worked examples: minterm sets

::::example{#ex-set-ops level="easy" title="AND, OR and XOR of two lists" depth="quick"}
Over three variables, $f = \Sigma(0, 2, 3, 5)$ and $g = \Sigma(2, 5, 6)$. Find $f \cdot g$, $f + g$ and $f \oplus g$.

:::step{why="AND is intersection: rows in both lists."}
$f \cdot g = \Sigma(2, 5)$.
:::

:::step{why="OR is union."}
$f + g = \Sigma(0, 2, 3, 5, 6)$.
:::

:::step{why="XOR keeps the rows in exactly one list: union minus intersection."}
$f \oplus g = \Sigma(0, 3, 6)$.
:::

:::answer
$\Sigma(2, 5)$, $\Sigma(0, 2, 3, 5, 6)$, $\Sigma(0, 3, 6)$.
:::
::::

::::example{#ex-set-comp level="medium" title="A complement in both notations" depth="standard"}
Over three variables, $f = \Sigma(1, 2, 4)$. Write $f'$ as a $\Sigma$ list and as a $\Pi$ list.

:::step{why="The complement's 1-rows are f's 0-rows."}
$f' = \Sigma(0, 3, 5, 6, 7)$.
:::

:::step{why="f′ is 0 exactly where f is 1, so its maxterms are f's minterms."}
$f' = \Pi(1, 2, 4)$.
:::

:::answer
$f' = \Sigma(0, 3, 5, 6, 7) = \Pi(1, 2, 4)$; note that $\Pi(1, 2, 4)$ is $f'$, not $f$.
:::
::::

::::example{#ex-set-complement level="gate" title="Which expression is the complement?" depth="standard"}
Let $G(A, B, C) = (A + B)(A' + C)$. Show that $G' = A'B' + AC'$ by comparing lists.

:::step{why="A POS factor is 0 on the rows where all its literals are 0."}
$A + B = 0$ on rows $00- = \{0, 1\}$; $A' + C = 0$ on rows $1-0 = \{4, 6\}$. So $G = \Pi(0, 1, 4, 6) = \Sigma(2, 3, 5, 7)$.
:::

:::step{why="The complement is 1 on the 0-rows of G."}
$G' = \Sigma(0, 1, 4, 6)$.
:::

:::step{why="Expand the candidate: A′B′ = 00− and AC′ = 1−0."}
$A'B' + AC' = \{0, 1\} \cup \{4, 6\} = \Sigma(0, 1, 4, 6)$. Same list.
:::

:::answer
$G' = A'B' + AC'$ (it is also what De Morgan gives directly: complement each factor, swap the operator).
:::
::::

::::example{#ex-set-width level="gate" title="Edge case: the same list over three and four variables" depth="standard"}
Is $\Sigma(1, 3)$ over $(A, B, C)$ the same function as $\Sigma(1, 3)$ over $(A, B, C, D)$?

:::step{why="Decode the rows with 3 bits: 001 and 011, so A = 0, C = 1, B free."}
Over three variables: $A'C$.
:::

:::step{why="With 4 bits the rows are 0001 and 0011: A = B = 0, D = 1, C free."}
Over four variables: $A'B'D$.
:::

:::answer
No: a $\Sigma$ list only means something together with its variable list.
:::
::::

:::note{#recap-sets title="Recap" depth="quick"}
AND = ∩, OR = ∪, XOR = symmetric difference, NOT = complement, all on minterm lists over the same
variables. Complementary rows sum to $2^n - 1$.
:::

## Counting Boolean functions

:::intuition{#count-intuition title="Fill in the output column, one free choice per row" depth="standard"}
A truth table has a fixed left part (all input rows) and an output column you can fill in as you like.
Every way of filling it is a different function. So counting functions is counting ways to fill a
column of $2^n$ boxes with 0s and 1s, and each restriction ("exactly $k$ ones", "self-dual", "ignores
$x_1$") just ties some boxes together or fixes how many are 1.
:::

:::derivation{#count-functions of="the number of Boolean functions of n variables" depth="quick"}
A function is its output column. There are $2^n$ rows, and each row's output is chosen independently
as 0 or 1, so by the multiplication principle there are
$$
\underbrace{2 \times 2 \times \dots \times 2}_{2^n \text{ rows}} = 2^{2^n}
$$
functions of $n$ variables: 4 for $n = 1$, 16 for $n = 2$, 256 for $n = 3$, 65 536 for $n = 4$.
Equivalently: a function is a subset of the $2^n$ rows (its minterm list), and a set of size $2^n$ has
$2^{2^n}$ subsets.

**Sanity check.** $n = 1$: the four functions are $0$, $x$, $x'$, $1$.
:::

:::viz{#count-viz spec="function-count" mode="animate" depth="standard"}
:::

The same "choose the outputs" idea counts every restricted family GATE has asked about.

:::derivation{#count-k-minterms of="functions with exactly k minterms" depth="standard"}
Choosing a function with exactly $k$ minterms means choosing which $k$ of the $2^n$ rows are 1:
$$
\binom{2^n}{k} .
$$
At most $k$ minterms: $\sum_{j=0}^{k} \binom{2^n}{j}$. For $n = 3$: exactly 3 minterms, $\binom{8}{3} = 56$;
at most 3, $1 + 8 + 28 + 56 = 93$.
:::

:::definition{#neutral term="Neutral functions" depth="quick"}
A function is **neutral** (also called *balanced*, as in Lesson 1) when it has as many 1s as 0s: exactly $2^{n-1}$ minterms. Their number is
$\binom{2^n}{2^{n-1}}$: 6 for $n = 2$, 70 for $n = 3$. XOR and XNOR of any number of variables are
neutral.
:::

:::derivation{#count-independent of="functions that do not depend on a given variable" depth="standard"}
If $f$ ignores $x_1$, then rows that differ only in $x_1$ have equal outputs. The rows form $2^{n-1}$
such pairs, and one output is chosen per pair: $2^{2^{n-1}}$ functions. For $n = 3$ that is 16, which
is just "all functions of the other two variables".
:::

:::derivation{#count-nondegenerate of="functions that depend on every variable" depth="deep"}
Let $A_i$ be the set of functions that ignore $x_i$. A function ignoring a given set of $j$ variables
is a function of the other $n - j$, so there are $2^{2^{n-j}}$ of them. By inclusion–exclusion the
number depending on **all** $n$ variables is
$$
\sum_{j=0}^{n} (-1)^j \binom{n}{j}\, 2^{2^{n-j}} .
$$
$n = 2$: $16 - 2 \cdot 4 + 1 \cdot 2 = 10$ (all 16 except $0, 1, A, A', B, B'$). $n = 3$:
$256 - 3 \cdot 16 + 3 \cdot 4 - 2 = 218$.
:::

:::derivation{#count-symmetric of="symmetric functions" depth="deep"}
A **symmetric** function is unchanged by any permutation of its inputs, so its output depends only on
the **number** of 1s among the inputs, which is one of $0, 1, \dots, n$. Choosing the output for each of
these $n + 1$ counts gives $2^{n+1}$ symmetric functions: 16 for $n = 3$. Majority, parity, AND, OR,
NAND and NOR are all symmetric.
:::

:::derivation{#count-preserving of="0-preserving and 1-preserving functions" depth="deep"}
A function is **0-preserving** when $f(0, \dots, 0) = 0$: one row's output is fixed, the other
$2^n - 1$ are free, so there are $2^{2^n - 1}$ of them (half of all functions). The same count holds for
1-preserving ($f(1, \dots, 1) = 1$). These classes matter in Lesson 5.
:::

### Worked examples: counting functions

::::example{#ex-cnt-all level="easy" title="All functions of three variables" depth="quick"}
How many Boolean functions of 3 variables are there?

:::step{why="3 variables give 2³ = 8 rows."}
8 rows.
:::

:::step{why="Each row's output is a free binary choice."}
$2^8 = 256$.
:::

:::answer
256.
:::
::::

::::example{#ex-cnt-k level="medium" title="Exactly three minterms" depth="standard"}
How many functions of 3 variables have exactly 3 minterms?

:::step{why="A function with exactly three 1-rows is a choice of 3 rows out of 8."}
$\binom{8}{3}$.
:::

:::step{why="Compute the binomial coefficient."}
$\binom{8}{3} = \dfrac{8 \cdot 7 \cdot 6}{3 \cdot 2 \cdot 1} = 56$.
:::

:::answer
56.
:::
::::

::::example{#ex-cnt-neutral level="gate" title="Neutral functions" depth="standard"}
How many neutral functions of 3 variables are there, and how many of them are self-dual?

:::step{why="Neutral means exactly 2³⁻¹ = 4 minterms out of 8 rows."}
$\binom{8}{4} = 70$.
:::

:::step{why="A self-dual function has one minterm per complementary pair (proved in the next section), hence 4 of 8 rows, chosen one per pair."}
Self-dual: one choice per pair, 4 pairs, $2^4 = 16$.
:::

:::answer
70 neutral functions, of which 16 are self-dual.
:::
::::

::::example{#ex-cnt-both level="gate" title="Edge case: two-variable functions that use both variables" depth="standard"}
Of the 16 functions of $A$ and $B$, how many really depend on both?

:::step{why="Remove the functions that ignore A or ignore B; each family has 2^(2¹) = 4 members."}
Ignore $B$: $0, 1, A, A'$. Ignore $A$: $0, 1, B, B'$.
:::

:::step{why="The constants are in both families, so count the union by inclusion–exclusion: 4 + 4 − 2."}
$6$ functions ignore at least one variable.
:::

:::answer
$16 - 6 = 10$: AND, OR, NAND, NOR, XOR, XNOR and $AB'$, $A'B$, $A + B'$, $A' + B$ (inhibition and implication).
:::
::::

:::note{#recap-count title="Recap" depth="quick"}
$2^{2^n}$ functions; $\binom{2^n}{k}$ with $k$ minterms; $\binom{2^n}{2^{n-1}}$ neutral;
$2^{2^{n-1}}$ ignoring a given variable; $2^{n+1}$ symmetric; $2^{2^n - 1}$ 0-preserving.
:::

## Duals and self-dual functions

:::intuition{#selfdual-intuition title="A function that respects the mirror" depth="standard"}
Turn every input into its opposite. Most functions then do something unrelated. A **self-dual**
function answers with exactly the opposite of what it said before: the majority vote of three people
flips if every vote flips. Pair each row with its mirror row (all bits flipped); a self-dual function
must say "yes" on exactly one row of every mirror pair. That one picture gives both the test and the
count.
:::

[Lesson 2](lesson:boolean-laws) defined the dual of an *expression* (swap $+$ and $\cdot$, swap 0 and
1). Here is what it does to the *function*.

:::theorem{#dual-theorem name="The dual of a function is f(x′)′" depth="standard"}
For every expression $E$ of a function $f$, the dual expression $E^D$ computes
$$
f^D(x_1, \dots, x_n) = \big(f(x_1', \dots, x_n')\big)' .
$$
So the dual depends only on the function, not on the expression chosen for it.
:::

:::proof{#proof-dual-theorem of="the dual as a function" depth="standard"}
**Idea first:** combine the general De Morgan rule with "complement every literal".

By the general De Morgan rule, $E'$ is obtained from $E$ by swapping $+$ and $\cdot$, swapping 0 and 1,
*and* complementing every literal: $E'$ is the dual expression with complemented literals, $f(x)' = E^D(x')$. Replace every
$x_i$ by $x_i'$ (which undoes the complemented literals): $f(x')' = E^D(x)$. So the dual expression
computes $x \mapsto f(x')'$.

**Sanity check.** $f = AB$: $f(A', B')' = (A'B')' = A + B$, which is the dual expression of $AB$.
:::

:::definition{#dual-vs-complement term="Dual versus complement" depth="quick"}
| | Rule on the expression | As a function |
|:--|:--|:--|
| complement $f'$ | swap operators, complement literals | $f'(x) = f(x)'$ |
| dual $f^D$ | swap operators, keep literals | $f^D(x) = f(x')'$ |

They coincide only for special functions. Example $f = x' + y'$: $f' = xy$, $f^D = x'y'$.
:::

:::definition{#self-dual-def term="Self-dual function" depth="quick"}
$f$ is **self-dual** when $f = f^D$, that is when
$$
f(x_1', \dots, x_n') = f(x_1, \dots, x_n)' \quad \text{for every input:}
$$
complementing **all** the inputs complements the output.
:::

:::theorem{#self-dual-test name="The complementary-pair test" depth="standard"}
Pair each row $i$ with its complement row $2^n - 1 - i$. Then $f$ is self-dual exactly when, in
**every** pair, **exactly one** of the two rows is a minterm.

Consequences: a self-dual function has exactly $2^{n-1}$ minterms (it is neutral), and it never
contains both $m_i$ and $m_{2^n - 1 - i}$.
:::

:::proof{#proof-self-dual-test of="the complementary-pair test" depth="standard"}
**Idea first:** complementing every input of row $i$ lands on row $2^n - 1 - i$.

Complementing all the bits of $i$ gives the bitwise complement, whose value is $2^n - 1 - i$. So the
condition $f(x') = f(x)'$ for every input says exactly that $f(i) \ne f(2^n - 1 - i)$ for every $i$: in
each pair one row is a 1 (a minterm) and the other a 0. The pairs partition the $2^n$ rows into
$2^{n-1}$ pairs, so there are exactly $2^{n-1}$ minterms.
:::

:::viz{#pairs-viz spec="self-dual-pairs" mode="animate" depth="standard"}
:::

:::derivation{#self-dual-count of="the number of self-dual functions" depth="quick"}
The $2^n$ rows split into $2^{n-1}$ complementary pairs. A self-dual function is fixed by choosing, in
each pair, which of the two rows is the minterm (then the other is not). That is one binary choice per
pair:
$$
\#\{\text{self-dual functions of } n \text{ variables}\} = 2^{2^{n-1}} .
$$
$n = 1$: 2 ($x$ and $x'$). $n = 2$: 4 ($A$, $B$, $A'$, $B'$). $n = 3$: 16. $n = 4$: 256.

**Sanity check for $n = 2$.** The pairs are (0, 3) and (1, 2). Choosing $\{0, 1\}$ gives $A'$, $\{0, 2\}$
gives $B'$, $\{3, 1\}$ gives $B$, $\{3, 2\}$ gives $A$: four functions, as predicted.
:::

:::definition{#neutral-vs-self-dual term="Neutral is necessary, not sufficient" depth="standard"}
Every self-dual function is neutral, but most neutral functions are not self-dual: for $n = 3$, 70
are neutral and only 16 self-dual. Example: $x \oplus y$ (two variables) has two minterms out of four,
so it is neutral, but its minterms 1 and 2 form a complementary pair. Not self-dual.
:::

:::definition{#self-dual-closure term="Facts about self-dual functions" depth="deep"}
- The complement of a self-dual function is self-dual: if $f(x') = f(x)'$ then $f'(x') = f(x) = (f'(x))'$.
- Complementing any one input of a self-dual function keeps it self-dual (the pairs are mapped to pairs).
- An XOR of an **odd** number of variables is self-dual (complementing all inputs adds an odd number of
  1s); an XOR of an even number is not.
- The majority function (next) is self-dual.
:::

:::trap{#trap-dual-not-complement title="Self-dual does not mean 'equal to its complement'" depth="quick"}
No function equals its own complement (they differ on every row). Self-dual means equal to its
**dual**, $f(x')'$. Students who test "$f = f'$" conclude that nothing is self-dual; students who
only test "4 minterms out of 8" conclude that every neutral function is. Use the pair test.
:::

## The majority function

:::intuition{#majority-intuition title="Three judges, and the tie-breaker" depth="standard"}
Three judges vote; the majority wins. If two judges already agree, the third judge's vote cannot change
the outcome. If the first two disagree, the third judge decides alone. These two sentences prove almost
every majority identity GATE asks about.
:::

:::definition{#majority term="The majority function" depth="quick"}
$M(a, b, c)$ is 1 when at least two of its three inputs are 1:
$$
M(a, b, c) = ab + bc + ca = \Sigma(3, 5, 6, 7) = \Pi(0, 1, 2, 4).
$$
Properties used in GATE:
- **Two equal inputs decide:** $M(a, a, b) = a \cdot a + ab + ba = a + ab = a$ (absorption).
- **Self-dual:** its dual is $(a + b)(b + c)(c + a)$; $(a + b)(b + c) = b + ac$ and
  $(b + ac)(c + a) = bc + ab + ac$, the original. In pair terms it takes 7, 6, 5, 3 from the pairs
  (0, 7), (1, 6), (2, 5), (3, 4).
- **Fixing one input:** $M(a, b, 0) = ab$ and $M(a, b, 1) = a + b$.
- **Symmetric and monotone:** permuting the inputs changes nothing, and turning an input from 0 to 1 never
  turns the output from 1 to 0.
- It depends on all three inputs (it is not independent of any of them).
- It is the carry-out of a full adder (Chapter 5).
:::

:::theorem{#majority-cases name="The tie-breaker rule" depth="standard"}
For all $a, b, c$: if $a = b$ then $M(a, b, c) = a$, and if $a \ne b$ then $M(a, b, c) = c$.
:::

:::proof{#proof-majority-cases of="the tie-breaker rule" depth="standard"}
**Idea first:** with only two input values, two equal inputs are already a majority.

If $a = b$, then $M(a, a, c) = a$ by the absorption computation above. If $a \ne b$, one of $a, b$ is 0
and the other 1, so $ab = 0$ and $a + b = 1$; then $M = ab + c(a + b) = 0 + c = c$.
:::

To prove an identity about $M$, split into the two cases of the rule on a well-chosen pair of inputs.
Two cases settle almost any majority identity.

### Worked examples: the majority function

::::example{#ex-maj-eval level="easy" title="Evaluate the majority" depth="quick"}
Find $M(1, 0, 1)$ and $M(0, 0, 1)$.

:::step{why="Count the 1s: at least two means 1."}
$M(1, 0, 1)$: two 1s, so 1.
:::

:::step{why="One 1 is not a majority."}
$M(0, 0, 1)$: one 1, so 0 (equivalently: the first two agree on 0, so they decide).
:::

:::answer
1 and 0.
:::
::::

::::example{#ex-maj-fix level="medium" title="Fix one input to a constant" depth="standard"}
Simplify $M(a, b, 0)$ and $M(a, b, 1)$.

:::step{why="Substitute c = 0 into ab + bc + ca."}
$M(a, b, 0) = ab + 0 + 0 = ab$.
:::

:::step{why="Substitute c = 1."}
$M(a, b, 1) = ab + b + a = a + b$ (absorption).
:::

:::answer
$ab$ and $a + b$: a majority gate with a constant input is an AND or an OR.
:::
::::

::::example{#ex-maj-selfdual level="gate" title="Prove that majority is self-dual by the tie-breaker rule" depth="standard"}
Show $M(a', b', c') = M(a, b, c)'$.

:::step{why="Use the rule on the pair (a, b); complementing preserves equality of a and b."}
If $a = b$: $M(a', b', c') = a'$ and $M(a, b, c)' = a'$. Equal.
:::

:::step{why="If a ≠ b then also a′ ≠ b′, so the third input decides on both sides."}
If $a \ne b$: $M(a', b', c') = c'$ and $M(a, b, c)' = c'$. Equal.
:::

:::answer
Equal in both cases, so $M$ is self-dual.
:::
::::

::::example{#ex-maj-edge level="gate" title="Edge case: a complemented pair as two of the inputs" depth="standard"}
Simplify $M(a, b, a')$.

:::step{why="The inputs a and a′ always disagree."}
Apply the tie-breaker rule to the pair $(a, a')$: they are never equal.
:::

:::step{why="So the remaining input decides."}
$M(a, b, a') = b$. Check: $ab + ba' + aa' = b(a + a') + 0 = b$.
:::

:::answer
$M(a, b, a') = b$, whatever $a$ is.
:::
::::

### Worked examples: duals and self-duality

::::example{#ex-sd-dual level="easy" title="The dual of a sum of products" depth="quick"}
Find the dual of $f = AB + C$.

:::step{why="Swap + and · and keep the grouping: AB becomes (A + B), and the outer + becomes ·."}
$f^D = (A + B) \cdot C$.
:::

:::step{why="Check with f(x′)′ on one row: A = 1, B = 0, C = 1. f(0, 1, 0) = 0 + 0 = 0, so f^D = 1."}
$(1 + 0) \cdot 1 = 1$. Consistent.
:::

:::answer
$f^D = (A + B)C = AC + BC$.
:::
::::

::::example{#ex-sd-test level="medium" title="Testing Σ(0, 3, 5, 6) for self-duality" depth="standard"}
Is $f(A, B, C) = \Sigma(0, 3, 5, 6)$ self-dual?

:::step{why="List the complementary pairs for n = 3."}
$(0, 7), (1, 6), (2, 5), (3, 4)$.
:::

:::step{why="Mark which member of each pair is a minterm."}
$(0, 7)$: 0. $(1, 6)$: 6. $(2, 5)$: 5. $(3, 4)$: 3. Exactly one in every pair.
:::

:::step{why="As a cross-check, rows 000, 011, 101, 110 all have an even number of 1s, so f is even parity, and an odd-length parity function is self-dual."}
So $f$ is self-dual. (It is the even-parity function $(A \oplus B \oplus C)'$, an odd number of variables.)
:::

:::answer
Yes, $\Sigma(0, 3, 5, 6)$ is self-dual.
:::
::::

::::example{#ex-sd-count level="gate" title="Self-dual functions of four variables" depth="standard"}
How many self-dual functions of 4 variables exist?

:::step{why="Four variables give 16 rows, which form 16 / 2 = 8 complementary pairs."}
$2^{n-1} = 8$ pairs.
:::

:::step{why="One free binary choice per pair."}
$2^8 = 256$.
:::

:::answer
256 (out of $2^{16} = 65\,536$ functions).
:::
::::

::::example{#ex-sd-xor level="gate" title="Edge case: XOR of two and of three variables" depth="standard"}
Is $x \oplus y$ self-dual? Is $x \oplus y \oplus z$?

:::step{why="Two variables: pairs (0, 3) and (1, 2). x ⊕ y = Σ(1, 2) takes both rows of the second pair and none of the first."}
$x \oplus y$ is neutral but **not** self-dual. Directly: $x' \oplus y' = x \oplus y$, which is not the complement.
:::

:::step{why="Three variables: x ⊕ y ⊕ z = Σ(1, 2, 4, 7); pairs (0, 7), (1, 6), (2, 5), (3, 4) contribute 7, 1, 2, 4."}
One per pair: **self-dual**. Directly: $x' \oplus y' \oplus z' = x \oplus y \oplus z \oplus 1$, the complement.
:::

:::answer
$x \oplus y$: no. $x \oplus y \oplus z$: yes.
:::
::::

:::note{#recap-selfdual title="Recap" depth="quick"}
$f^D(x) = f(x')'$. Self-dual: exactly one row of every complementary pair $(i, 2^n - 1 - i)$ is a
minterm; there are $2^{2^{n-1}}$ such functions. Majority $ab + bc + ca$ is self-dual and
$M(a, a, b) = a$.
:::

## GATE questions on this lesson

All eight previous-year questions. Try each before opening the solution.

:::pyq{id="cse-2007-cs-3" tests="count-functions" depth="standard"}
:::

:::pyq{id="cse-2010-cs-6" tests="expand-terms,minterm-def,trick-dash" depth="standard"}
:::

:::pyq{id="cse-2015-3-cs-44" tests="sigma-pi,canonical-pos,trap-sigma-pi" depth="standard"}
:::

:::pyq{id="cse-2024-1-cs-37" tests="sigma-pi,majority" depth="standard"}
:::

:::pyq{id="cse-2021-1-cs-42" tests="minterm-sets,sigma-pi" depth="standard"}
:::

:::pyq{id="cse-2001-b-58-a" tests="self-dual-test,trick-pair-sum" depth="standard"}
:::

:::pyq{id="cse-2014-2-cs-6" tests="self-dual-count,dual-theorem" depth="standard"}
:::

:::pyq{id="cse-2025-1-cs-14" tests="majority" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need
care.

:::practice{id="nx-dl-02-04-q01" depth="standard"}
:::

:::practice{id="nx-dl-02-04-q02" depth="standard"}
:::

:::practice{id="nx-dl-02-04-q03" depth="standard"}
:::

:::practice{id="nx-dl-02-04-q04" depth="standard"}
:::

:::practice{id="nx-dl-02-04-q05" depth="standard"}
:::

:::practice{id="nx-dl-02-04-q06" depth="standard"}
:::

:::practice{id="nx-dl-02-04-q07" depth="standard"}
:::

:::practice{id="nx-dl-02-04-q08" depth="standard"}
:::

:::practice{id="nx-dl-02-04-q09" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Canonical forms and counting on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Minterm / maxterm | $m_i$ = 1 only on row $i$; $M_i = m_i'$ = 0 only on row $i$; first variable = MSB |
| Canonical forms | $f = \Sigma m(\text{1-rows}) = \Pi M(\text{0-rows})$; unique |
| Σ ↔ Π | complementary lists; $f' = \Sigma(\text{0-rows}) = \Pi(\text{1-rows})$ |
| Term size | $k$ literals of $n$ variables cover $2^{n-k}$ minterms (dash patterns) |
| Set algebra | AND ∩, OR ∪, XOR △, NOT complement |
| Count | $2^{2^n}$ all; $\binom{2^n}{k}$ with $k$ minterms; $\binom{2^n}{2^{n-1}}$ neutral; $2^{n+1}$ symmetric |
| Dual | $f^D(x) = f(x')'$; dual ≠ complement |
| Self-dual | one row of each pair $(i, 2^n - 1 - i)$; count $2^{2^{n-1}}$ (16 for $n = 3$) |
| Majority | $ab + bc + ca = \Sigma(3, 5, 6, 7)$; self-dual; $M(a, a, b) = a$ |
:::

:::note{#further-depth title="Further depth: Dedekind numbers" depth="deep"}
Some families resist a closed formula. The **monotone** functions of $n$ variables (those that never
go from 1 to 0 when an input rises; equivalently, those that can be written without any complemented
literal) number 3, 6, 20, 168, 7581, … for $n = 1, 2, 3, 4, 5$: the Dedekind numbers, for which no
closed formula is known. By contrast, every family in this lesson has a one-line count because each is
"choose an output per class of rows".
:::
