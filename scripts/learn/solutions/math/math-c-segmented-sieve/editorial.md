## Intuition
To decide primality in $[L, R]$, the sieve of Eratosthenes only ever crosses out multiples of primes $p \le \sqrt{R}$. With $R \le 10^{12}$, those primes are all at most $10^6$, so they are cheap to find. Their multiples only need to be crossed out **inside the window** of at most $10^6 + 1$ numbers. So we need two small arrays, never one of size $R$.

## Approach
1. A normal sieve up to $\lfloor\sqrt{R}\rfloor$ lists the base primes.
2. Make a boolean array `seg` of length $R - L + 1$, with all entries true. Entry $i$ stands for $L + i$.
3. For each base prime $p$, the first multiple to cross is $s = \max\!\left(p^2,\ \lceil L/p \rceil \cdot p\right)$. Cross out $s, s + p, \dots \le R$.
4. If $L = 1$, cross out 1. Count the remaining trues.

Example: $[100, 200]$. The base primes are $2, 3, 5, 7, 11, 13$. For $p = 7$ the crossing starts at $\lceil 100/7 \rceil \cdot 7 = 105$. After all of them, 21 numbers survive: $101, 103, \dots, 199$.

## Why it works
A composite $v \le R$ has a prime factor $p \le \sqrt v \le \sqrt R$, and $v \ge p^2$. It is also a multiple of $p$ that is at least $\lceil L/p\rceil p$, so it lies in the crossed range for $p$. A prime $v$ is never crossed: its only prime multiple is $v$ itself, and crossing starts at $p^2 > p$, so $p = v$ never crosses $v$. Hence the survivors are exactly the primes in $[L, R]$.

## Complexity
The base sieve is $O(\sqrt R \log\log \sqrt R)$. The window costs $\sum_{p \le \sqrt R} \left(\frac{R - L}{p} + 1\right) = O\big((R - L)\log\log R + \pi(\sqrt R)\big)$. Memory is $O(\sqrt R + (R - L))$. That is about $3 \cdot 10^6$ simple operations, compared with $10^{12}$ for trial division over the window.

## Pitfalls
- **Starting at $\lceil L/p\rceil p$ without the $\max$ with $p^2$** crosses out $p$ itself when $p \in [L, R]$.
- 1 is not prime.
- $L$, $R$ and $p^2$ need 64-bit integers. Index the window by offset, not by value.
