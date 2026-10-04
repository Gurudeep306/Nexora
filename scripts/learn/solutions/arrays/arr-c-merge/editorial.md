## Intuition
Concatenating and sorting costs $O((n+m)\log(n+m))$ and ignores that both inputs are already sorted. The smallest remaining value overall is always at the **front** of A or the front of B — so repeatedly take the smaller front.

## Approach
`i = j = 0`. While both have elements: output the smaller of `A[i]`, `B[j]` (take A on ties) and advance that pointer. Then output whatever remains of either array.

Example `1 4 7 9` + `2 3 8 10 12` → `1 2 3 4 7 8 9 10 12`.

## Why it works
Invariant: the output so far is the sorted union of `A[0..i-1]` and `B[0..j-1]`, and every output value is ≤ every remaining value. The next smallest remaining value is `min(A[i], B[j])` because each array is sorted, so appending it keeps the invariant. Taking A on ties makes the merge **stable** — the property merge sort relies on.

## Complexity
Each step outputs one value: $O(n + m)$ time, $O(n + m)$ output.

## Pitfalls
- Don't forget the leftover tail of the array that did not run out.
- Use `<=` (not `<`) to prefer A on ties if stability matters.
