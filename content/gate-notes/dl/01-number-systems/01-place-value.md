---
id: place-value
subject: dl
chapter: number-systems
title: Place value and changing bases
order: 1
prerequisites: []
pyq_topics: [dl/number]
est_minutes: 55
difficulty: basic
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every value is checked by content/gate-notes/_checks/dl/l01_place_value.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 8–14, set B pp. 138–141, set C pp. 202–207, set D p. 402."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (number systems chapter); D. E. Knuth, TAOCP vol. 2 §4.1 (positional notation, uniqueness)."
  - "PYQs: src/gate/questions.json (dl/number), keys re-derived in l01_place_value.py."
updated: "2026-10-17"
---

Every number a digital system stores is a row of digits, and every digit means *how many* of
something. In this lesson you learn to read a numeral in **any** base, to write any number in
any base, to move between bases, to count how many digits a number needs, and to solve the GATE
puzzles where the base itself is the unknown. By the end, a question like "for which base $b$
is $(312)_b \div (20)_b = (13.1)_b$?" will be a two-minute calculation, not a guess.

## Where this fits

This is the first lesson of Digital Logic, and almost everything later leans on it. Binary,
octal and hexadecimal (next lesson) are just bases 2, 8 and 16. Fractions and fixed point
(Lesson 3) extend place value to the right of the point. Signed numbers (Lesson 4) reuse the
same digits with one place given a negative weight. Later chapters read counter states, memory
addresses and IEEE-754 fields with exactly the tools built here.

:::table{#radar title="GATE radar: place value and base conversion" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 11 (1993–2024), about one every three years |
| Marks | 7 one-mark, 4 two-mark |
| Formats | 5 NAT, 4 MCQ, 1 MSQ, 1 fill-in |
| Pattern 1 | Convert between two bases (often through decimal): 1993, 2021, 2023, 2024 |
| Pattern 2 | Find an unknown base from an equation: 1997, 2008, 2014, 2017 |
| Pattern 3 | Two unknown bases or digits: test candidate pairs (2004) or count the solutions under digit limits (2014, 2015) |
| What examiners test | The digit limit (a digit must be smaller than its base) and reading remainders in the right order |
:::

## The idea: a digit counts bundles

:::intuition{#bundles title="Digits count bundles, positions name the bundle size" depth="standard"}
Think of a shop that only uses bundles of three: loose items, packets of 3, boxes of 3 packets
(9 items), crates of 3 boxes (27 items). To record 46 items you fill crates first: one crate
(27), then two boxes (18), no packets, and one loose item. The record reads **1 2 0 1**.

Each position holds the number of bundles of one size, and the sizes grow by the same factor
(here 3) as you move left. A position can never hold 3 or more, because three of anything
would be packed into one bundle of the next size. That one rule, "pack as soon as you reach
the base", is all of positional notation. Our everyday decimal is the same shop with bundles
of ten.
:::

An odometer is the same shop in motion. Watch a counter whose wheels only know the digits 0, 1
and 2: when a wheel would reach 3 it rolls back to 0 and nudges its neighbour forward.

:::viz{#odometer spec="odometer-rollover" mode="animate" depth="standard"}
:::

Notice what the counter shows after three counts: **10**. In base 3, "10" means one bundle of
three and nothing loose, which is three. That is why "10" means *the base itself* in every base:
ten in decimal, two in binary, sixteen in hexadecimal.

:::definition{#place-value-def term="Positional numeral in base b" depth="quick"}
Fix a whole number $b \ge 2$, the **base** (also called the **radix**). A base-$b$ numeral
is a string of digits $d_k d_{k-1} \dots d_1 d_0$, optionally followed by a radix point and
more digits $d_{-1} d_{-2} \dots$, where every digit satisfies $0 \le d_i \le b-1$.
Its value is

$$
(d_k \dots d_1 d_0 . d_{-1} d_{-2} \dots)_b \;=\; \sum_i d_i \, b^{\,i}.
$$

- $d_i$ is the digit in position $i$, counted from $0$ just left of the point.
- $b^{\,i}$ is the **place value** (weight) of position $i$: $\dots, b^2, b, 1, b^{-1}, b^{-2}, \dots$
- Digits ten to thirty-five are written A to Z, so in hexadecimal A = 10, B = 11, …, F = 15.
- The subscript names the base: $(1201)_3$, $(2D)_{16}$. A numeral with no subscript is decimal.
:::

Here is that definition doing its work: the same four digits, first read in base 3 and then
in base 5. Only the place values change.

:::viz{#strip spec="place-value-strip" mode="animate" depth="standard"}
:::

:::definition{#digit-limit term="The digit limit: every digit is smaller than its base" depth="quick"}
In base $b$ the only digits are $0, 1, \dots, b-1$. A numeral that contains a digit $d$ is a
valid base-$b$ numeral only when $b > d$, so **the base is at least one more than the largest
digit**. For example $(4072)_b$ forces $b \ge 8$, and $(19)_8$ is not an octal numeral at all.
:::

Why insist on this? Two reasons, and both matter for GATE. First, a digit equal to $b$ or more
would be a full bundle that should have been carried into the next place, so allowing it would
let one number have several spellings ($(13)_2$ would equal $(101)_2$). Second, in every
"find the base" question the digit limit is the condition that throws away fake solutions. The
equation alone is never the whole question.

::::check{#check-limit title="Spot the invalid numerals" depth="standard"}
Which of these are valid numerals? $(3021)_3$, $(777)_8$, $(1G)_{16}$, $(10)_2$.

:::answer
$(777)_8$ and $(10)_2$ are valid. $(3021)_3$ uses the digit 3, which needs base 4 or more.
$(1G)_{16}$ uses G = 16, which needs base 17 or more.
:::
::::

:::note{#recap-idea title="Recap" depth="quick"}
A digit says how many bundles; its position says which bundle size, $b^{\,i}$. Every digit is
at most $b-1$, so the base exceeds the largest digit. "10" in base $b$ is $b$ itself.
:::

## Reading a numeral: base b to decimal

To find the value of a numeral, you simply add up digit × place value. There are two ways to
organise that sum, and you should be fluent in both.

:::derivation{#expansion of="the value of a numeral, and Horner's form" depth="quick"}
**Expansion.** By the definition, a numeral with digits $d_k \dots d_0$ is worth

$$
N = d_k b^k + d_{k-1} b^{k-1} + \dots + d_1 b + d_0 .
$$

**Horner's form.** Every term except the last has a factor $b$, so take it out. Inside the
bracket every term except the last again has a factor $b$; take it out again, and repeat:

$$
\begin{aligned}
N &= \big(d_k b^{k-1} + d_{k-1} b^{k-2} + \dots + d_1\big)\, b + d_0 \\
  &= \Big(\big(d_k b^{k-2} + \dots + d_2\big)\, b + d_1\Big)\, b + d_0 \\
  &= \Big(\dots\big((d_k\, b + d_{k-1})\, b + d_{k-2}\big)\, b + \dots\Big)\, b + d_0 .
\end{aligned}
$$

So you can read a numeral left to right with a single running total $t$: start with $t = 0$
and, for each digit $d$, replace $t$ by $t \cdot b + d$. After the last digit, $t = N$.

**Sanity check.** For $(1201)_3$ the expansion gives $27 + 18 + 0 + 1 = 46$, and the chain
gives $0 \to 1 \to 1\cdot 3 + 2 = 5 \to 5 \cdot 3 + 0 = 15 \to 15 \cdot 3 + 1 = 46$. The two
forms agree, as they must, because they are the same sum with the brackets moved.

**Fraction digits.** A digit $d_{-j}$ after the point is worth $d_{-j}\, b^{-j}$, so
$(0.8)_{16} = 8/16 = 0.5$ and $(0.101)_2 = \tfrac12 + \tfrac18 = 0.625$.
:::

:::viz{#horner spec="horner-chain" mode="animate" depth="standard"}
:::

:::trick{#trick-horner title="Horner by hand: multiply, add, repeat" depth="standard"}
Keep one running total. For each digit, multiply the total by the base and add the digit.
For $(11010)_2$: $1 \to 3 \to 6 \to 13 \to 26$.

**Why it works:** it is the bracketed form from the [derivation](#expansion), evaluated from the
inside out. **When it fails:** never for whole numbers. For fraction digits it does not apply
directly; read those by place value (or run Horner on the digits and divide by $b^{\,f}$, where
$f$ is the number of fraction digits).
:::

### Worked examples: base b to decimal

::::example{#ex-dec-binary level="easy" title="A binary numeral" depth="quick"}
Find the decimal value of $(11010)_2$.

:::step{why="Each position is worth a power of the base. Writing the weights first stops you from losing a place."}
Write the place values under the digits, starting with $2^0 = 1$ on the right.

$$
\begin{array}{ccccc}
1 & 1 & 0 & 1 & 0 \\
16 & 8 & 4 & 2 & 1
\end{array}
$$
:::

:::step{why="A digit contributes digit × place value, so the 0 digits contribute nothing and can be skipped."}
Add the place values that sit under a 1: $16 + 8 + 2 = 26$.
:::

:::step{why="A second method catches slips. Horner reads left to right: double the total and add the bit."}
Check with Horner: $1 \to 2\cdot1+1 = 3 \to 2\cdot3+0 = 6 \to 2\cdot6+1 = 13 \to 2\cdot13+0 = 26$.
:::

:::answer
$(11010)_2 = 26$
:::
::::

::::example{#ex-dec-octal level="easy" title="An octal numeral by Horner" depth="standard"}
Find the decimal value of $(257)_8$.

:::step{why="Horner avoids computing 8² separately: one multiply and one add per digit."}
Start with total $0$. First digit 2: $0 \cdot 8 + 2 = 2$.
:::

:::step{why="Same move for the next digit: the earlier digits are pushed up one place by the ×8."}
Next digit 5: $2 \cdot 8 + 5 = 21$.
:::

:::step{why="The last digit is the units digit, so it is added without being multiplied again."}
Last digit 7: $21 \cdot 8 + 7 = 175$.
:::

:::step{why="Expanding by powers is an independent route to the same value."}
Check by expansion: $2 \cdot 64 + 5 \cdot 8 + 7 = 128 + 40 + 7 = 175$.
:::

:::answer
$(257)_8 = 175$
:::
::::

::::example{#ex-dec-hex level="medium" title="A hexadecimal numeral with letter digits" depth="standard"}
Find the decimal value of $(3C7)_{16}$.

:::step{why="Letter digits are just two-digit numbers in disguise; translate them before any arithmetic."}
Translate the digits: 3, C = 12, 7.
:::

:::step{why="The places in base 16 are 16² = 256, 16 and 1."}
Expand: $3 \cdot 256 + 12 \cdot 16 + 7 = 768 + 192 + 7$.
:::

:::step{why="Add carefully; hex questions are mostly lost on the arithmetic, not the idea."}
Total: $768 + 192 + 7 = 967$.
:::

:::step{why="Horner gives the same total from the other direction."}
Check: $3 \to 3\cdot16+12 = 60 \to 60\cdot16+7 = 967$.
:::

:::answer
$(3C7)_{16} = 967$
:::
::::

::::example{#ex-dec-chain level="gate" title="Base 3 to hexadecimal, through decimal" depth="standard"}
A number is written $(2120)_3$. Write it in hexadecimal.

:::step{why="Bases 3 and 16 share no common power, so there is no grouping shortcut; decimal is the bridge."}
Expand in base 3: $2 \cdot 27 + 1 \cdot 9 + 2 \cdot 3 + 0 = 54 + 9 + 6 + 0 = 69$.
:::

:::step{why="Repeated division by 16 produces the hex digits from the lowest up."}
Divide by 16: $69 = 16 \cdot 4 + 5$, then $4 = 16 \cdot 0 + 4$.
:::

:::step{why="The first remainder is the units digit, so the remainders are read from the last to the first."}
Read the remainders upward: $4, 5$. So the hex numeral is $45$.
:::

:::step{why="Converting back is the cheapest way to catch a slip."}
Check: $(45)_{16} = 4 \cdot 16 + 5 = 69$.
:::

:::answer
$(2120)_3 = 69 = (45)_{16}$
:::
::::

::::example{#ex-dec-fraction level="gate" title="Edge case: a hex numeral with a fraction digit" depth="standard"}
Find the decimal value of $(1A.8)_{16}$.

:::step{why="The point splits the numeral; places to its left are 16¹ and 16⁰, places to its right are 16⁻¹, 16⁻², …"}
Integer part: $(1A)_{16} = 1 \cdot 16 + 10 = 26$.
:::

:::step{why="The first place after the point is worth 1/16, not 1/10. This is the slip examiners hope for."}
Fraction part: $(0.8)_{16} = 8 \cdot 16^{-1} = \tfrac{8}{16} = 0.5$.
:::

:::step{why="The value is the sum of both parts."}
Add: $26 + 0.5 = 26.5$.
:::

:::answer
$(1A.8)_{16} = 26.5$, not $26.8$.
:::
::::

::::check{#check-horner title="Your turn" depth="standard"}
Use Horner's chain to find $(1101)_2$ and $(342)_5$.

:::answer
$(1101)_2$: $1 \to 3 \to 6 \to 13$. $(342)_5$: $3 \to 3\cdot5+4 = 19 \to 19\cdot5+2 = 97$.
:::
::::

:::note{#recap-read title="Recap" depth="quick"}
Value $= \sum d_i b^{\,i}$. By hand, run Horner's chain $t \leftarrow t\cdot b + d$ from the
left. Digits after the point are worth $b^{-1}, b^{-2}, \dots$ of the *same* base.
:::

## Writing a number in base b: repeated division

Reading went from digits to a value. Writing goes the other way: given a value, find its digits.

:::intuition{#packing title="Pack the loose items, then pack the packets" depth="standard"}
Go back to the shop with bundles of 3 and 46 loose items on the counter. Pack them into packets
of 3: you get 15 packets and **1** item left over. That leftover can never be packed, so it *is*
the units digit. Now treat the 15 packets as the new pile and pack them into boxes of 3 packets:
5 boxes, **0** packets left over, which is the next digit. Pack 5 boxes into crates: 1 crate,
**2** boxes over. Pack the 1 crate: 0 bigger units, **1** crate over. Reading the leftovers
from the last to the first gives $1201$, exactly the record we started the lesson with.
:::

:::derivation{#repeated-division of="why repeated division gives the digits" depth="quick"}
Write $N = (d_k \dots d_1 d_0)_b$. Every term except $d_0$ contains a factor $b$:

$$
N = \underbrace{(d_k b^{k-1} + \dots + d_1)}_{q}\cdot b + d_0, \qquad 0 \le d_0 \le b-1 .
$$

That is precisely "divide $N$ by $b$": the remainder is $d_0$ and the quotient $q$ is the
numeral $(d_k \dots d_1)_b$, the same digits shifted one place right. Apply the same step to
$q$ to get $d_1$, and so on. The quotients shrink every time, so the process stops when the
quotient is $0$.

**Rule:** divide by $b$ again and again; the remainders are the digits from $d_0$ upward, so
**read them from the last remainder to the first.**

**Sanity check.** $46 \div 3 = 15$ r $1$, $15 \div 3 = 5$ r $0$, $5 \div 3 = 1$ r $2$,
$1 \div 3 = 0$ r $1$. Read upward: $(1201)_3$, which we already know is 46.
:::

:::theorem{#uniqueness name="Every whole number has exactly one base-b numeral" depth="standard"}
For a base $b \ge 2$, every whole number $N \ge 1$ can be written as $(d_k \dots d_0)_b$ with
digits $0 \le d_i \le b-1$ and leading digit $d_k \ne 0$, and in only one way.
:::

:::proof{#proof-uniqueness of="uniqueness of the base-b numeral" depth="deep"}
**Idea first:** the units digit is forced (it must be the remainder mod $b$), and once it is
removed the rest is a smaller number with the same problem.

*Existence.* Repeated division (the [derivation](#repeated-division)) always produces digits
in $0 \dots b-1$, and it stops because each quotient is smaller than the dividend.

*Uniqueness.* Suppose two different digit strings give the same $N$. Look at the lowest place
$j$ where they differ, say $d_j \ne e_j$, and subtract the two expansions. All places below
$j$ cancel, so

$$
0 = (d_j - e_j)\, b^{\,j} + (\text{a multiple of } b^{\,j+1}).
$$

Divide by $b^{\,j}$: $d_j - e_j$ must be a multiple of $b$. But both digits lie in
$0 \dots b-1$, so $|d_j - e_j| \le b - 1 < b$, and the only multiple of $b$ that small is $0$.
So $d_j = e_j$, a contradiction. Hence the numeral is unique.
:::

:::viz{#ladder spec="repeated-division-ladder" mode="animate" depth="standard"}
:::

### Worked examples: decimal to base b

::::example{#ex-div-binary level="easy" title="Decimal to binary" depth="quick"}
Write $45$ in base 2.

:::step{why="Each division by 2 strips off the units bit as the remainder."}
Divide repeatedly by 2:
$45 = 2\cdot22 + 1$, $22 = 2\cdot11 + 0$, $11 = 2\cdot5 + 1$, $5 = 2\cdot2 + 1$,
$2 = 2\cdot1 + 0$, $1 = 2\cdot0 + 1$.
:::

:::step{why="The first remainder is bit 0 (the units), so the bits are read from the last remainder up to the first."}
Remainders from last to first: $1, 0, 1, 1, 0, 1$. So $45 = (101101)_2$.
:::

:::step{why="Expanding the answer is a quick independent check."}
Check: $32 + 8 + 4 + 1 = 45$.
:::

:::answer
$45 = (101101)_2$
:::
::::

::::example{#ex-div-hex level="medium" title="Decimal to hexadecimal, with letter digits" depth="standard"}
Write $2748$ in base 16.

:::step{why="Divide by the target base; each remainder is one hex digit, from the units digit upward."}
$2748 = 16 \cdot 171 + 12$. The remainder 12 is the hex digit C.
:::

:::step{why="Continue with the quotient, which holds all the higher digits."}
$171 = 16 \cdot 10 + 11$. The remainder 11 is B.
:::

:::step{why="The process stops when the quotient reaches 0; the final remainder is the leading digit."}
$10 = 16 \cdot 0 + 10$. The remainder 10 is A.
:::

:::step{why="Remainders were produced units-first, so read them from the bottom up."}
Read upward: A, B, C, so $2748 = (ABC)_{16}$. Check: $10\cdot256 + 11\cdot16 + 12 = 2560 + 176 + 12 = 2748$.
:::

:::answer
$2748 = (ABC)_{16}$
:::
::::

::::example{#ex-div-base5 level="gate" title="Decimal to base 5" depth="standard"}
Write $39$ in base 5.

:::step{why="Repeated division works for any base, not just 2 and 16."}
$39 = 5 \cdot 7 + 4$, $7 = 5 \cdot 1 + 2$, $1 = 5 \cdot 0 + 1$.
:::

:::step{why="Remainders are read from the last to the first."}
Read upward: $1, 2, 4$, so $39 = (124)_5$.
:::

:::step{why="Expanding with powers of 5 confirms the digits."}
Check: $1 \cdot 25 + 2 \cdot 5 + 4 = 39$.
:::

:::answer
$39 = (124)_5$. The common wrong answer $(421)_5$ comes from reading the remainders top to bottom.
:::
::::

::::example{#ex-div-edge level="gate" title="Edge case: zero, small numbers and the base itself" depth="standard"}
Write $0$, $7$ and $b$ itself in base $b$, for $b = 8$, and explain the pattern.

:::step{why="Repeated division needs at least one step to produce a digit; zero gives remainder 0 immediately."}
$0 = 8 \cdot 0 + 0$: one remainder, $0$. So $0 = (0)_8$, and $0 = (0)_b$ in every base.
:::

:::step{why="Any N smaller than b is already a single digit: the first division gives quotient 0."}
$7 = 8 \cdot 0 + 7$, so $7 = (7)_8$. Every number from $0$ to $b - 1$ is a one-digit numeral.
:::

:::step{why="The base is the first number that does not fit in one digit."}
$8 = 8 \cdot 1 + 0$, then $1 = 8 \cdot 0 + 1$. Read upward: $(10)_8$. In general $b = (10)_b$.
:::

:::answer
$0 = (0)_8$, $7 = (7)_8$, $8 = (10)_8$. In every base, the base itself is written $10$.
:::
::::

:::trap{#trap-read-down title="Reading the remainders from top to bottom" depth="quick"}
The first remainder is the **units** digit. Writing the remainders in the order you found them
reverses the numeral: $39$ would come out as $(421)_5 = 111$ instead of $(124)_5$. GATE options
regularly include the reversed numeral (for 2748 in hex it would be CBA). Always read upward,
and check by expanding.
:::

::::check{#check-division title="Your turn" depth="standard"}
Write $100$ in base 3.

:::answer
$100 = 3\cdot33 + 1$, $33 = 3\cdot11 + 0$, $11 = 3\cdot3 + 2$, $3 = 3\cdot1 + 0$, $1 = 3\cdot0 + 1$.
Read upward: $(10201)_3$. Check: $81 + 18 + 1 = 100$.
:::
::::

:::note{#recap-write title="Recap" depth="quick"}
To write $N$ in base $b$, divide by $b$ until the quotient is $0$ and read the remainders from
the last to the first. The numeral you get is the only one there is (uniqueness).
:::

## From one base to another

There is no new idea here, only a route. To convert from base $b$ to base $c$, read the numeral
into a value (expansion or Horner), then write that value in base $c$ (repeated division).

:::definition{#base-to-base term="Base b to base c" depth="quick"}
$$
(\text{numeral})_b \xrightarrow{\ \text{expand / Horner}\ } N \xrightarrow{\ \text{repeated division by } c\ } (\text{numeral})_c
$$

Decimal is the natural bridge because that is the base you do arithmetic in. When $b$ and $c$
are powers of the same number (2, 4, 8, 16), grouping digits is much faster; that shortcut is
the next lesson.
:::

:::trick{#trick-ten title="1 followed by k zeros is b to the power k" depth="standard"}
$(10)_b = b$, $(100)_b = b^2$ and, in general, $(1\underbrace{0\dots0}_{k})_b = b^k$. Likewise the
largest $k$-digit numeral, all digits $b-1$, is $b^k - 1$: $(777)_8 = 511$, $(FF)_{16} = 255$.

**Why it works:** a 1 in position $k$ is worth $b^k$ and nothing else contributes; all digits
$b-1$ is one less than the next power, as the odometer showed. **When it fails:** it does not
apply once any other digit is non-zero; then expand normally. Use it to sanity-check answers in
seconds.
:::

### Worked examples: base to base

::::example{#ex-bb-plain level="easy" title="Base 4 to base 6" depth="quick"}
Convert $(213)_4$ to base 6.

:::step{why="Read the base-4 numeral into a value first."}
$(213)_4 = 2 \cdot 16 + 1 \cdot 4 + 3 = 32 + 4 + 3 = 39$.
:::

:::step{why="Now write 39 in base 6 by repeated division."}
$39 = 6 \cdot 6 + 3$, $6 = 6 \cdot 1 + 0$, $1 = 6 \cdot 0 + 1$.
:::

:::step{why="Read the remainders upward and check by expanding."}
Upward: $(103)_6$. Check: $36 + 0 + 3 = 39$.
:::

:::answer
$(213)_4 = (103)_6$
:::
::::

::::example{#ex-bb-msq level="medium" title="Which of these name the same number?" depth="standard"}
Which of the following equal $(1100)_2$? (a) $(14)_8$ (b) $(C)_{16}$ (c) $(110)_3$ (d) $(22)_5$ (e) $(21)_6$

:::step{why="Comparing numerals in different bases is only possible through their values."}
The target: $(1100)_2 = 8 + 4 = 12$.
:::

:::step{why="Each option is expanded in its own base; the digit limits also need a glance."}
(a) $1\cdot8 + 4 = 12$. (b) C $= 12$. (c) $1\cdot9 + 1\cdot3 + 0 = 12$. (d) $2\cdot5 + 2 = 12$. (e) $2\cdot6 + 1 = 13$.
:::

:::step{why="An MSQ rewards checking every option; there is no reason to stop at the first match."}
Four options give 12; only (e) differs.
:::

:::answer
(a), (b), (c) and (d) all equal 12; (e) is 13.
:::
::::

::::example{#ex-bb-pairs level="gate" title="Test the pairs: which bases make two numerals equal?" depth="standard"}
$(35)_x = (26)_y$. Which pair $(x, y)$ is possible: $(5, 7)$, $(7, 10)$ or $(8, 12)$?

:::step{why="Turn each numeral into a polynomial in its own base."}
$(35)_x = 3x + 5$ and $(26)_y = 2y + 6$.
:::

:::step{why="Check each pair against the equation."}
$(5,7)$: $20 = 20$. $(7,10)$: $26 = 26$. $(8,12)$: $29 \ne 30$.
:::

:::step{why="The digit limit is part of the question: base 5 has no digit 5."}
$(5, 7)$ fails the digit limit, because $(35)_5$ uses the digit 5. Only $(7, 10)$ survives.
:::

:::answer
$(x, y) = (7, 10)$. The pair $(5, 7)$ satisfies the arithmetic but not the digit limit.
:::
::::

::::example{#ex-bb-invalid level="gate" title="Edge case: a numeral that does not exist" depth="standard"}
"Convert $(194)_8$ to base 4." What is the answer?

:::step{why="Before converting anything, check that the numeral is legal in its own base."}
The digit 9 is not an octal digit (octal digits are 0 to 7).
:::

:::step{why="An illegal numeral has no value, so there is nothing to convert. Computing 1·64 + 9·8 + 4 = 140 would be meaningless."}
$(194)_8$ is not a number, so the conversion is undefined.
:::

:::answer
There is no answer: $(194)_8$ is invalid. In an MCQ, prefer "none of these" or "not a valid numeral".
:::
::::

:::note{#recap-b2b title="Recap" depth="quick"}
Base $b$ to base $c$: expand into a value, then divide repeatedly by $c$. Check every digit
against its base before you start, and check the answer by converting back.
:::

## How many digits does a number need?

:::derivation{#digit-count of="the number of base-b digits of N" depth="quick"}
A $k$-digit base-$b$ numeral (leading digit non-zero) runs from $(10\dots0)_b = b^{k-1}$ to
$(b-1 \dots b-1)_b = b^k - 1$. So $N$ has exactly $k$ digits when

$$
b^{k-1} \le N < b^{k}.
$$

Take $\log_b$ of all three parts: $k - 1 \le \log_b N < k$, so $k - 1 = \lfloor \log_b N \rfloor$:

$$
\boxed{\text{digits of } N \text{ in base } b = \lfloor \log_b N \rfloor + 1 \quad (N \ge 1)}
$$

**Three facts that follow:**
- There are $b^k$ different $k$-digit strings (each place has $b$ choices), so $k$ digits hold the values $0 \dots b^k - 1$.
- To hold every value up to $M$ you need the smallest $k$ with $b^k > M$, that is $b^k \ge M + 1$.
- Every $k$-digit decimal number is at most $10^k - 1$, so it fits in $n$ bits exactly when $2^n \ge 10^k$, that is $n = \lceil k \log_2 10 \rceil$ bits (about $3.32\,k$).

**Sanity check.** $N = 8$ in base 2: $\lfloor \log_2 8 \rfloor + 1 = 3 + 1 = 4$, and indeed $8 = (1000)_2$.
:::

### Worked examples: digit counts

::::example{#ex-digits-bits level="easy" title="Bits for one thousand" depth="quick"}
How many bits does $1000$ need?

:::step{why="Bracket N between two consecutive powers of 2."}
$2^9 = 512 \le 1000 < 1024 = 2^{10}$.
:::

:::step{why="b^(k−1) ≤ N < b^k means k digits, so here k − 1 = 9."}
$k = 9 + 1 = 10$ bits.
:::

:::answer
10 bits (indeed $1000 = (1111101000)_2$).
:::
::::

::::example{#ex-digits-octal level="medium" title="Octal digits of a power of two" depth="standard"}
How many octal digits does $2^{20}$ have?

:::step{why="Rewrite the power of 2 with as many factors of 8 = 2³ as possible."}
$2^{20} = 2^{18} \cdot 2^2 = 4 \cdot 8^6$.
:::

:::step{why="A digit 4 followed by six zeros is 4·8⁶; reading the numeral directly gives the count."}
So $2^{20} = (4000000)_8$, which has 7 digits.
:::

:::step{why="The formula must agree: log₈(2²⁰) = 20/3."}
Formula: $\lfloor 20/3 \rfloor + 1 = 6 + 1 = 7$.
:::

:::answer
7 octal digits.
:::
::::

::::example{#ex-digits-decimal level="gate" title="Bits for every 32-digit decimal number" depth="standard"}
What is the smallest number of bits that can hold every 32-digit decimal number?

:::step{why="The largest 32-digit decimal number is all nines."}
The largest value is $10^{32} - 1$.
:::

:::step{why="n bits hold 0 … 2ⁿ − 1, so we need 2ⁿ − 1 ≥ 10³² − 1."}
We need $2^n \ge 10^{32}$, so $n \ge 32 \log_2 10 \approx 32 \times 3.3219 = 106.3$.
:::

:::step{why="n is a whole number of bits, so round up."}
$n = 107$. (106 bits stop at $2^{106} - 1 \approx 8.1 \times 10^{31}$, which is too small.)
:::

:::answer
107 bits.
:::
::::

::::example{#ex-digits-edge level="gate" title="Edge case: exact powers need one more digit" depth="standard"}
How many bits does $1024$ need? Why does "$\lceil \log_2 N \rceil$" give the wrong count?

:::step{why="1024 is exactly a power of 2, so the bracketing has N on the left end."}
$2^{10} \le 1024 < 2^{11}$, so $k - 1 = 10$ and $k = 11$ bits: $1024 = (10000000000)_2$.
:::

:::step{why="The ceiling formula ignores that the count jumps exactly at a power."}
$\lceil \log_2 1024 \rceil = 10$, one too few. The ceiling form is only safe for "bits to hold the values $0 \dots M$" written as $\lceil \log_2 (M+1) \rceil$.
:::

:::answer
11 bits. Use $\lfloor \log_b N \rfloor + 1$ for the digits of $N$, or $\lceil \log_2 (M+1) \rceil$ for the range $0 \dots M$.
:::
::::

:::trap{#trap-digit-count title="Off by one at exact powers" depth="quick"}
"Bits for $N$ = $\lceil \log_2 N \rceil$" is wrong exactly when $N$ is a power of two ($N = 256$
needs 9 bits, not 8). Use $\lfloor \log_2 N \rfloor + 1$, or think "the smallest $n$ with
$2^n > N$".
:::

:::note{#recap-count title="Recap" depth="quick"}
$N$ has $\lfloor \log_b N \rfloor + 1$ digits in base $b$. $k$ digits hold $b^k$ values,
$0 \dots b^k - 1$. A $k$-digit decimal needs exactly $\lceil k\log_2 10\rceil$ bits, about $3.32\,k$ (rounding
$3.32\,k$ itself can be one short, e.g. $k = 25$ needs 84 bits, not 83).
:::

## When the base is the unknown

GATE loves to hand you an equation between numerals and ask for the base. The method never
changes, and it has exactly two halves: the algebra, then the digit limit.

:::definition{#find-base term="Method: solving for an unknown base" depth="quick"}
1. **Translate.** Expand every numeral as a polynomial in the unknown base, *each numeral
   separately* (including any digits after a point).
2. **Solve** the resulting equation for the base.
3. **Filter.** Keep only whole numbers $b \ge 2$ that are larger than every digit used.
4. **Check** by substituting back.
:::

### Worked examples: find the base

::::example{#ex-base-linear level="easy" title="A linear equation" depth="quick"}
For which base $b$ is $(24)_b = 18$?

:::step{why="Translate the numeral into a polynomial in b."}
$(24)_b = 2b + 4$.
:::

:::step{why="Both sides name the same number, so set them equal."}
$2b + 4 = 18$, so $b = 7$.
:::

:::step{why="The base must exceed every digit; the largest digit here is 4."}
$7 > 4$, so the numeral is valid. Check: $2 \cdot 7 + 4 = 18$.
:::

:::answer
$b = 7$
:::
::::

::::example{#ex-base-square level="medium" title="A square in an unknown base" depth="standard"}
For which base $b$ is $(13)_b^{\,2} = (171)_b$?

:::step{why="Each numeral becomes a polynomial in the same b."}
$(13)_b = b + 3$ and $(171)_b = b^2 + 7b + 1$.
:::

:::step{why="Squaring the left side gives a polynomial we can compare term by term."}
$(b+3)^2 = b^2 + 6b + 9$, so $b^2 + 6b + 9 = b^2 + 7b + 1$.
:::

:::step{why="The b² terms cancel, leaving a linear equation."}
$6b + 9 = 7b + 1$, so $b = 8$.
:::

:::step{why="The digit 7 needs b ≥ 8, which holds. Substituting back confirms it."}
Check: $(13)_8 = 11$, $11^2 = 121$, and $(171)_8 = 64 + 56 + 1 = 121$.
:::

:::answer
$b = 8$
:::
::::

::::example{#ex-base-fraction level="gate" title="A division with a fraction digit" depth="standard"}
For which base $b$ does $(231)_b \div (20)_b = (11.4)_b$ hold?

:::step{why="Expand every numeral separately in base b, including the digit after the point, which is worth 4/b."}
$(231)_b = 2b^2 + 3b + 1$, $(20)_b = 2b$, $(11.4)_b = b + 1 + \dfrac{4}{b}$.
:::

:::step{why="Clear the division by multiplying both sides by (20)_b = 2b."}
$2b^2 + 3b + 1 = 2b\left(b + 1 + \dfrac{4}{b}\right) = 2b^2 + 2b + 8$.
:::

:::step{why="Cancel 2b² and solve the linear remainder."}
$3b + 1 = 2b + 8$, so $b = 7$.
:::

:::step{why="Digits used are 0 to 4, so any b ≥ 5 is legal; 7 passes. Substitute back with fractions."}
Check: $(231)_7 = 98 + 21 + 1 = 120$, $(20)_7 = 14$, $120 / 14 = 60/7$, and $(11.4)_7 = 8 + \tfrac47 = \tfrac{60}{7}$.
:::

:::answer
$b = 7$
:::
::::

::::example{#ex-base-vieta level="gate" title="Roots of a quadratic written in base b" depth="standard"}
The equation $x^2 - 11x + 22 = 0$ has its coefficients written in base $b$, and its roots (in
the same base) are $3$ and $6$. Find $b$.

:::step{why="Vieta's formulas tie the coefficients to the roots: sum of roots = −(coefficient of x), product = constant term."}
Sum: $3 + 6 = (11)_b$. Product: $3 \cdot 6 = (22)_b$.
:::

:::step{why="The roots are single digits, so they mean the same in every base ≥ 7; the coefficients must be expanded."}
$(11)_b = b + 1 = 9$ gives $b = 8$.
:::

:::step{why="The second equation must agree; if it did not, no base would work."}
$(22)_b = 2b + 2 = 18$ also gives $b = 8$.
:::

:::step{why="Digit limit: the digit 6 needs b ≥ 7, and 8 passes."}
Check by substitution: in base 8 the equation reads $x^2 - 9x + 18 = 0 = (x-3)(x-6)$.
:::

:::answer
$b = 8$
:::
::::

::::example{#ex-base-every level="gate" title="Edge case: an equation true in every base" depth="standard"}
For which bases $r$ is $(144)_r = (12)_r^{\,2}$?

:::step{why="Expand both sides as polynomials in r."}
$(144)_r = r^2 + 4r + 4$ and $(12)_r^{\,2} = (r+2)^2 = r^2 + 4r + 4$.
:::

:::step{why="The two polynomials are identical, so the equation holds for every r: there is nothing to solve."}
The equation is an identity in $r$.
:::

:::step{why="Only the digit limit restricts r. The largest digit is 4."}
So it holds for every base $r \ge 5$.
:::

:::answer
Every $r \ge 5$ (not only $r = 10$).
:::
::::

:::theorem{#all-bases name="Identities that hold in every base" depth="standard"}
If two numerals, read as polynomials in the base $r$, are the same polynomial, then the
equation between them holds in **every** base $r$ larger than all the digits used. For example
$(121)_r = (11)_r^{\,2}$ for all $r \ge 3$ and $(1331)_r = (11)_r^{\,3}$ for all $r \ge 4$.
:::

:::proof{#proof-all-bases of="identities in every base" depth="deep"}
**Idea first:** arithmetic on numerals is arithmetic on polynomials in $r$, as long as no
carry happens.

$(11)_r = r + 1$. Multiplying polynomials, $(r + 1)^2 = r^2 + 2r + 1$, whose coefficients
$1, 2, 1$ are all smaller than $r$ when $r \ge 3$, so no carry is needed and the product is the
numeral $(121)_r$. In the same way $(r+1)^3 = r^3 + 3r^2 + 3r + 1$ is the numeral $(1331)_r$
whenever $r \ge 4$. In general, if every coefficient of the product polynomial is a valid digit,
the product numeral is just the list of coefficients, whatever $r$ is.
:::

:::trap{#trap-decimal-division title="Doing the arithmetic in decimal before translating" depth="quick"}
In $(312)_b \div (20)_b = (13.1)_b$ you may not compute $312 / 20 = 15.6$ and compare with $13.1$:
those digit strings are not decimal numbers. Translate **each** numeral into a polynomial in $b$
first, then do the arithmetic.
:::

::::check{#check-base title="Your turn" depth="standard"}
For which base $b$ is $(25)_b = 17$?

:::answer
$2b + 5 = 17$, so $b = 6$, and the digit 5 is legal in base 6. Check: $12 + 5 = 17$.
:::
::::

:::note{#recap-base title="Recap" depth="quick"}
Translate every numeral into a polynomial in the base, solve, then throw away any root that is
not a whole number larger than every digit. If both sides are the same polynomial, the answer
is "every base above the largest digit".
:::

## Counting solutions with two unknowns

When both a base and a digit (or two bases) are unknown, one equation cannot pin down a single
answer. GATE then asks **how many** pairs work. The equation gives a family of candidates; the
digit limits decide which candidates are real.

:::definition{#count-solutions term="Method: counting the solutions of a base equation" depth="quick"}
1. Translate both numerals and simplify to a relation between the unknowns (often a product
   like $xy = 30$ or a ratio like $x = 2y$).
2. List **every** integer candidate pair that satisfies the relation.
3. Strike out any pair that breaks a rule: a base must be at least 2 **and** larger than every
   digit written in it; a digit must lie between 0 and (its base − 1).
4. Count what is left.
:::

:::viz{#solutions-grid spec="radix-solutions-grid" mode="static" depth="standard"}
:::

### Worked examples: counting solutions

::::example{#ex-count-warm level="easy" title="Warm-up: one base, one answer" depth="quick"}
For which base $b$ is $(21)_b = 7$, and is the numeral valid there?

:::step{why="Translate and solve."}
$2b + 1 = 7$, so $b = 3$.
:::

:::step{why="The answer only counts if every digit is smaller than b."}
Digits 2 and 1 are both below 3. Valid.
:::

:::answer
Exactly one solution, $b = 3$.
:::
::::

::::example{#ex-count-product level="medium" title="A digit times a base" depth="standard"}
How many pairs $(x, y)$ satisfy $(54)_6 = (x6)_y$, where $x$ is a digit of base $y$?

:::step{why="The left side is fully known, so evaluate it."}
$(54)_6 = 5 \cdot 6 + 4 = 34$.
:::

:::step{why="The right side is a polynomial in the unknown base y with unknown digit x."}
$(x6)_y = xy + 6 = 34$, so $xy = 28$.
:::

:::step{why="List every factor pair of 28 before applying any rule, so nothing is missed."}
$(x, y) \in \{(1,28), (2,14), (4,7), (7,4), (14,2), (28,1)\}$.
:::

:::step{why="The digit 6 needs y ≥ 7, and x is a digit of base y, so 1 ≤ x < y (x = 0 would make the product 0)."}
Keep $(1,28)$, $(2,14)$, $(4,7)$. The other three have $y < 7$.
:::

:::answer
3 solutions.
:::
::::

::::example{#ex-count-ratio level="gate" title="Two bases in proportion" depth="standard"}
How many pairs $(x, y)$ satisfy $(32)_x = (y2)_6$?

:::step{why="Translate both sides; here x is a base and y is a digit of base 6."}
$3x + 2 = 6y + 2$, so $x = 2y$.
:::

:::step{why="y is a base-6 digit, so it ranges over 0 … 5. List the candidates."}
$y = 0, 1, 2, 3, 4, 5$ give $x = 0, 2, 4, 6, 8, 10$.
:::

:::step{why="x is a base and the numeral (32)ₓ uses the digit 3, so x ≥ 4."}
Strike $y = 0, 1$ (giving $x = 0, 2$). Keep $y = 2, 3, 4, 5$.
:::

:::answer
4 solutions: $(x, y) = (4,2), (6,3), (8,4), (10,5)$.
:::
::::

::::example{#ex-count-edge level="gate" title="Edge case: the digit must be smaller than its own base" depth="standard"}
How many pairs $(x, y)$ satisfy $(x5)_y = 47$?

:::step{why="Translate the right-hand numeral."}
$xy + 5 = 47$, so $xy = 42$.
:::

:::step{why="The digit 5 forces y ≥ 6. List the factor pairs of 42 with y ≥ 6."}
$(1,42), (2,21), (3,14), (6,7), (7,6)$.
:::

:::step{why="x is itself a digit of base y, so x < y. The pair (7, 6) passes y ≥ 6 but writes the digit 7 in base 6."}
Strike $(7,6)$. Keep $(1,42), (2,21), (3,14), (6,7)$.
:::

:::answer
4 solutions. Students who forget that $x$ is a digit count 5.
:::
::::

:::trap{#trap-count title="Counting before applying the digit limits" depth="quick"}
The equation alone always over-counts. In $(43)_x = (y3)_8$ the relation $x = 2y$ has seven
candidates with $y = 1 \dots 7$, but the digit 4 needs $x \ge 5$, so only five survive. In
$(123)_5 = (x8)_y$ the relation $xy = 30$ has eight factor pairs, but the digit 8 needs $y \ge 9$,
so only three survive. Strike out first, then count.
:::

:::note{#recap-solutions title="Recap" depth="quick"}
Reduce the equation to a simple relation, list every candidate, then strike out pairs that
break a digit limit: each base exceeds its largest digit, each digit is below its base.
:::

## GATE questions on this lesson

These are all eleven previous-year questions that test this lesson, from the easiest to the
hardest. Try each one before opening its solution; the chips above each question jump back to
the blocks it uses.

:::pyq{id="cse-2023-cs-22" tests="expansion,repeated-division" depth="standard"}
:::

:::pyq{id="cse-2021-1-cs-6" tests="expansion,repeated-division,base-to-base" depth="standard"}
:::

:::pyq{id="cse-1993-ii-a-6-5" tests="expansion,repeated-division" depth="standard"}
:::

:::pyq{id="cse-2024-2-cs-39" tests="expansion,base-to-base" depth="standard"}
:::

:::pyq{id="cse-2004-cs-19" tests="expansion,digit-limit" depth="standard"}
:::

:::pyq{id="cse-2008-cs-6" tests="all-bases,digit-limit" depth="standard"}
:::

:::pyq{id="cse-1997-a-39" tests="find-base,digit-limit" depth="standard"}
:::

:::pyq{id="cse-2017-2-cs-24" tests="find-base,expansion" depth="standard"}
:::

:::pyq{id="cse-2014-1-cs-8" tests="find-base,expansion,trap-decimal-division" depth="standard"}
:::

:::pyq{id="cse-2014-2-cs-8" tests="count-solutions,digit-limit" depth="standard"}
:::

:::pyq{id="cse-2015-3-cs-35" tests="count-solutions,digit-limit" depth="standard"}
:::

## Practice

Our own questions, in the same formats as GATE: three warm-ups, then exam-level questions, then
two that need care.

:::practice{id="nx-dl-01-01-q01" depth="standard"}
:::

:::practice{id="nx-dl-01-01-q02" depth="standard"}
:::

:::practice{id="nx-dl-01-01-q03" depth="standard"}
:::

:::practice{id="nx-dl-01-01-q04" depth="standard"}
:::

:::practice{id="nx-dl-01-01-q05" depth="standard"}
:::

:::practice{id="nx-dl-01-01-q06" depth="standard"}
:::

:::practice{id="nx-dl-01-01-q07" depth="standard"}
:::

:::practice{id="nx-dl-01-01-q08" depth="standard"}
:::

:::practice{id="nx-dl-01-01-q09" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Place value and changing bases on one card" depth="quick"}
| Idea | Formula or rule |
|:--|:--|
| Value of a numeral | $N = \sum_i d_i\, b^{\,i}$, with $0 \le d_i \le b-1$ |
| Horner (read left to right) | $t \leftarrow t\cdot b + d$, starting from $t = 0$ |
| Digit after the point | worth $b^{-1}, b^{-2}, \dots$ of the same base |
| Decimal to base $b$ | divide by $b$ repeatedly, read remainders **bottom to top** |
| Base $b$ to base $c$ | expand to a value, then divide repeatedly by $c$ |
| Special numerals | $(10)_b = b$, $(10\dots0)_b = b^k$, all digits $b-1$ $= b^k - 1$ |
| Digits of $N$ | $\lfloor \log_b N \rfloor + 1$; $k$ digits hold $b^k$ values |
| Bits for $k$ decimal digits | $\lceil k \log_2 10 \rceil \approx 3.32\,k$ |
| Unknown base | expand each numeral in $b$, solve, keep $b >$ every digit |
| Counting solutions | list all candidates, strike those that break a digit limit |

The two habits that win marks: **check the digit limit** in every base question, and
**convert your answer back** to catch slips.
:::

:::note{#further-depth title="Further depth: other ways to write numbers" depth="deep"}
Positional notation does not need a fixed base. In the **factorial number system** the place
values are $1!, 2!, 3!, \dots$ and the digit in place $i$ may go up to $i$; it numbers the
permutations of a set. In **balanced ternary** the digits are $-1, 0, 1$, so negative numbers
need no sign. Both still obey the two rules of this lesson: a digit counts units of its place,
and the digit range is exactly what makes each spelling unique.
:::
