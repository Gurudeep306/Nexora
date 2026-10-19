---
id: multipliers-booth
subject: dl
chapter: arithmetic-circuits
title: "Array, sequential and Booth multiplier hardware"
order: 4
prerequisites: [adder-subtractor-overflow, multiplication-booth]
pyq_topics: [dl/arithmetic]
est_minutes: 30
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every gate and cell count, critical path, delay and register trace is checked in content/gate-notes/_checks/dl/l4_04_multipliers.py (arithlib array netlists simulated exhaustively and timed; boothlib traces)."
  - "Coverage checklist only (internal digests, never copied): set B pp. 153–154 and 178, set C pp. 291–293, set D pp. 401–402. The array delay is written from textbooks (no set derives it)."
  - "Facts checked against standard textbooks: M. Morris Mano, Computer System Architecture, and Hamacher et al., Computer Organization (array and sequential multipliers, Booth hardware)."
  - "PYQs: src/gate/questions.json (cse-1999-a-21, cse-2003-cs-11); both keys are re-derived in l4_04_multipliers.py from the timed netlists for n = 2 … 8."
updated: "2026-10-19"
---

Multiplying binary numbers is long multiplication with the easiest possible times table: a digit of the
multiplier is 0 or 1, so each **partial product** is either 0 or a copy of the multiplicand, and a copy is
just an AND of every multiplicand bit with that multiplier bit. The hard part is adding the partial
products. This lesson builds the two classic hardware answers. The **array multiplier** lays out every
partial product at once and adds them with a grid of full adders: $n^2$ cells, all working at the same
time, with a delay that grows only **linearly** with $n$ (the fact GATE has asked twice). The
**sequential multiplier** uses one adder $n$ times, shifting between additions, and Booth's algorithm
from [Chapter 1, Lesson 10](lesson:multiplication-booth#booth-recode) is that same datapath with the
adder–subtractor of [Lesson 3](lesson:adder-subtractor-overflow) in place of the adder. We count gates,
trace the critical path cell by cell, prove the $\Theta(n)$ delay, and see why faster trees exist.

## Where this fits

The number-level algorithms (shift-and-add, signed products, Booth and bit-pair recoding, operation
counts) are all in [Chapter 1, Lesson 10](lesson:multiplication-booth); this lesson builds their
hardware. The adders are those of [Lesson 1](lesson:adders-ripple-carry) and
[Lesson 2](lesson:carry-look-ahead), the add/subtract unit is [Lesson 3](lesson:adder-subtractor-overflow)'s,
and the registers and shifting are sequential circuits whose flip-flops are built in Chapter 6. A ROM can
replace the whole multiplier as a lookup table ([Chapter 5, Lesson 5](lesson:rom-pla-pal#multiplier-rom)).

:::table{#radar title="GATE radar: multiplier hardware" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 2 (1999, 2003) |
| Marks | 2 one-mark MCQs |
| Pattern | Order of the worst-case delay of an $n \times n$ array multiplier: $\Theta(n)$ (asked twice) |
| Related PYQs elsewhere | The 8 Booth, recoding and product questions are in [Chapter 1, Lesson 10](lesson:multiplication-booth); multiplier ROM sizes are in [Chapter 5, Lesson 5](lesson:rom-pla-pal) |
| What examiners test | That $n^2$ cells do **not** mean $n^2$ delay (they work in parallel; the longest path crosses $O(n)$ cells); that the array is not logarithmic (that is a Wallace tree); cell and gate counts; the cycles of a sequential/Booth multiplier |
:::

## Partial products and the array

:::intuition{#array-intuition title="Long multiplication on squared paper" depth="standard"}
Write a 4-digit binary multiplication by hand: four rows of partial products, each shifted one column left,
then add them all up. Now imagine that every square of the squared paper is a tiny circuit. The squares that
hold partial-product bits are AND gates (bit of $A$ times bit of $B$). The squares where you add a column are
full adders. Wire them in the same staircase shape as the paper, and the circuit does the whole long
multiplication at once, every square working in parallel. That staircase of cells is the array multiplier.
:::

:::definition{#pp-and term="Partial products are AND gates" depth="standard"}
For unsigned $A = a_{n-1} \dots a_0$ and $B = b_{n-1} \dots b_0$:

$$A \times B = \sum_{i=0}^{n-1} b_i\,A\,2^i = \sum_{i=0}^{n-1}\sum_{j=0}^{n-1} (a_j b_i)\,2^{i+j}.$$

Partial-product bit $(i, j)$ is $a_jb_i$ (one AND gate) with weight $2^{i+j}$. There are $n^2$ of them, and the
product needs $2n$ bits ([Chapter 5, Lesson 5](lesson:rom-pla-pal#product-width)).
:::

:::definition{#array-multiplier term="The array multiplier" depth="standard"}
1. **AND array:** $n^2$ AND gates make every $a_jb_i$ at once.
2. **Row 0** is the first partial product $b_0A$; its lowest bit is $P_0$.
3. **Rows 1 … $n-1$:** row $i$ is an $n$-bit adder that adds partial product $b_iA$ to the upper $n$ bits of
   the running sum (row $i - 1$'s sums shifted one place, plus its carry out). Its lowest sum bit is the product
   bit $P_i$.
4. The last row's other $n - 1$ sums and its carry out are $P_n \dots P_{2n-1}$.

In each row the carry moves **left** (to higher weight) and each sum moves **down** to the next row at the same
weight. The arrangement is the paper's staircase.
:::

:::definition{#array-cost term="Hardware of an n × n array" depth="standard"}
- AND gates: $n^2$ (an $n \times m$ array: $nm$).
- Adder cells: $n - 1$ rows of $n$ cells $= n(n-1)$ ($(n - 1)$ $n$-bit adders). Exactly $n$ cells have a constant-0 input:
  the lowest cell of every row (its carry in is 0) and the top cell of row 1 (its upper input is 0). A trimmed array
  therefore has $n(n - 2)$ full adders and $n$ half adders (2 × 2: 0 FA + 2 HA, as in the easy example below). GATE only
  asks for the order, $\Theta(n^2)$.
- For 4 × 4: 16 AND gates and 12 adder cells (three 4-bit adders). For 8 × 8: 64 AND and 56 cells.
:::

:::viz{#array-viz spec="array-multiplier-grid" mode="animate" depth="standard"}
:::

The animation first makes all partial products (one AND level), then follows the **critical path**: along row 1
by carries, down to row 2 by a sum, along row 2, down, along row 3, and out as $P_7$. Each cell is stamped with
the time the path leaves it. Twelve cells exist, but the path visits only eight, and that number grows like $n$.

:::note{#recap-array title="Recap" depth="quick"}
Partial products = $n^2$ ANDs; $n - 1$ rows of $n$-bit adders add them in a staircase. Carries go left, sums go
down. 4 × 4: 16 AND + 12 cells.
:::

### Worked examples: array structure and cost

::::example{#ex-arr-easy level="easy" title="A 2 × 2 array multiplier" depth="quick"}
Build a 2 × 2 multiplier for $A = a_1a_0$, $B = b_1b_0$ and check $3 \times 3$.

:::step{why="Four partial products, one AND each."}
$a_0b_0$ (weight 1), $a_1b_0$ and $a_0b_1$ (weight 2), $a_1b_1$ (weight 4).
:::

:::step{why="Weight 1 has one bit: P0 = a0b0. Weight 2 adds two bits: a half adder. Its carry and a1b1 form weight 4: another half adder."}
$P_0 = a_0b_0$; $P_1 = a_1b_0 \oplus a_0b_1$, $c = a_1b_0\,a_0b_1$; $P_2 = a_1b_1 \oplus c$, $P_3 = a_1b_1\,c$.
:::

:::answer
4 AND + 2 half adders. $3 \times 3$: all four products are 1, so $P_0 = 1$, $P_1 = 0$ with $c = 1$, $P_2 = 0$,
$P_3 = 1$: $1001 = 9$ ✓.
:::
::::

::::example{#ex-arr-medium level="medium" title="Counting the 4 × 4 array" depth="standard"}
How many AND gates, adder cells and basic gates (full adder = 2 HA + OR = 5 gates) does the 4 × 4 ripple-row array
use?

:::step{why="One AND per partial product."}
$4^2 = 16$ AND gates.
:::

:::step{why="Rows 1 to 3, four cells each."}
$3 \times 4 = 12$ adder cells.
:::

:::step{why="Five gates per full-adder cell."}
$16 + 12 \times 5 = 76$ gates.
:::

:::answer
16 AND gates, 12 cells, 76 gates in all (fewer if the cells with a constant-0 input are trimmed to half adders).
:::
::::

::::example{#ex-arr-gate level="gate" title="An 8 × 8 array" depth="standard"}
How many AND gates and adder cells does an 8 × 8 array multiplier need, and how many product bits does it output?

:::step{why="n² partial products."}
$64$ AND gates.
:::

:::step{why="n − 1 rows of n cells."}
$7 \times 8 = 56$ adder cells.
:::

:::step{why="The product of two n-bit numbers needs 2n bits: 255 × 255 = 65025 < 2¹⁶."}
16 product bits.
:::

:::answer
64 AND gates, 56 adder cells, a 16-bit product. Doubling $n$ from 4 to 8 roughly quadruples the hardware.
:::
::::

::::example{#ex-arr-edge level="gate" title="Edge case: an n × m array" depth="standard"}
A multiplier multiplies a 6-bit $A$ by a 3-bit $B$ with an array (one row per bit of $B$). Count AND gates, adder
rows and product bits.

:::step{why="One partial product per (bit of A, bit of B)."}
$6 \times 3 = 18$ AND gates.
:::

:::step{why="One row per multiplier bit, minus the first: each row is a 6-bit adder."}
$3 - 1 = 2$ rows of 6 cells $= 12$ cells.
:::

:::step{why="Product width = sum of the operand widths: 63 × 7 = 441 < 2⁹."}
$6 + 3 = 9$ product bits.
:::

:::answer
18 AND, 12 cells (2 rows), 9 product bits. Putting the **shorter** operand on the rows minimises the number of
rows, and therefore the delay.
:::
::::

## The delay of the array

:::intuition{#delay-arr-intuition title="Many workers, one long corridor" depth="standard"}
There are $n^2$ cells, but they do not work one after another: they all start as soon as their inputs arrive.
The time is set by the longest **chain** of cells a signal must pass through. A signal can only move left (a carry,
one weight up) or down (a sum, one row down). There are at most $2n$ weights to move across and $n$ rows to move
down, so no chain is longer than about $3n$ cells. The array is a big room with many workers, but the slowest
message only walks a corridor of length $\Theta(n)$.
:::

:::definition{#array-delay term="Critical path of the ripple-row array" depth="standard"}
With unit gate delays (full adders of two half adders and an OR, partial products one AND level), the longest path
of our $n \times n$ ripple-row array is $6(n - 1)$ gate delays: for 4 × 4 it is 18 (the path in the animation: one
AND, then row 1's carry chain, then down and along each later row). The check script measures it on the netlists:
6, 12, 18, 24, 30, 36, 42 for $n = 2 \dots 8$, growing by exactly 6 per extra bit.
:::

:::theorem{#array-delay-theorem name="An n × n array multiplier has Θ(n) delay" depth="standard"}
In the array (ripple rows or carry-save rows, any fixed full-adder design), every input-to-output path passes through
at most $3n$ cells, so the delay is $O(n)$; and some path passes through at least $n - 1$ cells, so the delay is
$\Omega(n)$. Hence $\Theta(n)$, although the array has $\Theta(n^2)$ cells.
:::

:::proof{#proof-array-delay-theorem of="the array delay" depth="standard"}
**Idea first:** give every cell coordinates (row $i$, weight $w = i + j$). Each signal step either keeps the weight and
goes one row down (a sum) or keeps the row and goes one weight up (a carry). Neither coordinate ever decreases.

*Upper bound.* A cell's sum feeds the next row at the same weight; its carry feeds the same row at weight $w + 1$
(in a carry-save array the carry goes to the next row at weight $w + 1$, which only increases both coordinates). So
along any path the row index never decreases and the weight never decreases, and each step increases at least one of
them by 1. Cells have rows 1 … $n - 1$ and weights 1 … $2n - 2$, so a path has at most $(n - 2) + (2n - 3) + 1 < 3n$
cells. Each cell is a constant number of gate delays $d$, plus one AND level at the start: delay $\le 1 + 3nd =
O(n)$.

*Lower bound.* $P_{2n-1}$ is the carry out of row $n - 1$. Each row's adder inputs come only from the partial products and
from the row above, so any path from a row-1 input (for example $a_0b_1$) to $P_{2n-1}$ crosses all $n - 1$ rows, at least one
cell (hence at least one gate) per row. With unit gate delays (the model of GATE 2003) the delay is at least $n - 1$:
$\Omega(n)$. (For our ripple-row netlist the measured worst case is exactly $6(n - 1)$.) ∎
:::

:::trap{#trap-n-squared title="n² cells is not n² delay" depth="standard"}
GATE 1999 and 2003 both offer $O(n^2)$ / $\Theta(n^2)$ as a distractor. That is the **hardware** (cells and gates), not the
**time**: the cells work in parallel and the critical path crosses $O(n)$ of them. $\Theta(\log n)$ is also offered: that
is a Wallace-tree multiplier with a fast final adder, which is not an array. $\Theta(1)$ would need a two-level SOP of every
product bit with unbounded fan-in (exponentially many gates), which no array is. The array's answer is $\Theta(n)$.
:::

:::aside{#csa-array title="Carry-save arrays" depth="deep"}
In the ripple-row array each row is a ripple adder, so its carries run along the row before the next row can finish. A
**carry-save** array does not propagate carries inside a row: each cell's carry goes **down** to the next row (one weight
up), so every row takes one cell delay, and the last row is an ordinary fast adder that merges the leftover carries. The
$n - 1$ rows still take $\Theta(n)$ cell delays, and the final adder is $\Theta(\log n)$ (look-ahead) or $\Theta(n)$ (ripple),
so the total is still $\Theta(n)$, with a smaller constant than the ripple-row array. Same order, different constant: our
4 × 4 carry-save netlist with a ripple final adder takes 13 unit delays against 18, and $5n - 7$ in general.
:::

:::viz{#csa-viz spec="ripple-vs-csa" mode="animate" depth="standard"}
:::

:::aside{#wallace-aside title="Further depth: Wallace and Dadda trees" depth="deep"}
A full adder takes three bits of one weight and returns two bits (one of the same weight, one of the next): it reduces three
rows to two. A **Wallace tree** applies this to all partial-product rows in parallel, so $n$ rows shrink to two in about
$\log_{3/2} n$ layers, and a fast (carry look-ahead) adder adds the final two rows in $\Theta(\log n)$. Total delay
$\Theta(\log n)$, at the cost of an irregular wiring pattern. That is why "array multiplier" ($\Theta(n)$) and "tree multiplier"
($\Theta(\log n)$) are different answers.
:::

:::note{#recap-delay-arr title="Recap" depth="quick"}
Paths move left or down, never back: $O(n)$ cells, and at least $n - 1$: $\Theta(n)$ delay. Ripple-row array: $6(n - 1)$ unit
gates (4 × 4: 18). Hardware is $\Theta(n^2)$. Trees reach $\Theta(\log n)$.
:::

### Worked examples: array delay

::::example{#ex-del-easy level="easy" title="The 4 × 4 critical path" depth="quick"}
Unit gates, full adder = 2 HA + OR. What is the worst-case delay of the 4 × 4 ripple-row array, and which product bit is
last?

:::step{why="Row 1: the first cell's carry needs its p (AND at 1, XOR at 2), then AND and OR: 4; each later carry +2."}
Row 1 carries leave its cells at 4, 6, 8; its top cell's sum (one XOR after the carry at 8) at 9.
:::

:::step{why="Each later row repeats the pattern: a sum dropped from above enters, a carry ripples one cell, a sum drops again."}
The path leaves the cells at 4, 6, 8, 9, 12, 13, 16, 18.
:::

:::answer
18 gate delays; the last bit is $P_7$, the final carry. Formula $6(n - 1) = 18$.
:::
::::

::::example{#ex-del-medium level="medium" title="How the delay grows" depth="standard"}
Using the measured critical paths for $n = 2, 3, 4, 8$, decide whether the delay grows like $n$ or $n^2$.

:::step{why="Read the values from the definition."}
$n = 2 \to 6$, $3 \to 12$, $4 \to 18$, $8 \to 42$.
:::

:::step{why="Differences are constant (6 per extra bit), the signature of a linear function; n² would give growing differences."}
$6(n - 1)$ fits every value.
:::

:::answer
Linear: doubling $n$ from 4 to 8 multiplies the hardware by about 4.7 (12 → 56 cells; $n(n - 1)$ tends to ×4) but the delay by only $42/18 \approx 2.3$.
:::
::::

::::example{#ex-del-gate level="gate" title="From 16 × 16 to 64 × 64: hardware vs delay" depth="standard"}
A 16 × 16 ripple-row array multiplier is scaled to 64 × 64 (same cell design, unit gates). By what factor do the AND gates,
the adder cells and the worst-case delay grow?

:::step{why="AND gates are n²."}
$64^2 / 16^2 = 4096 / 256 = 16$.
:::

:::step{why="Adder cells are n(n − 1)."}
$64 \cdot 63 / (16 \cdot 15) = 4032 / 240 = 16.8$.
:::

:::step{why="The delay is 6(n − 1)."}
$6 \cdot 63 / (6 \cdot 15) = 378 / 90 = 4.2$.
:::

:::answer
Hardware about ×16 (quadratic), delay about ×4 (linear). This is the whole content of "array multiplier: $\Theta(n)$ delay":
the gate count and the delay grow at different orders.
:::
::::

::::example{#ex-del-edge level="gate" title="Edge case: a carry-save array with a look-ahead final adder" depth="standard"}
An $n \times n$ carry-save array has $n - 1$ rows of one cell delay each, followed by a $2n$-bit carry look-ahead adder of
delay $c \log n$. What is the order of the total delay?

:::step{why="The rows are in series: each needs the previous row's sums and carries."}
Rows: $\Theta(n)$.
:::

:::step{why="The final adder is faster than the rows."}
Final adder: $\Theta(\log n)$.
:::

:::answer
$\Theta(n) + \Theta(\log n) = \Theta(n)$. A fast final adder does not change the order; only a tree reduction (Wallace)
removes the $n$ rows.
:::
::::

## Sequential multipliers

:::intuition{#seq-intuition title="One adder, used n times" depth="standard"}
The array spends $n^2$ cells to finish in $\Theta(n)$ time. The opposite choice is one $n$-bit adder and $n$ clock cycles:
look at one multiplier bit per cycle, add the multiplicand into an accumulator if the bit is 1, then shift everything right
by one place so the next bit comes into view. It is long multiplication done one row per tick, exactly the shift-and-add
algorithm of [Chapter 1, Lesson 10](lesson:multiplication-booth), now in registers.
:::

:::definition{#sequential-multiplier term="Sequential (shift-and-add) multiplier" depth="standard"}
Registers: **M** (multiplicand, $n$ bits), **A** (accumulator, $n$ bits, cleared), **Q** (multiplier, $n$ bits), and a carry
flip-flop **C**. Each of $n$ cycles:

1. If $Q_0 = 1$: $C\,A \leftarrow A + M$ (one $n$-bit addition).
2. Shift $C\,A\,Q$ right by one bit (Q's old $Q_0$ falls out; A's low bit moves into Q's top).

After $n$ cycles $A\,Q$ holds the $2n$-bit product. Hardware: one $n$-bit adder, three registers and a counter. Time: $n$
cycles, each one adder delay, i.e. $\Theta(n) \times$ (adder delay): $\Theta(n^2)$ gate delays with a ripple adder.
:::

:::viz{#seq-viz spec="seq-multiplier" mode="animate" depth="standard"}
:::

:::theorem{#seq-invariant name="After n cycles A Q holds the product" depth="standard"}
For unsigned $n$-bit $M$ and $Q = q_{n-1} \dots q_0$, let $T_k$ be the top $k$ bits of the Q register after $k$ cycles (the bits
shifted in from A). Then after $k$ cycles $\;A \cdot 2^k + T_k = M \times (q_{k-1} \dots q_0)_2$. In particular, after $n$ cycles
$A \cdot 2^n + Q = M \times Q$: the pair $A\,Q$ is the $2n$-bit product.
:::

:::proof{#proof-seq-invariant of="the shift-and-add invariant" depth="standard"}
**Idea first:** each cycle adds the next partial product into A and then shifts, which halves A while saving its low bit in Q,
so the value "A scaled up plus the saved bits" never loses anything.

Induction on $k$. For $k = 0$: $A = 0$, $T_0$ is empty, and the product of no multiplier bits is 0. ✓

Suppose $A \cdot 2^k + T_k = M \cdot (q_{k-1} \dots q_0)$ before cycle $k + 1$. The bit in $Q_0$ is now $q_k$ (the lowest unused one). The
cycle first sets $C\,A \leftarrow A + q_kM$ (C keeps the carry, so nothing is lost): the value becomes
$(A + q_kM)\,2^k + T_k = M \cdot (q_k \dots q_0)$. The shift then replaces $C\,A$ by $\lfloor C\,A / 2 \rfloor$ and puts its low bit on top of
$T_k$, giving $T_{k+1} = (C\,A \bmod 2)\,2^k + T_k$; so $\lfloor C\,A/2 \rfloor \cdot 2^{k+1} + T_{k+1} = C\,A \cdot 2^k + T_k$, the same value. ✓

After $n$ cycles $T_n$ is the whole Q register: $A \cdot 2^n + Q = M \times Q$. The check script also verifies the trace against
integer multiplication for every 4-bit $M$ and $Q$. ∎
:::

:::trap{#trap-seq-cycles title="The cycle count is n, not the number of 1s or 2n" depth="standard"}
The simple datapath spends one cycle on **every** multiplier bit, 0 or 1; only the number of additions depends on the 1s.
Answering "2n cycles" confuses the product width with the cycle count, and "number of 1s cycles" confuses cycles with
additions (a datapath that skips 0s needs extra control and variable timing).
:::

:::note{#recap-seq title="Recap" depth="quick"}
Sequential: one adder, $n$ cycles; add M when $Q_0 = 1$, then shift C A Q right; C catches the adder's carry. Additions = number
of 1s in Q; cycles = $n$.
:::

### Worked examples: sequential multiplier

::::example{#ex-seq-easy level="easy" title="A 4-bit shift-and-add trace" depth="quick"}
Trace the sequential multiplier for $M = 1011$ (11) and $Q = 0101$ (5).

:::step{why="Cycle 1: Q0 = 1, add M, then shift C A Q right."}
$A = 1011$, shift: $A\,Q = 0101\,1010$.
:::

:::step{why="Cycle 2: Q0 = 0, only shift."}
$A\,Q = 0010\,1101$.
:::

:::step{why="Cycle 3: Q0 = 1, add: 0010 + 1011 = 1101; shift."}
$A\,Q = 0110\,1110$.
:::

:::step{why="Cycle 4: Q0 = 0, only shift."}
$A\,Q = 0011\,0111$.
:::

:::answer
$A\,Q = 0011\,0111 = 55 = 11 \times 5$ ✓, after 4 cycles and 2 additions.
:::
::::

::::example{#ex-seq-medium level="medium" title="15 × 13: the carry flip-flop at work" depth="standard"}
Trace $M = 1111$ (15), $Q = 1101$ (13).

:::step{why="Cycle 1: Q0 = 1: C A = 0 + 1111; shift."}
$C\,A = 0\,1111$, shift: $A\,Q = 0111\,1110$.
:::

:::step{why="Cycle 2: Q0 = 0: only shift."}
$A\,Q = 0011\,1111$.
:::

:::step{why="Cycle 3: Q0 = 1: 0011 + 1111 = 1 0010, so C = 1; the shift moves C into A's top."}
$C\,A = 1\,0010$, shift: $A\,Q = 1001\,0111$.
:::

:::step{why="Cycle 4: Q0 = 1: 1001 + 1111 = 1 1000, C = 1 again; shift."}
$C\,A = 1\,1000$, shift: $A\,Q = 1100\,0011$.
:::

:::answer
$A\,Q = 1100\,0011 = 195 = 15 \times 13$ ✓. Without the carry flip-flop the 5th bit of cycles 3 and 4 would be lost. The animation
above plays this trace.
:::
::::

::::example{#ex-seq-gate level="gate" title="A 16-bit multiplier with Q = 0x00FF" depth="standard"}
A 16-bit sequential multiplier multiplies by $Q = 0000\,0000\,1111\,1111$. How many cycles and how many additions?

:::step{why="One cycle per multiplier bit."}
16 cycles.
:::

:::step{why="One addition per 1 in Q."}
8 additions (the low eight bits), 8 shift-only cycles.
:::

:::answer
16 cycles, 8 additions. (Booth would need 2 operations here: $-M$ at bit 0 and $+M$ at bit 8.)
:::
::::

::::example{#ex-seq-edge level="gate" title="Edge case: Q = 0" depth="standard"}
What does the sequential multiplier do with $Q = 0$, and does it finish early?

:::step{why="Every cycle sees Q0 = 0."}
No additions; A stays 0; each cycle only shifts.
:::

:::step{why="The controller is a counter of n cycles; it does not look at the remaining bits."}
All $n$ cycles run; after the last shift $A\,Q = 0000\,0000$.
:::

:::answer
It still takes all $n$ cycles (the simple controller counts cycles, not 1s) and ends with $A\,Q = 0$. Early termination needs a
"remaining bits are zero" detector, which simple datapaths do not have.
:::
::::

## Booth multiplier hardware

:::intuition{#booth-hw-intuition title="The same datapath, with a subtract button" depth="standard"}
Booth's recoding replaces each run of 1s in the multiplier by "subtract at the start, add after the end"
([Chapter 1, Lesson 10](lesson:multiplication-booth#booth-recode)). In hardware that means the sequential multiplier's adder
must also subtract (the adder–subtractor of Lesson 3), and the controller must see where runs start and end: it looks at two
bits, the current $Q_0$ and the bit that just left, saved in a flip-flop $Q_{-1}$. Everything else, the registers and the
shifting, stays the same; the shift becomes arithmetic because the numbers are signed.
:::

:::definition{#booth-hardware term="Booth multiplier hardware" depth="standard"}
Booth's algorithm ([Chapter 1, Lesson 10](lesson:multiplication-booth#booth-algorithm)) runs on almost the same datapath:

- Registers **M**, **A** (cleared, **$n + 1$ bits**), **Q** (multiplier) and one extra flip-flop **$Q_{-1}$** (cleared).
- The adder becomes the **adder–subtractor** of [Lesson 3](lesson:adder-subtractor-overflow#adder-subtractor), with its
  control $K$ driven by the pair $Q_0Q_{-1}$.
- Each of $n$ cycles: $Q_0Q_{-1} = 10$: $A \leftarrow A - M$; $= 01$: $A \leftarrow A + M$; $= 00$ or $11$: no addition. Then an
  **arithmetic** right shift of $A\,Q\,Q_{-1}$ (A's sign bit is copied into itself).

After $n$ cycles $A\,Q$ (low $2n$ bits) is the signed product. The number of add/subtract operations equals the number of
non-zero Booth digits ([Chapter 1, Lesson 10](lesson:multiplication-booth#booth-count)), but the number of **cycles** is
always $n$ in this simple datapath.
:::

:::viz{#booth-viz spec="booth-datapath" mode="animate" depth="standard"}
:::

:::trap{#trap-booth-extra-bit title="Why A needs one extra bit" depth="standard"}
With an $n$-bit A, the subtraction $A - M$ overflows when $M = -2^{n-1}$ (for example $M = 1000$ in 4 bits: $-M = +8$ does not fit),
and the arithmetic shift would then copy a wrong sign bit. So A and the adder–subtractor get one extra bit, and M is
sign-extended into it. With an $n$-bit A only $M = -2^{n-1}$ fails (checked exhaustively for $n = 4, 5, 6$); compare
[Chapter 1, Lesson 10](lesson:multiplication-booth#ex-booth-min), whose 4-bit traces never meet $M = -8$. Radix-4 hardware, which
can add $\pm 2M$, needs $n + 2$ bits.
:::

:::note{#recap-booth-hw title="Recap" depth="quick"}
Booth hardware: adder–subtractor driven by $Q_0Q_{-1}$ (10: $-M$, 01: $+M$), arithmetic shift of A Q $Q_{-1}$, A of $n + 1$ bits,
$n$ cycles, at most $n$ operations.
:::

### Worked examples: Booth hardware

::::example{#ex-booth-easy level="easy" title="Which operation in each cycle for Q = 0110?" depth="quick"}
A 4-bit Booth datapath multiplies by $Q = 0110$ (6). List the action of each cycle.

:::step{why="The pair Q0 Q−1 walks up the multiplier, starting with Q−1 = 0."}
Cycle 1: $q_0q_{-1} = 00$: none. Cycle 2: $q_1q_0 = 10$: $-M$.
:::

:::step{why="Continue up the bits: 11 is inside the run, 01 is just after it."}
Cycle 3: $q_2q_1 = 11$: none. Cycle 4: $q_3q_2 = 01$: $+M$.
:::

:::answer
none, $-M$, none, $+M$: the run of 1s at bits 1–2 costs one subtraction and one addition, and $-2M + 8M = 6M$ ✓.
:::
::::

::::example{#ex-booth-medium level="medium" title="Booth hardware for 6 × (−3)" depth="standard"}
$M = 0110$, $Q = 1101$, 4 bits (A has 5 bits). Give each cycle's action and the final product.

:::step{why="Cycle 1: Q0 Q−1 = 10: subtract M (A = −6), then shift."}
$A = 11010 \to$ shift: $A = 11101$, $Q = 0110$, $Q_{-1} = 1$.
:::

:::step{why="Cycle 2: Q0 Q−1 = 01: add M, then shift."}
$A = 00011 \to$ shift: $A = 00001$, $Q = 1011$, $Q_{-1} = 0$.
:::

:::step{why="Cycle 3: 10: subtract M, then shift."}
$A = 11011 \to$ shift: $A = 11101$, $Q = 1101$, $Q_{-1} = 1$.
:::

:::step{why="Cycle 4: 11: no addition, only shift."}
$A = 11110$, $Q = 1110$, $Q_{-1} = 1$.
:::

:::answer
Low 8 bits of $A\,Q$: $1110\,1110 = -18 = 6 \times (-3)$ ✓. Three add/subtract operations (the Booth digits of 1101 are $0\,{-1}\,{+1}\,{-1}$).
:::
::::

::::example{#ex-booth-gate level="gate" title="Cycles and operations for an 8-bit Booth multiplier" depth="standard"}
An 8-bit Booth datapath multiplies by $Q = 0011\,1100$. How many cycles, and how many add/subtract operations?

:::step{why="This datapath always runs n cycles."}
8 cycles.
:::

:::step{why="An operation happens at each boundary of a run of 1s (Q0 Q−1 = 10 or 01), scanning with Q−1 = 0."}
$0011\,1100$ has one run of 1s (bits 2–5): a subtract at its start (bit 2) and an add after its end (bit 6): 2 operations.
:::

:::answer
8 cycles, 2 operations (one subtraction, one addition), versus 4 additions for plain shift-and-add.
:::
::::

::::example{#ex-booth-edge level="gate" title="Edge case: M = −8 in a 4-bit Booth datapath" depth="standard"}
$M = 1000$ ($-8$), $Q = 0001$ (1). Show what goes wrong if A has only 4 bits, and that 5 bits fix it.

:::step{why="Cycle 1: Q0 Q−1 = 10, so A ← A − M = 0 − (−8) = +8."}
In 4 bits, $+8$ wraps to $1000 = -8$; the arithmetic shift copies a 1: $A = 1100$.
:::

:::step{why="With 5 bits, +8 = 01000 fits; the shift copies a 0."}
$A = 00100$, $Q = 0000$, $Q_{-1} = 1$.
:::

:::step{why="Cycle 2: Q0 Q−1 = 01: A ← A + M = 00100 + 11000 = 11100, shift: 11110; cycles 3–4: 00, only shifts."}
Final low 8 bits: $1111\,1000 = -8$ ✓ (with 4-bit A the result comes out as $+8$, wrong sign).
:::

:::answer
The 4-bit accumulator overflows on $-M$ when $M = -2^{n-1}$. The extra bit (or sign-extending M) is required for correctness.
:::
::::

## Bit-pair (radix-4) hardware

:::intuition{#bitpair-hw-intuition title="Two bits per cycle" depth="standard"}
Bit-pair recoding turns every two multiplier bits into one radix-4 digit in $\{-2, -1, 0, 1, 2\}$
([Chapter 1, Lesson 10](lesson:multiplication-booth#bitpair)). The datapath then handles two bits per cycle: it adds $0$, $\pm M$ or
$\pm 2M$ and shifts by two. Since $2M$ is just $M$ shifted one place, the only new hardware is a 2-way choice between $M$ and $2M$
in front of the adder–subtractor.
:::

:::definition{#bitpair-hardware term="Bit-pair (radix-4) hardware" depth="standard"}
Bit-pair recoding ([Chapter 1, Lesson 10](lesson:multiplication-booth#bitpair)) looks at three bits $Q_1Q_0Q_{-1}$ per cycle and adds one
of $0, \pm M, \pm 2M$ before an **arithmetic** shift by **two** places. $2M$ is $M$ shifted left one place (just wiring), so the
datapath needs a 2:1 choice of $M$ or $2M$ in front of the adder–subtractor, a "skip" for the digit 0, and $K$ driven by the digit's
sign. It finishes in $n/2$ cycles instead of $n$, and A needs **two** extra bits ($-2M$ with $M = -2^{n-1}$ is $+2^n$).
:::

### Worked examples: bit-pair hardware

::::example{#ex-bp-easy level="easy" title="The radix-4 digits of Q = 1101" depth="quick"}
Recode the 4-bit multiplier $Q = 1101$ ($-3$) into bit-pair digits.

:::step{why="Low pair: bits q1 q0 with q−1 = 0: (0, 1, 0)."}
Digit $+1$.
:::

:::step{why="High pair: bits q3 q2 with q1 = 0: (1, 1, 0)."}
Digit $-1$.
:::

:::answer
Digits $(-1, +1)$: $-1 \cdot 4 + 1 = -3$ ✓. Two cycles instead of four.
:::
::::

::::example{#ex-bp-medium level="medium" title="6 × (−3) in two radix-4 cycles" depth="standard"}
With $M = 6$, use the digits $(-1, +1)$ of $Q = -3$ and a 6-bit accumulator.

:::step{why="Cycle 1: digit +1: A ← A + M, then shift A Q right by 2."}
$A = 000110 \to$ shift: $A = 000001$, $Q = 1011$.
:::

:::step{why="Cycle 2: digit −1: A ← A − M = 000001 − 000110 = 111011, then shift by 2."}
$A = 111110$, $Q = 1110$.
:::

:::answer
Low 8 bits of $A\,Q$: $1110\,1110 = -18$ ✓, in two cycles and two operations (radix 2 needed four cycles and three operations).
:::
::::

::::example{#ex-bp-gate level="gate" title="Cycles for a 16-bit bit-pair multiplier" depth="standard"}
How many cycles does a 16-bit radix-4 Booth multiplier need, and what is the most additions/subtractions it can do?

:::step{why="Two multiplier bits per cycle."}
$16 / 2 = 8$ cycles.
:::

:::step{why="At most one operation per digit."}
At most 8 operations.
:::

:::answer
8 cycles, at most 8 operations (radix 2: 16 cycles, up to 16 operations).
:::
::::

::::example{#ex-bp-edge level="gate" title="Edge case: M = −8 needs n + 2 bits" depth="standard"}
4-bit radix-4 hardware with $M = -8$. Why does a 5-bit accumulator fail for some $Q$, while 6 bits always work?

:::step{why="A digit −2 subtracts 2M = −16, i.e. adds +16."}
$+16$ needs 6 bits in two's complement ($-32 \dots 31$); a 5-bit A ($-16 \dots 15$) wraps it to $-16$.
:::

:::step{why="Exhaustive check over all M, Q."}
With 5 bits, 5 of the 256 products come out wrong, all with $M = -8$; with 6 bits none do.
:::

:::answer
Radix-4 hardware needs $n + 2$ accumulator bits, one more than radix 2, because it can add $\pm 2M$.
:::
::::

:::table{#multiplier-compare title="Multipliers compared (n × n bits)" depth="standard"}
| Design | Hardware | Delay / time |
|:--|:--|:--|
| Sequential shift-and-add | 1 $n$-bit adder + registers | $n$ cycles |
| Booth (radix 2) | 1 adder–subtractor + registers + $Q_{-1}$ | $n$ cycles (at most $n$ add/subtracts) |
| Bit-pair (radix 4) | + a $\times 2$ choice | $n/2$ cycles |
| Array (ripple or carry-save rows) | $n^2$ AND + $n(n - 1)$ cells | $\Theta(n)$ gate delays |
| Wallace / Dadda tree | $\approx n^2$ cells, irregular | $\Theta(\log n)$ gate delays |
| ROM lookup | $2^{2n} \times 2n$ bits | one memory access |
:::

## Try it

The multiplier's rows are adders: open the Adder Race of [Lesson 2](lesson:carry-look-ahead#lab-scaling) and compare a 16-bit
ripple adder with a look-ahead one; a carry-save array replaces every row but the last by one cell delay, and the last row is
exactly where a fast adder pays off.

## GATE questions on this lesson

:::pyq{id="cse-1999-a-21" tests="array-delay,array-delay-theorem,trap-n-squared" depth="standard"}
:::

:::pyq{id="cse-2003-cs-11" tests="array-delay,array-multiplier,trap-n-squared" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dl-04-04-q01" depth="standard"}
:::

:::practice{id="nx-dl-04-04-q02" depth="standard"}
:::

:::practice{id="nx-dl-04-04-q03" depth="standard"}
:::

:::practice{id="nx-dl-04-04-q04" depth="standard"}
:::

:::practice{id="nx-dl-04-04-q05" depth="standard"}
:::

:::practice{id="nx-dl-04-04-q06" depth="standard"}
:::

:::practice{id="nx-dl-04-04-q07" depth="standard"}
:::

:::practice{id="nx-dl-04-04-q08" depth="standard"}
:::

:::practice{id="nx-dl-04-04-q09" depth="standard"}
:::

:::practice{id="nx-dl-04-04-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Multiplier hardware on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Partial products | $a_jb_i$, one AND each, weight $2^{i+j}$; $n^2$ of them; product $2n$ bits |
| Array | $n - 1$ rows of $n$-bit adders in a staircase; $n^2$ AND + $n(n-1)$ cells (4 × 4: 16 + 12; 8 × 8: 64 + 56) |
| Array delay | paths move left or down: $\Theta(n)$ (ripple rows: $6(n - 1)$ unit gates; 4 × 4: 18), not $\Theta(n^2)$ (GATE 1999, 2003) |
| Faster | carry-save rows: still $\Theta(n)$; Wallace tree + fast adder: $\Theta(\log n)$ |
| Sequential | registers C, A, Q, M; add M if $Q_0 = 1$, shift right; $n$ cycles |
| Booth hardware | adder–subtractor controlled by $Q_0Q_{-1}$ (10: −M, 01: +M); arithmetic shift; A has $n + 1$ bits; $n$ cycles |
| Bit pair | $0, \pm M, \pm 2M$ per cycle, shift 2: $n/2$ cycles |
:::
