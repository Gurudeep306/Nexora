## Intuition
Checking every pair is $O(ab)$ per query. Two reductions get rid of that.
1. $\gcd(x, y) = k$ means $x = kx'$ and $y = ky'$ with $\gcd(x', y') = 1$, where $x' \le A = \lfloor a/k \rfloor$ and $y' \le B = \lfloor b/k \rfloor$. So we only need to count **coprime** pairs in an $A \times B$ box.
2. Pairs whose gcd is divisible by d are easy to count: $\lfloor A/d \rfloor \lfloor B/d \rfloor$. Inclusion–exclusion over the common prime factors, with signs given by the Möbius function, isolates the coprime pairs:
$$C(A, B) = \sum_{d \ge 1} \mu(d) \left\lfloor \tfrac{A}{d} \right\rfloor \left\lfloor \tfrac{B}{d} \right\rfloor.$$

## Approach
1. Sieve $\mu$ up to $2 \cdot 10^5$ with a linear sieve, and store its prefix sums $M(x)$.
2. For each query, set $A = \lfloor a/k \rfloor$ and $B = \lfloor b/k \rfloor$. Walk d in blocks: from d, the quotients $\lfloor A/d \rfloor$ and $\lfloor B/d \rfloor$ both stay constant up to $e = \min(\lfloor A / \lfloor A/d \rfloor \rfloor, \lfloor B / \lfloor B/d \rfloor \rfloor)$. Add $(M(e) - M(d-1)) \cdot \lfloor A/d \rfloor \lfloor B/d \rfloor$.

Example: $A = B = 5$. The values are $\mu = 1, -1, -1, 0, -1$ for $d = 1..5$, and $25 - 4 - 1 - 0 - 1 = 19$ coprime pairs.

## Why it works
Use $\sum_{d \mid g} \mu(d) = [g = 1]$. Then
$$\sum_{x, y} [\gcd(x,y) = 1] = \sum_{x, y} \sum_{d \mid x,\, d \mid y} \mu(d) = \sum_d \mu(d) \cdot \#\{x : d \mid x\} \cdot \#\{y : d \mid y\}.$$
This is inclusion–exclusion over square-free d. The blocks are valid because each quotient changes value only $O(\sqrt{A})$ times.

## Complexity
Sieve: $O(N)$. Each query: $O(\sqrt A + \sqrt B)$ blocks, so about 1800 per query at the limits.

## Pitfalls
- If $k > a$ or $k > b$, then $A = 0$ or $B = 0$, and the answer is 0.
- Answers reach $4 \cdot 10^{10}$, so use 64-bit integers.
- The pairs are **ordered**: (1, 2) and (2, 1) both count.
