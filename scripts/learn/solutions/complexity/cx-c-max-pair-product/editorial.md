## Intuition
Checking all $\binom{n}{2} \approx 2\cdot10^{10}$ pairs is far over a one-second budget (roughly $10^8$ simple operations). Think about which pairs can possibly win: a large product comes either from two large positives or from two very negative numbers (whose product is positive). So only the **two largest** and the **two smallest** values matter.

## Approach
In one pass keep $\max_1 \ge \max_2$ and $\min_1 \le \min_2$. The answer is $\max(\max_1\max_2,\ \min_1\min_2)$.

Example `-10 -3 1 2`: $2\cdot1 = 2$, $(-10)(-3) = 30$ → **30**.

## Why it works
Take any pair $x \le y$ (by value).
- If $x \ge 0$: $xy \le \max_2 \cdot \max_1$, since $\max_1 \ge y \ge 0$ and $\max_2 \ge x \ge 0$.
- If $y \le 0$: $xy = |x||y| \le |\min_1||\min_2| = \min_1\min_2$.
- If $x < 0 < y$: $xy < 0$. With $n = 2$ this is the only pair and it equals $\max_1\max_2$. With $n \ge 3$: if $\max_2 \ge 0$ then $\max_1\max_2 \ge 0 > xy$; otherwise $\min_1 \le \min_2 \le \max_2 < 0$ and $\min_1\min_2 > 0 > xy$.

So the best pair is always one of the two candidates.

## Complexity
$O(n)$ time, $O(1)$ extra space (sorting also works in $O(n\log n)$).

## Pitfalls
- Products reach $10^{18}$: 64-bit integers. In JavaScript $10^{18} > 2^{53}$, so multiply with BigInt.
- Do not forget the two negatives: `-10 -3 1 2` → 30, not 2.
- Duplicates: when updating the maxima, a value equal to $\max_1$ must still become $\max_2$ (use `>` then `else if >`).
- Initialise the trackers with sentinels beyond $\pm10^9$, not 0.
