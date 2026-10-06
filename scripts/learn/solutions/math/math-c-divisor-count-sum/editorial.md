## Intuition
Every divisor of $n = p_1^{e_1} \cdots p_k^{e_k}$ has the form $p_1^{f_1} \cdots p_k^{f_k}$ with $0 \le f_i \le e_i$, and different exponent choices give different divisors (unique factorisation). So divisors are just independent choices per prime, and both counting and summing them factor into a product over primes. All we need is the factorisation, and trial division finds it in $O(\sqrt n) = 10^6$ steps.

## Approach
1. For $d = 2, 3, 5, 7, \dots$ (2, then odd numbers) while $d^2 \le n$: if $d \mid n$, divide it out completely, counting the exponent $e$.
2. Whatever is left above 1 is a prime with exponent 1.
3. Return $d(n) = \prod (e_i + 1)$ and $\sigma(n) = \prod (1 + p_i + \dots + p_i^{e_i})$.

Example: $12 = 2^2 \cdot 3$. Then $d = 3 \cdot 2 = 6$ and $\sigma = (1 + 2 + 4)(1 + 3) = 28$. Check: $1 + 2 + 3 + 4 + 6 + 12 = 28$.

## Why it works
Expanding $\prod_i (1 + p_i + \dots + p_i^{e_i})$ produces each product $\prod p_i^{f_i}$ exactly once, which is each divisor exactly once. Replacing every term by 1 counts them. For the trial division: when $d$ is tested, all smaller primes are already divided out, so a $d$ that divides the remaining $n$ is prime. If the remainder $m$ has no factor $d \le \sqrt m$, then $m$ is 1 or a prime.

## Complexity
$O(\sqrt n)$ divisions, about $5 \cdot 10^5$ after skipping even numbers, and $O(1)$ memory. Looping over all $d \le n$ would take $10^{12}$ steps.

## Pitfalls
- Forgetting the final leftover prime, for example $n = 2p$ with $p$ large.
- $n = 1$: the answer is `1 1`.
- $d \cdot d$ must be computed in 64-bit.
- $\sigma(n)$ can exceed $2^{32}$. For $n \le 10^{12}$ it stays below $5 \cdot 10^{12}$, so it fits in 64 bits and in a JavaScript `Number`.
