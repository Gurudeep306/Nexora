## Intuition
Summing $\sigma(k)$ term by term means factoring $10^{12}$ numbers. Turn the sum around: instead of "for each $k$, add its divisors", ask "for each $d$, how often is it added?" $d$ is a divisor of exactly the $\lfloor n/d \rfloor$ multiples of $d$ up to $n$, so
$$S(n) = \sum_{k \le n} \sigma(k) = \sum_{d=1}^{n} d \left\lfloor \frac{n}{d} \right\rfloor = \sum_{d q \le n} d.$$
That is still $n$ terms. But the pairs $(d, q)$ with $dq \le n$ lie under a hyperbola, and either $d \le \sqrt n$ or $q \le \sqrt n$.

## Approach
Let $r = \lfloor \sqrt n \rfloor$ and $T(x) = x(x+1)/2$. Count pairs with $d \le r$ by $d$, and pairs with $q \le r$ by $q$. Subtract the square where both hold, which was counted twice:
$$S(n) = \sum_{d=1}^{r} d \left\lfloor \tfrac{n}{d} \right\rfloor + \sum_{q=1}^{r} T\!\left(\left\lfloor \tfrac{n}{q}\right\rfloor\right) - r \cdot T(r).$$
Use one loop over $i = 1..r$ for both sums, mod $M$.

Example: $n = 10$, $r = 3$. The first sum is $10 + 2 \cdot 5 + 3 \cdot 3 = 29$. The second is $T(10) + T(5) + T(3) = 55 + 15 + 6 = 76$. Subtract $3 \cdot 6 = 18$, so $S = 87$. Check: the $\sigma$ values are $1, 3, 4, 7, 6, 12, 8, 15, 13, 18$, which also sum to $87$.

## Why it works
Every pair with $dq \le n$ has $d \le r$ or $q \le r$, since otherwise $dq \ge (r+1)^2 > n$. The first sum adds $d$ over the pairs with $d \le r$. The second adds $\sum_{d \le n/q} d = T(\lfloor n/q \rfloor)$ over the pairs with $q \le r$. Pairs with both $d \le r$ and $q \le r$ (all such pairs satisfy $dq \le r^2 \le n$) are counted twice, and their weight is $\sum_{q \le r} \sum_{d \le r} d = r \cdot T(r)$. This is inclusion–exclusion.

## Complexity
$O(\sqrt n) = 10^6$ iterations and $O(1)$ memory, compared with $O(n) = 10^{12}$ for the direct sum.

## Pitfalls
- $T(\lfloor n/q \rfloor)$ is about $5 \cdot 10^{23}$. Halve the even factor **before** reducing mod $M$, or use an inverse of 2.
- `sqrt` in floating point can be off by one. Adjust $r$ with integer checks.
- The subtraction can go negative mod $M$. Add $M$.
