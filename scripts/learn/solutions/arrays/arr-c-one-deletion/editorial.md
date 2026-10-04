## Intuition
Kadane with **two states**. For each index i:
- `keep` = best sum of a subarray ending at i with **no** deletion;
- `del` = best sum of a subarray ending at i with **one** deletion already used.

A subarray ending at i with one deletion either deleted $a_i$ itself (then it is a no-deletion subarray ending at i−1: `keep_{i-1}`) or deleted earlier and includes $a_i$ (`del_{i-1} + a_i`).

## Approach
`keep = a[0]`, `del = −∞`, `best = a[0]`. For each later x:
`del = max(del + x, keep)` (using the old keep), then `keep = max(keep + x, x)`, `best = max(best, keep, del)`.

Example `1 -2 0 3`: delete −2 from `1 -2 0 3` → **4**.

## Why it works
The two recurrences enumerate exactly the two ways a one-deletion subarray can end at i, and Kadane's argument (best ending here builds on best ending one step earlier) applies to each state. `del` at index i always contains at least one element (the subarray ending at i−1 when $a_i$ is deleted), so the result is never empty.

## Complexity
$O(n)$ time, $O(1)$ space.

## Pitfalls
- Update `del` **before** `keep` — it needs the previous `keep`.
- Use a safe "−∞" (e.g. `LLONG_MIN/2`) so `del + x` cannot overflow.
- All negative: the answer is the largest single element (deleting from a one-element subarray is not allowed).
