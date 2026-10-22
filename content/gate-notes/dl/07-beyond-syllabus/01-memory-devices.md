---
id: memory-devices
subject: dl
chapter: beyond-syllabus
title: "Semiconductor memory organisation"
order: 1
prerequisites: [rom-pla-pal]
pyq_topics: []
est_minutes: 25
difficulty: basic
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every address-line count, chip plan, decoder size, address range, alias list and refresh figure is computed in content/gate-notes/_checks/dl/l7_01_memory.py with beyondlib (a bit-true simulation of each chip array)."
  - "Coverage checklist only (internal digests, never copied): set C pp. 373–377 and 390–393 (memory arrays, RAM internals, SRAM vs DRAM). The loose SRAM claims of C 392 are corrected in the lesson."
  - "Facts checked against: M. Morris Mano and M. D. Ciletti, Digital Design (memory and programmable logic: RAM and ROM organisation, memory decoding, coincident decoding, SRAM and DRAM)."
  - "PYQs: none. No question in src/gate/questions.json on this topic is a Digital Logic question (outline: 0); memory-system arithmetic is asked under Computer Organisation."
updated: "2026-10-22"
---

*Optional: beyond the core GATE syllabus.* The current GATE CSE syllabus lists no memory chips under
Digital Logic, and no Digital Logic question in our bank asks about them. We still teach this lesson for
one practical reason: **every memory question in Computer Organisation uses exactly this arithmetic**.
How many address lines does a chip need? How many chips make a bigger memory, and how are they wired? Which
chip answers address `9A3C`? Why does main memory need refreshing while a cache does not? These are
questions about how a memory is *organised*, and the answers are short once you see a memory as a grid of
cells, a decoder that picks one row, and a few rules for stacking chips. This lesson builds those rules
from scratch, proves the two counting facts you will use most, and works fourteen examples, four of them
edge cases that cost marks in COA papers.

## Where this fits

[Chapter 5, Lesson 5](lesson:rom-pla-pal) treated a ROM as a truth table wired in silicon: an address
decoder feeding an OR array. It also showed how to build a bigger ROM from small chips. Here we widen the
view to every kind of semiconductor memory, writable ones included, look inside the chip (cell array,
row and column decoders), and make the expansion recipe precise for both directions (wider words, more
words). The decoders themselves come from [Chapter 5, Lesson 3](lesson:decoders-encoders), whose section
on address decoding for memory introduced the chip-select decoder; the static RAM cell is the latch of
[Chapter 6, Lesson 1](lesson:latches). The tri-state ("floating") outputs that let many chips share one
data bus reappear at transistor level in [Lesson 3](lesson:logic-families). Memory hierarchies, caches
and interleaving belong to the Computer Organisation subject; we stop at the chip and the board.

:::table{#radar title="GATE radar: semiconductor memory organisation" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 0: the Digital Logic papers have not asked about memory chips directly |
| Why it still matters | Computer Organisation questions on memory design (chips needed, decoder size, address ranges, which module holds an address, DRAM refresh) use exactly the arithmetic of this lesson |
| Related COA PYQs (taught in Computer Organisation) | cse-2010-cs-7 and cse-2018-cs-23 (refreshing a many-chip DRAM unit), it-2005-cs-9 (refresh percentage), cse-2019-cs-2 (address range from chip-select logic) |
| Related lessons | ROM as a truth table and ROM expansion: [Chapter 5, Lesson 5](lesson:rom-pla-pal); address decoding: [Chapter 5, Lesson 3](lesson:decoders-encoders); the SRAM cell is a latch: [Chapter 6, Lesson 1](lesson:latches) |
| Likely question shapes | Address and data lines of a chip; chips needed for a $W \times B$ memory; the size of the chip-select decoder; the address range of a chip; which chip holds an address; aliases and the address range under incomplete decoding; refresh interval and refresh overhead of a many-chip DRAM |
| What examiners would test | $1\text{K} = 1024$; address lines depend on the number of **words**, not on the word width; width expansion needs no decoder; capacity expansion uses the **high** address bits; SRAM needs no refresh; an ignored address bit doubles the number of aliases |
:::

## Memory vocabulary: words, addresses and kinds of memory

:::intuition{#memory-intuition title="A library with numbered shelves" depth="standard"}
Picture a library with a long row of shelves. Every shelf has a number painted on it, and every shelf
holds the same number of book slots. To fetch something you never search: you say a shelf number, a
librarian walks straight to that shelf, and hands you **everything on it**, all slots at once.

A memory chip is that library. A **shelf** is a **word**, its **number** is the **address**, and the
**slots** on a shelf are the **bits** of the word. You never ask for "bit 37 of the whole memory"; you ask
for "word 5" and get all of its bits together. Two questions about any memory therefore have two
separate answers: *how many shelves* (that decides how long the shelf numbers must be, the address
lines) and *how wide is each shelf* (that decides how many bits come out at once, the data lines).
Mixing those two numbers up is the most common memory mistake there is.
:::

:::definition{#memory-types term="Words, addresses, capacity, and the kinds of memory" depth="standard"}
A memory stores $W$ **words** of $B$ bits each; we write its organisation as $W \times B$ ("$W$ by $B$")
and its **capacity** as $W \cdot B$ bits. Each word has an **address** from $0$ to $W - 1$, carried on
$k$ **address lines**, and a word enters or leaves on $B$ **data lines**. Sizes use binary prefixes:
$1\text{K} = 2^{10} = 1024$, $1\text{M} = 2^{20}$, $1\text{G} = 2^{30}$. A $4\text{K} \times 8$ chip holds
$4096$ words of 8 bits, so $32\,768$ bits $= 32$ Kbit $= 4$ KB.

Besides address and data lines a chip has control inputs: **chip select** $\overline{CS}$ (or enable),
which must be active for the chip to respond at all, **write enable** $\overline{WE}$ (or a single
$R/\overline{W}$ line) and often **output enable** $\overline{OE}$. A deselected chip puts its data outputs
in the **high-impedance** state: it neither drives 0 nor 1, so many chips can share one data bus and
only the selected one speaks.

**Random access** means that the time to reach a word does not depend on its address (unlike a tape or
a shift register). The memories are grouped by what happens to the data:

| Kind | Written how | Keeps data without power? | Cell, in one line |
|:--|:--|:--|:--|
| Mask ROM | at manufacture | yes | a transistor present or absent at each crosspoint |
| PROM | once, by the user (fuses or antifuses) | yes | a fuse blown or kept |
| EPROM | electrically; erased as a whole chip by ultraviolet light | yes | charge trapped on a floating gate |
| EEPROM | electrically, word by word | yes | floating gate, erased electrically |
| Flash | electrically; erased in blocks | yes | floating gate, block erase |
| SRAM | any time, at full speed | **no** | two cross-coupled inverters (6 transistors) |
| DRAM | any time, at full speed | **no** | one transistor and one capacitor; needs **refresh** |

Memory that loses its contents when power is removed is **volatile** (SRAM and DRAM); the ROM family is
**non-volatile**. "RAM" in everyday use means the read-write, volatile kind, although a ROM is just as
randomly accessible.
:::

:::intuition{#lines-intuition title="Counting shelves needs a number long enough" depth="standard"}
How many digits must the shelf numbers have? With 2-digit decimal numbers you can label 100 shelves;
with 3 digits, 1000. A memory labels its words in binary, so $k$ address lines can name $2^k$ words.
To label $W$ words you need the smallest $k$ with $2^k \ge W$. Notice what does **not** appear in that
sentence: the width of the shelf. A shelf holding 1 book and a shelf holding 64 books need the same
shelf number.
:::

:::theorem{#address-lines-theorem name="Address lines depend only on the number of words" depth="standard"}
A memory of $W$ words needs exactly $k = \lceil \log_2 W \rceil$ address lines, whatever its word width
$B$. For $W = 2^k$ (every real chip) this is $k = \log_2 W$, and every one of the $2^k$ addresses names a
word.
:::

:::proof{#proof-address-lines of="the address-lines theorem" depth="standard"}
**Idea first:** $k$ wires carry $2^k$ different patterns, and each word needs its own pattern.

With $k$ address lines there are exactly $2^k$ distinct address patterns. If $2^k < W$, two of the $W$
words would have to share a pattern (pigeonhole), and the memory could not tell them apart, so
$2^k \ge W$ is necessary. Conversely, with $k = \lceil \log_2 W \rceil$ we have $2^k \ge W$, and numbering
the words $0, 1, \dots, W - 1$ in binary gives each its own pattern, so $k$ lines suffice. The width $B$
never entered the argument: all $B$ bits of a word share that word's address.
:::

:::trap{#trap-width-lines title="Counting bits instead of words" depth="standard"}
A $32\text{K} \times 8$ chip holds 256 Kbit. The tempting wrong answer for its address lines is
$\log_2(256\text{K}) = 18$, which counts **bits**. The memory addresses **words**: $\log_2(32\text{K}) = 15$
address lines and 8 data lines. The opposite slip, using bytes when the memory is word-addressable,
gives the same kind of error: 4 KB of 32-bit words is 1024 words, so 10 address lines, not 12.
:::

## Inside a chip: the cell array and its decoders

:::intuition{#array-intuition title="A tall thin list folded into a square" depth="standard"}
If you built a $1\text{M} \times 1$ memory literally as a list, its address decoder would need a
million output wires, one per word, each running the full width of the chip. Nobody builds that. Instead
the million cells are folded into a square, 1024 rows by 1024 columns. Half of the address bits pick a
**row** (a 10-to-1024 decoder drives the **word lines**), and the other half pick a **column** inside
that row (a 10-to-1024 column decoder, or a multiplexer, selects one **bit line**). A cell is reached
where its row and its column meet. Two decoders of 1024 outputs replace one of a million: the same
trick a city uses when it names a house by street and number instead of giving every house its own
unique road.
:::

:::definition{#chip-organisation term="Chip organisation and 2-D (coincident) decoding" depth="standard"}
A memory chip contains a rectangular **cell array**, a **row decoder**, **column** circuitry (sense
amplifiers that read the bit lines, and a column decoder or multiplexer), and the control logic for
$\overline{CS}$, $\overline{WE}$ and $\overline{OE}$.

- **Linear (1-D) decoding:** one $k : 2^k$ decoder drives one word line per word. Simple, but the decoder
  has $2^k$ outputs and the array is $2^k$ rows tall and only $B$ bits wide.
- **2-D (coincident) decoding:** the $k$ address bits split into $r$ row bits and $c = k - r$ column bits.
  An $r : 2^r$ row decoder selects a row of $2^c$ cells (or of $2^c$ groups of $B$ bits); the column
  decoder picks one cell (or one group) from it. The decoders together have $2^r + 2^c$ outputs.

Reading a word: the row decoder raises one word line, every cell in that row puts its bit on its bit
line, the sense amplifiers detect the bits, and the column selection passes the wanted one(s) to the data
pins. Writing drives the selected bit lines instead. This is the 4 × 4 RAM picture of most textbooks
grown to realistic size: a decoder, a grid of one-bit cells, and read/write circuitry along the bottom.
:::

:::theorem{#two-d-theorem name="The balanced split minimises the decoder lines" depth="standard"}
For $k$ address bits split as $r$ row bits and $k - r$ column bits, the number of decoder outputs
$2^r + 2^{k-r}$ is smallest when $r = \lfloor k/2 \rfloor$ (or $\lceil k/2 \rceil$): $2 \cdot 2^{k/2}$ lines for
even $k$ and $3 \cdot 2^{(k-1)/2}$ for odd $k$, against $2^k$ for a single decoder.
:::

:::proof{#proof-two-d of="the balanced-split theorem" depth="standard"}
**Idea first:** the product $2^r \cdot 2^{k-r} = 2^k$ is fixed, and two numbers with a fixed product have
the smallest sum when they are as close together as possible.

Write $u = 2^r$ and $v = 2^{k-r}$, so $uv = 2^k$. Then $(u + v)^2 = (u - v)^2 + 4uv = (u - v)^2 + 4 \cdot 2^k$,
so $u + v$ is smallest exactly when $|u - v|$ is smallest. While $|r - k/2| \ge 1$, moving $r$ one step
towards $k/2$ brings $u$ and $v$ closer (one doubles, the other halves, and the larger one shrinks); the
closest pair is reached at $r = \lfloor k/2 \rfloor$ or $\lceil k/2 \rceil$, which give the same sum. For
even $k$, $u = v = 2^{k/2}$ and the sum is $2 \cdot 2^{k/2}$. For odd $k$ the two closest choices are
$2^{(k-1)/2}$ and $2^{(k+1)/2}$, summing to $3 \cdot 2^{(k-1)/2}$.

**Sanity check:** $k = 12$: $64 + 64 = 128$ lines instead of 4096; $k = 11$: $32 + 64 = 96$; and for
$k = 10$ the unbalanced split $r = 2$ gives $4 + 256 = 260$, against the balanced $32 + 32 = 64$ already met
in the coincident-decoding aside of [Chapter 5, Lesson 3](lesson:decoders-encoders).
:::

:::intuition{#cell-intuition title="A bit kept by a tug of war, or by a leaking bucket" depth="standard"}
There are two ways to keep one bit in a cell. The first is the latch of
[Chapter 6](lesson:latches): two inverters in a loop, each holding the other in place. As long as the
power is on, the loop actively defends its value; nothing needs to be done to keep it. The second is
much smaller: a tiny capacitor, charged for 1 and empty for 0, behind a single transistor that acts as a
door. A capacitor is a leaking bucket: its charge drains away in milliseconds. So someone must
periodically read every bucket and top it up again. The first cell is **static** RAM, the second is
**dynamic** RAM, and that topping up is called **refresh**.
:::

:::definition{#sram-dram term="SRAM and DRAM cells" depth="standard"}
- **SRAM cell:** two cross-coupled CMOS inverters (a bistable latch, 4 transistors) plus 2 access
  transistors that connect it to a complementary pair of bit lines when its word line is high:
  **6 transistors** per bit. The loop keeps its value as long as power is applied; reading does not
  disturb it; **no refresh** is needed. Fast, but large per bit: used for caches and register files.
- **DRAM cell:** **one transistor and one capacitor** per bit. Writing charges or empties the
  capacitor through the access transistor; reading connects the capacitor to a precharged bit line and a
  sense amplifier detects the small voltage change. The read **destroys** the stored charge, so the sense
  amplifier writes the value back. Leakage drains the capacitor within milliseconds, so every row must be
  read and rewritten (**refreshed**) periodically, typically every row once in 64 ms. Small and cheap per
  bit: used for main memory.

Both are volatile. A refresh controller refreshes a whole row at a time (all its columns at once), so the
work is counted in rows: with $R$ rows and a refresh period $T$, one row must be refreshed every
$T / R$ on average.
:::

:::derivation{#refresh-derivation of="the refresh interval and the refresh overhead" depth="standard"}
Every one of the $R$ rows must be refreshed once in each period $T$. Spreading the refreshes evenly
("distributed refresh"), the controller refreshes one row every
$$
t_{\text{int}} = \frac{T}{R}.
$$
If one row refresh occupies the memory for a row cycle $t_{RC}$, the memory spends $R \cdot t_{RC}$ of every
period $T$ refreshing, a fraction
$$
\text{overhead} = \frac{R \, t_{RC}}{T}.
$$
**Sanity check:** with $R = 8192$ rows, $T = 64$ ms and $t_{RC} = 50$ ns: $t_{\text{int}} = 64\ \text{ms} / 8192 = 7.8125\ \mu\text{s}$,
and the overhead is $8192 \times 50\ \text{ns} / 64\ \text{ms} = 0.0064$, i.e. $0.64\%$. Refreshing all rows in one
burst instead ("burst refresh") takes the same total time but blocks the memory for
$8192 \times 50\ \text{ns} \approx 0.41$ ms at a stretch.

**Many chips refresh in parallel.** In a memory built from many DRAM chips, every chip receives the same
refresh command and refreshes its own row $r$ at the same moment, so the busy time per period is
(rows per chip) $\times\, t_{RC}$, **not** multiplied by the number of chips. The fraction of time
**available** for reads and writes is
$$
1 - \frac{R\,t_{RC}}{T}.
$$
Why parallel: the chips of a row of the chip grid are separate pieces of silicon, each with its own
sense amplifiers, so nothing forces them to take turns; the controller simply drives all their row
addresses together. Computer Organisation questions (for example cse-2010-cs-7 and cse-2018-cs-23)
build a large unit from many chips precisely to test this point: the naive product "chips × rows ×
$t_{RC}$" is their favourite distractor.
:::

:::note{#erratum-sram title="A loose claim to avoid (what SRAM needs)" depth="standard"}
Some printed notes describe SRAM as having "high power consumption" because its "transistors do not
require power to prevent leakage". The reason given is muddled. SRAM **must stay powered** to keep its
data (it is volatile, like DRAM); what it does not need is **refresh**, because the latch restores its
own value continuously. The power comparison depends on what is measured: a CMOS SRAM cell that merely
holds its value draws almost no current (a small battery can keep an SRAM alive), but per bit stored,
and at full speed, SRAM is usually the more power-hungry of the two, and comparison tables in textbooks
and exams list "SRAM: higher power, DRAM: lower power". Give that table answer when asked, with the
correct reason. The correct one-line comparison: SRAM is faster, needs no refresh, and is larger and
costlier per bit; DRAM is denser and cheaper, needs refresh, and has a destructive read.
:::

### Worked examples: chips, arrays and cells

::::example{#ex-org-easy level="easy" title="Address and data lines of a 4K × 8 chip" depth="quick"}
A memory chip is organised as $4\text{K} \times 8$. How many address lines and data lines does it have,
and what is its capacity in bits and in bytes?

:::step{why="The address names a word; by the address-lines theorem only the number of words matters."}
Words: $4\text{K} = 4096 = 2^{12}$, so $k = 12$ address lines.
:::

:::step{why="All bits of a word leave the chip together, one data line per bit."}
Word width 8, so 8 data lines.
:::

:::step{why="Capacity is words times bits per word; a byte is 8 bits."}
$4096 \times 8 = 32\,768$ bits $= 32$ Kbit $= 4$ KB.
:::

:::answer
12 address lines, 8 data lines, $32\,768$ bits (4 KB).
:::
::::

::::example{#ex-org-medium level="medium" title="Row and column decoders for a 64K × 1 array" depth="standard"}
A $64\text{K} \times 1$ memory array uses 2-D decoding. How should the 16 address bits be split, how many
decoder outputs are needed, and how does that compare with a single decoder?

:::step{why="The address-lines theorem gives the number of address bits from the number of words."}
$64\text{K} = 2^{16}$, so $k = 16$.
:::

:::step{why="The balanced-split theorem: equal halves minimise 2^r + 2^(k − r)."}
$r = 8$ row bits and $c = 8$ column bits: the array is $256 \times 256$ cells.
:::

:::step{why="Each decoder has one output per row or per column."}
Lines: $2^8 + 2^8 = 512$. A single 16 : 65 536 decoder would need $65\,536$ outputs.
:::

:::answer
8 + 8 bits, a $256 \times 256$ array, 512 decoder outputs instead of $65\,536$ (128 times fewer).
:::
::::

::::example{#ex-org-gate level="gate" title="How often must a DRAM refresh a row?" depth="standard"}
A DRAM chip has 8192 rows; each row must be refreshed at least once every 64 ms, and one row refresh
takes 50 ns. Find the interval between row refreshes under distributed refresh, and the percentage of
time spent refreshing.

:::step{why="Refresh works on whole rows, so the period is shared among the rows."}
$t_{\text{int}} = T / R = 64\ \text{ms} / 8192 = 7.8125\ \mu\text{s}$.
:::

:::step{why="Each period contains R row refreshes, each lasting one row cycle."}
Busy time per period: $8192 \times 50\ \text{ns} = 409.6\ \mu\text{s}$.
:::

:::step{why="Overhead is busy time over the period."}
$409.6\ \mu\text{s} / 64\ \text{ms} = 0.0064 = 0.64\%$.
:::

:::answer
One row every $7.8125\ \mu\text{s}$; refresh takes $0.64\%$ of the time. The number of columns does not
enter: a row refresh restores every column of the row at once.
:::
::::

::::example{#ex-org-edge level="gate" title="Edge case: same capacity, different chips" depth="standard"}
Two chips both hold 32 Kbit: one is $32\text{K} \times 1$, the other $4\text{K} \times 8$. Compare their address
lines and their total address-plus-data pins.

:::step{why="Address lines follow the number of words, which differs by a factor of 8."}
$32\text{K} \times 1$: $\log_2 32\,768 = 15$ address lines. $4\text{K} \times 8$: $\log_2 4096 = 12$.
:::

:::step{why="Data lines follow the word width."}
Data lines: 1 against 8.
:::

:::step{why="Add the two counts to compare the pin budgets."}
Pins: $15 + 1 = 16$ against $12 + 8 = 20$.
:::

:::answer
15 and 12 address lines; 16 and 20 address-plus-data pins. Equal capacity does **not** mean equal
address lines: every factor of 2 moved from words into width removes one address line and adds data lines.
:::
::::

::::example{#ex-org-refresh-chips level="gate" title="Edge case: refreshing a memory of sixteen DRAM chips" depth="standard"}
A 1 GB main memory, 32 bits wide, is built from $64\text{M} \times 8$ DRAM chips. Each chip has 8192 rows;
one row refresh takes 40 ns and every row must be refreshed every 4 ms. What percentage of the time is
available for reads and writes?

:::step{why="The chip-count rule: words over chip words, times width over chip width."}
Words: $2^{30}/4 = 256\text{M}$; rows of chips $256\text{M}/64\text{M} = 4$; chips per row $32/8 = 4$: 16 chips.
:::

:::step{why="Every chip refreshes its own row at the same time, so the chip count does not multiply the time."}
Busy per period: $8192 \times 40\ \text{ns} = 327.68\ \mu\text{s}$.
:::

:::step{why="Overhead is busy time over the period; what remains is available."}
$327.68\ \mu\text{s} / 4\ \text{ms} = 8.192\%$; available $91.808\% \approx 92\%$.
:::

:::answer
About 92 %. The tempting $16 \times 327.68\ \mu\text{s} = 5.24$ ms is longer than the 4 ms period itself, so it
cannot be right. Notice that the 16 chips mattered only to show that the trap is there: the answer uses
the rows of **one** chip.
:::
::::

:::note{#recap-organisation title="Recap" depth="quick"}
A $W \times B$ memory has $\lceil \log_2 W \rceil$ address lines and $B$ data lines; $1\text{K} = 1024$. Chips fold
their cells into a near-square array with row and column decoders ($2^r + 2^{k-r}$ lines, smallest at the
balanced split). SRAM = latch, 6 transistors, no refresh; DRAM = 1 transistor + 1 capacitor, refresh
every $T / R$, and all chips of a memory refresh in parallel. Both are volatile.
:::

## Building bigger memories from chips

:::intuition{#expansion-intuition title="A meeting with one microphone, and a minute-taker who only listens when named" depth="standard"}
[Chapter 5, Lesson 5](lesson:rom-pla-pal) already built big ROMs from small ones: chips stand **side by
side** for wider words and **take turns** for more words, with a decoder on the high address bits picking
the row. Everything there carries over to RAM; what is new is that a RAM is also **written**, and its data
pins are both inputs and outputs on one shared bus.

Think of a meeting with one microphone. Many people sit at the table (the chips), but only the one who
has been handed the microphone may speak (only the selected chip drives the data bus); everyone else is
silent, not shouting "nothing" (their outputs are **high-impedance**, neither 0 nor 1). When the chair
says "write this down" (the **write enable**), the instruction is heard by the whole room, yet only the
people whose name was called (the selected row's chip select) pick up their pens. And while the chair is
dictating, nobody else may talk at the same time: during a write the chips' **output enables** must be
off, or a chip and the processor would drive the same wire to opposite values.
:::

:::note{#ram-control title="What changes for RAM: chip select, write enable, output enable" depth="standard"}
In a chip grid built from RAM chips:

- **Chip select ($\overline{CS}$)** comes from the decoder, one output per row of chips, so it is the only
  control line that differs from row to row. A deselected chip ignores everything else: it neither
  stores what is on the bus nor drives it.
- **Write enable ($\overline{WE}$)** and **output enable ($\overline{OE}$)** are **bused**: one wire each, from
  the processor to every chip. They need no decoding of their own, because a chip acts on them only while
  its $\overline{CS}$ is active; the chip select "gates" them.
- **The data bus is shared by all rows.** In a read, the selected row drives it and every other row is
  high-impedance. In a write, the processor drives it, $\overline{OE}$ is inactive on every chip, and
  only the selected row latches the value when $\overline{WE}$ goes active.

**Why the decoder must raise exactly one output:** if two rows were selected together, both would drive
the bus in a read (**bus contention**: one chip pulling a wire to 0 while another pulls it to 1, which
gives a garbage value and wastes current) and both would store the value in a write. With no row
selected the bus floats and a read returns garbage. That is why a chip-select decoder has one output
active for every address it decodes, and why the unused outputs of a partly used decoder are dangerous
addresses, not harmless ones.
:::

:::definition{#word-expansion term="Word-size (width) expansion" depth="standard"}
To build a $w \times B$ memory from $w \times b$ chips, place $\lceil B / b \rceil$ chips **side by side**.
Every chip receives the **same** $\log_2 w$ address lines, the same chip select and the same
read/write line; chip $j$ connects to data lines $D_{jb}$ to $D_{jb + b - 1}$. No decoder is needed,
because every access uses every chip.
:::

:::definition{#capacity-expansion term="Capacity (word-count) expansion" depth="standard"}
To build a $W \times b$ memory from $w \times b$ chips ($w$ a power of 2), use $\lceil W / w \rceil$ chips (or
rows of chips) that take turns:

- the **low** $\log_2 w$ address bits go to **every** chip (the word inside a chip);
- the remaining **high** address bits drive a chip-select decoder with $\lceil \log_2 (W/w) \rceil$ inputs,
  one output per chip or row of chips;
- all chips share the data lines; a deselected chip's outputs are high-impedance, so exactly one chip
  drives the bus.

When $W / w$ is not a power of 2 the decoder has more outputs than rows, and the spare outputs select
nothing. Combining both directions, a $W \times B$ memory from $w \times b$ chips is a grid of
$\lceil W/w \rceil$ rows by $\lceil B/b \rceil$ columns; the decoder enables a whole row.
:::

:::derivation{#chip-count of="the number of chips and the decoder size" depth="standard"}
Each row must supply all $B$ bits of a word, $b$ bits per chip: $\lceil B / b \rceil$ chips per row. Each
row covers $w$ consecutive addresses, so $W$ addresses need $\lceil W / w \rceil$ rows. Hence
$$
N_{\text{chips}} = \left\lceil \frac{W}{w} \right\rceil \cdot \left\lceil \frac{B}{b} \right\rceil
\;=\; \frac{W}{w}\cdot\frac{B}{b} \quad \text{when both divide exactly.}
$$
The system needs $\lceil \log_2 W \rceil$ address lines; the chips use the low $\log_2 w$ of them, and the
other $h = \lceil \log_2 W \rceil - \log_2 w$ high lines feed an $h : 2^h$ decoder (none when there is a single
row). **Sanity check** (the capacity test of [Chapter 5, Lesson 5](lesson:rom-pla-pal)): for
$64\text{K} \times 16$ from $16\text{K} \times 8$ the capacity ratio is
$\frac{65\,536 \cdot 16}{16\,384 \cdot 8} = 8$ and the formula gives $4 \times 2 = 8$ chips with a $2 : 4$ decoder.
:::

:::theorem{#expansion-theorem name="The chip grid is a W × B memory" depth="standard"}
In the grid above, with the low $\log_2 w$ address bits to every chip and a decoder on the high bits
enabling one row, every system address $a < W$ selects **exactly one** row, and inside it the same word
$a \bmod w$ of every chip; the columns together store all $B$ bits. So the grid behaves exactly like one
$W \times B$ memory: a write to address $a$ followed by a read of $a$ returns the written word, and writes
to other addresses never disturb it.
:::

:::proof{#proof-expansion of="the expansion theorem" depth="standard"}
**Idea first:** dividing an address by the chip size splits it uniquely into "which row" and "which word
inside the row".

Write $a = q \cdot w + s$ with $0 \le s < w$. Because $w = 2^m$, $s$ is exactly the low $m$ bits of $a$ and $q$
the high bits, and every $a$ has exactly one such pair (division with remainder). The decoder raises
exactly one output, number $q$, so only row $q$ is enabled; all other rows leave the bus alone (their
outputs are high-impedance, and they ignore writes). Inside row $q$ every chip uses word $s$, and chip $j$
handles bits $jb$ to $jb + b - 1$, so the row stores the full word. Two different addresses differ in $q$
or in $s$, hence they use different cells, so a write to one cannot change the other. Our check script
confirms this by experiment: it builds each array of this lesson bit by bit, writes a different value to
every address and reads them all back.
:::

:::viz{#chip-array-viz spec="chip-array-expansion" mode="animate" depth="standard"}
:::

:::trap{#trap-decoder-width title="A decoder for width expansion" depth="standard"}
For $1\text{K} \times 8$ from two $1\text{K} \times 4$ chips the expected wrong answer is "a 1 : 2 decoder picks the
chip". Both chips must answer **every** access, one with the high nibble and one with the low nibble, so
there is nothing to choose and no decoder. A decoder appears only when **words** are added. A second
slip is to drive the decoder with the **low** address bits: consecutive addresses would then hop from
chip to chip. That is a legitimate design (low-order interleaving, a COA topic), but it is not the
standard "each chip holds a block of consecutive addresses" layout that questions mean unless they
say otherwise.
:::

### Worked examples: expansion

::::example{#ex-exp-easy level="easy" title="2K × 16 from 2K × 4 RAM chips" depth="quick"}
Build a $2\text{K} \times 16$ RAM from $2\text{K} \times 4$ chips. How many chips, which lines do they share,
and is a decoder needed?

:::step{why="The chips already have enough words; only the width is short."}
Width ratio $16 / 4 = 4$: four chips side by side, one row.
:::

:::step{why="All four chips must work on the same word in every access, so they share the address lines."}
$2\text{K} = 2^{11}$: $A_{10} \dots A_0$ (11 lines) go to all four chips.
:::

:::step{why="Every access uses every chip, so the control lines are shared too and nothing needs choosing."}
One $\overline{CS}$, one $\overline{WE}$ and one $\overline{OE}$ wire reach all four chips. Chip $j$ connects to
$D_{4j+3} \dots D_{4j}$: chip 0 to $D_3 \dots D_0$, …, chip 3 to $D_{15} \dots D_{12}$.
:::

:::answer
4 chips, 11 shared address lines, shared control lines, no decoder. A write of a 16-bit word stores
4 bits in each chip at the same moment.
:::
::::

::::example{#ex-exp-medium level="medium" title="8K × 8 from 1K × 4 chips" depth="standard"}
How many $1\text{K} \times 4$ chips build an $8\text{K} \times 8$ memory, and how are the address lines used?

:::step{why="Width first: each row must deliver 8 bits."}
$8 / 4 = 2$ chips per row.
:::

:::step{why="Then capacity: each row holds 1K words."}
$8\text{K} / 1\text{K} = 8$ rows, so $8 \times 2 = 16$ chips.
:::

:::step{why="The system has 8K words, so 13 address lines; the chips use the low 10."}
$A_9 \dots A_0$ go to all 16 chips; $A_{12}A_{11}A_{10}$ drive a $3 : 8$ decoder, one output per row.
:::

:::answer
16 chips in 8 rows of 2; a $3 : 8$ decoder on $A_{12}A_{11}A_{10}$. Check: $8\text{K} \cdot 8 / (1\text{K} \cdot 4) = 16$.
:::
::::

::::example{#ex-exp-gate level="gate" title="64K × 16 from 16K × 8 chips, with the decoder" depth="standard"}
Design a $64\text{K} \times 16$ memory from $16\text{K} \times 8$ chips: chips, grid, address split and decoder.

:::step{why="Width ratio gives chips per row, word ratio gives rows."}
$16 / 8 = 2$ chips per row; $64\text{K} / 16\text{K} = 4$ rows; 8 chips.
:::

:::step{why="The address-lines theorem for the system and for one chip."}
System: $\log_2 65\,536 = 16$ lines; chip: $\log_2 16\,384 = 14$ lines.
:::

:::step{why="The two leftover high bits name the row, so they feed a 2:4 decoder."}
$A_{13} \dots A_0$ to all 8 chips; $A_{15}A_{14}$ into a $2 : 4$ decoder whose output $q$ enables row $q$
(both chips of the row).
:::

:::answer
8 chips (4 rows × 2), $2 : 4$ decoder on $A_{15}A_{14}$, 14 shared low lines. The animation above builds
exactly this array.
:::
::::

::::example{#ex-exp-byte level="gate" title="A byte-addressable memory with 32-bit words" depth="standard"}
A byte-addressable 16 KB memory with 32-bit words is built from $2\text{K} \times 8$ chips. How many chips,
how are the address lines used, and which chip holds byte address `2A47`?

:::step{why="Byte addressing names every byte, but the chips are organised by 32-bit words, so count both."}
Bytes: $16\text{K} = 2^{14}$, so the processor puts out 14 address lines $A_{13} \dots A_0$. Words:
$16\text{K}/4 = 4\text{K}$ words of 32 bits.
:::

:::step{why="The chip-count rule on words and widths."}
$(4\text{K}/2\text{K}) \cdot (32/8) = 2 \cdot 4 = 8$ chips, in 2 rows of 4 side by side.
:::

:::step{why="The two lowest bits number the byte inside a 32-bit word; each byte of a word lives in a different chip of the row, so these bits never reach the chips."}
$A_1A_0$ select the **byte lane** (which of the four chips of a row supplies or accepts the byte); for a
whole-word access all four lanes are used and $A_1A_0 = 00$.
:::

:::step{why="The next 11 bits number the word inside a chip, and every chip of the grid needs them."}
$A_{12} \dots A_2$ (11 lines, $2\text{K} = 2^{11}$) go to all 8 chips. The one bit left, $A_{13}$, picks the
row: a $1 : 2$ decoder, which is just an inverter ($\overline{A_{13}}$ selects row 0, $A_{13}$ row 1).
:::

:::step{why="Split the byte address into row bit, word offset and byte lane."}
`2A47` $= 10\,1010\,0100\,0111_2$: $A_{13} = 1$ (row 1); $A_{12} \dots A_2 = 010\,1001\,0001_2 =$ `291`
(word 657 inside the chips); $A_1A_0 = 11$ (lane 3).
:::

:::answer
8 chips in 2 rows of 4; $A_1A_0$ choose the byte lane, $A_{12} \dots A_2$ go to every chip, $A_{13}$ selects
the row through an inverter. Byte `2A47` is word `291` of the lane-3 chip in row 1. The trap is to give
the chips the **low** 11 bits $A_{10} \dots A_0$: that treats the memory as word-addressable and puts the
four bytes of one word into one chip.
:::
::::

::::example{#ex-exp-edge level="gate" title="Edge case: 24K × 8 from 8K × 8, a partly used decoder" depth="standard"}
Build a $24\text{K} \times 8$ memory from $8\text{K} \times 8$ chips. How many address lines and what decoder?
What happens at addresses the memory does not have? (The decoder layout is the one of
[Chapter 5, Lesson 3](lesson:decoders-encoders)'s three-chip edge case; what is new here is the ceiling
in the address count and what the floating bus means for a RAM.)

:::step{why="24K is not a power of 2, so the address-lines theorem needs the ceiling."}
$24\text{K} = 24\,576$; $2^{14} = 16\,384 < 24\,576 \le 32\,768 = 2^{15}$, so 15 address lines.
:::

:::step{why="Each chip holds 8K words, so three chips take turns; the chips use 13 low bits."}
Chips: $24\text{K} / 8\text{K} = 3$. High bits: $15 - 13 = 2$, so a $2 : 4$ decoder on $A_{14}A_{13}$.
:::

:::step{why="Three rows use three decoder outputs; the fourth output has no chip."}
Outputs 0, 1, 2 enable the chips at `0000–1FFF`, `2000–3FFF`, `4000–5FFF`; output 3 (`6000–7FFF`) is
left unconnected.
:::

:::answer
15 address lines, 3 chips, a $2 : 4$ decoder with **one unused output**. A read of `6000–7FFF` selects no
chip, the data bus floats, and the value read is undefined; a write there is silently lost, because no
chip sees its chip select while $\overline{WE}$ is active. The system must never use those addresses.
:::
::::

:::note{#recap-expansion title="Recap" depth="quick"}
Width: chips side by side, shared address, no decoder. Capacity: low $\log_2 w$ bits to every chip, high
bits to a decoder that enables one row; $\overline{WE}$ and $\overline{OE}$ are bused and act only on the selected
row. Byte addressing: the lowest bits pick the byte lane and skip the chips. Chips $= \lceil W/w \rceil \cdot \lceil B/b \rceil$; a non-power-of-2 count
leaves decoder outputs unused.
:::

## Address maps: which chip answers which address

:::intuition{#map-intuition title="Reading the row number off the top digits" depth="standard"}
Once the high address bits pick the row, every row owns one **block** of consecutive addresses, and the
blocks sit end to end. In hexadecimal this is easy to see, because a chip of $16\text{K} = 2^{14}$ words
spans exactly `4000` hex addresses: row 0 owns `0000–3FFF`, row 1 owns `4000–7FFF`, and so on. To find
which chip holds an address you do not need to divide anything: look at the top bits, and they **are**
the row number; the remaining bits are the offset inside the chip.
:::

:::definition{#address-map term="Address map" depth="standard"}
The **address map** of a memory system lists, for every chip (or row of chips), the range of system
addresses it answers. With rows of $w = 2^m$ words starting at address 0, row $q$ answers
$$
q \cdot w \quad \text{to} \quad (q + 1)\,w - 1,
$$
and a system address $a$ lives in row $q = \lfloor a / w \rfloor$ (the bits above bit $m - 1$) at offset
$s = a \bmod w$ (the low $m$ bits). With **full decoding** every address bit takes part, so each word has
exactly one address. With **incomplete** (partial) decoding some high bits are ignored by the chip
select: then every ignored bit doubles the number of addresses at which the same chip appears. These
extra copies are called **aliases** (or images, or fold-back addresses).
:::

:::intuition{#alias-intuition title="A receptionist who ignores part of the number" depth="standard"}
Suppose shelf numbers have four digits: the first says which bookcase, the last two which shelf in it,
and the second digit should say which wing of the library. A lazy receptionist reads only the first
digit and skips the second. Requests for 8023, 8123, 8223, …, 8923 all go to bookcase 8, and bookcase 8
only ever looks at the last two digits, "23". One shelf now answers to ten different numbers, and a book
put there under 8123 can be fetched again under 8923.

Every digit the receptionist ignores multiplies the numbers that reach one shelf by the number of values
that digit can take; in binary, by 2. That is all partial decoding is: the chip-select logic does not
look at some high address bits, so each word of the chip has one address for every combination of them.
:::

:::theorem{#alias-theorem name="Each ignored address bit doubles the aliases" depth="standard"}
On an $n$-bit address bus, a chip of $2^m$ words whose chip select checks only $d$ of the $n - m$ high
address bits answers at $2^{\,n - m - d}$ different blocks of addresses, and every word of the chip has
exactly $2^{\,n - m - d}$ addresses.
:::

:::proof{#proof-alias of="the alias theorem" depth="standard"}
**Idea first:** a bit that nobody looks at may be 0 or 1 without changing anything.

An address is the pair (high bits, low $m$ bits). The chip responds when its $d$ checked high bits have
the required values; the other $n - m - d$ high bits are free, and each of their $2^{\,n-m-d}$ combinations
gives a different block in which the chip answers. Inside each block the low $m$ bits pick the same word
as in every other block, because the chip never sees the free bits. So each word appears at
$2^{\,n-m-d}$ addresses. With full decoding, $d = n - m$, and the count is $2^0 = 1$.
:::

:::trap{#trap-alias title="Assuming one copy under partial decoding" depth="standard"}
A $4\text{K}$ chip on a 16-bit bus whose chip select is just $A_{15}$ looks as if it lives at `8000–8FFF`.
It also answers at `9000`, `A000`, …, `F000`: bits $A_{14}A_{13}A_{12}$ are ignored, so there are $2^3 = 8$
copies. The expected wrong answer to "how many addresses access the first word?" is 1; the right one is 8.
Partial decoding is cheaper (fewer gates) and harmless only if the software never uses the aliases.

Computer Organisation also asks the reverse question (cse-2019-cs-2, for example): given the gates that
drive a chip select, what range of addresses enables the chip? Read off the high bits the gates force
to 0 or 1, let every bit the gates do not see run through all its values, and let the chip's own address
bits run from all 0s to all 1s.
:::

### Worked examples: address maps

::::example{#ex-map-easy level="easy" title="The address map of the 64K × 16 memory" depth="quick"}
List the address range of each row in the $64\text{K} \times 16$ memory built from $16\text{K} \times 8$ chips.

:::step{why="A row holds 16K = 2^14 words, which is 4000 in hexadecimal."}
Block size `4000` hex.
:::

:::step{why="Rows sit end to end from address 0; row q starts at q times the block size."}
Row 0: `0000–3FFF`; row 1: `4000–7FFF`; row 2: `8000–BFFF`; row 3: `C000–FFFF`.
:::

:::answer
Four blocks of `4000` addresses; the decoder input $A_{15}A_{14}$ is 00, 01, 10, 11 in them, which is why the
top hex digit runs 0–3, 4–7, 8–B, C–F.
:::
::::

::::example{#ex-map-medium level="medium" title="Which chip holds address 9A3C?" depth="standard"}
In the same memory, which row and which word inside the chips does address `9A3C` reach?

:::step{why="The row number is the bits above the chip's 14 address bits."}
`9A3C` $= 1001\,1010\,0011\,1100_2$; $A_{15}A_{14} = 10$, so row 2.
:::

:::step{why="The offset is the low 14 bits, i.e. the address minus the row's start 8000."}
$\texttt{9A3C} - \texttt{8000} = \texttt{1A3C}$ (decimal 6716).
:::

:::answer
Row 2 (both of its chips), word `1A3C` inside each chip. The two chips give the high and the low byte of the 16-bit word.
:::
::::

::::example{#ex-map-gate level="gate" title="A row in a 16-chip memory" depth="standard"}
The $8\text{K} \times 8$ memory built from sixteen $1\text{K} \times 4$ chips receives address `1A7F`. Which
decoder output is active, which chips respond, and at what offset?

:::step{why="Rows hold 1K = 2^10 words, so the row number is the bits above bit 9."}
`1A7F` $= 1\,1010\,0111\,1111_2$ (13 bits). $A_{12}A_{11}A_{10} = 110$: decoder output 6.
:::

:::step{why="The low 10 bits are the offset inside every chip of the row."}
Offset $= \texttt{1A7F} - 6 \times \texttt{400} = \texttt{1A7F} - \texttt{1800} = \texttt{27F}$ (decimal 639).
:::

:::step{why="Each row has two chips, one per nibble; numbering chips row by row, row 6 holds chips 12 and 13."}
Chips 12 (low nibble) and 13 (high nibble) respond; the other 14 chips stay high-impedance.
:::

:::answer
Decoder output 6; chips 12 and 13; word `27F` (639) inside each.
:::
::::

::::example{#ex-map-edge level="gate" title="Edge case: a chip that appears eight times" depth="standard"}
A $4\text{K} \times 8$ chip sits on a 16-bit address bus with $\overline{CS}$ driven by $\overline{A_{15}}$ only (it is
selected whenever $A_{15} = 1$). At which addresses does its first word appear, and what does a program
read at `F123` after writing `5A` to `8123`?

:::step{why="The chip uses 12 address bits; one of the 4 high bits is checked, three are ignored."}
$n = 16$, $m = 12$, $d = 1$: $2^{16 - 12 - 1} = 8$ copies.
:::

:::step{why="The ignored bits A14, A13, A12 take all 8 values while A15 = 1."}
Word 0 appears at `8000`, `9000`, `A000`, `B000`, `C000`, `D000`, `E000`, `F000`.
:::

:::step{why="8123 and F123 differ only in ignored bits; the chip sees the same 12-bit offset 123."}
Both reach word `123` of the chip.
:::

:::answer
Eight addresses `8000`, `9000`, …, `F000`; the read at `F123` returns `5A`, the value written at `8123`.
Full decoding would need $A_{14}A_{13}A_{12} = 000$ in the chip select as well.
:::
::::

:::note{#recap-map title="Recap" depth="quick"}
Row $q$ of $w$-word chips answers $q w$ to $(q+1) w - 1$; the top bits are the row, the low bits the offset.
Under partial decoding each ignored high bit doubles the copies: $2^{\,n-m-d}$ addresses per word.
:::

## Practice

Our own questions in GATE formats: two warm-ups, four exam-level questions, then two that need care.

:::practice{id="nx-dl-07-01-q01" depth="standard"}
:::

:::practice{id="nx-dl-07-01-q02" depth="standard"}
:::

:::practice{id="nx-dl-07-01-q03" depth="standard"}
:::

:::practice{id="nx-dl-07-01-q04" depth="standard"}
:::

:::practice{id="nx-dl-07-01-q05" depth="standard"}
:::

:::practice{id="nx-dl-07-01-q06" depth="standard"}
:::

:::practice{id="nx-dl-07-01-q07" depth="standard"}
:::

:::practice{id="nx-dl-07-01-q08" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Memory organisation on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Organisation | $W \times B$: $W$ words of $B$ bits; capacity $W B$ bits; $1\text{K} = 1024$ |
| Address lines | $\lceil \log_2 W \rceil$, independent of the width $B$; data lines $= B$ |
| Kinds | ROM, PROM, EPROM (UV erase), EEPROM (word erase), flash (block erase): non-volatile; SRAM, DRAM: volatile |
| SRAM vs DRAM | SRAM: latch, 6 transistors, no refresh, fast, costlier per bit (tables list it as higher power); DRAM: 1 transistor + 1 capacitor, destructive read, refresh, denser |
| Refresh | one row every $T / R$; overhead $R\,t_{RC} / T$ with $R$ the rows of **one** chip (all chips refresh in parallel); available $1 - R\,t_{RC}/T$ |
| 2-D decoding | $2^r + 2^{k-r}$ decoder lines, smallest at $r = \lfloor k/2 \rfloor$ ($k = 10$: 64 instead of 1024) |
| Width expansion | chips side by side, same address lines, no decoder |
| Capacity expansion | low $\log_2 w$ bits to every chip, high bits to a decoder enabling one row; $\overline{WE}$, $\overline{OE}$ bused; byte-addressable: lowest bits = byte lane |
| Chips | $\lceil W/w \rceil \cdot \lceil B/b \rceil$; spare decoder outputs when $W/w$ is not a power of 2 |
| Address map | row $q$: $q w$ to $(q + 1) w - 1$; top bits = row, low bits = offset |
| Partial decoding | $2^{\,n - m - d}$ aliases per word |
| Optional | not in the current GATE DL syllabus; the same arithmetic appears in COA memory questions |
:::
