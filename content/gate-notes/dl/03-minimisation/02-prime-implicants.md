---
id: prime-implicants
subject: dl
chapter: minimisation
title: Implicants, prime implicants and don't-cares
order: 2
prerequisites: [kmaps]
pyq_topics: [dl/minimization]
est_minutes: 60
difficulty: core
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every PI list, PI/EPI count, minimal cover and answer is checked in content/gate-notes/_checks/dl/l3_02_prime_implicants.py (Quine–McCluskey vs brute force; Petrick vs exhaustive search)."
  - "Coverage checklist only (internal digests, never copied): set A pp. 40–42, set B pp. 114–117, set C pp. 234–236, 260–269 and 273–276, set E p. 405. Set B's 'the minimal SOP is unique' and set C's slips on pp. 267, 271 and 273 are recorded in _errata/dl.md."
  - "Facts checked against standard textbooks: M. Morris Mano, Digital Design (prime implicants, essential prime implicants, don't-care conditions); W. V. Quine, 'The problem of simplifying truth functions' (1952) for the prime implicant theorem."
  - "PYQs: src/gate/questions.json (dl/minimization); all fourteen keys are re-derived by enumeration in l3_02_prime_implicants.py."
updated: "2026-10-18"
---

Lesson 1 drew loops by eye and gave a rule of thumb: "forced 1s first, then the biggest loops". That
works on easy maps and fails silently on hard ones. This lesson gives the rule its exact form. Every
loop you could ever want is a **prime implicant**; some of them are **essential** and must appear in
every minimal answer; the rest are chosen by cost, and sometimes several choices tie. With
**don't-cares** the same machinery runs on a function that is only partly specified. GATE asks about
these words directly: how many prime implicants, how many essential ones, which term is an implicant.

## Where this fits

[Lesson 1](lesson:kmaps) built the map and the grouping rules. Here we name the objects those rules
handle and prove the two facts that make minimisation a finite search: minimal SOPs need only prime
implicants, and essential prime implicants are always in. Lesson 3 does the same search with a table
(Quine–McCluskey) instead of a picture, and Lesson 4 turns the result into gates.

:::table{#radar title="GATE radar: prime implicants and don't-cares" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 14 (1991–2026) |
| Marks | 5 one-mark, 8 two-mark, 1 four-mark (descriptive) |
| Pattern 1 | Minimal SOP or POS of a map or list with don't-cares: 1991, 1999, 2001, 2002, 2008, 2012, 2014, 2017 |
| Pattern 2 | Count the prime implicants or the essential ones: 2015, 2018 |
| Pattern 3 | Which term is an essential PI, an implicant, a minterm: 1997, 2004, 2006 |
| Pattern 4 | Which expressions are minimal when several minimal SOPs exist: 2026 |
| What examiners test | The definitions word for word (implicant vs prime vs essential), that don't-cares never need covering, that a don't-care cell cannot make a PI essential, and that the minimal SOP need not be unique |
:::

## The idea: covering a floor with rugs

:::intuition{#cover-puzzle title="The fewest, cheapest rugs" depth="standard"}
Think of the 1-cells of a map as a floor you must cover with rectangular rugs. A rug may only lie on
floor (on 1s, never on 0s), and rugs come only in the legal K-map shapes. Big rugs are cheap (few
literals), small rugs are expensive. Overlapping is allowed.

Three observations solve the puzzle. First, never buy a rug that could be enlarged: a bigger rug in
the same place covers at least as much for less. Those maximal rugs are the **prime implicants**.
Second, if some spot of floor fits under only one maximal rug, that rug must be bought: it is
**essential**. Third, after buying the essential rugs, cover what is left as cheaply as you can; if
two choices cost the same, there are two equally good answers. Don't-cares are spots of floor you may
cover or leave bare, whichever is convenient.
:::

## Implicants

:::intuition{#implicant-intuition title="A rug that fits on the floor" depth="standard"}
A product term is a rectangle of cells. It is useful in an SOP of $f$ only if it lies entirely on the
floor, the 1-cells: if any of its cells is a 0, the term would switch $f$ on where it must be off. Such a
"rug that fits" is an implicant. Single cells (minterms) always fit; bigger rugs fit only where the floor is
wide enough.
:::

:::definition{#implicant-def term="Implicant" depth="quick"}
A product term $p$ is an **implicant** of $f$ when $p = 1$ forces $f = 1$, i.e. $p \le f$ (written
$p \to f$). On a map, $p$ is an implicant exactly when its group of cells lies entirely inside the
1-cells of $f$. Every minterm of $f$ and every term of every SOP of $f$ is an implicant.
:::

:::theorem{#implicant-subset name="Implicant ⇔ its cells are 1s of f" depth="standard"}
A product term $p$ is an implicant of $f$ if and only if every minterm of $p$ is a minterm of $f$.
:::

:::proof{#proof-implicant-subset of="the implicant criterion" depth="standard"}
**Idea first:** "$p$ implies $f$" is a statement about rows, and $p$'s rows are its minterms.

$p \to f$ means: on every row where $p = 1$, also $f = 1$. The rows where $p = 1$ are exactly the
minterms of $p$ (its group on the map). So the condition says that each of those minterms is a
minterm of $f$, and conversely.
:::

:::definition{#term-ladder term="Minterm, implicant, prime implicant: a ladder" depth="standard"}
For $f(x, y, z) = x' + y'x + xz$ (the GATE 1997 function, which is $x' + y' + z$):

| Term | Is it an implicant? | Is it prime? | Why |
|:--|:--|:--|:--|
| $x'y'z'$ ($m_0$) | yes | no | a **minterm**: one cell, it can grow |
| $xy'$ | yes | no | its cells $m_4, m_5$ are 1s, but $y'$ alone is also an implicant |
| $xz$ | yes | no | $m_5, m_7$ are 1s, but $z$ alone is an implicant |
| $y'$ | yes | yes | four cells, all 1s; dropping $y'$ gives 1, which is not an implicant |
| $y$ | no | no | $m_6 = xyz'$ is in $y$ and $f(m_6) = 0$ |

A minterm is the smallest implicant; a prime implicant is a maximal one (it cannot be enlarged), not necessarily the largest; most implicants are in between.
:::

:::derivation{#count-implicants of="the number of implicants" depth="standard"}
Each implicant is a legal group inside the 1-cells, so count groups by size. For
$f = \Sigma(0, 1, 5, 8, 12, 13)$: six 1-cells (6 one-cell implicants), and the pairs $\{0, 1\}, \{0, 8\},
\{1, 5\}, \{5, 13\}, \{8, 12\}, \{12, 13\}$ (6 two-cell implicants); no group of 4 fits. Total
$6 + 6 = 12$ implicants. In general a function with $k$ 1-cells has at least $k$ implicants (its minterms),
with equality exactly when no two 1-cells are adjacent; every adjacent pair adds a 2-cell implicant, every
quad a 4-cell one, and so on. **Sanity check:** a function with a single 1-cell has exactly one implicant,
its minterm.
:::

### Worked examples: implicants

::::example{#ex-imp-easy level="easy" title="Implicant, but not prime" depth="quick"}
For $f(x, y, z) = \Sigma m(1, 3, 5, 7)$, is $xz$ an implicant? Is it prime?

:::step{why="xz is the cells x = 1, z = 1: m5 and m7, both 1s."}
$xz$ is an implicant.
:::

:::step{why="Drop x: z = {1, 3, 5, 7}, all 1s, so z is still an implicant and xz is not maximal."}
Not prime: $f = z$.
:::

:::answer
An implicant, not a prime implicant (it lies inside the PI $z$).
:::
::::

::::example{#ex-imp-medium level="medium" title="Sorting terms on the ladder" depth="standard"}
For $f(A, B, C) = AB + A'C$, classify $A'BC$, $BC$ and $B$.

:::step{why="f = Σ(1, 3, 6, 7). A′BC is the single cell m3, a 1."}
$A'BC$ is a minterm of $f$, hence an implicant (not prime: it lies inside $A'C$).
:::

:::step{why="BC = {3, 7}: both 1s. Dropping B gives C = {1, 3, 5, 7} (m5 is 0); dropping C gives B = {2, 3, 6, 7} (m2 is 0)."}
$BC$ is a prime implicant (the consensus of $AB$ and $A'C$).
:::

:::step{why="B = {2, 3, 6, 7} contains the 0-cell m2."}
$B$ is not an implicant.
:::

:::answer
Minterm (implicant, not prime); prime implicant; not an implicant.
:::
::::

::::example{#ex-imp-count level="gate" title="Counting all implicants" depth="standard"}
How many implicants does $f(A, B, C) = \Sigma m(0, 1, 2, 3, 7)$ have?

:::step{why="One-cell implicants: the five minterms."}
5.
:::

:::step{why="Two-cell implicants: adjacent pairs of 1s: 0–1, 0–2, 1–3, 2–3, 3–7."}
5.
:::

:::step{why="Four-cell implicants: only row A = 0 (m0–m3) is a quad of 1s; no group of 8 fits."}
1.
:::

:::answer
$5 + 5 + 1 = 11$ implicants, of which 2 are prime ($A'$ and $BC$).
:::
::::

::::example{#ex-imp-dc level="gate" title="Edge case: implicants with a don't-care" depth="standard"}
For $f(A, B, C) = \Sigma m(1) + d(3)$, is $A'C$ an implicant?

:::step{why="A′C = {1, 3}: m1 is a 1 and m3 is a don't-care."}
Its cells lie inside the 1s and Xs.
:::

:::step{why="It is an implicant of the completion with X3 = 1 (and of the specification), but not of the completion with X3 = 0."}
With don't-cares, "implicant" is judged against $M \cup D$, the 1s together with the Xs.
:::

:::answer
Yes, as an implicant of the incompletely specified function; using it sets $X_3 = 1$. It is the prime
implicant that gives the minimal SOP $A'C$ (2 literals instead of 3).
:::
::::

:::note{#recap-implicants title="Recap" depth="quick"}
Implicant: all its cells are 1s (or Xs). Minterms are the smallest implicants, prime implicants the maximal
ones. Count implicants group size by group size.
:::

## Prime implicants

:::intuition{#pi-intuition title="A rug that cannot be stretched" depth="standard"}
Among the rugs that fit, the useful ones are those you cannot stretch: doubling a prime implicant in any
direction would push it onto a 0. A rug that could still be doubled is never worth buying, because the
doubled rug covers more and costs one literal less.
:::

:::definition{#pi-def term="Prime implicant (PI)" depth="quick"}
A **prime implicant** is an implicant that is not contained in any larger implicant. Equivalently,
deleting **any** one of its literals makes it stop being an implicant. On a map: a loop that cannot be
enlarged (doubled in any direction) without taking in a 0.
:::

:::theorem{#primes-suffice name="Some minimal SOP uses prime implicants only" depth="standard"}
Every function has a minimal SOP (fewest literals; the same holds for fewest terms) in which every
term is a prime implicant. In fact, any SOP of $f$ can be turned into one made only of prime implicants
that is no more expensive.
:::

:::proof{#proof-primes-suffice of="the prime implicant theorem" depth="standard"}
**Idea first:** replace each term by a prime implicant that contains it; the cover only grows, the cost
only falls.

Take any SOP $f = t_1 + \dots + t_k$. Each $t_i$ is an implicant. Delete literals from $t_i$ one at a
time as long as the result is still an implicant; this stops at a prime implicant $P_i \supseteq t_i$
with no more literals than $t_i$. Then $t_1 + \dots + t_k \le P_1 + \dots + P_k \le f$ (each $P_i$ is an
implicant), so $P_1 + \dots + P_k = f$, and its literal count is at most that of the original. Applying
this to a minimal SOP gives a minimal SOP made of prime implicants (and if two $P_i$ coincide, dropping
the copy only lowers the cost).
:::

:::definition{#list-pis term="Method: listing every prime implicant on a map" depth="standard"}
1. Take each 1-cell in turn.
2. Grow every loop that contains it as far as it will go: try doubling in each direction (wrap-around
   included), keep doubling while the new cells are all 1s (or don't-cares).
3. Record every loop that cannot be doubled any further. A cell may lie in several PIs; record them all.
4. Stop when every 1-cell has been the starting point. Do not record a loop that lies inside another
   recorded loop: it is an implicant but not prime.

Lesson 3 does the same thing mechanically (Quine–McCluskey) and checks it.
:::

:::viz{#pi-enum-viz spec="pi-enumeration" mode="animate" depth="standard"}
:::

:::trap{#trap-pi-vs-chosen title="'Prime implicants' are all maximal loops, not the ones you chose" depth="quick"}
A question that asks for **the number of prime implicants** wants every maximal loop, including those
your minimal answer does not use. In the animation above, $A'B'$ is a prime implicant (it cannot grow)
even though the minimal SOP $A'D + B'D' + ACD'$ does not use it. Counting only the loops of your
answer gives a wrong count.
:::

### Worked examples: listing and counting prime implicants

::::example{#ex-pi-3var level="easy" title="All PIs of a 3-variable function" depth="quick"}
List the prime implicants of $f(A, B, C) = \Sigma m(0, 1, 3, 7)$.

:::step{why="Plot: row A = 0 holds 1s at BC = 00, 01, 11; row A = 1 at BC = 11."}
1s: $m_0, m_1, m_3, m_7$.
:::

:::step{why="Grow from each 1. m0 joins m1 (row 0); m1 also joins m3; m3 also joins m7 (column BC = 11). No quad fits: every 2×2 block or row of four contains a 0."}
Pairs: $A'B'$ ($m_0, m_1$), $A'C$ ($m_1, m_3$), $BC$ ($m_3, m_7$).
:::

:::answer
3 prime implicants: $A'B'$, $A'C$, $BC$. (Only $A'B'$ and $BC$ are needed: $f = A'B' + BC$.)
:::
::::

::::example{#ex-pi-4var level="medium" title="Counting PIs on a 4-variable map" depth="standard"}
How many prime implicants does $f = \Sigma m(0, 1, 2, 5, 6, 7, 8, 10)$ have?

:::step{why="The corners m0, m2, m8, m10 are all 1s: the quad B′D′. It cannot double: B′ would also need m3, m9, m11 and D′ would need m4, m12, m14, all 0s."}
Quad: $B'D'$.
:::

:::step{why="Every other 1 sits in row AB = 00 or 01; grow pairs from each. m1: with m0 (A′B′C′) or m5 (A′C′D). m6: with m2 (A′CD′) or m7 (A′BC). m5 with m7 (A′BD). No quad among them: e.g. m1, m3, m5, m7 needs m3, a 0."}
Pairs: $A'B'C'$, $A'C'D$, $A'CD'$, $A'BD$, $A'BC$.
:::

:::answer
6 prime implicants (one quad, five pairs). Only $B'D'$ is essential (it alone covers $m_8$ and $m_{10}$);
a minimal SOP is $B'D' + A'C'D + A'BC$.
:::
::::

::::example{#ex-pi-dc level="gate" title="Counting PIs with don't-cares" depth="standard"}
How many prime implicants does $f = \Sigma m(1, 3, 4, 6, 9, 11, 12) + d(0, 8, 14)$ have?

:::step{why="With don't-cares, a loop may contain 1s and Xs. Grow from each 1 using both."}
$m_1, m_3, m_9, m_{11}$: the quad $B'D$. $m_4, m_6, m_{12}$ with $X_{14}$: the quad $BD'$.
:::

:::step{why="Two more maximal loops use the Xs at 0 and 8: column CD = 00 (m0, m4, m12, m8) and m0, m1, m8, m9 (rows 00 and 10, columns 00 and 01)."}
Quads: $C'D'$ ($m_0, m_4, m_8, m_{12}$) and $B'C'$ ($m_0, m_1, m_8, m_9$).
:::

:::answer
4 prime implicants: $B'D$, $BD'$, $C'D'$, $B'C'$. Only $B'D$ and $BD'$ are essential, and they already
cover every 1: $f = B'D + BD'$. The other two are redundant.
:::
::::

::::example{#ex-pi-edge level="gate" title="Edge case: prime implicants that are mostly don't-cares" depth="standard"}
Find the prime implicants of $f = \Sigma m(7) + d(3, 5, 15)$ (four variables) and say which are essential.

:::step{why="m7 = 0111. Its neighbours are 3, 5, 6 and 15; three of them are Xs, so three pairs are possible."}
$m_3, m_7$: $A'CD$. $m_5, m_7$: $A'BD$. $m_7, m_{15}$: $BCD$.
:::

:::step{why="No quad: each of the six quads through m7 (0−−1, −1−1, −−11, 01−−, 0−1−, −11−) contains a cell that is neither 1 nor X (1, 13, 11, 4, 2 or 6)."}
Each pair is maximal, so there are 3 prime implicants, each holding one 1 and one X.
:::

:::answer
3 PIs, **none essential**: $m_7$ (the only 1) is covered by all three. Any one of them is a minimal SOP
(3 literals), so $f$ has three minimal SOPs. A prime implicant can be mostly made of don't-cares; what
makes it count is the one 1 inside it.
:::
::::

:::note{#recap-pis title="Recap" depth="quick"}
Implicant = a group inside the 1s (and Xs). Prime = cannot be enlarged. Some minimal SOP uses prime
implicants only. List PIs by growing a maximal loop in every direction from every 1; count all of them,
used or not.
:::

## Essential prime implicants

:::intuition{#epi-intuition title="A spot only one rug reaches" depth="standard"}
Look at each 1-cell and ask how many maximal rugs lie over it. If the answer is one, that rug is forced:
without it the spot stays bare. Forced rugs come first; only after them do you have any real choices.
:::

:::definition{#epi-def term="Essential prime implicant (EPI)" depth="quick"}
A prime implicant is **essential** when it covers at least one 1-cell (a minterm, not a don't-care)
that **no other** prime implicant covers.
:::

:::definition{#distinguished term="Distinguished 1-cells" depth="quick"}
A 1-cell that lies in exactly one prime implicant is a **distinguished** cell; its prime implicant is
essential. To find the EPIs, check every 1-cell and count the PIs through it.
:::

:::theorem{#epi-in-every-cover name="Essential PIs are in every minimal cover" depth="standard"}
Every SOP of $f$ made of prime implicants (in particular every minimal SOP from the previous theorem)
contains every essential prime implicant.
:::

:::proof{#proof-epi-in-every-cover of="the essential PI theorem" depth="standard"}
**Idea first:** the distinguished cell must be covered, and only one prime implicant can do it.

Let $E$ be essential, with distinguished 1-cell $m$. An SOP of $f$ must be 1 on $m$, so one of its terms
contains $m$. If all its terms are prime implicants, that term is a PI containing $m$, and the only such
PI is $E$. So $E$ is a term.
:::

:::viz{#epi-viz spec="epi-highlight" mode="animate" depth="standard"}
:::

:::trick{#trick-loner title="Look at the loners first" depth="standard"}
A 1-cell with few neighbouring 1s (a "loner") usually has only one maximal loop, so it marks an EPI
quickly. Scan for 1s whose neighbours are mostly 0s; loop each one as large as possible; those loops
are essential.

**Why it works:** a cell with few 1-neighbours has few ways to grow, often just one. **When it fails:**
a loner can have two equally large loops (then it is not distinguished); and a well-surrounded cell can
still be distinguished. Always confirm by counting the PIs through the cell.
:::

:::trap{#trap-epi-dc title="A don't-care cell cannot make a PI essential" depth="standard"}
"Covers a cell no other PI covers" means a **1**-cell. If the only cell that a prime implicant has to
itself is a don't-care, that PI is not essential (you never need to cover that X). GATE 2018 counts
EPIs with five don't-cares: counting PIs that are alone on an X gives a wrong total.
:::

:::definition{#rpi-spi term="Redundant and selective prime implicants" depth="standard"}
After the EPIs are chosen, the remaining PIs fall into two kinds:

- **redundant**: every 1 it covers is already covered by the EPIs. It never appears in a minimal SOP.
- **selective**: it covers some 1 the EPIs miss, but so do other PIs. Some of the selective PIs are
  needed; which ones is a cost decision.

A function with no EPI at all has no redundant PIs in this sense (every PI that covers a 1 is selective).
:::

:::definition{#cover-method term="Method: a minimal SOP from the PI list" depth="standard"}
1. List all prime implicants.
2. Mark the distinguished 1-cells; their PIs are essential. Take them all.
3. Strike out the redundant PIs (all their 1s are already covered).
4. Cover the remaining 1s with the cheapest set of selective PIs (fewest literals; Lesson 3's PI chart
   and Petrick's method do this systematically).
5. If several choices cost the same, every one of them is a minimal SOP.
:::

### Worked examples: essential prime implicants

::::example{#ex-epi-easy level="easy" title="EPIs of a 3-variable expression" depth="quick"}
Which prime implicants of $f(a, b, c) = ab + a'c + bc$ are essential?

:::step{why="Expand: ab = {6, 7}, a′c = {1, 3}, bc = {3, 7}. So f = Σ(1, 3, 6, 7)."}
1s: $m_1, m_3, m_6, m_7$; PIs: $ab$, $a'c$, $bc$ (no quad fits).
:::

:::step{why="Count the PIs through each 1. m1: only a′c. m6: only ab. m3: a′c and bc. m7: ab and bc."}
Distinguished cells: $m_1$ and $m_6$.
:::

:::answer
EPIs: $ab$ and $a'c$. They cover every 1, so $bc$ (the consensus term) is redundant and $f = ab + a'c$.
:::
::::

::::example{#ex-epi-4var level="medium" title="EPIs on a 4-variable map" depth="standard"}
Find the essential prime implicants of $f = \Sigma m(2, 3, 4, 5, 13, 15)$.

:::step{why="Grow loops: m2, m3 pair (A′B′C); m4, m5 pair (A′BC′); m5, m13 pair (BC′D); m13, m15 pair (ABD). No quads."}
PIs: $A'B'C$, $A'BC'$, $BC'D$, $ABD$.
:::

:::step{why="Distinguished cells: m2 and m3 lie only in A′B′C; m4 only in A′BC′; m15 only in ABD."}
EPIs: $A'B'C$, $A'BC'$, $ABD$.
:::

:::answer
3 EPIs. They also cover $m_5$ and $m_{13}$, so $BC'D$ is redundant and $f = A'B'C + A'BC' + ABD$.
:::
::::

::::example{#ex-epi-dc level="gate" title="Counting EPIs with don't-cares" depth="standard"}
How many essential prime implicants does $f = \Sigma m(0, 4, 8, 13) + d(5, 12, 15)$ have?

:::step{why="PIs using 1s and Xs: column CD = 00 (m0, m4, m12, m8) is C′D′; m4, m5, m12, m13 form BC′; m13 with X15 forms ABD."}
PIs: $C'D'$, $BC'$, $ABD$.
:::

:::step{why="Distinguished 1-cells: m0 and m8 lie only in C′D′. m4 is in C′D′ and BC′. m13 is in BC′ and ABD."}
Only $C'D'$ is essential.
:::

:::step{why="ABD is the only PI through m15, but m15 is a don't-care, so that does not make ABD essential."}
$ABD$ is not essential.
:::

:::answer
1 EPI ($C'D'$). Minimal SOP: $C'D' + BC'$ (the cheaper of the two ways to cover $m_{13}$).
:::
::::

::::example{#ex-epi-none level="gate" title="Edge case: prime implicants but no essential one" depth="standard"}
How many PIs and EPIs does $f = \Sigma m(0, 1, 5, 8, 12, 13)$ have?

:::step{why="Every 1 has exactly two neighbouring 1s, forming a ring 0–1–5–13–12–8–0, and no quad fits."}
PIs: the six pairs $A'B'C'$, $A'C'D$, $BC'D$, $ABC'$, $AC'D'$, $B'C'D'$.
:::

:::step{why="Every 1 lies in two pairs, so no 1 is distinguished."}
EPIs: none. The function is **cyclic**.
:::

:::answer
6 PIs, 0 EPIs. Taking every other pair round the ring gives two minimal SOPs of 3 pairs each (9 literals).
:::
::::

:::note{#recap-epi title="Recap" depth="quick"}
EPI = the only PI through some 1-cell (never count a don't-care cell). EPIs are in every minimal SOP;
redundant PIs never are; selective PIs are a cost decision.
:::

## Several minimal covers and cyclic functions

:::intuition{#cyclic-intuition title="A ring of rugs" depth="standard"}
Sometimes no spot is forced: every 1-cell lies under two maximal rugs, and the rugs form a ring, each
overlapping its two neighbours. Then you must simply start somewhere. Taking every other rug around the
ring covers everything; starting one rug later gives a different, equally cheap answer.
:::

:::definition{#multiple-covers term="The minimal SOP need not be unique" depth="standard"}
After the EPIs are chosen, the remaining 1s may be coverable in several equally cheap ways. Each
choice is a **different minimal SOP of the same function**. Only the canonical forms are unique
(Chapter 2, Lesson 4). GATE 2026 asks which of four expressions are minimal SOPs of one function; two
of them are.
:::

:::definition{#cyclic term="Cyclic functions" depth="standard"}
A function whose PI list has **no essential PI** is called **cyclic**: every 1 is covered by at least two
PIs, and the PIs typically form a ring. The classic examples are $\Sigma(1, 2, 3, 4, 5, 6)$ over three
variables (six pair-PIs) and $\Sigma(0, 1, 5, 8, 12, 13)$ over four.
:::

:::definition{#branching term="Branching: how to minimise a cyclic function" depth="standard"}
With no EPI to start from, **pick** one PI (a branch), take it as if it were essential, remove the 1s it
covers, and continue (new EPIs may appear). Repeat with a different first choice and keep the
cheapest result. For small maps, "every other pair around the ring" is the branch that works.
:::

:::viz{#cyclic-viz spec="cyclic-map" mode="animate" depth="standard"}
:::

:::trap{#trap-unique title="'The' minimal SOP" depth="quick"}
Writing "the minimal SOP is ..." and marking every other minimal form wrong is a classic slip (one
reference set even states that the minimal SOP is always unique; it is not). When a question offers
several options, check each one for both **equality** and **cost**: more than one can be right.
:::

### Worked examples: minimal covers

::::example{#ex-cover-epis level="easy" title="When the EPIs cover everything" depth="quick"}
Find the minimal SOP of $f = \Sigma m(0, 2, 5, 7, 8, 10, 13, 15)$.

:::step{why="The four corners form B′D′; the centre block m5, m7, m13, m15 forms BD."}
PIs: $B'D'$ and $BD$ (no other loop is maximal).
:::

:::step{why="Every corner lies only in B′D′, every centre cell only in BD: both are essential."}
EPIs: $B'D'$, $BD$; they cover all eight 1s.
:::

:::answer
$f = B'D' + BD$, unique.
:::
::::

::::example{#ex-cover-one-more level="medium" title="EPIs plus one more prime implicant" depth="standard"}
Find the minimal SOP of $f = \Sigma m(1, 3, 6, 7, 10, 12, 13, 14)$.

:::step{why="List all prime implicants first (step 1 of the method): every 1 has only pairs available."}
PIs: $A'B'D$, $A'CD$, $A'BC$, $BCD'$, $ACD'$, $ABC'$, $ABD'$.
:::

:::step{why="Distinguished cells: m1 lies only in A′B′D; m10 only in ACD′; m13 only in ABC′."}
EPIs: $A'B'D$, $ACD'$, $ABC'$.
:::

:::step{why="They cover 1, 3, 10, 14, 12, 13. Still uncovered: m6 and m7."}
Remaining PIs through them: $A'BC$ (both), $A'CD$ (only $m_7$), $BCD'$ (only $m_6$).
:::

:::step{why="One 3-literal term beats two."}
Choose $A'BC$.
:::

:::answer
$f = A'B'D + ACD' + ABC' + A'BC$ (12 literals); $ABD'$ is redundant.
:::
::::

::::example{#ex-cover-two level="gate" title="Two minimal SOPs (the GATE 2026 pattern)" depth="standard"}
$f = \Sigma m(0, 2, 3, 5, 7, 10, 14)$. Which of (i) $A'B'D' + A'CD + A'BD + ACD'$ and
(ii) $A'B'D' + A'B'C + A'BD + ACD'$ are minimal SOPs?

:::step{why="Distinguished cells: m0 lies only in A′B′D′, m5 only in A′BD, m14 only in ACD′."}
EPIs: $A'B'D'$, $A'BD$, $ACD'$.
:::

:::step{why="They cover 0, 2, 5, 7, 10, 14. Only m3 is left, and it lies in two PIs of 3 literals: A′CD and A′B′C."}
Either finishes the cover at equal cost.
:::

:::step{why="Check equality of each option by its minterm list: both give Σ(0, 2, 3, 5, 7, 10, 14)."}
Both are equal to $f$ and both cost 12 literals.
:::

:::answer
Both (i) and (ii) are minimal SOPs.
:::
::::

::::example{#ex-cover-cyclic level="gate" title="Edge case: a cyclic 3-variable function" depth="standard"}
Find all minimal SOPs of $f(A, B, C) = \Sigma m(1, 2, 3, 4, 5, 6)$.

:::step{why="Each 1 has exactly two neighbouring 1s; the six pairs form a ring and every 1 is in two of them."}
PIs: $A'C$, $A'B$, $BC'$, $AC'$, $AB'$, $B'C$; EPIs: none.
:::

:::step{why="Branch: choose A′C; then m2 and m6 need BC′ (or A′B plus another term), and m4, m5 need AB′."}
$A'C + BC' + AB'$.
:::

:::step{why="The other branch: choose A′B first; then B′C and AC′ finish it."}
$A'B + B'C + AC'$.
:::

:::answer
Two minimal SOPs, each 3 terms and 6 literals: $A'C + BC' + AB'$ and $A'B + B'C + AC'$.
:::
::::

:::note{#recap-covers title="Recap" depth="quick"}
EPIs first, redundant PIs out, then the cheapest selective PIs; ties mean several minimal SOPs.
Cyclic functions have no EPI: branch on one PI and compare.
:::

## Don't-care conditions

:::intuition{#dc-intuition title="Rows that never happen" depth="standard"}
A BCD digit uses only the codes 0000–1001; the codes 1010–1111 never arrive at the circuit. Whatever
the circuit outputs for them does not matter. Such input combinations are **don't-cares**: we may set
the output to 0 or 1 at each one, independently, and we choose whichever makes the circuit cheaper.
:::

:::definition{#dont-care-def term="Don't-care conditions" depth="quick"}
An **incompletely specified** function gives an output (0 or 1) on some rows and leaves the others
unspecified. The unspecified rows are **don't-cares**, written $d(\dots)$, $\phi$ or X:
$f = \Sigma m(\text{1-rows}) + \Sigma d(\text{X-rows})$. With $k$ don't-cares the specification allows
$2^k$ completely specified functions; minimisation picks the cheapest one.
:::

:::definition{#dont-care-rules term="Rules for don't-cares on a map" depth="standard"}
1. An X **may** be included in a loop (as if it were 1) whenever that makes the loop bigger.
2. An X **need not** be covered: never add a loop just to cover an X.
3. Prime implicants are found with the Xs treated as 1s, but only those that contain at least one real
   1 are of any use; a PI is essential only through a real 1.
4. In the PI chart (Lesson 3) the columns are the 1s only, never the Xs.
:::

:::theorem{#dc-primes name="Prime implicants with don't-cares" depth="standard"}
Let $f$ have 1-set $M$ and don't-care set $D$. Then the minimal SOPs of $f$ (over all completions) are
exactly the minimal covers of $M$ by prime implicants of the function $M \cup D$ (all Xs set to 1),
using only those PIs that contain at least one cell of $M$. With literal cost, **every** minimal SOP
consists of such PIs.
:::

:::proof{#proof-dc-primes of="the don't-care PI theorem" depth="deep"}
**Idea first:** an implicant of some completion is a cube inside $M \cup D$, and such cubes are exactly
the implicants of the all-ones completion.

Any completion $g$ has $M \subseteq g \subseteq M \cup D$, so any implicant of $g$ lies inside $M \cup D$,
i.e. is an implicant of $h = M \cup D$. Conversely, a set of implicants of $h$ whose union contains $M$ is
an SOP of the completion $g$ = (their union), which satisfies $M \subseteq g \subseteq M \cup D$. So SOPs of
completions are exactly covers of $M$ by implicants of $h$, and by the prime implicant theorem
(applied to $h$) a cheapest such cover can use prime implicants of $h$ only; a PI with no cell of $M$
covers nothing that is needed, so it is never in a minimal cover. Finally, a non-prime term can always be
replaced by a prime implicant containing it with strictly fewer literals, so a cover with a non-prime term
is never minimal: every minimal SOP uses prime implicants only.
:::

:::viz{#dc-viz spec="dont-care-toggle" mode="animate" depth="standard"}
:::

:::trick{#trick-dc-last title="Loop the 1s, then ask what each X could do" depth="standard"}
First draw the loops you would draw without any X. Then, for each loop, ask: "would including a
neighbouring X let this loop double?" Include it only if the answer is yes.

**Why it works:** an X helps only by enlarging a loop (fewer literals) or by merging two loops into one
(fewer terms). **When it fails:** occasionally an X lets two separate loops become one big loop that
you would not have drawn at all; if your result has many terms, look for such a merge before
finishing. Example: for $f(A, B, C, D) = \Sigma m(0, 5) + d(1, 4)$ the two 1s are not even adjacent, so a
loop-by-loop habit gives two separate minterms, yet with both Xs the cells 0, 1, 4, 5 form the single quad
$A'C'$.
:::

:::trap{#trap-dc-cover title="Covering an X on purpose" depth="quick"}
Never spend a term on don't-cares alone: in GATE 2018 the quad $P\overline{S}$ is made only of Xs and is
useless. The opposite slip is to use the Xs too little: GATE 2014 (Σ 0, 2, 5, 7, 8, 10, 13, 15 with 2, 7, 8,
13 as don't-cares) offers options that loop each real 1 with a single X into a pair (four 3-literal terms),
while the Xs can double those pairs into two quads, $Q'S' + QS$ (4 literals).
:::

:::definition{#dc-sop-pos term="SOP and POS use the don't-cares independently" depth="standard"}
The minimal SOP chooses values for the Xs (those inside its loops become 1, the rest 0); the minimal POS
makes its own choice (Xs inside its 0-loops become 0). The two minimal forms therefore **agree on every
specified row but may disagree on don't-care rows**: they can be different functions. That is
allowed; each is a correct implementation of the specification. Do not "check" a POS by multiplying it
out and comparing it to the SOP on the X rows.
:::

:::derivation{#dc-count of="the number of functions a specification allows" depth="quick"}
Each don't-care row may independently be 0 or 1, so a specification with $k$ don't-cares stands for
$2^k$ completely specified functions. **Example:** BCD-input functions have 6 don't-cares (codes
10–15), so each output column admits $2^6 = 64$ completions. **Sanity check:** $k = 0$ gives one function.
:::

### Worked examples: don't-cares

::::example{#ex-dc-easy level="easy" title="An X that helps and an X that does not" depth="quick"}
Minimise $f = \Sigma m(1, 3, 7, 11, 15) + d(0, 5)$.

:::step{why="Column CD = 11 (m3, m7, m15, m11) is all 1s: CD."}
Quad $CD$.
:::

:::step{why="m1 is left. Using X5, m1, m3, m5, m7 form the quad A′D (2 literals) instead of the pair A′B′D (3 literals)."}
Quad $A'D$ (X5 taken as 1).
:::

:::step{why="X0 would not enlarge either loop, so it is left as 0."}
X0 unused.
:::

:::answer
$f = A'D + CD$ (4 literals; without don't-cares it would be $CD + A'B'D$, 5 literals).
:::
::::

::::example{#ex-dc-leave level="medium" title="Most Xs used, one left out" depth="standard"}
Minimise $f = \Sigma m(4, 5, 6, 7, 12, 13) + d(3, 14, 15)$.

:::step{why="Rows AB = 01 and 11 hold 4, 5, 6, 7, 12, 13 as 1s and 14, 15 as Xs: with the Xs, the two rows are an octet."}
Octet $B$ (X14, X15 taken as 1).
:::

:::step{why="X3 sits in row AB = 00 next to m7; using it would need a new loop (A′CD) and covers no new 1."}
X3 left as 0.
:::

:::answer
$f = B$: one literal. The specification allowed $2^3 = 8$ functions; the cheapest is $B$.
:::
::::

::::example{#ex-dc-pos level="gate" title="A minimal POS with don't-cares" depth="standard"}
Find the minimal SOP and POS of $f = \Sigma m(0, 1, 2, 3, 6, 7, 8, 10) + d(4, 11, 14)$.

:::step{why="SOP: m0–m3 form A′B′; the corners give B′D′; m6, m7 with m2, m3 give A′C. The Xs 4, 11, 14 do not help."}
Minimal SOP: $A'B' + B'D' + A'C$ (6 literals).
:::

:::step{why="POS: the 0s are 5, 9, 12, 13, 15. With X4: m5 joins m4, m12, m13 in the quad BC′ of 0-cells (B = 1, C = 0 → factor B′ + C)."}
Factor $(B' + C)$.
:::

:::step{why="m9, m13, m15 with X11: the quad A = 1, D = 1 (m9, m11, m13, m15) → factor (A′ + D′)."}
Factor $(A' + D')$.
:::

:::answer
POS: $(B' + C)(A' + D')$ with 4 literals, cheaper than the 6-literal SOP. The POS sets X4 and X11 to 0 and
X14 to 1; the SOP sets all three to 0.
:::
::::

::::example{#ex-dc-differ level="gate" title="Edge case: SOP and POS disagree on a don't-care" depth="standard"}
For $f(A, B, C) = \Sigma m(1, 2, 4, 5, 6) + d(7)$, find the minimal SOP and POS and compare them on row 7.

:::step{why="SOP: row A = 1 (m4, m5, m6, X7) is a quad A if X7 = 1; then m1 needs B′C and m2 needs BC′."}
SOP: $A + B'C + BC'$, which is 1 on row 7.
:::

:::step{why="POS: the 0s are m0 and m3. m0 alone or with X? Its neighbours 1, 2, 4 are 1s: factor (A + B + C). m3's neighbour X7 helps: m3, X7 give (B′ + C′)."}
POS: $(A + B + C)(B' + C')$, which is 0 on row 7.
:::

:::answer
Both are minimal and both meet the specification, yet they differ on row 7: the SOP is
$\Sigma(1, 2, 4, 5, 6, 7)$, the POS is $\Sigma(1, 2, 4, 5, 6)$. Each minimal form made its own choice for X7.
:::
::::

:::note{#recap-dc title="Recap" depth="quick"}
Xs may join loops when that enlarges them and are never covered for their own sake. PIs use the Xs, but
essentialness and the chart use only the 1s. SOP and POS choose the Xs independently. $k$ Xs allow $2^k$
functions.
:::

## Try it: prime implicants in the K-map Solver

Load the "GATE 2018" preset to see a function with don't-cares and three essential prime implicants, or
the "Cyclic" preset for a function with none. Click a prime implicant in the list to see only its loop.

:::lab{#lab-pis lab="kmap-solver" tab="map" depth="standard"}
:::

## GATE questions on this lesson

All fourteen previous-year questions. Try each before opening the solution.

:::pyq{id="cse-1997-a-36" tests="implicant-def,pi-def,term-ladder" depth="standard"}
:::

:::pyq{id="cse-2004-cs-59" tests="epi-def,list-pis" depth="standard"}
:::

:::pyq{id="it-2006-cs-35" tests="epi-def,list-pis,distinguished" depth="standard"}
:::

:::pyq{id="cse-2015-3-cs-43" tests="list-pis,pi-def,trap-pi-vs-chosen" depth="standard"}
:::

:::pyq{id="cse-2018-cs-49" tests="epi-def,trap-epi-dc,dont-care-rules" depth="standard"}
:::

:::pyq{id="cse-1991-b-5-b" tests="dont-care-rules,cover-method" depth="standard"}
:::

:::pyq{id="cse-1999-a-8" tests="dont-care-rules,cover-method" depth="standard"}
:::

:::pyq{id="cse-2001-a-11" tests="dont-care-rules,multiple-covers" depth="standard"}
:::

:::pyq{id="cse-2002-a-12" tests="dont-care-rules,cover-method" depth="standard"}
:::

:::pyq{id="cse-2008-cs-5" tests="dont-care-rules,cover-method" depth="standard"}
:::

:::pyq{id="cse-2012-cs-30" tests="dont-care-rules,cover-method" depth="standard"}
:::

:::pyq{id="cse-2014-3-cs-7" tests="dont-care-rules,trap-dc-cover" depth="standard"}
:::

:::pyq{id="cse-2017-2-cs-28" tests="dc-sop-pos,dont-care-rules" depth="standard"}
:::

:::pyq{id="cse-2026-1-cs-38" tests="multiple-covers,cover-method,trap-unique" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dl-03-02-q01" depth="standard"}
:::

:::practice{id="nx-dl-03-02-q02" depth="standard"}
:::

:::practice{id="nx-dl-03-02-q03" depth="standard"}
:::

:::practice{id="nx-dl-03-02-q04" depth="standard"}
:::

:::practice{id="nx-dl-03-02-q05" depth="standard"}
:::

:::practice{id="nx-dl-03-02-q06" depth="standard"}
:::

:::practice{id="nx-dl-03-02-q07" depth="standard"}
:::

:::practice{id="nx-dl-03-02-q08" depth="standard"}
:::

:::practice{id="nx-dl-03-02-q09" depth="standard"}
:::

:::practice{id="nx-dl-03-02-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Prime implicants and don't-cares on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Implicant | a product term whose cells are all 1s (or Xs): $p \le f$ |
| Prime implicant | an implicant that cannot be enlarged (no literal can be dropped) |
| PIs suffice | some minimal SOP uses prime implicants only |
| Essential PI | the only PI through some **1**-cell; in every minimal SOP |
| Redundant / selective | redundant: all its 1s covered by EPIs; selective: needed or not by cost |
| Method | list PIs → take EPIs → drop redundant → cheapest selective cover; ties = several minimal SOPs |
| Cyclic | no EPI at all (e.g. Σ(1, 2, 3, 4, 5, 6)); branch on one PI |
| Don't-cares | include an X only to enlarge a loop; never cover X for itself; $k$ Xs → $2^k$ functions |
| SOP vs POS | each uses the Xs its own way; they agree on specified rows only |
:::

:::note{#further-depth title="Further depth: how many prime implicants can a function have?" depth="deep"}
A search over all 256 functions of three variables finds at most 6 prime implicants (reached by the
cyclic $\Sigma(1, 2, 3, 4, 5, 6)$), and a search over all 65 536 functions of four variables finds at most
13 (reached, for example, by $\Sigma(0, 2, 3, 4, 5, 7, 8, 9, 11, 13, 14)$). The maximum keeps growing
exponentially with $n$, and so does the number of covers to compare, which is why exact minimisation
is hard for large functions and why design tools switch to heuristics for many inputs. For GATE-sized
maps, listing prime implicants by hand stays easy.
:::
