## Intuition
$\binom{n}{r} = \frac{n!}{r!\,(n-r)!}$. Modulo the prime $p = 10^9 + 7 > 10^6$, none of these factorials is $0$, so division becomes multiplication by inverses. Pay the cost once: tabulate $i!$ and $(i!)^{-1}$ for all $i \le 10^6$, and every query becomes three table lookups.

## Approach
1. $F[0] = 1$ and $F[i] = F[i-1] \cdot i$.
2. $\text{IF}[N] = F[N]^{p-2}$ (Fermat), then walk down with $\text{IF}[i-1] = \text{IF}[i] \cdot i$.
3. Query: if $r > n$, print 0. Otherwise print $F[n] \cdot \text{IF}[r] \cdot \text{IF}[n-r] \bmod p$.

Example: $\binom{5}{2} = 120 \cdot (2!)^{-1} \cdot (3!)^{-1} = 120 / 12 = 10$.

## Why it works
$\binom nr \cdot r! \cdot (n-r)! = n!$ holds over the integers, hence modulo $p$. Since $p$ is prime and $r!, (n-r)!$ contain only factors below $p$, both are invertible, and $\binom nr \equiv n! \, (r!)^{-1} ((n-r)!)^{-1}$.

The downward recurrence is valid because $\frac{1}{(i-1)!} = \frac{i}{i!}$. So only one modular exponentiation is needed instead of $N$.

## Complexity
$O(N + \log p)$ preprocessing with $N = 10^6$, $O(1)$ per query, and $O(N)$ memory. Pascal's triangle would need $\Theta(N^2)$ cells, and multiplying $r$ terms per query costs $\Theta(T \cdot r)$.

## Pitfalls
- $r > n$ must give 0. Don't index $\text{IF}[n - r]$ with a negative index.
- Multiply in 64-bit, and reduce after **each** product: three residues multiplied together overflow.
- In JavaScript, a residue product (up to $10^{18}$) is not exact in a double. Split one factor into 15-bit halves.
