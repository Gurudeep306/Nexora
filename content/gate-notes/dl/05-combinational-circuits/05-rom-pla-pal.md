---
id: rom-pla-pal
subject: dl
chapter: combinational-circuits
title: "ROM, PLA and PAL as combinational logic"
order: 5
prerequisites: [decoders-encoders]
pyq_topics: [dl/combinational]
est_minutes: 55
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every ROM size, product width, constant output bit, chip count, PLA and PAL term count and link count is checked by enumeration in content/gate-notes/_checks/dl/l5_05_rom_pla.py (comblib.py, with an exhaustive search for shared PLA terms)."
  - "Coverage checklist only (internal digests, never copied): set B pp. 125 and 127–128, set C pp. 373–391."
  - "Facts checked against: M. Morris Mano, Digital Design (read-only memory, programmable logic arrays, programmable array logic)."
  - "PYQs: src/gate/questions.json (cse-1993-ii-a-6-6, cse-1996-a-21, it-2004-it-10, cse-2012-cs-19); keys re-derived in l5_05_rom_pla.py with comblib.multiplier_rom."
updated: "2026-10-19"
---

Every circuit so far was designed for one function: you minimised it, then wired gates (or a MUX, or a
decoder) to match. This lesson meets three chips that are built **before** anyone knows the function.
A **ROM** stores the whole truth table and looks the answer up. A **PLA** builds only the product terms
you ask for and lets several outputs share them. A **PAL** builds product terms too, but each output has
its own private set. GATE asks one thing about them again and again: how big must the ROM be to hold a
given table (four questions, all about multipliers). Behind that one question sit two ideas worth
learning properly: a ROM is a decoder plus an OR array, and the product of two $n$-bit numbers needs
exactly $2n$ bits.

## Where this fits

[Lesson 3](lesson:decoders-encoders) proved that the outputs of an $n$:$2^n$ decoder are the $2^n$
minterms, and that ORing the right outputs realises any function. A ROM is exactly that circuit with
the OR connections left programmable, so this lesson is Lesson 3 made into a product. The PLA and PAL
come from the other end: they are the two-level AND–OR circuits of
[Chapter 3, Lesson 4](lesson:two-level-implementation) printed as a grid, with the shared product
terms of multi-output minimisation becoming shared rows. The arithmetic that fills a multiplier or
adder table (how wide a sum or a product is) is in [Chapter 1, Lesson 9](lesson:code-arithmetic);
adder and multiplier **circuits** were built from gates in Chapter 4 (arithmetic circuits), and here we
only count their inputs and outputs.

:::table{#radar title="GATE radar: ROM, PLA and PAL" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 4 (1993, 1996, 2004 IT, 2012) |
| Marks | 3 one-mark, 1 two-mark (fill in the blank) |
| Pattern 1 | Size of a ROM holding the table of an $n$-bit × $n$-bit multiplier, as words × bits: 1993, 1996, 2004 (IT) |
| Pattern 2 | The same size as a total number of bits, in K: 2012 |
| What examiners test | That the address is **both** operands together ($2n$ bits, $2^{2n}$ words), that the product needs $2n$ bits (not $n$, not $2n + 1$), that K means 1024, and that the answer is given in the unit asked (words × bits or total bits) |
| Also worth knowing | ROM vs PLA vs PAL (which plane is programmable), PLA term sharing and the complement trick, chips needed to expand a ROM |
:::

## ROM: a truth table you can wire in

:::intuition{#rom-intuition title="A printed truth table" depth="standard"}
Imagine the truth table of a 3-input, 2-output function printed on a card: eight rows, each row a
line of two answer bits. To use it you do not simplify anything. You read the input as a row number,
put your finger on that row, and read the two bits across. A **read-only memory** is that card in
silicon. The input bits are the **address** (the row number), a decoder puts its finger on exactly one
row (one word line goes high), and the stored bits of that row appear on the outputs.

The striking consequence: a ROM never needs minimisation. A function with 200 product terms and a
function with one cost the same, because the ROM stores every row whether the expression is short or
long. That is its strength (any function fits) and its weakness (it pays for every row, even rows that
are don't-cares).
:::

:::definition{#rom-structure term="ROM structure: a fixed AND plane and a programmable OR plane" depth="standard"}
A **$2^n \times m$ ROM** has $n$ address inputs and $m$ data outputs. Inside:

- an **$n$:$2^n$ decoder** whose outputs (the **word lines**) are the $2^n$ minterms $m_0, \dots,
  m_{2^n - 1}$ of the address. This is the **AND plane**; it is **fixed** (every minterm is always built);
- **$m$ OR gates**, one per output (the **bit lines**), each with a possible connection to every word
  line. This is the **OR plane**; it is **programmable**: a connection at (word line $i$, output $j$)
  means "bit $j$ of word $i$ is 1".

So a ROM has $2^n \cdot m$ programmable crosspoints, exactly one per bit it stores. The **size** of a
ROM is written **words × bits per word**: $2^n \times m$. Its total capacity is $2^n \cdot m$ bits.

Programming follows the truth table row by row: wherever the table has a 1, keep the connection;
wherever it has a 0, leave it open. In array drawings a cross (×) at a crosspoint marks a programmable
connection that is made, a dot marks a fixed connection, and no mark means no connection.
:::

The decoder's job is the one Lesson 3 described: for every address exactly one word line is 1, and
that line is the minterm of the address. Each OR gate then outputs 1 exactly when the active word line
is one of the lines connected to it. That is all a ROM is, and it already explains why it can store any
function at all.

:::theorem{#rom-any-function name="A ROM realises every function of its inputs" depth="standard"}
A $2^n \times m$ ROM can be programmed to realise **any** $m$ Boolean functions $f_1, \dots, f_m$ of its
$n$ address inputs, by connecting output $j$ to word line $i$ exactly when $f_j(i) = 1$. Conversely, the
outputs of a ROM are always functions of the address alone: it is a combinational circuit.
:::

:::proof{#proof-rom-any-function of="the ROM realisation theorem" depth="standard"}
**Idea first:** the decoder supplies every minterm, and an OR of minterms is the canonical SOP, which
every function has.

By [Lesson 3](lesson:decoders-encoders), word line $i$ is the minterm $m_i$ of the address: it is 1 on
row $i$ and 0 on every other row. Output $j$ is the OR of the word lines connected to it, so with the
programming above it equals $\sum_{i : f_j(i) = 1} m_i$, which is the canonical SOP of $f_j$ from
[Chapter 2, Lesson 4](lesson:canonical-forms). Every function has a canonical SOP, so every $f_j$ can be
realised, and the $m$ outputs are programmed independently because they share only the word lines,
which are read and never altered. Conversely, for a fixed program each output is an OR of minterms of
the address, a function of the address and nothing else: no memory of earlier inputs, so the read path
is combinational.
:::

:::viz{#rom-viz spec="rom-grid" mode="animate" depth="standard"}
:::

The animation stores a **3-bit squarer**: the address is a 3-bit number $x$, word $x$ holds $x^2$, and
there are six output columns $Q_5 \dots Q_0$ because the largest square, $7^2 = 49 = 110001_2$, has six
bits. So it is an $8 \times 6$ ROM, 48 stored bits. Its last step points out that two of those six
columns never need storing; why that is so is proved under "Sizing a ROM" below, so take it on trust
for now.

Any other table goes in the same way. Here is an $8 \times 2$ ROM programmed with two other columns:
the majority of three bits and their odd parity. (They are the carry and the sum of adding three bits,
which Chapter 4 (arithmetic circuits) built from gates; a ROM does not care what the columns mean.)

:::table{#rom-program-table title="Programming an 8 × 2 ROM: each 1 is a connection" depth="standard"}
| Address $ABC$ | Word line | $F_1 = \Sigma m(3, 5, 6, 7)$ | $F_2 = \Sigma m(1, 2, 4, 7)$ |
|:--|:--|:--|:--|
| 000 | $m_0$ | 0 | 0 |
| 001 | $m_1$ | 0 | 1 |
| 010 | $m_2$ | 0 | 1 |
| 011 | $m_3$ | 1 | 0 |
| 100 | $m_4$ | 0 | 1 |
| 101 | $m_5$ | 1 | 0 |
| 110 | $m_6$ | 1 | 0 |
| 111 | $m_7$ | 1 | 1 |
:::

Notice that the stored bits **are** the truth table: the ROM's contents and the function's table are
one and the same object. The $F_1$ OR gate has four connections ($m_3, m_5, m_6, m_7$) and the $F_2$ OR
gate has four ($m_1, m_2, m_4, m_7$); the word line $m_7$ feeds both, which costs nothing extra because
every word line is built anyway.

:::definition{#rom-types term="Kinds of ROM" depth="quick"}
- **Mask ROM:** the connections are made when the chip is manufactured; economical only in volume.
- **PROM** (programmable ROM): shipped with every connection made (or none); the user programs it once
  by blowing fuses with current pulses. It cannot be changed afterwards.
- **EPROM:** erasable (traditionally by ultraviolet light) and reprogrammable.
- **EEPROM** and **flash:** erased electrically, in place.

All of them read the same way, and all are **non-volatile**: the contents survive power-off. For
combinational logic only the read behaviour matters, so the sizing rules below apply to all of them.
:::

:::aside{#rom-2d-aside title="Two-dimensional decoding: fewer wires, the same bits" depth="deep"}
A $1024 \times 1$ ROM drawn as above needs a 10:1024 decoder: 1024 word lines. Real chips fold the
array into a square. Split the 10 address bits into 5 row bits and 5 column bits: a 5:32 decoder picks
one of 32 rows, the row delivers 32 stored bits at once, and a 32:1 MUX driven by the other 5 bits picks
one of them. The number of stored bits (1024) does not change, but the 5:32 decoder has 32 outputs and
the 32:1 MUX has 32 data inputs: $32 + 32 = 64$ lines instead of 1024 word lines. An uneven split costs more (4 + 6 bits
gives $16 + 64 = 80$, 3 + 7 bits gives $8 + 128 = 136$), so the balanced split is the cheapest. Nothing
about the size questions changes: the ROM still holds $2^n \times m$ bits.
:::

:::note{#recap-rom title="Recap" depth="quick"}
A $2^n \times m$ ROM is an $n$:$2^n$ decoder (fixed AND plane: every minterm) and $m$ OR gates
(programmable OR plane). Its contents are the truth table, so it realises any $m$ functions of $n$
inputs with no minimisation at all.
:::

## Sizing a ROM

:::intuition{#rom-sizing-intuition title="Count the rows, count the columns" depth="standard"}
Because a ROM stores the whole truth table, its size is the size of the table. The table has one row
for every combination of the inputs and one column for every output. Nothing else matters: not how
complicated the function is, not how many 1s it has, not which rows will "really" be used. So sizing a
ROM is two counts. How many input bits form the address? That gives the number of words. How many
output bits does each row need? That gives the word width.
:::

:::definition{#rom-sizing term="ROM size for a truth table" depth="standard"}
A table with $n$ input bits and $m$ output bits needs a ROM of

$$2^n \text{ words} \times m \text{ bits per word}, \qquad \text{total } 2^n \cdot m \text{ bits.}$$

Read the other way round: a $2^n \times m$ ROM has $n$ address pins and $m$ data pins. The number of
words fixes the address lines ($2^{10} = 1\text{K}$ words need 10 of them), and the word width is the
number of data lines; this "depth × width" view is how memory chips are labelled.

Units: $1\text{K} = 2^{10} = 1024$, $1\text{M} = 2^{20}$, so $2^{16}$ words $= 64\text{K}$ words and
$2^{20}$ bits $= 1$ Mbit. "Size" in a question means words × bits unless it asks for "the amount of ROM"
or "the number of bits", which is the product.
:::

:::derivation{#rom-size-derivation of="the ROM size for a table" depth="standard"}
**Words.** The address must select a different word for every input combination, and $n$ bits take
$2^n$ values, so $2^n$ words are needed; fewer would make two input rows share a word, and two rows with
different outputs could then not both be right. More are never needed.

**Width.** Each word must hold every output bit of its row, so the width is $m$ (after removing
outputs that do not need storing; see constant bits below).

**Total.** $2^n \cdot m$ bits, one programmable crosspoint per bit.

**Sanity check.** A 1-input, 1-output table (a NOT gate, say) has 2 rows of 1 bit: $2^1 \cdot 1 = 2$ bits,
and indeed the ROM stores "1" for address 0 and "0" for address 1. A 3-input, 2-output table needs
$8 \times 2 = 16$ bits: the sixteen 0/1 entries of the programming table above.
:::

:::trick{#trick-rom-size title="Inputs → words, outputs → width" depth="quick"}
Write two numbers before anything else: $n$ = total input bits (of **all** operands together) and $m$ =
output bits. The answer is $2^n \times m$. **Why it works:** the ROM stores one word per input row and one
bit per output column, so nothing else can enter. **When it fails:** only when outputs can be removed
(a constant column or a column equal to an input is wired, not stored) or when a question deliberately
asks for the minimum after such removals; and it is about ROMs only. A PLA or PAL is sized by product
terms, not by rows.
:::

### Multiplier ROMs

:::intuition{#multiplier-rom-intuition title="A times table you look up instead of working out" depth="standard"}
Think of the times table on the back of a school notebook: a 10 × 10 grid where you find row 7 and
column 8 and read 56. Nobody multiplies; they look up. A multiplier ROM is that grid in silicon. The
key observation is that you need **both** numbers to find the cell: the row alone (7) does not tell
you the answer. So the ROM's address must be the two operands written side by side, and every cell
must be wide enough for the biggest answer in the grid, which sits in the bottom-right corner. Those
two facts are the whole of every GATE multiplier question.
:::

:::definition{#multiplier-rom term="A ROM that multiplies" depth="standard"}
To multiply an $n$-bit unsigned number $A$ by an $n$-bit unsigned number $B$ with a ROM, use the
concatenation $AB$ as the address and store the product $A \times B$ in each word.

- **Address:** $n + n = 2n$ bits, so $2^{2n}$ words. The address is **both** operands: the ROM must hold
  a row for every pair $(A, B)$.
- **Width:** the number of bits of the largest product, $(2^n - 1)^2$. The theorem below shows this is
  exactly $2n$ bits for $n \ge 2$.
- **Size:** $2^{2n} \times 2n$; total $2^{2n} \cdot 2n$ bits.

For $n = 4$: $2^8 \times 8 = 256 \times 8 = 2048$ bits $= 2$ Kbit. For $n = 8$: $2^{16} \times 16 = 64\text{K}
\times 16 = 2^{20}$ bits $= 1$ Mbit. For an $n$-bit × $m$-bit multiplier the same reasoning gives
$2^{n+m}$ words of $n + m$ bits.
:::

:::theorem{#product-width name="The product of two n-bit numbers needs exactly 2n bits" depth="standard"}
For $n \ge 2$, every product of two $n$-bit unsigned numbers fits in $2n$ bits, and some product (the
largest, $(2^n - 1)^2$) needs all $2n$ of them. More generally, for $n, m \ge 2$ an $n$-bit × $m$-bit
product needs exactly $n + m$ bits. (For $n = 1$ the product $1 \times 1 = 1$ needs only 1 bit.)
:::

:::proof{#proof-product-width of="the product-width theorem" depth="standard"}
**Idea first:** squeeze the largest product between two powers of two: it is below $2^{2n}$ (so $2n$
bits hold it) and at least $2^{2n-1}$ (so $2n - 1$ bits do not).

The largest $n$-bit value is $2^n - 1$, so every product is at most
$$(2^n - 1)^2 = 2^{2n} - 2^{n+1} + 1.$$

**Upper bound.** Since $2^{n+1} > 1$, $(2^n - 1)^2 < 2^{2n}$. A number below $2^{2n}$ fits in $2n$
bits, so $2n$ bits always suffice.

**Lower bound.** $(2^n - 1)^2 \ge 2^{2n-1}$ is equivalent to $2^{2n} - 2^{2n-1} \ge 2^{n+1} - 1$, that is
$2^{2n-1} \ge 2^{n+1} - 1$. For $n \ge 2$ we have $2n - 1 \ge n + 1$, so $2^{2n-1} \ge 2^{n+1} > 2^{n+1} - 1$.
A number at least $2^{2n-1}$ has its bit $2n - 1$ set, so it needs all $2n$ bits.

**General case.** $(2^n - 1)(2^m - 1) = 2^{n+m} - 2^n - 2^m + 1 < 2^{n+m}$, and it is at least
$2^{n+m-1}$ iff $2^{n+m-1} \ge 2^n + 2^m - 1$, which holds when $n, m \ge 2$ (the larger of $2^n, 2^m$ is
at most $2^{n+m-2}$, so their sum is at most $2^{n+m-1}$). For $n = 1$ the product is just $B$ or 0, $m$
bits.

**Check:** $n = 4$: $15^2 = 225 = 11100001_2$, 8 bits, and $2^7 = 128 \le 225 < 256 = 2^8$. $n = 8$:
$255^2 = 65025$, and $2^{15} = 32768 \le 65025 < 65536 = 2^{16}$: 16 bits. Signed operands do not change
the width: [Chapter 1, Lesson 10](lesson:multiplication-booth) shows that a $2n$-bit two's-complement
product always holds an $n$-bit × $n$-bit signed product.
:::

:::trick{#trick-product-bits title="An n-bit × m-bit product has n + m bits" depth="quick"}
Add the operand widths: 4 × 4 → 8 bits, 8 × 8 → 16, 6 × 4 → 10. **Why it works:** each operand is
below $2^{\text{width}}$, so the product is below $2^{n+m}$, and the theorem shows the top bit is reached.
**When it fails:** a 1-bit operand ($1 \times m$ needs only $m$ bits, since multiplying by 0 or 1 just
copies or clears), and when the operands are restricted (a BCD digit is at most 9, so $9 \times 9 = 81$
needs 7 bits, not 8). Contrast with addition: an $n$-bit + $n$-bit sum needs only $n + 1$ bits.
:::

:::trap{#trap-rom-width title="A multiplier word of n bits or 2n + 1 bits" depth="standard"}
Two wrong widths appear in the options of every multiplier question. **$n$ bits** comes from storing
"a number the size of the operands": for 8 × 8 it gives 64K × 8 (option B in 1996), and the ROM would
lose the top half of every product above 255. **$2n + 1$ bits** comes from
mixing up the product with a sum: a sum gains one bit, a product doubles the width, and $(2^n - 1)^2 <
2^{2n}$ never reaches bit $2n$. The width is the bit-length of the **largest output value**: compute
$(2^n - 1)^2$ if in doubt.
:::

:::trap{#trap-bits-vs-words title="Answering in words when the question asks for bits (and K = 1000)" depth="standard"}
"Size" (1993, 1996, IT 2004) means words × width. "Amount of ROM" or "number of bits" (2012) means the
product: $256 \times 8 = 2048$ bits $= 2$ Kbit, because $1\text{K} = 1024$. The expected wrong answers:
**256** (the number of words, forgetting the width), **1 Kbit** (a 4-bit-wide word, $256 \times 4$), and
**128 bits** ($16 \times 8$, from using one operand as the address). Also watch the prefix: $2^{16} = 64\text{K}$,
not 65K, and $64\text{K} \times 16$ bits $= 1$ Mbit $= 128$ KB.
:::

### Other tables in a ROM

:::intuition{#rom-tables-intuition title="Every table is just inputs and outputs" depth="standard"}
A ROM never asks what a table means. An adder, a code converter and a squarer look completely
different as circuits, but to a ROM each is a list of rows (one per input combination) and columns
(one per output bit). So once you can count the input bits and the output bits of a table, you can
size its ROM. The only care needed is in the counting itself: a carry-in is an input too, a sum is
one bit wider than its operands, and some outputs turn out to need no column at all.
:::

:::definition{#rom-tables term="Sizing common tables" depth="standard"}
The recipe never changes: count the input bits and the output bits.

| Table | Input bits | Output bits | ROM |
|:--|:--|:--|:--|
| $n$-bit × $n$-bit multiplier | $2n$ | $2n$ | $2^{2n} \times 2n$ |
| $n$-bit + $n$-bit adder with carry-in | $2n + 1$ | $n + 1$ (sum and carry-out) | $2^{2n+1} \times (n + 1)$ |
| $n$-bit + $n$-bit adder, no carry-in | $2n$ | $n + 1$ | $2^{2n} \times (n + 1)$ |
| Squarer of an $n$-bit number | $n$ | $2n$, of which $2n - 2$ need storing | $2^n \times (2n - 2)$ |
| BCD to 7-segment | 4 | 7 | $16 \times 7$ |
| $n$-bit binary to Gray | $n$ | $n$, of which $n - 1$ need storing | $2^n \times (n - 1)$ |

Two lessons hide in this table. First, a ROM cannot exploit don't-cares: BCD uses only rows 0–9, yet
the 4-bit address still selects 16 words, and rows 10–15 simply hold anything. Second, some output
columns need no storage at all, which is the next idea. (Why a sum has $n + 1$ bits:
$(2^n - 1) + (2^n - 1) + 1 = 2^{n+1} - 1$; see [Chapter 1, Lesson 9](lesson:code-arithmetic).)
:::

:::intuition{#rom-constant-bits-intuition title="A column that remembers nothing" depth="standard"}
A ROM column is memory: it earns its place by holding a pattern of 0s and 1s that nothing else
supplies. A column that never changes (always 0, or always 1) remembers nothing, and neither does a
column that always repeats one of the address bits, because that bit is already on a wire. Such a
column can be a wire to ground, to the supply or to the address bit instead. The surprise is that
squares have two such columns, for every width.
:::

:::theorem{#rom-constant-bits name="Output columns that need no storage; bit 1 of a square is always 0" depth="standard"}
An output column that is constant (always 0 or always 1) or equal to an input bit can be wired directly
and left out of the ROM. In particular, for a squarer: bit 0 of $x^2$ equals bit 0 of $x$, and bit 1 of
$x^2$ (the bit of value 2) is **always 0**. So an $n$-bit squarer ROM needs only $2^n \times (2n - 2)$.
:::

:::proof{#proof-rom-constant-bits of="the constant square bits" depth="standard"}
**Idea first:** the last two bits of a number are the number mod 4, and squares mod 4 are only 0 or 1.

Bits 1 and 0 of $x^2$ together are $x^2 \bmod 4$. If $x$ is even, $x = 2k$ and $x^2 = 4k^2 \equiv 0
\pmod 4$: bits 1, 0 are 00. If $x$ is odd, $x = 2k + 1$ and $x^2 = 4k^2 + 4k + 1 = 4k(k + 1) + 1 \equiv 1
\pmod 4$: bits 1, 0 are 01. So bit 1 is 0 in every case, and bit 0 is 1 exactly when $x$ is odd, which is
bit 0 of $x$. The first column is a wire from $x_0$; the second is a wire from ground. Neither carries
information the ROM must store.

**Check** with 3 bits: the squares $0, 1, 4, 9, 16, 25, 36, 49$ are $000000$, $000001$, $000100$, $001001$,
$010000$, $011001$, $100100$, $110001$. The second-last digit is 0 in all eight. Bit 2 (value 4), in
contrast, is 1 for $4$ and $36$, so it must be stored; it is bit **1** that is constant.
:::

### Worked examples: ROM sizing

::::example{#ex-rom-easy level="easy" title="A 4-input, 3-output table" depth="quick"}
A combinational circuit has inputs $A, B, C, D$ and outputs $X, Y, Z$. What ROM stores it, and how many
bits does that ROM hold?

:::step{why="Every input combination is one address, so the address width is the number of input bits."}
Inputs: 4 bits, so $2^4 = 16$ words.
:::

:::step{why="Each word holds one row's outputs side by side."}
Outputs: 3 bits per word.
:::

:::step{why="Total capacity is words times width."}
$16 \times 3 = 48$ bits.
:::

:::answer
A $16 \times 3$ ROM, 48 bits. The size does not depend on what $X, Y, Z$ compute.
:::
::::

::::example{#ex-rom-medium level="medium" title="A 4-bit × 4-bit multiplier (1993, 2012)" depth="standard"}
A ROM stores the multiplication table of two 4-bit unsigned numbers. Give its size as words × bits and as
a total.

:::step{why="The ROM needs one word for every pair (A, B), so both operands form the address."}
Address $= A_3A_2A_1A_0B_3B_2B_1B_0$: 8 bits, $2^8 = 256$ words.
:::

:::step{why="The width is the bit-length of the largest product; the product-width theorem says 2n = 8."}
Largest product $15 \times 15 = 225 = 11100001_2$: 8 bits. Width 8.
:::

:::step{why="The total is the product, converted with K = 1024."}
$256 \times 8 = 2048$ bits $= 2$ Kbit.
:::

:::answer
$256 \times 8$ ($M = 256$, $N = 8$), which is 2048 bits = 2 Kbit.
:::
::::

::::example{#ex-rom-gate level="gate" title="An 8-bit × 8-bit multiplier in K × bits (1996, IT 2004)" depth="standard"}
What is the minimum ROM that stores the full table of an 8-bit × 8-bit unsigned multiplier? Give the
answer as words × bits, and say why $32\text{K} \times 16$ and $64\text{K} \times 8$ are wrong.

:::step{why="Both 8-bit operands form the address."}
16 address bits: $2^{16} = 65536 = 64\text{K}$ words.
:::

:::step{why="The largest product sets the width."}
$255 \times 255 = 65025$, and $2^{15} = 32768 \le 65025 < 65536 = 2^{16}$: 16 bits.
:::

:::step{why="Check the distractors against the two counts."}
$32\text{K} = 2^{15}$ words gives only 15 address bits: one input bit would have nowhere to go, so two
different rows would share a word. $64\text{K} \times 8$ keeps only the low byte of each product, so
e.g. $16 \times 16 = 256$ would read as 0.
:::

:::answer
$64\text{K} \times 16$ ($2^{20}$ bits = 1 Mbit). It is the minimum: fewer words lose rows, fewer bits lose
product bits, and no product bit is constant here (bit 1 of a general product $A \times B$ can be 1, e.g.
$1 \times 2$).
:::
::::

::::example{#ex-rom-edge level="gate" title="Edge case: a 4-bit adder with carry-in" depth="standard"}
A ROM must add two 4-bit unsigned numbers and a carry-in, giving a 4-bit sum and a carry-out. Find the
ROM size, and explain why "two 4-bit operands, so $2^8$ words of 8 bits" is wrong twice.

:::step{why="The carry-in is an input too, so it is part of the address."}
Inputs: $4 + 4 + 1 = 9$ bits: $2^9 = 512$ words.
:::

:::step{why="A sum gains one bit, it does not double: 15 + 15 + 1 = 31 fits in 5 bits."}
Outputs: 4 sum bits + 1 carry-out = 5 bits.
:::

:::step{why="Total capacity."}
$512 \times 5 = 2560$ bits.
:::

:::answer
$512 \times 5$ (2560 bits). The tempting $256 \times 8$ forgets the carry-in (halving the words) and sizes
the output like a product (8 bits instead of 5). The hardware adder itself was built in
Chapter 4 (arithmetic circuits); a ROM needs only the counts.
:::
::::

:::note{#recap-sizing title="Recap" depth="quick"}
ROM size = $2^{\text{input bits}} \times$ output bits. A multiplier: $2^{2n} \times 2n$ (address = both
operands; product width $2n$ by the theorem). An adder with carry-in: $2^{2n+1} \times (n + 1)$. Leave out
constant columns and copies of inputs (bit 1 of a square is always 0). Answer in the unit asked, with
K = 1024.
:::

## Building a bigger ROM from smaller chips

:::intuition{#expansion-intuition title="Wider by standing side by side, taller by taking turns" depth="standard"}
Suppose your chips are too narrow: they store 4 bits per word and you need 8. Put two chips side by
side, feed both the same address, and read 4 bits from each: together every address yields 8 bits.
Now suppose your chips are too short: they hold 1K words and you need 4K. Stack four of them and let
them take turns: the extra two address bits decide **which** chip answers, through a decoder driving the
chips' enable (chip-select) inputs, and only that chip drives the outputs.
:::

:::definition{#rom-expansion term="ROM expansion" depth="standard"}
To build a $W \times B$ memory from $w \times b$ chips ($W \ge w$ and $B \ge b$, with $W, w$ powers of
two; a chip that is already deep or wide enough simply has unused words or bits):

- **Width (word size):** $\lceil B / b \rceil$ chips side by side, all sharing the address and the enable;
  each supplies a slice of the word.
- **Depth (number of words):** $W / w$ rows of chips. The low $\log_2 w$ address bits go to every chip;
  the high $\log_2 (W / w)$ bits drive a $\log_2(W/w)$:$W/w$ decoder whose outputs enable one row of
  chips. (With two rows the decoder is just an inverter: the high bit enables one row, its complement
  the other.)
- **Chips needed:** $\dfrac{W}{w} \times \left\lceil \dfrac{B}{b} \right\rceil$.

The total capacity of the chips is at least $W \cdot B$ bits, and exactly that when $b$ divides $B$.
:::

:::derivation{#rom-expansion-count of="the chip count" depth="standard"}
Each row of chips must deliver all $B$ bits of a word, and one chip delivers $b$, so a row needs
$\lceil B / b \rceil$ chips. Each row covers $w$ addresses, and the $W$ addresses split into $W/w$ disjoint
blocks (the value of the high address bits), so $W / w$ rows. Multiplying gives the count.

**Sanity check:** the count can never be less than the capacity ratio $\frac{W B}{w b}$, because each chip
holds $w b$ bits; for $4\text{K} \times 16$ from $1\text{K} \times 4$ the ratio is
$\frac{4096 \cdot 16}{1024 \cdot 4} = 16$ and the formula gives $4 \times 4 = 16$.
:::

The animation builds exactly that $4\text{K} \times 16$ memory. Watch the two directions separately.
Along a row, four chips stand side by side and each hands over 4 of the 16 bits; across the rows, the
2:4 decoder on $A_{11}A_{10}$ lights one enable line, so only one row of four chips answers. The low
address bits $A_9 \dots A_0$ run to all sixteen chips at once: every chip looks up the same word
number inside itself, and the decoder decides whose answer counts.

:::viz{#rom-expansion-viz spec="rom-expansion" mode="animate" depth="standard"}
:::

### Worked examples: ROM expansion

::::example{#ex-exp-easy level="easy" title="1K × 8 from 1K × 4 chips" depth="quick"}
How do you build a $1\text{K} \times 8$ ROM from $1\text{K} \times 4$ chips?

:::step{why="The number of words already matches, so no decoder is needed."}
Both chips get the same 10 address lines and the same enable.
:::

:::step{why="Each chip supplies half of every word."}
Chip 1 gives bits 7–4, chip 2 gives bits 3–0.
:::

:::answer
2 chips side by side, no decoder.
:::
::::

::::example{#ex-exp-medium level="medium" title="4K × 8 from 1K × 8 chips" depth="standard"}
Build a $4\text{K} \times 8$ ROM from $1\text{K} \times 8$ chips. How many chips, and what decodes the
address?

:::step{why="4K words need 12 address bits; each chip uses 10."}
$A_9 \dots A_0$ go to every chip; $A_{11}A_{10}$ are left over.
:::

:::step{why="The two leftover bits pick one of four chips, which is exactly what a 2:4 decoder does."}
A 2:4 decoder on $A_{11}A_{10}$ drives the four chip enables: chip $k$ answers addresses $1024k$ to
$1024k + 1023$.
:::

:::step{why="Only the enabled chip drives the shared 8 output lines."}
The outputs are joined (tri-state or ORed), since exactly one chip is enabled.
:::

:::answer
4 chips and a 2:4 decoder.
:::
::::

::::example{#ex-exp-gate level="gate" title="4K × 16 from 1K × 4 chips" depth="standard"}
How many $1\text{K} \times 4$ chips build a $4\text{K} \times 16$ ROM, and how are they arranged?

:::step{why="Width: each row must supply 16 bits, 4 per chip."}
$16 / 4 = 4$ chips per row.
:::

:::step{why="Depth: each row holds 1K of the 4K words."}
$4\text{K} / 1\text{K} = 4$ rows, chosen by a 2:4 decoder on $A_{11}A_{10}$; one decoder output enables all
4 chips of its row.
:::

:::step{why="Check against capacity: 4K × 16 = 64 Kbit, each chip holds 4 Kbit."}
$64 / 4 = 16$. ✓
:::

:::answer
16 chips in a 4 × 4 array, plus one 2:4 decoder.
:::
::::

::::example{#ex-exp-edge level="gate" title="Edge case: a squarer ROM with constant bits removed" depth="standard"}
A ROM must square a 5-bit unsigned number. Only $32 \times 4$ chips are available. How many chips are
needed?

:::step{why="Squarer table: 5 input bits, and the largest square 31² = 961 < 1024 needs 10 bits."}
Full table: $32 \times 10$.
:::

:::step{why="Bit 0 of a square is the input's bit 0 and bit 1 is always 0, so both are wired, not stored."}
Stored part: $32 \times 8$.
:::

:::step{why="Width expansion only: 32 words already match."}
$8 / 4 = 2$ chips side by side.
:::

:::answer
2 chips. Storing all 10 bits would need $\lceil 10 / 4 \rceil = 3$ chips; spotting the constant bits saves
one.
:::
::::

:::note{#recap-expansion title="Recap" depth="quick"}
Side by side for width (same address), rows for depth (a decoder on the high address bits drives the
enables). Chips $= (W/w) \times \lceil B/b \rceil$. Remove constant output bits first.
:::

## PLA: build only the terms you need

:::intuition{#pla-intuition title="A ROM wastes rows; a PLA rents only what it uses" depth="standard"}
A 16-input ROM builds all 65 536 minterms, even if the functions you want are $AB + C'D$ and $AB + E$.
Those two functions need only three product terms. A **programmable logic array** keeps the ROM's
grid idea but makes the AND plane programmable too: instead of a fixed decoder that builds every
minterm, it has a modest number of AND gates, and you choose which literals each one takes. Then the OR
plane picks, for each output, which of those AND gates to OR together. A term used by two outputs is
built once and connected to both, exactly the sharing of multi-output minimisation.
:::

:::definition{#pla-def term="Programmable logic array (PLA)" depth="standard"}
A PLA of size **$n \times p \times m$** has $n$ inputs (each available true and complemented through
input buffers, so $2n$ literal lines), $p$ AND gates (the **product terms**, the AND plane, programmable:
each AND may take any of the $2n$ literals), and $m$ OR gates (the outputs, the OR plane, programmable:
each OR may take any of the $p$ terms). Many PLAs also have an XOR on each output with a programmable
second input, so each output can be taken true or complemented.

Programmable crosspoints: $2n \cdot p$ in the AND plane plus $p \cdot m$ in the OR plane (plus $m$
polarity fuses if the outputs can be inverted). A ROM, in comparison, has $2^n \cdot m$.
:::

:::intuition{#pla-table-intuition title="Writing a PLA program down" depth="standard"}
A ROM's program is its truth table. A PLA has no truth table inside it, only a list of product terms
and a list of which outputs use which terms, so it needs its own way of being written down. The idea
is to give every AND gate one line of text: for each input, say whether the gate takes the true
literal, the complemented literal or neither; for each output, say whether that output's OR gate is
connected to this AND gate. A fuse programmer reads exactly such a table, and GATE-style questions
often hand you one and ask what it computes.
:::

:::definition{#pla-program-table term="The PLA programming table" depth="standard"}
A PLA is programmed by a table with **one row per product term**:

- **input columns**, one per input: **1** if the term contains the true literal ($A$), **0** if it
  contains the complement ($A'$), **–** if the input is absent from the term;
- **output columns**, one per output: **1** if the term is connected to that output's OR gate, **–**
  (or blank) if it is not;
- with output polarity control, a last **T/C row** under the output columns: **T** if the output is
  taken true, **C** if the OR gate's result is complemented at the output.

For $f_1 = AB + BC'$ and $f_2 = AB + A'C$ (the easy example below):

| Product term | $A$ | $B$ | $C$ | $f_1$ | $f_2$ |
|:--|:-:|:-:|:-:|:-:|:-:|
| $AB$ | 1 | 1 | – | 1 | 1 |
| $BC'$ | – | 1 | 0 | 1 | – |
| $A'C$ | 0 | – | 1 | – | 1 |
| polarity | | | | T | T |

**Reading it back:** each input pattern is a cube (the 1/0 entries are fixed, the dashes are free),
and each output is the OR of the rows marked 1 in its column, complemented if its polarity is C. The
number of rows is $p$. A dash costs nothing: it only means that both of that input's links into the
AND gate are left open.
:::

:::viz{#pla-viz spec="pla-planes" mode="animate" depth="standard"}
:::

:::definition{#pla-sizing term="How many product terms a PLA needs" depth="standard"}
$p$ = the number of **distinct** product terms used by all outputs together, after choosing their SOPs
so that this number is smallest. Method:

1. Minimise each output (K-map), listing its minimal SOPs.
2. Look for terms two outputs can share; where an output has several minimal SOPs, pick the one that
   shares most. A shared term may even be non-prime for one output (as in multi-output minimisation).
3. Count distinct terms; a single literal (say $f = B$) still occupies one product line, because in a PLA
   every output is an OR of AND-plane rows.
4. If the outputs have polarity control, also try complemented outputs (below).

The number of literals inside a term does not matter for the count: one AND line can take any number of
inputs.
:::

:::derivation{#pla-term-count of="the PLA term count and link count" depth="standard"}
Each output $f_j$ is an OR of some product lines, so the lines connected to $f_j$ form an SOP of $f_j$:
every line is an implicant of $f_j$ and together they cover its 1s. The set of all lines is the union of
these SOPs, and its size is $p$. Minimising $p$ is therefore exactly the multi-output problem "fewest
distinct implicants such that each output's 1s are covered by its own implicants", which is what
`pla_min_terms` searches exhaustively in the checks.

**Links.** For $n = 3$, $p = 4$, $m = 2$: $2 \cdot 3 \cdot 4 + 4 \cdot 2 = 24 + 8 = 32$ crosspoints (34 with
output polarity), against $2^3 \cdot 2 = 16$ for an $8 \times 2$ ROM. **Sanity check:** for small $n$ the
ROM is the cheaper grid; the PLA wins as $n$ grows, because $2^n$ explodes while $p$ stays as small as the
functions allow: at $n = 16$, $p = 3$, $m = 2$ the PLA has $96 + 6 = 102$ crosspoints and the ROM
$2^{16} \cdot 2 = 131\,072$.
:::

:::definition{#pla-complement term="The complement trick" depth="standard"}
With programmable output polarity, an output may be built as $f'$ and inverted at the output. Since $f'$
is the OR of the 0-cells, its minimal SOP can have far fewer terms than $f$'s, and its terms may be
shareable with other outputs. For each output, minimise **both** $f$ and $f'$, and choose the
combination of polarities whose terms, shared, are fewest. With $m$ outputs there are $2^m$
combinations to try (4 for two outputs).
:::

:::trap{#trap-pla-literal title="Counting a single-literal output as free" depth="quick"}
In gate circuits a one-literal term needs no AND gate. In a PLA it still takes a product line: the
output OR gate can only take AND-plane rows. So $f_1 = B$, $f_2 = A'C + AB'$ needs 3 product terms, not
2.
:::

### Worked examples: PLA and PAL

::::example{#ex-pla-easy level="easy" title="Two outputs sharing a term" depth="quick"}
How many product terms does a PLA need for $f_1 = AB + BC'$ and $f_2 = AB + A'C$? How many does a PAL
need?

:::step{why="Both are already minimal SOPs: in each, both terms are essential prime implicants (f₁: m2 needs BC′, m7 needs AB; f₂: m1 needs A′C, m6 needs AB)."}
$f_1 = \Sigma m(2, 6, 7)$, $f_2 = \Sigma m(1, 3, 6, 7)$.
:::

:::step{why="AB is in both, so the PLA builds it once and connects it to both OR gates."}
PLA terms: $AB$, $BC'$, $A'C$: 3.
:::

:::step{why="A PAL cannot share: each output's OR gate has its own AND gates."}
PAL terms: $2 + 2 = 4$.
:::

:::answer
PLA: 3 product terms ($3 \times 3 \times 2$ PLA). PAL: 4 AND gates.
:::
::::

::::example{#ex-pla-medium level="medium" title="Product terms for three outputs" depth="standard"}
Find the fewest PLA product terms for $f_1 = \Sigma m(0, 1, 3, 5)$, $f_2 = \Sigma m(1, 3, 6, 7)$ and
$f_3 = \Sigma m(1, 5, 6, 7)$ over $(A, B, C)$.

:::step{why="Each 1-cell that lies in only one prime implicant forces it: m0 needs A′B′, m3 needs A′C, m5 needs B′C."}
$f_1 = A'B' + A'C + B'C$ (unique minimal SOP).
:::

:::step{why="Minimise the others the same way."}
$f_2 = A'C + AB$; $f_3 = B'C + AB$.
:::

:::step{why="Collect distinct terms; A′C, B′C and AB each serve two outputs."}
Distinct terms: $A'B'$, $A'C$, $B'C$, $AB$: 4.
:::

:::step{why="Write the program as a PLA table: one row per term, 1/0/– for the literals, 1 where an output uses the term."}
| Product term | $A$ | $B$ | $C$ | $f_1$ | $f_2$ | $f_3$ |
|:--|:-:|:-:|:-:|:-:|:-:|:-:|
| $A'B'$ | 0 | 0 | – | 1 | – | – |
| $A'C$ | 0 | – | 1 | 1 | 1 | – |
| $B'C$ | – | 0 | 1 | 1 | – | 1 |
| $AB$ | 1 | 1 | – | – | 1 | 1 |

Read the $f_1$ column back as a check: rows 1–3 give $A'B' + A'C + B'C$, cells $\{0, 1\} \cup \{1, 3\}
\cup \{1, 5\} = \{0, 1, 3, 5\}$, which is $f_1$.
:::

:::answer
4 product terms (an exhaustive search over all shared implicants confirms that 3 cannot do it). Built
separately, the three outputs would need $3 + 2 + 2 = 7$ AND gates.
:::
::::

::::example{#ex-pla-gate level="gate" title="PLA versus PAL for the same three outputs" depth="standard"}
For $f_1 = \Sigma m(1, 3, 5, 6)$, $f_2 = \Sigma m(2, 3, 6, 7)$, $f_3 = \Sigma m(0, 1, 5, 6)$, compare the
product terms a PLA needs with the AND gates a PAL needs. If the PAL gives every output the same
number of AND gates, how many AND gates must it have?

:::step{why="m6 has no 1-neighbour in f₁ (m2, m4, m7 are 0s), so ABC′ is forced; m3 forces A′C, m5 forces B′C."}
$f_1 = A'C + B'C + ABC'$.
:::

:::step{why="f₂ is the half B = 1 of the cube."}
$f_2 = B$: one term, but still one product line.
:::

:::step{why="m0 forces A′B′, m5 forces B′C, m6 again stands alone."}
$f_3 = A'B' + B'C + ABC'$.
:::

:::step{why="PLA: count distinct terms; B′C and ABC′ are shared by f₁ and f₃."}
$A'C$, $B'C$, $ABC'$, $B$, $A'B'$: 5 terms.
:::

:::step{why="PAL: no sharing, so add each output's own count; a uniform PAL must give every output the largest count."}
$3 + 1 + 3 = 7$ AND gates in use; with equal AND gates per output, $3 \times 3 = 9$ (two unused at $f_2$).
:::

:::answer
PLA: 5 product terms. PAL: 7 AND gates used, 9 in a PAL with 3 AND gates per output.
:::
::::

::::example{#ex-pla-edge level="gate" title="Edge case: implementing a complement needs fewer terms" depth="standard"}
A $3 \times p \times 2$ PLA with output polarity control must produce $f_1 = \Sigma m(0, 2, 4)$ and
$f_2 = \Sigma m(3, 5, 6, 7)$. Find the fewest product terms.

:::step{why="Minimise both true outputs first."}
$f_1 = A'C' + B'C'$ (2 terms); $f_2 = AB + AC + BC$ (3 terms). No term is shared: 5 lines.
:::

:::step{why="Minimise the complements; f₂′ is the 0-cells 0, 1, 2, 4."}
$f_1' = C + AB$; $f_2' = A'B' + A'C' + B'C'$.
:::

:::step{why="Try all four polarity choices and count distinct terms."}
($f_1$, $f_2$): 5. ($f_1$, $f_2'$): $A'C'$ and $B'C'$ are shared, so $\{A'B', A'C', B'C'\}$: **3**. ($f_1'$, $f_2$):
$\{C, AB, AC, BC\}$: 4. ($f_1'$, $f_2'$): 5.
:::

:::step{why="Building f₂′ and inverting it at the output gives f₂; the T/C row of the programming table records exactly that choice."}
Program $f_1$ true and $f_2$ complemented:

| Product term | $A$ | $B$ | $C$ | $f_1$ | $f_2$ |
|:--|:-:|:-:|:-:|:-:|:-:|
| $A'B'$ | 0 | 0 | – | – | 1 |
| $A'C'$ | 0 | – | 0 | 1 | 1 |
| $B'C'$ | – | 0 | 0 | 1 | 1 |
| polarity | | | | T | C |

The $f_2$ column ORs all three rows, giving cells $\{0, 1, 2, 4\}$, and the C inverts that to
$\{3, 5, 6, 7\}$, which is $f_2$. The $f_1$ column gives $\{0, 2\} \cup \{0, 4\} = \{0, 2, 4\}$, taken true.
:::

:::answer
3 product terms ($A'B'$, $A'C'$, $B'C'$), with output 2 inverted. Without polarity control the same
outputs need 5.
:::
::::

:::note{#recap-pla title="Recap" depth="quick"}
PLA: programmable AND and OR planes, size $n \times p \times m$, crosspoints $2np + pm$. $p$ = distinct
shared terms; single literals still take a line; with polarity control try $f'$ for each output. The
program is written as a table: one row per term, 1 / 0 / – per input, 1 / – per output, and a T/C row.
:::

## PAL, and choosing between the three

:::intuition{#pal-intuition title="Private AND gates for each output" depth="standard"}
A PLA's two programmable planes make it flexible but slow and costly (every signal crosses two fuse
arrays). A **PAL** (programmable array logic) keeps the programmable AND plane but **hard-wires** the OR
plane: each output OR gate is permanently connected to its own small group of AND gates, say 2 to 8.
Programming is simpler and the chip is faster, and the price is that no product term can be shared:
if two outputs need $AB$, the PAL builds it twice, once in each group.
:::

:::definition{#pal-def term="Programmable array logic (PAL)" depth="standard"}
A PAL has a **programmable AND plane** and a **fixed OR plane**: output $j$ is the OR of a fixed group of
$k_j$ AND gates that feed no other output. An output $f$ fits only if its minimal SOP has at most $k_j$
terms (for an output with a fixed inverter, it is $f'$ whose SOP must fit, since the group's OR is
complemented on its way out). Don't-cares may be used in that minimisation, because the PAL is free to
output anything on rows that never occur. The AND gates needed are the **sum** of the outputs' minimal term counts, and a PAL with the same
$k$ for every output needs $k \ge$ the largest count, so $k \times m$ AND gates in all. Many PALs add
flip-flops and feedback at the outputs (registered PALs); that is sequential logic and outside this
lesson.
:::

:::table{#pld-compare title="ROM vs PLA vs PAL" depth="standard"}
| | ROM (PROM) | PLA | PAL |
|:--|:--|:--|:--|
| AND plane | fixed: a full decoder, all $2^n$ minterms | programmable: $p$ chosen terms | programmable: chosen terms |
| OR plane | programmable | programmable | fixed |
| Sharing a term between outputs | every minterm is shared freely | yes | no |
| Minimisation needed | none (store the table) | yes, multi-output (shared terms) | yes, each output on its own |
| Size grows with | $2^n \cdot m$ | $p$ (the functions' complexity) | $\sum$ terms per output |
| Uses don't-cares | no (every address has a word) | yes | yes |
| Best for | dense tables: arithmetic, code conversion, look-up | many inputs, few shared terms | simple, fast glue logic |
:::

:::trap{#trap-pal-sharing title="Sharing product terms in a PAL" depth="standard"}
Counting a PAL like a PLA is the classic slip. For $f_1 = AB + BC'$ and $f_2 = AB + A'C$ the PLA needs 3
terms, so students answer 3 for the PAL too. The PAL's OR plane is fixed: $AB$ must be built in
$f_1$'s group **and** in $f_2$'s group, so the answer is 4. The reverse slip also costs marks: a PAL
whose groups have 2 AND gates cannot hold a 3-term output at all, even if another output leaves
gates unused (the parity example below works the same slip through, with 3-gate groups and a 4-term
output).
:::

:::aside{#lut-aside title="FPGA look-up tables are tiny ROMs" depth="deep"}
Larger programmable chips keep the same ideas. A **CPLD** is many PAL-like blocks joined by a
programmable switch matrix. An **FPGA** is a grid of logic blocks in a mesh of programmable wiring, and
each block's logic is a **look-up table (LUT)**: a $k$-input LUT is a $2^k \times 1$ memory (typically
$k = 4$ to 6) holding the truth table of any $k$-input function, read through a $2^k$:1 MUX tree
driven by the inputs. It is a ROM in the sense of this lesson, except that its contents sit in SRAM
cells loaded at power-up, so in most FPGAs the configuration is lost at power-off and reloaded from a
separate non-volatile memory. Sizing a LUT is the ROM rule: $k$ inputs → $2^k$ bits per output.
:::

### Worked examples: PAL

::::example{#ex-pal-easy level="easy" title="Programming a PAL with two AND gates per output" depth="quick"}
A PAL has inputs $A, B, C$ and two outputs, each the OR of its own 2 AND gates. Program it for
$f_1 = \Sigma m(0, 1, 6, 7)$ and $f_2 = \Sigma m(1, 3, 6, 7)$.

:::step{why="Minimise each output on its own, because a PAL never shares a gate between outputs."}
$f_1$: $m_0$'s only 1-neighbour is $m_1$, giving $A'B'$; $m_6$ pairs with $m_7$, giving $AB$. So
$f_1 = A'B' + AB$. $f_2$: $m_1$ and $m_3$ give $A'C$, $m_6$ and $m_7$ give $AB$, so $f_2 = A'C + AB$.
:::

:::step{why="An output fits when its term count is at most its group size."}
Both outputs need 2 terms, and each group has 2 AND gates: both fit.
:::

:::step{why="Programming a PAL is choosing literals for each AND gate; the OR connections are already fixed."}
Group 1: gate 1 takes $A'$ and $B'$, gate 2 takes $A$ and $B$. Group 2: gate 1 takes $A'$ and $C$,
gate 2 takes $A$ and $B$.
:::

:::step{why="Notice the repeat: AB appears in both groups."}
$AB$ is built twice, once for each output, so 4 AND gates are used. A PLA would need only 3 product
lines ($A'B'$, $A'C$, $AB$).
:::

:::answer
It fits, using all 4 AND gates; the term $AB$ is built once in each group, because a PAL's fixed OR
plane cannot share it.
:::
::::

::::example{#ex-pal-medium level="medium" title="A don't-care makes an output fit" depth="standard"}
One output of a PAL with 2 AND gates per output must be $f = \Sigma m(0, 1, 3, 5)$, and the input
$ABC = 111$ never occurs. Does $f$ fit?

:::step{why="First minimise without the don't-care: each of m0, m3, m5 lies in only one prime implicant."}
$f = A'B' + A'C + B'C$: 3 terms (the same function as $f_1$ in the medium PLA example). That is one
term too many for a group of 2.
:::

:::step{why="Row 7 never occurs, so the PAL may output anything there; mark it d and minimise again."}
With $m_7$ as a don't-care, $m_1, m_3, m_5, m_7$ form the group $C$, and $m_0$ still needs $A'B'$:
$f = C + A'B'$, 2 terms.
:::

:::step{why="Check that the new SOP is right on every row that can occur."}
$C + A'B'$ is 1 on rows 0, 1, 3, 5, 7 and 0 on rows 2, 4, 6. It agrees with $f$ everywhere except row 7,
which never occurs.
:::

:::step{why="Compare with a ROM, which cannot use the don't-care."}
A ROM would still store a word for address 111. For the ROM the don't-care changes nothing; for the
PAL it decides whether the output fits.
:::

:::answer
Yes: with row 111 as a don't-care, $f = C + A'B'$ fits the 2 AND gates. Without the don't-care it needs 3
and does not fit.
:::
::::

::::example{#ex-pal-gate level="gate" title="Gates to spare, and still no fit" depth="standard"}
A PAL has 2 outputs with 3 AND gates each (6 in all). Can it produce $f_1 = A \oplus B \oplus C$ and
$f_2 = AB$?

:::step{why="Every 1-cell of the parity function has no 1-neighbour (changing one bit changes the parity), so every prime implicant is a single minterm."}
$f_1 = \Sigma m(1, 2, 4, 7) = A'B'C + A'BC' + AB'C' + ABC$: 4 terms, and this is the only minimal SOP.
No other choice of SOP can help, because no two of its 1-cells can share a term.
:::

:::step{why="The second output is a single term."}
$f_2 = AB$: 1 term.
:::

:::step{why="The tempting count adds the terms and compares with the total."}
$4 + 1 = 5 \le 6$ AND gates, so it "should" fit. But $f_2$'s spare gates belong to $f_2$'s OR gate and
cannot be lent to $f_1$.
:::

:::step{why="Try the complement too, in case the output could be inverted."}
$f_1' = \Sigma m(0, 3, 5, 6)$ is the other parity, again 4 isolated cells and 4 terms. Neither polarity
fits a group of 3.
:::

:::answer
No. $f_1$ needs 4 AND gates in its own group, and the group has 3, even though only 5 of the 6 gates
would be in use. A PAL with at least 4 AND gates per output, a PLA (5 product lines, since $AB$ is not an
implicant of $f_1$ and nothing is shared) or an $8 \times 2$ ROM would all work.
:::
::::

::::example{#ex-pal-edge level="gate" title="Edge case: a PAL with inverting outputs" depth="standard"}
A PAL has 2 AND gates per output, and every output has a fixed inverter: output $j$ is the
**complement** of its group's OR. Which of $f_1 = \Sigma m(0, 1, 2, 3, 4, 5, 6)$ and $f_2 = \Sigma m(7)$
fit?

:::step{why="With an inverter on the output, the group must produce f′, so it is f′ whose SOP must fit."}
$f_1' = m_7 = ABC$: 1 term. $f_2' = \Sigma m(0, \dots, 6) = A' + B' + C'$: 3 terms.
:::

:::step{why="Compare each complement's term count with the group size of 2."}
$f_1$ fits (one AND gate, $ABC$, then the inverter gives $f_1$). $f_2$ does not fit: its group would need
3 AND gates.
:::

:::step{why="Compare with an active-high PAL, where f itself must fit."}
With active-high outputs the verdicts swap: $f_1 = A' + B' + C'$ needs 3 terms and does not fit, while
$f_2 = ABC$ needs 1.
:::

:::step{why="Sanity check with De Morgan."}
$\overline{ABC} = A' + B' + C'$, which is 1 on every row but 7: exactly $f_1$. So programming $ABC$ into
group 1 is right.
:::

:::answer
Only $f_1$ fits (program $ABC$ and let the inverter complement it); $f_2$ would need 3 AND gates for
$f_2' = A' + B' + C'$. The same two functions on an active-high PAL give the opposite answer, so always
check which polarity the output has before counting terms.
:::
::::

:::note{#recap-pal title="Recap" depth="quick"}
PAL: programmable AND, fixed OR, no sharing; AND gates = sum of the outputs' term counts, and **each**
output must fit its own group (spare gates elsewhere do not help). Don't-cares may shrink an output; with
a fixed inverting output it is $f'$ that must fit. ROM = fixed AND (all minterms) + programmable OR; PLA = both programmable.
:::

## Try it

Pick a 3-variable function in the **implement** tab and choose the decoder + OR target. The OR gate's
inputs are exactly the word lines a ROM column would connect: one ROM output column is one decoder + OR
realisation, and a ROM with $m$ outputs is $m$ such OR gates sharing one decoder. If the lab shows a NOR
of the 0-rows instead (it does when that list is shorter than the list of 1-rows), that is the
complement form. A ROM column always stores the 1-rows, so connect the other word lines: the ones the NOR
leaves out.

:::lab{#lab-rom lab="comb-workbench" tab="implement" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1993-ii-a-6-6" tests="multiplier-rom,rom-sizing" depth="standard"}
:::

:::pyq{id="cse-1996-a-21" tests="multiplier-rom,product-width" depth="standard"}
:::

:::pyq{id="it-2004-it-10" tests="multiplier-rom,rom-sizing" depth="standard"}
:::

:::pyq{id="cse-2012-cs-19" tests="multiplier-rom,trap-bits-vs-words" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dl-05-05-q01" depth="standard"}
:::

:::practice{id="nx-dl-05-05-q02" depth="standard"}
:::

:::practice{id="nx-dl-05-05-q03" depth="standard"}
:::

:::practice{id="nx-dl-05-05-q04" depth="standard"}
:::

:::practice{id="nx-dl-05-05-q05" depth="standard"}
:::

:::practice{id="nx-dl-05-05-q06" depth="standard"}
:::

:::practice{id="nx-dl-05-05-q07" depth="standard"}
:::

:::practice{id="nx-dl-05-05-q08" depth="standard"}
:::

:::practice{id="nx-dl-05-05-q09" depth="standard"}
:::

:::practice{id="nx-dl-05-05-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="ROM, PLA and PAL on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| ROM | $n$:$2^n$ decoder (fixed AND, all minterms) + $m$ programmable OR gates; stores the truth table; any function |
| ROM size | $2^{\text{input bits}}$ words × output bits; total = product; K = 1024 |
| Multiplier ROM | $n \times n$ bits: address $2n$ bits, $2^{2n} \times 2n$ (4-bit: $256 \times 8$ = 2 Kbit; 8-bit: $64\text{K} \times 16$) |
| Product width | $(2^n - 1)^2 < 2^{2n}$ and $\ge 2^{2n-1}$ for $n \ge 2$: exactly $2n$ bits; $n \times m$: $n + m$ |
| Adder ROM | $2n + 1$ inputs (with carry-in), $n + 1$ outputs |
| Constant bits | wire, do not store: bit 0 of $x^2$ = $x_0$, bit 1 of $x^2$ = 0 |
| Expansion | chips $= (W/w) \times \lceil B/b \rceil$; decoder on the high address bits drives the enables |
| PLA | programmable AND and OR; $p$ = distinct shared terms; $2np + pm$ crosspoints; try $f'$ with polarity control |
| PLA table | one row per term: inputs 1 / 0 / –, outputs 1 / –, a T/C polarity row |
| PAL | programmable AND, fixed OR; no sharing; AND gates = sum of per-output term counts; each output must fit its own group ($f'$ for an inverting output) |
:::
