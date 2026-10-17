---
id: logic-gates
subject: dl
chapter: boolean-algebra-gates
title: Logic gates and truth tables
order: 1
prerequisites: [codes]
pyq_topics: [dl/gates]
est_minutes: 35
difficulty: basic
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every value is checked by content/gate-notes/_checks/dl/l2_01_logic_gates.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 24–29, set B pp. 109–113, set C pp. 223–229 and 254–255, set E p. 407."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (digital logic gates, positive and negative logic)."
  - "PYQs: src/gate/questions.json (dl/gates); the cse-1999-a-7 key is re-derived by truth table in l2_01_logic_gates.py."
updated: "2026-10-17"
---

Every digital circuit, from a calculator to a processor, is built from a handful of tiny decisions:
"are both of these 1?", "is at least one of them 1?", "are they different?". A **logic gate** is a
circuit that makes one such decision, and a **truth table** is the complete record of what it
decides. In this lesson you meet the seven standard gates, learn to read their symbols (including the
small circles called bubbles), see why the same chip can be an AND gate or an OR gate depending on
how you read its voltages, and learn to read a small circuit gate by gate. Everything in the rest of
the chapter, and most of Digital Logic, is written in this vocabulary.

## Where this fits

Chapter 1 gave you bits: numbers, codes and the XOR "the bits differ" idea from
[Gray and parity codes](lesson:codes). Here bits start to *compute*. The next lesson turns the
behaviour of these gates into an algebra with laws you can use to simplify; Lesson 3 studies XOR and
custom operators; Lesson 4 writes any function as a list of rows; Lesson 5 shows that one kind of
gate is enough to build everything; Lesson 6 reads whole circuits, including their timing.

:::table{#radar title="GATE radar: gates and truth tables" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 1 (1999), but every circuit question in this chapter assumes it |
| Marks | 1 one-mark MCQ |
| Pattern | A gate with tied or constant inputs: which of these is NOT equivalent to $x'$? |
| Where it reappears | Universal gates (Lesson 5), circuit analysis (Lesson 6), multiplexers and adders (Chapters 4–5) |
| What examiners test | Controlling values (a 1 into a NOR forces 0), the difference between a gate's symbol and its bubbles, and positive vs negative logic |
:::

## The idea: switches and a lamp

:::intuition{#switches title="A lamp behind two switches already computes AND and OR" depth="standard"}
Wire a battery, a lamp and two switches A and B in one loop, one switch after the other
(**in series**). Current needs an unbroken path, so the lamp lights only when A is closed **and**
B is closed. Now wire the two switches side by side (**in parallel**): either closed switch
completes a path, so the lamp lights when A is closed **or** B is closed, or both.

Write 1 for "closed" and "lit" and 0 for "open" and "dark". The series circuit is a machine that
outputs 1 exactly when both inputs are 1; the parallel circuit outputs 1 when at least one input is
1. Those two machines are the AND gate and the OR gate. A third switch that is *normally closed* and
opens when you press it gives the opposite of its input: the NOT gate. Real gates use transistors as
switches instead of your fingers, but the logic is exactly this.
:::

Watch both circuits go through all four combinations of A and B. The little table at the bottom
fills in as they go: it is the first truth table of this chapter.

:::viz{#switch-viz spec="switch-model" mode="animate" depth="standard"}
:::

Notice that the table has four rows because each of the two switches has two positions, and
$2 \times 2 = 4$. Nothing else can happen. That is the whole power of a truth table: a gate has
finitely many input combinations, so listing them all describes it completely.

:::definition{#truth-table-def term="Truth table" depth="quick"}
A **truth table** of a function of $n$ Boolean inputs lists every combination of input values,
one per row, with the output for each. Because each input is 0 or 1, there are exactly $2^n$ rows.

- Rows are written in **binary counting order**: for inputs $A, B, C$ the rows are $000, 001,
  010, \dots, 111$. The **first** variable is the most significant bit.
- The **row number** (row index) is that binary pattern read as a number: in $f(A, B, C)$, the
  row $A = 1, B = 0, C = 1$ is row $101_2 = 5$. Lesson 4 builds the whole theory of minterms on
  these row numbers.
- A Boolean variable or signal takes only the values 0 and 1 (also called false/true or low/high).
:::

Why insist on one row order? Because GATE questions name functions by their row numbers ("$f =
\Sigma(1, 3, 5)$") and by their output column read top to bottom ("the output is 0110"). Both only
make sense when everyone lists the rows the same way, with the first-named variable as the most
significant bit.

:::note{#recap-idea title="Recap" depth="quick"}
Series switches compute AND, parallel switches compute OR, a normally-closed switch computes NOT. A
truth table lists all $2^n$ input rows in binary order (first variable = most significant bit) with
the output of each row.
:::

## The three basic gates

:::definition{#not-gate term="NOT gate (inverter)" depth="quick"}
One input, one output: the output is the opposite of the input.

| $A$ | $A'$ |
|:-:|:-:|
| 0 | 1 |
| 1 | 0 |

It is written $A'$, $\overline{A}$ or $\neg A$, and drawn as a triangle with a small circle (the
**bubble**) at its output. The bubble, not the triangle, is what means "invert".
:::

:::definition{#and-gate term="AND gate" depth="quick"}
The output is 1 only when **all** inputs are 1. For two inputs, $F = A \cdot B$ (usually written
$AB$): the table is 0, 0, 0, 1 for rows 00, 01, 10, 11. The symbol has a flat back and a round
(D-shaped) front.
:::

:::definition{#or-gate term="OR gate" depth="quick"}
The output is 1 when **at least one** input is 1. For two inputs, $F = A + B$: the table is 0, 1,
1, 1. The symbol has a curved back and a pointed front. Here $+$ means OR, so $1 + 1 = 1$: nothing
is carried.
:::

The words "all" and "at least one" matter more than the two-input tables, because they tell you
what a gate does with any number of inputs, and they lead straight to the most useful idea for
reading circuits quickly.

:::definition{#controlling-value term="Controlling value" depth="quick"}
An input value that decides a gate's output **by itself**, whatever the other inputs are, is a
**controlling value** of that gate.

- **0 controls AND**: one 0 makes the output 0. ($0 \cdot x = 0$.)
- **1 controls OR**: one 1 makes the output 1. ($1 + x = 1$.)
- The other value is **non-controlling**: a 1 into an AND, or a 0 into an OR, simply lets the
  other input through ($1 \cdot x = x$, $0 + x = x$).

NAND and NOR have the same controlling values as AND and OR (a 0 forces a NAND to 1, a 1 forces a
NOR to 0). XOR and XNOR have **no** controlling value: every input always matters.
:::

:::definition{#gate-as-switch term="A gate as an on/off switch for a signal" depth="standard"}
Read one input of a 2-input gate as a *control* $c$ and the other as *data* $x$:

| Gate | $c = 0$ | $c = 1$ |
|:--|:--|:--|
| AND | output forced to 0 (blocked) | output $= x$ (passed) |
| OR | output $= x$ (passed) | output forced to 1 |
| XOR | output $= x$ (passed) | output $= x'$ (inverted) |

This is how an AND gate "enables" a signal and how an XOR gate becomes a *controlled inverter*.
You will use both readings in multiplexers, adders and the timing puzzles of Lesson 6.
:::

:::trick{#trick-controlling title="Look for a controlling value first" depth="standard"}
To evaluate a gate, scan its inputs for a controlling value before doing anything else: a 0 going
into an AND (or NAND), or a 1 going into an OR (or NOR), settles the output immediately.

**Why it works:** $0 \cdot \text{anything} = 0$ and $1 + \text{anything} = 1$, so the other inputs
cannot change the result. **When it fails:** XOR and XNOR have no controlling value; there you must
count the 1s.
:::

:::note{#recap-basic title="Recap" depth="quick"}
AND: 1 only if all inputs are 1 (0 is controlling). OR: 1 if any input is 1 (1 is controlling).
NOT: the opposite. The bubble, not the body, means inversion.
:::

## The derived gates: NAND, NOR, XOR and XNOR

:::intuition{#derived-intuition title="Two questions the basic gates cannot ask in one step" depth="standard"}
AND and OR answer "are they all on?" and "is any of them on?". Two other questions come up all the
time. The first is the negative of the old ones: "is it *not* the case that all are on?" (a warning
light that stays lit until every door is shut) and "is *none* of them on?". Those are AND and OR with
their answer flipped: NAND and NOR. Flipping the answer costs nothing in silicon (an inverting gate is
actually the cheaper one), so these two are the real workhorses of chip design.

The second question compares inputs: "are these two bits different?" or "are they the same?". A
staircase light that either switch can toggle, a parity check that asks whether an odd number of bits
flipped, an adder's sum bit: all of them ask "differ?". That is XOR, and its opposite, "same?", is
XNOR. Neither can be built from a single AND or OR, which is why they get their own symbols.
:::

Four more gates appear everywhere. Two of them are basic gates with the output inverted; the other
two compare their inputs.

:::definition{#nand-nor term="NAND and NOR" depth="quick"}
- **NAND** = AND followed by NOT: $F = (AB)' = \overline{AB}$. The output is 0 only when all inputs
  are 1. Table: 1, 1, 1, 0. Symbol: the AND body with an output bubble.
- **NOR** = OR followed by NOT: $F = (A + B)' = \overline{A + B}$. The output is 1 only when all
  inputs are 0. Table: 1, 0, 0, 0. Symbol: the OR body with an output bubble.

In logic notation NAND is written $A \uparrow B$ (the Sheffer stroke) and NOR $A \downarrow B$ (the Peirce
arrow). Lesson 5 shows that either one, on its own, can build every Boolean function.
:::

:::definition{#xor-gate term="XOR (exclusive OR)" depth="quick"}
$F = A \oplus B = A'B + AB'$: the output is 1 when the inputs **differ**. Table: 0, 1, 1, 0.
With more inputs, an XOR is 1 when an **odd** number of inputs are 1, so it is the even-parity bit of
[Chapter 1's parity codes](lesson:codes). The symbol is the OR body with a second curved line
behind it.
:::

:::definition{#xnor-gate term="XNOR (equivalence)" depth="quick"}
$F = A \odot B = (A \oplus B)' = AB + A'B'$: the output is 1 when the inputs are **equal**. Table:
1, 0, 0, 1. It is a one-bit equality detector. The symbol is the XOR body with an output bubble.
:::

Now see all seven at once. Each two-input gate gets the same inputs A and B (NOT reads only A); as A and B step through 00, 01, 10 and
11, the output of every gate lights up and its truth table fills in underneath.

:::viz{#gates-viz spec="gate-symbols" mode="animate" depth="standard"}
:::

Read the finished strips as a vocabulary: **0001 is AND, 0111 is OR, 1110 is NAND, 1000 is NOR,
0110 is XOR, 1001 is XNOR.** Notice the pairs: NAND is AND upside down (every bit flipped), NOR is
OR flipped, XNOR is XOR flipped. Notice also that AND and OR have a single "odd one out" row (the
row that differs from the rest), while XOR and XNOR are balanced: two 1s and two 0s.

### Tying inputs together and feeding constants

GATE likes to ask what a gate does when its two inputs are the same signal, or when one input is a
constant. Every such question is answered by the truth table plus the controlling-value idea.

:::definition{#tie-inputs term="A gate with tied or constant inputs" depth="quick"}
For a signal $x$:

| Gate | $x$ with $x$ | $x$ with 0 | $x$ with 1 |
|:--|:--|:--|:--|
| AND | $x$ | 0 | $x$ |
| OR | $x$ | $x$ | 1 |
| NAND | $x'$ | 1 | $x'$ |
| NOR | $x'$ | $x'$ | 0 |
| XOR | 0 | $x$ | $x'$ |
| XNOR | 1 | $x'$ | $x$ |

Each entry is one row of the gate's table. For example "NOR with 1": a 1 controls a NOR, so the
output is $(x + 1)' = 1' = 0$ whatever $x$ is. "NAND with 1": 1 is non-controlling for NAND, so the
gate passes $x$ and the output bubble inverts it, giving $x'$.
:::

:::trick{#trick-inverter title="Every inverting gate can be wired as a NOT" depth="standard"}
$x \text{ NAND } x = x \text{ NAND } 1 = x \text{ NOR } x = x \text{ NOR } 0 = x \text{ XOR } 1 = x \text{ XNOR } 0 = x'$.

**Why it works:** tying both inputs to $x$ makes AND and OR return $x$ itself, and the output bubble
inverts it; feeding the *non-controlling* constant also passes $x$ through to the bubble. XOR with 1
is the controlled inverter with its control on. **When it fails:** AND and OR have no bubble, so
tying their inputs gives back $x$, not $x'$; feeding the *controlling* constant (1 into NOR, 0
into NAND) gives a constant, not $x'$; and XOR with 0 or XNOR with 1 copies $x$ rather than inverting it.
:::

:::trap{#trap-nor-1 title="x NOR 1 is 0, not x′" depth="quick"}
The tempting slip is "a NOR inverts, so $x$ NOR 1 must be $x'$". But 1 is the controlling value of
OR: $x + 1 = 1$, and the bubble turns that into $0$. The output is the constant 0 for both values of
$x$. Use 0 instead, $x$ NOR 0 $= (x + 0)' = x'$, if you want an inverter. The 1999 GATE question
below is exactly this trap.
:::

### All sixteen two-input functions

How many different gates with two inputs could exist at all? A two-input truth table has 4 rows and
each row's output can be chosen as 0 or 1 independently, so there are $2^4 = 16$ possible tables.
(Lesson 4 proves the general count $2^{2^n}$.) Seven of them have gate names; the rest are still
useful, and GATE often hides one of them inside a "defined operator".

:::table{#sixteen-functions title="Every function of two inputs A, B (output for rows 00, 01, 10, 11)" depth="standard"}
| Output column | Expression | Name |
|:-:|:--|:--|
| 0000 | $0$ | constant 0 |
| 0001 | $AB$ | AND |
| 0010 | $AB'$ | A AND NOT B (inhibition) |
| 0011 | $A$ | A (copy) |
| 0100 | $A'B$ | B AND NOT A (inhibition) |
| 0101 | $B$ | B (copy) |
| 0110 | $A \oplus B$ | XOR |
| 0111 | $A + B$ | OR |
| 1000 | $(A + B)'$ | NOR |
| 1001 | $A \odot B$ | XNOR |
| 1010 | $B'$ | NOT B |
| 1011 | $A + B'$ | B implies A |
| 1100 | $A'$ | NOT A |
| 1101 | $A' + B$ | A implies B (implication) |
| 1110 | $(AB)'$ | NAND |
| 1111 | $1$ | constant 1 |
:::

Two things to take from this table. First, the bottom half is the top half flipped and read upwards
(row $k$ and row $15 - k$ are complements): every function has a complement in the list. Second,
8 of the 16 functions are not symmetric in $A$ and $B$ (swapping the inputs changes them); the one
GATE uses most is **implication** $A' + B$ ("if A then B", 1101). Lessons 3 and 5 use it repeatedly.

:::note{#recap-derived title="Recap" depth="quick"}
NAND 1110, NOR 1000, XOR 0110 (differ, odd), XNOR 1001 (equal). An inverting gate with tied inputs,
or with its non-controlling constant, is a NOT; with its controlling constant it is stuck at a
constant. There are exactly 16 two-input functions.
:::

### Worked examples: evaluating gates

::::example{#ex-eval-multi level="easy" title="Three-input AND and OR" depth="quick"}
For $A = 1, B = 0, C = 1$, find the outputs of a 3-input AND, a 3-input OR, a 3-input NAND and a
3-input NOR.

:::step{why="AND needs every input to be 1; a single 0 is a controlling value."}
AND: $B = 0$, so $ABC = 0$.
:::

:::step{why="OR needs at least one 1; a single 1 is a controlling value."}
OR: $A = 1$, so $A + B + C = 1$.
:::

:::step{why="NAND and NOR are the complements of AND and OR, so flip the two results."}
NAND $= (ABC)' = 1$ and NOR $= (A + B + C)' = 0$.
:::

:::answer
AND 0, OR 1, NAND 1, NOR 0.
:::
::::

::::example{#ex-eval-bitwise level="medium" title="Gates applied bit by bit to two words" depth="standard"}
A processor applies a gate to each bit position of two 4-bit words separately. Compute
$1011 \text{ NAND } 0110$, $1011 \text{ NOR } 0110$ and $1011 \text{ XOR } 0110$.

:::step{why="A bitwise operation is just four independent gates, one per column."}
Write the words in columns: column by column the pairs are $(1,0), (0,1), (1,1), (1,0)$.
:::

:::step{why="NAND is 0 only on the pair (1, 1)."}
NAND: only the third column is $(1,1)$, so the result is $1101$.
:::

:::step{why="NOR is 1 only on the pair (0, 0), and no column is (0, 0)."}
NOR: $0000$.
:::

:::step{why="XOR is 1 where the bits differ."}
XOR: the columns differ in positions 1, 2 and 4, so the result is $1101$. (It equals the NAND result
here only because no column is $(0,0)$; on that pair NAND gives 1 and XOR gives 0.)
:::

:::answer
NAND $1101$, NOR $0000$, XOR $1101$.
:::
::::

::::example{#ex-eval-tied level="gate" title="Tied inputs and constants" depth="standard"}
Simplify each of: $x \text{ NAND } x$, $x \text{ NOR } 0$, $x \text{ XOR } x$, $x \text{ XNOR } 1$
and $x \text{ AND } x'$.

:::step{why="Tying both inputs of an AND body to x gives x; the NAND's bubble then inverts it."}
$x \text{ NAND } x = (x \cdot x)' = x'$.
:::

:::step{why="0 is the non-controlling value of OR, so x passes through and the bubble inverts it."}
$x \text{ NOR } 0 = (x + 0)' = x'$.
:::

:::step{why="Two equal inputs never differ, and XOR detects difference."}
$x \text{ XOR } x = 0$.
:::

:::step{why="XNOR with 1 is 1 exactly when x is 1, so it copies x."}
$x \text{ XNOR } 1 = x \cdot 1 + x' \cdot 0 = x$.
:::

:::step{why="A signal and its complement are never both 1, so an AND of them can never be 1."}
$x \cdot x' = 0$ for both values of $x$. (In Lesson 6 a real circuit computing this will briefly glitch to 1; logically it is 0.)
:::

:::answer
$x'$, $x'$, $0$, $x$, $0$.
:::
::::

::::example{#ex-eval-xor4 level="gate" title="Edge case: a four-input XOR" depth="standard"}
A 4-input XOR has inputs $1, 1, 0, 1$. What is its output, and what would a 4-input XNOR gate give?

:::step{why="A multi-input XOR is 1 exactly when an odd number of its inputs are 1."}
Count the 1s: there are three.
:::

:::step{why="Three is odd."}
So the XOR output is 1.
:::

:::step{why="Chaining 2-input XORs gives the same answer, which is a useful check."}
Check by chaining: $1 \oplus 1 = 0$, $0 \oplus 0 = 0$, $0 \oplus 1 = 1$.
:::

:::step{why="An n-input XNOR gate is the complement of the n-input XOR (a chain of 2-input XNORs can differ; Lesson 3 explains why)."}
The 4-input XNOR gate gives $1' = 0$.
:::

:::answer
XOR 1 (odd number of 1s); XNOR gate 0.
:::
::::

::::check{#check-eval title="Your turn" depth="standard"}
Find $x \text{ NAND } 1$, $x \text{ NOR } 1$ and $x \text{ XOR } x'$.

:::answer
$x \text{ NAND } 1 = (x \cdot 1)' = x'$. $x \text{ NOR } 1 = (x + 1)' = 0$ (1 controls OR).
$x \text{ XOR } x' = 1$ (the two inputs always differ).
:::
::::

### Worked examples: identifying a gate

::::example{#ex-id-nand level="easy" title="Which gate gives 1, 1, 1, 0?" depth="quick"}
A two-input gate's outputs for rows 00, 01, 10, 11 are 1, 1, 1, 0. Name it.

:::step{why="Look for the odd one out: a single 0 in the last row."}
The output is 0 only when both inputs are 1.
:::

:::step{why="'1 except when all inputs are 1' is AND with the output inverted."}
That is NOT(AND): the NAND gate.
:::

:::answer
NAND.
:::
::::

::::example{#ex-id-xnor level="medium" title="Which gate gives 1, 0, 0, 1?" depth="standard"}
Name the two-input gate with outputs 1, 0, 0, 1, and give two expressions for it.

:::step{why="The 1s sit on rows 00 and 11, the rows where the two inputs are equal."}
The output is 1 exactly when $A = B$.
:::

:::step{why="Equality is the complement of difference."}
It is XNOR: $(A \oplus B)'$.
:::

:::step{why="An expression can also be read row by row: row 00 is A′B′ and row 11 is AB."}
Reading the 1-rows directly: $F = A'B' + AB$.
:::

:::answer
XNOR, $F = (A \oplus B)' = AB + A'B'$.
:::
::::

::::example{#ex-id-hl level="gate" title="A table given in voltages" depth="standard"}
A chip's datasheet gives, for inputs $(A, B)$ = (L, L), (L, H), (H, L), (H, H), the outputs H, H, H,
L. Which gate is it in positive logic (H = 1)? Which gate is it in negative logic (L = 1)?

:::step{why="Positive logic reads the table directly with H = 1 and L = 0."}
Rows 00, 01, 10, 11 give 1, 1, 1, 0: positive-logic NAND.
:::

:::step{why="Negative logic swaps every symbol, inputs and output alike."}
With L = 1: inputs (1,1), (1,0), (0,1), (0,0) give outputs 0, 0, 0, 1.
:::

:::step{why="Sort into the standard row order before naming the gate."}
Rows 00, 01, 10, 11 give 1, 0, 0, 0: a NOR.
:::

:::answer
Positive-logic NAND, negative-logic NOR (the dual, as the theorem below predicts).
:::
::::

::::example{#ex-id-imp level="gate" title="Edge case: a gate that is not symmetric" depth="standard"}
A two-input gate has outputs 1, 1, 0, 1 for rows $AB$ = 00, 01, 10, 11. Write it as a single
standard gate with one inverted input.

:::step{why="The single 0 is on row 10: A = 1 and B = 0."}
The output is 0 only when $A = 1, B = 0$.
:::

:::step{why="A function that is 0 on exactly one row is an OR in which that row makes every literal 0."}
Make both literals 0 on row 10: $A'$ is 0 there and $B$ is 0 there, so $F = A' + B$.
:::

:::step{why="This is the implication function from the sixteen-function table: an OR gate with a bubble on its A input."}
$F = A' + B$, an OR gate with input $A$ inverted ("A implies B").
:::

:::answer
$F = A' + B$ (implication). Swapping $A$ and $B$ changes it to $A + B'$ (1011), so this gate is not symmetric.
:::
::::

:::trick{#trick-odd-row title="Name a gate by its odd row" depth="standard"}
A table with a single 1 is an AND of literals; a table with a single 0 is an OR of literals. Choose
each literal so that it is 1 on that single 1-row (for AND) or 0 on that single 0-row (for OR).

**Why it works:** an AND is 1 only when all its literals are 1, an OR is 0 only when all its literals
are 0. **When it fails:** tables with two 1s and two 0s (XOR, XNOR, a copy of $A$) are not a single
gate of this kind; read them as "differ", "equal" or "copy". The constant tables 0000 and 1111 have no
odd row at all: they are the constants, not gates of their inputs.
:::

### Multi-input gates

:::intuition{#multi-intuition title="What 'all', 'any' and 'odd' mean for many inputs" depth="standard"}
A checklist with ten boxes is complete when *all* boxes are ticked: that is a 10-input AND, and it does
not matter in which order you check the boxes. A fire alarm with ten smoke sensors rings when *any*
sensor fires: a 10-input OR. A parity checker asks whether an *odd* number of bits are 1: a 10-input
XOR. Each of these questions can be asked two inputs at a time and the partial answers combined,
because the order of checking does not matter.

NAND and NOR are different. "Not all ticked" for ten boxes is one question with one final flip; asking
"not both" for two boxes and then "not both" again with the third box flips the answer twice in the
middle, which asks a different question. That is why a NAND chain is not a big NAND.
:::

AND, OR and XOR extend naturally to any number of inputs. NAND and NOR need a moment's care.

:::derivation{#multi-input of="the multi-input gates and why a NAND chain is not a 3-input NAND" depth="standard"}
**AND, OR, XOR.** An $n$-input AND is 1 when all inputs are 1, an $n$-input OR when at least one is
1, and an $n$-input XOR when an odd number are 1. Because AND, OR and XOR are associative (Lessons 2
and 3), a chain of 2-input gates computes the same thing: $(AB)C = A(BC) = ABC$.

**NAND and NOR.** An $n$-input NAND is defined as the complement of the $n$-input AND:
$$
\text{NAND}(A, B, C) = (ABC)' .
$$
A chain of 2-input NANDs is **not** the same. Work it out:
$$
\text{NAND}(\text{NAND}(A, B), C) = \big((AB)' \cdot C\big)' = AB + C' .
$$
(The last step uses De Morgan, proved in Lesson 2: $(XY)' = X' + Y'$ with $X = (AB)'$, $Y = C$.)

**Sanity check.** Take $A = B = 0$, $C = 1$. The 3-input NAND gives $(0 \cdot 0 \cdot 1)' = 1$. The
chain gives $0 \cdot 0 + 1' = 0$. Different, so the chain is a different function. The same holds for
NOR: $\text{NOR}(\text{NOR}(A, B), C) = (A + B)C'$, not $(A + B + C)'$.
:::

:::trap{#trap-nand-chain title="Cascading NANDs does not make a bigger NAND" depth="quick"}
Students often build a 3-input NAND as NAND(NAND(A, B), C). That computes $AB + C'$. A correct
3-input NAND from 2-input NANDs needs an extra gate used as an inverter:
$\text{NAND}(\text{NOT}(\text{NAND}(A, B)), C)$, where NOT is a NAND with tied inputs. That is three
gates. The root cause is that NAND is not associative (proved in Lesson 3).
:::

:::trap{#trap-xnor-many title="A chain of XNOR gates is not an n-input XNOR gate" depth="quick"}
For an odd number of inputs, a chain of 2-input XNORs equals the $n$-input **XOR**, not the $n$-input
XNOR: $(x \odot y) \odot z = x \oplus y \oplus z$, because the two inversions inside the chain cancel.
The expected wrong answer is the complement, $(x \oplus y \oplus z)'$. Lesson 3 proves the general rule.
:::

:::definition{#buffer term="Buffer" depth="standard"}
A **buffer** has one input and outputs the same value: $F = A$. It is drawn as the NOT triangle
without a bubble. Logically it does nothing, but physically it re-drives a weak signal so that it can
feed many gate inputs (it raises the **fan-out**), and it adds a **delay**. GATE uses buffers as
pure delay elements in timing questions (Lesson 6).
:::

:::aside{#tristate title="Tri-state buffers" depth="deep"}
A **tri-state buffer** has a data input, an enable input and three possible output states: 0, 1, or
"disconnected" (high impedance, written Z). When enabled it behaves as a buffer; when disabled its
output floats, so several tri-state outputs can share one wire (a bus) as long as only one is
enabled at a time. The Z state is not a logic value; it is the absence of a driver.
:::

## Bubbles, active-low signals and De Morgan in pictures

:::intuition{#bubble-intuition title="Saying the same rule in the negative" depth="standard"}
"The lift may move only if *both* doors are closed" and "the lift must stop if *either* door is open"
are the same rule, said once in the positive and once in the negative. Turning a rule inside out like
this swaps "both" with "either" and turns every condition into its opposite. In gate pictures, "the
opposite" is a bubble, "both" is an AND body and "either" is an OR body. So a gate can be redrawn by
moving its bubbles across it, provided the body changes from AND to OR (or back) at the same time.
That is all De Morgan's law says, and engineers use it to draw each gate in the form that matches what
its signals mean.
:::

The bubble deserves more attention. It is an inversion that can sit on an output *or on an input*,
and engineers move bubbles around a circuit to make it easier to read.

:::definition{#bubbles term="Bubbles and active-low signals" depth="quick"}
- A **bubble** on a gate input or output means that the signal is inverted at that point.
- A signal is **active-high** when 1 means "do it" and **active-low** when 0 means "do it". An
  active-low signal is named with a bar or a prime, such as $\overline{\text{RESET}}$ or $EN'$, and
  is drawn entering a bubbled input.
- Two bubbles on the same wire cancel ($x'' = x$).
:::

The key fact about bubbles is a pictorial form of De Morgan's laws (proved algebraically in Lesson
2). Watch a NAND gate's output bubble move backwards through the gate.

:::viz{#bubble-viz spec="bubble-push" mode="animate" depth="standard"}
:::

:::theorem{#demorgan-gates name="De Morgan's laws as gate symbols" depth="standard"}
A NAND gate is the same as an OR gate with both inputs bubbled, and a NOR gate is the same as an
AND gate with both inputs bubbled:
$$
(AB)' = A' + B', \qquad (A + B)' = A'B' .
$$
In general, moving bubbles across a gate swaps AND with OR and inverts every input and the output.
:::

:::proof{#proof-demorgan-gates of="the bubbled-gate equivalences" depth="standard"}
**Idea first:** two expressions are equal when they agree on every row, and there are only four rows.

| $A$ | $B$ | $(AB)'$ | $A' + B'$ | $(A + B)'$ | $A'B'$ |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 1 | 1 | 1 | 1 |
| 0 | 1 | 1 | 1 | 0 | 0 |
| 1 | 0 | 1 | 1 | 0 | 0 |
| 1 | 1 | 0 | 0 | 0 | 0 |

The third and fourth columns agree on all four rows, and so do the fifth and sixth. A proof by
listing every case is called **perfect induction**; it is valid for any identity, because a Boolean
expression with $n$ variables has only $2^n$ cases.
:::

Why bother drawing a NAND as a bubbled OR? Because it shows what the gate *means* in a design. A
NAND whose inputs are active-low signals ("light the warning if door-open-L or seat-belt-off-L is
asserted") is really doing an OR of two "asserted" conditions, and drawing it as an OR with bubbled
inputs makes the bubbles line up with the active-low wires. Lesson 5 uses the same trick to turn
AND–OR circuits into NAND-only circuits.

## Positive and negative logic

:::intuition{#posneg-intuition title="A dictionary can be read in either direction" depth="standard"}
A chip only knows voltages: high and low. "1" is a word we attach to one of them. If a colleague
attaches it to the other one, the chip does not change at all, but every 0 in their truth tables is a
1 in yours and vice versa, inputs and outputs alike. So the same chip implements one function in your
language and a related one in theirs. The related function is always the *dual*: flip every input,
apply the function, flip the output. For an AND chip that turns "all high" into "any low", which reads
as an OR.
:::

So far 1 meant "high voltage". That is a convention, not a law of nature.

:::definition{#pos-neg-logic term="Positive and negative logic" depth="quick"}
A physical gate works with two voltage ranges, high (H) and low (L).

- **Positive logic:** H means 1 and L means 0. This is the default in every GATE question unless
  stated otherwise.
- **Negative logic:** L means 1 and H means 0.

The chip does not change; only our reading of its voltages does.
:::

:::viz{#posneg-viz spec="pos-neg-logic" mode="animate" depth="standard"}
:::

:::theorem{#logic-duality name="Changing the logic convention turns a function into its dual" depth="standard"}
If a circuit computes $f$ in positive logic, the same circuit read in negative logic computes the
**dual** function $f^D(x) = \big(f(x')\big)'$. In particular a positive-logic AND is a
negative-logic OR, NAND becomes NOR, and XOR becomes XNOR (and each pair the other way round).
:::

:::proof{#proof-logic-duality of="the positive/negative logic duality" depth="standard"}
**Idea first:** switching conventions flips every 0 and 1 on every wire at once, inputs and output
alike.

Let $x = (x_1, \dots, x_n)$ be the negative-logic values on the inputs. The voltages are the same
as positive-logic values $x' = (x_1', \dots, x_n')$, so the chip produces the positive-logic output
$f(x')$. Read in negative logic, that output is $\big(f(x')\big)'$. So the function seen in negative
logic is $x \mapsto (f(x'))'$, the dual of $f$. (Lesson 2, `#dual-def`, proves that this function is
exactly what you get by swapping AND with OR and 0 with 1 in any expression of $f$.)

For AND: $(x_1' x_2')' = x_1 + x_2$ by De Morgan, an OR. For XOR: $(x_1' \oplus x_2')' = (x_1 \oplus
x_2)'$, an XNOR, because complementing both inputs of an XOR leaves it unchanged (Lesson 3).
:::

:::trap{#trap-negative-levels title="Negative voltages are not negative logic" depth="quick"}
Some old logic families use levels such as $0\,\text{V}$ and $-5\,\text{V}$. If $0\,\text{V}$ (the
higher level) means 1, that is still **positive** logic: what matters is whether the *higher* level
means 1, not whether the voltages are positive.
:::

### Worked examples: bubbles and logic conventions

::::example{#ex-bub-and level="easy" title="An AND gate with both inputs bubbled" depth="quick"}
What single standard gate is an AND gate whose two inputs both have bubbles?

:::step{why="Each bubble inverts its input before the AND body sees it."}
The output is $A'B'$.
:::

:::step{why="De Morgan's law in gate form: an AND of complements is the complement of an OR."}
$A'B' = (A + B)'$.
:::

:::answer
A NOR gate.
:::
::::

::::example{#ex-bub-nand level="medium" title="Reading a NAND drawn as an OR" depth="standard"}
A circuit diagram shows an OR body with bubbles on both inputs, fed by the active-low signals $P'$
and $Q'$. Write the output in terms of $P$ and $Q$.

:::step{why="The bubbles invert the incoming wires, which already carry P′ and Q′."}
The OR body sees $(P')' = P$ and $(Q')' = Q$.
:::

:::step{why="Two inversions on one wire cancel, so the body just ORs the asserted conditions."}
Output $= P + Q$.
:::

:::step{why="The physical part is still a NAND: NAND(P′, Q′) = (P′Q′)′, which De Morgan turns into P + Q."}
Check: $(P'Q')' = P'' + Q'' = P + Q$.
:::

:::answer
$P + Q$: the NAND acts as an OR of the two active-low signals.
:::
::::

::::example{#ex-bub-negnor level="gate" title="A NOR gate in negative logic" depth="standard"}
A NOR gate is designed for positive logic. What function does it perform if the whole system uses
negative logic?

:::step{why="Changing the convention gives the dual function."}
The dual of NOR: swap OR with AND, keep the output inversion.
:::

:::step{why="Negative logic complements every input and the output, so the function seen is (f(A′, B′))′."}
$f(A, B) = (A + B)'$, so $\big(f(A', B')\big)' = \big((A' + B')'\big)' = A' + B' = (AB)'$.
:::

:::answer
A NAND gate.
:::
::::

::::example{#ex-bub-mixed level="gate" title="Edge case: active-low inputs, active-high output" depth="standard"}
An alarm $Y$ (active-high) must sound when the door signal $D_L$ (active-low: $D_L = 0$ means the
door is open) **or** the window signal $W_L$ (active-low) is asserted. Which single 2-input gate
produces $Y$ from $D_L$ and $W_L$?

:::step{why="Translate active-low signals into 'asserted' conditions: door open is D_L = 0, i.e. D_L′ = 1."}
$Y = D_L' + W_L'$.
:::

:::step{why="De Morgan: an OR of complements is the complement of an AND."}
$D_L' + W_L' = (D_L W_L)'$.
:::

:::answer
A NAND gate, $Y = (D_L W_L)'$, best drawn as an OR with bubbled inputs so that the bubbles meet the active-low wires.
:::
::::

:::note{#recap-bubbles title="Recap" depth="quick"}
A bubble inverts; two on one wire cancel. NAND = OR with bubbled inputs, NOR = AND with bubbled
inputs. Reading a circuit in negative logic turns every function into its dual.
:::

## Reading a circuit, gate by gate

:::intuition{#read-intuition title="A circuit is a recipe" depth="standard"}
A recipe says: whisk the eggs, melt the butter, then fold the melted butter into the whisked eggs.
Each step uses ingredients or the results of earlier steps, and you cannot fold before both earlier
steps are done. A circuit is the same: each gate uses circuit inputs or the outputs of gates further
left, and a gate's output is known only once all of its inputs are. So you read a circuit by naming
each intermediate result and working from left to right, exactly as you would follow the recipe.
:::

A circuit is a set of gates whose outputs feed other gates. To find what it computes, give every
gate output a name, then either follow one input row through the circuit or write each gate's
expression and substitute.

:::definition{#read-circuit term="Method: reading a gate circuit" depth="quick"}
1. **Label** the output of every gate ($G_1, G_2, \dots$), working from the inputs towards the output.
2. **Evaluate** a row: give the inputs values and compute each gate once all its inputs are known
   (level by level, left to right).
3. **Or write expressions:** each gate's output as an expression of its input signals, then substitute
   until only the circuit inputs remain.
4. **Check** the expression on one or two rows against step 2.
:::

:::viz{#read-viz spec="circuit-read" mode="animate" depth="standard"}
:::

The animation shows two habits worth copying. A signal that feeds two gates (here $B$) is used
twice, once by each gate. And a gate cannot be evaluated until all of its inputs are known; that is
why circuits are read level by level. Lesson 6 adds the third habit, which is time: real gates take a
few nanoseconds per level.

### Worked examples: reading a circuit

::::example{#ex-read-row level="easy" title="One row through two gates" depth="quick"}
$F = (A \text{ NAND } B) \text{ OR } C$. Find $F$ for $A = B = 1$, $C = 0$.

:::step{why="Evaluate the gate nearest the inputs first."}
$A \text{ NAND } B = (1 \cdot 1)' = 0$.
:::

:::step{why="The OR now has both inputs known."}
$F = 0 + 0 = 0$.
:::

:::answer
$F = 0$.
:::
::::

::::example{#ex-read-table level="medium" title="The whole truth table of a small circuit" depth="standard"}
$G_1 = \text{NOR}(A, B)$ and $F = \text{XOR}(G_1, A)$. Find the truth table and an expression for $F$.

:::step{why="NOR is 1 only on row 00."}
$G_1$ for rows 00, 01, 10, 11: 1, 0, 0, 0.
:::

:::step{why="XOR the G₁ column with the A column (0, 0, 1, 1) row by row."}
$F$: $1 \oplus 0 = 1$, $0 \oplus 0 = 0$, $0 \oplus 1 = 1$, $0 \oplus 1 = 1$.
:::

:::step{why="F is 0 on the single row 01, so it is an OR whose literals are all 0 there (the odd-row trick)."}
$F = A + B'$.
:::

:::answer
$F$ = 1, 0, 1, 1, that is $F = A + B'$.
:::
::::

::::example{#ex-read-expr level="gate" title="From a circuit to an expression" depth="standard"}
A circuit has $G_1 = \text{AND}(A, B)$, $G_2 = \text{NOT}(C)$, $G_3 = \text{AND}(G_2, D)$ and output
$F = \text{OR}(G_1, G_3)$. Write $F$ and evaluate it for $A = 0, B = 1, C = 0, D = 1$.

:::step{why="Write each gate's output in terms of its own inputs."}
$G_1 = AB$, $G_2 = C'$, $G_3 = G_2 D = C'D$.
:::

:::step{why="Substitute into the output gate."}
$F = G_1 + G_3 = AB + C'D$.
:::

:::step{why="Evaluate the expression, then confirm with the gates."}
$AB = 0$, $C'D = 1 \cdot 1 = 1$, so $F = 1$. Gate by gate: $G_1 = 0$, $G_2 = 1$, $G_3 = 1$, $F = 1$.
:::

:::answer
$F = AB + C'D$, and $F = 1$ on that row.
:::
::::

::::example{#ex-read-dead level="gate" title="Edge case: an input the output ignores" depth="standard"}
$G_1 = \text{OR}(A, B)$, $G_2 = \text{AND}(A, G_1)$, and the output is $F = G_2$. Does $F$ depend on $B$?

:::step{why="Write the expression."}
$F = A(A + B)$.
:::

:::step{why="Tabulate, or reason: if A = 0 the AND is 0; if A = 1 the OR is 1, so the AND gives 1."}
$F$ = 0, 0, 1, 1 for rows 00, 01, 10, 11, which is just $A$.
:::

:::step{why="Flipping B never changes F: compare rows 00 with 01, and 10 with 11."}
$F$ does not depend on $B$. (This is the absorption law $A(A + B) = A$ of Lesson 2.)
:::

:::answer
$F = A$; the input $B$ and the OR gate are redundant.
:::
::::

:::note{#recap-read title="Recap" depth="quick"}
Label every gate, evaluate level by level, and write each gate's expression in terms of its own
inputs before substituting. A circuit can ignore an input completely; check by flipping it.
:::

## Try it on the Gate Bench

Build any circuit from these seven gates, toggle the inputs, and watch every wire and the truth table
respond. The presets include the four-NAND XOR of Lesson 5 and the glitch circuit of Lesson 6.

:::lab{#lab-bench lab="gate-bench" tab="bench" depth="standard"}
:::

## GATE question on this lesson

This lesson's one previous-year question tests the table of tied and constant inputs. Try it before
opening the solution; the chips jump back to the blocks it uses.

:::pyq{id="cse-1999-a-7" tests="tie-inputs,nand-nor,controlling-value,trap-nor-1" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need
care.

:::practice{id="nx-dl-02-01-q01" depth="standard"}
:::

:::practice{id="nx-dl-02-01-q02" depth="standard"}
:::

:::practice{id="nx-dl-02-01-q03" depth="standard"}
:::

:::practice{id="nx-dl-02-01-q04" depth="standard"}
:::

:::practice{id="nx-dl-02-01-q05" depth="standard"}
:::

:::practice{id="nx-dl-02-01-q06" depth="standard"}
:::

:::practice{id="nx-dl-02-01-q07" depth="standard"}
:::

:::practice{id="nx-dl-02-01-q08" depth="standard"}
:::

:::practice{id="nx-dl-02-01-q09" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Logic gates on one card" depth="quick"}
| Gate | Expression | Output column (00, 01, 10, 11) | Reads as |
|:--|:--|:-:|:--|
| NOT | $A'$ | 10 (rows 0, 1) | opposite |
| AND | $AB$ | 0001 | all are 1 (0 controls) |
| OR | $A + B$ | 0111 | any is 1 (1 controls) |
| NAND | $(AB)' = A' + B'$ | 1110 | not all are 1 |
| NOR | $(A + B)' = A'B'$ | 1000 | none is 1 |
| XOR | $A \oplus B = A'B + AB'$ | 0110 | differ / odd number of 1s |
| XNOR | $A \odot B = AB + A'B'$ | 1001 | equal |

- $n$ inputs give $2^n$ rows in binary order, first variable most significant; there are 16 two-input functions.
- Inverting gate with tied inputs or its non-controlling constant = NOT; with its controlling constant = a constant ($x$ NOR 1 = 0).
- A 3-input NAND is $(ABC)'$; NAND(NAND($A, B$), $C$) $= AB + C'$.
- Bubble pushing: NAND = bubbled-input OR, NOR = bubbled-input AND; two bubbles cancel.
- Negative logic reads every gate as its dual: AND ↔ OR, NAND ↔ NOR, XOR ↔ XNOR.
:::

:::note{#further-depth title="Further depth: gates as transistors" depth="deep"}
In CMOS, the most common logic family, a NAND gate is two transistors in series to ground and two in
parallel to the supply; a NOR is the other way round. Series transistors are slower, and the
pull-up (PMOS) transistors are the slower kind, so a NOR's series PMOS pair makes it slower and
larger than a NAND. That is why NAND, not NOR, is the workhorse universal gate in practice (Lesson 5),
and why an inverting gate is cheaper than a non-inverting one: an AND gate is physically a NAND
followed by an inverter.
:::
