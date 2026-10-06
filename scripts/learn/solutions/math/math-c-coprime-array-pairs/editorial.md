## Intuition
Testing all pairs costs $\Theta(n^2 \log V)$, which is too slow. It is easy, though, to count pairs where a given d divides **both** values. If $c_d$ values are multiples of d, there are $\binom{c_d}{2}$ such pairs. "Coprime" means no prime divides both, which is an inclusion–exclusion over primes: start with all pairs, subtract those sharing 2, 3, 5, …, add back those sharing 6, 10, 15, …, and so on.

## Approach
1. Sieve the Möbius function $\mu$ up to $M = \max a_i$. $\mu(1) = 1$, $\mu(d) = (-1)^k$ when d is a product of k distinct primes, and $\mu(d) = 0$ when a square divides d.
2. Count occurrences `freq[v]`. For each d with $\mu(d) \ne 0$, compute $c_d = \sum_{d \mid v} \text{freq}[v]$ by walking the multiples of d.
3. The answer is $\sum_d \mu(d) \binom{c_d}{2}$.

Example: `2 3 4 9`. $c_1 = 4$, $c_2 = 2$ (2 and 4), $c_3 = 2$ (3 and 9), and $c_6 = 0$. The answer is $6 - 1 - 1 + 0 = 4$: the pairs (2,3), (2,9), (3,4) and (4,9).

## Why it works
The key identity is $\sum_{d \mid m} \mu(d) = [m = 1]$. Apply it to each pair with $m = \gcd(a_i, a_j)$ and sum over the pairs:
$$\sum_{i<j} [\gcd = 1] = \sum_{i<j} \sum_{d \mid a_i,\, d \mid a_j} \mu(d) = \sum_d \mu(d) \binom{c_d}{2}.$$
The identity holds because, for $m > 1$ with k distinct primes, the squarefree divisors contribute $\sum_j \binom{k}{j} (-1)^j = (1 - 1)^k = 0$.

## Complexity
The linear sieve is $O(M)$. Counting multiples costs $\sum_d M/d = O(M \log M)$. Overall $O(n + M \log M)$ with $M = 10^5$.

## Pitfalls
- Two equal 1s are coprime, and $\binom{c}{2}$ handles that automatically. Two equal values $v > 1$ are not.
- The answer reaches about $2 \cdot 10^{10}$, which needs 64-bit.
- Skip d with $\mu(d) = 0$. It saves time and changes nothing.
