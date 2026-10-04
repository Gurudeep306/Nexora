## Intuition
Brute force checks all $O(n^2)$ subarrays. Kadane's idea: for each index i, let `cur` be the best sum of a subarray that **ends exactly at i**. Such a subarray either is $a_i$ alone, or extends the best one ending at i−1:
$$cur_i = \max(a_i,\; cur_{i-1} + a_i).$$
The answer is the largest `cur` seen.

## Approach
`cur = best = a[0]`. For i ≥ 1: `cur = max(a[i], cur + a[i])`, `best = max(best, cur)`.

Example `-2 1 -3 4 -1 2 1 -5 4`: cur = −2, 1, −2, 4, 3, 5, **6**, 1, 5 → best 6 (subarray `4 -1 2 1`).

## Why it works
Any subarray ending at i is either $[a_i]$ or (a subarray ending at i−1) + $a_i$. The best of the second kind uses the best subarray ending at i−1, which is $cur_{i-1}$ by induction. So $cur_i$ is correct for every i, and the overall best subarray ends somewhere, so `best` = max over i.

Equivalently: whenever the running sum goes negative it only drags future sums down, so start fresh.

## Complexity
$O(n)$ time, $O(1)$ space.

## Pitfalls
- All negative: answer is the largest single element (never 0 — the subarray must be non-empty). Initialising with 0 is the classic bug.
- 64-bit sums: up to $2\cdot10^{14}$.
