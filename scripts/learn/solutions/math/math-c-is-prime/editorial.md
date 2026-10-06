## Intuition
By definition, n is prime when no d with $1 < d < n$ divides it. Checking all of them costs up to $10^9$ divisions per query. But divisors come in pairs, $d \cdot (n/d) = n$, and the smaller one of each pair is at most $\sqrt n$. So we only need to look below $\sqrt n \approx 31\,623$.

## Approach
1. If $n < 2$, print NO. If n is even, it is prime only when $n = 2$.
2. Try $d = 3, 5, 7, \dots$ while $d \cdot d \le n$. If any d divides n, print NO.
3. If none does, print YES.

Example: $n = 961$. The odd numbers $3, 5, \dots, 29$ fail, and $31 \cdot 31 = 961$ divides it, so NO. For $n = 997$, every odd $d \le 31$ fails and $33^2 > 997$, so YES.

## Why it works
If n is composite, $n = d e$ with $1 < d \le e < n$. Then $d^2 \le de = n$, so $d \le \sqrt n$ and the loop finds d or a smaller divisor of n. If no $d \le \sqrt n$ divides n, then n has no proper factorisation, so it is prime. Skipping even d is safe once we know n is odd.

## Complexity
$O(\sqrt n)$ per query, about $1.6 \cdot 10^4$ iterations at worst, or $1.6 \cdot 10^6$ for 100 queries. Memory is $O(1)$.

## Pitfalls
- 1 is not prime, and 2 is the only even prime.
- Loop on `d * d <= n` instead of `d <= sqrt(n)`. A floating-point square root can round below the true root of a perfect square, such as $31\,601^2$.
- Use 64-bit for `d * d` if you raise the limits.
