---
id: codes
subject: dl
chapter: number-systems
title: "Binary codes: BCD, excess-3, Gray, parity and Hamming"
order: 8
prerequisites: [place-value, power-of-two-bases]
pyq_topics: [dl/number]
est_minutes: 60
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every value is checked by content/gate-notes/_checks/dl/l05_codes.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 15–19, set B pp. 146–150, set C pp. 214–222, set E p. 409. Slips in set C (Gray(16), parity wording) and the reflective/self-complementing mix-up are recorded in _errata/dl.md."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (binary codes, error detection); R. W. Hamming's single-error-correcting code as presented in standard computer-organisation texts."
  - "PYQs: src/gate/questions.json (dl/number); the cse-2006-cs-40 key is re-derived by brute force in l05_codes.py."
updated: "2026-10-17"
---

A **code** is a dictionary: it says which bit string stands for which symbol. Plain binary is one
such dictionary, and a very good one for arithmetic, but it is not the best for everything.
In this lesson you meet the codes digital systems actually use for decimal digits (BCD,
excess-3, 2421), for positions and counters (Gray code), and for catching and fixing errors
(parity and Hamming codes). You will learn how to convert into and out of each, how to tell
whether a code is weighted or self-complementing, why a Gray code never glitches, and how three
parity bits can locate any single flipped bit in a 7-bit word.

## Where this fits

It uses only place value and grouping from Lessons [1](lesson:place-value) and
[2](lesson:power-of-two-bases), so you can read it before or after the floating-point lessons
(5–7). The next lesson, [Arithmetic with number codes](lesson:code-arithmetic), adds and subtracts in
BCD and excess-3 using the codes defined here. The exclusive-OR $\oplus$ appears here only as "the bits differ"
(its algebra is in Chapter 2). The codes come back often: Gray order labels the rows and columns
of K-maps (Chapter 3), code converters (BCD → excess-3, binary → Gray) are classic combinational
design problems (Chapter 5), BCD and excess-3 addition are in [Lesson 9](lesson:code-arithmetic#bcd-add)
(the BCD adder circuit is in Chapter 4), and Gray-code counters are in Chapter 6.

:::table{#radar title="GATE radar: binary codes" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 1 directly (2006, 2 marks, MCQ) |
| Pattern | Gray-code "next value" functions as minterm lists |
| Where else codes appear | K-map ordering (Ch 3), BCD adders (Ch 4), code-converter circuits (Ch 5), Gray counters (Ch 6): those PYQs are mapped in their own lessons and build on this one |
| What examiners test | Reading BCD as binary, Gray → binary done bit-pairwise, and "parity corrects errors" |
:::

## Codes for decimal digits

:::intuition{#dictionary title="Choosing a dictionary for the job" depth="standard"}
A calculator shows decimal digits, so it is convenient to store each digit in its own 4-bit
box, even though that wastes 6 of the 16 patterns. A rotary knob must never report a wildly
wrong position while it is between two positions, so consecutive positions should differ in a
single bit. A memory chip wants to notice, and ideally fix, a bit flipped by noise, so it adds
a few check bits. Each need picks a different dictionary. None of them changes the numbers; they
change only how numbers are spelled in bits.
:::

:::definition{#weighted term="Weighted and unweighted codes" depth="quick"}
A 4-bit code for decimal digits is **weighted** with weights $(w_3, w_2, w_1, w_0)$ if every
codeword $b_3 b_2 b_1 b_0$ stands for the digit $w_3 b_3 + w_2 b_2 + w_1 b_1 + w_0 b_0$.

- **8421** (natural BCD): weights 8, 4, 2, 1.
- **2421**: weights 2, 4, 2, 1. Some digits have two possible codes (6 = 0110 or 1100); the standard table picks the one that makes the code self-complementing.
- **84−2−1**: weights 8, 4, −2, −1 (negative weights are allowed).
- **Excess-3** and **Gray** are **unweighted**: no fixed weights reproduce them.
:::

:::definition{#bcd term="BCD (8421 binary-coded decimal)" depth="quick"}
Write each decimal digit separately as 4 bits: $59 \to 0101\;1001$. Only $0000$ to $1001$ are used;
the six patterns $1010$ to $1111$ are **invalid** in BCD.

- A $k$-digit decimal number needs $4k$ BCD bits, against $\lceil k \log_2 10 \rceil \approx 3.32k$ bits in pure binary.
- BCD is **not** binary: $0101\,1001$ read as binary is 89, not 59.
- Packed BCD stores two digits per byte; unpacked BCD stores one digit per byte.
:::

:::definition{#excess-3 term="Excess-3 (XS-3)" depth="quick"}
Each decimal digit $d$ is stored as the 4-bit binary of $d + 3$: $0 \to 0011$, …, $9 \to 1100$.
It is unweighted (the bias of 3 is added per digit, not to the whole number) and
self-complementing: the code of $9 - d$ is the bitwise complement of the code of $d$.
:::

:::viz{#tables spec="code-tables" mode="static" depth="quick"}
:::

:::viz{#bcd-binary spec="bcd-vs-binary" mode="static" depth="standard"}
:::

:::trap{#trap-bcd-binary title="Reading BCD as binary" depth="quick"}
$0010\,0101$ is 25 in BCD but 37 in binary. Before reading any 8-bit pattern, ask which code it
is in. In BCD, convert each nibble separately; nibbles above $1001$ mean the pattern is not BCD
at all.
:::

### Worked examples: BCD and excess-3

::::example{#ex-bcd-easy level="easy" title="59 in BCD and excess-3" depth="quick"}
Write $59$ in BCD and in excess-3.

:::step{why="BCD codes each decimal digit on its own, in 4 bits."}
$5 \to 0101$, $9 \to 1001$: BCD $0101\,1001$.
:::

:::step{why="Excess-3 adds 3 to each digit before writing it in 4 bits."}
$5 + 3 = 8 \to 1000$, $9 + 3 = 12 \to 1100$: XS-3 $1000\,1100$.
:::

:::answer
BCD $0101\,1001$; excess-3 $1000\,1100$.
:::
::::

::::example{#ex-bcd-valid level="medium" title="Is it valid BCD?" depth="standard"}
Is $1010\,1001$ a valid BCD number? Is $0111\,0011$?

:::step{why="Check each nibble: in BCD a nibble must be 0000 to 1001 (0 to 9)."}
$1010 = 10$: not a decimal digit. So $1010\,1001$ is **invalid** BCD.
:::

:::step{why="Both nibbles of the second pattern are digits."}
$0111 = 7$, $0011 = 3$: valid, it is $73$.
:::

:::answer
$1010\,1001$ is invalid; $0111\,0011$ is BCD for 73.
:::
::::

::::example{#ex-bcd-bits level="gate" title="Bits for six decimal digits" depth="standard"}
How many bits does a 6-digit decimal number need in BCD, and in pure binary?

:::step{why="BCD spends 4 bits per digit."}
$6 \times 4 = 24$ bits.
:::

:::step{why="Binary needs 2ⁿ ≥ 10⁶, i.e. n ≥ 6 log₂10 ≈ 19.93."}
$n = 20$ bits ($2^{20} = 1048576 > 999999$).
:::

:::answer
24 bits in BCD, 20 bits in binary. BCD costs 20% more bits but makes decimal display easy.
:::
::::

::::example{#ex-bcd-2421 level="gate" title="Edge case: a weighted code with two spellings" depth="standard"}
In the 2421 code, which digits have more than one possible codeword, and which choice is standard?

:::step{why="List every 4-bit pattern and its weighted sum 2b₃ + 4b₂ + 2b₁ + b₀."}
Digits 2 to 7 each have two patterns, e.g. $2 = 0010$ or $1000$, $6 = 0110$ or $1100$.
:::

:::step{why="Choose so that code(9 − d) is the complement of code(d)."}
Standard table: $0000, 0001, 0010, 0011, 0100, 1011, 1100, 1101, 1110, 1111$ for 0 to 9.
:::

:::answer
Digits 2 to 7 have two spellings; the standard 2421 table uses 0–4 = $0000$–$0100$ and 5–9 = $1011$–$1111$, which is self-complementing.
:::
::::

## Self-complementing codes

:::definition{#self-complementing term="Self-complementing code" depth="quick"}
A decimal code is **self-complementing** if, for every digit $d$, the codeword of $9 - d$ is the
bitwise complement of the codeword of $d$. Then the 9's complement of a decimal number (used for
decimal subtraction) is obtained by inverting bits. Excess-3, 2421 and 84−2−1 are
self-complementing; 8421 is not.
:::

:::theorem{#weights-sum-nine name="A self-complementing weighted code has weights summing to 9" depth="standard"}
If a weighted 4-bit code with weights $w_3, w_2, w_1, w_0$ is self-complementing, then
$w_3 + w_2 + w_1 + w_0 = 9$. The converse is false.
:::

:::proof{#proof-sum-nine of="the weights-sum-to-9 condition" depth="deep"}
**Idea first:** a codeword and its complement together contain every bit exactly once.

For any digit $d$ with codeword $c$, self-complementing means $\bar c$ is the codeword of
$9 - d$. Every position holds a 1 in exactly one of $c$ and $\bar c$, so the weighted sums add
up to $w_3 + w_2 + w_1 + w_0$. But those sums are $d$ and $9 - d$, which add to 9. Hence the
weights sum to 9.

The converse fails: the weights $7, 1, 1, 0$ sum to 9, but no 4-bit pattern is worth 3, 4, 5 or
6, so they do not even form a code for all ten digits.
:::

### Worked examples: self-complementing codes

::::example{#ex-sc-xs3 level="easy" title="Excess-3 complements itself" depth="quick"}
Check that excess-3 is self-complementing for the pair $2$ and $7$.

:::step{why="Write both codewords."}
$2 \to 2 + 3 = 5 = 0101$ and $7 \to 10 = 1010$.
:::

:::step{why="Invert one and compare with the other."}
$\overline{0101} = 1010$. ✓ (In general code$(9 - d)$ $= 12 - d = 15 - (d + 3)$, the 4-bit complement of code$(d)$.)
:::

:::answer
Yes; for every $d$, $(9 - d) + 3 = 15 - (d + 3)$.
:::
::::

::::example{#ex-sc-2421 level="medium" title="The standard 2421 table" depth="standard"}
Check that the standard 2421 table is self-complementing for $3 \leftrightarrow 6$ and $4 \leftrightarrow 5$.

:::step{why="Read the table."}
$3 = 0011$, $6 = 1100$; $4 = 0100$, $5 = 1011$.
:::

:::step{why="Complement and compare."}
$\overline{0011} = 1100$ ✓ and $\overline{0100} = 1011$ ✓.
:::

:::answer
Yes. (The other pairs work the same way; the check script tests all ten digits.)
:::
::::

::::example{#ex-sc-8421 level="gate" title="8421 is not self-complementing" depth="standard"}
Show that plain BCD (8421) is not self-complementing.

:::step{why="One failing pair is enough; try 0 and 9."}
$0 = 0000$, so its complement is $1111$.
:::

:::step{why="But 9 in BCD is 1001, and 1111 is not even a valid BCD code."}
$9 = 1001 \ne 1111$.
:::

:::answer
Not self-complementing. Consistent with the theorem: $8 + 4 + 2 + 1 = 15 \ne 9$.
:::
::::

::::example{#ex-sc-negative level="gate" title="Edge case: negative weights" depth="standard"}
Is 84−2−1 self-complementing? Check its weights and one pair.

:::step{why="The necessary condition first."}
$8 + 4 - 2 - 1 = 9$. ✓
:::

:::step{why="Find codes for 4 and 5: 4 = 0100 (weight 4); 5 = 8 − 2 − 1 = 1011."}
$\overline{0100} = 1011$. ✓
:::

:::answer
Yes: $0 = 0000$, $9 = 1111$, and every pair $d$, $9-d$ is complementary.
:::
::::

:::trap{#trap-reflective title="'Reflected' is not 'self-complementing'" depth="standard"}
Reflected (Gray) codes are built by mirroring; self-complementing codes have code$(9 - d)$ = NOT
code$(d)$. They are different properties, and an option that treats them as the same is wrong.
:::

:::note{#recap-decimal title="Recap" depth="quick"}
BCD: 4 bits per digit, 1010–1111 invalid, not binary. XS-3: digit + 3, unweighted,
self-complementing. Weighted self-complementing codes have weights summing to 9 (necessary, not
sufficient).
:::

## Gray code

:::intuition{#gray-idea title="Why a knob should never change two bits at once" depth="standard"}
Imagine a position sensor whose value goes from 3 ($011$) to 4 ($100$). In binary all three bits
change. Real sensors do not switch at exactly the same instant, so for a moment the reading may
be $111$ or $000$: seven or zero, nowhere near 3 or 4. If neighbouring positions differ in only
**one** bit, the worst a mid-transition reading can do is show one of the two neighbours. That
is the whole point of Gray code.
:::

:::definition{#gray term="Reflected binary (Gray) code" depth="quick"}
The $n$-bit reflected Gray code lists all $2^n$ patterns so that consecutive codes differ in
exactly **one** bit, including the last and the first (it is cyclic).

**Construction:** $G_1 = 0, 1$. To build $G_{n+1}$, write $G_n$ with a 0 in front, then $G_n$ in
**reverse** order with a 1 in front.

**Conversions** ($b$ = binary, $g$ = Gray, bit $n-1$ on the left, $\oplus$ = "bits differ"):

$$
g_{n-1} = b_{n-1}, \qquad g_i = b_{i+1} \oplus b_i \quad\Longleftrightarrow\quad g = b \oplus (b \gg 1),
$$

$$
b_{n-1} = g_{n-1}, \qquad b_i = b_{i+1} \oplus g_i = g_{n-1} \oplus g_{n-2} \oplus \dots \oplus g_i .
$$

Gray code is unweighted and not used for arithmetic; it is used for position encoders, K-map
ordering and glitch-free counters.
:::

:::viz{#reflect spec="gray-reflect" mode="animate" depth="standard"}
:::

:::theorem{#gray-unit-distance name="The reflected Gray code is unit-distance and cyclic" depth="standard"}
For every $n \ge 1$, consecutive codes of $G_n$ differ in exactly one bit, and so do its last
and first codes.
:::

:::proof{#proof-gray of="unit distance, by induction on n" depth="deep"}
**Idea first:** the two halves are copies of a list that already works, and the only new
boundaries are where the mirror image meets itself.

*Base:* $G_1 = 0, 1$: the pair differs in one bit, and so does the wrap $1 \to 0$.

*Step:* assume $G_n$ is unit-distance and cyclic. In $G_{n+1}$:
1. Inside the top half, neighbours are $0x, 0y$ with $x, y$ neighbours in $G_n$: one bit differs.
2. Inside the bottom half, neighbours are $1y, 1x$ with $y, x$ neighbours in $G_n$ (reversed): one bit differs.
3. At the middle, the last of the top half is $0z$ and the first of the bottom half is $1z$ (the mirror repeats $z$, the last code of $G_n$): only the front bit differs.
4. At the wrap, the last code of $G_{n+1}$ is $1a$ and the first is $0a$, with $a$ the first code of $G_n$: only the front bit differs.

So $G_{n+1}$ is unit-distance and cyclic.
:::

:::derivation{#gray-inverse of="Gray → binary as a running XOR" depth="quick"}
Start from $g_i = b_{i+1} \oplus b_i$. XOR both sides with $b_{i+1}$ (XOR-ing a bit twice
cancels it): $b_i = b_{i+1} \oplus g_i$. So each binary bit is the **previous binary bit**
XOR the current Gray bit. Unrolling from the top, $b_{n-1} = g_{n-1}$, and

$$
b_i = g_{n-1} \oplus g_{n-2} \oplus \dots \oplus g_i .
$$

**Sanity check.** Gray $1110$: $b = 1$, $1 \oplus 1 = 0$, $0 \oplus 1 = 1$, $1 \oplus 0 = 1$:
binary $1011$, and indeed binary $1011$ gave Gray $1110$. ✓
:::

:::viz{#ladder spec="gray-xor-ladder" mode="animate" depth="standard"}
:::

:::viz{#disc spec="gray-wheel" mode="static" depth="standard"}
:::

:::trick{#trick-gray-shift title="Binary to Gray in one line" depth="standard"}
Gray $= b \oplus (b \gg 1)$: XOR the number with itself shifted right by one. For $13 = 1101$:
$1101 \oplus 0110 = 1011$. **Why it works:** bit $i$ of $b \gg 1$ is $b_{i+1}$, so the XOR gives
$b_{i+1} \oplus b_i$ in every place (and $b_{n-1} \oplus 0$ at the top). **When it fails:** the
reverse direction is **not** $g \oplus (g \gg 1)$; it needs the running XOR.
:::

:::trap{#trap-gray-pairwise title="Converting Gray to binary bit-pairwise" depth="quick"}
$b_i = g_{i+1} \oplus g_i$ is wrong; it must use the **binary** bit just computed:
$b_i = b_{i+1} \oplus g_i$. For Gray $1110$ the wrong rule gives $1001$ instead of $1011$.
:::

### Worked examples: Gray conversions

::::example{#ex-gray-to level="easy" title="Binary to Gray" depth="quick"}
Convert binary $1011$ to Gray code.

:::step{why="The first Gray bit copies the first binary bit."}
$g_3 = 1$.
:::

:::step{why="Each later Gray bit is the XOR of a binary bit with its left neighbour."}
$g_2 = 1 \oplus 0 = 1$, $g_1 = 0 \oplus 1 = 1$, $g_0 = 1 \oplus 1 = 0$.
:::

:::answer
Gray $1110$. (Check: $1011 \oplus 0101 = 1110$.)
:::
::::

::::example{#ex-gray-from level="medium" title="Gray to binary" depth="standard"}
Convert Gray $101100$ to binary.

:::step{why="The first binary bit copies the first Gray bit."}
$b_5 = 1$.
:::

:::step{why="Each later binary bit = previous binary bit ⊕ current Gray bit (a running XOR)."}
$b_4 = 1 \oplus 0 = 1$, $b_3 = 1 \oplus 1 = 0$, $b_2 = 0 \oplus 1 = 1$, $b_1 = 1 \oplus 0 = 1$, $b_0 = 1 \oplus 0 = 1$.
:::

:::step{why="Converting back is a cheap check."}
Binary $110111$; its Gray code is $110111 \oplus 011011 = 101100$. ✓
:::

:::answer
Binary $110111$ ($= 55$).
:::
::::

::::example{#ex-gray-list level="gate" title="The 3-bit reflected sequence" depth="standard"}
List the 3-bit Gray code for $0$ to $7$ and check the unit-distance property.

:::step{why="Reflect the 2-bit list 00, 01, 11, 10 and prefix 0 / 1."}
$000, 001, 011, 010, 110, 111, 101, 100$.
:::

:::step{why="Check every neighbour, including the wrap from the last code to the first."}
Each step changes one bit; $100 \to 000$ changes only the first bit.
:::

:::answer
$000, 001, 011, 010, 110, 111, 101, 100$; all eight boundaries are single-bit changes.
:::
::::

::::example{#ex-gray-wrap level="gate" title="Edge case: the wrap, and a fifth bit" depth="standard"}
What is the 4-bit Gray code of 15, and the 5-bit Gray code of 16?

:::step{why="15 = 1111; XOR with 0111."}
$1111 \oplus 0111 = 1000$. The next value wraps to $0000$, again one bit away.
:::

:::step{why="16 needs 5 bits: 10000; XOR with 01000."}
$10000 \oplus 01000 = 11000$.
:::

:::answer
Gray(15) $= 1000$ in 4 bits; Gray(16) $= 11000$ in 5 bits ($0000$ is only the 4-bit wrap-around).
:::
::::

### Worked examples: Gray "next value" functions

:::definition{#gray-successor term="The Gray successor function" depth="quick"}
Treat a Gray code $h$ as an input and let $g$ be the Gray code of the **next** number (mod $2^n$).
Each output bit $g_i$ is a Boolean function of the input bits. To get its minterm list:
1. for each count $k = 0 \dots 2^n - 1$, write $h = \text{Gray}(k)$ and $g = \text{Gray}(k + 1)$;
2. $g_i$ has a minterm at the **value of $h$** (read as a binary index) whenever bit $i$ of $g$ is 1.

The minterm indices are values of the *Gray input* $h$, not of the count $k$; that is the usual slip.
:::

::::example{#ex-succ-easy level="easy" title="The next code after 0110" depth="quick"}
In 4-bit Gray code, which code follows $0110$?

:::step{why="Find which number has Gray code 0110: running XOR gives binary 0100."}
$0110$ is the Gray code of $4$.
:::

:::step{why="The next number is 5 = 0101; its Gray code is 0101 ⊕ 0010."}
Gray(5) $= 0111$.
:::

:::answer
$0111$ (one bit away from $0110$, as it must be).
:::
::::

::::example{#ex-succ-2bit level="medium" title="The 2-bit successor functions" depth="standard"}
For 2-bit Gray code, write $g_1$ and $g_0$ (bits of the next code) as minterm lists of the input $h_1 h_0$.

:::step{why="Tabulate h = Gray(n) and g = Gray(n + 1 mod 4)."}
$n = 0$: $h = 00 \to g = 01$; $n = 1$: $01 \to 11$; $n = 2$: $11 \to 10$; $n = 3$: $10 \to 00$.
:::

:::step{why="Read the minterm index from h (as binary), and keep the rows where each g bit is 1."}
$g_1 = 1$ for $h = 01, 11$: $\Sigma(1, 3)$. $g_0 = 1$ for $h = 00, 01$: $\Sigma(0, 1)$.
:::

:::answer
$g_1 = \Sigma(1, 3) = h_0$ and $g_0 = \Sigma(0, 1) = \overline{h_1}$.
:::
::::

::::example{#ex-succ-3bit level="gate" title="A 3-bit successor bit" depth="standard"}
For 3-bit Gray code, find the minterm list of $g_2$, the first bit of the next code.

:::step{why="List h and the next code g for n = 0 … 7."}
$000 \to 001$, $001 \to 011$, $011 \to 010$, $010 \to 110$, $110 \to 111$, $111 \to 101$, $101 \to 100$, $100 \to 000$.
:::

:::step{why="Keep the inputs h whose successor starts with 1, and read h as a binary index."}
$g_2 = 1$ for $h = 010, 110, 111, 101$, i.e. indices $2, 6, 7, 5$.
:::

:::answer
$g_2 = \Sigma(2, 5, 6, 7)$.
:::
::::

::::example{#ex-succ-edge level="gate" title="Edge case: indexing by n instead of h" depth="standard"}
A student lists $g_2$ (3-bit) as $\Sigma(3, 4, 5, 6)$. What went wrong?

:::step{why="Those are the values of n whose successor's Gray code starts with 1."}
$n = 3, 4, 5, 6$ give next codes $110, 111, 101, 100$.
:::

:::step{why="The function's inputs are the Gray bits h, so each n must be replaced by Gray(n)."}
Gray$(3, 4, 5, 6) = 010, 110, 111, 101 = 2, 6, 7, 5$.
:::

:::answer
The minterms must be the Gray inputs: $\Sigma(2, 5, 6, 7)$, not $\Sigma(3, 4, 5, 6)$.
:::
::::

:::note{#recap-gray title="Recap" depth="quick"}
Gray: neighbours differ in one bit, cyclically; build by reflecting. Binary → Gray:
$g = b \oplus (b \gg 1)$. Gray → binary: running XOR from the left. Successor functions are
indexed by the Gray **input**.
:::

## Detecting and correcting errors

:::definition{#parity term="Parity bit" depth="quick"}
An **even-parity** bit makes the total number of 1s in the word even; an **odd-parity** bit makes
it odd. The receiver recounts. A single flipped bit (indeed any **odd** number of flipped bits)
changes the count's parity and is **detected**; an even number of flips goes unnoticed. Parity
cannot tell *which* bit flipped, so it cannot correct.
:::

:::definition{#hamming-distance term="Hamming distance" depth="quick"}
The Hamming distance $d(x, y)$ between two equal-length words is the number of positions where
they differ. The **minimum distance** $d_{\min}$ of a code is the smallest distance between two
different codewords. (Gray code is a sequence in which neighbours are at distance 1; a parity
code has $d_{\min} = 2$; Hamming(7,4) has $d_{\min} = 3$.)
:::

:::theorem{#min-distance name="What a minimum distance buys" depth="quick"}
A code with minimum distance $d_{\min}$ can
- **detect** every pattern of up to $d_{\min} - 1$ bit errors, and
- **correct** every pattern of up to $\lfloor (d_{\min} - 1)/2 \rfloor$ bit errors.

To correct $t$ errors you need $d_{\min} \ge 2t + 1$; to detect $s$ errors, $d_{\min} \ge s + 1$.
:::

:::proof{#proof-min-distance of="detection and correction by distance" depth="deep"}
**Idea first:** draw a "ball" of radius $t$ around each codeword; correction works when balls do
not touch.

*Detection.* If at most $d_{\min} - 1$ bits flip, the received word is at distance between 1 and
$d_{\min} - 1$ from the sent codeword, so it cannot be another codeword (those are at least
$d_{\min}$ away). The receiver sees a non-codeword and knows something went wrong.

*Correction.* If at most $t$ bits flip and $2t + 1 \le d_{\min}$, the received word $r$ is within
$t$ of the sent codeword $c$. For any other codeword $c'$, the triangle inequality gives
$d(r, c') \ge d(c, c') - d(c, r) \ge (2t + 1) - t = t + 1 > t$. So $c$ is the unique nearest
codeword, and decoding to the nearest codeword recovers it.
:::

:::definition{#hamming-code term="Hamming (7,4) code" depth="quick"}
Seven positions numbered 1 to 7; the parity bits sit at the powers of two (1, 2, 4) and the four
data bits at 3, 5, 6, 7. Parity bit $p_k$ (even parity) covers every position whose binary index
has the $k$ bit set:

- $p_1$ checks positions 1, 3, 5, 7
- $p_2$ checks positions 2, 3, 6, 7
- $p_4$ checks positions 4, 5, 6, 7

At the receiver, recompute the three checks; the **syndrome** $s = 4 s_4 + 2 s_2 + s_1$ (each
$s_k = 1$ if its check fails) is the position of a single flipped bit, or 0 if none.
In general, $p$ parity bits can protect $m$ data bits against any single error when
$2^p \ge m + p + 1$.
:::

:::derivation{#parity-count of="the parity-bit condition 2^p ≥ m + p + 1" depth="standard"}
With $p$ check bits the syndrome takes $2^p$ values. It must name every one of the $m + p$
positions where a single error can occur, plus "no error": $m + p + 1$ situations. So
$2^p \ge m + p + 1$.

**Sanity check.** $m = 4$: $p = 3$ gives $8 \ge 8$ ✓ (Hamming(7,4)); $p = 2$ gives $4 < 7$ ✗.
$m = 11$: $p = 4$ gives $16 \ge 16$ ✓, the (15,11) code.
:::

:::viz{#venn spec="hamming-74-venn" mode="animate" depth="standard"}
:::

### Worked examples: parity and Hamming codes

::::example{#ex-par-even level="easy" title="An even-parity bit" depth="quick"}
Find the even-parity bit for $1101001$.

:::step{why="Count the 1s in the data."}
$1101001$ has four 1s.
:::

:::step{why="Even parity wants an even total; four is already even."}
Parity bit $0$; the transmitted word is $1101001\,0$.
:::

:::answer
$0$
:::
::::

::::example{#ex-par-miss level="medium" title="One error caught, two errors missed" depth="standard"}
The word $1101\,0010$ (data plus even parity) is sent. Show what parity does with one and with two flipped bits.

:::step{why="One flip changes the number of 1s by one, making it odd."}
Flip bit 1: $0101\,0010$ has three 1s: odd → error detected.
:::

:::step{why="Two flips change the count by 0 or ±2, leaving it even."}
Flip bits 1 and 2: $0001\,0010$ has two 1s: even → error **not** detected.
:::

:::answer
Parity detects any odd number of errors and misses every even number; it never corrects.
:::
::::

::::example{#ex-ham-encode level="gate" title="Encode and correct with Hamming (7,4)" depth="standard"}
Encode the data $1011$ (positions 3, 5, 6, 7) with even-parity Hamming (7,4). Then position 6 is flipped in transit; decode.

:::step{why="Each parity bit makes its group even."}
$p_1$: positions 3, 5, 7 $= 1, 0, 1$ → $p_1 = 0$. $p_2$: 3, 6, 7 $= 1, 1, 1$ → $p_2 = 1$. $p_4$: 5, 6, 7 $= 0, 1, 1$ → $p_4 = 0$.
:::

:::step{why="Place every bit by position 1 … 7."}
Codeword $0110011$.
:::

:::step{why="Flip position 6 and recompute each check."}
Received $0110001$. Check 1 (1, 3, 5, 7: $0, 1, 0, 1$) passes; check 2 (2, 3, 6, 7: $1, 1, 0, 1$) fails; check 4 (4, 5, 6, 7: $0, 0, 0, 1$) fails.
:::

:::step{why="The syndrome is the binary number formed by the failing checks."}
$s = 4\cdot1 + 2\cdot1 + 1\cdot0 = 6$: flip position 6 back to get $0110011$.
:::

:::answer
Codeword $0110011$; the syndrome 6 locates and corrects the error.
:::
::::

::::example{#ex-ham-edge level="gate" title="Edge case: distance 4" depth="standard"}
A code has $d_{\min} = 4$. What can it detect and correct?

:::step{why="Detection: up to d − 1 errors."}
Detect up to 3 errors.
:::

:::step{why="Correction: up to ⌊(d − 1)/2⌋ errors."}
Correct up to $\lfloor 3/2 \rfloor = 1$ error.
:::

:::step{why="A 2-error word is at distance 2 from the sent codeword and at least 2 from every other, so it is never within 1 of any codeword: it is flagged, not miscorrected. A 3-error word can land within 1 of a wrong codeword and be 'corrected' wrongly."}
In correcting mode it corrects 1 **and** detects 2 errors (SEC-DED), but not 3.
:::

:::answer
Either detect 3, or correct 1 and detect 2; not both "correct 1 and detect 3".
:::
::::

:::trap{#trap-parity-corrects title="'Parity corrects single-bit errors'" depth="quick"}
A single parity bit only **detects** an odd number of errors. Correction needs a code with
$d_{\min} \ge 3$, such as Hamming (7,4), which uses three parity bits arranged so that the failing
checks spell out the error position.
:::

:::aside{#ascii title="Alphanumeric codes, in brief" depth="standard"}
ASCII is a 7-bit code (128 characters): 'A' $= (41)_{16} = 65$, 'a' $= (61)_{16} = 97$ (lower case
differs from upper case in a single bit, $(20)_{16}$), and the digit '0' $= (30)_{16} = 48$, so a
digit character minus $(30)_{16}$ is its value. Extended 8-bit codes and Unicode build on it.
:::

:::note{#recap-errors title="Recap" depth="quick"}
Parity: detects odd numbers of errors, corrects none. $d_{\min}$ detects $d_{\min} - 1$ and corrects
$\lfloor (d_{\min} - 1)/2 \rfloor$. Hamming: parity bits at positions $1, 2, 4, \dots$, syndrome =
error position, $2^p \ge m + p + 1$.
:::

## GATE question on this lesson

:::pyq{id="cse-2006-cs-40" tests="gray,gray-successor,ex-succ-edge" depth="standard"}
:::

## Practice

:::practice{id="nx-dl-01-08-q01" depth="standard"}
:::

:::practice{id="nx-dl-01-08-q02" depth="standard"}
:::

:::practice{id="nx-dl-01-08-q03" depth="standard"}
:::

:::practice{id="nx-dl-01-08-q04" depth="standard"}
:::

:::practice{id="nx-dl-01-08-q05" depth="standard"}
:::

:::practice{id="nx-dl-01-08-q06" depth="standard"}
:::

:::practice{id="nx-dl-01-08-q07" depth="standard"}
:::

:::practice{id="nx-dl-01-08-q08" depth="standard"}
:::

:::practice{id="nx-dl-01-08-q09" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Binary codes on one card" depth="quick"}
| Code | Rule | Notes |
|:--|:--|:--|
| BCD (8421) | each digit in 4 bits | $1010$–$1111$ invalid; $4k$ bits for $k$ digits; not binary |
| Excess-3 | digit $+ 3$ in 4 bits | unweighted, self-complementing |
| 2421, 84−2−1 | weighted, weights sum to 9 | self-complementing (2421 with the standard table) |
| Self-complementing | code$(9 - d)$ = NOT code$(d)$ | weighted ⇒ weights sum to 9 (not conversely) |
| Gray | neighbours differ in 1 bit, cyclic | reflect and prefix; $g = b \oplus (b \gg 1)$; $b_i = b_{i+1} \oplus g_i$ |
| Gray successor | minterms indexed by the Gray input | tabulate $h = $ Gray$(n)$, $g = $ Gray$(n+1)$ |
| Parity | even/odd count of 1s | detects odd numbers of errors only |
| Distance | $d_{\min}$ | detect $d_{\min} - 1$, correct $\lfloor (d_{\min} - 1)/2 \rfloor$ |
| Hamming | parity at $1, 2, 4, \dots$ | syndrome = error position; $2^p \ge m + p + 1$ |
:::

:::note{#further-depth title="Further depth: SEC-DED and Gray codes beyond binary" depth="deep"}
Adding one overall parity bit to Hamming (7,4) gives the (8,4) extended code with $d_{\min} = 4$:
it corrects any single error and detects any double error (SEC-DED), the scheme used in ECC
memory. Gray codes also exist for other bases (a decimal "reflected" code changes one digit by
one at each step), and $n$-bit Gray codes correspond to Hamiltonian cycles on the $n$-dimensional
cube, which is exactly why adjacent K-map cells (Chapter 3) differ in one variable.
:::
