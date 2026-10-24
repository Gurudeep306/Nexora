---
id: loop-algorithms
subject: pds
chapter: c-foundations
title: "Loop algorithms, invariants and correctness"
order: 3
prerequisites: [types-operators]
pyq_topics: [pds/c]
est_minutes: 70
difficulty: core
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every C output, loop count, invariant check and PYQ key is produced by compiling and running the program with the system C compiler in content/gate-notes/_checks/pds/l1_03_loop_algorithms.py (the Pascal and pseudo-code questions are simulated in Python or translated to C)."
  - "Coverage checklist only (internal digests, never copied): set B pp. 156–158 and 231–234, set C pp. 297–306, set E p. 543."
  - "Facts checked against: ISO/IEC 9899:2011 (C11) §6.5, §6.8.5; B. W. Kernighan and D. M. Ritchie, The C Programming Language (2nd ed.), chapters 1–3; D. E. Knuth, The Art of Computer Programming vol. 1 §1.1–1.2 (Euclid's algorithm, induction) and vol. 2 §4.5.3 and §4.6.3 (Euclid's step count, powers); Cormen, Leiserson, Rivest and Stein, Introduction to Algorithms, §2.1 (loop invariants) and §31.2 (gcd); D. Gries, The Science of Programming, chapter 11 (invariants and bound functions)."
  - "PYQs: src/gate/questions.json (cse-1991-a-1-vi, cse-1991-a-3-viii, cse-1993-ii-a-7-4, cse-1995-a-28, cse-2003-cs-1, cse-2004-cs-32, cse-2004-cs-41, cse-2004-cs-42, cse-2015-1-cs-33, cse-2016-2-cs-35, cse-2017-2-cs-37, cse-2020-cs-48, cse-2021-1-cs-48, cse-2024-1-cs-38, cse-2025-1-cs-53, cse-2025-2-cs-23); every key is re-derived by running the code."
updated: "2026-10-24"
---

*C foundations, lesson 3 of 7.* A loop is the only part of a program that can run for a long time, and
it is also the part that is hardest to get right: one wrong comparison and it stops one step early, runs
for ever, or quietly computes something else. GATE asks two kinds of loop questions. The first kind
shows a short loop and asks **what it computes**: the greatest common divisor, a power, a square root,
$e^x$, the digits of a number in reverse. The second kind asks **why it is right**: which condition stays
true on every pass (the *loop invariant*), which condition holds when it ends (the *postcondition*), and
which starting values make it end at all. This lesson answers both kinds with one tool. It first proves
the **loop-correctness theorem**: an invariant that is true at the start and survives every pass, together
with the exit condition and a quantity that keeps shrinking, forces the right result. Then it applies the
theorem to every classic loop GATE has used: Euclid's subtraction GCD, fast exponentiation, Horner's rule,
digit extraction and reversal, division by repeated subtraction, integer and Newton square roots, series
sums, swapping without a temporary, and loops whose result has a closed form. Each loop gets its
invariant, a proof, a trace, and the ways it can fail.

## Where this fits

This lesson needs the integer arithmetic of [types, operators and expressions](lesson:types-operators):
integer division that truncates, `%` and its sign, unsigned wrap-around and the fact that signed overflow
is undefined. It also uses the loop statements themselves (`while`, `do`–`while`, `for`, and the way to
count how many times they run), which Lesson 2 (control flow and loop tracing) covers in detail; here
the focus moves from *how many times* a loop runs to *what it achieves*. The invariant method returns in
Chapter 3 (recursion), where an inductive proof about a recursive function is the same argument as an
invariant proof about a loop, and in Chapter 4, where binary search, merging and array rotation are proved
correct the same way. The sentence to keep from this lesson: **a loop is correct when some statement is
true before the first test, stays true across every pass, still holds when the guard fails, and together
with the failed guard says exactly what you wanted; and it ends because some non-negative integer
quantity shrinks on every pass.**

:::table{#radar title="GATE radar: loop algorithms and invariants" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 16 (1991 ×2, 1993, 1995, 2003, 2004 ×3, 2015, 2016, 2017, 2020, 2021, 2024, 2025 ×2) |
| Marks | mostly 2-mark MCQs and NATs; 1-mark MCQ (2003) and NAT (2025 set 2); older fill-ins and multiple-choice |
| Pattern 1 | "What does this loop compute?": GCD by subtraction (1995, 2004, 2025: 21), Heron's square root (2004), $e^x$ (2003), $\lfloor\sqrt N\rfloor + 1$ (1991) |
| Pattern 2 | "Which condition is the invariant / postcondition?": $X^Y = res \cdot a^b$ (2016), digit reversal (2004), $x = qy + r \wedge r < y$ (2015), $i$ even (1991) |
| Pattern 3 | "Which precondition makes it correct and terminate?": division by subtraction needs $q = 0$, $r = x$, $y > 0$ (2017) |
| Pattern 4 | Trace to a number: binary exponentiation (2020: 81), Horner (2021: 1023), alternate digits (2025: 46), a closed form (2024) |
| Pattern 5 | Swapping two variables with `+` and `-` (1993) |
| What examiners test | an invariant that is true only at the start or only at the end; a missing precondition ($y > 0$, $q = 0$); off-by-one at the exit ($\lfloor\sqrt N\rfloor$ versus $\lfloor\sqrt N\rfloor + 1$); recognising GCD, power, Horner and series loops by shape |
:::

## What it means for a loop to be correct

:::intuition{#invariant-intuition title="A promise that every lap keeps" depth="standard"}
Imagine a cashier counting a large pile of coins into bags of 100. At any moment, whether after the first
bag or the fortieth, one statement is true: *(coins in the bags) + (coins still in the pile) = the
original amount*. Putting one more coin in a bag cannot break that sentence, because one coin leaves the
pile exactly when one enters a bag. The cashier does not need to remember the history of the counting to
trust it; the sentence alone, together with "the pile is now empty", proves that the bags hold everything.

A **loop invariant** is that kind of sentence about a loop's variables. It says nothing about which pass
we are on; it is a promise that every pass keeps. The skill this lesson teaches is to find the promise,
check that the first pass starts with it, check that one pass cannot break it, and then read off the
result from "the promise holds and the loop has stopped".
:::

:::definition{#invariant-def term="Precondition, postcondition and loop invariant" depth="standard"}
Write a loop as `init; while (B) S;`, where `B` is the **guard** and `S` the **body** (a `for` loop
`for (init; B; step) S` is the same with `step` at the end of the body).

- The **precondition** $P$ is what we may assume about the inputs before `init` runs (for example
  "$x > 0$ and $y > 0$").
- The **postcondition** $Q$ is what we want to be true after the loop ends (for example "$n = \gcd(x, y)$").
- A **loop invariant** $I$ is a condition on the variables that is true **every time the guard is about
  to be tested**: before the first test, and again before each later test. Since the guard is tested
  once more than the body runs, an invariant also holds after the last pass, when the guard is found false.

To use an invariant we must check three things, traditionally called:

1. **Initialisation:** $P$ followed by `init` makes $I$ true.
2. **Maintenance:** if $I$ and $B$ are both true and the body `S` runs once, $I$ is true again.
3. **Exit:** $I$ together with "not $B$" implies $Q$.

"True before every iteration" (GATE 2016's wording) and "true at the end of the $j$-th iteration, for
every $j \ge 0$" (GATE 2004's wording) describe the same moments: just before a test of the guard.
:::

:::theorem{#invariant-theorem name="The loop-correctness theorem" depth="standard"}
Let `init; while (B) S;` run in a state satisfying $P$, where evaluating $B$ has no side effects. If $I$
satisfies initialisation, maintenance and exit (as defined above), then **whenever the loop terminates**,
the final state satisfies $Q$. If, in addition, the loop is guaranteed to terminate, the program is
**totally correct**: from every state satisfying $P$ it stops, and it stops in a state satisfying $Q$.
:::

:::proof{#proof-invariant of="the loop-correctness theorem" depth="standard"}
**Idea first:** the invariant is proved for "after $k$ passes" by induction on $k$, exactly as a
statement about the natural numbers; the last pass is then just one particular $k$.

Let $s_0$ be the state just after `init`, and $s_k$ the state after the body has run $k$ times (if it
runs that often). We show by induction on $k$: *if the loop reaches state $s_k$, then $I$ holds in $s_k$.*

- *Base case, $k = 0$.* The program starts in a state satisfying $P$; by **initialisation**, `init`
  leads to a state where $I$ holds. So $I(s_0)$.
- *Inductive step.* Suppose the loop reaches $s_{k+1}$. Then it was in state $s_k$, tested the guard,
  found $B$ true, and ran the body once. By the inductive hypothesis $I(s_k)$ holds, and the test showed
  $B(s_k)$; because testing $B$ changes nothing, the body starts in a state where $I \wedge B$ holds. By
  **maintenance**, after the body $I(s_{k+1})$ holds.

Now suppose the loop terminates. A `while` loop stops only when its guard is tested and found false, so
there is some $N$ (the number of passes) such that the loop reached $s_N$ and $B(s_N)$ is false. By the
induction, $I(s_N)$ holds, so $I \wedge \neg B$ holds in $s_N$, and by **exit** $Q(s_N)$ holds. The
program's final state is $s_N$, which proves the first claim. The second claim adds termination: then
such an $N$ always exists, so every run ends in a state satisfying $Q$. ∎

**Sanity check.** The coin-counting loop `bags = 0; while (pile >= 100) { pile -= 100; bags++; }` has
$I$: $100 \cdot bags + pile = T$ (the original total) and $pile \ge 0$. Initially $bags = 0$ and
$pile = T$; one pass moves exactly 100 coins; on exit $pile < 100$. The theorem gives
$T = 100 \cdot bags + pile$ with $0 \le pile < 100$: $bags = \lfloor T/100 \rfloor$. The lesson check runs
this loop for $T = 0 \dots 1000$ and compares.
:::

Notice what the theorem does **not** say: it does not say the loop ends. A loop that runs for ever
"satisfies" every postcondition vacuously, because it never reaches the end. That second half, called
*termination*, needs a separate argument.

:::definition{#termination term="Termination: a variant (bound function)" depth="standard"}
A **variant** (or *bound function*) of a loop is an integer-valued expression $v$ in the loop's
variables such that

1. **bounded:** whenever the invariant and the guard both hold, $v \ge 0$;
2. **decreasing:** every pass of the body makes $v$ strictly smaller (by at least 1).

Typical variants: a counter's distance to its limit ($n - i$), a variable that shrinks ($r$ in a
division loop, $b$ in a power loop, $n$ when digits are removed), or a sum ($m + n$ in Euclid's
subtraction). A variant does not have to be a variable; any integer function of the state will do.
:::

:::theorem{#variant-theorem name="A variant forces termination" depth="standard"}
If a loop has an invariant $I$ and a variant $v$ (bounded under $I \wedge B$, strictly decreasing on
every pass), and $v$ has value $v_0$ when the guard is first tested, then the loop runs **at most
$v_0 + 1$ times** and in particular terminates.
:::

:::proof{#proof-variant of="the variant theorem" depth="standard"}
**Idea first:** a staircase of integers that goes down at every step and never below 0 has at most
$v_0 + 1$ steps.

Let $v_k$ be the value of $v$ just before the $(k+1)$-th test of the guard. Each pass decreases $v$ by at
least 1, so $v_k \le v_0 - k$. If the body runs for the $(k+1)$-th time, the guard was true at that test
and $I$ held (by the proof above), so by boundedness $v_k \ge 0$, hence $k \le v_0$. So the body can run
only for $k = 0, 1, \dots, v_0$: at most $v_0 + 1$ passes. ∎

**Sanity check.** In `for (i = 0; i < n; i++)` the variant $n - i$ starts at $n$ and the loop runs $n$
times, within the bound $n + 1$ (the bound is not always reached, because $v \ge 0$ is only needed while
the guard holds: here $n - i \ge 1$ whenever $i < n$).
:::

:::trick{#invariant-recipe title="Finding an invariant: generalise the postcondition" depth="standard"}
Write the postcondition, then replace a constant in it by the loop variable that moves towards that
constant. For "$s = \sum_{k=0}^{n-1} a_k$" the loop variable $i$ moves towards $n$, so try
$s = \sum_{k=0}^{i-1} a_k$; at exit $i = n$ and the invariant *becomes* the postcondition. For
"$res = X^Y$" try "$res \cdot (\text{what is still to be multiplied in}) = X^Y$", which is GATE 2016's
$X^Y = res \cdot a^b$.

**Why it works:** at exit the moving variable equals the constant, so $I \wedge \neg B$ turns into $Q$ by
substitution, and maintenance is usually easy because the body was written to move that variable one
step while repairing the rest. **When it fails:** loops that do not walk towards a constant (Euclid's
subtraction, Newton's square root) need an invariant that is *preserved* rather than *built up*, such as
"$\gcd(m, n)$ never changes" or "$x \cdot y = m$". Then look for the quantity the body is careful to leave
alone.
:::

:::trap{#trap-weak-invariant title="True at the start, or true at the end, is not an invariant" depth="standard"}
Examiners fill the options with conditions that hold **only before the loop** (such as
"$n = d_1 d_2 \dots d_m$" for the original number) or **only after it** (such as "$rev = d_m \dots d_1$"),
or that are true for one example and false for another (such as "$n \ne rev$", which fails as soon as the
remaining number and the reversed part happen to be equal). An invariant must survive *every* pass, so
test each candidate on the state after one pass and after two passes, not just at the ends.

The opposite trap is a condition that is true on every pass but **too weak** to give the result: "$i \ge 0$"
is invariant in almost every counting loop and proves nothing. The test of a useful invariant is the
exit step: $I \wedge \neg B$ must imply $Q$.
:::

:::note{#recap-invariants title="Recap" depth="quick"}
An invariant holds at every test of the guard. Prove it by initialisation (true at the first test) and
maintenance ($I \wedge B$, one pass, $I$ again); use it at exit ($I \wedge \neg B \Rightarrow Q$).
Termination needs a variant: an integer $\ge 0$ while the guard holds that shrinks every pass. Find
invariants by putting the loop variable in place of the constant in $Q$.
:::

### Worked examples: invariants and termination

::::example{#ex-running-max level="easy" title="The running maximum" depth="quick"}
Prove that `m = a[0]; for (i = 1; i < n; i++) if (a[i] > m) m = a[i];` (with $n \ge 1$) leaves
$m = \max(a[0], \dots, a[n-1])$.

:::step{why="Generalise the postcondition: replace the constant n by the loop variable i."}
Invariant $I$: $1 \le i \le n$ and $m = \max(a[0], \dots, a[i-1])$, the largest element seen so far.
:::

:::step{why="Initialisation: check I at the first test, right after init."}
$i = 1$ and $m = a[0] = \max(a[0])$. Since $n \ge 1$, also $1 \le i \le n$.
:::

:::step{why="Maintenance: assume I and the guard i < n, run one pass, including the i++."}
After the `if`, $m = \max(m, a[i]) = \max(a[0], \dots, a[i])$; then `i++` turns this into
$m = \max(a[0], \dots, a[i-1])$ for the new $i$, and $i \le n$ because the old $i$ was $< n$.
:::

:::step{why="Exit and termination: combine I with the failed guard, and name a variant."}
At exit $i \ge n$ and $i \le n$, so $i = n$ and $m = \max(a[0], \dots, a[n-1])$. The variant $n - i$
starts at $n - 1$ and falls by 1 each pass.
:::

:::answer
$m$ is the maximum, after exactly $n - 1$ passes. Notice how the exit step needed *both* halves of the
invariant: $m = \max(a[0..i-1])$ alone, without $i \le n$, would not let us conclude $i = n$.
:::
::::

::::example{#loop-invariant-1991 level="medium" title="An invariant of a Pascal loop (GATE 1991)" depth="standard"}
```pascal
if i mod 2 = 0 then
  while i >= 0 do
  begin
    i := i div 2;
    if i mod 2 <> 0 then i := i - 1
                    else i := i - 2;
  end;
```
Give a loop invariant, and say where the loop ends.

:::step{why="The outer if guarantees something about i before the first test: that is a candidate invariant."}
The loop is entered only when $i \bmod 2 = 0$: $i$ is **even** at the first test.
:::

:::step{why="Maintenance: inside the body i >= 0 holds, so div and mod act on non-negative numbers."}
Let $h = i \text{ div } 2$. If $h$ is odd, $i$ becomes $h - 1$, even. If $h$ is even, $i$ becomes $h - 2$,
even. Either way $i$ is even again before the next test.
:::

:::step{why="A variant shows the loop ends: i itself drops by at least 1 every pass while i >= 0."}
$h \le i$ and the body subtracts 1 or 2, so the new $i$ is at most $i - 1$. Also the new $i \ge -2$
(the smallest case is $h = 0$, giving $-2$).
:::

:::step{why="Exit: combine the invariant with the failed guard i < 0."}
$i$ even, $i \ge -2$ and $i < 0$ force $i = -2$. Example: $i = 10 \to 4 \to 0 \to -2$, three passes.
:::

:::answer
**$i \bmod 2 = 0$** ($i$ is even) is an invariant, the key of GATE 1991. Strengthened to "$i$ even and
$i \ge -2$" it also gives the final value: the loop always ends with $i = -2$. The lesson check simulates
the Pascal loop for every even $i$ from 0 to 1000 and confirms both.
:::
::::

::::example{#ex-strong-invariant level="gate" title="Which conditions are invariants, and which one proves the result?" depth="standard"}
For `x = 0; y = n; while (y > 0) { x = x + 3; y = y - 1; }` with $n \ge 0$, which of
(A) $x + 3y = 3n$, (B) $y \ge 0$, (C) $x \bmod 3 = 0$, (D) $x < 3n$ are invariants, and which together
prove $x = 3n$ at the end?

:::step{why="Test each candidate at the first test of the guard: x = 0, y = n."}
A: $0 + 3n = 3n$ ✓. B: $n \ge 0$ ✓. C: $0 \bmod 3 = 0$ ✓. D: $0 < 3n$ fails when $n = 0$.
:::

:::step{why="Maintenance: one pass adds 3 to x and removes 1 from y."}
A: $(x + 3) + 3(y - 1) = x + 3y$ ✓. B: the pass runs only if $y > 0$, so $y - 1 \ge 0$ ✓. C: adding 3 keeps
a multiple of 3 ✓. D: after the last pass $x = 3n$, so $x < 3n$ fails: D is not maintained.
:::

:::step{why="Exit: the failed guard says y <= 0; we need an invariant that pins y down."}
B and $y \le 0$ give $y = 0$; then A gives $x = 3n$. C alone only says $x$ is some multiple of 3.
:::

:::answer
A, B and C are invariants; D is not. The postcondition needs **A and B together**: A relates $x$ to
what is left, B makes the exit condition say "nothing is left". This is the general shape of an exit
step, and of GATE 2015's answer $x = qy + r \wedge r < y$.
:::
::::

::::example{#ex-variant-edge level="gate" title="Edge case: a loop with no obviously shrinking variable" depth="standard"}
Does `while (x != 1) x = (x % 2) ? x + 1 : x / 2;` terminate for every integer $x \ge 1$?

:::step{why="Look for a variable that decreases on every pass: x does not, because odd x grows by 1."}
From $x = 7$ the values are $7 \to 8 \to 4 \to 2 \to 1$: the first pass increases $x$, so $x$ is not a
variant.
:::

:::step{why="Two passes from an odd x > 1 give (x + 1)/2 < x; build a single-pass variant that charges odd values extra."}
Let $v = 0$ when $x = 1$, $v = 2x$ when $x$ is even, and $v = 2x + 3$ when $x > 1$ is odd. All values are
$\ge 0$.
:::

:::step{why="Check that v strictly decreases on every pass, case by case."}
Odd $x > 1$: $x \to x + 1$ (even), $v$: $2x + 3 \to 2x + 2$. Even $x = 2$: $x \to 1$, $v$: $4 \to 0$.
Even $x \ge 4$: $x \to x/2$, and $v$ goes $2x \to x$ (if $x/2$ is even) or $2x \to x + 3$ (if $x/2$ is
odd, and $x + 3 < 2x$ because $x > 3$).
:::

:::answer
Yes: $v$ is a variant, so by the variant theorem the loop ends, after at most $v_0 + 1$ passes. The lesson
check runs the compiled loop for every $x$ up to 100 000 and checks that $v$ falls on every pass. Contrast
`x = (x % 2) ? 3 * x + 1 : x / 2`, the famous Collatz loop: nobody has found a variant, and whether it
always reaches 1 is an open problem. Termination can be genuinely hard.
:::
::::

## Euclid's algorithm: GCD by repeated subtraction

:::intuition{#gcd-intuition title="Cutting squares off a rectangle" depth="standard"}
Take a rectangle 126 units wide and 105 high, and cut off the largest square you can: a 105 × 105
square, leaving a 21 × 105 strip. Keep cutting the largest possible square from what remains: 21 × 21,
again and again, until what remains is itself a square, 21 × 21. That last square's side, 21, is the
largest square tile that could have tiled the whole rectangle: it is the **greatest common divisor** of
126 and 105.

Each cut is one subtraction: "the larger side minus the smaller side". The loop of GATE 1995, 2004 and
2025 is exactly this cutting, and the invariant is the picture: whatever square tiles the remaining
rectangle also tiles the square that was cut off, so the best tile size never changes.
:::

:::definition{#gcd-subtraction term="The subtraction GCD loop" depth="standard"}
For positive integers $x$ and $y$, the **greatest common divisor** $\gcd(x, y)$ is the largest integer
that divides both. The subtraction form of Euclid's algorithm is

```c
m = x; n = y;              /* precondition: x > 0 and y > 0 */
while (m != n) {
    if (m > n) m = m - n;
    else       n = n - m;
}
/* postcondition: m == n == gcd(x, y) */
```

GATE 2004 (Q41) prints `n`, GATE 1995 writes it in Pascal and prints `X`, and GATE 2025 (set 2) writes it
as a `do`–`while` loop. Each pass replaces the larger number by the difference, so both numbers stay
positive and their sum shrinks.
:::

:::theorem{#gcd-theorem name="Subtraction keeps the gcd" depth="standard"}
(a) For integers $m > n > 0$, $\gcd(m, n) = \gcd(m - n, n)$.
(b) For $x, y > 0$ the subtraction loop terminates, after fewer than $x + y$ passes, with
$m = n = \gcd(x, y)$.
:::

:::proof{#proof-gcd of="the subtraction GCD theorem" depth="standard"}
**Idea first:** the two pairs $(m, n)$ and $(m - n, n)$ have exactly the same common divisors, so they
certainly have the same greatest one.

*(a)* If $d \mid m$ and $d \mid n$, then $d$ divides $m - n$ (write $m = da$, $n = db$; then
$m - n = d(a - b)$). Conversely, if $d \mid m - n$ and $d \mid n$, then $d$ divides their sum, which is $m$.
So the set of common divisors of $(m, n)$ equals that of $(m - n, n)$, and the largest elements agree.

*(b)* Apply the loop-correctness theorem with the invariant
$I$: $m > 0$, $n > 0$ and $\gcd(m, n) = \gcd(x, y)$.

- *Initialisation:* $m = x > 0$, $n = y > 0$, and $\gcd(m, n) = \gcd(x, y)$ trivially.
- *Maintenance:* the guard says $m \ne n$. If $m > n$, the body sets $m$ to $m - n > 0$, and by (a) the gcd
  is unchanged; if $m < n$, symmetrically $n$ becomes $n - m > 0$. So $I$ holds again.
- *Exit:* the guard fails, so $m = n$, and $\gcd(m, m) = m$; with $I$, $m = n = \gcd(x, y)$.
- *Termination:* the variant $v = m + n - 2$ is $\ge 0$ under $I$ (both are at least 1) and each pass
  subtracts $\min(m, n) \ge 1$ from the sum. By the variant theorem the loop runs at most
  $x + y - 1$ times, fewer than $x + y$. ∎

**Sanity check.** $\gcd(126, 105)$: $(126, 105) \to (21, 105) \to (21, 84) \to (21, 63) \to (21, 42) \to
(21, 21)$, five passes, result 21. The lesson check compares the compiled loop with Python's `math.gcd`
for every pair $1 \le x, y \le 60$.
:::

The animation draws that sanity check as the rectangle of the intuition: every pass of the loop cuts one
square off, and the gcd, written beside each state, never changes.

:::viz{#gcd-staircase-viz spec="gcd-staircase" mode="animate" depth="standard"}
:::

:::aside{#gcd-remainder title="Euclid with the remainder operator" depth="standard"}
A run of subtractions of the same $n$ from $m$ is a division: subtracting $n$ from $m$ until the result is
below $n$ leaves $m \bmod n$. Replacing the run by one `%` gives the usual form of Euclid's algorithm:

```c
while (n != 0) { t = m % n; m = n; n = t; }   /* now m == gcd(x, y) */
```

Its invariant is the same, $\gcd(m, n) = \gcd(x, y)$, by the same argument (a common divisor of $m$ and
$n$ divides $m - qn$). The difference is speed. Writing Euclid's divisions as $m = q_1 n + r_1$,
$n = q_2 r_1 + r_2, \dots$, the subtraction loop makes $q_1 + q_2 + \dots + q_k - 1$ passes (each quotient
is a run of subtractions; the very last run stops one early, when the numbers become equal), while the
remainder loop makes only $k$. For $(100, 1)$ that is 99 subtractions against 1 remainder; for
$(126, 105) = (1 \cdot 105 + 21,\ 5 \cdot 21)$ it is $1 + 5 - 1 = 5$ against 2. The remainder loop needs
$O(\log \min(x, y))$ passes (Lamé's theorem: consecutive Fibonacci numbers are the worst case), the
subtraction loop up to $\max(x, y) - 1$.
:::

:::trap{#trap-gcd-precondition title="The precondition x > 0, y > 0 is not decoration, and do-while is not while" depth="standard"}
With $y = 0$ the subtraction loop never ends: $m > 0 = n$, so `m = m - 0` changes nothing, for ever. With
a negative input the numbers can grow without bound. Both GATE 1995 and 2004 state "nonzero positive",
and the theorem needs it in the invariant.

The `do`–`while` form of GATE 2025 (set 2) hides a second trap: its body runs **before** the first test.
For $x = y$ the body runs once with $x > y$ false, so $y$ becomes $y - x = 0$, the test $x \ne 0$ is true,
and from then on `x = x - 0` repeats for ever. The `while` version returns $x$ at once. For the question's
inputs 126 and 105 the two forms agree (the first test would have been true anyway), and the answer is 21.
:::

:::note{#recap-gcd title="Recap" depth="quick"}
$\gcd(m, n) = \gcd(m - n, n)$ because both pairs have the same common divisors. The subtraction loop keeps
that gcd, keeps both numbers positive, shrinks $m + n$, and stops when $m = n = \gcd$. Inputs must be
positive; a `do`–`while` with equal inputs never stops. `%` collapses each run of subtractions.
:::

## Fast exponentiation: square and multiply

:::intuition{#power-intuition title="Thirteen multiplications or five?" depth="standard"}
To compute $3^{13}$ you could multiply 3 by itself twelve times. Or notice that $13 = 8 + 4 + 1$, so
$3^{13} = 3^8 \cdot 3^4 \cdot 3^1$, and the powers $3, 3^2, 3^4, 3^8$ come from squaring three times. That
is square-and-multiply: it reads the exponent in binary, squares once per binary digit, and multiplies
the result once per 1 bit. The number of multiplications grows with the **number of digits** of the
exponent, $\log_2 Y$, instead of with $Y$ itself.

The invariant is a bookkeeping identity, like the cashier's: what has already been collected in `res`,
times what is still owed, $a^b$, is always the full answer $X^Y$. Each pass moves value between the two
sides without changing the product.
:::

:::definition{#fast-power term="The square-and-multiply loop" depth="standard"}
GATE 2016 (set 2) gives this loop for $X^Y$ with positive integers $X$, $Y$:

```c
int exp(int X, int Y) {
    int res = 1, a = X, b = Y;
    while (b != 0) {
        if (b % 2 == 0) { a = a * a; b = b / 2; }   /* even: square the base, halve b */
        else            { res = res * a; b = b - 1; } /* odd: move one factor a into res */
    }
    return res;
}
```

GATE 2020 uses the other common arrangement: first write $b$'s bits into an array (lowest bit first),
then walk the bits keeping `ex` $= a^{2^i}$ and multiplying it into `tot` whenever bit $i$ is 1.
:::

:::theorem{#power-theorem name="Invariant and cost of square-and-multiply" depth="standard"}
For integers $X$ and $Y \ge 0$ (and exact arithmetic), the condition $X^Y = res \cdot a^b$ with $b \ge 0$
holds before every iteration of the GATE 2016 loop; the loop ends with $res = X^Y$, after exactly
$\lfloor \log_2 Y \rfloor + \mathrm{popcount}(Y)$ passes for $Y \ge 1$ (popcount = number of 1 bits), each
doing one multiplication.
:::

:::proof{#proof-power of="the square-and-multiply theorem" depth="standard"}
**Idea first:** both branches rewrite $a^b$ as an equal product, so the product $res \cdot a^b$ cannot
change; at the end $b = 0$ and $a^0 = 1$ leaves only $res$.

- *Initialisation:* $res = 1$, $a = X$, $b = Y$: $res \cdot a^b = X^Y$, and $b = Y \ge 0$.
- *Maintenance, $b$ even ($b \ge 2$, since $b \ne 0$):* the new values are $a' = a^2$, $b' = b/2$, and
  $res \cdot (a^2)^{b/2} = res \cdot a^b = X^Y$.
- *Maintenance, $b$ odd:* $res' = res \cdot a$, $b' = b - 1 \ge 0$, and
  $(res \cdot a) \cdot a^{b-1} = res \cdot a^b = X^Y$.
- *Exit:* $b = 0$, so $X^Y = res \cdot a^0 = res$.
- *Termination and count:* $b$ is a variant ($b/2 < b$ and $b - 1 < b$ for $b \ge 1$). In binary, an odd
  step turns the last bit from 1 to 0 and an even step deletes a final 0. Starting from $Y$ with
  $L = \lfloor \log_2 Y \rfloor + 1$ bits, of which $k = \mathrm{popcount}(Y)$ are 1, each 1 bit costs one
  odd step and each of the $L - 1$ deletions costs one even step (the leading bit is never deleted: once
  $b = 1$, the odd step makes $b = 0$ and the loop ends). Total $k + L - 1 = \lfloor \log_2 Y \rfloor +
  \mathrm{popcount}(Y)$. ∎

**Sanity check.** $Y = 11 = 1011_2$: $\lfloor \log_2 11 \rfloor + 3 = 6$ passes, and the trace
below shows six, ending with $res = 3^{11} = 177\,147$. For $Y = 2^k$ the count is $k + 1$.
:::

:::viz{#fast-power-viz spec="fast-power-trace" mode="animate" depth="standard"}
:::

:::derivation{#binary-power of="the invariant of the bit-array version (GATE 2020)" depth="standard"}
GATE 2020's `tob(b, arr)` stores the bits of $b$ lowest first, $arr[i] = $ bit $i$, and returns their
number $len$. Then `pp(a, b)` runs

```c
tot = 1; ex = a;
for (i = 0; i < len; i++) { if (arr[i] == 1) tot = tot * ex; ex = ex * ex; }
```

**Invariant** at the test with index $i$: $ex = a^{2^i}$ and $tot = a^{(b \bmod 2^i)}$, the power
contributed by the bits below position $i$. Initially $i = 0$: $ex = a$, $tot = 1 = a^0$. One pass
multiplies $tot$ by $ex = a^{2^i}$ exactly when bit $i$ is 1, so the exponent of $tot$ becomes
$(b \bmod 2^i) + \text{bit}_i \cdot 2^i = b \bmod 2^{i+1}$; and squaring gives $ex = a^{2^{i+1}}$. At exit
$i = len$ and $b < 2^{len}$, so $tot = a^{b}$. For $b = 4 = 100_2$: $len = 3$, $ex$ runs through
$3, 9, 81$, only bit 2 is 1, so $tot = 81 = 3^4$. **Sanity check:** the lesson check compares `pp(a, b)`
with $a^b$ for $a \le 4$, $b \le 14$.
:::

:::trap{#trap-power-overflow title="Options that hold once, and the square nobody needed" depth="standard"}
In GATE 2016 the wrong options are built to be true **at the first test**: with $res = 1$, $a = X$,
$b = Y$, both $X^Y = (res \cdot a)^b$ (D) and $(res \cdot a)^Y = (res \cdot X)^b$ (B) read $X^Y = X^Y$.
They break after one pass. Check every candidate on the second state too.

The bit-array version squares `ex` after **every** bit, including the last, so it computes $a^{2^{len}}$,
a number it never uses. With `int` that last square can overflow even when the answer fits:
`pp(2, 16)` returns $2^{16}$ but on the way computes $2^{16} \cdot 2^{16} = 2^{32}$, a signed overflow,
which is undefined behaviour (the lesson check catches it with the undefined-behaviour sanitizer). The
GATE 2016 loop squares only while $b$ is even and $\ge 2$, so it never makes an unneeded square.
:::

:::note{#recap-power title="Recap" depth="quick"}
Invariant $X^Y = res \cdot a^b$: squaring $a$ while halving an even $b$, or moving one $a$ into $res$ while
decrementing an odd $b$, keeps the product. Passes: $\lfloor \log_2 Y \rfloor + \mathrm{popcount}(Y)$. The
bit-array form keeps $ex = a^{2^i}$, $tot = a^{b \bmod 2^i}$; its final square is wasted and may overflow.
:::

### Worked examples: GCD and fast power

::::example{#ex-gcd-trace level="easy" title="GCD by subtraction in a do-while (GATE 2025)" depth="quick"}
```c
int x = 126, y = 105;
do {
    if (x > y) x = x - y;
    else y = y - x;
} while (x != y);
printf("%d", x);
```

:::step{why="The do-while body runs before the first test; here x > y, so x shrinks."}
$x = 126 - 105 = 21$, $y = 105$. Test $21 \ne 105$: continue.
:::

:::step{why="Now x < y, so y loses 21 on each pass until it meets x."}
$y$: $105 \to 84 \to 63 \to 42 \to 21$. After the pass that makes $y = 21$ the test $21 \ne 21$ fails.
:::

:::step{why="By the gcd theorem the common final value is gcd(126, 105); check it by factoring."}
$126 = 2 \cdot 3^2 \cdot 7$ and $105 = 3 \cdot 5 \cdot 7$, so $\gcd = 3 \cdot 7 = 21$.
:::

:::answer
**21**, after five passes. Recognising the loop as Euclid's subtraction gives the answer without the trace;
the trace is the check.
:::
::::

::::example{#ex-gcd-count level="medium" title="How many passes does the subtraction GCD make?" depth="standard"}
How many times does the body of the `while` subtraction loop run for $(x, y) = (34, 21)$, and for
$(100, 1)$?

:::step{why="Trace (34, 21): each pass subtracts the smaller from the larger."}
$(34, 21) \to (13, 21) \to (13, 8) \to (5, 8) \to (5, 3) \to (2, 3) \to (2, 1) \to (1, 1)$: seven passes,
gcd 1.
:::

:::step{why="Cross-check with the quotient formula: passes = (sum of Euclid's quotients) − 1."}
$34 = 1 \cdot 21 + 13$, $21 = 1 \cdot 13 + 8$, $13 = 1 \cdot 8 + 5$, $8 = 1 \cdot 5 + 3$, $5 = 1 \cdot 3 + 2$,
$3 = 1 \cdot 2 + 1$, $2 = 2 \cdot 1$: quotients sum to 8, minus 1 is 7 ✓.
:::

:::step{why="For (100, 1) the single quotient is 100: the loop subtracts 1 until m reaches 1."}
$(100, 1) \to (99, 1) \to \dots \to (1, 1)$: 99 passes. The remainder version needs one: $100 \bmod 1 = 0$.
:::

:::answer
7 and 99. Consecutive Fibonacci numbers (34, 21) make every quotient 1, the worst case for the remainder
loop; a huge ratio (100, 1) is the worst case for the subtraction loop. Both are checked by compiling the
loop with a pass counter.
:::
::::

::::example{#ex-power-gate level="gate" title="Which condition is the invariant? (GATE 2016)" depth="standard"}
For the `exp` loop above, which is true before every iteration: (A) $X^Y = a^b$, (B)
$(res \cdot a)^Y = (res \cdot X)^b$, (C) $X^Y = res \cdot a^b$, (D) $X^Y = (res \cdot a)^b$?

:::step{why="A small trace gives concrete states to test the options on; X = 2, Y = 3 is enough."}
States $(res, a, b)$ at the tests: $(1, 2, 3)$, then odd: $(2, 2, 2)$, then even: $(2, 4, 1)$, then odd:
$(8, 4, 0)$, where the loop stops. $X^Y = 8$.
:::

:::step{why="Evaluate each option in each state; one failure rules an option out."}
A: $a^b = 8, 4, 4, 1$: fails in the second state. B: $(res \cdot a)^Y$ versus $(res \cdot X)^b$ in state 2:
$4^3 = 64$ versus $4^2 = 16$: fails. D: $(res \cdot a)^b$ in state 2 is $4^2 = 16 \ne 8$: fails.
C: $res \cdot a^b = 8, 8, 8, 8$ ✓.
:::

:::step{why="A trace can only refute; the proof of the power theorem shows C holds for all X and Y."}
Both branches rewrite $a^b$ as an equal product ($(a^2)^{b/2}$ or $a \cdot a^{b-1}$), so $res \cdot a^b$
never changes.
:::

:::answer
**(C)** $X^Y = res \cdot a^b$. At exit $b = 0$ turns it into $res = X^Y$, which is why it is the
invariant worth having.
:::
::::

::::example{#ex-pp-gate level="gate" title="Binary exponentiation through a bit array (GATE 2020)" depth="standard"}
With `tob` and `pp` as in the derivation above, what does `pp(3, 4)` return?

:::step{why="tob writes the bits of b lowest first and counts them."}
$b = 4$: $4 \% 2 = 0$ ($arr[0] = 0$), $b = 2$; $arr[1] = 0$, $b = 1$; $arr[2] = 1$, $b = 0$. So
$arr = [0, 0, 1]$ and $len = 3$.
:::

:::step{why="Walk the bits: multiply tot by ex when the bit is 1, then square ex."}
$i = 0$: bit 0, $tot = 1$, $ex = 9$. $i = 1$: bit 0, $tot = 1$, $ex = 81$. $i = 2$: bit 1, $tot = 81$,
$ex = 6561$.
:::

:::step{why="Check against the invariant: tot = a^(b mod 2^len) = 3^4."}
$4 \bmod 8 = 4$ and $3^4 = 81$ ✓.
:::

:::answer
**81**. The function computes $a^b$; its last square (6561) is computed and thrown away.
:::
::::

::::example{#ex-power-edge level="gate" title="Edge case: exponent 0, and the overflowing last square" depth="standard"}
What do `exp(5, 0)` and `pp(5, 0)` return, and what goes wrong in `pp(2, 16)` with 32-bit `int`?

:::step{why="With b = 0 the guard of exp fails at once; the invariant's initial state is the answer."}
`exp(5, 0)`: the loop never runs, $res = 1 = 5^0$ ✓.
:::

:::step{why="tob(0, arr) runs no pass, so len = 0 and pp's loop is skipped too."}
`pp(5, 0)` returns $tot = 1$ ✓.
:::

:::step{why="Count the squares: pp squares ex once per bit, len times, the last one unused."}
$16 = 10000_2$, $len = 5$: $ex = 2, 4, 16, 256, 65536$, and after multiplying $tot$ by 65536 the loop
squares again: $65536^2 = 2^{32} > 2^{31} - 1$, a signed overflow.
:::

:::answer
1, 1, and **undefined behaviour** for `pp(2, 16)` even though $2^{16}$ fits easily. On a typical machine
the overflowed value is simply discarded and 65536 is printed, which is why the bug survives testing; the
sanitizer run in the lesson check reports it. Fix: square only `if (i + 1 < len)`.
:::
::::

## Horner's rule and digit loops

:::intuition{#horner-intuition title="Reading a number from left to right" depth="standard"}
When you read the number 4729 aloud you meet the digits left to right, but you do not know what the 4 is
worth until you have seen all four digits. A program reading digits one at a time solves this neatly:
start with 0, and for each new digit **multiply what you have by 10 and add the digit**:
$0 \to 4 \to 47 \to 472 \to 4729$. Nothing about the future is needed; each digit pushes the earlier
ones one place to the left.

That is Horner's rule, and it evaluates any polynomial: $4x^3 + 7x^2 + 2x + 9 = ((4x + 7)x + 2)x + 9$.
Run it backwards, peeling digits off the right end with `% 10` and `/ 10`, and you get the digit loops:
sums of digits, counts of digits, and the reversed number.
:::

:::definition{#horner term="Horner's rule" depth="standard"}
For coefficients $Y[0], Y[1], \dots, Y[n-1]$ (highest power first), Horner's rule evaluates
$p(x) = Y[0]x^{n-1} + Y[1]x^{n-2} + \dots + Y[n-1]$ as

```c
total = Y[0];
for (k = 1; k <= n - 1; k++) total = x * total + Y[k];
```

which is GATE 2021's `SimpleFunction`. It uses $n - 1$ multiplications and $n - 1$ additions. Evaluating
the terms separately costs $1 + 2 + \dots + (n - 1) = n(n-1)/2$ multiplications (term $Y[j]x^{n-1-j}$ needs
$n - 1 - j$ of them), or $2(n - 1) - 1$ if a running power $x^k$ is kept. For degree $d = n - 1$ that is
$d$ against $d(d+1)/2$.
:::

:::theorem{#horner-theorem name="The invariant of Horner's rule" depth="standard"}
Before the test with loop index $k$ ($1 \le k \le n$), $total = \sum_{j=0}^{k-1} Y[j]\, x^{k-1-j}$: the
polynomial formed by the first $k$ coefficients. At exit ($k = n$), $total = p(x)$.
:::

:::proof{#proof-horner of="Horner's invariant" depth="standard"}
**Idea first:** multiplying by $x$ raises every earlier term by one power; adding $Y[k]$ appends the new
lowest term.

*Initialisation:* $k = 1$, $total = Y[0] = \sum_{j=0}^{0} Y[j] x^{0}$. *Maintenance:* if
$total = \sum_{j=0}^{k-1} Y[j] x^{k-1-j}$ and $k \le n - 1$, the body gives
$x \cdot total + Y[k] = \sum_{j=0}^{k-1} Y[j] x^{k-j} + Y[k] x^0 = \sum_{j=0}^{k} Y[j] x^{k-j}$, which is the
invariant for $k + 1$. *Exit:* the loop stops at $k = n$ with $total = \sum_{j=0}^{n-1} Y[j] x^{n-1-j} =
p(x)$. *Termination:* variant $n - k$. ∎

**Sanity check.** $Y = [4, 7, 2, 9]$, $x = 10$: $4 \to 47 \to 472 \to 4729$, the number itself. GATE 2021:
ten coefficients 1 and $x = 2$ give $total = 2^9 + 2^8 + \dots + 1 = 2^{10} - 1 = 1023$.
:::

:::viz{#horner-chain-viz spec="horner-chain" mode="animate" depth="standard"}
:::

:::trick{#trick-repunit title="All coefficients equal: a geometric series" depth="standard"}
If every coefficient is 1, Horner computes $1 + x + x^2 + \dots + x^{n-1} = \frac{x^n - 1}{x - 1}$; for
$x = 2$ that is $2^n - 1$ (in binary, $n$ ones), for $x = 10$ the repunit $11\dots1$. So GATE 2021 is
$2^{10} - 1 = 1023$ without a trace.

**Why it works:** $(x - 1)(1 + x + \dots + x^{n-1})$ telescopes to $x^n - 1$. **When it fails:** when the
coefficients differ, or the count is off by one: the loop of GATE 2021 uses all ten elements $Z[0..9]$
(one before the loop, nine inside), so the exponent is 10, not 9.
:::

:::definition{#digit-loops term="Digit loops: peeling, counting and reversing" depth="standard"}
For an integer $n > 0$, `n % 10` is its last decimal digit and `n / 10` removes that digit (integer
division truncates). Every digit loop combines these two:

| Loop body (while `n > 0`) | Computes | Passes |
|:--|:--|:--|
| `count++; n /= 10;` | number of digits | $\lfloor \log_{10} n \rfloor + 1$ |
| `s += n % 10; n /= 10;` | sum of digits | same |
| `rev = rev * 10 + n % 10; n /= 10;` | the digits in reverse (GATE 2004) | same |
| `r = r * 2 + n % 2; n /= 2;` | the binary digits in reverse | $\lfloor \log_2 n \rfloor + 1$ |

To go **left to right** instead, first find $t = 10^{m-1}$ for an $m$-digit $n$ (the place value of the
leading digit); then `d = n / t` is the leading digit, `n = n % t` removes it, and `t /= 10` moves to the
next place. GATE 2025 (set 1) does exactly this.
:::

:::theorem{#reverse-theorem name="The invariant of digit reversal" depth="standard"}
Let $n = d_1 d_2 \dots d_m$ in decimal with $d_1 \ne 0$, and run `rev = 0; while (n > 0) { rev = rev * 10 +
n % 10; n = n / 10; }`. At the end of the $j$-th iteration ($0 \le j \le m$), $n = d_1 d_2 \dots d_{m-j}$
and $rev = d_m d_{m-1} \dots d_{m-j+1}$ (read as numbers; $n = 0$ when $j = m$). The loop makes exactly
$m$ passes and ends with $rev = d_m \dots d_1$.
:::

:::proof{#proof-reverse of="the reversal invariant" depth="standard"}
**Idea first:** each pass moves one digit from the right end of $n$ to the right end of $rev$, which is
Horner's rule applied to the digits taken in reverse order.

*$j = 0$:* $n$ is the whole number and $rev = 0$, the empty digit string. *From $j$ to $j + 1$ (for
$j < m$):* $n = d_1 \dots d_{m-j}$ is positive, because its leading digit $d_1 \ne 0$, so the guard holds;
$n \% 10 = d_{m-j}$; $rev \cdot 10 + d_{m-j}$ appends that digit: $d_m \dots d_{m-j+1} d_{m-j}$; and
$n / 10 = d_1 \dots d_{m-j-1}$. That is the statement for $j + 1$. *Exit:* after $m$ passes $n$ has no
digits left, $n = 0$, the guard fails, and $rev = d_m \dots d_1$. ∎

**Sanity check.** $n = 4729$: after one pass $n = 472$, $rev = 9$; after two, $47$ and $92$; then $4$ and
$927$; then $0$ and $9274$. The animation shows the same conveyor.
:::

:::viz{#digit-conveyor-viz spec="digit-conveyor" mode="animate" depth="standard"}
:::

:::derivation{#alt-digits of="what GATE 2025's gate(n) keeps" depth="standard"}
```c
newnum = turn = 0; t = 1;
while (n >= t) t *= 10;      /* t = 10^m, the first power of 10 above n */
t /= 10;                     /* t = 10^(m-1), the place of the leading digit */
while (t > 0) {
    d = n / t; n = n % t; t /= 10;
    if (turn) newnum = 10 * newnum + d;
    turn = (turn + 1) % 2;
}
```

**Invariant** of the second loop, before its $k$-th test ($1 \le k \le m + 1$): $t = 10^{m-k}$ (0 after
the last digit), $n = d_k \dots d_m$ (the digits not yet read), $turn = (k - 1) \bmod 2$, and $newnum$
holds the digits in **even** positions among $d_1, \dots, d_{k-1}$, in order. One pass reads $d = d_k$,
removes it, and appends it exactly when $turn = 1$, i.e. when $k$ is even. At exit $newnum$ is the number
formed by $d_2 d_4 d_6 \dots$. For 14362 ($m = 5$, $t = 10^4$): digits 1, 4, 3, 6, 2 with turns 0, 1, 0, 1,
0 keep 4 and 6: **46**. **Sanity check:** `gate(123456)` keeps 2, 4, 6 → 246, and the lesson check
compares the compiled function with a Python "every second digit" for every $n$ below 200 000.
:::

:::trap{#trap-digits title="Trailing zeros, negative numbers and overflow" depth="standard"}
- **Trailing zeros vanish:** reversing 120 gives 21, because the reversed digit string 021 is the number
  21. So reversal is not its own inverse: reversing 21 gives 12, not 120. The GATE 2004 invariant reads
  $rev$ as a digit string, which is why it is still true.
- **Negative inputs:** `while (n > 0)` skips them entirely (rev = 0). A loop written `while (n != 0)` would
  run, with `n % 10` negative (C's `%` takes the sign of the dividend), giving $-21$ for $-12$.
- **Overflow:** 1 000 000 003 fits in an `int`, but its reverse 3 000 000 001 does not; the last
  `rev * 10` overflows, which is undefined behaviour. In GATE 2025's first loop, `t *= 10` overflows for
  any $n \ge 10^9$ (it tries to reach $10^{10}$). The lesson check confirms both with the sanitizer.
:::

:::note{#recap-horner title="Recap" depth="quick"}
Horner: $total = x \cdot total + Y[k]$ keeps "polynomial of the first $k$ coefficients"; $d$ multiplications
for degree $d$; all-ones gives $(x^n - 1)/(x - 1)$. Digit loops peel with `% 10` and `/ 10`; reversal keeps
$n = d_1 \dots d_{m-j}$, $rev = d_m \dots d_{m-j+1}$. Left to right needs $t = 10^{m-1}$ first.
:::

### Worked examples: Horner and digits

::::example{#ex-horner-easy level="easy" title="A cubic by Horner's rule" depth="quick"}
Evaluate $4x^3 + 5x^2 + 6x + 9$ at $x = 2$ by Horner's rule, and count the multiplications.

:::step{why="Rewrite the polynomial by repeatedly factoring out x."}
$4x^3 + 5x^2 + 6x + 9 = ((4x + 5)x + 6)x + 9$.
:::

:::step{why="Evaluate from the inside out: multiply by x, add the next coefficient."}
$4 \to 4 \cdot 2 + 5 = 13 \to 13 \cdot 2 + 6 = 32 \to 32 \cdot 2 + 9 = 73$.
:::

:::step{why="A sanity check by the term-by-term method, which also shows the cost difference."}
$4 \cdot 8 + 5 \cdot 4 + 6 \cdot 2 + 9 = 32 + 20 + 12 + 9 = 73$ ✓, using $3 + 2 + 1 = 6$ multiplications.
:::

:::answer
**73**, with 3 multiplications instead of 6. For degree $d$, Horner uses $d$; the naive method
$d(d + 1)/2$.
:::
::::

::::example{#ex-horner-gate level="gate" title="Horner with all ones (GATE 2021)" depth="standard"}
`SimpleFunction(Z, 10, 2)` with $Z[i] = 1$ for $0 \le i \le 9$: what is returned?

:::step{why="The loop is Horner's rule with x = 2, so first read off the polynomial."}
$total = Z[0] \cdot 2^9 + Z[1] \cdot 2^8 + \dots + Z[9] \cdot 2^0 = 2^9 + 2^8 + \dots + 1$.
:::

:::step{why="Trace a few passes to confirm the pattern total = 2·total + 1."}
$1 \to 3 \to 7 \to 15 \to 31 \to \dots$: after the pass with index $k$, $total = 2^{k+1} - 1$.
:::

:::step{why="The loop index runs 1 … 9: nine passes after the initial total = Z[0]."}
After index 9, $total = 2^{10} - 1 = 1023$.
:::

:::answer
**1023** (the key). In binary it is ten 1 bits, one for each array element.
:::
::::

::::example{#ex-reverse-medium level="medium" title="Testing the reversal invariant's options (GATE 2004)" depth="standard"}
For $n = 4729$ ($d_1 d_2 d_3 d_4 = 4\,7\,2\,9$), check the four options of GATE 2004 at the end of the
second iteration: (A) $n = d_1 \dots d_{m-j}$ and $rev = d_m \dots d_{m-j+1}$; (B)
$n = d_{m-j+1} \dots d_m$ or $rev = d_{m-j} \dots d_1$; (C) $n \ne rev$; (D) $n = d_1 \dots d_m$ or
$rev = d_m \dots d_1$.

:::step{why="Get the actual state after j = 2 passes."}
Pass 1: $rev = 9$, $n = 472$. Pass 2: $rev = 92$, $n = 47$.
:::

:::step{why="Substitute m = 4, j = 2 into each option."}
A: $n = d_1 d_2 = 47$ ✓ and $rev = d_4 d_3 = 92$ ✓. B: $n = d_3 d_4 = 29$? no; $rev = d_2 d_1 = 74$? no:
false. D: $n = 4729$? no; $rev = 9274$? no: false.
:::

:::step{why="C looks true here (47 ≠ 92); refute it with another input."}
For $n = 11$: after one pass $n = 1$ and $rev = 1$, so $n = rev$. C is not an invariant.
:::

:::answer
**(A)**, the theorem above. B and D use "or" to glue two statements that are each false in the middle of
the loop (D is true only at $j = 0$ or $j = m$), and C is an accident of particular digits.
:::
::::

::::example{#ex-alt-gate level="gate" title="Keeping alternate digits (GATE 2025)" depth="standard"}
What does `gate(14362)` return?

:::step{why="The first loop multiplies t by 10 while n >= t, stopping at the first power of 10 above n."}
$t$: $1, 10, 100, 1000, 10000, 100000$; then $14362 \ge 100000$ fails. `t /= 10` gives $t = 10000$.
:::

:::step{why="Each pass of the second loop reads the leading digit d = n / t and removes it with n % t."}
Digits read: 1 (turn 0), 4 (turn 1), 3 (turn 0), 6 (turn 1), 2 (turn 0).
:::

:::step{why="Only digits read when turn = 1 are appended: positions 2 and 4 from the left."}
$newnum$: $0 \to 4 \to 46$.
:::

:::answer
**46**. The function keeps the 2nd, 4th, … digits from the left. A common slip appends on turn 0 and gets
132.
:::
::::

::::example{#ex-digits-edge level="gate" title="Edge case: reversing 120, and reversing 1 000 000 003" depth="standard"}
What does the reversal loop give for $n = 120$ and for $n = 1\,000\,000\,003$ with 32-bit `int`?

:::step{why="Trace 120: the first digit peeled is 0, which adds nothing to rev."}
$rev$: $0 \cdot 10 + 0 = 0$, then $0 \cdot 10 + 2 = 2$, then $2 \cdot 10 + 1 = 21$.
:::

:::step{why="The invariant still holds if rev is read as the digit string 0, 02, 021."}
As numbers, the leading 0 of 021 is invisible: $rev = 21$.
:::

:::step{why="For 1 000 000 003 the true reverse exceeds INT_MAX = 2 147 483 647."}
The last pass computes $300\,000\,000 \cdot 10 = 3 \times 10^9$, a signed overflow.
:::

:::answer
21, and **undefined behaviour** for 1 000 000 003. A safe reversal tests `rev > (INT_MAX - d) / 10` before
the update, or uses a wider type.
:::
::::

## Division, square roots and series

:::intuition{#division-intuition title="Dealing cards one round at a time" depth="standard"}
To share $x$ sweets among $y$ children without knowing division, hand one sweet to each child per round,
that is, remove $y$ from the pile and add one to the round counter, for as long as at least $y$ sweets
remain. At every moment, sweets handed out ($q \cdot y$) plus sweets left ($r$) equal the original $x$.
When fewer than $y$ remain you stop: $q$ is the quotient and $r$ the remainder.

The square-root loops work on the same pattern of "keep a relation true, move towards the target": the
integer square root counts up while $i^2$ still fits under $N$; Heron's method keeps two numbers whose
product is $m$ and squeezes them together, so both close in on $\sqrt m$.
:::

:::definition{#division-loop term="Division by repeated subtraction" depth="standard"}
```c
q = 0; r = x;                 /* precondition: x >= 0, y > 0 */
while (r >= y) { r = r - y; q = q + 1; }
/* postcondition: x == q*y + r  and  0 <= r < y */
```

This is GATE 2015 (set 1) in pseudo-code and GATE 2017 (set 2) with `unsigned int` variables, where the
initialisation is left for the options to supply.
:::

:::theorem{#division-theorem name="Correctness of division by subtraction" depth="standard"}
If $x \ge 0$ and $y > 0$, the loop terminates after exactly $\lfloor x / y \rfloor$ passes, and on exit
$x = q y + r$ and $0 \le r < y$, i.e. $q = \lfloor x/y \rfloor$ and $r = x \bmod y$.
:::

:::proof{#proof-division of="the division theorem" depth="standard"}
**Idea first:** each pass moves one copy of $y$ from $r$ into $q \cdot y$, so their sum stays $x$.

Invariant $I$: $x = qy + r$ and $r \ge 0$. *Initialisation:* $q = 0$, $r = x \ge 0$. *Maintenance:* the
guard gives $r \ge y$, so the new $r - y \ge 0$, and $(q + 1)y + (r - y) = qy + r = x$. *Exit:* the guard
fails, $r < y$; with $I$, $x = qy + r$ and $0 \le r < y$. Such $q$ and $r$ are unique (if
$qy + r = q'y + r'$ with both remainders in $[0, y)$ then $|q - q'| y = |r' - r| < y$ forces $q = q'$), so
they are the quotient and remainder. *Termination:* $r$ is a variant: $r \ge y > 0$ while the guard holds,
and it drops by $y \ge 1$ each pass. Each pass adds 1 to $q$, which ends at $\lfloor x/y \rfloor$, so that
is the number of passes. ∎

**Sanity check.** $x = 17$, $y = 5$: $r = 17, 12, 7, 2$ and $q = 0, 1, 2, 3$; exit with $17 = 3 \cdot 5 + 2$.
:::

:::trap{#trap-division-precondition title="Every part of the precondition is needed" depth="standard"}
GATE 2017 asks which precondition guarantees "terminates with $x = yq + r$". Remove any part and it fails:

- **without $q = 0$** the invariant $x = qy + r$ is false at the start (an uninitialised `unsigned` $q$
  holds some arbitrary value), and the loop only adds to $q$;
- **without $r = x$** there is no link between $x$ and the loop at all;
- **without $y > 0$** the loop never ends: with `unsigned` $y = 0$, `r >= 0` is always true.

With `unsigned int` the relation $x = yq + r$ holds even modulo $2^{32}$, and $r \ge 0$ is automatic. With
signed `int` and a negative $x$ the loop does not run and leaves $r = x < 0$: then $x = qy + r$ and $r < y$
hold but $r \ge 0$ does not, which is why GATE 2015's correct option is stated for positive $x$ and $y$.
:::

:::definition{#sqrt-loops term="Square-root loops" depth="standard"}
Two loops compute square roots.

- **Counting up (GATE 1991):** `i = 0; while (i * i <= M) i = i + 1;` stops at the **first $i$ whose
  square exceeds $M$**.
- **Heron's method, a case of Newton's method (GATE 2004):** for $m > 1$,
  `x = m; y = 1; while (x - y > e) { x = (x + y) / 2; y = m / x; }` in real arithmetic. It averages an
  over-estimate $x$ and an under-estimate $y = m / x$ of $\sqrt m$. Newton's method for $f(x) = x^2 - m$
  gives the same update $x \leftarrow x - \frac{x^2 - m}{2x} = \frac{1}{2}\left(x + \frac{m}{x}\right)$.
:::

:::theorem{#isqrt-theorem name="The counting square root returns floor(√M) + 1" depth="standard"}
For an integer $M \ge 0$, the loop `i = 0; while (i * i <= M) i++;` terminates with
$i = \lfloor \sqrt M \rfloor + 1$, after $\lfloor \sqrt M \rfloor + 1$ passes.
:::

:::proof{#proof-isqrt of="the counting square root" depth="standard"}
**Idea first:** $i$ climbs while it is still "small enough", so it stops one step past the largest
small-enough value.

Invariant $I$: $i \ge 0$ and $(i - 1)^2 \le M$ whenever $i \ge 1$. *Initialisation:* $i = 0$, nothing to
check. *Maintenance:* the guard says $i^2 \le M$; after `i++` the new $i$ satisfies $(i_{new} - 1)^2 =
i_{old}^2 \le M$. *Exit:* $i^2 > M$, so $i > \sqrt M$; and $i \ge 1$ (since $0^2 \le M$ the loop ran at least
once), so $(i - 1)^2 \le M$, i.e. $i - 1 \le \sqrt M$. Hence $i - 1 \le \sqrt M < i$: $i - 1 =
\lfloor \sqrt M \rfloor$. *Termination:* $v = \lfloor \sqrt M \rfloor - i$ is $\ge 0$ while the guard holds
(because $i^2 \le M$ means $i \le \lfloor \sqrt M \rfloor$) and falls by 1. ∎

**Sanity check.** $M = 10$: $i = 0, 1, 2, 3$ pass ($9 \le 10$), $16 > 10$ stops at 4 $= 3 + 1$. $M = 16$:
stops at 5 $= 4 + 1$, while $\lceil \sqrt{16} \rceil = 4$, which is why GATE 1991's option C fails.
:::

:::theorem{#heron-theorem name="Heron's loop brackets √m and halves the bracket" depth="standard"}
For real $m > 1$ and $e > 0$, Heron's loop keeps the invariant $x \cdot y = m$ and $0 < y \le \sqrt m \le x$;
every pass at least halves $x - y$; so it terminates within $\lceil \log_2((m - 1)/e) \rceil$ passes, and on
exit $0 \le x - \sqrt m \le e$.
:::

:::proof{#proof-heron of="Heron's loop" depth="standard"}
**Idea first:** if $x \cdot y = m$ and $x \ne y$, then one is above $\sqrt m$ and the other below; their
average lands between them, on the high side, and its partner $m / x$ on the low side.

*Initialisation:* $x = m$, $y = 1$: $xy = m$ and $1 < \sqrt m < m$. *Maintenance:* the new
$x' = \frac{x + y}{2} \ge \sqrt{xy} = \sqrt m$ (the arithmetic mean is at least the geometric mean), and
$y' = m / x'$, so $x' y' = m$ and $y' = m/x' \le m/\sqrt m = \sqrt m$. *Halving:* $y \le x$ gives
$x' \le x$, so $y' = m/x' \ge m/x = y$; therefore $x' - y' \le x' - y = \frac{x - y}{2}$. *Termination:*
after $k$ passes $x - y \le (m - 1)/2^k$, which is $\le e$ once $k \ge \log_2((m - 1)/e)$, so the guard
fails by then. *Exit:* $x - y \le e$ and $y \le \sqrt m \le x$ give $0 \le x - \sqrt m \le x - y \le e$. ∎

The halving bound is pessimistic. Because $y = m/x$, the new error is
$x' - \sqrt m = \frac{x^2 + m}{2x} - \sqrt m = \frac{(x - \sqrt m)^2}{2x}$: the error is **squared** each
pass, so the number of correct digits roughly doubles. **Sanity check:** for $m = 2$ the lesson check's
trace is $x = 1.5, 1.41667, 1.414216, 1.4142136$, within $10^{-6}$ of $\sqrt 2$ after four passes.
:::

:::definition{#series-loops term="Series loops: the running term" depth="standard"}
A loop that adds up a series $\sum_k t_k$ rarely computes each term from scratch. It keeps the
**current term** in a variable and updates it with the ratio $t_k / t_{k-1}$. GATE 2003's

```c
for (s = 1, p = 1, i = 1; i < y; i++) { p *= x / i; s += p; }
```

has ratio $x / i$, so its terms are $\frac{x}{1}, \frac{x^2}{1 \cdot 2}, \frac{x^3}{1 \cdot 2 \cdot 3}, \dots$:
the series of $e^x$. Reading the ratio identifies the series: $\frac{x}{i}$ gives $e^x$;
$\frac{-x^2}{(2i)(2i + 1)}$ starting from $t = x$ gives $\sin x$; the same ratio with denominator
$(2i - 1)(2i)$ starting from $t = 1$ gives $\cos x$; a term $-x$ times the previous one, divided by $i$
only when added (`p *= -x; s += p / i`), gives $\ln(1 + x)$ for $|x| < 1$.
:::

:::derivation{#series-derivation of="the invariant of the e^x loop" depth="standard"}
**Invariant** at the test with index $i$ ($1 \le i \le y$): $p = \frac{x^{i-1}}{(i-1)!}$ and
$s = \sum_{k=0}^{i-1} \frac{x^k}{k!}$. Initially $i = 1$: $p = 1 = \frac{x^0}{0!}$ and $s = 1$. One pass
sets $p \leftarrow \frac{x^{i-1}}{(i-1)!} \cdot \frac{x}{i} = \frac{x^i}{i!}$ and adds it to $s$, giving the
invariant for $i + 1$. At exit ($i = y$, for $y \ge 1$), $s = \sum_{k=0}^{y-1} \frac{x^k}{k!}$, the first
$y$ terms of $e^x = \sum_{k \ge 0} \frac{x^k}{k!}$. As $y$ grows the sum tends to $e^x$, which answers GATE
2003: (B). **Sanity check:** the compiled `f(1, 20)` prints 2.718282 and `f(2, 20)` prints 7.389057 (in
`float`), and `f(1, 5)` = $1 + 1 + \frac12 + \frac16 + \frac1{24} = 2.708333$.
:::

:::note{#recap-division-roots title="Recap" depth="quick"}
Division by subtraction: invariant $x = qy + r \wedge r \ge 0$, exit $r < y$, needs $q = 0$, $r = x$,
$y > 0$; $\lfloor x/y \rfloor$ passes. Counting up while $i^2 \le N$ returns $\lfloor \sqrt N \rfloor + 1$.
Heron keeps $xy = m$ around $\sqrt m$ and squares the error. A series loop multiplies the running term by
the ratio; $x / i$ means $e^x$.
:::

### Worked examples: division, roots and series

::::example{#ex-division-easy level="easy" title="The postcondition of division (GATE 2015)" depth="quick"}
Trace the pseudo-code with $x = 17$, $y = 5$ and pick the postcondition: (A) $r = qx + y \wedge r < y$,
(B) $x = qy + r \wedge r < y$, (C) $y = qx + r \wedge 0 < r < y$, (D) $q + 1 < r - y \wedge y > 0$.

:::step{why="Each pass removes 5 from r and adds 1 to q, while r >= 5."}
$(q, r)$: $(0, 17) \to (1, 12) \to (2, 7) \to (3, 2)$; stop since $2 < 5$.
:::

:::step{why="Substitute the final state into each option."}
A: $2 = 3 \cdot 17 + 5$? no. B: $17 = 3 \cdot 5 + 2$ ✓ and $2 < 5$ ✓. C: $5 = 3 \cdot 17 + 2$? no. D:
$4 < -3$? no.
:::

:::answer
**(B)**: it is the invariant $x = qy + r$ joined with the failed guard $r < y$, as the division theorem
predicts. One state can refute options; the theorem is what makes B right for all inputs.
:::
::::

::::example{#ex-division-gate level="gate" title="Which precondition guarantees correctness? (GATE 2017)" depth="standard"}
With `unsigned int` x, y, q, r and the loop `while (r >= y) { r = r - y; q = q + 1; }`, which condition
before the loop ensures it terminates with `x == y*q + r`: (A) `(q == r) && (r == 0)`, (B)
`(x > 0) && (r == x) && (y > 0)`, (C) `(q == 0) && (r == x) && (y > 0)`, (D) `(q == 0) && (y > 0)`?

:::step{why="The invariant x == y*q + r must hold at the first test; check what each option says about it."}
C: $q = 0$, $r = x$ give $y \cdot 0 + x = x$ ✓. B: $q$ is unknown, so $yq + x = x$ only if $q = 0$. D: $r$ is
unknown. A: $q = r = 0$ give $x = 0$ only when $x$ happens to be 0.
:::

:::step{why="Termination needs y > 0; A does not give it."}
In A with $y = 0$: `r >= 0` is always true for an unsigned $r$, so the loop never ends.
:::

:::step{why="Counter-examples confirm the eliminations: run each option on concrete values."}
B with $x = 7$, $y = 2$, $q = 5$: ends with $q = 8$, $r = 1$, and $2 \cdot 8 + 1 = 17 \ne 7$. D with $x = 7$,
$y = 2$, $q = 0$, $r = 4$: ends with $q = 2$, $r = 0$, and $4 \ne 7$.
:::

:::answer
**(C)**. It is exactly the initialisation $q = 0$, $r = x$ plus the termination condition $y > 0$. The
condition $x > 0$ in B is irrelevant ($x = 0$ works fine).
:::
::::

::::example{#ex-isqrt-medium level="medium" title="Counting up to the square root (GATE 1991)" depth="standard"}
For `X(M)` that sets `i := 0; while i*i <= M do i := i + 1; X := i`, which of (A) $\lfloor \sqrt N \rfloor$,
(B) $\lfloor \sqrt N \rfloor + 1$, (C) $\lceil \sqrt N \rceil$, (D) $\lceil \sqrt N \rceil + 1$, (E) none, is
`X(N)` for every positive $N$?

:::step{why="Apply the theorem: the loop returns the first i whose square exceeds N."}
$X(N) = \lfloor \sqrt N \rfloor + 1$: option B.
:::

:::step{why="Options C and D agree with B for some N; find where they differ: perfect squares."}
$N = 10$: $X = 4$, $\lceil \sqrt{10} \rceil = 4$ (C agrees). $N = 16$: $X = 5$ but $\lceil 4 \rceil = 4$ (C
fails) and D gives 5 (agrees). $N = 10$: D gives 5 but $X = 4$ (D fails).
:::

:::step{why="A is off by one everywhere, because the loop overshoots by one."}
$N = 10$: $\lfloor \sqrt{10} \rfloor = 3 \ne 4$.
:::

:::answer
**(B)** only. For a perfect square $N = k^2$ the loop accepts $i = k$ (since $k^2 \le N$) and stops at
$k + 1$; for other $N$, $\lceil \sqrt N \rceil = \lfloor \sqrt N \rfloor + 1$, which is why C looks right
until a perfect square is tried. The lesson check runs the C translation for $N = 1 \dots 10\,000$.
:::
::::

::::example{#ex-heron-gate level="gate" title="What does Heron's loop approximate? (GATE 2004)" depth="standard"}
Run `x = m; y = 1; while (x - y > e) { x = (x + y) / 2; y = m / x; }` for $m = 9$ and $e = 10^{-6}$.

:::step{why="Before the first pass x·y = 9·1 = 9; the invariant says x·y = m always."}
Pass 1: $x = (9 + 1)/2 = 5$, $y = 9/5 = 1.8$. Product $5 \cdot 1.8 = 9$ ✓.
:::

:::step{why="Continue: x falls, y rises, and both approach the number whose square is 9."}
Pass 2: $x = 3.4$, $y = 2.647$. Pass 3: $x = 3.0235$, $y = 2.9767$. Pass 4: $x = 3.0000916$. Pass 5:
$x = 3.0000000014$, and $x - y < 10^{-6}$.
:::

:::step{why="The error is squared each pass: 0.0235 → 0.0000916 → 0.0000000014."}
$0.0235^2 / (2 \cdot 3.02) \approx 0.0000916$ ✓: quadratic convergence.
:::

:::answer
$x \to 3 = \sqrt 9$: the loop approximates **$m^{1/2}$**, option (C). Options $\log m$, $m^2$ and $m^{1/3}$
are ruled out by the invariant: if $xy = m$ and $x \approx y$, then $x^2 \approx m$.
:::
::::

::::example{#ex-series-gate level="gate" title="Recognising e^x (GATE 2003)" depth="standard"}
What does `f(x, y)` (the `p *= x/i; s += p` loop) return for large $y$: (A) $x^y$, (B) $e^x$, (C)
$\ln(1 + x)$, (D) $x^x$?

:::step{why="Read the ratio between consecutive terms from the update p *= x / i."}
$p$ goes $1, x, \frac{x^2}{2}, \frac{x^3}{6}, \dots$: term $k$ is $\frac{x^k}{k!}$.
:::

:::step{why="s starts at 1 (the k = 0 term) and adds each new p."}
$s = 1 + x + \frac{x^2}{2!} + \dots + \frac{x^{y-1}}{(y-1)!}$.
:::

:::step{why="Compare with the known series, and test numerically."}
$e^x = \sum_{k \ge 0} x^k / k!$. Compiled: `f(1, 20)` = 2.718282 $\approx e$; $x^y$ would be 1 and $x^x$ 1.
:::

:::answer
**(B)** $e^x$. $\ln(1 + x) = x - \frac{x^2}{2} + \frac{x^3}{3} - \dots$ has no factorials and alternating
signs, so its loop would look different.
:::
::::

::::example{#ex-isqrt-edge level="gate" title="Edge case: the counting square root near INT_MAX" depth="standard"}
In C, `int i = 0; while (i * i <= M) i++;` with `int M = 2147483647` ($2^{31} - 1$): what happens?

:::step{why="The theorem says the loop stops at floor(√M) + 1; compute it."}
$\lfloor \sqrt{2^{31} - 1} \rfloor = 46340$ (since $46340^2 = 2\,147\,395\,600 \le M$), so the last test
uses $i = 46341$.
:::

:::step{why="The last test multiplies 46341 by itself in int."}
$46341^2 = 2\,147\,488\,281 > 2^{31} - 1$: the multiplication overflows before the comparison.
:::

:::answer
**Undefined behaviour** on the very test that should end the loop; the theorem assumed exact integers. A
safe guard is `while (i <= M / i)` (for $i \ge 1$) or a wider type for `i * i`. This is the same lesson as
the power loop's wasted square: an invariant proof is about mathematics, and C's `int` is mathematics only
inside its range.
:::
::::

## Swapping without a temporary, and loops with a closed form

:::intuition{#swap-intuition title="Two glasses and no third: write down the total" depth="standard"}
To exchange the contents of two glasses you normally need a third. With numbers there is a trick: write
down the **sum** in the first glass. The second glass can then recover the first's old value (sum minus
its own), and the first can recover the second's (sum minus the new second). No information was ever
lost, because the sum together with either value determines the other.

Closed forms work the same way: when a loop repeatedly applies $x \leftarrow 2x + y$, some disguised
quantity (here $x + y$) simply doubles each time, and spotting it turns twenty passes into one formula.
:::

:::theorem{#swap-arith name="Swapping with addition and subtraction" depth="standard"}
For **two different variables** `a` and `b` holding $a_0$ and $b_0$, the statements
`a = a + b; b = a - b; a = a - b;` leave $a = b_0$ and $b = a_0$, provided no step overflows (always, for
unsigned types). If `a` and `b` are the **same** object (for example `*p` and `*q` with `p == q`), the
object becomes 0.
:::

:::proof{#proof-swap of="the arithmetic swap" depth="standard"}
**Idea first:** after the first statement, `a` holds the sum, and the sum together with either value
recovers the other.

Track the pair $(a, b)$: after `a = a + b` it is $(a_0 + b_0,\ b_0)$; after `b = a - b` it is
$(a_0 + b_0,\ (a_0 + b_0) - b_0) = (a_0 + b_0,\ a_0)$; after `a = a - b` it is
$((a_0 + b_0) - a_0,\ a_0) = (b_0,\ a_0)$. The algebra uses only the ring laws (associativity,
commutativity, $u - u = 0$), which also hold for arithmetic modulo $2^n$; so with **unsigned** variables the
swap works even when $a_0 + b_0$ wraps. With **signed** `int`, a sum beyond `INT_MAX` is undefined
behaviour, so the proof applies only when $a_0 + b_0$ is representable. *Aliasing:* if both names denote
one object with value $v$, the first statement makes it $2v$, the second $2v - 2v = 0$, the third
$0 - 0 = 0$. ∎

**Sanity check.** $a = 5$, $b = 9$: $(14, 9) \to (14, 5) \to (9, 5)$ ✓. The XOR swap `a ^= b; b ^= a;
a ^= b;` follows the same proof with $\oplus$ in place of $+$ and $-$ (XOR is its own inverse), never
overflows, and also zeroes an aliased object.
:::

:::trap{#trap-swap-alias title="The clever swap is worse than the plain one" depth="standard"}
`void swap(int *p, int *q) { *p = *p + *q; *q = *p - *q; *p = *p - *q; }` looks harmless until someone
calls `swap(&a[i], &a[j])` with $i = j$, as a sorting loop easily does: the element becomes 0. It also has
undefined behaviour for large values. The three-line swap with a temporary, `t = *p; *p = *q; *q = t;`,
has neither problem and is what compilers optimise best. GATE 1993's Pascal fragment uses two distinct
variables, so its answer is simply "exchanges a and b".
:::

:::definition{#closed-forms term="Closed forms of update loops" depth="standard"}
A loop that applies the same affine update $x \leftarrow c\,x + d$ ($c \ne 1$) a fixed number of times can
be solved by finding the **fixed point** $f$, the value the update leaves unchanged: $f = cf + d$, so
$f = \frac{d}{1 - c}$. Then $x - f$ is multiplied by $c$ on every pass:
$x_k = f + c^k (x_0 - f)$. GATE 2024's `x = x + x + y` is $c = 2$, $d = y$, with $f = -y$:
$x_k + y = 2^k (x_0 + y)$.
:::

:::theorem{#closed-form-theorem name="The closed form of GATE 2024's loop" depth="standard"}
`for (int i = 0; i < y; i++) x = x + x + y;` with initial $x = x_0$ and $y \ge 0$ returns
$(x_0 + y)\,2^y - y$, provided no intermediate value overflows `int`.
:::

:::proof{#proof-closed-form of="the closed form" depth="standard"}
**Idea first:** the quantity $u = x + y$ doubles on every pass, because $y$ itself never changes.

Invariant at the test with index $i$: $x + y = (x_0 + y)\,2^i$. *Initialisation:* $i = 0$, $x = x_0$.
*Maintenance:* the new $x$ is $2x + y$, so the new $x + y = 2x + 2y = 2(x + y) = (x_0 + y)\,2^{i+1}$, and
$i$ becomes $i + 1$. *Exit:* $i = y$, so $x = (x_0 + y)\,2^y - y$. *Termination:* variant $y - i$. ∎

**Sanity check.** $x_0 = 1$, $y = 2$: by hand $1 \to 4 \to 10$; by the formula $3 \cdot 4 - 2 = 10$ ✓.
:::

:::note{#recap-swap-closed title="Recap" depth="quick"}
`a = a + b; b = a - b; a = a - b;` swaps two distinct variables (always for unsigned; signed only without
overflow) and zeroes an aliased one. An affine update $x \leftarrow cx + d$ has
$x_k = f + c^k(x_0 - f)$ with fixed point $f = d/(1 - c)$; for GATE 2024, $x_y = (x_0 + y)2^y - y$.
:::

### Worked examples: swaps and closed forms

::::example{#ex-swap-easy level="easy" title="The Pascal swap (GATE 1993)" depth="quick"}
`a := a + b; b := a - b; a := a - b` with $a = 5$, $b = 9$. What does the fragment do?

:::step{why="Execute the statements in order on the pair (a, b)."}
$(5, 9) \to (14, 9) \to (14, 5) \to (9, 5)$.
:::

:::step{why="Check the general claim with symbols, not just one example."}
$(a_0, b_0) \to (a_0 + b_0, b_0) \to (a_0 + b_0, a_0) \to (b_0, a_0)$.
:::

:::answer
It **exchanges a and b**: option (A). "Doubles a" and "leaves them unchanged" fail on the very first
example. (In Pascal an integer overflow of $a + b$ is a run-time error, so the claim needs
$|a + b| \le$ `maxint`.)
:::
::::

::::example{#ex-swap-alias level="medium" title="Swapping an element with itself" depth="standard"}
`int v[3] = {4, 7, 9};` and `swap` written with `+` and `-` through pointers. What is `v` after
`swap(&v[0], &v[2]); swap(&v[1], &v[1]);`?

:::step{why="The first call has two distinct objects, so the theorem applies."}
$v[0]$ and $v[2]$ exchange: $\{9, 7, 4\}$.
:::

:::step{why="The second call aliases: both pointers name v[1], so every statement reads and writes the same cell."}
$*p = 7 + 7 = 14$; $*q = 14 - 14 = 0$; $*p = 0 - 0 = 0$.
:::

:::answer
$\{9, 0, 4\}$. The compiled program prints `9 0 4`; with a temporary-variable swap it would print `9 7 4`.
:::
::::

::::example{#ex-closed-gate level="gate" title="Comparing a loop's result with powers of two (GATE 2024)" depth="standard"}
For `f(x, y)` with `x = x + x + y` repeated $y$ times, decide: (A) $f(20, 10) > 2^{20}$, (B)
$f(20, 20) > 2^{20}$, (C) $f(20, 10) < 2^{10}$, (D) $f(10, 20) > 2^{20}$.

:::step{why="Use the closed form instead of tracing 10 or 20 passes."}
$f(x_0, y) = (x_0 + y)\,2^y - y$.
:::

:::step{why="Evaluate the three distinct calls."}
$f(20, 10) = 30 \cdot 1024 - 10 = 30\,710$. $f(20, 20) = 40 \cdot 2^{20} - 20 = 41\,943\,020$.
$f(10, 20) = 30 \cdot 2^{20} - 20 = 31\,457\,260$.
:::

:::step{why="Compare with 2^10 = 1024 and 2^20 = 1 048 576."}
A: $30\,710 > 1\,048\,576$? no. B: yes. C: $30\,710 < 1024$? no. D: yes. All values fit in a 32-bit
`int`, so the C program computes them exactly.
:::

:::answer
**B and D**. $f(20, 10)$ lies between $2^{14}$ and $2^{15}$, so both statements about it are false.
:::
::::

::::example{#ex-closed-edge level="gate" title="Edge case: when the closed form leaves int" depth="standard"}
What does `f(20, 30)` return with 32-bit `int`, and how many passes are safe?

:::step{why="The formula gives the mathematical value; compare it with INT_MAX."}
$(20 + 30) \cdot 2^{30} - 30 \approx 5.4 \times 10^{10} > 2^{31} - 1$.
:::

:::step{why="Find the first pass whose result exceeds INT_MAX: x_k = 50·2^k − 30."}
$k = 25$: $50 \cdot 2^{25} - 30 = 1\,677\,721\,570$ fits; $k = 26$: $3\,355\,443\,170$ does not.
:::

:::answer
The 26th pass overflows: **undefined behaviour**, so the function has no defined return value. GATE 2024
chose inputs whose results fit; when a loop grows exponentially, always check the range before trusting a
traced number.
:::
::::

## Try it: trace the classic loops

The **Trace** tab of the C Tracer runs a program statement by statement and shows every variable after
each step, so you can watch an invariant hold. Load the presets **GCD by repeated subtraction** (check that
$\gcd(x, y)$ stays 21 while $x$ and $y$ change), **Square-and-multiply** (compute $res \cdot a^b$ at every
test), **Horner's rule**, **Reversing digits** and **Keeping alternate digits**, then edit the inputs: try
equal inputs in the `do`–`while` GCD and watch it fail to stop. The interpreter is tested against the real
C compiler on every preset.

:::lab{#lab-loops lab="c-tracer" tab="trace" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1991-a-1-vi" tests="invariant-def,loop-invariant-1991" depth="standard"}
:::

:::pyq{id="cse-1991-a-3-viii" tests="sqrt-loops,isqrt-theorem,ex-isqrt-medium" depth="standard"}
:::

:::pyq{id="cse-1993-ii-a-7-4" tests="swap-arith,ex-swap-easy" depth="standard"}
:::

:::pyq{id="cse-1995-a-28" tests="gcd-subtraction,gcd-theorem" depth="standard"}
:::

:::pyq{id="cse-2003-cs-1" tests="series-loops,series-derivation,ex-series-gate" depth="standard"}
:::

:::pyq{id="cse-2004-cs-32" tests="reverse-theorem,trap-weak-invariant,ex-reverse-medium" depth="standard"}
:::

:::pyq{id="cse-2004-cs-41" tests="gcd-subtraction,gcd-theorem,trap-gcd-precondition" depth="standard"}
:::

:::pyq{id="cse-2004-cs-42" tests="sqrt-loops,heron-theorem,ex-heron-gate" depth="standard"}
:::

:::pyq{id="cse-2015-1-cs-33" tests="division-loop,division-theorem,ex-division-easy" depth="standard"}
:::

:::pyq{id="cse-2016-2-cs-35" tests="fast-power,power-theorem,trap-power-overflow,ex-power-gate" depth="standard"}
:::

:::pyq{id="cse-2017-2-cs-37" tests="division-theorem,trap-division-precondition,ex-division-gate" depth="standard"}
:::

:::pyq{id="cse-2020-cs-48" tests="binary-power,ex-pp-gate" depth="standard"}
:::

:::pyq{id="cse-2021-1-cs-48" tests="horner,horner-theorem,trick-repunit,ex-horner-gate" depth="standard"}
:::

:::pyq{id="cse-2024-1-cs-38" tests="closed-forms,closed-form-theorem,ex-closed-gate" depth="standard"}
:::

:::pyq{id="cse-2025-1-cs-53" tests="digit-loops,alt-digits,ex-alt-gate" depth="standard"}
:::

:::pyq{id="cse-2025-2-cs-23" tests="gcd-theorem,trap-gcd-precondition,ex-gcd-trace" depth="standard"}
:::

## Practice

Our own questions in GATE formats, every answer produced by compiling the code: first "what does this
loop compute", then finding invariants and preconditions, then closed forms and the classic traps.

:::practice{id="nx-pds-01-03-q01" depth="standard"}
:::

:::practice{id="nx-pds-01-03-q02" depth="standard"}
:::

:::practice{id="nx-pds-01-03-q03" depth="standard"}
:::

:::practice{id="nx-pds-01-03-q04" depth="standard"}
:::

:::practice{id="nx-pds-01-03-q05" depth="standard"}
:::

:::practice{id="nx-pds-01-03-q06" depth="standard"}
:::

:::practice{id="nx-pds-01-03-q07" depth="standard"}
:::

:::practice{id="nx-pds-01-03-q08" depth="standard"}
:::

:::practice{id="nx-pds-01-03-q09" depth="standard"}
:::

:::practice{id="nx-pds-01-03-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Loop algorithms and invariants on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| Invariant | true at every guard test: initialisation + maintenance; at exit $I \wedge \neg B \Rightarrow Q$ |
| Termination | a variant: integer $\ge 0$ while the guard holds, strictly decreasing; at most $v_0 + 1$ passes |
| Finding $I$ | put the loop variable in place of the constant in $Q$; or name what the body preserves |
| GCD by subtraction | $\gcd(m, n) = \gcd(m - n, n)$; needs $x, y > 0$; stops at $m = n = \gcd$ (2025: 21); `do`–`while` with $x = y$ never stops |
| Fast power | $X^Y = res \cdot a^b$ (2016: C); $\lfloor \log_2 Y \rfloor + \mathrm{popcount}(Y)$ passes; bit-array form: pp(3, 4) = 81 (2020) |
| Horner | $total = x \cdot total + Y[k]$; $d$ multiplications; all ones: $2^{10} - 1 = 1023$ (2021) |
| Digits | `% 10` peels, `/ 10` drops; reversal keeps $n = d_1..d_{m-j}$, $rev = d_m..d_{m-j+1}$ (2004: A); alternate digits of 14362 → 46 (2025) |
| Division | $x = qy + r \wedge r < y$ (2015: B); needs $q = 0$, $r = x$, $y > 0$ (2017: C) |
| Square roots | `while (i*i <= N) i++` gives $\lfloor \sqrt N \rfloor + 1$ (1991: B); Heron keeps $xy = m$ → $\sqrt m$ (2004: C) |
| Series | ratio $x/i$ ⇒ $e^x$ (2003: B) |
| Swap, closed form | `a = a + b; b = a - b; a = a - b;` swaps distinct variables (1993: A); $x \leftarrow 2x + y$: $(x_0 + y)2^y - y$ (2024: B, D) |
| Range | every proof assumes exact integers: check overflow in squares, powers and reversals |
:::
