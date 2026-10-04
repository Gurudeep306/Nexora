## Intuition
For each index we need "sum left of i" and "sum right of i". Recomputing both is $O(n)$ per index, $O(n^2)$ total. Instead, compute the **total** once and walk left to right carrying the left sum; the right sum is then `total − left − a[i]`.

## Approach
`total = Σa`. `left = 0`. For i = 0 … n−1: if `left == total − left − a[i]`, print i and stop; otherwise `left += a[i]`. If none found, print −1.

Example `-7 1 5 2 -4 3 0` (total 0): i = 3 has left = −7+1+5 = −1 and right = −4+3+0 = −1. Answer **3**.

## Why it works
Invariant at the top of iteration i: `left` equals $a_0 + \dots + a_{i-1}$. The right side is everything else except $a_i$, which is exactly `total − left − a[i]`. Scanning in increasing i and stopping at the first match gives the smallest equilibrium index.

## Complexity
Two passes, $O(n)$ time, $O(1)$ extra space.

## Pitfalls
- The element itself belongs to neither side.
- Index 0 has an empty left side (sum 0); index n−1 an empty right side.
- Negative values mean you cannot stop early just because left exceeds right.
