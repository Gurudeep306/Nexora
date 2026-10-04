## Intuition
Deleting from the middle of an array leaves a hole; to keep the block contiguous, everything after the hole slides one step left.

## Approach
For i = p … n−2 copy `a[i] = a[i+1]`, then treat the length as n−1. If nothing is left (n was 1), print `EMPTY`.

Example `5 10 15 20 25`, p = 1: 15→1, 20→2, 25→3 → `5 15 20 25`.

## Why it works
Copying **left to right** is safe here: slot i is overwritten only after its old value is no longer needed (it was the deleted element, or it was already copied to i−1 in the previous step).

## Complexity
Time $O(n - p)$, worst case $O(n)$ (delete at the front). Space $O(1)$.

## Pitfalls
- Shift direction is the opposite of insertion: forwards.
- n = 1 → `EMPTY`.
