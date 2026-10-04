## Intuition
If you zero rows and columns while scanning, the zeros you **write** look like original zeros and spread across the whole matrix. So first **record** which rows and columns contain an original zero, then apply. Two boolean arrays (R + C memory) do it; the O(1)-space version stores those flags in the first row and column themselves.

## Approach (O(1) extra space)
1. Remember separately whether row 0 and column 0 contain a zero.
2. For every cell (i, j) with i, j ≥ 1 holding 0: set `M[i][0] = 0` and `M[0][j] = 0` (flags).
3. For i, j ≥ 1: if `M[i][0] == 0` or `M[0][j] == 0`, set `M[i][j] = 0`.
4. Finally zero row 0 and/or column 0 if step 1 said so.

## Why it works
After step 2, `M[i][0] = 0` iff row i (i ≥ 1) had an original zero (either the flag or an original zero in column 0 — which also zeros the whole row, so the flag is still right), and likewise for columns. Step 3 uses only those flags. Row 0 and column 0 are processed last so their flag cells are read before being overwritten.

## Complexity
$O(RC)$ time, $O(1)$ extra space.

## Pitfalls
- Zeroing during the first scan cascades.
- The first row and column must be handled last, using the two remembered booleans.
