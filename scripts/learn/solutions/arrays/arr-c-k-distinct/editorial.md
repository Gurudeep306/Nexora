## Intuition
A window with at most k distinct values stays valid when it shrinks, and growing it can only add distinct values — the variable sliding window applies. The window's state is a **count per value**; a value disappears from the window only when its count drops to zero.

## Approach
For each `hi`: increment `count[a[hi]]` (if it was 0, `distinct++`). While `distinct > k`: decrement `count[a[lo]]` (if it hits 0, `distinct--`), `lo++`. Record `hi − lo + 1`.

Values go up to $10^9$, so use a hash map — or compress the values to 0…n−1 first and use an array (as the C solution does).

Example `1 2 1 2 3`, k = 2 → `1 2 1 2` → **4**.

## Why it works
For each hi the loop leaves `lo` at the smallest start with ≤ k distinct values in `a[lo..hi]` — the longest valid window ending at hi. `lo` never has to move back, because a window that had too many distinct values still has too many when extended to the right.

## Complexity
$O(n)$ expected time with hashing ($O(n\log n)$ with compression), $O(n)$ space.

## Pitfalls
- `distinct` must change only on 0 ↔ 1 transitions of a count.
- k ≥ number of distinct values → the answer is n.
