## Intuition
Divide out the smallest factor and repeat. The first divisor $d \ge 2$ we meet is always prime, because any smaller prime factor of d would have divided n earlier. Dividing it out **completely** gives its exponent. We can stop at $\sqrt{n'}$ of the remaining value, since a leftover with no factor up to its square root is itself prime. That bounds the work at $\sqrt{10^{12}} = 10^6$ steps instead of $10^{12}$.

## Approach
```
for d = 2, 3, 4, ... while d*d <= n:
    if d divides n: count e while dividing n by d; record d^e
if n > 1: record n^1
```
Example: $360$. Dividing by 2 three times leaves 45. Dividing by 3 twice leaves 5. Then $4 \cdot 4 > 5$, so the leftover 5 is prime. Output `2^3 3^2 5^1`.

## Why it works
**Invariant**: when the loop reaches d, the remaining n has no prime factor below d, because each one was divided out completely. So if $d \mid n$, then d is prime, since a composite d would have a prime factor below d that also divides n. When the loop stops, $d^2 > n$ and n has no prime factor below d. If n were composite, its smallest prime factor p would satisfy $p^2 \le n < d^2$, so $p < d$, which contradicts the invariant. Hence the leftover is 1 or a prime. Primes are found in increasing order, so the output is sorted.

## Complexity
$O(\sqrt n)$ per query: at most $10^6$ trial divisions, or 78\,498 if you only try primes from a sieve, which the Python solution does. Dividing out factors adds only $O(\log n)$. Memory is $O(1)$, or $O(\sqrt{N})$ with a sieve.

## Pitfalls
- Re-test `d * d <= n` against the **shrinking** n. That is what makes inputs like $2^{39}$ fast.
- Do not forget the final prime leftover. For $999\,999\,999\,989$ it is the whole number.
- $10^{12}$ needs 64-bit, but JS `Number` is exact here because $10^{12} < 2^{53}$.
