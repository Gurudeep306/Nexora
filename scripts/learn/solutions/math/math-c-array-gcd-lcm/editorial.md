## Intuition
gcd and lcm are associative: $\gcd(a, b, c) = \gcd(\gcd(a, b), c)$, and the same holds for lcm. So fold the array left to right. The only danger is size. The lcm of 30 numbers up to $10^9$ can have hundreds of digits, so we must notice the moment it passes $10^{18}$ **without** computing the overflowing product.

## Approach
Start from $g = 0$ (since $\gcd(0, x) = x$) and $l = 1$. For each x:
- $g \leftarrow \gcd(g, x)$.
- $l' = l / \gcd(l, x)$, an exact division. If $l' > \lfloor 10^{18} / x \rfloor$, the new lcm exceeds the cap: mark it as overflowed and stop updating. Otherwise $l \leftarrow l' \cdot x$.

Example: `4 6 10`. The gcd folds as $4, 2, 2$. The lcm folds as $4$, then $4/2 \cdot 6 = 12$, then $12/2 \cdot 10 = 60$. Output `2` and `60`.

## Why it works
$\operatorname{lcm}(l, x) = l x / \gcd(l, x)$, and $\gcd(l, x)$ divides $l$, so $l / \gcd(l, x)$ is an integer and the order of operations is exact. For positive integers, $l' x > C \iff l' > \lfloor C / x \rfloor$, because $l' x \le C \iff l' \le C/x \iff l' \le \lfloor C/x \rfloor$. Every prefix lcm divides the next one, so the sequence never decreases. After it passes the cap it stays above it, and printing `-1` is correct.

## Complexity
$O(n \log V)$ for the gcd calls, with $V = 10^{18}$. Memory is $O(1)$.

## Pitfalls
- `l * x / gcd(l, x)` overflows long before the final lcm does. Divide first.
- Test against the cap **before** multiplying. After the overflow happens, the wrapped value is garbage.
- JavaScript: $l$ can be up to $10^{18}$, so use BigInt for the lcm.
