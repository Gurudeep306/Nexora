## Intuition
Finding the minimum and the maximum separately costs $(n-1) + (n-1) = 2n - 2$ comparisons. But an element that loses a comparison can never be the maximum, and one that wins can never be the minimum. Comparing elements **in pairs** first sends each element to only one of the two contests.

## Approach
- If n is odd, start with `min = max = a[0]` (0 comparisons); if even, compare `a[0]` with `a[1]` (1 comparison).
- For every following pair $(x, y)$: compare $x$ with $y$ (1), the smaller with `min` (1), the larger with `max` (1) — 3 comparisons per 2 elements.

Count the comparisons as you go. Total: odd n gives $3\cdot\frac{n-1}{2}$, even n gives $1 + 3\cdot\frac{n-2}{2} = \frac{3n}{2} - 2$; both equal $\lceil 3n/2\rceil - 2$.

Example `7 3 9 1 6 8 2 5` (n = 8): 1 + 3·3 = **10** comparisons, min 1, max 9.

## Why it works
Correctness: the pair winner is the only candidate for the maximum of the pair, the loser the only candidate for the minimum. Optimality (adversary argument): give each element two "potential" units — it may still be the min, and it may still be the max. Initially there are $2n$ units, at the end $2$. A comparison between two untouched elements removes 2 units; any other comparison can be answered by the adversary so it removes at most 1. At most $\lfloor n/2\rfloor$ comparisons of the first kind exist, so at least $\lfloor n/2\rfloor + (2n - 2 - 2\lfloor n/2\rfloor) = \lceil 3n/2\rceil - 2$ are needed.

## Complexity
$O(n)$ time, $O(1)$ extra space; exactly $\lceil 3n/2\rceil - 2$ comparisons.

## Pitfalls
- n = 1 needs **0** comparisons; n = 2 needs 1.
- In the odd case do not compare `a[0]` with itself.
- Values go to $\pm10^9$: initialise min/max from the data, not from a sentinel that may coincide.
