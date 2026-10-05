## Intuition
$T(n) = a\,T(\lfloor n/b \rfloor) + n$ looks like a divide-and-conquer recurrence with a branches, but as a **computation** there is just one argument per level: $T(n)$ needs only $T(\lfloor n/b \rfloor)$, which needs only $T(\lfloor n/b^2 \rfloor)$, and so on. The factor a multiplies a single value; it does not create a tree of distinct subproblems. The chain has length $\lfloor \log_b n \rfloor + 1$, at most 60.

## Approach
Collect the chain $n, \lfloor n/b \rfloor, \lfloor n/b^2 \rfloor, \dots$ until it hits 0 (use $\lfloor\lfloor n/b^i\rfloor/b\rfloor = \lfloor n/b^{i+1}\rfloor$). Then fold from the bottom: start with $t = T(0) = 0$ and for each chain value m from smallest to largest set $t \leftarrow (a\,t + m) \bmod p$.

Example a = 2, b = 2, n = 8: chain 8, 4, 2, 1. $T(1) = 1$, $T(2) = 2 + 2 = 4$, $T(4) = 8 + 4 = 12$, $T(8) = 24 + 8 = $ **32**.

## Why it works
Each step applies the definition $T(m) = a\,T(\lfloor m/b \rfloor) + m$ to the next chain element, whose $\lfloor m/b \rfloor$ is exactly the previous element. Reducing mod p at each step is valid since only $+$ and $\times$ are used. Unrolled, $T(n) = \sum_i a^i \lfloor n/b^i \rfloor$ — the level sums of the recursion tree, which is exactly how the Master theorem compares $a$ with $b$.

## Complexity
$O(\log_b n)$ per query, $O(T \log n)$ total. The recursion **tree** has $a^{\log_b n}$ nodes, but we never enumerate it — we evaluate one representative per level.

## Pitfalls
- Overflow: reduce $m$ and $a$ mod p before multiplying; $a \cdot t < 10^9 \cdot 10^9$ fits in 64-bit. In JS use BigInt (n up to $10^{18}$).
- n = 0 gives 0 (empty chain).
- Recursion is shallow here, but the iterative fold avoids any doubt.
