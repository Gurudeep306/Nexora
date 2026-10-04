## Intuition
Rephrase: find the longest window that contains **at most k zeros** (those are the zeros we flip). A window that is valid stays valid when it shrinks, and growing it can only add zeros — so a variable sliding window works.

## Approach
`lo = 0`, `zeros = 0`. For each `hi`: if `a[hi] == 0`, `zeros++`. While `zeros > k`: if `a[lo] == 0`, `zeros--`; `lo++`. Record `hi − lo + 1`.

Example `1 1 1 0 0 0 1 1 1 1 0`, k = 2: the best window is indexes 4–9 (`0 0 1 1 1 1`), length **6**.

## Why it works
For each right end hi, the loop leaves `lo` at the smallest start such that `a[lo..hi]` has ≤ k zeros — the longest valid window ending at hi. `lo` never needs to move back: if `a[lo−1..hi]` had too many zeros, then `a[lo−1..hi']` for any later hi' has at least as many. The answer is the best over all right ends.

## Complexity
$O(n)$ time (each index enters and leaves once), $O(1)$ space.

## Pitfalls
- k = 0 reduces to "longest run of ones".
- k ≥ number of zeros: the whole array.
