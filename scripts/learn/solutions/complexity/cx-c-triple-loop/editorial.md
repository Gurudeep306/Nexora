## Intuition
Every execution of `count++` happens at one triple $(i, j, k)$ with $1 \le i \le j \le k \le n$, and every such triple is visited exactly once. So we are counting non-decreasing triples — multisets of size 3 drawn from $\{1,\dots,n\}$:
$$\left(\!\binom{n}{3}\!\right) = \binom{n+2}{3} = \frac{n(n+1)(n+2)}{6}.$$

## Approach
Print $n(n+1)(n+2)/6$ for each query.

Example $n = 3$: $3\cdot4\cdot5/6 = $ **10** — the triples are 111, 112, 113, 122, 123, 133, 222, 223, 233, 333.

## Why it works
**Bijection (stars and bars).** Map $(i, j, k)$ with $i \le j \le k$ to $(i,\ j+1,\ k+2)$: this is a strictly increasing triple from $\{1, \dots, n+2\}$, and the map is reversible. Hence the count is $\binom{n+2}{3}$.

**Summation check.** The innermost loop runs $n-j+1$ times; summing over $j \ge i$ gives $\binom{n-i+2}{2}$, and $\sum_{i=1}^{n}\binom{n-i+2}{2} = \sum_{m=2}^{n+1}\binom{m}{2} = \binom{n+2}{3}$ by the hockey-stick identity.

The leading term $n^3/6$ is the lesson: the loop nest is $\Theta(n^3)$, but with constant $1/6$, not $1$.

## Complexity
$O(1)$ per query; simulation would be $\Theta(n^3) \approx 10^{18}$ steps.

## Pitfalls
- $n(n+1)(n+2) \approx 8.0\cdot10^{18}$ for $n = 2\cdot10^6$ — it fits in signed 64-bit (max $\approx 9.22\cdot10^{18}$) but **not** if any factor is a 32-bit `int` during multiplication. Cast first.
- Divide at the end (the product of three consecutive integers is always divisible by 6), not term by term with truncation.
- JavaScript numbers are exact only to $2^{53}\approx 9\cdot10^{15}$: use `BigInt`.
