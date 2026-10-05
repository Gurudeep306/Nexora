## Intuition
Adding $n$ squares one by one is $\Theta(n)$, and $n$ reaches $10^{18}$. The classical closed form turns it into $O(1)$:
$$\sum_{i=1}^{n} i^2 = \frac{n(n+1)(2n+1)}{6}.$$
The work moves from the loop into the arithmetic: the product is about $2\cdot10^{54}$, and we need it modulo $p = 10^9+7$ **after** an exact division by 6.

## Approach
Keep the three factors $x = n$, $y = n+1$, $z = 2n+1$ (all fit in 64 bits, $z \le 2\cdot10^{18}+1$).
1. Exactly one of $x, y$ is even — halve it.
2. One of $x, y, z$ is divisible by 3 — divide it by 3.
3. Reduce each factor mod $p$ and multiply, reducing after each product.

Example $n = 10$: factors $10, 11, 21$ → $5, 11, 21$ → $5, 11, 7$ → $5\cdot11\cdot7 = $ **385**.

## Why it works
$n$ and $n+1$ are consecutive, so one is even. Modulo 3 the three factors are $n,\ n+1,\ 2n+1 \equiv n, n+1, n+2 \pmod 3$ — three consecutive residues, so one is $0$. Halving does not change divisibility by 3 (2 and 3 are coprime), so both exact divisions succeed and the remaining product is exactly the integer $n(n+1)(2n+1)/6$. Only then do we reduce, using $(abc) \bmod p = ((a \bmod p)(b \bmod p) \bmod p)(c \bmod p) \bmod p$.

Equivalently, multiply by the modular inverse $6^{-1} \bmod p$ — valid because $p$ is prime and does not divide 6.

## Complexity
$O(1)$ per query, $O(T)$ overall. The summation identity is what turns a $\Theta(n)$ loop into constant time.

## Pitfalls
- Overflow: $n(n+1)$ alone is $10^{36}$; never form the raw product in 64-bit.
- Reducing **then** dividing by 6 is wrong — $(n(n+1)(2n+1) \bmod p)$ need not be divisible by 6.
- Two residues below $p$ multiply to less than $2^{60}$: reduce after **every** multiplication, not only at the end.
- JavaScript: parse $n$ with `BigInt`, `Number` loses digits beyond $2^{53}$.
