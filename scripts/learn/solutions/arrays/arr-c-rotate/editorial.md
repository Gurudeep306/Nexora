## Intuition
Rotating right by k moves the last k elements to the front. Rotating by n changes nothing, so only $k \bmod n$ matters — essential, since k can be $10^{18}$.

Copying into a new array is easy but uses $O(n)$ extra memory. The **three-reversal trick** does it in place: reverse the whole array, then reverse the first k and the remaining n−k separately.

## Approach
1. `k = k mod n`.
2. Reverse `a[0..n-1]`.
3. Reverse `a[0..k-1]`.
4. Reverse `a[k..n-1]`.

Example `1 2 3 4 5 6 7`, k = 3: whole → `7 6 5 4 3 2 1`; first 3 → `5 6 7 4 3 2 1`; rest → `5 6 7 1 2 3 4`.

## Why it works
Write the array as $A\,B$ where B is the last k elements. We want $B\,A$. Reversing the whole gives $B^R A^R$ (reversal of a concatenation reverses the order of the pieces and each piece). Reversing each piece again undoes the inner reversals: $(B^R)^R (A^R)^R = B\,A$.

## Complexity
Time $O(n)$ — each element is swapped at most twice. Space $O(1)$.

## Pitfalls
- k may exceed n (and even overflow 32-bit): read it as 64-bit and reduce mod n first.
- k mod n = 0 must leave the array unchanged.
- Rotating **right** vs **left**: right by k equals left by n−k.
