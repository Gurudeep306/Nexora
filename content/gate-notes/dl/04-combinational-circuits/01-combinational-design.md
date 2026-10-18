---
id: combinational-design
subject: dl
chapter: combinational-circuits
title: "Designing combinational circuits; code converters"
order: 1
prerequisites: [prime-implicants, codes]
pyq_topics: [dl/combinational, dl/minimization]
est_minutes: 45
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every truth table, minimal form, gate count, converter output and Gray-code claim is checked by enumeration in content/gate-notes/_checks/dl/l4_01_design.py (comblib netlists and the exhaustive AND/OR/NOT gate search, minlib minimal SOP/POS covers)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 38–39 and 44–47, set B pp. 117–118, set C pp. 201–202 and 277–283. The binary-to-Gray converter of set A p. 38 is BCD-only; see _errata/dl.md (A 38)."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (the design procedure, code conversion, BCD to excess-3, Gray code)."
  - "PYQs: src/gate/questions.json (cse-2000-b-9-a, cse-2000-b-9-b, cse-2001-b-58-b, cse-2004-cs-58, cse-2012-cs-6); every key and answer text is re-derived in l4_01_design.py. cse-2001-b-58-b is read from the scan as weight labels (8-4-2-1); cse-2000-b-9-b's 'one two-input gate' is an OR."
updated: "2026-10-19"
---

Until now we have been given functions: a minterm list, a map, an expression, a circuit to analyse.
Real design starts one step earlier, with a sentence: "light the lamp when at least two of the three
judges press their buttons", "convert a decimal digit to its excess-3 code", "output the digit modulo
six". This lesson turns such sentences into circuits by one fixed procedure (name the signals, write
the truth table, mark the rows that cannot happen as don't-cares, minimise each output, draw the
gates, check). We then count gates honestly and prove when a count is the minimum, and finish with the
most common family of design questions in GATE: **code converters**, circuits whose input is a word in
one code and whose output is the same value in another code.

## Where this fits

[Chapter 3, Lesson 2](lesson:prime-implicants) gave us minimal covers with don't-cares, and
[Chapter 1, Lesson 8](lesson:codes) defined BCD, excess-3 and the Gray code. This lesson joins the two:
the codes supply the truth tables, the unused code words supply the don't-cares, and the maps supply
the gates. Number-level code arithmetic (adding BCD digits, the +6 correction) stays in
[Chapter 1, Lesson 9](lesson:code-arithmetic); adders and subtractors as hardware are Chapter 5. The
rest of this chapter replaces individual gates by bigger building blocks (multiplexers, decoders,
ROMs), but every one of them is used through the same procedure you learn here.

:::table{#radar title="GATE radar: designing combinational circuits" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 5 (2000 two parts, 2001, 2004, 2012) |
| Marks | 1 one-mark MCQ (2012), 1 two-mark MCQ (2004), 3 descriptive parts (2000 (a) and (b), 2001) |
| Pattern 1 | From a word specification to a truth table and minimal gates, with "do not detect illegal input": 2000, 2004 |
| Pattern 2 | A code converter output as a minimal POS or SOP: 2000 (BCD mod 6), 2001 (excess-3 to BCD) |
| Pattern 3 | Which expression a truth table represents: 2012 |
| What examiners test | Using the unused codes 10–15 as don't-cares, which bit is the LSB, counting NOT gates when only AND/OR/NOT are allowed, proving a gate count is minimal, and reading table rows rather than shapes |
:::

## What makes a circuit combinational

:::intuition{#what-combinational title="A vending machine with no memory for coins" depth="standard"}
Imagine a vending machine that has no coin box: it looks only at which buttons are pressed **right
now** and drops the item that matches. Press the same buttons tomorrow and you get the same item; the
machine has no idea what was pressed a minute ago. That is a combinational circuit. Its output is a
fixed function of its present inputs, so a truth table describes it completely.

A real vending machine is different: it remembers how much money you have inserted, and the same
button gives "insert more coins" or a chocolate bar depending on that history. Remembering needs
**memory**, and in gates memory always comes from a loop (an output fed back to an input). Circuits with
loops are sequential circuits (Chapter 6). Everything in this chapter is loop-free, and that single
fact is what lets us design with truth tables and K-maps.
:::

:::definition{#comb-def term="Combinational circuit" depth="standard"}
A **combinational circuit** is a network of logic gates with $n$ inputs and $m$ outputs in which **no
signal path loops back** to an earlier gate (the network is an acyclic directed graph). Consequences:

- every output is a Boolean function of the **present** inputs only: $Z_j = f_j(x_1, \dots, x_n)$, so the
  circuit is fully described by one truth table with $2^n$ rows and $m$ output columns;
- after the inputs change, the outputs settle to their new values after a **propagation delay** (the
  longest input-to-output path, gate delays added up). Between the change and the settling the
  outputs may briefly show wrong values (glitches, Chapter 3, Lesson 4), but they never "remember"
  anything.

Combinational blocks you will meet in this chapter: code converters and detectors (this lesson),
multiplexers, decoders and encoders, comparators and parity circuits, ROMs and PLAs. Adders and
subtractors are combinational too, but they are built in Chapter 5.
:::

:::theorem{#acyclic-function name="An acyclic gate network computes a Boolean function" depth="standard"}
If a network of gates has no directed cycle, then for every assignment of 0s and 1s to its inputs each
line of the network has exactly one value, determined by that assignment alone. In particular every
output is a Boolean function of the inputs.
:::

:::proof{#proof-acyclic-function of="the acyclic-network theorem" depth="standard"}
**Idea first:** with no loops, the gates can be put in an order where each gate comes after every gate
that feeds it; then values can be computed one gate at a time, and nothing is ever waiting for itself.

A directed graph without cycles has a **topological order**: list the gates $g_1, g_2, \dots, g_k$ so
that every input of $g_i$ is a primary input or the output of some $g_j$ with $j < i$. (Repeatedly pick a
gate none of whose inputs come from an unlisted gate; one exists, otherwise following "fed by an
unlisted gate" backwards would go on for ever among finitely many gates, which means a cycle.)

Now induct along the order. The primary inputs have their given values. Suppose $g_1, \dots, g_{i-1}$
each have one value determined by the inputs. Every input of $g_i$ is a primary input or one of those
outputs, so it has one determined value, and a gate's output is a fixed function of its input values.
So $g_i$ has one determined value too. After $k$ steps every line, in particular every output, has a
single value that depends only on the input assignment: that is exactly a Boolean function.
:::

:::trap{#trap-feedback title="A loop of gates is not a combinational circuit" depth="standard"}
Draw two NOR gates, each feeding one input of the other (the other inputs are $S$ and $R$). With
$S = R = 0$ the pair can sit in **two** stable states: one output 1 and the other 0, or the reverse. The
inputs are the same, the outputs differ: there is no truth table, because the circuit remembers which
input was last 1. This is the SR latch of Chapter 6. So when a question asks for "the Boolean function"
of a circuit, first check that it has no loop; if it has one, the expected answer is "it is a latch /
sequential", not a minterm list. The common wrong move is to write $Q = \overline{R + \overline{Q}}$ and
"simplify" it as if $Q$ were an input.
:::

:::note{#recap-combinational title="Recap" depth="quick"}
Combinational = no feedback loops = outputs depend on present inputs only = one truth table describes
it. The proof is the topological order: evaluate gate by gate. Loops create memory (latches) and leave
this chapter.
:::

## The design procedure

:::intuition{#design-intuition title="From a sentence to a circuit in a fixed number of moves" depth="standard"}
Designing a combinational circuit is like translating a paragraph: you do not translate it all at once,
you fix the vocabulary first (what are the inputs, what are the outputs, which bit is worth what), then
translate sentence by sentence into rows of a table, then polish (minimise), and finally read your
translation back to make sure it says what the original said. Every GATE design question, from a
majority voter to a BCD converter, follows the same eight moves. Skipping the first move, naming and
ordering the bits, is the most common reason for a correct-looking but wrong answer.
:::

:::definition{#design-procedure term="The combinational design procedure" depth="standard"}
1. **Specification.** Read the sentence and decide what is input, what is output, and how many bits
   each needs.
2. **Name the signals and fix the bit order.** Give every input and output bit a name and say which one
   is the most significant (MSB) and which the least significant (LSB). Write the weights if the bits
   encode a number.
3. **Truth table.** One row per input combination ($2^n$ rows), one column per output bit. Fill each
   output from the specification.
4. **Don't-cares.** Rows that can never occur (unused code words) or whose output the specification
   leaves free are marked $X$.
5. **Minimise each output** on its own K-map, using the $X$s only where they enlarge a loop.
6. **Expression.** Write the minimal SOP or POS (or a factored form if gates, not literals, are
   counted).
7. **Gates.** Draw the circuit with the gates the question allows, sharing terms between outputs
   where possible.
8. **Verify.** Re-evaluate the circuit on every **care** row (or at least on the rows near the edges of
   the specification: the boundary values, the first and last code words).

Steps 3–5 are mechanical once steps 1–2 are right; steps 6–7 are where the gate count is decided.
:::

:::viz{#design-pipeline-viz spec="design-pipeline" mode="animate" depth="standard"}
:::

The animation runs the whole pipeline on the GATE 2004 specification "output 1 when the BCD digit is
at least 5": the word specification becomes a 16-row table with rows 10–15 marked $X$, the table becomes
a K-map, the K-map gives $A + BC + BD$, factoring gives $A + B(C + D)$, and that becomes a three-gate
circuit. Watch especially the moment the $X$s are used: without them the same function needs three
3-literal terms.

:::trap{#trap-bit-order title="Which input is the least significant bit?" depth="standard"}
GATE 2000 numbers the BCD input bits $I_1, I_2, I_3, I_4$ **with $I_1$ as the LSB**, and the outputs
$R_1, R_2, \dots$ also with $R_1$ as the LSB. Most textbooks, and our K-maps, write the MSB first
($A$ = weight 8). If you write the digits under the columns $I_1 I_2 I_3 I_4$ in that order, digit 1 (0001) gets
$I_4 = 1$, so every input wire is mirrored: the map then gives $R_1 = I_4$, $R_2 = I_1 + \overline{I_2} I_3$ and
$R_3 = I_2 \overline{I_3}$. Each looks just as minimal as the right answer, which is what makes the slip
dangerous: the examiner's wrong answer is a well-minimised expression of a mis-ordered table.

**The habit:** before writing the first row, write the weights above the input columns
($I_4 I_3 I_2 I_1$ = 8 4 2 1) and above the output columns. Then a row such as digit 6 is
$I_4 I_3 I_2 I_1 = 0110$ and cannot be misread.
:::

:::note{#recap-procedure title="Recap" depth="quick"}
Specification → names and bit order → truth table → don't-cares → one K-map per output → expression →
gates → verify. Write the weights above the columns before the first row.
:::

## Truth tables from words, and matching tables to expressions

:::intuition{#words-intuition title="Every sentence is a set of rows" depth="standard"}
A specification sentence is a filter on rows. "At least two inputs are 1" picks the rows with two or
three 1s; "the digit is 5 or more" picks rows 5–9; "do not detect illegal input" says the rows 10–15 will
never be applied, so we may write anything there. Once each sentence is seen as "which rows does this
select", the truth table writes itself, and the opposite question, "which expression does this table
represent", becomes "which expression is 1 on exactly these rows".
:::

:::definition{#truth-table-spec term="Writing the truth table from a specification" depth="standard"}
1. List the rows in counting order of the input bits, MSB first (row number = the binary value).
2. For each output, put 1 on the rows the specification selects and 0 on the rows it excludes.
3. Put $X$ (don't-care) on rows that **cannot occur** (unused code words of a code with fewer than
   $2^n$ words) and on rows where the specification **explicitly** leaves the output free.
4. Read phrases carefully: "at least $k$" includes $k$; "more than $k$" does not; "exactly one" excludes
   "both"; "otherwise" means 0 unless the question says otherwise.
5. A table may be **compressed** with input don't-cares: a row "$1\ -\ -$" stands for every row with
   the first input 1. Expand such rows before minimising.
:::

:::definition{#match-table term="Method: does an expression represent a table?" depth="standard"}
An expression represents a truth table exactly when it gives the table's output **on every row** (on
every care row, if the table has $X$s). So:

1. Read the table's 1-rows as minterms (or its 0-rows as maxterms).
2. For each candidate expression, evaluate it on the rows. A single row where it disagrees rules it
   out; that row is a **counterexample**.
3. A candidate that survives all rows is correct, however different it looks (an unsimplified SOP, an
   XOR form, a POS).

Shapes deceive: $X \oplus Y$ and $X + Y$ agree on three of the four rows of a 2-variable table and
differ only on row $X = Y = 1$. Always test the row that separates the candidates.
:::

:::trick{#trick-column-read title="Read a 2-variable table by its columns" depth="standard"}
On a 2-input table in counting order the output column is a 4-bit pattern $f(00) f(01) f(10) f(11)$.
Learn eight of them: 0011 = $X$, 0101 = $Y$, 0001 = $XY$, 0111 = $X + Y$, 0110 = $X \oplus Y$,
1001 = $X \odot Y$, 1100 = $X'$, 1010 = $Y'$.

**Why it works:** the first input changes slowest, so the column of $X$ itself is 0011 and the column of
$Y$ is 0101; every 2-variable function is a bitwise combination of these two columns.
**When it fails:** when the rows are not printed in counting order (see the edge-case example below),
or when the first column printed is not the variable you think it is. Decode each row by its labels if
there is any doubt.
:::

### Worked examples: truth tables and matching

::::example{#ex-tt-easy level="easy" title="A function read from a four-row table" depth="quick"}
A table gives $f(X, Y)$ as: $X Y = 00 \to 1$, $01 \to 1$, $10 \to 0$, $11 \to 1$. Which simple expression
is it?

:::step{why="The single 0 is the easiest handle: a function with one 0 is a single sum term (one maxterm)."}
The only 0 is at $X = 1, Y = 0$. A sum term is 0 only when each of its literals is 0, so we need the
literals that are 0 at $X = 1, Y = 0$: $X'$ and $Y$.
:::

:::step{why="Check every row, not just the one we built from: the expression must agree everywhere."}
$f = X' + Y$: row 00 gives $1$, row 01 gives $1$, row 10 gives $0 + 0 = 0$, row 11 gives $1$. All four
rows agree.
:::

:::answer
$f = X' + Y$ (the implication "$X \Rightarrow Y$"). Its column 1101 is the complement of 0010, which is
$XY'$, as De Morgan predicts.
:::
::::

::::example{#ex-tt-medium level="medium" title="A compressed table with don't-care inputs" depth="standard"}
A 3-input table is printed in compressed form: $A B C = 1\,-\,- \to 1$; $0\,1\,- \to 0$;
$0\,0\,1 \to 1$; $0\,0\,0 \to 0$. Find the minimal SOP.

:::step{why="A dash in an input column means the row stands for both values of that input; expand before mapping."}
$1\,-\,-$ is the four rows 100, 101, 110, 111 = $m_4, m_5, m_6, m_7$, all 1. $0\,1\,-$ is $m_2, m_3$, both 0.
$001 = m_1$ is 1 and $000 = m_0$ is 0.
:::

:::step{why="Now it is an ordinary minterm list."}
$f = \Sigma m(1, 4, 5, 6, 7)$.
:::

:::step{why="Loop: the row A = 1 is a quad; m1 pairs with m5 (they differ only in A)."}
Quad $A$; pair $m_1, m_5$ = $B'C$. $f = A + B'C$.
:::

:::answer
$f = A + B'C$. The compressed rows already hinted at it: "$A = 1$ gives 1" is the term $A$, and "$A = 0, B = 0,
C = 1$ gives 1" became $B'C$ once $m_5$ was borrowed from the $A$ quad.
:::
::::

::::example{#ex-tt-gate level="gate" title="Which of four expressions equal a table?" depth="standard"}
A table of $f(A, B, C)$ in counting order has the output column $0, 1, 1, 0, 1, 0, 0, 1$. Which of
(i) $A \oplus B \oplus C$, (ii) $A'B'C + A'BC' + AB'C' + ABC$, (iii) $(A \odot B) \oplus C$,
(iv) $A \oplus \overline{B \odot C}$ represent it?

:::step{why="Turn the column into a minterm list; the 1-rows are the targets."}
1s at rows 1, 2, 4, 7: $f = \Sigma m(1, 2, 4, 7)$, the rows with an **odd** number of 1s.
:::

:::step{why="XOR of several variables is 1 exactly when an odd number of them are 1."}
(i) $A \oplus B \oplus C$ is the odd-parity function: rows 1, 2, 4, 7. It matches.
:::

:::step{why="An SOP of minterms is read term by term."}
(ii) The four products are $m_1, m_2, m_4, m_7$. It matches, although it looks nothing like (i).
:::

:::step{why="XNOR is the complement of XOR, and complementing one input of an XOR complements the result."}
(iii) $A \odot B = \overline{A \oplus B}$, so $(A \odot B) \oplus C = \overline{A \oplus B \oplus C}$: rows 0, 3, 5, 6. Counterexample
row 1 (001): the table says 1, (iii) gives 0. It fails.
(iv) $\overline{B \odot C} = B \oplus C$, so (iv) is $A \oplus B \oplus C$ again. It matches.
:::

:::answer
(i), (ii) and (iv). The odd one out, (iii), is the complement; one row (001) is enough to reject it.
:::
::::

::::example{#ex-tt-edge level="gate" title="Edge case: a table whose rows are not in counting order" depth="standard"}
A table of $f(A, B, C)$ is printed with its rows in the order 000, 001, 011, 010, 110, 111, 101, 100 (Gray
order, as on a K-map axis), and the output column, top to bottom, is $0, 1, 1, 0, 0, 1, 1, 0$. What is $f$?

:::step{why="The position of a row on the page is not its number; the input bits written in the row are."}
Pair each output with its own row label: 001 → 1, 011 → 1, 111 → 1, 101 → 1; the other four rows are 0.
:::

:::step{why="The 1-rows are exactly those with C = 1, and every row with C = 1 is a 1."}
$f = \Sigma m(1, 3, 5, 7) = C$.
:::

:::step{why="This is the wrong answer the layout invites: reading the column as if the rows were 0, 1, 2, …, 7."}
Misread in counting order the 1s would be at positions 1, 2, 5, 6, giving $\Sigma m(1, 2, 5, 6) = B \oplus C$.
:::

:::answer
$f = C$. Whenever a table is printed in any order other than counting order, decode each row from its
labels; the column trick of the previous block applies only to counting order.
:::
::::

:::note{#recap-truth-tables title="Recap" depth="quick"}
A sentence selects rows; "cannot occur" rows are $X$. To match an expression to a table, evaluate it on
every row and look for one counterexample. Decode rows by their labels, never by their position.
:::

## Detectors and voting circuits

:::intuition{#detector-intuition title="A judge panel and a digit checker" depth="standard"}
A **detector** has many inputs and one output that says "yes, the input has the property". Two kinds
appear again and again. **Voting** circuits count: the light goes on when at least $k$ of the $n$
judges press their button (majority is $k = 2$ of 3). **Range** detectors compare a coded number with a
threshold: "the BCD digit is at least 5". Voting functions are symmetric (only the number of 1s
matters), so their maps have a regular pattern; range detectors on BCD inherit six free rows, 10–15,
which makes them dramatically cheaper.
:::

:::definition{#detectors term="Majority, minority and threshold detectors" depth="standard"}
- **Majority** of three inputs: 1 when at least two are 1. $M(A, B, C) = AB + BC + CA$ (four 1-rows:
  3, 5, 6, 7).
- **Minority** of three inputs: 1 when at most one is 1. It is the complement of majority:
  $\overline{M} = A'B' + B'C' + C'A'$ (rows 0, 1, 2, 4).
- **At least $k$ of $n$:** 1 when the number of 1s is $\ge k$. Its minimal SOP is the OR of all
  $\binom{n}{k}$ products of $k$ plain variables (every 1-row contains one of them, and none can be
  shortened), so it grows quickly with $n$.
- **Threshold on a code:** 1 when the coded value is in a range. On BCD inputs $A B C D$ (weights 8 4 2 1)
  the rows 10–15 are don't-cares unless the question says illegal inputs must be detected.
:::

:::derivation{#digit-ge5 of="the BCD 'digit ≥ 5' detector" depth="standard"}
**Specification.** Inputs $A B C D$ = a BCD digit (weights 8 4 2 1); output $f = 1$ when the digit is
5, 6, 7, 8 or 9.

**Table.** $f = \Sigma m(5, 6, 7, 8, 9) + d(10, 11, 12, 13, 14, 15)$.

**Map.** Rows $AB$, columns $CD$:

| $AB \backslash CD$ | 00 | 01 | 11 | 10 |
|:--|:--|:--|:--|:--|
| 00 | 0 | 0 | 0 | 0 |
| 01 | 0 | 1 | 1 | 1 |
| 11 | X | X | X | X |
| 10 | 1 | 1 | X | X |

**Loops.** The bottom two rows (8–15) are 1s and Xs only: the octet $A$. In row $AB = 01$, the cells 5 and 7
join 13 and 15 in the quad $BD$; the cells 7 and 6 join 15 and 14 in the quad $BC$. Every 1 is covered:

$$f = A + BD + BC = A + B(C + D).$$

**Sanity check.** Digit 4 = 0100: $0 + 1 \cdot (0 + 0) = 0$ ✓. Digit 5 = 0101: $0 + 1 \cdot 1 = 1$ ✓. Digit 8 =
1000: $1$ ✓. Digit 3 = 0011: $0 + 0 = 0$ ✓. Without the don't-cares the same function would be
$A'BD + A'BC + AB'C'$, nine literals instead of five.
:::

:::definition{#dc-illegal term="Unused codes are don't-cares" depth="standard"}
A 4-bit input that carries a BCD digit uses only 10 of its 16 code words; the six words 1010–1111 (rows
10–15) can never arrive from a correct source. The phrase "**do not detect illegal input**" (GATE 2000)
or "the input is a BCD digit" (GATE 2004) tells you exactly that: the output on those rows is never
looked at, so they are don't-cares. The same holds for every code with fewer than $2^n$ words: excess-3
leaves rows 0, 1, 2 and 13, 14, 15 unused; a 2-out-of-5 code leaves 22 of its 32 rows unused.

Counting them: an input of $n$ bits carrying $W$ legal words has $2^n - W$ don't-care rows; two BCD
digits on 8 wires have $256 - 100 = 156$.
:::

:::trap{#trap-dc-illegal title="Detecting illegal inputs is extra work, not the default" depth="standard"}
If the question says "do not detect illegal input", using rows 10–15 as 0s instead of Xs is not
wrong logically, but it gives a more expensive circuit, and the examiner's gate count is the cheap
one. For "digit ≥ 5", treating 10–15 as 0s gives $A'BD + A'BC + AB'C'$ (9 literals), and the cheapest
AND/OR/NOT circuit then needs 6 gates instead of the three of $A + B(C + D)$ (see the edge case below). The reverse slip is worse: if a question says
illegal codes **must** give 0 (or must be flagged), then using them as Xs produces a circuit that
outputs 1 on code 1100, a real error. Read which of the two the question wants.
:::

:::note{#recap-detectors title="Recap" depth="quick"}
Majority $= AB + BC + CA$; minority is its complement; "at least $k$ of $n$" is the OR of all $k$-variable
products. BCD inputs give six free rows (10–15) unless illegal codes must be detected. Digit ≥ 5 is
$A + B(C + D)$.
:::

## Counting gates

:::intuition{#count-intuition title="Read the shopping rules before you shop" depth="standard"}
"Minimum number of gates" is meaningless until the rules are fixed, just as "cheapest dinner" depends
on which restaurants you may enter. Which gate types are allowed? Can an AND gate take three inputs or
only two? Are the complemented inputs $A'$, $B'$ available for free, or does each one cost a NOT gate?
The same function can need 3 gates under one set of rules and 5 under another. Once the rules are
fixed, there are two halves to every answer: a circuit that achieves the count (an upper bound), and an
argument that nothing smaller works (a lower bound).
:::

:::definition{#gate-count term="Gate-count rules" depth="standard"}
- **Allowed types.** "Only AND, OR and NOT" (GATE 2004) means XOR, NAND and NOR are not available, and
  every NOT is a gate that counts.
- **Fan-in.** Unless the question limits it, an AND or OR gate may have any number of inputs. "Two-input
  gates" (GATE 2000) means a 3-input AND costs two gates.
- **Complements.** Unless the question says "inputs and their complements are available", only the
  plain inputs exist, so $A'$ costs a NOT gate. In a factored form, try to keep complements out:
  $A + B(C + D)$ needs none.
- **Wires and constants are free.** An output equal to an input ($R_1 = I_1$) or to a constant
  ($R_4 = 0$) costs no gate.
- **Sharing.** A gate whose output feeds two places is counted once.

Minimal two-level forms minimise literals, not gates: factoring ($AB + AC = A(B + C)$) usually saves gates
when fan-in is free, so after the K-map try to factor.
:::

:::theorem{#gate-lower-bound name="What zero, one and two gates can compute" depth="standard"}
Count AND and OR gates (any fan-in) and NOT gates, with only the plain inputs available.

1. With **0 gates** the output is a primary input or a constant.
2. With **1 gate** the output is an AND or an OR of some inputs, or the NOT of one input.
3. With **2 gates** the output is one of: a one-gate function; the NOT of an AND or OR of inputs (a NAND or
   NOR of inputs); an AND or OR of inputs and one complemented input; or $\text{OR}(X) + \text{AND}(Y)$ or
   $\text{AND}(X) \cdot \text{OR}(Y)$ for sets of inputs $X$, $Y$.

So a circuit of $k$ gates is **minimal** as soon as it exists and every function of the forms with fewer
than $k$ gates disagrees with $f$ on some care row.
:::

:::proof{#proof-gate-lower-bound of="the small-circuit theorem" depth="standard"}
**Idea first:** list what the output gate can see. In a circuit of $k$ gates, the output gate sees only
primary inputs and the outputs of the other $k - 1$ gates, so the possible functions can be listed level
by level.

With no gate the output wire is an input or a constant. With one gate every input of that gate is a
primary input (there is no other gate), so it is AND or OR of inputs, or NOT of one input.

With two gates, call them $G_1$ (inner) and $G_2$ (output). If $G_2$ does not use $G_1$, it is a one-gate
function. If $G_2$ is a NOT, it complements the one-gate function $G_1$: if $G_1$ is NOT $x$, then
NOT(NOT $x$) $= x$, an input (case 1), and if $G_1$ is an AND or OR of inputs, its NOT is a NAND or NOR of inputs. If $G_1$ is a NOT of input $x$ and
$G_2$ is an AND or OR, then $G_2$ combines plain inputs and $x'$. If both are AND or OR: equal types merge
into one gate ($\text{AND}(X, \text{AND}(Y)) = \text{AND}(X \cup Y)$), and different types give
$\text{OR}(X) + \text{AND}(Y)$ or $\text{AND}(X) \cdot \text{OR}(Y)$. That is every case.
:::

:::definition{#ge5-two-gates term="Why 'digit ≥ 5' needs three gates" depth="standard"}
Apply the theorem to $f$ = "BCD digit ≥ 5". Only care rows (0–9) matter. Useful values:
$f(0000) = 0$, $f(0011) = 0$ (digit 3), $f(0100) = 0$ (digit 4), $f(0101) = 1$, $f(0110) = 1$,
$f(1000) = 1$.

- **0 gates:** $f$ is not constant, and it is not an input: $f(1000) = 1$ while $B = C = D = 0$ there, and
  $f(0101) = 1$ while $A = 0$ there.
- **NAND or NOR of inputs:** both give 1 on 0000, but $f(0000) = 0$.
- **AND of inputs or literals:** an AND is 1 on a cube; a cube holding 0101 and 1000 has $A$, $B$, $D$ free
  ($C$ is 0 in both), so it also holds 0000, where $f = 0$.
- **OR of inputs or literals:** an OR is 0 on a cube; a cube holding the 0-rows 0011 and 0100 has $B$, $C$,
  $D$ free ($A$ is 0 in both), so it also holds 0101, where $f = 1$.
- **$\text{OR}(X) + \text{AND}(Y)$:** 0100 and 0011 force $B, C, D \notin X$, so $X \subseteq \{A\}$. Then 0101
  needs $\text{AND}(Y) = 1$ there, so $Y \subseteq \{B, D\}$, and 0110 needs $Y \subseteq \{B, C\}$: hence $Y \subseteq \{B\}$.
  $Y = \varnothing$ is not a gate (an AND of nothing is the constant 1, which would make $f \equiv 1$), and
  $Y = \{B\}$ makes $f(0100) = 1$. Contradiction.
- **$\text{AND}(X) \cdot \text{OR}(Y)$:** 1000 forces $X \subseteq \{A\}$ and 0101 forces $X \subseteq \{B, D\}$, so
  $X = \varnothing$ and the circuit is one gate, already excluded.

No circuit of two gates works, and $A + B(C + D)$ uses three: **3 is the minimum** (our check confirms it
with an exhaustive search over every AND/OR/NOT circuit of up to three gates).
:::

:::trap{#trap-gate-count title="Counting terms instead of gates" depth="standard"}
The minimal SOP $A + BC + BD$ has two AND terms and one OR: "3 gates" by luck, but a student who
counts this way for $A'BD + A'BC + AB'C'$ says "4 gates" and forgets the NOT gates for $A'$, $B'$, $C'$,
which under "only AND, OR and NOT" are real gates. Conversely, "2 gates" (the GATE 2004 distractor) comes
from imagining $A + B(C + D)$ as one OR and one "AND-OR" box. Count every box in the drawn circuit,
inverters included, and only after factoring.
:::

### Worked examples: design procedure and detectors

::::example{#ex-det-easy level="easy" title="A three-judge majority voter" depth="quick"}
Three judges press buttons $A$, $B$, $C$. A lamp lights when at least two press. Design the circuit.

:::step{why="Step 1–3 of the procedure: three inputs, one output, eight rows; the selected rows are those with two or three 1s."}
Rows with at least two 1s: 011, 101, 110, 111, so $M = \Sigma m(3, 5, 6, 7)$.
:::

:::step{why="On the 3-variable map, m7 has three neighbours that are all 1s; each pair with m7 is a prime implicant, and each is essential."}
Pairs $m_3 m_7 = BC$, $m_5 m_7 = AC$, $m_6 m_7 = AB$. $M = AB + BC + CA$.
:::

:::step{why="Verify on a boundary row: exactly one judge must not light the lamp."}
$A B C = 100$: $0 + 0 + 0 = 0$ ✓. $110$: $AB = 1$ ✓.
:::

:::answer
$M = AB + BC + CA$: three 2-input ANDs and one 3-input OR. The minority circuit is the same with every
input inverted, $A'B' + B'C' + C'A'$, because "at most one is 1" means "at least two are 0".
:::
::::

::::example{#ex-det-medium level="medium" title="BCD digit ≥ 5 with AND, OR and NOT only" depth="standard"}
A 4-bit BCD digit $A B C D$ is the input; the output is 1 when the digit is 5 or more. Only AND, OR and NOT
gates may be used (any fan-in). What is the minimum number of gates?

:::step{why="BCD never produces 1010–1111, so those rows are free."}
$f = \Sigma m(5, 6, 7, 8, 9) + d(10\text{–}15)$.
:::

:::step{why="The Xs complete the octet A and the quads BD and BC (see the derivation above)."}
Minimal SOP: $f = A + BD + BC$.
:::

:::step{why="Gates, not literals, are counted, so factor: B is common to two terms."}
$f = A + B(C + D)$: OR($C$, $D$), AND($B$, ·), OR($A$, ·). Three gates, and no NOT is needed.
:::

:::step{why="Lower bound: the case analysis of the previous block shows that no circuit with one or two gates agrees with f on rows 0–9."}
Two gates are impossible.
:::

:::answer
3 gates. This is the GATE 2004 question. The unfactored SOP $A + BD + BC$ also uses 3 gates when fan-in is free
(two ANDs and a 3-input OR), but drawn with 2-input gates it takes 4, while $A + B(C + D)$ still needs 3. Without
the don't-cares it needs 6 (the edge case below).
:::
::::

::::example{#ex-count-rules level="medium" title="One function, three sets of gate-count rules" depth="standard"}
Build $A \oplus B$ from AND, OR and NOT gates only. What is the fewest gates (a) with only $A$ and $B$
available and any fan-in, (b) when the complements $A'$ and $B'$ are also available for free, and (c) with
only $A$, $B$ and 2-input gates?

:::step{why="Start from the obvious two-level form and count every box, inverters included."}
The SOP $A'B + AB'$ needs NOT $A$, NOT $B$, two ANDs and one OR: 5 gates under rule (a).
:::

:::step{why="Factor so that only one complement is needed: XOR means 'at least one is 1, but not both'."}
$A \oplus B = (A + B)\cdot\overline{AB}$: OR($A$, $B$), AND($A$, $B$), NOT, AND: **4 gates**. Check: 00 gives
$0 \cdot 1 = 0$, 01 and 10 give $1 \cdot 1 = 1$, 11 gives $1 \cdot 0 = 0$ ✓.
:::

:::step{why="Lower bound with the small-circuit theorem: XOR is not monotone (raising B from 01 to 11 drops the output from 1 to 0), so it cannot be an AND/OR of plain inputs or OR(X) + AND(Y) or AND(X)·OR(Y); a NAND or NOR of inputs is 1 on 00; and A′B, AB′, A′ + B, A + B′ each miss a row."}
No circuit of one or two gates computes $A \oplus B$, and an exhaustive search shows that three gates cannot
either. So 4 is the minimum under rule (a).
:::

:::step{why="Rule (b) makes the inverters free, which is exactly what the SOP was paying for."}
With $A'$ and $B'$ on wires, $A'B + AB'$ costs two ANDs and one OR: **3 gates**, and the search confirms that
two are not enough.
:::

:::step{why="Rule (c) limits fan-in; check whether the best circuit already uses only 2-input gates."}
Every gate of $(A + B)\cdot\overline{AB}$ has at most two inputs, so the fan-in limit costs nothing here:
still **4 gates**. (Contrast the previous example, where $A + BD + BC$ needs a 3-input OR and the limit adds a
gate, unless you factor.)
:::

:::answer
(a) 4, (b) 3, (c) 4. The same function costs a different number of gates under different rules, which is
why the first move in every gate-count question is to read the rules: which types, which fan-in, and
whether complements are free.
:::
::::

::::example{#ex-det-gate level="gate" title="At least two of four switches" depth="standard"}
Four switches $A, B, C, D$; output 1 when at least two are on. Find the minimal SOP, its literal count,
and the cheapest gate-level form (AND and OR gates of any fan-in; no complements are needed).

:::step{why="Count the selected rows by the number of 1s: two, three or four of the four inputs."}
$\binom{4}{2} + \binom{4}{3} + \binom{4}{4} = 6 + 4 + 1 = 11$ rows are 1; only the five rows with at most one 1
(0, 1, 2, 4, 8) are 0.
:::

:::step{why="Every 1-row contains some pair of 1s, and a product of two plain variables is a prime implicant (dropping either variable would include a row with a single 1)."}
Minimal SOP: $AB + AC + AD + BC + BD + CD$: 6 terms, 12 literals. (The minimal POS,
$(A + B + C)(A + B + D)(A + C + D)(B + C + D)$, also has 12.)
:::

:::step{why="Group by halves: 'two on' means two in the same half (AB or CD) or one in each half."}
$f = AB + CD + (A + B)(C + D)$: gates OR($A$, $B$), OR($C$, $D$), AND of those two, AND($A$, $B$),
AND($C$, $D$), and one 3-input OR: 6 gates instead of the 7 of the two-level form (six ANDs and one OR).
:::

:::step{why="Read the same idea the other way round: if no pair sits inside one half, then at least one switch is on in each half. So 'two on' is 'the first half has one on, or the second half has a pair' AND 'the second half has one on, or the first half has a pair'."}
Better still: $f = (A + B + CD)(C + D + AB)$. Gates: AND($A$, $B$), AND($C$, $D$), OR($A$, $B$, $CD$),
OR($C$, $D$, $AB$) and the final AND: **5 gates**. Check row 1100 ($A = B = 1$): $(1)(0 + 0 + 1) = 1$ ✓; row 1000: the
second factor is $0 + 0 + 0 = 0$ ✓; row 1010: $(1)(1) = 1$ ✓.
:::

:::step{why="Is 5 the end? Only a lower bound can say; an exhaustive search over AND/OR/NOT circuits settles it."}
No circuit of 4 or fewer gates computes "at least two of four", so 5 is the minimum.
:::

:::answer
11 minterms; minimal SOP with 6 terms and 12 literals (7 gates two-level); $AB + CD + (A + B)(C + D)$ uses
6 gates and $(A + B + CD)(C + D + AB)$ uses 5, the minimum. Voting functions are symmetric, so "count the
1s" is always the quickest way to the rows, and splitting the inputs into halves is the quickest way to a
small circuit.
:::
::::

::::example{#ex-det-edge level="gate" title="Edge case: the same detector when illegal codes must give 0" depth="standard"}
Repeat "digit ≥ 5", but now the inputs 1010–1111 must produce 0 (an illegal code must not be reported as
a large digit). What changes?

:::step{why="The six rows are no longer free: they become 0s."}
$f = \Sigma m(5, 6, 7, 8, 9)$, with no don't-cares.
:::

:::step{why="On the map, A no longer forms an octet (12–15 and 10, 11 are 0s); 8 and 9 form only the pair AB′C′, and 5, 6, 7 need A′."}
Minimal SOP: $f = A'BD + A'BC + AB'C' = A'B(C + D) + AB'C'$: 9 literals.
:::

:::step{why="Now complements cost NOT gates, and the SOP needs three of them."}
One realisation of the SOP: NOT $A$, NOT $B$, NOT $C$, OR($C$, $D$), AND($A'$, $B$, $C + D$), AND($A$, $B'$, $C'$), and
the final OR: 7 gates.
:::

:::step{why="Gates, not literals, are counted, so try a factoring that keeps complements to a minimum: build 'digit ≥ 5' as if rows 10–15 were free, then remove those rows with a single NOT."}
Factoring differently does better: $f = (A + B)(A + C + D)\cdot\overline{A(B + C)}$. Here
$(A + B)(A + C + D) = A + B(C + D)$ is "digit ≥ 5" read on all 16 rows (it is 1 on 5–15), and
$\overline{A(B + C)}$ is 0 exactly on the rows with $A = 1$ and $B$ or $C$ set, which are rows 10–15. The gates:
OR($A$, $B$), OR($A$, $C$, $D$), OR($B$, $C$), AND($A$, ·), NOT, and a 3-input AND: **6 gates**.
:::

:::step{why="An upper bound is half the answer; the other half is the lower bound, here by an exhaustive search over every AND/OR/NOT circuit."}
An exhaustive search shows that no circuit of 5 or fewer gates exists, so 6 is the minimum.
:::

:::answer
The minimum rises from 3 gates to 6. This is why "do not detect illegal input" matters: it is the
difference between using rows 10–15 as Xs and paying for them as 0s. Notice also that the cheapest
circuit is not the minimal SOP (7 gates): a single NOT on a shared sub-expression is cheaper than three
NOTs on the inputs.
:::
::::

:::note{#recap-gates title="Recap" depth="quick"}
Fix the rules (types, fan-in, complements) first. Upper bound: draw a circuit, factored. Lower bound:
list what fewer gates can compute and find a care row that each one gets wrong. Every NOT counts under
"only AND, OR and NOT". $A \oplus B$ costs 4 gates with plain inputs, 3 with free complements;
"digit ≥ 5" costs 3 with don't-cares, 6 without; "at least two of four" costs 5.
:::

## Converting between codes

:::intuition{#converter-intuition title="A dictionary with one page per output bit" depth="standard"}
A code converter is a translator between two ways of writing the same number: decimal digit 7 is 0111 in
BCD, 1010 in excess-3, and 0100 in the Gray code. Since the input word fully determines the output word,
a converter is just a multi-output truth table: list each legal input word, write the output word next
to it, and then treat **each output bit as a separate function** with its own K-map. The unused input
words are don't-cares for every output at once, which is why BCD converters come out so small.
:::

:::definition{#code-converters term="Designing a code converter" depth="standard"}
1. Write the table: one row per legal input code word, the corresponding output code word beside it.
2. Mark every unused input word as a don't-care in **every** output column.
3. Draw one K-map per output bit (4 maps for a 4-bit output) and minimise each.
4. Look for shared sub-expressions between outputs (the same loop, or a factor such as $C + D$) and build
   them once.
5. Check the converter on all legal inputs, particularly the first and last code words.
:::

:::definition{#bcd-mod-n term="BCD to the digit modulo n" depth="standard"}
For a BCD digit $d$ (0–9) the converter outputs $d \bmod n$ in binary. The rule is periodic: inputs $0,
\dots, n - 1$ pass unchanged, and from $n$ on the residues repeat ($n \to 0$, $n + 1 \to 1$, …). Rows 10–15 are
don't-cares ("do not detect illegal input"). The output needs $\lceil \log_2 n \rceil$ bits; any further output
bit is constant 0.
:::

:::derivation{#bcd-mod6 of="the BCD mod 6 converter (GATE 2000)" depth="standard"}
**Names and order.** Inputs $I_4 I_3 I_2 I_1$ with weights 8 4 2 1 ($I_1$ = LSB); outputs
$R_4 R_3 R_2 R_1$, also LSB $R_1$.

| Digit | $I_4 I_3 I_2 I_1$ | $d \bmod 6$ | $R_3 R_2 R_1$ |
|:--|:--|:--|:--|
| 0–5 | 0000–0101 | same | 000–101 |
| 6 | 0110 | 0 | 000 |
| 7 | 0111 | 1 | 001 |
| 8 | 1000 | 2 | 010 |
| 9 | 1001 | 3 | 011 |
| 10–15 | 1010–1111 | X | XXX |

**$R_4$.** The largest residue is 5 = 101, so $R_4 = 0$ on every care row.

**$R_1$.** 1 for residues 1, 3, 5, i.e. digits 1, 3, 5, 7, 9: exactly the odd digits, so $R_1 = I_1$.

**$R_2$** (weight 2). 1 for residues 2, 3: digits 2, 3, 8, 9. With the Xs, rows 8–15 form the octet $I_4$; digits 2
and 3 form the pair $\overline{I_4}\,\overline{I_3} I_2$, which grows with the Xs 10 and 11 into the quad
$\overline{I_3} I_2$. So $R_2 = I_4 + I_2 \overline{I_3}$.

**$R_3$** (weight 4). 1 for residues 4, 5: digits 4, 5 (digits 6, 7 have residues 0, 1). Digits 4 and 5 are
0100 and 0101; with Xs 12 and 13 they form the quad $I_3 \overline{I_2}$. So $R_3 = I_3 \overline{I_2}$.

**Gates.** $R_1$ and $R_4$ are wires. $R_3$: NOT($I_2$), AND($I_3$, $\overline{I_2}$). $R_2$: NOT($I_3$),
AND($I_2$, $\overline{I_3}$), OR($I_4$, ·). Altogether **two 2-input ANDs, one 2-input OR and two NOTs**.

**Sanity check.** Digit 7 = 0111: $R_3 = 1 \cdot 0 = 0$, $R_2 = 0 + 1 \cdot 0 = 0$, $R_1 = 1$: 001 = 1 ✓. Digit 8 = 1000:
$R_3 = 0$, $R_2 = 1$, $R_1 = 0$: 010 = 2 ✓.
:::

:::trick{#trick-period title="The low bit passes through when n is even" depth="standard"}
For BCD mod $n$ with $n$ even, the output LSB is simply the input LSB ($R_1 = I_1$ above), and you can skip
its K-map.

**Why it works:** $d \bmod n = d - kn$ for some whole number $k$, and $kn$ is even when $n$ is even, so
subtracting it does not change whether the number is odd. The parity bit of the residue equals the
parity bit of the digit.
**When it fails:** for odd $n$ the subtracted $kn$ can be odd and flips the parity. In BCD mod 5, digit 5
(odd) maps to 0 (even), and the output LSB needs $AD' + A'B'D + BCD'$. Likewise for BCD mod 2ⁱ (2, 4, 8)
all the low $i$ bits pass through, because subtracting a multiple of $2^i$ changes only the higher bits.
:::

:::definition{#bcd-to-xs3 term="BCD to excess-3" depth="standard"}
Excess-3 writes digit $d$ as the 4-bit binary of $d + 3$ (Chapter 1, Lesson 8). So the converter adds 3:
digit 0 → 0011, digit 9 → 1100. With BCD inputs $B_3 B_2 B_1 B_0$ (weight 8 = $B_3$) and outputs
$E_3 E_2 E_1 E_0$, rows 10–15 are don't-cares. Adding a constant is arithmetic, but as a converter it is
four small functions, derived below.
:::

:::derivation{#xs3-derivation of="the BCD to excess-3 converter equations" depth="standard"}
**Table** (digits 0–9; Xs on 10–15):

| Digit | $B_3 B_2 B_1 B_0$ | $E_3 E_2 E_1 E_0$ |
|:--|:--|:--|
| 0 | 0000 | 0011 |
| 1 | 0001 | 0100 |
| 2 | 0010 | 0101 |
| 3 | 0011 | 0110 |
| 4 | 0100 | 0111 |
| 5 | 0101 | 1000 |
| 6 | 0110 | 1001 |
| 7 | 0111 | 1010 |
| 8 | 1000 | 1011 |
| 9 | 1001 | 1100 |

**$E_0$:** 1 for digits 0, 2, 4, 6, 8 (adding 3 flips the parity), so $E_0 = B_0'$.

**$E_1$:** 1 for digits 0, 3, 4, 7, 8. On the map these are the cells with $B_1 B_0 = 00$ or $11$; with the Xs,
$E_1 = B_1'B_0' + B_1 B_0 = \overline{B_1 \oplus B_0}$.

**$E_2$:** 1 for digits 1, 2, 3, 4, 9. With the Xs: $E_2 = B_2'B_0 + B_2'B_1 + B_2 B_1' B_0'$. Factor out
$B_1 + B_0$: the first two terms are $B_2'(B_1 + B_0)$ and the last is $B_2\overline{(B_1 + B_0)}$, so
$E_2 = B_2 \oplus (B_1 + B_0)$.

**$E_3$:** 1 for digits 5–9, which is the "digit ≥ 5" detector again: $E_3 = B_3 + B_2(B_1 + B_0)$.

**Sanity check.** Digit 6 = 0110: $E_3 = 0 + 1 \cdot 1 = 1$, $E_2 = 1 \oplus 1 = 0$, $E_1 = \overline{1 \oplus 0} = 0$,
$E_0 = 1$: 1001 = 9 = 6 + 3 ✓. Digit 0: $E_3 = 0$, $E_2 = 0 \oplus 0 = 0$, $E_1 = 1$, $E_0 = 1$: 0011 ✓.
:::

:::viz{#converter-kmaps-viz spec="converter-kmaps" mode="animate" depth="standard"}
:::

The animation draws the four maps side by side over the inputs $B_3 B_2 B_1 B_0$ (the same names as the
table), with the Xs on cells 10–15, and loops one output per step from the MSB down: $E_3$'s octet $B_3$ with
the two quads $B_2B_1$ and $B_2B_0$; $E_2$'s two quads and one pair; $E_1$'s left-column quad $B_1'B_0'$ and
third-column quad $B_1B_0$; and $E_0$'s octet $B_0'$ (the two outer columns). The maps give the two-level
forms; $E_2$ and $E_1$ are then factored into the XOR and XNOR forms above. Notice how every big loop reaches
into the X cells; remove the Xs and each output costs more.

:::definition{#xs3-to-bcd term="Excess-3 to BCD (subtract 3)" depth="standard"}
The reverse converter takes excess-3 inputs $e_8 e_4 e_2 e_1$ (named by their weights, as GATE 2001 does)
and outputs BCD $b_8 b_4 b_2 b_1$. The legal inputs are codes 3–12 (0011–1100); the unused codes **0, 1, 2
and 13, 14, 15** are don't-cares. Digit $d$ arrives as code $d + 3$:

- $b_1 = \overline{e_1}$ (subtracting 3 flips parity);
- $b_2$ is 1 for digits 2, 3, 6, 7, i.e. codes 5, 6, 9, 10: $b_2 = e_2 \oplus e_1$;
- $b_4$ is 1 for digits 4–7, i.e. codes 7, 8, 9, 10;
- $b_8$ is 1 for digits 8, 9, i.e. codes 11, 12.

For a **minimal POS**, loop the 0s. For $b_4$ the 0-codes are 3, 4, 5, 6, 11, 12 and the Xs are 0, 1, 2, 13, 14,
15. Codes 3 (0011) and 11 (1011) form a pair, the factor $(e_4 + \overline{e_2} + \overline{e_1})$, and the pair cannot
grow: each of its three possible quads contains a 1, code 7 ($\{3, 7, 11, 15\}$), code 9 ($\{1, 3, 9, 11\}$) or
code 10 ($\{2, 3, 10, 11\}$). Codes 4, 5, 12 (with X13) form the
quad $(\overline{e_4} + e_2)$, and codes 4, 6, 12 (with X14) the quad $(\overline{e_4} + e_1)$. There are **three equally
minimal POS forms, each with 7 literals**:

$$b_4 = (\overline{e_4} + e_2)(\overline{e_4} + e_1)(e_4 + \overline{e_2} + \overline{e_1})$$

and the two variants in which $(e_8 + e_2)$ replaces $(\overline{e_4} + e_2)$, or $(e_8 + e_1)$ replaces
$(\overline{e_4} + e_1)$ (the quad $(e_8 + e_2)$ = codes 0, 1, 4, 5 can take over codes 4 and 5, and $(e_8 + e_1)$ =
codes 0, 2, 4, 6 can take over codes 4 and 6). Any one of them is a correct answer to GATE 2001.
:::

:::intuition{#gray-intuition title="Counting with one finger at a time" depth="standard"}
The Gray code is a way of counting in which only **one bit changes** between neighbours: 000, 001, 011,
010, 110, … . A rotary encoder on a shaft uses it so that a reading taken exactly on the boundary between
two positions can only be off by one step, never wildly wrong. Converting between binary and Gray turns
out to need nothing but XOR gates, because "does this bit differ from its neighbour?" is exactly what XOR
answers.
:::

:::theorem{#binary-gray name="Binary ↔ reflected Gray conversion" depth="standard"}
For an $n$-bit binary number $B_{n-1} \dots B_1 B_0$ and its reflected Gray code $G_{n-1} \dots G_0$
(taking $B_n = 0$):

$$G_i = B_i \oplus B_{i+1}, \qquad\text{and conversely}\qquad B_i = G_i \oplus B_{i+1} = G_i \oplus G_{i+1} \oplus \dots \oplus G_{n-1}.$$

In particular $G_{n-1} = B_{n-1}$: the MSB passes straight through.
:::

:::proof{#proof-binary-gray of="the binary–Gray conversion" depth="standard"}
**Idea first:** the reflected Gray code of $n$ bits is "a 0, then the $(n-1)$-bit code; then a 1, then the
$(n-1)$-bit code in reverse". Reversing the list of **all** $(n-1)$-bit numbers sends position $r$ to
position $2^{n-1} - 1 - r$, which is $r$ with every bit complemented, and that complement is exactly what
XOR with the leading 1 does.

Induct on $n$. For $n = 1$, Gray = binary (0, 1), and $G_0 = B_0 \oplus 0$ ✓. Suppose the formula holds for
$n - 1$ bits. Take an $n$-bit number $b$. If its MSB is 0, its Gray code is 0 followed by the $(n-1)$-bit
code of the rest, so $G_{n-1} = 0 = B_{n-1}$ and the lower bits obey the formula by induction; also
$G_{n-2} = B_{n-2} \oplus 0 = B_{n-2} \oplus B_{n-1}$ ✓. If its MSB is 1, $b = 2^{n-1} + r$ sits in the reflected
half, at the position of $r' = 2^{n-1} - 1 - r$ counted from the end, and $r'$ is $r$ with every bit
complemented. Its Gray code is 1 followed by the code of $r'$. By induction the lower Gray bits are
$\overline{r_i} \oplus \overline{r_{i+1}} = r_i \oplus r_{i+1}$ for $i < n - 2$, and $G_{n-2} = \overline{r_{n-2}} \oplus 0 = r_{n-2} \oplus 1
= B_{n-2} \oplus B_{n-1}$ ✓. So $G_i = B_i \oplus B_{i+1}$ for all $i$.

The converse follows by solving: $B_i = G_i \oplus B_{i+1}$ (XOR both sides of $G_i = B_i \oplus B_{i+1}$ with
$B_{i+1}$), and unrolling from the top bit, $B_{n-1} = G_{n-1}$, gives the running XOR.
:::

:::viz{#gray-converter-viz spec="gray-converter" mode="animate" depth="standard"}
:::

The animation shows two circuits. The first converts the binary input 1011 to Gray: each Gray bit is the
XOR of two neighbouring binary bits and needs no other Gray bit, so the three XORs work in parallel (the
binary → Gray converter has depth one), even though the scene lights them one at a time to show each
calculation. The second circuit converts the Gray code 1110 back: the binary bits are recovered **one after
another** from the MSB down, each XOR waiting for the binary bit above it, so the Gray → binary converter
is a ripple of $n - 1$ XOR gates with depth $n - 1$. It returns 1011, the original input.

:::trick{#trick-xor-converter title="Gray bit = 'do my neighbours differ?'" depth="standard"}
To convert binary to Gray in your head, copy the MSB, then write a 1 wherever a bit differs from the bit
on its left and a 0 wherever it is the same: binary 1011 → Gray 1110. To go back, copy the MSB and then
keep a running "parity so far": each binary bit is the XOR of all Gray bits up to and including its
position, so Gray 1110 → 1, 1⊕1 = 0, 0⊕1 = 1, 1⊕0 = 1: binary 1011.

**Why it works:** this is the theorem read aloud. **When it fails:** the formula is for the reflected
binary Gray code only. A different unit-distance code (for example one that starts at a word other than
0…0, or the excess-3 Gray code, which begins at 0010) needs its own table and its own K-maps. Costs follow too: an $n$-bit converter in either direction uses $n - 1$ two-input XORs.
:::

:::trap{#trap-gray-dc title="A 'binary-to-Gray' converter simplified with rows 10–15 as don't-cares is BCD-only" depth="standard"}
Some notes design a "4-bit to Gray" converter on inputs $A B C D$ that only go up to 9, mark rows 10–15 as
don't-cares, and get $W = A$, $X = A + B$, $Y = B \oplus C$, $Z = C \oplus D$. For digits 0–9 that is correct: $A$
and $B$ are never both 1 there, so $A + B = A \oplus B$. But it is **not** a binary-to-Gray converter. Apply input
1100 (twelve): the true Gray code is 1010, while $A + B$ gives $X = 1$ and the circuit outputs 1110. The
examiner's wrong answer for "the second Gray bit of a 4-bit converter" is $A + B$; the right answer for a
full 4-bit input is $A \oplus B$. Use don't-cares only when the specification says the inputs are BCD.
:::

### Worked examples: code converters

::::example{#ex-cc-easy level="easy" title="BCD to excess-3: the two low bits" depth="quick"}
Find $E_0$ and $E_1$ of the BCD → excess-3 converter (inputs $B_3 B_2 B_1 B_0$, rows 10–15 don't-cares).

:::step{why="Adding 3, an odd number, always flips the last bit."}
$E_0 = 1$ exactly for even digits 0, 2, 4, 6, 8: $E_0 = B_0'$ (on the map, the two columns with $B_0 = 0$).
:::

:::step{why="Look at the low two bits only: d + 3 changes the low pair 00→11, 01→00, 10→01, 11→10, so bit 1 of the result is 1 when the low pair is 00 or 11."}
$E_1 = 1$ for digits 0, 3, 4, 7, 8, all with $B_1 B_0 \in \{00, 11\}$. The column $B_1 B_0 = 00$ holds rows 0, 4, 8 and
the X 12; the column $11$ holds rows 3, 7 and the Xs 11, 15. Both columns are whole quads:
$E_1 = B_1'B_0' + B_1 B_0$.
:::

:::answer
$E_0 = B_0'$ and $E_1 = \overline{B_1 \oplus B_0}$ (one NOT and one XNOR). Check digit 4 → 0111: $E_1 = \overline{0 \oplus 0} = 1$,
$E_0 = 1$ ✓.
:::
::::

::::example{#ex-cc-medium level="medium" title="BCD to the digit modulo 5" depth="standard"}
Design BCD → ($d \bmod 5$) with inputs $A B C D$ (weights 8 4 2 1), outputs $R_2 R_1 R_0$ (weights 4 2 1),
illegal inputs not detected.

:::step{why="Residues: 0–4 unchanged, 5→0, 6→1, 7→2, 8→3, 9→4. Each output bit picks the digits whose residue has that bit."}
$R_2$ (residue 4): digits 4, 9. $R_1$ (residues 2, 3): digits 2, 3, 7, 8. $R_0$ (residues 1, 3): digits 1, 3, 6, 8.
:::

:::step{why="n = 5 is odd, so the parity trick does not apply: R0 needs a real map."}
$R_0 = AD' + A'B'D + BCD'$ (8 literals; $AD'$ uses the Xs 10, 12, 14).
:::

:::step{why="R1: digits 2, 3 form B′C with Xs 10, 11; digits 3, 7 form CD with Xs 11, 15; digit 8 joins Xs 10, 12, 14 in AD′."}
$R_1 = B'C + CD + AD'$ (6 literals).
:::

:::step{why="R2: digit 9 joins Xs 11, 13, 15 in AD; digit 4 can only pair with X12 (digit 5 and 6 are 0s)."}
$R_2 = AD + BC'D'$ (5 literals).
:::

:::answer
$R_2 = AD + BC'D'$, $R_1 = B'C + CD + AD'$, $R_0 = AD' + A'B'D + BCD'$. The term $AD'$ is shared by $R_1$ and
$R_0$ and is built once. Check digit 8 = 1000 → 3 = 011: $R_2 = 0$, $R_1 = AD' = 1$, $R_0 = AD' = 1$ ✓.
:::
::::

::::example{#ex-cc-gate level="gate" title="Excess-3 to BCD: the top bit as a minimal POS" depth="standard"}
For the excess-3 → BCD converter with inputs $e_8 e_4 e_2 e_1$, find a minimal POS of the BCD weight-8
output $b_8$.

:::step{why="b8 = 1 for digits 8 and 9, which arrive as codes 11 (1011) and 12 (1100). The unused codes 0, 1, 2, 13, 14, 15 are Xs."}
1s: 11, 12. Xs: 0, 1, 2, 13, 14, 15. 0s: 3–10.
:::

:::step{why="All codes 3–7 have e8 = 0, and with Xs 0, 1, 2 the whole half e8 = 0 is 0s and Xs: one factor (e8)."}
Factor $(e_8)$ covers 0s 3–7.
:::

:::step{why="The remaining 0s are 8, 9, 10 (1000, 1001, 1010). They need factors that are 0 there but 1 on codes 11 and 12."}
Codes 8, 9 with 0 and 1 give $(e_4 + e_2)$; codes 8, 10 with 0 and 2 give $(e_4 + e_1)$. Product:
$b_8 = e_8(e_4 + e_2)(e_4 + e_1)$, 5 literals.
:::

:::step{why="Ties: other 2-literal factors can share the work on 8, 9, 10. For example (e2 + e1′) is 0 on codes 1, 5, 9, 13, so it covers 9 and is still 1 on codes 11 and 12; next to (e4 + e1), which covers 8 and 10, it gives another 5-literal form."}
There are three minimal forms, each 5 literals: $e_8(e_4 + e_2)(e_4 + e_1)$, $e_8(e_4 + e_1)(e_2 + \overline{e_1})$ and
$e_8(e_4 + e_2)(\overline{e_2} + e_1)$.
:::

:::answer
$b_8 = e_8(e_4 + e_2)(e_4 + e_1)$ (5 literals; two other forms tie). Check code 12 = 1100: $1 \cdot 1 \cdot 1 = 1$ ✓; code 10 =
1010: $(0 + 0) = 0$ in the last factor ✓. The same method gives the 2001 answer for $b_4$ (7 literals).
:::
::::

::::example{#ex-cc-edge level="gate" title="Edge case: binary to Gray with and without the BCD don't-cares" depth="standard"}
Find the Gray bit $G_2$ (weight 4) of a 4-bit converter with input $A B C D$ ($A$ = MSB), first for any 4-bit
input, then for BCD inputs only.

:::step{why="The theorem: each Gray bit is the XOR of its binary bit and the one above."}
Full 4-bit input: $G_2 = B \oplus A = A'B + AB'$, a 2-input XOR.
:::

:::step{why="With rows 10–15 free, the cells with A = B = 1 (12–15) become Xs, and the map loses the only cells where A ⊕ B and A + B differ."}
BCD input: $G_2$'s 1s are rows 4–9; with Xs 10–15, the octets $A$ (rows 8–15) and $B$ (rows 4–7, 12–15) cover them:
$G_2 = A + B$.
:::

:::step{why="Test the converter on an input outside BCD to see the difference."}
Input 1100: Gray 1010, so $G_2 = 0$; but $A + B = 1$.
:::

:::answer
4-bit converter: $G_2 = A \oplus B$. BCD-only converter: $G_2 = A + B$ also works (it saves nothing in gate
count, an OR for an XOR, but it is wrong on 12–15). $G_3 = A$, $G_1 = B \oplus C$, $G_0 = C \oplus D$ in both
versions.
:::
::::

:::aside{#seven-segment title="A seven-segment decoder" depth="deep"}
A seven-segment display shows a digit by lighting segments a–g (a on top, then clockwise b, c, d, e, f,
and g in the middle). A BCD → seven-segment decoder is a converter with 4 inputs and 7 outputs, one
K-map per segment, again with rows 10–15 as don't-cares (10 care rows each). Segment **a** is lit for the
digits 0, 2, 3, 5, 6, 7, 8, 9 (off only for 1 and 4). On the map, with the Xs:

$$a = A + C + BD + B'D'.$$

Why: the only 0s of segment a are cells 1 (0001) and 4 (0100). Every other cell is a 1 or an X, so the
loops can be huge: the octet $A$ (cells 8–15) takes digits 8 and 9, the octet $C$ (the two right-hand
columns, cells 2, 3, 6, 7, 10, 11, 14, 15) takes 2, 3, 6, 7, the quad $BD$ (cells 5, 7, 13, 15) takes 5, and the
corner quad $B'D'$ (cells 0, 2, 8, 10) takes 0. None of the four loops touches cell 1 or cell 4.

Each segment is designed the same way, and the seven outputs share terms such as $B'D'$; a ROM (Lesson 5)
is the brute-force alternative that stores the whole 16 × 7 table. GATE has not asked for the full
decoder, but "which segments are lit for digit $k$" and "which minterms make segment $x$" are natural short
questions.
:::

:::note{#recap-converters title="Recap" depth="quick"}
A converter is one K-map per output bit, all sharing the unused-code don't-cares. BCD mod n: low bit
passes when $n$ is even. BCD → XS-3: $E_3 = B_3 + B_2(B_1 + B_0)$, $E_2 = B_2 \oplus (B_1 + B_0)$, $E_1 = \overline{B_1 \oplus B_0}$,
$E_0 = B_0'$. Gray: $G_i = B_i \oplus B_{i+1}$, back by running XOR; $A + B$ for $G_2$ is BCD-only.
:::

## Several outputs at once

:::intuition{#shared-intuition title="Build the common part once" depth="standard"}
A converter has four outputs, and they are not strangers: the BCD → excess-3 equations both contain
$B_1 + B_0$, and the mod-5 outputs both contain $AD'$. A gate whose output is needed in two places is built
once and wired to both. Spotting these shared pieces is where a converter's gate count really drops.
:::

:::definition{#shared-terms term="Sharing terms between outputs" depth="standard"}
When outputs are designed together, the cost is the number of **distinct** gates. A product term, or a
factor such as $(B_1 + B_0)$, used by several outputs is paid for once. Chapter 3,
[Lesson 4](lesson:two-level-implementation) showed that the best shared term may even be non-prime for
each output separately. For BCD → excess-3 a complete circuit is:

- $S = B_1 + B_0$ (one OR), shared by $E_3$ and $E_2$;
- $E_3$ = OR($B_3$, AND($B_2$, $S$)) (two gates);
- $E_2$ = XOR($B_2$, $S$) (one gate);
- $E_1$ = XNOR($B_1$, $B_0$) (one gate);
- $E_0$ = NOT($B_0$) (one gate).

Six gates in all, against seven if $B_1 + B_0$ were built separately for $E_3$ and $E_2$.
:::

:::note{#recap-shared title="Recap" depth="quick"}
Count distinct gates across all outputs. Look for repeated loops and repeated factors before drawing,
and build each once.
:::

## Try it

Open the Combinational Workbench on its implement tab: choose a 4-variable function (for example the
digit ≥ 5 detector, minterms 5–9) and compare realisations. The verification row shows the realised
truth table against $f$ row by row, which is step 8 of the procedure done for you.

:::lab{#lab-design lab="comb-workbench" tab="implement" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-2000-b-9-a" tests="bcd-mod-n,truth-table-spec,trap-bit-order" depth="standard"}
:::

:::pyq{id="cse-2000-b-9-b" tests="bcd-mod-n,gate-count,dc-illegal" depth="standard"}
:::

:::pyq{id="cse-2001-b-58-b" tests="xs3-to-bcd,dc-illegal" depth="standard"}
:::

:::pyq{id="cse-2004-cs-58" tests="digit-ge5,gate-count,gate-lower-bound" depth="standard"}
:::

:::pyq{id="cse-2012-cs-6" tests="match-table,truth-table-spec" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dl-04-01-q01" depth="standard"}
:::

:::practice{id="nx-dl-04-01-q02" depth="standard"}
:::

:::practice{id="nx-dl-04-01-q03" depth="standard"}
:::

:::practice{id="nx-dl-04-01-q04" depth="standard"}
:::

:::practice{id="nx-dl-04-01-q05" depth="standard"}
:::

:::practice{id="nx-dl-04-01-q06" depth="standard"}
:::

:::practice{id="nx-dl-04-01-q07" depth="standard"}
:::

:::practice{id="nx-dl-04-01-q08" depth="standard"}
:::

:::practice{id="nx-dl-04-01-q09" depth="standard"}
:::

:::practice{id="nx-dl-04-01-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Combinational design and code converters on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Combinational | no feedback loops; outputs depend only on present inputs (topological evaluation) |
| Procedure | spec → names and bit order → truth table → Xs → K-map per output → expression → gates → verify |
| Don't-cares | unused code words (BCD 10–15; XS-3 0–2, 13–15) are Xs unless illegal input must be detected |
| Matching a table | evaluate every row; one counterexample rejects; decode rows by their labels |
| Detectors | majority $AB + BC + CA$; digit ≥ 5 $= A + B(C + D)$, 3 AND/OR gates, 2 impossible (6 gates if rows 10–15 must give 0) |
| Gate counts | fix types, fan-in, complements; NOTs count; factor; prove the lower bound by listing small circuits |
| BCD mod 6 | $R_1 = I_1$, $R_2 = I_4 + I_2\overline{I_3}$, $R_3 = I_3\overline{I_2}$, $R_4 = 0$ |
| BCD → XS-3 | $E_3 = B_3 + B_2(B_1 + B_0)$, $E_2 = B_2 \oplus (B_1 + B_0)$, $E_1 = \overline{B_1 \oplus B_0}$, $E_0 = \overline{B_0}$ |
| XS-3 → BCD | Xs 0, 1, 2, 13, 14, 15; $b_4$ minimal POS 7 literals (three ties); $b_8 = e_8(e_4 + e_2)(e_4 + e_1)$ |
| Gray | $G_i = B_i \oplus B_{i+1}$; $B_i = G_i \oplus B_{i+1}$; $n - 1$ XORs; $A + B$ is BCD-only |
:::
