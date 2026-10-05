## Intuition
The smallest $k$ with $c^k \ge n$ is $\lceil \log_c n\rceil$ — the number of times you must multiply by $c$ to climb from 1 to $n$. Since $c \ge 2$, that is at most $\lceil\log_2 10^{18}\rceil = 60$ multiplications, so we can just climb. The only danger is the last multiplication overflowing.

## Approach
$k = 0$, $p = 1$. While $p < n$:
- if $p > \lfloor (n-1)/c\rfloor$, then $p\cdot c \ge n$: do $k \mathrel{+}= 1$ and stop **without** multiplying;
- otherwise $p \leftarrow p\cdot c$, $k \mathrel{+}= 1$.

Example $n = 9, c = 2$: $p = 1, 2, 4, 8$ ($k=3$), $8 < 9$ and $8 > \lfloor 8/2\rfloor = 4$ → $k = $ **4** ($2^4 = 16 \ge 9$).

## Why it works
For integers, $p\cdot c \ge n \iff p\cdot c > n-1 \iff p > \lfloor (n-1)/c \rfloor$. So the guard decides whether the next power reaches $n$ using only a division. When it does not, $p\cdot c \le n-1 < 10^{18}$, so the product is safe. Each loop iteration is exactly one more power of $c$, so the final $k$ is the first exponent with $c^k \ge n$. For $n = 1$ the loop never runs and $k = 0$.

## Complexity
$O(\log_c n) \le 60$ iterations per query.

## Pitfalls
- Overflow: $n = 10^{18}, c = 999999999$: $c^2 \approx 10^{18} < n$, and $c^3 \approx 10^{27}$ wraps around in 64-bit and may look smaller than $n$ — an infinite or wrong loop. The guard prevents ever computing it.
- Floating `ceil(log(n)/log(c))` fails at exact powers ($10^{18}$, $2^{60}$) where rounding nudges the quotient above an integer.
- $n = 1$ → $0$, not $1$.
- JavaScript: `BigInt` for $n$ and $p$.
