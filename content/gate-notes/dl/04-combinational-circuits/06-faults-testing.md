---
id: faults-testing
subject: dl
chapter: combinational-circuits
title: "Stuck-at faults and test inputs"
order: 6
prerequisites: [gate-circuit-analysis]
pyq_topics: [dl/combinational, dl/gates]
est_minutes: 30
difficulty: core
status: draft
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every test, fault count, Boolean difference, test set and practice answer is recomputed by fault simulation over every input row in content/gate-notes/_checks/dl/l4_06_faults.py (comblib, plus an exhaustive minimum test-set search)."
  - "Coverage checklist only (internal digests, never copied): set B p. 129 (brief). The sets cover this topic only in passing, so the lesson is written from first principles."
  - "Facts checked against: M. Abramovici, M. A. Breuer and A. D. Friedman, Digital Systems Testing and Testable Design (stuck-at model, fault equivalence, test generation, Boolean difference, redundancy); M. Morris Mano, Digital Design."
  - "PYQs: src/gate/questions.json (cse-1994-b-35-b, it-2005-cs-46, it-2007-cs-45); each circuit is modelled as a comblib netlist from the figure description and every key is re-derived by fault simulation in l4_06_faults.py."
updated: "2026-10-18"
---

A circuit that has been designed correctly can still be built wrongly. A wire can be broken, a
transistor can be shorted, a gate output can be welded to the supply rail. When a chip comes off the
production line, nobody can open it and look; all a tester can do is apply input patterns and watch the
outputs. This lesson asks the testing questions GATE asks: what does a broken wire do to the logic,
how many different breakages are possible, which input pattern exposes a given breakage, and why some
breakages can never be seen at all. The answers rest on one simple model, the **stuck-at fault**, and
one simple idea: a fault is visible only if an input **excites** it and the circuit **carries** the
damage to the output.

## Where this fits

[Chapter 2, Lesson 6](lesson:gate-circuit-analysis) taught you to evaluate a circuit line by line for a
given input. Testing is the same evaluation done twice, once for the good circuit and once for a
broken copy, and compared. The rules for getting a signal through a gate use the **controlling values**
of [Chapter 2, Lesson 1](lesson:logic-gates). You have already met a stuck output once: in
[Chapter 3, Lesson 1](lesson:kmaps), GATE 1997 asked on how many rows an output stuck at 0 is wrong. And
the redundant consensus term that [Chapter 3, Lesson 4](lesson:two-level-implementation) added to cure a
hazard comes back here as the classic line whose fault no test can find.

:::table{#radar title="GATE radar: stuck-at faults and test inputs" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 3 (1994, IT 2005, IT 2007) |
| Marks | one descriptive part, 2 two-mark MCQs |
| Pattern 1 | Find an input that detects a given stuck line: 1994 (NAND chain) |
| Pattern 2 | Count single or multiple stuck-at faults on $N$ lines: IT 2005 ($3^N - 1$) |
| Pattern 3 | Is a given fault detectable at all? IT 2007 (no: "none of the above") |
| What examiners test | That a test must both activate the fault and propagate it, that side inputs must sit at non-controlling values, that "fault-free" is a third state of a line, and that an option which activates the fault can still fail to show it |
:::

## The stuck-at fault model

:::intuition{#fault-intuition title="A stuck switch" depth="standard"}
Imagine a light switch on the wall that is jammed in the ON position. You walk past it every day with
the lamp on and notice nothing, because the lamp is on exactly when you want it on. You discover the
fault only on the evening you try to switch the lamp **off** and it refuses. Two things had to happen:
you had to try to set the switch to the value it is stuck away from, and you had to be looking at a lamp
that actually depends on that switch. If the lamp were also wired through a second switch that happened
to be open, you would see darkness either way and learn nothing.

That is the whole of testing in one picture. A stuck line shows itself only when the input tries to
drive it to the other value (we call this **activation**), and only if the rest of the circuit lets that
line decide the output (we call this **propagation**). Everything in this lesson is a careful version of
those two sentences.
:::

:::definition{#stuck-at-model term="Stuck-at faults" depth="standard"}
A **line** is any wire of the circuit that can carry its own value: a primary input, a gate output, and
each **branch** of a wire that fans out to several gates (the wire before the split is the **stem**).

- A line has a **stuck-at-0 fault** (s-a-0) if it is permanently 0, whatever drives it; it has a
  **stuck-at-1 fault** (s-a-1) if it is permanently 1. Everything downstream reads the stuck value; the
  gates themselves still work.
- A **single stuck-at fault** is one line stuck at one value, all other lines healthy. This is the model
  used to generate tests in practice, because it is simple and because tests for single faults catch most
  real defects.
- A **multiple stuck-at fault** is any non-empty set of lines, each stuck at a value of its own, all other
  lines healthy.

The model is logical, not physical. A broken wire, a short to ground or a short to the supply each
behave, at the level of 0s and 1s, like some line stuck at a constant, so one model covers many physical
defects. (Which value a given short or open produces depends on the technology; the model does not care.)
:::

Two remarks before we count. First, a fan-out stem and its branches are **different lines**: if input $A$
feeds two gates, a break in the branch to the first gate leaves the second gate reading the true $A$,
which is a different fault from a break before the split. Second, the faulty circuit is still a
combinational circuit; it simply computes a different function, and testing is about finding an input on
which the two functions differ.

:::definition{#fault-count term="Counting faults" depth="standard"}
For a circuit with $N$ lines:

- **single** stuck-at faults: each line can be s-a-0 or s-a-1, so there are $2N$;
- **multiple** stuck-at faults: each line is in one of **three** states (fault-free, s-a-0, s-a-1), and at
  least one line must be faulty, so there are $3^N - 1$;
- multiple faults with **exactly $k$ faulty lines**: choose the $k$ lines, then a stuck value for each:
  $\binom{N}{k} 2^k$.
:::

:::theorem{#fault-count-theorem name="Number of stuck-at faults" depth="standard"}
A circuit with $N$ lines has exactly $2N$ single stuck-at faults and exactly $3^N - 1$ multiple
stuck-at faults (a single fault counts as a multiple fault with one faulty line). Moreover
$\sum_{k=1}^{N} \binom{N}{k} 2^k = 3^N - 1$.
:::

:::proof{#proof-fault-count of="the fault-count theorem" depth="standard"}
**Idea first:** a multiple fault is a choice of state for every line, and each line has three states, not
two.

A fault (single or multiple) is completely described by saying, for every line, whether it is healthy, stuck
at 0 or stuck at 1. Different descriptions give different faults, and every description in which at least
one line is faulty is a fault. The number of descriptions is $3 \times 3 \times \dots \times 3 = 3^N$ (the
product rule, one factor per line). Exactly one of them, "every line healthy", is the good circuit and not a
fault. So there are $3^N - 1$ multiple faults.

Single faults are the descriptions with exactly one faulty line: $N$ choices of the line times 2 stuck
values, $2N$.

Grouping the $3^N - 1$ descriptions by the number $k$ of faulty lines: choose those lines in
$\binom{N}{k}$ ways and give each a stuck value in $2^k$ ways. Summing over $k = 1, \dots, N$ counts every
fault once, so $\sum_{k \ge 1} \binom{N}{k} 2^k = 3^N - 1$. This is also the binomial theorem:
$(1 + 2)^N = \sum_{k \ge 0} \binom{N}{k} 2^k$, minus the $k = 0$ term.

**Sanity check.** $N = 1$: a single line has two faults, and $3^1 - 1 = 2$. $N = 2$: by listing, (0, –),
(1, –), (–, 0), (–, 1), (0, 0), (0, 1), (1, 0), (1, 1) is 8, and $3^2 - 1 = 8$.
:::

:::trap{#trap-multiple-count title="2^N, 3^N or 2N?" depth="standard"}
Three wrong answers are waiting in every fault-counting question.

- $2^N$ (or $2^N - 1$): you gave each line only the two values 0 and 1 and forgot that a line in a
  multiple fault may also be **healthy**. That counts the ways to stick *every* line, which are only the
  faults with $k = N$.
- $3^N$: you remembered the third state but forgot to remove the one assignment in which every line is
  healthy; that is the good circuit, not a fault.
- $2N$: that is the count of **single** faults. If the question says "multiple stuck-at faults" (one
  or more lines faulty), the answer is $3^N - 1$.

IT 2005 offered $3^N$, $3^N - 1$, $2^N - 1$ and $2^N$: three of the four options are these slips.
:::

### Worked examples: counting faults

::::example{#ex-count-easy level="easy" title="Single faults of a two-gate circuit" depth="quick"}
A circuit has inputs $A$, $B$, $C$; $p = \text{NAND}(A, B)$ and the output is $f = \text{NAND}(p, C)$.
No wire fans out. How many single stuck-at faults does it have?

:::step{why="Lines are inputs, gate outputs and fan-out branches; there are no branches here."}
The lines are $A$, $B$, $C$, $p$ and $f$: $N = 5$.
:::

:::step{why="Each line can be stuck at either value, one line at a time."}
Single faults: $2N = 10$.
:::

:::answer
10 single stuck-at faults: $A$, $B$, $C$, $p$, $f$, each s-a-0 or s-a-1.
:::
::::

::::example{#ex-count-medium level="medium" title="All multiple faults on three lines, by enumeration" depth="standard"}
List and count the multiple stuck-at faults on a circuit with three lines $x$, $y$, $z$.

:::step{why="Group by how many lines are faulty, so nothing is counted twice."}
Exactly one faulty line: choose it (3 ways) and its value (2 ways): $3 \cdot 2 = 6$, for example ($x$ s-a-0).
:::

:::step{why="Two faulty lines: choose the pair, then a value for each of the two."}
$\binom{3}{2} \cdot 2^2 = 3 \cdot 4 = 12$, for example ($x$ s-a-1, $z$ s-a-0).
:::

:::step{why="All three faulty: every line gets a value."}
$2^3 = 8$.
:::

:::step{why="The total must agree with the three-states-per-line count."}
$6 + 12 + 8 = 26 = 3^3 - 1$.
:::

:::answer
26 multiple faults (6 with one faulty line, 12 with two, 8 with three).
:::
::::

::::example{#ex-count-gate level="gate" title="Counting the lines of a circuit with fan-out" depth="standard"}
Inputs $a$, $b$, $c$. Input $a$ fans out to two gates: $g_1 = \text{AND}(a, b)$ and $g_2 = \text{OR}(a, c)$; the
output is $f = \text{XOR}(g_1, g_2)$. How many single and how many multiple stuck-at faults are there?

:::step{why="A fan-out creates a stem and one branch per destination, and each can break separately."}
Lines: $a$ (stem), the branch of $a$ into $g_1$, the branch of $a$ into $g_2$, $b$, $c$, $g_1$, $g_2$, $f$: $N = 8$.
:::

:::step{why="Single faults: two per line."}
$2N = 16$.
:::

:::step{why="Multiple faults: three states per line, minus the all-healthy circuit."}
$3^8 - 1 = 6561 - 1 = 6560$.
:::

:::answer
16 single and 6560 multiple stuck-at faults. Missing the two branches gives $N = 6$, 12 and 728, a
classic slip. IT 2005 asks the general version: $3^N - 1$.
:::
::::

::::example{#ex-count-edge level="gate" title="Edge case: counting only the faults that change the function" depth="standard"}
$f = \text{AND}(A, g)$ with $g = \text{OR}(A, B)$, where $A$ fans out to both gates (call the branches $A_1$
into the AND and $A_2$ into the OR). How many of the single faults actually change the function?

:::step{why="Count lines first: stem A, branches A1 and A2, B, g, f."}
$N = 6$, so 12 single faults.
:::

:::step{why="By absorption, A(A + B) = A: the circuit computes just A, and B does not matter."}
The good function is $f = A$.
:::

:::step{why="Work out each faulty function. Faults that leave f = A are invisible."}
$B$ s-a-0 gives $f = A \cdot A = A$; $B$ s-a-1 gives $f = A \cdot 1 = A$; $A_2$ s-a-1 makes $g = 1$, so
$f = A$; $g$ s-a-1 also gives $f = A$. These four change nothing.
:::

:::step{why="The other eight do change f."}
$A$ s-a-0, $A_1$ s-a-0, $g$ s-a-0, $f$ s-a-0 give $f = 0$; $A$ s-a-1, $f$ s-a-1 give $f = 1$;
$A_1$ s-a-1 gives $f = A + B$; $A_2$ s-a-0 gives $f = AB$.
:::

:::answer
12 single faults, of which only 8 change the function. The other 4 can never be detected, because the
circuit contains a redundant part ($B$ and the OR gate). The section on undetectable faults explains why
these always go together.
:::
::::

:::note{#recap-count title="Recap" depth="quick"}
Count lines carefully (stems and branches separately). Single faults: $2N$. Multiple faults: three states
per line, minus the good circuit: $3^N - 1$; exactly $k$ faulty lines: $\binom{N}{k} 2^k$.
:::

## Detecting a fault: activation and propagation

:::intuition{#detect-intuition title="Two runs side by side" depth="standard"}
Put the good circuit and the faulty circuit next to each other and feed both the same input. If their
outputs agree, that input tells you nothing about the fault. If they disagree, the tester sees a wrong
output and the chip is rejected. So "finding a test" means finding an input on which the two circuits
disagree. Thinking about it line by line, two things must happen. The stuck line must be asked to carry
the value it cannot carry, otherwise both circuits have the same value there and stay identical. And the
difference created on that line must travel to the output without being swallowed by a gate whose other
input already decides the answer.
:::

:::definition{#test-vector term="Test vector" depth="standard"}
An input vector $t$ **detects** (is a **test** for) a fault $\alpha$ if the good circuit and the circuit with
$\alpha$ give different outputs on $t$: $f(t) \ne f_\alpha(t)$. A fault is **detectable** if some input
detects it, and **undetectable** otherwise. A **test set** for a list of faults is a set of inputs that
contains a test for every detectable fault in the list.
:::

:::definition{#activation term="Activation (exciting the fault)" depth="standard"}
To activate line $p$ s-a-$v$, choose inputs that make $p$ equal to $\overline{v}$ in the good circuit:
drive the line to the **opposite** of its stuck value. Then the good circuit has $\overline{v}$ on $p$ and
the faulty circuit has $v$: a difference exists, written $D$ (good 1, faulty 0) or $\overline{D}$ (good 0,
faulty 1). If $p = v$ in the good circuit, the fault is not activated, both circuits are identical on every
line, and the input cannot be a test.

For a primary input, activation is direct: to test input $A$ s-a-0, set $A = 1$. For a gate output, work
backwards: $p = \text{NAND}(A, B)$ is 0 only for $A = B = 1$, so activating $p$ s-a-1 forces $A = B = 1$.
:::

:::definition{#propagation term="Propagation (sensitising a path)" depth="standard"}
To carry the difference to the output, choose a path of gates from $p$ to the output and set every
**side input** (every input of a path gate that is not on the path) to that gate's **non-controlling
value**:

| Gate on the path | Side inputs | The gate then passes the difference |
|:--|:--|:--|
| AND, NAND | 1 | unchanged (AND) or inverted (NAND) |
| OR, NOR | 0 | unchanged (OR) or inverted (NOR) |
| XOR, XNOR | anything | unchanged or inverted (no controlling value) |

A gate with a side input at its **controlling value** (0 into an AND or NAND, 1 into an OR or NOR) fixes its
output by itself, so the difference dies there: the path is **blocked**.
:::

Why non-controlling values? With every side input at 1, an AND gate computes exactly its path input, and a
NAND computes its complement; with every side input at 0, an OR computes its path input and a NOR its
complement. In each case the gate's output is a one-to-one function of the path input, so a difference
going in is a difference coming out. Inverting gates turn $D$ into $\overline{D}$, which is still a
difference: the tester sees a wrong output either way.

:::definition{#boolean-difference term="The Boolean difference" depth="standard"}
Cut line $p$ and let $f_p(x, u)$ be the circuit output for input $x$ when $p$ is forced to the value $u$
(if $p$ is a stem, all its branches see $u$). The **Boolean difference** of $f$ with respect to $p$ is

$$\frac{\partial f}{\partial p}(x) = f_p(x, 0) \oplus f_p(x, 1).$$

It is 1 exactly on the inputs where the value of line $p$ decides the output, that is, where $p$ is
**observable**. For a primary input $x_i$ it is $f|_{x_i = 0} \oplus f|_{x_i = 1}$, the two cofactors of
Shannon's expansion compared by XOR.
:::

:::derivation{#derive-bd-1994 of="the Boolean difference of the 1994 NAND chain" depth="standard"}
In the circuit $p = \text{NAND}(A, B)$, $f = \text{NAND}(p, C)$, force $p$:

- $p = 0$: $f = \overline{0 \cdot C} = 1$;
- $p = 1$: $f = \overline{1 \cdot C} = \overline{C}$.

So $\dfrac{\partial f}{\partial p} = 1 \oplus \overline{C} = C$: line $p$ is observable exactly when $C = 1$,
which is the propagation rule (the side input of the NAND at its non-controlling value 1).

**Sanity check.** Simulating all eight rows with $p$ forced to 0 and then to 1, the outputs differ on rows
1, 3, 5, 7, the rows with $C = 1$, and nowhere else.
:::

:::theorem{#test-condition name="When an input detects a stuck line" depth="standard"}
An input $t$ detects line $p$ stuck-at-$v$ **if and only if**

1. $p(t) = \overline{v}$ in the good circuit (the fault is activated), and
2. $\dfrac{\partial f}{\partial p}(t) = 1$ (the line is observable at $t$).

So the set of all tests for $p$ s-a-$v$ is $\{\, t : (p(t) \oplus v) \cdot \tfrac{\partial f}{\partial p}(t) = 1 \,\}$.
:::

:::proof{#proof-test-condition of="the test condition" depth="standard"}
**Idea first:** the faulty circuit is the good circuit with line $p$ forced to $v$, and the good circuit is
the same circuit with $p$ forced to the value it has anyway.

Fix an input $t$. Forcing a line to the value it already carries changes nothing, so the good output is
$f(t) = f_p(t, p(t))$. The faulty circuit is, by definition, the circuit with $p$ forced to $v$, so its
output is $f_\alpha(t) = f_p(t, v)$.

If $p(t) = v$, the two expressions are the same, so the outputs agree and $t$ is not a test: condition 1 is
necessary. If $p(t) = \overline{v}$, the two outputs are $f_p(t, \overline{v})$ and $f_p(t, v)$, which are
$f_p(t, 0)$ and $f_p(t, 1)$ in some order; they differ exactly when
$f_p(t, 0) \oplus f_p(t, 1) = \tfrac{\partial f}{\partial p}(t) = 1$. So, given condition 1, condition 2 is
necessary and sufficient. Together: $t$ is a test iff both hold.

Note that nothing in the argument assumes a single path from $p$ to the output: the Boolean difference
accounts for every path at once, including paths that split and meet again.
:::

:::viz{#fault-viz spec="fault-injection" mode="animate" depth="standard"}
:::

:::trick{#trick-activate-propagate title="Activate, then propagate, then justify" depth="standard"}
To find a test by hand: (1) write the value the faulty line must have in the good circuit (the opposite of
the stuck value); (2) walk from the line to the output and write the non-controlling value on every side
input; (3) go back to the primary inputs and find values that produce all those requirements at once.

**Why it works:** step 1 is condition 1 of the theorem, and in a circuit where the line reaches the output by
only one path, step 2 makes every gate on that path a one-to-one function of its path input, so the
Boolean difference is 1 (condition 2).

**When it fails:** (a) the requirements of steps 1 and 3 contradict each other (then try another path, or
the fault may be undetectable, as in IT 2007); (b) the line reaches the output by **two** paths that meet
again (reconvergent fan-out): sensitising one path is not enough, because the other path may carry a
difference too and cancel it. Then compute $\partial f / \partial p$ directly (edge case below).
:::

:::trick{#trick-noncontrolling title="Side inputs: 1 for AND/NAND, 0 for OR/NOR" depth="quick"}
Remember the side-input values by the identities: $x \cdot 1 = x$ and $x + 0 = x$. A side input that
leaves the gate behaving like a wire (or an inverter, for NAND and NOR) lets the difference through.

**Why it works:** the non-controlling value is the identity element of the gate's operation.
**When it fails:** when the side input is not free, because the same primary input that activates the
fault also drives that side input to its controlling value (IT 2007), or because the side input itself
depends on the faulty line.
:::

:::trap{#trap-mask title="A test for one fault can be masked by another" depth="standard"}
A vector found for a single fault is a test for that fault **alone**. In the 1994 circuit,
$ABC = 111$ detects $p$ s-a-1 (good 1, faulty 0). If $C$ is also stuck at 0, the second NAND sees a 0 and
outputs 1 in both runs: the same vector now shows nothing. One fault has **masked** the other. That is why
test sets are generated for single faults and multiple faults are only "usually" caught: there is no
general guarantee that a complete single-fault test set detects every multiple fault. The examiner's wrong
answer is "this vector tests $p$ s-a-1, so it detects every fault involving $p$ s-a-1".
:::

### Worked examples: finding a test

::::example{#ex-test-easy level="easy" title="An AND gate input stuck at 0" depth="quick"}
Find every test for input $A$ s-a-0 of a 2-input AND gate $f = AB$.

:::step{why="Activation: drive A to the opposite of its stuck value."}
$A = 1$.
:::

:::step{why="Propagation: the side input of an AND must be at its non-controlling value 1, or the output is 0 in both runs."}
$B = 1$.
:::

:::step{why="Check by simulating both circuits."}
Good: $1 \cdot 1 = 1$. Faulty: $0 \cdot 1 = 0$. They differ. With $B = 0$ both outputs are 0.
:::

:::answer
$AB = 11$ is the only test for $A$ s-a-0. (It is also the only test for $B$ s-a-0 and for the output
s-a-0: all three faults make $f \equiv 0$.)
:::
::::

::::example{#ex-test-medium level="medium" title="The NAND chain of GATE 1994" depth="standard"}
$p = \text{NAND}(A, B)$ feeds $f = \text{NAND}(p, C)$. Line $p$ is stuck at 1. Find a test.

:::step{why="Activation: p must be 0 in the good circuit, and a NAND outputs 0 only when all its inputs are 1."}
$A = B = 1$, so good $p = 0$ while the faulty $p = 1$.
:::

:::step{why="Propagation: the side input C of the output NAND must be at the non-controlling value 1."}
$C = 1$. (This is $\partial f / \partial p = C$ from the derivation above.)
:::

:::step{why="Simulate both circuits on 111 to confirm."}
Good: $p = 0$, $f = \overline{0 \cdot 1} = 1$. Faulty: $p = 1$, $f = \overline{1 \cdot 1} = 0$. Different.
:::

:::step{why="Uniqueness: activation allows only AB = 11 and propagation only C = 1."}
No other row works; fault simulation over all eight rows finds only row 7.
:::

:::answer
$A = B = C = 1$ is the (only) test for $p$ s-a-1.
:::
::::

::::example{#ex-test-gate level="gate" title="A fault behind an OR gate" depth="standard"}
$p = \text{AND}(A, B)$, $q = \text{OR}(p, C)$, $f = \text{AND}(q, D)$. Find every test for $p$ s-a-0, and every
test for $p$ s-a-1.

:::step{why="Activation of p s-a-0 needs p = 1 in the good circuit."}
$A = B = 1$.
:::

:::step{why="The path is p → OR → AND. The OR's side input C must be 0, the AND's side input D must be 1."}
$C = 0$, $D = 1$.
:::

:::step{why="All four inputs are now fixed."}
$ABCD = 1101$: good $f = (1 + 0) \cdot 1 = 1$, faulty $f = (0 + 0) \cdot 1 = 0$. It is the only test.
:::

:::step{why="For p s-a-1 the path conditions are the same, but activation now needs p = 0, which three AB pairs give."}
$AB \in \{00, 01, 10\}$, $C = 0$, $D = 1$: the tests are $0001$, $0101$, $1001$ (rows 1, 5, 9).
:::

:::answer
$p$ s-a-0: only $1101$. $p$ s-a-1: $0001$, $0101$, $1001$. A stuck-at-0 line behind an AND has few
tests because activating it needs every AND input at 1.
:::
::::

::::example{#ex-test-edge level="gate" title="Edge case: a fan-out stem that reaches the output by two paths" depth="standard"}
$f = AB + \overline{A}C$, built as $g_1 = \text{AND}(A, B)$, $g_2 = \text{AND}(\overline{A}, C)$, $f = \text{OR}(g_1, g_2)$:
the stem $A$ feeds $g_1$ directly and $g_2$ through an inverter. Find every test for the **stem** $A$ s-a-0.

:::step{why="The obvious attempt: activate (A = 1) and sensitise the path through g1 (B = 1, and g2 = 0 at the OR)."}
Try $ABC = 111$. But forcing $A$ also changes the second path: in the faulty circuit $\overline{A} = 1$, so
$g_2 = C = 1$.
:::

:::step{why="Simulate 111 in both circuits."}
Good: $g_1 = 1$, $g_2 = 0$, $f = 1$. Faulty ($A = 0$): $g_1 = 0$, $g_2 = 1$, $f = 1$. Same output: the two
paths cancel.
:::

:::step{why="Use the Boolean difference, which counts every path at once."}
$f|_{A=0} = C$ and $f|_{A=1} = B$, so $\partial f / \partial A = B \oplus C$. Tests: $A = 1$ and $B \ne C$.
:::

:::step{why="Compare with the branch fault, which has only one path."}
The branch of $A$ into $g_1$ s-a-0 changes only $g_1$; its tests are $A = B = 1$ with $g_2 = 0$, which holds
automatically: $110$ and $111$.
:::

:::answer
The stem $A$ s-a-0 is detected only by $101$ and $110$; the "obvious" $111$ fails because the difference
reaches the OR along both paths and cancels. The branch fault is a different fault with different tests
($110$, $111$).
:::
::::

:::note{#recap-detect title="Recap" depth="quick"}
A test makes the good and faulty outputs differ. It must set the line to the opposite of its stuck value
and make the line observable: side inputs at non-controlling values (1 for AND/NAND, 0 for OR/NOR). The
exact condition is $p(t) = \overline{v}$ and $\partial f / \partial p(t) = 1$, which also handles reconvergent
fan-out.
:::

## Undetectable faults and redundancy

:::intuition{#undetectable-intuition title="When the lamp never depends on the switch" depth="standard"}
Back to the jammed switch. Suppose that every time you flip it off, some other switch in the same circuit
happens to be off too, so the lamp is dark whether your switch works or not. Then you can never find out
that it is jammed. But look at it from the other side: if the lamp is dark in every situation in which your
switch would matter, the switch is not doing anything useful. You could replace it by a piece of wire
fixed in the ON position and nobody would notice. A fault you can never see lives on a line you never
needed.
:::

:::definition{#undetectable term="Undetectable faults" depth="standard"}
A fault is **undetectable** if no input vector detects it: the faulty circuit gives the same output as the
good circuit on every row. By the test condition, $p$ s-a-$v$ is undetectable exactly when no input has both
$p = \overline{v}$ and $\partial f / \partial p = 1$. The typical reason is a **conflict**: the inputs needed to
activate the fault force some side input on every path to its controlling value, so the difference is
blocked wherever it goes.
:::

:::theorem{#redundant-undetectable name="Undetectable means redundant" depth="standard"}
Line $p$ s-a-$v$ is undetectable **if and only if** the circuit with $p$ permanently tied to the constant
$v$ computes the same function as the original circuit. In that case $p$ is **redundant**: it can be
replaced by the constant $v$, the gates it feeds can be simplified, and the logic that drove it (if it
drives nothing else) can be removed.
:::

:::proof{#proof-redundant-undetectable of="undetectable means redundant" depth="standard"}
**Idea first:** "no input tells the two circuits apart" and "the two circuits compute the same function"
are the same sentence.

The circuit with $p$ tied to $v$ **is** the faulty circuit $f_\alpha$ for $\alpha = p$ s-a-$v$. The fault is
undetectable iff $f(t) = f_\alpha(t)$ for every input $t$, which is exactly the statement that the functions
$f$ and $f_\alpha$ are equal. So tying $p$ to $v$ changes nothing, and the line is redundant.

Conversely, if tying $p$ to $v$ leaves the function unchanged, then $f_\alpha = f$ on every row and no input
can detect the fault. Hence an irredundant circuit (one in which no line can be tied to a constant without
changing $f$) has every single stuck-at fault detectable.
:::

Two consequences matter in practice. First, undetectable faults are a sign of wasted logic: removing them
makes the circuit smaller **and** fully testable. Second, they are not harmless. A redundant line is
sometimes added on purpose, for example the consensus term that removes a static hazard, and an
undetectable fault on it can sit there unnoticed and later mask another fault, or bring the hazard back.

:::trap{#trap-none-of-above title="An option that activates the fault is not yet a test" depth="standard"}
When a question asks "which input detects the fault?" and lists vectors plus "none of the above",
examiners expect you to pick the vector that **activates** the fault, because that is the half of the work
students remember. In IT 2007, $X_1X_2X_3X_4 = 1111$ does set $T = 1$ against its stuck value 0, so it
looks right. But the same $X_4 = 1$ forces the OR gate to 1, and a 1 is the controlling value of the
NOR that $T$ feeds: the NOR outputs 0 in both runs. Check propagation for every option, and if activation
and propagation demand opposite values of one input, the answer really is "none of the above".
:::

### Worked examples: undetectable faults

::::example{#ex-und-easy level="easy" title="Which of four vectors detect a fault?" depth="quick"}
$p = \text{AND}(A, B)$ and $f = \text{NOR}(p, C)$. Line $p$ is stuck at 1. Which of $000$, $011$, $100$, $110$
(as $ABC$) detect it?

:::step{why="Activation needs p = 0, i.e. A and B not both 1."}
$110$ fails: there $p = 1$ already, so the fault is not activated.
:::

:::step{why="Propagation through the NOR needs its side input C at the non-controlling value 0."}
$011$ fails: $C = 1$ forces the NOR to 0 in both runs.
:::

:::step{why="The remaining two satisfy both conditions; simulate to confirm."}
$000$: good $p = 0$, $f = \overline{0 + 0} = 1$; faulty $f = \overline{1 + 0} = 0$. $100$: the same.
:::

:::answer
$000$ and $100$ detect it (as does $010$, which was not offered); $011$ is blocked and $110$ does not
activate the fault.
:::
::::

::::example{#ex-und-medium level="medium" title="A gate whose output is absorbed" depth="standard"}
$g_1 = \text{AND}(A, B)$, $g_2 = \text{AND}(A, B, C)$, $f = \text{OR}(g_1, g_2)$. Is $g_2$ s-a-0 detectable?

:::step{why="Activation needs g2 = 1, and a 3-input AND is 1 only when every input is 1."}
$A = B = C = 1$.
:::

:::step{why="Propagation through the OR needs its side input g1 = 0, i.e. A and B not both 1."}
This contradicts $A = B = 1$. No input both activates and propagates the fault.
:::

:::step{why="Confirm with the redundancy theorem: tie g2 to 0 and compare functions."}
$f$ becomes $AB$, and the original is $AB + ABC = AB$ (absorption). The function is unchanged.
:::

:::answer
Undetectable. The gate $g_2$ is redundant; the circuit can be built as a single AND gate, and then every
single fault is detectable.
:::
::::

::::example{#ex-und-gate level="gate" title="The IT 2007 circuit" depth="standard"}
$n = \text{NAND}(X_1, X_2, X_3)$, $o = \text{OR}(n, X_4)$, $T = \text{AND}(X_3, X_4)$, $f = \text{NOR}(o, T)$. Line
$T$ is connected to ground ($T$ s-a-0). Which input detects it?

:::step{why="Activation: T must be 1 in the good circuit."}
$X_3 = X_4 = 1$.
:::

:::step{why="Propagation: the NOR's side input o must be 0. But X4 = 1 is the controlling value of the OR gate."}
With $X_4 = 1$, $o = 1$, and a NOR with an input 1 outputs 0. Activation and propagation contradict.
:::

:::step{why="Check with the Boolean difference: f with T forced to 0 is o′, with T forced to 1 it is 0."}
$\partial f / \partial T = \overline{o} = X_1X_2X_3\overline{X_4}$, which needs $X_4 = 0$, while activation needs
$X_4 = 1$. The test set is empty.
:::

:::step{why="Check the options anyway: 0000 and 0111 do not activate (T = 0); 1111 activates but o = 1 blocks."}
On $1111$: good $f = \overline{1 + 1} = 0$, faulty $f = \overline{1 + 0} = 0$. Same.
:::

:::answer
No input detects $T$ s-a-0: "none of the above". By the redundancy theorem, $T$ can be tied to 0:
$f = \overline{o} = X_1X_2X_3\overline{X_4}$ either way, and the AND gate is redundant.
:::
::::

::::example{#ex-und-edge level="gate" title="Edge case: the consensus term added for a hazard" depth="standard"}
$f = AB + \overline{A}C + BC$ is built as three AND gates into one OR gate (the term $BC$ was added to remove a
static-1 hazard). Can the output of the $BC$ gate stuck at 0 be detected? And stuck at 1?

:::step{why="Activation of BC s-a-0 needs B = C = 1."}
Then $f$ has either $AB = 1$ (if $A = 1$) or $\overline{A}C = 1$ (if $A = 0$).
:::

:::step{why="Propagation through the OR needs both other terms at 0, which is impossible when B = C = 1."}
The difference is always blocked. The fault is undetectable.
:::

:::step{why="The redundancy theorem predicts this: tying BC to 0 leaves AB + A′C, which is the same function by the consensus theorem."}
$AB + \overline{A}C + BC = AB + \overline{A}C$.
:::

:::step{why="Stuck-at-1 is a different story: the faulty output is the constant 1."}
$BC$ s-a-1 is detected by every row where $f = 0$: $ABC = 000, 010, 100, 101$.
:::

:::answer
$BC$ s-a-0 is undetectable (the term is logically redundant), while $BC$ s-a-1 is detectable. So "if s-a-0
is undetectable then s-a-1 is too" is false. The branches of $B$ and $C$ into that gate stuck at 0 are
undetectable for the same reason.
:::
::::

:::note{#recap-undetectable title="Recap" depth="quick"}
A fault is undetectable when activation and propagation cannot both hold. Then the faulty circuit computes
the same function, so the line is redundant and can be tied to its stuck value. Irredundant circuits have
no undetectable single faults.
:::

## Test sets and equivalent faults

:::intuition{#test-set-intuition title="One test, many faults" depth="standard"}
A tester does not apply one vector per fault: a chip has thousands of lines, and every vector costs time.
Luckily one vector usually detects several faults at once. In the 1994 circuit the single vector $111$
detects $A$ s-a-0, $B$ s-a-0 and $p$ s-a-1 together, and these three faults are in fact indistinguishable,
because each one makes $p = 1$ for good. The aim is a small set of vectors that between them catch every
detectable fault, and the first step is to notice which faults are really the same fault.
:::

:::definition{#test-sets term="Complete and minimum test sets" depth="standard"}
A test set is **complete** for single stuck-at faults if it contains at least one test for every
detectable single fault. A **minimum** test set is a complete one with the fewest vectors. Finding one is a
covering problem, exactly like choosing prime implicants: list the tests of every fault, then pick the fewest
vectors that hit every list. Faults with a **single** test force that vector into the set, just as an
essential prime implicant is forced into the cover.
:::

:::definition{#fault-equivalence term="Equivalent faults" depth="standard"}
Two faults are **equivalent** if they produce the same faulty function: then every test for one is a test
for the other, and no test can tell them apart. Equivalence lets you keep one fault per class
(**fault collapsing**).

| Gate | Equivalent faults |
|:--|:--|
| AND | every input s-a-0 ≡ output s-a-0 |
| NAND | every input s-a-0 ≡ output s-a-1 |
| OR | every input s-a-1 ≡ output s-a-1 |
| NOR | every input s-a-1 ≡ output s-a-0 |

**Why:** a controlling value on any input forces the output, so an input stuck at the controlling value
makes the output stuck at the value it forces. For an AND, a 0 on any input gives output 0 on every row;
for a NAND it gives 1. An input stuck at the non-controlling value is **not** equivalent to anything else:
it is the one fault that only the "walking" vector for that input can see.

**Count:** an $n$-input AND gate has $n + 1$ lines and $2(n + 1)$ single faults; the $n$ input s-a-0 faults
and the output s-a-0 collapse into one class, leaving $n + 2$ classes.
:::

:::derivation{#derive-and-tests of="the n + 1 test set of an n-input AND gate" depth="standard"}
Take an $n$-input AND gate $f = x_1 x_2 \cdots x_n$ and its $2(n + 1)$ single faults.

1. **Input $x_i$ s-a-1.** Activation needs $x_i = 0$; propagation needs every other input at 1. So the only
   test is the vector with a 0 in position $i$ and 1s elsewhere (a "walking zero"). These $n$ vectors are
   all different, and each detects only its own input's s-a-1, so **all $n$ are forced** into any complete
   test set.
2. **Any input s-a-0, or the output s-a-0.** They are equivalent ($f \equiv 0$) and are detected only where
   the good $f = 1$: the all-1s vector. It is not one of the walking zeros, so it is **forced too**.
3. **Output s-a-1.** Detected by any vector with $f = 0$, for example any walking zero: nothing new is
   needed.

So every complete test set contains the $n$ walking zeros and the all-1s vector, and these $n + 1$ vectors
are complete: the minimum is exactly $n + 1$. NAND has the same tests (an output inversion changes no
comparison). For OR and NOR, swap 0 and 1: the all-0s vector plus the $n$ "walking ones".

**Sanity check.** $n = 2$: $\{01, 10, 11\}$, 3 vectors; $n = 3$: $\{011, 101, 110, 111\}$, 4 vectors. An exhaustive
search over all subsets of rows gives 3, 4 and 5 for $n = 2, 3, 4$, and finds no smaller set.
:::

### Worked examples: test sets

::::example{#ex-set-easy level="easy" title="All single faults of a 2-input AND" depth="quick"}
Find a minimum test set for all single faults of $f = AB$.

:::step{why="Input s-a-1 faults each need a walking zero: A s-a-1 needs A = 0, B = 1; B s-a-1 needs A = 1, B = 0."}
$01$ and $10$ are forced.
:::

:::step{why="A s-a-0, B s-a-0 and f s-a-0 are equivalent and need f = 1."}
$11$ is forced.
:::

:::step{why="f s-a-1 needs any row with f = 0; 01 already is one."}
Nothing more is needed.
:::

:::answer
$\{01, 10, 11\}$: three vectors for six faults ($n + 1 = 3$). The vector $00$ is useless here: it detects only
$f$ s-a-1, which $01$ already catches.
:::
::::

::::example{#ex-set-medium level="medium" title="A 3-input NAND gate" depth="standard"}
Find a minimum complete test set for the single faults of $f = \text{NAND}(a, b, c)$.

:::step{why="Each input s-a-1 needs that input 0 and the other two at the non-controlling value 1."}
$a$ s-a-1: $011$; $b$ s-a-1: $101$; $c$ s-a-1: $110$.
:::

:::step{why="The input s-a-0 faults and the output s-a-1 are equivalent (output stuck at 1); the good output must be 0."}
Only $111$ gives $f = 0$: it is forced.
:::

:::step{why="Output s-a-0 needs a row with f = 1; any walking zero already gives that."}
Covered.
:::

:::answer
$\{011, 101, 110, 111\}$: 4 = $n + 1$ vectors cover all 8 single faults.
:::
::::

::::example{#ex-set-gate level="gate" title="A minimum test set for the 1994 circuit" depth="standard"}
For $p = \text{NAND}(A, B)$, $f = \text{NAND}(p, C)$, find a minimum test set for all 10 single faults.

:::step{why="List the tests of every fault by activation and propagation (or by simulation)."}
$A$ s-a-0, $B$ s-a-0, $p$ s-a-1: only $111$. $A$ s-a-1: only $011$. $B$ s-a-1: only $101$.
$C$ s-a-0, $p$ s-a-0, $f$ s-a-1: $001, 011, 101$. $C$ s-a-1: $000, 010, 100$. $f$ s-a-0: $000, 010, 100, 110, 111$.
:::

:::step{why="Faults with a single test force that vector, like essential prime implicants."}
$111$, $011$, $101$ are forced. They also cover $C$ s-a-0, $p$ s-a-0, $f$ s-a-1 and $f$ s-a-0.
:::

:::step{why="Only C s-a-1 is left, and none of the forced vectors has C = 0."}
Add one of $000$, $010$, $100$.
:::

:::answer
4 vectors, for example $\{000, 011, 101, 111\}$. The 10 faults fall into only 6 equivalence classes
(\{$A$/0, $B$/0, $p$/1\}, \{$p$/0, $C$/0, $f$/1\}, $A$/1, $B$/1, $C$/1, $f$/0), and no 3 vectors can cover them.
:::
::::

::::example{#ex-set-edge level="gate" title="Edge case: an XOR gate needs only two tests" depth="standard"}
Find a minimum test set for all single faults of $f = a \oplus b \oplus c$.

:::step{why="XOR has no controlling value: flipping any input flips the output on every row."}
So input $x$ s-a-$v$ is detected by **every** row with $x = \overline{v}$.
:::

:::step{why="The row 000 has every input at 0, and 111 has every input at 1."}
$000$ detects all three input s-a-1 faults; $111$ detects all three input s-a-0 faults.
:::

:::step{why="The output faults: f(000) = 0 and f(111) = 1, so one row exposes each output fault."}
$000$ detects $f$ s-a-1 and $111$ detects $f$ s-a-0.
:::

:::answer
$\{000, 111\}$: 2 vectors, fewer than $n + 1 = 4$. The $n + 1$ rule belongs to AND, NAND, OR and NOR, whose
controlling values make every input's s-a-(non-controlling) fault need its own vector.
:::
::::

:::note{#recap-test-sets title="Recap" depth="quick"}
Pick the fewest vectors that hit every fault's test list; single-test faults force their vector. An
$n$-input AND/NAND needs exactly $n + 1$ tests (walking zeros plus all-1s), OR/NOR the dual. Faults that
force the same constant on a gate's output are equivalent and need only one test between them.
:::

## GATE questions on this lesson

:::pyq{id="cse-1994-b-35-b" tests="test-vector,activation,propagation" depth="standard"}
:::

:::pyq{id="it-2005-cs-46" tests="fault-count,stuck-at-model,trap-multiple-count" depth="standard"}
:::

:::pyq{id="it-2007-cs-45" tests="undetectable,propagation,trap-none-of-above" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dl-04-06-q01" depth="standard"}
:::

:::practice{id="nx-dl-04-06-q02" depth="standard"}
:::

:::practice{id="nx-dl-04-06-q03" depth="standard"}
:::

:::practice{id="nx-dl-04-06-q04" depth="standard"}
:::

:::practice{id="nx-dl-04-06-q05" depth="standard"}
:::

:::practice{id="nx-dl-04-06-q06" depth="standard"}
:::

:::practice{id="nx-dl-04-06-q07" depth="standard"}
:::

:::practice{id="nx-dl-04-06-q08" depth="standard"}
:::

:::practice{id="nx-dl-04-06-q09" depth="standard"}
:::

:::practice{id="nx-dl-04-06-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Stuck-at faults on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Lines | primary inputs, gate outputs, and each fan-out branch separately from its stem |
| Fault counts | single $2N$; multiple $3^N - 1$; exactly $k$ faulty lines $\binom{N}{k}2^k$ |
| Test | an input on which the good and faulty outputs differ |
| Activation | drive the stuck line to the opposite of its stuck value |
| Propagation | side inputs non-controlling: 1 for AND/NAND, 0 for OR/NOR; XOR always passes |
| Exact condition | $t$ detects $p$ s-a-$v$ iff $p(t) = \overline{v}$ and $\partial f/\partial p\,(t) = f_p(t,0) \oplus f_p(t,1) = 1$ |
| Undetectable | activation and propagation conflict; then the line is redundant (tie it to $v$) |
| Equivalent faults | AND: input s-a-0 ≡ output s-a-0; NAND: input s-a-0 ≡ output s-a-1; OR/NOR dual |
| Test sets | $n$-input AND/NAND: $n + 1$ vectors (walking zeros + all 1s); XOR: 2 |
| Masking | a test for one fault can fail when another fault is present |
:::
