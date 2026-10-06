## Intuition
$b^c$ with $b, c \le 10^{18}$ is far too large to write down. But for a prime $p$ and $a \not\equiv 0$, Fermat says $a^{p-1} \equiv 1 \pmod p$. So the powers of $a$ repeat with period dividing $p - 1$, and only the exponent **mod $p - 1$** matters. That inner residue is an ordinary fast power.

## Approach
Let $p = 10^9 + 7$ and $r = a \bmod p$.
1. If $r = 0$: the answer is $0^{E}$ for $E = b^c$. That is $1$ when $E = 0$, which happens exactly when $b = 0$ and $c > 0$, and $0$ otherwise.
2. Otherwise compute $x = b^c \bmod (p - 1)$ by fast power, then answer $r^x \bmod p$ by fast power.

Example: $(2, 3, 2)$ gives $3^2 = 9$ and $2^9 = 512$. And $(5, p - 1, 1)$: the exponent is $\equiv 0$, so the answer is $5^0 = 1$.

## Why it works
Write $E = q(p - 1) + x$. Then $r^E = (r^{p-1})^q \, r^x \equiv r^x$. This is valid even when $x = 0$ and $E > 0$, because $r^{p-1} \equiv 1$ as well. Fast power computes $x$ correctly mod $p - 1$, which is not prime, but square-and-multiply needs no inverses. When $p \mid a$, $a^E \equiv 0$ for every $E \ge 1$, and $a^0 = 1$. The exponent $b^c$ is 0 only if $b = 0$ and $c \ge 1$, because $0^0 = 1$ by convention.

## Complexity
Two fast powers per query: $O(\log c + \log p)$ multiplications, about 90, with $O(1)$ memory.

## Pitfalls
- Reducing the exponent mod $p$ instead of $p - 1$.
- **$a \equiv 0 \pmod p$ breaks Fermat.** Reducing the exponent gives $x = 0$ and a wrong answer of 1 for $(p, p - 1, 1)$, whose true value is 0.
- The $0^0$ conventions: $(0, 0, 0) \to 0^{1} = 0$, while $(0, 0, 5) \to 0^0 = 1$.
- Inputs up to $10^{18}$ fit in signed 64-bit integers but not in a JavaScript `Number`. Read them as `BigInt` and reduce.
