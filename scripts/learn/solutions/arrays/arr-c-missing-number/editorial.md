## Intuition
The numbers 0…n add up to $\frac{n(n+1)}{2}$. The array is that set minus one number, so the missing number is the **difference** between the expected and the actual sum. (XOR works too: XOR all of 0…n and all array values — every present number cancels itself, leaving the missing one.)

## Approach
Read n and the values, print `n(n+1)/2 − sum`.

Example `3 0 1` (n = 3): expected 6, actual 4 → **2**.

## Why it works
$\sum_{k=0}^{n} k = \text{(sum of the array)} + \text{missing}$, because the array contains every number of the range exactly once except the missing one.

## Complexity
$O(n)$ time, $O(1)$ space.

## Pitfalls
- $n(n+1)/2$ for $n = 2\cdot10^5$ is $2\cdot10^{10}$: 64-bit.
- The missing number can be 0 or n — both handled by the formula.
