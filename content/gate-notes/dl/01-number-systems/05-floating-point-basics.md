---
id: floating-point-basics
subject: dl
chapter: number-systems
title: "Floating point: normalisation, biased exponents and range"
order: 5
prerequisites: [fractions-fixed-point, signed-numbers]
pyq_topics: [dl/floating]
est_minutes: 55
difficulty: core
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every value is checked by content/gate-notes/_checks/dl/l05_fp_basics.py (exact arithmetic in fplib.py)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 21–23, set B pp. 150–152. The bias-convention disagreement (B 151 vs B 152) is recorded in _errata/dl.md X1."
  - "Facts checked against standard textbooks: M. Morris Mano, Computer System Architecture (floating-point representation); D. Goldberg, What Every Computer Scientist Should Know About Floating-Point Arithmetic (1991), §1 (formats, ulp, wobble)."
  - "PYQs: src/gate/questions.json (dl/floating), keys re-derived in l05_fp_basics.py."
updated: "2026-10-17"
---

Fixed point (Lesson 3) puts the binary point in one place for ever. That is fine for money and
for counters, but it cannot hold the mass of an electron and the mass of the Sun in the same
32 bits. **Floating point** lets the point move: a number is stored as a sign, a handful of
significant bits and an exponent that says where the point goes. In this lesson you learn why
that trade is worth making, what "normalised" means, why the exponent is stored with a **bias**,
how to encode and decode the custom formats GATE invents, and how to work out the largest value,
the smallest value and the gap between neighbouring numbers of any format. The next lesson
applies all of it to the one format that matters most, IEEE-754.

## Where this fits

You need two earlier ideas. Binary fractions and the "is it exactly representable?" question come
from [Lesson 3](lesson:fractions-fixed-point), and the excess-K code for the exponent comes from
the end of [Lesson 4](lesson:signed-numbers#biased). This lesson builds the general machine;
[Lesson 6](lesson:ieee-754) fixes the field widths to IEEE-754 single and double precision and
adds the special values; [Lesson 7](lesson:floating-point-arithmetic) adds, multiplies and rounds.

:::table{#radar title="GATE radar: floating-point formats" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 7 (1996–2005), all on formats the question defines itself |
| Marks | 1 one-mark, 4 two-mark, 2 descriptive (old papers) |
| Formats | 3 MCQ, 4 descriptive (encode a value, find the largest value) |
| Pattern 1 | Encode a decimal value in a given format and write the word in hex: 1997, 2002, 2005 |
| Pattern 2 | The range of a format: magnitude of normalised mantissas (1996), largest value (2002) |
| Pattern 3 | The gap between neighbouring values of a format (2003) |
| What examiners test | Which normalisation convention (0.1… or 1.…), which exponent code (bias, 2's complement, sign-magnitude), base 2 or 16, and the order of the fields in the word |
:::

## Why floating point: range against precision

:::intuition{#why-float title="A ruler against a zoom lens" depth="standard"}
A fixed-point format is a ruler: its tick marks are equally spaced, say every $2^{-16}$, from 0 up
to its largest value. Equal spacing sounds fair, but it is not. Near 30 000 a tick every $2^{-16}$
is absurdly fine; near 0.0001 the same tick is a coarse 15 % of the value. And anything beyond
the end of the ruler simply does not exist.

Scientists solved this long ago with **scientific notation**: write $6.02 \times 10^{23}$ or
$9.11 \times 10^{-31}$, keep a fixed number of significant digits, and let the exponent carry the
size. The *relative* accuracy is then the same everywhere. A floating-point format is scientific
notation in base 2 (occasionally base 16), squeezed into a fixed number of bits: the ticks are
dense near zero and sparse far away, like a zoom lens that keeps the same number of pixels on
whatever it is pointed at.
:::

:::definition{#fp-def term="Floating-point number" depth="quick"}
A floating-point format stores a real number as three fields,

$$
x = (-1)^{s} \times M \times \beta^{E},
$$

- $s$, the **sign** bit (0 for positive, 1 for negative);
- $M$, the **significand**, also called the **mantissa**: the significant digits, stored with a
  fixed number of bits;
- $E$, the **exponent**, an integer stored in its own field (usually in a biased code, see below);
- $\beta$, the **base** of the exponent, fixed by the format: 2 in almost every format, 16 in some
  older ones (IBM System/360, GATE 2002).

Most formats store the sign as a separate bit, so the significand is in **sign-magnitude** form,
whatever code the exponent uses.
:::

The number of bits for $M$ decides the **precision** (how many significant digits survive), and
the number of bits for $E$ decides the **range** (how far from 1 the values can go). With a fixed
word size, every bit given to one is taken from the other.

:::derivation{#fixed-vs-float of="what 32 bits buy as fixed point and as floating point" depth="standard"}
**Fixed point, 16 integer and 16 fraction bits (unsigned).** From Lesson 3 the range is
$[0,\ 2^{16} - 2^{-16}]$ and every gap is $2^{-16} \approx 1.5 \times 10^{-5}$. The ratio of the
largest to the smallest positive value is about $2^{16} / 2^{-16} = 2^{32} \approx 4.3 \times 10^9$.
The **relative** error of storing $x$ (rounding to the nearest tick) is at most
$\tfrac12 \cdot 2^{-16} / x$: tiny for large $x$, huge for small $x$.

**Floating point, 1 sign, 8 exponent and 23 fraction bits (IEEE single, Lesson 6).** The
exponents run from $-126$ to $127$, so normal values run from $2^{-126}$ to almost $2^{128}$,
a ratio of about $2^{254} \approx 10^{76}$. Every value carries 24 significant bits, so the
relative rounding error is at most $2^{-24} \approx 6 \times 10^{-8}$ at **every** size.

**Sanity check.** Both formats have exactly $2^{32}$ bit patterns, so floating point does not
hold *more* numbers. It spreads the same number of patterns over a far wider range, densely near
zero and sparsely far away.
:::

### Worked examples: fixed point against floating point

::::example{#ex-why-16bit level="easy" title="Two 16-bit formats side by side" depth="quick"}
Compare an unsigned 16-bit fixed-point format with 8 fraction bits against a 16-bit floating-point
format whose largest value is 65504 and whose smallest positive normal value is $2^{-14}$.

:::step{why="For fixed point the largest value is the all-ones pattern, one step below 2 to the integer width (Lesson 3)."}
Fixed point: 8 integer bits, so the largest value is $2^8 - 2^{-8} = 255.99609375$ and every gap is
$2^{-8} = 0.00390625$.
:::

:::step{why="Range is best compared as the ratio of the largest to the smallest positive value."}
Fixed point: $\dfrac{255.996}{0.0039} \approx 6.6 \times 10^4$. Floating point:
$\dfrac{65504}{2^{-14}} = 65504 \times 16384 \approx 1.1 \times 10^9$.
:::

:::step{why="Precision near small values is where fixed point suffers: the gap is the same everywhere."}
Near $0.01$ the fixed-point gap $0.0039$ is about 39 % of the value. The floating-point format
keeps 11 significant bits everywhere, so its gap near 0.01 is about $0.01 \times 2^{-10}
\approx 10^{-5}$.
:::

:::answer
Same 16 bits, but floating point covers about 16 000 times the range and keeps its relative
precision at small values; fixed point has finer *absolute* steps only near its top end.
:::
::::

::::example{#ex-why-0001 level="medium" title="Storing 0.001 both ways" depth="standard"}
Store $0.001$ in unsigned Q16.16 fixed point (16 fraction bits) and in IEEE single precision
(24 significant bits), rounding to the nearest value. Compare the relative errors.

:::step{why="A fixed-point value is an integer count of 2^-16 steps, so scale and round."}
$0.001 \times 2^{16} = 65.536$, which rounds to $66$. The stored value is
$66 / 65536 = 0.001007080078125$.
:::

:::step{why="Relative error = (stored − true) / true; it is the honest measure of precision."}
Relative error $= \dfrac{0.001007080078125 - 0.001}{0.001} \approx 0.708\,\%$.
:::

:::step{why="A float keeps 24 significant bits wherever the point is, so its relative error is at most 2^-24."}
In single precision $0.001$ becomes $0.0010000000474974513\ldots$ (the pattern `0x3A83126F`, decoded
in Lesson 6). Relative error $\approx 4.7 \times 10^{-8}$, below the bound
$2^{-24} \approx 6.0 \times 10^{-8}$.
:::

:::answer
Fixed point: about 0.7 % error; floating point: about $5 \times 10^{-6}$ %. The float is roughly
150 000 times more accurate at this size, with the same 32 bits.
:::
::::

::::example{#ex-why-design level="gate" title="Design the smallest format for a sensor" depth="standard"}
A sensor reports values from $10^{-6}$ to $10^{6}$ (positive only), and each value must be stored
with a relative error of at most 0.1 %. How many bits does fixed point need, and how many does a
binary floating-point format with a hidden bit need?

:::step{why="Rounding to the nearest step errs by at most half a step, and at the smallest value that half step must be at most 0.1 % of 10^-6, i.e. 10^-9."}
Fixed point: we need $\tfrac12 \cdot 2^{-f} = 2^{-f-1} \le 10^{-9}$, so $f = 29$
($2^{-30} \approx 9.3 \times 10^{-10}$). The integer part must reach $10^6$, so $i = 20$
($2^{20} = 1\,048\,576$). Total $20 + 29 = 49$ bits.
:::

:::step{why="Rounding to p significant bits errs by at most half an ulp, which is at most 2^-p of the value, so 2^-p ≤ 10^-3 fixes p."}
Floating point: $2^{-10} \approx 0.00098 \le 0.001$, so $p = 10$ significant bits, that is 9 stored
fraction bits plus the hidden 1.
:::

:::step{why="The exponent field must cover every binade between the smallest and largest value."}
$10^{-6} \ge 2^{-20}$ and $10^6 < 2^{20}$, so the exponent must run over $-20 \dots 19$: 40 values,
which needs a 6-bit exponent field.
:::

:::answer
Fixed point needs 49 bits; the float needs $6 + 9 = 15$ bits (16 with a sign bit). Range costs
the fixed-point format dearly; the float pays for range with a few exponent bits.
:::
::::

::::example{#ex-why-count level="gate" title="Edge case: floats do not have more numbers" depth="standard"}
How many single-precision values (24 significant bits, Lesson 6) lie in $[1, 2)$, and how many
in $[2^{100}, 2^{101})$? What does that say about where floats are dense?

:::step{why="Inside one binade [2^E, 2^(E+1)) the exponent is fixed and only the 23 fraction bits vary."}
In $[1, 2)$ the values are $1.f$ for the $2^{23}$ possible fraction fields: $2^{23} = 8\,388\,608$ values.
:::

:::step{why="The same 2^23 fraction fields are reused with a larger exponent."}
In $[2^{100}, 2^{101})$ there are also exactly $2^{23}$ values, but the interval is $2^{100}$ times
longer, so the gaps are $2^{100}$ times wider.
:::

:::answer
$2^{23}$ in each. Every binade holds the same count, so floats are dense near zero and sparse far
away; the total is still at most $2^{32}$ patterns.
:::
::::

:::trap{#trap-decimal-point title="A decimal point does not make a number floating point" depth="quick"}
"14.135 has a point, so it is floating point" is wrong (one reference set says it). Floating point
means a stored **exponent** that moves the point. A value such as 14.135 can be held in fixed point
just as well; 1.4135 × 10¹ is its floating-point *form*.
:::

:::note{#recap-why title="Recap" depth="quick"}
Floating point = sign, significand, exponent: $(-1)^s M \beta^E$. Significand bits buy precision,
exponent bits buy range. Fixed point has equal gaps; floating point has equal *relative* gaps,
the same count of values in every binade.
:::

## Normalisation: one spelling for each number

:::intuition{#normal-intuition title="Why insist on one spelling?" depth="standard"}
$6.02 \times 10^{23}$, $60.2 \times 10^{22}$ and $0.0602 \times 10^{25}$ are the same number. If a
format allowed all three, it would waste patterns on duplicates, and worse, the third spelling
keeps fewer significant digits in the same space (the leading zeros use up digit positions). So
every format fixes **where the first non-zero digit sits**. Shifting the significand one place left
and lowering the exponent by one keeps the value, so any number can be brought to that spelling.
:::

:::definition{#normalisation term="Normalised significand: the two conventions" depth="quick"}
A non-zero significand is **normalised** when its first digit is non-zero. Formats use one of two
conventions, and a question always says (or implies) which:

| Convention | Form (base 2) | Range of $M$ | Used by |
|:--|:--|:--|:--|
| Fraction form, explicit leading 1 | $0.1b_2b_3\ldots$ | $\tfrac12 \le M < 1$ | GATE 1996, 1997; many textbooks |
| Hidden-bit form | $1.b_1b_2\ldots$ | $1 \le M < 2$ | IEEE-754; GATE 2003, 2005(b) |

In **base 16** the rule is about the first **hex digit**: $M = 0.h_1h_2\ldots$ with $h_1 \ne 0$, so
$\tfrac{1}{16} \le M < 1$. Up to three leading **bits** may then be zero (for $h_1 = 1$, the bits
start $0001$).
:::

:::derivation{#normalise-procedure of="normalising: shift the significand, correct the exponent" depth="quick"}
Multiplying the significand by $2$ and dividing the power of two by $2$ changes nothing:

$$
M \times 2^{E} = (M \times 2^{k}) \times 2^{E-k}.
$$

So shifting the significand **left** by $k$ places (multiplying by $2^k$) must **lower** the
exponent by $k$, and a right shift by $k$ raises it by $k$. Normalising is: shift until the first
1 is where the convention wants it, and correct the exponent by the shift count. In base 16 a shift
is by one hex digit (four bits) and changes the exponent by 1.

**Sanity check.** $0.0011 \times 2^{5} = 0.1875 \times 32 = 6$. Shift left by 2:
$0.11 \times 2^{3} = 0.75 \times 8 = 6$. Shift left by 3: $1.1 \times 2^{2} = 1.5 \times 4 = 6$.
:::

:::viz{#normalise-viz spec="normalise-shift" mode="animate" depth="standard"}
:::

:::definition{#hidden-bit term="The hidden (implicit) bit" depth="quick"}
In the $1.b_1b_2\ldots$ form the bit before the point is **always 1** for a normalised binary
number, so storing it would waste a bit. Hidden-bit formats store only the **fraction** $b_1b_2\ldots$
and the hardware puts the 1 back when it decodes:

$$
x = (-1)^s \times 1.f \times 2^{E}.
$$

The price: zero has no first 1, so it cannot be written in this form. Such formats reserve a
pattern for zero (IEEE uses the all-zero exponent field, [Lesson 6](lesson:ieee-754)), and GATE
2003 reserved the all-ones exponent instead. A hidden bit only works in base 2; in base 16 the first
hex digit can be anything from 1 to F.
:::

:::derivation{#precision-bits of="significant bits from the stored fraction bits" depth="standard"}
If the significand field has $f$ bits:

- **Hidden-bit form:** the value has $p = f + 1$ significant bits (the hidden 1 plus $f$ stored bits).
- **Fraction form (explicit 1):** the value has $p = f$ significant bits, and the first of them is
  always 1, so it carries no information.
- **Base-16 fraction form with $d$ hex digits:** $4d$ bits are stored, but the first hex digit may
  start with up to three 0 bits, so the guaranteed precision is only $4d - 3$ bits.

**Sanity check.** IEEE single stores $f = 23$ bits and has $p = 24$ significant bits; GATE 2002's
24-bit base-16 fraction (6 hex digits) guarantees only $24 - 3 = 21$ bits.
:::

### Worked examples: normalising

::::example{#ex-norm-easy level="easy" title="A whole number with a fraction part" depth="quick"}
Normalise $13.25$ in both conventions.

:::step{why="Convert to binary first: the integer part by division, the fraction part by doubling (Lessons 1 and 3)."}
$13 = 1101_2$ and $0.25 = 0.01_2$, so $13.25 = 1101.01_2$.
:::

:::step{why="Hidden-bit form puts the point just after the first 1: move it 3 places left, so the exponent is +3."}
$1101.01 = 1.10101 \times 2^{3}$.
:::

:::step{why="Fraction form puts the point just before the first 1: one more place left, one more on the exponent."}
$1101.01 = 0.110101 \times 2^{4}$.
:::

:::answer
$13.25 = 1.10101_2 \times 2^3 = 0.110101_2 \times 2^4$. Check: $1.65625 \times 8 = 13.25$ and
$0.828125 \times 16 = 13.25$.
:::
::::

::::example{#ex-norm-small level="medium" title="A small number: the exponent goes negative" depth="standard"}
Normalise $0.078125$ in both conventions.

:::step{why="Repeated doubling gives the fraction bits; 0.078125 = 5/64, so it terminates after 6 bits."}
$0.078125 = 0.000101_2$.
:::

:::step{why="The first 1 is in the 4th place after the point; moving the point right 4 places is a left shift of the significand, so the exponent drops by 4."}
Hidden-bit form: $0.000101 = 1.01 \times 2^{-4}$.
:::

:::step{why="Fraction form needs the point just before the first 1: a shift of 3, so the exponent is −3."}
Fraction form: $0.000101 = 0.101 \times 2^{-3}$.
:::

:::answer
$1.01_2 \times 2^{-4} = 0.101_2 \times 2^{-3}$. Check: $1.25/16 = 0.078125$ and $0.625/8 = 0.078125$.
:::
::::

::::example{#ex-norm-gate level="gate" title="Normalise and truncate into a short mantissa" depth="standard"}
A format stores $f$ as a 6-bit sign-magnitude fraction (1 sign bit, 5 magnitude bits, normalised
as $0.1\ldots$) and $e$ as a 4-bit sign-magnitude exponent, with $n = f \cdot 2^e$. Represent
$22.375$, truncating extra mantissa bits, and give the value actually stored.

:::step{why="Binary first: 22 = 10110 and 0.375 = 0.011."}
$22.375 = 10110.011_2$.
:::

:::step{why="Fraction form: the point goes just before the first 1, five places to the left, so e = 5."}
$10110.011 = 0.10110011 \times 2^{5}$.
:::

:::step{why="Only 5 magnitude bits fit; truncation simply drops the rest."}
Mantissa magnitude $10110$ (dropped: $011$). So $f = 0\ 10110$ and $e = 0\ 101$ (sign 0, magnitude 5).
:::

:::step{why="Decode what was stored to see what truncation cost."}
Stored value $0.10110_2 \times 2^5 = \tfrac{22}{32} \times 32 = 22$, an error of $0.375$.
:::

:::answer
$f = 0\,10110$, $e = 0\,101$, stored value $22$ (not $22.375$).
:::
::::

::::example{#ex-norm-hex level="gate" title="Edge case: normalising in base 16" depth="standard"}
Normalise $0.078125$ and $0.015625$ for a base-16 format whose mantissa is a fraction $0.h_1h_2\ldots$
with $h_1 \ne 0$.

:::step{why="Group the binary fraction into 4-bit hex digits from the point (Lesson 2)."}
$0.078125 = 0.0001\,0100_2 = 0.14_{16}$. The first hex digit is 1, which is non-zero.
:::

:::step{why="In base 16 only whole hex digits count, so three leading zero bits are allowed."}
So $0.078125 = 0.14_{16} \times 16^{0}$ is already normalised, although its bits start $0.0001$.
:::

:::step{why="1/64 = 0.0000 0100 in binary: the first hex digit is 0, so shift one hex digit (4 bits) and lower the exponent by 1."}
$0.015625 = 0.04_{16} = 0.4_{16} \times 16^{-1}$.
:::

:::answer
$0.14_{16} \times 16^0$ and $0.4_{16} \times 16^{-1}$. In base 16, normalised means "first hex digit
non-zero", never "first bit 1".
:::
::::

:::trap{#trap-convention title="Using the wrong normalisation convention" depth="quick"}
If the question says "the mantissa is a fraction" (with no hidden bit), the first stored bit is the
leading 1 and the exponent is one more than in the hidden-bit form. Writing $1.1101 \times 2^{3}$
when the format wants $0.11101 \times 2^{4}$ gives an exponent that is off by one, and examiners put
exactly that pattern among the options.
:::

:::note{#recap-norm title="Recap" depth="quick"}
Normalised = first significant digit non-zero. Fraction form $0.1\ldots$ has $\tfrac12 \le M < 1$;
hidden-bit form $1.f$ has $1 \le M < 2$ and stores only $f$. A left shift by $k$ lowers the exponent
by $k$. In base 16, normalise by hex digits.
:::

## The exponent field: why a bias?

:::intuition{#bias-intuition title="Exponents are signed, but we want to compare them like unsigned numbers" depth="standard"}
The exponent must be negative for small numbers and positive for large ones, so it needs a signed
code. 2's complement is the obvious choice, but it has a flaw here: as unsigned bit patterns,
negative exponents look **bigger** than positive ones (in 8 bits, $-1$ is $1111\,1111$ and $+1$
is $0000\,0001$). Hardware that compares or sorts floats by their bit patterns would then put
$2^{-1}$ above $2^{+1}$.

The fix is the excess-K code from [Lesson 4](lesson:signed-numbers#biased): add a constant
$K$, the **bias**, to every exponent so that the stored field is never negative. Then a larger
exponent is a larger unsigned field, and the most negative exponent is the all-zero field.
:::

:::definition{#biased-exponent term="Biased exponent" depth="quick"}
With a $k$-bit exponent field and bias $B$, the field stores $e = E + B$, so

$$
E = e - B, \qquad 0 \le e \le 2^k - 1 .
$$

Two bias conventions appear in GATE questions, and the question always tells you which:

- **Excess-$2^{k-1}$** (textbook custom formats): $B = 2^{k-1}$. A 7-bit field is **excess-64**
  (GATE 2002, 2005), an 8-bit field excess-128.
- **IEEE style**: $B = 2^{k-1} - 1$, that is 127 for 8 bits and 1023 for 11 bits (Lesson 6). GATE
  2003 used the same idea with $B = 31$ for a 6-bit field.
:::

:::derivation{#bias-range of="the exponents a biased field can hold" depth="standard"}
The field runs over $0 \dots 2^k - 1$, so $E = e - B$ runs over

$$
-B \;\le\; E \;\le\; 2^k - 1 - B .
$$

- Excess-$2^{k-1}$: $-2^{k-1} \le E \le 2^{k-1} - 1$, exactly the 2's-complement range (excess-64:
  $-64 \dots 63$). Indeed excess-$2^{k-1}$ is 2's complement with the top bit flipped.
- IEEE ($B = 2^{k-1} - 1$): $-(2^{k-1} - 1) \le E \le 2^{k-1}$, so for 8 bits $-127 \dots 128$.
  IEEE then reserves the two end fields ($e = 0$ and $e = 255$) for zero, denormals, infinity and
  NaN, leaving $-126 \dots 127$ for normal numbers.

**Sanity check.** A 4-bit field with bias 8: $e = 0$ gives $-8$ and $e = 15$ gives $+7$; with
bias 7: $-7$ and $+8$.
:::

:::theorem{#bias-order name="Biased exponents compare like unsigned integers" depth="standard"}
For a fixed bias $B$, $E_1 < E_2$ exactly when the stored fields satisfy $e_1 < e_2$ as unsigned
integers. Consequently, in a format laid out as **sign | biased exponent | fraction** with a
normalised significand, two non-negative values compare in the same order as their bit patterns
read as unsigned integers.
:::

:::proof{#proof-bias-order of="the order of biased exponents and of whole words" depth="deep"}
**Idea first:** adding the same constant to every exponent cannot change their order, and a
normalised significand never reaches the next power of two.

The map $E \mapsto E + B$ is strictly increasing, so $E_1 < E_2 \iff e_1 < e_2$.

For the whole word, take two non-negative normalised values $x_1 = M_1 2^{E_1}$ and
$x_2 = M_2 2^{E_2}$ with $1 \le M_i < 2$. If $E_1 < E_2$ then $x_1 < 2^{E_1 + 1} \le 2^{E_2} \le x_2$,
and the pattern of $x_1$ is smaller too, because the exponent field sits above every fraction bit.
If $E_1 = E_2$ the exponent fields are equal and the order is decided by the fraction fields, which
are the significands' bits in place-value order. So bigger value ⇔ bigger pattern. With a
2's-complement exponent the first step fails, because $E \mapsto$ (2's-complement pattern) is not
increasing across $-1 \to 0$.
:::

:::viz{#bias-order-viz spec="bias-order" mode="animate" depth="standard"}
:::

:::table{#bias-conventions title="Exponent codes in GATE floating-point questions" depth="standard"}
| Paper | Exponent field | Code | Base | Normalisation |
|:--|:--|:--|:--|:--|
| 1996 | 8 bits | 2's complement | 2 | fraction form, sign-magnitude mantissa |
| 1997 | 4 bits | sign-magnitude | 2 | fraction form, sign-magnitude mantissa |
| 2002 | 7 bits | excess-64 | 16 | first hex digit non-zero |
| 2003 | 6 bits | bias 31 (all-ones field = zero) | 2 | hidden bit, $1 + m \cdot 2^{-9}$ |
| 2005 | 7 bits | excess-64 | 2 | (a) raw fraction; (b) hidden bit |
| 2008 onward | 8 / 11 bits | IEEE bias 127 / 1023 | 2 | hidden bit, with denormals |
:::

:::trap{#trap-bias title="Bias 2^(k−1) or 2^(k−1) − 1? Read the question" depth="quick"}
Both conventions are legitimate, and older solution sets mix them up: one reference set writes the
bias as $2^n - 1$ in one place and uses $2^{k-1}$ in its own example (see the errata). For IEEE it is
**127** (single) and **1023** (double), never 128 or 1024. For a custom format, use exactly the code
the question names ("excess-64", "2's complement", "bias of 31"). If a question says only "biased
exponent" for a $k$-bit field, state your assumption.
:::

### Worked examples: exponent codes

::::example{#ex-bias-easy level="easy" title="Excess-127 both ways" depth="quick"}
Store the exponents $E = +3$ and $E = -3$ in an 8-bit excess-127 field.

:::step{why="The field holds E plus the bias."}
$3 + 127 = 130$ and $-3 + 127 = 124$.
:::

:::step{why="Write each field as 8-bit unsigned binary."}
$130 = 1000\,0010_2$ and $124 = 0111\,1100_2$.
:::

:::answer
$E = 3 \to 1000\,0010$; $E = -3 \to 0111\,1100$. The larger exponent has the larger field.
:::
::::

::::example{#ex-bias-same-bits level="medium" title="One field, four codes" depth="standard"}
A 4-bit exponent field holds $0011$. What exponent is it in excess-8, in excess-7, in 2's complement
and in sign-magnitude?

:::step{why="A biased field is read as unsigned and the bias subtracted."}
Unsigned value $3$. Excess-8: $3 - 8 = -5$. Excess-7: $3 - 7 = -4$.
:::

:::step{why="The top bit is 0, so the 2's-complement and sign-magnitude readings are both the plain value."}
2's complement: $+3$. Sign-magnitude: $+3$.
:::

:::answer
$-5$, $-4$, $+3$, $+3$. The same four bits mean four different exponents; always read the code
the format names.
:::
::::

::::example{#ex-bias-hex level="gate" title="An excess-64 exponent in base 16" depth="standard"}
A base-16 format has a 7-bit excess-64 exponent. What power does the field $1000011$ stand for,
and what does $0111110$ stand for?

:::step{why="Read the field as unsigned and subtract the bias 64."}
$1000011_2 = 67$, so $E = 67 - 64 = 3$. $0111110_2 = 62$, so $E = 62 - 64 = -2$.
:::

:::step{why="The base is 16, so the exponent scales by powers of 16, not 2."}
$16^{3} = 4096 = 2^{12}$ and $16^{-2} = \tfrac{1}{256} = 2^{-8}$.
:::

:::answer
$1000011 \to 16^3 = 2^{12}$; $0111110 \to 16^{-2} = 2^{-8}$. A base-16 exponent step is a factor of 16.
:::
::::

::::example{#ex-bias-order level="gate" title="Edge case: why 2's-complement exponents sort wrongly" depth="standard"}
Two positive numbers are $1.0 \times 2^{-1}$ and $1.0 \times 2^{+1}$. Compare their exponent fields
as unsigned numbers when the 8-bit exponent is stored in 2's complement and in excess-127.

:::step{why="2's complement of −1 in 8 bits is all ones; +1 is 00000001."}
2's complement: $-1 \to 1111\,1111 = 255$ and $+1 \to 0000\,0001 = 1$.
:::

:::step{why="An unsigned comparator would call 255 the bigger field."}
So the pattern of $0.5$ would compare as larger than the pattern of $2$: wrong.
:::

:::step{why="With a bias the fields keep the order of the exponents."}
Excess-127: $-1 \to 126$ and $+1 \to 128$, and $126 < 128$: right.
:::

:::answer
2's complement breaks the unsigned order (255 > 1); excess-127 keeps it (126 < 128). That, and a
zero exponent field for the tiniest values, is why IEEE biases its exponent.
:::
::::

:::note{#recap-bias title="Recap" depth="quick"}
Stored field $e = E + B$. Excess-$2^{k-1}$ gives $-2^{k-1} \dots 2^{k-1} - 1$; IEEE's $2^{k-1} - 1$
(127, 1023) gives $-126 \dots 127$ after reserving both ends. A bias keeps the unsigned order of the
fields, so floats compare like integers. Always use the code the question names.
:::

## Encoding and decoding a custom format

GATE's older questions define their own word: so many bits of sign, exponent and mantissa, a code
for each, a base, and an order. The method is always the same; only the details change, and the
details are where the marks are.

:::definition{#encode-method term="Method: encode a decimal value in a given format" depth="quick"}
1. **Sign.** $s = 0$ for positive, $1$ for negative; continue with $|x|$.
2. **Convert** $|x|$ to binary (Lessons 1 and 3), or to hex for a base-16 format.
3. **Normalise** in the format's convention (fraction form, hidden bit, or first hex digit
   non-zero) and note the exponent $E$.
4. **Exponent field:** $E + B$ for a biased code, or $E$ in 2's complement or sign-magnitude, in
   exactly $k$ bits.
5. **Mantissa field:** the significant bits (dropping the hidden 1 if the format has one), padded
   with zeros or cut to the field width. Cut by **truncation** unless the question asks for rounding.
6. **Assemble** the fields in the order the question gives, then group the whole word into hex
   digits (the hex digits usually straddle field boundaries).
:::

:::definition{#decode-method term="Method: decode a word" depth="quick"}
Run the encoding backwards: write the word in binary, cut it into fields **in the stated order**,
read the sign, read the exponent in its code, rebuild the significand ($1.f$ or $0.f$, or hex digits),
and compute $(-1)^s \times M \times \beta^{E}$. Check that the pattern is not one the format reserves
(zero, infinity) before decoding it as an ordinary number.
:::

### Worked examples: custom formats

::::example{#ex-fmt-decode level="easy" title="Decode an 8-bit toy format" depth="quick"}
An 8-bit format is sign (1) | exponent (4, bias 7) | fraction (3, hidden 1), and every exponent
field is an ordinary exponent. Decode $0\ 1001\ 011$.

:::step{why="Cut the word into fields in the stated order."}
$s = 0$, $e = 1001_2 = 9$, $f = 011$.
:::

:::step{why="Remove the bias, then put the hidden 1 back in front of the fraction."}
$E = 9 - 7 = 2$ and $M = 1.011_2 = 1.375$.
:::

:::answer
$+1.375 \times 2^2 = 5.5$.
:::
::::

::::example{#ex-fmt-16 level="medium" title="Encode −0.375 in a 16-bit hidden-bit format" depth="standard"}
A 16-bit format is sign (1) | exponent $e$ (6) | mantissa $m$ (9), with value
$(-1)^s (1 + m \cdot 2^{-9})\, 2^{e - 31}$. Encode $-0.375$ and write the word in hex.

:::step{why="Sign first; the rest works on the magnitude."}
$s = 1$, $|x| = 0.375 = 0.011_2$.
:::

:::step{why="Hidden-bit form: point just after the first 1, two places to the right, so E = −2."}
$0.011 = 1.1 \times 2^{-2}$.
:::

:::step{why="The value formula uses e − 31, so the field is E + 31."}
$e = -2 + 31 = 29 = 011101_2$.
:::

:::step{why="m · 2^-9 is the fraction after the hidden 1, so m holds the bits after the point, padded to 9 bits."}
$m = 1\,0000\,0000$.
:::

:::step{why="Concatenate s | e | m and group from the left in fours."}
$1\ 011101\ 100000000 = 1011\,1011\,0000\,0000 = \text{BB00}_{16}$.
:::

:::answer
$-0.375 \to$ `BB00`. Check: $-(1 + 256/512) \times 2^{29 - 31} = -1.5/4 = -0.375$.
:::
::::

::::example{#ex-fmt-base16 level="gate" title="A base-16 word with the exponent last" depth="standard"}
A 32-bit format is sign (1, MSB) | fraction (24, point at its left end) | exponent (7, excess-64,
base 16), normalised so that the first hex digit of the fraction is non-zero. Encode $+21.5$ in hex.

:::step{why="Base 16, so convert to hex: 21 = 15₁₆ and 0.5 = 0.8₁₆."}
$21.5 = 15.8_{16}$.
:::

:::step{why="Move the point two hex digits left so the fraction starts with a non-zero hex digit; each hex place is one power of 16."}
$15.8_{16} = 0.158_{16} \times 16^{2}$, so $E = 2$.
:::

:::step{why="The 24-bit fraction is six hex digits; the exponent field is E + 64 in 7 bits."}
Fraction $= 158000_{16} = 0001\,0101\,1000\,0000\,0000\,0000$; exponent $= 66 = 100\,0010_2$.
:::

:::step{why="Assemble in the stated order sign | fraction | exponent. The hex digits of the word do not line up with the fields, so regroup the 32 bits."}
$0\ 000101011000000000000000\ 1000010 = 0000\,1010\,1100\,0000\,0000\,0000\,0100\,0010$.
:::

:::answer
`0AC00042`. A common slip is to write the exponent first, as in IEEE; this format puts it last.
:::
::::

::::example{#ex-fmt-twos level="gate" title="Edge case: a 2's-complement exponent" depth="standard"}
A 32-bit format is exponent (8 bits, 2's complement, bits 31–24) | mantissa (24 bits, sign-magnitude:
1 sign bit then a 23-bit fraction normalised as $0.1\ldots$). Encode $-0.15625$.

:::step{why="Binary of the magnitude: 0.15625 = 5/32."}
$0.15625 = 0.00101_2$.
:::

:::step{why="Fraction form puts the point just before the first 1, two places right, so E = −2."}
$0.00101 = 0.101 \times 2^{-2}$.
:::

:::step{why="A 2's-complement exponent stores −2 as 2^8 − 2 = 254."}
Exponent field $= 1111\,1110$.
:::

:::step{why="Mantissa: sign 1, then the fraction bits 101 padded to 23 bits; the leading 1 is stored, because this format has no hidden bit."}
Mantissa field $= 1\ 1010\,0000\,0000\,0000\,0000\,000$.
:::

:::answer
$1111\,1110\,1101\,0000\,0000\ldots0 = $ `FED00000`. Note how the negative exponent makes the word
start with F: as an unsigned number this tiny value looks enormous (the order problem from the
[bias section](#bias-order)).
:::
::::

:::trap{#trap-field-order title="Assuming IEEE's field order and hidden bit" depth="quick"}
Custom formats differ from IEEE in exactly the places you stop reading: the exponent may come
**after** the fraction (GATE 2002), the leading 1 may be **stored** (fraction form), the base may be
**16**, and the exponent code may be 2's complement or sign-magnitude. Write the field order and
codes down before you touch the number.
:::

:::trap{#trap-truncation title="Rounding when the format truncates (and the reverse)" depth="quick"}
Old GATE questions (1997, 2005) cut extra mantissa bits by **truncation**; IEEE rounds to nearest.
In the 1997 question $9.75 = 0.100111 \times 2^4$ becomes $0.10011 \times 2^4 = 9.5$ by truncation,
but $0.10100 \times 2^4 = 10$ by rounding. Use what the question says; if it says nothing in a
custom format, truncation is the usual assumption and you should state it.
:::

:::note{#recap-encode title="Recap" depth="quick"}
Sign → binary (or hex) → normalise in the format's convention → exponent in its code → mantissa
cut to width → assemble in the stated order → regroup into hex. Decode by running it backwards.
:::

## Range, precision and the gap between neighbours

:::intuition{#gap-intuition title="Every binade has the same number of ticks" depth="standard"}
Fix the exponent and let the significand run over all its patterns: you get $2^f$ equally spaced
values filling one **binade** $[2^E, 2^{E+1})$. Raise the exponent by one and the same $2^f$ ticks
are stretched over an interval twice as long. So the gap between neighbours **doubles** at every
power of two, while the gap *relative to the value* stays about the same. The largest gap in the
whole format sits at the top exponent, the smallest at the bottom.
:::

:::viz{#ulp-viz spec="ulp-precision" mode="animate" depth="standard"}
:::

:::derivation{#range-formulas of="the largest and smallest values of a format" depth="quick"}
Let the exponent run over $E_{\min} \dots E_{\max}$ (after removing any reserved fields) and let
the significand field have $f$ bits.

**Hidden-bit form.** The largest significand is $1.11\ldots1 = 2 - 2^{-f}$ (a geometric sum), so

$$
x_{\max} = (2 - 2^{-f})\, 2^{E_{\max}}, \qquad x_{\min} = 1.0 \times 2^{E_{\min}} = 2^{E_{\min}} .
$$

**Fraction form (explicit leading 1).** The significand runs from $0.10\ldots0 = \tfrac12$ to
$0.11\ldots1 = 1 - 2^{-f}$, so

$$
x_{\max} = (1 - 2^{-f})\, 2^{E_{\max}}, \qquad x_{\min} = \tfrac12 \cdot 2^{E_{\min}} .
$$

**Base 16 with $d$ hex digits.** The fraction runs from $0.1_{16} = \tfrac1{16}$ to
$0.FF\ldots F_{16} = 1 - 16^{-d}$, so $x_{\max} = (1 - 16^{-d})\, 16^{E_{\max}}$ and
$x_{\min} = 16^{E_{\min} - 1}$.

**Sanity check.** The 8-bit toy format above (bias 7, 3 fraction bits, $E = -7 \dots 8$) gives
$x_{\max} = 1.111_2 \times 2^8 = 1.875 \times 256 = 480$ and $x_{\min} = 2^{-7} = 0.0078125$; the
all-ones word $0\,1111\,111$ decodes to $1.875 \times 2^{15 - 7} = 480$ as well.
:::

:::derivation{#ulp-def of="the gap between neighbours (one ulp)" depth="quick"}
Inside one binade the significand moves in steps of its last place, $2^{-f}$ for $f$ fraction bits
(hidden-bit or fraction form alike). Multiplying by the power of two:

$$
\text{gap at exponent } E \;=\; \text{ulp} \;=\; 2^{-f} \times 2^{E} = 2^{E - f}.
$$

This is one **unit in the last place** (ulp). It doubles from each binade to the next, so the
**largest gap** is $2^{E_{\max} - f}$ (between the two largest values) and the smallest is
$2^{E_{\min} - f}$. Relative to the value, $\text{ulp}/x$ lies between $2^{-f-1}$ and $2^{-f}$ in the
hidden-bit form: that is the "same relative precision everywhere" promise.

**Sanity check.** In the toy format ($f = 3$) the values in $[1, 2)$ are $1, 1.125, \ldots, 1.875$:
gap $2^{0-3} = 0.125$. In $[2, 4)$ the gap is $2^{1-3} = 0.25$.
:::

:::derivation{#decimal-digits of="how many decimal digits p bits are worth" depth="standard"}
$p$ significant bits distinguish $2^p$ significands; $d$ decimal digits distinguish $10^d$. Setting
$2^p = 10^d$ gives

$$
d = p \log_{10} 2 \approx 0.301\,p .
$$

So 11 bits ≈ 3.3 digits, 24 bits ≈ 7.2 digits (IEEE single) and 53 bits ≈ 16.0 digits (IEEE double).
**Sanity check:** $2^{10} = 1024 \approx 10^3$, so every 10 bits buy about 3 decimal digits.
:::

:::aside{#wobble title="Why base 16 lost: wobbling precision" depth="deep"}
A base-16 format moves the point a whole hex digit at a time, so a normalised fraction can begin
$0.0001\ldots$ in binary (first hex digit 1) or $0.1\ldots$ (first hex digit 8 to F). Within one
hex binade the gap is fixed, so the *relative* gap swings by a factor of 16 instead of 2; with 24
fraction bits the guaranteed precision drops to 21 bits. Base 16 bought range cheaply (each
exponent step is a factor of 16) but its precision wobbled, which is one reason IEEE-754 chose
base 2 with a hidden bit.
:::

### Worked examples: range and gaps

::::example{#ex-range-toy level="easy" title="Range of the 8-bit toy format" depth="quick"}
For sign (1) | exponent (4, bias 7) | fraction (3, hidden 1), with every exponent ordinary, find the
largest value, the smallest positive value and the largest gap.

:::step{why="A 4-bit field runs 0 … 15, so with bias 7 the exponent runs −7 … 8."}
$E_{\min} = -7$, $E_{\max} = 8$.
:::

:::step{why="Use the hidden-bit formulas with f = 3."}
$x_{\max} = (2 - 2^{-3}) \times 2^{8} = 1.875 \times 256 = 480$; $x_{\min} = 2^{-7} = 0.0078125$.
:::

:::step{why="The largest gap is one ulp at the top exponent."}
Largest gap $= 2^{8 - 3} = 32$ (between $448$ and $480$).
:::

:::answer
Largest $480$, smallest positive $2^{-7}$, largest gap $32$.
:::
::::

::::example{#ex-range-mag level="medium" title="Magnitude range of a normalised fraction mantissa" depth="standard"}
A 16-bit word has a 6-bit 2's-complement exponent and a 10-bit sign-magnitude mantissa (1 sign bit,
9 magnitude bits) normalised as $0.1\ldots$. What range can the magnitude of a normalised mantissa
take, and what are the largest value and the smallest positive value?

:::step{why="Normalised fraction form: the first magnitude bit is 1, the rest are free."}
Smallest magnitude $0.1000\,0000\,0_2 = \tfrac12$; largest $0.1111\,1111\,1_2 = 1 - 2^{-9}$.
:::

:::step{why="A 6-bit 2's-complement exponent runs from −32 to +31."}
$x_{\max} = (1 - 2^{-9}) \times 2^{31}$ and $x_{\min} = \tfrac12 \times 2^{-32} = 2^{-33}$.
:::

:::answer
Mantissa magnitudes run from $0.5$ to $1 - 2^{-9}$; values run from $2^{-33}$ up to
$(1 - 2^{-9})\, 2^{31}$. (Not "0 to 1": a normalised mantissa is never below one half.)
:::
::::

::::example{#ex-range-gap level="gate" title="The largest gap between successive values" depth="standard"}
A 12-bit format is sign (1) | exponent $e$ (5) | mantissa $m$ (6), with value
$(-1)^s (1 + m \cdot 2^{-6})\, 2^{e - 15}$ when $e \ne 11111$, and $0$ when $e = 11111$. Find the
largest and the smallest difference between two successive representable values.

:::step{why="The all-ones exponent is reserved for zero, so ordinary exponents use e = 0 … 30."}
$E = e - 15$ runs from $-15$ to $15$.
:::

:::step{why="Inside one exponent, consecutive m differ by 1, so the values differ by 2^-6 · 2^(e−15)."}
Gap at exponent $e$: $2^{-6} \times 2^{e - 15}$.
:::

:::step{why="The gap grows with e, so the largest gap is at e = 30 and the smallest at e = 0."}
Largest: $2^{-6} \times 2^{15} = 2^{9} = 512$. Smallest: $2^{-6} \times 2^{-15} = 2^{-21}$.
:::

:::answer
Largest gap $2^{9}$, smallest gap $2^{-21}$. The trap answer $2^{-6}$ is the gap of the
*mantissa*, forgetting the power of two it is multiplied by.
:::
::::

::::example{#ex-range-hex level="gate" title="Edge case: the extremes of a base-16 format" depth="standard"}
For the 32-bit base-16 format above (24-bit fraction, 7-bit excess-64 exponent), find the largest
value as a power of 10 and the smallest positive normalised value.

:::step{why="Excess-64 in 7 bits gives E = −64 … 63, and every field is ordinary in this format."}
$E_{\max} = 63$, $E_{\min} = -64$.
:::

:::step{why="Largest fraction is six F digits, 1 − 16^-6, which is 1 to within a few millionths."}
$x_{\max} = (1 - 16^{-6}) \times 16^{63} \approx 16^{63} = 2^{252}$.
:::

:::step{why="To get a power of 10, multiply the binary exponent by log10 2 ≈ 0.30103."}
$252 \times 0.30103 \approx 75.86$, so $x_{\max} \approx 10^{75.86} \approx 7.2 \times 10^{75}$, nearest power $10^{76}$.
:::

:::step{why="The smallest normalised fraction is 0.1 in hex, which is 1/16."}
$x_{\min} = \tfrac1{16} \times 16^{-64} = 16^{-65} = 2^{-260} \approx 5.4 \times 10^{-79}$.
:::

:::answer
$x_{\max} \approx 7.2 \times 10^{75}$ (about $10^{76}$); $x_{\min} = 16^{-65} \approx 5.4 \times 10^{-79}$.
:::
::::

:::trap{#trap-gap title="Mantissa step instead of value step" depth="quick"}
"The gap between successive numbers" means between successive **values**, so multiply the
mantissa step by the power of the base: $2^{-f} \times 2^{E}$. The largest gap is at the **largest**
ordinary exponent (skip any reserved field), the smallest at the smallest.
:::

:::note{#recap-range title="Recap" depth="quick"}
Hidden bit: $x_{\max} = (2 - 2^{-f})2^{E_{\max}}$, $x_{\min} = 2^{E_{\min}}$. Fraction form:
$(1 - 2^{-f})2^{E_{\max}}$ and $\tfrac12 2^{E_{\min}}$. Gap at exponent $E$ is one ulp $= 2^{E-f}$,
doubling every binade. $p$ bits ≈ $0.301p$ decimal digits.
:::

## GATE questions on this lesson

All seven previous-year questions on floating-point formats, from the easiest to the hardest. Each
defines its own format, so read the field order and codes before you start.

:::pyq{id="cse-1996-a-25" tests="normalisation,range-formulas,fp-def" depth="standard"}
:::

:::pyq{id="cse-2003-cs-43" tests="ulp-def,range-formulas,trap-gap" depth="standard"}
:::

:::pyq{id="cse-1997-b-72-a" tests="encode-method,normalisation,trap-truncation" depth="standard"}
:::

:::pyq{id="cse-2005-cs-85a" tests="encode-method,biased-exponent" depth="standard"}
:::

:::pyq{id="cse-2005-cs-85b" tests="hidden-bit,normalise-procedure,encode-method" depth="standard"}
:::

:::pyq{id="cse-2002-b-57-a" tests="encode-method,normalisation,biased-exponent,trap-field-order" depth="standard"}
:::

:::pyq{id="cse-2002-b-57-b" tests="range-formulas,biased-exponent" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam level, then two that need care.

:::practice{id="nx-dl-01-05-q01" depth="standard"}
:::

:::practice{id="nx-dl-01-05-q02" depth="standard"}
:::

:::practice{id="nx-dl-01-05-q03" depth="standard"}
:::

:::practice{id="nx-dl-01-05-q04" depth="standard"}
:::

:::practice{id="nx-dl-01-05-q05" depth="standard"}
:::

:::practice{id="nx-dl-01-05-q06" depth="standard"}
:::

:::practice{id="nx-dl-01-05-q07" depth="standard"}
:::

:::practice{id="nx-dl-01-05-q08" depth="standard"}
:::

:::practice{id="nx-dl-01-05-q09" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Floating-point formats on one card" depth="quick"}
| Idea | Formula or rule |
|:--|:--|
| Value | $(-1)^s \times M \times \beta^{E}$; sign-magnitude significand |
| Precision vs range | significand bits → precision; exponent bits → range |
| Normalise (fraction form) | $0.1\ldots$, $\tfrac12 \le M < 1$, leading 1 stored |
| Normalise (hidden bit) | $1.f$, $1 \le M < 2$, only $f$ stored; $p = f + 1$ |
| Base 16 | first **hex digit** non-zero; up to 3 leading zero bits |
| Shift rule | $M \cdot 2^{E} = (M 2^{k}) \cdot 2^{E-k}$ |
| Biased exponent | $e = E + B$; excess-$2^{k-1}$ or IEEE $2^{k-1} - 1$ |
| Why a bias | fields order like unsigned integers; all-zero field = tiniest |
| Largest (hidden bit) | $(2 - 2^{-f})\, 2^{E_{\max}}$ |
| Largest (fraction form) | $(1 - 2^{-f})\, 2^{E_{\max}}$; base 16: $(1 - 16^{-d})\, 16^{E_{\max}}$ |
| Smallest normal | $2^{E_{\min}}$ (hidden bit); $\tfrac12 2^{E_{\min}}$ (fraction form) |
| Gap (ulp) at exponent $E$ | $2^{E - f}$; doubles every binade; largest at $E_{\max}$ |
| Decimal digits | $\approx p \log_{10} 2 = 0.301\,p$ |

Two habits: **write down the format** (field order, codes, base, hidden bit, truncation) before
encoding, and **decode your answer** to check it.
:::

:::note{#further-depth title="Further depth: where the formats came from" depth="deep"}
Before 1985 every manufacturer had its own floating point: IBM used base 16 with an excess-64
exponent (the GATE 2002 format is essentially IBM's single precision), DEC used a hidden bit with
a different bias, and Cray had no gradual underflow. Programs gave different answers on different
machines. IEEE-754 (1985, revised 2008 and 2019) fixed base 2, the hidden bit, the biases, the
special values and the rounding rules, which is why the next lesson can be so precise.
:::
