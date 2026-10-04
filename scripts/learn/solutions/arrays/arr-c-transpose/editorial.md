## Intuition
The transpose swaps the roles of rows and columns: output cell (i, j) is input cell (j, i). An R × C matrix becomes C × R.

## Approach
Read the matrix. For each output row i in 0 … C−1, print `a[0][i], a[1][i], …, a[R−1][i]`.

Example `1 2 3 / 4 5 6` → `1 4 / 2 5 / 3 6`.

## Why it works
Output row i lists column i of the input from top to bottom — the definition of the transpose.

## Complexity
$O(RC)$ time and space. (In-place transposition is only simple for square matrices.)

## Pitfalls
- The output has C lines of R numbers, not R lines.
- Up to 250 000 numbers of output: build it in a buffer.
- Reading column-wise (inner loop over rows) is cache-unfriendly in C — fine at this size, but see the Memory & caches page.
