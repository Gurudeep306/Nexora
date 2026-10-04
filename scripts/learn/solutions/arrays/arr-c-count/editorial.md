## Intuition
Answering each query by scanning the array costs $O(n)$ per query, $O(nq) = 4\cdot10^{10}$ in the worst case — far too slow. But values are only 1…100, so we can **count every value once** and then answer any query by a lookup.

## Approach
Make an array `cnt[101]` of zeros. For each element do `cnt[a[i]]++`. For each query x print `cnt[x]`.

Example `4 2 7 2 9`: cnt[2] = 2, cnt[4] = cnt[7] = cnt[9] = 1. Queries 2, 7, 5 → **2, 1, 0**.

## Why it works
After the counting pass, `cnt[v]` equals the number of indexes holding v (each element incremented exactly its own counter once). A query only reads that number.

## Complexity
Time $O(n + q)$, space $O(V)$ where V = 100 is the value range. This "precompute once, answer many" idea returns with prefix sums and hash maps.

## Pitfalls
- Size the counter array for the largest value (index 100 must exist: size 101).
- Print one answer per line; build the output in a buffer for speed.
