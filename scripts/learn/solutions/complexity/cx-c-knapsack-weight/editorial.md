## Intuition
0/1 knapsack is NP-hard, yet this instance is easy: the capacity is small. Let $\text{best}[c]$ be the largest value achievable with total weight at most $c$. Processing items one at a time, each item either is skipped or is taken on top of the best solution for capacity $c - w$.

## Approach
Start with $\text{best}[c] = 0$ for all $c$. For each item $(w, v)$, for $c$ from $W$ **down to** $w$:
$$\text{best}[c] = \max(\text{best}[c],\ \text{best}[c-w] + v).$$
The answer is $\text{best}[W]$.

Example W = 7, items (2,3), (3,4), (4,5), (5,6): taking weights 3 + 4 or 2 + 5 gives **9**, and no feasible set does better.

## Why it works
Invariant: after the first $k$ items, $\text{best}[c]$ is the optimum over subsets of those $k$ items with weight $\le c$. An optimal subset of the first $k+1$ items either omits item $k+1$ (value $\text{best}_k[c]$) or contains it (value $v + \text{best}_k[c-w]$). Iterating $c$ downwards guarantees that $\text{best}[c-w]$ still holds the old row $k$, so each item is used at most once.

## Complexity
$O(nW) = 100 \cdot 2\cdot10^4 = 2\cdot10^6$ steps, $O(W)$ memory. This is **pseudo-polynomial**: polynomial in the *value* W, but exponential in its bit length $\log W$. That is why it does not contradict NP-hardness — and why it collapses when W is $10^9$ (see the next problem).

## Pitfalls
- Iterating $c$ upwards turns it into the *unbounded* knapsack (an item reused many times).
- Values up to $10^9$ times 100 items reach $10^{11}$: 64-bit.
- Items heavier than W simply never fit — the loop range is empty, not negative.
