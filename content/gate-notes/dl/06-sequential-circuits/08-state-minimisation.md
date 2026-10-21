---
id: state-minimisation
subject: dl
chapter: sequential-circuits
title: "State minimisation"
order: 8
prerequisites: [finite-state-machines]
pyq_topics: [dl/sequential]
est_minutes: 60
difficulty: core
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every partition, implication-table pass, merged table, state count and practice answer is computed in content/gate-notes/_checks/dl/l6_08_minimisation.py (seqlib FSM: partitions, implication, minimal_states, equivalent, reachable)."
  - "Coverage checklist only (internal digests, never copied): set E p. 409 (implication table)."
  - "Facts checked against: Z. Kohavi and N. K. Jha, Switching and Finite Automata Theory (state equivalence, k-equivalence, partition refinement, implication tables, incompletely specified machines); M. Morris Mano and M. D. Ciletti, Digital Design (state reduction)."
  - "PYQs: src/gate/questions.json (cse-1996-a-48, cse-2003-cs-44, cse-2025-1-cs-49); every key is re-derived by partition refinement, cross-checked with the implication table and with a product-machine equivalence test."
updated: "2026-10-20"
---

*State machines, lesson 2 of 2.* [Lesson 7](lesson:finite-state-machines) turned word problems into state
tables and state tables into flip-flops and gates. It did not ask whether the table had **too many states**.
Tables written by hand often do: two states that were invented for different reasons ("I have just seen a 0",
"I have just been reset") may turn out to behave identically for every input that could ever follow. Such
states are **equivalent**, and a machine that keeps both of them pays for a state it does not need: possibly an
extra flip-flop, and certainly extra rows in every K-map. This lesson makes "behave identically" precise, proves
the two standard procedures that find all equivalent states (**partition refinement** and the **implication
table**), shows how to count the states a word specification needs without drawing a table at all, and ends
with what minimisation buys in hardware and what it does not.

## Where this fits

[Lesson 7](lesson:finite-state-machines) gave us Mealy and Moore machines, their state tables and state
diagrams, and the procedure from a table to a circuit: assign codes, write the excitation table, minimise the
input equations. Minimising the number of states comes **before** state assignment: fewer states means fewer
codes to assign, often fewer flip-flops (an $n$-state machine needs $\lceil \log_2 n \rceil$ of them, as in
[Lesson 4](lesson:ripple-counters)), and more unused codes that become don't-cares in the K-maps of
[Lesson 5](lesson:synchronous-counter-design). The same refinement algorithm minimises DFAs. The
language-theoretic side (Myhill–Nerode, uniqueness of the minimal DFA, regular languages) belongs to the Theory of
Computation subject and is not re-taught here. We prove the algorithm only for Mealy and Moore output machines, as
GATE asks it on state tables. The sentence to keep: **two states are equivalent when no input sequence can ever tell
them apart by the outputs, and a minimal machine keeps one state per class of equivalent states.**

:::table{#radar title="GATE radar: state minimisation" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 3 (1996, 2003, 2025) |
| Marks | all 2-mark questions: MCQs in 1996 and 2003, a NAT in 2025 |
| Pattern 1 | Minimise a given Mealy state table and count the states: 1996 (4 states), 2025 (8 states) |
| Pattern 2 | Count the states a word specification needs, with no table given: 2003 |
| Method | partition refinement (fastest by hand) or the implication table; both give the same classes |
| What examiners test | that equivalence is about **all future outputs**, not identical rows; that refinement must continue until nothing splits; that P₀ of a Mealy machine groups by the whole output row; that a lower bound needs pairwise distinguishable states |
:::

## Equivalent states and k-equivalence

:::intuition{#equiv-intuition title="Two shop assistants who always give the same answers" depth="standard"}
A shop has two assistants at the counter. You cannot see them; you can only hand in questions one after another
and read the answers. Suppose that, whatever sequence of questions you hand in, the answers that come back are
exactly the same whether assistant P or assistant Q is on duty. Then, as far as any customer can ever tell, P and
Q are **interchangeable**: the shop can send one of them home and nobody will notice.

Notice what we did **not** require. P and Q may think differently, use different notebooks, and walk to
different shelves; all that matters is that the answers agree for every possible sequence of questions. Notice
also how strong "every" is: agreeing on the first question, or on the first ten, is not enough. A single question
sequence, however long, that makes them answer differently means they are not interchangeable.

A state of a sequential machine is an assistant. The input sequence is the list of questions, and the output
sequence is the list of answers. Two states that can never be told apart by the outputs are redundant copies of
one another, and the machine needs only one of them.
:::

:::definition{#equivalent-states term="Equivalent states" depth="standard"}
Let $M$ be a completely specified machine with next-state function $\delta(p, x)$ and output $\lambda(p, x)$
(Mealy) or $\lambda(p)$ (Moore). For an input string $w = x_1x_2\dots x_k$, write $\lambda(p, w)$ for the
**output sequence** that $M$ produces when it starts in state $p$ and reads $w$ (for a Moore machine, the outputs
of the states visited, including $\lambda(p)$ itself).

Two states $p$ and $q$ are **equivalent**, written $p \equiv q$, when
$$\lambda(p, w) = \lambda(q, w) \quad \text{for every input string } w.$$
They are **distinguishable** when some string $w$ gives different output sequences; such a $w$ is a
**distinguishing string** for the pair. A machine is **minimal** (reduced) when no two of its states are
equivalent.
:::

The definition talks about infinitely many strings, so it cannot be checked by trying them all. The rest of the
lesson turns it into a finite procedure. The first step is to see that equivalence behaves like equality, so the
states fall into clean classes.

:::theorem{#equivalence-relation name="State equivalence is an equivalence relation, and merging a class keeps the behaviour" depth="standard"}
For any completely specified machine:

1. $\equiv$ is **reflexive** ($p \equiv p$), **symmetric** ($p \equiv q \Rightarrow q \equiv p$) and **transitive**
   ($p \equiv q$ and $q \equiv r$ $\Rightarrow$ $p \equiv r$), so the states split into disjoint
   **equivalence classes**.
2. **Closure:** if $p \equiv q$ then for every input $x$ the outputs agree, $\lambda(p, x) = \lambda(q, x)$ (Mealy) or
   $\lambda(p) = \lambda(q)$ (Moore), and the next states are equivalent: $\delta(p, x) \equiv \delta(q, x)$.
3. **Merging:** build $M'$ with one state $[p]$ per class, $\delta'([p], x) = [\delta(p, x)]$ and
   $\lambda'([p], x) = \lambda(p, x)$ (Moore: $\lambda'([p]) = \lambda(p)$). This is well defined (it does not depend on which member $p$ we pick), and
   $M'$ started in $[p]$ produces the same output sequence as $M$ started in $p$, for every string.
:::

:::proof{#proof-equivalence-relation of="the equivalence-relation theorem" depth="standard"}
**Idea first:** "has the same output sequence for every string" is equality of two infinite tables of
outputs, and equality is always reflexive, symmetric and transitive. Closure says that a common future
stays common after one step, and merging uses closure to show that the merged machine can never notice which
member it is standing in.

*Part 1.* $\lambda(p, w) = \lambda(p, w)$ for every $w$, so $p \equiv p$. If $\lambda(p, w) = \lambda(q, w)$ for every $w$,
then $\lambda(q, w) = \lambda(p, w)$ for every $w$. If $\lambda(p, w) = \lambda(q, w)$ and $\lambda(q, w) = \lambda(r, w)$
for every $w$, then $\lambda(p, w) = \lambda(r, w)$ for every $w$. A relation with these three properties splits a set
into disjoint classes.

*Part 2.* Take the one-symbol string $w = x$: the outputs must agree. Now take any string $v$. The output sequence
of $xv$ from $p$ is the outputs read before and during the first input ($\lambda(p, x)$ for Mealy, $\lambda(p)$ for
Moore) followed by the output sequence of $v$ from $\delta(p, x)$, and the same for
$q$. Since $\lambda(p, xv) = \lambda(q, xv)$ and the first parts agree, the remaining parts agree:
$\lambda(\delta(p, x), v) = \lambda(\delta(q, x), v)$ for every $v$, which is $\delta(p, x) \equiv \delta(q, x)$.

*Part 3.* If $p \equiv q$ then by part 2 $\lambda(p, x) = \lambda(q, x)$ and $[\delta(p, x)] = [\delta(q, x)]$, so
$\lambda'$ and $\delta'$ give the same answer whichever member represents the class. Now induct on the length of $w$:
the first output of $M'$ from $[p]$ is $\lambda(p, x_1)$, exactly that of $M$; $M'$ moves to $[\delta(p, x_1)]$ while
$M$ moves to $\delta(p, x_1)$, a member of that class; by the induction hypothesis the rest of the outputs agree. ∎
:::

Part 3 is the whole reason for this lesson: **a class of equivalent states can be replaced by a single state
without changing anything an observer can see**, and part 1 guarantees the classes do not overlap, so the merged
machine is well defined and unique. To find the classes we approach "every string" in stages.

:::definition{#k-equivalence term="k-equivalence" depth="standard"}
Call an experiment on a state a **$k$-step experiment** when it uses at most $k$ transitions before reading its
last output. For a Mealy machine that means input strings of length at most $k + 1$ (the output on the next input
is visible without moving); for a Moore machine, strings of length at most $k$ (the state's own output is visible
without moving).

States $p$ and $q$ are **$k$-equivalent**, written $p \equiv_k q$, when every $k$-step experiment gives the same
outputs from both. In particular:

- $p \equiv_0 q$ means the **output signatures** agree: the whole output row
  $(\lambda(p, 0), \lambda(p, 1))$ for a Mealy machine, the single output $\lambda(p)$ for a Moore machine;
- $p \equiv q$ exactly when $p \equiv_k q$ for every $k$, because every string is a $k$-step experiment for some $k$;
- $\equiv_{k+1}$ is finer than $\equiv_k$: a pair that a short experiment separates stays separated.
:::

:::theorem{#k-step-lemma name="One more step of look-ahead" depth="standard"}
For every $k \ge 0$:
$$p \equiv_{k+1} q \iff p \equiv_0 q \ \text{ and } \ \delta(p, x) \equiv_k \delta(q, x) \ \text{ for every input } x.$$
:::

:::proof{#proof-k-step-lemma of="the one-more-step lemma" depth="standard"}
**Idea first:** a $(k + 1)$-step experiment is "look at the outputs now, apply one input, then run a $k$-step
experiment from wherever you landed".

($\Rightarrow$) The 0-step experiments are among the $(k + 1)$-step ones, so $p \equiv_0 q$. If some $k$-step
experiment $v$ separated $\delta(p, x)$ from $\delta(q, x)$, then "$x$ followed by $v$" would be a $(k + 1)$-step
experiment separating $p$ from $q$, a contradiction.

($\Leftarrow$) A $(k + 1)$-step experiment from $p$ reads some outputs before its first transition (these agree
because $p \equiv_0 q$), takes one input $x$, and then performs a $k$-step experiment from $\delta(p, x)$; the same
experiment from $q$ continues from $\delta(q, x)$, and $\delta(p, x) \equiv_k \delta(q, x)$ makes those outputs agree
too. ∎
:::

:::note{#recap-equivalence title="Recap" depth="quick"}
$p \equiv q$ means the same output sequence for **every** input string. It is an equivalence relation, it is
preserved by every transition, and each class can be merged into one state without changing the behaviour.
$k$-equivalence is the same test limited to $k$ transitions, and one more step of look-ahead is "same outputs now,
$k$-equivalent next states".
:::

## Partition refinement, round by round

:::intuition{#refinement-intuition title="Sorting suspects by their alibis" depth="standard"}
A detective has eight suspects and wants to know which of them are really the same person in disguise. She first
sorts them by what they say right now: suspects whose answers differ are certainly different people, so they go
into different groups. Then she sends each suspect one step forward ("where did you go when the bell rang?") and
looks at **which group** each one ends up in. Two suspects in the same group who walk into different groups are
not the same person after all, and the group is split. She repeats until a whole round splits nothing.

The trick is that she never follows anybody further than one step per round. Each round uses the groups found in
the previous round as its yardstick, so one step of look-ahead per round adds up to as many steps as needed.
:::

:::definition{#partition-refinement term="Partition refinement (Moore's algorithm)" depth="standard"}
For a completely specified machine with states $S$:

1. **$P_0$**: group the states by their output signature. Mealy: states with the same **output row** (the outputs for
   every input) share a block. Moore: states with the same **state output** share a block.
2. **$P_{k+1}$**: inside each block of $P_k$, give every state the label "which block of $P_k$ is $\delta(s, x)$ in, for
   each input $x$". States of the same block with the same label stay together; different labels split the block.
   Blocks are never merged.
3. **Stop** at the first $k$ with $P_{k+1} = P_k$. The blocks of $P_k$ are the equivalence classes; the number of blocks
   is the number of states of the minimal machine.

Then merge: keep one representative per block, and redirect every next state to the representative of its block.
:::

Notice what step 2 does **not** ask for: equal next states. Two states whose next states differ but lie in the same
block are as good as equal for this round. That is the single most important line of the procedure, and the
reason it finds equivalences that "look for identical rows" misses.

:::theorem{#refinement-correct name="Partition refinement is correct and stops within n − 1 rounds" depth="standard"}
Let the machine have $n$ states and let $P_0$ have $b$ blocks. Then:

1. For every $k$, the blocks of $P_k$ are exactly the classes of $\equiv_k$.
2. If $P_{k+1} = P_k$, then $P_j = P_k$ for every $j \ge k$, and the blocks of $P_k$ are exactly the classes of $\equiv$.
3. The procedure stops with $P_{k+1} = P_k$ for some $k \le n - b \le n - 1$. So partition refinement needs at most
   $n - b$ rounds that split something, plus one round that confirms nothing splits.
4. Consequently any two distinguishable states are told apart by an experiment with at most $n - b$ transitions.
:::

:::proof{#proof-refinement-correct of="the partition-refinement theorem" depth="standard"}
**Idea first:** the rule that builds $P_{k+1}$ from $P_k$ is exactly the one-more-step lemma, so by induction each
partition is the next level of $k$-equivalence; a partition that cannot split once can never split again, because
the next round would see exactly the same input; and a partition of $n$ things can only be split $n - b$ times
after starting with $b$ blocks.

*Part 1, by induction on $k$.* $P_0$ groups states by output signature, which is $\equiv_0$ by definition. Suppose the
blocks of $P_k$ are the classes of $\equiv_k$. Two states end in the same block of $P_{k+1}$ exactly when they were in
the same block of $P_k$ (in particular $p \equiv_0 q$, since $\equiv_k$ is finer than $\equiv_0$) and, for every $x$,
$\delta(p, x)$ and $\delta(q, x)$ lie in the same block of $P_k$, i.e. $\delta(p, x) \equiv_k \delta(q, x)$. By the lemma
that is exactly $p \equiv_{k+1} q$.

*Part 2.* $P_{k+2}$ is computed from $P_{k+1}$ by the same rule that computed $P_{k+1}$ from $P_k$. If $P_{k+1} = P_k$, the
rule gets the same input and returns the same output, so $P_{k+2} = P_{k+1}$, and so on for ever. Then $\equiv_j$ is the
same relation for every $j \ge k$, and $p \equiv q$ (which means $p \equiv_j q$ for every $j$) is the same as $p \equiv_k q$.

*Part 3.* Blocks only split, never merge, so each round either leaves the partition unchanged (and we stop) or
increases the number of blocks by at least 1. There are at most $n$ blocks, so after starting at $b$ blocks at most
$n - b$ rounds can change anything. Hence $P_{n-b+1} = P_{n-b}$ at the latest, and since $b \ge 1$ this is within
$n - 1$ rounds. (If $b = 1$, every state has the same outputs, nothing can ever split, and $P_1 = P_0$ at once: all
states are equivalent.)

*Part 4.* If $p \not\equiv q$, they are in different blocks of the final partition $P_k$ with $k \le n - b$, so by part 1
$p \not\equiv_k q$: some experiment with at most $k$ transitions separates them. ∎
:::

The animation runs the procedure on the eight-state table of GATE 2025. Watch how little work it is: the output
rows do most of the sorting, and a single round of "which block do the next states fall in" finishes the job.

:::viz{#partition-refinement-viz spec="partition-refinement" mode="animate" depth="standard"}
:::

:::trick{#trick-output-rows title="Let the output rows do the first sort" depth="standard"}
Before anything else, write each state's output row as a short code (00, 10, 11, …) next to the table and group
identical codes. In most exam tables this $P_0$ already isolates several states as singletons, and a singleton can
never split again, so the remaining work happens only inside the few big blocks. In GATE 2025 the output rows leave
one block of four states and one of two; one round on those six states finishes the question.

**Why it works:** $P_0$ is the first step of the procedure, not a shortcut, and every later split happens inside an
existing block. **When it fails:** never as a first step, but it is only a first step. Stopping at $P_0$ and counting
its blocks is the classic wrong answer (4 in GATE 2025, 2 in GATE 1996).
:::

:::trap{#trap-moore-p0 title="P₀ of a Mealy machine uses the whole output row" depth="standard"}
For a **Moore** machine, $P_0$ groups states by the one output written next to each state. For a **Mealy** machine,
$P_0$ groups states by the **whole row of outputs**, one per input value: two states belong together only if they
output the same thing for $x = 0$ **and** for $x = 1$.

The error examiners expect is to group a Mealy table by a single output column (usually the $x = 0$ column, or
whichever column is printed first), or to treat a Mealy table as if each state had one output. Take the two-state
Mealy machine $A$: on 0 → $A$/0, on 1 → $B$/0; $B$: on 0 → $A$/0, on 1 → $B$/1. Grouping by the $x = 0$ output alone puts
$A$ and $B$ in one block, their next states then fall in that same block, and the procedure "proves" a one-state
machine, which is wrong: the input 1 gives output 0 from $A$ and 1 from $B$. With whole rows, $P_0 = \{A\}, \{B\}$ and the
machine is already minimal with **2** states.
:::

:::trap{#trap-same-next title="Equivalent states need not have equal next states" depth="standard"}
"Merge states whose rows are identical" is a safe move, but it is not the method. Equivalence asks for the same
outputs and next states in the **same class**, not the same next states. In GATE 1996, $B$ goes to $A, C$ and $C$ goes
to $A, B$: the rows differ, so a student hunting for identical rows finds none and answers **4**. Yet $B \equiv C$,
because the only thing that separates their rows is the pair $(B, C)$ itself, and the minimal machine has **3** states.
Repeated identical-row merging happens to finish GATE 2025 (it merges $B$ with $E$ and $D$ with $H$, after which $A$ and
$C$ become identical), but in GATE 1996 it never starts. Only refinement, or the implication table, is complete.
:::

:::note{#recap-refinement title="Recap" depth="quick"}
$P_0$: group by output signature (whole row for Mealy, state output for Moore). $P_{k+1}$: split each block by the
blocks the next states fall in. Stop when a round splits nothing; the blocks are the equivalence classes. With $n$
states and $b$ blocks in $P_0$, at most $n - b$ rounds split anything.
:::

### Worked examples: partition refinement

::::example{#ex-pr-1996 level="easy" title="Four states, one Mealy table (GATE 1996)" depth="quick"}
A Mealy machine has the state table below (entries are next state, output). How many states does the minimal
machine have?

| PS | $x = 0$ | $x = 1$ |
|:--:|:--:|:--:|
| A | D, 0 | B, 1 |
| B | A, 0 | C, 1 |
| C | A, 0 | B, 1 |
| D | A, 1 | C, 1 |

:::step{why="P0 groups states by their whole output row, because Mealy outputs depend on the input."}
Output rows: $A$ 01, $B$ 01, $C$ 01, $D$ 11. So $P_0 = \{A, B, C\}, \{D\}$.
:::

:::step{why="Inside the big block, label each state by the blocks its two next states fall in."}
Call the blocks I $= \{A, B, C\}$ and II $= \{D\}$. $A \to (D, B) = $ (II, I); $B \to (A, C) = $ (I, I); $C \to (A, B) = $ (I, I).
$A$ has a different label, so it splits off: $P_1 = \{A\}, \{B, C\}, \{D\}$.
:::

:::step{why="Repeat with the new blocks; stop when nothing splits."}
Only $\{B, C\}$ can still split. $B \to (A, C)$ and $C \to (A, B)$: both go to block $\{A\}$ on 0 and to block $\{B, C\}$
on 1. Same label, no split: $P_2 = P_1$.
:::

:::answer
**3** states (GATE 1996, option B): $B \equiv C$. Merged table: $A$: $D$/0, $B$/1; $B$: $A$/0, $B$/1; $D$: $A$/1, $B$/1. Notice
that $B$ and $C$ never had equal rows; they only had next states in the same block. Answering 2 means stopping at
$P_0$; answering 4 means looking only for identical rows.
:::
::::

::::example{#ex-pr-moore6 level="medium" title="A six-state Moore machine" depth="standard"}
A Moore machine has six states with the outputs and next states below. Minimise it.

| PS | $x = 0$ | $x = 1$ | output |
|:--:|:--:|:--:|:--:|
| A | B | E | 1 |
| B | D | E | 1 |
| C | C | E | 0 |
| D | C | B | 1 |
| E | F | F | 0 |
| F | E | F | 0 |

:::step{why="A Moore machine's P0 groups states by the one output written next to each state."}
$P_0 = \{A, B, D\}$ (output 1), $\{C, E, F\}$ (output 0).
:::

:::step{why="Round 1: label each state by the blocks of its next states."}
With blocks 1 $= \{A, B, D\}$ and 0 $= \{C, E, F\}$: $A \to (B, E) = $ (1, 0), $B \to (D, E) = $ (1, 0), $D \to (C, B) = $ (0, 1);
$C \to (C, E)$, $E \to (F, F)$ and $F \to (E, F)$ are all (0, 0). $D$ splits off: $P_1 = \{A, B\}, \{C, E, F\}, \{D\}$.
:::

:::step{why="Round 2 uses the blocks of P1, so a state can split now that did not split before."}
$A \to (B, E)$: $B$ is in $\{A, B\}$. $B \to (D, E)$: $D$ is in $\{D\}$. Different labels, so $\{A, B\}$ splits.
$C, E, F$ still lead only into $\{C, E, F\}$. $P_2 = \{A\}, \{B\}, \{C, E, F\}, \{D\}$.
:::

:::step{why="One more round confirms nothing splits, so the blocks are the classes."}
$\{C, E, F\}$ maps into itself on both inputs and the other blocks are singletons: $P_3 = P_2$.
:::

:::answer
**4** states: $C \equiv E \equiv F$. Merged table: $A$: $B$, $C$ / 1; $B$: $D$, $C$ / 1; $C$: $C$, $C$ / 0; $D$: $C$, $B$ / 1. The key
observation: once the machine enters $\{C, E, F\}$ it can never leave and always outputs 0, so the three states are one
"output 0 for ever" state. $A$ and $B$ needed two rounds to separate, so no input string of length 1 tells them
apart, but the string 0 0 does: it gives the outputs 1, 1, 1 from $A$ (through $B$ and $D$) and 1, 1, 0 from $B$ (through $D$
and $C$).
:::
::::

::::example{#ex-pr-2025 level="gate" title="Eight states, two rounds (GATE 2025)" depth="standard"}
A Mealy machine with input $X$ and output $f$ has the table below (next state for $X = 0, 1$; output for
$X = 0, 1$). What is the minimum number of states needed to realise it?

| PS | next, $X = 0$ | next, $X = 1$ | $f$, $X = 0$ | $f$, $X = 1$ |
|:--:|:--:|:--:|:--:|:--:|
| A | F | B | 0 | 0 |
| B | D | C | 0 | 0 |
| C | F | E | 0 | 0 |
| D | G | A | 1 | 0 |
| E | D | C | 0 | 0 |
| F | F | B | 1 | 1 |
| G | G | H | 0 | 1 |
| H | G | A | 1 | 0 |

:::step{why="First drop unreachable states; here every state is reachable from A, so nothing is dropped."}
From $A$: $F, B$; from $B$: $D, C$; from $C$: $E$; from $D$: $G$; from $G$: $H$. All 8 states are reachable.
:::

:::step{why="P0 by whole output rows."}
Rows: $A, B, C, E$ → 00; $D, H$ → 10; $F$ → 11; $G$ → 01. $P_0 = \{A, B, C, E\}, \{D, H\}, \{F\}, \{G\}$ (4 blocks).
:::

:::step{why="Round 1: label by the blocks of the next states, I = {A,B,C,E}, II = {D,H}, III = {F}, IV = {G}."}
$A \to (F, B) = $ (III, I), $C \to (F, E) = $ (III, I); $B \to (D, C) = $ (II, I), $E \to (D, C) = $ (II, I); $D \to (G, A)$ and
$H \to (G, A)$ are both (IV, I). So $\{A, B, C, E\}$ splits into $\{A, C\}$ and $\{B, E\}$:
$P_1 = \{A, C\}, \{B, E\}, \{D, H\}, \{F\}, \{G\}$.
:::

:::step{why="Round 2 must be done: a block can split one round later than its neighbours."}
$A \to (F, B)$, $C \to (F, E)$: $B$ and $E$ share a block, so the labels agree. $B$ and $E$ both go to $(D, C)$; $D$ and $H$
both go to $(G, A)$. Nothing splits: $P_2 = P_1$.
:::

:::answer
**5** states (GATE 2025): $\{A, C\}$, $\{B, E\}$, $\{D, H\}$, $\{F\}$, $\{G\}$. Merged: $A$: $F$, $B$ / 0, 0; $B$: $D$, $A$ / 0, 0;
$D$: $G$, $A$ / 1, 0; $F$: $F$, $B$ / 1, 1; $G$: $G$, $D$ / 0, 1. The expected wrong answers are 4 (stopping at $P_0$) and 6
(merging only the identical rows $B = E$ and $D = H$ and stopping there). By the theorem, with $n = 8$ and $b = 4$ at most
4 rounds could have split anything; here 1 did.
:::
::::

::::example{#ex-pr-edge level="gate" title="Edge case: a machine that is already minimal, found the slow way" depth="standard"}
The Moore detector for 1011 (overlapping) from [Lesson 7](lesson:finite-state-machines) has states $S_0, \dots, S_4$
(the length of the prefix matched so far): $S_0$: $S_0$, $S_1$; $S_1$: $S_2$, $S_1$; $S_2$: $S_0$, $S_3$; $S_3$: $S_2$, $S_4$;
$S_4$: $S_2$, $S_1$ (next states for 0, 1), with output 1 only in $S_4$. Run partition refinement and count the rounds.

:::step{why="Moore: P0 by the state output."}
$P_0 = \{S_0, S_1, S_2, S_3\}, \{S_4\}$: $n = 5$, $b = 2$, so at most $5 - 2 = 3$ rounds can split anything.
:::

:::step{why="Each round can peel off only the state whose next state just became special."}
Round 1: only $S_3$ can reach $S_4$ (on 1): $P_1 = \{S_0, S_1, S_2\}, \{S_3\}, \{S_4\}$. Round 2: only $S_2$ reaches $\{S_3\}$:
$P_2 = \{S_0, S_1\}, \{S_2\}, \{S_3\}, \{S_4\}$.
:::

:::step{why="Round 3 separates the last pair; a fourth round would only confirm."}
$S_0 \to (S_0, S_1)$ stays in $\{S_0, S_1\}$; $S_1 \to (S_2, S_1)$ reaches $\{S_2\}$. $P_3$ is all singletons, and nothing can
split a singleton.
:::

:::answer
The machine is **already minimal** (5 states), and refinement needed the **maximum** $n - b = 3$ splitting rounds: the
bound of the theorem is tight. The distinguishing strings grow by one symbol per round: 1 separates $S_3$ from the rest,
11 separates $S_2$, 011 separates $S_1$ from $S_0$. A machine that is already minimal still has to be processed to the
end; there is no shortcut that recognises minimality from $P_0$ alone (unless every block of $P_0$ is a singleton).
:::
::::

## The implication table

:::intuition{#implication-intuition title="A league table of pairs" depth="standard"}
Partition refinement sorts states into groups. The implication table looks at the same question pair by pair. For
each pair of states it asks: "if these two were equivalent, what else would have to be equivalent?" The answer is a
short list of pairs (the next states for each input). Then it works backwards from the pairs that are obviously
different (different outputs), crossing out every pair that **depends on** a crossed pair, until nothing more can be
crossed. Whatever survives was never shown to be different, and the theorem below says that means equivalent.

It is the same reasoning as refinement, organised as a triangle of cells instead of a list of groups. It is slower
for big tables, but it shows exactly **why** each pair is distinguishable, and it is the method most textbooks print.
:::

:::definition{#implication-table term="Implication table (pair chart)" depth="standard"}
For a machine with states $S_1, \dots, S_n$, draw a staircase with one cell for each unordered pair $\{p, q\}$ (rows $S_2$
to $S_n$, columns $S_1$ to $S_{n-1}$).

1. **Pass 0:** cross every cell whose states have different output signatures (whole output row for Mealy, the state
   output for Moore).
2. **Fill:** in every other cell write the **implied pairs** $\{\delta(p, x), \delta(q, x)\}$ for each input $x$, leaving out
   pairs with equal members (a state is always equivalent to itself). A cell may list its own pair; that entry can never
   cross it, because a cell is crossed only through a pair that is already crossed.
3. **Passes 1, 2, …:** cross every cell that lists a pair whose cell is already crossed. Repeat until a full pass crosses
   nothing.
4. The **uncrossed** cells are the equivalent pairs. Collect them into classes (they are transitive, by the theorem of the
   previous section) and merge.
:::

:::theorem{#implication-agrees name="The uncrossed pairs are exactly the equivalent pairs" depth="standard"}
Do the passes "in parallel" (pass $k$ uses the crossings made up to pass $k - 1$). Then the cell $\{p, q\}$ is crossed by
pass $k$ exactly when $p \not\equiv_k q$. Consequently the table stops after at most $n - 1$ productive passes, the uncrossed
cells are exactly the pairs with $p \equiv q$, and the classes they form are exactly the blocks of the final partition of
partition refinement.
:::

:::proof{#proof-implication-agrees of="the implication-table theorem" depth="standard"}
**Idea first:** pass 0 is the definition of $\not\equiv_0$, and "an implied pair is crossed" is the one-more-step lemma
read in the negative direction.

*Induction on $k$.* Pass 0 crosses $\{p, q\}$ exactly when the output signatures differ, i.e. $p \not\equiv_0 q$. Assume the
cells crossed by pass $k$ are exactly the pairs with $p \not\equiv_k q$. A cell $\{p, q\}$ is crossed by pass $k + 1$ when it
was crossed already or when some implied pair $\{\delta(p, x), \delta(q, x)\}$ was crossed by pass $k$, i.e.
$p \not\equiv_0 q$ or $\delta(p, x) \not\equiv_k \delta(q, x)$ for some $x$. By the one-more-step lemma that is exactly
$p \not\equiv_{k+1} q$. (Pairs with equal members are never crossed, since $s \equiv_k s$ always; a cell that lists itself
can only be crossed through some other implied pair.)

*Conclusion.* The crossed set grows with $k$ and is bounded, so a pass eventually crosses nothing. From then on the set is
fixed, just as $P_k$ became fixed, and by the induction it equals the set of pairs that are $\not\equiv_k$ for some $k$,
i.e. the distinguishable pairs. Both methods compute $\equiv_k$ level by level, so they agree level by level; the number
of productive passes equals the number of splitting rounds of refinement, at most $n - b \le n - 1$. ∎
:::

Crossing "in place" (using a crossing the moment it is made, even within the same pass) is what most people do by
hand. It can only cross things **earlier**, never cross anything that the parallel version leaves uncrossed, so it ends
with the same table. The pass numbers in this lesson are the parallel ones, because they match the rounds of
refinement.

:::viz{#implication-table-viz spec="implication-table" mode="animate" depth="standard"}
:::

:::trick{#trick-distinguish title="To prove two states differ, show one input string" depth="standard"}
Every crossed cell comes with a **certificate**: follow the chain of implied pairs back to a cell crossed in pass 0 and
read off the inputs along the way. In GATE 1996, the cell $A$–$B$ was crossed because it implies $A$–$D$ (input 0), and
$A$–$D$ has different outputs on input 0. So the string **0 0** separates $A$ from $B$: from $A$ it gives 0 (to $D$) and
then 1; from $B$ it gives 0 (to $A$) and then 0.

**Why it works:** each implied pair is one input step, and the pass-0 cell is an output difference, so the chain is a
distinguishing string; its length is the pass number plus one (Mealy). **When it fails:** an uncrossed cell has no
certificate, and you cannot prove equivalence by trying strings, because there are infinitely many; equivalence comes
from the table stopping, not from tests.
:::

:::note{#recap-implication title="Recap" depth="quick"}
One cell per pair; cross output mismatches; write implied pairs; cross every cell that implies a crossed cell; repeat
until a pass crosses nothing. The survivors are exactly the equivalent pairs, and they form the same classes as
partition refinement. A crossed cell's chain of implications is a distinguishing string.
:::

### Worked examples: implication tables

::::example{#ex-it-1996 level="easy" title="The GATE 1996 table as a pair chart" depth="quick"}
Use the implication table on the GATE 1996 machine ($A$: $D$/0, $B$/1; $B$: $A$/0, $C$/1; $C$: $A$/0, $B$/1; $D$: $A$/1, $C$/1).

:::step{why="Pass 0: D's output row (11) differs from the others' (01)."}
Cross $A$–$D$, $B$–$D$ and $C$–$D$. Three cells remain: $A$–$B$, $A$–$C$, $B$–$C$.
:::

:::step{why="Write the implied pairs, input 0 first, leaving out equal members."}
$A$–$B$: $(D, A)$ and $(B, C)$, so "AD, BC". $A$–$C$: $(D, A)$ and $(B, B)$, so "AD". $B$–$C$: $(A, A)$ and $(C, B)$, so "BC", the
cell's own pair.
:::

:::step{why="Pass 1 crosses every cell that lists a crossed cell; pass 2 finds nothing new."}
$A$–$B$ lists $A$–$D$ (crossed): cross it. $A$–$C$ lists $A$–$D$: cross it. $B$–$C$ lists only itself: it stays. Pass 2 crosses
nothing.
:::

:::answer
Only **$B$–$C$** survives, so $B \equiv C$ and the machine has **3** states, the same result as partition refinement. A cell that implies only itself is never crossed:
nothing outside the pair can ever separate it.
:::
::::

::::example{#ex-it-twopass level="medium" title="A crossing that needs a second pass" depth="standard"}
Minimise the Mealy machine $A$: $E$/1, $C$/0; $B$: $A$/1, $E$/0; $C$: $A$/1, $E$/0; $D$: $D$/1, $E$/0; $E$: $B$/0, $D$/0 (next
state/output for $x = 0$, then $x = 1$) with an implication table, recording the pass in which each cell is crossed.

:::step{why="Pass 0: E's output row is 00, every other row is 10."}
Cross $A$–$E$, $B$–$E$, $C$–$E$, $D$–$E$.
:::

:::step{why="Fill the remaining six cells with their implied pairs."}
$A$–$B$: AE, CE. $A$–$C$: AE, CE. $A$–$D$: DE, CE. $B$–$C$: nothing (identical rows). $B$–$D$: AD. $C$–$D$: AD.
:::

:::step{why="Pass 1 can only use the cells crossed in pass 0."}
$A$–$B$, $A$–$C$ and $A$–$D$ each list a pair with $E$, crossed in pass 0: cross all three. $B$–$D$ and $C$–$D$ list $A$–$D$, which was
not crossed before this pass, so they wait.
:::

:::step{why="Pass 2 sees the crossings of pass 1."}
$B$–$D$ and $C$–$D$ list $A$–$D$, now crossed: cross both. Pass 3 crosses nothing.
:::

:::answer
Only $B$–$C$ survives: **4** states ($B \equiv C$), so a 3-flip-flop design shrinks to 2 flip-flops. The second pass is the
point: $D$ looks exactly like $B$ and $C$ for one step (outputs 10, next state $E$ on 1), and the shortest strings that show
the difference have three symbols, for example 0 0 0 ($D$ stays in $D$ and outputs 1, 1, 1; $B$ goes to $A$ and then to $E$,
whose output on 0 is 0, so it outputs 1, 1, 0). Refinement agrees: $P_0$ has $\{A, B, C, D\}$,
$P_1 = \{A\}, \{B, C, D\}, \{E\}$, $P_2 = \{A\}, \{B, C\}, \{D\}, \{E\}$.
:::
::::

::::example{#ex-it-2025 level="gate" title="The 2025 table, pair by pair (GATE 2025)" depth="standard"}
Repeat GATE 2025 with an implication table and check that it gives the same 5 classes.

:::step{why="Pass 0 crosses every pair from different output-row groups: only pairs inside {A, B, C, E} or {D, H} survive."}
Of the 28 cells, 21 are crossed at once. The 7 survivors: $A$–$B$, $A$–$C$, $A$–$E$, $B$–$C$, $B$–$E$, $C$–$E$ and $D$–$H$.
:::

:::step{why="Fill the survivors."}
$A$–$B$: DF, BC. $A$–$C$: BE. $A$–$E$: DF, BC. $B$–$C$: DF, CE. $B$–$E$: nothing (identical rows). $C$–$E$: DF, CE. $D$–$H$:
nothing (identical rows).
:::

:::step{why="Pass 1: D–F was crossed in pass 0 (outputs 10 and 11)."}
$A$–$B$, $A$–$E$, $B$–$C$ and $C$–$E$ all list $D$–$F$: cross them. $A$–$C$ lists $B$–$E$, uncrossed. Pass 2 crosses nothing.
:::

:::answer
Uncrossed: $A$–$C$, $B$–$E$, $D$–$H$. Classes $\{A, C\}, \{B, E\}, \{D, H\}, \{F\}, \{G\}$: **5** states, exactly the blocks of
partition refinement. Refinement was faster here (one round on six states against 28 cells), which is why it is the
better exam method for large tables; the table is the better method when you must **show** why two states differ (input 0
from $A$ and $B$ leads to $F$ and $D$, which differ on the next input 1: output 1 from $F$, 0 from $D$).
:::
::::

::::example{#ex-it-edge level="gate" title="Edge case: two pairs that imply each other" depth="standard"}
Minimise $A$: $C$/0, $E$/1; $B$: $D$/0, $E$/1; $C$: $A$/1, $E$/0; $D$: $B$/1, $E$/0; $E$: $B$/0, $D$/0.

:::step{why="Pass 0 by whole output rows: A, B → 01; C, D → 10; E → 00."}
Every cell except $A$–$B$ and $C$–$D$ is crossed at once.
:::

:::step{why="Each survivor's implied pairs point at the other survivor."}
$A$–$B$: $(C, D)$ on 0, $(E, E)$ on 1, so it implies $C$–$D$. $C$–$D$: $(A, B)$ on 0, $(E, E)$ on 1, so it implies $A$–$B$.
:::

:::step{why="A pass crosses a cell only if an implied cell is already crossed; neither ever is."}
Pass 1 looks at $A$–$B$ (implies the uncrossed $C$–$D$) and at $C$–$D$ (implies the uncrossed $A$–$B$): nothing is crossed, so the
table has stopped.
:::

:::answer
Both pairs survive: $A \equiv B$ and $C \equiv D$, so the machine has **3** states: $\{A, B\}, \{C, D\}, \{E\}$. A circle of
implications is **not** a reason for doubt: each pair is equivalent **provided** the other is, and nothing outside the
circle can separate either. This is exactly where "assume they are equal unless forced apart" pays off; trying to prove
$A \equiv B$ by first proving $C \equiv D$ would go round for ever.
:::
::::

## Unreachable states

:::intuition{#unreachable-intuition title="A room with no door" depth="standard"}
A house plan shows a room that no corridor leads to. It does not matter how the room is furnished or whether it looks
like another room: nobody will ever stand in it. A state that the machine can never enter from its start state is such
a room. It costs flip-flop codes and K-map rows, yet it can never affect any output.
:::

:::definition{#unreachable term="Unreachable states" depth="standard"}
A state is **reachable** from the start state $s_0$ when some input string leads from $s_0$ to it (find them by a search
from $s_0$ along the arcs, as in [Lesson 3](lesson:sequential-analysis)). An unreachable state can be **deleted** together
with its row, before minimising, without changing the behaviour from $s_0$. Minimisation then works on the reachable part
only. The minimal machine for a start state is: drop the unreachable states, then merge equivalent states.
:::

The order does not matter, as long as the drop happens. Merging first and then deleting the classes that are unreachable from the
start gives the same machine. What goes wrong is skipping the drop altogether: an unreachable state that matches no reachable one keeps
a block of its own and inflates the count. The
Live Lab's Minimise button drops unreachable states first and says which ones it dropped.

:::trap{#trap-unreachable title="Minimising the whole table when part of it is unreachable" depth="standard"}
Partition refinement on the whole table treats every state as if it mattered. An unreachable state that is not equivalent
to any reachable state ends up in a block of its own and is counted. In the example below (state $E$ is unreachable from
$A$), refining all five states gives **5**, while the correct minimal machine started in $A$ has **4** states, and the
difference is a whole flip-flop (3 versus 2). When a question says "starting from state A", search from $A$ first. When it
gives no start state (as in GATE 1996 and 2025), check whether every state is reachable from the first one; in both papers
they are, so nothing changes.
:::

:::note{#recap-unreachable title="Recap" depth="quick"}
Search from the start state; delete what it cannot reach; then minimise. Unreachable states never change an output, but
left in they can add blocks and flip-flops.
:::

## Counting states from a word specification

:::intuition{#words-intuition title="What must the machine remember?" depth="standard"}
Some questions give no table at all: "the circuit outputs 1 once it has seen ...", "how many states does the minimum
machine need?". Drawing a table and minimising it works, but there is a faster way to think. Ask: **at this moment, what
facts about the past can still change a future output?** Every distinct answer that matters is a state; everything else is
detail the machine can forget. A parity checker does not need to remember how many 1s it has seen, only whether that number
is odd. A divisibility-by-3 checker does not need the number, only its remainder.

An upper bound comes from building any machine. A **lower bound** needs an argument that you cannot do with fewer, and the
argument is always the same: find input histories that must lead to **different** states because some future input would
make the outputs differ.
:::

:::definition{#min-states-from-words term="States from a word specification" depth="standard"}
To find the minimum number of states for a behaviour described in words:

1. **Decide what to remember.** List the different "situations" the past can leave the machine in, as far as the future
   outputs are concerned (a remainder, a difference of counts, how much of a pattern has been seen, whether a final
   verdict has been reached).
2. **Upper bound.** Build the machine with one state per situation and check that every transition and output is
   determined by the situation and the input. That many states suffice.
3. **Lower bound.** For each pair of situations, give a **distinguishing suffix**: an input string that produces different
   outputs after the two histories. Then no machine can merge them (theorem below).

When the two bounds meet, that is the minimum. Step 3 is exactly the "distinguishable states" test of this lesson,
applied to the histories that lead to each state.
:::

:::theorem{#distinguishing-strings name="Pairwise distinguishable histories force distinct states" depth="standard"}
Let $w_1, \dots, w_m$ be input strings (histories) such that for every $i \ne j$ there is a string $z$ for which the outputs
produced while reading $z$ after $w_i$ differ from those produced while reading $z$ after $w_j$. Then every machine with this
input–output behaviour has at least $m$ states. If moreover a machine with $m$ states realises the behaviour, it is minimal.
:::

:::proof{#proof-distinguishing-strings of="the distinguishing-strings bound" depth="standard"}
**Idea first:** pigeonholes. A deterministic machine's future depends only on its current state, so two histories that end
in the same state have identical futures.

Suppose a machine had fewer than $m$ states. Run it from its start on each of $w_1, \dots, w_m$. By the pigeonhole principle
two of them, say $w_i$ and $w_j$, end in the same state $s$. From then on the machine's outputs on any $z$ are
$\lambda(s, z)$ in both cases, so they are equal for every $z$, contradicting the choice of $w_i, w_j$. Hence at least $m$
states. A machine with exactly $m$ states then meets the bound, so none has fewer. ∎
:::

The general statement behind this theorem, that the minimum number of states is exactly the number of classes of
pairwise distinguishable histories, is the Myhill–Nerode theorem of the Theory of Computation subject. For GATE in digital
logic we only ever need the easy half proved above, plus a machine that meets it.

:::note{#recap-words title="Recap" depth="quick"}
Remember only what can change a future output. A machine with $m$ states is an upper bound; $m$ histories that are pairwise
distinguished by some suffix are a lower bound. When they meet, you have the minimum, without drawing a table.
:::

### Worked examples: states from words

::::example{#ex-w-parity level="easy" title="An odd-parity checker" depth="quick"}
A Moore machine reads bits and outputs 1 when the number of 1s read so far is odd. A first design counts the 1s modulo 4
(states 0, 1, 2, 3, output = count mod 2). How many states does the minimal machine need?

:::step{why="Only the parity of the count can change a future output."}
Count mod 4 is more than we need: counts 0 and 2 have the same parity, and so do 1 and 3, and adding a 1 changes the parity
the same way in both.
:::

:::step{why="Partition refinement confirms it (Moore: P0 by output)."}
$P_0 = \{0, 2\}, \{1, 3\}$. On input 0 each state stays; on input 1, $0 \to 1$, $2 \to 3$, $1 \to 2$, $3 \to 0$: both members of each
block go to the other block. Nothing splits: $P_1 = P_0$.
:::

:::step{why="Lower bound: the empty history and the history 1 are distinguished at once."}
After nothing the output is 0; after 1 it is 1. Two pairwise distinguishable histories: at least 2 states.
:::

:::answer
**2** states (one flip-flop, toggled by each 1: a T flip-flop with $T = x$). The four-state design merges in pairs.
:::
::::

::::example{#ex-w-mod3 level="medium" title="Divisible by 3, most significant bit first" depth="standard"}
Bits of a binary number arrive most significant bit first. A Moore machine outputs 1 when the number read so far is
divisible by 3. A designer tracks the value modulo 6 (states 0 to 5, next state $(2v + x) \bmod 6$). Minimise.

:::step{why="Reading one more bit doubles the value and adds the bit, so only v mod 3 matters for every future output."}
$v \to 2v + x$, and $(2v + x) \bmod 3$ depends only on $v \bmod 3$. So 0 and 3, 1 and 4, 2 and 5 should merge.
:::

:::step{why="Refinement: P0 by the output (1 exactly for v mod 3 = 0)."}
$P_0 = \{0, 3\}, \{1, 2, 4, 5\}$. Round 1: from 1 and 4 the next states are 2, 3 (mod 6: $2 \cdot 1 = 2$, 3; $2 \cdot 4 = 8 \equiv 2$, 9 ≡ 3);
from 2 and 5 they are 4, 5. Labels differ, so $P_1 = \{0, 3\}, \{1, 4\}, \{2, 5\}$. Round 2 splits nothing.
:::

:::step{why="Lower bound: three histories with pairwise distinguishing suffixes."}
Take the histories 0 (value 0), 1 (value 1) and 10 (value 2). Suffix empty separates 0 from both others (output 1 vs 0).
Between 1 and 10: suffix 1 gives values 3 and 5, outputs 1 and 0.
:::

:::answer
**3** states, one per remainder (2 flip-flops instead of 3). The six-state design was correct, just wasteful: it remembered
whether the value was even, which never affects divisibility by 3 in the future.
:::
::::

::::example{#ex-w-2003 level="gate" title="The difference of 0s and 1s reaches 2 (GATE 2003)" depth="standard"}
A 1-input, 2-output synchronous circuit outputs 00 until, after $k$ input bits with $z_k$ zeros and $n_k$ ones, either
$z_k - n_k = 2$ (then the output at tick $k$ and every later tick is 10) or $n_k - z_k = 2$ (then it is 01 for ever). What is
the minimum number of states of its state graph?

:::step{why="Decide what to remember: before a verdict, only the difference d = z − n matters, and it never leaves −1, 0, +1."}
While the output is still 00, $|d| \le 1$: starting at $d = 0$, a 0 adds 1 and a 1 subtracts 1, and reaching $\pm 2$ ends the
counting. After a verdict, only the verdict matters: two absorbing states, "10 for ever" and "01 for ever".
:::

:::step{why="Upper bound: build the five-state Mealy machine (the output at tick k comes with input k)."}
$d = 0$: on 0 → $d = +1$/00, on 1 → $d = -1$/00. $d = +1$: on 0 → L10/**10**, on 1 → $d = 0$/00. $d = -1$: on 0 → $d = 0$/00, on 1 →
L01/**01**. L10: on either input → L10/10. L01: on either → L01/01. Five states suffice.
:::

:::step{why="Lower bound: five histories, pairwise distinguished by a one-bit suffix."}
Histories ε, 0, 1, 00, 11 lead to $d = 0$, $+1$, $-1$, L10, L01. Their output rows are 00 00, 10 00, 00 01, 10 10, 01 01, all
different, so every pair is separated by the input 0 or the input 1 alone (for example ε and 0 by the suffix 0: 00 versus 10).
:::

:::answer
**5** states (GATE 2003, option A). A machine that also keeps $d = \pm 2$ as counting states, or that keeps counting after the
verdict, has more states, but refinement collapses all of them into these five (a simulation that tracks $d$ up to $\pm 6$
together with the verdict has 29 reachable states and minimises to exactly 5). The answer is also 5 if the circuit is read as
a Moore machine whose state after $k$ inputs carries the output of tick $k$. The usual wrong answers: 6 (a separate "start"
state, which is equivalent to $d = 0$) or 7 (keeping $d = \pm 2$ as states besides the two verdict states).
:::
::::

::::example{#ex-w-edge level="gate" title="Edge case: a detector with a state that only looks necessary" depth="standard"}
A designer writes a Moore machine that outputs 1 when the last two inputs were 1 1, with four states: $S$ (just reset),
$Z$ (last input 0), $O$ (last input 1, not after a 1), $OO$ (last two inputs 11, output 1). Transitions: from every state, 0 →
$Z$; 1 → $O$ from $S$ and $Z$, 1 → $OO$ from $O$ and $OO$. Is the machine minimal?

:::step{why="Moore P0 by output: only OO outputs 1."}
$P_0 = \{S, Z, O\}, \{OO\}$.
:::

:::step{why="Round 1: who can reach OO in one step?"}
$S \to (Z, O)$ and $Z \to (Z, O)$ stay in the big block; $O \to (Z, OO)$ reaches $\{OO\}$. $P_1 = \{S, Z\}, \{O\}, \{OO\}$. Round 2:
$S$ and $Z$ have the **same** next states, so nothing splits.
:::

:::step{why="Interpret the merge: the reset state carries no information that a 0 does not."}
"Just reset" and "last input was 0" both mean "no part of 11 has been seen". The two states are equivalent, and the
detector of [Lesson 7](lesson:finite-state-machines) built from prefixes has exactly the 3 states that remain.
:::

:::answer
Not minimal: **3** states ($S \equiv Z$). The Mealy version needs only 2 (Lesson 7's detector theorem: $k$ Mealy states and
$k + 1$ Moore states for a pattern of length $k$). A separate "reset" state is the most common source of an extra
equivalent state in hand-made tables; check it first.
:::
::::

## Incompletely specified machines

:::intuition{#incomplete-intuition title="Blank answers on the answer sheet" depth="deep"}
Sometimes a specification leaves an output blank: "after this input the output does not matter". Two states whose specified
outputs never clash can then be made to behave alike by filling the blanks suitably. But the blanks of one state cannot be
filled one way to agree with a second state and another way to agree with a third, and that breaks the clean class
structure we have relied on so far.
:::

:::definition{#incomplete term="Compatible states" depth="deep"}
In an **incompletely specified** machine some outputs (or next states) are "–", don't care. Two states are **compatible**
when no input string produces two **specified** outputs that differ at the same position. The implication table works as
before, with pass 0 crossing only pairs whose specified outputs clash.

Compatibility is reflexive and symmetric but **not transitive**: $A$ may be compatible with $B$ and $B$ with $C$ while $A$ and $C$
are not. So the states do not split into classes. Instead one looks for a smallest collection of **compatibility classes**
(sets of pairwise compatible states) that covers every state and is **closed** (for every class and input, the next states
lie inside some chosen class). The classes may overlap, and finding the smallest closed cover is a search problem, not a
single pass. GATE questions so far use completely specified tables; this section is for completeness.
:::

:::note{#recap-incomplete title="Recap" depth="quick"}
Don't-care outputs turn equivalence into compatibility, which is not transitive. Merging then means choosing a closed cover
of compatibility classes, which may overlap.
:::

## Why minimise: flip-flops and logic

:::intuition{#why-intuition title="Paying for the codes" depth="standard"}
Every state of a machine needs its own binary code, so the number of states sets the number of flip-flops. Removing states
can drop a flip-flop, but only when the count falls below a power of 2. Even when it does not, every removed state frees a
code, and an unused code becomes a don't-care in every K-map.
:::

:::definition{#why-minimise term="What state minimisation buys" depth="standard"}
A machine with $k$ states needs $\lceil \log_2 k \rceil$ flip-flops with a binary assignment (one-hot needs $k$). Minimisation
reduces $k$, so:

- it **saves a flip-flop** exactly when the count crosses a power of 2 (5–8 states need 3, 3–4 need 2);
- it always reduces the number of **specified rows** of the excitation and output K-maps, leaving more don't-cares, which
  usually (not always) gives simpler equations;
- it does not decide the **state assignment**; a minimal machine with a poor assignment can still need more gates than a
  non-minimal one with a clever one. Assignment is the step after this one ([Lesson 7](lesson:finite-state-machines)).

GATE asks for the number of **states**; a question about flip-flops is a separate $\lceil \log_2 k \rceil$ step.
:::

:::note{#recap-why title="Recap" depth="quick"}
Flip-flops $= \lceil \log_2 k \rceil$; a saving happens only across a power of 2. Fewer states always means fewer specified K-map
rows, but the gate count also depends on the state assignment.
:::

### Worked examples: unreachable states, flip-flops and don't-cares

::::example{#ex-u-drop level="easy" title="Drop the room with no door" depth="quick"}
A Mealy machine started in $A$: $A$: $B$/0, $C$/0; $B$: $A$/1, $C$/0; $C$: $D$/0, $D$/0; $D$: $A$/0, $B$/0; $E$: $C$/0, $D$/0. Find the
minimal machine.

:::step{why="Search from the start state first."}
From $A$: $B, C$; from $C$: $D$; from $B$ and $D$ nothing new. $E$ is never entered: drop its row.
:::

:::step{why="Refine the four reachable states."}
Rows: $A, C, D$ → 00; $B$ → 10. $P_0 = \{A, C, D\}, \{B\}$. Round 1: $A \to (B, C)$ = (B-block, big), $C \to (D, D)$ = (big, big),
$D \to (A, B)$ = (big, B-block): three different labels, so $P_1$ is all singletons.
:::

:::step{why="Compare with the mistake of refining all five states."}
With $E$ kept, $P_0 = \{A, C, D, E\}, \{B\}$, $P_1 = \{A\}, \{B\}, \{C, E\}, \{D\}$, and $P_2$ separates $C$ from $E$ ($C$ → $D$ on 0, $E$ →
$C$): 5 blocks.
:::

:::answer
**4** states, 2 flip-flops. Refining the whole table gives 5 states and 3 flip-flops: the unreachable $E$ costs a flip-flop
although it can never affect an output.
:::
::::

::::example{#ex-u-ffsave level="medium" title="When minimising saves a flip-flop" depth="standard"}
How many flip-flops do the six-state Moore machine of the medium refinement example and its minimal form need?

:::step{why="Flip-flops for k states with a binary code: the smallest m with 2^m ≥ k."}
6 states: $2^2 = 4 < 6 \le 8 = 2^3$, so 3 flip-flops.
:::

:::step{why="The minimal machine has 4 states (C, E and F merged)."}
4 states: $2^2 = 4$, so 2 flip-flops.
:::

:::step{why="Count what else shrinks."}
Each next-state K-map has $2^3 \times 2 = 16$ cells for 3 flip-flops and one input, of which $6 \times 2 = 12$ are specified; for 2
flip-flops it has 8 cells, all specified.
:::

:::answer
**3 → 2** flip-flops: the count crossed the power of 2 (from 6 to 4). Note that the minimal machine has no unused codes
at all, so its K-maps have no don't-cares; fewer flip-flops is the saving here, not more don't-cares.
:::
::::

::::example{#ex-u-nosave level="gate" title="When minimising saves no flip-flop (GATE 1996 and 2025)" depth="standard"}
Does minimisation save a flip-flop in GATE 1996 (4 → 3 states) and in GATE 2025 (8 → 5 states)?

:::step{why="Compare ceil(log2 k) before and after."}
1996: $\lceil \log_2 4 \rceil = 2$ and $\lceil \log_2 3 \rceil = 2$. 2025: $\lceil \log_2 8 \rceil = 3$ and $\lceil \log_2 5 \rceil = 3$.
:::

:::step{why="What the freed codes buy instead."}
1996: one of the four 2-bit codes is now unused, so 2 of the 8 cells of each next-state K-map (that code with $x = 0$ and $x = 1$)
become don't-cares. 2025: three of eight 3-bit codes are unused, so 6 of the 16 cells become don't-cares.
:::

:::step{why="Do not confuse the two questions."}
Both papers ask for the number of **states**: 3 and 5. A question asking for flip-flops would have the answers 2 and 3, the
same as before minimising.
:::

:::answer
**No flip-flop is saved** in either paper; minimisation still pays through the don't-cares (2 of 8 cells in 1996, 6 of 16 in
2025). The trap is to answer a "states" question with the flip-flop count, or the reverse.
:::
::::

::::example{#ex-u-edge level="gate" title="Edge case: compatible, compatible, but not compatible" depth="deep"}
An incompletely specified Mealy machine: $A$: $A$/0, $B$/0; $B$: $A$/–, $C$/0; $C$: $A$/1, $C$/0 (– = don't care). Which pairs are
compatible, and how many states does a reduced machine need?

:::step{why="Pass 0: only specified outputs can clash."}
$A$ and $C$ clash on input 0 (0 against 1): incompatible. $A$–$B$ and $B$–$C$ have no clash ($B$'s output on 0 is free).
:::

:::step{why="Implied pairs: A–B implies B–C (input 1); B–C implies nothing new."}
$B$–$C$ is never crossed, so $A$–$B$ is not crossed either. Compatible pairs: $A$–$B$ and $B$–$C$, but not $A$–$C$.
:::

:::step{why="Choose a closed cover: one class cannot hold A, B, C together."}
$\{A, B, C\}$ is not a compatibility class ($A$–$C$ clash), so one state is impossible. Two classes suffice: $\{A, B\}$ and $\{B, C\}$
(on input 1, $\{A, B\}$ goes to $\{B, C\}$ and $\{B, C\}$ to $\{C\}$; on input 0 both go to $A$), and $\{A\}, \{B, C\}$ also works.
:::

:::answer
**2** states. The wrong answer is 1, from chaining "$A$ with $B$" and "$B$ with $C$" into one class as if compatibility were
transitive. The cover $\{A, B\}, \{B, C\}$ shows the other new feature: $B$ belongs to two classes at once.
:::
::::

## Try it: minimise in the simulator

The fsm tab of the Counter & FSM Simulator holds an editable state table (Mealy or Moore, add or remove states, choose the start
state) and presets that include the **GATE 1996 table** and the **GATE 2025 table**; it can also load the detector for any pattern
as a Mealy or a Moore machine. Press **Minimise**: it lists the states unreachable from the start (and drops them), then every
partition $P_0, P_1, \dots$ with the rule that produced it, the final number of states and the merged table, which **Use the merged
table** loads back so you can run both machines on the same input string. Try the 2025 preset (one splitting round), a Moore
detector for 1011 (three rounds, nothing merges), and an edited 1996 table in which $D$'s output on 0 is changed to 0: every
output row is then 01, $P_0$ is a single block, and the whole machine collapses to one state.

:::lab{#lab-minimise lab="counter-fsm" tab="fsm" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1996-a-48" tests="partition-refinement,equivalent-states,trap-same-next" depth="standard"}
:::

:::pyq{id="cse-2003-cs-44" tests="min-states-from-words,distinguishing-strings" depth="standard"}
:::

:::pyq{id="cse-2025-1-cs-49" tests="partition-refinement,implication-table,refinement-correct" depth="standard"}
:::

## Practice

Our own questions in GATE formats: counting states of tables first, then the procedures themselves, then the definitions and
the traps.

:::practice{id="nx-dl-06-08-q01" depth="standard"}
:::

:::practice{id="nx-dl-06-08-q02" depth="standard"}
:::

:::practice{id="nx-dl-06-08-q03" depth="standard"}
:::

:::practice{id="nx-dl-06-08-q04" depth="standard"}
:::

:::practice{id="nx-dl-06-08-q05" depth="standard"}
:::

:::practice{id="nx-dl-06-08-q06" depth="standard"}
:::

:::practice{id="nx-dl-06-08-q07" depth="standard"}
:::

:::practice{id="nx-dl-06-08-q08" depth="standard"}
:::

:::practice{id="nx-dl-06-08-q09" depth="standard"}
:::

:::practice{id="nx-dl-06-08-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="State minimisation on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Equivalent states | same output sequence for **every** input string; an equivalence relation; merge each class |
| k-equivalence | same outputs for experiments of at most $k$ transitions; $p \equiv_{k+1} q$ iff same outputs now and $k$-equivalent next states |
| $P_0$ | Mealy: by the whole output row; Moore: by the state output |
| Refinement | split each block by the blocks of the next states; stop when nothing splits; at most $n - b$ splitting rounds |
| Not required | equal next states (1996: $B \equiv C$ with different rows; 3 states, not 4) |
| Implication table | cross output mismatches, then pairs implying crossed pairs; survivors = equivalent pairs = refinement's blocks |
| Self or circular implication | never crossed by itself: equivalent (1996 $B$–$C$; $A$–$B$ ⇄ $C$–$D$) |
| GATE 2025 | $P_0$ 4 blocks, $P_1 = \{A, C\}\{B, E\}\{D, H\}\{F\}\{G\}$: **5** |
| Unreachable states | drop them first; left in they can add blocks and flip-flops |
| From words | remember only what changes a future output; $m$ pairwise distinguishable histories ⇒ at least $m$ states (2003: **5**) |
| Incompletely specified | compatibility is not transitive; closed cover, classes may overlap |
| Hardware | flip-flops $\lceil \log_2 k \rceil$: 1996 and 2025 save none, 6 → 4 saves one |
:::
