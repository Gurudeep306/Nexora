## Intuition
Split the process into **phases**: phase k (for $k = 0, \dots, n-1$) starts when you own k distinct types and ends when you get a new one. Within phase k each box is new with probability $(n-k)/n$, independently, so the phase length is geometric with mean $n/(n-k)$. The total is the sum of the phase lengths, and linearity of expectation adds their means.

## Approach
$$E[\text{boxes}] = \sum_{k=0}^{n-1} \frac{n}{n-k} = n \sum_{j=1}^{n} \frac{1}{j} = n H_n.$$
Precompute modular inverses of $1..\max n$ with the linear recurrence, prefix-sum them into $H$, and answer each query as $n \cdot H[n] \bmod p$.

Example n = 2: the first box is always new; then each box is new with probability 1/2, taking 2 boxes on average: $1 + 2 = 3 = 2 \cdot (1 + \tfrac12)$. For n = 3: $3 \cdot \tfrac{11}{6} = \tfrac{11}{2}$, printed as $11 \cdot 2^{-1} \bmod p = 500000009$.

## Why it works
A geometric variable with success probability s has mean $1/s$: $E = s \cdot 1 + (1-s)(1 + E)$ gives $E = 1/s$. With $s = (n-k)/n$ the phase mean is $n/(n-k)$. Linearity needs no independence between phases, though they happen to be independent anyway. Reindexing $j = n - k$ turns the sum into $nH_n$.

## Complexity
$O(N + T)$ time, $O(N)$ memory, $N = \max n \le 10^6$. Asymptotically $nH_n = n\ln n + O(n)$: the $\Theta(n\log n)$ cost of "random probing until everything is hit" — the same bound that appears in hashing and randomized load-balancing analyses.

## Pitfalls
- Multiply $n$ by $H[n]$ **mod p**: $n \cdot H[n]$ is up to $10^6 \cdot 10^9 = 10^{15}$ — fine in 64-bit, but reduce before printing.

- $H_n$ is a fraction: never use floating point. Work modulo $p = 10^9+7$ with modular inverses.
- Computing each inverse by Fermat is $O(\log p)$; with $10^6$ of them that is still fine, but the linear recurrence $\mathrm{inv}[i] = -\lfloor p/i \rfloor \cdot \mathrm{inv}[p \bmod i]$ is simpler and faster. Keep it non-negative: use $p - \lfloor p/i \rfloor \cdot \mathrm{inv}[p \bmod i] \bmod p$.
- Products of two residues are up to $\approx 10^{18}$: 64-bit in C/Java, BigInt or split multiplication in JS (Numbers are exact only to $2^{53}$).
- Precompute once, answer each query by lookup — recomputing per query is $O(Tn)$.
