## Intuition
Count nodes of the recursion tree. Each call to fib(k) for $k \ge 2$ is itself one call plus the calls made by fib(k−1) and fib(k−2):
$$C(k) = 1 + C(k-1) + C(k-2), \qquad C(0) = C(1) = 1.$$
This is the Fibonacci recurrence with a "+1", so the call count grows like $\varphi^n$ — about $8\cdot10^{17}$ for n = 85. We must compute the count, not run the function.

## Approach
Substitute $D(k) = C(k) + 1$. Then $D(k) = D(k-1) + D(k-2)$ with $D(0) = D(1) = 2 = 2F(1) = 2F(2)$, so $D(k) = 2F(k+1)$ and
$$C(n) = 2F(n+1) - 1.$$
Iterate $F$ up to $F(n+1)$ in $O(n)$.

Example n = 5: $F(6) = 8$, so $C(5) = 15$. Check: $C(2) = 3$, $C(3) = 5$, $C(4) = 9$, $C(5) = 1 + 9 + 5 = 15$.

## Why it works
Adding 1 to both sides of the recurrence absorbs the constant: $C(k) + 1 = (C(k-1) + 1) + (C(k-2) + 1)$. A sequence obeying the Fibonacci recurrence is determined by two starting values; $2F(k+1)$ matches $D$ at $k = 0, 1$, hence everywhere by induction. The "+1" trick is the general technique for linear recurrences with a constant term: shift by the fixed point.

## Complexity
$O(n)$ per query, $O(Tn)$ total — trivial. The naive function is $\Theta(\varphi^n)$, which is exactly the point: the recursion tree has $2F(n+1) - 1$ nodes, of which $F(n+1)$ are leaves.

## Pitfalls
- $2F(86) - 1 \approx 8.4\cdot10^{17}$: fits in signed 64-bit, but exceeds $2^{53}$ — use BigInt in JS.
- Off-by-one: it is $F(n+1)$, not $F(n)$; check n = 0 → 1 and n = 1 → 1.
- Don't confuse the call count with the returned value $F(n)$.
