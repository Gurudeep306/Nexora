## Intuition
Every function has the shape $f(n) = p^n \cdot n^a \cdot (\log n)^b$. The three factors live on completely different scales:
- any exponential $p^n$ with $p > 1$ beats every polynomial,
- any polynomial $n^a$ with $a > 0$ beats every power of $\log n$.

So compare the triples $(p, a, b)$ **lexicographically**: the base decides, ties go to the exponent of n, and only then to the exponent of the log.

## Approach
For each pair compare $p_1$ with $p_2$; if equal compare $a_1, a_2$; if equal compare $b_1, b_2$. Print `<`, `>` or `=` accordingly.

Example: $n^2$ vs $n\log^5 n$ is $(1,2,0)$ vs $(1,1,5)$: equal bases, $2 > 1$, so the answer is `>`. And $2^n$ vs $n^{10}\log^{10} n$ is $(2,0,0)$ vs $(1,10,10)$: `>`.

## Why it works
Look at the ratio $f/g = (p_1/p_2)^n \cdot n^{a_1-a_2} \cdot (\log n)^{b_1-b_2}$.
- If $p_1 < p_2$, then $(p_1/p_2)^n = e^{-cn}$ with $c > 0$, and $e^{-cn} n^k (\log n)^m \to 0$ for any fixed k, m (take logs: $-cn + k\ln n + m\ln\ln n \to -\infty$). So $f = o(g)$.
- If $p_1 = p_2$ and $a_1 < a_2$: $n^{-\delta}(\log n)^m \to 0$ for $\delta > 0$, since $\log n$ grows slower than every $n^{\delta/m}$.
- If also $a_1 = a_2$, the ratio is $(\log n)^{b_1-b_2}$: tends to 0, $\infty$, or is exactly 1.

The ratio is never a non-trivial constant except in the last case, so `=` means identical triples.

## Complexity
$O(1)$ per pair, $O(T)$ total.

## Pitfalls
- $p = 1$ means **no** exponential factor ($1^n = 1$): $(1, 0, 3)$ is just $\log^3 n$, which loses to $(1, 1, 0) = n$.
- Do not evaluate the functions at some "large n" numerically: $2^n$ vs $n^{10}$ only crosses near $n \approx 59$, and $\log$ powers cross much later. Overflow and false conclusions follow.
- Large exponents on a smaller class never compensate: $n^{10}$ is still $o(2^n)$.
