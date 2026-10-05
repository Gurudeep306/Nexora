## Intuition
Testing every $x \le n$ is $\Theta(n)$ with $n = 10^{18}$. But the multiples of $a$ up to $n$ are $a, 2a, \dots, \lfloor n/a\rfloor a$ — there are exactly $\lfloor n/a \rfloor$ of them, computable in $O(1)$. Inclusion–exclusion fixes the double count.

## Approach
$$|A \cup B| = |A| + |B| - |A \cap B| = \left\lfloor\tfrac{n}{a}\right\rfloor + \left\lfloor\tfrac{n}{b}\right\rfloor - \left\lfloor\tfrac{n}{\operatorname{lcm}(a,b)}\right\rfloor,$$
with $\operatorname{lcm}(a,b) = \dfrac{a}{\gcd(a,b)}\cdot b$ (divide first).

Example $n=100, a=4, b=6$: $25 + 16 - \lfloor 100/12\rfloor = 25 + 16 - 8 = $ **33**.

## Why it works
$x$ is divisible by both $a$ and $b$ exactly when it is divisible by $\operatorname{lcm}(a,b)$ (the lcm is the smallest common multiple, and every common multiple is a multiple of it). Those numbers appear in both $\lfloor n/a\rfloor$ and $\lfloor n/b\rfloor$, so subtracting them once counts every qualifying $x$ exactly once.

## Complexity
One gcd per query: $O(\log \min(a,b))$ by Euclid; everything else $O(1)$. Total $O(T\log 10^9)$ — independent of $n$.

## Pitfalls
- $a\cdot b$ can be $10^{18}$; computing `a*b/gcd` is fine here but `a/gcd*b` is the habit that never overflows first.
- The lcm may exceed $n$ (e.g. two large primes): the term is simply $0$.
- $a = b$: lcm $= a$, giving $\lfloor n/a\rfloor$ — no special case needed.
- JavaScript: $n$ needs `BigInt`.
