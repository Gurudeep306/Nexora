---
id: carry-look-ahead
subject: dl
chapter: arithmetic-circuits
title: "Carry look-ahead adders"
order: 2
prerequisites: [adders-ripple-carry]
pyq_topics: [dl/arithmetic, dl/combinational]
est_minutes: 50
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every carry equation, gate count, fan-in, delay and level count is checked in content/gate-notes/_checks/dl/l4_02_cla.py (arithlib look-ahead netlists up to 64 bits, simulated and timed)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 59–60, set B pp. 131–133, set C pp. 286–287, set D p. 401, set E p. 408."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (carry look-ahead); Hamacher et al., Computer Organization (multi-level look-ahead, carry-select)."
  - "PYQs: src/gate/questions.json (cse-1997-a-15, cse-2004-cs-62, cse-2006-cs-36, cse-2007-cs-35, cse-2016-1-cs-33), keys re-derived in l4_02_cla.py; cse-2006-cs-36's option text is unreadable in the scan, its key is proved."
updated: "2026-10-19"
---

The ripple-carry adder of [Lesson 1](lesson:adders-ripple-carry) is small and simple, and slow: its
carry walks through the stages one at a time, so a 64-bit addition waits for 129 gate delays. A
**carry look-ahead adder** (CLA) refuses to wait. It notices that every carry is a Boolean function of
the input bits alone, so it can be computed **directly**, in a fixed number of gate levels, without
waiting for the carry below. The trick is to describe each bit position by two signals, **generate**
and **propagate**, and then expand the carry recurrence. This lesson builds the 4-bit CLA, counts its
gates, delay and fan-in exactly as GATE asks, discovers why "constant time" is a lie once gates have a
fan-in limit, and fixes it with a **tree** of look-ahead units whose delay grows only like $\log n$.
It ends with the hybrid designs real chips use (carry-select, carry-skip, rippled CLA blocks) and the
opposite extreme, the bit-serial adder.

## Where this fits

Everything rests on the full adder's two carry sources from
[Lesson 1](lesson:adders-ripple-carry#fa-equations): a column generates a carry ($AB$) or passes one
along ($C_{in}(A \oplus B)$). The carry-select adder below needs a 2:1 multiplexer, a switch that passes
one of two inputs; it is built and analysed in [Chapter 5, Lesson 2](lesson:multiplexers), and here
we only need its behaviour and its delay (two gate levels). Lesson 3 puts the faster adder behind an
XOR row to subtract, and Lesson 4 uses fast adders in the last row of a multiplier.

:::table{#radar title="GATE radar: carry look-ahead" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 5 (1997, 2004, 2006, 2007, 2016) |
| Marks | 1 one-mark MCQ (1997), 4 two-mark MCQs (2004, 2006, 2007, 2016) |
| Pattern 1 | Asymptotic delay of a CLA with bounded fan-in or with 74181/74182 chips: $\Theta(\log n)$ (1997, 2016) |
| Pattern 2 | Exact delay of a 4-bit CLA under a stated gate model (2004: 6 units) |
| Pattern 3 | Gate counts of a two-level look-ahead unit (2007: 10 AND, 4 OR) |
| Pattern 4 | Writing a carry as a sum of products of the input bits (2006) |
| What examiners test | The G/P recurrence and its expansion; whether XOR is one gate or two levels; whether fan-in is bounded; counting AND terms $1 + 2 + \dots + n$; that a tree of look-ahead units gives $\log n$ |
:::

## Generate and propagate

:::intuition{#cla-intuition title="A relay race vs a starting gun" depth="standard"}
In a ripple adder the carry is a relay baton: runner $i$ cannot start until runner $i - 1$ hands it
over. A look-ahead adder is a race started by a gun that everyone hears at once. Each column can tell,
from its own two bits, whether it will **make** a carry no matter what ($a_i = b_i = 1$), **kill** any
carry ($a_i = b_i = 0$), or **pass on** whatever carry it receives ($a_i \ne b_i$). Once every column has
announced its type, the carry into column 4 is just a question about the pattern of announcements: "did
some column below make a carry, and did every column between it and column 4 pass it on?" That question
is a two-level AND-OR formula, and all of them can be answered at the same time.
:::

:::definition{#generate-propagate term="Generate and propagate" depth="standard"}
For bit position $i$ of $A + B$:

$$g_i = a_i\,b_i \quad\text{(generate)}, \qquad p_i = a_i \oplus b_i \quad\text{(propagate)}.$$

- $g_i = 1$: the column produces a carry out whatever its carry in is ($1 + 1 + c = 10$ or $11$).
- $p_i = 1$: the column's carry out equals its carry in ($1 + 0 + c$).
- $g_i = p_i = 0$: the column kills any carry ($0 + 0 + c$ gives carry 0).

$g_i$ and $p_i$ are never both 1. They are exactly the two half-adder outputs of HA1 in
[Lesson 1's full adder](lesson:adders-ripple-carry#fa-from-ha), and the sum is still $s_i = p_i \oplus c_i$.
:::

:::theorem{#carry-recurrence name="The carry recurrence" depth="standard"}
For every position $i$: $\;c_{i+1} = g_i + p_i\,c_i\;$ and $\;s_i = p_i \oplus c_i$.
:::

:::proof{#proof-carry-recurrence of="the carry recurrence" depth="standard"}
**Idea first:** the three column types (make, pass, kill) give the carry out directly.

$c_{i+1}$ is the full-adder carry $a_ib_i + c_i(a_i \oplus b_i)$
([Lesson 1, carry forms](lesson:adders-ripple-carry#fa-carry-forms)), which is $g_i + p_ic_i$ by
definition. Check the three cases: generate ($g_i = 1$): $c_{i+1} = 1$; propagate ($p_i = 1$, $g_i = 0$):
$c_{i+1} = c_i$; kill ($g_i = p_i = 0$): $c_{i+1} = 0$. The sum is $a_i \oplus b_i \oplus c_i = p_i \oplus c_i$. ∎
:::

:::theorem{#p-xor-or name="Propagate may be an OR for the carries, not for the sum" depth="standard"}
Let $t_i = a_i + b_i$ (OR). Then $c_{i+1} = g_i + t_i\,c_i$ as well. But $s_i = t_i \oplus c_i$ is
**false** whenever $a_i = b_i = 1$.
:::

:::proof{#proof-p-xor-or of="propagate as an OR" depth="standard"}
**Idea first:** OR and XOR differ only when $a_i = b_i = 1$, and on that row the carry is already 1
because of $g_i$.

If $a_ib_i = 0$, then $t_i = a_i + b_i = a_i \oplus b_i = p_i$ and the two recurrences are identical. If
$a_ib_i = 1$, then $g_i = 1$ and both $g_i + t_ic_i$ and $g_i + p_ic_i$ equal 1. So the carry formulas
agree on every row.

For the sum: at $a_i = b_i = 1$, $c_i = 0$ the true sum bit is $1 \oplus 1 \oplus 0 = 0$, but
$t_i \oplus c_i = 1 \oplus 0 = 1$. ∎

So a CLA may compute its carries with $t_i = a_i + b_i$ (an OR is cheaper and faster than an XOR) but
must still form the sums with $p_i = a_i \oplus b_i$. Some textbooks call $t_i$ the "transmit" signal; GATE
2006's option A is written with this OR form.
:::

:::trap{#trap-p-or title="Using the OR propagate in the sum" depth="standard"}
"$P_i = A_i + B_i$" in a question is legitimate for the carry equations. The mistake is to reuse it for
the sum: $S_i = P_i \oplus C_i$ holds only with $P_i = A_i \oplus B_i$. GATE 2007 states $P_i = A_i \oplus B_i$
precisely because its sum formula needs it.
:::

:::note{#recap-gp title="Recap" depth="quick"}
$g_i = a_ib_i$ (make), $p_i = a_i \oplus b_i$ (pass), $c_{i+1} = g_i + p_ic_i$, $s_i = p_i \oplus c_i$. For carries
alone, $p_i$ may be $a_i + b_i$.
:::

## Unrolling the recurrence

:::intuition{#unroll-intuition title="Say the sentence out loud" depth="standard"}
"There is a carry into column 3 if column 2 makes one, or column 1 makes one and column 2 passes it, or
column 0 makes one and columns 1 and 2 pass it, or the carry in is 1 and columns 0, 1, 2 all pass it."
Each "or" is a product term, each "and pass it" adds one more $p$ to the product. Writing the sentence in
symbols is the whole carry look-ahead formula.
:::

:::derivation{#cla-expansion of="the look-ahead carries" depth="standard"}
Substitute the recurrence into itself:

$$c_1 = g_0 + p_0c_0$$
$$c_2 = g_1 + p_1c_1 = g_1 + p_1g_0 + p_1p_0c_0$$
$$c_3 = g_2 + p_2g_1 + p_2p_1g_0 + p_2p_1p_0c_0$$
$$c_4 = g_3 + p_3g_2 + p_3p_2g_1 + p_3p_2p_1g_0 + p_3p_2p_1p_0c_0.$$

In general $c_{k} = \sum_{j=-1}^{k-1} \Big(\prod_{m=j+1}^{k-1} p_m\Big) g_j$ with $g_{-1} = c_0$: one product
term per possible "source" of the carry (each lower column, or the carry in), and every term is a product
of the $p$'s above the source. **Sanity check** with $c_0 = 0$, $a = 0011$, $b = 0001$: $g_0 = 1$,
$p_1 = 1$, so $c_2 = p_1g_0 = 1$, and indeed $3 + 1 = 4$ carries into bit 2.
:::

:::definition{#unroll-derivation term="Carries as functions of the input bits" depth="standard"}
Replacing $g_i = a_ib_i$ and $p_i = a_i + b_i$ (the OR form is allowed for carries) expresses every carry
directly in the operand bits. For 3-bit operands with carry in 0, the carry out is

$$c_3 = a_2b_2 + (a_2 + b_2)a_1b_1 + (a_2 + b_2)(a_1 + b_1)a_0b_0,$$

which multiplies out to $1 + 2 + 4 = 7$ product terms:
$a_2b_2 + a_2a_1b_1 + b_2a_1b_1 + a_2a_1a_0b_0 + a_2b_1a_0b_0 + b_2a_1a_0b_0 + b_2b_1a_0b_0$.
This is GATE 2006's "carry generate function" of the 3-bit block.
:::

:::note{#recap-unroll title="Recap" depth="quick"}
$c_k$ = OR over every source $j$ (a lower column or the carry in) of $g_j$ times all the $p$'s above it:
$k + 1$ product terms, the longest with $k + 1$ literals.
:::

## The 4-bit carry look-ahead adder

:::intuition{#cla4-intuition title="Three layers: announce, look ahead, add" depth="standard"}
A 4-bit CLA has three layers. First every column announces $p_i$ and $g_i$ (one gate level). Then a
**carry look-ahead unit** turns the announcements into all four carries at once (an AND level and an OR
level). Finally every column adds its own carry with one XOR. The depth no longer depends on which carry
you are computing: $c_4$ is ready at the same time as $c_1$.
:::

:::definition{#cla-4bit term="4-bit carry look-ahead adder" depth="standard"}
1. **P/G layer:** $p_i = a_i \oplus b_i$, $g_i = a_ib_i$ for $i = 0 \dots 3$ (4 XOR, 4 AND).
2. **Carry look-ahead unit:** $c_1, c_2, c_3, c_4$ by the expanded formulas, each a two-level AND-OR circuit.
3. **Sum layer:** $s_i = p_i \oplus c_i$ (4 XOR).

The look-ahead unit is often a separate block (the 74182 chip, below) that receives the $p_i$, $g_i$ and
$c_0$ and returns the carries.
:::

:::definition{#cla-delay term="Delay of the 4-bit CLA" depth="standard"}
Count levels on the longest path $a_i, b_i \to p_i \to$ (AND, OR) $\to c_k \to$ XOR $\to s_k$:

| Convention | P/G | carries (AND + OR) | sum XOR | total |
|:--|:--|:--|:--|:--|
| every gate (incl. XOR) 1 unit | 1 | 2 | 1 | **4** |
| XOR built as two-level AND-OR, every gate 1 unit (GATE 2004) | 2 | 2 | 2 | **6** |

The total does **not** depend on $n$ for a single-level CLA: 4 (or 6) for 4 bits, 8 bits or 32 bits,
provided gates of any fan-in exist. The carry $c_4$ alone is ready after $1 + 2 = 3$ units (or $2 + 2 = 4$).
:::

:::definition{#cla-gate-count term="Gates of a two-level look-ahead unit" depth="standard"}
With $p_i$, $g_i$ and $c_0$ given, $c_k$ needs $k$ AND terms (one per source below $g_{k-1}$, which is a bare
literal) and one OR. For carries $c_1 \dots c_n$:

$$\text{AND gates} = 1 + 2 + \dots + n = \frac{n(n+1)}{2}, \qquad \text{OR gates} = n.$$

For $n = 4$: **10 ANDs and 4 ORs** (GATE 2007). The sums $S_0 \dots S_3$ need the carries $c_1, c_2, c_3$
(and $c_0$), and $C_4$ is an output too, so all four carries are built. (Counting the sum XORs is a
different question; the look-ahead generator itself contains only ANDs and ORs.)
:::

:::definition{#fan-in term="Fan-in grows with the width" depth="standard"}
The term $p_{n-1} \cdots p_1p_0c_0$ is an AND of $n + 1$ inputs, and $c_n$ is an OR of $n + 1$ terms. A
single-level 32-bit CLA would need 33-input gates. Real gates have a small fan-in (2 to 4 in CMOS);
building a 33-input AND from 4-input ones takes $\lceil \log_4 33 \rceil = 3$ levels. So the "constant
delay" of a single-level CLA is constant only on paper; the cure is the multi-level CLA below.
:::

:::viz{#timing-viz spec="rca-vs-cla-timing" mode="animate" depth="standard"}
:::

The animation stamps every carry of a 16-bit adder with the time it settles. The ripple row fills one
box every two units, from the right; the look-ahead row (the two-level 16-bit design of the next
section) is complete by $t = 7$ and its sums by $t = 8$. The ripple adder needs 33.

:::note{#recap-cla4 title="Recap" depth="quick"}
4-bit CLA = P/G layer + two-level carry unit + XOR layer: 4 levels (6 if XOR counts as two). The unit has
$n(n+1)/2$ ANDs and $n$ ORs; the largest gate has fan-in $n + 1$.
:::

### Worked examples: G/P and the carry equations

::::example{#ex-gp-easy level="easy" title="Generate and propagate of a bit pair" depth="quick"}
For $a = 1011$, $b = 0110$, give $g_i$ and $p_i$ for $i = 3 \dots 0$.

:::step{why="g is the AND of the column's bits."}
$g = a\,\&\,b = 0010$: only column 1 generates.
:::

:::step{why="p is the XOR of the column's bits."}
$p = a \oplus b = 1101$: columns 3, 2 and 0 propagate.
:::

:::answer
$g_3g_2g_1g_0 = 0010$, $p_3p_2p_1p_0 = 1101$. Column 1's carry will travel through columns 2 and 3 and out:
$c_4 = p_3p_2g_1 = 1$, and indeed $11 + 6 = 17 \ge 16$.
:::
::::

::::example{#ex-gp-medium level="medium" title="c3 by the look-ahead formula" depth="standard"}
With $a = 0101$, $b = 0011$, $c_0 = 1$, compute $c_3$ from the expanded formula and check it by addition.

:::step{why="Compute the announcements first."}
$g = 0001$ ($g_0 = 1$), $p = 0110$ ($p_2 = p_1 = 1$, $p_0 = 0$).
:::

:::step{why="c3 = g2 + p2g1 + p2p1g0 + p2p1p0c0: evaluate each term."}
$g_2 = 0$; $p_2g_1 = 0$; $p_2p_1g_0 = 1\cdot1\cdot1 = 1$; $p_2p_1p_0c_0 = 0$. So $c_3 = 1$.
:::

:::step{why="Check: the carry into bit 3 is 1 iff the low three bits overflow."}
$101 + 011 + 1 = 5 + 3 + 1 = 9 \ge 8$ ✓.
:::

:::answer
$c_3 = 1$, produced by the source "column 0 generates, columns 1 and 2 propagate".
:::
::::

::::example{#ex-gp-gate level="gate" title="The 3-bit carry generate as a sum of products (GATE 2006 pattern)" depth="standard"}
Write the carry out of a 3-bit block ($c = 0$) as a sum of products of $a_2a_1a_0$, $b_2b_1b_0$.

:::step{why="Start from the look-ahead form with c0 = 0, so the last term vanishes."}
$c_3 = g_2 + p_2g_1 + p_2p_1g_0$.
:::

:::step{why="Use the OR propagate p_i = a_i + b_i, allowed for carries; it keeps every term a plain product."}
$c_3 = a_2b_2 + (a_2 + b_2)a_1b_1 + (a_2 + b_2)(a_1 + b_1)a_0b_0$.
:::

:::step{why="Multiply out: 1 + 2 + 4 terms."}
$a_2b_2 + a_2a_1b_1 + a_1b_2b_1 + a_2a_1a_0b_0 + a_2a_0b_1b_0 + a_1a_0b_2b_0 + a_0b_2b_1b_0$.
:::

:::answer
Seven product terms, exactly option (a) of GATE 2006. Spot-check $a = 001$, $b = 111$: $1 + 7 = 8$ carries out,
and the term $a_0b_2b_1b_0 = 1$ ✓.
:::
::::

::::example{#ex-gp-edge level="gate" title="Edge case: the OR propagate breaks the sum" depth="standard"}
A designer computes $t_i = a_i + b_i$ and uses it for both carries and sums. Find the smallest
input where the 1-bit result is wrong.

:::step{why="The carry formula is safe (theorem), so look at the sum s_i = t_i ⊕ c_i."}
It differs from $a_i \oplus b_i \oplus c_i$ exactly when $t_i \ne p_i$, i.e. when $a_i = b_i = 1$.
:::

:::step{why="Take a0 = b0 = 1, c0 = 0."}
True $s_0 = 0$ (1 + 1 = 10); designer's $s_0 = 1 \oplus 0 = 1$.
:::

:::answer
$1 + 1$ already fails: the sum needs $p_i = a_i \oplus b_i$. Keep both signals: $t_i$ (or $p_i$) for the carries,
$p_i$ for the sums.
:::
::::

### Worked examples: CLA delay and cost

::::example{#ex-cost-easy level="easy" title="Delay of a 4-bit CLA with unit gates" depth="quick"}
Every gate, including XOR, takes 1 unit, gates of any fan-in exist. What is the delay of a 4-bit CLA?

:::step{why="P/G layer: one XOR or AND."}
$p_i, g_i$ at 1.
:::

:::step{why="Carry unit: AND then OR."}
$c_1 \dots c_4$ at 3.
:::

:::step{why="Sum: one XOR."}
$s_i$ at 4.
:::

:::answer
4 units. A 4-bit ripple adder under the same model needs 9.
:::
::::

::::example{#ex-cost-medium level="medium" title="Gates of the 4-bit look-ahead generator (GATE 2007 pattern)" depth="standard"}
Two-level AND-OR, any fan-in, $P_i$, $G_i$, $C_0$ available. How many AND and OR gates produce
$C_1 \dots C_4$?

:::step{why="C1 = G0 + P0C0: one product term."}
1 AND, 1 OR.
:::

:::step{why="C2 = G1 + P1G0 + P1P0C0: two products."}
2 AND, 1 OR.
:::

:::step{why="C3 has three products, C4 four."}
3 + 4 more ANDs, 2 more ORs.
:::

:::answer
$1 + 2 + 3 + 4 = 10$ AND gates and 4 OR gates. ($G_i$ alone needs no AND: it is a literal.)
:::
::::

::::example{#ex-cost-gate level="gate" title="The 6-unit count (GATE 2004)" depth="standard"}
A 4-bit CLA uses only AND, OR, NOT, NAND, NOR gates, each 1 unit; complements of the inputs are free;
the carry network is two-level AND-OR. What is the overall delay?

:::step{why="No XOR gate is available: p_i = a_i b_i′ + a_i′ b_i is two-level logic (complements free)."}
$p_i$ at 2; $g_i = a_ib_i$ at 1.
:::

:::step{why="The carry network is AND-OR on p's and g's."}
$c_i$ at $2 + 2 = 4$.
:::

:::step{why="The sum s_i = p_i ⊕ c_i is again two-level (and needs the complements of p_i and c_i, which a dual-rail AND-OR network provides alongside)."}
$s_i$ at $4 + 2 = 6$.
:::

:::answer
6 time units. (With a single-gate XOR the same adder would take 4.)
:::
::::

::::example{#ex-cost-edge level="gate" title="Edge case: an 8-bit single-level CLA's widest gate" depth="standard"}
An 8-bit adder computes every carry in one two-level look-ahead unit. Give the widest AND gate, the
widest OR gate and the total number of AND gates.

:::step{why="The last term of c8 is p7 p6 … p0 c0."}
Widest AND: 9 inputs.
:::

:::step{why="c8 has one term per source: g7, …, g0 and c0."}
Widest OR: 9 inputs.
:::

:::step{why="ANDs: k products for c_k."}
$1 + 2 + \dots + 8 = 36$ AND gates and 8 ORs.
:::

:::answer
9-input gates and 36 ANDs. With 4-input gates the 9-input AND alone needs 2 levels, so the "4-level" CLA
is really deeper; this is why wide adders use the two-level (multi-level) scheme next.
:::
::::

## Group generate and propagate

:::intuition{#group-intuition title="A block of columns is just a fat column" depth="standard"}
Four columns together also either make a carry, kill one, or pass one through. A 4-bit block **makes** a
carry if one of its columns makes it and every column above it inside the block passes it; it **passes** a
carry from below only if all four of its columns pass. So a block has its own generate $G$ and propagate
$P$, and from the outside it behaves exactly like one bit position with those signals. That is all we need
to stack look-ahead units into a tree.
:::

:::definition{#group-gp term="Group generate and propagate" depth="standard"}
For a block of bits $0 \dots 3$ (and likewise for any block):

$$G = g_3 + p_3g_2 + p_3p_2g_1 + p_3p_2p_1g_0, \qquad P = p_3p_2p_1p_0.$$

$G$ is two gate levels after the $g$'s and $p$'s, $P$ one level.
:::

:::theorem{#group-gp-theorem name="A block behaves like one bit" depth="standard"}
For a block with carry in $c_{in}$ and carry out $c_{out}$: $\;c_{out} = G + P\,c_{in}$. Hence blocks can
be fed to a look-ahead unit exactly as bits are, with $(G_j, P_j)$ in place of $(g_j, p_j)$.
:::

:::proof{#proof-group-gp-theorem of="the block carry" depth="standard"}
**Idea first:** expand $c_4$ and split off the one term that involves the carry in.

From the expansion, $c_4 = g_3 + p_3g_2 + p_3p_2g_1 + p_3p_2p_1g_0 + p_3p_2p_1p_0\,c_0 = G + P\,c_0$. The same
algebra applies to any block of $k$ consecutive bits, and to a block of blocks (replace the bits' $g, p$ by
the sub-blocks' $G, P$), because the only property used is the recurrence $c_{out} = g + p\,c_{in}$, which the
theorem has just shown each block satisfies. So by induction on the level, every block at every level obeys
$c_{out} = G + P\,c_{in}$. ∎
:::

:::note{#recap-group title="Recap" depth="quick"}
Block: $G$ = "made inside and passed to the top", $P$ = "every column passes". $c_{out} = G + Pc_{in}$, so blocks
are bits for the next level.
:::

## Multi-level carry look-ahead

:::intuition{#tree-intuition title="Up the tree, then down" depth="standard"}
For 16 bits, group the bits into four 4-bit blocks. Each block computes its $G$ and $P$ (going **up**). A
second-level look-ahead unit, identical to the 4-bit one, treats the four blocks as four "bits" and computes
the block carries $c_4$, $c_8$, $c_{12}$, $c_{16}$. Each block then uses its carry in to compute its own three
inner carries (going **down**). For 64 bits add one more level. Every level costs two gate delays up and two
down, and the number of levels is $\log_4 n$: the delay grows like $\log n$ while every gate keeps fan-in at
most 5.
:::

:::definition{#multi-level-cla term="Multi-level (hierarchical) carry look-ahead" depth="standard"}
With blocks of $k$ bits and $n = k^d$:

1. Level 1: $p_i$, $g_i$ (1 gate delay).
2. Going up $d - 1$ levels: each block's $G$ (2 levels) and $P$ (1 level) from its $k$ sub-blocks.
3. At the top: one look-ahead unit makes the carries of the top-level blocks (2 levels).
4. Going down $d - 1$ levels: each block makes its inner carries from its carry in (2 levels each).
5. Sums $s_i = p_i \oplus c_i$ (1 level).

16-bit example ($k = 4$, $d = 2$), unit delays: $p, g$ at 1; $P$ at 2, $G$ at 3; $c_4$ at 4 and $c_8, c_{12}, c_{16}$
at 5; inner carries by 7; last sums at 8.
:::

:::viz{#tree-viz spec="cla-gp-tree" mode="animate" depth="standard"}
:::

:::theorem{#cla-log-delay name="Carry look-ahead delay is Θ(log n) with bounded fan-in" depth="standard"}
With fan-in-$k$ blocks and unit gate delays, the multi-level CLA of $n = k^d$ bits has delay at most
$4d = 4\log_k n$ (our fan-in-4 netlists reach it exactly: 4, 8 and 12 units for $n$ = 4, 16, 64), using gates of fan-in at most $k + 1$. And **no** adder
built from gates of fan-in at most $f$ can be faster than $\log_f(2n + 1)$ levels. So the best adder delay
with bounded fan-in is $\Theta(\log n)$.
:::

:::proof{#proof-cla-log-delay of="the logarithmic delay" depth="standard"}
**Idea first:** each tree level costs a constant, and a tree over $n$ leaves has $\log n$ levels; and no
circuit can look at $2n + 1$ inputs in fewer than $\log$ levels if each gate looks at only $f$ wires.

*Upper bound.* Level 1 costs 1. Going up: a block's $G$ is an AND level and an OR level over its $k$
sub-blocks' $G, P$, so each of the $d - 1$ upward levels adds 2 (its $P$, one AND, is ready earlier). The top
look-ahead unit adds 2. Each of the $d - 1$ downward levels adds 2 (AND with the block's carry in, then OR).
The sum adds 1. Total $1 + 2(d - 1) + 2 + 2(d - 1) + 1 = 4d$. The largest gates are the $(k+1)$-input ANDs and
ORs of the look-ahead units. The check script confirms the bound on the netlists: $k = 4$ gives exactly 4, 8, 12 for $n = 4, 16, 64$, and
$k = 2$ gives 4, 7, 11, 15 for $n = 2, 4, 8, 16$ (one unit under $4d$ from $n = 4$ on, because the first
block's carry is ready a level early).

*Lower bound.* The carry out $c_n$ depends on all $2n + 1$ inputs (flip any one of them in a suitable
pattern and $c_n$ flips, e.g. with every column propagating). A circuit of depth $D$ whose gates have fan-in
at most $f$ has an output depending on at most $f^D$ inputs. So $f^D \ge 2n + 1$, i.e.
$D \ge \log_f(2n + 1) = \Omega(\log n)$. ∎
:::

:::definition{#ic-74182 term="The 74181 and 74182 chips" depth="standard"}
The classic TTL family packaged this design. The **74181** is a 4-bit ALU slice that outputs its group
$G$ and $P$ (as well as a ripple carry out). The **74182** is a carry look-ahead generator: it takes the $G, P$
of four 4-bit slices and $c_0$ and produces the three block carries and its own group $G, P$. So 74182s can
themselves be grouped by another 74182. An $N$-bit adder of 74181s with a **tree** of 74182s has
$\log_4(N/4)$ levels of 74182s: its addition time is proportional to $\log N$ (GATE 1997). Chaining 74182s in
a line (or rippling the 74181s' carries) would be linear instead; "the best architecture" is the tree.
:::

:::trap{#trap-constant-time title="'A CLA adds in constant time'" depth="standard"}
The two-level formula has the same depth for every carry, so it is tempting to answer $\Theta(1)$. That is
true only if gates of **any** fan-in cost one unit. GATE 2016 says "fan-in at most two": then the wide ANDs
and ORs must be trees of 2-input gates ($\log n$ deep), or equivalently the adder is a multi-level CLA with
$k = 2$. Either way the delay is $\Theta(\log n)$, and the lower bound in the theorem shows nothing better is
possible. $\Theta(n)$ is the ripple adder; $\Theta(\sqrt n)$ is a carry-select or carry-skip adder with
$\sqrt n$-bit blocks.
:::

:::note{#recap-tree title="Recap" depth="quick"}
Blocks of $k$, $d = \log_k n$ levels, delay $4d$ unit gates (16 bits: 8, 64 bits: 12), fan-in $\le k + 1$.
Bounded fan-in ⇒ $\Theta(\log n)$, and that is optimal. 74181 + a tree of 74182s ⇒ time ∝ $\log N$.
:::

### Worked examples: multi-level look-ahead

::::example{#ex-ml-easy level="easy" title="Block G and P of a 4-bit block" depth="quick"}
A block has $a = 1001$, $b = 0110$ (bits 3 … 0). Find $G$ and $P$. What is its carry out for carry in 0 and 1?

:::step{why="Every column has one 1 and one 0."}
$g = 0000$, $p = 1111$.
:::

:::step{why="G needs a generating column; P needs all columns to propagate."}
$G = 0$, $P = 1$.
:::

:::answer
$c_{out} = G + Pc_{in} = c_{in}$: 0 or 1. Indeed $9 + 6 = 15 = 1111$: a carry in of 1 ripples straight out.
:::
::::

::::example{#ex-ml-medium level="medium" title="16-bit two-level CLA vs ripple" depth="standard"}
Unit gate delays. Compare a 16-bit ripple adder with a 16-bit two-level CLA (4-bit blocks).

:::step{why="Ripple: 2n + 1."}
$2 \cdot 16 + 1 = 33$.
:::

:::step{why="CLA: d = 2 levels, 4 units per level."}
$4 \cdot 2 = 8$: $p, g$ at 1, $G$ at 3, top carries by 5, inner carries by 7, sums at 8.
:::

:::answer
33 vs 8 gate delays, about 4× faster. Cost: 118 gates against 80 for the ripple adder (the lab's gate counter
adds 18 to each: the subtract XOR row and two flag gates).
:::
::::

::::example{#ex-ml-gate level="gate" title="64 bits: levels and delay" depth="standard"}
A 64-bit CLA uses 4-bit blocks throughout. How many look-ahead levels, and what is the delay (unit gates)?

:::step{why="Blocks of 4: 64 = 4³."}
$d = \log_4 64 = 3$ levels.
:::

:::step{why="Delay 4d."}
$4 \cdot 3 = 12$ units.
:::

:::step{why="Compare with ripple, 2n + 1."}
Ripple: 129 units.
:::

:::answer
3 levels, 12 gate delays (ripple: 129). Doubling the width twice (16 → 64) added just 4 units.
:::
::::

::::example{#ex-ml-edge level="gate" title="Edge case: 32 bits with fan-in-4 blocks" depth="standard"}
32 is not a power of 4. How is a 32-bit CLA with 4-bit blocks organised, and what is its delay?

:::step{why="Group 4-bit blocks into 16-bit superblocks; two superblocks remain at the top."}
Level 1: bits; level 2: eight 4-bit blocks; level 3: two 16-bit superblocks; the top unit looks ahead over just
two inputs.
:::

:::step{why="The tree still has 3 levels (⌈log4 32⌉ = 3), but the top unit is smaller."}
Our netlist gives 11 units, one less than 64 bits: the carry into the upper superblock is $c_{16} =
G_{0..15} + P_{0..15}c_0$, the shortest look-ahead term, ready at 6, while at 64 bits the top superblock waits
for $c_{48}$ at 7.
:::

:::answer
3 levels (⌈log₄ 32⌉), 11 gate delays in our construction: between the 16-bit (8) and 64-bit (12) adders. The
asymptotic answer is unchanged, $\Theta(\log n)$.
:::
::::

## Hybrid adders: carry-select, carry-skip and rippled CLA blocks

:::intuition{#hybrid-intuition title="Do the work twice so nobody waits" depth="standard"}
The upper half of an adder only needs one bit of information from the lower half: its carry. That carry is
either 0 or 1. So compute the upper half **both ways** in advance, and when the real carry arrives, simply
pick the right answer with a switch. It is like cooking two dinners because you do not yet know whether the
guest is vegetarian: wasteful, but the guest never waits.
:::

:::definition{#carry-select term="Carry-select adder" depth="standard"}
Split $n$ bits into blocks. The lowest block is an ordinary adder. Every higher block has **two** adders,
one with carry in 0 and one with carry in 1, and a row of 2:1 multiplexers (one per sum bit plus one for
the block's carry out) that picks the correct result using the carry out of the block below
([Chapter 5, Lesson 2](lesson:multiplexers) builds the 2:1 MUX; here it is a 2-level AND-OR switch).

Delay with $k$-bit ripple blocks (unit gates, MUX = 2): the lowest block $2k + 1$, then 2 per higher
block for the MUX chain: $2k + 1 + 2(n/k - 1)$. 8 bits in two 4-bit blocks: $9 + 2 = 11$ (ripple: 17). With
blocks of about $\sqrt n$ bits the delay is $\Theta(\sqrt n)$.
:::

:::viz{#csel-viz spec="carry-select" mode="animate" depth="standard"}
:::

:::aside{#carry-skip title="Further depth: the carry-skip adder" depth="deep"}
A **carry-skip** adder keeps ripple blocks but adds a bypass: if a block's $P = p_{k-1} \cdots p_0 = 1$, its
carry out equals its carry in, so a 2:1 MUX (or an AND-OR) lets the incoming carry **skip** the block instead
of rippling through it. The worst case is then a carry made in the lowest block, skipping the middle blocks,
and rippling through the top one, about $2k + 2(n/k) + 2k$ levels: again $\Theta(\sqrt n)$ for $k \approx
\sqrt n$, with far less hardware than carry-select (no duplicated adders).
:::

:::definition{#ripple-block-cla term="4-bit CLA blocks with rippled carries" depth="standard"}
A cheap compromise: build 4-bit CLA blocks and chain their carry outs like a ripple adder (a 74181-style
chain without the 74182). Each block's carry out is two levels after its carry in ($c_{4j+4} = G + Pc_{4j}$
written out in $p, g$). Unit delays: $p, g$ at 1, $c_4$ at 3, then $+2$ per block: $c_{16}$ at 9, last sum
at 10 for 16 bits. In general about $n/2 + 2$: linear, but with a quarter of the ripple adder's slope.
:::

:::table{#adder-compare title="Adders compared (unit gate delays, worst case)" depth="standard"}
| Adder | Delay | 16 bits | 64 bits | Hardware |
|:--|:--|:--|:--|:--|
| Ripple-carry | $2n + 1$ | 33 | 129 | $n$ FA (least) |
| 4-bit CLA blocks, rippled | $\approx n/2 + 2$ | 10 | 34 | small |
| Carry-select, 4-bit blocks | $9 + 2(n/4 - 1)$ | 15 | 39 | ~2× adders + MUXes |
| Carry-skip, $\sqrt n$ blocks | $\Theta(\sqrt n)$ | — | — | ripple + bypass |
| Multi-level CLA (fan-in 4) | $4\log_4 n$ | 8 | 12 | most wiring |
:::

## The bit-serial adder

:::intuition{#serial-intuition title="One full adder, used n times" depth="standard"}
The opposite of carry look-ahead: spend almost no hardware and a lot of time. Shift the two numbers out of
shift registers one bit per clock, least significant bit first, through a **single** full adder; store its carry
in a flip-flop so it is the carry in for the next bit, and shift the sum bit into a result register. After $n$
clocks the sum is complete. This is exactly the paper method done one column per tick.
:::

:::definition{#serial-adder term="Serial adder" depth="standard"}
Hardware: two $n$-bit shift registers (A and B), one full adder, one D flip-flop for the carry (cleared to 0,
or set to the carry in, before the first clock), and a shift register for the sum (often A itself). In clock
$i$ the full adder adds $a_i + b_i + c_i$; the clock edge stores $s_i$ and loads $c_{i+1}$ into the flip-flop.

Time: $n$ clock periods (each period only one full adder delay plus the flip-flop's). Hardware: one full
adder, independent of $n$. It is a **sequential** circuit (it has a state, the carry), unlike every other adder
in this lesson; the flip-flops themselves are in Chapter 6.
:::

### Worked examples: hybrid and serial adders

::::example{#ex-hy-easy level="easy" title="An 8-bit carry-select addition" depth="quick"}
An 8-bit carry-select adder adds $A = 0110\,1011$ and $B = 0011\,0110$ with 4-bit blocks. Which upper result is
chosen?

:::step{why="The lower block decides: 1011 + 0110."}
$11 + 6 = 17 = 1\,0001$: lower sum 0001, $c_4 = 1$.
:::

:::step{why="Both upper results were computed in advance."}
$0110 + 0011 + 0 = 1001$; $0110 + 0011 + 1 = 1010$.
:::

:::answer
$c_4 = 1$ selects 1010: $S = 1010\,0001 = 161 = 107 + 54$ ✓. The animation above runs this case.
:::
::::

::::example{#ex-hy-medium level="medium" title="Delay of the 8-bit carry-select adder" depth="standard"}
Unit gate delays, 4-bit ripple blocks, a 2:1 MUX costs 2 levels. Find the delay and compare with ripple.

:::step{why="All three 4-bit adders run in parallel."}
Each finishes by $2 \cdot 4 + 1 = 9$; in particular $c_4$ at 9.
:::

:::step{why="The MUX row needs its select c4, then 2 levels."}
Upper sums and $c_8$ at $9 + 2 = 11$.
:::

:::answer
11 gate delays vs 17 for an 8-bit ripple adder, for 3 adders + 5 MUXes instead of 2 adders' worth of cells.
:::
::::

::::example{#ex-hy-gate level="gate" title="16 bits of rippled 4-bit CLA blocks" depth="standard"}
Four 4-bit CLA blocks are chained: each block's carry out (from its own look-ahead unit) feeds the next block's
carry in. Unit gates. When are $c_4$, $c_8$, $c_{12}$, $c_{16}$ and the last sum ready?

:::step{why="Block 0: p/g at 1, then AND + OR."}
$c_4$ at 3.
:::

:::step{why="Each later block: its carry out is AND(P-terms, carry in) then OR: +2."}
$c_8$ at 5, $c_{12}$ at 7, $c_{16}$ at 9.
:::

:::step{why="The last block's inner carry c15 is 2 after c12; then one XOR."}
$c_{15}$ at 9, $s_{15}$ at 10.
:::

:::answer
Carries 3, 5, 7, 9; done at 10 units. Better than ripple (33), worse than the two-level CLA (8), and much
cheaper in wiring than the full tree.
:::
::::

::::example{#ex-hy-edge level="gate" title="Edge case: the serial adder's clocks and its carry flip-flop" depth="standard"}
A serial adder adds two 8-bit numbers $A = 1011\,0110$ and $B = 0110\,1101$. How many clocks does it take, what
must happen before the first clock, and what is in the carry flip-flop at the end?

:::step{why="One bit per clock, LSB first."}
8 clocks.
:::

:::step{why="The flip-flop is the carry in of bit 0; a leftover 1 from a previous addition would add 1."}
Clear the carry flip-flop (or load the intended $c_0$) before the first clock.
:::

:::step{why="The final carry flip-flop holds c8."}
$182 + 109 = 291 = 256 + 35$: sum $0010\,0011$, $c_8 = 1$.
:::

:::answer
8 clocks; clear the carry first; at the end the flip-flop holds the carry out 1 and the sum register
$0010\,0011$.
:::
::::

## Try it

On the lab's **Delay vs width** tab, the table shows the worst-case delays of the three designs for 4 to 64
bits, measured on the same netlists: the ripple column doubles with $n$, the carry-select column grows by 4 per
doubling of the number of blocks, and the look-ahead column grows by 4 only when $n$ is multiplied by 4. On the
**Race** tab, try 16 bits with $A = 1$, $B = -1$.

:::lab{#lab-scaling lab="adder-race" tab="scaling" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1997-a-15" tests="ic-74182,cla-log-delay" depth="standard"}
:::

:::pyq{id="cse-2004-cs-62" tests="cla-delay,cla-4bit" depth="standard"}
:::

:::pyq{id="cse-2006-cs-36" tests="cla-expansion,unroll-derivation,p-xor-or" depth="standard"}
:::

:::pyq{id="cse-2007-cs-35" tests="cla-gate-count,cla-4bit" depth="standard"}
:::

:::pyq{id="cse-2016-1-cs-33" tests="cla-log-delay,fan-in,trap-constant-time" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dl-04-02-q01" depth="standard"}
:::

:::practice{id="nx-dl-04-02-q02" depth="standard"}
:::

:::practice{id="nx-dl-04-02-q03" depth="standard"}
:::

:::practice{id="nx-dl-04-02-q04" depth="standard"}
:::

:::practice{id="nx-dl-04-02-q05" depth="standard"}
:::

:::practice{id="nx-dl-04-02-q06" depth="standard"}
:::

:::practice{id="nx-dl-04-02-q07" depth="standard"}
:::

:::practice{id="nx-dl-04-02-q08" depth="standard"}
:::

:::practice{id="nx-dl-04-02-q09" depth="standard"}
:::

:::practice{id="nx-dl-04-02-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Carry look-ahead on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Generate, propagate | $g_i = a_ib_i$, $p_i = a_i \oplus b_i$ (may be $a_i + b_i$ for carries, never for sums) |
| Recurrence | $c_{i+1} = g_i + p_ic_i$, $s_i = p_i \oplus c_i$ |
| Expansion | $c_4 = g_3 + p_3g_2 + p_3p_2g_1 + p_3p_2p_1g_0 + p_3p_2p_1p_0c_0$ |
| 4-bit CLA delay | 4 unit gates; 6 if XOR is two-level AND-OR (GATE 2004) |
| Carry unit cost | $n(n+1)/2$ ANDs, $n$ ORs (4 bits: 10 and 4, GATE 2007); widest gate $n + 1$ inputs |
| Block | $G = g_3 + p_3g_2 + p_3p_2g_1 + p_3p_2p_1g_0$, $P = p_3p_2p_1p_0$, $c_{out} = G + Pc_{in}$ |
| Multi-level | $d = \log_k n$ levels, delay $4d$ (16 bits 8, 64 bits 12); bounded fan-in ⇒ $\Theta(\log n)$, optimal |
| 74181/74182 | slices + a tree of look-ahead generators: time ∝ $\log N$ (GATE 1997) |
| Hybrids | carry-select $2k + 1 + 2(n/k - 1)$, $\Theta(\sqrt n)$ with $\sqrt n$ blocks; carry-skip similar; rippled CLA blocks $\approx n/2 + 2$ |
| Serial adder | 1 FA + carry flip-flop; $n$ clocks; clear the carry first |
:::
