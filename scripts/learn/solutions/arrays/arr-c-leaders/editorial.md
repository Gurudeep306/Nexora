## Intuition
"Greater than everything to its right" depends on the elements to the right, so scan **from the right** carrying the maximum seen so far. An element is a leader exactly when it beats that maximum.

## Approach
`mx = −∞`. For i = n−1 down to 0: if `a[i] > mx`, it is a leader — record it and set `mx = a[i]`. The leaders are found right-to-left, so reverse them before printing.

Example `16 17 4 3 5 2`: from the right 2 (leader), 5 (leader), 3, 4, 17 (leader), 16 → `17 5 2`.

## Why it works
When we look at index i, `mx` is the maximum of `a[i+1..n-1]` (invariant). `a[i]` is a leader iff `a[i] > mx`. Updating `mx` keeps the invariant for i−1.

## Complexity
$O(n)$ time, $O(n)$ for the output (or $O(1)$ extra if you print in reverse).

## Pitfalls
- **Strictly** greater: equal values to the right disqualify an element.
- The last element is always a leader (`mx` starts at −∞).
