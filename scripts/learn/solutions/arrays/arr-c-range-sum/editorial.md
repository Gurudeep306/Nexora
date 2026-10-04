## Intuition
Summing $a_l..a_r$ directly costs up to n steps per query; with $q = n = 2\cdot10^5$ that is $4\cdot10^{10}$ operations. The fix: precompute **prefix sums** $P[i] = a_0 + \dots + a_{i-1}$ once. Then any range sum is the difference of two prefixes.

## Approach
Build $P$ of length n+1 with $P[0] = 0$ and $P[i+1] = P[i] + a_i$. Answer each query with
$$\text{sum}(l, r) = P[r+1] - P[l].$$

Example `3 1 4 1 5 9 2 6`: P = 0 3 4 8 9 14 23 25 31. Query (2,5): P[6] − P[2] = 23 − 4 = **19**.

## Why it works
$P[r+1]$ is the sum of $a_0..a_r$ and $P[l]$ the sum of $a_0..a_{l-1}$. Subtracting removes exactly the elements before l, leaving $a_l..a_r$. The extra leading 0 makes the formula valid for l = 0 without a special case.

## Complexity
$O(n)$ to build, $O(1)$ per query: $O(n + q)$ total. Space $O(n)$.

## Pitfalls
- Off-by-one: with the n+1 convention it is `P[r+1] − P[l]`.
- Prefix sums reach $2\cdot10^{14}$: use 64-bit integers.
- Print with a buffer — 200 000 lines of output.
