## Intuition
Testing every number up to n is $10^{12}$ steps. Divisors come in **pairs** $(i, n/i)$ and the smaller of each pair is at most $\sqrt n$. So test only $i \le \sqrt n \approx 10^6$.

## Approach
For i = 1, 2, … while $i\cdot i \le n$: if i divides n, add 2 (for i and n/i), or 1 if $i\cdot i = n$.

Example 36: pairs (1,36), (2,18), (3,12), (4,9), and 6·6 = 36 counted once → **9**.

## Why it works
If $d \mid n$ then $n/d \mid n$, and $\min(d, n/d) \le \sqrt n$ (otherwise their product would exceed n). So every divisor is either some $i \le \sqrt n$ or its partner $n/i$, and the only pair whose two members coincide is $i = \sqrt n$.

## Complexity
$O(\sqrt n)$ = $10^6$ divisions.

## Pitfalls
- Use `i * i <= n` (integer) rather than `i <= sqrt(n)` with floating point.
- Perfect squares: count the root once.
