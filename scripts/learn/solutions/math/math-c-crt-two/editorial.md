## Intuition
Every solution of the first congruence has the form $x = a_1 + m_1 k$. Substituting into the second gives one linear congruence in $k$:
$$m_1 k \equiv a_2 - a_1 \pmod{m_2}.$$
Scanning $k$ is too slow ($m_2$ up to $10^9$, with $10^5$ queries), but a linear congruence is solved with one modular inverse.

## Approach
Let $g = \gcd(m_1, m_2)$ and $d = (a_2 - a_1) \bmod m_2$.
1. If $g \nmid d$, print $-1$.
2. Otherwise divide by $g$: $\frac{m_1}{g} k \equiv \frac{d}{g} \pmod{\frac{m_2}{g}}$. Now $\gcd(m_1/g, m_2/g) = 1$, so
$$k = \frac dg \cdot \left(\frac{m_1}{g}\right)^{-1} \bmod \frac{m_2}{g}.$$
3. Print $x = a_1 + m_1 k$.

Example: $x \equiv 1 \pmod 4$ and $x \equiv 3 \pmod 6$. Here $g = 2$, $d = 2$, so $2k \equiv 1 \pmod 3$ and $k = 2$, giving $x = 9$. With $a_2 = 2$ instead, $d = 1$ is odd and the answer is $-1$.

## Why it works
$g \mid m_1$ and $g \mid m_2$, so any solution forces $a_1 \equiv x \equiv a_2 \pmod g$. That is the necessary condition $g \mid d$. When it holds, $k$ is unique modulo $m_2/g$, so the solutions are $x \equiv a_1 + m_1 k \pmod{m_1 m_2 / g}$, one class modulo $\operatorname{lcm}$. Taking $k \in [0, m_2/g)$ gives $0 \le x \le a_1 + m_1(m_2/g - 1) < \operatorname{lcm}$. This is the smallest non-negative member of the class.

## Complexity
$O(\log m)$ per query for the gcd and the extended-Euclid inverse. $O(1)$ memory.

## Pitfalls
- The moduli are not coprime. Textbook CRT ($M_i = M / m_i$) silently produces garbage here.
- $x$ can be close to $10^{18}$. In JavaScript, build it with `BigInt`. In C, C++ and Java, $m_1 k < 10^{18}$ fits in 64 bits.
- $(d/g) \cdot \text{inv}$ is a product of two numbers below $10^9$. Reduce it modulo $m_2/g$ (that modulus may be 1).
