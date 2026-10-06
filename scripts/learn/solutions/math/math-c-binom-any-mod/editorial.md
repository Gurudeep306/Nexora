## Intuition
Moving along row $n$ of Pascal's triangle is easy over the integers:
$$\binom{n}{k} = \binom{n}{k-1} \cdot \frac{n - k + 1}{k}.$$
Modulo a composite $m$, the division by $k$ is the problem: $k$ may share primes with $m$, and then no inverse exists. The fix is to keep apart what cannot be inverted. Every number factors as (primes of $m$) × (a part coprime to $m$). Track the first as **exponents**, an exact integer bookkeeping, and the second as a residue mod $m$, which *is* invertible.

## Approach
1. Factor $m = \prod_j p_j^{e_j}$ by trial division up to $\sqrt m$, with at most 9 distinct primes.
2. Keep $u$ (a unit mod $m$) and exponents $c_j$, so that $\binom nk = u \cdot \prod_j p_j^{c_j}$ as a "formal" value. Start at $k = 0$ with $u = 1$ and $c = 0$.
3. For $k = 1..n$: strip each $p_j$ from $a = n - k + 1$ (adding to $c_j$) and from $b = k$ (subtracting from $c_j$). Then $u \leftarrow u \cdot a \cdot b^{-1} \bmod m$, with $b^{-1}$ from extended Euclid. Record $u_k$ and $c_{j,k}$.
4. Query $k$: $u_k \cdot \prod_j p_j^{c_{j,k}} \bmod m$.

Example: $n = 10$, $m = 12 = 2^2 \cdot 3$. At $k = 3$ the factors are $10 \to (5; 2^1)$, $9 \to (1; 3^2)$ and $8 \to (1; 2^3)$ over $1, 2 \to (1; 2^1)$ and $3 \to (1; 3^1)$. That gives $u = 5$ with exponents $2^{4-1} 3^{2-1}$, so $5 \cdot 8 \cdot 3 = 120 \equiv 0 \pmod{12}$.

## Why it works
Over the integers, $\binom nk = \prod_{i=1}^{k} \frac{n-i+1}{i}$. Factor each term as $p$-part × coprime part, $t = t' \prod_j p_j^{v_j(t)}$. Then
$$\binom nk = \frac{\prod a_i'}{\prod b_i'} \prod_j p_j^{\sum v_j(a_i) - \sum v_j(b_i)}.$$
The exponent here is $v_j(\binom nk) \ge 0$, so it is an honest integer power. The fraction $\prod a'_i / \prod b'_i$ is an integer coprime to $m$, and its residue equals $\prod a'_i \cdot (\prod b'_i)^{-1} \bmod m$, since the $b'_i$ are units mod $m$. Multiplying the two parts gives $\binom nk \bmod m$ exactly.

## Complexity
Each step strips at most $\omega(m) \le 9$ primes ($O(\log n)$ divisions in total per number) and runs one $O(\log m)$ inverse. So the row costs $O(n(\omega + \log m))$ and each query $O(\omega \log n)$. Pascal's rule would be $\Theta(n^2) = 4 \cdot 10^{10}$.

## Pitfalls
- Keep the prime parts as exponents. Folding $p_j$ into the residue too early makes the later division by $k$ impossible. The exponents are always $\ge 0$ at a recorded $k$, because they equal $v_{p_j}\binom nk$.
- $m = 1$: everything is 0. Start from $u = 1 \bmod m$.
- Do not divide residues by a factor that shares a prime with $m$, or apply Fermat with a composite $m$.
- In JavaScript, $u \cdot a$ can reach $10^{18}$. Use a split multiplication.
