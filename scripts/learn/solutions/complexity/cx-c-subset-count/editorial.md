## Intuition
Subset sum is NP-complete, and with $a_i$ up to $10^9$ a DP over sums is useless. But NP-hard does not mean "slow for every input": with $n \le 20$ there are only $2^{20} \approx 10^6$ subsets — exponential, yet tiny. Enumerate them all.

## Approach
Build the list of all subset sums incrementally: start with `[0]`; for each item $x$, append $s + x$ for every existing sum $s$. After $n$ items the list holds $2^n$ sums (one per subset, duplicates kept). Count the entries equal to $T$.

This is the same as iterating bitmasks $m = 0..2^n-1$, but each sum costs $O(1)$ (it extends a sum already computed) instead of $O(n)$.

Example `1 1 1`, T = 2: sums `0,1,1,2,1,2,2,3` → **3**.

## Why it works
By induction, after processing the first $k$ items the list contains exactly one entry per subset of those $k$ items: each old subset either excludes item $k+1$ (kept as is) or includes it (the appended copy). So the final list is in bijection with all $2^n$ subsets, and counting entries equal to T counts subsets.

## Complexity
$O(2^n)$ time and memory ($\sum_k 2^k < 2^{n+1}$ additions). The plain bitmask loop is $O(n\,2^n) \approx 2\cdot10^7$ — also fine here, but the doubling trick is the one meet-in-the-middle reuses.

## Pitfalls
- Sums reach $2\cdot10^{10}$ and T up to $2\cdot10^{10}$: 64-bit integers.
- The empty subset counts: for T = 0 the answer is 1 (all $a_i \ge 1$).
- Memory: $2^{20}$ 64-bit numbers is 8 MB — fine; do not store the subsets themselves.
