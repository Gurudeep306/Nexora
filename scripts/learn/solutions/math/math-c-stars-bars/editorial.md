## Intuition
Without the lower bound, this is the textbook **stars and bars** count. Place the $n$ candies (stars) in a row with $k - 1$ bars among them. The bars cut the row into $k$ groups, one per child, so the answer is $\binom{n + k - 1}{k - 1}$. The lower bound is removed by a shift: hand every child $l$ candies up front.

## Approach
1. $\text{rest} = n - k l$, computed in 64-bit since $k l$ can reach $10^{12}$. If $\text{rest} < 0$, answer $0$.
2. Otherwise the answer is $\binom{\text{rest} + k - 1}{k - 1}$. The top is at most $10^6 + 10^6 - 1$, so precompute factorials and inverse factorials up to $2 \cdot 10^6$. Each query is then $O(1)$.

Example: $n = 7, k = 3, l = 2$. After the advance, $\text{rest} = 1$ remains, giving $\binom{3}{2} = 3$: the extra candy goes to one of the three children.

## Why it works
The map $x_i \mapsto y_i = x_i - l$ is a bijection between solutions of $x_1 + \dots + x_k = n$ with all $x_i \ge l$ and solutions of $y_1 + \dots + y_k = n - kl$ with $y_i \ge 0$. Then each non-negative solution corresponds to exactly one string of $\text{rest}$ stars and $k - 1$ bars: $y_i$ is the number of stars between bar $i - 1$ and bar $i$. Such strings are fixed by choosing which $k - 1$ of the $\text{rest} + k - 1$ positions hold bars. For $\text{rest} = 0$ the formula gives $\binom{k-1}{k-1} = 1$ (everyone gets exactly $l$), and for $k = 1$ it gives 1.

## Complexity
$O(N)$ preprocessing with $N = 2 \cdot 10^6$, then $O(1)$ per query. Memory $O(N)$. A DP over (child, candies used) would be $\Theta(k n)$ per query.

## Pitfalls
- $k \cdot l$ overflows 32-bit integers.
- Size the table for $\text{rest} + k - 1$, not just $n$.
- With $n = 0$ and $l = 0$ the answer is 1, not 0.
