## Intuition
k-sum reduces to (k−1)-sum: fix one element and solve the smaller problem on the rest. For 4-sum fix **two** elements with nested loops and finish with the two-pointer pair search: $O(n^3)$, fine for n = 200.

## Approach
Sort. For i (skip equal `a[i]`), for j > i (skip equal `a[j]` when `j > i+1`): two pointers on `[j+1, n−1]` for the target `T − a[i] − a[j]`, skipping duplicates after each hit, exactly as in 3-sum.

Example `1 0 -1 0 -2 2`, T = 0 → (−2, −1, 1, 2), (−2, 0, 0, 2), (−1, 0, 0, 1) → **3**.

## Why it works
The same argument as 3-sum, one level deeper: every distinct value-quadruplet in sorted order has a unique first value, a unique second value given the first, and the two-pointer search finds the remaining pair once.

## Complexity
$O(n^3)$ time, $O(1)$ extra space.

## Pitfalls
- Sums of four values up to $10^9$ reach $4\cdot10^9$: 64-bit in C/C++/Java.
- The duplicate check for the second element is `j > i + 1`, not `j > 0`.
