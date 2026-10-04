## Intuition
Brute force checks all pairs, $O(n^2)$. Start instead with the **widest** container (i = 0, j = n−1). Its water level is set by the shorter wall. Moving the taller wall inward can never help — the width shrinks and the level is still capped by the same short wall. So move the **shorter** one.

## Approach
While `i < j`: `best = max(best, (j − i) · min(h[i], h[j]))`; if `h[i] < h[j]` then `i++` else `j--`.

Example `1 8 6 2 5 4 8 3 7`: the best pair is the walls of height 8 (index 1) and 7 (index 8): 7 · 7 = **49**.

## Why it works
Suppose `h[i] ≤ h[j]`. Any container using wall i and some wall k with i < k < j has width < j − i and height ≤ h[i], so it holds less than the current one. Hence wall i is useless from now on and can be discarded without losing the optimum. Each step discards one wall, so after n−1 steps every candidate pair has been accounted for.

## Complexity
$O(n)$ time, $O(1)$ space.

## Pitfalls
- Moving the taller wall is the classic wrong greedy.
- Area can reach $2\cdot10^5 \cdot 10^4 = 2\cdot10^9$ — over the 32-bit limit, use 64-bit.
