---
id: gate-circuit-analysis
subject: dl
chapter: boolean-algebra-gates
title: Analysing gate circuits and timing
order: 6
prerequisites: [canonical-forms, universal-gates]
pyq_topics: [dl/gates, dl/combinational]
est_minutes: 50
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every circuit, minterm list and waveform is checked by truth table or event simulation in content/gate-notes/_checks/dl/l2_06_circuit_analysis.py."
  - "Coverage checklist only (internal digests, never copied): set A p. 24, set B pp. 108–109, set C pp. 199–202, 223–226 and 245–246. Unsimplified results in set C are recorded in _errata/dl.md."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (analysis procedure, propagation delay, hazards)."
  - "PYQs: src/gate/questions.json (dl/gates, dl/combinational); all sixteen keys are re-derived in l2_06_circuit_analysis.py. The stored key of cse-2010-cs-31 was wrong and is fixed in src/gate/fixes/cse-2010.json (checked against the paper's figure)."
updated: "2026-10-17"
---

GATE draws a circuit and asks what it does. Sometimes the gates are ordinary, sometimes they are
whole functions given as minterm lists, sometimes they are switches on a staircase, and sometimes the
question is not *what* the output is but *when*: how long it takes to settle, or whether it flickers
on the way. This lesson gives one method for every kind of circuit question, the set algebra for
"function block" circuits, and the timing ideas (propagation delay, glitches, edge detectors) that
the last few GATE papers have tested.

## Where this fits

Everything before this lesson is used here: gate symbols and bubbles ([Lesson 1](lesson:logic-gates)),
De Morgan and absorption ([Lesson 2](lesson:boolean-laws)), XOR algebra
([Lesson 3](lesson:xor-and-operators)), minterm-set algebra ([Lesson 4](lesson:canonical-forms)) and
NAND/NOR two-level forms ([Lesson 5](lesson:universal-gates)). After this, Chapter 3 minimises the
expressions you extract, and Chapter 6 adds feedback, which is where timing becomes memory.

:::table{#radar title="GATE radar: circuit analysis and timing" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 16 (1993–2025), the largest group of circuit questions in the chapter |
| Marks | 6 one-mark, 9 two-mark, 1 unmarked (1994) |
| Pattern 1 | Read a gate circuit: NAND/NOR/XOR (1993, 1994, 2005, 2010, 2011, 2025) or NOT/AND/OR (2020) |
| Pattern 2 | Circuits of function blocks given as Σ lists: 1997, 2002, 2008, 2019, 2024 |
| Pattern 3 | Wrong gates fabricated (2007) and staircase switches (2005) |
| Pattern 4 | Timing: transitions of an XOR/buffer circuit (2003), the $X \cdot \overline{X}$ glitch (2024) |
| What examiners test | Pushing inversions through NAND/NOR levels, set algebra on minterm lists, and which edge produces a glitch |
:::

## The idea: follow the signal

:::intuition{#follow-the-signal title="A circuit is a recipe read from left to right" depth="standard"}
A combinational circuit has no memory and no loops: every gate's inputs come from the circuit's inputs
or from gates further left. So you can always read it like a recipe. Name each intermediate result,
write each step in terms of earlier ones, and at the end substitute everything into the last step.
That is all "analysis" means.

What makes GATE circuits look hard is only notation: NAND and NOR gates stacked several levels deep
hide simple functions behind double negations, and function blocks hide them behind lists of numbers.
The tools for both are already in your hands: De Morgan cancels the negations, and set algebra
handles the lists.
:::

## Reading a gate circuit

:::definition{#analysis-method term="Method: analysing a combinational circuit" depth="quick"}
1. **Label** every gate output ($G_1, G_2, \dots$), from the inputs towards the output.
2. **Write** each gate's output in terms of its own inputs only.
3. **Substitute** from the output backwards (or forwards from the inputs) and **simplify** at each
   level with De Morgan and absorption.
4. **Or tabulate:** for 2–4 inputs, a truth table computed gate by gate is often faster and is never
   wrong. Read the result as a minterm list or a named function.
5. **Check** the final expression on one row against the gate-by-gate values.
:::

:::viz{#flow-viz spec="signal-flow" mode="animate" depth="standard"}
:::

### NAND and NOR circuits

:::definition{#nand-nor-circuits term="Reading stacked NAND and NOR gates" depth="quick"}
Two facts from [Lesson 5](lesson:universal-gates) do most of the work:
- **A NAND fed by NANDs is an OR of ANDs:** $\big((ab)' (cd)'\big)' = ab + cd$.
- **A NOR fed by NORs is an AND of ORs:** $\big((a + b)' + (c + d)'\big)' = (a + b)(c + d)$.

A NAND (or NOR) with both inputs tied together is an inverter. So in a NAND-only circuit, read the
levels in pairs, counting from the output: each pair of NAND levels is an AND–OR pair. With an odd
number of levels the input level is left over, and its complement survives.
:::

:::trick{#trick-nand-pairs title="Erase bubble pairs" depth="standard"}
Redraw each NAND as an AND with an output bubble. On every wire between two levels, a bubble at the
output of one gate meets the bubble of the next gate's alternative symbol (a NAND is also an OR with
bubbled inputs). Erase each matched pair; what is left is ordinary AND–OR logic.

**Why it works:** two inversions on one wire cancel (De Morgan in pictures). **When it fails:** when a
wire has an odd number of bubbles, for example a NAND used as an inverter between two levels, or an
input that enters the second level directly; there one complement survives and must be written down.
:::

:::definition{#xor-circuits term="XOR and XNOR in circuits" depth="quick"}
Use [Lesson 3](lesson:xor-and-operators)'s rules: a NOT on one XOR input or on its output turns it into
XNOR; NOTs on both inputs cancel. A circuit that is "XNOR" can therefore be drawn in four ways:
$(A \oplus B)'$, $A' \oplus B$, $A \oplus B'$, $(A' \oplus B')'$. Anything else (AND/OR networks)
must be simplified first, for example $\big((AB')' (A + B')\big)' = AB' + A'B = A \oplus B$.
:::

:::definition{#redundancy term="Redundant inputs" depth="quick"}
An input is **redundant** (the circuit is independent of it) when flipping it never changes the output.
Test: simplify the expression and see whether the variable survives, or compare the two cofactors
$f|_{x=0}$ and $f|_{x=1}$ ([Lesson 2](lesson:boolean-laws)); they are equal exactly when $f$ does not
depend on $x$. Absorption and the redundant-literal rule are the usual reasons a variable disappears.
:::

### Worked examples: reading circuits

::::example{#ex-read-sop level="easy" title="NOT, AND, OR to minterms" depth="quick"}
In a circuit, $a$ passes through a NOT gate; an AND gate takes $b$ and $c$; an OR gate combines the
two. Give the output as a minterm list over $(a, b, c)$.

:::step{why="Write each gate in terms of its inputs."}
NOT: $a'$. AND: $bc$. OR: $z = a' + bc$.
:::

:::step{why="Expand with dash patterns: a′ is 0−−, bc is −11."}
$0-- = \{0, 1, 2, 3\}$, $-11 = \{3, 7\}$.
:::

:::answer
$z = \Sigma(0, 1, 2, 3, 7)$.
:::
::::

::::example{#ex-read-nor3 level="medium" title="Three NOR gates" depth="standard"}
$G_1 = \text{NOR}(A, B)$, $G_2 = \text{NOR}(G_1, C)$, $F = \text{NOR}(G_2, A)$. Simplify $F$.

:::step{why="Write the first gate."}
$G_1 = (A + B)'$.
:::

:::step{why="A NOR of a complement: ((A + B)′ + C)′ = (A + B)C′ by De Morgan."}
$G_2 = (A + B)C'$.
:::

:::step{why="F = (G₂ + A)′; first simplify G₂ + A = AC′ + BC′ + A = A + BC′ (absorption)."}
$F = (A + BC')' = A'(B' + C)$.
:::

:::answer
$F = A'(B' + C) = A'B' + A'C$, i.e. $\Sigma(0, 1, 3)$. (Check row 000: $G_1 = 1$, $G_2 = 0$, $F = 1$.)
:::
::::

::::example{#ex-read-drop level="gate" title="Seven NAND gates in which an input disappears" depth="standard"}
First level: $G_1 = \text{NAND}(P, Q)$, $G_2 = \text{NAND}(Q, R)$, $G_3 = \text{NAND}(P, R)$, $G_4 = \text{NAND}(Q, R)$.
Second level: $G_5 = \text{NAND}(G_1, G_2)$, $G_6 = \text{NAND}(G_3, G_4)$. Output $F = \text{NAND}(G_5, G_6)$. Find $F$.

:::step{why="Each second-level NAND of two NANDs is an OR of the two products."}
$G_5 = PQ + QR$ and $G_6 = PR + QR$.
:::

:::step{why="Factor each: Q(P + R) and R(P + Q)."}
$G_5 = Q(P + R)$, $G_6 = R(P + Q)$.
:::

:::step{why="Multiply: G₅G₆ = QR·(P + R)(P + Q), and whenever QR = 1 both brackets are already 1 (Q = R = 1), so the product is just QR."}
$G_5 G_6 = QR$, so $F = (QR)'$.
:::

:::answer
$F = (QR)' = Q' + R'$: the circuit does not depend on $P$. (Row $P = 1, Q = R = 1$: $G_5 = G_6 = 1$, $F = 0$; and $P = 0$ gives the same.)
:::
::::

::::example{#ex-read-redundant level="gate" title="Edge case: an input that cancels" depth="standard"}
$F = \text{NAND}\big(\text{NAND}(X, Y), \text{NAND}(X, Y')\big)$. Which input is redundant?

:::step{why="A NAND of two NANDs is the OR of the two products."}
$F = XY + XY'$.
:::

:::step{why="Factor X: Y + Y′ = 1."}
$F = X(Y + Y') = X$.
:::

:::answer
$F = X$: $Y$ is redundant; the whole circuit is just a buffer (a wire) for $X$.
:::
::::

:::note{#recap-reading title="Recap" depth="quick"}
Label, write, substitute, simplify. A NAND of NANDs is an OR of ANDs; a NOR of NORs an AND of ORs.
An input is redundant when both cofactors agree.
:::

## Circuits of function blocks

:::intuition{#blocks-intuition title="Black boxes with known lists" depth="standard"}
Sometimes a circuit's inputs are not variables but whole sub-circuits whose insides you are not shown,
only their truth tables as lists of rows. You do not need their insides. A gate combines them row by
row: on each row it sees one output from each box and produces one output. So the gate acts on the lists
directly: AND keeps the rows common to both lists, OR merges the lists, XOR keeps the rows in exactly
one. Solving for an unknown box is then a puzzle about lists, and an OR gate can only ever add rows.
:::

Some GATE circuits are drawn with whole functions as inputs: "$f_1$, $f_2$ and $f_3$ feed an AND and an
OR gate". Never expand them into expressions. Work with the minterm lists as sets.

:::definition{#block-equations term="Function blocks as set equations" depth="quick"}
If $f_1 = \Sigma(F_1)$ and $f_2 = \Sigma(F_2)$ over the same variables then ([Lesson 4](lesson:canonical-forms))
AND $\to F_1 \cap F_2$, OR $\to F_1 \cup F_2$, XOR $\to F_1 \triangle F_2$, NOT $\to$ complement, NAND
$\to$ complement of the intersection, NOR $\to$ complement of the union. So a circuit such as
$f = f_1 f_2 + f_3$ is the set equation $F = (F_1 \cap F_2) \cup F_3$.
:::

:::trick{#trick-set-first title="Do set operations on the index lists" depth="standard"}
Write every block as its list of row numbers and apply the gates as set operations. Never write
expressions for the blocks.

**Why it works:** minterm-set algebra is exact. **When it fails:** only if the blocks are over
different variable lists or orders; then convert first (the row numbers depend on the order).
:::

:::theorem{#solve-block name="Solving f = g + h for an unknown block h" depth="standard"}
Let $G$ and $F$ be known minterm sets. The equation $F = G \cup H$ has a solution $H$ exactly when
$G \subseteq F$, and then its solutions are all the sets with
$$
F \setminus G \;\subseteq\; H \;\subseteq\; F .
$$
Dually, $F = G \cap H$ has a solution exactly when $F \subseteq G$, and then
$F \subseteq H \subseteq F \cup \overline{G}$.
:::

:::proof{#proof-solve-block of="the block-solving rule" depth="standard"}
**Idea first:** OR can only add rows, never remove them.

If $G \not\subseteq F$, some row of $G$ is not in $F$, but it is in $G \cup H$ for every $H$: no solution.
If $G \subseteq F$: every row of $F$ not in $G$ must come from $H$, so $F \setminus G \subseteq H$; and any
row of $H$ appears in the output, so $H \subseteq F$. Conversely any $H$ between those bounds gives
$G \cup H = F$. The AND case is the dual (complement everything).
:::

:::definition{#xor-block term="An XOR block is always uniquely determined" depth="quick"}
If $f = g \oplus h$ with $g$ known, then $h = f \oplus g$ ([Lesson 3](lesson:xor-and-operators): XOR
can be undone), so $H = F \triangle G$: always a solution, and exactly one.
:::

:::viz{#blocks-viz spec="block-sets" mode="animate" depth="standard"}
:::

Check any of these with the set calculator: type the lists and read off ∩, ∪ and △.

:::lab{#lab-bench lab="gate-bench" tab="sets" depth="standard"}
:::

### Worked examples: function blocks

::::example{#ex-blk-f3 level="easy" title="Find f₃ in f = f₁f₂ + f₃" depth="quick"}
Over three variables, $f_1 = \Sigma(0, 2, 4, 6)$, $f_2 = \Sigma(2, 3, 6, 7)$ and $f = \Sigma(1, 2, 6)$.
Which minimal $f_3$ makes $f = f_1 f_2 + f_3$?

:::step{why="AND is intersection."}
$f_1 f_2 = \{0, 2, 4, 6\} \cap \{2, 3, 6, 7\} = \{2, 6\}$, which lies inside $f$: a solution exists.
:::

:::step{why="f₃ must supply the rows of f that the AND does not."}
$f \setminus f_1 f_2 = \{1\}$, and $f_3$ may add only rows of $f$.
:::

:::answer
$f_3 = \Sigma(1)$ (any $f_3$ with $\{1\} \subseteq F_3 \subseteq \{1, 2, 6\}$ works; the minimal one is $\Sigma(1)$).
:::
::::

::::example{#ex-blk-f2 level="medium" title="Find what f₂ must contain" depth="standard"}
Over three variables, $f_1 = \Sigma(1, 3, 5, 7)$, $f_3 = \Sigma(0)$ and $f = \Sigma(0, 3, 5)$. What must
$f_2$ satisfy for $f = f_1 f_2 + f_3$?

:::step{why="The AND must supply the rows of f that f₃ misses."}
$f \setminus f_3 = \{3, 5\} \subseteq f_1 \cap f_2$.
:::

:::step{why="The AND may not add rows outside f: inside f₁ only 3 and 5 are allowed."}
$f_1 \cap f_2 \subseteq f$, so $f_1 \cap f_2 = \{3, 5\}$: $f_2$ contains 3 and 5 and excludes 1 and 7.
:::

:::answer
$f_2 \ni 3, 5$; $f_2 \not\ni 1, 7$; rows 0, 2, 4, 6 are free (the AND with $f_1$ ignores them). For example $f_2 = \Sigma(3, 5)$.
:::
::::

::::example{#ex-blk-xor level="gate" title="An XOR block" depth="standard"}
Over three variables, $f = (f_1 f_2) \oplus f_3$ with $f_1 = \Sigma(1, 2, 5, 6)$, $f_2 = \Sigma(2, 3, 6, 7)$
and $f = \Sigma(0, 2, 3)$. Find $f_3$.

:::step{why="AND is intersection."}
$f_1 f_2 = \{2, 6\}$.
:::

:::step{why="XOR can be undone: f₃ = f ⊕ f₁f₂, the symmetric difference."}
$f_3 = \{0, 2, 3\} \triangle \{2, 6\} = \{0, 3, 6\}$.
:::

:::step{why="Check: {2, 6} △ {0, 3, 6} = {0, 2, 3}."}
Correct, and this $f_3$ is the only one.
:::

:::answer
$f_3 = \Sigma(0, 3, 6)$.
:::
::::

::::example{#ex-blk-none level="gate" title="Edge case: no block can work" depth="standard"}
$f = f_1 + f_3$ with $f_1 = \Sigma(1, 4)$ and $f = \Sigma(1, 2)$. Find $f_3$.

:::step{why="OR can only add rows: f₁ must lie inside f."}
Row 4 is in $f_1$ but not in $f$.
:::

:::step{why="Whatever f₃ is, row 4 reaches the output through f₁, so the output can never equal f."}
$4 \in f_1 + f_3$ for every $f_3$, but $4 \notin f$: the condition $g \subseteq f$ of the theorem fails.
:::

:::answer
No $f_3$ exists. In an MCQ the options can then all be rejected ("none of these"), or the data has a misprint.
:::
::::

:::note{#recap-blocks title="Recap" depth="quick"}
AND ∩, OR ∪, XOR △ on Σ lists. For $f = g + h$: need $g \subseteq f$, then $f \setminus g \subseteq h
\subseteq f$. For $f = g \oplus h$: $h = f \oplus g$, unique.
:::

## Wrong gates and switch networks

:::intuition{#switch-intuition title="Mistakes and mechanical switches follow the same rules" depth="standard"}
A factory that fits a NAND where an AND was planned has simply added a bubble at that gate's output:
recompute that one term with the bubble and keep everything else. A network of mechanical switches is
logic too: current flows along a path only if every switch on it is closed (AND), and the lamp lights if
any path conducts (OR). Both kinds of question reduce to the algebra you already have.
:::

:::definition{#wrong-gate term="Wrong-gate puzzles" depth="quick"}
If an AND gate is replaced by a NAND by mistake, its output is complemented. Recompute each affected
term and simplify. A frequent building block:
$$
\text{NAND}(\text{NAND}(a, b), c) = \big((ab)' c\big)' = ab + c' ,
$$
and a single faulty gate on a two-literal term gives $\text{NAND}(a, d) = a' + d'$.
:::

:::definition{#switch-networks term="Switch (contact) networks" depth="quick"}
A switch that is closed when its variable is 1 is a contact. **Series** contacts compute AND,
**parallel** contacts compute OR. For a network with crossing paths (a bridge), the output is the OR,
over every simple path from input to output, of the AND of the contacts on that path. A path that
contains both $x$ and $x'$ can never conduct and is dropped.
:::

:::definition{#staircase term="The staircase (two-way switch) circuit" depth="quick"}
A two-way switch connects its pivot $a$ to terminal $b$ (ON, 1) or to terminal $c$ (OFF, 0). Two such
switches with $b$ wired to $b$ and $c$ to $c$ close the loop exactly when both are in the same position:
$L = S_1 S_2 + S_1' S_2' = S_1 \odot S_2$. Crossing the wires ($b$ to $c$) gives $S_1 \oplus S_2$.
Either way, flipping either switch toggles the lamp, which is the whole point of a staircase light.
:::

:::viz{#stair-viz spec="staircase-switch" mode="animate" depth="standard"}
:::

### Worked examples: wrong gates and switches

::::example{#ex-wg-one level="easy" title="Both ANDs fabricated as NANDs" depth="quick"}
$F = (ab)c$ is built from two 2-input AND gates. Both are fabricated as NAND gates. What is computed?

:::step{why="The first gate now outputs (ab)′."}
$G_1 = (ab)'$.
:::

:::step{why="The second gate NANDs G₁ with c: (G₁c)′ = G₁′ + c′."}
$F = ab + c'$.
:::

:::answer
$ab + c'$ instead of $abc$.
:::
::::

::::example{#ex-wg-stair level="medium" title="Staircase switches" depth="standard"}
Two two-way switches have their $b$ terminals joined and their $c$ terminals joined, with the lamp and
battery between the two pivots. For which positions is the lamp on?

:::step{why="Current must go from one pivot to the other along a joining wire."}
Through the $b$ wire: both switches ON. Through the $c$ wire: both OFF.
:::

:::step{why="No other path exists: a pivot touches only one terminal at a time."}
Lamp on iff $S_1 = S_2$.
:::

:::answer
$L = S_1 \odot S_2$ (XNOR).
:::
::::

::::example{#ex-wg-four level="gate" title="A sum of products with every AND replaced by NAND" depth="standard"}
$F = (ab)c + (bd)a'$ is to be built from 2-input AND and OR gates, but every 2-input AND is fabricated as
a 2-input NAND (the OR gates are fine). What function results?

:::step{why="Each three-literal product uses two cascaded ANDs, which become NAND(NAND(x, y), z) = xy + z′."}
$(ab)c \to ab + c'$, and $(bd)a' \to bd + (a')' = bd + a$.
:::

:::step{why="The OR gates combine the faulty terms."}
$F = ab + c' + bd + a$.
:::

:::step{why="Simplify: ab is absorbed by a."}
$F = a + bd + c'$.
:::

:::answer
$F = a + bd + c'$ instead of $abc + a'bd$.
:::
::::

::::example{#ex-wg-xx level="gate" title="Edge case: a path through x and x′" depth="standard"}
A contact $x$ is in series with a parallel pair of contacts $x'$ and $y$. What does the network compute?

:::step{why="Series is AND, parallel is OR."}
$f = x(x' + y)$.
:::

:::step{why="The path through x and x′ can never conduct: xx′ = 0."}
$f = xx' + xy = xy$.
:::

:::answer
$f = xy$: the $x'$ contact is useless in this position.
:::
::::

## Propagation delay and timing

:::intuition{#timing-intuition title="News travels at a finite speed" depth="standard"}
When an input changes, the news does not reach the output at once: each gate passes it on after a short
delay. If the news travels along two paths of different lengths and the paths meet again at a gate,
that gate briefly sees the new value on one input and the old value on the other. For that moment it
can compute something the truth table never allows: a short wrong pulse, a glitch. Timing questions are
about exactly these moments.
:::

So far gates were instantaneous. Real gates are not, and GATE asks about the consequences.

:::definition{#prop-delay term="Propagation delay" depth="quick"}
The **propagation delay** $t_{pd}$ of a gate is the time between an input change and the resulting
output change. (Datasheets distinguish the low-to-high and high-to-low delays; GATE questions give one
number per gate.) A **buffer** is often used as a pure delay element. Wires are usually taken to have
zero delay.
:::

:::definition{#critical-path term="Critical path" depth="quick"}
The delay of a combinational circuit is the largest sum of gate delays along any path from an input to
the output: the **critical path**. With equal gate delays, it is the number of gate levels times the
delay. Until that time has passed after an input change, the output may still be changing.
:::

:::definition{#timing-method term="Method: drawing a timing diagram" depth="quick"}
1. List the **event times** at which some input changes; add each gate's delay to get the times at
   which its output may change.
2. Between consecutive event times every signal is constant. In each interval, evaluate each gate from
   the values of its inputs *one delay earlier* ($y(t) = g(x(t - d))$).
3. Count transitions, measure pulse widths, or read the final value from the resulting waveforms.

This method assumes **transport delay**: every pulse, however short, passes through a gate unchanged,
only shifted. Real gates have **inertial delay** and swallow pulses shorter than their own delay; GATE
questions use the transport model unless they say otherwise.
:::

### Glitches

:::definition{#glitch term="Glitches (static hazards) from unequal path delays" depth="quick"}
Take $Y = X \cdot X'$, built as an AND of $X$ and an inverted copy of $X$. Logically $Y = 0$. But the
inverter is slow by $d$:
- when **$X$ rises**, for a time $d$ the AND sees the new $X = 1$ and the old $X' = 1$, so $Y$ pulses to
  **1** for a time $d$ (a **glitch**, a static-0 hazard);
- when **$X$ falls**, the AND sees $X = 0$ at once, so $Y$ stays 0.

Dually, $X + X'$ (logically 1) dips to **0** for a time $d$ when $X$ **falls** (a static-1 hazard).
Chapter 3 shows how to remove such hazards from real circuits with the consensus term.
:::

:::viz{#glitch-viz spec="glitch-timing" mode="animate" depth="standard"}
:::

:::trap{#trap-glitch-edge title="The X·X′ glitch is on the rising edge only" depth="quick"}
For $X \cdot X'$, the pulse to 1 happens after $X$ goes from 0 to 1, because only then are both AND inputs
briefly 1. After a falling edge both inputs are briefly 0, and the AND stays at 0. Options that claim a
transient on both edges, or a transient 0 after the falling edge, are wrong for this circuit.
:::

:::trap{#trap-steady-state title="Logically constant does not mean physically constant" depth="quick"}
"$Y = X \cdot X'$, so $Y$ is always 0" is true **with zero delays**. With real delays the same circuit
produces a pulse. GATE questions that say "the gates may have propagation delays" are asking about the
transient, not the Boolean function.
:::

:::definition{#xor-edge-detector term="Edge detectors and pulse generators" depth="quick"}
$P = A \oplus A(t - \delta)$, an XOR of a signal with a copy delayed by $\delta$, is 1 exactly while the
two differ: for a time $\delta$ after **every** edge of $A$. So it turns each edge into a pulse of width
$\delta$ (provided successive edges of $A$ are more than $\delta$ apart). Feeding $P$ into a second stage
$B = P \oplus P(t - \delta_2)$ turns each pulse into two pulses of width $\min(\delta, \delta_2)$, except
when $\delta_2 = \delta$: the two pulses then touch and merge into a single pulse of width $2\delta$ (2
transitions instead of 4), a variant an examiner can exploit. Counting the transitions of such circuits
is a standard timing question.
:::

:::viz{#xordelay-viz spec="xor-delay-timing" mode="animate" depth="standard"}
:::

:::aside{#ring-oscillator title="Ring oscillators: delay with feedback" depth="deep"}
Connect an odd number $N$ of inverters in a ring. No stable state exists, so the ring oscillates; each
half-period takes the signal once around the ring, so the period is $2N t_{pd}$ and the frequency is
$f = 1 / (2N t_{pd})$. With an even number of inverters the ring is stable instead: that is the seed of
the latch in Chapter 6. (Feedback makes a circuit sequential; everything in this chapter assumed none.)
:::

### Worked examples: timing

::::example{#ex-tm-path level="easy" title="The delay of a three-level circuit" depth="quick"}
A circuit has three levels of gates. The gates on the longest path have delays 2 ns, 3 ns and 2 ns; a
shorter path has a single 4 ns gate. How long after an input change is the output certainly settled?

:::step{why="The output settles only when the slowest path has finished."}
Longest path: $2 + 3 + 2 = 7$ ns; the other path takes 4 ns.
:::

:::step{why="Before 7 ns the slow path may still be changing the output, even though the fast path settled at 4 ns."}
The circuit delay is the maximum over paths, $\max(7, 4) = 7$ ns, not the sum $7 + 4$.
:::

:::answer
7 ns (the critical path).
:::
::::

::::example{#ex-tm-glitch level="medium" title="The width of a glitch" depth="standard"}
$Y = X \cdot X'$ with an inverter of delay 3 ns and an AND gate of delay 0. $X$ rises at $t = 10$ ns. Describe $Y$.

:::step{why="The inverter output keeps its old value 1 until t = 13."}
On $[10, 13)$ both AND inputs are 1.
:::

:::step{why="After t = 13, X′ = 0 and the AND returns to 0."}
$Y = 1$ on $[10, 13)$, otherwise 0.
:::

:::answer
A single 1-pulse of width 3 ns starting at 10 ns (with an AND delay $d_A$, the same pulse shifted by $d_A$).
:::
::::

::::example{#ex-tm-xor level="gate" title="Transitions of a two-stage XOR edge detector" depth="standard"}
$P = A \oplus A(t - 1)$ and $B = P \oplus P(t - 3)$ (times in ns; XOR gates and wires ideal, everything 0
before $t = 0$). $A$ rises at $t = 1$ and stays 1. How many transitions does $B$ make in $[0, 8]$?

:::step{why="The first stage turns the single edge of A into a pulse of width 1."}
$P = 1$ on $[1, 2)$.
:::

:::step{why="The delayed copy of P is the same pulse shifted by 3."}
$P(t - 3) = 1$ on $[4, 5)$.
:::

:::step{why="B is 1 where exactly one of the two is 1; they never overlap."}
$B = 1$ on $[1, 2)$ and $[4, 5)$.
:::

:::answer
4 transitions (at 1, 2, 4 and 5 ns).
:::
::::

::::example{#ex-tm-or level="gate" title="Edge case: X + X′ and the falling edge" depth="standard"}
$Y = X + X'$ with a slow inverter (delay $d$). On which edge of $X$ does $Y$ glitch, and to which value?

:::step{why="On a rising edge X becomes 1 at once, so the OR is 1 throughout."}
Rising edge: no glitch.
:::

:::step{why="On a falling edge X becomes 0 at once, but X′ is still the old 0 for a time d."}
Falling edge: both OR inputs are 0 for a time $d$, so $Y$ dips to 0.
:::

:::answer
A 0-glitch of width $d$ after the falling edge (the dual of the $X \cdot X'$ case).
:::
::::

:::note{#recap-timing title="Recap" depth="quick"}
Circuit delay = the critical path. With a slow inverter, $X \cdot X'$ pulses to 1 after a rising edge and
$X + X'$ dips to 0 after a falling edge. $A \oplus A(t - \delta)$ makes a $\delta$-wide pulse at every edge.
:::

## GATE questions on this lesson

All sixteen previous-year questions, from plain circuits to timing. The 2010 question's stored key was
wrong; the solution reads the paper's figure and shows why the answer is $(Q + R)'$.

:::pyq{id="cse-2020-cs-28" tests="analysis-method" depth="standard"}
:::

:::pyq{id="cse-1993-ii-a-6-1" tests="analysis-method,nand-nor-circuits" depth="standard"}
:::

:::pyq{id="cse-1994-a-8" tests="nand-nor-circuits,trick-nand-pairs" depth="standard"}
:::

:::pyq{id="cse-2010-cs-31" tests="nand-nor-circuits,analysis-method" depth="standard"}
:::

:::pyq{id="cse-2005-cs-15" tests="redundancy,nand-nor-circuits" depth="standard"}
:::

:::pyq{id="cse-2011-cs-13" tests="xor-circuits,analysis-method" depth="standard"}
:::

:::pyq{id="cse-2025-2-cs-21" tests="analysis-method,redundancy" depth="standard"}
:::

:::pyq{id="cse-1997-a-40" tests="block-equations,solve-block" depth="standard"}
:::

:::pyq{id="cse-2008-cs-8" tests="block-equations,solve-block" depth="standard"}
:::

:::pyq{id="cse-2002-a-26" tests="block-equations,nand-nor-circuits" depth="standard"}
:::

:::pyq{id="cse-2019-cs-30" tests="xor-block,block-equations" depth="standard"}
:::

:::pyq{id="cse-2024-2-cs-40" tests="block-equations,xor-block" depth="standard"}
:::

:::pyq{id="it-2007-cs-38" tests="wrong-gate" depth="standard"}
:::

:::pyq{id="it-2005-cs-10" tests="staircase,switch-networks" depth="standard"}
:::

:::pyq{id="cse-2003-cs-47" tests="xor-edge-detector,timing-method" depth="standard"}
:::

:::pyq{id="cse-2024-1-cs-18" tests="glitch,trap-glitch-edge" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need
care.

:::practice{id="nx-dl-02-06-q01" depth="standard"}
:::

:::practice{id="nx-dl-02-06-q02" depth="standard"}
:::

:::practice{id="nx-dl-02-06-q03" depth="standard"}
:::

:::practice{id="nx-dl-02-06-q04" depth="standard"}
:::

:::practice{id="nx-dl-02-06-q05" depth="standard"}
:::

:::practice{id="nx-dl-02-06-q06" depth="standard"}
:::

:::practice{id="nx-dl-02-06-q07" depth="standard"}
:::

:::practice{id="nx-dl-02-06-q08" depth="standard"}
:::

:::practice{id="nx-dl-02-06-q09" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Circuit analysis and timing on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Method | label every gate, write each in terms of its inputs, substitute, simplify; or tabulate |
| NAND/NOR levels | NAND of NANDs = OR of ANDs; NOR of NORs = AND of ORs; tied inputs = NOT |
| XNOR in disguise | $(A \oplus B)'$, $A' \oplus B$, $A \oplus B'$, $(A' \oplus B')'$ |
| Redundant input | the two cofactors are equal; usually absorption removes it |
| Function blocks | AND ∩, OR ∪, XOR △ on Σ lists |
| Unknown OR block | $f = g + h$: need $g \subseteq f$; then $f \setminus g \subseteq h \subseteq f$ |
| Unknown XOR block | $h = f \oplus g$ (unique) |
| Wrong gate | NAND(NAND($a, b$), $c$) $= ab + c'$ |
| Switches | series AND, parallel OR, OR over paths; staircase $= S_1 \odot S_2$ |
| Delay | critical path = longest sum of gate delays |
| Glitches | $X \cdot X'$: 1-pulse after rising edge; $X + X'$: 0-dip after falling edge; width = inverter delay |
| Edge detector | $A \oplus A(t - \delta)$: a $\delta$-wide pulse at every edge |
:::

:::note{#further-depth title="Further depth: hazards and how to remove them" depth="deep"}
The glitch of $X \cdot X'$ is the simplest **static hazard**: an output that should stay constant briefly
changes because two paths from one input have different delays. In a two-level SOP circuit the same thing
happens between two product terms that "hand over" a 1 when one variable changes (for $AB + A'C$, at
$B = C = 1$ when $A$ changes). Adding the consensus term $BC$ keeps the output at 1 during the hand-over;
Chapter 3's lesson on implementation makes this a design rule.
:::
