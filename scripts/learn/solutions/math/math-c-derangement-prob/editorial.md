## Intuition
A hand-back with no guest getting their own hat is a **derangement**. The probability is $D_n / n!$, where $D_n$ is the number of derangements. Let $A_i$ be the event "guest i gets their own hat". The intersection of any i of these events leaves $(n-i)!$ orders, so inclusion–exclusion gives
$$D_n = \sum_{i=0}^{n} (-1)^i \binom{n}{i}(n-i)! = n! \sum_{i=0}^{n} \frac{(-1)^i}{i!}.$$
Enumerating permutations is hopeless, and recomputing an $O(n)$ sum for each of $10^4$ queries with n up to $10^6$ is $10^{10}$ work. Precompute instead.

## Approach
Use the recurrence $D_0 = 1$, $D_n = n \cdot D_{n-1} + (-1)^n$, which follows from the sum above. Fill $D_n$ and $n!$ modulo $p$ up to the largest queried n in one pass. Answer each query with $D_n \cdot (n!)^{-1}$, using one modular exponentiation for the inverse.

Example: $D_1 = 0$, $D_2 = 1$, $D_3 = 2$, $D_4 = 9$. For $n = 3$ the probability is $2/6 = 1/3$, printed as $333333336$.

## Why it works
Multiply the sum for $D_{n-1}$ by n:
$$n D_{n-1} = n! \sum_{i=0}^{n-1} \frac{(-1)^i}{i!} = D_n - n! \frac{(-1)^n}{n!} = D_n - (-1)^n.$$
The answer is the fraction $D_n / n!$, and since $n! < p$ is never divisible by p for $n \le 10^6$, the modular inverse exists. Reducing $D_n / n!$ to lowest terms first gives the same residue.

## Complexity
$O(N)$ precomputation for $N = \max n$, plus $O(\log p)$ per query. Memory $O(N)$.

## Pitfalls
- Add $-1$ as $p - 1$, so values stay non-negative.
- $n = 1$ gives probability 0.
- The probability tends to $1/e$, but the judge wants the exact fraction modulo p, not a float.
