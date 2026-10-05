## Intuition
Summing $k+1$ terms is $\Theta(k)$, and $k$ goes to $10^{18}$. The geometric-series identity
$$1 + r + \dots + r^k = \frac{r^{k+1}-1}{r-1} \qquad (r \ne 1)$$
reduces it to one power and one division. The power costs $O(\log k)$ with fast exponentiation; the division becomes multiplication by a modular inverse.

## Approach
Let $p = 10^9+7$ and $\rho = r \bmod p$.
- If $\rho = 1$: every term is $\equiv 1$, answer $(k+1) \bmod p$.
- Otherwise: answer $(\rho^{k+1} - 1)\cdot(\rho - 1)^{p-2} \bmod p$, using Fermat's little theorem for the inverse.

Example $r=2, k=3$: $(2^4 - 1)/(2-1) = $ **15** $= 1+2+4+8$.

## Why it works
Multiply $S = \sum_{i=0}^k r^i$ by $(r-1)$: the sum telescopes to $r^{k+1}-1$. Modulo prime $p$, $(\rho-1)$ is invertible iff $\rho \ne 1$, and then $(\rho-1)^{-1} = (\rho-1)^{p-2}$. Fast power squares the base and halves the exponent each step, so it uses $\lfloor\log_2(k+1)\rfloor+1$ iterations.

The case test must be on $r \bmod p$, not $r$: for $r = p+1$ we have $\rho = 1$, and the formula would divide by $0$. For $\rho = 0$ ($r=0$ or $r=p$) the formula gives $(0-1)/(0-1) = 1$, which is right since $0^0 = 1$.

## Complexity
$O(\log k + \log p)$ per query — about 90 modular multiplications — versus $\Theta(k)$ for the naive sum.

## Pitfalls
- Check $r \equiv 1 \pmod p$, not $r = 1$ ($r = 10^9+8$ is a test).
- $\rho^{k+1}-1$ can be $-1$: add $p$ before multiplying.
- $k+1$ is up to $10^{18}+1$ — still 64-bit. Each modular product is $< 2^{60}$.
- JavaScript: use `BigInt` for the exponent and products.
