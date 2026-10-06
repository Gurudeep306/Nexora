## Intuition
Looping over $x = 0..c/a$ can take $10^{18}$ steps. But the solutions of $ax + by = c$ form an arithmetic progression: moving along it, x grows by $b/g$ and y shrinks by $a/g$. Find the end of the progression with the smallest $x \ge 0$. That end has the **largest** y, so we just count how many steps keep y non-negative.

## Approach
1. Run extended Euclid. If $g = \gcd(a, b) \nmid c$, the answer is 0.
2. Let $x_0$ be the least $x \ge 0$ solving the equation (as in *Smallest non-negative x*) and $y_0 = (c - a x_0)/b$.
3. If $y_0 < 0$, the answer is 0. Otherwise the solutions are $(x_0 + t\,b/g,\ y_0 - t\,a/g)$ for $t = 0, 1, \dots, \lfloor y_0 / (a/g) \rfloor$, so the answer is $\lfloor y_0 g / a \rfloor + 1$.

Example: $2x + 3y = 12$. $g = 1$, $x_0 = 0$, $y_0 = 4$ and $a/g = 2$, so the answer is $\lfloor 4/2 \rfloor + 1 = 3$: the pairs $(0,4)$, $(3,2)$ and $(6,0)$.

## Why it works
All integer solutions are $x = x_0 + t\,b/g$, $y = y_0 - t\,a/g$ for $t \in \mathbb{Z}$. The proof is the same divisibility argument: $\tfrac{a}{g}\Delta x = -\tfrac{b}{g}\Delta y$ with coprime coefficients. $x \ge 0$ forces $t \ge 0$, because $x_0$ is the least non-negative x and $x_0 - b/g < 0$. $y \ge 0$ means $t \le y_0 / (a/g)$. The count of integers in $[0, \lfloor y_0 g/a \rfloor]$ is that bound plus one.

## Complexity
$O(\log \min(a, b))$ per query, and $O(1)$ memory.

## Pitfalls
- Reduce mod $b/g$ before multiplying (the same overflow trap as in *Smallest non-negative x*).
- $c = 0$ has exactly one solution, $(0, 0)$.
- The answer can be $10^{18} + 1$ (for $a = b = 1$), which still fits in 64-bit but not in a JS `Number`.
