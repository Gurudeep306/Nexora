---
id: power-of-two-bases
subject: dl
chapter: number-systems
title: "Binary, octal and hex: grouping and arithmetic"
order: 2
prerequisites: [place-value]
pyq_topics: [dl/number]
est_minutes: 45
difficulty: basic
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every value is checked by content/gate-notes/_checks/dl/l02_grouping.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 8–14, set B pp. 138–140, set C pp. 203–208."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (octal and hexadecimal numbers, binary arithmetic)."
  - "PYQs: src/gate/questions.json (dl/number); cse-1991-a-1-iii text discussed in content/gate-notes/_errata/dl.md §3."
updated: "2026-10-17"
---

Binary is the language of the hardware, but long strings of bits are hard for people to read.
Octal and hexadecimal fix that, and they fix it *for free*: because 8 and 16 are powers of 2,
you convert by cutting the bit string into groups, with no division at all. In this lesson you
learn why grouping works, how to do it without the classic off-by-a-group slip, how to move
between octal, hex and base 4 through binary, how to read a "powers of 16" sum straight off as
hex, and how to add, subtract and multiply directly in base 8 or 16.

## Where this fits

[Lesson 1](lesson:place-value) gave the general tools: expand to read, divide to write. They
work for every base, but for bases 2, 4, 8 and 16 they are the slow road. Everything in later
chapters is written in these bases: memory addresses and instruction fields in hex, Unix
permissions in octal, K-map cells and register contents in binary. The 2's-complement patterns
of [Lesson 4](lesson:signed-numbers) are also usually given in hex.

:::table{#radar title="GATE radar: binary, octal and hexadecimal" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 6 (1991–2017) |
| Marks | 3 one-mark, 3 two-mark |
| Formats | 5 MCQ, 1 fill-in |
| Pattern 1 | Octal ↔ hex (or hex → octal) through binary: 2005, 2009, 2017, IT 2004 |
| Pattern 2 | Count the 1s in a sum of powers of 16: 1991, 1995 |
| Related | Arithmetic directly in base 8 (IT 2005) is solved with the other arithmetic questions in Lesson 9 |
| What examiners test | Grouping from the wrong end, and padding on the wrong side of a fraction |
:::

## Why grouping works

:::intuition{#bundles-of-bits title="Bundles that are exactly three (or four) bits" depth="standard"}
In base 2 the place values are 1, 2, 4, 8, 16, 32, 64, … Look at them three at a time from the
right: (1, 2, 4), then (8, 16, 32) which is 8 × (1, 2, 4), then (64, 128, 256), which is
64 × (1, 2, 4). Each block of three places is the first block scaled by a power of 8.

So a block of three bits is a number from 0 to 7 counting units of $8^0$, the next block counts
units of $8^1$, the next units of $8^2$. That is exactly an octal digit per block. It is like
paying with ₹10 notes bundled in hundreds: a bundle is an exact multiple of a note, so you can
count bundles without unpacking them. Blocks of four places scale by 16 the same way, which
gives hexadecimal.
:::

:::theorem{#grouping name="Grouping theorem" depth="quick"}
Let $k \ge 1$. To convert between base 2 and base $2^k$, split the bits into groups of $k$
**starting at the radix point and moving outward** (leftward for the integer part, rightward
for the fraction), pad the outermost groups with zeros to a full $k$ bits, and replace each
group by the base-$2^k$ digit with the same value. Read backwards, each base-$2^k$ digit becomes
exactly $k$ bits.

- $k = 2$: base 4 (2 bits per digit)
- $k = 3$: octal (3 bits per digit)
- $k = 4$: hexadecimal (4 bits per digit)
:::

:::proof{#proof-grouping of="the grouping theorem" depth="deep"}
**Idea first:** collect the binary expansion in blocks of $k$ terms; each block is a multiple
of a power of $2^k$.

Write an integer as $N = \sum_{i} b_i 2^i$ and gather the terms by $i = kj + t$ with
$0 \le t \le k - 1$:

$$
N = \sum_{j} \Big( \sum_{t=0}^{k-1} b_{kj+t}\, 2^{t} \Big)\, 2^{kj}
  = \sum_j c_j\, (2^k)^{j}, \qquad c_j = \sum_{t=0}^{k-1} b_{kj+t}\, 2^t .
$$

Each $c_j$ is the value of the $j$-th block of $k$ bits, so $0 \le c_j \le 2^k - 1$: a legal
base-$2^k$ digit. By the uniqueness of base-$2^k$ numerals
([Lesson 1](lesson:place-value#uniqueness)), the $c_j$ *are* the base-$2^k$ digits of $N$.
Fractions work the same way with negative $j$: the block nearest the point holds
$b_{-1}, \dots, b_{-k}$. The blocks must be aligned on the point because that is where
$j = 0$ starts.
:::

:::derivation{#padding of="why padding is safe only at the outer ends" depth="quick"}
A zero added **to the left of the integer part** has place value $2^i$ times 0, and a zero added
**to the right of the fraction** has place value $2^{-i}$ times 0, so neither changes the
number: $(101)_2 = (0101)_2$ and $(0.11)_2 = (0.110)_2$.

A zero inserted anywhere else pushes the bits after it to new places. For example, padding the
fraction $.11$ on the *left* to $.011$ moves both 1s one place right and halves the value:
$(0.11)_2 = 0.75$ but $(0.011)_2 = 0.375$.

**Sanity check.** $(0.11)_2 = 0.75 = 6/8 = (0.6)_8$, which is what grouping $.110$ gives.
:::

Two consequences are worth saying out loud, because they are what make the method fast.
First, **each group is converted on its own**: no carry ever passes from one group to the next,
so you can work on the groups in any order and never hold a running total. Second, the method
runs **both ways**. Going from hex to binary you simply write each digit as its four bits and
place the strings side by side; going from binary to hex you cut and read. Compare that with
Lesson 1, where writing a number in a new base needed a chain of divisions, each depending on
the one before.

Notice also what the theorem does **not** say. It does not let you group decimal digits, and it
does not connect bases 8 and 16 directly, because neither is a power of the other. Whenever the
two bases are both powers of 2, binary is the meeting point; whenever they are not, decimal is.

:::viz{#grouping-viz spec="grouping-slider" mode="animate" depth="standard"}
:::

Memorise the sixteen hex digits as bits, with their count of 1s. An octal digit is just the
last three bits of the same row (0 to 7 only).

:::viz{#hex-table spec="hex-nibble-table" mode="static" depth="quick"}
:::

::::check{#check-grouping title="Group it" depth="standard"}
Write $(110101)_2$ in octal and in hex.

:::answer
Threes from the right: $110\;101$ → $(65)_8$. Fours from the right: $11\;0101$ → pad to $0011\;0101$ → $(35)_{16}$. Both equal 53.
:::
::::

:::note{#recap-why title="Recap" depth="quick"}
Because $8 = 2^3$ and $16 = 2^4$, one octal digit is exactly 3 bits and one hex digit is exactly
4 bits. Group from the point outward; pad only at the outer ends.
:::

### Worked examples: grouping whole numbers

::::example{#ex-grp-octal level="easy" title="Binary to octal" depth="quick"}
Write $(1011010)_2$ in octal.

:::step{why="The radix point of a whole number is at its right end, so groups of three start there."}
Cut threes from the right: $1\;011\;010$.
:::

:::step{why="The leftover single bit is padded on the left, which does not change the value."}
Pad the leftmost group: $001\;011\;010$.
:::

:::step{why="Each 3-bit group is one octal digit; read it from the table."}
$001 = 1$, $011 = 3$, $010 = 2$, so the numeral is $(132)_8$.
:::

:::step{why="A quick decimal check confirms the grouping."}
Check: $(1011010)_2 = 64 + 16 + 8 + 2 = 90$ and $(132)_8 = 64 + 24 + 2 = 90$.
:::

:::answer
$(1011010)_2 = (132)_8$
:::
::::

::::example{#ex-grp-hex level="easy" title="Binary to hexadecimal" depth="standard"}
Write $(101110111)_2$ in hexadecimal.

:::step{why="Hex digits are 4 bits, so cut fours from the right end."}
$1\;0111\;0111$.
:::

:::step{why="Pad the single leftover bit to a full group of four."}
$0001\;0111\;0111$.
:::

:::step{why="Read each group from the hex table."}
$0001 = 1$, $0111 = 7$, $0111 = 7$: $(177)_{16}$.
:::

:::step{why="Check through decimal."}
$(101110111)_2 = 256 + 64 + 32 + 16 + 4 + 2 + 1 = 375$, and $(177)_{16} = 256 + 112 + 7 = 375$.
:::

:::answer
$(101110111)_2 = (177)_{16}$
:::
::::

::::example{#ex-grp-oct-hex level="medium" title="Octal to hex through binary" depth="standard"}
Write $(546)_8$ in hexadecimal.

:::step{why="Each octal digit becomes exactly three bits, independently of its neighbours."}
$5 \to 101$, $4 \to 100$, $6 \to 110$: the bits are $101\,100\,110$.
:::

:::step{why="The old 3-bit boundaries mean nothing for hex; regroup the same bits in fours from the right."}
$1\;0110\;0110$, padded to $0001\;0110\;0110$.
:::

:::step{why="Read the hex digits."}
$1, 6, 6$: $(166)_{16}$.
:::

:::step{why="Check through decimal."}
$(546)_8 = 320 + 32 + 6 = 358$ and $(166)_{16} = 256 + 96 + 6 = 358$.
:::

:::answer
$(546)_8 = (166)_{16}$
:::
::::

::::example{#ex-grp-hex-oct level="gate" title="Hex to octal, sixteen bits" depth="standard"}
Write $(3F2C)_{16}$ in octal.

:::step{why="Expand each hex digit to its 4-bit row of the table."}
$3\;F\;2\;C \to 0011\;1111\;0010\;1100$.
:::

:::step{why="Regroup in threes from the right; 16 bits make five full groups and one leftover bit."}
$0\;011\;111\;100\;101\;100$.
:::

:::step{why="A leading group that is all zero contributes nothing and can be dropped."}
Read the groups: $0, 3, 7, 4, 5, 4$, so the numeral is $(37454)_8$.
:::

:::step{why="Check by values."}
$(3F2C)_{16} = 3\cdot4096 + 15\cdot256 + 2\cdot16 + 12 = 16172$, and $(37454)_8 = 3\cdot4096 + 7\cdot512 + 4\cdot64 + 5\cdot8 + 4 = 16172$.
:::

:::answer
$(3F2C)_{16} = (37454)_8$
:::
::::

::::example{#ex-grp-edge level="gate" title="Edge case: grouping from the wrong end" depth="standard"}
A student writes $(1010110)_2$ in hex by cutting fours from the **left**: $1010\;110$. What goes wrong?

:::step{why="Cutting from the left leaves the short group at the right, where it no longer sits on the 2⁰ boundary."}
From the left: $1010 = A$, and the stray $110$ must be padded somewhere: as $0110 = 6$ it gives $(A6)_{16} = 166$, as $1100 = C$ it gives $(AC)_{16} = 172$. Either way the groups no longer sit on the $2^0$ boundary.
:::

:::step{why="Correct grouping starts at the point (the right end)."}
From the right: $101\;0110$, padded to $0101\;0110$, gives $(56)_{16}$.
:::

:::step{why="Only one of these can equal the original value."}
$(1010110)_2 = 64 + 16 + 4 + 2 = 86 = (56)_{16}$. The wrong grouping is almost double.
:::

:::answer
$(56)_{16}$. Grouping from the left gives $(A6)_{16}$, a classic distractor.
:::
::::

:::trap{#trap-left-group title="Grouping an integer from the left" depth="quick"}
Groups start at the radix point. For a whole number that is the **right** end. Cutting from the
left shifts every group and gives a wrong numeral that often appears as an option: for
$(657)_8 = (110\,101\,111)_2$ the correct hex is $1AF$, but cutting fours from the left gives
$1101\;0111\;1 \to D, 7$ and a stray bit; padded on the right it reads $1000 = 8$, giving $D78$, and
padded on the left $0001 = 1$, giving $D71$. Both are options in GATE 2005, and both are wrong.
:::

### Worked examples: grouping fractions

::::example{#ex-frac-hex level="easy" title="A binary fraction in hex" depth="quick"}
Write $(0.1011)_2$ in hexadecimal.

:::step{why="Fraction groups start at the point and go right."}
The first four bits after the point: $1011$.
:::

:::step{why="Read the group as a hex digit."}
$1011 = B$, so $(0.1011)_2 = (0.B)_{16}$.
:::

:::step{why="Check by value: both are 11 sixteenths."}
$\tfrac12 + \tfrac18 + \tfrac1{16} = \tfrac{11}{16}$ and $(0.B)_{16} = \tfrac{11}{16}$.
:::

:::answer
$(0.B)_{16} = 0.6875$
:::
::::

::::example{#ex-frac-pad level="medium" title="Padding a short fraction group" depth="standard"}
Write $(0.11)_2$ in octal.

:::step{why="Fraction groups run right from the point; this one has only two bits."}
Group: $.11$ has only two bits, one short of a full group of three.
:::

:::step{why="A fraction is padded on the RIGHT (its outer end), which adds a 0 × 2⁻³ term."}
Pad to $.110$.
:::

:::step{why="Read the octal digit."}
$110 = 6$, so $(0.11)_2 = (0.6)_8$. Check: $0.75 = 6/8$.
:::

:::answer
$(0.6)_8$
:::
::::

::::example{#ex-frac-mixed level="gate" title="A mixed hex number to octal" depth="standard"}
Write $(2D.6)_{16}$ in octal.

:::step{why="Expand each hex digit to four bits, keeping the point in place."}
$0010\;1101\,.\,0110$.
:::

:::step{why="Regroup in threes outward from the point: leftward for the integer part, rightward for the fraction."}
Integer: $101\;101$. Fraction: $011$ (then $0$, padded to $000$, which can be dropped).
:::

:::step{why="Read the octal digits."}
$(55.3)_8$.
:::

:::step{why="Check by value."}
$(2D.6)_{16} = 45 + \tfrac{6}{16} = 45.375$ and $(55.3)_8 = 45 + \tfrac38 = 45.375$.
:::

:::answer
$(2D.6)_{16} = (55.3)_8$
:::
::::

::::example{#ex-frac-edge level="gate" title="Edge case: padding on the wrong side" depth="standard"}
Why is $(0.11)_2 \ne (0.3)_8$, even though $11$ padded to three bits "looks like" $011 = 3$?

:::step{why="Padding on the left of a fraction inserts a zero between the point and the first bit."}
$.011$ moves both 1s one place to the right.
:::

:::step{why="Compare the values."}
$(0.011)_2 = \tfrac14 + \tfrac18 = 0.375 = (0.3)_8$, while $(0.11)_2 = 0.75$.
:::

:::answer
Fraction groups are padded on the right: $(0.11)_2 = (0.6)_8$. Left-padding halves the value here.
:::
::::

:::trap{#trap-frac-pad title="Padding a fraction on the left" depth="quick"}
Integer parts are padded on the **left**, fraction parts on the **right**: always at the end
*away* from the point. Padding a fraction on the left changes its value.
:::

:::note{#recap-frac title="Recap" depth="quick"}
Fractions group rightward from the point and pad on the right. Integer parts group leftward
from the point and pad on the left. Check with values when unsure.
:::

## Between octal, hex and base 4: always through binary

:::definition{#octal-hex term="Octal ↔ hex ↔ base 4" depth="quick"}
Bases 4, 8 and 16 are all powers of 2. Octal is not a power of 4 or of 16 (nor they of 8), so
octal ↔ hex and octal ↔ base 4 go in two hops through binary:

$$
(\dots)_{8} \xrightarrow{\ 3 \text{ bits per digit}\ } (\dots)_2 \xrightarrow{\ \text{regroup in 4s (or 2s)}\ } (\dots)_{16} \text{ or } (\dots)_4 .
$$

Base 4 and hex are different: $16 = 4^2$, so they convert digit by digit (next block). Never go
through decimal for any of these: it is correct but slow and error-prone.
:::

:::definition{#base4 term="Base 4: two bits per digit" depth="quick"}
Base 4 is grouping with $k = 2$: $0 = 00$, $1 = 01$, $2 = 10$, $3 = 11$. Every hex digit is
exactly two base-4 digits, so hex → base 4 can be done digit by digit too: $B = 1011 = (23)_4$.
:::

:::viz{#bridge spec="octal-hex-bridge" mode="animate" depth="standard"}
:::

### Worked examples: octal, hex and base 4

::::example{#ex-b4-hex level="easy" title="Base 4 to hex" depth="quick"}
Write $(231)_4$ in hexadecimal.

:::step{why="Each base-4 digit is exactly two bits."}
$2 \to 10$, $3 \to 11$, $1 \to 01$: bits $101101$.
:::

:::step{why="Regroup in fours from the right and pad."}
$10\;1101 \to 0010\;1101$: $(2D)_{16}$.
:::

:::step{why="Check by value."}
$(231)_4 = 32 + 12 + 1 = 45 = (2D)_{16}$.
:::

:::answer
$(231)_4 = (2D)_{16}$
:::
::::

::::example{#ex-hex-b4 level="medium" title="Hex to base 4, digit by digit" depth="standard"}
Write $(B7)_{16}$ in base 4.

:::step{why="One hex digit is 4 bits, which is exactly two base-4 digits, so each hex digit converts on its own."}
$B = 1011 = 10\,11 = (23)_4$ and $7 = 0111 = 01\,11 = (13)_4$.
:::

:::step{why="Concatenate in order."}
$(2313)_4$.
:::

:::step{why="Check by value."}
$(B7)_{16} = 183$ and $(2313)_4 = 2\cdot64 + 3\cdot16 + 1\cdot4 + 3 = 183$.
:::

:::answer
$(B7)_{16} = (2313)_4$
:::
::::

::::example{#ex-oct-b4 level="gate" title="Octal to base 4" depth="standard"}
Write $(52)_8$ in base 4.

:::step{why="8 is not a power of 4, so octal digits do not map to base-4 digits one by one. Go to bits."}
$5 \to 101$, $2 \to 010$: bits $101010$.
:::

:::step{why="Regroup in twos from the right."}
$10\;10\;10$: $(222)_4$.
:::

:::step{why="Check by value."}
$(52)_8 = 42$ and $(222)_4 = 32 + 8 + 2 = 42$.
:::

:::answer
$(52)_8 = (222)_4$
:::
::::

::::example{#ex-oct-hex-edge level="gate" title="Edge case: zero-padding inside the bit string" depth="standard"}
Convert $(1017)_8$ to hex, and say what happens if the octal digit 0 is written as a single 0 bit.

:::step{why="Every octal digit, including 0, must expand to exactly three bits."}
$1 \to 001$, $0 \to 000$, $1 \to 001$, $7 \to 111$: bits $001\,000\,001\,111$.
:::

:::step{why="Regroup in fours from the right."}
$0010\;0000\;1111 \to (20F)_{16}$. Check: $(1017)_8 = 512 + 8 + 7 = 527 = 2\cdot256 + 15$.
:::

:::step{why="Dropping bits in the middle shifts every higher bit, which is padding in the wrong place."}
Writing 0 as one bit gives $1\,0\,1\,111 \to 101111 = (2F)_{16} = 47$: completely wrong.
:::

:::answer
$(20F)_{16}$. Inner digits always expand to full groups; only leading zeros at the far left may be dropped.
:::
::::

:::trap{#trap-via-decimal title="Going octal → decimal → hex" depth="standard"}
It gives the right answer, but it costs two long conversions and invites slips in the
divisions. Through binary, the same conversion is pure table look-up.
:::

:::note{#recap-bridge title="Recap" depth="quick"}
Octal, hex and base 4 all meet in binary: expand each digit to its full group of bits, then
regroup. Hex ↔ base 4 is digit by digit, because one hex digit is two base-4 digits.
:::

## Sums of powers of 16, and counting 1s

:::definition{#hex-expansion term="A sum of powers of 16 is a hex numeral" depth="quick"}
An expression $c_3 \cdot 16^3 + c_2 \cdot 16^2 + c_1 \cdot 16 + c_0$ with every coefficient
$0 \le c_i \le 15$ is, by definition, the hex numeral $(c_3 c_2 c_1 c_0)_{16}$. You can read its
bits straight off, without ever computing the decimal value. (4096 = $16^3$ and 256 = $16^2$.)
If a coefficient is 16 or more, first carry: $16 \cdot 16^i = 1 \cdot 16^{i+1}$.
:::

Why is this legitimate? Multiplying by $16^i$ shifts a value left by $4i$ bits, exactly as
multiplying by $10^i$ shifts a decimal number left by $i$ places. So $c_3 \cdot 16^3$ is the four
bits of $c_3$ followed by twelve zeros, $c_2 \cdot 16^2$ is the four bits of $c_2$ followed by eight
zeros, and so on. When every coefficient fits in four bits, these blocks occupy **separate**
4-bit slots and never overlap, so adding them is just placing them side by side. The moment a
coefficient needs a fifth bit, its block spills into the next slot and you must carry first.

:::definition{#popcount term="Counting 1s (popcount) one hex digit at a time" depth="quick"}
Because each hex digit is its own 4-bit group, the number of 1s in the binary form is the sum
of the 1-counts of the hex digits (the "1s" column of the hex table): 0 → 0; 1, 2, 4, 8 → 1;
3, 5, 6, 9, A, C → 2; 7, B, D, E → 3; F → 4.
:::

::::check{#check-popcount title="Count without converting" depth="standard"}
How many 1s are in the binary form of $(A5)_{16}$? And of $10 \cdot 16 + 5$?

:::answer
Both are the same number: $A = 1010$ (two 1s) and $5 = 0101$ (two 1s), so four 1s.
:::
::::

### Worked examples: powers of 16 and 1s

::::example{#ex-pop-easy level="easy" title="Read a sum as hex" depth="quick"}
How many 1s are in the binary form of $5\cdot 4096 + 12 \cdot 16 + 7$?

:::step{why="4096 = 16³ and there is no 16² term, so the hex digits are 5, 0, 12, 7."}
The number is $(50C7)_{16}$.
:::

:::step{why="Add the 1-counts of the digits from the hex table."}
$5 \to 2$, $0 \to 0$, $C \to 2$, $7 \to 3$: total $7$.
:::

:::answer
7 ones (the binary is $0101\,0000\,1100\,0111$).
:::
::::

::::example{#ex-pop-ff level="medium" title="A coefficient that is not a single digit" depth="standard"}
How many 1s are in the binary form of $8 \cdot 16^3 + 4 \cdot 16^2 + 255$?

:::step{why="255 is not a hex digit, but 255 = 15·16 + 15, which fills the two lowest digits."}
$255 = (FF)_{16}$, so the number is $(84FF)_{16}$.
:::

:::step{why="Sum the 1-counts digit by digit."}
$8 \to 1$, $4 \to 1$, $F \to 4$, $F \to 4$: total $10$.
:::

:::answer
10 ones.
:::
::::

::::example{#ex-pop-allf level="gate" title="All F's: a run of ones" depth="standard"}
How many 1s does $(FFF)_{16}$ have, and what is it as a power of 2?

:::step{why="F is 1111, so k hex F's are 4k ones in a row."}
$(FFF)_{16} = 1111\,1111\,1111$: twelve 1s.
:::

:::step{why="A run of n ones is one less than the next power of 2."}
$(FFF)_{16} = 2^{12} - 1 = 4095$.
:::

:::answer
12 ones; $(FFF)_{16} = 2^{12} - 1$. In general $k$ F's $= 2^{4k} - 1$.
:::
::::

::::example{#ex-pop-carry level="gate" title="Edge case: carry before reading" depth="standard"}
How many 1s are in the binary form of $3 \cdot 256 + 20 \cdot 16 + 5$?

:::step{why="The coefficient 20 is not a hex digit, so the expression is not yet a hex numeral."}
$20 \cdot 16 = (16 + 4)\cdot 16 = 1\cdot 256 + 4 \cdot 16$.
:::

:::step{why="Carry into the 256s place."}
The number is $4 \cdot 256 + 4 \cdot 16 + 5 = (445)_{16}$.
:::

:::step{why="Count the 1s per digit."}
$4 \to 1$, $4 \to 1$, $5 \to 2$: total $4$. Check: $768 + 320 + 5 = 1093 = 1024 + 64 + 4 + 1$.
:::

:::answer
4 ones. Reading "3, 20, 5" as digits would give nonsense.
:::
::::

:::trap{#trap-printed title="Evaluate exactly what is printed" depth="quick"}
A "count the 1s" question may look like a hex sum but be written with + where you expect ×.
Compute what is printed, not what you think was meant: $16^3 + 9 + 16^2 + 7$ is
$4096 + 9 + 256 + 7$, not $9\cdot16^3 + 7\cdot16^2$.
:::

## Arithmetic directly in base b

:::definition{#base-arithmetic term="Adding, subtracting and multiplying in base b" depth="quick"}
The school algorithms work in any base; only the carry and borrow size changes from 10 to $b$.

- **Add** column by column. If a column total $s \ge b$, write $s - b$ and carry 1 (in general
  write $s \bmod b$ and carry $\lfloor s/b \rfloor$).
- **Subtract** column by column. If the top digit is too small, borrow 1 from the next column,
  which adds $b$ (not 10) to this column.
- **Multiply** digit by digit, writing each partial product in base $b$ (divide by $b$ for the
  carry), or convert to decimal, multiply, and convert back.
- **Always check** by converting the operands and the result to decimal.
:::

The reason is the same bundling idea as in Lesson 1. In base 8 a column holds a count of one
bundle size; once the count reaches 8, eight bundles are repacked into one bundle of the next
size, so one is carried and 8 is taken away from this column. Borrowing is the same move in
reverse: unpacking one bundle of the next size gives **8** (not 10) of this size. Students who
have only ever added in decimal carry at 10 out of habit; the column animation below makes the
carry at 8 visible.

Multiplication works the same way, but a column can produce a carry larger than 1: $6 \times 7 =
42$ in an octal column is $5 \cdot 8 + 2$, so you write 2 and carry **5**. To split a column total
$s$ into "digit and carry", divide by the base: digit $= s \bmod b$, carry $= \lfloor s/b \rfloor$.

:::viz{#carry spec="base-carry-column" mode="animate" depth="standard"}
:::

::::check{#check-octal-add title="Your turn" depth="standard"}
Find $(65)_8 + (27)_8$ and check it in decimal.

:::answer
Units $5 + 7 = 12 = 1\cdot8 + 4$: write 4, carry 1. Eights $6 + 2 + 1 = 9 = 1\cdot8 + 1$: write 1, carry 1.
Result $(114)_8$. Check: $53 + 23 = 76 = 64 + 8 + 4$.
:::
::::

### Worked examples: arithmetic in base 8 and 16

::::example{#ex-ar-add level="easy" title="Octal addition" depth="quick"}
Find $(37)_8 + (45)_8$.

:::step{why="7 + 5 = 12 is one eight and four units."}
Units: $7 + 5 = 12 = 1\cdot 8 + 4$. Write 4, carry 1.
:::

:::step{why="The carry joins the next column."}
Eights: $3 + 4 + 1 = 8 = 1 \cdot 8 + 0$. Write 0, carry 1.
:::

:::step{why="The final carry is the leading digit."}
Result $(104)_8$. Check: $31 + 37 = 68 = 64 + 4$.
:::

:::answer
$(104)_8$
:::
::::

::::example{#ex-ar-sub level="medium" title="Hex subtraction with a borrow" depth="standard"}
Find $(A9)_{16} - (3F)_{16}$.

:::step{why="9 is smaller than F (15), so borrow 1 from the 16s column; the borrow is worth 16 here."}
Units: $9 + 16 - 15 = 10 = A$.
:::

:::step{why="The 16s column gave 1 away."}
Sixteens: $A - 1 - 3 = 10 - 1 - 3 = 6$.
:::

:::step{why="Check in decimal."}
$(A9)_{16} - (3F)_{16} = 169 - 63 = 106 = 6\cdot16 + 10 = (6A)_{16}$.
:::

:::answer
$(6A)_{16}$
:::
::::

::::example{#ex-ar-mul level="gate" title="Octal multiplication" depth="standard"}
Find $(26)_8 \times (7)_8$.

:::step{why="Multiply the units digit; write the partial product in base 8."}
$6 \times 7 = 42 = 5\cdot 8 + 2$. Write 2, carry 5.
:::

:::step{why="Multiply the next digit and add the carry, again in base 8."}
$2 \times 7 + 5 = 19 = 2 \cdot 8 + 3$. Write 3, carry 2.
:::

:::step{why="The final carry is the leading digit."}
Result $(232)_8$. Check: $22 \times 7 = 154 = 2\cdot64 + 3\cdot8 + 2$.
:::

:::answer
$(232)_8$
:::
::::

::::example{#ex-ar-borrow level="gate" title="Edge case: a borrow chain across zeros" depth="standard"}
Find $(4002)_8 - (1765)_8$.

:::step{why="2 < 5, and the next two digits are 0, so the borrow must travel to the 4."}
Borrow from the 4 (it becomes 3); each 0 in between becomes $8$, then gives 1 away and becomes $7$.
The units column gets $2 + 8 = 10$.
:::

:::step{why="Subtract column by column with the new digits 3, 7, 7, 10."}
Units $10 - 5 = 5$; eights $7 - 6 = 1$; sixty-fours $7 - 7 = 0$; top $3 - 1 = 2$.
:::

:::step{why="Check in decimal."}
Result $(2015)_8$. $(4002)_8 = 2050$, $(1765)_8 = 1013$, $2050 - 1013 = 1037 = (2015)_8$.
:::

:::answer
$(2015)_8$. Each zero in a borrow chain becomes $b - 1$ (here 7), not 9.
:::
::::

:::trick{#trick-nibbles title="Learn the nibble table, then most questions take 30 seconds" depth="standard"}
With the 16-row hex table memorised (bits and 1-count), every conversion among bases 2, 4, 8
and 16 and every "count the 1s" question is look-up and regrouping. **Why it works:** the
grouping theorem. **When it fails:** for any base that is not a power of 2 (3, 5, 10, …);
then use division as in [Lesson 1](lesson:place-value#repeated-division).
:::

:::note{#recap-arith title="Recap" depth="quick"}
In base $b$ a carry or a borrow is worth $b$. Zeros in a borrow chain become $b - 1$. Check
arithmetic in decimal.
:::

## GATE questions on this lesson

All seven previous-year questions for this lesson, from the easiest to the hardest.

:::pyq{id="cse-2005-cs-17" tests="octal-hex,grouping,trap-left-group" depth="standard"}
:::

:::pyq{id="cse-2009-cs-5" tests="octal-hex,grouping" depth="standard"}
:::

:::pyq{id="cse-2017-2-cs-1" tests="grouping,octal-hex" depth="standard"}
:::

:::pyq{id="it-2004-it-43" tests="grouping,base4,octal-hex" depth="standard"}
:::

:::pyq{id="cse-1995-a-37" tests="hex-expansion,popcount" depth="standard"}
:::

:::pyq{id="cse-1991-a-1-iii" tests="hex-expansion,popcount,trap-printed" depth="standard"}
:::

:::aside{#aside-1991 title="About the 1991 question" depth="standard"}
The 1991 paper prints the sum exactly as $16^3 + 9 + 16^2 + 7 + 16 + 5 + 3$, which is 4392 and
has four 1s; the key agrees. Some solution sets read it as $9\cdot16^3 + 7\cdot16^2 + 5\cdot16 + 3
= (9753)_{16}$, which has nine 1s. That reading changes the question, so in the exam hall
evaluate what is printed.
:::

The IT 2005 question on multiplying octal numbers, $(33.4)_8 \times (23.4)_8$, is solved in
[Lesson 9](lesson:code-arithmetic#base-b-arith), together with the other number-arithmetic questions.

## Practice

:::practice{id="nx-dl-01-02-q01" depth="standard"}
:::

:::practice{id="nx-dl-01-02-q02" depth="standard"}
:::

:::practice{id="nx-dl-01-02-q03" depth="standard"}
:::

:::practice{id="nx-dl-01-02-q04" depth="standard"}
:::

:::practice{id="nx-dl-01-02-q05" depth="standard"}
:::

:::practice{id="nx-dl-01-02-q06" depth="standard"}
:::

:::practice{id="nx-dl-01-02-q07" depth="standard"}
:::

:::practice{id="nx-dl-01-02-q08" depth="standard"}
:::

:::practice{id="nx-dl-01-02-q09" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Binary, octal and hex on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Grouping | base $2^k$ ↔ binary in groups of $k$ bits: 2 (base 4), 3 (octal), 4 (hex) |
| Where to start | at the radix point, moving outward |
| Padding | integer part on the left, fraction on the right; never in the middle |
| Octal ↔ hex ↔ base 4 | through binary; every digit expands to its full group |
| Hex ↔ base 4 | digit by digit: one hex digit = two base-4 digits |
| Powers-of-16 sum | coefficients 0–15 are the hex digits; carry first if one is ≥ 16 |
| Count the 1s | add the 1-counts of the hex digits (F = 4, 7/B/D/E = 3) |
| $k$ hex F's | $2^{4k} - 1$ |
| Arithmetic in base $b$ | carry/borrow is worth $b$; zeros in a borrow chain become $b - 1$ |
:::

:::note{#further-depth title="Further depth: other power bases" depth="deep"}
Grouping works for any pair of bases where one is a power of the other: base 3 ↔ base 9 (pairs
of ternary digits) or base 3 ↔ base 27 (triples). It fails between bases like 4 and 8 that are
both powers of 2 but not of each other, which is why we always meet in binary. Base 32
(5-bit groups) and base 64 (6-bit groups) are used to write binary data as text.
:::
