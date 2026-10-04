## Intuition
To add n numbers you must look at every one of them, so the best possible solution is a single pass. The only trap is the **size of the answer**: up to $2\cdot10^5$ values of magnitude $10^9$ sum to $2\cdot10^{14}$, far beyond a 32-bit `int` (max ≈ $2.1\cdot10^9$).

## Approach
Keep a running total in a 64-bit integer (`long long` / `long`), add each value as you read it, print the total.

Example: `1 2 3 4 5` → 1, 3, 6, 10, **15**.

## Why it works
Invariant: after reading k values, `total` equals the sum of those k values. It holds for k = 0 (total = 0) and adding the next value preserves it, so after n values it is the full sum.

## Complexity
Time $O(n)$ — one addition per value. Extra space $O(1)$ — we never store the array.

## Pitfalls
- A 32-bit accumulator overflows silently in C/C++/Java (it wraps around to a wrong, possibly negative number).
- In C, read with `%lld` and print with `%lld`.
- JavaScript numbers are exact up to $2^{53}\approx 9\cdot10^{15}$, so this sum is safe there.
