## Intuition
Group the pairs by their larger element. For $b \ge 2$, the values $a < b$ with $\gcd(a, b) = 1$ number exactly $\varphi(b)$, by the definition of Euler's totient. The case $a = b$ is coprime only for $b = 1$. Swapping $a$ and $b$ gives the pairs with $a > b$. So we need $\Phi(n) = \sum_{b=1}^{n} \varphi(b)$ for every n, and that is a sieve plus a prefix sum.

## Approach
1. Set $\varphi[v] = v$. For each prime $p$ (a value still equal to itself when reached), and every multiple $j$ of $p$, set $\varphi[j] \leftarrow \varphi[j] - \varphi[j]/p$.
2. Build prefix sums $\Phi[n]$.
3. The answer is $2\,\Phi[n] - 1$.

Example: $n = 3$. Here $\varphi(1), \varphi(2), \varphi(3) = 1, 1, 2$, so $\Phi = 4$ and the answer is $7$. The pairs are $(1,1), (1,2), (2,1), (1,3), (3,1), (2,3), (3,2)$.

## Why it works
Counting: the ordered pairs with $a < b$ number $\sum_{b=2}^n \varphi(b) = \Phi(n) - 1$. The same holds for $a > b$, and the diagonal adds just $(1,1)$. The total is $2(\Phi(n) - 1) + 1 = 2\Phi(n) - 1$.

Sieve: $\varphi(j) = j \prod_{p \mid j} (1 - 1/p)$. Each prime divisor $p$ of $j$ visits $j$ once and multiplies the current value by $(1 - 1/p)$, written as `v - v / p`. That division is exact, because at every moment the value is $j$ times a product of factors $(1 - 1/q)$ for primes $q$ that divide $j$ and are different from $p$, so it is still divisible by $p$. A value $p$ untouched when we reach it has no smaller prime factor, so it is prime.

## Complexity
The sieve is $O(N \log \log N)$ for $N = 10^6$, then $O(1)$ per query. Brute force would be $O(n^2 \log n)$ per query.

## Pitfalls
- $\Phi(10^6) \approx 3 \cdot 10^{11}$ needs 64-bit prefix sums.
- $\varphi(1) = 1$, and $n = 1$ gives 1, the single pair $(1,1)$.
- Don't double-count the diagonal.
