## Intuition
Replace every 0 by −1. A subarray has as many 0s as 1s exactly when its sum is **0**, i.e. when two prefix sums are equal. The longest such subarray pairs each prefix with the **first** position where the same prefix appeared.

## Approach
`p = 0`, `first[0] = 0`. For j = 1 … n: `p += (a == 1 ? +1 : −1)`. If p was seen before, `best = max(best, j − first[p])`; otherwise record `first[p] = j`. Prefix values lie in [−n, n], so a plain array (offset by n) replaces the hash map.

Example `0 1 1 1 0 0 1`: prefixes 0 −1 0 1 2 1 0 1 → p = 0 at positions 0 and 6 → **6**.

## Why it works
Sum of (i, j] is $P_j - P_i$, which is 0 iff $P_i = P_j$. For each j the longest such subarray uses the earliest i with that prefix value, which is what `first` stores.

## Complexity
$O(n)$ time, $O(n)$ space.

## Pitfalls
- Store only the **first** occurrence.
- Answer 0 if no balanced subarray exists (e.g. all zeros).
