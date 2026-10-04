## Intuition
The array is unsorted, so a value could be anywhere; nothing short of looking at elements one by one can find it. Scan from the left and stop at the first match.

## Approach
For i = 0 … n−1: if `a[i] == x`, print i and stop. If the loop ends, print −1.

Example `14 3 27 9 3`, x = 3 → found at index **1** (the later 3 is never examined).

## Why it works
We examine indexes in increasing order and stop at the first match, so the answer is the smallest index holding x. If we never stop, every index was checked and x is absent.

## Complexity
Worst case (absent or last) $n$ comparisons, $O(n)$; best case 1. Space $O(1)$.

## Pitfalls
- Return the **first** occurrence — do not keep scanning and overwrite the answer.
- An absent value must print −1, not 0 or n.
