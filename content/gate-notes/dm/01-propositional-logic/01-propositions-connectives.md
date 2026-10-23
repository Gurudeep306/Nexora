---
id: propositions-connectives
subject: dm
chapter: propositional-logic
title: Propositions, connectives and truth tables
order: 1
prerequisites: []
pyq_topics: [dm/logic]
est_minutes: 60
difficulty: basic
status: published
needs_review: false
sources:
  - "Nexora's own text, examples and diagrams; every truth table, classification, translation check, PYQ key and practice answer is recomputed in content/gate-notes/_checks/dm/l1_01_connectives.py with logiclib.py."
  - "Coverage checklist only (internal digests, never copied): set A pp. 15–19, set B pp. 157–163, set C pp. 280–292, set D pp. 671–673, set E pp. 773–781. Set B's 'p → q → r is not a WFF' is recorded in _errata/dm.md."
  - "Facts checked against standard textbooks: K. H. Rosen, Discrete Mathematics and its Applications (propositions, connectives, conditional statements, translating English); C. L. Liu, Elements of Discrete Mathematics."
  - "PYQs: src/gate/questions.json (dm/logic); all twelve keys are re-derived by truth table in l1_01_connectives.py."
updated: "2026-10-23"
---

Every proof in this subject, and every "which statement is true" question in GATE, rests on a small
machine: statements that are either true or false, five ways of joining them, and a table that says
what the joined statement is worth in every situation. This lesson builds that machine carefully.
Most of it looks easy, and most of it is, with one exception that costs marks year after year: the
**implication** $p \to q$, together with the English phrases that hide it ("only if", "unless",
"necessary", "when"). We spend the most time there.

## Where this fits

This is the first lesson of Discrete Mathematics. Lesson 2 uses
the truth tables built here to prove laws and decide whether a formula is always true;
Lesson 3 uses them to decide whether an argument is valid. Chapter 2
adds quantifiers ("for all", "there exists") on top of the same connectives. If you have done
[Boolean algebra in Digital Logic](/gate/notes/dl/boolean-laws), you will recognise $\wedge$ as AND,
$\vee$ as OR and $\neg$ as NOT; the new pieces here are $\to$, $\leftrightarrow$ and translation from
English.

:::table{#radar title="GATE radar: propositions, connectives and truth tables" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 12 (1994–2024) |
| Marks | 5 one-mark, 4 two-mark, 2 NAT one-mark, 1 true/false |
| Pattern 1 | Translate an English sentence ("only if", "unless", "when") into a formula: 1998, 2002, 2017, 2024 |
| Pattern 2 | An operator given by a truth table; which formula equals $A \wedge B$ or $P \vee Q$: 2006, 2009 |
| Pattern 3 | Evaluate a formula from given facts, or say it cannot be determined: 1995, 2016 (both papers) |
| Pattern 4 | Converse and contrapositive of a statement: 1998, 2014 |
| What examiners test | That $p \to q$ is true whenever $p$ is false, that "p only if q" is $p \to q$ (not $q \to p$), that a statement equals its contrapositive but not its converse, and that "unless" means "if not" |
:::

## The idea: sentences with a truth value

:::intuition{#switch-intuition title="A statement is a switch that is either on or off" depth="standard"}
Think of a statement like "it is raining" as a light switch: in any given situation it is either on
(true) or off (false), never both, never half. A **compound** statement such as "it is raining and it
is cold" is a little circuit wired from two switches; its light comes on in some situations and not in
others. A **truth table** is simply the list of all situations (every way of setting the switches)
with the light's state written next to each.

Two facts make this powerful. First, the number of situations is finite: with $n$ switches there are
$2^n$ settings, so we can always check them all. Second, the light depends only on the switches, not
on what the sentences mean, so "it is raining and it is cold" and "$7$ is prime and $4$ is even" are
the same circuit with different labels.
:::

## Propositions

:::definition{#proposition-def term="Proposition" depth="quick"}
A **proposition** is a declarative sentence that is either **true** (T) or **false** (F), but not
both. Its truth value may be unknown to us, but it must exist.

- Propositions: "$7$ is prime" (T), "$2 + 2 = 5$" (F), "it will rain in Delhi on 1 March 2030" (one of
  the two, we just do not know which yet).
- Not propositions: "Close the door." (a command), "Is it raining?" (a question), "$x + 1 = 3$" (its truth
  depends on $x$; it becomes a proposition once $x$ is fixed, or once it is quantified, Chapter 2),
  "This sentence is false." (it cannot consistently be either).
:::

:::definition{#atomic-compound term="Atomic and compound propositions" depth="quick"}
An **atomic** proposition cannot be split into smaller propositions; we name atoms with letters $p, q,
r, \dots$ (propositional variables). A **compound** proposition is built from atoms with
**connectives**: $\neg$ (not), $\wedge$ (and), $\vee$ (or), $\to$ (if … then), $\leftrightarrow$ (if and
only if), and sometimes $\oplus$ (exclusive or). A formula built correctly by these rules is a
**well-formed formula** (WFF).
:::

:::trap{#trap-open-sentence title="An open sentence is not yet a proposition" depth="quick"}
"$x$ is a composite number" has no truth value until $x$ is known. GATE 2016 uses such sentences as
$p, q, r, s$ and then asks for the $x$ that makes a formula true: the formula is a proposition **for
each fixed $x$**, and the question is really "for which $x$ is it true". Treat $x$ as a parameter, fix
it, and evaluate.
:::

## The connectives

### Negation, conjunction and disjunction

:::intuition{#and-or-intuition title="And is strict, or is generous" depth="standard"}
"$p$ and $q$" makes a strong claim: it is true only when **both** parts are true. "$p$ or $q$" makes a
weak claim: it is true as soon as **at least one** part is true. In logic "or" is always inclusive, so
"$p$ or $q$" is also true when both are true; if you mean "one but not both", you need a different
connective, $\oplus$. "Not $p$" simply flips the value.
:::

:::definition{#basic-connectives term="Negation, conjunction, disjunction" depth="quick"}
| $p$ | $q$ | $\neg p$ | $p \wedge q$ | $p \vee q$ |
|:-:|:-:|:-:|:-:|:-:|
| T | T | F | T | T |
| T | F | F | F | T |
| F | T | T | F | T |
| F | F | T | F | F |

$p \wedge q$ is true on exactly one row (both T); $p \vee q$ is false on exactly one row (both F). Rows
are listed with T before F, starting from the all-true row; we use this order throughout the subject.
:::

:::trap{#trap-but title="'But', 'although', 'yet' all mean ∧" depth="quick"}
"It is raining **but** it is warm" asserts both parts, so it is $r \wedge w$. The word "but" adds a
note of contrast for the reader, not a different truth table. GATE 2017 hides an "and" in a long
sentence the same way.
:::

### Implication

:::intuition{#promise-intuition title="An implication is a promise" depth="standard"}
Read $p \to q$ as a promise: "**if** you score above 90, **then** you get a prize." When is the promise
broken? Only when you score above 90 and do **not** get the prize. If you score 85, the promise says
nothing about you: whether you get a prize or not, nobody can accuse the speaker of lying. So the
promise counts as kept (true) in every case except one: hypothesis true, conclusion false.

This is the single most important row in the subject. An implication with a false hypothesis is
**true** ("vacuously true"), however strange the sentence sounds: "if $2 + 2 = 5$ then the moon is
cheese" is a true implication.
:::

:::definition{#implication-def term="Implication (conditional) p → q" depth="quick"}
$p \to q$ (read "if $p$ then $q$", "$p$ implies $q$") is **false only when $p$ is true and $q$ is false**:

| $p$ | $q$ | $p \to q$ |
|:-:|:-:|:-:|
| T | T | T |
| T | F | **F** |
| F | T | T |
| F | F | T |

$p$ is the **hypothesis** (antecedent, premise), $q$ the **conclusion** (consequent). Equivalently,
$p \to q \equiv \neg p \vee q$: "either the hypothesis fails, or the conclusion holds".
:::

:::viz{#promise-viz spec="implication-promise" mode="animate" depth="standard"}
:::

:::derivation{#imp-as-or of="p → q ≡ ¬p ∨ q" depth="standard"}
Compare the two columns row by row. $\neg p \vee q$ is false only when $\neg p$ is false and $q$ is
false, i.e. when $p$ is T and $q$ is F, which is exactly the one row where $p \to q$ is false. Two
formulas that are false on the same rows (and so true on the same rows) are equivalent. **Sanity
check:** with $p$ = F both are true whatever $q$ is, matching "a false hypothesis keeps the promise".
:::

:::definition{#imp-readings term="Ways English says p → q" depth="standard"}
All of these are $p \to q$:

| English | Why it is $p \to q$ |
|:--|:--|
| if $p$ then $q$; $q$ if $p$ | the "if" clause is the hypothesis, wherever it stands |
| $p$ only if $q$ | $p$ cannot happen without $q$: whenever $p$, also $q$ |
| $p$ is sufficient for $q$ | having $p$ is enough to guarantee $q$ |
| $q$ is necessary for $p$ | you cannot have $p$ without $q$ |
| $q$ whenever $p$; $q$ when $p$ | every $p$-situation is a $q$-situation |
| $q$ unless $\neg p$ | see the "unless" section below |

The key reversal: "$p$ **if** $q$" is $q \to p$, but "$p$ **only if** $q$" is $p \to q$.
:::

:::theorem{#only-if-theorem name="'p only if q' is p → q" depth="standard"}
The sentence "$p$ only if $q$" is true in exactly the situations where $p \to q$ is true.
:::

:::proof{#proof-only-if of="the reading of 'only if'" depth="standard"}
**Idea first:** "only if" names a condition that must hold whenever $p$ does.

"$p$ only if $q$" says that $p$ can be true only in situations where $q$ is true. It is violated
exactly when $p$ is true while $q$ is false. That is the single false row of $p \to q$, and the
sentence is not violated on the other three rows (if $p$ is false, nothing has been claimed; if $q$ is
true, the condition is met). Same false rows, so the same proposition.
:::

:::trap{#trap-only-if title="Reading 'only if' as 'if'" depth="quick"}
"I stay only if you go" is $\text{stay} \to \text{go}$, not $\text{go} \to \text{stay}$. Examiners
offer "If you go then I stay" as a distractor; that is the **converse**. A quick test: "I stay only if
you go" forbids exactly one situation, me staying while you do not go.
:::

### The biconditional and exclusive or

:::intuition{#iff-intuition title="If and only if: the two sides agree" depth="standard"}
"$p$ if and only if $q$" is two promises at once, $p \to q$ and $q \to p$. Together they say that $p$
and $q$ always have the same truth value: both true or both false. Exclusive or is the opposite: true
when the two sides **disagree**.
:::

:::definition{#iff-xor-def term="Biconditional p ↔ q and exclusive or p ⊕ q" depth="quick"}
| $p$ | $q$ | $p \leftrightarrow q$ | $p \oplus q$ |
|:-:|:-:|:-:|:-:|
| T | T | T | F |
| T | F | F | T |
| F | T | F | T |
| F | F | T | F |

$p \leftrightarrow q \equiv (p \to q) \wedge (q \to p)$, and $p \oplus q \equiv \neg(p \leftrightarrow q)$.
"Necessary and sufficient", "exactly when", "just in case" all mean $\leftrightarrow$.
:::

:::definition{#precedence term="Precedence and grouping" depth="standard"}
To save brackets we use the order (tightest first): $\neg$, then $\wedge$, then $\vee$, then $\to$, then
$\leftrightarrow$. So $\neg p \vee q \to r$ means $((\neg p) \vee q) \to r$. Implication groups to the
**right**: $p \to q \to r$ means $p \to (q \to r)$. When a question writes brackets, they override all of
this; when it does not and the reading matters, add the brackets yourself before evaluating.
:::

:::trap{#trap-assoc title="Implication is not associative" depth="quick"}
$(p \to q) \to r$ and $p \to (q \to r)$ differ: with $p = q = r = $ F, the first is $(\text{T}) \to
\text{F} = $ F, the second is $\text{F} \to (\dots) = $ T. Never regroup an implication chain.
:::

:::note{#recap-connectives title="Recap" depth="quick"}
$\neg$ flips; $\wedge$ needs both; $\vee$ needs one (inclusive); $p \to q$ is false only on T→F, so it
equals $\neg p \vee q$; "$p$ only if $q$" is $p \to q$; $\leftrightarrow$ means the sides agree, $\oplus$
that they differ.
:::

### Worked examples: the connectives

::::example{#ex-conn-easy level="easy" title="Evaluating with known values" depth="quick"}
Let $p$ = "$5$ is odd" (T), $q$ = "$5 > 7$" (F), $r$ = "$5$ is prime" (T). Find the value of $(p \wedge
\neg q) \to (q \vee \neg r)$.

:::step{why="Substitute the truth values first; then work from the innermost brackets outward."}
$p \wedge \neg q = \text{T} \wedge \text{T} = \text{T}$.
:::

:::step{why="Same for the right side: ¬r is F, and F ∨ F is F."}
$q \vee \neg r = \text{F} \vee \text{F} = \text{F}$.
:::

:::step{why="T → F is the only false row of an implication."}
$\text{T} \to \text{F} = \text{F}$.
:::

:::answer
The proposition is **false**.
:::
::::

::::example{#ex-conn-vacuous level="medium" title="A vacuously true promise" depth="standard"}
Is "if every prime is even, then $9$ is prime" true or false?

:::step{why="Identify the hypothesis and the conclusion, and find their truth values separately."}
Hypothesis: "every prime is even" is false ($3$ is an odd prime). Conclusion: "$9$ is prime" is false.
:::

:::step{why="An implication is false only when the hypothesis is true and the conclusion false. Here the hypothesis is false."}
$\text{F} \to \text{F} = \text{T}$.
:::

:::answer
**True** (vacuously). The truth of an implication does not need any connection of meaning between its
parts.
:::
::::

::::example{#ex-conn-unknown level="gate" title="When the value cannot be determined" depth="standard"}
It is known only that $\neg p \to q$ is true. Can we tell the value of $\neg p \vee (p \to q)$?

:::step{why="Rewrite the given fact without the arrow: ¬p → q ≡ ¬(¬p) ∨ q = p ∨ q."}
We know $p \vee q$ is true: the situations allowed are $(p, q) = $ (T, T), (T, F), (F, T).
:::

:::step{why="Simplify the target: p → q ≡ ¬p ∨ q, so the target is ¬p ∨ ¬p ∨ q = ¬p ∨ q."}
Target $\equiv \neg p \vee q$.
:::

:::step{why="Evaluate the target on each allowed situation."}
(T, T): T. (T, F): F. (F, T): T.
:::

:::answer
It **cannot be determined**: it is true in two of the allowed situations and false in the third. (This
is GATE 1995.)
:::
::::

::::example{#ex-conn-edge level="gate" title="Edge case: brackets change everything" depth="standard"}
For $p = $ F, $q = $ T, $r = $ F, evaluate $p \to q \to r$ and $(p \to q) \to r$.

:::step{why="Implication groups to the right, so p → q → r means p → (q → r)."}
$q \to r = \text{T} \to \text{F} = \text{F}$, then $p \to \text{F} = \text{F} \to \text{F} = \text{T}$.
:::

:::step{why="With the brackets on the left, evaluate p → q first."}
$p \to q = \text{F} \to \text{T} = \text{T}$, then $\text{T} \to r = \text{T} \to \text{F} = \text{F}$.
:::

:::answer
$p \to q \to r$ is **T** but $(p \to q) \to r$ is **F**. The unbracketed chain is a WFF with a fixed
reading (right-associative), but the two groupings are different propositions.
:::
::::

## Truth tables

:::intuition{#tt-intuition title="List every world, then let the formula vote" depth="standard"}
A truth table is a census of all possible worlds. Each row is one world (one assignment of T/F to the
variables); the formula's column records whether it holds in that world. Because the formula's value
depends only on the variables, two formulas with the same column are the same proposition in disguise,
and a formula whose column is all T holds in every world.
:::

:::definition{#tt-def term="Truth table" depth="quick"}
For a formula with $n$ distinct variables, the truth table has $2^n$ rows, one for each assignment.
Build it **column by column**: first the variables (the leftmost variable alternates slowest: T for
the first half, F for the second), then one column for every sub-formula, from the innermost outward,
ending with the whole formula.
:::

:::derivation{#rows-count of="the number of rows, 2ⁿ" depth="standard"}
Each of the $n$ variables independently takes one of 2 values, so by the product rule there are
$2 \cdot 2 \cdots 2 = 2^n$ assignments. **Sanity check:** one variable gives 2 rows (T, F), two give 4,
three give 8. A consequence used in Lesson 2: there are $2^{2^n}$ different truth-table columns, i.e.
$2^{2^n}$ different propositions in $n$ variables ($16$ for $n = 2$).
:::

:::viz{#tt-build-viz spec="truth-table-build" mode="animate" depth="standard"}
:::

:::trick{#trick-false-row title="Hunt for the false rows of an implication" depth="standard"}
To evaluate a formula whose main connective is $\to$, you do not need the whole table: it is false
exactly on the rows where the hypothesis is true and the conclusion false. Find the rows that make the
hypothesis true (often few), and check the conclusion only there.

**Why it works:** every other row is true by the definition of $\to$. **When it fails:** if the main
connective is not $\to$ (for example $(\dots \to \dots) \wedge \dots$), the shortcut applies only inside.
:::

### Worked examples: truth tables

::::example{#ex-tt-easy level="easy" title="A two-variable table" depth="quick"}
Build the truth table of $\neg p \vee (p \wedge q)$.

:::step{why="Two variables give 4 rows: TT, TF, FT, FF."}
Columns: $p$, $q$, $\neg p$, $p \wedge q$, then the whole formula.
:::

:::step{why="Fill the sub-formula columns from the definitions."}
$\neg p$: F, F, T, T. $p \wedge q$: T, F, F, F.
:::

:::step{why="The disjunction is true if either column is T."}
$\neg p \vee (p \wedge q)$: T, F, T, T.
:::

:::answer
T, F, T, T: the same column as $p \to q$ (false only on $p$ = T, $q$ = F).
:::
::::

::::example{#ex-tt-medium level="medium" title="A three-variable table" depth="standard"}
Build the column of $(p \to q) \wedge (q \to r)$ and find the rows where it is true.

:::step{why="Three variables: 8 rows, p alternating slowest."}
Rows TTT, TTF, TFT, TFF, FTT, FTF, FFT, FFF.
:::

:::step{why="p → q is false only where p = T and q = F (rows 3, 4)."}
$p \to q$: T, T, F, F, T, T, T, T.
:::

:::step{why="q → r is false only where q = T and r = F (rows 2, 6)."}
$q \to r$: T, F, T, T, T, F, T, T.
:::

:::step{why="The conjunction is true where both columns are T."}
Result: T, F, F, F, T, F, T, T.
:::

:::answer
True on rows TTT, FTT, FFT, FFF: exactly the assignments where the values never go from T down to F
along $p, q, r$.
:::
::::

::::example{#ex-tt-gate level="gate" title="Finding the x that makes a formula true (GATE 2016 style)" depth="standard"}
Let $p$: $x \in \{8, \dots, 12\}$, $q$: $x$ is composite, $r$: $x$ is a perfect square, $s$: $x$ is prime.
For which integers $x \ge 2$ is $\neg((p \to q) \wedge (\neg r \vee \neg s))$ true?

:::step{why="Push the outer ¬ inside with De Morgan (¬(A ∧ B) = ¬A ∨ ¬B), and use ¬(p → q) ≡ p ∧ ¬q."}
The formula is $(p \wedge \neg q) \vee (r \wedge s)$.
:::

:::step{why="r ∧ s asks for a prime that is a perfect square; a perfect square k² with k ≥ 2 has the factor k, so it is never prime."}
$r \wedge s$ is false for every $x$.
:::

:::step{why="p ∧ ¬q asks for x in 8…12 that is not composite; for x ≥ 2 'not composite' means prime."}
Among $8, 9, 10, 11, 12$ only $11$ is prime.
:::

:::answer
$x = 11$, and no other value.
:::
::::

::::example{#ex-tt-edge level="gate" title="Edge case: a formula with a variable that does not matter" depth="standard"}
How many rows of the truth table of $(p \wedge q) \vee (p \wedge \neg q)$ are true, and what does that
tell you?

:::step{why="Two variables: 4 rows. Compute both disjuncts."}
$p \wedge q$: T, F, F, F. $p \wedge \neg q$: F, T, F, F.
:::

:::step{why="Disjunction of the two columns."}
Result: T, T, F, F, the same as the column of $p$.
:::

:::answer
2 true rows; the formula is equivalent to $p$ alone, so $q$ does not affect it. A table may list a
variable whose value is irrelevant; the column shows it (rows that differ only in $q$ agree).
:::
::::

:::note{#recap-tt title="Recap" depth="quick"}
$n$ variables, $2^n$ rows, T before F with the first variable slowest; one column per sub-formula,
inside out. Same column means equivalent. For an implication, look only for rows with a true
hypothesis.
:::

## Converse, inverse and contrapositive

:::intuition{#square-intuition title="Four ways to rearrange a promise" depth="standard"}
From "if it rains, the ground is wet" you can build three relatives by swapping and negating:
"if the ground is wet, it rained" (converse), "if it does not rain, the ground is not wet" (inverse),
"if the ground is not wet, it did not rain" (contrapositive). Only the contrapositive says the same
thing as the original: if the ground is dry, it cannot have rained, because rain would have made it
wet. The converse is a different claim (a sprinkler can wet the ground).
:::

:::definition{#variants-def term="Converse, inverse, contrapositive" depth="quick"}
For the implication $p \to q$:

| Name | Formula | Equivalent to the original? |
|:--|:--|:--|
| converse | $q \to p$ | no |
| inverse | $\neg p \to \neg q$ | no |
| contrapositive | $\neg q \to \neg p$ | **yes** |

The converse and the inverse are contrapositives of each other, so they are equivalent to each other.
:::

:::theorem{#contrapositive-theorem name="An implication equals its contrapositive" depth="standard"}
$p \to q \equiv \neg q \to \neg p$, and $q \to p \equiv \neg p \to \neg q$; but $p \to q \not\equiv q \to p$.
:::

:::proof{#proof-contrapositive of="the contrapositive theorem" depth="standard"}
**Idea first:** both formulas are false on the same single row.

$\neg q \to \neg p$ is false only when $\neg q$ is T and $\neg p$ is F, i.e. $q$ = F and $p$ = T: the same
row where $p \to q$ is false. Equal false rows, so they are equivalent. Applying this to the
implication $q \to p$ gives $q \to p \equiv \neg p \to \neg q$. Finally $p \to q$ and $q \to p$ differ on the
row $p$ = T, $q$ = F (the first is F, the second T), so they are not equivalent.
:::

:::viz{#square-viz spec="implication-square" mode="animate" depth="standard"}
:::

:::trick{#trick-contra title="Flip and negate, and you get it for free" depth="standard"}
When a question gives two English sentences and asks whether one implies the other, rewrite both as
$A \to B$ and check whether one is the other's contrapositive (swap the sides **and** negate both).

**Why it works:** contrapositives are equivalent, so each implies the other. **When it fails:** if the
sides are only swapped (converse) or only negated (inverse), the two are independent claims; then
test them on the row $A$ = T, $B$ = F.
:::

### Worked examples: converse and contrapositive

::::example{#ex-var-easy level="easy" title="Naming the variants" depth="quick"}
Write the converse, inverse and contrapositive of "if $n$ is divisible by $6$, then $n$ is even".

:::step{why="Converse swaps the two sides."}
Converse: if $n$ is even, then $n$ is divisible by $6$ (false: $n = 4$).
:::

:::step{why="Inverse negates both sides without swapping."}
Inverse: if $n$ is not divisible by $6$, then $n$ is not even (false: $n = 4$ again).
:::

:::step{why="Contrapositive swaps and negates."}
Contrapositive: if $n$ is not even, then $n$ is not divisible by $6$ (true).
:::

:::answer
The original and the contrapositive are true; the converse and the inverse are false, and they fail on
the same example, as they must (they are equivalent to each other).
:::
::::

::::example{#ex-var-medium level="medium" title="Converse of an 'only if' sentence (GATE 1998)" depth="standard"}
What is the converse of "I stay only if you go"?

:::step{why="'p only if q' is p → q; here p = I stay, q = you go."}
The statement is $\text{stay} \to \text{go}$.
:::

:::step{why="The converse swaps the sides."}
Converse: $\text{go} \to \text{stay}$.
:::

:::step{why="Translate back: 'if you go then I stay', which can also be written 'I stay if you go'."}
"I stay if you go."
:::

:::answer
"I stay if you go." The option "if I stay then you go" is the original statement, and "if you do not go
then I do not stay" is its contrapositive (also the original).
:::
::::

::::example{#ex-var-gate level="gate" title="Two statements that are contrapositives (GATE 2014)" depth="standard"}
P: "good mobile phones are not cheap"; Q: "cheap mobile phones are not good". Does P imply Q, Q imply
P, or both?

:::step{why="Write each 'all X are Y' sentence as an implication about one phone: X → Y."}
P: $g \to \neg c$. Q: $c \to \neg g$.
:::

:::step{why="The contrapositive of g → ¬c is ¬¬c → ¬g, i.e. c → ¬g."}
Q is the contrapositive of P.
:::

:::answer
They are equivalent, so P implies Q, Q implies P, and P is equivalent to Q: all three claims hold.
:::
::::

::::example{#ex-var-edge level="gate" title="Edge case: is the inverse ever implied?" depth="standard"}
Does $p \to q$ logically imply its inverse $\neg p \to \neg q$?

:::step{why="Implication between formulas means: every row making the first true makes the second true. Look for a row where p → q is T and the inverse is F."}
The inverse is false when $\neg p$ = T and $\neg q$ = F, i.e. $p$ = F, $q$ = T.
:::

:::step{why="Check the original on that row."}
$p \to q = \text{F} \to \text{T} = \text{T}$.
:::

:::answer
**No**: on $p$ = F, $q$ = T the original holds and the inverse fails. The only variant implied (both
ways) is the contrapositive.
:::
::::

:::note{#recap-variants title="Recap" depth="quick"}
Contrapositive ($\neg q \to \neg p$) = original. Converse ($q \to p$) = inverse ($\neg p \to \neg q$), and
neither equals the original. To compare, test the row $p$ = T, $q$ = F.
:::

## From English to logic

:::intuition{#translate-intuition title="Find the atoms, find the glue, then ask what is forbidden" depth="standard"}
Translation goes in three moves. First, cut the sentence into its smallest claims and name them
($p$: it is raining …). Second, find the glue words (and, or, if, only if, unless, but) and turn each
into a connective. Third, and this is the check that catches mistakes, ask **which situation the
sentence forbids**. An implication forbids exactly one combination; if your formula forbids a
different one, you have the direction wrong.
:::

:::definition{#unless-def term="'Unless' means 'if not'" depth="standard"}
"$q$ unless $p$" means "if not $p$, then $q$": $\neg p \to q$, which is equivalent to $p \vee q$. It
forbids only the situation where $p$ fails and $q$ fails as well.

- "I will fail unless I study": $\neg \text{study} \to \text{fail}$, i.e. $\text{study} \vee \text{fail}$.
- "If $X$ then $Y$ unless $Z$": the promise "if $X$ then $Y$" holds unless $Z$, so
  $\neg Z \to (X \to Y)$, which equals $(X \wedge \neg Z) \to Y$ (exportation: Lesson 2).

Some speakers hear "unless" as "if and only if not"; standard logic, and GATE, use the one-way reading.
:::

:::viz{#unless-viz spec="unless-decoder" mode="animate" depth="standard"}
:::

:::definition{#necessary-sufficient term="Necessary and sufficient conditions" depth="standard"}
- "$p$ is **sufficient** for $q$": $p \to q$ (having $p$ is enough).
- "$p$ is **necessary** for $q$": $q \to p$ (no $q$ without $p$).
- "$p$ is necessary and sufficient for $q$": $p \leftrightarrow q$.
- "$q$ when $p$", "$q$ whenever $p$": $p \to q$. "Cannot $q$ when $p$": $p \to \neg q$.
- "Neither $p$ nor $q$": $\neg p \wedge \neg q$.
:::

:::trap{#trap-necessary title="Necessary points backwards" depth="quick"}
"Oxygen is necessary for fire" is $\text{fire} \to \text{oxygen}$, not $\text{oxygen} \to \text{fire}$
(oxygen alone does not make fire). The necessary condition is always the **conclusion** of the
implication.
:::

:::trick{#trick-forbidden title="The forbidden-situation test" depth="standard"}
For each option, find the one situation it forbids (the false row of the implication), and compare
with what the English sentence forbids. "Fail grade cannot be given when a student scores more than
50%" forbids "scores > 50% **and** gets a fail", so the formula must be false exactly there: $q \to \neg
p$.

**Why it works:** an implication $A \to B$ is false exactly when $A \wedge \neg B$. **When it fails:** for
sentences with several clauses, apply it clause by clause, after bracketing the sentence.
:::

### Worked examples: translation

::::example{#ex-tr-easy level="easy" title="'Only if' and 'if'" depth="quick"}
Let $a$ = "you can board", $t$ = "you have a ticket". Translate (i) "you can board only if you have a
ticket", (ii) "you can board if you have a ticket".

:::step{why="'p only if q' is p → q, with p the clause before 'only if'."}
(i) $a \to t$.
:::

:::step{why="'p if q' is q → p: the 'if' clause is the hypothesis."}
(ii) $t \to a$.
:::

:::answer
(i) $a \to t$, (ii) $t \to a$: converses of each other. (i) forbids boarding without a ticket; (ii)
forbids holding a ticket and being refused.
:::
::::

::::example{#ex-tr-medium level="medium" title="A long sentence (GATE 2017)" depth="standard"}
$p$: it is raining, $q$: it is cold, $r$: it is pleasant. Translate "it is not raining and it is
pleasant, and it is not pleasant only if it is raining and it is cold".

:::step{why="The main 'and' joins two clauses; translate each separately."}
First clause: $\neg p \wedge r$.
:::

:::step{why="'X only if Y' is X → Y, with X = it is not pleasant and Y = it is raining and cold."}
Second clause: $\neg r \to (p \wedge q)$.
:::

:::step{why="Join with ∧ (the sentence asserts both)."}
$(\neg p \wedge r) \wedge (\neg r \to (p \wedge q))$.
:::

:::answer
$(\neg p \wedge r) \wedge (\neg r \to (p \wedge q))$. The tempting second clause $(p \wedge q) \to \neg r$
reverses the "only if". (In this particular sentence the first clause already forces $p$ = F and $r$ =
T, so the whole formula happens to come out equal to $\neg p \wedge r$ either way; but a translation is
judged clause by clause, and $\neg r \to (p \wedge q)$ is the faithful one.)
:::
::::

::::example{#ex-tr-gate level="gate" title="'If X then Y unless Z' (GATE 2002)" depth="standard"}
Which formula represents "if $X$ then $Y$ unless $Z$"?

:::step{why="Bracket the sentence: the 'unless Z' qualifies the whole promise 'if X then Y'."}
$(\text{if } X \text{ then } Y) \text{ unless } Z$.
:::

:::step{why="'A unless Z' is ¬Z → A."}
$\neg Z \to (X \to Y)$.
:::

:::step{why="Exportation: A → (B → C) ≡ (A ∧ B) → C. Here A = ¬Z, B = X, C = Y."}
$(X \wedge \neg Z) \to Y$.
:::

:::answer
$(X \wedge \neg Z) \to Y$: the sentence forbids only "$X$ true, $Z$ false, $Y$ false".
:::
::::

::::example{#ex-tr-edge level="gate" title="Edge case: 'cannot … when' (GATE 2024)" depth="standard"}
$p$: fail grade can be given; $q$: the student scores more than 50%. Translate "fail grade cannot be
given when the student scores more than 50% marks".

:::step{why="'B when A' is A → B. The condition (A) is 'scores more than 50%' = q."}
Hypothesis $q$.
:::

:::step{why="The conclusion is 'fail grade cannot be given' = ¬p."}
$q \to \neg p$.
:::

:::step{why="Check with the forbidden situation: the sentence forbids scoring > 50% and getting a fail grade, i.e. q ∧ p; q → ¬p is false exactly when q ∧ p."}
The forbidden rows match.
:::

:::answer
$q \to \neg p$. (Its contrapositive $p \to \neg q$ is equally correct, but $p \to q$ and $\neg p \to q$ forbid
different situations.)
:::
::::

:::note{#recap-translate title="Recap" depth="quick"}
"$p$ only if $q$" = $p \to q$; "$p$ if $q$" = $q \to p$; "$q$ unless $p$" = $\neg p \to q$ = $p \vee q$;
necessary = conclusion; "cannot $B$ when $A$" = $A \to \neg B$. Always check by the forbidden situation.
:::

## Operators defined by a truth table

:::intuition{#custom-intuition title="A new symbol is just a new column" depth="standard"}
Examiners sometimes invent a connective, give its four-row table, and ask which combination of it
equals $\wedge$ or $\vee$. Do not memorise anything: first rewrite the new symbol with connectives you
know (read off its false rows), then simplify each option. Every binary connective is one of the 16
possible columns, so it can always be written with $\neg$, $\wedge$, $\vee$.
:::

:::definition{#custom-def term="Reading a new connective from its table" depth="standard"}
If a binary operator $\odot$ is false on exactly one row, it is an implication-like connective: the
false row $(a, b)$ tells you which. For example, the table T, T, F, T (false only at $A$ = F, $B$ = T)
gives $A \odot B \equiv \neg(\neg A \wedge B) \equiv A \vee \neg B \equiv B \to A$. In general, write the
negation of the false rows (CNF, Lesson 2) or the disjunction of the true rows (DNF).
:::

:::viz{#custom-viz spec="custom-operator" mode="animate" depth="standard"}
:::

### Worked examples: custom operators

::::example{#ex-op-easy level="easy" title="Rewriting an operator" depth="quick"}
$P \square Q$ is F only when $P$ = F and $Q$ = T. Write it with $\neg$ and $\vee$.

:::step{why="An operator false on exactly one row is the disjunction that fails on that row. The row P = F, Q = T fails P ∨ ¬Q."}
$P \square Q \equiv P \vee \neg Q$.
:::

:::step{why="Check the other rows: TT gives T ∨ F = T; TF gives T; FF gives F ∨ T = T."}
All three other rows are T.
:::

:::answer
$P \square Q \equiv P \vee \neg Q \equiv Q \to P$.
:::
::::

::::example{#ex-op-medium level="medium" title="Which form gives P ∨ Q? (GATE 2009)" depth="standard"}
With $\square$ as above, which of $\neg Q \square \neg P$, $P \square \neg Q$, $\neg P \square Q$, $\neg P \square
\neg Q$ equals $P \vee Q$?

:::step{why="Use x □ y ≡ x ∨ ¬y and substitute each option."}
$\neg Q \square \neg P \equiv \neg Q \vee P$; $P \square \neg Q \equiv P \vee Q$.
:::

:::step{why="The remaining two for completeness."}
$\neg P \square Q \equiv \neg P \vee \neg Q$; $\neg P \square \neg Q \equiv \neg P \vee Q$.
:::

:::answer
$P \square \neg Q$.
:::
::::

::::example{#ex-op-gate level="gate" title="Getting ∧ from an operator (GATE 2006)" depth="standard"}
$A \odot B$ has the table T, T, F, T (rows TT, TF, FT, FF). Which of $\sim A \odot B$, $\sim(A \odot \sim
B)$, $\sim(\sim A \odot \sim B)$, $\sim(\sim A \odot B)$ equals $A \wedge B$?

:::step{why="Read the operator: false only at A = F, B = T, so A ⊙ B ≡ A ∨ ¬B."}
$x \odot y \equiv x \vee \neg y$.
:::

:::step{why="To get a conjunction we need a negated disjunction (De Morgan): ¬(¬A ∨ ¬B) = A ∧ B. Find the option that produces ¬A ∨ ¬B inside the ¬."}
$\sim A \odot B \equiv \neg A \vee \neg B$.
:::

:::step{why="Negate it."}
$\sim(\sim A \odot B) \equiv \neg(\neg A \vee \neg B) \equiv A \wedge B$.
:::

:::answer
$\sim(\sim A \odot B)$. (Option A, without the outer $\sim$, is NAND; the other two give $\neg A \wedge \neg B$ and
$A \wedge \neg B$.)
:::
::::

::::example{#ex-op-edge level="gate" title="Edge case: exactly two of three (GATE 2014)" depth="standard"}
Which formula is true when exactly two of $p, q, r$ are true: $(\neg(p \leftrightarrow q) \wedge r) \vee (p
\wedge q \wedge \neg r)$ or $((p \leftrightarrow q) \wedge r) \vee (p \wedge q \wedge \neg r)$?

:::step{why="Split by r. If r is true, exactly one of p, q must be true: that is p ⊕ q = ¬(p ↔ q)."}
$r$ = T needs $\neg(p \leftrightarrow q)$.
:::

:::step{why="If r is false, both p and q must be true."}
$r$ = F needs $p \wedge q$.
:::

:::step{why="Check the other formula on p = q = r = T: (T ∧ T) ∨ F = T, but three are true. It fails."}
The $(p \leftrightarrow q)$ version is wrong.
:::

:::answer
$(\neg(p \leftrightarrow q) \wedge r) \vee (p \wedge q \wedge \neg r)$; it is true on exactly the three rows
TTF, TFT, FTT. ("Exactly two" is about the count, so test the all-true row too.)
:::
::::

:::note{#recap-custom title="Recap" depth="quick"}
Rewrite an invented operator from its false row(s); then substitute each option and simplify with De
Morgan. For "exactly $k$ true" conditions, split on one variable and test the boundary rows.
:::

## Try it: the Truth Table Lab

Type any formula (use the buttons or write `->`, `<->`, `&`, `|`, `~`), watch its table fill, and read
the classification. Try `p -> q -> r` against `(p -> q) -> r`, or define an operator by its four
outputs and test the GATE 2006 options.

:::lab{#lab-tt lab="truth-table" tab="table" depth="standard"}
:::

## GATE questions on this lesson

All twelve previous-year questions. Try each before opening the solution.

:::pyq{id="cse-1994-a-3-13" tests="implication-def,iff-xor-def,tt-def" depth="standard"}
:::

:::pyq{id="cse-1995-a-44" tests="imp-as-or,ex-conn-unknown" depth="standard"}
:::

:::pyq{id="cse-1998-a-5" tests="variants-def,imp-readings,trap-only-if" depth="standard"}
:::

:::pyq{id="cse-2002-a-8" tests="unless-def,ex-tr-gate" depth="standard"}
:::

:::pyq{id="cse-2006-cs-28" tests="custom-def,ex-op-gate" depth="standard"}
:::

:::pyq{id="cse-2009-cs-24" tests="custom-def,ex-op-medium" depth="standard"}
:::

:::pyq{id="cse-2014-1-cs-53" tests="iff-xor-def,ex-op-edge" depth="standard"}
:::

:::pyq{id="cse-2014-3-cs-1" tests="contrapositive-theorem,ex-var-gate" depth="standard"}
:::

:::pyq{id="cse-2016-1-cs-1" tests="trap-open-sentence,ex-tt-gate" depth="standard"}
:::

:::pyq{id="cse-2016-2-cs-1" tests="implication-def,tt-def,trick-false-row" depth="standard"}
:::

:::pyq{id="cse-2017-2-cs-11" tests="imp-readings,ex-tr-medium,trap-but" depth="standard"}
:::

:::pyq{id="cse-2024-2-cs-2" tests="necessary-sufficient,trick-forbidden,ex-tr-edge" depth="standard"}
:::

## Practice

Our own questions in GATE formats: warm-ups first, then exam-level questions, then two that need care.

:::practice{id="nx-dm-01-01-q01" depth="standard"}
:::

:::practice{id="nx-dm-01-01-q02" depth="standard"}
:::

:::practice{id="nx-dm-01-01-q03" depth="standard"}
:::

:::practice{id="nx-dm-01-01-q04" depth="standard"}
:::

:::practice{id="nx-dm-01-01-q05" depth="standard"}
:::

:::practice{id="nx-dm-01-01-q06" depth="standard"}
:::

:::practice{id="nx-dm-01-01-q07" depth="standard"}
:::

:::practice{id="nx-dm-01-01-q08" depth="standard"}
:::

:::practice{id="nx-dm-01-01-q09" depth="standard"}
:::

:::practice{id="nx-dm-01-01-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Propositions and connectives on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Proposition | a sentence that is T or F (not a question, command or open sentence) |
| Truth table | $2^n$ rows for $n$ variables; one column per sub-formula |
| $\wedge$ / $\vee$ | $\wedge$ true only on TT; $\vee$ false only on FF (inclusive) |
| $p \to q$ | false only when $p$ = T, $q$ = F; $\equiv \neg p \vee q$ |
| Readings | "if $p$ then $q$" = "$p$ only if $q$" = "$q$ is necessary for $p$" = "$p$ is sufficient for $q$" |
| Unless | "$q$ unless $p$" = $\neg p \to q$ = $p \vee q$ |
| Variants | contrapositive $\neg q \to \neg p$ ≡ original; converse ≡ inverse ≢ original |
| $\leftrightarrow$ / $\oplus$ | sides agree / sides differ; $p \oplus q \equiv \neg(p \leftrightarrow q)$ |
| Grouping | $\neg > \wedge > \vee > \to > \leftrightarrow$; $p \to q \to r = p \to (q \to r)$ |
| New operators | rewrite from the false rows, then simplify each option |
:::

:::note{#further-depth title="Further depth: why 'vacuous truth' is the right choice" depth="deep"}
Defining F → F and F → T as true is not an arbitrary convention. We want "for every integer $n$, if
$n$ is divisible by 4 then $n$ is even" to be true. Instantiating at $n = 3$ gives "if 3 is divisible by
4 then 3 is even", F → F; at $n = 2$, F → T. If either of those rows were false, the general statement
would be false because of numbers it was never about. The truth table of $\to$ is the only one that
makes universal statements like this behave, which is why every logic textbook (and every proof
assistant) uses it.
:::
