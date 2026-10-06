## Intuition
$H_n \bmod p$ is just $\sum_{i=1}^{n} i^{-1} \bmod p$. Division by $i$ is multiplication by its inverse, and inverses respect addition. So all we need is the inverses of $1, \dots, N$ with $N = \max n$, followed by prefix sums. With Fermat that is $N$ fast powers, about $3 \cdot 10^7$ multiplications. There is a neat $O(1)$-per-element recurrence instead.

## Approach
Write $p = q i + r$ with $q = \lfloor p/i \rfloor$ and $r = p \bmod i$, where $0 < r < i$ because $p$ is prime and $i < p$. Then
$$q i + r \equiv 0 \pmod p \;\Longrightarrow\; r \equiv -q i \;\Longrightarrow\; i^{-1} \equiv -q \cdot r^{-1} \pmod p.$$
Since $r < i$, the value $r^{-1}$ is already known:
1. $\text{inv}[1] = 1$, and $\text{inv}[i] = p - \lfloor p/i \rfloor \cdot \text{inv}[p \bmod i] \bmod p$.
2. $H[i] = H[i-1] + \text{inv}[i] \pmod p$.
3. Answer each query with $H[n]$.

Example ($p = 10^9 + 7$): $\text{inv}[2] = p - 500000003 \cdot 1 = 500000004$. Then $H_2 = 1 + 500000004 = 500000005$, which is $3/2$. Check: $2 \cdot 500000005 = 10^9 + 10 \equiv 3$.

## Why it works
The identity follows from $q i + r = p \equiv 0$ by multiplying both sides by $i^{-1} r^{-1}$, which exist because $0 < r, i < p$. Induction on $i$ shows every table entry is the true inverse. The map $x/y \mapsto x y^{-1}$ is a ring homomorphism from fractions whose denominators are coprime to $p$ onto $\mathbb{Z}_p$. Summing the images therefore equals the image of the exact sum $H_n = P/Q$, so the reduced form of the fraction never has to be computed.

## Complexity
$O(N + T)$ time and $O(N)$ memory with $N \le 10^6$. Fermat per $i$ would add a $\log p \approx 30$ factor, and recomputing per query would be $O(T N)$, which is $10^{11}$.

## Pitfalls
- $\lfloor p/i \rfloor \cdot \text{inv}[\cdot]$ reaches about $10^{18}$. That is fine in 64-bit, but JavaScript numbers need a split multiplication.
- Take `p - (...) % p`, not a negative value.
- Read all queries first, so the table is built only up to the largest $n$.
