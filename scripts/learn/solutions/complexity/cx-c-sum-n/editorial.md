## Intuition
A loop from 1 to n is $\Theta(n)$ — hopeless for $n = 10^{18}$. Gauss's formula gives the sum in $O(1)$:
$$1 + 2 + \dots + n = \frac{n(n+1)}{2}.$$
The only difficulty is arithmetic: $n(n+1)$ is about $10^{36}$, far beyond 64 bits, and we need the result modulo $10^9 + 7$.

## Approach
One of n and n+1 is even. Divide **that** one by 2 first (exactly, before any reduction), then reduce both factors mod $p$ and multiply:
$$\text{ans} = \big(\tfrac{n}{2} \bmod p\big)\big((n+1) \bmod p\big) \bmod p \quad\text{(if } n \text{ even)}.$$
Each factor is below $p < 2^{30}$, so the product fits in 64 bits.

Example n = 10: 5 · 11 = **55**.

## Why it works
$n(n+1)/2$ is an integer, and halving the even factor computes exactly that integer as a product of two smaller integers. Reducing each factor mod p before multiplying is valid because $(xy) \bmod p = ((x \bmod p)(y \bmod p)) \bmod p$. What is **not** valid is reducing first and dividing by 2 afterwards — $n(n+1) \bmod p$ may be odd.

## Complexity
$O(1)$ per query, $O(T)$ total.

## Pitfalls
- Overflow: never compute $n(n+1)$ in 64-bit for $n \sim 10^{18}$.
- Division after reduction: either halve the even factor first or multiply by the modular inverse of 2, $(p+1)/2$.
- n + 1 can be $10^{18} + 1$: still fits in 64 bits.
