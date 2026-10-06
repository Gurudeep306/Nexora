## Intuition
Averaging over all $n!$ permutations is out of the question, even for $n = 15$. **Linearity of expectation** lets us split the inversion count into one indicator per pair of positions, and average each indicator on its own. Each indicator turns out to be a coin flip.

## Approach
For positions $i < j$, let $X_{ij} = 1$ if $p_i > p_j$. Then
$$\mathbb{E}[\text{inv}] = \sum_{i<j} \Pr[p_i > p_j] = \binom{n}{2} \cdot \frac12 = \frac{n(n-1)}{4}.$$
To print it modulo $p = 10^9 + 7$: reduce $n$ and $n - 1$ modulo p, multiply, and multiply by $4^{-1} \equiv 250000002$.

Example: $n = 3$. The six permutations have $0, 1, 1, 2, 2, 3$ inversions, which average to $9/6 = 3/2$. The formula gives $3 \cdot 2 / 4 = 3/2$, printed as $3 \cdot 2^{-1} \bmod p = 500000005$.

## Why it works
Swapping the values at positions i and j is a bijection on permutations that turns every permutation with $p_i > p_j$ into one with $p_i < p_j$. So exactly half of all permutations invert any fixed pair, and $\Pr = 1/2$. Linearity of expectation holds even though the $X_{ij}$ are dependent. It is also valid to reduce modulo p first: $P/Q$ maps to $P \cdot Q^{-1}$ through a ring homomorphism from the fractions whose denominator is coprime to p, and $Q \mid 4$ is coprime to p.

## Complexity
$O(1)$ per query.

## Pitfalls
- $n(n-1)$ overflows 64 bits for $n = 10^{18}$. Reduce each factor modulo p **before** multiplying.
- Don't divide by 4 after reducing modulo p. Multiply by the inverse instead.
- In JavaScript, parse n with `BigInt`.
- For $n = 1$ the answer is 0.
