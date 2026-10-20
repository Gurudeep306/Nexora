---
id: finite-state-machines
subject: dl
chapter: sequential-circuits
title: "Finite state machines: Mealy and Moore"
order: 7
prerequisites: [synchronous-counter-design]
pyq_topics: [dl/sequential]
est_minutes: 55
difficulty: core
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every state table, run, output string, Moore conversion, detector, shortest input and input equation is produced in content/gate-notes/_checks/dl/l6_07_fsm.py (seqlib FSM, run, shortest, detector, detects_ref, to_moore, Sync, excitation)."
  - "Coverage checklist only (internal digests, never copied): set E pp. 405 and 407."
  - "Facts checked against: M. Morris Mano and M. D. Ciletti, Digital Design (Mealy and Moore models, state diagrams, state assignment, design with JK and D flip-flops); Z. Kohavi and N. K. Jha, Switching and Finite Automata Theory (machine equivalence, Mealy to Moore conversion)."
  - "PYQs: src/gate/questions.json (cse-2001-b-59-a, cse-2001-b-59-b, cse-2002-a-30, cse-2005-cs-63, cse-2009-cs-27, cse-2021-2-cs-28); every key is re-derived by running or building the machine."
updated: "2026-10-20"
---

*State machines, lesson 1 of 2.* Every circuit in this chapter so far has been a state machine in disguise. A latch
remembers one bit, a counter walks round a cycle, a shift register remembers the last few inputs. This lesson takes off
the disguise. A **finite state machine** (FSM) is a synchronous circuit described not by its gates but by its
behaviour: a finite set of **states** (what it must remember), an **input** that arrives once per clock, a rule that
gives the **next state**, and a rule that gives the **output**. There are exactly two ways to attach the output: to
the state alone (a **Moore** machine) or to the state and the present input together (a **Mealy** machine), and the
difference decides **when** the output appears, which is the first thing GATE asks about. We will learn to turn a
sentence of English into a state diagram, to build the most famous kind of FSM, the **sequence detector**, to read off
what a given machine computes (a 2's complementer, an adder of consecutive bits, a run editor), to find the shortest
input that drives a machine to a target, and finally to turn a state diagram into flip-flops and gates, choosing the
state codes (binary, Gray or one-hot) along the way. Six GATE questions from 2001 to 2021 test these skills.

## Where this fits

[Lesson 3](lesson:sequential-analysis) went from a circuit to its state table; [Lesson 5](lesson:synchronous-counter-design)
went back from a wanted state table to a circuit, for counters, whose only input (if any) was a mode or an enable. A
state machine is the general case of both: the table has an input column that matters in every row, and an output that is
**not** just the state bits. Everything you learned there still applies: the excitation tables of
[Lesson 2](lesson:flip-flops), K-maps with don't-cares from [Chapter 3](lesson:kmaps), the rule that every flip-flop is
updated from the old state, and the lock-out warning for unused states. The next lesson,
[State minimisation](lesson:state-minimisation), asks how few states a machine can have. The mathematics of finite
automata, regular languages and DFA/NFA constructions belongs to the Theory of Computation subject; here we use machines
the way a hardware designer does: to specify, time and build circuits. The sentence to keep: **decide what the machine
must remember, give each memory a state, give every state an arc for every input, and then decide whether the output
belongs to the state (Moore) or to the arc (Mealy).**

:::table{#radar title="GATE radar: finite state machines" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 6 (2001 twice, 2002, 2005, 2009, 2021) |
| Marks | 2-mark MCQs (2002, 2005, 2009, 2021), a descriptive design question in two parts (2001) |
| Pattern 1 | Name what a given machine computes: 2002 (sum of the present and previous bit), 2005 (2's complement, LSB first) |
| Pattern 2 | Build a machine from words: 2001 (copy until 00, complement until 11), 2021 (replace the first 1 of every run of 1s by 0) |
| Pattern 3 | Shortest input that reaches a (state, output) target: 2009 (101, length 3) |
| Pattern 4 | From a machine to flip-flops: 2001 (J and K equations), 2021 (next state $t = b$, output $y = sb$) |
| What examiners test | that a Mealy output belongs to the arc and a Moore output to the state; the one-clock lag of Moore; overlapping versus non-overlapping detection; reading a table's columns correctly; that the state is what must be **remembered**, not what is output |
:::

## Mealy and Moore machines

:::intuition{#fsm-intuition title="A vending machine that remembers how much you paid" depth="standard"}
A vending machine sells a drink for 15 rupees and accepts 5- and 10-rupee coins. It cannot see your wallet or your history;
all it can do is remember **how much has been paid so far**: 0, 5 or 10 (at 15 or more it vends and starts again). Those
three amounts are its **states**. A coin is an **input**. The machine's whole behaviour is a small table: "in state 5, a
10-rupee coin makes me vend and go back to 0". Nothing else about the past matters, because the amount paid is all the
machine needs to decide what to do next.

That is the idea of a finite state machine. Its state is a **summary of the past**, just detailed enough to decide the future.
Now ask: when does the drink fall? One design drops it the moment the last coin lands (the output depends on the state **and**
the coin: Mealy). Another first moves to a "vend" state and drops the drink while it is in that state (the output depends on the
state alone: Moore). Both sell drinks correctly; they differ in timing and in the number of states. That difference is the
first thing to master.
:::

:::definition{#mealy-moore term="Mealy machine and Moore machine" depth="standard"}
A **finite state machine** has a finite set of states $S$ with a start state $s_0$, an input alphabet $X$ (for us usually
$\{0, 1\}$), an output alphabet $Z$, and a **next-state function** $\delta(s, x)$ that gives the state after the clock edge
when the present state is $s$ and the present input is $x$. The output is given in one of two ways.

- **Moore machine:** the output is a function of the **present state only**, $z = \lambda(s)$. In a state diagram the output is
  written **inside** the state circle ("S3/1"), and arcs carry only the input.
- **Mealy machine:** the output is a function of the **present state and the present input**, $z = \lambda(s, x)$. In a state
  diagram the output is written **on the arc**, as "input/output" (an arc "1/0" means: on input 1, output 0 and follow this arc).

In hardware both are a register of flip-flops holding the state plus two blocks of combinational logic: the next-state logic
(from $s$ and $x$ to the flip-flop inputs) and the output logic. In a Moore machine the output logic sees only the flip-flop
outputs; in a Mealy machine it also sees the input wires directly. Every machine in this chapter is **synchronous**: the state
changes only at the active clock edge, and the input is sampled just before that edge.
:::

:::definition{#state-table-fsm term="The state table of a state machine" depth="standard"}
A **state table** lists, for every present state and every input, the next state and the output. Two layouts are common:

- **Compact:** one row per present state, one next-state column per input value and (Mealy) one output column per input value,
  or (Moore) a single output column. Entries such as "B/0" in an "x = 1" column mean "next state B, output 0".
- **Long:** one row per (present state, input) pair, with the state written in bits: present-state bits, input, next-state bits,
  output. GATE 2009 used this layout with the present-state bits $A, B$ first, then the input, then the next-state bits, then the
  output.

The table and the diagram carry the same information: each row of the long table is one arc. A table is **complete** when every
state has a next state for every input; an arc that is missing must either never happen (a don't-care, as in
[Lesson 3](lesson:sequential-analysis)) or be a mistake. **Read the column headings before the numbers**: in a long table,
mixing up which columns are the present state and which are the next state reverses every arc.
:::

The two kinds of machine are not rivals: each can imitate the other, at a price.

:::theorem{#mealy-moore-equivalence name="Mealy and Moore machines are equivalent, up to a one-clock shift" depth="standard"}
1. Every Moore machine $M$ has a Mealy machine $M'$ with the **same states** whose output on input $x$ in state $s$ is
   $\lambda'(s, x) = \lambda(\delta(s, x))$: it produces, during the period of each input, the output $M$ produces in the period
   after it (one clock **earlier** than $M$).
2. Every Mealy machine $M$ with state set $S$ and output set $Z$ has a Moore machine $M''$ with at most $|S| \cdot |Z|$ states
   (one for each pair (state, output on the arc that entered it) that actually occurs, plus the start state) such that, after
   every input string, the Moore output in the following period equals the Mealy output for the last input: $M''$ produces the
   same output sequence **one clock later**.
:::

:::proof{#proof-mealy-moore-equivalence of="the Mealy–Moore equivalence" depth="standard"}
**Idea first:** a Moore state can only show what the machine already knows, so to show "the output of the arc I just took", a
Moore machine must **remember** that output as part of its state.

(1) Moore to Mealy. In period $k$ the Moore machine is in $s_{k-1}$, reads $x_k$, and enters $s_k = \delta(s_{k-1}, x_k)$ at edge
$k$, whose output $\lambda(s_k)$ it shows in period $k + 1$. The Mealy machine with the same states and arcs and $\lambda'(s, x) =
\lambda(\delta(s, x))$ shows, during period $k$, $\lambda'(s_{k-1}, x_k) = \lambda(s_k)$: the same value one period sooner.

(2) Mealy to Moore. Give the Moore machine the states $(s, z)$, meaning "the Mealy machine is in $s$ and the arc that brought it
here had output $z$". Define $\delta''((s, z), x) = (\delta(s, x), \lambda(s, x))$ and $\lambda''((s, z)) = z$. Run both on the same
input from $s_0$ and $(s_0, z_0)$ (any $z_0$). By induction on $k$, after $k$ inputs the Moore state is $(s_k, \lambda(s_{k-1}, x_k))$,
where $s_k$ is the Mealy state: true for $k = 1$ by the definition of $\delta''$, and each step applies $\delta$ to the first
component and records the arc's output in the second. So in period $k + 1$ the Moore output is $\lambda(s_{k-1}, x_k)$, the Mealy
output of period $k$. Only pairs $(s, z)$ that label some arc entering $s$ (plus the start) are ever reached, so at most $|S| \cdot |Z|$
states are needed. ∎

**Check by simulation.** `seqlib.FSM.to_moore` builds exactly these pair states; on every machine of this lesson the Moore
version, run on all input strings up to length 8, lists the same outputs as the Mealy original one period later, and the
Moore-to-Mealy direction is checked the same way on the Moore detectors.
:::

Statement (2) also explains the price list. A Mealy machine never needs **more** states than the equivalent Moore machine, and
usually needs fewer: a Moore machine must spend extra states to "hold" an output that the Mealy machine simply writes on an arc.
The 101 detector below has 3 Mealy states and 4 Moore states; the 2001 copy/complement machine has 4 Mealy states and 6 Moore
states.

:::definition{#output-timing-fsm term="When the output appears" depth="standard"}
Number the clock periods so that period $k$ ends at edge $k$; the input of period $k$, $x_k$, is applied early in the period and
sampled at edge $k$.

- A **Moore** output is a function of the flip-flops only, so it changes **only just after an edge** and is constant for a
  whole period. The reaction to $x_k$ appears in period $k + 1$.
- A **Mealy** output is a function of the flip-flops **and** the input wires, so it reacts to $x_k$ **within period $k$**, as soon
  as $x_k$ arrives. It can also change in the middle of a period whenever the input changes, which is both its strength
  (one clock faster) and its weakness (it passes input glitches straight to the output).

The correct moment to read a Mealy output is therefore just before the edge that ends the period, when the input has settled;
a Moore output can be read at any time during the period. This is the same convention [Lesson 3](lesson:sequential-analysis)
used for "the output in cycle $k$".
:::

The animation runs the overlapping 101 detector built both ways (the next section builds it) on the same input waveform. Watch
periods 3, 4, 6, 7 and the spike in period 8.

:::viz{#mealy-moore-timing-viz spec="mealy-moore-timing" mode="animate" depth="standard"}
:::

Notice what happens in period 3. The third input bit completes 101, and the Mealy output goes high **as soon as that 1 is on
the wire**, while the machine is still in S2; the edge at the end of period 3 has not happened yet. The Moore machine cannot say
anything until that edge moves it into S3, its "seen 101" state, so its output is high during period 4. Then look at period 8:
a short spike on $x$ while the Mealy machine sits in S2 produces a short 1 on the Mealy output. The flip-flops sample $x$ only at
edge 8, where it is 0 again, so the **state** ignores the spike, but anything that listens to the Mealy output during the
period hears a false "detected".

:::trap{#trap-mealy-glitch title="A Mealy output can glitch between edges" depth="standard"}
Because a Mealy output is computed from the live input wires, any glitch, hazard or late change on an input appears on the output
during the period, even though the state never sees it. The expected wrong statement is "**the outputs of a synchronous machine
change only at clock edges**": true for Moore outputs, false for Mealy outputs. Three standard remedies: read the Mealy output only
at the next clock edge (feed it into a flip-flop, which turns it into a registered, Moore-like output one clock later); make sure
the inputs themselves come from flip-flops on the same clock (synchronised inputs change just after the edge and are steady
before the next one); or design the machine as Moore when glitch-free outputs matter more than one clock of latency.
:::

:::trap{#trap-moore-lag title="A Moore detector says yes one clock after the Mealy one" depth="standard"}
Given the same input, a Moore machine's reaction to input $k$ is visible in period $k + 1$, a Mealy machine's in period $k$. So when a
question shows a timing diagram, or asks "in which clock period does the output go high", the Moore answer is one period later than
the Mealy answer, and the expected wrong answer is the other machine's period. In an output **string**, the convention matters too: a
Moore machine produces one output **before** any input (its start state's output), so $n$ inputs give $n + 1$ Moore outputs but
$n$ Mealy outputs. Writing the Moore string without its first symbol is the usual way to compare the two (and is how the lab and the
check scripts list them), but say which convention you use.
:::

:::note{#recap-mealy-moore title="Recap" depth="quick"}
Moore: output in the state, changes only after edges, reacts one clock later, may need more states. Mealy: output on the arc,
reacts in the same period, may glitch with the input, never needs more states. A Mealy machine with $|S|$ states and $|Z|$ output
values has a Moore equivalent with at most $|S| \cdot |Z|$ states.
:::

### Worked examples: Mealy and Moore

::::example{#ex-mm-run level="easy" title="Running a Mealy machine on an input string" depth="quick"}
A Mealy machine has states P (start), Q, R and the table: P: $x = 0$ → P/0, $x = 1$ → Q/0; Q: $x = 0$ → R/1, $x = 1$ → Q/0;
R: $x = 0$ → P/0, $x = 1$ → Q/1. Find the state sequence and the output string for the input 0110010.

:::step{why="Each output belongs to the arc taken, so it is read from the present state's row and the present input's column."}
P, input 0: output 0, stay in P. P, input 1: output 0, go to Q. Q, input 1: output 0, stay in Q.
:::

:::step{why="Continue from the state reached, one input at a time; the output is never read from the row of the state being entered."}
Q, input 0: output **1**, go to R. R, input 0: output 0, go to P. P, input 1: output 0, go to Q. Q, input 0: output **1**, go to R.
:::

:::answer
States P, P, Q, Q, R, P, Q, R and output **0001001** (7 outputs for 7 inputs). The usual slip is to read the output from the row of the
**next** state (for the fourth input that would be R's row and output 0): a Mealy output belongs to the present state and the present
input, the arc you leave by.
:::
::::

::::example{#ex-mm-moore level="medium" title="The same machine as Moore: one more state and one clock later" depth="standard"}
Convert the machine of the previous example into an equivalent Moore machine and compare the two output timings on 0110010.

:::step{why="A Moore state must remember the output of the arc that entered it, so list which outputs enter each state."}
Into P: arcs P–0 (output 0) and R–0 (0): only output 0. Into Q: P–1 (0), Q–1 (0) and R–1 (**1**): outputs 0 and 1. Into R: Q–0 (1): only 1.
:::

:::step{why="One Moore state per (state, entering output) pair; its output is that entering output."}
States P0 (output 0, the start), Q0 (0), Q1 (1), R1 (1). Arcs copy the Mealy arcs and add the arc's output to the target's name:
P0: 0 → P0, 1 → Q0. Q0 and Q1 (same arcs as Q): 0 → R1, 1 → Q0. R1: 0 → P0, 1 → Q1.
:::

:::step{why="Run the Moore machine and read each state's output after each edge."}
States after each input: P0, Q0, Q0, R1, P0, Q0, R1, with outputs 0, 0, 0, 1, 0, 0, 1; before any input the machine shows P0's output 0.
:::

:::answer
**4 Moore states** against 3 Mealy states (Q had to be split, because it is entered both with output 0 and with output 1). The Moore
output string is 0 (initial) followed by 0001001, the Mealy string; each 1 appears in the period **after** the input that caused it,
as the theorem says.
:::
::::

::::example{#ex-mm-2001 level="gate" title="How many Moore states does the 2001 copy/complement machine need?" depth="standard"}
The GATE 2001 machine (built from words later in this lesson) is a 4-state Mealy machine: A: 0 → B/0, 1 → A/1; B: 0 → C/0, 1 → A/1;
C: 0 → C/1, 1 → D/0; D: 0 → C/1, 1 → A/0. How many states does an equivalent Moore machine need, and is that number below the
bound of the theorem?

:::step{why="List the outputs on the arcs entering each state."}
Into A: A–1 (1), B–1 (1), D–1 (**0**): outputs 0 and 1. Into B: A–0 (0). Into C: B–0 (0), C–0 (1), D–0 (1): outputs 0 and 1. Into D: C–1 (0).
:::

:::step{why="Every (state, entering output) pair becomes a Moore state."}
A0, A1, B0, C0, C1, D0: **6** states (A0 doubles as the start state).
:::

:::step{why="Check the count against the bound and against minimisation."}
The bound is $|S| \cdot |Z| = 4 \times 2 = 8$. Running partition refinement on the 6-state Moore machine (the method of
[the next lesson](lesson:state-minimisation)) splits all six apart, so none of them can be merged.
:::

:::answer
**6** Moore states (minimal), against 4 Mealy states and the bound 8. Notice the pattern: a Mealy state needs as many Moore copies as there are
**different outputs on its incoming arcs**, here two each for A and C and one each for B and D.
:::
::::

::::example{#ex-mm-empty level="gate" title="Edge case: a Moore output before the first input" depth="standard"}
A Moore machine checks **even parity**: state E (even number of 1s so far, output 1) is the start state, state O (odd, output 0); input
1 swaps the states, input 0 keeps them. What does it output for the empty input, and for 1101?

:::step{why="A Moore machine shows its start state's output before any input arrives."}
Empty input: the output is E's output, **1** (zero 1s is an even number).
:::

:::step{why="Then one more output after every input, from the state entered."}
1101: E → O → E → E → O, outputs 1 (initial), 0, 1, 1, 0.
:::

:::answer
For the empty input the output is **1**; for 1101 the full output string is **10110**, five values for four inputs. A Mealy machine has no
output at all for the empty input, because its outputs live on arcs and no arc has been taken. Questions that ask for "the output after
the string" of a Moore machine usually mean the last value (here 0, since 1101 has three 1s); questions that compare string lengths need the
initial value.
:::
::::

## From words to a state diagram

:::intuition{#words-intuition title="What would you write on a sticky note?" depth="standard"}
Suppose you had to do the machine's job by hand: bits arrive one at a time, you must answer at once, and you may keep only a small sticky
note between bits. What must be on the note? For "say 1 when the last three bits were 101" the note needs the useful tail of the input: "nothing
useful", "ends in 1" or "ends in 10". For "copy until you see 00" it needs the mode and whether the last bit was a 0. Each **different note**
you might need is a state. Write too little on the note and some situations become impossible to tell apart; write too much and you have
states that behave identically (the next lesson removes those).
:::

:::definition{#fsm-from-words term="Building a state diagram from a word description" depth="standard"}
1. **Decide what must be remembered.** Ask: after any input so far, what facts about the past can still change a future output? Each
   combination of those facts is a state; give it a name that says what it means ("copy, last bit 0").
2. **Choose Mealy or Moore.** If the output must react in the same period as the input that causes it, or the question says Mealy, put
   outputs on arcs. If the output must be steady for a whole period, put it in states.
3. **Draw every arc.** For each state and **each** input value, ask "what is now remembered?" and draw the arc to that state, with its
   output (Mealy). A binary-input machine with $n$ states has exactly $2n$ arcs; count them.
4. **Choose the start state** (what is remembered before any input).
5. **Test on the given example** and on small strings; an example stream in the question is a free test case.
:::

The 2001 question is the classic exercise. In words: the circuit **copies** its input until it sees two consecutive 0s; from then on it
outputs the **complement** of the input until it sees two consecutive 1s; then the process repeats. The example given is the input
101100 01001011 011 with output 101100 10110100 011. What must be remembered? The **mode** (copying or complementing) and, inside each
mode, whether the last bit was the one that would end the mode if it came again (a 0 in copy mode, a 1 in complement mode). That makes
four states:

- **A**: copy mode, last bit not 0 (also the start state);
- **B**: copy mode, last bit 0;
- **C**: complement mode, last bit not 1;
- **D**: complement mode, last bit 1.

In copy mode the output is the input; in complement mode it is the inverted input. The bit that **completes** a 00 or a 11 is still
treated in the old mode (the example shows this: the second 0 of the first 00 is copied as 0). So A: 0/0 → B, 1/1 → A; B: 0/0 → C,
1/1 → A; C: 0/1 → C, 1/0 → D; D: 0/1 → C, 1/0 → A. Running this machine on the 17 example bits gives exactly the example output. That is
the whole of the 2001 part (a) answer; part (b) builds it with flip-flops at the end of the lesson.

:::definition{#interpret-machine term="Interpreting a given machine" depth="standard"}
The reverse task, "what does this machine compute?", is answered by **giving each state a meaning** and checking that every arc respects it:

1. Run the machine on short inputs (all 1-bit, 2-bit and 3-bit strings if needed) and write the outputs beside the inputs.
2. Guess what each state remembers ("the previous bit was 1", "a 1 has been seen", "carry 1").
3. Check the guess on **every** arc, not just on the examples: an arc that violates the meaning kills the guess.
4. Compare with the options; an option that is false needs just **one** counterexample string.
:::

:::trick{#trick-run-small title="Run the machine on tiny inputs and match the options" depth="standard"}
For "which statement describes this machine?" questions, feed in the shortest strings that separate the options: a single 1, then 11, 10,
then a number whose answer you know (for arithmetic options, 0 and 1 are the most informative: 1's complement and 2's complement differ on
0, increment and decrement differ on everything). **Why it works:** the options are claims about every input, so one string where the
machine disagrees eliminates an option outright. **When it fails:** a string that agrees with the machine proves nothing on its own; after
eliminating, confirm the survivor by giving each state a meaning and checking every arc.
:::

:::note{#note-toc title="Finite automata belong to another subject" depth="standard"}
A finite state machine with an "accept" output is a deterministic finite automaton, and its mathematics (regular languages, NFA-to-DFA
conversion, closure properties, the pumping lemma and the theory of minimal automata) belongs to the Theory of Computation subject. In Digital
Logic, GATE asks about machines as **circuits**: outputs, timing, detectors, flip-flops and gates. We use only what a designer needs and do not
re-teach that theory here.
:::

:::note{#recap-words title="Recap" depth="quick"}
State = what must be remembered. Name each state by its meaning, draw an arc for every (state, input) pair ($2n$ arcs for $n$ states and a
binary input), test on the example. To interpret a machine, run tiny inputs, guess the meaning of each state, check every arc.
:::

## Sequence detectors

:::intuition{#detector-intuition title="Listening for a password, one letter at a time" depth="standard"}
You are listening for the word "101" in an endless stream of bits. Each time a bit arrives you ask: "how much of 101 have I got so far?"
Nothing, "1", or "10". If you have "10" and a 1 arrives, you shout "yes!". If you have "10" and a 0 arrives, you have "100", and no tail of
"100" is a start of "101", so you are back to nothing. If you have "1" and another 1 arrives, you have "11", whose tail "1" is still a
start of 101, so you still have "1". The amount of the pattern you hold is the whole state, and when a bit breaks the pattern you fall back to
the **longest tail that is still a beginning**, not necessarily to the very start.
:::

:::definition{#sequence-detector term="Sequence detector (overlapping and non-overlapping)" depth="standard"}
A **sequence detector** for a pattern $p$ of length $k$ outputs 1 exactly when the input received so far ends with an occurrence of $p$.

- **Overlapping** detection counts every occurrence, even one that shares bits with the previous one: in 10101 the pattern 101 ends at
  bits 3 and 5.
- **Non-overlapping** detection restarts after each detection, so bits used by one occurrence cannot start the next: in 10101 the
  pattern 101 is detected only at bit 3.

The standard design has one state per **prefix** of the pattern: $S_i$ means "the longest suffix of the input that is a prefix of $p$
has length $i$". A **Mealy** detector uses $S_0, \dots, S_{k-1}$ and puts the output 1 on the arc that completes $p$. A **Moore**
detector adds a state $S_k$ ("just completed $p$") whose output is 1. On a mismatch, the arc goes to the state of the longest suffix of
(matched prefix + new bit) that is a prefix of $p$. After a detection, an overlapping detector continues from the longest proper suffix of
$p$ that is a prefix of $p$; a non-overlapping one continues from $S_0$ (Mealy) or treats the next bit as the first bit of a fresh
search (Moore).
:::

:::trick{#trick-suffix title="Failure arc = longest suffix that is also a prefix" depth="standard"}
To find where a state goes on the "wrong" bit, write the prefix it represents, append the bit, and strike letters from the left until what
remains is a prefix of the pattern (possibly empty). For 1011 in state $S_3$ ("101") on a 0: 1010 → 010 → **10**, a prefix, so go to
$S_2$. On a 1 from $S_3$ the pattern completes; for overlapping detection 1011 → 011 → 11 → **1**, so the next state is $S_1$. **Why it
works:** the state must hold the longest tail of the input that could still grow into the pattern, and any longer tail would already be a
longer prefix. **When it fails:** never, as long as you strike from the left only; striking from the right (keeping the oldest bits)
gives the classic wrong arc back to $S_0$.
:::

:::theorem{#detector-states name="A detector for a k-bit pattern needs exactly k Mealy states and k + 1 Moore states" depth="standard"}
For every pattern $p$ of length $k$, overlapping or not, the prefix-state detector is minimal: no Mealy machine with fewer than $k$
states and no Moore machine with fewer than $k + 1$ states detects $p$.
:::

:::proof{#proof-detector-states of="the detector state count" depth="standard"}
**Idea first:** two states that differ in how many more bits are needed before the next 1 can never be merged, and the $k$ prefix states
all need different numbers of bits.

Take the Mealy detector, and suppose it is in $S_i$ ($0 \le i \le k - 1$): the longest suffix of the input (since the last detection, in
the non-overlapping case) that is a prefix of $p$ has length $i$. Feeding the rest of the pattern, $p_{i+1} \dots p_k$, produces a 1 after
exactly $k - i$ more bits. Can any input produce a 1 sooner, after $m < k - i$ bits? A 1 after $m$ bits means the last $k$ bits form $p$,
so the last $k - m$ bits **before** those $m$ were a prefix of $p$ of length $k - m > i$, and they were a suffix of the input: that
contradicts the choice of $i$ as the longest. So the shortest input that produces a 1 from $S_i$ has length exactly $k - i$, and these
lengths are all different for $i = 0, \dots, k - 1$. Two states with different "shortest time to a 1" are distinguishable (feed the
shorter of the two inputs: one state outputs 1, the other cannot), so any detector, of any design, needs at least $k$ pairwise distinguishable
states, and the prefix design has exactly $k$.

For Moore, the prefix states $S_0, \dots, S_{k-1}$ output 0 and are distinguishable by the same argument (the 1 now shows one period
later); the state reached by completing the pattern outputs 1, so it differs from all of them on the empty input. That is $k + 1$. ∎

**Check by simulation.** `seqlib.detector` builds the prefix detectors; for the patterns 101, 110, 111, 1001, 1011 and 0110, overlapping
and not, Mealy and Moore, its outputs equal a direct string search (`detects_ref`) on hundreds of inputs, and minimisation finds no two
equivalent states, so $k$ and $k + 1$ are exact.
:::

The animation feeds 1101011 to the overlapping 101 Mealy detector. Watch the second bit (a repeated 1 that does not reset) and bit 6
(a detection that shares its first 1 with the previous detection).

:::viz{#sequence-detector-viz spec="sequence-detector" mode="animate" depth="standard"}
:::

:::trap{#trap-overlap title="Overlapping or not: one arc decides" depth="standard"}
The overlapping and non-overlapping 101 Mealy detectors differ in **one** arc: the completing arc $S_2 \xrightarrow{1/1}$ goes to $S_1$ when
overlapping (the final 1 may start the next 101) and to $S_0$ when not. On 10101 the first gives 00101, the second 00100. Examiners exploit
this both ways: they describe an overlapping detector and offer the non-overlapping output string (missing the second detection), or the
reverse. A second trap is the reset arc on a broken pattern: from $S_1$ on a 1 (input "11"), the 101 detector stays in $S_1$, it does not
return to $S_0$; the student who resets on every mismatch misses detections such as the one in 1101.
:::

:::note{#recap-detectors title="Recap" depth="quick"}
States = prefixes matched so far; a mismatch falls back to the longest suffix that is a prefix; overlapping detection continues from the longest
proper border of the pattern, non-overlapping from scratch. A $k$-bit pattern needs exactly $k$ Mealy or $k + 1$ Moore states.
:::

### Worked examples: sequence detectors

::::example{#ex-det-101 level="easy" title="The overlapping 101 Mealy detector on 0101101" depth="quick"}
Using the overlapping 101 detector ($S_0$: 0/0 → $S_0$, 1/0 → $S_1$; $S_1$: 1/0 → $S_1$, 0/0 → $S_2$; $S_2$: 1/1 → $S_1$, 0/0 → $S_0$), find the output for
0101101.

:::step{why="Follow the arcs from S0, one bit at a time."}
0: $S_0 \to S_0$. 1: $S_0 \to S_1$. 0: $S_1 \to S_2$. 1: $S_2 \to S_1$, output **1** (0101 ends in 101).
:::

:::step{why="Keep going; the 1 that completed the pattern is also the 1 of state S1."}
1: $S_1 \to S_1$ ("11" still ends in 1). 0: $S_1 \to S_2$. 1: $S_2 \to S_1$, output **1**.
:::

:::answer
Output **0001001**: detections at bits 4 and 7, which is exactly where the string 0101101 has 101 ending (a direct search agrees). Notice the fifth
bit: after 01011 the machine is in $S_1$, not $S_0$, which is what lets it catch the 101 ending at bit 7.
:::
::::

::::example{#ex-det-nonov level="medium" title="Non-overlapping 101 on 1010101" depth="standard"}
Find the outputs of the overlapping and the non-overlapping 101 Mealy detectors for 1010101.

:::step{why="Overlapping: every 101 that ends at a bit is reported."}
Occurrences of 101 end at bits 3, 5 and 7: output **0010101**.
:::

:::step{why="Non-overlapping: the completing arc returns to S0, so the next search starts with a fresh bit."}
States 0, 1, 2, then bit 3 completes (output 1) and returns to $S_0$. Bit 4 (0): stay in $S_0$. Bits 5, 6, 7 (1, 0, 1): $S_1$, $S_2$, then detect.
:::

:::answer
Overlapping **0010101**, non-overlapping **0010001**. The non-overlapping machine misses bit 5, because the 1 at bit 3 was used up by the first
detection; the 101 ending at bit 5 shares it.
:::
::::

::::example{#ex-det-1011 level="gate" title="A Moore detector for 1011 (overlapping)" depth="standard"}
Design the overlapping Moore detector for 1011 and run it on 10111011.

:::step{why="A Moore detector needs one state per prefix plus a 'just detected' state with output 1."}
$S_0$ (none), $S_1$ (1), $S_2$ (10), $S_3$ (101), $S_4$ (1011, output 1): **5** states.
:::

:::step{why="Matching arcs advance; failure arcs use the longest suffix that is a prefix."}
$S_0$: 0 → $S_0$, 1 → $S_1$. $S_1$: 0 → $S_2$, 1 → $S_1$ (11 → 1). $S_2$: 0 → $S_0$ (100 → nothing), 1 → $S_3$. $S_3$: 0 → $S_2$ (1010 → 10), 1 → $S_4$.
:::

:::step{why="From the detected state, continue as if 1011 had just been received."}
$S_4$: 0 → $S_2$ (10110 → 10), 1 → $S_1$ (10111 → 1).
:::

:::step{why="Run it; each output is the output of the state entered."}
10111011: $S_1, S_2, S_3, S_4, S_1, S_2, S_3, S_4$, outputs 0, 0, 0, 1, 0, 0, 0, 1 (after an initial 0).
:::

:::answer
5 states; output **00010001** after the input bits (preceded by the start output 0). The detections at bits 4 and 8 appear as 1s in the periods **after**
those bits, the Moore lag. The Mealy version needs 4 states, the theorem's $k$.
:::
::::

::::example{#ex-det-111 level="gate" title="Edge case: 111, where the last state loops on itself" depth="standard"}
Build the overlapping 111 Mealy detector and run it on 11111 and on 0111101111. What changes for non-overlapping detection?

:::step{why="Every mismatch (a 0) destroys every prefix of 111, so all 0-arcs go to S0."}
$S_0$: 0/0 → $S_0$, 1/0 → $S_1$. $S_1$: 0/0 → $S_0$, 1/0 → $S_2$. $S_2$: 0/0 → $S_0$, 1/1 → $S_2$.
:::

:::step{why="After 111, the longest proper suffix that is a prefix is 11, which is S2 itself: a self-loop."}
11111: outputs 0, 0, 1, 1, 1 = **00111**. 0111101111: **0001100011**.
:::

:::step{why="Non-overlapping: the completing arc goes to S0 instead."}
11111: detect at bit 3, restart, then bits 4 and 5 are only 11: **00100**.
:::

:::answer
The overlapping 111 detector has the self-loop $S_2 \xrightarrow{1/1} S_2$: a run of $m \ge 3$ ones gives $m - 2$ detections in a row. Non-overlapping, a run
of 1s gives a detection every third 1. Patterns such as 111 and 1010 are where the two kinds of detector differ most; for a pattern like 100, whose
only border is empty, they behave identically.
:::
::::

## Serial machines

:::intuition{#serial-intuition title="Doing arithmetic one column at a time" depth="standard"}
Paper arithmetic works column by column from the right, carrying a little information to the next column: a carry digit for addition, a
borrow for subtraction, "have I passed the first 1 yet?" for the 2's complement trick. A serial machine is that paper procedure with the
columns arriving one per clock, least significant bit first, and the carried information kept in flip-flops. The amount of carried
information is tiny, so the machines are tiny: two states each. That is why a few flip-flops can process numbers of any length.
:::

:::definition{#serial-twos-complement term="The serial 2's complementer (GATE 2005)" depth="standard"}
The 2's complement of an $n$-bit number $v$ is $2^n - v$ ([signed numbers](lesson:signed-numbers)). A Mealy machine computes it serially, least
significant bit first, with two states:

- **Q0** (start): no 1 seen yet. Input 0: output 0, stay. Input 1: output 1, go to Q1.
- **Q1**: a 1 has been seen. Input 0: output 1; input 1: output 0; stay in Q1.

In words: **copy the bits up to and including the first 1, then complement every later bit.**
:::

:::theorem{#twos-complement-rule name="Copy up to the first 1, then complement" depth="standard"}
Let $v \ne 0$ be an $n$-bit number whose lowest 1 is at position $j$ (bits $0, \dots, j - 1$ are 0). Then $2^n - v$, taken modulo $2^n$, has the same bits
$0, \dots, j$ as $v$ and the complemented bits $j + 1, \dots, n - 1$. For $v = 0$ the result is 0. Hence the two-state machine outputs the $n$-bit 2's
complement of every input.
:::

:::proof{#proof-twos-complement-rule of="the copy-then-complement rule" depth="standard"}
**Idea first:** 2's complement is "invert and add 1", and the added 1 ripples exactly through the inverted trailing zeros.

Write $v = u \cdot 2^{j+1} + 2^j$ with $u$ the number formed by bits $j + 1, \dots, n - 1$. Inverting all $n$ bits gives $\bar v = \bar u \cdot 2^{j+1} + 0 \cdot 2^j
+ (2^j - 1)$, since bit $j$ becomes 0 and the $j$ trailing zeros become 1s. Adding 1: the low part $2^j - 1 + 1 = 2^j$, which carries into nothing beyond bit
$j$. So $\bar v + 1 = \bar u \cdot 2^{j+1} + 2^j$: bits $0, \dots, j - 1$ are 0 (as in $v$), bit $j$ is 1 (as in $v$), and the bits above are $\bar u$, the complement.
Since $\bar v + 1 = 2^n - v$, this is the 2's complement. For $v = 0$ the machine never leaves Q0 and outputs 0, and $2^n - 0 \equiv 0$. ∎

**Check by simulation.** Running the machine on all 256 eight-bit numbers, LSB first, gives $(256 - v) \bmod 256$ every time; it agrees with the 1's complement
$255 - v$, with $v + 1$ and with $v - 1$ on **none** of them.
:::

The animation converts 0110100 (52) to 1001100 (76 = 128 − 52), one bit per clock, least significant bit first.

:::viz{#serial-twos-complement-viz spec="serial-twos-complement" mode="animate" depth="standard"}
:::

:::definition{#serial-adder-fsm term="The serial adder as a two-state machine" depth="standard"}
The [serial adder](lesson:carry-look-ahead) of Chapter 4 is a Mealy machine whose input is a **pair** of bits $(a_i, b_i)$, least significant first, and
whose state is the carry: **c0** or **c1**. On input $(a, b)$ in state $c$ it outputs $s = a \oplus b \oplus c$ and moves to the carry state
$ab + c(a + b)$. With D flip-flop $Q = c$: $D = ab + Qa + Qb$, $s = a \oplus b \oplus Q$: one full adder and one flip-flop. For example 0110 + 0111, fed
as the pairs (0, 1), (1, 1), (1, 1), (0, 0), (0, 0): states c0, c0, c1, c1, c0, c0 and sum bits 1, 0, 1, 1, 0, i.e. 01101 = 13 = 6 + 7. One extra clock
with $a = b = 0$ flushes the final carry out.
:::

:::definition{#two-state-mealy term="Two-state Mealy machines that edit a stream (GATE 2021)" depth="standard"}
Many stream-editing tasks need to remember a single bit, usually **the previous input bit**. GATE 2021 asked for a circuit that replaces the
**first 1 of every run of consecutive 1s** by a 0 (input 00100011000011100, output 00000001000001100). A 1 must be suppressed exactly when the
previous bit was 0 (or there was no previous bit). So the state $s$ is "the previous bit was 1", with $s = 0$ at the start:

- next state $t = b$ (remember the bit just read);
- output $y = s\,b$ (pass a 1 only when the previous bit was also 1).

With a single D flip-flop: $D = b$, $y = Q\,b$. The same pattern (state = previous bit) also gives "output 1 on every rising edge of the input"
($y = \bar s\, b$), "detect 11" ($y = s\,b$ again, the 2021 machine) and the 2002 machine, which outputs the 2-bit sum of the previous and the present bit.
:::

:::note{#recap-serial title="Recap" depth="quick"}
Serial machines carry one small fact from column to column: "a 1 seen" (2's complement: copy to the first 1, then complement), the carry (serial adder),
the previous bit (2021, 2002). Two states, one flip-flop, any word length.
:::

### Worked examples: interpreting machines

::::example{#ex-int-2005 level="medium" title="What does the 2005 machine compute? (GATE 2005)" depth="standard"}
A Mealy machine reads a binary number LSB first. Q0 (start): 0/0 self-loop, 1/1 to Q1; Q1: 0/1 and 1/0 self-loops. Is it 1's complement,
2's complement, increment or decrement?

:::step{why="Give each state a meaning from its arcs."}
Q0 copies bits and leaves on the first 1 (which it also copies); Q1 inverts every bit for ever. So the machine copies up to the first 1 and then
complements.
:::

:::step{why="Test the options on the most informative small input, 0."}
Input 00…0: the machine never leaves Q0 and outputs 0. 1's complement of 0 is 11…1, increment gives 1, decrement gives 11…1 (−1). Only 2's
complement gives 0.
:::

:::step{why="Confirm on a nonzero number, LSB first."}
0110100 (52) fed as 0, 0, 1, 0, 1, 1, 0 gives 0, 0, 1, 1, 0, 0, 1, i.e. 1001100 = 76 = 128 − 52.
:::

:::answer
It computes the **2's complement** (GATE 2005, option B), by the copy-then-complement rule. The 1's complement option is the classic trap: the machine
does complement, but only **after** the first 1; on all 256 eight-bit inputs it never once agrees with $255 - v$.
:::
::::

::::example{#ex-int-2002 level="gate" title="The 2002 machine with 2-bit outputs (GATE 2002)" depth="standard"}
States A (start), B, C; arcs are input/2-bit output. A: 0/00 → A, 1/01 → B. B: 0/01 → A, 1/10 → C. C: 0/01 → A, 1/10 → C. Which is true: (A) it outputs the
sum of the present and the previous input bits; (B) it outputs 01 whenever the input contains 11; (C) it outputs 00 whenever the input contains 10; (D) none?

:::step{why="Give each state a meaning: where does each state come from?"}
A is entered only on a 0 (and is the start), B and C only on a 1. So A means "previous bit 0", and B and C both mean "previous bit 1".
:::

:::step{why="Read the outputs as numbers against that meaning."}
From A (previous 0): input 0 gives 00 = 0 + 0, input 1 gives 01 = 0 + 1. From B or C (previous 1): input 0 gives 01 = 1 + 0, input 1 gives 10 = 1 + 1.
:::

:::step{why="Kill the false options with one string each."}
Input 11: the second output is 10, not 01, so (B) is false. Input 10: the second output is 01, not 00, so (C) is false. A full run of 0110111 gives
00, 01, 10, 01, 01, 10, 10, each the sum of a bit and its predecessor.
:::

:::answer
Option **A** (GATE 2002): the output is the 2-bit binary sum of the present bit and the previous bit (taking the bit before the first as 0); checked on
every input up to 8 bits. Notice that B and C behave identically (same outputs, same next states), so the machine is not minimal: two states would do, a
point [the next lesson](lesson:state-minimisation) makes precise.
:::
::::

::::example{#ex-int-2021 level="gate" title="Replace the first 1 of every run (GATE 2021)" depth="standard"}
A two-state Mealy machine (states 0 and 1, start 0) turns 00100011000011100 into 00000001000001100. With present state $s$, next state $t$, input $b$ and
output $y$, find $t$ and $y$. Options: (A) $t = s + b$, $y = sb$; (B) $t = b$, $y = sb$; (C) $t = b$, $y = s\bar b$; (D) $t = s + b$, $y = s\bar b$.

:::step{why="Decide what one bit of memory must hold."}
A 1 is passed only when it is not the first of its run, i.e. when the previous bit was 1. So the state must be the previous bit: $t = b$.
:::

:::step{why="The output is 1 exactly for a 1 whose predecessor was 1."}
$y = s\,b$.
:::

:::step{why="Check the rejected options on the example."}
$t = s + b$ never forgets a 1, so after the first 1 it passes every later 1: (A) gives 00000011000011100. $y = s\bar b$ outputs 1 after a run ends: (C) gives
00010000100000010, and (D) gives 00011100111100011.
:::

:::answer
**B**: $t = b$, $y = sb$ (GATE 2021). Only B reproduces the example string, and it does so on every input up to 10 bits. The trap is $t = s + b$: it looks like
"remember that a 1 has been seen", which is the 2's complementer's memory, not this one.
:::
::::

::::example{#ex-int-unreach level="gate" title="Edge case: a detector that can never say yes" depth="standard"}
A designer's "11 detector" has states A (start), B, C: A: 0/0 → A, 1/0 → B; B: 0/0 → A, 1/0 → B; C: 0/0 → A, 1/1 → C. For which inputs does it output 1?

:::step{why="An output 1 sits only on the arc C–1, so ask whether C can ever be entered."}
Arcs into C: only C's own self-loop. A and B never lead to C.
:::

:::step{why="Compute the reachable set from the start."}
From A: A, B; from B: A, B. Reachable set {A, B}.
:::

:::answer
**Never**: C is unreachable, so the arc that would output 1 is never taken, and a search for the shortest input producing a 1 finds none. The bug is the arc
B–1, which should go to C (the "seen 11" state). When interpreting a machine, compute the reachable states first: arcs out of unreachable states are
decoration, and an option that relies on them is wrong.
:::
::::

## Shortest input to a target

:::intuition{#bfs-intuition title="Ripples in a pond" depth="standard"}
Drop a stone at the start state. After one clock the ripple has reached every state one input away; after two clocks, every state two inputs away; and
so on. The first ripple that touches the target tells you the shortest input, and the path the ripple travelled spells it out. This is **breadth-first
search** on the state graph: you never need to guess, and you never need to try long strings before short ones.
:::

:::definition{#shortest-input term="Shortest input string to a target" depth="standard"}
To find the shortest input that takes a machine from its start state to a target (a state, or a state together with the output of the last arc):

1. Level 0 is the start state. Level $\ell + 1$ is every state reachable by one arc from level $\ell$ that has not appeared at an earlier level.
2. Record, for each new state, the arc that first reached it (the previous state and the input bit).
3. Stop at the first level containing an arc that meets the target: if the target includes an output value, check the **arc's** output (Mealy) or the
   entered state's output (Moore), not just the state.
4. Read the input string back along the recorded arcs. If the levels stop growing before the target appears, no input reaches it.
:::

:::theorem{#bfs-bound name="Shortest inputs are short" depth="standard"}
In a machine with $n$ states, if a state $t$ is reachable from $s_0$ at all, some input of length at most $n - 1$ reaches it; if some input ends with an
arc into $t$ carrying output $z$, some such input has length at most $n$. The breadth-first levels find a shortest one.
:::

:::proof{#proof-bfs-bound of="the bound on shortest inputs" depth="standard"}
**Idea first:** a shortest path never visits a state twice, because the loop could be cut out.

Take a shortest input reaching $t$ and the states $s_0, s_1, \dots, s_m = t$ it visits. If $s_i = s_j$ with $i < j$, deleting inputs $i + 1, \dots, j$ gives a
shorter input that still reaches $t$, a contradiction. So the $m + 1$ states are distinct, $m + 1 \le n$, and $m \le n - 1$. For a target arc $(s, x)$ into $t$
with output $z$: reach $s$ in at most $n - 1$ inputs and append $x$, at most $n$. Breadth-first search examines all strings of length $\ell$ (up to
merging those that end in the same state, which have the same futures) before any of length $\ell + 1$, so the first hit is shortest. ∎

**Consequence.** If $n$ levels pass without reaching the target, the target is unreachable: no longer input will ever reach it. `seqlib.FSM.shortest`
implements exactly this search and is used for every shortest input in this lesson.
:::

:::trap{#trap-table-columns title="Reading the wrong columns of a long state table" depth="standard"}
The 2009 table lists, in order, the present state $A, B$, the input, the next state $A, B$ and the output. Reading the last three columns as "present state,
input, output" (or the first two as the next state) reverses arcs and leads to answers such as 4 or 5. Before searching, rewrite the table as arcs: "00 –0/1→ 00,
00 –1/0→ 01, 01 –0/0→ 10, …", and only then start the ripples.
:::

:::note{#recap-shortest title="Recap" depth="quick"}
Breadth-first levels from the start state; stop at the first arc that meets the target (state **and** output, if asked); read the path back. A reachable
target needs at most $n - 1$ inputs ($n$ for an arc with an output); if the levels stop growing first, nothing reaches it.
:::

### Worked examples: shortest inputs

::::example{#ex-sh-101 level="easy" title="How soon can the 101 detector say yes?" depth="quick"}
For the overlapping 101 Mealy detector, find the shortest input that produces an output 1 starting from $S_0$, from $S_1$ and from $S_2$.

:::step{why="The only arc with output 1 is S2 –1/1→ S1, so the target is 'be in S2, then read 1'."}
From $S_2$: the input **1** (length 1).
:::

:::step{why="Breadth-first: S1 reaches S2 with one 0; S0 reaches S1 with one 1."}
From $S_1$: **01** (length 2). From $S_0$: **101** (length 3).
:::

:::answer
Lengths 3, 2, 1 from $S_0, S_1, S_2$: exactly $k - i$ for the prefix state $S_i$, the distances used in the proof that the detector's states are all
different. The search confirms that no state can shortcut the pattern.
:::
::::

::::example{#ex-sh-2001 level="medium" title="When does the 2001 machine first complement a bit?" depth="standard"}
For the 2001 copy/complement machine (A: 0/0 → B, 1/1 → A; B: 0/0 → C, 1/1 → A; C: 0/1 → C, 1/0 → D; D: 0/1 → C, 1/0 → A), what is the shortest input whose
**last output bit differs from its last input bit**?

:::step{why="Outputs differ from inputs exactly on arcs leaving C or D, the complement-mode states."}
So the target is: reach C or D, then read any bit.
:::

:::step{why="Breadth-first from A."}
Level 1: input 0 gives B (input 1 stays in A). Level 2: input 00 gives C, a complement-mode state.
:::

:::answer
Length **3**: 000 (outputs 001) or 001 (outputs 000). Two 0s switch the machine to complement mode, and only the **third** bit is complemented, because the
bit that completes 00 is still copied. Searching "until the state is C" and answering 2 is the trap: the target was a property of the output, which only
the next arc provides.
:::
::::

::::example{#ex-sh-2009 level="gate" title="The 2009 state table (GATE 2009)" depth="standard"}
A machine with state bits $A, B$ has the table (present $AB$, input → next $AB$, output): 00, 0 → 00, 1; 01, 0 → 10, 0; 10, 0 → 01, 0; 11, 0 → 10, 0;
00, 1 → 01, 0; 01, 1 → 00, 1; 10, 1 → 01, 1; 11, 1 → 00, 1. From 00, what is the minimum length of an input that takes the machine to $AB = 01$ with output 1?

:::step{why="Find the arcs that meet the target: next state 01 and output 1."}
Arcs into 01: 00 –1/0, 10 –0/0, 10 –1/**1**. Only **10 –1/1→ 01** carries output 1.
:::

:::step{why="Breadth-first levels from 00 to find the source state 10."}
Level 1: input 1 gives 01 (input 0 stays in 00). Level 2: from 01, input 0 gives 10.
:::

:::step{why="Append the target arc's input."}
00 –1→ 01 –0→ 10 –1→ 01 with output 1: input **101**.
:::

:::answer
Length **3** (GATE 2009, option A). The tempting length 1 (input 1 from 00 does reach 01) has output 0; 4, 5 and 6 come from reading the table's columns in
the wrong order or from a depth-first search that wanders before it finds the target.
:::
::::

::::example{#ex-sh-unreach level="gate" title="Edge case: a target that no input reaches" depth="standard"}
In the 2009 machine, what is the shortest input that takes the machine from 00 to $AB = 11$ (with any output)?

:::step{why="Look for arcs into the target first."}
The next-state column contains 00, 10, 01, 10, 01, 00, 01, 00: **no arc enters 11**.
:::

:::step{why="Confirm with the levels: they must stop growing."}
Level 0: {00}. Level 1 adds 01. Level 2 adds 10. Level 3 adds nothing new. The reachable set is {00, 01, 10}.
:::

:::answer
**No input** reaches 11, of any length: the search stops after three levels, as the theorem allows. (State 11 is not useless in the table, it has arcs out, but a
machine started in 00 never gets there.) In a multiple-choice question with only numbers as options, such a target would be a flawed question; in design work
it flags a state that can be removed.
:::
::::

## From a state machine to a circuit

:::intuition{#circuit-intuition title="Giving every state a number plate" depth="standard"}
A state diagram talks about states with names: "copy, last bit 0". Flip-flops only hold bits. To build the machine you must give every state a **code**, a
pattern of flip-flop values, like a number plate on a car. Once every state has a plate, each arc becomes a row of a truth table ("plate 01 with input 0 goes
to plate 10") and the rest is the counter-design procedure of [Lesson 5](lesson:synchronous-counter-design), with the input as one more variable. Which plate
goes on which car is up to you, and a clever choice can make the logic almost disappear.
:::

:::definition{#fsm-to-circuit term="Implementing a state machine" depth="standard"}
1. **Minimise** the number of states if possible ([next lesson](lesson:state-minimisation)).
2. **State assignment:** choose a code for every state (next block); $n$ states need at least $\lceil \log_2 n \rceil$ flip-flops.
3. **Encoded state table:** one row per (present code, input): next code and output. Unused codes are don't-cares (then check where they go, as in Lesson 5).
4. **Flip-flop inputs:** for D flip-flops $D_i = Q_i^+$; for T, $T_i = Q_i \oplus Q_i^+$; for JK, $J_i$ from the rows with $Q_i = 0$ and $K_i$ from the rows with
   $Q_i = 1$ (the excitation tables of [Lesson 2](lesson:flip-flops)).
5. **K-maps** over the state bits **and the input**; minimise each input equation and the output equation (over the state bits only for Moore).
6. **Check** by simulating the circuit on the example strings, and decide what the unused codes do.
:::

:::definition{#state-assignment term="State assignment: binary, Gray and one-hot" depth="standard"}
| Assignment | Flip-flops for $n$ states | How codes are chosen | Strengths | Costs |
|:--|:--|:--|:--|:--|
| Binary | $\lceil \log_2 n \rceil$ | states numbered 0, 1, 2, … in some order | fewest flip-flops | logic can be large; many bits change on some arcs |
| Gray-style (adjacent) | $\lceil \log_2 n \rceil$ | states joined by many arcs get codes differing in one bit | fewer, larger K-map groups; fewer bits switching | needs thought; not always possible for every arc |
| One-hot | $n$ | state $i$ is the code with only bit $i$ equal to 1 | next-state logic read straight off the diagram; fast, easy to debug | most flip-flops; $2^n - n$ unused codes |

With $\lceil \log_2 n \rceil$ bits the number of different assignments grows very fast (24 for 4 states in 2 bits), and different assignments give different
but **equivalent** circuits: same behaviour, different gates. A good rule of thumb is to make **state bits mean something** ("mode", "last bit was 0"):
the equations then follow the words. One-hot trades flip-flops for logic, which suits technologies with many flip-flops and little logic per flip-flop.
:::

:::theorem{#one-hot-equations name="One-hot next-state equations can be read off the diagram" depth="standard"}
With a one-hot assignment (one flip-flop $Q_s$ per state, $Q_s = 1$ exactly in state $s$) and D flip-flops, the machine is implemented by
$$D_t = \sum_{\text{arcs } s \xrightarrow{x = a} t} Q_s \cdot [x = a], \qquad z = \sum_{\text{arcs } s \xrightarrow{x = a,\ z = 1}} Q_s \cdot [x = a]\ \text{(Mealy)},$$
where $[x = a]$ is $x$ or $\bar x$. From every valid one-hot code, exactly one $D_t$ is 1, so the next state is again a valid one-hot code.
:::

:::proof{#proof-one-hot-equations of="the one-hot equations" depth="standard"}
**Idea first:** in a one-hot code, the flip-flop of the present state is the only 1, so each product $Q_s \cdot [x = a]$ is 1 exactly when "we are in $s$
and the input is $a$", i.e. exactly when that arc is taken.

Let the present state be $s^*$ and the input $a^*$. A term $Q_s [x = a]$ is 1 iff $s = s^*$ and $a = a^*$, i.e. iff its arc is the one being taken. Since the
machine is deterministic, exactly one arc leaves $s^*$ on $a^*$, ending in $t^* = \delta(s^*, a^*)$. So $D_{t^*} = 1$ (its sum contains that term) and every other
$D_t = 0$ (none of its terms is the arc being taken). The output sum is 1 iff the arc being taken has output 1. ∎

**Note.** The equations say nothing about the $2^n - n$ codes that are not one-hot; from 0000 every $D$ is 0 and the machine stays stuck. A real one-hot design
adds a reset into the start state, the same self-start concern as [Lesson 5](lesson:synchronous-counter-design)'s lock-out.
:::

:::definition{#jk-implementation term="The 2001 machine with JK (S-K) flip-flops" depth="standard"}
The 2001 paper asks for "S-K master-slave flip-flops": a master–slave flip-flop with set and reset inputs that toggles when both are 1, i.e. a **JK** flip-flop
(the master–slave construction avoids race-around, [Lesson 2](lesson:flip-flops)). With the assignment A = 00, B = 01, C = 10, D = 11, bit $Q_1$ is the **mode**
(0 copy, 1 complement) and bit $Q_0$ is the **flag** ("one more of the same bit ends the mode"). The encoded table and the JK excitation give
$$J_1 = Q_0\bar x, \quad K_1 = Q_0 x, \quad J_0 = Q_1 x + \bar Q_1 \bar x, \quad K_0 = 1, \quad z = x \oplus Q_1.$$
They read like the words: the mode flips to complement ($J_1$) when the flag is set and another 0 arrives, and back to copy ($K_1$) when the flag is set and
another 1 arrives; the flag is set ($J_0$) by the bit that would end the mode and always cleared at the next clock ($K_0 = 1$), whether by a mode change or by the
other bit. Another assignment gives other, equally correct equations: with A = 00, B = 01, C = 11, D = 10, the same procedure gives $J_1 = Q_0\bar x$,
$K_1 = \bar Q_0 x$, $J_0 = \bar x$, $K_0 = x$, because $Q_0$ now simply means "the last bit was 0" ($Q_0^+ = \bar x$).
:::

The animation runs the whole procedure for the 2001 machine with the first assignment.

:::viz{#fsm-to-circuit-viz spec="fsm-to-circuit" mode="animate" depth="standard"}
:::

:::note{#recap-circuit title="Recap" depth="quick"}
Assign codes, write the encoded table with the input as a variable, take each flip-flop's input column from its excitation table, minimise, check on the example.
Binary uses the fewest flip-flops, one-hot the simplest logic ($D_t$ = OR of the arcs into $t$); assignments that give bits a meaning give small equations.
:::

### Worked examples: from machine to hardware

::::example{#ex-hw-2005 level="easy" title="The 2's complementer with one D flip-flop" depth="quick"}
Implement the 2005 machine (Q0: 0/0 stay, 1/1 → Q1; Q1: 0/1, 1/0 stay) with one D flip-flop, coding Q0 as 0 and Q1 as 1.

:::step{why="The next state is 1 once a 1 has been seen: in state 1 always, in state 0 when x = 1."}
$Q^+ = Q + x$, so $D = Q + x$.
:::

:::step{why="The output is x in state 0 and x′ in state 1."}
$z = \bar Q x + Q\bar x = Q \oplus x$.
:::

:::answer
$D = Q + x$, $z = Q \oplus x$: one OR gate, one XOR gate, one flip-flop, reset to 0 before each number. The output uses $x$ directly, so it is a Mealy output and
must be read before the clock edge that shifts in the next bit.
:::
::::

::::example{#ex-hw-table level="medium" title="The 2001 machine: from words to an encoded state table" depth="standard"}
Write the encoded state table of the 2001 copy/complement machine with A = 00, B = 01, C = 10, D = 11 ($Q_1Q_0$), and find D flip-flop equations.

:::step{why="Each (state, input) pair becomes one row: present code, input, next code, output."}
00: $x = 0$ → 01, 0; $x = 1$ → 00, 1. 01: 0 → 10, 0; 1 → 00, 1. 10: 0 → 10, 1; 1 → 11, 0. 11: 0 → 10, 1; 1 → 00, 0.
:::

:::step{why="With D flip-flops the D columns are the next-state bits."}
$Q_1^+ = 1$ in rows (01, 0), (10, 0), (10, 1), (11, 0): $D_1 = Q_0\bar x + Q_1\bar Q_0$.
:::

:::step{why="The same for the low bit."}
$Q_0^+ = 1$ in rows (00, 0) and (10, 1): $D_0 = \bar Q_1 \bar Q_0 \bar x + Q_1 \bar Q_0 x$.
:::

:::answer
$D_1 = Q_0\bar x + Q_1\bar Q_0$, $D_0 = \bar Q_1\bar Q_0\bar x + Q_1\bar Q_0 x$, $z = x \oplus Q_1$. All four codes are used, so there are no don't-cares and nothing to
lock out. The D design needs two 2-input and two 3-input AND terms; the JK design of the next example needs much less, because JK columns are half don't-cares.
:::
::::

::::example{#ex-hw-jk level="gate" title="J and K of the 2001 machine (GATE 2001)" depth="standard"}
For the same assignment, find minimal $J_1, K_1, J_0, K_0$.

:::step{why="J1 matters only in rows with Q1 = 0 (codes 00, 01), where J1 = Q1⁺."}
Rows 00/0, 00/1, 01/1 need $J_1 = 0$; row 01/0 needs $J_1 = 1$. Rows with $Q_1 = 1$ are ×. So $J_1 = Q_0\bar x$.
:::

:::step{why="K1 matters only in rows with Q1 = 1 (codes 10, 11), where K1 is the complement of Q1⁺."}
Rows 10/0, 10/1, 11/0 stay at 1 ($K_1 = 0$); row 11/1 goes to 0 ($K_1 = 1$). So $K_1 = Q_0 x$.
:::

:::step{why="J0 on rows with Q0 = 0 (codes 00, 10); K0 on rows with Q0 = 1 (codes 01, 11)."}
$J_0 = 1$ in rows 00/0 and 10/1, 0 in rows 00/1 and 10/0: $J_0 = \bar Q_1\bar x + Q_1 x$. Every row with $Q_0 = 1$ goes to $Q_0^+ = 0$: $K_0 = 1$.
:::

:::answer
$J_1 = Q_0\bar x$, $K_1 = Q_0x$, $J_0 = Q_1x + \bar Q_1\bar x$ (the XNOR of $Q_1$ and $x$), $K_0 = 1$, and $z = x \oplus Q_1$ (GATE 2001). Simulated on the question's
example, this circuit outputs 101100 10110100 011. Any other state assignment is also a correct answer if it is followed consistently; the equations change.
:::
::::

::::example{#ex-hw-onehot level="gate" title="Edge case: the 2001 machine one-hot" depth="standard"}
Implement the 2001 machine one-hot with D flip-flops $Q_A, Q_B, Q_C, Q_D$. How many flip-flops, and what are the equations?

:::step{why="One flip-flop per state; each D input is the OR of the arcs entering that state."}
Arcs into A: A–1, B–1, D–1, so $D_A = (Q_A + Q_B + Q_D)\,x$. Into B: A–0, so $D_B = Q_A\bar x$.
:::

:::step{why="The same for the other two states."}
Into C: B–0, C–0, D–0, so $D_C = (Q_B + Q_C + Q_D)\,\bar x$. Into D: C–1, so $D_D = Q_C x$.
:::

:::step{why="The output is 1 on arcs A–1, B–1 (copying a 1) and C–0, D–0 (complementing a 0)."}
$z = (Q_A + Q_B)\,x + (Q_C + Q_D)\,\bar x$.
:::

:::answer
**4** flip-flops (against 2 for binary), equations read straight off the diagram, and the same output on the 2001 example. The price: 12 of the 16 codes are not
one-hot; from 0000 every D is 0 and the machine is stuck, so the start state must be forced by a reset ($Q_A = 1$, the others 0).
:::
::::

## Try it: the state-machine tab

The **State machine** tab of the Counter & FSM Simulator runs this lesson's machines. Choose **Mealy** or **Moore**, edit the state table (up to 10 states: each
row has a next state and, for Mealy, an output for $X = 0$ and for $X = 1$), pick the start state, type an input string and press **Step** to feed one bit at a time
(or **Run the rest**): the current state is highlighted in the table and the output string grows, with the Moore string starting with the start state's output. The
presets load the overlapping 101 detector and the serial 2's complementer of this lesson; **Build detector** makes the detector for any pattern of up to 6 bits,
overlapping or not, Mealy or Moore. Try 101 overlapping and not on 10101, then the same as Moore, and count the states; then enter the 2001 machine (four states)
and feed it 10110001001011011. The **Minimise** button belongs to [the next lesson](lesson:state-minimisation).

:::lab{#lab-fsm lab="counter-fsm" tab="fsm" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-2001-b-59-a" tests="fsm-from-words,mealy-moore" depth="standard"}
:::

:::pyq{id="cse-2001-b-59-b" tests="fsm-to-circuit,jk-implementation,state-assignment" depth="standard"}
:::

:::pyq{id="cse-2002-a-30" tests="interpret-machine,trick-run-small" depth="standard"}
:::

:::pyq{id="cse-2005-cs-63" tests="serial-twos-complement,interpret-machine" depth="standard"}
:::

:::pyq{id="cse-2009-cs-27" tests="shortest-input,state-table-fsm" depth="standard"}
:::

:::pyq{id="cse-2021-2-cs-28" tests="two-state-mealy,fsm-from-words" depth="standard"}
:::

## Practice

Our own questions in GATE formats: running machines first, then detectors and their state counts, then interpretation, search and implementation.

:::practice{id="nx-dl-06-07-q01" depth="standard"}
:::

:::practice{id="nx-dl-06-07-q02" depth="standard"}
:::

:::practice{id="nx-dl-06-07-q03" depth="standard"}
:::

:::practice{id="nx-dl-06-07-q04" depth="standard"}
:::

:::practice{id="nx-dl-06-07-q05" depth="standard"}
:::

:::practice{id="nx-dl-06-07-q06" depth="standard"}
:::

:::practice{id="nx-dl-06-07-q07" depth="standard"}
:::

:::practice{id="nx-dl-06-07-q08" depth="standard"}
:::

:::practice{id="nx-dl-06-07-q09" depth="standard"}
:::

:::practice{id="nx-dl-06-07-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Finite state machines on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Moore | output = $\lambda(\text{state})$; written in the state; changes only after edges; reacts one clock later |
| Mealy | output = $\lambda(\text{state}, \text{input})$; written on the arc "x/z"; reacts in the same period; can glitch with the input |
| Conversion | Moore → Mealy: same states; Mealy → Moore: states (state, entering output), at most $\lvert S\rvert \cdot \lvert Z\rvert$ (2001: 4 → 6) |
| From words | state = what must be remembered; $2n$ arcs for $n$ states; test on the given example |
| Detectors | states = prefixes matched; failure arc = longest suffix that is a prefix; $k$ Mealy / $k + 1$ Moore states for a $k$-bit pattern |
| Overlap | 101 on 10101: overlapping 00101, non-overlapping 00100 (one arc differs) |
| Serial machines | 2005: copy to the first 1, then complement = 2's complement; serial adder: state = carry; 2021: state = previous bit, $t = b$, $y = sb$ |
| 2002 | output = 2-bit sum of the present and previous bits (option A) |
| Shortest input | breadth-first levels; check the arc's output; 2009: 101, length 3; at most $n - 1$ ($n$ with an output) or never |
| To circuit | assign codes → encoded table → excitation columns → K-maps with $x$ → equations → check |
| 2001 with JK | A = 00, B = 01, C = 10, D = 11: $J_1 = Q_0\bar x$, $K_1 = Q_0x$, $J_0 = Q_1x + \bar Q_1\bar x$, $K_0 = 1$, $z = x \oplus Q_1$ |
| One-hot | $n$ flip-flops; $D_t$ = OR of the arcs into $t$; needs a reset into the start state |
:::
