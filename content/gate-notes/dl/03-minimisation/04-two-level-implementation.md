---
id: two-level-implementation
subject: dl
chapter: minimisation
title: "From minimal forms to gates: cost, NAND/NOR, hazards"
order: 4
prerequisites: [prime-implicants, universal-gates]
pyq_topics: [dl/minimization, dl/gates]
est_minutes: 45
difficulty: core
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every literal count, gate count, hazard and shared cover is checked in content/gate-notes/_checks/dl/l3_04_two_level.py (exhaustive gate search, adjacent-pair hazard check, multi-output search)."
  - "Coverage checklist only (internal digests, never copied): set B pp. 117–118 and 129, set C pp. 259 and 276–278, set D p. 402, set E p. 407. Hazards are only summarised in the sets and are written here from textbooks."
  - "Facts checked against: M. Morris Mano, Digital Design (NAND and NOR implementation, hazards); S. H. Unger, Asynchronous Sequential Switching Circuits (static hazards and the consensus cover)."
  - "PYQs: src/gate/questions.json (cse-2003-cs-45, cse-2006-cs-38, cse-2017-1-cs-21, cse-2019-cs-50); keys re-derived in l3_04_two_level.py. cse-2006-cs-38 is corrected through src/gate/fixes/cse-2006.json (see _errata/dl.md)."
updated: "2026-10-18"
---

A minimal expression is only useful once it is built. This lesson measures what "minimal" costs in
hardware (literals, gates, gate inputs), turns minimal SOPs and POSs into NAND–NAND and NOR–NOR
circuits, counts the fewest 2-input gates a function needs, and then meets a surprise: the cheapest
circuit can **glitch** when an input changes, and the cure is to add back a term that minimisation threw
away. Finally, circuits with several outputs can share product terms, which changes what "minimal"
means.

## Where this fits

[Lesson 2](lesson:prime-implicants) produced minimal covers; [Chapter 2, Lesson 5](lesson:universal-gates)
showed that NAND and NOR are universal. Here the two meet. GATE asks for literal counts (2003),
minimum NOR-gate counts (2017, 2019) and hazard-free covers (2006).

:::table{#radar title="GATE radar: cost, NAND/NOR and hazards" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 4 (2003, 2006, 2017, 2019) |
| Marks | 1 one-mark, 3 two-mark |
| Pattern 1 | Minimum literal counts of SOP and POS from a map with don't-cares: 2003 |
| Pattern 2 | Fewest 2-input NOR gates, complements available: 2017, 2019 |
| Pattern 3 | Which cube cover is free of static hazards: 2006 |
| What examiners test | That SOP and POS minima can differ, that complemented inputs are free, that a single literal or a single gate may suffice, and that every adjacent pair of 1s must share a cube for a hazard-free cover |
:::

## What does a circuit cost?

:::intuition{#what-cost title="Wires and boxes" depth="standard"}
A two-level circuit is a row of AND gates feeding one OR gate (or ORs feeding an AND). Every literal is a
wire into an AND gate; every term is one AND gate and one wire into the OR gate. So fewer literals means
fewer wires, and fewer terms means fewer gates. A one-literal term needs no AND gate at all: the input
wire goes straight to the OR. Minimisation is simply buying the fewest boxes and wires that still
compute $f$.
:::

:::definition{#cost-measures term="Cost measures" depth="standard"}
- **Literal count:** the number of literal occurrences in the expression ($xy + xz'$ has 4). GATE 2003
  defines exactly this.
- **Term count:** the number of product (or sum) terms.
- **Gate count / gate inputs:** for a two-level AND–OR circuit, one AND gate per term with at least two
  literals plus one OR gate (if there are at least two terms); gate inputs = literals in the AND gates +
  terms entering the OR gate.

"Minimal" in this chapter means fewest literals, then fewest terms. The measures usually agree; when
they do not, a question will say which one counts.
:::

:::theorem{#sop-vs-pos name="SOP and POS minima can differ" depth="standard"}
The minimal POS literal count of $f$ equals the minimal SOP literal count of $f'$ (with the same
don't-cares). In general this differs from the minimal SOP literal count of $f$, in either direction.
:::

:::proof{#proof-sop-vs-pos of="the SOP/POS cost relation" depth="standard"}
**Idea first:** a POS of $f$ is De Morgan's image of an SOP of $f'$, literal for literal.

A POS $\prod_i (\ell_{i1} + \dots)$ of $f$ is the complement of the SOP $\sum_i \ell_{i1}' \cdots$ of $f'$, and
the two have the same number of literals. So the cheapest POS of $f$ and the cheapest SOP of $f'$ cost the
same. The 1s and 0s of $f$ form different patterns on the map, so nothing forces their cheapest covers to
cost the same: $A' + BC$ (3 literals) has POS $(A' + B)(A' + C)$ (4 literals), while $D(A' + C')$ (3) has
SOP $A'D + C'D$ (4).
:::

:::definition{#min-literal-count term="Method: minimum literal counts" depth="standard"}
1. SOP: loop the 1s (Xs as helpers) for a minimal cover; add its literals.
2. POS: loop the 0s (Xs as helpers, chosen independently of step 1); add the literals of the sum terms.
3. Report each count; do not make the POS agree with the SOP on the don't-cares.
:::

:::trap{#trap-dc-shared title="Reusing the SOP's don't-care choices for the POS" depth="standard"}
After finding the SOP, students often fix the Xs to the values the SOP used and then derive the POS of
that completed function. That POS can cost more: the POS is allowed to choose the Xs again. GATE 2003 is
built on this: its true minima are POS 9 and SOP 8, and they use the Xs differently.
:::

### Worked examples: literal counts

::::example{#ex-lit-easy level="easy" title="SOP versus POS for a 3-variable function" depth="quick"}
Compare the minimal SOP and POS literal counts of $f(A, B, C) = \Sigma m(0, 1, 2, 3, 7)$.

:::step{why="SOP: row A = 0 is a quad (A′); m7 pairs with m3 (BC)."}
$f = A' + BC$: 3 literals.
:::

:::step{why="POS: the 0s are m4, m5, m6. m4, m5 give (A′ + B); m4, m6 give (A′ + C)."}
$f = (A' + B)(A' + C)$: 4 literals.
:::

:::answer
SOP 3, POS 4. (Distributivity confirms it: $(A' + B)(A' + C) = A' + BC$.)
:::
::::

::::example{#ex-lit-medium level="medium" title="Don't-cares make the POS cheaper" depth="standard"}
Find the minimal literal counts of $f = \Sigma m(1, 3, 5, 7, 9) + d(6, 12, 13)$.

:::step{why="SOP: A′D covers 1, 3, 5, 7; m9 pairs with m1 or joins m13 (X) in C′D."}
$f = A'D + C'D$: 4 literals.
:::

:::step{why="POS: with X6 and X12 the whole D = 0 half is an octet of 0s, (D); m10, m11, m14, m15 give (A′ + C′)."}
$f = D(A' + C')$: 3 literals.
:::

:::answer
SOP 4, POS 3.
:::
::::

::::example{#ex-lit-gate level="gate" title="A 2003-style pair of literal counts" depth="standard"}
For $f = \Sigma m(3, 6, 7, 9, 11, 12, 13, 14, 15) + d(0, 1)$, find the minimum literal counts of the POS
and the SOP.

:::step{why="SOP: m3 needs B′D (1, 3, 9, 11 with X1); m6 needs BC (6, 7, 14, 15); m12 needs AB. No cheaper cover exists (each is a quad, all three needed)."}
SOP: $B'D + BC + AB$: 6 literals.
:::

:::step{why="POS: the 0s are 2, 4, 5, 8, 10. With X0, X1: m2, m10 with X0 and m8 give the quad (B + D) (B = 0, D = 0); m4, m5 with X0, X1 give (A + C)."}
POS: $(A + C)(B + D)$: 4 literals.
:::

:::answer
(POS, SOP) = (4, 6). Note that the POS uses X1 as a 0 inside $(A + C)$, while the SOP uses X1 as a 1 inside $B'D$.
:::
::::

::::example{#ex-lit-edge level="gate" title="Edge case: equal counts, different functions" depth="standard"}
For $f(A, B, C) = \Sigma m(1, 2, 4, 5, 6) + d(7)$, compare the minimal SOP and POS.

:::step{why="SOP: X7 makes row A = 1 a quad (A); m1 needs B′C, m2 needs BC′."}
$A + B'C + BC'$: 5 literals, with X7 = 1.
:::

:::step{why="POS: 0s at m0 and m3; m3 pairs with X7 into (B′ + C′); m0 stands alone, (A + B + C)."}
$(A + B + C)(B' + C')$: 5 literals, with X7 = 0.
:::

:::answer
Both cost 5 literals, yet they are different functions on row 7. Each is a correct minimal answer for its
own form.
:::
::::

:::note{#recap-cost title="Recap" depth="quick"}
Count literals (or gate inputs). POS cost of $f$ = SOP cost of $f'$; it can be higher or lower than the SOP
cost of $f$. With don't-cares, SOP and POS choose the Xs independently.
:::

## Two-level NAND and NOR circuits

:::theorem{#nand-nand-min name="AND–OR = NAND–NAND, OR–AND = NOR–NOR" depth="standard"}
Every SOP $T_1 + \dots + T_k$ (each $T_i$ a product) is computed by NAND gates for the terms feeding one
NAND gate: $f = \overline{\overline{T_1}\cdots\overline{T_k}}$. Dually, every POS is computed by NOR gates
for the sums feeding one NOR gate.
:::

:::proof{#proof-nand-nand-min of="the two-level NAND/NOR forms" depth="standard"}
**Idea first:** two inversions on a wire cancel, and De Morgan turns a bubbled-input OR into a NAND.

De Morgan: $\overline{\overline{T_1}\,\overline{T_2}\cdots\overline{T_k}} = T_1 + T_2 + \dots + T_k$. Each
$\overline{T_i}$ is a NAND of $T_i$'s literals, and the outer complement of a product is one more NAND. For
POS: $\overline{\overline{S_1} + \dots + \overline{S_k}} = S_1 \cdots S_k$, with each $\overline{S_i}$ a NOR.
:::

:::definition{#nor-nor-min term="Which form for which gate" depth="standard"}
- **NAND–NAND** comes from a **minimal SOP**: one NAND per term (with at least two literals) plus one
  output NAND.
- **NOR–NOR** comes from a **minimal POS**: one NOR per sum term plus one output NOR.
- A **single-literal term** needs no first-level gate, but it must enter the output gate **complemented**
  (the output NAND expects $\overline{T_i}$). With complements available that is free; without them it costs an
  inverter.
:::

:::definition{#complements-available term="When complemented inputs are available" depth="quick"}
GATE often says "inputs and their complements are available". Then $A'$ is a free wire, inverters on
inputs cost nothing, and every literal is equally cheap. Without that sentence, an inverter on an input is
a gate and must be counted.
:::

:::viz{#nand-viz spec="nand-nand-from-kmap" mode="animate" depth="standard"}
:::

:::definition{#min-gate-count term="Method: the fewest 2-input NAND or NOR gates" depth="standard"}
1. Find the minimal SOP (for NAND) or POS (for NOR); a two-level form gives an upper bound: one gate per
   two-or-more-literal term plus one output gate (with 2-input gates, wider terms cost more).
2. Look for shortcuts: a single literal or a single gate ($\overline{A + B}$ is one NOR; $A'C = \text{NOR}(A, C')$
   with complements).
3. For a lower bound, argue that fewer gates cannot work (or trust an exhaustive search on small
   functions). The table below was found by trying every circuit of 1, 2, 3, … gates.

| Function (complements free) | 2-input NAND | 2-input NOR |
|:--|:--|:--|
| $A'C$ | 2 | 1 |
| $AB + CD$ | 3 | 4 |
| $(A + B)(C + D)$ | 4 | 3 |
| $B \oplus D$ or $\overline{B \oplus D}$ | 3 | 3 |
| $AB + A'C$ | 3 | 3 |
:::

:::trap{#trap-literal-term title="Counting gates for a term that is a single literal" depth="quick"}
In $f = A + BC$ built NAND–NAND, the term $A$ needs no first-level NAND, but the output NAND needs $A'$,
not $A$. With complements available the count is 2 gates (NAND(B, C) and NAND(A′, NAND(B, C))); without
them it is 3. Writing "one gate per term plus one" gives 3 either way and is wrong in the first case.
:::

### Worked examples: NAND and NOR counts

::::example{#ex-gate-easy level="easy" title="NAND–NAND for a two-term SOP" depth="quick"}
How many 2-input NAND gates implement $f = AB + CD$?

:::step{why="Each 2-literal term becomes one NAND."}
NAND(A, B) and NAND(C, D).
:::

:::step{why="The output NAND of the two gives (AB)′′ + (CD)′′ = AB + CD by De Morgan."}
One output NAND.
:::

:::answer
3 gates; an exhaustive search confirms that 2 cannot do it.
:::
::::

::::example{#ex-gate-medium level="medium" title="NOR–NOR for a two-factor POS" depth="standard"}
How many 2-input NOR gates implement $f = (A + B)(C + D)$?

:::step{why="Each sum term becomes a NOR, giving its complement."}
NOR(A, B) $= \overline{A + B}$, NOR(C, D) $= \overline{C + D}$.
:::

:::step{why="A NOR of the two complements is the AND of the sums."}
$\overline{\overline{A + B} + \overline{C + D}} = (A + B)(C + D)$.
:::

:::answer
3 NOR gates (the same function needs 4 NAND gates).
:::
::::

::::example{#ex-gate-gate level="gate" title="XOR from 2-input NANDs with complements available" depth="standard"}
How many 2-input NAND gates compute $f = B \oplus D$ if $B'$ and $D'$ are available?

:::step{why="Minimal SOP: B′D + BD′ (the anti-diagonal pattern)."}
Two 2-literal terms.
:::

:::step{why="NAND–NAND: NAND(B′, D), NAND(B, D′), and a NAND of the two."}
3 gates.
:::

:::step{why="Two gates cannot work: the last gate would have to combine two signals that are each a single literal or one NAND of literals, and no such pair gives XOR (exhaustive search)."}
Lower bound 3.
:::

:::answer
3 NAND gates (without complements XOR needs 4, as Chapter 2 showed).
:::
::::

::::example{#ex-gate-edge level="gate" title="Edge case: a whole map in one gate" depth="standard"}
A map simplifies to $f = a'c$ (with don't-cares). How many 2-input NOR gates are needed if complements are
available?

:::step{why="De Morgan: a′c = (a + c′)′."}
$f = \text{NOR}(a, c')$.
:::

:::step{why="Zero gates would require f to be a single literal or a constant, and a′c is neither."}
So one gate is also the minimum.
:::

:::answer
1 NOR gate. Always simplify fully (using the don't-cares) before counting: GATE 2017 is exactly this.
:::
::::

:::note{#recap-gates title="Recap" depth="quick"}
Minimal SOP → NAND–NAND, minimal POS → NOR–NOR. Single-literal terms skip the first level but enter the
output gate complemented. With complements free, check for one-gate answers before counting.
:::

## Static hazards

:::intuition{#hazard-intuition title="A hand-over between two terms" depth="standard"}
Suppose $f$ stays 1 while one input changes, but the term that held $f$ at 1 before the change is not the
term that holds it afterwards. During the change one term switches off and the other switches on. Real
gates have delays, so for a moment both can be off, and the output dips to 0 and comes back: a **glitch**.
If some single term is 1 both before and after, it holds $f$ up throughout and nothing can dip.
:::

:::definition{#static-hazard-def term="Static hazards" depth="quick"}
A **static-1 hazard** is a possible momentary 0 on an output that should stay 1 while one input changes; a
**static-0 hazard** is a momentary 1 on an output that should stay 0. Two-level SOP (AND–OR) circuits can
have static-1 hazards; two-level POS (OR–AND) circuits static-0 hazards.
:::

:::theorem{#hazard-adjacent name="Hazard-free two-level SOP" depth="standard"}
A two-level AND–OR circuit for $f$ is free of static-1 hazards for every single-input change if and only if
**every pair of adjacent 1-cells** of $f$ lies together in at least one product term of the cover.
:::

:::proof{#proof-hazard-adjacent of="the hazard criterion" depth="standard"}
**Idea first:** a term containing both cells does not involve the changing variable, so it stays 1.

Let the input change from cell $u$ to the adjacent cell $v$ (one variable $x$ flips), with $f(u) = f(v) = 1$.
If a term $T$ contains both $u$ and $v$, then $T$ does not depend on $x$ and keeps all its other literals, so
$T = 1$ throughout the change and the OR output stays 1 whatever the delays. If no term contains both, then
every term that is 1 at $u$ contains the literal of $x$ that $u$ satisfies (otherwise it would contain $v$
too), so all of them turn off when $x$ changes, and the terms that are 1 at $v$ turn on. If the turn-on is
slower (for example through an extra inverter), there is an interval where all terms are 0: a possible
glitch.
:::

:::definition{#hazard-fix term="The consensus fix" depth="standard"}
For each adjacent pair of 1-cells that no term shares, add a product term containing both: the
**consensus** of the two terms that cover them ($xy + x'z$ gets $yz$). The added term is redundant
logically (it is the consensus) but not electrically. On the map: add a loop bridging every boundary
between two loops where 1s touch.
:::

:::viz{#hazard-viz spec="hazard-glitch" mode="animate" depth="standard"}
:::

:::definition{#static-0 term="Static-0 hazards in POS circuits" depth="quick"}
Dually, a two-level OR–AND circuit is free of static-0 hazards iff every pair of adjacent 0-cells lies in
one sum term. The fix is the dual consensus: $(x + y)(x' + z)$ gets the extra factor $(y + z)$.
:::

:::aside{#dynamic-hazard title="Dynamic hazards" depth="deep"}
A **dynamic hazard** is an output that should change once (0 → 1) but changes three or more times
(0 → 1 → 0 → 1). It needs the changing signal to reach the output along three or more paths with
different delays, which is typical of multi-level circuits. In a two-level AND–OR circuit where no AND gate
receives a variable together with its complement, a single input change cannot cause a dynamic hazard, so
removing the static-1 hazards (as above) makes it hazard-free for single-input changes.
:::

### Worked examples: hazards

::::example{#ex-hz-easy level="easy" title="The classic hazard" depth="quick"}
Find the static-1 hazard of $f = AB + A'C$ and remove it.

:::step{why="The 1s are m1, m3 (A′C) and m6, m7 (AB). Adjacent pairs: 1–3 and 6–7 (inside loops) and 3–7 (between loops)."}
The pair $m_3, m_7$ ($A$ changes with $B = C = 1$) is in no single term: a hazard.
:::

:::step{why="The consensus of AB and A′C is BC, which contains m3 and m7."}
Add $BC$.
:::

:::answer
$f = AB + A'C + BC$ is hazard-free (one gate more than the minimal SOP).
:::
::::

::::example{#ex-hz-medium level="medium" title="Two hazards in a 4-variable cover" depth="standard"}
The cover $A'C'D + BC + AB'C'$ implements $f = \Sigma(1, 5, 6, 7, 8, 9, 14, 15)$. Find its hazards and a fix.

:::step{why="List adjacent 1-pairs and check each against the three terms."}
$A'C'D$ = {1, 5}; $BC$ = {6, 7, 14, 15}; $AB'C'$ = {8, 9}. Uncovered pairs: 1–9 ($A$ changes) and 5–7 ($C$ changes).
:::

:::step{why="Add a term for each: m1, m9 form B′C′D; m5, m7 form A′BD."}
Add $B'C'D$ and $A'BD$.
:::

:::answer
$A'C'D + BC + AB'C' + B'C'D + A'BD$ has no static-1 hazard; every adjacent pair now shares a term.
:::
::::

::::example{#ex-hz-gate level="gate" title="Which cover is hazard-free?" depth="standard"}
$f(A, B, C) = AB' + BC$. Which of (i) $AB' + BC$, (ii) $AB' + BC + AC$, (iii) $AB' + A'BC + ABC$ is free of
static-1 hazards?

:::step{why="f = Σ(3, 4, 5, 7). Adjacent 1-pairs: 4–5, 3–7, 5–7."}
Three pairs must each lie in one term.
:::

:::step{why="(i): 4–5 in AB′, 3–7 in BC, but 5–7 in neither. (iii): 3–7 is split between A′BC and ABC, and 5–7 too."}
(i) and (iii) have hazards.
:::

:::step{why="(ii) adds AC = {5, 7}, the consensus of AB′ and BC."}
All three pairs covered.
:::

:::answer
Only (ii). (GATE 2006 asks the same question with six 1-cells; its answer is the cover containing the
consensus cube for every adjacent pair.)
:::
::::

::::example{#ex-hz-edge level="gate" title="Edge case: a hazard through the wrap-around" depth="standard"}
$f = \Sigma(0, 2, 8, 10)$ is built as $A'B'D' + AB'D'$. Is it hazard-free?

:::step{why="The cells m0 and m8 (and m2 and m10) are adjacent through the top/bottom border: they differ only in A."}
Pairs 0–8 and 2–10 are adjacent.
:::

:::step{why="Neither term contains both cells of either pair (A′B′D′ has A = 0, AB′D′ has A = 1)."}
Two static-1 hazards (when $A$ changes).
:::

:::answer
Not hazard-free. The minimal SOP $B'D'$ (the corner quad) contains all four cells and has no hazard: here
minimising also removes the hazard. Do not forget pairs that touch only across the map's edges.
:::
::::

:::note{#recap-hazards title="Recap" depth="quick"}
A static-1 hazard is a pair of adjacent 1-cells in different loops. Add the consensus term for each such
pair. POS circuits: the same with 0-cells and sum terms. Check wrap-around pairs too.
:::

## Multiple outputs sharing terms

:::intuition{#multi-intuition title="One gate, several customers" depth="standard"}
A circuit with two outputs has two OR gates, but its AND gates can feed both. A product term that is
useful to both outputs costs one AND gate instead of two. Sometimes the best shared term is not the best
term for either output alone: a slightly smaller loop that both outputs can use beats two bigger loops
that each output uses alone.
:::

:::definition{#multi-output term="Multiple-output minimisation" depth="standard"}
Minimise the **total** cost of all outputs, where an AND gate used by several outputs is paid for once.
Candidate terms are implicants of at least one output (including products of outputs, such as
implicants of $f_1 f_2$, which may be non-prime for each output). Cost: AND gates (terms with at least two
literals, counted once) and gate inputs (AND inputs plus OR inputs).
:::

:::viz{#multi-viz spec="multi-output-sharing" mode="animate" depth="standard"}
:::

### Worked examples: multiple outputs

::::example{#ex-mo-easy level="easy" title="Sharing an essential term" depth="quick"}
Build $f_1 = \Sigma(1, 3, 7)$ and $f_2 = \Sigma(3, 6, 7)$ over $(A, B, C)$ together.

:::step{why="Separately: f₁ = A′C + BC, f₂ = AB + BC."}
4 AND gates, 2 OR gates, 12 gate inputs.
:::

:::step{why="BC appears in both: build it once."}
3 AND gates, 2 OR gates, 10 gate inputs.
:::

:::answer
Shared: $BC$ feeds both OR gates; cost 3 ANDs and 10 inputs instead of 4 and 12.
:::
::::

::::example{#ex-mo-medium level="medium" title="Sharing a term that is prime for neither output" depth="standard"}
Build $f_1 = \Sigma(4, 5, 7)$ and $f_2 = \Sigma(1, 3, 7)$ together.

:::step{why="Separately: f₁ = AB′ + AC, f₂ = A′C + BC; four different AND gates."}
4 ANDs, 12 gate inputs.
:::

:::step{why="Both outputs contain m7 = ABC. Using the minterm ABC in both covers: f₁ = AB′ + ABC, f₂ = A′C + ABC."}
3 ANDs (one with 3 inputs), 11 gate inputs.
:::

:::answer
Cheaper together with the non-prime term $ABC$ (it is inside $AC$ for $f_1$ and inside $BC$ for $f_2$, but
neither of those is useful to the other output).
:::
::::

::::example{#ex-mo-gate level="gate" title="Three outputs" depth="standard"}
Build $f_1 = \Sigma(1, 3, 5)$, $f_2 = \Sigma(3, 6, 7)$, $f_3 = \Sigma(1, 3, 7)$ together.

:::step{why="Minimal SOPs: f₁ = A′C + B′C, f₂ = BC + AB, f₃ = A′C + BC."}
Separately: 6 AND gates, 18 gate inputs.
:::

:::step{why="Distinct terms used: A′C (f₁, f₃), B′C, BC (f₂, f₃), AB."}
4 AND gates, 3 OR gates; $8 + 6 = 14$ gate inputs.
:::

:::answer
Shared cost: 4 ANDs, 14 inputs (against 6 and 18).
:::
::::

::::example{#ex-mo-edge level="gate" title="Edge case: nothing to share" depth="standard"}
Build $f_1 = \Sigma(1, 3, 6, 7)$ and $f_2 = \Sigma(4, 5, 6, 7)$ together.

:::step{why="f₁ = A′C + AB; f₂ = A, a single literal: no AND gate and no OR gate at all."}
$f_2$ is a wire.
:::

:::step{why="Using AB for f₂ as well would only add cost; nothing can be shared."}
Cost: 2 ANDs, 6 gate inputs, the same as building $f_1$ alone.
:::

:::answer
Sharing saves nothing here; multi-output design pays off only when the outputs overlap on terms that cost
gates.
:::
::::

:::note{#recap-multi title="Recap" depth="quick"}
Count gates once across outputs. Shared terms can be EPIs of both outputs or even non-prime terms; check
the total cost, not each output's own minimum.
:::

## Try it

Use the K-map Solver to compare the minimal SOP and POS of a function (toggle between them) and read their
literal counts.

:::lab{#lab-cost lab="kmap-solver" tab="map" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-2003-cs-45" tests="min-literal-count,sop-vs-pos,trap-dc-shared" depth="standard"}
:::

:::pyq{id="cse-2006-cs-38" tests="hazard-adjacent,hazard-fix" depth="standard"}
:::

:::pyq{id="cse-2017-1-cs-21" tests="min-gate-count,complements-available" depth="standard"}
:::

:::pyq{id="cse-2019-cs-50" tests="min-gate-count,nor-nor-min" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dl-03-04-q01" depth="standard"}
:::

:::practice{id="nx-dl-03-04-q02" depth="standard"}
:::

:::practice{id="nx-dl-03-04-q03" depth="standard"}
:::

:::practice{id="nx-dl-03-04-q04" depth="standard"}
:::

:::practice{id="nx-dl-03-04-q05" depth="standard"}
:::

:::practice{id="nx-dl-03-04-q06" depth="standard"}
:::

:::practice{id="nx-dl-03-04-q07" depth="standard"}
:::

:::practice{id="nx-dl-03-04-q08" depth="standard"}
:::

:::practice{id="nx-dl-03-04-q09" depth="standard"}
:::

:::practice{id="nx-dl-03-04-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Cost, NAND/NOR and hazards on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Cost | literals (GATE's "literal count"), terms, gates, gate inputs |
| SOP vs POS | POS cost of $f$ = SOP cost of $f'$; either can be cheaper; Xs chosen independently |
| NAND / NOR | minimal SOP → NAND–NAND; minimal POS → NOR–NOR; single literals enter complemented |
| Complements free | $A'$ costs nothing; look for one-gate answers ($a'c$ = NOR(a, c′)) |
| Static-1 hazard | adjacent 1-cells in no common term; fix with the consensus term |
| Static-0 hazard | the dual, for POS circuits and adjacent 0-cells |
| Multi-output | pay once for a shared AND gate; shared terms may be non-prime |
:::
