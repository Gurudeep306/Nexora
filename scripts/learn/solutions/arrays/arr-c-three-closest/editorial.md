## Intuition
Same skeleton as 3-sum: sort, fix the first element, two pointers for the other two. Instead of looking for an exact hit, keep the sum closest to T seen so far. The pointer moves are still safe: if the current sum is below T, any sum using `a[lo]` with a smaller partner is even further below.

## Approach
Sort. For each i, `lo = i+1`, `hi = n−1`: compute s; update `best` if s is closer to T (or equally close and smaller); then `lo++` if s < T, `hi--` if s > T, and stop early if s = T.

Example `-1 2 1 -4`, T = 1 → sorted `-4 -1 1 2`; the closest sum is −1 + 1 + 2 = **2**.

## Why it works
For a fixed i, when s < T every pair (lo, k) with k < hi has sum ≤ s < T, so none of them is closer than s itself — `a[lo]` can be dropped. Symmetrically when s > T, `a[hi]` can be dropped. So every pair that could be closest is examined before being discarded.

## Complexity
$O(n^2)$ time after an $O(n\log n)$ sort; $O(1)$ extra space.

## Pitfalls
- The tie rule (prefer the smaller sum) must be applied explicitly.
- Initialise `best` from a real triple, not 0 or ∞-arithmetic that might overflow.
