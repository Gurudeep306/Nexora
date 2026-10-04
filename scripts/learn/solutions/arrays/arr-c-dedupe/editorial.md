## Intuition
In a sorted array, equal values sit next to each other. So a value is "new" exactly when it differs from the last value we kept. A **write pointer** `w` marks where the next new value goes; a **read pointer** `r` visits everything.

## Approach
`w = 1` (the first element is always kept). For r = 1 … n−1: if `a[r] != a[w-1]`, copy `a[w] = a[r]` and `w++`. The answer is `w` and `a[0..w-1]`.

Example `1 1 2 3 3 3 5`: kept 1, skip 1, keep 2, keep 3, skip, skip, keep 5 → `4` and `1 2 3 5`.

## Why it works
Invariant: `a[0..w-1]` holds the distinct values of `a[0..r-1]` in order. Since the array is sorted, `a[r]` is new iff it differs from the last kept value `a[w-1]`; keeping it preserves the invariant. `w ≤ r` always, so we never overwrite an unread value.

## Complexity
$O(n)$ time, $O(1)$ extra space.

## Pitfalls
- Compare with the last **kept** value (`a[w-1]`), equivalently with `a[r-1]` in a sorted array — but not with something you have already overwritten.
- Works only because the input is sorted.
