---
id: flip-flops
subject: dl
chapter: sequential-circuits
title: "Flip-flops: SR, JK, D, T, edge triggering and timing"
order: 2
prerequisites: [latches]
pyq_topics: [dl/sequential]
est_minutes: 65
difficulty: core
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every next state, excitation entry, conversion, waveform, timing figure and practice answer is produced by simulation in content/gate-notes/_checks/dl/l6_02_flip_flops.py (seqlib tables, conversions and the scope waveform model)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 79–86 and 99, set B pp. 135–138, set C pp. 333–342, set D p. 400, set E pp. 406–407."
  - "Facts checked against: M. Morris Mano and M. D. Ciletti, Digital Design (master–slave and edge-triggered flip-flops, characteristic and excitation tables, conversions); J. F. Wakerly, Digital Design: Principles and Practices (setup, hold, clock-to-Q, metastability)."
  - "PYQs: src/gate/questions.json (cse-2000-a-2-12, cse-2001-a-33, cse-2005-cs-62, cse-2006-cs-8, it-2008-it-37); every key is re-derived by cycle-by-cycle or tick-by-tick simulation."
  - "cse-2000-a-2-12: the 2000 paper is not available to check the wording 'After the clock cycles'; the two-cycle reading behind the stored key is stated and both parities are shown."
updated: "2026-10-20"
---

*Storage elements, lesson 2 of 3.* [Lesson 1](lesson:latches) built a one-bit memory from two
cross-coupled gates and then hit a wall: a latch is **transparent** while it is enabled, so if its
output feeds back into its own input (as in every counter, register and state machine), the bit can
change again and again during one enable pulse. This lesson builds the storage element that makes those loops safe,
the **flip-flop**, which listens to its inputs only at one instant, the **edge** of a clock. We will
build one from two latches (the **master–slave** pair), meet the four flip-flop types GATE uses (SR,
JK, D and T) with their characteristic equations, see why a level-sensitive JK misbehaves
(**race-around**), learn the **excitation tables** that run every design problem backwards, convert any
flip-flop into any other, and finish with the timing rules (setup, hold, clock-to-Q, maximum clock
frequency) and the method for reading the timing-diagram questions that GATE loves.

## Where this fits

[Lesson 1](lesson:latches) ended with two promises: that a latch is a window and a flip-flop is a
camera, and that a transparent latch cannot drive its own input without racing. This lesson keeps both
promises. [Lesson 3](lesson:sequential-analysis) analyses circuits with the characteristic equations
of this lesson, [Lesson 5](lesson:synchronous-counter-design) designs counters with its excitation
tables, and registers ([Lesson 6](lesson:shift-registers)) and state machines
([Lesson 7](lesson:finite-state-machines)) rely on its timing rules. The one sentence to keep: **a
flip-flop's next state is computed from the inputs just before the active edge, and it appears just
after it.**

:::table{#radar title="GATE radar: flip-flops, edges and timing" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 5 (2000, 2001, 2005, 2006, IT 2008) |
| Marks | 4 two-mark MCQs (2000, 2001, 2005, IT 2008), 1 one-mark MCQ (2006) |
| Pattern 1 | Clock a small circuit of flip-flops and read the state: 2000 (a toggling JK feeding a D) |
| Pattern 2 | Read a timing diagram edge by edge: 2001 (setup time, an input that changes exactly at an edge), 2005 (an output sequence written in terms of an input) |
| Pattern 3 | Clock phases and delays: 2006 (which pair of D flip-flops delays a signal by 180°) |
| Pattern 4 | Excitation: IT 2008 (the J and K that realise a state diagram) |
| What examiners test | That a flip-flop reads its inputs just before the edge; that two flip-flops on the same edge both see old values; that the T flip-flop's next state is $T \oplus Q$; that J = K = 1 toggles; that a change inside the setup/hold window is not reliably captured |
:::

## Edge triggering: a camera, not a window

:::intuition{#edge-intuition title="A camera shutter" depth="standard"}
Think of a photographer at a race. The runners move all the time, but the photo shows only where they
were **at the click**. What happened a second before the click, or a second after, is not in the photo,
and the photo does not change until the next click, however much the runners move. A flip-flop is that
camera: the clock edge is the click, the inputs are the scene, and the output is the photo, held until
the next click.

A latch, in contrast, is a window: while it is open you see everything, as it happens. That is a
disaster when the scene **is** you, as for a storage element whose output returns to its own input: you
see your reflection change, react, see it change again. The camera breaks that loop, because the
flip-flop's new output cannot get into the photo until the next click.
:::

:::definition{#edge-def term="Edge-triggered flip-flop" depth="standard"}
A clock signal $CLK$ has two kinds of **edges**: a **rising** (positive) edge, where it goes from 0 to 1,
and a **falling** (negative) edge, where it goes from 1 to 0.

A **positive-edge-triggered flip-flop** looks at its data inputs only at the rising edges of its clock.
At each rising edge it computes its next state $Q^+$ from the inputs and the present state **as they were
just before the edge**, and its output $Q$ takes that value a short time after the edge (the clock-to-Q
delay, defined later). Between edges, whatever the inputs do, $Q$ does not change. A
**negative-edge-triggered** flip-flop does the same at falling edges.

Symbols: a small triangle (the **dynamic indicator**) on the clock pin marks an edge-triggered input; a
bubble in front of the triangle means the falling edge is the active one. A plain clock pin with no
triangle is a level-sensitive enable, which is a latch.
:::

Two phrases in the definition carry the whole lesson. **"Just before the edge"** tells you which value of
the inputs counts: if an input changes at the edge, the value it had before the change is the one that is
sampled (we will make this precise with the setup and hold times). **"A short time after the edge"** tells
you when the output moves: never before the edge, and never in the middle of a clock period. Together
they mean a flip-flop's output is a staircase that can only step at active edges.

The animation drives a D latch and a positive-edge-triggered D flip-flop with the **same** clock and the
**same** data waveform. Watch the clock's high phases: the latch output follows every wiggle of D while
the clock is 1; the flip-flop output moves only at the rising edges, to the value D had just before each
edge.

:::viz{#edge-ff-timing-viz spec="edge-ff-timing" mode="animate" depth="standard"}
:::

Notice two things. When D changes in the **middle** of a high phase, the latch output changes and the
flip-flop output does not. And a change of D that is undone before the next rising edge never reaches the
flip-flop at all, a GATE trap we meet again at the end of the lesson.

:::trap{#trap-level-vs-edge title="Reading a flip-flop as if it were a latch" depth="standard"}
The most common error in a timing-diagram question is to let a flip-flop's output follow its input
during the clock's high phase, as a latch would. If the clock pin has a triangle, the output can change
**only** just after an active edge, and it takes the value of the input **just before** that edge. A
student who lets Q follow D while CLK = 1 picks the option whose output rises in the middle of a clock
pulse; examiners always include that option. The opposite error also happens: treating a gated latch (a
clock ANDed with the inputs, no triangle) as edge-triggered and ignoring a change in the middle of the
enable pulse, which a latch does pass through.
:::

:::note{#recap-edge title="Recap" depth="quick"}
A flip-flop samples its inputs at an active edge (rising or falling) and changes its output only just
after that edge; between edges it ignores its inputs. A latch is transparent for the whole time its
enable is active. Read inputs just before the edge; move outputs just after it.
:::

## Building an edge from two latches: master–slave

:::intuition{#ms-intuition title="Two doors of an airlock" depth="standard"}
An airlock on a spaceship has two doors, and the rule is that they are **never open at the same time**.
To go out, you open the inner door, step in, close it, and only then open the outer door. At no moment is
there an open path from the inside of the ship to space.

Two latches can be arranged the same way. The first latch, the **master**, is open while the clock is 1;
the second, the **slave**, is open while the clock is 0. While the clock is 1 the master follows the input,
but the slave is closed, so nothing reaches the output. When the clock falls, the master closes (keeping
whatever it had at that instant) and the slave opens, copying the master to the output. While the clock is
0 the master is closed, so even though the slave is open, the output cannot change. The only moment at
which information passes from input to output is the falling edge: the airlock has turned two windows into
a camera.
:::

:::definition{#master-slave term="Master–slave flip-flop" depth="standard"}
A **master–slave** flip-flop is two gated latches in series. The **master** latch is enabled by $CLK$, the
**slave** latch is enabled by $\overline{CLK}$ (an inverter on the clock), the input drives the master and the
master's output drives the slave, whose output is $Q$.

- While $CLK = 1$: the master is transparent (its output follows the input); the slave is closed (holding $Q$).
- At the falling edge: the master closes and holds the input's last value; the slave opens and copies it.
- While $CLK = 0$: the master holds; the slave is transparent but its input (the master) is constant.

With D latches this gives a D flip-flop whose active edge is the **falling** edge. Swapping which latch gets
the inverted clock gives a rising-edge flip-flop. In a **master–slave JK** (or SR) flip-flop the master is a
gated JK (or SR) latch whose J and K inputs are additionally gated by the slave's outputs, so that it can only
move toward the complement of the present $Q$.
:::

:::theorem{#ms-theorem name="A master–slave D flip-flop samples at the falling edge" depth="standard"}
In a master–slave D flip-flop built from ideal D latches (master enabled by $CLK$, slave by $\overline{CLK}$),
the output $Q$ changes only at falling edges of $CLK$, and after each falling edge $Q$ equals the value $D$ had
at the instant of that edge.
:::

:::proof{#proof-ms of="master–slave sampling" depth="standard"}
**Idea first:** at every moment at least one of the two latches is closed, so there is never a transparent
path from $D$ to $Q$; the only hand-over happens at the falling edge.

Let $M$ be the master's output. Split time into the three situations of the definition.

1. While $CLK = 1$ the slave is closed, so $Q$ holds. Whatever $D$ does, $Q$ does not change. (The master
   follows $D$, so at every instant $M = D$.)
2. At a falling edge at time $t_e$ the master closes. A D latch that closes keeps the value its input had at
   the closing instant (the D latch equation $Q^+ = CD + \overline{C}Q$ of Lesson 1 with $C$ dropping to 0), so
   from $t_e$ on, $M = D(t_e)$. The slave opens and copies $M$, so $Q = D(t_e)$.
3. While $CLK = 0$ the master is closed, so $M$ stays $D(t_e)$; the slave is transparent, but its input is
   constant, so $Q$ stays $D(t_e)$.

At the next rising edge the slave closes while $Q = D(t_e)$, and case 1 starts again. So $Q$ can change only at
step 2, a falling edge, and it then takes the value $D$ had at that edge. ∎

**Sanity check.** The animation below and `seqlib.scope` in mode `ms` show it on a waveform: the master trace
copies $D$ throughout each high phase, and $Q$ steps only at the falling edges, to the master's last value.
:::

:::viz{#master-slave-viz spec="master-slave" mode="animate" depth="standard"}
:::

The master–slave picture explains every property you need: why the output changes only at one edge, why the
input must be stable around that edge, and the one oddity of the old pulse-triggered JK flip-flop, described next.

:::aside{#ones-catching title="Pulse triggering and 1s-catching" depth="deep"}
In a master–slave **JK** flip-flop the master is a gated SR latch whose set input is $J\,\overline{Q}\,CLK$ and whose
reset input is $K\,Q\,CLK$ ($Q$ being the slave's output). While the clock is high, the slave holds $Q$, so if
$Q = 0$ the master can only be **set** (by $J$) and if $Q = 1$ it can only be **reset** (by $K$). Once it has
moved, nothing during the rest of the high phase can move it back, because the input that would undo it is
blocked by the same unchanged $Q$.

The consequence is called **1s-catching**: if $Q = 0$ and $J$ rises to 1 for even a brief glitch while the clock is
high, then returns to 0 before the clock falls, the master has already been set and the slave copies a 1 at the
falling edge. An edge-triggered JK would have sampled $J = 0$ at the edge and stayed at 0. Such a flip-flop is
called **pulse-triggered** rather than edge-triggered: its inputs must be stable for the whole high phase, not
just around the edge. `seqlib.scope` (mode `ms`) reproduces it: a JK with $Q = 0$, $K = 0$ and a one-tick pulse on
$J$ in the middle of the high phase ends the clock cycle with $Q = 1$. The cure is the true edge-triggered design,
or a master–slave D flip-flop (a D master has no gating by $Q$ and simply follows $D$).
:::

:::note{#recap-ms title="Recap" depth="quick"}
Two latches on opposite clock phases are never transparent together, so a master–slave D flip-flop passes $D$ to
$Q$ only at the falling edge, with the value $D$ had at that edge. A pulse-triggered master–slave JK can catch a
brief 1 on J or K during the high phase (1s-catching).
:::

## The four flip-flops: SR, JK, D and T

:::intuition{#types-intuition title="Four ways to tell a bit what to do" depth="standard"}
Every flip-flop answers the same question at each active edge: "what should the bit be next?". The four
types differ only in how you phrase the instruction.

- **SR** gives two buttons, **set** and **reset**, and asks you never to press both.
- **JK** keeps the two buttons but gives the forbidden combination a useful meaning: pressing both means
  **toggle** (flip the bit).
- **D** removes the choice: you simply say what the bit should be next (**data**, or **delay**: the bit is
  $D$ delayed by one clock).
- **T** asks one yes/no question: **toggle** or not?

All four store the same bit in four input languages, which is why any one can be converted into any other.
:::

:::definition{#ff-types term="SR, JK, D and T flip-flops" depth="standard"}
All four are clocked (edge-triggered unless stated otherwise); $Q$ is the present state and $Q^+$ (also written
$Q_{n+1}$, $Q(t+1)$) the state after the next active edge.

- **SR flip-flop**: inputs $S$, $R$. $S = 1$ sets ($Q^+ = 1$), $R = 1$ resets ($Q^+ = 0$), $S = R = 0$ holds;
  $S = R = 1$ is not allowed.
- **JK flip-flop**: inputs $J$ (like $S$) and $K$ (like $R$). Same as SR, except that $J = K = 1$ **toggles**:
  $Q^+ = \overline{Q}$.
- **D flip-flop**: input $D$. $Q^+ = D$, whatever $Q$ is.
- **T flip-flop**: input $T$. $T = 0$ holds, $T = 1$ toggles.
:::

:::table{#char-tables title="Characteristic tables" depth="standard"}
| Flip-flop | Inputs | $Q^+$ | Meaning |
|:--|:--:|:--:|:--|
| SR | $S R = 00$ | $Q$ | hold |
| SR | $S R = 01$ | 0 | reset |
| SR | $S R = 10$ | 1 | set |
| SR | $S R = 11$ | – | not allowed |
| JK | $J K = 00$ | $Q$ | hold |
| JK | $J K = 01$ | 0 | reset |
| JK | $J K = 10$ | 1 | set |
| JK | $J K = 11$ | $\overline{Q}$ | toggle |
| D | $D = 0$ | 0 | load 0 |
| D | $D = 1$ | 1 | load 1 |
| T | $T = 0$ | $Q$ | hold |
| T | $T = 1$ | $\overline{Q}$ | toggle |
:::

Inside a larger circuit you need an **equation**, not a table. Each one is derived the same way: one row per
combination of inputs and $Q$, mark where $Q^+ = 1$, and minimise.

:::derivation{#char-equations of="the four characteristic equations" depth="standard"}
**SR.** The rows with $Q^+ = 1$ are $(S, R, Q)$ = 001 (hold a 1), 100 and 101 (set); the rows 110 and 111 are
don't-cares because they are never used. Exactly as for the latch in Lesson 1, a K-map gives

$$Q^+ = S + \overline{R}\,Q, \qquad SR = 0.$$

**JK.** The rows with $Q^+ = 1$ are $(J, K, Q)$ = 001 (hold a 1), 100 and 101 (set), and 110 (toggle a 0 to 1).
With $Q = 0$ the next state is 1 exactly when $J = 1$; with $Q = 1$ it is 1 exactly when $K = 0$. Splitting on $Q$
(Shannon expansion):

$$Q^+ = J\,\overline{Q} + \overline{K}\,Q.$$

**D.** $Q^+ = 1$ exactly when $D = 1$, for both values of $Q$:

$$Q^+ = D.$$

**T.** $Q^+ = 1$ for $(T, Q)$ = 01 (hold a 1) and 10 (toggle a 0): that is the exclusive OR,

$$Q^+ = T\,\overline{Q} + \overline{T}\,Q = T \oplus Q.$$

**Sanity check.** Put the special inputs in. JK with $J = K = 1$: $Q^+ = \overline{Q} + 0 = \overline{Q}$, a toggle. JK
with $J = K = 0$: $Q^+ = 0 + Q = Q$, hold. T with $T = 0$: $0 \oplus Q = Q$; with $T = 1$: $1 \oplus Q = \overline{Q}$. The JK
equation with $K = \overline{J}$ becomes $J\,\overline{Q} + J\,Q = J$: a JK with $K = \overline{J}$ is a D flip-flop, and with
$J = K = T$ it becomes $T\overline{Q} + \overline{T}Q$, a T flip-flop. `seqlib.char_table` tries every row of all four types
and agrees with all four equations.
:::

:::note{#erratum-d400 title="Two misprints to recognise" depth="standard"}
Some notes print the D flip-flop's characteristic equation with the present state in it. It has none: the
next state of a D flip-flop is the input itself, $Q_{n+1} = D$, for $Q_n = 0$ and $Q_n = 1$ alike. That is what
makes a D flip-flop a **delay** element: the output during clock period $n + 1$ is the input of period $n$.
The second misprint concerns the T flip-flop and is a trap in its own right, below.
:::

:::trap{#trap-t-next title="The T flip-flop's next state is T ⊕ Q, not T" depth="standard"}
Writing $Q^+ = T$ for a T flip-flop (as a few notes do) turns it into a D flip-flop. The T input does not say
**what** the bit should be; it says **whether to flip it**. With $T = 1$ the next state is the complement of
the present one, so it is 0 when $Q = 1$; with $T = 0$ the bit keeps its value, which is 1 when $Q = 1$. Both rows
contradict $Q^+ = T$. The correct equation is

$$Q^+ = T \oplus Q.$$

Examiners exploit the slip in counter questions: a T flip-flop with $T = 1$ divides the clock by two (it
toggles every edge), while a "flip-flop with $Q^+ = T = 1$" would sit at 1 for ever.
:::

:::note{#recap-types title="Recap" depth="quick"}
SR: $Q^+ = S + \overline{R}Q$ with $SR = 0$. JK: $Q^+ = J\overline{Q} + \overline{K}Q$ (11 toggles). D: $Q^+ = D$. T:
$Q^+ = T \oplus Q$. Derive each by splitting its table on $Q$.
:::

## Race-around: why a JK must be edge-triggered

:::intuition{#race-intuition title="A light switch that flips itself" depth="standard"}
Imagine a switch that flips whenever its button is pressed, with the button held down for as long as a door is
open. Each flip takes a moment; the switch flips, finds the button still pressed, flips again, and keeps going.
When the door closes it is on after an odd number of flips and off after an even number, which depends on exactly
how long the door was open and how long one flip takes.

That is the JK latch with $J = K = 1$. The "toggle" instruction depends on the present output; a
level-sensitive latch keeps obeying it as long as the clock is high, and every time it obeys, the present
output changes and the instruction applies again.
:::

:::definition{#race-around term="Race-around" depth="standard"}
Consider a **level-triggered** JK latch (a gated JK whose enable is the clock, with no master–slave or edge
mechanism), with $J = K = 1$ and propagation delay $t_{pd}$ (the time from an input change to the output
change). While $CLK = 1$ the latch computes $Q^+ = \overline{Q}$ from its **present output**; one $t_{pd}$ later
$Q$ has flipped, the latch sees the new $Q$, and starts another flip. The output **toggles repeatedly** for as
long as the clock is high. This is **race-around**. The final state at the end of the clock pulse depends on
the pulse width $t_w$ and on $t_{pd}$, so the circuit is useless as a counter element. A level-triggered T latch
with $T = 1$ (and a D latch with $D = \overline{Q}$, Lesson 1) has the same problem.
:::

:::theorem{#race-around-theorem name="How many times a level JK toggles" depth="standard"}
A level-triggered JK latch with $J = K = 1$ and propagation delay $t_{pd}$ receives a clock pulse of width $t_w$.
It starts a toggle at the start of the pulse and then every $t_{pd}$ while the clock is still high, and it completes
every toggle it has started. So it toggles

$$\left\lceil \frac{t_w}{t_{pd}} \right\rceil$$

times per pulse. In particular it toggles **exactly once** if and only if $t_w \le t_{pd}$, and race-around happens
exactly when $t_w > t_{pd}$.
:::

:::proof{#proof-race-around of="the race-around count" depth="standard"}
**Idea first:** a new toggle can start only while the clock is high, and toggles start $t_{pd}$ apart; count how
many start times fit into the pulse.

Let the pulse start at time 0 and end at $t_w$. At time 0 the latch sees $J = K = 1$ and its present output, and
starts a toggle, which completes at $t_{pd}$. At $t_{pd}$ the output has changed, so if the clock is still high the
latch starts another toggle, which completes at $2t_{pd}$, and so on: toggles start at $0, t_{pd}, 2t_{pd}, \dots$, as
long as the start time is **before** $t_w$ (a start at or after $t_w$ finds the latch closed). The start times
$k\,t_{pd}$ with $0 \le k\,t_{pd} < t_w$ are $k = 0, 1, \dots, \lceil t_w / t_{pd} \rceil - 1$, which is
$\lceil t_w / t_{pd} \rceil$ toggles. A toggle that started just before the clock fell still completes (the gates
were already switching), which is why we count starts, not completions inside the pulse.

The count is 1 exactly when $\lceil t_w / t_{pd} \rceil = 1$, i.e. $0 < t_w \le t_{pd}$; for $t_w > t_{pd}$ it is at
least 2. ∎

**Sanity check.** `seqlib.scope` in mode `latch` with the clock high for $w$ ticks and $t_{pd} = 4$ ticks gives
1, 1, 1, 1 toggles for $w = 1 \dots 4$, then 2 for $w = 5 \dots 8$, 3 for $w = 9 \dots 12$: exactly
$\lceil w / 4 \rceil$.
:::

The animation runs the same clock pulse into a level JK latch and a master–slave JK flip-flop, both with
$J = K = 1$. The latch flips every $t_{pd}$ while the clock is high; the master–slave flip-flop flips exactly once,
at the falling edge.

:::viz{#race-around-viz spec="race-around" mode="animate" depth="standard"}
:::

:::note{#erratum-x5 title="Which way round is the race-around condition?" depth="standard"}
Some notes state the race-around condition backwards, as if it occurred when the propagation delay is longer
than the pulse. The direction follows from the theorem: race-around happens when the clock pulse is **longer**
than the propagation delay, $t_w > t_{pd}$, because only then can a second toggle start before the clock falls.
The classic "cure by narrow pulses" asks for $t_w < t_{pd} < T$ (pulse shorter than the delay, period longer),
which is hard to guarantee across temperature and supply voltage. The two reliable cures are structural:

- **master–slave**: the slave holds $Q$ for the whole high phase, so the master sees a constant $Q$ and can make at
  most one move; $Q$ changes once, at the falling edge;
- **edge triggering**: the flip-flop samples once per edge, and its new output arrives after the sampling moment.
:::

:::note{#recap-race title="Recap" depth="quick"}
A level JK latch with $J = K = 1$ toggles $\lceil t_w / t_{pd} \rceil$ times per pulse: race-around exactly when
$t_w > t_{pd}$. Master–slave or edge-triggered JK flip-flops toggle once per clock.
:::

### Worked examples: characteristic equations and tables

::::example{#ex-char-easy level="easy" title="One edge, four flip-flops" depth="quick"}
Four flip-flops all have $Q = 1$ before an active edge. Their inputs just before the edge are: SR with
$S = 0, R = 1$; JK with $J = 1, K = 0$; D with $D = 1$; T with $T = 1$. Give each one's $Q^+$.

:::step{why="SR with only R active is a reset, whatever the present state."}
SR: $Q^+ = S + \overline{R}Q = 0 + 0 \cdot 1 = 0$.
:::

:::step{why="JK with only J active is a set; the equation confirms it."}
JK: $Q^+ = J\overline{Q} + \overline{K}Q = 1 \cdot 0 + 1 \cdot 1 = 1$.
:::

:::step{why="D copies the input and T = 1 flips the present state."}
D: $Q^+ = D = 1$. T: $Q^+ = T \oplus Q = 1 \oplus 1 = 0$.
:::

:::answer
SR → 0, JK → 1, D → 1, T → 0. Notice that the T flip-flop ends at 0 although its input is 1: its input says
**flip**, not **be 1**.
:::
::::

::::example{#ex-char-jkseq level="medium" title="A JK flip-flop through six edges" depth="standard"}
A positive-edge JK flip-flop starts at $Q = 0$. Just before its six rising edges the inputs $JK$ are 10, 00, 11,
11, 01, 11. Find $Q$ after each edge.

:::step{why="Each edge applies one row of the characteristic table to the present state."}
Edge 1: $JK = 10$ sets, $Q = 1$. Edge 2: $JK = 00$ holds, $Q = 1$.
:::

:::step{why="JK = 11 toggles, so the answer depends on the present state, which we just computed."}
Edge 3: $JK = 11$ toggles 1 to 0. Edge 4: $JK = 11$ toggles 0 to 1.
:::

:::step{why="The last two rows are a reset and one more toggle."}
Edge 5: $JK = 01$ resets, $Q = 0$. Edge 6: $JK = 11$ toggles, $Q = 1$.
:::

:::answer
$Q$ = 1, 1, 0, 1, 0, 1 after edges 1 to 6. Toggle rows can only be read in order: you need the present state, so
always keep a running column of $Q$.
:::
::::

::::example{#ex-char-2000 level="gate" title="A toggling JK feeding a D flip-flop (GATE 2000 pattern)" depth="standard"}
Two master–slave flip-flops share a clock. The first is a JK with $J = K = 1$ and output $P$; the second is a D
flip-flop with $D = P$ and output $Q$. Initially $(P, Q) = (0, 1)$. Find $(P, Q)$ after one and after two clock cycles.

:::step{why="Both flip-flops are clocked by the same edge, so both compute their next state from the values before the edge."}
Edge 1: the JK has $J = K = 1$, so $P^+ = \overline{P} = 1$. The D flip-flop sees $D = P = 0$ (the **old** $P$), so
$Q^+ = 0$. After one cycle: $(P, Q) = (1, 0)$.
:::

:::step{why="The same rule applied again, now from the state (1, 0)."}
Edge 2: $P^+ = \overline{1} = 0$, and $Q^+ = $ old $P = 1$. After two cycles: $(P, Q) = (0, 1)$.
:::

:::step{why="The pattern repeats with period 2, so the answer depends only on whether the number of cycles is odd or even."}
After an odd number of cycles $(P, Q) = (1, 0)$; after an even number, $(0, 1)$, the initial state.
:::

:::answer
After one cycle $(1, 0)$; after two cycles $(0, 1)$. GATE 2000 asks for the state "after the clock cycles"; the plural is
read as two cycles, giving $(0, 1)$, option D, which is the stored key. Read as "after the clock cycle" (one cycle) it would
be $(1, 0)$. The trap is the D flip-flop: it takes the **old** $P$, not the newly toggled one.
:::
::::

::::example{#ex-char-race level="medium" title="Counting race-around toggles" depth="standard"}
A level-triggered JK latch with $J = K = 1$ has $t_{pd} = 8$ ns and starts at $Q = 0$. The clock is high for 30 ns. How
many times does $Q$ toggle, and what is $Q$ when it has settled?

:::step{why="Toggles start at the start of the pulse and then every t_pd while the clock is still high."}
Start times: 0, 8, 16, 24 ns (32 ns is after the clock fell at 30 ns).
:::

:::step{why="The race-around theorem counts start times: the ceiling of t_w over t_pd."}
$\lceil 30 / 8 \rceil = \lceil 3.75 \rceil = 4$ toggles, completing at 8, 16, 24 and 32 ns.
:::

:::answer
4 toggles; $Q$ goes 1, 0, 1, 0 and ends at **0**, where it started, as if the clock pulse had done nothing. With a 20 ns
pulse it would toggle 3 times and end at 1. The output depends on the pulse width: race-around.
:::
::::

::::example{#ex-char-tqbar level="gate" title="Edge case: a T flip-flop with T = Q̄" depth="standard"}
A T flip-flop has its input wired to its own complement output: $T = \overline{Q}$. It starts at $Q = 0$. What does it do
over the next few clock edges?

:::step{why="Substituting the wiring into the characteristic equation gives the next state as a function of Q alone."}
$Q^+ = T \oplus Q = \overline{Q} \oplus Q = 1$.
:::

:::step{why="A next state that does not depend on Q means the flip-flop goes there and stays."}
Edge 1: $T = \overline{0} = 1$, toggle to 1. Edge 2: $T = \overline{1} = 0$, hold at 1. Every later edge: hold at 1.
:::

:::answer
$Q$ = 1, 1, 1, … : it sets once and stays set. Students expect "it toggles every clock", which is what a **D** flip-flop
with $D = \overline{Q}$ does ($Q^+ = \overline{Q}$), and what a T flip-flop with $T = 1$ does. The T input already contains the
"flip" instruction; feeding it $\overline{Q}$ as well cancels the second flip. Always substitute into $Q^+ = T \oplus Q$.
:::
::::

## Excitation tables: running the table backwards

:::intuition{#exc-intuition title="Asking for directions instead of following them" depth="standard"}
A characteristic table answers "I have these inputs; where does the bit go?". Design asks the opposite: "I need
the bit to go from here to there; which inputs will do it?". Often there is more than one correct answer. To take a JK flip-flop
from 0 to 1 you can **set** it ($J = 1, K = 0$) or **toggle** it ($J = 1, K = 1$): $K$ does not matter. That freedom is
written as a don't-care, x, and those don't-cares are the reason JK flip-flops give the simplest logic in counter
design.
:::

:::derivation{#excitation of="the excitation tables" depth="standard"}
For each flip-flop and each of the four transitions $Q \to Q^+$, list the input combinations whose characteristic-table
row produces that transition; when an input can be either value, write x.

**JK.** $0 \to 0$: hold (00) or reset (01) both work, so $J = 0$, $K = x$. $0 \to 1$: set (10) or toggle (11), so $J = 1$,
$K = x$. $1 \to 0$: reset (01) or toggle (11), so $J = x$, $K = 1$. $1 \to 1$: hold (00) or set (10), so $J = x$, $K = 0$.

**SR.** $0 \to 0$: hold (00) or reset (01): $S = 0$, $R = x$. $0 \to 1$: only set: $S = 1, R = 0$. $1 \to 0$: only reset:
$S = 0, R = 1$. $1 \to 1$: hold (00) or set (10): $S = x$, $R = 0$. ($S = R = 1$ is never used.)

**D.** $D = Q^+$ in every row: the input is the next state.

**T.** $T = Q \oplus Q^+$: 1 exactly when the bit must change.

**Sanity check.** Each entry can be read off the characteristic equations: for JK with $Q = 0$, $Q^+ = J$, so $J$ must
equal $Q^+$ and $K$ is free; with $Q = 1$, $Q^+ = \overline{K}$, so $K = \overline{Q^+}$ and $J$ is free. `seqlib.excitation`
tries all input combinations for every transition and returns exactly these tables.
:::

:::table{#excitation-table title="Excitation tables" depth="standard"}
| $Q$ | $Q^+$ | $S$ | $R$ | $J$ | $K$ | $D$ | $T$ |
|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 0 | 0 | 0 | x | 0 | x | 0 | 0 |
| 0 | 1 | 1 | 0 | 1 | x | 1 | 1 |
| 1 | 0 | 0 | 1 | x | 1 | 0 | 1 |
| 1 | 1 | x | 0 | x | 0 | 1 | 0 |
:::

:::trick{#trick-excitation title="JK excitation: the bit you need, then x" depth="standard"}
For a JK flip-flop, look at the present state. If $Q = 0$, only $J$ matters and it must be the **next** state: $J = Q^+$,
$K = x$. If $Q = 1$, only $K$ matters and it must be the **complement** of the next state: $J = x$, $K = \overline{Q^+}$. So the
table is "the bit you need, then x" in the top half and "x, then the bit that resets" in the bottom half. **Why it
works:** with $Q = 0$ the JK equation reduces to $Q^+ = J$, and with $Q = 1$ to $Q^+ = \overline{K}$. **When it fails:** for SR
the $0 \to 1$ and $1 \to 0$ rows have no don't-care (set and reset are the only ways), so do not carry the x pattern over
to SR.
:::

The excitation table turns a state diagram into flip-flop inputs. This is the core step of counter and state-machine
design in [Lesson 5](lesson:synchronous-counter-design); here is the one-flip-flop version GATE asked in IT 2008.

:::definition{#ff-design-from-diagram term="Realising a state diagram with one flip-flop" depth="standard"}
Given a state diagram whose states are the values of one flip-flop $Q$ and whose arcs are labelled with the inputs
$x$ that cause them:

1. For every state $Q$ and every input $x$, read the next state $Q^+$ from the diagram.
2. Look up the excitation table of the chosen flip-flop to get its inputs (with don't-cares) for that transition.
3. Write each flip-flop input as a Boolean function of $x$ and $Q$, using the don't-cares to simplify (K-map).

When the diagram says "change state" or "stay" for each input independently of the state, the T input is simply the
condition for change, and a JK can use $J = K = T$.
:::

:::note{#recap-exc title="Recap" depth="quick"}
Excitation = characteristic table backwards. JK: $0 \to 0$ (0, x), $0 \to 1$ (1, x), $1 \to 0$ (x, 1), $1 \to 1$ (x, 0). SR:
(0, x), (1, 0), (0, 1), (x, 0). D: $D = Q^+$. T: $T = Q \oplus Q^+$.
:::

## Converting one flip-flop into another

:::intuition{#conv-intuition title="A translator in front of the flip-flop" depth="standard"}
Your parts bin holds only D flip-flops and the design calls for a JK. Put a small combinational **translator** in front of
the D: it listens to $J$, $K$ and $Q$, works out where a real JK would go, and tells the D to go there. We already have both
tools: the **characteristic table** of the flip-flop we want (where should the bit go?) and the **excitation table** of the
one we have (which input sends it there?).
:::

:::definition{#conversion term="The conversion method" depth="standard"}
To build a **target** flip-flop (inputs $a, b, \dots$) from an **available** flip-flop:

1. List every combination of the target's inputs and the present state $Q$ (a truth table with $Q$ as the last variable).
2. For each row, fill in $Q^+$ from the target's **characteristic** table.
3. For each row, fill in the available flip-flop's inputs from its **excitation** table for the transition $Q \to Q^+$
   (including any don't-cares; forbidden target rows, such as $SR = 11$, are don't-cares too).
4. Minimise each available input as a function of the target inputs and $Q$ (K-map). The result is the translator.

For a D flip-flop the excitation is $D = Q^+$, so step 4 simply minimises the target's characteristic equation: **a
D flip-flop becomes any flip-flop by computing that flip-flop's characteristic equation into D.**
:::

:::derivation{#jk-from-d of="a JK flip-flop from a D flip-flop" depth="standard"}
The D flip-flop needs $D = Q^+$, and the JK's next state is its characteristic equation. So

$$D = J\,\overline{Q} + \overline{K}\,Q.$$

The translator is one AND–OR pair with an inverter on $K$ and the flip-flop's own $\overline{Q}$ and $Q$ fed back.

**Sanity check.** $J = K = 1$: $D = \overline{Q}$, the toggle. $J = 1, K = 0$: $D = \overline{Q} + Q = 1$, set. `seqlib.convert("JK", "D")`
minimises the eight rows and returns $JQ' + K'Q$.
:::

:::derivation{#t-from-d of="a T flip-flop from a D flip-flop" depth="standard"}
Again $D = Q^+$, now with the T characteristic equation:

$$D = T \oplus Q = T\,\overline{Q} + \overline{T}\,Q.$$

One XOR gate between $T$ and the fed-back $Q$.

**Sanity check.** $T = 0$: $D = Q$, hold. $T = 1$: $D = \overline{Q}$, toggle. The same circuit with $T = 1$ wired permanently is
a D flip-flop with $D = \overline{Q}$, the divide-by-two stage of every ripple counter
([Lesson 4](lesson:ripple-counters)).
:::

:::derivation{#d-from-jk of="a D flip-flop from a JK flip-flop" depth="standard"}
Rows $(D, Q)$ and the JK excitation for $Q \to Q^+ = D$:

| $D$ | $Q$ | $Q^+$ | $J$ | $K$ |
|:--:|:--:|:--:|:--:|:--:|
| 0 | 0 | 0 | 0 | x |
| 0 | 1 | 0 | x | 1 |
| 1 | 0 | 1 | 1 | x |
| 1 | 1 | 1 | x | 0 |

$J$ is 1 only in row 10 and x where $Q = 1$, so $J = D$. $K$ is 1 only in row 01 and x where $Q = 0$, so $K = \overline{D}$:

$$J = D, \qquad K = \overline{D}.$$

**Sanity check.** A JK with $K = \overline{J}$ never sees 00 or 11: it is always told "set" or "reset", which is what "load D"
means. No gate is needed except one inverter.
:::

:::derivation{#jk-from-t of="a JK flip-flop from a T flip-flop" depth="standard"}
The T flip-flop must toggle exactly when the JK's next state differs from $Q$: $T = Q \oplus Q^+$. Row by row, with $Q = 0$ the
JK moves to 1 when $J = 1$, and with $Q = 1$ it moves to 0 when $K = 1$. So $T = 1$ exactly for ($Q = 0$ and $J = 1$) or
($Q = 1$ and $K = 1$):

$$T = J\,\overline{Q} + K\,Q.$$

**Sanity check.** $J = K = 1$: $T = \overline{Q} + Q = 1$, always toggle. $J = K = 0$: $T = 0$, hold. Compare it with the JK
characteristic equation $J\overline{Q} + \overline{K}Q$: the only difference is $K$ instead of $\overline{K}$, a favourite distractor.
:::

The animation runs the method for the first conversion, JK from D, row by row: the JK characteristic table gives $Q^+$, the
D excitation copies it into the D column, and the K-map of that column groups into $J\overline{Q} + \overline{K}Q$.

:::viz{#ff-conversion-viz spec="ff-conversion" mode="animate" depth="standard"}
:::

:::note{#recap-conv title="Recap" depth="quick"}
Target's characteristic table → $Q^+$; available flip-flop's excitation table → its inputs; K-map → translator. From D:
$D$ = target's characteristic equation ($J\overline{Q} + \overline{K}Q$, $T \oplus Q$). D from JK: $J = D$, $K = \overline{D}$. JK
from T: $T = J\overline{Q} + KQ$.
:::

### Worked examples: excitation and conversion

::::example{#ex-exc-easy level="easy" title="Filling the JK excitation table from the equation" depth="quick"}
Using only $Q^+ = J\overline{Q} + \overline{K}Q$, find the JK inputs for the transitions $0 \to 1$ and $1 \to 1$.

:::step{why="With Q = 0 the K term disappears, so only J controls the next state."}
$Q = 0$: $Q^+ = J$. For $0 \to 1$ we need $J = 1$, and $K$ is free: $(J, K) = (1, x)$.
:::

:::step{why="With Q = 1 the J term disappears, so only K controls the next state."}
$Q = 1$: $Q^+ = \overline{K}$. For $1 \to 1$ we need $K = 0$, and $J$ is free: $(J, K) = (x, 0)$.
:::

:::answer
$0 \to 1$: $J = 1$, $K = x$. $1 \to 1$: $J = x$, $K = 0$. The other two rows follow the same way: $0 \to 0$ is $(0, x)$ and
$1 \to 0$ is $(x, 1)$.
:::
::::

::::example{#ex-exc-dfromjk level="medium" title="Make a D flip-flop out of a JK" depth="standard"}
Only JK flip-flops are available. What logic must drive $J$ and $K$ so that the flip-flop behaves as a D flip-flop with input
$D$?

:::step{why="The target is D, so the next state in every row is D itself."}
Rows $(D, Q)$: $Q^+ = D$ for all four.
:::

:::step{why="The JK excitation table supplies J and K for each transition Q → D."}
(0, 0): $0 \to 0$, $(J, K) = (0, x)$. (0, 1): $1 \to 0$, $(x, 1)$. (1, 0): $0 \to 1$, $(1, x)$. (1, 1): $1 \to 1$, $(x, 0)$.
:::

:::step{why="Each input is minimised over D and Q using its don't-cares."}
$J$: 1 at (1, 0), x at $Q = 1$, so $J = D$. $K$: 1 at (0, 1), x at $Q = 0$, so $K = \overline{D}$.
:::

:::answer
$J = D$, $K = \overline{D}$: one inverter. The JK then only ever sees "set" (10) or "reset" (01), never hold or toggle.
:::
::::

::::example{#ex-exc-it2008 level="gate" title="J and K from a state diagram (GATE IT 2008 pattern)" depth="standard"}
A one-flip-flop machine has states 0 and 1 and inputs $x$, $y$. In each state, $xy = 00$ or $11$ keeps the state, and
$xy = 01$ or $10$ moves to the other state. It is realised with a JK flip-flop. Find $J$ and $K$.

:::step{why="The diagram says when the state changes, independent of which state it is in."}
The state changes exactly when $x \ne y$, i.e. when $x \oplus y = 1$; it holds when $x \oplus y = 0$.
:::

:::step{why="The excitation table turns each transition into J, K entries with don't-cares."}
From $Q = 0$: change ($0 \to 1$) needs $(1, x)$, stay ($0 \to 0$) needs $(0, x)$, so $J = x \oplus y$ (and $K$ free). From
$Q = 1$: change ($1 \to 0$) needs $(x, 1)$, stay needs $(x, 0)$, so $K = x \oplus y$ (and $J$ free).
:::

:::step{why="Choosing J = K turns the JK into a T flip-flop with T = the change condition, which satisfies both halves."}
$J = K = x \oplus y$: with $x \oplus y = 1$ the JK toggles, with $x \oplus y = 0$ it holds, which is exactly the diagram.
:::

:::answer
$J = x \oplus y$ and $K = x \oplus y$ (IT 2008, option D). Trying all four options against the diagram for both states confirms
only D works: options with $\overline{x \oplus y}$ toggle on 00 and 11 instead.
:::
::::

::::example{#ex-exc-jkfromt level="medium" title="A JK flip-flop from a T flip-flop" depth="standard"}
Design the logic that makes a T flip-flop behave as a JK flip-flop.

:::step{why="The target is JK, so its characteristic table gives Q+ for each of the eight rows (J, K, Q)."}
$Q^+ = J\overline{Q} + \overline{K}Q$: rows with $Q = 0$ go to $J$; rows with $Q = 1$ go to $\overline{K}$.
:::

:::step{why="The T excitation is T = Q ⊕ Q+, which is 1 exactly when the state must change."}
With $Q = 0$: change iff $J = 1$. With $Q = 1$: change iff $\overline{K} = 0$, i.e. $K = 1$.
:::

:::step{why="Writing the two cases as one sum of products gives the translator."}
$T = J\overline{Q} + KQ$.
:::

:::answer
$T = J\overline{Q} + KQ$. Check: $J = K = 1$ gives $T = 1$ (toggle), $J = K = 0$ gives $T = 0$ (hold), $J = 1, K = 0$ gives
$T = \overline{Q}$ (from 0 it toggles to 1, from 1 it stays at 1: set). The distractor $J\overline{Q} + \overline{K}Q$ is the JK
characteristic equation, which belongs in front of a **D**, not a T.
:::
::::

::::example{#ex-exc-srfromjk level="gate" title="Edge case: an SR flip-flop from a JK" depth="standard"}
Build an SR flip-flop from a JK flip-flop. What happens to the forbidden row $S = R = 1$?

:::step{why="The forbidden target row is never used, so in every column it is a don't-care."}
Rows $(S, R, Q)$ with $SR = 11$: $Q^+$ = x, so $J$ = x and $K$ = x there.
:::

:::step{why="In the other rows SR and JK mean the same thing, so the excitation gives J = S and K = R on them."}
$SR = 00$: hold, $(J, K)$ from the excitation = $(0, x)$ or $(x, 0)$. $SR = 10$: set, $(1, x)$ or $(x, 0)$. $SR = 01$: reset,
$(0, x)$ or $(x, 1)$. Minimising with the don't-cares: $J = S$, $K = R$.
:::

:::answer
$J = S$, $K = R$: wire them straight through. The forbidden SR row has become a don't-care, and the circuit actually
**toggles** on $S = R = 1$; that is harmless, because an SR user promises never to apply it. The reverse conversion (JK from
SR) is the one that needs gates: $S = J\overline{Q}$, $R = KQ$, so that 11 never reaches the SR flip-flop.
:::
::::

## Asynchronous preset and clear

:::intuition{#preset-intuition title="The reset button on the back of the router" depth="standard"}
A router changes its settings through its interface, but a small button on the back forces it into a known state **right
now**. Flip-flops have the same emergency inputs. At power-up flip-flops hold random bits, and the system must force them to known values before the clock means
anything, so the force must act **immediately, ignoring the clock**.
:::

:::definition{#preset-clear term="Asynchronous preset and clear" depth="standard"}
Most flip-flops have two extra inputs that act **asynchronously** (without waiting for a clock edge) and override everything
else:

- **Preset** (PRE, also called set): forces $Q = 1$ immediately.
- **Clear** (CLR, also called reset): forces $Q = 0$ immediately.

On most symbols and chips they are **active low**, drawn with a bubble and written $\overline{PRE}$, $\overline{CLR}$: a 0 on the
pin forces the output, and 1 lets the flip-flop work normally. Internally they are extra inputs on the output latch (for
example a third input on each NAND of the slave), which is why they inherit the latch's forbidden combination: both active at
once ($\overline{PRE} = \overline{CLR} = 0$ for active-low pins) drives $Q = \overline{Q} = 1$ and is not allowed.
:::

:::table{#preset-table title="Active-low preset and clear" depth="standard"}
| $\overline{PRE}$ | $\overline{CLR}$ | Effect |
|:--:|:--:|:--|
| 1 | 1 | normal clocked operation (characteristic table at each active edge) |
| 0 | 1 | $Q = 1$ at once; clock edges ignored while held |
| 1 | 0 | $Q = 0$ at once; clock edges ignored while held |
| 0 | 0 | not allowed ($Q = \overline{Q} = 1$ in a NAND implementation) |
:::

:::note{#erratum-c345 title="Preset forces a 1" depth="standard"}
At least one set of notes states that preset makes the output 0. It does the opposite: **preset** puts a 1 in the flip-flop
(it "pre-sets" it) and **clear** puts a 0 in it. Remember it with the words: you *set* a bit to 1 and *clear* it to 0, and
preset is an early set. A related confusion is the bubble: an active-low preset is still a preset; the bubble says the pin
acts when it is 0, not that it produces a 0. In a gate-level check (`seqlib.fixed_points` on a NAND output latch with a third
input for $\overline{PRE}$), $\overline{PRE} = 0$ has the single stable state $Q = 1$.
:::

A **synchronous** clear, by contrast, is ordinary logic in front of the input (for example $D = \overline{\text{CLR}} \cdot
D_{\text{normal}}$) and acts only at the next edge. [Lesson 4](lesson:ripple-counters) uses the difference: an asynchronous
clear makes the clearing state a brief glitch, a synchronous one makes it last a full period.

:::note{#recap-preset title="Recap" depth="quick"}
Preset forces 1, clear forces 0, both immediately and regardless of the clock; usually active low; both active together is
not allowed. A synchronous clear acts only at the next edge.
:::

## Timing parameters: setup, hold and clock-to-Q

:::intuition{#timing-intuition title="Holding still for the photo" depth="standard"}
A shutter is not infinitely fast, so a photographer asks you to hold still **a little before** the click and **a little
after** it. A flip-flop asks the same: the input must be steady for a short time before the edge (the **setup time**) and
after it (the **hold time**). Move inside that window and the photo blurs: the flip-flop may capture the old value, the new
one, or hover between 0 and 1 for a while (metastability). And the photo takes a moment to develop: the output appears a
little after the click (the **clock-to-Q delay**).
:::

:::definition{#timing-params term="Setup time, hold time, clock-to-Q delay" depth="standard"}
For an edge-triggered flip-flop and an active edge at time $t_e$:

- **Setup time** $t_{su}$: the data input must be stable from $t_e - t_{su}$ up to the edge.
- **Hold time** $t_h$: the data input must stay stable from the edge until $t_e + t_h$.
- **Clock-to-Q delay** $t_{cq}$ (also the flip-flop's propagation delay $t_{pd}$): the output changes at $t_e + t_{cq}$.

The interval $(t_e - t_{su},\; t_e + t_h)$ is the **sampling window** (aperture). Datasheets give maximum and minimum values;
the maximum $t_{cq}$ matters for speed, the minimum for hold checks. Hold times are often zero or even negative in modern
flip-flops; GATE questions state them.
:::

:::theorem{#setup-hold-window name="What an edge samples" depth="standard"}
Let a flip-flop with setup time $t_{su}$ and hold time $t_h$ see an active edge at $t_e$.

1. If the data input does not change in the window $(t_e - t_{su},\; t_e + t_h)$, the flip-flop samples the value the input
   had just before the edge (which is also its value throughout the window), and its output takes the corresponding next state
   at $t_e + t_{cq}$.
2. If the input changes inside the window, the value captured is not guaranteed: it may be the old value, the new value, or a
   metastable level that resolves to either after an unbounded time.

With $t_h = 0$ the window is $(t_e - t_{su}, t_e)$, open at the edge: an input that changes **exactly at** the edge was stable
for the whole window before it, so the old value is captured.
:::

:::proof{#proof-setup-hold of="the sampling window (sketch)" depth="standard"}
**Idea first:** inside a flip-flop the edge closes a latch; a latch closing on a changing input is the release race of
Lesson 1, and the setup and hold times are the margins that keep the race from starting.

Take the master closing at the edge. To hold a clean value, its loop must already have settled on it: the data must have
passed the input gates and gone round the loop, which takes the setup time. After the edge, the gate that disconnects the
input needs a moment to switch off, during which a change can still leak in: the hold time.

Case 1: the input is constant throughout the window. Then the master's loop has settled on that value before the edge and is
cut off from the input before the input next changes, so it holds the value; the slave copies it and $Q$ changes $t_{cq}$ after
the edge. That value is the one the input had just before the edge.

Case 2: the input changes inside the window. Then the master closes while its loop is still moving between the two values, the
symmetric situation of the release race. Lesson 1 showed that the outcome then depends on tiny differences in delay: the loop
may settle on either value, and a loop that starts very near its balanced point takes arbitrarily long to leave it. So no
particular value can be promised. ∎

**Check by simulation.** `seqlib.scope` applies exactly this rule tick by tick: a change of an input at tick $c$ flags a setup
violation at edge $t$ when $t - t_{su} < c < t$ and a hold violation when $t \le c < t + t_h$, and the state becomes unknown (X).
A change at $c = t$ with $t_h = 0$ flags nothing, and the old value is sampled.
:::

The animation shows one rising edge with its window shaded, and three versions of D: one that changes before the window, one
that changes inside it, and one that changes after the hold time.

:::viz{#setup-hold-viz spec="setup-hold" mode="animate" depth="standard"}
:::

Between two flip-flops, setup and hold become two inequalities about the whole path.

:::derivation{#max-frequency of="the setup and hold constraints of a register-to-register path" depth="standard"}
Take a launching flip-flop, combinational logic with delays between $t_{logic,min}$ and $t_{logic,max}$, and a capturing
flip-flop, both clocked by the same clock of period $T$ (no clock skew). An edge at time 0 launches new data.

**Setup (the slow path).** The new data appears at the launching flip-flop's output at $t_{cq}$, passes through the logic and
reaches the capturing flip-flop's input at the latest at $t_{cq} + t_{logic,max}$. It must be there $t_{su}$ before the next edge
at $T$:

$$t_{cq} + t_{logic,max} \le T - t_{su} \quad\Longleftrightarrow\quad T \ge t_{cq} + t_{logic,max} + t_{su}, \qquad f_{max} = \frac{1}{t_{cq} + t_{logic,max} + t_{su}}.$$

**Hold (the fast path).** The same edge at time 0 is also the capturing flip-flop's sampling edge for the **old** data. The new
data reaches its input at the earliest at $t_{cq,min} + t_{logic,min}$, and it must not arrive inside that flip-flop's hold
window:

$$t_{cq,min} + t_{logic,min} \ge t_h.$$

The hold inequality does not contain $T$: a hold violation cannot be fixed by slowing the clock, only by adding delay to the
short path.

**Sanity check.** With $t_{cq} = 5$ ns, $t_{logic,max} = 12$ ns and $t_{su} = 3$ ns: $T \ge 20$ ns, $f_{max} = 50$ MHz. Running at
$T = 18$ ns would put the data's arrival (17 ns) inside the setup window (15 to 18 ns) of the next edge, and `seqlib.sample` flags
that edge; at $T = 20$ ns it flags nothing.
:::

:::trap{#trap-edge-change title="An input that changes exactly at the edge" depth="standard"}
GATE 2001 drew an input X that rises **exactly at** a rising clock edge, with setup time 20 ns and hold time 0. The tempting
reading is "X is 1 at the edge, so the flip-flop captures 1". It does not. With $t_h = 0$ the sampling window is the 20 ns
**before** the edge; during that window X was 0, steadily. The flip-flop captures the **old** value 0, and the new 1 is seen only
at the next edge. (If the hold time were positive, the same picture would be a hold violation and the captured value would be
unknown; neither reading gives "1 at this edge".) The rule to remember: **at an edge, every input has the value it had just
before the edge.**
:::

:::aside{#metastability title="Metastability, briefly" depth="deep"}
A violated window can leave the internal loop near the balanced point between 0 and 1 (Lesson 1). The time to leave it is
unbounded, but the chance of still being undecided falls exponentially with the time allowed. So inputs from outside the clock
domain (a button, another chip) pass through two flip-flops in series, a **synchroniser**: the second samples the first a whole
period later, when it has almost surely resolved. GATE asks only that you recognise a change inside the window as an unreliable
sample.
:::

:::note{#recap-timing title="Recap" depth="quick"}
Data must be stable $t_{su}$ before and $t_h$ after the edge; the output moves $t_{cq}$ after it. Setup: $T \ge t_{cq} + t_{logic,max}
+ t_{su}$. Hold: $t_{cq,min} + t_{logic,min} \ge t_h$, independent of the clock. A change exactly at the edge with $t_h = 0$ is
read as the old value.
:::

### Worked examples: timing

::::example{#ex-tim-easy level="easy" title="A D flip-flop waveform with clock-to-Q delay" depth="quick"}
A positive-edge D flip-flop has $t_{cq} = 3$ ns and starts at $Q = 0$. Its rising clock edges are at 10, 30, 50 and 70 ns. D is
0 at first, rises at 15 ns, falls at 42 ns and rises again at 61 ns. When does Q change, and to what?

:::step{why="At each edge the flip-flop takes the value D had just before it."}
Edge 10 ns: D = 0. Edge 30 ns: D = 1 (since 15 ns). Edge 50 ns: D = 0 (since 42 ns). Edge 70 ns: D = 1 (since 61 ns).
:::

:::step{why="The output follows the sampled value only after the clock-to-Q delay, and only when it differs from the present Q."}
Q stays 0 after the first edge; rises at $30 + 3 = 33$ ns; falls at 53 ns; rises at 73 ns.
:::

:::answer
Q = 0 until 33 ns, 1 from 33 to 53 ns, 0 from 53 to 73 ns, 1 after 73 ns. It is D, delayed to the next rising edge plus 3 ns:
every change of D between two edges is postponed to the following edge.
:::
::::

::::example{#ex-tim-fmax level="medium" title="Maximum clock frequency of a path" depth="standard"}
A register-to-register path has $t_{cq} = 5$ ns, combinational delay between 2 ns and 12 ns, $t_{su} = 3$ ns and $t_h = 1$ ns. Find
the maximum clock frequency and check the hold constraint.

:::step{why="The setup constraint uses the slowest path: launch, logic, and the setup margin before the next edge."}
$T_{min} = t_{cq} + t_{logic,max} + t_{su} = 5 + 12 + 3 = 20$ ns.
:::

:::step{why="Frequency is the reciprocal of the minimum period."}
$f_{max} = 1 / 20\ \text{ns} = 50$ MHz.
:::

:::step{why="The hold constraint uses the fastest path and does not involve the clock period."}
$t_{cq} + t_{logic,min} = 5 + 2 = 7$ ns $\ge t_h = 1$ ns: no hold problem.
:::

:::answer
$f_{max} = 50$ MHz, and the path is hold-safe with 6 ns to spare. The common slips are to forget $t_{cq}$ (giving 15 ns, 66.7 MHz)
or to forget $t_{su}$ (17 ns, 58.8 MHz); both produce a clock that the circuit cannot meet.
:::
::::

::::example{#ex-tim-2001 level="gate" title="An input that changes at the edge (GATE 2001 pattern)" depth="standard"}
Two positive-edge D flip-flops share clock C, with $t_{su} = 20$ ns, $t_h = 0$ and initial $Q_0 = Q_1 = 0$. $D_0 = X$ and
$D_1 = X\,\overline{Q_0}$; the output is $Y = Q_1$. X is 0, rises **exactly at** rising edge 1, and stays 1 until just before
edge 6. Describe Y.

:::step{why="With hold time 0, a change exactly at an edge is not seen at that edge: the old value was stable through the setup window."}
Edge 1: both flip-flops sample X = 0 (and $D_1 = 0$). So $Q_0 = 0$ and $Y = 0$ after edge 1.
:::

:::step{why="Both flip-flops sample at the same edge, so D1 uses the old Q0, which is still 0."}
Edge 2: $X = 1$, $\overline{Q_0} = 1$, so $D_1 = 1$: Y rises. At the same edge $Q_0$ becomes 1.
:::

:::step{why="From now on Q0 = 1 makes D1 = 0, whatever X does."}
Edge 3: $D_1 = 1 \cdot 0 = 0$: Y falls. Edges 4, 5, 6: $\overline{Q_0} = 0$ keeps Y at 0 (at edge 6 X has dropped, which only
affects $Q_0$).
:::

:::answer
Y is a single pulse, high from edge 2 to edge 3 (GATE 2001, option A). The tick-by-tick simulation with a 10 ns tick, a 40 ns clock
and $t_{su}$ = 2 ticks gives the same Y and flags no violation at edges 1 to 5. The circuit is a **rising-edge detector**: Y marks
the first clock period after X has become 1. Options that start Y at edge 1 read X as 1 at the edge where it changes.
:::
::::

::::example{#ex-tim-hold level="gate" title="Edge case: a hold violation from a short path" depth="standard"}
Two D flip-flops are connected directly, $Q_1 \to D_2$, with no logic between them (a 2-bit shift register). Each has
$t_{cq} = 1$ ns (minimum) and $t_h = 2$ ns. The clock period is 100 ns. Does the circuit work? What is the fix?

:::step{why="The hold check compares the earliest arrival of new data with the end of the hold window."}
At an edge, $Q_1$ changes at $t_{cq} = 1$ ns, and with no logic it reaches $D_2$ at 1 ns.
:::

:::step{why="The capturing flip-flop's hold window runs from the edge to t_h after it."}
$D_2$ must be stable until 2 ns, but it changes at 1 ns: $1 < 2$, a **hold violation**. Flip-flop 2 may capture the bit that
flip-flop 1 has only just taken, so a bit can skip a stage.
:::

:::step{why="The hold inequality has no clock period in it, so the only fix is delay on the short path."}
Need $t_{cq,min} + t_{logic,min} \ge t_h$: add at least $2 - 1 = 1$ ns of delay (buffers) between $Q_1$ and $D_2$.
:::

:::answer
It fails: 1 ns of arrival against 2 ns of hold. A slower clock does not help (the 100 ns period never entered the
calculation); a 1 ns buffer delay does. This is why shift registers are built from flip-flops whose hold time is less than
their own clock-to-Q delay.
:::
::::

## Reading timing diagrams

:::intuition{#diagram-intuition title="Stop-motion" depth="standard"}
A timing-diagram question shows waveforms that move continuously, and the temptation is to read them continuously. But a
circuit of edge-triggered flip-flops lives in **stop-motion**: nothing it stores changes except at the active edges, and at each
edge every flip-flop takes one frame of the inputs (the frame just before the edge). So read the diagram as a flip-book: one
frame per active edge, and between frames the stored values are frozen.
:::

:::definition{#timing-diagram-method term="The edge-by-edge method" depth="standard"}
To find the outputs of a circuit of edge-triggered flip-flops from a timing diagram:

1. **Mark** every active edge (rising for positive-edge, falling for negative-edge flip-flops; mark both kinds if both are used).
2. At each marked edge, **read** every flip-flop input **just before** the edge: external inputs from the diagram, internal ones
   computed from the flip-flop outputs as they were **before** this edge.
3. **Update** all the flip-flops of that edge at once with their characteristic equations.
4. **Hold** the outputs constant until the next marked edge, then repeat.

When a question numbers clock periods ("the value of A in the i-th period"), write the state of period $i + 1$ as a function of
the inputs of period $i$: a D flip-flop's output in period $i + 1$ is its D input in period $i$.
:::

:::trick{#trick-before-edge title="Read the input just left of the edge" depth="standard"}
Put your pencil on the active edge and look one hair to the **left**. Whatever every input is there is what the flip-flops use.
**Why it works:** that is the setup window, where a well-behaved input must be stable. **When it fails:** if the input changes
inside the setup window (closer to the edge than $t_{su}$, but not exactly at it), the value is not guaranteed; a question that
does this on purpose is asking about a violation, not a value.
:::

:::trap{#trap-same-edge title="Two flip-flops on one edge both see old values" depth="standard"}
When flip-flop A feeds flip-flop B and both are clocked by the same edge, B does **not** see A's new output at that edge. At the
edge both sample at once, and A's new value appears only $t_{cq}$ later, by which time B has already sampled. So B always takes
A's **old** value. This is what makes a chain of D flip-flops a shift register (each bit moves one stage per clock, not all the
way through), and it is the trap in GATE 2000: the D flip-flop takes the JK's value from **before** the toggle. A student who
lets B see A's new value gets $(P, Q) = (1, 1)$ after one cycle, an option that was offered.
:::

The last idea uses both edges of one clock. A signal that changes only at falling edges of a clock of period $T$ is at fastest a
square wave of period $2T$, so a delay of one clock period $T$ is half its period: 180°.

:::theorem{#phase-delay name="Delaying a signal by one clock period with two edges" depth="standard"}
Let a signal $f$ change only at falling edges of a clock of period $T$ with 50% duty cycle. A positive-edge D flip-flop with
$D = f$ followed by a negative-edge D flip-flop (or a positive-edge one clocked by $\overline{CLK}$) whose input is the first
flip-flop's $Q$ produces $f$ delayed by exactly $T$ (plus the clock-to-Q delay), with no setup or hold problem. For the fastest
such $f$ (period $2T$) this is a 180° phase delay.
:::

:::proof{#proof-phase of="the two-edge delay" depth="standard"}
**Idea first:** each flip-flop samples half a period after its input last changed, so neither ever samples a changing signal,
and each adds half a period of delay.

Let $f$ change at a falling edge $t_k$. The first flip-flop samples at the next rising edge, $t_k + T/2$; $f$ has been stable since
$t_k$, a full half-period, so with $t_{su}, t_h < T/2$ there is no violation, and $Q_1 = f$ from $t_k + T/2$. The second flip-flop
samples at the next falling edge, $t_k + T$; $Q_1$ has been stable since $t_k + T/2$, again half a period, so it captures the new
value and $Q_2 = f(t_k)$ from $t_k + T$ on. Every change of $f$ reappears exactly $T$ later. The fastest $f$ has period $2T$, and
$T / 2T = 1/2$ of a period is $180°$. ∎

**Check by simulation.** `seqlib.scope` with a 4-tick clock and $f$ changing at falling edges: the output equals $f$ shifted by 4
ticks (one clock period) plus the 1-tick clock-to-Q delay, for every edge.
:::

:::note{#recap-diagram title="Recap" depth="quick"}
Mark the active edges, read inputs just left of each edge, update all flip-flops of that edge at once (each sees the others' old
values), hold until the next edge. A rising-edge stage followed by a falling-edge stage delays a falling-edge signal by one clock
period, 180° of the fastest such signal.
:::

### Worked examples: timing diagrams and phase

::::example{#ex-dia-neg level="easy" title="Same input, positive and negative edge" depth="quick"}
A clock of period 20 ns rises at 0, 20, 40, 60 ns and falls at 10, 30, 50, 70 ns. D is 0, rises at 5 ns, falls at 25 ns, rises at
33 ns and falls at 58 ns. What does a negative-edge D flip-flop store after each falling edge, and a positive-edge one after the
rising edges at 20, 40, 60 ns?

:::step{why="A negative-edge flip-flop reads D just before each falling edge."}
Falling edges: 10 ns → D = 1; 30 ns → D = 0; 50 ns → D = 1; 70 ns → D = 0.
:::

:::step{why="A positive-edge flip-flop reads D just before each rising edge."}
Rising edges: 20 ns → D = 1; 40 ns → D = 1; 60 ns → D = 0.
:::

:::answer
Negative edge: 1, 0, 1, 0. Positive edge: 1, 1, 0. The same waveform gives different stored sequences depending on which edge
is active: always check for the bubble in front of the clock triangle.
:::
::::

::::example{#ex-dia-2005 level="medium" title="An output sequence in terms of the input (GATE 2005 pattern)" depth="standard"}
A positive-edge D flip-flop has $D = A\,X + \overline{X}\,\overline{Q}$ and output $Y = Q$. Clock periods are numbered 0, 1, 2, …, each
starting at a rising edge; $A_i$ is the value of A in period $i$. X is 1 in periods 0, 1, 3, 4 and 0 in periods 2 and 5. Find Y in
periods 1 to 5.

:::step{why="A D flip-flop's output in period i + 1 is its D input in period i, read just before the edge that starts period i + 1."}
$Y_{i+1} = D_i = A_i X_i + \overline{X_i}\,\overline{Y_i}$.
:::

:::step{why="Where X = 1 the D input is just A."}
$Y_1 = A_0$, $Y_2 = A_1$, $Y_4 = A_3$, $Y_5 = A_4$ (periods 0, 1, 3, 4 have $X = 1$).
:::

:::step{why="Where X = 0 the D input is the complement of the present output, which we found in the previous step."}
$Y_3 = \overline{Y_2} = \overline{A_1}$ (period 2 has $X = 0$).
:::

:::answer
$Y = A_0,\ A_1,\ \overline{A_1},\ A_3,\ A_4$ (GATE 2005, option A). The tempting $\overline{A_2}$ in the third place comes from forgetting
that with $X = 0$ the flip-flop complements **its own** output, not the input A. Simulating the circuit for all 64 values of
$A_0 \dots A_5$ matches option A every time and each other option at least once fails.
:::
::::

::::example{#ex-dia-2006 level="gate" title="A 180° phase delay (GATE 2006 pattern)" depth="standard"}
A 50% duty-cycle clock of period $T$ drives D flip-flops; a waveform $f$ changes only at the clock's negative edges. Which
arrangement delays $f$ by 180°: (A) $\overline{f}$ into a flip-flop clocked by $\overline{CLK}$, its $\overline{Q}$ into a flip-flop on
$CLK$; (B) $\overline{f}$ into a flip-flop on $CLK$, its $Q$ into one on $\overline{CLK}$; (C) $f$ into a flip-flop on $CLK$, its $Q$
into one on $\overline{CLK}$; (D) $f$ into a flip-flop on $\overline{CLK}$, its $\overline{Q}$ into one on $CLK$? (All flip-flops are
positive-edge; clocking by $\overline{CLK}$ makes the falling edge active.)

:::step{why="180° of the fastest f, whose period is 2T, is a delay of exactly one clock period T with no inversion."}
We need a circuit whose output is $f$, not $\overline{f}$, delayed by $T$.
:::

:::step{why="Inversions must cancel; B inverts f once, D inverts once (Q̄), A twice."}
B gives $\overline{f}$ delayed: wrong. D gives $\overline{f}$ (one inversion, the $\overline{Q}$): wrong. A and C keep the polarity.
:::

:::step{why="A flip-flop clocked at the negative edge samples f exactly when f changes, the edge-change problem."}
In A the first flip-flop samples $\overline{f}$ at the falling edge, the very instant $f$ changes: with zero hold it takes the old value
(and the total delay becomes $1.5T$, 270°); with any hold time it is a violation. In C the first flip-flop samples at the rising
edge, half a period after $f$ changed, and the second at the falling edge, half a period later: by the theorem, a clean delay of $T$.
:::

:::answer
C (GATE 2006, option C): rising-edge stage then falling-edge stage, delay $T$ = 180° of the fastest $f$. The simulation gives C's
output as $f$ shifted by one clock period; A as $f$ shifted by $1.5T$ (sampling the old value at the changing edge); B and D as
$\overline{f}$.
:::
::::

::::example{#ex-dia-pulse level="gate" title="Edge case: a pulse between two edges is never seen" depth="standard"}
A clock is high from 0 to 10 ns, 20 to 30 ns and 40 to 50 ns (rising edges at 0, 20, 40 ns). D is 0 except for a pulse that is 1
from 23 to 31 ns. Compare a positive-edge D flip-flop with a D latch enabled by the same clock (both start at 0, no delays).

:::step{why="The flip-flop looks only just before the rising edges at 20 and 40 ns."}
Just before 20 ns, D = 0; just before 40 ns, D = 0 (the pulse ended at 31 ns). The flip-flop stays at 0 throughout.
:::

:::step{why="The latch is transparent while the clock is 1, so it passes the part of the pulse inside the high phase."}
From 23 ns to 30 ns the clock is 1 and D is 1, so the latch output becomes 1 at 23 ns.
:::

:::step{why="When the enable falls, the latch keeps the value D had at that instant."}
At 30 ns the clock falls with D = 1, so the latch holds 1 until the next high phase; at 40 ns it becomes transparent again and
follows D = 0.
:::

:::answer
Flip-flop: 0 all the time, the pulse is never seen. Latch: 1 from 23 to 40 ns, then 0. A pulse that does not cover any active edge is
invisible to an edge-triggered flip-flop; that is a feature (glitches between edges do no harm) and a trap (a "short request" signal
must be stretched to cover an edge).
:::
::::

## Try it: the Flip-flop Scope

The scope tab runs the same tick-by-tick model as this lesson's checks: pick a flip-flop, a trigger and the setup/hold windows,
draw the inputs, and watch the output and any violations. Try a JK latch with $J = K = 1$ and a wide pulse, then master–slave.

:::lab{#lab-scope lab="flipflop-scope" tab="scope" depth="standard"}
:::

The tables tab builds characteristic and excitation tables by trying every input, and converts any type into any other.

:::lab{#lab-tables lab="flipflop-scope" tab="tables" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-2000-a-2-12" tests="master-slave,char-equations,trap-same-edge" depth="standard"}
:::

:::pyq{id="cse-2001-a-33" tests="setup-hold-window,timing-diagram-method,trap-edge-change" depth="standard"}
:::

:::pyq{id="cse-2005-cs-62" tests="timing-diagram-method,char-equations" depth="standard"}
:::

:::pyq{id="cse-2006-cs-8" tests="phase-delay,edge-def,setup-hold-window" depth="standard"}
:::

:::pyq{id="it-2008-it-37" tests="excitation,ff-design-from-diagram" depth="standard"}
:::

## Practice

Our own questions in GATE formats: table and equation questions first, then timing, then two that need care.

:::practice{id="nx-dl-06-02-q01" depth="standard"}
:::

:::practice{id="nx-dl-06-02-q02" depth="standard"}
:::

:::practice{id="nx-dl-06-02-q03" depth="standard"}
:::

:::practice{id="nx-dl-06-02-q04" depth="standard"}
:::

:::practice{id="nx-dl-06-02-q05" depth="standard"}
:::

:::practice{id="nx-dl-06-02-q06" depth="standard"}
:::

:::practice{id="nx-dl-06-02-q07" depth="standard"}
:::

:::practice{id="nx-dl-06-02-q08" depth="standard"}
:::

:::practice{id="nx-dl-06-02-q09" depth="standard"}
:::

:::practice{id="nx-dl-06-02-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Flip-flops on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Edge triggering | sample the inputs just before the active edge; the output changes only just after it |
| Master–slave | master open while CLK = 1, slave while CLK = 0; D passes only at the falling edge |
| SR | $Q^+ = S + \overline{R}Q$, $SR = 0$ |
| JK | $Q^+ = J\overline{Q} + \overline{K}Q$; 11 toggles |
| D | $Q^+ = D$ (a one-clock delay) |
| T | $Q^+ = T \oplus Q$ (not $T$) |
| Race-around | level JK with J = K = 1 toggles $\lceil t_w / t_{pd} \rceil$ times; happens iff $t_w > t_{pd}$; cured by master–slave or edges |
| Excitation (JK) | $0\to0$: 0x, $0\to1$: 1x, $1\to0$: x1, $1\to1$: x0 |
| Excitation (SR, D, T) | SR: 0x, 10, 01, x0; $D = Q^+$; $T = Q \oplus Q^+$ |
| Conversions | JK from D: $D = J\overline{Q} + \overline{K}Q$; T from D: $D = T \oplus Q$; D from JK: $J = D$, $K = \overline{D}$; JK from T: $T = J\overline{Q} + KQ$ |
| Preset / clear | asynchronous, override the clock: preset → 1, clear → 0; usually active low; both at once not allowed |
| Setup / hold | input stable from $t_{su}$ before to $t_h$ after the edge; a change exactly at the edge with $t_h = 0$ gives the old value |
| Max frequency | $T \ge t_{cq} + t_{logic,max} + t_{su}$; hold: $t_{cq} + t_{logic,min} \ge t_h$ (clock-independent) |
| Same edge | flip-flops clocked together all see each other's old values |
| 180° delay | rising-edge stage then falling-edge stage delays a falling-edge signal by one clock period |
:::
