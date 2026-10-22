---
id: logic-families
subject: dl
chapter: beyond-syllabus
title: "Logic families and switch-level circuits"
order: 3
prerequisites: [logic-gates]
pyq_topics: [dl/gates]
est_minutes: 30
difficulty: basic
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every switch-network value, CMOS gate, transistor count, noise margin, fan-out, power figure and sizing number is computed in content/gate-notes/_checks/dl/l7_03_families.py with beyondlib (a switch-level MOS simulator)."
  - "Coverage checklist only (internal digests, never copied): set A p. 95 (NAND vs NOR in CMOS), set C pp. 224–226 (unused TTL and ECL inputs) and p. 398 (logic families, fan-in and fan-out). The slips A 95 and C 398 are corrected in the lesson."
  - "Facts checked against: J. M. Rabaey, A. Chandrakasan and B. Nikolić, Digital Integrated Circuits (CMOS gates, pass transistors, power); A. S. Sedra and K. C. Smith, Microelectronic Circuits (TTL, ECL, CMOS levels and margins)."
  - "PYQs: src/gate/questions.json (cse-1991-a-1-i, cse-1991-a-3-i, cse-1994-a-3-10, cse-1998-a-15); every key is re-derived by switch-level simulation or from the family data in the check."
  - "cse-1998-a-15: the scan of GATE 1998 (p. 2, Q15) matches the bank. Standard TTL has V_IH = 2.0 V, so no option states the threshold itself; key D is read as the only option whose voltages are all valid logic 1s (see the trap block)."
updated: "2026-10-22"
---

*Optional: beyond the core GATE syllabus.* Every gate in Chapters 2 to 6 was a perfect symbol: a 1 went
in, a clean 1 came out, instantly and for free. Real gates are built from transistors, and the way they
are built decides how fast they are, how much power they burn, how much noise they tolerate and how many
other gates they can drive. The current GATE CSE syllabus no longer covers this, but the papers of 1991,
1994 and 1998 did, with four questions in our bank. This lesson treats the MOS transistor as a switch
controlled by a voltage, uses that one idea to read pass-transistor networks (the 1991 question) and to
design CMOS gates, then turns to the electrical numbers that describe a **logic family**: voltage levels
and noise margins (the 1998 question), fan-out, power and speed, and the comparison of TTL, ECL, CMOS,
nMOS and GaAs (the 1994 and 1991 questions).

## Where this fits

[Chapter 2, Lesson 1](lesson:logic-gates) defined the gates by their truth tables and showed the
"switches and a lamp" picture: switches in series behave as AND, in parallel as OR. Here those switches
become transistors. The latch of [Chapter 6, Lesson 1](lesson:latches) reappears as the SRAM cell, and
the high-impedance outputs of memory chips in [Lesson 1](lesson:memory-devices) are exactly the
floating node we meet in pass-transistor networks. [Lesson 2](lesson:data-converters) of this chapter
deals with the other border between digital and analog, the converters. Device physics (how a transistor
actually conducts) belongs to an electronics course; we use only what a switch model and a few data-sheet
numbers can say.

:::table{#radar title="GATE radar: logic families and switch-level circuits" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 4, all before 2000: 1991 (two), 1994, 1998 |
| Marks | 1991: a 2-mark fill-in (the output of a pass-transistor network) and a 2-mark MSQ (CMOS vs nMOS); 1994: a match-the-lists item (four families); 1998: a 1-mark MCQ (TTL logic-1 level) |
| Pattern 1 | Read a switch network: which inputs make a path conduct, and what reaches the output (1991) |
| Pattern 2 | Family facts: power, speed, density, bipolar or unipolar (1991, 1994) |
| Pattern 3 | Voltage levels of TTL (1998) |
| What examiners test | NMOS on for gate 1 and PMOS on for gate 0; series = AND, parallel = OR; an output with no path **floats**; CMOS's real advantage is near-zero static power; ECL is the fastest silicon family; TTL's input logic-1 level starts at 2.0 V |
:::

## The MOS transistor as a switch

:::intuition{#switch-intuition title="A tap that a voltage opens" depth="standard"}
Think of a transistor as a water tap whose handle is turned by a voltage. The two ends of the pipe are the
transistor's **source** and **drain**; the handle is its **gate**. An **NMOS** transistor opens when its
gate is high (logic 1) and closes when it is low. A **PMOS** transistor is the opposite: it opens when its
gate is low. The tap does not care which way the water flows, so a transistor can pass a signal in either
direction between its two ends.

There is one catch, and it matters. An NMOS tap is excellent at draining a pipe to the floor (passing a
0) but cannot fill it all the way to the top (it passes only a weakened 1). A PMOS tap is the reverse:
it fills to the top perfectly and cannot drain completely. So we say **NMOS passes a strong 0, PMOS passes
a strong 1**, and every circuit in this lesson is designed around that asymmetry.
:::

:::definition{#mos-switch term="Switch model of NMOS and PMOS" depth="standard"}
In the **switch model** a MOS transistor connects its two terminals (source and drain) when it is **on**
and disconnects them when it is **off**; its gate draws no current.

| Transistor | On when its gate is | Passes a 0 | Passes a 1 |
|:--|:--|:--|:--|
| NMOS | 1 ($V_{DD}$) | strong (down to 0 V) | degraded (only up to $V_{DD} - V_{tn}$) |
| PMOS (drawn with a bubble on the gate) | 0 (0 V) | degraded (only down to $\lvert V_{tp} \rvert$) | strong (up to $V_{DD}$) |

Here $V_{tn}$ and $\lvert V_{tp} \rvert$ are the **threshold voltages**. With $V_{DD} = 5$ V and thresholds of
0.7 V (illustrative values, ignoring the body effect), an NMOS passes a 1 as 4.3 V and a PMOS passes a 0 as
0.7 V. A node can be in one of four states: **driven 0**, **driven 1** (strong or degraded), **floating**
(Z: no conducting path to any driven node, so it keeps whatever charge it had, which is not a reliable
logic value) or **in contention** (X: paths to both a 0 and a 1).
:::

:::theorem{#threshold-theorem name="NMOS passes a strong 0 but a degraded 1" depth="standard"}
An NMOS transistor with its gate at $V_{DD}$ pulls a node all the way to 0 V when its other terminal is at
0 V, but raises it only to $V_{DD} - V_{tn}$ when its other terminal is at $V_{DD}$. For a PMOS with its gate at
0 V the roles of 0 and 1 swap.
:::

:::proof{#proof-threshold of="the strong/degraded rule" depth="standard"}
**Idea first:** a transistor conducts only while its gate is more than one threshold away from the
**lower** of its two ends (for NMOS), and the end being charged is that lower end.

An NMOS conducts while $V_{GS} > V_{tn}$, where $V_{GS}$ is measured to the source, the terminal at the lower
voltage. Passing a 0: the source is the input at 0 V and $V_{GS} = V_{DD} > V_{tn}$ for as long as charge flows,
so the output keeps falling until it reaches 0 V. Passing a 1: the output node is now the lower terminal,
so it is the source. As it charges, $V_{GS} = V_{DD} - V_{out}$ shrinks; when $V_{out} = V_{DD} - V_{tn}$ the transistor
turns off and charging stops. The PMOS argument is the mirror image (it conducts while its gate is more
than $\lvert V_{tp} \rvert$ **below** its higher terminal), so it passes a full 1 and stops a 0 at $\lvert V_{tp} \rvert$.
:::

:::intuition{#network-intuition title="Paths of taps" depth="standard"}
Put taps in a row and water flows only if **every** tap is open: series is AND. Put taps side by side and
water flows if **any** of them is open: parallel is OR. A network of transistors between an input and an
output is just a plumbing plan, and the question "does the input reach the output?" becomes a Boolean
expression in the gate signals. The one new possibility, compared with gates, is that **no** path may be
open at all. Then the output is connected to nothing and simply floats.
:::

:::definition{#pass-transistor term="Pass-transistor networks" depth="standard"}
A **pass-transistor network** connects signal inputs (not just the supply rails) to an output through
transistors whose gates are control signals. Each transistor has a **conduction condition**: its gate
variable $g$ for an NMOS, $\overline{g}$ for a PMOS. A path conducts when every transistor on it is on, and
the output is the value of whichever input reaches it. If several paths conduct they must carry the same
value, or the node is in contention; if none conducts, the output **floats** (Z).

The 1991 network is of this kind: input $x$ reaches the output $f$ through a PMOS gated by $a$ and then an
NMOS gated by $b$; input $y$ reaches $f$ through an NMOS gated by $a$ and then a PMOS gated by $b$.
:::

:::theorem{#series-parallel-theorem name="Series is AND, parallel is OR" depth="standard"}
For a network built from transistors by series and parallel composition, define its conduction function
$G$: for a single NMOS $G = g$, for a single PMOS $G = \overline{g}$; for networks in series
$G = G_1 G_2$; for networks in parallel $G = G_1 + G_2$. Then the network connects its two terminals exactly
when $G = 1$.
:::

:::proof{#proof-series-parallel of="the series-parallel theorem" depth="standard"}
**Idea first:** a chain is connected only if every link holds; a bundle is connected if any strand does.

Induction on the construction. A single transistor connects its terminals exactly when it is on, which is
$g = 1$ for NMOS and $g = 0$ (that is, $\overline{g} = 1$) for PMOS. Series: the two sub-networks share only
their middle node, so every path from one end to the other passes through both, and a path exists iff
each sub-network connects its own ends: $G_1 = 1$ and $G_2 = 1$. Parallel: the sub-networks share both ends,
so a path exists iff at least one of them connects: $G_1 = 1$ or $G_2 = 1$.
:::

:::trap{#trap-float title="Writing 0 where the output floats" depth="standard"}
For the 1991 network the answer $f = \overline{a}bx + a\overline{b}y$ is right, but it hides something: when
$a = b$, **neither** path conducts and $f$ is connected to nothing. A Boolean expression silently says
$f = 0$ for those rows; the circuit actually leaves $f$ floating at whatever charge it last held. The
expected slip is to "simplify" this as a multiplexer that always produces an output. In a real design a
floating node is a bug (or, in a dynamic latch, a deliberate memory that leaks away); a complete answer
names it.
:::

:::intuition{#tg-intuition title="Two taps side by side, one for each direction" depth="standard"}
If NMOS is good at passing 0 and PMOS is good at passing 1, put one of each side by side and open them
together. Whatever value comes along, one of the two passes it perfectly. That pair is a
**transmission gate**, the cleanest switch you can build in CMOS. The price is a second control wire,
because the PMOS needs the complement of the NMOS's gate signal.
:::

:::definition{#transmission-gate term="Transmission gate" depth="standard"}
A **transmission gate** (TG) is an NMOS and a PMOS in parallel between the same two nodes, with the NMOS
gated by a control $c$ and the PMOS by $\overline{c}$. For $c = 1$ both are on and the TG passes **both** 0 and 1
at full strength; for $c = 0$ both are off and the TG is open. Two TGs make a 2:1 multiplexer: one passes
$I_0$ when $s = 0$, the other passes $I_1$ when $s = 1$, so $Y = \overline{s} I_0 + s I_1$ with full levels and
no floating case, using 4 transistors (plus an inverter for $\overline{s}$).
:::

:::viz{#pass-viz spec="pass-transistor-paths" mode="animate" depth="standard"}
:::

### Worked examples: switch networks

::::example{#ex-sw-easy level="easy" title="What one NMOS passes" depth="quick"}
An NMOS transistor has its gate at 1. One terminal is driven, the other is the output. What does the
output reach when the driven terminal is 0 V, and when it is $V_{DD} = 5$ V ($V_{tn} = 0.7$ V)? What if the gate
is 0?

:::step{why="Gate 1 turns an NMOS on, so it connects the two terminals."}
The transistor conducts.
:::

:::step{why="A 0 passes through an NMOS at full strength; a 1 stops one threshold below the supply."}
Input 0 V: output 0 V (strong 0). Input 5 V: output $5 - 0.7 = 4.3$ V (degraded 1).
:::

:::step{why="Gate 0 turns an NMOS off, so the output has no path to the input."}
Gate 0: the output floats (Z).
:::

:::answer
0 V (strong), 4.3 V (degraded 1), or floating when the gate is 0. A PMOS would do the reverse: 5 V
strong, 0.7 V degraded 0.
:::
::::

::::example{#ex-sw-medium level="medium" title="When does x reach the output?" depth="standard"}
Input $x$ reaches node $f$ through two NMOS transistors in series, gated by $a$ and $b$; a third NMOS,
gated by $c$, is in parallel with that pair. For which $(a, b, c)$ does $x$ reach $f$?

:::step{why="Series is AND: both transistors of the pair must be on."}
The pair conducts when $ab = 1$.
:::

:::step{why="Parallel is OR: either branch is enough."}
The network conducts when $G = ab + c = 1$.
:::

:::step{why="List the rows of the condition to be sure; the rest float."}
Rows $(a, b, c) = 001, 011, 101, 110, 111$: five of the eight. In the other three the output floats.
:::

:::answer
$x$ reaches $f$ exactly when $ab + c = 1$ (five input rows); otherwise $f$ floats.
:::
::::

::::example{#ex-sw-gate level="gate" title="The 1991 network: output for every (a, b)" depth="standard"}
Input $x$ goes through a PMOS gated by $a$ and then an NMOS gated by $b$ to $f$; input $y$ goes through an
NMOS gated by $a$ and then a PMOS gated by $b$ to $f$. Find $f$.

:::step{why="A PMOS conducts on gate 0 and an NMOS on gate 1, and series means both."}
Top path: $\overline{a} \cdot b$. Bottom path: $a \cdot \overline{b}$.
:::

:::step{why="Check each input pair; the two conditions can never both be 1, so the paths never fight."}
$ab = 01$: top on, $f = x$. $ab = 10$: bottom on, $f = y$. $ab = 00$ and $11$: both off.
:::

:::step{why="Combine the conducting cases as a sum of products."}
$f = \overline{a}bx + a\overline{b}y$.
:::

:::step{why="Notice that each conducting path has one transistor of each type, so neither value passes cleanly."}
A 1 crosses the PMOS fully but drops to $4.3$ V at the NMOS; a 0 crosses the NMOS fully but stops at
$0.7$ V at the PMOS. Both values arrive degraded.
:::

:::answer
$f = \overline{a}bx + a\overline{b}y$, with $f$ **floating** for $a = b$ (and degraded levels when it is driven).
:::
::::

::::example{#ex-sw-edge level="gate" title="Edge case: a network that never floats" depth="standard"}
Change the 1991 network: $x$ reaches $f$ through one NMOS gated by $s$, and $y$ through one PMOS gated by
$s$. What is $f$, can it float, and how good are its levels?

:::step{why="The NMOS conducts on s = 1 and the PMOS on s = 0, so exactly one path is on for every s."}
$s = 1$: $f = x$; $s = 0$: $f = y$. Never both, never neither.
:::

:::step{why="Write it as a function; no row is left undriven."}
$f = sx + \overline{s}y$: a 2:1 multiplexer with only two transistors.
:::

:::step{why="The strength depends on which transistor carries which value."}
$x = 1$ through the NMOS arrives as $4.3$ V (degraded); $y = 1$ through the PMOS arrives as $5$ V (strong);
$x = 0$ through the NMOS is strong, $y = 0$ through the PMOS is $0.7$ V.
:::

:::answer
$f = sx + \overline{s}y$, never floating, but with degraded levels on two of the four cases. Replacing each
transistor by a transmission gate gives full levels everywhere, at 4 transistors.
:::
::::

:::note{#recap-switch title="Recap" depth="quick"}
NMOS on at gate 1, passes a strong 0; PMOS on at gate 0, passes a strong 1. Series = AND, parallel = OR.
No conducting path means a floating output (Z); paths to both values mean contention (X). A transmission
gate passes both values cleanly. The 1991 network: $f = \overline{a}bx + a\overline{b}y$, floating for $a = b$.
:::

## Building gates in CMOS

:::intuition{#cmos-intuition title="One door to the ceiling, one to the floor" depth="standard"}
The output of a gate is a room with two doors: one to the ceiling ($V_{DD}$, logic 1) and one to the floor
(ground, logic 0). A good gate opens **exactly one** of the two doors for every input. If neither opens,
the output floats; if both open, current pours straight from $V_{DD}$ to ground and the output is a fight.
CMOS ("complementary MOS") builds the floor door from NMOS transistors, which are good at passing 0,
and the ceiling door from PMOS transistors, good at passing 1, wired so that one door is the exact
complement of the other. Then for every input precisely one door is open, the output is always driven
at full strength, and, once the inputs stop changing, no current flows at all.
:::

:::definition{#cmos-gates term="Static CMOS gates" depth="standard"}
A **static CMOS gate** computing $Y = \overline{e}$ for a series-parallel expression $e$ has:

- a **pull-down network** (PDN) of NMOS transistors between $Y$ and ground that conducts exactly when
  $e = 1$: AND in $e$ becomes series, OR becomes parallel;
- a **pull-up network** (PUN) of PMOS transistors between $V_{DD}$ and $Y$, the **dual** of the PDN: every
  series connection becomes parallel and every parallel becomes series, with the same input on each gate.

Each input drives one NMOS and one PMOS, so a gate with $n$ input literals has $2n$ transistors.
Examples: inverter (1 + 1 = 2 transistors), NAND2 (two NMOS in series, two PMOS in parallel: 4), NOR2 (two
NMOS in parallel, two PMOS in series: 4), NAND3 (6), the AND-OR-invert $\overline{AB + C}$ (6).
:::

:::theorem{#cmos-duality-theorem name="In a CMOS gate exactly one network conducts" depth="standard"}
For a static CMOS gate built as above, for **every** input combination exactly one of the PDN and the PUN
conducts. Hence the output is always driven (never floating), always at full strength (0 through NMOS,
1 through PMOS), equal to $\overline{e}$, and in steady state there is no conducting path from $V_{DD}$ to ground:
**no static current**.
:::

:::proof{#proof-cmos-duality of="the CMOS duality theorem" depth="standard"}
**Idea first:** the PUN is the PDN with every switch inverted and every AND turned into an OR, which by De
Morgan computes the complement.

By the series-parallel theorem the PDN conducts iff $e = 1$. Claim: the dual PMOS network conducts iff
$e = 0$. Induction on $e$. A single literal $g$: the PMOS conducts iff $g = 0$, i.e. iff $e = 0$. If
$e = e_1 e_2$, the PDN puts $e_1$ and $e_2$ in series, so the PUN puts their duals in **parallel**; it
conducts iff $\overline{e_1} + \overline{e_2} = 1$, which by De Morgan is $\overline{e_1 e_2} = \overline{e}$. If $e = e_1 + e_2$,
the PUN puts the duals in **series** and conducts iff $\overline{e_1}\,\overline{e_2} = \overline{e_1 + e_2} = \overline{e}$. So
for each input exactly one network conducts. The conducting one connects $Y$ to a rail through transistors
of the good type only, so the level is full; and since the other network is open, no path joins the
rails. Our check confirms this by switch-level simulation of every gate in this lesson, on every input row.
:::

:::theorem{#inverting-theorem name="A single CMOS stage is always inverting" depth="standard"}
The function computed by one static CMOS stage is **monotone decreasing** in every input: changing an input
from 0 to 1 can only change the output from 1 to 0, never from 0 to 1. So AND, OR and every other
non-inverting function need at least two stages (for example AND2 = NAND2 + inverter = 6 transistors).
:::

:::proof{#proof-inverting of="the inverting-stage theorem" depth="standard"}
**Idea first:** raising a gate voltage can only turn NMOS on and PMOS off.

Raise one input from 0 to 1. Every NMOS it drives may turn on, and every PMOS it drives turns off. So the PDN
gains switches and can only gain paths, and the PUN loses switches and can only lose paths. If the output
was 0 (PDN conducting), the PDN still conducts and the output stays 0. If it was 1, it either stays 1 or
falls to 0. It can never rise. A non-inverting function such as AND rises when an input rises, so it cannot
be one stage.
:::

:::viz{#cmos-viz spec="cmos-inverter-switch" mode="animate" depth="standard"}
:::

:::intuition{#nand-nor-intuition title="Slow walkers should not walk in single file" depth="standard"}
Electrons, which carry current in NMOS, move about two to three times more easily than holes, which carry
it in PMOS. So a PMOS of the same size is the slower, weaker switch. A NAND puts its transistors **in
series on the NMOS side** (fast walkers in single file) and in parallel on the PMOS side. A NOR does the
opposite: its slow PMOS walk in single file. To make a NOR as fast as a NAND you must make its series PMOS
much wider, so the NOR ends up larger, slower, or both. That is why NAND, not NOR, is the gate CMOS
designers reach for first.
:::

:::definition{#nand-vs-nor term="Why NAND is preferred over NOR in CMOS" depth="standard"}
Take a unit inverter as the reference: NMOS width 1 and PMOS width 2 (the PMOS made twice as wide to make
up for its lower mobility, so rise and fall are equally strong). A transistor stack of $n$ in series is $n$
times as resistive, so each series device must be $n$ times wider to keep the same drive.

- **$n$-input NAND:** NMOS in series, each of width $n$; PMOS in parallel, each of width 2. Total width
  $n \cdot n + 2n$.
- **$n$-input NOR:** NMOS in parallel, each of width 1; PMOS in series, each of width $2n$. Total width
  $n + 2n \cdot n$.

Unsized (every transistor width 1, PMOS resistance twice NMOS), the worst-case resistances tell the same
story: NAND2 pulls down through $2R$ and up through $2R$; NOR2 pulls down through $R$ but up through $4R$.
:::

:::derivation{#sizing-derivation of="the transistor area of NAND and NOR" depth="standard"}
Matching a unit inverter means the worst-case path in each network must have the resistance of one unit
device of its type. Resistance is proportional to length over width, so $n$ series devices of width $w$
behave like one device of width $w / n$; to look like width 1 (NMOS) or 2 (PMOS) they need width $n$ or
$2n$ each. Parallel devices are each sized as if alone (the worst case is one of them on). Summing:
$$
A_{\text{NAND}}(n) = n^2 + 2n, \qquad A_{\text{NOR}}(n) = n + 2n^2 .
$$
**Sanity check:** $n = 1$ gives $3$ for both (each is an inverter: $1 + 2$). $n = 2$: NAND 8, NOR 10.
$n = 3$: NAND 15, NOR 21. The gap $A_{\text{NOR}} - A_{\text{NAND}} = n^2 - n$ grows quadratically.
:::

:::note{#erratum-nand-nor title="A misprint to avoid (NAND versus NOR)" depth="standard"}
Some printed notes say that "NOR gates are faster than NAND gates and consume less energy". In CMOS the
opposite holds: NOR puts its series stack on the slow PMOS side, so for equal size it is slower, and for
equal speed it is larger (more capacitance, so more switching energy). The same notes conclude, correctly,
that NAND is the preferred universal gate; the claim about speed is the slip. (A remark about "higher
capacity" refers to NAND flash memory, a different matter.)
:::

### Worked examples: CMOS gates

::::example{#ex-cmos-easy level="easy" title="The CMOS NAND2, switch by switch" depth="quick"}
A CMOS NAND2 has NMOS gated by $A$ and $B$ in series to ground and PMOS gated by $A$ and $B$ in parallel to
$V_{DD}$. Find $Y$ for all four inputs and which network conducts.

:::step{why="The series NMOS stack conducts only when both gates are 1."}
PDN conducts for $AB = 11$ only.
:::

:::step{why="The parallel PMOS conduct when either gate is 0."}
PUN conducts for $AB = 00, 01, 10$.
:::

:::step{why="Exactly one network conducts per row, as the duality theorem promises."}
$Y = 1, 1, 1, 0$ for $AB = 00, 01, 10, 11$.
:::

:::answer
$Y = \overline{AB}$, always driven at full strength; 4 transistors.
:::
::::

::::example{#ex-cmos-medium level="medium" title="Design Y = NOT(AB + C)" depth="standard"}
Design a single static CMOS stage for $Y = \overline{AB + C}$ and count its transistors.

:::step{why="The PDN must conduct exactly when AB + C = 1: AND becomes series, OR becomes parallel."}
PDN: NMOS $A$ and $B$ in series, that pair in parallel with NMOS $C$.
:::

:::step{why="The PUN is the dual: series becomes parallel and parallel becomes series."}
PUN: PMOS $A$ and $B$ in parallel, that pair in series with PMOS $C$.
:::

:::step{why="Check one row in each direction: the simulation must give Y = NOT(AB + C)."}
$ABC = 110$: PDN path through $A$, $B$ conducts; PUN needs $C$'s PMOS (on) and one of $A$, $B$ off (no): open,
$Y = 0$. $ABC = 100$: PDN open; PUN: $B$'s PMOS on, $C$'s on, so $Y = 1$.
:::

:::answer
6 transistors (three literals, $2 \times 3$): an AND-OR-invert gate in one stage.
:::
::::

::::example{#ex-cmos-gate level="gate" title="Design Y = NOT((A + B)(C + D))" depth="standard"}
Give the PDN and the PUN of $Y = \overline{(A + B)(C + D)}$, the transistor count, and the worst-case series
stack on each side.

:::step{why="PDN: the product becomes series and each sum becomes parallel."}
PDN: ($A \parallel B$) in series with ($C \parallel D$).
:::

:::step{why="PUN: dualise every connection."}
PUN: ($A$ series $B$) in parallel with ($C$ series $D$).
:::

:::step{why="Every literal appears once in each network."}
$4$ literals: $8$ transistors; series stacks of 2 on both sides.
:::

:::answer
PDN $(A \parallel B) - (C \parallel D)$, PUN $(A - B) \parallel (C - D)$, 8 transistors, stacks of two NMOS and two
PMOS. The simulation over all 16 inputs gives $Y = \overline{(A + B)(C + D)}$ with exactly one network on.
:::
::::

::::example{#ex-cmos-edge level="gate" title="Edge case: an AND gate, and a 3-input NOR" depth="standard"}
(a) Can a single static CMOS stage compute $AB$? (b) Compare the sized transistor area of NAND3 and NOR3
(unit inverter: NMOS 1, PMOS 2).

:::step{why="By the inverting-stage theorem a single stage can only fall when an input rises; AB rises from 0 to 1 when B rises with A = 1."}
(a) No. $AB$ needs a NAND2 followed by an inverter: $4 + 2 = 6$ transistors, and two gate delays.
:::

:::step{why="NAND3: series NMOS sized 3 each, parallel PMOS sized 2 each."}
(b) $A_{\text{NAND}}(3) = 9 + 6 = 15$.
:::

:::step{why="NOR3: parallel NMOS sized 1, series PMOS sized 2 × 3 = 6 each."}
$A_{\text{NOR}}(3) = 3 + 18 = 21$.
:::

:::answer
(a) No single stage; AND costs 6 transistors. (b) NAND3 15 units of width against NOR3 21: the NOR is 40%
bigger for the same drive, which is the quantitative reason NAND is preferred.
:::
::::

:::note{#recap-cmos title="Recap" depth="quick"}
CMOS gate $= \overline{e}$: NMOS PDN of $e$ (AND series, OR parallel), dual PMOS PUN. Exactly one network
conducts, so outputs are full-strength and static current is zero. One stage is always inverting. NAND
beats NOR because its series stack is on the faster NMOS side: area $n^2 + 2n$ against $n + 2n^2$.
:::

## Voltage levels, noise margins, fan-out and power

:::intuition{#levels-intuition title="A border with a no-man's land" depth="standard"}
A wire carries a voltage, not a bit. Somewhere the receiver must decide "this is a 0" or "this is a 1",
and noise will always shake the voltage a little on its way. So every family draws two borders, not one.
A sender promises to put out voltages **well inside** its territory: above $V_{OH}$ for a 1, below $V_{OL}$ for
a 0. A receiver promises to accept anything **near** the territory: above $V_{IH}$ as a 1, below $V_{IL}$ as a
0. Between $V_{IL}$ and $V_{IH}$ lies a no-man's land the receiver does not promise anything about. The gap
between what the sender promises and what the receiver needs is the room noise has to play in without
causing an error: the **noise margin**.
:::

:::definition{#noise-margins term="Logic levels and noise margins" depth="standard"}
For a logic family (worst-case data-sheet values):

- $V_{OH}$: the lowest voltage an output gives for a 1; $V_{OL}$: the highest it gives for a 0;
- $V_{IH}$: the lowest input voltage guaranteed to read as 1; $V_{IL}$: the highest guaranteed to read as 0.

The **noise margins** are
$$
NM_H = V_{OH} - V_{IH}, \qquad NM_L = V_{IL} - V_{OL}.
$$

| Family | $V_{OH}$ | $V_{OL}$ | $V_{IH}$ | $V_{IL}$ | $NM_H$ | $NM_L$ |
|:--|:--|:--|:--|:--|:--|:--|
| Standard TTL ($V_{CC} = 5$ V) | 2.4 V | 0.4 V | 2.0 V | 0.8 V | 0.4 V | 0.4 V |
| 5 V CMOS (thresholds at 30% and 70% of $V_{DD}$, outputs within 0.1 V of the rails) | 4.9 V | 0.1 V | 3.5 V | 1.5 V | 1.4 V | 1.4 V |

So a TTL **input** reads anything from 2.0 V up to $V_{CC}$ as logic 1, anything from 0 V to 0.8 V as logic 0,
and guarantees nothing between 0.8 V and 2.0 V. A TTL **output** promises at least 2.4 V for a 1 and at
most 0.4 V for a 0.
:::

:::derivation{#nm-derivation of="the noise margins" depth="standard"}
A 1 leaves the sender at no less than $V_{OH}$ and is read correctly as long as it arrives at no less than
$V_{IH}$. Noise that pulls it down by $\Delta$ is harmless while $V_{OH} - \Delta \ge V_{IH}$, i.e.
$\Delta \le V_{OH} - V_{IH} = NM_H$. A 0 leaves at no more than $V_{OL}$ and must arrive at no more than $V_{IL}$:
noise pushing it up by $\Delta$ is harmless while $\Delta \le V_{IL} - V_{OL} = NM_L$.
**Sanity check:** TTL: $2.4 - 2.0 = 0.4$ V and $0.8 - 0.4 = 0.4$ V; the 5 V CMOS values give $4.9 - 3.5 = 1.4$ V and
$1.5 - 0.1 = 1.4$ V, much more room, which is one reason CMOS is quieter. A negative margin means the
families cannot be connected directly.
:::

:::trap{#trap-ttl-threshold title="The TTL logic-1 'threshold' (GATE 1998)" depth="standard"}
GATE 1998 asked for "the threshold level for logic 1 in the TTL family", with the options: any voltage
above 2.5 V; between 0.8 V and 5.0 V; below 5.0 V; below $V_{CC}$ but above 2.8 V. The real figure, $V_{IH} = 2.0$ V,
is in none of them, so the question must be read as "which option describes voltages that a TTL gate
treats as logic 1?". Check every voltage in each range against the levels above:

- "above 2.5 V" has no upper end: it includes voltages above $V_{CC}$, which are outside the operating range;
- "between 0.8 V and 5.0 V" includes 0.8–2.0 V, the undefined region (and 0.8 V itself is a valid 0);
- "below 5.0 V" includes 0 V, a logic 0;
- "below $V_{CC}$ but above 2.8 V" lies entirely inside 2.0 V to $V_{CC}$: every voltage in it is a valid logic 1.

So the key is the last option (D), and the expected wrong answer is A, chosen because 2.5 V "looks like the
middle of 0 to 5 V". The lesson to keep is the numbers: input 1 from **2.0 V**, input 0 up to **0.8 V**,
outputs 2.4 V and 0.4 V.
:::

:::intuition{#fanout-intuition title="How many listeners one speaker can serve" depth="standard"}
Every input attached to an output draws (or pushes) a little current. An output can supply only so much
before its voltage sags out of its promised territory: a 1 drops below $V_{OH}$, or a 0 rises above $V_{OL}$.
So the number of inputs one output may drive is set by dividing what the output can deliver by what each
input takes, separately in the two states, and keeping the worse of the two.
:::

:::definition{#fan-out term="Fan-out and fan-in" depth="standard"}
**Fan-out** is the largest number of standard inputs of the family that one output can drive while keeping
its output levels within $V_{OH}$ and $V_{OL}$:
$$
\text{fan-out} = \min\left( \left\lfloor \frac{I_{OL}}{I_{IL}} \right\rfloor, \left\lfloor \frac{I_{OH}}{I_{IH}} \right\rfloor \right),
$$
where $I_{OL}$ ($I_{OH}$) is the current the output can sink (source) in the low (high) state and $I_{IL}$ ($I_{IH}$)
the current one input draws in that state. For standard TTL, $I_{OL} = 16$ mA, $I_{IL} = 1.6$ mA, $I_{OH} = 0.4$ mA,
$I_{IH} = 40\ \mu$A, so the fan-out is $\min(10, 10) = 10$. CMOS inputs draw almost no steady current, so CMOS
fan-out is limited instead by the capacitance each input adds, which slows the edges.

**Fan-in** is the number of inputs a gate has (a NAND3 has fan-in 3). Large fan-in in CMOS means a long
series stack, so it is slow; designers keep fan-in at about 4 and build wider functions as trees.
:::

:::note{#erratum-fanin title="A misprint to avoid (fan-in)" depth="standard"}
Some printed notes define fan-in as "the load an input presents, in standard loads". That quantity exists
(it is sometimes called the input loading factor), but in GATE questions and in most textbooks **fan-in is
the number of inputs of a gate**. Use that meaning unless a question defines the term otherwise.
:::

:::note{#unused-inputs title="Unused inputs" depth="deep"}
A TTL input left open behaves as a 1 (no current can flow out of it), and an ECL input left open behaves
as a 0 (it has a pull-down resistor). Relying on this is poor practice in TTL, because an open input picks
up noise. A CMOS input must **never** be left open: it floats into the no-man's land, both transistors
of the input stage turn partly on, and the gate draws current or oscillates. The rule for every family:
tie an unused AND or NAND input to 1 (or to a used input, since $A \cdot A = A$) and an unused OR or NOR
input to 0 (or to a used input).
:::

:::intuition{#power-intuition title="Filling and emptying a bucket at every edge" depth="standard"}
A CMOS gate at rest draws no current, so where does a chip's power go? Every wire a gate drives is a small
capacitor. Each time the output rises, the PMOS fills that capacitor from the supply; each time it falls,
the NMOS empties it into ground. The water that went in is poured away. So the power is not about *being*
at 1 or 0 but about **changing**: it grows with how much capacitance switches, how often, and (squared)
how high the supply is. That is why lowering the supply voltage is the most effective way to save power.
:::

:::definition{#power-speed term="Static and dynamic power, speed and the power-delay product" depth="standard"}
- **Static power** flows while nothing changes: in TTL and ECL (bipolar transistors biased on), and in
  nMOS whenever an output is low (the load and the pull-down conduct together). Ideal CMOS has **none**,
  apart from small leakage currents.
- **Dynamic (switching) power** charges and discharges the load capacitance $C$:
  $P_{dyn} = \alpha\, C\, V_{DD}^2\, f$, where $f$ is the clock frequency and $\alpha$ the fraction of cycles in which the
  output makes a full 0 → 1 → 0 cycle (the **activity factor**). There is also a small **short-circuit**
  power while an input passes through the middle and both networks are briefly on.
- **Speed** is measured by the **propagation delay** $t_{pd}$ of a gate. Because a family can trade speed for
  power, the fair figure of merit is the **power-delay product** $PDP = P \cdot t_{pd}$, an energy per
  switching event.
:::

:::derivation{#power-derivation of="P = C·V²·f" depth="standard"}
When the output rises from 0 to $V_{DD}$, the supply delivers charge $Q = C V_{DD}$ at voltage $V_{DD}$: energy
$Q V_{DD} = C V_{DD}^2$. The capacitor ends up storing $\tfrac12 C V_{DD}^2$, so the other $\tfrac12 C V_{DD}^2$ is
dissipated as heat in the PMOS. When the output falls, the stored $\tfrac12 C V_{DD}^2$ is dissipated in the NMOS.
So one full cycle takes $C V_{DD}^2$ from the supply and turns all of it into heat, independent of the transistor
resistances. With $\alpha f$ such cycles per second, $P_{dyn} = \alpha\, C V_{DD}^2 f$.
**Sanity check:** $C = 10$ pF, $V_{DD} = 5$ V, $f = 10$ MHz, $\alpha = 1$: $10^{-11} \times 25 \times 10^{7} = 2.5$ mW. Halving
$V_{DD}$ divides it by 4.
:::

### Worked examples: levels, fan-out and power

::::example{#ex-el-easy level="easy" title="Noise margins of TTL and of 5 V CMOS" depth="quick"}
Compute $NM_H$ and $NM_L$ for standard TTL ($V_{OH} = 2.4$, $V_{OL} = 0.4$, $V_{IH} = 2.0$, $V_{IL} = 0.8$ V) and for the
5 V CMOS levels of the table.

:::step{why="The high margin is what a sender's worst 1 has to spare above the receiver's worst-case 1 threshold."}
TTL: $NM_H = 2.4 - 2.0 = 0.4$ V; CMOS: $4.9 - 3.5 = 1.4$ V.
:::

:::step{why="The low margin is the receiver's 0 threshold minus the sender's worst 0."}
TTL: $NM_L = 0.8 - 0.4 = 0.4$ V; CMOS: $1.5 - 0.1 = 1.4$ V.
:::

:::answer
TTL 0.4 V and 0.4 V; 5 V CMOS 1.4 V and 1.4 V.
:::
::::

::::example{#ex-el-medium level="medium" title="Fan-out within and across TTL series" depth="standard"}
A low-power Schottky (74LS) output sinks 8 mA and sources 0.4 mA; a 74LS input draws 0.4 mA low and 20 µA
high; a standard TTL input draws 1.6 mA low and 40 µA high. Find the fan-out of 74LS driving 74LS, and of
74LS driving standard TTL.

:::step{why="Fan-out must hold in both states, so compute the low-state and the high-state ratios."}
74LS → 74LS: $8 / 0.4 = 20$ and $0.4\ \text{mA} / 20\ \mu\text{A} = 20$.
:::

:::step{why="The worse of the two ratios limits the fan-out."}
Fan-out $= \min(20, 20) = 20$.
:::

:::step{why="Standard TTL inputs draw four times the low-state current."}
74LS → standard: $8 / 1.6 = 5$ and $0.4\ \text{mA} / 40\ \mu\text{A} = 10$; fan-out $= \min(5, 10) = 5$.
:::

:::answer
20 within the 74LS series, but only 5 when driving standard TTL inputs, limited by the low state.
:::
::::

::::example{#ex-el-gate level="gate" title="Switching power, and the effect of a lower supply" depth="standard"}
A CMOS output drives a 10 pF load and makes one full 0 → 1 → 0 cycle per clock at 10 MHz. Find the energy
drawn per cycle and the dynamic power at $V_{DD} = 5$ V and at 3.3 V.

:::step{why="Each full cycle draws C·V² from the supply, half lost in each transistor."}
At 5 V: $C V^2 = 10\ \text{pF} \times 25 = 250$ pJ per cycle (125 pJ in the PMOS, 125 pJ in the NMOS).
:::

:::step{why="Multiply by the number of cycles per second."}
$P = 250\ \text{pJ} \times 10^7 = 2.5$ mW.
:::

:::step{why="Power scales with V², so recompute with 3.3² = 10.89."}
At 3.3 V: $10\ \text{pF} \times 10.89 \times 10^7 = 1.089$ mW.
:::

:::answer
250 pJ per cycle and 2.5 mW at 5 V; 1.089 mW at 3.3 V (a 56% saving from a 34% lower supply). The static
power is zero in both cases.
:::
::::

::::example{#ex-el-edge level="gate" title="Edge case: a TTL output driving a CMOS input" depth="standard"}
A standard TTL output (levels as above) drives a 5 V CMOS input ($V_{IH} = 3.5$ V, $V_{IL} = 1.5$ V). Compute the
noise margins of this connection. Is it reliable?

:::step{why="Mixed families: take the sender's output levels and the receiver's input levels."}
$NM_H = V_{OH}^{TTL} - V_{IH}^{CMOS} = 2.4 - 3.5 = -1.1$ V.
:::

:::step{why="Same rule for the low state."}
$NM_L = V_{IL}^{CMOS} - V_{OL}^{TTL} = 1.5 - 0.4 = 1.1$ V.
:::

:::step{why="A negative margin means a guaranteed 1 can land in the receiver's undefined region even with no noise."}
A TTL 1 at 2.4 V reads as *undefined* at the CMOS input.
:::

:::answer
$NM_H = -1.1$ V, $NM_L = 1.1$ V: the high state is not reliable. The usual fixes are a pull-up resistor on the
TTL output or a CMOS input family with TTL-compatible thresholds ($V_{IH} = 2.0$ V).
:::
::::

:::note{#recap-levels title="Recap" depth="quick"}
$NM_H = V_{OH} - V_{IH}$, $NM_L = V_{IL} - V_{OL}$; TTL 2.4/0.4/2.0/0.8 gives 0.4 V each; mixed families use the
sender's outputs and the receiver's inputs. Fan-out $= \min(I_{OL}/I_{IL}, I_{OH}/I_{IH})$; fan-in = number of inputs.
$P_{dyn} = \alpha C V^2 f$; CMOS has no static power.
:::

## Logic families compared

:::intuition{#families-intuition title="Cars built for different races" depth="standard"}
A logic family is a whole way of building gates, the way a car maker has a whole way of building cars.
Some families are race cars: ECL never lets its transistors saturate, so it switches fastest among silicon
families, and it burns fuel (power) even standing still. Some are cheap family cars: TTL is robust, easy and
inexpensive, of moderate speed. CMOS is the electric city car: it uses almost nothing at rest and lets you
pack millions onto one chip, which is why it took over. GaAs is a specialist vehicle built from a different
material: very fast and radiation-hard, but hard and expensive to make. Every comparison question is a
question about these trade-offs.
:::

:::definition{#families term="The classic logic families" depth="standard"}
Families split first by the transistor: **bipolar** (BJT: current carried by both electrons and holes) or
**unipolar** (FET: one kind of carrier, as in MOS and in GaAs MESFETs).

| Family | Device | Speed (typical $t_{pd}$) | Power per gate | Density, cost | Notes |
|:--|:--|:--|:--|:--|:--|
| TTL (standard) | bipolar | about 10 ns | about 10 mW | modest density, inexpensive | 5 V; open input reads 1; 74LS: about 9.5 ns at 2 mW |
| ECL | bipolar, non-saturating | about 1 ns or less: fastest silicon family | about 25 mW, static | low density | negative supply, small voltage swing; open input reads 0 |
| nMOS | unipolar (n-channel only) | moderate | static current whenever an output is low | high density, few transistors ($n + 1$ for an $n$-input gate) | ratioed logic: $V_{OL}$ depends on transistor sizes |
| CMOS | unipolar (complementary) | moderate in early series (tens of ns), fast in modern processes | near zero static; dynamic $\alpha C V^2 f$ | highest integration | wide supply range, large noise margins; inputs must not float |
| GaAs | unipolar (MESFET) | very high | moderate | low density, difficult and expensive to fabricate | good resistance to radiation |

**Power-delay products** (from the typical figures): standard TTL $10\ \text{mW} \times 10\ \text{ns} = 100$ pJ; 74LS
$2\ \text{mW} \times 9.5\ \text{ns} = 19$ pJ; ECL $25\ \text{mW} \times 1\ \text{ns} = 25$ pJ. These are order-of-magnitude
data-sheet values, enough for comparisons, not for design.
:::

:::definition{#cmos-vs-nmos term="CMOS versus nMOS" depth="standard"}
An **nMOS** gate uses an NMOS pull-down network and a single always-on load transistor (a depletion-mode
device) as the pull-up. An $n$-input nMOS NAND therefore has $n + 1$ transistors against $2n$ in CMOS, needs
fewer fabrication steps (no wells for the PMOS devices), and packs more gates per area. Its weakness is
power: whenever the output is low, the load and the pull-down both conduct, and current flows from $V_{DD}$
to ground continuously.

So, compared with nMOS, CMOS has **lower power dissipation** (near zero static power) as its decisive
advantage. It is **not** smaller (twice the transistors per input, plus wells), it needs **more** masks
(well and extra implant steps), and it is **not** clearly faster: each CMOS input drives two transistor gates,
and its PMOS pull-up is slow because holes are less mobile than electrons. Speed is not counted as an
advantage of CMOS over nMOS.
:::

:::theorem{#nmos-static-theorem name="An nMOS gate draws static current exactly when its output is low" depth="standard"}
In an nMOS gate (always-on load from $V_{DD}$ to $Y$, NMOS pull-down network of $e$ from $Y$ to ground),
there is a conducting path from $V_{DD}$ to ground if and only if $e = 1$, i.e. if and only if $Y = 0$.
In the corresponding CMOS gate there is no such path for any input.
:::

:::proof{#proof-nmos-static of="the nMOS static-current theorem" depth="standard"}
**Idea first:** the load is always on, so the only question is whether the pull-down is on.

The load always connects $V_{DD}$ to $Y$. A path from $V_{DD}$ to ground therefore exists iff $Y$ is connected to
ground, i.e. iff the pull-down network conducts, which by the series-parallel theorem is $e = 1$. In that
case the pull-down (strong) wins against the load (weak), so $Y = 0$: the output is low exactly when
current flows. For CMOS, the duality theorem says the PUN and PDN never conduct together, so no input
creates a rail-to-rail path. The check simulates the nMOS NAND2 and confirms the fight on the row 11 only.
:::

:::trap{#trap-cmos-speed title="Ticking 'faster' and 'smaller' for CMOS" depth="standard"}
In GATE 1991 the expected wrong answers were B (greater speed) and C (smaller chip size), because "CMOS is
the modern technology" sounds as if it must be better at everything. It is better at **power**. Per gate it
is larger than nMOS ($2n$ transistors against $n + 1$, and PMOS devices need their own wells), it needs more
masks, and its speed was not superior. Only A is correct.
:::

:::note{#recap-families title="Recap" depth="quick"}
Bipolar: TTL (cheap, modest), ECL (fastest silicon, power-hungry, low density). Unipolar: nMOS (dense,
static power when low), CMOS (near-zero static power, densest integration), GaAs (very fast,
radiation-hard, hard to make). PDP $= P \cdot t_{pd}$. CMOS's advantage over nMOS is power, not speed, size or masks.
:::

## GATE questions on this lesson

:::pyq{id="cse-1991-a-1-i" tests="pass-transistor,mos-switch,series-parallel-theorem,trap-float" depth="standard"}
:::

:::pyq{id="cse-1991-a-3-i" tests="cmos-vs-nmos,power-speed,trap-cmos-speed" depth="standard"}
:::

:::pyq{id="cse-1994-a-3-10" tests="families" depth="standard"}
:::

:::pyq{id="cse-1998-a-15" tests="noise-margins,trap-ttl-threshold" depth="standard"}
:::

## Practice

Our own questions in GATE formats: two warm-ups, four exam-level questions, then two that need care.

:::practice{id="nx-dl-07-03-q01" depth="standard"}
:::

:::practice{id="nx-dl-07-03-q02" depth="standard"}
:::

:::practice{id="nx-dl-07-03-q03" depth="standard"}
:::

:::practice{id="nx-dl-07-03-q04" depth="standard"}
:::

:::practice{id="nx-dl-07-03-q05" depth="standard"}
:::

:::practice{id="nx-dl-07-03-q06" depth="standard"}
:::

:::practice{id="nx-dl-07-03-q07" depth="standard"}
:::

:::practice{id="nx-dl-07-03-q08" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Logic families and switch-level circuits on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Switch model | NMOS on at gate 1, passes strong 0, degraded 1 ($V_{DD} - V_t$); PMOS on at gate 0, passes strong 1 |
| Networks | series = AND, parallel = OR; no path → floating (Z); paths to 0 and 1 → contention (X) |
| GATE 1991 network | $f = \overline{a}bx + a\overline{b}y$, floating when $a = b$ |
| Transmission gate | NMOS ($c$) ∥ PMOS ($\overline{c}$): passes both values at full strength |
| CMOS gate | $Y = \overline{e}$: NMOS PDN of $e$, dual PMOS PUN; $2n$ transistors; exactly one network on; no static current |
| One stage | always inverting; AND = NAND + inverter (6 transistors) |
| NAND vs NOR | NAND preferred: series stack on fast NMOS; sized area $n^2 + 2n$ vs $n + 2n^2$ |
| Noise margins | $NM_H = V_{OH} - V_{IH}$, $NM_L = V_{IL} - V_{OL}$; TTL 2.4 / 0.4 / 2.0 / 0.8 → 0.4 V each |
| GATE 1998 | TTL input logic 1 from 2.0 V; only option D lies wholly in the logic-1 band |
| Fan-out / fan-in | $\min(\lfloor I_{OL}/I_{IL} \rfloor, \lfloor I_{OH}/I_{IH} \rfloor)$ (TTL 10); fan-in = number of inputs |
| Power | static (TTL, ECL, nMOS when low) vs dynamic $\alpha C V^2 f$; PDP $= P \cdot t_{pd}$ |
| GATE 1994 | ECL – bipolar, fastest silicon; GaAs – unipolar, very fast, radiation-hard; TTL – bipolar, inexpensive; CMOS – unipolar, low power |
| GATE 1991 MSQ | CMOS over nMOS: lower power only (not speed, size or masks) |
| Optional | not in the current GATE DL syllabus; pre-2000 papers only |
:::
