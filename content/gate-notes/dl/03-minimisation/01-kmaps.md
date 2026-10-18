---
id: kmaps
subject: dl
chapter: minimisation
title: Karnaugh maps (2–4 variables)
order: 1
prerequisites: [canonical-forms, codes]
pyq_topics: [dl/minimization]
est_minutes: 70
difficulty: core
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every map, loop, minimal form and answer is checked by enumeration in content/gate-notes/_checks/dl/l3_01_kmaps.py (prime implicants by Quine–McCluskey and by brute force, minimal covers by Petrick's method and by exhaustive search, both in minlib.py)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 37–39, set B pp. 113–116, set C pp. 232–238, 259–260 and 263–264."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (gate-level minimisation, the map method); M. Karnaugh, 'The map method for synthesis of combinational logic circuits' (1953)."
  - "PYQs: src/gate/questions.json (dl/minimization); all twenty keys are re-derived by enumeration in l3_01_kmaps.py. The it-2004-it-44 reprint typos are repaired through src/gate/fixes/it-2004.json (see _errata/dl.md)."
updated: "2026-10-18"
---

A truth table lists a function row by row, and Boolean algebra can shrink the expression you read
from it, but only if you spot which terms combine. A **Karnaugh map** (K-map) is the same truth table
folded into a grid so cleverly that terms which combine always sit next to each other. Simplifying then
becomes a visual game: draw the biggest possible rectangles around the 1s, and read one short product
term from each rectangle. This lesson builds the map from scratch, proves why the game works, and
then plays it in both directions: sums of products from the 1s, products of sums from the 0s.

## Where this fits

[Chapter 2, Lesson 4](lesson:canonical-forms) turned every function into a list of minterms. Here we
compress that list. The map's rows and columns use the **Gray code** from
[Chapter 1](lesson:codes), and every rule on the map is one law from Chapter 2 (the combining rule
$xy + xy' = x$) applied many times at once. Lesson 2 makes the grouping exact with prime implicants and
don't-cares, Lesson 3 replaces the picture with a table for larger functions, and Lesson 4 turns
minimal forms into gates.

:::table{#radar title="GATE radar: Karnaugh maps" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 20 (1995–2026) |
| Marks | 5 one-mark, 13 two-mark, 1 three-mark, 1 descriptive |
| Pattern 1 | Read or plot a printed map and give the minimal SOP or POS: 1995, 1996, 1998, 2000, 2007 (IT), 2025 |
| Pattern 2 | Minimise a Σ list or an expression (including POS → SOP): 1997, 2004, 2005, 2011, 2014, 2025, 2026 |
| Pattern 3 | Which expressions are (not) equal to a function: 2007, 2007 (IT), 2025 |
| Pattern 4 | Which variables a function ignores: 2007, 2008 (IT) |
| Pattern 5 | Count minterms or literals: 1997, 2015, 2021 |
| What examiners test | Gray order and wrap-around, groups that must be powers of 2, reading the right variables off a map whose axes are labelled differently, and the difference between "equal" and "minimal" |
:::

## The idea: fold the truth table so neighbours combine

:::intuition{#why-maps title="Put rows that combine side by side" depth="standard"}
The whole of two-level simplification rests on one law: $xy + xy' = x$. Two minterms that differ in
exactly one variable merge, and that variable disappears. For example $A'BC + A'BC' = A'B$.

In a truth table, rows that differ in one variable are often far apart: rows 1 (001) and 5 (101)
differ only in $A$, but three rows separate them. You have to hunt for every such pair. A Karnaugh
map rearranges the rows into a grid where **every pair that differs in one variable is adjacent**
(sharing an edge, or facing each other across the border). Then the hunt becomes looking: two
neighbouring 1s merge into one term with one variable fewer, four 1s in a square merge into a term
with two fewer, and so on. The map is not a new idea in algebra; it is a picture that makes the one
algebraic step you need impossible to miss.
:::

:::theorem{#combining name="The combining rule" depth="standard"}
For any product term $P$ and variable $x$,
$$
P\,x + P\,x' = P \qquad\text{and dually}\qquad (S + x)(S + x') = S
$$
for any sum term $S$. Two minterms that differ in exactly one variable combine into one product with
that variable removed.
:::

:::proof{#proof-combining of="the combining rule" depth="standard"}
**Idea first:** factor out what the two terms share; what is left is $x + x'$, which is always 1.

$Px + Px' = P(x + x')$ by the distributive law, $= P \cdot 1$ by the complement law, $= P$ by the
identity law. The dual statement is the same proof with $+$ and $\cdot$ exchanged:
$(S + x)(S + x') = S + xx' = S + 0 = S$.

Applying the rule to two terms that are themselves results of the rule gives four minterms merging into
a term with two variables removed, and so on: $2^k$ minterms that agree on $n - k$ variables and take
**all** $2^k$ combinations of the other $k$ merge into one product of the $n - k$ fixed literals.
:::

## Building the map: Gray order

:::intuition{#gray-intuition title="Walk the axis one switch at a time" depth="standard"}
Label the columns by two switches, $C$ and $D$. If you walk along the columns in counting order, 00 → 01 →
10 → 11, the middle step flips **both** switches, so two neighbouring columns would hold rows that do not
combine. Reorder the walk so that each step flips exactly one switch: 00 → 01 → 11 → 10, and from 10 back to
00 is again one flip. With that order, any two side-by-side columns differ in one variable, which is
exactly what the combining rule needs.
:::

:::definition{#gray-order term="Gray order on the map axes" depth="quick"}
The rows and the columns of a K-map are labelled in **Gray order**, the order in which exactly one bit
changes at each step:

- one variable: $0, 1$;
- two variables: $00, 01, 11, 10$ (not $00, 01, 10, 11$).

The last label also differs from the first in one bit ($10 \to 00$), so the order is **cyclic**. This is
the reflected Gray code of [Chapter 1](lesson:codes), and it is the whole secret of the map.
:::

:::definition{#map-layout term="The 2-, 3- and 4-variable maps" depth="standard"}
For $f(A, B, \dots)$ the **first** variables label the rows and the remaining ones the columns:

| Variables | Rows | Columns | Cells |
|:--|:--|:--|:--|
| 2: $A, B$ | $A$: 0, 1 | $B$: 0, 1 | 4 |
| 3: $A, B, C$ | $A$: 0, 1 | $BC$: 00, 01, 11, 10 | 8 |
| 4: $A, B, C, D$ | $AB$: 00, 01, 11, 10 | $CD$: 00, 01, 11, 10 | 16 |

The cell in row $r$ and column $c$ holds minterm $m$ whose binary digits are the row label followed by
the column label. For four variables $m = 4 \cdot (AB) + (CD)$, so row $AB = 11$, column $CD = 10$ is
$m_{14}$ ($1110$). Some books put the first variables on the columns instead; the method is identical,
only the picture is transposed (see the trap on axis order below).
:::

:::viz{#gray-layout-viz spec="kmap-gray-layout" mode="animate" depth="standard"}
:::

:::definition{#cell-numbers term="Cell numbers of the standard maps" depth="quick"}
Reading each map row by row:

| Map | Cell numbers, row by row |
|:--|:--|
| 2 variables | 0 1 / 2 3 |
| 3 variables | 0 1 3 2 / 4 5 7 6 |
| 4 variables | 0 1 3 2 / 4 5 7 6 / 12 13 15 14 / 8 9 11 10 |
:::

:::trick{#trick-cell-numbers title="Swap the last two, twice" depth="standard"}
Write the numbers in counting order, four per row: 0 1 2 3 / 4 5 6 7 / 8 9 10 11 / 12 13 14 15. Now
swap the last two numbers of every row (3 ↔ 2, 7 ↔ 6, …) and then swap the last two **rows**. You get
0 1 3 2 / 4 5 7 6 / 12 13 15 14 / 8 9 11 10.

**Why it works:** swapping the third and fourth columns turns the column order 00 01 10 11 into the
Gray order 00 01 11 10, and swapping the last two rows does the same for the row labels.
**When it fails:** if the paper puts different variables on the rows (for example $CD$ on the rows and
$AB$ on the columns), the numbers are transposed: read the labels, never assume.
:::

:::trap{#trap-binary-labels title="Columns labelled 00, 01, 10, 11 are not a K-map" depth="quick"}
If you label the columns in counting order, cells 1 (01) and 2 (10) end up side by side although they
differ in two bits, and the true neighbours 0 and 2 are no longer at a shared edge. Every loop you
then draw across the middle is wrong. Examiners occasionally print a map in counting order on purpose
(GATE 1998); re-draw it in Gray order before looping.
:::

## Adjacency and wrap-around

:::intuition{#adjacency-intuition title="The edges are not really edges" depth="standard"}
Because the Gray walk returns to its start (10 → 00 is one flip), the last column is a one-bit neighbour of
the first, and the bottom row of the top. The rectangle on paper is only a way to flatten a surface that
has no edges at all. Whenever a cell sits on a border, look across to the opposite border for its missing
neighbour.
:::

:::theorem{#adjacency name="Map neighbours are exactly the one-bit neighbours" depth="standard"}
On a map of 2, 3 or 4 variables, two cells share an edge, or face each other across opposite borders
of the same row or column, **if and only if** their minterms differ in exactly one variable. Each
cell of an $n$-variable map has exactly $n$ such neighbours.
:::

:::proof{#proof-adjacency of="map adjacency" depth="standard"}
**Idea first:** a move along a row changes only the column label, and consecutive Gray labels differ
in one bit, including the last and the first.

A cell's minterm is (row label, column label). Moving one cell sideways keeps the row label and moves
to the next column label in the cyclic Gray order 00 → 01 → 11 → 10 → 00, which changes exactly one
column bit; moving up or down likewise changes exactly one row bit. Conversely, if two minterms differ
in one bit, that bit is either a row bit (same column, and the two row labels are one bit apart, which
in a list of at most four cyclic Gray labels means consecutive, wrap included) or a column bit (same
row, consecutive columns). A cell has one neighbour per variable, so $n$ in all.
:::

:::definition{#wrap-around term="Wrap-around: the map is a torus" depth="standard"}
Because the Gray order is cyclic, the left and right borders of the map are neighbours, and so are the
top and bottom borders. Imagine rolling the map into a tube so that the left edge meets the right
edge, then bending the tube so the top meets the bottom: the surface is a **torus** (a doughnut), and
on it every cell has its $n$ neighbours all around it. For example $m_8$ (1000) on the bottom-left
corner of a 4-variable map is adjacent to $m_{10}$ (right end of its row) and $m_0$ (top of its
column).
:::

:::viz{#adjacency-viz spec="kmap-adjacency" mode="animate" depth="standard"}
:::

:::definition{#corner-quad term="The four corners" depth="quick"}
On a 4-variable map the four corner cells $m_0, m_2, m_8, m_{10}$ form a 2 × 2 block on the torus: $m_0$
and $m_2$ face each other across the left/right border, $m_0$ and $m_8$ across the top/bottom border.
If all four are 1, they form one group, $B'D'$. Two **diagonal** corners ($m_0$ and $m_{10}$) are not
neighbours: they differ in two bits. They belong to the same group of four, but you cannot loop them
as a pair.
:::

:::viz{#corner-viz spec="kmap-corner-quad" mode="animate" depth="standard"}
:::

### Worked examples: map layout and adjacency

::::example{#ex-layout-place level="easy" title="Placing a 3-variable function on the map" depth="quick"}
Where do the 1s of $f(A, B, C) = \Sigma m(1, 4, 6)$ go on a 3-variable map (rows $A$, columns $BC$)?

:::step{why="Write each minterm in binary with A as the most significant bit; the first bit picks the row, the last two the column."}
$m_1 = 0\,01$, $m_4 = 1\,00$, $m_6 = 1\,10$.
:::

:::step{why="The columns are in Gray order 00, 01, 11, 10, so 01 is the second column and 10 is the fourth, not the third."}
$m_1$: row $A = 0$, second column. $m_4$: row $A = 1$, first column. $m_6$: row $A = 1$, fourth column.
:::

:::answer
Row 0: 0 1 0 0. Row 1: 1 0 0 1. (The two 1s of row 1 are at the two ends, and they are neighbours
through the wrap.)
:::
::::

::::example{#ex-layout-neighbours level="medium" title="All neighbours of one cell" depth="standard"}
List the neighbours of $m_{13}$ on a 4-variable map.

:::step{why="A neighbour differs in exactly one bit, so flip each of the four bits of 1101 in turn."}
Flip $A$: 0101 = 5. Flip $B$: 1001 = 9. Flip $C$: 1111 = 15. Flip $D$: 1100 = 12.
:::

:::step{why="Check on the map: m13 sits in row AB = 11, column CD = 01, so its four neighbours are up, down, left and right."}
Up (row 01): $m_5$. Down (row 10): $m_9$. Left (column 00): $m_{12}$. Right (column 11): $m_{15}$.
:::

:::answer
$m_5, m_9, m_{12}, m_{15}$: four neighbours for four variables.
:::
::::

::::example{#ex-layout-corners level="gate" title="Which corner cells are adjacent?" depth="standard"}
On a 4-variable map, is $m_0$ adjacent to $m_8$? to $m_2$? to $m_{10}$?

:::step{why="Adjacent means exactly one differing bit; compare the 4-bit patterns."}
$0000$ vs $1000$: one bit ($A$). $0000$ vs $0010$: one bit ($C$). $0000$ vs $1010$: two bits ($A$ and $C$).
:::

:::step{why="Relate this to the picture: m8 is below m0 through the top/bottom wrap, m2 is beside it through the left/right wrap, m10 is the opposite corner."}
$m_0$–$m_8$ and $m_0$–$m_2$ are neighbours through the borders; $m_0$–$m_{10}$ are diagonal.
:::

:::answer
Adjacent to $m_8$ and $m_2$; **not** adjacent to $m_{10}$. All four corners still form one group of four,
because a group needs a rectangle (on the torus), not pairwise adjacency.
:::
::::

::::example{#ex-layout-binary level="gate" title="Edge case: a map drawn in counting order" depth="standard"}
A student draws a 4-variable map with columns $CD = 00, 01, 10, 11$ and sees 1s in row $AB = 00$ at the
second and third columns. Can they be looped as a pair?

:::step{why="Decode the cells from the labels actually written: row 00 with columns 01 and 10."}
They are $m_1 = 0001$ and $m_2 = 0010$.
:::

:::step{why="A pair needs one differing bit; 0001 and 0010 differ in C and in D."}
Two bits differ, so $A'B'C'D + A'B'CD'$ does **not** combine.
:::

:::answer
No. In a correct (Gray-order) map these two cells are not neighbours; the counting-order drawing put
them side by side by mistake.
:::
::::

:::note{#recap-layout title="Recap" depth="quick"}
Label rows and columns in Gray order 00, 01, 11, 10; cell numbers run 0 1 3 2 / 4 5 7 6 / 12 13 15 14 /
8 9 11 10. Neighbours differ in exactly one bit, including across opposite borders (the torus), so each
cell has $n$ neighbours. Diagonal cells are never neighbours.
:::

## Groups and what they mean

:::intuition{#groups-intuition title="Pin some switches, let the rest run free" depth="standard"}
Pick a product such as $BD'$: it pins $B$ to 1 and $D$ to 0 and says nothing about $A$ and $C$. The rows where
it is 1 are all four combinations of the free switches $A$ and $C$. On the map those rows form a rectangle
(two Gray-neighbouring rows by two Gray-neighbouring columns). So every product term is a rectangle of
$2^{\text{free variables}}$ cells, and every such rectangle is a product term: loops and terms are the
same thing.
:::

:::definition{#groups-def term="A group (loop) on the map" depth="quick"}
A **group** is a set of $2^k$ cells ($k = 0, 1, 2, 3, 4$: 1, 2, 4, 8 or 16 cells) that forms a rectangle
on the torus: a full block of consecutive rows and consecutive columns, where "consecutive" may wrap
round the border. Every cell in the group must be a 1 (for SOP). Groups of 3, 5, 6 or 7 cells, L-shapes
and diagonals are never groups.
:::

:::theorem{#group-term name="A group of 2ᵏ cells is a product of n − k literals" depth="standard"}
On an $n$-variable map, a group of $2^k$ cells is exactly the set of minterms of one product term with
$n - k$ literals: the variables that keep the same value on every cell of the group, each written plain
(value 1) or complemented (value 0). The other $k$ variables take all $2^k$ combinations inside the group
and disappear.
:::

:::proof{#proof-group-term of="the group–term correspondence" depth="standard"}
**Idea first:** a rectangle of $2^a$ consecutive Gray labels by $2^b$ consecutive Gray labels fixes some
bits and lets the others run through every combination.

A block of $2^a$ consecutive rows (cyclically) in the Gray order of $r$ row bits is exactly the set of
labels that agree on $r - a$ fixed bits: for $a = 1$, two consecutive labels differ in one bit (the
free one), and this includes the wrap-around block {10, 00}, which agrees on the second bit (0); for
$a = 2$ with $r = 2$ all four labels are used and both bits are free. The same holds for
the columns. So a rectangle fixes $n - (a + b)$ variables and runs through all $2^{a+b}$ values of the
others. By the combining rule (applied $a + b$ times) the OR of its minterms is the product of the
fixed literals, with $n - k$ literals where $k = a + b$.
:::

:::definition{#read-group term="Reading a group" depth="quick"}
To read the product term of a group, go through the variables one at a time:

- if the variable is 1 on **every** cell of the group, write it plain;
- if it is 0 on every cell, write it complemented;
- if it changes inside the group, leave it out.

Example (4 variables): the group $m_4, m_6, m_{12}, m_{14}$ (rows 01 and 11, columns 00 and 10). $A$ changes
(rows 01, 11), $B = 1$, $C$ changes (columns 00, 10), $D = 0$: the term is $BD'$.
:::

:::trick{#trick-read-group title="Read the labels, keep only what never changes" depth="standard"}
Read the row labels the group spans and the column labels it spans. A bit position that is the same in
all of them is a literal; a position that changes is dropped. Rows {01, 11}: first bit changes, second
bit is always 1 → $B$. Columns {00, 10}: first bit changes, second always 0 → $D'$. Term: $BD'$.

**Why it works:** this is the group theorem read off the labels instead of the cells. **When it fails:**
only if the loop is not a legal group (not a power of two, or not a rectangle); then no single term
describes it.
:::

:::table{#group-sizes title="Group size and term size (4 variables)" depth="quick"}
| Cells in the group | Literals in the term | Example |
|:--|:--|:--|
| 1 (a minterm) | 4 | $A'BC'D = m_5$ |
| 2 (a pair) | 3 | $m_5, m_7$: $A'BD$ |
| 4 (a quad) | 2 | corners: $B'D'$ |
| 8 (an octet) | 1 | two outer columns: $D'$ |
| 16 (the whole map) | 0 | $f = 1$ |
:::

## Grouping: the SOP method

:::definition{#grouping-rules term="The grouping rules" depth="standard"}
To find a minimal sum of products:

1. **Loop only 1s.** (Lesson 2 adds don't-cares, which may be included.)
2. **Every loop is a group:** $2^k$ cells forming a rectangle on the torus.
3. **Every 1 is inside at least one loop.** Loops may overlap; a 1 may be used again whenever that
   makes some loop bigger.
4. **Each loop as large as possible**: a bigger loop is a term with fewer literals.
5. **As few loops as possible**: each loop is one more term (and one more AND gate).

The sum of the loops' terms is the minimal SOP. If rules 4 and 5 ever pull in different directions, the
order of priority in this chapter is: fewest literals first, then fewest terms (Lesson 2 makes the choice
exact).
:::

:::definition{#sop-method term="Method: minimal SOP from a map" depth="standard"}
1. Plot the 1s.
2. **Start with the hard cases:** a 1 that can be looped in only one way (often a 1 with few
   neighbouring 1s, a "loner") must use that loop. Draw it, as large as it can be.
3. Repeat for the 1s that remain uncovered, always choosing the **largest** legal group containing the
   1 you are working on.
4. Stop when every 1 is covered. Then check that no loop can be removed (every loop must cover some 1
   no other loop covers).

Lesson 2 explains why this works (the loops you are forced into are the *essential prime
implicants*) and what to do when no 1 is forced.
:::

:::viz{#grouping-viz spec="kmap-grouping" mode="animate" depth="standard"}
:::

:::trap{#trap-greedy title="Biggest loop first can leave a useless loop" depth="standard"}
"Always grab the biggest group first" sounds safe, but consider $\Sigma m(1, 5, 6, 7, 11, 12, 13, 15)$.
The centre quad $m_5, m_7, m_{13}, m_{15}$ ($BD$) is the biggest group, so a greedy student loops it
first. Yet each of the four remaining 1s ($m_1, m_6, m_{11}, m_{12}$) can only be covered by a pair that
also swallows one cell of the centre, and those four pairs cover the whole centre anyway. The quad is
**redundant**: $f = A'C'D + A'BC + ACD + ABC'$ (12 literals); adding $BD$ costs 2 more literals for
nothing. Loop the forced 1s first, then check whether any loop has become unnecessary.
:::

### Worked examples: SOP by grouping

::::example{#ex-sop-3var level="easy" title="A 3-variable map" depth="quick"}
Minimise $f(A, B, C) = \Sigma m(0, 2, 3, 6, 7)$.

:::step{why="Plot the map: rows A = 0, 1; columns BC = 00, 01, 11, 10."}
Row 0: 1 0 1 1. Row 1: 0 0 1 1.
:::

:::step{why="The last two columns (BC = 11 and 10) are all 1s: a quad. B = 1 throughout; A and C change."}
Quad $m_2, m_3, m_6, m_7$: $B$.
:::

:::step{why="m0 is still uncovered. Its largest group with 1s is the pair with m2 through the left/right wrap (row A = 0, columns 00 and 10)."}
Pair $m_0, m_2$: $A = 0$, $C = 0$, $B$ changes: $A'C'$.
:::

:::answer
$f = B + A'C'$ (3 literals).
:::
::::

::::example{#ex-sop-octet level="medium" title="An octet and two wrap-around quads" depth="standard"}
Minimise $f(A, B, C, D) = \Sigma m(0, 1, 2, 4, 5, 6, 8, 9, 12, 13, 14)$.

:::step{why="Columns CD = 00 and 01 are entirely 1s: an octet, the largest group available. C = 0 on both columns."}
Octet: $C'$.
:::

:::step{why="Uncovered: m2, m6 and m14 (column CD = 10). Start with m2 and m6: their largest group wraps to column 00 in rows AB = 00 and 01; A = 0 and D = 0 stay fixed."}
Quad $m_0, m_2, m_4, m_6$: $A'D'$.
:::

:::step{why="Uncovered: m14. Its largest group is m4, m6, m12, m14 (rows 01 and 11, columns 00 and 10, wrapping); B = 1 and D = 0 stay fixed."}
Quad: $BD'$.
:::

:::answer
$f = C' + A'D' + BD'$ (5 literals). The animation above draws these three loops one at a time.
:::
::::

::::example{#ex-sop-gate level="gate" title="Corners, a column and a pair" depth="standard"}
Minimise $f(A, B, C, D) = \Sigma m(0, 2, 4, 8, 10, 11, 12)$ (the pattern of GATE 2025).

:::step{why="m11 has only one neighbouring 1 (m10), so it is the hardest 1: start there. The pair m10, m11 has A = 1, B = 0, C = 1."}
Pair: $AB'C$. (No quad contains $m_{11}$: its other neighbours $m_3, m_9, m_{15}$ are 0.)
:::

:::step{why="Column CD = 00 holds m0, m4, m12, m8: all 1s, a quad with C = 0, D = 0."}
Quad: $C'D'$.
:::

:::step{why="m2 and m10 are still uncovered. Together with m0 and m8 they are the four corners."}
Corners: $B'D'$.
:::

:::answer
$f = C'D' + B'D' + AB'C$ (7 literals). Dropping $AB'C$ leaves $m_{11}$ uncovered; dropping either quad
leaves a 1 uncovered too.
:::
::::

::::example{#ex-sop-centre level="gate" title="Edge case: the redundant centre quad" depth="standard"}
Minimise $f(A, B, C, D) = \Sigma m(1, 5, 6, 7, 11, 12, 13, 15)$.

:::step{why="Find the forced 1s. m1 (0001) has one neighbouring 1, m5, so its only pair is m1, m5. The same happens to m6 (only m7), m11 (only m15) and m12 (only m13)."}
Forced pairs: $A'C'D$ ($m_1, m_5$), $A'BC$ ($m_6, m_7$), $ACD$ ($m_{11}, m_{15}$), $ABC'$ ($m_{12}, m_{13}$).
:::

:::step{why="Check what is left: the four pairs already cover 5, 7, 13 and 15."}
Every 1 is covered. The centre quad $BD$ would cover nothing new.
:::

:::answer
$f = A'C'D + A'BC + ACD + ABC'$ (12 literals). Including the biggest group $BD$ would make 14: the
greedy trap.
:::
::::

:::note{#recap-sop title="Recap" depth="quick"}
A group is $2^k$ cells in a rectangle on the torus and reads as the product of the variables that never
change in it. Cover the forced 1s first, each with its largest legal group, then the rest; finally make
sure no loop is redundant.
:::

## Products of sums: grouping the 0s

:::intuition{#pos-intuition title="Describe where f is 0" depth="standard"}
A sum of products says "$f$ is 1 when this, or this, or this". You can just as well say "$f$ is 0 only
when this, or this": then $f$ is 1 exactly when **none** of those zero-conditions holds, which is an AND
of sum terms. On the map you loop the 0s instead of the 1s and read each loop as a factor that is 0 on
that loop and 1 everywhere else.
:::

:::theorem{#pos-duality name="Minimal POS from the 0s" depth="standard"}
Let $g = g_1 + g_2 + \dots + g_t$ be an SOP of the complement $f'$ (obtained by looping the 0s of $f$).
Then
$$
f = (g_1)'(g_2)' \cdots (g_t)',
$$
and each $(g_i)'$ is a sum term: complement every literal of $g_i$ and replace AND by OR. A minimal SOP
of $f'$ gives a minimal POS of $f$.
:::

:::proof{#proof-pos-duality of="POS from the 0s" depth="standard"}
**Idea first:** De Morgan turns "NOT (a OR b)" into "(NOT a) AND (NOT b)".

$f = (f')' = (g_1 + \dots + g_t)' = g_1' \cdots g_t'$ by De Morgan's law, and for a product of literals
$g_i = \ell_1 \ell_2 \cdots \ell_r$, De Morgan again gives $g_i' = \ell_1' + \ell_2' + \dots + \ell_r'$.
The literal count of $g_i'$ equals that of $g_i$, so a POS of $f$ is minimal exactly when the SOP of
$f'$ it came from is minimal.
:::

:::definition{#pos-method term="Method: minimal POS from a map" depth="standard"}
1. Loop the **0s** with the same rules as for 1s (powers of two, rectangles, wrap-around, largest and
   fewest).
2. Read each loop as a **sum term**: a variable that is **0** on the whole loop is written **plain**, a
   variable that is **1** on the whole loop is written **complemented**, a changing variable is left out.
3. AND the sum terms together.
:::

:::trick{#trick-pos-labels title="0 means plain, 1 means primed (the reverse of SOP)" depth="standard"}
For a loop of 0s the factor must be 0 on the loop, so each literal must be 0 there: a variable that is
0 on the loop appears as itself, a variable that is 1 appears complemented. Columns $CD = 00$ (both 0)
give $(C + D)$; a loop where $A = 1, B = 0$ gives $(A' + B)$.

**Why it works:** it is the sum term $(g_i)'$ from the theorem, written directly. **When it fails:** if
you read a loop of 0s with the SOP habit you get the complement of every factor; check one 0-cell: the
factor must evaluate to 0 there.
:::

:::viz{#pos-viz spec="kmap-pos-zeros" mode="animate" depth="standard"}
:::

:::trap{#trap-pos-literals title="A loop of 0s read as a product gives f′, not f" depth="quick"}
Looping the 0s and writing products (as for SOP) gives a minimal SOP of $f'$, not of $f$. The GATE
1996 options include both $(B + D)(B' + D')$ and $BD' + B'D$: they are the same function here (both equal
$B \oplus D$), but only one of them is a product of sums, which is what was asked.
:::

### Worked examples: POS

::::example{#ex-pos-3var level="easy" title="A 3-variable POS" depth="quick"}
Find the minimal POS of $f(A, B, C) = \Pi M(0, 1, 4)$.

:::step{why="The 0s are m0 (000), m1 (001) and m4 (100). m0 and m1 sit side by side in row A = 0: A = 0, B = 0 fixed, C changes."}
Loop $m_0, m_1$: factor $(A + B)$.
:::

:::step{why="m4 is still uncovered. Its largest 0-group is the pair with m0 (column BC = 00): B = 0, C = 0 fixed."}
Loop $m_0, m_4$: factor $(B + C)$.
:::

:::answer
$f = (A + B)(B + C)$ (4 literals). Check row 2 (010): $(0 + 1)(1 + 0) = 1$, and $m_2$ is indeed a 1.
:::
::::

::::example{#ex-pos-4var level="medium" title="A 4-variable POS with corners" depth="standard"}
Find the minimal POS of $f(A, B, C, D) = \Pi M(0, 2, 8, 9, 10, 11, 13, 15)$.

:::step{why="The 0s at the four corners (m0, m2, m8, m10) form a quad with B = 0 and D = 0 fixed; written as a sum term each 0 becomes a plain letter."}
Corners: $(B + D)$.
:::

:::step{why="The 0s m9, m11, m13, m15 have A = 1 and D = 1 (rows AB = 11 and 10, columns CD = 01 and 11); 1s become primed letters."}
Quad: $(A' + D')$. The two loops share no cell here; overlapping would have been allowed.
:::

:::answer
$f = (B + D)(A' + D')$ (4 literals). The SOP of the same function, $A'D + BD'$, also has 4 literals.
:::
::::

::::example{#ex-pos-2011 level="gate" title="From a POS to the minimal SOP" depth="standard"}
Simplify $(P + Q' + R')(P + Q' + R)(P + Q + R')$ to a minimal SOP (GATE 2011 pattern).

:::step{why="Each factor is a maxterm: it is 0 on exactly one row, the row that makes every literal 0."}
$(P + Q' + R') = M_3$ (011), $(P + Q' + R) = M_2$ (010), $(P + Q + R') = M_1$ (001).
:::

:::step{why="The function is 1 on every other row."}
$f = \Sigma m(0, 4, 5, 6, 7)$.
:::

:::step{why="Loop the 1s: row P = 1 is a quad (P), and m0 pairs with m4 in column QR = 00 (Q = 0, R = 0)."}
$f = P + Q'R'$.
:::

:::answer
$P + Q'R'$ (3 literals).
:::
::::

::::example{#ex-pos-cheaper level="gate" title="Edge case: when the POS is cheaper than the SOP" depth="standard"}
Compare the minimal SOP and POS of $F(P, Q, R, S) = PQ + P'QR + P'QR'S$ (the GATE 2014 function).

:::step{why="Expand: PQ covers rows 1100–1111 (12–15), P′QR covers 6, 7, and P′QR′S covers 5."}
$F = \Sigma m(5, 6, 7, 12, 13, 14, 15)$.
:::

:::step{why="m5's 1-neighbours are m7 and m13, so its largest group is the quad QS; m6's are m7 and m14, so QR; m12's are m13 and m14, so PQ. Each is the only quad through that cell, so all three are needed."}
Minimal SOP: $PQ + QR + QS$ (6 literals).
:::

:::step{why="POS: the 0s are 0–4 and 8–11. Rows PQ = 00 and 10 form an octet with Q = 0, and m4 pairs with m0 (P = R = S = 0)."}
Minimal POS: $Q\,(P + R + S)$ (4 literals).
:::

:::answer
SOP 6 literals, POS 4. Both are minimal in their own form; which is "cheaper" depends on the form you
are asked for. The animation above draws the POS loops.
:::
::::

:::note{#recap-pos title="Recap" depth="quick"}
Loop the 0s with the same rules; read each loop as a sum term (0 → plain, 1 → complemented); AND them.
This is De Morgan applied to the minimal SOP of $f'$. SOP and POS minima can differ in cost.
:::

## Reading a map someone else drew

:::intuition{#read-intuition title="Labels, not positions" depth="standard"}
A printed map is a table whose row and column labels tell you which input each cell stands for. Papers
put different variables on the axes, write the labels with bars instead of bits, or occasionally print them
in counting order. A cell's meaning comes from its two labels, never from where it sits on the page; read
the labels first and the rest is the usual looping.
:::

:::definition{#read-map term="Method: reading a printed map" depth="standard"}
Before looping a map from a question paper, read four things:

1. **Which variables label the rows and which the columns**, and in which order inside each label
   ($AB$ = 01 means $A = 0, B = 1$).
2. **The label order**: it should be Gray order (00, 01, 11, 10). If it is not, re-draw.
3. **The variable order of the function** $f(\dots)$, if you need minterm numbers. A map with rows $CD$
   and columns $AB$ still describes $f(A, B, C, D)$, but its cell numbers are transposed.
4. **The symbols**: blank usually means 0; X, × or d mean don't-care; some papers mark 1s with ✓ or a
   literal like $a\bar b$ on the axis instead of 0/1 bits.

Then loop as usual. The loops and the minimal expression do not depend on how the axes are arranged,
only on reading every cell correctly.
:::

:::trap{#trap-axis-order title="Rows CD, columns AB" depth="quick"}
GATE 1995 and 1996 print maps with $CD$ on the rows and $AB$ on the columns. The cell in row $CD = 01$,
column $AB = 10$ is $A = 1, B = 0, C = 0, D = 1$, i.e. $m_9$, not $m_6$. If you only want the minimal
expression you never need the numbers: read the labels of each loop directly. If you need minterm
numbers (to compare with a Σ list), translate each cell carefully.
:::

:::trap{#trap-non-gray title="A map printed with binary-order labels (GATE 1998)" depth="standard"}
The 1998 map labels its columns $BC = 00, 01, 10, 11$. Its two end columns, 00 and 11, are **not**
neighbours, so looping them as a wrap-around quad (read as Gray positions, giving $C'$) is wrong. Re-draw the columns
in Gray order first: the 1s then sit in columns 00 and 11, which give two separate pairs $B'C'$ and
$BC$, so $f = B'C' + BC = \overline{B \oplus C}$.
:::

:::viz{#trap-labels-viz spec="kmap-trap-labels" mode="animate" depth="standard"}
:::

## Patterns worth recognising

:::intuition{#patterns-intuition title="When every step changes the answer" depth="standard"}
Parity flips whenever any input flips. On a map every step to a neighbour flips one input, so a parity
function alternates 1, 0, 1, 0 in every direction: a checkerboard, with no two 1s side by side and nothing
to loop. If only some inputs matter, the alternation happens only along those directions and the other
directions repeat, which leaves loops: an XOR or XNOR of fewer variables.
:::

:::theorem{#checkerboard name="The checkerboard is parity" depth="standard"}
The 1s of $x_1 \oplus x_2 \oplus \dots \oplus x_n$ (odd parity) form a checkerboard on the map: no two
1s are adjacent. Hence every prime implicant is a single minterm and its minimal SOP lists all
$2^{n-1}$ minterms ($n$ literals each). The same holds for even parity (XNOR).
:::

:::proof{#proof-checkerboard of="the checkerboard theorem" depth="standard"}
**Idea first:** a step to a neighbour flips one bit, and flipping one bit flips the parity.

Neighbours differ in exactly one bit, so their numbers of 1 bits differ by one, so exactly one of them
has odd parity. Therefore a 1 of the parity function never has a neighbouring 1, no pair (let alone a
larger group) exists, and each 1 must be its own term. There are $2^{n-1}$ odd-parity minterms.
:::

:::viz{#checkerboard-viz spec="kmap-checkerboard" mode="animate" depth="standard"}
:::

:::definition{#xor-patterns term="XOR and XNOR patterns on a map" depth="standard"}
- **Full checkerboard:** $f$ is the XOR (or XNOR) of all variables. The SOP is long; the XOR form is short.
- **Partial checkerboard:** if the 1s alternate along some variables and repeat along the others, $f$ is an
  XOR or XNOR of only the alternating variables. On a 4-variable map, the four corners plus the centre
  quad give $B'D' + BD = \overline{B \oplus D}$; the opposite pattern (middle rows with outer columns,
  plus outer rows with middle columns) gives $BD' + B'D = B \oplus D$.
- **XNOR of two variables in POS:** $\overline{B \oplus D} = (B + D')(B' + D)$ and
  $B \oplus D = (B + D)(B' + D')$.
:::

### Worked examples: reading maps and patterns

::::example{#ex-read-transposed level="easy" title="A map with rows CD and columns AB" depth="quick"}
A map has rows $CD$ and columns $AB$ (both 00, 01, 11, 10). Rows 00 and 10 read 1 0 0 1; rows 01 and 11
read 0 1 1 0. Find the minimal SOP of $f(A, B, C, D)$.

:::step{why="In rows 00 and 10 the 1s are in the outer columns AB = 00 and 10: B = 0. Rows CD = 00 and 10 have D = 0. The four corners are one group."}
Corners: $B'D'$.
:::

:::step{why="In rows CD = 01 and 11 (D = 1) the 1s are in the middle columns AB = 01 and 11 (B = 1): a centre quad."}
Centre: $BD$.
:::

:::answer
$f = B'D' + BD = \overline{B \oplus D}$ (the GATE 1995 map).
:::
::::

::::example{#ex-read-1998 level="medium" title="The binary-labelled map" depth="standard"}
Rows $A = 0, 1$; columns printed as $BC = 00, 01, 10, 11$; both rows read 1 0 0 1. Find $f$.

:::step{why="Decode each 1 from the printed labels, not from its position: the 1s are at BC = 00 and BC = 11."}
1s: $m_0, m_3, m_4, m_7$ (for $A = 0$ and $A = 1$).
:::

:::step{why="Re-drawn in Gray order (00, 01, 11, 10), BC = 11 is the third column: the two columns of 1s are not adjacent, and each column is a vertical pair."}
Pairs: $B'C'$ and $BC$.
:::

:::answer
$f = B'C' + BC = \overline{B \oplus C}$ (GATE 1998, option C).
:::
::::

::::example{#ex-read-parity level="gate" title="Recognising parity" depth="standard"}
A 4-variable map has 1s exactly at $m_1, m_2, m_4, m_7, m_8, m_{11}, m_{13}, m_{14}$. Minimise it.

:::step{why="Count the 1 bits of each: 0001, 0010, 0100, 0111, 1000, 1011, 1101, 1110 all have an odd number of 1s."}
The 1s are the odd-parity minterms: a checkerboard.
:::

:::step{why="By the checkerboard theorem no two 1s are adjacent, so the minimal SOP is the 8 minterms themselves."}
Minimal SOP: 8 terms, 32 literals.
:::

:::answer
$f = A \oplus B \oplus C \oplus D$; as a two-level SOP no simplification is possible.
:::
::::

::::example{#ex-read-barred level="gate" title="Edge case: axes labelled with letters" depth="standard"}
A map's rows are labelled $\bar a\bar b, \bar a b, ab, a\bar b$ and its columns
$\bar c\bar d, \bar c d, cd, c\bar d$. Which cells hold the 1s of $a\bar d + \bar a\bar c + b\bar c d$?

:::step{why="Translate the letters: a bar means 0, so the row labels are 00, 01, 11, 10 and the columns too. This is a normal Gray-order map."}
Rows $ab$ = 00, 01, 11, 10; columns $cd$ = 00, 01, 11, 10.
:::

:::step{why="Expand each term: ad′ = 1−−0, a′c′ = 0−0−, bc′d = −101."}
$a\bar d$: $m_8, m_{10}, m_{12}, m_{14}$. $\bar a\bar c$: $m_0, m_1, m_4, m_5$. $b\bar c d$: $m_5, m_{13}$.
:::

:::answer
1s at $m_0, m_1, m_4, m_5, m_8, m_{10}, m_{12}, m_{13}, m_{14}$: rows $\bar a\bar b$ and $\bar a b$ have 1s
in the first two columns, row $ab$ in columns $\bar c\bar d, \bar c d, c\bar d$, row $a\bar b$ in
$\bar c\bar d$ and $c\bar d$ (the GATE IT 2007 map, option A).
:::
::::

:::note{#recap-read title="Recap" depth="quick"}
Read the axis variables and their order, check for Gray order, and decode each cell from its labels.
Checkerboards are parity (no grouping); partial checkerboards are XOR/XNOR of fewer variables.
:::

## Free variables

:::intuition{#free-intuition title="A switch wired to nothing" depth="standard"}
Imagine a panel of switches that controls a lamp, and one switch that is not connected to anything.
Flipping it never changes the lamp. On a truth table that switch's column is irrelevant: every row and its
"twin" with that switch flipped give the same output. On the map the twin of a cell is its neighbour along
that variable, so the 1s come in pairs across that variable's boundary, and every loop can stretch across
it. That is why a free variable never appears in the minimal form.
:::

:::definition{#free-variable term="A variable the function ignores" depth="standard"}
$f$ is **independent** of $x$ when flipping $x$ never changes $f$: $f(\dots, x = 0, \dots) = f(\dots, x = 1,
\dots)$ for every setting of the other variables. On the map, flipping $x$ moves every cell to its
$x$-neighbour; $f$ ignores $x$ exactly when this move maps 1s onto 1s and 0s onto 0s. Then $x$ appears in
no term of the minimal SOP (or POS).
:::

:::trick{#trick-free-variable title="Pair the minterms that differ in one bit" depth="standard"}
For $x$ with weight $w$ in the minterm number ($w = 8, 4, 2, 1$ for $A, B, C, D$), check that for every
minterm $m$ in the list, $m \oplus w$ (that is $m + w$ or $m - w$) is also in the list. Example:
$\Sigma(2, 6, 10, 14)$ is closed under $\pm 8$ (2 ↔ 10, 6 ↔ 14) and under $\pm 4$ (2 ↔ 6, 10 ↔ 14), so it
ignores $A$ and $B$; it is not closed under $\pm 2$ or $\pm 1$, so it depends on $C$ and $D$: $f = CD'$.
Always test **every** variable: finding one free variable does not mean there is only one.

**Why it works:** $m \oplus w$ is $m$ with $x$ flipped. **When it fails:** never for a fully specified
function, provided you use the weight of $x$ in the variable order the question gives. With don't-cares the
answer can depend on how you fill the Xs: treat each X as a wildcard that may complete a pair.
:::

### Worked examples: free variables

::::example{#ex-free-easy level="easy" title="Which variables does a function ignore?" depth="quick"}
Is $f(A, B, C, D) = \Sigma m(1, 3, 9, 11)$ independent of any variable?

:::step{why="Write the minterms in binary: 0001, 0011, 1001, 1011."}
$B = 0$ and $D = 1$ in all four; $A$ and $C$ take all four combinations.
:::

:::step{why="A group of 4 cells with B and D fixed is the single term B′D."}
$f = B'D$.
:::

:::answer
$f$ ignores $A$ and $C$ (two variables). Check with the trick: the list is closed under $\pm 8$ (flip $A$)
and $\pm 2$ (flip $C$).
:::
::::

::::example{#ex-free-medium level="medium" title="Free variables of an XNOR pattern" depth="standard"}
On which variables does $f(A, B, C, D) = \Sigma m(0, 1, 4, 5, 10, 11, 14, 15)$ depend?

:::step{why="Test B (±4): 0 ↔ 4, 1 ↔ 5, 10 ↔ 14, 11 ↔ 15 are all in the list."}
$f$ ignores $B$.
:::

:::step{why="Test D (±1): 0 ↔ 1, 4 ↔ 5, 10 ↔ 11, 14 ↔ 15, all present."}
$f$ ignores $D$.
:::

:::step{why="Test A (±8): m0 is in, m8 is not. Test C (±2): m0 is in, m2 is not."}
$f$ depends on $A$ and $C$.
:::

:::answer
Only on $A$ and $C$: $f = A'C' + AC = \overline{A \oplus C}$.
:::
::::

::::example{#ex-free-gate level="gate" title="How many variables are free?" depth="standard"}
$f(A, B, C, D) = \Sigma m(2, 3, 6, 7, 10, 11, 14, 15)$ is independent of how many variables?

:::step{why="All eight minterms have bit C (weight 2) equal to 1: 0010, 0011, 0110, 0111, …"}
Every minterm with $C = 1$ is present, and none with $C = 0$.
:::

:::step{why="So flipping A, B or D keeps a minterm inside the list, while flipping C leaves it."}
$f = C$.
:::

:::answer
Independent of three variables ($A$, $B$, $D$). A function of $n$ variables that is a single literal has
$2^{n-1}$ minterms and $n - 1$ free variables.
:::
::::

::::example{#ex-free-dc level="gate" title="Edge case: a don't-care decides freedom" depth="standard"}
$f(A, B, C) = \Sigma m(1, 3, 5) + d(7)$. Can the minimal SOP be made independent of $A$ and $B$?

:::step{why="Without the X, f = Σ(1, 3, 5) = A′C + B′C depends on all three variables (e.g. m5 is in but m7 is not)."}
As specified with $X_7 = 0$: depends on $A$, $B$, $C$.
:::

:::step{why="Setting X7 = 1 completes the pairs 5 ↔ 7 (flip B) and 3 ↔ 7 (flip A): the list {1, 3, 5, 7} is closed under ±4 and ±2."}
With $X_7 = 1$: $f = C$.
:::

:::answer
Yes: using the don't-care, $f = C$, free of $A$ and $B$. With don't-cares, "is $f$ independent of $x$" can
depend on the choice of the Xs.
:::
::::

:::note{#recap-free title="Recap" depth="quick"}
$f$ ignores $x$ iff its minterm list is closed under flipping $x$ (± its weight). Test every variable.
With don't-cares, the Xs may be chosen to make a variable free.
:::

## Equal expressions and counting minterms

:::intuition{#equal-intuition title="Two recipes, one dish" depth="standard"}
Two expressions are equal when they are 1 on exactly the same rows, however different they look, just as
two recipes can produce the same dish. The reliable test is to list the rows (minterms) each one covers.
Counting how many rows an expression covers is the same exercise: write each term as a block of cells and
count the union.
:::

:::definition{#algebra-check term="Algebra alongside the map" depth="standard"}
The map and the algebra must agree, so use one to check the other:

- combining: $AB'C + AB'C' = AB'$;
- absorption: $x + xy = x$, and $x + x'y = x + y$;
- consensus: $xy + x'z + yz = xy + x'z$ (on the map, the consensus term is a loop lying inside the
  union of the other two).

GATE 2014's $PQ + P'QR + P'QR'S$ shrinks by algebra too: $PQ + P'QR = Q(P + P'R) = Q(P + R)$, then
$Q(P + R) + P'QR'S = Q(P + R + P'R'S) = Q(P + R + S)$, which expands to $PQ + QR + QS$.
:::

:::definition{#equivalent-forms term="Equal is not the same as minimal" depth="standard"}
Two SOP expressions are **equal** when they have the same minterm list; their terms may look completely
different. An expression can be equal to $f$ without being minimal (extra or larger terms), and a
function can have several different minimal SOPs. To decide "which expressions represent $f$", expand
each option into minterms (or plot it) and compare lists; do not compare shapes. To decide "which is
the minimal form", also compare literal counts.
:::

:::derivation{#count-minterms of="the number of minterms of an SOP" depth="standard"}
A $k$-literal term of $n$ variables fixes $k$ variables and leaves $n - k$ free, so it covers $2^{n-k}$
minterms. The minterms of an SOP are the **union** of its terms' sets, so by inclusion–exclusion
$$
|T_1 \cup T_2| = |T_1| + |T_2| - |T_1 T_2|,
$$
where $T_1 T_2$ (the AND of the two terms) is again a term, or 0 if they contain opposite literals. For
three terms add back the triple overlap. For a complemented expression, count the complement's minterms
and subtract from $2^n$, or apply De Morgan first.

**Sanity check.** $A + A'$ over one variable: $1 + 1 - |AA'| = 2 - 0 = 2$, all rows.
:::

### Worked examples: equality and counting

::::example{#ex-count-easy level="easy" title="Counting with one overlap" depth="quick"}
How many minterms does $f(A, B, C) = AB + C$ have?

:::step{why="AB has 2 literals of 3 variables: 2^(3−2) = 2 minterms; C has 1 literal: 4 minterms."}
$|AB| = 2$, $|C| = 4$.
:::

:::step{why="The overlap is ABC, one minterm, counted twice."}
$2 + 4 - 1 = 5$.
:::

:::answer
5 minterms: $\{1, 3, 5, 6, 7\}$.
:::
::::

::::example{#ex-free-equal level="medium" title="Which SOPs equal the function?" depth="standard"}
Let $f(A, B, C) = AB + A'C + BC$. Which of (i) $AB + A'C$, (ii) $AB + BC$, (iii) $A'C + BC + AB'$ equal $f$?

:::step{why="Expand f: AB = 11− = {6, 7}, A′C = 0−1 = {1, 3}, BC = −11 = {3, 7}."}
$f = \Sigma(1, 3, 6, 7)$.
:::

:::step{why="Expand each option the same way and compare lists."}
(i) $\{6, 7\} \cup \{1, 3\} = \{1, 3, 6, 7\}$: equal. (ii) $\{6, 7\} \cup \{3, 7\} = \{3, 6, 7\}$: misses $m_1$.
(iii) $\{1, 3\} \cup \{3, 7\} \cup \{4, 5\}$: has the extra $m_4, m_5$ and misses $m_6$.
:::

:::answer
Only (i). The term $BC$ of $f$ is the consensus of $AB$ and $A'C$, so dropping it changes nothing.
:::
::::

::::example{#ex-free-count level="gate" title="Count the minterms of a complemented expression" depth="standard"}
How many minterms does $\overline{A'B + C}$ have, over $(A, B, C)$?

:::step{why="Apply De Morgan to the sum, then to the product inside."}
$\overline{A'B + C} = \overline{A'B} \cdot C' = (A + B')\,C'$.
:::

:::step{why="C must be 0, and A + B′ must be 1: rows 000 (B′ = 1), 100 and 110 (A = 1). Row 010 fails because A = 0 and B = 1."}
Minterms $m_0, m_4, m_6$.
:::

:::answer
3. (Check by complement: $A'B + C = \{2, 3\} \cup \{1, 3, 5, 7\} = \{1, 2, 3, 5, 7\}$, five minterms, and $8 - 5 = 3$.)
:::
::::

::::example{#ex-equal-edge level="gate" title="Edge case: equal expressions with no term in common" depth="standard"}
Are $A'B + B'C + AC'$ and $A'C + BC' + AB'$ equal?

:::step{why="Expand the first: A′B = {2, 3}, B′C = {1, 5}, AC′ = {4, 6}."}
$\{1, 2, 3, 4, 5, 6\}$.
:::

:::step{why="Expand the second: A′C = {1, 3}, BC′ = {2, 6}, AB′ = {4, 5}."}
$\{1, 2, 3, 4, 5, 6\}$.
:::

:::answer
Equal: both are $\Sigma(1, 2, 3, 4, 5, 6)$, and both are minimal (Lesson 2 shows this function has exactly
these two minimal SOPs). Sharing no term proves nothing; only the minterm lists decide.
:::
::::

:::note{#recap-equal title="Recap" depth="quick"}
Equal ⇔ same minterm list; minimal is a separate question. A $k$-literal term covers $2^{n-k}$ minterms;
count unions by inclusion–exclusion or through the complement.
:::

## Functions given by conditions

:::intuition{#conditions-intuition title="Each condition paints a stripe" depth="standard"}
A condition such as "$f(1, x, 1, z) = x + z$" talks only about the cells where $w = 1$ and $y = 1$: a stripe of
the map. It tells you what to write in those cells. Several conditions paint several stripes; where stripes
overlap they must agree, and cells that no stripe touches are left blank. Blank cells are freedom, not
zeros.
:::

:::definition{#partial-specs term="Functions defined by conditions" depth="standard"}
A question may define $f$ by statements such as "$f(w, 0, 0, z) = 1$" or "$f(1, x, 1, z) = x + z$". Each
statement fills a region of the map: the cells that match the fixed values, with the given formula
evaluated on the free variables. Fill every region (they must agree where they overlap), then see which
cells **no** statement reaches. Those cells are not determined by the question; if it asks for the
minimal form, treat them as don't-cares (Lesson 2) and choose their values to make the loops largest.
:::

### Worked examples: functions given by conditions

::::example{#ex-cond-easy level="easy" title="Two conditions that fill the whole map" depth="quick"}
$f(A, B, C)$ satisfies $f(0, B, C) = B$ and $f(1, B, C) = C'$. Find its minimal SOP.

:::step{why="A = 0 row: f = B, so m2 (010) and m3 (011) are 1."}
Row $A = 0$: $m_2, m_3$.
:::

:::step{why="A = 1 row: f = C′, so m4 (100) and m6 (110) are 1."}
Row $A = 1$: $m_4, m_6$.
:::

:::answer
$f = \Sigma(2, 3, 4, 6) = A'B + AC'$: exactly Shannon's expansion $A' f(0, B, C) + A f(1, B, C)$.
:::
::::

::::example{#ex-cond-medium level="medium" title="Conditions on a 4-variable function" depth="standard"}
$f(A, B, C, D)$ satisfies $f(A, B, 0, D) = A + D$ and $f(A, B, 1, D) = B$. Find its minimal SOP.

:::step{why="C = 0 half: f = A + D, so the cells with C = 0 and (A = 1 or D = 1) are 1: m1, m5, m8, m9, m12, m13."}
$C = 0$: $\{1, 5, 8, 9, 12, 13\}$.
:::

:::step{why="C = 1 half: f = B: m6, m7, m14, m15."}
$C = 1$: $\{6, 7, 14, 15\}$.
:::

:::step{why="Loop: C′D (1, 5, 9, 13), AC′ (8, 9, 12, 13), BC (6, 7, 14, 15)."}
Three quads, all essential.
:::

:::answer
$f = C'D + AC' + BC$ (6 literals).
:::
::::

::::example{#ex-free-conditions level="gate" title="Cells that no condition reaches" depth="standard"}
$f(A, B, C)$ satisfies $f(0, B, C) = B + C$ and $f(1, 1, C) = C'$. Find its minimal SOP.

:::step{why="The first condition fills row A = 0: B + C is 0 only for B = C = 0."}
$f(0, \cdot, \cdot)$: $m_0 = 0$; $m_1 = m_2 = m_3 = 1$.
:::

:::step{why="The second fills A = 1, B = 1: f = C′, so m6 (110) = 1 and m7 (111) = 0."}
$m_6 = 1$, $m_7 = 0$.
:::

:::step{why="No condition mentions A = 1, B = 0, so m4 and m5 are not determined: treat them as don't-cares and use them only if a loop grows."}
1s: 1, 2, 3, 6; don't-cares: 4, 5. Loops: $A'C$ ($m_1, m_3$), $BC'$ ($m_2, m_6$); setting $m_4, m_5$ to 1 would
not enlarge either loop, so leave them 0.
:::

:::answer
$f = A'C + BC'$ (4 literals). Any completion that sets $m_4$ or $m_5$ to 1 needs an extra term. (GATE 2021
uses three conditions on four variables and leaves two cells free in the same way.)
:::
::::

::::example{#ex-cond-edge level="gate" title="Edge case: conditions that contradict each other" depth="standard"}
Is there a function $f(A, B, C)$ with $f(0, B, C) = B$ and $f(A, 1, C) = C$?

:::step{why="The two stripes overlap where A = 0 and B = 1 (cells m2, m3)."}
Overlap: $m_2$ ($C = 0$) and $m_3$ ($C = 1$).
:::

:::step{why="First condition there: f = B = 1 on both cells. Second: f = C, so f(m2) = 0."}
They disagree on $m_2$.
:::

:::answer
No such function exists. Always check the overlaps before minimising.
:::
::::

:::note{#recap-conditions title="Recap" depth="quick"}
Each condition fills a stripe of cells; overlaps must agree; unreached cells are don't-cares, to be chosen
for the cheapest cover.
:::

## Try it: the K-map Solver

Click cells to set 1, 0 or X, and watch the solver list every prime implicant and draw a minimal SOP or
POS. Try the "Redundant centre quad" preset: the solver never uses $BD$.

:::lab{#lab-kmap lab="kmap-solver" tab="map" depth="standard"}
:::

## GATE questions on this lesson

All twenty previous-year questions. Try each before opening the solution.

:::pyq{id="cse-1995-b-63-b" tests="read-map,corner-quad,xor-patterns" depth="standard"}
:::

:::pyq{id="cse-1996-a-49" tests="pos-method,xor-patterns,trap-pos-literals" depth="standard"}
:::

:::pyq{id="cse-1998-a-42" tests="trap-non-gray,xor-patterns" depth="standard"}
:::

:::pyq{id="cse-2000-a-2-11" tests="read-map,equivalent-forms,pos-method" depth="standard"}
:::

:::pyq{id="cse-2025-2-cs-33" tests="xor-patterns,equivalent-forms" depth="standard"}
:::

:::pyq{id="it-2007-cs-78" tests="read-map,trap-axis-order" depth="standard"}
:::

:::pyq{id="it-2007-cs-79" tests="equivalent-forms,sop-method" depth="standard"}
:::

:::pyq{id="cse-2005-cs-18" tests="sop-method,equivalent-forms" depth="standard"}
:::

:::pyq{id="cse-2025-1-cs-32" tests="sop-method,corner-quad" depth="standard"}
:::

:::pyq{id="cse-2026-2-cs-30" tests="groups-def,group-term" depth="standard"}
:::

:::pyq{id="it-2004-it-44" tests="sop-method,algebra-check" depth="standard"}
:::

:::pyq{id="cse-2014-1-cs-7" tests="sop-method,algebra-check" depth="standard"}
:::

:::pyq{id="cse-2011-cs-14" tests="pos-method" depth="standard"}
:::

:::pyq{id="cse-1997-b-71-a" tests="pos-method,sop-method" depth="standard"}
:::

:::pyq{id="cse-1997-b-71-b" tests="count-minterms" depth="standard"}
:::

:::pyq{id="cse-2015-2-cs-37" tests="count-minterms" depth="standard"}
:::

:::pyq{id="cse-2007-cs-32" tests="equivalent-forms" depth="standard"}
:::

:::pyq{id="cse-2007-cs-9" tests="free-variable,trick-free-variable" depth="standard"}
:::

:::pyq{id="it-2008-it-8" tests="free-variable,trick-free-variable" depth="standard"}
:::

:::pyq{id="cse-2021-2-cs-52" tests="partial-specs" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dl-03-01-q01" depth="standard"}
:::

:::practice{id="nx-dl-03-01-q02" depth="standard"}
:::

:::practice{id="nx-dl-03-01-q03" depth="standard"}
:::

:::practice{id="nx-dl-03-01-q04" depth="standard"}
:::

:::practice{id="nx-dl-03-01-q05" depth="standard"}
:::

:::practice{id="nx-dl-03-01-q06" depth="standard"}
:::

:::practice{id="nx-dl-03-01-q07" depth="standard"}
:::

:::practice{id="nx-dl-03-01-q08" depth="standard"}
:::

:::practice{id="nx-dl-03-01-q09" depth="standard"}
:::

:::practice{id="nx-dl-03-01-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Karnaugh maps on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Why it works | $Px + Px' = P$: cells one bit apart merge, the changing variable drops |
| Layout | rows = first variables; labels in Gray order 00 01 11 10; cells 0 1 3 2 / 4 5 7 6 / 12 13 15 14 / 8 9 11 10 |
| Adjacency | one-bit neighbours, through the borders too (a torus); $n$ neighbours per cell; diagonals never |
| Groups | $2^k$ cells in a rectangle (wrap allowed) = a product of $n - k$ literals |
| SOP | loop 1s: forced 1s first, largest legal loops, fewest loops, no redundant loop |
| POS | loop 0s; factor literal plain if the variable is 0 on the loop, primed if 1 |
| Reading maps | read the axis variables and label order before looping; re-draw binary labels in Gray order |
| Patterns | checkerboard = parity (no grouping); corners + centre = XNOR of two variables |
| Equality | compare minterm lists; equal ≠ minimal; free variables = list closed under flipping |
:::

:::note{#further-depth title="Further depth: why maps stop at about six variables" depth="deep"}
A map of $n$ variables must make every cell adjacent to $n$ others. On a flat grid a cell has only four
edge-neighbours, so beyond four variables the map is drawn as several 4-variable maps whose matching
cells are declared adjacent (Lesson 3). At five variables this is still easy to see, at six it is
awkward, and beyond that the picture is useless: that is why the tabular method of Lesson 3, which
does the same merging with lists of bit patterns, takes over.
:::
