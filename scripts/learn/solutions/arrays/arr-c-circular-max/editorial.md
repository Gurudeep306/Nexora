## Intuition
A circular subarray either **doesn't wrap** — plain Kadane finds the best of those — or it **wraps** around the end. A wrapping subarray is the whole array with a contiguous middle piece removed, so the best wrapping sum is `total − (minimum subarray sum)`. Run Kadane twice: once for the maximum, once for the minimum.

## Approach
In one pass compute `total`, `bestMax` (Kadane for max) and `bestMin` (Kadane for min). If `bestMax < 0` every element is negative — answer `bestMax`. Otherwise answer `max(bestMax, total − bestMin)`.

Example `5 -3 5`: bestMax 7 (whole array), total 7, bestMin −3 → wrap 10 → **10** (`5 | 5`).

## Why it works
Every non-empty circular subarray is either a normal subarray or the complement of a normal "middle" subarray. Maximising the complement's sum is minimising the middle. The all-negative case needs care: then `bestMin` is the whole array and `total − bestMin = 0` would describe an **empty** subarray, which is not allowed — the answer is the largest single element, which is `bestMax`.

## Complexity
$O(n)$ time, $O(1)$ space.

## Pitfalls
- All-negative input (the classic bug returns 0).
- 64-bit sums.
