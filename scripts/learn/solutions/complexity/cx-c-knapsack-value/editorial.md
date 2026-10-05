## Intuition
With $W$ up to $10^9$ a table indexed by capacity has $10^9$ columns — impossible. But the *values* are tiny: the total value is at most $V = \sum v_i \le 100 \cdot 200 = 2\cdot10^4$. So index the table by value instead and store weight: $\text{mw}[t]$ = the **minimum total weight** of a subset whose total value is exactly $t$.

## Approach
$\text{mw}[0] = 0$, all other entries $= \infty$. For each item $(w, v)$, for $t$ from $V$ **down to** $v$:
$$\text{mw}[t] = \min(\text{mw}[t],\ \text{mw}[t-v] + w).$$
The answer is the largest $t$ with $\text{mw}[t] \le W$.

Example W = $10^9$, items $(10^9, 200), (1, 1), (999999999, 199)$: value 200 is reachable with weight $10^9$ (either the first item or the other two), value 201 needs weight $10^9 + 1$ → **200**.

## Why it works
It is the same exchange argument as the capacity DP with the roles of weight and value swapped: an optimal (lightest) subset of the first $k+1$ items with value $t$ either omits item $k+1$ or consists of it plus a lightest subset of the first $k$ items with value $t - v$. Downward iteration keeps the item 0/1. Then "max value with weight $\le W$" = "max $t$ such that value $t$ can be paid for with weight $\le W$".

## Complexity
$O(nV) = 100 \cdot 2\cdot10^4 = 2\cdot10^6$ steps, $O(V)$ memory — independent of $W$. Still pseudo-polynomial, just in a different parameter: pick the dimension that is small.

## Pitfalls
- Weights sum to $10^{11}$: 64-bit, and an $\infty$ sentinel that does not overflow when $w$ is added (e.g. $2^{62}$, or skip $\infty$ entries).
- "Exactly $t$" — not "at least" — so unreachable values must stay $\infty$, not 0.
- Scan for the answer from $V$ downwards; value 0 (empty set) is always feasible.
