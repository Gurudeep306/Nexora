## Intuition
Adding fractions exactly means using common denominators that grow with every term, so overflow is immediate. The modular trick is that a fraction $a/b$ has a value $a \cdot b^{-1}$ in $\mathbb{Z}_p$, and these values **add like the fractions do**. So every term is reduced on its own and the residues are summed.

## Approach
1. For each fraction, compute $b^{-1} = b^{p-2} \bmod p$ by fast exponentiation (Fermat; $p$ is prime and $1 \le b < p$).
2. Bring $a$ into $[0, p)$ with $((a \bmod p) + p) \bmod p$.
3. Add $a \cdot b^{-1}$ to a running total modulo $p$.

Example: $\tfrac12 + \tfrac13 + \tfrac16 = 1$. Mod $p$ we get $500000004 + 333333336 + 166666668 = 1000000008 \equiv 1$.

## Why it works
Let $\varphi(a/b) = a b^{-1} \bmod p$ for $p \nmid b$. It is well defined: if $a/b = c/d$ then $ad = bc$, so $a b^{-1} = c d^{-1}$. It is additive:
$$\varphi\!\left(\tfrac ab + \tfrac cd\right) = (ad + bc)(bd)^{-1} = a b^{-1} + c d^{-1}.$$
Hence $\sum \varphi(a_i / b_i) = \varphi(P/Q)$, and $\varphi(P/Q)$ is the unique $r$ with $Q r \equiv P$. That is exactly the requested output. Reducing to lowest terms changes nothing, because $\varphi$ ignores the representation.

## Complexity
$O(n \log p)$ time (one 30-step power per fraction) and $O(1)$ extra memory.

## Pitfalls
- Negative numerators: `-1 % p` is $-1$ in C, C++, Java and JS. Normalise before multiplying.
- Products of two residues reach $10^{18}$. Use 64-bit, or a split multiplication in JavaScript.
- Never divide residues with `/`. Integer division is not modular division.
