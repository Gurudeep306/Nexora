---
id: fractions-fixed-point
subject: dl
chapter: number-systems
title: Fractions and fixed-point numbers
order: 3
prerequisites: [place-value, power-of-two-bases]
pyq_topics: [dl/number]
est_minutes: 45
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every value is checked by content/gate-notes/_checks/dl/l03_fractions.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 8–14 and 21–22, set B p. 150, set C pp. 203–207. Set A's fixed-point minimum slip is recorded in _errata/dl.md."
  - "Facts checked against standard textbooks: M. Morris Mano, Computer System Architecture (fixed-point representation); D. E. Knuth, TAOCP vol. 2 §4.1 (radix fractions)."
  - "PYQs: src/gate/questions.json (dl/number), keys re-derived in l03_fractions.py."
updated: "2026-10-17"
---

Not every number is whole. A sensor reading, a filter coefficient or a price needs digits after
the point, and the hardware has to store them in a fixed number of bits. In this lesson you
learn to convert a fraction into any base by repeated multiplication, to predict *before* you
start whether the digits will stop or repeat for ever, to bound the error when you cut them
off, and to read and design **fixed-point** formats: how far they reach, how finely they step,
and exactly which values they can hold. GATE asks all four of these.

## Where this fits

[Lesson 1](lesson:place-value) showed that the digits after the point are worth $b^{-1}, b^{-2},
\dots$, and [Lesson 2](lesson:power-of-two-bases) grouped fraction bits rightward from the point.
Here we go the other way, from a decimal fraction to its digits. Fixed point is the simplest way
real numbers live in hardware; [Lesson 5](lesson:floating-point-basics) replaces it with floating
point, where the point moves. The question "is this value exactly representable?" comes back
there in the same form.

:::table{#radar title="GATE radar: fractions and fixed point" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 5 (2002–2021) |
| Marks | 3 one-mark, 2 two-mark |
| Formats | 4 MCQ, 1 NAT |
| Pattern 1 | Convert a fraction between binary and decimal: 2002, 2021 |
| Pattern 2 | Range of an unsigned fixed-point format: 2017 |
| Pattern 3 | Which values are exactly representable in a given format: 2018 |
| Pattern 4 | Mixed-base subtraction with fractions, answer in octal: IT 2007 |
| What examiners test | The maximum $2^i - 2^{-f}$ (not $2^i$), and "0.25 is exact but 0.1 is not" |
:::

## The idea: cutting a cake in halves

:::intuition{#cake title="Halves of halves of halves" depth="standard"}
You may cut a cake only in half, then cut pieces in half again, and so on. You can serve exactly
a half, a quarter, three-eighths, five-sixteenths: any sum of these binary pieces. But you can
never serve *exactly* one fifth of the cake, however many times you cut: you can only get
closer and closer (a quarter is too much, three-sixteenths too little, …).

That is binary fractions in a nutshell. The pieces available are $\tfrac12, \tfrac14, \tfrac18,
\dots$, and a value is exactly representable only if it is a finite sum of them. A base-10
"cake" can be cut into tenths, so it serves one fifth (0.2) easily, but it cannot serve one
third. Which fractions come out exactly depends on the base.
:::

## Converting a fraction into base b

:::derivation{#repeated-multiplication of="why repeated multiplication gives the digits" depth="quick"}
Let $x = (0.d_1 d_2 d_3 \dots)_b$, a fraction with $0 \le x < 1$. Multiply by $b$: every digit
moves one place left, so

$$
b \cdot x = (d_1 . d_2 d_3 \dots)_b = d_1 + (0.d_2 d_3 \dots)_b .
$$

The integer part of $b\,x$ is the first digit $d_1$, and the fraction part is a new fraction
whose first digit is $d_2$. Repeat on the fraction part.

**Rule:** multiply the fraction by $b$, peel off the integer part as the next digit, keep the
fraction part, repeat. The digits come out **first to last**, so read them **top to bottom**
(the opposite of repeated division). Stop when the fraction part is 0, or when it repeats.

**Sanity check.** $0.625 \times 2 = 1.25$ (digit 1), $0.25 \times 2 = 0.5$ (digit 0),
$0.5 \times 2 = 1.0$ (digit 1), fraction 0: $(0.101)_2 = \tfrac12 + \tfrac18 = 0.625$. ✓

**Mixed numbers:** convert the integer part by repeated division and the fraction part by
repeated multiplication, then join them at the point.
:::

Why multiply here when integers needed division? For an integer, the digit you can see
immediately is the **last** one (the remainder), so you peel from the right by dividing. For a
fraction, the digit you can expose immediately is the **first** one after the point: one
multiplication by $b$ pushes it across the point into the integer part. Each method attacks the
end of the numeral that is next to the point, and moves away from it.

A practical habit: write the fraction you keep at the end of each row in a column. The moment a
value in that column repeats, stop, because every later row is already known. For decimal inputs
the kept fractions are always "something over 10, 100, …", so with a little practice you spot the
repeat after a handful of rows.

:::viz{#peel spec="doubling-peel" mode="animate" depth="standard"}
:::

When the fraction part comes back to a value it had before, the same rows repeat for ever and
so do the digits. That is a **recurring** expansion. Watch it happen for 0.1:

:::viz{#loop spec="recurring-loop" mode="animate" depth="standard"}
:::

:::trap{#trap-read-order title="Reading the peeled digits bottom-up" depth="quick"}
Repeated **division** (integers) is read from the bottom up; repeated **multiplication**
(fractions) is read from the top down. Mixing them up reverses the fraction digits:
$0.625$ would come out as $0.101$ either way, but $0.8125 = (0.1101)_2$ would be misread as
$(0.1011)_2 = 0.6875$.
:::

### Worked examples: fractions to binary and other bases

::::example{#ex-frac-easy level="easy" title="A fraction that stops" depth="quick"}
Write $0.40625$ in binary.

:::step{why="Doubling moves the first bit after the point into the integer place, where it can be read."}
$0.40625 \times 2 = 0.8125$ → bit 0. Keep $0.8125$.
:::

:::step{why="Repeat on the fraction part each time."}
$0.8125 \times 2 = 1.625$ → bit 1, keep $0.625$. Then $0.625 \times 2 = 1.25$ → bit 1, keep $0.25$.
:::

:::step{why="Continue until the fraction part is exactly 0."}
$0.25 \times 2 = 0.5$ → bit 0. $0.5 \times 2 = 1.0$ → bit 1, fraction 0: stop.
:::

:::step{why="Bits are produced first to last, so read top to bottom. Check with place values."}
$(0.01101)_2 = \tfrac14 + \tfrac18 + \tfrac1{32} = \tfrac{13}{32} = 0.40625$.
:::

:::answer
$0.40625 = (0.01101)_2$
:::
::::

::::example{#ex-frac-mixed level="easy" title="A mixed number" depth="standard"}
Write $13.375$ in binary.

:::step{why="The integer and fraction parts are converted separately and joined at the point."}
Integer: $13 = 8 + 4 + 1 = (1101)_2$ (by repeated division or by powers of 2).
:::

:::step{why="Fraction by repeated doubling."}
$0.375 \times 2 = 0.75$ → 0; $0.75 \times 2 = 1.5$ → 1; $0.5 \times 2 = 1.0$ → 1, stop. So $0.375 = (0.011)_2$.
:::

:::step{why="Join the two parts."}
$13.375 = (1101.011)_2$.
:::

:::answer
$(1101.011)_2$
:::
::::

::::example{#ex-frac-recur level="medium" title="A fraction that recurs" depth="standard"}
Write $0.3$ in binary, keep six bits, and bound the error.

:::step{why="Double and peel, watching the fraction parts for a repeat."}
$0.3 \to 0.6$ (0), $0.6 \to 1.2$ (1), $0.2 \to 0.4$ (0), $0.4 \to 0.8$ (0), $0.8 \to 1.6$ (1), $0.6 \to 1.2$ (1), …
:::

:::step{why="The fraction 0.6 appeared after the first row and again after the fifth, so the rows from there repeat."}
$0.3 = (0.0\overline{1001})_2 = 0.0\,1001\,1001\,1001\dots$
:::

:::step{why="Truncation keeps the first six bits; every dropped bit is worth less than the last kept place 2⁻⁶."}
Six bits: $(0.010011)_2 = \tfrac{19}{64} = 0.296875$. The error is $0.3 - 0.296875 = 0.003125 < 2^{-6} = 0.015625$.
:::

:::answer
$0.3 = (0.0\overline{1001})_2 \approx (0.010011)_2$, with truncation error $0.003125$.
:::
::::

::::example{#ex-frac-hex level="gate" title="Decimal to hex with a fraction" depth="standard"}
Write $45.8125$ in hexadecimal.

:::step{why="Integer part by repeated division by 16."}
$45 = 16 \cdot 2 + 13$, $2 = 16\cdot 0 + 2$: $(2D)_{16}$.
:::

:::step{why="Fraction part by repeated multiplication by 16 (not 2): each product's integer part is a hex digit."}
$0.8125 \times 16 = 13.0$ → digit D, fraction 0: stop.
:::

:::step{why="Join and check."}
$(2D.D)_{16} = 45 + \tfrac{13}{16} = 45.8125$.
:::

:::answer
$45.8125 = (2D.D)_{16}$
:::
::::

::::example{#ex-frac-octal level="gate" title="Edge case: a long recurring octal fraction" depth="standard"}
Write $0.7$ in octal.

:::step{why="Multiply by 8 each time."}
$0.7 \to 5.6$ (5), $0.6 \to 4.8$ (4), $0.8 \to 6.4$ (6), $0.4 \to 3.2$ (3), $0.2 \to 1.6$ (1), $0.6 \to 4.8$ (4), …
:::

:::step{why="The fraction 0.6 is first kept after row 1 and comes back after row 5, so everything from the second digit repeats."}
$0.7 = (0.5\overline{4631})_8$: one non-repeating digit, then a period of four.
:::

:::answer
$(0.5\overline{4631})_8$. A recurring expansion may start after some non-repeating digits.
:::
::::

:::note{#recap-mult title="Recap" depth="quick"}
Fraction → base $b$: multiply by $b$, peel the integer part, keep the fraction, read top to
bottom. It stops when the fraction becomes 0 and recurs when a fraction part repeats.
:::

## Which fractions stop?

:::theorem{#terminates name="When a fraction terminates in base b" depth="quick"}
Write a rational number in lowest terms as $p/q$. Its base-$b$ expansion **terminates** if and
only if every prime factor of $q$ divides $b$. Otherwise it is **recurring**.

- Base 2: $p/q$ terminates exactly when $q$ is a power of 2. So $0.25 = 1/4$ and $0.375 = 3/8$ are exact; $0.1 = 1/10$, $0.2 = 1/5$ and $1/3$ recur.
- Base 10: $q$ may have only the primes 2 and 5. So $1/8 = 0.125$ terminates but $1/3$ does not.
:::

:::proof{#proof-terminates of="the termination test" depth="deep"}
**Idea first:** a terminating base-$b$ fraction is an integer divided by a power of $b$, so it
can only have denominators built from the primes of $b$.

($\Rightarrow$) If $x = (0.d_1 \dots d_k)_b$, then $x = m / b^k$ with $m = (d_1 \dots d_k)_b$ an
integer. So $p/q = m/b^k$, i.e. $p\, b^k = m\, q$. Since $\gcd(p, q) = 1$, $q$ divides $b^k$,
so every prime factor of $q$ is a prime factor of $b$.

($\Leftarrow$) If every prime of $q$ divides $b$, choose $k$ at least as large as every exponent
in $q$'s factorisation. Then $q$ divides $b^k$, say $b^k = q\,s$, and
$p/q = p\,s / b^k$, which is an integer divided by $b^k$: a numeral with at most $k$ digits
after the point.
:::

:::trick{#trick-power-of-two title="The power-of-two test for decimals" depth="standard"}
To ask "is this decimal exact in binary?", write it as a fraction in lowest terms and look at
the denominator. $0.375 = 3/8$: power of 2, exact. $0.05 = 1/20$: has a 5, recurs.
**Why it works:** the [theorem](#terminates) with $b = 2$. **When it fails:** never, but you must
reduce first: $0.5 = 5/10$ looks bad until it becomes $1/2$.
:::

### Worked examples: terminating or recurring?

::::example{#ex-term-easy level="easy" title="Three-eighths in binary" depth="quick"}
Does $0.375$ terminate in binary?

:::step{why="Write the decimal as a fraction and reduce it."}
$0.375 = 375/1000 = 3/8$.
:::

:::step{why="Apply the test: the denominator must be a power of 2."}
$8 = 2^3$, so yes. Indeed $0.375 = (0.011)_2$, three bits because $8 = 2^3$.
:::

:::answer
Yes: $(0.011)_2$.
:::
::::

::::example{#ex-term-fifth level="medium" title="One fifth" depth="standard"}
Does $0.2$ terminate in binary? In base 10? In base 5?

:::step{why="Reduce: 0.2 = 1/5."}
The denominator is 5.
:::

:::step{why="Base 2 has only the prime 2, which does not divide 5."}
Binary: recurring, $(0.\overline{0011})_2$.
:::

:::step{why="Bases 10 and 5 both contain the prime 5."}
Base 10: $0.2$. Base 5: $1/5 = (0.1)_5$.
:::

:::answer
Recurring in binary; terminating in bases 10 and 5.
:::
::::

::::example{#ex-term-base6 level="gate" title="A base where twelfths terminate" depth="standard"}
Write $7/12$ in base 6.

:::step{why="Check the test first: 12 = 2²·3, and both 2 and 3 divide 6."}
It terminates, in at most 2 digits (the largest exponent in $12 = 2^2\cdot 3$ is 2).
:::

:::step{why="Multiply by 6 and peel."}
$\tfrac{7}{12} \times 6 = 3.5$ → digit 3, keep $0.5$; $0.5 \times 6 = 3.0$ → digit 3, stop.
:::

:::answer
$7/12 = (0.33)_6$. Check: $\tfrac36 + \tfrac3{36} = \tfrac{21}{36} = \tfrac7{12}$.
:::
::::

::::example{#ex-term-edge level="gate" title="Edge case: one third is exact in base 3" depth="standard"}
Compare $1/3$ in base 3 and in base 2.

:::step{why="Base 3 contains the prime 3."}
Base 3: $\tfrac13 \times 3 = 1.0$ → $(0.1)_3$, exact in one digit.
:::

:::step{why="Base 2 lacks the prime 3, so the expansion must recur."}
Base 2: $\tfrac13 \to \tfrac23$ (0) $\to \tfrac13$ (1) $\to$ repeat: $(0.\overline{01})_2$.
:::

:::answer
$1/3 = (0.1)_3 = (0.\overline{01})_2$. "Exact" is a property of the number **and** the base.
:::
::::

:::trap{#trap-not-exact title="0.1 recurs, so 0.25 must too" depth="quick"}
Students who remember "decimal fractions are not exact in binary" wrongly reject $0.25$ or
$0.375$. Only denominators with a prime other than 2 cause recurrence: $0.25 = 1/4 = (0.01)_2$
is exact.
:::

:::note{#recap-term title="Recap" depth="quick"}
In lowest terms $p/q$ terminates in base $b$ exactly when the primes of $q$ divide $b$. In
binary: the denominator must be a power of 2.
:::

## Truncation error

:::derivation{#truncation of="the error from keeping k digits" depth="quick"}
Keep the first $k$ digits of $x = (0.d_1 d_2 \dots)_b$ and drop the rest. The dropped tail is
$(0.00\dots0\,d_{k+1} d_{k+2}\dots)_b$, which is at least 0 and **less than** $b^{-k}$. (Only a
tail of $b - 1$ digits repeated for ever would reach $b^{-k}$, and the expansion produced by
repeated multiplication never ends that way: $0.0111\dots_2$ is written $0.1_2$.) So

$$
0 \le x - x_{\text{truncated}} < b^{-k}.
$$

Rounding to the nearest $k$-digit value halves the bound: the error is at most $\tfrac12 b^{-k}$.

**Sanity check.** $0.3$ truncated to 6 bits had error $0.003125 < 2^{-6} = 0.015625$. ✓
:::

## Fixed-point numbers

A computer word has a fixed number of bits. A **fixed-point** format simply agrees, once and for
all, where the binary point sits inside the word.

:::definition{#fixed-point term="Unsigned fixed point (i.f format)" depth="quick"}
An $n$-bit unsigned fixed-point number has $i$ integer bits and $f = n - i$ fraction bits:
$b_{n-1} \dots b_f \,.\, b_{f-1} \dots b_0$. Its value is the plain unsigned integer read from
all $n$ bits, scaled by $2^{-f}$:

$$
X = \Big(\sum_{j=0}^{n-1} b_j 2^{j}\Big) \cdot 2^{-f}.
$$

- **Resolution** (the step between neighbours): $2^{-f}$.
- **Range:** from $0$ (all zeros) to $2^{i} - 2^{-f}$ (all ones).
- **Number of values:** $2^n$, whatever the split.
:::

:::derivation{#fixed-max of="the largest fixed-point value" depth="quick"}
All ones is the integer $2^n - 1$. Scale it by $2^{-f}$:

$$
X_{\max} = (2^n - 1)\, 2^{-f} = 2^{n-f} - 2^{-f} = 2^{i} - 2^{-f}.
$$

Another view: the integer bits alone reach $2^i - 1$, and the fraction bits alone reach
$1 - 2^{-f}$; together $2^i - 1 + 1 - 2^{-f} = 2^i - 2^{-f}$.

**Sanity check.** $i = 5$, $f = 3$: $11111.111_2 = 31 + 0.875 = 31.875 = 32 - \tfrac18$. ✓
The format can never reach $2^i$ itself; that needs one more integer bit.
:::

The picture to keep in mind is a ruler with $2^n$ tick marks. The number of bits fixes how many
ticks there are; the position of the point fixes how far apart they are. Moving the point one
place left halves the spacing (finer resolution) and halves the reach (smaller range). Nothing
is free: with a fixed word length, **range × resolution trade off exactly**. The animation below
moves the point through a 4-bit word.

:::viz{#ruler spec="fixed-point-ruler" mode="animate" depth="standard"}
:::

:::derivation{#choose-format of="choosing i and f for a required range and resolution" depth="standard"}
Suppose values from $0$ up to $M$ must be stored with a step no coarser than $r$.

- **Fraction bits:** the step $2^{-f}$ must satisfy $2^{-f} \le r$, so $f = \lceil \log_2 (1/r) \rceil$.
- **Integer bits:** the maximum $2^i - 2^{-f}$ must reach $M$, so take the smallest $i$ with $2^i - 2^{-f} \ge M$ (usually $2^i > M$ is enough).

**Sanity check.** $M = 100$, $r = 0.01$: $2^{-6} = 0.015625$ is too coarse and $2^{-7} = 0.0078125$
is fine, so $f = 7$; $2^6 = 64$ is too small and $2^7 = 128$ is enough, so $i = 7$. A 14-bit
7.7 format covers $0$ to $127.9921875$ in steps of $0.0078125$.
:::

:::viz{#fp-bits spec="fixed-point-bits" mode="static" depth="standard"}
:::

:::definition{#representable term="Exactly representable in i.f" depth="quick"}
A value $x$ is stored exactly in unsigned $i.f$ fixed point if and only if

1. $x \cdot 2^{f}$ is a whole number (the fraction needs no more than $f$ bits), and
2. $0 \le x \le 2^i - 2^{-f}$ (it fits in the range).

Condition 1 is the termination theorem with a deadline: the denominator of $x$ in lowest terms
must be a power of 2 no bigger than $2^f$.
:::

:::aside{#signed-q title="Signed fixed point, briefly" depth="standard"}
If the $n$ bits are read as a **2's-complement** integer (Lesson 4) and scaled by $2^{-f}$, the
format (often called Q$i$.$f$, with the sign inside the $i$ integer bits) covers
$[-2^{i-1},\; 2^{i-1} - 2^{-f}]$ with the same resolution $2^{-f}$. For example, 8 bits as
Q4.4 cover $-8$ to $7.9375$ in steps of $0.0625$. Sign-magnitude fixed point instead covers
$\pm(2^{i-1} - 2^{-f})$.
:::

### Worked examples: fixed-point range

::::example{#ex-fx-range level="easy" title="Range of 8-bit 5.3 fixed point" depth="quick"}
An unsigned 8-bit format has 3 fraction bits. Give its range, resolution and number of values.

:::step{why="i = n − f."}
$i = 8 - 3 = 5$.
:::

:::step{why="Resolution is the weight of the last fraction bit; the maximum is all ones."}
Resolution $2^{-3} = 0.125$. Maximum $2^5 - 2^{-3} = 31.875$.
:::

:::step{why="Every one of the 2⁸ patterns is a different value."}
Values: $2^8 = 256$, namely $0, 0.125, 0.25, \dots, 31.875$.
:::

:::answer
$[0, 31.875]$ in steps of $0.125$; 256 values.
:::
::::

::::example{#ex-fx-12 level="medium" title="A 12-bit format" depth="standard"}
An unsigned 12-bit fixed-point format has 4 fraction bits. Find its largest value.

:::step{why="i = 12 − 4."}
$i = 8$, $f = 4$.
:::

:::step{why="Apply X_max = 2^i − 2^−f."}
$2^8 - 2^{-4} = 256 - 0.0625 = 255.9375$.
:::

:::answer
$255.9375$ (bit pattern $11111111.1111$).
:::
::::

::::example{#ex-fx-general level="gate" title="The general range, in symbols" depth="standard"}
An unsigned $n$-bit fixed-point number has $f$ fraction bits and $i = n - f$. What is its range?

:::step{why="The smallest pattern is all zeros."}
Minimum $0$.
:::

:::step{why="The largest pattern is all ones, which is the integer 2ⁿ − 1 scaled by 2⁻ᶠ."}
Maximum $(2^n - 1)2^{-f} = 2^{i} - 2^{-f}$.
:::

:::answer
$0$ to $2^i - 2^{-f}$.
:::
::::

::::example{#ex-fx-design level="gate" title="Design a format for a sensor" depth="standard"}
A temperature from $0$ to $50$ degrees must be stored unsigned with a resolution of at least $0.1$ degree. What is the smallest fixed-point format?

:::step{why="The step 2⁻ᶠ must be at most 0.1."}
$2^{-3} = 0.125$ is too coarse; $2^{-4} = 0.0625 \le 0.1$. So $f = 4$.
:::

:::step{why="The maximum 2ⁱ − 2⁻ᶠ must reach 50."}
$i = 5$ gives $32 - 0.0625 = 31.9375 < 50$; $i = 6$ gives $64 - 0.0625 = 63.9375 \ge 50$. So $i = 6$.
:::

:::step{why="The word length is the sum."}
$n = i + f = 10$ bits, format 6.4: range $0$ to $63.9375$, step $0.0625$.
:::

:::answer
10 bits as unsigned 6.4 fixed point.
:::
::::

::::example{#ex-fx-edge level="gate" title="Edge case: why the maximum is not 2 to the i" depth="standard"}
A student claims a 4.2 format reaches $2^4 = 16$. Show why it does not.

:::step{why="Write the largest pattern."}
$1111.11_2 = 15 + 0.75 = 15.75$.
:::

:::step{why="16 would be 10000.00, which needs a fifth integer bit."}
$16 = (10000)_2$ does not fit in 4 integer bits.
:::

:::answer
The maximum is $16 - 0.25 = 15.75 = 2^4 - 2^{-2}$; one step short of $2^i$.
:::
::::

### Worked examples: exactly representable?

::::example{#ex-rep-easy level="easy" title="2.375 in 4.4" depth="quick"}
Is $2.375$ exactly representable in unsigned 4.4 fixed point? If so, give the bits.

:::step{why="Scale by 2^f = 16 and see whether the result is a whole number."}
$2.375 \times 16 = 38$, a whole number.
:::

:::step{why="Check the range: the 4.4 maximum is 16 − 1/16 = 15.9375."}
$2.375 \le 15.9375$. Fits.
:::

:::step{why="The bits are 38 in 8-bit binary, with the point after four bits."}
$38 = (00100110)_2$, so the pattern is $0010.0110$.
:::

:::answer
Yes: $0010.0110$.
:::
::::

::::example{#ex-rep-mix level="medium" title="Four values in 5.3" depth="standard"}
Which of $20.625$, $7.3$, $40$ and $0.0625$ are exact in unsigned 5.3 fixed point?

:::step{why="Multiply each by 2³ = 8; it must be a whole number."}
$20.625 \cdot 8 = 165$ ✓, $7.3 \cdot 8 = 58.4$ ✗, $40 \cdot 8 = 320$ ✓, $0.0625 \cdot 8 = 0.5$ ✗.
:::

:::step{why="The range check: values must not exceed 31.875."}
$20.625$ fits; $40 > 31.875$ does not.
:::

:::answer
Only $20.625$. ($7.3$ and $0.0625$ need more fraction bits; $40$ is out of range.)
:::
::::

::::example{#ex-rep-gate level="gate" title="A tenth in any binary fixed-point format" depth="standard"}
Is there any unsigned fixed-point format (any $i$, any $f$) that stores $0.1$ exactly?

:::step{why="Exactness needs 0.1 · 2^f to be a whole number."}
$0.1 \cdot 2^f = 2^f / 10 = 2^{f-1}/5$.
:::

:::step{why="A power of 2 is never divisible by 5."}
$2^{f-1}/5$ is never a whole number, for any $f$.
:::

:::answer
No. $0.1$ recurs in binary, so no finite number of fraction bits holds it exactly.
:::
::::

::::example{#ex-rep-edge level="gate" title="Edge case: the top of the range" depth="standard"}
Is $31.875$ exact in unsigned 5.3? Is $31.9$?

:::step{why="Scale by 8."}
$31.875 \cdot 8 = 255$, whole, and $255 = 2^8 - 1$ is the all-ones pattern.
:::

:::step{why="31.9 · 8 = 255.2 is not whole, and in any case it exceeds the maximum."}
$31.9$ fails both conditions.
:::

:::answer
$31.875$ is exact (it is the maximum, $11111.111$); $31.9$ is not.
:::
::::

:::trap{#trap-max title="Giving 2^i as the fixed-point maximum" depth="quick"}
The all-ones pattern is $2^i - 2^{-f}$, one resolution step below $2^i$. GATE 2017 offers "0 to
$2^i$" as a distractor. Also, the smallest value of an unsigned format is $0$, not $2^{-f}$
($2^{-f}$ is the smallest **positive** value).
:::

:::trap{#trap-hex-fraction title="Reading a hex fraction as decimal" depth="quick"}
In $(C012.25)_{16}$ the fraction is $\tfrac{2}{16} + \tfrac{5}{256} = 0.14453125$, not $0.25$.
Digits after the point belong to the numeral's own base.
:::

:::note{#recap-fixed title="Recap" depth="quick"}
Unsigned $i.f$: values $k\cdot 2^{-f}$ for $k = 0 \dots 2^n - 1$, so range $[0, 2^i - 2^{-f}]$,
resolution $2^{-f}$, $2^n$ values. $x$ is exact iff $x\cdot 2^f$ is a whole number in range.
:::

## GATE questions on this lesson

All five previous-year questions for this lesson, from the easiest to the hardest.

:::pyq{id="cse-2002-a-14" tests="repeated-multiplication,terminates,trap-not-exact" depth="standard"}
:::

:::pyq{id="cse-2021-2-cs-18" tests="repeated-multiplication" depth="standard"}
:::

:::pyq{id="cse-2017-1-cs-7" tests="fixed-point,fixed-max,trap-max" depth="standard"}
:::

:::pyq{id="cse-2018-cs-33" tests="representable,fixed-point" depth="standard"}
:::

:::pyq{id="it-2007-cs-42" tests="repeated-multiplication,trap-hex-fraction" depth="standard"}
:::

## Practice

:::practice{id="nx-dl-01-03-q01" depth="standard"}
:::

:::practice{id="nx-dl-01-03-q02" depth="standard"}
:::

:::practice{id="nx-dl-01-03-q03" depth="standard"}
:::

:::practice{id="nx-dl-01-03-q04" depth="standard"}
:::

:::practice{id="nx-dl-01-03-q05" depth="standard"}
:::

:::practice{id="nx-dl-01-03-q06" depth="standard"}
:::

:::practice{id="nx-dl-01-03-q07" depth="standard"}
:::

:::practice{id="nx-dl-01-03-q08" depth="standard"}
:::

:::practice{id="nx-dl-01-03-q09" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Fractions and fixed point on one card" depth="quick"}
| Idea | Formula or rule |
|:--|:--|
| Fraction → base $b$ | multiply by $b$, peel the integer part, read **top to bottom** |
| Mixed number | integer part by division, fraction part by multiplication |
| Terminates in base $b$ | lowest-terms denominator has only primes of $b$ (binary: a power of 2) |
| Recurs | a fraction part repeats; the digits from there repeat |
| Truncation to $k$ digits | error $< b^{-k}$ (rounding: $\le \tfrac12 b^{-k}$) |
| Unsigned $i.f$ value | (unsigned integer of all $n$ bits) $\times 2^{-f}$ |
| Range, resolution, count | $[0,\; 2^i - 2^{-f}]$, step $2^{-f}$, $2^n$ values |
| Exactly representable | $x \cdot 2^f$ is a whole number and $x \le 2^i - 2^{-f}$ |
| Signed (2's complement) Q$i.f$ | $[-2^{i-1},\; 2^{i-1} - 2^{-f}]$ |
:::

:::note{#further-depth title="Further depth: the length of a recurring period" depth="deep"}
For $1/q$ with $q$ odd and coprime to the base $b$, the period of the expansion is the smallest
$k$ with $b^k \equiv 1 \pmod q$ (the multiplicative order of $b$ mod $q$). In binary, $1/5$ has
period 4 because $2^4 = 16 \equiv 1 \pmod 5$, and $1/7$ has period 3 because $2^3 = 8 \equiv 1
\pmod 7$: $1/7 = (0.\overline{001})_2$. Factors of $b$ in the denominator only add a
non-repeating prefix, as in $1/10 = (0.0\overline{0011})_2$.
:::
