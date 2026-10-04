## Intuition
Water above bar i rises to the **lower** of the tallest bar on its left and the tallest bar on its right:
$$w_i = \min(L_i, R_i) - h_i,\quad L_i = \max(h_0..h_i),\; R_i = \max(h_i..h_{n-1}).$$
Precomputing L and R gives $O(n)$ time and space. Two pointers remove the arrays: whichever side currently has the smaller running maximum already knows its water level.

## Approach
`i = 0`, `j = n−1`, `lmax = rmax = 0`. While `i ≤ j`: if `lmax ≤ rmax`, update `lmax` with `h[i]`, add `lmax − h[i]`, `i++`; otherwise do the same on the right.

Example `0 1 0 2 1 0 1 3 2 1 2 1` → **6**.

## Why it works
When `lmax ≤ rmax`, the true right maximum for bar i is at least `rmax ≥ lmax` (it includes everything right of j, and more). So $\min(L_i, R_i) = L_i$ = `lmax` after updating with `h[i]` — bar i's water is exact even though we have not seen the middle. The symmetric argument covers the right side. Each bar is settled once.

## Complexity
$O(n)$ time, $O(1)$ space.

## Pitfalls
- Update the running maximum **before** subtracting, so a new tallest bar adds 0, not a negative amount.
- Total water can reach $2\cdot10^9$: 64-bit.
