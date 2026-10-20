---
id: latches
subject: dl
chapter: sequential-circuits
title: "Feedback, latches and races"
order: 1
prerequisites: [gate-circuit-analysis]
pyq_topics: [dl/sequential]
est_minutes: 45
difficulty: core
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every stable state, latch output, oscillation, waveform and practice answer is produced by simulation in content/gate-notes/_checks/dl/l6_01_latches.py (seqlib: fixed points of each loop, gate-delay simulation of the latches)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 76–78, set B pp. 134–135, set C pp. 326–333, set E p. 406."
  - "Facts checked against: M. Morris Mano and M. D. Ciletti, Digital Design (SR and D latches, NAND latch, gated latches); J. F. Wakerly, Digital Design: Principles and Practices (bistable loops, the S = R = 1 release, metastability)."
  - "PYQs: src/gate/questions.json (cse-1991-b-5-a, cse-1993-ii-a-6-2, cse-1999-a-33, cse-2004-cs-18, it-2007-cs-7, cse-2023-cs-11); every key is re-derived from the loop's fixed points or by gate-delay simulation."
  - "cse-1993-ii-a-6-2: figure missing from the 1993 scan; as usually reproduced (GATE Overflow, cited by the bank's review note) it is a two-state machine with inputs a, b that oscillates for a = b = 0. The lesson's NOR gate fed back on itself is our own model of it, not the paper's figure."
updated: "2026-10-20"
---

*Storage elements, lesson 1 of 3.* Every circuit in Chapters 2 to 5 had a simple promise: tell me the
inputs now and I will tell you the outputs now. Nothing that happened a second ago mattered. That
promise is exactly what a computer cannot live with. A register must still hold a number after the
wires that wrote it have moved on; a counter must know where it was to know where to go next. This
chapter is about circuits that **remember**, and this first lesson finds the one ingredient that makes
memory possible: **feedback**, a wire that carries a circuit's output back into its own input. We will
learn to decide, for any loop, whether it settles, remembers or oscillates; build the classic one-bit
memories, the **SR latch** from NOR gates and from NAND gates; meet the input pair that is "forbidden"
and see, gate delay by gate delay, the **race** it causes; and tame the latch with an enable input,
ending with the **D latch** and the multiplexer-with-feedback that GATE 2023 asked about.

## Where this fits

[Chapter 2, Lesson 6](lesson:gate-circuit-analysis) taught you to evaluate a gate circuit line by line
and to count its propagation delay. Every circuit there was **acyclic**: you could order the gates so
that each one's inputs were already known. In [Chapter 5, Lesson 1](lesson:combinational-design) we
warned that a loop of gates breaks that rule and turns a circuit into a memory. This lesson is that warning taken
seriously. The latches built here are the raw material of [Lesson 2](lesson:flip-flops), where two of
them are combined into an edge-triggered flip-flop, and of everything after it in this chapter:
registers, counters and state machines are all flip-flops plus combinational logic.

:::table{#radar title="GATE radar: feedback, latches and races" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 6 (1991, 1993, 1999, 2004, IT 2007, 2023) |
| Marks | 2 one-mark MCQs (2004, 2023), 1 one-mark MCQ (IT 2007), 2 two-mark MSQs (1993, 1999), 1 descriptive part (1991) |
| Pattern 1 | Find the stable states of a loop: 1991 (majority loop), 1993 (a two-state machine that oscillates when a = b = 0), 1999 (AND chain) |
| Pattern 2 | NAND latch behaviour: 2004 (S = R = 0 gives Q = Q̄ = 1), IT 2007 (which input sequence oscillates) |
| Pattern 3 | Recognise a latch built from another block: 2023 (a multiplexer with feedback is a D latch) |
| What examiners test | That a stable state is a solution of Q = f(x, Q); that the forbidden input of a NOR latch is 11 but of a NAND latch is 00; that the trouble is releasing the forbidden input, not holding it; that a level-sensitive circuit is a latch, not a flip-flop |
:::

## Feedback: how a circuit remembers

:::intuition{#memory-intuition title="A doorbell and a light switch" depth="standard"}
A doorbell rings only while you press the button. Let go and it stops: the bell has no idea that anyone
ever pressed it. That is a combinational circuit, output now = function of input now. A light switch is
different. Flip it up and walk away: the light stays on. Flip it down and walk away: it stays off. The
switch **remembers the last thing you did to it**, even though nobody is touching it now.

How could gates, which only ever compute "output = function of inputs", behave like the switch? The
trick is to let a gate **see its own output**. If an OR gate's output is wired back to one of its inputs,
then once the output becomes 1, the gate is told "one of your inputs is 1", so it keeps saying 1, which
keeps telling it that an input is 1, and so on, forever. The circuit is now holding itself up by its own
bootstraps: the 1 is stored in the loop. Everything in this lesson is a careful version of that picture.
:::

:::definition{#feedback-def term="Feedback and sequential circuits" depth="standard"}
A circuit has **feedback** when some gate's output can reach one of that same gate's inputs through a
chain of wires and gates (the circuit graph has a **cycle**). The wire that closes the cycle is a
**feedback** or **loop** wire, and its value is a **state variable**, written $Q$.

A circuit with feedback is a **sequential circuit**: its output depends on its present inputs **and on
its past**, because the past is stored in the loop. A circuit with no cycle is **combinational**: its
outputs are a function of its present inputs alone ([Chapter 5, Lesson 1](lesson:combinational-design)
proves that).
:::

Notice what changes when we close a loop. In an acyclic circuit we can always compute the output: start
from the inputs and work forward. In a loop there is no "forward": to compute $Q$ we need $Q$. So the
question "what is the output?" turns into a different question, "which values of $Q$ are **consistent**
with themselves?". Those consistent values are the circuit's possible resting states.

:::definition{#stable-state term="Loop function and stable state" depth="standard"}
Cut the feedback wire. On one side of the cut the circuit receives a value $Q$ (the **present state**,
"Q in"); on the other side it produces a value $Q^+$ (the **next state**, "Q out"). Because the rest of
the circuit is acyclic, $Q^+$ is an ordinary Boolean function of the inputs $x$ and of $Q$:

$$Q^+ = f(x, Q),$$

the **loop function** (also called the next-state or excitation function).

A value $Q$ is a **stable state** for input $x$ when it reproduces itself: $f(x, Q) = Q$. When the
circuit sits in a stable state and the input does not change, nothing in the circuit changes. When
$f(x, Q) \neq Q$, the loop wire is about to change, one propagation delay later; the state is
**unstable** (transient).
:::

For a single loop wire there are only two candidate states, 0 and 1, and for a fixed input $x$ the
function $f(x, \cdot)$ of one variable $Q$ can only be one of four things: the constant 0, the constant 1,
$Q$ itself or $\overline{Q}$. Each gives a completely different kind of behaviour, and that is the whole
classification.

:::theorem{#stable-theorem name="The three behaviours of a single loop" depth="standard"}
Let a circuit have one feedback wire $Q$ with loop function $f(x, Q)$, and fix the input $x$.

1. If $f(x, \cdot)$ is a constant $c$ (0 or 1), the circuit has exactly **one** stable state, $Q = c$, and
   from either starting value it reaches it within one loop delay. The loop **forgets**: it acts like a
   combinational circuit with output $c$.
2. If $f(x, Q) = Q$, both $Q = 0$ and $Q = 1$ are stable. The circuit keeps whichever value it had: it is a
   **memory** for this input.
3. If $f(x, Q) = \overline{Q}$, **no** value is stable and the loop wire changes every loop delay: the
   circuit **oscillates**.

In terms of the two values $f(x, 0)$ and $f(x, 1)$: $Q = 0$ is stable iff $f(x, 0) = 0$, and $Q = 1$ is
stable iff $f(x, 1) = 1$.
:::

:::proof{#proof-stable of="the three behaviours of a single loop" depth="standard"}
**Idea first:** a function of one bit has only four possibilities; check each against the definition
"stable means $f(x, Q) = Q$".

By definition $Q = 0$ is stable iff $f(x, 0) = 0$ and $Q = 1$ is stable iff $f(x, 1) = 1$; this is the last
sentence of the theorem. Now list the four functions of one variable.

- $f(x, \cdot) \equiv 0$: $f(x, 0) = 0$ (so 0 is stable) and $f(x, 1) = 0 \ne 1$ (so 1 is not). Starting from
  $Q = 1$, the loop wire receives $f = 0$ one loop delay later and then stays there. Symmetrically for the
  constant 1. That is case 1.
- $f(x, Q) = Q$: $f(x, 0) = 0$ and $f(x, 1) = 1$, so both are stable, and a stable value never changes while
  $x$ is fixed. Case 2.
- $f(x, Q) = \overline{Q}$: $f(x, 0) = 1 \ne 0$ and $f(x, 1) = 0 \ne 1$, so neither is stable. Whatever $Q$ is,
  one loop delay later the wire carries its complement, and one delay after that the complement of that:
  $Q$ alternates for as long as $x$ is held. Case 3.

There are no other functions of one bit, so the three cases are exhaustive. ∎

**Sanity check.** An OR gate fed back on itself has $f(x, Q) = x + Q$: for $x = 1$ it is the constant 1
(case 1), for $x = 0$ it is $Q$ (case 2). A NOT gate fed back on itself has $f = \overline{Q}$ (case 3)
and indeed a lone inverter with its output tied to its input never settles.
:::

The theorem turns into a method you can apply to any loop, however many gates it passes through.

:::definition{#feedback-analysis term="Cutting the loop: the analysis method" depth="standard"}
To find the stable states of a circuit with one feedback wire:

1. **Cut** the feedback wire and call the value entering the circuit $Q$ (Q in) and the value leaving
   it $Q^+$ (Q out).
2. **Write** the loop function $Q^+ = f(x, Q)$ by ordinary combinational analysis.
3. For every input row $x$, **tabulate** $f(x, 0)$ and $f(x, 1)$.
4. **Read** the behaviour: $f(x, 0) = 0$ marks $Q = 0$ stable, $f(x, 1) = 1$ marks $Q = 1$ stable; both
   marked is memory, one marked is a constant, none is oscillation.

A circuit **holds** (remembers) on the input rows where both values are stable. In a GATE answer the
row is usually written "$Q_n$" or "$Q$ (unchanged)".
:::

The animation applies the method to the loop GATE 1991 asked about: three AND gates and an OR, with the
output fed back. The block computes $aQ + ab + bQ$, which is the **majority** of $a$, $b$ and $Q$.

:::viz{#feedback-stability-viz spec="feedback-stability" mode="animate" depth="standard"}
:::

:::trick{#trick-cut-loop title="Cut, try 0, try 1" depth="standard"}
For a one-wire loop you never need timing diagrams to find the stable states: cut the loop and evaluate
the circuit twice per input row, once with $Q = 0$ and once with $Q = 1$. A value that comes back unchanged
is stable. **Why it works:** a stable state is by definition a value that reproduces itself, and with one
loop wire there are only two candidates. **When it fails:** with two or more loop wires (the latches
below) you must try every combination of the loop wires, $2^k$ of them, and you also need timing to
decide what happens when no combination is stable or when several gates change at once.
:::

:::trap{#trap-odd-ring title="An odd number of inversions round the loop" depth="standard"}
If every input is held and the signal passes through an **odd** number of inversions on its way round
the loop, then $f = \overline{Q}$ and no state is stable: the circuit oscillates. The simplest case is a
ring of an odd number $k$ of inverters, the **ring oscillator**. A change travels round the ring in
$k\,t_{pd}$, comes back inverted, and must travel round again before the node returns to its first value,
so the period is $2k\,t_{pd}$ (derived below).

Examiners use the same idea in disguise. GATE 1993 asked when a two-state machine "should have a stable
state". The figure is missing from the paper; as usually reproduced, the machine leaves state 1 when
$a = 0$ and leaves state 2 when $b = 0$. With $a = b = 0$ it hops between the two states for ever, an
oscillation with no stable state; any 1 on $a$ or $b$ stops it in one state: $a + b = 1$. The tempting wrong
answer is the oscillating condition itself, $\overline{a + b} = 1$, picked by a student who reads "both
inputs 0" as "nothing is happening, so it must be resting".
:::

:::derivation{#ring-period of="the period of a ring oscillator" depth="standard"}
Take a ring of an odd number $k$ of inverters, each with propagation delay $t_{pd}$, and follow **one** change
round the loop.

1. Suppose node $n_0$ rises at time 0. The inverter it drives sees the change and, one $t_{pd}$ later, its output
   $n_1$ falls. One more $t_{pd}$ and $n_2$ rises, and so on: the change moves one node per gate delay.
2. After $k$ gate delays the change has passed through all $k$ inverters and arrives back at $n_0$. It has been
   inverted $k$ times, an odd number, so it arrives as a **fall**: $n_0$ falls at time $k\,t_{pd}$.
3. That fall now travels round in exactly the same way and comes back, inverted again, as a rise at time
   $2k\,t_{pd}$. The node is back where it started, in the same direction of change, so the pattern repeats.

One period is one rise plus one fall of the same node, which took two trips round the ring:

$$T = 2k\,t_{pd}, \qquad f = \frac{1}{2k\,t_{pd}}.$$

**Why "two trips" and not one.** After one trip the node has changed, but in the opposite direction; a period is
not complete until the waveform repeats, which needs the second, re-inverting trip. **Sanity check.** $k = 1$
is a single inverter (or the NOR gate of the 1993 model below with $a = b = 0$) driving itself: $T = 2t_{pd}$, so
the output changes every gate delay, which is exactly what the gate-delay simulation shows ($Q$ = 0, 1, 0, 1, …
one value per delay). And $k = 3$, $t_{pd} = 1$ ns gives $T = 6$ ns, the worked example further down.
:::

:::note{#recap-feedback title="Recap" depth="quick"}
A loop makes the output depend on itself, so we ask which values are self-consistent: $f(x, Q) = Q$. For
each input row a single loop is a constant, a memory ($f = Q$) or an oscillator ($f = \overline{Q}$). Cut
the loop, try $Q = 0$ and $Q = 1$, and read the stable values.
:::

### Worked examples: feedback analysis

::::example{#ex-fb-easy level="easy" title="An OR gate that eats its own output" depth="standard"}
An OR gate has inputs $x$ and $Q$, and its output is $Q$. Describe the circuit's behaviour.

:::step{why="Cutting the loop turns the circuit into an ordinary gate whose output we can compute."}
Loop function: $Q^+ = x + Q$.
:::

:::step{why="Each input row is examined with both possible loop values."}
$x = 0$: $f(0, 0) = 0$ and $f(0, 1) = 1$, so both values are stable (memory). $x = 1$: $f(1, Q) = 1$, so
only $Q = 1$ is stable (constant 1).
:::

:::step{why="Putting the rows together tells the story of the circuit over time."}
Starting at $Q = 0$ with $x = 0$, the output stays 0. The first time $x$ becomes 1, $Q$ becomes 1. When $x$
returns to 0, the row is "memory" and $Q$ stays 1. Nothing can ever bring it back to 0.
:::

:::answer
It is a **"once 1, always 1" latch**: $x = 1$ sets $Q$ to 1, $x = 0$ holds, and there is no way to reset it.
(A real latch needs a second input to clear it; that is the SR latch below.)
:::
::::

::::example{#ex-fb-1991 level="medium" title="The majority loop (GATE 1991 pattern)" depth="standard"}
Three 2-input AND gates compute $aQ$, $ab$ and $bQ$; a 3-input OR combines them and its output is $Q$,
which is fed back to the first and third AND gates. Complete the table of $Q_n$ (the settled output) for
$ab$ = 00, 01, 10, 11.

:::step{why="The loop function is read straight off the circuit once the feedback wire is cut."}
$Q^+ = aQ + ab + bQ$, the majority of $a$, $b$, $Q$: it is 1 when at least two of the three are 1.
:::

:::step{why="For each input pair we evaluate the function with Q = 0 and with Q = 1."}
$ab = 00$: $f = 0$ for both $Q$, so only $Q = 0$ is stable. $ab = 11$: $f = 1$ for both, so only $Q = 1$ is
stable.
:::

:::step{why="When a ≠ b the vote is decided by Q itself, which is the memory case."}
$ab = 01$: $f = bQ = Q$, so $f(\cdot, 0) = 0$ and $f(\cdot, 1) = 1$: both stable, the loop holds its value. The
same for $ab = 10$ ($f = aQ = Q$).
:::

:::answer
| $a$ | $b$ | $Q_n$ |
|:--:|:--:|:--:|
| 0 | 0 | 0 |
| 0 | 1 | $Q$ (unchanged) |
| 1 | 0 | $Q$ (unchanged) |
| 1 | 1 | 1 |

The circuit is a latch that is set by 11, reset by 00 and holds on 01 and 10.
:::
::::

::::example{#ex-fb-1999 level="gate" title="The AND chain with feedback (GATE 1999 pattern)" depth="standard"}
Three 2-input AND gates form a chain: $g_1 = A \cdot Y$, $g_2 = g_1 \cdot B$, $Y = g_2 \cdot C$, and $Y$ is fed
back into $g_1$. In a certain steady state $Y = 1$. What can $A$, $B$, $C$ be?

:::step{why="The chain collapses to one loop function, because AND is associative."}
Cut at $Y$: $Y^+ = A\,B\,C\,Y$.
:::

:::step{why="A steady state with Y = 1 must reproduce itself: f(x, 1) = 1."}
$f(A, B, C, 1) = ABC$. This equals 1 only for $A = B = C = 1$.
:::

:::step{why="Checking the other options rules them out one by one, as an MSQ demands."}
With any of $A$, $B$, $C$ equal to 0 the loop function is the constant 0, so $Y = 1$ would become 0 within
one trip round the loop: not a steady state. (With $A = B = C = 1$ the function is $Y$ itself, so $Y = 0$ is
also steady; the question only asks about $Y = 1$.)
:::

:::answer
Only $A = B = C = 1$. The circuit is a memory for that input (it keeps whatever $Y$ it has) and is forced to
$Y = 0$ by any 0 on $A$, $B$ or $C$.
:::
::::

::::example{#ex-fb-1993 level="gate" title="Edge case: a NOR gate fed back on itself (the 1993 idea as a gate loop)" depth="standard"}
GATE 1993 gave a two-state machine with inputs $a$ and $b$ (figure missing from the paper) and asked for the
restriction on the inputs under which it has a stable state. Here is our own gate-level version of the same
idea: a 3-input NOR gate has inputs $a$, $b$ and its own output $Q$. What restriction on the inputs makes the
circuit have a stable state? Then check the answer against the two-state machine.

:::step{why="Cut the loop to get an ordinary function of the inputs and Q."}
$Q^+ = \overline{a + b + Q}$.
:::

:::step{why="Splitting on a + b separates the controlled case from the free-running one."}
If $a + b = 1$, a 1 is on a NOR input, so $Q^+ = 0$ whatever $Q$ is: the constant 0, stable state $Q = 0$.
:::

:::step{why="With a + b = 0 the gate is just an inverter of its own output."}
If $a + b = 0$, $Q^+ = \overline{Q}$: an odd ring of length one. Neither value is stable; the output flips
every gate delay.
:::

:::step{why="The paper's machine is a state diagram, not a gate, so we read its stable states straight off the arcs: a state is stable when no arc leaves it for the present input."}
As usually reproduced, the 1993 machine leaves state 1 when $a = 0$ and leaves state 2 when $b = 0$. For
$ab = 00$ both states have an arc out, so it hops 1, 2, 1, 2, … for ever: no stable state. For $ab = 10$ state 1
has no arc out (stable) and state 2 leaves for state 1; for $ab = 01$ state 2 is stable; for $ab = 11$ both are.
So a stable state exists exactly when $a + b = 1$, the same condition as the NOR loop.
:::

:::answer
A stable state exists exactly when $a + b = 1$ (and then $Q = 0$ for the NOR loop). Writing the condition as
$\overline{a}\,\overline{b} = 0$ says the same thing. Both readings, the gate loop and the two-state machine,
oscillate only for $a = b = 0$, so the 1993 key (B, $a + b = 1$) does not depend on which one is drawn.
:::
::::

## The SR latch

:::intuition{#sr-intuition title="Two people holding each other up" depth="standard"}
Picture two people standing back to back, each told: "stand up unless your partner is standing". If A
stands, B sits; B sitting lets A keep standing. That arrangement is stable. The opposite arrangement
(B up, A down) is just as stable. So the pair has **two** resting states and stays in whichever one it
is in: a memory of one bit.

To make it useful we need a way to choose the state. Give the pair two buttons: **Set** holds B down, so A
stands; **Reset** holds A down, so B stands. Press nothing and the pair keeps its state. Press both and
both are held down at once, which breaks the "exactly one is standing" rule; let both buttons go at the
same instant and both try to stand at once, see each other standing, both sit, and so on. That is the forbidden input and its race, and we will watch it happen gate by gate.
:::

:::definition{#sr-nor term="The NOR SR latch" depth="standard"}
Two NOR gates are **cross-coupled**: the output of each is one input of the other.

- Gate 1 has inputs $R$ and $\overline{Q}$; its output is $Q = \overline{R + \overline{Q}}$.
- Gate 2 has inputs $S$ and $Q$; its output is $\overline{Q} = \overline{S + Q}$.

$S$ (set) and $R$ (reset) are **active high**: a 1 on $S$ makes $Q = 1$, a 1 on $R$ makes $Q = 0$, and
$S = R = 0$ leaves the latch holding its last value. There are two loop wires ($Q$ and $\overline{Q}$),
but in normal use they carry complementary values, which is why the second one is named $\overline{Q}$.
:::

Why does it work? A 1 is the **controlling** value of a NOR gate: one 1 on any input forces the output to
0, whatever the other input is. So $S = 1$ forces $\overline{Q} = 0$; then gate 1 sees $R = 0$ and
$\overline{Q} = 0$, so $Q = 1$. With $S = R = 0$ each NOR simply inverts the other's output, and the two
inverters in a ring form an **even** loop: two stable states, $Q\overline{Q} = 10$ and $01$, exactly the
memory case of the theorem.

The latch has **two** loop wires, so the "cut, try 0, try 1" trick becomes "cut both, try all four". It is worth
doing once by hand, because every row of the latch's table, including the forbidden one, falls out of it.

:::derivation{#sr-fixed-points of="the stable states of the NOR latch" depth="standard"}
Cut both feedback wires. Call the values arriving at the gates $Q$ and $\overline{Q}$ (the present state, written
as a pair $Q\overline{Q}$) and compute what the gates produce: $Q^+ = \overline{R + \overline{Q}}$ and
$\overline{Q}{}^+ = \overline{S + Q}$. A pair is stable when the gates reproduce it exactly.

| $SR$ | from 00 | from 01 | from 10 | from 11 | stable pairs |
|:--:|:--:|:--:|:--:|:--:|:--|
| 00 | 11 | 01 | 10 | 00 | 01 and 10 (memory) |
| 01 | 01 | 01 | 00 | 00 | 01 only (reset) |
| 10 | 10 | 00 | 10 | 00 | 10 only (set) |
| 11 | 00 | 00 | 00 | 00 | 00 only (forbidden) |

Each entry is two NOR evaluations. For example, $SR = 00$ from $Q\overline{Q} = 00$: $Q^+ = \overline{0 + 0} = 1$ and
$\overline{Q}{}^+ = \overline{0 + 0} = 1$, so the gates produce 11, which differs from 00: not stable.

**Reading the table.** For $SR = 00$ two pairs reproduce themselves, which is the memory; the pairs 00 and 11 are
not stable and turn into each other (00 → 11 → 00), and that two-cycle is exactly the race we meet below. For
$SR = 01$ and $10$ there is one stable pair, the reset and set states. For $SR = 11$ the only stable pair is 00, so
the forbidden input is perfectly stable, it just is not a pair of complements. **Sanity check.** The fixed points
found by `seqlib.fixed_points` on the two-NOR netlist are exactly the last column.
:::

:::table{#sr-table title="Characteristic table of the NOR SR latch" depth="standard"}
| $S$ | $R$ | $Q^+$ | $\overline{Q}{}^+$ | Action |
|:--:|:--:|:--:|:--:|:--|
| 0 | 0 | $Q$ | $\overline{Q}$ | hold (memory) |
| 0 | 1 | 0 | 1 | reset |
| 1 | 0 | 1 | 0 | set |
| 1 | 1 | 0 | 0 | forbidden: both outputs 0 |
:::

:::derivation{#sr-equation of="the SR characteristic equation" depth="standard"}
Write $Q^+$ as a function of $S$, $R$ and the present $Q$ from the first three rows, treating the forbidden
row $SR = 11$ as a don't-care (we promise never to use it):

| $S$ | $R$ | $Q$ | $Q^+$ |
|:--:|:--:|:--:|:--:|
| 0 | 0 | 0 | 0 |
| 0 | 0 | 1 | 1 |
| 0 | 1 | 0 | 0 |
| 0 | 1 | 1 | 0 |
| 1 | 0 | 0 | 1 |
| 1 | 0 | 1 | 1 |
| 1 | 1 | – | x |

The 1s are at $(S, R, Q)$ = 001, 100, 101; with 110 and 111 as don't-cares, a 3-variable K-map groups 100,
101, 110, 111 as $S$ and 001 with 101 as $\overline{R}Q$:

$$Q^+ = S + \overline{R}\,Q, \qquad \text{with the constraint } S R = 0.$$

**Sanity check.** $S = 1$: $Q^+ = 1$ (set). $S = 0, R = 1$: $Q^+ = 0$ (reset). $S = R = 0$: $Q^+ = Q$ (hold).
:::

The animation runs a NOR latch one gate delay per column through set, hold, reset, hold, the forbidden
pair, and then the moment that pair is released.

:::viz{#sr-latch-viz spec="sr-latch-feedback" mode="animate" depth="standard"}
:::

:::definition{#forbidden term="The forbidden input" depth="standard"}
For a NOR latch, $S = R = 1$ is called **forbidden** (or "not allowed", "invalid"). While it is applied, both
gates see a controlling 1 and **both outputs are 0**, so $Q$ and $\overline{Q}$ are no longer complements
and the name $\overline{Q}$ is a lie. That state is perfectly stable while the inputs are held. The real
problem is what happens **next**: if both inputs return to 0 at the same moment, the next state cannot be
predicted.
:::

To say exactly what "cannot be predicted" means we need to be precise about how a gate delays a signal, because
the race is decided by pulses only one gate delay long. [Chapter 2, Lesson 6](lesson:gate-circuit-analysis) used
two models of delay, and they disagree about such short pulses.

:::note{#delay-models title="Two ways a gate can delay a signal" depth="standard"}
- **Transport delay** $d$: the output is the input waveform shifted later by $d$, exactly. Every pulse gets through,
  however short. It is the simplest model and the one a hand trace "one gate delay per column" uses.
- **Inertial delay** $d$: the output also follows the input $d$ later, but a pulse **shorter than $d$ is swallowed**. A
  real gate behaves like this because its output node has capacitance: a brief input change starts to charge or
  discharge it, and if the input changes back before the output has crossed the switching threshold, the output
  never makes the swing.

For a combinational circuit the choice changes only how many glitches you see. For a latch it can change the final
**state**, because a glitch that gets through goes round the loop and is stored. The release race below is exactly
such a case: one gate produces a pulse one delay long, and whether that pulse survives decides between "settles"
and "keeps oscillating".
:::

:::theorem{#race-theorem name="The release race of an SR latch" depth="standard"}
A NOR latch sits at $S = R = 1$ (so $Q = \overline{Q} = 0$) and both inputs drop to 0 together.

1. If the two gates have **equal** delays, the latch **oscillates**: $Q\overline{Q}$ goes 00 → 11 → 00 → 11 …
   and never settles (in an ideal model).
2. If the delays differ and the gates have **inertial** delay (as real gates do: a pulse shorter than the gate
   delay is swallowed), the latch settles, and the **faster** gate decides the state: the output of the faster
   gate goes to 1 and stays there.

Because real delays are not known, the final state after the release is **unpredictable**. The same holds
for the NAND latch released from $\overline{S}\,\overline{R} = 00$ to $11$, with every level inverted.
:::

:::proof{#proof-race of="the release race" depth="standard"}
**Idea first:** after the release both gates see the same thing and want to do the same thing; with equal
delays they keep doing it in step.

After the release both gates are NOR gates with one input 0, so each is an inverter of the other's output:
$Q^+ = \overline{\overline{Q}}$ and $\overline{Q}{}^+ = \overline{Q}$ computed from the old values.

*Equal delays.* At the moment of release both outputs are 0. One delay later each gate has computed the NOR
of $0$ and $0$, so both outputs are 1. One delay after that each gate sees a 1 and outputs 0. The pair of
outputs is always equal, so the pattern 00, 11, 00, … repeats with period two gate delays; neither of the
two stable states (10 and 01) is ever reached.

*Unequal delays.* Say the $Q$ gate has delay $d_1$ and the $\overline{Q}$ gate $d_2 > d_1$. At time $d_1$ the $Q$
gate output rises to 1. The $\overline{Q}$ gate's input $Q$ is now 1, so its own computation now says 0; a real
gate does not pass a pulse shorter than its delay (inertial delay), so its output never rises, and the
latch rests in $Q\overline{Q} = 10$, a stable state. If $d_2 < d_1$, the same argument gives $01$. So the result
is decided by which gate is faster, which a designer cannot control. ∎

With ideal **transport** delays (every pulse is passed on, however short) the unequal case also keeps oscillating:
the $\overline{Q}$ gate's 1, computed before it saw the new $Q$, does get out, and the pair then cycles 00, 10, 11, 00, …
for ever (`seqlib.latch_run` with `inertial=False` and delays 1 and 2). In neither model can the designer predict
the final state, which is the only conclusion GATE needs.

**Check by simulation.** `seqlib.latch_run` drives the NOR latch with $SR$ = 11 then 00: with equal delays the
outputs read 00, 11, 00, 11 for as long as the simulation runs; with delays 1 and 2 (inertial) they settle at
10, and with 2 and 1 at 01.
:::

::::example{#ex-race-unequal level="medium" title="The release race with unequal delays, step by step" depth="standard"}
A NOR latch has a $Q$ gate with delay 1 ns and a $\overline{Q}$ gate with delay 2 ns. It holds $SR = 11$ (so
$Q\overline{Q} = 00$), and at $t = 0$ both inputs drop to 0. Trace $Q\overline{Q}$ with inertial gates, then with transport
gates.

:::step{why="Right after the release each gate sees 0 on both inputs, so each starts to switch its output to 1."}
At $t = 0$ both gates compute $\overline{0 + 0} = 1$. The $Q$ gate will deliver its 1 at 1 ns, the $\overline{Q}$ gate at 2 ns.
:::

:::step{why="The faster gate's output arrives first and changes what the slower gate is computing."}
At 1 ns, $Q = 1$. From that moment the $\overline{Q}$ gate sees $Q = 1$ and computes $\overline{0 + 1} = 0$. Its output
"wanted" to be 1 from 2 ns, but the reason for that 1 (inputs 0, 0) lasted only 1 ns, shorter than its 2 ns delay.
:::

:::step{why="With inertial delay a cause shorter than the gate delay is swallowed, so the slow gate never rises."}
Inertial: $\overline{Q}$ stays 0. The state is $Q\overline{Q} = 10$ from 1 ns on, and re-evaluating both gates gives 10 again:
stable, set.
:::

:::step{why="With transport delay the 1 computed between 0 and 1 ns is delivered anyway, and it travels round the loop."}
Transport: $\overline{Q}$ rises at 2 ns (from the 0–1 ns computation) and falls at 3 ns (from the computation that saw
$Q = 1$). That 1 ns pulse on $\overline{Q}$ reaches the $Q$ gate, which drops $Q$ at 3 ns, and the pattern 00, 10, 11, 00, …
keeps going with a period of 3 ns.
:::

:::answer
Inertial gates: the faster $Q$ gate wins and the latch settles at $Q = 1$. Transport gates: the latch keeps
oscillating. Swap the delays and the inertial latch settles at $Q = 0$ instead. Either way a designer who does not
control the delays cannot know the outcome, which is why the release of the forbidden input is banned rather than
analysed.
:::
::::

:::trap{#trap-forbidden title="The danger is the release, not the 11 itself" depth="standard"}
Students often say "S = R = 1 makes the latch oscillate". It does not: while $S = R = 1$ is held, a NOR latch
sits quietly at $Q = \overline{Q} = 0$. Two different things are wrong with the forbidden input:

- while it is held, the outputs are **not complementary** (both 0 for NOR, both 1 for NAND);
- when it is **released by both inputs at once**, the latch **races** and its final state is unpredictable
  (and with matched delays it can oscillate).

If only one input is released (11 → 10 or 11 → 01), the latch simply sets or resets: no race. GATE IT 2007
offered four two-step sequences; only the one that leaves the forbidden pair with both inputs changing
together can oscillate.
:::

:::note{#recap-sr title="Recap" depth="quick"}
Two cross-coupled NORs store a bit: 10 sets, 01 resets, 00 holds, $Q^+ = S + \overline{R}Q$ with $SR = 0$.
$S = R = 1$ makes both outputs 0; releasing it with both inputs at once starts a race that equal delays
turn into oscillation and unequal delays (inertial gates) turn into an unpredictable state.
:::

## The NAND latch

:::intuition{#nand-intuition title="The same latch, with the levels flipped" depth="standard"}
A NAND gate is a NOR gate seen in a mirror that swaps 0 and 1 (De Morgan: $\overline{ab} = \overline{a} +
\overline{b}$). So a pair of cross-coupled NAND gates must behave like a NOR latch with **every input and every
level inverted**. Where the NOR latch is woken by a 1, the NAND latch is woken by a **0**: its inputs are
"active low", and when both inputs are idle they sit at 1. The forbidden pair flips too, from 11 to 00, and
the outputs it forces flip from 00 to 11.
:::

:::definition{#nand-latch term="The NAND SR latch (active-low inputs)" depth="standard"}
Two NAND gates are cross-coupled: $Q = \overline{\overline{S} \cdot \overline{Q}}$ and
$\overline{Q} = \overline{\overline{R} \cdot Q}$, where $\overline{S}$ and $\overline{R}$ are the two inputs.

| $\overline{S}$ | $\overline{R}$ | $Q^+$ | $\overline{Q}{}^+$ | Action |
|:--:|:--:|:--:|:--:|:--|
| 1 | 1 | $Q$ | $\overline{Q}$ | hold |
| 1 | 0 | 0 | 1 | reset |
| 0 | 1 | 1 | 0 | set |
| 0 | 0 | 1 | 1 | forbidden: both outputs 1 |

A 0 is the controlling value of NAND, so $\overline{S} = 0$ forces $Q = 1$ (set) and $\overline{R} = 0$ forces
$\overline{Q} = 1$ (reset). Many books and question papers still call the inputs "S" and "R" for this latch; read
the question to see whether the inputs are active low.
:::

:::viz{#nand-latch-viz spec="nand-latch" mode="animate" depth="standard"}
:::

:::table{#nor-vs-nand title="NOR latch and NAND latch side by side" depth="standard"}
| | NOR latch | NAND latch |
|:--|:--|:--|
| Input polarity | active high ($S$, $R$) | active low ($\overline{S}$, $\overline{R}$) |
| Hold | $SR = 00$ | $\overline{S}\,\overline{R} = 11$ |
| Set ($Q = 1$) | $SR = 10$ | $\overline{S}\,\overline{R} = 01$ |
| Reset ($Q = 0$) | $SR = 01$ | $\overline{S}\,\overline{R} = 10$ |
| Forbidden input | $SR = 11$ | $\overline{S}\,\overline{R} = 00$ |
| Outputs on the forbidden input | $Q = \overline{Q} = 0$ | $Q = \overline{Q} = 1$ |
| Sequence that can oscillate | $11 \to 00$ | $00 \to 11$ |
:::

:::trick{#trick-active-low title="NAND latch: think “0 does the work”" depth="standard"}
For a NAND latch, read each input as "is this button pressed?" with **pressed = 0**. $\overline{S} = 0$ presses set,
$\overline{R} = 0$ presses reset, 11 presses nothing (hold), 00 presses both (forbidden, and both outputs go to 1
because a pressed NAND input forces a 1). **Why it works:** 0 is the controlling value of NAND, exactly as 1 is
of NOR. **When it fails:** if a question has already put inverters in front of a NAND latch (a "NAND latch with
active-high S and R"), the external inputs are active high again and the NOR table applies to them.
:::

:::trap{#trap-nand-00 title="“Indeterminate” is not the answer to S = R = 0 on a NAND latch" depth="standard"}
GATE 2004 asked what happens when both inputs of a NAND latch are 0, and offered "indeterminate states" next
to "Q = 1, Q′ = 1". While 00 is applied the state is completely **determinate**: both NANDs see a 0 and both
output 1. "Indeterminate" describes what happens **after** 00 is released to 11, which the question did not
ask. The mirror trap waits on the NOR latch: $S = R = 1$ gives $Q = Q' = 0$, not "indeterminate".

GATE IT 2007 asked which input **sequence** may lead to oscillation. The sequence must go **into** the
forbidden state and then **leave** it with both inputs changing together: 00, 11. The sequences 01 → 10 and
10 → 01 are ordinary set/reset changes, and 11 → 00 (hold, then forbidden) ends in a stable state.
:::

:::note{#recap-nand title="Recap" depth="quick"}
The NAND latch is the NOR latch with every level inverted: inputs active low, 11 holds, 01 sets, 10 resets, 00
forbidden with $Q = \overline{Q} = 1$, and the release 00 → 11 races.
:::

### Worked examples: SR and NAND latches

::::example{#ex-sr-easy level="easy" title="Tracing a NOR latch" depth="quick"}
A NOR latch starts with $Q = 0$. The inputs $SR$ are 10, 00, 01, 00, each held long enough to settle. Give $Q$
after each.

:::step{why="10 is the set input: S forces Q̄ to 0, which lets Q rise."}
$SR = 10$: $Q = 1$.
:::

:::step{why="00 is hold: each NOR inverts the other, so the stored value feeds itself."}
$SR = 00$: $Q$ stays 1.
:::

:::step{why="01 resets; the following 00 holds the new value."}
$SR = 01$: $Q = 0$. $SR = 00$: $Q$ stays 0.
:::

:::answer
$Q$ = 1, 1, 0, 0. The latch always shows the last input that was active.
:::
::::

::::example{#ex-sr-medium level="medium" title="Tracing a NAND latch, gate by gate" depth="standard"}
A NAND latch starts with $Q = 0$, $\overline{Q} = 1$. Apply $\overline{S}\,\overline{R}$ = 01 and follow the gates delay by
delay; then apply 11.

:::step{why="Only gates whose inputs changed can change; the first to move is the Q gate, which sees S̄ = 0."}
Delay 1: $Q = \overline{\overline{S}\cdot\overline{Q}} = \overline{0 \cdot 1} = 1$. The $\overline{Q}$ gate still sees the old $Q = 0$:
$\overline{Q} = \overline{1 \cdot 0} = 1$.
:::

:::step{why="The Q̄ gate now sees the new Q = 1 and responds one delay later."}
Delay 2: $\overline{Q} = \overline{\overline{R} \cdot Q} = \overline{1 \cdot 1} = 0$. Now $Q\overline{Q} = 10$, and evaluating both gates again gives
the same values: stable.
:::

:::step{why="11 is hold for a NAND latch: neither input forces anything, so the loop keeps its value."}
$\overline{S}\,\overline{R} = 11$: $Q = \overline{1 \cdot 0} = 1$, $\overline{Q} = \overline{1 \cdot 1} = 0$, unchanged.
:::

:::answer
After 01 the latch is set ($Q = 1$, reached after two gate delays) and 11 holds it. Notice the brief moment
(delay 1) when both outputs were 1: setting a latch always passes through such a transient.
:::
::::

::::example{#ex-sr-2004 level="gate" title="Both inputs 0 on a NAND latch (GATE 2004 pattern)" depth="standard"}
In an SR latch made by cross-coupling two NAND gates, both inputs are set to 0. What are the outputs?

:::step{why="0 is the controlling value of NAND, so each gate's output is decided by its external input alone."}
The $Q$ gate has an input 0, so $Q = 1$. The $\overline{Q}$ gate has an input 0, so $\overline{Q} = 1$.
:::

:::step{why="A state is stable when re-evaluating the gates gives the same values."}
With $Q = \overline{Q} = 1$ fed back, each gate still has its external 0 and still outputs 1: the state is stable
while the inputs are held.
:::

:::answer
$Q = 1$, $\overline{Q} = 1$ (GATE 2004, option C). It is the forbidden input because the outputs are not
complements, but it is not indeterminate while it lasts.
:::
::::

::::example{#ex-sr-it2007 level="gate" title="Edge case: which sequence oscillates? (GATE IT 2007 pattern)" depth="standard"}
A NAND latch receives two input pairs $\overline{S}\,\overline{R}$ in succession. Which of 11 → 00, 01 → 10, 10 → 01, 00 → 11 may
lead to oscillation?

:::step{why="Oscillation needs a symmetric start (both outputs equal) and a symmetric push (both inputs change together)."}
Only the forbidden input 00 gives a symmetric state, $Q = \overline{Q} = 1$. So the first pair must be 00.
:::

:::step{why="From Q = Q̄ = 1, releasing both inputs makes each NAND see 1, 1."}
00 → 11: each gate computes $\overline{1 \cdot 1} = 0$, so both outputs fall together; then each sees a 0 and both rise
together. With equal delays the outputs alternate 11, 00, 11, …
:::

:::step{why="The other sequences start from a set, reset or hold state, which is not symmetric."}
01 → 10 and 10 → 01 are a set followed by a reset (or the reverse): each ends in a stable state. 11 → 00 ends
**in** the forbidden state, which is stable while held.
:::

:::answer
Only 00 → 11 (IT 2007, option D). The gate-delay simulation of a NAND latch with equal delays confirms it:
after 00 → 11 the outputs never settle.
:::
::::

## Gated latches and the D latch

:::intuition{#gated-intuition title="A door in front of the buttons" depth="standard"}
A bare SR latch reacts the instant its inputs change. In a big system we want the opposite: let the inputs
wobble while the logic in front of them settles, and only then let the latch look. So we put a door in front of
the buttons. While the door (the **enable** or **clock** input) is shut, pressing $S$ or $R$ does nothing and the
latch holds; while it is open, the latch behaves like a normal SR latch. And if we arrange the two buttons so that
exactly one of them is always pressed, the forbidden combination can never happen: that is the **D latch**, a
latch that simply copies one data input while the door is open.
:::

:::definition{#gated-latch term="Gated (clocked) SR latch" depth="standard"}
A **gated SR latch** adds an enable input $C$ (also called clock, $G$ or $EN$): the latch receives $S \cdot C$ and
$R \cdot C$ instead of $S$ and $R$. With $C = 0$ both internal inputs are 0 and the latch holds; with $C = 1$ it
follows the SR table. A common realisation uses four NAND gates: two input NANDs compute $\overline{S\,C}$ and
$\overline{R\,C}$ and drive a NAND latch, which wants active-low inputs, so the external $S$ and $R$ are active high
again.

Characteristic equation: $Q^+ = C(S + \overline{R}Q) + \overline{C}\,Q$, with $SR = 0$ whenever $C = 1$ (derived
next).
:::

:::derivation{#gated-sr-equation of="the gated SR latch equation" depth="standard"}
The inner latch is an ordinary SR latch, so it obeys $Q^+ = S' + \overline{R'}\,Q$ for whatever inputs $S'$, $R'$ actually
reach it. The gating makes those inputs $S' = S\,C$ and $R' = R\,C$. Substitute:

$$Q^+ = C\,S + \overline{C\,R}\;Q.$$

Now open the complement with De Morgan, $\overline{C\,R} = \overline{C} + \overline{R}$, and distribute:

$$Q^+ = C\,S + \overline{C}\,Q + \overline{R}\,Q.$$

The last term needs one more step to show the role of $C$ clearly. Split it on $C$: $\overline{R}\,Q = C\,\overline{R}\,Q +
\overline{C}\,\overline{R}\,Q$, and the second piece is absorbed by $\overline{C}\,Q$ (absorption, $\overline{C}Q + \overline{C}\,\overline{R}Q =
\overline{C}Q$). What is left groups by $C$:

$$Q^+ = C\,(S + \overline{R}\,Q) + \overline{C}\,Q.$$

The inner latch's constraint $S'R' = 0$ becomes $S\,R\,C = 0$: $S = R = 1$ is harmless while $C = 0$ (both inner inputs are
0) and forbidden only while $C = 1$.

**Sanity check.** $C = 0$: $Q^+ = Q$, hold whatever $S$ and $R$ do. $C = 1$: $Q^+ = S + \overline{R}Q$, the plain SR latch.
That is the whole meaning of an enable: a switch between "hold" and "behave like the latch", which is why the equation
has the form $C \cdot (\text{latch}) + \overline{C} \cdot Q$.
:::

:::definition{#d-latch term="The D latch" depth="standard"}
A **D latch** is a gated SR latch with $S = D$ and $R = \overline{D}$ (one inverter). While $C = 1$ the latch is
**transparent**: $Q$ follows $D$, with a propagation delay. While $C = 0$ it holds the value $D$ had when $C$ fell.
Because $S$ and $R$ are complements, $S = R = 1$ can never occur: **the D latch has no forbidden input**.
:::

Two practical points follow from the definition, and both come back in Lesson 2. First, **which value is held**:
the latch keeps the value $D$ had as $C$ fell, so whatever logic drives $D$ must have finished settling a little
before that moment. Second, **what can go wrong**: if $D$ changes at the very instant $C$ falls, the inner SR latch
is being told "set" and "reset" in quick succession just as its inputs are disconnected, the same symmetric push as
the release race, and the held value is not guaranteed. Lesson 2 turns "a little before" and "a little after" into
the setup and hold times. The D latch removed the forbidden **input**; it did not remove the race at the closing
**instant**.

:::theorem{#d-latch-theorem name="Characteristic equation of the D latch" depth="standard"}
$$Q^+ = C\,D + \overline{C}\,Q.$$
:::

:::proof{#proof-d-latch of="the D latch equation" depth="standard"}
**Idea first:** substitute $S = D$, $R = \overline{D}$ into the gated SR equation and simplify.

From the gated SR latch, $Q^+ = C(S + \overline{R}\,Q) + \overline{C}\,Q$. With $S = D$ and $\overline{R} = D$:
$C(D + D\,Q) + \overline{C}\,Q = C\,D(1 + Q) + \overline{C}\,Q = C\,D + \overline{C}\,Q$ (absorption, $1 + Q = 1$). The constraint
$SR = D\overline{D} = 0$ holds automatically. ∎

**Sanity check.** $C = 1$: $Q^+ = D$ (transparent). $C = 0$: $Q^+ = Q$ (hold). This is exactly a 2:1 multiplexer
choosing between $Q$ and $D$ with select $C$, which is the next idea.
:::

The equation $Q^+ = C\,D + \overline{C}\,Q$ is the equation of a **2:1 multiplexer** with select $C$, data input 1 equal to
$D$ and data input 0 equal to $Q$. So a multiplexer whose output is fed back to its own data input 0 **is** a D latch.

:::definition{#mux-latch term="The multiplexer latch" depth="standard"}
Take a 2:1 MUX, $Y = \overline{S}\,I_0 + S\,I_1$. Wire its output $Y$ back to $I_0$ and the data $D$ to $I_1$. Then
$Y^+ = S\,D + \overline{S}\,Y$: a D latch enabled by $S$ (transparent while $S = 1$, holding while $S = 0$). Swapping the
two data inputs gives a latch enabled by $\overline{S}$. The MUX latch is how latches are often built inside FPGAs and
standard-cell libraries, and it is the circuit of GATE 2023.
:::

:::viz{#mux-latch-viz spec="mux-latch" mode="animate" depth="standard"}
:::

:::trap{#trap-dff-vs-latch title="A level-sensitive circuit is a latch, not a flip-flop" depth="standard"}
GATE 2023 offered both "D flip-flop" and "D latch" for the MUX circuit. The MUX passes $D$ **for as long as**
$S = 1$, so a change of $D$ in the middle of that interval reaches $Q$ at once: the circuit is **level-sensitive**
(transparent), which is the definition of a latch. A flip-flop changes only at a clock **edge** and ignores $D$ at
all other times; one MUX cannot do that (it takes two latches, Lesson 2). The other two options are combinational
blocks, which have no memory at all: a half adder and a demultiplexer have no feedback.
:::

:::note{#recap-gated title="Recap" depth="quick"}
An enable input gates S and R: $C = 0$ holds, $C = 1$ follows the inputs. With $S = D$, $R = \overline{D}$ we get the D
latch, $Q^+ = CD + \overline{C}Q$, which has no forbidden input and is exactly a 2:1 MUX with its output fed back.
:::

### Worked examples: gated and D latches

::::example{#ex-d-easy level="easy" title="A D latch waveform" depth="quick"}
A D latch starts at $Q = 0$. In four equal intervals, $C$ = 1, 0, 1, 0 and $D$ = 1, 0, 0, 1. Find $Q$ in each
interval (ignore delays).

:::step{why="While C = 1 the latch is transparent and copies D."}
Interval 1: $C = 1$, $Q = D = 1$.
:::

:::step{why="While C = 0 the latch holds the value it had when C fell."}
Interval 2: $C = 0$, hold $Q = 1$ (the $D = 0$ is ignored).
:::

:::step{why="The same two rules apply to the remaining intervals."}
Interval 3: $C = 1$, $Q = 0$. Interval 4: $C = 0$, hold $Q = 0$ (the $D = 1$ is ignored).
:::

:::answer
$Q$ = 1, 1, 0, 0.
:::
::::

::::example{#ex-d-medium level="medium" title="A gated SR latch given S = R = 1 while enabled" depth="standard"}
A gated SR latch built from four NAND gates (two input NANDs computing $\overline{SC}$ and $\overline{RC}$, then a NAND latch)
has $S = R = 1$. Describe $Q$ and $\overline{Q}$ while $C = 1$, and what happens when $C$ falls to 0.

:::step{why="The input NANDs pass the inverted S and R only while C = 1."}
With $C = 1$: the inner latch receives $\overline{SC} = 0$ and $\overline{RC} = 0$, its forbidden input. Both inner NANDs output
1: $Q = \overline{Q} = 1$.
:::

:::step{why="When C falls, both inner inputs rise to 1 at the same moment."}
$C \to 0$ makes $\overline{SC}$ and $\overline{RC}$ both 1 together: the NAND latch is released from 00 to 11, the race of the
theorem.
:::

:::answer
While $C = 1$: $Q = \overline{Q} = 1$ (not complements). When $C$ falls, the latch races and its final state is
unpredictable. The enable does not cure the forbidden input; it only moves the race to the moment $C$ falls.
:::
::::

::::example{#ex-d-2023 level="gate" title="A multiplexer with feedback (GATE 2023 pattern)" depth="standard"}
The output $Q$ of a 2-input multiplexer is connected back to its data input 0; data input 1 and the select $S$ come
from outside. What is the circuit equivalent to: a D flip-flop, a D latch, a half adder or a demultiplexer?

:::step{why="The MUX equation with the feedback substituted is the loop function."}
$Q^+ = \overline{S} \cdot Q + S \cdot I_1$.
:::

:::step{why="Each value of S gives one of the three behaviours of a single loop."}
$S = 1$: $Q^+ = I_1$, a constant for the loop, so $Q$ follows $I_1$ (transparent). $S = 0$: $Q^+ = Q$, both values stable
(memory).
:::

:::step{why="Transparency while enabled is the defining property of a latch."}
The output follows the data input during the **whole** time $S = 1$ and holds while $S = 0$: level-sensitive, so it is a
latch, with $D = I_1$ and enable $S$.
:::

:::answer
A **D latch** (GATE 2023, option B). Not a flip-flop (no edge), and not a half adder or demultiplexer (those have no
feedback, hence no memory).
:::
::::

::::example{#ex-d-edge level="gate" title="Edge case: D changes while the latch is open" depth="standard"}
A D latch has $C = 1$ from $t = 0$ to $t = 10$ ns and $C = 0$ afterwards. $D$ is 0 until 3 ns, 1 from 3 ns to 7 ns,
and 0 after 7 ns. Ignoring delays, what is $Q$ during each interval, and what does it hold after 10 ns?

:::step{why="While C = 1 every change of D passes straight through."}
$0$–$3$ ns: $Q = 0$. $3$–$7$ ns: $Q = 1$. $7$–$10$ ns: $Q = 0$.
:::

:::step{why="When C falls the latch keeps the value D had at that instant."}
At 10 ns, $D = 0$, so the latch holds $Q = 0$ for as long as $C$ stays 0.
:::

:::answer
$Q$ follows $D$ (0, 1, 0) while open and holds 0 after 10 ns. The 1 that appeared on $D$ during the window is **gone**: a
latch remembers only the last value before it closes. A positive-edge flip-flop clocked by the same $C$ would have
captured $D$ at $t = 0$ (a 0) and ignored the pulse entirely; Lesson 2 builds one.
:::
::::

## Latch versus flip-flop

:::intuition{#lvf-intuition title="An open window versus a camera" depth="standard"}
A latch is a **window**: while it is open you see everything that happens outside, as it happens. A flip-flop is a
**camera**: it records the scene at the instant of the click and shows that photo until the next click, however much
the scene moves in between. Both store one bit; they differ only in **when** they listen. That difference matters as
soon as a storage element's output feeds, through some logic, back into its own input, which is what every counter
and state machine does.
:::

:::definition{#latch-vs-ff term="Latch and flip-flop" depth="standard"}
- A **latch** is **level-sensitive**: while its enable is active it is transparent (the output follows the inputs);
  while the enable is inactive it holds.
- A **flip-flop** is **edge-triggered**: it samples its inputs only at an active **edge** of the clock (rising or
  falling) and its output can change only just after that edge; at all other times it ignores its inputs.

Symbols: a flip-flop's clock pin carries a small triangle (the dynamic indicator); a latch's enable pin has none.
:::

:::note{#erratum-x6 title="Careful with drawings that mix the two" depth="standard"}
Some notes draw a gated SR latch (the clock simply ANDed with S and R) with the triangle of an edge-triggered device,
or call a D flip-flop "transparent". Both are mistakes: a clock ANDed into the inputs gives a level-sensitive latch
whatever symbol is drawn, and a flip-flop is never transparent. Edge triggering needs either two latches in a
master–slave pair or a dedicated edge-detecting structure (Lesson 2).
:::

:::aside{#transparency-problem title="Why a transparent latch cannot drive its own input" depth="deep"}
Suppose we try to build a counter bit from a D latch: $D = \overline{Q}$, so that each clock pulse should flip the bit
once. While $C = 1$ the latch is transparent, so $Q$ becomes $\overline{Q}$ one propagation delay later; but $D$ is wired to
$\overline{Q}$, so $D$ changes again, and $Q$ follows again, and so on. During one enable pulse of width $t_w$ the bit flips
about $t_w / t_{pd}$ times, and its final value depends on the exact pulse width. That is the **race-around** problem,
which Lesson 2 analyses for the JK latch and solves with edge triggering: if the storage element listens only at an
instant, its own changing output cannot be heard until the next instant.
:::

You can drive an SR or D latch by hand in the Live Lab below: choose the SR or D latch (trigger "level latch"), set
the enable's period, toggle the inputs tick by tick, and watch the transparency and the forbidden $S = R = 1$ (flagged in
the violation list, with $Q$ and $\overline{Q}$ both drawn at 0 for the SR latch) on the timing diagram. The "SR forbidden,
then released" preset shows the release.

:::lab{#lab-latch lab="flipflop-scope" tab="scope" depth="standard"}
:::

:::aside{#metastability-preview title="What a real latch does when the race is close" depth="deep"}
The release race is not only a textbook curiosity. A latch is a pair of high-gain inverters in a ring, and between its
two stable states there is a third, **balanced** point where both outputs sit half-way between 0 and 1. A perfectly
symmetric push (both inputs released at once, or an input that changes just as the latch closes) can leave the latch
near that point. It then drifts away from it slowly, at a rate set by the gain of the gates, and settles in one of the
two stable states after a time that has no fixed upper bound. This is **metastability**. It is why Lesson 2 insists
that an input must be stable for a **setup time** before a clock edge and a **hold time** after it: those windows keep
the storage element away from the balanced point. The ideal 0/1 simulations in this lesson show the symmetric case as an
endless oscillation; real gates show it as an unpredictable, and sometimes slow, decision.
:::

:::note{#recap-lvf title="Recap" depth="quick"}
A latch is transparent while enabled; a flip-flop samples at an edge. A loop through a transparent latch can race,
which is why counters and state machines use flip-flops.
:::

### Worked examples: rings, races and latch-or-flip-flop

::::example{#ex-ring-easy level="easy" title="Latch or flip-flop? Read the behaviour" depth="quick"}
A storage element has a data input $D$ and a control input $C$. Its datasheet timing diagram shows $C$ high from 0 to 20 ns;
$D$ rises at 5 ns and falls at 12 ns; the output $Q$ rises at 7 ns and falls at 14 ns. Is it a latch or a flip-flop?

:::step{why="A flip-flop's output can change only just after an edge of C; a latch's output can change whenever C is active."}
$C$ has a rising edge at 0 ns and a falling edge at 20 ns. $Q$ changes at 7 ns and 14 ns, in the middle of the high phase,
2 ns after each change of $D$.
:::

:::step{why="Following D while enabled is transparency, the defining property of a latch."}
The output tracks $D$ with a 2 ns delay for as long as $C = 1$.
:::

:::answer
A (D) **latch**, transparent while $C = 1$, with a propagation delay of 2 ns. A flip-flop would have changed only near 0 ns
or 20 ns.
:::
::::

::::example{#ex-ring-medium level="medium" title="Even and odd rings of inverters" depth="standard"}
How many stable states does a ring of 4 inverters have? A ring of 3?

:::step{why="A ring has several loop wires, so we try every combination: an assignment is stable when every inverter's output is the complement of its input."}
Label the nodes $n_0, n_1, \dots$ round the ring; stability requires $n_{i} = \overline{n_{i-1}}$ for every $i$. Choosing $n_0$ fixes all
the others by alternation.
:::

:::step{why="Going all the way round must bring us back to the value we started with."}
With 4 inverters: $n_0, \overline{n_0}, n_0, \overline{n_0}$, and the fourth inverter gives $n_0$ back. Consistent for $n_0 = 0$ and for
$n_0 = 1$: **2** stable states (1010 and 0101).
:::

:::step{why="An odd ring returns the complement of the starting value, which contradicts it."}
With 3 inverters: $n_0, \overline{n_0}, n_0$, and the third inverter gives $\overline{n_0}$, which must equal $n_0$: impossible. **0** stable
states.
:::

:::answer
An even ring is a memory (2 stable states; two cross-coupled inverters are the core of every latch and SRAM cell); an odd ring
has none and oscillates. Checking all $2^4 = 16$ and $2^3 = 8$ assignments by brute force gives the same counts.
:::
::::

::::example{#ex-ring-gate level="gate" title="Frequency of a ring oscillator" depth="standard"}
A ring of 3 inverters with a propagation delay of 1 ns each oscillates. Find its period and frequency.

:::step{why="A change at one node needs one inverter delay to reach the next node, so it takes k·t_pd to go round."}
A rising edge at $n_0$ returns to $n_0$ after $3 \times 1 = 3$ ns, inverted (an odd number of inversions): $n_0$ falls.
:::

:::step{why="A full period is one rise and one fall, so the change must go round twice."}
$T = 2 \times 3 \times 1 = 6$ ns.
:::

:::answer
$T = 6$ ns, $f = 1/6\ \text{ns} \approx 166.7$ MHz. In general $T = 2k\,t_{pd}$: more stages or slower gates give a lower frequency,
which is how ring oscillators are used to measure gate delay on a chip.
:::
::::

::::example{#ex-ring-edge level="gate" title="Edge case: a D latch wired as a toggle" depth="standard"}
A D latch has $D = \overline{Q}$ and a propagation delay of 10 ns. Its enable $C$ is pulsed high for 25 ns. Starting from $Q = 0$,
how many times does $Q$ change during the pulse, and what is $Q$ afterwards?

:::step{why="While C = 1 the latch is transparent, so it keeps copying its own complement."}
At 0 ns the latch sees $D = \overline{0} = 1$ and starts to change; $Q$ becomes 1 at 10 ns. It now sees $D = 0$ and starts again.
:::

:::step{why="Each change is started while C is still high, and the last one starts before C falls at 25 ns."}
Changes start at 0, 10 and 20 ns (all before 25 ns) and complete at 10, 20 and 30 ns: **3** changes, $Q$ = 1, 0, 1. The change
started at 20 ns completes after $C$ has fallen; it was already under way (in the ideal gate-delay model; a real latch
closing in the middle of a change is the risky case described in the metastability aside above).
:::

:::answer
3 changes, ending at $Q = 1$. With a 15 ns pulse there would be 2 changes and $Q = 0$: the result depends on the pulse width,
which is the race-around problem. In general the latch makes $\lceil t_w / t_{pd} \rceil$ changes; Lesson 2 proves this for the JK
latch and cures it with an edge-triggered flip-flop.
:::
::::

## GATE questions on this lesson

:::pyq{id="cse-1991-b-5-a" tests="feedback-analysis,stable-theorem,stable-state" depth="standard"}
:::

:::pyq{id="cse-1993-ii-a-6-2" tests="stable-state,stable-theorem,trap-odd-ring" depth="standard"}
:::

:::pyq{id="cse-1999-a-33" tests="feedback-analysis,stable-state" depth="standard"}
:::

:::pyq{id="cse-2004-cs-18" tests="nand-latch,trap-nand-00,forbidden" depth="standard"}
:::

:::pyq{id="it-2007-cs-7" tests="race-theorem,nand-latch,trap-nand-00" depth="standard"}
:::

:::pyq{id="cse-2023-cs-11" tests="mux-latch,d-latch,trap-dff-vs-latch" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dl-06-01-q01" depth="standard"}
:::

:::practice{id="nx-dl-06-01-q02" depth="standard"}
:::

:::practice{id="nx-dl-06-01-q03" depth="standard"}
:::

:::practice{id="nx-dl-06-01-q04" depth="standard"}
:::

:::practice{id="nx-dl-06-01-q05" depth="standard"}
:::

:::practice{id="nx-dl-06-01-q06" depth="standard"}
:::

:::practice{id="nx-dl-06-01-q07" depth="standard"}
:::

:::practice{id="nx-dl-06-01-q08" depth="standard"}
:::

:::practice{id="nx-dl-06-01-q09" depth="standard"}
:::

:::practice{id="nx-dl-06-01-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Feedback and latches on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Feedback | a cycle in the circuit; the loop wire is a state variable $Q$ |
| Stable state | $Q$ with $f(x, Q) = Q$; cut the loop and try $Q = 0$ and $Q = 1$ |
| One-wire loop | $f(x, \cdot)$ constant → that constant; $= Q$ → memory; $= \overline{Q}$ → oscillation |
| Ring oscillator | odd number $k$ of inversions, period $2k\,t_{pd}$ |
| NOR SR latch | 10 set, 01 reset, 00 hold, 11 forbidden ($Q = \overline{Q} = 0$); $Q^+ = S + \overline{R}Q$, $SR = 0$ |
| NAND SR latch | active low: 01 set, 10 reset, 11 hold, 00 forbidden ($Q = \overline{Q} = 1$) |
| Release race | leaving the forbidden input with both inputs at once: equal delays oscillate, unequal delays let the faster gate win (inertial gates) |
| Oscillating sequences | NOR $11 \to 00$; NAND $00 \to 11$ |
| Gated latch | enable $C$: $C = 0$ holds, $C = 1$ follows S, R |
| D latch | $S = D$, $R = \overline{D}$: $Q^+ = CD + \overline{C}Q$, no forbidden input, transparent while $C = 1$ |
| MUX latch | 2:1 MUX with $Y \to I_0$, $D \to I_1$: a D latch enabled by $S$ |
| Latch vs flip-flop | latch = level-sensitive (window); flip-flop = edge-triggered (camera) |
:::
