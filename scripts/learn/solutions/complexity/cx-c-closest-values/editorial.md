## Intuition
There are $\binom{n}{2} \approx 2 \cdot 10^{10}$ pairs for $n = 2 \cdot 10^5$, which at roughly $10^8$ simple operations per second is minutes of work. But sorting changes the question: in a sorted array, the closest pair of values must sit **next to each other**. That leaves only $n - 1$ candidates.

## Approach
1. Sort the array: $O(n \log n)$.
2. Scan adjacent pairs and keep the minimum of $a_{i+1} - a_i$: $O(n)$.

Example: `7 1 19 4 12` sorts to `1 4 7 12 19`. The gaps are 3, 3, 5, 7, so the answer is **3**.

## Why it works
Take any pair $i < j$ in sorted order with $j > i + 1$. Since $a_i \le a_{i+1} \le a_j$,
$$a_j - a_i = (a_j - a_{i+1}) + (a_{i+1} - a_i) \ge a_{i+1} - a_i.$$
So every non-adjacent pair is beaten, or tied, by an adjacent pair inside it, and the minimum over adjacent pairs is the minimum over all pairs. Equal values give a gap of 0, which the scan finds naturally.

## Complexity
$O(n \log n)$ time, dominated by the sort, compared with $\Theta(n^2)$ for checking every pair. Extra space is $O(1)$ beyond the array, or $O(n)$ for merge-sort-based library sorts.

## Pitfalls
- A difference can be $2 \cdot 10^9$, which overflows a 32-bit int. Use 64-bit.
- In C, a qsort comparator written as `return x - y` overflows on $\pm 10^9$ values. Compare instead.
- JavaScript's default `sort()` compares as **strings**. Use a typed array or a numeric comparator.
