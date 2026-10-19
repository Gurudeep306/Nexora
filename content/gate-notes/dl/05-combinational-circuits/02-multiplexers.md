---
id: multiplexers
subject: dl
chapter: combinational-circuits
title: "Multiplexers and function realisation"
order: 2
prerequisites: [combinational-design, boolean-laws]
pyq_topics: [dl/combinational]
est_minutes: 60
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every MUX output, residue, tree count, cascade and practice answer is checked by enumeration in content/gate-notes/_checks/dl/l5_02_mux.py (comblib netlists with MUX nodes and enables)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 64–72, set B pp. 119–122 and 166–167, set C pp. 296–308, set D p. 400, set E pp. 407–408. Their MUX slips are recorded in _errata/dl.md."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (multiplexers, function implementation, enables, expansion); C. E. Shannon (1949), for the expansion behind the implementation table."
  - "PYQs: src/gate/questions.json (19 dl/combinational questions, 1996–2024); every circuit is modelled as a comblib netlist and every key re-derived in l5_02_mux.py."
updated: "2026-10-19"
---

A **multiplexer** (MUX) is a switch controlled by numbers: several data wires come in, one wire goes
out, and a small binary number on the **select lines** decides which input is connected to the
output. That is all it does, and yet it is the most examined block in GATE's combinational
questions. The reason is that a switch which picks "input number $s$" is secretly a lookup table: put
the right constants or variables on its data lines and it computes any Boolean function you like. This
lesson builds the MUX from its equation, learns to read any MUX circuit (single, enabled, cascaded),
then turns the idea around and uses a MUX to **implement** functions with the implementation table,
builds big MUXes out of small ones, shows that a 2:1 MUX on its own is a complete set of gates, and
ends with the places where real hardware uses MUXes.

## Where this fits

[Lesson 1](lesson:combinational-design) gave the design procedure: specification, truth table,
minimal expression, circuit. A MUX short-cuts that procedure, because the truth table itself can be
wired onto it without minimising anything. The algebra underneath is **Shannon's expansion** from
[Chapter 2, Lesson 2](lesson:boolean-laws): a MUX is that expansion made of wires. The MUX also
appeared in [Chapter 2, Lesson 5](lesson:universal-gates) as a functionally complete block; here we
prove it again in the form GATE asks about and add the cascades. [Lesson 3](lesson:decoders-encoders)
meets the MUX's mirror image, the demultiplexer. The same MUXes later select registers and ALU results in a datapath (the
register-select questions below), and the carry-select adder of Chapter 4 (arithmetic circuits) is a
MUX choosing between two precomputed sums.

:::table{#radar title="GATE radar: multiplexers" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 19 (1996–2024), the biggest single topic of the chapter |
| Marks | 6 one-mark, 12 two-mark, 1 descriptive (5 marks) |
| Pattern 1 | Read a single MUX: data inputs are variables, complements or constants (1996, 2010, 2014 set 1) |
| Pattern 2 | Read a cascade of 2:1 MUXes, including a MUX output driving a select line (2001, 2006, 2016, 2024, IT 2005, IT 2007) |
| Pattern 3 | Enable inputs that share a variable with the selects (2002) |
| Pattern 4 | Implement a function: choose the data inputs or the selects (2004, 2021, 2023, IT 2006, 1996 descriptive) |
| Pattern 5 | Sizing: select lines (1998, 2020) and the smallest MUX for any $n$-variable function (2007) |
| Pattern 6 | Recognise the block from a description, "if $x$ then $a$ else $b$" (2014 set 3) |
| What examiners test | Which select line is the MSB, that a disabled MUX outputs 0, that a residue $x'$ needs an inverter, that MUX trees round up at every level, and the exact gate a constant cascade makes |
:::

## What a multiplexer does

:::intuition{#mux-intuition title="A railway junction" depth="standard"}
Picture four railway tracks merging into one line that leads to a station. A signal-box lever has four
positions, numbered 0 to 3. Whatever position the lever is in, exactly one track is connected through
to the station and the other three are blocked. Trains (bits) waiting on the blocked tracks simply do
not get through. The lever does not care what the trains carry; it only decides **which** track is
connected.

Now the lever is not turned by hand but by two binary signals, read together as a 2-bit number: 00
means track 0, 01 track 1, 10 track 2, 11 track 3. That is a **4-to-1 multiplexer**. The tracks are the
**data inputs** $I_0, \dots, I_3$, the lever is the pair of **select lines** $S_1 S_0$, and the station is
the output $Y$. Everything in this lesson follows from one sentence: *the output equals the data input
whose number is written on the select lines.*
:::

:::definition{#mux-def term="Multiplexer (2ⁿ:1 MUX)" depth="standard"}
A **$2^n$:1 multiplexer** has $2^n$ data inputs $I_0, \dots, I_{2^n - 1}$, $n$ select lines
$S_{n-1}, \dots, S_1, S_0$ and one output $Y$. The select lines are read as an $n$-bit binary number
with **$S_{n-1}$ the most significant bit** and $S_0$ the least significant:
$$
Y = I_s, \qquad s = (S_{n-1} \dots S_1 S_0)_2 .
$$
So a 4:1 MUX with $S_1 S_0 = 10$ passes $I_2$, and an 8:1 MUX with $S_2 S_1 S_0 = 011$ passes $I_3$. Names
in use: "$2^n$-to-1", "$2^n \times 1$", "$2^n$-line to 1-line", "data selector". A 2:1 MUX has one select
line $S$: $Y = I_0$ when $S = 0$ and $Y = I_1$ when $S = 1$.

**Reading a figure.** In a drawing, the data inputs are numbered on the MUX body (0, 1, 2, …) and the
select lines are labelled $S_1$, $S_0$ (or $A_1$, $A_0$, or simply "s"). The labels, not the position on
the page, decide which line is the MSB. Some figures instead write "control signal 1 selects the upper
input"; then that sentence is the definition and you follow it.
:::

:::theorem{#mux-equation name="The MUX equation" depth="standard"}
A $2^n$:1 MUX computes
$$
Y = \sum_{i=0}^{2^n - 1} m_i(S_{n-1}, \dots, S_0)\, I_i ,
$$
where $m_i$ is the $i$-th minterm of the select variables. For a 2:1 MUX, $Y = S' I_0 + S I_1$; for a 4:1 MUX,
$$
Y = S_1' S_0' I_0 + S_1' S_0 I_1 + S_1 S_0' I_2 + S_1 S_0 I_3 .
$$
:::

:::proof{#proof-mux-equation of="the MUX equation" depth="standard"}
**Idea first:** for any setting of the selects, exactly one minterm of the selects is 1, and it is the
one whose number is the setting; that minterm lets its data input through and every other term is 0.

Fix the select lines at the value $s$. A minterm $m_i(S)$ is 1 exactly when the select lines spell the
number $i$, so $m_s(S) = 1$ and $m_i(S) = 0$ for every $i \ne s$. The sum becomes
$0 \cdot I_0 + \dots + 1 \cdot I_s + \dots + 0 = I_s$, which is the definition of the MUX. Since this holds for
every one of the $2^n$ select values, the equation and the definition agree on every input row. (This is
also how the MUX is built: one AND gate per term, then an OR gate; see below.)
:::

:::viz{#mux-routing-viz spec="mux-routing" mode="animate" depth="standard"}
:::

:::table{#mux-truth-table title="The 2:1 MUX as a full truth table" depth="standard"}
A 2:1 MUX is a 3-input function $Y(S, I_1, I_0) = S'I_0 + SI_1$. Its eight rows show the rule "the select
decides which column is copied":

| $S$ | $I_1$ | $I_0$ | $Y$ | copied from |
|:--|:--|:--|:--|:--|
| 0 | 0 | 0 | 0 | $I_0$ |
| 0 | 0 | 1 | 1 | $I_0$ |
| 0 | 1 | 0 | 0 | $I_0$ |
| 0 | 1 | 1 | 1 | $I_0$ |
| 1 | 0 | 0 | 0 | $I_1$ |
| 1 | 0 | 1 | 0 | $I_1$ |
| 1 | 1 | 0 | 1 | $I_1$ |
| 1 | 1 | 1 | 1 | $I_1$ |

In the top half the output column equals the $I_0$ column; in the bottom half it equals the $I_1$ column.
The compressed form most books print is just two lines: $S = 0 \Rightarrow Y = I_0$, $S = 1 \Rightarrow Y = I_1$.
:::

:::trap{#trap-mux-table-row title="Copy the selected input, not the other one" depth="quick"}
When a table lists $(S, I_1, I_0)$ in that order, it is easy to copy the wrong column. Row
$(S, I_1, I_0) = (0, 0, 1)$ has $S = 0$, so $Y = I_0 = 1$, not 0; some printed tables get exactly this row wrong.
Before trusting a printed MUX table, check one row with $S = 0$ and $I_0 \ne I_1$.
:::

:::intuition{#gate-level-intuition title="One gatekeeper per track" depth="standard"}
Back at the junction, give every track its own gatekeeper. Each gatekeeper looks at the lever and opens
the gate only when the lever points at **that** track; a closed gate passes nothing (a 0). Behind the
gates the tracks merge into one line, and since at most one gate is open, the line carries exactly that
track's train. A gatekeeper is an AND gate (lever position AND data bit), and the merge is an OR gate. That
is all the hardware inside a MUX: one AND per data input, one OR, and a few inverters so that each
gatekeeper can recognise its own lever position.
:::

:::definition{#mux-gate-level term="Inside the box: the gate-level MUX" depth="standard"}
The equation is already a two-level circuit. A $2^n$:1 MUX built from gates has:

- $n$ inverters, to make $S_i'$ for every select line;
- $2^n$ AND gates with $n + 1$ inputs each (one minterm of the selects and one data input);
- one OR gate with $2^n$ inputs.

A 2:1 MUX is 1 inverter, 2 two-input ANDs and 1 OR; a 4:1 MUX is 2 inverters, 4 three-input ANDs and one
4-input OR. Built as NAND–NAND (Chapter 3, Lesson 4), the AND–OR part becomes $2^n + 1$ NAND gates, so a
$2^n$:1 MUX costs $2^n + n + 1$ gates when NAND gates may have as many inputs as needed: 7 for a 4:1 MUX.
With only 2-input gates the count is larger, because each wide AND and the wide OR must be split.
:::

:::derivation{#select-lines of="the number of select lines" depth="standard"}
A MUX with $k$ select lines can name $2^k$ different inputs, one per binary number of $k$ bits. To choose
among $N$ sources we need $2^k \ge N$, so the fewest select lines is
$$
k = \lceil \log_2 N \rceil .
$$
If $N$ is not a power of 2, the MUX has $2^k > N$ inputs and the extra ones are left unused (tied to 0).

**Sanity check.** $N = 2$: $k = 1$, the 2:1 MUX. $N = 32$: $\log_2 32 = 5$ exactly, so 5 lines. $N = 33$:
$\log_2 33 \approx 5.04$, so 6 lines (5 lines name only 32 inputs). $N = 1$: no choice to make, $k = 0$. Read the
other way, a MUX with $k$ select lines is a $2^k$:1 MUX: 3 select lines make an 8:1 MUX, 4 make a 16:1.
:::

:::trap{#trap-select-count title="4 select lines is a 16:1 MUX, not a 4:1 MUX" depth="standard"}
The number of select lines is the **logarithm** of the number of inputs, not the number itself. A "4-bit
data select input" names $2^4 = 16$ inputs: a 16:1 MUX. Examiners put "4:1" among the options because the
digit 4 is in the question; a 4:1 MUX has only 2 select lines. The reverse slip is just as common: 32
registers need $\lceil \log_2 32 \rceil = 5$ select lines, not 32 and not 16.
:::

:::intuition{#enable-intuition title="The junction's master gate" depth="standard"}
Add one more control to the railway junction: a **master gate** between the merge point and the station.
With the master gate open, the junction works as before. With it shut, no train reaches the station,
whatever the lever says and whatever waits on the tracks. The station then sees "nothing arriving", and
on a logic wire "nothing" is a 0. That master gate is the enable input. It matters in two ways: in a
circuit where a variable drives the enable, every row that shuts the gate is a 0 of the function; and two
junctions with master gates can share one station, because only the open one ever sends a train.
:::

:::definition{#mux-enable term="The enable input" depth="standard"}
Many MUXes have an **enable** input $E$ (also called strobe or EN). When the MUX is enabled it works
normally; when it is **disabled its output is forced to 0**, whatever the data and select lines say:
$$
Y = E \cdot \sum_i m_i(S)\, I_i = E\,(S_1'S_0' I_0 + S_1'S_0 I_1 + S_1 S_0' I_2 + S_1 S_0 I_3).
$$
In gates, $E$ is one more input on every AND gate. An **active-low** enable, drawn with a bubble and
written $\overline{E}$ or $\overline{EN}$, enables the MUX when it is **0**: if the pin is driven by a signal
$G$, then $Y = G' \cdot \sum_i m_i(S)\, I_i$, so the complement of the wire's value multiplies the sum. Enables let several MUXes share an output (only
the enabled one contributes) and let two small MUXes and an OR gate act as one bigger MUX.

**Why 0 and not "nothing".** A disabled gate-level MUX has every AND gate held at 0, so the OR gate
outputs 0. (A MUX with a **three-state** output instead disconnects, "high impedance"; GATE's MUX
questions use the ordinary output, and a three-state output is always said explicitly.)
:::

:::viz{#mux-enable-expand-viz spec="mux-enable-expand" mode="animate" depth="standard"}
:::

The animation builds an 8:1 MUX from two 4:1 MUXes that share the select lines $S_1 S_0$. The upper MUX
holds $I_0 \dots I_3$ and is enabled by $S_2'$; the lower one holds $I_4 \dots I_7$ and is enabled by $S_2$; an OR
gate joins their outputs. For each value of $S_2$ exactly one MUX is enabled, and the disabled one outputs
0, so the OR passes the enabled MUX's choice: $S_2$ picks the half, $S_1 S_0$ the input within it. Watch the
disabled MUX's output sit at 0 whatever its data inputs hold; if a disabled MUX output 1 instead, the OR
would be stuck at 1. The worked example below traces one select value through this circuit.

:::trap{#trap-enable title="A disabled row is 0, not a don't-care" depth="standard"}
When the enable is driven by one of the variables, half of the rows switch the MUX off. Those rows are
**0s of the function**, not don't-cares and not "whatever the selected data input is". The wrong answers
examiners plant come from forgetting the enable (reading only the data inputs) or from treating the
disabled rows as free. In GATE 2002 the enable is $z'$, so every row with $z = 1$ gives 0. With $z = 0$ the
select bit $A_0 = z$ is 0, so only $I_0$ and $I_2$ can be chosen, and $I_2 = y$ is chosen only when $y = 0$
(the other select bit is $A_1 = y'$), which makes it 0. Only $I_0 = x$, chosen when $y = 1$, can give a 1:
$f = xy\overline{z}$. Also check the polarity: a bubble on the enable pin flips which rows are switched off.
:::

### Worked examples: the MUX, its selects and its enable

::::example{#ex-basic-easy level="easy" title="Data 0, 1, 1, 0 on a 4:1 MUX" depth="quick"}
A 4:1 MUX has $S_1 = A$, $S_0 = B$ and data $(I_0, I_1, I_2, I_3) = (0, 1, 1, 0)$. What is $Y$ for $AB = 10$, and what
function of $A, B$ is $Y$?

:::step{why="The selects read 10 in binary, which is 2, so the MUX passes I2."}
$AB = 10 \Rightarrow Y = I_2 = 1$.
:::

:::step{why="The MUX equation with constants on the data lines keeps only the select minterms whose data input is 1."}
$Y = A'B' \cdot 0 + A'B \cdot 1 + AB' \cdot 1 + AB \cdot 0 = A'B + AB'$.
:::

:::answer
$Y = 1$ for $AB = 10$, and $Y = A \oplus B$. Constants on the data lines are the truth table of the function of
the selects; this is the animation above.
:::
::::

::::example{#ex-basic-medium level="medium" title="Which input passes, and what if the selects are swapped?" depth="standard"}
An 8:1 MUX has $S_2 = A$, $S_1 = B$, $S_0 = C$. Which data input reaches the output for $ABC = 110$? If a wiring
mistake swaps the wires on $S_2$ and $S_0$, which input passes for the same $ABC$?

:::step{why="S2 is the MSB, so the selects spell ABC = 110 = 6."}
Correct wiring: $I_6$.
:::

:::step{why="After the swap S2 = C = 0, S1 = B = 1, S0 = A = 1, so the selects spell 011."}
Swapped wiring: $011_2 = 3$, so $I_3$.
:::

:::answer
$I_6$ when wired correctly, $I_3$ after the swap. The same three variable values name a different input
when the select order changes; this is the select-order trap of the implementation section in its
simplest form.
:::
::::

::::example{#ex-basic-gate level="gate" title="An 8:1 MUX from two enabled 4:1 MUXes and an OR" depth="standard"}
MUX A and MUX B are 4:1 MUXes sharing $S_1 S_0$. MUX A has $I_0 \dots I_3$ on its data lines and an active-high enable
driven by $S_2'$; MUX B has $I_4 \dots I_7$ and an active-high enable driven by $S_2$. An OR gate combines their
outputs. What does the circuit output for $S_2 S_1 S_0 = 101$, and why is it an 8:1 MUX?

:::step{why="S2 = 1 disables MUX A (its enable sees S2′ = 0), so MUX A outputs 0 whatever its inputs are."}
MUX A: 0.
:::

:::step{why="MUX B is enabled and its selects S1S0 = 01 pick its input number 1, which is I5."}
MUX B: $I_5$. The OR gives $0 + I_5 = I_5$.
:::

:::step{why="In general exactly one of the two MUXes is enabled, and the disabled one contributes 0 to the OR."}
$Y = S_2'(\text{MUX A}) + S_2(\text{MUX B}) = \sum_{i=0}^{7} m_i(S_2, S_1, S_0)\, I_i$.
:::

:::answer
$Y = I_5 = I_{(101)_2}$; the circuit is an 8:1 MUX with $S_2$ as the MSB. It works only because a disabled MUX
outputs 0: if it output 1, the OR would always be 1.
:::
::::

::::example{#ex-basic-edge level="gate" title="Edge case: a 6:1 MUX" depth="standard"}
How many select lines does a 6:1 MUX need, and what does it output when the selects read 111?

:::step{why="Two lines name only 4 inputs, three name 8, so the next power of 2 decides."}
$\lceil \log_2 6 \rceil = 3$ select lines.
:::

:::step{why="It is built as an 8:1 MUX with I6 and I7 unused; unused inputs are tied to 0 so that an invalid select gives a defined output."}
Selects 110 and 111 choose the tied inputs: output 0.
:::

:::answer
3 select lines; select 111 (and 110) outputs 0, assuming the unused inputs are grounded. The sizing
rule is a ceiling, never a rounding: $\log_2 6 \approx 2.58$ still needs 3 lines.
:::
::::

:::note{#recap-mux-basics title="Recap" depth="quick"}
A $2^n$:1 MUX passes $I_s$ where $s$ is the number on the selects ($S_{n-1}$ = MSB); $Y = \sum m_i(S) I_i$.
Select lines $= \lceil \log_2 N \rceil$. A disabled MUX outputs 0, so enable-off rows are 0s of $f$.
:::

## Reading MUX circuits

:::intuition{#reading-intuition title="Ask the selects first" depth="standard"}
Faced with a MUX circuit, do not start writing the full equation. Ask the select lines a question
instead: "which data input are you choosing right now?" For each setting of the selects the answer is
one wire, and that wire carries something simple: a constant, a variable, a complement. The function
is then a short list of cases: "when $A = 0, B = 0$ the output is $C$; when $A = 0, B = 1$ it is $C'$; …".
Writing those cases back as one expression is the MUX equation; reading them off a truth table is even
quicker.
:::

:::definition{#mux-analysis term="Method: reading a MUX circuit" depth="standard"}
1. **Name every data input as a function** of the circuit's variables (a constant, a variable, a
   complement, or the output of an earlier block).
2. **Fix the select order**: which variable drives $S_1$ (the MSB) and which drives $S_0$.
3. **Write the MUX equation** $Y = \sum m_i(S) I_i$, or equivalently **case-split**: one row of a small
   table per select value, with the chosen input in the output column.
4. **Expand into minterms** if the options are minimal forms, then minimise (Chapter 3), or compare the
   options by their minterm lists. Two expressions that look different may be the same function, so
   compare functions, not spellings.
5. If there is an **enable**, multiply by it (and check its polarity) before step 4.
:::

:::trick{#trick-case-split title="Case-split on the selects instead of expanding" depth="standard"}
For a 4:1 MUX with $S_1 = A$, $S_0 = B$ and data $I_0 \dots I_3$, the function is $A'B'I_0 + A'BI_1 + AB'I_2 + ABI_3$.
Instead of multiplying out, write a four-line table: $AB = 00 \to I_0$, $01 \to I_1$, $10 \to I_2$,
$11 \to I_3$. Each line covers two rows of the 3-variable truth table (the two values of the remaining
variable), so the table fills itself in: a data input $C$ gives (0, 1) on its two rows, $C'$ gives (1, 0),
1 gives (1, 1) and 0 gives (0, 0).

**Why it works:** this is the MUX equation evaluated one select value at a time; exactly one term is
alive in each case. **When it fails:** when a select line is driven by an expression rather than a
plain variable (a cascade or an inverted select), the cases are no longer the rows of the truth table in
order; then first tabulate the select value for every row, and only then read the chosen input.
:::

:::definition{#mux-cascade term="Cascades: a MUX output driving another MUX" depth="standard"}
GATE likes circuits of two or three 2:1 MUXes in which the output of one MUX feeds another. There are
two kinds of connection, and they are read differently:

- **Into a data input.** The second MUX passes the first MUX's output only for the select value that
  picks that input. Work inside out: write $g$ = output of the first MUX as an expression, then treat
  $g$ as a data input of the second, $Y = S'I_0 + S\,g$ (or the other way round).
- **Into a select line.** The first MUX's output decides which data input the second MUX chooses. Write
  $g$ first, then $Y = g' I_0 + g I_1$. Here $g'$ appears, so De Morgan or a case split on the variables
  inside $g$ is usually the quickest way to simplify.

In both cases the safest check is a truth table: compute $g$ row by row, then $Y$ row by row. With three
variables that is 8 rows, under a minute.
:::

:::viz{#mux-cascade-viz spec="mux-cascade" mode="animate" depth="standard"}
:::

:::intuition{#if-else-intuition title="A fork in the road, decided by a sign" depth="standard"}
A traveller reaches a fork with a sign: "if the bridge is open, take the left road, otherwise the
right". The traveller does not remember earlier signs and does not wait; the moment the sign changes, the
choice changes. A 2:1 MUX is that fork: the condition is the select line, the two roads are the two data
inputs. So whenever a specification or a piece of code reads "if … then this, else that", with both
branches producing a value from the present inputs, the hardware is a MUX.
:::

:::definition{#mux-if-else term="A MUX is an if–then–else" depth="standard"}
A 2:1 MUX with select $x$, $I_1 = a$ and $I_0 = b$ computes
$$
y = x\,a + x'\,b \;=\; \texttt{if } (x = 1)\ y = a\ \texttt{else}\ y = b .
$$
So any specification of the form "if a condition holds, output this, otherwise output that" is a
2:1 MUX, and a `switch` (case) statement on an $n$-bit value is a $2^n$:1 MUX. The condition goes on the
select line, the two (or $2^n$) alternatives go on the data lines, and the output is the variable being
assigned. Nothing is stored: the output changes as soon as $x$, $a$ or $b$ change, so it is
combinational, not a flip-flop. This is also the hardware form of the C expression `x ? a : b`.
:::

:::trap{#trap-input-convention title="Which input does select 1 choose?" depth="standard"}
The usual convention is $Y = S'I_0 + SI_1$, with $I_0$ drawn on top. GATE does not always follow it, and it
always says so when it does not: 2001 defines its MUX by the equation $ac' + bc$ (input $a$ for $c = 0$),
IT 2005 says "control signal 1 selects the upper input", IT 2007 labels the inputs 1 and 0 on the figure.
Read that sentence or those labels **before** anything else and write the MUX's equation in the question's
own letters. Using the textbook convention against the figure's swaps every pair of data inputs and
silently builds a different function, so the option you "verify" is not the circuit on the page.
:::

:::trap{#trap-if-else-ff title="'If' does not mean memory" depth="quick"}
Seeing a piece of code with `if`, students reach for a flip-flop or a latch ("it remembers which branch
was taken"). A flip-flop is needed only when the output must keep a value after its inputs change, for
example "if the clock rises, $y$ = $a$, otherwise $y$ keeps its old value". When **both** branches assign
a value from the current inputs, the block is a MUX.
:::

### Worked examples: reading MUX circuits

::::example{#ex-read-easy level="easy" title="A 4:1 MUX with C, C′, C′, C" depth="quick"}
A 4:1 MUX has $S_1 = A$, $S_0 = B$ and data inputs $I_0 = C$, $I_1 = C'$, $I_2 = C'$, $I_3 = C$. Find $Y$.

:::step{why="The case split turns the MUX into four short statements, one per select value."}
$AB = 00$: $Y = C$. $AB = 01$: $Y = C'$. $AB = 10$: $Y = C'$. $AB = 11$: $Y = C$.
:::

:::step{why="Read the four cases as a rule: Y copies C when A and B are equal and inverts C when they differ, which is what XOR with A ⊕ B does."}
When $A \oplus B = 0$ the output is $C$; when $A \oplus B = 1$ it is $C'$. So $Y = (A \oplus B) \oplus C$.
:::

:::step{why="A second method confirms it: list the rows where Y = 1 and count the 1s in each."}
$Y = 1$ on rows 001, 010, 100, 111: exactly the rows with an odd number of 1s.
:::

:::answer
$Y = A \oplus B \oplus C$, the 3-input XOR (odd parity). Remember the pattern $C, C', C', C$: it is the
XOR column (0, 1, 1, 0) of $A, B$ with $C$ in place of 0 and $C'$ in place of 1.
:::
::::

::::example{#ex-read-medium level="medium" title="A 4:1 MUX with 0, 1, R, R′ to a minimal SOP" depth="standard"}
A 4:1 MUX has $S_1 = P$, $S_0 = Q$ and data $I_0 = 0$, $I_1 = 1$, $I_2 = R$, $I_3 = R'$. Give the minimal
sum of products of its output $F$.

:::step{why="Write the MUX equation with each data input in place; the constant 0 kills its term and the constant 1 leaves just the select minterm."}
$F = P'Q' \cdot 0 + P'Q \cdot 1 + PQ' \cdot R + PQ \cdot R' = P'Q + PQ'R + PQR'$.
:::

:::step{why="List the minterms over (P, Q, R) so that a K-map can be drawn."}
$P'Q$ covers 010 and 011 ($m_2$, $m_3$); $PQ'R$ is $m_5$; $PQR'$ is $m_6$. $F = \Sigma m(2, 3, 5, 6)$.
:::

:::step{why="On the map, m6 is adjacent to m2 (they differ only in P), so the pair QR′ is a bigger loop than the lone minterm PQR′; m5 has no 1-neighbour (m1, m4 and m7 are 0s), so it stays alone."}
Loops: $P'Q$ ($m_2, m_3$), $QR'$ ($m_2, m_6$), $PQ'R$ ($m_5$).
:::

:::answer
$F = P'Q + QR' + PQ'R$ (7 literals). The MUX equation itself, $P'Q + PQ'R + PQR'$, is correct but not
minimal (8 literals). In GATE 2014 two of the wrong options are also equal to $F$ but are not minimal
(11 literals each), and only the looped form (7 literals) is the minimal SOP: check equality **and**
minimality.
:::
::::

::::example{#ex-read-data-cascade level="medium" title="A cascade through a data input" depth="standard"}
MUX 1 (2:1) has select $z$, $I_0 = y$, $I_1 = x'$; its output is $g$. MUX 2 (2:1) has select $y$, $I_0 = x$,
$I_1 = g$; its output is $f$. Find a minimal SOP of $f(x, y, z)$.

:::step{why="Inside out: write the first MUX's equation."}
$g = z'y + zx'$.
:::

:::step{why="The second MUX passes g only when y = 1, so inside that term y = 1 can be substituted into g."}
$f = y'x + y\,g = xy' + y(z' \cdot 1 + zx') = xy' + yz' + x'yz$.
:::

:::step{why="List minterms and loop on a map: xy′ is m4, m5; yz′ is m2, m6; x′yz is m3, which pairs with m2 into x′y."}
$f = \Sigma m(2, 3, 4, 5, 6) = x'y + xy' + yz'$.
:::

:::answer
$f = x'y + xy' + yz' = (x \oplus y) + yz'$ (an equally minimal choice is $x'y + xy' + xz'$). The substitution
"inside the branch where MUX 2 chooses $g$, its select is 1" is what keeps the algebra short. GATE 2006 has
the same shape, but there MUX 1 feeds MUX 2's **input 0**, so you substitute $y = 0$ inside $g$.
:::
::::

::::example{#ex-read-gate level="gate" title="A cascade where a MUX output drives a select line" depth="standard"}
MUX 1 is a 2:1 MUX with select $P$, $I_0 = Q$, $I_1 = R$; its output is $g$. MUX 2 is a 2:1 MUX with select $g$,
$I_0 = 1$, $I_1 = P'$; its output is $X$. Find $X$.

:::step{why="Work inside out: the first MUX is an ordinary 2:1 MUX, so its output is its equation."}
$g = P'Q + PR$.
:::

:::step{why="The second MUX has g on its select line, so its equation contains g′, which is awkward; case-split on P instead, because P also decides what g is."}
If $P = 0$: $g = Q$ and $X = g' \cdot 1 + g \cdot P' = Q' + Q \cdot 1 = 1$.
:::

:::step{why="Same case split for P = 1: now g is R, and the data input P′ is 0."}
If $P = 1$: $g = R$ and $X = R' \cdot 1 + R \cdot 0 = R'$.
:::

:::step{why="Put the two cases back together with Shannon's expansion X = P′X(0) + P·X(1)."}
$X = P' \cdot 1 + P \cdot R' = P' + R'$.
:::

:::answer
$X = P' + R' = \overline{PR}$, a NAND of $P$ and $R$; the variable $Q$ has vanished. A truth table over all
8 rows confirms $X = 0$ only on $PQR = 101$ and $111$. Case-splitting on the variable that controls the
inner select is the move that makes select-driven cascades easy.
:::
::::

::::example{#ex-read-edge level="gate" title="Edge case: the enable and a select share a variable" depth="standard"}
A 4:1 MUX has $S_1 = x$, $S_0 = y$, data $I_0 = z$, $I_1 = 1$, $I_2 = z'$, $I_3 = 1$, and an **active-low** enable
pin $\overline{E}$ driven by $y$. Find $f(x, y, z)$.

:::step{why="The enable is active-low, so the MUX works only when the pin is 0, that is when y = 0; every row with y = 1 outputs 0."}
Enabled iff $y = 0$. So $f = y' \cdot (\text{MUX output})$.
:::

:::step{why="With y = 0 the select value is x0, so only I0 (x = 0) and I2 (x = 1) can ever be chosen; the 1s on I1 and I3 are never seen."}
For $y = 0$: $x = 0 \Rightarrow f = I_0 = z$; $x = 1 \Rightarrow f = I_2 = z'$.
:::

:::step{why="Combine: with y = 0 the output is z when x = 0 and z′ when x = 1, which is x ⊕ z."}
$f = y'(x'z + xz') = y'(x \oplus z) = x'y'z + xy'z'$.
:::

:::answer
$f = y'(x \oplus z)$, minterms 1 and 4 only. The tempting wrong answer ignores the enable and keeps the
constant 1s on $I_1$ and $I_3$, giving $f = y + (x \oplus z)$, which is 1 on six rows. When the enable is
tied to a select variable, half of the data inputs become unreachable.
:::
::::

:::note{#recap-reading title="Recap" depth="quick"}
Name the data inputs, fix $S_1$/$S_0$, then case-split on the selects (or write $\sum m_i I_i$). Cascades:
inside out; when a MUX output drives a select, case-split on the variable inside it. Enables multiply
the whole output, and a 2:1 MUX is exactly if–then–else.
:::

## Implementing functions with a MUX

:::intuition{#implement-intuition title="A MUX is a lookup table with a hole in each slot" depth="standard"}
Put the variables $A$, $B$, $C$ on the three select lines of an 8:1 MUX. Each row of the truth table now
chooses its own data input: row 000 chooses $I_0$, row 101 chooses $I_5$. If you wire $I_5$ to 1 the
function is 1 on row 101; wire it to 0 and it is 0. So copying the truth table's output column onto the
data lines builds any 3-variable function with no gates at all: the MUX has become a lookup table.

Now be thriftier. Use a 4:1 MUX with only $A$, $B$ on the selects. Each data input now serves **two**
rows, $C = 0$ and $C = 1$. On those two rows the function can be 0, 0 (wire a 0), 1, 1 (wire a 1), 0, 1
(wire $C$) or 1, 0 (wire $C'$). Those four cases cover every possibility, so a half-size MUX still does
every function, as long as $C'$ is available. That small observation is the whole method.
:::

:::definition{#mux-implement term="Implementing f on a MUX: the two cases" depth="standard"}
To realise $f$ of $n$ variables on one MUX:

- **$n$ selects** (a $2^n$:1 MUX): put all $n$ variables on the selects and the truth-table column on
  the data inputs (constants only). No gates.
- **$n - 1$ selects** (a $2^{n-1}$:1 MUX): put $n - 1$ variables on the selects; the remaining variable,
  say $x$, is the **residue variable**, and each data input carries a **residue**: one of $0$, $1$, $x$, $x'$.
  At most one inverter (for $x'$).
- **Fewer selects** (a $2^{n-k}$:1 MUX, $k \ge 2$): each data input carries a function of $k$ variables, built
  from gates.
:::

:::definition{#impl-n-select term="n variables on n selects: wire the truth table" depth="standard"}
With $f(A, B, C)$ on an 8:1 MUX ($S_2 = A$, $S_1 = B$, $S_0 = C$), set $I_i = f(m_i)$. The MUX equation
becomes $\sum m_i \, f(m_i)$, which is exactly the canonical SOP of $f$.

A 4:1 MUX therefore makes **any** 2-input gate: put the two inputs on $S_1$, $S_0$ and the gate's
output column on $I_0 \dots I_3$:

| Gate | $I_0\,I_1\,I_2\,I_3$ |
|:--|:--|
| AND | 0 0 0 1 |
| OR | 0 1 1 1 |
| NAND | 1 1 1 0 |
| NOR | 1 0 0 0 |
| XOR | 0 1 1 0 |
| XNOR | 1 0 0 1 |

A buffer or an inverter uses one select only: $S_0 = x$ with $I_0, I_1 = 0, 1$ (buffer) or $1, 0$ (NOT).
:::

:::trap{#trap-xor-xnor title="XOR needs I₁ = I₂ = 1, not I₀ = I₃ = 1" depth="quick"}
The pattern $(I_0, I_1, I_2, I_3) = (1, 0, 0, 1)$ is 1 when the selects are **equal**: that is XNOR,
$AB + A'B'$. XOR is $(0, 1, 1, 0)$, 1 when the selects **differ**. Some notes label $(1, 0, 0, 1)$ as XOR; a
one-row check catches it: at $A = B = 0$, XOR must be 0, so $I_0$ must be 0.
:::

:::definition{#impl-table term="n − 1 selects: the implementation table" depth="standard"}
Choose the select variables (MSB first) and the residue variable $x$. Draw a table with one column per
data input $I_0 \dots I_{2^{n-1}-1}$ and two rows, $x'$ and $x$. Each cell holds the minterm number of the row
with that select value and that value of $x$; **circle** the minterms of $f$. Then read each column:

| Column (row $x'$, row $x$) | Residue on that data input |
|:--|:--|
| neither circled (0, 0) | $0$ |
| both circled (1, 1) | $1$ |
| only the $x$ row circled (0, 1) | $x$ |
| only the $x'$ row circled (1, 0) | $x'$ |

For $f(x, y, z) = \Sigma m(0, 1, 3, 4, 5, 6)$ with $S_1 = y$, $S_0 = z$ (residue $x$):

| | $I_0$ ($yz = 00$) | $I_1$ ($01$) | $I_2$ ($10$) | $I_3$ ($11$) |
|:--|:--|:--|:--|:--|
| $x'$ | **0** | **1** | 2 | **3** |
| $x$ | **4** | **5** | **6** | 7 |
| Residue | 1 | 1 | $x$ | $x'$ |

(bold = circled). So $I_0 = 1$, $I_1 = 1$, $I_2 = x$, $I_3 = x'$. The minterm in row $x$, column $I_j$ is $j + 4$
here because $x$ is the MSB of the minterm number; in general, compute each cell from its bits.
:::

:::trick{#trick-residue-read title="Reading a residue at a glance" depth="standard"}
For each data input, look at the two rows it serves (residue variable 0, then 1) and read the pair
as a tiny truth table of $x$: **same value → that constant; follows $x$ (0, 1) → $x$; opposite of $x$
(1, 0) → $x'$.** No table drawing is needed when the function is given as a truth table: pair up the rows
that differ only in $x$ and read each pair.

**Why it works:** the residue on $I_s$ is the cofactor $f(s, x)$, a function of the single variable $x$, and
the four one-variable functions are exactly $0, 1, x, x'$. **When it fails:** with don't-cares a pair
like (X, 1) can be read as 1 or as $x$; choose whichever saves an inverter. With two residue variables
(fewer selects) the pair becomes a 4-row column and must be minimised as a 2-variable function.
:::

:::theorem{#shannon-mux name="Any n-variable function on a 2ⁿ⁻¹:1 MUX with one inverter" depth="standard"}
For every function $f(x_1, \dots, x_n)$ and every choice of residue variable $x_n$,
$$
f = \sum_{s=0}^{2^{n-1}-1} m_s(x_1, \dots, x_{n-1})\; f\big(s,\, x_n\big),
$$
and each residue $f(s, x_n)$ is one of $0, 1, x_n, x_n'$. So a $2^{n-1}$:1 MUX with $x_1 \dots x_{n-1}$ on the selects,
plus at most one inverter (to make $x_n'$), realises $f$.
:::

:::proof{#proof-shannon-mux of="the MUX realisation theorem" depth="standard"}
**Idea first:** Shannon's expansion applied to the select variables one by one splits $f$ into
$2^{n-1}$ pieces, one per select value, and that split is literally the MUX equation.

Shannon's expansion ([Chapter 2, Lesson 2](lesson:boolean-laws)) gives $f = x_1' f(0, \dots) + x_1 f(1, \dots)$.
Expanding each half on $x_2$, then $x_3$, up to $x_{n-1}$, gives the sum over all $2^{n-1}$ select values $s$ of
the minterm $m_s(x_1, \dots, x_{n-1})$ times the cofactor $f(s, x_n)$, in which every variable except $x_n$ is fixed.
Comparing with the MUX equation $Y = \sum m_s(S) I_s$ term by term, wiring $I_s = f(s, x_n)$ makes $Y = f$.

Each cofactor is a function of one variable, and there are exactly four such functions: $0$, $1$, $x_n$,
$x_n'$ (the column (0, 0), (1, 1), (0, 1) or (1, 0)). The first three are a wire to ground, to the
supply or to $x_n$; only $x_n'$ needs an inverter, and one inverter serves every data input that needs it.
:::

:::theorem{#min-mux-size name="The smallest MUX for every n-variable function" depth="standard"}
If one multiplexer and one inverter (and the constants 0 and 1) are the only hardware, the smallest MUX
that can realise **every** function of $n \ge 2$ variables is the $2^{n-1}$:1 MUX.
:::

:::proof{#proof-min-mux-size of="the minimum MUX size" depth="standard"}
**Idea first:** $2^{n-1}$:1 is enough by the previous theorem; to show nothing smaller works, find one
function whose leftovers are never a single literal: parity.

*Enough.* The theorem above realises any $f$ on a $2^{n-1}$:1 MUX with one inverter.

*Nothing smaller.* Take a $2^{n-2}$:1 MUX (or smaller). Its $n - 2$ select lines see at most $n - 2$ of the
variables, so for every select value at least two variables, say $u$ and $v$, are still free. Take $f$ =
the parity $x_1 \oplus \dots \oplus x_n$. With the select variables fixed, $f$ becomes $u \oplus v \oplus \dots$ or
its complement: a parity of at least two variables. But each data line carries only a constant, a
variable, or the one inverter's output (a single complemented variable): never a 2-variable XOR. An inverter
on the MUX output instead gives the complement of the MUX, and the complement of parity is again a
parity of at least two variables on every data line. So parity cannot be realised, and the minimum is
$2^{n-1}$:1. (For $n = 3$ the check script tries every wiring of a 2:1 MUX and an inverter and confirms
that 3-input XOR is out of reach.)
:::

:::definition{#residue-choice term="Choosing the residue variable" depth="standard"}
Any variable can be the residue; the theorem holds for each choice. The choice changes the data
inputs, never the function, so pick the one that is cheapest:

- **Fewest inverters**: prefer a choice whose residues are only $0$, $1$, $x$. For $f = A'B + AC$, selects
  $(A, B)$ give residues $(0, 1, C, C)$: no inverter; selects $(B, C)$ give $(0, A, A', 1)$: one inverter.
- **Fewest distinct signals**: fewer different residues mean simpler wiring.
- **The question's constraint**: if the selects are fixed by the figure (GATE 2021 puts $y$, $z$ on the
  selects), the residue variable is forced; just read the table.
- **Function residues**: with two variables left over (a $2^{n-2}$:1 MUX), choose the split that makes the
  residue functions simple gates (next block).
:::

:::definition{#impl-fewer term="Fewer selects: gates on the data lines" depth="standard"}
With $n - k$ selects, each data input carries a cofactor of $f$ in $k$ variables, built from gates.
**Majority on a 2:1 MUX.** $f(x, y, z) = xy + yz + zx$ with select $z$: for $z = 0$, $f = xy$; for $z = 1$, $f = x + y$. So
$I_0 = xy$ (an AND gate) and $I_1 = x + y$ (an OR gate). **A function selector** works the same way: a
4:1 MUX whose selects are control bits $C_1 C_0$ and whose data inputs are the outputs of gates computing
$\overline{A + B}$, $A + B$, $A \oplus B$ and $AB$ chooses which operation reaches the output (one OR gate
feeds both $I_1$ and, through one inverter, $I_0$).

The cost is the gates on the data lines. The benefit is a smaller MUX, which matters when the MUX is
the expensive part (a 2:1 MUX for a 3-variable function instead of a 4:1).
:::

:::viz{#mux-implement-viz spec="mux-implement" mode="animate" depth="standard"}
:::

:::trap{#trap-select-order title="Swapping S₁ and S₀ permutes the data inputs" depth="standard"}
The implementation table depends on **which variable is the MSB**. For $f(A, B, C) = \Sigma m(2, 3, 5, 6)$
with $S_1 = A$, $S_0 = B$ the data inputs are $(0, 1, C, C')$; with $S_1 = B$, $S_0 = A$ they are
$(0, C, 1, C')$: $I_1$ and $I_2$ trade places, because the select value 01 now means $B = 0, A = 1$. Using the
first table on the second wiring builds a different function. In GATE 2023, the two 4:1 MUXes have
$S_1 = A$ and $S_0 = C$ (and $B$ on the final 2:1 MUX), so the data inputs follow the order $AC = 00, 01, 10,
11$, not $AB$. Always write the select order next to the table's column headings.
:::

:::trick{#trick-option-rows title="Kill each wrong wiring with one row" depth="standard"}
When the options are four wirings of the same MUX (GATE 2021, 2023), do not build the whole table for each.
Build it once for the selects the options use, then compare position by position, or test each option
on a single row where it disagrees with $f$. In 2021, row 0 ($x = y = z = 0$, a 1 of $f$) reaches $I_0$ with
$x = 0$, so any option with $I_0 = x$ is out; row 4 removes $I_0 = x'$; row 2 removes $I_2 = x'$.

**Why it works:** every row reaches exactly one data input, so one row checks one data input at one value
of the residue variable. **When it fails:** if two options differ only on a data input that the rows you
tested never reach (for example a data line that only serves don't-care rows), both survive; then test a
row for that input as well.
:::

:::trap{#trap-residue-complement title="A residue x′ needs an inverter" depth="quick"}
If a column reads (1, 0) the data input must be $x'$. When the question says "without additional
hardware" or offers only $x$ on the wires, that column cannot be made, and you must pick another residue
variable (or another option). Writing $x$ where $x'$ is needed is the most common slip in implementation
tables; a single row check catches it: at $x = 0$ the data line must carry 1.
:::

### Worked examples: implementing functions

::::example{#ex-impl-easy level="easy" title="Majority on a 4:1 MUX" depth="quick"}
Implement the majority function $f(x, y, z) = xy + yz + zx$ on a 4:1 MUX with $S_1 = x$, $S_0 = y$.

:::step{why="The residue variable is the one not on the selects: z. Each data input serves the pair of rows with that x, y and z = 0, 1."}
$xy = 00$: rows 000, 001 → $f = 0, 0$. $xy = 01$: rows 010, 011 → $0, 1$. $xy = 10$: rows 100, 101 → $0, 1$.
$xy = 11$: rows 110, 111 → $1, 1$.
:::

:::step{why="Read each pair with the residue rule: same → constant, (0, 1) → z, (1, 0) → z′."}
$I_0 = 0$, $I_1 = z$, $I_2 = z$, $I_3 = 1$.
:::

:::answer
$(I_0, I_1, I_2, I_3) = (0, z, z, 1)$, no inverter needed. In words: with no 1 among $x, y$ the output is 0, with
both it is 1, and with exactly one it is decided by $z$.
:::
::::

::::example{#ex-impl-medium level="medium" title="Σ(0, 1, 3, 4, 5, 6) with selects y, z" depth="standard"}
Implement $f(x, y, z) = \Sigma m(0, 1, 3, 4, 5, 6)$ on a 4:1 MUX with $S_1 = y$, $S_0 = z$.

:::step{why="The residue variable is x, the MSB of the minterm number; so the column for yz = j holds minterms j (x = 0) and j + 4 (x = 1)."}
Columns: $I_0$: 0, 4. $I_1$: 1, 5. $I_2$: 2, 6. $I_3$: 3, 7.
:::

:::step{why="Circle the minterms of f in each column and read the pair."}
$I_0$: 0 ✓, 4 ✓ → 1. $I_1$: 1 ✓, 5 ✓ → 1. $I_2$: 2 ✗, 6 ✓ → $x$. $I_3$: 3 ✓, 7 ✗ → $x'$.
:::

:::step{why="Check one row through the wiring, preferably a 0 of f, since that is where a wrong residue shows."}
Row 7 ($x = y = z = 1$): selects $yz = 11$ choose $I_3 = x' = 0$, and $m_7$ is indeed not a minterm. ✓
:::

:::answer
$(I_0, I_1, I_2, I_3) = (1, 1, x, x')$ with one inverter for $x'$. GATE 2021 asks to recognise exactly this
wiring among four look-alikes; the others swap $x$ and $x'$ or move the constants.
:::
::::

::::example{#ex-impl-dc level="medium" title="Don't-cares can save the inverter" depth="standard"}
Implement $f(A, B, C) = \Sigma m(1, 4, 6) + d(5, 7)$ on a 4:1 MUX with $S_1 = A$, $S_0 = B$, using no inverter
if possible.

:::step{why="C is the residue (the LSB), so I_j serves the rows 2j and 2j + 1."}
$I_0$: $m_0 = 0$, $m_1 = 1$. $I_1$: $m_2 = 0$, $m_3 = 0$. $I_2$: $m_4 = 1$, $m_5 = X$. $I_3$: $m_6 = 1$, $m_7 = X$.
:::

:::step{why="Fixed pairs read as usual: (0, 1) → C and (0, 0) → 0."}
$I_0 = C$, $I_1 = 0$.
:::

:::step{why="A pair (1, X) can be read as 1 (X = 1) or as C′ (X = 0); the constant needs no inverter, so choose it."}
$I_2 = 1$, $I_3 = 1$.
:::

:::answer
$(I_0, I_1, I_2, I_3) = (C, 0, 1, 1)$ with no inverter, which is $f = A'B'C + A$ on the care rows. Treating the
don't-cares as 0s would give $(C, 0, C', C')$ and cost an inverter for nothing.
:::
::::

::::example{#ex-impl-fewer level="medium" title="A 3-variable function on a 2:1 MUX with gates on the data lines" depth="standard"}
Implement $f(A, B, C) = \Sigma m(1, 2, 6, 7)$ on a single 2:1 MUX with select $A$, using as few gates on the data
lines as possible.

:::step{why="With one select line only A is fixed by the MUX; each data input must supply the whole cofactor, a function of the two leftover variables B and C."}
$I_0 = f(0, B, C)$ serves rows 0–3, and $I_1 = f(1, B, C)$ serves rows 4–7.
:::

:::step{why="Read the cofactor for A = 0 as a 2-variable truth table over (B, C): rows 0, 1, 2, 3 are BC = 00, 01, 10, 11."}
For $A = 0$ the 1s are rows 1 and 2, i.e. $BC = 01$ and $10$: $I_0 = B'C + BC' = B \oplus C$, one XOR gate.
:::

:::step{why="Same for A = 1: rows 4, 5, 6, 7 are BC = 00, 01, 10, 11."}
For $A = 1$ the 1s are rows 6 and 7, i.e. $BC = 10$ and $11$: $I_1 = B$, a plain wire.
:::

:::step{why="Check a 0 of f through the wiring, where a wrong cofactor would show."}
Row 5 ($A = 1$, $B = 0$, $C = 1$): the MUX passes $I_1 = B = 0$, and 5 is not a minterm ✓. Row 3 ($A = 0$, $BC = 11$):
$I_0 = 1 \oplus 1 = 0$ ✓.
:::

:::answer
$I_0 = B \oplus C$ (one XOR), $I_1 = B$ (a wire): one 2:1 MUX and one gate. The choice of select variable decides
how simple the cofactors are; with $C$ on the select instead, the cofactors would be $f(A, B, 0) = A'B + AB$, which
is $B$, and $f(A, B, 1) = A'B' + AB$, an XNOR, so the cost is the same here, but in general try each variable.
:::
::::

::::example{#ex-impl-gate level="gate" title="A 4-variable function on an 8:1 MUX" depth="standard"}
Implement $f(A, B, C, D) = \Sigma m(1, 3, 4, 11, 12, 13, 14, 15)$ on an 8:1 MUX with $S_2 = A$, $S_1 = B$, $S_0 = C$.

:::step{why="With D the residue (the LSB), each data input serves two consecutive minterms: I_j serves 2j and 2j + 1."}
$I_0$: 0, 1. $I_1$: 2, 3. $I_2$: 4, 5. $I_3$: 6, 7. $I_4$: 8, 9. $I_5$: 10, 11. $I_6$: 12, 13. $I_7$: 14, 15.
:::

:::step{why="Read each pair (D = 0 row first): (0, 1) → D, (1, 0) → D′, (0, 0) → 0, (1, 1) → 1."}
$I_0 = D$ (0 ✗, 1 ✓), $I_1 = D$ (2 ✗, 3 ✓), $I_2 = D'$ (4 ✓, 5 ✗), $I_3 = 0$, $I_4 = 0$, $I_5 = D$ (10 ✗, 11 ✓), $I_6 = 1$,
$I_7 = 1$.
:::

:::step{why="Compare with the gate cost: the minimal SOP needs four terms, so the MUX version is far simpler to wire."}
A minimal SOP is $AB + A'B'D + B'CD + BC'D'$ (there are two, both with four terms and 11 literals: four AND
gates and a 4-input OR). The MUX needs one inverter and nothing else.
:::

:::answer
$(I_0, \dots, I_7) = (D, D, D', 0, 0, D, 1, 1)$. When the residue variable is the LSB, the pairs are simply
consecutive rows of the truth table, which makes the reading quickest.
:::
::::

::::example{#ex-impl-edge level="gate" title="Edge case: the same function with a different residue variable" depth="standard"}
Implement the function of the medium example, $f(x, y, z) = \Sigma m(0, 1, 3, 4, 5, 6)$, on a 4:1 MUX with
$S_1 = x$, $S_0 = y$ instead.

:::step{why="Now z (the LSB) is the residue, so I_j serves the consecutive minterms 2j and 2j + 1."}
$I_0$: 0, 1. $I_1$: 2, 3. $I_2$: 4, 5. $I_3$: 6, 7.
:::

:::step{why="Read the pairs."}
$I_0$: (1, 1) → 1. $I_1$: (0, 1) → $z$. $I_2$: (1, 1) → 1. $I_3$: (1, 0) → $z'$.
:::

:::step{why="Check that both wirings agree on a row, for example row 2 (x = 0, y = 1, z = 0), a 0 of f."}
New wiring: $xy = 01$ picks $I_1 = z = 0$ ✓. Old wiring ($S_1 = y$, $S_0 = z$): $yz = 10$ picks $I_2 = x = 0$ ✓.
:::

:::answer
$(I_0, I_1, I_2, I_3) = (1, z, 1, z')$. The data inputs changed completely, the function did not. In a
question, never compare a candidate wiring with "the" implementation table: build the table for the
selects that the candidate actually uses.
:::
::::

:::aside{#impl-vem title="The implementation table is a variable-entered map" depth="deep"}
The residues of the implementation table are exactly the entries of a **variable-entered map** with the
select variables on the map's axes and the residue variable written inside the cells
([Chapter 3, Lesson 3](lesson:tabular-method)). A VEM is minimised by looping the cells that hold 1, $x$
or $x'$; a MUX simply skips the minimisation and wires each cell's entry to its data input. That is why a
MUX is attractive when a function has no small SOP: its cost does not depend on how well the map loops.
:::

:::note{#recap-implement title="Recap" depth="quick"}
$n$ selects: wire the truth table. $n - 1$ selects: implementation table, residues $0, 1, x, x'$, at most
one inverter: so a $2^{n-1}$:1 MUX is the smallest that does every $n$-variable function. Fewer selects:
gates on the data lines. The select order decides the column order.
:::

## MUX trees: big multiplexers from small ones

:::intuition{#tree-intuition title="A knockout tournament" depth="standard"}
Sixteen players, and the courts hold four at a time. Round one: four groups of four, one winner each.
Round two: the four winners play once more. Five matches, two rounds, one champion. A MUX tree is the
same tournament: first-level MUXes each pick one candidate from their group of inputs, and the next
level picks among the winners. The least significant select bits decide the winner inside each
group; the most significant bits decide which group's winner reaches the output.
:::

:::definition{#mux-tree term="An N:1 MUX from k:1 MUXes" depth="standard"}
Split the $N$ inputs into consecutive groups of $k$ and give each group a $k:1$ MUX (level 1). Their
outputs form a smaller list, split again into groups of $k$ (level 2), and so on until one MUX remains.
With $k = 2^j$, each level uses $j$ select bits: **level 1 (the data side) takes the least significant
bits**, and the last level (the output) takes the most significant bits. For 16:1 from 4:1 MUXes:
level 1 has four MUXes on $S_1 S_0$ handling $I_0$–$I_3$, $I_4$–$I_7$, $I_8$–$I_{11}$, $I_{12}$–$I_{15}$, and level 2 has one
MUX on $S_3 S_2$ choosing among their outputs.

**Why the LSBs go first.** Inputs $I_0 \dots I_3$ share their high bits ($S_3 S_2 = 00$) and differ only in the low
bits, so the low bits must choose within a group. (You may give the first level other select bits,
but then the data inputs must be regrouped to match, the same permutation as in the select-order trap.)

**With enables.** An 8:1 MUX can also be two 4:1 MUXes with enables (one enabled by $S_2'$, the other by
$S_2$) and an OR gate: the disabled MUX outputs 0, so the OR passes the enabled one.
:::

:::derivation{#mux-tree-count of="the number of MUXes in a tree" depth="standard"}
Level 1 needs $\lceil N/k \rceil$ MUXes (a partly used MUX still counts). Each level turns $m$ signals into
$\lceil m/k \rceil$, so the counts are
$$
\Big\lceil \tfrac{N}{k} \Big\rceil,\ \Big\lceil \tfrac{1}{k}\big\lceil \tfrac{N}{k} \big\rceil \Big\rceil,\ \dots,\ 1,
\qquad \text{levels} = \lceil \log_k N \rceil .
$$
When $N = k^L$ is a power of $k$, the counts are $k^{L-1}, k^{L-2}, \dots, 1$, and the geometric sum gives
$$
\text{total} = \frac{N - 1}{k - 1}.
$$
**Second derivation of the closed form.** Each $k:1$ MUX turns $k$ signals into 1, removing $k - 1$. Going
from $N$ signals to 1 removes $N - 1$, so $(N - 1)/(k - 1)$ MUXes, when every MUX is fully used.

**Sanity check.** 8:1 from 2:1: $4 + 2 + 1 = 7 = (8 - 1)/1$. 16:1 from 4:1: $4 + 1 = 5 = 15/3$. 64:1 from 4:1:
$16 + 4 + 1 = 21 = 63/3$. 32:1 from 4:1 is **not** a power of 4: $8 + 2 + 1 = 11$ (the last level is a 4:1 MUX
with only two inputs used); the closed form would give $31/3$, not a whole number.

**One refinement.** If a level leaves a **single** signal over (for example 5 signals into 2:1 MUXes), that
signal needs no MUX of its own: it is wired straight to the next level, and the ceiling would count
one MUX too many. With 4:1 MUXes and the sizes GATE uses (16, 32, 64, 128, 10 inputs) every leftover group
has at least two signals, so the ceilings are exact.
:::

:::viz{#mux-tree-viz spec="mux-tree" mode="animate" depth="standard"}
:::

:::trap{#trap-tree-count title="Round up at every level" depth="standard"}
Writing the count as $N/k + N/k^2 + \dots$ without ceilings is the classic slip: for 32:1 from 4:1 it
gives $8 + 2 + 0.5 = 10.5$, and people answer 10 or 10.5. A MUX that is only half used is still a whole
MUX: the answer is 11. Round **each level** up before dividing again: for 10:1 from 4:1 the levels are
$\lceil 10/4 \rceil = 3$ and $\lceil 3/4 \rceil = 1$, total 4, while the unrounded sum $2.5 + 0.625 = 3.125$ is not a
count of anything. The number of levels is exactly $\lceil \log_k N \rceil$ (2 here, 3 for 32:1 from 4:1).
:::

### Worked examples: trees and sizing

::::example{#ex-tree-easy level="easy" title="Select lines for 32 registers" depth="quick"}
A MUX connects one of 32 registers to an accumulator. How many select lines does it need?

:::step{why="Each select pattern names one register, and k lines give 2^k patterns."}
Need $2^k \ge 32$.
:::

:::step{why="32 is a power of 2, so the logarithm is exact."}
$k = \lceil \log_2 32 \rceil = 5$.
:::

:::answer
5 select lines (a 32:1 MUX). If each register is 16 bits wide, the read path is 16 such MUXes side by
side, all sharing the same 5 select lines.
:::
::::

::::example{#ex-tree-medium level="medium" title="16:1 from 4:1 MUXes" depth="standard"}
Build a 16:1 MUX from 4:1 MUXes. How many are needed, and which select bits go where?

:::step{why="Level 1 groups the 16 inputs in fours."}
$\lceil 16/4 \rceil = 4$ MUXes on $S_1 S_0$: they output $I_{4g + S_1S_0}$ for groups $g = 0, 1, 2, 3$.
:::

:::step{why="Level 2 takes the four winners."}
$\lceil 4/4 \rceil = 1$ MUX on $S_3 S_2$, which chooses group $g = (S_3 S_2)_2$.
:::

:::step{why="Check one select value end to end: S3S2S1S0 = 1001 should pass I9."}
Level 1: $S_1 S_0 = 01$, so group 2's MUX passes $I_{8 + 1} = I_9$. Level 2: $S_3 S_2 = 10$ chooses group 2. ✓
:::

:::answer
5 MUXes in 2 levels ($= (16 - 1)/(4 - 1)$), with $S_1 S_0$ on the four first-level MUXes and $S_3 S_2$ on the output MUX.
:::
::::

::::example{#ex-tree-gate level="gate" title="64:1 from 4:1 and from 2:1" depth="standard"}
How many 4:1 MUXes build a 64:1 MUX? How many 2:1 MUXes?

:::step{why="Level by level with 4:1 MUXes: 64 inputs, then 16 signals, then 4."}
$16 + 4 + 1 = 21$ in $\log_4 64 = 3$ levels.
:::

:::step{why="Level by level with 2:1 MUXes: 32, 16, 8, 4, 2, 1."}
$32 + 16 + 8 + 4 + 2 + 1 = 63$ in 6 levels.
:::

:::step{why="Confirm with the closed form (N − 1)/(k − 1), valid because 64 is a power of both 4 and 2."}
$63/3 = 21$ and $63/1 = 63$. ✓
:::

:::answer
21 four-to-one MUXes or 63 two-to-one MUXes. (With 8:1 MUXes it is $8 + 1 = 9$.)
:::
::::

::::example{#ex-tree-edge level="gate" title="Edge case: 10:1 from 4:1 MUXes" depth="standard"}
How many 4:1 MUXes are needed for a 10:1 MUX, built as a tree?

:::step{why="Level 1 must take all 10 inputs in groups of four; the last group has only two inputs but still needs a whole MUX."}
$\lceil 10/4 \rceil = 3$ MUXes ($I_0$–$I_3$, $I_4$–$I_7$, $I_8$–$I_9$).
:::

:::step{why="Level 2 takes the three outputs; one 4:1 MUX has room for them (one data input unused)."}
$\lceil 3/4 \rceil = 1$.
:::

:::answer
4 MUXes in $\lceil \log_4 10 \rceil = 2$ levels. The select lines: $\lceil \log_2 10 \rceil = 4$, with $S_1 S_0$ on level 1 and $S_3 S_2$
on level 2 (select values 10–15 are unused). Dividing without rounding ($2.5 + 0.625$) gives nonsense.
:::
::::

:::note{#recap-trees title="Recap" depth="quick"}
Tree of $k:1$ MUXes: $\lceil N/k \rceil$ at level 1, then keep dividing and rounding up; levels $\lceil \log_k N \rceil$;
total $(N - 1)/(k - 1)$ when $N$ is a power of $k$. LSB selects at the data side, MSB at the output.
:::

## The MUX as a universal element

:::intuition{#universal-intuition title="A switch that can be told what to switch" depth="standard"}
A 2:1 MUX chooses between two things. If one of the "things" is a constant, the MUX turns into a
gate: "if $B$ then $A$ else 0" is $A$ AND $B$; "if $B$ then 1 else $A$" is $A$ OR $B$; "if $x$ then 0 else 1"
is NOT $x$. Since AND and NOT together can build anything, a box of 2:1 MUXes and the two constants can
build anything too. [Chapter 2, Lesson 5](lesson:universal-gates) stated this as a fact about functional
completeness; here we prove it in the form GATE asks and learn to read the multi-MUX gate puzzles.
:::

:::definition{#mux-universal term="Gates from 2:1 MUXes with constants" depth="standard"}
Write $\text{MUX}(s;\ I_0, I_1) = s'I_0 + sI_1$. With the constants 0 and 1 and no inverters on the inputs:

| Gate | Wiring | Check |
|:--|:--|:--|
| NOT $x$ | $\text{MUX}(x;\ 1, 0)$ | $x' \cdot 1 + x \cdot 0 = x'$ |
| AND $AB$ | $\text{MUX}(B;\ 0, A)$ | $B' \cdot 0 + BA = AB$ |
| OR $A + B$ | $\text{MUX}(B;\ A, 1)$ | $B'A + B = A + B$ |
| $A + B'$ (implication) | $\text{MUX}(B;\ 1, A)$ | $B' + BA = A + B'$ |
| $AB'$ (inhibition) | $\text{MUX}(B;\ A, 0)$ | $B'A$ |
| NAND $\overline{AB}$ | two MUXes: $g = \text{MUX}(B;\ 0, A)$, then $\text{MUX}(g;\ 1, 0)$ | $g' = \overline{AB}$ |
| NOR $\overline{A + B}$ | two MUXes: $g = \text{MUX}(A;\ 1, 0) = A'$, then $\text{MUX}(B;\ g, 0)$ | $B'A'$ |
| XOR $A \oplus B$ | $\text{MUX}(A;\ B, B')$, or two MUXes if $B'$ must be made | $A'B + AB'$ |

One 2:1 MUX, with only the uncomplemented variables and constants, can make NOT, AND, OR, implication
and inhibition, but not NAND, NOR, XOR or XNOR: each of those needs a complement that a single MUX cannot
both produce and use. A **half adder** therefore takes two MUXes when $B'$ is available (carry
$\text{MUX}(A;\ 0, B)$, sum $\text{MUX}(A;\ B, B')$) and three when the inverter must itself be a MUX. A
**half subtractor** ($A - B$: difference $A \oplus B$, borrow $A'B$) needs only two, even without complements:
borrow $= \text{MUX}(A;\ B, 0) = A'B$, and difference $= \text{MUX}(B;\ A, A'B)$, which reuses the borrow,
because for $B = 1$ the borrow $A'B$ equals $A'$. The borrow line is the complement the XOR needed.
:::

:::theorem{#mux-complete-proof name="The 2:1 MUX with constants is functionally complete" depth="standard"}
Every Boolean function can be built from 2:1 multiplexers alone, provided the constants 0 and 1 are
available. Without the constants it cannot: no circuit of MUXes computes NOT.
:::

:::proof{#proof-mux-complete of="the completeness of the 2:1 MUX" depth="standard"}
**Idea first:** build NOT and AND; that pair is complete. For the converse, find a property that MUXes
never break and NOT does not have.

*With constants.* $\text{MUX}(x;\ 1, 0) = x'$ and $\text{MUX}(B;\ 0, A) = AB$. Every function has a canonical SOP,
which is built from NOT, AND and OR, and OR is $\overline{\overline{A}\,\overline{B}}$ by De Morgan, so NOT and AND build
every function ([Chapter 2, Lesson 5](lesson:universal-gates#mux-complete)). Replace each NOT and AND by its MUX. (A
direct route is the previous section: a tree of 2:1 MUXes on all the variables, with the truth table as
constants on its leaves, is already any function.)

*Without constants.* A MUX whose three inputs are all 0 outputs $s' \cdot 0 + s \cdot 0 = 0$: the MUX preserves the
all-0 input. By induction over the circuit, every line of a MUX-only circuit is 0 when every variable is
0. NOT turns 0 into 1, so it cannot be built. (The same argument with 1 shows the MUX also preserves 1.)
:::

:::viz{#mux-as-gates-viz spec="mux-as-gates" mode="animate" depth="standard"}
:::

:::trap{#trap-mux-nand title="A constant cascade gives NAND, not OR" depth="standard"}
A familiar sketch: MUX 1 with data $A$ and 0 and select $B$ makes $AB$; MUX 2 has constants on its data
inputs and MUX 1's output on its select. With the usual convention ($I_0$ chosen when the select is 0),
MUX 2 with $I_0 = 1$, $I_1 = 0$ outputs $(AB)' $, a **NAND**, and with $I_0 = 0$, $I_1 = 1$ it just repeats $AB$.
Neither is $A + B$, which some notes write under this picture. OR needs a variable on a data line:
$A + B = \text{MUX}(B;\ A, 1)$, one MUX. The conclusion "MUXes are complete" survives (NAND is complete), but
an exam question that asks for "the function of the cascade" wants NAND.
:::

### Worked examples: the MUX as gates

::::example{#ex-gates-easy level="easy" title="NOT and AND from one 2:1 MUX each" depth="quick"}
Wire a 2:1 MUX as NOT $x$, and another as $A \cdot B$.

:::step{why="For NOT, the select must be the variable itself, and the data inputs give the answer for each value of x."}
NOT: $S = x$, $I_0 = 1$ (output when $x = 0$), $I_1 = 0$. $Y = x' \cdot 1 + x \cdot 0 = x'$.
:::

:::step{why="For AND, read it as an if–then–else: if B then output A, else 0."}
AND: $S = B$, $I_0 = 0$, $I_1 = A$. $Y = B' \cdot 0 + B \cdot A = AB$.
:::

:::answer
NOT $= \text{MUX}(x;\ 1, 0)$ and AND $= \text{MUX}(B;\ 0, A)$; by symmetry $\text{MUX}(A;\ 0, B)$ is AND as well.
:::
::::

::::example{#ex-gates-medium level="medium" title="OR without extra hardware" depth="standard"}
A 2:1 MUX has data inputs $X$ (chosen when the control $Z = 0$) and $Y$ (chosen when $Z = 1$). Connect it
so that it computes $A + B$, with no other hardware.

:::step{why="As an if–then–else: if A is 1 the OR is 1 no matter what B is; if A is 0 the OR equals B."}
Control $Z = A$; for $A = 1$ the output must be 1, so $Y = 1$; for $A = 0$ the output must be $B$, so $X = B$.
:::

:::step{why="Verify with the MUX equation."}
$Z'X + ZY = A'B + A = A + B$ (absorption).
:::

:::step{why="Rule out the tempting alternatives: a constant on the control freezes the MUX, and a variable on both the control and a data line is seen there only at one fixed value (A on X is read only when A = 0, i.e. as 0)."}
$Z = 0$ outputs $X$ alone; $X = A, Y = B, Z = A$ gives $A'A + AB = AB$, an AND.
:::

:::answer
$B \to X$, $1 \to Y$, $A \to Z$ (or the same with $A$ and $B$ exchanged). This is the pattern of GATE 2004.
:::
::::

::::example{#ex-gates-gate level="gate" title="NOR from two 2:1 MUXes" depth="standard"}
Build $\overline{A + B}$ from two 2:1 MUXes and the constants 0 and 1 (no inverters).

:::step{why="NOR = A′B′, an AND of two complements; a MUX can make A′ from constants."}
MUX 1: $S = A$, $I_0 = 1$, $I_1 = 0$, output $g = A'$.
:::

:::step{why="Now AND g with B′: if B is 1 output 0, else output g."}
MUX 2: $S = B$, $I_0 = g$, $I_1 = 0$. $Y = B'g + B \cdot 0 = A'B'$.
:::

:::step{why="Check all four rows: only A = B = 0 reaches I0 of MUX 2 with g = 1."}
$AB = 00 \to 1$; $01 \to 0$; $10 \to g = 0$; $11 \to 0$. ✓
:::

:::answer
$\overline{A + B} = \text{MUX}(B;\ \text{MUX}(A;\ 1, 0),\ 0)$. GATE IT 2005 builds the same gate a different way: the first
MUX computes $A + B$ and drives the **select** of the second, whose data inputs are the constants 1 (for
select 0) and 0.
:::
::::

::::example{#ex-gates-edge level="gate" title="Edge case: a constant cascade is NAND, not OR" depth="standard"}
MUX 1: select $B$, $I_0 = 0$, $I_1 = A$, output $g$. MUX 2: select $g$, $I_0 = 1$, $I_1 = 0$, output $Y$. What is $Y$?

:::step{why="MUX 1 is the AND wiring."}
$g = B' \cdot 0 + B \cdot A = AB$.
:::

:::step{why="MUX 2 has constants on its data inputs and g on its select: that is the NOT wiring applied to g."}
$Y = g' \cdot 1 + g \cdot 0 = g' = \overline{AB}$.
:::

:::step{why="Compare with OR on the row that separates them: A = 1, B = 0."}
$Y = \overline{1 \cdot 0} = 1$ and $A + B = 1$; at $A = B = 0$, $Y = 1$ but $A + B = 0$. Not OR.
:::

:::answer
$Y = \overline{AB}$, NAND. Swapping the constants on MUX 2 ($I_0 = 0$, $I_1 = 1$) gives back $AB$; no arrangement
of constants on MUX 2 gives $A + B$.
:::
::::

:::note{#recap-universal title="Recap" depth="quick"}
With 0 and 1: NOT $= \text{MUX}(x; 1, 0)$, AND $= \text{MUX}(B; 0, A)$, OR $= \text{MUX}(B; A, 1)$, so the 2:1 MUX is
complete; without constants it is not (it preserves 0). Two MUXes make NAND or NOR. Constant cascade
= NAND.
:::

## Where multiplexers are used

:::intuition{#apps-intuition title="Every 'choose one of these' in a computer" depth="standard"}
Whenever hardware has to pick one of several values, a MUX does the picking: which register is read,
which ALU result is written back, which address goes to memory, which bit goes out on a serial line.
The select lines are the "which", and they usually come from an instruction field or a counter.
:::

:::definition{#mux-applications term="Applications of the multiplexer" depth="standard"}
- **Register selection.** A register file's read port is a MUX per bit: with $R$ registers of $w$ bits,
  $w$ MUXes of size $R:1$ share $\lceil \log_2 R \rceil$ select lines, which come from the register number in
  the instruction.
- **Function selection.** Compute several results in parallel (AND, OR, XOR, sum) and let a MUX on
  control bits pick one: the core of an ALU's output stage. GATE 1996 builds such a selector.
- **Data routing.** Choosing the next PC (PC + 4, a branch target, a jump target), or the second ALU
  operand (a register or an immediate), is a MUX controlled by the decoded instruction.
- **Parallel to serial.** Put an $n$-bit word on the data inputs of an $n$:1 MUX and drive the selects from a
  $\log_2 n$-bit counter: the bits leave one per clock. (The DEMUX of [Lesson 3](lesson:decoders-encoders)
  does the reverse.)
- **Function generation.** Lookup-table logic in FPGAs is a MUX whose data inputs are memory bits: the
  "wire the truth table" case of this lesson.
:::

### Worked examples: applications

::::example{#ex-app-easy level="easy" title="Parallel to serial" depth="quick"}
An 8-bit word $b_0 \dots b_7$ sits on $I_0 \dots I_7$ of an 8:1 MUX whose selects are driven by a 3-bit counter that
starts at 000 and counts up once per clock. Which bit is on the output during clock 5 (counting from
clock 0), and how many clocks does the whole word take?

:::step{why="During clock t the counter holds t, so the selects read t in binary."}
Clock 5: selects $101_2 = 5$, so the output is $b_5$.
:::

:::step{why="Each clock sends one bit, and the counter must visit all 8 values."}
The word takes 8 clocks.
:::

:::answer
$b_5$ during clock 5; 8 clocks per word. The bit order on the line is fixed by the counter's order.
:::
::::

::::example{#ex-app-medium level="medium" title="A register file read port" depth="standard"}
A register file has 32 registers of 16 bits. Its read port is built from MUXes. How many 32:1 MUXes and
select lines are needed, and how many 4:1 MUXes if only 4:1 MUXes are available?

:::step{why="Each bit position of the output chooses among the 32 registers' bits at that position."}
16 MUXes of size 32:1, one per bit.
:::

:::step{why="All 16 choose the same register, so they share the selects."}
$\lceil \log_2 32 \rceil = 5$ shared select lines.
:::

:::step{why="One 32:1 MUX from 4:1 MUXes is a tree with rounding at the last level."}
$\lceil 32/4 \rceil + \lceil 8/4 \rceil + \lceil 2/4 \rceil = 8 + 2 + 1 = 11$ per bit; $16 \times 11 = 176$ in all.
:::

:::answer
16 MUXes (32:1) with 5 shared select lines, or 176 four-to-one MUXes. GATE 2020 asks only for the 5.
:::
::::

::::example{#ex-app-gate level="gate" title="A full adder from two 4:1 MUXes" depth="standard"}
Build a full adder (inputs $A$, $B$, $C$; outputs $S = A \oplus B \oplus C$ and carry $C_o = AB + BC + CA$) from two 4:1
MUXes with $S_1 = B$, $S_0 = C$ and one inverter.

:::step{why="The residue variable is A, so the column for BC = j holds minterms j (A = 0) and j + 4 (A = 1)."}
Sum is 1 on 1, 2, 4, 7: columns (0, 4) → $A$; (1, 5) → $A'$; (2, 6) → $A'$; (3, 7) → $A$.
:::

:::step{why="Carry is 1 on 3, 5, 6, 7: read the same columns."}
(0, 4) → 0; (1, 5) → $A$; (2, 6) → $A$; (3, 7) → 1.
:::

:::answer
Sum MUX: $(A, A', A', A)$; carry MUX: $(0, A, A, 1)$; one inverter makes $A'$. The sum pattern is the
$C, C', C', C$ pattern of the reading examples with the roles of the variables rotated, as parity is symmetric.
:::
::::

::::example{#ex-app-edge level="gate" title="Edge case: a selector where one operation costs no gate" depth="standard"}
Control bits $C_1 C_0$ choose $F$: 00 → $A$, 01 → $\overline{A}$, 10 → $AB$, 11 → $A \oplus B$. Build it with one 4:1 MUX
and as few extra gates as possible (AND, XOR and NOT gates are available).

:::step{why="A 4:1 MUX with C1 on S1 and C0 on S0 passes I_{C1C0}, so each data input gets the function for its code."}
$I_0 = A$, $I_1 = \overline{A}$, $I_2 = AB$, $I_3 = A \oplus B$.
:::

:::step{why="Look for operations that need no gate at all: a data input may be a plain wire from a variable."}
$I_0 = A$ is a wire from $A$: no gate. $I_1 = \overline{A}$ needs one inverter on that same wire.
:::

:::step{why="The remaining two operations are genuine 2-input functions and get one gate each."}
$I_2$ = AND($A$, $B$), $I_3$ = XOR($A$, $B$).
:::

:::step{why="Check one code end to end, including the gate-free line."}
$C_1 C_0 = 00$, $A = 1$, $B = 0$: the MUX passes $I_0 = A = 1$ ✓. $C_1 C_0 = 11$, $A = B = 1$: $I_3 = 1 \oplus 1 = 0$ ✓.
:::

:::answer
One 4:1 MUX plus three gates (one inverter, one AND, one XOR) for four operations: $A$ costs only a wire, and
$\overline{A}$ costs only the inverter on that wire. The insight in every function selector is to count gates per
**distinct signal**, not per operation: an operation that is a variable costs nothing, and one that is the
complement of another line costs a single inverter (GATE 1996 builds its selector the same way, sharing one
OR gate between $A + B$ and its complement).
:::
::::

:::note{#recap-apps title="Recap" depth="quick"}
MUXes pick: registers (one MUX per bit, shared selects), ALU results, next PC, serial bits (counter on
the selects). Function selectors put the candidate results on the data lines.
:::

## Try it

Set the data inputs and step the select lines of a 2:1, 4:1 or 8:1 MUX; switch the enable between active
high and active low and watch a disabled MUX output 0.

:::lab{#lab-mux lab="comb-workbench" tab="mux" depth="standard"}
:::

Pick a function (or a preset such as majority, XOR₃ or the 2021 function) and choose which variables
drive the selects: the implementation table shows each residue and the verification row confirms the
MUX equals $f$.

:::lab{#lab-implement lab="comb-workbench" tab="implement" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1996-a-47" tests="mux-analysis,mux-equation" depth="standard"}
:::

:::pyq{id="cse-1996-a-53" tests="impl-fewer,mux-applications" depth="standard"}
:::

:::pyq{id="cse-1998-a-14" tests="select-lines,trap-select-count" depth="standard"}
:::

:::pyq{id="cse-2001-a-36" tests="mux-cascade,mux-analysis" depth="standard"}
:::

:::pyq{id="cse-2002-a-27" tests="mux-enable,trap-enable,mux-analysis" depth="standard"}
:::

:::pyq{id="cse-2004-cs-60" tests="mux-universal,impl-table" depth="standard"}
:::

:::pyq{id="it-2005-cs-48" tests="mux-cascade,mux-universal" depth="standard"}
:::

:::pyq{id="cse-2006-cs-35" tests="mux-cascade,mux-analysis" depth="standard"}
:::

:::pyq{id="it-2006-cs-36" tests="impl-fewer,residue-choice" depth="standard"}
:::

:::pyq{id="cse-2007-cs-34" tests="shannon-mux,min-mux-size" depth="standard"}
:::

:::pyq{id="it-2007-cs-8" tests="mux-cascade,mux-universal" depth="standard"}
:::

:::pyq{id="cse-2010-cs-9" tests="mux-analysis,mux-equation" depth="standard"}
:::

:::pyq{id="cse-2014-1-cs-45" tests="mux-analysis,impl-table" depth="standard"}
:::

:::pyq{id="cse-2014-3-cs-8" tests="mux-if-else" depth="standard"}
:::

:::pyq{id="cse-2016-1-cs-30" tests="mux-cascade,mux-analysis" depth="standard"}
:::

:::pyq{id="cse-2020-cs-19" tests="select-lines,mux-applications" depth="standard"}
:::

:::pyq{id="cse-2021-2-cs-5" tests="impl-table,residue-choice" depth="standard"}
:::

:::pyq{id="cse-2023-cs-34" tests="mux-tree,impl-n-select,trap-select-order" depth="standard"}
:::

:::pyq{id="cse-2024-1-cs-54" tests="mux-cascade,mux-tree" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dl-05-02-q01" depth="standard"}
:::

:::practice{id="nx-dl-05-02-q02" depth="standard"}
:::

:::practice{id="nx-dl-05-02-q03" depth="standard"}
:::

:::practice{id="nx-dl-05-02-q04" depth="standard"}
:::

:::practice{id="nx-dl-05-02-q05" depth="standard"}
:::

:::practice{id="nx-dl-05-02-q06" depth="standard"}
:::

:::practice{id="nx-dl-05-02-q07" depth="standard"}
:::

:::practice{id="nx-dl-05-02-q08" depth="standard"}
:::

:::practice{id="nx-dl-05-02-q09" depth="standard"}
:::

:::practice{id="nx-dl-05-02-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Multiplexers on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| MUX | $2^n$:1 passes $I_s$, $s$ = number on the selects, $S_{n-1}$ = MSB; $Y = \sum m_i(S)\,I_i$ |
| Select lines | $\lceil \log_2 N \rceil$; $k$ select lines = $2^k$:1 MUX |
| Enable | disabled → output 0 (those rows are 0s of $f$); check active-low bubbles |
| Reading | case-split on the selects; cascades inside out; MUX on a select: case-split on its variables |
| if–then–else | a 2:1 MUX; a `switch` on $n$ bits is a $2^n$:1 MUX |
| Implement, $n$ selects | wire the truth table (4:1: XOR = 0110, XNOR = 1001) |
| Implement, $n - 1$ selects | residues $0, 1, x, x'$ from the implementation table; one inverter; minimum size $2^{n-1}$:1 |
| Select order | swapping $S_1$, $S_0$ permutes the data inputs |
| Trees | $\lceil N/k \rceil$, then keep dividing and rounding up; $(N - 1)/(k - 1)$ when $N = k^L$; LSBs at the data side |
| Universal | NOT $= \text{MUX}(x; 1, 0)$, AND $= \text{MUX}(B; 0, A)$, OR $= \text{MUX}(B; A, 1)$; constant cascade = NAND |
:::
