---
id: signed-numbers
subject: dl
chapter: number-systems
title: Signed numbers and complements
order: 4
prerequisites: [place-value, power-of-two-bases, fractions-fixed-point]
pyq_topics: [dl/number]
est_minutes: 80
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every value is checked by content/gate-notes/_checks/dl/l04_signed.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 20–21, set B pp. 141–146, set C pp. 208–214, set E p. 405."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (complements, signed binary numbers); M. Morris Mano, Computer System Architecture (arithmetic shifts, overflow); D. A. Patterson and J. L. Hennessy, Computer Organization and Design (sign extension)."
  - "PYQs: src/gate/questions.json (dl/number), keys re-derived in l04_signed.py; cse-2002-a-15 width assumption noted in _errata/dl.md §3."
updated: "2026-10-17"
---

So far every number was positive. Hardware has no minus sign, only bits, so a negative number
must be *encoded* in the same bits as everything else. In this lesson you meet the three classic
encodings (sign-magnitude, 1's complement and 2's complement), learn why 2's complement won,
and become fast at the things GATE asks again and again: the range of an $n$-bit format,
encoding and decoding negative values, the invert-and-add-1 rule and its copy-to-the-first-1
shortcut, complements in any base, the smallest width that holds a value, sign extension, and
arithmetic shifts. This is the most-tested lesson of the chapter: sixteen previous-year
questions.

## Where this fits

[Lesson 1](lesson:place-value) gave place value and [Lesson 2](lesson:power-of-two-bases) gave
the hex shorthand used for long patterns. Here one place value turns negative. Chapter 5 builds
the adder–subtractor and the overflow detector on top of 2's complement; Chapter 8 uses the
biased (excess-K) code from the end of this lesson for floating-point exponents.

:::table{#radar title="GATE radar: signed numbers and complements" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 16 (1994–2025), the most of any lesson in the chapter |
| Marks | 12 one-mark, 2 two-mark, one 5-mark descriptive (1995) and one unmarked fill-in (1994) |
| Formats | 10 MCQ, 2 MSQ, 2 NAT, 1 fill-in, 1 descriptive |
| Pattern 1 | Range of $n$-bit 2's complement: 1994, 2005, 2013 |
| Pattern 2 | Encode or decode a value: 1998, 2000, 2002, 2016, 2019 |
| Pattern 3 | Two zeros and value counts: 1999, 2016 |
| Pattern 4 | Sign extension and shifts: 2002, 2010, 2025 |
| Pattern 5 | Complements in hex, divisibility, a conversion routine: 1995, 2001, 2003 |
| What examiners test | Range "$-2^{n-1}$ to $2^{n-1}$" (off by one), zero-padding a negative number, and $-15$ as $1111$ |
:::

## The idea: a counter that runs backwards

:::intuition{#wheel-idea title="What does an odometer show one step before zero?" depth="standard"}
A 4-digit binary counter at 0000, stepped backwards once, shows 1111. Stepped back again, 1110.
If "one step back" means "subtract 1", then 1111 deserves to be called $-1$ and 1110 $-2$.
Bend the 16 patterns into a circle: going clockwise adds 1, anticlockwise subtracts 1, and after
1111 the counter wraps to 0000 because a 4-bit register simply drops the fifth bit.

That is arithmetic **modulo 16**: 1111 and $-1$ leave the same remainder when divided by 16.
2's complement is nothing more than choosing, for each pattern, the representative between $-8$
and $+7$. Because it *is* ordinary modular arithmetic, the same adder circuit adds signed and
unsigned numbers. That one fact is why every modern processor uses it.
:::

:::viz{#wheel spec="twos-complement-wheel" mode="animate" depth="quick"}
:::

## Four ways to read n bits

:::definition{#unsigned-range term="Unsigned" depth="quick"}
All $n$ bits are magnitude: value $= \sum b_i 2^i$. Range $0$ to $2^n - 1$; $2^n$ values.
:::

:::definition{#sign-magnitude term="Sign-magnitude (SM)" depth="quick"}
The top bit $b_{n-1}$ is a **sign flag** (0 = +, 1 = −) and the other $n-1$ bits are the size:

$$
\text{value} = (-1)^{b_{n-1}} \cdot (b_{n-2} \dots b_0)_2 .
$$

- Range $-(2^{n-1} - 1)$ to $+(2^{n-1} - 1)$.
- **Two zeros:** $000\dots0 = +0$ and $100\dots0 = -0$, so only $2^n - 1$ distinct values.
- Negate by flipping only the sign bit. Addition needs separate compare-and-subtract logic, which is why SM is rarely used for integers (it survives in floating-point significands).
:::

:::definition{#ones-complement term="1's complement" depth="quick"}
A negative number $-x$ is stored as $x$ with **every bit flipped**, i.e. $(2^n - 1) - x$.

- Range $-(2^{n-1} - 1)$ to $+(2^{n-1} - 1)$.
- **Two zeros:** $000\dots0$ and $111\dots1$; $2^n - 1$ distinct values.
- Addition needs an **end-around carry**: a carry out of the top bit is added back at the bottom. (Example in 4 bits: $+5 + (-2) = 0101 + 1101 = 1\,0010$; add the carry back: $0011 = +3$.)
:::

:::definition{#twos-complement term="2's complement" depth="quick"}
The top bit has a **negative weight** $-2^{n-1}$; every other bit keeps its usual weight:

$$
\text{value} = -b_{n-1}\, 2^{n-1} + \sum_{i=0}^{n-2} b_i\, 2^{i}.
$$

- Range $-2^{n-1}$ to $+2^{n-1} - 1$, with **one zero** and all $2^n$ patterns used.
- A negative $-x$ is stored as $2^n - x$; to negate, **invert every bit and add 1**.
- The most negative value $-2^{n-1}$ ($100\dots0$) has no positive partner: negating it gives itself.
- Non-negative values look exactly like unsigned ones (top bit 0).
:::

:::viz{#weights spec="msb-weight-bar" mode="static" depth="standard"}
:::

:::theorem{#twos-value name="Why the −2^(n−1) weight and the 2^n − x rule agree" depth="standard"}
For an $n$-bit pattern $p$ with unsigned value $U$, its 2's-complement value is $U$ if the top bit
is 0 and $U - 2^n$ if the top bit is 1. In both cases the signed value $\equiv U \pmod{2^n}$.
:::

:::proof{#proof-twos-value of="the 2's-complement value" depth="deep"}
**Idea first:** changing the top weight from $+2^{n-1}$ to $-2^{n-1}$ subtracts $2 \cdot 2^{n-1}
= 2^n$ exactly when that bit is 1.

$U = b_{n-1}2^{n-1} + R$ with $R = \sum_{i<n-1} b_i 2^i$. The signed value is
$-b_{n-1}2^{n-1} + R = U - b_{n-1}\,2^n$. If $b_{n-1} = 0$ this is $U$; if $b_{n-1} = 1$ it is
$U - 2^n$. Either way it differs from $U$ by a multiple of $2^n$, so adding patterns as unsigned
numbers (mod $2^n$) adds their signed values (mod $2^n$) too. So for a negative $-x$, the
pattern has $U - 2^n = -x$, i.e. $U = 2^n - x$.
:::

:::derivation{#negation of="invert and add 1" depth="quick"}
Let $\bar x$ be $x$ with every bit flipped. In every position exactly one of $x$, $\bar x$ has a
1, so

$$
x + \bar x = 11\dots1_2 = 2^n - 1 \quad\Rightarrow\quad \bar x + 1 = 2^n - x \equiv -x \pmod{2^n}.
$$

So invert-and-add-1 produces $2^n - x$, which is exactly the 2's-complement pattern of $-x$.
The same identity shows that 1's complement stores $-x$ as $\bar x = 2^n - 1 - x$.

**Sanity check (4 bits).** $x = 0011 = 3$: $\bar x = 1100$, $\bar x + 1 = 1101$, and
$-8 + 4 + 1 = -3$. ✓
:::

:::derivation{#copy-first-one of="the copy-to-the-first-1 shortcut" depth="quick"}
Write $x = (\text{anything})\,1\,0\dots0$: some bits, then its **rightmost 1**, then $k$ zeros.
Flipping gives $\bar x = (\text{flipped})\,0\,1\dots1$. Adding 1 to $k$ trailing 1s turns them
into 0s and carries into the 0, which becomes 1; the carry stops there. So

$$
-x = (\text{flipped})\,1\,\underbrace{0\dots0}_{k}.
$$

**Rule:** scanning from the right, copy every bit up to and including the first 1, then flip
all the bits to its left. (For $x = 0$ there is no 1 to stop at: $-0 = 0$, which is correct.)
:::

:::viz{#negate spec="negate-invert-plus-one" mode="animate" depth="standard"}
:::

:::trick{#trick-copy title="Copy to the first 1, then flip" depth="standard"}
$-x$ in 2's complement: from the right, copy up to and including the first 1, flip the rest.
$0010\,1000 \to 1101\,1000$. **Why it works:** the +1 of invert-and-add-1 ripples through the
trailing 1s of $\bar x$ (the [derivation](#copy-first-one)). **When it fails:** it never gives a
wrong pattern, but for $-2^{n-1}$ ($1000\dots0$) it returns the same pattern, because $+2^{n-1}$
does not exist in $n$ bits.
:::

:::trick{#trick-check-sum title="Check a negative pattern by adding the positive one" depth="standard"}
The patterns of $x$ and $-x$ must add up to $2^n$: all zeros with a carry out. $0001\,1100$
($+28$) plus $1110\,0100$ gives $1\,0000\,0000$. If the low $n$ bits are not all zero, the
negative pattern is wrong.
:::

:::derivation{#ranges of="ranges and value counts" depth="quick"}
- **2's complement.** Smallest: only the negative weight, $100\dots0 = -2^{n-1}$. Largest: every
  positive weight, $011\dots1 = 2^{n-1} - 1$. All $2^n$ patterns give different values.
- **SM and 1's.** The size field has $n - 1$ bits, so the largest magnitude is $2^{n-1} - 1$ on
  both sides; two patterns mean zero, so there are $2^n - 1$ values.

| $n$-bit format | Smallest | Largest | Values | Zeros |
|:--|:--:|:--:|:--:|:--:|
| Unsigned | $0$ | $2^n - 1$ | $2^n$ | 1 |
| Sign-magnitude | $-(2^{n-1} - 1)$ | $2^{n-1} - 1$ | $2^n - 1$ | 2 |
| 1's complement | $-(2^{n-1} - 1)$ | $2^{n-1} - 1$ | $2^n - 1$ | 2 |
| 2's complement | $-2^{n-1}$ | $2^{n-1} - 1$ | $2^n$ | 1 |

**Sanity check ($n = 4$):** 2's complement $-8 \dots 7$ is 16 values; SM $-7 \dots 7$ is 15 values
plus a second zero pattern: 16 patterns. ✓
:::

::::check{#check-ranges title="Quick range check" depth="standard"}
What is the range of 6-bit 2's complement, and of 6-bit sign-magnitude?

:::answer
2's complement: $-32$ to $+31$. Sign-magnitude: $-31$ to $+31$ (with two zeros).
:::
::::

:::note{#recap-formats title="Recap" depth="quick"}
SM: sign flag + size, two zeros. 1's: flip all bits, two zeros. 2's: top weight $-2^{n-1}$,
negate = invert + 1, range $-2^{n-1} \dots 2^{n-1} - 1$, one zero, every pattern used.
:::

### Worked examples: encoding

::::example{#ex-enc-pos level="easy" title="A positive number" depth="quick"}
Write $+37$ in 8-bit 2's complement.

:::step{why="A non-negative number is stored exactly as in unsigned binary, with a 0 sign bit."}
$37 = 32 + 4 + 1 = (100101)_2$.
:::

:::step{why="Pad on the left with zeros to 8 bits; the top bit 0 marks it as non-negative."}
$0010\,0101$.
:::

:::answer
$0010\,0101$
:::
::::

::::example{#ex-enc-16 level="medium" title="A negative number in 16 bits" depth="standard"}
Write $-45$ in 16-bit 2's complement.

:::step{why="Start from the positive value in the full width."}
$+45 = 0000\,0000\,0010\,1101$.
:::

:::step{why="Invert every bit."}
$1111\,1111\,1101\,0010$.
:::

:::step{why="Add 1 to finish the negation."}
$1111\,1111\,1101\,0011$, which is $(FFD3)_{16}$.
:::

:::step{why="The copy-to-the-first-1 rule must agree: the rightmost 1 of +45 is its last bit, so copy that 1 and flip everything else."}
Same pattern. Check: as unsigned it is $65491 = 65536 - 45$. ✓
:::

:::answer
$1111\,1111\,1101\,0011 = (FFD3)_{16}$
:::
::::

::::example{#ex-enc-min level="gate" title="The minimum width" depth="standard"}
Write $-9$ in 2's complement using the fewest possible bits.

:::step{why="n bits reach down to −2ⁿ⁻¹, so find the smallest n with −2ⁿ⁻¹ ≤ −9."}
4 bits reach only $-8$; 5 bits reach $-16$. So $n = 5$.
:::

:::step{why="Encode in 5 bits: invert and add 1."}
$+9 = 01001 \to 10110 \to 10111$.
:::

:::step{why="Decode to check, using the −16 weight."}
$-16 + 4 + 2 + 1 = -9$. ✓
:::

:::answer
$10111$ (5 bits).
:::
::::

::::example{#ex-enc-edge level="gate" title="Edge case: the most negative value" depth="standard"}
Write $-128$ in 8-bit 2's complement, and negate the result.

:::step{why="+128 does not fit in 8 bits (the maximum is +127), so use the weight directly: −128 is the sign weight alone."}
$-128 = 1000\,0000$.
:::

:::step{why="Negate by invert and add 1."}
$0111\,1111 + 1 = 1000\,0000$: the same pattern.
:::

:::answer
$1000\,0000$. Negating it gives itself, because $+128$ is outside the range.
:::
::::

:::definition{#min-width term="Choosing the width" depth="quick"}
The smallest $n$ that holds every integer in $[\,L, H\,]$ in 2's complement is the smallest $n$
with $-2^{n-1} \le L$ **and** $H \le 2^{n-1} - 1$. Note the asymmetry: $-16$ fits in 5 bits but
$+16$ needs 6. A question that asks for "the" 2's-complement pattern of a value without giving
a width means the minimum width.
:::

:::trap{#trap-fifteen title="Writing −15 as 1111 or 11111" depth="quick"}
$1111$ in 4 bits is $-1$, and $11111$ in 5 bits is also $-1$ (a run of leading 1s carries no
extra value). $-15$ needs 5 bits and is $10001$: copy the last 1 of $01111$, flip the rest.
:::

### Worked examples: decoding

::::example{#ex-dec-16 level="easy" title="A 16-bit negative pattern" depth="quick"}
What is $1111\,1111\,1110\,1001$ in 16-bit 2's complement?

:::step{why="The top bit is 1, so the value is negative; its size is the negation of the pattern."}
Negate: invert to $0000\,0000\,0001\,0110$, add 1: $0000\,0000\,0001\,0111 = 23$.
:::

:::step{why="Attach the minus sign."}
The value is $-23$. Check: as unsigned it is $65513 = 65536 - 23$. ✓
:::

:::answer
$-23$
:::
::::

::::example{#ex-dec-min level="medium" title="The pattern 1000 0000" depth="standard"}
What is $1000\,0000$ in 8-bit 2's complement?

:::step{why="Only the top bit is set, and its weight is −2⁷."}
$-128 + 0 = -128$.
:::

:::step{why="The invert-and-add-1 route gives 1000 0000 back, which as unsigned is 128; with the minus sign: −128."}
Both routes agree.
:::

:::answer
$-128$, the smallest 8-bit value.
:::
::::

::::example{#ex-dec-hex level="gate" title="A hex byte read as signed" depth="standard"}
A byte holds $(B4)_{16}$. What is its value as an 8-bit signed (2's complement) integer?

:::step{why="Expand the hex digits to bits."}
$B4 = 1011\,0100$.
:::

:::step{why="Top bit 1: either use the −128 weight or subtract 256 from the unsigned value."}
$-128 + 32 + 16 + 4 = -76$, or $180 - 256 = -76$.
:::

:::answer
$-76$
:::
::::

::::example{#ex-dec-three level="gate" title="Edge case: one pattern, three meanings" depth="standard"}
Read the 4-bit pattern $1011$ as sign-magnitude, 1's complement and 2's complement.

:::step{why="SM: the top bit is the sign, the rest is the size."}
Sign 1, size $011 = 3$: $-3$.
:::

:::step{why="1's complement: flip all bits to get the size."}
$\overline{1011} = 0100 = 4$: $-4$.
:::

:::step{why="2's complement: use the −8 weight."}
$-8 + 2 + 1 = -5$.
:::

:::answer
SM $-3$, 1's $-4$, 2's $-5$. The bits mean nothing until the encoding is fixed.
:::
::::

:::definition{#decode-twos term="Decoding 2's complement quickly" depth="quick"}
For a pattern with top bit 1, any of these gives the value:
1. weighted sum with $-2^{n-1}$ for the top bit;
2. (unsigned value) $- 2^n$;
3. negate (invert + 1, or copy to the first 1) and put a minus sign in front.

Leading 1s can be dropped down to one without changing the value: $1111\,1011 = 1011 = -5$.
:::

### Worked examples: ranges and counts

::::example{#ex-rng-8 level="easy" title="The 8-bit range" depth="quick"}
What range does 8-bit 2's complement cover?

:::step{why="Smallest: only the −2⁷ weight."}
$1000\,0000 = -128$.
:::

:::step{why="Largest: every positive weight."}
$0111\,1111 = 127$.
:::

:::answer
$-128$ to $+127$.
:::
::::

::::example{#ex-rng-count level="medium" title="Counting distinct values" depth="standard"}
How many distinct integers can 8-bit 2's complement, sign-magnitude and 1's complement each hold?

:::step{why="2's complement uses every one of the 2⁸ patterns for a different value."}
$256$.
:::

:::step{why="SM and 1's each spend two patterns on zero."}
$256 - 1 = 255$ each.
:::

:::answer
256, 255, 255. The difference between 2's complement and either of the others is always exactly 1.
:::
::::

::::example{#ex-rng-zero level="gate" title="Negative zero" depth="standard"}
Which 6-bit patterns mean "negative zero" in sign-magnitude and in 1's complement? Does 2's complement have one?

:::step{why="SM: sign bit 1 with a zero size field."}
$100000$.
:::

:::step{why="1's complement: −0 is 0 with every bit flipped."}
$111111$.
:::

:::step{why="2's complement: negating 0 gives 111111 + 1 = 1000000, and the 7th bit is dropped."}
$-0 = 000000 = +0$: only one zero.
:::

:::answer
SM $100000$; 1's $111111$; 2's complement has no negative zero.
:::
::::

::::example{#ex-rng-edge level="gate" title="Edge case: 1-bit 2's complement" depth="standard"}
What does a 1-bit 2's-complement number represent?

:::step{why="With n = 1 the only bit is the sign bit, weight −2⁰ = −1."}
$0 \to 0$ and $1 \to -1$.
:::

:::step{why="The formula must agree."}
$-2^{0} = -1$ to $2^0 - 1 = 0$. ✓
:::

:::answer
The range is $\{-1, 0\}$. A lone 1 bit is $-1$, which is why "all ones" is $-1$ at every width.
:::
::::

:::trap{#trap-range title="The range '−2^(n−1) to +2^(n−1)'" depth="quick"}
The negative side reaches $-2^{n-1}$ but the positive side stops at $2^{n-1} - 1$: zero takes one
of the non-negative patterns. GATE has offered "$-2^{n-1}$ to $2^{n-1}$" as a distractor more
than once.
:::

## Complements in any base

:::definition{#radix-complement term="Radix and diminished-radix complements" depth="quick"}
For an $n$-digit base-$r$ number $N$:

- **$(r-1)$'s complement** (diminished radix): $(r^n - 1) - N$. Digit by digit: replace each digit $d$ by $(r - 1) - d$. (1's in binary, 9's in decimal, 7's in octal, F's in hex.)
- **$r$'s complement** (radix): $r^n - N$, which is the $(r-1)$'s complement plus 1. (2's in binary, 10's in decimal, 8's, 16's.) Shortcut: copy trailing zeros, take $r - d$ for the first non-zero digit from the right, then $(r - 1) - d$ for the rest.
- **Subtraction with an adder:** $M - N = M + (r^n - N) - r^n$. Add the $r$'s complement and drop the carry out of $n$ digits (if there is no carry, the result is negative, in complement form).
- The $r$'s complement of 0 is $r^n$, which drops back to 0 in $n$ digits.
:::

### Worked examples: complements in other bases

::::example{#ex-rc-dec level="easy" title="10's complement, and subtraction with it" depth="quick"}
Find the 10's complement of $0371$ (4 digits), and use it to compute $7520 - 0371$.

:::step{why="9's complement first: each digit d becomes 9 − d."}
$0371 \to 9628$.
:::

:::step{why="10's complement = 9's complement + 1."}
$9628 + 1 = 9629$. (Check: $10000 - 371 = 9629$.)
:::

:::step{why="M − N = M + (10⁴ − N) − 10⁴: add, then drop the carry out of 4 digits."}
$7520 + 9629 = 17149 \to 7149$. Indeed $7520 - 371 = 7149$.
:::

:::answer
$9629$; $7520 - 0371 = 7149$.
:::
::::

::::example{#ex-rc-oct level="medium" title="7's and 8's complement in octal" depth="standard"}
Find the 7's and 8's complements of $(1234)_8$.

:::step{why="7's complement: each digit d becomes 7 − d."}
$1234 \to 6543$.
:::

:::step{why="8's complement: add 1 (in base 8)."}
$6543 + 1 = (6544)_8$.
:::

:::step{why="Check: N + its 8's complement must be 8⁴ = (10000)₈."}
$(1234)_8 + (6544)_8 = (10000)_8$. ✓
:::

:::answer
7's: $(6543)_8$; 8's: $(6544)_8$.
:::
::::

::::example{#ex-rc-hex level="gate" title="A negative number as three hex digits" depth="standard"}
Write $-300$ in 12-bit 2's complement, as three hex digits.

:::step{why="12 bits are exactly 3 hex digits, and the 2's complement in 12 bits is the 16's complement in 3 hex digits."}
$300 = (12C)_{16}$.
:::

:::step{why="F's complement digit by digit: 15 − d."}
$FFF - 12C = ED3$.
:::

:::step{why="Add 1 to get the 16's complement."}
$ED3 + 1 = (ED4)_{16}$. Check: $16^3 - 300 = 4096 - 300 = 3796 = (ED4)_{16}$.
:::

:::answer
$(ED4)_{16} = 1110\,1101\,0100$
:::
::::

::::example{#ex-rc-edge level="gate" title="Edge case: the complement of zero" depth="standard"}
What is the 10's complement of $0000$, and why does it matter?

:::step{why="Apply the rule literally."}
9's complement $9999$, plus 1 is $10000$.
:::

:::step{why="In 4 digits the leading 1 is a carry out and is dropped."}
$0000$.
:::

:::answer
$0000$: the radix complement has one zero, while the diminished complement maps $0000$ to $9999$, a second "zero". Exactly the 2's vs 1's story in base 10.
:::
::::

:::trick{#trick-hex-complement title="16's complement without binary" depth="standard"}
For a hex pattern, $-N$ in $4k$ bits is $(F\dots F - N) + 1$, done digit by digit as $15 - d$
then $+1$. **Why it works:** $16^k = 2^{4k}$, so the 16's complement in $k$ digits *is* the 2's
complement in $4k$ bits. **When it fails:** when the width is not a multiple of 4 bits; then
work in binary.
:::

:::note{#recap-radix title="Recap" depth="quick"}
$(r-1)$'s complement: digit-wise $(r-1) - d$. $r$'s complement: that plus 1, or $r^n - N$.
Subtract by adding the $r$'s complement and dropping the carry.
:::

## Changing the width: sign extension

:::theorem{#sign-extension name="Sign extension preserves the value" depth="quick"}
To widen an $n$-bit 2's-complement number to $m > n$ bits, **copy the sign bit** into all
$m - n$ new places on the left. The value does not change. (Unsigned numbers are widened with
zeros; sign-magnitude moves the sign bit to the new top and fills zeros after it.)
:::

:::proof{#proof-sign-extension of="sign extension" depth="deep"}
**Idea first:** a 1 in the old sign place weighed $-2^{n-1}$; after one extension it weighs
$+2^{n-1}$ and the new sign bit weighs $-2^{n}$, and $-2^n + 2^{n-1} = -2^{n-1}$.

If the sign bit is 0, adding zeros adds nothing. If it is 1, extending by one bit changes the
weights at the top from $(-2^{n-1})$ to $(-2^{n} + 2^{n-1}) = -2^{n-1}$: the same total. Repeat
one bit at a time to reach any width.
:::

:::viz{#stretch spec="sign-extension-stretch" mode="animate" depth="standard"}
:::

:::trap{#trap-zero-pad title="Padding a negative number with zeros" depth="quick"}
$-6 = 1010$ in 4 bits. Widened with zeros it becomes $0000\,1010 = +10$; inserting zeros after
the sign bit, $1000\,1010$, gives $-118$. Only $1111\,1010$ is $-6$. Sign extension is a step in
converting a signed integer to a wider size; it is not a shift and not part of addition itself.
:::

## Arithmetic shifts

:::derivation{#arithmetic-shift of="what shifts do to a 2's-complement value" depth="quick"}
**Arithmetic shift right by 1:** move every bit right, drop the last bit, and **copy the sign bit**
into the top. The result is $\lfloor x / 2 \rfloor$, rounding towards $-\infty$ (so $-7 \to -4$).
Reason: dropping bit $b_0$ removes $b_0$ and halves the rest, and copying the sign keeps the
negative weight at $-2^{n-1}$ (as in sign extension).

**Shift left by 1:** move every bit left, insert 0 at the right. As unsigned arithmetic this is
$2x \bmod 2^n$. The signed value is exactly $2x$ **if and only if** the top two bits were equal
($b_{n-1} = b_{n-2}$); otherwise the new sign bit differs from the old one and the result has
overflowed. Shifting left by $k$ is exact when the top $k + 1$ bits are all equal.

**Logical shift right** inserts 0 at the top; it divides only unsigned numbers by 2.

**Sanity check.** $-7 = 1111\,1001$: arithmetic right gives $1111\,1100 = -4 = \lfloor -3.5 \rfloor$;
left gives $1111\,0010 = -14$. ✓
:::

:::viz{#shift spec="arithmetic-shift" mode="animate" depth="standard"}
:::

### Worked examples: sign extension and shifts

::::example{#ex-se-basic level="easy" title="Widening a negative and a positive number" depth="quick"}
Widen the 4-bit 2's-complement numbers $1101$ and $0101$ to 8 bits.

:::step{why="Copy the sign bit into the new places."}
$1101 \to 1111\,1101$ and $0101 \to 0000\,0101$.
:::

:::step{why="Check the values."}
$1101 = -8 + 4 + 1 = -3$ and $1111\,1101 = -128 + 125 = -3$; $0101 = 0000\,0101 = 5$.
:::

:::answer
$1111\,1101$ ($-3$) and $0000\,0101$ ($+5$).
:::
::::

::::example{#ex-se-mul4 level="medium" title="Multiplying by 4 with a shift" depth="standard"}
$P$ is a 16-bit 2's-complement number with pattern $(FFD3)_{16}$. Find the pattern of $4P$.

:::step{why="Decode P first."}
$FFD3 = 1111\,1111\,1101\,0011 = -45$.
:::

:::step{why="Multiplying by 4 = 2² is a left shift by 2; it is exact when the top three bits are equal (they are 111)."}
Shift left by 2: $1111\,1111\,0100\,1100 = (FF4C)_{16}$.
:::

:::step{why="Check the value."}
$(FF4C)_{16} - 65536 = 65356 - 65536 = -180 = 4 \times (-45)$. ✓
:::

:::answer
$(FF4C)_{16}$
:::
::::

::::example{#ex-se-asr level="gate" title="Shifting a negative number right" depth="standard"}
What does an arithmetic right shift by 1 do to $-7$ in 8 bits?

:::step{why="Encode −7."}
$-7 = 1111\,1001$.
:::

:::step{why="Move right, copy the sign bit into the top."}
$1111\,1100$.
:::

:::step{why="Decode."}
$-128 + 124 = -4$.
:::

:::answer
$-4$, not $-3$: an arithmetic right shift rounds towards $-\infty$.
:::
::::

::::example{#ex-se-edge level="gate" title="Edge case: a left shift that overflows" depth="standard"}
Shift the 4-bit number $0100$ left by 1.

:::step{why="0100 is +4; doubling should give +8."}
$0100 \to 1000$.
:::

:::step{why="+8 is outside −8 … +7; the result decodes to −8."}
$1000 = -8$. The top two bits of $0100$ were $01$, unequal, which predicts the overflow.
:::

:::answer
$1000 = -8$: overflow. Left shifts are exact only when the top two bits are equal.
:::
::::

:::trap{#trap-shift-round title="Expecting an arithmetic right shift to round towards zero" depth="standard"}
Integer division in many languages truncates towards zero ($-7 / 2 = -3$), but an arithmetic
right shift gives $\lfloor -3.5 \rfloor = -4$. Options built on $-3$ are wrong for a shift.
:::

### Worked examples: putting it together

::::example{#ex-mix-div level="easy" title="Divisibility in 2's complement" depth="quick"}
Which of the 8-bit patterns $1111\,0111$, $1111\,0110$, $1111\,1011$ is a multiple of $1111\,1101$?

:::step{why="Decode everything first; divisibility is about values, not bit patterns."}
$1111\,1101 = -3$; the candidates are $-9$, $-10$, $-5$.
:::

:::step{why="Test each value."}
$-9 = 3 \times (-3)$ ✓; $-10$ and $-5$ are not multiples of 3.
:::

:::answer
$1111\,0111$ ($-9$).
:::
::::

::::example{#ex-mix-routine level="medium" title="A conversion routine for negative inputs" depth="standard"}
A routine prints the 8-bit 2's-complement pattern of an integer $N$ in $[-128, 127]$ by repeated division by 2. What must it do first when $N < 0$, and what does it print for $N = -100$?

:::step{why="The pattern of a negative N is the unsigned number 2⁸ + N, so convert that instead."}
Replace $N$ by $N + 256$: $-100 + 256 = 156$.
:::

:::step{why="Now ordinary repeated division by 2 gives the bits."}
$156 = (1001\,1100)_2$.
:::

:::answer
Add $2^8 = 256$ first; $-100 \to 1001\,1100$.
:::
::::

::::example{#ex-mix-width level="gate" title="Minimum widths are not symmetric" depth="standard"}
Find the minimum 2's-complement width for $-64$ and for $+64$.

:::step{why="−64 = −2⁶ is the smallest value of 7-bit 2's complement."}
$-64 = 100\,0000$ in 7 bits.
:::

:::step{why="+64 exceeds the 7-bit maximum +63, so it needs 8 bits."}
$+64 = 0100\,0000$ in 8 bits.
:::

:::answer
7 bits for $-64$, 8 bits for $+64$.
:::
::::

::::example{#ex-mix-edge level="gate" title="Edge case: −128 divided by −1" depth="standard"}
In 8-bit 2's complement, what goes wrong with $(-128) \div (-1)$?

:::step{why="The true answer is +128."}
$+128 > 127$, outside the 8-bit range.
:::

:::step{why="Negation of −128 by invert and add 1 returns 1000 0000 again."}
The result pattern is $1000\,0000 = -128$: overflow (many processors raise an exception here).
:::

:::answer
It overflows; $-2^{n-1}$ is the one value whose negation does not fit.
:::
::::

## A first look at overflow

:::viz{#overflow spec="overflow-wheel" mode="animate" depth="standard"}
:::

:::aside{#overflow-preview title="Overflow, in one paragraph" depth="standard"}
A 2's-complement sum overflows exactly when two operands of the **same sign** give a result of
the other sign: on the wheel, the sum crosses the $+7/-8$ seam. Operands of opposite signs never
overflow in addition. (For subtraction $A - B = A + (-B)$, so it is the opposite-sign pairs that
can overflow.) A carry out of the top bit alone is **not** overflow for signed numbers. Chapter 5
builds the detector.
:::

## Biased (excess-K) codes

:::definition{#biased term="Excess-K (biased) representation" depth="quick"}
Store the value $v$ as the unsigned pattern of $v + K$, so that **value = pattern − K**. With $n$
bits and $K = 2^{n-1}$ the range is $-2^{n-1}$ to $2^{n-1} - 1$, the same as 2's complement, and
the code is just 2's complement with the top bit flipped. Its advantage is that bigger values
have bigger unsigned patterns, so comparison is plain unsigned comparison.
Examples: excess-8 in 4 bits, $1011 = 11 - 8 = 3$ and $0000 = -8$; IEEE-754 single precision
stores the exponent in excess-127, so $1000\,0010 = 130 - 127 = 3$ (Chapter 8).
:::

## All the representations side by side

:::table{#compare-representations title="Comparing the four encodings (n bits)" depth="quick"}
| Property | Unsigned | Sign-magnitude | 1's complement | 2's complement |
|:--|:--|:--|:--|:--|
| Range | $0 \dots 2^n - 1$ | $\pm(2^{n-1} - 1)$ | $\pm(2^{n-1} - 1)$ | $-2^{n-1} \dots 2^{n-1} - 1$ |
| Zeros | one | two ($0\dots0$, $10\dots0$) | two ($0\dots0$, $1\dots1$) | one |
| Distinct values | $2^n$ | $2^n - 1$ | $2^n - 1$ | $2^n$ |
| Negate | — | flip the sign bit | flip every bit | flip every bit, add 1 |
| Add | plain | compare signs, add or subtract sizes | add, then end-around carry | plain (drop the carry) |
| Widen | pad 0s | sign to the top, 0s after it | copy the sign bit | copy the sign bit |
| Top bit | weight $2^{n-1}$ | sign flag | weight $-(2^{n-1} - 1)$ | weight $-2^{n-1}$ |
:::

## GATE questions on this lesson

All sixteen previous-year questions for this lesson, from the easiest to the hardest.

:::pyq{id="cse-2000-a-1-6" tests="twos-complement,unsigned-range" depth="standard"}
:::

:::pyq{id="cse-2002-a-16" tests="sign-extension,trap-zero-pad" depth="standard"}
:::

:::pyq{id="cse-1999-a-42" tests="sign-magnitude,ones-complement,compare-representations" depth="standard"}
:::

:::pyq{id="cse-2013-cs-4" tests="twos-complement,ranges" depth="standard"}
:::

:::pyq{id="cse-1994-a-2-7" tests="twos-complement,ranges,trap-range" depth="standard"}
:::

:::pyq{id="cse-2005-cs-16" tests="twos-complement,ranges,trap-range" depth="standard"}
:::

:::pyq{id="cse-2019-cs-4" tests="copy-first-one,negation,twos-complement" depth="standard"}
:::

:::pyq{id="cse-2016-1-cs-7" tests="decode-twos,negation" depth="standard"}
:::

:::pyq{id="cse-2002-a-15" tests="min-width,copy-first-one,trap-fifteen" depth="standard"}
:::

:::pyq{id="cse-1998-a-17" tests="decode-twos,twos-complement" depth="standard"}
:::

:::pyq{id="cse-2025-1-cs-15" tests="sign-extension,trap-zero-pad" depth="standard"}
:::

:::pyq{id="cse-2016-2-cs-9" tests="ranges,compare-representations,sign-magnitude" depth="standard"}
:::

:::pyq{id="cse-2001-a-35" tests="radix-complement,trick-hex-complement" depth="standard"}
:::

:::pyq{id="cse-2010-cs-8" tests="arithmetic-shift,decode-twos" depth="standard"}
:::

:::pyq{id="cse-2003-cs-9" tests="decode-twos" depth="standard"}
:::

:::pyq{id="cse-1995-b-66" tests="twos-value,twos-complement,ex-mix-routine" depth="standard"}
:::

## Practice

:::practice{id="nx-dl-01-04-q01" depth="standard"}
:::

:::practice{id="nx-dl-01-04-q02" depth="standard"}
:::

:::practice{id="nx-dl-01-04-q03" depth="standard"}
:::

:::practice{id="nx-dl-01-04-q04" depth="standard"}
:::

:::practice{id="nx-dl-01-04-q05" depth="standard"}
:::

:::practice{id="nx-dl-01-04-q06" depth="standard"}
:::

:::practice{id="nx-dl-01-04-q07" depth="standard"}
:::

:::practice{id="nx-dl-01-04-q08" depth="standard"}
:::

:::practice{id="nx-dl-01-04-q09" depth="standard"}
:::

:::practice{id="nx-dl-01-04-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Signed numbers on one card" depth="quick"}
| Idea | Formula or rule |
|:--|:--|
| 2's-complement value | $-b_{n-1}2^{n-1} + \sum_{i<n-1} b_i 2^i$; or unsigned $- 2^n$ when the top bit is 1 |
| 2's range | $-2^{n-1} \dots 2^{n-1} - 1$; $2^n$ values; one zero |
| SM and 1's range | $-(2^{n-1} - 1) \dots 2^{n-1} - 1$; $2^n - 1$ values; two zeros |
| Negate (2's) | invert + 1, or copy up to the first 1 from the right and flip the rest |
| Negative pattern | $2^n - x$ (2's), $2^n - 1 - x$ (1's) |
| $r$'s / $(r-1)$'s complement | $r^n - N$ / $r^n - 1 - N$ (digit-wise $r - 1 - d$) |
| Minimum width | smallest $n$ with $-2^{n-1} \le L$ and $H \le 2^{n-1} - 1$ |
| Sign extension | copy the sign bit; value unchanged |
| Arithmetic right shift | $\lfloor x/2 \rfloor$ (towards $-\infty$) |
| Left shift | $\times 2$, exact iff the top two bits are equal |
| Excess-$K$ | value = pattern $- K$ |
| Overflow (addition) | only same-sign operands; the sum's sign differs |
:::

:::note{#further-depth title="Further depth: why 2's complement is a ring" depth="deep"}
The $n$-bit patterns with addition and multiplication mod $2^n$ form the ring
$\mathbb{Z}/2^n\mathbb{Z}$. Unsigned and 2's-complement are two choices of representatives for the
same residue classes ($0 \dots 2^n - 1$ versus $-2^{n-1} \dots 2^{n-1} - 1$), so one adder and one
(low-half) multiplier serve both. Only operations that look at the size of a result, such as
comparison, division, right shifts and overflow detection, need to know which reading is meant;
that is why instruction sets have separate signed and unsigned compares and shifts.
:::
