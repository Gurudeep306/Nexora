---
id: control-flow
subject: pds
chapter: c-foundations
title: "Control flow and loop tracing"
order: 2
prerequisites: [types-operators]
pyq_topics: [pds/c]
est_minutes: 60
difficulty: core
status: draft
needs_review: true
sources:
  - "Nexora's own text, examples and diagrams; every C output, iteration count, closed form and PYQ key is produced by compiling and running the program with the system C compiler in content/gate-notes/_checks/pds/l1_02_control_flow.py (the Pascal questions translated to C where the semantics coincide and re-derived in Python from the language rules; loops that never stop are run against an iteration cap or a time limit)."
  - "Coverage checklist only (internal digests, never copied): set B pp. 113, 119 and 225, set C pp. 280–281 and 295, set E pp. 540 and 545."
  - "Facts checked against: ISO/IEC 9899:2011 (C11) §6.8.4 (selection statements), §6.8.5 (iteration statements), §6.8.6 (jump statements), §5.2.4.2.2 and annex F (floating types); B. W. Kernighan and D. M. Ritchie, The C Programming Language (2nd ed.), chapter 3; K. Jensen and N. Wirth, Pascal User Manual and Report, chapter 4."
  - "PYQs: src/gate/questions.json (cse-1991-a-4-ii, cse-1995-a-4, cse-2003-cs-88, cse-2006-cs-15, it-2007-cs-31, cse-2012-cs-3, cse-2013-cs-31, cse-2014-1-cs-41, cse-2015-3-cs-48, cse-2018-cs-32, cse-2019-cs-52, cse-2024-1-cs-8); every key is re-derived by running the code."
updated: "2026-10-24"
---

*C foundations, lesson 2 of 7.* A program without control flow is a shopping list: every line runs once,
top to bottom. Real programs **choose** (run this part only if a condition holds) and **repeat** (run this
part again and again until something changes). C has a small set of statements for this: `if` and `else`,
`switch`, the three loops `while`, `do`–`while` and `for`, and the jumps `break`, `continue`, `goto` and
`return`. Each is simple on its own, and GATE does not ask you to recite their syntax. It asks you to
**execute them in your head**: which branch an `else` belongs to when the indentation lies, which `printf`
calls run after a `case` label without a `break`, how many times a loop body runs when the counter is
halved, what a triple loop adds up to, and whether a loop stops at all. This lesson teaches each statement
with its exact rule, then three skills that turn those rules into marks: **counting iterations exactly**
(arithmetic, halving and doubling loops, nested loops and their closed forms), **recognising loops that
misbehave** (floating-point counters, fixed points, unsigned counters that can never go negative), and
**tracing** an unfamiliar loop with a table until you see what it computes.

## Where this fits

This lesson needs the previous one, [types, operators and expressions](lesson:types-operators): every
condition below is an expression whose value is decided by the rules of that lesson (comparisons yield 0
or 1, any non-zero value is true, `&&` and `||` short-circuit, integer division truncates, unsigned values
wrap). Here we put those expressions to work as the tests of statements. Lesson 3 (loop algorithms and
invariants) builds on the counting and tracing skills of this lesson and proves that loops compute what
they claim; Lesson 4 (functions and storage classes) puts loops inside functions with static variables;
the recursion chapter replaces many of these loops by calls. The idea to keep from this lesson: **a
control statement is a rule for which statement runs next; to answer a question about it, follow that rule
literally, one step at a time, and only then look for the pattern.**

:::table{#radar title="GATE radar: control flow and loop tracing" depth="quick"}
| What | Detail |
|:--|:--|
| PYQs mapped to this lesson | 12 (1991, 1995, 2003, 2006, IT 2007, 2012, 2013, 2014, 2015, 2018, 2019, 2024) |
| Marks | 1-mark MCQs (1995, 2006, 2012, 2024), 2-mark MCQs (2003, IT 2007, 2013, 2014, 2018) and NATs (2015, 2019), an old short answer (1991) |
| Pattern 1 | `switch` without `break`: fall-through to the end (2012), counting the `printf` calls it makes (2015: 10) |
| Pattern 2 | Counting iterations of halving loops: ⌊log₂ n⌋ (2018: two halving loops in a row give 5); the value a halving loop accumulates (2006: Θ(n)) |
| Pattern 3 | Closed form of a nested loop's result (2013: Θ(n² log n)) |
| Pattern 4 | Recognise what a loop computes by tracing it (2014: maximum sub-array sum; IT 2007: best increasing run, 7; 2003: a sieve that prints nothing) |
| Pattern 5 | Loops that misbehave: floating-point tests (2019: 5 prints, exact because of powers of two), a loop stuck at a fixed point (2024: infinite) |
| Pattern 6 | Pascal statements: the dangling else (1995: −10), `repeat … until` written with `while` (1991) |
| What examiners test | the else that indentation suggests versus the one the grammar picks; fall-through after the matched label; off-by-one in loop counts; the value returned versus the running time; termination |
:::

## Choosing a path: if, else and the dangling else

:::intuition{#branch-intuition title="A fork in the road, and a signpost that may be misplaced" depth="standard"}
Driving through a town, you meet a fork with a signpost: "if you want the station, turn left; otherwise go
straight". An `if` statement is that fork. The condition is the question on the signpost, and exactly one
of the two roads is taken. Two things make forks in C trickier than forks in a town. First, C's signposts
ask a **number**, not a yes-or-no question: any value other than zero means "yes". Second, when several
forks follow each other without braces, the program text can look as if a signpost belongs to one fork
when the language attaches it to another. The compiler does not read the indentation; it reads the
grammar. Most mistakes about `if` come from trusting the layout instead of the rule.
:::

:::definition{#if-else term="The if statement" depth="standard"}
`if (e) S1` evaluates the expression `e`; if its value is **non-zero** (compares unequal to 0), the
statement `S1` runs, otherwise nothing happens. `if (e) S1 else S2` runs `S1` when `e` is non-zero and `S2`
when it is zero: exactly one of the two. The condition can have any arithmetic or pointer type, so `if (-1)`,
`if (0.5)` and `if (p)` (p a pointer) are all legal; `-1` and `0.5` count as true, `0` and `0.0` as false.

`S1` and `S2` are **single statements**. To put several statements in a branch you wrap them in braces,
`{ … }`, which make one compound statement. An `else if` chain is not a new statement: it is an `if` whose
`else` part happens to be another `if`,

```c
if (m >= 90) g = 'A';
else if (m >= 75) g = 'B';
else if (m >= 60) g = 'C';
else g = 'F';
```

and it runs the branch of the **first** condition that is true and skips every later test.

Because assignment is an expression whose value is the stored value (previous lesson), `if (x = 0)` is
legal C: it stores 0 in `x` and then tests 0, so the branch never runs and `x` is destroyed. The comparison
is `if (x == 0)`. Compilers warn about an assignment used as a condition; writing `if ((x = f()))` with
double brackets tells them the assignment is intended.
:::

The `if` statement becomes a puzzle when two `if`s share one `else`. Write
`if (a) if (b) S1; else S2;`. There are two ways to read it: the `else` could be the alternative of the
outer `if (a)` or of the inner `if (b)`. Both readings are grammatically possible, so the language has to
pick one, and every language in the C and Pascal family picks the same.

:::theorem{#dangling-else name="The dangling-else rule" depth="standard"}
In C (and in Pascal), an `else` belongs to the **nearest preceding `if` in the same block that does not
already have an `else`**. Consequently, in `if (a) if (b) S1; else S2;` the `else` belongs to `if (b)`, and
the statement means `if (a) { if (b) S1; else S2; }`: when `a` is false, **nothing** runs. To attach the
`else` to the outer `if` you must close the inner one with braces: `if (a) { if (b) S1; } else S2;`.
:::

:::proof{#proof-dangling-else of="the dangling-else rule" depth="standard"}
**Idea first:** the rule is a decision the language designers made, stated in the standard; what we can
prove is that it gives every program exactly one meaning, and what that meaning is for the two-`if` case.

C11 §6.8.4.1 says: "An else is associated with the lexically nearest preceding if that is allowed by the
syntax." (Pascal's report makes the same choice.) Read the tokens of `if (a) if (b) S1; else S2;` from left
to right. When the parser reaches `else`, two `if`s are open: `if (a)` and `if (b)`. The nearest one is
`if (b)`, and attaching the `else` there is allowed by the syntax (an `if` with a single statement can take
an `else`). So `if (b) S1; else S2;` is one complete statement, and it is the single statement that forms the
body of `if (a)`. The outer `if` has no `else`. Hence: `a` false → the body is skipped, nothing runs; `a`
true → the inner `if` runs and chooses between `S1` and `S2`.

With braces, `{ if (b) S1; }` is a complete compound statement: the inner `if` is closed by the `}`, so it is
no longer "allowed by the syntax" to receive an `else`, and the nearest open `if` is `if (a)`. ∎

**Sanity check (compiled).** With `int x = -10, y = 20;`, the statement
`if (x > y) if (x < 0) x = -x; else x = 2 * x;` leaves x = **−10** (the outer test is false); with braces
around the inner `if` it gives **−20** (the `else` now runs). With x = 30, y = 20 the two versions give 60
and 30. The lesson check runs all of these.
:::

:::trap{#trap-indentation title="Indentation is decoration: the else goes where the grammar puts it" depth="standard"}
Examiners write the dangling `else` lined up under the **outer** `if`:

```c
if (x > y)
    if (x < 0) x = -x;
else
    x = 2 * x;
```

and the expected wrong answer is the one that follows the indentation (GATE 1995: −20, as if the `else`
ran because `x > y` is false). The compiler ignores spaces and line breaks: the `else` belongs to `if (x < 0)`,
the outer test fails, and x stays −10. Recent compilers even warn ("add explicit braces to avoid dangling
else"), which is the real lesson: in your own code, always brace nested `if`s.
:::

:::trap{#trap-assign-in-if title="if (x = 0) is an assignment, not a test" depth="standard"}
`int x = 3; if (x = 0) printf("zero"); else printf("x=%d", x);` prints **x=0**: the condition stores 0 and
tests it (false), and the `else` branch sees the new value. With `if (x = 5)` the branch always runs and x
becomes 5. The trap answer is the one a reader who sees `==` would give (`x=3`). A question that shows `=`
inside a condition is almost always testing exactly this.
:::

:::note{#recap-if title="Recap" depth="quick"}
`if (e)` runs its branch when `e` is non-zero. Branches are single statements; braces group several. An
`else if` chain runs the first true branch only. An `else` belongs to the nearest unmatched `if` in the same
block, whatever the indentation says; braces are the only way to change that. `if (x = 0)` assigns.
:::

### Worked examples: if and else

::::example{#ex-elseif-easy level="easy" title="An else-if chain picks the first true test" depth="quick"}
With the grading chain above (`>= 90` → A, `>= 75` → B, `>= 60` → C, otherwise F), which grade do the marks
72, 75, 90 and 59 get?

:::step{why="The chain tests the conditions in order and stops at the first true one."}
72: `72 >= 90` false, `72 >= 75` false, `72 >= 60` true → **C**. The last `else` is never reached.
:::

:::step{why="Boundaries are where off-by-one mistakes hide: >= includes the boundary value itself."}
75: `75 >= 90` false, `75 >= 75` **true** → **B**. 90: the first test is already true → **A**.
:::

:::step{why="The final else catches every value for which all tests were false."}
59: all three tests fail → **F**.
:::

:::answer
C, B, A, F. Notice that the tests do not need to say `m >= 75 && m < 90`: by the time the second test runs,
the first one has already failed, so `m < 90` is known. An `else if` chain is an ordered list of exclusive
cases, and its order matters: putting `m >= 60` first would give every passing student a C.
:::
::::

::::example{#ex-assign-if level="medium" title="An assignment in a condition" depth="standard"}
What do the three fragments print? (1) `int x = 3; if (x = 0) printf("zero"); else printf("x=%d", x);`
(2) the same with `==`; (3) `int x = 3; if (x = 5) printf("T%d", x);`.

:::step{why="The value of an assignment expression is the value stored."}
(1) `x = 0` stores 0 in x and has value 0, which is false. The `else` branch runs and prints the **new** x:
`x=0`.
:::

:::step{why="== compares and changes nothing."}
(2) `3 == 0` is 0 (false); the `else` branch prints `x=3`.
:::

:::step{why="Any non-zero value is true, so an assignment of a non-zero constant is always true."}
(3) `x = 5` has value 5, true: the branch prints `T5`, and x is now 5.
:::

:::answer
`x=0`, `x=3`, `T5`. The compiler accepts all three; clang rejects (1) only when warnings are turned into
errors (`-Werror=parentheses`), which the lesson check confirms. Double brackets, `if ((x = 0))`, silence the
warning and say "I meant the assignment".
:::
::::

::::example{#ex-dangling-gate level="gate" title="The dangling else in Pascal (GATE 1995)" depth="standard"}
```pascal
X := -10; Y := 20;
If X > Y then if X < 0 then X := abs(X) else X := 2*X;
```
What is X afterwards? (A) 10 (B) −20 (C) −10 (D) none of these.

:::step{why="Pascal resolves the dangling else exactly as C: the else joins the nearest if without an else."}
The `else X := 2*X` belongs to `if X < 0`. The statement is
`if X > Y then (if X < 0 then X := abs(X) else X := 2*X)`.
:::

:::step{why="The outer test decides whether the inner if runs at all."}
`X > Y` is `-10 > 20`, false. The outer `if` has no `else`, so the whole inner statement is skipped.
:::

:::step{why="Nothing assigned X, so it keeps its initial value."}
X = **−10**.
:::

:::answer
**(C) −10**. Option B (−20) is what you get by attaching the `else` to the outer `if`, as the one-line layout
invites; option A (10) is what you get by ignoring the outer test and running `abs`. The lesson check
translates the statement to C and compares it with a Python model for 49 pairs (X, Y).
:::
::::

::::example{#ex-dangling-edge level="gate" title="Edge case: when do the braced and unbraced versions agree?" depth="standard"}
Compare `U: if (x > y) if (x < 0) x = -x; else x = 2 * x;` with
`V: if (x > y) { if (x < 0) x = -x; } else x = 2 * x;` for (x, y) = (−10, 20), (−30, −40) and (30, 20).

:::step{why="When the outer test is false, U does nothing and V runs its else."}
(−10, 20): `x > y` false. U leaves x = −10; V doubles it: −20. They **differ**.
:::

:::step{why="When the outer test is true and the inner test true, both run x = -x."}
(−30, −40): `−30 > −40` true and `−30 < 0` true: both give **30**.
:::

:::step{why="When the outer test is true and the inner test false, only U has an else to run."}
(30, 20): outer true, inner `30 < 0` false. U runs its (inner) `else`: 60. V's inner `if` has no `else`, so x
stays 30. They differ again.
:::

:::answer
They agree only when both tests are true. In every other case the position of the `else` changes the
result, which is why a question with a dangling `else` always has the "indentation answer" among its
options. A quick test for any such question: try one input where the outer test is false.
:::
::::

## Many exits: the switch statement

:::intuition{#switch-intuition title="A lift that you board at your floor and that keeps going down" depth="standard"}
Think of the `switch` body as a tall building with one long staircase running from the top floor to the
ground. The `case` labels are doors onto the staircase, one per floor, each marked with a number. The
`switch` looks at its value and opens **only the door with that number** (or the `default` door if no number
matches). You step in at that floor, and then you simply walk down the staircase, passing every floor below,
until you reach the bottom or a `break`, which is an emergency exit. The other doors you pass are just
labels painted on the wall: they do not stop you. That walking-down, called **fall-through**, is the whole
secret of `switch` questions.
:::

:::definition{#switch term="The switch statement" depth="standard"}
`switch (e) body`, where the body is normally a compound statement containing labelled statements:

- The **controlling expression** `e` must have an **integer type** (char, short, int, long, an enum, after
  integer promotion). A `double` or a pointer is a compile error.
- Each **case label** `case c:` needs an **integer constant expression**: `case 3:`, `case 'a':`,
  `case 'a' + 1:` (98) and even `case 5 < 4:` (that is `case 0:`) are fine; `case 1.5:` and `case y:` with a
  variable `y` are compile errors. Two labels with the same value are a compile error.
- At most one `default:` label, which may stand **anywhere** in the body, first, last or in the middle.
- **Execution:** evaluate `e` once; if some `case` has that value, jump to it; otherwise jump to `default:`;
  if there is no `default`, skip the whole body. After the jump, statements run **in order** from that point,
  ignoring any later labels, until a `break;` (which leaves the `switch`), a `return`, a `goto`, a
  `continue` of an enclosing loop, or the end of the body.

`break` inside a `switch` leaves only the `switch`, not the loop around it; `continue` has no meaning for a
`switch` and goes to the next iteration of the enclosing loop. A label must be spelled with a space:
`case1:` (no space) is not an error but an ordinary `goto` label named `case1`, which is never a target of
the switch.
:::

:::theorem{#fallthrough-theorem name="What a switch executes" depth="standard"}
Let the statements of a `switch` body, in program order, be $T_1, T_2, \dots, T_m$ (labels are not
statements). If the value of the controlling expression selects the label standing before $T_p$ (a matching
`case`, else `default`), then the statements executed are exactly $T_p, T_{p+1}, \dots, T_q$, where $T_q$ is
the first `break` at or after $T_p$ (or $q = m$ if there is none). If no label is selected, none run. In
particular, the number of `printf` calls made is the number of `printf` statements between the selected
label and the first `break` below it.
:::

:::proof{#proof-fallthrough of="the switch execution rule" depth="standard"}
**Idea first:** a `switch` is a computed jump. Labels are positions, not instructions, so once control is
inside the body nothing but a jump statement can stop it.

C11 §6.8.4.2 says the `switch` "causes control to jump to" the matching `case` label, or to `default`, or past
the body. A label marks a position in the statement sequence; passing a label executes nothing. After the
jump, statements execute sequentially as in any compound statement (§6.8.2), so $T_p, T_{p+1}, \dots$ run in
order. The sequence ends either at a `break`, which by §6.8.6.3 terminates the smallest enclosing `switch`
(or loop), or at the end of the body. Counting the `printf` statements in that range counts the calls,
since each statement runs once. ∎

**Sanity check (compiled).** GATE 2012: the value `'A'` selects the first label, and there is no `break`
anywhere, so all three `printf`s run: `Choice A`, newline, `Choice B No Choice`. With `'C'` it prints
`Choice B No Choice`, with `'Z'` only ` No Choice`.
:::

The animation runs the switch of GATE 2015 (set 3) for each value of the loop variable: it lights the label
where control enters, then every `printf` it falls through, and keeps the running count.

:::viz{#switch-fallthrough-viz spec="switch-fallthrough" mode="animate" depth="standard"}
:::

:::trick{#trick-fallthrough-count title="Count the printf calls below the entry point" depth="standard"}
For "how many times is printf executed" questions, do not trace output; build a small table. For each
possible value of the controlling expression, write the entry label and count the `printf` statements from
there down to the first `break` (or the end). Then multiply by how often each value occurs. **Why it works:**
it is the theorem above, applied value by value; the loop around the `switch` only decides how often each
value occurs. **When it fails:** when the body changes the loop variable or contains a `continue` or `goto`,
the "how often" part needs a real trace.
:::

:::trap{#trap-default-first title="default is a label, not a last resort" depth="standard"}
A `default:` written at the **top** of a switch body is still chosen only when no `case` matches; the
position does not make it run first. But its position does decide what it **falls into**: a `default` at the
top, without a `break`, falls through every `case` below it. The trap answer treats `default` as if it were
always the last thing executed, or as if it were executed for every value.
:::

:::note{#recap-switch title="Recap" depth="quick"}
`switch` jumps to the matching `case` (integer constants only), else to `default`, else past the body. From
there it runs everything below, ignoring labels, until `break` or the end. `default` can be anywhere; its
position matters only for what follows it. `break` leaves the switch only; `continue` goes to the enclosing loop.
:::

### Worked examples: switch

::::example{#ex-switch-easy level="easy" title="Fall-through to the end (GATE 2012)" depth="quick"}
```c
char inChar = 'A';
switch (inChar) {
case 'A': printf("Choice A\n");
case 'B':
case 'C': printf("Choice B");
case 'D':
case 'E':
default:  printf(" No Choice"); }
```
What is printed?

:::step{why="The switch jumps to the label whose constant equals the value: 'A'."}
Control enters at `case 'A':` and runs `printf("Choice A\n")`.
:::

:::step{why="There is no break, so the labels 'B' and 'C' are passed without effect."}
The next statement is `printf("Choice B")`, which runs; then `case 'D'`, `case 'E'` and `default` are passed too,
and `printf(" No Choice")` runs.
:::

:::answer
`Choice A`, a newline, then `Choice B No Choice`: option **(C)**. Option (B) assumes each `case` ends by
itself, as in some other languages; (D) assumes empty `case` lines are errors (they are not: a label may
label the next statement). Stacked labels like `case 'B': case 'C':` are the normal way to share one action
among several values.
:::
::::

::::example{#ex-switch-default level="medium" title="A default in the middle" depth="standard"}
```c
for (int i = 0; i < 4; i++)
    switch (i) {
    default: printf("d");
    case 1:  printf("1");
    case 2:  printf("2"); break;
    case 3:  printf("3");
    }
```
What is printed, and how many `printf` calls are made?

:::step{why="i = 0 matches no case, so control goes to default, wherever it is."}
i = 0: enter at `default`, print `d`, fall into `case 1` (`1`) and `case 2` (`2`), then `break`. Output `d12`.
:::

:::step{why="Each value enters at its own label and falls through to the first break."}
i = 1: `12` then break. i = 2: `2` then break. i = 3: `3`, then the end of the body.
:::

:::step{why="Add the counts of printf statements between each entry point and the first break."}
3 + 2 + 1 + 1 = **7** calls.
:::

:::answer
`d121223`, with 7 calls. The `default` being first did not make it run for i = 1, 2, 3; it only meant that
when it did run (i = 0), it fell through the cases below it.
:::
::::

::::example{#ex-switch-gate level="gate" title="Counting printf calls (GATE 2015, set 3)" depth="standard"}
```c
int i, j, k = 0;
j = 2 * 3 / 4 + 2.0 / 5 + 8 / 5;
k -= --j;
for (i = 0; i < 5; i++) {
    switch (i + k) {
        case 1:
        case 2: printf("\n%d", i+k);
        case 3: printf("\n%d", i+k);
        default: printf("\n%d", i+k);
    }
}
```
How many times is `printf` executed?

:::step{why="Evaluate j with the integer-division rules of the previous lesson: each / with two int operands truncates."}
`2 * 3 / 4` = 6 / 4 = 1; `2.0 / 5` = 0.4 (a double operand); `8 / 5` = 1. The sum is 2.4 (a double), and
storing it into the int `j` truncates: j = **2**.
:::

:::step{why="--j decrements first and yields the new value; k -= v means k = k − v."}
`--j` makes j = 1 and yields 1; `k -= 1` gives k = **−1**. So the switch value `i + k` runs through
−1, 0, 1, 2, 3 for i = 0 … 4.
:::

:::step{why="For each value, count the printf statements from the entry label to the end (there is no break)."}
−1 and 0 match no case: `default` only, 1 call each. 1 enters at `case 1`, falls into 2, 3, default: 3 calls.
2 enters at `case 2`: 3 calls. 3 enters at `case 3`: 2 calls.
:::

:::step{why="Add over the five iterations."}
1 + 1 + 3 + 3 + 2 = **10**.
:::

:::answer
**10** (the GATE key). The two mistakes the question is built around: taking j = 2.4 or j = 3 (then k and
every switch value shift), and stopping after the first `printf` of a case (which gives 5). The compiled
program prints the ten lines −1, 0, 1, 1, 1, 2, 2, 2, 3, 3.
:::
::::

::::example{#ex-switch-edge level="gate" title="Edge case: strange but legal labels" depth="standard"}
```c
int k = 8;
switch (k % 2) {
    case 5 < 4:  printf("even ");
    case1:       printf("one ");
    case 10 > 9: printf("odd");
}
```
What is printed for k = 8 and for k = 7?

:::step{why="A case label only needs an integer constant expression; a comparison of constants is one, with value 0 or 1."}
`case 5 < 4:` is `case 0:` and `case 10 > 9:` is `case 1:`.
:::

:::step{why="case1 without a space is an identifier followed by a colon: an ordinary label, invisible to the switch."}
`case1:` labels the second `printf` for `goto case1;`, which nobody uses. It is not a case label.
:::

:::step{why="Enter at the matching label and fall through to the end."}
k = 8: `k % 2` = 0 enters at `case 0`: `even `, then falls past `case1:` (`one `) and `case 1` (`odd`).
k = 7: value 1 enters at the last label: `odd`.
:::

:::answer
`even one odd` for k = 8 and `odd` for k = 7. The program compiles even with `-pedantic-errors` (the lesson
check confirms it; a compiler may warn about the unused label). Questions like this test whether you know
that labels are positions and constants are just numbers.
:::
::::

## Loops: while, do-while, for, and repeat-until

:::intuition{#loop-intuition title="A roundabout with a guard at the entrance or at the exit" depth="standard"}
A loop is a roundabout that you may drive around several times. What distinguishes the kinds of loop is
**where the guard stands** who decides whether you go round again. A `while` loop has the guard at the
entrance: before every lap, including the first, the guard checks the condition, and if it is false you
never enter. A `do`–`while` loop has the guard at the exit: you always drive one lap first, and only then
the guard decides whether you go round again. A `for` loop is a `while` loop with the preparation and the
"move on" step written on the sign at the entrance, so that everything about the loop is visible in one
line. Pascal's `repeat … until` is the exit-guard kind, but the guard asks the opposite question ("are we
done?" instead of "do we continue?").
:::

:::definition{#while term="The while loop" depth="standard"}
`while (e) S` evaluates `e`; if it is non-zero, runs `S` and starts again; if it is zero, the loop ends.
The test happens **before** every execution of the body, so the body can run zero times. The body must
eventually make `e` false (or execute a `break`), otherwise the loop never ends. A **semicolon right after
the parenthesis**, `while (i < 3);`, makes the body the empty statement: the loop tests `i < 3` forever
without changing `i`, and the block that follows runs only after the loop ends (here, never).
:::

:::definition{#do-while term="The do-while loop" depth="standard"}
`do S while (e);` runs `S` first, then evaluates `e`; if it is non-zero, runs `S` again, and so on. The test
happens **after** every execution of the body, so the body always runs **at least once**. With `n = 0`,
`while (n > 0) { … }` does nothing while `do { … } while (n > 0);` runs its body once. Note the semicolon
after the closing parenthesis: it is part of the syntax. A `continue` inside a `do`–`while` jumps to the test.
:::

:::definition{#for term="The for loop" depth="standard"}
`for (init; cond; inc) S` runs `init` once; then, as long as `cond` is non-zero, runs `S` followed by `inc`.
All three parts are optional: a missing `cond` means "always true", so `for (;;)` loops until a `break` or
`return`. Since C99, `init` may declare a variable (`for (int i = 0; …)`) whose scope is the loop only. The
**comma operator** lets one part do several things: `for (i = n, j = 0; i > 0; i /= 2, j += i)` initialises
two variables and updates two. The body may be empty (a lone `;`), in which case all the work happens in
the header, as in GATE 2006.

After a `for` loop ends normally, the counter holds the **first value that failed the test**, not the last
value used: after `for (i = 3; i <= 51; i += 4)`, i is 55.
:::

The `for` loop is not a new kind of repetition: it is a `while` loop written compactly. The next theorem says
exactly how, and where the two differ.

:::theorem{#for-while-equivalence name="for is a while in disguise (except for continue)" depth="standard"}
If the body `S` contains no `continue` (that belongs to this loop), then
`for (init; cond; inc) S` behaves exactly like `init; while (cond) { S inc; }` (with a missing `cond`
replaced by 1). If `S` does contain `continue`, the `for` loop still executes `inc` after the `continue`,
while the translated `while` loop skips it; a correct translation must run `inc` before each `continue`.
:::

:::proof{#proof-for-while of="the for–while equivalence" depth="standard"}
**Idea first:** write down the order of events of each loop and compare them.

C11 §6.8.5.3 defines the `for` statement: `init` is evaluated once before the loop; `cond` is evaluated before
each execution of the loop body; `inc` is evaluated "after each execution of the loop body". So the events of
the `for` loop are: init, cond, S, inc, cond, S, inc, …, cond (false). The `while` version executes init,
then cond, then the block `{ S inc; }`, then cond again, and so on: the same sequence, event for event, as long
as each execution of S runs to its end. A `break` leaves both loops at once without running `inc`, so it does
not spoil the equivalence. A `continue` in a `for` loop jumps to the end of the body, "just before" `inc`
(§6.8.6.2), so `inc` still runs; in the `while` version the same `continue` jumps to the end of the block
`{ S inc; }` (the next test), skipping `inc`. That is the only difference. ∎

**Sanity check (compiled).** `for (int i = 0; i < 5; i++) { if (i == 2) continue; s += i; }` gives s = 8
(0 + 1 + 3 + 4). The naive `while` translation, with `i++` at the end of the body, gets stuck at i = 2 for
ever (the check cuts it off after 1000 passes); moving an `i++` in front of the `continue` restores s = 8.
:::

:::definition{#repeat-until term="Pascal's repeat … until" depth="standard"}
Pascal has `while B do S` (test first, like C's `while`) and `repeat S until B` (body first, like C's
`do`–`while`), with one twist: `until B` gives the condition for **stopping**. The body runs, then `B` is
evaluated; if it is true, the loop ends, otherwise the body runs again. So `repeat S until B` corresponds to
C's `do S while (!B);`. Between `repeat` and `until` there may be several statements without `begin … end`.
:::

:::theorem{#repeat-while name="repeat S until B, using while" depth="standard"}
`repeat S until B` is equivalent to `S; while not B do S`. It is **not** equivalent to `while not B do S`
alone, which differs whenever `B` is already true before the first execution of `S`.
:::

:::proof{#proof-repeat-while of="the repeat-until translation" depth="standard"}
**Idea first:** unroll the first lap. After the first execution of `S`, both loops are in the same state and
ask the same question before each further lap.

Let the states after successive executions of `S` be $x_1, x_2, \dots$. `repeat S until B` runs `S` (reaching
$x_1$), then stops if $B(x_1)$; otherwise runs `S` again (reaching $x_2$), stops if $B(x_2)$, and so on: it
executes `S` exactly $t$ times, where $t$ is the first index with $B(x_t)$ true. `S; while not B do S` runs `S`
once (reaching $x_1$), and then the `while` loop runs `S` again exactly as long as $B$ is false at the
current state: after reaching $x_1$, $x_2$, … it continues while $B(x_i)$ is false and stops at the first $i$
with $B(x_i)$ true. That is the same $t$, the same executions of `S` and the same final state $x_t$ (and if no
such $t$ exists, both run for ever). `while not B do S` alone tests $B$ on the initial state $x_0$ first; if
$B(x_0)$ is true it runs `S` zero times, while `repeat` runs it once, so the two differ. ∎

**Sanity check.** The lesson check compares the two translations on 2000 random little state machines (a
random map `S` on a few states and a random stopping predicate `B`): `S; while not B do S` always matches,
and `while not B do S` alone differs in some of them.
:::

:::definition{#break-continue term="break, continue and return" depth="standard"}
- `break;` ends the **innermost** enclosing loop or `switch` at once; control continues after it. In nested
  loops, a `break` in the inner loop leaves only the inner loop.
- `continue;` ends the **current iteration** of the innermost enclosing loop: in a `while` or `do`–`while`
  it jumps to the test, in a `for` it jumps to `inc` (then the test).
- `return e;` leaves the whole function, from any depth of loops.

These three are "structured" jumps: each goes to a place determined by the structure of the program.
:::

:::definition{#goto term="goto and structured programming" depth="standard"}
`goto L;` jumps to the statement labelled `L:` anywhere in the same function. It can express every loop
(`L: if (!e) goto end; S; goto L; end: ;` is a `while`), and that is exactly its problem: a reader cannot see
the shape of the computation from the text, and proving properties of a program full of `goto`s (what holds
at a label, which paths reach it) is much harder. The classic result of structured programming is that
sequence, selection (`if`) and one loop (`while`) are enough to write every program, so `goto` is never
**necessary**. Its one widely accepted use in C is leaving several nested loops at once, which `break` cannot
do (the alternative is a flag tested by every loop). GATE asks about `goto` only in this conceptual form:
unrestricted `goto` hurts readability and verifiability, not speed.
:::

:::trap{#trap-semicolon title="A semicolon after the loop header ends the loop's body" depth="standard"}
`for (i = 0; i < n; i++);` followed by `{ sum += i; }` runs the empty statement n times and then runs the
block **once**, with i = n. `while (i < 3); { i++; }` never ends, because the body is the empty statement
and nothing changes `i`. GATE 2006 uses an empty body on purpose (all the work is in the header); other
questions use it as a trap. When a loop header ends in `;`, read the body as empty.
:::

:::note{#recap-loops title="Recap" depth="quick"}
`while`: test, then body (0 or more times). `do`–`while`: body, then test (at least once). `for (init; cond;
inc)` = `init; while (cond) { body; inc; }`, except that `continue` in a `for` still runs `inc`. After a loop
the counter holds the first failing value. `repeat S until B` = `S; while not B do S`. `break` leaves the
innermost loop or switch, `continue` the current iteration; `goto` is never necessary.
:::

:::viz{#loop-shapes-viz spec="loop-shapes" mode="animate" depth="standard"}
:::

### Worked examples: loop forms

::::example{#ex-while-do-easy level="easy" title="while and do-while with a false start" depth="quick"}
`w` counts the passes of `while (n > 0) { w++; n--; }` and `d` those of `do { d++; n--; } while (n > 0);`, each
started from the same n. Find w and d for n = 0, n = 3 and n = −2.

:::step{why="while tests before the first pass."}
n = 0: `0 > 0` is false at once, so w = 0. n = −2: also w = 0. n = 3: passes with n = 3, 2, 1, so w = 3.
:::

:::step{why="do-while always runs once, then tests."}
n = 0: one pass (n becomes −1), then `−1 > 0` is false: d = 1. n = −2: d = 1. n = 3: passes with n = 3, 2, 1, then
`0 > 0` fails: d = 3.
:::

:::answer
(w, d) = (0, 1), (3, 3), (0, 1). The two loops agree whenever the condition is true at the start, and differ
by exactly one pass when it is false at the start. That single extra pass is the only thing `do`–`while`
questions ever test.
:::
::::

::::example{#ex-for-comma level="medium" title="All the work in the header (the GATE 2006 loop with n = 37)" depth="standard"}
`for (i = n, j = 0; i > 0; i /= 2, j += i);` with n = 37. What is j at the end?

:::step{why="The comma operator in init runs both assignments; the body is the empty statement."}
Start: i = 37, j = 0. Each pass does nothing in the body, then `i /= 2` and **after it** `j += i`.
:::

:::step{why="The order inside the comma expression matters: j adds the new, halved value of i."}
i: 37 → 18 (j = 18) → 9 (j = 27) → 4 (j = 31) → 2 (j = 33) → 1 (j = 34) → 0 (j = 34).
:::

:::step{why="The test i > 0 fails once i is 0, after the last update has added 0."}
The loop stops with i = 0 and j = **34**.
:::

:::answer
j = 34 = 18 + 9 + 4 + 2 + 1. Notice that 37 itself is never added (the first addition comes after the first
halving) and that 34 is close to 37: the halvings add up to almost n. Section "Counting iterations" proves
that the sum is exactly n minus the number of 1 bits of n (37 = 100101₂ has three, and 37 − 3 = 34).
:::
::::

::::example{#ex-repeat-gate level="gate" title="repeat … until with while (GATE 1991)" depth="standard"}
Convert `repeat S until B;` into an equivalent Pascal statement that uses `while`, and test the answer on
`repeat x := 2 * x until x > 100` started from x = 3 and from x = 500.

:::step{why="repeat runs the body first; the while loop can only test first, so peel one execution off."}
`S; while not B do S`. The first `S` is the lap that `repeat` always drives; after it, both loops continue
exactly while `B` is false.
:::

:::step{why="Trace the repeat loop to have reference values."}
From 3: x = 6, 12, 24, 48, 96, 192; the test `x > 100` first holds at 192, after 6 passes. From 500: x = 1000
after one pass, and `1000 > 100` stops the loop: 1 pass.
:::

:::step{why="The tempting answer while not B do S tests before the first lap: check it on the start that already satisfies B."}
From 500, `while not (x > 100) do x := 2 * x` runs **zero** times and leaves 500. The translation
`x := 2 * x; while not (x > 100) do x := 2 * x` gives 1000, like `repeat`.
:::

:::answer
**`S; while not B do S`** (in C: `do S while (!B);` or `S; while (!B) S;`). It matches on both starts (192
after 6 passes, 1000 after 1); the shorter `while not B do S` fails from 500. The negation is essential too:
`while B do S` would stop when it should continue.
:::
::::

::::example{#ex-continue-edge level="gate" title="Edge case: translating a for loop that uses continue" depth="standard"}
`int s = 0; for (int i = 0; i < 5; i++) { if (i == 2) continue; s += i; }` gives s = ? Translate it into a
`while` loop that gives the same result.

:::step{why="In a for loop, continue skips the rest of the body but still runs the increment."}
i = 0, 1 are added; i = 2 is skipped; i = 3, 4 are added: s = 0 + 1 + 3 + 4 = **8**.
:::

:::step{why="The textbook translation puts i++ at the end of the body, which continue jumps over."}
`i = 0; while (i < 5) { if (i == 2) continue; s += i; i++; }`: at i = 2 the `continue` goes straight back to
the test with i still 2, for ever. (The lesson check stops it after 1000 passes: s = 1, i = 2.)
:::

:::step{why="Every path that leaves the body early must perform the increment itself."}
`while (i < 5) { if (i == 2) { i++; continue; } s += i; i++; }` gives s = 8 again.
:::

:::answer
s = 8; the correct `while` form increments before the `continue`. This is the one case where the
for–while equivalence theorem needs care, and it is a favourite of "which of these loops are equivalent"
questions.
:::
::::

## Counting iterations exactly

:::intuition{#count-intuition title="Fence posts and halving a cake" depth="standard"}
A fence 20 metres long with a post every 4 metres needs 6 posts, not 5: one at 0, 4, 8, 12, 16 and 20.
Counting loop iterations is counting fence posts: the values the counter takes, from the first to the last
one that still passes the test. Forgetting the first post (or adding a post beyond the end) is the
**off-by-one error**, and it is the most common wrong answer in iteration questions. Halving loops are a
different picture: cut a cake in half, keep one half, cut it in half again… The number of cuts before only
crumbs remain grows very slowly, like the number of digits of the cake's size written in binary. Both
pictures become exact formulas below.
:::

:::theorem{#count-arith name="Iterations of an arithmetic loop" depth="standard"}
For integers $a$, $b$ and a step $s > 0$, the loop `for (i = a; i <= b; i += s)` runs exactly
$$N = \max\left(0,\ \left\lfloor \frac{b - a}{s} \right\rfloor + 1\right)$$
times, the last value used is $a + (N - 1)s$, and on exit $i = a + Ns$. For `i < b` replace $b$ by $b - 1$; the
counting-down loop `for (i = b; i >= a; i -= s)` runs the same $N$ times.
:::

:::proof{#proof-count-arith of="the arithmetic loop count" depth="standard"}
**Idea first:** list the values the counter takes; they form an arithmetic progression, and we count its
terms that do not exceed $b$.

The counter takes the values $a, a + s, a + 2s, \dots$; the body runs for $a + ks$ exactly when
$a + ks \le b$, i.e. $k \le (b - a)/s$. If $b < a$ no $k \ge 0$ qualifies and $N = 0$. Otherwise the qualifying
$k$ are $0, 1, \dots, \lfloor (b - a)/s \rfloor$, which is $\lfloor (b - a)/s \rfloor + 1$ values. The last
one used is $k = N - 1$, and the test fails for the first time at $k = N$, so the counter exits holding
$a + Ns$. For `i < b` the condition is $a + ks \le b - 1$ (all values are integers). Counting down from $b$ by
$s$ while $\ge a$ visits $b, b - s, \dots$, the same number of terms by symmetry. ∎

**Sanity check.** `for (i = 3; i <= 51; i += 4)`: $\lfloor 48/4 \rfloor + 1 = 13$ passes, last value 51, exit
value 55. The lesson check compares the formula with compiled loops for 480 combinations of $a$, $b$, $s$ and
the three loop shapes.
:::

:::trap{#trap-off-by-one title="b − a is the number of gaps, not the number of posts" depth="standard"}
`for (i = 1; i <= 100; i++)` runs 100 times, but `for (i = 0; i <= 100; i++)` runs **101** times and
`for (i = 1; i < 100; i++)` runs 99. Examiners include $\frac{b-a}{s}$ (the number of gaps) among the
options, next to the right $\lfloor\frac{b-a}{s}\rfloor + 1$. Check every count on the smallest case: from
a to a with any step is **one** pass.
:::

:::theorem{#count-halving name="Iterations of halving and doubling loops" depth="standard"}
Let $n \ge 1$ and $L = \lfloor \log_2 n \rfloor$ (so $2^L \le n < 2^{L+1}$; $L + 1$ is the number of binary
digits of $n$). With integer division:

| Loop | Iterations |
|:--|:--:|
| `for (i = n; i > 0; i /= 2)` | $L + 1$ |
| `for (i = n; i > 1; i /= 2)` | $L$ |
| `for (i = 1; i <= n; i *= 2)` | $L + 1$ |
| `for (i = 2; i <= n; i *= 2)` | $L$ |
| `for (i = 1; i < n; i *= 2)` | $\lceil \log_2 n \rceil$ |

During the halving loop, after $k$ passes the counter is exactly $\lfloor n / 2^k \rfloor$. All of these are
$\Theta(\log n)$; only the $\pm 1$ differs, and GATE options often differ by exactly that.
:::

:::proof{#proof-count-halving of="the halving and doubling counts" depth="standard"}
**Idea first:** halving with integer division deletes the last binary digit, and doubling appends one; so
both loops count binary digits.

*Halving.* First, $\lfloor \lfloor n/2^k \rfloor / 2 \rfloor = \lfloor n / 2^{k+1} \rfloor$ (dividing by 2 and
dropping the remainder twice is the same as dropping it once: write $n = q 2^{k+1} + r$ with
$0 \le r < 2^{k+1}$ and check both sides equal $q$). So after $k$ passes $i = \lfloor n/2^k \rfloor$, which is
$n$ with its last $k$ binary digits removed. It is $\ge 1$ exactly when $2^k \le n$, i.e. $k \le L$. The loop
with test `i > 0` runs for $i = \lfloor n/2^k \rfloor$, $k = 0, 1, \dots, L$: $L + 1$ passes. With test
`i > 1` it needs $\lfloor n/2^k \rfloor \ge 2$, i.e. $2^{k+1} \le n$, i.e. $k \le L - 1$: $L$ passes.

*Doubling.* `for (i = 1; i <= n; i *= 2)` runs for $i = 2^k$ with $2^k \le n$, i.e. $k = 0, \dots, L$: $L + 1$
passes; starting from 2 drops $k = 0$: $L$ passes. With `i < n` it runs for $2^k < n$, i.e. $k < \log_2 n$, and
the number of such $k \ge 0$ is $\lceil \log_2 n \rceil$ (for $n = 1$, none). ∎

**Sanity check.** $n = 1000$: $L = 9$, so the halving loop with `i > 0` runs 10 times
(1000, 500, 250, 125, 62, 31, 15, 7, 3, 1) and `i < 1000` with doubling runs 10 times (1 … 512). The lesson
check runs all five loops for every $n$ from 1 to 69 and for a dozen larger values, including $2^{30}$.
:::

The animation runs GATE 2018's function on $2^{40}$: the first halving loop counts the binary digits of n
minus one (40), and the second halving loop does the same to 40, whose binary form 101000 has six digits.

:::viz{#halving-loop-viz spec="halving-loop-count" mode="animate" depth="standard"}
:::

:::derivation{#log-log of="two halving loops in a row: ⌊log₂ ⌊log₂ n⌋⌋" depth="standard"}
GATE 2018 runs two loops: `for (i = n; i > 1; i = i/2) j++;` and then `for ( ; j > 1; j = j/2) sum++;`.

1. By the halving theorem (test `> 1`), the first loop runs $\lfloor \log_2 n \rfloor$ times, so it leaves
   $j = \lfloor \log_2 n \rfloor$. For $n = 2^{40}$: $j = 40$.
2. The second loop is the same loop applied to $j$: it runs $\lfloor \log_2 j \rfloor$ times, so
   $\text{sum} = \lfloor \log_2 \lfloor \log_2 n \rfloor \rfloor$.
3. For $j = 40$: $2^5 = 32 \le 40 < 64$, so sum = **5** (j goes 40, 20, 10, 5, 2, 1, and the body runs for the
   first five values).

**Sanity check.** For $n = 2^{16}$, sum = $\lfloor \log_2 16 \rfloor = 4$; the lesson check compiles the
function and confirms $\lfloor \log_2 e \rfloor$ for every $n = 2^e$, $e = 2, \dots, 63$, using the
question's 64-bit `unsigned long`.
:::

The halving loop of GATE 2006 does not count its passes; it **adds up** the halved values. That sum has a
beautiful exact value.

:::theorem{#halving-sum name="The sum of the halvings" depth="standard"}
For an integer $n \ge 1$,
$$\sum_{k \ge 1} \left\lfloor \frac{n}{2^k} \right\rfloor = n - s_2(n),$$
where $s_2(n)$ is the number of 1 bits in the binary form of $n$. Since $1 \le s_2(n) \le \lfloor \log_2 n
\rfloor + 1$, the sum lies between $n - 1 - \log_2 n$ and $n - 1$: it is $\Theta(n)$.
:::

:::proof{#proof-halving-sum of="the halving sum" depth="standard"}
**Idea first:** count how much each binary digit of $n$ contributes to each term.

Write $n = \sum_{t} b_t 2^t$ with bits $b_t \in \{0, 1\}$. The term $\lfloor n / 2^k \rfloor$ is $n$ shifted
right by $k$ places: $\sum_{t \ge k} b_t 2^{t-k}$. Summing over $k \ge 1$, a bit $b_t$ (with $t \ge 1$) appears
in the terms $k = 1, \dots, t$, contributing $b_t (2^{t-1} + 2^{t-2} + \dots + 1) = b_t (2^t - 1)$; the bit $b_0$
contributes nothing. So the sum is $\sum_t b_t (2^t - 1) = \sum_t b_t 2^t - \sum_t b_t = n - s_2(n)$. The bounds
follow because $n \ge 1$ has at least one and at most $\lfloor \log_2 n \rfloor + 1$ one-bits. ∎

**Sanity check.** $n = 37 = 100101_2$: $18 + 9 + 4 + 2 + 1 = 34 = 37 - 3$. $n = 1000$: 994 (1000 has six 1
bits). The lesson check verifies the identity for every $n$ up to 2048 and against the compiled loop.
:::

:::note{#recap-count title="Recap" depth="quick"}
Arithmetic loop `a … b` step s: ⌊(b − a)/s⌋ + 1 passes (`<` means b − 1); the counter exits at the first
failing value. Halving from n: ⌊log₂ n⌋ + 1 passes while `> 0`, ⌊log₂ n⌋ while `> 1`; doubling from 1 while
`<= n`: ⌊log₂ n⌋ + 1. Two halving loops in a row: ⌊log₂ ⌊log₂ n⌋⌋. The halved values add up to n − (number of
1 bits): Θ(n).
:::

### Worked examples: counting iterations

::::example{#ex-count-easy level="easy" title="An arithmetic loop, two ways" depth="quick"}
How many times do `for (i = 3; i <= 51; i += 4)` and `for (i = 3; i < 51; i += 4)` run, and what is i
afterwards?

:::step{why="Apply the formula with a = 3, b = 51, s = 4."}
`<=`: ⌊(51 − 3)/4⌋ + 1 = 12 + 1 = **13** passes (3, 7, …, 51); i exits at 3 + 13·4 = 55.
:::

:::step{why="For a strict test, replace b by b − 1 = 50."}
`<`: ⌊(50 − 3)/4⌋ + 1 = 11 + 1 = **12** passes (3, 7, …, 47); i exits at 3 + 12·4 = 51.
:::

:::answer
13 passes ending with i = 55, and 12 passes ending with i = 51. The two loops differ only because 51 itself
lies on the progression (51 − 3 is a multiple of 4); with `i <= 50` and `i < 50` they would both run 12 times.
:::
::::

::::example{#ex-count-doubling level="medium" title="Doubling up to n" depth="standard"}
Count the passes of `for (i = 1; i < n; i *= 2)` for n = 1000 and n = 1024, and of `for (i = 1; i <= n; i *= 2)`
for n = 1024.

:::step{why="The doubling loop visits the powers of two, so list which ones pass the test."}
n = 1000, `i < n`: i = 1, 2, 4, …, 512 (since 1024 ≥ 1000): $2^0 … 2^9$, **10** passes = ⌈log₂ 1000⌉.
:::

:::step{why="When n is itself a power of two, the strict and non-strict tests differ by exactly that power."}
n = 1024, `i < n`: again 1 … 512, **10** passes = ⌈log₂ 1024⌉ = 10. With `i <= n`: 1 … 1024, **11** passes =
⌊log₂ 1024⌋ + 1.
:::

:::answer
10, 10 and 11. The formulas ⌈log₂ n⌉ (strict) and ⌊log₂ n⌋ + 1 (non-strict) agree except when n is a power of
two, where the non-strict loop gets one more pass. In asymptotic questions both are simply Θ(log n).
:::
::::

::::example{#ex-count-gate level="gate" title="Two halving loops (GATE 2018)" depth="standard"}
```c
unsigned long int fun(unsigned long int n){
    unsigned long int i, j = 0, sum = 0;
    for (i = n; i > 1; i = i/2) j++;
    for ( ; j > 1; j = j/2) sum++;
    return(sum);
}
```
What does `fun(2^40)` return? (A) 4 (B) 5 (C) 6 (D) 40

:::step{why="The first loop halves i while i > 1: it runs floor(log2 n) times, and j counts the passes."}
i = $2^{40}, 2^{39}, \dots, 2^1$: 40 passes, so j = 40 when i reaches 1. (With 64-bit `unsigned long`, $2^{40}$
fits; this is why the question states the size.)
:::

:::step{why="The second loop is the same halving loop applied to j."}
j = 40, 20, 10, 5, 2 pass the test `j > 1`; j = 1 fails. That is 5 passes: sum = 5.
:::

:::step{why="Cross-check with the formula."}
$\lfloor \log_2 40 \rfloor = 5$ because $32 \le 40 < 64$.
:::

:::answer
**(B) 5**. Option D (40) stops after the first loop; option C (6) counts the binary digits of 40 (the `> 0`
version); option A undercounts the second loop. The compiled function returns 5.
:::
::::

::::example{#ex-count-edge level="gate" title="Edge case: halving and doubling loops that never stop" depth="standard"}
What is wrong with `for (i = 0; i < n; i *= 2)` and with `for (i = n; i >= 0; i /= 2)` (both with n = 100)?

:::step{why="A doubling loop multiplies its counter; zero times two is zero."}
The first loop starts at i = 0, and 0 · 2 = 0 < 100 for ever: it never ends (the lesson check stops it after
1000 passes with i still 0).
:::

:::step{why="A halving loop reaches 0 and stays there, because 0 / 2 = 0."}
The second loop visits 100, 50, 25, 12, 6, 3, 1, 0, 0, 0, …: the test `i >= 0` is true at 0 for ever.
:::

:::answer
Both are infinite loops. Halving loops must stop **above** the fixed point 0 (`i > 0` or `i > 1`) and
doubling loops must start **away** from it (at 1 or 2). Whenever a loop's update has a value that maps to
itself, check whether the test lets the loop sit there.
:::
::::

## Nested loops and closed forms

:::intuition{#nested-intuition title="A clock's hands, or a grid of seats" depth="standard"}
The minute hand goes round once for every step of the hour hand: 60 minutes times 12 hours make 720 minutes.
Nested loops work the same way. The inner loop runs completely for each single pass of the outer loop, so
the inner body runs once for every **pair** (outer value, inner value). Picture a grid: one row per outer
value and, in that row, one seat per inner value. Counting the executions of the innermost statement is
counting the seats. When every row has the same number of seats, multiply; when the rows have different
lengths (the inner loop depends on the outer counter), add the row lengths.
:::

:::definition{#nested-loops term="Counting the executions of a nested loop" depth="standard"}
For `for (outer …) for (inner …) S`, the number of executions of `S` is
$$\sum_{\text{outer values } i} (\text{number of inner passes when the outer counter is } i).$$
If the inner count does not depend on $i$, this is (outer count) × (inner count). If the statement
accumulates a value (`k = k + v`), the final value is the sum of `v` over all executions; when `v` does not
change, it is (number of executions) × v. Two questions must never be confused: **how many times** the body
runs (time) and **what value** a variable ends with (the result); GATE 2013 asks for the second.
:::

:::theorem{#triangular-count name="Triangular and tetrahedral counts" depth="standard"}
For $n \ge 0$:

1. `for (i = 0; i < n; i++) for (j = i; j < n; j++) S` runs `S` exactly $\frac{n(n+1)}{2}$ times.
2. `for (i = 0; i < n; i++) for (j = i; j < n; j++) for (k = i; k <= j; k++) S` runs `S` exactly
   $\frac{n(n+1)(n+2)}{6}$ times, which is $\Theta(n^3)$.
:::

:::proof{#proof-triangular of="the triangular and tetrahedral counts" depth="standard"}
**Idea first:** count the tuples of counter values for which the body runs, instead of adding sums.

(1) The body runs once for each pair $(i, j)$ with $0 \le i \le j \le n - 1$. Row $i$ has $n - i$ seats, so the
total is $n + (n-1) + \dots + 1 = \frac{n(n+1)}{2}$. (Equivalently: pairs with $i < j$ number
$\binom{n}{2}$, plus $n$ pairs with $i = j$.)

(2) The body runs once for each triple with $0 \le i \le k \le j \le n - 1$. Choosing a non-decreasing triple
from $n$ values is choosing a multiset of size 3, of which there are $\binom{n+2}{3} = \frac{n(n+1)(n+2)}{6}$
(stars and bars). ∎

**Sanity check.** $n = 10$: 55 pairs; $n = 5$: 35 triples. The lesson check compiles both nests for
$n = 1, 2, 5, 10, 17$. GATE 2014's brute-force maximum sub-array function has exactly the nest of (2), so it
does $\Theta(n^3)$ additions.
:::

The animation fills the grid of GATE 2013's double loop for n = 8: one row per value of i, one cell per value
of j, and the value of k after each execution of the body.

:::viz{#nested-grid-viz spec="nested-loop-grid" mode="animate" depth="standard"}
:::

:::derivation{#nested-closed-form of="the return value of GATE 2013's unknown(n)" depth="standard"}
```c
int unknown(int n){
    int i, j, k = 0;
    for (i = n/2; i <= n; i++)
        for (j = 2; j <= n; j = j*2)
            k = k + n/2;
    return (k);
}
```

1. **Outer loop:** i runs from $\lfloor n/2 \rfloor$ to $n$, an arithmetic loop with step 1:
   $n - \lfloor n/2 \rfloor + 1$ passes (about $n/2$).
2. **Inner loop:** j = 2, 4, 8, … while $j \le n$: a doubling loop starting at 2, so $\lfloor \log_2 n \rfloor$
   passes, the same for every i.
3. **Body:** each execution adds the constant $\lfloor n/2 \rfloor$ (n does not change).
4. **Result:** $k = (n - \lfloor n/2 \rfloor + 1) \cdot \lfloor \log_2 n \rfloor \cdot \lfloor n/2 \rfloor \approx
   \frac{n}{2} \cdot \log_2 n \cdot \frac{n}{2} = \frac{n^2 \log_2 n}{4}$, so $k = \Theta(n^2 \log n)$.

**Sanity check (compiled):** unknown(8) = 5 · 3 · 4 = 60, unknown(16) = 9 · 4 · 8 = 288, unknown(10) =
6 · 3 · 5 = 90. The lesson check compares the closed form with the compiled function for every n from 2 to 79
and for 100, 128 and 1000, and confirms that $k/(n^2 \log_2 n)$ approaches 1/4.
:::

:::trap{#trap-time-vs-value title="The running time is Θ(n log n), the value is Θ(n² log n)" depth="standard"}
GATE 2013's loop body runs about $\frac{n}{2}\log_2 n$ times, so the **running time** is $\Theta(n \log n)$. But
the question asks for the **return value**, and each execution adds $n/2$, not 1, which multiplies by another
factor of n. The expected wrong answer is the time complexity. Before answering, underline what is being
measured: the number of iterations, or the value of a variable.
:::

:::note{#recap-nested title="Recap" depth="quick"}
A nested loop's body runs once per pair (tuple) of counter values: multiply independent counts, add
dependent ones. i ≤ j pairs: n(n + 1)/2; i ≤ k ≤ j triples: n(n + 1)(n + 2)/6. A sum that adds a constant c each
time ends at (count) × c. Read whether the question asks for time or value.
:::

### Worked examples: nested loops

::::example{#ex-nested-rect level="easy" title="A rectangle of iterations" depth="quick"}
How many times does `c++` run in `for (i = 0; i < 4; i++) for (j = 0; j < 5; j++) c++;`?

:::step{why="The inner loop does not depend on i, so every row of the grid has the same length."}
Outer: 4 passes (i = 0 … 3). Inner: 5 passes (j = 0 … 4) for each of them.
:::

:::step{why="Equal rows: multiply."}
4 × 5 = **20**.
:::

:::answer
20. A rectangular nest is the only case where "multiply the loop counts" is right without thinking; the next
examples break that rule.
:::
::::

::::example{#ex-nested-tri level="medium" title="A triangle of iterations" depth="standard"}
How many times does `c++` run in `for (i = 0; i < n; i++) for (j = i; j < n; j++) c++;` for n = 10, and in
general?

:::step{why="The inner loop starts at i, so row i is shorter by i."}
Row i has n − i passes: 10, 9, 8, …, 1 for n = 10.
:::

:::step{why="Unequal rows: add their lengths."}
10 + 9 + … + 1 = 10 · 11 / 2 = **55**. In general n(n + 1)/2.
:::

:::step{why="A sanity check on the smallest cases catches off-by-one errors."}
n = 1: one pass (i = j = 0), and 1 · 2 / 2 = 1. n = 2: passes (0, 0), (0, 1), (1, 1): 3 = 2 · 3 / 2.
:::

:::answer
55, and n(n + 1)/2 = Θ(n²) in general. The tempting product 10 × 10 = 100 counts the full square; the
triangle is about half of it, which changes the number but not the Θ class.
:::
::::

::::example{#ex-nested-gate level="gate" title="The value of a nested loop (GATE 2013)" depth="standard"}
For `unknown(n)` above, which is the return value: (A) Θ(n²) (B) Θ(n² log n) (C) Θ(n³) (D) Θ(n³ log n)?

:::step{why="Count the outer passes with the arithmetic-loop formula."}
i from ⌊n/2⌋ to n: n − ⌊n/2⌋ + 1 ≈ n/2 passes.
:::

:::step{why="The inner loop is a doubling loop from 2, independent of i."}
j = 2, 4, …, up to n: ⌊log₂ n⌋ passes for every i.
:::

:::step{why="Each execution adds n/2, so the result is (number of executions) × n/2."}
k ≈ (n/2) · log₂ n · (n/2) = n² log₂ n / 4.
:::

:::answer
**(B) Θ(n² log n)**. Exactly, k = (n − ⌊n/2⌋ + 1) · ⌊log₂ n⌋ · ⌊n/2⌋; for n = 8 that is 5 · 3 · 4 = 60, which the
compiled function returns. Option A forgets the log; C treats the inner doubling loop as linear; D does both
the n and the n/2 factors and then adds a log.
:::
::::

::::example{#ex-nested-edge level="gate" title="Edge case: an inner loop bounded by a doubling outer counter" depth="standard"}
How many times does `c++` run in `for (i = 1; i <= n; i *= 2) for (j = 0; j < i; j++) c++;` for n = 100? Is it
Θ(n log n)?

:::step{why="The outer counter takes the powers of two up to n."}
i = 1, 2, 4, 8, 16, 32, 64 (128 > 100).
:::

:::step{why="Row i has exactly i passes, so add the powers of two."}
1 + 2 + 4 + … + 64 = 127 = $2^7 - 1$.
:::

:::step{why="A geometric sum is dominated by its last term."}
In general $1 + 2 + \dots + 2^L = 2^{L+1} - 1 < 2n$ with $L = \lfloor \log_2 n \rfloor$, so the count is Θ(n).
:::

:::answer
127, and Θ(n), **not** Θ(n log n). "log n outer passes times up to n inner passes" is only an upper bound;
because the rows double, the last row alone is more than half of the total. Multiplying the maximum row by
the number of rows overestimates whenever the rows grow geometrically.
:::
::::

## Loops that misbehave: floating-point counters and infinite loops

:::intuition{#misbehave-intuition title="A ruler with only some of the marks" depth="standard"}
A floating-point number is like a ruler that has marks only at certain positions: all the halves, quarters,
eighths and so on (in binary) up to some fineness, and nothing in between. A value like 0.1 is not on any
mark, so the computer stores the nearest mark instead, slightly off. Add that slightly-off value ten times
and you land near 1, but not on the mark labelled 1. A loop waiting for the counter to **equal** 1 waits for
ever. A second way loops misbehave has nothing to do with floats: the body may bring the state back to a
place it has already been, like a walker following the same circle of streets, and then the loop never ends
however long it runs.
:::

:::definition{#float-loops term="Loops on floating-point values" depth="standard"}
`float` and `double` store numbers in binary with a fixed number of significant bits (24 and 53). A value is
stored **exactly** if it is an integer of moderate size or a fraction whose denominator is a power of two
(0.5, 0.25, 0.0625, 1.9375 …), as long as it fits in those bits. Other decimal fractions (0.1, 0.2, 0.3 …) are
rounded to the nearest representable value. Consequences for loops:

- A loop whose values are all exactly representable (doubling, halving, adding 0.25) behaves exactly as the
  real-number reasoning predicts: GATE 2019's loop is of this kind.
- Repeatedly adding an inexact step accumulates error: ten additions of `0.1f` give 1.000000119…, ten of the
  double `0.1` give 0.99999999999999989, and neither equals 1. A test `x != 1.0` then never becomes false.
- The safe patterns: count with an integer and compute the float from it (`x = k / 10.0`), or test with `<`
  and a margin (`while (x < 0.95)`), never with `==` or `!=`.

In comparisons like `i / j > 0.0625`, the float operands are converted to `double` for the comparison
with the double constant; since every value involved is exact, nothing is lost.
:::

:::definition{#infinite-loops term="Termination and infinite loops" depth="standard"}
A loop terminates when its condition becomes false after finitely many passes. It does not terminate when
the condition stays true for ever, which happens in a few recognisable ways:

1. **Nothing in the body changes the condition**: `while (i < 3);` (empty body), or a body that changes the
   wrong variable.
2. **The state reaches a fixed point** where the test is still true: halving to 0 with test `i >= 0`; doubling
   from 0; GATE 2024's `a = a / 12 + 1`, which maps 1 to 1.
3. **The test can never fail for the type**: `unsigned u; … u >= 0` is always true (after 0 comes
   4 294 967 295); a floating-point counter compared with `!=` (above).
4. **The condition is an assignment**: `while (a = b)` with b ≠ 0 is always true, whatever the body does to a.

To show that a loop **does** terminate, find a quantity that strictly decreases with every pass and cannot
decrease for ever (a non-negative integer, for instance). Lesson 3 (loop algorithms) makes this "variant"
argument formal.
:::

:::theorem{#fixed-point name="A repeated state means an infinite loop" depth="standard"}
Suppose a loop's body changes only the variables of a state $x$, deterministically (the next state $f(x)$
depends only on the current state), and the test depends only on $x$. If at the moment of some test the
state equals a state that was already tested earlier and passed, the loop runs for ever. In particular, if
the test holds at $x$ and $f(x) = x$, the loop never ends once it reaches $x$.
:::

:::proof{#proof-fixed-point of="the repeated-state rule" depth="standard"}
**Idea first:** a deterministic machine that returns to where it was must repeat what it did from there.

Let the tested states be $x_0, x_1 = f(x_0), x_2 = f(x_1), \dots$, and suppose $x_q = x_p$ with $p < q$ and the
test true at $x_p, x_{p+1}, \dots, x_{q-1}$ (every state up to the repeat passed). Then $x_{q+1} = f(x_q) =
f(x_p) = x_{p+1}$, and by induction $x_{q+t} = x_{p+t}$ for all $t \ge 0$. The states from $p$ on repeat with
period $q - p$; each of them is one of $x_p, \dots, x_{q-1}$, on which the test is true, so the test is true at
every future check and the loop never exits. A fixed point is the case $q = p + 1$. ∎

**Sanity check (compiled).** GATE 2024: from a = 6 the body gives 6/12 + 1 = 1, and from 1 it gives
1/12 + 1 = 1 again, with `1 < 10` true: the compiled program is cut off by the time limit without printing.
The same argument settles every b ≥ 0 at once: for $0 \le a < 10$, `a / 12` is 0, so one pass sets
a = 1 + b, and the next pass sets it to 1 + b again, a fixed point. The loop ends after one pass if
1 + b ≥ 10 (b = 9 prints 10) and never otherwise (b = 3 sticks at 4); the check runs both.
:::

:::trap{#trap-float-equality title="Equality tests on floats and the 'it must reach 1' answer" depth="standard"}
For `float x = 0; while (x != 1.0f) x += 0.1f;` the tempting answer is "10 passes". The compiled loop is
still running after 1000 passes (x is about 100 by then), because after ten additions x is 1.000000119, not
1. The opposite trap is GATE 2019, where students suspect rounding trouble that does not exist: every value
there is a power of two or a sum of a few, all exact. Decide which case you are in by asking whether each
value is a fraction with a power-of-two denominator.
:::

:::note{#recap-misbehave title="Recap" depth="quick"}
Powers of two and short binary fractions are exact in float and double; 0.1 is not, so never test float
loops with `==`/`!=`. A loop is infinite when nothing changes its test, when its state repeats (a fixed point
such as 0 for halving, 1 for `a / 12 + 1`), when the test cannot fail (`unsigned >= 0`), or when the test is
an assignment of a non-zero value.
:::

### Worked examples: floats and termination

::::example{#ex-float-easy level="easy" title="A float loop that is exact (GATE 2019)" depth="quick"}
```c
float sum = 0.0, j = 1.0, i = 2.0;
while (i/j > 0.0625){
    j = j + j;
    sum = sum + i/j;
    printf("%f\n", sum);
}
```
How many times is `sum` printed?

:::step{why="Track the ratio i/j that the test compares; j doubles every pass, so the ratio halves."}
Before the passes the ratio is 2/1 = 2, then 1, 0.5, 0.25, 0.125, 0.0625.
:::

:::step{why="The body runs (and prints) once for each ratio that is strictly greater than 0.0625."}
Ratios 2, 1, 0.5, 0.25, 0.125 pass: 5 prints, of sum = 1, 1.5, 1.75, 1.875, 1.9375. The ratio 0.0625 is not
greater than 0.0625, so the loop stops.
:::

:::step{why="Check that no rounding can interfere: every value is a power of two or a short binary fraction."}
0.0625 = 2⁻⁴ and all ratios are $2^{1-k}$: exact in float, so `0.0625 > 0.0625` is exactly false.
:::

:::answer
**5** (the GATE key). The trap answer 4 comes from stopping one pass early (taking the test as `>=` fails
earlier, or miscounting the first pass with ratio 2); 6 comes from fearing that 0.0625 is stored inexactly.
The compiled program prints 1.000000, 1.500000, 1.750000, 1.875000, 1.937500.
:::
::::

::::example{#ex-float-tenth level="medium" title="A float loop that never stops" depth="standard"}
How many passes does `float x = 0; while (x != 1.0f) x += 0.1f;` make? Rewrite it so that it makes exactly 10.

:::step{why="0.1 has no finite binary expansion, so 0.1f is the nearest float, slightly larger than 0.1."}
Each addition is rounded again. After ten additions x = 1.000000119 (printed with nine decimals), not 1.
:::

:::step{why="Once x has passed 1 without equalling it, it keeps growing, so the test x != 1.0f stays true."}
The loop never ends: the lesson check stops it after 1000 passes, with x near 100.
:::

:::step{why="Count with an integer, or test with a margin, so that rounding cannot change the number of passes."}
`for (k = 0; k < 10; k++) x = (k + 1) / 10.0f;` or `while (x < 0.95f) x += 0.1f;` (10 passes, checked).
:::

:::answer
Infinitely many; the fixed versions make 10. A float loop is trustworthy only when either all its values are
exact or its test has a margin larger than the accumulated rounding error.
:::
::::

::::example{#ex-infinite-gate level="gate" title="A loop stuck at a fixed point (GATE 2024, set 1)" depth="standard"}
```c
int a = 6;
int b = 0;
while (a < 10) {
    a = a / 12 + 1;
    a += b; }
printf("%d", a);
```
(A) prints 9 (B) prints 10 (C) infinite loop (D) prints 6

:::step{why="Run the first pass with integer division."}
a = 6: `6 < 10`, so a = 6/12 + 1 = 0 + 1 = 1, then a += 0: a = 1.
:::

:::step{why="Run the second pass and compare the state with the one before."}
a = 1: `1 < 10`, so a = 1/12 + 1 = 1, a += 0: a = 1 again. The state is a fixed point of the body.
:::

:::step{why="By the repeated-state theorem, a fixed point at which the test holds is never left."}
The test `1 < 10` stays true for ever; `printf` is never reached.
:::

:::answer
**(C)**: an infinite loop. Option D (6) assumes the body never runs; A and B imagine that a grows towards
10, but with b = 0 nothing ever adds to a. The compiled program produces no output and is stopped by the time
limit.
:::
::::

::::example{#ex-unsigned-edge level="gate" title="Edge case: counters that cannot go negative, and one that wraps" depth="standard"}
(1) How many passes does `for (unsigned u = 3; u >= 0; u--)` make? (2) On our model, how many passes does
`char a = 10; while (a > 0) a++;` make, and what is a at the end?

:::step{why="An unsigned value is never negative, so u >= 0 is always true; u-- at 0 wraps to the largest value."}
(1) u goes 3, 2, 1, 0, 4 294 967 295, …: the loop never ends (the check stops it after 10 passes, by which
time u has wrapped to 4 294 967 289). Compilers warn that the comparison is always true.
:::

:::step{why="a++ computes a + 1 in int and stores it back into a signed char, which keeps the low 8 bits on our model."}
(2) a goes 10, 11, …, 127: that is 118 passes. The next `a++` computes 128 and stores it as −128
(implementation-defined conversion, previous lesson), and `−128 > 0` is false.
:::

:::answer
(1) never ends; (2) 118 passes, ending with a = −128. Case (2) is not undefined behaviour: the arithmetic
happens in `int` (no overflow) and only the conversion back to `char` wraps, which our model defines. With
`unsigned char x = 126; while (x > 0) x++;` the loop ends after 130 passes, when x wraps to 0.
:::
::::

## Tracing a loop by hand

:::intuition{#trace-intuition title="An accountant's ledger" depth="standard"}
An accountant does not keep the whole year's transactions in her head; she writes one line per transaction
in a ledger, with the balance after it. Tracing a loop is keeping such a ledger: one row per pass, one column
per variable that changes, and the value of each after the pass. The ledger has two benefits. It makes the
mechanical work reliable, and after three or four rows it shows a **pattern** ("j adds the halved values",
"sum restarts whenever the run breaks"), which is usually what the question really asks: not the numbers,
but what the loop computes.
:::

:::definition{#loop-tracing term="The trace-table method" depth="standard"}
1. **Columns:** the loop counter(s), every variable assigned in the body, the value of the test, and any
   output. Ignore variables that do not change.
2. **Rows:** one per pass, recording the values **at the end** of the pass (or at the test, if the question
   is about the test). Write the initial values as row 0.
3. **Stop rule:** the last row is the first one whose test fails; record the values there, because "the value
   after the loop" is the value at that failing test.
4. **Pattern:** after a few rows, say in words what each column holds ("Z is the sum of E[i..j]", "Y is the
   best sum so far"). Then verify the description on one more row.
5. **For "what does this function compute" questions,** trace a tiny input chosen to **separate the
   options**: an array with a negative number in the middle separates "maximum sub-array sum" from "sum of
   all elements" and from "maximum element".
:::

:::trick{#trick-small-input title="Pick the input that splits the options" depth="standard"}
When options describe what a loop computes, do not trace a random input: build one on which the options
give different answers, then trace only that one. For sub-array questions, [3, −4, 5, −1, 2] works: maximum
sub-array sum 6 (5 − 1 + 2), maximum element 5, total 5, sum of the maxima of all sub-arrays 50. **Why it
works:** a single input on which exactly one option matches the trace eliminates the others for certain.
**When it fails:** if two options agree on every small input you try, the question is about a rare case
(empty input, all negatives, ties); test those next.
:::

:::note{#recap-trace title="Recap" depth="quick"}
One row per pass, one column per changing variable, row 0 for the start, and the last row at the failing
test. Name the pattern after a few rows and confirm it. For "what does it compute", choose an input that
gives each option a different answer.
:::

### Worked examples: tracing

::::example{#ex-trace-easy level="easy" title="Odd numbers add up to squares" depth="quick"}
What are i and s after `for (i = 1, s = 0; s < 20; i += 2) s += i;`?

:::step{why="Row 0 holds the initial values; each row records the values after the body and the increment."}
| pass | s after body | i after `i += 2` | test `s < 20` |
|:--:|:--:|:--:|:--:|
| 0 | 0 | 1 | true |
| 1 | 1 | 3 | true |
| 2 | 4 | 5 | true |
| 3 | 9 | 7 | true |
| 4 | 16 | 9 | true |
| 5 | 25 | 11 | false |
:::

:::step{why="The pattern is visible after three rows: s is always a perfect square."}
After k passes s = 1 + 3 + … + (2k − 1) = k², and i = 2k + 1.
:::

:::answer
i = 11, s = 25. The pattern gives the answer for any bound at once: the loop stops at the first square that
is at least the bound, here 25 = 5².
:::
::::

::::example{#ex-trace-it2007 level="medium" title="The best increasing run (GATE IT 2007)" depth="standard"}
```c
int sum = 0, maxsum = 0, i, n = 6;
int a[] = {2, -2, -1, 3, 4, 2};
for (i = 0; i < n; i++) {
    if (i == 0 || a[i] < 0 || a[i] < a[i-1]) {
        if (sum > maxsum) maxsum = sum;
        sum = (a[i] > 0) ? a[i] : 0;
    }
    else sum += a[i];
}
if (sum > maxsum) maxsum = sum;
printf("%d\n", maxsum);
```

:::step{why="The if-branch is a 'run break': it closes the current run (saving its sum if best) and starts a new one."}
i = 0: start, sum = 2. i = 1: a[1] = −2 < 0: maxsum = 2, sum = 0. i = 2: −1 < 0: maxsum stays 2, sum = 0.
:::

:::step{why="The else-branch extends the current run when the next element is non-negative and not smaller."}
i = 3: 3 is not < 0 and not < −1: sum = 0 + 3 = 3. i = 4: 4 ≥ 3: sum = 7.
:::

:::step{why="A drop breaks the run again; after the loop the last run is also compared."}
i = 5: 2 < 4: maxsum = 7, sum = 2. After the loop: 2 > 7 is false. Prints **7**.
:::

:::answer
**(C) 7**: the largest sum of a run of non-negative, non-decreasing elements, here 3 + 4. The trap answers
are 9 (adding the final 2 into the run) and 6 (forgetting that the run [3, 4] is saved before restarting).
:::
::::

::::example{#ex-trace-gate level="gate" title="What does MyX compute? (GATE 2014, set 1)" depth="standard"}
```c
int MyX(int *E, unsigned int size) {
  int Y = 0; int Z; int i, j, k;
  for (i = 0; i < size; i++) Y = Y + E[i];
  for (i = 0; i < size; i++)
    for (j = i; j < size; j++) {
      Z = 0;
      for (k = i; k <= j; k++) Z = Z + E[k];
      if (Z > Y) Y = Z;
    }
  return Y;
}
```
(A) the maximum sum of any sub-array (B) the maximum element of any sub-array (C) the sum of the maximum
elements of all sub-arrays (D) the sum of all elements.

:::step{why="Name what each loop holds before tracing numbers."}
The first loop sets Y to the sum of the whole array. For each pair i ≤ j, the k loop sets Z = E[i] + … + E[j],
the sum of the sub-array from i to j, and Y keeps the largest value seen.
:::

:::step{why="Y starts at the total, which is itself the sum of a sub-array (i = 0, j = size − 1), so starting there loses nothing."}
At the end Y = max over all (i, j) of the sum of E[i..j]: the maximum sub-array sum.
:::

:::step{why="Confirm on an input that splits the options."}
E = [3, −4, 5, −1, 2]: MyX = 6 (5 − 1 + 2), the maximum element is 5, the total is 5, the sum of sub-array
maxima is 50. Only (A) gives 6.
:::

:::answer
**(A)**. The triple nest is the tetrahedral count of the theorem above, Θ(n³) additions, a brute-force
version of what Kadane's algorithm does in one pass; the lesson check compares MyX with Kadane's algorithm on
65 random and hand-picked arrays, including an all-negative one.
:::
::::

::::example{#ex-trace-edge level="gate" title="Edge case: a sieve that marks everything (GATE 2003)" depth="standard"}
```c
for (k=3; k <= n; k++) A[k]=0;
for (k=2; k <= TwoLog_n; k++)
    for (j=k+1; j <= n; j++)
        A[j] = A[j] || (j%k);
for (j=3; j <= n; j++)
    if (!A[j]) printf("%d ",j);
```
With n ≥ 3 and TwoLog_n = 2⌊log₂ n⌋, which numbers are printed? (A) factorials (B) squares (C) primes
(D) none.

:::step{why="The code looks like a sieve of Eratosthenes, but read the update: || makes A[j] stay 1 once it is 1."}
A[j] becomes 1 as soon as some k with 2 ≤ k < j, k ≤ TwoLog_n, has `j % k` ≠ 0, i.e. some k that does **not**
divide j. (A real sieve would mark j when k **does** divide it.)
:::

:::step{why="Find such a k for every j from 3 to n."}
Let m be the **smallest** number ≥ 2 that does not divide j. Every number from 2 to m − 1 divides j, so their
least common multiple divides j; that multiple is at least $2^{m-2}$ (for m = 3, 4, 5, 6: 2, 6, 12, 60), so
$2^{m-2} \le j$ and $m \le \lfloor \log_2 j \rfloor + 2 \le 2\lfloor \log_2 n \rfloor$ = TwoLog_n (for
n ≥ 4; for n = 3, j = 3 and m = 2 = TwoLog_n). Also m ≤ j − 1, because j − 1 never divides j when j ≥ 3. So the
loop does try k = m, and `j % m` ≠ 0 marks A[j]. For example j = 12: m = 5, and 5 ≤ 2⌊log₂ n⌋ for any n ≥ 12.
:::

:::step{why="Only unmarked entries are printed."}
Every A[j] (3 ≤ j ≤ n) is 1, so the last loop prints nothing.
:::

:::answer
**(D)**, the empty set. The lesson check runs the fragment for every n from 3 to 129 (nothing printed) and
verifies for every j up to 399 that the smallest non-divisor m lies in the loop's range. The intended sieve
marks the **multiples** of k instead: with `A[j] || !(j%k)` the same fragment prints the odd primes, 3 5 7 for
n = 10. One `!` separates option C from option D.
:::
::::

## Try it: the C Tracer

The **Trace** tab of the C Tracer runs a C program one statement at a time and shows the current line, the
value of every variable after each step, and the output so far; its interpreter is tested against the real C
compiler on every program of this chapter. Pick the presets in this order: **"switch fall-through (GATE
2012)"** (watch control enter at `case 'A'` and pass the other labels), **"Counting printf calls in a switch
(GATE 2015)"** (the counter `calls` ends at 10), **"The dangling else"** (the outer test fails, so the `else`
never runs), **"do-while runs its body at least once"**, **"A halving loop (GATE 2006)"** (j collects 18, 9, 4,
2, 1), **"A loop on floats (GATE 2019)"** and **"Closed form of a nested loop (GATE 2013)"** (60, 288 and 90).
Then edit a program: remove a `break`, move the `default`, or change `i > 0` to `i >= 0`, and predict the
result before you run it.

:::lab{#lab-trace lab="c-tracer" tab="trace" depth="standard"}
:::

## GATE questions on this lesson

:::pyq{id="cse-1991-a-4-ii" tests="repeat-until,repeat-while,ex-repeat-gate" depth="standard"}
:::

:::pyq{id="cse-1995-a-4" tests="if-else,dangling-else,trap-indentation" depth="standard"}
:::

:::pyq{id="cse-2003-cs-88" tests="loop-tracing,nested-loops,ex-trace-edge" depth="standard"}
:::

:::pyq{id="cse-2006-cs-15" tests="for,count-halving,halving-sum" depth="standard"}
:::

:::pyq{id="it-2007-cs-31" tests="loop-tracing,if-else,ex-trace-it2007" depth="standard"}
:::

:::pyq{id="cse-2012-cs-3" tests="switch,fallthrough-theorem" depth="standard"}
:::

:::pyq{id="cse-2013-cs-31" tests="nested-loops,nested-closed-form,trap-time-vs-value" depth="standard"}
:::

:::pyq{id="cse-2014-1-cs-41" tests="loop-tracing,triangular-count,trick-small-input" depth="standard"}
:::

:::pyq{id="cse-2015-3-cs-48" tests="switch,fallthrough-theorem,trick-fallthrough-count" depth="standard"}
:::

:::pyq{id="cse-2018-cs-32" tests="count-halving,log-log" depth="standard"}
:::

:::pyq{id="cse-2019-cs-52" tests="float-loops,while" depth="standard"}
:::

:::pyq{id="cse-2024-1-cs-8" tests="infinite-loops,fixed-point" depth="standard"}
:::

## Practice

Our own questions in GATE formats, every answer produced by compiling the code: branches and switch first,
then counting, then termination and tracing.

:::practice{id="nx-pds-01-02-q01" depth="standard"}
:::

:::practice{id="nx-pds-01-02-q02" depth="standard"}
:::

:::practice{id="nx-pds-01-02-q03" depth="standard"}
:::

:::practice{id="nx-pds-01-02-q04" depth="standard"}
:::

:::practice{id="nx-pds-01-02-q05" depth="standard"}
:::

:::practice{id="nx-pds-01-02-q06" depth="standard"}
:::

:::practice{id="nx-pds-01-02-q07" depth="standard"}
:::

:::practice{id="nx-pds-01-02-q08" depth="standard"}
:::

:::practice{id="nx-pds-01-02-q09" depth="standard"}
:::

:::practice{id="nx-pds-01-02-q10" depth="standard"}
:::

## Summary

:::summary{#summary-card title="Control flow and loop tracing on one card" depth="quick"}
| Idea | Rule |
|:--|:--|
| `if` | any non-zero value is true; `if (x = 0)` assigns; an `else if` chain runs the first true branch |
| Dangling else | an `else` binds to the nearest unmatched `if` in the block; indentation is ignored (1995: −10) |
| `switch` | integer value, constant labels; jump to the match (else `default`, else skip), then fall through to `break` or the end (2012; 2015: 10 calls) |
| Loops | `while` tests first (0+ passes), `do`–`while` after (1+); `for` = `init; while (cond) { body; inc; }` except `continue` still runs `inc` |
| Pascal | `repeat S until B` = `S; while not B do S` (1991) |
| Arithmetic count | ⌊(b − a)/s⌋ + 1 for `<=`; the counter exits at the first failing value |
| Halving / doubling | ⌊log₂ n⌋ + 1 passes while `> 0` (or `<= n` doubling from 1), ⌊log₂ n⌋ while `> 1`; two in a row: ⌊log₂ ⌊log₂ n⌋⌋ (2018: 5) |
| Halving sum | Σ ⌊n/2ᵏ⌋ = n − (1 bits of n): Θ(n) (2006) |
| Nested loops | multiply independent counts, add dependent ones; value ≠ time (2013: Θ(n² log n)); i ≤ k ≤ j triples: n(n+1)(n+2)/6 |
| Floats | powers of two are exact (2019: 5 prints); never test `x != 1.0` after adding 0.1 |
| Termination | a repeated state or fixed point with a true test loops for ever (2024); `unsigned >= 0` is always true |
| Tracing | one row per pass; name the pattern; pick an input that splits the options (2014: max sub-array; IT 2007: 7; 2003: nothing printed) |
:::
