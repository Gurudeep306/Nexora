## Intuition
A 90° clockwise rotation sends cell (i, j) to (j, N−1−i). Doing it with a second matrix is easy; doing it **in place** uses two simple reflections whose composition is the rotation: **transpose** (swap across the main diagonal), then **reverse every row**.

## Approach
1. For i < j swap `a[i][j]` and `a[j][i]`.
2. Reverse each row.

Example `1 2 3 / 4 5 6 / 7 8 9` → transpose `1 4 7 / 2 5 8 / 3 6 9` → reverse rows `7 4 1 / 8 5 2 / 9 6 3`.

## Why it works
Transpose moves (i, j) → (j, i). Reversing row j moves column i → column N−1−i, so (j, i) → (j, N−1−i). Composed: (i, j) → (j, N−1−i), which is exactly the clockwise rotation.

## Complexity
$O(N^2)$ time, $O(1)$ extra space.

## Pitfalls
- Transposing with both i < j and i > j swaps every pair twice (undoing itself): only loop over i < j.
- Counter-clockwise is the other order: reverse rows first (or reverse columns after transposing).
