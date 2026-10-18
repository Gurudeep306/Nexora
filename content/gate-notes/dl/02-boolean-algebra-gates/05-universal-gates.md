---
id: universal-gates
subject: dl
chapter: boolean-algebra-gates
title: Universal gates and functional completeness
order: 5
prerequisites: [canonical-forms]
pyq_topics: [dl/gates]
est_minutes: 55
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every construction, minimum gate count (by exhaustive search) and completeness claim is checked in content/gate-notes/_checks/dl/l2_05_universal_gates.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 29–32 and 43, set B pp. 111–112 and 117–118, set C pp. 229–232, 250–252 and 279, set D p. 400. Set D's MUX-cascade slip and the NAND/NOR speed disagreement are recorded in _errata/dl.md."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (NAND and NOR implementation); E. L. Post, The two-valued iterative systems of mathematical logic (1941), for the completeness criterion, in the standard modern statement."
  - "PYQs: src/gate/questions.json (dl/gates); all eleven keys are re-derived in l2_05_universal_gates.py, which also proves that the stored key of cse-2009-cs-6 is wrong (fixed in src/gate/fixes/cse-2009.json)."
updated: "2026-10-17"
---

A chip factory would love to make only one kind of gate. This lesson shows that it can: NAND alone,
or NOR alone, builds every Boolean function. You will learn the standard constructions and the
minimum gate counts GATE asks about (XOR needs exactly four NANDs), convert AND–OR circuits into
NAND–NAND circuits by moving bubbles, and then answer the deeper question behind a whole family of
GATE questions: given a set of gates, or a strange new gate, **can it build everything?** Post's
five classes turn that question into a checklist.

## Where this fits

Lessons [1](lesson:logic-gates) to [4](lesson:canonical-forms) gave you the gates, their algebra and
the canonical SOP, which writes every function with AND, OR and NOT. Here that fact becomes the
foundation of universality. Chapter 3 minimises the two-level circuits built here, and Chapter 5
shows that a multiplexer is also a universal building block.

:::table{#radar title="GATE radar: universal gates and completeness" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 11 (1992–2015) |
| Marks | 3 one-mark, 2 two-mark, 6 descriptive or MSQ from older papers |
| Pattern 1 | Minimum number of NAND or NOR gates for a function: 2004 (XOR), 2009 ($AB + C$) |
| Pattern 2 | Rewrite a circuit or expression with NANDs only: 1995, 2002 |
| Pattern 3 | Which sets of gates are functionally complete: 1992, 1999, 2015 |
| Pattern 4 | Show that a given gate (half adder, implication) is complete: 1993, 1998 |
| Pattern 5 | Properties of NAND as an operator: 2015 |
| What examiners test | Single-literal terms in NAND–NAND, minimality arguments, and whether constants 0 and 1 are allowed |
:::

## The idea: one brick for every building

:::intuition{#one-brick title="Why one gate can be enough" depth="standard"}
Lesson 4 showed that every function is an OR of minterms, and a minterm is an AND of literals. So
three gates, AND, OR and NOT, are enough for everything. Now notice that you do not even need all
three: De Morgan turns an OR into an AND with inverted inputs and output, so AND and NOT suffice.
Push one step further. A NAND is an AND with a NOT built in, and a NAND with its inputs tied is a NOT.
So a NAND can play both roles, and NAND alone is enough.

The same chain of reasoning answers the general question "is this set of gates enough?". Try to build
NOT and AND (or NOT and OR) from it. If you can, it is complete. If you can't, there is always a
reason, and Post's theorem lists the only five possible reasons.
:::

## Functional completeness

:::definition{#complete-def term="Functionally complete (universal) set" depth="quick"}
A set of gates (or Boolean operations) is **functionally complete** when every Boolean function, of
any number of variables, can be computed by a circuit that uses only gates from the set, with as
many copies of each as needed and any input wired to any number of gates. A single gate that is
complete on its own is called **universal**.

Whether the constants 0 and 1 may be used as inputs is part of the question. Unless it says
otherwise, GATE allows them; a set that is complete only with constants is sometimes called
**partially complete**.
:::

:::theorem{#aon-complete name="{AND, OR, NOT} is complete" depth="standard"}
Every Boolean function can be built from AND, OR and NOT gates.
:::

:::proof{#proof-aon-complete of="the completeness of AND, OR, NOT" depth="standard"}
**Idea first:** the canonical SOP is already a circuit.

Let $f$ be any function of $n$ variables. If $f$ is the constant 0, take $x_1 x_1'$. Otherwise
$f = \sum_{i \in S} m_i$ ([Lesson 4](lesson:canonical-forms)). Each minterm $m_i$ is an AND of $n$
literals, each literal a variable or a NOT of one; the sum is an OR of the minterms. That is a
circuit of NOT, AND and OR gates computing $f$.
:::

:::theorem{#two-op-complete name="{AND, NOT} and {OR, NOT} are complete" depth="quick"}
De Morgan supplies the missing operation:
$$
x + y = (x' y')', \qquad xy = (x' + y')' .
$$
:::

:::proof{#proof-two-op of="the completeness of {AND, NOT} and {OR, NOT}" depth="standard"}
**Idea first:** replace every OR in a circuit by the De Morgan form, and nothing else changes.

Take any circuit of AND, OR and NOT gates (one exists for every function by the previous theorem).
Replace each OR gate with inputs $x, y$ by NOT–AND–NOT: $(x'y')'$. By De Morgan this computes $x + y$
on every row, so the new circuit computes the same function using only AND and NOT. Replacing each AND
by $(x' + y')'$ instead gives an {OR, NOT} circuit.
So OR can be built from AND and NOT, and AND from OR and NOT. **{AND, OR} without NOT is not
complete**: every circuit of AND and OR gates is monotone (raising an input never lowers the
output), so it can never compute $x'$.
:::

## NAND and NOR are universal

:::definition{#nand-universal term="NAND builds NOT, AND and OR" depth="quick"}
With 2-input NAND gates:
- **NOT:** $x' = (x \cdot x)' = \text{NAND}(x, x)$ (or $\text{NAND}(x, 1)$). **1 gate.**
- **AND:** $xy = \big((xy)'\big)' = \text{NOT}(\text{NAND}(x, y))$. **2 gates.**
- **OR:** $x + y = (x' y')' = \text{NAND}(\text{NOT}\,x, \text{NOT}\,y)$. **3 gates.**

Since {AND, OR, NOT} is complete, so is {NAND}.
:::

:::definition{#nor-universal term="NOR builds NOT, OR and AND" depth="quick"}
The dual constructions with 2-input NOR gates:
- **NOT:** $x' = (x + x)' = \text{NOR}(x, x)$. **1 gate.**
- **OR:** $x + y = \text{NOT}(\text{NOR}(x, y))$. **2 gates.**
- **AND:** $xy = (x' + y')' = \text{NOR}(\text{NOT}\,x, \text{NOT}\,y)$. **3 gates.**
:::

:::viz{#builds-viz spec="nand-builds" mode="animate" depth="standard"}
:::

:::definition{#nand-properties term="NAND as an operator" depth="quick"}
Write $x \uparrow y = (xy)' = x' + y'$. Then:
- **commutative:** $x \uparrow y = y \uparrow x$;
- **not associative:** $(x \uparrow y) \uparrow z = xy + z'$ but $x \uparrow (y \uparrow z) = x' + yz$
  ([Lesson 3](lesson:xor-and-operators));
- **not idempotent:** $x \uparrow x = x'$, not $x$.

A defined operator such as $X \# Y = X' + Y'$ is NAND in disguise and inherits all three properties.
NOR is the same with OR in place of AND.
:::

### XOR and XNOR from universal gates

:::derivation{#xor-4-nand of="XOR from four NAND gates" depth="standard"}
Let $G_1 = (AB)'$. Then
$$
G_2 = (A\,G_1)' = \big(A (A' + B')\big)' = (AB')' = A' + B, \qquad G_3 = (G_1 B)' = A + B',
$$
and
$$
F = (G_2\, G_3)' = \big((A' + B)(A + B')\big)' = (AB + A'B')' = A \oplus B .
$$
The trick is the **shared** gate $G_1$: it feeds both $G_2$ and $G_3$, so four gates do the work that
the NAND–NAND form of $AB' + A'B$ needs five for (two inverters, two first-level NANDs, one output NAND).

**Sanity check.** $A = 1, B = 1$: $G_1 = 0$, $G_2 = G_3 = 1$, $F = 0$. $A = 1, B = 0$: $G_1 = 1$,
$G_2 = 0$, $G_3 = 1$, $F = 1$.
:::

:::viz{#xornand-viz spec="xor-from-nand" mode="animate" depth="standard"}
:::

:::table{#gate-count-table title="Minimum numbers of 2-input gates (proved by exhaustive search)" depth="quick"}
| Function | NAND only | NOR only |
|:--|:-:|:-:|
| NOT $x$ | 1 | 1 |
| $AB$ | 2 | 3 |
| $A + B$ | 3 | 2 |
| $(AB)'$ | 1 | 4 |
| $(A + B)'$ | 4 | 1 |
| $A \oplus B$ | **4** | **5** |
| $A \odot B$ | **5** | **4** |
| $A'B$ | 3 | 2 |
| $AB + C$ | 3 | 3 |
| $(A + B)C$ | 3 | 3 |
| $A' + B$ | 2 | 3 |
| $(ABC)'$ | 3 | 7 |
| $ABC$ | 4 | 6 |
| $A + B + C$ | 6 | 4 |
:::

:::trap{#trap-xor-five title="XOR is 4 NANDs, not 5" depth="quick"}
Converting $AB' + A'B$ to NAND–NAND (two inverters, two first-level NANDs, one output NAND) gives 5,
and 5 is the option examiners expect careless candidates to pick. Sharing the gate $(AB)'$ saves one:
the minimum is 4. (Five *is* the right answer for XNOR with NAND gates.)
:::

Notice the mirror: every NAND count is the NOR count of the dual function. XOR and XNOR are duals,
so XOR costs 4 NANDs or 5 NORs and XNOR costs 5 NANDs or 4 NORs.

:::theorem{#xor-min-proof name="Three NAND gates cannot compute XOR" depth="deep"}
No circuit of three 2-input NAND gates computes $A \oplus B$; four is the minimum.
:::

:::proof{#proof-xor-min of="the minimality of the four-NAND XOR" depth="deep"}
**Idea first:** the output gate needs two inputs that are both 1 on rows 00 and 11, and such signals
are too expensive to make twice with only two gates.

The output gate is $F = (PQ)'$, so $F = A \oplus B$ needs $PQ = AB + A'B'$: both $P$ and $Q$ must be 1
on rows 00 and 11, and their product 0 on rows 01 and 10. If $P = Q$, then $P$ itself would have to be
XNOR, which no two NAND gates make. So $P \ne Q$, and with three gates in total $P$ and $Q$ come from
the inputs and at most **two** earlier gates, $g_1$ (a NAND of inputs) and $g_2$ (which may read $g_1$).
The first gate is $(AB)' = 1110$, $A' = 1100$ or $B' = 1010$ (outputs for rows 00, 01, 10, 11), and none
of these, nor $A$ or $B$, is 1 on both 00 and 11. So at most one of $P, Q$ (namely $g_2$) can be
suitable, never both. Hence three gates never suffice; our check script confirms it by trying every
circuit.
:::

:::note{#recap-universal title="Recap" depth="quick"}
NAND: NOT 1, AND 2, OR 3. NOR: NOT 1, OR 2, AND 3. XOR = 4 NAND = 5 NOR; XNOR = 5 NAND = 4 NOR. NAND
is commutative but neither associative nor idempotent.
:::

### Worked examples: building with NAND and NOR

::::example{#ex-nand-and level="easy" title="AND from NAND gates" depth="quick"}
Build $F = AB$ using only 2-input NAND gates. How many are needed?

:::step{why="A NAND gives the complement of the AND we want."}
$G_1 = \text{NAND}(A, B) = (AB)'$.
:::

:::step{why="A NAND with both inputs tied is an inverter; it undoes the complement."}
$F = \text{NAND}(G_1, G_1) = \big((AB)'\big)' = AB$.
:::

:::answer
Two NAND gates. (One gate cannot work: a single NAND computes $(AB)'$, never $AB$.)
:::
::::

::::example{#ex-nor-or level="medium" title="OR and AND from NOR gates" depth="standard"}
Build $A + B$ and $AB$ from 2-input NOR gates and count the gates.

:::step{why="NOR is OR followed by NOT; a second NOR used as an inverter removes the NOT."}
$A + B = \text{NOR}(\text{NOR}(A, B), \text{NOR}(A, B))$: 2 gates (the first NOR's output feeds both inputs of the second).
:::

:::step{why="De Morgan: AB = (A′ + B′)′ is a NOR of the two complements."}
$AB = \text{NOR}(\text{NOR}(A, A), \text{NOR}(B, B))$: 3 gates.
:::

:::answer
OR: 2 NOR gates. AND: 3 NOR gates (the dual of the NAND counts).
:::
::::

::::example{#ex-nand-one level="gate" title="One inverter and one NAND" depth="standard"}
Implement $F = X' + Y + W'$ using one inverter and one NAND gate (of any number of inputs).

:::step{why="A NAND computes the OR of complemented inputs: (abc)′ = a′ + b′ + c′."}
Write $F$ as an OR of complements: $X' + Y + W' = X' + (Y')' + W'$.
:::

:::step{why="So F is a NAND of X, Y′ and W; only Y needs an inverter."}
$F = (X \cdot Y' \cdot W)'$.
:::

:::step{why="Check one row: X = 1, Y = 0, W = 1 gives F = 0 + 0 + 0 = 0, and the NAND of 1, 1, 1 is 0."}
Circuit: inverter on $Y$, then a 3-input NAND of $X$, $Y'$ and $W$.
:::

:::answer
$F = \text{NAND}(X, \overline{Y}, W)$: one inverter, one 3-input NAND.
:::
::::

::::example{#ex-nand-three level="gate" title="Edge case: a 3-input NAND from 2-input NANDs" depth="standard"}
Build $(ABC)'$ from 2-input NAND gates only.

:::step{why="NAND(NAND(A, B), C) is AB + C′, not the 3-input NAND (Lesson 1's trap)."}
First form $AB$, which costs two NANDs: $G_1 = (AB)'$, $G_2 = \text{NAND}(G_1, G_1) = AB$.
:::

:::step{why="Now NAND the product with C."}
$F = \text{NAND}(G_2, C) = (ABC)'$.
:::

:::answer
Three 2-input NANDs, and an exhaustive search confirms that two cannot do it.
:::
::::

## Two-level NAND–NAND and NOR–NOR circuits

:::definition{#nand-nand term="SOP → NAND–NAND" depth="quick"}
A sum of products is an AND–OR circuit. Replacing **every** gate with a NAND gives the same function:
$$
AB + CD = \big((AB)' \cdot (CD)'\big)' .
$$
The first-level NANDs produce the complemented products; the second-level NAND is an OR of their
complements (De Morgan). **Single-literal terms** need care: in $AB + C$ the literal $C$ enters the
output NAND directly, so it must be complemented first: $AB + C = \big((AB)' \cdot C'\big)'$.
:::

:::definition{#nor-nor term="POS → NOR–NOR" depth="quick"}
Dually, a product of sums becomes NOR–NOR:
$$
(A + B)(C + D) = \big((A + B)' + (C + D)'\big)' .
$$
To use NOR gates for a function given as a sum of products, first convert it to a product of sums;
for example $AB + C = (A + C)(B + C)$ by the distributive law, which is $\text{NOR}(\text{NOR}(A, C),
\text{NOR}(B, C))$: **three** 2-input NOR gates.
:::

:::definition{#bubble-conversion term="Conversion by bubble pushing" depth="standard"}
To convert any AND/OR circuit into NAND (or NOR) form:
1. Replace each AND by a NAND (an AND with an output bubble) and each OR by an OR with bubbled inputs,
   which is a NAND by De Morgan.
2. Two bubbles on one wire cancel. A wire or circuit input with a single bubble needs an inverter (a
   tied NAND), or the complemented literal.
3. This works for multi-level circuits too: a second OR level after an OR level needs an inverter in
   between, which is exactly the 2002 GATE question.
:::

:::viz{#conversion-viz spec="nand-nand-conversion" mode="animate" depth="standard"}
:::

:::trap{#trap-single-literal title="Forgetting the inverter on a single-literal term" depth="quick"}
Converting $AB + C$ "gate for gate" into $\big((AB)' \cdot C\big)'$ gives $AB + C'$, not $AB + C$. A
literal that goes straight to the second level arrives without the first-level inversion, so it must
be inverted explicitly (or supplied as $C'$).
:::

### Worked examples: two-level and multi-level conversion

::::example{#ex-conv-sop level="easy" title="A sum of two products" depth="quick"}
Draw $F = AB + CD$ with NAND gates only.

:::step{why="One NAND per product term."}
$G_1 = (AB)'$, $G_2 = (CD)'$.
:::

:::step{why="The output NAND ORs the complements of its inputs."}
$F = (G_1 G_2)' = G_1' + G_2' = AB + CD$.
:::

:::answer
Three 2-input NANDs (NAND–NAND).
:::
::::

::::example{#ex-conv-pos level="medium" title="A product of sums with NOR gates" depth="standard"}
Draw $F = (A + B)(C + D)$ with NOR gates only.

:::step{why="One NOR per sum term gives the complemented sums."}
$G_1 = (A + B)'$, $G_2 = (C + D)'$.
:::

:::step{why="A NOR of complements is an AND of the sums (De Morgan)."}
$F = (G_1 + G_2)' = G_1' G_2' = (A + B)(C + D)$.
:::

:::answer
Three 2-input NORs (NOR–NOR).
:::
::::

::::example{#ex-conv-multi level="gate" title="A three-level product with six NOR gates" depth="standard"}
$F = (a + b)(c + d)(e + f)$ is built from 2-input OR and AND gates as $\big((a + b)(c + d)\big)(e + f)$.
Convert it to 2-input NOR gates only.

:::step{why="The first level gives the complemented sums, as in NOR–NOR."}
$N_1 = (a + b)'$, $N_2 = (c + d)'$, $N_5 = (e + f)'$.
:::

:::step{why="A NOR of N₁ and N₂ is their AND of sums: the first AND."}
$N_3 = (N_1 + N_2)' = (a + b)(c + d)$.
:::

:::step{why="The next AND needs complemented inputs again, but N₃ is uncomplemented: one bubble on the wire, so insert an inverter."}
$N_4 = \text{NOR}(N_3, N_3) = \big((a + b)(c + d)\big)'$.
:::

:::step{why="Finally NOR the two complemented values."}
$F = (N_4 + N_5)' = (a + b)(c + d)(e + f)$.
:::

:::answer
Six 2-input NOR gates: $N_1, N_2, N_5$ at the inputs, $N_3$, the inverter $N_4$, and the output NOR.
:::
::::

::::example{#ex-conv-literal level="gate" title="Edge case: a single-literal term" depth="standard"}
Implement $F = AB + C$ with 2-input NAND gates.

:::step{why="The product term gets a first-level NAND."}
$G_1 = (AB)'$.
:::

:::step{why="C must reach the output NAND complemented, so invert it with a tied NAND."}
$G_2 = \text{NAND}(C, C) = C'$.
:::

:::step{why="The output NAND ORs the complements: G₁′ + G₂′ = AB + C."}
$F = (G_1 G_2)' = AB + C$.
:::

:::answer
Three NANDs. Without the inverter the circuit would compute $AB + C'$.
:::
::::

:::note{#recap-conversion title="Recap" depth="quick"}
SOP → NAND–NAND, POS → NOR–NOR; a single literal needs an inverter; in multi-level circuits insert an
inverter wherever a wire has an unpaired bubble.
:::

## Minimum gate counts

:::definition{#min-count-method term="Method: minimum number of NAND (or NOR) gates" depth="quick"}
1. **Choose the best form**: an SOP for NAND, a POS for NOR (convert with the distributive law if
   needed), as simple as possible, sharing gates where a sub-expression is used twice (as in the
   four-NAND XOR).
2. **Count** first-level gates, inverters needed for single literals, and the output gate.
3. **Argue a lower bound** for "minimum" questions: show that one fewer gate cannot work, often by
   looking at what the output gate can compute with simpler inputs.
:::

:::trap{#trap-naive-count title="Counting the naive conversion as the minimum" depth="quick"}
For $AB + C$ with 2-input NOR gates, converting gate by gate (AND = 3 NORs, OR = 2 NORs) gives 5. The
minimum is **3**: $AB + C = (A + C)(B + C) = \text{NOR}(\text{NOR}(A, C), \text{NOR}(B, C))$, and two
NOR gates cannot do it ($AB + C$ depends on all three variables, so with two gates the output must be
$\text{NOR}(g, z) = (x + y)z'$ with $z$ an input; that is 0 whenever $z = 1$, but $AB + C$ is 1 at
$C = 1$, and at $A = B = 1$ with $C = 0$, so every choice of $z$ fails). Our bank's stored key for the 2009 question said 5; it has been corrected to 3.
:::

### Worked examples: minimum counts

::::example{#ex-min-xor level="easy" title="XOR with NAND" depth="quick"}
What is the minimum number of 2-input NAND gates for $A \oplus B$?

:::step{why="The shared-gate construction uses four gates."}
$G_1 = (AB)'$, $G_2 = (AG_1)'$, $G_3 = (G_1B)'$, $F = (G_2G_3)'$.
:::

:::step{why="The minimality theorem (exhaustive search) rules out three."}
Three gates cannot compute XOR.
:::

:::answer
4.
:::
::::

::::example{#ex-min-aplusbc level="medium" title="A + BC with NAND" depth="standard"}
What is the minimum number of 2-input NAND gates for $A + BC$?

:::step{why="NAND–NAND for the SOP A + BC: one NAND for BC, an inverter for the single literal A, an output NAND."}
$G_1 = (BC)'$, $G_2 = A'$, $F = (G_1 G_2)' = BC + A$: 3 gates.
:::

:::step{why="With two NANDs the output is NAND(g, g) = xy, which uses only two variables, or NAND(g, z) = xy + z′ with z an input. Matching A + BC would need z′ = A for an input z, which is impossible."}
Two gates are not enough.
:::

:::answer
3 (the same as $A(B + C)$ with NOR gates, its dual; and $A + BC$ is just $AB + C$ with the variables renamed).
:::
::::

::::example{#ex-min-xnor level="gate" title="XNOR with NAND" depth="standard"}
What is the minimum number of 2-input NAND gates for $A \odot B$?

:::step{why="XNOR is the complement of XOR: four NANDs for XOR plus one NAND as an inverter."}
$F = \text{NAND}(X, X)$ with $X$ the four-NAND XOR: 5 gates.
:::

:::step{why="Alternative: AB + A′B′ in NAND–NAND needs two inverters, two first-level NANDs and an output NAND, also 5."}
Both routes give 5.
:::

:::step{why="The exhaustive search proves that four NANDs cannot compute XNOR."}
Minimum 5. (With NOR gates the dual of the XOR construction needs only 4.)
:::

:::answer
5.
:::
::::

::::example{#ex-min-inhibit level="gate" title="Edge case: A′B is cheaper with NOR than with NAND" depth="standard"}
Find the minimum number of 2-input NOR gates, and of 2-input NAND gates, for $F = A'B$.

:::step{why="As a NOR: A′B = (A + B′)′, a NOR of A and B′; B′ is one more NOR."}
NOR: $F = \text{NOR}(A, \text{NOR}(B, B))$: 2 gates.
:::

:::step{why="With NAND: (AB)′ = A′ + B′; NAND it with B to get ((A′ + B′)B)′ = (A′B)′, then invert."}
NAND: $G_1 = (AB)'$, $G_2 = (G_1 B)' = (A'B)'$, $F = \text{NAND}(G_2, G_2)$: 3 gates.
:::

:::answer
NOR 2, NAND 3. A function that looks like an AND can still be cheaper in NOR: choose the form that fits the gate.
:::
::::

## Deciding whether a set of gates is complete

:::definition{#completeness-test term="Method: is a set of gates complete?" depth="quick"}
1. Try to build **NOT**: tie inputs together, or feed a constant (if constants are allowed).
2. Try to build **AND** or **OR** from the set plus NOT.
3. If both succeed, the set is complete (because {AND, NOT} and {OR, NOT} are).
4. If you get stuck, find the **reason** with Post's classes below: every member of the set lies in
   one class that the whole circuit can never leave.
:::

:::definition{#constants term="Constants as free inputs" depth="quick"}
Whether 0 and 1 are available matters. XOR with the constant 1 gives NOT ($x \oplus 1 = x'$);
implication with the constant 0 gives NOT ($x \to 0 = x'$); a multiplexer with constants gives both
NOT and AND. Without constants, each of these fails for a simple reason (preserving 0 or 1). GATE
questions on completeness assume the constants are available unless they say otherwise; state your
assumption when you answer.
:::

:::definition{#partial-complete term="Partially complete sets" depth="quick"}
A set that is complete only when the constants 0 and/or 1 may be used is **partially complete**.
Examples: implication $x' + y$ (needs 0), inhibition $x'y$ (needs 1), the 2:1 MUX (needs 0 and 1),
{AND, XOR} (needs 1), half adders (needs 1).
:::

### Post's five classes

:::intuition{#post-intuition title="Five traps a set of gates can be stuck in" depth="standard"}
Some gate sets cannot build everything, and every failure has a reason you can name. Gates that output
0 on all-zero inputs can never make anything else on all-zero inputs. Gates without any inversion can
never make NOT. Gates that are pure XORs can only ever make XORs. Each such reason is a "trap": a family
of functions closed under wiring, so a circuit built from members never leaves it. Post proved that
there are exactly five such traps that matter, and that a set of gates is complete exactly when it is
not caught in any of them.
:::

:::definition{#post-classes term="Post's five closed classes" depth="quick"}
A Boolean function $f$ belongs to:
- **T₀ (0-preserving)** if $f(0, \dots, 0) = 0$;
- **T₁ (1-preserving)** if $f(1, \dots, 1) = 1$;
- **S (self-dual)** if $f(x') = f(x)'$ ([Lesson 4](lesson:canonical-forms));
- **M (monotone)** if changing any input from 0 to 1 never changes the output from 1 to 0;
- **A (affine, linear)** if $f = c \oplus a_1x_1 \oplus \dots \oplus a_nx_n$ for constants $c, a_i$
  (an XOR of some inputs and possibly 1).

Each class is **closed**: a circuit made only of gates from one class computes a function in that class.
:::

:::theorem{#post-theorem name="Post's completeness theorem" depth="standard"}
A set of Boolean functions is complete **if and only if** it is not contained in any one of the five
classes T₀, T₁, S, M, A; that is, for each class the set contains at least one function outside it.
:::

:::proof{#proof-post of="Post's theorem (necessity in full, sufficiency sketched)" depth="deep"}
**Idea first:** a class that contains every gate traps every circuit; and five escapes are enough to
build NOT and AND.

*Necessity.* Suppose every gate of the set is in T₀. Feed all-zero inputs into any circuit: every gate
in the first level sees zeros and outputs 0, so the next level sees zeros, and so on; the output is 0.
So every circuit is 0-preserving and NOT ($1$ at input 0) is unreachable. The same argument works for
T₁. For M: a composition of monotone functions is monotone, and NOT is not monotone. For A: substituting
XORs of inputs and constants into an XOR of inputs gives an XOR of inputs and possibly the constant 1,
and AND is not affine. For S: if every gate
satisfies $g(x') = g(x)'$, then complementing all circuit inputs complements every wire in turn, so the
circuit is self-dual; the constant 0 is not.

*Sufficiency (sketch).* Take $f_0 \notin$ T₀, $f_1 \notin$ T₁, $f_S \notin$ S, $f_M \notin$ M and
$f_A \notin$ A. Tying all inputs of $f_0$ gives NOT or the constant 1; tying those of $f_1$ gives NOT or
the constant 0. *Getting NOT:* if neither gives NOT, both constants are available, and the non-monotone
$f_M$ with constants substituted gives NOT. *Getting constants:* if both give NOT, the non-self-dual
$f_S$, with each input replaced by $x$ or $x'$, gives a constant, and NOT gives the other. *Getting
AND:* with NOT and both constants, fix all but two variables of the non-affine $f_A$ so that one
AND-term of its algebraic normal form survives; inverters then turn it into $xy$. NOT and AND are
complete.
:::

:::trick{#trick-post-quick title="Quick checks for Post's classes" depth="standard"}
- T₀ / T₁: evaluate the all-0 and all-1 rows.
- M: a function written **without any complement** (AND/OR only, majority) is monotone.
- A: a function built only from XOR, XNOR and NOT is affine.
- S: test one pair of complementary rows; a single failure rules out self-duality.

**Why it works:** each check is the definition on the cheapest rows. **When it fails:** an expression
that *contains* complements may still be monotone after simplification (e.g. $x + x'x$), and an affine
function can be written with AND/OR (e.g. $xy' + x'y = x \oplus y$), so a verdict on M or A for a messy
expression needs simplification, the truth table, or the algebraic normal form.
:::

:::definition{#with-constants term="With free constants, only M and A matter" depth="standard"}
The constant 0 escapes T₁ and S, and the constant 1 escapes T₀ and S. So if both constants may be used,
a set is complete exactly when it contains a **non-monotone** function and a **non-affine** function.
That is the quickest test for "with 0 and 1 available" questions: {XOR} and {XOR, NOT} fail (all affine),
{AND, OR} and {majority} fail (all monotone), while {AND, XOR} passes.
:::

:::viz{#checklist-viz spec="completeness-checklist" mode="animate" depth="standard"}
:::

### Complete sets with constants

:::definition{#complete-with-constants term="Some complete (and incomplete) sets, constants allowed" depth="quick"}
| Set | Complete? | How (or why not) |
|:--|:-:|:--|
| {NAND}, {NOR} | yes | universal even without constants |
| 2:1 MUX | yes | below |
| {AND, XOR} | yes | $x \oplus 1 = x'$, then AND + NOT |
| implication $x' + y$ | yes (needs 0) | $x \to 0 = x'$, $x' \to y = x + y$ |
| half adder | yes (needs 1) | sum $x \oplus 1 = x'$, carry $= xy$ |
| {XOR, NOT}, {XOR, XNOR} | no | all affine |
| {AND, OR}, majority | no | all monotone |
:::

:::definition{#mux-complete term="A 2:1 multiplexer is complete with constants" depth="standard"}
$\text{MUX}(s; a, b) = s'a + sb$ (output $a$ when $s = 0$, $b$ when $s = 1$). Then
$$
\text{MUX}(x; 1, 0) = x', \qquad \text{MUX}(x; 0, y) = xy, \qquad \text{MUX}(x; y, 1) = x + y .
$$
NOT and AND suffice. (A cascade of two MUXes with constants gives NAND as well.)
:::

:::definition{#and-xor-1 term="{AND, XOR, 1} is complete" depth="quick"}
$x \oplus 1 = x'$ gives NOT; with AND that is complete. This is the algebra of Lesson 3's arithmetic
view: every function is an XOR of AND-terms (its algebraic normal form).
:::

:::definition{#imp-complete term="Implication with the constant 0 is complete" depth="standard"}
$x \to y = x' + y$. Then $x \to 0 = x'$ (NOT) and $(x \to 0) \to y = x + y$ (OR); {NOT, OR} is complete.
Without 0 it is not, because $1 \to 1 = 1$: implication is 1-preserving. Implication circuits for XOR
use the same pieces: $x \oplus y = (x \to y) \to \big((y \to x) \to 0\big)$, four implication gates.
:::

:::definition{#half-adder-complete term="Half adders are complete (with the constant 1)" depth="standard"}
A half adder outputs $S = x \oplus y$ and $C = xy$. With $y = 1$: $S = x'$ (NOT). The carry output is
an AND. {AND, NOT} is complete, so any function can be built from half adders and the constant 1.
:::

### A single complete function

:::intuition{#sheffer-intuition title="One key that opens every lock" depth="standard"}
A single gate type is universal only if it escapes all five traps on its own. Two quick looks do most
of the work: it must output 1 when all inputs are 0 (else it is stuck preserving 0) and 0 when all
inputs are 1 (else it is stuck preserving 1). Such a gate already contains an inverter: tie its inputs
together. The only remaining question is whether it is self-dual.
:::

:::theorem{#single-function-test name="When one function is complete on its own" depth="standard"}
A single function $f$ is complete (with no constants) **if and only if** $f(0, \dots, 0) = 1$,
$f(1, \dots, 1) = 0$ and $f$ is not self-dual. Such functions are called **Sheffer functions**.
:::

:::proof{#proof-single-function of="the Sheffer criterion" depth="deep"}
**Idea first:** the two corner conditions already escape T₀, T₁ and M; non-self-duality then also
escapes A.

Necessity: by Post's theorem $f$ must escape T₀ ($f(0\dots0) = 1$), T₁ ($f(1\dots1) = 0$) and S.
Sufficiency: $f(0\dots0) = 1 > 0 = f(1\dots1)$ shows $f$ is not monotone. If $f$ were affine,
$f = c \oplus a_1x_1 \oplus \dots$, the corner values force $c = 1$ and an odd number of $a_i = 1$; then
$f(x') = 1 \oplus \bigoplus a_i(x_i \oplus 1) = f(x) \oplus 1$, so $f$ would be self-dual, which it is not.
So $f$ escapes all five classes and is complete.
:::

:::definition{#sheffer term="Only NAND and NOR among two-input functions" depth="quick"}
For two inputs, $f(0, 0) = 1$ and $f(1, 1) = 0$ leave four columns: 1000 (NOR), 1010 ($B'$),
1100 ($A'$), 1110 (NAND). $A'$ and $B'$ are self-dual, so exactly **two** of the sixteen two-input
functions are universal: NAND and NOR.
:::

### Worked examples: completeness

::::example{#ex-cpl-sheffer level="gate" title="The Sheffer test on a three-variable function" depth="standard"}
Is the single function $h(x, y, z) = x'z' + y'z'$ complete on its own?

:::step{why="Corner rows first: Sheffer needs h(0,0,0) = 1 and h(1,1,1) = 0."}
$h(0, 0, 0) = 1 + 1 = 1$ and $h(1, 1, 1) = 0 + 0 = 0$.
:::

:::step{why="Self-duality: a self-dual function has exactly 2ⁿ⁻¹ = 4 minterms (one per complementary pair)."}
$h = z'(x' + y')$ is 1 on rows 000, 010, 100: three minterms, so it is not self-dual.
:::

:::step{why="Confirm by building NAND, which is universal."}
$h(x, y, 0) = x' + y' = (xy)'$: a NAND. So $\{h\}$ is complete.
:::

:::answer
Complete (it passes the Sheffer test, and $h(x, y, 0)$ is NAND).
:::
::::

::::example{#ex-cpl-minority level="gate" title="Edge case: passes the corners but is self-dual" depth="standard"}
Is the minority function $m(x, y, z) = x'y' + y'z' + z'x'$ (1 when at most one input is 1) complete on its own?

:::step{why="Corners: m(0,0,0) = 1 and m(1,1,1) = 0, so it escapes T₀, T₁ and M."}
Both corner conditions hold.
:::

:::step{why="m is the majority of the complemented inputs, and complementing all inputs of a self-dual function keeps it self-dual."}
$m(x', y', z') = M(x, y, z) = \big(m(x, y, z)\big)'$: $m$ is self-dual.
:::

:::answer
Not complete: every circuit of minority gates is self-dual, so it can never compute a constant (or AND).
:::
::::

::::example{#ex-cpl-xor level="easy" title="Is {XOR, NOT} complete?" depth="quick"}
Decide whether {XOR, NOT} is complete.

:::step{why="Both XOR and NOT are affine: x ⊕ y and x ⊕ 1."}
Every circuit of them is an XOR of inputs and constants.
:::

:::step{why="AND is not affine (its algebraic normal form is xy)."}
AND can never be built.
:::

:::answer
Not complete (trapped in the affine class).
:::
::::

::::example{#ex-cpl-mux level="medium" title="Is the 2:1 MUX complete?" depth="standard"}
Is a 2:1 multiplexer complete, with and without the constants 0 and 1?

:::step{why="With constants: build NOT and AND directly."}
$\text{MUX}(x; 1, 0) = x'$ and $\text{MUX}(x; 0, y) = xy$: complete.
:::

:::step{why="Without constants: all-zero inputs give output 0, all-one inputs give 1."}
The MUX is 0- and 1-preserving, so every MUX-only circuit is too; NOT is unreachable.
:::

:::answer
Complete with constants, not complete without them.
:::
::::

::::example{#ex-cpl-imp level="gate" title="Implication" depth="standard"}
Show that the implication gate $x \to y = x' + y$ is complete when the constant 0 is available, and
build XOR from implication gates.

:::step{why="Feeding 0 into the y input gives NOT."}
$x \to 0 = x' + 0 = x'$.
:::

:::step{why="Then OR follows: (x → 0) → y = x′′ + y."}
$(x \to 0) \to y = x + y$. {NOT, OR} is complete.
:::

:::step{why="XOR is 'not (x → y and y → x)'; write it as one implication: a → b′ = a′ + b′."}
$x \oplus y = \big((x \to y)(y \to x)\big)' = (x \to y) \to \big((y \to x) \to 0\big)$: gates $g_1 = x \to y$, $g_2 = y \to x$, $g_3 = g_2 \to 0$, $F = g_1 \to g_3$.
:::

:::answer
Complete with 0; this XOR uses four implication gates (one of them fed the constant 0), and four is the minimum, by exhaustive search.
:::
::::

::::example{#ex-cpl-inhibit level="gate" title="Edge case: a gate that needs the constant 1" depth="standard"}
Is the inhibition gate $f(x, y) = x'y$ complete on its own? With the constant 1?

:::step{why="Check the corners: f(0, 0) = 0."}
$f$ is 0-preserving, so every $f$-circuit outputs 0 on all-zero inputs: not complete alone.
:::

:::step{why="With the constant 1 in the y input: f(x, 1) = x′."}
NOT is available.
:::

:::step{why="Feed the complement into the x input: f(x′, y) = x′′y = xy."}
AND is available: {AND, NOT} is complete.
:::

:::answer
Not complete alone; complete (partially complete) with the constant 1.
:::
::::

:::note{#recap-complete title="Recap" depth="quick"}
Complete iff the set escapes all five classes (T₀, T₁, S, M, A); with free constants iff it has a
non-monotone and a non-affine member. One function is complete iff $f(0\dots0) = 1$, $f(1\dots1) = 0$
and it is not self-dual; among two-input functions only NAND and NOR.
:::

## The challenge bench

Try the constructions yourself: pick a target and build it from NAND gates only (or NOR only). The
bench checks your truth table and tells you whether you hit the proven minimum.

:::lab{#lab-challenge lab="gate-bench" tab="challenge" depth="standard"}
:::

## GATE questions on this lesson

All eleven previous-year questions. The 2009 question's stored key was wrong (5); the proven answer
is 3, and the solution explains why.

:::pyq{id="it-2004-it-8" tests="xor-4-nand,gate-count-table" depth="standard"}
:::

:::pyq{id="cse-2009-cs-6" tests="nor-nor,min-count-method,trap-naive-count" depth="standard"}
:::

:::pyq{id="cse-1995-b-63-a" tests="nand-universal,bubble-conversion" depth="standard"}
:::

:::pyq{id="cse-2002-b-55-b" tests="nand-nand,bubble-conversion" depth="standard"}
:::

:::pyq{id="cse-2015-3-cs-2" tests="nand-properties" depth="standard"}
:::

:::pyq{id="cse-1992-a-2-ii" tests="complete-with-constants,mux-complete,half-adder-complete" depth="standard"}
:::

:::pyq{id="cse-1999-a-34" tests="completeness-test,post-classes,complete-with-constants" depth="standard"}
:::

:::pyq{id="cse-1993-ii-b-9" tests="half-adder-complete" depth="standard"}
:::

:::pyq{id="cse-1998-a-57-a" tests="imp-complete" depth="standard"}
:::

:::pyq{id="cse-1998-a-57-b" tests="imp-complete,partial-complete" depth="standard"}
:::

:::pyq{id="cse-2015-1-cs-39" tests="single-function-test,post-classes" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need
care.

:::practice{id="nx-dl-02-05-q01" depth="standard"}
:::

:::practice{id="nx-dl-02-05-q02" depth="standard"}
:::

:::practice{id="nx-dl-02-05-q03" depth="standard"}
:::

:::practice{id="nx-dl-02-05-q04" depth="standard"}
:::

:::practice{id="nx-dl-02-05-q05" depth="standard"}
:::

:::practice{id="nx-dl-02-05-q06" depth="standard"}
:::

:::practice{id="nx-dl-02-05-q07" depth="standard"}
:::

:::practice{id="nx-dl-02-05-q08" depth="standard"}
:::

:::practice{id="nx-dl-02-05-q09" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Universal gates and completeness on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Complete sets | {AND, OR, NOT}, {AND, NOT}, {OR, NOT}, {NAND}, {NOR}; {AND, OR} is not |
| NAND builds | NOT 1, AND 2, OR 3 (NOR: NOT 1, OR 2, AND 3) |
| XOR / XNOR | XOR = 4 NAND = 5 NOR; XNOR = 5 NAND = 4 NOR |
| Two-level | SOP → NAND–NAND, POS → NOR–NOR; single literals need inverters |
| Minimum counts | best form, count, then show one fewer cannot work ($AB + C$: 3 NOR) |
| Post's classes | T₀, T₁, self-dual, monotone, affine; complete iff escapes all five |
| With constants | complete iff some member is non-monotone and some is non-affine |
| Complete with constants | MUX, {AND, XOR}, implication (0), half adder (1), inhibition (1) |
| Sheffer | $f(0\dots0) = 1$, $f(1\dots1) = 0$, not self-dual; 2-input: only NAND, NOR |
:::

:::note{#further-depth title="Further depth: why NAND wins in silicon" depth="deep"}
In CMOS a 2-input NAND puts its two series transistors in the fast NMOS pull-down network, while a NOR
puts them in the slower PMOS pull-up. So for equal drive strength a NAND needs smaller transistors than
a NOR, which makes it smaller and faster; that is why CMOS standard-cell libraries are built around NAND.
(The older TTL family was also NAND-based, for a different reason: its multi-emitter input transistor
naturally forms a NAND.)
:::
