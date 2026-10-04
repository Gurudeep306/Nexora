## Intuition
Brute force tries all $\binom{n}{3}$ triples — $4.5\cdot10^9$ for n = 3000. **Sort** first. Then fix the smallest element `a[i]`; the other two must sum to `−a[i]`, which is the sorted two-pointer pair search, $O(n)$. Total $O(n^2)$. Sorting also makes duplicates adjacent, so they are easy to skip.

## Approach
Sort. For each i (skipping `a[i] == a[i−1]`): `lo = i+1`, `hi = n−1`; while `lo < hi`:
- sum < 0 → `lo++`; sum > 0 → `hi--`;
- sum = 0 → count it, then move `lo` past all copies of `a[lo]` and do `hi--`.

Example `-1 0 1 2 -1 -4` → sorted `-4 -1 -1 0 1 2` → triplets (−1, −1, 2) and (−1, 0, 1) → **2**.

## Why it works
For a fixed first element the two-pointer search finds every pair summing to the target (each step discards an element that cannot pair with anything remaining — see Pair sum). Skipping equal first elements means each distinct smallest value is tried once; moving `lo` past copies after a hit means each distinct (second, third) pair is counted once. Together every distinct value-triplet is counted exactly once.

## Complexity
$O(n\log n)$ sort + $O(n^2)$ scan. Space $O(1)$ beyond the sort.

## Pitfalls
- Without the skips, `0 0 0 0` would count (0, 0, 0) several times.
- Skip duplicates of the **first** element only when `i > 0`.
