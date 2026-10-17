---
id: floating-point-arithmetic
subject: dl
chapter: number-systems
title: "Floating-point arithmetic, rounding and overflow"
order: 7
prerequisites: [ieee-754]
pyq_topics: [dl/floating]
est_minutes: 50
difficulty: advanced
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every value is checked by content/gate-notes/_checks/dl/l07_fp_arithmetic.py (exact IEEE arithmetic in fplib.py, cross-checked with Python's float/struct)."
  - "Coverage checklist only (internal digests, never copied): set B pp. 150–153 (brief). No set works an IEEE add or multiply or covers rounding modes, so this lesson is written from the textbooks below."
  - "Facts checked against IEEE Std 754-2019 §4 (rounding-direction attributes) and §7 (exceptions); D. A. Patterson and J. L. Hennessy, Computer Organization and Design, §3.5 (floating-point addition and multiplication, guard/round/sticky); D. Goldberg (1991), §1.4–1.5 (guard digits, relative error)."
  - "PYQs: src/gate/questions.json (dl/floating), keys re-derived in l07_fp_arithmetic.py."
updated: "2026-10-17"
---

A floating-point result is almost never exactly representable: $1/3$, $0.1 + 0.2$, even $7 + 1.625$
in a short format. So every floating-point operation ends with **rounding**, and that one fact
explains every surprise in this lesson: why $10^{20} + 3 - 10^{20}$ can be 0, why the order of an
addition matters, and why a sum can overflow to infinity. You will learn the four rounding modes and
how hardware rounds with just three extra bits (guard, round and sticky), the step-by-step
algorithms for adding and multiplying floats, how to multiply by a power of two straight on the hex
pattern, and what happens at the edges: overflow, underflow and absorption.

## Where this fits

This lesson needs the IEEE layouts and the decode/encode methods of [Lesson 6](lesson:ieee-754),
and the custom formats of [Lesson 5](lesson:floating-point-basics) for the older GATE questions.
Chapter 5 later builds the integer adders that do the significand arithmetic described here.

:::table{#radar title="GATE radar: floating-point arithmetic" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 8 (1997–2026) |
| Marks | 1 one-mark, 7 two-mark (one is an MSQ) |
| Formats | 5 MCQ/MSQ, 3 descriptive or fill-in (1997) |
| Pattern 1 | Add, multiply or divide two IEEE words and give the result in hex: 2020, 2023, 2026 |
| Pattern 2 | Decode registers, then check arithmetic identities: 2025 |
| Pattern 3 | Order of operations and absorption: 2000, 2004 |
| Pattern 4 | Step through an addition in a custom format and find the error: 1997 |
| What examiners test | Aligning to the larger exponent, subtracting the bias once after adding exponents, and rounding after every single operation |
:::

## Rounding: from the exact result to a float

:::intuition{#round-intuition title="Every answer must land on a tick" depth="standard"}
Think of the representable numbers as tick marks on a ruler (Lesson 5). The exact result of an
operation usually lands **between** two ticks, and the machine must pick one. A rounding mode is
simply the rule for which tick to pick. IEEE-754 requires that every basic operation ($+, -,
\times, \div, \sqrt{\ }$) behaves **as if** it computed the exact result and then rounded it once.
That single promise makes floating point predictable, even though it is not exact.
:::

:::definition{#rounding-modes term="The four IEEE rounding modes" depth="quick"}
For an exact result $x$ that lies between two neighbouring floats $a < x < b$:

| Mode | Picks | Also called |
|:--|:--|:--|
| Round to nearest, ties to even (**default**) | the nearer of $a, b$; on a tie, the one whose last bit is 0 | RNE |
| Round toward zero | the one nearer to 0 (drop the extra bits) | truncation, chopping |
| Round toward $+\infty$ | $b$ | rounding up, ceiling |
| Round toward $-\infty$ | $a$ | rounding down, floor |

Unless a question says otherwise, IEEE arithmetic uses round to nearest, ties to even. Older custom
formats in GATE (1997, 2005) truncate.
:::

:::definition{#round-half-even term="Why ties go to the even neighbour" depth="standard"}
A tie happens when the exact value is exactly halfway between two floats. Always rounding ties up
would push long sums upward on average (every tie adds half an ulp). Choosing the neighbour with an
even last bit rounds up about half the time and down the other half, so the errors cancel on
average. It also makes the result deterministic: there is exactly one even neighbour.
:::

:::definition{#grs term="Guard, round and sticky bits" depth="quick"}
While it computes, the hardware keeps three extra bits to the right of the last kept fraction bit:

- **G (guard)**: the first bit beyond the kept bits;
- **R (round)**: the second bit beyond;
- **S (sticky)**: the OR of **all** the bits after R (once any 1 is shifted past, S stays 1).

Round to nearest even then decides from G, R, S and the last kept bit (the LSB):

| G | R or S | Meaning | Action |
|:--|:--|:--|:--|
| 0 | anything | less than half an ulp | round down (drop) |
| 1 | 1 | more than half an ulp | round up (add 1 to the LSB) |
| 1 | 0 | exactly half: a tie | round to even: up only if LSB = 1 |
:::

:::derivation{#grs-why of="why three extra bits are enough" depth="deep"}
**Idea first:** rounding only needs to know whether the discarded part is below, exactly at, or above
half an ulp, and three bits can say that, provided one of them remembers "something non-zero was
lost".

The discarded part, measured in ulps, is $0.GRS\ldots$. It is below one half iff $G = 0$; it is
exactly one half iff $G = 1$ and every later bit is 0; it is above one half iff $G = 1$ and some
later bit is 1. The sticky bit records exactly "some later bit is 1", so $G$ and $(R \lor S)$ decide
the comparison with one half. Why keep $R$ separately at all? In a subtraction the result may need a
**left** shift by one place to be normalised; then $G$ moves into the kept bits, $R$ becomes the new
guard and $S$ the new sticky, and the decision is still exact. (A left shift by more than one place
happens only when the operands were close, and then the alignment shift was at most one place, so
no bits were lost to begin with.)

**Sanity check.** Keeping 4 fraction bits, $1.0110\,|\,101$ and $1.0110\,|\,1001$ both round up
($G = 1$, something after it is 1), while $1.0110\,|\,100$ is a tie and stays at the even $1.0110$.
:::

:::viz{#rne-viz spec="round-nearest-even" mode="animate" depth="standard"}
:::

:::definition{#relative-error term="Absolute, relative and percentage error" depth="quick"}
If the computed value is $\hat{x}$ and the true value is $x$:

$$
\text{absolute error} = |\hat{x} - x|, \qquad \text{relative error} = \frac{|\hat{x} - x|}{|x|}, \qquad \text{percentage error} = 100 \times \text{relative error}.
$$

Round to nearest in a format with $p$ significant bits has relative error at most $2^{-p}$ (the
unit roundoff of Lesson 6); truncation can be twice as bad, up to $2^{1-p}$.
:::

### Worked examples: rounding

::::example{#ex-rnd-easy level="easy" title="Round to 3 fraction bits" depth="quick"}
Round $1.01101_2$ to 3 fraction bits (round to nearest even).

:::step{why="Mark the cut after 3 fraction bits; the next bit is the guard."}
$1.011\,|\,01$: $G = 0$, $R = 1$.
:::

:::step{why="G = 0 means the discarded part is below half an ulp."}
Round down: drop the extra bits.
:::

:::answer
$1.011_2 = 1.375$ (the exact value was $1.40625$; the error $0.03125$ is below half an ulp, $0.0625$).
:::
::::

::::example{#ex-rnd-tie level="medium" title="Two ties, two directions" depth="standard"}
Round $1.0101_2$ and $1.0111_2$ to 3 fraction bits.

:::step{why="Both cut after 3 bits with a single 1 beyond: G = 1, R = S = 0, an exact tie."}
$1.010\,|\,1$ and $1.011\,|\,1$.
:::

:::step{why="Ties go to the neighbour whose last kept bit is 0."}
$1.010$ already ends in 0: keep it. $1.011$ ends in 1: round up to $1.100$.
:::

:::answer
$1.0101 \to 1.010$ ($1.3125 \to 1.25$) and $1.0111 \to 1.100$ ($1.4375 \to 1.5$): one tie went down, the
other up.
:::
::::

::::example{#ex-rnd-third level="gate" title="1/3 in single precision" depth="standard"}
Find the single-precision pattern of $1/3$.

:::step{why="1/3 = 0.010101…₂ = 1.010101…₂ × 2^-2, so e = 125 = 0111 1101."}
$E = -2$, $e = 125$.
:::

:::step{why="The 23 fraction bits are 0101…010 (alternating, starting with 0), and the bits beyond start 101…"}
Kept: $0101\,0101\,0101\,0101\,0101\,010$; $G = 1$, $R = 0$, $S = 1$.
:::

:::step{why="G = 1 and S = 1: more than half an ulp, so round up; the fraction ends …011."}
Fraction $= 0101\,0101\ldots01011$; word $0\ 01111101\ 0101\ldots011 = $ `3EAAAAAB`.
:::

:::answer
`0x3EAAAAAB`, slightly above $1/3$. Truncation would give `3EAAAAAA`.
:::
::::

::::example{#ex-rnd-modes level="gate" title="Edge case: four modes on a negative number" depth="standard"}
Round $-1.0101_2$ to 2 fraction bits in all four modes.

:::step{why="The neighbours of −1.0101 with 2 fraction bits are −1.01 and −1.10; the exact value is between them."}
$-1.10 = -1.5 < -1.0101 = -1.3125 < -1.01 = -1.25$.
:::

:::step{why="Nearest: the discarded bits 01 are a quarter ulp (G = 0), so −1.01 is nearer."}
Nearest even: $-1.01$.
:::

:::step{why="Toward zero drops bits; toward +∞ picks the larger neighbour; toward −∞ the smaller."}
Toward 0: $-1.01$. Toward $+\infty$: $-1.01$. Toward $-\infty$: $-1.10$.
:::

:::answer
$-1.25$, $-1.25$, $-1.25$, $-1.5$. For negative numbers, "toward $-\infty$" increases the magnitude.
:::
::::

:::note{#recap-round title="Recap" depth="quick"}
Every operation rounds once. Default: nearest, ties to even. G = 0 → down; G = 1 and (R or S) → up;
G = 1 alone → tie to even. Relative error ≤ $2^{-p}$ for round to nearest.
:::

## Addition and subtraction

:::intuition{#add-intuition title="Same units before you add" depth="standard"}
You cannot add 1.5 kg and 25 g by adding 1.5 and 25: first write both in the same unit. Floats are
the same: $1.1 \times 2^{3}$ and $1.01 \times 2^{1}$ have different "units" ($2^3$ and $2^1$), so one
significand must be shifted until the exponents agree. Only then can the significands be added like
fixed-point numbers. The result may then need to be renormalised and rounded.
:::

:::definition{#fp-add-algorithm term="Floating-point addition and subtraction" depth="quick"}
To compute $x \pm y$:

1. **Special cases:** NaN in → NaN out; $\infty$ handled by the rules of Lesson 6; zero is easy.
2. **Align:** let $d = E_x - E_y \ge 0$ (swap if needed). Shift the significand of the **smaller**
   number right by $d$ places (its hidden 1 included) and give it exponent $E_x$; keep the bits
   shifted out as G, R, S.
3. **Add or subtract the significands** as sign-magnitude numbers (subtract the smaller magnitude from
   the larger when the signs differ; the result takes the sign of the larger).
4. **Normalise:** a carry out ($\ge 2$) needs one right shift and $E + 1$; a cancellation ($< 1$)
   needs left shifts and $E - k$.
5. **Round** to the fraction width (this may carry and need one more right shift).
6. **Check the range:** an exponent above $E_{\max}$ overflows; one below $E_{\min}$ underflows.
:::

:::derivation{#why-align-smaller of="why the smaller operand is the one that is shifted" depth="standard"}
Shifting a significand right by $d$ and raising its exponent by $d$ keeps its value:
$M \times 2^{E} = (M \cdot 2^{-d}) \times 2^{E + d}$. We could equally shift the larger one **left**,
but then its leading bits would leave the register at the top, which loses the most significant
part. Shifting the smaller one right loses only its **least** significant bits, which are below the
precision of the result anyway, and G, R, S remember enough of them to round correctly.

**Sanity check.** $1.1 \times 2^3 + 1.01 \times 2^1$: shift $1.01$ right by 2 to get $0.0101 \times 2^3$;
sum $1.1101 \times 2^3 = 14.5 = 12 + 2.5$.
:::

:::viz{#add-viz spec="fp-align-add" mode="animate" depth="standard"}
:::

:::trap{#trap-align title="Aligning without the hidden 1, or shifting the larger number" depth="quick"}
When you shift the smaller significand right, the **hidden 1 moves too**: $1.0100 \times 2^{1}$ aligned to
$2^3$ is $0.0101$, not $0.0001$ (the result of shifting only the stored fraction $0100$). And always
align to the **larger** exponent; adding the significands first and then picking an exponent is the
mistake behind several distractors.
:::

### Worked examples: addition

::::example{#ex-add-easy level="easy" title="2.5 + 0.75" depth="quick"}
Add $2.5$ and $0.75$ in binary floating point.

:::step{why="Normalise both: 2.5 = 10.1₂ and 0.75 = 0.11₂."}
$2.5 = 1.01 \times 2^{1}$, $0.75 = 1.1 \times 2^{-1}$.
:::

:::step{why="Align the smaller one to exponent 1: shift right by 2, hidden 1 included."}
$1.1 \times 2^{-1} = 0.011 \times 2^{1}$.
:::

:::step{why="Add the significands; the result is already between 1 and 2."}
$1.010 + 0.011 = 1.101$, so the sum is $1.101 \times 2^{1} = 11.01_2$.
:::

:::answer
$3.25$, exactly.
:::
::::

::::example{#ex-add-carry level="medium" title="6 + 3: a carry that renormalises" depth="standard"}
Add $6$ and $3$ in binary floating point.

:::step{why="6 = 110₂ and 3 = 11₂."}
$6 = 1.1 \times 2^{2}$, $3 = 1.1 \times 2^{1}$.
:::

:::step{why="Align 3 to exponent 2 by one right shift."}
$1.1 \times 2^{1} = 0.11 \times 2^{2}$.
:::

:::step{why="The sum of the significands reaches 2, so it carries into a second integer bit."}
$1.10 + 0.11 = 10.01$.
:::

:::step{why="Normalise: shift right by 1 and add 1 to the exponent."}
$10.01 \times 2^{2} = 1.001 \times 2^{3}$.
:::

:::answer
$1.001_2 \times 2^3 = 9$.
:::
::::

::::example{#ex-add-hex level="gate" title="Adding two IEEE words of opposite sign" depth="standard"}
Compute `0x41A00000` + `0xC1000000` in single precision and give the result in hex.

:::step{why="Decode first. 41A = 0 10000011 01…: 1.01 × 2^4. C10 = 1 10000010 0…: −1.0 × 2^3."}
$x = 1.01 \times 2^{4} = 20$, $y = -1.0 \times 2^{3} = -8$.
:::

:::step{why="Align y to exponent 4: one right shift."}
$-1.0 \times 2^{3} = -0.1 \times 2^{4}$.
:::

:::step{why="Opposite signs: subtract the smaller magnitude from the larger; the result is positive."}
$1.01 - 0.10 = 0.11$, so the result is $0.11 \times 2^{4}$.
:::

:::step{why="Cancellation left a leading 0: shift left by 1 and lower the exponent by 1."}
$0.11 \times 2^4 = 1.1 \times 2^{3} = 12$; $e = 130$, $f = 1000\ldots$
:::

:::answer
$20 + (-8) = 12 = $ `0x41400000`.
:::
::::

::::example{#ex-add-sticky level="gate" title="Edge case: 1 + 2^-24 and the sticky bit" depth="standard"}
In single precision, compute $1 + 2^{-24}$ and $1 + (2^{-24} + 2^{-47})$.

:::step{why="Align 2^-24 to exponent 0: shift right 24 places. The 1 lands one place past the 23 kept bits."}
$1 + 2^{-24} = 1.000\ldots0\,|\,1$: $G = 1$, $R = S = 0$. A tie.
:::

:::step{why="Ties go to even; 1.000…0 has LSB 0, so round down."}
$1 + 2^{-24} \to 1$.
:::

:::step{why="Now there is a second 1, 47 places down. It is far past R, but the sticky bit remembers it."}
$1 + 2^{-24} + 2^{-47} = 1.000\ldots0\,|\,10\ldots01$: $G = 1$, $S = 1$, more than half an ulp: round up.
:::

:::answer
$1 + 2^{-24} = 1$, but $1 + (2^{-24} + 2^{-47}) = 1 + 2^{-23}$ (`0x3F800001`). Without a sticky bit both
would round the same way.
:::
::::

:::note{#recap-add title="Recap" depth="quick"}
Align the smaller operand to the larger exponent (hidden 1 included, extra bits into G, R, S), add
the significands in sign-magnitude, renormalise (carry → shift right; cancellation → shift left),
round once, check the range.
:::

## Absorption, cancellation and lost associativity

:::definition{#absorption term="Absorption" depth="quick"}
If $|y| < \tfrac12\,\text{ulp}(x)$, then $x + y$ rounds back to $x$: $y$ is **absorbed**. (At exactly
half an ulp, ties to even decide.) In single precision $\text{ulp}(1) = 2^{-23}$, so adding anything
below $2^{-24}$ to 1 changes nothing; next to $2 \times 10^{30}$ the ulp is about $1.5 \times 10^{23}$, so
adding 1 changes nothing.
:::

:::viz{#absorb-viz spec="absorption" mode="animate" depth="standard"}
:::

:::theorem{#not-associative name="Floating-point addition is not associative" depth="standard"}
There are floats $a, b, c$ with $(a + b) + c \ne a + (b + c)$ when each addition is rounded. It is,
however, **commutative**: $a + b = b + a$ always, because both round the same exact sum.
:::

:::proof{#proof-not-associative of="non-associativity" depth="standard"}
**Idea first:** rounding after each step throws away different information depending on the order.

A counterexample suffices. In single precision let $a = 2^{24}$, $b = 1$, $c = 1$. Then $a + b$ is the
tie $2^{24} + 1$, which rounds to the even $2^{24}$, and adding $c$ the same way gives $2^{24}$ again. But
$b + c = 2$ exactly, and $2^{24} + 2$ is a float (above $2^{24}$ the gap is 2). So
$(a + b) + c = 2^{24} \ne 2^{24} + 2 = a + (b + c)$. Commutativity holds because IEEE defines each result
as $\text{round}(\text{exact sum})$, and the exact sum does not depend on the order of two operands.
:::

:::definition{#cancellation term="Catastrophic cancellation" depth="standard"}
Subtracting two nearly equal numbers is itself exact (when they are within a factor of 2 of each
other), but it exposes their earlier rounding errors: the leading digits cancel, and what remains is
dominated by the errors. If $x$ and $y$ each carry a relative error of $2^{-24}$ and agree in 20 bits,
$x - y$ may have only about 4 correct bits.
:::

### Worked examples: absorption and order

::::example{#ex-abs-easy level="easy" title="2^24 + 1 in single precision" depth="quick"}
Compute $2^{24} + 1$ in single precision.

:::step{why="Above 2^24 the ulp is 2^(24 − 23) = 2, so the neighbours of the exact sum are 2^24 and 2^24 + 2."}
$2^{24} + 1$ is exactly halfway between them.
:::

:::step{why="A tie: pick the neighbour with an even last bit. 2^24 = 1.000…0 × 2^24 has LSB 0."}
The result is $2^{24} = 16\,777\,216$.
:::

:::answer
$2^{24} + 1 = 2^{24}$: the 1 is absorbed (`0x4B800000` either way).
:::
::::

::::example{#ex-abs-order level="medium" title="(x + (−x)) + 3 against x + (−x + 3)" depth="standard"}
Let $x$ be the single-precision value nearest $10^{20}$. Compute $(x + (-x)) + 3$ and $x + ((-x) + 3)$.

:::step{why="x + (−x) is exactly 0, and 0 + 3 = 3."}
$(x + (-x)) + 3 = 3$.
:::

:::step{why="Near 10^20 the ulp is 2^(66 − 23) = 2^43 ≈ 8.8 × 10^12; 3 is far below half of it, so it is absorbed."}
$(-x) + 3 = -x$.
:::

:::step{why="Then x + (−x) = 0."}
$x + ((-x) + 3) = 0$.
:::

:::answer
$3$ and $0$: the same three numbers, two answers. Cancel the big terms first.
:::
::::

::::example{#ex-abs-decimal level="gate" title="Three-significant-digit decimal arithmetic" depth="standard"}
Using decimal floating point with 3 significant digits and rounding after each operation, evaluate
$(224 + (-221)) + 4.37$ and $224 + ((-221) + 4.37)$.

:::step{why="224 − 221 = 3 is exact; 3.00 + 4.37 = 7.37 fits in 3 digits."}
First: $3.00 + 4.37 = 7.37$.
:::

:::step{why="−221 + 4.37 = −216.63 needs 5 digits; rounded to 3 it is −217."}
Second: $(-221) + 4.37 = -216.63 \to -217$.
:::

:::step{why="224 − 217 = 7 exactly."}
$224 + (-217) = 7.00$.
:::

:::answer
$7.37$ and $7.00$ (the exact answer is $7.37$). Rounding the intermediate $-216.63$ lost the $.37$.
:::
::::

::::example{#ex-abs-tenth level="gate" title="Edge case: adding 0.1 ten times" depth="standard"}
In single precision, start from 0 and add the float nearest $0.1$ ten times. Is the result $1.0$?

:::step{why="0.1 is stored as 0x3DCCCCCD, slightly above 0.1 (Lesson 6)."}
Each term is $0.100000001490116\ldots$
:::

:::step{why="Each partial sum is rounded again, and the errors do not cancel."}
The running sum after ten additions is $1.0000001192\ldots$
:::

:::step{why="That is the float right after 1.0."}
It is `0x3F800001` $= 1 + 2^{-23}$, one ulp above 1.
:::

:::answer
No: the sum is $1 + 2^{-23}$, so `sum == 1.0f` is false. Never test a float loop counter for equality.
:::
::::

:::trap{#trap-order title="Assuming (a + b) + c = a + (b + c)" depth="quick"}
In GATE 2000 and 2004 the two orders give different answers on purpose. Work strictly left to right
inside each bracket, round after **every** operation, and only then compare. Absorption happens when a
small number meets a large one; cancellation happens when two large ones of opposite sign meet.
:::

:::note{#recap-absorb title="Recap" depth="quick"}
$|y| < \tfrac12\text{ulp}(x)$ ⇒ $x + y = x$. Addition is commutative but not associative. Subtracting
close numbers is exact but amplifies earlier errors. Add small terms first; cancel large ones first.
:::

## Multiplication and division

:::intuition{#mul-intuition title="Multiply the significands, add the exponents" depth="standard"}
$(3 \times 10^{4}) \times (2 \times 10^{5}) = 6 \times 10^{9}$: multiply the leading parts, add the
exponents. Floats work the same way, with two twists: the stored exponents carry a bias, and the
product of two significands in $[1, 2)$ lies in $[1, 4)$, so it may need one normalising shift.
Multiplication needs no alignment, which makes it simpler than addition.
:::

:::definition{#fp-mul term="Floating-point multiplication" depth="quick"}
To compute $x \times y$ (normal operands):

1. **Sign:** $s = s_x \oplus s_y$.
2. **Exponent:** $e = e_x + e_y - \text{bias}$ (stored fields), i.e. $E = E_x + E_y$.
3. **Significand:** $M = 1.f_x \times 1.f_y \in [1, 4)$.
4. **Normalise:** if $M \ge 2$, shift right once and add 1 to $e$.
5. **Round** to the fraction width; **check** for overflow ($e > 254$) or underflow ($e < 1$).
:::

:::derivation{#bias-subtract of="why the bias is subtracted once" depth="standard"}
The fields are $e_x = E_x + B$ and $e_y = E_y + B$. Adding them gives
$e_x + e_y = (E_x + E_y) + 2B$, which has the bias **twice**. The product's field must be
$(E_x + E_y) + B$, so subtract $B$ once:

$$
e = e_x + e_y - B .
$$

For division the bias cancels instead, so it must be **added** back: $e = e_x - e_y + B$.

**Sanity check.** $2 \times 2$: $128 + 128 - 127 = 129$, which is $E = 2$, i.e. 4. ✓
:::

:::definition{#fp-div term="Floating-point division" depth="quick"}
$x / y$: sign $s_x \oplus s_y$; exponent field $e_x - e_y + B$; significand $1.f_x / 1.f_y \in (\tfrac12, 2)$,
which needs one **left** shift (and $e - 1$) when it is below 1; then round and check the range.
Dividing a non-zero number by zero gives $\pm\infty$; $0/0$ is NaN.
:::

:::trick{#trick-pow2 title="Multiplying by 2^k straight on the hex word" depth="standard"}
Multiplying a normal float by $2^{k}$ only changes the exponent: add $k$ to the exponent field, i.e.
add $k \times$ `0x00800000` to the word. Multiplying by $-2^k$ also flips the sign bit (add `0x80000000`
modulo $2^{32}$). Example: $\times 16$ adds `0x02000000`.

**Why it works:** the significand of $2^k$ is $1.0$, and $1.f \times 1.0 = 1.f$, so the fraction field is
copied unchanged. **When it fails:** when the new exponent leaves $1 \dots 254$ (overflow to $\infty$,
or underflow into the denormals, where the fraction shifts).
:::

:::trap{#trap-bias-twice title="Adding the stored exponents without removing a bias" depth="quick"}
$e_x + e_y$ counts the bias twice; $e_x - e_y$ counts it zero times. In a multiplication question the
distractor with an exponent field 127 too large is exactly this slip (for example $131 + 126 = 257$,
which is not even an 8-bit field).
:::

### Worked examples: multiplication and division

::::example{#ex-mul-easy level="easy" title="1.5 × 2.5" depth="quick"}
Multiply $1.5 = 1.1_2 \times 2^0$ by $2.5 = 1.01_2 \times 2^1$ and give the exponent field.

:::step{why="Multiply the significands as binary numbers."}
$1.1 \times 1.01 = 1.111_2$ ($1.5 \times 1.25 = 1.875$), already in $[1, 2)$.
:::

:::step{why="Add the true exponents, or the fields minus one bias."}
$E = 0 + 1 = 1$; fields $127 + 128 - 127 = 128$.
:::

:::answer
$1.111_2 \times 2^1 = 3.75$, exponent field $128$.
:::
::::

::::example{#ex-mul-hex level="medium" title="0x40400000 × 0xC0E00000" depth="standard"}
Multiply the single-precision words `0x40400000` and `0xC0E00000` and give the result in hex.

:::step{why="Decode: 404 = 0 10000000 1…: 1.1 × 2^1 = 3. C0E = 1 10000001 11…: −1.11 × 2^2 = −7."}
$x = 3$, $y = -7$.
:::

:::step{why="Sign 0 ⊕ 1 = 1; significands 1.1 × 1.11 = 10.101 (1.5 × 1.75 = 2.625)."}
$1.1 \times 1.11 = 10.101_2 \ge 2$.
:::

:::step{why="Normalise: shift right once, exponent E = 1 + 2 + 1 = 4."}
$10.101 \times 2^{3} = 1.0101 \times 2^{4}$; $e = 131 = 1000\,0011$.
:::

:::step{why="Assemble 1 | 10000011 | 0101 0…"}
$1100\,0001\,1010\,1000\ldots = $ `C1A80000`.
:::

:::answer
$3 \times (-7) = -21 = $ `0xC1A80000`.
:::
::::

::::example{#ex-div-hex level="gate" title="0x42C80000 ÷ 0x41200000" depth="standard"}
Divide `0x42C80000` by `0x41200000` in single precision.

:::step{why="Decode: 42C8 = 0 10000101 1001…: 1.1001 × 2^6 = 100. 4120 = 0 10000010 01…: 1.01 × 2^3 = 10."}
$x = 100$, $y = 10$.
:::

:::step{why="Significands: 1.5625 / 1.25 = 1.25 = 1.01₂, already in [1, 2)."}
$1.1001_2 / 1.01_2 = 1.01_2$.
:::

:::step{why="Exponent field e_x − e_y + bias = 133 − 130 + 127 = 130."}
$e = 130$, i.e. $E = 3$.
:::

:::answer
$1.01_2 \times 2^3 = 10 = $ `0x41200000`.
:::
::::

::::example{#ex-mul-edge level="gate" title="Edge case: when the product of significands reaches 2" depth="standard"}
Multiply $1.75$ by $1.5$ in a format with 4 fraction bits.

:::step{why="Both exponents are 0, so the exponent of the raw product is 0."}
$1.11_2 \times 1.1_2 = 10.101_2$ ($1.75 \times 1.5 = 2.625$).
:::

:::step{why="10.101 has two integer bits: shift right once and add 1 to the exponent."}
$10.101 \times 2^0 = 1.0101 \times 2^{1}$.
:::

:::step{why="1.0101 has exactly 4 fraction bits, so no rounding is needed here."}
Stored: $1.0101 \times 2^1$.
:::

:::answer
$2.625 = 1.0101_2 \times 2^1$. The one normalising shift is all a multiplication ever needs, because
$[1, 2) \times [1, 2) = [1, 4)$.
:::
::::

:::note{#recap-mul title="Recap" depth="quick"}
Multiply: XOR the signs, $e = e_x + e_y - B$, multiply significands, at most one right shift, round.
Divide: $e = e_x - e_y + B$, at most one left shift. $\times 2^k$ = add $k$ to the exponent field.
:::

## Overflow and underflow

:::definition{#overflow-underflow term="Overflow and underflow in floating point" depth="quick"}
- **Overflow:** the rounded result is larger in magnitude than the largest finite value. In round to
  nearest it becomes $\pm\infty$; in round toward zero it becomes $\pm x_{\max}$.
- **Underflow:** the result is smaller in magnitude than the smallest normal value $2^{-126}$. IEEE
  then delivers a denormal (gradual underflow, Lesson 6), or $\pm 0$ if it is below half the smallest
  denormal. Custom formats without denormals simply return 0.

Unlike integer overflow (Lesson 4), floating-point overflow never wraps around to a wrong-signed
value: it saturates to infinity, and the exception is flagged.
:::

### Worked examples: overflow and underflow

::::example{#ex-ovf-easy level="easy" title="2^127 × 2" depth="quick"}
Compute $2^{127} \times 2$ in single precision.

:::step{why="Add exponents: 127 + 1 = 128, above the largest normal exponent 127."}
The exact result $2^{128}$ is not representable.
:::

:::step{why="2^128 is above the overflow threshold (2 − 2^-24)·2^127, so round to nearest gives infinity, not the largest finite value."}
In fields: $254 + 128 - 127 = 255$, the reserved all-ones exponent, so the result is $+\infty$.
:::

:::answer
Overflow: the result is $+\infty$ (`0x7F800000`).
:::
::::

::::example{#ex-unf-zero level="medium" title="2^-100 × 2^-100" depth="standard"}
Compute $2^{-100} \times 2^{-100}$ in single precision.

:::step{why="The exact product is 2^-200."}
$2^{-200}$ is far below the smallest denormal $2^{-149}$.
:::

:::step{why="It is below half the smallest denormal, so round to nearest gives 0."}
$2^{-200} < 2^{-150}$.
:::

:::answer
Underflow to $+0$ (`0x00000000`).
:::
::::

::::example{#ex-unf-den level="gate" title="An underflow that lands on a denormal" depth="standard"}
Compute $2^{-65} \times 2^{-65}$ in single precision and give the hex result.

:::step{why="The exact product is 2^-130, below the smallest normal 2^-126 but above 2^-149."}
$2^{-130} = 0.0001_2 \times 2^{-126}$.
:::

:::step{why="As a denormal: exponent field 0, fraction 0001 followed by 19 zeros."}
$0\ 00000000\ 0001\,0\ldots0 = $ `0x00080000`.
:::

:::answer
$2^{-130}$ exactly, as the denormal `0x00080000`; a flush-to-zero machine would return 0.
:::
::::

::::example{#ex-ovf-edge level="gate" title="Edge case: the exact overflow threshold" depth="standard"}
In single precision with round to nearest, which exact results overflow to $+\infty$?

:::step{why="The largest float is (2 − 2^-23)·2^127 and the next tick would be 2^128, one ulp = 2^104 higher."}
Neighbours at the top: $x_{\max} = (2 - 2^{-23})\,2^{127}$ and (virtually) $2^{128}$.
:::

:::step{why="The midpoint is a tie; x_max ends in a 1 (odd), so a tie rounds up, to infinity."}
Midpoint $(2 - 2^{-24})\,2^{127}$.
:::

:::answer
Every exact result $\ge (2 - 2^{-24})\,2^{127}$ overflows to $+\infty$; anything below rounds to at most
$x_{\max}$. So overflow is decided **after** rounding, not by comparing with $x_{\max}$.
:::
::::

:::note{#recap-ovf title="Recap" depth="quick"}
Overflow → $\pm\infty$ (round to nearest); underflow → denormal or $\pm 0$. Floats saturate; they do
not wrap. The overflow threshold is the rounding midpoint above $x_{\max}$.
:::

## GATE questions on this lesson

All eight previous-year questions on floating-point arithmetic.

:::pyq{id="cse-2000-a-2-14" tests="absorption,not-associative,trap-order" depth="standard"}
:::

:::pyq{id="cse-2004-cs-28" tests="not-associative,rounding-modes,trap-order" depth="standard"}
:::

:::pyq{id="cse-2020-cs-29" tests="fp-div,trick-pow2,bias-subtract" depth="standard"}
:::

:::pyq{id="cse-2023-cs-35" tests="fp-mul,trick-pow2,trap-bias-twice" depth="standard"}
:::

:::pyq{id="cse-2025-2-cs-39" tests="fp-add-algorithm,fp-mul" depth="standard"}
:::

:::pyq{id="cse-2026-1-cs-26" tests="fp-add-algorithm,why-align-smaller,trap-align" depth="standard"}
:::

:::pyq{id="cse-1997-b-72-b" tests="fp-add-algorithm,why-align-smaller" depth="standard"}
:::

:::pyq{id="cse-1997-b-72-c" tests="relative-error,fp-add-algorithm" depth="standard"}
:::

## Practice

Our own questions; every answer was computed with exact IEEE arithmetic and cross-checked with
Python's own floats.

:::practice{id="nx-dl-01-07-q01" depth="standard"}
:::

:::practice{id="nx-dl-01-07-q02" depth="standard"}
:::

:::practice{id="nx-dl-01-07-q03" depth="standard"}
:::

:::practice{id="nx-dl-01-07-q04" depth="standard"}
:::

:::practice{id="nx-dl-01-07-q05" depth="standard"}
:::

:::practice{id="nx-dl-01-07-q06" depth="standard"}
:::

:::practice{id="nx-dl-01-07-q07" depth="standard"}
:::

:::practice{id="nx-dl-01-07-q08" depth="standard"}
:::

:::practice{id="nx-dl-01-07-q09" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Floating-point arithmetic on one card" depth="quick"}
| Idea | Formula or rule |
|:--|:--|
| One rounding per operation | result = round(exact result) |
| Default mode | round to nearest, ties to even |
| G, R, S | G = 0 → down; G = 1 and (R or S) → up; G = 1 only → tie to even |
| Relative error | ≤ $2^{-p}$ (nearest), ≤ $2^{1-p}$ (truncation) |
| Add/subtract | align smaller right (hidden 1 too) → add → normalise → round → range check |
| Absorption | $|y| < \tfrac12\text{ulp}(x)$ ⇒ $x + y = x$ |
| Order | commutative, **not** associative |
| Multiply | $s_x \oplus s_y$; $e_x + e_y - B$; $M \in [1, 4)$, at most one right shift |
| Divide | $e_x - e_y + B$; $M \in (\tfrac12, 2)$, at most one left shift |
| $\times 2^k$ | add $k \times$ `0x00800000` (normal range only) |
| Overflow / underflow | $\pm\infty$ / denormal or $\pm 0$; threshold $(2 - 2^{-24})2^{127}$ |
:::

:::note{#further-depth title="Further depth: fused multiply-add and compensated sums" depth="deep"}
Modern processors offer a **fused multiply-add**, $\text{fma}(a, b, c) = \text{round}(a \times b + c)$ with a
single rounding, which halves the error of dot products. Kahan's **compensated summation** keeps a
second float that collects the low-order bits each addition throws away, so a long sum of $0.1$s stays
accurate to the last bit. Both exist because of the absorption and order effects in this lesson.
:::
