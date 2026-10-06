## Intuition
The maximum X of k dice is awkward to handle directly. Its **cumulative** distribution is simple, though: $X \le y$ means every die is at most y, and the dice are independent, so
$$\Pr[X \le y] = \left(\tfrac{y}{m}\right)^k.$$
The tail-sum formula turns this into the expectation without ever computing $\Pr[X = x]$.

## Approach
For a variable taking values in $\{1, \dots, m\}$:
$$\mathbb{E}[X] = \sum_{x=1}^{m} \Pr[X \ge x] = \sum_{x=1}^{m} \left(1 - \left(\tfrac{x-1}{m}\right)^k\right) = m - \frac{\sum_{y=1}^{m-1} y^k}{m^k}.$$
Compute $S = \sum_{y<m} y^k \bmod p$ with fast powers. The answer is $m - S \cdot (m^k)^{-1} \bmod p$.

Example: $m = 6$, $k = 2$: $6 - \frac{1 + 4 + 9 + 16 + 25}{36} = 6 - \frac{55}{36} = \frac{161}{36}$.

## Why it works
Write $X = \sum_{x=1}^{m} [X \ge x]$, since a value v is counted once for each $x = 1..v$. Taking expectations of the indicators gives the tail sum. Independence gives $\Pr[\max \le y] = \prod \Pr[\text{die} \le y] = (y/m)^k$. Because $m < p$, $m^k$ is invertible modulo p. You can also reduce the exponent: $y^k \equiv y^{k \bmod (p-1)}$ for $p \nmid y$, by Fermat. That keeps the exponents small in languages without big integers.

## Complexity
$O(m \log k)$: one fast power per y, about $2 \cdot 10^5 \cdot 30$ multiplications after reducing the exponent.

## Pitfalls
- A DP over dice is $O(mk)$, and enumerating outcomes is $m^k$. Both are impossible for $k = 10^{18}$.
- k does not fit in a JavaScript Number, so parse it as `BigInt` and reduce it modulo $p - 1$.
- With $m = 1$, the sum is empty and the answer is 1.
- Floating point would lose precision and cannot produce the exact residue anyway.
