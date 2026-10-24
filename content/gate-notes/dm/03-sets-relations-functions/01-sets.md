---
id: sets
subject: dm
chapter: sets-relations-functions
title: Sets, set operations and identities
order: 1
prerequisites: [propositions-connectives, equivalence-normal-forms]
pyq_topics: [dm/sets, dm/combinatorics]
est_minutes: 60
difficulty: basic
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every membership claim, power-set size, identity, region list, count, PYQ key and practice answer is recomputed in content/gate-notes/_checks/dm/l3_01_sets.py with setlib.py and rellib.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 44–46, set B pp. 178–183, set C pp. 329–345, set D pp. 682–686, set E pp. 730–772."
  - "Facts checked against standard textbooks: K. H. Rosen, Discrete Mathematics and its Applications (sets, operations, identities, membership tables, bit strings); C. L. Liu, Elements of Discrete Mathematics; P. R. Halmos, Naive Set Theory."
  - "PYQs: src/gate/questions.json (dm/sets, dm/combinatorics); all fourteen keys are re-derived in l3_01_sets.py. GATE 2000 (P(S) ∩ P(P(S)) = {∅}) holds only when no element of S is also a subset of S; the lesson and the solution say so."
updated: "2026-10-24"
---

Logic gave us statements that are true or false. Sets give us the things those statements are
about: a set is simply a collection, and the only question you may ask a set is "is this object one
of your elements?". Everything in this lesson, from power sets to the identities GATE asks you to
simplify, is built on that single question. The pay-off is large: because "is $x$ in $A \cup B$?" is
answered by an **or**, and "is $x$ in $A \cap B$?" by an **and**, every law of propositional logic from
the last chapter turns into a law about sets, and every set identity can be checked with a truth table.

Three things cost marks here year after year. The first is the difference between **being an element**
($\in$) and **being a subset** ($\subseteq$), which becomes slippery the moment the elements are
themselves sets ($\emptyset$ against $\{\emptyset\}$). The second is comparing two complicated set
expressions under time pressure; we learn three methods (element chasing, membership tables and Venn
regions) and when each is fastest. The third is counting pairs of sets such as "$A \subseteq B$", which
looks hard and is a one-line argument once you think **one element at a time**.

## Where this fits

This lesson opens the chapter on sets, relations and functions. It leans on
[Lesson 1 of propositional logic](lesson:propositions-connectives) (the connectives $\wedge$, $\vee$,
$\neg$, $\oplus$ and their truth tables) and on [the laws of equivalence](lesson:equivalence-normal-forms),
which we will translate one for one into set identities. The quantifier language of
[Chapter 2](lesson:predicates-quantifiers) is how subset and equality are defined. Everything after this
builds on sets: Lesson 2 (relations) defines a relation as a subset of a Cartesian product, Lesson 3
(equivalence relations) splits a set into blocks, Lesson 4 (functions) counts maps between sets, and the
counting chapter generalises the per-element argument and the union formula of this lesson. In Digital
Logic the bit-vector view of sets is exactly bitwise AND, OR and XOR.

:::table{#radar title="GATE radar: sets, set operations and identities" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 14 (1993–2021) |
| Marks | 7 one-mark (one NAT), 6 two-mark (one NAT), 1 descriptive proof |
| Pattern 1 | Power sets: their size, power sets of sets whose elements are sets, $\in$ against $\subseteq$: 1993, 1995, 2000, 2001, 2015 (two papers) |
| Pattern 2 | Simplify or compare two set expressions in $A, B, C$ (equal, $\subset$, $\supset$): 1996, 2005, 2006, 2008, 2015 |
| Pattern 3 | Symmetric difference: which identities hold, and a bit-array program that computes it: 2006 (two papers) |
| Pattern 4 | Count pairs of subsets with a condition ($A \subseteq B$): 2021 |
| What examiners test | That $\emptyset \in P(S)$ and $\emptyset \subseteq P(S)$ are both true; that $\{x\} \subseteq S$ means $x \in S$; that $\lvert P(A \times A) \rvert = 2^{n^2}$, not $(2^n)^2$; that two expressions are equal exactly when they cover the same Venn regions; and that each element of $S$ chooses its status independently ($3^n$) |
:::

## The idea: a set only answers one question

:::intuition{#bag-intuition title="A set is a guest list, not a queue" depth="standard"}
Think of a set as the guest list for a party. The only thing the list can tell you is whether a given
person is invited. It does not record an order (the list "Asha, Ben" invites the same people as "Ben,
Asha"), and writing a name twice does not invite that person twice. Two lists are **the same list** if
they invite exactly the same people, however they were written.

Now let one of the "guests" be a whole family, written as a group. The list $\{\text{Asha}, \{\text{Ben},
\text{Chitra}\}\}$ has **two** entries: Asha, and the family. Ben by himself is not on it; he is inside
one of the entries. Keeping track of these levels is the whole difficulty of the topic: a set is a box,
its elements are the things directly inside the box, and an element may itself be a box with its own
contents.
:::

:::definition{#set-def term="Set, element, roster and set-builder notation" depth="quick"}
A **set** is a collection of distinct objects, its **elements** (or members). We write $x \in A$ for "$x$
is an element of $A$" and $x \notin A$ for its negation. A set is described either by

- **roster**: listing its elements between braces, $A = \{2, 3, 5, 7\}$; or
- **set-builder**: a property its elements satisfy, $A = \{x \in \mathbb{N} : x \text{ is prime and } x < 10\}$.

Order and repetition in a roster do not matter: $\{1, 2, 2, 3\} = \{3, 1, 2\}$. Elements may be any
objects, including numbers, pairs and other sets: $\{1, \{1\}, \{1, 2\}\}$ has three elements. The
**cardinality** $|A|$ of a finite set is its number of distinct elements.
:::

:::definition{#special-sets term="The empty set, singletons and the universe" depth="quick"}
- The **empty set** $\emptyset = \{\}$ has no elements: $x \in \emptyset$ is false for every $x$; $|\emptyset| = 0$.
- A **singleton** has exactly one element, e.g. $\{7\}$ or $\{\emptyset\}$.
- A **universal set** $U$ is the set of all objects under discussion in a problem; complements are taken
  inside it. It changes from problem to problem.
- Standard sets: $\mathbb{N}$ (natural numbers), $\mathbb{Z}$ (integers), $\mathbb{Q}$ (rationals),
  $\mathbb{R}$ (reals). Whether $0 \in \mathbb{N}$ varies by book; GATE questions say so when it matters.
:::

:::trap{#trap-empty-vs-singleton title="∅ is not {∅}" depth="quick"}
$\emptyset$ is an empty box. $\{\emptyset\}$ is a box **containing** an empty box, so it has one element:
$|\emptyset| = 0$ but $|\{\emptyset\}| = 1$. Likewise $\{\emptyset, \{\emptyset\}\}$ has two elements. The
expected wrong answer is to count braces "inside" an element as extra elements, or to treat $\{\emptyset\}$
as if it were empty. Count only what sits **directly** inside the outermost braces.
:::

:::definition{#subset-def term="Subset, proper subset, superset, equality" depth="quick"}
$A$ is a **subset** of $B$, written $A \subseteq B$, when every element of $A$ is an element of $B$:
$$A \subseteq B \iff \forall x\,(x \in A \to x \in B).$$
$A$ is a **proper subset**, $A \subset B$ (also written $A \subsetneq B$), when $A \subseteq B$ and $A \neq B$. $B \supseteq A$
("superset") means $A \subseteq B$. Two sets are **equal** when they have the same elements:
$A = B \iff \forall x\,(x \in A \leftrightarrow x \in B)$.

Some books write $\subset$ for "subset, possibly equal". GATE options such as "$X \subset Y$" are meant
as **proper** subset whenever "$X = Y$" is offered as a separate option.
:::

:::theorem{#equality-theorem name="Equality is mutual inclusion; ∅ is a subset of everything" depth="standard"}
1. $A = B$ if and only if $A \subseteq B$ and $B \subseteq A$.
2. For every set $A$: $\emptyset \subseteq A$ and $A \subseteq A$.
3. There is only one empty set.
4. $\subseteq$ is transitive: $A \subseteq B$ and $B \subseteq C$ give $A \subseteq C$.
:::

:::proof{#proof-equality of="mutual inclusion and the empty set" depth="standard"}
**Idea first:** each claim is a law of logic about the conditional $x \in A \to x \in B$.

1. $x \in A \leftrightarrow x \in B$ is equivalent to $(x \in A \to x \in B) \wedge (x \in B \to x \in A)$
   (the biconditional law). A "for all $x$" of a conjunction is the conjunction of the two "for all"
   statements, which are $A \subseteq B$ and $B \subseteq A$.
2. $\emptyset \subseteq A$ means: for every $x$, $x \in \emptyset \to x \in A$. The hypothesis $x \in \emptyset$
   is false for every $x$, so each conditional is **vacuously true**. $A \subseteq A$ holds because
   $x \in A \to x \in A$ is a tautology.
3. If $E_1$ and $E_2$ are both empty, part 2 gives $E_1 \subseteq E_2$ and $E_2 \subseteq E_1$, so
   $E_1 = E_2$ by part 1.
4. Take $x \in A$. Then $x \in B$ (since $A \subseteq B$), so $x \in C$ (since $B \subseteq C$).
:::

:::trap{#trap-subset-of-empty title="Vacuous truth: ∅ ⊆ ∅, and only ∅ ⊆ ∅" depth="quick"}
Students who accept "$\emptyset \subseteq A$" sometimes balk at "$\emptyset \subseteq \emptyset$": it is true
(part 2 with $A = \emptyset$). But $\emptyset \in \emptyset$ is **false**: the empty set has no elements at all,
not even itself. The only subset of $\emptyset$ is $\emptyset$, so $P(\emptyset) = \{\emptyset\}$ has one element.
:::

## Membership versus subset

:::intuition{#levels-intuition title="∈ looks one level down; ⊆ compares contents" depth="standard"}
Picture each set as a box. "$X \in S$" asks: **is the object $X$ one of the things lying directly in box
$S$?** You compare $X$ with each item in $S$ as a whole. "$X \subseteq S$" asks a different question:
**open box $X$, take out each item, and check that each one also lies directly in $S$.** So $\in$ uses
$X$ as a single object, while $\subseteq$ unpacks $X$ first.

That gives a mechanical test that never fails. To decide $X \in S$, look for $X$, braces and all, in the
roster of $S$. To decide $X \subseteq S$, **remove the outer braces of $X$** and check that every item
left is in the roster of $S$. With nested sets the two answers are independent: an object can be an
element without being a subset, a subset without being an element, both, or neither.
:::

:::viz{#nesting-viz spec="sets-nesting" mode="animate" depth="standard"}
:::

:::theorem{#member-subset-bridge name="The bridge between ∈ and ⊆" depth="standard"}
For every object $x$ and sets $A$, $S$:

1. $x \in S \iff \{x\} \subseteq S$.
2. If $x \in A$ and $A \subseteq S$, then $x \in S$.
3. $X \subseteq S \iff X \in P(S)$, where $P(S)$ is the set of all subsets of $S$ (next section).

But $\in$ is **not** transitive: $x \in A$ and $A \in S$ do **not** give $x \in S$.
:::

:::proof{#proof-bridge of="the bridge" depth="standard"}
**Idea first:** a singleton has exactly one item to unpack.

1. $\{x\} \subseteq S$ says every element of $\{x\}$ lies in $S$. The only element of $\{x\}$ is $x$, so
   this says exactly $x \in S$.
2. This is the definition of $A \subseteq S$ applied to the particular element $x$.
3. $P(S)$ is defined as $\{X : X \subseteq S\}$, so membership in it is the subset condition.

For the failure of transitivity take $x = 1$, $A = \{1\}$, $S = \{\{1\}\}$: $1 \in \{1\}$ and
$\{1\} \in \{\{1\}\}$, but the only element of $S$ is the set $\{1\}$, and $1 \ne \{1\}$, so $1 \notin S$.
:::

:::trick{#trick-strip-braces title="Strip one pair of braces for ⊆" depth="standard"}
For "$X \in S$?": scan the roster of $S$ for $X$ exactly. For "$X \subseteq S$?": delete the outer
braces of $X$ and ask "$\in S$?" of every item that remains. For example, with $S = \{5, \{6\}\}$:
$\{6\} \in S$ (it is listed), $\{6\} \subseteq S$ is false (unpacking gives $6$, which is not listed),
$\{\{6\}\} \subseteq S$ is true (unpacking gives $\{6\}$, which is listed).

**Why it works:** it is the definition of $\subseteq$ together with part 1 of the bridge theorem.
**When it fails:** when $S$ is given by a property instead of a roster (then check the property), and
when the roster hides equal elements ($\{1, \{1\}, 1\}$ has two elements, not three).
:::

:::trap{#trap-member-transitive title="Elements of elements are not elements" depth="quick"}
From $5 \in \{5\}$ and $\{5\} \in A$ it is tempting to conclude $5 \in A$. That is the chain rule for
$\subseteq$ wrongly applied to $\in$. If $A = \{\{5\}, 7\}$, then $5 \notin A$: $A$'s elements are the set
$\{5\}$ and the number $7$. The safe chain is "$\in$ then $\subseteq$": $x \in A \subseteq S$ gives $x \in S$.
:::

:::note{#recap-membership title="Recap" depth="quick"}
A set is determined by its elements (order and repeats ignored). $\emptyset$ has no elements and is a
subset of every set; $\{\emptyset\}$ has one element. $X \in S$: is $X$ listed in $S$? $X \subseteq S$: is
every item inside $X$ listed in $S$? $x \in S \iff \{x\} \subseteq S$, and $\in$ is not transitive.
:::

### Worked examples: membership and subset

::::example{#ex-mem-easy level="easy" title="Counting elements of a nested set" depth="quick"}
How many elements does $T = \{1, \{1\}, \{1, \{1\}\}, \emptyset, \{1\}\}$ have?

:::step{why="Only the items directly inside the outer braces are elements; list them one by one."}
The items are $1$, $\{1\}$, $\{1, \{1\}\}$, $\emptyset$ and $\{1\}$ again.
:::

:::step{why="Repetition does not count: the two copies of {1} are the same element."}
Distinct elements: $1$, $\{1\}$, $\{1, \{1\}\}$, $\emptyset$.
:::

:::step{why="Do not open the inner sets: the 1 inside {1, {1}} is not a separate element of T."}
Each of the four is one object, whatever it contains.
:::

:::answer
$|T| = 4$. (The empty set counts as an element here, because it is listed.)
:::
::::

::::example{#ex-mem-medium level="medium" title="Six questions about S = {∅, {∅}}" depth="standard"}
Let $S = \{\emptyset, \{\emptyset\}\}$. Decide each: (i) $\emptyset \in S$, (ii) $\emptyset \subseteq S$,
(iii) $\{\emptyset\} \in S$, (iv) $\{\emptyset\} \subseteq S$, (v) $\{\{\emptyset\}\} \subseteq S$,
(vi) $\{\{\emptyset\}\} \in S$.

:::step{why="For ∈, look for the object itself in the roster of S. The roster is: ∅, {∅}."}
(i) $\emptyset$ is listed: **true**. (iii) $\{\emptyset\}$ is listed: **true**. (vi) $\{\{\emptyset\}\}$ is not
listed: **false**.
:::

:::step{why="The empty set is a subset of every set (vacuous truth); no unpacking is needed."}
(ii) **true**.
:::

:::step{why="For ⊆, strip the outer braces and test each item for ∈ S."}
(iv) $\{\emptyset\}$ unpacks to $\emptyset$, which is in $S$: **true**. (v) $\{\{\emptyset\}\}$ unpacks to
$\{\emptyset\}$, which is in $S$: **true**.
:::

:::answer
True: (i)–(v); false: (vi). Here $\{\emptyset\}$ is both an element and a subset of $S$, which shows that the
two relations are independent questions.
:::
::::

::::example{#ex-mem-gate level="gate" title="Elements and subsets of a power set (GATE 2015 style)" depth="standard"}
Let $A = \{a, \{b\}, \{c\}\}$ and let $2^A$ be its power set (the set of all subsets of $A$). Which are
true: (I) $\emptyset \in 2^A$, (II) $\emptyset \subseteq 2^A$, (III) $\{a, \{b\}\} \in 2^A$,
(IV) $\{a, \{b\}\} \subseteq 2^A$?

:::step{why="By the bridge theorem, X ∈ 2^A means X ⊆ A. And ∅ ⊆ A always."}
(I) $\emptyset \subseteq A$, so $\emptyset \in 2^A$: **true**.
:::

:::step{why="The empty set is a subset of every set, including the set 2^A."}
(II) **true**.
:::

:::step{why="{a, {b}} ∈ 2^A asks whether {a, {b}} ⊆ A: unpack it to a and {b}, both listed in A."}
(III) **true**.
:::

:::step{why="{a, {b}} ⊆ 2^A asks whether a ∈ 2^A and {b} ∈ 2^A, i.e. whether a ⊆ A and {b} ⊆ A. a is not a set of elements of A (it is an element), and {b} ⊆ A would need b ∈ A, which fails."}
(IV) **false**: for instance $\{b\} \notin 2^A$, because $b \notin A$.
:::

:::answer
I, II and III are true; IV is false. Moving one level up (from $A$ to $2^A$) changes $\subseteq$ into
$\in$, which is exactly the shift the question tests.
:::
::::

::::example{#ex-mem-edge level="gate" title="Edge case: a chain of ∈ that breaks" depth="standard"}
Let $A = \{1, 2\}$, $B = \{A, 3\}$, $C = \{B\}$. Is $1 \in B$? Is $A \in C$? Is $A \subseteq B$? Is $\{A\} \subseteq B$?

:::step{why="Write B's roster with A expanded, to see its elements directly."}
$B = \{\{1, 2\}, 3\}$: its elements are the set $\{1, 2\}$ and the number $3$. So $1 \notin B$, even
though $1 \in A$ and $A \in B$.
:::

:::step{why="C's only element is B; A sits two levels down."}
$C = \{\{\{1, 2\}, 3\}\}$, so $A \notin C$.
:::

:::step{why="For A ⊆ B unpack A into 1 and 2 and test each for membership in B."}
$1 \notin B$, so $A \not\subseteq B$.
:::

:::step{why="For {A} ⊆ B unpack {A} into A, which is listed in B."}
$\{A\} \subseteq B$ is **true** (bridge theorem: $\{A\} \subseteq B \iff A \in B$).
:::

:::answer
$1 \notin B$, $A \notin C$, $A \not\subseteq B$, but $\{A\} \subseteq B$. Membership does not pass through
levels; only "$\in$ followed by $\subseteq$" chains.
:::
::::

## Power sets

:::intuition{#switch-intuition title="Every element is a switch: in or out" depth="standard"}
To build a subset of $\{a, b, c\}$ you walk past each element and decide: take it, or leave it. Three
independent yes/no decisions give $2 \times 2 \times 2 = 8$ subsets, from "leave everything" ($\emptyset$) to
"take everything" (the whole set). Writing 1 for "take" and 0 for "leave" turns each subset into a bit
string of length 3, and every bit string is one subset. Counting subsets is counting bit strings.

The same picture explains why adding one element **doubles** the count: every old subset survives
unchanged (new element out), and gets a twin with the new element added (new element in).
:::

:::definition{#powerset-def term="Power set" depth="quick"}
The **power set** of $S$ is the set of all subsets of $S$:
$$P(S) = 2^S = \{X : X \subseteq S\}.$$
It always contains $\emptyset$ and $S$ itself. Its elements are **sets**. Examples:
$P(\emptyset) = \{\emptyset\}$; $P(\{a\}) = \{\emptyset, \{a\}\}$;
$P(\{a, b\}) = \{\emptyset, \{a\}, \{b\}, \{a, b\}\}$.
:::

:::theorem{#powerset-size name="A set of n elements has 2ⁿ subsets" depth="standard"}
If $|S| = n$ then $|P(S)| = 2^n$. Of these, $2^n - 1$ are proper subsets, and exactly $\binom{n}{k}$
have $k$ elements, so $\sum_{k=0}^{n} \binom{n}{k} = 2^n$.
:::

:::proof{#proof-powerset-size of="the size of a power set" depth="standard"}
**Idea first:** subsets correspond one for one to bit strings.

*Bijection.* List $S = \{s_1, \dots, s_n\}$. Send a subset $X$ to the string $b_1 b_2 \dots b_n$ with
$b_i = 1$ if $s_i \in X$ and $0$ otherwise (its **characteristic vector**). Different subsets differ in
some element, so they get different strings; and every string comes from the subset of the positions
holding a 1. So subsets and length-$n$ bit strings are in bijection, and there are $2^n$ strings.

*Induction, the doubling view.* $P(\emptyset) = \{\emptyset\}$ has $1 = 2^0$ element. If $S' = S \cup \{t\}$ with
$t \notin S$, every subset of $S'$ either omits $t$ (it is a subset of $S$) or contains $t$ (it is
$X \cup \{t\}$ for exactly one $X \subseteq S$). So $|P(S')| = 2|P(S)|$.

*The rest.* Only $S$ itself is not proper, giving $2^n - 1$. A $k$-element subset is a choice of $k$
positions out of $n$, so there are $\binom{n}{k}$, and summing over $k$ counts every subset once.
:::

:::viz{#powerset-viz spec="sets-powerset-doubling" mode="animate" depth="standard"}
:::

:::derivation{#nested-powerset of="sizes of nested power sets and of P(A × A)" depth="standard"}
Apply $|P(X)| = 2^{|X|}$ to whatever set $X$ is, however its elements look.

- $|P(P(S))| = 2^{|P(S)|} = 2^{2^n}$, and $|P(P(P(S)))| = 2^{2^{2^n}}$.
- $P(\emptyset) = \{\emptyset\}$ (1 element), $P(P(\emptyset)) = \{\emptyset, \{\emptyset\}\}$ (2 elements),
  $P(P(P(\emptyset)))$ has $2^2 = 4$ elements: $\emptyset, \{\emptyset\}, \{\{\emptyset\}\}, \{\emptyset, \{\emptyset\}\}$.
- If $|A| = n$ then $|A \times A| = n^2$ (next section), so $|P(A \times A)| = 2^{n^2}$.

**Sanity check** with $n = 2$: $|P(P(S))| = 2^{2^2} = 16$ and $|P(A \times A)| = 2^{n^2} = 2^4 = 16$ as well,
because $2^n = n^2$ when $n = 2$ (and again when $n = 4$). At $n = 3$ they separate: $2^{8} = 256$ against
$2^{9} = 512$.
:::

:::trap{#trap-powerset-exponent title="(2ⁿ)², 2^(n²) and 2^(2ⁿ) are three different numbers" depth="quick"}
For $|A| = n$: $|P(A)|^2 = (2^n)^2 = 2^{2n}$ is the number of **pairs** of subsets; $|P(A \times A)| =
2^{n^2}$ is the number of subsets of the $n^2$ pairs (these are the relations on $A$, Lesson 2);
$|P(P(A))| = 2^{2^n}$. GATE 1993 offers all three. They coincide only for small $n$ ($n = 2$ makes the
last two equal), so test with $n = 3$: $64$, $512$, $256$.
:::

:::theorem{#powerset-meet name="Power sets turn ∩ into ∩, but ∪ only into ⊇" depth="standard"}
For all sets $A$, $B$:

1. $P(A \cap B) = P(A) \cap P(B)$.
2. $P(A) \cup P(B) \subseteq P(A \cup B)$, with equality if and only if $A \subseteq B$ or $B \subseteq A$.
3. $A \subseteq B \iff P(A) \subseteq P(B)$.
:::

:::proof{#proof-powerset-meet of="the power-set laws" depth="standard"}
**Idea first:** "$X \subseteq A \cap B$" splits into two conditions joined by **and**; "$X \subseteq A \cup B$"
does not split into an **or**.

1. For any set $X$: $X \in P(A \cap B) \iff X \subseteq A \cap B \iff (X \subseteq A \text{ and } X \subseteq B)
   \iff (X \in P(A) \text{ and } X \in P(B)) \iff X \in P(A) \cap P(B)$. The middle step holds because
   every element of $X$ must be in $A$ and in $B$. Equal membership conditions, so the sets are equal.
2. If $X \subseteq A$ then $X \subseteq A \cup B$; same for $B$; this is the inclusion. If $A \subseteq B$, then
   $A \cup B = B$ and $P(A) \subseteq P(B)$, so both sides are $P(B)$; symmetric if $B \subseteq A$. If neither
   holds, pick $a \in A - B$ and $b \in B - A$. Then $\{a, b\} \subseteq A \cup B$, but $\{a, b\} \not\subseteq A$
   (as $b \notin A$) and $\{a, b\} \not\subseteq B$ (as $a \notin B$), so equality fails.
3. If $A \subseteq B$, every subset of $A$ is a subset of $B$ (transitivity of $\subseteq$). Conversely,
   $A \in P(A) \subseteq P(B)$ gives $A \subseteq B$.
:::

:::theorem{#powerset-self name="What P(S) always contains, and P(S) ∩ P(P(S))" depth="standard"}
For every set $S$: $\emptyset \in P(S)$, $S \in P(S)$, and $\emptyset \subseteq P(S)$. Moreover
$$P(S) \cap P(P(S)) = P\big(S \cap P(S)\big),$$
so $P(S) \cap P(P(S)) = \{\emptyset\}$ **exactly when no element of $S$ is also a subset of $S$**. For a set of
plain objects such as $\{1, 2, 3\}$ the intersection is $\{\emptyset\}$; for $S = \{\emptyset\}$ it is
$\{\emptyset, \{\emptyset\}\}$.
:::

:::proof{#proof-powerset-self of="the self-intersection formula" depth="standard"}
**Idea first:** this is part 1 of the previous theorem with $B = P(S)$.

$\emptyset \subseteq S$ and $S \subseteq S$, so both are elements of $P(S)$; $\emptyset \subseteq P(S)$ as for any set.
Part 1 with $A = S$, $B = P(S)$ gives $P(S) \cap P(P(S)) = P(S \cap P(S))$. Now $S \cap P(S)$ is the set of
objects that are elements of $S$ **and** subsets of $S$. If there are none, the right side is
$P(\emptyset) = \{\emptyset\}$; if there is at least one such object $y$, then $\{y\}$ is a second element
of the intersection, so it is not $\{\emptyset\}$. For $S = \{\emptyset\}$: $\emptyset \in S$ and
$\emptyset \subseteq S$, so $S \cap P(S) = \{\emptyset\}$ and the intersection is $P(\{\emptyset\}) = \{\emptyset, \{\emptyset\}\}$.
:::

:::trap{#trap-always-true title="'Always true' needs every S, including strange ones" depth="quick"}
GATE 2000 asks which statement about $P(S)$ is **always** true and keys $P(S) \cap P(P(S)) = \{\emptyset\}$.
That statement is true for every set whose elements are not themselves subsets of it (all sets of
numbers, letters, people), and it is the only option that can be true at all; but it fails for
$S = \{\emptyset\}$. In the exam, mark the intended option; in your notes, remember the precise condition.
The other options fail for every finite $S$: $S \in P(S)$ always (so "$S \notin P(S)$" is false), and
$|S| < |P(S)| < |P(P(S))|$ (since $n < 2^n$), so $P(P(S)) = P(S)$ and $P(S) \cap S = P(S)$ (which would need
$P(S) \subseteq S$) are impossible.
:::

:::note{#recap-powerset title="Recap" depth="quick"}
$|P(S)| = 2^{|S|}$ whatever the elements look like; adding an element doubles the count. $P(P(S))$ has
$2^{2^n}$ elements and $P(A \times A)$ has $2^{n^2}$. $\emptyset$ and $S$ are always in $P(S)$.
$P(A \cap B) = P(A) \cap P(B)$ always; $P(A \cup B) = P(A) \cup P(B)$ only when one set contains the other.
:::

### Worked examples: power sets

::::example{#ex-ps-easy level="easy" title="Listing a power set" depth="quick"}
List $P(\{x, y, z\})$. How many of its elements have exactly two elements, and how many are proper
subsets?

:::step{why="Go through the sizes 0, 1, 2, 3 so that nothing is missed; each size k gives C(3, k) subsets."}
Size 0: $\emptyset$. Size 1: $\{x\}, \{y\}, \{z\}$. Size 2: $\{x, y\}, \{x, z\}, \{y, z\}$. Size 3: $\{x, y, z\}$.
:::

:::step{why="Check the total against the theorem: 1 + 3 + 3 + 1 = 8 = 2³."}
Eight subsets in all.
:::

:::step{why="A proper subset is any subset except the set itself."}
Two-element subsets: $\binom{3}{2} = 3$. Proper subsets: $8 - 1 = 7$.
:::

:::answer
$P(\{x, y, z\})$ has 8 elements; 3 of them have two elements, and 7 are proper subsets (including $\emptyset$).
:::
::::

::::example{#ex-ps-medium level="medium" title="A power set of a set of sets" depth="standard"}
Let $S = \{\emptyset, \{1, 2\}, 3, \{3\}\}$. Find $|P(S)|$, and decide whether $\{\emptyset\}$, $\{1\}$ and
$\{3, \{3\}\}$ are elements of $P(S)$.

:::step{why="The size of a power set depends only on the number of elements of S; count the items directly inside the outer braces."}
$S$ has four elements: $\emptyset$, $\{1, 2\}$, $3$, $\{3\}$. So $|P(S)| = 2^4 = 16$.
:::

:::step{why="X ∈ P(S) means X ⊆ S: strip the braces of X and check each item is listed in S."}
$\{\emptyset\}$ unpacks to $\emptyset$, which is listed: $\{\emptyset\} \in P(S)$.
:::

:::step{why="Same test: {1} unpacks to 1, and the number 1 is not an element of S (it sits inside {1, 2})."}
$\{1\} \notin P(S)$.
:::

:::step{why="{3, {3}} unpacks to 3 and {3}; both are listed."}
$\{3, \{3\}\} \in P(S)$.
:::

:::answer
$|P(S)| = 16$; $\{\emptyset\} \in P(S)$, $\{1\} \notin P(S)$, $\{3, \{3\}\} \in P(S)$.
:::
::::

::::example{#ex-ps-gate level="gate" title="Three counts that look alike (GATE 1993 style)" depth="standard"}
Let $|A| = 3$. Compute $|P(A \times A)|$, $|P(P(A))|$ and $|P(A)|^2$.

:::step{why="A × A has 3 × 3 = 9 ordered pairs, and a power set has 2 to the size of its base."}
$|P(A \times A)| = 2^9 = 512$.
:::

:::step{why="P(A) has 2³ = 8 elements, so its power set has 2⁸ elements."}
$|P(P(A))| = 2^8 = 256$.
:::

:::step{why="|P(A)|² counts ordered pairs (X, Y) of subsets: 8 choices for each."}
$|P(A)|^2 = 8^2 = 64$.
:::

:::answer
512, 256 and 64: the three expressions $2^{n^2}$, $2^{2^n}$ and $(2^n)^2$ really are different. With
$n = 2$ the first two would both be 16, which is why a test value of $n = 3$ is safer.
:::
::::

::::example{#ex-ps-union level="gate" title="When P(A) ∪ P(B) falls short of P(A ∪ B)" depth="standard"}
Let $A = \{1, 2\}$ and $B = \{2, 3\}$. Compare $|P(A) \cup P(B)|$ with $|P(A \cup B)|$, and name the missing
subsets.

:::step{why="Inclusion–exclusion on the two families of subsets; their common part is P(A ∩ B) by the power-set theorem."}
$|P(A) \cup P(B)| = 4 + 4 - |P(\{2\})| = 8 - 2 = 6$.
:::

:::step{why="A ∪ B = {1, 2, 3} has three elements."}
$|P(A \cup B)| = 8$.
:::

:::step{why="A subset of A ∪ B is missing exactly when it uses an element only in A and an element only in B."}
Missing: $\{1, 3\}$ and $\{1, 2, 3\}$; both contain $1 \in A - B$ and $3 \in B - A$.
:::

:::answer
6 against 8: $P(A) \cup P(B) \subsetneq P(A \cup B)$, as the theorem predicts when neither set contains the other.
:::
::::

::::example{#ex-ps-edge level="gate" title="Edge case: P(S) ∩ P(P(S)) for an ordinary S and for S = {∅}" depth="standard"}
Compute $P(S) \cap P(P(S))$ for $S = \{1, 2\}$ and for $S = \{\emptyset\}$.

:::step{why="Use the formula P(S) ∩ P(P(S)) = P(S ∩ P(S)). First find the elements of S that are also subsets of S."}
$S = \{1, 2\}$: $P(S) = \{\emptyset, \{1\}, \{2\}, \{1, 2\}\}$, and neither $1$ nor $2$ is among these sets.
So $S \cap P(S) = \emptyset$.
:::

:::step{why="The power set of the empty set is {∅}."}
$P(S) \cap P(P(S)) = P(\emptyset) = \{\emptyset\}$.
:::

:::step{why="Now S = {∅}: its element ∅ is also a subset of S, so S ∩ P(S) is not empty."}
$P(\{\emptyset\}) = \{\emptyset, \{\emptyset\}\}$, so $S \cap P(S) = \{\emptyset\}$.
:::

:::step{why="Apply the formula again; check one element directly: {∅} ⊆ S and {∅} ⊆ P(S), so it lies in both power sets."}
$P(S) \cap P(P(S)) = P(\{\emptyset\}) = \{\emptyset, \{\emptyset\}\}$.
:::

:::answer
$\{\emptyset\}$ for $S = \{1, 2\}$, but $\{\emptyset, \{\emptyset\}\}$ for $S = \{\emptyset\}$. The GATE 2000 key
"$P(S) \cap P(P(S)) = \{\emptyset\}$" is true for ordinary sets, not for literally every set.
:::
::::

## Cartesian products

:::intuition{#grid-intuition title="A product is a grid of coordinates" depth="standard"}
A chessboard square is named by a column letter and a row number, "e4". The letter comes first, the
number second, and "4e" is not a square at all. The set of all squares is every letter paired with every
number: 8 columns times 8 rows, 64 squares. That is a **Cartesian product**: all **ordered** pairs whose
first entry comes from one set and second entry from another. Order matters inside a pair (unlike in a
set), and the count multiplies.
:::

:::definition{#product-def term="Ordered pair, Cartesian product, n-tuples" depth="quick"}
An **ordered pair** $(a, b)$ has a first and a second entry; $(a, b) = (c, d)$ iff $a = c$ and $b = d$.
So $(1, 2) \neq (2, 1)$, while $\{1, 2\} = \{2, 1\}$.

The **Cartesian product** of $A$ and $B$ is $A \times B = \{(a, b) : a \in A,\ b \in B\}$. More generally
$A_1 \times \dots \times A_n$ is the set of $n$-tuples $(a_1, \dots, a_n)$ with $a_i \in A_i$, and
$A^n = A \times \dots \times A$ ($n$ factors). Example: $\{1, 2\} \times \{a, b, c\} =
\{(1,a), (1,b), (1,c), (2,a), (2,b), (2,c)\}$.
:::

:::theorem{#product-laws name="Size and laws of the Cartesian product" depth="standard"}
1. $|A \times B| = |A| \cdot |B|$, and $|A_1 \times \dots \times A_n| = |A_1| \cdots |A_n|$. In particular
   $A \times \emptyset = \emptyset \times A = \emptyset$.
2. $A \times B = B \times A$ if and only if $A = B$, or $A = \emptyset$, or $B = \emptyset$.
3. $\times$ distributes over $\cup$, $\cap$ and $-$: $A \times (B \cup C) = (A \times B) \cup (A \times C)$,
   $A \times (B \cap C) = (A \times B) \cap (A \times C)$, $A \times (B - C) = (A \times B) - (A \times C)$
   (and the same on the left).
4. $(A \times B) \cap (C \times D) = (A \cap C) \times (B \cap D)$, but $(A \times B) \cup (C \times D)$ is in
   general only a **subset** of $(A \cup C) \times (B \cup D)$.
:::

:::proof{#proof-product of="the product laws" depth="standard"}
**Idea first:** a pair is in a product exactly when **each coordinate** passes its own test, so every law
reduces to logic on the two coordinates.

1. Choose the first entry ($|A|$ ways) and then the second ($|B|$ ways); different choices give
   different pairs by the equality rule. This is the product rule. With an empty factor there is no
   first (or second) entry to choose.
2. If $A = B$ the two products are the same set; if a factor is empty both are $\emptyset$. Conversely,
   suppose both are non-empty and $A \times B = B \times A$. Take any $a \in A$, $b \in B$. Then $(a, b) \in
   B \times A$, so $a \in B$ and $b \in A$. As $a$ and $b$ were arbitrary, $A \subseteq B$ and $B \subseteq A$.
3. $(x, y) \in A \times (B \cup C) \iff x \in A \wedge (y \in B \vee y \in C) \iff (x \in A \wedge y \in B) \vee
   (x \in A \wedge y \in C)$, the distributive law of logic; the right side is membership in
   $(A \times B) \cup (A \times C)$. Replace $\vee$ by $\wedge$ for $\cap$. For $-$:
   $x \in A \wedge y \in B \wedge y \notin C$ is equivalent to $(x \in A \wedge y \in B) \wedge \neg(x \in A \wedge y \in C)$,
   because when $x \in A$ the negated conjunction reduces to $y \notin C$.
4. $(x, y)$ is in both products iff $x \in A \wedge x \in C$ and $y \in B \wedge y \in D$. For the union, a
   pair $(a, d)$ with $a \in A - C$ and $d \in D - B$ lies in $(A \cup C) \times (B \cup D)$ but in neither
   product: with $A = B = \{1\}$, $C = D = \{2\}$, the pair $(1, 2)$ is missing.
:::

:::trap{#trap-product-order title="A × B is not B × A, and (A × B) × C is not A × (B × C)" depth="quick"}
$\{1\} \times \{2\} = \{(1, 2)\}$ but $\{2\} \times \{1\} = \{(2, 1)\}$: different sets unless the factors
are equal or one is empty. Strictly, $((a, b), c)$ and $(a, (b, c))$ are different objects, so $\times$ is
not associative either; in practice both are identified with the triple $(a, b, c)$, and the **sizes**
always agree. The expected wrong answer is "$A \times B = B \times A$ because $|A \times B| = |B \times A|$":
equal sizes do not make equal sets.
:::

:::note{#recap-product title="Recap" depth="quick"}
Pairs are ordered; $|A \times B| = |A||B|$; an empty factor kills the product. $\times$ distributes over
$\cup$, $\cap$ and $-$, but is neither commutative nor (strictly) associative. $P(A \times B)$, the set of
relations from $A$ to $B$, has $2^{|A||B|}$ elements.
:::

### Worked examples: Cartesian products

::::example{#ex-prod-easy level="easy" title="Counting and listing a product" depth="quick"}
Let $A = \{0, 1\}$ and $B = \{x, y, z\}$. Find $|A \times B|$, $|B \times A|$, $|A^3|$ and $|P(A \times B)|$.

:::step{why="Product rule: a choice of first entry times a choice of second entry."}
$|A \times B| = 2 \cdot 3 = 6$ and $|B \times A| = 3 \cdot 2 = 6$ (same size, different pairs).
:::

:::step{why="A³ = A × A × A: three independent choices from A."}
$|A^3| = 2^3 = 8$: the 3-bit strings $000, 001, \dots, 111$.
:::

:::step{why="A power set has 2 to the size of its base."}
$|P(A \times B)| = 2^6 = 64$.
:::

:::answer
6, 6, 8 and 64. (The 64 subsets of $A \times B$ are exactly the relations from $A$ to $B$, Lesson 2.)
:::
::::

::::example{#ex-prod-medium level="medium" title="Intersecting a product with its mirror" depth="standard"}
Let $A = \{1, 2\}$, $B = \{2, 3\}$. Find $(A \times B) \cap (B \times A)$.

:::step{why="Law 4: an intersection of products is the product of the coordinate-wise intersections."}
$(A \times B) \cap (B \times A) = (A \cap B) \times (B \cap A)$.
:::

:::step{why="A ∩ B = {2}."}
$= \{2\} \times \{2\} = \{(2, 2)\}$.
:::

:::step{why="Sanity check by listing: A × B = {(1,2), (1,3), (2,2), (2,3)}, B × A = {(2,1), (2,2), (3,1), (3,2)}."}
The only common pair is $(2, 2)$.
:::

:::answer
$\{(2, 2)\}$.
:::
::::

::::example{#ex-prod-gate level="gate" title="Proving a product law by element chasing" depth="standard"}
Prove $A \times (B - C) = (A \times B) - (A \times C)$.

:::step{why="Two sets are equal when membership in one is equivalent to membership in the other; take an arbitrary pair."}
Let $(x, y)$ be any ordered pair.
:::

:::step{why="Unfold the left side with the definitions of × and −."}
$(x, y) \in A \times (B - C) \iff x \in A \wedge y \in B \wedge y \notin C$.
:::

:::step{why="Unfold the right side; ¬(x ∈ A ∧ y ∈ C) is x ∉ A ∨ y ∉ C by De Morgan."}
$(x, y) \in (A \times B) - (A \times C) \iff x \in A \wedge y \in B \wedge (x \notin A \vee y \notin C)$.
:::

:::step{why="Distribute: the branch x ∈ A ∧ x ∉ A is a contradiction and drops out."}
$\iff x \in A \wedge y \in B \wedge y \notin C$, the same condition as the left side.
:::

:::answer
The two membership conditions are equivalent for every pair, so the sets are equal.
:::
::::

::::example{#ex-prod-edge level="gate" title="Edge case: when A × B = B × A" depth="standard"}
For which sets is $A \times B = B \times A$ with $A \ne B$?

:::step{why="Law 2 lists all cases: A = B, or an empty factor. With A ≠ B only the empty factor remains."}
We need $A = \emptyset$ or $B = \emptyset$.
:::

:::step{why="Check: with B = ∅ both products have no pairs at all."}
$A \times \emptyset = \emptyset = \emptyset \times A$ for every $A$.
:::

:::step{why="And with both sets non-empty and different, a pair (a, b) with a ∈ A − B (or b ∈ B − A) breaks the equality."}
For $A = \{1, 2\}$, $B = \{1\}$: $(2, 1) \in A \times B$ but $(2, 1) \notin B \times A$ (its first entry $2 \notin B$).
:::

:::answer
Exactly when one of the two sets is empty (and then both products are $\emptyset$).
:::
::::

## Set operations

:::intuition{#ops-intuition title="Each operation is a connective applied to membership" depth="standard"}
Fix an object $x$ and ask two yes/no questions: is $x$ in $A$? is $x$ in $B$? Call the answers $a$ and
$b$. Then "is $x$ in $A \cup B$?" is answered by $a \vee b$, "is $x$ in $A \cap B$?" by $a \wedge b$, "is $x$
outside $A$?" by $\neg a$, and "is $x$ in exactly one of them?" by $a \oplus b$. A set operation is nothing
more than a connective applied, element by element, to membership answers.

This one observation is the engine of the whole lesson. It means the truth tables of Lesson 1 are the
membership rules of set operations, the laws of equivalence are set identities, and a computer that stores
each set as a row of bits computes $\cup$, $\cap$ and $\Delta$ with the machine's OR, AND and XOR
instructions.
:::

:::definition{#ops-def term="Union, intersection, difference, complement" depth="quick"}
With $U$ the universal set:

| Operation | Notation | $x$ belongs when | Connective |
|:--|:--|:--|:--|
| union | $A \cup B$ | $x \in A$ or $x \in B$ | $a \vee b$ |
| intersection | $A \cap B$ | $x \in A$ and $x \in B$ | $a \wedge b$ |
| difference | $A - B$ (also $A \setminus B$) | $x \in A$ and $x \notin B$ | $a \wedge \neg b$ |
| complement | $A^c$ (also $A'$, $\overline{A}$) | $x \in U$ and $x \notin A$ | $\neg a$ |
| symmetric difference | $A \,\Delta\, B$ (also $A \oplus B$) | $x$ in exactly one of $A$, $B$ | $a \oplus b$ |

$A$ and $B$ are **disjoint** when $A \cap B = \emptyset$. Note that $A - B = A \cap B^c$: a difference is an
intersection with a complement, which is how most simplifications start.
:::

:::definition{#symdiff-def term="Symmetric difference" depth="standard"}
$$A \,\Delta\, B = (A - B) \cup (B - A) = (A \cup B) - (A \cap B).$$
It collects the elements that belong to **exactly one** of the two sets: the two "lunes" of a two-set Venn
diagram, without the lens in the middle. Both formulas describe the same two regions, so they are equal.
In bits it is XOR: $x \in A \,\Delta\, B \iff (x \in A) \oplus (x \in B)$.
:::

:::theorem{#symdiff-laws name="The algebra of Δ" depth="standard"}
For all sets $A, B, C$ in a universe $U$:

1. $A \,\Delta\, B = B \,\Delta\, A$ and $(A \,\Delta\, B) \,\Delta\, C = A \,\Delta\, (B \,\Delta\, C)$.
2. $A \,\Delta\, \emptyset = A$, $A \,\Delta\, A = \emptyset$, $A \,\Delta\, U = A^c$, $A \,\Delta\, A^c = U$.
3. **Cancellation:** $A \,\Delta\, X = B \iff X = A \,\Delta\, B$. In particular $A \,\Delta\, B = A \,\Delta\, C$ forces $B = C$.
4. $\cap$ distributes over $\Delta$: $A \cap (B \,\Delta\, C) = (A \cap B) \,\Delta\, (A \cap C)$.
5. $\cup$ does **not** distribute over $\Delta$: in general $A \cup (B \,\Delta\, C) \ne (A \cup B) \,\Delta\, (A \cup C)$.
6. **Parity:** $x \in A_1 \,\Delta\, A_2 \,\Delta \cdots \Delta\, A_k$ iff $x$ lies in an **odd** number of the $A_i$.
7. For finite sets, $|A \,\Delta\, B| = |A| + |B| - 2|A \cap B|$.
:::

:::proof{#proof-symdiff of="the algebra of Δ" depth="standard"}
**Idea first:** translate every statement into the XOR algebra of membership bits, where it is a fact
from Lesson 1.

Write $a, b, c$ for the membership bits of an arbitrary $x$. Parts 1 and 2 are the commutative and
associative laws of $\oplus$ and the facts $a \oplus 0 = a$, $a \oplus a = 0$, $a \oplus 1 = \neg a$,
$a \oplus \neg a = 1$. For part 3, apply "$A \,\Delta\,$" to both sides of $A \,\Delta\, X = B$: the left side
becomes $(A \,\Delta\, A) \,\Delta\, X = \emptyset \,\Delta\, X = X$, the right side $A \,\Delta\, B$; the steps reverse.
Part 4 is $a \wedge (b \oplus c) = (a \wedge b) \oplus (a \wedge c)$: if $a = 0$ both sides are $0$, if $a = 1$
both are $b \oplus c$. For part 5 take $a = 1$: the left side is $1$, the right side is $1 \oplus 1 = 0$;
so with $A = B = \{1\}$, $C = \emptyset$ the left side is $\{1\}$ and the right side is $\emptyset$. Part 6 is the
parity theorem of Lesson 1. For part 7, $A \,\Delta\, B = (A \cup B) - (A \cap B)$ with $A \cap B \subseteq A \cup B$,
so $|A \,\Delta\, B| = |A \cup B| - |A \cap B| = (|A| + |B| - |A \cap B|) - |A \cap B|$.
:::

:::definition{#bitvector-def term="Sets as bit vectors" depth="standard"}
Order a finite universe $U = \{u_1, \dots, u_n\}$. A subset $X$ is stored as the bit string (or boolean
array) $x_1 \dots x_n$ with $x_i = 1$ iff $u_i \in X$. Then, position by position:

| Set operation | Bit operation | C on unsigned masks |
|:--|:--|:--|
| $X \cup Y$ | $x_i \vee y_i$ (OR) | bitwise or of `x` and `y` |
| $X \cap Y$ | $x_i \wedge y_i$ (AND) | `x & y` |
| $X^c$ | $\neg x_i$ (NOT) | `~x` (masked to $n$ bits) |
| $X - Y$ | $x_i \wedge \neg y_i$ | `x & ~y` |
| $X \,\Delta\, Y$ | $x_i \oplus y_i$ (XOR) | `x ^ y` |
| $X \subseteq Y$ | no position has $x_i = 1, y_i = 0$ | `(x & ~y) == 0` |
| $\lvert X \rvert$ | number of 1s | popcount |

This is the characteristic-vector bijection from the power-set proof, now used for computation.
:::

:::viz{#bitops-viz spec="sets-bit-ops" mode="animate" depth="standard"}
:::

:::trap{#trap-caret title="In GATE pseudo-code, ^ may mean AND, not XOR" depth="quick"}
GATE 2006 writes `(x[i] ^ ~y[i]) V (~x[i] ^ y[i])` with `^` for $\wedge$, `V` for $\vee$ and `~` for $\neg$:
logic notation, not C. Read that way it is $(x \wedge \neg y) \vee (\neg x \wedge y) = x \oplus y$, the symmetric
difference. If you read `^` as C's XOR (with `~` a one-bit NOT), each bracket becomes $x$ XNOR $y$ and the
result is the **complement** of $X \,\Delta\, Y$, which is not even among the options. When a symbol could
mean two things, the reading that produces a listed answer is the intended one; the `V` for "or" is the
giveaway here.
:::

:::trap{#trap-delta-union title="Δ does not mix with ∪ the way it mixes with ∩" depth="quick"}
$A \cap (B \,\Delta\, C) = (A \cap B) \,\Delta\, (A \cap C)$ is a law (AND distributes over XOR, like
multiplication over addition). The look-alike with $\cup$ is false, and so is
$P \,\Delta\, (Q \cup R) = (P \,\Delta\, Q) \cap (P \,\Delta\, R)$ (IT 2006, statement 1): with $P = \emptyset$,
$Q = \{1\}$, $R = \emptyset$ the left side is $\{1\}$ and the right side is $\{1\} \cap \emptyset = \emptyset$.
The expected wrong answer is "both statements hold" from someone who checked only the case where
$P$ contains the element.
:::

:::note{#recap-ops title="Recap" depth="quick"}
$\cup, \cap, -, {}^c, \Delta$ are $\vee, \wedge, \wedge\neg, \neg, \oplus$ on membership bits; $A - B = A \cap B^c$.
$\Delta$ is commutative and associative, has $\emptyset$ as identity and every set as its own inverse, so
$A \,\Delta\, X = B$ solves to $X = A \,\Delta\, B$; $\cap$ distributes over $\Delta$, $\cup$ does not. As bit vectors,
the operations are OR, AND, NOT, AND-NOT and XOR.
:::

### Worked examples: operations and symmetric difference

::::example{#ex-op-easy level="easy" title="Five operations on two small sets" depth="quick"}
$U = \{1, \dots, 8\}$, $A = \{1, 2, 3, 4\}$, $B = \{3, 4, 5, 6\}$. Find $A \cup B$, $A \cap B$, $A - B$,
$B - A$, $A \,\Delta\, B$ and $A^c$.

:::step{why="Union: everything in at least one set; intersection: what they share."}
$A \cup B = \{1, 2, 3, 4, 5, 6\}$, $A \cap B = \{3, 4\}$.
:::

:::step{why="A difference keeps the elements of the first set that the second lacks."}
$A - B = \{1, 2\}$, $B - A = \{5, 6\}$.
:::

:::step{why="Δ is the union of the two differences (or the union minus the intersection)."}
$A \,\Delta\, B = \{1, 2, 5, 6\} = \{1, \dots, 6\} - \{3, 4\}$.
:::

:::step{why="The complement is taken inside U."}
$A^c = \{5, 6, 7, 8\}$.
:::

:::answer
$\{1,\dots,6\}$, $\{3, 4\}$, $\{1, 2\}$, $\{5, 6\}$, $\{1, 2, 5, 6\}$, $\{5, 6, 7, 8\}$. Check part 7 of the Δ
theorem: $|A \,\Delta\, B| = 4 + 4 - 2 \cdot 2 = 4$.
:::
::::

::::example{#ex-op-medium level="medium" title="The same operations as bit vectors" depth="standard"}
With $U = \{1, \dots, 8\}$ in order, write $A$ and $B$ from the previous example as 8-bit strings and
compute the operations bitwise.

:::step{why="Bit i is 1 exactly when element i is in the set."}
$A = 11110000$, $B = 00111100$.
:::

:::step{why="OR for ∪, AND for ∩, column by column."}
$A \cup B = 11111100$, $A \cap B = 00110000$.
:::

:::step{why="AND with the complement of B for A − B; XOR for Δ."}
$A - B = 11000000$, $A \,\Delta\, B = 11001100$.
:::

:::step{why="Translate back: positions holding a 1."}
$11001100 \mapsto \{1, 2, 5, 6\}$, matching the previous answer.
:::

:::answer
$A \cup B = 11111100$, $A \cap B = 00110000$, $A - B = 11000000$, $A \,\Delta\, B = 11001100$, $A^c = 00001111$.
:::
::::

::::example{#ex-op-gate level="gate" title="What set does this loop compute? (GATE 2006 style)" depth="standard"}
Sets $X, Y$ over $\{0, \dots, n-1\}$ are boolean arrays. A loop sets
`z[i] = (~x[i] ^ ~y[i]) V (x[i] ^ y[i])`, with `^` meaning $\wedge$, `V` meaning $\vee$ and `~` meaning $\neg$.
Which set is $Z$?

:::step{why="Translate the bit formula into connectives."}
$z = (\neg x \wedge \neg y) \vee (x \wedge y)$.
:::

:::step{why="This is true exactly when x and y agree: both 0 or both 1. That is x ↔ y, the negation of x ⊕ y."}
$z = \neg(x \oplus y)$.
:::

:::step{why="Translate back to sets: ¬(x ⊕ y) is membership in the complement of X Δ Y."}
$Z = (X \,\Delta\, Y)^c = (X \cap Y) \cup (X^c \cap Y^c)$.
:::

:::answer
$Z = (X \,\Delta\, Y)^c$: the elements on which the two sets agree. Swapping which bracket carries the
negations (as GATE 2006 does) gives $X \,\Delta\, Y$ itself.
:::
::::

::::example{#ex-op-cancel level="gate" title="Solving a set equation with Δ" depth="standard"}
$A = \{1, 2, 3\}$ and $B = \{2, 3, 4, 5\}$. Find every set $X$ with $A \,\Delta\, X = B$.

:::step{why="Cancellation: Δ-ing both sides with A undoes the A on the left, because A Δ A = ∅ and ∅ is the identity."}
$X = A \,\Delta\, B$, and this $X$ is the only solution.
:::

:::step{why="Compute: elements in exactly one of A and B."}
$A \,\Delta\, B = \{1\} \cup \{4, 5\} = \{1, 4, 5\}$.
:::

:::step{why="Check by substituting back: elements in exactly one of {1, 2, 3} and {1, 4, 5}."}
$\{1, 2, 3\} \,\Delta\, \{1, 4, 5\} = \{2, 3, 4, 5\} = B$.
:::

:::answer
Exactly one solution, $X = \{1, 4, 5\}$. With $\cup$ the analogous equation $A \cup X = B$ has no solution
here ($1 \in A$ but $1 \notin B$); $\Delta$ always has exactly one.
:::
::::

::::example{#ex-op-edge level="gate" title="Edge case: ∪ does not distribute over Δ" depth="standard"}
Compare $A \cup (B \,\Delta\, C)$ with $(A \cup B) \,\Delta\, (A \cup C)$, and find what the second one really is.

:::step{why="Split on the membership bit a of an element in A. If a = 1 the left side is 1."}
$a = 1$: left $= 1$; right $= 1 \oplus 1 = 0$. They differ on every element of $A$.
:::

:::step{why="Concrete counterexample from that case."}
$A = B = \{1\}$, $C = \emptyset$: left $\{1\} \cup \{1\} = \{1\}$; right $\{1\} \,\Delta\, \{1\} = \emptyset$.
:::

:::step{why="If a = 0 both sides reduce to b ⊕ c. So the right side is b ⊕ c with every element of A removed."}
$(A \cup B) \,\Delta\, (A \cup C) = (B \,\Delta\, C) - A$.
:::

:::answer
Not equal in general; the right side equals $(B \,\Delta\, C) - A$, the left side $(B \,\Delta\, C) \cup A$. They
agree only when $A = \emptyset$.
:::
::::

## Set identities and how to prove them

:::intuition{#lenses-intuition title="One question, three lenses" depth="standard"}
"Are these two set expressions always equal?" can be answered in three ways, and they are really the same
argument seen through different lenses.

- **Element chasing** follows one arbitrary element $x$ through both expressions with words and logic: if
  $x$ is in the left side, show it is in the right side, and back. It is the method for written proofs.
- **A membership table** is a truth table: one row for each way $x$ can sit relative to the sets ($2^k$ rows
  for $k$ sets), one column per sub-expression. Equal final columns mean equal sets.
- **Venn regions** are the same rows drawn as a picture: $k$ overlapping circles cut the universe into
  $2^k$ regions, one per row of the table. An expression is just a list of regions, and two expressions are
  equal exactly when they list the same regions.

For multiple-choice questions the region lists are fastest, because the options can be compared by reading
off lists; for "prove that" questions, element chasing is expected.
:::

:::definition{#laws-table term="The laws of set algebra" depth="quick"}
For all subsets $A, B, C$ of $U$ (each law is the logic law of the same name with $\cup, \cap, {}^c, \emptyset,
U$ in place of $\vee, \wedge, \neg, \text{F}, \text{T}$):

| Law | Union form | Intersection form |
|:--|:--|:--|
| identity | $A \cup \emptyset = A$ | $A \cap U = A$ |
| domination | $A \cup U = U$ | $A \cap \emptyset = \emptyset$ |
| idempotent | $A \cup A = A$ | $A \cap A = A$ |
| complement | $A \cup A^c = U$ | $A \cap A^c = \emptyset$ |
| double complement | $(A^c)^c = A$ | |
| commutative | $A \cup B = B \cup A$ | $A \cap B = B \cap A$ |
| associative | $(A \cup B) \cup C = A \cup (B \cup C)$ | $(A \cap B) \cap C = A \cap (B \cap C)$ |
| distributive | $A \cup (B \cap C) = (A \cup B) \cap (A \cup C)$ | $A \cap (B \cup C) = (A \cap B) \cup (A \cap C)$ |
| De Morgan | $(A \cup B)^c = A^c \cap B^c$ | $(A \cap B)^c = A^c \cup B^c$ |
| absorption | $A \cup (A \cap B) = A$ | $A \cap (A \cup B) = A$ |

Laws for differences, all consequences of $A - B = A \cap B^c$:

- $A - (B \cup C) = (A - B) \cap (A - C)$ and $A - (B \cap C) = (A - B) \cup (A - C)$ (De Morgan inside $A$);
- $(A - B) - C = A - (B \cup C) = (A - C) - (B - C)$;
- $A - (A - B) = A \cap B$, $A - B = A - (A \cap B)$, and $A - B = \emptyset \iff A \subseteq B$;
- $A \subseteq B \iff A \cup B = B \iff A \cap B = A \iff B^c \subseteq A^c$.

Difference is **neither commutative nor associative**: $(A - B) - C$ and $A - (B - C)$ differ in general.
:::

:::theorem{#transfer-theorem name="Every logical equivalence is a set identity" depth="standard"}
Let $\varphi$ and $\psi$ be propositional formulas in variables $a_1, \dots, a_k$ built with $\vee, \wedge, \neg,
\oplus$, and let $E_\varphi$, $E_\psi$ be the set expressions obtained by replacing $a_i$ by $A_i$ and the
connectives by $\cup, \cap, {}^c, \Delta$. If $\varphi \equiv \psi$, then $E_\varphi = E_\psi$ for all sets
$A_1, \dots, A_k \subseteq U$. Conversely, if $E_\varphi = E_\psi$ for all sets, then $\varphi \equiv \psi$.
:::

:::proof{#proof-transfer of="the transfer theorem" depth="standard"}
**Idea first:** an element's membership in an expression is the formula evaluated on that element's
membership bits.

By induction on the formula, for every $x \in U$: $x \in E_\varphi$ iff $\varphi$ is true when each $a_i$ is given
the value "$x \in A_i$". (For a variable this is the definition; for $\vee$ it is the definition of $\cup$,
and likewise for the other connectives.) If $\varphi \equiv \psi$, the two formulas agree on every row, in
particular on the row of $x$, so $x \in E_\varphi \iff x \in E_\psi$ for every $x$: the sets are equal.
Conversely, if $\varphi$ and $\psi$ differ on some row, take $U = \{u\}$ and put $u$ in exactly the sets $A_i$
whose variable is true on that row; then $u$ lies in one expression and not the other.
:::

:::definition{#chasing-def term="Element chasing (the written proof)" depth="standard"}
To prove $X = Y$: (1) take an arbitrary $x$; (2) unfold "$x \in X$" into a statement about $x \in A$,
$x \in B$, … using the definitions; (3) transform it with logic laws until it reads as the unfolding of
"$x \in Y$"; (4) conclude $X = Y$ because the membership conditions are equivalent for every $x$. If the
steps only go one way, you have proved $X \subseteq Y$; prove $Y \subseteq X$ separately.
:::

:::definition{#membership-table-def term="Membership table" depth="standard"}
A **membership table** for an expression in $A, B, C$ has one row for each of the $2^3 = 8$ membership
patterns of an element (1 = in, 0 = out), listed from $111$ down to $000$, and one column for every
sub-expression, filled with the connective rules. Two expressions are equal for all sets if and only if
their final columns are identical; one is always a subset of the other iff wherever the first column has
a 1, so does the second.
:::

:::viz{#mtable-viz spec="sets-membership-table" mode="animate" depth="standard"}
:::

:::definition{#venn-regions-def term="Venn regions and region codes" depth="standard"}
$k$ sets in general position cut $U$ into $2^k$ **regions**, one per membership pattern. We name a region by
the sets that contain it: for $A, B, C$ the regions are $ABC$, $AB$, $AC$, $BC$, $A$, $B$, $C$ (in that set
only) and $-$ (outside all three). Every expression built from $A, B, C$ with $\cup, \cap, -, {}^c, \Delta$ is
the union of some of these regions, so it is described by its **region list**:

- $A = \{ABC, AB, AC, A\}$; $A \cap B = \{ABC, AB\}$; $A - B = \{AC, A\}$;
- $A \,\Delta\, B = \{AC, A, BC, B\}$; $A^c = \{BC, B, C, -\}$; $(A \cup B \cup C)^c = \{-\}$.

Since each of the $2^k$ regions is either in or out, there are $2^{2^k}$ different expressions in $k$ sets
($256$ for three), exactly as there are $2^{2^k}$ truth tables in $k$ variables.
:::

:::theorem{#region-theorem name="Equal regions, equal sets" depth="standard"}
For set expressions $X$ and $Y$ in $A_1, \dots, A_k$:

1. $X = Y$ for all choices of the sets $\iff$ $X$ and $Y$ have the same region list.
2. $X \subseteq Y$ for all choices of the sets $\iff$ the region list of $X$ is contained in that of $Y$.
3. If the region list of $X$ is a **proper** part of that of $Y$, then $X \subseteq Y$ always, $X \ne Y$ for some
   choice of sets, and $X = Y$ for every choice in which the extra regions (on $Y$'s list, not on $X$'s)
   happen to be empty. So neither "$X = Y$" nor "$X \subsetneq Y$" is always true.
:::

:::proof{#proof-region of="the region theorem" depth="standard"}
**Idea first:** whether an element belongs to an expression depends only on which region it is in.

(⇐ in 1 and 2) Every element $x$ of $U$ lies in exactly one region $r$. By the transfer argument, $x \in X$
iff $r$ is on $X$'s list. If the lists are equal, $x \in X \iff x \in Y$; if $X$'s list is inside $Y$'s, then
$x \in X \Rightarrow x \in Y$.

(⇒ in 1 and 2) Suppose some region $r$ is on $X$'s list but not on $Y$'s. Take $U = \{u\}$ and put $u$ into
exactly the sets named in $r$. Then $u$ lies in region $r$, so $u \in X$ and $u \notin Y$: $X \not\subseteq Y$, and
in particular $X \ne Y$.

(3) Inclusion holds by part 2, and the construction just given (with a region on $Y$'s list but not on
$X$'s) makes $X \ne Y$. If instead every extra region is empty, each element of $U$ lies in a region that is
on both lists or on neither, so $X = Y$.
:::

:::viz{#venn-viz spec="sets-venn-regions" mode="animate" depth="standard"}
:::

:::trick{#trick-region-lists title="Compare expressions by their region lists" depth="standard"}
To compare two expressions in $A, B, C$: write each atom's region list, combine lists with the
operation (union of lists for $\cup$, common part for $\cap$, removal for $-$, the 8 minus the list for
${}^c$, "in exactly one list" for $\Delta$), and compare the final lists. Equal lists: "$X = Y$". One list
strictly inside the other: "$X \subseteq Y$" always, but not "$X \subset Y$" always.

**Why it works:** the region theorem. **When it fails:** when the question is not an identity in the
sets, for example when it involves sizes ($|X| = 5$), specific elements, power sets or products; and
when the problem fixes extra facts ("$A \subseteq B$", "$A$ and $C$ are disjoint"), which empty some regions
first. Delete those regions from every list before comparing.
:::

:::trap{#trap-strict-subset title="'X ⊂ Y' is almost never the answer to an always-question" depth="quick"}
When both expressions cover the same regions, the answer is $X = Y$, and options "$X \subset Y$" or
"$X \supset Y$" (proper) are wrong, because a proper inclusion would need an element that is in one and not
the other. When $X$'s list is strictly inside $Y$'s, "$X \subseteq Y$" is always true but "$X \subset Y$"
fails whenever the extra regions happen to be empty. Examiners expect students who see two different
formulas to pick a strict inclusion; simplify before choosing.
:::

:::derivation{#union-count of="the size of a union (two and three sets)" depth="standard"}
Count by regions. For two finite sets, $|A| + |B|$ counts the lens region $AB$ twice and every other
region of $A \cup B$ once, so
$$|A \cup B| = |A| + |B| - |A \cap B|.$$
For three sets, $|A| + |B| + |C|$ counts each region by how many of the sets contain it: the one-set
regions once, the two-set regions twice and $ABC$ three times. Subtracting $|A \cap B| + |A \cap C| + |B \cap C|$
removes two-set regions once each and $ABC$ three times, leaving $ABC$ counted zero times, so we add it back:
$$|A \cup B \cup C| = |A| + |B| + |C| - |A \cap B| - |A \cap C| - |B \cap C| + |A \cap B \cap C|.$$
**Sanity check:** with $A = B = C$ the right side is $3|A| - 3|A| + |A| = |A|$. The general
inclusion–exclusion principle and its counting uses come in the combinatorics chapter.
:::

:::note{#recap-identities title="Recap" depth="quick"}
Every logic law is a set law ($\vee \to \cup$, $\wedge \to \cap$, $\neg \to {}^c$, $\oplus \to \Delta$). Prove
identities by element chasing (written proofs), by membership tables (mechanical) or by region lists
(fastest for options): equal lists mean equal sets, contained lists mean $\subseteq$. Remember $A - B = A \cap B^c$,
$|A \cup B| = |A| + |B| - |A \cap B|$, and that a proper inclusion is never "always" true.
:::

### Worked examples: proving identities

::::example{#ex-id-easy level="easy" title="De Morgan's law by element chasing" depth="quick"}
Prove $(A \cup B)^c = A^c \cap B^c$.

:::step{why="Start from an arbitrary element and unfold the left side with the definitions of complement and union."}
$x \in (A \cup B)^c \iff \neg(x \in A \vee x \in B)$.
:::

:::step{why="De Morgan's law of logic moves the negation inside and turns ∨ into ∧."}
$\iff (x \notin A) \wedge (x \notin B)$.
:::

:::step{why="Fold back with the definitions of complement and intersection."}
$\iff x \in A^c \wedge x \in B^c \iff x \in A^c \cap B^c$.
:::

:::answer
Every element is in the left side exactly when it is in the right side, so the sets are equal. The set
law is the logic law applied to membership.
:::
::::

::::example{#ex-id-medium level="medium" title="A membership table" depth="standard"}
Prove $A - (B \cap C) = (A - B) \cup (A - C)$ with a membership table.

:::step{why="Three sets give 8 membership patterns; list them from 111 to 000 in the order A, B, C."}
Rows: $111, 110, 101, 100, 011, 010, 001, 000$.
:::

:::step{why="Left side: a ∧ ¬(b ∧ c). It is 1 only when a = 1 and b, c are not both 1."}
Left column: $0, 1, 1, 1, 0, 0, 0, 0$.
:::

:::step{why="Right side: (a ∧ ¬b) ∨ (a ∧ ¬c), i.e. a = 1 and at least one of b, c is 0."}
$A - B$: $0, 0, 1, 1, 0, 0, 0, 0$; $A - C$: $0, 1, 0, 1, 0, 0, 0, 0$; union: $0, 1, 1, 1, 0, 0, 0, 0$.
:::

:::answer
The final columns agree on all 8 rows, so the identity holds for all sets. In region language both sides
are $\{AB, AC, A\}$: the part of $A$ outside the triple overlap.
:::
::::

::::example{#ex-id-gate level="gate" title="Simplifying by laws" depth="standard"}
Simplify $(A \cup B) \cap (A \cup B^c) \cap (A^c \cup B)$.

:::step{why="Distributive law in reverse on the first two factors: (A ∪ B) ∩ (A ∪ B^c) = A ∪ (B ∩ B^c)."}
$(A \cup B) \cap (A \cup B^c) = A \cup (B \cap B^c) = A \cup \emptyset = A$.
:::

:::step{why="What remains is A ∩ (A^c ∪ B); distribute A over the union."}
$A \cap (A^c \cup B) = (A \cap A^c) \cup (A \cap B) = \emptyset \cup (A \cap B)$.
:::

:::step{why="Check by regions: A ∪ B covers {AB, A, B}, A ∪ B^c covers {AB, A, -}, A^c ∪ B covers {AB, B, -}; the common region is AB."}
Common region: $AB$ only, which is $A \cap B$.
:::

:::answer
$A \cap B$. Two methods (laws and regions) agree.
:::
::::

::::example{#ex-id-edge level="gate" title="Edge case: difference is not associative" depth="standard"}
Is $(A - B) - C = A - (B - C)$ for all sets?

:::step{why="Write both as region lists. (A − B) − C keeps the part of A outside B and outside C."}
$(A - B) - C = \{A\}$ (the region in $A$ only).
:::

:::step{why="B − C = {AB, B} (in B, not in C). Removing these from A's list {ABC, AB, AC, A} leaves three regions."}
$A - (B - C) = \{ABC, AC, A\}$.
:::

:::step{why="The lists differ (ABC and AC are extra), so by the region theorem the identity fails. Build a counterexample in region AC."}
$A = C = \{1\}$, $B = \emptyset$: $(A - B) - C = \{1\} - \{1\} = \emptyset$, but $A - (B - C) = \{1\} - \emptyset = \{1\}$.
:::

:::answer
No. $(A - B) - C \subseteq A - (B - C)$ always (one list is inside the other), with equality only when
$A \cap C = \emptyset$. The correct regrouping is $(A - B) - C = A - (B \cup C)$.
:::
::::

### Worked examples: comparing set expressions

::::example{#ex-cmp-easy level="easy" title="Union minus symmetric difference" depth="quick"}
Simplify $(A \cup B) - (A \,\Delta\, B)$.

:::step{why="With two sets there are four regions: AB, A, B, -. Write each list."}
$A \cup B = \{AB, A, B\}$, $A \,\Delta\, B = \{A, B\}$.
:::

:::step{why="A difference removes the second list from the first."}
$\{AB, A, B\} - \{A, B\} = \{AB\}$.
:::

:::answer
$A \cap B$. Rearranged, this is the definition $A \,\Delta\, B = (A \cup B) - (A \cap B)$ read backwards.
:::
::::

::::example{#ex-cmp-medium level="medium" title="Two ways to remove C" depth="standard"}
Let $X = (A \cup B) - C$ and $Y = (A - C) \cup (B - C)$. How are $X$ and $Y$ related?

:::step{why="Regions of A ∪ B with three sets: everything in A or B."}
$A \cup B = \{ABC, AB, AC, BC, A, B\}$.
:::

:::step{why="Removing C deletes every region whose code contains C."}
$X = \{AB, A, B\}$.
:::

:::step{why="A − C = {AB, A} and B − C = {AB, B}; their union is the same list."}
$Y = \{AB, A, B\}$.
:::

:::answer
$X = Y$: difference distributes over union from the right, $(A \cup B) - C = (A - C) \cup (B - C)$.
:::
::::

::::example{#ex-cmp-gate level="gate" title="An inclusion that is only one way" depth="standard"}
Let $X = (A \cap B) - C$ and $Y = A - C$. Which is always true: $X = Y$, $X \subset Y$, $X \subseteq Y$, or none?

:::step{why="Region lists."}
$X = \{AB\}$, $Y = \{AB, A\}$.
:::

:::step{why="X's list is strictly inside Y's, so X ⊆ Y for all sets (region theorem, part 2)."}
$X \subseteq Y$ always.
:::

:::step{why="Whether the inclusion is proper depends on the region A (in A only) being non-empty. Test both cases."}
$A = \{1\}$, $B = C = \emptyset$: $X = \emptyset \ne Y = \{1\}$. $A = B = \{1\}$, $C = \emptyset$: $X = Y = \{1\}$.
:::

:::answer
Only "$X \subseteq Y$" is always true; "$X = Y$" and "$X \subset Y$" (proper) each fail for some sets.
:::
::::

::::example{#ex-cmp-count level="gate" title="Counting with regions" depth="standard"}
Of 100 students, 60 study algebra, 50 study biology and 30 study both. How many study neither, and how
many study exactly one subject?

:::step{why="Fill the innermost region first: the overlap AB is given."}
$|AB| = 30$.
:::

:::step{why="Each set's total minus the overlap gives its 'only' region."}
$|A \text{ only}| = 60 - 30 = 30$, $|B \text{ only}| = 50 - 30 = 20$.
:::

:::step{why="The union is the sum of its regions (or |A| + |B| − |A ∩ B|); the rest of the 100 is outside."}
$|A \cup B| = 30 + 30 + 20 = 80 = 60 + 50 - 30$; neither $= 100 - 80 = 20$.
:::

:::answer
20 study neither; $|A \,\Delta\, B| = 30 + 20 = 50$ study exactly one, matching $60 + 50 - 2 \cdot 30$.
:::
::::

::::example{#ex-cmp-edge level="gate" title="Edge case: when the problem fixes a fact first" depth="standard"}
Suppose $A \subseteq B$. Simplify $(A \cup C) \cap (B - C)$ and compare with $A - C$.

:::step{why="A ⊆ B means no element lies in A outside B: the regions AC and A (A without B) are empty. Delete them from every list."}
Live regions: $ABC, AB, BC, B, C, -$.
:::

:::step{why="Lists among the live regions."}
$A \cup C = \{ABC, AB, BC, C\}$; $B - C = \{AB, B\}$.
:::

:::step{why="Intersect the lists; then write A − C among the live regions."}
$(A \cup C) \cap (B - C) = \{AB\}$; $A - C = \{AB\}$ as well.
:::

:::answer
Under $A \subseteq B$ the two are equal. Without that fact they are not: region $A$ (in $A$ only) is in
$A - C$ but not in $(A \cup C) \cap (B - C)$. Always delete the regions the hypotheses empty before comparing.
:::
::::

## Counting pairs of sets one element at a time

:::intuition{#per-element-intuition title="Let every element choose its own status" depth="standard"}
How many pairs $(A, B)$ of subsets of a 10-element set satisfy $A \subseteq B$? Listing pairs is hopeless,
and summing over the size of $B$ works but is slow. Turn the question around: instead of choosing the sets,
let **each element** choose where it lives. An element can be in both $A$ and $B$, in $B$ only, in $A$
only, or in neither. The condition $A \subseteq B$ forbids exactly one of these four statuses ("in $A$ but not
in $B$") and says nothing else. So every element independently picks one of **three** allowed statuses, and
different picks give different pairs: $3 \times 3 \times \dots \times 3 = 3^{10}$.

The membership table is the menu: its rows are the possible statuses of one element, the condition crosses
some rows out, and the answer is (number of rows left) to the power $n$.
:::

:::theorem{#per-element-theorem name="The per-element principle" depth="standard"}
Let $|S| = n$ and let $\Pi \subseteq \{0, 1\}^k$ be a set of allowed membership patterns. The number of
$k$-tuples $(A_1, \dots, A_k)$ of subsets of $S$ in which **every** element's pattern
$(x \in A_1, \dots, x \in A_k)$ lies in $\Pi$ is $|\Pi|^n$.
:::

:::proof{#proof-per-element of="the per-element principle" depth="standard"}
**Idea first:** a tuple of subsets is the same information as a list of patterns, one per element.

Send a tuple $(A_1, \dots, A_k)$ to the function $f : S \to \{0, 1\}^k$ that maps each $x$ to its pattern.
The tuple can be recovered from $f$ ($A_i$ is the set of $x$ whose pattern has a 1 in place $i$), and every
function arises from some tuple, so this is a bijection between $k$-tuples of subsets and functions
$S \to \{0, 1\}^k$. The tuples we want correspond to the functions with all values in $\Pi$. Choosing a value
in $\Pi$ for each of the $n$ elements independently gives $|\Pi|^n$ such functions (product rule).
**Sanity check:** with no restriction, $\Pi = \{0, 1\}^k$ and the count is $(2^k)^n = (2^n)^k$, the number of
$k$-tuples of subsets.
:::

:::viz{#choice-viz spec="sets-choice-grid" mode="animate" depth="standard"}
:::

:::derivation{#standard-counts of="the standard counts for pairs and triples of subsets" depth="standard"}
For $|S| = n$, list the allowed patterns $(a, b)$ of one element and raise their number to the $n$:

| Condition on $(A, B)$ | Allowed patterns | Count |
|:--|:--|:--|
| none | $11, 10, 01, 00$ | $4^n$ |
| $A \subseteq B$ | $11, 01, 00$ | $3^n$ |
| $A \cap B = \emptyset$ (disjoint) | $10, 01, 00$ | $3^n$ |
| $A \cup B = S$ | $11, 10, 01$ | $3^n$ |
| $A \cap B = \emptyset$ and $A \cup B = S$ | $10, 01$ | $2^n$ |
| $A = B$ | $11, 00$ | $2^n$ |
| $A \subseteq B \subseteq C$ (triples) | $111, 011, 001, 000$ | $4^n$ |

**A second proof of the $3^n$**, by the size of $B$: a $k$-element $B$ can be chosen in $\binom{n}{k}$ ways and
then $A \subseteq B$ in $2^k$ ways, so the count is $\sum_k \binom{n}{k} 2^k = (1 + 2)^n = 3^n$ by the binomial
theorem. **Sanity check** ($n = 1$, $S = \{s\}$): the pairs with $A \subseteq B$ are $(\emptyset, \emptyset)$,
$(\emptyset, S)$, $(S, S)$: three.
:::

:::definition{#nonlocal-counts term="Conditions that are not purely per-element" depth="standard"}
Some conditions speak about the sets as wholes; reduce them to per-element counts by a subtraction, a
choice or a symmetry:

- $A \subsetneq B$ (proper): all pairs with $A \subseteq B$ minus those with $A = B$: $3^n - 2^n$.
- $|A \cap B| = 1$: choose the shared element ($n$ ways), then the other $n - 1$ elements avoid pattern $11$:
  $n \cdot 3^{n-1}$.
- Unordered pairs $\{A, B\}$ with $A \cap B = \emptyset$: the $3^n$ ordered pairs contain $(\emptyset, \emptyset)$
  once and every other unordered pair twice ($A \ne B$ when disjoint and not both empty), so the count is
  $\frac{3^n - 1}{2} + 1 = \frac{3^n + 1}{2}$.
- $A \subseteq B$ with $|B| = k$ fixed: $\binom{n}{k} 2^k$.
:::

:::trick{#trick-pattern-menu title="Write the menu of patterns, cross out, count" depth="standard"}
For any "how many tuples of subsets" question, write the $2^k$ membership patterns of a single element,
cross out the patterns the condition forbids, and answer (patterns left)$^n$.

**Why it works:** the per-element principle. **When it fails:** when the condition is about the sets as a
whole (sizes, "proper", "non-empty", unordered pairs); then count per element first and correct with a
subtraction or a division, as in the list above.
:::

:::trap{#trap-ordered-pairs title="Ordered or unordered, ⊆ or ⊊" depth="quick"}
GATE 2021 asks for **tuples** $(A, B)$ with $A \subseteq B$: ordered, equality allowed, so $3^{10} = 59049$.
The wrong answers examiners expect are $3^{10} - 2^{10} = 58025$ (treating $\subseteq$ as proper), $2^{10}$ or
$4^{10}$ (forgetting the condition, or counting single subsets), and halving the count as if the pairs
were unordered. Read the brackets: $(A, B)$ is ordered, $\{A, B\}$ is not.
:::

:::note{#recap-counting title="Recap" depth="quick"}
Each element picks a membership pattern independently, so a per-element condition with $p$ allowed
patterns gives $p^n$ tuples: $3^n$ for $A \subseteq B$, for disjoint pairs and for $A \cup B = S$; $4^n$ for chains
$A \subseteq B \subseteq C$. Whole-set conditions need a correction: $3^n - 2^n$ for proper inclusion,
$n 3^{n-1}$ for exactly one shared element, $(3^n + 1)/2$ for unordered disjoint pairs.
:::

### Worked examples: counting pairs of subsets

::::example{#ex-cnt-easy level="easy" title="Disjoint ordered pairs" depth="quick"}
How many ordered pairs $(A, B)$ of subsets of $\{1, 2, 3, 4\}$ are disjoint?

:::step{why="Disjoint forbids only the pattern 'in both'; the element may be in A only, in B only, or in neither."}
Allowed patterns: $10, 01, 00$: three per element.
:::

:::step{why="Four elements choose independently."}
$3^4 = 81$.
:::

:::answer
81. (A sanity check for $n = 1$: $(\emptyset, \emptyset)$, $(\{1\}, \emptyset)$, $(\emptyset, \{1\})$, three pairs.)
:::
::::

::::example{#ex-cnt-medium level="medium" title="Fixing the size of the bigger set" depth="standard"}
For $S = \{1, 2, 3, 4\}$, count pairs $(A, B)$ with $A \subseteq B$ and $|B| = 2$; then add up over all sizes of $B$
and compare with $3^4$.

:::step{why="Choose B first (a 2-element subset), then A among the subsets of B."}
$\binom{4}{2} \cdot 2^2 = 6 \cdot 4 = 24$.
:::

:::step{why="The same count for every size k of B: C(4, k) · 2^k."}
$k = 0, 1, 2, 3, 4$: $1, 8, 24, 32, 16$.
:::

:::step{why="Sum, and compare with the per-element answer (binomial theorem: Σ C(4, k) 2^k = (1 + 2)^4)."}
$1 + 8 + 24 + 32 + 16 = 81 = 3^4$.
:::

:::answer
24 pairs have $|B| = 2$; over all sizes there are $81 = 3^4$ pairs, confirming the per-element count.
:::
::::

::::example{#ex-cnt-gate level="gate" title="Exactly one common element" depth="standard"}
How many ordered pairs $(A, B)$ of subsets of a 5-element set have $|A \cap B| = 1$?

:::step{why="'Exactly one' is a whole-set condition; make it per-element by first choosing which element is shared."}
5 choices for the shared element $s$; its pattern is forced to be $11$.
:::

:::step{why="Every other element must not be shared: patterns 10, 01, 00."}
$3^4 = 81$ choices for the remaining four elements.
:::

:::step{why="Different choices of s give different pairs (s is the unique element of A ∩ B), so multiply."}
$5 \cdot 81 = 405$.
:::

:::answer
$405 = n \cdot 3^{n-1}$ with $n = 5$.
:::
::::

::::example{#ex-cnt-chain level="gate" title="Chains of three subsets" depth="standard"}
How many triples $(A, B, C)$ of subsets of $\{1, 2, 3\}$ satisfy $A \subseteq B \subseteq C$?

:::step{why="List the patterns (a, b, c) allowed for one element: once it is in a set it must be in every later set."}
$111$, $011$, $001$, $000$: four patterns (the element "enters" at $A$, at $B$, at $C$, or never).
:::

:::step{why="Three elements, four independent choices each."}
$4^3 = 64$.
:::

:::answer
64. In general a chain of $k$ nested subsets gives $(k + 1)^n$.
:::
::::

::::example{#ex-cnt-edge level="gate" title="Edge case: proper inclusion and unordered pairs" depth="standard"}
For $|S| = 3$, count (i) ordered pairs with $A \subsetneq B$, (ii) unordered pairs $\{A, B\}$ of disjoint subsets.

:::step{why="(i) All pairs with A ⊆ B, minus the pairs with A = B (one per subset)."}
$3^3 - 2^3 = 27 - 8 = 19$.
:::

:::step{why="(ii) Ordered disjoint pairs: 3³ = 27. Only (∅, ∅) has A = B; every other unordered pair appears twice."}
$\frac{27 - 1}{2} + 1 = 14$.
:::

:::step{why="Sanity check for (ii) with |S| = 1: unordered disjoint pairs are {∅, ∅} and {∅, S}, i.e. 2 = (3 + 1)/2."}
The formula $(3^n + 1)/2$ gives $2$ for $n = 1$ and $14$ for $n = 3$.
:::

:::answer
(i) 19, (ii) 14. Both corrections are needed because "proper" and "unordered" are not per-element conditions.
:::
::::

## GATE questions on this lesson

All fourteen previous-year questions. Try each before opening the solution.

:::pyq{id="cse-1993-ii-a-8-4" tests="nested-powerset,trap-powerset-exponent,ex-ps-gate,product-laws" depth="standard"}
:::

:::pyq{id="cse-1995-a-20" tests="set-def,powerset-size,trap-empty-vs-singleton,ex-ps-medium" depth="standard"}
:::

:::pyq{id="cse-1996-a-1" tests="ops-def,venn-regions-def,trick-region-lists,ex-cmp-easy" depth="standard"}
:::

:::pyq{id="cse-2000-a-2-6" tests="powerset-self,trap-always-true,ex-ps-edge" depth="standard"}
:::

:::pyq{id="cse-2001-b-51-a" tests="powerset-meet,chasing-def" depth="standard"}
:::

:::pyq{id="cse-2005-cs-8" tests="laws-table,region-theorem,trap-strict-subset" depth="standard"}
:::

:::pyq{id="cse-2006-cs-22" tests="region-theorem,trick-region-lists,trap-strict-subset,ex-cmp-medium" depth="standard"}
:::

:::pyq{id="cse-2006-cs-50" tests="bitvector-def,symdiff-def,trap-caret,ex-op-gate" depth="standard"}
:::

:::pyq{id="it-2006-cs-23" tests="symdiff-laws,trap-delta-union,ex-op-edge" depth="standard"}
:::

:::pyq{id="cse-2008-cs-2" tests="laws-table,venn-regions-def,ex-id-gate" depth="standard"}
:::

:::pyq{id="cse-2015-1-cs-16" tests="member-subset-bridge,trick-strip-braces,ex-mem-gate" depth="standard"}
:::

:::pyq{id="cse-2015-2-cs-18" tests="powerset-size,proof-powerset-size" depth="standard"}
:::

:::pyq{id="cse-2015-3-cs-23" tests="laws-table,region-theorem,union-count" depth="standard"}
:::

:::pyq{id="cse-2021-2-cs-50" tests="per-element-theorem,standard-counts,trap-ordered-pairs" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dm-03-01-q01" depth="standard"}
:::

:::practice{id="nx-dm-03-01-q02" depth="standard"}
:::

:::practice{id="nx-dm-03-01-q03" depth="standard"}
:::

:::practice{id="nx-dm-03-01-q04" depth="standard"}
:::

:::practice{id="nx-dm-03-01-q05" depth="standard"}
:::

:::practice{id="nx-dm-03-01-q06" depth="standard"}
:::

:::practice{id="nx-dm-03-01-q07" depth="standard"}
:::

:::practice{id="nx-dm-03-01-q08" depth="standard"}
:::

:::practice{id="nx-dm-03-01-q09" depth="standard"}
:::

:::practice{id="nx-dm-03-01-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Sets on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Set | determined by its elements; order and repeats ignored; $\emptyset \ne \{\emptyset\}$ |
| $\in$ vs $\subseteq$ | $X \in S$: $X$ is listed in $S$; $X \subseteq S$: everything inside $X$ is listed in $S$; $x \in S \iff \{x\} \subseteq S$; $\in$ is not transitive |
| Empty set | $\emptyset \subseteq A$ for every $A$ (vacuous truth); $\emptyset \in A$ only if listed |
| Power set | $\lvert P(S) \rvert = 2^n$; $\emptyset, S \in P(S)$; $X \in P(S) \iff X \subseteq S$; $\lvert P(P(S)) \rvert = 2^{2^n}$; $\lvert P(A \times A) \rvert = 2^{n^2}$ |
| Power-set laws | $P(A \cap B) = P(A) \cap P(B)$; $P(A) \cup P(B) \subseteq P(A \cup B)$, equal iff one set contains the other |
| Products | ordered pairs; $\lvert A \times B \rvert = \lvert A \rvert \lvert B \rvert$; $A \times B = B \times A$ iff $A = B$ or one is empty; distributes over $\cup, \cap, -$ |
| Operations | $\cup, \cap, -, {}^c, \Delta$ = $\vee, \wedge, \wedge\neg, \neg, \oplus$ on membership; $A - B = A \cap B^c$; bit vectors: OR, AND, AND-NOT, XOR |
| $\Delta$ | commutative, associative, $A \,\Delta\, \emptyset = A$, $A \,\Delta\, A = \emptyset$; $A \,\Delta\, X = B \iff X = A \,\Delta\, B$; $\cap$ distributes over it, $\cup$ does not |
| Identities | logic laws transfer; prove by element chasing, membership tables or region lists; same regions = equal sets |
| Counting sets | $\lvert A \cup B \rvert = \lvert A \rvert + \lvert B \rvert - \lvert A \cap B \rvert$; per element: $3^n$ pairs with $A \subseteq B$, $4^n$ chains $A \subseteq B \subseteq C$ |
:::

:::note{#further-depth title="Further depth: why there is no set of all sets" depth="deep"}
If any property defined a set, we could form $R = \{x : x \notin x\}$, the set of all sets that are not
elements of themselves, and ask whether $R \in R$. If it is, it fails its own defining property, so it is
not; if it is not, it satisfies the property, so it is. This is Russell's paradox, and it is why set
theory only lets you carve subsets out of a set you already have ($\{x \in U : \dots\}$), and why every
problem fixes a universe $U$ for complements. The same paradox, with sets replaced by subsets of $S$,
proves Cantor's theorem $|P(S)| > |S|$ for every set, finite or infinite, which Lesson 5 uses to show
that $P(\mathbb{N})$ is uncountable.
:::
