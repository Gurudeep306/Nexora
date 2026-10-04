## Intuition
Brute force tries every start and extends until the sum reaches S: $O(n^2)$. Because all values are **positive**, a window's sum only grows when it extends and only shrinks when it gives up its left element. That monotonicity allows a **variable sliding window**: extend the right end; whenever the sum is big enough, record the length and shrink from the left as far as possible.

## Approach
`lo = 0`, `s = 0`, `best = ∞`. For each `hi`: add `a[hi]`. While `s ≥ S`: `best = min(best, hi − lo + 1)`, subtract `a[lo]`, `lo++`. Print `best` (0 if still ∞).

Example `2 3 1 2 4 3`, S = 7: windows reaching 7 are [2,3,1,2] (4), [3,1,2,4]→[1,2,4] (3), [2,4,3]→[4,3] (**2**).

## Why it works
For each right end hi, after the inner loop `lo` is one past the largest start whose window still has sum ≥ S — all those windows were measured and the shortest of them recorded. A start that was dropped never needs to be reconsidered: for a larger right end the window from that start is even longer (positive values), so it cannot beat the length already recorded. Hence every optimal window is measured.

## Complexity
Each index enters and leaves the window at most once: $O(n)$ time, $O(1)$ space.

## Pitfalls
- Only correct because values are positive; with negatives you need prefix sums + a monotonic deque.
- S is up to $10^{15}$: 64-bit sums.
- Print 0 when no window works.
