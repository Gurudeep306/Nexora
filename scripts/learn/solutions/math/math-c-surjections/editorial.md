## Intuition
Without the "every worker busy" rule there are $k^n$ assignments. The bad ones leave some worker idle, and "assignments avoiding a given set of j workers" are easy to count: $(k - j)^n$. That is the setting for inclusion–exclusion over the set of idle workers.

## Approach
$$\text{onto}(n, k) = \sum_{i=0}^{k} (-1)^i \binom{k}{i} (k - i)^n \pmod{10^9 + 7}.$$
1. Precompute factorials and inverse factorials up to k, so each $\binom{k}{i}$ costs O(1).
2. For each i, compute $(k - i)^n$ by fast exponentiation and add or subtract the term.

Example: $n = 4$, $k = 3$: $3^4 - 3 \cdot 2^4 + 3 \cdot 1^4 - 0 = 81 - 48 + 3 = 36$. If $k > n$ the sum is automatically 0, so there is no special case.

## Why it works
Let $A_j$ be the assignments in which worker j gets nothing. For any set S of $i$ workers, $\bigcap_{j \in S} A_j$ are the assignments that use only the other $k - i$ workers, and there are $(k-i)^n$ of them. There are $\binom{k}{i}$ such sets. Inclusion–exclusion gives
$$|\overline{A_1 \cup \dots \cup A_k}| = \sum_{i} (-1)^i \binom{k}{i} (k-i)^n.$$
Equivalently, the answer is $k! \cdot S(n, k)$, where $S$ is the Stirling number of the second kind.

## Complexity
$O(k \log n)$ time for $k$ fast powers with exponent up to $10^9$, about $6 \cdot 10^6$ modular multiplications. $O(k)$ memory.

## Pitfalls
- Reduce subtractions with `(x - y + MOD) % MOD`.
- The term $0^n$ is 0 here because $n \ge 1$. Don't let a power routine return 1 for it, unless the exponent is 0.
- Products of two residues need 64 bits, or a split multiplication in JavaScript.
- A dynamic program over the n tasks, $O(nk)$, is far too slow for $n = 10^9$.
