---
id: adders-ripple-carry
subject: dl
chapter: arithmetic-circuits
title: "Half/full adders, subtractors and ripple-carry adders"
order: 1
prerequisites: [xor-and-operators, code-arithmetic]
pyq_topics: [dl/arithmetic, dl/combinational]
est_minutes: 55
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every gate count, delay, settling time and pipeline output is checked in content/gate-notes/_checks/dl/l4_01_ripple.py (arithlib netlists simulated against integer arithmetic, arrival times, transport-delay simulation)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 48–59, set B pp. 129–131 and 133, set C pp. 279–288, set D pp. 400–401, set E pp. 408–409."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (half and full adders and subtractors, the binary adder and its carry propagation)."
  - "PYQs: src/gate/questions.json (cse-1999-a-41, cse-2002-b-56-a/b, cse-2015-2-cs-48, cse-2016-2-cs-7), keys re-derived in l4_01_ripple.py; cse-2015-2-cs-48's key 19.2 is the block model (the gate-level path is 12 µs; both are taught)."
updated: "2026-10-19"
---

Every processor spends most of its arithmetic time adding. In [Chapter 1, Lesson 9](lesson:code-arithmetic)
you learned to add binary numbers on paper, column by column, carrying a 1 to the left when a column
overflows. This chapter builds the **hardware** that does exactly that. We start with the smallest
pieces, the **half adder** (one column, two bits) and the **full adder** (one column, two bits and an
incoming carry), and we design both the way every combinational circuit is designed: from a truth
table. Then we chain full adders into a **ripple-carry adder**, the circuit that literally does the
paper method, and we ask the question GATE asks most often about it: **how long does it take?** The
answer depends on how you count delays, and GATE has used four different counting conventions, so
the second half of the lesson is about delay models, the slowest possible inputs, and pipelining.

## Where this fits

The number-level rules (binary addition, two's complement, overflow) are all in
[Chapter 1, Lesson 9](lesson:code-arithmetic); here we only build circuits that obey them. The gates
come from [Chapter 2](lesson:logic-gates), especially the XOR of
[Chapter 2, Lesson 3](lesson:xor-and-operators), and the minimisation from
[Chapter 3](lesson:kmaps). The next lesson speeds the adder up with **carry look-ahead**,
Lesson 3 turns it into an adder–subtractor with overflow flags and a
BCD adder, and Lesson 4 builds multipliers out of rows of adders.

:::table{#radar title="GATE radar: adders, subtractors and ripple carry" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 5 (1999, 2002 two parts, 2015, 2016) |
| Marks | 1 one-mark NAT (2016), 1 two-mark NAT (2015), 1 two-mark MSQ (1999), 2 descriptive parts (2002) |
| Pattern 1 | Counting half and full adders for an n-bit adder: 1999 |
| Pattern 2 | Total delay of a ripple-carry adder under a stated delay model: 2015 |
| Pattern 3 | Which operands make the carry ripple the longest: 2016 |
| Pattern 4 | Tracing a pipelined (registered) adder clock by clock: 2002 |
| What examiners test | The full adder built from two half adders; reading the delay convention exactly as stated (gate-level vs a full adder counted as a block); that a carry chain is longest when one stage generates and every stage above propagates; latency vs throughput of a pipeline |
:::

## The half adder

:::intuition{#adder-intuition title="One column of school addition is a tiny truth table" depth="standard"}
When you add two binary numbers by hand, you never think about the whole number at once. You look at
**one column**: two digits, maybe a carry from the right, and you write down one digit and maybe carry
one to the left. That column rule has only a handful of cases (0 + 0, 0 + 1, 1 + 0, 1 + 1, and the
same with a carry in), so it fits in a truth table of four or eight rows. A truth table is exactly what
the design procedure turns into gates. So an adder circuit is just the column rule built once in gates
and then copied once per column. The **half adder** is the rightmost column, which never receives a
carry; the **full adder** is every other column.
:::

Designing a combinational circuit always follows the same moves (we use them in this whole chapter, and
[Chapter 5, Lesson 1](lesson:combinational-design#design-procedure) states them in general): say what
the inputs and outputs mean, write the truth table, read or minimise one expression per output, and
draw the gates. The half adder is the classic first example.

:::definition{#half-adder term="Half adder" depth="standard"}
A **half adder** (HA) adds two bits $A$ and $B$. The sum $A + B$ is 0, 1 or 2, which needs two output
bits: the **sum bit** $S$ (weight 1) and the **carry bit** $C$ (weight 2), with $A + B = 2C + S$.

| $A$ | $B$ | $A + B$ | $C$ | $S$ |
|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 0 | 0 | 0 |
| 0 | 1 | 1 | 0 | 1 |
| 1 | 0 | 1 | 0 | 1 |
| 1 | 1 | 2 | 1 | 0 |

$$S = A \oplus B, \qquad C = A\,B.$$

Two gates: one XOR and one AND. It is called "half" because it cannot accept a carry from a lower
column, so on its own it can only add the least significant column of a sum.
:::

:::derivation{#ha-derivation of="the half-adder equations" depth="standard"}
**S column.** $S = 1$ on rows 01 and 10 only: $S = \bar A B + A \bar B$. These two minterms are
diagonal on a 2-variable map, so they cannot be grouped; the expression is already minimal as an SOP,
and it is exactly the definition of XOR, $S = A \oplus B$. **Why XOR is the right idea:** XOR is the
parity of the number of 1s, and the sum bit of a column is precisely "is the column total odd?".

**C column.** $C = 1$ only on row 11: $C = AB$. **Why:** the total reaches 2, the value of the next
column, only when both bits are 1.

**Sanity check.** Row 11: $2C + S = 2 \cdot 1 + 0 = 2 = 1 + 1$ ✓. Row 01: $2 \cdot 0 + 1 = 1$ ✓.
:::

:::viz{#half-adder-design-viz spec="half-adder-design" mode="animate" depth="standard"}
:::

The animation fills the two output columns, reads one equation from each, and then drives the XOR and
AND gates with each of the four rows. Notice that the circuit never "computes 1 + 1 = 2": it computes two
independent Boolean functions whose bits, read together as $CS$, happen to spell the binary sum.

:::note{#recap-ha title="Recap" depth="quick"}
Half adder: $S = A \oplus B$ (parity of the column), $C = AB$ (both 1). Two gates, no carry in.
:::

## The full adder

:::intuition{#fa-intuition title="Three coins in a column" depth="standard"}
Every column except the rightmost receives a carry, so a column really adds **three** bits: $A$, $B$ and
the carry in $C_{in}$. Think of three coins of the same value: the total is 0, 1, 2 or 3 coins. The sum
bit says whether one coin is left over (odd total), and the carry says whether you have at least one
pair to pass to the next column (total 2 or 3). "At least two of three" is the **majority** function you
met in [Chapter 3](lesson:kmaps), and "odd number of 1s" is a three-input XOR. That is the whole full
adder.
:::

:::definition{#full-adder term="Full adder" depth="standard"}
A **full adder** (FA) adds three bits $A$, $B$, $C_{in}$ and produces $S$ (weight 1) and $C_{out}$
(weight 2) with $A + B + C_{in} = 2C_{out} + S$.

| $A$ | $B$ | $C_{in}$ | total | $C_{out}$ | $S$ |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | 0 | 1 | 1 | 0 | 1 |
| 0 | 1 | 0 | 1 | 0 | 1 |
| 0 | 1 | 1 | 2 | 1 | 0 |
| 1 | 0 | 0 | 1 | 0 | 1 |
| 1 | 0 | 1 | 2 | 1 | 0 |
| 1 | 1 | 0 | 2 | 1 | 0 |
| 1 | 1 | 1 | 3 | 1 | 1 |

$S = \Sigma m(1, 2, 4, 7)$ and $C_{out} = \Sigma m(3, 5, 6, 7)$ (rows numbered $A B C_{in}$, $A$ = MSB).
:::

:::derivation{#fa-equations of="the full-adder equations" depth="standard"}
**Sum.** The 1s of $S$ are the rows with an odd number of 1s: 001, 010, 100, 111. On a 3-variable K-map
they form a checkerboard, no two adjacent, so the minimal SOP is the full four-term
$\bar A \bar B C_{in} + \bar A B \bar C_{in} + A \bar B \bar C_{in} + A B C_{in}$, which is the
3-input XOR (odd parity):

$$S = A \oplus B \oplus C_{in}.$$

**Carry.** The 1s of $C_{out}$ are the rows with two or three 1s: 011, 101, 110, 111. Row 111 is adjacent
to each of the other three, so three pairs cover the map:

$$C_{out} = AB + BC_{in} + AC_{in} \quad\text{(majority)}.$$

**A second form.** Split the carry by how it is made: either the column **generates** a carry by itself
($A = B = 1$), or exactly one of $A$, $B$ is 1 and the column **propagates** the incoming carry:

$$C_{out} = AB + C_{in}(A \oplus B).$$

**Sanity check:** row 011: $S = 0 \oplus 1 \oplus 1 = 0$ and $C_{out} = 0 + 1\cdot1 + 0 = 1$; $2 \cdot 1 + 0 = 2 = 0 + 1 + 1$ ✓.
:::

:::theorem{#fa-carry-forms name="The two carry forms are equal" depth="standard"}
For all bits $A$, $B$, $C$: $\;AB + BC + AC \;=\; AB + C(A \oplus B) \;=\; AB + C(A + B).$
:::

:::proof{#proof-fa-carry-forms of="the carry forms" depth="standard"}
**Idea first:** all three say "both $A$ and $B$, or $C$ with at least one of them". They differ only
on the row $A = B = 1$, and on that row the term $AB$ already makes every form 1.

Case $AB = 1$: every form contains the term $AB$, so all three equal 1.

Case $AB = 0$: then the first form is $BC + AC = C(A + B)$. Because $A$ and $B$ are not both 1,
$A + B = A \oplus B$ (OR and XOR differ only on input 11). So all three forms equal $C(A + B)$.

The cases cover every input, so the forms are equal. (Algebraically:
$AB + BC + AC = AB + C(A + B)$ by distributivity, and $AB + C(A + B) = AB + C(A \oplus B)$ because
$A + B = (A \oplus B) + AB$ and the extra $C\cdot AB$ is absorbed by $AB$.)
:::

The second form is the important one for hardware: $A \oplus B$ is already needed for the sum, so the
carry costs only one more AND and one OR. That observation builds the full adder out of two half
adders.

:::definition{#fa-from-ha term="A full adder from two half adders and an OR" depth="standard"}
1. **HA1** adds $A$ and $B$: partial sum $p = A \oplus B$, carry $g = AB$.
2. **HA2** adds $p$ and $C_{in}$: sum $S = p \oplus C_{in} = A \oplus B \oplus C_{in}$, carry
   $t = p\,C_{in}$.
3. An **OR** gate merges the two carries: $C_{out} = g + t = AB + C_{in}(A \oplus B)$.

Five gates: 2 XOR, 2 AND, 1 OR. The names $p$ and $g$ are deliberate: they are the **propagate** and
**generate** signals of Lesson 2, where the whole carry look-ahead adder is
built from them.
:::

:::viz{#fa-from-ha-viz spec="full-adder-from-has" mode="animate" depth="standard"}
:::

:::theorem{#or-not-xor name="The two half-adder carries are never both 1" depth="standard"}
In the full adder built from two half adders, $g = AB$ and $t = (A \oplus B)\,C_{in}$ are never 1 at the
same time. Hence $g + t = g \oplus t$, and the final OR may be replaced by an XOR (or by any gate
that agrees with OR when at most one input is 1).
:::

:::proof{#proof-or-not-xor of="the half-adder carries never coincide" depth="standard"}
**Idea first:** a column either makes a carry by itself ($A = B = 1$) or passes one along (exactly one of
$A$, $B$ is 1), never both.

$g = 1$ needs $A = B = 1$, and then $A \oplus B = 0$, so $t = 0$. Conversely $t = 1$ needs $A \oplus B = 1$,
so $A \ne B$ and $g = 0$. So $g\,t = 0$ always. For two bits with $g\,t = 0$, the OR and the XOR agree on
every row (they differ only on $g = t = 1$, which never occurs). ∎
:::

:::note{#recap-fa title="Recap" depth="quick"}
Full adder: $S = A \oplus B \oplus C_{in}$, $C_{out} = AB + C_{in}(A \oplus B)$ = majority. Built from
HA1 ($p$, $g$), HA2 ($S$, $t$) and an OR ($g + t$). The two inner carries never coincide, so the OR may be
an XOR.
:::

## Gate counts in NAND and NOR

:::intuition{#count-intuition title="Why examiners ask for NAND counts" depth="standard"}
Chips are built from one kind of gate as far as possible, and NAND is the cheapest universal gate in
CMOS. So a classic question is "how many 2-input NAND gates does a half (or full) adder need?". The
trick is that the XOR you need anyway already contains the NAND of $A$ and $B$ as its first gate, so the
carry comes almost for free.
:::

:::definition{#adder-gate-counts term="Adder gate counts (2-input gates)" depth="standard"}
| Circuit | AND/OR/XOR | NAND only | NOR only |
|:--|:--|:--|:--|
| XOR alone | 1 | 4 | 5 |
| Half adder | 2 (XOR + AND) | **5** | **5** |
| Full adder | 5 (2 HA + OR) | 9 | 9 |
| n-bit ripple adder (with carry in) | 5n | 9n | 9n |

**Half adder in 5 NANDs.** $n_1 = \overline{AB}$, $n_2 = \overline{A n_1}$, $n_3 = \overline{B n_1}$,
$S = \overline{n_2 n_3} = A \oplus B$ (the 4-NAND XOR), and $C = \overline{n_1 n_1} = AB$ (the fifth NAND
used as an inverter on $n_1$). **Why 5 is the minimum:** an exhaustive search over every network of at
most four 2-input NANDs (uncomplemented inputs) finds none that produces both $A \oplus B$ and $AB$;
the same search gives 5 for NOR. **Full adder in 9 NANDs:** two 4-NAND XORs whose first NANDs are
$\overline{AB}$ and $\overline{p\,C_{in}}$, and one more NAND of those two first NANDs, which is
$\overline{\overline{AB}\cdot\overline{pC_{in}}} = AB + pC_{in} = C_{out}$ (De Morgan).
:::

:::trap{#trap-ha-count title="A half adder is not 'one XOR + one AND = 4 + 2 NANDs'" depth="standard"}
Converting gate by gate gives 4 NANDs for the XOR and 2 for the AND (a NAND followed by a NAND
inverter): 6. The answer GATE expects is **5**, because the AND's first NAND, $\overline{AB}$, is the
very first gate of the 4-NAND XOR; only the inverter is extra. Likewise the full adder is 9, not
2 × 5 + 1 = 11 or the 13 you get by converting 2 XOR + 2 AND + 1 OR separately.
:::

:::note{#recap-counts title="Recap" depth="quick"}
HA: 2 gates, or 5 NAND, or 5 NOR. FA: 5 gates (2 HA + OR), or 9 NAND, or 9 NOR. Share the
$\overline{AB}$ gate between the XOR and the carry.
:::

### Worked examples: half and full adders

::::example{#ex-fa-easy level="easy" title="A half adder adding 1 + 1" depth="quick"}
Find $S$ and $C$ of a half adder for $A = B = 1$, and check them against arithmetic.

:::step{why="The sum bit is the parity of the column: XOR is 1 for an odd number of 1s."}
$S = A \oplus B = 1 \oplus 1 = 0$.
:::

:::step{why="A carry appears only when the column total reaches 2, which needs both bits."}
$C = AB = 1 \cdot 1 = 1$.
:::

:::answer
$C S = 10$, which is binary 2 = 1 + 1 ✓. The column writes 0 and carries 1.
:::
::::

::::example{#ex-fa-medium level="medium" title="The full-adder carry from its K-map" depth="standard"}
Minimise $C_{out} = \Sigma m(3, 5, 6, 7)$ over $A B C_{in}$ and write it with the fewest literals.

:::step{why="Place the minterms on a 3-variable map: 3 = 011, 5 = 101, 6 = 110, 7 = 111."}
Row $A = 0$: only cell $B C_{in} = 11$. Row $A = 1$: cells 01, 11, 10.
:::

:::step{why="Cell 7 (111) is adjacent to each of 3, 5 and 6 (each differs from 111 in one bit), so three pairs, each containing 7, cover everything."}
Pair {3, 7} = $BC_{in}$; pair {5, 7} = $AC_{in}$; pair {6, 7} = $AB$.
:::

:::step{why="No quad exists (no four 1s form a rectangle), so these pairs are prime and all three are essential."}
$C_{out} = AB + BC_{in} + AC_{in}$: 6 literals.
:::

:::answer
$C_{out} = AB + BC_{in} + AC_{in}$, the majority of the three inputs. Check row 101: $0 + 0 + 1 = 1$ and
1 + 0 + 1 = 2 needs a carry ✓.
:::
::::

::::example{#ex-fa-gate level="gate" title="Inside the full adder for 1 + 1 + 1" depth="standard"}
A full adder is built from two half adders and an OR. For $A = B = C_{in} = 1$, give the internal lines
$p$, $g$, $t$ and the outputs.

:::step{why="HA1 sees A and B."}
$p = A \oplus B = 0$ and $g = AB = 1$.
:::

:::step{why="HA2 sees p and Cin."}
$S = p \oplus C_{in} = 0 \oplus 1 = 1$ and $t = p\,C_{in} = 0$.
:::

:::step{why="The OR merges the carries; here the carry was generated by the column itself, not propagated."}
$C_{out} = g + t = 1 + 0 = 1$.
:::

:::answer
$p = 0$, $g = 1$, $t = 0$, $S = 1$, $C_{out} = 1$: $C_{out}S = 11 = 3 = 1 + 1 + 1$ ✓. Note $g$ and $t$ are not
both 1, as the theorem promises.
:::
::::

::::example{#ex-fa-edge level="gate" title="Edge case: replacing the OR by an XOR" depth="standard"}
A student builds the full adder from two half adders but uses an XOR instead of the final OR. Is the
circuit still a full adder? What if the final gate were an AND?

:::step{why="The final gate only ever sees the pairs (g, t) that actually occur; list them."}
From the theorem, $(g, t) \in \{(0,0), (0,1), (1,0)\}$; the pair $(1,1)$ never occurs.
:::

:::step{why="Compare OR and XOR on the pairs that occur."}
OR gives 0, 1, 1; XOR gives 0, 1, 1. They agree on every pair that occurs, so the XOR version is a
correct full adder.
:::

:::step{why="An AND would give 0, 0, 0: it disagrees on (0,1) and (1,0)."}
With an AND, $C_{out}$ would be 0 for every row: wrong on 011, 101, 110, 111.
:::

:::answer
XOR works (the carries are mutually exclusive), AND does not. This is a favourite "which gate can
replace the OR" question: any gate equal to OR on $(0,0)$, $(0,1)$, $(1,0)$ works.
:::
::::

## Half and full subtractors

:::intuition{#sub-intuition title="Borrowing is carrying in the other direction" depth="standard"}
Subtracting by hand, a column computes $x - y$ and, if $y$ is bigger, **borrows** 1 from the next column
(worth 2 here). The difference digit is again "odd or even" (an XOR), because $x - y$ and $x + y$ have
the same parity. Only the second output changes meaning: instead of "the total is at least 2" it asks
"is the subtrahend bigger than what we have?". So subtractors are adders with a different carry logic.
:::

:::definition{#half-subtractor term="Half subtractor" depth="standard"}
A **half subtractor** computes $x - y$ for two bits: difference $D$ and borrow out $B_o$, with
$x - y = D - 2B_o$.

| $x$ | $y$ | $x - y$ | $B_o$ | $D$ |
|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 0 | 0 | 0 |
| 0 | 1 | −1 | 1 | 1 |
| 1 | 0 | 1 | 0 | 1 |
| 1 | 1 | 0 | 0 | 0 |

$$D = x \oplus y, \qquad B_o = \bar x\,y.$$

Row 01 is the interesting one: $0 - 1 = -1 = 1 - 2$, so the column writes 1 and borrows 1.
:::

:::definition{#full-subtractor term="Full subtractor" depth="standard"}
A **full subtractor** computes $x - y - b_{in}$ ($b_{in}$ = borrow from the lower column) with
$x - y - b_{in} = D - 2B_{out}$:

$$D = x \oplus y \oplus b_{in}, \qquad B_{out} = \bar x y + \bar x b_{in} + y\, b_{in} = \bar x y + b_{in}\,\overline{(x \oplus y)}.$$

It can be built from two half subtractors and an OR, exactly like the full adder: HS1 gives
$e = x \oplus y$ and $u = \bar x y$; HS2 gives $D = e \oplus b_{in}$ and $v = \bar e\,b_{in}$; then
$B_{out} = u + v$.
:::

:::theorem{#fs-from-fa name="The borrow is the majority of x′, y and b" depth="standard"}
$B_{out} = \text{maj}(\bar x, y, b_{in})$, so a full subtractor is a full adder whose carry logic sees
$\bar x$ instead of $x$ (the difference output is unchanged, $D = x \oplus y \oplus b_{in}$).
:::

:::proof{#proof-fs-from-fa of="the borrow as a majority" depth="standard"}
**Idea first:** we borrow when what we must take away ($y + b_{in}$) is more than what we have ($x$),
i.e. when $y + b_{in} > x$, which is $y + b_{in} + (1 - x) \ge 2$.

Since $x, y, b_{in} \in \{0, 1\}$: $B_{out} = 1 \iff y + b_{in} > x \iff y + b_{in} + \bar x \ge 2$ (use
$\bar x = 1 - x$ and integers). "At least two of the three bits $\bar x$, $y$, $b_{in}$ are 1" is the
majority $\bar x y + \bar x b_{in} + y b_{in}$, which is the formula above. The difference
$x - y - b_{in} \equiv x + y + b_{in} \pmod 2$, so $D$ is the same XOR as the adder's sum. ∎
:::

:::trap{#trap-borrow-sign title="The borrow is not the sign of the column" depth="standard"}
Students read $B_o = 1$ as "the answer is negative". For one column that is true, but for an $n$-bit
ripple subtractor the final borrow out says only that $x < y$ **as unsigned numbers**; the $n$ difference
bits are then the two's complement of $y - x$, and whether that pattern is a valid signed result is a
separate question (signed overflow, [Chapter 1, Lesson 9](lesson:code-arithmetic#overflow-theorem)). In
practice nobody builds ripple-borrow subtractors: Lesson 3 subtracts
with an adder and a row of XORs, and there the carry out is the **complement** of the borrow.
:::

:::note{#recap-sub title="Recap" depth="quick"}
Half subtractor: $D = x \oplus y$, $B_o = \bar x y$. Full subtractor: $D = x \oplus y \oplus b$,
$B_{out} = \text{maj}(\bar x, y, b)$. Same structure as the adders: two half units and an OR.
:::

### Worked examples: subtractors

::::example{#ex-sub-easy level="easy" title="A half subtractor computing 0 − 1" depth="quick"}
Find $D$ and $B_o$ for $x = 0$, $y = 1$, and interpret them.

:::step{why="The difference bit has the parity of x − y, the same as x ⊕ y."}
$D = 0 \oplus 1 = 1$.
:::

:::step{why="We borrow exactly when we take 1 from 0."}
$B_o = \bar x y = 1 \cdot 1 = 1$.
:::

:::answer
$D = 1$, $B_o = 1$: the column result is $D - 2B_o = 1 - 2 = -1 = 0 - 1$ ✓.
:::
::::

::::example{#ex-sub-medium level="medium" title="A full subtractor computing 0 − 1 − 1" depth="standard"}
Find $D$ and $B_{out}$ for $x = 0$, $y = 1$, $b_{in} = 1$.

:::step{why="The difference is the 3-input parity."}
$D = 0 \oplus 1 \oplus 1 = 0$.
:::

:::step{why="Borrow = majority of x′ = 1, y = 1, b = 1: all three are 1."}
$B_{out} = \text{maj}(1, 1, 1) = 1$.
:::

:::answer
$D - 2B_{out} = 0 - 2 = -2 = 0 - 1 - 1$ ✓. The column writes 0 and borrows one 2.
:::
::::

::::example{#ex-sub-gate level="gate" title="A 4-bit ripple-borrow subtractor: 5 − 7" depth="standard"}
Four full subtractors compute $x - y$ for $x = 0101$, $y = 0111$, $b_0 = 0$. Find the difference bits and
the final borrow, and read the result.

:::step{why="Bit 0: x0 = 1, y0 = 1, b = 0: nothing to borrow."}
$D_0 = 0$, $b_1 = \text{maj}(0, 1, 0) = 0$.
:::

:::step{why="Bit 1: x1 = 0, y1 = 1, b = 0: 0 − 1 needs a borrow."}
$D_1 = 0 \oplus 1 \oplus 0 = 1$, $b_2 = \text{maj}(1, 1, 0) = 1$.
:::

:::step{why="Bit 2: x2 = 1, y2 = 1, b = 1: 1 − 1 − 1 = −1 borrows again."}
$D_2 = 1 \oplus 1 \oplus 1 = 1$, $b_3 = \text{maj}(0, 1, 1) = 1$.
:::

:::step{why="Bit 3: x3 = 0, y3 = 0, b = 1: 0 − 0 − 1 = −1 borrows out of the word."}
$D_3 = 0 \oplus 0 \oplus 1 = 1$, $b_4 = \text{maj}(1, 0, 1) = 1$.
:::

:::answer
$D = 1110$ with final borrow 1. As unsigned, $5 < 7$ (borrow 1) and $1110 = 14 = 5 - 7 + 16$; as a 4-bit
two's-complement pattern, $1110 = -2 = 5 - 7$ ✓.
:::
::::

::::example{#ex-sub-edge level="gate" title="Edge case: is the borrow out the sign bit?" depth="standard"}
For 4-bit operands $x = 0111$ (7) and $y = 1000$ ($-8$ in two's complement), a ripple subtractor gives
$D = 1111$ and $B_{out} = 1$. Is the answer $-1$?

:::step{why="The borrow compares the operands as unsigned numbers."}
Unsigned: $7 < 8$, so $B_{out} = 1$; the pattern is $7 - 8 + 16 = 15 = 1111$.
:::

:::step{why="Signed, the true answer is 7 − (−8) = 15, which does not fit in 4-bit two's complement (range −8 … 7)."}
The signed difference overflows; the pattern 1111 reads $-1$, which is wrong.
:::

:::answer
No. $B_{out} = 1$ only says $x < y$ unsigned. The signed result overflowed (7 − (−8) = 15 > 7). Neither
the borrow nor $D_3$ alone is "the sign of the answer" when overflow is possible; the overflow flag of
Lesson 3 decides.
:::
::::

## The ripple-carry adder

:::intuition{#ripple-intuition title="A row of people passing a bucket" depth="standard"}
Put $n$ full adders side by side, one per column, and wire each one's carry out to the next one's carry
in. That is the paper method in hardware, and it has the paper method's weakness: column $i$ cannot
finish until column $i - 1$ has told it its carry. Like a line of people passing a bucket, the last
person waits for everyone before them. The carry "ripples" from the least significant stage to the most
significant one, and that ripple sets the speed of the adder.
:::

:::definition{#ripple-carry term="Ripple-carry adder (RCA)" depth="standard"}
An **$n$-bit ripple-carry adder** adds $A = a_{n-1} \dots a_0$ and $B = b_{n-1} \dots b_0$ with $n$
full adders: stage $i$ receives $a_i$, $b_i$ and $c_i$ and produces $s_i$ and $c_{i+1}$, with
$c_0$ the carry in. Its outputs are $S = s_{n-1} \dots s_0$ and the carry out $c_n$:

$$A + B + c_0 = 2^n c_n + S.$$

It works for unsigned and two's-complement numbers alike, because two's-complement addition is the
same bit pattern operation ([Chapter 1, Lesson 4](lesson:signed-numbers)). Cost: $n$ full adders,
$5n$ gates.
:::

:::definition{#ha-fa-count term="How many half and full adders?" depth="standard"}
- With a carry in $c_0$: every stage adds three bits, so **$n$ full adders**.
- With no carry in (just $A + B$): stage 0 adds only two bits, so it can be a **half adder**, and
  the other $n - 1$ stages need full adders: **1 half adder + $(n - 1)$ full adders**.
- Since a full adder is 2 half adders + an OR, an $n$-bit adder without carry in can also be built
  from $2n - 1$ half adders and $n - 1$ OR gates; but a count of only half adders, with no OR gates,
  cannot work (a half adder has no third input).
:::

:::viz{#ripple-viz spec="ripple-carry-wave" mode="animate" depth="standard"}
:::

The animation adds $0111 + 0001$ with every gate taking one unit of time. Stage 0 generates a carry
(both bits 1); stages 1 and 2 only propagate it. Watch the sum bits: $s_1$ and $s_2$ first become 1
(their own $a_i \oplus b_i$) and then flip back to 0 when the carry arrives. Those temporary values are
why a ripple adder's outputs are not usable until the carry has finished travelling.

:::intuition{#signed-intuition title="One adder for unsigned and signed numbers" depth="standard"}
Nothing in the ripple adder knows whether its inputs are unsigned numbers or two's-complement numbers.
It adds bit patterns. That is not an accident: two's complement was designed so that the **same**
pattern addition is correct for both readings, as long as the result fits. The only difference is how
you read the leftovers: for unsigned numbers the carry out $c_n$ means "the result needed $n + 1$ bits";
for signed numbers the carry out is simply discarded, and a different signal, the overflow flag, tells
you whether the result fits. Lesson 3 builds that flag from the last two carries.
:::

:::definition{#ripple-signed term="Reading a ripple adder's output" depth="standard"}
For the same output bits $c_n\,s_{n-1} \dots s_0$:

- **Unsigned:** $A + B + c_0 = 2^n c_n + S$ exactly; $c_n = 1$ means the sum does not fit in $n$ bits.
- **Two's complement:** $S$ is the correct signed sum whenever the true sum lies in
  $[-2^{n-1}, 2^{n-1} - 1]$; $c_n$ is ignored, and **overflow** happens exactly when the carry into the
  sign stage differs from the carry out of it,
  $c_{n-1} \ne c_n$ ([Chapter 1, Lesson 9](lesson:code-arithmetic#overflow-theorem)).

Example, 4 bits: $1101 + 0101$: unsigned $13 + 5 = 18 = 16 + 2$ ($c_4 = 1$, $S = 0010$); signed
$-3 + 5 = 2$ ($S = 0010$ is right, $c_4$ is ignored, and $c_3 = c_4 = 1$ so there is no overflow).
:::

:::note{#recap-ripple title="Recap" depth="quick"}
$n$ full adders chained by their carries. Counts: $n$ FA with carry in; 1 HA + $(n-1)$ FA without.
Outputs are valid only after the carry has rippled through. The same adder serves unsigned and
two's-complement operands; only the reading of $c_n$ differs.
:::

### Worked examples: building ripple adders

::::example{#ex-rca-easy level="easy" title="Counting adders for a 32-bit adder" depth="quick"}
How many half and full adders does a 32-bit ripple-carry adder need (a) with no carry in, (b) with a
carry in? How many basic gates in case (b) if each full adder is 2 HA + OR?

:::step{why="Without a carry in, column 0 adds two bits and every other column three."}
(a) 1 half adder + 31 full adders.
:::

:::step{why="With a carry in, column 0 also adds three bits."}
(b) 32 full adders.
:::

:::step{why="Each full adder is 2 XOR, 2 AND and 1 OR."}
$32 \times 5 = 160$ gates (64 XOR, 64 AND, 32 OR).
:::

:::answer
(a) 1 HA + 31 FA; (b) 32 FA = 160 two-input gates. The gate count grows like $n$, and so, as we will see,
does the delay.
:::
::::

::::example{#ex-rca-medium level="medium" title="Tracing 1011 + 0110 stage by stage" depth="standard"}
A 4-bit ripple-carry adder with $c_0 = 0$ adds $A = 1011$ and $B = 0110$. Give every carry and sum bit.

:::step{why="Stage 0: a0 = 1, b0 = 0, c0 = 0."}
$s_0 = 1 \oplus 0 \oplus 0 = 1$, $c_1 = \text{maj}(1, 0, 0) = 0$.
:::

:::step{why="Stage 1: a1 = 1, b1 = 1, c1 = 0: the stage generates."}
$s_1 = 0$, $c_2 = 1$.
:::

:::step{why="Stage 2: a2 = 0, b2 = 1, c2 = 1: the stage propagates."}
$s_2 = 0 \oplus 1 \oplus 1 = 0$, $c_3 = 1$.
:::

:::step{why="Stage 3: a3 = 1, b3 = 0, c3 = 1: propagates again, out of the word."}
$s_3 = 1 \oplus 0 \oplus 1 = 0$, $c_4 = 1$.
:::

:::answer
$c_4\,S = 1\,0001$: unsigned $11 + 6 = 17 = 16 + 1$ ✓. As signed 4-bit numbers, $-5 + 6 = 1$ and
$S = 0001$ ✓ ($c_3 = c_4 = 1$, no overflow).
:::
::::

::::example{#ex-rca-gate level="gate" title="Which adders can be removed if B is a constant?" depth="standard"}
An 8-bit ripple adder always adds the constant $B = 0000\,0001$ (an incrementer), with $c_0 = 0$. Which
cells can be simplified?

:::step{why="With b_i = 0 and a carry in, a full adder reduces to a half adder: S = a ⊕ c, C = a·c."}
Stages 1–7 have $b_i = 0$: each becomes a half adder adding $a_i$ and $c_i$.
:::

:::step{why="Stage 0 adds a0 + 1 with no carry in: S = a0′, C = a0."}
Stage 0 needs only an inverter (and the carry is the wire $a_0$).
:::

:::step{why="The chain still ripples: c_{i+1} = a_i c_i = a_0 a_1 … a_i."}
The carry into stage $i$ is the AND of all lower bits of $A$.
:::

:::answer
An incrementer is 7 half adders and an inverter. Its carries are $c_{i+1} = a_0 a_1 \cdots a_i$, so the
worst case (all lower bits 1, e.g. $0111\,1111 + 1$) still ripples through every stage. This is the
counter logic of Chapter 6.
:::
::::

::::example{#ex-rca-edge level="gate" title="Edge case: a carry in on an adder that starts with a half adder" depth="standard"}
A designer saves a gate by building a 4-bit adder as 1 HA + 3 FA. Later the circuit must compute
$A + B + 1$ (for subtraction). What breaks, and what is the cheapest fix?

:::step{why="A half adder has two inputs only; there is nowhere to connect c0."}
The 1 HA + 3 FA adder cannot accept $c_0$.
:::

:::step{why="Replacing the half adder by a full adder restores the third input."}
Use 4 full adders (cost: one more half adder and an OR, 3 gates).
:::

:::step{why="Check with A = 0101, B = 1100, c0 = 1."}
$5 + 12 + 1 = 18 = 1\,0010$; the 4-FA adder gives $c_4 = 1$, $S = 0010$ ✓.
:::

:::answer
Any adder that will ever subtract (Lesson 3) or chain to a lower block needs a full adder in
stage 0. That is why ALU adders are always $n$ full adders.
:::
::::

## Delay models: how long does a ripple adder take?

:::intuition{#delay-intuition title="Count the gates on the longest path, but agree on what a gate costs" depth="standard"}
The delay of a combinational circuit is the time from the last input change to the last output
settling: the longest chain of gates a signal must pass through. For a ripple adder the long chain is
the carry: in, through stage 0, through stage 1, and so on. Everyone agrees on that. They disagree on
**what one stage costs**: is a full adder one box with one delay, or five gates with an XOR slower than
an AND? GATE questions fix the convention in the text, and the same circuit gives different numbers
under different conventions. Read the convention first, then count.
:::

:::table{#delay-models title="Delay models for an n-bit ripple-carry adder" depth="standard"}
| Model | What one stage costs | Carry out $c_n$ | Last sum $s_{n-1}$ |
|:--|:--|:--|:--|
| (a) Unit gates, FA = 2 HA + OR | XOR, AND, OR each 1 | $2n + 1$ | $2n$ |
| (b) Unit gates, two-level SOP FA (complements free) | 2 levels from any input | $2n$ | $2n$ |
| (c) Block model | each FA one box of delay $t_{FA}$ | $n\,t_{FA}$ | $n\,t_{FA}$ |
| (d) Gate level with given gate delays | $t_{ab \to c}$ in stage 0, then $t_{c \to c}$ per stage | $t_{ab \to c} + (n-1)\,t_{c \to c}$ | $t_{ab \to c} + (n-2)\,t_{c\to c} + t_{c \to s}$ |

In (d), $t_{ab \to c}$ is the slowest path from $a_0, b_0$ to $c_1$, $t_{c\to c}$ the path from a carry in to
the carry out of one stage, and $t_{c \to s}$ from a carry in to the sum. For the HA + OR full adder:
$t_{ab \to c} = t_{XOR} + t_{AND} + t_{OR}$, $t_{c \to c} = t_{AND} + t_{OR}$, $t_{c \to s} = t_{XOR}$.
Model (a) is (d) with every gate 1.
:::

:::theorem{#ripple-delay name="Carry timing of the HA + OR ripple adder (unit gates)" depth="standard"}
With every gate taking one unit and full adders built from two half adders and an OR, the carry $c_i$
of an $n$-bit ripple adder is ready by time $2i + 1$ for $i \ge 1$, the sum $s_i$ by time $2i + 2$ for
$i \ge 1$ ($s_0$ by 2). So the last sum settles by $2n$ and the carry out by $2n + 1$, and these bounds
are reached (the adder's worst-case delay is exactly $2n + 1$).
:::

:::proof{#proof-ripple-delay of="the ripple delay" depth="standard"}
**Idea first:** after the first stage, each carry is just "AND then OR" behind the previous one, so it
adds exactly 2 per stage; the first stage costs 3 because the carry must wait for $p_0 = a_0 \oplus b_0$.

All $p_i = a_i \oplus b_i$ and $g_i = a_i b_i$ are ready at time 1 (one gate after the inputs). Let $T_i$
be the time $c_i$ is ready; $T_0 = 0$.

Stage 0: $t_0 = p_0 c_0$ is ready at $\max(1, 0) + 1 = 2$, and $c_1 = g_0 + t_0$ at $\max(1, 2) + 1 = 3$. So
$T_1 = 3$.

Induction: if $T_i = 2i + 1 \ge 3$, then $t_i = p_i c_i$ is ready at $\max(1, T_i) + 1 = T_i + 1$ and
$c_{i+1} = g_i + t_i$ at $T_i + 2 = 2(i+1) + 1$. ✓

Sums: $s_i = p_i \oplus c_i$ is ready at $\max(1, T_i) + 1 = 2i + 2$ for $i \ge 1$, and $s_0$ at
$\max(1, 0) + 1 = 2$. The latest are $s_{n-1}$ at $2n$ and $c_n$ at $2n + 1$.

The bounds are reached: with $c_0 = 1$, $a_i \ne b_i$ for every $i$, the path
$a_0 \to p_0 \to t_0 \to c_1 \to t_1 \to \dots \to c_n$ is sensitised (every AND sees its other
input at 1, every OR its other input at 0), so $c_n$ really changes at $2n + 1$. The check script
confirms the arrival times on the netlists for $n$ up to 16. ∎
:::

:::trap{#trap-block-vs-gate title="Block model vs gate level: 19.2 µs or 12 µs?" depth="standard"}
GATE 2015: XOR = 2.4 µs, AND/OR = 1.2 µs, full adder = 2 HAs + OR, 4-bit ripple adder. One full adder's
slowest output takes **4.8 µs** (sum: XOR + XOR; carry: XOR + AND + OR).

- **Block model (the official key):** "the adder is implemented using four full adders", each counted
  as a box of 4.8 µs: $4 \times 4.8 = 19.2$ µs.
- **Gate level:** after stage 0 the carry needs only AND + OR = 2.4 µs per stage (the XORs of the later
  stages finished long ago, in parallel): $c_4 = 4.8 + 3 \times 2.4 = 12$ µs, and $s_3 = c_3 + 2.4 =
  12$ µs too.

The key is 19.2, so the examiner intended the block model, and the answer to give is 19.2. The trap
is to mix models: e.g. $4 \times 2.4 = 9.6$ (only the carry path, even in stage 0) or $4.8 + 3 \times
4.8$ written as "gate level". Know both numbers and why they differ: the block model assumes each stage
starts only when the previous one has completely finished, which real gates do not do.
:::

### Worked examples: delays

::::example{#ex-delay-easy level="easy" title="A 4-bit ripple adder with unit gate delays" depth="quick"}
Full adders are two half adders and an OR; every gate takes 1 unit. When is the 4-bit adder's output
guaranteed valid?

:::step{why="Use the theorem: c_i ready at 2i + 1, last sum at 2n."}
$c_4$ at $2 \cdot 4 + 1 = 9$; $s_3$ at $2 \cdot 4 = 8$.
:::

:::step{why="The adder is done when every output is valid, so take the latest."}
$\max(9, 8) = 9$.
:::

:::answer
9 gate delays ($2n + 1$). If only the 4 sum bits are used (no carry out), 8.
:::
::::

::::example{#ex-delay-medium level="medium" title="A 16-bit adder with two-level full adders" depth="standard"}
Each full adder is two-level AND-OR logic (complemented inputs free), every gate one unit. Find the delay
of a 16-bit ripple adder.

:::step{why="Two-level logic: every output of a stage is two gate delays after its latest input."}
$c_1$ at 2, and each later carry 2 more: $c_i$ at $2i$.
:::

:::step{why="The last sum needs c15 (ready at 30) and is itself two levels."}
$s_{15}$ at $30 + 2 = 32$; $c_{16}$ at $32$.
:::

:::answer
32 gate delays ($2n$). Under model (a), the HA + OR adder, it would be $2 \cdot 16 + 1 = 33$.
:::
::::

::::example{#ex-delay-gate level="gate" title="GATE 2015's numbers under both models" depth="standard"}
XOR = 2.4 µs, AND = OR = 1.2 µs; full adder = 2 HA + OR; 4-bit ripple adder. Compute the block-model and
the gate-level delays.

:::step{why="One full adder, slowest output: the sum passes two XORs; the carry passes XOR, AND, OR."}
$t_{sum} = 2.4 + 2.4 = 4.8$; $t_{ab\to c} = 2.4 + 1.2 + 1.2 = 4.8$. So $t_{FA} = 4.8$ µs.
:::

:::step{why="Block model: four boxes in a chain, each waiting for the previous one."}
$4 \times 4.8 = 19.2$ µs.
:::

:::step{why="Gate level: stage 0 costs 4.8 to c1; later stages need only AND + OR = 2.4 each."}
$c_4 = 4.8 + 3 \times 2.4 = 12.0$ µs; $s_3 = c_3 + t_{XOR} = 9.6 + 2.4 = 12.0$ µs.
:::

:::answer
Block model 19.2 µs (the GATE key); gate-level critical path 12 µs. Give 19.2 for that question, and say
"block model" when you explain it.
:::
::::

::::example{#ex-delay-edge level="gate" title="Edge case: when the last sum, not the carry, decides" depth="standard"}
Gate delays: XOR 3, AND 1, OR 1 (an unusually slow XOR); FA = 2 HA + OR; 4-bit ripple adder. Which output
settles last?

:::step{why="Stage 0: the carry waits for p0 (XOR), then AND, OR."}
$c_1 = 3 + 1 + 1 = 5$.
:::

:::step{why="Later stages add AND + OR = 2 per carry."}
$c_2 = 7$, $c_3 = 9$, $c_4 = 11$.
:::

:::step{why="The sum s3 needs c3 and then one XOR (3)."}
$s_3 = 9 + 3 = 12 > c_4 = 11$.
:::

:::answer
The last sum (12 units) is later than the carry out (11), so the adder's delay is 12. Formula (d):
$t_{ab\to c} + (n-2)t_{c\to c} + t_{c\to s} = 5 + 2 \cdot 2 + 3 = 12$. Always compare both outputs.
:::
::::

## The slowest operands

:::intuition{#worst-intuition title="A carry travels only through propagating columns" depth="standard"}
A carry made in column $i$ moves into column $i + 1$ and keeps going only while the columns it meets
**propagate** it, i.e. have $a_j \ne b_j$ (so $a_j + b_j = 1$, and 1 + carry makes another carry). A
column with $a_j = b_j = 0$ **kills** it; a column with $a_j = b_j = 1$ makes its own carry anyway. So the
longest wait happens when the lowest column generates a carry and **every** column above propagates it
all the way out.
:::

:::definition{#worst-case-carry term="The longest carry chain" depth="standard"}
In a ripple-carry adder (carry in 0), a carry generated at bit $i$ travels through bits $i+1, \dots, j$
as long as each has $a_k \oplus b_k = 1$. The chain is longest, $n$ stages, when bit 0 generates
($a_0 = b_0 = 1$) and bits $1 \dots n-1$ all propagate. In two's complement this is the pair
$A = 1$, $B = -1$ (all ones): $1 + (-1) = 0$, and **every** sum bit first shows its own $a_i \oplus b_i$
and then flips when the carry arrives.

For a fixed $A$, the slowest $B$ is found by making stage 0 generate (or, if $a_0 = 0$, the lowest
possible stage) and making every higher stage propagate, i.e. $b_k = \bar a_k$ above it.
:::

:::aside{#data-dependent title="Further depth: the average carry chain is short" depth="deep"}
The worst case grows like $n$, but for random operands the longest propagate run is only about
$\log_2 n$ bits long (each extra bit of a run halves its probability). Our check script measures it:
for random 32-bit operands the mean longest chain is close to 5 = $\log_2 32$. Some early machines
exploited this with **asynchronous** adders that signal "done" as soon as the carries have settled, instead
of always waiting for the worst case. Clocked designs cannot do that: the clock period must cover the
worst case, which is why the next lesson attacks the worst case directly.
:::

:::note{#recap-worst title="Recap" depth="quick"}
A carry moves only through propagating columns ($a_k \ne b_k$). The slowest operands generate at bit 0
and propagate through every higher bit; for $A = 1$ that is $B = -1$.
:::

## Pipelined adders

:::intuition{#pipe-intuition title="An assembly line for additions" depth="standard"}
A ripple adder is slow because the carry crosses every stage. Suppose you have many additions to do, one
after another. Put a **register** (a row of flip-flops) after every full adder. Each clock, every pair of
numbers in flight moves forward one stage, and a new pair enters. Like an assembly line, one car still
takes all the stations, but a finished car rolls out every clock.
:::

:::definition{#pipelined-adder term="Pipelined adder" depth="standard"}
A **$k$-stage pipelined adder** places registers between groups of full adders. Stage $j$ adds its group
of bits using the carry saved by stage $j - 1$; the registers also carry the not-yet-added operand bits
forward and the finished sum bits along, so all bits of one result leave together.

- **Clock period** = delay of the slowest stage + register overhead.
- **Latency** = $k$ clock periods (one result takes $k$ clocks).
- **Throughput** = one result per clock once the pipeline is full.

GATE 2002 is a 3-stage pipelined 3-bit ripple adder: one full adder per stage, registers R0, R1, R2.
:::

:::viz{#pipeline-viz spec="pipeline-adder" mode="animate" depth="standard"}
:::

The animation clocks the 2002 circuit with its inputs (110 + 101, 011 + 101, 111 + 011, 101 + 110, then
zeros). The first result appears after clock 3 (latency 3), and then one result per clock: 1011, 1000,
1010, 1011.

:::note{#recap-pipe title="Recap" depth="quick"}
Worst case: generate at bit 0, propagate everywhere above ($A = 1$, $B = -1$). Pipelining keeps the
latency (or makes it slightly worse) and multiplies the throughput: one result per clock after $k$
clocks.
:::

### Worked examples: worst cases and pipelines

::::example{#ex-worst-easy level="easy" title="Operands that ripple all the way in 8 bits" depth="quick"}
Give an 8-bit unsigned pair $A$, $B$ (carry in 0) for which the carry ripples through all 8 stages.

:::step{why="Bit 0 must generate: both bits 1."}
$a_0 = b_0 = 1$.
:::

:::step{why="Every higher bit must propagate: exactly one of a_k, b_k is 1."}
Take $a_k = 0$, $b_k = 1$ for $k = 1 \dots 7$: $A = 00000001$, $B = 11111111$.
:::

:::answer
$1 + 255 = 256$: sum $00000000$, carry out 1, and the carry crossed all 8 stages. ($A = 0000\,0011$,
$B = 1111\,1101$ also works.)
:::
::::

::::example{#ex-worst-medium level="medium" title="A = 1: which B is slowest? (the 2016 pattern)" depth="standard"}
An 8-bit ripple adder adds two's-complement $A = 1$ and $B$. Which decimal $B$ makes the sum take longest to
stabilise?

:::step{why="a0 = 1, so stage 0 generates exactly when b0 = 1; with b0 = 0 no carry is ever made (a_k = 0 above)."}
Need $b_0 = 1$.
:::

:::step{why="Bits 1 to 7 of A are 0, so stage k propagates iff b_k = 1; the chain reaches the top only if all are 1."}
$B = 1111\,1111$.
:::

:::step{why="Read the pattern as an 8-bit two's-complement number."}
$1111\,1111 = -1$.
:::

:::answer
$B = -1$. The transport-delay simulation of the 8-bit adder (starting from all-zero inputs) confirms it
is the **only** slowest $B$: carry out at 16 units, every other $B$ settles sooner.
:::
::::

::::example{#ex-pipe-gate level="gate" title="Latency and throughput of a pipelined adder" depth="standard"}
A 16-bit adder is split into 4 pipeline stages of 4 bits each; a stage's logic takes 9 units and a
register adds 1 unit. Without pipelining the whole adder takes 33 units. Compare latency and throughput.

:::step{why="The clock must cover one stage plus its register."}
Clock period $= 9 + 1 = 10$ units.
:::

:::step{why="A result needs to pass all four stages."}
Latency $= 4 \times 10 = 40$ units (worse than 33).
:::

:::step{why="Once the pipeline is full, one new sum leaves every clock."}
Throughput: 1 addition per 10 units, against 1 per 33 (or 34 with a register) without pipelining.
:::

:::answer
Latency rises from 33 to 40 units, but throughput rises about 3.3×. Pipelining never makes one
addition faster; it lets many additions overlap.
:::
::::

::::example{#ex-pipe-edge level="gate" title="Edge case: who skews the bits in a pipelined adder?" depth="standard"}
In GATE 2002's 3-stage pipelined adder, the bits $a_2 a_1 a_0$, $b_2 b_1 b_0$ of one operand pair are all
loaded into R0 at the same clock. Bit 2 is added two stages later. How do the right bits meet?

:::step{why="Bit i is added in stage i, i clocks after the pair enters."}
Bit 0 is added from R0 (during clock 1 → 2), bit 1 from R1, bit 2 from R2.
:::

:::step{why="The registers carry the unused high bits along: R1 holds a2 a1 b2 b1 with s0 and c1; R2 holds a2 b2 with s0, s1 and c2."}
So $a_2, b_2$ travel in the registers and meet $c_2$ exactly when it is made.
:::

:::step{why="The finished low sum bits travel along too, so all four Z bits of one pair appear together."}
$z_0$, $z_1$ come out of R2 alongside $z_2$, $z_3$ from the last full adder.
:::

:::answer
The registers themselves delay the high operand bits and the low sum bits, so the inputs need no
external skew. A pipeline that drops these "travelling" bits would mix bits of different operand pairs.
:::
::::

## Try it

Open the Adder Race. Leave the width at 8 bits and press Race with $A = 1$, $B = -1$: watch the carries in
the ripple-carry adder light up one stage at a time while the look-ahead adder (next lesson) is done long
before. Try $A = 1$, $B = 2$: no carry is generated, and both adders finish almost at once.

:::lab{#lab-race lab="adder-race" tab="race" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1999-a-41" tests="ha-fa-count,ripple-carry" depth="standard"}
:::

:::pyq{id="cse-2002-b-56-a" tests="pipelined-adder,full-adder" depth="standard"}
:::

:::pyq{id="cse-2002-b-56-b" tests="pipelined-adder,ripple-carry" depth="standard"}
:::

:::pyq{id="cse-2015-2-cs-48" tests="delay-models,ripple-delay,trap-block-vs-gate" depth="standard"}
:::

:::pyq{id="cse-2016-2-cs-7" tests="worst-case-carry,ripple-carry" depth="standard"}
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

:::summary{#summary-card title="Adders, subtractors and ripple carry on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Half adder | $S = A \oplus B$, $C = AB$; 2 gates, 5 NAND, 5 NOR |
| Full adder | $S = A \oplus B \oplus C_{in}$, $C_{out} = AB + C_{in}(A \oplus B)$ = majority; 2 HA + OR (the OR may be an XOR); 9 NAND |
| Subtractors | $D = x \oplus y (\oplus\, b)$; $B_o = \bar x y$; $B_{out} = \text{maj}(\bar x, y, b)$ |
| Ripple adder | $n$ FA (carry in) or 1 HA + $(n-1)$ FA (no carry in); $5n$ gates |
| Delay (a) unit gates, HA + OR FA | $c_i$ at $2i + 1$; total $2n + 1$ |
| Delay (b) two-level FA | $2n$ |
| Delay (c) block | $n \cdot t_{FA}$ (GATE 2015: $4 \times 4.8 = 19.2$ µs) |
| Delay (d) given gates | $t_{ab\to c} + (n - 1)t_{c\to c}$ vs $t_{ab\to c} + (n-2)t_{c\to c} + t_{c\to s}$ (2015: 12 µs) |
| Worst operands | bit 0 generates, all higher bits propagate: $A = 1$, $B = -1$ |
| Pipelining | latency $k$ clocks, then one result per clock; registers carry the high operand bits and low sum bits along |
:::
