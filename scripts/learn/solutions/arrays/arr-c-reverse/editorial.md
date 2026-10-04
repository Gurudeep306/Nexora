## Intuition
Reversing means the first element trades places with the last, the second with the second-to-last, and so on. Two pointers walking toward each other do exactly that.

## Approach
`i = 0`, `j = n−1`. While `i < j`: swap `a[i]` and `a[j]`, then `i++`, `j--`.

Example `1 2 3 4 5`: swap (1,5), swap (2,4), pointers meet at 3 → `5 4 3 2 1`.

## Why it works
Invariant: everything outside `[i, j]` is already in its final reversed position. Each swap puts two more elements in place and shrinks the window by two; when `i ≥ j` the window holds at most one element, which is its own mirror.

## Complexity
Time $O(n)$ with exactly $\lfloor n/2\rfloor$ swaps. Space $O(1)$ — in place.

## Pitfalls
- Loop while `i < j`, not `i <= j` (harmless here, but in other two-pointer problems the extra step matters).
- With odd n the middle element never moves.
