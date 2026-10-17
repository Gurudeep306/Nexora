---
id: code-arithmetic
subject: dl
chapter: number-systems
title: Arithmetic with number codes
order: 9
prerequisites: [signed-numbers, codes]
pyq_topics: [dl/arithmetic, dl/number]
est_minutes: 75
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every value is checked by content/gate-notes/_checks/dl/l09_code_arithmetic.py (exact integer arithmetic, brute force over every operand pair where a rule is claimed)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 20–21 (overflow; its opposite-sign remark is errata X3), set B pp. 141–148 and 159–160 (complements, BCD adder), set C pp. 203–216 (binary arithmetic, complement subtraction, overflow, BCD and excess-3 addition)."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (complements, signed addition and subtraction, BCD addition); M. Morris Mano, Computer System Architecture (overflow, arithmetic shifts)."
  - "PYQs: src/gate/questions.json (dl/arithmetic overflow and number-level questions moved from Chapter 5, plus it-2005-cs-47 and cse-2010-cs-8), keys re-derived in l09_code_arithmetic.py."
updated: "2026-10-17"
---

You can now write numbers in any base, as signed patterns, in floating point and in codes such as
BCD and excess-3. This lesson does **arithmetic** on all of them, by hand, at the level of the
numbers themselves: adding with carries, subtracting with borrows or with complements, multiplying
and dividing, deciding when a signed result has **overflowed**, and fixing up BCD and excess-3 sums.
These are the rules the adder circuits of Chapter 5 implement; here you learn why they are right, so
that GATE's "which of these overflows?" and "what are the flags?" questions become one-line checks.

## Where this fits

This lesson and the next close Chapter 1, and they use most of it: place value and base-$b$ digits (Lessons
[1](lesson:place-value) and [2](lesson:power-of-two-bases)), complements and signed patterns
([Lesson 4](lesson:signed-numbers)) and the codes of [Lesson 8](lesson:codes). Multiplication of
signed numbers and Booth's algorithm follow in [Lesson 10](lesson:multiplication-booth). Chapter 5
then builds the circuits: the XOR adder–subtractor, the flag logic and the BCD adder.

:::table{#radar title="GATE radar: arithmetic with number codes" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 15 (1992–2026); overflow questions appear in most recent papers |
| Marks | 10 one-mark, 3 two-mark, 2 descriptive (1992, 5-mark 1995) |
| Formats | 11 MCQ, 2 MSQ, 2 descriptive |
| Pattern 1 | Which 2's-complement sum or difference overflows (2004, 2006, 2022, 2024, 2026) |
| Pattern 2 | The overflow condition in terms of signs or carries (1992, 2002, 2006, 2017) |
| Pattern 3 | Flags after an addition (2008); sign-magnitude overflow and widths (2019, 2026) |
| Pattern 4 | Arithmetic in base 8 (2005), shifts as multiplication (2010), unsigned byte arithmetic (1995) |
| What examiners test | Carry out ≠ overflow, subtraction overflow with opposite signs, and the +6 / ±3 corrections |
:::

## Adding and subtracting in binary

:::intuition{#add-intuition title="The same column method as in school" depth="standard"}
Binary addition is the column method you learned for decimals, with one change: a column carries as
soon as it reaches **2** instead of 10. So $1 + 1 = 10_2$ (write 0, carry 1) and $1 + 1 + 1 = 11_2$
(write 1, carry 1). Subtraction borrows a **2** from the next column instead of a 10. Everything
else, including checking by converting back, is the same.
:::

:::definition{#binary-add term="Binary addition and subtraction rules" depth="quick"}
Per column, with incoming carry $c$ or borrow $b$:

| $x + y + c$ | write | carry | | $x - y - b$ | write | borrow |
|:--|:--|:--|:--|:--|:--|:--|
| 0 | 0 | 0 | | 0 | 0 | 0 |
| 1 | 1 | 0 | | 1 | 1 | 0 |
| 2 | 0 | 1 | | −1 | 1 | 1 |
| 3 | 1 | 1 | | −2 | 0 | 1 |

A borrow adds 2 to the current column and takes 1 from the next. A carry out of the top column of an
$n$-bit **unsigned** sum means the result needs $n + 1$ bits; a borrow out of the top column means the
unsigned difference is negative.
:::

:::viz{#carry-viz spec="column-add-carry" mode="animate" depth="standard"}
:::

### Worked examples: adding and subtracting

::::example{#ex-add-small level="easy" title="1011 + 0110" depth="quick"}
Add $1011_2$ and $0110_2$.

:::step{why="Start from the right: 1 + 0 = 1, no carry."}
Column 0: $1$. Column 1: $1 + 1 = 10_2$, write 0, carry 1.
:::

:::step{why="Each later column adds its two bits and the carry."}
Column 2: $0 + 1 + 1 = 10_2$, write 0, carry 1. Column 3: $1 + 0 + 1 = 10_2$, write 0, carry 1, which
becomes a new top bit.
:::

:::answer
$10001_2 = 17$; check $11 + 6 = 17$. The fifth bit is the carry out of a 4-bit sum.
:::
::::

::::example{#ex-add-byte level="medium" title="Two bytes with a carry out" depth="standard"}
Add $10110101_2$ and $01101110_2$ as unsigned bytes.

:::step{why="Convert both to decimal first, so the column work can be checked."}
$10110101_2 = 181$, $01101110_2 = 110$.
:::

:::step{why="Column by column from the right, carrying 1 whenever a column reaches 2."}
$\;\;10110101 + 01101110 = 1\,00100011_2$.
:::

:::answer
$1\,0010\,0011_2 = 291 = 181 + 110$. In an 8-bit register the stored sum is $0010\,0011 = 35$ and the
carry flag is 1, because $291 > 255$.
:::
::::

::::example{#ex-sub-borrow level="gate" title="A borrow chain: 1000 − 0011" depth="standard"}
Compute $1000_2 - 0011_2$ by borrowing.

:::step{why="Column 0 is 0 − 1, so it must borrow; the next columns are 0, so the borrow travels left until it finds the 1."}
The 1 in column 3 lends 2 to column 2, which lends 2 to column 1, which lends 2 to column 0. After the
chain: columns 3…0 hold $0, 1, 1, 2$.
:::

:::step{why="Now subtract column by column."}
Column 0: $2 - 1 = 1$. Column 1: $1 - 1 = 0$. Column 2: $1 - 0 = 1$. Column 3: $0 - 0 = 0$.
:::

:::answer
$0101_2 = 5 = 8 - 3$.
:::
::::

::::example{#ex-sub-negative level="gate" title="Edge case: a borrow out of the top" depth="standard"}
Compute $0101_2 - 0111_2$ in 4 bits and interpret the result.

:::step{why="Column 1 needs 0 − 1 after column 0 gives 1 − 1 = 0; borrow from column 2."}
The subtraction runs out of bits: a borrow leaves the top column.
:::

:::step{why="Bits written: 1110, with a borrow out. A borrow out means the true result is negative and the pattern is 2^4 + (true result)."}
Pattern $1110 = 14 = 16 + (5 - 7)$.
:::

:::answer
As unsigned the answer is "negative" (borrow out); read as 4-bit 2's complement, $1110 = -2 = 5 - 7$,
which is why subtraction in 2's complement needs no special case.
:::
::::

:::note{#recap-binary-add title="Recap" depth="quick"}
Carry at 2, borrow 2. A carry out of an unsigned sum means it needs one more bit; a borrow out of an
unsigned difference means it is negative, and the pattern left behind is its $n$-bit 2's complement.
:::

## Multiplying and dividing in binary

:::definition{#binary-mul term="Shift-and-add multiplication and long division" depth="quick"}
**Multiplication.** For each 1 in the multiplier, write the multiplicand shifted left by that bit's
position; add the shifted copies (the **partial products**). Multiplying $m$-bit and $n$-bit unsigned
numbers needs at most $m + n$ bits, and there are as many non-zero partial products as 1s in the
multiplier.

**Division.** Long division with quotient digits 0 or 1: at each step, if the divisor fits under the
current remainder, write 1 and subtract; otherwise write 0 and bring down the next bit.
:::

:::derivation{#mul-why of="why shift-and-add is multiplication" depth="standard"}
Write the multiplier as $Q = \sum q_i 2^{i}$. Then $M \times Q = \sum q_i (M \cdot 2^{i})$, and $M \cdot 2^{i}$ is
$M$ shifted left by $i$ places. Each $q_i$ is 0 or 1, so each term is either nothing or a shifted copy.
The product of numbers below $2^m$ and $2^n$ is below $2^{m+n}$, hence at most $m + n$ bits.

**Sanity check.** $101 \times 11 = 101 + 1010 = 1111$: $5 \times 3 = 15$.
:::

### Worked examples: multiplying and dividing

::::example{#ex-mul-small level="easy" title="101 × 11" depth="quick"}
Multiply $101_2$ by $11_2$.

:::step{why="The multiplier has 1s at positions 0 and 1, so add M and M shifted once."}
$101 + 1010 = 1111$.
:::

:::step{why="Check by decimal: the shifted copies are worth 5 and 10."}
$5 + 10 = 15 = 5 \times 3$.
:::

:::answer
$1111_2 = 15 = 5 \times 3$.
:::
::::

::::example{#ex-mul-four level="medium" title="1101 × 1011" depth="standard"}
Multiply $1101_2$ (13) by $1011_2$ (11).

:::step{why="Multiplier bits 0, 1 and 3 are 1: three partial products."}
$1101$, $11010$, $1101000$.
:::

:::step{why="Add them; carries ripple as usual."}
$1101 + 11010 = 100111$; $100111 + 1101000 = 10001111$.
:::

:::answer
$10001111_2 = 143 = 13 \times 11$, which fits in $4 + 4 = 8$ bits.
:::
::::

::::example{#ex-div-long level="gate" title="Long division: 100111 ÷ 101" depth="standard"}
Divide $100111_2$ (39) by $101_2$ (5).

:::step{why="101 (5) does not fit under 1, 10 or 100 (4); it first fits under the leading four bits 1001 (9)."}
First quotient bit at the 4th bit: $1001 - 101 = 100$.
:::

:::step{why="Bring down the next bit: 1001 again; 101 fits."}
$1001 - 101 = 100$, quotient so far $11$.
:::

:::step{why="Bring down the last bit: 1001; 101 fits once more."}
$1001 - 101 = 100$, quotient $111$, remainder $100$.
:::

:::answer
$111_2$ remainder $100_2$: $39 = 5 \times 7 + 4$.
:::
::::

::::example{#ex-mul-frac level="gate" title="Edge case: a fractional product" depth="standard"}
Multiply $1.1_2$ by $1.1_2$ and place the point.

:::step{why="Multiply as integers (11 × 11 = 1001), then count fraction bits: 1 + 1 = 2."}
$11_2 \times 11_2 = 1001_2$.
:::

:::step{why="Two fraction bits in the factors give two fraction bits in the product."}
$10.01_2$.
:::

:::answer
$10.01_2 = 2.25 = 1.5 \times 1.5$. (This is exactly the significand step of a float multiply, Lesson 7.)
:::
::::

:::note{#recap-binary-mul title="Recap" depth="quick"}
Product = sum of shifted copies of the multiplicand, one per 1 in the multiplier; $m + n$ bits
suffice. Division: compare, subtract, bring down. Fraction bits add up in a product.
:::

## Arithmetic in base 8, 16 and any base b

:::definition{#base-b-arith term="Column arithmetic in base b" depth="quick"}
In base $b$ a column **carries** when its total reaches $b$ (write total $- b$, carry 1) and a
**borrow** adds $b$ to the column. To multiply, multiply digit by digit in decimal, then write each
product in base $b$ (quotient = carry, remainder = digit). When in doubt, convert both operands to
decimal, compute, and convert back (Lesson 1); that is also the best check.
:::

### Worked examples: base-b arithmetic

::::example{#ex-oct-add level="easy" title="56₈ + 27₈" depth="quick"}
Add $56_8$ and $27_8$.

:::step{why="Units: 6 + 7 = 13 ≥ 8, so write 13 − 8 = 5 and carry 1."}
Units digit 5, carry 1.
:::

:::step{why="Eights: 5 + 2 + 1 = 8 ≥ 8, write 0 and carry 1."}
Eights digit 0, carry 1 into a new digit.
:::

:::answer
$105_8$; check $46 + 23 = 69 = 64 + 5$.
:::
::::

::::example{#ex-hex-sub level="medium" title="B4₁₆ − 6F₁₆" depth="standard"}
Subtract $6F_{16}$ from $B4_{16}$.

:::step{why="Units: 4 − F (15) needs a borrow of 16."}
$4 + 16 - 15 = 5$.
:::

:::step{why="Sixteens: B (11) − 1 (borrow) − 6 = 4."}
Digit 4.
:::

:::answer
$45_{16}$; check $180 - 111 = 69 = 4 \times 16 + 5$.
:::
::::

::::example{#ex-base5-mul level="gate" title="34₅ × 23₅" depth="standard"}
Multiply $34_5$ by $23_5$.

:::step{why="Convert to decimal: the safe route for multiplication in an unfamiliar base."}
$34_5 = 19$, $23_5 = 13$, product $247$.
:::

:::step{why="Back to base 5 by repeated division (Lesson 1)."}
$247 = 5 \cdot 49 + 2$, $49 = 5 \cdot 9 + 4$, $9 = 5 \cdot 1 + 4$, $1 = 5 \cdot 0 + 1$: digits $1, 4, 4, 2$.
:::

:::answer
$1442_5$.
:::
::::

::::example{#ex-base7-borrow level="gate" title="Edge case: a borrow across zeros in base 7" depth="standard"}
Compute $1000_7 - 1_7$.

:::step{why="The units column must borrow, and the borrow has to travel through two zeros."}
Each zero lends a 7 to its right neighbour after borrowing 1 from its left, ending as $7 - 1 = 6$.
:::

:::step{why="Check in decimal: 1000 in base 7 is 7³ = 343, and one less is 342."}
$666_7 = 6 \cdot 49 + 6 \cdot 7 + 6 = 342 = 343 - 1$.
:::

:::answer
$666_7$ (the largest 3-digit base-7 numeral, $7^3 - 1 = 342$).
:::
::::

:::note{#recap-base title="Recap" depth="quick"}
Carry at $b$, borrow $b$; multiply digit-wise or via decimal. Always check by converting back.
:::

## Subtraction with complements

:::intuition{#comp-intuition title="Subtract by adding" depth="standard"}
A machine that can only add can still subtract: replace $-N$ by its complement and add. On an
$n$-digit odometer, going back $N$ steps lands on the same place as going forward $r^n - N$ steps.
The two complements of Lesson 4 differ in one detail, what to do with the carry out of the top digit,
and that detail is the famous **end-around carry**.
:::

:::definition{#radix-sub term="Subtraction with the r's complement" depth="quick"}
To compute $M - N$ with $n$ digits in base $r$:

1. Add $M$ and the $r$'s complement of $N$: $\;M + (r^n - N)$.
2. **Carry out** of the top digit: discard it; the remaining digits are $M - N \ge 0$.
3. **No carry:** the result is negative; its magnitude is the $r$'s complement of the sum.
:::

:::definition{#diminished-sub term="Subtraction with the (r − 1)'s complement" depth="quick"}
1. Add $M$ and the $(r-1)$'s complement of $N$: $\;M + (r^n - 1 - N)$.
2. **Carry out:** remove it and **add 1 to the result** (the end-around carry); the result is $M - N > 0$.
3. **No carry:** the result is negative (or zero); its magnitude is the $(r-1)$'s complement of the sum.
:::

:::theorem{#end-around name="The end-around carry gives M − N" depth="standard"}
For $n$-digit $M, N$ in base $r$, let $S = M + (r^n - 1 - N)$. If $M > N$, then $S$ has a carry out, and
$(S - r^n) + 1 = M - N$. If $M \le N$, then $S$ has no carry out, and $S$ is the $(r-1)$'s complement of
$N - M$.
:::

:::proof{#proof-end-around of="the end-around carry rule" depth="deep"}
**Idea first:** the $(r-1)$'s complement is one short of the $r$'s complement, so whatever the carry
takes away, the end-around carry gives back.

$S = r^n + (M - N - 1)$. If $M > N$, then $M - N - 1 \ge 0$, so $S \ge r^n$: there is a carry out
(worth $r^n$), and removing it leaves $M - N - 1$; adding 1 gives $M - N$. If $M \le N$, then
$M - N - 1 < 0$, so $S = r^n - 1 - (N - M) < r^n$: no carry, and $S$ is exactly the $(r-1)$'s complement of
$N - M$. For the $r$'s complement, $S' = M + r^n - N = r^n + (M - N)$ and the same case split applies
with no "+1" (and $M = N$ gives a carry and the result 0).
:::

:::viz{#comp-viz spec="complement-subtraction" mode="animate" depth="standard"}
:::

### Worked examples: complement subtraction

::::example{#ex-tens-sub level="easy" title="72532 − 3250 with the 10's complement" depth="quick"}
Compute $72532 - 3250$ with 5 digits and the 10's complement.

:::step{why="Pad N to 5 digits and take its 10's complement: 10^5 − 03250."}
$10^5 - 03250 = 96750$.
:::

:::step{why="Add; a carry out of the top digit means a non-negative result, and the carry is dropped."}
$72532 + 96750 = 1\,69282$ → $69282$.
:::

:::answer
$69282$.
:::
::::

::::example{#ex-ones-sub level="medium" title="1010100 − 1000011 with the 1's complement" depth="standard"}
Compute $1010100_2 - 1000011_2$ (84 − 67) with the 1's complement.

:::step{why="The 1's complement of 1000011 flips every bit."}
$0111100$.
:::

:::step{why="Add; there is a carry out of the 7th bit."}
$1010100 + 0111100 = 1\,0010000$.
:::

:::step{why="End-around carry: remove the carry and add it to the result."}
$0010000 + 1 = 0010001$.
:::

:::answer
$0010001_2 = 17 = 84 - 67$.
:::
::::

::::example{#ex-nines-neg level="gate" title="3250 − 72532 with the 9's complement" depth="standard"}
Compute $3250 - 72532$ with 5 digits and the 9's complement.

:::step{why="9's complement of 72532: subtract every digit from 9."}
$27467$.
:::

:::step{why="Add to 03250."}
$03250 + 27467 = 30717$, with **no** carry out.
:::

:::step{why="No carry: the result is negative and its magnitude is the 9's complement of the sum."}
$99999 - 30717 = 69282$.
:::

:::answer
$-69282$.
:::
::::

::::example{#ex-oct-comp level="gate" title="Edge case: base 8, and the negative zero" depth="standard"}
(a) Compute $352_8 - 617_8$ with the 8's complement. (b) Compute $25 - 25$ with the 9's complement.

:::step{why="(a) 8's complement of 617 is 777 − 617 + 1 = 161."}
$352_8 + 161_8 = 533_8$, no carry (still 3 digits).
:::

:::step{why="No carry: negative, magnitude = 8's complement of 533."}
$777_8 - 533_8 + 1 = 245_8$, so the answer is $-245_8$ ($234 - 399 = -165$).
:::

:::step{why="(b) 9's complement of 25 is 74; 25 + 74 = 99 has no carry, so the result is negative with magnitude 99 − 99 = 0."}
$-00$: the $(r-1)$'s complement's "negative zero".
:::

:::answer
(a) $-245_8$. (b) $-0$; with the 10's complement, $25 + 75 = 1\,00$ gives a carry and a plain $0$.
:::
::::

:::trap{#trap-end-around title="Forgetting the end-around carry, or adding it with the r's complement" depth="quick"}
With the $(r-1)$'s complement the carry must be **added back**; with the $r$'s complement it is simply
**dropped**. Mixing the two is off by one: $84 - 67$ with the 1's complement without the end-around
carry gives 16.
:::

:::note{#recap-comp title="Recap" depth="quick"}
$M - N = M + \text{complement}(N)$. $r$'s: drop the carry. $(r-1)$'s: add the carry back. No carry in
either: negative, magnitude = complement of the sum.
:::

## Signed addition and overflow

:::definition{#signed-add-rules term="Adding signed numbers in the three representations" depth="quick"}
- **2's complement:** add the patterns as unsigned numbers and **drop** the carry out; subtract by
  adding the 2's complement. The result is correct unless it overflows.
- **1's complement:** add, and add any carry out back in (end-around carry).
- **Sign-magnitude:** same signs: add the magnitudes, keep the sign. Different signs: subtract the
  smaller magnitude from the larger and take the sign of the larger. Overflow only when the magnitude
  sum needs an extra bit.
:::

:::definition{#overflow-rule term="Overflow in 2's-complement addition" depth="quick"}
An $n$-bit 2's-complement sum **overflows** when the true sum lies outside $-2^{n-1} \dots 2^{n-1} - 1$.
Equivalent tests:

1. The operands have the **same sign** and the result has the **other** sign:
   $V = a_{n-1} b_{n-1} \overline{s_{n-1}} + \overline{a_{n-1}}\,\overline{b_{n-1}}\, s_{n-1}$.
2. The carry **into** the sign bit differs from the carry **out** of it: $V = c_{n-1} \oplus c_n$.

Operands of opposite signs never overflow when **added**. For subtraction $A - B = A + (-B)$, so it can
overflow only when $A$ and $B$ have **opposite** signs.
:::

:::theorem{#overflow-theorem name="Overflow = carry into the MSB ≠ carry out of the MSB" depth="standard"}
For $n$-bit 2's-complement addition with carries $c_{n-1}$ (into the sign column) and $c_n$ (out of
it), the sum overflows exactly when $c_{n-1} \ne c_n$.
:::

:::proof{#proof-overflow-theorem of="the carry rule for overflow" depth="deep"}
**Idea first:** check the four sign combinations; the sign column alone decides.

Let $a, b$ be the sign bits and $s = a \oplus b \oplus c_{n-1}$, $c_n = ab + c_{n-1}(a \oplus b)$.

- $a = b = 0$ (both non-negative): $c_n = 0$. Overflow iff the result looks negative, $s = 1$, iff $c_{n-1} = 1$. So overflow iff $c_{n-1} = 1 \ne 0 = c_n$.
- $a = b = 1$ (both negative): $c_n = 1$. Overflow iff the result looks non-negative, $s = 0$, iff $c_{n-1} = 0$. So overflow iff $c_{n-1} = 0 \ne 1 = c_n$.
- $a \ne b$: no overflow is possible (the sum lies between the operands), and $c_n = c_{n-1}$ because $a \oplus b = 1$ and $ab = 0$.

In every case overflow $\iff c_{n-1} \ne c_n$.
:::

:::viz{#overflow-carries-viz spec="overflow-carries" mode="animate" depth="standard"}
:::

:::viz{#wheel-viz spec="overflow-wheel" mode="animate" depth="standard"}
:::

:::table{#carry-vs-overflow title="Carry and overflow are different flags" depth="quick"}
| Flag | Meaning | Set when |
|:--|:--|:--|
| C (carry) | the **unsigned** sum needs $n + 1$ bits | carry out of the MSB, $c_n = 1$ |
| V (overflow) | the **signed** sum is out of range | $c_{n-1} \oplus c_n = 1$ |
| S (sign) / N | the result's top bit | $s_{n-1} = 1$ |
| Z (zero) | the result is 0 | all result bits 0 |
:::

:::definition{#sign-extend-add term="Adding numbers of different widths" depth="quick"}
Before adding a $k$-bit 2's-complement number to an $n$-bit one ($k < n$), **sign-extend** it to $n$
bits (copy its sign bit, Lesson 4). Padding a negative number with zeros turns it into a large
positive number.
:::

### Worked examples: signed addition and overflow

::::example{#ex-ovf-five-four level="easy" title="0101 + 0100 in 4 bits" depth="quick"}
Add $0101$ and $0100$ as 4-bit 2's-complement numbers.

:::step{why="Add as unsigned: 5 + 4 = 9 = 1001, no carry out."}
Result $1001$, $c_4 = 0$; the carry into the sign column is $c_3 = 1$.
:::

:::step{why="Two positive operands gave a negative-looking result, and c3 ≠ c4."}
Overflow: $1001$ reads as $-7$, but $5 + 4 = 9 > 7$.
:::

:::answer
$1001$ with overflow (V = 1) and no carry (C = 0).
:::
::::

::::example{#ex-flags level="medium" title="Flags after an 8-bit addition" depth="standard"}
A processor adds the 8-bit 2's-complement numbers $01101101$ and $11010011$. Give C, V, S and Z.

:::step{why="Decode to see what to expect: 109 and −45, sum 64, which is in range."}
$01101101 = 109$, $11010011 = -45$.
:::

:::step{why="Add as unsigned: 109 + 211 = 320 = 256 + 64."}
Result $0100\,0000$ with a carry out: $C = 1$.
:::

:::step{why="Opposite-sign operands never overflow; the sign bit of the result is 0; the result is not 0."}
$V = 0$, $S = 0$, $Z = 0$.
:::

:::answer
$C = 1$, $V = 0$, $S = 0$, $Z = 0$: the carry out is **not** an overflow.
:::
::::

::::example{#ex-ovf-sub level="gate" title="1011 − 0110 in 4 bits" depth="standard"}
Compute $1011 - 0110$ (that is, $-5 - 6$) in 4-bit 2's complement and decide whether it overflows.

:::step{why="Subtract by adding the 2's complement: −0110 = 1010."}
$1011 + 1010 = 1\,0101$.
:::

:::step{why="Drop the carry; the result 0101 = +5 from two negative operands."}
Carries: $c_3 = 0$, $c_4 = 1$, so $c_3 \ne c_4$.
:::

:::answer
Overflow: $-5 - 6 = -11 < -8$. Subtraction overflowed **because** the original operands had opposite signs.
:::
::::

::::example{#ex-widths level="gate" title="Edge case: different widths and the 1's complement" depth="standard"}
(a) Add the 4-bit $1101$ to the 8-bit $00010100$. (b) Add $1100 + 1101$ in 4-bit 1's complement.

:::step{why="(a) 1101 = −3; sign-extend it to 8 bits by copying the 1."}
$1111\,1101 + 0001\,0100 = 1\,0001\,0001$; drop the carry: $0001\,0001 = 17 = 20 - 3$.
:::

:::step{why="Zero-padding instead would give 0000 1101 = +13 and the wrong sum 33."}
Always sign-extend.
:::

:::step{why="(b) 1100 = −3 and 1101 = −2 in 1's complement; add, then add the carry back."}
$1100 + 1101 = 1\,1001$; end-around: $1001 + 1 = 1010 = -5$.
:::

:::answer
(a) $00010001 = 17$. (b) $1010 = -5$ in 1's complement.
:::
::::

:::trap{#trap-carry-overflow title="A carry out is not an overflow" depth="quick"}
In signed (2's-complement) arithmetic the carry out of the top bit is simply dropped; it says nothing
about overflow ($109 + (-45)$ carries but is correct). Overflow is $c_{n-1} \oplus c_n$, or "same-sign
operands, different-sign result". Option "overflow whenever there is a carry from the sign bit" is the
classic distractor.
:::

:::trap{#trap-sm-overflow title="Sign-magnitude: the magnitudes decide" depth="quick"}
In sign-magnitude, $X - Y$ with opposite signs **adds** the magnitudes, so it can overflow even
though the "values" look small; $X + Y$ with opposite signs subtracts them and never overflows. With
$n$-bit operands the exact result of $X \pm Y$ may need $n + 1$ bits.
:::

:::note{#recap-signed title="Recap" depth="quick"}
2's complement: add, drop the carry, overflow iff $c_{n-1} \ne c_n$ (same-sign operands, other-sign
result). Subtraction overflows only for opposite-sign operands. C is for unsigned, V for signed.
Sign-extend before mixing widths.
:::

## BCD addition: the +6 correction

:::intuition{#bcd-intuition title="Six patterns are skipped" depth="standard"}
A BCD digit uses 4 bits but only the patterns for 0 to 9. When two digits are added in binary and the
sum passes 9, the binary adder keeps counting through the six unused patterns 1010 to 1111 before it
carries at 16. Adding 6 skips those six patterns, so the carry comes out at 10, as decimal wants.
:::

:::definition{#bcd-add term="BCD addition rule" depth="quick"}
Add the two BCD digits (and the incoming decimal carry) in binary. If the 4-bit result is **greater
than 9**, or the addition produced a **carry out of the 4 bits**, add $0110$ (6) to the digit; the
carry out of that correction (or of the first addition) is the decimal carry into the next digit.
:::

:::derivation{#bcd-why-six of="why the correction is exactly 6" depth="standard"}
Two digits plus a carry give a binary sum $T$ between 0 and $9 + 9 + 1 = 19$. Decimal wants the digit
$T - 10$ and a carry when $T \ge 10$. The 4-bit adder gives $T \bmod 16$ and carries only at 16. Adding
6 gives $T + 6$, which is $\ge 16$ exactly when $T \ge 10$, and then $(T + 6) - 16 = T - 10$: the right
digit with a carry out. For $T \le 9$ no correction is applied. So 6 = 16 − 10, the number of unused
patterns.

**Sanity check.** $T = 15$ ($1111$): $1111 + 0110 = 1\,0101$, digit 5, carry 1. ✓
:::

:::viz{#bcd-viz spec="bcd-plus-six" mode="animate" depth="standard"}
:::

:::definition{#bcd-sub term="BCD subtraction with the 9's or 10's complement" depth="quick"}
To compute $A - B$ in BCD: replace $B$ by its 10's complement (9's complement of every digit, plus 1),
add digit by digit **with the BCD correction**, and treat the final decimal carry as in complement
subtraction: carry → drop it, positive result; no carry → negative, magnitude = 10's complement.
:::

### Worked examples: BCD

::::example{#ex-bcd-small level="easy" title="4 + 5 and 8 + 7" depth="quick"}
Add $4 + 5$ and $8 + 7$ in BCD.

:::step{why="0100 + 0101 = 1001 = 9, not above 9: no correction."}
$4 + 5 = 1001$.
:::

:::step{why="1000 + 0111 = 1111 = 15 > 9: add 0110."}
$1111 + 0110 = 1\,0101$: digit 5, carry 1.
:::

:::answer
$9 = 1001$ and $15 = 0001\,0101$.
:::
::::

::::example{#ex-bcd-two level="medium" title="59 + 38" depth="standard"}
Add $59$ and $38$ in BCD.

:::step{why="Units 1001 + 1000 = 1 0001: a carry out of 4 bits, so correct even though 0001 ≤ 9."}
$0001 + 0110 = 0111$, decimal carry 1.
:::

:::step{why="Tens 0101 + 0011 + 1 = 1001 = 9: no correction."}
Tens digit $1001$.
:::

:::answer
$1001\,0111 = 97$.
:::
::::

::::example{#ex-bcd-three level="gate" title="386 + 457: carries through every digit" depth="standard"}
Add $386$ and $457$ in BCD.

:::step{why="Units 6 + 7 = 13 = 1101 > 9."}
$1101 + 0110 = 1\,0011$: digit 3, carry 1.
:::

:::step{why="Tens 8 + 5 + 1 = 14 = 1110 > 9."}
$1110 + 0110 = 1\,0100$: digit 4, carry 1.
:::

:::step{why="Hundreds 3 + 4 + 1 = 8: no correction."}
Digit $1000$.
:::

:::answer
$1000\,0100\,0011 = 843$.
:::
::::

::::example{#ex-bcd-sub level="gate" title="Edge case: 72 − 35 in BCD" depth="standard"}
Compute $72 - 35$ in BCD with the 10's complement.

:::step{why="10's complement of 35: 9's complement 64, plus 1 = 65."}
$-35 \to 65$.
:::

:::step{why="Add 72 + 65 digit by digit with the correction: units 2 + 5 = 7; tens 7 + 6 = 13 > 9 → +6."}
Units $0111$; tens $1101 + 0110 = 1\,0011$, carry 1.
:::

:::step{why="A final carry in complement subtraction means the result is positive; drop it."}
$0011\,0111 = 37$.
:::

:::answer
$37$.
:::
::::

:::trap{#trap-bcd title="Correcting only when the 4-bit result looks invalid" depth="quick"}
The +6 is needed when the digit sum exceeds 9, **including** when the 4-bit result is a valid-looking
digit because the adder already carried ($9 + 8 = 1\,0001$). Check the carry as well as the pattern.
:::

:::note{#recap-bcd title="Recap" depth="quick"}
BCD digit sum $> 9$ or carry out → add 6 (= 16 − 10). Subtract with the 10's complement and the same
correction.
:::

## Excess-3 addition

:::definition{#xs3-add term="Excess-3 addition rule" depth="quick"}
Add two excess-3 digits in binary. If there is **no carry** out of the 4 bits, **subtract 3**
($0011$, or add $1101$ and ignore the carry); if there **is** a carry, **add 3** ($0011$). The carry is
the decimal carry to the next digit.
:::

:::derivation{#xs3-why of="why −3 without a carry and +3 with one" depth="standard"}
Excess-3 stores $d$ as $d + 3$. The sum of two codes is $(a + 3) + (b + 3) = (a + b) + 6$.

- If $a + b \le 9$, then $(a + b) + 6 \le 15$: no carry, and the code should be $(a + b) + 3$, so
  **subtract 3**.
- If $a + b \ge 10$, then $(a + b) + 6 \ge 16$: a carry out, and the 4 bits hold $(a + b + 6) - 16 = (a + b) - 10$.
  The code of the digit $(a + b) - 10$ is $(a + b) - 10 + 3$, so **add 3**.

The excess of 6 does the job of BCD's +6 automatically: the carry appears exactly at a decimal 10.
:::

:::viz{#xs3-viz spec="excess3-correction" mode="animate" depth="standard"}
:::

:::definition{#xs3-sub term="Excess-3 subtraction" depth="quick"}
Excess-3 is **self-complementing** (Lesson 8): inverting the bits of the code of $d$ gives the code of
$9 - d$. So the 9's complement is free, and $A - B$ is $A + \overline{B}$ with the excess-3 correction
and the **end-around carry** of 9's-complement subtraction.
:::

### Worked examples: excess-3

::::example{#ex-xs3-small level="easy" title="3 + 4 in excess-3" depth="quick"}
Add $3$ and $4$ in excess-3.

:::step{why="Codes: 3 → 0110, 4 → 0111; their binary sum is 1101 with no carry."}
$0110 + 0111 = 1101$.
:::

:::step{why="No carry: subtract 3."}
$1101 - 0011 = 1010$.
:::

:::answer
$1010 = $ excess-3 of $7$.
:::
::::

::::example{#ex-xs3-carry level="medium" title="6 + 7 in excess-3" depth="standard"}
Add $6$ and $7$ in excess-3.

:::step{why="Codes 1001 and 1010; the sum carries out of 4 bits."}
$1001 + 1010 = 1\,0011$.
:::

:::step{why="Carry: add 3 to the 4-bit result; the carry is the tens digit."}
$0011 + 0011 = 0110$ (excess-3 of 3), carry 1.
:::

:::answer
Tens 1, units $0110$: the excess-3 result is $0100\,0110 = 13$.
:::
::::

::::example{#ex-xs3-two level="gate" title="47 + 38 in excess-3" depth="standard"}
Add $47$ and $38$ in excess-3.

:::step{why="Units: 7 → 1010, 8 → 1011; the sum carries."}
$1010 + 1011 = 1\,0101$; carry → $+3$: $1000$ (excess-3 of 5), carry 1.
:::

:::step{why="Tens: 4 → 0111, 3 → 0110, plus the carry; no carry out."}
$0111 + 0110 + 1 = 1110$; no carry → $-3$: $1011$ (excess-3 of 8).
:::

:::answer
$1011\,1000$ = excess-3 of $85$.
:::
::::

::::example{#ex-xs3-sub level="gate" title="Edge case: 8 − 3 by inverting the bits" depth="standard"}
Compute $8 - 3$ in excess-3 using self-complementation.

:::step{why="Inverting the code of 3 (0110) gives 1001, the code of 9 − 3 = 6."}
$\overline{0110} = 1001$.
:::

:::step{why="Add to the code of 8 (1011); a carry occurs, so add 3."}
$1011 + 1001 = 1\,0100$; $0100 + 0011 = 0111$ (excess-3 of 4).
:::

:::step{why="9's-complement subtraction: the carry is added back (end-around)."}
$0111 + 1 = 1000$.
:::

:::answer
$1000 = $ excess-3 of $5 = 8 - 3$.
:::
::::

:::note{#recap-xs3 title="Recap" depth="quick"}
Excess-3 sums: no carry → −3; carry → +3. Subtraction: invert the bits (free 9's complement), add,
correct, end-around carry.
:::

## Why Gray code is not used for arithmetic

:::definition{#gray-arith term="Arithmetic on Gray codes" depth="quick"}
Gray code is unweighted (Lesson 8): its bits have no place values, so adding two Gray patterns
column by column means nothing. To do arithmetic on Gray-coded values, **convert to binary, operate,
convert back**. Gray earns its place in counting and position sensing, not in adders.
:::

### Worked examples: Gray

::::example{#ex-gray-wrong level="easy" title="Adding Gray codes directly goes wrong" depth="quick"}
Add Gray $0010$ (3) and Gray $0111$ (5) by adding the patterns as binary numbers.

:::step{why="Binary sum of the patterns: 0010 + 0111 = 1001."}
$1001$ read as Gray is binary $1110 = 14$.
:::

:::step{why="The correct sum is 3 + 5 = 8, whose Gray code is 1100."}
So the direct pattern sum $1001$ differs from the correct Gray code $1100$ in two bits.
:::

:::answer
14, not 8: Gray patterns cannot be added like binary numbers.
:::
::::

::::example{#ex-gray-right level="medium" title="Convert, add, convert back" depth="standard"}
Add the same Gray codes properly.

:::step{why="Gray → binary is a running XOR: 0010 → 0011 = 3; 0111 → 0101 = 5."}
$3 + 5 = 8 = 1000_2$.
:::

:::step{why="Binary → Gray: g = b XOR (b shifted right by 1)."}
$1000 \oplus 0100 = 1100$.
:::

:::answer
Gray $1100$ (= 8).
:::
::::

::::example{#ex-gray-inc level="gate" title="Incrementing a Gray counter" depth="standard"}
A Gray counter shows $0101$. What does it show after one more count?

:::step{why="0101 is binary 0110 = 6."}
$6 + 1 = 7 = 0111_2$.
:::

:::step{why="Back to Gray."}
$0111 \oplus 0011 = 0100$.
:::

:::answer
$0100$: exactly one bit changed, as Gray promises, but the rule needed binary in between.
:::
::::

::::example{#ex-gray-sub level="gate" title="Edge case: a difference of two Gray readings" depth="standard"}
Two readings of a Gray-coded shaft encoder are $1100$ and $1010$. How many steps apart are they?

:::step{why="Convert each to binary: 1100 → 1000 = 8; 1010 → 1100 = 12."}
$8$ and $12$.
:::

:::step{why="Subtract the binary values, not the Gray patterns."}
$12 - 8 = 4$ steps (or 12 the other way round a 16-position wheel).
:::

:::answer
$12 - 8 = 4$ steps. Subtracting the raw Gray patterns ($1100 - 1010 = 0010$) would wrongly say 2
(and XORing them gives $0110 = 6$).
:::
::::

## Multiplying and dividing by powers of two with shifts

:::definition{#shift-arith term="Shifts as multiplication and division" depth="quick"}
- **Left shift by $k$** multiplies by $2^k$ (unsigned and 2's complement alike), provided no significant
  bit is lost: unsigned, the top $k$ bits must be 0; signed, the top $k + 1$ bits must be equal.
- **Logical right shift by $k$** divides an unsigned number by $2^k$, rounding down.
- **Arithmetic right shift by $k$** (copy the sign bit in) divides a 2's-complement number by $2^k$,
  rounding toward $-\infty$: $\lfloor x / 2^k \rfloor$. For negative odd values this differs from C's
  integer division, which rounds toward 0.
:::

### Worked examples: shifts

::::example{#ex-shl level="easy" title="0011 shifted left twice" depth="quick"}
Shift the 4-bit pattern $0011$ left by 2.

:::step{why="Each left shift doubles: 3 → 6 → 12."}
$0011 \to 0110 \to 1100$.
:::

:::step{why="A signed 4-bit left shift by 2 is safe only if the top 3 bits are equal; 001 are not."}
Signed: $1100 = -4 \ne 12$, an overflow.
:::

:::answer
$1100 = 12$ as unsigned (correct), but $-4$ as 4-bit signed: the signed result overflowed because the
top three bits of $0011$ were not all equal.
:::
::::

::::example{#ex-asr level="medium" title="−20 arithmetically shifted right by 2" depth="standard"}
Shift the 8-bit $-20 = 11101100$ right arithmetically by 2.

:::step{why="Copy the sign bit into the vacated places."}
$11101100 \to 11110110 \to 11111011$.
:::

:::step{why="Check: −20 / 4 = −5 exactly, so no rounding is involved."}
$11111011 = -128 + 64 + 32 + 16 + 8 + 2 + 1 = -5$.
:::

:::answer
$11111011 = -5 = -20/4$.
:::
::::

::::example{#ex-shl-hex level="gate" title="×4 on a 16-bit hex pattern" depth="standard"}
$P$ is a 16-bit 2's-complement integer with pattern $FFB4_{16}$. Give the pattern of $4P$.

:::step{why="FFB4 = −76; the top three bits are 111, all equal, so a 2-place left shift is safe."}
$1111\,1111\,1011\,0100 \ll 2 = 1111\,1110\,1101\,0000$.
:::

:::step{why="Check the value: the result must be 4 × (−76) = −304."}
$FED0_{16} = 65232 = 65536 - 304$, so it reads $-304$.
:::

:::answer
$FED0_{16} = -304 = 4 \times (-76)$.
:::
::::

::::example{#ex-asr-round level="gate" title="Edge case: −9 shifted right once" depth="standard"}
Compute $-9$ arithmetically shifted right by 1 in 8 bits, and compare with $-9/2$ in C.

:::step{why="−9 = 11110111; copy the sign bit in."}
$11111011 = -5$.
:::

:::step{why="−4.5 rounded toward −∞ is −5; C's division truncates toward 0."}
C gives $-9/2 = -4$.
:::

:::answer
ASR gives $-5$ (floor), C gives $-4$: shifting is not the same as signed division for negative odd numbers.
:::
::::

:::trap{#trap-asr title="Logical shift on a negative number" depth="quick"}
A logical right shift brings in 0s: $11101100 \gg_L 2 = 00111011 = 59$, not $-5$. Use the arithmetic
shift for signed values, and remember it rounds toward $-\infty$.
:::

:::note{#recap-shift title="Recap" depth="quick"}
Left shift = ×2ᵏ while no significant bit is lost; arithmetic right shift = ⌊x/2ᵏ⌋; logical right shift
is for unsigned values only.
:::

## GATE questions on this lesson

Fifteen previous-year questions on number-level arithmetic: overflow, flags, complements, base-$b$
arithmetic and shifts. (The adder-circuit questions stay with the circuits in Chapter 5.)

:::pyq{id="it-2006-cs-7" tests="signed-add-rules,overflow-rule" depth="standard"}
:::

:::pyq{id="cse-2022-cs-8" tests="overflow-rule,overflow-theorem" depth="standard"}
:::

:::pyq{id="it-2004-it-42" tests="overflow-rule" depth="standard"}
:::

:::pyq{id="cse-2002-a-21" tests="overflow-rule,trap-carry-overflow" depth="standard"}
:::

:::pyq{id="cse-1992-b-4-a" tests="overflow-theorem,overflow-rule" depth="standard"}
:::

:::pyq{id="cse-2017-1-cs-9" tests="overflow-rule,trap-carry-overflow" depth="standard"}
:::

:::pyq{id="cse-2006-cs-39" tests="overflow-rule,overflow-theorem" depth="standard"}
:::

:::pyq{id="it-2008-it-15" tests="carry-vs-overflow,overflow-rule" depth="standard"}
:::

:::pyq{id="cse-2024-1-cs-3" tests="overflow-rule,signed-add-rules" depth="standard"}
:::

:::pyq{id="cse-2026-2-cs-18" tests="overflow-rule,signed-add-rules" depth="standard"}
:::

:::pyq{id="cse-2019-cs-8" tests="signed-add-rules,trap-sm-overflow" depth="standard"}
:::

:::pyq{id="cse-2026-1-cs-12" tests="signed-add-rules,trap-sm-overflow" depth="standard"}
:::

:::pyq{id="it-2005-cs-47" tests="base-b-arith" depth="standard"}
:::

:::pyq{id="cse-2010-cs-8" tests="shift-arith" depth="standard"}
:::

:::pyq{id="cse-1995-a-51" tests="binary-add,binary-mul,carry-vs-overflow" depth="standard"}
:::

## Practice

Our own questions; every answer is computed by `l09_code_arithmetic.py`.

:::practice{id="nx-dl-01-09-q01" depth="standard"}
:::

:::practice{id="nx-dl-01-09-q02" depth="standard"}
:::

:::practice{id="nx-dl-01-09-q03" depth="standard"}
:::

:::practice{id="nx-dl-01-09-q04" depth="standard"}
:::

:::practice{id="nx-dl-01-09-q05" depth="standard"}
:::

:::practice{id="nx-dl-01-09-q06" depth="standard"}
:::

:::practice{id="nx-dl-01-09-q07" depth="standard"}
:::

:::practice{id="nx-dl-01-09-q08" depth="standard"}
:::

:::practice{id="nx-dl-01-09-q09" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Arithmetic with number codes on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Binary / base $b$ | carry at $b$, borrow $b$; check by converting back |
| Multiply | sum of shifted multiplicands, one per 1 bit; $m + n$ bits |
| $r$'s complement subtraction | $M + (r^n - N)$; carry → drop; no carry → negative |
| $(r-1)$'s complement subtraction | $M + (r^n - 1 - N)$; carry → add it back (end-around) |
| 2's-complement add | add, drop the carry |
| Overflow | same-sign operands, other-sign result $\iff c_{n-1} \oplus c_n = 1$ |
| Subtraction overflow | only with opposite-sign operands |
| C vs V | C: unsigned carry out; V: signed overflow |
| Different widths | sign-extend first |
| BCD | digit sum $> 9$ or carry → $+6$ |
| Excess-3 | no carry → $-3$; carry → $+3$; subtract via bit inversion + end-around carry |
| Gray | convert to binary, operate, convert back |
| Shifts | $\ll k$: $\times 2^k$; ASR: $\lfloor x/2^k \rfloor$; logical shift for unsigned only |
:::

:::note{#further-depth title="Further depth: saturating arithmetic" depth="deep"}
Digital signal processors often use **saturating** arithmetic: an overflowing sum is clamped to the
largest or smallest value instead of wrapping around ($100 + 100 \to 127$ in 8 bits). Audio and image
code prefers a slightly wrong loud sample to a wildly wrong one; floating point (Lesson 7) saturates to
infinity for the same reason.
:::
