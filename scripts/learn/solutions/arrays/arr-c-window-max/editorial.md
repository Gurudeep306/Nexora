## Intuition
Summing every window of size k from scratch is $O(nk)$. Neighbouring windows share k−1 elements, so slide instead: add the element that enters, subtract the one that leaves.

## Approach
`s` = sum of the first k elements, `best = s`. For i = k … n−1: `s += a[i] − a[i−k]`, `best = max(best, s)`.

Example `2 1 5 1 3 2 7 1`, k = 3: windows 8, 7, 9, 6, **12**, 10 → 12.

## Why it works
Invariant: after processing index i, `s` is the sum of `a[i−k+1..i]`. Moving the window right by one adds `a[i+1]` and removes `a[i−k+1]`, which is exactly the update. Every window is visited once, so `best` is the maximum.

## Complexity
$O(n)$ time, $O(1)$ space.

## Pitfalls
- Initialise `best` with the first window, not 0 — all sums can be negative.
- Sums reach $2\cdot10^{14}$: 64-bit.
