## Intuition
The 1D difference array marks "+v here, −v after the end". In 2D, a rectangle update becomes **four** marks: +v at the top-left corner, −v just right of the top-right, −v just below the bottom-left, +v diagonally past the bottom-right. A 2D prefix sum of those marks reconstructs every cell's total.

## Approach
D of size (R+1) × (C+1). For each update:
`D[r1][c1] += v`, `D[r1][c2+1] −= v`, `D[r2+1][c1] −= v`, `D[r2+1][c2+1] += v`.
Then take the 2D prefix sum of D in place and add it to the original matrix.

## Why it works
After the prefix sum, cell (i, j) receives the sum of all marks at (x, y) with x ≤ i and y ≤ j. For one update, the four marks contribute $v(1 - [j > c_2] - [i > r_2] + [i > r_2][j > c_2])$ for cells below and right of $(r_1, c_1)$, which equals v exactly inside the rectangle and 0 elsewhere (inclusion–exclusion). Updates add independently.

## Complexity
$O(1)$ per update, $O(RC)$ for the final sweep: $O(RC + m)$.

## Pitfalls
- D needs an extra row and column (`r2+1`, `c2+1` can be R, C).
- Values reach about $2\cdot10^{11}$: 64-bit.
