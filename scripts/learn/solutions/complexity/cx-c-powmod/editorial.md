## Intuition
Multiplying a by itself b times is $\Theta(b)$ — with $b = 10^{18}$ that would take centuries. **Binary exponentiation** uses the binary digits of b:
$$a^b = \begin{cases} (a^{b/2})^2 & b \text{ even} \\ a\cdot a^{b-1} & b \text{ odd}\end{cases}$$
so the exponent halves every two steps: $O(\log b)$ multiplications, about 60.

## Approach
`result = 1 mod m`, `base = a mod m`. While b > 0: if b is odd, `result = result·base mod m`; `base = base² mod m`; `b //= 2`.

Example $2^{10} \bmod 1000$: 10 = 1010₂ → result picks up $2^2$ and $2^8$: 4 · 256 = 1024 → **24**.

## Why it works
Write $b = \sum_k b_k 2^k$. Then $a^b = \prod_{k: b_k = 1} a^{2^k}$. In iteration k, `base` equals $a^{2^k} \bmod m$ (it is squared each time), and it is multiplied into `result` exactly when bit k of b is 1. Reducing mod m after each multiplication keeps numbers small without changing the residue.

## Complexity
$O(\log b)$ multiplications per query.

## Pitfalls
- `result = 1 % m`, not 1: when m = 1 the answer is 0.
- $0^0 = 1$ by convention (the loop never runs).
- Residues are below $10^9$, so products stay below $10^{18}$: 64-bit is enough. In JavaScript use BigInt.
