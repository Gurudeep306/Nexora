## Intuition
Without the rock, a path is a sequence of $n - 1$ downs and $m - 1$ rights in some order, so there are $\binom{n + m - 2}{n - 1}$ paths. With the rock, count the complement: bad paths are exactly those that **pass through** $(x, y)$. Each of them splits uniquely into a path to the rock and a path from the rock.

## Approach
With factorials and inverse factorials up to $2 \cdot 10^6$:
$$\text{ans} = \binom{n+m-2}{n-1} - \binom{x+y-2}{x-1} \cdot \binom{(n-x)+(m-y)}{n-x} \pmod p.$$

Example: $3 \times 3$ with the rock in the centre. All paths number $\binom{4}{2} = 6$. Paths through the centre number $\binom{2}{1} \cdot \binom{2}{1} = 4$, so the answer is $2$: along the top edge then down, or down the left edge then right.

## Why it works
A monotone path is fixed by the positions of its $n - 1$ down-moves among its $n + m - 2$ moves. That bijection gives the total.

A path visits $(x, y)$ at most once, since coordinates never decrease and the path moves every step. If it does visit, cutting there gives a pair (path $(1,1) \to (x,y)$, path $(x,y) \to (n,m)$), and every such pair glues back into one path through the rock. The first part makes $x - 1$ downs among $x + y - 2$ moves, and the second makes $n - x$ downs among $(n - x) + (m - y)$ moves. By the product rule, the paths through the rock number exactly the product, and subtracting it leaves the paths that avoid it.

## Complexity
$O(N)$ preprocessing with $N = 2 \cdot 10^6$, and $O(1)$ per query, against $\Theta(nm)$ for the grid DP.

## Pitfalls
- Subtraction modulo $p$ can go negative. Add $p$ before taking `%`.
- The table must reach $n + m - 2 \approx 2 \cdot 10^6$, not $10^6$.
- On a one-row or one-column grid, any rock not at an endpoint blocks everything, and the formula correctly gives $1 - 1 = 0$.
