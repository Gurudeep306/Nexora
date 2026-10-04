## Intuition
To get the next permutation, change the array as little as possible **at the right end**. The longest non-increasing suffix is already the largest arrangement of its elements, so it cannot be bumped by itself. The first element before that suffix (the "pivot") must grow by the smallest possible amount, and the suffix must then be as small as possible.

## Approach
1. Find the largest i with `a[i] < a[i+1]` (the pivot). If none, the array is the last permutation: reverse it all (wrap to the smallest).
2. Find the largest j > i with `a[j] > a[i]`, swap `a[i]` and `a[j]`.
3. Reverse the suffix `a[i+1..]` (it is non-increasing, so reversing sorts it ascending).

Example `1 3 5 4 2`: pivot 3 (index 1); the smallest larger value in the suffix is 4; swap → `1 4 5 3 2`; reverse the suffix → `1 4 2 3 5`.

## Why it works
Everything left of the pivot must stay (changing an earlier position would jump further). The pivot must increase (the suffix alone is maxed out), and by the least amount: the smallest suffix value greater than it — which, since the suffix is non-increasing, is the rightmost such value. After the swap the suffix is still non-increasing, so reversing it gives its smallest arrangement.

## Complexity
$O(n)$ time, $O(1)$ space.

## Pitfalls
- With duplicates use `a[i] < a[i+1]` and `a[j] > a[i]` (strict), otherwise you can produce the same permutation.
- The last permutation wraps to sorted order.
