## Intuition
Computing each $\sigma(i)$ separately, even with a sieve, is at least $O(n)$, and $n = 10^{11}$ is too large for that. **Swap the order of summation**: instead of "for each number, sum its divisors", ask "for each d, how many numbers $\le n$ does d divide?" The answer is $\lfloor n/d \rfloor$, so
$$\sum_{i=1}^{n} \sigma(i) = \sum_{i=1}^{n} \sum_{d \mid i} d = \sum_{d=1}^{n} d \left\lfloor \tfrac{n}{d} \right\rfloor.$$
That is still n terms, but $\lfloor n/d \rfloor$ takes only $O(\sqrt n)$ distinct values.

## Approach
Start at $d = 1$. Let $q = \lfloor n/d \rfloor$ and $e = \lfloor n/q \rfloor$, the last d with the same quotient. Add
$$q \cdot \frac{(d + e)(e - d + 1)}{2}$$
modulo p, then continue from $d = e + 1$.

Example: $n = 6$. The blocks are $d = 1$ ($q = 6$), $d = 2$ ($q = 3$), $d = 3$ ($q = 2$), and $d = 4..6$ ($q = 1$, with sum $4 + 5 + 6 = 15$). The total is $6 + 6 + 6 + 15 = 33$, which equals $1 + 3 + 4 + 7 + 6 + 12$.

## Why it works
The double sum counts each pair $(d, i)$ with $d \mid i$, $i \le n$, with weight d. Grouping by d gives d times the number of multiples of d. For the blocks: $\lfloor n/x \rfloor = q$ holds exactly for $\lfloor n/(q+1) \rfloor < x \le \lfloor n/q \rfloor$, so $e = \lfloor n/q \rfloor$ ends the block. If $d \le \sqrt n$ there are at most $\sqrt n$ starting points, and if $d > \sqrt n$ then $q < \sqrt n$, so there are at most $2\sqrt n$ blocks in total.

## Complexity
$O(\sqrt n)$, about $6.3 \cdot 10^5$ blocks for $n = 10^{11}$, with O(1) memory.

## Pitfalls
- $(d + e)(e - d + 1)$ reaches about $10^{22}$, which overflows 64 bits. Divide the **even** factor by 2 first, reduce both factors modulo p, then multiply.
- The quotient $q$ can be about $10^{11}$, so reduce it before multiplying too.
- In JavaScript, every product of two residues needs a safe modular multiply.
