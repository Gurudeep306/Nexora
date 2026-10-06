## Intuition
Testing $\gcd(x, m)$ for every $x \le n$ costs $O(n \log m)$, which is hopeless for $n = 10^{12}$. Turn the question around: x is **not** coprime to m exactly when some prime $p \mid m$ also divides x. Only the **distinct** primes of m matter, and since $2 \cdot 3 \cdot 5 \cdots 29 > 10^9$, there are at most 9 of them. Counting multiples is easy ($\lfloor n/d \rfloor$), so this is an inclusion–exclusion problem.

## Approach
1. Factor m by trial division up to $\sqrt m$ and keep its distinct primes $p_1, \dots, p_r$.
2. For every subset S of those primes, let $d_S = \prod_{p \in S} p$ and add $(-1)^{|S|} \lfloor n / d_S \rfloor$. The empty subset contributes n.

Example: $n = 100$, $m = 30 = 2 \cdot 3 \cdot 5$:
$$100 - (50 + 33 + 20) + (16 + 10 + 6) - 3 = 26.$$

## Why it works
Let $A_i$ be the set of $x \le n$ divisible by $p_i$. Since the $p_i$ are distinct primes, $\bigcap_{i \in S} A_i$ is the set of multiples of $d_S$, which has $\lfloor n/d_S \rfloor$ elements. Inclusion–exclusion gives $|A_1 \cup \dots \cup A_r|$, and the answer is $n$ minus that union. That is exactly the alternating sum above. A number divisible by j of the primes is counted $\sum_{i=0}^{j} (-1)^i \binom{j}{i} = [j = 0]$ times, so it is counted once if it is coprime to m and zero times otherwise.

## Complexity
Per query: $O(\sqrt m)$ to factor and $O(2^r \cdot r)$ with $r \le 9$ for the sum. With $T \le 100$ that is about $1.6 \cdot 10^6$ trial divisions in total.

## Pitfalls
- Use **distinct** primes. With $m = 12$, use $\{2, 3\}$, not $\{2, 2, 3\}$.
- Keep the leftover factor after trial division: if $m > 1$ remains, it is a prime.
- $m = 1$ has no primes, so every x is coprime and the answer is n.
- n needs 64-bit integers.

## Related
This is Euler's $\varphi$ generalised to a prefix $[1, n]$. When $n = m$ it equals $\varphi(m)$.
