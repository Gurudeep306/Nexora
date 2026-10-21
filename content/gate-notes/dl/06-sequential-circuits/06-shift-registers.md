---
id: shift-registers
subject: dl
chapter: sequential-circuits
title: "Shift registers, ring and Johnson counters, LFSRs"
order: 6
prerequisites: [sequential-analysis]
pyq_topics: [dl/sequential]
est_minutes: 50
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every register content, clock count, state sequence, cycle, self-loop and practice answer is produced by simulation in content/gate-notes/_checks/dl/l6_06_registers.py (seqlib Sync, shift_right, ring_step, johnson_step, lfsr_step, universal)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 88–90, set B pp. 155–156 and 158–159, set C pp. 357–372, set D p. 402, set E p. 408."
  - "Facts checked against: M. Morris Mano and M. D. Ciletti, Digital Design (shift registers, serial transfer, universal shift register, ring and Johnson counters); J. F. Wakerly, Digital Design: Principles and Practices (shift-register counters, LFSRs)."
  - "PYQs: src/gate/questions.json (cse-1991-b-6-a, cse-1991-b-6-b, cse-1993-ii-a-6-3, cse-2001-a-37, cse-2006-cs-37, it-2007-cs-40, cse-2014-2-cs-7, cse-2015-1-cs-20, cse-2018-cs-22, cse-2025-1-cs-50); every key is re-derived by simulation."
  - "cse-1993-ii-a-6-3 (key A, C; needs review): the JK chain is a shift register with twisted feedback, so it is both a shift register and a mod-6 Johnson counter; the solution explains why (a) is accepted with (c)."
updated: "2026-10-20"
---

*Counters and registers, lesson 3 of 3.* A **register** is a row of flip-flops that holds a word. A
**shift register** is a register whose flip-flops are wired in a chain, so that at every clock edge each
bit moves one place along. That one idea does a surprising amount of work: it turns a serial stream of
bits into a parallel word and back again, it delays a signal by an exact number of clocks, and, once the
end of the chain is fed back to its beginning, it becomes a counter. This lesson builds the shift register
from D flip-flops, counts exactly how many clocks it takes to load and to empty one (a count that is easy
to get wrong), adds parallel load and the four-mode **universal** register, and shows how a RAM with a counter
can pretend to be a 1024-stage shift register. Then it closes the loop three ways: the **ring counter** (the
last output fed straight back), the **Johnson counter** (the last output fed back inverted) and the
**linear feedback shift register**, or **LFSR** (an XOR of some stages fed back), and studies the state
cycles each one makes, including the cycles nobody wanted.

## Where this fits

[Lesson 2](lesson:flip-flops) gave us the D flip-flop, which simply copies $D$ to $Q$ at the clock edge.
[Lesson 3](lesson:sequential-analysis) taught the analysis procedure: next-state equations, state table, a trace
from the given start, and the cycles every autonomous circuit falls into. In a shift register every next-state
equation is just "copy your neighbour", so this lesson uses that procedure constantly without spelling it out. [Lesson 4](lesson:ripple-counters)
named the three ways to code a counter's states (binary, one-hot and Johnson) and promised that the last two
are shift registers; here they are. The sentence to keep: **in a shift register every stage copies the stage
before it on the same clock edge, so the only freedom left is what you feed into the first stage.**

:::table{#radar title="GATE radar: shift registers, ring and Johnson counters, LFSRs" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 10 (1991 ×2, 1993, 2001, 2006, IT 2007, 2014, 2015, 2018, 2025) |
| Marks | 2-mark MCQs (2001, 2006, IT 2007), 1-mark MCQs (2014, 2015), a 2-mark MSQ (1993), NATs (2018 for 1 mark, 2025 for 2) and two 5-mark designs (1991) |
| Pattern 1 | Trace a shift register with XOR feedback or an XOR inside the chain: 2001, 2006, IT 2007 |
| Pattern 2 | Ring and Johnson sequences and state counts: 1993, 2014, 2015, 2025 |
| Pattern 3 | The state graph of a plain shift register (self-loops): 2018 |
| Pattern 4 | Design a parallel-in/serial-out register, or a shift register out of a RAM: 1991 |
| What examiners test | which end is the input and which bit enters first; that a Johnson counter of N flip-flops has 2N states (and other, unwanted cycles); that a ring or Johnson counter is synchronous; how many clocks a SISO needs; that 0…0 is a trap state of an LFSR |
:::

## The shift register

:::intuition{#shift-intuition title="A bucket brigade" depth="standard"}
Picture a line of people passing buckets of water from a well to a fire. Each person holds one bucket. When
the whistle blows, everybody hands their bucket to the person on their right at the same moment, and the first
person takes a new bucket from the well. The last person's bucket goes onto the fire.

Three things about the brigade are worth noticing before we build it. First, everybody moves **together**,
on the whistle: nobody passes a bucket early, and nobody takes one twice. Second, a bucket that enters at the
well needs one whistle per person to reach the fire, so the line is a **delay**. Third, at any moment you can
walk along the line and look into every bucket at once (that is "parallel out"), or stand at the end and watch
them arrive one at a time ("serial out"). A shift register is this brigade with D flip-flops as the people and
the clock edge as the whistle.
:::

:::definition{#shift-def term="Shift register" depth="standard"}
An $n$-bit **shift register** is a chain of $n$ edge-triggered D flip-flops $Q_1, Q_2, \dots, Q_n$ on **one
common clock**, wired so that each stage copies the one before it:
$$D_1 = SI \ (\text{the serial input}), \qquad D_i = Q_{i-1} \quad (i = 2, \dots, n).$$
The **serial output** is $SO = Q_n$, the end of the chain; the **parallel outputs** are all of
$Q_1 \dots Q_n$. We write the contents left to right as $Q_1Q_2\dots Q_n$, with the serial input entering
on the **left**, so at every active edge the word moves one place to the **right**: the new bit lands in $Q_1$,
every bit moves one stage on, and the old $Q_n$ falls off the end.

Because every flip-flop samples its input at the same edge, each one takes the value its neighbour had
**before** the edge (the synchronous discipline of [Lesson 3](lesson:sequential-analysis)). That is why the
chain moves the word exactly one place per clock and never "races" a bit through several stages at once.
:::

As state equations: $Q_1^+ = SI$, $Q_2^+ = Q_1$, …, $Q_n^+ = Q_{n-1}$. Every number in this lesson comes from
iterating those equations (or a version with something more interesting in place of $SI$). Notice what they do
**not** contain: there is no gate between the stages, so a shift register is as fast as a single flip-flop,
whatever $n$ is.

One small point before we count clocks. The two ends of the chain are often drawn the other way round
(the input on the right, shifting left), and GATE questions use both. Nothing in the theory changes, but every
trace must start by asking **where the bits enter and which bit enters first**. We come back to this in a trap.

:::theorem{#shift-delay name="An n-stage shift register delays every bit by exactly n clocks" depth="standard"}
Feed an $n$-stage shift register, starting from any contents, with a serial stream $b_1, b_2, b_3, \dots$, where
$b_k$ is the value at $SI$ when edge $k$ arrives. Then after edge $k$ the stage $Q_i$ holds $b_{k-i+1}$ (for
$k \ge i$). In particular the serial output after edge $k$ is
$$SO = Q_n = b_{k-n+1},$$
so each bit appears at the output $n - 1$ edges after the edge that took it in, and is present there during the
$n$-th clock period after the one in which it was applied. For an $n$-bit word $b_1 \dots b_n$ entered into a
register that holds older data:

- the **first** bit reaches the output after edge $n$;
- the **last** bit reaches the output after edge $2n - 1$, so all $n$ bits have been seen at the output after
  $2n - 1$ clocks;
- after edge $2n$ the last bit has been shifted out, and none of the word is left in the register.
:::

:::proof{#proof-shift-delay of="the shift-register delay" depth="standard"}
**Idea first:** each edge moves every bit exactly one stage, so a bit's stage number is "edges since it entered,
plus one".

*Induction on $k$.* After edge $k$, $Q_1 = b_k$, because $D_1 = SI$ and $SI = b_k$ at that edge. For $i \ge 2$,
$Q_i^+ = Q_{i-1}$, so the value of $Q_i$ after edge $k$ is the value of $Q_{i-1}$ after edge $k - 1$, which by the
induction hypothesis is $b_{(k-1)-(i-1)+1} = b_{k-i+1}$. That proves the formula for every stage, and $i = n$
gives $SO = b_{k-n+1}$.

*The three counts.* Bit $b_1$ is at the output when $k - n + 1 = 1$, i.e. after edge $n$. Bit $b_n$ is at the
output when $k - n + 1 = n$, i.e. after edge $2n - 1$. At edge $2n$ the output stage takes $b_{n+1}$, a bit that is
not part of the word, and every other stage holds a later bit still; so after $2n$ edges the word has left. ∎

**Check by simulation.** `seqlib.shift_right` run on a cleared 4-bit register with the word 1, 1, 0, 1 followed by
zeros puts the first bit at $Q_4$ after clock 4, the last after clock 7, and leaves 0000 after clock 8.
:::

Notice the asymmetry hiding in the theorem: **loading** an $n$-bit word takes $n$ clocks, but **reading** it out
serially takes only $n - 1$ more, because the first bit is already at the output the moment loading ends. The
total is $2n - 1$, not $2n$. The table below gives the four ways of using a register and the clock count of each.

:::table{#shift-modes title="SISO, SIPO, PISO and PIPO: four ways to use a register" depth="standard"}
| Mode | Data in | Data out | Typical use | Clocks for one n-bit word |
|:--|:--|:--|:--|:--|
| SISO (serial in, serial out) | one bit per clock at $Q_1$ | one bit per clock at $Q_n$ | delay line ($n$ clocks), serial buffer | $n$ to load; first bit out after $n$, last after $2n - 1$ |
| SIPO (serial in, parallel out) | one bit per clock | all of $Q_1 \dots Q_n$ at once | serial-to-parallel conversion (a receiver) | $n$, then read the word in one go |
| PISO (parallel in, serial out) | all bits in one load clock | one bit per clock at $Q_n$ | parallel-to-serial conversion (a transmitter) | 1 load; the first bit is out at once, the last after $n - 1$ shifts |
| PIPO (parallel in, parallel out) | one load clock | all outputs | a plain storage register (a buffer) | 1 |
:::

A PISO and a SIPO are the two halves of every serial link: the transmitter loads a word and shifts it out, the
receiver shifts it in and reads it in parallel. A SIPO is the plain chain with every $Q_i$ brought out; a PISO adds a
**load** path to every stage (next section). The animation shows the SISO and SIPO views together: a 4-bit register
receiving the word 1011, least significant bit first.

:::viz{#shift-register-march-viz spec="shift-register-march" mode="animate" depth="standard"}
:::

Watch clock 4 in the animation. The parallel outputs read **1011**, the whole word, and at that same moment its
first bit, the 1 that entered at clock 1, is sitting at $Q_4$, the serial output. A receiver reading in parallel
is done; a receiver reading serially has seen only one bit, and needs clocks 5, 6 and 7 for the other three.

:::trick{#trick-shift-table title="Write the register as a row and slide it" depth="standard"}
To trace any shift register, write its contents as a row of bits in the order of the chain, write the incoming
bits as a queue on the input side, and at each clock **slide the whole row one place**: the next queued bit drops
into the first cell, the bit in the last cell drops out. For a 4-bit register holding 1101 with the inputs 1, 0, 0
arriving on the left: 1101 → **1**110 → **0**111 → **0**011. Three slides, three answers, no equations.

**Why it works:** the state equations of a shift register are exactly "each cell takes its left neighbour's old
value", which is a slide. **When it fails:** as soon as there is logic between the stages (an XOR in the middle, as
in GATE 2006) or the first stage's input depends on the state (feedback). Then the slide still moves most bits, but
the cells fed by gates must be computed from the **old** row before you slide.
:::

:::trap{#trap-shift-count title="How many clocks does a 4-bit SISO need? (4, 7 or 8, depending on the question)" depth="standard"}
"How many clock pulses are needed to read a 4-bit word out of a SISO register?" has three honest answers, and
examiners write the options so that each wrong reading finds its number.

- **4** is the number of clocks to **load** the word, and also the clock at which the **first** bit reaches the
  output $Q_4$. It is not the time to see the whole word.
- **7** $= 2n - 1$ is the clock at which the **last** bit reaches the output: after 7 clocks all four bits have
  appeared at $Q_4$.
- **8** $= 2n$ is the clock at which the last bit is **shifted out** of the register, leaving none of the word inside.

A vague answer such as "more than 4 clocks" is true but scores nothing; the exact counts are the theorem's. After a **parallel** load the first bit is at the output at once and the
other three need 3 shifts. Always ask: did the word enter serially, and does "out" mean "seen at the output" or
"gone from the register"?
:::

:::trap{#trap-shift-direction title="Which end is the input, and which bit goes in first?" depth="standard"}
A shift register question has two conventions hidden in it, and getting either one backwards gives a wrong
option that the examiners have kindly provided.

1. **Direction.** Does the chain shift right (input at $Q_1$ on the left) or left (input on the right)? Read it from
   the figure: find the flip-flop whose $D$ is the external input. The same register 1101 with the inputs 1, 0, 0 ends
   at 0011 when shifting right and at 1100 when shifting left.
2. **Order of a data string.** When a question says the data 100110000 is "supplied in nine clock cycles", the
   string is written in **time order**: the first character enters at the first clock. GATE 2006 is built on this:
   entered first bit first, the register ends at 010 (the key); entered last bit first, it ends at 111, which is not
   even an option.

A word written as a binary number is a different matter: "send 1011 least significant bit first" means the
time order is 1, 1, 0, 1. When the question says nothing, take a written string in reading order as time order.
:::

There is one more way to look at a shift register, and GATE 2018 asked about it directly: as a state machine
with an input, drawn as a state graph.

:::definition{#shift-state-graph term="The state graph of a shift register" depth="standard"}
An $n$-bit shift register with serial input $x$ is a Moore-type machine with $2^n$ states. From the state
$Q_1Q_2\dots Q_n$ the input $x$ leads to $xQ_1\dots Q_{n-1}$: the new bit in front, the old last bit dropped.

- Every state has **two** outgoing arcs (for $x = 0$ and $x = 1$) and **two** incoming arcs (from the two states
  that differ only in their last bit).
- A state has a **self-loop** (an arc back to itself for some $x$) exactly when $xQ_1\dots Q_{n-1} = Q_1Q_2\dots Q_n$,
  which forces $Q_1 = Q_2 = \dots = Q_n = x$. So **only the all-0 state (with $x = 0$) and the all-1 state (with
  $x = 1$) have self-loops**, for every $n \ge 1$; the other $2^n - 2$ states have none.
- From any state, any target state is reached by **at most $n$ clocks**: just feed the target's bits in, last bit first.
:::

The self-loop argument is worth remembering as a sentence: **a shift register can stay where it is only if
shifting changes nothing, and shifting changes nothing only when every bit is the same as its neighbour.**

:::note{#recap-shift title="Recap" depth="quick"}
D flip-flops in a chain on one clock: $Q_1^+ = SI$, $Q_i^+ = Q_{i-1}$. An $n$-stage SISO delays by $n$ clocks: the
first bit of a word is out after $n$ clocks, the last after $2n - 1$, all gone after $2n$. SIPO and PISO convert
serial ↔ parallel. Self-loops only at 0…0 and 1…1. Always fix the shift direction and the time order of the data first.
:::

### Worked examples: shifting

::::example{#ex-shift-easy level="easy" title="A 4-bit register after three clocks" depth="quick"}
A 4-bit shift-right register holds $Q_1Q_2Q_3Q_4 = 1101$. The serial input receives 1, then 0, then 0. What does
the register hold after each clock, and which bits leave at the serial output?

:::step{why="Each clock slides the row right: the queued bit enters Q1, the old Q4 drops out."}
Clock 1 (input 1): 1101 → 1110; the bit leaving $Q_4$ is 1.
:::

:::step{why="Same slide with the next queued bit."}
Clock 2 (input 0): 1110 → 0111; the 0 that was in $Q_4$ leaves.
:::

:::step{why="And once more."}
Clock 3 (input 0): 0111 → 0011; the 1 that was in $Q_4$ leaves.
:::

:::answer
**0011**, with the bits 1, 0, 1 shifted out in that order. Those are the old $Q_4, Q_3, Q_2$: a shift register empties
itself from the output end. Shifting the other way (input on the right) would give 1100, the trap answer when the figure
is misread.
:::
::::

::::example{#ex-shift-sipo level="medium" title="Serial to parallel: receiving 1011" depth="standard"}
A receiver uses a cleared 4-bit SIPO register (shift right). The transmitter sends the word 1011 least significant bit
first. Show the register after each clock. When can the receiver read the word, and in which order do the parallel
outputs hold its bits?

:::step{why="LSB first means the time order of the bits is the word read from right to left."}
Time order: 1, 1, 0, 1.
:::

:::step{why="Slide each bit into Q1 in turn."}
Clock 1: 1000. Clock 2: 1100. Clock 3: 0110. Clock 4: **1011**.
:::

:::step{why="The first bit sent travels furthest, so it ends at the far end of the chain."}
After clock 4, $Q_4$ holds the first bit sent (the LSB) and $Q_1$ the last (the MSB): reading $Q_1Q_2Q_3Q_4$ gives
the word with its MSB on the left.
:::

:::answer
The word **1011** is available on the parallel outputs after **4 clocks**, with $Q_1$ = MSB and $Q_4$ = LSB. That is
why a receiver that wants the MSB on the left must be sent the LSB first (or must shift the other way). If clock 5
arrives before the receiver reads, the word is already damaged: the LSB falls off and a new bit enters.
:::
::::

::::example{#ex-shift-2018 level="gate" title="Self-loops in the state graph of two D flip-flops (GATE 2018)" depth="standard"}
Two positive-edge D flip-flops are connected in series: the input $in$ drives $D$ of the first, $Q$ of the first drives
$D$ of the second, and $Q$ of the second is the output. How many states of the state transition diagram have a
transition back to the same state for some value of $in$?

:::step{why="Write the state equations of the two stages: a 2-bit shift register."}
State $Q_1Q_2$; next state $Q_1^+Q_2^+ = (in)(Q_1)$.
:::

:::step{why="Tabulate all four states for both inputs (the table-first habit of Lesson 3)."}
00 → 00 (in = 0), 10 (in = 1). 01 → 00, 10. 10 → 01, 11. 11 → 01 (in = 0), 11 (in = 1).
:::

:::step{why="A self-loop needs the next state to equal the present one."}
00 → 00 with in = 0 and 11 → 11 with in = 1 are self-loops. 01 and 10 never map to themselves: the next $Q_2$ is the present
$Q_1$, so a self-loop needs $Q_1 = Q_2$, which 01 and 10 do not have.
:::

:::answer
**2** states (GATE 2018): 00 and 11. The general rule of the state-graph definition gives the same in one line: only
the all-0 and all-1 states can survive a shift unchanged. The usual slip is to count a state as "returning to itself" when it only
gets there after two clocks (01 → 10 → 01 with the inputs 1, 0 is a cycle, not a self-loop), which gives 4.
:::
::::

::::example{#ex-shift-edge level="gate" title="Edge case: clocks to empty a 4-bit SISO" depth="standard"}
A cleared 4-bit SISO register receives a 4-bit word at clocks 1 to 4, followed by zeros. After how many clocks (a)
does the first bit of the word appear at $Q_4$, (b) have all four bits appeared at $Q_4$, (c) is no bit of the word
left in the register? What changes if the word was loaded in parallel instead?

:::step{why="By the delay theorem, bit k of the word is at the output after clock k + n − 1."}
(a) Bit 1: after clock $1 + 4 - 1 = 4$. (b) Bit 4: after clock $4 + 4 - 1 = 7$.
:::

:::step{why="The last bit leaves the register at the next edge after it reached the output."}
(c) At clock 8 the output stage takes the first zero that followed the word: after **8** clocks the word is gone.
:::

:::step{why="A parallel load puts bit 1 at the output already, so only the shifts for the other bits remain."}
Parallel load: bit 1 is at $Q_4$ right after the load; bits 2, 3, 4 need 1, 2, 3 shifts; the word is gone after 4 shifts.
:::

:::answer
**4, 7 and 8** clocks for the serial case ("more than 4" is true, and the exact counts are these); 0, 3 and 4
shifts after a parallel load. The expected wrong answer to (b) is 8, which mixes up "seen at the output" with "shifted out".
:::
::::

## Parallel load and the universal shift register

:::intuition{#load-intuition title="A railway switch in front of every flip-flop" depth="standard"}
A plain shift register has one source for each stage: its left neighbour. To load a word in parallel we need a
**second** source, the data line for that stage, and a way to choose between the two. That is a 2-to-1 multiplexer
([multiplexers](lesson:multiplexers)), and it acts like a railway switch in front of each flip-flop: one control line
throws every switch at once, to "load" or to "shift". Add more tracks (hold, shift the other way) and a bigger switch
(a 4-to-1 MUX), and the same register can do four different things on each clock.
:::

:::definition{#piso term="Parallel-in/serial-out (PISO) register with LOAD/SHIFT′" depth="standard"}
A 3-bit PISO register built from D flip-flops $Q_A, Q_B, Q_C$ (shifting from $A$ towards $C$), with parallel data inputs
$A, B, C$, a serial input $S$ and a control $L = \text{LOAD}/\overline{\text{SHIFT}}$ ($L = 1$: load, $L = 0$: shift), puts a
2-to-1 AND-OR steering network in front of every $D$ input:
$$D_A = L\,A + \overline{L}\,S, \qquad D_B = L\,B + \overline{L}\,Q_A, \qquad D_C = L\,C + \overline{L}\,Q_B.$$
The serial output is $Q_C$. With $L = 1$ one clock edge copies $A, B, C$ into the three stages; with $L = 0$ each edge
shifts the word one place towards $Q_C$ while $S$ enters at $Q_A$. One inverter makes $\overline{L}$ for all three stages,
so the whole steering network is 6 AND gates, 3 OR gates and 1 inverter (or three 2-to-1 MUXes). All three flip-flops share
one clock: the control decides **what** is clocked in, never **when**.
:::

The animation runs the 3-bit PISO: a load of $ABC = 101$, then three shifts with $S = 0, 1, 1$.

:::viz{#piso-load-shift-viz spec="piso-load-shift" mode="animate" depth="standard"}
:::

Notice the order in which the word comes out: $Q_C$ shows $C$ immediately after the load, then $B$ after the first shift,
then $A$ after the second. The bit nearest the output end leaves first. And notice that the serial input keeps flowing in
behind the word: after the third shift the register holds $110$, which is just $S$'s last three values (the first $S$ bit, 0,
has reached $Q_C$). A PISO can therefore be chained: the serial output of one register feeds the serial input of the next,
and the pair behaves as one 6-bit register.

:::definition{#universal-register term="Bidirectional and universal shift registers" depth="standard"}
A **bidirectional** shift register can shift either way: each stage's $D$ input chooses, through a 2-to-1 MUX controlled by
a mode bit, between its left neighbour (shift right, serial input $SI_R$ entering at the left end) and its right neighbour
(shift left, serial input $SI_L$ entering at the right end). Reading the register as a binary number with the MSB on the left,
a shift left with 0 entering **doubles** it and a shift right with 0 entering **halves** it (dropping the remainder).

A 4-bit **universal** shift register puts a **4-to-1 MUX** in front of each stage, with two common select lines $S_1S_0$:

| $S_1S_0$ | Operation | MUX input chosen for stage $Q_i$ |
|:--:|:--|:--|
| 00 | hold (no change) | $Q_i$ itself |
| 01 | shift right | $Q_{i-1}$ (or $SI_R$ for $Q_1$) |
| 10 | shift left | $Q_{i+1}$ (or $SI_L$ for $Q_n$) |
| 11 | parallel load | the data input $I_i$ |

So $D_i = \overline{S_1}\,\overline{S_0}\,Q_i + \overline{S_1}S_0\,Q_{i-1} + S_1\overline{S_0}\,Q_{i+1} + S_1S_0\,I_i$, the
MUX equation of [multiplexers](lesson:multiplexers) with the selects as the address. Notice the **hold** input: a register
with no hold mode would have to stop its clock to keep its contents, and gating a clock is exactly what the synchronous
discipline forbids. With the MUX, the clock keeps ticking and each flip-flop reloads its own value.
:::

A PISO is a universal register that uses only two of the four modes (load and shift right), and a plain shift register uses
one. The universal register is the general case that all the others are drawn from.

:::derivation{#jk-as-d of="a JK stage wired as a D stage" depth="standard"}
Registers are sometimes built from JK flip-flops. Drive a JK stage with $J = x$ and $K = \overline{x}$ (one inverter, or the
true and complement outputs of the previous stage). The JK characteristic equation of [Lesson 2](lesson:flip-flops) gives
$$Q^+ = J\,\overline{Q} + \overline{K}\,Q = x\,\overline{Q} + x\,Q = x.$$
So the stage simply copies $x$: it is a D stage with $D = x$. In a JK shift register each stage has $J_i = Q_{i-1}$ and
$K_i = \overline{Q_{i-1}}$, which is exactly $D_i = Q_{i-1}$.

**Sanity check.** $x = 1$: $J = 1, K = 0$, the "set" row, $Q^+ = 1$. $x = 0$: $J = 0, K = 1$, the "reset" row, $Q^+ = 0$. The
"toggle" and "hold" rows ($J = K$) are never used, so the JK stage can never do anything a D stage would not. Simulating a JK
stage with $J = x$, $K = \overline{x}$ for all four combinations of $x$ and $Q$ gives $Q^+ = x$ every time.
:::

:::note{#recap-load title="Recap" depth="quick"}
A 2-to-1 MUX per stage gives parallel load ($D_i = L\,I_i + \overline{L}\,Q_{i-1}$); a 4-to-1 MUX gives the universal register:
00 hold, 01 right, 10 left, 11 load. The clock stays common; the selects choose what is loaded. A JK stage with $J = x$,
$K = \overline{x}$ is a D stage.
:::

## A RAM that behaves like a shift register

:::intuition{#ram-intuition title="A conveyor belt you never move" depth="standard"}
A 1024-stage shift register moves 1024 bits at every clock. That is a lot of wiring and a lot of flip-flops switching. But
nobody looking only at the two ends can tell whether the bits really move. Imagine a circular shelf of 1024 pigeonholes and a
clerk who walks round it, one pigeonhole per clock: at each hole the clerk first takes out the old letter and hands it to the
outside world, then puts in the new letter that just arrived. A letter put in a hole is taken out again exactly when the clerk
next comes round, 1024 clocks later. From outside, that is a 1024-clock delay line, and the letters never moved at all; only
the clerk did. The clerk is a **counter**, the shelf is a **RAM**.
:::

:::definition{#ram-shift-register term="A 1024-bit serial-in/serial-out register from a 1K × 1 RAM" depth="standard"}
Take a $1\text{K} \times 1$ RAM with data input $D_{in}$, data output $D_{out}$ and a control READ/$\overline{\text{WRITE}}$,
a **10-bit binary counter** (mod-1024) driving its 10 address lines, and a D flip-flop on the RAM's data output. For every
shift clock:

1. **Read**: READ/$\overline{\text{WRITE}} = 1$; the bit $M[\text{ctr}]$ appears on the data output and is clocked into the output
   flip-flop, which is the register's serial output.
2. **Write**: READ/$\overline{\text{WRITE}} = 0$; the serial input bit is written into the same location $M[\text{ctr}]$.
3. **Increment**: the counter advances to the next address (1023 wraps to 0).

The three sub-steps are produced from the shift clock by a small control circuit (for example a 2-bit sequencer, or the two
phases of the clock). The serial input bit written at shift $j$ is read out at shift $j + 1024$, the next time the counter
returns to that address, so the circuit is a SISO register of 1024 bits. (Strictly, the output flip-flop holds the bit that has
just **left** a 1024-stage chain, one clock behind that chain's last stage $Q_{1024}$; by the delay theorem that makes it a 1025-stage
chain if you count the output flip-flop as a stage. Taking $D_{out}$ directly, with the RAM reading the next address between shifts,
gives $Q_{1024}$ itself. Either is accepted as a 1024-bit register.)
:::

Why does this work, and why must the order be read **then** write? The counter visits each address once every 1024 shifts.
Between two visits to address $a$, nothing else touches $M[a]$. So whatever is written into $M[a]$ at shift $j$ is still there
at shift $j + 1024$, and the read that comes **before** the write at that shift hands it to the output just before the new bit
replaces it. Compared with a chain of flip-flops, the bit's **position** in the "register" is now coded by the difference
between the counter and the address where it sits, instead of by which flip-flop holds it.

The check script runs this design against a real 1024-stage `seqlib.shift_right` chain on a random stream of 3000 bits: the
bit that leaves the chain at each clock equals the bit the RAM reads out, every time.

:::aside{#ram-cost title="What the RAM version saves, and what it costs" depth="deep"}
The RAM design replaces 1024 clocked flip-flops with one memory array, a 10-bit counter and a little control: far less hardware
and power, which is how long delay lines (video line buffers, audio echo) are really built. The price is speed (two memory cycles
per shift instead of one flip-flop delay) and the loss of parallel outputs. The same idea, a pointer that moves instead of the data,
is the circular buffer of software queues.
:::

:::note{#recap-ram title="Recap" depth="quick"}
RAM + mod-$2^k$ counter = $2^k$-bit SISO: at each shift read $M[\text{ctr}]$ to the output, write $D_{in}$ there, increment. A bit
written at shift $j$ comes out at shift $j + 1024$. Read before write; the data never moves, the address does.
:::

### Worked examples: designing with registers

::::example{#ex-design-universal level="easy" title="Running a universal register through its modes" depth="quick"}
A 4-bit universal register (00 hold, 01 shift right, 10 shift left, 11 load) holds $Q_1Q_2Q_3Q_4 = 1010$. Apply, one per clock:
shift right with $SI_R = 1$; shift right with $SI_R = 0$; shift left with $SI_L = 1$; hold; load $I = 0110$; shift left with
$SI_L = 0$. What does it hold after each clock?

:::step{why="Shift right: SI_R enters Q1, every bit moves one place right, Q4 drops out."}
01, $SI_R = 1$: 1010 → 1101. 01, $SI_R = 0$: 1101 → 0110.
:::

:::step{why="Shift left: SI_L enters Q4, every bit moves one place left, Q1 drops out."}
10, $SI_L = 1$: 0110 → 1101.
:::

:::step{why="Hold reloads every stage from itself; load copies the data inputs."}
00: 1101 → 1101. 11, $I = 0110$: → 0110.
:::

:::step{why="One more left shift with 0 entering."}
10, $SI_L = 0$: 0110 → 1100.
:::

:::answer
1101, 0110, 1101, 1101, 0110, **1100**. Notice the second and third clocks: shifting right then left does **not** undo the shift,
because the bit that fell off the right end is lost and the left shift brings in a new bit ($SI_L$). The last clock doubles the
number $0110_2 = 6$ to $1100_2 = 12$, as a left shift with 0 entering always does (while no 1 falls off the left end).
:::
::::

::::example{#ex-design-piso level="medium" title="A parallel-in/serial-out register from D flip-flops (GATE 1991)" depth="standard"}
Design a 3-bit parallel-in/serial-out register that shifts from left to right, using D flip-flops and gates, with inputs CLK,
parallel data $A, B, C$, serial input $S$ and control LOAD/$\overline{\text{SHIFT}}$. Then trace it: load $ABC = 101$, and shift
three times with $S = 0, 1, 1$.

:::step{why="Three bits need three D flip-flops; shifting left to right means QA feeds QB and QB feeds QC, with S entering QA."}
Flip-flops $Q_A, Q_B, Q_C$ on the common CLK; serial output $Q_C$.
:::

:::step{why="Each D input must be the data bit when loading and the left neighbour when shifting: a 2-to-1 AND-OR steering pair."}
With $L = $ LOAD/$\overline{\text{SHIFT}}$: $D_A = L\,A + \overline{L}\,S$, $D_B = L\,B + \overline{L}\,Q_A$, $D_C = L\,C + \overline{L}\,Q_B$;
one inverter makes $\overline{L}$.
:::

:::step{why="Trace the next-state equations clock by clock, always from the old values."}
Load ($L = 1$): $Q_AQ_BQ_C = 101$. Shift, $S = 0$: 010. Shift, $S = 1$: 101. Shift, $S = 1$: 110.
:::

:::step{why="The serial output is QC after each clock."}
$Q_C$ = 1 (= C), 0 (= B), 1 (= A), 0 (the first S bit).
:::

:::answer
The design is the three steering equations above (6 ANDs, 3 ORs, 1 inverter, 3 D flip-flops, one clock). The trace gives
$Q_AQ_BQ_C$ = 101, 010, 101, 110 and the serial output **C, B, A** = 1, 0, 1, followed by the serial input. A design that gates the
**clock** with LOAD instead of steering the $D$ inputs breaks the synchronous discipline and is the classic mistake in this question.
:::
::::

::::example{#ex-design-ram level="gate" title="A 1024-bit shift register from a 1K × 1 RAM (GATE 1991)" depth="standard"}
Design a 1024-bit serial-in/serial-out unidirectional shift register using a $1\text{K} \times 1$ RAM with $D_{in}$, $D_{out}$ and
READ/$\overline{\text{WRITE}}$, plus standard SSI/MSI parts. Show that a bit entered at one shift comes out 1024 shifts later.

:::step{why="Every location must be visited once per 1024 shifts, in a fixed order: a mod-1024 counter on the address lines."}
A 10-bit binary counter (1024 = $2^{10}$ states) drives the address $A_9 \dots A_0$.
:::

:::step{why="The old bit at the current address must leave before the new bit overwrites it."}
At each shift clock: READ/$\overline{\text{WRITE}} = 1$ and clock $M[\text{ctr}]$ into a D flip-flop whose $Q$ is the serial output;
then READ/$\overline{\text{WRITE}} = 0$ to write $D_{in}$ into $M[\text{ctr}]$; then increment the counter. A 2-bit sequencer (or the two
clock phases) generates the read, write and count pulses.
:::

:::step{why="Track one bit: nothing else writes its location until the counter returns."}
A bit written at shift $j$ into address $a = j \bmod 1024$ stays untouched while the counter visits the other 1023 addresses, and is
read at shift $j + 1024$, when the counter is back at $a$, just before being overwritten.
:::

:::answer
Counter-addressed RAM, **read, then write, then increment** at every shift: the output is the input delayed by **1024 shifts**. The
simulation agrees, bit for bit, with the bit that **leaves** a 1024-flip-flop chain at each clock (the output flip-flop is the one
extra stage, as the definition explains). The design uses 1 RAM, 1 counter, 1 output flip-flop and a little control,
instead of 1024 flip-flops.
:::
::::

::::example{#ex-design-edge level="gate" title="Edge case: write before read" depth="standard"}
In the RAM register of the previous example, a student swaps the first two sub-steps: at each shift the input is **written** into
$M[\text{ctr}]$ first and the same location is **read** afterwards. What does the circuit do now?

:::step{why="Follow the bit at one shift: it is written, then the same address is read at once."}
At shift $j$, $M[\text{ctr}] \leftarrow D_{in}$, then the read returns $M[\text{ctr}]$, which is the bit just written.
:::

:::step{why="The old content of the location is overwritten before anyone reads it."}
The bit stored 1024 shifts ago is destroyed unread; the output is always the current input.
:::

:::answer
The "1024-bit register" becomes a **wire** (a delay of 0 shifts, or 1 if you count the output flip-flop): the simulation's output stream
equals its input stream. The order of the sub-steps is the whole design; the counter and the RAM only provide the storage. Notice
that a chain of D flip-flops never has this problem, because all of its stages sample the **old** values at the same edge.
:::
::::

## Ring counters

:::intuition{#ring-intuition title="A single token passed round a table" depth="standard"}
Seat four people round a table and give one of them a token. At every whistle, whoever holds the token passes it to the left.
The token visits every seat in turn and comes back after four whistles. If you want to know "which quarter of the cycle are we
in", you need no arithmetic: just look at who holds the token. Join the two ends of a shift register and load a single 1, and you
have built this table.
:::

:::definition{#ring-counter term="Ring counter" depth="standard"}
An $n$-bit **ring counter** is a shift register whose serial output is fed back to its serial input: $D_1 = Q_n$,
$D_i = Q_{i-1}$. Started with exactly one 1 (for example $10\dots0$, set by a preset on $Q_1$ and a clear on the others), the 1
circulates one place per clock:
$$1000 \to 0100 \to 0010 \to 0001 \to 1000 \quad (n = 4).$$

- It has **n states** in its cycle: a mod-$n$ counter from $n$ flip-flops. The states are the **one-hot** code of
  [Lesson 4](lesson:ripple-counters), so each state is recognised by a single output, with no decoding gates at all.
- Each output is 1 for one clock period out of $n$: a waveform with duty cycle $1/n$, shifted by one period from its neighbour (a
  set of non-overlapping **timing signals**, the classic way to sequence the steps of a controller).
- The ring map only rotates the bits, so the number of 1s never changes. Of the $2^n$ patterns, only the $n$ with a single 1 are on the
  intended cycle; 0…0 and 1…1 are fixed points, and the other patterns rotate on their own cycles. **A plain ring counter is not
  self-starting**: it must be initialised.
:::

:::trap{#trap-ring-sync title="Ring and Johnson counters are synchronous counters" depth="standard"}
The expected wrong answer is "asynchronous": ring and Johnson counters are easy to file next to ripple counters, because the data
visibly passes from one flip-flop to the next. They are **synchronous**: every flip-flop receives the **same clock**, and the stages are linked only through their $D$ (or $J$/$K$) inputs.
The data passes from stage to stage, but the clock does not. Compare [Lesson 4](lesson:ripple-counters), where the output of one
stage **is** the clock of the next. As a consequence a ring counter changes all its outputs one $t_{pd}$ after the edge, with no
transient states, which is exactly why its outputs can be used as glitch-free timing signals.
:::

A plain ring counter that powers up in the wrong pattern stays wrong forever (rotating 1100, say, or stuck at 0000). The standard
repair replaces the feedback by a gate that inserts a 1 only when every stage except the last is 0.

:::aside{#ring-self-start title="A self-starting ring counter" depth="deep"}
In a 4-bit ring counter, replace $D_1 = Q_4$ by $D_1 = \overline{Q_1 + Q_2 + Q_3}$ (a NOR of every output except the last). On the
correct cycle this gives the same result: in 0001 the NOR is 1 and in 1000, 0100 and 0010 it is 0. From any other state, the
NOR keeps feeding 0s while there is a 1 among the first three stages, which pushes the extra 1s off the end, and feeds a 1 as soon as
they are all 0. Simulating all 16 start states, every one enters the cycle 1000 → 0100 → 0010 → 0001 within **3** clocks (the worst
are 1100, 1101, 1110 and 1111). For 3 bits the gate is $\overline{Q_1 + Q_2}$ and the worst case is 2 clocks.
:::

GATE 2014 asked about a circuit that behaves like a ring counter without being built as one.

:::definition{#counter-decoder-ring term="A counter plus a decoder is a ring counter" depth="standard"}
Feed the outputs of an $n$-bit binary counter into an $n$-to-$2^n$ decoder ([decoders](lesson:decoders-encoders)). In counter state
$c$ exactly one decoder output, line $c$, is 1. At the next clock the counter goes to $c + 1$ (mod $2^n$), so the 1 moves to line
$c + 1$; after line $2^n - 1$ it returns to line 0. The $k = 2^n$ decoder outputs therefore show exactly the sequence of a **$k$-bit
ring counter**: one 1 circulating through $k$ positions, one per clock. The circuit uses only $n$ flip-flops instead of $k$, at the
price of the decoder (and of decoding glitches if the counter is a ripple counter, [Lesson 4](lesson:ripple-counters)).
:::

:::note{#recap-ring title="Recap" depth="quick"}
Ring counter: $D_1 = Q_n$, one 1 circulating; $n$ flip-flops, $n$ states (one-hot), duty $1/n$, no decoding. Synchronous (one clock).
Not self-starting; a NOR of the first $n - 1$ outputs as feedback (or a preset) cures it. Counter + decoder: $n$ flip-flops behave like a $2^n$-bit ring.
:::

## Johnson (twisted-ring) counters

:::intuition{#johnson-intuition title="Fill the line with 1s, then empty it" depth="standard"}
Change one wire of the ring counter: feed back the **complement** of the last stage instead of the stage itself. Start from all 0s.
The last stage is 0, so a 1 is fed in; the 1s march in from the left until the register is full of 1s. Now the last stage is 1, so
0s are fed in, and they march in until the register is empty again. One round trip takes $n$ clocks to fill and $n$ to empty: $2n$
states from $n$ flip-flops, twice as many as the ring counter, for the price of nothing (the complement output $\overline{Q}$ is free
on every flip-flop).
:::

:::definition{#johnson term="Johnson (twisted-ring, switch-tail) counter" depth="standard"}
An $n$-bit **Johnson counter** is a shift register with the **complement** of its last output fed back: $D_1 = \overline{Q_n}$,
$D_i = Q_{i-1}$. Started at 0…0 (a common clear), the 4-bit counter steps through
$$0000 \to 1000 \to 1100 \to 1110 \to 1111 \to 0111 \to 0011 \to 0001 \to 0000,$$
which, read with $Q_1$ as the most significant bit, is 0, 8, 12, 14, 15, 7, 3, 1.

- It is a **mod-2n** counter from $n$ flip-flops: $2n$ states. Conversely, a mod-$N$ Johnson counter ($N$ even) needs $N/2$ flip-flops.
- Between consecutive states exactly **one bit** changes (like a Gray code, [codes](lesson:codes)), so decoding has no hazards.
- Every output is a square wave with **50% duty cycle** and period $2n$ clocks, each delayed by one clock from its neighbour: a
  Johnson counter is also a divide-by-$2n$ and a multi-phase clock generator.
:::

:::trick{#trick-johnson-decode title="One 2-input AND per Johnson state" depth="standard"}
Every main-cycle state of a Johnson counter (with $n \ge 2$) has a unique "boundary" between its 1s and its 0s (or, for 0…0 and 1…1,
between the two ends). A 2-input AND of the two bits that sit on either side of that boundary recognises the state. For 4 bits:

| State | 0000 | 1000 | 1100 | 1110 | 1111 | 0111 | 0011 | 0001 |
|:--|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Gate | $\overline{Q_1}\,\overline{Q_4}$ | $Q_1\overline{Q_2}$ | $Q_2\overline{Q_3}$ | $Q_3\overline{Q_4}$ | $Q_1Q_4$ | $\overline{Q_1}Q_2$ | $\overline{Q_2}Q_3$ | $\overline{Q_3}Q_4$ |

Each of these eight gates is 1 in exactly one of the eight cycle states (the check script evaluates all eight gates on all eight cycle states). **Why it works:**
the cycle states are "1s then 0s" or "0s then 1s", and the boundary position plus its direction identifies the state; two adjacent
bits are enough to see both. **When it fails:** on the unused states: $Q_1\overline{Q_2}$ is also 1 in 1001, 1010 and 1011, so if the
counter ever strays off its cycle, several gates fire at once. A binary counter needs an $n$-input gate per state instead.
:::

The Johnson counter's 2N states are the good news. The bad news is the other $2^n - 2n$ patterns, and the theorem says what they do.

:::theorem{#johnson-theorem name="The cycles of a Johnson counter" depth="standard"}
Started at 0…0, an $n$-bit Johnson counter visits exactly $2n$ distinct states before returning to 0…0. Every one of the other
$2^n - 2n$ states lies on some **other** cycle, which never meets the main one. Hence for $n \ge 3$ (where $2^n > 2n$) the
Johnson counter is **not self-starting**: if it powers up in an unused state, it counts forever in the wrong cycle.
:::

:::proof{#proof-johnson-theorem of="the Johnson-counter cycles" depth="standard"}
**Idea first:** count the states on the main cycle directly; then show the next-state map can be run backwards, so no state can
"drain into" a cycle from outside.

*The main cycle.* From 0…0 the fed-back bit $\overline{Q_n}$ is 1 for as long as the 1s have not reached $Q_n$: after $k$ clocks
($k = 0, \dots, n$) the register holds $1^k0^{n-k}$ (k ones, then zeros). At $k = n$ it is 1…1, so now 0s are fed back: after
$n + k$ clocks it holds $0^k1^{n-k}$, and after $2n$ clocks it is 0…0 again. The patterns $1^k0^{n-k}$ ($k = 0 \dots n$) and $0^k1^{n-k}$
($k = 1 \dots n - 1$) are all different, and there are $(n + 1) + (n - 1) = 2n$ of them.

*No state drains into the cycle.* The map is invertible: from the next state $(Q_1^+, \dots, Q_n^+)$ the previous state is
$(Q_2^+, \dots, Q_n^+, \overline{Q_1^+})$, because $Q_i = Q_{i+1}^+$ and $Q_n = \overline{Q_1^+}$. An invertible map on a finite set is a
permutation, and a permutation splits the states into disjoint cycles: every state lies on exactly one cycle and has exactly one
predecessor. A state off the main cycle can therefore never reach it (its successors stay on its own cycle). For $n \ge 3$,
$2^n - 2n > 0$, so such states exist. ∎

**Check by simulation.** `seqlib.autonomous_cycles` with `johnson_step` finds the cycle lengths 4 for $n = 2$ (self-starting), 6 + 2
for $n = 3$, 8 + 8 for $n = 4$, 10 + 10 + 10 + 2 for $n = 5$ and 12 × 5 + 4 for $n = 6$: always one main cycle of $2n$ and the
remaining $2^n - 2n$ states on other cycles.
:::

The animation runs a 4-bit ring counter (from 1000) and a 4-bit Johnson counter (from 0000) side by side on the same clock.

:::viz{#ring-johnson-cycles-viz spec="ring-johnson-cycles" mode="animate" depth="standard"}
:::

Notice that the two circuits differ by one inverter, and that at clock 4 the ring counter is back at its start while the Johnson
counter has only just filled with 1s. For $n = 4$ the Johnson counter's unused states form a second cycle of exactly 8, 0010 → 1001 → 0100 → 1010 → 1101 → 0110 → 1011 → 0101 → 0010.
[Lesson 3](lesson:sequential-analysis) traced the 3-bit case, where the leftovers are the 2-cycle 010 ↔ 101.

:::trap{#trap-johnson-count title="Counting the states of a Johnson counter (and counting them once)" depth="standard"}
Two different slips cost marks on Johnson counters.

1. **The size.** An $N$-flip-flop Johnson counter has **2N** states, so a mod-$2N$ counter needs $N$ flip-flops (and a mod-10 Johnson
   counter needs 5, not 10). It is easy to give a Johnson counter the ring counter's count; the ring counter is the one with $N$ states. The expected wrong answers are $N$ (ring), $2^N$ (binary) and $2^N - 1$ (LFSR).
2. **"How many states before returning?"** GATE 2025 asked for the number of distinct states a 4-bit Johnson counter "will go through
   before returning back to the initial state". The cycle has 8 states. If you count the initial state as one of those it goes through,
   the answer is **8**; if you count only the states after it, **7**. The official key accepts **7 to 8** for exactly this reason.

And a third, subtler point from the same question: the circuit is "initialized with some value", not necessarily 0000. That does not change
the answer, because for $n = 4$ **both** cycles have 8 states: from any start the counter returns after 8 clocks. For $n = 5$ it would matter
(cycles of 10 and 2).
:::

GATE 1993 drew the Johnson counter with JK flip-flops, which is where the "JK stage as a D stage" derivation pays off.

:::definition{#johnson-jk term="The Johnson counter built from JK flip-flops" depth="standard"}
A Johnson counter can be built with JK stages: stage $i \ge 2$ has $J_i = Q_{i-1}$ and $K_i = \overline{Q_{i-1}}$, and the first stage has
$J_1 = \overline{Q_n}$ and $K_1 = Q_n$ (the last stage's outputs crossed over). Each stage has $K = \overline{J}$, so it is a D stage
with $D = J$: $Q_i^+ = Q_{i-1}$ and $Q_1^+ = \overline{Q_n}$. With 3 stages from 000 it counts
$$000 \to 100 \to 110 \to 111 \to 011 \to 001 \to 000,$$
a **mod-6** counter, and the two leftover states 010 and 101 swap with each other on their own cycle. The arrangement is a shift register
(each stage copies the previous one) **and** a counter: the twisted feedback is what turns the shift register into a counter.
If the cross-over at the first stage is undone ($J_1 = Q_n$, $K_1 = \overline{Q_n}$), the same chain is a ring counter instead.
:::

:::note{#recap-johnson title="Recap" depth="quick"}
Johnson: $D_1 = \overline{Q_n}$; $n$ flip-flops, $2n$ states (fill with 1s, then with 0s), one bit changes per clock, 50% duty outputs,
one 2-input AND per state. The map is a permutation, so the other $2^n - 2n$ states form other cycles: not self-starting for $n \ge 3$.
"States before returning": 2n counting the start, 2n − 1 without it.
:::

### Worked examples: ring and Johnson counters

::::example{#ex-ring-easy level="easy" title="A 4-bit ring counter from 1000" depth="quick"}
A 4-bit ring counter ($D_1 = Q_4$, $D_i = Q_{i-1}$) is preset to 1000. List its states for five clocks. What is its modulus, and what
would it do if it powered up in 1100?

:::step{why="The ring map rotates the row one place right, the last bit wrapping to the front."}
1000 → 0100 → 0010 → 0001 → 1000 → 0100.
:::

:::step{why="The first repeat closes the cycle."}
The state 1000 recurs after 4 clocks: mod-4.
:::

:::step{why="Rotation keeps the number of 1s, so a two-1 pattern can never become a one-1 pattern."}
From 1100: 1100 → 0110 → 0011 → 1001 → 1100, another 4-state cycle.
:::

:::answer
States 0100, 0010, 0001, 1000, 0100: a **mod-4** counter from 4 flip-flops. Started in 1100 it also has period 4, but two lines are high
at once, so anything reading "which stage is 1" is wrong forever. Hence the preset, or the self-starting NOR feedback.
:::
::::

::::example{#ex-johnson-2015 level="medium" title="The counting sequence of a 4-bit Johnson counter (GATE 2015)" depth="standard"}
A 4-bit Johnson counter starts at 0000. Give its counting sequence as decimal numbers.

:::step{why="A Johnson counter feeds the complement of the last stage into the first and shifts."}
$Q_1^+ = \overline{Q_4}$, $Q_{i}^+ = Q_{i-1}$.
:::

:::step{why="Fill with 1s from the left, then with 0s."}
0000 → 1000 → 1100 → 1110 → 1111 → 0111 → 0011 → 0001 → 0000.
:::

:::step{why="Read each state with the first stage as the most significant bit."}
0, 8, 12, 14, 15, 7, 3, 1, 0.
:::

:::answer
**0, 8, 12, 14, 15, 7, 3, 1, 0** (GATE 2015, option D). Option A, 0, 1, 3, 7, 15, 14, 12, 8, 0, is the same counter **shifting the other
way** (1s entering at the least significant end); it is a Johnson sequence too, and the key follows the standard drawing, which shifts
right from the most significant stage. Options B and C are not shift sequences at all: B steps 3 → 5 (011 → 101) and C steps 2 → 4
(0010 → 0100), and each of those changes two bits, which a Johnson counter never does in one clock. B also has 9 states and C has 8 states
of which none is 1111.
:::
::::

::::example{#ex-johnson-2025 level="gate" title="States before returning to the start (GATE 2025)" depth="standard"}
Four D flip-flops on a common clock: $Q_0 \to D_1$, $Q_1 \to D_2$, $Q_2 \to D_3$ and $\overline{Q_3} \to D_0$. The circuit is initialised
with some value. How many distinct states does it go through before returning to the initial state?

:::step{why="Recognise the wiring: a shift register with the complement of the last stage fed back."}
A 4-bit Johnson counter.
:::

:::step{why="Its cycle from 0000 has 2n states."}
0000 → 1000 → 1100 → 1110 → 1111 → 0111 → 0011 → 0001 → 0000: 8 states.
:::

:::step{why="The start is 'some value', so check every cycle, not only the main one."}
The other 8 states form one cycle too: 0010 → 1001 → 0100 → 1010 → 1101 → 0110 → 1011 → 0101 → 0010. Every start returns after 8 clocks.
:::

:::answer
**8** if the initial state is counted, **7** if only the states after it are (the key range is **7 to 8**). Notice that the question was
safe only because both cycles of the 4-bit counter have length 8; with 5 flip-flops a start in 01010 would return after 2.
:::
::::

::::example{#ex-johnson-1993 level="gate" title="Three JK flip-flops in a twisted ring (GATE 1993)" depth="standard"}
Three JK flip-flops share a clock. FF1's $Q$ and $\overline{Q}$ drive $J$ and $K$ of FF2; FF2's drive $J$ and $K$ of FF3; FF3's
$\overline{Q}$ drives $J$ of FF1 and its $Q$ drives $K$ of FF1. From 000, what function does the arrangement perform: shift register,
mod-3, mod-6 or mod-2 counter?

:::step{why="Each stage has K equal to the complement of J, so it copies J (the JK-as-D derivation)."}
$Q_2^+ = Q_1$, $Q_3^+ = Q_2$, and $Q_1^+ = J_1 = \overline{Q_3}$.
:::

:::step{why="Trace from 000."}
000 → 100 → 110 → 111 → 011 → 001 → 000.
:::

:::step{why="Name what the structure and the sequence show."}
Six states: a mod-6 (Johnson) counter. Structurally, every stage copies its neighbour: a shift register with twisted feedback.
:::

:::answer
**Mod-6 counter** (option c) and **shift register** (option a); the key is (a) and (c). A strict reading would give only (c), the function
the circuit performs from 000. (a) is accepted because the arrangement **is** a shift register (a twisted-ring shift register), the
shift-register counter of this section. Mod-3 would need a 3-stage ring counter; mod-2 is the 2-cycle 010 ↔ 101, which needs a different
start state.
:::
::::

::::example{#ex-ring-2014 level="gate" title="A binary counter followed by a decoder (GATE 2014)" depth="standard"}
Let $k = 2^n$. The outputs of an $n$-bit binary counter drive an $n$-to-$2^n$ decoder. The circuit is equivalent to a $k$-bit binary up counter,
a $k$-bit binary down counter, a $k$-bit ring counter or a $k$-bit Johnson counter?

:::step{why="A decoder makes exactly one output line 1: the line whose number is the counter value."}
In counter state $c$, line $c$ is 1 and the other $k - 1$ lines are 0.
:::

:::step{why="Each clock adds 1 to c, wrapping at 2^n."}
The 1 moves from line $c$ to line $c + 1$, and from line $k - 1$ back to line 0. Take $n = 2$: 1000 → 0100 → 0010 → 0001 → 1000.
:::

:::step{why="Compare with the ring and Johnson sequences of k bits."}
One 1 circulating through $k$ positions is the $k$-bit ring counter's sequence; a $k$-bit Johnson counter would have $2k$ states with
runs of 1s, and a $k$-bit binary counter $2^k$ states.
:::

:::answer
A **$k$-bit ring counter** (GATE 2014, option C). It uses $n = \log_2 k$ flip-flops instead of $k$, and the decoder does the job of the
one-hot code.
:::
::::

::::example{#ex-johnson-edge level="gate" title="Edge case: a Johnson counter that powers up in 0100" depth="standard"}
A 4-bit Johnson counter powers up in 0100. List its states. Will it ever reach 0000? Which of the eight decoding gates fire?

:::step{why="Apply the Johnson step to the actual start state."}
0100 → 1010 → 1101 → 0110 → 1011 → 0101 → 0010 → 1001 → 0100.
:::

:::step{why="The map is a permutation, so this 8-cycle is closed: it never meets the main cycle."}
It never reaches 0000 (or any other main-cycle state).
:::

:::step{why="Check the 2-input decoding gates on a stray state, for example 1010."}
In 1010: $Q_1\overline{Q_2} = 1$ (decodes "1000"), $Q_3\overline{Q_4} = 1$ (decodes "1110"), $\overline{Q_2}Q_3 = 1$ (decodes "0011"): three gates at once.
:::

:::answer
It cycles through the 8 **unused** states forever and never reaches 0000; the decoding gates misfire, several at a time. A Johnson counter
must be cleared at power-up, or given a correcting feedback: for 4 bits, $D_3 = Q_2(Q_1 + Q_3)$ in place of $D_3 = Q_2$ agrees with
$Q_2$ on all eight cycle states and steers every stray state into the main cycle (the self-start check of
[Lesson 5](lesson:synchronous-counter-design), run on all 16 states, confirms it; the worst stray state needs 5 clocks).
:::
::::

## Shift registers with feedback logic and LFSRs

:::intuition{#feedback-intuition title="A recipe that writes its own next line" depth="standard"}
Ring and Johnson counters feed back one wire. Nothing stops us from feeding back **any** function of the stages: the register then
remembers the last $n$ bits it produced and computes the next bit from them. The register becomes a little machine that writes a long
sequence one bit at a time, each bit determined by the $n$ before it. With an XOR as the function the machine has a beautiful property:
for the right choice of inputs to the XOR, the sequence runs through every non-zero pattern before repeating, which makes it look random.
:::

:::definition{#feedback-shift term="Shift register with feedback logic" depth="standard"}
A **feedback shift register** is a shift register whose serial input is a combinational function of its own stages (and possibly an
external input): $D_1 = f(Q_1, \dots, Q_n, x)$, $D_i = Q_{i-1}$. Ring ($f = Q_n$) and Johnson ($f = \overline{Q_n}$) counters are the
simplest cases. Analysing one is the procedure of [Lesson 3](lesson:sequential-analysis): compute $f$ from the **old** state, then shift.
Gates may also sit **inside** the chain (for example $D_2 = Q_1 \oplus Q_3$); then that stage is computed from the old state too.

Traced as a number, a register that shifts towards its most significant bit doubles the value and adds the new bit:
$\text{next} = (2v \bmod 2^n) + f$. That one line answers most "state sequence" questions without drawing the register.
:::

:::definition{#lfsr term="Linear feedback shift register (LFSR)" depth="standard"}
An **LFSR** is a feedback shift register whose feedback is the XOR of some chosen stages, the **taps**:
$D_1 = Q_{t_1} \oplus Q_{t_2} \oplus \dots$ (and, with a serial input, $\oplus\, x$). Because XOR of zeros is 0, the all-zero state maps to
itself. With well-chosen taps, an $n$-bit LFSR started in any non-zero state runs through **all $2^n - 1$ non-zero states** before repeating:
a **maximal-length** LFSR. For 3 bits the taps $Q_2, Q_3$ work ($D_1 = Q_2 \oplus Q_3$, 7 states); for 4 bits $Q_3, Q_4$ work
($D_1 = Q_3 \oplus Q_4$, 15 states). The serial output of a maximal LFSR is a **pseudo-random** bit sequence of period $2^n - 1$, used for
test patterns, scramblers, and in the CRC circuits that check data on disks and networks.
:::

:::theorem{#lfsr-max name="An n-bit LFSR has at most 2ⁿ − 1 states in a non-zero cycle" depth="standard"}
In an $n$-bit LFSR whose last stage $Q_n$ is one of the taps, the all-zero state is a fixed point ($0\dots0 \to 0\dots0$), no non-zero
state ever reaches 0…0, and so every cycle through a non-zero state has at most $2^n - 1$ states. A maximal-length LFSR reaches that bound.
:::

:::proof{#proof-lfsr-max of="the LFSR bound" depth="standard"}
**Idea first:** zero is a dead end you can neither leave nor enter, so the non-zero states have to share the cycle among themselves.

*Zero is fixed.* In 0…0 every tap is 0, so $D_1 = 0$, and every other stage copies a 0: the next state is 0…0.

*The map is invertible.* Given the next state $(Q_1^+, \dots, Q_n^+)$, the old $Q_1 \dots Q_{n-1}$ are $Q_2^+ \dots Q_n^+$, and since
$Q_1^+ = Q_n \oplus (\text{XOR of the other taps})$ with the other taps among $Q_1 \dots Q_{n-1}$, the old $Q_n$ is
$Q_1^+ \oplus (\text{XOR of the other taps})$. So each state has exactly one predecessor.

*Nothing enters zero.* Zero's only predecessor is zero itself (it is a fixed point and predecessors are unique), so a non-zero state never
maps to 0…0. Every non-zero state therefore lies on a cycle made only of non-zero states, and there are $2^n - 1$ of those. ∎

**Check by simulation.** For 4 bits, the taps $\{Q_3, Q_4\}$ and $\{Q_1, Q_4\}$ give one cycle of 15 plus the fixed point 0000; $\{Q_2, Q_4\}$ gives
cycles of 6, 6 and 3; all four taps give 5, 5, 5 (each plus the fixed point 0000). The bound is always met or undercut, never exceeded.
:::

The animation runs the GATE 2001 circuit: three D flip-flops in a chain $Q_0 \to Q_1 \to Q_2$ with $D_0 = Q_1 \oplus Q_2$, which is the
3-bit maximal-length LFSR drawn with the bits numbered from the input end.

:::viz{#lfsr-feedback-viz spec="lfsr-feedback" mode="animate" depth="standard"}
:::

:::trap{#trap-lfsr-zero title="An LFSR at 0…0 is stuck" depth="standard"}
Every state of a maximal LFSR is on its one big cycle **except 0…0**, which is a cycle of length 1 on its own. If the register is cleared
at power-up (a natural thing to do for every other register in this lesson) the LFSR never leaves 0…0 and produces a constant 0. That is why
LFSRs are **seeded** with a non-zero value, and why "how many states does a 4-bit maximal LFSR go through" is **15**, not 16. The expected
wrong answers are 16 (all states) and, after clearing it, "15" when the true answer from 0000 is **1**. ([Lesson 3](lesson:sequential-analysis)
met the same self-loop in the 1996 circuit.)
:::

:::definition{#lfsr-input term="An LFSR with a serial input" depth="standard"}
If an external input $x$ is XORed into the feedback, $D_1 = x \oplus (\text{taps})$, the register no longer runs on its own: its state after
a string of inputs depends on the whole string. This is a close relative of the circuit that computes a **CRC**: a CRC divider uses the
same parts, but puts the XORs **inside** the chain, at the generator polynomial's taps, and after the message has been shifted in that register
holds the remainder (the check bits). The plain version here, with the input XORed into the feedback at the front, is the scrambler form: its
register holds the last $n$ bits of the fed-back stream, not the remainder. In GATE IT 2007 the register holds
0110, the single tap is the last stage, and each clock does $Q_1^+ = x \oplus Q_4$ and shifts right. The trace is the same slide as before,
with one XOR computed from the old row first.
:::

:::aside{#sequence-generator title="Shift-register sequence generators" depth="deep"}
To make a circuit that outputs a given periodic bit sequence, use a shift register as the memory of the last $n$ output bits and choose its
feedback so that each window of $n$ bits produces the next bit. This works when the $n$-bit windows of the cyclic sequence are all
**different** (otherwise one window would need two different next bits). A sequence of period $N$ therefore needs at least
$\lceil \log_2 N \rceil$ stages, and often more. For the period-7 sequence 1011100 the 2-bit windows repeat (11 appears twice) but the
3-bit windows 101, 011, 111, 110, 100, 001, 010 are all different, so 3 stages suffice. In fact no logic design is needed: the 3-bit maximal
LFSR with $D_1 = Q_2 \oplus Q_3$, seeded with 101, emits exactly 1011100 at its serial output, again and again.
:::

:::note{#recap-feedback title="Recap" depth="quick"}
Feedback shift register: $D_1 = f(\text{state}, x)$, everything else shifts; compute $f$ from the old state. LFSR: $f$ is an XOR of taps;
0…0 is a fixed point; at most $2^n - 1$ states per cycle, exactly that for maximal taps. Seed it non-zero. With a serial input XORed in, its
state depends on the whole input string (a CRC divider is the same idea with the XORs inside the chain).
:::

### Worked examples: feedback registers

::::example{#ex-lfsr-easy level="easy" title="A 4-bit maximal-length LFSR" depth="quick"}
A 4-bit LFSR shifts right with $D_1 = Q_3 \oplus Q_4$. Starting from 1000, list its first five states and find its period.

:::step{why="Compute the feedback from the old Q3 and Q4, then slide the row right."}
1000: $0 \oplus 0 = 0$ → 0100. 0100: $0 \oplus 0 = 0$ → 0010. 0010: $1 \oplus 0 = 1$ → 1001. 1001: $0 \oplus 1 = 1$ → 1100.
:::

:::step{why="Keep going until 1000 returns (the check script does all of it)."}
… 0110, 1011, 0101, 1010, 1101, 1110, 1111, 0111, 0011, 0001, and then back to 1000.
:::

:::answer
1000, 0100, 0010, 1001, 1100, …, with period **15**: every non-zero 4-bit state appears once. 0000 is the one state missing, the fixed point
of the trap above.
:::
::::

::::example{#ex-fb-2001 level="medium" title="XOR feedback into the first stage (GATE 2001)" depth="standard"}
Three D flip-flops form a chain $Q_0 \to D_1$, $Q_1 \to D_2$, and an XOR of $Q_1$ and $Q_2$ drives $D_0$. Initially $Q_0 = 1$,
$Q_1 = Q_2 = 0$. The state is $4Q_2 + 2Q_1 + Q_0$. Which is the state sequence?

:::step{why="Write the next-state equations: the bits move towards Q2, the most significant bit."}
$Q_0^+ = Q_1 \oplus Q_2$, $Q_1^+ = Q_0$, $Q_2^+ = Q_1$. As a number: $v^+ = (2v \bmod 8) + (Q_1 \oplus Q_2)$.
:::

:::step{why="Apply it from v = 1, reading Q1 and Q2 from the old value each time."}
1 (001): feedback 0 → 2. 2 (010): $1 \oplus 0 = 1$ → 5. 5 (101): $0 \oplus 1 = 1$ → 3. 3 (011): $1 \oplus 0 = 1$ → 7.
:::

:::step{why="Continue until the start returns."}
7 (111): $1 \oplus 1 = 0$ → 6. 6 (110): $1 \oplus 1 = 0$ → 4. 4 (100): $0 \oplus 1 = 1$ → 1.
:::

:::answer
**1, 2, 5, 3, 7, 6, 4** (GATE 2001, option B), and then 1 again: all seven non-zero states, a maximal-length LFSR. A ten-second elimination
needs no XOR at all: every next state must be $2v \bmod 8$ or one more. Option D fails at once (1 → 6), option A at 3 → 4 (from 3 only 6 or 7
are possible) and option C at 2 → 7 (from 2 only 4 or 5).
:::
::::

::::example{#ex-fb-2006 level="gate" title="An XOR inside the chain and a data stream (GATE 2006)" depth="standard"}
Three cleared D flip-flops: $q_0$ takes the input $data$, $q_1$ takes $q_0 \oplus q_2$, and $q_2$ takes $q_1$. The data 100110000 is supplied in
nine clock cycles. What is $q_2q_1q_0$ afterwards?

:::step{why="Fix the time order first: the string is written in the order the bits are supplied."}
Inputs, clock 1 to 9: 1, 0, 0, 1, 1, 0, 0, 0, 0.
:::

:::step{why="Every flip-flop uses the old values: q0+ = data, q1+ = q0 XOR q2, q2+ = q1."}
000 → 001 → 010 → 100 → 011 → 111 (after clock 5).
:::

:::step{why="Four zeros remain; the zero-input behaviour of 100 and 010 decides the end."}
111 → 100 → 010 → 100 → 010. With data 0, the states 100 and 010 swap at every clock.
:::

:::answer
**010** (GATE 2006, option C). The tail is the insight: with the input at 0, the states 100 and 010 swap at every clock. The first of the four
trailing zeros takes 111 to 100, and the other three swap it three times, an odd number, so the register ends at 010. Feeding the string last
bit first gives 111, which is not even an option: the trap on data order in action.
:::
::::

::::example{#ex-fb-it2007 level="gate" title="An LFSR with a serial input (GATE IT 2007)" depth="standard"}
A 4-cell register holds 0110. Each clock, the XOR of the serial input and the rightmost cell enters the leftmost cell and the register shifts right.
The input is 101101. What is the final value in the register?

:::step{why="New left bit = input XOR the old rightmost bit; then slide."}
0110, in 1: $1 \oplus 0 = 1$ → 1011. In 0: $0 \oplus 1 = 1$ → 1101. In 1: $1 \oplus 1 = 0$ → 0110.
:::

:::step{why="The register is back at its start, and the remaining input 101 is the same as the first three bits."}
Inputs 4 to 6 are 1, 0, 1 again, so the same three steps repeat: 0110 → 1011 → 1101 → 0110.
:::

:::answer
**0110** (GATE IT 2007, option A). After three inputs (1, 0, 1) the register returns to 0110, and the last three inputs are again 1, 0, 1, so it
returns again. Notice that 101101 reads the same in both directions, so this question, unlike GATE 2006, cannot be spoiled by the time order.
:::
::::

::::example{#ex-fb-edge level="gate" title="Edge case: an LFSR cleared at power-up" depth="standard"}
The 3-bit LFSR of GATE 2001 ($D_0 = Q_1 \oplus Q_2$) is given a common clear and powers up at 000. What sequence does it produce? What is the smallest
change to the wiring that guarantees it leaves 000?

:::step{why="Compute the feedback in 000."}
$Q_1 \oplus Q_2 = 0 \oplus 0 = 0$, so $Q_0^+ = 0$ and the shift moves zeros: 000 → 000.
:::

:::step{why="Zero has no successor but itself, and (by the LFSR theorem) no other state leads into it."}
The register stays at 000 forever: a cycle of length 1.
:::

:::step{why="Make the feedback 1 when the register is all 0, without disturbing the other states."}
Use $D_0 = (Q_1 \oplus Q_2) + \overline{Q_0 + Q_1 + Q_2}$: in 000 the NOR inserts a 1 (000 → 001), and in every other state the NOR is 0 and the
LFSR is unchanged.
:::

:::answer
Stuck at **000** (sequence 0, 0, 0, …). Seed it with any non-zero value (a preset instead of a clear) or add the NOR term; with the NOR the
circuit visits all eight states, 0 → 1 → 2 → 5 → 3 → 7 → 6 → 4 → 1, with 000 now only a starting point.
:::
::::

## Try it: the register simulator

The counter tab of the Counter & FSM Simulator runs the same register models as this lesson's checks. In the **Circuit** menu choose
**Ring counter** (the tab opens on it), **Johnson (twisted ring)** or **LFSR**, then a width of 2 to 5 flip-flops and any initial state, and step
the clock: the readout shows each state, and the full state graph of all $2^n$ states shows every cycle. For the ring and Johnson counters the
**main cycle** is always the intended one, the cycle through the standard start (a single 1 for the ring, all 0s for Johnson), whatever initial
state you pick; every other cycle is listed as a lock-out cycle, so the unwanted cycles are visible at a glance.

Try a 4-bit Johnson counter from 0000, and then from 0100: the second run moves round the red lock-out cycle 0100 → 1010 → 1101 → …, exactly the
edge case above, while the main cycle through 0000 stays highlighted and is never reached. Then try a 4-bit ring counter from 1100.

The lab names the cells $Q_{n-1} \dots Q_0$ from the left, while this lesson numbers them $Q_1 \dots Q_n$ from the left, so translate the taps:
for 4 bits this lesson's $Q_3, Q_4$ (the maximal taps) are the lab's **Q1, Q0**. For the LFSR, tick the taps (the cells XORed into the new leftmost
bit) or press **Maximal-length taps**. The **Serial input** takes a bit string that is fed one bit per clock, first character first, so IT 2007 can be
run as it is: 4 bits, initial state 0110, only the rightmost cell (the lab's Q0) as a tap, serial input 101101, six clocks, and the register ends at
0110. A 3-bit LFSR with maximal taps from 000 shows the stuck state; from 100 it runs the GATE 2001 sequence with the bits written in the opposite
order (the lab's leftmost cell is its most significant bit, whereas GATE 2001 reads $Q_2$, the far end of the chain, as the most significant bit).

:::lab{#lab-registers lab="counter-fsm" tab="counter" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1991-b-6-a" tests="piso,universal-register,shift-modes" depth="standard"}
:::

:::pyq{id="cse-1991-b-6-b" tests="ram-shift-register,shift-delay" depth="standard"}
:::

:::pyq{id="cse-1993-ii-a-6-3" tests="johnson-jk,jk-as-d,johnson" depth="standard"}
:::

:::pyq{id="cse-2001-a-37" tests="feedback-shift,lfsr" depth="standard"}
:::

:::pyq{id="cse-2006-cs-37" tests="feedback-shift,trap-shift-direction" depth="standard"}
:::

:::pyq{id="it-2007-cs-40" tests="lfsr-input,lfsr" depth="standard"}
:::

:::pyq{id="cse-2014-2-cs-7" tests="counter-decoder-ring,ring-counter" depth="standard"}
:::

:::pyq{id="cse-2015-1-cs-20" tests="johnson,johnson-theorem" depth="standard"}
:::

:::pyq{id="cse-2018-cs-22" tests="shift-state-graph,shift-def" depth="standard"}
:::

:::pyq{id="cse-2025-1-cs-50" tests="johnson-theorem,trap-johnson-count" depth="standard"}
:::

## Practice

Our own questions in GATE formats: register contents and clock counts first, then ring, Johnson and LFSR sequences, and finally the state
graphs and wirings that need care.

:::practice{id="nx-dl-06-06-q01" depth="standard"}
:::

:::practice{id="nx-dl-06-06-q02" depth="standard"}
:::

:::practice{id="nx-dl-06-06-q03" depth="standard"}
:::

:::practice{id="nx-dl-06-06-q04" depth="standard"}
:::

:::practice{id="nx-dl-06-06-q05" depth="standard"}
:::

:::practice{id="nx-dl-06-06-q06" depth="standard"}
:::

:::practice{id="nx-dl-06-06-q07" depth="standard"}
:::

:::practice{id="nx-dl-06-06-q08" depth="standard"}
:::

:::practice{id="nx-dl-06-06-q09" depth="standard"}
:::

:::practice{id="nx-dl-06-06-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Shift registers and shift-register counters on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Shift register | D flip-flops in a chain, one clock: $Q_1^+ = SI$, $Q_i^+ = Q_{i-1}$ |
| Delay | $n$ stages delay by $n$ clocks: a word's first bit out after $n$, last after $2n - 1$, gone after $2n$ (4-bit: 4, 7, 8) |
| Modes | SISO, SIPO (serial → parallel after $n$ clocks), PISO (load, then $n - 1$ shifts), PIPO |
| Parallel load | $D_i = L\,I_i + \overline{L}\,Q_{i-1}$ (1991: $D_A = LA + \overline{L}S$, …, output $Q_C$) |
| Universal | 4:1 MUX per stage: 00 hold, 01 right, 10 left, 11 load |
| JK as D | $J = x$, $K = \overline{x}$ gives $Q^+ = x$ |
| RAM register | counter-addressed RAM, read then write then increment: delay $2^k$ shifts (1991: 1024; strictly the output flip-flop is one extra stage) |
| State graph | self-loops only at 0…0 and 1…1 (2018: 2) |
| Ring | $D_1 = Q_n$; $n$ states, one-hot; counter + decoder = $2^n$-bit ring (2014) |
| Johnson | $D_1 = \overline{Q_n}$; $2n$ states (2015: 0, 8, 12, 14, 15, 7, 3, 1); other cycles; 2-input decode |
| Count once | "states before returning": $2n$ with the start, $2n - 1$ without (2025: 7 to 8) |
| LFSR | XOR feedback; 0…0 stuck; at most $2^n - 1$ (2001: 1, 2, 5, 3, 7, 6, 4) |
| Data order | first character first (2006: 010); XOR the input in with the feedback (IT 2007: 0110) |
| Synchronous | ring, Johnson and LFSR share one clock: no ripple, no transient states |
:::
