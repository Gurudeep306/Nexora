## Intuition
The maximum is "the biggest value seen so far" carried along a scan; the same for the minimum. One pass is enough for both.

The classic bug is initialising `best = 0`: if every number is negative, nothing beats 0 and you report a value that is not in the array.

## Approach
Start both `mx` and `mn` at the **first element**. For every later element, raise `mx` or lower `mn` if needed. Print `mx mn`.

Example `3 9 -2 7`: mx goes 3 → 9, mn goes 3 → −2. Answer `9 -2`.

## Why it works
Invariant: after processing a prefix, `mx`/`mn` are the maximum/minimum of that prefix. Initialising with element 0 makes it true for the one-element prefix, and each comparison keeps it true when the prefix grows.

## Complexity
Time $O(n)$, about $2n$ comparisons. Space $O(1)$.

## Pitfalls
- Initialise from `a[0]` (or ±∞), never from 0.
- n = 1: the max and the min are the same element.
