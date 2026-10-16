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

A numeral is just a row of symbols. What turns it into a number is :key[place value]: every position
has a weight, and the value is the sum of digit × weight over all positions.

## Digits and places

:::intuition
Think of an odometer. The right-hand wheel counts single units; each time it rolls past its last
symbol it nudges the wheel to its left by one. In base ten that happens after 9, in base two after 1.
The wheel a digit sits on decides how much it is worth.
:::

:::definition{#place-value-def term="Place value"}
In base $b$ (an integer $b \ge 2$) a numeral $d_k d_{k-1} \dots d_1 d_0$ uses digits $0 \le d_i < b$, and
the digit in position $i$ (counting from $0$ at the right) is worth $d_i \cdot b^{\,i}$.
:::

:::aside
The word *radix* means the same thing as *base*. Exam papers use both.
:::

## Expanding a numeral

:::derivation{#expansion of="the value of a base-b numeral"}
Add up the weighted digits:

$$
N = \sum_{i=0}^{k} d_i\, b^{\,i} = d_k b^k + d_{k-1} b^{k-1} + \dots + d_1 b + d_0 .
$$

Pull out a factor of $b$ from every term except the last, then repeat inside the brackets:

$$
N = \Big( \big( (d_k\, b + d_{k-1})\, b + d_{k-2} \big) b + \dots \Big) b + d_0 .
$$

The second form needs only one multiplication and one addition per digit.
:::

:::viz{spec="binary-place-values" mode="animate"}
:::

:::theorem{name="Unique representation"}
Every whole number $N \ge 0$ has exactly one numeral in base $b$ without leading zeros.
:::

:::proof{of="Unique representation"}
All terms of the expansion except $d_0$ are multiples of $b$, so $d_0$ must be the remainder of $N$
divided by $b$, and that remainder is a single, fixed digit. Removing it leaves $(N - d_0)/b$, a smaller
whole number, which by the same argument has a fixed last digit too. Repeating until nothing is left
pins down every digit, so two different numerals cannot have the same value.
:::

:::example{level="easy" title="Octal to decimal"}
$(257)_8 = 2 \cdot 64 + 5 \cdot 8 + 7 = 128 + 40 + 7 = 175$.
:::

:::example{level="gate" title="Find the base"}
If $(31)_b = 16$, then $3b + 1 = 16$, so $b = 5$. Check that every digit is below the base: $3 < 5$ and $1 < 5$. ✓
:::

::::check{#quick-check}
What is $(110)_2$ in decimal?

:::answer
$1 \cdot 4 + 1 \cdot 2 + 0 = 6$.
:::
::::

:::trick{title="Double and add"}
To read a binary string in your head, start at $0$ and, for each bit from left to right, double the running
total and add the bit. For $1011$: $0 \to 1 \to 2 \to 5 \to 11$. This is the bracketed form from the
[derivation](#expansion), done one step at a time.
:::

:::trap
A digit must be **smaller** than the base. "$(19)_8$" is not an octal numeral at all, and an equation such
as $(43)_x = (y3)_8$ silently requires $x > 4$ and $y < 8$.
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

:::pyq{id="cse-2023-cs-22"}
:::

:::practice{id="nx-demo-01-01-q01"}
:::

:::viz{spec="binary-place-values" mode="static"}
:::

:::note{depth="deep"}
The same idea extends to the right of the point: the first fractional position is worth $b^{-1}$, the next
$b^{-2}$, and so on. You will need this for fixed-point questions.
:::

:::summary
- A digit's value is digit × $b^{\text{position}}$; positions count from $0$ at the right.
- Every digit must be less than the base.
- Read numerals fast with the nested form $\big((d_k b + d_{k-1}) b + \dots\big) b + d_0$.
:::
