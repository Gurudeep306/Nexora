---
id: multiplication-booth
subject: dl
chapter: number-systems
title: "Signed multiplication and Booth's algorithm"
order: 10
prerequisites: [code-arithmetic]
pyq_topics: [dl/arithmetic]
est_minutes: 60
difficulty: advanced
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every value is checked by content/gate-notes/_checks/dl/l10_multiplication_booth.py, using boothlib.py (Booth recoding and the register algorithm verified by brute force over every multiplier up to 10 bits)."
  - "Coverage checklist only (internal digests, never copied): set B pp. 153–154, 178, 183, 185 (Booth rules and recodings; its Karatsuba remark and a dropped leading digit are recorded in _errata/dl.md), set D pp. 401–402 (radix-2 and radix-4 tables)."
  - "Facts checked against textbooks: V. C. Hamacher, Z. Vranesic, S. Zaky, Computer Organization (Booth algorithm, bit-pair recoding); M. Morris Mano, Computer System Architecture (Booth multiplication algorithm, division)."
  - "PYQs: src/gate/questions.json (dl/arithmetic, moved from Chapter 5's multiplier lesson), keys re-derived in l10_multiplication_booth.py."
updated: "2026-10-17"
---

Multiplying unsigned binary numbers is just shift-and-add ([Lesson 9](lesson:code-arithmetic#binary-mul)).
Two questions remain, and GATE asks both. How do you multiply **signed** (2's-complement) numbers
correctly? And how can a machine multiply with fewer additions? **Booth's algorithm** answers both at
once: it recodes the multiplier into digits $-1, 0, +1$ so that a long run of 1s costs one
subtraction and one addition instead of one addition per 1, and it handles negative multipliers with
no special case. In this lesson you learn signed shift-and-add, Booth recoding and why it is exact,
how to count Booth's additions and subtractions (and which multipliers are best and worst), and the
radix-4 **bit-pair** recoding that halves the number of partial products.

## Where this fits

You need 2's complement and sign extension from [Lesson 4](lesson:signed-numbers) and binary
shift-and-add from [Lesson 9](lesson:code-arithmetic). This is the last lesson of Chapter 1. The
hardware that runs these algorithms (array multipliers and their delay) is in Chapter 5.

:::table{#radar title="GATE radar: signed multiplication and Booth" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 8 (1991–2025) |
| Marks | 4 one-mark, 4 two-mark (one is a fill-in) |
| Formats | 6 MCQ, 1 NAT, 1 fill-in |
| Pattern 1 | Booth-recode a negative multiplier: 1999, 2005 (both $-57$) |
| Pattern 2 | Count Booth's additions and subtractions: 2008, 2025; best/worst multiplier: 1996 |
| Pattern 3 | Bit-pair (radix-4) recoding table: 2006 |
| Pattern 4 | A signed product (2004); a product bit as a Boolean function (1991) |
| What examiners test | The direction of the pair (current bit, bit to its right), the appended 0, and counting both additions **and** subtractions |
:::

## Shift-and-add for signed numbers

:::intuition{#signed-mul-intuition title="The partial products must keep their signs" depth="standard"}
Shift-and-add adds shifted copies of the multiplicand. If the multiplicand is negative, each copy
is a negative number, and adding negative numbers of different widths needs **sign extension**
(Lesson 9), so every partial product is extended to the full $2n$ bits. If the **multiplier** is
negative, its top bit does not mean $+2^{n-1}$ but $-2^{n-1}$ (Lesson 4), so the last partial product
must be **subtracted** instead of added.
:::

:::definition{#signed-shift-add term="Shift-and-add for 2's-complement operands" depth="quick"}
To multiply $n$-bit 2's-complement numbers $M$ (multiplicand) and $Q$ (multiplier):

1. For each bit $q_i = 1$ with $i < n - 1$, take $M \cdot 2^{i}$, **sign-extended** to $2n$ bits.
2. If $q_{n-1} = 1$ (the multiplier is negative), **subtract** $M \cdot 2^{n-1}$ instead of adding it.
3. Add everything modulo $2^{2n}$. The $2n$-bit result is the exact product.

This works because $Q = -q_{n-1} 2^{n-1} + \sum_{i < n-1} q_i 2^i$, so
$M \times Q = -q_{n-1} (M 2^{n-1}) + \sum_{i<n-1} q_i (M 2^i)$.
:::

:::derivation{#product-width of="why 2n bits always hold an n-bit signed product" depth="standard"}
The $n$-bit range is $-2^{n-1} \dots 2^{n-1} - 1$. The extreme products are $(-2^{n-1})^2 = 2^{2n-2}$ and
$(-2^{n-1})(2^{n-1} - 1) = -2^{2n-2} + 2^{n-1}$. Both lie inside the $2n$-bit range
$-2^{2n-1} \dots 2^{2n-1} - 1$, so a $2n$-bit product never overflows.

**Sanity check.** 4 bits: $(-8) \times (-8) = 64 \le 127$ and $(-8) \times 7 = -56 \ge -128$.
:::

:::definition{#product-bits term="Product bits as Boolean functions" depth="standard"}
For unsigned $A = a_3a_2a_1a_0$ and $B = b_3b_2b_1b_0$, the product bits are sums of the partial-product
bits $a_ib_j$ in the same column, with carries. The lowest two are carry-free in their own column:

$$
c_0 = a_0 b_0, \qquad c_1 = a_1 b_0 \oplus a_0 b_1 ,
$$

because column 1 receives only $a_1b_0$ and $a_0b_1$ (the AND of two bits is their binary product, and
the column sum mod 2 is their XOR); its carry, $a_1b_0 \cdot a_0b_1$, goes into $c_2$.
:::

### Worked examples: shift-and-add

::::example{#ex-sm-unsigned level="easy" title="Unsigned 1011 × 0110" depth="quick"}
Multiply the unsigned numbers $1011$ (11) and $0110$ (6).

:::step{why="Multiplier bits 1 and 2 are 1: add M shifted by 1 and by 2."}
$10110 + 101100$.
:::

:::step{why="Add."}
$10110 + 101100 = 1000010$.
:::

:::answer
$0100\,0010 = 66 = 11 \times 6$ in 8 bits.
:::
::::

::::example{#ex-sm-negm level="medium" title="A negative multiplicand: (−3) × 5" depth="standard"}
Multiply $M = 1101$ ($-3$) by $Q = 0101$ ($5$) in 4-bit 2's complement, giving an 8-bit product.

:::step{why="Sign-extend M to 8 bits so every partial product keeps its sign."}
$M = 1111\,1101$.
:::

:::step{why="Q has 1s at bits 0 and 2: add M and M shifted twice (both sign-extended)."}
$1111\,1101 + 1111\,0100 = 1\,1111\,0001$; keep 8 bits: $1111\,0001$.
:::

:::answer
$1111\,0001 = -15 = (-3) \times 5$. Without sign extension the partial products would be
$1101 + 110100 = 1000001 = 65$, nonsense.
:::
::::

::::example{#ex-sm-byte level="gate" title="An 8-bit signed product" depth="standard"}
Multiply the 8-bit 2's-complement numbers $11111001$ ($-7$) and $00000110$ ($6$); give the 8-bit result
(the product fits).

:::step{why="Bits 1 and 2 of the multiplier are 1: add M·2 and M·4, sign-extended."}
$M \cdot 2 = 1111\,0010$, $M \cdot 4 = 1110\,0100$ (mod $2^8$).
:::

:::step{why="Add and drop the carry."}
$1111\,0010 + 1110\,0100 = 1\,1101\,0110 \to 1101\,0110$.
:::

:::answer
$1101\,0110 = -42 = (-7) \times 6$.
:::
::::

::::example{#ex-sm-negq level="gate" title="Edge case: a negative multiplier, 3 × (−3)" depth="standard"}
Multiply $M = 0011$ (3) by $Q = 1101$ ($-3$) in 4 bits, giving 8 bits.

:::step{why="Q = −8 + 4 + 1: bits 0 and 2 add, bit 3 (weight −8) subtracts."}
$3 \times (-3) = 3 \cdot 1 + 3 \cdot 4 - 3 \cdot 8$.
:::

:::step{why="In 8-bit patterns: 00000011 + 00001100 − 00011000."}
$0000\,0011 + 0000\,1100 = 0000\,1111$; $0000\,1111 - 0001\,1000 = 1111\,0111$.
:::

:::answer
$1111\,0111 = -9$. Treating $q_3$ as $+8$ would give $3 \times 13 = 39$.
:::
::::

:::trap{#trap-unsigned-mult title="Multiplying 2's-complement patterns as if they were unsigned" depth="quick"}
$1101 \times 0101$ as unsigned is $13 \times 5 = 65$; only the low 4 bits ($0001$) happen to agree with
$-15$. For a full $2n$-bit signed product you must sign-extend negative partial products and subtract
the top one for a negative multiplier, or use Booth.
:::

:::note{#recap-signed-mul title="Recap" depth="quick"}
Signed shift-and-add: sign-extend every partial product to $2n$ bits; the multiplier's top bit
subtracts. $2n$ bits always hold the product. $c_0 = a_0b_0$, $c_1 = a_1b_0 \oplus a_0b_1$.
:::

## Booth recoding (radix 2)

:::intuition{#booth-intuition title="A run of 1s is one subtraction and one addition" depth="standard"}
$0111\,1110 = 126$ has six 1s, so plain shift-and-add needs six additions. But
$0111\,1110 = 1000\,0000 - 0000\,0010 = 128 - 2$. Multiplying by it is "add $M \cdot 2^7$, subtract
$M \cdot 2^1$": two operations. Booth's idea is to rewrite every run of 1s this way automatically, by
looking only at **each bit and the bit to its right**.
:::

:::definition{#booth-recode term="Booth (radix-2) recoding" depth="quick"}
Append $q_{-1} = 0$ to the right of the multiplier. For each position $i = 0 \dots n-1$, the recoded
digit is

$$
d_i = q_{i-1} - q_i ,
$$

that is, read the pair (current bit $q_i$, bit to its right $q_{i-1}$):

| $q_i$ | $q_{i-1}$ | $d_i$ | Meaning |
|:--|:--|:--|:--|
| 0 | 0 | 0 | inside a run of 0s: shift only |
| 1 | 1 | 0 | inside a run of 1s: shift only |
| 1 | 0 | −1 | a run of 1s **starts** here (from the right): subtract $M$ |
| 0 | 1 | +1 | a run of 1s **ended** just below: add $M$ |
:::

:::theorem{#booth-value name="Booth recoding preserves the 2's-complement value" depth="standard"}
For any $n$-bit 2's-complement multiplier $Q$, the recoded digits satisfy
$\sum_{i=0}^{n-1} d_i\, 2^{i} = Q$. So $M \times Q = \sum d_i (M 2^i)$: add $M 2^i$ where $d_i = +1$,
subtract it where $d_i = -1$.
:::

:::proof{#proof-booth-value of="Booth recoding" depth="deep"}
**Idea first:** the sum telescopes; every bit is added once at its own place and subtracted once one
place higher, which leaves exactly the 2's-complement weights.

$$
\sum_{i=0}^{n-1} (q_{i-1} - q_i)\, 2^i = \sum_{i=0}^{n-1} q_{i-1} 2^{i} - \sum_{i=0}^{n-1} q_i 2^i
= \sum_{j=0}^{n-2} q_j 2^{j+1} - \sum_{i=0}^{n-1} q_i 2^i ,
$$

using $q_{-1} = 0$. Combining the terms with the same $q_j$: for $j \le n - 2$ the coefficient is
$2^{j+1} - 2^j = 2^j$, and $q_{n-1}$ appears only in the second sum, with coefficient $-2^{n-1}$. So the
total is $-q_{n-1} 2^{n-1} + \sum_{j \le n-2} q_j 2^j$, which is the 2's-complement value of $Q$
(Lesson 4). No special case for negative multipliers is needed.
:::

:::definition{#booth-algorithm term="Booth's algorithm with registers" depth="standard"}
Registers: $A$ (accumulator, starts at 0), $Q$ (multiplier), one extra bit $Q_{-1}$ (starts at 0), and $M$.
Repeat $n$ times: look at $(Q_0, Q_{-1})$; if $10$, $A \leftarrow A - M$; if $01$, $A \leftarrow A + M$; then
**arithmetic-shift right** the combined $A, Q, Q_{-1}$ by one place. At the end, $A$ and $Q$ together
hold the $2n$-bit product. (Hardware keeps $A$ one bit wider when $M$ may be $-2^{n-1}$, whose negation
does not fit in $n$ bits.)
:::

:::viz{#booth-viz spec="booth-scan" mode="animate" depth="standard"}
:::

### Worked examples: Booth recoding

::::example{#ex-booth-pos level="easy" title="Recode 0011100 (28)" depth="quick"}
Booth-recode $Q = 0011100$.

:::step{why="Append q₋₁ = 0, then read each pair (qᵢ, qᵢ₋₁) from the right."}
Pairs from $i = 0$: $(0,0), (0,0), (1,0), (1,1), (1,1), (0,1), (0,0)$.
:::

:::step{why="10 → −1, 01 → +1, 00 and 11 → 0."}
Digits $d_6 \ldots d_0$: $0\ {+1}\ 0\ 0\ {-1}\ 0\ 0$.
:::

:::answer
$0\,{+1}\,0\,0\,{-1}\,0\,0 = 32 - 4 = 28$: one addition and one subtraction instead of three additions.
:::
::::

::::example{#ex-booth-neg level="medium" title="Recode −29 in 8 bits" depth="standard"}
Booth-recode the 8-bit multiplier $-29$.

:::step{why="−29 in 8-bit 2's complement: 256 − 29 = 227."}
$-29 = 1110\,0011$.
:::

:::step{why="Pairs (qᵢ, qᵢ₋₁) from i = 0 with q₋₁ = 0: (1,0), (1,1), (0,1), (0,0), (0,0), (1,0), (1,1), (1,1)."}
Digits $d_0 \ldots d_7$: $-1, 0, +1, 0, 0, -1, 0, 0$.
:::

:::step{why="Write them MSB first and check the value."}
$0\ 0\ {-1}\ 0\ 0\ {+1}\ 0\ {-1}$: $-32 + 4 - 1 = -29$.
:::

:::answer
$0\,0\,{-1}\,0\,0\,{+1}\,0\,{-1}$. The leading 1s of a negative number produce no digits at the top:
the run of 1s ends in a single $-1$.
:::
::::

::::example{#ex-booth-trace level="gate" title="Run the register algorithm: 3 × (−3)" depth="standard"}
Multiply $M = 0011$ by $Q = 1101$ with Booth's register algorithm (4 bits).

:::step{why="Start: A = 0000, Q = 1101, Q₋₁ = 0. Pair (Q₀, Q₋₁) = (1, 0) → A − M."}
$A = 0000 - 0011 = 1101$; shift $A, Q, Q_{-1}$ right: $A = 1110$, $Q = 1110$, $Q_{-1} = 1$.
:::

:::step{why="Pair (0, 1) → A + M."}
$A = 1110 + 0011 = 0001$; shift: $A = 0000$, $Q = 1111$, $Q_{-1} = 0$.
:::

:::step{why="Pair (1, 0) → A − M."}
$A = 0000 - 0011 = 1101$; shift: $A = 1110$, $Q = 1111$, $Q_{-1} = 1$.
:::

:::step{why="Pair (1, 1) → shift only (the arithmetic shift copies A's sign bit)."}
Shift: $A = 1111$, $Q = 0111$, $Q_{-1} = 1$.
:::

:::answer
$A\,Q = 1111\,0111 = -9 = 3 \times (-3)$, with 3 operations (the recoding of $1101$ is $0\,{-1}\,{+1}\,{-1}$).
:::
::::

::::example{#ex-booth-min level="gate" title="Edge case: the multiplier −2ⁿ⁻¹ and the multiplicand −2ⁿ⁻¹" depth="standard"}
Recode $Q = 1000$ ($-8$), and explain what goes wrong if $M = 1000$ as well and $A$ has only 4 bits.

:::step{why="Pairs from i = 0: (0,0), (0,0), (0,0), (1,0)."}
Digits $-1\ 0\ 0\ 0$: $-8$, one subtraction.
:::

:::step{why="The subtraction computes A − M = 0 − (−8) = +8, which does not fit in 4-bit 2's complement."}
With $M = -8$ and a 4-bit $A$, the intermediate $A = +8$ needs a fifth bit; the final 8-bit product
$0100\,0000 = 64$ fits (without the extra bit the trace would end at $1100\,0000 = -64$).
:::

:::answer
Recoding is $-1\,0\,0\,0$. Hardware therefore keeps $A$ one bit wider (or handles $-2^{n-1}$ separately);
the recoding itself is always correct.
:::
::::

:::trap{#trap-booth-pair title="Reading the pair in the wrong direction" depth="quick"}
The digit is (bit to the **right**) minus (current bit): pair $10$ (current 1, right 0) is $-1$. Reading
it as current minus right flips every sign and gives $+57$ for $-57$. Also remember the appended
$q_{-1} = 0$: without it the lowest digit is lost.
:::

::::check{#check-booth title="Your turn" depth="standard"}
Booth-recode the 6-bit multiplier $110110$ ($-10$) and count the operations.

:::answer
Pairs from the right with $q_{-1} = 0$: $(0,0) \to 0$, $(1,0) \to -1$, $(1,1) \to 0$, $(0,1) \to +1$,
$(1,0) \to -1$, $(1,1) \to 0$. MSB first: $0\,{-1}\,{+1}\,0\,{-1}\,0 = -16 + 8 - 2 = -10$, three operations.
:::
::::

:::note{#recap-booth title="Recap" depth="quick"}
$d_i = q_{i-1} - q_i$, $q_{-1} = 0$: $10 \to -1$, $01 \to +1$, else 0. $\sum d_i 2^i = Q$ exactly, so
negative multipliers need no special case. Registers: subtract on 10, add on 01, then arithmetic shift.
:::

## Counting Booth's additions and subtractions

:::intuition{#count-intuition title="Pay only at the edges of each run" depth="standard"}
Plain shift-and-add pays once for every 1 in the multiplier, so a multiplier full of 1s is
expensive. Booth pays only where the bits **change**: once where a run of 1s begins (a subtraction)
and once where it ends (an addition). Inside a run, and inside a run of 0s, it only shifts. So the
cost of a multiplier is the number of its run boundaries, which can be far fewer than its 1s
(long runs) or far more (alternating bits).
:::

:::definition{#booth-count term="Number of operations, best and worst multipliers" depth="quick"}
Booth performs one addition or subtraction for every **non-zero recoded digit**, i.e. for every
position $i$ (with $q_{-1} = 0$) where $q_i \ne q_{i-1}$: the number of **bit changes** when the multiplier
is read from $q_{-1}$ upward. The multiplicand does not matter.

- **Best:** all 0s or all 1s (0 or 1 operation), and in general long runs.
- **Worst:** alternating bits. $0101\ldots01$ changes at every position: $n$ operations. $1010\ldots10$
  changes at all but the lowest: $n - 1$. Plain shift-and-add on these needs only about $n/2$ additions,
  so Booth is **worse** than plain shift-and-add for alternating multipliers.
:::

:::derivation{#booth-count-why of="why the count equals the number of bit changes" depth="standard"}
$d_i = q_{i-1} - q_i$ is non-zero exactly when the two bits differ. Each non-zero digit is one addition
($+1$) or subtraction ($-1$), and each zero digit is a shift only. So the operation count is
$\#\{\,i : q_i \ne q_{i-1}\,\}$ for $i = 0 \dots n - 1$.

**Sanity check.** $0111\,1110$: changes at $i = 1$ ($1$ over $0$) and $i = 7$ ($0$ over $1$): 2 operations,
matching $+1\,0\,0\,0\,0\,0\,{-1}\,0$.
:::

### Worked examples: counting

::::example{#ex-count-run level="easy" title="A run of six 1s" depth="quick"}
How many additions/subtractions does Booth need for $Q = 0111\,1110$, compared with plain shift-and-add?

:::step{why="Bit changes reading from the appended 0: 0→0 (none), then 0→1 at i = 1, …, 1→0 at i = 7."}
Two changes: Booth needs 2 operations.
:::

:::step{why="Plain shift-and-add adds once per 1."}
Six 1s: 6 additions.
:::

:::answer
Booth 2, plain 6.
:::
::::

::::example{#ex-count-16 level="medium" title="A 16-bit multiplier" depth="standard"}
Count Booth's operations for $Q = 0011\,1100\,1111\,0000$.

:::step{why="Mark the runs: from the right, four 0s, four 1s, two 0s, four 1s, two 0s."}
Runs of 1s at bits 4–7 and 10–13.
:::

:::step{why="Each run of 1s costs one subtraction (where it starts) and one addition (just above where it ends)."}
$2 \times 2 = 4$ operations: recoding $0\,{+1}\,0\,0\,0\,{-1}\,0\,{+1}\,0\,0\,0\,{-1}\,0\,0\,0\,0$.
:::

:::answer
4 operations (plain shift-and-add: 8 additions).
:::
::::

::::example{#ex-count-alt level="gate" title="The worst case" depth="standard"}
Count Booth's operations for the 16-bit multipliers $0101\ldots0101$ and $1010\ldots1010$.

:::step{why="0101…01: the lowest pair (q₀, q₋₁) = (1, 0) already changes, and every later pair alternates."}
16 changes: 16 operations.
:::

:::step{why="1010…10: the lowest pair (0, 0) does not change; all 15 later pairs do."}
15 operations.
:::

:::answer
16 and 15, against 8 additions each for plain shift-and-add: alternating bits are Booth's worst case.
:::
::::

::::example{#ex-count-edge level="gate" title="Edge case: a negative multiplier's top run" depth="standard"}
How many operations does Booth need for $Q = 1111\,0000$, and why is there no addition at the top?

:::step{why="One change, at i = 4 (1 over 0): a subtraction."}
Recoding $0\,0\,0\,{-1}\,0\,0\,0\,0 = -16$.
:::

:::step{why="The run of 1s reaches the top bit, so there is no position above it where a +1 would appear; the missing +2⁸ is exactly the negative weight of the sign bit."}
$1111\,0000 = -16$ in 8 bits.
:::

:::answer
1 operation. A run of 1s that reaches the sign bit costs a single subtraction.
:::
::::

:::table{#booth-vs-plain title="Booth against plain shift-and-add (8-bit multipliers)" depth="standard"}
| Multiplier | 1s (plain adds) | Booth operations | Better |
|:--|:--|:--|:--|
| $0111\,1110$ | 6 | 2 | Booth |
| $1111\,0000$ | 4 | 1 | Booth |
| $0011\,0011$ | 4 | 4 | equal |
| $0101\,0101$ | 4 | 8 | plain |
| $0000\,0000$ | 0 | 0 | equal |
:::

:::trick{#trick-boundaries title="Count the boundaries, not the 1s" depth="standard"}
Write the multiplier, append a 0, and draw a bar wherever two neighbouring bits differ. The number
of bars is Booth's operation count. **Why it works:** each bar is a non-zero digit
$d_i = q_{i-1} - q_i$. **When it fails:** never for the count; but remember a bar at the very top
cannot exist (there is no bit above the sign bit), so a run that reaches the sign bit costs one
operation, not two.
:::

:::trap{#trap-booth-count title="Counting only the additions, or counting the 1s" depth="quick"}
GATE asks for "additions/subtractions": count **every** non-zero digit. Counting the 1s of the
multiplier gives the plain shift-and-add count, and counting only the $+1$ digits roughly halves the answer.
:::

:::note{#recap-count title="Recap" depth="quick"}
Booth's operations = bit changes of $q_{n-1} \ldots q_0 q_{-1}$. Runs are cheap; alternation is the worst
case ($n$ for $0101\ldots01$).
:::

## Bit-pair (radix-4) recoding

:::definition{#bitpair term="Bit-pair (radix-4) recoding" depth="quick"}
Group the Booth digits in pairs: $D_k = 2 d_{2k+1} + d_{2k}$. In terms of the multiplier bits, the
triple $(q_{2k+1}, q_{2k}, q_{2k-1})$ gives

$$
D_k = -2 q_{2k+1} + q_{2k} + q_{2k-1} ,
$$

| $q_{i+1}\,q_i\,q_{i-1}$ | 000 | 001 | 010 | 011 | 100 | 101 | 110 | 111 |
|:--|:--|:--|:--|:--|:--|:--|:--|:--|
| Partial product | 0 | $+M$ | $+M$ | $+2M$ | $-2M$ | $-M$ | $-M$ | 0 |

Each digit is in $\{-2, -1, 0, +1, +2\}$ and multiplies $M \cdot 4^k$, so an $n$-bit multiplier needs only
$n/2$ partial products, each of which is $0$, $\pm M$ or $\pm 2M$ (a shift).
:::

:::derivation{#bitpair-why of="the bit-pair table from the Booth digits" depth="standard"}
$D_k = 2 d_{2k+1} + d_{2k} = 2(q_{2k} - q_{2k+1}) + (q_{2k-1} - q_{2k}) = -2 q_{2k+1} + q_{2k} + q_{2k-1}$.
Substituting the eight triples gives the table: e.g. $100 \to -2$, $111 \to -2 + 1 + 1 = 0$,
$011 \to 0 + 1 + 1 = 2$. Since $\sum_k D_k 4^k = \sum_i d_i 2^i = Q$, the recoding is exact.

**Sanity check.** $Q = 0110$ (6): triples $(1,0,0) \to -2$ and $(0,1,1) \to +2$, so $D_1 D_0 = (+2)(-2)$
and $2 \cdot 4 - 2 = 6$.
:::

:::viz{#bitpair-viz spec="bitpair-table" mode="animate" depth="standard"}
:::

### Worked examples: bit-pair recoding

::::example{#ex-bp-six level="easy" title="Bit-pair recode 0110" depth="quick"}
Recode $Q = 0110$ (6) in radix 4.

:::step{why="Append q₋₁ = 0; the triples are (q₁, q₀, q₋₁) = (1, 0, 0) and (q₃, q₂, q₁) = (0, 1, 1)."}
$100 \to -2$, $011 \to +2$.
:::

:::step{why="Check against radix-2 Booth: 0110 recodes to +1 0 −1 0; pairing the digits gives 2(+1) + 0 = +2 and 2(−1) + 0 = −2."}
The same digits: $(+2)(-2)$.
:::

:::answer
$D_1 D_0 = (+2)(-2)$: $2 \times 4 - 2 = 6$. Two partial products: $+2M \cdot 4$ and $-2M$.
:::
::::

::::example{#ex-bp-neg level="medium" title="Bit-pair recode −29" depth="standard"}
Recode the 8-bit $-29 = 1110\,0011$ in radix 4.

:::step{why="Triples from the right: (q₁,q₀,q₋₁) = (1,1,0), (q₃,q₂,q₁) = (0,0,1), (q₅,q₄,q₃) = (1,0,0), (q₇,q₆,q₅) = (1,1,1)."}
$110 \to -1$, $001 \to +1$, $100 \to -2$, $111 \to 0$.
:::

:::step{why="Check: D₃D₂D₁D₀ = 0, −2, +1, −1."}
$0 \cdot 64 - 2 \cdot 16 + 1 \cdot 4 - 1 = -29$.
:::

:::answer
$0\ {-2}\ {+1}\ {-1}$: 3 non-zero partial products out of 4, against 3 operations for radix-2 here but
always at most $n/2 = 4$ for radix 4.
:::
::::

::::example{#ex-bp-table level="gate" title="Fill in two rows of the table" depth="standard"}
In the bit-pair table, what are the partial products for the triples $011$ and $110$?

:::step{why="Use D = −2q_{i+1} + q_i + q_{i−1}."}
$011$: $0 + 1 + 1 = +2$. $110$: $-2 + 1 + 0 = -1$.
:::

:::step{why="Read the meaning: 011 is the end of a run entering from the right; 110 is a run starting at bit i."}
Both agree with the radix-2 picture: two +1s below, or a −1 at the start of a run.
:::

:::answer
$+2M$ and $-M$. (A run of 1s entering from the right adds; a run starting inside the pair subtracts.)
:::
::::

::::example{#ex-bp-odd level="gate" title="Edge case: an odd number of bits" depth="standard"}
Bit-pair recode the 5-bit multiplier $10110$ ($-10$).

:::step{why="Radix 4 needs an even length: sign-extend to 6 bits (copy the sign bit)."}
$110110$.
:::

:::step{why="Triples: (1,0,0) → −2, (0,1,1) → +2, (1,1,0) → −1."}
$D_2 D_1 D_0 = (-1)(+2)(-2)$: $-16 + 8 - 2 = -10$.
:::

:::answer
$-1\ {+2}\ {-2}$. Padding with 0 instead would make it the positive number $22$.
:::
::::

::::check{#check-bitpair title="Your turn" depth="standard"}
Bit-pair recode $Q = 0101$ (5) and check the value.

:::answer
Triples: $(q_1, q_0, q_{-1}) = 010 \to +1$ and $(q_3, q_2, q_1) = 010 \to +1$, so $D_1 D_0 = (+1)(+1)$ and
$4 + 1 = 5$. Radix-2 Booth needed four digits ${+1}\,{-1}\,{+1}\,{-1}$; radix 4 needs two.
:::
::::

:::note{#recap-bitpair title="Recap" depth="quick"}
$D = -2q_{i+1} + q_i + q_{i-1}$: $000/111 \to 0$, $001/010 \to +M$, $011 \to +2M$, $100 \to -2M$,
$101/110 \to -M$. Half as many partial products; sign-extend to an even length first.
:::

:::aside{#division-aside title="Further depth: restoring and non-restoring division" depth="deep"}
Binary division by hardware mirrors long division. **Restoring:** shift the remainder left, subtract
the divisor; if the result is negative, add the divisor back ("restore") and write quotient bit 0,
else write 1. **Non-restoring** skips the restore: if the remainder is negative, the next step **adds**
the divisor instead of subtracting, and a single correction at the end fixes the remainder. For
$7 \div 2$ (4 bits) both produce quotient $0011$ and remainder $0001$; non-restoring saves one addition
per negative step. No GATE Digital Logic question has asked about them so far; they belong with the
divider circuits of computer organisation.
:::

## GATE questions on this lesson

All eight previous-year questions on signed multiplication and Booth recoding. (The array-multiplier
delay questions stay with the hardware in Chapter 5.)

:::pyq{id="cse-1991-a-1-v" tests="product-bits" depth="standard"}
:::

:::pyq{id="cse-2004-cs-66" tests="signed-shift-add,product-width" depth="standard"}
:::

:::pyq{id="cse-1999-a-20" tests="booth-recode,booth-value,trap-booth-pair" depth="standard"}
:::

:::pyq{id="it-2005-cs-8" tests="booth-recode,booth-value" depth="standard"}
:::

:::pyq{id="cse-1996-a-23" tests="booth-count,booth-count-why" depth="standard"}
:::

:::pyq{id="it-2006-cs-38" tests="bitpair,bitpair-why" depth="standard"}
:::

:::pyq{id="it-2008-it-42" tests="booth-count,trap-booth-count" depth="standard"}
:::

:::pyq{id="cse-2025-2-cs-22" tests="booth-count,trap-booth-count" depth="standard"}
:::

## Practice

Our own questions; every answer is computed by `l10_multiplication_booth.py`.

:::practice{id="nx-dl-01-10-q01" depth="standard"}
:::

:::practice{id="nx-dl-01-10-q02" depth="standard"}
:::

:::practice{id="nx-dl-01-10-q03" depth="standard"}
:::

:::practice{id="nx-dl-01-10-q04" depth="standard"}
:::

:::practice{id="nx-dl-01-10-q05" depth="standard"}
:::

:::practice{id="nx-dl-01-10-q06" depth="standard"}
:::

:::practice{id="nx-dl-01-10-q07" depth="standard"}
:::

:::practice{id="nx-dl-01-10-q08" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Signed multiplication and Booth on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Signed shift-and-add | sign-extend partial products to $2n$ bits; the multiplier's sign bit subtracts |
| Product width | $2n$ bits always suffice for $n$-bit signed operands |
| Low product bits | $c_0 = a_0b_0$, $c_1 = a_1b_0 \oplus a_0b_1$ |
| Booth digit | $d_i = q_{i-1} - q_i$, $q_{-1} = 0$: $10 \to -1$, $01 \to +1$, $00/11 \to 0$ |
| Exactness | $\sum d_i 2^i = Q$ (telescoping), negative $Q$ included |
| Registers | $10$: $A - M$; $01$: $A + M$; then arithmetic shift $A, Q, Q_{-1}$ |
| Operation count | number of bit changes in $q_{n-1}\ldots q_0 q_{-1}$ |
| Best / worst | runs / alternating ($0101\ldots01$: $n$ operations) |
| Bit-pair | $D = -2q_{i+1} + q_i + q_{i-1}$; digits $0, \pm1, \pm2$; $n/2$ partial products |
:::
