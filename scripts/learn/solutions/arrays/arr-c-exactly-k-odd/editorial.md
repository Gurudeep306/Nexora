## Intuition
"Exactly k" windows are awkward for a sliding window (the window can be both too small and too big). But "**at most** k" is easy, and
$$\#\text{exactly } k = \#\text{at most } k - \#\text{at most } (k-1).$$

## Approach
`atMost(K)`: slide `hi` across the array counting odd numbers in the window; while the count exceeds K, move `lo` right; then every start in `[lo, hi]` gives a valid subarray ending at hi, so add `hi − lo + 1`. Answer `atMost(k) − atMost(k−1)`.

(Equivalent view: prefix counts of odd numbers + a frequency table, as in "subarray sum equals k".)

Example `1 1 2 1 1`, k = 3: subarrays `1 1 2 1` and `1 2 1 1` → **2**.

## Why it works
For a fixed right end hi, after shrinking, `lo` is the smallest start whose window has ≤ K odd numbers; every start from lo to hi also has ≤ K (fewer elements). So `hi − lo + 1` counts exactly the "at most K" subarrays ending at hi. Subarrays with exactly k odd numbers are those with at most k but not at most k−1.

## Complexity
Two linear passes: $O(n)$ time, $O(1)$ space.

## Pitfalls
- The count can reach $\approx 2\cdot10^{10}$: 64-bit.
- `atMost(0)` must work (windows with no odd numbers).
