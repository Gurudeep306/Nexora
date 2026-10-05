## Intuition
$an^2 + bn + c \le Cn^2$ is equivalent to $q(n) = dn^2 - bn - c \ge 0$ with $d = C - a \ge 1$. This $q$ is an upward parabola: it is negative on at most one interval of consecutive integers and non-negative everywhere else. The smallest valid $n_0$ is therefore one past the **last** integer where $q < 0$ (or 1 if there is none).

## Approach
1. The real vertex is $x^* = b/(2d)$; the integer minimiser of $q$ on $n \ge 1$ is $c_0 = \max(1, \lfloor x^*\rfloor)$ or $c_0 + 1$.
2. If $q(c_0) \ge 0$ and $q(c_0+1) \ge 0$, then $q \ge 0$ for all $n \ge 1$: answer **1**.
3. Otherwise let $m$ be the larger of the two with $q(m) < 0$. To the right of $m$ the predicate "$q(n) < 0$" is true…true, false…false, so binary search the largest such $n$ in $[m, 2\cdot10^6]$. Answer: that $n$ plus 1.

Example $a=3, C=4, b=5, c=6$: $q(n) = n^2 - 5n - 6 = (n-6)(n+1)$, negative for $n \le 5$, zero at 6 → $n_0 = 6$.

## Why it works
A convex function's negative set is an interval (if $q(x) < 0$ and $q(y) < 0$, every point between is below the chord, hence negative). That interval, if non-empty, contains the integer minimiser, so step 2 detects it. Binary search on a monotone predicate finds the last true position. The bound $2\cdot10^6$ is safe: the larger root is at most $\frac{|b| + \sqrt{b^2 + 4d|c|}}{2d} < 1.01\cdot10^6$.

## Complexity
$O(\log 10^6) \approx 21$ evaluations per query.

## Pitfalls
- Binary searching from $n = 1$ is wrong: left of the vertex $q$ is **decreasing**, so the predicate is not monotone there.
- The answer is the smallest $n_0$ for which the inequality holds for **all** $n \ge n_0$, not the first $n$ where it holds.
- $dn^2$ reaches $4\cdot10^{15}$: use 64-bit (still exact in a JS double, below $2^{53}$).
- Integer division of negative $b$: clamp the vertex to 1 first.
