## Intuition
One increment of a binary counter can be expensive: going from $0111\ldots1$ to $1000\ldots0$ flips every bit. Bounding each of the n increments by its worst case gives $O(n\log n)$, but that is far from the truth. Look at the bits instead of the increments: bit 0 flips on **every** increment, bit 1 on every second, bit k on every $2^k$-th. This is the aggregate method of amortized analysis.

## Approach
Bit k changes value exactly $\lfloor n/2^k \rfloor$ times during the increments $0 \to n$ (it flips each time the counter crosses a multiple of $2^k$). So the total is
$$\sum_{k \ge 0} \left\lfloor \frac{n}{2^k} \right\rfloor = 2n - \operatorname{popcount}(n).$$
Compute it in $O(1)$ with a popcount instruction.

Example n = 7 (binary 111): $7 + 3 + 1 = 11 = 14 - 3$. Check by hand: increments flip 1, 2, 1, 3, 1, 2, 1 bits — sum 11.

## Why it works
Write $n = \sum_{i} b_i 2^i$. Then $\lfloor n/2^k \rfloor = \sum_{i \ge k} b_i 2^{i-k}$, and summing over k gives $\sum_i b_i (2^{i+1} - 1) = 2n - \sum_i b_i$. As a by-product, the total is $< 2n$: the **amortized** cost of one increment is at most 2, even though a single one can cost about 60.

## Complexity
$O(1)$ per query (or $O(\log n)$ with a bit loop), $O(T)$ overall — no simulation of the n increments, which would be hopeless for $n = 10^{18}$.

## Pitfalls
- $2n$ reaches $2\cdot10^{18}$: fits in signed 64-bit (limit $\approx 9.2\cdot10^{18}$), but not in 32-bit.
- In JavaScript, $10^{18}$ is not exactly representable as a Number — use BigInt.
- n = 0 gives 0, not $-0$ or 1: the formula handles it.
