---
id: data-converters
subject: dl
chapter: beyond-syllabus
title: "DAC and ADC basics"
order: 2
prerequisites: [fractions-fixed-point]
pyq_topics: []
est_minutes: 25
difficulty: basic
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every DAC output, node voltage, leg current, ADC code, SAR trace and conversion time is computed in content/gate-notes/_checks/dl/l7_02_converters.py with convlib, in exact fractions (ladders by nodal analysis, the weighted DAC resistor by resistor)."
  - "Coverage checklist only (internal digests, never copied): set C pp. 394–397 (binary-weighted DAC, voltage- and current-switched R-2R ladders; ADC types only named). The current example of C 397 (2.5 mA, −0.625 V) and its MSB/LSB labelling are corrected in the lesson."
  - "Facts checked against: A. S. Sedra and K. C. Smith, Microelectronic Circuits (data converters: weighted-resistor and R-2R DACs, flash, counting, successive-approximation and dual-slope ADCs, quantisation error)."
  - "PYQs: none. No question in src/gate/questions.json tests data converters (outline: 0); the topic is optional enrichment."
updated: "2026-10-22"
---

*Optional: beyond the core GATE syllabus.* Every circuit in this subject so far lives in a world of
two voltages, "low" and "high", 0 and 1. The world outside does not: a microphone, a thermometer or a
battery produces a voltage that can take any value in a range. Two circuits sit on the border. A
**digital-to-analog converter** (DAC) takes an $n$-bit number and produces a voltage proportional to it;
an **analog-to-digital converter** (ADC) does the reverse, measuring a voltage and writing it down as an
$n$-bit number. This lesson builds both from parts you already know: resistors that turn binary weights
into currents, comparators that answer one yes/no question each, and a register that plays a binary
search. We prove the two facts that make the classic circuits work (the R-2R ladder halves its current at
every node; successive approximation finds the right code in exactly $n$ steps), and we count what each
ADC design costs in comparators and in clock cycles.

## Where this fits

The number a DAC reads is a binary fraction in disguise: the code $b_{n-1}\dots b_0$ is turned into the
voltage $V_{ref} \times 0.b_{n-1}\dots b_0$, which is the fixed-point reading of
[Chapter 1, Lesson 3](lesson:fractions-fixed-point). The flash ADC ends in a priority encoder, the
circuit of [Chapter 5, Lesson 3](lesson:decoders-encoders), and the successive-approximation ADC is a
register driven by a small sequential controller (the registers of
[Chapter 6, Lesson 6](lesson:shift-registers) and the state machines of
[Lesson 7](lesson:finite-state-machines)). The other two lessons of this optional
chapter are [memory organisation](lesson:memory-devices) and [logic families](lesson:logic-families).
Analog details (operational amplifiers, settling time, noise) belong to an electronics course; here we
keep to what the digital side has to know: the arithmetic of the codes.

:::table{#radar title="GATE radar: DACs and ADCs" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 0: the current GATE CSE syllabus does not list data converters, and no question in the bank tests them |
| Why it still matters | Converters appear in embedded-systems and computer-organisation courses and in other GATE papers (EC, EE, IN); the arithmetic (step size, binary fractions, binary search, $2^n - 1$ comparators) reuses this subject's core ideas |
| Likely question shapes | The output voltage for a code; step size, full scale and resolution; the currents of an R-2R ladder; the code an ADC gives for a voltage; the SAR trial sequence; comparators in a flash ADC; conversion times of flash, SAR and counter ADCs |
| What examiners would test | Full scale is one step short of $V_{ref}$; resolution as $1/(2^n - 1)$ of full scale (or $1/2^n$ when a book quotes it against $V_{ref}$: read which one is meant); that the ladder's reference current does not depend on the code; $2^n - 1$ (not $2^n$) comparators; SAR takes $n$ clocks for every input, a counter ADC up to $2^n - 1$ |
:::

## Two converters, one staircase

:::intuition{#converters-intuition title="A staircase and a guessing game" depth="standard"}
Picture a staircase with $2^n$ steps of equal height, from the floor up to just below a ceiling at
height $V_{ref}$. A **DAC** is told a step number and stands on that step: the number 0 is the floor, the
number 1 is one step up, and the largest number $2^n - 1$ is the top step. Its output voltage is "step
number times step height". Nothing more mysterious happens inside a DAC than turning a number into that
height, and the only design question is how to make the heights exact with a handful of resistors.

An **ADC** does the reverse. Someone stands somewhere on a ramp beside the staircase, at a height we do not
know, and the ADC must report the step they are standing beside. One honest way is to walk up the stairs
one at a time until we pass them (the counter ADC). A faster way is to play "higher or lower": ask whether
they are above the middle step, then above the middle of the half that is left, and so on (the
successive-approximation ADC). A third way is to post a guard on every step at once and count how many
guards see the person above them (the flash ADC). The whole lesson is these three strategies and the
staircase they all share.
:::

:::definition{#dac-basics term="DAC: step size, full scale and resolution" depth="standard"}
An $n$-bit **DAC** with reference voltage $V_{ref}$ maps the code $D = b_{n-1}2^{n-1} + \dots + b_1 2 + b_0$ (an
integer from 0 to $2^n - 1$; $b_{n-1}$ is the MSB) to the output
$$
V_o = V_{ref}\,\frac{D}{2^n} .
$$
- The **step size** (one LSB of output) is $\Delta = V_{ref}/2^n$: the change in $V_o$ when $D$ grows by 1.
- The **full-scale output** is the largest output, all bits 1: $V_{FS} = (2^n - 1)\,\Delta = V_{ref}(1 - 2^{-n})$.
- The **resolution** is the step size, given either in volts ($\Delta$) or as a fraction of full scale:
  $\Delta / V_{FS} = 1/(2^n - 1)$, that is $100/(2^n - 1)$ percent. Some books quote it against $V_{ref}$
  instead, $\Delta / V_{ref} = 1/2^n$; both shrink by half with every extra bit. More bits mean finer steps.

Real DACs often have an inverting amplifier at the output, so the circuits below give $V_o = -V_{ref}D/2^n$
(times a gain set by resistors); the magnitude is what the code controls, and we always say which sign a
circuit produces.
:::

:::derivation{#dac-output-derivation of="the DAC output as a binary fraction of V_ref" depth="standard"}
Divide the code by $2^n$ term by term:
$$
\frac{D}{2^n} = b_{n-1}2^{-1} + b_{n-2}2^{-2} + \dots + b_0 2^{-n} = (0.b_{n-1}b_{n-2}\dots b_0)_2 .
$$
So $V_o = V_{ref} \times 0.b_{n-1}\dots b_0$: the code, read as a binary fraction after the point, is the
fraction of the reference voltage that appears at the output. The MSB alone contributes $V_{ref}/2$, the
next bit $V_{ref}/4$, and the LSB $V_{ref}/2^n = \Delta$.

**Sanity check.** For 4 bits and $V_{ref} = 10$ V: $\Delta = 10/16 = 0.625$ V. The code $1000$ gives
$0.1_2 \times 10 = 5$ V (half the reference, as the MSB should); $1111$ gives $0.1111_2 \times 10 = (15/16) \times 10 = 9.375$ V,
which is $V_{ref} - \Delta$, the full scale. No code reaches 10 V itself, because $0.1111\dots$ with
finitely many 1s is always below 1.
:::

:::trap{#trap-full-scale title="Full scale is not V_ref, and resolution has two forms" depth="standard"}
For a 4-bit DAC with $V_{ref} = 10$ V the tempting answer for "the output for 1111" is 10 V. It is
$9.375$ V: the top step is one step short of the ceiling. The same off-by-one hides in the resolution.
Given the **full-scale output**, the step is $V_{FS}/(2^n - 1)$ (an 8-bit DAC with $V_{FS} = 2.55$ V has
10 mV steps); given the **reference**, it is $V_{ref}/2^n$ ($V_{ref} = 2.56$ V for the same DAC). Dividing
2.55 V by 256 instead of 255 is the expected wrong answer. As a percentage **of full scale** the resolution
is $100/(2^n - 1)$: $6.67\%$ for 4 bits, $0.392\%$ for 8 bits. Some books quote it relative to $V_{ref}$
instead, $100/2^n$ ($6.25\%$, $0.391\%$); read which one the question means. The real error is to mix them,
for example dividing $V_{FS}$ by $2^n$.
:::

## The weighted-resistor DAC

:::intuition{#weighted-intuition title="Every bit pours in its own share of current" depth="standard"}
An inverting amplifier with a feedback resistor $R_f$ has an input node held at 0 V (a **virtual
ground**): whatever current flows into that node is pushed through $R_f$, and the output becomes
$-R_f$ times the total current. So to build a DAC we only need each bit to deliver a current proportional
to its weight. Ohm's law does that for free: connect bit $i$ to the summing node through a resistor, and
when the bit is 1 put $V_{ref}$ on the other end. A resistor half as large passes twice the current. Give
the MSB the smallest resistor, the next bit twice that, and so on: the currents come out in the ratio
$8 : 4 : 2 : 1$, exactly the binary weights, and the amplifier adds them.
:::

:::definition{#weighted-dac term="Binary-weighted resistor DAC" depth="standard"}
For an $n$-bit weighted DAC, bit $i$ (MSB $i = n - 1$) has a resistor $R_i = 2^{n-1-i}R$: the MSB has $R$,
the next bit $2R$, then $4R$, … and the LSB $2^{n-1}R$. A switch connects the free end of $R_i$ to
$V_{ref}$ when $b_i = 1$ and to ground when $b_i = 0$; the other end of every resistor is the summing node
of an inverting amplifier with feedback resistor $R_f$. Then
$$
I_{out} = \sum_i b_i \frac{V_{ref}}{2^{n-1-i}R}, \qquad V_o = -R_f\,I_{out} = -V_{ref}\,\frac{R_f}{R}\,\frac{2D}{2^n} .
$$
With $R_f = R/2$ this is exactly $V_o = -V_{ref}D/2^n$, the ideal DAC with a minus sign.

Many books number the resistors from $2R$ (MSB) to $2^nR$ (LSB) with $R_f = R$ instead. That is the same
circuit with every resistor doubled, and it gives $V_o = -V_{ref}D/2^n$ directly: doubling every input
resistor halves every current, which is exactly what halving $R_f$ did here. When you meet a weighted DAC,
check which resistor the MSB has before using either formula.
:::

:::derivation{#weighted-derivation of="the weighted-resistor DAC output" depth="standard"}
The summing node is at 0 V (virtual ground), so the current through $R_i$ is $V_{ref}/R_i$ when bit $i$ is 1 and
$0/R_i = 0$ when it is 0. Adding, and using $2^{n-1-i} = 2^n/2^{i+1}$:
$$
I_{out} = \frac{V_{ref}}{R}\sum_i b_i\,2^{\,i+1-n} = \frac{V_{ref}}{R}\cdot\frac{2}{2^n}\sum_i b_i 2^i = \frac{2V_{ref}D}{2^nR}.
$$
All of $I_{out}$ flows through $R_f$ (the amplifier's input draws nothing), so $V_o = 0 - R_f I_{out}$.

**Sanity check.** 4 bits, $R = 10$ kΩ, $R_f = 5$ kΩ, $V_{ref} = 5$ V, code $1000$: only the MSB resistor
(10 kΩ) conducts, $I_{out} = 0.5$ mA, $V_o = -2.5$ V $= -5 \times 1/2$. Code $0001$: only the 80 kΩ resistor,
$I_{out} = 0.0625$ mA, $V_o = -0.3125$ V $= -5/16$, one step. Every number here is recomputed in the check
script from each resistor's current (the summing node held at 0 V), not from the formula.
:::

:::note{#weighted-spread title="Why the resistor spread is a problem" depth="standard"}
The ratio of the largest to the smallest resistor is $2^{n-1}$: 8 for 4 bits, 128 for 8 bits, 32 768 for
16 bits. With a 1 kΩ MSB resistor an 8-bit DAC needs a 128 kΩ LSB resistor. Two things go wrong as $n$ grows.
First, every resistor must be accurate to a fraction of the **LSB** current, and the MSB carries $2^{n-1}$
times that current: a 1% error in the MSB resistor shifts the output by more than a whole step as soon as
$2^{n-1} \times 1\% > 1$, which already happens at 8 bits. Second, on a chip, very large and very small resistors
with matching temperature behaviour are hard to make side by side. The R-2R ladder below solves both
problems with only two resistor values.
:::

## The R-2R ladder

:::intuition{#r2r-intuition title="A fair split at every junction" depth="standard"}
Imagine water entering a pipe that branches at a junction into two pipes of equal resistance: half the
flow goes each way. Now let one branch drop straight to the drain, and let the other run on to the next
junction, where it splits in half again, and again. After $n$ junctions the flows in the dropping branches
are $\tfrac12, \tfrac14, \tfrac18, \dots$ of the original: binary weights, made by nothing but **equal
splits**. The R-2R ladder is this plumbing with resistors. The only trick is to make the "run on" branch
look, from each junction, exactly as resistive as the "drop" branch. With a series $R$ followed by a rest of
the ladder that looks like $R$, the run-on branch looks like $2R$, and the drop branch is a $2R$ resistor:
equal, so the current splits fairly.
:::

:::definition{#r2r term="Current-switched R-2R ladder DAC" depth="standard"}
Nodes $A_{n-1}, \dots, A_0$ (MSB end first) are joined in a chain by series resistors $R$. $V_{ref}$
drives $A_{n-1}$. Every node $A_i$ has a **2R leg** to a switch for bit $b_i$: when $b_i = 1$ the leg goes to the
summing node OUT of an inverting amplifier (a virtual ground, 0 V); when $b_i = 0$ it goes to ground. The last
node $A_0$ also has a **2R terminator** to ground. The amplifier's feedback resistor $R_f$ turns the
current collected at OUT into
$$
V_o = -R_f\,I_{out} = -V_{ref}\,\frac{R_f}{R}\sum_{i=0}^{n-1} b_i\,2^{\,i-n} = -V_{ref}\,\frac{R_f}{R}\,\frac{D}{2^n} .
$$
Our convention: bit $i$ has weight $2^i$, so the leg nearest $V_{ref}$ is the MSB $b_{n-1}$ and the leg next to
the terminator is the LSB $b_0$. Only two resistor values, $R$ and $2R$, appear anywhere.
:::

:::theorem{#r2r-theorem name="The R-2R ladder halves its current at every node" depth="standard"}
In the current-switched R-2R ladder, for every code:
1. the resistance seen from each node $A_i$ looking away from $V_{ref}$ (into its leg and the rest of the
   chain) is $R$, so $V_{ref}$ sees $R$ and supplies $I = V_{ref}/R$, **whatever the code**;
2. the node voltages are $V_{ref}, V_{ref}/2, V_{ref}/4, \dots$, that is $A_i = V_{ref}/2^{\,n-1-i}$;
3. the leg currents are $I/2, I/4, \dots, I/2^n$ (MSB leg first), so leg $i$ carries $I\,2^{\,i-n}$, and the
   terminator carries the last $I/2^n$;
4. hence $I_{out} = I \cdot D/2^n$ and $V_o = -V_{ref}(R_f/R)\,D/2^n$.
:::

:::proof{#proof-r2r-theorem of="the R-2R ladder theorem" depth="standard"}
**Idea first:** both switch positions are at 0 V, so the switches never change any resistance; and the
ladder is built so that from each node the "down" leg and the "onward" path are both $2R$.

*Both switch positions are 0 V.* Ground is 0 V and OUT is a virtual ground, also 0 V. So each 2R leg is,
electrically, a $2R$ resistor from its node to 0 V, for either value of its bit. The node voltages and
the currents in the ladder therefore do not depend on the code at all; the code only decides **where**
each leg's current is delivered (to OUT, where it is counted, or to ground, where it is not).

*Every node sees $R$ (induction from the end).* At $A_0$, looking away from $V_{ref}$, there are two $2R$
resistors to 0 V in parallel: $2R \parallel 2R = R$. Suppose that from $A_k$, looking away from $V_{ref}$,
the network (the leg of $A_k$ and everything beyond it) looks like $R$. From $A_{k+1}$ the onward path is
the series $R$ into $A_k$ plus that $R$, i.e. $2R$, in parallel with $A_{k+1}$'s own $2R$ leg:
$2R \parallel 2R = R$. So every node, including $A_{n-1}$, sees $R$, and $V_{ref}$ supplies $I = V_{ref}/R$.

*Equal splits.* At $A_{n-1}$ the current $I$ meets two paths of $2R$ each (its leg, and the series $R$ plus
the $R$ beyond), so each takes $I/2$. The node voltage is $V_{ref}$ and the leg current is $V_{ref}/2R = I/2$.
The $I/2$ that goes on drops $R \cdot I/2 = V_{ref}/2$ across the series resistor, so $A_{n-2} = V_{ref}/2$, and
there it splits equally again into $I/4$ and $I/4$. Repeating, $A_i = V_{ref}/2^{n-1-i}$ and leg $i$ carries
$I/2^{\,n-i}$; at $A_0$ the leg and the terminator share the last $I/2^{n-1}$ equally, $I/2^n$ each. That is
claims 2 and 3.

*Output.* $I_{out}$ is the sum of the currents of the legs whose bit is 1: $I\sum_i b_i 2^{i-n} = I\,D/2^n$, and
$V_o = -R_f I_{out}$. With $I = V_{ref}/R$ this is claim 4. (The check script solves the node equations of the
whole ladder exactly, in fractions, for every $n$ up to 8 and many codes, and finds exactly these values.)
:::

The animation solves the 3-bit ladder of the next erratum note: it reduces the ladder from the end, then
shows the node voltages, the halving currents and three codes.

:::viz{#r2r-viz spec="r2r-ladder-currents" mode="animate" depth="standard"}
:::

:::note{#erratum-c397 title="A misprint to avoid (the ladder's currents)" depth="standard"}
A common printed example takes a 3-bit current-switched ladder with $V_{ref} = 5$ V and $R = R_f = 2$ kΩ,
selects only the smallest branch current, and slips twice. The reference current is
$I = V_{ref}/R = 5\text{ V}/2\text{ kΩ} = \mathbf{2.5}$ **mA** (not 25 mA). The selected LSB leg carries $I/8 = 0.3125$ mA, so
$$
V_o = -R_f\,\frac{I}{8} = -(2\text{ kΩ})(0.3125\text{ mA}) = \mathbf{-0.625\ V}
$$
(not $-0.3125$ V). The same printed pages also swap which end of the ladder is called the MSB between
figures. Fix one convention and keep it: here the leg nearest $V_{ref}$ carries $I/2$ and is the MSB; the leg
next to the terminator carries $I/2^n$ and is the LSB. Check: code 001 is one step, $-5 \times 1/8 = -0.625$ V.
:::

:::note{#voltage-mode title="The voltage-switched ladder" depth="deep"}
The ladder can also be used the other way round. Put the 2R terminator at the LSB end, switch each 2R leg
between $V_{ref}$ (bit 1) and ground (bit 0), and take the output at the MSB node (buffered, so no current is
drawn). Superposition gives the same binary fraction: with $V_{ref} = 8$ V, code 100 gives 4 V and code 010
gives 2 V, and in general $V_{out} = V_{ref}\,D/2^n$. Looking from any node towards the LSB end (its own leg
included, sources shorted), the ladder's Thévenin resistance is $R$, by the same induction as in the
theorem; so each switched leg's contribution is halved at every node on its way to the output. The difference is
practical: in the voltage-switched form the node voltages change with the code (stray capacitances must
charge), while in the current-switched form every node stays at a fixed voltage and only the destination
of each current changes, which is faster. The check script solves this ladder too.
:::

:::trick{#trick-binary-fraction title="Read the output as V_ref × 0.b…b" depth="standard"}
For any of these DACs with unity gain ($R_f = R$ for the ladder), write a binary point in front of the
code and multiply by $V_{ref}$: $V_{ref} = 10$ V and code $1011$ give $10 \times 0.1011_2 = 10 \times 11/16 = 6.875$ V.
To go the other way (which code gives 3 V?), divide by the step and write the integer in binary.

**Why it works:** the derivation above, $D/2^n = 0.b_{n-1}\dots b_0$. **When it fails:** when the gain is not 1
(multiply by $R_f/R$ for the ladder, by $2R_f/R$ for the weighted DAC with MSB resistor $R$), when the circuit
inverts (put the minus sign back), and when the code is not plain binary (offset-binary or 2's complement
DACs shift the staircase).
:::

The Converter Bench's DAC tab is this ladder for 1 to 8 bits with your own $V_{ref}$, $R$ and $R_f$. Toggle
the bits (or slide the code) and watch the node voltages stay put while the currents change destination;
the staircase underneath shows all $2^n$ outputs at once. The first example button loads the corrected
printed example.

:::lab{#lab-dac lab="converter-bench" tab="dac" depth="standard"}
:::

### Worked examples: DAC outputs

::::example{#ex-dac-easy level="easy" title="Step, output and full scale of a 4-bit DAC" depth="quick"}
A 4-bit DAC has $V_{ref} = 10$ V and output $V_{ref}D/2^n$. Find the step size, the output for $1011$, the
full-scale output and the resolution in percent.

:::step{why="The step is the output change for one count, the reference divided by the number of codes."}
$\Delta = 10/2^4 = 0.625$ V.
:::

:::step{why="The output is the code times the step; equivalently V_ref times the binary fraction 0.1011."}
$1011 = 11$, so $V_o = 11 \times 0.625 = 6.875$ V $= 10 \times 0.6875$.
:::

:::step{why="Full scale is all 1s, fifteen steps, one step short of V_ref; the resolution compares one step with that full scale."}
$V_{FS} = 15 \times 0.625 = 9.375$ V; resolution $= 1/15 = 6.67\%$ of full scale.
:::

:::answer
Step 0.625 V, output 6.875 V, full scale 9.375 V, resolution 6.67%.
:::
::::

::::example{#ex-dac-fullscale level="medium" title="From a full-scale rating to the step and a code" depth="standard"}
An 8-bit DAC is rated at a full-scale output of 2.55 V. What is its step, what reference does that
imply, what is its resolution, and which code gives exactly 1.00 V?

:::step{why="Full scale is (2^n − 1) steps, so divide by 255, not 256."}
$\Delta = 2.55/255 = 0.01$ V $= 10$ mV.
:::

:::step{why="The reference is 2^n steps (the ceiling the staircase never reaches)."}
$V_{ref} = 256 \times 0.01 = 2.56$ V.
:::

:::step{why="Resolution as a percentage of full scale is one step out of 2^n − 1."}
$100/255 = 0.392\%$.
:::

:::step{why="The code is the voltage divided by the step, written in binary."}
$1.00/0.01 = 100 = 0110\,0100_2$; check: $2.56 \times 100/256 = 1.00$ V.
:::

:::answer
10 mV per step, $V_{ref} = 2.56$ V, resolution 0.392%, code $0110\,0100$.
:::
::::

::::example{#ex-dac-weighted level="medium" title="A weighted-resistor DAC by currents" depth="standard"}
A 4-bit weighted-resistor DAC has resistors 10, 20, 40 and 80 kΩ (MSB first), $V_{ref} = 5$ V and
$R_f = 5$ kΩ. Find $I_{out}$ and $V_o$ for the code $0110$, and the resistor spread for an 8-bit version.

:::step{why="Only the bits that are 1 connect their resistor to V_ref; the other end of each resistor is at the 0 V summing node."}
Bits 2 and 1 are 1: $5/20 = 0.25$ mA and $5/40 = 0.125$ mA.
:::

:::step{why="The amplifier adds the currents and pushes them through R_f."}
$I_{out} = 0.375$ mA, $V_o = -5 \times 0.375 = -1.875$ V.
:::

:::step{why="Sanity check with the formula: R_f = R/2 makes this the ideal DAC, V_o = −V_ref D/2^n."}
$-5 \times 6/16 = -1.875$ V. Agreed.
:::

:::step{why="The LSB resistor is 2^(n−1) times the MSB resistor."}
8 bits: spread $2^7 = 128$, from 10 kΩ to 1.28 MΩ.
:::

:::answer
$I_{out} = 0.375$ mA, $V_o = -1.875$ V; an 8-bit version needs a 128 : 1 resistor spread.
:::
::::

::::example{#ex-dac-ladder level="gate" title="The R-2R ladder example, done right" depth="standard"}
A 3-bit current-switched R-2R ladder has $V_{ref} = 5$ V and $R = R_f = 2$ kΩ. Find the reference
current, every node voltage and leg current, and $V_o$ for the code $001$.

:::step{why="Every node sees R looking away from the source (the theorem), so the source sees R, whatever the code."}
$I = V_{ref}/R = 5/2 = 2.5$ mA.
:::

:::step{why="Each node splits its current into two equal halves, so the node voltages halve from the source end."}
$A_2 = 5$ V, $A_1 = 2.5$ V, $A_0 = 1.25$ V.
:::

:::step{why="A leg's current is its node voltage over 2R; the terminator takes the same as the last leg."}
Legs: $5/4 = 1.25$ mA (MSB), $0.625$ mA, $0.3125$ mA (LSB); terminator $0.3125$ mA. Total $2.5$ mA.
:::

:::step{why="Code 001 routes only the LSB leg to OUT; the amplifier converts that current."}
$I_{out} = 0.3125$ mA, $V_o = -2 \times 0.3125 = -0.625$ V.
:::

:::answer
$I = 2.5$ mA; $V_o = -0.625$ V, one step of $V_{ref}/8$. (The misprinted versions, 25 mA and
$-0.3125$ V, both fail the check $-V_{ref}D/2^n = -5/8$.)
:::
::::

::::example{#ex-dac-edge level="gate" title="Edge case: all bits 1, and where the rest of the current goes" depth="standard"}
For the same ladder, find $I_{out}$, $V_o$ and the current into ground for the code $111$. Does the
reference current change?

:::step{why="All three legs now go to OUT; their currents are unchanged because both switch positions are at 0 V."}
$I_{out} = 1.25 + 0.625 + 0.3125 = 2.1875$ mA.
:::

:::step{why="The output is −R_f times the collected current."}
$V_o = -2 \times 2.1875 = -4.375$ V $= -5 \times 7/8$.
:::

:::step{why="The terminator never switches: its current always goes to ground."}
Into ground: $0.3125$ mA; $2.1875 + 0.3125 = 2.5$ mA, the same reference current as for every code.
:::

:::answer
$V_o = -4.375$ V, not $-5$ V: full scale is $V_{ref}(1 - 2^{-n})$ because the terminator's $I/2^n$ is
never counted. The source current stays 2.5 mA for all eight codes.
:::
::::

:::note{#recap-dac title="Recap" depth="quick"}
$V_o = V_{ref}D/2^n = V_{ref} \times 0.b_{n-1}\dots b_0$ (times the gain, with the sign of the circuit); step
$V_{ref}/2^n$; full scale one step short of $V_{ref}$; resolution $1/(2^n - 1)$ of full scale ($1/2^n$ against $V_{ref}$). The weighted DAC needs a
$2^{n-1}$ resistor spread; the R-2R ladder uses $R$ and $2R$ only, sees $R$ from every node, halves its current at
each node and draws $V_{ref}/R$ for every code.
:::

## Measuring a voltage: the ADC

:::intuition{#adc-intuition title="Reading a ruler" depth="standard"}
Measuring a length with a ruler marked in millimetres, you report the last mark the object reaches: an
object 23.7 mm long is "23 mm" if you truncate, "24 mm" if you round to the nearest mark. Either way you
lose a little, at most one mark if you truncate and at most half a mark if you round. That loss is not a
fault of the ruler; it is the price of writing an infinitely precise length with finitely many marks.

An ADC is a ruler for voltage whose marks are the DAC's steps, $\Delta = V_{ref}/2^n$ apart. The code it
reports is the number of the mark, and the unavoidable loss is called **quantisation error**. Which mark
it reports (the one below, or the nearest) depends on one small design choice, a half-step offset, which
we make explicit.
:::

:::definition{#adc-basics term="Quantisation, LSB and quantisation error" depth="standard"}
An $n$-bit ADC with reference $V_{ref}$ has $2^n$ codes and an **LSB** of $\Delta = V_{ref}/2^n$. For an input
$0 \le V_{in}$ it reports
$$
D = \left\lfloor \frac{V_{in}}{\Delta} \right\rfloor \ \text{(truncating)}, \qquad
D = \left\lfloor \frac{V_{in}}{\Delta} + \frac12 \right\rfloor \ \text{(with the half-LSB offset: rounding)},
$$
clipped to the range $0 \dots 2^n - 1$. The code stands for the voltage $V_q = D\,\Delta$, and the
**quantisation error** is $e = V_{in} - V_q$. In hardware the ½-LSB offset is a DAC (or a threshold ladder)
shifted half a step down, so every decision is made half a step early. Inputs at or above $V_{ref} - \Delta/2$
(rounding) or $V_{ref}$ (truncating) are **over range**: the code saturates at $2^n - 1$.
:::

:::theorem{#quant-error-theorem name="Quantisation error bounds" depth="standard"}
For an input inside the range ($0 \le V_{in} < V_{ref}$ for truncation, $0 \le V_{in} < V_{ref} - \Delta/2$ for
rounding), the quantisation error satisfies
$$
0 \le e < \Delta \ \ \text{(truncating)}, \qquad -\tfrac{\Delta}{2} \le e < \tfrac{\Delta}{2} \ \ \text{(rounding)}.
$$
:::

:::proof{#proof-quant-error-theorem of="the quantisation error bounds" depth="standard"}
**Idea first:** a floor never overshoots and never falls short by a whole unit; rounding is a floor of a value
shifted by half a unit.

Write $x = V_{in}/\Delta$. In range, $0 \le x < 2^n$, so $D = \lfloor x \rfloor$ is a valid code and no clipping
happens. By the definition of the floor, $D \le x < D + 1$; multiplying by $\Delta$, $D\Delta \le V_{in} < D\Delta + \Delta$,
that is $0 \le e < \Delta$. With the offset, $D = \lfloor x + \tfrac12 \rfloor$ satisfies $D \le x + \tfrac12 < D + 1$, so
$-\tfrac12 \le x - D < \tfrac12$; the range condition $x < 2^n - \tfrac12$ keeps $D \le 2^n - 1$. Multiplying by
$\Delta$ gives $-\Delta/2 \le e < \Delta/2$. Outside the range the code is clipped and the bound fails; the edge-case
example below shows by how much.
:::

:::trap{#trap-half-lsb title="'The error is always ±½ LSB'" depth="standard"}
The phrase "quantisation error is $\pm\frac12$ LSB" is true only for a converter with the ½-LSB offset, and only
in range. A plain truncating converter (the SAR with no offset, the counter ADC of this lesson) has error
from 0 up to almost **1 LSB**, always on the same side. With 8 bits, $V_{ref} = 5.12$ V and $V_{in} = 3.37$ V, the
truncating code is 168 ($V_q = 3.36$ V, error $+10$ mV $= +0.5$ LSB), while the rounding code is 169
($V_q = 3.38$ V, error $-10$ mV). The expected wrong answer is to quote one converter's code and the other
converter's error bound.
:::

:::intuition{#flash-intuition title="A guard on every step" depth="standard"}
The fastest possible ADC asks every question at once. Put a comparator at every one of the $2^n - 1$
step heights between the floor and the top step, all fed the same input. Every comparator whose threshold
is at or below $V_{in}$ says 1, every one above says 0, so the outputs read like a mercury thermometer: a
column of 1s up to the input's level, 0s above. Counting the 1s gives the code, in one comparator delay plus
an encoder delay, whatever the input. The price is the number of guards.
:::

:::definition{#flash-adc term="Flash (parallel) ADC" depth="standard"}
A string of $2^n$ equal resistors divides $V_{ref}$ into the thresholds $k\Delta$ for
$k = 1, \dots, 2^n - 1$ (with the offset, the bottom resistor is $R/2$ and the top one $3R/2$, which
shifts every threshold down by $\Delta/2$). Comparator $k$ outputs $c_k = 1$ when $V_{in} \ge k\Delta$.
The outputs form a **thermometer code** ($c_k = 1$ implies $c_j = 1$ for every $j < k$), and a priority
encoder with $2^n - 1$ inputs and $n$ outputs ([Chapter 5, Lesson 3](lesson:decoders-encoders))
outputs the index of the highest comparator that is 1, which equals the number of 1s: the code $\lfloor V_{in}/\Delta \rfloor$. Cost: $2^n - 1$ comparators and $2^n$
resistors, so every extra bit **doubles** the hardware; speed: one conversion per clock.
:::

:::intuition{#counter-intuition title="Walking up the stairs" depth="standard"}
The cheapest ADC needs only one comparator and a DAC. Start a counter at 0, feed it to the DAC, and let
the staircase climb one step per clock. As long as the next step is still not above the input, keep
climbing; the first time the next step would be above the input, stop. The counter then holds the number
of the step just below the input. It is slow for large inputs, because it can only climb one step at a
time.
:::

:::definition{#counter-adc term="Counter (ramp) ADC" depth="standard"}
A counter drives a DAC, and a comparator compares $V_{in}$ with the staircase. In our model the comparator
checks, before each clock, whether the next step $(D + 1)\Delta$ is still $\le V_{in}$; if it is, the clock advances
the counter. So the conversion stops at $D = \lfloor V_{in}/\Delta \rfloor$ (or at $2^n - 1$), and **code $D$ costs $D$
clocks**: the conversion time depends on the input, with a worst case of $2^n - 1$ clocks at full scale.
A **tracking** (servo) variant counts up or down from the previous result instead of restarting from 0,
which is fast for slowly changing inputs.
:::

:::trap{#trap-counter-time title="Counter ADC: 2ⁿ − 1 or 2ⁿ clocks?" depth="standard"}
Books differ by one clock. If the staircase is allowed to overshoot and the comparator stops the count
one step **after** passing the input, the worst case is $2^n$ clocks (and the code is one higher unless the
logic subtracts it back). In this lesson's model the comparator looks one step ahead, so code $D$ costs
exactly $D$ clocks and the worst case is $2^n - 1$: $1023$ clocks for 10 bits, $1023\ \mu$s at 1 MHz. Read
the question's description of when the counter stops. Either way the counter ADC is about $2^n/n$ times
slower than a SAR in the worst case, which is the comparison examiners care about.
:::

:::definition{#dual-slope term="Dual-slope ADC (in brief)" depth="deep"}
A dual-slope ADC integrates $V_{in}$ for a fixed $N_1$ clocks, then integrates $-V_{ref}$ until the integrator
is back at zero, counting the clocks $N_2$. The integrator's charge going up equals the charge going down:
$V_{in} N_1 = V_{ref} N_2$, so
$$
N_2 = N_1\,\frac{V_{in}}{V_{ref}} .
$$
The resistor, the capacitor and the clock period cancel out of this ratio, which makes the converter very
accurate and immune to noise at the mains frequency (if $N_1$ clocks span whole mains periods), but slow:
a conversion takes $N_1 + N_2$ clocks, thousands of them. It is the converter inside digital multimeters.
:::

### Worked examples: ADC codes and conversion times

::::example{#ex-adc-flash level="easy" title="A 3-bit flash ADC reads 5.3 V" depth="quick"}
A 3-bit flash ADC has $V_{ref} = 8$ V (no offset). How many comparators and resistors does it use, what do
the comparators output for $V_{in} = 5.3$ V, and what is the code?

:::step{why="Thresholds sit at the 2^n − 1 inner step heights; the resistor string needs one more resistor than thresholds."}
$\Delta = 1$ V; thresholds 1, 2, …, 7 V: 7 comparators, 8 resistors.
:::

:::step{why="A comparator outputs 1 when the input is at or above its threshold; 5.3 V is above 1 to 5 V and below 6 and 7 V."}
From the top (7 V) down: $0\,0\,1\,1\,1\,1\,1$, a thermometer code with five 1s.
:::

:::step{why="The priority encoder reports the highest comparator that is 1, which is the number of 1s."}
Code $5 = 101$.
:::

:::answer
7 comparators, 8 resistors, outputs $0011111$, code $101$ ($V_q = 5$ V, error 0.3 V).
:::
::::

::::example{#ex-adc-quant level="medium" title="An 8-bit code, truncated and rounded" depth="standard"}
An 8-bit ADC has $V_{ref} = 5.12$ V. Find its LSB and the code for $V_{in} = 3.37$ V without and with the
½-LSB offset, with the quantisation error in each case.

:::step{why="The LSB is the reference divided by the number of codes."}
$\Delta = 5.12/256 = 0.02$ V $= 20$ mV.
:::

:::step{why="Divide the input by the LSB to see where it falls on the staircase."}
$3.37/0.02 = 168.5$: exactly half-way between steps 168 and 169.
:::

:::step{why="Truncation takes the floor; the offset adds half an LSB first, and a value exactly at the half rounds up."}
Truncating: $D = 168 = 1010\,1000$, $V_q = 3.36$ V, $e = +10$ mV. Rounding: $\lfloor 169 \rfloor = 169 = 1010\,1001$, $V_q = 3.38$ V, $e = -10$ mV.
:::

:::answer
LSB 20 mV; codes 168 (truncating, error $+\frac12$ LSB) and 169 (rounding, error $-\frac12$ LSB). This input is
the worst case for the rounding converter and a middling one for the truncating converter.
:::
::::

::::example{#ex-adc-dual level="medium" title="A dual-slope count" depth="standard"}
A dual-slope ADC integrates the input for $N_1 = 1000$ clocks and has $V_{ref} = 2$ V. How many clocks does
the second ramp take for $V_{in} = 0.75$ V, and how long is the whole conversion?

:::step{why="Equal charge up and down: V_in N1 = V_ref N2."}
$N_2 = 1000 \times 0.75/2 = 375$.
:::

:::step{why="The conversion is the fixed first phase plus the measured second phase."}
$N_1 + N_2 = 1375$ clocks.
:::

:::answer
375 clocks of de-integration, 1375 in all. The count 375 is the reading: 0.375 of $V_{ref}$, in thousandths.
:::
::::

::::example{#ex-adc-times level="gate" title="Comparators and conversion times for 10 bits" depth="standard"}
A 10-bit ADC is to run from a 1 MHz clock with $V_{ref} = 10.24$ V. Compare a flash, a SAR and a counter
design: comparators, worst-case conversion time, and the counter's time for $V_{in} = 3.00$ V.

:::step{why="A flash ADC needs a comparator for every inner threshold and converts in one clock."}
Flash: $2^{10} - 1 = 1023$ comparators, 1 clock $= 1\ \mu$s.
:::

:::step{why="A SAR decides one bit per clock with one comparator."}
SAR: 1 comparator, 10 clocks $= 10\ \mu$s, for every input.
:::

:::step{why="A counter ADC climbs one step per clock; the worst case is the top code."}
Counter: 1 comparator, up to $1023$ clocks $= 1023\ \mu$s.
:::

:::step{why="For a given input the counter needs as many clocks as the code; the LSB is 10.24/1024 = 10 mV."}
$3.00/0.01 = 300$, so code 300 after $300\ \mu$s.
:::

:::answer
Flash 1023 comparators and $1\ \mu$s; SAR 1 comparator and $10\ \mu$s; counter 1 comparator and up to
$1023\ \mu$s ($300\ \mu$s for 3.00 V). The SAR is the usual compromise: one comparator, $n$ clocks.
:::
::::

::::example{#ex-adc-edge level="gate" title="Edge case: an input in the top half-step" depth="standard"}
A 4-bit ADC has $V_{ref} = 8$ V. What code does it give for $V_{in} = 7.9$ V, with and without the offset, and
does the error stay within the bounds of the theorem?

:::step{why="Locate the input on the staircase in units of the LSB."}
$\Delta = 0.5$ V; $7.9/0.5 = 15.8$.
:::

:::step{why="Truncation gives the floor; 15 is a valid code, so this input is in range for the truncating converter."}
Truncating: $D = 15 = 1111$, $V_q = 7.5$ V, $e = 0.4$ V $= 0.8$ LSB, inside $[0, 1)$ LSB.
:::

:::step{why="Rounding would want 16, which does not exist in 4 bits, so the code is clipped."}
Rounding: $\lfloor 16.3 \rfloor = 16 \to 15$, $e = 0.4$ V $= 0.8$ LSB: **outside** $\pm\frac12$ LSB.
:::

:::answer
Code $1111$ either way. For the rounding converter, every input from $V_{ref} - \Delta/2 = 7.75$ V upwards is over
range, so the ±½ LSB promise only holds below 7.75 V. Above $V_{ref}$ both converters saturate and the error
grows without bound.
:::
::::

:::note{#recap-adc title="Recap" depth="quick"}
LSB $= V_{ref}/2^n$; truncating code $\lfloor V_{in}/\Delta \rfloor$ with error in $[0, \Delta)$; rounding (½-LSB offset) with
error in $[-\Delta/2, \Delta/2)$; both only in range. Flash: $2^n - 1$ comparators, 1 clock. Counter: 1 comparator,
code $D$ in $D$ clocks, worst $2^n - 1$. Dual slope: $N_2 = N_1V_{in}/V_{ref}$, accurate and slow.
:::

## Successive approximation: a binary search in hardware

:::intuition{#sar-intuition title="Higher or lower?" depth="standard"}
"I am thinking of a number from 0 to 15." The quickest way to find it is not to ask "is it 0? is it 1?"
but "is it at least 8?" If yes, the number is in 8–15; ask "at least 12?"; if no, it is in 8–11; ask "at
least 10?", and so on. Each answer halves the possibilities, so four questions always suffice for sixteen
numbers. Notice that each question is really about one **bit**: "at least 8?" decides the MSB, "at least
12?" (given the MSB is 1) decides the next bit, and so on down. The successive-approximation ADC plays exactly
this game against the input voltage: the register proposes a code, a DAC turns it into a voltage, and one
comparator answers "is the input at least that high?"
:::

:::definition{#sar-adc term="Successive-approximation (SAR) ADC" depth="standard"}
A SAR ADC has a **successive-approximation register** (the code under construction), a DAC, one comparator
and a small controller. The register starts at $0\dots0$. On clock $j = 1, \dots, n$, for bit $k = n - j$
(MSB first):
1. **try:** set bit $k$ to 1 (the **trial code** keeps the bits already decided);
2. **compare:** the DAC outputs $V_{DAC} = \text{trial} \times \Delta$ (minus $\Delta/2$ with the offset);
3. **decide:** if $V_{in} \ge V_{DAC}$ the bit **stays** 1, otherwise it is **cleared** to 0.

After $n$ clocks the register holds the result. One comparator, one DAC, $n$ clocks for every input. A tie
($V_{in} = V_{DAC}$) keeps the bit, which is what makes the result the floor.
:::

:::theorem{#sar-theorem name="n clocks give the floor code" depth="standard"}
For $0 \le V_{in} < V_{ref}$ and no offset, after $n$ clocks the SAR register holds
$D^* = \lfloor V_{in}/\Delta \rfloor$; for $V_{in} \ge V_{ref}$ it holds $2^n - 1$. With the ½-LSB offset it holds
$\lfloor V_{in}/\Delta + \tfrac12 \rfloor$, clipped to $2^n - 1$.
:::

:::proof{#proof-sar-theorem of="the SAR theorem" depth="standard"}
**Idea first:** keep an interval of codes that is known to contain the answer; each clock halves it, and
after $n$ halvings of $2^n$ codes one code is left.

Let $D^*$ be the clipped floor code. Define, before clock $j$, the interval $[lo, hi)$ of codes consistent with
the bits decided so far: $lo$ = the register (decided bits, lower bits 0) and $hi = lo + 2^{k+1}$, where $k$ is the
bit about to be tried. Initially $[0, 2^n)$. **Invariant:** $lo \le D^* < hi$. It holds at the start because every
code is in $[0, 2^n)$.

At clock $j$ the trial code is $t = lo + 2^k$, the midpoint of the interval, and the comparator tests
$V_{in} \ge t\Delta$. Since $t$ is an integer, $V_{in} \ge t\Delta \iff V_{in}/\Delta \ge t \iff \lfloor V_{in}/\Delta \rfloor \ge t$ (the floor of a number is at
least an integer exactly when the number is). If the input is over range, $D^* = 2^n - 1 \ge t$ and $V_{in} \ge V_{ref} > t\Delta$,
so again "keep" $\iff D^* \ge t$. So the bit is kept exactly when $D^* \ge t$: then the new interval $[t, hi)$ contains $D^*$;
otherwise $D^* < t$ and the new interval $[lo, t)$ contains it. Either way the invariant survives and the interval
halves. After $n$ clocks its length is $2^n/2^n = 1$, so $lo = D^*$, and $lo$ is the register.

With the offset the comparator tests $V_{in} \ge (t - \tfrac12)\Delta$, that is $V_{in}/\Delta + \tfrac12 \ge t$, and the same argument with
$x + \tfrac12$ in place of $x$ gives the rounded code.
:::

The animation runs the search for a 4-bit converter with $V_{ref} = 10$ V and $V_{in} = 6.4$ V: the shaded
column is the interval of codes still possible at each clock, the bar is the trial DAC level, green when
the bit is kept and red when it is cleared.

:::viz{#sar-viz spec="sar-binary-search" mode="animate" depth="standard"}
:::

:::table{#adc-compare title="Three ADCs side by side (n bits)" depth="standard"}
| Type | Comparators | Clocks per conversion | Depends on V_in? | Typical use |
|:--|:--|:--|:--|:--|
| Flash | $2^n - 1$ | 1 | no | very fast, few bits (video, radar) |
| Successive approximation | 1 (plus an $n$-bit DAC) | $n$ | no | the general-purpose choice (microcontrollers) |
| Counter (ramp) | 1 (plus an $n$-bit DAC) | $D$, worst $2^n - 1$ | yes | simplest, slow |
| Dual slope | 1 (plus an integrator) | $N_1 + N_2$, thousands | yes | precise, slow (meters) |
:::

:::trap{#trap-sar-time title="SAR time does not depend on the input" depth="standard"}
"A larger input takes longer to convert" is true of the counter ADC and false of the SAR. A SAR always makes
exactly $n$ decisions, one per clock, so a 12-bit SAR at 2 MHz takes $12 \times 0.5\ \mu\text{s} = 6\ \mu$s for 0 V and
for full scale alike. The expected wrong answers are $2^{12} - 1$ clocks (the counter's worst case) and $12\ \mu$s (forgetting
that a 2 MHz clock period is $0.5\ \mu$s).
:::

The SAR tab of the Converter Bench runs this search for 3 to 8 bits with any $V_{ref}$ and input, with or
without the ½-LSB offset. Step one clock at a time and predict each decision before you press: the table
records the trial code, the DAC voltage and the comparator's answer, and the chart shows the interval
halving. The example buttons load the worked examples of this lesson: the five SAR examples below (the
tie included) and the over-range input of the ADC edge case with the ½-LSB offset on.

:::lab{#lab-sar lab="converter-bench" tab="sar" depth="standard"}
:::

### Worked examples: SAR traces

::::example{#ex-sar-easy level="easy" title="A 3-bit SAR finds 5.3 V" depth="quick"}
A 3-bit SAR ADC has $V_{ref} = 8$ V (no offset) and $V_{in} = 5.3$ V. Trace the three clocks.

:::step{why="The LSB is 8/8 = 1 V, so the DAC output in volts equals the trial code; the first trial sets the MSB."}
Clock 1: trial $100$, $V_{DAC} = 4$ V; $5.3 \ge 4$, keep: $100$.
:::

:::step{why="The next trial adds bit 1 to the kept bits."}
Clock 2: trial $110$, $V_{DAC} = 6$ V; $5.3 < 6$, clear: $100$.
:::

:::step{why="The last trial adds bit 0."}
Clock 3: trial $101$, $V_{DAC} = 5$ V; $5.3 \ge 5$, keep: $101$.
:::

:::answer
Code $101 = 5$ after 3 clocks, error 0.3 V; the same code as the flash ADC of the earlier example.
:::
::::

::::example{#ex-sar-medium level="medium" title="A 4-bit SAR, step by step" depth="standard"}
A 4-bit SAR ADC has $V_{ref} = 10$ V (no offset). Convert $V_{in} = 6.4$ V.

:::step{why="The LSB fixes the DAC voltage of every trial code."}
$\Delta = 10/16 = 0.625$ V.
:::

:::step{why="MSB first: trial 1000 is 8 steps."}
Clock 1: $1000 \to 5$ V; $6.4 \ge 5$, keep. Clock 2: $1100 \to 7.5$ V; $6.4 < 7.5$, clear.
:::

:::step{why="Each trial is the midpoint of the codes still possible: 8 to 11 after clock 2."}
Clock 3: $1010 \to 6.25$ V; $6.4 \ge 6.25$, keep. Clock 4: $1011 \to 6.875$ V; $6.4 < 6.875$, clear.
:::

:::answer
Code $1010 = 10$, $V_q = 6.25$ V, error $0.15$ V $= 0.24$ LSB, as the floor rule $\lfloor 6.4/0.625 \rfloor = \lfloor 10.24 \rfloor = 10$ predicts.
:::
::::

::::example{#ex-sar-gate level="gate" title="An 8-bit SAR trace and its conversion time" depth="standard"}
An 8-bit SAR ADC with $V_{ref} = 5.12$ V (no offset) converts $V_{in} = 3.37$ V from a 1 MHz clock. List the
trials, the result and the conversion time.

:::step{why="The LSB is 20 mV, so trial code t gives t × 0.02 V."}
$1000\,0000 \to 2.56$ keep; $1100\,0000 \to 3.84$ clear; $1010\,0000 \to 3.20$ keep; $1011\,0000 \to 3.52$ clear.
:::

:::step{why="The remaining four clocks refine the low nibble the same way."}
$1010\,1000 \to 3.36$ keep; $1010\,1100 \to 3.44$ clear; $1010\,1010 \to 3.40$ clear; $1010\,1001 \to 3.38$ clear.
:::

:::step{why="One clock per bit, whatever the input."}
8 clocks $\times 1\ \mu$s $= 8\ \mu$s.
:::

:::answer
Code $1010\,1000 = 168$ ($3.36$ V, error $+10$ mV) in $8\ \mu$s, the truncating code of the earlier example. The
last trial (3.38 V) is the only one that the rounding converter would decide differently (with the offset its
DAC level drops to 3.37 V, a tie with the input, which keeps the bit: code 169).
:::
::::

::::example{#ex-sar-offset level="gate" title="The ½-LSB offset changes the last decision" depth="standard"}
Repeat the 4-bit conversion ($V_{ref} = 10$ V) for $V_{in} = 6.6$ V, first without and then with the ½-LSB offset.

:::step{why="Without the offset the DAC levels are the trial codes times 0.625 V."}
No offset: $5$ keep, $7.5$ clear, $6.25$ keep, $6.875$ clear: $1010 = 10$ ($6.25$ V, error $0.35$ V $= 0.56$ LSB).
:::

:::step{why="The offset lowers every DAC level by half a step, 0.3125 V."}
With offset: $4.6875$ keep, $7.1875$ clear, $5.9375$ keep, $6.5625$ **keep**: $1011 = 11$.
:::

:::step{why="Check against the rounding formula: 6.6/0.625 = 10.56, and adding one half gives 11.06."}
$\lfloor 11.06 \rfloor = 11$; $V_q = 6.875$ V, error $-0.275$ V $= -0.44$ LSB.
:::

:::answer
$1010$ without the offset (error $+0.56$ LSB), $1011$ with it (error $-0.44$ LSB, inside $\pm\frac12$). Only the last
comparison changed: $6.6 \ge 6.5625$ but $6.6 < 6.875$.
:::
::::

::::example{#ex-sar-edge level="gate" title="Edge case: an input exactly on a step" depth="standard"}
A 4-bit SAR has $V_{ref} = 16$ V (so $\Delta = 1$ V) and $V_{in} = 10$ V exactly. Trace it, then say what a comparator
that clears the bit on a tie (keeps only when $V_{in} > V_{DAC}$) would give.

:::step{why="With a 1 V LSB each trial code is its own voltage."}
$1000 \to 8$ keep; $1100 \to 12$ clear; $1010 \to 10$: a **tie**, $10 \ge 10$, keep; $1011 \to 11$ clear.
:::

:::step{why="The result should be the floor of 10/1, which is 10."}
Result $1010 = 10$, error 0.
:::

:::step{why="A strict comparator clears on the tie, and the search then wanders below the true value."}
Strict: $8$ keep, $12$ clear, $10$ clear, $1001 \to 9$ keep: result $1001 = 9$, error $1$ V $= 1$ LSB.
:::

:::answer
$1010$ with "keep on $\ge$"; $1001$ with a strict comparator, a full LSB low. The proof of the theorem used
$V_{in} \ge t\Delta \iff \lfloor V_{in}/\Delta \rfloor \ge t$, which needs the tie to keep the bit. (A real comparator's tie is
decided by noise; the point is that the rule must be stated.)
:::
::::

:::note{#recap-sar title="Recap" depth="quick"}
SAR: try the next bit, compare $V_{in}$ with the trial's DAC voltage, keep on $\ge$, clear otherwise; $n$ clocks and
one comparator for every input. The trial is the midpoint of the codes still possible, so the search halves an
interval and ends on $\lfloor V_{in}/\Delta \rfloor$ (rounded with the ½-LSB offset). Time: $n \times T_{clk}$.
:::

## Practice

Our own questions in GATE formats: two warm-ups, then exam-level questions on the ladder and the ADCs.

:::practice{id="nx-dl-07-02-q01" depth="standard"}
:::

:::practice{id="nx-dl-07-02-q02" depth="standard"}
:::

:::practice{id="nx-dl-07-02-q03" depth="standard"}
:::

:::practice{id="nx-dl-07-02-q04" depth="standard"}
:::

:::practice{id="nx-dl-07-02-q05" depth="standard"}
:::

:::practice{id="nx-dl-07-02-q06" depth="standard"}
:::

:::practice{id="nx-dl-07-02-q07" depth="standard"}
:::

:::practice{id="nx-dl-07-02-q08" depth="standard"}
:::

## Summary

:::summary{#summary-card title="DACs and ADCs on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| DAC output | $V_o = V_{ref}D/2^n = V_{ref} \times 0.b_{n-1}\dots b_0$ (times the gain, with the circuit's sign) |
| Step, full scale | $\Delta = V_{ref}/2^n$; $V_{FS} = (2^n - 1)\Delta$, one step short of $V_{ref}$ |
| Resolution | $\Delta$, or $100/(2^n - 1)$ % of full scale (8 bits: 0.392 %); $100/2^n$ % if quoted against $V_{ref}$ |
| Weighted DAC | resistors $R, 2R, \dots, 2^{n-1}R$; spread $2^{n-1}$; $V_o = -V_{ref}(R_f/R)\,2D/2^n$ (books with MSB $2R$ and $R_f = R$: $-V_{ref}D/2^n$) |
| R-2R ladder | every node sees $R$; $I = V_{ref}/R$ for every code; legs $I/2, I/4, \dots, I/2^n$; $V_o = -V_{ref}(R_f/R)D/2^n$ |
| Erratum | 5 V / 2 kΩ = 2.5 mA; the $I/8$ leg gives $-0.625$ V |
| ADC code | truncating $\lfloor V_{in}/\Delta \rfloor$, error $[0, \Delta)$; ½-LSB offset rounds, error $[-\Delta/2, \Delta/2)$; in range only |
| Flash | $2^n - 1$ comparators, $2^n$ resistors, thermometer code, 1 clock |
| Counter | 1 comparator; code $D$ in $D$ clocks; worst $2^n - 1$ (some books count $2^n$) |
| SAR | binary search, keep on $\ge$; $n$ clocks for every input; result $\lfloor V_{in}/\Delta \rfloor$ |
| Dual slope | $N_2 = N_1V_{in}/V_{ref}$; accurate, slow |
:::
