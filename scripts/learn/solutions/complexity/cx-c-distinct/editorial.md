## Intuition
Comparing every pair to find duplicates is $\Theta(n^2) = 4\cdot10^{10}$ — too slow. Two standard ways to get under the budget:
- **Sort**, then equal values are neighbours: count the positions where a value differs from the previous one. $O(n\log n)$.
- **Hash set**: insert everything and report the set's size. $O(n)$ expected.

## Approach (sorting)
Sort. Count `1` for the first element plus one for every i with `a[i] != a[i−1]`.

Example `3 1 3 2 1` → sorted `1 1 2 3 3` → new values at positions 0, 2, 3 → **3**.

## Why it works
After sorting, all copies of a value form one contiguous block, and each block starts exactly at a position whose value differs from its predecessor (or at position 0). So the number of block starts is the number of distinct values.

## Complexity
Sorting $O(n\log n)$ + one $O(n)$ scan. A hash set is $O(n)$ expected but $O(n^2)$ in the worst case under adversarial keys.

## Pitfalls
- The quadratic "is this value already in my list?" check (`x in list`) is the hidden $O(n^2)$ from the Hidden costs page.
