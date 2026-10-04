## Intuition
Summing each rectangle cell by cell is $O(RC)$ per query. A **2D prefix sum** $P[i][j]$ = sum of the top-left $i \times j$ block lets any rectangle be computed from four corners by inclusion–exclusion.

## Approach
Build $P$ of size (R+1) × (C+1) with zeros on the first row and column:
$$P[i+1][j+1] = M[i][j] + P[i][j+1] + P[i+1][j] - P[i][j].$$
Answer a query $(r_1, c_1, r_2, c_2)$ with
$$P[r_2+1][c_2+1] - P[r_1][c_2+1] - P[r_2+1][c_1] + P[r_1][c_1].$$

## Why it works
$P[r_2+1][c_2+1]$ covers everything above-left of the bottom-right corner. Subtracting the block above the rectangle and the block to its left removes the unwanted cells, but removes the top-left corner block twice, so it is added back once. The build formula is the same identity applied to a single cell.

## Complexity
$O(RC)$ to build, $O(1)$ per query: $O(RC + q)$. Space $O(RC)$.

## Pitfalls
- Off-by-one: P is shifted by one row and column.
- Sums reach $2.5\cdot10^{14}$: 64-bit.
