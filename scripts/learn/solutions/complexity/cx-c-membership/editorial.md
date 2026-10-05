## Intuition
`x in list`, `indexOf`, `std::find` read like one operation but are a linear scan: $\Theta(n)$ each, $\Theta(nq) = 4\cdot10^{10}$ for $n = q = 2\cdot10^5$. The fix is to pay once for a data structure that answers membership quickly.

## Approach
Two standard options:
- **Hash set**: insert the n numbers, then each query is an expected $O(1)$ lookup.
- **Sort + binary search**: sort once in $O(n\log n)$, then each query is $O(\log n)$ — deterministic, no hashing worst case.

Example: numbers `4 -2 7 2 9`, queries `2 3 9 -2` → **YES NO YES YES**. Sorted: `-2 2 4 7 9`; searching 3 ends between 2 and 4, so it is absent.

## Why it works
Binary search on a sorted array keeps the invariant "if x is present, it lies in $[lo, hi)$"; each step halves the interval by comparing with the middle element, so after $\lceil\log_2 n\rceil$ steps either x was found or the interval is empty. A hash set places x in a bucket determined by its hash, so only the few entries in that bucket are compared.

## Complexity
Sorting: $O((n + q)\log n)$. Hashing: $O(n + q)$ expected. Either is ~$10^6$–$10^7$ steps instead of $4\cdot10^{10}$.

## Pitfalls
- The hidden scan hides inside innocent code: `if x in a` with `a` a list, `arr.includes(x)` in a loop.
- Negative values: binary search and hashing handle them, but an array indexed by value would not.
- Print YES/NO for every query in input order; build the output in one buffer.
