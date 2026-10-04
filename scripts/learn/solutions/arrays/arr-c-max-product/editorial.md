## Intuition
Kadane for sums keeps "best ending here". Products are trickier: multiplying by a negative number turns the **smallest** (most negative) product into the largest. So track both the maximum and the minimum product of a subarray ending at each index.

## Approach
`hi = lo = best = a[0]`. For each later x: if x < 0, swap hi and lo (a negative flips the order); then
`hi = max(x, hi · x)`, `lo = min(x, lo · x)`, `best = max(best, hi)`.

Example `2 2 -2 2`: best is 2 · 2 = **4**. Example `-2 0 -1`: best is **0**.

## Why it works
The extreme products of subarrays ending at i come from either x alone or x times an extreme product ending at i−1. For x ≥ 0, multiplying preserves order, so the new max uses the old max; for x < 0 it reverses order, so the new max uses the old min — that is the swap. Zero resets both to 0 through the `max(x, …)`/`min(x, …)` terms.

## Complexity
$O(n)$ time, $O(1)$ space.

## Pitfalls
- Tracking only the maximum fails on `-2 3 -4` (answer 24).
- Products here reach $2^{62}$: 64-bit in C/C++/Java, BigInt in JavaScript.
