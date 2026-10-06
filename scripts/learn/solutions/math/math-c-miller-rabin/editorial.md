## Intuition
Trial division to $\sqrt{4 \cdot 10^{18}} = 2 \cdot 10^9$ is hopeless. Fermat's little theorem gives a fast **necessary** condition: if n is prime then $a^{n-1} \equiv 1 \pmod n$. Carmichael numbers such as 561 pass it for every base coprime to them. Miller–Rabin adds one more fact about primes: **the only square roots of 1 mod a prime are $\pm 1$**. That catches every composite, provided we use enough bases.

## Approach
Write $n - 1 = d \cdot 2^r$ with d odd. For each base $a \in \{2, 3, 5, \dots, 37\}$:
1. $x = a^d \bmod n$. If $x = 1$ or $x = n - 1$, the base passes.
2. Otherwise square up to $r - 1$ times. If $x$ becomes $n - 1$, the base passes.
3. If neither happens, n is **composite**.

If every base passes, n is prime. Handle small n and multiples of the bases first.

Example: $n = 561 = 3 \cdot 11 \cdot 17$, so $560 = 35 \cdot 2^4$. For $a = 2$, $2^{35} \equiv 263$. Squaring gives $166$, then $67$, then $1$. We reached 1 without passing through $-1 = 560$, so 67 is a non-trivial square root of 1, and 561 is composite.

## Why it works
If n is an odd prime, $\mathbb{Z}_n$ is a field, so $x^2 \equiv 1 \Rightarrow (x - 1)(x + 1) \equiv 0 \Rightarrow x \equiv \pm 1$. The sequence $a^d, a^{2d}, \dots, a^{2^r d} = a^{n-1} \equiv 1$ therefore either starts at 1 or contains $-1$ just before the first 1. A base that breaks this pattern proves n composite. It has been verified that for $n < 3.3 \cdot 10^{24}$, no composite passes all twelve prime bases up to 37. So the test is **deterministic** here, with no randomness.

## Complexity
Each base costs $O(\log n)$ modular multiplications, so a query costs $12 \cdot O(\log n) \approx 12 \cdot 124$ mulmods. Memory is $O(1)$.

## Pitfalls
- $a \cdot b \bmod n$ with $n \approx 4 \cdot 10^{18}$ overflows 64 bits. Use `__int128` in C and C++, BigInt in JavaScript, or an overflow-free add-and-double loop in Java (safe because $2n < 2^{63}$).
- Fewer bases are not enough. 3825123056546413051 fools every prime base up to 23.
- When $n$ equals a base, it is prime. Do not report it composite because $a \bmod n = 0$.
