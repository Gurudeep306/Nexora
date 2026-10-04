## Intuition
At most **two** values can occur more than n/3 times (three such values would need more than n elements). Generalise Boyer–Moore: keep two candidates with two counters, and discard **triples** of pairwise-different values. A value with more than n/3 copies cannot be wiped out by such triples.

## Approach
1. `c1, c2` candidates, `k1 = k2 = 0`. For each x: if x = c1, `k1++`; else if x = c2, `k2++`; else if `k1 = 0`, `c1 = x, k1 = 1`; else if `k2 = 0`, `c2 = x, k2 = 1`; else `k1--, k2--` (discard a triple).
2. Count the real occurrences of c1 and c2; keep those with count > n/3; print them sorted, or −1.

Example `1 1 1 3 3 2 2 2` (n = 8): candidates 1 and 2, each occurs 3 > 2.67 times → `1 2`.

## Why it works
Each decrement step discards three distinct values (x, c1, c2). If v occurs more than n/3 times, at most $(n - c_v)/2 < c_v$ of its copies can be discarded in triples (each triple uses two non-v elements), so v survives as a candidate. The verification pass removes false candidates.

## Complexity
Two passes, $O(n)$ time, $O(1)$ space.

## Pitfalls
- Check "matches a candidate" **before** "counter is zero", or one value can occupy both slots.
- Strictly more than n/3: compare `3 · count > n`.
- Always verify.
