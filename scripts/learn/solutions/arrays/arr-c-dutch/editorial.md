## Intuition
Counting 0s, 1s and 2s and rewriting works in two passes. Dijkstra's **Dutch national flag** does it in **one** pass with three pointers that split the array into four zones:
`[0, lo)` = 0s, `[lo, mid)` = 1s, `[mid, hi]` = unknown, `(hi, n)` = 2s.

## Approach
`lo = mid = 0`, `hi = n−1`. While `mid ≤ hi`, look at `a[mid]`:
- 0 → swap with `a[lo]`, `lo++`, `mid++`;
- 1 → `mid++`;
- 2 → swap with `a[hi]`, `hi--` (do **not** advance mid: the swapped-in value is still unknown).

Example `2 0 2 1 1 0` → `0 0 1 1 2 2`.

## Why it works
Each case keeps the four-zone invariant and shrinks the unknown zone by one: a 0 joins the 0-zone (the element swapped out of `a[lo]` is a 1 or is `a[mid]` itself), a 1 extends the 1-zone, a 2 joins the 2-zone. When the unknown zone is empty the array is sorted.

## Complexity
One pass, at most n swaps: $O(n)$ time, $O(1)$ space.

## Pitfalls
- Advancing `mid` after swapping with `hi` skips an unexamined element.
- Loop condition is `mid <= hi` (the element at hi is still unknown).
