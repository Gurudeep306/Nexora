---
id: decoders-encoders
subject: dl
chapter: combinational-circuits
title: "Decoders, demultiplexers, encoders and priority encoders"
order: 3
prerequisites: [multiplexers]
pyq_topics: [dl/combinational]
est_minutes: 50
difficulty: core
status: draft
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every decoder output, function, tree count, encoder code, priority-encoder equation, memory size and row count is checked by enumeration in content/gate-notes/_checks/dl/l4_03_decoders.py (netlists with DEC, MUX and enable nodes in comblib.py)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 72–75, set B pp. 122–129, set C pp. 295 and 309–325, set E p. 408."
  - "Facts checked against: M. Morris Mano, Digital Design (decoders, demultiplexers, encoders, priority encoders, decoder expansion and address decoding)."
  - "PYQs: src/gate/questions.json (cse-1992-b-4-b, cse-2007-cs-8, it-2008-it-9, cse-2013-cs-5, cse-2020-cs-20, cse-2022-cs-30, cse-2026-2-cs-49); keys re-derived in l4_03_decoders.py. cse-1992-b-4-b does not give the output codes; the solution states the assignment it uses."
updated: "2026-10-18"
---

A multiplexer picks **one of many inputs** and sends it to a single output. This lesson is about the
blocks that go the other way, and about their mirror images. A **decoder** takes an $n$-bit number and
turns on exactly **one of $2^n$ output lines**: the one whose index is that number. A **demultiplexer**
takes one data bit and steers it onto one of $2^n$ output lines. An **encoder** does the reverse of a
decoder: it looks at $2^n$ lines, one of which is on, and reports the index of that line as an $n$-bit
code. A **priority encoder** is an encoder that still behaves sensibly when several lines are on at once:
it reports the most important one. Along the way we will see that a decoder is a complete minterm
generator (so a decoder and one OR gate can build any function), how to build a big decoder out of small
ones, and how decoders select one word of a memory, which is where GATE most often meets them.

## Where this fits

[Lesson 2](lesson:multiplexers) built functions from multiplexers, and the MUX equation
$Y = \sum_i m_i(S)\, I_i$ already contained every minterm of the select lines. A decoder is that set of
minterms on its own, one per wire. The minterms themselves come from
[Chapter 2, Lesson 4](lesson:canonical-forms). A decoder followed by a programmable OR array is a ROM,
which [Lesson 5](lesson:rom-pla-pal) studies. Memory addressing (how many address bits a memory needs)
comes back in the computer-organisation part of the syllabus; here we only need the decoder's side of it.

:::table{#radar title="GATE radar: decoders, demultiplexers and encoders" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 7 (1992–2026) |
| Marks | 4 one-mark, 2 two-mark, 1 descriptive |
| Pattern 1 | A function from a decoder and one gate (OR, NOR, NAND, AND): IT 2008 |
| Pattern 2 | How many small decoders make a big one, with enables and no other gates: 2007 |
| Pattern 3 | Name a block from its truth table or its job in a system: 2013 (priority encoder), 2022 (decoders and a MUX) |
| Pattern 4 | Decoder size for a memory: 2020 ($m + n$ for a 1 KB byte-addressable RAM) |
| Pattern 5 | A decoder feeding a multiplexer; count the rows where the output is 1: 2026 |
| Pattern 6 | Design a priority encoder from multiplexers: 1992 (descriptive) |
| What examiners test | That decoder outputs are minterms (or maxterms when active-low), which address input is the MSB, that a decoder tree needs one more block to drive the enables, the difference between an encoder and a decoder, and that 1 K means 1024 |
:::

## Decoders: one line on for each input number

:::intuition{#decoder-intuition title="A hotel key panel" depth="standard"}
Picture the panel behind a hotel reception desk with one small lamp for every room. The receptionist types
a room number, and exactly one lamp lights: the lamp of that room. Typing 5 lights lamp 5 and nothing
else; typing 6 moves the light to lamp 6. The panel never lights two lamps at once and never lights none
(while it is switched on).

A decoder is that panel in logic. Its **address inputs** carry a binary number; its outputs are
numbered $0, 1, \dots, 2^n - 1$; the output whose number equals the address is 1 and every other output
is 0. A master switch, the **enable**, can turn the whole panel off, and then every lamp is dark. The
interesting part is what the lamps *are*: lamp $i$ is lit on exactly one input row, row $i$, so it is the
minterm $m_i$. A decoder hands you every minterm of its inputs on a separate wire.
:::

:::definition{#decoder-def term="Decoder (n : 2ⁿ)" depth="standard"}
An **$n:2^n$ decoder** (also written $n$-to-$2^n$ or $n \times 2^n$) has $n$ address inputs
$A_{n-1} \dots A_1 A_0$ (with $A_{n-1}$ the most significant bit), usually one enable input $E$, and
$2^n$ outputs $D_0, \dots, D_{2^n - 1}$.

- **Active-high outputs (the default):** when $E = 1$, the output $D_i$ whose index $i$ equals the
  address $(A_{n-1} \dots A_0)_2$ is 1 and all other outputs are 0. The outputs are **one-hot**: exactly
  one of them is 1. When $E = 0$ every output is 0.
- **Active-low outputs:** every output is inverted. When enabled, the selected output is **0** and all
  the others are 1 (one-cold); when disabled, every output is 1. The pins are usually drawn with a bubble
  and named $\overline{D}_i$.
- **Active-low enable:** the enable pin has a bubble and the decoder works when $\overline{E} = 0$.

A 2:4 decoder with enable is four 3-input AND gates and two inverters:
$D_0 = E\,\overline{A_1}\,\overline{A_0}$, $D_1 = E\,\overline{A_1}A_0$, $D_2 = E\,A_1\overline{A_0}$,
$D_3 = E\,A_1A_0$. A 3:8 decoder has eight 4-input ANDs, and so on. The decoder has **no select lines and
no data input**: the address bits are its only information inputs. Some decoders use fewer than $2^n$
outputs: a BCD-to-decimal decoder has 4 inputs and only 10 outputs (the codes 10–15 never occur).

| $E$ | $A_1$ | $A_0$ | $D_0$ | $D_1$ | $D_2$ | $D_3$ |
|:--|:--|:--|:--|:--|:--|:--|
| 0 | x | x | 0 | 0 | 0 | 0 |
| 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| 1 | 0 | 1 | 0 | 1 | 0 | 0 |
| 1 | 1 | 0 | 0 | 0 | 1 | 0 |
| 1 | 1 | 1 | 0 | 0 | 0 | 1 |
:::

:::theorem{#decoder-minterms name="Decoder outputs are minterms" depth="standard"}
For an $n:2^n$ decoder with active-high outputs and enable $E$,
$$
D_i = E \cdot m_i(A_{n-1}, \dots, A_0) \qquad (i = 0, 1, \dots, 2^n - 1),
$$
where $m_i$ is the $i$-th minterm of the address variables, with $A_{n-1}$ as the most significant bit.
With active-low outputs, $\overline{D}_i = \overline{E \cdot m_i}$, which for $E = 1$ is the maxterm
$M_i$.
:::

:::proof{#proof-decoder-minterms of="decoder outputs are minterms" depth="standard"}
**Idea first:** both sides are 1 on exactly the same input rows, namely row $i$ with the enable on.

By definition, $D_i = 1$ exactly when $E = 1$ and the address bits read $i$ in binary. The minterm $m_i$
is the product of all $n$ address literals, each in the polarity of the corresponding bit of $i$ (plain
where the bit is 1, complemented where it is 0), so $m_i = 1$ exactly when the address bits read $i$.
Hence $E \cdot m_i = 1$ exactly when $E = 1$ and the address is $i$: the same rows. Two Boolean functions
that are 1 on the same rows are equal. For active-low outputs, complement both sides; with $E = 1$,
$\overline{m_i} = M_i$ by De Morgan.
:::

:::viz{#decoder-lighting-viz spec="decoder-lighting" mode="animate" depth="standard"}
:::

:::intuition{#active-low-intuition title="A lamp that goes dark instead of lighting" depth="standard"}
Turn the hotel panel inside out: every lamp is normally **on**, and typing a room number makes that one
lamp go **dark**. The panel carries exactly the same information (one lamp differs from all the others,
and its position is the number you typed), only the polarity is reversed. Someone who looks for "the lit
lamp" on this panel sees seven lit lamps and is confused; someone who looks for "the odd lamp out" reads
it at once.

That is an active-low decoder. Its selected output is the one that is 0. Because every output is now the
complement of a minterm, the gate that collects them must change too: where an active-high decoder needs
an OR ("is any of my lamps lit?"), an active-low one needs a NAND ("is any of my lamps dark?"). The rest
of this block makes that precise.
:::

:::definition{#active-low term="Active-low decoders: the outputs are maxterms" depth="standard"}
Real decoder chips usually have active-low outputs, because a NAND gate is cheaper than an AND gate. The
selected output goes to 0 and the rest stay at 1. By the theorem above, with the enable on,
$\overline{D}_i = \overline{m_i} = M_i$: the active-low outputs are the **maxterms** of the address.

That changes which gate builds a function:
- **Active-high outputs** are minterms, so $f = \text{OR}$ of the outputs of $f$'s 1-rows.
- **Active-low outputs** are complemented minterms, so $f = \text{NAND}$ of the outputs of $f$'s 1-rows
  ($\overline{\overline{m_a}\,\overline{m_b}\cdots} = m_a + m_b + \cdots$ by De Morgan), or
  $f = \text{AND}$ of the outputs of $f$'s 0-rows (a product of maxterms is the canonical POS).

So a NAND gate on an active-low decoder plays the role of the OR gate on an active-high decoder, and an
AND gate on an active-low decoder gives the POS.
:::

:::trap{#trap-active-low title="An AND or OR on decoder outputs without saying which polarity" depth="standard"}
Some printed questions draw an AND gate on decoder outputs and expect you to read off a product of
maxterms, without ever saying that the outputs are active-low. Read literally, with ordinary active-high
outputs, an AND of two or more **different** outputs is the constant 0: two different minterms are never 1
on the same row. The same mix-up runs the other way: an OR of two or more different active-low outputs
is the constant 1, enabled or not: while enabled at most one of them can be 0, and while disabled every
one of them is 1.

So the first thing to settle for any decoder-plus-gate circuit is the output polarity. If the figure has
bubbles or the text says "active-low", outputs are maxterms; otherwise they are minterms. Examiners expect
two wrong answers here: "constant 0 / constant 1" from a student who assumed the wrong polarity, and the
**complement** of $f$ from a student who used the right minterms with the wrong gate. In our own
questions we always state the polarity; when you meet an unstated AND-on-decoder question, say which
reading you used.
:::

:::note{#recap-decoders title="Recap" depth="quick"}
An $n:2^n$ decoder turns on output $i$ when the address is $i$: $D_i = E\,m_i$. Disabled, every output is
0. Active-low outputs are inverted: they are maxterms, the selected one is 0, and NAND (or AND of the
0-rows) replaces OR.
:::

## Building functions from a decoder

:::intuition{#function-intuition title="Every minterm on a separate wire" depth="standard"}
The canonical SOP of a function is an OR of the minterms where it is 1. A decoder produces every minterm
of its inputs. So the canonical SOP costs nothing more than **one OR gate** that collects the right
wires: for $f = \Sigma m(1, 2, 4, 7)$, wire $D_1, D_2, D_4, D_7$ into an OR gate. No K-map, no
simplification, no thought about which terms combine.

The same decoder also gives the complement for free. The outputs that you did **not** wire into the OR
are the minterms of $\overline{f}$. OR them and you get $\overline{f}$; NOR them and you get $f$ back. So
you can always choose the shorter of the two lists. A function with 7 ones out of 8 rows needs a
7-input OR, or a NOR of just 1 output (which is simply an inverter).
:::

:::definition{#decoder-function term="Method: a function from a decoder and one gate" depth="standard"}
Given $f$ of the $n$ address variables and an enabled $n:2^n$ decoder:
1. **Fix the address order.** Write down which variable goes to the MSB address pin and which to the LSB.
   Minterm numbers are read in that order.
2. **List the rows.** Let $S_1$ be the rows where $f = 1$ and $S_0$ the rows where $f = 0$.
3. **Pick the gate** from the output polarity and the shorter list:

| Outputs | Use the 1-rows $S_1$ | Use the 0-rows $S_0$ |
|:--|:--|:--|
| Active-high (minterms) | OR of $D_i$, $i \in S_1$ | NOR of $D_i$, $i \in S_0$ |
| Active-low (maxterms) | NAND of $\overline{D}_i$, $i \in S_1$ | AND of $\overline{D}_i$, $i \in S_0$ |

**Reading a circuit** is the same table backwards: find the gate and the polarity, read off the indices,
turn them into a minterm (or maxterm) list in the address order, then simplify with a K-map.

Several functions of the same inputs share one decoder: each function needs only its own gate.
:::

:::theorem{#decoder-or name="A decoder and one gate realise any function" depth="standard"}
Let $f$ be any function of $n$ variables, wired in a fixed order to the address of an enabled
active-high $n:2^n$ decoder, and let $S_1$ and $S_0$ be its 1-rows and 0-rows. Then
$$
f = \sum_{i \in S_1} D_i \qquad\text{and}\qquad f = \overline{\sum_{i \in S_0} D_i}.
$$
For active-low outputs, $f = \overline{\prod_{i \in S_1} \overline{D}_i} = \prod_{i \in S_0} \overline{D}_i$.
:::

:::proof{#proof-decoder-or of="decoder + OR and decoder + NOR" depth="standard"}
**Idea first:** the OR form is the canonical SOP, and the NOR form is the complement of the canonical SOP
of $\overline{f}$.

With $E = 1$, $D_i = m_i$ by the minterm theorem. The canonical SOP of $f$ is
$\sum_{i \in S_1} m_i$, which is exactly the OR of the $D_i$ with $i \in S_1$. The rows split into
$S_1 \cup S_0$ with no overlap, so $\overline{f} = \sum_{i \in S_0} m_i$, and complementing (a NOR gate)
gives $f$. For active-low outputs $\overline{D}_i = \overline{m_i}$: a NAND of the $\overline{m_i}$ with
$i \in S_1$ is, by De Morgan, the OR of the $m_i$, which is $f$; an AND of the $\overline{m_i} = M_i$ with
$i \in S_0$ is the canonical POS of $f$.

**One condition.** The decoder must be enabled. With $E = 0$ every active-high output is 0, so the OR
form gives 0 while the NOR form gives 1: the two forms agree only while the decoder is on.
:::

:::viz{#decoder-function-viz spec="decoder-function" mode="animate" depth="standard"}
:::

:::trick{#trick-short-list title="OR the 1s or NOR the 0s, whichever list is shorter" depth="standard"}
Count the 1-rows of $f$. If more than half the rows are 1s, wire the 0-rows into a NOR instead of the
1-rows into an OR: the gate has fewer inputs and computes the same $f$.

**Why it works:** the decoder outputs not used by $f$ are exactly the minterms of $\overline{f}$, and a
NOR gate is an OR followed by an inverter. **When it fails:** only when the enable can be 0 (then the NOR
outputs 1 on every disabled row), or when the question fixes the gate type. In reverse, the trick
explains circuits: a NOR on four outputs of a 3:8 decoder is the function that is 1 on the **other** four
rows.
:::

:::trap{#trap-decoder-order title="Which address input is the MSB?" depth="standard"}
A decoder drawn with inputs labelled $z, y, x$ from top to bottom does not tell you which is the most
significant bit unless the figure or the text says so. If $z$ is the MSB, output $D_1$ is
$\overline{z}\,\overline{y}x$; if $x$ is the MSB, the same output is $\overline{x}\,\overline{y}z$. A
student who reads the order backwards gets a different function. The quick fix: reversing the bit order
renumbers each output by reversing the bits of its index ($1 = 001 \to 100 = 4$, $3 = 011 \to 110 = 6$).

In GATE IT 2008 the decoder's inputs are $z$ (MSB), $y$, $x$ (LSB), and a NOR collects $O_7, O_5, O_2,
O_0$. The answer happens to survive the reversal (the set $\{1, 3, 4, 6\}$ maps onto itself: $1 \leftrightarrow 4$
and $3 \leftrightarrow 6$ swap places), but you only know that after checking. The edge-case example below shows a wiring where it does not.
:::

### Worked examples: functions from a decoder

::::example{#ex-dec-easy level="easy" title="A full adder from one 3:8 decoder" depth="quick"}
Build the full adder's sum $S$ and carry $C_{out}$ of inputs $A$, $B$, $C_{in}$ from one 3:8 decoder with
active-high outputs ($A$ = MSB) and OR gates.

:::step{why="The sum is 1 when an odd number of inputs are 1, so list those rows: 001, 010, 100, 111."}
$S = \Sigma m(1, 2, 4, 7)$.
:::

:::step{why="The carry is 1 when at least two inputs are 1: rows 011, 101, 110, 111."}
$C_{out} = \Sigma m(3, 5, 6, 7)$.
:::

:::step{why="Decoder output Dᵢ is minterm mᵢ, so each canonical SOP is an OR of the matching outputs; both outputs share the one decoder."}
$S = D_1 + D_2 + D_4 + D_7$ and $C_{out} = D_3 + D_5 + D_6 + D_7$: one decoder and two 4-input OR gates.
:::

:::answer
One 3:8 decoder and two 4-input ORs. Output $D_7$ feeds both gates, because row 111 has $S = C_{out} = 1$.
With $A$ held at 0, the same decoder gives the half adder of $B$ and $C_{in}$: $S = D_1 + D_2$, $C = D_3$.
A 2:4 decoder does this directly.

The **half subtractor** comes from the same 2:4 decoder (inputs $A$ = MSB, $B$; difference $A - B$): the
difference $A \oplus B$ is 1 on rows 01 and 10, so $D = D_1 + D_2$, and a borrow is needed only for
$0 - 1$, row 01, so $B_{out} = D_1$ alone, with no gate at all. Notice that $D_1$ feeds both outputs, just
as $D_7$ does in the full adder.
:::
::::

::::example{#ex-dec-medium level="medium" title="A NOR on four outputs" depth="standard"}
A 3:8 decoder with active-high outputs has address inputs $A$ (MSB), $B$, $C$ (LSB). Its outputs $D_0$,
$D_3$, $D_5$ and $D_6$ feed a 4-input NOR gate. Find $f$.

:::step{why="A NOR is 1 only when all its inputs are 0, so f = 1 on the rows whose outputs are not connected."}
The connected outputs are $\{0, 3, 5, 6\}$, so $f = 1$ on the other rows: $f = \Sigma m(1, 2, 4, 7)$.
:::

:::step{why="Read each row in the address order A, B, C and look for the pattern."}
Rows 001, 010, 100, 111 are the rows with an odd number of 1s.
:::

:::step{why="An odd number of 1s is the three-input XOR (Chapter 2); a K-map of a checkerboard confirms nothing can be grouped."}
$f = A \oplus B \oplus C$.
:::

:::answer
$f = A \oplus B \oplus C$. A student who wires the same four outputs into an **OR** gets the complement,
$\overline{A \oplus B \oplus C}$, which is the usual wrong option.
:::
::::

::::example{#ex-dec-converter level="medium" title="A code converter: BCD to excess-3 from a decoder and four ORs" depth="standard"}
A BCD digit $d = B_3B_2B_1B_0$ (0–9) drives a 4:16 decoder with active-high outputs ($B_3$ = MSB). Build
the excess-3 outputs $E_3E_2E_1E_0$ (the 4-bit binary of $d + 3$) with OR gates only. Which decoder
outputs are left unconnected?

:::step{why="A code converter is a multi-output function of the input word, so start from its table: write d + 3 in 4 bits for every legal digit."}
$d = 0, \dots, 9$ give $0011, 0100, 0101, 0110, 0111, 1000, 1001, 1010, 1011, 1100$.
:::

:::step{why="Each output bit is a separate function of d. Read its column: the digits where the bit is 1 are the decoder outputs that feed its OR."}
$E_3$: digits 5–9; $E_2$: 1, 2, 3, 4, 9; $E_1$: 0, 3, 4, 7, 8; $E_0$: 0, 2, 4, 6, 8.
:::

:::step{why="Decoder output Dᵢ is 1 exactly when the input digit is i, so the OR of a list of outputs is 1 exactly on that list of digits."}
$E_3 = D_5 + D_6 + D_7 + D_8 + D_9$, $E_2 = D_1 + D_2 + D_3 + D_4 + D_9$, $E_1 = D_0 + D_3 + D_4 + D_7 + D_8$,
$E_0 = D_0 + D_2 + D_4 + D_6 + D_8$.
:::

:::step{why="Inputs 10–15 are not BCD and never occur, so the outputs that would light for them are don't-cares: leaving them unconnected is one legal way to fill those don't-cares."}
$D_{10}, \dots, D_{15}$ are unused; a BCD-to-decimal (4:10) decoder, which has only $D_0 \dots D_9$, does the
same job.
:::

:::answer
Four 5-input ORs on one decoder, with $D_{10}$–$D_{15}$ unconnected. Check one digit: $d = 7$ lights
$D_7$, which feeds $E_3$ and $E_1$ only, giving $1010 = 10 = 7 + 3$. ✓ Compared with the K-map design of
[Lesson 1](lesson:combinational-design), this needs no minimisation at all; the price is the decoder.
:::
::::

::::example{#ex-dec-gate level="gate" title="An active-low decoder with a NAND and an AND" depth="standard"}
A 3:8 decoder has **active-low** outputs $\overline{D}_0, \dots, \overline{D}_7$ and inputs $A$ (MSB), $B$,
$C$. Outputs $\overline{D}_0, \overline{D}_1, \overline{D}_6, \overline{D}_7$ feed a NAND gate (output
$f$), and outputs $\overline{D}_2, \overline{D}_3, \overline{D}_4, \overline{D}_5$ feed an AND gate (output
$g$). Find $f$ and $g$.

:::step{why="Active-low outputs are complemented minterms, so a NAND of them is, by De Morgan, the OR of the minterms."}
$f = \overline{\overline{m_0}\,\overline{m_1}\,\overline{m_6}\,\overline{m_7}} = m_0 + m_1 + m_6 + m_7$.
:::

:::step{why="Rows 000, 001, 110, 111: A and B agree, C is free."}
$f = \overline{A}\,\overline{B} + AB = A \odot B$.
:::

:::step{why="An AND of active-low outputs is a product of maxterms: g is 0 exactly on rows 2, 3, 4, 5, so it is 1 on rows 0, 1, 6, 7."}
$g = M_2 M_3 M_4 M_5 = \Sigma m(0, 1, 6, 7) = A \odot B$.
:::

:::answer
$f = g = A \odot B$ (XNOR of $A$ and $B$). The NAND uses the 1-rows and the AND uses the 0-rows of the
same function. If the outputs are wrongly taken as active-high, the NAND gives $\overline{m_0 m_1 m_6 m_7} = 1$
and the AND gives 0: constants, which is exactly the trap above.
:::
::::

::::example{#ex-dec-edge level="gate" title="Edge case: the same wiring, address order reversed" depth="standard"}
A 3:8 decoder (active-high) has an OR gate on outputs $D_1, D_2, D_3$. Find $f(A, B, C)$ (a) when $A$ is
the MSB and $C$ the LSB, and (b) when the same three wires are connected the other way round, $C$ to the
MSB pin and $A$ to the LSB pin.

:::step{why="(a) Rows 001, 010, 011 in the order A, B, C: A = 0 and at least one of B, C is 1."}
$f_a = \Sigma m(1, 2, 3) = \overline{A}(B + C)$.
:::

:::step{why="(b) Now the index bits are read as (C, B, A). Reverse each index's bits to get the row number in the order (A, B, C): 001 → 100, 010 → 010, 011 → 110."}
$f_b = \Sigma m(4, 2, 6)$ over $(A, B, C)$.
:::

:::step{why="Rows 010, 100, 110: C = 0 and at least one of A, B is 1."}
$f_b = \overline{C}(A + B)$.
:::

:::answer
(a) $\overline{A}(B + C)$, (b) $\overline{C}(A + B)$: different functions from the same gate. Always fix the
MSB before reading indices. (Output $D_2$ keeps its number because 010 reads the same both ways. A
circuit is unchanged by the reversal only when its whole index set maps onto itself; in IT 2008,
$\{1, 3, 4, 6\}$ does, because $1 \leftrightarrow 4$ and $3 \leftrightarrow 6$.)
:::
::::

:::note{#recap-decoder-functions title="Recap" depth="quick"}
Decoder + OR of the 1-rows, or + NOR of the 0-rows (shorter list wins). Active-low: NAND of the 1-rows or
AND of the 0-rows. Fix the MSB of the address first; reversing it reverses the bits of every index.
:::

## Bigger decoders from smaller ones

:::intuition{#expansion-intuition title="Floor first, then room" depth="standard"}
A hotel with 64 rooms on 8 floors does not need a panel with 64 lamps wired to a 6-digit keypad. The first
digit of the room number picks the floor; the floor's own small panel uses the last digit to pick the
room. Only the panel of the chosen floor is switched on.

Decoder expansion works the same way. To build a 6:64 decoder from 3:8 decoders, eight **leaf** decoders
each decode the low 3 address bits and between them provide the 64 outputs. A ninth decoder takes the
high 3 bits and drives the eight enables, so only one leaf is ever switched on. The enable input is what
makes this possible: it is an extra AND input on every output, $D_i = E\,m_i$, and the top decoder's
output $j$ is exactly "the high bits equal $j$".
:::

:::definition{#decoder-expansion term="Decoder expansion with enables" depth="standard"}
To build an $n:2^n$ decoder from $k:2^k$ decoders that have an enable:
1. **Leaves.** Use $2^{n-k}$ decoders; give every one of them the $k$ **low** address bits. Leaf $j$'s
   output $i$ is the big decoder's output $j \cdot 2^k + i$.
2. **Enables.** Leaf $j$ must be enabled exactly when the high $n - k$ address bits equal $j$. That is
   output $j$ of an $(n-k):2^{n-k}$ decoder on the high bits, so build that decoder the same way (one
   level up), until a single block remains. Its own enable is the enable of the whole tree.
3. **Partly used blocks.** If the high bits are fewer than $k$, the top block has spare address pins: tie
   them to 0 and use only its first outputs. It still counts as a whole block.

**With gates allowed** you can save blocks: a 3:8 decoder from two 2:4 decoders needs only an inverter
($A_2$ to one enable and $\overline{A_2}$ to the other), and a 4:16 from two 3:8 decoders likewise. An
active-low enable on one block and an active-high enable on the other does the same job with no gate at
all. GATE's "without using any other logic gates", read with identical decoders whose enables have the
same polarity, rules all of these out and forces the tree.

**An extra variable on the enable.** Because the enable ANDs into every output, a 2:4 decoder on $A, B$
with $E = C$ and an OR of $D_0$ and $D_3$ gives $(\overline{A}\,\overline{B} + AB)\,C = (A \odot B)\,C$: a
decoder can realise functions of more variables than it has address inputs.
:::

:::derivation{#decoder-tree-count of="the number of decoders in a tree" depth="standard"}
Let $N = 2^n$ outputs be needed from blocks of $K = 2^k$ outputs each.

**Leaves:** each leaf gives $K$ outputs, so $\lceil N / K \rceil$ leaves.
**Next level:** each leaf needs its own enable line, and one block can drive $K$ enables, so
$\lceil N / K^2 \rceil$ blocks; and so on, rounding up at every level, until a level has one block.
$$
\text{total} = \left\lceil \frac{N}{K} \right\rceil + \left\lceil \frac{N}{K^2} \right\rceil + \dots + 1,
\qquad \text{levels} = \left\lceil \frac{n}{k} \right\rceil.
$$
When $k$ divides $n$ there is no rounding and the sum is geometric:
$$
\text{total} = \frac{N - 1}{K - 1} = \frac{2^n - 1}{2^k - 1}.
$$

**Sanity checks.** 6:64 from 3:8: $8 + 1 = 9$, and $(64 - 1)/(8 - 1) = 9$. 4:16 from 2:4: $4 + 1 = 5 =
15/3$. 3:8 from 1:2 decoders: $4 + 2 + 1 = 7 = 7/1$. A "tree" of one block ($n = k$) gives 1. Each count
also equals the number of internal nodes of a tree with $N$ leaves and branching $K$, which is the same
picture.
:::

:::viz{#decoder-tree-viz spec="decoder-tree" mode="animate" depth="standard"}
:::

:::trick{#trick-tree-count title="Leaves first, then divide by 2ᵏ until one block" depth="standard"}
Write the leaf count $2^{n-k}$, then keep dividing by $2^k$ (rounding up) and add every number you write,
including the final 1. 8:256 from 2:4: $64 + 16 + 4 + 1 = 85$. 6:64 from 2:4: $16 + 4 + 1 = 21$.

**Why it works:** every level drives the enables of the level below, one output per block. **When it
fails:** when gates or mixed enable polarities are allowed (the count can drop), and when the question
counts something else, such as only the leaves or the levels. The same arithmetic counts MUX trees
([Lesson 2](lesson:multiplexers)), where it is data inputs that are collected rather than enables that
are fanned out.
:::

:::trap{#trap-decoder-count title="Eight leaves are not enough" depth="standard"}
For a 6:64 decoder from 3:8 decoders, $64 / 8 = 8$ is the number of **leaves**, and option "8" is the
answer examiners expect from a hurried student. Eight decoders with their enables tied high would all
decode the low 3 bits at once and light eight outputs together. Something must look at the high 3 bits and
enable one leaf: without other gates, that is a ninth 3:8 decoder. Answer 9. The option "7" cannot be
right on any reading: seven 3:8 decoders have only $7 \times 8 = 56$ outputs, fewer than the 64 needed.
(7 is the 1:2-block count for a **3:8** decoder, $4 + 2 + 1$, which is a different question.)
:::

### Worked examples: decoder expansion

::::example{#ex-exp-easy level="easy" title="3:8 from 2:4 decoders" depth="quick"}
Build a 3:8 decoder (inputs $A_2 A_1 A_0$) from 2:4 decoders with active-high enables, (a) when one
inverter is allowed and (b) with no other gates.

:::step{why="Each 2:4 decoder gives four outputs, so two of them give all eight; both decode the low bits A₁A₀."}
Leaves: two 2:4 decoders on $A_1 A_0$. The upper one gives outputs 4–7, the lower one 0–3.
:::

:::step{why="(a) The upper leaf must work when A₂ = 1 and the lower when A₂ = 0; an inverter makes the second signal."}
(a) $E_{upper} = A_2$, $E_{lower} = \overline{A_2}$: 2 decoders and 1 inverter.
:::

:::step{why="(b) Without the inverter, the two enables must come from a decoder of A₂. The only block is a 2:4, so tie its MSB pin to 0 and feed A₂ to its LSB: its outputs D₀ and D₁ are A̅₂ and A₂."}
(b) $1 + 2 = 3$ decoders, the top one half used.
:::

:::answer
(a) 2 decoders + 1 NOT; (b) 3 decoders. The formula $\lceil 8/4 \rceil + \lceil 8/16 \rceil = 2 + 1$ gives
(b).
:::
::::

::::example{#ex-exp-medium level="medium" title="4:16 from 2:4 decoders" depth="standard"}
How many 2:4 decoders with enable build a 4:16 decoder with no other gates? Describe the wiring.

:::step{why="Sixteen outputs, four per block."}
Leaves: $16 / 4 = 4$ decoders, each on the low bits $A_1 A_0$.
:::

:::step{why="Four enable lines must be one-hot in the high bits A₃A₂: one more 2:4 decoder makes them."}
Top: one 2:4 decoder on $A_3 A_2$; its output $j$ enables leaf $j$.
:::

:::step{why="Check one address: A₃A₂A₁A₀ = 1001 enables leaf 2 (A₃A₂ = 10), whose output 1 (A₁A₀ = 01) is big output 2·4 + 1 = 9."}
Address 9 lights output 9 and nothing else.
:::

:::answer
$4 + 1 = 5$ decoders $= (16 - 1)/(4 - 1)$.
:::
::::

::::example{#ex-exp-gate level="gate" title="6:64 from 3:8 decoders (the GATE 2007 pattern)" depth="standard"}
How many 3:8 decoders with an enable input are needed to build a 6:64 decoder without any other logic
gates?

:::step{why="Each leaf decodes the low 3 address bits into 8 outputs."}
Leaves: $64 / 8 = 8$.
:::

:::step{why="Eight leaves need eight one-hot enable lines from the high 3 bits: exactly one 3:8 decoder, so the tree stops."}
Top: $\lceil 8 / 8 \rceil = 1$.
:::

:::step{why="Sanity check with the closed form, since 3 divides 6."}
$(2^6 - 1)/(2^3 - 1) = 63/7 = 9$.
:::

:::answer
9 decoders: 8 leaves on $A_2A_1A_0$ and 1 top decoder on $A_5A_4A_3$.
:::
::::

::::example{#ex-exp-edge level="gate" title="Edge case: 5:32 from 3:8 decoders" depth="standard"}
How many 3:8 decoders with enables build a 5:32 decoder with no other gates?

:::step{why="Thirty-two outputs, eight per leaf."}
Leaves: $32 / 8 = 4$, each on $A_2A_1A_0$.
:::

:::step{why="Four enables come from the two high bits A₄A₃, but the only block is a 3:8 decoder: tie its MSB pin to 0, feed A₄A₃ to the other two, and use outputs 0–3."}
Top: $\lceil 4 / 8 \rceil = 1$ decoder, half of it unused.
:::

:::step{why="The partly used block still counts, and the closed form does not apply because 3 does not divide 5."}
Total $4 + 1 = 5$.
:::

:::answer
5 decoders. Rounding up matters: the formula without ceilings would give $4 + 0.5$. (With a 2:4 decoder on
top the count is still $4 + 1 = 5$.)
:::
::::

:::note{#recap-expansion title="Recap" depth="quick"}
Leaves on the low bits, a decoder of the high bits on their enables, repeat until one block. Total
$= \lceil N/K \rceil + \lceil N/K^2 \rceil + \dots + 1$, which is $(2^n - 1)/(2^k - 1)$ when $k$ divides $n$.
"No other gates" forces this tree; with an inverter, two blocks can share one address bit.
:::

## Demultiplexers: the decoder with data on its enable

:::intuition{#demux-intuition title="A railway turntable" depth="standard"}
A multiplexer is a junction where many tracks merge into one. A **demultiplexer** is the opposite: one
incoming track and a turntable that sends the arriving train onto one of several outgoing tracks. The
setting of the turntable (the select lines) decides which track; the train (the data bit) is whatever
arrives.

Now look at a decoder with enable: the address picks one output, and that output equals $E$. If you
call the enable "data" and the address "select", the decoder is already a demultiplexer: the value on
$E$ appears on the selected output, and every other output is 0. No new hardware is needed.
:::

:::definition{#demux-def term="Demultiplexer (1 : 2ⁿ)" depth="standard"}
A **$1:2^n$ demultiplexer** (DEMUX) has one data input $I$, $n$ select lines $S_{n-1} \dots S_0$ and $2^n$
outputs $Y_0, \dots, Y_{2^n - 1}$. The data appears on the output whose index equals the select value, and
every other output is 0:
$$
Y_i = I \cdot m_i(S_{n-1}, \dots, S_0).
$$
For a 1:4 DEMUX: $Y_0 = I\,\overline{S_1}\,\overline{S_0}$, $Y_1 = I\,\overline{S_1}S_0$,
$Y_2 = I\,S_1\overline{S_0}$, $Y_3 = I\,S_1S_0$.

Compare the three blocks by their pins:

| Block | Information inputs | Select / address | Outputs |
|:--|:--|:--|:--|
| $2^n:1$ MUX | $2^n$ data | $n$ select | 1 |
| $1:2^n$ DEMUX | 1 data | $n$ select | $2^n$ |
| $n:2^n$ decoder | $n$ address (+ enable) | none | $2^n$, one-hot |

A DEMUX is used to send serial data out to several destinations (serial to parallel), and a MUX at one end
of a wire with a DEMUX at the other end lets several signals share one wire: if both are driven by the
same select value, input $i$ arrives at output $i$.

**The straight / cross switch.** With a 2:1 MUX at the sender (select $A$) and a 1:2 DEMUX at the receiver,
the DEMUX select decides where each signal lands. Drive it with $A$ and the link is **straight**: the
MUX's input 0 arrives at output 0 and input 1 at output 1. Drive it with $A \oplus M$ for a mode bit $M$:
$M = 0$ gives the straight link, and $M = 1$ inverts the receiver's select, so input 0 arrives at
output 1 and input 1 at output 0, a **cross**. One XOR gate turns a shared wire into a two-way switch.
:::

:::theorem{#demux-decoder name="A DEMUX is a decoder with the data on the enable" depth="standard"}
A $1:2^n$ demultiplexer with data $I$ and selects $S$ computes the same outputs as an $n:2^n$ decoder with
address $S$ and enable $E = I$. Conversely, a $1:2^n$ DEMUX with its data input held at 1 is an $n:2^n$
decoder (without enable).
:::

:::proof{#proof-demux-decoder of="DEMUX = decoder with data on the enable" depth="standard"}
**Idea first:** both blocks are defined by the same equation, output $i$ = (the extra input) AND
(minterm $i$ of the selects).

By the minterm theorem, the decoder's outputs are $D_i = E \cdot m_i(S)$. By definition, the DEMUX's
outputs are $Y_i = I \cdot m_i(S)$. Setting $E = I$ makes the two lists identical, output by output, for
every input row. With $I = 1$ the DEMUX gives $Y_i = m_i(S)$, which is a decoder without enable.

**What the theorem does not say.** An $n:2^n$ decoder **without** an enable pin cannot serve as a
$1:2^n$ DEMUX: all $n$ address pins are needed for the selects, so the data has nowhere to go. (A decoder
one size larger can, with the data on its MSB pin; see the edge case below.) And a DEMUX is not a decoder
"in reverse": the reverse of a decoder is an encoder, which comes next.
:::

:::viz{#demux-routing-viz spec="demux-routing" mode="animate" depth="standard"}
:::

:::trick{#trick-demux-tree title="A DEMUX tree is counted like a decoder tree" depth="standard"}
A $1:2^n$ DEMUX built from small DEMUXes is a tree with the data entering at the root. The root's
selects are the **high** bits, each level below takes the next bits, and the leaves take the low bits and
give the $2^n$ outputs. Count the blocks exactly as for a decoder tree: leaves first, then divide by the
block size until one block, $\lceil N/K \rceil + \lceil N/K^2 \rceil + \dots + 1$.

**Why it works:** a DEMUX is a decoder with the data on the enable, so a DEMUX tree is a decoder tree whose
top enable carries the data. **When it fails:** when extra gates are allowed (as for decoders, an
inverter can replace a block); and do not copy the wiring of a MUX tree, where the data enter at the
leaves and the root gives the single output. The count is the same, the direction of flow is reversed.
:::

### Worked examples: demultiplexers

::::example{#ex-demux-easy level="easy" title="Where does the data go?" depth="quick"}
A 1:4 DEMUX has data $I = 1$ and selects $S_1S_0 = 10$. Give all four outputs. What changes if $I = 0$?

:::step{why="The select value 10 is the number 2, so output Y₂ is the chosen one."}
The selected output is $Y_2$.
:::

:::step{why="The chosen output copies the data and every other output is 0: Yᵢ = I·mᵢ(S), and only m₂ is 1."}
$Y_0Y_1Y_2Y_3 = 0010$.
:::

:::step{why="With I = 0 the chosen output copies a 0, and the others are 0 anyway."}
$Y_0Y_1Y_2Y_3 = 0000$.
:::

:::answer
$0010$ for $I = 1$ and $0000$ for $I = 0$. Notice that a 0 on the data line looks exactly like "nothing
sent": the receiver needs the select value to know which line is being talked to.
:::
::::

::::example{#ex-demux-medium level="medium" title="A 1:8 DEMUX from smaller DEMUXes" depth="standard"}
Build a 1:8 DEMUX (selects $S_2S_1S_0$) (a) from 1:2 DEMUXes and (b) from 1:4 DEMUXes, with no other
gates. How many blocks does each need, and where does the data go for $S_2S_1S_0 = 101$?

:::step{why="(a) The data must be split by the MSB first, so the root is a 1:2 DEMUX on S₂; each of its two outputs feeds a 1:2 DEMUX on S₁, and each of those four outputs feeds a 1:2 DEMUX on S₀."}
(a) $1 + 2 + 4 = 7$ blocks, the leaves giving the 8 outputs. This is the decoder-tree count
$\lceil 8/2 \rceil + \lceil 8/4 \rceil + \lceil 8/8 \rceil = 4 + 2 + 1$.
:::

:::step{why="Follow S = 101 from the root: S₂ = 1 takes the upper half (outputs 4–7), S₁ = 0 the lower pair of that half (4, 5), S₀ = 1 the odd one."}
The data arrives at $Y_5$, as it must.
:::

:::step{why="(b) Two 1:4 leaves on S₁S₀ give 8 outputs; their data inputs come from a root that splits by S₂. The only block is a 1:4, so tie its S₁ pin to 0, put S₂ on its S₀ pin and use its outputs 0 and 1."}
(b) $2 + 1 = 3$ blocks, the root half used: $\lceil 8/4 \rceil + \lceil 8/16 \rceil = 2 + 1$.
:::

:::answer
(a) 7 blocks of 1:2, (b) 3 blocks of 1:4; $S = 101$ reaches $Y_5$ in both. The counts are those of decoder
trees, because each DEMUX is a decoder whose enable carries the data.
:::
::::

::::example{#ex-demux-gate level="gate" title="A shared wire as a straight or crossed link" depth="standard"}
Signals $P$ and $Q$ share one wire $W$: a 2:1 MUX at the sender puts $P$ on $W$ when $A = 0$ and $Q$ when
$A = 1$. At the receiver a 1:2 DEMUX with select $T = A \oplus M$ sends $W$ to $Y_0$ ($T = 0$) or $Y_1$
($T = 1$). Find $Y_0$ and $Y_1$ for $M = 0$ and $M = 1$.

:::step{why="The MUX equation gives the wire, and the DEMUX equation gives each output as the wire ANDed with the minterm of its select."}
$W = \overline{A}P + AQ$, $Y_0 = W\,\overline{T}$, $Y_1 = W\,T$.
:::

:::step{why="M = 0 makes T = A, so the receiver's select agrees with the sender's: when P is on the wire (A = 0) it goes to Y₀."}
$Y_0 = (\overline{A}P + AQ)\overline{A} = \overline{A}P$, $Y_1 = (\overline{A}P + AQ)A = AQ$: straight.
:::

:::step{why="M = 1 makes T = A̅: the receiver's select is the opposite of the sender's, so whatever is on the wire goes to the other output."}
$Y_0 = (\overline{A}P + AQ)A = AQ$, $Y_1 = (\overline{A}P + AQ)\overline{A} = \overline{A}P$: crossed.
:::

:::answer
$M = 0$: $Y_0 = \overline{A}P$, $Y_1 = AQ$ ($P \to Y_0$, $Q \to Y_1$). $M = 1$: $Y_0 = AQ$,
$Y_1 = \overline{A}P$ ($P \to Y_1$, $Q \to Y_0$). As $A$ alternates, each output receives one signal in
its time slot. The usual wrong answer for $M = 1$ is "$Y_1 = AP$": $P$ is on the wire only while $A = 0$,
whatever the receiver does.
:::
::::

::::example{#ex-demux-edge level="gate" title="Edge case: a decoder without an enable as a DEMUX" depth="standard"}
Only decoders **without** enable pins are available. (a) Can a 2:4 decoder act as a 1:4 DEMUX with selects
$S_1S_0$? (b) A 3:8 decoder has inputs $A_2$ (MSB), $A_1$, $A_0$. Wire $I$ to $A_2$ and $S_1, S_0$ to
$A_1, A_0$. Which outputs form a 1:4 DEMUX, and what do the others give?

:::step{why="(a) Both address pins are taken by S₁ and S₀, and with no enable the selected output is 1 whatever the data is."}
(a) No: for $I = 0$ the decoder still lights $D_s$, where $s$ is the select value. The data has no pin.
:::

:::step{why="(b) Each output is a minterm of all three pins; split off the factor contributed by A₂ = I."}
$D_{4 + s} = I \cdot m_s(S_1, S_0)$ and $D_s = \overline{I} \cdot m_s(S_1, S_0)$ for $s = 0, \dots, 3$.
:::

:::step{why="Compare with the DEMUX equation Yᵢ = I·mᵢ(S)."}
$D_4, D_5, D_6, D_7$ are $Y_0, Y_1, Y_2, Y_3$ of a 1:4 DEMUX; $D_0, \dots, D_3$ are a DEMUX of $\overline{I}$.
:::

:::answer
(a) No. (b) Yes, using $D_4$–$D_7$: the MSB address pin plays the role of the enable. A decoder without
an enable is a DEMUX only if it has one address pin to spare for the data.
:::
::::

:::note{#recap-demux title="Recap" depth="quick"}
DEMUX: one data bit to the selected one of $2^n$ outputs, $Y_i = I\,m_i(S)$; the rest are 0. It is a
decoder with the data on the enable, and DEMUX trees are counted like decoder trees. A MUX and a DEMUX
share a wire; the DEMUX select $A \oplus M$ makes the link straight ($M = 0$) or crossed ($M = 1$).
:::

## Encoders and priority encoders

:::intuition{#encoder-intuition title="The lift buttons and the floor display" depth="standard"}
A decoder turns a number into one lit line. An **encoder** turns one lit line back into a number. Think of
a building's call buttons: whoever presses the button on floor 6 makes the lift controller see the code
110. If only one button is ever pressed at a time, that is the whole job, and it is very cheap: the
controller's bit 2 is 1 whenever the pressed floor is 4, 5, 6 or 7, so bit 2 is just an OR of those four
buttons.

Real people press several buttons at once. A plain encoder then ORs their codes and reports a floor nobody
pressed (floors 1 and 2 together give $001 \text{ OR } 010 = 011$, floor 3). A **priority encoder** fixes
this by ranking the inputs: it reports the highest-ranked pressed button and ignores the rest. It also
needs a way to say "nobody pressed anything", because the code 000 would otherwise be ambiguous (it is
also floor 0's code); that is the **valid** bit.
:::

:::definition{#encoder-def term="Encoder (2ⁿ : n)" depth="standard"}
A **$2^n:n$ encoder** has $2^n$ inputs $D_0, \dots, D_{2^n - 1}$, of which **exactly one is assumed to be
1**, and $n$ outputs giving the binary index of that input. Output bit $j$ is the OR of the inputs whose
index has bit $j$ set. For the 4:2 encoder:
$$
X_1 = D_2 + D_3, \qquad X_0 = D_1 + D_3.
$$
Input $D_0$ is not connected to anything: its code is 00, which is what the ORs give when the other inputs
are 0. The same rule gives every encoder as a list of ORs:

- **Octal to binary (8:3):** three 4-input ORs, $Y_2 = D_4 + D_5 + D_6 + D_7$,
  $Y_1 = D_2 + D_3 + D_6 + D_7$, $Y_0 = D_1 + D_3 + D_5 + D_7$.
- **Hexadecimal to binary (16:4):** four 8-input ORs, $Y_3 = D_8 + \dots + D_{15}$,
  $Y_2 = D_4 + \dots + D_7 + D_{12} + \dots + D_{15}$, $Y_1$ = the inputs 2, 3, 6, 7, 10, 11, 14, 15, and
  $Y_0$ = the eight odd inputs.
- **Decimal to BCD (10:4):** four ORs over 10 inputs, $Y_3 = D_8 + D_9$, $Y_2 = D_4 + \dots + D_7$,
  $Y_1 = D_2 + D_3 + D_6 + D_7$, $Y_0 = D_1 + D_3 + D_5 + D_7 + D_9$.

In every case input 0 is unconnected. In the octal and hex encoders each output bit collects exactly half
of the inputs (4 of 8, 8 of 16), because half of all $n$-bit indices have that bit set; the decimal
encoder is lopsided because its indices stop at 9.

Two limitations follow from the OR form:
- **No input active** gives 00, the same as $D_0$ active.
- **Two inputs active** gives the OR of their codes, which is usually the code of a third input.

An encoder at one end of a bus and a decoder at the other end carry "which one of $2^n$ lines" over just
$n$ wires. A decoder followed by a rewired encoder is a code converter: decode the binary number, connect
decoder output $i$ to encoder input $g(i)$, and the encoder outputs the code $g(i)$ (for example the Gray
code of $i$; the last worked example of this section builds it). Equivalently, any code converter is a
decoder with one OR gate per output bit, as in the BCD-to-excess-3 example earlier.
:::

:::definition{#priority-encoder term="Priority encoder" depth="standard"}
A **priority encoder** accepts any input pattern. Its code output is the index of the **highest-priority
active input**, and a **valid** output $V$ is 1 when at least one input is active. Unless stated otherwise
the highest index has the highest priority. Lower inputs are **don't-care** inputs once a higher one is
active, so the truth table is written with x's in the **input** columns:

| $D_3$ | $D_2$ | $D_1$ | $D_0$ | $X_1$ | $X_0$ | $V$ |
|:--|:--|:--|:--|:--|:--|:--|
| 0 | 0 | 0 | 0 | x | x | 0 |
| 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| 0 | 0 | 1 | x | 0 | 1 | 1 |
| 0 | 1 | x | x | 1 | 0 | 1 |
| 1 | x | x | x | 1 | 1 | 1 |

Five rows cover all 16 input patterns (1 + 1 + 2 + 4 + 8). With no input active the code is a don't-care
(many chips output 00); $V = 0$ tells the receiver to ignore it. Priority encoders sit in front of a
processor's interrupt lines: when several devices ask at once, the most urgent is served first.
:::

:::derivation{#priority-equations of="the 4:2 priority-encoder equations" depth="standard"}
Read each output as "the winner is one of these inputs", where input $i$ wins when $D_i = 1$ and every
higher input is 0.

- $X_1 = 1$ when the winner is 2 or 3: $D_3 + \overline{D_3}D_2 = D_3 + D_2$ (absorption).
- $X_0 = 1$ when the winner is 1 or 3: $D_3 + \overline{D_3}\,\overline{D_2}D_1 = D_3 + \overline{D_2}D_1$
  (the rule $x + \overline{x}y = x + y$ removes $\overline{D_3}$).
- $V = D_0 + D_1 + D_2 + D_3$.

So
$$
X_1 = D_2 + D_3, \qquad X_0 = D_3 + D_1\overline{D_2}, \qquad V = D_0 + D_1 + D_2 + D_3.
$$
Only one term differs from the plain encoder: $X_0$ has $D_1\overline{D_2}$ instead of $D_1$, because an
active $D_2$ must stop $D_1$ from setting the low bit.

**Sanity checks.** Pattern $D_3D_2D_1D_0 = 0110$: winner $D_2$; $X_1 = 1$, $X_0 = 0 + 1 \cdot 0 = 0$:
code 10. ✓ Pattern 1111: $X_1X_0 = 11$. ✓ Pattern 0011: $X_1 = 0$, $X_0 = 1$: code 01. ✓ The same
equations come out of two K-maps with the no-input row as a don't-care.

The 8:3 version follows the same rule:
$Y_2 = D_4 + D_5 + D_6 + D_7$,
$Y_1 = D_7 + D_6 + \overline{D_5}\,\overline{D_4}(D_3 + D_2)$,
$Y_0 = D_7 + \overline{D_6}D_5 + \overline{D_6}\,\overline{D_4}D_3 + \overline{D_6}\,\overline{D_4}\,\overline{D_2}D_1$.
:::

:::viz{#priority-scan-viz spec="priority-scan" mode="animate" depth="standard"}
:::

:::intuition{#priority-mux-intuition title="Let the senior inputs choose the line" depth="standard"}
In a priority encoder the top-ranked inputs are the powerful ones: if the highest input is active, the
answer is fixed no matter what anyone below says. So put the two senior inputs on the select lines of a
multiplexer. Of the four select values, three have at least one senior input active, and on those three
lines the code is already decided: the data input is a constant 0 or 1. Only the line where both senior
inputs are 0 has to look further down the ranking, and that is the one data input that depends on the
junior inputs. The whole priority logic collapses into "which line, and which constant on it".
:::

:::definition{#priority-mux term="A priority encoder from multiplexers" depth="standard"}
A priority encoder's outputs are functions of its inputs, so each output can be built on a multiplexer
with the residue method of [Lesson 2](lesson:multiplexers). The natural choice of select lines is the
**two highest-priority inputs**, because they decide most of the answer on their own.

For the 4:2 priority encoder, put $D_3$ on $S_1$ and $D_2$ on $S_0$ of two 4:1 MUXes:

| $D_3 D_2$ | Winner | Data for $X_1$ | Data for $X_0$ |
|:--|:--|:--|:--|
| 00 | $D_1$ if active, else $D_0$ | 0 | $D_1$ |
| 01 | $D_2$ | 1 | 0 |
| 10 | $D_3$ | 1 | 1 |
| 11 | $D_3$ | 1 | 1 |

So the $X_1$ MUX has data $0, 1, 1, 1$ and the $X_0$ MUX has data $D_1, 0, 1, 1$: two MUXes and no gates.
The valid bit needs $D_1 + D_0$ on the $00$ line of a third MUX (data $D_1 + D_0, 1, 1, 1$), which costs
one OR gate.

The data inputs depend on the **code assignment**. If the question gives the inputs other codes (a
3-input priority encoder whose top input gets code 01, say), recompute each column from the table; the
method does not change, the constants do.

**A three-input example (GATE 1992).** Inputs $A > B > C$ with codes $A \to 11$, $B \to 10$, $C \to 01$
and none → 00. With $A$ on $S_1$ and $B$ on $S_0$, the $X_1$ MUX has data $0, 1, 1, 1$ and the $X_0$ MUX
has data $C, 0, 1, 1$: again three constant lines, and only the $AB = 00$ line looks at the junior input
$C$. The animation below builds this circuit line by line.
:::

:::viz{#priority-mux-viz spec="priority-mux" mode="animate" depth="standard"}
:::

:::trap{#trap-encoder-vs-decoder title="Encoder or decoder? Look at where the x's are" depth="standard"}
A truth table whose **input** columns contain x's and whose **outputs** are short binary codes is a
priority encoder: the x's say "lower inputs do not matter once a higher one is active", and the codes are
the winning index. A **decoder's** table has a full binary count on its few inputs and one-hot outputs
(exactly one 1 per row); a MUX's table has select columns and an output equal to one of the data inputs;
a DEMUX's table has a data input that is copied to one of many outputs.

The usual wrong answer is "decoder", chosen because the table has more inputs than outputs and the
words "valid input" sound like an enable. Count the columns: many inputs → few outputs is the encoder
direction, few inputs → many outputs is the decoder direction. Also check the order of the output columns:
a table may list $X_0$ before $X_1$, and then you must read which one is the MSB from the rows (in GATE 2013
the $D_2$ row gives $X_0 = 1, X_1 = 0$, so there $X_0$ is the high bit).
:::

### Worked examples: encoders and priority encoders

::::example{#ex-enc-easy level="easy" title="A 4:2 encoder with one active input" depth="quick"}
A 4:2 encoder ($X_1 = D_2 + D_3$, $X_0 = D_1 + D_3$) has $D_2 = 1$ and every other input 0. What does it
output? What happens if $D_1$ also turns on?

:::step{why="Evaluate each OR: X₁ sees D₂ = 1; X₀ sees D₁ = D₃ = 0."}
$X_1 X_0 = 10$, the index 2.
:::

:::step{why="With D₁ = 1 as well, X₀ = D₁ + D₃ = 1 while X₁ stays 1."}
$X_1 X_0 = 11$: the encoder reports input 3, which is not active.
:::

:::answer
10 for $D_2$ alone; 11 when $D_1$ and $D_2$ are both active. The plain encoder is correct only for one-hot
inputs: this is why priority encoders exist.
:::
::::

::::example{#ex-enc-medium level="medium" title="A 4:2 priority encoder on several patterns" depth="standard"}
Using $X_1 = D_2 + D_3$, $X_0 = D_3 + D_1\overline{D_2}$, $V = D_0 + D_1 + D_2 + D_3$, find the outputs for
$D_3D_2D_1D_0 = 0011$, $0110$, $1010$ and $0000$.

:::step{why="0011: the highest active input is D₁, so the code must be 01; check X₀ = 0 + 1·1 = 1."}
$X_1X_0 = 01$, $V = 1$.
:::

:::step{why="0110: the highest active input is D₂; D₂ = 1 blocks the D₁D̅₂ term, so D₁ cannot leak into X₀."}
$X_1X_0 = 10$, $V = 1$.
:::

:::step{why="1010: D₃ wins; both outputs contain D₃ as a lone term."}
$X_1X_0 = 11$, $V = 1$.
:::

:::step{why="0000: every OR is 0. The code 00 is the same as D₀ alone, so only V tells them apart."}
$X_1X_0 = 00$, $V = 0$.
:::

:::answer
01, 10, 11 (all valid), and 00 with $V = 0$. A plain encoder would give 01, 11, 11, 00: it is wrong on 0110,
where $D_1$ leaks into $X_0$, and right on 1010 only by luck, because the winner $D_3$'s code 11 already
contains every bit that $D_1$ could add.
:::
::::

::::example{#ex-enc-gate level="gate" title="Name the block from its table" depth="standard"}
Three tables describe three blocks.
(i) Inputs $P, Q$; outputs $Y_0 \dots Y_3$; rows $PQ = 00, 01, 10, 11$ give $Y_0 \dots Y_3 = 1000, 0100,
0010, 0001$.
(ii) Inputs $I_0 \dots I_7$ and a 3-bit output $C$ with a bit $V$; the row with $I_5 = 1$ has x in
$I_0 \dots I_4$ and 0 in $I_6, I_7$, and gives $C = 101$, $V = 1$.
(iii) Inputs $S_1, S_0$ and data $I_0 \dots I_3$; the output $Y$ equals $I_0, I_1, I_2, I_3$ for
$S_1S_0 = 00, 01, 10, 11$.
Name each block.

:::step{why="Few inputs, a full binary count, exactly one output 1 per row: number in, one-hot out."}
(i) is a 2:4 decoder.
:::

:::step{why="Many inputs, x's on the lower inputs once a higher one is 1, a binary code and a valid bit: the highest active input wins."}
(ii) is an 8:3 priority encoder.
:::

:::step{why="Select lines choose which data input reaches a single output."}
(iii) is a 4:1 multiplexer.
:::

:::answer
(i) decoder, (ii) priority encoder, (iii) multiplexer. The x's in the input columns are the signature of a
priority encoder; one-hot outputs are the signature of a decoder.
:::
::::

::::example{#ex-enc-edge level="gate" title="Edge case: the lowest index has the highest priority" depth="standard"}
A 4:2 priority encoder gives $D_0$ the **highest** priority and $D_3$ the lowest. Find $X_1$, $X_0$ and
$V$, and the output for $D_3D_2D_1D_0 = 0110$.

:::step{why="Input i wins when it is active and every lower index (now the higher priority) is 0."}
Winner 2 or 3 needs $D_0 = D_1 = 0$: $X_1 = \overline{D_0}\,\overline{D_1}(D_2 + D_3)$.
:::

:::step{why="Winner 1: D₀ = 0, D₁ = 1. Winner 3: D₀ = D₁ = D₂ = 0, D₃ = 1."}
$X_0 = \overline{D_0}D_1 + \overline{D_0}\,\overline{D_1}\,\overline{D_2}D_3$.
:::

:::step{why="Validity does not depend on the ranking."}
$V = D_0 + D_1 + D_2 + D_3$.
:::

:::step{why="0110: D₀ = 0 and D₁ = 1, so D₁ wins."}
$X_1 = 0$ (because $D_1 = 1$), $X_0 = 1$: code 01.
:::

:::answer
$X_1 = \overline{D_0}\,\overline{D_1}(D_2 + D_3)$, $X_0 = \overline{D_0}D_1 + \overline{D_0}\,\overline{D_1}\,\overline{D_2}D_3$,
$V = D_0 + D_1 + D_2 + D_3$; pattern 0110 gives 01 (the usual ranking would give 10). The equations are
longer because the "important" input now sits at the small end of every code.
:::
::::

::::example{#ex-enc-gray level="medium" title="A binary-to-Gray converter from a decoder and an encoder" depth="standard"}
A 3:8 decoder ($B_2$ = MSB) decodes a 3-bit binary number $i$, and its outputs drive an 8:3 encoder. How
must the eight wires be connected so that the encoder outputs the Gray code $g(i) = i \oplus (i \gg 1)$?
What code comes out for $i = 5$?

:::step{why="Decoder output i is the only line that is 1 when the input is i, and an encoder reports the index of its one active input. So the wire from output i must go to encoder input g(i)."}
Connect decoder output $i$ to encoder input $g(i)$.
:::

:::step{why="Compute g(i) = i XOR (i shifted right by one) for every i."}
$g = 0, 1, 3, 2, 6, 7, 5, 4$ for $i = 0, \dots, 7$: wires $0 \to 0$, $1 \to 1$, $2 \to 3$, $3 \to 2$,
$4 \to 6$, $5 \to 7$, $6 \to 5$, $7 \to 4$.
:::

:::step{why="The wiring is a permutation (each encoder input gets exactly one wire), so the encoder still sees exactly one active input: its one-hot assumption holds and the output is correct."}
For $i = 5 = 101$: decoder output 5 goes to encoder input 7, so the code is $111$, and indeed
$101 \oplus 010 = 111$.
:::

:::answer
Wire output $i$ to input $g(i)$ (the list above); $i = 5$ gives $111$. Any one-to-one code converter on
$n$ bits can be built this way: each input word lights one decoder line, and the wiring only relabels it.
The usual slip is to wire input $i$ to output $g(i)$ the other way round, which builds the inverse
converter (Gray to binary): $5 \to 6$ instead of $5 \to 7$.
:::
::::

:::note{#recap-encoders title="Recap" depth="quick"}
Encoder: ORs of the inputs with each code bit set; correct only for one-hot inputs. Priority encoder: the
highest-priority active input wins; x's in the input columns; $V$ flags "some input active". 4:2:
$X_1 = D_2 + D_3$, $X_0 = D_3 + D_1\overline{D_2}$.
:::

## Address decoding for memory

:::intuition{#address-intuition title="One word line per address" depth="standard"}
A memory is a long row of storage cells, each with an address. To read or write one of them, the memory
must switch on exactly one cell's **word line** and leave every other cell alone. "Exactly one line on for
each number" is the definition of a decoder. So inside every RAM there is a decoder whose inputs are the
address bits and whose outputs are the word lines; a memory with $2^m$ addressable locations needs an
$m:2^m$ decoder.

The same idea works one level up, between chips: when a big memory is made of several smaller chips, a
small decoder on the **high** address bits turns on the chip-select of one chip, and the low address bits
go to every chip and pick the word inside it. That is decoder expansion again, with memory chips as the
leaves.
:::

:::definition{#address-decoding term="Address decoding" depth="standard"}
For a memory with $L$ addressable locations:
1. **Count the locations.** Byte-addressable: $L$ = number of bytes. Word-addressable: $L$ = number of
   words = bytes ÷ bytes per word. Here $1\ \text{K} = 2^{10} = 1024$.
2. **Address lines:** $m = \lceil \log_2 L \rceil$.
3. **Decoder:** $m$ inputs and $2^m \ge L$ outputs, one per location (exactly $L$ when $L$ is a power of 2,
   as in every GATE question). Its input + output count is $m + 2^m$.
4. **Chips.** A memory of $c$ equal chips uses $\lceil \log_2 c \rceil$ high address bits on a chip-select
   decoder; the remaining bits go to every chip. When $c$ is not a power of 2, some outputs of the
   chip-select decoder drive nothing.

**A system of blocks.** When a code word holds a mode bit and two address fields (one for a memory of
$2^a$ words and one for a register file of $2^b$ registers), each address field drives its own
$a:2^a$ and $b:2^b$ decoder (which picks the word or register), and the mode bit drives the select of a
2:1 multiplexer that passes one of the two words on. The decoders turn a code into a one-hot choice; the
MUX picks between two whole words.
:::

:::viz{#address-decoding-viz spec="address-decoding" mode="animate" depth="standard"}
:::

:::aside{#coincident-decoding title="Two small decoders instead of one big one" depth="deep"}
A 10:1024 decoder has 1024 output lines. Real memories arrange the cells in a $32 \times 32$ square and use
two 5:32 decoders, one for the row and one for the column: a cell is selected where its row line and column
line are both on. That needs only $32 + 32 = 64$ decoder outputs. The same trade-off appears when a function
is built from a decoder on $a$ of its variables and a multiplexer on the other $b$: the two blocks need
$2^a + 2^b$ lines, against $2^{a + b}$ lines (or links) for one big decoder, and $2^a + 2^b$ with $a + b$
fixed is smallest when $a$ and $b$ are about equal. [Lesson 5](lesson:rom-pla-pal) folds a ROM's word lines
in the same way. A GATE question that asks for the decoder "to uniquely address" the memory means the single
$m : 2^m$ decoder unless it says otherwise.
:::

:::trap{#trap-address-bits title="Words or bytes, and 1 K = 1024" depth="standard"}
Three slips cost marks here. (1) **1 K is 1024**, not 1000; $\log_2 1000$ is not an integer, and no
decoder has 1000 outputs. (2) **Bytes vs words:** 4 KB of 32-bit words is 1024 words, so 10 address lines,
not 12. Read "byte-addressable" or "word-addressable" before counting. (3) **What is asked:** $m + n$ for
a decoder is inputs **plus** outputs ($10 + 1024 = 1034$ for 1 KB, byte-addressable), not $m + m$ or
$2^m$ alone. The usual wrong answers are 20 (adding $\log_2$ twice), 1024 (outputs only) and 2048
($1024 + 1024$, the outputs counted twice).
:::

### Worked examples: address decoding

::::example{#ex-addr-easy level="easy" title="The decoder of a 2 KB byte-addressable RAM" depth="quick"}
A decoder with $m$ inputs and $n$ outputs uniquely addresses a byte-addressable 2 KB RAM. Find the smallest
$m + n$.

:::step{why="Byte-addressable: every byte is a location, and 2 K = 2 × 1024."}
$L = 2048$ locations.
:::

:::step{why="Each location needs its own decoder output, and 2048 = 2¹¹."}
$m = 11$ address inputs, $n = 2^{11} = 2048$ outputs.
:::

:::answer
$m + n = 11 + 2048 = 2059$.
:::
::::

::::example{#ex-addr-medium level="medium" title="A 4 KB memory from 1 KB chips" depth="standard"}
A byte-addressable 4 KB memory is built from four 1 KB chips. How many address lines does the system
have, what decoder selects the chip, and which bits go where?

:::step{why="4 KB = 4096 = 2¹² bytes, each a location."}
12 address lines, $A_{11} \dots A_0$.
:::

:::step{why="Each chip holds 1024 = 2¹⁰ bytes, so the low 10 bits pick the byte inside a chip, and they go to every chip."}
$A_9 \dots A_0$ to all four chips.
:::

:::step{why="The two remaining high bits must enable exactly one of four chips: a 2:4 decoder, the same pattern as the leaves of a decoder tree."}
$A_{11}A_{10}$ into a 2:4 decoder; its output $j$ drives chip $j$'s chip-select.
:::

:::answer
12 address lines; a 2:4 chip-select decoder on $A_{11}A_{10}$; $A_9 \dots A_0$ shared by all chips (each
chip has its own internal 10:1024 decoder). Address $0x9A3$ ($A_{11}A_{10} = 10$) is byte $0x1A3$ of chip 2.
:::
::::

::::example{#ex-addr-gate level="gate" title="Name the blocks when the memory is word-addressable" depth="standard"}
A code word holds a mode bit $M$, a field that addresses a **word-addressable** 8 KB memory $S$ of 32-bit
words, and a field that addresses a file $R$ of 64 registers (also 32-bit). Block $P$ turns the first field
into the word select of $S$, block $Q$ turns the second into the register select of $R$, and block $T$
passes either the word read from $S$ or the word read from $R$ into an output register, according to $M$.
How wide is the code word, and what are $P$, $Q$ and $T$?

:::step{why="Word-addressable: a location is a 4-byte word, not a byte, so divide the size by the word size before taking log₂."}
$S$ has $8192 / 4 = 2048 = 2^{11}$ words, so its field is 11 bits (not 13).
:::

:::step{why="Registers are counted directly: 64 = 2⁶."}
$R$'s field is 6 bits, and the code word is $1 + 11 + 6 = 18$ bits.
:::

:::step{why="An address field must switch on exactly one word line: number in, one-hot out."}
$P$ is an 11:2048 decoder and $Q$ a 6:64 decoder.
:::

:::step{why="T has two whole words as data inputs and one control bit choosing between them: a multiplexer, not an encoder (no data path) and not a DEMUX (one input, many outputs)."}
$T$ is a 2:1 multiplexer for each of the 32 bits.
:::

:::answer
18-bit code word; $P$: 11:2048 decoder; $Q$: 6:64 decoder; $T$: 2:1 MUX (32 of them, one per bit). The
expected wrong answer is a 13:8192 decoder for $P$, from counting bytes in a word-addressable memory.
:::
::::

::::example{#ex-addr-edge level="gate" title="Edge case: three chips and an unused decoder output" depth="standard"}
A byte-addressable 6 KB memory is built from three 2 KB chips. How many address lines are there, what
chip-select decoder is needed, and which chip holds address $0x1234$?

:::step{why="6 KB = 6144 locations is not a power of 2, so round the address width up."}
$m = \lceil \log_2 6144 \rceil = 13$ lines, $A_{12} \dots A_0$ (since $2^{12} = 4096 < 6144 \le 8192 = 2^{13}$).
:::

:::step{why="Each chip holds 2048 = 2¹¹ bytes, so the low 11 bits go to every chip."}
$A_{10} \dots A_0$ shared; the high bits $A_{12}A_{11}$ choose the chip.
:::

:::step{why="Three chips need ⌈log₂ 3⌉ = 2 select bits, so a 2:4 decoder; its fourth output has no chip."}
Outputs 0, 1, 2 enable chips 0, 1, 2; output 3 (addresses $0x1800$–$0x1FFF$) drives nothing.
:::

:::step{why="Split the address into the chip bits and the offset: 0x1234 = 4660 = 2 × 2048 + 564."}
$A_{12}A_{11} = 10$: chip 2, byte $564 = 0x234$ inside it.
:::

:::answer
13 address lines, a 2:4 chip-select decoder with one output unused, and $0x1234$ is byte $0x234$ of chip 2.
"$\log_2 3$ select bits" is not an integer: always round up, and expect spare outputs.
:::
::::

:::note{#recap-address title="Recap" depth="quick"}
A memory of $L$ locations needs $m = \lceil \log_2 L \rceil$ address lines and an $m:2^m$ decoder; count bytes
or words as the question says, with 1 K = 1024. Chips: the low bits go to every chip, $\lceil \log_2 c \rceil$
high bits drive a chip-select decoder, and spare outputs drive nothing.
:::

## A decoder feeding a multiplexer

:::intuition{#combo-intuition title="Each data line is a tiny function" depth="standard"}
When a decoder's outputs are wired to a multiplexer's data inputs, each data input is a known small
function of the decoder's address: $D_j$ is the minterm $m_j$, so it is 1 on exactly one address row.
Constants 0 and 1 may sit on other data lines. The MUX then picks one of those small functions according
to its own select lines. Counting the input rows where the output is 1 becomes bookkeeping: for each
select value, count the address rows where the chosen data line is 1, and add.
:::

:::definition{#decoder-mux-combo term="Method: a decoder's outputs on a MUX's data lines" depth="standard"}
Let a $k:2^k$ decoder (address $A$) drive some data inputs of a $2^s:1$ MUX (selects $S$), and let the
other data inputs be constants. The inputs of the whole circuit are $A$ and $S$ ($2^{k+s}$ rows).
1. For each select value $s$, name the data input $I_s$: $D_j$, 0 or 1.
2. Count the address rows where $I_s = 1$: **1** row for $D_j$ (active-high, enabled), **0** for the
   constant 0, **all $2^k$** for the constant 1 (and $2^k - 1$ for an active-low output).
3. Add the counts over all select values: that is the number of rows with $Y = 1$.
4. The expression is $Y = \sum_s m_s(S)\, I_s$ with each $D_j$ replaced by $m_j(A)$.

**Shared variables.** The counts in step 2 assume the decoder inputs and the MUX selects are different
variables. If one variable feeds both, a select value fixes that variable, and a decoder output $D_j$
counts only if its row agrees with it (it may give 0 rows); a constant 1 then counts only the address rows
that agree, too. Count jointly, row by row: for each select value, list the address rows still possible
and check the chosen data line on each.

If decoder outputs drive the **select** lines instead, remember that active-high outputs are one-hot:
two outputs are never 1 together, so a select value that needs two of them to be 1 can never occur, and
the data input it would choose is never used.
:::

:::trap{#trap-shared-variable title="Counting one row per decoder output when a variable is shared" depth="standard"}
"A decoder output on a data line is one row" is true only when the select value says nothing about the
decoder's address. When a variable such as $A$ is both the decoder's MSB and the MUX's $S_1$, the data
inputs $I_0, I_1$ are chosen only on rows with $A = 0$, so an output like $D_2$ or $D_3$ (which needs
$A = 1$) on those lines contributes **nothing**. The expected wrong answer is the per-line sum
"$1 + 1 + 1 + \dots$"; the right method fixes the shared variable first and counts the surviving rows.
:::

### Worked examples: a decoder feeding a multiplexer

::::example{#ex-combo-easy level="easy" title="One decoder output and constants" depth="quick"}
A 2:4 decoder (active-high, enabled) has inputs $A$ (MSB), $B$. A 4:1 MUX with selects $S_1$ (MSB), $S_0$
has data $I_0 = 0$, $I_1 = D_0$, $I_2 = 1$, $I_3 = 0$. On how many of the 16 rows of $(A, B, S_1, S_0)$ is
$Y = 1$?

:::step{why="The constant-0 lines can never give Y = 1."}
$S_1S_0 = 00$ and $11$: 0 rows each.
:::

:::step{why="D₀ = A̅B̅ is 1 on one (A, B) row; the constant 1 is 1 on all four (A, B) rows."}
$S_1S_0 = 01$: 1 row; $S_1S_0 = 10$: 4 rows.
:::

:::answer
$0 + 1 + 4 + 0 = 5$ rows; $Y = \overline{S_1}S_0\,\overline{A}\,\overline{B} + S_1\overline{S_0}$. The slip
to avoid is counting the constant 1 as one row.
:::
::::

::::example{#ex-combo-medium level="medium" title="A variable shared by the decoder and the MUX" depth="standard"}
A 2:4 decoder (active-high, enabled) has inputs $A$ (MSB), $B$. A 4:1 MUX has $S_1 = A$, $S_0 = C$ and data
$I_0 = D_1$, $I_1 = D_2$, $I_2 = D_3$, $I_3 = 1$. On how many of the 8 rows of $(A, B, C)$ is $Y = 1$?

:::step{why="A drives both the decoder MSB and S₁, so S₁ = 0 means A = 0: only the decoder rows AB = 00, 01 are possible there."}
$AC = 00$: $Y = D_1 = \overline{A}B$, 1 on $B = 1$: 1 row. $AC = 01$: $Y = D_2 = A\overline{B}$, but
$A = 0$: 0 rows.
:::

:::step{why="S₁ = 1 means A = 1: only the decoder rows AB = 10, 11 survive."}
$AC = 10$: $Y = D_3 = AB$, 1 on $B = 1$: 1 row. $AC = 11$: $Y = 1$ for both values of $B$: 2 rows.
:::

:::step{why="Check by an expression: substitute the minterms and simplify."}
$Y = \overline{A}\,\overline{C}\,\overline{A}B + \overline{A}C\,A\overline{B} + A\overline{C}\,AB + AC
= B\overline{C} + AC$, which is 1 on rows 010, 110, 101, 111.
:::

:::answer
4 rows. The per-line count of the method's step 2 would give $1 + 1 + 1 + 2^2 = 7$, which is wrong twice:
$D_2$ can never be chosen while $A = 1$, and the constant 1 sees only the 2 rows with $A = 1$, not all 4.
:::
::::

::::example{#ex-combo-gate level="gate" title="One decoder output on two data lines" depth="standard"}
A 2:4 decoder (active-high, enabled) has inputs $A$ (MSB), $B$. A 4:1 MUX with selects $S_1$ (MSB), $S_0$
has data $I_0 = D_2$, $I_1 = 1$, $I_2 = D_2$, $I_3 = 1$. Of the 16 rows of $(A, B, S_1, S_0)$, how many give
$Y = 1$?

:::step{why="For each select value the MUX passes one data line; the variables are all different, so D₂ = AB̅ is 1 on one (A, B) row each time it is chosen."}
$S_1S_0 = 00$: 1 row. $S_1S_0 = 10$: 1 row.
:::

:::step{why="The constant 1 is 1 on all four (A, B) rows, and it is chosen twice."}
$S_1S_0 = 01$: 4 rows. $S_1S_0 = 11$: 4 rows.
:::

:::step{why="Cross-check by an expression: S₀ = 1 always gives 1, S₀ = 0 gives D₂."}
$Y = S_0 + \overline{S_0}A\overline{B} = S_0 + A\overline{B}$: 8 rows with $S_0 = 1$, plus 2 rows with
$S_0 = 0$, $AB = 10$ (both $S_1$).
:::

:::answer
$1 + 4 + 1 + 4 = 10$ rows. The expected wrong answer is 9, from counting $D_2$ once because it is "one
decoder output": each data line it reaches is chosen on its own select value, so it counts once per line.
:::
::::

::::example{#ex-combo-edge level="gate" title="Edge case: decoder outputs on the select lines" depth="standard"}
A 2:4 decoder (active-high, enabled) has inputs $A$ (MSB), $B$. Its output $D_3$ drives $S_1$ and its output
$D_0$ drives $S_0$ of a 4:1 MUX with data $I_0 = C$, $I_1 = \overline{C}$, $I_2 = 1$, $I_3 = 1$. How many of
the 8 rows of $(A, B, C)$ give $Y = 1$, and which data input is never used?

:::step{why="D₃ = AB and D₀ = A̅B̅ are one-hot: they are never 1 together, so the select value 11 cannot occur."}
$I_3$ is never selected.
:::

:::step{why="AB = 00 makes D₀ = 1, so S₁S₀ = 01 and Y = C̅: one row (C = 0)."}
$AB = 00$: 1 row.
:::

:::step{why="AB = 01 or 10 makes both outputs 0, so S₁S₀ = 00 and Y = C: one row each."}
$AB = 01, 10$: 2 rows.
:::

:::step{why="AB = 11 makes D₃ = 1, so S₁S₀ = 10 and Y = I₂ = 1: both values of C."}
$AB = 11$: 2 rows.
:::

:::answer
$1 + 2 + 2 = 5$ rows, and $I_3$ is never used (changing it to 0 changes nothing). Counting "4 select values
× something" here is the trap: the decoder makes one select value impossible.
:::
::::

:::note{#recap-combos title="Recap" depth="quick"}
A decoder feeding a MUX: per select value, $D_j$ is one row, a constant 1 is all $2^k$ rows, a constant 0 is
none; add. If a variable feeds both blocks, fix it from the select value and count the surviving rows
jointly. Decoder outputs on the selects are one-hot, so some select values never occur.
:::

## Try it

Use the decoder tab of the Combinational Workbench: set a 2:4 or 3:8 decoder's address and enable and
watch one output light (switch the outputs to active-low and watch it go dark instead), put a data bit on
the enable to turn it into a DEMUX, and feed several active inputs to the priority encoder to see which one
wins and when $V$ drops.

To realise a function on a decoder, switch to the **implement** tab and choose the decoder + OR target. Its
**IT 2008** preset (address $z\,y\,x$, with $z$ the MSB) draws $f$ as OR($D_1, D_3, D_4, D_6$): the outputs of
the four 1-rows. The paper wires the other four outputs into a NOR, NOR($O_7, O_5, O_2, O_0$). That is the
same function, because exactly one decoder output is 1 on every row: the NOR of the 0-rows is 1 precisely when
the active output is one of the 1-rows. With four outputs on each side the lists tie, and the lab shows the OR
form.

:::lab{#lab-decoder lab="comb-workbench" tab="decoder" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1992-b-4-b" tests="priority-encoder,priority-mux" depth="standard"}
:::

:::pyq{id="cse-2007-cs-8" tests="decoder-expansion,decoder-tree-count" depth="standard"}
:::

:::pyq{id="it-2008-it-9" tests="decoder-function,trap-decoder-order" depth="standard"}
:::

:::pyq{id="cse-2013-cs-5" tests="priority-encoder,trap-encoder-vs-decoder" depth="standard"}
:::

:::pyq{id="cse-2020-cs-20" tests="address-decoding,decoder-def" depth="standard"}
:::

:::pyq{id="cse-2022-cs-30" tests="address-decoding,demux-def,decoder-def" depth="standard"}
:::

:::pyq{id="cse-2026-2-cs-49" tests="decoder-mux-combo,decoder-minterms" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dl-04-03-q01" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q02" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q03" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q04" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q05" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q06" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q07" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q08" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q09" depth="standard"}
:::

:::practice{id="nx-dl-04-03-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Decoders, DEMUXes and encoders on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Decoder $n:2^n$ | $D_i = E\,m_i$: one-hot outputs; all 0 when disabled |
| Active-low outputs | $\overline{D}_i = M_i$ (maxterms): NAND the 1-rows or AND the 0-rows; state the polarity |
| Function from a decoder | OR of the 1-rows, or NOR of the 0-rows (shorter list); fix the address MSB first |
| Decoder tree | $\lceil N/K \rceil + \lceil N/K^2 \rceil + \dots + 1$; 6:64 from 3:8 = 9 |
| DEMUX $1:2^n$ | $Y_i = I\,m_i(S)$ = a decoder with the data on the enable; trees counted like decoder trees; MUX + DEMUX link straight / crossed by the select $A \oplus M$ |
| Encoder $2^n:n$ | ORs of the inputs with each code bit set (octal 8:3, hex 16:4, decimal 10:4); needs one-hot input |
| Code converter | decoder + one OR per output bit, or decoder + encoder with output $i$ wired to input $g(i)$ |
| Priority encoder | highest active input wins, $V$ = OR of all; 4:2: $X_1 = D_2 + D_3$, $X_0 = D_3 + D_1\overline{D_2}$ |
| Memory decoder | $m = \lceil \log_2 L \rceil$, an $m:2^m$ decoder for $L$ locations (bytes or words); 1 KB bytes → 10:1024, $m + n = 1034$; $c$ chips → $\lceil \log_2 c \rceil$ chip-select bits |
| Decoder into MUX | count rows per select value: $D_j$ → 1, constant 1 → all; a variable on both blocks → count jointly |
:::
