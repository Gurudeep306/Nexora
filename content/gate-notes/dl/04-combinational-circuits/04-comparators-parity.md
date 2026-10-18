---
id: comparators-parity
subject: dl
chapter: combinational-circuits
title: "Magnitude comparators and parity circuits"
order: 4
prerequisites: [combinational-design, xor-and-operators]
pyq_topics: [dl/combinational]
est_minutes: 30
difficulty: core
status: draft
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every comparator output, row count, gate count, cascade result, parity bit, XOR-tree size and MUX residue is checked by enumeration in content/gate-notes/_checks/dl/l4_04_compare.py (comblib netlists, exhaustive theorem checks for small n)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 61–63, set B pp. 132–133, set C pp. 221, 279–280 and 294–295. Slips A 61/63 and C 221 are in _errata/dl.md."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (magnitude comparators, parity generators and checkers); the cascade inputs follow the usual 4-bit comparator chip convention."
  - "PYQs: none. No question in src/gate/questions.json tests comparator or parity circuits directly (outline: 0); related parity PYQs are embedded in dl-02-03."
updated: "2026-10-18"
---

Two circuits in this lesson answer two of the most common questions a computer asks about bits. A
**magnitude comparator** answers "which of these two numbers is bigger?", and a **parity circuit**
answers "has any bit of this word been flipped?". Both look like simple gate puzzles, and both rest on
one clean idea each. For the comparator the idea is that numbers compare like words in a dictionary:
the first place they differ settles everything. For parity it is that an XOR of many bits only cares
whether the number of 1s is odd. We prove both ideas, build the circuits, count their gates, chain
small comparators into big ones, and see exactly which errors parity can and cannot catch.

## Where this fits

[Lesson 1](lesson:combinational-design) gave the design procedure (specification → truth table →
minimal expression → gates); here we run it on two classic specifications. The XOR and XNOR laws come
from [Chapter 2, Lesson 3](lesson:xor-and-operators), which already proved that an $n$-input XOR
computes odd parity; parity bits as a *code* were introduced in [Chapter 1, Lesson 8](lesson:codes).
Comparing numbers by subtracting them is arithmetic, taught in [Chapter 1, Lesson 9](lesson:code-arithmetic);
this lesson only shows how the borrow and the zero test turn a subtractor into a comparator.
[Lesson 2](lesson:multiplexers) supplies the multiplexer on which the Live Lab realises a comparator.

:::table{#radar title="GATE radar: comparators and parity" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 0: GATE has not asked about comparator or parity circuits directly |
| Why it still matters | Comparators and XOR trees are standard building blocks inside every ALU, cache tag check and branch unit; the reasoning (first differing bit, $n - 1$ gates for $n$ inputs) appears in COA questions on comparisons, tag matching and condition flags |
| Related PYQs elsewhere | Parity of an XOR chain: it-2005-cs-7 and cse-2016-2-cs-8 in [Chapter 2, Lesson 3](lesson:xor-and-operators); signed overflow behind "compare by subtracting": [Chapter 1, Lesson 9](lesson:code-arithmetic) |
| Likely question shapes | Which expression gives A > B; how many input rows make A > B; which term of the comparator expression fires; chips in a cascade; a parity bit; XOR gates and depth for n inputs; which error patterns parity detects |
| What examiners would test | Scanning from the MSB (not the LSB), the XNOR as the per-bit equality test, the counts $2^n$ and $(4^n - 2^n)/2$, rounding up the number of chips, even parity meaning an even total *including* the parity bit, and that parity misses every even number of errors |
:::

## Comparing two numbers: the first difference decides

:::intuition{#compare-intuition title="Numbers compare like words in a dictionary" depth="standard"}
To decide whether "carton" comes before "cartel" in a dictionary, you read both words from the left,
skip the letters they share ("cart"), and stop at the first letter where they differ: "o" against "e";
"e" comes first in the alphabet, so "cartel" comes before "carton". That one letter decides the order, and nothing after it matters ("n" against "l" is never looked at).

Binary numbers of the same length work exactly the same way, with the most significant bit (MSB) playing
the role of the first letter. Compare $A = 1010$ and $B = 1001$: the first two bits agree (1 and 1, then
0 and 0); the third bit is the first difference, and there $A$ has the 1. So $A > B$, whatever the last
bits say. Indeed the last bits point the other way ($A_0 = 0$, $B_0 = 1$), and they are simply outvoted:
the bit where the numbers first differ is worth more than all the bits below it put together.

A comparator circuit is this reading procedure turned into gates: one small test per bit ("are these
two bits equal?"), and a rule that lets a bit speak only when every bit above it has said "equal".
:::

:::definition{#one-bit-comparator term="1-bit comparator" depth="standard"}
A **magnitude comparator** for $n$-bit unsigned numbers $A$ and $B$ has three outputs: $G$ ($A > B$),
$E$ ($A = B$) and $L$ ($A < B$). For one bit the truth table has four rows:

| $A$ | $B$ | $G$ | $E$ | $L$ |
|:--|:--|:--|:--|:--|
| 0 | 0 | 0 | 1 | 0 |
| 0 | 1 | 0 | 0 | 1 |
| 1 | 0 | 1 | 0 | 0 |
| 1 | 1 | 0 | 1 | 0 |

Reading each column as a sum of its rows:
$$
G = AB', \qquad E = A'B' + AB = A \odot B = (A \oplus B)', \qquad L = A'B .
$$
On every row **exactly one** of $G$, $E$, $L$ is 1, because exactly one of the three relations holds
between two numbers. So any one output can be made from the other two: $E = (G + L)'$, a NOR.

Gate cost with only uncomplemented inputs: two inverters, two ANDs ($G$, $L$) and one NOR for $E$
(or an XNOR on $A$, $B$). An all-NOR version needs only four NOR gates and no inverters: let
$N = (A + B)'$; then $(A + N)' = A'B = L$, $(B + N)' = AB' = G$ and $(G + L)' = E$.
:::

:::intuition{#equality-intuition title="Equal means equal in every position" depth="standard"}
Two words are the same word only if they agree letter by letter, in every position. For bits that is
a chain of "and": bit 3 agrees **and** bit 2 agrees **and** … **and** bit 0 agrees. The per-bit
agreement test is the XNOR from the table above, because XNOR is 1 exactly when its two inputs are
equal. So an equality comparator is a row of XNOR gates feeding one AND gate.
:::

:::definition{#equality term="Equality comparator" depth="standard"}
For $n$-bit numbers write $x_i = A_i \odot B_i = A_iB_i + A_i'B_i'$ (1 exactly when bit $i$ of $A$ equals bit
$i$ of $B$). Then
$$
E = (A = B) = x_{n-1}\,x_{n-2} \cdots x_1\,x_0 .
$$
Hardware: $n$ XNOR gates and one $n$-input AND. With 2-input gates only, the AND becomes a tree of
$n - 1$ two-input ANDs, so $2n - 1$ gates in all. Equivalently $E = \overline{(A_{n-1} \oplus B_{n-1}) + \dots + (A_0 \oplus B_0)}$:
$n$ XORs and one NOR ("no bit differs").

The animation below builds this circuit for 4-bit numbers: a row of four XNORs, one per bit position,
feeding one AND. A single unequal position is enough to make the AND output 0.
:::

:::viz{#equality-viz spec="equality-xnor" mode="animate" depth="standard"}
:::

:::theorem{#equality-theorem name="Equality is the AND of the bitwise XNORs" depth="standard"}
For $n$-bit unsigned numbers, $A = B$ as numbers if and only if $A_i = B_i$ for every $i$, that is,
if and only if $x_{n-1} x_{n-2} \cdots x_0 = 1$.
:::

:::proof{#proof-equality-theorem of="the equality theorem" depth="standard"}
**Idea first:** a binary number has only one way of being written in $n$ bits, so equal values force
equal bit patterns.

If every bit agrees, then $A = \sum A_i 2^i = \sum B_i 2^i = B$. Conversely, suppose some bit differs, and
let $k$ be the highest such bit. The bits above $k$ agree and cancel in $A - B$; bit $k$ contributes
$\pm 2^k$, and the lower bits together are worth at most $2^k - 1$ (because $1 + 2 + \dots + 2^{k-1} = 2^k - 1$).
So $|A - B| \ge 2^k - (2^k - 1) = 1$, and $A \ne B$. (Equivalently: binary representation is unique,
which is the place-value fact of Chapter 1.) So $A = B$ exactly when every $x_i = 1$, which is exactly
when their AND is 1.
:::

:::intuition{#magnitude-intuition title="A bit may speak only if every bit above it is silent" depth="standard"}
Now the harder output, $G$. Think of the bits as a committee that votes from the most senior member
down. The MSB votes first: if $A_{n-1} = 1$ and $B_{n-1} = 0$, then $A > B$ and the meeting is over. If
the MSBs are equal, the MSB abstains and the next bit gets to vote, but **only** because the MSB
abstained. Bit $i$ can declare "$A$ is bigger" only when all the bits above it are equal (every $x_j = 1$
for $j > i$) and bit $i$ itself is $A_i = 1$, $B_i = 0$. Write one product term for each bit that could
be the first difference, and OR them together. That sentence *is* the comparator.
:::

:::definition{#magnitude term="The n-bit magnitude comparator" depth="standard"}
With $x_i = A_i \odot B_i$, for 4-bit numbers $A_3A_2A_1A_0$ and $B_3B_2B_1B_0$:
$$
\begin{aligned}
G = (A > B) &= A_3B_3' + x_3\,A_2B_2' + x_3x_2\,A_1B_1' + x_3x_2x_1\,A_0B_0', \\
L = (A < B) &= A_3'B_3 + x_3\,A_2'B_2 + x_3x_2\,A_1'B_1 + x_3x_2x_1\,A_0'B_0, \\
E = (A = B) &= x_3x_2x_1x_0 .
\end{aligned}
$$
In general, the term for bit $k$ is $\left(\prod_{j > k} x_j\right) A_k B_k'$: the equalities of all higher
bits, then "$A$ has the 1 here". $L$ is the same with the roles of $A$ and $B$ swapped. For $n$ bits each of
$G$ and $L$ has $n$ terms. We call these expressions the **MSB-first form** of the comparator (the word
"cascade" is kept for chains of comparator chips, later in this lesson). The 2-bit and 3-bit cases are
$$
G_2 = A_1B_1' + x_1A_0B_0', \qquad G_3 = A_2B_2' + x_2A_1B_1' + x_2x_1A_0B_0' .
$$
:::

:::theorem{#magnitude-theorem name="The most significant differing bit decides" depth="standard"}
Let $A \neq B$ be $n$-bit unsigned numbers and let $k$ be the **highest** position where they differ.
Then $A > B$ if and only if $A_k = 1$ (and $B_k = 0$). Consequently numeric order on $n$-bit strings is
lexicographic order (read from the MSB), and the expression for $G$ above is 1 exactly when $A > B$.
:::

:::proof{#proof-magnitude-theorem of="the magnitude-comparator theorem" depth="standard"}
**Idea first:** a single bit at position $k$ is worth $2^k$, while all the bits below it together are
worth at most $2^k - 1$. So the first difference outweighs everything after it.

Bits above $k$ agree, so they cancel in the difference:
$$
A - B = (A_k - B_k)\,2^k + \sum_{i < k} (A_i - B_i)\,2^i .
$$
Each $A_i - B_i$ is $-1$, $0$ or $1$, so the tail lies between $-(2^k - 1)$ and $2^k - 1$ (the sum
$1 + 2 + \dots + 2^{k-1} = 2^k - 1$). If $A_k = 1, B_k = 0$, then $A - B \ge 2^k - (2^k - 1) = 1 > 0$. If
$A_k = 0, B_k = 1$, then $A - B \le -2^k + (2^k - 1) = -1 < 0$. That is the first claim, and it is exactly
the dictionary rule, so numeric and lexicographic order agree.

Now the expression. The term for bit $k$, $\left(\prod_{j>k} x_j\right)A_kB_k'$, is 1 exactly when bits above $k$
agree and bit $k$ is the first difference with $A_k = 1$. When $A > B$, the first difference $k$ has $A_k = 1$
(by the first part), so that term is 1 and $G = 1$. When $A \le B$, no term can be 1: a term for bit $k$ would
make $k$ the first difference with $A_k = 1$, which forces $A > B$. Hence $G = 1 \iff A > B$. Since at most
one position is "the first difference", **at most one term is 1** on any row: the terms are disjoint,
which is why an OR of them never double-counts.
:::

:::viz{#magnitude-viz spec="comparator-cascade" mode="animate" depth="standard"}
:::

:::derivation{#comparator-count of="the number of rows on which G, E and L are 1" depth="standard"}
A comparator of two $n$-bit numbers has $2n$ inputs, so $4^n$ rows.

- $E = 1$ when $B$ is the same number as $A$: one choice of $B$ for each of the $2^n$ values of $A$, so
  **$2^n$ rows**.
- The other $4^n - 2^n$ rows have $A \ne B$. Swapping $A$ and $B$ turns every row with $A > B$ into one with
  $A < B$ and back, a one-to-one pairing, so the two counts are equal: $G$ and $L$ each have
  **$(4^n - 2^n)/2$ rows**.

**Sanity check.** $n = 1$: $E$ has 2 rows, $G$ and $L$ one each (the table above: rows 00 and 11 for
$E$, 10 for $G$, 01 for $L$). $n = 2$: $E$ has 4 rows, $G$ and $L$ have $(16 - 4)/2 = 6$ each, and
$4 + 6 + 6 = 16$. Direct count for $G$: $A = 1$ beats one value, $A = 2$ two, $A = 3$ three, so $1 + 2 + 3 = 6$.
For $n = 3$: $8$, $28$, $28$; for $n = 4$: $16$, $120$, $120$.
:::

:::note{#erratum-comparator title="A misprint to avoid (comparator subscripts)" depth="standard"}
Some printed notes write the 3-bit comparator's last term as $(A_0 \odot B_0)(A_1 \odot B_1)A_0B_0'$ and
use $A_1B_0$ where $B_1B_0$ is meant. Both are subscript slips. The correct third term of $G_3$ is
$$
(A_2 \odot B_2)(A_1 \odot B_1)\,A_0B_0' ,
$$
the equalities of the **higher** bits 2 and 1, followed by the test at bit 0. The misprinted version can
never be 1: $A_0 \odot B_0 = 1$ says bit 0 is equal, while $A_0B_0' = 1$ says it is not. If you copy it, your
comparator silently misses every pair that first differs in bit 0, for example $A = 101$, $B = 100$.
A term's equality factors always come from the bits **above** its own bit, never from the bit itself.
:::

:::trick{#trick-first-difference title="Scan from the MSB to the first unequal bit" depth="standard"}
To compare two bit strings of equal length by eye: write one above the other, run your finger from
the left, and stop at the first column that differs. Whichever number has the 1 there is larger; if no
column differs they are equal. In the expression, the term that fires is the one for that column.

**Why it works:** the magnitude theorem, a bit outweighs all the bits below it combined.
**When it fails:** if the strings have different lengths (pad the shorter one with leading 0s first),
if the numbers are signed (the sign bit has negative weight; see the signed-comparison trap below),
and for codes that are not plain binary (Gray code order is not numeric order: Gray $0011$ is 2, Gray
$0010$ is 3).
:::

:::trap{#trap-lsb-first title="Scanning from the least significant bit" depth="standard"}
Reading from the right feels natural to people used to adding numbers, and it gives the wrong answer.
For $A = 1010$ and $B = 1001$ the first difference seen from the **right** is bit 0, where $B$ has the 1,
so the LSB-first reader answers "$A < B$" (or picks the fourth term $x_3x_2x_1A_0'B_0$ of $L$). The true
answer is $A > B$ ($10 > 9$), decided by bit 1, the first difference seen from the **left**. Likewise the
expression $A_1B_1' + A_0B_0'$ (forgetting the $x_1$ factor) claims $01 > 10$, because it lets bit 0 vote
even when bit 1 has already decided against $A$.
:::

### Worked examples: comparators

::::example{#ex-cmp-easy level="easy" title="The 1-bit comparator from its table" depth="quick"}
Design a circuit with outputs $G$, $E$, $L$ for one-bit inputs $A$ and $B$, and check that exactly one
output is 1 on each row.

:::step{why="The specification is three yes/no questions about two bits, so the truth table has four rows and three output columns."}
Rows $(A, B) = 00, 01, 10, 11$ give $(G, E, L) = (0,1,0), (0,0,1), (1,0,0), (0,1,0)$.
:::

:::step{why="Each of G and L is 1 on a single row, so each is one minterm; E is 1 on the two rows where the bits agree, which is the XNOR."}
$G = AB'$, $L = A'B$, $E = A'B' + AB = A \odot B$.
:::

:::step{why="Adding the three columns row by row gives 1 everywhere, so the outputs never overlap and never all stay 0."}
Each row has exactly one 1, so $E = (G + L)'$ could replace the XNOR by a NOR of the other two outputs.
:::

:::answer
$G = AB'$, $E = A \odot B$, $L = A'B$: two inverters, two ANDs and one XNOR (or NOR of $G$ and $L$).
:::
::::

::::example{#ex-cmp-medium level="medium" title="2-bit A > B as a minimal SOP" depth="standard"}
For $A = A_1A_0$ and $B = B_1B_0$, find the minterms and the minimal SOP of $G = (A > B)$, with the
variable order $A_1, A_0, B_1, B_0$.

:::step{why="List the pairs with A > B and write each as a 4-bit row number A1 A0 B1 B0."}
$A = 1$: $B = 0$ (row 4). $A = 2$: $B = 0, 1$ (rows 8, 9). $A = 3$: $B = 0, 1, 2$ (rows 12, 13, 14).
$G = \Sigma m(4, 8, 9, 12, 13, 14)$, six rows as the count predicts.
:::

:::step{why="On the K-map (rows A1A0, columns B1B0), rows 8, 9, 12, 13 form a quad with A1 = 1 and B1 = 0."}
Quad: $A_1B_1'$.
:::

:::step{why="Row 4 pairs with row 12 (A1 changes), giving A0 B1′ B0′; row 14 pairs with row 12 (B1 changes), giving A1 A0 B0′. Neither fits in a quad."}
Pairs: $A_0B_1'B_0'$ and $A_1A_0B_0'$.
:::

:::step{why="Cross-check against the MSB-first form: x1 A0 B0′ splits into A1′B1′A0B0′ + A1B1A0B0′, which are rows 4 and 14, and the first is inside the pair 4–12, the second inside 12–14."}
$A_1B_1' + (A_1 \odot B_1)A_0B_0'$ has the same six minterms.
:::

:::answer
$G = A_1B_1' + A_0B_1'B_0' + A_1A_0B_0'$ (8 literals, minimal), equal to the MSB-first form
$A_1B_1' + (A_1 \odot B_1)A_0B_0'$, which is cheaper in gates once the XNOR $x_1$ is shared with $E$.
:::
::::

::::example{#ex-cmp-gate level="gate" title="Which term of the 4-bit comparator fires?" depth="standard"}
A 4-bit comparator receives $A = 1010$ and $B = 1001$. Which term of
$G = A_3B_3' + x_3A_2B_2' + x_3x_2A_1B_1' + x_3x_2x_1A_0B_0'$ is 1, and what are $G$, $E$, $L$?

:::step{why="The x's are the per-bit equality tests that gate every lower term, so compute them first."}
Bits (3, 2, 1, 0): $A$ = 1, 0, 1, 0; $B$ = 1, 0, 0, 1. So $x_3 = 1$, $x_2 = 1$, $x_1 = 0$, $x_0 = 0$.
:::

:::step{why="Evaluate term by term from the MSB; each term needs every higher x to be 1."}
$A_3B_3' = 1 \cdot 0 = 0$; $x_3A_2B_2' = 1 \cdot 0 \cdot 1 = 0$; $x_3x_2A_1B_1' = 1 \cdot 1 \cdot 1 \cdot 1 = 1$;
$x_3x_2x_1A_0B_0' = 0$ (because $x_1 = 0$).
:::

:::step{why="The fourth term is blocked by x1 = 0: bit 0 never gets a vote once bit 1 has decided. The same blocking keeps every term of L at 0."}
$L$: its bit-0 term $x_3x_2x_1A_0'B_0$ would be 1 without the $x_1$ factor, but $x_1 = 0$, so $L = 0$. $E = x_3x_2x_1x_0 = 0$.
:::

:::answer
The third term, $x_3x_2A_1B_1'$, fires: $G = 1$, $E = 0$, $L = 0$ ($10 > 9$). The tempting "fourth term
of $L$" is exactly the LSB-first trap.
:::
::::

::::example{#ex-cmp-edge level="gate" title="Edge case: A = B, where every magnitude term is 0" depth="standard"}
What do the three outputs of the 4-bit comparator show when $A = B = 0110$?

:::step{why="Equal numbers make every bit equal, so every XNOR is 1."}
$x_3 = x_2 = x_1 = x_0 = 1$, so $E = 1$.
:::

:::step{why="Every term of G ends with Ak Bk′, which needs the two bits at k to differ; equal bits make each of these factors 0, whatever the x's say."}
$A_kB_k' = 0$ for every $k$, so all four terms are 0 and $G = 0$; likewise every $A_k'B_k = 0$, so $L = 0$.
:::

:::answer
$(G, E, L) = (0, 1, 0)$. Equality is the one case where every bit "abstains"; the comparator still
gives exactly one 1, now on $E$. (A design that computed only $G$ and $L$ and then set $E = 1$ by
default would be correct too, as $E = (G + L)'$.)
:::
::::

:::note{#recap-comparators title="Recap" depth="quick"}
$x_i = A_i \odot B_i$; $E = \prod x_i$; $G = \sum_k \left(\prod_{j>k} x_j\right)A_kB_k'$, and $L$ the mirror image.
The first differing bit from the MSB decides, because it outweighs all lower bits. $E$ has $2^n$ rows,
$G$ and $L$ have $(4^n - 2^n)/2$ each. Equality factors come only from higher bits.
:::

## Cascading comparators and counting their gates

:::intuition{#cascade-intuition title="Ask the senior chip first, and let it defer" depth="standard"}
A wide comparator does not have to be designed from scratch. Split two 8-bit numbers into a high half
and a low half. If the high halves differ, they settle the question on their own (the magnitude
theorem applied to 4-bit "digits" of value up to 15). Only if the high halves are equal does the low
half matter. So a chip that compares the high halves needs just one extra piece of information: the
verdict of the chip below it, to pass on when its own halves are equal. That is exactly what the
three **cascade inputs** of a standard 4-bit comparator chip carry.
:::

:::definition{#cascade term="Cascade inputs and the ripple chain" depth="standard"}
A 4-bit comparator chip has data inputs $A_3..A_0$, $B_3..B_0$, outputs $G$, $E$, $L$, and cascade inputs
$G_{in}$, $E_{in}$, $L_{in}$ that carry the result of the less significant bits. With $G_4$, $E_4$, $L_4$ its own
4-bit results,
$$
G = G_4 + E_4\,G_{in}, \qquad E = E_4\,E_{in}, \qquad L = L_4 + E_4\,L_{in} .
$$
To compare $4m$-bit numbers, chain $m$ chips: the least significant chip's outputs drive the next chip's
cascade inputs, and so on up; the most significant chip's outputs are the answer. The least significant
chip's cascade inputs are tied to $(G_{in}, E_{in}, L_{in}) = (0, 1, 0)$: "nothing below, so far equal".
For $n$ bits the chain needs $\lceil n/4 \rceil$ chips (unused high inputs of the top chip are tied
equal, for example all 0), and a verdict may ripple through $\lceil n/4 \rceil - 1$ links.

The animation after the proof below chains two chips into an 8-bit comparator: when the high chip's own
halves are equal ($E_4 = 1$), it passes the low chip's verdict straight through.
:::

:::theorem{#cascade-theorem name="A chain of comparators compares the whole numbers" depth="standard"}
Split $A = (A_{hi}, A_{lo})$ and $B = (B_{hi}, B_{lo})$ into a high part and a low part of $\ell$ bits. Then
$A > B$ iff $A_{hi} > B_{hi}$, or $A_{hi} = B_{hi}$ and $A_{lo} > B_{lo}$; and $A = B$ iff both parts are equal.
Hence the cascade equations above, applied chip by chip from the bottom, give the correct $G$, $E$, $L$
for the full width.
:::

:::proof{#proof-cascade-theorem of="the cascade theorem" depth="standard"}
**Idea first:** a high part is a "digit" in base $2^\ell$; the magnitude theorem works in any base.

$A = A_{hi}\,2^\ell + A_{lo}$ with $0 \le A_{lo} < 2^\ell$, and the same for $B$. If $A_{hi} > B_{hi}$, then
$A - B \ge 2^\ell - (2^\ell - 1) = 1$, the same weight argument as in the magnitude theorem with $2^\ell$ in
place of $2^k$; symmetrically for $A_{hi} < B_{hi}$. If $A_{hi} = B_{hi}$, then $A - B = A_{lo} - B_{lo}$. These
three cases are the equations $G = G_{hi} + E_{hi}G_{lo}$ and so on. For a chain of $m$ chips, induct on $m$:
the bottom chip with cascade inputs $(0, 1, 0)$ outputs its own result; if the outputs of the bottom
$m - 1$ chips are correct for the low part, the $m$-th chip combines them with its own bits correctly
by the two-part case.
:::

:::viz{#cascade-viz spec="comparator-chain" mode="animate" depth="standard"}
:::

:::derivation{#comparator-cost of="the gate count of the MSB-first comparator" depth="standard"}
This counts the MSB-first construction of this lesson (the expressions for $G$, $E$, $L$ above); it is not
claimed to be minimal.


**Gate model:** complemented inputs are free, AND and OR gates of any fan-in, and we count gates.
Build each bit as the 1-bit comparator: $P_k = A_kB_k'$ and $Q_k = A_k'B_k$ (two ANDs) and
$x_k = (P_k + Q_k)'$ (one NOR, which is the XNOR of the two bits). That is $3n$ gates for $n$ bits.

- $E$: one $n$-input AND of the $x$'s: 1 gate.
- $G$: the top term is $P_{n-1}$ itself (no new gate). Each lower term $x_{n-1}\cdots x_{k+1}P_k$ is one AND:
  $n - 1$ gates. One OR combines the $n$ terms: 1 gate.
- $L$: the same with $Q_k$: $n - 1$ ANDs and 1 OR.

Total: $3n + 1 + n + n = 5n + 1$ gates for $n \ge 2$. **Sanity check:** $n = 2$ gives 11 (built and
simulated in the medium example below); $n = 4$ gives 21. For $n = 1$ the formula does not apply: $E$
is $x_0$ itself and $G$, $L$ need no OR, so 3 gates.

The widest gates grow with $n$ (the bit-0 terms and $E$ have $n$ inputs each), which is why real designs stop at 4
bits per block and cascade.
:::

:::intuition{#signed-intuition title="Negative numbers wear the wrong badge" depth="standard"}
An unsigned comparator trusts the MSB to be the most valuable bit. In 2's complement the MSB is the
**sign** bit and is worth $-2^{n-1}$: a 1 there makes the number *smaller*, not larger. So feeding signed
numbers straight into an unsigned comparator ranks every negative number above every positive one.
The cure is a relabelling: flip the sign bit, and the numbers line up again in the right order.
:::

:::theorem{#signed-compare name="Signed comparison by flipping the sign bits" depth="standard"}
For $n$-bit 2's complement numbers $A$ and $B$, $A > B$ (as signed values) if and only if
$A \oplus 10\cdots0 > B \oplus 10\cdots0$ as unsigned numbers. So a signed comparator is an unsigned one with an
inverter on each sign bit.
:::

:::proof{#proof-signed-compare of="signed comparison by flipping the sign bits" depth="standard"}
**Idea first:** flipping the MSB is the same as adding $2^{n-1}$, a shift that preserves order.

A 2's complement pattern with value $v$ ($-2^{n-1} \le v < 2^{n-1}$) has unsigned value $v$ if $v \ge 0$ and
$v + 2^n$ if $v < 0$. Flipping the MSB adds $2^{n-1}$ to that unsigned value when the MSB is 0 and subtracts
$2^{n-1}$ when it is 1; in both cases the result is $v + 2^{n-1}$ (for $v < 0$: $v + 2^n - 2^{n-1}$). So the
flipped patterns, read unsigned, are the signed values shifted up by the same constant $2^{n-1}$, which
lands them in $0 \dots 2^n - 1$ without changing their order.
:::

:::trap{#trap-signed-compare title="Signed numbers in an unsigned comparator" depth="standard"}
With $A = 1110$ ($-2$) and $B = 0011$ ($+3$) in 4-bit 2's complement, an unsigned comparator sees $14$
against $3$ and raises $G$. The expected wrong answer is "$A > B$". The signed truth is $-2 < 3$. Flip both
sign bits (or, equivalently, swap the roles of $A_3$ and $B_3$ in the first term of $G$ and in the first
term of $L$; $x_3$ is unchanged) before comparing. When
the two sign bits are equal, the unsigned and signed answers agree, so the trap only bites when the
signs differ.
:::

### Worked examples: cascades and cost

::::example{#ex-cas-easy level="easy" title="Two 4-bit chips for an 8-bit comparison" depth="quick"}
Compare $A = 0101\,1100$ and $B = 0101\,0111$ with two cascaded 4-bit chips.

:::step{why="The low chip's cascade inputs are tied to (0, 1, 0), so its outputs are just its own comparison."}
Low chip: $1100$ against $0111$, i.e. $12 > 7$, so it outputs $(G, E, L) = (1, 0, 0)$.
:::

:::step{why="The high chip compares its halves; they are equal, so E4 = 1 and it passes the low chip's verdict through."}
High chip: $0101 = 0101$, so $E_4 = 1$, $G = G_4 + E_4G_{in} = 0 + 1 \cdot 1 = 1$, $E = E_4E_{in} = 0$, $L = 0$.
:::

:::answer
$A > B$ ($92 > 87$): the high chip deferred to the low chip, exactly as the dictionary rule defers to the
next letter.
:::
::::

::::example{#ex-cas-medium level="medium" title="The gates of a 2-bit comparator" depth="standard"}
Count the gates of a 2-bit comparator built as in the cost derivation (complements free) and confirm
that it computes $G$, $E$, $L$ on all 16 rows.

:::step{why="Each bit needs its own 1-bit comparator: the two ANDs give A>B and A<B for that bit, the NOR of them is the equality x."}
Bits 1 and 0: $P_1, Q_1, x_1$ and $P_0, Q_0, x_0$: 6 gates.
:::

:::step{why="E needs both bits equal; G and L each need one AND for the bit-0 term (the bit-1 term is P1 or Q1 itself) and one OR."}
$E = x_1x_0$ (1 AND); $G = P_1 + x_1P_0$ (1 AND, 1 OR); $L = Q_1 + x_1Q_0$ (1 AND, 1 OR): 5 gates.
:::

:::step{why="A circuit is only right if every row is right; simulating all 16 rows of (A1, A0, B1, B0) is the honest check."}
Simulated: $G$ is 1 on rows 4, 8, 9, 12, 13, 14; $E$ on 0, 5, 10, 15; $L$ on the other six. All agree with
$A > B$, $A = B$, $A < B$.
:::

:::answer
11 gates ($= 5 \cdot 2 + 1$). Using the two-level minimal SOPs separately would cost more, because the
MSB-first form shares $x_1$, $P_1$ and $Q_1$ among the three outputs.
:::
::::

::::example{#ex-cas-gate level="gate" title="A 12-bit comparator from 4-bit chips" depth="standard"}
How many 4-bit comparator chips compare two 12-bit numbers, how are the end cascade inputs tied, and
what is the result for $A = \text{7A3}_{16}$, $B = \text{7A9}_{16}$?

:::step{why="Each chip handles one hex digit (4 bits), and the chain needs one chip per digit, rounded up."}
$\lceil 12/4 \rceil = 3$ chips: digits 7, A, 3 against 7, A, 9.
:::

:::step{why="The least significant chip has nothing below it, so its cascade inputs must say 'equal so far'."}
Bottom chip: $(G_{in}, E_{in}, L_{in}) = (0, 1, 0)$; it compares $3$ with $9$ and outputs $L = 1$.
:::

:::step{why="The middle and top chips see equal digits (A = A and 7 = 7), so E4 = 1 at each and the verdict ripples up through two links."}
Middle chip passes $L = 1$; top chip passes $L = 1$.
:::

:::answer
3 chips; the result is $L = 1$ ($\text{7A3} < \text{7A9}$, i.e. $1955 < 1961$), decided by the lowest digit
after rippling through $3 - 1 = 2$ links.
:::
::::

::::example{#ex-cas-edge level="gate" title="Edge case: comparing signed numbers" depth="standard"}
Compare $A = 1110$ and $B = 0011$, 4-bit 2's complement, on an unsigned comparator, first directly and
then with the sign bits flipped.

:::step{why="Directly, the comparator reads the patterns as unsigned numbers."}
$1110 = 14$, $0011 = 3$: the first difference is bit 3 with $A_3 = 1$, so $G = 1$.
:::

:::step{why="The signed values are what the programmer meant."}
$A = -8 + 4 + 2 = -2$, $B = 3$. So the direct answer is wrong.
:::

:::step{why="Flipping the sign bits adds 8 to both values, mapping −2 to 6 and 3 to 11, which keeps their order."}
$0110 = 6$ against $1011 = 11$: the first difference is bit 3 with $B_3 = 1$, so $L = 1$.
:::

:::answer
Direct: $G = 1$ (wrong for signed). With the sign bits flipped: $L = 1$, the correct $-2 < 3$.
:::
::::

:::note{#recap-cascade title="Recap" depth="quick"}
Chip outputs: $G = G_4 + E_4G_{in}$, $E = E_4E_{in}$, $L = L_4 + E_4L_{in}$; bottom chip tied to $(0, 1, 0)$;
$\lceil n/4 \rceil$ chips. Gate model matters: $5n + 1$ gates with complements free. For signed numbers flip both
sign bits first.
:::

## Comparing by subtraction

:::intuition{#subtract-intuition title="The sign of the difference" depth="standard"}
A processor rarely has a separate comparator: it already has a subtractor. "Is $A < B$?" is the same
question as "is $A - B$ negative?", and "is $A = B$?" is "is $A - B$ zero?". The subtractor's last borrow
and a zero test on its result give both answers for free. The arithmetic of borrows, complements and
overflow is in [Chapter 1, Lesson 9](lesson:code-arithmetic); here we only read off the comparison.
:::

:::definition{#compare-by-subtract term="Comparison flags from A − B" depth="standard"}
Compute $R = A - B$ in $n$ bits with an $n$-bit subtractor (or as $A + B' + 1$).

- **Unsigned:** $L = $ the borrow out of the top column ($= $ NOT the carry out of $A + B' + 1$);
  $E = 1$ exactly when $R = 0\cdots0$ (an $n$-input NOR of the result bits); $G = (L + E)'$.
- **Signed (2's complement):** $A < B$ exactly when $N \oplus V = 1$, where $N$ is the sign bit of $R$ and $V$
  the overflow flag. The sign bit alone is wrong when the subtraction overflows. For a subtraction,
  $V = 1$ exactly when $A$ and $B$ have different sign bits and the sign bit of $R$ differs from that of
  $A$. $E$ is the same zero test as in the unsigned case.
:::

:::theorem{#borrow-theorem name="The borrow out is the unsigned less-than" depth="standard"}
For $n$-bit unsigned $A$ and $B$, the $n$-bit subtraction $A - B$ produces a borrow out of the top column
if and only if $A < B$.
:::

:::proof{#proof-borrow-theorem of="the borrow theorem" depth="standard"}
**Idea first:** the subtractor can only write a result between 0 and $2^n - 1$; it borrows $2^n$ exactly when
the true difference is too small to fit, that is, negative.

The column-by-column subtraction writes the pattern $R = A - B + 2^n b$, where $b \in \{0, 1\}$ is the final
borrow and $0 \le R \le 2^n - 1$. The true difference $A - B$ lies between $-(2^n - 1)$ and $2^n - 1$. If
$A \ge B$, then $b = 0$ already gives $R = A - B$ in range, and $b = 1$ would push $R$ to at least $2^n$; so
$b = 0$. If $A < B$, then $b = 0$ would give a negative $R$, so $b = 1$. Hence $b = 1 \iff A < B$.
:::

:::theorem{#signed-less-than name="The signed less-than is N ⊕ V" depth="standard"}
For $n$-bit 2's complement $A$ and $B$, let $R$ be the $n$-bit result of $A - B$, $N$ its sign bit and $V$
the overflow flag of the subtraction. Then $A < B$ (as signed values) if and only if $N \oplus V = 1$.
:::

:::proof{#proof-signed-less-than of="the signed less-than rule" depth="standard"}
**Idea first:** without overflow the result is the true difference, so its sign bit tells the truth;
overflow wraps the difference around by $2^n$, which always lands it on the other side of zero, so the
sign bit then lies, and XOR with $V$ undoes the lie.

Let $D = A - B$ be the true difference. Both numbers lie in $[-2^{n-1}, 2^{n-1} - 1]$, so
$-(2^n - 1) \le D \le 2^n - 1$, and the subtractor writes the pattern of $D$ modulo $2^n$.

*Case $V = 0$.* $D$ fits in $n$-bit 2's complement, so $R$ **is** $D$ and $N$ is its sign: $N = 1$ exactly
when $D < 0$, that is, when $A < B$. Here $N \oplus V = N$.

*Case $V = 1$.* $D$ does not fit. If $D \ge 2^{n-1}$ (so $A > B$), the result read as signed is
$D - 2^n$, which lies in $[-2^{n-1}, -1]$: negative, $N = 1$. If $D < -2^{n-1}$ (so $A < B$), the result is
$D + 2^n$, which lies in $[1, 2^{n-1} - 1]$: positive, $N = 0$. Either way $N$ is the **opposite** of the
true sign, and $N \oplus V = N'$ is the true sign.

In both cases $N \oplus V = 1 \iff D < 0 \iff A < B$.
:::

:::trap{#trap-sign-flag title="Using only the sign bit for a signed comparison" depth="standard"}
For signed $A = 0110$ ($6$) and $B = 1011$ ($-5$), the 4-bit result of $A - B$ is $1011$, so $N = 1$, and the
expected wrong answer is "$A < B$". The true difference $11$ does not fit in 4-bit 2's complement, so
$V = 1$ and $N \oplus V = 0$: $A \ge B$, which is right. Overflow flips the sign bit, and $N \oplus V$ flips it back.
:::

### Worked examples: comparing by subtraction

::::example{#ex-sub-easy level="easy" title="Unsigned 9 − 12: the borrow says less" depth="quick"}
Compare the 4-bit unsigned numbers $A = 1001$ (9) and $B = 1100$ (12) with a subtractor.

:::step{why="The subtractor works as A + B′ + 1; its carry out is the complement of the borrow."}
$1001 + 0011 + 1 = 1101$ with carry out 0, so the borrow is 1 and $R = 1101$.
:::

:::step{why="By the borrow theorem the borrow is exactly A < B; the result is not 0000, so E = 0."}
$L = 1$, $E = 0$, $G = (L + E)' = 0$.
:::

:::answer
$A < B$ ($9 < 12$). The result $1101 = 13$ is $9 - 12 + 16$: the subtractor borrowed $2^4$, and that
borrow is the answer.
:::
::::

::::example{#ex-sub-medium level="medium" title="Equal numbers: the zero test" depth="standard"}
Compare $A = B = 0111$ (unsigned) with a subtractor. Which flag decides, and what do the others show?

:::step{why="Subtracting a number from itself gives 0 and needs no borrow."}
$0111 + 1000 + 1 = 1\,0000$: carry out 1, so borrow 0, and $R = 0000$.
:::

:::step{why="E is the NOR of the result bits, which is 1 only for the all-zero result."}
$E = 1$, $L = 0$, $G = (L + E)' = 0$.
:::

:::answer
$(G, E, L) = (0, 1, 0)$. The borrow alone gives only "not less", which does not tell $A = B$ from $A > B$;
that is why the zero test is needed.
:::
::::

::::example{#ex-sub-gate level="gate" title="Signed, no overflow: −3 against 2" depth="standard"}
$A = 1101$ and $B = 0010$ are 4-bit 2's complement numbers. Find $N$, $V$ and the signed result, and say
what an **unsigned** reading of the same subtraction would conclude.

:::step{why="Read the signed values first, so that the answer can be checked."}
$A = -8 + 4 + 1 = -3$, $B = 2$; the true difference is $-5$.
:::

:::step{why="Subtract in 4 bits: A + B′ + 1."}
$1101 + 1101 + 1 = 1\,1011$: $R = 1011$ ($-5$), carry out 1 (borrow 0), $N = 1$.
:::

:::step{why="V needs different sign bits in A and B and a result whose sign differs from A's; A and R are both negative, so no overflow (−5 fits in 4 bits)."}
$V = 0$, so $N \oplus V = 1$: $A < B$.
:::

:::answer
Signed: $A < B$ ($-3 < 2$), with $N = 1$, $V = 0$. The unsigned reading of the same patterns is
$13 - 2$, borrow 0, so "$A > B$": the borrow is the unsigned flag, $N \oplus V$ the signed one, and the
same subtraction serves both.
:::
::::

::::example{#ex-sub-edge level="gate" title="Edge case: overflow makes a negative difference look positive" depth="standard"}
Compare the 4-bit 2's complement numbers $A = 1000$ ($-8$) and $B = 0001$ ($1$) by subtraction.

:::step{why="Subtract in 4 bits: A + B′ + 1."}
$1000 + 1110 + 1 = 1\,0111$: $R = 0111$, so $N = 0$.
:::

:::step{why="The true difference −9 is below −8, the smallest 4-bit value; the rule agrees: A and B have different signs, and R's sign (0) differs from A's (1)."}
$V = 1$.
:::

:::step{why="The sign bit alone would say 'not negative'; overflow has flipped it."}
$N \oplus V = 0 \oplus 1 = 1$: $A < B$.
:::

:::answer
$A < B$ ($-8 < 1$), although $R = 0111 = +7$ looks positive. This is the mirror image of the trap above
(there a positive difference looked negative): in both directions $N \oplus V$ is right and $N$ alone is wrong.
:::
::::

:::note{#recap-subtract title="Recap" depth="quick"}
Unsigned: borrow out $= (A < B)$, zero result $= (A = B)$. Signed: less-than is $N \oplus V$, never $N$ alone,
because overflow always puts the wrapped result on the wrong side of zero. The arithmetic itself lives in
[Chapter 1, Lesson 9](lesson:code-arithmetic).
:::

## Parity generators and checkers

:::intuition{#parity-intuition title="A light switch that every 1 flips" depth="standard"}
Imagine a lamp that toggles every time it is shown a 1. Show it a word bit by bit, starting from off:
it ends on exactly when the word had an odd number of 1s. That lamp is a chain of XOR gates, and its
final state is the word's **parity**.

Now use it to guard a message. Before sending a word, append one extra bit chosen so that the total
number of 1s is even. The receiver runs the same lamp over everything it got. If the lamp ends off,
the count is still even and the word is accepted; if it ends on, something flipped on the way. A single
extra bit cannot say *which* bit flipped, but it can raise an alarm, and it costs only a few XOR gates.
:::

:::definition{#parity-def term="Even and odd parity bits" depth="standard"}
For data bits $d_1, \dots, d_n$ the **even-parity bit** is
$$
P_{even} = d_1 \oplus d_2 \oplus \dots \oplus d_n ,
$$
which makes the total number of 1s in the transmitted word (data **plus** parity bit) even. The
**odd-parity bit** is its complement, $P_{odd} = (d_1 \oplus \dots \oplus d_n)'$, making the total odd.

**Why the XOR:** by the parity theorem of [Chapter 2, Lesson 3](lesson:xor-and-operators), the XOR of
the data is 1 exactly when the data holds an odd number of 1s, and then the even-parity bit must be 1
to make the total even. For 3 data bits the even-parity bit is $\Sigma m(1, 2, 4, 7)$: the checkerboard
K-map, which no two cells merge, so its minimal SOP is four 3-literal terms and the XOR form is far
cheaper.
:::

:::definition{#parity-generator term="Parity generator" depth="standard"}
A **parity generator** computes the parity bit from the $n$ data bits: an XOR of the $n$ bits (even
parity) or an XNOR (odd parity, one inverter more, or XNOR as the last gate). With 2-input gates it is
an **XOR tree**: pair the inputs, XOR each pair, pair the results, and so on until one signal remains.
:::

:::theorem{#xor-tree name="XOR trees: n − 1 gates, depth ⌈log₂ n⌉, and no fewer" depth="standard"}
The parity of $n \ge 2$ bits can be computed with $n - 1$ two-input XOR gates in depth $\lceil \log_2 n \rceil$.
Both numbers are optimal: **any** circuit of two-input gates (of any types) computing it needs at least
$n - 1$ gates and depth at least $\lceil \log_2 n \rceil$.
:::

:::proof{#proof-xor-tree of="the XOR-tree theorem" depth="standard"}
**Idea first:** every 2-input gate merges two signals into one; to merge $n$ inputs into one output you
need $n - 1$ merges, and a merge can at most double how many inputs a signal depends on.

*Sufficiency.* Each XOR gate replaces two signals by one, so the number of live signals falls by
exactly 1 per gate: from $n$ to 1 takes $n - 1$ gates, and XOR's associativity means any pairing gives the
parity. In a balanced tree, level $t$ halves the number of signals (rounding up, an odd one passes
through), so after $t$ levels at most $\lceil n / 2^t \rceil$ remain; one signal remains once $2^t \ge n$, at
$t = \lceil \log_2 n \rceil$.

*At least $n - 1$ gates.* Parity depends on every input: flipping any one input flips the output. So in
the circuit every input has a path to the output. Keep only the gates that lie on some path to the
output (a lower bound for them is a lower bound for the whole circuit). View the circuit as a graph whose vertices are the
$n$ inputs and the $g$ gates (constants, if used, only add vertices); every vertex is connected to the
output, so the graph is connected. A connected graph on $n + g$ vertices has at least $n + g - 1$ edges,
and here every edge enters a gate, each gate having exactly 2 inputs: $2g \ge n + g - 1$, so $g \ge n - 1$.
The argument used only that the output depends on every input, so **any** function that depends on all
$n$ inputs needs at least $n - 1$ two-input gates (equality of two $n$-bit numbers, which depends on all
$2n$ input bits: at least $2n - 1$, exactly the XNOR row plus the AND tree).

*Depth at least $\lceil \log_2 n \rceil$.* An input wire depends on 1 input; a gate at depth $t$ combines two
signals of depth at most $t - 1$, so by induction it depends on at most $2^t$ inputs. The output depends on
all $n$ inputs, so $2^{depth} \ge n$, i.e. depth $\ge \lceil \log_2 n \rceil$.
:::

:::definition{#parity-checker term="Parity checker" depth="standard"}
A **parity checker** XORs every received bit, the $n$ data bits **and** the parity bit: $n + 1$ inputs, so
$n$ two-input XOR gates in depth $\lceil \log_2(n + 1) \rceil$. For an even-parity code its output is the
**error flag** $F$ (we keep the letter $E$ for "equal"): 0 when the received word has an even number of 1s (accepted), 1 when odd (error). For an
odd-parity code the flag is the XNOR of all received bits. Generator and checker share the same tree:
at the sender the parity input is absent (or 0); at the receiver it is the received parity bit.
:::

:::theorem{#parity-detects name="Parity detects exactly the odd numbers of bit errors" depth="standard"}
Let a word with valid parity be sent and let $e$ be the set of flipped bit positions (anywhere,
including the parity bit). The checker raises its error flag if and only if the number of flipped bits
$|e|$ is **odd**. Every even number of flips (2, 4, …) goes unnoticed.
:::

:::proof{#proof-parity-detects of="what parity detects" depth="standard"}
**Idea first:** each flip toggles the parity of the count, so $k$ flips toggle it $k$ times.

Write the received word as $r = w \oplus e$, where $w$ is the sent word and $e$ has a 1 at each flipped
position. The checker computes the XOR of all bits of $r$, which is (XOR of the bits of $w$) $\oplus$ (XOR of
the bits of $e$). The first part is 0, because $w$ has even parity by construction. The second part is 1 exactly when $e$ has an odd number of 1s.
So the flag is 1 iff an odd number of bits flipped. (For an odd-parity code the same argument works with
the XNOR.)
:::

:::note{#erratum-parity title="A misprint to avoid (what parity detects)" depth="standard"}
Some printed notes say a parity bit "detects a single-bit error". That is true but incomplete, and
examiners use the gap: parity detects **every odd** number of errors (1, 3, 5, …), not just one, and
**no even** number. It also cannot correct anything, because it does not say which bit flipped;
correction needs more check bits, as in the Hamming code of [Chapter 1, Lesson 8](lesson:codes).
:::

:::viz{#parity-viz spec="parity-tree" mode="animate" depth="standard"}
:::

:::trick{#trick-parity-popcount title="Parity is the count of 1s mod 2" depth="standard"}
Do not draw the XOR gates in your head: count the 1s. The XOR of any bits is (number of 1s) mod 2. An
even-parity bit is that same value; an odd-parity bit is its complement; an even-parity checker
outputs (total 1s received) mod 2.

**Why it works:** XOR is addition mod 2 (Chapter 2), and adding bits mod 2 only remembers whether the
sum is odd. **When it fails:** never for the value, but it hides the *structure*; questions about gate
counts or delay need the tree ($n - 1$ gates, depth $\lceil \log_2 n \rceil$), not the count.
:::

:::trap{#trap-parity-even title="Even parity counts the parity bit too" depth="standard"}
"Even parity" describes the **whole transmitted word**, data plus parity bit, not the data. For data
$1101\,0110$ (five 1s) the even-parity bit is **1**, making six; the expected wrong answer is 0, from
reasoning "the data has an odd count, which is not even, so write 0". A second slip is to give the
checker's flag the wrong meaning: for even parity, an XOR output of 0 means *no error detected*.
:::

### Worked examples: parity

::::example{#ex-par-easy level="easy" title="The even-parity bit of a byte" depth="quick"}
Find the even-parity and odd-parity bits for the byte $1101\,0110$.

:::step{why="Only the number of 1s matters, by the parity theorem."}
1s: $1 + 1 + 0 + 1 + 0 + 1 + 1 + 0 = 5$.
:::

:::step{why="Even parity makes the total even: five 1s need one more."}
$P_{even} = 5 \bmod 2 = 1$; the word sent is $1101\,0110\,1$ with six 1s.
:::

:::answer
Even-parity bit 1, odd-parity bit 0 (total stays five, odd).
:::
::::

::::example{#ex-par-medium level="medium" title="A checker's output for a received word" depth="standard"}
An even-parity link receives the 9-bit word $1011\,0010\,1$ (eight data bits, then the parity bit). What
does the checker output?

:::step{why="The checker XORs all nine received bits, which is the count of 1s mod 2."}
Data 1s: $1 + 0 + 1 + 1 + 0 + 0 + 1 + 0 = 4$; parity bit 1; total 5.
:::

:::step{why="For an even-parity code a valid word has an even total, so an odd total means some odd number of bits flipped."}
$5 \bmod 2 = 1$: the error flag is raised.
:::

:::answer
Error flag $F = 1$. The checker cannot say which bit is wrong (one bit, three bits, or any odd number of
the nine could have flipped); the receiver can only ask for the word again.
:::
::::

::::example{#ex-par-gate level="gate" title="XOR gates and depth for 9 inputs" depth="standard"}
The checker of the last example has 9 inputs. What are the fewest 2-input XOR gates and the smallest
depth, and what does a chain of gates cost instead?

:::step{why="Each gate turns two signals into one, so 9 signals need 8 merges; the lower bound in the theorem says no circuit of 2-input gates does better."}
Gates: $9 - 1 = 8$.
:::

:::step{why="Level by level, each level pairs up the signals and an odd one passes through: 9 → 5 → 3 → 2 → 1."}
Level 1: 4 gates (one input waits); level 2: 2 gates; level 3: 1 gate; level 4: 1 gate. Total $4 + 2 + 1 + 1 = 8$,
depth 4.
:::

:::step{why="The depth lower bound: 3 levels of 2-input gates reach at most 2³ = 8 inputs, one too few."}
Depth $\lceil \log_2 9 \rceil = 4$ is optimal. A chain also uses 8 gates but has depth 8.
:::

:::answer
8 XOR gates, depth 4 (balanced tree); the chain has the same gate count and twice the delay.
:::
::::

::::example{#ex-par-edge level="gate" title="Edge case: a two-bit error that parity misses" depth="standard"}
The byte $1011\,0010$ is sent with even parity. Noise flips data bits 1 and 4 (counting from 0 at the
right). Does the checker notice?

:::step{why="Four 1s in the data are already even, so the parity bit is 0."}
Sent: $1011\,0010\,0$, total four 1s.
:::

:::step{why="Bit 1 is 1 and becomes 0; bit 4 is 1 and becomes 0. Two flips change the count by an even amount."}
Received: $1010\,0000\,0$, total two 1s: still even.
:::

:::step{why="The flag is the count mod 2, and an even number of flips never changes it."}
Checker output 0: the word is accepted although it is wrong.
:::

:::answer
Not detected. Any even number of flips (here 2, which turned 178 into 160) passes the parity check;
detecting them needs a code with a larger minimum distance.
:::
::::

:::note{#recap-parity title="Recap" depth="quick"}
Even-parity bit = XOR of the data; odd = XNOR. Checker = XOR of everything received, flag 1 = error.
$n$ inputs: $n - 1$ XOR gates, depth $\lceil \log_2 n \rceil$, both optimal. Parity catches every odd number of
flips and no even number, and corrects nothing.
:::

## Try it

The Combinational Workbench below can realise any function on a multiplexer. Pick the preset
**2-bit A > B** (variables $A_1, A_0, B_1, B_0$) on an **8:1 MUX** with select lines $A_1, A_0, B_1$, so
that $B_0$ is the residue variable. Before you look, predict the eight data inputs with the
implementation-table method of [Lesson 2](lesson:multiplexers):

:::table{#lab-table title="2-bit A > B on an 8:1 MUX (selects A1, A0, B1)" depth="standard"}
| $A_1A_0B_1$ | $A$ | $B$ | $A > B$ for $B_0 = 0, 1$ | Data input |
|:--|:--|:--|:--|:--|
| 000 | 0 | 0 or 1 | 0, 0 | $I_0 = 0$ |
| 001 | 0 | 2 or 3 | 0, 0 | $I_1 = 0$ |
| 010 | 1 | 0 or 1 | 1, 0 | $I_2 = B_0'$ |
| 011 | 1 | 2 or 3 | 0, 0 | $I_3 = 0$ |
| 100 | 2 | 0 or 1 | 1, 1 | $I_4 = 1$ |
| 101 | 2 | 2 or 3 | 0, 0 | $I_5 = 0$ |
| 110 | 3 | 0 or 1 | 1, 1 | $I_6 = 1$ |
| 111 | 3 | 2 or 3 | 1, 0 | $I_7 = B_0'$ |
:::

Two data lines carry $B_0'$, two are tied to 1 and four to 0: one inverter and the MUX realise the
whole comparator output, and the verification row shows the six 1-rows 4, 8, 9, 12, 13, 14. Then try
the select lines $B_1, B_0, A_1$ and see how the residues change.

:::lab{#lab-compare lab="comb-workbench" tab="implement" depth="standard"}
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

:::summary{#summary-card title="Comparators and parity on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| 1-bit comparator | $G = AB'$, $E = A \odot B$, $L = A'B$; exactly one is 1 |
| Equality | $x_i = A_i \odot B_i$; $E = x_{n-1}\cdots x_0$ |
| Magnitude | $G = \sum_k \left(\prod_{j>k} x_j\right) A_kB_k'$; the first differing bit from the MSB decides |
| Row counts | $E$: $2^n$; $G$, $L$: $(4^n - 2^n)/2$ each (2 bits: 4, 6, 6) |
| Erratum | third term of the 3-bit $G$ is $(A_2 \odot B_2)(A_1 \odot B_1)A_0B_0'$ |
| Cascade | $G = G_4 + E_4G_{in}$, $E = E_4E_{in}$, $L = L_4 + E_4L_{in}$; bottom chip $(0, 1, 0)$; $\lceil n/4 \rceil$ chips |
| Cost of the MSB-first comparator | $5n + 1$ gates for $n \ge 2$ (complements free, any fan-in; this construction, not a proven minimum) |
| Signed | flip both sign bits, then compare unsigned |
| By subtraction | unsigned: borrow out $= L$, zero $= E$; signed: $L = N \oplus V$ (overflow puts the wrapped result on the wrong side of zero) |
| Parity bit | even $= d_1 \oplus \dots \oplus d_n$; odd = its complement; even counts the parity bit too |
| XOR tree | $n - 1$ gates, depth $\lceil \log_2 n \rceil$, both optimal |
| Detection | every odd number of flipped bits; never an even number; no correction |
:::
