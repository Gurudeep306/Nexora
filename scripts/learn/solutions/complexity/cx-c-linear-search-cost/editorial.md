## Intuition
One linear search costs between **1** comparison (best case: x is the first element) and **n** (worst case: x is last, or absent). With $n = q = 2 \cdot 10^5$, simulating every search is $\Theta(nq) = 4 \cdot 10^{10}$ in the worst case. But the answer for x depends only on **where x first appears**, and that can be computed for every value in one pass.

## Approach
1. Scan the array once. For each value seen for the first time, record its 1-based position in a hash map, or in a sorted table of (value, position) pairs.
2. For each query x, look x up. If it is present, the answer is its first position. If it is absent, the search inspected all n elements, so the answer is n.

Example: `4 2 7 2 9`. The first positions are 4→1, 2→2, 7→3 and 9→5. The queries 4, 2, 9 and 5 give 1, 2, 5 and **5** (5 is absent, so all 5 elements were compared).

## Why it works
The scan stops at the first index i with $a_i = x$ and has compared exactly $a_1, \dots, a_i$, which is i comparisons. Later duplicates are never reached, so only the *first* occurrence matters. That is why the map keeps the first position and never overwrites it. When x is absent, the loop runs to the end, making n comparisons.

## Complexity
- Hash map: $O(n + q)$ expected.
- Sorting the (value, position) pairs plus a binary search per query: $O((n + q) \log n)$ worst case. The C solution uses this.

Either way, this replaces $\Theta(nq)$ with near-linear work. The lesson is the gap between best, average and worst case: one algorithm, with costs that range from 1 to n.

## Pitfalls
- Overwriting the map entry on a later duplicate gives the **last** occurrence.
- Absent values cost **n**, not 0 and not n + 1.
- When sorting the pairs, break ties by position, so the first match a binary search finds is the earliest one.
