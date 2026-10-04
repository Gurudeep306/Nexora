## Intuition
Checking every pair is $O(n^2)$. Because the array is **sorted**, one comparison can rule out a whole row of pairs: start with the smallest and the largest element and move whichever pointer must move.

## Approach
`i = 0`, `j = n−1`. While `i < j`:
- `a[i] + a[j] == T` → YES;
- sum < T → `i++` (need a bigger sum);
- sum > T → `j--` (need a smaller sum).
If the pointers meet, NO.

Example `1 3 4 6 8 11 14`, T = 17: 1+14 = 15 → i++; 3+14 = 17 → **YES**.

## Why it works
If `a[i] + a[j] < T`, then `a[i]` paired with any element at or left of j is also < T (the array is sorted), so `a[i]` can never be in a solution and is discarded. Symmetrically, if the sum is > T, `a[j]` is too large for every partner at or right of i. Each step discards an element that cannot be part of any answer, so we never skip a valid pair.

## Complexity
Each step moves one pointer, so at most n−1 steps: $O(n)$ time, $O(1)$ space.

## Pitfalls
- i and j must be different positions: loop while `i < j`.
- Duplicates are fine: `3 3` with T = 6 is a valid pair.
