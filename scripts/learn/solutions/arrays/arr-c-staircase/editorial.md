## Intuition
Rows and columns are both sorted, but the matrix is not one sorted list, so a single binary search does not apply. Look at the **top-right corner**: it is the largest in its row and the smallest in its column. Comparing x with it eliminates a whole row or a whole column in one step.

## Approach
Start at (0, C−1). While inside the matrix:
- value = x → found;
- value > x → x cannot be in this column (everything below is even bigger): go **left**;
- value < x → x cannot be in this row (everything to the left is smaller): go **down**.

Example: searching 5 in `1 4 7 11 / 2 5 8 12 / 3 6 9 16`: 11 → 7 → 4 → down to 5 → **YES**.

## Why it works
Invariant: if x is in the matrix at all, it is in the sub-rectangle below and to the left of the current cell (inclusive). Each comparison removes one row or column outside which x cannot lie, preserving the invariant. When we leave the matrix the rectangle is empty, so x is absent.

## Complexity
At most R + C steps per query: $O(q(R + C))$.

## Pitfalls
- Starting at the top-left fails: both moves increase the value, so you cannot decide which way to go.
- The bottom-left corner also works (mirror the moves).
