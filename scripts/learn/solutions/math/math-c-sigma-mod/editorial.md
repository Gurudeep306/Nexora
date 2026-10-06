## Intuition
Since divisors of $n = \prod p_i^{e_i}$ are independent choices of exponents, both functions are **multiplicative**:
$$d(n) = \prod_i (e_i + 1), \qquad \sigma(n) = \prod_i \left(1 + p_i + \dots + p_i^{e_i}\right).$$
Each factor of $\sigma$ is a geometric series with up to $10^{18}$ terms. The closed form $\frac{p^{e+1} - 1}{p - 1}$ needs one fast power and one modular inverse. The only catch is when that inverse does not exist.

## Approach
Let $M = 10^9 + 7$ and $r = p \bmod M$. For each prime:
1. Multiply $d$ by $(e + 1) \bmod M$.
2. If $r = 1$: every term $p^j \equiv 1$, so the series is $\equiv e + 1$.
3. Otherwise the series is $(r^{e+1} - 1) \cdot (r - 1)^{M-2} \bmod M$, using Fermat's inverse. This also covers $r = 0$ (that is, $p = M$): there the formula gives $(-1)/(-1) = 1$, and indeed $1 + M + M^2 + \dots \equiv 1$.

Example: $2^2 \cdot 3$ gives $d = 3 \cdot 2 = 6$ and $\sigma = 7 \cdot 4 = 28$. For $p = 2 \cdot M + 1$ (a prime, $\equiv 1$) with $e = 5$, the series is $6$.

## Why it works
For $r \not\equiv 1$, the identity $(r - 1)(1 + r + \dots + r^{e}) = r^{e+1} - 1$ holds in the field $\mathbb{Z}_M$. Since $r - 1 \ne 0$ it is invertible, and $(r - 1)^{M-2}$ is its inverse by Fermat's little theorem ($a^{M-1} \equiv 1$ for $a \not\equiv 0$). Reducing $p$ to $r$ before exponentiating is valid because $p^j \equiv r^j$. Products of residues stay congruent to the products of the true values.

## Complexity
$O(\log e + \log M)$ per prime, so $O(k \cdot 60)$ multiplications in total, with $O(1)$ memory.

## Pitfalls
- **The $p \equiv 1 \pmod M$ trap.** $r - 1 = 0$ has no inverse, and $0^{M-2} = 0$ silently gives a wrong 0.
- $p$ can be up to $10^{12}$. Reduce it mod $M$ first, or `p * p` overflows.
- $e + 1$ for $e = M - 1$ is $\equiv 0$, which is correct: then $d \equiv 0$.
- In JavaScript, you can shrink the exponent with Fermat. When $r \ne 0$, $r^{e+1} = r^{(e+1) \bmod (M-1)}$, so it fits in a `Number`.
