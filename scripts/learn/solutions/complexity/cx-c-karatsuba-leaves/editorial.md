## Intuition
After padding to $2^k$ digits, the recursion is perfectly regular: every call on $2^j$ digits makes 3 calls on $2^{j-1}$ digits. The recursion tree has depth k and branching factor 3, so it has $3^k$ leaves — each a single-digit product. With $k = \lceil \log_2 n \rceil$ this is $3^{\lceil\log_2 n\rceil} \approx n^{\log_2 3} \approx n^{1.585}$, the famous Karatsuba bound (versus $n^2 = 4^{\log_2 n}$ for the schoolbook method, which makes 4 calls).

## Approach
1. $k$ = smallest integer with $2^k \ge n$. Exactly, with integers: $k = $ bit length of $n - 1$ (so $n = 1 \Rightarrow k = 0$, $n = 64 \Rightarrow k = 6$, $n = 65 \Rightarrow k = 7$).
2. Output $3^k \bmod p$ by fast exponentiation (k ≤ 60, so even a plain loop works).

Example n = 3: pad to 4 digits, $k = 2$, leaves $3^2 = $ **9**. n = 64: $k = 6$, $3^6 = 729$.

## Why it works
Let $L(j)$ be the leaves under a call on $2^j$ digits: $L(0) = 1$, $L(j) = 3L(j-1)$, so $L(j) = 3^j$. The bit length of $n-1$ is the number of bits needed to write $n - 1$, i.e. the least k with $n - 1 < 2^k$, i.e. $2^k \ge n$.

## Complexity
$O(\log n)$ per query. The point of the exercise: $3^{\log_2 n} = n^{\log_2 3}$ — the Master theorem's "leaves dominate" case, where the cost is the number of leaves.

## Pitfalls
- Floating point: `ceil(log2(n))` is wrong near powers of two at $n \sim 2^{59}$ (doubles have 53 bits of mantissa, so $2^{59}+1$ rounds to $2^{59}$). Use integer bit length.
- n = 1 needs no padding: $k = 0$, answer 1. Using the bit length of n instead of n − 1 gives an off-by-one at exact powers of two.
- In JS, parse n as BigInt.
