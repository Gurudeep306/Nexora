## Intuition
A fraction is in lowest terms when the numerator and denominator share no common factor. The largest common factor is $g = \gcd(|p|, |q|)$, and dividing both parts by it removes every shared factor at once. Euclid's algorithm finds g in $O(\log)$ steps. Trying candidate divisors would need up to $10^{18}$.

## Approach
1. $g = \gcd(|p|, |q|)$, using `gcd(a, b) = gcd(b, a mod b)` until $b = 0$.
2. $p \leftarrow p / g$ and $q \leftarrow q / g$. These are exact divisions.
3. If $q < 0$, negate both.

Example: $-10 / -4$. Here $g = 2$, which gives $-5 / -2$, and flipping the signs gives `5/2`. For $0 / -5$: $g = \gcd(0, 5) = 5$, which gives $0 / -1$, and the sign flip gives `0/1`.

## Why it works
After dividing by g, $\gcd(|p|/g, |q|/g) = 1$, since any common divisor $d > 1$ would make $dg$ a larger common divisor of $p$ and $q$. Dividing both parts by the same non-zero number, or negating both, leaves the value unchanged. The representation with $q > 0$ and coprime parts is unique, so the output is well defined. Euclid is correct because every common divisor of a and b also divides $a - \lfloor a/b \rfloor b = a \bmod b$, and the reverse holds too.

## Complexity
$O(\log \min(|p|, |q|))$ per query (Lamé's theorem). Memory is $O(1)$.

## Pitfalls
- $10^{18} > 2^{53}$: JavaScript needs `BigInt`.
- `gcd(0, q)` must be $|q|$, giving `0/1` rather than `0/-1` or a division by zero.
- Take absolute values before running gcd. A C `%` with negative operands gives a negative result.
