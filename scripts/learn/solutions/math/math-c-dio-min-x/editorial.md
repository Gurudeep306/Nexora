## Intuition
For fixed x, a matching integer y exists exactly when $b \mid c - ax$, that is, when $ax \equiv c \pmod b$. Scanning $x = 0, 1, 2, \dots$ would find the answer within b steps, but b can be $10^9$ and there are $10^4$ queries. Extended Euclid solves the congruence directly.

## Approach
1. Run extended Euclid to get $g = \gcd(a, b)$ and $x'$ with $a x' + b y' = g$.
2. If $g \nmid c$, print `-1`.
3. Otherwise $x' \cdot (c/g)$ is one solution, and all solutions for x are $x_0 + t \cdot m$ with $m = b/g$. The smallest non-negative one is $x = (x' \bmod m)\,((c/g) \bmod m) \bmod m$. Then $y = (c - ax)/b$.

Example: $3x + 5y = 7$. Euclid gives $3 \cdot 2 + 5 \cdot (-1) = 1$, so $x' = 2$, $m = 5$, and $x = 2 \cdot 7 \bmod 5 = 4$. Then $y = (7 - 12)/5 = -1$. Output `4 -1`.

## Why it works
- **Existence**: $g$ divides $ax + by$ for all integers x and y, so $g \nmid c$ means there is no solution. Conversely, Bézout's identity gives a solution scaled by $c/g$.
- **All solutions**: if $(x_1, y_1)$ and $(x_2, y_2)$ both solve it, then $a(x_1 - x_2) = b(y_2 - y_1)$. Dividing by g gives $\tfrac{a}{g}(x_1 - x_2) = \tfrac{b}{g}(y_2 - y_1)$, and since $\gcd(a/g, b/g) = 1$, $m = b/g$ divides $x_1 - x_2$. So the valid x values form exactly one residue class mod m, and its least non-negative member is the reduction we compute.

## Complexity
$O(\log \min(a, b))$ per query, and $O(1)$ memory.

## Pitfalls
- $x' \cdot (c/g)$ can reach $10^9 \cdot 10^{18}$. Reduce **both** factors mod m first, so each is below $10^9$ and the product fits in 64 bits.
- `%` of a negative number is negative in C, C++, Java and JavaScript. Use `((v % m) + m) % m`. c itself may be negative.
- When $m = 1$, every x works and the answer is $x = 0$.
