## Intuition
Here the simulation **is** the fast algorithm. Every probe at least halves the live range `[lo, hi]`, so a single search makes at most $\lfloor \log_2 n \rfloor + 1$ probes, which is 18 for $n = 2 \cdot 10^5$. Running the search literally for all q queries costs about $18q$ steps.

## Approach
For each query, run the loop exactly as given and count the probes, stopping on a hit or when `lo > hi`.

Example: for `2 5 8 12 16 23 38`:
- x = 12 hits on the first probe (mid = 3): **1**.
- x = 2 probes indices 3, 1, 0: **3**.
- x = 38 probes indices 3, 5, 6: **3**.
- x = 13 probes 3, 5, 4, then `hi` drops below `lo`: **3**.

The worst case $\lfloor \log_2 7 \rfloor + 1 = 3$ is reached by every query except the lucky first hit.

## Why it works
Let $m = hi - lo + 1$ be the size of the live range. After a miss, the new range is one side of mid, with size at most $\lfloor m/2 \rfloor$. Starting from n, after k misses the size is at most $\lfloor n / 2^k \rfloor$. That reaches 0 once $2^k > n$, so the total is at most $\lfloor \log_2 n \rfloor + 1$ probes. The best case is 1 probe, when the middle element is x. Absent values always use the full worst-case depth of their branch.

## Complexity
$O(\log n)$ per query, $O(n + q \log n)$ overall, with $O(1)$ extra space. Compare a linear scan's $\Theta(n)$ worst case: $2 \cdot 10^5$ comparisons against 18.

## Pitfalls
- The count must match **this exact** loop. A different midpoint (ceil instead of floor) or a `lo < hi` variant gives different counts.
- With 0-based `hi = n - 1` and `mid = (lo + hi) / 2`, `lo + hi` fits in 32 bits here. In general, use `lo + (hi - lo) / 2`.
- Queries may lie outside the array's range. The loop handles this; don't special-case it with a different count.
