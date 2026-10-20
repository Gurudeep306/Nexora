---
id: sequential-analysis
subject: dl
chapter: sequential-circuits
title: "Analysing synchronous sequential circuits"
order: 3
prerequisites: [flip-flops]
pyq_topics: [dl/sequential]
est_minutes: 55
difficulty: core
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every next state, state table, trace, reachable set, cycle, output value and practice answer is produced by simulation in content/gate-notes/_checks/dl/l6_03_analysis.py (seqlib.Sync, cycle_from, autonomous_cycles)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 76–77, set B pp. 154–155 and 183, set C pp. 326–328. Analysis of given circuits is thin in every set, so the procedure was written from the textbook."
  - "Facts checked against: M. Morris Mano and M. D. Ciletti, Digital Design (analysis of clocked sequential circuits: input equations, state equations, state tables and diagrams); J. F. Wakerly, Digital Design: Principles and Practices (synchronous design discipline, timing)."
  - "PYQs: src/gate/questions.json (cse-1991-a-3-ii, cse-1993-ii-c-19, cse-1994-b-34, cse-1996-b-72, cse-1996-b-73, cse-2005-cs-64, it-2005-cs-43, it-2006-cs-37, cse-2011-cs-50, cse-2011-cs-51, cse-2015-1-cs-37, cse-2017-1-cs-33, cse-2023-cs-33); every key is re-derived by simulation."
  - "it-2005-cs-43: 'at the end of the third cycle' is read as z during cycle 3, after the edges that end cycles 1 and 2 (only option A then gives 1 from every initial state); after a third edge every option gives 0. The reading is stated."
updated: "2026-10-20"
---

*Storage elements, lesson 3 of 3.* [Lesson 2](lesson:flip-flops) gave us four flip-flops and their
characteristic equations, one flip-flop at a time. Real circuits wire several flip-flops together, feed
each one's output into the logic that drives the others, and let a single clock tick them all at once.
GATE then hands you such a circuit and asks what it does: which state comes next, what the flip-flops
hold after four clocks, which states can never appear, what bit sequence comes out. This lesson teaches
one method that answers every one of those questions. We will see why **synchronous** circuits (one
clock for every flip-flop) are the ones we can analyse at all, turn a circuit into **input equations**,
**state equations** and a **state table**, draw the **state diagram**, trace it clock by clock without
the classic update-order mistake, find the states that are **reachable** and the **cycle** every
circuit must fall into, and read outputs at the right moment. Thirteen GATE questions, from 1991 to
2023, are all instances of this one procedure.

## Where this fits

[Lesson 1](lesson:latches) showed what feedback does inside a single storage cell, and
[Lesson 2](lesson:flip-flops) built the edge-triggered flip-flop whose output moves only just after a
clock edge. This lesson zooms out from one flip-flop to a **machine** of several. The tools are the
ones you already have: the characteristic equations $Q^+ = D$, $Q^+ = T \oplus Q$ and
$Q^+ = J\overline{Q} + \overline{K}Q$ from Lesson 2, and the plain combinational evaluation of
[Chapter 2](lesson:gate-circuit-analysis) for the gates between the flip-flops. What is new is the
bookkeeping: how to organise the work so that the answer to any question can be read off one table.
The same table is the starting point of counter design in [Lesson 5](lesson:synchronous-counter-design),
of registers in [Lesson 6](lesson:shift-registers) and of state machines in
[Lesson 7](lesson:finite-state-machines), where we run the procedure backwards.

:::table{#radar title="GATE radar: analysing synchronous circuits" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 13 (1991, 1993, 1994, 1996 ×2, 2005, IT 2005, IT 2006, 2011 ×2, 2015, 2017, 2023) |
| Marks | 8 two-mark MCQs (2005, IT 2005, IT 2006, 2011 ×2, 2015, 2017, 2023), 1 two-mark MSQ (1991), 4 descriptive (1993, 1994, 1996 ×2) |
| Pattern 1 | Next state or state after k clocks of a mixed D/T/JK circuit: 1994, 2005, 2011, 2015, 2017 |
| Pattern 2 | Build the state table or state diagram of a given circuit: 1993, 1996 |
| Pattern 3 | Reachability: which states appear from a start, how many, which never: 1996, 2011, 2023 |
| Pattern 4 | A state diagram back to an equation: IT 2006; an output read during a given cycle: IT 2005 |
| Pattern 5 | Why synchronous design: 1991 (hazards are avoided, not speed or hardware) |
| What examiners test | That every flip-flop updates from the **old** state; that a T or JK stage is substituted into its own equation, not treated as D; that "never obtained" means "not reachable from the given start"; that an output is a function of the state **during** a clock period |
:::

## What a synchronous sequential circuit is

:::intuition{#analysis-intuition title="A board game played by wires" depth="standard"}
Think of a board game. Your **position** on the board right now and the number on the **dice** decide
where you will be after your turn, and the rule that turns "position and dice" into "next position" is
printed in the rule book. Between turns nothing moves. The game is completely described by the rule
book: if you know where you are and what you roll, you know where you will be.

A synchronous sequential circuit is that game played by wires. The **position** is the set of bits held
in the flip-flops (the **state**), the **dice** are the external inputs, the **turn** is a clock edge,
and the **rule book** is the gate logic wired in front of the flip-flops. Analysing a circuit means
writing its rule book down in a form you can read: a table with one row per position and roll. Once that
table exists, every question about the game ("where am I after four turns?", "can I ever land on square
5?") is answered by reading it.
:::

:::definition{#sync-vs-async term="Synchronous and asynchronous sequential circuits" depth="standard"}
A **sequential circuit** is combinational logic plus memory, with feedback: some outputs of the logic
are stored and come back as inputs.

- In a **synchronous** (clocked) sequential circuit, the memory is a set of edge-triggered flip-flops
  that all receive the **same clock**. The state can change only at the active clock edges, and at each
  edge every flip-flop loads the value its input logic produced from the state and inputs **before** the
  edge. Between edges the state is constant.
- In an **asynchronous** sequential circuit there is no common clock. The memory is the delay of the
  feedback loops themselves (or unclocked latches), and the state changes whenever an input change
  works its way round a loop.

The state of a synchronous circuit with $n$ flip-flops is an $n$-bit word, so it has at most $2^n$
states. Its behaviour is fixed by two functions of the present state and the inputs: the **next-state
function** (what the flip-flops will hold after the edge) and the **output function**.
:::

Why does the clock make such a difference? In an asynchronous circuit two state bits that must change
together never change at exactly the same instant: one gate is a little faster, and for a moment the
circuit is in a third state that nobody planned (a **race**, the subject of Lesson 1). A combinational
path with a **hazard** can produce a brief glitch, and a loop can latch onto that glitch. In a
synchronous circuit both problems are still there physically, but they happen **between** edges, while
the flip-flops are not listening. The theorem below makes that precise; it is the single reason the
whole industry designs synchronously.

:::theorem{#sync-discipline name="The synchronous discipline" depth="standard"}
Let a synchronous circuit have flip-flops with clock-to-Q delay at most $t_{cq}$ and setup time
$t_{su}$, combinational next-state logic whose longest path is $t_{logic,max}$, external inputs that
change only just after edges, and hold times met. If the clock period satisfies

$$T \ge t_{cq} + t_{logic,max} + t_{su},$$

then at every active edge each flip-flop samples the **settled** value of its input logic, computed from
the state held during the previous clock period. Consequently, glitches, hazards and races inside the
combinational logic cannot change the stored state, and the circuit behaves exactly as its state table
says.
:::

:::proof{#proof-sync-discipline of="the synchronous discipline" depth="standard"}
**Idea first:** after an edge, everything that can move settles within $t_{cq} + t_{logic,max}$; the next
edge looks only during its setup window, which starts after that settling time.

Take an edge at time 0. Every flip-flop output changes (if at all) by time $t_{cq}$, and the external
inputs change just after the edge too. From then on, the inputs of the combinational logic are constant
until the next edge. A combinational circuit with constant inputs can glitch (a hazard), but after its
longest path delay its outputs are the correct Boolean function of those inputs and stay there. So by
time $t_{cq} + t_{logic,max}$ every flip-flop input holds its final value, the next-state function
evaluated on the present state and inputs.

The next edge comes at time $T$. A flip-flop needs its input stable from $T - t_{su}$ to the edge
(Lesson 2's sampling window). The assumption $T \ge t_{cq} + t_{logic,max} + t_{su}$ is the same as
$T - t_{su} \ge t_{cq} + t_{logic,max}$: the window opens only after the logic has settled. Any glitch or
race happened earlier, while no flip-flop was sampling, so no flip-flop can capture it. The hold
condition keeps the new outputs of this edge from leaking into the sample of this same edge. Hence at
every edge each flip-flop loads exactly the next-state function of the old state, which is the definition
of the state table. ∎

**Sanity check.** `seqlib.sample` with a 20 ns clock, $t_{su} = 3$ ns and an input that glitches at 6 ns
and 9 ns but is stable from 12 ns returns the settled value at the edge with no violation; move the last
change to 18 ns and it reports a setup violation.
:::

The theorem also says what synchronous design does **not** buy. It does not make a circuit faster: the
clock must wait for the **slowest** path every cycle, even when the work of that cycle was quick, while
an asynchronous circuit reacts as soon as its gates have switched. And it does not save hardware: every
state bit needs a flip-flop (several gates) and the clock must be distributed to all of them. What it
buys is **correctness by construction**: you can ignore glitches and races and reason about the circuit
one edge at a time, which is what the rest of this lesson does.

:::trap{#trap-sync-faster title="The advantage of synchronous circuits is not speed" depth="standard"}
GATE 1991 asked for the advantage of synchronous over asynchronous circuits and offered "faster
operation", "ease of avoiding problems due to hazards", "lower hardware requirement" and "better noise
immunity". The expected wrong picks are "faster" and "lower hardware". Both are the **opposite** of the
truth: a synchronous circuit runs at the pace of its worst-case path and needs flip-flops plus a clock
network, so asynchronous designs are, if anything, faster and smaller.

"Better noise immunity" (option D) needs more care, because the theorem above does say that glitches
between edges are ignored, and that sounds like immunity to noise. It is not. **Noise immunity** means
voltage noise margins: how large a disturbance on a wire can be before a 0 is read as a 1. That is a
property of the logic family (its voltage levels), not of the timing style. What the clock filters is
**timing** glitches, the brief wrong values that the logic itself produces while it settles, and only
those that are over before the setup window opens. Noise on the clock line is actually **worse** in a
synchronous circuit, because a spike there creates a false edge in every flip-flop at once. So D is not
the advantage; B is. The one real advantage is the theorem above: hazards and races are harmless
because they are over before the edge. Key: **only B**.
:::

:::note{#recap-sync title="Recap" depth="quick"}
Synchronous = one clock for every flip-flop; the state changes only at edges, each flip-flop loading a
function of the old state and inputs. If $T \ge t_{cq} + t_{logic,max} + t_{su}$, glitches and races
between edges cannot matter. That is the advantage; speed and hardware are not.
:::

## The analysis procedure

:::intuition{#procedure-intuition title="Translating a circuit into a timetable" depth="standard"}
A circuit diagram is like a list of train connections drawn as a map: correct, but hard to answer
questions with. "If I start at station 010, where am I after three trains?" is painful on the map and
trivial on a **timetable**, a table with one row per station listing where the next train goes.

Analysis is that translation. We do it in a fixed order so that nothing is forgotten: first we say what
each flip-flop is told (its **input equations**), then what that instruction does to its bit (its **state
equation**), then we evaluate every row (the **state table**), and only then do we draw the map again,
cleanly, as a **state diagram**.
:::

:::definition{#analysis-procedure term="Analysing a synchronous sequential circuit" depth="standard"}
Given a circuit of clocked flip-flops sharing one clock, combinational gates and external inputs:

1. **Name the state.** List the flip-flops and fix the order of their bits (for example $Q_1Q_2Q_3$ or
   $PQR$). The question usually tells you the order; use it everywhere, and note which bit is called the
   most significant if states are named by numbers ($S_5$ means the word 101 in that order).
2. **Write the input (excitation) equations.** For every flip-flop, write each of its inputs ($D$; $T$; $J$
   and $K$; $S$ and $R$) as a Boolean function of the present state bits and the external inputs, by
   reading the gates in front of it.
3. **Get the state equations.** Substitute the input equations into each flip-flop's characteristic
   equation: $Q^+ = D$, $Q^+ = T \oplus Q$, $Q^+ = J\overline{Q} + \overline{K}Q$ or
   $Q^+ = S + \overline{R}Q$. The result gives each next-state bit as a function of the present state and
   inputs.
4. **Tabulate.** For every present state and every input combination, evaluate the state equations (and
   any output equations) to get the next state and output. That is the **state table**: $2^n$ rows for $n$
   flip-flops, times $2^m$ input columns for $m$ inputs.
5. **Draw the state diagram** (optional, but it is what the questions about cycles and reachability are
   really about): one circle per state, one arc per table entry.
:::

Steps 2 and 3 have names that sound alike but mean different things, and it is worth fixing them now.

:::definition{#excitation-equations term="Input (excitation) equations" depth="standard"}
The **input equations**, also called **excitation equations**, express the **inputs of the flip-flops**
($D_A$, $T_B$, $J_C$, $K_C$, …) as functions of the present state and the external inputs. They describe
the combinational logic only; they say what each flip-flop is **told** at the next edge, not what it will
**hold**. For D flip-flops the two coincide ($Q^+ = D$), which is why D circuits are the easiest to
analyse. For T and JK flip-flops they differ, and confusing them is the most common error in mixed
circuits: $T = 1$ does not mean "the next state is 1", it means "flip".

Notation: the input of flip-flop $A$ is written $D_A$, $T_A$, $J_A$, $K_A$; the present state is $A$ and
the next state $A^+$ (also $A(t+1)$ or $A_{n+1}$).
:::

:::derivation{#state-equations of="state equations from input equations" depth="standard"}
Each flip-flop's characteristic equation (Lesson 2) turns its input equations into a state equation.
Write $f$, $g$, $h$ for the Boolean functions the gates compute.

**D flip-flop** with $D_A = f$:

$$A^+ = f.$$

**T flip-flop** with $T_A = g$:

$$A^+ = g \oplus A = g\,\overline{A} + \overline{g}\,A.$$

**JK flip-flop** with $J_A = g$ and $K_A = h$:

$$A^+ = g\,\overline{A} + \overline{h}\,A.$$

**SR flip-flop** with $S_A = g$, $R_A = h$ (and $gh = 0$ in every reachable state): $A^+ = g + \overline{h}\,A$.

Two special JK wirings are worth recognising on sight. With $J_A = K_A = g$ the JK equation becomes
$g\overline{A} + \overline{g}A = g \oplus A$: the stage is a **T** flip-flop with $T = g$. With $J_A = g$,
$K_A = \overline{g}$ it becomes $g\overline{A} + gA = g$: the stage is a **D** flip-flop with $D = g$.

**Sanity check.** Take a JK stage with $J_A = x$ and $K_A = B$ (the circuit of a worked example below).
The derivation gives $A^+ = x\overline{A} + \overline{B}A$. In state $AB = 10$ with $x = 1$: $J = 1$,
$K = 0$, a set, so $A^+ = 1$; the formula gives $1 \cdot 0 + 1 \cdot 1 = 1$. In state $11$ with $x = 0$:
$J = 0$, $K = 1$, a reset, so $A^+ = 0$; the formula gives $0 + 0 = 0$. `seqlib.Sync` steps the
flip-flops directly from their tables and agrees with the formula in all 8 rows.
:::

:::trick{#trick-jk-as-t title="Read a JK stage as T or D when its inputs allow" depth="standard"}
Before substituting into $J\overline{Q} + \overline{K}Q$, look at the two wires. If $J$ and $K$ are the
**same** signal $g$, the stage is a T flip-flop with $T = g$: it flips exactly when $g = 1$. If $K$ is the
**complement** of $J$, it is a D flip-flop with $D = J$. If $K = 1$ permanently, the stage can only reset
or toggle, so $Q^+ = J\overline{Q}$. **Why it works:** these are the three special cases of the JK
equation in the derivation above. **When it fails:** when $J$ or $K$ depends on the stage's **own**
output. With $J = K = \overline{Q}$ the stage is a T flip-flop with $T = \overline{Q}$, and
$Q^+ = \overline{Q} \oplus Q = 1$: it sets once and then holds at 1. It does **not** toggle every clock,
which is what a quick reading of "J = K, so it toggles" suggests. Always substitute when the stage feeds
itself.
:::

The animation runs the procedure on the circuit of GATE 2011 (three D flip-flops $P$, $Q$, $R$ with
$D_P = R$, $D_Q = \overline{P + R}$ and $D_R = Q\,\overline{R}$). It writes the state equations, fills the
eight rows of the state table one present state at a time, draws each row as an arc of the state diagram,
and finally lights the cycle that the counter of 2011 runs through.

:::viz{#circuit-to-state-table-viz spec="circuit-to-state-table" mode="animate" depth="standard"}
:::

Notice the shape that appears in the last frames: four states form a loop, and the other four lead into
it: 001, 101 and 111 in one step, 110 in two (via 001). None leads back out. Every autonomous circuit has this shape
(loops with trees hanging off them), and we will prove it in the section on reachability.

:::note{#recap-procedure title="Recap" depth="quick"}
Name and order the state bits; input equations from the gates; state equations by substituting into
$Q^+ = D$, $T \oplus Q$, $J\overline{Q} + \overline{K}Q$; tabulate every state × input; draw the diagram.
$J = K = g$ is a T stage, $K = \overline{J}$ a D stage, but substitute whenever a stage feeds itself.
:::

## State tables and state diagrams

:::intuition{#table-intuition title="A timetable and a route map" depth="standard"}
The state table and the state diagram carry exactly the same information, arranged for different
questions. The **table** is a timetable: to know where the circuit goes from one state on one input, you
look up one cell. The **diagram** is the route map: to see loops, dead ends and places you can never get
to, you look at the picture. Good analysts build the table first (because it is mechanical and easy to
check) and draw the diagram from it, never the other way round.
:::

:::definition{#state-table term="State table" depth="standard"}
A **state table** (state transition table) lists, for every **present state** and every combination of
**external inputs**, the **next state** and the **output**. Two layouts are common:

- **One row per state × input** (the layout of the analysis procedure): columns *present state*, *input*,
  *next state*, *output*. A circuit with $n$ flip-flops and $m$ inputs has $2^{n+m}$ rows.
- **One row per state**, with one next-state column (and one output column) per input value. This is more
  compact and is the layout of [Lesson 7](lesson:finite-state-machines).

A circuit with no external inputs (an **autonomous** circuit, such as a counter) has a single next-state
column: each state has exactly one successor.
:::

:::definition{#state-diagram term="State diagram" depth="standard"}
A **state diagram** draws each state as a circle and each row of the state table as a directed arc from
the present state to the next state, labelled with the input that causes it (and, for outputs that depend
on the input, "input/output"). A transition back to the same state is a **self-loop**. In an autonomous
circuit every state has exactly **one** outgoing arc and the arcs carry no labels; in a circuit with $m$
inputs every state has $2^m$ outgoing arcs (some may coincide).

Reading a diagram: the states you can reach from a start are those you can walk to along arcs; a state with
a self-loop for some input stays put on that input; a closed walk is a **cycle**.
:::

GATE also runs the procedure **backwards**: it draws a diagram and asks for the equation. The method is
the same table, filled from the picture instead of the gates.

:::definition{#diagram-to-equation term="From a state diagram back to a next-state equation" depth="standard"}
To find the next-state equation of a diagram whose states are encoded by bits:

1. For every state and every input combination, read the next state off the arc that leaves the state
   with that input label. Write the result as a truth table of the next-state bits against the present-state
   bits and inputs.
2. An input combination with **no** arc from a state is a **don't-care** (the designer promises it never
   happens there); mark it x.
3. Minimise each next-state bit (K-map or algebra), using the don't-cares. With D flip-flops this is
   already the input equation; for T or JK flip-flops apply the excitation table of
   [Lesson 2](lesson:flip-flops) first.

A quick check of any candidate equation: substitute each state and each arc label and confirm it lands on
the arc's head. One failing arc rules an option out.
:::

:::trick{#trick-table-first title="Build the whole table once, then read every answer off it" depth="standard"}
GATE often asks two or three questions about one circuit (2011 asked two, 1996 asked two): the next state
of one given state, the number of states the counter visits, the states that are never reached. Do not
trace each question from the gates. Spend one minute computing the **complete** next-state table (8 rows for
three flip-flops), then answer every part by reading it: the next state is one lookup, a trace is a chain of
lookups, reachability is following arcs. **Why it works:** the table is the circuit; once it is right,
nothing else can go wrong. **When it fails:** never for correctness, but with many inputs the table grows as
$2^{n+m}$; then trace only the rows the question uses.
:::

:::note{#recap-tables title="Recap" depth="quick"}
State table: present state × input → next state (and output). State diagram: the same, as circles and arcs;
autonomous circuits have one arc per state. Diagram → equation: truth table from the arcs, missing arcs as
don't-cares, minimise. Build the full table first and read every sub-question off it.
:::

### Worked examples: from circuit to state table

::::example{#ex-eq-2005 level="easy" title="Two D flip-flops and an XOR (GATE 2005 pattern)" depth="quick"}
Two positive-edge D flip-flops share a clock. $D_0 = \overline{Q_0}$ and $D_1 = Q_0 \oplus \overline{Q_1}$. States
are written $Q_0Q_1$ and the circuit starts at 00. Find the state sequence.

:::step{why="For D flip-flops the input equations are the state equations."}
$Q_0^+ = \overline{Q_0}$ and $Q_1^+ = Q_0 \oplus \overline{Q_1}$.
:::

:::step{why="Tabulating all four states once lets us read the sequence without recomputing."}
00 → $Q_0^+ = 1$, $Q_1^+ = 0 \oplus 1 = 1$: **11**. 11 → $0$, $1 \oplus 0 = 1$: **01**. 01 → $1$,
$0 \oplus 0 = 0$: **10**. 10 → $0$, $1 \oplus 1 = 0$: **00**.
:::

:::step{why="Following the table from the start state gives the sequence; it closes when a state repeats."}
From 00: 00 → 11 → 01 → 10 → 00.
:::

:::answer
00 → 11 → 01 → 10 (→ 00), GATE 2005 option D. All four states form one cycle. Notice that the state is named
$Q_0Q_1$ with $Q_0$ first; writing it $Q_1Q_0$ by habit turns 10 into 01 and picks a wrong option.
:::
::::

::::example{#ex-eq-1993 level="medium" title="The NAND-gate controller with input P (GATE 1993 pattern)" depth="standard"}
Two D flip-flops hold state bits $A$ and $B$; $P$ is a control input. The NAND network gives
$D_A = \overline{\overline{B\,\overline{A}}\cdot\overline{\overline{A}\,\overline{P}}}$ and
$D_B = \overline{\overline{P\,\overline{B}}\cdot\overline{\overline{P}\,A}}$. Develop the state transition table.

:::step{why="A NAND of NANDs is an AND-OR (De Morgan), so the network is a sum of products."}
$D_A = \overline{A}B + \overline{A}\,\overline{P}$ and $D_B = P\overline{B} + \overline{P}A$.
:::

:::step{why="D flip-flops load their inputs, so these are the state equations."}
$A^+ = \overline{A}\,(B + \overline{P})$ and $B^+ = P\overline{B} + \overline{P}A$.
:::

:::step{why="Evaluate both equations for every state and both values of P (8 rows)."}
$AB = 00$: $P = 0$ → 10, $P = 1$ → 01. $AB = 01$: $P = 0$ → 10, $P = 1$ → 10. $AB = 10$: $P = 0$ → 01, $P = 1$
→ 01. $AB = 11$: $P = 0$ → 01, $P = 1$ → 00.
:::

:::step{why="Reading the table by rows shows what the controller does."}
From $A = 1$ the controller always clears $A$; it goes to 01 except from 11 with $P = 1$, which goes to 00. From
$A = 0$ it sets $A$ unless the state is 00 with $P = 1$, which moves to 01.
:::

:::answer
| $AB$ | $P = 0$ | $P = 1$ |
|:--:|:--:|:--:|
| 00 | 10 | 01 |
| 01 | 10 | 10 |
| 10 | 01 | 01 |
| 11 | 01 | 00 |

This is the table of GATE 1993 (a five-mark descriptive question). The only skill tested beyond the procedure is
converting the two-level NAND network into AND-OR form.
:::
::::

::::example{#ex-eq-jk level="medium" title="State equations, state table and output of a JK circuit with an input" depth="standard"}
Two JK flip-flops $A$ and $B$ and an input $x$: $J_A = x$, $K_A = B$, $J_B = \overline{A}$, $K_B = x$. An output
$z = A\overline{B}$ is taken from the flip-flops. Find the state equations and the state table, with its output column.

:::step{why="Substitute each pair of input equations into Q+ = JQ̄ + K̄Q."}
$A^+ = x\overline{A} + \overline{B}A$ and $B^+ = \overline{A}\,\overline{B} + \overline{x}B$.
:::

:::step{why="Evaluate both for every state and both values of x."}
$AB = 00$: $x = 0$ → 01, $x = 1$ → 11. $AB = 01$: $x = 0$ → 01, $x = 1$ → 10.
:::

:::step{why="The remaining two states complete the next-state part of the table."}
$AB = 10$: $x = 0$ → 10, $x = 1$ → 10. $AB = 11$: $x = 0$ → 01, $x = 1$ → 00.
:::

:::step{why="Step 4 of the procedure evaluates the output equation too; z uses only A and B, so it is one value per row, whatever x is."}
$z = A\overline{B}$: 0 in 00, 0 in 01, **1** in 10, 0 in 11. Because $z$ depends on the state alone (a Moore-type output), the
table needs one output column, not one per input value. An output such as $z = xA$, which also reads the input, would need a
value in every cell instead; [Lesson 7](lesson:finite-state-machines) builds such Mealy outputs.
:::

:::answer
| $AB$ | $x = 0$ | $x = 1$ | $z$ |
|:--:|:--:|:--:|:--:|
| 00 | 01 | 11 | 0 |
| 01 | 01 | 10 | 0 |
| 10 | 10 | 10 | 1 |
| 11 | 01 | 00 | 0 |

State 10 is a trap state: once there, both inputs keep it there, and the output $z = A\overline{B}$ is 1 exactly in that state, so
it works as a "stuck" alarm. Check one cell from the flip-flop tables: in 11 with $x = 1$, $A$ sees $J = 1, K = 1$ (toggle 1 → 0)
and $B$ sees $J = 0, K = 1$ (reset): 00, as the table says.
:::
::::

::::example{#ex-eq-2011 level="gate" title="The next state of the 2011 counter (GATE 2011 pattern)" depth="standard"}
Three D flip-flops $P$, $Q$, $R$ share a clock, with $D_P = R$, $D_Q = \overline{P + R}$ (a NOR of $P$ and $R$) and
$D_R = Q\,\overline{R}$. Just before an edge $PQR = 010$. What is $PQR$ after the edge?

:::step{why="With D flip-flops the state equations are the input equations."}
$P^+ = R$, $Q^+ = \overline{P}\,\overline{R}$, $R^+ = Q\overline{R}$.
:::

:::step{why="Substitute the present values P = 0, Q = 1, R = 0, all of them old values."}
$P^+ = 0$; $Q^+ = 1 \cdot 1 = 1$; $R^+ = 1 \cdot 1 = 1$.
:::

:::step{why="Building the whole table now will answer the second 2011 question for free."}
The full table: 000 → 010, 001 → 100, 010 → 011, 011 → 100, 100 → 000, 101 → 100, 110 → 001, 111 → 100.
:::

:::answer
$PQR = 011$ (GATE 2011, option D). The tempting 010 (no change) comes from forgetting that $D_R = Q\overline{R}$ is 1
here; 001 comes from computing $Q^+$ with the new $R = 1$ (NOR = 0) while $P^+$ still takes the old $R = 0$.
:::
::::

::::example{#ex-eq-edge level="gate" title="Edge case: a JK stage with J = K driven by its own complement" depth="standard"}
Two JK flip-flops: $A$ has $J_A = K_A = \overline{A}$, and $B$ has $J_B = K_B = A$. The circuit starts at $AB = 00$. Find
the sequence of states.

:::step{why="J = K makes each stage a T flip-flop with T equal to that shared signal."}
$A$ is a T stage with $T_A = \overline{A}$; $B$ is a T stage with $T_B = A$.
:::

:::step{why="Substituting into Q+ = T ⊕ Q is essential when a stage drives its own input."}
$A^+ = \overline{A} \oplus A = 1$, always. $B^+ = A \oplus B$.
:::

:::step{why="Trace from 00, every bit computed from the old state."}
00 → $A^+ = 1$, $B^+ = 0 \oplus 0 = 0$: **10**. 10 → $1$, $1 \oplus 0 = 1$: **11**. 11 → $1$, $1 \oplus 1 = 0$: **10**.
:::

:::answer
00 → 10 → 11 → 10 → 11 → …: state 00 appears once, then the circuit cycles between 10 and 11. The trap is to say
"$J = K$, so $A$ toggles every clock". It toggles once, from 0 to 1, and then its input $\overline{A}$ is 0, so it
holds. A T stage with $T = \overline{Q}$ is a "set and stay" stage, not a toggle; only $T = 1$ (or a D stage with
$D = \overline{Q}$) toggles every clock.
:::
::::

## Tracing a circuit clock by clock

:::intuition{#trace-intuition title="Everyone moves on the whistle" depth="standard"}
Picture a line of dancers. Each one's next position depends on where her neighbours are **now**. When
the whistle blows, everybody moves at once, each according to what she saw just before the whistle.
Nobody waits to see where her neighbour landed before deciding. If one dancer did wait, the formation
would come out differently, and that is exactly the mistake that the trace questions are built to catch.
:::

:::definition{#clock-trace term="Tracing a synchronous circuit" depth="standard"}
A **trace** from an initial state $s_0$ lists the states $s_0, s_1, s_2, \dots$ where $s_{k+1}$ is the next state
of $s_k$ under the inputs of clock period $k$. To compute one step:

1. Freeze the present state $s_k$ (all flip-flop outputs) and the inputs of that period.
2. Evaluate **every** flip-flop's input equations from these frozen values.
3. Apply every flip-flop's characteristic equation, again with its frozen present value.
4. Only now replace the whole state by the new values: that is $s_{k+1}$.

"The state after the $k$-th clock" (or "after $k$ cycles", "after $k$ pulses") is $s_k$. With a complete state
table, each step is a single lookup.
:::

:::trap{#trap-update-order title="Updating one flip-flop and then using its new value" depth="standard"}
The classic error is to update the flip-flops **one after another**, so that the second flip-flop sees the
first one's **new** value. Real flip-flops on one clock all sample before any of them changes (each output
moves only $t_{cq}$ after the edge, after every input has already been sampled), so every flip-flop must
use the **old** state. Take $D_A = \overline{B}$, $D_B = A$ from 00: correctly, both read 00 and the next
state is 10; updating $A$ first and letting $B$ copy the new $A$ gives 11, and the whole wrong trace
00 → 11 → 00 has period 2 instead of 4. In GATE 2015 and 2017 the mistaken trace collapses into the
all-zero self-loop (00, 00, … in 2017; 000… in 2015), which matches no option. If your trace fits no
option, suspect exactly this slip. This is the same-edge rule of [Lesson 2](lesson:flip-flops), applied to a
whole circuit.
:::

GATE likes circuits that mix flip-flop types, precisely because each type must be substituted into its own
equation. A mixed circuit is no harder than a pure one if you keep the three equations in front of you.

:::definition{#mixed-ff term="Mixed D, T and JK circuits" depth="standard"}
In a circuit with flip-flops of different types, each flip-flop's next state comes from **its own**
characteristic equation, and nothing else changes in the procedure:

- a **D** stage loads its input: $Q^+ = D$;
- a **T** stage flips when its input is 1: $Q^+ = T \oplus Q$;
- a **JK** stage sets, resets, holds or toggles: $Q^+ = J\overline{Q} + \overline{K}Q$, with the shortcuts of the
  trick above ($J = K$ is T, $K = \overline{J}$ is D, $K = 1$ gives $J\overline{Q}$).

The usual mistake is to treat the input of a T or JK stage as the next state, as if every flip-flop were a D.
:::

The animation traces GATE 1994's chain of three different flip-flops: a JK with $J = \overline{Q_0}$ and $K = 1$
(output $Q_2$), a D with $D = Q_2$ (output $Q_1$) and a T with $T = Q_1$ (output $Q_0$), from 000. Each clock takes
two steps: first every input is computed from the old state (shown on the flip-flop blocks), then all three outputs
change together and the new state is written into the trace table.

:::viz{#clock-trace-viz spec="clock-trace" mode="animate" depth="standard"}
:::

:::note{#recap-trace title="Recap" depth="quick"}
Freeze the state, compute every flip-flop input from it, apply each type's own equation, then replace the whole
state at once. D loads, T flips on 1, JK sets/resets/holds/toggles. Never let one flip-flop see another's new value
at the same edge. $T = \overline{Q}$ sets once; it does not toggle.
:::

### Worked examples: tracing

::::example{#ex-tr-twod level="easy" title="Two D flip-flops, and the update-order mistake" depth="quick"}
Two D flip-flops have $D_A = \overline{B}$ and $D_B = A$, and start at $AB = 00$. List the states for four clocks.
Then repeat the trace with the mistake of updating $A$ first.

:::step{why="All inputs come from the old state, then both flip-flops change together."}
00 → ($A^+ = \overline{0} = 1$, $B^+ = 0$) 10 → ($1$, $1$) 11 → ($0$, $1$) 01 → ($0$, $0$) 00.
:::

:::step{why="The mistaken trace lets B copy the A that was just written."}
From 00: $A = 1$, then $B = $ new $A = 1$: 11. From 11: $A = 0$, then $B = 0$: 00. The wrong trace is 00 → 11 → 00.
:::

:::answer
Correct: 00, 10, 11, 01, 00 (a 4-state cycle; this is a 2-bit twisted-ring counter of
[Lesson 6](lesson:shift-registers)). The sequential mistake halves the cycle to 00, 11, 00: a wrong trace is
often shorter than the real one, because letting one bit copy another's new value makes the two bits equal.
:::
::::

::::example{#ex-tr-1994 level="medium" title="A JK, a D and a T in a chain (GATE 1994 pattern)" depth="standard"}
A JK flip-flop (output $Q_2$) has $J = \overline{Q_0}$ and $K = 1$; a D flip-flop (output $Q_1$) has $D = Q_2$; a T
flip-flop (output $Q_0$) has $T = Q_1$. All share one clock and start at $Q_2Q_1Q_0 = 000$. Find the contents after four
clock pulses.

:::step{why="Each stage gets its own characteristic equation; K = 1 means the JK can only reset or toggle."}
$Q_2^+ = \overline{Q_0}\,\overline{Q_2}$, $Q_1^+ = Q_2$, $Q_0^+ = Q_1 \oplus Q_0$.
:::

:::step{why="Clocks 1 and 2: compute all three from the old state."}
000 → ($1 \cdot 1 = 1$, $0$, $0 \oplus 0 = 0$) **100** → ($1 \cdot 0 = 0$, $1$, $0$) **010**.
:::

:::step{why="Clocks 3 and 4: the T stage finally sees T = 1, and the JK stops being set once Q0 = 1."}
010 → ($1 \cdot 1 = 1$, $0$, $1 \oplus 0 = 1$) **101** → ($0 \cdot 0 = 0$, $1$, $0 \oplus 1 = 1$) **011**.
:::

:::answer
After four pulses $Q_2Q_1Q_0 = 011$ (GATE 1994). The fifth pulse gives 000 again, so the circuit is a 5-state counter
000 → 100 → 010 → 101 → 011 → 000. A student who treats the T stage as a D ($Q_0^+ = Q_1$) gets 010 after four
pulses instead.
:::
::::

::::example{#ex-tr-input level="medium" title="Tracing a circuit with an input sequence, and reading its output" depth="standard"}
The JK circuit of the earlier example ($J_A = x$, $K_A = B$, $J_B = \overline{A}$, $K_B = x$, output $z = A\overline{B}$) starts at
$AB = 00$ and receives $x = 1, 0, 1, 1$ in clock periods 1 to 4 (period $k$ ends with edge $k$, which samples that period's $x$).
Find the state after each clock, and the output $z$ during periods 1 to 4.

:::step{why="With an input, each step uses the column of the table for that period's input."}
00 with $x = 1$ → **11**; 11 with $x = 0$ → **01**.
:::

:::step{why="Continue down the input sequence with the table we already built."}
01 with $x = 1$ → **10**; 10 with $x = 1$ → **10**.
:::

:::step{why="During period k the flip-flops still hold the state reached after k − 1 edges, and z is read from that state."}
States during periods 1, 2, 3, 4: 00 (the initial state), 11, 01, 10. The output column gives $z$ = 0, 0, 0, **1**.
:::

:::step{why="The input of the last period acts only at the edge that ends it, so it cannot show in z during that period."}
The fourth input ($x = 1$ in period 4) is sampled at edge 4 and decides the state of period 5 (10 again, so $z$ stays 1). A reader
who takes $z$ from the state **after** each edge gets 0, 0, 1, 1, one period early.
:::

:::answer
States after the clocks: 11, 01, 10, 10. Output during periods 1 to 4: **0, 0, 0, 1**; the alarm $z$ comes on in period 4, the
first period the circuit spends in the trap state 10. Once in 10 it stays there for every input, so $z = 1$ from then on. The table
built once answered the trace and the output by lookups, which is the point of the table-first trick, and the output-timing rule
of the section on outputs below ($z$ during period $k$ is $z(s_{k-1})$) is exactly the third step.
:::
::::

::::example{#ex-tr-2017 level="gate" title="A T and a D flip-flop feeding each other (GATE 2017 pattern)" depth="standard"}
A T flip-flop (output $Q_1$) has $T = Q_0$; a D flip-flop (output $Q_0$) has $D = Q_1$. Both start at 1. Give $Q_1Q_0$
after the third and after the fourth clock cycle.

:::step{why="Substitute into each flip-flop's own equation."}
$Q_1^+ = Q_0 \oplus Q_1$ and $Q_0^+ = Q_1$.
:::

:::step{why="Trace from 11, both bits from the old state each time."}
11 → ($1 \oplus 1 = 0$, $1$) **01** → ($1 \oplus 0 = 1$, $0$) **10** → ($0 \oplus 1 = 1$, $1$) **11** → **01**.
:::

:::answer
After the 3rd cycle 11, after the 4th 01 (GATE 2017, option B). The circuit cycles 11 → 01 → 10 → 11 with period 3. Treating
the T stage as a D ($Q_1^+ = Q_0$) gives 11 every cycle; letting $Q_0$ copy the new $Q_1$ gives 00 after the first cycle and
00 for ever after, because (0, 0) is a self-loop. Neither mistake matches any option.
:::
::::

::::example{#ex-tr-2015 level="gate" title="Edge case: a D and a JK with J = K driven by the D output (GATE 2015 pattern)" depth="standard"}
A D flip-flop's output drives both $J$ and $K$ of a JK flip-flop, and the JK's output drives $D$. Both are positive-edge
triggered on a common clock. Initially the D flip-flop holds 1 and the JK holds 0. Which bit sequence (including the initial
state) appears at the JK's output?

:::step{why="J = K = Q_D makes the JK a T stage with T = Q_D; the D stage copies the JK."}
Writing the state as $(Q_D, Q_{JK})$: $Q_D^+ = Q_{JK}$ and $Q_{JK}^+ = Q_D \oplus Q_{JK}$.
:::

:::step{why="Trace from (1, 0), both bits from the old state."}
(1, 0) → ($0$, $1 \oplus 0 = 1$) **(0, 1)** → ($1$, $0 \oplus 1 = 1$) **(1, 1)** → ($1$, $1 \oplus 1 = 0$) **(1, 0)**.
:::

:::step{why="The JK output is the second bit; the pattern repeats with period 3."}
$Q_{JK}$ = 0, 1, 1, 0, 1, 1, 0, …
:::

:::answer
0110110… (GATE 2015, option A). The question stresses "non-zero propagation delays": that is the same-edge rule in words.
If the JK were (wrongly) allowed to see the D flip-flop's new output, from (1, 0) it would read $J = K = 0$ and the output
would stay at 0. Notice that (0, 0) is a self-loop of this circuit that the trace never enters.
:::
::::

## Reachability and cycles

:::intuition{#reach-intuition title="A town of one-way streets" depth="standard"}
Imagine a town where every crossing has exactly one one-way street leaving it. Start anywhere and keep
driving: you can never stop, and the town is finite, so sooner or later you arrive at a crossing you have
already passed. From that moment you are trapped in a loop and drive round it for ever. Some crossings lie on
loops; others lie on approach roads that lead into a loop; and from inside one loop you can never visit a
crossing that is not on it.

An autonomous synchronous circuit is that town: the crossings are its states, and the single street out of each
crossing is its next-state arrow.
:::

:::definition{#reachability term="Reachable states" depth="standard"}
A state $t$ is **reachable** from a state $s$ if some sequence of clock edges (and, for a circuit with inputs,
some input values) takes the circuit from $s$ to $t$; $s$ itself counts as reached after zero clocks. The
**reachable set** of $s$ is found by following arcs of the state diagram from $s$ until nothing new appears
(breadth-first or depth-first search; for an autonomous circuit, simply the trace until a state repeats).

States **not** in the reachable set of the given initial state are **unreachable** from it: the circuit started there
can never show them, although they are perfectly valid bit patterns and would appear if the circuit were started
elsewhere (or switched on in them).
:::

:::theorem{#cycle-theorem name="Every autonomous circuit falls into a cycle" depth="standard"}
Let an autonomous synchronous circuit have $N$ states (at most $2^n$ for $n$ flip-flops) and start in state $s_0$.
Then there are integers $\mu \ge 0$ (the **tail** length) and $\lambda \ge 1$ (the **cycle** length) with
$\mu + \lambda \le N$ such that

- the states $s_0, s_1, \dots, s_{\mu + \lambda - 1}$ are all different, and
- $s_{k + \lambda} = s_k$ for every $k \ge \mu$: from clock $\mu$ on, the circuit repeats a cycle of $\lambda$ states for ever.

So the number of distinct states the circuit ever shows from $s_0$ is exactly $\mu + \lambda$, and the circuit is on its
final cycle after at most $N - 1$ clocks.
:::

:::proof{#proof-cycle-theorem of="the cycle theorem (pigeonhole)" depth="standard"}
**Idea first:** $N + 1$ states in a row cannot all be different when only $N$ exist, and because the next state depends
only on the present one, the first repeat locks the circuit into a loop.

Look at $s_0, s_1, \dots, s_N$: that is $N + 1$ states from a set of $N$, so by the pigeonhole principle two of them are
equal. Let $j$ be the **first** index at which $s_j$ equals some earlier $s_i$, and set $\mu = i$, $\lambda = j - i$. By the
choice of $j$, the states $s_0, \dots, s_{j-1}$ are all different, and $j \le N$, so $\mu + \lambda = j \le N$.

The circuit is autonomous: $s_{k+1} = F(s_k)$ for one fixed next-state function $F$. From $s_j = s_i$ we get
$s_{j+1} = F(s_j) = F(s_i) = s_{i+1}$, and by induction $s_{j+m} = s_{i+m}$ for every $m \ge 0$, which is
$s_{k+\lambda} = s_k$ for every $k \ge \mu$. So after clock $\mu$ the states repeat with period $\lambda$, and the states ever
shown are exactly the $j = \mu + \lambda$ different states $s_0, \dots, s_{j-1}$. ∎

**Sanity check.** `seqlib.cycle_from` returns the tail and the cycle. For the 2011 circuit from 000 it gives tail 0 and cycle
000 → 010 → 011 → 100 ($\mu + \lambda = 4 \le 8$); from 110 it gives tail 110, 001 and the same cycle ($2 + 4 = 6$). Over every
start state of every PYQ circuit in this lesson, $\mu + \lambda \le 2^n$ holds.
:::

Two consequences are used constantly. First, **the reachable set of an autonomous circuit is its trace up to the first
repeat**; nothing else can appear, however long you wait. Second, **the states not on the trace are unreachable**, and
they are of two kinds: states on **another** cycle (a separate loop, often a self-loop such as 000 in a shift register
with XOR feedback) and states on **approach roads** that lead into some cycle but are never entered from the start. A
counter whose unused states all lead back into the main cycle is called **self-starting** (Lesson 5 designs for it).

The animation draws the full state graph of GATE 1996's circuit (three D flip-flops with $D_1 = Q_2 \oplus Q_3$, $D_2 = Q_1$,
$D_3 = Q_2$, states $S_0 \dots S_7$ named by $Q_1Q_2Q_3$), starts at $S_4$, and lights each state as the trace reaches it.

:::viz{#state-graph-reach-viz spec="state-graph-reach" mode="animate" depth="standard"}
:::

Notice that the seven states $S_1 \dots S_7$ form one cycle, so from any of them all seven are reachable; $S_0 = 000$
maps to itself ($0 \oplus 0 = 0$ and the shifts keep zeros), so it is a cycle of length 1 on its own, never entered and never
left.

:::trap{#trap-never title="'Can never be obtained' means 'not reachable from the given start'" depth="standard"}
GATE 2023 gave a circuit, an initial state 011, and asked which value of $(Q_1, Q_2, Q_3)$ "can NEVER be obtained". Every option
is a valid 3-bit word, so the question is not about codes: it is about the **reachable set from 011**. The trap answers are
(i) to reason about which patterns "look impossible" from the gates without tracing, and (ii) to start the trace from 000
out of habit. Trace from the given state until it repeats: 011 → 000 → 100 → 010 → 101 → 111 → 110 → 011. Seven states
appear; only 001 does not, and indeed 001 is a self-loop ($Q_1^+ = 0 \oplus 0$, $Q_3^+ = 1 \oplus 0$), so the circuit can only be in
001 if it starts there. The answer is $(0, 0, 1)$.
:::

:::note{#recap-reach title="Recap" depth="quick"}
Reachable set = follow arcs from the start; for an autonomous circuit, the trace until the first repeat. Every autonomous
circuit has a tail of $\mu$ states and a cycle of $\lambda$ states with $\mu + \lambda \le N$. Unreachable states lie on other
cycles (often self-loops) or on approach roads. "Never obtained" = not in the reachable set of the **given** start.
:::

### Worked examples: reachability and cycles

::::example{#ex-re-1996-diagram level="medium" title="The state diagram of a shift register with XOR feedback (GATE 1996 pattern)" depth="standard"}
Three D flip-flops form a chain: $D_2 = Q_1$, $D_3 = Q_2$, and $D_1 = Q_2 \oplus Q_3$. State $S_k$ means $Q_1Q_2Q_3$ is $k$ in
binary. Draw the state diagram.

:::step{why="D flip-flops: the input equations are the state equations; the register shifts right and the XOR feeds Q1."}
$Q_1^+ = Q_2 \oplus Q_3$, $Q_2^+ = Q_1$, $Q_3^+ = Q_2$.
:::

:::step{why="Tabulate all eight states (the table-first trick)."}
$S_0$ (000) → 000 = $S_0$; $S_1$ (001) → 100 = $S_4$; $S_2$ (010) → 101 = $S_5$; $S_3$ (011) → 001 = $S_1$.
:::

:::step{why="The other four rows complete the table."}
$S_4$ (100) → 010 = $S_2$; $S_5$ (101) → 110 = $S_6$; $S_6$ (110) → 111 = $S_7$; $S_7$ (111) → 011 = $S_3$.
:::

:::step{why="Chain the arcs to see the shape of the diagram."}
From $S_1$: $S_1 \to S_4 \to S_2 \to S_5 \to S_6 \to S_7 \to S_3 \to S_1$, one cycle through all seven non-zero states.
:::

:::answer
A self-loop on $S_0$ and one 7-state cycle $S_1 \to S_4 \to S_2 \to S_5 \to S_6 \to S_7 \to S_3 \to S_1$ (GATE 1996, Q72). This is a
maximal-length **linear feedback shift register** ([Lesson 6](lesson:shift-registers)): it visits every state except all-zeros.
:::
::::

::::example{#ex-re-1996-s4 level="gate" title="Which states are unreachable from S4? (GATE 1996 pattern)" depth="standard"}
For the same circuit, the initial state is $S_4$. Which states are not reachable?

:::step{why="For an autonomous circuit the reachable set is the trace until the first repeat."}
$S_4 \to S_2 \to S_5 \to S_6 \to S_7 \to S_3 \to S_1 \to S_4$.
:::

:::step{why="Collect what appeared and compare with all eight states."}
Reached: $S_1, S_2, S_3, S_4, S_5, S_6, S_7$. Missing: $S_0$.
:::

:::step{why="Check the missing state's own arc: a self-loop cannot be entered from elsewhere."}
$S_0 \to S_0$: the only arc into $S_0$ is its own self-loop, so no trace that starts elsewhere can reach it.
:::

:::answer
Unreachable from $S_4$: $\{S_0\}$ (GATE 1996, Q73). By the cycle theorem, $\mu = 0$ and $\lambda = 7$ from $S_4$: seven states, all on the
cycle. Notice that answering Q72 first (the full diagram) makes Q73 a glance.
:::
::::

::::example{#ex-re-2011-51 level="gate" title="How many states does the 2011 counter visit? (GATE 2011 pattern)" depth="standard"}
The 2011 circuit ($D_P = R$, $D_Q = \overline{P + R}$, $D_R = Q\overline{R}$) is reset to $PQR = 000$ at power on. How many distinct states does
it produce?

:::step{why="Use the table already built for the first 2011 question."}
000 → 010 → 011 → 100 → 000.
:::

:::step{why="The first repeat closes the cycle, so by the cycle theorem nothing else will ever appear."}
Distinct states: 000, 010, 011, 100. Tail $\mu = 0$, cycle $\lambda = 4$.
:::

:::step{why="The other states are approach roads, not part of the count."}
001, 101 and 111 lead straight to 100, and 110 leads to 001 and then to 100: all four join the cycle, so the counter is
self-starting, but they are never produced from 000.
:::

:::answer
4 states (GATE 2011, option B). The common slip is to count all states whose arcs touch the cycle (giving 5 or more) or to stop the
trace one step early and miss 100.
:::
::::

::::example{#ex-re-2023 level="gate" title="The state that can never be obtained (GATE 2023 pattern)" depth="standard"}
Three flip-flops share a clock: a T flip-flop $Q_1$ with $T = \overline{Q_3}$, a D flip-flop $Q_2$ with $D = Q_1$, and a T flip-flop $Q_3$
with $T = Q_2$. Initially $(Q_1, Q_2, Q_3) = (0, 1, 1)$. Which of $(0, 0, 1)$, $(1, 0, 0)$, $(1, 0, 1)$, $(1, 1, 1)$ can never be obtained?

:::step{why="Substitute each stage into its own equation."}
$Q_1^+ = Q_1 \oplus \overline{Q_3}$, $Q_2^+ = Q_1$, $Q_3^+ = Q_3 \oplus Q_2$.
:::

:::step{why="Trace from the given start, not from 000."}
011 → 000 → 100 → 010 → 101 → 111 → 110 → 011.
:::

:::step{why="The trace repeated, so these seven states are the whole reachable set."}
Reached: 000, 010, 011, 100, 101, 110, 111. Missing: 001, and $001 \to 001$ is a self-loop.
:::

:::answer
$(0, 0, 1)$ (GATE 2023, option A). The other three options all appear on the cycle, at clocks 2, 4 and 5.
:::
::::

::::example{#ex-re-two-cycles level="gate" title="Edge case: a circuit with two separate cycles" depth="standard"}
Three D flip-flops: $D_A = \overline{C}$, $D_B = A$, $D_C = B$. How many states are reachable from 000, and how many from 010?

:::step{why="Shift right with the complement of the last bit fed back."}
$A^+ = \overline{C}$, $B^+ = A$, $C^+ = B$.
:::

:::step{why="Trace from 000 until it repeats."}
000 → 100 → 110 → 111 → 011 → 001 → 000: six states.
:::

:::step{why="Trace from 010, a state that the first cycle missed."}
010 → 101 → 010: a separate 2-state cycle.
:::

:::answer
6 states from 000, 2 states from 010. The eight states split into two disjoint cycles (6 + 2), so the answer to "how many states" depends
entirely on the start state: always trace from the state the question gives. This circuit is the 3-bit Johnson counter of
[Lesson 6](lesson:shift-registers), which is not self-starting: switched on in 010 or 101, it never counts.
:::
::::

## Outputs and when to read them

:::intuition{#output-intuition title="The scoreboard updates after the play" depth="standard"}
A scoreboard shows the score of the game **as it stands**; it changes a moment after each goal and then stays put until
the next one. Ask "what did the scoreboard show during the third quarter?" and the answer is clear. Ask "what did it show
at the end of the third quarter?" and you must first decide whether you mean just before the final whistle of that quarter
or just after it. A circuit's outputs are a scoreboard: if they are computed from the flip-flops, they change only just after
edges, and the question must be read with care about which side of an edge it means.
:::

:::definition{#output-timing term="Output timing in a synchronous circuit" depth="standard"}
Number the clock periods 1, 2, 3, … so that **period $k$ ends at edge $k$**; the circuit is in its initial state $s_0$ during
period 1 and in $s_{k-1}$ during period $k$.

- An output that is a function of the **state only** (a **Moore-type** output, for example $z = Q_1Q_2$) is constant through
  a period: during period $k$ it equals $z(s_{k-1})$, computed from the state after $k - 1$ edges. It changes just after edges.
- External inputs given "in period $k$" are sampled at edge $k$ (just before it), so they affect the state from period $k + 1$ on.
- An output that also depends on the **present inputs** (a **Mealy-type** output) can change in the middle of a period, whenever
  the input changes; [Lesson 7](lesson:finite-state-machines) treats both kinds.

"The output in cycle $k$" therefore means $z(s_{k-1})$. "The output at the end of cycle $k$" is ambiguous: just before edge $k$ it
is still $z(s_{k-1})$; just after edge $k$ it is $z(s_k)$, which is the output of period $k + 1$.
:::

:::trap{#trap-output-edge title="Reading the output one edge too late" depth="standard"}
GATE IT 2005 fed three rows of inputs (cycles 1, 2, 3) into a circuit with $D_1 = A \oplus B$, $D_2 = \overline{Q_1}\,C$ and
$z = Q_1Q_2$, and asked which input sequence always gives $z = 1$ "at the end of the third cycle". During cycle 3 the state has
been through two edges, so $z = (A_2 \oplus B_2)\cdot\overline{(A_1 \oplus B_1)}\cdot C_2$, which depends only on rows 1 and 2:
option A makes it 1 from every initial state, and the other options make it 0. A student who also applies the third edge
computes $Q_1 = A_3 \oplus B_3$; every option has $A_3 = B_3 = 1$ in row 3, so $Q_1 = 0$ and $z = 0$ for all four options, and the
question then has no answer. The consistent reading, and the one behind the key, is the value **during** cycle 3, just before
the edge that closes it. When a question's words allow both readings, compute both and see which one gives exactly one option.
:::

:::note{#recap-output title="Recap" depth="quick"}
A state-only output is constant through a clock period and changes just after edges: in period $k$ it is $z(s_{k-1})$. Inputs of
period $k$ act at edge $k$. "At the end of cycle $k$" means just before edge $k$ unless the question says otherwise; compute both
sides if in doubt.
:::

### Worked examples: diagrams to equations and outputs

::::example{#ex-de-it2006 level="easy" title="A two-state diagram to an equation (GATE IT 2006 pattern)" depth="quick"}
A one-bit state machine with inputs $x$ and $y$: in state $S = 1$ it stays when $x = 1$ and moves to 0 when $x = 0$; in state $S = 0$ it
stays when $y = 1$ and moves to 1 when $y = 0$. Find $S^+$.

:::step{why="In state 1, the next state is 1 exactly when x = 1, so S+ = x there."}
$S = 1$: $S^+ = x$.
:::

:::step{why="In state 0, the next state is 1 exactly when y = 0, so S+ = ȳ there."}
$S = 0$: $S^+ = \overline{y}$.
:::

:::step{why="Combining the two halves with S as the selector is a Shannon expansion on S."}
$S^+ = \overline{S}\,\overline{y} + S\,x$.
:::

:::answer
$S^+ = S'y' + Sx$ (GATE IT 2006, option A). Check each arc: $S = 1, x = 0$ gives 0 (the arc to 0); $S = 0, y = 1$ gives 0 (the self-loop).
The option $S'y + Sx'$ swaps every arc, and $xy'$ ignores the state altogether.
:::
::::

::::example{#ex-de-2bit level="medium" title="Equations of a 2-bit up/down counter from its diagram" depth="standard"}
A 2-bit machine $AB$ with input $x$ has this diagram: with $x = 0$ it counts up, 00 → 01 → 10 → 11 → 00; with $x = 1$ it counts down,
00 → 11 → 10 → 01 → 00. Find next-state equations for D flip-flops.

:::step{why="Read the next state of every state for both inputs from the arcs."}
$x = 0$: 00 → 01, 01 → 10, 10 → 11, 11 → 00. $x = 1$: 00 → 11, 01 → 00, 10 → 01, 11 → 10.
:::

:::step{why="The low bit flips on every arc, whichever way the count goes."}
$B^+ = \overline{B}$ in all eight rows.
:::

:::step{why="The high bit flips when counting up from B = 1, or counting down from B = 0: exactly when B ⊕ x = 1."}
$A^+ = A \oplus (B \oplus x) = A \oplus B \oplus x$.
:::

:::answer
$D_B = \overline{B}$ and $D_A = A \oplus B \oplus x$. Check 10 with $x = 1$: $A^+ = 1 \oplus 0 \oplus 1 = 0$, $B^+ = 1$: 01, as the down arc says.
:::
::::

::::example{#ex-de-jk level="gate" title="The same diagram realised with JK flip-flops" depth="standard"}
Realise the up/down counter of the previous example with JK flip-flops: find $J_A$, $K_A$, $J_B$, $K_B$.

:::step{why="B flips on every arc, and a JK flips every clock when J = K = 1."}
$J_B = K_B = 1$.
:::

:::step{why="A flips exactly when B ⊕ x = 1, so A is a T stage with T = B ⊕ x."}
$T_A = B \oplus x$, which a JK realises as $J_A = K_A = B \oplus x$.
:::

:::step{why="Confirm with the JK excitation table of Lesson 2: from A = 0 only J matters, from A = 1 only K."}
From $A = 0$: need $J_A = A^+ = B \oplus x$. From $A = 1$: need $K_A = \overline{A^+} = \overline{1 \oplus B \oplus x} = B \oplus x$. Both agree.
:::

:::answer
$J_A = K_A = B \oplus x$ and $J_B = K_B = 1$. This is the analysis procedure run backwards, the step from diagram to circuit that
[Lesson 5](lesson:synchronous-counter-design) turns into a full method; GATE IT 2008 asked the one-flip-flop version in
[Lesson 2](lesson:flip-flops).
:::
::::

::::example{#ex-de-it2005 level="gate" title="Which inputs give z = 1 in cycle 3? (GATE IT 2005 pattern)" depth="standard"}
$D_1 = A \oplus B$, $D_2 = \overline{Q_1}\,C$, $z = Q_1Q_2$. Inputs $(A, B, C)$ for cycles 1, 2, 3 are (A) 000, 101, 111; (B) 101, 110, 111;
(C) 011, 101, 111; (D) 001, 110, 111. Which always gives $z = 1$ during cycle 3, whatever the initial state?

:::step{why="During cycle 3 the state has been through edges 1 and 2, which sample the inputs of cycles 1 and 2."}
After edge 1: $Q_1 = A_1 \oplus B_1$. After edge 2: $Q_1 = A_2 \oplus B_2$ and $Q_2 = \overline{(A_1 \oplus B_1)}\,C_2$.
:::

:::step{why="z multiplies the two, and the initial state has dropped out."}
$z_{(3)} = (A_2 \oplus B_2)\cdot\overline{(A_1 \oplus B_1)}\cdot C_2$.
:::

:::step{why="Evaluate each option's first two rows."}
(A) $1 \cdot 1 \cdot 1 = 1$. (B) $A_1 \oplus B_1 = 1$, so 0. (C) $A_1 \oplus B_1 = 1$, so 0. (D) $A_2 \oplus B_2 = 0$, so 0.
:::

:::answer
Option A (GATE IT 2005), reading the output **during** cycle 3. After a third edge, every option's row 3 has $A = B = 1$, so $Q_1 = 0$ and
$z = 0$: that reading gives no answer at all, which confirms the intended one.
:::
::::

::::example{#ex-de-missing level="gate" title="Edge case: a diagram with a missing arc" depth="standard"}
A one-bit machine with input $x$: from $S = 0$, $x = 0$ stays at 0 and $x = 1$ goes to 1; from $S = 1$, $x = 0$ goes to 0, and **no arc** is
drawn for $x = 1$ (the designer guarantees that $x$ is never 1 in state 1). Which equations are valid realisations: (i) $S^+ = x$,
(ii) $S^+ = \overline{S}x$, (iii) $S^+ = S + x$?

:::step{why="The missing arc is a don't-care: the truth table has an x in the row S = 1, x = 1."}
Rows $(S, x)$: 00 → 0, 01 → 1, 10 → 0, 11 → x.
:::

:::step{why="Check each candidate on the three specified rows only."}
(i) $x$: 0, 1, 0, fine. (ii) $\overline{S}x$: 0, 1, 0, fine. (iii) $S + x$: 0, 1, **1** in row 10, wrong.
:::

:::step{why="The don't-care decides which one is minimal."}
Choosing the don't-care as 1 gives $S^+ = x$ (a bare wire into a D flip-flop); as 0 gives $\overline{S}x$.
:::

:::answer
(i) and (ii) are both correct; (i) is minimal. They differ only on the arc that never happens. In a multiple-choice question, two such
options can both "match the diagram"; the question will then ask for the minimal one, or one of them will fail another arc.
:::
::::

## Try it: the Counter & FSM Simulator

The state-machine tab lets you type a state table and run it. Give the states the names of their bit patterns (00, 01, 10, 11), fill
the next-state columns from a table you built, for example the 1993 controller with $x$ standing for $P$, and feed an input string one
bit at a time: the lab highlights the current row, draws the state graph and lights each arc as it is taken. For an autonomous circuit
(no input), enter the same next state in both columns; with up to ten states you can enter the 2011 circuit or GATE 2023's and watch
the trace close its cycle.

:::lab{#lab-analysis lab="counter-fsm" tab="fsm" depth="standard"}
:::

The counter tab contains the GATE 1996 circuit ready-made: choose **LFSR** with **3 flip-flops**. The lab numbers the cells Q2 Q1 Q0
from the left, so its maximal-length taps (shown as Q1 and Q0) are the right two cells, exactly 1996's $D_1 = Q_2 \oplus Q_3$ in the
question's numbering. Start at 100 ($S_4$) and step. The full graph of all eight states shows the 7-state cycle and the 000 self-loop
as a separate cycle.

:::lab{#lab-analysis-lfsr lab="counter-fsm" tab="counter" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1991-a-3-ii" tests="sync-vs-async,sync-discipline,trap-sync-faster" depth="standard"}
:::

:::pyq{id="cse-1993-ii-c-19" tests="analysis-procedure,state-table,excitation-equations" depth="standard"}
:::

:::pyq{id="cse-1994-b-34" tests="mixed-ff,clock-trace" depth="standard"}
:::

:::pyq{id="cse-1996-b-72" tests="state-diagram,state-table,analysis-procedure" depth="standard"}
:::

:::pyq{id="cse-1996-b-73" tests="reachability,cycle-theorem" depth="standard"}
:::

:::pyq{id="cse-2005-cs-64" tests="clock-trace,excitation-equations" depth="standard"}
:::

:::pyq{id="it-2005-cs-43" tests="output-timing,clock-trace,trap-output-edge" depth="standard"}
:::

:::pyq{id="it-2006-cs-37" tests="diagram-to-equation,state-diagram" depth="standard"}
:::

:::pyq{id="cse-2011-cs-50" tests="excitation-equations,state-equations" depth="standard"}
:::

:::pyq{id="cse-2011-cs-51" tests="reachability,clock-trace,cycle-theorem" depth="standard"}
:::

:::pyq{id="cse-2015-1-cs-37" tests="mixed-ff,clock-trace,trap-update-order" depth="standard"}
:::

:::pyq{id="cse-2017-1-cs-33" tests="mixed-ff,clock-trace" depth="standard"}
:::

:::pyq{id="cse-2023-cs-33" tests="reachability,trap-never,mixed-ff" depth="standard"}
:::

## Practice

Our own questions in GATE formats: equations and traces first, then reachability and counting, then outputs and diagrams.

:::practice{id="nx-dl-06-03-q01" depth="standard"}
:::

:::practice{id="nx-dl-06-03-q02" depth="standard"}
:::

:::practice{id="nx-dl-06-03-q03" depth="standard"}
:::

:::practice{id="nx-dl-06-03-q04" depth="standard"}
:::

:::practice{id="nx-dl-06-03-q05" depth="standard"}
:::

:::practice{id="nx-dl-06-03-q06" depth="standard"}
:::

:::practice{id="nx-dl-06-03-q07" depth="standard"}
:::

:::practice{id="nx-dl-06-03-q08" depth="standard"}
:::

:::practice{id="nx-dl-06-03-q09" depth="standard"}
:::

:::practice{id="nx-dl-06-03-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Analysing synchronous circuits on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Synchronous | one clock for all flip-flops; the state changes only at edges |
| Why synchronous | if $T \ge t_{cq} + t_{logic,max} + t_{su}$, hazards and races settle before the edge (not: faster, smaller) |
| Procedure | name the state bits → input equations → state equations → state table → state diagram |
| State equations | D: $Q^+ = D$; T: $Q^+ = T \oplus Q$; JK: $Q^+ = J\overline{Q} + \overline{K}Q$ |
| JK shortcuts | $J = K = g$ is T with $T = g$; $K = \overline{J}$ is D; $J = K = \overline{Q}$ sets once and holds |
| Trace | freeze the state, compute every input from it, update all bits together |
| Reachability | follow arcs from the **given** start; autonomous: the trace until the first repeat |
| Cycle theorem | tail $\mu$ + cycle $\lambda \le N$ states; then the cycle repeats for ever |
| Unreachable | other cycles (often self-loops such as 000 of an XOR shift register) or approach roads |
| Diagram → equation | truth table from the arcs; missing arcs are don't-cares; check every arc |
| Output timing | state-only output in period $k$ is $z(s_{k-1})$; it changes just after edges |
:::
