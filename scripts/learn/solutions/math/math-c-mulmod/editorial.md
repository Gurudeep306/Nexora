## Intuition
Reducing $a$ and $b$ below $m$ is not enough when $m$ is near $10^{18}$: the product can reach $10^{36}$, about 120 bits. Two fixes keep everything exact:
- Use a **128-bit** product (`__int128` in C and C++, `BigInt` in JavaScript, plain `int` in Python).
- **Double-and-add** ("Russian peasant" multiplication). It is fast power with $+$ in place of $\times$, so it only ever adds two numbers below $m$.

## Approach
1. Normalise: $a \leftarrow ((a \bmod m) + m) \bmod m$, and the same for $b$.
2. Multiply:
   - with 128 bits, compute `(__int128)a * b % m` directly;
   - with double-and-add, set $r = 0$, then for each bit of $b$ from the lowest: if the bit is set, $r \leftarrow (r + a) \bmod m$; then $a \leftarrow 2a \bmod m$.

Example: $a = -7$, $b = 3$, $m = 10$. Normalising gives $a = 3$. Then $3 \cdot 3 = 9$, so the answer is $9$, and indeed $-21 = -3 \cdot 10 + 9$.

## Why it works
Write $b = \sum_i b_i 2^i$. After processing bit $i$, the doubled value is $a \cdot 2^{i+1} \bmod m$, and $r \equiv a \sum_{j \le i} b_j 2^j$. At the end, $r \equiv ab \pmod m$. Every addition has both operands below $m \le 10^{18}$, so the sum is below $2 \cdot 10^{18} < 2^{63} \approx 9.22 \cdot 10^{18}$, and no step overflows.

## Complexity
$O(1)$ per query with 128-bit arithmetic, or $O(\log m) \approx 60$ steps with double-and-add. Either way that is $O(Q \log m)$ at worst, which is trivial.

## Pitfalls
- `a % m` is negative for negative $a$ in C, C++, Java and JavaScript.
- $m = 1$: every answer is 0.
- `(a * b) % m` in `long long` silently overflows and gives garbage.
- In JavaScript, `Number` cannot represent $10^{18}$ exactly. Parse with `BigInt`.
