## Intuition
With negative values a sliding window breaks (shrinking can increase the sum). Use prefix sums: subarray (i, j] has sum $P_j - P_i$. So the number of good subarrays **ending at j** is the number of earlier prefixes with $P_i = P_j - k$. Count prefixes in a hash map as you go.

## Approach
`seen = {0: 1}` (the empty prefix). `p = 0`, `count = 0`. For each value x: `p += x`; `count += seen[p − k]`; `seen[p]++`. Print `count`.

Example `1 1 1`, k = 2: prefixes 0, 1, 2, 3 → at p = 2 we find one 0, at p = 3 one 1 → **2**.

## Why it works
For each right end j we count exactly the left boundaries i < j with $P_i = P_j - k$, i.e. exactly the subarrays ending at j with sum k. Every subarray has one right end, so every subarray is counted once. The initial `{0: 1}` stands for subarrays that start at index 0.

## Complexity
$O(n)$ expected time with hashing, $O(n)$ space.

## Pitfalls
- Forgetting `seen[0] = 1` misses subarrays starting at index 0.
- Look up **before** inserting the current prefix (otherwise k = 0 counts empty subarrays).
- The count can reach $n(n+1)/2 \approx 2\cdot10^{10}$: 64-bit.
