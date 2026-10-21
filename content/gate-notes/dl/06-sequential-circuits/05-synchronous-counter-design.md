---
id: synchronous-counter-design
subject: dl
chapter: sequential-circuits
title: "Synchronous counter design"
order: 5
prerequisites: [ripple-counters, flip-flops, prime-implicants]
pyq_topics: [dl/sequential]
est_minutes: 65
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every input equation, next state, trace, lock-out cycle, clock period and practice answer is produced in content/gate-notes/_checks/dl/l6_05_sync_design.py (seqlib design_counter, designed_step, Sync, autonomous_cycles, self_starting)."
  - "Coverage checklist only (internal digests, never copied): set A p. 87, set B pp. 156–157 and 159, set C pp. 353–356 and 371–372."
  - "Facts checked against: M. Morris Mano and M. D. Ciletti, Digital Design (synchronous counters, design with D, T and JK flip-flops, unused states); J. F. Wakerly, Digital Design: Principles and Practices (counter timing, self-correcting counters)."
  - "PYQs: src/gate/questions.json (cse-1991-b-5-c, cse-1992-b-4-c, cse-1998-b-68, cse-2004-cs-61, cse-2014-3-cs-45, cse-2015-2-cs-7, cse-2016-1-cs-8, cse-2017-2-cs-42, cse-2021-1-cs-28, cse-2026-1-cs-27); every key is re-derived by designing or simulating the circuit."
updated: "2026-10-20"
---

*Counters and registers, lesson 2 of 3.* [Lesson 4](lesson:ripple-counters) built counters in which each
flip-flop clocks the next. They are cheap, but they are slow, they show false states, and they can only
count in binary. This lesson builds the other kind: **synchronous** counters, in which one clock drives
every flip-flop and a little combinational logic in front of the flip-flops decides which bits change.
That one change of wiring buys two things. The counter becomes **fast** (every bit settles one flip-flop
delay after the edge, whatever the width), and it becomes **programmable**: by choosing the logic we can
make the flip-flops step through **any** sequence we like, a Gray code, a jumbled order such as 1, 4, 2, 3,
a counter that saturates at its top value, or a counter that goes up or down on command. We will learn the
one design procedure that produces all of them (state table, excitation columns, K-maps, equations), see why
D, T and JK flip-flops give different but equally correct circuits, and then meet the two places where
students and even textbooks go wrong: sequences that **repeat values** (the state is not the output) and
**unused states** that can trap the counter for ever (lock-out). Ten GATE questions from 1991 to 2026 test
exactly these ideas.

## Where this fits

[Lesson 2](lesson:flip-flops) gave us the **excitation tables**: for each flip-flop type, the inputs that take
it from $Q$ to a wanted $Q^+$. [Lesson 3](lesson:sequential-analysis) taught us to go from a circuit to its
state table. Design is the same road travelled the other way: from a wanted state table back to a circuit.
The middle of that road is pure combinational minimisation, the K-maps and prime implicants of
[Chapter 3](lesson:kmaps) ([prime implicants and don't-cares](lesson:prime-implicants)), so everything you know
about grouping 1s and using don't-cares comes back here, with one new danger: in a counter, a don't-care is not
harmless, because it decides where the circuit goes if it ever lands in an unused state. [Lesson 6](lesson:shift-registers)
builds counters out of shift registers, and [Lesson 7](lesson:finite-state-machines) generalises this lesson's
procedure from counters (no input, or a mode input) to state machines with inputs and outputs. The sentence to
keep: **list the next state of every state, read off what each flip-flop must do, minimise, and then check every
state of the circuit you built, including the ones you never wanted.**

:::table{#radar title="GATE radar: synchronous counter design" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 10 (1991, 1992, 1998, 2004, 2014, 2015, 2016, 2017, 2021, 2026) |
| Marks | 2-mark MCQs (2004, 2014, 2017, 2021, 2026), 1-mark NATs (2015, 2016), descriptive design questions (1991, 1992, 1998) |
| Pattern 1 | Design a counter for a given sequence with D or T flip-flops: 1992 (Gray code), 1998 (1, 4, 2, 3), 2004 (0, 2, 3, 1: find the missing input) |
| Pattern 2 | Saturating counters from a next-state table: 2017 (T inputs), 2026 (D inputs of an up/down counter) |
| Pattern 3 | Minimum flip-flops for a sequence with repeated values: 2015 (0, 0, 1, 1, 2, 2, 3, 3) and 2016 (0, 1, 0, 2, 0, 3): both 3 |
| Pattern 4 | Trace a given synchronous counter: 2014 (JK), 2021 (T) |
| Pattern 5 | Maximum clock frequency of a synchronous counter with an AND chain: 1991 |
| What examiners test | $T = Q \oplus Q^+$ (not $Q^+$); $D = Q^+$; one state per **position** of the cycle, not per value; that every flip-flop is updated from the old state; that only paths that end at a flip-flop input limit the clock |
:::

## The synchronous binary counter

:::intuition{#design-intuition title="Writing the rule book for an odometer" depth="standard"}
A ripple counter is an odometer whose wheels push each other: the right wheel rolls over and **physically**
kicks the next one. Imagine instead an odometer whose wheels never touch. Every wheel has its own little motor,
and all the motors are switched by one shared button. Before each press, a clerk looks at the whole display and
writes a note for every wheel: "you turn this time", or "you stay". Then the button is pressed and every wheel
obeys its note at the same instant.

That clerk is the combinational logic of a synchronous counter, and the notes are the flip-flop inputs. Designing
the counter means **writing the clerk's rule book**: for every possible display, say which way each wheel must
move. For plain binary counting the rule book is short and famous; for any other sequence we will learn to write
it systematically.
:::

What is the rule for binary counting? Adding 1 flips the lowest bit always; it flips bit 1 when bit 0 was 1 (a
carry comes in); it flips bit 2 when bits 0 and 1 were both 1; and so on. "Flip or stay" is exactly what a **T**
flip-flop understands ($Q^+ = T \oplus Q$), so a T flip-flop per bit plus a few AND gates is the natural binary
counter.

:::definition{#sync-binary term="Synchronous binary up counter" depth="standard"}
An $n$-bit **synchronous binary up counter** has $n$ T flip-flops (or JK flip-flops with $J = K$) on **one common
clock**, with
$$T_0 = 1, \qquad T_i = Q_0\,Q_1 \cdots Q_{i-1}\quad (i \ge 1).$$
For three bits: $T_0 = 1$, $T_1 = Q_0$, $T_2 = Q_1 Q_0$; a fourth bit adds $T_3 = Q_2 Q_1 Q_0$. The AND terms can be
built in two ways:

- **parallel** (look-ahead) gating: one AND gate per stage, with $i$ inputs for stage $i$, so every $T_i$ is one gate
  delay after the flip-flop outputs settle;
- **ripple-carry** (serial) gating: a chain in which each AND takes the previous AND's output and one more $Q$
  ($T_{i+1} = T_i \cdot Q_i$), so every gate has only two inputs, but the signal for stage $i$ passes through a chain of gates.

All flip-flops change together, one clock-to-output delay $t_{cq}$ after the active edge: there is no carry rippling
through the **flip-flops**, only (in the serial version) through the gates, and that settles **before** the next edge.
:::

:::theorem{#binary-t name="Bit i toggles exactly when all lower bits are 1" depth="standard"}
When an $n$-bit binary number $Q_{n-1}\dots Q_1Q_0$ is incremented (modulo $2^n$), bit $i$ changes if and only if
$Q_0 = Q_1 = \dots = Q_{i-1} = 1$; bit 0 always changes. Hence the T inputs $T_0 = 1$ and $T_i = Q_0 Q_1 \cdots Q_{i-1}$
make a synchronous binary up counter, and a down counter uses $T_i = \overline{Q_0}\,\overline{Q_1} \cdots \overline{Q_{i-1}}$.
:::

:::proof{#proof-binary-t of="the toggle rule of binary counting" depth="standard"}
**Idea first:** adding 1 is column addition with a carry; a column changes exactly when a carry arrives, and a carry
arrives exactly when every column to its right was 1.

Add 1 in the lowest column. Column 0 receives the 1 and always changes. Column $j$ passes a carry to column $j + 1$
exactly when column $j$ received a carry **and** held 1 (since $1 + 1 = 10$); if it held 0, it absorbs the carry and the
addition stops there. By induction on $i$, column $i$ receives a carry exactly when columns $0, \dots, i - 1$ all held 1,
and a column changes exactly when it receives a carry. So bit $i$ toggles iff $Q_0 \cdots Q_{i-1} = 1$, which is
$T_i = Q_0 \cdots Q_{i-1}$ in the characteristic equation $Q_i^+ = T_i \oplus Q_i$. The wrap from $11\dots1$ to $00\dots0$
is the case where every column toggles. For subtraction a **borrow** passes through a column that held 0, which gives
$T_i = \overline{Q_0} \cdots \overline{Q_{i-1}}$. ∎

**Check by design.** Asking `seqlib.design_counter` for the sequence 0, 1, …, 7 with T flip-flops returns exactly
$T_0 = 1$, $T_1 = Q_0$, $T_2 = Q_1Q_0$, and for 0 … 15 it adds $T_3 = Q_2Q_1Q_0$. The same request with D flip-flops returns
$D_0 = \overline{Q_0}$, $D_1 = \overline{Q_1}Q_0 + Q_1\overline{Q_0}$ and $D_2 = Q_2\overline{Q_1} + Q_2\overline{Q_0} + \overline{Q_2}Q_1Q_0$:
correct, but much bigger. That is why binary counters are built from T (or JK) flip-flops.
:::

The animation runs the 3-bit synchronous counter and a 3-bit ripple counter side by side on the same clock edges,
with the same flip-flop delay. Watch edges 4 and 8.

:::viz{#sync-vs-ripple-timing-viz spec="sync-vs-ripple-timing" mode="animate" depth="standard"}
:::

At edge 4 the count goes from 011 to 100, so all three bits change. The synchronous bits change **together**, one
$t_{pd}$ after the edge; the ripple bits change one after another and pass through 010 and 000 on the way. The
synchronous counter is not free, though: its T inputs come from gates, and those gates must settle before the **next**
edge. That is the speed limit GATE asks about.

:::derivation{#sync-max-freq of="the maximum clock frequency of a synchronous counter" depth="standard"}
Let every flip-flop have clock-to-output delay $t_{cq}$ (GATE often calls it the flip-flop's propagation delay) and setup
time $t_{su}$, and let the slowest path from a flip-flop output through the gates to a flip-flop input have delay
$t_{\text{logic}}$.

1. At an active edge every flip-flop output may change, at time $t_{cq}$ after the edge.
2. The new outputs travel through the gates; the last flip-flop input is correct at $t_{cq} + t_{\text{logic}}$.
3. That input must be stable $t_{su}$ before the next edge, so the period must satisfy
   $$T_{\text{clk}} \ge t_{cq} + t_{\text{logic}} + t_{su}, \qquad f_{\max} = \frac{1}{t_{cq} + t_{\text{logic}} + t_{su}}.$$
4. For the binary counter with **parallel** gating, $t_{\text{logic}} = t_{\text{AND}}$ (one gate, whatever $n$). With a **ripple-carry
   AND chain** in which stage $i$'s input passes through $k_i$ gates, $t_{\text{logic}} = \max_i k_i \cdot t_{\text{AND}}$, the gates
   on the path to the **last flip-flop input**. A gate that feeds no flip-flop (a carry-out to the outside world) is not on any
   flip-flop-to-flip-flop path and does not limit this counter's clock.

**Sanity check.** No gates at all (a 1-bit counter, $T_0 = 1$): $f_{\max} = 1/(t_{cq} + t_{su})$, the limit of a single flip-flop.
Compare [Lesson 4](lesson:ripple-counters): a ripple counter needs $n\,t_{pd}$ to settle, growing with $n$; the synchronous counter
with parallel gating does not grow with $n$ at all (until the AND gates' fan-in becomes too large and they slow down).
:::

:::trap{#trap-sync-fmax title="Counting the AND gate that drives no flip-flop" depth="standard"}
GATE 1991 drew a 3-bit synchronous counter with a chain of three AND gates: the first ANDs logic 1 with $Q_0$ and drives
$J_1 = K_1$, the second ANDs that with $Q_1$ and drives $J_2 = K_2$, the third ANDs that with $Q_2$ and is only the **carry out**.
Every flip-flop and every gate has a 10 ns delay. The expected wrong answers:

- **25 MHz** (40 ns): counting all three AND gates. The third gate's output goes nowhere inside the counter, so its delay never
  stands between one edge and the next.
- **50 MHz** (20 ns): counting only one gate, as if the gating were parallel. The drawn chain is serial: the signal for the third
  flip-flop passes through two gates.
- **100 MHz** (10 ns): forgetting the gates altogether.

The longest flip-flop-to-flip-flop path is $Q_0 \to$ AND$_1 \to$ AND$_2 \to J_2K_2$: $10 + 10 + 10 = 30$ ns, so
$f_{\max} = 1/30\ \text{ns} \approx 33.3$ MHz. (If the carry out drove a **second** counter on the same clock, it would become part of a
longer path; then count it.)
:::

:::aside{#sync-up-down title="A synchronous up/down counter: the mode input steers the gates" depth="deep"}
The [Lesson 4](lesson:ripple-counters) up/down ripple counter had a weakness: switching its mode input changed the clock pins of every stage and
could create a false count. The synchronous version has no such problem, because the mode input $M$ ($M = 0$ up, $M = 1$ down) only chooses which
AND terms reach the T inputs, and nothing happens until the next clock edge. By the theorem above,
$$T_0 = 1, \qquad T_1 = \overline{M}Q_0 + M\overline{Q_0} = M \oplus Q_0, \qquad T_2 = \overline{M}\,Q_1Q_0 + M\,\overline{Q_1}\,\overline{Q_0},$$
and in general $T_i = \overline{M}\,Q_0 \cdots Q_{i-1} + M\,\overline{Q_0} \cdots \overline{Q_{i-1}}$: an AND–OR pair per stage, one AND for the carry and one for the borrow.
Designing the 3-bit up/down counter from its 16-row table (mode and state) with the procedure of the next section returns exactly these equations,
so the "carry or borrow" reading and the K-map reading agree. The same structure, with an extra **enable** ANDed into every term, is how
counter chips are cascaded: the enable of the next chip is the carry (or borrow) of this one, and all chips share the clock.
:::

:::note{#recap-sync-binary title="Recap" depth="quick"}
Synchronous binary counter: one clock, $T_0 = 1$, $T_i = Q_0 \cdots Q_{i-1}$ (bit $i$ toggles when all lower bits are 1).
$f_{\max} = 1/(t_{cq} + t_{\text{logic}} + t_{su})$, with $t_{\text{logic}}$ the gate delay on the longest path that **ends at a flip-flop
input**; parallel gating keeps it at one gate.
:::

### Worked examples: binary counters and clock speed

::::example{#ex-bin-easy level="easy" title="A 3-bit synchronous T counter, edge by edge" depth="quick"}
A 3-bit synchronous counter has $T_0 = 1$, $T_1 = Q_0$ and $T_2 = Q_1Q_0$, and starts at $Q_2Q_1Q_0 = 000$. Which bits toggle at each
of the first four edges, and what are the states?

:::step{why="Every T input is computed from the state before the edge."}
In 000: $T_2T_1T_0 = 001$, only $Q_0$ toggles: **001**. In 001: $T_2T_1T_0 = 011$: **010**.
:::

:::step{why="The AND gate for T2 opens only when both lower bits are 1."}
In 010: $T_2T_1T_0 = 001$: **011**. In 011: $T_2T_1T_0 = 111$, all three toggle: **100**.
:::

:::answer
001, 010, 011, 100: binary counting, with all toggling bits changing at the same instant. Notice that the T vector is just the pattern of
bits that change (001, 011, 001, 111): the "flip or stay" note for each wheel. The edge 011 → 100 is the one that would ripple through all
three stages in a ripple counter; here it costs one $t_{cq}$.
:::
::::

::::example{#ex-bin-fmax level="medium" title="Parallel versus serial AND gating" depth="standard"}
A 4-bit synchronous binary counter uses flip-flops with $t_{cq} = 8$ ns and $t_{su} = 2$ ns, and AND gates with a delay of 4 ns. Find
$f_{\max}$ (a) with parallel gating ($T_2 = Q_1Q_0$ and $T_3 = Q_2Q_1Q_0$ each one gate), (b) with a serial chain ($T_1 = Q_0$ is a wire,
$T_2 = T_1 \cdot Q_1$, $T_3 = T_2 \cdot Q_2$). What happens to both for an 8-bit counter?

:::step{why="Parallel gating puts exactly one gate between any flip-flop output and any T input."}
(a) $T_{\text{clk}} \ge 8 + 4 + 2 = 14$ ns, $f_{\max} = 1/14\ \text{ns} \approx 71.43$ MHz.
:::

:::step{why="In the chain, the path to T3 passes through the gates for T2 and T3."}
(b) $T_{\text{clk}} \ge 8 + 2 \times 4 + 2 = 18$ ns, $f_{\max} \approx 55.56$ MHz.
:::

:::step{why="With 8 bits the chain to T7 has six gates, while parallel gating still has one (a 7-input AND)."}
8 bits, serial: $8 + 6 \times 4 + 2 = 34$ ns, about 29.41 MHz. Parallel: still 14 ns, if a 7-input AND is as fast as a 2-input one.
:::

:::answer
71.43 MHz (parallel) against 55.56 MHz (serial) for 4 bits; at 8 bits the serial chain has fallen to 29.41 MHz. This is the same
trade-off as ripple-carry against carry-look-ahead adders in [Chapter 4](lesson:adders-ripple-carry): serial gates are small and
cheap, parallel gates are fast but need large fan-in.
:::
::::

::::example{#ex-bin-1991 level="gate" title="The AND-chain counter (GATE 1991)" depth="standard"}
Three JK flip-flops share a clock. $J_0 = K_0 = 1$. AND$_1$ = $1 \cdot Q_0$ drives $J_1 = K_1$; AND$_2$ = AND$_1 \cdot Q_1$ drives $J_2 = K_2$;
AND$_3$ = AND$_2 \cdot Q_2$ is the carry out. Every flip-flop and every AND gate has a propagation delay of 10 ns; setup times are
negligible. Find the maximum clock frequency.

:::step{why="J = K makes each stage a T stage, so this is the binary counter T1 = Q0, T2 = Q1Q0 with serial gating."}
Stage 1 toggles when $Q_0 = 1$, stage 2 when $Q_1Q_0 = 1$: a mod-8 up counter.
:::

:::step{why="List the paths that end at a flip-flop input and add their delays."}
To $J_1K_1$: FF + AND$_1$ = 20 ns. To $J_2K_2$: FF + AND$_1$ + AND$_2$ = 30 ns. AND$_3$ ends at no flip-flop.
:::

:::step{why="The period must cover the longest such path (setup is negligible)."}
$T_{\text{clk}} \ge 30$ ns, so $f_{\max} = 1/30\ \text{ns} \approx 33.3$ MHz.
:::

:::answer
About **33.3 MHz** (period 30 ns), GATE 1991. The tempting 25 MHz adds the carry-out gate, which drives nothing inside the counter. The
first AND gate (with a constant 1 input) is in the path even though it does no logic: a real gate still has a real delay.
:::
::::

::::example{#ex-bin-edge level="gate" title="Edge case: when the carry out does matter" depth="standard"}
Extend the 1991 counter to 4 bits (four flip-flops, AND$_1$ … AND$_3$ drive $J_1K_1$ … $J_3K_3$, AND$_4$ is the carry out), all delays
10 ns. Find $f_{\max}$. Then cascade two such counters into an 8-bit counter on the **same clock**, the first counter's carry out feeding the
second counter's first stage and its AND chain. What is $f_{\max}$ now?

:::step{why="The longest path inside one counter ends at J3K3, through three gates."}
4-bit: $10 + 3 \times 10 = 40$ ns, $f_{\max} = 25$ MHz. Counting AND$_4$ too would give 50 ns (20 MHz), the trap again.
:::

:::step{why="In the cascade, AND4 now drives a flip-flop input of the second counter, and the chain continues through its gates."}
The path $Q_0 \to$ AND$_1 \to \dots \to$ AND$_7 \to J_7K_7$ has seven gates: $10 + 70 = 80$ ns, $f_{\max} = 12.5$ MHz.
:::

:::answer
25 MHz for one 4-bit counter, 12.5 MHz for the cascade. The rule is not "ignore the carry out", it is "count the gates on paths that **end at
a flip-flop input of the same clock domain**". A carry out that leaves the circuit is free; the same wire feeding the next counter is on the
critical path. This is why fast synchronous counters use look-ahead (parallel) enables between cascaded chips.
:::
::::

## The design procedure

:::intuition{#procedure-intuition title="A to-do list for every wheel" depth="standard"}
Write the wanted sequence as a table with one row per state: "now I am here, next I must be there". Now cover the table
with a sheet that shows one bit column at a time. For that one bit, every row says one of four things: stay 0, go 0 → 1, go
1 → 0, stay 1. That is a to-do list for one flip-flop. The flip-flop type only changes **how you write the instruction**: a D
flip-flop wants to be told the new value, a T flip-flop wants to be told "flip" or "don't", and a JK flip-flop wants J for "set"
and K for "reset" (and does not care about the other one half the time). Then each instruction column is an ordinary Boolean
function of the present state: minimise it with a K-map, and you have the circuit.
:::

:::definition{#design-procedure term="Designing a synchronous counter" depth="standard"}
To build a counter that steps through a given cyclic sequence of **distinct** states:

1. **Count and name the flip-flops.** $n = \lceil \log_2 (\text{largest state} + 1) \rceil$ bits if the states are given as numbers
   (at least $\lceil \log_2 L \rceil$ for $L$ states); fix the order of the bits (which is the MSB).
2. **State table.** One row per present state: present state, next state. States that never occur are **unused**.
3. **Excitation columns.** For each flip-flop and each row, write the input that takes that bit from $Q$ to $Q^+$, from the
   excitation table of the chosen type ([Lesson 2](lesson:flip-flops)).
4. **K-maps.** Each input column is a function of the present-state bits. Unused states are **don't-cares** (or, if you want to
   control them, forced to a chosen next state). Minimise.
5. **Circuit.** One gate network per flip-flop input; all flip-flops on one clock.
6. **Self-start check.** Work out where the circuit you **built** sends every unused state, and make sure each one reaches the
   main cycle (the section on lock-out explains why this step is not optional).
:::

Step 3 is where the flip-flop type enters, and it reduces to one theorem.

:::theorem{#d-from-next name="Input columns read straight off the state table" depth="standard"}
For a bit $Q$ that must go to $Q^+$ in a given row:

- **D:** $D = Q^+$. The D column is the next-state column.
- **T:** $T = Q \oplus Q^+$. The T column marks the rows where the bit changes.
- **JK:** in rows with $Q = 0$, $J = Q^+$ and $K = \times$; in rows with $Q = 1$, $K = \overline{Q^+}$ and $J = \times$.
  (Equivalently $J = Q^+$ "if 0", $K = \overline{Q^+}$ "if 1".)
- **SR:** in rows with $Q = 0$, $S = Q^+$, $R = 0$ if $Q^+ = 1$ else $\times$; in rows with $Q = 1$, $R = \overline{Q^+}$,
  $S = \times$ if $Q^+ = 1$ else 0.
:::

:::proof{#proof-d-from-next of="the excitation columns" depth="standard"}
**Idea first:** each rule is the characteristic equation solved for the input.

*D.* $Q^+ = D$, so the only input that gives the wanted $Q^+$ is $D = Q^+$.

*T.* $Q^+ = T \oplus Q$. XOR both sides with $Q$: $Q^+ \oplus Q = T \oplus Q \oplus Q = T$. So $T = Q \oplus Q^+$, and it is unique.

*JK.* $Q^+ = J\overline{Q} + \overline{K}Q$. In a row with $Q = 0$ this is $Q^+ = J$, so $J = Q^+$ is forced and $K$ does not appear: $K = \times$.
In a row with $Q = 1$ it is $Q^+ = \overline{K}$, so $K = \overline{Q^+}$ is forced and $J = \times$.

*SR.* $Q^+ = S + \overline{R}Q$ with $SR = 0$. From $Q = 0$: $Q^+ = S$, so $S = Q^+$; if $Q^+ = 1$ then $S = 1$ forces $R = 0$, otherwise $R$ is
free. From $Q = 1$: $Q^+ = S + \overline{R}$; to stay at 1 we need $R = 0$ (then $S$ is free), to go to 0 we need $S = 0$ and $R = 1$. ∎

**Check.** `seqlib.excitation`, which finds the inputs by trying all of them, returns exactly these entries for all four types and all
four transitions.
:::

:::trick{#trick-t-column title="T column = the bits that change" depth="standard"}
Write each present state above its next state and mark the bits that differ: those marks are the T inputs. For 00 → 10 the marks are
"1 0" ($T_2 = 1$, $T_1 = 0$). **Why it works:** $T = Q \oplus Q^+$, and XOR is 1 exactly where two bits differ. **When it fails:** never for
T flip-flops; but do not use it for D flip-flops, where the input is the **new** bit, not the change. Confusing the two is the most common
error in counter design questions (the 2004 and 2017 options are built on it).
:::

:::trick{#trick-jk-half title="JK columns are half don't-cares" depth="standard"}
In the J column only the rows with $Q = 0$ matter (copy $Q^+$ there), and in the K column only the rows with $Q = 1$ matter (copy
$\overline{Q^+}$ there); every other entry is $\times$. So each JK map is at least half don't-cares before any unused state is counted,
and JK designs are usually the cheapest. **Why it works:** the JK proof above. **When it fails:** "cheapest" is about gates, not about safety:
more don't-cares means more freedom for the unused states to go somewhere bad (see lock-out).
:::

The animation runs the whole procedure on the counter of GATE 2004: two T flip-flops, $Q_2$ the MSB and $Q_1$ the LSB, stepping
0 → 2 → 3 → 1 → 0.

:::viz{#sync-counter-design-viz spec="sync-counter-design" mode="animate" depth="standard"}
:::

Notice what the K-maps show. Each T column has its two 1s on a **diagonal**, and two diagonal cells of a 2-variable map are never
adjacent, so no grouping is possible: the functions are XNOR and XOR, $T_2 = \overline{Q_2 \oplus Q_1}$ and $T_1 = Q_2 \oplus Q_1$. Both are
"single gate" answers even though the K-map looked unhelpful; recognising the checkerboard pattern of XOR
([Chapter 2](lesson:xor-and-operators)) saves time.

Now the same procedure for each flip-flop type, stated once so the examples can refer to it.

:::definition{#d-design term="Design with D flip-flops" depth="standard"}
With D flip-flops, step 3 is free: the D column **is** the next-state column ($D_i = Q_i^+$). Each $D_i$ is the $i$-th bit of the next state,
as a function of the present state, with the unused states as don't-cares. D designs need no excitation table, which makes them the
quickest to derive and the natural choice for arbitrary sequences and Gray codes.
:::

:::definition{#t-design term="Design with T flip-flops" depth="standard"}
With T flip-flops, $T_i = Q_i \oplus Q_i^+$: a 1 wherever bit $i$ changes. T designs are small when bits change rarely or regularly (binary
counting: $T_0 = 1$) and they make "hold" free ($T = 0$). The danger is the reverse reading: a T input is **not** the next value, so a T stage
fed with $T = \overline{Q}$ does not toggle (see the analysis section).
:::

:::definition{#jk-design term="Design with JK flip-flops" depth="standard"}
With JK flip-flops each bit has two columns: $J_i$ (rows with $Q_i = 0$: $J_i = Q_i^+$; rows with $Q_i = 1$: $\times$) and $K_i$ (rows with $Q_i = 1$:
$K_i = \overline{Q_i^+}$; rows with $Q_i = 0$: $\times$). Twice as many maps, but each is at least half don't-cares, so each equation is
usually a single literal or a constant. A JK design with $J_i = K_i$ is a T design; one with $K_i = \overline{J_i}$ is a D design.
:::

:::note{#recap-procedure title="Recap" depth="quick"}
Sequence → state table → input columns ($D = Q^+$, $T = Q \oplus Q^+$, $J$ on $Q = 0$ rows, $K$ on $Q = 1$ rows) → K-maps with unused states
as don't-cares → equations → circuit → check where every unused state goes.
:::

## Arbitrary, Gray and saturating sequences

:::intuition{#sequence-intuition title="The counter does not know it is counting" depth="standard"}
A synchronous counter has no idea what "counting" means. It only knows a table: from this pattern, go to that pattern. Binary order is
one table among many. If you want the flip-flops to show 1, 4, 2, 3, or a Gray code in which only one bit changes per step, or a counter
that stops at its top value, you simply write a different table, and the procedure does the rest. The only thing that changes is how
pretty the K-maps are.
:::

:::definition{#arbitrary-sequence term="Counter for an arbitrary sequence" depth="standard"}
A counter for an **arbitrary sequence** steps through a given list of distinct states in a given order and then repeats, for example
1 → 4 → 2 → 3 → 1 (GATE 1998). The number of flip-flops is set by the largest value (here 4 = 100, so 3 bits); the states that do not appear
(0, 5, 6, 7 here) are unused and become don't-cares. Such counters are used as **sequence generators** and as cheap controllers: each state
can drive one step of a process, and a state's bits can be used directly as control signals.
:::

:::definition{#gray-counter term="Gray-code counter" depth="standard"}
A **Gray-code counter** steps through the reflected binary (Gray) code ([Chapter 1](lesson:codes)), in which consecutive values differ in
exactly one bit. For 3 bits: 000 → 001 → 011 → 010 → 110 → 111 → 101 → 100 → 000. Since only one flip-flop changes per clock, decoding the
counter never glitches (there are no intermediate patterns even if two flip-flops had slightly different delays) and the power drawn per
step is minimal. GATE 1992 asked for such a counter ("not more than one flip-flop changes state") with D flip-flops.
:::

:::definition{#saturating term="Saturating and controlled counters" depth="standard"}
A **saturating** counter counts up (or down) but, instead of wrapping round, **stays** at its top (or bottom) value: a 2-bit saturating up
counter goes 00 → 01 → 10 → 11 → 11 → …. Its state table therefore has a self-loop, which a plain cyclic design never has. A **controlled**
counter has an input: an enable $x$ (count when $x = 1$, hold when $x = 0$), or a direction $P$ (up when $P = 0$, down when $P = 1$). An input
is just one more variable in the state table and in every K-map: the table gets one row per (input, state) pair. GATE 2017 asked for the T
inputs of a saturating up counter, and GATE 2026 for the D inputs of a saturating **up/down** counter.
:::

:::note{#recap-sequences title="Recap" depth="quick"}
Any sequence of distinct states is designed the same way. Gray counters change one bit per step (no decoding glitches); saturating
counters have a self-loop at the end; an enable or direction input adds a variable to every map.
:::

### Worked examples: designing with D, T and JK

::::example{#ex-des-2004 level="easy" title="0 → 2 → 3 → 1 with T flip-flops (GATE 2004)" depth="quick"}
A 2-bit counter with T flip-flops ($Q_2$ the MSB, $Q_1$ the LSB) must follow 0 → 2 → 3 → 1 → 0. $T_2$ is driven by an XNOR of $Q_2$ and $Q_1$.
What must $X = T_1$ be?

:::step{why="Write the sequence in bits so each row has a present and a next state."}
00 → 10 → 11 → 01 → 00.
:::

:::step{why="T marks the bits that change, row by row."}
$T_2$: 1, 0, 1, 0 and $T_1$: 0, 1, 0, 1 for the rows 00, 10, 11, 01.
:::

:::step{why="Read T1 as a function of the present state: 1 exactly in 10 and 01."}
$T_1 = \overline{Q_2}Q_1 + Q_2\overline{Q_1} = Q_2 \oplus Q_1$, and $T_2 = \overline{Q_2 \oplus Q_1}$ confirms the given XNOR.
:::

:::answer
$X = Q_1 \oplus Q_2$ (GATE 2004, option D). Option C, the XNOR, is $T_2$'s equation: choosing it gives both stages the same input. Notice also
that the D design of this counter is $D_2 = \overline{Q_1}$, $D_1 = Q_2$: the 0, 2, 3, 1 counter is a 2-bit twisted-ring (Johnson) counter,
[Lesson 6](lesson:shift-registers)'s favourite.
:::
::::

::::example{#ex-des-1998 level="medium" title="1 → 4 → 2 → 3 with D flip-flops (GATE 1998)" depth="standard"}
Design a synchronous counter with D flip-flops that goes through 1, 4, 2, 3, 1, 4, …

:::step{why="The largest value is 4 = 100, so three flip-flops Q2Q1Q0; the unused states are 0, 5, 6, 7."}
Table: 001 → 100, 100 → 010, 010 → 011, 011 → 001; rows 000, 101, 110, 111 are don't-cares.
:::

:::step{why="With D flip-flops each D column is the next-state bit."}
$D_2$ is 1 only in row 001. $D_1$ is 1 in rows 100 and 010. $D_0$ is 1 in rows 010 and 011.
:::

:::step{why="Group each column's 1s with the don't-cares 000, 101, 110, 111."}
$D_1$: rows 100, 010 plus don't-cares 000, 110 make the quad $\overline{Q_0}$. $D_0$: rows 010, 011 plus 110, 111 make $Q_1$.
$D_2$: row 001 pairs with 101 ($\overline{Q_1}Q_0$) or with 000 ($\overline{Q_2}\,\overline{Q_1}$); both are minimal.
:::

:::step{why="Check where the unused states go in the circuit actually built (with D2 = Q1′Q0)."}
000 → 010, 101 → 100, 110 → 011, 111 → 001: each unused state enters the cycle in one clock.
:::

:::answer
$D_2 = \overline{Q_1}Q_0$ (or $\overline{Q_2}\,\overline{Q_1}$), $D_1 = \overline{Q_0}$, $D_0 = Q_1$: one AND gate and two wires (GATE 1998). With the
other choice $D_2 = \overline{Q_2}\,\overline{Q_1}$ the unused states go 000 → 110 → 011, 101 → 000, 110 → 011, 111 → 001: also self-starting, just
by a longer road from 101.
:::
::::

::::example{#ex-des-1992 level="gate" title="A 3-bit Gray-code counter with D flip-flops (GATE 1992)" depth="standard"}
Design a 3-bit counter with D flip-flops in which no more than one flip-flop changes between consecutive states.

:::step{why="One bit per step is exactly the Gray code; all 8 states are used, so there are no don't-cares."}
000 → 001 → 011 → 010 → 110 → 111 → 101 → 100 → 000.
:::

:::step{why="D2 is the next MSB: it is 1 for the present states 010, 110, 111, 101."}
$D_2 = Q_1\overline{Q_0} + Q_2Q_0$ (pairs 010/110 and 111/101).
:::

:::step{why="D1 is 1 for the present states 001, 011, 010, 110."}
$D_1 = \overline{Q_2}Q_0 + Q_1\overline{Q_0}$ (pairs 001/011 and 010/110).
:::

:::step{why="D0 is 1 for 000, 001, 110, 111: Q0 is irrelevant and Q2 = Q1 is required."}
$D_0 = \overline{Q_2}\,\overline{Q_1} + Q_2Q_1 = \overline{Q_2 \oplus Q_1}$.
:::

:::answer
$D_2 = Q_1\overline{Q_0} + Q_2Q_0$, $D_1 = \overline{Q_2}Q_0 + Q_1\overline{Q_0}$, $D_0 = \overline{Q_2 \oplus Q_1}$ (GATE 1992). All 8 states are used, so
there is nothing to lock out. The key observation for $D_0$: in the reflected Gray order the LSB flips exactly on the even-parity states
($Q_2 \oplus Q_1 \oplus Q_0 = 0$), so $Q_0^+ = Q_0 \oplus \overline{Q_2 \oplus Q_1 \oplus Q_0} = \overline{Q_2 \oplus Q_1}$. The JK version is smaller per input ($J_2 = Q_1\overline{Q_0}$, $K_2 = \overline{Q_1}\,\overline{Q_0}$, $J_1 = \overline{Q_2}Q_0$,
$K_1 = Q_2Q_0$, $J_0 = \overline{Q_2 \oplus Q_1}$, $K_0 = Q_2 \oplus Q_1$) but needs six inputs instead of three.
:::
::::

::::example{#ex-des-jk level="gate" title="Edge case: 1, 4, 2, 3 again, with JK flip-flops" depth="standard"}
Redesign the 1998 counter (1 → 4 → 2 → 3) with JK flip-flops. How many gates does it need, compared with the D design, and is it still
self-starting?

:::step{why="J only matters where the bit is 0 and K only where it is 1, plus the four unused rows: most entries are don't-cares."}
$Q_2$: $J_2$ is 1 in row 001 and 0 in rows 010, 011, so $J_2 = \overline{Q_1}$; $K_2$ matters only in row 100 (going to 0), so $K_2 = 1$.
:::

:::step{why="The same reading for the other two bits."}
$J_1 = \overline{Q_0}$ (or $Q_2$), $K_1 = Q_0$; $J_0 = Q_1$ (or $\overline{Q_2}$), $K_0 = \overline{Q_1}$.
:::

:::step{why="Simulate the circuit built from the first choices on the four unused states."}
000 → 110 → 011, 101 → 000, 110 → 011, 111 → 001: every unused state reaches the cycle (101 after three clocks).
:::

:::answer
$J_2 = \overline{Q_1}$, $K_2 = 1$, $J_1 = \overline{Q_0}$, $K_1 = Q_0$, $J_0 = Q_1$, $K_0 = \overline{Q_1}$: **no gates at all**, against one AND gate for the D design,
and still self-starting. More don't-cares bought a cheaper circuit. Notice the price list though: six wired inputs instead of three, and the unused states
now take longer roads into the cycle. Freedom in the don't-cares is freedom for the unused states, in both directions.
:::
::::

### Worked examples: counters with a control input

::::example{#ex-ctl-enable level="easy" title="A 2-bit counter with an enable" depth="quick"}
A 2-bit counter $Q_1Q_0$ counts up (0, 1, 2, 3, 0, …) when $x = 1$ and holds its value when $x = 0$. Find T inputs, and compare with D inputs.

:::step{why="With x = 0 nothing changes, so every T is 0; with x = 1 the binary-counter rule applies."}
$T_0 = x$, $T_1 = xQ_0$.
:::

:::step{why="D inputs must give the new value in both modes, so they repeat the old value when x = 0."}
$D_0 = x \oplus Q_0$ and $D_1 = \overline{x}Q_1 + Q_1\overline{Q_0} + x\overline{Q_1}Q_0$ (that is, $Q_1 \oplus xQ_0$).
:::

:::answer
$T_0 = x$, $T_1 = xQ_0$: the enable simply ANDs into every T input. With D flip-flops, "hold" is not free; it has to be written into every
equation. This is the general lesson: **T and JK make holding cheap, D makes loading cheap.**
:::
::::

::::example{#ex-ctl-2017 level="medium" title="A 2-bit saturating up counter with T flip-flops (GATE 2017)" depth="standard"}
The next-state table is 00 → 01, 01 → 10, 10 → 11, 11 → 11. Find $T_1$ and $T_0$.

:::step{why="T = Q ⊕ Q⁺: mark the bits that change in each row."}
00 → 01: $T_1T_0 = 01$. 01 → 10: 11. 10 → 11: 01. 11 → 11: 00.
:::

:::step{why="T1 is 1 only in row 01."}
$T_1 = \overline{Q_1}Q_0$.
:::

:::step{why="T0 is 1 in every row except 11, which is the complement of Q1Q0."}
$T_0 = \overline{Q_1 Q_0} = \overline{Q_1} + \overline{Q_0}$.
:::

:::answer
$T_1 = \overline{Q_1}Q_0$, $T_0 = \overline{Q_1} + \overline{Q_0}$ (GATE 2017, option B). The saturating row 11 → 11 alone eliminates the other three
options: it needs $T_1 = T_0 = 0$ in state 11, but option A gives $T_1 = 1$, option C $T_1 = 1$ and option D $T_0 = 1$. For comparison, D flip-flops
would need $D_1 = Q_1 + Q_0$, $D_0 = Q_1 + \overline{Q_0}$.
:::
::::

::::example{#ex-ctl-2026 level="gate" title="A saturating up/down counter with D flip-flops (GATE 2026)" depth="standard"}
A 2-bit counter counts up and saturates at 11 when $P = 0$, and counts down and saturates at 00 when $P = 1$. With $P = 1$ the table is
00 → 00, 01 → 00, 10 → 01, 11 → 10. Find $D_1$ and $D_0$.

:::step{why="D = Q⁺, so list the rows (P, Q1, Q0) where each next bit is 1."}
$Q_1^+ = 1$ in rows 001, 010, 011 (up) and 111 (down). $Q_0^+ = 1$ in rows 000, 010, 011 (up) and 110 (down).
:::

:::step{why="Minimise D1 on the three-variable map of P, Q1, Q0."}
$D_1 = \overline{P}Q_1 + \overline{P}Q_0 + Q_1Q_0$: the two up-counting pairs and the pair 011/111.
:::

:::step{why="Minimise D0 the same way."}
$D_0 = \overline{P}\,\overline{Q_0} + \overline{P}Q_1 + Q_1\overline{Q_0}$: the pairs 000/010 and 010/011, and the pair 010/110.
:::

:::answer
$D_1 = \overline{P}Q_1 + \overline{P}Q_0 + Q_1Q_0$ and $D_0 = \overline{P}\,\overline{Q_0} + \overline{P}Q_1 + Q_1\overline{Q_0}$: option B (GATE 2026). The fast way:
the single row $P = 0$, 00 → 01 kills every other option. Option A gives 00 there, option C gives 10, option D gives 00. Option B gives
$D_1 = 0$, $D_0 = \overline{P}\,\overline{Q_0} = 1$: 01. Checking all eight rows by simulation, only B matches the table everywhere.
:::
::::

::::example{#ex-ctl-mod3 level="gate" title="Edge case: a mod-3 counter, unused state 3 forced to 0" depth="standard"}
Design a mod-3 counter 0 → 1 → 2 → 0 with D flip-flops, first with state 3 as a don't-care, then with 3 → 0 forced. Where does 3 go in each, and what does
forcing cost?

:::step{why="Two flip-flops; rows 00 → 01, 01 → 10, 10 → 00, and row 11 is unused."}
Don't-care: $D_1 = Q_0$ (row 01 with the don't-care 11), $D_0 = \overline{Q_1}\,\overline{Q_0}$ (row 00 alone).
:::

:::step{why="Evaluate the built circuit in the unused state."}
In 11: $D_1 = Q_0 = 1$, $D_0 = 0$: 11 → 10, which is in the cycle. So the don't-care design is already self-starting.
:::

:::step{why="Forcing 11 → 00 turns the don't-care into a 0 in both maps."}
$D_1 = \overline{Q_1}Q_0$, $D_0 = \overline{Q_1}\,\overline{Q_0}$: 11 → 00.
:::

:::answer
With don't-cares 3 → 2 (self-starting, $D_1$ is a bare wire); forced, 3 → 0 at the cost of a 2-input AND for $D_1$. Forcing is a design choice, not a
duty: it costs gates and it is only **needed** when the don't-care design locks out, or when a power-up glitch must lead to a known state (0) rather
than to just any state of the cycle.
:::
::::

## Repeated values: the state is not the output

:::intuition{#repeat-intuition title="A lift that stops twice at the same floor" depth="standard"}
A lift goes ground, 1, ground, 2, ground, 3, and repeats. Standing on the ground floor, can it decide where to go next? No: sometimes the answer is 1,
sometimes 2, sometimes 3. To behave correctly it must remember **which visit** to the ground floor this is. The floor number is what you **see**; the
lift's memory must hold more than that.

A counter is the same. Its flip-flops can only remember their own bits, and the next state is a function of those bits alone. If the wanted output
sequence shows the same value twice with different successors, one pattern of the flip-flops cannot be both visits. The counter needs a **state per
position** in the cycle, and the visible value becomes an **output** decoded from the state.
:::

:::definition{#repeated-values term="Counters for sequences with repeated values" depth="standard"}
If a cyclic output sequence repeats a value, for example 0, 0, 1, 1, 2, 2, 3, 3 (GATE 2015) or 0, 1, 0, 2, 0, 3 (GATE 2016), the counter cannot use the
values themselves as its states. Instead:

1. Give every **position** of the cycle its own state $S_0, S_1, \dots, S_{L-1}$, where $L$ is the length of the shortest repeating block (the
   **minimal period** of the sequence).
2. Build a mod-$L$ counter over these states (any of the designs above), with $\lceil \log_2 L \rceil$ flip-flops.
3. Add **output logic**: a combinational function from the state bits to the wanted value.

With a clever state assignment the output logic may vanish: for 0, 0, 1, 1, 2, 2, 3, 3 a plain mod-8 binary counter $Q_2Q_1Q_0$ already shows the wanted
value on its top two bits $Q_2Q_1$, because dropping the lowest bit of 0 … 7 gives 0, 0, 1, 1, 2, 2, 3, 3.
:::

:::theorem{#states-vs-outputs name="One state per position of the cycle" depth="standard"}
Let an autonomous synchronous circuit (no inputs) produce an output $z = f(\text{state})$, and let the output sequence be periodic with **minimal**
period $L$. Then the circuit has at least $L$ states on its cycle, so it needs at least $\lceil \log_2 L \rceil$ flip-flops; and $\lceil \log_2 L \rceil$ flip-flops
are enough (a mod-$L$ counter plus output logic).
:::

:::proof{#proof-states-vs-outputs of="the state count of an output sequence" depth="standard"}
**Idea first:** if the machine came back to a state sooner than $L$ clocks, its outputs would repeat sooner than $L$ clocks.

By the cycle theorem of [Lesson 3](lesson:sequential-analysis), from the moment the circuit is on its final cycle the states repeat with some period
$\lambda$: $s_{k+\lambda} = s_k$. The output is a function of the state, so $z_{k+\lambda} = f(s_{k+\lambda}) = f(s_k) = z_k$: the output sequence also
repeats with period $\lambda$. The minimal period of a sequence divides every period of it, so $L$ divides $\lambda$ and $\lambda \ge L$. The cycle has
$\lambda$ different states, at least $L$, and $k$ flip-flops hold at most $2^k$ states, so $2^k \ge L$.

Conversely, a mod-$L$ counter with $\lceil \log_2 L \rceil$ flip-flops visits $L$ different states in a cycle; define $f(S_j) = z_j$ for the $j$-th state.
That is a legal output function because the states are different. ∎

**Check by simulation.** `seqlib.counter_states_needed` returns the minimal period: 8 for 0, 0, 1, 1, 2, 2, 3, 3, and 6 for 0, 1, 0, 2, 0, 3, so
`ff_count` gives 3 flip-flops in both cases.
:::

:::trap{#trap-distinct-values title="Counting distinct values instead of positions" depth="standard"}
GATE 2015 (0, 0, 1, 1, 2, 2, 3, 3) and GATE 2016 (0, 1, 0, 2, 0, 3) both asked for the minimum number of JK flip-flops, and both answers are **3**.
The expected wrong answer is **2**: four distinct values (0 to 3) fit in two bits, so "2 flip-flops" sounds right. But two flip-flops have four states,
and the machine needs 8 (2015) or 6 (2016) positions. In 2016, state "0" would have to be followed by 1, 2 **and** 3 at different times, which no next-state
function can do.

The second wrong answer appears in at least one set of revision notes for the 2016 sequence: **4** flip-flops. Six positions fit in $2^3 = 8$ states;
$\lceil \log_2 6 \rceil = 3$. Use the minimal period, not the number of values and not the length of the list as printed: 0, 1, 0, 1 has period 2 and
needs only 1 flip-flop.
:::

:::note{#recap-repeats title="Recap" depth="quick"}
States are positions, outputs are values. Find the minimal period $L$ of the output sequence; the counter needs $\lceil \log_2 L \rceil$ flip-flops plus output
logic. Distinct values (2 for 2015/2016) and the printed length are both wrong measures.
:::

## Unused states, self-starting and lock-out

:::intuition{#selfstart-intuition title="A road map with a few unmarked streets" depth="standard"}
A town has a ring road with four stops, and the bus follows it for ever. Four more streets exist that the bus never uses. One day a road works detour
drops the bus on one of those side streets. If every side street eventually leads back to the ring road, the detour costs a few minutes. If the side
streets form their own little ring, the bus drives round it for ever and never serves a single stop.

A counter that is switched on, or hit by noise, can wake up in an **unused** state. Where it goes from there is decided by the don't-care choices we made
in the K-maps, which we chose for cheapness, not for safety.
:::

:::definition{#self-start term="Self-starting, full-length and lock-out" depth="standard"}
Let a counter be designed for a main cycle $M$ of states.

- It is **self-starting** if from **every** state, used or unused, it reaches $M$ after finitely many clocks (and then stays on it).
- It is **full-length** (no unused states) if $M$ contains every one of the $2^n$ states: then there are no unused states and self-starting is
  automatic. A 3-bit binary or Gray counter is full-length. (Do not confuse this with "free-running", which means counting continuously with no
  enable or stop.)
- It has a **lock-out** if some state never reaches $M$: the circuit started there circulates for ever among unused states (a **lock-out cycle**, possibly a
  single state with a self-loop).

Full-length implies self-starting; the converse is false (the 1998 counter has unused states, but all of them lead into the cycle).
:::

:::theorem{#lockout name="Self-starting is a property of the built circuit" depth="standard"}
Let a counter be designed for a main cycle $M$ with the unused states as don't-cares, and let $F$ be the next-state function of the circuit actually built.

1. On the states of $M$, $F$ is the designed sequence; on every unused state $u$, $F(u)$ is whatever the chosen K-map groupings make it.
2. The circuit is self-starting **if and only if** $M$ is the only cycle of $F$. Equivalently: it has a lock-out if and only if the unused states contain a cycle of
   $F$.
3. Two minimal designs of the same sequence (different but equally cheap groupings of the don't-cares) can differ in this property.
:::

:::proof{#proof-lockout of="the self-start criterion" depth="standard"}
**Idea first:** every state ends on some cycle, and the main cycle cannot be left; so "every state reaches $M$" is the same as "there is no other cycle".

(1) A don't-care cell of a K-map takes the value of the group that covers it (1 if some chosen group covers it, 0 otherwise), so the built circuit gives every
unused state a definite next state, determined by the choice of groups. On states of $M$ the cells are specified, and every correct cover reproduces them.

(2) By the cycle theorem ([Lesson 3](lesson:sequential-analysis)), from any start the autonomous circuit reaches some cycle of $F$ and stays on it. $M$ is a cycle
of $F$ (step 1), and since $F$ maps each state of $M$ to a state of $M$, a run that reaches $M$ never leaves it. If $M$ is the only cycle, every run ends on
$M$: self-starting. If there is another cycle $C$, then $C$ is disjoint from $M$ (two different cycles of a function share no state, because each state has
only one successor), so $C$ consists of unused states, and a run started on $C$ stays on $C$ and never reaches $M$: lock-out.

(3) The 0 → 3 → 5 → 6 counter below has two minimal JK designs of zero gates each: one has the lock-out cycle 001 → 010 → 100 → 111 → 001, the other sends every
unused state into $M$ in one clock. ∎

**Check by simulation.** `seqlib.self_starting` follows every state of the designed circuit to its cycle; `autonomous_cycles` lists all cycles. Both are run on
every design in this lesson.
:::

The classic example is a counter that is easy to present as finished, and at least one set of revision notes does.

:::definition{#lockout-example term="The 0 → 3 → 5 → 6 JK counter" depth="standard"}
Design a counter for 0 → 3 → 5 → 6 → 0 with JK flip-flops $A$, $B$, $C$ ($A$ the MSB). The used states are 000, 011, 101, 110; the unused states 001, 010,
100, 111 are don't-cares. One minimal solution is
$$J_A = K_A = Q_B, \qquad J_B = K_B = 1, \qquad J_C = K_C = \overline{Q_B}$$
(every stage is a T stage: $T_A = Q_B$, $T_B = 1$, $T_C = \overline{Q_B}$; `seqlib.design_counter` with T flip-flops returns exactly these). On the main cycle it is
perfect: 000 → 011 → 101 → 110 → 000. Now start it in 001: $Q_B = 0$, so A holds, B toggles to 1, and C toggles ($\overline{Q_B} = 1$) to 0: **010**. From 010:
A toggles, B toggles, C holds: **100**. From 100: **111**. From 111: A toggles, B toggles, C holds: **001**. The unused states form the cycle
$$001 \to 010 \to 100 \to 111 \to 001,$$
which never touches the main cycle. A counter powered up in any of these four states is **locked out** for ever.
:::

:::trap{#trap-looks-finished title="This counter looks finished, but it locks out" depth="standard"}
The expected wrong answer is "self-starting", or no answer at all because the question was never asked. It is easy to design exactly this 0 → 3 → 5 → 6
counter with JK flip-flops ($J_A = K_A = Q_B$, $J_B = K_B = 1$, $J_C = K_C = \overline{Q_B}$), take all unused states as don't-cares, and present the circuit as
finished. It is a correct design of the **main cycle**, but it is not self-starting: the four unused states run round 001 → 010 → 100 → 111 → 001 for ever.
Taking all unused states as don't-cares is legitimate only if you **then check** where the built circuit sends them; giving the unused states an explicit next
state is the cure, and it must actually be applied to this circuit.
:::

The animation draws all eight states of that circuit, simulates the unused ones, and then applies two cures.

:::viz{#lockout-graph-viz spec="lockout-graph" mode="animate" depth="standard"}
:::

:::definition{#lockout-fix term="Curing a lock-out" depth="standard"}
Three standard cures, from the most to the least expensive:

1. **Force the unused next states.** Replace the don't-cares by a chosen next state (usually the initial state, 000) and redesign. Every unused state then enters
   the main cycle in one clock. For 0 → 3 → 5 → 6 with JK flip-flops and every unused state sent to 000 the equations become
   $J_A = Q_BQ_C$, $K_A = \overline{Q_C} + Q_B$, $J_B = \overline{Q_A}\,\overline{Q_C} + Q_AQ_C$, $K_B = 1$, $J_C = \overline{Q_A}\,\overline{Q_B}$, $K_C = \overline{Q_B} + Q_A$:
   safe, but no longer gate-free.
2. **Force only what breaks the cycle.** One redirected arc is enough to open a lock-out cycle; redirect one unused state into the main cycle and keep the other
   don't-cares free. **Then re-run the self-start check**: forcing one row changes the K-maps, the new minimal covers can move the other
   unused arcs, so one redirected arc opens the old cycle but does not by itself guarantee there is no new one. Example: the D design of
   0 → 3 → 5 → 6 ($D_2 = Q_0$, $D_1 = \overline{Q_1}$, $D_0 = \overline{Q_2}$) locks out on 001 → 111 → 100 → 010. Force only 001 → 000 and re-minimise: the
   three maps now have four minimal covers each, and one equally cheap choice is $D_2 = Q_1Q_0 + Q_2Q_0$, $D_1 = \overline{Q_1}\,\overline{Q_0} + Q_2Q_0$,
   $D_0 = \overline{Q_1}\,\overline{Q_0} + Q_1Q_0$. The old cycle is gone, but now 111 gives $D_2D_1D_0 = 111$: a brand-new **self-loop**.
3. **Choose a different minimal cover.** Often an equally cheap grouping is self-starting. Here $J_A = Q_C$, $K_A = \overline{Q_C}$ (the stage $A$ simply copies $C$) is
   just as minimal as $J_A = K_A = Q_B$, and it sends 001 → 110, 010 → 000, 100 → 011, 111 → 101: self-starting at **zero** extra cost.

A fourth, practical cure is a **reset**: an asynchronous clear at power-up puts the counter in 000. It protects against power-up, but not against a noise hit
during operation, so a self-starting design is still preferred.
:::

:::trap{#trap-lockout title="Don't-cares can lock you out" depth="standard"}
The expected wrong belief is "unused states never occur, so their next states do not matter". They occur at power-up, after noise, and after any glitch; and a
K-map does not leave them "undefined": it gives each one a definite next state. A question that asks "is the counter self-starting?" is answered only by
**simulating every unused state of the circuit as built**. Two specific traps: (i) checking the unused states of the **specification** (all "x") instead of the
circuit; (ii) stopping after one clock: an unused state that goes to another unused state has not been checked yet; follow it until it reaches the main cycle
or repeats.
:::

:::note{#recap-lockout title="Recap" depth="quick"}
Unused states get whatever next state the K-map groups give them. Self-starting ⇔ the main cycle is the only cycle of the built circuit. The 0 → 3 → 5 → 6 JK counter
with $J_A = K_A = Q_B$ locks out (001 → 010 → 100 → 111 → 001); cures: force next states, or pick another minimal cover ($J_A = Q_C$, $K_A = \overline{Q_C}$).
:::

### Worked examples: repeated values and lock-out

::::example{#ex-rep-2015 level="easy" title="Flip-flops for 0, 0, 1, 1, 2, 2, 3, 3 (GATE 2015)" depth="quick"}
What is the minimum number of JK flip-flops for a synchronous counter with the count sequence 0, 0, 1, 1, 2, 2, 3, 3, 0, 0, …?

:::step{why="Each value appears twice with different successors (the first 0 goes to 0, the second to 1), so states are positions."}
The minimal period is 8: the cycle has 8 positions.
:::

:::step{why="Eight states need the smallest k with 2^k at least 8."}
$\lceil \log_2 8 \rceil = 3$ flip-flops.
:::

:::answer
**3** (GATE 2015). A mod-8 binary counter $Q_2Q_1Q_0$ does it with no output logic at all: its top two bits $Q_2Q_1$ read 0, 0, 1, 1, 2, 2, 3, 3. The answer 2
(four distinct values) cannot work: with two flip-flops, state 00 would have to go to 00 and to 01.
:::
::::

::::example{#ex-rep-2016 level="medium" title="Flip-flops for 0, 1, 0, 2, 0, 3 (GATE 2016)" depth="standard"}
A synchronous counter must output 0, 1, 0, 2, 0, 3 and repeat. How many JK flip-flops are needed at least? Give an output function for a
binary mod-6 state counter $Q_2Q_1Q_0$ (states 0 to 5).

:::step{why="The value 0 is followed by 1, 2 and 3 at different times, so it occupies three different states."}
Minimal period 6, so 6 states: $\lceil \log_2 6 \rceil = 3$ flip-flops.
:::

:::step{why="Assign output values to the six states of a mod-6 counter: z(0..5) = 0, 1, 0, 2, 0, 3."}
$z_1$ (the 2s bit) is 1 in states 3 and 5; $z_0$ (the 1s bit) is 1 in states 1 and 5. States 6 and 7 are don't-cares.
:::

:::step{why="Minimise both output bits with the two don't-cares."}
$z_1 = Q_1Q_0 + Q_2Q_0$ and $z_0 = \overline{Q_1}Q_0$.
:::

:::answer
**3** flip-flops (GATE 2016), plus a little output logic: $z_1 = Q_0(Q_1 + Q_2)$, $z_0 = \overline{Q_1}Q_0$. Neither 2 (distinct values) nor 4 (2 output bits plus 2 bits to count
the three visits to 0) is right: the six positions need only 3 bits **jointly**, because 6 ≤ 2³, with two codes to spare.
:::
::::

::::example{#ex-rep-lock level="gate" title="Does the 0 → 3 → 5 → 6 JK counter self-start?" depth="standard"}
The counter $J_A = K_A = Q_B$, $J_B = K_B = 1$, $J_C = K_C = \overline{Q_B}$ ($A$ = MSB) is designed for 0 → 3 → 5 → 6. Trace every unused state.

:::step{why="All three stages are T stages: A toggles when B = 1, B always toggles, C toggles when B = 0."}
001 ($B = 0$): A holds, B → 1, C toggles → **010**. 010 ($B = 1$): A → 1, B → 0, C holds → **100**.
:::

:::step{why="Continue from the states just reached until something repeats."}
100 ($B = 0$): A holds, B → 1, C → 1: **111**. 111 ($B = 1$): A → 0, B → 0, C holds: **001**, where we started.
:::

:::step{why="By the cycle theorem a repeat closes a cycle; none of these four states is on the main cycle."}
Lock-out cycle 001 → 010 → 100 → 111 → 001, of length 4.
:::

:::answer
**Not self-starting:** all four unused states lie on a lock-out cycle. This is the counter of the trap above; seqlib's `autonomous_cycles` finds exactly two
cycles, [000, 011, 101, 110] and [001, 010, 100, 111].
:::
::::

::::example{#ex-rep-fix level="gate" title="Edge case: making the 0 → 3 → 5 → 6 counter self-starting" depth="standard"}
Make the counter of the previous example self-starting (a) by forcing every unused state to 000, (b) without adding any gate.

:::step{why="Forcing turns the four don't-care rows into specified rows with next state 000, so the maps lose their freedom."}
(a) $J_A = Q_BQ_C$, $K_A = \overline{Q_C} + Q_B$, $J_B = \overline{Q_A}\,\overline{Q_C} + Q_AQ_C$, $K_B = 1$, $J_C = \overline{Q_A}\,\overline{Q_B}$, $K_C = \overline{Q_B} + Q_A$.
Every unused state → 000.
:::

:::step{why="Look for another minimal cover. In the J_A map (rows with A = 0) the only 1 is row 011, and Q_C covers it as well as Q_B does."}
(b) $J_A = Q_C$, $K_A = \overline{Q_C}$: stage A now loads $C$. Keep $J_B = K_B = 1$ and $J_C = K_C = \overline{Q_B}$.
:::

:::step{why="Re-check the main cycle and every unused state of the new circuit."}
Main: 000 → 011 → 101 → 110 → 000 ✓. Unused: 001 → 110, 010 → 000, 100 → 011, 111 → 101: each enters the cycle in one clock.
:::

:::answer
Both cures work. (a) costs several gates; (b) costs nothing, because it only exchanges one minimal grouping for another. The lesson of the edge case: **lock-out is
not a property of the sequence, it is a property of the don't-care choices**, so the cheapest safe design is found by checking the alternatives, not by
abandoning don't-cares.
:::
::::

## Analysing a given synchronous counter

:::intuition{#counter-trace-intuition title="Run the rule book, do not guess it" depth="standard"}
When a question hands you a counter instead of a sequence, you are the clerk of the first intuition: freeze the display, compute every flip-flop's note from
the frozen display, then let all wheels move at once. It is [Lesson 3](lesson:sequential-analysis)'s tracing procedure, and the only counter-specific advice is
not to trust what a counter "looks like": a circuit drawn like a binary counter may count in any order, may stop, or may lock up.
:::

:::definition{#counter-trace term="Tracing a given counter" depth="standard"}
To find the state sequence of a given synchronous counter:

1. Write each flip-flop's input equations from the figure, and simplify each stage using the shortcuts of [Lesson 3](lesson:sequential-analysis): $J = K = g$ is a T
   stage with $T = g$; $K = \overline{J}$ is a D stage with $D = J$.
2. From the initial state, compute **all** inputs from the present state, then update all flip-flops together; repeat.
3. For a question about many clocks, find the cycle first: a counter with a cycle of length $L$ entered at position $p$ is at position $(p + k) \bmod L$ after $k$
   more clocks. For example the 1998 counter (1, 4, 2, 3) started at 1 shows $[1, 4, 2, 3][30 \bmod 4] = 2$ after 30 clocks.
4. If asked about self-starting, also tabulate the unused states.
:::

:::definition{#complete-circuit term="Completing a partial counter" depth="standard"}
A question may draw part of a counter and ask for a missing input (GATE 2004: "to complete the circuit, X should be …"). Do not test the options one by one against
the figure: design the missing input from the state table as in the procedure (its excitation column, minimised), check the **given** part of the circuit against
its own column (a free consistency check that your bit order is right), and then match the options, expecting an option that equals the **other** input's
equation as a trap.
:::

:::trap{#trap-t-qbar title="A T stage with T = Q̄ does not toggle" depth="standard"}
A common slip in student solutions: writing $T = \overline{Q}$ for a counter stage that should toggle every clock. $Q^+ = T \oplus Q =
\overline{Q} \oplus Q = 1$: from 0 the stage sets once, and from then on it stays at 1. A stage that toggles every clock has $T = 1$ (or $J = K = 1$, or
$D = \overline{Q}$); "$\overline{Q}$" belongs on the **D** input, not the T input. [Lesson 3](lesson:sequential-analysis) proves the same fact for analysis.
:::

:::note{#recap-counter-trace title="Recap" depth="quick"}
Write the equations, reduce JK stages to T or D where possible, update all bits from the old state, and follow the trace until it repeats. For a missing input,
design it and match; for self-starting, tabulate the unused states too. $T = \overline{Q}$ sets once and holds.
:::

### Worked examples: analysing given counters

::::example{#ex-an-tqbar level="easy" title="A counter whose designer wrote T0 = Q̄0" depth="quick"}
A 2-bit "binary counter" was wired with $T_0 = \overline{Q_0}$ and $T_1 = Q_0$. From $Q_1Q_0 = 00$, list the first five states.

:::step{why="Substitute T0 = Q̄0 into Q0+ = T0 ⊕ Q0: the result is 1 whatever Q0 is."}
$Q_0^+ = \overline{Q_0} \oplus Q_0 = 1$: after the first clock $Q_0$ is 1 for ever.
:::

:::step{why="T1 = Q0, so Q1 toggles at every clock from then on."}
00 → 01 → 11 → 01 → 11 → 01.
:::

:::answer
01, 11, 01, 11, 01: the counter never shows 00 or 10 again, a 2-state cycle instead of the intended 4. The fix is $T_0 = 1$. Notice the general rule: a
$\overline{Q}$ fed back into its own **T** input cancels the toggle.
:::
::::

::::example{#ex-an-2014 level="medium" title="The three-JK counter (GATE 2014)" depth="standard"}
JK flip-flops $Q_2Q_1Q_0$ on one clock have $J_2 = \overline{Q_1}$, $K_2 = Q_0$, $J_1 = Q_2$, $K_1 = \overline{Q_2}$, $J_0 = Q_1$, $K_0 = \overline{Q_0}$. From 000, give the next three
states.

:::step{why="J1 = Q2 and K1 = Q̄2 make stage 1 a D stage; K0 = Q̄0 makes stage 0 hold once it is 1."}
$Q_1^+ = Q_2$; $Q_0^+ = Q_1\overline{Q_0} + Q_0 = Q_1 + Q_0$; $Q_2^+ = \overline{Q_1}\,\overline{Q_2} + \overline{Q_0}Q_2$.
:::

:::step{why="Clock 1 from 000 and clock 2 from 100, every bit from the old state."}
000: $Q_2^+ = 1$, $Q_1^+ = 0$, $Q_0^+ = 0$: **100**. 100: $Q_2^+ = 0 + 1 = 1$, $Q_1^+ = 1$, $Q_0^+ = 0$: **110**.
:::

:::step{why="Clock 3 from 110."}
110: $Q_2^+ = 0 + 1 = 1$, $Q_1^+ = 1$, $Q_0^+ = 1 + 0 = 1$: **111**.
:::

:::answer
**100, 110, 111** (GATE 2014, option C). Continuing, the counter goes 011, 001, 101, 011, …: a 3-state cycle after a 4-state tail, nothing like binary counting.
Option A (001, 010, 011) is what you write if you assume "three JK flip-flops = binary counter".
:::
::::

::::example{#ex-an-2021 level="gate" title="The three-T counter (GATE 2021)" depth="standard"}
T flip-flops $P$, $Q$, $R$ share a clock with $T_P = R$, $T_Q = \overline{P}$, $T_R = \overline{Q}$. From $PQR = 000$, find the next three states. Is the counter self-starting?

:::step{why="Each T input says which bits flip; compute all three from the old state."}
000: $T_PT_QT_R = 011$: **011**. 011: $T = 1, 1, 0$: **101**. 101: $T = 1, 0, 1$: **000**.
:::

:::step{why="The trace has returned to 000, so the cycle is 000 → 011 → 101 → 000. Now tabulate the other five states."}
001 → 110, 010 → 000, 100 → 101, 110 → 110, 111 → 011.
:::

:::step{why="110 maps to itself: T_P = R = 0, T_Q = P̄ = 0, T_R = Q̄ = 0, so nothing toggles."}
110 is a self-loop, and 001 leads into it.
:::

:::answer
**011, 101, 000** (GATE 2021, option A): a mod-3 counter. It is **not** self-starting: powered up in 110 (or in 001, which goes to 110) it stays at 110 for ever, a
lock-out of length 1. Option C (011, 101, 111) is the trap of continuing the "pattern" instead of computing the third clock. Options B and D fail at the first
clock: in 000 both $T_Q = \overline{P}$ and $T_R = \overline{Q}$ are 1, so two bits must flip and the first state is 011, not 001.
:::
::::

::::example{#ex-an-selfloop level="gate" title="Edge case: a JK mod-3 counter whose unused state is a self-loop" depth="standard"}
A mod-3 counter 00 → 01 → 10 → 00 was built with $J_1 = Q_0$, $K_1 = \overline{Q_0}$, $J_0 = K_0 = \overline{Q_1}$ (the designer liked the symmetry). Check the main
cycle, then the unused state 11.

:::step{why="Stage 1 has K = J̄, so it is a D stage with D = Q0; stage 0 has J = K, a T stage with T = Q̄1."}
$Q_1^+ = Q_0$, $Q_0^+ = \overline{Q_1} \oplus Q_0$.
:::

:::step{why="Main cycle: every bit from the old state."}
00 → 01 → 10 → 00 ✓.
:::

:::step{why="The unused state: Q1+ = Q0 = 1 and Q0+ = 0 ⊕ 1 = 1."}
11 → 11.
:::

:::answer
The main cycle is right, but 11 is a **self-loop**: a lock-out of length 1. Each choice was legal ($K_1 = \overline{Q_0}$ is 1 in the only specified row of the $K_1$ map, and
$K_0 = \overline{Q_1}$ in the only specified row of the $K_0$ map), yet the minimal choices $K_1 = 1$ and $K_0 = 1$ would have sent 11 to 00. A self-loop on an unused state is
the smallest lock-out there is, and the easiest to miss.
:::
::::

## Try it: design a counter in the simulator

The counter tab of the Counter & FSM Simulator has a **Synchronous, designed from a sequence** mode that runs this lesson's procedure. The tab opens on the ring
counter, so first choose **Synchronous, designed from a sequence** in the **Circuit** menu (the sequence box opens with `0, 3, 5, 6`). Type a sequence of distinct
states, choose D, T or JK flip-flops, and choose whether the unused states are **don't-cares** or **forced to 0**. The lab shows the minimal
input equations (built from the first minimal cover of each input, with the other minimal covers listed), a table of the wanted and the built next state of every
state, the waveforms as you clock it, and the full state graph of all $2^n$ states with the self-start checker naming every lock-out cycle. With the default **JK**
flip-flops the lab's first minimal cover for 0, 3, 5, 6 happens to be $J_2 = Q_0$, $K_2 = \overline{Q_0}$ (cure 3 above), and the checker says **self-starting**;
the locking cover appears only in the "also minimal" list. Switch to **T** flip-flops to see the locking circuit: the lab's equations are $T_2 = Q_1$, $T_1 = 1$,
$T_0 = \overline{Q_1}$ (the $J_A = K_A = Q_B$ counter of this lesson) and the checker reports the lock-out cycle 001 → 010 → 100 → 111. With **D** it locks out too,
on 001 → 111 → 100 → 010. Switch the unused states to **forced to 0** and the lock-out disappears. Then try 1, 4, 2, 3 with D, and 0, 1, 3, 2, 6, 7, 5, 4 (the Gray code).

:::lab{#lab-design lab="counter-fsm" tab="counter" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1991-b-5-c" tests="sync-max-freq,sync-binary,trap-sync-fmax" depth="standard"}
:::

:::pyq{id="cse-1992-b-4-c" tests="gray-counter,d-design,design-procedure" depth="standard"}
:::

:::pyq{id="cse-1998-b-68" tests="arbitrary-sequence,d-design" depth="standard"}
:::

:::pyq{id="cse-2004-cs-61" tests="t-design,complete-circuit" depth="standard"}
:::

:::pyq{id="cse-2014-3-cs-45" tests="counter-trace,jk-design" depth="standard"}
:::

:::pyq{id="cse-2015-2-cs-7" tests="repeated-values,states-vs-outputs,trap-distinct-values" depth="standard"}
:::

:::pyq{id="cse-2016-1-cs-8" tests="repeated-values,states-vs-outputs,trap-distinct-values" depth="standard"}
:::

:::pyq{id="cse-2017-2-cs-42" tests="saturating,t-design" depth="standard"}
:::

:::pyq{id="cse-2021-1-cs-28" tests="counter-trace,t-design" depth="standard"}
:::

:::pyq{id="cse-2026-1-cs-27" tests="saturating,d-design" depth="standard"}
:::

## Practice

Our own questions in GATE formats: deriving inputs first, then counting states and checking unused states, then timing and tracing.

:::practice{id="nx-dl-06-05-q01" depth="standard"}
:::

:::practice{id="nx-dl-06-05-q02" depth="standard"}
:::

:::practice{id="nx-dl-06-05-q03" depth="standard"}
:::

:::practice{id="nx-dl-06-05-q04" depth="standard"}
:::

:::practice{id="nx-dl-06-05-q05" depth="standard"}
:::

:::practice{id="nx-dl-06-05-q06" depth="standard"}
:::

:::practice{id="nx-dl-06-05-q07" depth="standard"}
:::

:::practice{id="nx-dl-06-05-q08" depth="standard"}
:::

:::practice{id="nx-dl-06-05-q09" depth="standard"}
:::

:::practice{id="nx-dl-06-05-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Synchronous counter design on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Synchronous binary counter | one clock; $T_0 = 1$, $T_i = Q_0 \cdots Q_{i-1}$ (bit $i$ toggles when all lower bits are 1) |
| $f_{\max}$ | $1/(t_{cq} + t_{\text{logic}} + t_{su})$; count gates only on paths ending at a flip-flop input (1991: 30 ns, ≈ 33.3 MHz) |
| Procedure | sequence → state table → input columns → K-maps (unused = don't-care) → circuit → self-start check |
| Input columns | D: $D = Q^+$; T: $T = Q \oplus Q^+$; JK: $J = Q^+$ on $Q = 0$ rows, $K = \overline{Q^+}$ on $Q = 1$ rows |
| Typical answers | 2004: $T_1 = Q_1 \oplus Q_2$; 1998: $D_2 = \overline{Q_1}Q_0$, $D_1 = \overline{Q_0}$, $D_0 = Q_1$; 1992 Gray: $D_0 = \overline{Q_2 \oplus Q_1}$ |
| Saturating | self-loop at the end; 2017: $T_1 = \overline{Q_1}Q_0$, $T_0 = \overline{Q_1} + \overline{Q_0}$; 2026: option B |
| Repeated values | states = positions: $\lceil \log_2 L \rceil$ flip-flops for minimal period $L$ (2015, 2016: 3) |
| Self-starting | every state reaches the main cycle ⇔ the main cycle is the only cycle of the **built** circuit |
| Lock-out | 0 → 3 → 5 → 6 with $J_A = K_A = Q_B$: 001 → 010 → 100 → 111 → 001; cure: force next states or pick another minimal cover |
| Tracing | all bits from the old state; 2014: 100, 110, 111; 2021: 011, 101, 000 (and 110 locks) |
| $T = \overline{Q}$ | sets once and holds; toggling needs $T = 1$ |
:::
