## Intuition
For $n \ge p$, the factorial $n!$ contains the factor $p$, so $n! \equiv 0$ and the inverse-factorial formula breaks down. Factorials up to $10^{18}$ are also impossible to tabulate. **Lucas' theorem** reduces a huge binomial to small ones: write $n$ and $r$ in base $p$, and
$$\binom{n}{r} \equiv \prod_i \binom{n_i}{r_i} \pmod p,$$
with $\binom{a}{b} = 0$ when $b > a$. Every digit is below $p$, so factorials up to $p - 1$ suffice.

## Approach
1. Precompute $i!$ and $(i!)^{-1}$ modulo $p$ for $0 \le i < p$.
2. Per query, while $n > 0$ or $r > 0$: take digits $a = n \bmod p$ and $b = r \bmod p$. If $b > a$ the answer is 0. Otherwise multiply in $\binom{a}{b}$, then set $n \leftarrow \lfloor n/p \rfloor$ and $r \leftarrow \lfloor r/p \rfloor$.

Example ($p = 7$): $\binom{10}{3}$. Here $10 = (1,3)_7$ and $3 = (0,3)_7$, so the result is $\binom11 \binom33 = 1$. Indeed $120 = 17 \cdot 7 + 1$.

## Why it works
In $\mathbb{F}_p[x]$, $(1 + x)^p = 1 + x^p$, because $p \mid \binom{p}{j}$ for $0 < j < p$. Hence
$$(1+x)^n = \prod_i \big((1+x)^{p^i}\big)^{n_i} = \prod_i (1 + x^{p^i})^{n_i}.$$
Compare the coefficients of $x^r$. On the right, picking $x^{p^i b_i}$ from factor $i$ (with $b_i \le n_i$) gives exponent $\sum b_i p^i$. Since $b_i < p$, base-$p$ representations are unique, so the only choice reaching $x^r$ is $b_i = r_i$, with coefficient $\prod \binom{n_i}{r_i}$. If some $r_i > n_i$, no choice works and the coefficient is $0$. That also covers $r > n$.

## Complexity
$O(p)$ preprocessing and $O(\log_p n)$ per query, at most 60 digits for $p = 2$. Total $O(p + T \log_p n)$.

## Pitfalls
- $r > n$ needs no special case: some digit has $r_i > n_i$.
- Values up to $10^{18}$ need 64-bit integers, and `BigInt` in JavaScript.
- $p$ is at most $10^5$, so products of two residues are below $10^{10}$. Still, reduce after each multiplication.
