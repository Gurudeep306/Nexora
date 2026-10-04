## Intuition
The answer is in 1…n+1: with n slots you can hold at most the values 1…n. So only values in [1, n] matter, and each of them has a natural home — **index v−1**. Put every such value in its home (cyclic sort); then the first index i whose slot does not hold i+1 tells us i+1 is missing.

## Approach
1. For each i, while `1 ≤ a[i] ≤ n` and `a[a[i]−1] ≠ a[i]`: swap `a[i]` into its home.
2. Scan: the first i with `a[i] ≠ i+1` → answer i+1; if none, answer n+1.

Example `3 4 -1 1`: placing gives `1 -1 3 4` → index 1 holds −1 → **2**.

## Why it works
Every swap puts one value into its home slot permanently (that slot already holds the right value afterwards, so it is never swapped again), so there are at most n swaps in total. After placement, value v ∈ [1, n] is present iff `a[v−1] = v`. The first slot failing that test is the smallest missing positive. The condition `a[a[i]−1] ≠ a[i]` prevents an infinite loop on duplicates.

## Complexity
$O(n)$ time (at most n swaps overall, despite the nested loop), $O(1)$ extra space.

## Pitfalls
- Duplicates: without the `a[a[i]−1] ≠ a[i]` check, swapping two equal values loops forever.
- Negative numbers, zero and values > n are simply left where they are.
- Answer n+1 when 1…n are all present.
