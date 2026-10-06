## Intuition
Trying every $x \in [0, m)$ costs up to $10^9$ steps per query. We need a certificate instead of a search. Bézout's identity gives one: the extended Euclidean algorithm finds integers $s, t$ with
$$a s + m t = \gcd(a, m).$$
If the gcd is 1, reducing modulo $m$ gives $a s \equiv 1 \pmod m$, so $s$ is the inverse. If the gcd is $g > 1$, no inverse exists, because $a x - 1$ would have to be a multiple of $m$, and therefore of $g$, while $g \mid a x$ forces $g \mid 1$.

Fermat's $a^{m-2}$ only works for prime $m$, and $m$ here is arbitrary.

## Approach
Run Euclid on $(a \bmod m, m)$ and carry the coefficient of $a$ along:
- keep pairs $(r_0, s_0) = (a, 1)$ and $(r_1, s_1) = (m, 0)$, with the invariant $r_i \equiv a s_i \pmod m$;
- while $r_1 \ne 0$: $q = \lfloor r_0 / r_1 \rfloor$, then $(r_0, r_1) \leftarrow (r_1, r_0 - q r_1)$ and $(s_0, s_1) \leftarrow (s_1, s_0 - q s_1)$.

At the end $r_0 = \gcd(a, m)$. Print $-1$ if $r_0 \ne 1$, otherwise $s_0$ normalised into $[0, m)$.

Example: $a = 10, m = 17$. The remainders run $10, 17, 10, 7, 3, 1, 0$, and the coefficient of $10$ reaches $s_0 = -5$. Then $-5 \bmod 17 = 12$, and indeed $10 \cdot 12 = 120 = 7 \cdot 17 + 1$.

## Why it works
Each new remainder is an integer combination of the previous two, and the $s$ values follow the same combination, so $r_i \equiv a s_i \pmod m$ holds at every step. Euclid ends with $r_0 = \gcd(a, m)$. The inverse is unique modulo $m$: if $a x \equiv a y \equiv 1$, multiply $a(x - y) \equiv 0$ by $x$ to get $x - y \equiv 0$. So "smallest in $[0, m)$" is well defined.

For $m = 1$, everything is $\equiv 0 \equiv 1$. The algorithm returns $s_0 \bmod 1 = 0$, as required.

## Complexity
$O(\log m)$ per query, since the remainders shrink at least as fast as Fibonacci numbers in reverse. Total $O(T \log m)$ time, $O(1)$ extra space. The coefficients satisfy $|s_i| \le m$, so 64-bit integers never overflow.

## Pitfalls
- $a = 0$ has no inverse unless $m = 1$.
- $s_0$ is often negative. In C, C++, Java and JS, `%` keeps the sign, so use `((s % m) + m) % m`.
- Do not use $a^{m-2}$: it is wrong whenever $m$ is not prime.
