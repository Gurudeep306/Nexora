## Intuition
This is "keep the non-zeros, in order" — the same read/write pointer pattern as removing duplicates. Compact the non-zeros to the front, then fill the rest with zeros.

## Approach
`w = 0`. For each r: if `a[r] != 0`, `a[w++] = a[r]`. Then set `a[w..n-1] = 0`.

Example `0 1 0 3 12`: non-zeros 1, 3, 12 go to slots 0–2, slots 3–4 become 0 → `1 3 12 0 0`.

## Why it works
Invariant: `a[0..w-1]` are the non-zeros of `a[0..r-1]` in their original order. `w ≤ r`, so copying never destroys an unread value. After the scan exactly n−w zeros remain, written at the end.

## Complexity
$O(n)$ time, $O(1)$ space, at most n writes.

## Pitfalls
- Order of the non-zeros must be preserved — a two-ended swap (zeros from the left with non-zeros from the right) breaks it.
- Negative numbers are non-zero too.
