## Intuition
The number of records is a messy random variable, but it is a **sum of indicators**: $R = \sum_{i=1}^n X_i$ where $X_i = 1$ if position i holds a record. Linearity of expectation gives $E[R] = \sum_i \Pr[X_i = 1]$ — no independence needed, so we never have to reason about how records interact.

## Approach
Position i is a record iff it holds the maximum of the first i elements. In a uniform permutation, those first i values are in uniformly random relative order, so the maximum is at each of the i positions with probability $1/i$. Hence
$$E[R] = \sum_{i=1}^n \frac{1}{i} = H_n.$$
Output $H_n \bmod p$: precompute $\mathrm{inv}[i]$ for $i \le \max n$ by the linear recurrence, take prefix sums $H[i] = H[i-1] + \mathrm{inv}[i]$, and answer each query by lookup.

Example n = 3: $1 + \tfrac12 + \tfrac13 = \tfrac{11}{6}$. Check: the 6 permutations have 3, 2, 2, 2, 1, 1 records (for 123, 132, 213, 231, 312, 321) — total 11. Printed as $11 \cdot 6^{-1} \bmod p = 833333342$.

## Why it works
Linearity holds for any random variables. The probability $1/i$ follows from symmetry: every relative order of the first i values is equally likely. The modular recurrence is correct because $p = \lfloor p/i \rfloor \cdot i + (p \bmod i)$, so $i \cdot (-\lfloor p/i \rfloor \cdot \mathrm{inv}[p \bmod i]) \equiv 1 \pmod p$.

## Complexity
$O(N + T)$ time and $O(N)$ memory, with $N = \max n \le 10^6$. This is the expected-analysis lesson: $H_n = \ln n + O(1)$, so a random permutation has only $\Theta(\log n)$ records — the reason "update the running maximum" is executed only $O(\log n)$ times in expectation.

## Pitfalls

- $H_n$ is a fraction: never use floating point. Work modulo $p = 10^9+7$ with modular inverses.
- Computing each inverse by Fermat is $O(\log p)$; with $10^6$ of them that is still fine, but the linear recurrence $\mathrm{inv}[i] = -\lfloor p/i \rfloor \cdot \mathrm{inv}[p \bmod i]$ is simpler and faster. Keep it non-negative: use $p - \lfloor p/i \rfloor \cdot \mathrm{inv}[p \bmod i] \bmod p$.
- Products of two residues are up to $\approx 10^{18}$: 64-bit in C/Java, BigInt or split multiplication in JS (Numbers are exact only to $2^{53}$).
- Precompute once, answer each query by lookup — recomputing per query is $O(Tn)$.
