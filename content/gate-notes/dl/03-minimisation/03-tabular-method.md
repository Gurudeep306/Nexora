---
id: tabular-method
subject: dl
chapter: minimisation
title: Quine–McCluskey, PI charts and larger maps
order: 3
prerequisites: [prime-implicants]
pyq_topics: [dl/minimization]
est_minutes: 60
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every table, chart, cover count and map is checked in content/gate-notes/_checks/dl/l3_03_tabular.py (Quine–McCluskey vs brute force; Petrick vs exhaustive search)."
  - "Coverage checklist only (internal digests, never copied): set B pp. 115–117 and 165, set C pp. 238, 262–263 and 266–273. No set runs the full tabulation; set C's 5-variable and VEM slips (pp. 238, 271) are recorded in _errata/dl.md."
  - "Facts checked against: E. J. McCluskey, 'Minimization of Boolean functions' (1956); S. R. Petrick, 'A direct determination of the irredundant forms of a Boolean function' (1956); M. Morris Mano, Digital Design (tabulation method)."
  - "PYQ: src/gate/questions.json (dl/minimization, cse-1992-a-1-i); the key is re-derived in l3_03_tabular.py."
updated: "2026-10-18"
---

A K-map is a picture, and pictures stop working once a function has five or six variables. This
lesson does the same minimisation with lists of bit patterns, a method precise enough for a program:
the **Quine–McCluskey** tabulation finds every prime implicant, the **prime-implicant chart** picks the
essential ones and simplifies the rest by **dominance**, and **Petrick's method** lists every minimal
cover when the chart is stubborn. We then stretch the map to five and six variables and shrink it with
**variable-entered maps**, the form GATE 1992 used.

## Where this fits

[Lesson 2](lesson:prime-implicants) defined prime and essential prime implicants and minimised by
looking at loops. Here every step of that process becomes a table operation, which is how design tools
treat minimisation and why textbooks call it the tabular method. Lesson 4 then turns the minimal forms
into gates.

:::table{#radar title="GATE radar: tabulation, charts and larger maps" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 1 (1992): read a variable-entered map |
| What else GATE uses from here | Counting PIs and EPIs on functions too big to see (any 4-variable PI question can be checked by tabulation), multiple minimal covers (Petrick), 5-variable adjacency |
| Syllabus | Minimisation is in the syllabus and the tabular method is its standard exact technique, so a direct Quine–McCluskey question is possible |
| What examiners test | Which cubes may combine (same dash positions, one differing bit), that unticked cubes are the prime implicants, the direction of dominance, and which cells of a 5-variable map are neighbours |
:::

## The idea: let a list do what the eye did

:::intuition{#why-tabular title="Combining without a picture" depth="standard"}
On a map you merged two neighbouring cells by seeing that they touch. In binary, two minterms touch
exactly when their patterns differ in one bit: 0101 and 0111 differ only in the third bit, so they
merge into 01-1 (the dash marks the variable that disappears). Two such dashed patterns merge again if
their dashes line up and they differ in one more bit: 01-1 and 11-1 give -1-1. Doing this
systematically, round after round, finds every loop you could have drawn, and a pattern that never
merges is a loop that cannot grow: a prime implicant. No geometry is needed, so the method works for
any number of variables.
:::

## The Quine–McCluskey tabulation

:::definition{#qm-grouping term="Step 1: list and group by weight" depth="quick"}
Write every minterm (and every don't-care) in binary. Sort them into **groups by weight**, the number
of 1 bits: group 0, group 1, group 2, … Each pattern is a **cube**; at this stage a cube of 1 cell.
:::

:::theorem{#qm-weights name="Only neighbouring weight groups can combine" depth="standard"}
Two cubes with dashes in the same positions combine (differ in exactly one other bit) only if their
weights differ by exactly 1.
:::

:::proof{#proof-qm-weights of="the weight rule" depth="standard"}
**Idea first:** the one differing bit is 0 in one cube and 1 in the other; nothing else differs.

If the cubes agree everywhere except one non-dash position, where one has 0 and the other 1, then
their numbers of 1s differ by exactly one. So a cube in group $w$ can only combine with cubes in groups
$w - 1$ or $w + 1$, and comparing group $w$ with group $w + 1$ for every $w$ finds every possible
combination. (The converse fails: weights differing by 1 do not guarantee a combination; 0011 and
0100 differ in three bits.)
:::

:::definition{#qm-combine term="Step 2: combine and tick" depth="standard"}
For each pair of adjacent groups, compare every cube of group $w$ with every cube of group $w + 1$.
Two cubes combine when

1. their dashes are in **the same positions**, and
2. they differ in **exactly one** other position.

The combined cube has a dash in that position. **Tick** both parents (they are contained in a bigger
implicant). Write each new cube once, even if it is produced by several pairs.
:::

:::trick{#trick-qm-diff title="Combine by subtracting minterm numbers" depth="standard"}
Two single minterms $a < b$ combine iff $b - a$ is a power of two **and** $b$ has a 1 where $a$ has a 0 in
that bit (equivalently $a \,\&\, (b - a) = 0$). Example: 5 and 7: $7 - 5 = 2$ and bit 1 of 5 is 0, so
they combine (01-1). But 3 and 5: $5 - 3 = 2$, yet bit 1 of 3 is already 1, so they do not (they differ
in two bits).

**Why it works:** adding a power of two that does not carry flips exactly one bit from 0 to 1. **When it
fails:** for dashed cubes the dash positions must also match; compare the cell lists of the two cubes
as sets ($\{0, 2\} + 4 = \{4, 6\}$ gives $\{0, 2, 4, 6\}$).
:::

:::definition{#qm-rounds term="Step 3: repeat until nothing combines" depth="quick"}
The new cubes (pairs) form round 1; group them by weight (counting 1s only) and combine again to get
quads (round 2), then octets, and so on. Stop when a round produces no new cube. Every cube that was
never ticked, in any round, is a **prime implicant**. Notice why the ticked cubes can be forgotten: each
lies inside a bigger implicant, and Lesson 2's prime implicant theorem says a minimal cover never needs
such a cube. A common wrong turn is to tick a cube only when it combines "upwards" in the next group; it
must be ticked whenever it combines with any cube.
:::

:::theorem{#qm-correct name="The unticked cubes are exactly the prime implicants" depth="standard"}
The tabulation lists every implicant of $f$ (of the minterms plus don't-cares) and ticks exactly those
contained in a larger implicant. Hence the unticked cubes are precisely the prime implicants.
:::

:::proof{#proof-qm-correct of="correctness of the tabulation" depth="standard"}
**Idea first:** a cube of $2^k$ cells is made of two halves of $2^{k-1}$ cells, which the previous round
already listed; and a cube that is not prime sits inside a cube twice its size.

*Every listed cube is an implicant:* by the combining rule $Px + Px' = P$, merging two implicants that
differ in one variable gives an implicant (induction on the round).

*Every implicant is listed:* a cube with $k$ dashes splits on any of its dash positions into two cubes
with $k - 1$ dashes that differ in exactly that bit; by induction both are in round $k - 1$, so the
algorithm combines them and lists the cube in round $k$.

*Ticks:* a cube $C$ is ticked iff it combined with another cube, i.e. iff it lies in a cube twice its
size that is an implicant. If $C$ is not prime, it lies in some larger implicant $D$; take a variable that
is fixed in $C$ but free in $D$, and free it in $C$: the result is a cube of twice the size inside $D$,
hence an implicant, hence listed, hence formed by combining $C$ with its partner, so $C$ is ticked. If $C$
is prime, no larger implicant contains it and it is never ticked.
:::

:::definition{#qm-dont-cares term="Don't-cares in the table" depth="quick"}
Include the don't-cares in step 1 exactly like minterms: they help form larger cubes. At the end,
discard any prime implicant made **only** of don't-cares (it covers nothing that matters), and never
give a don't-care a column in the chart.
:::

:::viz{#qm-viz spec="qm-tabulation" mode="animate" depth="standard"}
:::

:::trap{#trap-qm-dashes title="Combining cubes whose dashes do not line up" depth="standard"}
00−1 and 0−11 differ in only two characters, so they look like neighbours, but their dashes are in
different places: their cells $\{1, 3\}$ and $\{3, 7\}$ together are $\{1, 3, 7\}$, three cells, which is not a
cube. Students who "merge" them write 0−−1, a quad that also contains the cell 5. Only cubes with
**identical dash positions** may combine (then the merged cube has exactly the union of their cells).
:::

### Worked examples: the tabulation

::::example{#ex-qm-easy level="easy" title="A 3-variable tabulation" depth="quick"}
Find the prime implicants of $f(A, B, C) = \Sigma m(0, 1, 2, 5)$ by Quine–McCluskey.

:::step{why="Only cubes in neighbouring weight groups can differ in one bit, so sorting by weight limits the comparisons."}
000 (weight 0); 001, 010 (weight 1); 101 (weight 2). Groups: $\{0\}$, $\{1, 2\}$, $\{5\}$.
:::

:::step{why="Two minterms that differ in exactly one bit merge, by the combining rule, into one cube with a dash there."}
Group 0 with group 1: 000 + 001 = 00−, 000 + 010 = 0−0. Group 1 with group 2: 001 + 101 = −01; 010 and 101 differ in
three bits. Round 1: 00− (0, 1), 0−0 (0, 2), −01 (1, 5). All four minterms ticked.
:::

:::step{why="Pairs combine only if their dashes line up; otherwise their union is not a cube."}
Round 1 groups: weight 0: 00−, 0−0; weight 1: −01. Every candidate pair has different dash positions, so nothing
combines: no round 2, and all three pairs stay unticked.
:::

:::answer
PIs: $A'B'$ (00−), $A'C'$ (0−0), $B'C$ (−01). $m_2$ is only in $A'C'$ and $m_5$ only in $B'C$, so the minimal SOP is
$A'C' + B'C$ and $A'B'$ is redundant.
:::
::::

::::example{#ex-qm-medium level="medium" title="Three rounds, one duplicate" depth="standard"}
Tabulate $f = \Sigma m(0, 2, 4, 5, 6, 10)$ (the GATE 2015 function).

:::step{why="Sorting by weight means only neighbouring groups need comparing (theorem qm-weights)."}
0000 → weight 0; 0010, 0100 → 1; 0101, 0110, 1010 → 2. Groups: $\{0\}$, $\{2, 4\}$, $\{5, 6, 10\}$.
:::

:::step{why="Every pair of minterms one bit apart merges; a minterm that merged is not prime, so it is ticked."}
0+2 = 00−0, 0+4 = 0−00; 2+6 = 0−10, 2+10 = −010, 4+5 = 010−, 4+6 = 01−0. Six pairs; every minterm ticked.
:::

:::step{why="A quad has two ways of being split into halves, so it is usually produced twice; it is still one cube."}
00−0 + 01−0 = 0−−0 and 0−00 + 0−10 = 0−−0. 010− and −010 have no partner with matching dashes. One quad, 0−−0.
Ticked: 00−0, 0−00, 01−0, 0−10. Unticked: 010−, −010.
:::

:::answer
PIs: $A'D'$ (0−−0), $A'BC'$ (010−), $B'CD'$ (−010): 3, as the map in Lesson 2 gave. The animation above
runs this table.
:::
::::

::::example{#ex-qm-gate level="gate" title="Eight minterms, two quads" depth="standard"}
Find all prime implicants of $f = \Sigma m(0, 1, 2, 8, 10, 11, 14, 15)$.

:::step{why="Weight groups organise the comparisons; an empty group would stop combinations across it."}
Weight 0: 0000. Weight 1: 0001, 0010, 1000. Weight 2: 1010. Weight 3: 1011, 1110. Weight 4: 1111.
:::

:::step{why="Compare each cube with every cube of the next group; pairs differing in one bit merge."}
Round 1: 000− (0, 1), 00−0 (0, 2), −000 (0, 8), −010 (2, 10), 10−0 (8, 10), 101− (10, 11), 1−10 (10, 14),
1−11 (11, 15), 111− (14, 15). Every minterm is ticked.
:::

:::step{why="Pairs merge into quads only when their dashes line up; each quad appears twice and is listed once."}
00−0 + 10−0 = −0−0 (also from −000 + −010); 101− + 111− = 1−1− (also from 1−10 + 1−11). Round 2: −0−0 and 1−1−.
Unticked in round 1: 000−.
:::

:::answer
3 PIs: $B'D'$ (−0−0), $AC$ (1−1−), $A'B'C'$ (000−). All three are essential, so
$f = B'D' + AC + A'B'C'$.
:::
::::

::::example{#ex-qm-edge level="gate" title="Edge case: don't-cares in the table" depth="standard"}
Tabulate $f = \Sigma m(1, 3, 6, 7) + d(5, 15)$ and give the minimal SOP.

:::step{why="Don't-cares may help build bigger cubes, so they enter the table exactly like minterms."}
0001 (w1); 0011, 0101, 0110 (w2); 0111 (w3); 1111 (w4). Groups: $\{1\}$, $\{3, 5, 6\}$, $\{7\}$, $\{15\}$.
:::

:::step{why="The rounds run as usual; the don't-cares are cells like any other here."}
Round 1: 1+3 = 00−1, 1+5 = 0−01, 3+7 = 0−11, 5+7 = 01−1, 6+7 = 011−, 7+15 = −111. Round 2: 00−1 + 01−1 = 0−−1
(also 0−01 + 0−11). Unticked: 011− ($A'BC$), −111 ($BCD$), and the quad 0−−1 ($A'D$).
:::

:::step{why="The chart has columns for the real 1s only: don't-cares never need covering."}
Columns 1, 3, 6, 7: $m_1$ and $m_3$ are only in $A'D$, $m_6$ only in $A'BC$; $m_7$ is then covered. $BCD$ covers only
$m_7$ among the 1s (its other cell is the X 15), so it is not needed. EPIs: $A'D$, $A'BC$.
:::

:::answer
$f = A'D + A'BC$. The don't-care 5 helped make the quad $A'D$; the don't-care 15 produced a prime implicant
($BCD$) that the cover does not need.
:::
::::

:::note{#recap-qm title="Recap" depth="quick"}
Binary list grouped by weight → combine neighbouring groups (same dashes, one differing bit) → tick →
repeat. Unticked cubes are the prime implicants; don't-cares join the list but never the chart.
:::

## The prime-implicant chart

:::intuition{#chart-intuition title="A seating plan" depth="standard"}
Think of every 1-cell as a guest who needs a seat, and every prime implicant as a bench that seats some
of the guests; benches cost money (literals). The chart is the seating plan written as a table: one row
per bench, one column per guest, a mark where a guest fits on a bench. A guest who fits on only one bench
forces you to buy it; after that you look for the cheapest benches that seat everyone else. Notice that
only prime implicants appear as rows: by Lesson 2's prime implicant theorem a minimal cover never needs
anything smaller, so the ticked cubes of the table can be forgotten.
:::

:::definition{#pi-chart term="The prime-implicant chart" depth="quick"}
A table with one **row per prime implicant** and one **column per 1-cell** (minterm; never a
don't-care), with a mark where the PI covers the cell. A cover is a set of rows that has a mark in
every column. Each row has a cost (its literal count).
:::

:::definition{#chart-epi term="Essential rows and column removal" depth="standard"}
A column with a **single** mark identifies an essential prime implicant (the only PI covering that
cell). Take every essential row, then delete every column it covers, and delete rows left with no
marks. What remains is the **reduced chart**. A common wrong turn is to delete only the single-mark
columns: every column the essential row covers is done.
:::

:::intuition{#dominance-intuition title="A bench that does everything another does, for no more" depth="standard"}
If bench $P$ seats every guest that bench $Q$ seats (and maybe more) and costs no more, you never need $Q$:
swapping $Q$ for $P$ in any plan keeps everyone seated and costs no more. Dually, if every bench that seats
guest $j$ also seats guest $i$, then guest $i$ is no problem: whoever seats $j$ seats $i$ too, so you can stop
worrying about $i$.
:::

:::theorem{#row-dominance name="Row dominance" depth="standard"}
In the reduced chart, if row $P$ has a mark in every column where row $Q$ has one (the columns of $Q$ are a
subset of those of $P$), and $\text{cost}(P) \le \text{cost}(Q)$, then some minimal cover does not use $Q$;
row $Q$ can be deleted. If two rows dominate each other (same columns, same cost), delete only one of them.
:::

:::proof{#proof-row-dominance of="row dominance" depth="standard"}
**Idea first:** anything $Q$ does, $P$ does at least as well for no more cost.

Take any minimal cover containing $Q$. Replace $Q$ by $P$ (if $P$ is not already in it). Every column $Q$
covered is still covered by $P$, so the result is still a cover, and its cost has not increased. So a
minimal cover without $Q$ exists. (Deleting both of two identical rows would leave their columns
uncovered, hence the tie rule.)
:::

:::theorem{#column-dominance name="Column dominance" depth="standard"}
If every row that covers column $j$ also covers column $i$ (the rows of $j$ are a subset of the rows of
$i$), then column $i$ can be deleted: any set of rows covering $j$ automatically covers $i$.
:::

:::proof{#proof-column-dominance of="column dominance" depth="standard"}
**Idea first:** covering the harder column covers the easier one for free.

A cover must contain some row with a mark in column $j$. By assumption that row also has a mark in
column $i$, so column $i$ is covered whenever column $j$ is. Removing column $i$ changes no cover's
validity.
:::

:::trap{#trap-dominance-direction title="Which way does dominance go?" depth="standard"}
For **rows**, delete the dominated row: the one whose marks are a subset of another no-costlier row's
(not simply "the row with fewer marks"). For **columns**, delete the **dominating** column, the one whose
set of rows is the larger. A student who reverses the column rule in the chart below deletes column 9 (the
easy one to miss) instead of columns 0, 1 and 8, loses the clue that $B'C'$ is essential and ends up
branching for nothing.
:::

:::viz{#chart-viz spec="pi-chart-dominance" mode="animate" depth="standard"}
:::

:::definition{#cyclic-chart term="Cyclic charts" depth="quick"}
If, after removing essential rows and applying dominance, no column has a single mark and no row
dominates another, the chart is **cyclic**. Branch (pick a row, simplify, repeat) or use Petrick's
method below.
:::

### Worked examples: charts and dominance

::::example{#ex-chart-easy level="easy" title="A chart settled by essential rows" depth="quick"}
Use a PI chart to minimise $f = \Sigma m(1, 3, 4, 5, 9, 11, 12, 13)$, whose PIs are $B'D$, $C'D$, $BC'$.

:::step{why="A single mark in a column means only one PI can cover that 1-cell."}
$B'D$ covers 1, 3, 9, 11; $C'D$ covers 1, 5, 9, 13; $BC'$ covers 4, 5, 12, 13. Single-mark columns: 3 and 11
(only $B'D$); 4 and 12 (only $BC'$).
:::

:::step{why="Essential rows must be taken, and every column they cover is then finished."}
$B'D$ and $BC'$ cover 1, 3, 9, 11, 4, 5, 12, 13: every column. $C'D$ has nothing left to cover.
:::

:::answer
$f = B'D + BC'$; $C'D$ is redundant.
:::
::::

::::example{#ex-chart-dominance level="medium" title="Row dominance after the essential rows" depth="standard"}
Minimise $f = \Sigma m(0, 1, 2, 5, 6, 7, 8, 9, 10, 14)$ with its chart (PIs: $B'C'$, $B'D'$, $CD'$, $A'C'D$,
$A'BD$, $A'BC$).

:::step{why="A single-mark column forces its row."}
Column 9 has only $B'C'$; column 14 only $CD'$. Both rows are essential.
:::

:::step{why="Everything an essential row covers is finished, so only the uncovered columns remain."}
They cover 0, 1, 8, 9 and 2, 6, 10, 14. Reduced chart, columns 5 and 7: $A'C'D$: {5}; $A'BD$: {5, 7};
$A'BC$: {7}; $B'D'$: {}.
:::

:::step{why="A row whose columns are a subset of a no-costlier row's can be deleted (row dominance)."}
$A'BD$ (3 literals) dominates $A'C'D$ and $A'BC$ (3 literals each); $B'D'$ covers nothing. Take $A'BD$.
:::

:::answer
$f = B'C' + CD' + A'BD$ (7 literals). The animation above performs these steps.
:::
::::

::::example{#ex-coldom-1 level="gate" title="Column dominance before anything else" depth="standard"}
On the same chart, apply column dominance first. Which columns can go, and what does that reveal?

:::step{why="Column dominance: if every row of column j also covers column i, column i is redundant."}
Column 9 has rows $\{B'C'\}$; columns 0, 1, 8 have rows $\{B'C', B'D'\}$, $\{B'C', A'C'D\}$, $\{B'C', B'D'\}$, all
supersets. Delete columns 0, 1, 8.
:::

:::step{why="The same test for column 14, whose only row is CD′."}
Columns 2, 6, 10 contain $CD'$ among their rows: delete them too.
:::

:::step{why="Only columns 5, 7, 9, 14 are left; read the chart again."}
Columns 9 and 14 force $B'C'$ and $CD'$; columns 5 and 7 are covered by $A'BD$ alone.
:::

:::answer
The same cover $B'C' + CD' + A'BD$, reached on a chart of four columns instead of ten.
:::
::::

::::example{#ex-coldom-2 level="gate" title="Edge case: column dominance empties a row" depth="standard"}
Reduce the chart of $f = \Sigma m(1, 3, 4, 5, 9, 11, 12, 13)$ (PIs $B'D$, $C'D$, $BC'$) by column dominance alone.

:::step{why="Find columns with fewer rows that sit inside columns with more."}
Column 3: $\{B'D\}$, which is inside column 1 $\{B'D, C'D\}$ and column 9 $\{B'D, C'D\}$: delete 1 and 9. Column 4:
$\{BC'\}$, inside columns 5 and 13 $\{C'D, BC'\}$: delete 5 and 13.
:::

:::step{why="A row with no marks left can never help."}
Columns 3, 4, 11, 12 remain; $C'D$ has no mark in any of them and disappears.
:::

:::answer
$f = B'D + BC'$. Column dominance alone removed the redundant prime implicant.
:::
::::

:::note{#recap-chart title="Recap" depth="quick"}
Chart: rows = PIs, columns = 1-cells. Single-mark columns → essential rows; delete what they cover. Delete
a row whose columns are a subset of a no-costlier row's; delete a column whose rows include another
column's rows.
:::

## Petrick's method

:::intuition{#petrick-intuition title="Write the seating rules as algebra" depth="standard"}
"Guest 5 must sit on bench $b$ or bench $c$" is the Boolean sum $b + c$. Every guest gives one such sum, and
all guests must be seated, so the whole requirement is the AND of the sums. Multiplying it out lists every
way of meeting all requirements at once; absorption throws away plans that contain a smaller plan. What is
left is every cover from which nothing can be removed.
:::

:::theorem{#petrick name="Petrick's method lists every irredundant cover" depth="standard"}
Give each row of the chart a Boolean variable ($p_i = 1$ means "row $i$ is chosen"). For each column
write the sum of the rows covering it; the product of these sums,
$$
\Pi = \prod_{\text{columns } j} \Big(\sum_{i \,:\, i \text{ covers } j} p_i\Big),
$$
is 1 exactly for the sets of rows that cover every column. Multiplying $\Pi$ out into a sum of
products and removing absorbed products ($x + xy = x$) leaves one product per **irredundant** cover; the
cheapest products are the minimal SOPs.
:::

:::proof{#proof-petrick of="Petrick's method" depth="standard"}
**Idea first:** a choice of rows is good iff it makes every column-factor true.

A set $S$ of rows covers column $j$ iff some $p_i$ with $i \in S$ appears in factor $j$, i.e. iff setting
$p_i = 1$ for $i \in S$ (and 0 elsewhere) makes that factor 1. So $\Pi(S) = 1$ iff $S$ covers every column.
When $\Pi$ is expanded, each product is a set of rows that hits every factor (a cover). Absorption
removes a product whenever a proper subset of it is also a product: what remains are the covers from
which no row can be removed, the irredundant ones. Every minimal cover is irredundant, so it is among
them.
:::

:::definition{#count-covers term="Counting minimal covers" depth="standard"}
After the essential rows are taken, tied choices multiply only when they are **independent**: each leftover
column (or group of columns) has its own set of equal-cost rows, and no row serves two different groups.
Then the number of minimal covers is the product of the number of choices per group. When a row serves
several groups the choices interact; expand Petrick's product and count the cheapest terms.

**Sanity check:** $f = \Sigma(0, 1, 5, 10, 11, 12, 13, 15)$ has the EPIs $A'B'C'$, $AB'C$, $ABC'$; then $m_5$ needs
$A'C'D$ or $BC'D$, and $m_{15}$ needs $ACD$ or $ABD$, with no row serving both: $2 \times 2 = 4$ minimal SOPs.
:::

### Worked examples: Petrick's method

::::example{#ex-petrick-easy level="easy" title="Petrick on a tiny chart" depth="quick"}
After the EPIs, a chart has columns 5 and 7, with rows $p = A'C'D$ {5}, $q = A'BD$ {5, 7}, $r = A'BC$ {7}. List
the irredundant covers.

:::step{why="Each column becomes a sum of the rows that cover it, and all must hold at once."}
$\Pi = (p + q)(q + r)$.
:::

:::step{why="Multiply out, then absorb any product containing another (x + xy = x)."}
$\Pi = pq + pr + q + qr = q + pr$.
:::

:::answer
Two irredundant covers: $\{q\}$ (3 literals) and $\{p, r\}$ (6 literals). The minimal one is $q = A'BD$, as row
dominance already said.
:::
::::

::::example{#ex-petrick-count level="medium" title="Counting minimal covers with Petrick" depth="standard"}
$f = \Sigma m(1, 2, 4, 6, 9, 11, 12, 13)$ has EPIs $B'C'D$, $A'CD'$, $AB'D$; the other PIs are
$p = A'BD'$ {4, 6}, $q = BC'D'$ {4, 12}, $r = AC'D$ {9, 13}, $s = ABC'$ {12, 13}. How many minimal SOPs are there?

:::step{why="Only the columns the EPIs leave uncovered matter."}
The EPIs cover 1, 2, 6, 9, 11; columns 4, 12, 13 remain.
:::

:::step{why="One sum per remaining column, all ANDed."}
$\Pi = (p + q)(q + s)(r + s)$.
:::

:::step{why="Expand step by step and absorb."}
$(p + q)(q + s) = q + ps$; then $(q + ps)(r + s) = qr + qs + psr + ps = qr + qs + ps$.
:::

:::answer
Three minimal SOPs (each pair costs 6 literals): EPIs + $\{q, r\}$, EPIs + $\{q, s\}$, EPIs + $\{p, s\}$.
:::
::::

::::example{#ex-chart-petrick level="gate" title="Petrick's method on a cyclic chart" depth="standard"}
$f = \Sigma m(0, 1, 5, 8, 12, 13)$ has six pair-PIs and no EPI. How many minimal SOPs does it have?

:::step{why="Name the rows so the algebra stays short: a = A′B′C′ (0, 1), b = A′C′D (1, 5), c = BC′D (5, 13), d = ABC′ (12, 13), e = AC′D′ (8, 12), g = B′C′D′ (0, 8)."}
Columns: $0: a + g$; $1: a + b$; $5: b + c$; $13: c + d$; $12: d + e$; $8: e + g$.
:::

:::step{why="Pair factors that share a variable first: (x + y)(x + z) = x + yz keeps the expansion small."}
$(a + g)(a + b) = a + bg$, $(b + c)(c + d) = c + bd$, $(d + e)(e + g) = e + dg$.
:::

:::step{why="Multiply the three binomials (eight products) and absorb every product that contains another."}
$\Pi = (a + bg)(c + bd)(e + dg) = ace + acdg + abde + abdg + bceg + bcdg + bdeg + bdg$; the products $abdg$,
$bcdg$ and $bdeg$ contain $bdg$ and are absorbed, leaving $ace + bdg + bceg + acdg + abde$.
:::

:::answer
Five irredundant covers; the two of three rows, $\{a, c, e\}$ and $\{b, d, g\}$ (9 literals each), are the minimal
SOPs: $A'B'C' + BC'D + AC'D'$ and $A'C'D + ABC' + B'C'D'$.
:::
::::

::::example{#ex-chart-irredundant level="gate" title="Edge case: irredundant is not the same as minimal" depth="standard"}
For the same $f = \Sigma m(0, 1, 5, 8, 12, 13)$, show that $B'C'D' + A'C'D + BC'D + AC'D'$ is irredundant but
not minimal.

:::step{why="Irredundant means no term can be dropped: for each term, look for a 1 that only this term covers within the cover."}
Removing $B'C'D'$ loses $m_0$; removing $A'C'D$ loses $m_1$; removing $BC'D$ loses $m_{13}$; removing
$AC'D'$ loses $m_{12}$. So no term can be dropped.
:::

:::step{why="Cost decides minimality: compare literal counts with the cheapest cover."}
Four 3-literal terms, 12 literals, against 9 for the minimal covers.
:::

:::answer
Irredundant ≠ minimal: a cover from which nothing can be removed can still be beaten by a completely
different choice. Petrick's method lists all irredundant covers; you then compare costs.
:::
::::

:::note{#recap-petrick title="Recap" depth="quick"}
Petrick: AND over columns of (OR of rows), expanded and absorbed = all irredundant covers; the cheapest
are minimal. Independent tied choices multiply; interacting ones need the expansion.
:::

## Five- and six-variable maps

:::intuition{#bigmap-intuition title="A stack of transparent maps" depth="standard"}
A fifth variable needs a fifth direction of adjacency, and paper has only two. So draw two ordinary
4-variable maps, one for $A = 0$ and one for $A = 1$, and imagine them printed on transparent sheets laid
on top of each other: a cell and the cell directly beneath it differ only in $A$, so they are neighbours. A
loop that appears in the same place on both sheets drops $A$. Six variables need four sheets, arranged so
that sheets differing in one of the two extra variables lie next to each other.
:::

:::definition{#five-var-map term="The five-variable map" depth="standard"}
For $f(A, B, C, D, E)$, draw two 4-variable maps over $B, C, D, E$ (rows $BC$, columns $DE$): one for $A = 0$
(minterms 0–15) and one for $A = 1$ (minterms 16–31). Two cells are adjacent if they are adjacent inside
one map, **or** if they sit in the **same position** of the two maps (twin cells: they differ only in $A$).
A group may be a legal group in one map, or the same legal group in both maps (then $A$ drops out).
:::

:::definition{#reflected-map term="The reflected (one-sheet) five-variable map" depth="standard"}
Some books draw five variables as a single $4 \times 8$ map whose eight columns carry the 3-bit Gray code
000, 001, 011, 010, 110, 111, 101, 100 (for $A, D, E$). Then the left half is $A = 0$, the right half $A = 1$, and
the twin of a cell is its **mirror image** about the centre line: column 1 ↔ 8, 2 ↔ 7, 3 ↔ 6, 4 ↔ 5. In this
layout the two centre columns (010 and 110) **are** neighbours. Same function, different drawing: always ask
which layout the paper uses.
:::

:::viz{#five-var-viz spec="five-var-map" mode="animate" depth="standard"}
:::

:::definition{#six-var-map term="The six-variable map" depth="standard"}
For six variables use four 4-variable maps over $C, D, E, F$, one for each value of $AB$, arranged like a
2-variable map: $A$ selects the row of maps and $B$ the column. Matching cells of two maps that differ in
exactly one of $A$, $B$ (side by side or one above the other) are adjacent; the diagonally placed maps differ
in both and are not. A group may span 1, 2 or all 4 maps.
:::

:::trap{#trap-five-var-adjacent title="Side by side is not adjacent (in the two-map drawing)" depth="standard"}
When the $A = 0$ and $A = 1$ maps are drawn as **separate** maps side by side, the last column of the first
map touches the first column of the second on the page, but those cells differ in $A$ **and** in $D$ (for
example $m_2 = 00010$ and $m_{16} = 10000$). They are not neighbours; students who loop $\Sigma(2, 6, 16, 20)$ as
one quad answer $B'E'$, which also contains the 0-cells 0, 4, 18, 22. (In the reflected one-sheet layout the
centre columns are adjacent, which is exactly why you must know the layout.)
:::

### Worked examples: five- and six-variable maps

::::example{#ex-5v-easy level="easy" title="A twin pair" depth="quick"}
Minimise $f(A, B, C, D, E) = \Sigma m(3, 19)$.

:::step{why="Cells in the same position of the two maps differ only in A, so they are neighbours."}
$m_3 = 00011$ and $m_{19} = 10011$ both sit at row $BC = 00$, column $DE = 11$.
:::

:::step{why="A pair keeps the four variables that stay fixed; only A changes."}
$B = 0$, $C = 0$, $D = 1$, $E = 1$: $5 - 1 = 4$ literals.
:::

:::answer
$f = B'C'DE$ (the pair drops $A$).
:::
::::

::::example{#ex-5v-medium level="medium" title="Two octets across the maps and a pair inside one" depth="standard"}
Minimise $f = \Sigma m(0, 2, 3, 4, 6, 10, 11, 13, 15, 16, 18, 19, 20, 22, 26, 27)$.

:::step{why="A quad that appears in the same place in both maps is an octet with A free."}
Cells with $B = 0$, $E = 0$ (0, 2, 4, 6 and 16, 18, 20, 22) form the quad $B'E'$ in each map: octet $B'E'$.
:::

:::step{why="The same test for the cells with C = 0, D = 1."}
2, 3, 10, 11 and 18, 19, 26, 27: octet $C'D$.
:::

:::step{why="A cell whose twin is 0 can only be looped inside its own map."}
Remaining: $m_{13}$, $m_{15}$ in the $A = 0$ map; their twins 29, 31 are 0s, so the pair stays in one map: $A'BCE$.
:::

:::answer
$f = B'E' + C'D + A'BCE$ (8 literals).
:::
::::

::::example{#ex-5v-gate level="gate" title="Octets, and a pair whose twin is 0" depth="standard"}
Minimise $f = \Sigma m(0, 2, 7, 8, 10, 11, 14, 15, 16, 18, 24, 26, 27, 30, 31)$.

:::step{why="Look for the same group in both maps first: those give the biggest loops."}
In each map the four corners ($C = 0$, $E = 0$) are 1s, and so are the cells with $B = 1$, $D = 1$: octets $C'E'$ and $BD$.
:::

:::step{why="The leftover cell's twin decides whether its loop can cross maps."}
Remaining: $m_7$ (00111); its twin $m_{23}$ is 0 and its in-map neighbours are 3, 5, 6 (0s) and 15 (1): the pair $A'CDE$.
:::

:::answer
$f = C'E' + BD + A'CDE$ (8 literals). This is the scene in the animation above.
:::
::::

::::example{#ex-5v-edge level="gate" title="Edge case: pairs that only look adjacent" depth="standard"}
Minimise $f = \Sigma m(2, 6, 16, 20)$ (five variables), drawn as two separate maps side by side.

:::step{why="Inside the A = 0 map, cells in the same column and adjacent rows are neighbours."}
$m_2 = 00010$ and $m_6 = 00110$ (column $DE = 10$): the pair $A'B'DE'$.
:::

:::step{why="The same inside the A = 1 map, whose first column sits next to the first map's last column on the page."}
$m_{16} = 10000$ and $m_{20} = 10100$ (column $DE = 00$): the pair $AB'D'E'$.
:::

:::step{why="Twins must be in the same position; these pairs differ in A and in D, so they do not merge."}
No quad: $B'E'$ would also contain 0, 4, 18, 22, which are 0s.
:::

:::answer
$f = A'B'DE' + AB'D'E'$ (8 literals), not $B'E'$.
:::
::::

::::example{#ex-5v-reflected level="gate" title="The same idea on a reflected map" depth="standard"}
On a reflected one-sheet map (columns $ADE$ = 000, 001, 011, 010, 110, 111, 101, 100), where do $m_2$ and $m_{18}$ sit,
and do they combine?

:::step{why="The column label is A D E; the row label is B C."}
$m_2 = 00010$: $A = 0$, $DE = 10$ → column 010 (4th); $m_{18} = 10010$: $A = 1$, $DE = 10$ → column 110 (5th); both in row $BC = 00$.
:::

:::step{why="In the reflected layout the 4th and 5th columns are mirror images, i.e. twins."}
They are side by side and adjacent (they differ only in $A$).
:::

:::answer
They combine into $B'C'DE'$. On this layout the centre columns are neighbours; on the two-map layout the same
cells are a map-width apart.
:::
::::

::::example{#ex-6v level="gate" title="Six variables: a group across two maps" depth="standard"}
Minimise $f(A, B, C, D, E, F) = \Sigma m(0, 1, 16, 17)$.

:::step{why="Decode each minterm into (A, B) and the cell (C, D, E, F)."}
0 = 000000 and 1 = 000001: map $AB = 00$, cells $CDEF = 0000, 0001$. 16 = 010000, 17 = 010001: map $AB = 01$, same two cells.
:::

:::step{why="Maps AB = 00 and 01 differ only in B, so matching cells are adjacent; inside each map the two cells are a pair."}
A pair in each of two neighbouring maps: a group of 4, with $B$ and $F$ free.
:::

:::answer
$f = A'C'D'E'$ (4 literals). With all four maps (for example $\Sigma m(0, 16, 32, 48)$) the group drops both
$A$ and $B$: $C'D'E'F'$.
:::
::::

:::note{#recap-5v title="Recap" depth="quick"}
Five variables: two maps, the same position = neighbour (twins); a group in both maps drops $A$; on a
reflected one-sheet map twins are mirror images. Six variables: four maps in Gray order. Know the layout
before deciding what touches what.
:::

## Variable-entered maps

:::intuition{#vem-intuition title="Fold one variable into the cells" depth="standard"}
A K-map of $n$ variables needs $2^n$ cells. If you keep one variable out of the axes, each cell of the
smaller map has to say what $f$ does for **both** values of that variable: always 0, always 1, equal to
the variable, or equal to its complement. Write that answer in the cell. The map is half the size and
still describes $f$ completely: a **variable-entered map** (VEM).
:::

:::definition{#vem-def term="Variable-entered map" depth="standard"}
Choose an entered variable $x$; the other variables are the map variables. The cell for map values
$v$ holds the residue $f(v, x)$ as a function of $x$:

| $f(v, x = 0)$ | $f(v, x = 1)$ | Cell entry |
|:--|:--|:--|
| 0 | 0 | 0 |
| 1 | 1 | 1 |
| 0 | 1 | $x$ |
| 1 | 0 | $x'$ |
| X | X | X |
| 0 | X | 0 or $x$ (free) |
| X | 0 | 0 or $x'$ (free) |
| 1 | X | 1 or $x$ (free) |
| X | 1 | 1 or $x'$ (free) |

A partly free cell may be used, in each pass below, as whichever entry it allows, or ignored.
:::

:::theorem{#vem-shannon name="A VEM is Shannon expansion" depth="standard"}
For every setting $v$ of the map variables, $f(v, x) = x' f(v, 0) + x f(v, 1)$, and this is 0, 1, $x$ or $x'$
according to the table above. Hence $f = \sum_v m_v(\text{map vars}) \cdot e_v(x)$, where $e_v$ is the entry
of cell $v$.
:::

:::proof{#proof-vem-shannon of="the VEM expansion" depth="standard"}
**Idea first:** split on $x$ (Chapter 2's Shannon expansion), then split on the map variables.

Shannon expansion on $x$ gives $f(v, x) = x' f(v, 0) + x f(v, 1)$. The four possible pairs
$(f(v, 0), f(v, 1))$ give $0$, $x$, $x'$ and $x' + x = 1$. Expanding $f$ over the map variables as a sum of
minterms $m_v$, each multiplied by its residue, gives $f = \sum_v m_v e_v(x)$.
:::

:::definition{#vem-read term="Method: reading a VEM" depth="standard"}
1. **$x$-pass:** loop every $x$-cell, using the 1-cells (and Xs) as don't-cares; AND each loop's term with $x$.
2. **$x'$-pass:** the same for the $x'$-cells; AND each term with $x'$.
3. **Leftover 1s:** a 1-cell inside both an $x$-loop and an $x'$-loop is finished ($x + x' = 1$). Loop only the
   1-cells that are not yet finished, using every 1-cell as a helper, and add those terms as they are.
4. OR everything together.

Doing the plain 1s first (the order some books use) can add a term that the later passes make redundant;
doing them last avoids that.
:::

:::trick{#trick-vem-literals-first title="Entered literals first, plain 1s last" depth="standard"}
Each entered literal gets its own pass in which the 1-cells are free helpers; a 1-cell that both passes
used is already paid for. **Why it works:** a 1-cell is 1 for both values of $x$, so it may join the $x$-loop
or the $x'$-loop without changing anything, and if it joins both it is covered for both values. **When it
fails:** never merge an $x$-cell with an $x'$-cell in one loop (they are 1 for opposite values of $x$); and a
VEM reading, like any loop-by-eye method, is not guaranteed minimal: when in doubt, unfold and check.
:::

:::viz{#vem-viz spec="vem-unfold" mode="animate" depth="standard"}
:::

### Worked examples: variable-entered maps

::::example{#ex-vem-read level="easy" title="Reading a 2 × 2 VEM" depth="quick"}
A VEM for $f(A, B, C)$ has rows $B$, columns $C$ and entered variable $A$, with entries
$(B, C) = (0, 0): 0$, $(0, 1): 1$, $(1, 0): A$, $(1, 1): A'$. Find a minimal SOP.

:::step{why="The A-pass loops each A-cell as large as the 1-cells allow; here no 1-cell touches it."}
The $A$ at $(1, 0)$: its neighbours are $(0, 0) = 0$ and $(1, 1) = A'$, so it stays alone: $A \cdot BC'$.
:::

:::step{why="The A′-pass may use the 1-cell as a helper."}
The $A'$ at $(1, 1)$ joins the 1 at $(0, 1)$ in column $C = 1$: $A' \cdot C$.
:::

:::step{why="The 1-cell is finished only if both passes covered it; here only the A′-pass did."}
The 1 at $(0, 1)$ still needs covering for $A = 1$: loop it alone, $B'C$.
:::

:::answer
$f = ABC' + A'C + B'C$ $= \Sigma m(1, 3, 5, 6)$ (7 literals, minimal).
:::
::::

::::example{#ex-vem-build level="medium" title="Building a VEM from a truth table" depth="standard"}
Make a VEM of $f(A, B, C) = \Sigma m(0, 3, 4, 5, 7)$ with $C$ entered (rows $A$, columns $B$), and read it.

:::step{why="Each cell's entry is the pair (f at C = 0, f at C = 1) read off the truth table."}
(0, 0): $m_0 = 1, m_1 = 0$ → $C'$. (0, 1): $m_2 = 0, m_3 = 1$ → $C$. (1, 0): $m_4 = m_5 = 1$ → 1. (1, 1): $m_6 = 0, m_7 = 1$ → $C$.
:::

:::step{why="Literal passes first: C-cells (0, 1), (1, 1) share the column B = 1; the C′-cell (0, 0) joins the 1 at (1, 0) in the column B = 0."}
$B \cdot C$ and $B' \cdot C'$.
:::

:::step{why="The 1 at (1, 0) was used only by the C′-pass, so it still needs covering for C = 1."}
Loop it alone: $AB'$.
:::

:::answer
$f = BC + B'C' + AB'$ (6 literals). ($AC$ instead of $AB'$ is an equally minimal alternative.)
:::
::::

::::example{#ex-vem-dc level="gate" title="A VEM with don't-cares" depth="standard"}
$f(A, B, C, D) = \Sigma m(1, 3, 4, 5, 13, 15) + d(6, 7)$. Build a VEM with $D$ entered (rows $A$, columns $BC$) and read it.

:::step{why="Each cell is the pair (f at D = 0, f at D = 1) for that A, B, C."}
000: $D$ (m0 = 0, m1 = 1); 001: $D$; 010: 1 (m4 = m5 = 1); 011: X; 100: 0; 101: 0; 110: $D$; 111: $D$.
:::

:::step{why="D-pass: loops of D-cells, with the 1 and the X as helpers."}
000, 001 with 010, 011 make row $A = 0$: $A' \cdot D$; 110, 111 with 010, 011 make the column pair $B$: $B \cdot D$.
:::

:::step{why="There is no D′-cell, so the 1 at 010 is covered for D = 1 only; loop it for D = 0 with the X."}
$A'B$ (010 with 011).
:::

:::answer
$f = A'D + BD + A'B$ (6 literals), the same as the 4-variable map gives.
:::
::::

::::example{#ex-vem-edge level="gate" title="Edge case: x and x′ side by side" depth="standard"}
A VEM for $f(A, B, C)$ (rows $B$, columns $C$, entered $A$) has $(0, 0): A$, $(0, 1): A'$, and 0 in row $B = 1$.
Find $f$.

:::step{why="The A-cell and the A′-cell are adjacent, but they are 1 for opposite values of A, so they cannot share a loop."}
$A$-pass: $(0, 0)$ alone, $B'C'$; $A'$-pass: $(0, 1)$ alone, $B'C$.
:::

:::step{why="AND each loop with its own literal."}
$f = AB'C' + A'B'C = \Sigma m(1, 4)$.
:::

:::answer
$f = AB'C' + A'B'C = B'(A \oplus C)$. Looping the two cells together as if they were 1s would give $B'$,
which is wrong on $m_0$ and $m_5$.
:::
::::

:::note{#recap-vem title="Recap" depth="quick"}
A VEM cell holds the residue (0, 1, $x$, $x'$, or a partly free entry). Read each entered literal in its own
pass with the 1s as don't-cares, then cover the 1-cells not finished by both passes; AND and OR. Never
merge $x$ with $x'$.
:::

## Try it: Quine–McCluskey in the K-map Solver

Set a function on the map tab (or load a preset), then step through its tabulation and the prime-implicant
chart here.

:::lab{#lab-qm lab="kmap-solver" tab="qm" depth="standard"}
:::

## GATE question on this lesson

:::pyq{id="cse-1992-a-1-i" tests="vem-def,vem-read,vem-shannon" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dl-03-03-q01" depth="standard"}
:::

:::practice{id="nx-dl-03-03-q02" depth="standard"}
:::

:::practice{id="nx-dl-03-03-q03" depth="standard"}
:::

:::practice{id="nx-dl-03-03-q04" depth="standard"}
:::

:::practice{id="nx-dl-03-03-q05" depth="standard"}
:::

:::practice{id="nx-dl-03-03-q06" depth="standard"}
:::

:::practice{id="nx-dl-03-03-q07" depth="standard"}
:::

:::practice{id="nx-dl-03-03-q08" depth="standard"}
:::

:::practice{id="nx-dl-03-03-q09" depth="standard"}
:::

:::practice{id="nx-dl-03-03-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Tabulation, charts and larger maps on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Q–M grouping | binary cubes grouped by number of 1s; only neighbouring groups can combine |
| Combining | same dash positions and exactly one other differing bit → dash it; tick both; list each cube once |
| Prime implicants | the cubes never ticked (don't-cares included in the table, PIs of Xs only discarded) |
| PI chart | rows = PIs, columns = 1-cells; single-mark column → essential row |
| Dominance | delete a row whose columns are a subset of a no-costlier row's; delete a column whose rows include another column's |
| Petrick | product over columns of (sum of rows), expanded and absorbed = all irredundant covers |
| 5 / 6 variables | 2 / 4 maps; twin cells (same position) are adjacent; on a reflected one-sheet map twins are mirror images |
| VEM | cell = residue 0, 1, $x$, $x'$ (Shannon); each literal's pass with 1s as helpers, then the unfinished 1s |
:::

:::note{#further-depth title="Further depth: why exact minimisation gets hard" depth="deep"}
Choosing the cheapest set of rows that covers every column is the set-cover problem, which is
NP-hard in general, and the number of prime implicants itself can grow exponentially with the number
of variables. Quine–McCluskey with Petrick's method is exact but can blow up; practical logic
minimisers work with heuristics (expand, reduce, irredundant passes) that usually reach a minimum or
come very close. For GATE-sized functions the exact method in this lesson is quick by hand.
:::
