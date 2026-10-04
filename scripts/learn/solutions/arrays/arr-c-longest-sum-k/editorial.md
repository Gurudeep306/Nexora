## Intuition
Same prefix-sum view as counting: subarray (i, j] has sum k iff $P_i = P_j - k$. To make it **long**, pair each right end j with the **earliest** i where that prefix value appeared.

## Approach
`first = {0: 0}` (prefix 0 at position 0). For j = 1 … n: update `p`; if `p − k` is in `first`, `best = max(best, j − first[p − k])`; then record `first[p] = j` **only if p is new**.

Example `1 -1 5 -2 3`, k = 3: prefixes 0 1 0 5 3 6. At j = 4 (p = 3) we need 0, first seen at 0 → length **4** (`1 -1 5 -2`).

## Why it works
For a fixed j, the longest subarray ending at j with sum k starts right after the smallest i with $P_i = P_j - k$. Storing only the first occurrence of each prefix value gives exactly that i. Maximising over all j covers every possible right end.

## Complexity
$O(n)$ expected time, $O(n)$ space.

## Pitfalls
- Overwriting `first[p]` with later positions makes the subarrays shorter — keep the earliest.
- Print 0 when no subarray works.
