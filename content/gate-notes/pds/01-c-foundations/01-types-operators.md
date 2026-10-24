---
id: types-operators
subject: pds
chapter: c-foundations
title: "Types, operators and expressions"
order: 1
prerequisites: []
pyq_topics: [pds/c, pds/c-prog]
est_minutes: 65
difficulty: core
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every C output, size, range, conversion and PYQ key is produced by compiling and running the program with the system C compiler in content/gate-notes/_checks/pds/l1_01_types_operators.py (FORTRAN and Pascal rules re-derived in Python)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 5–10, set B pp. 109–119 and 223–225, set C pp. 258–263, 270–271 and 297–306, set E pp. 540–545."
  - "Facts checked against: ISO/IEC 9899:2011 (C11) §5.1.2.3, §6.2.5, §6.3.1, §6.5; B. W. Kernighan and D. M. Ritchie, The C Programming Language (2nd ed.), chapter 2 and appendix A."
  - "PYQs: src/gate/questions.json (cse-1991-a-4-i, cse-1993-a-2-5, it-2004-it-15, cse-2008-cs-18, cse-2014-2-cs-10, cse-2014-2-cs-11, cse-2017-1-cs-53, cse-2017-2-cs-54, cse-2021-1-cs-37, cse-2022-cs-34, cse-2024-2-cs-3); every key is re-derived by running the code."
updated: "2026-10-23"
---

*C foundations, lesson 1 of 7.* Every C question in GATE, whatever it looks like on the surface, is
decided by a handful of rules about **values**: how big a variable is, what happens when an arithmetic
result does not fit, which type wins when two types meet in one operator, in which order the parts of an
expression are evaluated, and which parts are not evaluated at all. This lesson builds those rules from
the ground up. It starts with the boxes that hold values (the integer and character types and their
ranges), moves on to integer arithmetic (division that truncates, unsigned numbers that wrap, signed
overflow that is forbidden), then the conversions C applies silently (promotion and the "usual
arithmetic conversions", including the famous `-1 < 1u` trap), then every operator with its precedence,
and finally the subtle part: **evaluation order, short circuits and side effects**. By the end you can
look at any C expression and say what it computes, with which type, and whether its result is even
defined.

## Where this fits

This is the first lesson of the course, and it needs nothing except a little binary arithmetic (the
two's-complement representation of negative numbers is explained again briefly; the Digital Logic course
covers it fully in [signed numbers](/gate/notes/dl/signed-numbers)). [Lesson 2](lesson:control-flow) uses
these expressions as the conditions of `if`, `switch` and loops; Lesson 4 (functions and storage classes) adds
functions; Chapter 2 adds pointers, whose arithmetic is the same arithmetic scaled by a size. The sentence
to keep from this lesson: **an expression's value is decided by its types (after promotion and
conversion), its grouping (by precedence and associativity), and its evaluation (left operand first only
where C promises it: `&&`, `||`, `?:` and the comma).**

:::table{#radar title="GATE radar: types, operators and expressions" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 11 (1991, 1993, IT 2004, 2008, 2014 ×2, 2017 ×2, 2021, 2022, 2024) |
| Marks | 1-mark MCQs and NATs (2008, 2014, 2024, IT 2004), 2-mark NATs (2017) and MCQs (2021, 2022), older fill-ins |
| Pattern 1 | Trace a short program with `++`/`--`, compound assignment and printing (2017: 0) |
| Pattern 2 | Short-circuit `&&` with a side effect on the right (2021: `i++` runs only for j ≥ 0) |
| Pattern 3 | Unsigned arithmetic: `size_t` differences never go negative (2017: 3); overflow of large products (2014: nC3) |
| Pattern 4 | Bit operations: shift counts (2014: 435 has 9 bits), `& | ^` on ASCII codes (2022: z K S) |
| Pattern 5 | Conditional operator and simple identities (2008: max of three; IT 2004: `x = 1 - x`) |
| Pattern 6 | Evaluation order of function arguments when the question fixes it (2024: right to left) |
| What examiners test | the old value from `x++`; skipped right operands; the signed→unsigned conversion; integer division and its truncation; precedence of `==` over `&`, `+` over `<<`; UB vs a definite answer |
:::

## Values live in fixed-size boxes

:::intuition{#types-intuition title="An odometer with a fixed number of wheels" depth="standard"}
A car's odometer has, say, six wheels. It can show 000000 to 999999 and nothing else: drive one more
kilometre from 999999 and it shows 000000 again. Nobody is surprised, because the number of wheels was
fixed when the car was built.

Every C variable is such an odometer, except that its wheels are bits. An `int` on today's machines has 32
of them, so it can hold $2^{32}$ different patterns, and the **type** says how to read a pattern as a
number: as one of $0, \dots, 2^{32} - 1$ (an `unsigned int`) or as one of $-2^{31}, \dots, 2^{31} - 1$ (an
`int`, in two's complement). Nearly every "tricky" C question is a question about what happens at the edge
of the odometer.
:::

:::definition{#int-types term="The arithmetic types and their sizes" depth="standard"}
C's basic **arithmetic types** are the integer types `char`, `short`, `int`, `long` and `long long`
(each in a signed and an `unsigned` version, plus plain `char`) and the floating types `float` and
`double`. The standard fixes only minimum ranges and the order `char` ≤ `short` ≤ `int` ≤ `long` ≤
`long long`; the sizes are chosen by the implementation. This course uses the model of every 64-bit Linux
and macOS system, and GATE's recent papers assume the same:

| Type | Bytes | Range |
|:--|:--:|:--|
| `char` (signed on x86 and on this course's model) | 1 | −128 … 127 |
| `unsigned char` | 1 | 0 … 255 |
| `short` | 2 | −32 768 … 32 767 |
| `int` | 4 | −2 147 483 648 … 2 147 483 647 |
| `unsigned int` | 4 | 0 … 4 294 967 295 |
| `long`, `long long` | 8 | about ±9.22 × 10¹⁸ |
| `float` / `double` | 4 / 8 | about 7 / 16 significant decimal digits |
| any pointer | 8 | an address |

`sizeof` gives the size in bytes: `sizeof(int)` is 4 here. Older PYQs (before about 2005) sometimes assume a
**2-byte `int`** with range −32 768 … 32 767; when a question does, it says so, and the arithmetic below
works the same with 16 in place of 32.
:::

The ranges in that table are not to be memorised one by one. They all come from one formula, and the
formula comes from one picture: the number circle of the next animation.

:::theorem{#range-theorem name="Ranges of an n-bit integer type" depth="standard"}
An unsigned integer type with $n$ value bits represents exactly the integers $0, 1, \dots, 2^n - 1$. A
signed type of $n$ bits in two's complement represents exactly $-2^{n-1}, \dots, 2^{n-1} - 1$. Both have
$2^n$ values; the signed range has one more negative value than positive values.
:::

:::proof{#proof-range of="the ranges" depth="standard"}
**Idea first:** $n$ bits have $2^n$ patterns, and each type is a rule that gives every pattern a different
number.

*Unsigned.* The pattern $b_{n-1} \dots b_1 b_0$ means $\sum_i b_i 2^i$. The smallest value is all zeros, 0;
the largest is all ones, $\sum_{i<n} 2^i = 2^n - 1$; and every integer in between has exactly one binary
expansion with $n$ digits. So the range is $0 \dots 2^n - 1$.

*Two's complement.* The same pattern means $-b_{n-1} 2^{n-1} + \sum_{i<n-1} b_i 2^i$: the top bit has the
negative weight $-2^{n-1}$. With $b_{n-1} = 0$ the remaining bits give $0 \dots 2^{n-1} - 1$; with
$b_{n-1} = 1$ they give $-2^{n-1} + (0 \dots 2^{n-1} - 1) = -2^{n-1} \dots -1$. Together:
$-2^{n-1} \dots 2^{n-1} - 1$, $2^n$ values, with zero counted among the non-negative ones, which is why
the negatives are one more. ∎

**Sanity check.** $n = 8$: unsigned 0 … 255, signed −128 … 127. $n = 32$: unsigned 0 … 4 294 967 295 and
signed −2 147 483 648 … 2 147 483 647, the values the lesson check prints from real C.
:::

:::definition{#char-is-int term="A char is a small integer" depth="standard"}
A `char` is a 1-byte **integer**. A character constant such as `'A'` is just a way of writing the
character's code: in ASCII, `'0'` … `'9'` are 48 … 57, `'A'` … `'Z'` are 65 … 90 and `'a'` … `'z'` are
97 … 122, so `'a' - 'A'` is 32 and `'7' - '0'` is 7. In C (unlike C++) a character constant has type
`int`: `sizeof 'A'` is 4. Characters can be added, subtracted, compared, masked and shifted like any
other integers; `printf("%c", 122)` prints `z` and `printf("%d", 'z')` prints 122.
:::

:::definition{#constants term="Integer and character constants" depth="standard"}
- **Decimal** `123`, **octal** with a leading zero `0173` (digits 0–7 only), **hexadecimal** `0x7B`
  (digits 0–9, a–f): all three are the number 123.
- A **suffix** changes the type: `123u` is `unsigned int`, `123L` is `long`, `123UL` is `unsigned long`.
  A decimal constant too large for `int` automatically gets type `long`.
- **Character constants** `'A'` (65), with escapes `'\n'` (10), `'\0'` (0), `'\101'` (octal, 65), `'\x41'`
  (hex, 65).
- **Floating constants** `2.0`, `.5`, `1e-3` have type `double`; `2.0f` is `float`.
:::

:::trap{#trap-octal title="011 is nine, and 098 does not compile" depth="standard"}
A leading zero makes a constant octal, so `int a = 011;` stores **9**, not 11, and `010 + 1` is 9. The
digits 8 and 9 do not exist in octal, so `098` is a compile error ("invalid digit in octal constant"), not
98. Examiners hide this in tables of initial values; the lesson check confirms both facts with the
compiler.
:::

The next animation turns the range theorem into a picture you can reuse for every overflow question: the
eight 3-bit patterns placed on a circle, read once as unsigned and once as signed.

:::viz{#unsigned-wheel-viz spec="unsigned-wheel" mode="animate" depth="standard"}
:::

:::note{#recap-types title="Recap" depth="quick"}
Sizes here: char 1, short 2, int 4, long 8, pointers 8. $n$ bits: unsigned $0 … 2^n - 1$, signed
$-2^{n-1} … 2^{n-1} - 1$. A char is an integer (`'A'` = 65, `'a'` = 97, `'0'` = 48). A leading 0 means octal.
:::

## Integer arithmetic: division, wrap-around and overflow

:::intuition{#division-intuition title="Sharing sweets without cutting them" depth="standard"}
Seven sweets shared between two children: each gets 3 and one is left over. Integer division in C is
exactly this: `7 / 2` is 3 and `7 % 2` is 1; the fraction is thrown away, never rounded. The only question
is what "thrown away" means for negative numbers, and C's answer is simple: it **truncates toward zero**,
so $-3.5$ becomes $-3$, and the remainder is whatever is needed to make the division identity true.
:::

:::definition{#int-division term="Integer division and remainder" depth="standard"}
For integers $a$ and $b \ne 0$, C defines `a / b` as the algebraic quotient with any fractional part
**discarded** (truncation toward zero), and `a % b` so that `(a / b) * b + a % b == a`. Hence `a % b` has
the sign of `a` (or is 0):

| `a` | `b` | `a / b` | `a % b` |
|:--:|:--:|:--:|:--:|
| 7 | 2 | 3 | 1 |
| −7 | 2 | −3 | −1 |
| 7 | −2 | −3 | 1 |
| −7 | −2 | 3 | −1 |

Division or remainder by zero is **undefined behaviour**. When either operand is floating point, `/` is
ordinary division: `7 / 2.0` is 3.5. Integer division happens even inside a larger floating expression
whenever both operands of that particular `/` are integers: in `2.0 * 7 / 2`, the left `*` is done first,
in double, so the division is in double too; in `2.0 + 7 / 2` the `7 / 2` is integer division (3).
:::

:::theorem{#division-identity name="The division identity" depth="standard"}
For all integers $a$ and $b \ne 0$ whose quotient is representable, $(a / b) \cdot b + a \,\%\, b = a$ and
$|a \,\%\, b| < |b|$.
:::

:::proof{#proof-division-identity of="the division identity" depth="standard"}
**Idea first:** the remainder is *defined* as what is left after the truncated quotient is taken away.

Let $q = a / b$ (truncated toward zero), so $q$ is the integer between 0 and $a/b$ (inclusive) closest to
$a/b$, and $|a/b - q| < 1$. C defines $a \% b = a - q\,b$, which gives the identity at once. Multiplying
$|a/b - q| < 1$ by $|b|$ gives $|a - qb| < |b|$, which is the bound. Because $q$ lies between 0 and $a/b$,
$a - qb$ and $a$ have the same sign (or $a - qb = 0$). ∎

**Sanity check.** $a = -7$, $b = 2$: $q = -3$ and $-3 \cdot 2 + (-1) = -7$. The lesson check verifies the
identity for every $a \in [-9, 9]$ and $b \in \{\pm 1, \dots, \pm 4\}$.
:::

:::definition{#unsigned-wrap term="Unsigned arithmetic wraps around" depth="standard"}
Arithmetic on unsigned types is **modular**: every result is reduced modulo $2^n$ ($n$ = number of bits),
so it never overflows in the sense of an error. With a 32-bit `unsigned int`, `0u - 1` is
$2^{32} - 1 = 4\,294\,967\,295$, and that plus 2 is 1 again. With `unsigned char` (8 bits), 255 + 1 is 0.
This is fully defined behaviour, and programs rely on it.
:::

:::definition{#signed-overflow term="Signed overflow is undefined" depth="standard"}
For **signed** integer types, a result that does not fit the type (for example `INT_MAX + 1`) is
**undefined behaviour**: the C standard places no requirement on what happens. Most machines happen to
wrap around like the odometer, but compilers may assume overflow never happens and optimise accordingly,
so a program that overflows a signed int has no meaning. In a GATE question, either the values stay in
range (so no overflow happens) or the question is about the danger itself (as in GATE 2014's $\binom{n}{3}$).
**Conversion** of an out-of-range value *into* a signed type is different: it is implementation-defined,
and every machine of the course's model keeps the low bits (so 200 stored in a signed `char` becomes
$200 - 256 = -56$).
:::

:::derivation{#overflow-order of="the order of operations that keeps intermediate values small" depth="standard"}
To compute $\binom{n}{3} = \frac{n(n-1)(n-2)}{6}$ with 32-bit unsigned integers for large $n$, compare three
orders of evaluation (C evaluates `*` and `/` left to right):

1. `n * (n-1) * (n-2) / 6`: the product reaches about $n^3$ before any division. For $n = 2000$ it is
   $7\,992\,004\,000 > 2^{32} - 1$, so it wraps modulo $2^{32}$ and the quotient is wrong.
2. `n * (n-1) / 2 * (n-2) / 3`: $n(n-1)$ is a product of two consecutive integers, so it is **even** and
   `/ 2` is exact; the result is $\binom{n}{2}$. Then $\binom{n}{2}(n-2) = 3\binom{n}{3}$, so `/ 3` is exact
   too. The largest intermediate value is $\binom{n}{2}(n-2) \approx n^3/2$, half the size of order 1.
3. `n * (n-1) / 3 * (n-2) / 2`: $n(n-1)$ is divisible by 3 only when $n \bmod 3 \ne 2$, so for $n = 5$ the
   first division truncates ($20/3 = 6$) and the answer comes out 9 instead of 10.

**The rule:** divide as early as possible, but only by a number that is guaranteed to divide the value
computed so far. **Sanity check:** for $n = 2000$ the lesson check prints 1 331 334 000 for order 2, which is
$\binom{2000}{3}$, and a wrapped value for order 1.
:::

:::trap{#trap-float-late title="Writing 6.0 at the end does not rescue an overflowing product" depth="standard"}
`p = n * (n-1) * (n-2) / 6.0` looks safe because it contains a floating constant, but C evaluates left to
right: `n * (n-1) * (n-2)` is computed entirely in `unsigned int` (both operands of each `*` are unsigned)
and has already wrapped before the division converts it to double. A conversion helps only if it happens
**before** the operation that overflows, as in `(double) n * (n-1) * (n-2) / 6`.
:::

:::note{#recap-arith title="Recap" depth="quick"}
`/` on integers truncates toward zero; `%` takes the sign of the dividend; `(a/b)*b + a%b == a`. Unsigned
arithmetic wraps modulo $2^n$ (defined); signed overflow is undefined; storing an out-of-range value into
a signed type keeps the low bits on our model. Divide early, but only exactly.
:::

### Worked examples: integer arithmetic

::::example{#ex-div-easy level="easy" title="Division and remainder with negative numbers" depth="quick"}
What do `17 / 5`, `17 % 5`, `-17 / 5`, `-17 % 5` and `17 / -5` evaluate to in C?

:::step{why="Integer division discards the fraction: 17/5 = 3.4 becomes 3."}
`17 / 5` = 3 and `17 % 5` = 17 − 3·5 = 2.
:::

:::step{why="Truncation is toward zero, so −3.4 becomes −3, not −4."}
`-17 / 5` = −3, and the remainder makes the identity hold: −17 − (−3)·5 = −2, so `-17 % 5` = −2.
:::

:::step{why="The same rule with the negative sign on the divisor."}
`17 / -5` = −3 (since 17/−5 = −3.4), and `17 % -5` = 17 − (−3)(−5) = 2.
:::

:::answer
3, 2, −3, −2, −3. The remainder always has the sign of the **dividend** (17 or −17), never of the
divisor. A mathematician's "mod" (always non-negative) would give `-17 mod 5` = 3; C's `%` gives −2.
:::
::::

::::example{#ex-div-mixed level="medium" title="Where the integer division hides" depth="standard"}
With `int x = 7, y = 2;`, evaluate `double d = x / y;`, `double e = (double) x / y;` and
`double f = 2.0 + x / y;`.

:::step{why="Both operands of / are int, so the division is an integer division; only the result is converted for the assignment."}
`x / y` = 3, converted to double: d = 3.0.
:::

:::step{why="The cast applies to x alone (a cast binds tighter than /), so / sees a double and an int and divides in double."}
`(double) x` = 7.0, and 7.0 / 2 = 3.5: e = 3.5.
:::

:::step{why="/ binds tighter than +, so x / y is evaluated first, as integers, before 2.0 is involved."}
`x / y` = 3, then 2.0 + 3 = 5.0: f = 5.0.
:::

:::answer
d = 3.0, e = 3.5, f = 5.0. The type of each operation is decided by **its own two operands**, not by the
type of the whole expression or of the variable that receives it. The fix is to convert an operand before
the division, never the result after it.
:::
::::

::::example{#ex-ncr-gate level="gate" title="Computing nC3 without overflow (GATE 2014)" depth="standard"}
`n` and `p` are `unsigned int` (32 bits). Which statement sets `p` to $\binom{n}{3}$ correctly for large
$n$: (A) `p = n*(n-1)*(n-2)/6;` (B) `p = n*(n-1)/2*(n-2)/3;` (C) `p = n*(n-1)/3*(n-2)/2;` (D)
`p = n*(n-1)*(n-2)/6.0;`?

:::step{why="Overflow happens at the first operation whose exact result exceeds 2^32 − 1; the order of evaluation is left to right."}
A and D both compute the full product $n(n-1)(n-2) \approx n^3$ first, in unsigned int. For $n = 2000$ that is
$7.99 \times 10^9 > 4.29 \times 10^9$: it wraps, and dividing afterwards cannot recover the lost bits.
:::

:::step{why="Check whether each early division is exact, i.e. divides the value computed so far."}
B: $n(n-1)$ is even, so `/2` is exact and gives $\binom{n}{2}$; $\binom{n}{2}(n-2) = 3\binom{n}{3}$, so `/3` is
exact. C: $n(n-1)$ is not always a multiple of 3 (for $n = 5$, 20 is not), so `/3` truncates.
:::

:::step{why="A numerical check makes the conclusion concrete."}
$n = 2000$: B gives 1 331 334 000 = $\binom{2000}{3}$, A and D give wrapped values; $n = 5$: C gives 9, not 10.
:::

:::answer
**(B)**. It is exact for every $n$ (both divisions are exact at the moment they happen) and its largest
intermediate value is half that of A. This is the GATE 2014 key.
:::
::::

::::example{#ex-wrap-edge level="gate" title="Edge case: a counter that wraps" depth="standard"}
`unsigned char u = 250;` How many times does `while (u != 4) { u++; n++; }` run? And what does
`signed char s = 127; s = s + 1;` store?

:::step{why="An unsigned char has 256 values arranged on a circle; u++ moves one step clockwise."}
From 250 the values go 251, 252, 253, 254, 255, then wrap to 0, 1, 2, 3, 4.
:::

:::step{why="Count the steps from 250 to 4 on the circle of 256: (4 − 250) mod 256."}
$(4 - 250) \bmod 256 = -246 + 256 = 10$ iterations.
:::

:::step{why="s + 1 is computed in int (128, no overflow there), and storing 128 into a signed char keeps the low 8 bits."}
`s + 1` = 128 as an int; converting 128 to signed char gives $128 - 256 = -128$.
:::

:::answer
10 iterations, and s = −128. Notice that no undefined behaviour occurred in either case: the unsigned
increment is modular by definition, and in the signed case the arithmetic was done in `int` (no overflow);
only the **conversion** back to `char` reduced the value, which our model defines as keeping the low bits.
:::
::::

## Conversions: promotion and the usual arithmetic conversions

:::intuition{#conversion-intuition title="Before two people talk, they agree on a language" depth="standard"}
A binary operator such as `+` or `<` needs both of its operands in the same type before it can work, just
as two people need a common language before they can talk. C has a fixed rule for choosing that common
type, and it applies it silently, without a warning. The rule is sensible most of the time ("use the
bigger type"), but it has one corner where intuition fails badly: when a negative signed number meets an
unsigned one, the unsigned type wins, and the negative number becomes a huge positive one.
:::

:::definition{#promotion term="Integer promotion" depth="standard"}
Before any arithmetic, C **promotes** every operand of a type narrower than `int` (`char`, `short`, and
their unsigned forms, `_Bool`) to `int` (to `unsigned int` only if `int` cannot hold all its values, which
never happens on our model). So in `char c = 100, d = 100;` the sum `c + d` is computed as an `int`: 200,
with `sizeof(c + d)` = 4. Only when the result is stored back into a `char` does it get reduced
(`char e = c + d;` stores −56). Unary `+`, `-`, `~` and the shift operators promote too.
:::

:::definition{#usual-conversions term="The usual arithmetic conversions" depth="standard"}
For an operator with two arithmetic operands (`* / % + - < > <= >= == != & ^ |` and `?:`), after promotion
C converts both to a **common type**:

1. If either operand is `double`, the other is converted to `double`; otherwise if either is `float`, to
   `float`.
2. Otherwise both are integers (already promoted). If they have the same type, that is the common type.
3. If they have the same signedness, the one of lower rank (`int` < `long` < `long long`) is converted to
   the higher.
4. If the **unsigned** operand has rank at least that of the signed one, the signed operand is converted
   to the unsigned type. (So `int` meeting `unsigned int` becomes `unsigned int`, and anything meeting a
   `size_t` becomes `size_t`.)
5. Otherwise the signed type is wider and can hold every value of the unsigned one (`long` meeting
   `unsigned int` on our model), so the unsigned operand is converted to the signed type.

Converting a negative value to an unsigned type adds $2^n$: −1 becomes $2^{32} - 1$ as an `unsigned int`.
:::

:::trap{#trap-signed-unsigned title="-1 < 1u is false, and 3 − 5 is not negative when lengths are size_t" depth="standard"}
`int i = -1; unsigned u = 1;` Then `i < u` is **0** (false): by rule 4, `i` is converted to unsigned int,
and −1 becomes 4 294 967 295, which is not less than 1. The same rule bites with `strlen`, which returns
the unsigned type `size_t`: `strlen("abc") - strlen("defgh")` is not −2 but $2^{64} - 2$ (or $2^{32} - 2$
when `size_t` is 32 bits), a huge positive number. GATE 2017 (set 1) built a whole question on this: the
expected wrong answer is 5 (as if the difference were negative), the right one is 3.

The safe habits: never compare a signed and an unsigned value without a cast; compare lengths with
`strlen(s) > strlen(t)` rather than subtracting them.
:::

:::definition{#float-int term="Floating and integer conversions" depth="standard"}
Converting a floating value to an integer type **truncates toward zero**: `int a = 7.9;` stores 7 and
`int b = -7.9;` stores −7 (undefined if the truncated value does not fit). Converting an integer to `double`
is exact for every value up to $2^{53}$. Assigning to a variable converts the value to the variable's type;
passing an argument to a function with a prototype converts it to the parameter's type; a **cast**
`(type) expr` converts explicitly and binds tighter than every binary operator.
:::

:::note{#recap-conv title="Recap" depth="quick"}
Narrow integers are promoted to int before arithmetic. Then: double beats float beats integers; among
integers the wider wins, and an unsigned of equal (or greater) rank beats a signed one, turning −1 into a
huge number. Floating → integer truncates toward zero. A cast converts one operand, before the operation.
:::

### Worked examples: conversions

::::example{#ex-promote-easy level="easy" title="Adding two chars" depth="quick"}
`char a = 'P', b = 3;` What are the type and value of `a + b`, and what does `printf("%c", a + b)` print?

:::step{why="Both operands are narrower than int, so both are promoted to int before the addition."}
`a + b` = 80 + 3 = 83, of type `int` (`sizeof(a + b)` = 4).
:::

:::step{why="%c converts its int argument to unsigned char and prints that character."}
83 is `'S'`.
:::

:::answer
An `int` of value 83, printed as `S`. Character arithmetic is ordinary integer arithmetic on the codes;
GATE 2022 used exactly this with `&`, `|` and `^` before adding `'*'`, `'-'` and `'+'`.
:::
::::

::::example{#ex-promote-gate level="medium" title="Where 300 becomes 44" depth="standard"}
`unsigned char a = 200, b = 100;` Give the value of `a + b`, of `unsigned char t = a + b;`, and of
`a + b > 255`.

:::step{why="Promotion to int happens first, so the sum is computed without any wrap-around."}
`a + b` = 300, an `int`.
:::

:::step{why="Storing into an 8-bit unsigned type reduces modulo 256."}
t = 300 mod 256 = **44**.
:::

:::step{why="The comparison uses the int value 300, not a reduced one."}
`a + b > 255` is 300 > 255 = 1 (true).
:::

:::answer
300, 44 and 1. The narrow type matters only where the value is **stored**; inside the expression the
arithmetic is done in int. This is why `if (a + b > 255)` correctly detects an "overflow" that a
`unsigned char` sum would hide.
:::
::::

::::example{#ex-strlen-gate level="gate" title="Comparing lengths through size_t (GATE 2017)" depth="standard"}
```c
void printlength(char *s, char *t) {
    unsigned int c = 0;
    int len = ((strlen(s) - strlen(t)) > c) ? strlen(s) : strlen(t);
    printf("%d\n", len);
}
```
What does `printlength("abc", "defgh")` print?

:::step{why="strlen returns size_t, an unsigned type, so the subtraction is unsigned."}
3 − 5 in unsigned arithmetic is $2^w - 2$, where $w$ is the width of `size_t` (64 here; the question says 32).
:::

:::step{why="Comparing with c = 0 (unsigned): any non-zero unsigned value is greater than 0."}
$(2^w - 2) > 0$ is true, so `?:` selects `strlen(s)`.
:::

:::step{why="The selected size_t value 3 is converted to int for len."}
len = 3, and `printf` prints **3**.
:::

:::answer
**3** (the GATE key). The trap answer 5 treats the difference as −2. For this function, any two strings of
different lengths make the condition true, so it always prints the length of the **first** string unless
the lengths are equal (then 0 > 0 is false and it prints `strlen(t)`, the same number).
:::
::::

::::example{#ex-long-edge level="gate" title="Edge case: when the signed type wins" depth="standard"}
On our model (`long` is 8 bytes), compare `int i = -1; unsigned u = 1;` with `long l = -1; unsigned u = 1;`:
what are `i < u` and `l < u`?

:::step{why="int and unsigned int have the same rank, so rule 4 converts the signed operand to unsigned."}
`i < u`: −1 becomes 4 294 967 295, and 4 294 967 295 < 1 is false: **0**.
:::

:::step{why="long has a higher rank than unsigned int and can hold all its values, so rule 5 converts u to long."}
`l < u`: u becomes the long 1, and −1 < 1 is true: **1**.
:::

:::answer
0 and 1. The same-looking comparison flips its answer when the signed operand is wider. On a 32-bit system
where `long` is also 4 bytes, `l < u` would be 0 again (rule 4: unsigned long). Questions that depend on
this always state the sizes; read them first.
:::
::::

## Operators, precedence and associativity

:::intuition{#operators-intuition title="Invisible brackets" depth="standard"}
When you read $2 + 3 \times 4$ you silently add brackets: $2 + (3 \times 4)$. C does the same with a much
longer list of operators. **Precedence** says which operator grabs its operands first (it puts the
brackets around the tighter one), and **associativity** settles ties between operators of the same level
(left to right for most, right to left for assignments, unary operators and `?:`). Precedence decides the
*shape* of the expression, the tree of who-applies-to-what. It does not, by itself, decide the order in
which the operands are computed; that is the subject of the next section.
:::

:::table{#precedence-table title="C operators, from tightest to loosest" depth="standard"}
| Level | Operators | Associativity |
|:--:|:--|:--|
| 1 | `()` call, `[]` index, `.` `->` member, postfix `x++` `x--` | left to right |
| 2 | prefix `++x` `--x`, unary `+` `-` `!` `~`, `*` (dereference), `&` (address), `sizeof`, casts `(type)` | right to left |
| 3 | `*` `/` `%` | left to right |
| 4 | `+` `-` | left to right |
| 5 | `<<` `>>` | left to right |
| 6 | `<` `<=` `>` `>=` | left to right |
| 7 | `==` `!=` | left to right |
| 8 | `&` (bitwise AND) | left to right |
| 9 | `^` (bitwise XOR) | left to right |
| 10 | `\|` (bitwise OR) | left to right |
| 11 | `&&` | left to right |
| 12 | `\|\|` | left to right |
| 13 | `?:` | right to left |
| 14 | `=` `+=` `-=` `*=` `/=` `%=` `<<=` `>>=` `&=` `^=` `\|=` | right to left |
| 15 | `,` (comma operator) | left to right |

A way to remember the middle: **arithmetic, then shift, then compare, then bits, then logic**. Two
consequences that examiners love: `x & 1 == 0` means `x & (1 == 0)`, which is `x & 0`, always 0; and
`1 << 2 + 1` means `1 << 3` = 8.
:::

The animation draws the invisible brackets of one expression as a tree, built by precedence, and then
evaluates the tree from the leaves up, with the promotions on the way.

:::viz{#expr-tree-viz spec="expr-tree-eval" mode="animate" depth="standard"}
:::

:::definition{#relational-logical term="Relational, equality and logical operators" depth="standard"}
`<`, `<=`, `>`, `>=`, `==` and `!=` compare their operands (after the usual conversions) and yield an `int`:
**1 if true, 0 if false**. `!x` is 1 if `x` is 0 and 0 otherwise, so `!!x` turns any non-zero value into 1.
`&&` and `||` treat any non-zero operand as true and also yield 0 or 1. Because the results are plain
ints, they can be added and compared: `3 < 2 < 1` means `(3 < 2) < 1`, that is `0 < 1`, which is 1
(true), although mathematically $3 < 2 < 1$ is false. (Recent compilers refuse such chained comparisons
unless warnings are relaxed, precisely because they mislead.) In Pascal the same operators yield the type
Boolean, as GATE 1991 used.
:::

:::definition{#incdec term="Increment and decrement" depth="standard"}
`++x` adds 1 to `x` and the **expression** has the **new** value; `x++` adds 1 to `x` and the expression has
the **old** value. `--x` and `x--` are the same with −1. As a statement on its own (`x++;` or `++x;`) the two
forms do the same thing, because the value of the expression is thrown away. The operand must be a
modifiable variable (an lvalue): `5++` and `(a + b)++` are errors.

With `int m = 5;`, `int a = m++;` stores 5 in `a` and makes m = 6; then `int b = ++m;` makes m = 7 and stores
7 in `b`.
:::

:::definition{#assignment-expr term="Assignment is an expression" depth="standard"}
`x = e` stores the value of `e` (converted to the type of `x`) into `x`, and the whole expression has that
stored value. That is why `a = b = 0` works: it groups right to left as `a = (b = 0)`. A **compound
assignment** `x op= e` means `x = x op (e)`, with `x` evaluated once and `e` in brackets: `a *= b + 1` is
`a = a * (b + 1)`, not `a = a * b + 1`. Example: `int a = 2, b = 3; a += b *= 2;` groups as
`a += (b *= 2)`: b becomes 6, then a becomes 8.
:::

:::definition{#ternary term="The conditional operator" depth="standard"}
`c ? x : y` evaluates `c` first; if it is non-zero the result is `x`, otherwise `y`, and **only the chosen
one is evaluated**. It groups right to left, so `a ? b : c ? d : e` means `a ? b : (c ? d : e)`. Nested
conditionals compute small decision trees; the GATE 2008 expression
`(x > y) ? ((x > z) ? x : z) : ((y > z) ? y : z)` is the maximum of three numbers.
:::

:::definition{#bitwise term="Bitwise operators and shifts" depth="standard"}
On integers (after promotion), `&`, `|` and `^` work bit by bit (AND, OR, exclusive OR) and `~` flips every
bit. `x << k` shifts the bits left by $k$ places, filling with zeros: for non-negative $x$ that is
$x \cdot 2^k$ when the result fits. `x >> k` shifts right: for non-negative $x$ that is $\lfloor x / 2^k
\rfloor$. Shifting by a negative amount or by at least the width of the type is undefined, left-shifting a
negative value is undefined, and right-shifting a negative value is implementation-defined (arithmetic on
every common machine). Useful identities for $x > 0$: `x & 1` is the last bit (odd test); `x & (x - 1)`
clears the lowest 1 bit (so it is 0 exactly for powers of two); `x & -x` isolates the lowest 1 bit; `x ^ x`
is 0.
:::

:::theorem{#bit-length name="The halving loop counts the bits" depth="standard"}
For an integer $n > 0$, the loop `while (n) { count++; n >>= 1; }` executes exactly
$\lfloor \log_2 n \rfloor + 1$ times, the number of binary digits of $n$.
:::

:::proof{#proof-bit-length of="the bit-length theorem" depth="standard"}
**Idea first:** each shift deletes the last binary digit; the loop stops when no digits remain.

Write $n$ in binary with $L$ digits, the first of them 1, so $2^{L-1} \le n < 2^L$, which gives
$L - 1 \le \log_2 n < L$, i.e. $L = \lfloor \log_2 n \rfloor + 1$. One right shift of a positive number removes
its last digit and leaves $L - 1$ digits (with the leading 1 still first, if any remain). After $L - 1$
shifts one digit, the leading 1, remains, so $n = 1 \ne 0$ and the loop runs again; after the $L$-th shift
$n = 0$ and the loop stops. Each iteration increments count once, so count $= L$. ∎

**Sanity check.** $n = 1$: one iteration ($\lfloor \log_2 1 \rfloor + 1 = 1$). $n = 435 = 110110011_2$: nine
iterations, the GATE 2014 answer. The lesson check compares the formula with the compiled loop for nine
values of $n$ up to $2^{30}$.
:::

:::viz{#shift-halving-viz spec="shift-halving" mode="animate" depth="standard"}
:::

:::definition{#comma-op term="The comma operator" depth="standard"}
`e1, e2` evaluates `e1`, discards its value, then evaluates `e2`; the whole expression has the value and
type of `e2`, and everything `e1` does is complete before `e2` starts. It has the lowest precedence of all,
so `a = 1, 2;` is `(a = 1), 2` (a becomes 1), while `a = (b = 3, b + 4);` makes b = 3 and a = 7. The commas
that separate function arguments and declarations are **not** comma operators.
:::

:::definition{#sizeof-op term="sizeof" depth="standard"}
`sizeof expr` or `sizeof(type)` gives a size in bytes, of type `size_t`, computed from the **type** of the
operand at compile time: the operand is **not evaluated** (except for variable-length arrays). So after
`int i = 1; size_t s = sizeof(i++);` s is 4 and i is still 1.
:::

:::note{#recap-ops title="Recap" depth="quick"}
Order of binding: postfix, unary, `* / %`, `+ -`, shifts, relational, equality, `&`, `^`, `|`, `&&`, `||`,
`?:`, assignments, comma. Comparisons give int 0/1. `x++` yields the old value, `++x` the new. `x op= e` is
`x = x op (e)`. Shifts multiply and divide by powers of two; the halving loop runs ⌊log₂ n⌋ + 1 times.
:::

### Worked examples: operators

::::example{#ex-incdec-gate level="easy" title="Pre- and post-increment (GATE 2017)" depth="quick"}
```c
int m = 10; int n, n1;
n = ++m; n1 = m++; n--; --n1; n -= n1;
printf("%d", n);
```

:::step{why="++m increments first and gives the new value."}
m = 11, n = 11.
:::

:::step{why="m++ gives the old value, then increments."}
n1 = 11, m = 12.
:::

:::step{why="As statements, n-- and --n1 just subtract 1; then n -= n1 is n = n − n1."}
n = 10, n1 = 10, then n = 0.
:::

:::answer
**0** (GATE 2017, set 2). The only place where pre and post differ is when the value of the expression is
used, here in the two assignments, and both happened to give 11.
:::
::::

::::example{#ex-ternary-gate level="medium" title="The maximum of three (GATE 2008)" depth="standard"}
For which of (A) x = 3, y = 4, z = 2, (B) 6, 5, 3, (C) 6, 3, 5, (D) 5, 4, 5 does
`a = (x > y) ? ((x > z) ? x : z) : ((y > z) ? y : z)` set a = 4?

:::step{why="Read the tree: the outer test chooses between max(x, z) and max(y, z) depending on whether x > y."}
If x > y, then x is a candidate and y is not, so the larger of x and z is the maximum; otherwise y beats x and
the larger of y and z is the maximum. The expression is max(x, y, z).
:::

:::step{why="Compute the maximum of each triple."}
A: 4; B: 6; C: 6; D: 5.
:::

:::step{why="Trace A to make sure the reading is right."}
3 > 4 is false, so evaluate `(4 > 2) ? 4 : 2` = 4.
:::

:::answer
**(A)**. Recognising the structure (a decision tree for the maximum) answers the question without tracing
all four triples.
:::
::::

::::example{#ex-bits-gate level="gate" title="Bits of characters (GATE 2022)" depth="standard"}
`char a = 'P', b = 'x';` (80 and 120). What does
`printf("%c %c %c\n", (a & b) + '*', (a | b) - '-', (a ^ b) + '+');` print (`'*'` = 42, `'-'` = 45,
`'+'` = 43)?

:::step{why="Bitwise operators work on the binary codes."}
80 = 0101 0000 and 120 = 0111 1000. AND = 0101 0000 = 80, OR = 0111 1000 = 120, XOR = 0010 1000 = 40.
:::

:::step{why="& | ^ bind looser than + and −, which is why the question puts brackets around them."}
80 + 42 = 122, 120 − 45 = 75, 40 + 43 = 83.
:::

:::step{why="%c prints the character with that code."}
122 = `z`, 75 = `K`, 83 = `S`.
:::

:::answer
**z K S**. Notice the shortcut: the two codes differ exactly in the bits worth 32 and 8 (their XOR is 40),
so AND keeps the smaller code 80 and OR gives the larger 120.
:::
::::

::::example{#ex-prec-edge level="gate" title="Edge case: precedence traps" depth="standard"}
With `int x = 6;`, evaluate `x & 1 == 0`, `1 << 2 + 1`, `x > 3 == 1` and `x = 7, 8` (as a statement, then
print x).

:::step{why="== binds tighter than &."}
`x & 1 == 0` is `x & (1 == 0)` = `6 & 0` = **0**, although 6 is even (the intended test was `(x & 1) == 0`).
:::

:::step{why="+ binds tighter than <<."}
`1 << 2 + 1` is `1 << 3` = **8**, not `(1 << 2) + 1` = 5.
:::

:::step{why="Relational operators bind tighter than equality."}
`x > 3 == 1` is `(x > 3) == 1` = `1 == 1` = **1**.
:::

:::step{why="The comma operator has the lowest precedence of all, below assignment."}
`x = 7, 8` is `(x = 7), 8`, so x = **7**.
:::

:::answer
0, 8, 1 and x = 7. Every one of these is legal C that a compiler accepts (sometimes with a warning), and
every one has a "natural" reading that is wrong. When in doubt, add the brackets you mean.
:::
::::

## Evaluation order, short circuits and side effects

:::intuition{#order-intuition title="A recipe that does not say which vegetable to chop first" depth="standard"}
A recipe that says "add the chopped onion to the chopped carrot" fixes the *shape* of the dish but not
which one you chop first. If chopping has no side effects, nobody cares. C's expressions are like that
recipe: `f() + g()` must add the two results, but C does not say whether `f` or `g` is called first. That
freedom is harmless until the two parts **interact**, for example both print something, or both change the
same variable. For a few operators, `&&`, `||`, `?:` and the comma, C does promise an order, and for `&&`,
`||` and `?:` it even promises that some parts are **skipped**. Those promises are where GATE's best C
questions live.
:::

:::definition{#short-circuit term="Short-circuit evaluation" depth="standard"}
- `a && b`: `a` is evaluated first. If `a` is 0, the result is 0 and **`b` is not evaluated at all**.
  Otherwise `b` is evaluated and the result is `b != 0`.
- `a || b`: `a` first. If `a` is non-zero, the result is 1 and **`b` is not evaluated**. Otherwise the
  result is `b != 0`.
- `c ? x : y`: `c` first; then exactly one of `x` and `y`.

Everything the left operand does (including side effects such as `i++`) is complete before the right
operand starts. With `int a = 2, b = 3, c = 4;`, the condition `a < b || ++a < c` is true and a is still 2:
the `++a` never ran.
:::

:::theorem{#sc-theorem name="When the right operand runs" depth="standard"}
In `a && b`, the right operand `b` is evaluated exactly when `a` is non-zero; in `a || b`, exactly when
`a` is zero. Consequently, in a loop that evaluates `p && q` once per iteration, `q`'s side effects happen
once for each iteration in which `p` is true, and never otherwise.
:::

:::proof{#proof-sc of="the short-circuit rule" depth="standard"}
**Idea first:** the left operand alone decides the result in half of the cases, and C promises not to look
further in those cases.

For `&&`: if $a = 0$ the result is 0 whatever $b$ is, and the C standard (§6.5.13) says "if the first operand
compares equal to 0, the second operand is not evaluated"; if $a \ne 0$ the result depends on $b$, so $b$
must be evaluated. For `||` (§6.5.14) the roles of 0 and non-zero swap. The loop statement follows by
applying this to each iteration separately. ∎

**Check by compilation.** `int i = 0, j = 5; int r = i++ && j++;` prints r = 0, i = 1, j = 5: the left
operand `i++` ran (and produced the old value 0), the right one did not.
:::

The animation traces GATE 2021's loop: for each value of j it shows whether the right operand `i++` ran,
the value it produced, and the running count.

:::viz{#short-circuit-viz spec="short-circuit-loop" mode="animate" depth="standard"}
:::

:::definition{#sequence-points term="Sequence points, unsequenced side effects and unspecified order" depth="standard"}
A **side effect** is a change to a variable (or output). C guarantees that the side effects of one part of
an expression are complete before another part starts only at **sequence points**: after the left operand
of `&&`, `||`, `?:` and `,`; after evaluating all arguments of a function call, before the call; and at the
end of every full expression (a statement's expression, a condition). Two rules follow:

1. **Unsequenced modification is undefined.** If one variable is modified twice, or modified and also read
   for another purpose, between two sequence points, the behaviour is undefined: `i = i++;`,
   `i = i++ + ++i;`, `a[i] = i++;` and `printf("%d %d", i++, i++);` have **no** correct output. Different
   compilers (and the same compiler at different optimisation levels) print different numbers.
2. **The order of evaluation of operands is unspecified** (except for the four operators above). In
   `f() + g()` and in the arguments of `f(g(10), h(20))` the compiler may evaluate either side first. The
   program is valid; its output may depend on that choice. A question can only have one answer if it states
   the order, as GATE 2024 (set 2) did ("assume parameters are evaluated from right to left").
:::

:::table{#ub-catalogue title="Undefined, unspecified and implementation-defined: what each means" depth="standard"}
| Kind | Meaning | Examples |
|:--|:--|:--|
| **Undefined** behaviour | The standard imposes no requirement: anything may happen, including "seems to work". A question about it has no correct output. | signed overflow; `x / 0`, `x % 0`; `i = i++`; reading an uninitialised local; shifting by ≥ the width; a negative left shift |
| **Unspecified** behaviour | Several outcomes are allowed; the implementation need not document which. Valid program, possibly varying output. | order of evaluating operands and function arguments |
| **Implementation-defined** | Allowed outcomes, and the implementation must document its choice. | `sizeof(int)`, signedness of plain `char`, right shift of a negative value, converting an out-of-range value to a signed type |
:::

:::trap{#trap-compiler-dependent title="\"It is compiler dependent\" is not an answer" depth="standard"}
Several sets of revision notes label `a = a++ + ++a` "compiler dependent" and then quote one compiler's
output as if it were the answer. It is **undefined**: not a choice among a few outputs, but no meaning at
all. In an exam, an option such as "the output is unspecified / undefined" is the right one when a variable
is modified twice without a sequence point. Conversely, `printf("%d", f() + g())` with printing functions
is a perfectly valid program whose output is merely unspecified, and the question must fix the order.
:::

:::note{#recap-order title="Recap" depth="quick"}
`&&`, `||`, `?:`, `,` evaluate left first; `&&` skips the right side when the left is 0, `||` when it is
non-zero. Elsewhere the order of operands is unspecified. Modifying one variable twice between sequence
points is undefined. Questions with a definite answer either avoid both or state the order.
:::

### Worked examples: evaluation order

::::example{#ex-sc-easy level="easy" title="A skipped increment" depth="quick"}
`int a = 2, b = 3, c = 4; if (a < b || ++a < c) printf("%d %d %d", a, b, c);` What is printed?

:::step{why="|| evaluates its left operand first."}
`a < b` is 2 < 3, true (1).
:::

:::step{why="With a true left operand, || is already true and skips the right operand."}
`++a < c` is never evaluated, so a stays 2.
:::

:::answer
`2 3 4`. A student who evaluates both sides "because ++ has higher precedence" prints `3 3 4`. Precedence
only decides the grouping, `(a < b) || ((++a) < c)`; the short circuit decides whether the right group runs.
:::
::::

::::example{#ex-sc-gate level="medium" title="Short circuit inside a loop (GATE 2021)" depth="standard"}
```c
count = 0; i = 0;
for (j = -3; j <= 3; j++)
    if ((j >= 0) && (i++))
        count = count + j;
count = count + i;
```
What is count at the end?

:::step{why="For j = −3, −2, −1 the left operand is false, so i++ is skipped."}
i = 0, count = 0 after three iterations.
:::

:::step{why="For j = 0 the right operand runs, yielding the old value of i, which is 0 (false)."}
i becomes 1; the condition is false; count stays 0.
:::

:::step{why="For j = 1, 2, 3 the old values of i are 1, 2, 3 (true), so count adds j each time."}
count = 1 + 2 + 3 = 6; i = 4.
:::

:::step{why="The final statement adds i."}
count = 6 + 4 = 10.
:::

:::answer
**10** (option B). The two traps are counted in the other options: evaluating `i++` for every j (i = 7,
giving 13) and treating j = 0 as adding (which needs the new value of i).
:::
::::

::::example{#ex-args-gate level="gate" title="Arguments evaluated right to left (GATE 2024)" depth="standard"}
`g` and `h` print their argument and return it; `f(x, y)` calls `g(x)` then `h(y)`. With right-to-left
argument evaluation, what does `f(g(10), h(20))` print?

:::step{why="All arguments are evaluated before the call; the question fixes the order: right to left."}
`h(20)` prints 20, then `g(10)` prints 10.
:::

:::step{why="Inside f the two calls are separate statements, which always run in order."}
`g(10)` prints 10, then `h(20)` prints 20.
:::

:::answer
**20101020** (option A). With left-to-right evaluation (which the compiler used by the lesson check
happens to choose) the output would be 10201020: same program, different but equally valid output.
That is what "unspecified" means.
:::
::::

::::example{#ex-ub-edge level="gate" title="Edge case: which of these have a defined output?" depth="standard"}
With `int i = 5;`, classify: (1) `i = i++;` (2) `i = i + 1;` (3) `j = i++ + i++;` (4) `j = (i++, i++);`
(5) `j = i++ && i++;`.

:::step{why="i is modified twice (by ++ and by =) with no sequence point in between."}
(1) undefined; (3) undefined (two increments of i, unsequenced).
:::

:::step{why="Reading i to compute the new value of i is allowed: the read is needed for the write."}
(2) defined: i = 6.
:::

:::step{why="The comma operator and && put a sequence point after their left operand."}
(4) defined: the first `i++` completes (i = 6), the second yields 6 and makes i = 7, so j = 6. (5) defined:
`i++` yields 5 (true), sequence point, the second `i++` yields 6 (true), so j = 1 and i = 7.
:::

:::answer
Undefined: (1) and (3). Defined: (2) i = 6; (4) j = 6, i = 7; (5) j = 1, i = 7. The lesson check confirms that
the compiler refuses (1) under `-Werror=unsequenced`, and the C Tracer below reports such a statement as
undefined instead of printing a number.
:::
::::

## Booleans in other languages: Pascal and FORTRAN

:::definition{#pascal-boolean term="Booleans and precedence in Pascal and FORTRAN" depth="standard"}
Old GATE papers (before about 2000) used Pascal and FORTRAN. Two facts are enough for them:

- **Pascal** has a real `Boolean` type: `x > 5` has the value `true` or `false`, and can be assigned
  (`y := x > 5`), so `if x > 5 then y := true else y := false` is just `y := x > 5` (GATE 1991). In Pascal,
  `and`/`or` bind *tighter* than the relational operators, so `(x > 0) and (y > 0)` needs its brackets.
- **FORTRAN** writes powers as `**`, which binds tighter than everything, including unary minus:
  `-2**2` is $-(2^2) = -4$. Integer division truncates (`3/4` is 0), `*` and `/` group left to right, and
  assigning a REAL to an INTEGER variable (names starting with I to N) truncates. GATE 1993:
  `I = -2**2 + 5.0*X/X*3 + 3/4` with X = 4.0 is −4 + 15.0 + 0 = 11.
:::

## Try it: the expression evaluator

The **Expression** tab of the C Tracer evaluates any C expression after the declarations you type,
operator by operator: the value and type of every operand, the conversions applied, and the operands that
`&&`, `||` and `?:` did **not** evaluate. Its interpreter is tested against the real C compiler on every
program in this chapter. Try `i < u` with `unsigned int u = 1; int i = -1;`, then `a < b || ++a < c`, then
`x & 1 == 0` with `int x = 6;`.

:::lab{#lab-expr lab="c-tracer" tab="expr" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1991-a-4-i" tests="pascal-boolean,relational-logical" depth="standard"}
:::

:::pyq{id="cse-1993-a-2-5" tests="precedence-table,pascal-boolean,int-division" depth="standard"}
:::

:::pyq{id="it-2004-it-15" tests="int-division,ub-catalogue" depth="standard"}
:::

:::pyq{id="cse-2008-cs-18" tests="ternary,ex-ternary-gate" depth="standard"}
:::

:::pyq{id="cse-2014-2-cs-10" tests="bitwise,bit-length" depth="standard"}
:::

:::pyq{id="cse-2014-2-cs-11" tests="unsigned-wrap,overflow-order,trap-float-late" depth="standard"}
:::

:::pyq{id="cse-2017-1-cs-53" tests="usual-conversions,trap-signed-unsigned" depth="standard"}
:::

:::pyq{id="cse-2017-2-cs-54" tests="incdec,assignment-expr" depth="standard"}
:::

:::pyq{id="cse-2021-1-cs-37" tests="short-circuit,sc-theorem,incdec" depth="standard"}
:::

:::pyq{id="cse-2022-cs-34" tests="char-is-int,bitwise" depth="standard"}
:::

:::pyq{id="cse-2024-2-cs-3" tests="sequence-points,ub-catalogue" depth="standard"}
:::

## Practice

Our own questions in GATE formats, every answer produced by compiling the code: types and arithmetic first,
then conversions and operators, then evaluation order.

:::practice{id="nx-pds-01-01-q01" depth="standard"}
:::

:::practice{id="nx-pds-01-01-q02" depth="standard"}
:::

:::practice{id="nx-pds-01-01-q03" depth="standard"}
:::

:::practice{id="nx-pds-01-01-q04" depth="standard"}
:::

:::practice{id="nx-pds-01-01-q05" depth="standard"}
:::

:::practice{id="nx-pds-01-01-q06" depth="standard"}
:::

:::practice{id="nx-pds-01-01-q07" depth="standard"}
:::

:::practice{id="nx-pds-01-01-q08" depth="standard"}
:::

:::practice{id="nx-pds-01-01-q09" depth="standard"}
:::

:::practice{id="nx-pds-01-01-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Types, operators and expressions on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Sizes (our model) | char 1, short 2, int 4, long 8, pointer 8; `'A'` has type int |
| Ranges | unsigned $0 … 2^n - 1$; signed $-2^{n-1} … 2^{n-1} - 1$ |
| Constants | `011` is octal 9; `0x1F` is 31; `'0'` 48, `'A'` 65, `'a'` 97 |
| Integer `/` and `%` | truncate toward zero; `%` has the dividend's sign; `(a/b)*b + a%b == a` |
| Overflow | unsigned wraps mod $2^n$ (defined); signed overflow undefined; divide early but exactly (2014) |
| Conversions | promote to int; double > float > integers; unsigned of equal rank beats signed: `-1 < 1u` is 0; size_t differences never negative (2017: 3) |
| Precedence | postfix, unary, `* / %`, `+ -`, shifts, relational, equality, `&`, `^`, `\|`, `&&`, `\|\|`, `?:`, `=`, `,` |
| `++` / `--` | `x++` yields old, `++x` new (2017: 0) |
| Bits | `x >> 1` halves; the shift loop runs ⌊log₂ n⌋ + 1 times (2014: 9); ASCII bit tricks (2022: z K S) |
| Short circuit | `&&` skips the right side if the left is 0, `\|\|` if non-zero (2021: 10) |
| Order | operands' order unspecified (2024 fixes right to left: 20101020); `i = i++` is undefined |
:::
