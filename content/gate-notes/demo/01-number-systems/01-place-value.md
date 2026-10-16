---
id: place-value
subject: demo
chapter: number-systems
title: Place value and changing bases
order: 1
prerequisites: []
pyq_topics: [dl/number]
est_minutes: 12
difficulty: basic
status: published
needs_review: false
sources: ["Original demo text written for the pipeline; no external notes used."]
updated: "2026-10-16"
---

A digit's value depends on **where** it sits. That one idea, :key[place value], is all you need to read a
number written in any base.

## The big idea

:::intuition{title="Think in bundles"}
Pay ₹347 with notes and coins: 3 hundred-rupee notes, 4 tens, 7 ones. The digit says *how many*;
the position says *of what size*. Base 2 works the same way, only the bundles are 1, 2, 4, 8, … instead
of 1, 10, 100.
:::

:::definition{#place-value-def term="Place value"}
In base $b$, the digit in position $i$ (counting from $0$ on the right) is worth $d_i \cdot b^{\,i}$.
Every digit must satisfy $0 \le d_i < b$.
:::

:::aside
*Radix* is another word for *base*. GATE papers use both.
:::

## Reading a number in any base

:::derivation{#expansion of="the value of a numeral"}
Add up digit × place value over every position:

$$
N = d_k b^k + \dots + d_1 b + d_0 = \sum_{i=0}^{k} d_i\, b^{\,i}
$$

Factor out $b$ again and again and the same sum becomes a chain of "multiply, then add":

$$
N = \big( \dots ( d_k\, b + d_{k-1} )\, b + \dots \big)\, b + d_0
$$
:::

:::viz{spec="binary-place-values" mode="animate"}
:::

::::example{#binary-to-decimal level="easy" title="Binary to decimal"}
Convert $(1011)_2$ to decimal.

:::step{why="Each position stands for a power of the base, starting from 2⁰ on the right."}
Write the place value under each digit.

$$
\begin{array}{cccc}
1 & 0 & 1 & 1 \\
2^3 & 2^2 & 2^1 & 2^0 \\
8 & 4 & 2 & 1
\end{array}
$$
:::

:::step{why="A digit contributes digit × place value, so a 0 contributes nothing."}
Multiply each digit by its place value.

$$
\begin{aligned}
1 \cdot 8 &= 8 \\
0 \cdot 4 &= 0 \\
1 \cdot 2 &= 2 \\
1 \cdot 1 &= 1
\end{aligned}
$$
:::

:::step{why="The value of the numeral is the total of all contributions."}
Add the contributions: $8 + 0 + 2 + 1 = 11$.
:::

:::answer
$(1011)_2 = 11$
:::
::::

::::example{#octal-to-decimal level="medium" title="Octal to decimal"}
Convert $(257)_8$ to decimal.

:::step{why="In base 8 the places are 8⁰ = 1, 8¹ = 8 and 8² = 64."}
List the place values from the right: $1, 8, 64$.
:::

:::step{why="Same rule as in base 2: digit × place value for each position."}
Weight each digit.

$$
\begin{aligned}
2 \cdot 64 &= 128 \\
5 \cdot 8 &= 40 \\
7 \cdot 1 &= 7
\end{aligned}
$$
:::

:::step{why="The value is the sum of the weighted digits."}
Add: $128 + 40 + 7 = 175$.
:::

:::answer
$(257)_8 = 175$
:::
::::

::::example{#find-base level="gate" title="Find the unknown base"}
For which base $b$ is $(31)_b = 16$?

:::step{why="Expanding with place values turns the numeral into an equation in b."}
Expand the left side: $(31)_b = 3 \cdot b + 1$.
:::

:::step{why="Both sides name the same number, so they must be equal."}
Solve $3b + 1 = 16$, which gives $b = 5$.
:::

:::step{why="A digit must be smaller than its base; otherwise the numeral is not valid in that base."}
Check the digits: $3 < 5$ and $1 < 5$, so $(31)_5$ is a valid numeral.
:::

:::answer
$b = 5$
:::
::::

## Why every number has one spelling

:::theorem{name="Unique representation"}
Every whole number $N \ge 0$ has exactly one numeral in base $b$ without leading zeros.
:::

:::proof{of="Unique representation"}
The last digit is forced: every other term is a multiple of $b$, so $d_0$ is the remainder of $N \div b$.
Remove it, divide by $b$, and the next digit is forced the same way. Repeat until nothing is left. Since
no step had a choice, no two numerals can share a value.
:::

::::check{#quick-check}
What is $(110)_2$ in decimal?

:::answer
$1 \cdot 4 + 1 \cdot 2 + 0 \cdot 1 = 6$.
:::
::::

:::trick{title="Double and add"}
Read binary left to right in your head: start at $0$; for each bit, double the total and add the bit.
For $1011$: $0 \to 1 \to 2 \to 5 \to 11$. It is the chain form from the [derivation](#expansion).
:::

:::trap{#digit-limit title="Digits must be smaller than the base"}
"$(19)_8$" is not an octal numeral, because 9 is not an octal digit. In equations like $(43)_x = (y3)_8$
this quietly adds the conditions $x > 4$ and $y < 8$, and missing them gives wrong counts.
:::

:::table{title="The same value in four bases"}
| Base | Numeral | Expansion |
|:-----|:--------|:----------|
| 2 | $1011$ | $8 + 2 + 1$ |
| 8 | $13$ | $8 + 3$ |
| 10 | $11$ | $10 + 1$ |
| 16 | $B$ | $11$ |
:::

## Practice

:::pyq{id="cse-2023-cs-22" tests="place-value-def,expansion"}
:::

:::practice{id="nx-demo-01-01-q01"}
:::

:::viz{spec="binary-place-values" mode="static"}
:::

:::note{depth="deep"}
Positions to the right of the point continue the pattern: $b^{-1}$, $b^{-2}$, … So $(0.1)_2 = \tfrac12$.
:::

:::summary
- A digit is worth digit × $b^{\text{position}}$, counting positions from $0$ on the right.
- Every digit must be smaller than the base.
- To read fast, use the chain: multiply by $b$, add the next digit.
:::
