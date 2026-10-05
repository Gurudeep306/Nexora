## Intuition
The naive method — find the max ($n-1$ comparisons), then the max of the rest ($n-2$) — costs $2n-3$. A **knockout tournament** does better: the champion is found in $n-1$ matches, and the runner-up must have lost **directly** to the champion (anyone else lost to someone who is not the champion, so is beaten by at least two). The champion played only $\lceil\log_2 n\rceil$ matches, so a second small tournament among those opponents takes $\lceil\log_2 n\rceil - 1$ more.

## Approach
Values: one linear scan keeping the best and the second best. Count: $n + \lceil\log_2 n\rceil - 2$, where $\lceil\log_2 n\rceil$ is computed exactly with integers as the bit length of $n-1$ (no floating-point log).

Example `5 9 2 7`: runner-up **7**; count $4 + 2 - 2 = 4$ (9 beats 5, 7 beats 2, 9 beats 7 — then 5 vs 7 among 9's victims). For n = 64: 68; for n = 65: 70.

## Why it works
Upper bound: a balanced bracket has depth $\lceil\log_2 n\rceil$, so the champion meets at most that many opponents. Lower bound (Kislitsyn, via an adversary): every element except the champion and the runner-up must lose at least once, and the adversary can force the champion to win $\lceil\log_2 n\rceil$ comparisons against distinct elements, all of which except one must also lose... the counting gives exactly $n + \lceil\log_2 n\rceil - 2$.

## Complexity
$O(n)$ time and $O(1)$ extra space for the values; $O(1)$ for the formula.

## Pitfalls
- `ceil(log2(n))` in floating point can be off by one at powers of two; use the bit length of $n - 1$ (or a loop doubling a power of two).
- n = 2: count is $2 + 1 - 2 = 1$.
- Initialise the second best from the data, not from 0 — values may be negative.
