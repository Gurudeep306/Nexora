## Intuition
Peel the matrix like an onion. Keep four boundaries — `top`, `bottom`, `left`, `right` — and walk one ring: across the top row, down the right column, back along the bottom row, up the left column. Then shrink all four boundaries and repeat.

## Approach
While `top ≤ bottom` and `left ≤ right`:
1. left → right along `top`, then `top++`;
2. top → bottom along `right`, then `right--`;
3. if `top ≤ bottom`: right → left along `bottom`, then `bottom--`;
4. if `left ≤ right`: bottom → top along `left`, then `left++`.

Example 3 × 3: `1 2 3`, `6 9`, `8 7`, `4`, then the centre `5`.

## Why it works
Each step outputs a row or column that lies inside the current boundaries and then moves that boundary inward, so no cell is printed twice and the unprinted cells always form the rectangle `[top..bottom] × [left..right]`. The guards in steps 3 and 4 handle the last ring being a single row or column, which would otherwise be printed twice.

## Complexity
$O(RC)$ time, every cell printed once; $O(1)$ extra space besides the input.

## Pitfalls
- Forgetting the guards in steps 3–4 duplicates the middle row/column of non-square matrices (e.g. 1 × C, R × 1, 3 × 5).
- Output is a single line of R·C numbers.
